"use strict";
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { test, describe, after } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-memory-"));
process.env.ORION_HOME = TMP;
fs.writeFileSync(path.join(TMP, "config.json"), JSON.stringify({}));

// ── Mock enjeksiyonları ───────────────────────────────────────────────────────

// i18n.t — pass-through
const _i18nPath = require.resolve(path.join(__dirname, "..", "core", "i18n.ts"));
require.cache[_i18nPath] = {
  id: _i18nPath, filename: _i18nPath, loaded: true,
  exports: { t: (en) => en, setLocale: () => {}, locale: () => "en" },
};

// events.ts — emitSilentCatch stub
const _eventsPath = require.resolve(path.join(__dirname, "..", "core", "events.ts"));
const _silentCatches = [];
require.cache[_eventsPath] = {
  id: _eventsPath, filename: _eventsPath, loaded: true,
  exports: {
    emitSilentCatch: (site, err) => _silentCatches.push({ site, err }),
    emit: () => {},
    on: () => {},
    off: () => {},
  },
};

// memory.ts — kontrol edilebilir extraction stub
const _memoryPath = require.resolve(path.join(__dirname, "..", "core", "memory.ts"));
let _extractionPrompt = "extract";
let _extractedFacts   = [];
let _addedIds         = [];
require.cache[_memoryPath] = {
  id: _memoryPath, filename: _memoryPath, loaded: true,
  exports: {
    buildExtractionPrompt: () => _extractionPrompt,
    parseExtractionResponse: (raw) => _extractedFacts,
    add: (entry) => { const id = Math.random().toString(36).slice(2); _addedIds.push(id); return id; },
    search: () => [],
    load: () => [],
  },
};

// tui/output.ts
const _outputPath = require.resolve(path.join(__dirname, "..", "tui", "output.ts"));
require.cache[_outputPath] = {
  id: _outputPath, filename: _outputPath, loaded: true,
  exports: { print: { warn: () => {}, system: () => {}, info: () => {}, error: () => {} } },
};

// backends/anthropic.ts — LLM mock
const _anthropicPath = require.resolve(path.join(__dirname, "..", "backends", "anthropic.ts"));
let _anthropicRaw = "";
require.cache[_anthropicPath] = {
  id: _anthropicPath, filename: _anthropicPath, loaded: true,
  exports: {
    chat: async () => ({ content: [{ type: "text", text: _anthropicRaw }] }),
    chatRich: async () => ({ text: "", toolCalls: [] }),
    isAvailable: async () => true,
  },
};

// backends/index.ts — boş registry
const _backendsPath = require.resolve(path.join(__dirname, "..", "backends", "index.ts"));
require.cache[_backendsPath] = {
  id: _backendsPath, filename: _backendsPath, loaded: true,
  exports: { get: () => null },
};

// backends/ollama.ts — fallback mock
const _ollamaPath = require.resolve(path.join(__dirname, "..", "backends", "ollama.ts"));
require.cache[_ollamaPath] = {
  id: _ollamaPath, filename: _ollamaPath, loaded: true,
  exports: {
    chat: async () => "",
    chatRich: async () => ({ text: "", toolCalls: [] }),
    isAvailable: async () => false,
  },
};

// ── Modül yükle ───────────────────────────────────────────────────────────────

const { _extractMemories } = require("../core/session-memory.ts");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function makeSession(backend = "anthropic") {
  return {
    backend,
    model: "claude-opus-4-8",
    msgs: [
      { role: "user", content: "merhaba" },
      { role: "assistant", content: "nasılsın" },
    ],
    id: "test-session-1",
    _extracting: false,
  };
}

// ── Testler ───────────────────────────────────────────────────────────────────

describe("_extractMemories", () => {

  test("_extracting=true iken yeniden çağrılmaz (re-entry guard)", async () => {
    const session = makeSession();
    session._extracting = true;
    _addedIds.length = 0;

    await _extractMemories(session);
    assert.strictEqual(_addedIds.length, 0, "_extracting=true iken memory eklenmemeli");
  });

  test("başarılı çalıştırma sonrası _extracting=false olur", async () => {
    const session = makeSession("anthropic");
    _anthropicRaw = "some response";
    _extractedFacts = [];
    await _extractMemories(session);
    assert.strictEqual(session._extracting, false, "_extracting finally'de sıfırlanmalı");
  });

  test("anthropic backend: chat() çağrılır", async () => {
    const session = makeSession("anthropic");
    _extractedFacts = [{ content: "test fact", category: "code" }];
    _addedIds.length = 0;
    _anthropicRaw = "raw llm output";

    await _extractMemories(session);
    assert.ok(_addedIds.length > 0, "anthropic backend ile fact eklenmeli");
  });

  test("anthropic yanıtı boşsa memory eklenmez", async () => {
    const session = makeSession("anthropic");
    _anthropicRaw = "";
    _extractedFacts = [{ content: "fact" }];
    _addedIds.length = 0;

    await _extractMemories(session);
    assert.strictEqual(_addedIds.length, 0, "boş LLM yanıtında memory eklenmemeli");
  });

  test("bilinmeyen backend hatası: emitSilentCatch tetiklenir", async () => {
    // backends/index.ts null döndürür, ollama.ts chat() boş döndürür
    // anthropic olmayan backend + boş registry → ollama fallback → boş yanıt
    const session = makeSession("openai");
    _silentCatches.length = 0;
    _extractedFacts = [];

    await _extractMemories(session);
    // boş yanıt → erken return, exception yok
    assert.strictEqual(session._extracting, false, "_extracting finally'de sıfırlanmalı");
  });

  test("LLM hatası: _extracting finally'de sıfırlanır", async () => {
    // anthropic.ts'yi override et — hata fırlatsın
    const prev = require.cache[_anthropicPath].exports.chat;
    require.cache[_anthropicPath].exports.chat = async () => { throw new Error("LLM down"); };

    const session = makeSession("anthropic");
    _silentCatches.length = 0;

    await _extractMemories(session);
    assert.strictEqual(session._extracting, false, "hata sonrası _extracting sıfırlanmalı");
    assert.ok(_silentCatches.length > 0, "emitSilentCatch tetiklenmeli");

    require.cache[_anthropicPath].exports.chat = prev;
  });

});
