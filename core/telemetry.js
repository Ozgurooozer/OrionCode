// core/telemetry.js — NDJSON oturum günlüğü (~/.orion/logs/)
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const LOGS_DIR = path.join(process.env.ORION_HOME || os.homedir(), ".orion", "logs");

function ensureDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// process.exit() setImmediate'i beklemez — çıkışta bekleyen tüm logger'ları
// senkron flush eden tek bir "exit" dinleyicisi (logger başına değil, tek sefer)
const _liveLoggers = new Set();
let _exitHookInstalled = false;
function _installExitHook() {
  if (_exitHookInstalled) return;
  _exitHookInstalled = true;
  process.on("exit", () => { for (const l of _liveLoggers) l._flushSync(); });
}

class SessionLogger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.file      = path.join(LOGS_DIR, `${sessionId}.ndjson`);
    this._ready    = false;
    this._buf      = [];      // bekleyen satırlar
    this._flushing = false;   // setImmediate drain aktif mi
    _liveLoggers.add(this);
    _installExitHook();
  }

  record(data) {
    try {
      if (!this._ready) { ensureDir(); this._ready = true; }
      this._buf.push(JSON.stringify({ ts: Date.now(), session: this.sessionId, ...data }) + "\n");
      if (!this._flushing) {
        this._flushing = true;
        setImmediate(() => this._flush());
      }
    } catch {}
  }

  _flush() {
    if (!this._buf.length) { this._flushing = false; return; }
    const lines = this._buf.splice(0);
    try { fs.appendFileSync(this.file, lines.join("")); } catch {}
    if (this._buf.length) {
      setImmediate(() => this._flush());
    } else {
      this._flushing = false;
    }
  }

  // process "exit" handler'ından çağrılır — sadece senkron iş yapılabilir
  _flushSync() {
    if (!this._buf.length) return;
    const lines = this._buf.splice(0);
    try { if (!this._ready) { ensureDir(); this._ready = true; } fs.appendFileSync(this.file, lines.join("")); } catch {}
  }
}

// Son N log dosyasını listele
function listLogs(limit = 20) {
  try {
    ensureDir();
    return fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith(".ndjson"))
      .map(f => ({
        sessionId: f.replace(".ndjson", ""),
        file: path.join(LOGS_DIR, f),
        mtime: fs.statSync(path.join(LOGS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);
  } catch { return []; }
}

// Bir log dosyasını ayrıştır
function readLog(sessionId) {
  const file = path.join(LOGS_DIR, `${sessionId}.ndjson`);
  try {
    return fs.readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map(l => JSON.parse(l));
  } catch { return []; }
}

module.exports = { SessionLogger, listLogs, readLog };
