// core/commands/saglayici.js — BYOK provider management
// Keys are never printed to screen — only presence/absence is shown.
"use strict";
const { C, print } = require("../../tui/index.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "provider",
  aliases: ["saglayici", "sg"],
  group:   "Model",
  desc:    "AI providers: list, add (BYOK), remove",
  usage:   "/provider [add <name> [baseURL] | key <name> <key> | remove <name> | presets]",
  exec: async ({ args }) => {
    const backends = require("../../backends/index.js");
    const custom   = backends.custom;
    const sub = args[0]?.toLowerCase();

    if (sub === "presetler" || sub === "presets") {
      console.log("");
      for (const [name, p] of Object.entries(custom.PRESETS)) {
        console.log(`  ${C.cyan(name.padEnd(11))} ${C.muted(p.baseURL)}  ${C.dim(p.keyEnv)}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/provider add <name>          →  add from preset", "/saglayici ekle <ad>          →  preset'ten ekle"))}`);
      console.log(`  ${C.dim(i18n.t("/provider key <name> <key>    →  save API key", "/saglayici anahtar <ad> <key> →  API anahtarını kaydet"))}\n`);
      return;
    }

    if (sub === "ekle" || sub === "add") {
      const name = args[1]?.toLowerCase();
      if (!name) { print.error(i18n.t("Usage: /provider add <name> [baseURL]", "Kullanım: /saglayici ekle <ad> [baseURL]")); return; }
      const baseURL = args[2];
      try {
        const spec = custom.addProvider(name, { baseURL });
        print.system(i18n.t(`provider added: ${name} → ${spec.baseURL}`, `sağlayıcı eklendi: ${name} → ${spec.baseURL}`));
        const hasKey = spec.keyEnv && process.env[spec.keyEnv];
        if (!hasKey) {
          print.info(i18n.t(`  Key required: /provider key ${name} <key>`, `  Anahtar gerekli: /saglayici anahtar ${name} <key>`));
          if (spec.keyEnv) print.info(i18n.t(`  or add "${spec.keyEnv.toLowerCase()}" to credentials.json`, `  ya da credentials.json'a "${spec.keyEnv.toLowerCase()}" ekle`));
        }
      } catch (err) {
        print.error(err.message);
        print.info(i18n.t("For known presets: /provider presets", "Bilinen preset'ler için: /saglayici presetler"));
      }
      return;
    }

    if (sub === "anahtar" || sub === "key") {
      const name = args[1]?.toLowerCase();
      const key  = args[2];
      if (!name || !key) { print.error(i18n.t("Usage: /provider key <name> <key>", "Kullanım: /saglayici anahtar <ad> <key>")); return; }
      const specs = custom.loadSpecs();
      const preset = custom.PRESETS[name];
      if (!specs[name] && !preset) { print.error(i18n.t(`Add it first: /provider add ${name}`, `Önce ekle: /saglayici ekle ${name}`)); return; }
      const spec = specs[name] ?? { baseURL: preset.baseURL, defaultModel: preset.defaultModel };
      spec.key = key;
      delete spec.keyEnv; // inline key takes priority
      specs[name] = spec;
      custom.saveSpecs(specs);
      print.system(i18n.t(`key saved: ${name} (providers.json — never printed to screen)`, `anahtar kaydedildi: ${name} (providers.json — asla ekrana yazdırılmaz)`));
      return;
    }

    if (sub === "sil" || sub === "remove") {
      const name = args[1]?.toLowerCase();
      if (!name) { print.error(i18n.t("Usage: /provider remove <name>", "Kullanım: /saglayici sil <ad>")); return; }
      const ok = custom.removeProvider(name);
      print.system(ok
        ? i18n.t(`provider removed: ${name}`, `sağlayıcı silindi: ${name}`)
        : i18n.t(`${name} is not defined`, `${name} tanımlı değil`));
      return;
    }

    // /provider — list everything
    console.log("");
    console.log(`  ${C.bold(i18n.t("Built-in", "Yerleşik"))}`);
    for (const p of backends.ALL) {
      const ok = await p.isAvailable().catch(() => false);
      const dot = ok ? C.green("●") : C.gray("○");
      const note = ok ? "" : C.dim(i18n.t("  (no key)", "  (anahtar yok)"));
      console.log(`  ${dot} ${C.cyan(p.name.padEnd(12))}${note}`);
    }
    const customs = custom.loadProviders();
    if (customs.length) {
      console.log(`\n  ${C.bold(i18n.t("Custom (BYOK)", "Özel (BYOK)"))}`);
      for (const p of customs) {
        const ok = await p.isAvailable().catch(() => false);
        const dot = ok ? C.green("●") : C.gray("○");
        console.log(`  ${dot} ${C.cyan(p.name.padEnd(12))}${C.muted(p.spec.host)}${ok ? "" : C.dim(i18n.t("  (no key)", "  (anahtar yok)"))}`);
      }
    }
    console.log(`\n  ${C.dim("/provider presets   /provider add <name> [baseURL]")}`);
    console.log(`  ${C.dim(i18n.t("/model <provider> <model-id>  →  start using", "/model <saglayici> <model-id>  →  kullanmaya başla"))}\n`);
  },
}];
