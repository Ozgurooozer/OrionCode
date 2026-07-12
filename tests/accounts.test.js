// tests/accounts.test.js — Çoklu hesap profilleri (core/accounts.js)
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME — gerçek ~/.orion'a dokunma (modül FILE'ı require anında kurar)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-acc-"));
process.env.ORION_HOME = TMP;

const { test, after } = require("node:test");
const assert = require("node:assert");
const accounts = require("../core/accounts.js");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

test("accounts: FILE izole ORION_HOME altında", () => {
  assert.ok(accounts.FILE.startsWith(TMP), `${accounts.FILE} ${TMP} altında olmalı`);
});

test("accounts: boş durumda load varsayılan yapı döner", () => {
  assert.deepStrictEqual(accounts.load(), { active: null, profiles: {} });
});

test("accounts: save → load gidiş-dönüşü", () => {
  accounts.save({ active: "is", profiles: { is: { GROQ_API_KEY: "gsk_test1234" } } });
  const data = accounts.load();
  assert.strictEqual(data.active, "is");
  assert.strictEqual(data.profiles.is.GROQ_API_KEY, "gsk_test1234");
});

test("accounts: applyActive aktif profili env'e yükler", () => {
  delete process.env.GROQ_API_KEY;
  accounts.save({ active: "is", profiles: { is: { GROQ_API_KEY: "gsk_test1234" } } });
  const name = accounts.applyActive();
  assert.strictEqual(name, "is");
  assert.strictEqual(process.env.GROQ_API_KEY, "gsk_test1234");
  delete process.env.GROQ_API_KEY;
});

test("accounts: aktif profil yoksa applyActive null döner", () => {
  accounts.save({ active: null, profiles: {} });
  assert.strictEqual(accounts.applyActive(), null);
});

test("accounts: knownKeyEnvs built-in + preset anahtarlarını içerir", () => {
  const envs = accounts.knownKeyEnvs();
  for (const e of ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY", "ZAI_API_KEY", "NVIDIA_API_KEY"]) {
    assert.ok(envs.includes(e), `${e} listede olmalı`);
  }
});
