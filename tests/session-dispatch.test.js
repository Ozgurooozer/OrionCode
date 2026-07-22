"use strict";
const path  = require("path");
const os    = require("os");
const fs    = require("fs");
const { test, describe, after } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-dispatch-"));
process.env.ORION_HOME = TMP;

fs.writeFileSync(path.join(TMP, "config.json"), JSON.stringify({
  tier2Backend: "openai",
  tier2Model:   "gpt-4o-mini",
  tier1Model:   "qwen2.5:7b",
}));

// ── Mock enjeksiyonları (session-dispatch require() öncesinde) ────────────────

// tui/output.ts — print.warn çıktısını bastır
const _outputPath = require.resolve(path.join(__dirname, "..", "tui", "output.ts"));
require.cache[_outputPath] = {
  id: _outputPath, filename: _outputPath, loaded: true,
  exports: { print: { warn: () => {}, error: () => {}, system: () => {}, info: () => {} } },
};

// thompson.ts — güncelleme çağrılarını kaydet
const _thompsonPath = require.resolve(path.join(__dirname, "..", "core", "thompson.ts"));
const _thompsonCalls = [];
require.cache[_thompsonPath] = {
  id: _thompsonPath, filename: _thompsonPath, loaded: true,
  exports: { update: (tier, reason, ok) => _thompsonCalls.push({ tier, reason, ok }) },
};

// router.ts — config'i sabit tut (paralel test çalışmasında cache karışmasın)
const _routerPath = require.resolve(path.join(__dirname, "..", "core", "router.ts"));
const _mockConfig = { tier2Backend: "openrouter", tier2Model: "openai/gpt-4o-mini", tier1Model: "qwen2.5:7b" };
require.cache[_routerPath] = {
  id: _routerPath, filename: _routerPath, loaded: true,
  exports: { loadConfig: () => _mockConfig },
};

// backends/index.ts — kontrol edilebilir provider registry
const _backendsPath = require.resolve(path.join(__dirname, "..", "backends", "index.ts"));
const _registry = {};
require.cache[_backendsPath] = {
  id: _backendsPath, filename: _backendsPath, loaded: true,
  exports: { get: (name) => _registry[name] ?? null },
};

// loops/openai.ts — varsayılan olarak başarılı
const _openaiLoopPath = require.resolve(path.join(__dirname, "..", "core", "loops", "openai.ts"));
let _openaiLoopFn = () => Promise.resolve("openai-ok");
require.cache[_openaiLoopPath] = {
  id: _openaiLoopPath, filename: _openaiLoopPath, loaded: true,
  exports: (session, provider) => _openaiLoopFn(session, provider),
};

// loops/anthropic.ts
const _anthropicLoopPath = require.resolve(path.join(__dirname, "..", "core", "loops", "anthropic.ts"));
let _anthropicLoopFn = () => Promise.resolve("anthropic-ok");
require.cache[_anthropicLoopPath] = {
  id: _anthropicLoopPath, filename: _anthropicLoopPath, loaded: true,
  exports: (session) => _anthropicLoopFn(session),
};

// loops/ollama.ts
const _ollamaLoopPath = require.resolve(path.join(__dirname, "..", "core", "loops", "ollama.ts"));
let _ollamaLoopFn = () => Promise.resolve("ollama-ok");
require.cache[_ollamaLoopPath] = {
  id: _ollamaLoopPath, filename: _ollamaLoopPath, loaded: true,
  exports: (session) => _ollamaLoopFn(session),
};

// ── Session-dispatch yükle ────────────────────────────────────────────────────

const sd = require("../core/session-dispatch.ts");

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function makeSession(backend = "anthropic", model = "claude-opus-4-8") {
  return {
    backend, model,
    _routedBackend:    null,
    _routedModel:      null,
    _usedFallback:     false,
    _lastRoute:        null,
    _lastUsedBackend:  null,
    _lastUsedModel:    null,
    telemetry: { record: () => {} },
  };
}

function makeProvider({ available = true, models = [], hasChatRich = true } = {}) {
  return {
    isAvailable: () => Promise.resolve(available),
    listModels:  () => Promise.resolve(models),
    ...(hasChatRich ? { chatRich: async () => ({ text: "response", toolCalls: [] }) } : {}),
  };
}

function clearRegistry() {
  Object.keys(_registry).forEach(k => delete _registry[k]);
}

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── _buildFallbackChain ───────────────────────────────────────────────────────

describe("_buildFallbackChain", () => {

  test("primary backend ilk sırada", () => {
    const session = makeSession("anthropic", "claude-opus-4-8");
    const chain = sd._buildFallbackChain(session);
    assert.strictEqual(chain[0].backend, "anthropic");
    assert.strictEqual(chain[0].model,   "claude-opus-4-8");
  });

  test("_routedBackend varsa primary'yi override eder", () => {
    const session = makeSession("anthropic");
    session._routedBackend = "ollama";
    session._routedModel   = "qwen2.5:7b";
    const chain = sd._buildFallbackChain(session);
    assert.strictEqual(chain[0].backend, "ollama");
  });

  test("primary backend fallback listesinde tekrar yer almaz", () => {
    const session = makeSession("openai");
    const chain = sd._buildFallbackChain(session);
    const backends = chain.map(s => s.backend);
    const openaiCount = backends.filter(b => b === "openai").length;
    assert.strictEqual(openaiCount, 1, "openai yalnızca bir kez görünmeli");
  });

  test("zincir en az 1 entry içerir", () => {
    const chain = sd._buildFallbackChain(makeSession());
    assert.ok(chain.length >= 1);
  });

  test("zincirdeki tüm entry'ler backend ve model içerir", () => {
    const chain = sd._buildFallbackChain(makeSession());
    for (const step of chain) {
      assert.ok(typeof step.backend === "string" && step.backend.length > 0, `backend eksik: ${JSON.stringify(step)}`);
      assert.ok(typeof step.model === "string" && step.model.length > 0, `model eksik: ${JSON.stringify(step)}`);
    }
  });

  test("tier2Backend=openrouter ve tier2Model=openai/gpt-4o-mini olunca zincirde aynı çift tekrar etmez", () => {
    // Mock config: tier2Backend=openrouter, tier2Model=openai/gpt-4o-mini (hardcoded fallback'le aynı)
    // Eski bug: ikisi de zincire giriyordu → aynı backend+model çifti iki kez deneniyor
    const session = makeSession("ollama", "qwen2.5:7b");
    const chain = sd._buildFallbackChain(session);
    const keys = chain.map(s => `${s.backend}::${s.model}`);
    const uniq = [...new Set(keys)];
    assert.deepStrictEqual(keys, uniq, "zincirde tekrarlayan backend+model çifti olmamalı");
  });

});

// ── _callWithFallback ─────────────────────────────────────────────────────────

describe("_callWithFallback", () => {

  test("kullanılabilir backend yoksa throw atar", async () => {
    clearRegistry();
    const session = makeSession();
    await assert.rejects(
      () => sd._callWithFallback(session),
      /kullanılabilir backend yok|no usable backend/i
    );
  });

  test("primary backend başarılıysa sonucu döndürür", async () => {
    clearRegistry();
    _registry["anthropic"] = makeProvider({ available: true });
    _anthropicLoopFn = () => Promise.resolve("merhaba");

    const session = makeSession("anthropic");
    const result = await sd._callWithFallback(session);
    assert.strictEqual(result, "merhaba");
  });

  test("primary başarısız, fallback başarılıysa sonucu döndürür", async () => {
    clearRegistry();
    // openrouter zincirde hardcoded — config bağımsız güvenilir
    _registry["anthropic"]  = makeProvider({ available: true });
    _registry["openrouter"] = makeProvider({ available: true, hasChatRich: true });
    _anthropicLoopFn = () => Promise.reject(new Error("anthropic down"));
    _openaiLoopFn    = () => Promise.resolve("fallback-ok");

    const session = makeSession("anthropic");
    const result = await sd._callWithFallback(session);
    assert.strictEqual(result, "fallback-ok");
    assert.ok(session._usedFallback, "_usedFallback true olmalı");
  });

  test("tüm backend'ler başarısız → son hatayı throw eder", async () => {
    clearRegistry();
    _registry["openai"] = makeProvider({ available: true });
    _openaiLoopFn = () => Promise.reject(new Error("openai down"));

    const session = makeSession("openai");
    session._lastRoute = { tier: "tier2", reason: "test" };

    await assert.rejects(
      () => sd._callWithFallback(session),
      /openai down/i
    );
  });

  test("son backend başarısız olunca Thompson güncellenir", async () => {
    clearRegistry();
    _thompsonCalls.length = 0;
    _registry["openai"] = makeProvider({ available: true });
    _openaiLoopFn = () => Promise.reject(new Error("openai down"));

    const session = makeSession("openai");
    session._lastRoute = { tier: "tier2", reason: "route-reason" };

    await assert.rejects(() => sd._callWithFallback(session));
    const found = _thompsonCalls.find(c => c.ok === false && c.tier === "tier2");
    assert.ok(found, "Thompson update(false) çağrılmalıydı");
  });

  test("isAvailable=false olan backend atlanır", async () => {
    clearRegistry();
    _registry["anthropic"]  = makeProvider({ available: false });
    _registry["openrouter"] = makeProvider({ available: true, hasChatRich: true });
    _openaiLoopFn = () => Promise.resolve("openrouter-ok");

    const session = makeSession("anthropic");
    const result = await sd._callWithFallback(session);
    assert.strictEqual(result, "openrouter-ok");
  });

  test("isAvailable throw ederse backend atlanır (catch → false)", async () => {
    clearRegistry();
    _registry["anthropic"] = {
      isAvailable: () => Promise.reject(new Error("connection refused")),
      listModels:  () => Promise.resolve([]),
    };
    _registry["openrouter"] = makeProvider({ available: true, hasChatRich: true });
    _openaiLoopFn = () => Promise.resolve("openrouter-ok");

    const session = makeSession("anthropic");
    const result = await sd._callWithFallback(session);
    assert.strictEqual(result, "openrouter-ok");
  });

});

// ── _dispatchLoop ──────────────────────────────────────────────────────────────

describe("_dispatchLoop", () => {

  test("session.backend ve model dispatch süresince değişir", async () => {
    clearRegistry();
    let capturedBackend, capturedModel;
    _anthropicLoopFn = (s) => {
      capturedBackend = s.backend;
      capturedModel   = s.model;
      return Promise.resolve("ok");
    };

    const session = makeSession("openai", "gpt-4");
    await sd._dispatchLoop(session, "anthropic", "claude-opus");
    assert.strictEqual(capturedBackend, "anthropic");
    assert.strictEqual(capturedModel,   "claude-opus");
  });

  test("dispatch bittikten sonra session.backend ve model geri yüklenir", async () => {
    clearRegistry();
    _anthropicLoopFn = () => Promise.resolve("ok");

    const session = makeSession("openai", "gpt-4");
    await sd._dispatchLoop(session, "anthropic", "claude-opus");
    assert.strictEqual(session.backend, "openai");
    assert.strictEqual(session.model,   "gpt-4");
  });

  test("dispatch başarısız olsa bile session.backend geri yüklenir (finally)", async () => {
    clearRegistry();
    _anthropicLoopFn = () => Promise.reject(new Error("loop failed"));

    const session = makeSession("openai", "gpt-4");
    await assert.rejects(() => sd._dispatchLoop(session, "anthropic", "claude-opus"));
    assert.strictEqual(session.backend, "openai", "backend finally'de geri dönmeli");
  });

  test("bilinmeyen backend → reject", async () => {
    clearRegistry();
    const session = makeSession();
    await assert.rejects(
      () => sd._dispatchLoop(session, "totally-unknown-xyz", "model"),
      /unknown backend|bilinmeyen backend/i
    );
  });

  test("chatRich'li provider → openai loop'a yönlendirilir", async () => {
    clearRegistry();
    let openaiCallCount = 0;
    _registry["openrouter"] = makeProvider({ available: true, hasChatRich: true });
    _openaiLoopFn = () => { openaiCallCount++; return Promise.resolve("openrouter-ok"); };

    const session = makeSession();
    await sd._dispatchLoop(session, "openrouter", "mistral-7b");
    assert.strictEqual(openaiCallCount, 1);
  });

  test("_lastUsedBackend ve _lastUsedModel güncellenir", async () => {
    clearRegistry();
    _anthropicLoopFn = () => Promise.resolve("ok");

    const session = makeSession();
    await sd._dispatchLoop(session, "anthropic", "claude-opus");
    assert.strictEqual(session._lastUsedBackend, "anthropic");
    assert.strictEqual(session._lastUsedModel,   "claude-opus");
  });

});
