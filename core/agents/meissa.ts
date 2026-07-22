// core/agents/meissa.js — tek görev: kullanıcı mesajını kategorize et
// @ts-nocheck
// Tek Ollama çağrısı → JSON → log → event. Session routing'e dokunmaz.
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const http = require("http");
const crypto = require("crypto");

const level0 = require("./level0.ts");

// ── Şema ──────────────────────────────────────────────────────────────────────
// kategoriler: resim, yazı, kod, analiz, sohbet, ses, 3d
// karmasiklik: 1=basit(sohbet), 2=orta(skill), 3=yoğun(orchestration)
// rota: "skill" | "sohbet" | "orchestration"
// skill: "image" | "voice" | null

const SYSTEM_PROMPT = `Sen Meissa'sın — Orion'un görev sınıflandırıcısı.
Kullanıcı mesajını analiz et. YALNIZCA şu JSON'ı döndür, başka hiçbir şey yazma:
{
  "kategoriler": [<"resim"|"yazı"|"kod"|"analiz"|"sohbet"|"ses"|"3d">, ...],
  "karmasiklik": <1|2|3>,
  "rota": <"skill"|"sohbet"|"orchestration">,
  "skill": <"image"|"voice"|null>,
  "tahmini_butce": 150
}

ROTA KARARI — önce bu üç soruyu sırayla sor:
  1. Resim/görsel üretmek istiyor mu?  → EVET: rota:"skill", skill:"image"
  2. Ses/okuma istiyor mu?             → EVET: rota:"skill", skill:"voice"
  3. İkisi birden veya başka çok-adım? → rota:"orchestration", skill:null
  4. Diğer her şey (kod, analiz, soru, açıklama, yazı, sohbet) → rota:"sohbet", skill:null

SKİLL KURALI — kesin:
  skill:"image"  → SADECE resim/görsel/çiz/draw/pixel/portrait/render/scifi/cyberpunk/fantasy
  skill:"voice"  → SADECE ses/oku/seslendir/speak/voice/tts
  skill:null     → kod yazmak/test/dokümantasyon/analiz/açıklama DAIMA null — kod≠resim

Diğer kurallar:
- tahmini_butce HER ZAMAN tek tam sayı (0-1000), asla aralık ("50-200" yasak)
- karmasiklik: 1=basit(tek adım), 2=orta(birkaç adım), 3=yoğun(çok-adım/koordinasyon)
- Boş/anlamsız: {"kategoriler":["sohbet"],"karmasiklik":1,"rota":"sohbet","skill":null,"tahmini_butce":0}
- Soru/açıklama ("nasıl çalışır","nedir","explain","how does") → rota:"sohbet", skill:null

Örnekler (bu üç durumu özellikle ezberle):
  "bu kodu analiz et: for(i=0;i<10;i++){}" → {"kategoriler":["kod","analiz"],"karmasiklik":1,"rota":"sohbet","skill":null,"tahmini_butce":50}
  "how does TCP/IP work"                   → {"kategoriler":["analiz"],"karmasiklik":1,"rota":"sohbet","skill":null,"tahmini_butce":50}
  "kod yaz test et ve dokümante et"        → {"kategoriler":["kod","yazı"],"karmasiklik":2,"rota":"sohbet","skill":null,"tahmini_butce":100}
  "bana bir cyberpunk kız çiz"             → {"kategoriler":["resim"],"karmasiklik":1,"rota":"skill","skill":"image","tahmini_butce":150}
  "sesli oku şunu"                         → {"kategoriler":["ses"],"karmasiklik":1,"rota":"skill","skill":"voice","tahmini_butce":100}`;

const DEFAULTS = {
  model:          "qwen2.5-coder:7b",
  ollamaHost:     "localhost",
  ollamaPort:     11434,
  timeoutMs:      15_000,
  maxInputLength: 4_000,
};

// ── Config ────────────────────────────────────────────────────────────────────

function _cfg() {
  try {
    const r = require("../router.ts").loadConfig();
    return {
      model:      r.tier1Model     ?? DEFAULTS.model,
      ollamaHost: process.env.OLLAMA_HOST ?? DEFAULTS.ollamaHost,
      ollamaPort: Number(process.env.OLLAMA_PORT ?? DEFAULTS.ollamaPort),
    };
  } catch { return { model: DEFAULTS.model, ollamaHost: DEFAULTS.ollamaHost, ollamaPort: DEFAULTS.ollamaPort }; }
}

// ── Log ───────────────────────────────────────────────────────────────────────

function _logDir() {
  const base = process.env.ORION_HOME ?? path.join(os.homedir(), ".orion");
  return path.join(base, "meissa_runs");
}

function _logRun(entry) {
  try {
    const dir  = _logDir();
    fs.mkdirSync(dir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const file = path.join(dir, `${date}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");
  } catch {}
}

// ── Ollama tek atış ───────────────────────────────────────────────────────────

function _ollamaChat(model, host, port, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, stream: false, options: { num_ctx: 2048 } });
    const req  = http.request({
      hostname: host, port,
      path: "/api/chat", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw).message?.content ?? ""); }
        catch { resolve(""); }
      });
    });
    req.on("error", reject);
    req.setTimeout(DEFAULTS.timeoutMs, () => { req.destroy(); reject(new Error("meissa: timeout")); });
    req.write(body);
    req.end();
  });
}

// ── JSON parse ────────────────────────────────────────────────────────────────

const VALID_ROTA   = new Set(["skill", "sohbet", "orchestration"]);
const VALID_SKILLS = new Set(["image", "voice", null]);

// İlk dengeli { ... } bloğunu çıkarır — string içindeki { } karakterlerini
// saymaz, böylece iç içe obje (skill:{...}) ile takip eden metin (kod bloğu vb.)
// birbirine karışmaz. Kapanış bulunamazsa (kesik üretim) null döner.
function _extractJson(raw) {
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function _sanitizeBudget(json) {
  // "tahmini_butce": 500-1000  → "tahmini_butce": 500   (model range bug)
  // "tahmini_butce": <0-50>    → "tahmini_butce": 0
  return json
    .replace(/"tahmini_butce"\s*:\s*<[^>]*>/g, '"tahmini_butce": 0')
    .replace(/"tahmini_butce"\s*:\s*(\d+)\s*-\s*\d+/g, '"tahmini_butce": $1');
}

function _parse(raw) {
  const json = _extractJson(raw);
  if (!json) return null;
  const obj = JSON.parse(_sanitizeBudget(json));

  const kategoriler  = Array.isArray(obj.kategoriler) ? obj.kategoriler.filter(k => typeof k === "string") : ["sohbet"];
  const karmasiklik  = [1, 2, 3].includes(obj.karmasiklik) ? obj.karmasiklik : 1;
  const rota         = VALID_ROTA.has(obj.rota) ? obj.rota : "sohbet";
  const skill        = VALID_SKILLS.has(obj.skill) ? obj.skill : null;
  const tahmini_butce = typeof obj.tahmini_butce === "number" ? Math.max(0, Math.min(1000, obj.tahmini_butce)) : 0;

  return { kategoriler, karmasiklik, rota, skill, tahmini_butce };
}

// ── Edimsöz (Speech Act) Labeling ────────────────────────────────────────────
// Dört tip: TALEP (eylem isteği), SORU (bilgi/açıklama), SELAMLı (sosyal),
// ZİNCİR (bağlaçlı çok-adım). Kategori ve rotadan bağımsız ikinci bir eksen.

const _SOCIAL_WORDS = ["merhaba", "selam", "teşekkür", "günaydın", "naber",
                       "hello", "thanks", "eyvallah", "sağol", "tamam", "anladım"];
const _Q_STARTS    = ["ne ", "neden", "nasıl", "nerede", "ne zaman", "hangi ",
                       "kaç ", "kim ", "what ", "why ", "how ", "when ", "where ",
                       "which ", "who "];
const _CONNECTORS  = [" ve ", " sonra ", " ardından ", " and ", " then "];
const _CTX_MARKERS = ["bu ", "bunu", "bunun", "şunu", "şunun", "onu ", "onun ",
                       "dediğin", "bahsettiğin", "yukardaki", "aşağıdaki", "önceki"];

function _labelEdim(input) {
  const t  = String(input ?? "").trim();
  const tl = t.toLowerCase();
  if (!tl) return "SELAMLı";
  // emoji-only
  if (!tl.replace(/[\u{1F000}-\u{1FFFF}☀-⟿\u{1F300}-\u{1F9FF}]+/gu, "").trim()) return "SELAMLı";
  if (_SOCIAL_WORDS.some(w => tl.includes(w))) return "SELAMLı";
  if (tl.endsWith("?") || _Q_STARTS.some(w => tl.startsWith(w) || tl.includes(" " + w))) return "SORU";
  if (tl.length > 20 && _CONNECTORS.some(c => tl.includes(c))) return "ZİNCİR";
  return "TALEP";
}

function _isContextDependent(input) {
  const tl = String(input ?? "").trim().toLowerCase();
  return _CTX_MARKERS.some(p => tl.startsWith(p) || tl.includes(" " + p));
}

// ── Fallback sonuç ────────────────────────────────────────────────────────────

const FALLBACK = Object.freeze({
  kategoriler: ["sohbet"], karmasiklik: 1,
  rota: "sohbet", skill: null, tahmini_butce: 0,
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Kullanıcı mesajını kategorize et.
 * Asla exception atmaz — Ollama kapalıysa FALLBACK döner.
 * @param {string} userMessage
 * @param {object} [opts]
 * @param {string} [opts.sessionId]
 * @returns {Promise<{kategoriler, karmasiklik, rota, skill, tahmini_butce, _meta}>}
 */
async function run(userMessage, { sessionId = null } = {}) {
  const t0        = Date.now();
  const cfg       = _cfg();
  const truncated = String(userMessage ?? "").slice(0, DEFAULTS.maxInputLength);
  const inputHash = crypto.createHash("sha1").update(truncated).digest("hex").slice(0, 8);

  let result = null;
  let error  = null;
  let raw    = "";
  let level  = null; // 0=kural, 2=LLM, null=guard/fallback

  // Boş girdi → FALLBACK, LLM çağrısı yapma (boş LLM çağrısı yasak)
  if (!truncated.trim()) {
    result = { ...FALLBACK };
    error  = "empty_input";
  }

  // Seviye 0: kural/anahtar-kelime — net eşleşmede LLM'e hiç gitme
  if (!result) {
    const hit = level0.classify(truncated);
    if (hit) { result = hit; level = 0; }
  }

  if (!result) try {
    level = 2;
    const messages = [
      { role: "system",  content: SYSTEM_PROMPT },
      { role: "user",    content: truncated },
    ];
    raw    = await _ollamaChat(cfg.model, cfg.ollamaHost, cfg.ollamaPort, messages);
    result = _parse(raw);
    if (!result) throw new Error("JSON parse başarısız");
  } catch (e) {
    error  = e instanceof Error ? e.message : String(e);
    result = { ...FALLBACK };
  }

  const wall_time_ms = Date.now() - t0;

  const logEntry = {
    schema_version: 1,
    timestamp:    t0,
    sessionId,
    input_length: truncated.length,
    input_hash:   inputHash,
    model:        cfg.model,
    output_raw:   raw.slice(0, 500),
    output_parsed: result,
    wall_time_ms,
    level,
    error,
    edim:              _labelEdim(truncated),
    context_dependent: _isContextDependent(truncated),
  };
  _logRun(logEntry);

  // Event yay — meissa:done
  try {
    const { emit } = require("../events.ts");
    emit("meissa:done", sessionId, {
      input_hash:   inputHash,
      input_length: truncated.length,
      ...result,
      wall_time_ms,
      level,
      error,
    });
  } catch {}

  return {
    ...result,
    _meta: { model: cfg.model, wall_time_ms, input_hash: inputHash, level, error },
  };
}

/** Log dizinini döner (test yardımcısı) */
function logPath() { return _logDir(); }

module.exports = { run, logPath, DEFAULTS, FALLBACK };
