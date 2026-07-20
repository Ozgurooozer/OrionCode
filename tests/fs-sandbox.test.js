// tests/fs-sandbox.test.js — tools/fs.js workspace sandbox sınırı
"use strict";

const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { test } = require("node:test");
const assert   = require("node:assert");

// İki izole kök: çalışma alanı (WS) ve ~/.orion istisnası için ORION_HOME tabanı.
const WS        = fs.mkdtempSync(path.join(os.tmpdir(), "orion-ws-"));
const HOME_BASE = fs.mkdtempSync(path.join(os.tmpdir(), "orion-home-"));

// _guardPath env'i çağrı anında okur → require'dan önce set etmek yeterli ama
// güvenli olsun diye burada set ediyoruz. node --test dosya başına süreç izolasyonu
// uyguladığından bu env diğer test dosyalarına sızmaz.
process.env.ORION_WORKSPACE = WS;
process.env.ORION_HOME      = HOME_BASE;

const VAULT_DIR = path.join(HOME_BASE, ".orion", "vault", "sessions");
fs.mkdirSync(VAULT_DIR, { recursive: true });

const { execute } = require("../tools/fs.js");
const { emitter } = require("../core/events.ts");

// ── 1: Çalışma alanı içine yazma çalışır ─────────────────────────────────────
test("sandbox: workspace içine write_file izinli", () => {
  const f = path.join(WS, "proje", "not.txt");
  const out = execute("write_file", { path: f, content: "içerik\n" });
  assert.ok(out.startsWith("Yazıldı"), `içeri yazma başarılı olmalı, dönen: ${out}`);
  assert.ok(fs.existsSync(f), "dosya gerçekten yazılmalı");
});

// ── 2: ../ ile workspace dışına yazma reddedilir ─────────────────────────────
test("sandbox: ../ ile dışarı write_file reddedilir + dosya yazılmaz", () => {
  const escape = path.join(WS, "..", "sizinti-escape.txt");
  const out = execute("write_file", { path: escape, content: "kötü" });
  assert.ok(out.startsWith("HATA:"), `reddedilmeli, dönen: ${out}`);
  assert.match(out, /çalışma kökü dışında/, "hata sınır mesajı içermeli");
  assert.ok(!fs.existsSync(path.resolve(escape)), "dış dosya OLUŞMAMALI");
});

// ── 3: Mutlak dış yol reddedilir ─────────────────────────────────────────────
test("sandbox: mutlak dış yol (kardeş temp) reddedilir", () => {
  const sibling = path.join(os.tmpdir(), "orion-baska-hedef.txt");
  const out = execute("write_file", { path: sibling, content: "x" });
  assert.ok(out.startsWith("HATA:"), "workspace dışı mutlak yol reddedilmeli");
  assert.ok(!fs.existsSync(sibling), "dosya oluşmamalı");
});

// ── 4: ~/.orion istisnası — vault'a yazma çalışmaya DEVAM eder ────────────────
test("sandbox: ~/.orion (vault) istisnası izinli", () => {
  const vf = path.join(VAULT_DIR, "2026-07-13_x_test.html");
  const out = execute("write_file", { path: vf, content: "<html></html>" });
  assert.ok(out.startsWith("Yazıldı"), `vault istisnası izinli olmalı, dönen: ${out}`);
  assert.ok(fs.existsSync(vf), "vault dosyası yazılmalı");
});

// ── 5: Reddedilen çağrı security_boundary_hit olayı yayınlar ──────────────────
test("sandbox: red durumunda security_boundary_hit yayınlanır", () => {
  const seen = [];
  const listener = ev => { if (ev.type === "security_boundary_hit") seen.push(ev); };
  emitter.on("event", listener);
  try {
    execute("read_file", { path: path.join(WS, "..", "..", "gizli.txt") });
  } finally {
    emitter.off("event", listener);
  }
  assert.strictEqual(seen.length, 1, "tam olarak bir sınır-ihlali olayı beklenir");
  assert.strictEqual(seen[0].payload.tool, "read_file");
  assert.ok(seen[0].payload.resolved, "olay çözülmüş mutlak yolu taşımalı");
});

// ── 6: read_file de sınırlı — dış okuma reddedilir ───────────────────────────
test("sandbox: dış read_file reddedilir", () => {
  const out = execute("read_file", { path: path.join(WS, "..", "disari.txt") });
  assert.ok(out.startsWith("HATA:"), "dış okuma reddedilmeli");
  assert.match(out, /çalışma kökü dışında/, "sınır mesajı içermeli");
});

// ── 7: create_dir sandbox sınırı ─────────────────────────────────────────────
test("sandbox: create_dir workspace içinde izinli", () => {
  const d = path.join(WS, "yeni-dizin");
  const out = execute("create_dir", { path: d });
  assert.ok(out.includes("oluşturuldu"), "onay mesajı");
  assert.ok(fs.existsSync(d), "dizin oluştu");
});

test("sandbox: create_dir workspace dışında reddedilir", () => {
  const d = path.join(WS, "..", "dış-dizin");
  const out = execute("create_dir", { path: d });
  assert.ok(out.startsWith("HATA:"), "reddedilmeli");
  assert.ok(!fs.existsSync(path.resolve(d)), "dış dizin oluşmamalı");
});

// ── 8: delete_file sandbox sınırı ────────────────────────────────────────────
test("sandbox: delete_file workspace dışında reddedilir", () => {
  const f = path.join(WS, "..", "silinecek.txt");
  const out = execute("delete_file", { path: f });
  assert.ok(out.startsWith("HATA:"), "reddedilmeli");
});

// ── 9: move_file sandbox sınırı ──────────────────────────────────────────────
test("sandbox: move_file from/to dışında reddedilir", () => {
  const src = path.join(WS, "kaynak.txt");
  fs.writeFileSync(src, "içerik");
  const dstOutside = path.join(WS, "..", "kaçak.txt");
  const out = execute("move_file", { from: src, to: dstOutside });
  assert.ok(out.startsWith("HATA:"), "hedef dışarıdaysa reddedilmeli");
  assert.ok(fs.existsSync(src), "kaynak silinmemeli");
});

// ── 10: glob_files sandbox sınırı ────────────────────────────────────────────
test("sandbox: glob_files workspace içinde çalışır", () => {
  const subDir = path.join(WS, "glob_sandbox");
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, "app.js"), "");
  const out = execute("glob_files", { pattern: "**/*.js", dir: subDir });
  assert.ok(typeof out === "string", "string döner");
  assert.ok(!out.startsWith("HATA:"), "workspace içi arama izinli");
});

test("sandbox: glob_files workspace dışında reddedilir", () => {
  const outsideDir = path.join(WS, "..", "dış-glob");
  const out = execute("glob_files", { pattern: "**/*.js", dir: outsideDir });
  assert.ok(out.startsWith("HATA:"), "dışarı arama reddedilmeli");
});
