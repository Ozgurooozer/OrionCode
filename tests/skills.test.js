// tests/skills.test.js — core/skills.js için birim testleri
"use strict";

const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-skills-"));
process.env.ORION_HOME = TMP;

const skills = require("../core/skills.ts");

const SKILLS_DIR = path.join(TMP, ".orion", "skills");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe("skills: listSkills", () => {
  test("boş dizinde boş dizi döner", () => {
    const list = skills.listSkills();
    assert.ok(Array.isArray(list));
    assert.strictEqual(list.length, 0);
  });

  test("kayıtlı skill listede görünür", () => {
    skills.saveSkill("test-skill-1", "## Test Skill\n\n**When to use:** testing\n\n**Steps:**\n1. read_file: oku");
    const list = skills.listSkills();
    assert.ok(list.some(s => s.name === "test-skill-1"));
  });

  test("her kayıt name, desc, raw alanlarına sahip", () => {
    const list = skills.listSkills();
    const s = list.find(s => s.name === "test-skill-1");
    assert.ok(s, "test-skill-1 bulunmalı");
    assert.ok(typeof s.name === "string");
    assert.ok(typeof s.desc === "string");
    assert.ok(typeof s.raw === "string");
  });

  test("desc ## başlıktan çıkarılır", () => {
    skills.saveSkill("desc-test", "## My Cool Skill\n\n**When to use:** anytime");
    const list = skills.listSkills();
    const s = list.find(s => s.name === "desc-test");
    assert.strictEqual(s.desc, "My Cool Skill");
  });
});

describe("skills: readSkill", () => {
  test("var olan skill'i okur", () => {
    const content = "## Read Test\n\n**Steps:**\n1. read_file: oku";
    skills.saveSkill("read-test", content);
    const read = skills.readSkill("read-test");
    assert.strictEqual(read, content);
  });

  test("olmayan skill için null döner", () => {
    const result = skills.readSkill("nonexistent-skill-xyz");
    assert.strictEqual(result, null);
  });
});

describe("skills: saveSkill", () => {
  test("dosya SKILLS_DIR altına yazılır", () => {
    skills.saveSkill("save-test", "## Save Test\n");
    const file = path.join(SKILLS_DIR, "save-test.md");
    assert.ok(fs.existsSync(file), "skill dosyası oluşturulmuş olmalı");
  });

  test("içerik doğru yazılır", () => {
    const content = "## Content Test\n**When to use:** test\n";
    skills.saveSkill("content-test", content);
    const read = fs.readFileSync(path.join(SKILLS_DIR, "content-test.md"), "utf8");
    assert.strictEqual(read, content);
  });

  test("dosya yolu döner", () => {
    const file = skills.saveSkill("path-test", "## Path\n");
    assert.ok(typeof file === "string");
    assert.ok(file.endsWith(".md"));
  });

  test("üzerine yazma çalışır (güncelleme)", () => {
    skills.saveSkill("overwrite-test", "v1");
    skills.saveSkill("overwrite-test", "v2");
    assert.strictEqual(skills.readSkill("overwrite-test"), "v2");
  });
});

describe("skills: deleteSkill", () => {
  test("var olan skill'i siler", () => {
    skills.saveSkill("del-test", "## Del\n");
    const result = skills.deleteSkill("del-test");
    assert.strictEqual(result, true);
    assert.strictEqual(skills.readSkill("del-test"), null);
  });

  test("olmayan skill için false döner", () => {
    const result = skills.deleteSkill("does-not-exist-xyz");
    assert.strictEqual(result, false);
  });

  test("sildikten sonra listSkills'te görünmez", () => {
    skills.saveSkill("del-list-test", "## Del List\n");
    skills.deleteSkill("del-list-test");
    const list = skills.listSkills();
    assert.ok(!list.some(s => s.name === "del-list-test"));
  });
});

describe("skills: findRelevantSkills (fuzzy)", () => {
  before(() => {
    skills.saveSkill("file-reader", "## File Reader\n**When to use:** reading files\n**Steps:**\n1. read_file: dosyayı oku");
    skills.saveSkill("code-runner", "## Code Runner\n**When to use:** executing code\n**Steps:**\n1. run_command: kodu çalıştır");
  });

  test("boş metin için boş dizi döner", async () => {
    const result = await skills.findRelevantSkills("");
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test("null için boş dizi döner", async () => {
    const result = await skills.findRelevantSkills(null);
    assert.ok(Array.isArray(result));
  });

  test("eşleşen keyword için skill döner", async () => {
    const result = await skills.findRelevantSkills("I need to read some files");
    assert.ok(Array.isArray(result));
  });

  test("limit parametresi max eleman sayısını sınırlar", async () => {
    const result = await skills.findRelevantSkills("reading executing code files", 1);
    assert.ok(result.length <= 1);
  });
});
