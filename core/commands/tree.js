// core/commands/tree.js — Oturum ağacı: dallanma (/dal) ve görünüm (/tree)
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const persist = require("../persist.js");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "dal",
    aliases: ["fork", "branch"],
    group:   "Session",
    desc:    "Fork the conversation into a new branch",
    usage:   "/dal [etiket]",
    exec: async ({ args, session }) => {
      const label = args.join(" ");
      const { id, parent } = session.fork(label);
      print.system(i18n.t(
        `branched: ${parent} → ${id}${label ? ` (${label})` : ""} — both branches saved`,
        `dallandı: ${parent} → ${id}${label ? ` (${label})` : ""} — iki dal da kayıtlı`
      ));
    },
  },
  {
    name:    "tree",
    aliases: ["agac"],
    group:   "Session",
    desc:    "Show the session tree",
    usage:   "/tree",
    exec: async ({ session }) => {
      const list = persist.list();
      if (!list.length) { print.info(i18n.t("No saved sessions.", "Kayıtlı oturum yok.")); return; }

      const byId = new Map(list.map(s => [s.id, s]));
      const children = new Map();
      const roots = [];
      for (const s of list) {
        if (s.parent && byId.has(s.parent)) {
          if (!children.has(s.parent)) children.set(s.parent, []);
          children.get(s.parent).push(s);
        } else {
          roots.push(s);
        }
      }
      // Kararlı sıra: en yeni en üstte (persist.list zaten öyle sıralıyor)

      const line = (s, prefix, isLast, isRoot) => {
        const conn  = isRoot ? "" : (isLast ? "└─ " : "├─ ");
        const here  = s.id === session.id ? C.yellow(" ← buradasın") : "";
        const label = s.label ? C.dim(` "${s.label}"`) : "";
        const msgs  = i18n.t(`${s.msgCount} msg`, `${s.msgCount} mesaj`);
        console.log(`  ${prefix}${conn}${C.cyan(s.id)}${label}  ${C.gray(`${s.backend}/${s.model} · ${msgs}`)}${here}`);
        const kids = children.get(s.id) ?? [];
        kids.forEach((k, i) => {
          const nextPrefix = prefix + (isRoot ? "" : (isLast ? "   " : "│  "));
          line(k, nextPrefix, i === kids.length - 1, false);
        });
      };

      console.log("");
      roots.forEach(r => line(r, "", true, true));
      console.log(`\n  ${C.dim(i18n.t("/dal [label] → fork  |  /load <id> → switch branch", "/dal [etiket] → dallan  |  /yukle <id> → dala geç"))}\n`);
    },
  },
];
