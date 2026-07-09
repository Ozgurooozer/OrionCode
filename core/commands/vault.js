// core/commands/vault.js — Vault: list / search / read / status / save
"use strict";
const { C, print } = require("../../tui/index.js");
const vault = require("../vault.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "vault",
  aliases: ["v"],
  group:   "Vault",
  desc:    "Vault: list / search / read / save / status",
  usage:   "/vault [search <query> | read <id> | save | status]",
  exec: async ({ args, session }) => {
    const sub = args[0]?.toLowerCase();
    const tag = i18n.locTag();

    // /vault search <query>
    if (sub === "ara" || sub === "search") {
      const q = args.slice(1).join(" ");
      if (!q) { print.error(i18n.t("Usage: /vault search <query>", "Kullanım: /vault ara <sorgu>")); return; }
      print.info(i18n.t("Searching vault...", "Vault aranıyor..."));
      const hits = await vault.searchVault(q, 5);
      if (!hits.length) { print.warn(i18n.t("No results found.", "Sonuç bulunamadı.")); return; }
      console.log("");
      for (const h of hits) {
        const score = h.score != null ? C.dim(` %${(h.score * 100).toFixed(0)}`) : "";
        console.log(`  ${C.cyan(h.date)}  ${C.gray(h.id)}${score}`);
        console.log(`    ${h.summary}`);
        if (h.tags?.length) console.log(`    ${h.tags.map(t => C.dim(t)).join(" · ")}`);
      }
      console.log("");
      return;
    }

    // /vault read <id>
    if (sub === "oku" || sub === "read") {
      const sid = args[1];
      if (!sid) { print.error(i18n.t("Usage: /vault read <session-id>", "Kullanım: /vault oku <session-id>")); return; }
      const content = vault.readEntry(sid);
      if (!content) { print.error(i18n.t(`Not found: ${sid}`, `Bulunamadı: ${sid}`)); return; }
      console.log("\n" + content.slice(0, 3000) + "\n");
      return;
    }

    // /vault status
    if (sub === "durum" || sub === "status") {
      const daemon = require("../daemon.js");
      const s = daemon.getStatus();
      const dir = vault.getVaultDir();
      console.log("");
      console.log(`  ${i18n.t("Daemon    ", "Daemon    ")}${s.running ? C.green(i18n.t("running", "çalışıyor")) : C.red(i18n.t("stopped", "durdu"))}`);
      console.log(`  ${i18n.t("Processed ", "İşlenen   ")}${i18n.t(`${s.processed} sessions`, `${s.processed} oturum`)}`);
      if (s.lastActivity) console.log(`  ${i18n.t("Last      ", "Son       ")}${new Date(s.lastActivity).toLocaleString(tag)}`);
      console.log(`  ${i18n.t("Directory ", "Dizin     ")}${dir}`);
      console.log(`  ${i18n.t("Web       ", "Web       ")}${C.dim("file://" + dir + "/index.html")}`);
      console.log("");
      return;
    }

    // /vault graf — düğüm grafiğini (yeniden) üret ve yolunu göster
    if (sub === "graf" || sub === "graph") {
      const p = vault.rebuildGraph();
      print.system(i18n.t(`graph rebuilt: ${p}`, `graf oluşturuldu: ${p}`));
      print.info(C.dim("file://" + p.replace(/\\/g, "/")));
      return;
    }

    // /vault save — write the current conversation right now
    if (sub === "kaydettir" || sub === "save") {
      if (!session?.msgs?.length) { print.warn(i18n.t("No messages to save.", "Kaydedilecek mesaj yok.")); return; }
      print.info(i18n.t("Saving to vault...", "Vault'a kaydediliyor..."));
      const { extractWithOllama } = require("../extract.js");
      const text = session.msgs
        .filter(m => typeof m.content === "string")
        .slice(-20)
        .map(m => `[${m.role}]: ${m.content.slice(0, 300)}`)
        .join("\n");
      const knowledge = await extractWithOllama(text);
      const data = {
        model:     session.model,
        backend:   session.backend,
        updatedAt: Date.now(),
        messages:  session.msgs.slice(-20),
      };
      const result = await vault.writeSession(session.id, data, knowledge);
      print.system(i18n.t(`saved: ${result.file}`, `kaydedildi: ${result.file}`));
      print.info(i18n.t(`Summary: ${knowledge.summary}`, `Özet: ${knowledge.summary}`));
      if (knowledge.tags?.length) print.info(i18n.t(`Tags: ${knowledge.tags.join(", ")}`, `Etiketler: ${knowledge.tags.join(", ")}`));
      return;
    }

    // /vault — last 10 sessions
    const entries = vault.recentEntries(10);
    if (!entries.length) {
      print.info(i18n.t("Vault is empty. The daemon saves conversations automatically.", "Vault boş. Daemon konuşmaları otomatik kaydeder."));
      print.info(i18n.t("  Save now: /vault save", "  Hemen kaydet: /vault kaydettir"));
      return;
    }
    const dir = vault.getVaultDir();
    console.log("");
    for (const e of entries) {
      console.log(`  ${C.cyan(e.date)}  ${C.gray(e.id)}`);
      console.log(`    ${(e.summary ?? "").slice(0, 72)}`);
      if (e.tags?.length) console.log(`    ${e.tags.map(t => C.dim(t)).join(" · ")}`);
    }
    console.log(`\n  ${C.dim(i18n.t("/vault search <query>  |  /vault read <id>  |  /vault save  |  /vault status", "/vault ara <sorgu>  |  /vault oku <id>  |  /vault kaydettir  |  /vault durum"))}`);
    console.log(`  ${C.dim("file://" + dir + "/index.html")}\n`);
  },
}];
