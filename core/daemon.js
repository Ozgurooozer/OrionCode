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
  let lastWatchEvent = 0;

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

        // vault.js'i worker içinden require et
        const vault = require("./vault.js");
        try {
          const result = await vault.writeSession(sessionId, sessionData, knowledge);
          parentPort.postMessage({
            type:      "vault_updated",
            sessionId,
            file:      result.file,
            date:      new Date().toISOString().slice(0, 10),
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

    // Ortak extract modülünü kullan
    const { extractWithOllama, buildExtractionPrompt } = require("./extract.js");
    const msgs = (data.messages ?? [])
      .filter(m => typeof m.content === "string")
      .slice(-10)
      .map(m => `[${m.role}]: ${m.content.slice(0, 200)}`)
      .join("\n");

    const conversationText = `Oturum ${sessionId}:\n${msgs}`;
    const result = await extractWithOllama(conversationText);

    // Fallback summary geliştir
    if (result.tags.includes("manuel")) {
      result.summary = `Oturum ${sessionId} — ${data.messages?.length ?? 0} mesaj`;
      result.tags = [data.backend ?? "unknown", data.model?.split(":")[0] ?? "unknown"];
    }
    return result;
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
}
