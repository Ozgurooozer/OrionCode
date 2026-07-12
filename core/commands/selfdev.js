// core/commands/selfdev.js — /selfdev: Orion kendi kaynağını geliştirir
"use strict";
const selfdev = require("../selfdev.js");
const { C, print, spinner } = require("../../tui/index.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "selfdev",
  aliases: ["kendin"],
  group:   "Settings",
  desc:    "Self-dev mode: Orion edits, tests and reloads its own source",
  usage:   "/selfdev [on | off | test | reload | restart | status]",
  exec: async ({ args, session }) => {
    const sub = args[0]?.toLowerCase() ?? "status";

    if (sub === "on") {
      if (session._selfDev) { print.info(i18n.t("Self-dev already on.", "Self-dev zaten açık.")); return; }
      session._selfDev = true;
      session.system += selfdev.buildSelfDevSuffix(i18n);
      print.system(i18n.t(
        `self-dev ON — source root: ${selfdev.ROOT}. Flow: edit → test → approval → /selfdev reload|restart`,
        `self-dev AÇIK — kaynak kök: ${selfdev.ROOT}. Akış: düzenle → test → onay → /selfdev reload|restart`
      ));
      return;
    }

    if (sub === "off") {
      session._selfDev = false;
      // suffix system'in sonuna eklenmişti — sondan söküp at
      session.system = session.system
        .replace(/\n\n## SELF-DEV MODE ACTIVE[\s\S]*$/, "")
        .replace(/\n\n## SELF-DEV MODU AKTİF[\s\S]*$/, "");
      print.system(i18n.t("self-dev OFF", "self-dev KAPALI"));
      return;
    }

    if (sub === "test") {
      spinner.start(i18n.t("running tests", "testler çalışıyor"));
      const r = await selfdev.runTests();
      spinner.stop();
      console.log(`\n${r.tail}\n`);
      if (r.ok) print.system(i18n.t("tests passed ✓", "testler geçti ✓"));
      else      print.error(i18n.t(`tests FAILED (exit ${r.code})`, `testler BAŞARISIZ (çıkış ${r.code})`));
      return;
    }

    if (sub === "reload") {
      // Güvenlik: önce testler yeşil olmalı
      spinner.start(i18n.t("running tests before reload", "reload öncesi testler çalışıyor"));
      const r = await selfdev.runTests();
      spinner.stop();
      if (!r.ok) {
        print.error(i18n.t(`tests FAILED — reload cancelled\n${r.tail}`, `testler BAŞARISIZ — reload iptal\n${r.tail}`));
        return;
      }
      const n = selfdev.reloadCommands();
      print.system(i18n.t(`${n} command module(s) reloaded ✓ (deep changes need /selfdev restart)`, `${n} komut modülü yeniden yüklendi ✓ (derin değişiklikler için /selfdev restart)`));
      return;
    }

    if (sub === "restart") {
      spinner.start(i18n.t("running tests before restart", "restart öncesi testler çalışıyor"));
      const r = await selfdev.runTests();
      spinner.stop();
      if (!r.ok) {
        print.error(i18n.t(`tests FAILED — restart cancelled\n${r.tail}`, `testler BAŞARISIZ — restart iptal\n${r.tail}`));
        return;
      }
      print.system(i18n.t(`restarting — session ${session.id} will be resumed...`, `yeniden başlatılıyor — ${session.id} oturumu devralınacak...`));
      selfdev.restart(session);
      return;
    }

    // status
    const state = session._selfDev
      ? C.green(i18n.t("ON", "AÇIK"))
      : C.dim(i18n.t("off", "kapalı"));
    console.log(`\n  self-dev: ${state}   ${C.dim(selfdev.ROOT)}`);
    console.log(`  ${C.dim(i18n.t("/selfdev on · test · reload · restart", "/selfdev on · test · reload · restart"))}\n`);
  },
}];
