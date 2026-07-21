// core/commands/mcp.js — MCP server management
// @ts-nocheck
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

module.exports = [{
  name:    "mcp",
  aliases: [],
  group:   "Tools",
  desc:    "Connect to MCP servers, use their tools",
  usage:   "/mcp [connect <name> | disconnect <name> | tools <name> | add <name> <cmd|url> | remove <name>]",
  exec: async ({ args }) => {
    const mcp = require("../mcp.ts");
    const sub = args[0]?.toLowerCase();

    if (sub === "baglan" || sub === "connect") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /mcp connect <server-name>", "Kullanım: /mcp baglan <sunucu-adı>")); return; }
      print.info(i18n.t(`Connecting to ${name}...`, `${name} sunucusuna bağlanılıyor...`));
      try {
        const conn = await mcp.connect(name);
        print.system(i18n.t(`mcp: ${name} connected — ${conn.tools.length} tools added`, `mcp: ${name} bağlı — ${conn.tools.length} araç eklendi`));
        conn.tools.forEach(t => console.log(`  ${C.cyan(t.name)}`));
      } catch (err) {
        print.error(i18n.t(`Connection error: ${err.message}`, `Bağlantı hatası: ${err.message}`));
      }
      return;
    }

    if (sub === "kes" || sub === "disconnect") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /mcp disconnect <server-name>", "Kullanım: /mcp kes <sunucu-adı>")); return; }
      const ok = await mcp.disconnect(name);
      print.system(ok
        ? i18n.t(`mcp: ${name} disconnected`, `mcp: ${name} bağlantısı kesildi`)
        : i18n.t(`${name} was not connected`, `${name} zaten bağlı değil`));
      return;
    }

    if (sub === "araclar" || sub === "tools") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /mcp tools <server-name>", "Kullanım: /mcp araclar <sunucu-adı>")); return; }
      const list = mcp.listTools(name);
      if (!list) { print.warn(i18n.t(`${name} not connected — run /mcp connect ${name} first`, `${name} bağlı değil — önce /mcp baglan ${name}`)); return; }
      console.log("");
      list.forEach(t => {
        console.log(`  ${C.cyan(t.name)}`);
        console.log(`    ${C.dim(t.description.slice(0, 90))}`);
      });
      console.log("");
      return;
    }

    if (sub === "ekle" || sub === "add") {
      const name = args[1];
      const target = args[2];
      if (!name || !target) {
        print.error(i18n.t(
          "Usage: /mcp add <name> <url>  or  /mcp add <name> <command> [arg...]",
          "Kullanım: /mcp ekle <ad> <url>  ya da  /mcp ekle <ad> <komut> [arg...]"
        ));
        return;
      }
      const spec = /^https?:\/\//.test(target)
        ? { url: target }
        : { command: target, args: args.slice(3) };
      mcp.addServer(name, spec);
      print.system(i18n.t(`mcp: ${name} added (mcp.json) — run /mcp connect ${name} to connect`, `mcp: ${name} eklendi (mcp.json) — bağlanmak için /mcp baglan ${name}`));
      return;
    }

    if (sub === "sil" || sub === "remove") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /mcp remove <server-name>", "Kullanım: /mcp sil <sunucu-adı>")); return; }
      await mcp.disconnect(name);
      const ok = mcp.removeServer(name);
      print.system(ok
        ? i18n.t(`mcp: ${name} removed`, `mcp: ${name} silindi`)
        : i18n.t(`${name} is not defined`, `${name} tanımlı değil`));
      return;
    }

    // /mcp — status list
    const servers = mcp.status();
    if (!servers.length) {
      print.info(i18n.t("No MCP servers defined.", "Tanımlı MCP sunucusu yok."));
      console.log(`  ${C.dim(i18n.t("/mcp add <name> <cmd|url>   →  define a server", "/mcp ekle <ad> <komut|url>   →  sunucu tanımla"))}`);
      console.log(`  ${C.dim(i18n.t('e.g.: /mcp add orion node orion-mcp.js', 'örn: /mcp ekle orion node orion-mcp.js'))}`);
      return;
    }
    console.log("");
    for (const s of servers) {
      const dot = s.connected ? C.green("●") : C.gray("○");
      const auto = s.auto ? C.dim(" [auto]") : "";
      const toolInfo = s.connected ? C.dim(i18n.t(` — ${s.tools} tools`, ` — ${s.tools} araç`)) : "";
      console.log(`  ${dot} ${C.cyan(s.name)}  ${C.dim(`(${s.type})`)} ${C.gray(s.target.slice(0, 60))}${toolInfo}${auto}`);
    }
    console.log(`\n  ${C.dim("/mcp connect <name>   /mcp tools <name>   /mcp disconnect <name>")}\n`);
  },
}];
