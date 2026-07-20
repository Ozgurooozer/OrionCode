// core/commands/diff.js — Dosya farkları: checkpoint'e karşı ya da iki dosya arası
"use strict";
const fs   = require("fs");
const path = require("path");
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const diff = require("../diff.js");
const checkpoint = require("../checkpoint.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "diff",
  aliases: ["fark"],
  group:   "Tools",
  desc:    "Diff: file vs last checkpoint, or two files",
  usage:   "/diff <file> [file2]",
  exec: async ({ args }) => {
    if (!args.length) {
      // Argümansız: son değişen dosyanın checkpoint diff'i
      const last = checkpoint.list(1)[0];
      if (!last) { print.info(i18n.t("No checkpoints yet.", "Henüz checkpoint yok.")); return; }
      args = [last.file];
    }

    const fileA = args[0];

    // /diff <a> <b> → iki dosya karşılaştır
    if (args[1]) {
      const a = path.resolve(fileA), b = path.resolve(args[1]);
      if (!fs.existsSync(a)) { print.error(i18n.t(`Not found: ${fileA}`, `Bulunamadı: ${fileA}`)); return; }
      if (!fs.existsSync(b)) { print.error(i18n.t(`Not found: ${args[1]}`, `Bulunamadı: ${args[1]}`)); return; }
      const d = diff.diffText(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"));
      if (!d) { print.system(i18n.t("files are identical", "dosyalar aynı")); return; }
      const s = diff.diffStat(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"));
      console.log(`\n  ${C.bold(`${fileA} → ${args[1]}`)}  ${C.green(`+${s.added}`)} ${C.red(`−${s.removed}`)}\n`);
      print.diff(d, { maxLines: 200 });
      console.log("");
      return;
    }

    // /diff <dosya> → son checkpoint'e karşı
    const abs = path.resolve(fileA);
    if (!fs.existsSync(abs)) { print.error(i18n.t(`Not found: ${fileA}`, `Bulunamadı: ${fileA}`)); return; }
    const entry = checkpoint.lastFor(abs);
    if (!entry) {
      print.info(i18n.t(
        `No checkpoint for this file yet — snapshots are taken automatically on writes.`,
        `Bu dosya için checkpoint yok — snapshot'lar yazımda otomatik alınır.`
      ));
      return;
    }
    const old = checkpoint.readSnapshot(entry.id);
    if (old === null) { print.error(i18n.t("Snapshot file missing.", "Snapshot dosyası kayıp.")); return; }
    const now = fs.readFileSync(abs, "utf8");
    const d = diff.diffText(old, now);
    if (!d) { print.system(i18n.t("no changes since last checkpoint", "son checkpoint'ten beri değişiklik yok")); return; }
    const s = diff.diffStat(old, now);
    const rel = path.relative(process.cwd(), abs);
    const when = new Date(entry.ts).toLocaleString(i18n.locTag());
    console.log(`\n  ${C.bold(rel)}  ${C.dim(`checkpoint ${entry.id} · ${when}`)}  ${C.green(`+${s.added}`)} ${C.red(`−${s.removed}`)}\n`);
    print.diff(d, { maxLines: 200 });
    console.log(`\n  ${C.dim(i18n.t(`/checkpoint geri ${entry.id}  →  undo these changes`, `/checkpoint geri ${entry.id}  →  bu değişiklikleri geri al`))}\n`);
  },
}];
