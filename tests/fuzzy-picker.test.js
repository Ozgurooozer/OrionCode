// tests/fuzzy-picker.test.js — Yazarak-filtrele seçici (core/tui/fuzzy-picker.js)
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert");

test("fuzzyPicker: export edilmiş fonksiyon", () => {
  const { fuzzyPicker } = require("../tui/fuzzy-picker.js");
  assert.strictEqual(typeof fuzzyPicker, "function");
});

test("fuzzyPicker: non-TTY ortamında null resolve eder, stdout'a yazmaz", async () => {
  const { fuzzyPicker } = require("../tui/fuzzy-picker.js");
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  let result;
  try {
    result = await fuzzyPicker("Search model:", [
      { value: "a", label: "gpt-5-codex", hint: "openai" },
      { value: "b", label: "claude-opus-4.6", hint: "anthropic" },
    ]);
  } finally {
    process.stdout.write = orig;
  }
  assert.strictEqual(result, null, "non-TTY'de null dönmeli");
  assert.strictEqual(chunks.length, 0, "non-TTY'de stdout'a yazılmamalı");
});
