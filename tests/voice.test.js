// tests/voice.test.js — voice skill birim testleri
"use strict";
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const os   = require("os");
const path = require("path");
const fs   = require("fs");

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "voice_test_"));
process.env.ORION_HOME = tmpHome;

// events.ts mock
const Module = require("module");
const _orig  = Module._load.bind(Module);
Module._load = function(req, parent, isMain) {
  if (req.endsWith("events.ts") || req.endsWith("events")) {
    return {
      emit: () => {},
      emitter: { on: () => {}, off: () => {}, setMaxListeners: () => {} },
      emitSilentCatch: () => {},
      EVENT_TYPES: {},
    };
  }
  return _orig(req, parent, isMain);
};

const voice = require("../core/agents/voice.ts");

describe("Voice Skill — manifest", () => {
  test("manifest alanları mevcut", () => {
    const m = voice.manifest;
    const required = ["name", "version", "cost_class", "vram_needed_gb", "triggers", "input_schema", "output_schema"];
    for (const f of required) {
      assert.ok(f in m, `manifest'te '${f}' eksik`);
    }
    assert.equal(m.name, "voice");
    assert.equal(m.cost_class, "single_shot");
    assert.ok(Array.isArray(m.triggers), "triggers dizi olmalı");
    assert.ok(m.triggers.length > 0, "en az 1 trigger");
  });

  test("DEFAULTS alanları mevcut", () => {
    const d = voice.DEFAULTS;
    assert.ok(typeof d.voice      === "string", "voice string");
    assert.ok(typeof d.outputDir  === "string", "outputDir string");
    assert.ok(typeof d.piperBin   === "string", "piperBin string");
    assert.ok(typeof d.timeoutMs  === "number", "timeoutMs number");
  });
});

describe("Voice Skill — graceful fail (Piper kurulu değilse)", () => {
  test("boş metin → graceful fail, exception yok", () => {
    let result;
    try { result = voice.run(""); }
    catch (e) { assert.fail(`exception fırlatmamalı: ${e.message}`); }
    assert.ok(result, "sonuç null olmamalı");
    assert.equal(result.success, false, "boş metin başarısız olmalı");
    assert.ok(result.error, "hata mesajı olmalı");
  });

  test("whitespace-only metin → graceful fail", () => {
    let result;
    try { result = voice.run("   \n\t  "); }
    catch (e) { assert.fail(`exception fırlatmamalı: ${e.message}`); }
    assert.equal(result.success, false);
  });

  test("Piper kurulu değilse graceful fail", () => {
    let result;
    try { result = voice.run("test metni", { voice: "piper_voice_test" }); }
    catch (e) { assert.fail(`exception fırlatmamalı: ${e.message}`); }
    // Piper kurulu değilse false, kuruluysa true olabilir
    assert.ok(typeof result.success === "boolean", "success boolean olmalı");
    if (!result.success) {
      assert.ok(result.error, "başarısızda hata mesajı olmalı");
    }
  });

  test("isPiperAvailable sahte bin ile false döner", () => {
    const avail = voice.isPiperAvailable("__no_such_bin_orion__");
    assert.equal(avail, false, "sahte binary için false bekleniyor");
  });
});

describe("Voice Skill — event yayımı", () => {
  test("run() exception fırlatmaz (Piper yokken)", () => {
    assert.doesNotThrow(() => {
      voice.run("Orion sesleniyor", { voice: "tr" });
    });
  });
});

process.on("exit", () => {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  Module._load = _orig;
});
