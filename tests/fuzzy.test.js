// tests/fuzzy.test.js — jcode'dan taşınan typo-toleranslı fuzzy eşleştirici
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert");
const fuzzy    = require("../tui/fuzzy.ts");

test("fuzzyMatch: yaygın typo'lara tolerans gösterir", () => {
  assert.ok(fuzzy.fuzzyMatch("codxe", "gpt-5-codex"), "harf yer değiştirme tolere edilmeli");
  assert.ok(fuzzy.fuzzyMatch("opuz", "claude-opus-4.6"), "ikame tolere edilmeli");
  assert.ok(fuzzy.fuzzyMatch("tikcet", "ticket-workspace"), "devrik karakter tolere edilmeli");
  assert.ok(fuzzy.fuzzyMatch("coonfig", "config"), "fazladan karakter tolere edilmeli");
});

test("fuzzyScore: tam eşleşme >= önek eşleşmesi > typo eşleşmesi", () => {
  const exact  = fuzzy.fuzzyScore("codex", "codex");
  const prefix = fuzzy.fuzzyScore("codex", "codex-mini");
  const typo   = fuzzy.fuzzyScore("codxe", "codex");
  assert.ok(exact >= prefix, "tam eşleşme önekten düşük olmamalı");
  assert.ok(prefix > typo, "önek eşleşmesi typo'dan yüksek olmalı");
});

test("commandFuzzyMatch: baştaki / skora girmez, ilk harf sabitlenir", () => {
  const m = fuzzy.commandFuzzyMatch("/conifg", "/config");
  assert.strictEqual(m.positions[0], 1, "ilk eşleşme /'den sonraki ilk harfe sabitlenmeli");
  assert.strictEqual(fuzzy.commandFuzzyMatch("/g", "/config"), null, "tek harfli kısa sorgu eşleşmemeli");
});

test("fuzzyMatch: alakasız/çok kısa sorgular reddedilir", () => {
  assert.strictEqual(fuzzy.fuzzyMatch("xz", "config"), null);
  assert.strictEqual(fuzzy.fuzzyMatch("configuration", "model"), null);
});

test("fuzzyScoreTokens: tek kelimelik sorgu alanlar arasında dikiş atmaz", () => {
  assert.ok(fuzzy.fuzzyScoreTokens("codxe", "gpt-5-codex openai coding model") !== null, "kendi alanında eşleşmeli");
  assert.strictEqual(fuzzy.fuzzyScoreTokens("codxe", "claude-opus anthropic premium"), null, "alanlar arası dikiş atmamalı");
});

test("fuzzyMatchPositions: boş sorguda boş dizi, eşleşmede pozisyon döner", () => {
  assert.deepStrictEqual(fuzzy.fuzzyMatchPositions("", "model"), []);
  const pos = fuzzy.fuzzyMatchPositions("mdl", "model");
  assert.ok(pos.length > 0, "eşleşen pozisyonlar dönmeli");
});
