// core/commands/language.js — UI language switch (en default, tr available)
// @ts-nocheck
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

module.exports = [{
  name:    "language",
  aliases: ["dil", "lang"],
  group:   "General",
  desc:    "Show or change UI language (en/tr)",
  usage:   "/language [en|tr]",
  exec: async ({ args }) => {
    const req = args[0]?.toLowerCase();
    if (!req) {
      console.log(`\n  ${C.bold(i18n.t("Active language:", "Aktif dil:"))} ${C.cyan(i18n.getLocale())}`);
      console.log(`  ${C.dim("/language en   /language tr")}\n`);
      return;
    }
    if (req !== "en" && req !== "tr") {
      print.error(i18n.t(`Invalid: ${req}  →  en | tr`, `Geçersiz: ${req}  →  en | tr`));
      return;
    }
    const loc = i18n.setLocale(req);
    print.system(i18n.t(`language → ${loc}`, `dil → ${loc}`));
  },
}];
