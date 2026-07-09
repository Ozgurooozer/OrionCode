// core/commands/plugin.js — Plugin durumu ve yeniden yükleme
"use strict";
const { C, print } = require("../../tui/index.js");
const plugins = require("../plugins.js");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "plugin",
    aliases: ["plugins", "eklenti"],
    group:   "Extend",
    desc:    "Installed plugins: list / reload",
    usage:   "/plugin [yenile]",
    exec: async ({ args }) => {
      const sub = (args[0] ?? "").toLowerCase();
      const list = (sub === "yenile" || sub === "reload") ? plugins.loadAll() : plugins.status();

      if (!list.length) {
        print.info(i18n.t(
          `No plugins. Drop a folder with ${plugins.MANIFEST} into:\n  ${plugins.DIR}`,
          `Plugin yok. İçinde ${plugins.MANIFEST} olan bir klasörü şuraya at:\n  ${plugins.DIR}`
        ));
        return;
      }
      console.log("");
      for (const p of list) {
        const dot = p.ok ? C.green("●") : C.red("●");
        const parts = [];
        if (p.tools)     parts.push(i18n.t(`${p.tools} tools`, `${p.tools} araç`));
        if (p.commands)  parts.push(i18n.t(`${p.commands} commands`, `${p.commands} komut`));
        if (p.providers) parts.push(`${p.providers} provider`);
        const detail = p.ok ? C.gray(parts.join(" · ") || "-") : C.red(p.error);
        console.log(`  ${dot} ${C.cyan(p.name)} ${C.dim("v" + p.version)}  ${detail}`);
        if (p.description) console.log(`     ${C.gray(p.description)}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/plugin yenile → reload all", "/plugin yenile → tümünü yeniden yükle"))}\n`);
    },
  },
];
