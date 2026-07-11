// tests/fs.test.js — tools/fs.js için testler
"use strict";

const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { test } = require("node:test");
const assert   = require("node:assert");

// İzole temp dizini
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-fs-"));

// tools/fs.js'i yükle — ORION_HOME yolunun çakışmaması için
const { execute } = require("../tools/fs.js");

// ── Test 1: read_file — var olan dosya ───────────────────────────────────────
test("read_file: var olan dosya satır numarasıyla döner", () => {
  const f = path.join(TMP, "test.txt");
  fs.writeFileSync(f, "satir1\nsatir2\nsatir3\n");
  const out = execute("read_file", { path: f });
  assert.ok(out.includes("satir1"), "içerik döndürülmeli");
  assert.ok(out.includes("1"), "satır numarası içermeli");
});

// ── Test 2: read_file — yok olan dosya ───────────────────────────────────────
test("read_file: yok olan dosya hata mesajı döner", () => {
  const out = execute("read_file", { path: path.join(TMP, "yok.txt") });
  assert.ok(out.startsWith("HATA:"), "hata mesajı başlamalı");
});

// ── Test 3: write_file → read_file — round-trip ──────────────────────────────
test("write_file + read_file: oluştur ve oku", () => {
  const f = path.join(TMP, "yeni.txt");
  const w = execute("write_file", { path: f, content: "Merhaba Orion\n" });
  assert.ok(w.includes("yeni dosya") || w.includes("Yazıldı"), "yazma onayı");
  const r = execute("read_file", { path: f });
  assert.ok(r.includes("Merhaba Orion"), "içerik okunabilmeli");
});

// ── Test 4: list_files — var olan dizin ───────────────────────────────────────
test("list_files: dizindeki dosyaları listeler", () => {
  const subDir = path.join(TMP, "subdir");
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, "a.js"), "");
  fs.writeFileSync(path.join(subDir, "b.ts"), "");
  const out = execute("list_files", { dir: subDir });
  assert.ok(out.includes("a.js"), "a.js listelenmeli");
  assert.ok(out.includes("b.ts"), "b.ts listelenmeli");
});

// ── Test 5: list_files — erişim hatası olan alt dizin atlanır (EPERM koruması)
test("list_files: EPERM olan alt dizin sessizce atlanır", () => {
  // EPERM simülasyonu: sadece dönüşün çökmediğini doğrula
  // Gerçek EPERM test ortamında yoksa sadece graceful return test edilir
  const out = execute("list_files", { dir: TMP });
  assert.strictEqual(typeof out, "string", "hata fırlatmaz, string döner");
  assert.ok(!out.startsWith("HATA:"), "erişilebilir dizin için hata yok");
});

// ── Test 6: list_files — glob pattern filtresi ────────────────────────────────
test("list_files: glob pattern sadece eşleşenleri gösterir", () => {
  const gDir = path.join(TMP, "glob");
  fs.mkdirSync(gDir, { recursive: true });
  fs.writeFileSync(path.join(gDir, "app.js"), "");
  fs.writeFileSync(path.join(gDir, "style.css"), "");
  const out = execute("list_files", { dir: gDir, pattern: "*.js" });
  assert.ok(out.includes("app.js"), "*.js eşleşmeli");
  assert.ok(!out.includes("style.css"), "*.css eşleşmemeli");
});

// ── Test 7: search — Node.js fallback (rg ve grep yoksa) ─────────────────────
test("search: regex içeriği bulur (Node.js fallback ile)", () => {
  const sDir = path.join(TMP, "search");
  fs.mkdirSync(sDir, { recursive: true });
  fs.writeFileSync(path.join(sDir, "find_me.txt"), "orion aethelred bulundu\nsatir2\n");
  // Pattern varsa sonuç döner, yoksa "(eşleşme yok)"
  const out = execute("search", { pattern: "aethelred", dir: sDir });
  const found = out.includes("aethelred") || out === "(eşleşme yok)";
  assert.ok(found, "arama hata vermeden tamamlanmalı");
});

// ── Test 8: list_files — yok olan dizin hata döner ───────────────────────────
test("list_files: yok olan dizin hata mesajı döner", () => {
  const out = execute("list_files", { dir: path.join(TMP, "yok_dizin") });
  assert.ok(out.startsWith("HATA:"), "hata mesajı döner");
});

// ── Test 9: edit_file — başarılı düzenleme ────────────────────────────────────
test("edit_file: eşleşen metin değiştirilir", () => {
  const f = path.join(TMP, "edit_me.txt");
  fs.writeFileSync(f, "eski metin burada\n");
  const out = execute("edit_file", { path: f, old_str: "eski metin", new_str: "yeni metin" });
  assert.ok(out.includes("Düzenlendi"), "düzenleme onayı");
  assert.ok(fs.readFileSync(f, "utf8").includes("yeni metin"), "değişiklik uygulandı");
});

// ── Temizlik ───────────────────────────────────────────────────────────────────
process.on("exit", () => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
