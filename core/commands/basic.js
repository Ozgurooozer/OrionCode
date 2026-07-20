// core/commands/basic.js — reset, undo, info
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "reset",
    aliases: ["sifirla"],
    group:   "General",
    desc:    "Clear the conversation",
    usage:   "/reset",
    exec: async ({ session }) => {
      session.reset();
      print.system(i18n.t("session reset", "oturum sıfırlandı"));
    },
  },
  {
    name:    "undo",
    aliases: ["geri"],
    group:   "General",
    desc:    "Undo the last message pair",
    usage:   "/undo",
    exec: async ({ session }) => {
      const ok = session.undo();
      if (ok) print.system(i18n.t("last message undone", "son mesaj geri alındı"));
      else    print.warn(i18n.t("nothing to undo", "geri alınacak mesaj yok"));
    },
  },
  {
    name:    "info",
    aliases: ["bilgi", "i"],
    group:   "General",
    desc:    "Active session summary (backend, model, tokens, cost)",
    usage:   "/info",
    exec: async ({ session }) => {
      const b    = session.budget.get();
      const tok  = b.inputTokens + b.outputTokens;
      const tag  = i18n.locTag();
      console.log([
        "",
        `  ${C.bold(i18n.t("Session ", "Oturum  "))}  ${C.gray(session.id)}`,
        `  ${C.bold(i18n.t("Backend ", "Backend "))}  ${C.cyan(session.backend)} / ${C.yellow(session.model)}`,
        `  ${C.bold(i18n.t("Mode    ", "Mod     "))}  ${session.mode.label}  ${C.dim(session.mode.desc ?? "")}`,
        `  ${C.bold(i18n.t("Messages", "Mesaj   "))}  ${session.msgs.length}`,
        `  ${C.bold(i18n.t("Tokens  ", "Token   "))}  ${tok.toLocaleString(tag)}  ${C.dim(i18n.t(
          `(${b.inputTokens.toLocaleString(tag)} in + ${b.outputTokens.toLocaleString(tag)} out)`,
          `(${b.inputTokens.toLocaleString(tag)} giriş + ${b.outputTokens.toLocaleString(tag)} çıkış)`
        ))}`,
        `  ${C.bold(i18n.t("Cost    ", "Maliyet "))}  ${C.yellow("$" + b.totalCostUSD.toFixed(5))}  ${i18n.t("remaining", "kalan")} ${C.green("$" + b.remaining.toFixed(4))}`,
        `  ${C.bold(i18n.t("Turns   ", "Tur     "))}  ${b.turns}`,
        "",
      ].join("\n"));
    },
  },
];
