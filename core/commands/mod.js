// core/commands/mod.js — Working mode
"use strict";
const { C, print } = require("../../tui/index.js");
const i18n = require("../i18n.js");

const MODE_DESCS = {
  chat:  ["Chat without tools", "Araçsız sohbet"],
  plan:  ["Read and search only", "Sadece okuma ve arama"],
  build: ["Writes files, runs commands", "Dosya yazar, komut çalıştırır"],
  agent: ["Full agent — all tools (default)", "Tam ajan — tüm araçlar (varsayılan)"],
};

module.exports = [{
  name:    "mode",
  aliases: ["mod"],
  group:   "General",
  desc:    "Show or change the working mode",
  usage:   "/mode [chat|plan|build|agent]",
  exec: async ({ args, session }) => {
    if (!args[0]) {
      const cur = session.mode;
      console.log("");
      for (const [key, [en, tr]] of Object.entries(MODE_DESCS)) {
        const active = key === cur.name ? C.green(i18n.t(" ◀ active", " ◀ aktif")) : "";
        console.log(`  ${C.cyan(key.padEnd(6))}  ${C.dim(i18n.t(en, tr))}${active}`);
      }
      console.log(`\n  ${C.dim("/mode <chat|plan|build|agent>")}\n`);
      return;
    }
    try {
      session.setMode(args[0]);
    } catch (e) {
      print.error(i18n.t(`${e.message}  →  valid: chat, plan, build, agent`, `${e.message}  →  geçerli: chat, plan, build, agent`));
    }
  },
}];
