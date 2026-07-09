// core/commands/router.js — Tier routing settings
"use strict";
const { C, print } = require("../../tui/index.js");
const router = require("../router.js");
const i18n = require("../i18n.js");

const MODES = {
  aggressive: ["Always local model (except large context)", "Her zaman yerel model (büyük context hariç)"],
  balanced:   ["Decide by complexity — default", "Karmaşıklığa göre karar — varsayılan"],
  quality:    ["Always cloud model", "Her zaman cloud model"],
};
const modeDesc = key => i18n.t(MODES[key]?.[0] ?? "", MODES[key]?.[1] ?? "");

module.exports = [{
  name:    "router",
  aliases: ["yon"],
  group:   "Router",
  desc:    "Tier routing settings",
  usage:   "/router [aggressive|balanced|quality]",
  exec: async ({ args }) => {
    const mod = args[0]?.toLowerCase();

    if (mod) {
      if (!MODES[mod]) {
        print.error(i18n.t(`Invalid: ${mod}  →  aggressive | balanced | quality`, `Geçersiz: ${mod}  →  aggressive | balanced | quality`));
        return;
      }
      router.saveConfig({ budgetMode: mod });
      print.system(`router → ${mod}: ${modeDesc(mod)}`);
      return;
    }

    const cfg = router.loadConfig();
    console.log("");
    console.log(`  ${C.bold(i18n.t("Mode ", "Mod  "))}  ${C.cyan(cfg.budgetMode)}  ${C.dim(modeDesc(cfg.budgetMode))}`);
    console.log(`  ${C.bold("Tier1")} ollama / ${cfg.tier1Model}`);
    console.log(`  ${C.bold("Tier2")} ${cfg.tier2Backend} / ${cfg.tier2Model}`);
    console.log(`  ${C.bold(i18n.t("Threshold", "Eşik     "))}  ${cfg.complexityTokenThreshold} token`);
    console.log(`  ${C.bold(i18n.t("Budget   ", "Bütçe    "))}  $${cfg.sessionBudgetUSD}`);
    console.log("");
    for (const [key] of Object.entries(MODES)) {
      const mark = key === cfg.budgetMode ? C.green(" ◀") : "";
      console.log(`  ${C.cyan(key.padEnd(12))} ${C.dim(modeDesc(key))}${mark}`);
    }
    console.log(`\n  ${C.dim("/router aggressive | balanced | quality")}`);
    console.log(`  ${C.dim(i18n.t("Model/budget: /settings", "Model/bütçe için: /ayar"))}\n`);
  },
}];
