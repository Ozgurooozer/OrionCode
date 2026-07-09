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
