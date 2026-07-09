// tests/tools.test.js — dinamik araç kaydı
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
process.env.ORION_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-test-"));

const { test } = require("node:test");
const assert = require("node:assert");
const tools = require("../core/tools.js");

const DEF = {
  name: "test_topla",
  description: "iki sayıyı toplar",
  input_schema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] },
};

test("registerDynamic: araç listeye girer ve çağrılır", async () => {
  tools.registerDynamic([DEF], async (_name, input) => String(input.a + input.b), "test");
  assert.ok(tools.getDefs().some(d => d.name === "test_topla"));
  const out = await tools.callTool("test_topla", { a: 17, b: 25 });
  assert.strictEqual(out, "42");
});

test("getDefs: _source dışarı sızmaz", () => {
  const def = tools.getDefs().find(d => d.name === "test_topla");
  assert.strictEqual(def._source, undefined);
});

test("registerDynamic: aynı isim eskisini değiştirir", async () => {
  tools.registerDynamic([DEF], async () => "yeni", "test2");
  const count = tools.getDefs().filter(d => d.name === "test_topla").length;
  assert.strictEqual(count, 1);
  assert.strictEqual(await tools.callTool("test_topla", { a: 1, b: 1 }), "yeni");
});

test("unregisterDynamic: kaynağa göre temizler", () => {
  tools.unregisterDynamic("test2");
  assert.ok(!tools.getDefs().some(d => d.name === "test_topla"));
});

test("callTool: bilinmeyen araç hata metni döner", async () => {
  const out = await tools.callTool("boyle_arac_yok", {});
  assert.match(out, /bulunamadı/i);
});

test("callTool: executor hatası yakalanır", async () => {
  tools.registerDynamic([DEF], async () => { throw new Error("patladı"); }, "test3");
  const out = await tools.callTool("test_topla", { a: 1, b: 2 });
  assert.match(out, /patladı/);
  tools.unregisterDynamic("test3");
});
