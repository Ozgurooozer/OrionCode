// tests/lmstudio.test.js — LM Studio backend (backends/lmstudio.js)
"use strict";
// Gerçek LM Studio çalışıyor olabilir — ölü porta yönlendir (modül env'i require anında okur)
process.env.LMSTUDIO_PORT = "1";

const { test } = require("node:test");
const assert   = require("node:assert");

test("lmstudio: provider şekli doğru (chatRich + listModels)", () => {
  const p = require("../backends/lmstudio.ts");
  assert.strictEqual(p.name, "lmstudio");
  assert.strictEqual(typeof p.chatRich, "function");
  assert.strictEqual(typeof p.listModels, "function");
  assert.strictEqual(typeof p.isAvailable, "function");
});

test("lmstudio: sunucu kapalıyken isAvailable false (anahtarsız-hep-true tuzağı yok)", async () => {
  const p = require("../backends/lmstudio.ts");
  assert.strictEqual(await p.isAvailable(), false);
});

test("lmstudio: BUILTIN listesinde ve OpenAI ailesinde", () => {
  const backends = require("../backends/index.ts");
  assert.ok(backends.ALL.some(p => p.name === "lmstudio"), "BUILTIN'de olmalı");
  assert.strictEqual(backends.isOpenAIFamily("lmstudio"), true);
});
