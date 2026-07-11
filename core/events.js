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
});

const emitter = new EventEmitter();
emitter.setMaxListeners(64); // çok sayıda SSE istemcisi için
// Node.js "error" event type: listener yoksa throw eder — no-op handler zorunlu
emitter.on("error", () => {});

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
  emitter.emit("event", event);  // evrensel dinleyici (SSE gibi)
  emitter.emit(type,   event);  // tip bazlı dinleyici
  return event;
}

/** Olay → NDJSON satırı (satır sonu dahil) */
function toNDJSON(event) {
  return JSON.stringify(event) + "\n";
}

module.exports = { emitter, emit, toNDJSON, EVENT_TYPES };
