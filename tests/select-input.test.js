// tests/select-input.test.js — selectInput birim testleri
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: non-TTY'de null döner (isTTY=false) ──────────────────────────────
test("selectInput: non-TTY ortamında null döner", async () => {
  const { selectInput } = require("../tui/select-input.ts");
  // test ortamında isTTY false — selectInput hemen null resolve etmeli
  const result = await selectInput("Test?", [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ]);
  assert.strictEqual(result, null, "non-TTY'de null dönmeli");
});

// ── Test 2: export kontrolü ───────────────────────────────────────────────────
test("selectInput: doğru export edilmiş", () => {
  const mod = require("../tui/select-input.ts");
  assert.strictEqual(typeof mod.selectInput, "function", "selectInput export edilmeli");
});
