// core/commands/router.js — Tier routing settings
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const router = require("../router.ts");
const i18n = require("../i18n.js");
const freeenergy = require("../freeenergy.js");

const MODES = {
  aggressive: ["Always local model (except large context)", "Her zaman yerel model (büyük context hariç)"],
  balanced:   ["Decide by complexity — default", "Karmaşıklığa göre karar — varsayılan"],
  quality:    ["Always cloud model", "Her zaman cloud model"],
};
const modeDesc = key => i18n.t(MODES[key]?.[0] ?? "", MODES[key]?.[1] ?? "");

// FEP gölge raporu: gölge kararların gerçek kararlardan ne sıklıkla saptığı.
// İki kaynak: oturum içi sayaçlar (bu süreç) + kalıcı telemetry logları (fep_shadow).
function renderShadowReport(days) {
  const SEP = C.muted("─".repeat(50));
  const pct = (d, t) => (t > 0 ? `%${((d / t) * 100).toFixed(1)}` : "%0.0");

  const mem = freeenergy.getShadowStats();
  const agg = freeenergy.aggregateShadowReport(days);
  const on  = freeenergy.isEnabled();

  console.log(`\n  ${C.bold(i18n.t("FEP Shadow Report", "FEP Gölge Raporu"))}  ${on ? C.green("AÇIK") : C.muted("KAPALI")}`);
  console.log(`  ${SEP}`);

  // Bu süreç (bellek içi sayaçlar)
  console.log(`  ${C.bold(i18n.t("This session (memory)", "Bu oturum (bellek)"))}`);
  if (mem.total === 0) {
    console.log(`  ${C.muted(i18n.t("no shadow decisions yet", "henüz gölge karar yok"))}`);
  } else {
    console.log(`  ${mem.total} ${i18n.t("decisions", "karar")} · ${mem.diverged} ${i18n.t("divergent", "sapma")} ${C.cyan(`(${pct(mem.diverged, mem.total)})`)}`);
    for (const [reason, s] of Object.entries(mem.byReason)) {
      console.log(`  ${C.muted("•")} ${String(reason).padEnd(34)} ${C.dim(`${s.diverged}/${s.total} sapma`)}`);
    }
    const last = mem.samples.slice(-5);
    if (last.length) {
      console.log(`  ${C.muted(i18n.t("recent samples:", "son örnekler:"))}`);
      for (const s of last) {
        const mark = s.context.diverges ? C.yellow("≠") : C.green("=");
        console.log(
          `    ${mark} ${i18n.t("real", "gerçek")} tier${s.realDecision.tier} ${C.dim(`(${freeenergy.normalizeReason(s.realDecision.reason)})`)}` +
          ` → ${i18n.t("shadow", "gölge")} tier${s.shadowDecision.tier}` +
          ` ${C.muted(`s=${s.shadowDecision.surprise} λ=${s.shadowDecision.lambda}`)}`
        );
      }
    }
  }
  console.log(`  ${SEP}`);

  // Kalıcı log (telemetry fep_shadow kayıtları)
  console.log(`  ${C.bold(i18n.t(`Persistent log (last ${agg.days}d)`, `Kalıcı log (son ${agg.days}g)`))}`);
  if (agg.total === 0) {
    console.log(`  ${C.muted(i18n.t("no fep_shadow records — enable with /router freeenergy on", "fep_shadow kaydı yok — /router freeenergy on ile aç"))}`);
  } else {
    console.log(`  ${agg.total} ${i18n.t("records", "kayıt")} · ${agg.diverged} ${i18n.t("divergent", "sapma")} ${C.cyan(`(${pct(agg.diverged, agg.total)})`)} · ${C.muted(`${i18n.t("avg surprise", "ort. sürpriz")} ${agg.avgSurprise}`)} · ${C.dim(agg.sessions + i18n.t(" sessions", " oturum"))}`);
    for (const [reason, s] of Object.entries(agg.byReason)) {
      console.log(`  ${C.muted("•")} ${String(reason).padEnd(34)} ${C.dim(`${s.diverged}/${s.total} sapma`)}`);
    }
  }
  console.log(`  ${SEP}\n`);
}

module.exports = [{
  name:    "router",
  aliases: ["yon"],
  group:   "Router",
  desc:    "Tier routing settings",
  usage:   "/router [aggressive|balanced|quality|freeenergy on|off|shadow-report]",
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
        console.log(`  ${C.dim("/router freeenergy on | off  ·  /router shadow-report")}\n`);
      }
      return;
    }

    if (mod === "shadow-report" || mod === "shadow") {
      renderShadowReport(parseInt(args[1]) || 30);
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
    console.log(`  ${C.dim("/router aggressive | balanced | quality | freeenergy on|off | shadow-report")}`);
    console.log(`  ${C.dim(i18n.t("Model/budget: /settings", "Model/bütçe için: /ayar"))}\n`);
  },
}];
