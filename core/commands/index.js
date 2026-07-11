// core/commands/index.js — Komut kayıt defteri ve dispatcher
"use strict";

const { print } = require("../../tui/index.js");
const i18n      = require("../i18n.js");
const REGISTRY  = new Map();

function register(cmds) {
  for (const cmd of [].concat(cmds)) {
    REGISTRY.set(cmd.name, cmd);
    for (const a of cmd.aliases ?? []) REGISTRY.set(a, cmd);
  }
}

[
  "./temel", "./model", "./mod", "./oturum", "./tree",
  "./hafiza", "./vault", "./router", "./budget", "./checkpoint",
  "./arac", "./ayar", "./mcp", "./saglayici", "./plugin", "./diff",
  "./language", "./stats", "./skill", "./weakness", "./yardim",
].forEach(m => register(require(m)));

async function dispatch(name, args, ctx) {
  const cmd = REGISTRY.get(name.toLowerCase());
  if (!cmd) {
    print.error(i18n.t(
      `Unknown command: /${name}  —  type /help to see commands`,
      `Bilinmeyen komut: /${name}  —  /yardim yazarak komutları gör`
    ));
    return;
  }
  try {
    await cmd.exec({ args, ...ctx });
  } catch (err) {
    print.error(`/${name}: ${err.message}`);
  }
}

function all() { return [...new Set(REGISTRY.values())]; }
module.exports = { dispatch, all, register };
