// core/commands/session.js — Session management
"use strict";
const { C, T }  = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const persist = require("../persist.js");
const i18n = require("../i18n.js");

const RESET = "\x1b[0m";

module.exports = [
  {
    name:    "gecmis",
    aliases: ["history", "geçmiş"],
    group:   "Session",
    desc:    "Mevcut sohbetin konuşma geçmişini göster",
    usage:   "/gecmis",
    exec: async ({ session }) => {
      const msgs = session.msgs ?? [];
      const visible = msgs.filter(m => {
        if (m.role === "system") return false;
        const c = m.content;
        if (typeof c === "string") return c.trim().length > 0;
        if (Array.isArray(c)) return c.some(b => b.type === "text" && b.text?.trim());
        return false;
      });
      if (!visible.length) {
        print.info(i18n.t("No messages yet in this session.", "Bu oturumda henüz mesaj yok."));
        return;
      }
      console.log("");
      for (const m of visible) {
        const isUser = m.role === "user";
        const label  = isUser ? `${T.belt}sen${RESET}` : `${T.star}orion${RESET}`;
        let text = "";
        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = m.content.filter(b => b.type === "text").map(b => b.text).join(" ");
        }
        text = text.replace(/\s+/g, " ").trim().slice(0, 120);
        if (!text) continue;
        console.log(`  ${label}  ${isUser ? C.dim(text) : C.dim(text)}`);
      }
      console.log(`\n  ${C.dim(`${visible.length} mesaj · /load <id> ile geçmiş oturumu yükle`)}\n`);
    },
  },
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
