// core/turnmemory.js — Oturum-içi turn belleği (jcode "session search" karşılığı)
// Her turn semantik vektöre gömülür (nomic-embed-text). Bağlam sıkıştırıldıktan
// (_trim) sonra bile eski turn'lerin TAM içeriği buradan pasif olarak geri çağrılır —
// araç çağrısı gerekmez, session.send() her turda otomatik sorgular.
// Ollama/embed yoksa sessizce devre dışı kalır (boş sonuç döner).
"use strict";

const MAX_ENTRIES    = 500;   // oturum başına saklanan turn sayısı
const EMBED_MAX_CHARS = 1500; // embedding'e giden metin sınırı
const STORE_MAX_CHARS = 4000; // saklanan tam metin sınırı

class TurnMemory {
  constructor() {
    this.entries = []; // {role, text, vector|null, ts}
  }

  // Turn'u kaydet — embedding arka planda, çağıran beklemez
  add(role, text) {
    text = String(text ?? "").trim();
    if (!text) return Promise.resolve();
    const entry = { role, text: text.slice(0, STORE_MAX_CHARS), vector: null, ts: Date.now() };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();

    const embed = require("./embed.js");
    return embed.embedText(text.slice(0, EMBED_MAX_CHARS))
      .then(vec => { if (vec) entry.vector = vec; })
      .catch(() => {});
  }

  /**
   * Sorguyla en alakalı eski turn'leri getir.
   * @param {string} query
   * @param {number} limit
   * @param {number} skipRecent — en son N kayıt hariç (zaten bağlam penceresinde)
   * @returns {Promise<Array<{role, text, score}>>}
   */
  async recall(query, limit = 2, skipRecent = 20) {
    const candidates = this.entries.slice(0, Math.max(0, this.entries.length - skipRecent))
      .filter(e => e.vector);
    if (!candidates.length) return [];

    const embed = require("./embed.js");
    const qVec = await embed.embedText(String(query ?? "").slice(0, EMBED_MAX_CHARS)).catch(() => null);
    if (!qVec) return [];

    return candidates
      .map(e => ({ role: e.role, text: e.text, score: embed.cosineSim(qVec, e.vector) }))
      .filter(r => r.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  get size() { return this.entries.length; }
}

// Geri çağrılan turn'leri system eki olarak biçimle (vault ile aynı güven modeli)
function buildRecallSuffix(hits, i18n) {
  if (!hits?.length) return "";
  const header = i18n.t(
    "\n\n## Earlier In This Session [older turns recalled from session memory — reference only]\n",
    "\n\n## Bu Oturumda Daha Önce [oturum belleğinden geri çağrılan eski turn'ler — sadece referans]\n"
  );
  const body = hits
    .map(h => `[${h.role}] ${h.text.slice(0, 800)}`)
    .join("\n---\n");
  return header + body;
}

module.exports = { TurnMemory, buildRecallSuffix };
