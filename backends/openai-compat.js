// backends/openai-compat.js — Generic OpenAI-uyumlu sürücü fabrikası
// OpenAI, OpenRouter, HuggingFace, Groq, Together, DeepSeek, Mistral, xAI...
// hepsi bu fabrikanın bir konfigürasyonudur. BYOK: anahtar env'den okunur,
// asla çıktıya yazılmaz.
"use strict";

/**
 * @typedef {Object} ListModelsOpts
 * @property {string}  [filter]  - regex filter applied to model id/name
 * @property {number}  [limit]   - max results (default 50)
 */

/**
 * @typedef {Object} ChatOpts
 * @property {string}                   [system]    - system prompt injected as first message
 * @property {(token: string) => void}  [onToken]   - streaming callback, called per text delta
 * @property {Array<Object>}            [tools]     - Anthropic-format tool definitions
 * @property {number}                   [maxTokens] - max_tokens passed to provider
 */
const https = require("https");
const http  = require("http");

// Anthropic-tarzı araç tanımını OpenAI formatına çevir
function toOpenAITools(defs) {
  return (defs ?? []).map(d => ({
    type: "function",
    function: {
      name:        d.name,
      description: d.description ?? "",
      parameters:  d.input_schema ?? { type: "object", properties: {} },
    },
  }));
}

/**
 * createProvider(spec)
 * spec = {
 *   name:      "openrouter",
 *   host:      "openrouter.ai",
 *   basePath:  "/api/v1",
 *   keyEnv:    "OPENROUTER_API_KEY",   // ya da keyEnvs: [..] (ilk dolu olan)
 *   headers:   { ... },                // ek başlıklar
 *   protocol:  "https",               // varsayılan https
 *   port:      443,
 *   staticModels: ["..."],            // /models yoksa
 *   defaultModel: "...",
 * }
 */
function createProvider(spec) {
  const proto  = spec.protocol === "http" ? http : https;
  const port   = spec.port ?? (spec.protocol === "http" ? 80 : 443);
  const keyEnvs = spec.keyEnvs ?? (spec.keyEnv ? [spec.keyEnv] : []);
  // Lazy cache: credentials.js startup'ta env'i doldurur; oturum boyunca değişmez
  let _apiKeyCache;
  const apiKey = () => {
    // Sadece dolu değeri cache'le — boş string cache'lenirse /provider key
    // ile sonradan set edilen anahtar görünmez hale gelir
    if (_apiKeyCache) return _apiKeyCache;
    for (const e of keyEnvs) { if (process.env[e]) return (_apiKeyCache = process.env[e]); }
    return "";
  };

  function _headers(body) {
    const h = {
      "Content-Type": "application/json",
      "User-Agent":   "orion-cli/3.0",
      ...(spec.headers ?? {}),
    };
    const k = apiKey();
    if (k) h["Authorization"] = `Bearer ${k}`;
    if (body) h["Content-Length"] = Buffer.byteLength(body);
    return h;
  }

  async function isAvailable() {
    if (keyEnvs.length) return !!apiKey();
    return true; // anahtar gerektirmeyen (yerel) uçlar
  }

  function _get(path) {
    return new Promise(resolve => {
      const req = proto.request(
        { hostname: spec.host, port, path, method: "GET", headers: _headers() },
        res => {
          let d = "";
          res.on("data", c => (d += c));
          res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
        }
      );
      req.on("error", () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
      req.end();
    });
  }

  /**
   * @param {ListModelsOpts} [opts]
   */
  async function listModels(opts = {}) {
    const { filter, limit = 50 } = typeof opts === "object" ? opts : {};
    if (spec.staticModels) return spec.staticModels.slice(0, limit);
    const body = await _get(`${spec.basePath}/models`);
    let models = (body?.data ?? []).map(m => ({
      id:          m.id,
      name:        m.name ?? m.id,
      context:     m.context_length ?? m.context_window ?? 0,
      promptPrice: m.pricing?.prompt ?? 0,
      outputPrice: m.pricing?.completion ?? 0,
      free:        m.pricing ? parseFloat(m.pricing.prompt ?? "1") === 0 : false,
    }));
    if (filter) {
      const re = new RegExp(filter, "i");
      models = models.filter(m => re.test(m.id) || re.test(m.name));
    }
    return models.slice(0, limit);
  }

  async function listModelIds(limit = 30) {
    const models = await listModels({ limit });
    return models.map(m => (typeof m === "string" ? m : m.id));
  }

  /**
   * chatRich — native tool calling + streaming.
   * → { text, toolCalls: [{id, name, input}], finish }
   * @param {string} model
   * @param {Array<Object>} messages
   * @param {ChatOpts} [opts]
   */
  function chatRich(model, messages, { system, tools, onToken, maxTokens } = {}) {
    const key = apiKey();
    if (keyEnvs.length && !key)
      return Promise.reject(new Error(`${keyEnvs[0]} yok — credentials.json'a ekle`));

    const allMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

    const payload = { model, messages: allMessages, stream: true };
    if (tools?.length) payload.tools = toOpenAITools(tools);
    if (maxTokens) payload.max_tokens = maxTokens;
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = proto.request(
        {
          hostname: spec.host, port,
          path:   `${spec.basePath}/chat/completions`,
          method: "POST",
          headers: _headers(body),
        },
        res => {
          let text = "";
          let finish = null;
          let errBody = "";
          const calls = {}; // index → {id, name, args}
          let buf = "";

          res.on("data", chunk => {
            if (res.statusCode !== 200) { errBody += chunk; return; }
            buf += chunk.toString();
            const lines = buf.split("\n");
            buf = lines.pop() ?? ""; // eksik satır tampona
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const obj   = JSON.parse(data);
                const ch    = obj.choices?.[0];
                const delta = ch?.delta ?? {};
                if (delta.content) {
                  text += delta.content;
                  if (onToken) onToken(delta.content);
                }
                for (const tc of delta.tool_calls ?? []) {
                  const i = tc.index ?? 0;
                  calls[i] ??= { id: "", name: "", args: "" };
                  if (tc.id) calls[i].id = tc.id;
                  if (tc.function?.name) calls[i].name += tc.function.name;
                  if (tc.function?.arguments) calls[i].args += tc.function.arguments;
                }
                if (ch?.finish_reason) finish = ch.finish_reason;
              } catch {}
            }
          });

          res.on("end", () => {
            if (res.statusCode !== 200) {
              let msg = `${spec.name} HTTP ${res.statusCode}`;
              try { msg += `: ${JSON.parse(errBody).error?.message ?? errBody.slice(0, 200)}`; }
              catch { msg += `: ${errBody.slice(0, 200)}`; }
              return reject(new Error(msg));
            }
            const toolCalls = Object.values(calls).map((c, i) => {
              let input = {};
              try { input = c.args ? JSON.parse(c.args) : {}; } catch {}
              return { id: c.id || `call_${i}`, name: c.name, input, rawArgs: c.args };
            }).filter(c => c.name);
            resolve({ text, toolCalls, finish });
          });
        }
      );
      req.on("error", reject);
      req.setTimeout(180000, () => { req.destroy(); reject(new Error(`${spec.name} timeout (180s)`)); });
      req.write(body);
      req.end();
    });
  }

  /**
   * Eski imza — string döndürür (coordinator, extract vb. için)
   * @param {string} model
   * @param {Array<Object>} messages
   * @param {ChatOpts} [opts]
   */
  async function chat(model, messages, { onToken, system } = {}) {
    const r = await chatRich(model, messages, { system, onToken });
    return r.text;
  }

  return {
    name: spec.name,
    spec,
    isAvailable,
    listModels,
    listModelIds,
    chat,
    chatRich,
    defaultModel: spec.defaultModel ?? null,
  };
}

module.exports = { createProvider, toOpenAITools };
