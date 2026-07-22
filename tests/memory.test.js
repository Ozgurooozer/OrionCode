// tests/memory.test.js — core/memory.ts debounce + pending-state testleri
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-memory-test-"));
process.env.ORION_HOME = TMP;
fs.mkdirSync(path.join(TMP, ".orion"), { recursive: true });

const { test, after } = require("node:test");
const assert = require("node:assert");

// embed.ts mock — gerçek embedding gerekmez
const _embedPath = require.resolve(path.join(__dirname, "..", "core", "embed.ts"));
require.cache[_embedPath] = {
  id: _embedPath, filename: _embedPath, loaded: true,
  exports: {
    embedText:   async () => null,
    topK:        () => [],
    isAvailable: async () => false,
  },
};

const memory = require("../core/memory.ts");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── Debounce veri-kaybı regresyon testleri ────────────────────────────────────

test("arka arkaya iki add() — ikisi de list()'te görünür", async () => {
  const id1 = await memory.add({ category: "fact", content: "elma tercih edilir" });
  const id2 = await memory.add({ category: "fact", content: "muz sağlıklıdır" });

  assert.ok(id1, "birinci add id döndürmeli");
  assert.ok(id2, "ikinci add id döndürmeli");

  const all = memory.list();
  const contents = all.map(e => e.content);
  assert.ok(contents.includes("elma tercih edilir"), "birinci kayıt list()'te olmalı");
  assert.ok(contents.includes("muz sağlıklıdır"),    "ikinci kayıt list()'te olmalı");
});

test("add() + remove(id) — silinen kayıt list()'te görünmez, diğerleri kalır", async () => {
  const id1 = await memory.add({ category: "fact", content: "kalıcı kayıt" });
  const id2 = await memory.add({ category: "fact", content: "silinecek kayıt" });

  memory.remove(id2);

  const all = memory.list();
  const contents = all.map(e => e.content);
  assert.ok(contents.includes("kalıcı kayıt"),    "kalıcı kayıt hâlâ list()'te olmalı");
  assert.ok(!contents.includes("silinecek kayıt"), "silinmiş kayıt list()'te olmamalı");
});

test("add() + remove(başka_id) — bekleyen kayıt silinmemeli (TOCTOU)", async () => {
  const id1 = await memory.add({ category: "fact", content: "toctou-korumalı kayıt" });
  memory.remove("var-olmayan-id-xyz");

  const all = memory.list();
  const contents = all.map(e => e.content);
  assert.ok(contents.includes("toctou-korumalı kayıt"),
    "var-olmayan id silindiğinde bekleyen kayıt kaybolmamalı");
});

test("içerik tekrarı — aynı metin iki kez eklenemez (exact dedup)", async () => {
  const tekrar = "dedup-test-benzersiz-içerik-" + Date.now();
  const id1 = await memory.add({ category: "fact", content: tekrar });
  const id2 = await memory.add({ category: "fact", content: tekrar });

  assert.ok(id1, "ilk eklemede id döndürülmeli");
  assert.strictEqual(id2, null, "aynı içerik tekrar eklenince null dönmeli");

  const matches = memory.list().filter(e => e.content === tekrar);
  assert.strictEqual(matches.length, 1, "yalnızca bir kayıt olmalı");
});
