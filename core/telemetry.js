// core/telemetry.js — NDJSON oturum günlüğü (~/.orion/logs/)
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const LOGS_DIR = path.join(os.homedir(), ".orion", "logs");

function ensureDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

class SessionLogger {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.file      = path.join(LOGS_DIR, `${sessionId}.ndjson`);
    this._ready    = false;
  }

  record(data) {
    try {
      if (!this._ready) { ensureDir(); this._ready = true; }
      const line = JSON.stringify({ ts: Date.now(), session: this.sessionId, ...data }) + "\n";
      fs.appendFileSync(this.file, line);
    } catch {}
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
