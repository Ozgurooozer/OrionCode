// @ts-nocheck
﻿// core/commands/moltbook.js — Moltbook skill toggle
// /moltbook on  → Moltbook araçlarını bu oturuma ekle
// /moltbook off → kaldır
// /moltbook     → mevcut durumu göster
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

module.exports = [{
  name:    "moltbook",
  aliases: ["mb"],
  group:   "Skills",
  desc:    "Enable or disable Moltbook tools for this session",
  usage:   "/moltbook [on|off]",
  exec: ({ args }) => {
    const tools = require("../tools.ts");
    const sub = (args[0] ?? "").toLowerCase();

    if (!sub) {
      const active = tools.isMoltbookActive();
      print.system(i18n.t(
        `Moltbook tools: ${active ? C.green("active") : C.dim("inactive")}  ·  /moltbook on|off`,
        `Moltbook araçları: ${active ? C.green("aktif") : C.dim("pasif")}  ·  /moltbook on|off`
      ));
      return;
    }

    if (sub === "on") {
      tools.registerMoltbook();
      print.system(i18n.t(
        "Moltbook tools active for this session: moltbook_feed, moltbook_status, moltbook_post",
        "Moltbook araçları bu oturum için aktif: moltbook_feed, moltbook_status, moltbook_post"
      ));
    } else if (sub === "off") {
      tools.unregisterMoltbook();
      print.system(i18n.t("Moltbook tools removed.", "Moltbook araçları kaldırıldı."));
    } else {
      print.warn(i18n.t("Usage: /moltbook [on|off]", "Kullanım: /moltbook [on|off]"));
    }
  },
}];
