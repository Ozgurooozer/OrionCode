// tests/freeenergy-shadow.test.js — FEP gölge modu telemetri entegrasyonu
// router.decide() → shadowHook → router_shadow_decision olayı + oturum içi sayaç
// Gerçek karar hiçbir koşulda değişmez; gölge hatası akışı etkilemez.
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME — require'lardan ÖNCE
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-fep-shadow-"));
process.env.ORION_HOME = HOME;
fs.mkdirSync(path.join(HOME, ".orion"), { recursive: true });

const { test } = require("node:test");
const assert   = require("node:assert");

const router     = require("../core/router.ts");
const freeenergy = require("../core/freeenergy.ts");
const events     = require("../core/events.ts");

// Not: temp vault'ta vectors.json yok → computeSurprise deterministik 0.5 döner
// (Ollama açık olsa bile). lambda config'de yok → 0.5. Bu ikiliyle gölge karar
// her zaman tier2'dir: s1 = 0.4 + 0.5*0.8*0.5 = 0.6 < s2 = 0.8 + 0.5*0.2*0.5 = 0.85.

function onceEvent(type, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`olay zaman aşımı: ${type}`)), ms);
    events.emitter.once(type, ev => { clearTimeout(timer); resolve(ev); });
  });
}

async function waitFor(cond, ms = 10_000, step = 25) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (cond()) return true;
    await new Promise(r => setTimeout(r, step));
  }
  return cond();
}

// ── Test 1: kapalıyken gölge üretilmez ───────────────────────────────────────
test("gölge: FEP kapalıyken shadowHook null döner, sayaç ilerlemez", () => {
  freeenergy.setEnabled(false);
  freeenergy.resetShadowStats();
  const p = freeenergy.shadowHook({ tier: 1, reason: "balanced default" }, "selam", { tokenCount: 10, mode: "agent" });
  assert.strictEqual(p, null, "kapalıyken null dönmeli");
  const r = router.decide("selam nasılsın", { tokenCount: 50, mode: "agent" });
  assert.strictEqual(r.tier, 1, "gerçek karar normal çalışmalı");
  assert.strictEqual(freeenergy.getShadowStats().total, 0, "sayaç 0 kalmalı");
});

// ── Test 2: recordShadow — sayaç + router_shadow_decision olayı ──────────────
test("gölge: recordShadow sayaçları günceller ve router_shadow_decision yayınlar", async () => {
  freeenergy.resetShadowStats();
  const evP = onceEvent(events.EVENT_TYPES.router_shadow_decision);

  const real   = { tier: 1, backend: "ollama", model: "qwen2.5-coder:7b", reason: "balanced default" };
  const shadow = { tier: 2, surprise: 0.3, lambda: 0.5, scores: { 1: 0.52, 2: 0.83 } };
  const sample = freeenergy.recordShadow(real, shadow, { textPreview: "örnek metin", tokenCount: 42, mode: "agent", sessionId: "test-oturum" });

  const ev = await evP;
  assert.strictEqual(ev.type, events.EVENT_TYPES.router_shadow_decision);
  assert.strictEqual(ev.sessionId, "test-oturum");
  // Payload şeması: { realDecision, shadowDecision, context }
  assert.deepStrictEqual(ev.payload.realDecision,   { tier: 1, backend: "ollama", model: "qwen2.5-coder:7b", reason: "balanced default" });
  assert.deepStrictEqual(ev.payload.shadowDecision, { tier: 2, surprise: 0.3, lambda: 0.5, scores: { 1: 0.52, 2: 0.83 } });
  assert.strictEqual(ev.payload.context.diverges, true, "tier1 ≠ tier2 → sapma");
  assert.strictEqual(ev.payload.context.textPreview, "örnek metin");
  assert.strictEqual(ev.payload.context.tokenCount, 42);
  assert.deepStrictEqual(ev.payload, sample, "emit edilen payload dönen sample ile aynı olmalı");

  const stats = freeenergy.getShadowStats();
  assert.strictEqual(stats.total, 1);
  assert.strictEqual(stats.diverged, 1);
  assert.strictEqual(stats.byReason["balanced default"].diverged, 1);
  assert.strictEqual(stats.samples.length, 1);

  // Aynı tier → sapma yok
  freeenergy.recordShadow({ tier: 2, reason: "complex task keywords" }, { tier: 2, surprise: 0.1, lambda: 0.5, scores: { 1: 0.44, 2: 0.81 } }, {});
  const stats2 = freeenergy.getShadowStats();
  assert.strictEqual(stats2.total, 2);
  assert.strictEqual(stats2.diverged, 1, "tier eşleşince sapma sayılmamalı");
});

// ── Test 3: decide() açıkken olay yayınlar, gerçek karar değişmez ────────────
test("gölge: FEP açıkken decide() router_shadow_decision yayınlar, gerçek karar aynı kalır", async () => {
  freeenergy.setEnabled(true);
  freeenergy.resetShadowStats();

  const evP = onceEvent(events.EVENT_TYPES.router_shadow_decision);
  const r = router.decide("merhaba dünya", { tokenCount: 10, mode: "agent" });
  assert.strictEqual(r.tier, 1, "gerçek karar: basit metin → tier1 (değişmemeli)");

  const ev = await evP;
  assert.strictEqual(ev.payload.realDecision.tier, 1);
  assert.ok([1, 2].includes(ev.payload.shadowDecision.tier), "gölge tier 1 veya 2 olmalı");
  assert.strictEqual(typeof ev.payload.shadowDecision.surprise, "number");
  assert.strictEqual(typeof ev.payload.shadowDecision.lambda, "number");
  assert.ok(ev.payload.shadowDecision.scores, "scoreOption skorları payload'da olmalı");
  assert.strictEqual(typeof ev.payload.context.diverges, "boolean");
});

// ── Test 4: simüle oturum — açık/kapalı aynı karar + beklenen sapma oranı ────
test("gölge: simüle oturumda gerçek kararlar FEP'ten bağımsız, sapma sayısı deterministik", async () => {
  // 6 tur: 3 basit (tier1), 2 karmaşık kelime (tier2), 1 büyük context (tier2)
  const turns = [
    ["selam nasılsın bugün",                          { tokenCount: 50,   mode: "agent" }],
    ["hava bugün çok güzel görünüyor",                { tokenCount: 60,   mode: "agent" }],
    ["bana kısa bir masal anlatır mısın",             { tokenCount: 40,   mode: "agent" }],
    ["debug this bug and fix the test",               { tokenCount: 50,   mode: "agent" }],
    ["refactor and optimize the security design",     { tokenCount: 70,   mode: "agent" }],
    ["selam",                                         { tokenCount: 5000, mode: "agent" }],
  ];

  // Önce KAPALI: referans kararlar
  freeenergy.setEnabled(false);
  const offTiers = turns.map(([t, o]) => router.decide(t, o).tier);
  assert.deepStrictEqual(offTiers, [1, 1, 1, 2, 2, 2], "referans tier dağılımı");

  // Sonra AÇIK: kararlar aynı kalmalı, gölge olaylar birikmeli
  freeenergy.setEnabled(true);
  freeenergy.resetShadowStats();
  const onTiers = turns.map(([t, o]) => router.decide(t, o).tier);
  assert.deepStrictEqual(onTiers, offTiers, "FEP açıkken gerçek kararlar DEĞİŞMEMELİ");

  const done = await waitFor(() => freeenergy.getShadowStats().total >= turns.length);
  assert.ok(done, "tüm gölge değerlendirmeleri tamamlanmalı");

  const stats = freeenergy.getShadowStats();
  assert.strictEqual(stats.total, turns.length);
  // surprise=0.5, lambda=0.5 → gölge hep tier2 → sapma = tier1 gerçek karar sayısı = 3
  assert.strictEqual(stats.diverged, 3, "sapma yalnız tier1 gerçek kararlarında olmalı");
  for (const s of stats.samples) {
    assert.strictEqual(s.shadowDecision.tier, 2, "bu konfigde gölge hep tier2");
    assert.strictEqual(s.context.diverges, s.realDecision.tier !== 2);
  }
});

// ── Test 5: gölge hatası gerçek akışı bozmaz ─────────────────────────────────
test("gölge: bozuk girdilerle shadowHook fırlatmaz, decide etkilenmez", async () => {
  freeenergy.setEnabled(true);
  assert.strictEqual(freeenergy.shadowHook(null, "x"), null, "realDecision yoksa null");
  await assert.doesNotReject(async () => { await freeenergy.shadowHook({ tier: 1 }, undefined); });
  await assert.doesNotReject(async () => { await freeenergy.shadowHook({ tier: 1, reason: null }, ""); });
  const r = router.decide("selam nasılsın", { tokenCount: 50, mode: "agent" });
  assert.strictEqual(r.tier, 1, "gerçek akış çalışmaya devam etmeli");
});

// ── Test 6: shadowLog — kalıcı telemetry kaydı, sayaçlara dokunmaz ───────────
test("gölge: shadowLog fep_shadow telemetry kaydı düşer, oturum sayaçlarını çift saymaz", async () => {
  freeenergy.setEnabled(true);
  freeenergy.resetShadowStats();

  const records = [];
  const fakeTelemetry = { record: d => records.push(d) };
  await freeenergy.shadowLog({ tier: 2, reason: "complex task keywords" }, "analyze and refactor this module", "sess-1", fakeTelemetry);

  assert.strictEqual(records.length, 1);
  const rec = records[0];
  assert.strictEqual(rec.event, "fep_shadow");
  assert.strictEqual(rec.realTier, 2);
  assert.ok([1, 2].includes(rec.shadowTier));
  assert.strictEqual(typeof rec.diverges, "boolean");
  assert.ok(rec.scores && typeof rec.surprise === "number" && typeof rec.lambda === "number");

  // events/sayaç tarafı shadowHook'un işi — shadowLog çift saymamalı
  assert.strictEqual(freeenergy.getShadowStats().total, 0, "shadowLog sayaç ilerletmemeli");
});

// ── Test 7: aggregateShadowReport — kalıcı NDJSON'dan sapma özeti ────────────
test("gölge: aggregateShadowReport fep_shadow kayıtlarını sayar ve reason'ı normalize eder", () => {
  const logsDir = path.join(HOME, ".orion", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const lines = [
    { ts: Date.now(), session: "sim-fep", event: "turn_start", backend: "ollama", model: "x" },
    { ts: Date.now(), session: "sim-fep", event: "fep_shadow", realTier: 1, realReason: "balanced default",        shadowTier: 2, surprise: 0.5, lambda: 0.5, scores: { 1: 0.6, 2: 0.85 }, diverges: true },
    { ts: Date.now(), session: "sim-fep", event: "fep_shadow", realTier: 2, realReason: "token count 1234 > 800",  shadowTier: 2, surprise: 0.4, lambda: 0.5, scores: { 1: 0.56, 2: 0.84 }, diverges: false },
    { ts: Date.now(), session: "sim-fep", event: "fep_shadow", realTier: 1, realReason: "chat mode",               shadowTier: 2, surprise: 0.6, lambda: 0.5, scores: { 1: 0.64, 2: 0.86 }, diverges: true },
    { ts: Date.now(), session: "sim-fep", event: "turn_complete", costUSD: 0 },
  ];
  fs.writeFileSync(path.join(logsDir, "sim-fep.ndjson"), lines.map(l => JSON.stringify(l)).join("\n") + "\n");

  const agg = freeenergy.aggregateShadowReport(30);
  assert.strictEqual(agg.total, 3, "3 fep_shadow kaydı sayılmalı");
  assert.strictEqual(agg.diverged, 2);
  assert.strictEqual(agg.sessions, 1);
  assert.ok(Math.abs(agg.avgSurprise - 0.5) < 1e-9, `ortalama sürpriz 0.5 olmalı (${agg.avgSurprise})`);
  assert.ok(agg.byReason["token count N > N"], "sayılar N'e normalize edilmeli");
  assert.strictEqual(agg.byReason["balanced default"].diverged, 1);
});

// ── Test 8: /router shadow-report komutu hata vermez ─────────────────────────
test("/router shadow-report: komut tanınır, hata vermez", async () => {
  const cmd = require("../core/commands/router.ts")[0];
  await assert.doesNotReject(() => cmd.exec({ args: ["shadow-report"] }), "shadow-report hata vermemeli");
  await assert.doesNotReject(() => cmd.exec({ args: ["shadow", "7"] }), "shadow kısayolu hata vermemeli");
  // Temizlik: modu kapat
  freeenergy.setEnabled(false);
});
