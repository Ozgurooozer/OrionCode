// core/commands/compact.js — Konuşma geçmişini sıkıştır
// @ts-nocheck
// /compact: LLM ile özet üret, geçmişi 2 mesaja indir → context token'ı serbest bırakır.
// Auto-compact: session.js içinde contextLimit konfigürasyonuyla tetiklenir.
"use strict";
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

module.exports = [{
  name:    "compact",
  aliases: ["sikistir", "sıkıştır"],
  group:   "Session",
  desc:    "Summarize and compress conversation history to free context space",
  usage:   "/compact",
  exec: async ({ session }) => {
    await session.compact();
  },
},
{
  name:    "context",
  aliases: ["ctx"],
  group:   "Session",
  desc:    "Show current context token usage and limit",
  usage:   "/context",
  exec: ({ session }) => {
    const { countMessages } = require("../budget.ts");
    const { loadConfig }    = require("../router.ts");
    const tokens = countMessages(session.msgs, session.system);
    const cfg    = loadConfig();
    const limit  = session._resolveContextLimit(cfg);
    const pct    = Math.round(tokens / limit * 100);
    // limit kaynağını göster: user override mu, per-backend mi, default mu
    const src = cfg.contextLimit > 0
      ? i18n.t("global override", "genel override")
      : (cfg.backendContextLimits ?? {})[session.backend] > 0
        ? i18n.t("per-backend config", "backend config")
        : i18n.t("built-in default", "yerleşik varsayılan");
    print.system(i18n.t(
      `Context: ${tokens}/${limit} tokens (${pct}%)  ·  messages: ${session.msgs.length}  ·  limit source: ${src}`,
      `Bağlam: ${tokens}/${limit} token (%${pct})  ·  mesaj: ${session.msgs.length}  ·  limit kaynağı: ${src}`
    ));
    if (tokens > limit * 0.80) {
      print.warn(i18n.t(
        "Context is near the limit (>80%). Use /compact to free space.",
        "Bağlam sınıra yakın (>%80). Alan açmak için /compact kullanın."
      ));
    }
  },
}];
