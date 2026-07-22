// tests/router.test.js — ORION_HOME geçici dizinle izole config
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
process.env.ORION_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-test-"));

const { test } = require("node:test");
const assert = require("node:assert");
const router = require("../core/router.ts");

test("loadConfig: dosya yokken varsayılanlar döner", () => {
  const cfg = router.loadConfig();
  assert.strictEqual(cfg.budgetMode, "balanced");
  assert.ok(cfg.tier1Model);
});

test("decide: basit metin → tier1", () => {
  const r = router.decide("selam nasılsın", { tokenCount: 50, mode: "agent" });
  assert.strictEqual(r.tier, 1);
});

test("decide: karmaşık görev kelimeleri → tier2", () => {
  const r = router.decide("debug this bug and fix the test", { tokenCount: 50, mode: "agent" });
  assert.strictEqual(r.tier, 2);
});

test("decide: büyük bağlam → tier2", () => {
  const r = router.decide("selam", { tokenCount: 5000, mode: "agent" });
  assert.strictEqual(r.tier, 2);
});

test("decide: bütçe aşıldıysa → tier1", () => {
  const r = router.decide("debug fix bug test", {
    tokenCount: 5000, mode: "agent",
    budgetTracker: { isExceeded: () => true },
  });
  assert.strictEqual(r.tier, 1);
});

test("decide: quality modunda → tier2", () => {
  router.saveConfig({ budgetMode: "quality" });
  const r = router.decide("selam", { tokenCount: 10, mode: "chat" });
  assert.strictEqual(r.tier, 2);
  router.saveConfig({ budgetMode: "balanced" });
});

test("decide: tier1Backend config'i kullanılır — ollama hardcode değil", () => {
  router.saveConfig({ tier1Backend: "lmstudio" });
  const r = router.decide("selam", { tokenCount: 10, mode: "agent" });
  assert.strictEqual(r.tier, 1);
  assert.strictEqual(r.backend, "lmstudio", "tier1Backend config değeri dikkate alınmalı");
  router.saveConfig({ tier1Backend: "ollama" }); // geri al
});

test("decide: tier2Backend config'i kullanılır", () => {
  router.saveConfig({ tier2Backend: "openrouter", tier2Model: "meta-llama/llama-3.1-8b" });
  const r = router.decide("debug this complex bug fix test", { tokenCount: 10, mode: "agent" });
  assert.strictEqual(r.tier, 2);
  assert.strictEqual(r.backend, "openrouter");
  router.saveConfig({ tier2Backend: "anthropic", tier2Model: "claude-sonnet-4-6" }); // geri al
});
