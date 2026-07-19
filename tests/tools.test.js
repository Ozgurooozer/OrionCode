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

test("think: düşünce kaydedilir, yan etkisiz", async () => {
  const out = await tools.callTool("think", { thought: "Bu bir test düşüncesidir." });
  assert.ok(out.includes("düşünce kaydedildi"), `beklenen mesaj yok: ${out}`);
  assert.ok(out.includes("Bu bir test"), "düşünce içeriği döner");
});

test("think: boş düşünce hata mesajı döner", async () => {
  const out = await tools.callTool("think", { thought: "" });
  assert.ok(out.includes("boş"), `boş mesajı bekleniyor: ${out}`);
});

test("think: STATIC_DEFS'te tanımlı", () => {
  const def = tools.getDefs().find(d => d.name === "think");
  assert.ok(def, "think aracı tanımlı olmalı");
  assert.ok(def.input_schema.properties.thought, "thought parametresi var");
});

test("read_many_files: birden fazla dosyayı tek turda okur", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-rmf-"));
  process.env.ORION_WORKSPACE = tmpDir;
  fs.writeFileSync(path.join(tmpDir, "a.txt"), "dosya_a içeriği\n");
  fs.writeFileSync(path.join(tmpDir, "b.txt"), "dosya_b içeriği\n");
  const { execute } = require("../tools/fs.js");
  const out = execute("read_many_files", { paths: [path.join(tmpDir, "a.txt"), path.join(tmpDir, "b.txt")] });
  assert.ok(out.includes("dosya_a"), `a.txt içeriği: ${out}`);
  assert.ok(out.includes("dosya_b"), `b.txt içeriği: ${out}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
