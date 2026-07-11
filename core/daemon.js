// core/daemon.js — Vault daemon: "yapay zekanın not alan yapay zekası"
// worker_threads same-file pattern: isMainThread ile bifurcate
"use strict";

const { isMainThread, Worker, workerData, parentPort } = require("worker_threads");
const EventEmitter = require("events");
const path = require("path");
const fs   = require("fs");
const os   = require("os");
const http = require("http");

// ─── ANA THREAD API ──────────────────────────────────────────────────────────
if (isMainThread) {
  let _worker = null;
  let _status = { running: false, processed: 0, lastActivity: null };

  const emitter = new EventEmitter();

  function startDaemon(opts = {}) {
    if (_worker) return emitter;
    const sessionsDir = opts.sessionsDir ?? require("./persist.js").SESSIONS_DIR;
    const vaultDir    = opts.vaultDir    ?? require("./vault.js").getVaultDir();

    try {
      _worker = new Worker(__filename, {
        workerData: { sessionsDir, vaultDir },
      });
      _status.running = true;

      _worker.on("message", msg => {
        if (msg.type === "vault_updated") {
          _status.processed++;
          _status.lastActivity = Date.now();
          emitter.emit("vault_updated", msg);
        } else if (msg.type === "vault_skipped") {
          _status.lastActivity = Date.now();
          emitter.emit("vault_skipped", msg);
        } else if (msg.type === "digest_ready") {
          _status.lastActivity = Date.now();
          emitter.emit("digest_ready", msg);
        } else if (msg.type === "weakness_mined") {
          _status.lastActivity = Date.now();
          emitter.emit("weakness_mined", msg);
        } else if (msg.type === "error") {
          emitter.emit("daemon_error", { error: msg.error });
        }
      });

      _worker.on("error", err => {
        _status.running = false;
        emitter.emit("daemon_error", { error: err.message });
      });

      _worker.on("exit", () => {
        _status.running = false;
        _worker = null;
      });
    } catch (err) {
      emitter.emit("daemon_error", { error: err.message });
    }

    return emitter;
  }

  function stopDaemon() {
    if (_worker) { _worker.terminate(); _worker = null; }
    _status.running = false;
  }

  function getStatus() { return { ..._status }; }

  module.exports = { startDaemon, stopDaemon, getStatus };

// ─── WORKER THREAD ───────────────────────────────────────────────────────────
} else {
  const { sessionsDir, vaultDir } = workerData;

  // Debounce map: filename → timer
  const debounceMap = new Map();
  let lastWatchEvent       = 0;
  let lastSessionProcessed = 0; // Lovelace idle algılama için

  function processSession(file) {
    const fullPath = path.join(sessionsDir, file);
    if (!file.endsWith(".json")) return;
    if (!fs.existsSync(fullPath)) return;

    let sessionData;
    try { sessionData = JSON.parse(fs.readFileSync(fullPath, "utf8")); }
    catch { return; }

    const sessionId = file.replace(".json", "");

    // Zaten vault'ta işlenmiş mi?
    const indexPath = path.join(vaultDir, "index.json");
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      if (index.some(e => e.id === sessionId)) return; // atla
    } catch {}

    // Extraction: Ollama 7B
    extractKnowledge(sessionId, sessionData)
      .then(async knowledge => {
        if (!knowledge) return;

        // Shannon novelty filtresi: çok benzer içerik tekrar vault'a yazılmasın
        const noveltyResult = await checkNovelty(knowledge, vaultDir);
        if (noveltyResult.skip) {
          parentPort.postMessage({
            type:      "vault_skipped",
            sessionId,
            reason:    "low_novelty",
            maxSim:    noveltyResult.maxSim,
            closestId: noveltyResult.closestId,
          });
          return;
        }

        // vault.js'i worker içinden require et
        const vault = require("./vault.js");
        try {
          const result = await vault.writeSession(sessionId, sessionData, knowledge);
          lastSessionProcessed = Date.now();
          parentPort.postMessage({
            type:      "vault_updated",
            sessionId,
            file:      result.file,
            date:      new Date().toISOString().slice(0, 10),
            novelty:   noveltyResult.novelty,
          });
        } catch (err) {
          parentPort.postMessage({ type: "error", error: `vault write: ${err.message}` });
        }
      })
      .catch(err => {
        parentPort.postMessage({ type: "error", error: `extraction: ${err.message}` });
      });
  }

  function debounce(file) {
    if (debounceMap.has(file)) clearTimeout(debounceMap.get(file));
    const t = setTimeout(() => {
      debounceMap.delete(file);
      processSession(file);
    }, 500);
    debounceMap.set(file, t);
  }

  async function checkOllamaIdle() {
    return new Promise(resolve => {
      const req = http.request(
        { hostname: "localhost", port: 11434, path: "/api/ps", method: "GET" },
        res => {
          let d = "";
          res.on("data", c => (d += c));
          res.on("end", () => {
            try {
              const models = JSON.parse(d).models ?? [];
              resolve(models.length === 0);
            } catch { resolve(true); }
          });
        }
      );
      req.on("error", () => resolve(false));
      req.setTimeout(1000, () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  async function extractKnowledge(sessionId, data) {
    // Ollama idle değilse bekle (max 3x10sn)
    for (let i = 0; i < 3; i++) {
      const idle = await checkOllamaIdle();
      if (idle) break;
      if (i === 2) return null;
      await new Promise(r => setTimeout(r, 10000));
    }

    // Ortak extract modülünü kullan — tool_use/result episodic köprü; thinking high modda
    const { extractWithOllama, flattenMessages } = require("./extract.js");
    const { getEffectiveMemoryEffort }           = require("./router.js");
    const includeThinking = getEffectiveMemoryEffort() === "high";
    const msgs = flattenMessages(data.messages, { includeTool: true, includeThinking });
    const conversationText = `Oturum ${sessionId}:\n${msgs}`;
    const result = await extractWithOllama(conversationText);

    // Fallback summary geliştir
    if (result.tags.includes("manuel")) {
      result.summary = `Oturum ${sessionId} — ${data.messages?.length ?? 0} mesaj`;
      result.tags = [data.backend ?? "unknown", data.model?.split(":")[0] ?? "unknown"];
    }
    return result;
  }

  // Shannon novelty kontrolü: mevcut vault vektörlerine karşı benzerlik
  // Eşik 0.82 — bu değerin üstündeyse "bilinen" içerik sayılır, vault'a yazılmaz
  const SHANNON_THRESHOLD = 0.82;

  async function checkNovelty(knowledge, dir) {
    try {
      const embed = require("./embed.js");
      if (!(await embed.isAvailable())) return { skip: false, novelty: 1.0, maxSim: 0 };

      const vPath = path.join(dir, "vectors.json");
      let vecs = [];
      try { vecs = JSON.parse(fs.readFileSync(vPath, "utf8")); } catch {}
      if (!vecs.length) return { skip: false, novelty: 1.0, maxSim: 0 };

      const queryText = [
        knowledge.summary ?? "",
        ...(knowledge.decisions ?? []).slice(0, 3),
        ...(knowledge.concepts ?? []).slice(0, 2),
      ].join(" ").slice(0, 800);

      const qvec = await embed.embedText(queryText);
      if (!qvec) return { skip: false, novelty: 1.0, maxSim: 0 };

      const { cosineSim } = embed;
      let maxSim = 0, closestId = null;
      for (const entry of vecs) {
        const sim = cosineSim(qvec, entry.vector);
        if (sim > maxSim) { maxSim = sim; closestId = entry.id; }
      }

      const novelty = 1 - maxSim;
      const skip    = maxSim > SHANNON_THRESHOLD;
      return { skip, novelty, maxSim: +maxSim.toFixed(4), closestId };
    } catch {
      return { skip: false, novelty: 1.0, maxSim: 0 };
    }
  }

  // Sessions dizinini izle
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

  try {
    fs.watch(sessionsDir, (event, filename) => {
      if (filename) {
        lastWatchEvent = Date.now();
        debounce(filename);
      }
    });
  } catch {}

  // 60sn fallback: fs.watch Windows'ta bazı durumlarda event kaçırabilir
  setInterval(() => {
    if (Date.now() - lastWatchEvent > 60000) {
      try {
        fs.readdirSync(sessionsDir)
          .filter(f => f.endsWith(".json"))
          .forEach(f => debounce(f));
      } catch {}
    }
  }, 60000);

  // ── Lovelace: haftalık idle-time vault özeti ──────────────────────────────
  let lovelaceRunning = false;

  async function generateDigest() {
    if (lovelaceRunning) return;
    lovelaceRunning = true;
    try {
      const vault = require("./vault.js");
      if (!vault.shouldRunDigest()) return;

      // Ollama idle değilse iptal
      const idle = await checkOllamaIdle();
      if (!idle) return;

      // Hebbian decay: haftalık aktivasyon azaltma (digest'ten bağımsız çalışır)
      try { vault.decayActivations(); } catch {}

      // Son 20 vault kaydını oku
      const entries = vault.recentEntries(20);
      if (entries.length < 3) return; // yeterli veri yok

      const { ollamaRequest } = require("./extract.js");
      const { loadConfig } = require("./router.js");
      const model = loadConfig().tier1Model;

      const sessionLines = entries.map(e =>
        `[${e.date}] ${e.summary ?? ""}` +
        (e.decisions?.length ? `\n  Kararlar: ${e.decisions.slice(0, 2).join("; ")}` : "") +
        (e.tags?.length ? `\n  Etiketler: ${e.tags.join(", ")}` : "")
      ).join("\n\n");

      const prompt = `Sen bir bilgi analisti. Aşağıdaki AI oturum özetlerini incele ve kısa bir haftalık rapor yaz.

Tespit et:
1. Yarım kalan işler
2. Çelişen kararlar
3. Tekrarlayan hatalar veya sorunlar
4. Bu dönemde en yoğun çalışılan konular

Format: Markdown, Türkçe veya içeriğin dilinde. Kısa ve somut listeler. Boş onay yok.

Oturumlar:
${sessionLines}`;

      const response = await ollamaRequest(model, prompt, { timeout: 60000 });
      if (!response || response.length < 50) return;

      const date = new Date().toISOString().slice(0, 10);
      const header = `# Lovelace Haftalık Rapor — ${date}\n\n> Rapor-only: otonom eylem içermez.\n\n`;
      const file = vault.writeDigest(header + response);
      parentPort.postMessage({ type: "digest_ready", file, date });
    } catch {}
    finally { lovelaceRunning = false; }
  }

  // ── Weakness Mining: idle zamanında telemetry loglarından başarısız araç analizi ──
  let miningRunning = false;

  async function mineWeaknesses() {
    if (miningRunning) return;
    miningRunning = true;
    try {
      const { listLogs, readLog } = require("./telemetry.js");
      const since = Date.now() - 7 * 86_400_000;

      // Başarısız tool çağrılarını grupla: tool+error → {count, sessions}
      const groups = {};
      for (const { sessionId, mtime } of listLogs(200)) {
        if (mtime < since) continue;
        for (const e of readLog(sessionId)) {
          if (e.event !== "tool_call" || e.ok !== false) continue;
          const errKey = `${e.tool}|${(e.error ?? "error").slice(0, 50)}`;
          if (!groups[errKey]) {
            groups[errKey] = { tool: e.tool, error: e.error ?? "error", count: 0, sessions: new Set() };
          }
          groups[errKey].count++;
          groups[errKey].sessions.add(sessionId);
        }
      }

      // 2+ kez görülen hataları al, sıklaştır
      const candidates = Object.values(groups)
        .filter(g => g.count >= 2)
        .sort((a, b) => b.count - a.count);

      if (candidates.length === 0) {
        parentPort.postMessage({ type: "weakness_mined", file: null, groups: 0 });
        return;
      }

      // Ollama idle değilse bekle
      const idle = await checkOllamaIdle();
      if (!idle) return;

      const { ollamaRequest } = require("./extract.js");
      const { loadConfig } = require("./router.js");
      const _mineModel = loadConfig().tier1Model;

      const toolSection = candidates.map(g =>
        `### ${g.tool}\n- Hata: "${g.error}"\n- Oluşma: ${g.count}x (${g.sessions.size} oturumda)`
      ).join("\n\n");

      const prompt = `Sen bir AI araç sisteminin kalite analistisin. Aşağıda AI modelinin tekrar tekrar başarısız olduğu araçlar listeleniyor.

Her araç için:
1. Neden modelin bu araçla hata yaptığını analiz et (tanım belirsizliği mi, yanlış parametre formatı mı?)
2. Araç tanımı/açıklaması için somut, uygulanabilir bir düzeltme öner

Kısa ve teknik ol. Her araç için 2-4 cümle yeterli.

BAŞARISIZ ARAÇLAR:
${toolSection}

FORMAT: Her araç için:
## <araç_adı>
**Sorun:** [1 cümle]
**Öneri:** [somut düzeltme]`;

      const response = await ollamaRequest(_mineModel, prompt, { timeout: 60000 });
      if (!response || response.length < 30) {
        parentPort.postMessage({
          type: "error",
          error: `weakness mining: model "${_mineModel}" boş/çok kısa yanıt döndürdü (${response?.length ?? 0} karakter) — rapor yazılmadı`,
        });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const reportsDir = path.join(os.homedir(), ".orion", "reports");
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

      const file = path.join(reportsDir, `weakness-${date}.md`);
      const content = [
        `# Orion Zayıflık Raporu — ${date}`,
        ``,
        `> Rapor-only: otonom eylem içermez. /weakness apply ile onaylı uygulama.`,
        ``,
        `## Özet`,
        `${candidates.length} zayıflık grubu bulundu (son 7 gün).`,
        ``,
        `## Başarısız Araçlar`,
        toolSection,
        ``,
        `## Analiz`,
        response,
      ].join("\n");

      fs.writeFileSync(file, content, "utf8");
      parentPort.postMessage({ type: "weakness_mined", file, groups: candidates.length, date });
    } catch (err) {
      parentPort.postMessage({ type: "error", error: `weakness mining: ${err.message}` });
    } finally {
      miningRunning = false;
    }
  }

  // Her 30 dakikada bir: idle mi? digest tamamlandıktan SONRA mining — aynı anda Ollama'yı doldurmasın
  setInterval(() => {
    const idleMs = Date.now() - Math.max(lastWatchEvent, lastSessionProcessed);
    if (idleMs > 60 * 60 * 1000) {
      generateDigest().finally(() => mineWeaknesses());
    }
  }, 30 * 60 * 1000);
}
