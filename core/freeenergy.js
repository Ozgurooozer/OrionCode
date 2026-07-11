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

/**
 * Gerçek routing kararının yanına gölge FEP kararını telemetry'ye logla.
 * Fire-and-forget: await etme.
 * @param {{ tier: number, reason: string }} realDecision
 * @param {string} text
 * @param {string|null} sessionId
 * @param {{ record: Function }|null} telemetry
 */
async function shadowLog(realDecision, text, sessionId, telemetry) {
  try {
    if (!isEnabled()) return;

    const cfg      = require("./router.js").loadConfig();
    const lambda   = cfg.freeEnergyLambda ?? 0.5;
    const surprise = await computeSurprise(text);
    const shadowTier = shadowDecide(surprise, lambda);
    const s1 = +scoreOption(1, surprise, lambda).toFixed(4);
    const s2 = +scoreOption(2, surprise, lambda).toFixed(4);

    const diverges = shadowTier !== realDecision.tier;

    if (telemetry?.record) {
      telemetry.record({
        event:       "fep_shadow",
        realTier:    realDecision.tier,
        realReason:  realDecision.reason,
        shadowTier,
        surprise,
        lambda,
        scores:      { 1: s1, 2: s2 },
        diverges,
      });
    }
  } catch {}
}

module.exports = { scoreOption, shadowDecide, computeSurprise, isEnabled, setEnabled, shadowLog, PRAGMATIC, epistemicValue };
