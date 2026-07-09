// core/extract.js — Konuşmadan bilgi çıkarım: daemon.js ve orion-mcp.js tarafından paylaşılır
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

function _loadConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(os.homedir(), ".orion", "config.json"), "utf8")); }
  catch { return {}; }
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

// Ollama'ya POST at ve ham metin döndür
async function ollamaRequest(prompt) {
  const cfg = _loadConfig();
  const model      = cfg.tier1Model  ?? "qwen2.5-coder:7b";
  const ollamaHost = cfg.ollamaHost  ?? "http://localhost:11434";

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream:   false,
      options:  { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
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

module.exports = { extractWithOllama, buildExtractionPrompt, ollamaRequest };
