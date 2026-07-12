// core/modes.js — Plan / Build / Chat / Agent modes
const i18n = require("./i18n.js");

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
    onlyTools:    ["read_file", "list_files", "search", "memory_read", "moltbook_feed", "moltbook_status", "vault_search", "vault_recent", "vault_read", "web_fetch"],
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

  list() { return Object.values(MODES); }
}

module.exports = { MODES, ModeManager };
