// core/commands/memory.js — Memory: list / search / add / delete
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const memory = require("../memory.ts");
const i18n = require("../i18n.js");

const LABELS = {
  fact:       ["FACT", "GERÇEK"],
  preference: ["PREFERENCE", "TERCİH"],
  entity:     ["ENTITY", "VARLIK"],
  correction: ["CORRECTION", "DÜZELTİ"],
};
const label = cat => i18n.t(LABELS[cat]?.[0] ?? cat.toUpperCase(), LABELS[cat]?.[1] ?? cat.toUpperCase());

module.exports = [{
  name:    "memory",
  aliases: ["hafiza", "mem"],
  group:   "Memory",
  desc:    "Memory: list / search / add / delete",
  usage:   "/memory [search <query> | add <text> | delete <id>]",
  exec: async ({ args }) => {
    const sub = args[0]?.toLowerCase();

    // /memory search <query>
    if (sub === "ara" || sub === "search") {
      const q = args.slice(1).join(" ");
      if (!q) { print.error(i18n.t("Usage: /memory search <query>", "Kullanım: /hafiza ara <sorgu>")); return; }
      print.info(i18n.t("Searching memory...", "Hafızada aranıyor..."));
      const hits = await memory.query(q, 8);
      if (!hits.length) { print.warn(i18n.t("No results found.", "Sonuç bulunamadı.")); return; }
      console.log("");
      for (const e of hits) {
        console.log(`  ${C.gray(e.id)}  ${C.cyan(label(e.category))}`);
        console.log(`    ${e.content}`);
      }
      console.log("");
      return;
    }

    // /memory add <text>
    if (sub === "ekle" || sub === "add") {
      const text = args.slice(1).join(" ");
      if (!text) { print.error(i18n.t("Usage: /memory add <content>", "Kullanım: /hafiza ekle <içerik>")); return; }
      const id = await memory.add({ category: "fact", content: text, source: "manual" });
      if (id) print.system(i18n.t(`saved: ${id}`, `kaydedildi: ${id}`));
      else    print.warn(i18n.t("This is already in memory.", "Bu bilgi zaten hafızada var."));
      return;
    }

    // /memory delete <id>
    if (sub === "sil" || sub === "delete") {
      const id = args[1];
      if (!id) { print.error(i18n.t("Usage: /memory delete <id>", "Kullanım: /hafiza sil <id>")); return; }
      memory.remove(id);
      print.system(i18n.t(`deleted: ${id}`, `silindi: ${id}`));
      return;
    }

    // /memory — list everything by category
    const entries = memory.list();
    if (!entries.length) { print.info(i18n.t("Memory is empty.", "Hafıza boş.")); return; }
    const groups = {};
    for (const e of entries) (groups[e.category] ??= []).push(e);
    console.log("");
    for (const [cat, items] of Object.entries(groups)) {
      console.log(`  ${C.cyan(label(cat))}`);
      for (const e of items) console.log(`    ${C.gray(e.id)}  ${e.content}`);
    }
    console.log(`\n  ${C.dim(i18n.t("/memory search <query>  |  /memory add <text>  |  /memory delete <id>", "/hafiza ara <sorgu>  |  /hafiza ekle <metin>  |  /hafiza sil <id>"))}\n`);
  },
}];
