// core/commands/ayar.js — Persistent config settings
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const router = require("../router.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "settings",
  aliases: ["ayar", "config", "cfg"],
  group:   "Settings",
  desc:    "Persistent config: tier models, budget, vault dir",
  usage:   "/settings [tier1 <model> | tier2 <backend> <model> | budget <usd> | threshold <token> | vault <dir> | ollama <host>]",
  exec: async ({ args }) => {
    const sub = args[0]?.toLowerCase();

    if (sub === "tier1") {
      const model = args[1];
      if (!model) { print.error(i18n.t("Usage: /settings tier1 <model-name>", "Kullanım: /ayar tier1 <model-adı>")); return; }
      router.saveConfig({ tier1Model: model });
      print.system(`tier1 → ${model}`);
      return;
    }

    if (sub === "tier2") {
      if (args.length < 3) { print.error(i18n.t("Usage: /settings tier2 <backend> <model>", "Kullanım: /ayar tier2 <backend> <model>")); return; }
      const backend = args[1];
      const model   = args.slice(2).join(" ");
      router.saveConfig({ tier2Backend: backend, tier2Model: model });
      print.system(`tier2 → ${backend} / ${model}`);
      return;
    }

    if (sub === "butce" || sub === "budget") {
      const usd = parseFloat(args[1]);
      if (isNaN(usd) || usd <= 0) { print.error(i18n.t("Usage: /settings budget <amount>  e.g. /settings budget 2.0", "Kullanım: /ayar butce <miktar>  örn: /ayar butce 2.0")); return; }
      router.saveConfig({ sessionBudgetUSD: usd });
      print.system(i18n.t(`session budget → $${usd}`, `oturum bütçesi → $${usd}`));
      return;
    }

    if (sub === "es" || sub === "threshold") {
      const tok = parseInt(args[1]);
      if (isNaN(tok) || tok <= 0) { print.error(i18n.t("Usage: /settings threshold <token-count>  e.g. /settings threshold 1200", "Kullanım: /ayar es <token-sayısı>  örn: /ayar es 1200")); return; }
      router.saveConfig({ complexityTokenThreshold: tok });
      print.system(i18n.t(`complexity threshold → ${tok} tokens`, `karmaşıklık eşiği → ${tok} token`));
      return;
    }

    if (sub === "vault") {
      const dir = args.slice(1).join(" ");
      if (!dir) { print.error(i18n.t("Usage: /settings vault <dir>", "Kullanım: /ayar vault <dizin>")); return; }
      router.saveConfig({ vaultDir: dir });
      print.system(i18n.t(`vault dir → ${dir}`, `vault dizini → ${dir}`));
      return;
    }

    if (sub === "ollama") {
      const host = args[1];
      if (!host) { print.error(i18n.t("Usage: /settings ollama <http://localhost:11434>", "Kullanım: /ayar ollama <http://localhost:11434>")); return; }
      router.saveConfig({ ollamaHost: host });
      // Mevcut süreç için de hemen aktif et (backends/ollama.js ve embed.js lazy okur)
      try {
        const u = new URL(host.startsWith("http") ? host : "http://" + host);
        process.env.OLLAMA_HOST = u.hostname;
        process.env.OLLAMA_PORT = String(u.port || "11434");
      } catch { /* URL parse hatası — kayıt edildi, env değişmedi */ }
      print.system(`ollama host → ${host}`);
      return;
    }

    if (sub === "memoryeffort" || sub === "hafizayon") {
      const val = args[1]?.toLowerCase();
      if (!["low", "balanced", "high"].includes(val)) {
        print.error(i18n.t(
          "Usage: /settings memoryEffort <low|balanced|high>  — high enables extended thinking",
          "Kullanım: /ayar hafizayon <low|balanced|high>  — high extended thinking açar"
        ));
        return;
      }
      router.saveConfig({ memoryEffort: val });
      const note = val === "high"
        ? i18n.t(" (extended thinking ON — API cost increases)", " (extended thinking AÇIK — API maliyeti artar)")
        : "";
      print.system(`memoryEffort → ${val}${note}`);
      return;
    }

    if (sub === "maxoutputtokens" || sub === "maxoutput") {
      const n = parseInt(args[1]);
      if (isNaN(n) || n < 0) {
        print.error(i18n.t(
          "Usage: /settings maxOutputTokens <n>  (0 = provider default)",
          "Kullanım: /ayar maxOutputTokens <n>  (0 = sağlayıcı default)"
        ));
        return;
      }
      router.saveConfig({ maxOutputTokens: n });
      print.system(`maxOutputTokens → ${n === 0 ? "provider default" : n}`);
      return;
    }

    // /settings — show full config
    const { getEffectiveMemoryEffort } = router;
    const cfg = router.loadConfig();
    const effective = typeof getEffectiveMemoryEffort === "function" ? getEffectiveMemoryEffort(cfg) : cfg.memoryEffort;
    const row = (label, val) =>
      `  ${C.bold(label.padEnd(26))} ${C.cyan(String(val))}`;
    console.log([
      "",
      row("tier1Model",               cfg.tier1Model),
      row("tier2Backend",             cfg.tier2Backend),
      row("tier2Model",               cfg.tier2Model),
      row("budgetMode",               cfg.budgetMode),
      row("sessionBudgetUSD",         "$" + cfg.sessionBudgetUSD),
      row("complexityTokenThreshold", cfg.complexityTokenThreshold + " token"),
      row("memoryEffort",             `${cfg.memoryEffort} (effective: ${effective})`),
      row("vaultDir",                 cfg.vaultDir),
      row("ollamaHost",               cfg.ollamaHost ?? "http://localhost:11434"),
      row("maxOutputTokens",          cfg.maxOutputTokens === 0 ? "provider default" : String(cfg.maxOutputTokens ?? 8192)),
      row("language",                 cfg.language ?? "en"),
      "",
      `  ${C.dim("/settings tier1 <model>")}`,
      `  ${C.dim("/settings tier2 <backend> <model>")}`,
      `  ${C.dim("/settings budget <usd>     /settings threshold <token>")}`,
      `  ${C.dim("/settings vault <dir>      /settings ollama <host>")}`,
      `  ${C.dim("/settings memoryEffort <low|balanced|high>")}`,
      `  ${C.dim("/settings maxOutputTokens <n>      (0=provider default)")}`,
      "",
    ].join("\n"));
  },
}];
