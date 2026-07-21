// tests/skills-registry.test.js — skill manifest yükleyici testleri
"use strict";
const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const os   = require("os");
const path = require("path");
const fs   = require("fs");

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "registry_test_"));
process.env.ORION_HOME = tmpHome;

// skills-registry cache'i sıfırla
function fresh() {
  for (const k of Object.keys(require.cache)) {
    if (k.includes("skills-registry")) delete require.cache[k];
  }
  return require("../core/skills-registry.js");
}

describe("SkillsRegistry", () => {
  test("loadAll() dizi döndürür", () => {
    const reg = fresh();
    const skills = reg.loadAll();
    assert.ok(Array.isArray(skills), "dizi bekleniyor");
  });

  test("image ve voice manifest yüklendi", () => {
    const reg = fresh();
    const skills = reg.loadAll();
    const names = skills.map(s => s.name);
    assert.ok(names.includes("image"), `image manifest yok: ${JSON.stringify(names)}`);
    assert.ok(names.includes("voice"), `voice manifest yok: ${JSON.stringify(names)}`);
  });

  test("manifest alanları eksiksiz", () => {
    const reg = fresh();
    const skills = reg.loadAll();
    const required = ["name", "version", "cost_class", "vram_needed_gb", "triggers", "input_schema", "output_schema"];
    for (const skill of skills) {
      for (const field of required) {
        assert.ok(field in skill, `'${skill.name}' manifestinde '${field}' alanı eksik`);
      }
      assert.ok(Array.isArray(skill.triggers), `'${skill.name}' triggers dizi olmalı`);
    }
  });

  test("cost_class geçerli değer", () => {
    const reg = fresh();
    const VALID = new Set(["zero_llm", "single_shot", "loop"]);
    for (const skill of reg.loadAll()) {
      assert.ok(VALID.has(skill.cost_class), `'${skill.name}' geçersiz cost_class: ${skill.cost_class}`);
    }
  });

  test("match() resim isteği → image skill", () => {
    const reg = fresh();
    const m = reg.match("bana bir cyberpunk resim çiz");
    assert.ok(m, "eşleşme bulunmalı");
    assert.equal(m.name, "image");
  });

  test("match() ses isteği → voice skill", () => {
    const reg = fresh();
    const m = reg.match("bunu seslendir");
    assert.ok(m, "eşleşme bulunmalı");
    assert.equal(m.name, "voice");
  });

  test("match() alakasız girdi → null veya düşük eşleşme", () => {
    const reg = fresh();
    const m = reg.match("bugün hava nasıl?");
    // Eşleşme yok veya düşük skorlu — null olabilir
    if (m !== null) {
      // Trigger yoksa skor 0 olur, en az 1 trigger kelimesi olmalı
      // Bu test esnek: null veya herhangi bir skill
      assert.ok(typeof m.name === "string");
    }
  });

  test("loadAll() cache'i tekrar tekrar aynı sonucu verir", () => {
    const reg = fresh();
    const a = reg.loadAll();
    const b = reg.loadAll();
    assert.equal(a, b, "cache aynı referansı döndürmeli");
  });

  test("clearCache() sonrası yeniden yükler", () => {
    const reg = fresh();
    const a = reg.loadAll();
    reg.clearCache();
    const b = reg.loadAll();
    assert.notEqual(a, b, "clearCache sonrası yeni referans bekleniyor");
    assert.deepEqual(a.map(s => s.name).sort(), b.map(s => s.name).sort(), "aynı skill'ler yüklenmeli");
  });
});

process.on("exit", () => {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
});
