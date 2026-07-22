// core/skills-registry.js — skill manifest yükleyici ve arama
// @ts-nocheck
// core/agents/*.js içindeki manifest alanlarını toplar.
// Meissa bu registry'ye bakarak rota kararında skill adını doldurur.
"use strict";

const fs   = require("fs");
const path = require("path");

const AGENTS_DIR = path.join(__dirname, "agents");

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // orion-server gibi uzun-ömürlü süreçler için

/**
 * Tüm skill manifestlerini yükle (cache'li, 60s TTL).
 * @returns {Array<{name, version, cost_class, vram_needed_gb, triggers, input_schema, output_schema}>}
 */
function loadAll() {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL) return _cache;

  const skills = [];
  let files;
  try { files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith(".ts")); }
  catch { return []; }

  for (const file of files) {
    try {
      const mod = require(path.join(AGENTS_DIR, file));
      if (mod.manifest && typeof mod.manifest === "object" && mod.manifest.name) {
        skills.push({ ...mod.manifest, _file: file });
      }
    } catch {}
  }

  _cache = skills;
  _cacheTs = Date.now();
  return skills;
}

/**
 * Tetikleyici kelimelere göre uygun skill'i bul.
 * @param {string} text — kullanıcı mesajı veya kategorize çıktısı
 * @returns {{ name, cost_class, vram_needed_gb } | null}
 */
function match(text) {
  const lower  = String(text ?? "").toLowerCase();
  const skills = loadAll();
  let best = null, bestScore = 0;

  for (const skill of skills) {
    const triggers = skill.triggers ?? [];
    let score = 0;
    for (const t of triggers) {
      if (lower.includes(t.toLowerCase())) score++;
    }
    if (score > bestScore) { bestScore = score; best = skill; }
  }

  return best ?? null;
}

/**
 * Cache'i temizle (test yardımcısı).
 */
function clearCache() { _cache = null; _cacheTs = 0; }

module.exports = { loadAll, match, clearCache };
