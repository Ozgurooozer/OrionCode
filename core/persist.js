// core/persist.js — Oturum geçmişini diske kaydet/yükle
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HOME         = process.env.ORION_HOME || os.homedir(); // test için geçersiz kılınabilir
const SESSIONS_DIR = path.join(HOME, ".orion", "sessions");

function ensureDir() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function save(sessionId, data) {
  ensureDir();
  fs.writeFileSync(sessionPath(sessionId), JSON.stringify(data, null, 2), "utf8");
}

function load(sessionId) {
  try { return JSON.parse(fs.readFileSync(sessionPath(sessionId), "utf8")); }
  catch { return null; }
}

function list() {
  ensureDir();
  return fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      const id = f.replace(".json", "");
      try {
        const d = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf8"));
        return {
          id,
          model:     d.model ?? "?",
          backend:   d.backend ?? "?",
          mode:      d.mode ?? "agent",
          parent:    d.parent ?? null,
          label:     d.label ?? "",
          msgCount:  (d.messages ?? []).length,
          updatedAt: d.updatedAt ?? 0,
          preview:   _preview(d.messages),
        };
      } catch { return { id, model: "?", msgCount: 0, updatedAt: 0 }; }
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function del(sessionId) {
  try { fs.unlinkSync(sessionPath(sessionId)); return true; }
  catch { return false; }
}

function _preview(messages = []) {
  const last = messages.filter(m => m.role === "user").slice(-1)[0];
  if (!last) return "";
  const txt = typeof last.content === "string" ? last.content : "";
  return txt.slice(0, 60).replace(/\n/g, " ");
}

module.exports = { save, load, list, del, SESSIONS_DIR };
