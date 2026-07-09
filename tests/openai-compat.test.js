// tests/openai-compat.test.js — BYOK fabrika ve araç şeması dönüşümü
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { createProvider, toOpenAITools } = require("../backends/openai-compat.js");

test("toOpenAITools: Anthropic şemasından OpenAI function formatına", () => {
  const defs = [{
    name: "oku",
    description: "dosya okur",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  }];
  const out = toOpenAITools(defs);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].type, "function");
  assert.strictEqual(out[0].function.name, "oku");
  assert.deepStrictEqual(out[0].function.parameters.required, ["path"]);
});

test("createProvider: beklenen arayüzü döner", () => {
  const p = createProvider({
    name: "test-servis", host: "ornek.invalid", basePath: "/v1",
    keyEnv: "ORION_TEST_YOK_KEY", defaultModel: "test-model",
  });
  assert.strictEqual(p.name, "test-servis");
  assert.strictEqual(typeof p.chat, "function");
  assert.strictEqual(typeof p.chatRich, "function");
  assert.strictEqual(typeof p.isAvailable, "function");
  assert.strictEqual(p.defaultModel, "test-model");
});

test("createProvider: anahtar yoksa isAvailable false", async () => {
  delete process.env.ORION_TEST_YOK_KEY;
  const p = createProvider({ name: "t", host: "x.invalid", keyEnv: "ORION_TEST_YOK_KEY" });
  assert.strictEqual(await p.isAvailable(), false);
});
