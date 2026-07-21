// tests/budget.test.js
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { countTokens, countMessages, estimateCost, BudgetTracker } = require("../core/budget.ts");

test("countTokens: boş metin 0, dolu metin > 0", () => {
  assert.strictEqual(countTokens(""), 0);
  assert.ok(countTokens("merhaba dünya, bu bir test") > 0);
});

test("countMessages: sistem + mesaj overhead'i eklenir", () => {
  const n = countMessages([{ role: "user", content: "selam" }], "sistem");
  assert.ok(n > countTokens("selam"));
});

test("estimateCost: bilinen model fiyatlanır", () => {
  const cost = estimateCost(1_000_000, 0, "claude-sonnet-4-6");
  assert.ok(Math.abs(cost - 3.0) < 1e-9);
});

test("estimateCost: boş/bilinmeyen model bedava", () => {
  assert.strictEqual(estimateCost(1000, 1000, ""), 0);
  assert.strictEqual(estimateCost(1000, 1000, "qwen-coder:latest"), 0);
});

test("BudgetTracker: toplama ve limit aşımı", () => {
  const b = new BudgetTracker(0.5);
  assert.strictEqual(b.isExceeded(), false);
  b.add(100, 50, 0.3);
  b.add(100, 50, 0.3);
  assert.strictEqual(b.isExceeded(), true);
  const g = b.get();
  assert.strictEqual(g.turns, 2);
  assert.strictEqual(g.inputTokens, 200);
  assert.strictEqual(g.remaining, 0);
});
