// core/plugins.js — Plugin manifest yükleyici
// ~/.orion/plugins/<ad>/orion-plugin.json ile kod değişikliği gerektirmeden
// üç yüzeyden genişletme: araçlar, komutlar, provider'lar.
//
// Manifest formatı:
// {
//   "name": "ornek",
//   "version": "1.0.0",
//   "description": "...",
//   "tools": "tools.js",        // {DEFS, execute} exportlayan modül (opsiyonel)
//   "commands": "commands.js",  // komut dizisi exportlayan modül (opsiyonel)
//   "providers": [{...spec}]    // openai-compat spec listesi (opsiyonel)
// }
"use strict";
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HOME = process.env.ORION_HOME || os.homedir(); // test için geçersiz kılınabilir
const DIR  = path.join(HOME, ".orion", "plugins");
const MANIFEST = "orion-plugin.json";

let _loaded = []; // [{name, version, description, tools, commands, providers, ok, error}]

function listDirs() {
  try {
    return fs.readdirSync(DIR, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(DIR, e.name))
      .filter(d => fs.existsSync(path.join(d, MANIFEST)));
  } catch { return []; }
}

function _loadOne(dir) {
  const info = { dir, name: path.basename(dir), version: "?", description: "",
                 tools: 0, commands: 0, providers: 0, ok: false, error: null };
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), "utf8"));
    info.name        = manifest.name ?? info.name;
    info.version     = manifest.version ?? "?";
    info.description = manifest.description ?? "";
    const source = `plugin:${info.name}`;

    if (manifest.tools) {
      const mod = require(path.resolve(dir, manifest.tools));
      if (!Array.isArray(mod.DEFS) || typeof mod.execute !== "function")
        throw new Error(`${manifest.tools}: DEFS dizisi ve execute fonksiyonu gerekli`);
      const tools = require("./tools.js");
      tools.registerDynamic(mod.DEFS, (n, i) => mod.execute(n, i), source);
      info.tools = mod.DEFS.length;
    }

    if (manifest.commands) {
      const cmds = require(path.resolve(dir, manifest.commands));
      const arr = [].concat(cmds).filter(c => c?.name && typeof c.exec === "function");
      if (arr.length) {
        const registry = require("./commands/index.js");
        registry.register(arr);
        info.commands = arr.length;
      }
    }

    if (Array.isArray(manifest.providers)) {
      const backends = require("../backends/index.js");
      const { createProvider } = require("../backends/openai-compat.js");
      for (const spec of manifest.providers) {
        if (!spec?.name || !spec?.host) continue;
        backends.registerProvider(createProvider(spec));
        info.providers++;
      }
    }

    info.ok = true;
  } catch (e) {
    info.error = e.message;
  }
  return info;
}

// Tüm plugin'leri yükle — hata bir plugin'i düşürür, diğerlerini etkilemez
function loadAll() {
  _loaded = listDirs().map(_loadOne);
  return _loaded;
}

function status() { return _loaded; }

module.exports = { loadAll, status, DIR, MANIFEST };
