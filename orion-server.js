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
//   POST /chat              → { text, sessionId?, backend?, model? } → { sessionId, text }
//
// Güvenlik: sadece 127.0.0.1'e bağlanır; run_command sunucu modunda kapalıdır
// (onay istemi olmadan komut çalıştırılamaz).
"use strict";

// run_command sunucuda devre dışı — tools/shell.js bu bayrağı kontrol eder
if (!process.argv.includes("--headless")) process.argv.push("--headless");

require("./core/credentials.js").load();

const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");
const backends = require("./backends/index.js");
const persist  = require("./core/persist.js");
const { Session } = require("./core/session.js");

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
