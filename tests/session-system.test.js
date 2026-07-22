"use strict";
const path  = require("path");
const fs    = require("fs");
const os    = require("os");
const { test, describe, after, before } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-sys-"));
process.env.ORION_HOME = TMP;

// ── Mock enjeksiyonları ───────────────────────────────────────────────────────

// i18n.t — her zaman TR metni döndür (ikinci argüman)
const _i18nPath = require.resolve(path.join(__dirname, "..", "core", "i18n.ts"));
require.cache[_i18nPath] = {
  id: _i18nPath, filename: _i18nPath, loaded: true,
  exports: { t: (_en, tr) => tr ?? _en, setLocale: () => {}, locale: () => "tr" },
};

// loops/shared.ts — sadece TIER1_TOOLS gerekli
const _sharedPath = require.resolve(path.join(__dirname, "..", "core", "loops", "shared.ts"));
require.cache[_sharedPath] = {
  id: _sharedPath, filename: _sharedPath, loaded: true,
  exports: { TIER1_TOOLS: ["read_file", "list_files", "search"], PARALLEL_SAFE: [] },
};

// ── Modül yükle ───────────────────────────────────────────────────────────────

const { buildSystem, _projectContext } = require("../core/session-system.ts");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── _projectContext ───────────────────────────────────────────────────────────

describe("_projectContext", () => {

  test("boş dizin → boş string döner", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    const result = _projectContext(dir);
    assert.strictEqual(result, "");
    fs.rmSync(dir, { recursive: true });
  });

  test("package.json varsa proje adını ve sürümü alır", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test-project",
      version: "1.2.3",
      scripts: { test: "node test", build: "node build" },
    }));
    const result = _projectContext(dir);
    assert.ok(result.includes("test-project"), "proje adı içermeli");
    assert.ok(result.includes("1.2.3"), "sürüm içermeli");
    fs.rmSync(dir, { recursive: true });
  });

  test("package.json scripts listesi alınır (maks 8)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    const scripts = {};
    for (let i = 0; i < 12; i++) scripts[`cmd${i}`] = `run ${i}`;
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x", scripts }));
    const result = _projectContext(dir);
    // scripts: satırı var mı
    assert.ok(result.includes("scripts:"), "scripts: satırı olmalı");
    // cmd8+ kesilmeli — 8 script sonrası kesilir
    assert.ok(!result.includes("cmd8"), "9. script alınmamalı");
    fs.rmSync(dir, { recursive: true });
  });

  test("go.mod varsa Go build bilgisi alınır", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    fs.writeFileSync(path.join(dir, "go.mod"), "module mymod\ngo 1.21\n");
    const result = _projectContext(dir);
    assert.ok(result.includes("Go"), "Go build bilgisi olmalı");
    fs.rmSync(dir, { recursive: true });
  });

  test("Cargo.toml varsa Rust build bilgisi alınır", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    fs.writeFileSync(path.join(dir, "Cargo.toml"), "[package]\nname = \"myapp\"\n");
    const result = _projectContext(dir);
    assert.ok(result.includes("Rust"), "Rust build bilgisi olmalı");
    fs.rmSync(dir, { recursive: true });
  });

  test("dizin listesi tree satırında görünür", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    fs.writeFileSync(path.join(dir, "main.ts"), "");
    fs.mkdirSync(path.join(dir, "src"));
    const result = _projectContext(dir);
    assert.ok(result.includes("tree:"), "tree: satırı olmalı");
    assert.ok(result.includes("main.ts") || result.includes("src/"), "dosyalar listelenmeli");
    fs.rmSync(dir, { recursive: true });
  });

  test("bozuk package.json sessizce yoksayılır", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prj-"));
    fs.writeFileSync(path.join(dir, "package.json"), "NOT JSON {{{{");
    assert.doesNotThrow(() => _projectContext(dir), "bozuk JSON exception atmamalı");
    fs.rmSync(dir, { recursive: true });
  });

});

// ── buildSystem ───────────────────────────────────────────────────────────────

describe("buildSystem", () => {

  test("string döner", () => {
    const result = buildSystem();
    assert.strictEqual(typeof result, "string");
    assert.ok(result.length > 50, "sistem promptu en az 50 karakter olmalı");
  });

  test("ORION_WORKSPACE yolunu içerir", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orion-ws-"));
    process.env.ORION_WORKSPACE = dir;
    const result = buildSystem();
    assert.ok(result.includes(dir), "workspace yolu sistem promptunda olmalı");
    delete process.env.ORION_WORKSPACE;
    fs.rmSync(dir, { recursive: true });
  });

  test("tier1=true daha kısa sistem promptu üretir", () => {
    const full   = buildSystem(false);
    const tier1  = buildSystem(true);
    // tier1 mode merak.md ve genişletilmiş araç kurallarını atlar
    assert.ok(tier1.length <= full.length, "tier1 prompt daha kısa veya eşit olmalı");
  });

  test("tier1=false araç kuralları içerir", () => {
    const result = buildSystem(false);
    // git araçları kurallar bölümünde olmalı
    assert.ok(result.includes("git_status") || result.includes("git_diff"), "git kural satırı olmalı");
  });

  test("tier1=true araç kurallarını atlar", () => {
    const result = buildSystem(true);
    // tier1'de genişletilmiş araç kuralı satırı olmamalı
    assert.ok(!result.includes("git_show"), "tier1 prompt git_show detaylarını içermemeli");
  });

  test("Kimlik bölümü içerir", () => {
    const result = buildSystem();
    assert.ok(
      result.includes("Orion Aethelred") || result.includes("orion_aethelred"),
      "kimlik bilgisi olmalı"
    );
  });

});
