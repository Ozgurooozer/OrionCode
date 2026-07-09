// tests/checkpoint.test.js — snapshot / restore döngüsü
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
process.env.ORION_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-test-"));

const { test } = require("node:test");
const assert = require("node:assert");
const checkpoint = require("../core/checkpoint.js");

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "orion-work-"));

test("var olan dosya: snapshot → değişiklik → restore eski içeriği getirir", () => {
  const f = path.join(WORK, "a.txt");
  fs.writeFileSync(f, "eski içerik");
  const id = checkpoint.snapshot(f, "write_file");
  assert.ok(id, "snapshot id dönmeli");
  fs.writeFileSync(f, "yeni içerik");
  const r = checkpoint.restore(id);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.action, "restored");
  assert.strictEqual(fs.readFileSync(f, "utf8"), "eski içerik");
});

test("yeni dosya: snapshot → oluştur → restore dosyayı siler", () => {
  const f = path.join(WORK, "yeni.txt");
  const id = checkpoint.snapshot(f, "write_file");
  assert.ok(id);
  fs.writeFileSync(f, "içerik");
  const r = checkpoint.restore(id);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.action, "deleted");
  assert.strictEqual(fs.existsSync(f), false);
});

test("list: en yeni başta", () => {
  const l = checkpoint.list(10);
  assert.ok(l.length >= 2);
  assert.ok(l[0].ts >= l[l.length - 1].ts);
});

test("restore: bilinmeyen id hata döner", () => {
  const r = checkpoint.restore("yok1234");
  assert.strictEqual(r.ok, false);
});
