// tests/meissa.test.js — Meissa kategorize ajanı testleri
"use strict";
const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const os   = require("os");
const path = require("path");
const fs   = require("fs");

// ORION_HOME izolasyonu
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "meissa_test_"));
process.env.ORION_HOME = tmpHome;
process.env.OLLAMA_HOST = "127.0.0.1";
process.env.OLLAMA_PORT = "11434";

const meissa = require("../core/agents/meissa.ts");

// ── Kazıcı protokolü: 10 saçma girdi (unit — Ollama gerektirmez) ────────────

describe("meissa — graceful fail (Ollama kapalı senaryosu)", () => {
  const SACMA_GIRDILER = [
    "💀💀💀💀💀",
    "a".repeat(10_000),
    "",
    "\n\n\n",
    "\t\t\t",
    "'; DROP TABLE users; --",
    "🎨🖼️👨‍💻",
    "Ey Türkçe sözler... ".repeat(128),
    "bana resim yap resim yap resim yap bana resim yap",
    "x".repeat(50_000),
  ];

  for (const girdi of SACMA_GIRDILER) {
    const label = girdi.slice(0, 40).replace(/\n|\t/g, "↵") || "(boş)";
    test(`saçma girdi graceful → "${label}"`, async () => {
      let result;
      // Ollama muhtemelen kapalı test ortamında → FALLBACK döner
      // Önemli olan: exception fırlatmamak
      try {
        result = await meissa.run(girdi);
      } catch (e) {
        assert.fail(`meissa.run exception fırlatmamalı: ${e.message}`);
      }
      assert.ok(result, "sonuç null olmamalı");
      assert.ok(["skill", "sohbet", "orchestration"].includes(result.rota), "geçerli rota");
      assert.ok([1, 2, 3].includes(result.karmasiklik), "karmasiklik 1-3 arasında");
      assert.ok(Array.isArray(result.kategoriler), "kategoriler dizi");
      assert.ok(result._meta, "_meta mevcut");
    });
  }
});

// ── Şema doğrulama: FALLBACK yapısı ─────────────────────────────────────────

describe("meissa — FALLBACK şeması", () => {
  test("FALLBACK alanları doğru", () => {
    const fb = meissa.FALLBACK;
    assert.deepEqual(fb.kategoriler, ["sohbet"]);
    assert.equal(fb.karmasiklik, 1);
    assert.equal(fb.rota, "sohbet");
    assert.equal(fb.skill, null);
    assert.equal(fb.skills, null);
    assert.equal(fb.tahmini_butce, 0);
  });

  test("run() FALLBACK döndürdüğünde şema tam", async () => {
    const r = await meissa.run("test");
    const keys = ["kategoriler", "karmasiklik", "rota", "skill", "skills", "tahmini_butce", "_meta"];
    for (const k of keys) {
      assert.ok(k in r, `'${k}' alanı eksik`);
    }
    assert.ok(typeof r._meta.wall_time_ms === "number", "wall_time_ms number");
    assert.ok(typeof r._meta.input_hash   === "string", "input_hash string");
  });
});

// ── Faz 3: yeni skill tipleri (level0 — LLM gerektirmez) ──────────────────

describe("meissa — Faz 3 skill tipleri (level0 path)", () => {
  test("animasyon oluştur → level0 skill:animation", async () => {
    const r = await meissa.run("animasyon oluştur");
    assert.equal(r.rota, "skill");
    assert.equal(r.skill, "animation");
    assert.equal(r._meta.level, 0);
  });

  test("animate this → level0 skill:animation", async () => {
    const r = await meissa.run("animate this");
    assert.equal(r.rota, "skill");
    assert.equal(r.skill, "animation");
    assert.equal(r._meta.level, 0);
  });

  test("skills alanı null veya dizi döner", async () => {
    const r = await meissa.run("merhaba");
    assert.ok(r.skills === null || Array.isArray(r.skills), "skills null ya da dizi olmalı");
  });
});

// ── Log yazma ────────────────────────────────────────────────────────────────

describe("meissa — log yazımı", () => {
  test("koşu sonrası JSONL log dosyası oluşur", async () => {
    await meissa.run("log testi");
    const dir  = meissa.logPath();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const file = path.join(dir, `${date}.jsonl`);
    assert.ok(fs.existsSync(file), `Log dosyası bekleniyor: ${file}`);

    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    assert.ok(lines.length >= 1, "en az 1 log satırı");
    const parsed = JSON.parse(lines[lines.length - 1]);
    assert.ok(parsed.timestamp, "timestamp var");
    assert.ok(typeof parsed.wall_time_ms === "number", "wall_time_ms number");
    assert.ok("output_parsed" in parsed, "output_parsed var");
  });

  test("girdi input_length ile doğru kaydedilir", async () => {
    const msg = "uzunluk test mesajı";
    await meissa.run(msg);
    const dir  = meissa.logPath();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const file = path.join(dir, `${date}.jsonl`);
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    const last  = JSON.parse(lines[lines.length - 1]);
    assert.equal(last.input_length, msg.length);
  });

  test("50000 karakterlik girdi kesilir (maxInputLength)", async () => {
    await meissa.run("x".repeat(50_000));
    const dir  = meissa.logPath();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const file = path.join(dir, `${date}.jsonl`);
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    const last  = JSON.parse(lines[lines.length - 1]);
    assert.ok(last.input_length <= meissa.DEFAULTS.maxInputLength,
      `input_length (${last.input_length}) maxInputLength'i aşmamalı`);
  });
});

// ── DEFAULTS ─────────────────────────────────────────────────────────────────

describe("meissa — DEFAULTS", () => {
  test("DEFAULTS alanları mevcut", () => {
    const d = meissa.DEFAULTS;
    assert.ok(typeof d.model        === "string", "model string");
    assert.ok(typeof d.ollamaHost   === "string", "ollamaHost string");
    assert.ok(typeof d.ollamaPort   === "number", "ollamaPort number");
    assert.ok(typeof d.timeoutMs    === "number", "timeoutMs number");
    assert.ok(typeof d.maxInputLength === "number", "maxInputLength number");
  });
});

// ── Temizlik ──────────────────────────────────────────────────────────────────

after(() => {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
});
