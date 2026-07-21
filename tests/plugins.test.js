// tests/plugins.test.js — manifest yükleyici, üç genişletme yüzeyi
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
process.env.ORION_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-test-"));

const { test } = require("node:test");
const assert = require("node:assert");
const plugins = require("../core/plugins.ts");
const tools   = require("../core/tools.ts");
const backends = require("../backends/index.ts");

function kur(name, manifest, files = {}) {
  const dir = path.join(plugins.DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, plugins.MANIFEST), JSON.stringify(manifest));
  for (const [f, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), content);
  return dir;
}

test("araç + komut + provider yüzeyi tek plugin'den yüklenir", async () => {
  kur("deneme", {
    name: "deneme", version: "1.0.0", description: "test plugin",
    tools: "tools.js", commands: "commands.js",
    providers: [{ name: "plugin-servis", host: "ornek.invalid", keyEnv: "ORION_YOK_KEY" }],
  }, {
    "tools.js": `module.exports = {
      DEFS: [{ name: "plugin_selam", description: "selam der", input_schema: { type: "object", properties: {} } }],
      execute: async () => "selam!",
    };`,
    "commands.js": `module.exports = [{ name: "denemekomut", desc: "test", exec: async () => {} }];`,
  });

  const results = plugins.loadAll();
  const p = results.find(r => r.name === "deneme");
  assert.ok(p, "plugin bulunmalı");
  assert.strictEqual(p.ok, true, p.error ?? "");
  assert.strictEqual(p.tools, 1);
  assert.strictEqual(p.commands, 1);
  assert.strictEqual(p.providers, 1);

  // araç registry'de ve çalışıyor
  assert.ok(tools.getDefs().some(d => d.name === "plugin_selam"));
  assert.strictEqual(await tools.callTool("plugin_selam", {}), "selam!");

  // provider backend listesinde
  assert.ok(backends.all().some(b => b.name === "plugin-servis"));

  // komut kayıtlı
  const commands = require("../core/commands/index.ts");
  assert.ok(commands.all().some(c => c.name === "denemekomut"));
});

test("bozuk plugin diğerlerini düşürmez", () => {
  kur("bozuk", { name: "bozuk", tools: "olmayan.js" });
  const results = plugins.loadAll();
  const bozuk  = results.find(r => r.name === "bozuk");
  const deneme = results.find(r => r.name === "deneme");
  assert.strictEqual(bozuk.ok, false);
  assert.ok(bozuk.error);
  assert.strictEqual(deneme.ok, true);
});
