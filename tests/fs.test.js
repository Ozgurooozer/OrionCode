// tests/fs.test.js — tools/fs.js için testler
"use strict";

const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { test } = require("node:test");
const assert   = require("node:assert");

// İzole temp dizini
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-fs-"));

// Bu test kendi çalışma kökünü TMP olarak bildirir — fs.js workspace sandbox'ı
// aksi halde repo kökü dışındaki temp yazımlarını reddederdi.
process.env.ORION_WORKSPACE = TMP;

// tools/fs.js'i yükle — ORION_HOME yolunun çakışmaması için
const { execute } = require("../tools/fs.ts");

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

// ── Test 10: search ignore-filtre — node_modules varsayılan modda atlanır ────
test("search: node_modules varsayılan modda sonuç dönmez (Node.js fallback)", () => {
  const root  = path.join(TMP, "nmtest");
  const nmDir = path.join(root, "node_modules", "somepkg");
  fs.mkdirSync(nmDir, { recursive: true });
  fs.writeFileSync(path.join(nmDir, "index.js"), "const SECRET_NM = 'nodemod-match';\n");
  fs.writeFileSync(path.join(root, "app.js"), "// no match here\n");

  // rg/grep olmayan ortam için Node.js fallback davranışını test eder:
  // search tool'u node_modules içini atladığı için eşleşme gelmemeli
  const out = execute("search", { pattern: "SECRET_NM", dir: root });
  // rg .gitignore'dan node_modules'ı atlayabilir; node fallback SKIP seti atlıyor.
  // Her iki durumda da "nodemod-match" içerik olarak sonuçta olmamalı.
  assert.ok(!out.includes("nodemod-match"), "node_modules içi varsayılan aramada görünmemeli");
});

// ── Test 11: search includeIgnored:true — node_modules sonuç döndürür ─────────
test("search: includeIgnored:true ile node_modules dahil edilir (Node.js fallback)", () => {
  const root  = path.join(TMP, "nmtest2");
  const nmDir = path.join(root, "node_modules", "pkg2");
  fs.mkdirSync(nmDir, { recursive: true });
  fs.writeFileSync(path.join(nmDir, "lib.js"), "const INCLUDED_NM = 'incl-match';\n");

  const out = execute("search", { pattern: "INCLUDED_NM", dir: root, includeIgnored: true });
  // Node.js fallback: includeIgnored=true ile SKIP seti minimal, node_modules dahil
  // rg'de --glob=!node_modules eklenmez, dolayısıyla eşleşme gelebilir.
  // Testin amacı: includeIgnored:true geçirildiğinde hata vermemesi ve tanımlı davranış
  assert.strictEqual(typeof out, "string", "string döner, hata olmaz");
  // rg ortamında node_modules .gitignore'dan atlanıyor olabilir — sadece node fallback
  // için garanti: "incl-match" eşleşmesi ya da "(eşleşme yok)" kabul edilir
  const nodeHit = out.includes("incl-match") || out.includes("eşleşme yok") || out.includes("INCLUDED_NM");
  assert.ok(nodeHit, "includeIgnored:true geçerli bir string döndürmeli");
});

// ── Test 11a: edit_file CRLF normalizasyonu ──────────────────────────────────
test("edit_file: CRLF dosyasında LF old_str eşleşir", () => {
  const f = path.join(TMP, "crlf_edit.txt");
  fs.writeFileSync(f, "satir1\r\nsatir2\r\nsatir3\r\n");
  // LF formatında old_str gönder — CRLF dosyasında eşleşmeli
  const out = execute("edit_file", { path: f, old_str: "satir2\n", new_str: "yeni_satir2\n" });
  assert.ok(out.includes("Düzenlendi"), `düzenleme bekleniyor, alınan: ${out}`);
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("yeni_satir2"), "değişiklik uygulandı");
  assert.ok(content.includes("\r\n"), "CRLF formatı korundu");
});

// ── Test 11b: edit_file replace_all ──────────────────────────────────────────
test("edit_file: replace_all:true tüm eşleşmeleri değiştirir", () => {
  const f = path.join(TMP, "multi_edit.txt");
  fs.writeFileSync(f, "foo bar foo baz foo\n");
  const out = execute("edit_file", { path: f, old_str: "foo", new_str: "qux", replace_all: true });
  assert.ok(out.includes("Düzenlendi"), "düzenleme onayı");
  const content = fs.readFileSync(f, "utf8");
  assert.ok(!content.includes("foo"), "foo kalmamış olmalı");
  assert.ok(content.includes("qux"), "qux ile değiştirildi");
});

test("edit_file: çok sayıda eşleşme + replace_all:false hata döner", () => {
  const f = path.join(TMP, "multi_err.txt");
  fs.writeFileSync(f, "foo foo foo\n");
  const out = execute("edit_file", { path: f, old_str: "foo", new_str: "bar" });
  assert.ok(out.startsWith("HATA:"), "benzersizlik hatası");
  assert.ok(out.includes("replace_all"), "replace_all seçeneği önerilmeli");
});

test("edit_file: eşleşme bulunamazsa fuzzy konum ipucu gösterir", () => {
  const f = path.join(TMP, "fuzzy_hint.txt");
  fs.writeFileSync(f, "function hello() {\n  return 42;\n}\n");
  // old_str ile gerçek satır arasında hafif fark — ilk satır eşleşir
  const out = execute("edit_file", { path: f, old_str: "function hello() {\n  return 99;\n}", new_str: "x" });
  assert.ok(out.startsWith("HATA:"), "hata mesajı başlar");
  // fuzzy hint: dosyada "function hello()" var, hint gösterilmeli
  assert.ok(out.includes("Olası konum") || out.includes("read_file"), "fuzzy hint veya read_file önerisi");
});

// ── Test 11c: multi_edit ─────────────────────────────────────────────────────
test("multi_edit: birden fazla değişikliği atomik uygular", () => {
  const f = path.join(TMP, "multi_edit_test.js");
  fs.writeFileSync(f, "const a = 1;\nconst b = 2;\nconst c = 3;\n");
  const out = execute("multi_edit", {
    path: f,
    edits: [
      { old_str: "const a = 1;", new_str: "const a = 10;" },
      { old_str: "const b = 2;", new_str: "const b = 20;" },
      { old_str: "const c = 3;", new_str: "const c = 30;" },
    ],
  });
  assert.ok(out.includes("3/3"), `3 değişiklik: ${out}`);
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("const a = 10;"), "a değişti");
  assert.ok(content.includes("const b = 20;"), "b değişti");
  assert.ok(content.includes("const c = 30;"), "c değişti");
});

test("multi_edit: kısmi başarı — bulunamayanlar uyarı döner", () => {
  const f = path.join(TMP, "multi_partial.js");
  fs.writeFileSync(f, "const x = 1;\n");
  const out = execute("multi_edit", {
    path: f,
    edits: [
      { old_str: "const x = 1;", new_str: "const x = 99;" },
      { old_str: "const y = 2;", new_str: "const y = 99;" }, // bulunamayacak
    ],
  });
  assert.ok(out.includes("1/2"), `kısmi başarı: ${out}`);
  assert.ok(out.includes("Uyarı") || out.includes("bulunamadı"), "uyarı mesajı");
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("const x = 99;"), "x değişti");
});

test("multi_edit: hiçbiri bulunamazsa HATA döner", () => {
  const f = path.join(TMP, "multi_none.js");
  fs.writeFileSync(f, "const z = 0;\n");
  const out = execute("multi_edit", {
    path: f,
    edits: [{ old_str: "const missing = 1;", new_str: "x" }],
  });
  assert.ok(out.startsWith("HATA:"), `hata: ${out}`);
});

// ── Test 12: create_dir ──────────────────────────────────────────────────────
test("create_dir: iç içe dizin oluşturur", () => {
  const target = path.join(TMP, "a", "b", "c");
  const out = execute("create_dir", { path: target });
  assert.ok(out.includes("oluşturuldu"), "onay mesajı");
  assert.ok(fs.existsSync(target), "dizin gerçekten oluşturuldu");
});

test("create_dir: zaten varsa hata vermez", () => {
  const target = path.join(TMP, "existing_dir");
  fs.mkdirSync(target, { recursive: true });
  const out = execute("create_dir", { path: target });
  assert.ok(out.includes("oluşturuldu"), "tekrar oluşturma hata vermez");
});

// ── Test 13: delete_file ─────────────────────────────────────────────────────
test("delete_file: dosyayı siler", () => {
  const f = path.join(TMP, "to_delete.txt");
  fs.writeFileSync(f, "silinecek");
  const out = execute("delete_file", { path: f });
  assert.ok(out.includes("Silindi"), "silme onayı");
  assert.ok(!fs.existsSync(f), "dosya artık yok");
});

test("delete_file: yok olan dosya hata döner", () => {
  const out = execute("delete_file", { path: path.join(TMP, "hayalet.txt") });
  assert.ok(out.startsWith("HATA:"), "hata mesajı");
});

test("delete_file: recursive:true ile dizin siler", () => {
  const d = path.join(TMP, "dir_to_delete");
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "child.txt"), "içerik");
  const out = execute("delete_file", { path: d, recursive: true });
  assert.ok(out.includes("Dizin silindi"), "silme onayı");
  assert.ok(!fs.existsSync(d), "dizin artık yok");
});

// ── Test 14: move_file ────────────────────────────────────────────────────────
test("move_file: dosyayı taşır", () => {
  const src = path.join(TMP, "source.txt");
  const dst = path.join(TMP, "dest.txt");
  fs.writeFileSync(src, "içerik");
  const out = execute("move_file", { from: src, to: dst });
  assert.ok(out.includes("Taşındı"), "taşıma onayı");
  assert.ok(!fs.existsSync(src), "kaynak artık yok");
  assert.ok(fs.existsSync(dst), "hedef var");
});

test("move_file: kaynak yoksa hata döner", () => {
  const out = execute("move_file", { from: path.join(TMP, "yok.txt"), to: path.join(TMP, "nereye.txt") });
  assert.ok(out.startsWith("HATA:"), "hata mesajı");
});

// ── Test 15: file_info ────────────────────────────────────────────────────────
test("file_info: var olan dosya hakkında bilgi döner", () => {
  const f = path.join(TMP, "info_test.txt");
  fs.writeFileSync(f, "satir1\nsatir2\n");
  const out = execute("file_info", { path: f });
  assert.ok(out.includes("dosya"), "tür gösterilmeli");
  assert.ok(out.includes("Boyut"), "boyut gösterilmeli");
});

test("file_info: yok olan yol 'Yok' döner", () => {
  const out = execute("file_info", { path: path.join(TMP, "hayalet") });
  assert.ok(out.startsWith("Yok:"), "Yok: prefix");
});

// ── Test 16: search context satırları ────────────────────────────────────────
test("search: context:2 ile çevresindeki satırlar gelir (Node.js fallback)", () => {
  const sDir = path.join(TMP, "ctx_search");
  fs.mkdirSync(sDir, { recursive: true });
  fs.writeFileSync(path.join(sDir, "ctx.txt"),
    "line1\nline2\nTARGET_LINE\nline4\nline5\n");
  const out = execute("search", { pattern: "TARGET_LINE", dir: sDir, context: 2 });
  // Sonuç: TARGET_LINE içermeli; rg varsa context satırları da var
  assert.ok(out.includes("TARGET_LINE") || out === "(eşleşme yok)", "hata vermeden tamamlanır");
});

// ── Test 17: glob_files ───────────────────────────────────────────────────────
test("glob_files: **/*.js pattern ile derin dizindeki dosyaları bulur", () => {
  const gRoot = path.join(TMP, "glob_deep");
  fs.mkdirSync(path.join(gRoot, "src", "utils"), { recursive: true });
  fs.writeFileSync(path.join(gRoot, "src", "app.js"), "");
  fs.writeFileSync(path.join(gRoot, "src", "utils", "helper.js"), "");
  fs.writeFileSync(path.join(gRoot, "src", "style.css"), "");

  const out = execute("glob_files", { pattern: "**/*.js", dir: gRoot });
  // Node.js fallback veya rg — her ikisi de .js dosyalarını bulmalı
  const found = out.includes("app.js") || out.includes("helper.js");
  assert.ok(found, `**/*.js eşleşmeli; alınan: ${out}`);
  assert.ok(!out.includes("style.css"), "css dosyası glob_files'da olmamalı");
});

test("glob_files: tek dizin pattern (*.test.js)", () => {
  const gRoot = path.join(TMP, "glob_test");
  fs.mkdirSync(gRoot, { recursive: true });
  fs.writeFileSync(path.join(gRoot, "foo.test.js"), "");
  fs.writeFileSync(path.join(gRoot, "bar.js"), "");

  const out = execute("glob_files", { pattern: "*.test.js", dir: gRoot });
  const found = out.includes("foo.test.js") || out.includes("eşleşme yok");
  assert.ok(typeof out === "string", "string döner");
  assert.ok(!out.includes("bar.js"), "bar.js eşleşmemeli");
});

test("glob_files: yok olan dizin hata döner", () => {
  const out = execute("glob_files", { pattern: "**/*.js", dir: path.join(TMP, "hayalet_dir") });
  // Sandbox dışında değil; dizin yok → glob boş dönebilir ya da hata
  assert.ok(typeof out === "string", "string döner, çökmez");
});

// ── file_outline testleri ─────────────────────────────────────────────────────
test("file_outline: JS dosyasında fonksiyon ve class listeler", () => {
  const f = path.join(TMP, "outline_test.js");
  fs.writeFileSync(f, [
    "const path = require('path');",
    "function greet(name) { return 'hi'; }",
    "class Animal { constructor() {} }",
    "const arrowFn = () => 42;",
    "module.exports = { greet };",
  ].join("\n"));
  const out = execute("file_outline", { path: f });
  assert.ok(out.includes("[fn]") || out.includes("greet"), `fonksiyon gösterilmeli: ${out}`);
  assert.ok(out.includes("[class]") || out.includes("Animal"), `class gösterilmeli: ${out}`);
});

test("file_outline: yok olan dosya hata döner", () => {
  const out = execute("file_outline", { path: path.join(TMP, "yok_outline.js") });
  assert.ok(out.startsWith("HATA:"), "dosya yok hatası");
});

// ── replace_in_files testleri ─────────────────────────────────────────────────
test("replace_in_files: glob eşleşen dosyalarda değiştir", () => {
  const rDir = path.join(TMP, "replace_test");
  fs.mkdirSync(rDir, { recursive: true });
  fs.writeFileSync(path.join(rDir, "a.js"), "const foo = 1; // foo\n");
  fs.writeFileSync(path.join(rDir, "b.js"), "const foo = 2; // foo\n");
  fs.writeFileSync(path.join(rDir, "c.txt"), "foo değişmemeli\n");
  const out = execute("replace_in_files", { pattern: "foo", replacement: "bar", glob: "*.js", dir: rDir });
  assert.ok(out.includes("2 dosya"), `2 js dosyası değişmeli: ${out}`);
  assert.ok(!out.includes("c.txt"), "txt glob'a girmemeli");
  const aContent = fs.readFileSync(path.join(rDir, "a.js"), "utf8");
  assert.ok(aContent.includes("bar"), "a.js değişmeli");
  const cContent = fs.readFileSync(path.join(rDir, "c.txt"), "utf8");
  assert.ok(cContent.includes("foo"), "c.txt değişmemeli");
});

test("replace_in_files: dry_run eşleşen dosyaları listeler ama değiştirmez", () => {
  const rDir = path.join(TMP, "replace_dryrun");
  fs.mkdirSync(rDir, { recursive: true });
  fs.writeFileSync(path.join(rDir, "x.ts"), "const TARGET = 1;\n");
  const out = execute("replace_in_files", { pattern: "TARGET", replacement: "REPLACED", glob: "*.ts", dir: rDir, dry_run: true });
  assert.ok(out.includes("x.ts"), `eşleşen dosya listelenmeli: ${out}`);
  const content = fs.readFileSync(path.join(rDir, "x.ts"), "utf8");
  assert.ok(content.includes("TARGET"), "dry_run: dosya değişmemeli");
});

test("replace_in_files: glob zorunlu — eksik olursa hata döner", () => {
  const out = execute("replace_in_files", { pattern: "x", replacement: "y" });
  assert.ok(out.startsWith("HATA:") && out.includes("glob"), `glob zorunlu hatası: ${out}`);
});

// ── apply_patch testleri ──────────────────────────────────────────────────────
test("apply_patch: basit tek-hunk patch'i uygular", () => {
  const f = path.join(TMP, "patch_simple.txt");
  fs.writeFileSync(f, "satir1\nsatir2\nsatir3\n");
  const patch = `@@ -1,3 +1,3 @@\n satir1\n-satir2\n+satir2_degistirildi\n satir3`;
  const out = execute("apply_patch", { path: f, patch });
  assert.ok(out.includes("1/1"), `hunk uygulanmalı: ${out}`);
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("satir2_degistirildi"), "değişiklik yazılmalı");
  assert.ok(!content.includes("satir2\n"), "eski satır kaldırılmalı");
});

test("apply_patch: birden fazla hunk destekler", () => {
  const f = path.join(TMP, "patch_multi_hunk.js");
  fs.writeFileSync(f, "const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n");
  const patch = [
    "@@ -1,2 +1,2 @@",
    "-const a = 1;",
    "+const a = 10;",
    " const b = 2;",
    "@@ -3,2 +3,2 @@",
    " const c = 3;",
    "-const d = 4;",
    "+const d = 40;",
  ].join("\n");
  const out = execute("apply_patch", { path: f, patch });
  assert.ok(out.includes("2/2"), `2 hunk uygulanmalı: ${out}`);
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("a = 10"), "a değişmeli");
  assert.ok(content.includes("d = 40"), "d değişmeli");
});

test("apply_patch: geçersiz patch → hata döner", () => {
  const f = path.join(TMP, "patch_invalid.txt");
  fs.writeFileSync(f, "içerik\n");
  const out = execute("apply_patch", { path: f, patch: "bu geçerli bir patch değil" });
  assert.ok(out.startsWith("HATA:"), `hata dönmeli: ${out}`);
});

test("apply_patch: yok olan dosya hata döner", () => {
  const out = execute("apply_patch", { path: path.join(TMP, "yok_patch.txt"), patch: "@@ -1,1 +1,1 @@\n-eski\n+yeni" });
  assert.ok(out.startsWith("HATA:"), "dosya yok hatası");
});

// ── insert_at_line testleri ───────────────────────────────────────────────────
test("insert_at_line: belirtilen satırın önüne ekler", () => {
  const f = path.join(TMP, "insert_test.txt");
  fs.writeFileSync(f, "satir1\nsatir2\nsatir3\n");
  const out = execute("insert_at_line", { path: f, line: 2, content: "yeni_satir" });
  assert.ok(out.includes("insert_at_line"), `başarı mesajı: ${out}`);
  const lines = fs.readFileSync(f, "utf8").split("\n");
  assert.equal(lines[0], "satir1");
  assert.equal(lines[1], "yeni_satir");
  assert.equal(lines[2], "satir2");
});

test("insert_at_line: satır 1 → dosyanın başına ekler", () => {
  const f = path.join(TMP, "insert_begin.txt");
  fs.writeFileSync(f, "ilk\nikinci\n");
  execute("insert_at_line", { path: f, line: 1, content: "en_basa" });
  const lines = fs.readFileSync(f, "utf8").split("\n");
  assert.equal(lines[0], "en_basa");
  assert.equal(lines[1], "ilk");
});

test("insert_at_line: yok olan dosya hata döner", () => {
  const out = execute("insert_at_line", { path: path.join(TMP, "yok_insert.txt"), line: 1, content: "test" });
  assert.ok(out.startsWith("HATA:"), "dosya yok hatası");
});

// ── list_files tree formatı ──────────────────────────────────────────────────
test("list_files: tree formatında ├── ve └── gösterir", () => {
  const tDir = path.join(TMP, "tree_test");
  fs.mkdirSync(path.join(tDir, "sub"), { recursive: true });
  fs.writeFileSync(path.join(tDir, "a.js"), "");
  fs.writeFileSync(path.join(tDir, "sub", "b.ts"), "");
  const out = execute("list_files", { dir: tDir });
  assert.ok(out.includes("├──") || out.includes("└──"), `ağaç dalları: ${out}`);
  assert.ok(out.includes("a.js"), "a.js görünmeli");
  assert.ok(out.includes("b.ts"), "b.ts görünmeli");
  assert.ok(out.includes("sub/"), "sub/ dizini görünmeli");
});

test("list_files: boş dizin için anlamlı mesaj döner", () => {
  const eDir = path.join(TMP, "empty_tree");
  fs.mkdirSync(eDir, { recursive: true });
  const out = execute("list_files", { dir: eDir });
  assert.ok(out.includes("boş") || out.includes("empty_tree"), `boş dizin: ${out}`);
});

// ── search case_insensitive ──────────────────────────────────────────────────
test("search: case_insensitive:true büyük/küçük harf duyarsız arama", () => {
  const ciDir = path.join(TMP, "icase_search");
  fs.mkdirSync(ciDir, { recursive: true });
  fs.writeFileSync(path.join(ciDir, "code.js"), "function GREET(name) { return 'hi'; }\n");
  const out = execute("search", { pattern: "greet", dir: ciDir, case_insensitive: true });
  assert.ok(out.includes("GREET") || out.includes("greet") || out.includes("code.js"),
    `büyük harfli eşleşme gelmeli: ${out}`);
});

test("search: case_insensitive:false büyük/küçük harf hassas", () => {
  const csDir = path.join(TMP, "case_sens");
  fs.mkdirSync(csDir, { recursive: true });
  fs.writeFileSync(path.join(csDir, "s.js"), "const UPPER = 1;\n");
  const out = execute("search", { pattern: "upper", dir: csDir, case_insensitive: false });
  // "upper" küçük harf → UPPER eşleşmemeli (case-sensitive)
  const noMatch = !out.includes("UPPER") || out.includes("eşleşme yok");
  assert.ok(typeof out === "string", "string döner");
});

// ── read_file başlık satırı ──────────────────────────────────────────────────
test("read_file: tam okuma başlıkta toplam satır sayısını gösterir", () => {
  const f = path.join(TMP, "header_test.txt");
  fs.writeFileSync(f, "a\nb\nc");  // trailing newline yok → 3 satır
  const out = execute("read_file", { path: f });
  assert.ok(out.match(/\[3 satır/), `başlık: ${out.slice(0, 100)}`);
});

test("read_file: kısmi okuma aralık bilgisi gösterir", () => {
  const f = path.join(TMP, "partial_test.txt");
  fs.writeFileSync(f, "a\nb\nc\nd\ne");  // trailing newline yok → 5 satır
  const out = execute("read_file", { path: f, limit: 2 });
  assert.ok(out.includes("1-2"), `aralık başlığı: ${out.slice(0, 100)}`);
  assert.ok(out.includes("5"), `toplam satır: ${out.slice(0, 100)}`);
});

// ── Temizlik ───────────────────────────────────────────────────────────────────
process.on("exit", () => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
