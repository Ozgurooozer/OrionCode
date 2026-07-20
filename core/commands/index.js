// core/commands/index.js — Komut kayıt defteri ve dispatcher
// Komut modülleri bu dizinden otomatik keşfedilir (index.js hariç tüm .js).
// reload(): self-dev modu için — dosyalar cache'ten düşürülüp yeniden yüklenir.
"use strict";

const fs   = require("fs");
const path = require("path");
const { print } = require("../../tui/output.ts");
const i18n      = require("../i18n.js");
const REGISTRY  = new Map();

function register(cmds) {
  for (const cmd of [].concat(cmds)) {
    REGISTRY.set(cmd.name, cmd);
    for (const a of cmd.aliases ?? []) REGISTRY.set(a, cmd);
  }
}

function _commandFiles() {
  return fs.readdirSync(__dirname)
    .filter(f => f.endsWith(".js") && f !== "index.js")
    .map(f => path.join(__dirname, f));
}

function loadAll() {
  for (const file of _commandFiles()) {
    try { register(require(file)); }
    catch (e) { print.error(`komut yüklenemedi: ${path.basename(file)} — ${e.message}`); }
  }
}
loadAll();

// Self-dev: komut modüllerini cache'ten düşür, yeniden tara ve kaydet.
// Yeni eklenen komut dosyaları da bu noktada devreye girer.
function reload() {
  const files = _commandFiles();
  for (const file of files) {
    try { delete require.cache[require.resolve(file)]; } catch {}
  }
  REGISTRY.clear();
  loadAll();
  return files.length;
}

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
module.exports = { dispatch, all, register, reload };
