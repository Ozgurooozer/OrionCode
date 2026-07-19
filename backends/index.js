// backends/index.js — Provider kaydı ve otomatik tespit
// Yerleşik: anthropic, ollama, openrouter, openai, huggingface
// Özel (BYOK): ~/.orion/providers.json → herhangi bir OpenAI-uyumlu servis
"use strict";
const ollama      = require("./ollama.js");
const anthropic   = require("./anthropic.js");
const huggingface = require("./huggingface.js");
const openai      = require("./openai.js");
const openrouter  = require("./openrouter.js");
const lmstudio    = require("./lmstudio.js");
const nim         = require("./nim.js");
const custom      = require("./custom.js");

const BUILTIN = [anthropic, ollama, lmstudio, nim, openrouter, openai, huggingface];

// Plugin'lerin kayıt ettiği ek provider'lar (core/plugins.js)
const EXTRA = [];
function registerProvider(provider) {
  if (!provider?.name) return false;
  const i = EXTRA.findIndex(p => p.name === provider.name);
  if (i !== -1) EXTRA.splice(i, 1);
  EXTRA.push(provider);
  return true;
}

function all() {
  return [...BUILTIN, ...custom.loadProviders(), ...EXTRA];
}

function get(name) {
  return all().find(p => p.name === name) ?? null;
}

// Anthropic dışındaki her şey OpenAI-uyumludur (chatRich destekler)
function isOpenAIFamily(name) {
  const p = get(name);
  return !!p && p.name !== "anthropic" && p.name !== "ollama" && typeof p.chatRich === "function";
}

// Kullanılabilir tüm backend'leri tara
async function detect() {
  const results = [];
  for (const p of all()) {
    const ok = await p.isAvailable().catch(() => false);
    if (!ok) continue;
    let models;
    if (p.name === "openrouter" || p.name === "huggingface") {
      models = await p.listModelIds(20).catch(() => []);
    } else {
      const m = await p.listModels().catch(() => []);
      models = m.map(x => (typeof x === "string" ? x : x.id));
    }
    results.push({ name: p.name, models, defaultModel: p.defaultModel ?? null, custom: !BUILTIN.includes(p) });
  }
  return results;
}

async function detectFirst() {
  const found = await detect();
  return found[0] ?? null;
}

module.exports = { detect, detectFirst, get, all, isOpenAIFamily, custom, registerProvider, ALL: BUILTIN };
