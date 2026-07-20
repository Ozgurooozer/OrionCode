// core/i18n.js — Language support: English default, Turkish available at runtime
"use strict";
const router = require("./router.ts");

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
  // Kalıcılaştırma başarısız olursa dil bu oturumda değişir ama sonraki açılışta
  // geri döner — sessiz kalmak "kaydedildi" izlenimi verir, olayla görünür kıl.
  try { router.saveConfig({ language: _locale }); }
  catch (err) { require("./events.ts").emitSilentCatch("i18n.js:setLocale", err); }
  return _locale;
}

// t(en, tr) — pick the string for the active locale; tr optional (falls back to en)
function t(en, tr) {
  if (getLocale() === "tr") {
    if (tr === undefined && process.env.ORION_DEV)
      process.stderr.write(`[i18n] eksik çeviri: "${en}"\n`);
    return tr ?? en;
  }
  return en;
}

// Locale-aware number/date formatting helper
function locTag() {
  return getLocale() === "tr" ? "tr-TR" : "en-US";
}

module.exports = { t, getLocale, setLocale, locTag };
