// tests/skills-lazy.test.js — Tembel skill yükleme (core/skills.js findRelevantSkills)
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME + embed servisini ölü porta yönlendir → fuzzy düşüş yolu test edilir
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-skl-"));
process.env.ORION_HOME = TMP;
process.env.OLLAMA_PORT = "1";

const { test, after } = require("node:test");
const assert = require("node:assert");
const skills = require("../core/skills.js");
const i18n   = require("../core/i18n.js");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

test("findRelevantSkills: skill yokken boş liste", async () => {
  const hits = await skills.findRelevantSkills("herhangi bir mesaj");
  assert.deepStrictEqual(hits, []);
});

test("findRelevantSkills: eşleşen skill bulunur, alakasız bulunmaz (fuzzy yolu)", async () => {
  skills.saveSkill("moltbook-post", "## Moltbook post akışı\n\n**Ne zaman kullan:** Moltbook'ta post oluşturulacağı zaman");
  skills.saveSkill("vault-bakim",   "## Vault bakımı\n\n**Ne zaman kullan:** vault index bozulunca");

  const hits = await skills.findRelevantSkills("moltbook post atmak istiyorum");
  assert.strictEqual(hits.length, 1, `sadece moltbook skill'i eşleşmeli (${hits.map(h => h.name)})`);
  assert.strictEqual(hits[0].name, "moltbook-post");

  const none = await skills.findRelevantSkills("bugün hava çok güzel dışarı çıkalım");
  assert.deepStrictEqual(none.map(h => h.name), [], "alakasız mesaj hiçbir skill'le eşleşmemeli");
});

test("buildSkillSuffix: boşta boş, doluda başlık + içerik", () => {
  assert.strictEqual(skills.buildSkillSuffix([], i18n), "");
  const s = skills.buildSkillSuffix([{ name: "x", desc: "d", raw: "## X\niçerik" }], i18n);
  assert.ok(s.includes("içerik"));
  assert.ok(/İlgili Skill|Relevant Skills/.test(s));
});
