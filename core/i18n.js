// core/i18n.js — Language support: English default, Turkish available at runtime
"use strict";
const router = require("./router.js");

let _locale = null;

function normalize(l) {
  return String(l || "").toLowerCase() === "tr" ? "tr" : "en";
}

function getLocale() {
  if (_locale) return _locale;
  if (process.env.ORION_LANG) return (_locale = normalize(process.env.ORION_LANG));
  try {
    const cfg = router.loadConfig();
    _locale = normalize(cfg.language ?? "en");
  } catch {
    _locale = "en";
  }
  return _locale;
}

function setLocale(l) {
  _locale = normalize(l);
  try { router.saveConfig({ language: _locale }); } catch {}
  return _locale;
}

// t(en, tr) — pick the string for the active locale; tr optional (falls back to en)
function t(en, tr) {
  return getLocale() === "tr" ? (tr ?? en) : en;
}

// Locale-aware number/date formatting helper
function locTag() {
  return getLocale() === "tr" ? "tr-TR" : "en-US";
}

module.exports = { t, getLocale, setLocale, locTag };
