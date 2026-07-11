// core/speculex.js — Spekülatif salt-okunur tool önbelleği (İş B)
// Tier2 yanıt beklerken tier1 prediction'dan gelen read-only araçları önceden çalıştırır.
// KATI SINIR: SAFE_TOOLS dışındaki araçlar ASLA spekülatif çalıştırılmaz.
"use strict";

const tools = require("./tools.js");

// Yalnızca bu araçlar spekülatif çalıştırılabilir — yazan araçlar kesinlikle yasak
const SAFE_TOOLS = new Set(["read_file", "list_files", "search", "vault_search", "memory_read"]);

const TTL_MS = 30_000; // 30 saniye

class SpeculativeCache {
  constructor() {
    this._cache = new Map(); // cacheKey → { result, ts }
    this.hits   = 0;
    this.misses = 0;
  }

  _key(tool, input) {
    // \0 ayırıcı: araç ismi "server:tool" formatında olsa da doğru split sağlar
    return `${tool}\0${JSON.stringify(input ?? {})}`;
  }

  set(tool, input, result) {
    if (!SAFE_TOOLS.has(tool)) return;
    // 50KB üzeri sonuçları önbelleğe alma — bellek koruması
    if (typeof result === "string" && result.length > 50_000) return;
    this._cache.set(this._key(tool, input), { result, ts: Date.now() });
  }

  // Önbellekten sonuç döndür (TTL geçmişse null). Hit/miss sayar.
  get(tool, input) {
    if (!SAFE_TOOLS.has(tool)) return null; // güvensiz — asla önbellekten dön
    const k = this._key(tool, input);
    const entry = this._cache.get(k);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.ts > TTL_MS) { this._cache.delete(k); this.misses++; return null; }
    this.hits++;
    return entry.result;
  }

  // Güvenlik garantisi: write araçlarının önbellekte ASLA bulunmadığını doğrula
  hasUnsafe() {
    for (const k of this._cache.keys()) {
      const tool = k.split("\0")[0]; // \0 ayırıcısı — MCP "server:tool" formatında güvenli
      if (!SAFE_TOOLS.has(tool)) return true;
    }
    return false;
  }

  hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  stats() {
    return { hits: this.hits, misses: this.misses, size: this._cache.size };
  }

  clear() {
    this._cache.clear();
  }
}

// Ollama prediction → araç çağrıları JSON listesi beklentisi.
// Dönen format: [{ name: "tool_name", input: {...} }, ...]
async function _predictToolCalls(userMessage, ollamaHost, model) {
  try {
    const prompt = `Bir AI asistanı kullanıcının şu mesajı için muhtemelen hangi SALT-OKUNUR araçları çağırır?
Yalnızca şunlardan seç: read_file, list_files, search, vault_search, memory_read

Kullanıcı mesajı: "${String(userMessage).slice(0, 300)}"

SADECE JSON dizisi döndür, başka hiçbir şey yok. Örnek:
[{"name":"read_file","input":{"path":"/proje/dosya.js"}},{"name":"list_files","input":{"path":"/proje"}}]

Araç gerekmiyorsa boş dizi: []`;

    const res = await fetch(`${ollamaHost}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream:   false,
        options:  { temperature: 0.0, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await res.json();
    const raw = (data.message?.content ?? "").trim();
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(c => c && typeof c.name === "string" && SAFE_TOOLS.has(c.name));
  } catch {
    return [];
  }
}

/**
 * Kullanıcı mesajı için spekülatif prefetch başlat (background, hata sessiz).
 * Tier2 API bekleme süresinde çalışır.
 * @param {SpeculativeCache} cache
 * @param {string} userMessage
 * @param {object} cfg   — { tier1Model, ollamaHost }
 * @param {string} sessionId
 * @param {object} telemetry  — SessionLogger instance
 * @returns {Promise<void>}  — hata fırlatmaz
 */
async function startPrefetch(cache, userMessage, cfg, sessionId, telemetry) {
  const ollamaHost = cfg.ollamaHost ?? "http://localhost:11434";
  const model      = cfg.tier1Model ?? "qwen2.5-coder:7b";

  // Ollama erişilebilir mi? (hızlı check, 1sn timeout)
  try {
    const ping = await fetch(`${ollamaHost}/api/ps`, { signal: AbortSignal.timeout(1_000) });
    await ping.text().catch(() => {}); // response body'yi drain et
    if (!ping.ok) return;
  } catch { return; }

  const predictions = await _predictToolCalls(userMessage, ollamaHost, model);
  if (!predictions.length) return;

  // Yalnızca güvenli araçları önceden çalıştır
  const prefetched = [];
  for (const call of predictions.slice(0, 3)) { // max 3 tahmin
    if (!SAFE_TOOLS.has(call.name)) continue; // güvenlik çiti — atlama
    try {
      const result = await tools.callTool(call.name, call.input ?? {}, sessionId);
      // Hata string'leri önbelleğe alınmaz — zehirleme koruması
      const isErr = typeof result === "string" &&
        (result.startsWith("Araç hatası (") || result.startsWith("Araç bulunamadı:"));
      if (!isErr) {
        cache.set(call.name, call.input ?? {}, result);
        prefetched.push(call.name);
      }
    } catch {}
  }

  if (telemetry && prefetched.length > 0) {
    try { telemetry.record({ event: "speculative_prefetch", tools: prefetched, predicted: predictions.length }); } catch {}
  }
}

module.exports = { SpeculativeCache, SAFE_TOOLS, startPrefetch };
