// core/extract.js — Konuşmadan bilgi çıkarım: daemon.js ve orion-mcp.js tarafından paylaşılır
"use strict";

function _loadConfig() {
  try { return require("./router.js").loadConfig(); }
  catch { return {}; }
}

// session.messages → düz metin: string içerik + content array'ler (thinking + tool_use dahil)
// includeTool=true → episodic köprü: araç çağrıları ve sonuçları extraction'a girer
// includeThinking=true → thinking blokları da dahil edilir (high memoryEffort için)
function flattenMessages(messages, { includeTool = false, includeThinking = false } = {}) {
  return (messages ?? [])
    .slice(-12)
    .map(m => {
      const role = m.role ?? "?";
      if (typeof m.content === "string") return `[${role}]: ${m.content.slice(0, 300)}`;
      if (!Array.isArray(m.content)) return null;
      const parts = [];
      for (const b of m.content) {
        if (b.type === "text")                        parts.push(b.text.slice(0, 300));
        if (b.type === "thinking" && includeThinking) parts.push(`[düşünce]: ${(b.thinking ?? "").slice(0, 200)}`);
        if (b.type === "tool_use"    && includeTool)  parts.push(`[araç: ${b.name}(${JSON.stringify(b.input ?? {}).slice(0, 100)})]`);
        if (b.type === "tool_result" && includeTool)  parts.push(`[sonuç: ${String(Array.isArray(b.content) ? b.content.map(x => x.text ?? "").join(" ") : b.content).slice(0, 150)}]`);
      }
      if (!parts.length) return null;
      return `[${role}]: ${parts.join(" | ")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildExtractionPrompt(conversationText) {
  return `Sen bir bilgi çıkarım asistanısın. Kurallar:
1. Sadece JSON döndür, başka hiçbir şey yok
2. Her alan zorunlu, boşsa [] kullan
3. summary 1-2 cümle, Türkçe

Format:
{
  "summary": "...",
  "decisions": ["karar1"],
  "codePatterns": ["pattern1"],
  "bugsFixes": ["hata → çözüm"],
  "concepts": ["kavram1"],
  "tags": ["etiket1"]
}

Sohbet:
${String(conversationText).slice(0, 3000)}`;
}

// tier1Model config'de yerelde kurulu olmayabilir (örn. varsayılan "qwen2.5-coder:7b"
// hiç pull edilmemiş) — /api/tags'e bakıp kurulu değilse ilk kurulu modele düş.
// 60sn önbellek: her ollamaRequest çağrısında ekstra HTTP round-trip yapmaz.
let _modelCache = { ts: 0, models: null };
async function _availableModels(ollamaHost) {
  if (_modelCache.models && Date.now() - _modelCache.ts < 60_000) return _modelCache.models;
  try {
    const res = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5_000) });
    const data = await res.json();
    const models = (data.models ?? []).map(m => m.name);
    _modelCache = { ts: Date.now(), models };
    return models;
  } catch { return null; } // Ollama'ya erişilemiyor — çağıran kendi hata yolunu işletsin
}

async function resolveOllamaModel(desired, ollamaHost) {
  const models = await _availableModels(ollamaHost);
  if (!models || !models.length) return desired; // tags alınamadı/boş — olduğu gibi dene
  if (models.includes(desired)) return desired;
  return models[0]; // istenen kurulu değil — kurulu olan ilk modele düş
}

// Ollama'ya POST at ve ham metin döndür.
// 1-arg form: ollamaRequest(prompt) — model ve timeout config'den alınır.
// 3-arg form: ollamaRequest(model, prompt, opts) — model ve opts explicit verilir.
async function ollamaRequest(modelOrPrompt, maybePrompt, opts = {}) {
  const cfg = _loadConfig();
  let model, prompt;
  if (maybePrompt === undefined) {
    model  = cfg.tier1Model ?? "qwen2.5-coder:7b";
    prompt = modelOrPrompt;
  } else {
    model  = modelOrPrompt ?? cfg.tier1Model ?? "qwen2.5-coder:7b";
    prompt = maybePrompt;
  }
  const ollamaHost = cfg.ollamaHost ?? "http://localhost:11434";
  const timeout    = opts?.timeout ?? 60_000;
  model = await resolveOllamaModel(model, ollamaHost);

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream:   false,
      options:  { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(timeout),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Ollama: ${data.error}`);
  return data.message?.content ?? "";
}

// Metin → knowledge objesi (Ollama ile, 3 deneme, fallback)
async function extractWithOllama(conversationText) {
  const prompt = buildExtractionPrompt(conversationText);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw   = await ollamaRequest(prompt);
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.summary) return parsed;
    } catch {}
  }

  return {
    summary:      String(conversationText).slice(0, 120),
    decisions:    [],
    codePatterns: [],
    bugsFixes:    [],
    concepts:     [],
    tags:         ["claude-code", "manuel"],
  };
}

module.exports = { extractWithOllama, buildExtractionPrompt, ollamaRequest, flattenMessages };
