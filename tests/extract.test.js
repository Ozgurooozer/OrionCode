// tests/extract.test.js — extraction kök-neden düzeltmeleri:
// 1) model fallback embedding modellerini eler (nomic-embed-text chat yapamaz)
// 2) <think> blokları JSON.parse'tan önce temizlenir (thinking modelleri)
"use strict";

// router.js HOME'u require anında okur — gerçek ~/.orion/config.json'a bağımlı
// kalmamak için extract.js require edilmeden ÖNCE boş bir dizine yönlendir.
process.env.ORION_HOME = require("os").tmpdir() + "\\orion-extract-test-" + process.pid;

const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { extractWithOllama, stripThinking } = require("../core/extract.ts");

// Sahte Ollama: /api/tags listesinin İLK modeli embedding (hatayı yeniden üreten
// sıralama) — doğru davranış onu atlayıp chat yapabilen modele düşmek.
const TAGS = {
  models: [
    { name: "nomic-embed-text:latest", details: { family: "nomic-bert", families: ["nomic-bert"] } },
    { name: "vibethinker:latest",      details: { family: "qwen2",      families: ["qwen2"] } },
  ],
};

const CHAT_CONTENT =
  "<think>\nKullanıcı JSON istiyor, alanları dolduralım.\n</think>\n" +
  '{"summary":"EventEmitter dinleyici sınırı tartışıldı","decisions":["setMaxListeners dikkatli kullanılmalı"],' +
  '"codePatterns":[],"bugsFixes":[],"concepts":["EventEmitter"],"tags":["nodejs"]}';

let chatModels = []; // /api/chat'e hangi modellerle istek atıldı
const origFetch = global.fetch;

before(() => {
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("/api/tags")) return { ok: true, json: async () => TAGS };
    if (u.includes("/api/chat")) {
      const body = JSON.parse(opts.body);
      chatModels.push(body.model);
      return { ok: true, json: async () => ({ message: { content: CHAT_CONTENT } }) };
    }
    throw new Error(`beklenmeyen fetch: ${u}`);
  };
});

after(() => { global.fetch = origFetch; });

test("extractWithOllama: <think> bloklu yanıt gerçek özete parse edilir (manuel yedek değil)", async () => {
  const result = await extractWithOllama("[user]: EventEmitter nedir?\n[assistant]: Olay yayıncısıdır.");
  assert.strictEqual(result.summary, "EventEmitter dinleyici sınırı tartışıldı", "gerçek özet dönmeli");
  assert.ok(!result.tags.includes("manuel"), "manuel yedeğe düşmemeli");
  assert.deepStrictEqual(result.concepts, ["EventEmitter"], "alanlar parse edilmiş olmalı");
});

test("resolveOllamaModel (dolaylı): fallback embedding modelini atlar, chat modelini seçer", () => {
  assert.ok(chatModels.length >= 1, "en az bir chat isteği atılmış olmalı");
  for (const m of chatModels) {
    assert.strictEqual(m, "vibethinker:latest", `embedding modeli seçilmemeli (seçilen: ${m})`);
  }
});

test("stripThinking: kapanmamış <think> bloğu da temizlenir", () => {
  assert.strictEqual(stripThinking("<think>yarım kalan akıl yürütme"), "");
  assert.strictEqual(stripThinking('<think>a</think>{"x":1}'), '{"x":1}');
});

test("stripThinking: <thinking> tag varyantı da temizlenir", () => {
  assert.strictEqual(stripThinking("<thinking>reasoning</thinking>json"), "json");
  assert.strictEqual(stripThinking("<thinking>kapanmamış"), "");
  assert.strictEqual(stripThinking('<thinking>a</thinking>{"x":1}'), '{"x":1}');
});
