// tests/diagnostics.test.js — yazım sonrası teşhis
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert");
const diagnostics = require("../core/diagnostics.js");

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "orion-diag-"));

test("geçerli js → null", () => {
  const f = path.join(WORK, "ok.js");
  fs.writeFileSync(f, "const a = 1;\nmodule.exports = a;\n");
  assert.strictEqual(diagnostics.check(f), null);
});

test("bozuk js → teşhis metni", () => {
  const f = path.join(WORK, "bozuk.js");
  fs.writeFileSync(f, "const a = {;\n");
  const d = diagnostics.check(f);
  assert.ok(typeof d === "string" && d.length > 0);
});

test("bozuk json → teşhis metni", () => {
  const f = path.join(WORK, "bozuk.json");
  fs.writeFileSync(f, "{ bozuk ");
  assert.ok(diagnostics.check(f));
});

test("bilinmeyen uzantı → null (kontrol yok)", () => {
  const f = path.join(WORK, "veri.txt");
  fs.writeFileSync(f, "her şey serbest");
  assert.strictEqual(diagnostics.check(f), null);
});
