// tests/diff.test.js — diff motoru
"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { diffText, diffStat, diffLines } = require("../core/diff.js");

test("aynı metin → boş diff", () => {
  assert.strictEqual(diffText("a\nb\nc", "a\nb\nc"), "");
});

test("ekleme ve silme doğru işaretlenir", () => {
  const d = diffText("a\nb\nc", "a\nX\nc");
  assert.ok(d.includes("-b"));
  assert.ok(d.includes("+X"));
  assert.ok(d.includes("@@"));
});

test("diffStat sayıları doğru", () => {
  const s = diffStat("a\nb\nc\nd", "a\nc\nd\ne\nf");
  assert.strictEqual(s.removed, 1); // b silindi
  assert.strictEqual(s.added, 2);   // e, f eklendi
});

test("hunk başlığı satır numaraları doğru", () => {
  // 10 satır, 6. satır değişiyor → hunk 3. satırdan başlar (3 bağlam)
  const oldT = Array.from({ length: 10 }, (_, i) => `satır${i + 1}`).join("\n");
  const newT = oldT.replace("satır6", "değişti");
  const d = diffText(oldT, newT);
  assert.match(d, /@@ -3,7 \+3,7 @@/);
});

test("ortak baş/son kırpma ile büyük dosya hızlı", () => {
  const base = Array.from({ length: 5000 }, (_, i) => `l${i}`).join("\n");
  const changed = base.replace("l2500", "DEĞİŞTİ");
  const t0 = Date.now();
  const d = diffText(base, changed);
  assert.ok(Date.now() - t0 < 500, "500ms altında olmalı");
  assert.ok(d.includes("+DEĞİŞTİ"));
});

test("tamamen farklı metin çökmez", () => {
  const ops = diffLines("a\nb", "x\ny\nz");
  assert.strictEqual(ops.filter(o => o.type === "del").length, 2);
  assert.strictEqual(ops.filter(o => o.type === "add").length, 3);
});

test("boş → dolu ve dolu → boş", () => {
  assert.ok(diffText("", "yeni").includes("+yeni"));
  assert.ok(diffText("eski", "").includes("-eski"));
});
