// tests/silent-catch.test.js — sessiz catch görünürlüğü: silent_catch_hit olayı
// Sistemik desen: hata sessizce yutulup "başarı gibi" raporlanıyordu.
// Bu testler (1) events.emitSilentCatch sözleşmesini, (2) gerçek iki sitenin
// (extract.js:extractWithOllama, i18n.js:setLocale) olayı fiilen yayınladığını doğrular.
"use strict";

// router.js HOME'u require anında okur — gerçek ~/.orion'a bağımlı kalmamak için
// herhangi bir core modülü require edilmeden ÖNCE boş bir dizine yönlendir.
process.env.ORION_HOME = require("os").tmpdir() + "\\orion-silent-catch-test-" + process.pid;

const { test, after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");

const events = require("../core/events.ts");

after(() => {
  try { fs.rmSync(process.env.ORION_HOME, { recursive: true, force: true }); } catch {}
});

// ── 1) EVENT_TYPES kaydı ──────────────────────────────────────────────────────
test("EVENT_TYPES: silent_catch_hit kayıtlı", () => {
  assert.strictEqual(events.EVENT_TYPES.silent_catch_hit, "silent_catch_hit");
});

// ── 2) emitSilentCatch şeması ────────────────────────────────────────────────
test("emitSilentCatch: {site, error, detail?} şemasıyla yayınlar", () => {
  const seen = [];
  const listener = e => seen.push(e);
  events.emitter.on("silent_catch_hit", listener);

  events.emitSilentCatch("ornek.js:fonksiyon", new Error("disk dolu"), "sess-1", "alt-adim");
  events.emitSilentCatch("ornek.js:fonksiyon2", "string hata"); // Error olmayan değer + detail yok

  events.emitter.off("silent_catch_hit", listener);

  assert.strictEqual(seen.length, 2);
  assert.strictEqual(seen[0].type, "silent_catch_hit");
  assert.strictEqual(seen[0].sessionId, "sess-1");
  assert.strictEqual(seen[0].payload.site, "ornek.js:fonksiyon");
  assert.strictEqual(seen[0].payload.error, "disk dolu");
  assert.strictEqual(seen[0].payload.detail, "alt-adim");

  assert.strictEqual(seen[1].sessionId, null);
  assert.strictEqual(seen[1].payload.error, "string hata");
  assert.ok(!("detail" in seen[1].payload), "detail verilmediyse payload'da olmamalı");
});

// ── 3) emitSilentCatch asla fırlatmaz ────────────────────────────────────────
test("emitSilentCatch: dinleyici fırlatsa bile kendisi fırlatmaz", () => {
  const bomb = () => { throw new Error("dinleyici patladı"); };
  events.emitter.on("silent_catch_hit", bomb);
  try {
    assert.doesNotThrow(() => events.emitSilentCatch("x.js:y", new Error("z")));
  } finally {
    events.emitter.off("silent_catch_hit", bomb);
  }
});

// ── 4) Gerçek site: extract.js:extractWithOllama ─────────────────────────────
// Ollama tamamen erişilemezken 3 deneme de düşer → manuel yedek döner AMA artık
// silent_catch_hit olayı hatanın nedenini taşır ("başarı gibi" görünmez).
test("extractWithOllama: manuel yedeğe düşüş silent_catch_hit yayınlar", async () => {
  const { extractWithOllama } = require("../core/extract.ts");

  const origFetch = global.fetch;
  global.fetch = async () => { throw new Error("ECONNREFUSED test-ollama-yok"); };

  const seen = [];
  const listener = e => seen.push(e);
  events.emitter.on("silent_catch_hit", listener);

  let result;
  try {
    result = await extractWithOllama("[user]: merhaba\n[assistant]: selam");
  } finally {
    global.fetch = origFetch;
    events.emitter.off("silent_catch_hit", listener);
  }

  // Dönüş sözleşmesi değişmedi: manuel yedek işareti duruyor
  assert.ok(result.tags.includes("manuel"), "manuel yedek dönmeli");

  // Ama başarısızlık artık görünür
  const hit = seen.find(e => e.payload.site === "extract.js:extractWithOllama");
  assert.ok(hit, "extract.js:extractWithOllama için silent_catch_hit yayınlanmalı");
  assert.match(hit.payload.error, /ECONNREFUSED test-ollama-yok/);
  assert.strictEqual(hit.payload.detail, "manuel-fallback");
});

// ── 5) Gerçek site: i18n.js:setLocale ────────────────────────────────────────
// saveConfig fırlatırsa dil bellekte değişir (dönüş aynı) ama kalıcılaşmadığı
// artık olay kanalından görülür.
test("setLocale: saveConfig hatası silent_catch_hit yayınlar, dönüş bozulmaz", () => {
  const router = require("../core/router.ts");
  const i18n   = require("../core/i18n.ts");

  const origSave = router.saveConfig;
  router.saveConfig = () => { throw new Error("EACCES config yazılamadı"); };

  const seen = [];
  const listener = e => seen.push(e);
  events.emitter.on("silent_catch_hit", listener);

  let ret;
  try {
    ret = i18n.setLocale("tr");
  } finally {
    router.saveConfig = origSave;
    events.emitter.off("silent_catch_hit", listener);
    i18n.setLocale("en"); // süreç-içi durumu geri al (bu sefer gerçek saveConfig, temp HOME'a yazar)
  }

  assert.strictEqual(ret, "tr", "dönüş değeri (string locale) değişmemeli");
  const hit = seen.find(e => e.payload.site === "i18n.js:setLocale");
  assert.ok(hit, "i18n.js:setLocale için silent_catch_hit yayınlanmalı");
  assert.match(hit.payload.error, /EACCES/);
});
