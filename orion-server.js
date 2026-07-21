#!/usr/bin/env node
// orion-server.js — Orion sunucusu (client/server ayrımı, v4 madde 1)
// TUI, web veya IDE aynı Orion çekirdeğine HTTP üzerinden bağlanır.
//
//   node orion-server.js [--port 4517]
//
// API (hepsi Authorization: Bearer <token> ister — token ~/.orion/server-token):
//   GET  /health            → { ok: true }
//   GET  /status            → sunucu + aktif oturum özetleri
//   GET  /sessions          → kayıtlı oturum listesi
//   GET  /backends          → kullanılabilir backend + model listesi (Electron model seçici için)
//   POST /chat              → { text, sessionId?, backend?, model? } → { sessionId, text }
//   POST /message           → { to: <id>|"all", text, from? } — swarm: oturuma mesaj bırak
//   GET  /events            → SSE canlı olay akışı (?sessionId= filtre)
//
// Swarm-lite: iki oturum 10 dk içinde aynı dosyaya yazarsa ikisine de
// çakışma uyarısı düşer (diff olayından tespit).
//
// Güvenlik: sadece 127.0.0.1'e bağlanır; run_command sunucu modunda kapalıdır
// (onay istemi olmadan komut çalıştırılamaz).
"use strict";

// run_command sunucuda devre dışı — tools/shell.js bu bayrağı kontrol eder
if (!process.argv.includes("--headless")) process.argv.push("--headless");

require("./core/credentials.js").load();
require("./core/accounts.js").applyActive(); // aktif hesap profili credentials üzerine biner

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");
const backends = require("./backends/index.js");
const persist  = require("./core/persist.js");
const { Session } = require("./core/session.ts");
const { emitter: orionEvents, toNDJSON } = require("./core/events.ts");

const PORT = (() => {
  const i = process.argv.indexOf("--port");
  if (i !== -1) return parseInt(process.argv[i + 1], 10) || 4517;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".orion", "config.json"), "utf8"));
    return cfg.serverPort ?? 4517;
  } catch { return 4517; }
})();

// ── Token: ilk çalıştırmada üretilir, dosyadan okunur ───────────────────────
const TOKEN_FILE = path.join(os.homedir(), ".orion", "server-token");
function loadToken() {
  try {
    const t = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (t) return t;
  } catch {}
  const t = crypto.randomBytes(24).toString("hex");
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 });
  return t;
}
const TOKEN = loadToken();

function authorized(req) {
  const h = req.headers.authorization ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const given = Buffer.from(m[1]);
  const want  = Buffer.from(TOKEN);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

// ── Oturum havuzu — istek başına değil, sessionId başına bir Session ────────
const SESSIONS = new Map(); // id → { session, busy: Promise }
const startedAt = Date.now();

// ── Komut çalıştırma mutex — stdout yakalama çakışmasını önler ───────────────
// Birden fazla istemci eş zamanlı /command gönderirse stdout yakalama
// birbirini bozar; bu mutex tüm komut çalıştırmalarını sıraya koyar.
let _cmdLock = Promise.resolve();
async function withCmdLock(fn) {
  const prev = _cmdLock;
  let release;
  _cmdLock = new Promise(r => { release = r; });
  await prev;
  try { return await fn(); } finally { release(); }
}

// ── Swarm-lite: dosya çakışma tespiti ────────────────────────────────────────
// Bir oturum dosya yazınca kaydedilir; başka bir oturum 10 dk içinde aynı
// dosyaya yazarsa İKİ oturumun da gelen kutusuna çakışma notu düşer.
const RECENT_WRITES = new Map(); // path → { sessionId, ts }
const CONFLICT_WINDOW_MS = 10 * 60 * 1000;

function _inbox(sessionId, from, text) {
  const entry = SESSIONS.get(sessionId);
  if (entry?.session?.inbox) entry.session.inbox.push({ from, text, ts: Date.now() });
}

orionEvents.on("diff", ev => {
  const p = ev.payload?.path;
  if (!p || !ev.sessionId) return;
  const prev = RECENT_WRITES.get(p);
  RECENT_WRITES.set(p, { sessionId: ev.sessionId, ts: Date.now() });
  if (RECENT_WRITES.size > 500) RECENT_WRITES.delete(RECENT_WRITES.keys().next().value);
  if (prev && prev.sessionId !== ev.sessionId && Date.now() - prev.ts < CONFLICT_WINDOW_MS) {
    const note = `ÇAKIŞMA UYARISI: ${p} dosyasına hem ${prev.sessionId} hem ${ev.sessionId} oturumu son 10 dk içinde yazdı. Üzerine yazmadan önce dosyanın güncel halini oku.`;
    _inbox(prev.sessionId, "swarm", note);
    _inbox(ev.sessionId,  "swarm", note);
  }
});

async function getSession(sessionId, backend, model) {
  if (sessionId && SESSIONS.has(sessionId)) return SESSIONS.get(sessionId);

  let b = backend, m = model;
  if (!b) {
    const found = await backends.detectFirst();
    if (!found) throw new Error("Kullanılabilir backend yok");
    b = found.name;
    m = m ?? found.defaultModel ?? found.models?.[0];
  }
  const session = new Session({ backend: b, model: m });
  if (sessionId) {
    const data = persist.load(sessionId);
    if (data) session.loadFrom(data, sessionId);
  }
  const entry = { session, busy: Promise.resolve() };
  SESSIONS.set(session.id, entry);
  return entry;
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > maxBytes) { reject(new Error("gövde çok büyük")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });

  if (!authorized(req)) return json(res, 401, { error: "yetkisiz — Authorization: Bearer <token> gerekli" });

  try {
    if (req.method === "GET" && url.pathname === "/status") {
      return json(res, 200, {
        ok: true,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
        activeSessions: [...SESSIONS.values()].map(e => e.session.statusInfo()),
      });
    }

    if (req.method === "GET" && url.pathname === "/sessions") {
      return json(res, 200, persist.list());
    }

    // ── GET /backends — kullanılabilir backend + model listesi ─────────────
    // Electron/masaüstü istemcinin model seçici dropdown'u için — orion.js'in
    // startup'ta backends.detect() ile yaptığı taramanın HTTP karşılığı.
    if (req.method === "GET" && url.pathname === "/backends") {
      const found = await backends.detect();
      return json(res, 200, { backends: found });
    }

    // ── GET /events — SSE canlı olay akışı ─────────────────────────────────
    // Kullanım: GET /events?sessionId=<id>   (sessionId opsiyonel: yoksa tüm olaylar gelir)
    // SSE format: "data: <JSON>\n\n" — her olay bir NDJSON satırı
    if (req.method === "GET" && url.pathname === "/events") {
      const filterSid = url.searchParams.get("sessionId") || null;

      res.writeHead(200, {
        "Content-Type":  "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",
      });
      // İlk heartbeat — bağlantı kuruldu
      res.write(": connected\n\n");

      function onEvent(event) {
        if (filterSid && event.sessionId !== filterSid) return;
        try { res.write(`data: ${JSON.stringify(event)}\n\n`); } catch {}
      }

      // 30 saniyede bir keep-alive comment (proxy timeout koruması)
      const keepAlive = setInterval(() => {
        try { res.write(": keep-alive\n\n"); } catch { clearInterval(keepAlive); }
      }, 30_000);

      orionEvents.on("event", onEvent);
      req.on("close", () => {
        orionEvents.off("event", onEvent);
        clearInterval(keepAlive);
      });

      return; // yanıt açık kalır — res.end() çağrılmaz
    }

    // ── POST /message — swarm: oturumlar arası mesaj (DM ya da broadcast) ──
    // { to: "<sessionId>"|"all", text, from? } — hedefin bir SONRAKİ turunda
    // system bağlamına "Diğer Oturumlardan Mesajlar" olarak girer.
    if (req.method === "POST" && url.pathname === "/message") {
      const body = JSON.parse(await readBody(req) || "{}");
      if (!body.text || typeof body.text !== "string")
        return json(res, 400, { error: "'text' alanı gerekli" });
      const from = String(body.from ?? "operator").slice(0, 40);

      if (body.to === "all") {
        let n = 0;
        for (const [id] of SESSIONS) { _inbox(id, from, body.text); n++; }
        return json(res, 200, { ok: true, delivered: n });
      }
      if (!body.to || !SESSIONS.has(body.to))
        return json(res, 404, { error: `oturum bulunamadı: ${body.to ?? "?"} — GET /status ile aktif oturumları gör` });
      _inbox(body.to, from, body.text);
      return json(res, 200, { ok: true, delivered: 1 });
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      const body = JSON.parse(await readBody(req) || "{}");
      if (!body.text || typeof body.text !== "string")
        return json(res, 400, { error: "'text' alanı gerekli" });

      const entry = await getSession(body.sessionId, body.backend, body.model);
      // Aynı oturuma eşzamanlı istekler sıraya girer
      const run = entry.busy.then(() => entry.session.send(body.text));
      entry.busy = run.catch(() => {});
      const text = await run;
      return json(res, 200, {
        sessionId: entry.session.id,
        text,
        status: entry.session.statusInfo(),
      });
    }

    // ── GET /commands — komut listesi (Electron komut paleti için) ──────────
    if (req.method === "GET" && url.pathname === "/commands") {
      const commands = require("./core/commands/index.js");
      const list = commands.all().map(cmd => ({
        name:    cmd.name,
        aliases: cmd.aliases ?? [],
        desc:    cmd.desc    ?? "",
        usage:   cmd.usage   ?? `/${cmd.name}`,
        group:   cmd.group   ?? "",
      }));
      return json(res, 200, { commands: list });
    }

    // ── POST /command — komut çalıştır, stdout yakala ────────────────────────
    // { name, args?, sessionId? } → { sessionId, output: string[], status }
    //
    // stdout + stderr yakalanır, ANSI kaçış kodları soyulur ve satır dizisi
    // döndürülür. Eş zamanlı istekler mutex ile sıraya alınır (yakalama
    // çakışmasını önler).
    if (req.method === "POST" && url.pathname === "/command") {
      const body = JSON.parse(await readBody(req) || "{}");
      const { name, args = [], sessionId } = body;
      if (!name || typeof name !== "string")
        return json(res, 400, { error: "'name' alanı gerekli" });

      const entry = await getSession(sessionId);

      const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*\x07)/g;

      const output = await withCmdLock(async () => {
        const lines = [];

        const capture = (chunk) => {
          const raw  = typeof chunk === "string" ? chunk : chunk.toString("utf8");
          // ANSI kodlarını ve iç stash işaretlerini (highlightCode) soy
          const text = raw.replace(ANSI_RE, "").replace(/\x00\d+\x00/g, "");
          for (const part of text.split("\n")) {
            const t = part.replace(/\r/g, "").trimEnd();
            if (t.trim()) lines.push(t);
          }
          return true; // "başarıyla yazıldı" sinyali
        };

        const origOut = process.stdout.write.bind(process.stdout);
        const origErr = process.stderr.write.bind(process.stderr);
        process.stdout.write = capture;
        process.stderr.write = capture;

        // Readline arayüzü gerektiren komutlar (fuzzyPicker, soru soran)
        // için sessiz mock — TUI bileşeni Electron'da çalışmaz.
        const mockRl = {
          question: (_, cb)   => cb(""),
          pause:    ()        => {},
          resume:   ()        => {},
          write:    ()        => {},
          close:    ()        => {},
        };

        try {
          const commands = require("./core/commands/index.js");
          await commands.dispatch(name, Array.isArray(args) ? args : String(args).split(/\s+/), {
            session: entry.session,
            rl:      mockRl,
          });
        } catch (e) {
          lines.push(`✗ ${e.message}`);
        } finally {
          process.stdout.write = origOut;
          process.stderr.write = origErr;
        }

        return lines;
      });

      return json(res, 200, {
        sessionId: entry.session.id,
        output,
        status: entry.session.statusInfo(),
      });
    }

    // ── GET /sessions/:id — oturum detayı (mesajlar dahil) ──────────────────
    {
      const m = url.pathname.match(/^\/sessions\/([a-f0-9]{1,16})$/);
      if (req.method === "GET" && m) {
        const id   = m[1];
        const data = persist.load(id);
        if (!data) return json(res, 404, { error: `oturum bulunamadı: ${id}` });

        const messages = (data.messages ?? [])
          .filter(msg => msg.role !== "system")
          .map(msg => {
            const text = typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.filter(b => b.type === "text").map(b => b.text).join("")
                : "";
            return { role: msg.role, text };
          })
          .filter(msg => msg.text.trim());

        return json(res, 200, {
          id:        data.id ?? id,
          backend:   data.backend,
          model:     data.model,
          mode:      data.mode,
          updatedAt: data.updatedAt,
          msgCount:  data.messages?.length ?? 0,
          messages,
        });
      }
    }

    // ── GET /tasks — görev yöneticisi web arayüzü ────────────────────────────
    // SSE olaylarını filtreler: queue:* ve scheduler:* — gerçek zamanlı görünüm.
    // Sayfa EventSource('/events') ile bağlanır (auth token URL'de taşınır).
    if (req.method === "GET" && url.pathname === "/tasks") {
      const scheduler = (() => { try { return require("./core/scheduler.js"); } catch { return null; } })();
      const queue     = (() => { try { return require("./core/queue.js");     } catch { return null; } })();
      const vram      = scheduler?.vramStatus() ?? { currentlyLoaded: "none", vram_used_gb: 0, mean_cycle_ms: null };
      const qStatus   = queue?.status()         ?? { queue_length: 0, processing: false, pending_jobs: [], recent: [] };

      const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orion — Görev Yöneticisi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:16px;font-size:13px}
h2{color:#58a6ff;margin-bottom:12px;font-size:15px}
#rampa{background:#161b22;border:1px solid #30363d;padding:8px 12px;border-radius:6px;margin-bottom:12px}
.label{color:#8b949e;font-size:11px;margin-bottom:4px}
.val{color:#e3b341;font-weight:bold}
#jobs{margin-bottom:12px}
.job{border:1px solid #30363d;padding:6px 10px;margin:4px 0;border-radius:4px;display:flex;gap:12px;align-items:center}
.job.running{border-color:#58a6ff;background:#111820}
.job.done{border-color:#238636;background:#0d1117}
.job.error{border-color:#da3633}
.job.queued{opacity:.6}
.icon{font-size:14px}
.id{color:#8b949e;font-size:11px}
.type{color:#79c0ff}
.time{color:#8b949e;margin-left:auto}
#metrics{color:#8b949e;font-size:11px;margin-top:8px}
#log{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;max-height:200px;overflow-y:auto;font-size:11px;color:#8b949e;margin-top:12px}
.log-entry{padding:2px 0;border-bottom:1px solid #21262d}
.log-entry:last-child{border-bottom:none}
</style>
</head>
<body>
<h2>⚙ Orion — Görev Yöneticisi</h2>
<div id="rampa">
  <div class="label">RAMPA DURUMU</div>
  <div><span class="val" id="loaded">${vram.currentlyLoaded}</span>
  — <span id="vram_gb">${vram.vram_used_gb}</span>GB / 8GB
  <span id="cycle"> ${vram.mean_cycle_ms != null ? "| ort. döngü: " + vram.mean_cycle_ms + "ms" : ""}</span>
  | sırada: <span id="q_len">${qStatus.queue_length}</span></div>
</div>
<div class="label">AKTİF / SIRA</div>
<div id="jobs">${qStatus.processing ? '<div class="job running"><span class="icon">▶</span><span class="type">işleniyor...</span></div>' : '<div style="color:#8b949e;padding:6px">boş</div>'}</div>
<div class="label">SON İŞLER</div>
<div id="recent">${qStatus.recent.slice(0,5).map(j => \`<div class="job done"><span class="icon">✓</span><span class="type">\${j.type}\${j.skill ? ":" + j.skill : ""}</span><span class="time">\${j.wall_ms ?? "?"}ms</span></div>\`).join("") || '<div style="color:#8b949e;padding:6px">henüz yok</div>'}</div>
<div id="metrics">döngü sayısı: ${vram.cycle_count ?? 0}</div>
<div class="label" style="margin-top:12px">CANLI OLAYLAR</div>
<div id="log"></div>
<script>
const TASK_EVENTS = new Set(["queue:added","queue:status","queue:job_error","scheduler:job_start","scheduler:job_done","scheduler:tick","scheduler:tack","scheduler:started","meissa:done"]);
const src = new EventSource("/events");
const log = document.getElementById("log");
function addLog(text) {
  const d = document.createElement("div");
  d.className = "log-entry";
  d.textContent = new Date().toISOString().slice(11,19) + " " + text;
  log.prepend(d);
  if (log.children.length > 60) log.removeChild(log.lastChild);
}
src.addEventListener("message", e => {
  try {
    const ev = JSON.parse(e.data);
    if (!TASK_EVENTS.has(ev.type)) return;
    const p = ev.payload ?? {};
    addLog(ev.type + " " + JSON.stringify(p).slice(0,120));
    if (ev.type === "queue:status") {
      document.getElementById("q_len").textContent = p.queue_length ?? "?";
    }
    if (ev.type === "scheduler:tick") {
      document.getElementById("loaded").textContent = p.loading ?? "?";
    }
    if (ev.type === "scheduler:job_start") {
      document.getElementById("jobs").innerHTML = \`<div class="job running"><span class="icon">▶</span><span class="id">\${(p.job_id||"").slice(-6)}</span><span class="type">\${p.type}\${p.skill ? ":" + p.skill : ""}</span></div>\`;
    }
    if (ev.type === "scheduler:job_done") {
      const ok = p.success;
      document.getElementById("jobs").innerHTML = '<div style="color:#8b949e;padding:6px">boş</div>';
      const r = document.getElementById("recent");
      const d = document.createElement("div");
      d.className = "job " + (ok ? "done" : "error");
      d.innerHTML = \`<span class="icon">\${ok ? "✓" : "✗"}</span><span class="type">\${p.type}\${p.skill ? ":" + p.skill : ""}</span><span class="time">\${p.wall_ms ?? "?"}ms</span>\`;
      r.prepend(d);
    }
    if (ev.type === "meissa:done") {
      document.getElementById("metrics").textContent = "meissa: " + (p.rota ?? "?") + " karmasiklik:" + (p.karmasiklik ?? "?") + " | döngü: " + (p.wall_ms ?? "?") + "ms";
    }
  } catch {}
});
src.onerror = () => addLog("SSE bağlantısı kesildi");
</script>
</body>
</html>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    // ── GET /config — ~/.orion/config.json ──────────────────────────────────
    if (req.method === "GET" && url.pathname === "/config") {
      try {
        const cfgPath = path.join(os.homedir(), ".orion", "config.json");
        const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
        return json(res, 200, { config: cfg });
      } catch {
        return json(res, 200, { config: {} });
      }
    }

    return json(res, 404, { error: "bilinmeyen uç: " + url.pathname });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`orion-server: http://127.0.0.1:${PORT}`);
  console.log(`token dosyası: ${TOKEN_FILE}`);
  console.log(`örnek: curl -H "Authorization: Bearer $(cat ~/.orion/server-token)" http://127.0.0.1:${PORT}/status`);
});
