// core/thompson.js — Thompson Sampling öğrenen router
// Her (taskClass, tier) çifti için Beta dağılımı tutar.
// alpha = başarı sayısı + 1 (prior), beta = başarısızlık sayısı + 1
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HOME       = process.env.ORION_HOME || os.homedir();
const STATE_FILE = path.join(HOME, ".orion", "thompson.json");

// ─── Beta sampling ────────────────────────────────────────────────────────────
// Marsaglia-Tsang Gamma → Beta(a,b) = Gamma(a) / (Gamma(a)+Gamma(b))
function _randn() {
  return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
}
function _gammaSample(alpha) {
  if (alpha < 1) return _gammaSample(1 + alpha) * Math.pow(Math.random(), 1 / alpha);
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = _randn(); v = 1 + c * x; } while (v <= 0);
    v = v ** 3;
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function betaSample(a, b) {
  const x = _gammaSample(a), y = _gammaSample(b);
  return x / (x + y);
}

// ─── Task class ───────────────────────────────────────────────────────────────
// Routing reason'ı 4 sınıfa indirger.
function taskClass(reason = "") {
  if (/chat/i.test(reason))    return "chat";
  if (/complex|keyword/i.test(reason)) return "complex";
  if (/token/i.test(reason))   return "token";
  return "simple";
}

// ─── State I/O ────────────────────────────────────────────────────────────────
const CLASSES = ["chat", "simple", "token", "complex"];
const TIERS   = ["1", "2"];

function _empty() {
  const s = {};
  for (const c of CLASSES) {
    s[c] = {};
    for (const t of TIERS) s[c][t] = { a: 1, b: 1 }; // Beta(1,1) = Uniform prior
  }
  return s;
}

let _cache = null;
function _load() {
  if (_cache) return _cache;
  try { _cache = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { _cache = _empty(); }
  // ensure all keys exist (forward compat)
  for (const c of CLASSES) {
    _cache[c] ??= {};
    for (const t of TIERS) _cache[c][t] ??= { a: 1, b: 1 };
  }
  return _cache;
}

// Debounced disk write: her update() için sync yazma yerine 5sn bekleme
// Bellek her zaman güncel; kapanışta exit hook anlık flush yapar.
let _writeTimer = null;
function _schedulePersist() {
  if (_writeTimer) return;
  _writeTimer = setTimeout(() => { _writeTimer = null; _persist(); }, 5_000);
  _writeTimer.unref(); // timer süreç çıkışını engellemesin
}
function _persist() {
  if (!_cache) return;
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(_cache, null, 2));
  } catch (err) {
    require("./events.ts").emitSilentCatch("thompson.js:_save", err);
  }
}
process.on("exit", _persist);

// ─── Public API ───────────────────────────────────────────────────────────────

// Güncelleme: tier'ın bu taskClass'taki başarısını kaydet
function update(tier, reason, success) {
  const cls   = taskClass(reason);
  const key   = String(tier);
  const state = _load();
  if (!state[cls]?.[key]) return;
  if (success) state[cls][key].a++;
  else         state[cls][key].b++;
  _schedulePersist();
}

// Tavsiye: kural-tabanlı kararın doğru tier mi olduğunu sorgula
// minObs: bir tier için en az bu kadar gözlem gerekli (soğuk başlangıç koruması)
// overrideThreshold: sample farkı bu kadar büyükse diğer tier öneriliyor
function recommend(ruleDecision, minObs = 8, overrideThreshold = 0.18) {
  const cls    = taskClass(ruleDecision.reason ?? "");
  const state  = _load();
  const d1     = state[cls]["1"];
  const d2     = state[cls]["2"];

  const obs1 = d1.a + d1.b - 2; // prior çıkar
  const obs2 = d2.a + d2.b - 2;

  // Yeterli veri yoksa kural kararını döndür
  if (obs1 < minObs || obs2 < minObs) return { ...ruleDecision, thompsonNote: null, _thompsonOverride: false };

  // 5 sample ortalama al — varyansı azalt
  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < 5; i++) { sum1 += betaSample(d1.a, d1.b); sum2 += betaSample(d2.a, d2.b); }
  const s1 = sum1 / 5, s2 = sum2 / 5;

  const prefTier = s1 >= s2 ? 1 : 2;
  const delta    = Math.abs(s1 - s2);
  const note     = `thompson(${cls}) t${prefTier}=${( prefTier === 1 ? s1 : s2).toFixed(2)} t${prefTier === 1 ? 2 : 1}=${(prefTier === 1 ? s2 : s1).toFixed(2)}`;

  if (prefTier !== ruleDecision.tier && delta > overrideThreshold) {
    const isOverride = true;
    return { ...ruleDecision, tier: prefTier, reason: `${ruleDecision.reason} [${note} → override]`, _thompsonOverride: isOverride };
  }
  return { ...ruleDecision, reason: `${ruleDecision.reason} [${note}]`, _thompsonOverride: false };
}

// İstatistik özeti (/stats ve /router için)
function summary() {
  const state = _load();
  const rows  = [];
  for (const cls of CLASSES) {
    for (const t of TIERS) {
      const { a, b } = state[cls][t];
      const obs  = a + b - 2;
      const mean = (a / (a + b)).toFixed(2);
      rows.push({ cls, tier: t, obs, mean });
    }
  }
  return rows;
}

module.exports = { update, recommend, summary, taskClass, betaSample };
