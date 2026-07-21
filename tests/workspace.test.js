// tests/workspace.test.js — core/workspace.js için birim testleri
// Not: promptTrust() test edilmez (stdin bağımlı, interactive)
"use strict";

const { test, describe, after } = require("node:test");
const assert = require("node:assert");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-ws-"));
process.env.ORION_HOME = TMP;

// router cache temizle — config dosyası TMP'ye yazılsın
delete require.cache[require.resolve("../core/router.ts")];
const workspace = require("../core/workspace.ts");

const TEST_DIR = path.join(TMP, "test-project");
fs.mkdirSync(TEST_DIR, { recursive: true });

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe("workspace: güven kontrolü", () => {
  test("yeni dizin güvensizdir", () => {
    assert.strictEqual(workspace.isTrusted(TEST_DIR), false);
  });

  test("trustDir() sonrası isTrusted() true döner", () => {
    workspace.trustDir(TEST_DIR);
    assert.strictEqual(workspace.isTrusted(TEST_DIR), true);
  });

  test("güvenilir dizin config.json'a yazılır", () => {
    const configPath = path.join(TMP, ".orion", "config.json");
    assert.ok(fs.existsSync(configPath), "config.json oluşturulmuş olmalı");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    assert.ok(Array.isArray(config.trustedPaths), "trustedPaths bir dizi olmalı");
    assert.ok(
      config.trustedPaths.some(p => path.resolve(p) === path.resolve(TEST_DIR)),
      "TEST_DIR trustedPaths içinde olmalı"
    );
  });

  test("trustDir() aynı dizini iki kez eklemez", () => {
    const DIR2 = path.join(TMP, "test-project-2");
    fs.mkdirSync(DIR2, { recursive: true });
    workspace.trustDir(DIR2);
    workspace.trustDir(DIR2);
    const configPath = path.join(TMP, ".orion", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const count = config.trustedPaths.filter(p => path.resolve(p) === path.resolve(DIR2)).length;
    assert.strictEqual(count, 1, "aynı dizin sadece bir kez bulunmalı");
  });

  test("isTrusted() farklı dizin için false döner", () => {
    const otherDir = path.join(TMP, "other-project");
    assert.strictEqual(workspace.isTrusted(otherDir), false);
  });

  test("isTrusted() path normalization çalışır (trailing slash)", () => {
    const dirWithSlash = TEST_DIR + path.sep;
    assert.strictEqual(workspace.isTrusted(dirWithSlash), true);
  });
});
