// tests/turnmemory.test.js — Oturum-içi turn belleği (core/turnmemory.js)
"use strict";
// Embed servisine gitmesin: ölü porta yönlendir (modül env'i require anında okur)
process.env.OLLAMA_PORT = "1";

const { test } = require("node:test");
const assert   = require("node:assert");
const { TurnMemory, buildRecallSuffix } = require("../core/turnmemory.ts");
const i18n = require("../core/i18n.ts");

test("TurnMemory: add kayıt ekler, boş metin eklemez", async () => {
  const tm = new TurnMemory();
  await tm.add("user", "merhaba dünya");
  await tm.add("user", "   ");
  assert.strictEqual(tm.size, 1);
});

test("TurnMemory: embedding yokken recall boş döner (çökmez)", async () => {
  const tm = new TurnMemory();
  for (let i = 0; i < 30; i++) await tm.add("user", `mesaj ${i}`);
  const hits = await tm.recall("mesaj", 2, 5);
  assert.deepStrictEqual(hits, []);
});

test("TurnMemory: recall vektörlü kayıtlarda cosine ile eşleşir (sahte vektör)", async () => {
  const tm = new TurnMemory();
  // 25 kayıt — skipRecent=20 sonrası ilk 5'i aday olur
  for (let i = 0; i < 25; i++) {
    tm.entries.push({ role: "user", text: `konu ${i}`, vector: null, ts: i });
  }
  tm.entries[2].vector = new Float32Array([1, 0, 0]);
  tm.entries[3].vector = new Float32Array([0, 1, 0]);

  // embed.embedText'i sorgu için sahtele
  const embed = require("../core/embed.ts");
  const orig = embed.embedText;
  embed.embedText = async () => new Float32Array([1, 0, 0]);
  try {
    const hits = await tm.recall("konu", 2, 20);
    assert.strictEqual(hits.length, 1, "sadece cosine > 0.5 olan dönmeli");
    assert.strictEqual(hits[0].text, "konu 2");
  } finally {
    embed.embedText = orig;
  }
});

test("buildRecallSuffix: boşta boş string, doluda başlık + içerik", () => {
  assert.strictEqual(buildRecallSuffix([], i18n), "");
  const s = buildRecallSuffix([{ role: "user", text: "eski turn", score: 0.9 }], i18n);
  assert.ok(s.includes("eski turn"));
  assert.ok(/Bu Oturumda Daha Önce|Earlier In This Session/.test(s));
});

test("TurnMemory: kayıt sayısı 500 ile sınırlı", async () => {
  const tm = new TurnMemory();
  for (let i = 0; i < 520; i++) {
    tm.entries.push({ role: "user", text: `m${i}`, vector: null, ts: i });
    if (tm.entries.length > 500) tm.entries.shift();
  }
  assert.strictEqual(tm.size, 500);
});
