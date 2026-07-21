// core/commands/budget.js — Token/cost and log
// @ts-nocheck
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

module.exports = [
  {
    name:    "budget",
    aliases: ["butce", "b"],
    group:   "Cost",
    desc:    "Token usage and cost summary",
    usage:   "/budget",
    exec: async ({ session }) => {
      const b   = session.budget.get();
      const tok = b.inputTokens + b.outputTokens;
      const tag = i18n.locTag();
      console.log("");
      console.log(`  ${session.budget.summary()}`);
      console.log(`  ${i18n.t("In      ", "Giriş   ")} ${b.inputTokens.toLocaleString(tag)} token`);
      console.log(`  ${i18n.t("Out     ", "Çıkış   ")} ${b.outputTokens.toLocaleString(tag)} token`);
      console.log(`  ${i18n.t("Total   ", "Toplam  ")} ${tok.toLocaleString(tag)} token`);
      console.log(`  ${i18n.t("Turns   ", "Tur     ")} ${b.turns}`);
      console.log(`  ${i18n.t("Spent   ", "Harcanan")} ${C.yellow("$" + b.totalCostUSD.toFixed(5))}`);
      console.log(`  ${i18n.t("Left    ", "Kalan   ")} ${C.green("$" + b.remaining.toFixed(4))}`);
      if (b.cacheReadTokens > 0 || b.cacheWriteTokens > 0) {
        console.log(`  ${i18n.t("Cache↑  ", "Cache↑  ")} ${C.cyan(b.cacheWriteTokens.toLocaleString(tag))} ${i18n.t("tok written", "tok yazıldı")}`);
        console.log(`  ${i18n.t("Cache↓  ", "Cache↓  ")} ${C.green(b.cacheReadTokens.toLocaleString(tag))} ${i18n.t("tok read (−90%)", "tok okundu (−%90)")}`);
        if (b.cacheSavedUSD > 0) {
          console.log(`  ${i18n.t("Saved   ", "Tasarruf")} ${C.green("$" + b.cacheSavedUSD.toFixed(5))}`);
        }
      }
      console.log("");
    },
  },
  {
    name:    "logs",
    aliases: ["telemetri"],
    group:   "Cost",
    desc:    "List session log files / view detail",
    usage:   "/logs [read <id>]",
    exec: async ({ args }) => {
      const tel = require("../telemetry.ts");
      const sub = args[0]?.toLowerCase();
      const tag = i18n.locTag();

      if ((sub === "oku" || sub === "read") && args[1]) {
        const events = tel.readLog(args[1]);
        if (!events.length) { print.warn(i18n.t("Log not found.", "Log bulunamadı.")); return; }
        console.log("");
        for (const e of events.slice(-20)) {
          const t      = new Date(e.ts).toLocaleTimeString(tag);
          const ev     = C.cyan(e.event.padEnd(16));
          const detail = e.tool      ? `tool:${e.tool}`
                       : e.backend   ? e.backend
                       : e.costUSD != null ? `$${e.costUSD.toFixed(5)}`
                       : "";
          console.log(`  ${C.dim(t)} ${ev} ${detail}`);
        }
        console.log("");
        return;
      }

      const logs = tel.listLogs(10);
      if (!logs.length) { print.info(i18n.t("No logs.", "Log yok.")); return; }
      console.log("");
      for (const l of logs) {
        const d = new Date(l.mtime).toLocaleString(tag);
        console.log(`  ${C.gray(l.sessionId)}  ${C.dim(d)}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/log read <session-id>  →  event detail", "/log oku <session-id>  →  olay detayları"))}\n`);
    },
  },
];
