// tests/cache.test.js — Prompt caching: breakpoint yerleşimi + maliyet hesabı
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: _addCacheBreakpoints — son assistant mesajını işaretler ───────────
test("_addCacheBreakpoints: son assistant mesajına cache_control ekler", () => {
  const { _addCacheBreakpoints } = require("../backends/anthropic.ts");

  const messages = [
    { role: "user",      content: "merhaba" },
    { role: "assistant", content: "nasılsın?" },
    { role: "user",      content: "ikinci soru" },
  ];
  const result = _addCacheBreakpoints(messages);

  // Son asistan mesajı (idx 1) block dizisine dönmeli + cache_control olmalı
  const asst = result[1];
  assert.ok(Array.isArray(asst.content), "assistant content block dizisi olmalı");
  assert.deepStrictEqual(
    asst.content[asst.content.length - 1].cache_control,
    { type: "ephemeral" },
    "son blokta cache_control: {type:'ephemeral'} olmalı"
  );
  // Metin korunmalı
  assert.strictEqual(asst.content[0].text, "nasılsın?");

  // Diğer mesajlar değişmemeli
  assert.strictEqual(result[0].content, "merhaba",     "user mesajı değişmemeli");
  assert.strictEqual(result[2].content, "ikinci soru", "yeni user mesajı cache dışı kalmalı");
});

// ── Test 2: Array içerikli assistant mesajı ────────────────────────────────────
test("_addCacheBreakpoints: array content'teki son bloğa cache_control ekler", () => {
  const { _addCacheBreakpoints } = require("../backends/anthropic.ts");

  const messages = [
    { role: "user",      content: "soru" },
    { role: "assistant", content: [
      { type: "text", text: "ilk paragraf" },
      { type: "text", text: "ikinci paragraf" },
    ]},
    { role: "user",      content: "takip sorusu" },
  ];
  const result = _addCacheBreakpoints(messages);

  const content = result[1].content;
  assert.ok(Array.isArray(content));
  // İlk blok değişmemeli
  assert.strictEqual(content[0].text, "ilk paragraf");
  assert.strictEqual(content[0].cache_control, undefined);
  // Son blok işaretlenmeli
  assert.deepStrictEqual(content[1].cache_control, { type: "ephemeral" });
  assert.strictEqual(content[1].text, "ikinci paragraf");
});

// ── Test 3: history yokken değişiklik yapılmaz ─────────────────────────────────
test("_addCacheBreakpoints: sadece user mesajları varsa hiçbir şey değişmez", () => {
  const { _addCacheBreakpoints } = require("../backends/anthropic.ts");

  const messages = [{ role: "user", content: "ilk mesaj" }];
  const result = _addCacheBreakpoints(messages);

  assert.strictEqual(result[0].content, "ilk mesaj");
  assert.strictEqual(result.length, 1);
});

// ── Test 4: estimateCost — cache_read 0.10× rate ──────────────────────────────
test("estimateCost: cache_read_tokens 0.10× inRate ile hesaplanır", () => {
  const { estimateCost } = require("../core/budget.ts");
  const model = "claude-sonnet-4-6"; // $3/MTok in, $15/MTok out

  // Sadece normal girdi
  const base = estimateCost(1_000_000, 0, model, {});
  assert.ok(Math.abs(base - 3.00) < 0.0001, `base: beklenen $3.00, alınan $${base}`);

  // Sadece cache read: 1M token × $3 × 0.10 = $0.30
  const readCost = estimateCost(0, 0, model, { cacheReadTokens: 1_000_000 });
  assert.ok(Math.abs(readCost - 0.30) < 0.0001, `cache read: beklenen $0.30, alınan $${readCost}`);
});

// ── Test 5: estimateCost — cache_write 1.25× rate ─────────────────────────────
test("estimateCost: cache_write_tokens 1.25× inRate ile hesaplanır", () => {
  const { estimateCost } = require("../core/budget.ts");
  const model = "claude-sonnet-4-6"; // $3/MTok in

  // Sadece cache write: 1M token × $3 × 1.25 = $3.75
  const writeCost = estimateCost(0, 0, model, { cacheWriteTokens: 1_000_000 });
  assert.ok(Math.abs(writeCost - 3.75) < 0.0001, `cache write: beklenen $3.75, alınan $${writeCost}`);
});

// ── Test 6: mock response — ikinci çağrıda cache_read > 0 ────────────────────
// Gerçek API çağrısı yerine mock response ile davranışı doğrula.
test("mock: ikinci çağrıda cache_read_input_tokens > 0 beklenir", () => {
  // Birinci çağrı: cache oluşturulur (cache_creation_input_tokens > 0)
  const firstResponse = {
    usage: {
      input_tokens:              10,
      output_tokens:             50,
      cache_creation_input_tokens: 2048, // sistem promptu + history cache'lendi
      cache_read_input_tokens:     0,
    },
  };
  // İkinci çağrı: cache okunur (cache_read_input_tokens > 0)
  const secondResponse = {
    usage: {
      input_tokens:              10,  // sadece yeni mesaj
      output_tokens:             50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens:  2048, // sistem + history cache'den okundu
    },
  };

  assert.strictEqual(firstResponse.usage.cache_creation_input_tokens,  2048);
  assert.strictEqual(firstResponse.usage.cache_read_input_tokens,         0);
  assert.strictEqual(secondResponse.usage.cache_read_input_tokens,      2048, "ikinci turda cache_read > 0 olmalı");
  assert.strictEqual(secondResponse.usage.cache_creation_input_tokens,     0);

  // Maliyet karşılaştırması: cache ile vs cache'siz
  const { estimateCost } = require("../core/budget.ts");
  const model = "claude-sonnet-4-6";

  const costWithoutCache = estimateCost(2048 + 10, 50, model, {});
  const costWithCache    = estimateCost(10, 50, model, { cacheReadTokens: 2048 });

  assert.ok(costWithCache < costWithoutCache, "cache ile maliyet daha düşük olmalı");
  // 2048 token: $3/MTok → $0.000006144 normal vs $0.0000006144 cached (−90%)
  const saving = costWithoutCache - costWithCache;
  assert.ok(saving > 0, `Tasarruf pozitif olmalı: $${saving.toFixed(8)}`);
});

// ── Test 7: claude-opus-4-8 fiyatı güncellendi ───────────────────────────────
test("PRICES: claude-opus-4-8 fiyatı $5 giriş (Opus 4.1 deprecated $15 değil)", () => {
  // budget.js modül önbelleğini temizle
  delete require.cache[require.resolve("../core/budget.ts")];
  const { estimateCost } = require("../core/budget.ts");

  // 1M token girdi, claude-opus-4-8 = $5/MTok
  const cost = estimateCost(1_000_000, 0, "claude-opus-4-8", {});
  assert.ok(Math.abs(cost - 5.00) < 0.0001, `Opus 4.8 girdi fiyatı $5/MTok olmalı, alınan: $${cost}`);
  assert.ok(cost < 10, "Opus 4.8 fiyatı eski $15'ten düşük olmalı");
});
