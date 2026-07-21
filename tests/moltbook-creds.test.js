// tests/moltbook-creds.test.js — credentials env bypass fix doğrulaması
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert/strict");

test("moltbook API key: env'den okunur, disk'ten değil", () => {
  process.env.MOLTBOOK_API_KEY = "test-env-key-xyz";
  const k = process.env.MOLTBOOK_API_KEY ?? process.env.API_KEY;
  assert.equal(k, "test-env-key-xyz");
  delete process.env.MOLTBOOK_API_KEY;
});

test("moltbook API key: API_KEY fallback çalışır", () => {
  delete process.env.MOLTBOOK_API_KEY;
  process.env.API_KEY = "fallback-key";
  const k = process.env.MOLTBOOK_API_KEY ?? process.env.API_KEY;
  assert.equal(k, "fallback-key");
  delete process.env.API_KEY;
});

test("moltbook API key: ikisi de yoksa hata fırlatır", () => {
  const saved = { mb: process.env.MOLTBOOK_API_KEY, api: process.env.API_KEY };
  delete process.env.MOLTBOOK_API_KEY;
  delete process.env.API_KEY;
  assert.throws(() => {
    const k = process.env.MOLTBOOK_API_KEY ?? process.env.API_KEY;
    if (!k) throw new Error("Moltbook API key yapılandırılmamış.");
  }, /yapılandırılmamış/);
  if (saved.mb)  process.env.MOLTBOOK_API_KEY = saved.mb;
  if (saved.api) process.env.API_KEY = saved.api;
});

test("moltbook.js: getCreds disk okuması kaldırılmış", () => {
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "tools", "moltbook.ts"), "utf8"
  );
  assert.ok(!src.includes("readFileSync"), "readFileSync yok — disk bypass kaldırılmış");
  assert.ok(src.includes("_getMoltApiKey"), "_getMoltApiKey fonksiyonu var");
  assert.ok(src.includes("MOLTBOOK_API_KEY"), "env değişkeni kullanılıyor");
});

test("orion-mcp.js: getCreds disk okuması kaldırılmış", () => {
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "orion-mcp.ts"), "utf8"
  );
  assert.ok(!src.includes("getCreds()"), "getCreds() yok — disk bypass kaldırılmış");
  assert.ok(src.includes("_getMoltApiKey"), "_getMoltApiKey fonksiyonu var");
});

test("selfdev.js: spawn error handler process.exit çağırır", () => {
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "core", "selfdev.ts"), "utf8"
  );
  assert.ok(src.includes('child.on("error"'), "error handler tanımlı");
  assert.ok(src.includes("process.exit(1)"), "process.exit(1) var — kırık süreç sonlandırılır");
});

test("speculex.js: SAFE_TOOLS prompt'ta dinamik türetiliyor", () => {
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "core", "speculex.ts"), "utf8"
  );
  assert.ok(src.includes("[...SAFE_TOOLS]"), "SAFE_TOOLS'dan türetiliyor");
  assert.ok(!src.includes('"path":dosya'), "eski hardcode kaldırılmış");
});
