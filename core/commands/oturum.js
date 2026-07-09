// core/commands/oturum.js — Session management
"use strict";
const { C, print } = require("../../tui/index.js");
const persist = require("../persist.js");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "sessions",
    aliases: ["oturumlar", "ls"],
    group:   "Session",
    desc:    "List saved sessions",
    usage:   "/sessions",
    exec: async () => {
      const list = persist.list();
      if (!list.length) { print.info(i18n.t("No saved sessions.", "Kayıtlı oturum yok.")); return; }
      const tag = i18n.locTag();
      console.log("");
      for (const s of list) {
        const date = s.updatedAt ? new Date(s.updatedAt).toLocaleString(tag) : "?";
        const msgs = i18n.t(`${s.msgCount ?? 0} msg`, `${s.msgCount ?? 0} mesaj`);
        console.log(
          `  ${C.cyan(s.id)}  ${C.dim((s.backend ?? "?").padEnd(12))} ${C.gray(s.model ?? "?")}  ${C.dim(msgs)}  ${C.gray(date)}`
        );
        if (s.preview) console.log(`       ${C.gray(s.preview.slice(0, 60))}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/load <id>  →  load  |  /delete <id>  →  delete", "/yukle <id>  →  yükle  |  /sil <id>  →  sil"))}\n`);
    },
  },
  {
    name:    "load",
    aliases: ["yukle"],
    group:   "Session",
    desc:    "Load a session",
    usage:   "/load <id>",
    exec: async ({ args, session }) => {
      const id = args[0];
      if (!id) { print.error(i18n.t("Usage: /load <session-id>", "Kullanım: /yukle <session-id>")); return; }
      const data = persist.load(id);
      if (!data) { print.error(i18n.t(`Not found: ${id}`, `Bulunamadı: ${id}`)); return; }
      session.loadFrom(data, id);
      print.system(i18n.t(`loaded: ${id}  (${data.messages?.length ?? 0} msg)`, `yüklendi: ${id}  (${data.messages?.length ?? 0} mesaj)`));
    },
  },
  {
    name:    "delete",
    aliases: ["sil", "del"],
    group:   "Session",
    desc:    "Delete a session",
    usage:   "/delete <id>",
    exec: async ({ args }) => {
      const id = args[0];
      if (!id) { print.error(i18n.t("Usage: /delete <session-id>", "Kullanım: /sil <session-id>")); return; }
      if (persist.del(id)) print.system(i18n.t(`deleted: ${id}`, `silindi: ${id}`));
      else                 print.error(i18n.t(`Not found: ${id}`, `Bulunamadı: ${id}`));
    },
  },
];
