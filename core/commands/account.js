// core/commands/account.js — Çoklu hesap/profil yönetimi (jcode /account karşılığı)
// Bir profil = adlandırılmış API anahtar seti. "work" ve "personal" gibi profiller
// arasında tek komutla geçilir. Mantık core/accounts.js'te.
"use strict";
const accounts = require("../accounts.js");
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.js");

function _mask(v) { return v.length <= 8 ? "····" : `${v.slice(0, 4)}····${v.slice(-4)}`; }

module.exports = [{
  name:    "account",
  aliases: ["hesap"],
  group:   "Model",
  desc:    "Manage named API key profiles and switch between them",
  usage:   "/account [save <name> | use <name> | remove <name>]",
  exec: async ({ args }) => {
    const data = accounts.load();
    const sub  = args[0]?.toLowerCase();

    if (sub === "save") {
      const name = args[1];
      if (!name) { print.warn(i18n.t("Usage: /account save <name>", "Kullanım: /account save <ad>")); return; }
      const snapshot = {};
      for (const env of accounts.knownKeyEnvs()) if (process.env[env]) snapshot[env] = process.env[env];
      if (!Object.keys(snapshot).length) {
        print.warn(i18n.t("No API keys set in this session — nothing to save.", "Bu oturumda ayarlı API anahtarı yok — kaydedilecek bir şey yok."));
        return;
      }
      data.profiles[name] = snapshot;
      data.active = name;
      accounts.save(data);
      print.system(i18n.t(
        `Profile "${name}" saved (${Object.keys(snapshot).length} key(s)) and activated.`,
        `"${name}" profili kaydedildi (${Object.keys(snapshot).length} anahtar) ve etkinleştirildi.`
      ));
      return;
    }

    if (sub === "use") {
      const name = args[1];
      if (!name || !data.profiles[name]) {
        print.warn(i18n.t(`Profile not found: ${name ?? "?"}`, `Profil bulunamadı: ${name ?? "?"}`));
        return;
      }
      // Önce bilinen tüm anahtarları temizle ki geçiş gerçek olsun
      for (const env of accounts.knownKeyEnvs()) delete process.env[env];
      for (const [env, val] of Object.entries(data.profiles[name])) process.env[env] = val;
      data.active = name;
      accounts.save(data);
      print.system(i18n.t(`Switched to profile "${name}".`, `"${name}" profiline geçildi.`));
      return;
    }

    if (sub === "remove" || sub === "rm") {
      const name = args[1];
      if (!name || !data.profiles[name]) {
        print.warn(i18n.t(`Profile not found: ${name ?? "?"}`, `Profil bulunamadı: ${name ?? "?"}`));
        return;
      }
      delete data.profiles[name];
      if (data.active === name) data.active = null;
      accounts.save(data);
      print.system(i18n.t(`Profile "${name}" removed.`, `"${name}" profili silindi.`));
      return;
    }

    // /account — listele
    const names = Object.keys(data.profiles);
    console.log("");
    if (!names.length) {
      print.info(i18n.t(
        "No profiles yet. Set keys via /provider, then: /account save <name>",
        "Henüz profil yok. /provider ile anahtarları gir, sonra: /account save <ad>"
      ));
    } else {
      for (const n of names) {
        const active = n === data.active ? C.green(" ◀ " + i18n.t("active", "aktif")) : "";
        const keys = Object.entries(data.profiles[n]).map(([e, v]) => `${e}=${_mask(v)}`).join(", ");
        console.log(`  ${C.cyan(n)}${active}\n    ${C.dim(keys)}`);
      }
    }
    console.log(`\n  ${C.dim(i18n.t("/account save <name> · /account use <name> · /account remove <name>", "/account save <ad> · /account use <ad> · /account remove <ad>"))}\n`);
  },
}];
