// tests/i18n.test.js — core/i18n.js için birim testleri
"use strict";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

// Her test için temiz ORION_HOME
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-i18n-"));
process.env.ORION_HOME = TMP;

// i18n module'ü require cache'ini silerek her test grubu için temiz yükle
function freshI18n(lang) {
  delete require.cache[require.resolve("../core/i18n.js")];
  delete require.cache[require.resolve("../core/router.ts")];
  if (lang) {
    process.env.ORION_LANG = lang;
  } else {
    delete process.env.ORION_LANG;
  }
  return require("../core/i18n.js");
}

describe("i18n: dil seçimi", () => {
  test("ORION_LANG=en → İngilizce döner", () => {
    const i18n = freshI18n("en");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Hello");
  });

  test("ORION_LANG=tr → Türkçe döner", () => {
    const i18n = freshI18n("tr");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Merhaba");
  });

  test("ORION_LANG=EN (büyük) → İngilizce döner (case insensitive)", () => {
    const i18n = freshI18n("EN");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Hello");
  });

  test("ORION_LANG=TR (büyük) → Türkçe döner (case insensitive)", () => {
    const i18n = freshI18n("TR");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Merhaba");
  });

  test("Tanımsız locale → İngilizce'ye düşer", () => {
    const i18n = freshI18n("xx");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Hello");
  });

  test("ORION_LANG yoksa → İngilizce varsayılan", () => {
    const i18n = freshI18n(null);
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Hello");
  });
});

describe("i18n: t() fonksiyonu", () => {
  test("tr argümanı yoksa en döner (her iki dilde)", () => {
    const i18n = freshI18n("en");
    assert.strictEqual(i18n.t("only english"), "only english");
  });

  test("tr argümanı olmayan string tr modunda da en döner", () => {
    const i18n = freshI18n("tr");
    assert.strictEqual(i18n.t("only english"), "only english");
  });

  test("boş string döndürür", () => {
    const i18n = freshI18n("en");
    assert.strictEqual(i18n.t("", ""), "");
  });
});

describe("i18n: setLocale ve getLocale", () => {
  test("setLocale('tr') → getLocale 'tr' döner", () => {
    const i18n = freshI18n("en");
    i18n.setLocale("tr");
    assert.strictEqual(i18n.getLocale(), "tr");
  });

  test("setLocale('en') → getLocale 'en' döner", () => {
    const i18n = freshI18n("tr");
    i18n.setLocale("en");
    assert.strictEqual(i18n.getLocale(), "en");
  });

  test("setLocale sonrası t() yeni locale'i kullanır", () => {
    const i18n = freshI18n("en");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Hello");
    i18n.setLocale("tr");
    assert.strictEqual(i18n.t("Hello", "Merhaba"), "Merhaba");
  });
});

describe("i18n: locTag", () => {
  test("en locale → 'en-US' döner", () => {
    const i18n = freshI18n("en");
    assert.strictEqual(i18n.locTag(), "en-US");
  });

  test("tr locale → 'tr-TR' döner", () => {
    const i18n = freshI18n("tr");
    assert.strictEqual(i18n.locTag(), "tr-TR");
  });
});
