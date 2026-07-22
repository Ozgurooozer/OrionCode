// tests/level0.test.js — Seviye 0 kural sınıflandırıcı testleri (LLM yok, saf)
"use strict";
const { describe, test, after } = require("node:test");
const assert = require("node:assert/strict");
const os   = require("os");
const path = require("path");
const fs   = require("fs");

// ORION_HOME izolasyonu (meissa entegrasyon testi log yazar)
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "level0_test_"));
process.env.ORION_HOME = tmpHome;

const { classify, MAX_INPUT_LENGTH } = require("../core/agents/level0.ts");
const meissa = require("../core/agents/meissa.ts");

// ── Net eşleşmeler — Seviye 0 karar vermeli ──────────────────────────────────

describe("level0 — net tek-kategori eşleşmeleri", () => {
  const CASES = [
    // [girdi, kategori, rota, skill]
    ["bana bir cyberpunk kız çiz",     "resim",  "skill",  "image"],
    ["siberpunk şehri görseli oluştur","resim",  "skill",  "image"],
    ["draw a space station",           "resim",  "skill",  "image"],
    ["3d render of a mountain",        "resim",  "skill",  "image"],
    ["abi bi resim at",                "resim",  "skill",  "image"],
    ["retro scifi robot",              "resim",  "skill",  "image"],
    ["portrait of an elf warrior",     "resim",  "skill",  "image"],
    ["generate an image of a dragon",  "resim",  "skill",  "image"],
    ["sesli oku şunu",                 "ses",       "skill",  "voice"],
    ["bunu sesle okusana",             "ses",       "skill",  "voice"],
    ["animasyon oluştur",              "animasyon", "skill",  "animation"],
    ["animate this",                   "animasyon", "skill",  "animation"],
    ["hareketli sahne",                "animasyon", "skill",  "animation"],
    ["python'da fibonacci yaz",        "kod",    "sohbet", null],
    ["git rebase ne işe yarar",        "kod",    "sohbet", null],
    ["hocam kod yazıver",              "kod",    "sohbet", null],
    ["performans sorunlarını bul",     "analiz", "sohbet", null],
    ["memory leak tespiti",            "analiz", "sohbet", null],
    ["README.md dosyası oluştur",      "yazı",   "sohbet", null],
    ["teknik doküman taslağı",         "yazı",   "sohbet", null],
    ["merhaba nasılsın",               "sohbet", "sohbet", null],
    ["teşekkürler",                    "sohbet", "sohbet", null],
    ["tamam anladım",                  "sohbet", "sohbet", null],
  ];

  for (const [girdi, kat, rota, skill] of CASES) {
    test(`"${girdi}" → ${kat}/${rota}`, () => {
      const r = classify(girdi);
      assert.ok(r, "Seviye 0 eşleşmeliydi, null döndü");
      assert.deepEqual(r.kategoriler, [kat]);
      assert.equal(r.rota, rota);
      assert.equal(r.skill, skill);
      assert.ok([1, 2, 3].includes(r.karmasiklik));
      assert.ok(typeof r.tahmini_butce === "number");
    });
  }
});

// ── Belirsizler — null dönmeli (LLM'e düşer) ─────────────────────────────────

describe("level0 — belirsizde LLM'e bırakma (null)", () => {
  const CASES = [
    // çok-kategori çakışması
    ["bir karakter çiz ve ardından seslendir", "iki kategori + bağlaç"],
    ["bu metni seslendir: Merhaba Dünya",      "ses + sohbet çakışması"],
    ["bu kodu analiz et: for(let i=0;i<10;i++){}", "kod + analiz çakışması"],
    // trigger yok
    ["bugün hava nasıl",        "trigger kelime yok"],
    ["ne yapabilirim",          "trigger kelime yok"],
    ["what is quantum computing", "trigger kelime yok"],
    // Kazıcı girdileri — LLM'e akmalı, TAYF verisi bozulmasın
    ["💀💀💀💀💀",              "emoji"],
    ["'; DROP TABLE users; --", "injection"],
    ["a".repeat(200),           "uzunluk sınırı üstü"],
    ["resim yap ".repeat(30),   "uzunluk sınırı üstü (trigger'lı ama uzun)"],
    ["",                        "boş"],
    ["\n\n\n",                  "sadece whitespace"],
  ];

  for (const [girdi, neden] of CASES) {
    const label = girdi.slice(0, 30).replace(/\n/g, "↵") || "(boş)";
    test(`"${label}" → null (${neden})`, () => {
      assert.equal(classify(girdi), null);
    });
  }

  test("bağlaç + tek kategori → null (orchestration olabilir)", () => {
    assert.equal(classify("kod yaz ve test et"), null);
  });

  test("uzunluk sınırı sabiti makul", () => {
    assert.ok(MAX_INPUT_LENGTH >= 50 && MAX_INPUT_LENGTH <= 500);
  });
});

// ── Yanlış-pozitif tuzakları ─────────────────────────────────────────────────

describe("level0 — bilinen tuzaklar", () => {
  test("'gitmek' git'i tetiklememeli (exact-only kök)", () => {
    const r = classify("eve gitmek istiyorum");
    assert.equal(r, null);
  });

  test("'docker image sil' iki kategoriye düşer → null", () => {
    assert.equal(classify("docker image sil"), null);
  });

  test("İngilizce büyük harf: 'DRAW A CAT' eşleşir (tr locale ı sorunu)", () => {
    const r = classify("DRAW A CAT");
    assert.ok(r);
    assert.deepEqual(r.kategoriler, ["resim"]);
  });
});

// ── Meissa entegrasyonu — Seviye 0 isabeti LLM'e gitmez ─────────────────────

describe("level0 — meissa entegrasyonu", () => {
  test("net girdi: _meta.level === 0, error yok, LLM çağrısı yok (hızlı)", async () => {
    const r = await meissa.run("kanka anime çiz");
    assert.equal(r._meta.level, 0);
    assert.equal(r._meta.error, null);
    assert.equal(r.rota, "skill");
    assert.equal(r.skill, "image");
    // LLM çağrısı olmadığının kaba kanıtı: milisaniyeler, saniyeler değil
    assert.ok(r._meta.wall_time_ms < 1000, `wall_time ${r._meta.wall_time_ms}ms — LLM'e gitmiş olabilir`);
  });

  test("boş girdi: level null kalır (guard), empty_input", async () => {
    const r = await meissa.run("");
    assert.equal(r._meta.level, null);
    assert.equal(r._meta.error, "empty_input");
  });

  test("log satırına level alanı yazılır", async () => {
    await meissa.run("selam");
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const file = path.join(meissa.logPath(), `${date}.jsonl`);
    const lines = fs.readFileSync(file, "utf8").trim().split("\n");
    const last  = JSON.parse(lines[lines.length - 1]);
    assert.equal(last.level, 0);
  });
});

after(() => {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
});
