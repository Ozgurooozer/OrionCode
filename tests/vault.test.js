// tests/vault.test.js — HTML kaçışı ve graf üretimi
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-test-"));
process.env.ORION_HOME = HOME;

const { test } = require("node:test");
const assert = require("node:assert");

// vaultDir'i geçici dizine yönlendir (router config üzerinden)
const VAULT = path.join(HOME, "vault");
fs.mkdirSync(path.join(HOME, ".orion"), { recursive: true });
fs.writeFileSync(path.join(HOME, ".orion", "config.json"), JSON.stringify({ vaultDir: VAULT }));

const vault = require("../core/vault.js");

test("getVaultDir: config'teki vaultDir kullanılır", () => {
  assert.strictEqual(vault.getVaultDir(), VAULT);
});

test("sessionToHTML: içerik HTML-kaçışlanır (XSS koruması)", () => {
  const html = vault.sessionToHTML("abc123", { updatedAt: Date.now(), model: "m", backend: "b", messages: [] }, {
    summary: `<script>alert("x")</script>`,
    decisions: [`<img src=x onerror=alert(1)>`],
    tags: ["<b>t</b>"],
  });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("rebuildGraph: graph.html üretir, düğümler index'ten gelir", () => {
  vault.ensureVault();
  fs.writeFileSync(path.join(VAULT, "index.json"), JSON.stringify([
    { id: "s1", date: "2026-07-09", file: "f.html", summary: "test oturumu", tags: ["cli", "byok"], turns: 3, createdAt: Date.now() },
  ]));
  const p = vault.rebuildGraph();
  const html = fs.readFileSync(p, "utf8");
  assert.ok(html.includes('"s:s1"'));
  assert.ok(html.includes('"t:cli"'));
  assert.ok(html.includes('"t:byok"'));
});

test("readEntry: path traversal engellenir", () => {
  fs.writeFileSync(path.join(VAULT, "index.json"), JSON.stringify([
    { id: "kotu", date: "2026-07-09", file: "..\\..\\gizli.txt", summary: "", tags: [], createdAt: Date.now() },
  ]));
  assert.strictEqual(vault.readEntry("kotu"), null);
});

// ── _keywordSearch normalize + recentEntries-fallback kaldırıldı ─────────────
// Bug: keyword-fallback ham sayı döndürüyor, eşleşme yoksa recentEntries() ile
// alakasız kayıtlar context'e sızıyordu (QSE→Orion kimlik sorusu sızıntısı).

test("searchVault keyword-fallback: skor normalize edilir [0,1]", async () => {
  // vectors.json yok → keyword-fallback devreye girer
  const iPath = path.join(VAULT, "index.json");
  fs.writeFileSync(iPath, JSON.stringify([
    { id: "qse1", date: "2026-07-01", file: "q.html", summary: "kuantum yazılımı Qiskit neler yapabilir", tags: ["qse"], turns: 5, createdAt: 1000, activation: 1.0 },
    { id: "orion1", date: "2026-07-10", file: "o.html", summary: "orion cli byok router", tags: ["cli"], turns: 3, createdAt: 2000, activation: 1.0 },
  ]));
  // vectors.json olmaması keyword-fallback'i zorlar
  const vPath = path.join(VAULT, "vectors.json");
  if (fs.existsSync(vPath)) fs.unlinkSync(vPath);

  const hits = await vault.searchVault("neler yapabilirsin", 5);
  // Tüm hit'lerin skoru [0,1] aralığında olmalı
  for (const h of hits) {
    assert.ok(h.score >= 0 && h.score <= 1, `skor [0,1] dışında: ${h.score}`);
  }
});

test("searchVault keyword-fallback: eşleşme yoksa boş dizi döner (recentEntries yok)", async () => {
  const iPath = path.join(VAULT, "index.json");
  fs.writeFileSync(iPath, JSON.stringify([
    { id: "xyz1", date: "2026-07-01", file: "x.html", summary: "tamamen alakasız bir konu", tags: ["abc"], turns: 1, createdAt: 1000, activation: 1.0 },
  ]));
  const vPath = path.join(VAULT, "vectors.json");
  if (fs.existsSync(vPath)) fs.unlinkSync(vPath);

  // Hiçbir vault girdisiyle eşleşmeyen sorgu
  const hits = await vault.searchVault("zxqjkw klmno", 5);
  assert.deepStrictEqual(hits, [], "eşleşme yoksa boş dizi dönmeli, son kayıtlar değil");
});

test("searchVault keyword-fallback: kısmi eşleşme tam skor üretmez", async () => {
  const iPath = path.join(VAULT, "index.json");
  fs.writeFileSync(iPath, JSON.stringify([
    { id: "partial1", date: "2026-07-01", file: "p.html", summary: "neler varsa onu yap", tags: [], turns: 1, createdAt: 1000, activation: 1.0 },
  ]));
  const vPath = path.join(VAULT, "vectors.json");
  if (fs.existsSync(vPath)) fs.unlinkSync(vPath);

  // "neler yapabilirsin" = 2 term: ["neler","yapabilirsin"]
  // Vault'ta sadece "neler" geçiyor → skor = 1/2 = 0.5
  const hits = await vault.searchVault("neler yapabilirsin", 5);
  if (hits.length > 0) {
    const h = hits.find(x => x.id === "partial1");
    assert.ok(h === undefined || h.score < 1.0, "tek kelime eşleşmesi tam skor (1.0) üretmemeli");
    if (h) assert.ok(Math.abs(h.score - 0.5) < 0.01, `beklenen skor 0.5, gerçek: ${h.score}`);
  }
});
