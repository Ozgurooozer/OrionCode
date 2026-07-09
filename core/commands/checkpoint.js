// core/commands/checkpoint.js — Dosya snapshot'larını listele / geri al
"use strict";
const { C, print } = require("../../tui/index.js");
const checkpoint = require("../checkpoint.js");
const i18n = require("../i18n.js");
const path = require("path");

module.exports = [
  {
    name:    "checkpoint",
    aliases: ["cp", "gerial"],
    group:   "Session",
    desc:    "File snapshots: list and restore",
    usage:   "/checkpoint [geri <id>]",
    exec: async ({ args }) => {
      const sub = (args[0] ?? "").toLowerCase();

      if (sub === "geri" || sub === "restore") {
        const id = args[1];
        if (!id) { print.error(i18n.t("Usage: /checkpoint geri <id>", "Kullanım: /checkpoint geri <id>")); return; }
        const r = checkpoint.restore(id);
        if (!r.ok) { print.error(r.error); return; }
        const rel = path.relative(process.cwd(), r.file);
        print.system(r.action === "restored"
          ? i18n.t(`restored: ${rel}`, `geri alındı: ${rel}`)
          : i18n.t(`deleted (was newly created): ${rel}`, `silindi (yeni oluşturulmuştu): ${rel}`));
        return;
      }

      const list = checkpoint.list(20);
      if (!list.length) { print.info(i18n.t("No checkpoints yet.", "Henüz checkpoint yok.")); return; }
      const tag = i18n.locTag();
      console.log("");
      for (const e of list) {
        const time = new Date(e.ts).toLocaleString(tag);
        const rel  = path.relative(process.cwd(), e.file);
        const kind = e.existed ? "✎" : "+";
        console.log(`  ${C.cyan(e.id)}  ${C.dim(kind)} ${rel}  ${C.gray(`${e.tool} · ${time}`)}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/checkpoint geri <id>  →  restore file", "/checkpoint geri <id>  →  dosyayı geri al"))}\n`);
    },
  },
];
