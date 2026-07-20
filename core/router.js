// core/router.js — Tier routing: yerel (Ollama) vs cloud (Anthropic/OpenRouter)
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HOME        = process.env.ORION_HOME || os.homedir(); // test için geçersiz kılınabilir
const CONFIG_FILE = path.join(HOME, ".orion", "config.json");

const DEFAULTS = {
  budgetMode:               "balanced",
  sessionBudgetUSD:         1.0,
  tier1Model:               "qwen2.5-coder:7b",
  tier1Backend:             "ollama",
  tier2Backend:             "anthropic",
  tier2Model:               "claude-sonnet-4-6",
  complexityTokenThreshold: 800,
  vaultDir:                 path.join(HOME, ".orion", "vault"),
  language:                 "en",
  memoryEffort:             "low",  // low | balanced | high
  trustedPaths:             [],     // workspace güven listesi — promptTrust() ile eklenir
  roleTiers:                {},     // koordinatör rol→tier override: { researcher:1, coder:2, reviewer:1 }
  autoApproveCommands:      false,  // true → run_command onay sormaz (güvenlik riski — dikkatli)
  autoCompact:              true,   // false → devre dışı bırak; true → context %80'i geçince otomatik sıkıştır
  contextLimit:             0,      // 0 = her backend kendi varsayılanını kullanır (akıllı mod)
                                    // >0 = tüm backendler için genel override
  backendContextLimits:     {},     // per-backend override: { "ollama": 8192, "lmstudio": 4096 }
  maxOutputTokens:          8192,   // OpenAI-compat backendlerde max_tokens; 0 = sağlayıcı default
                                    // OpenRouter az kredi durumunda düşür: /ayar maxOutputTokens 4096
};

// 5sn config cache
let _cfgCache = { data: null, ts: 0 };
// Runtime overrides: diske yazılmaz, süreç ömrü boyunca geçerli
const _runtimeOverrides = {};

function setRuntimeOverride(key, value) {
  _runtimeOverrides[key] = value;
  _cfgCache = { data: null, ts: 0 }; // cache'i geçersiz kıl
}

function loadConfig() {
  if (_cfgCache.data && Date.now() - _cfgCache.ts < 5_000) return _cfgCache.data;
  let disk = {};
  try { disk = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch {}
  const cfg = { ...DEFAULTS, ...disk, ..._runtimeOverrides };
  _cfgCache = { data: cfg, ts: Date.now() };
  return cfg;
}

function saveConfig(partial) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch {}
  const merged = { ...existing, ...partial };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  _cfgCache = { data: null, ts: 0 }; // invalidate
}

// Karmaşıklık puanı: pozitif = cloud gerekir, negatif = yerel yeterli
const COMPLEX_WORDS = /\b(debug|architect|refactor|implement|fix|bug|test|security|optimize|analyze|design|review|performance|migrate|integrate|create|add|write|update|build|generate|feature|function|class|module|component|endpoint|api|schema|algorithm|deploy)\b/gi;
const SIMPLE_WORDS  = /\b(summarize|extract|list|format|classify|translate|convert|rename|count|show|print|display|echo)\b/gi;

function complexityScore(text) {
  const complex = (text.match(COMPLEX_WORDS) || []).length;
  const simple  = (text.match(SIMPLE_WORDS)  || []).length;
  return complex - simple;
}

// Gerçek routing kararı + FEP gölge kancası.
// /router freeenergy on açıkken her gerçek kararın yanında freeenergy.js'in
// scoreOption() gölge kararı da hesaplanır ve router_shadow_decision olayıyla
// loglanır. Fire-and-forget: gölge hesabı hata verse bile gerçek karar
// DEĞİŞMEZ, akış etkilenmez.
function decide(text, opts = {}) {
  const decision = _decideCore(text, opts);
  // shadowHook kendi iç try/catch ile guard'lı — dış catch gereksiz.
  require("./freeenergy.js").shadowHook(decision, text, {
    tokenCount: opts.tokenCount ?? 0,
    mode:       opts.mode ?? "agent",
  });
  return decision;
}

function _decideCore(text, { tokenCount = 0, mode = "agent", budgetTracker = null } = {}) {
  const cfg = loadConfig();

  const tier1 = { backend: "ollama",        model: cfg.tier1Model,   tier: 1 };
  const tier2 = { backend: cfg.tier2Backend, model: cfg.tier2Model,  tier: 2 };

  // Quality: budget dolmadıysa tier2, dolduysa tier1
  if (cfg.budgetMode === "quality") {
    if (budgetTracker?.isExceeded?.()) {
      return { ...tier1, reason: "quality mode — budget exceeded" };
    }
    return { ...tier2, reason: "quality mode" };
  }

  // Aggressive: büyük context haricinde tier1
  if (cfg.budgetMode === "aggressive") {
    if (tokenCount > 4000) return { ...tier2, reason: "large context" };
    return { ...tier1, reason: "aggressive mode" };
  }

  // Balanced (default)
  if (mode === "chat") {
    return { ...tier1, reason: "chat mode" };
  }

  if (budgetTracker?.isExceeded?.()) {
    return { ...tier1, reason: "budget exceeded" };
  }

  if (tokenCount > cfg.complexityTokenThreshold) {
    return _applyThompson({ ...tier2, reason: `token count ${tokenCount} > ${cfg.complexityTokenThreshold}` });
  }

  if (complexityScore(text) >= 2) {
    return _applyThompson({ ...tier2, reason: "complex task keywords" });
  }

  return _applyThompson({ ...tier1, reason: "balanced default" });
}

function _applyThompson(decision) {
  try {
    const thompson = require("./thompson.js");
    return thompson.recommend(decision);
  } catch { return decision; }
}

// Efektif memoryEffort: budgetMode=quality → en az "balanced" (high kalıcı, hiç otomatik düşmez)
function getEffectiveMemoryEffort(cfg) {
  const c      = cfg ?? loadConfig();
  const stored = c.memoryEffort ?? "low";
  if (stored === "high") return "high";
  if (c.budgetMode === "quality" && stored === "low") return "balanced";
  return stored;
}

module.exports = { loadConfig, saveConfig, setRuntimeOverride, decide, getEffectiveMemoryEffort, DEFAULTS };
