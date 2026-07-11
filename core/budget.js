// core/budget.js — Token sayımı, maliyet tahmini, bütçe takibi
"use strict";

// Güncel Anthropic fiyatları (doğrulama: docs.anthropic.com, Temmuz 2026)
// [inputPerMToken, outputPerMToken] USD
const PRICES = {
  "claude-opus-4-8":             [ 5.00, 25.00],  // güncellendi: Opus 4.8 = $5 in/$25 out (Opus 4.1 deprecated $15/$75'ten farklı)
  "claude-sonnet-4-6":           [ 3.00, 15.00],
  "claude-haiku-4-5-20251001":   [ 0.80,  4.00],  // docs $1 in gösteriyor ama output belirsiz, muhafazakar değer korundu
  "claude-haiku-3":              [ 0.25,  1.25],
  "gpt-4o":                      [ 5.00, 15.00],
  "gpt-4o-mini":                 [ 0.15,  0.60],
  "mistralai/mistral-7b-instruct:free": [0, 0],
};

// Prompt cache çarpanları — 5 dakikalık ephemeral cache (docs.anthropic.com, Temmuz 2026)
// Not: 1 saatlik cache için 2.0× write, 0.10× read — bu implementasyon ephemeral (1.25×) kullanır.
const CACHE_WRITE_MULT = 1.25; // %25 premium — cache oluşturma maliyeti
const CACHE_READ_MULT  = 0.10; // %90 indirim  — cache okuma (base rate'in %10'u)

// Tiktoken — lazy load, graceful fallback
let _enc = null;
function _getEnc() {
  if (_enc) return _enc;
  try {
    const { get_encoding } = require("js-tiktoken");
    _enc = get_encoding("cl100k_base");
  } catch {}
  return _enc;
}

function countTokens(text) {
  if (!text) return 0;
  const enc = _getEnc();
  if (enc) return enc.encode(text).length;
  return Math.ceil(text.length / 4); // rough fallback
}

function countMessages(messages, systemPrompt = "") {
  let total = countTokens(systemPrompt) + 3; // system overhead
  for (const m of messages) {
    const content = typeof m.content === "string"
      ? m.content
      : JSON.stringify(m.content);
    total += countTokens(content) + 4; // role + separators
  }
  return total;
}

/**
 * estimateCost: cache kullanımını yansıtan maliyet hesabı.
 * Anthropic API kullanım raporundan:
 *   inputTokens      = usage.input_tokens (cache dışı — normal rate)
 *   cacheReadTokens  = usage.cache_read_input_tokens (0.1× rate)
 *   cacheWriteTokens = usage.cache_creation_input_tokens (1.25× rate)
 *
 * @param {number} inputTokens   — cache dışında kalan girdi token
 * @param {number} outputTokens  — çıktı token
 * @param {string} model         — model ID
 * @param {{cacheReadTokens?: number, cacheWriteTokens?: number}} cache
 */
function estimateCost(inputTokens, outputTokens, model, cache = {}) {
  if (!model || model.length < 4) return 0; // boş/kısa ad eşleşmesin
  const key = Object.keys(PRICES).find(k => model.includes(k) || k.includes(model));
  if (!key) return 0; // local/unknown = free
  const [inRate, outRate] = PRICES[key];

  const cacheRead  = cache.cacheReadTokens  ?? 0;
  const cacheWrite = cache.cacheWriteTokens ?? 0;

  return (
    inputTokens  * inRate  +
    outputTokens * outRate +
    cacheRead    * inRate * CACHE_READ_MULT  +
    cacheWrite   * inRate * CACHE_WRITE_MULT
  ) / 1_000_000;
}

/** Cache olmasaydı ne kadar ödenecekti — tasarruf hesabı */
function cacheReadSaving(cacheReadTokens, model) {
  if (!cacheReadTokens) return 0;
  const key = Object.keys(PRICES).find(k => model.includes(k) || k.includes(model));
  if (!key) return 0;
  const [inRate] = PRICES[key];
  return cacheReadTokens * inRate * (1 - CACHE_READ_MULT) / 1_000_000;
}

class BudgetTracker {
  constructor(limitUSD = 1.0) {
    this.limitUSD         = limitUSD;
    this.inputTokens      = 0;
    this.outputTokens     = 0;
    this.totalCostUSD     = 0;
    this.turns            = 0;
    this.cacheReadTokens  = 0;
    this.cacheWriteTokens = 0;
    this.cacheSavedUSD    = 0;
  }

  /**
   * @param {number} inputTokens
   * @param {number} outputTokens
   * @param {number} costUSD
   * @param {{cacheReadTokens?: number, cacheWriteTokens?: number, _model?: string}} cache
   */
  add(inputTokens, outputTokens, costUSD, cache = {}) {
    this.inputTokens  += inputTokens;
    this.outputTokens += outputTokens;
    this.totalCostUSD += costUSD;
    this.turns++;

    const cr = cache.cacheReadTokens  ?? 0;
    const cw = cache.cacheWriteTokens ?? 0;
    this.cacheReadTokens  += cr;
    this.cacheWriteTokens += cw;
    if (cache._model && cr > 0) {
      this.cacheSavedUSD += cacheReadSaving(cr, cache._model);
    }
  }

  isExceeded() {
    return this.totalCostUSD >= this.limitUSD;
  }

  get() {
    return {
      inputTokens:      this.inputTokens,
      outputTokens:     this.outputTokens,
      totalCostUSD:     this.totalCostUSD,
      remaining:        Math.max(0, this.limitUSD - this.totalCostUSD),
      turns:            this.turns,
      cacheReadTokens:  this.cacheReadTokens,
      cacheWriteTokens: this.cacheWriteTokens,
      cacheSavedUSD:    this.cacheSavedUSD,
    };
  }

  summary() {
    const tok  = ((this.inputTokens + this.outputTokens) / 1000).toFixed(1);
    const cost = this.totalCostUSD.toFixed(4);
    const limit = this.limitUSD.toFixed(2);
    const cachePart = this.cacheReadTokens > 0
      ? ` | cache↓${(this.cacheReadTokens / 1000).toFixed(0)}k`
      : "";
    return `[$${cost}/$${limit} | ${tok}k tok | ${this.turns} tur${cachePart}]`;
  }
}

module.exports = { countTokens, countMessages, estimateCost, cacheReadSaving, BudgetTracker, CACHE_WRITE_MULT, CACHE_READ_MULT };
