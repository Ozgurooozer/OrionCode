"use strict";
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { test, describe, after } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-bcompat-"));
process.env.ORION_HOME = TMP;

// ── openai-compat.ts mock ─────────────────────────────────────────────────────
// nim.ts ve openrouter.ts sadece createProvider(config) çağırır.
// createProvider'ı mock'layarak config'in doğru aktarılıp aktarılmadığını test et.

const _oaCompatPath = require.resolve(path.join(__dirname, "..", "backends", "openai-compat.ts"));

let _lastProviderConfig = null;

function _makeFakeProvider(config) {
  _lastProviderConfig = config;
  return {
    _config:      config,
    isAvailable:  async () => false,        // API key yok — expected
    listModels:   async () => config.staticModels ?? [],
    chat:         async () => "",
    chatRich:     async () => ({ text: "", toolCalls: [] }),
    name:         config.name,
  };
}

require.cache[_oaCompatPath] = {
  id: _oaCompatPath, filename: _oaCompatPath, loaded: true,
  exports: { createProvider: _makeFakeProvider },
};

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── nim.ts ────────────────────────────────────────────────────────────────────

describe("backends/nim", () => {

  // Her test describe'dan önce modülü temizle (farklı config'ler test edilebilsin)
  let nim;
  before_block: {
    _lastProviderConfig = null;
    nim = require("../backends/nim.ts");
  }

  test("isAvailable işlevi var", () => {
    assert.ok(typeof nim.isAvailable === "function");
  });

  test("listModels işlevi var", () => {
    assert.ok(typeof nim.listModels === "function");
  });

  test("chatRich işlevi var", () => {
    assert.ok(typeof nim.chatRich === "function");
  });

  test("createProvider 'nim' adıyla çağrıldı", () => {
    assert.strictEqual(_lastProviderConfig?.name, "nim");
  });

  test("host integrate.api.nvidia.com", () => {
    assert.strictEqual(_lastProviderConfig?.host, "integrate.api.nvidia.com");
  });

  test("basePath /v1", () => {
    assert.strictEqual(_lastProviderConfig?.basePath, "/v1");
  });

  test("keyEnvs dizisi NGC_API_KEY içerir", () => {
    const envs = _lastProviderConfig?.keyEnvs ?? [];
    assert.ok(envs.includes("NGC_API_KEY"), "NGC_API_KEY olmalı");
  });

  test("keyEnvs dizisi NVIDIA_API_KEY içerir", () => {
    const envs = _lastProviderConfig?.keyEnvs ?? [];
    assert.ok(envs.includes("NVIDIA_API_KEY"), "NVIDIA_API_KEY olmalı");
  });

  test("staticModels dizisi 9 model içerir", () => {
    const models = _lastProviderConfig?.staticModels ?? [];
    assert.strictEqual(models.length, 9, "9 NVIDIA NIM modeli olmalı");
  });

  test("staticModels llama-3.1 modellerini içerir", () => {
    const models = _lastProviderConfig?.staticModels ?? [];
    assert.ok(models.some(m => m.includes("llama-3.1")), "llama-3.1 olmalı");
  });

  test("isAvailable() API key olmadan false döner", async () => {
    const result = await nim.isAvailable();
    assert.strictEqual(result, false);
  });

  test("listModels() staticModels döndürür (API key gereksiz)", async () => {
    const models = await nim.listModels();
    assert.ok(Array.isArray(models), "dizi döndürmeli");
    assert.ok(models.length > 0, "model listesi boş olmamalı");
  });

});

// ── openrouter.ts ─────────────────────────────────────────────────────────────

describe("backends/openrouter", () => {

  let openrouter;
  let _orConfig;

  // openrouter'ı yüklemeden önce mock config'i sıfırla
  test("modül yüklenir", () => {
    _lastProviderConfig = null;
    // Cache'i temizle çünkü aynı createProvider mock'u kullanıyoruz
    const _orPath = require.resolve(path.join(__dirname, "..", "backends", "openrouter.ts"));
    delete require.cache[_orPath];
    openrouter = require("../backends/openrouter.ts");
    _orConfig = _lastProviderConfig;
    assert.ok(openrouter !== null);
  });

  test("isAvailable işlevi var", () => {
    assert.ok(typeof openrouter.isAvailable === "function");
  });

  test("chatRich işlevi var", () => {
    assert.ok(typeof openrouter.chatRich === "function");
  });

  test("createProvider 'openrouter' adıyla çağrıldı", () => {
    assert.strictEqual(_orConfig?.name, "openrouter");
  });

  test("host openrouter.ai", () => {
    assert.strictEqual(_orConfig?.host, "openrouter.ai");
  });

  test("basePath /api/v1", () => {
    assert.strictEqual(_orConfig?.basePath, "/api/v1");
  });

  test("HTTP-Referer header var", () => {
    const headers = _orConfig?.headers ?? {};
    assert.ok(headers["HTTP-Referer"], "HTTP-Referer header olmalı");
  });

  test("X-Title header var", () => {
    const headers = _orConfig?.headers ?? {};
    assert.ok(headers["X-Title"], "X-Title header olmalı");
  });

  test("defaultModel openai/gpt-4o-mini", () => {
    assert.strictEqual(_orConfig?.defaultModel, "openai/gpt-4o-mini");
  });

  test("keyEnv OPENROUTER_API_KEY", () => {
    assert.strictEqual(_orConfig?.keyEnv, "OPENROUTER_API_KEY");
  });

  test("isAvailable() API key olmadan false döner", async () => {
    const result = await openrouter.isAvailable();
    assert.strictEqual(result, false);
  });

});
