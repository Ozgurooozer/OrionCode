// backends/custom.js — BYOK özel sağlayıcılar (~/.orion/providers.json)
// Herhangi bir OpenAI-uyumlu servis 5 satır JSON ile eklenir.
"use strict";

/**
 * Shape of a provider entry in ~/.orion/providers.json and the PRESETS map.
 * addProvider() also accepts these fields directly when registering a new provider.
 * @typedef {Object} ProviderSpec
 * @property {string}   [baseURL]     - OpenAI-compatible base URL (required at runtime, validated before use)
 * @property {string}   [keyEnv]      - env variable name holding the API key
 * @property {string}   [key]         - inline API key (stored in env, never printed)
 * @property {string}   [defaultModel] - model ID used when none is specified
 * @property {string[]} [models]      - static model list (used when /models endpoint absent)
 * @property {Object}   [headers]     - extra HTTP headers forwarded to the provider
 */
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { createProvider } = require("./openai-compat.js");
const i18n = require("../core/i18n.js");

const FILE = path.join(process.env.ORION_HOME || os.homedir(), ".orion", "providers.json");

// Bilinen servisler — sadece anahtar ekleyerek bağlan
const PRESETS = {
  groq:      { baseURL: "https://api.groq.com/openai/v1",       keyEnv: "GROQ_API_KEY",      defaultModel: "llama-3.3-70b-versatile" },
  together:  { baseURL: "https://api.together.xyz/v1",          keyEnv: "TOGETHER_API_KEY",  defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  deepseek:  { baseURL: "https://api.deepseek.com/v1",          keyEnv: "DEEPSEEK_API_KEY",  defaultModel: "deepseek-chat" },
  mistral:   { baseURL: "https://api.mistral.ai/v1",            keyEnv: "MISTRAL_API_KEY",   defaultModel: "mistral-large-latest" },
  xai:       { baseURL: "https://api.x.ai/v1",                  keyEnv: "XAI_API_KEY",       defaultModel: "grok-3-mini" },
  fireworks: { baseURL: "https://api.fireworks.ai/inference/v1", keyEnv: "FIREWORKS_API_KEY", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct" },
  cerebras:  { baseURL: "https://api.cerebras.ai/v1",           keyEnv: "CEREBRAS_API_KEY",  defaultModel: "llama-3.3-70b" },
  moonshot:  { baseURL: "https://api.moonshot.ai/v1",           keyEnv: "MOONSHOT_API_KEY",  defaultModel: "kimi-k2-0711-preview" },
  alibaba:   { baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", keyEnv: "DASHSCOPE_API_KEY", defaultModel: "qwen-max" },
  minimax:   { baseURL: "https://api.minimax.io/v1",            keyEnv: "MINIMAX_API_KEY",   defaultModel: "MiniMax-M2" },
  zai:       { baseURL: "https://api.z.ai/api/paas/v4",         keyEnv: "ZAI_API_KEY",       defaultModel: "glm-4.6" },
  nvidia:    { baseURL: "https://integrate.api.nvidia.com/v1",  keyEnv: "NVIDIA_API_KEY",    defaultModel: "meta/llama-3.3-70b-instruct" },
  perplexity:{ baseURL: "https://api.perplexity.ai",            keyEnv: "PERPLEXITY_API_KEY", defaultModel: "sonar" },
  sambanova: { baseURL: "https://api.sambanova.ai/v1",          keyEnv: "SAMBANOVA_API_KEY", defaultModel: "Meta-Llama-3.3-70B-Instruct" },
};

function loadSpecs() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return {}; }
}

function saveSpecs(specs) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(specs, null, 2), "utf8");
  fs.renameSync(tmp, FILE);
}

// spec: {baseURL, keyEnv?, key?, defaultModel?, models?[], headers?}
function _toProvider(name, s) {
  let url;
  try { url = new URL(s.baseURL.replace(/\/$/, "")); }
  catch { return null; }

  // Inline anahtar → sentetik env değişkeni (süreç içi, asla yazdırılmaz)
  let keyEnv = s.keyEnv;
  if (s.key && !keyEnv) {
    keyEnv = `ORION_PROVIDER_${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_KEY`;
    process.env[keyEnv] = s.key;
  }

  return createProvider({
    name,
    host:         url.hostname,
    port:         url.port ? parseInt(url.port) : undefined,
    protocol:     url.protocol === "http:" ? "http" : "https",
    basePath:     url.pathname.replace(/\/$/, ""),
    keyEnv,
    headers:      s.headers,
    staticModels: s.models,
    defaultModel: s.defaultModel,
  });
}

// Tüm özel sağlayıcıları provider objesi olarak döndür
function loadProviders() {
  const specs = loadSpecs();
  const out = [];
  for (const [name, s] of Object.entries(specs)) {
    if (!s?.baseURL) continue;
    const p = _toProvider(name, s);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Preset ya da baseURL ile sağlayıcı ekle → kaydet
 * @param {string} name
 * @param {ProviderSpec} [opts]
 */
function addProvider(name, { baseURL, key, keyEnv, defaultModel } = {}) {
  const preset = PRESETS[name];
  const spec = {
    baseURL:      baseURL ?? preset?.baseURL,
    keyEnv:       keyEnv  ?? preset?.keyEnv,
    defaultModel: defaultModel ?? preset?.defaultModel,
  };
  if (!spec.baseURL) throw new Error(i18n.t(`baseURL required (not a known preset: ${name})`, `baseURL gerekli (bilinen preset değil: ${name})`));
  if (key) spec.key = key;
  const specs = loadSpecs();
  specs[name] = spec;
  saveSpecs(specs);
  return spec;
}

function removeProvider(name) {
  const specs = loadSpecs();
  if (!(name in specs)) return false;
  delete specs[name];
  saveSpecs(specs);
  return true;
}

module.exports = { PRESETS, FILE, loadSpecs, saveSpecs, loadProviders, addProvider, removeProvider };
