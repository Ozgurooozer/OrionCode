// core/modes.js — Plan / Build / Chat / Agent modes + plugin loader
// @ts-nocheck
"use strict";
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const i18n = require("./i18n.ts");

const MODES = {
  chat: {
    name: "chat",
    label: "CHAT",
    color: "\x1b[90m",   // gray
    get desc() { return i18n.t("Chat without tools — text only", "Araçsız sohbet — sadece metin"); },
    allowTools:   false,
    allowWrite:   false,
  },
  plan: {
    name: "plan",
    label: "PLAN",
    color: "\x1b[36m",   // cyan
    get desc() { return i18n.t("Read + analyze — no writes/commands", "Okuma + analiz — yazma/komut yok"); },
    allowTools:   true,
    allowWrite:   false,
    onlyTools:    ["think", "read_file", "read_many_files", "list_files", "glob_files", "search", "file_info", "file_outline", "memory_read", "moltbook_feed", "moltbook_status", "vault_search", "vault_recent", "vault_read", "web_fetch", "git_status", "git_diff", "git_log", "git_show", "git_blame"],
  },
  build: {
    name: "build",
    label: "BUILD",
    color: "\x1b[32m",   // green
    get desc() { return i18n.t("Writes files, runs commands — full access", "Dosya yazar, komut çalıştırır — tam erişim"); },
    allowTools:   true,
    allowWrite:   true,
    confirmTools: ["run_command"],
  },
  agent: {
    name: "agent",
    label: "AGENT",
    color: "\x1b[33m",   // yellow
    get desc() { return i18n.t("Standard agent — all tools, commands need confirmation", "Standart ajan — tüm araçlar, komut onayı gerekir"); },
    allowTools:   true,
    allowWrite:   true,
    confirmTools: ["run_command"],
  },
};

// ~/.orion/modes/*.js dosyalarından ek modlar yükle
// Her dosya { name, label, color, desc, allowTools, allowWrite, onlyTools?, confirmTools? } export etmeli.
(function _loadPluginModes() {
  const HOME     = process.env.ORION_HOME || os.homedir();
  const modesDir = path.join(HOME, ".orion", "modes");
  if (!fs.existsSync(modesDir)) return;
  for (const f of fs.readdirSync(modesDir).filter(f => f.endsWith(".js"))) {
    try {
      const m = require(path.join(modesDir, f));
      if (m && typeof m.name === "string" && !MODES[m.name]) {
        MODES[m.name] = m;
      }
    } catch {}
  }
})();

// Mod başına LLM sistem prompt eki — plan/build modlarında davranış yönlendirir.
// "agent" ve plugin modlar için mod tanımında `systemSuffix` alanı varsa o kullanılır.
const MODE_SUFFIXES = {
  plan:  "\n\n## MODE: PLAN\nRead files and analyze. Write a clear plan in markdown. Do NOT write or edit files — use only read tools.",
  build: "\n\n## MODE: BUILD\nImplement the approved plan precisely. Write files, run commands, run tests. Stay focused. Do not ask permission — just do the work.\n- Use multi_edit for multiple changes in one file (atomic, single diff)\n- Use run_command to verify: node --check, npm test, etc.\n- If edit_file old_str fails, use read_file to get exact content then retry",
  chat:  "\n\n## MODE: CHAT\nConversation only — no tools.",
  agent: "\n\n## MODE: AGENT\nYou can use all tools. Approach tasks like an expert engineer:\n1. Read before writing — understand the code first (read_file, search, git_status)\n2. Make targeted edits — prefer multi_edit (multiple changes) or edit_file (single change) over write_file\n3. If edit_file fails with 'not found', immediately use read_file to get exact content, then retry\n4. Verify — run_command to run tests or check syntax after changes\n5. Report clearly — say what you changed and why",
};

class ModeManager {
  constructor(initial = "agent") {
    this._mode = MODES[initial] ?? MODES.agent;
  }

  get()  { return this._mode; }
  name() { return this._mode.name; }

  set(name) {
    if (!MODES[name]) throw new Error(i18n.t(
      `Unknown mode: ${name}. Available: ${Object.keys(MODES).join(", ")}`,
      `Bilinmeyen mod: ${name}. Mevcut: ${Object.keys(MODES).join(", ")}`
    ));
    this._mode = MODES[name];
    return this._mode;
  }

  // Is tool usage allowed?
  canUse(toolName) {
    const m = this._mode;
    if (!m.allowTools) return { ok: false, reason: i18n.t(`tools are not allowed in ${m.label} mode`, `${m.label} modunda araç kullanılamaz`) };
    if (m.onlyTools && !m.onlyTools.includes(toolName))
      return { ok: false, reason: i18n.t(`${toolName} is restricted in ${m.label} mode`, `${m.label} modunda ${toolName} kısıtlı`) };
    return { ok: true };
  }

  // Bu araç için onay gerekiyor mu?
  needsConfirm(toolName) {
    return (this._mode.confirmTools ?? []).includes(toolName);
  }

  // Mevcut modun izin verdiği araçları filtrele
  filterDefs(allDefs) {
    const m = this._mode;
    if (!m.allowTools) return [];
    if (m.onlyTools)   return allDefs.filter(d => m.onlyTools.includes(d.name));
    return allDefs;
  }

  // Prompt prefix: "[PLAN] " gibi
  promptPrefix() {
    const m = this._mode;
    if (m.name === "agent") return "";
    return `${m.color}[${m.label}]\x1b[0m `;
  }

  // Mod başına sistem prompt eki — plan/build/chat için davranış yönlendirir
  systemSuffix() {
    const m = this._mode;
    // Plugin modlar kendi systemSuffix alanını tanımlayabilir
    if (m.systemSuffix) return m.systemSuffix;
    return MODE_SUFFIXES[m.name] ?? "";
  }

  list() { return Object.values(MODES); }
}

module.exports = { MODES, ModeManager };
