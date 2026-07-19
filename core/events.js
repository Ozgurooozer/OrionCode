// core/events.js — Orion evrensel olay yayın kanalı
// TUI, HTTP/SSE istemcileri, ileride node-graph / Babylon editörü aynı akışa bağlanır.
// Singleton emitter — tüm modüller aynı örneği require eder.
"use strict";

const { EventEmitter } = require("events");

// ── Olay şeması ──────────────────────────────────────────────────────────────
// Her olay: { type, sessionId, timestamp, payload }
//
//   tool_start        payload: { tool, input }
//   tool_end          payload: { tool, latencyMs, ok, error? }
//   diff              payload: { tool, path, diff, added, removed }
//   thinking_delta    payload: { thinking }                     (Anthropic extended thinking)
//   text_delta        payload: { delta }                        (streaming token)
//   approval_request  payload: { tool, input, reason }         (mode izin kontrolü → reddedildi)
//   approval_resolved payload: { tool, ok, reason? }           (izin sonucu)
//   error             payload: { message, backend?, code? }
//   session_saved     payload: { sessionId, file? }
//   weakness_mined    payload: { file, groups, date }          (daemon idle-time raporu)
//   silent_catch_hit  payload: { site: "dosya:fonksiyon", error, detail? }
//                     (sessizce yutulan catch bloğu tetiklendi — "başarılı" ile
//                      "sessizce başarısız" ayrımı için görünürlük kanalı)
//
// NDJSON serialize: toNDJSON(event) → satır sonu dahil string.
// Gelecek: 1 saatlik TTL cache tipi gibi yeni alanlar payload içinde genişletilir.

const EVENT_TYPES = Object.freeze({
  tool_start:        "tool_start",
  tool_end:          "tool_end",
  diff:              "diff",
  thinking_delta:    "thinking_delta",
  text_delta:        "text_delta",
  approval_request:  "approval_request",
  approval_resolved: "approval_resolved",
  error:             "error",
  session_saved:     "session_saved",
  weakness_mined:    "weakness_mined",
  security_boundary_hit: "security_boundary_hit", // fs aracı çalışma kökü dışına yazma/okuma denedi
  speculex_hit:      "speculex_hit",       // spekülatif tier1 tahmini tier2 kararıyla eşleşti
  speculex_miss:     "speculex_miss",      // spekülatif tahmin ıskaladı, cache atıldı
  router_shadow_decision: "router_shadow_decision", // FEP gölge kararı: {realDecision, shadowDecision, context}
  silent_catch_hit:  "silent_catch_hit",    // sessiz catch bloğu tetiklendi: {site, error, detail?}
});

const emitter = new EventEmitter();
emitter.setMaxListeners(64); // çok sayıda SSE istemcisi için
// Node.js "error" event type: listener yoksa throw eder — logla ve yut
emitter.on("error", (err) => {
  try { process.stderr.write(`[orion:events] error event: ${err?.message ?? err}\n`); } catch {}
});

/**
 * Standart bir olay yayınla.
 * @param {string} type        — EVENT_TYPES'den bir değer
 * @param {string|null} sessionId
 * @param {object} payload
 * @returns {{ type, sessionId, timestamp, payload }}
 */
function emit(type, sessionId, payload = {}) {
  const event = {
    type,
    sessionId: sessionId ?? null,
    timestamp: Date.now(),
    payload,
  };
  emitter.emit("event", event);  // evrensel dinleyici (SSE, test harness)
  emitter.emit(type,   event);  // tip bazlı dinleyici (on("text_delta") gibi)
  return event;
}

/** Olay → NDJSON satırı (satır sonu dahil) */
function toNDJSON(event) {
  return JSON.stringify(event) + "\n";
}

/**
 * Sessizce yutulan catch blokları için ortak görünürlük yardımcısı.
 * Kendisi asla fırlatmaz — görünürlük mekanizması akışı bozamaz.
 * @param {string} site        — "dosya:fonksiyon" biçiminde konum
 * @param {*} err              — yakalanan hata (Error ya da başka değer)
 * @param {string|null} sessionId
 * @param {*} [detail]         — opsiyonel ek bağlam (ör. hangi alt-adım)
 */
function emitSilentCatch(site, err, sessionId = null, detail = undefined) {
  try {
    emit(EVENT_TYPES.silent_catch_hit, sessionId, {
      site,
      error: String(err?.message ?? err ?? "unknown").slice(0, 300),
      ...(detail !== undefined ? { detail } : {}),
    });
  } catch {}
}

module.exports = { emitter, emit, toNDJSON, emitSilentCatch, EVENT_TYPES };
