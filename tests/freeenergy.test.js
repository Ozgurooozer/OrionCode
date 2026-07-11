// tests/freeenergy.test.js — İş C: FEP Faz 0 gölge mod testleri
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-fep-"));
process.env.ORION_HOME = HOME;
fs.mkdirSync(path.join(HOME, ".orion"), { recursive: true });

const { test } = require("node:test");
const assert   = require("node:assert");

const { scoreOption, shadowDecide, PRAGMATIC, epistemicValue, isEnabled, setEnabled } = require("../core/freeenergy.js");

// ── Test 1: lambda=0 → saf pragmatik, tier2 her zaman kazanır ────────────────
test("FEP: lambda=0 → tier2 her zaman kazanır (saf pragmatik)", () => {
  for (const surprise of [0, 0.3, 0.5, 0.8, 1.0]) {
    const s1 = scoreOption(1, surprise, 0);
    const s2 = scoreOption(2, surprise, 0);
    assert.ok(s2 > s1, `surprise=${surprise}: tier2 (${s2.toFixed(3)}) > tier1 (${s1.toFixed(3)}) olmalı`);
    assert.strictEqual(shadowDecide(surprise, 0), 2, `lambda=0 her zaman tier2 seçmeli`);
  }
});

// ── Test 2: lambda=1, yüksek sürpriz → tier1 kazanır ─────────────────────────
test("FEP: lambda=1, surprise=1.0 → tier1 gölge karar", () => {
  const surprise = 1.0;
  const lambda   = 1.0;
  const s1 = scoreOption(1, surprise, lambda);
  const s2 = scoreOption(2, surprise, lambda);
  assert.ok(s1 > s2, `yüksek sürpriz + yüksek lambda: tier1 (${s1}) > tier2 (${s2}) olmalı`);
  assert.strictEqual(shadowDecide(surprise, lambda), 1, "tier1 gölge karar vermeli");
});

// ── Test 3: lambda=1, düşük sürpriz → tier2 kazanır ──────────────────────────
test("FEP: lambda=1, surprise=0.0 → tier2 gölge karar", () => {
  const surprise = 0.0;
  const lambda   = 1.0;
  const s1 = scoreOption(1, surprise, lambda);
  const s2 = scoreOption(2, surprise, lambda);
  assert.ok(s2 > s1, `düşük sürpriz: tier2 (${s2}) > tier1 (${s1}) olmalı`);
  assert.strictEqual(shadowDecide(surprise, lambda), 2, "tier2 gölge karar vermeli");
});

// ── Test 4–13: 10 sentetik senaryo — mantıklı sıralama ───────────────────────
// Yüksek belirsizlik (surprise→1) + yüksek lambda → tier1 tercih
// Düşük belirsizlik (surprise→0) veya düşük lambda → tier2 tercih
const scenarios = [
  // [surprise, lambda, expectedWinner, desc]
  [0.0, 0.5, 2, "tanıdık konu, orta lambda → tier2"],
  [0.2, 0.5, 2, "düşük sürpriz, orta lambda → tier2"],
  [0.5, 0.5, 2, "orta sürpriz, orta lambda → tier2 (hâlâ pragmatik kazanır)"],
  [1.0, 1.0, 1, "max sürpriz, max lambda → tier1 (tam epistemik)"],
  [0.9, 1.0, 1, "çok yüksek sürpriz, max lambda → tier1"],
  [0.9, 0.8, 1, "çok yüksek sürpriz (0.9), yüksek lambda → tier1"],
  [0.0, 1.0, 2, "sıfır sürpriz, max lambda → tier2 (epistemik yok)"],
  [0.3, 0.0, 2, "herhangi sürpriz, lambda=0 → tier2 (saf pragmatik)"],
  [1.0, 0.0, 2, "max sürpriz ama lambda=0 → tier2 (kapalı)"],
  [0.7, 1.0, 1, "orta-yüksek sürpriz (0.7), max lambda → tier1"],
];

for (const [i, [surprise, lambda, expected, desc]] of scenarios.entries()) {
  test(`Senaryo ${i + 4}: ${desc}`, () => {
    const winner = shadowDecide(surprise, lambda);
    const s1 = scoreOption(1, surprise, lambda);
    const s2 = scoreOption(2, surprise, lambda);
    assert.strictEqual(winner, expected,
      `surprise=${surprise}, lambda=${lambda}: tier${expected} bekleniyor ama tier${winner} geldi (s1=${s1.toFixed(3)}, s2=${s2.toFixed(3)})`);
  });
}

// ── Test 14: PRAGMATIC değerleri doğru ───────────────────────────────────────
test("PRAGMATIC: tier2 > tier1 kalite değerleri", () => {
  assert.ok(PRAGMATIC[2] > PRAGMATIC[1], "tier2 pragmatik değeri tier1'den yüksek olmalı");
  assert.ok(PRAGMATIC[1] > 0, "tier1 pragmatik değeri > 0");
  assert.ok(PRAGMATIC[2] <= 1, "tier2 pragmatik değeri <= 1");
});

// ── Test 15: epistemicValue — tier1 yüksek sürprizde daha fazla değer alır ───
test("epistemicValue: tier1 > tier2 aynı sürpriz için", () => {
  for (const surprise of [0.3, 0.7, 1.0]) {
    const ev1 = epistemicValue(1, surprise);
    const ev2 = epistemicValue(2, surprise);
    assert.ok(ev1 > ev2, `surprise=${surprise}: tier1 epistemik değeri (${ev1}) > tier2 (${ev2}) olmalı`);
  }
});

// ── Test 16: isEnabled / setEnabled — config'den okunur ──────────────────────
test("FEP: isEnabled/setEnabled config'de freeEnergyMode yazar", () => {
  // Başlangıçta kapalı
  const initialState = isEnabled();
  assert.strictEqual(typeof initialState, "boolean", "isEnabled boolean döndürmeli");

  // setEnabled test etmek için config dosyasını izole et
  const cfgPath = path.join(HOME, ".orion", "config.json");
  fs.writeFileSync(cfgPath, JSON.stringify({ freeEnergyMode: false }));

  delete require.cache[require.resolve("../core/router.js")];
  delete require.cache[require.resolve("../core/freeenergy.js")];
  const { isEnabled: ie, setEnabled: se } = require("../core/freeenergy.js");

  assert.strictEqual(ie(), false, "başlangıçta kapalı olmalı");
  se(true);
  delete require.cache[require.resolve("../core/router.js")];
  delete require.cache[require.resolve("../core/freeenergy.js")];
  const { isEnabled: ie2 } = require("../core/freeenergy.js");
  assert.strictEqual(ie2(), true, "setEnabled(true) sonrası açık olmalı");

  // Temizle
  try { fs.unlinkSync(cfgPath); } catch {}
  delete require.cache[require.resolve("../core/router.js")];
  delete require.cache[require.resolve("../core/freeenergy.js")];
});

// ── Test 17: /router freeenergy komutu hata vermez ───────────────────────────
test("/router freeenergy: subcommand tanınır, hata vermez", async () => {
  delete require.cache[require.resolve("../core/commands/router.js")];
  delete require.cache[require.resolve("../core/freeenergy.js")];
  delete require.cache[require.resolve("../core/router.js")];
  const cmd = require("../core/commands/router.js")[0];
  await assert.doesNotReject(() => cmd.exec({ args: ["freeenergy"] }), "status sorgusu hata vermemeli");
  await assert.doesNotReject(() => cmd.exec({ args: ["freeenergy", "on"] }), "freeenergy on hata vermemeli");
  await assert.doesNotReject(() => cmd.exec({ args: ["freeenergy", "off"] }), "freeenergy off hata vermemeli");
});
