// core/freeenergy.js — FEP Faz 0: Serbest-enerji tabanlı routing (gölge mod)
// Bu modül router.js'in yerini ALMAZ. Gerçek kararı DEĞİŞTİRMEZ.
// Sadece "gölge karar" ile "gerçek karar"ı yan yana telemetry'ye loglar.
//
// scoreOption(tier, surprise, lambda):
//   pragmaticValue(tier) + epistemicValue(tier, surprise) * lambda
//
// pragmaticValue: tier2=0.8 (yüksek kalite), tier1=0.4 (düşük maliyet)
// epistemicValue: tier1 üzerinde yeni girdiler → yüksek keşif değeri
// lambda=0 (varsayılan): saf pragmatik, tier2 her zaman kazanır
// lambda>0: yüksek sürpriz → tier1 gölge kararı olabilir
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

// Tier pragmatik değerleri: quality score (0-1)
const PRAGMATIC = { 1: 0.4, 2: 0.8 };

/**
 * Tier başına epistemik değer:
 * Tier1 (local model) yeni/sürpriz girdide → yüksek keşif fırsatı
 * Tier2 (cloud model) her girdiyi yönetir → düşük ek keşif değeri
 */
function epistemicValue(tier, surprise) {
  return tier === 1 ? surprise * 0.8 : surprise * 0.2;
}

/**
 * Serbest-enerji skoru: pragmatik + epistemik * lambda
 * @param {1|2}   tier     — routing tier
 * @param {number} surprise — 0 (tanıdık) ... 1 (çok yeni)
 * @param {number} lambda   — epistemik ağırlık (0=kapalı, 1=tam)
 */
function scoreOption(tier, surprise, lambda = 0) {
  const prag = PRAGMATIC[tier] ?? 0;
  return prag + epistemicValue(tier, surprise) * lambda;
}

/**
 * Gölge karar: hangi tier FEP skoru göre kazanır?
 * @returns {1|2}
 */
function shadowDecide(surprise, lambda) {
  const s1 = scoreOption(1, surprise, lambda);
  const s2 = scoreOption(2, surprise, lambda);
  return s1 > s2 ? 1 : 2;
}

/**
 * Vault vektörlerine karşı sürpriz hesapla (embed.js ile).
 * Ollama yoksa 0.5 (belirsiz) döner.
 */
async function computeSurprise(text) {
  try {
    const embed = require("./embed.js");
    if (!(await embed.isAvailable())) return 0.5;

    const { loadConfig } = require("./router.js");
    const cfg      = loadConfig();
    const vaultDir = cfg.vaultDir ?? path.join(os.homedir(), ".orion", "vault");
    const vPath    = path.join(String(vaultDir), "vectors.json");

    let vecs = [];
    try { vecs = JSON.parse(fs.readFileSync(vPath, "utf8")); } catch {}
    if (!vecs.length) return 0.5;

    const qvec = await embed.embedText(text.slice(0, 600));
    if (!qvec) return 0.5;

    const { cosineSim } = embed;
    let maxSim = 0;
    for (const entry of vecs.slice(-100)) {
      const sim = cosineSim(qvec, entry.vector);
      if (sim > maxSim) maxSim = sim;
    }
    return +(1 - maxSim).toFixed(4);
  } catch {
    return 0.5;
  }
}

/** FEP gölge modunun etkin olup olmadığını config'den oku */
function isEnabled() {
  try {
    const cfg = require("./router.js").loadConfig();
    return cfg.freeEnergyMode === true;
  } catch { return false; }
}

/** FEP gölge modunu aç/kapa */
function setEnabled(on) {
  require("./router.js").saveConfig({ freeEnergyMode: Boolean(on) });
}

// ── Gölge değerlendirme (tek hesap noktası) ──────────────────────────────────
// router.decide() kancası ve session.js'in shadowLog çağrısı aynı turda aynı
// metinle gelir — kısa ömürlü memo sayesinde sürpriz (embed) bir kez hesaplanır
// ve iki kanal (events + telemetry) aynı değerleri görür.
let _evalMemo = { text: null, ts: 0, promise: null };
const EVAL_MEMO_TTL_MS = 10_000;

/**
 * Metin için gölge FEP değerlendirmesi: { tier, surprise, lambda, scores }
 */
async function evaluateShadow(text) {
  const now = Date.now();
  if (_evalMemo.promise && _evalMemo.text === text && now - _evalMemo.ts < EVAL_MEMO_TTL_MS) {
    return _evalMemo.promise;
  }
  const promise = (async () => {
    const cfg      = require("./router.js").loadConfig();
    const lambda   = cfg.freeEnergyLambda ?? 0.5;
    const surprise = await computeSurprise(text);
    return {
      tier:     shadowDecide(surprise, lambda),
      surprise,
      lambda,
      scores: {
        1: +scoreOption(1, surprise, lambda).toFixed(4),
        2: +scoreOption(2, surprise, lambda).toFixed(4),
      },
    };
  })();
  // Reject durumunda memo'yu temizle: poisoned promise 10s boyunca tüm çağırıcılara
  // dönmesin, bir sonraki çağrı yeniden denesin.
  promise.catch(() => { if (_evalMemo.promise === promise) _evalMemo.promise = null; });
  _evalMemo = { text, ts: now, promise };
  return promise;
}

// ── Oturum içi gölge sayaçları ───────────────────────────────────────────────
// /router shadow-report'un "bu süreç" bölümü buradan okur.
const MAX_SAMPLES = 20;
const shadowStats = {
  total:    0,   // değerlendirilen gerçek karar sayısı
  diverged: 0,   // gölge tier ≠ gerçek tier
  byReason: {},  // normalize reason → { total, diverged }
  samples:  [],  // son MAX_SAMPLES {realDecision, shadowDecision, context}
};

/** Reason'ı sınırlı kardinaliteye indir: thompson ekini at, sayıları N yap */
function normalizeReason(reason) {
  return String(reason ?? "?").replace(/\s*\[.*?\]\s*$/, "").replace(/\d+/g, "N");
}

function getShadowStats() {
  return {
    total:    shadowStats.total,
    diverged: shadowStats.diverged,
    byReason: { ...shadowStats.byReason },
    samples:  [...shadowStats.samples],
  };
}

function resetShadowStats() {
  shadowStats.total    = 0;
  shadowStats.diverged = 0;
  shadowStats.byReason = {};
  shadowStats.samples  = [];
  // Eval memo'yu da temizle: testler resetShadowStats çağırınca bir önceki
  // testin promise'i bir sonraki testi etkilemesin (paylaşımlı singleton).
  _evalMemo = { text: null, ts: 0, promise: null };
}

/**
 * Hesaplanmış gölge kararı kaydet: oturum içi sayaçları güncelle ve
 * core/events.js üzerinden `router_shadow_decision` olayı yayınla.
 * Payload: { realDecision, shadowDecision, context }
 * @param {{ tier: number, backend?: string, model?: string, reason?: string }} realDecision
 * @param {{ tier: number, surprise: number, lambda: number, scores: object }} shadow
 * @param {{ textPreview?: string, tokenCount?: number, mode?: string, sessionId?: string|null }} context
 */
function recordShadow(realDecision, shadow, context = {}) {
  const real = {
    tier:    realDecision.tier,
    backend: realDecision.backend ?? null,
    model:   realDecision.model   ?? null,
    reason:  realDecision.reason  ?? "?",
  };
  const shadowDecision = {
    tier:     shadow.tier,
    surprise: shadow.surprise,
    lambda:   shadow.lambda,
    scores:   shadow.scores,
  };
  const diverges = shadowDecision.tier !== real.tier;

  shadowStats.total++;
  if (diverges) shadowStats.diverged++;
  const rKey = normalizeReason(real.reason);
  if (!shadowStats.byReason[rKey]) shadowStats.byReason[rKey] = { total: 0, diverged: 0 };
  shadowStats.byReason[rKey].total++;
  if (diverges) shadowStats.byReason[rKey].diverged++;

  const ctx = {
    textPreview: String(context.textPreview ?? "").slice(0, 80),
    tokenCount:  context.tokenCount ?? 0,
    mode:        context.mode ?? "agent",
    diverges,
  };
  const sample = { realDecision: real, shadowDecision, context: ctx };
  shadowStats.samples.push(sample);
  if (shadowStats.samples.length > MAX_SAMPLES) shadowStats.samples.shift();

  // Evrensel olay kanalı — EVENT_TYPES.router_shadow_decision (events.js'de kayıtlı)
  try {
    const events = require("./events.js");
    events.emit(events.EVENT_TYPES.router_shadow_decision, context.sessionId ?? null, sample);
  } catch {}

  return sample;
}

/**
 * router.decide() kancası — gerçek kararın yanına gölge kararı hesaplar.
 * Fire-and-forget: senkron döner, hata sessizce yutulur, gerçek karar
 * hiçbir koşulda etkilenmez.
 * @returns {Promise|null} — test için beklenebilir; kapalıysa/geçersizse null
 */
function shadowHook(realDecision, text, context = {}) {
  try {
    if (!realDecision || !isEnabled()) return null;
    return evaluateShadow(String(text ?? ""))
      .then(shadow => recordShadow(realDecision, shadow, { ...context, textPreview: String(text ?? "") }))
      .catch(() => null);
  } catch { return null; }
}

/**
 * Gerçek routing kararının yanına gölge FEP kararını telemetry'ye logla.
 * Fire-and-forget: await etme. (session.js buradan çağırır — kalıcı NDJSON iz.)
 * Events yayını ve oturum içi sayaçlar shadowHook/recordShadow'da yapılır;
 * burada tekrar sayılmaz, sadece kalıcı telemetry kaydı düşülür.
 * @param {{ tier: number, reason: string }} realDecision
 * @param {string} text
 * @param {string|null} sessionId
 * @param {{ record: Function }|null} telemetry
 */
async function shadowLog(realDecision, text, sessionId, telemetry) {
  try {
    if (!isEnabled()) return;

    const shadow   = await evaluateShadow(String(text ?? ""));
    const diverges = shadow.tier !== realDecision.tier;

    if (telemetry?.record) {
      telemetry.record({
        event:       "fep_shadow",
        realTier:    realDecision.tier,
        realReason:  realDecision.reason,
        shadowTier:  shadow.tier,
        surprise:    shadow.surprise,
        lambda:      shadow.lambda,
        scores:      shadow.scores,
        diverges,
      });
    }
  } catch {}
}

/**
 * Kalıcı telemetry loglarından (fep_shadow kayıtları) sapma özeti çıkar.
 * /router shadow-report'un "kalıcı log" bölümü buradan okur.
 */
function aggregateShadowReport(days = 30) {
  const out = { days, sessions: 0, total: 0, diverged: 0, byReason: {}, avgSurprise: 0 };
  try {
    const { listLogs, readLog } = require("./telemetry.js");
    const since = Date.now() - days * 86_400_000;
    let surpriseSum = 0;
    for (const { sessionId, mtime } of listLogs(200)) {
      if (mtime < since) continue;
      let seen = false;
      for (const e of readLog(sessionId)) {
        if (e.event !== "fep_shadow") continue;
        seen = true;
        out.total++;
        if (e.diverges) out.diverged++;
        surpriseSum += e.surprise ?? 0;
        const rKey = normalizeReason(e.realReason);
        if (!out.byReason[rKey]) out.byReason[rKey] = { total: 0, diverged: 0 };
        out.byReason[rKey].total++;
        if (e.diverges) out.byReason[rKey].diverged++;
      }
      if (seen) out.sessions++;
    }
    out.avgSurprise = out.total ? +(surpriseSum / out.total).toFixed(4) : 0;
  } catch (err) {
    // Telemetry okuma hatası raporu sıfıra indirir — "veri yok" ile "okuma hatası"
    // aynı görünür; olayla ayırt edilir kıl.
    require("./events.js").emitSilentCatch("freeenergy.js:aggregateShadowReport", err);
  }
  return out;
}

module.exports = {
  scoreOption, shadowDecide, computeSurprise, isEnabled, setEnabled, shadowLog,
  PRAGMATIC, epistemicValue,
  // gölge telemetri entegrasyonu
  evaluateShadow, recordShadow, shadowHook,
  getShadowStats, resetShadowStats, aggregateShadowReport, normalizeReason,
};
