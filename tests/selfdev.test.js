// tests/selfdev.test.js — Self-dev modu (core/selfdev.js) + komut reload
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert");

test("selfdev: buildSelfDevSuffix kaynak kökü ve akışı içerir", () => {
  const selfdev = require("../core/selfdev.js");
  const i18n = require("../core/i18n.js");
  const s = selfdev.buildSelfDevSuffix(i18n);
  assert.ok(s.includes(selfdev.ROOT), "kaynak kök yolu geçmeli");
  assert.ok(/SELF-DEV/.test(s));
  assert.ok(/credentials\.json/.test(s), "credentials koruması belirtilmeli");
});

test("komut kayıt defteri: reload() modülleri yeniden yükler, dispatch çalışır durumda kalır", () => {
  const commands = require("../core/commands/index.js");
  const before = commands.all().length;
  assert.ok(before > 10, "başlangıçta komutlar kayıtlı olmalı");
  const n = commands.reload();
  assert.ok(n > 10, `reload dosya saymalı (${n})`);
  const after = commands.all().length;
  assert.strictEqual(after, before, "reload sonrası komut sayısı değişmemeli");
});

test("yeni komutlar kayıtlı: /account /selfdev /import", () => {
  const commands = require("../core/commands/index.js");
  const names = new Set(commands.all().map(c => c.name));
  for (const n of ["account", "selfdev", "import"]) {
    assert.ok(names.has(n), `/${n} kayıtlı olmalı`);
  }
});

test("selfdev: runTests fonksiyonu var (çalıştırılmaz — özyineleme olur)", () => {
  const selfdev = require("../core/selfdev.js");
  assert.strictEqual(typeof selfdev.runTests, "function");
  assert.strictEqual(typeof selfdev.restart, "function");
  assert.strictEqual(typeof selfdev.reloadCommands, "function");
});
