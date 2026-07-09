// core/commands/arac.js — File, search, sub-agent, coordinator
"use strict";
const { C, print } = require("../../tui/index.js");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "read",
    aliases: ["oku", "r"],
    group:   "Tools",
    desc:    "Show file contents",
    usage:   "/read <file-path>",
    exec: async ({ args }) => {
      const fpath = args.join(" ");
      if (!fpath) { print.error(i18n.t("Usage: /read <file-path>", "Kullanım: /oku <dosya-yolu>")); return; }
      const fsTools = require("../../tools/fs.js");
      console.log(fsTools.execute("read_file", { path: fpath }));
    },
  },
  {
    name:    "search",
    aliases: ["ara", "grep"],
    group:   "Tools",
    desc:    "Search text in files",
    usage:   "/search <pattern>",
    exec: async ({ args }) => {
      const pattern = args.join(" ");
      if (!pattern) { print.error(i18n.t("Usage: /search <text-or-pattern>", "Kullanım: /ara <metin-ya-da-pattern>")); return; }
      const fsTools = require("../../tools/fs.js");
      console.log(fsTools.execute("search", { pattern }));
    },
  },
  {
    name:    "subagent",
    aliases: ["subajans", "sub", "sa"],
    group:   "Tools",
    desc:    "Run a separate sub-agent",
    usage:   "/subagent <task>",
    exec: async ({ args, session }) => {
      const task = args.join(" ");
      if (!task) { print.error(i18n.t("Usage: /subagent <task>", "Kullanım: /subajans <görev>")); return; }
      print.info(i18n.t(`Sub-agent: "${task.slice(0, 60)}"`, `Sub-ajan: "${task.slice(0, 60)}"`));
      const subagent = require("../subagent.js");
      const result   = await subagent.run({ task, model: session.model, backend: session.backend });
      console.log(`\n${C.cyan(i18n.t("── Sub-agent ──", "── Sub-ajan ──"))}`);
      console.log(result.stdout || C.gray(i18n.t("(no output)", "(çıktı yok)")));
      if (result.stderr) console.log(C.gray(result.stderr.slice(0, 200)));
      console.log(C.cyan("──────────────\n"));
    },
  },
  {
    name:    "coordinator",
    aliases: ["koordinator", "ko", "multi"],
    group:   "Tools",
    desc:    "Multi-agent: plan → execute → synthesize",
    usage:   "/coordinator <task>",
    exec: async ({ args, session }) => {
      const task = args.join(" ");
      if (!task) { print.error(i18n.t("Usage: /coordinator <task>", "Kullanım: /koordinator <görev>")); return; }
      const coordinator = require("../coordinator.js");
      await coordinator.runCoordination(task, session);
    },
  },
];
