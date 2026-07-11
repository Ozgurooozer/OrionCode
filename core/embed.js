// core/embed.js — nomic-embed-text ile semantik embedding (Ollama VRAM)
"use strict";

const http = require("http");
const os   = require("os");

const HOST       = process.env.OLLAMA_HOST ?? "localhost";
const PORT       = parseInt(process.env.OLLAMA_PORT ?? "11434");
const EMBED_MODEL = process.env.EMBED_MODEL ?? "nomic-embed-text";

// Kullanılabilirlik cache — 30sn TTL
let _availCache = { val: null, ts: 0 };

// LRU embed cache — max 200 entry
const _cache = new Map();
const CACHE_MAX = 200;

function _cacheKey(text) {
  return require("crypto").createHash("sha1").update(text).digest("hex");
}

function _cacheGet(key) {
  const val = _cache.get(key);
  if (val === undefined) return null;
  // Map ekleme sırası = kullanım sırası: sil + tekrar ekle → en sona taşı (LRU)
  _cache.delete(key);
  _cache.set(key, val);
  return val;
}

function _cacheSet(key, vec) {
  if (_cache.size >= CACHE_MAX) {
    _cache.delete(_cache.keys().next().value); // en eski sil
  }
  _cache.set(key, vec);
}

// Cosine benzerliği — sıfır dependency
function cosineSim(a, b) {
  let dot = 0, mA = 0, mB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    mA  += a[i] * a[i];
    mB  += b[i] * b[i];
  }
  const denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}

// vectorEntries: [{id, vector}]  →  [{id, score}] azalan sıralı
function topK(queryVec, vectorEntries, k = 6) {
  return vectorEntries
    .map(e => ({ id: e.id, score: cosineSim(queryVec, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Tek metin embed et → Float32Array(768) veya null
function embedText(text) {
  if (!text || !text.trim()) return Promise.resolve(null);

  const key = _cacheKey(text);
  const cached = _cacheGet(key);
  if (cached) return Promise.resolve(cached);

  const body = JSON.stringify({ model: EMBED_MODEL, prompt: text });

  return new Promise(resolve => {
    const req = http.request(
      {
        hostname: HOST, port: PORT, path: "/api/embeddings", method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      res => {
        let d = "";
        res.on("data", c => (d += c));
        res.on("end", () => {
          try {
            const arr = JSON.parse(d).embedding;
            if (!Array.isArray(arr)) return resolve(null);
            const vec = new Float32Array(arr);
            _cacheSet(key, vec);
            resolve(vec);
          } catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// nomic-embed-text yüklü mü? — 30sn cache
async function isAvailable() {
  const now = Date.now();
  if (_availCache.val !== null && now - _availCache.ts < 30_000) {
    return _availCache.val;
  }
  return new Promise(resolve => {
    const req = http.request(
      { hostname: HOST, port: PORT, path: "/api/tags", method: "GET" },
      res => {
        let d = "";
        res.on("data", c => (d += c));
        res.on("end", () => {
          try {
            const models = JSON.parse(d).models?.map(m => m.name) ?? [];
            const ok = models.some(m => m.includes("nomic-embed"));
            _availCache = { val: ok, ts: Date.now() };
            resolve(ok);
          } catch { _availCache = { val: false, ts: Date.now() }; resolve(false); }
        });
      }
    );
    req.on("error", () => { _availCache = { val: false, ts: Date.now() }; resolve(false); });
    req.setTimeout(2000, () => { req.destroy(); _availCache = { val: false, ts: Date.now() }; resolve(false); });
    req.end();
  });
}

module.exports = { embedText, cosineSim, topK, isAvailable };
