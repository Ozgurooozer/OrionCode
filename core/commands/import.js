// core/commands/import.js — /import: Claude Code oturumunu devral
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "import",
  aliases: ["devral"],
  group:   "Session",
  desc:    "Resume a Claude Code session from this directory",
  usage:   "/import [<n>]",
  exec: async ({ args, session }) => {
    const hi = require("../harness-import.js");
    const sessions = hi.listClaudeSessions();

    if (!sessions.length) {
      print.info(i18n.t(
        `No Claude Code sessions found for this directory (${hi.claudeProjectDir()})`,
        `Bu dizin için Claude Code oturumu bulunamadı (${hi.claudeProjectDir()})`
      ));
      return;
    }

    const n = parseInt(args[0], 10);
    if (!args[0] || isNaN(n)) {
      console.log(`\n  ${C.bold(i18n.t("Claude Code sessions (this directory):", "Claude Code oturumları (bu dizin):"))}\n`);
      sessions.forEach((s, i) => {
        const date = new Date(s.mtime).toLocaleString();
        console.log(`  ${C.cyan(String(i + 1).padStart(2))}  ${C.dim(date)}  ${C.dim(`${s.sizeKB}KB`)}  ${s.title}`);
      });
      console.log(`\n  ${C.dim(i18n.t("/import <n>  →  resume into current session", "/import <n>  →  mevcut oturuma devral"))}\n`);
      return;
    }

    const chosen = sessions[n - 1];
    if (!chosen) {
      print.warn(i18n.t(`No session #${n} — list with /import`, `#${n} yok — /import ile listele`));
      return;
    }

    const { msgs, total } = hi.importClaudeSession(chosen.file);
    if (!msgs.length) {
      print.warn(i18n.t("Session file contained no importable messages.", "Oturum dosyasında aktarılabilir mesaj yok."));
      return;
    }

    session.msgs = msgs;
    print.system(i18n.t(
      `imported: "${chosen.title.slice(0, 60)}" — ${msgs.length}/${total} messages loaded. Continue the conversation.`,
      `devralındı: "${chosen.title.slice(0, 60)}" — ${msgs.length}/${total} mesaj yüklendi. Konuşmaya devam edebilirsin.`
    ));
  },
}];
