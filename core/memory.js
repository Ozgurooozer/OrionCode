// core/memory.js — Orion hafıza sistemi — semantik embedding + keyword fallback
"use strict";

const os     = require("os");
const path   = require("path");
const fs     = require("fs");
const crypto = require("crypto");

// Mutex: eşzamanlı add() çağrılarında TOCTOU yarışını önler
let _addLock = Promise.resolve();

const MEMORY_FILE  = path.join(os.homedir(), ".orion", "memory.json");
const VECTORS_FILE = path.join(os.homedir(), ".orion", "memory-vectors.json");
const EXTRACT_EVERY = 5;
const DEDUP_THRESHOLD = 0.92; // cosine sim eşiği

function _load() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")); }
  catch { return []; }
}

function _save(entries) {
  const dir = path.dirname(MEMORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(entries, null, 2));
}

function _loadVectors() {
  try { return JSON.parse(fs.readFileSync(VECTORS_FILE, "utf8")); }
  catch { return []; }
}

function _saveVectors(vecs) {
  const dir = path.dirname(VECTORS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(vecs));
}

// Async — semantic dedup ile, mutex korumalı (TOCTOU önleme)
function add({ category, content, tags = [], source = "manual" }) {
  // Önceki add() tamamlanmadan bir sonrakini başlatma
  _addLock = _addLock.then(() => _addImpl({ category, content, tags, source }));
  return _addLock;
}

async function _addImpl({ category, content, tags, source }) {
  const entries = _load();
  if (entries.some(e => e.content.trim() === content.trim())) return null;

  const embed = require("./embed.js");
  const vec = await embed.embedText(content);

  // Semantik dedup — embedding sonrası tekrar oku (mutex garanti ediyor artık aynı id yok)
  if (vec) {
    const vectors = _loadVectors();
    if (vectors.length) {
      const top = embed.topK(vec, vectors, 1);
      if (top.length && top[0].score >= DEDUP_THRESHOLD) return null;
    }
  }

  const id = crypto.randomBytes(3).toString("hex");
  const entry = { id, category, content, tags, source, createdAt: Date.now() };
  // Taze yükle — mutex içindeyiz ama disk state değişmiş olabilir
  const fresh = _load();
  fresh.push(entry);
  _save(fresh);

  if (vec) {
    const vectors = _loadVectors();
    vectors.push({ id, vector: Array.from(vec), model: "nomic-embed-text", embeddedAt: Date.now() });
    _saveVectors(vectors);
  }

  return id;
}

function remove(id) {
  _save(_load().filter(e => e.id !== id));
  _saveVectors(_loadVectors().filter(v => v.id !== id));
}

function list() { return _load(); }

// Async — semantik öncelikli, keyword fallback
async function query(text, limit = 6) {
  const entries = _load();
  if (!entries.length) return [];

  const embed = require("./embed.js");
  const queryVec = await embed.embedText(text);

  if (queryVec) {
    const vectors = _loadVectors();
    if (vectors.length) {
      const ranked = embed.topK(queryVec, vectors, limit);
      const entryMap = new Map(entries.map(e => [e.id, e]));
      // Cosine sıralamasını koru — insertion order değil
      const results = ranked.map(r => entryMap.get(r.id)).filter(Boolean);
      if (results.length) return results;
    }
  }

  // Keyword fallback
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (!words.length) return entries.slice(-3);
  const scored = entries.map(e => {
    const target = (e.content + " " + e.tags.join(" ")).toLowerCase();
    const score = words.reduce((s, w) => s + (target.includes(w) ? 1 : 0), 0);
    return { entry: e, score };
  });
  const relevant = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  if (!relevant.length) return entries.slice(-3);
  return relevant.slice(0, limit).map(x => x.entry);
}

function buildInjectSuffix(relevant) {
  if (!relevant.length) return "";
  const byCategory = {};
  for (const e of relevant) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e.content);
  }
  const lines = Object.entries(byCategory)
    .map(([cat, items]) => `${cat.toUpperCase()}\n${items.map(i => `  • ${i}`).join("\n")}`)
    .join("\n");
  return `\n\n## Hafıza\n${lines}`;
}

function buildExtractionPrompt(msgs) {
  const recent = msgs
    .filter(m => typeof m.content === "string")
    .slice(-8)
    .map(m => `[${m.role}]: ${m.content.slice(0, 300)}`)
    .join("\n");

  return `Aşağıdaki konuşmadan uzun vadede hatırlanması gereken bilgileri çıkar.
Her satır şu formatta olmalı:
FACT: [nesnel gerçek]
PREFERENCE: [kullanıcı tercihi]
ENTITY: [önemli isim/dosya/proje]
CORRECTION: [düzeltme]

Hatırlamaya değer bir şey yoksa sadece: YOK

Konuşma:
${recent}`;
}

function parseExtractionResponse(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^(FACT|PREFERENCE|ENTITY|CORRECTION):\s*(.+)/i);
    if (m && m[2].trim().length > 5) {
      entries.push({ category: m[1].toLowerCase(), content: m[2].trim() });
    }
  }
  return entries;
}

module.exports = {
  add, remove, list, query, buildInjectSuffix,
  buildExtractionPrompt, parseExtractionResponse,
  EXTRACT_EVERY,
};
