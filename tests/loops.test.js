// tests/loops.test.js — core/loops/ modüllerinin birim testleri
"use strict";
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

// ── shared.js ──────────────────────────────────────────────────────────────
describe("loops/shared.js", () => {
  const shared = require("../core/loops/shared.js");

  test("sabitleri doğru ihraç eder", () => {
    assert.equal(shared.MAX_ITERS, 40);
    assert.equal(shared.TIER1_TOOLS.size, 12);
    assert.ok(shared.TIER1_TOOLS.has("read_file"));
    assert.ok(shared.TIER1_TOOLS.has("run_command"));
    assert.equal(shared.PARALLEL_SAFE.size, 18);
    assert.ok(shared.PARALLEL_SAFE.has("git_log"));
  });

  test("yardımcı fonksiyonlar export edilmiş", () => {
    const fns = ["_callToolCached", "_sweepSpeculexMisses", "_emitDiff", "_flattenMsgs", "_cleanResponse", "makeThinkFilter"];
    for (const fn of fns) {
      assert.equal(typeof shared[fn], "function", `${fn} bir fonksiyon olmalı`);
    }
  });

  test("_cleanResponse <think> ve <<<TOOL>>> bloklarını kaldırır", () => {
    const input = "yanıt<think>düşünce</think> ve <<<TOOL>>>{x}<<<END>>> son";
    const result = shared._cleanResponse(input);
    assert.ok(!result.includes("<think>"), "<think> kalmamalı");
    assert.ok(!result.includes("<<<TOOL>>>"), "<<<TOOL>>> kalmamalı");
    assert.ok(result.includes("yanıt"), "asıl içerik korunmalı");
  });

  test("makeThinkFilter <think> bloklarını filtreler", () => {
    const visible = [];
    const filter = shared.makeThinkFilter(out => visible.push(out));
    filter("merhaba");
    filter("<think>");
    filter("gizli");
    filter("</think>");
    filter("dünya");
    assert.ok(visible.includes("merhaba"), "'merhaba' görünür olmalı");
    assert.ok(!visible.join("").includes("gizli"), "gizli içerik görünmemeli");
    assert.ok(visible.join("").includes("dünya"), "'dünya' görünür olmalı");
  });

  test("makeThinkFilter bölünmüş tokenları doğru işler", () => {
    const visible = [];
    const filter = shared.makeThinkFilter(out => visible.push(out));
    // Tag birden fazla tokena bölünmüş
    filter("<thi");
    filter("nk>");
    filter("iç");
    filter("</thi");
    filter("nk>");
    filter("son");
    const out = visible.join("");
    assert.ok(!out.includes("iç"), "tag içi içerik görünmemeli");
    assert.ok(out.includes("son"), "'son' görünür olmalı");
  });

  test("_flattenMsgs Anthropic blok içerikli mesajları düzleştirir", () => {
    const msgs = [
      { role: "user", content: "merhaba" },
      { role: "assistant", content: [
        { type: "text", text: "cevap" },
        { type: "tool_use", name: "read_file" },
      ]},
    ];
    const flat = shared._flattenMsgs(msgs);
    assert.equal(flat[0].content, "merhaba");
    assert.equal(flat[1].role, "assistant");
    assert.ok(flat[1].content.includes("cevap"), "text içeriği korunmalı");
    assert.ok(flat[1].content.includes("[tool: read_file]"), "araç adı yer tutucuya dönüşmeli");
  });
});

// ── loop fonksiyonları ─────────────────────────────────────────────────────
describe("loop modülleri", () => {
  test("anthropic.js async fonksiyon export eder", () => {
    const fn = require("../core/loops/anthropic.js");
    assert.equal(typeof fn, "function");
    // AsyncFunction kontrolü
    assert.ok(fn.constructor.name === "AsyncFunction" || fn.toString().includes("async"), "async fonksiyon olmalı");
  });

  test("openai.js async fonksiyon export eder", () => {
    const fn = require("../core/loops/openai.js");
    assert.equal(typeof fn, "function");
  });

  test("ollama.js async fonksiyon export eder", () => {
    const fn = require("../core/loops/ollama.js");
    assert.equal(typeof fn, "function");
  });

  test("ollama_react.js async fonksiyon export eder", () => {
    const fn = require("../core/loops/ollama_react.js");
    assert.equal(typeof fn, "function");
  });
});

// ── session.js entegrasyonu ────────────────────────────────────────────────
describe("session.js ↔ loops entegrasyonu", () => {
  test("session.js hâlâ _callToolCached ve _sweepSpeculexMisses export eder (testler için)", () => {
    const { _callToolCached, _sweepSpeculexMisses } = require("../core/session.js");
    assert.equal(typeof _callToolCached, "function");
    assert.equal(typeof _sweepSpeculexMisses, "function");
  });

  test("Session örneği 4 loop metodunu fonksiyon olarak açar", () => {
    const { Session } = require("../core/session.js");
    const s = new Session({ backend: "anthropic", model: "test" });
    assert.equal(typeof s._anthropicLoop, "function");
    assert.equal(typeof s._openaiFamilyLoop, "function");
    assert.equal(typeof s._ollamaLoop, "function");
    assert.equal(typeof s._ollamaReactLoop, "function");
  });

  test("shared.js'den ihraç edilen _callToolCached session.js'deki ile aynı referans", () => {
    const { _callToolCached: fromSession } = require("../core/session.js");
    const { _callToolCached: fromShared }  = require("../core/loops/shared.js");
    assert.strictEqual(fromSession, fromShared, "aynı fonksiyon referansı olmalı");
  });
});
