// core/budget.js — Token sayımı, maliyet tahmini, bütçe takibi
"use strict";

const PRICES = {
  // [inputPerMToken, outputPerMToken] USD
  "claude-opus-4-8":             [15.00, 75.00],
  "claude-sonnet-4-6":           [ 3.00, 15.00],
  "claude-haiku-4-5-20251001":   [ 0.80,  4.00],
  "claude-haiku-3":              [ 0.25,  1.25],
  "gpt-4o":                      [ 5.00, 15.00],
  "gpt-4o-mini":                 [ 0.15,  0.60],
  "mistralai/mistral-7b-instruct:free": [0, 0],
};

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

function estimateCost(inputTokens, outputTokens, model = "") {
  if (!model || model.length < 4) return 0; // boş/kısa ad her fiyata eşleşmesin
  const key = Object.keys(PRICES).find(k => model.includes(k) || k.includes(model));
  if (!key) return 0; // local/unknown = free
  const [inRate, outRate] = PRICES[key];
  return (inputTokens * inRate + outputTokens * outRate) / 1_000_000;
}

class BudgetTracker {
  constructor(limitUSD = 1.0) {
    this.limitUSD     = limitUSD;
    this.inputTokens  = 0;
    this.outputTokens = 0;
    this.totalCostUSD = 0;
    this.turns        = 0;
  }

  add(inputTokens, outputTokens, costUSD) {
    this.inputTokens  += inputTokens;
    this.outputTokens += outputTokens;
    this.totalCostUSD += costUSD;
    this.turns++;
  }

  isExceeded() {
    return this.totalCostUSD >= this.limitUSD;
  }

  get() {
    return {
      inputTokens:  this.inputTokens,
      outputTokens: this.outputTokens,
      totalCostUSD: this.totalCostUSD,
      remaining:    Math.max(0, this.limitUSD - this.totalCostUSD),
      turns:        this.turns,
    };
  }

  summary() {
    const tok = ((this.inputTokens + this.outputTokens) / 1000).toFixed(1);
    const cost = this.totalCostUSD.toFixed(4);
    const limit = this.limitUSD.toFixed(2);
    return `[$${cost}/$${limit} | ${tok}k tok | ${this.turns} tur]`;
  }
}

module.exports = { countTokens, countMessages, estimateCost, BudgetTracker };
