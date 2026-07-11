// core/commands/router.js — Tier routing settings
"use strict";
const { C, print } = require("../../tui/index.js");
const router = require("../router.js");
const i18n = require("../i18n.js");
const freeenergy = require("../freeenergy.js");

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

    if (mod === "freeenergy") {
      const sub = args[1]?.toLowerCase();
      if (sub === "on") {
        freeenergy.setEnabled(true);
        print.system(i18n.t("FEP shadow mode ON — gölge kararlar telemetry'ye loglanır", "FEP gölge modu AÇIK — gölge kararlar telemetry'ye loglanır"));
      } else if (sub === "off") {
        freeenergy.setEnabled(false);
        print.system(i18n.t("FEP shadow mode OFF", "FEP gölge modu KAPALI"));
      } else {
        const on = freeenergy.isEnabled();
        console.log(`\n  FEP gölge modu: ${on ? C.green("AÇIK") : C.muted("KAPALI")}`);
        console.log(`  ${C.dim("/router freeenergy on | off")}\n`);
      }
      return;
    }

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
    // Thompson learning summary
    try {
      const thompson = require("../thompson.js");
      const rows = thompson.summary().filter(r => r.obs > 0);
      if (rows.length) {
        console.log(`  ${C.bold("Thompson Learning (balanced mode)")}`);
        for (const r of rows) {
          const bar = "█".repeat(Math.round(parseFloat(r.mean) * 10));
          console.log(`  ${C.muted(r.cls.padEnd(8))} tier${r.tier}  ${C.dim(r.mean)} ${C.cyan(bar)}  ${C.muted(`n=${r.obs}`)}`);
        }
        console.log("");
      }
    } catch {}

    const fepOn = freeenergy.isEnabled();
    console.log(`  ${C.bold("FEP gölge")} ${fepOn ? C.green("AÇIK") : C.muted("KAPALI")}`);
    console.log(`  ${C.dim("/router aggressive | balanced | quality | freeenergy on|off")}`);
    console.log(`  ${C.dim(i18n.t("Model/budget: /settings", "Model/bütçe için: /ayar"))}\n`);
  },
}];
