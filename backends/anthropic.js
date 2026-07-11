// backends/anthropic.js
"use strict";

async function isAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function listModels() {
  return [
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
  ];
}

// System string → cache_control'lü content block dizisi.
// Breakpoint 1/4: sistem promptu her turda aynı — kalıcı olarak cache'lenir.
function _systemWithCache(system) {
  if (!system) return system;
  return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
}

// Breakpoint 2/4: geçmiş konuşmanın en son asistan mesajını cache'le.
// Bu, yeni user mesajı hariç tüm history'yi bir sonraki turda ucuza okur.
// Yeni user mesajı kasıtlı olarak cache dışında kalır (her turda değişiyor).
function _addCacheBreakpoints(messages) {
  let lastAsstIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") { lastAsstIdx = i; break; }
  }
  if (lastAsstIdx === -1) return messages; // henüz history yok

  return messages.map((m, i) => {
    if (i !== lastAsstIdx) return m;
    const content = m.content;

    // String içerik → block dizisine çevir + cache_control ekle
    if (typeof content === "string") {
      return { ...m, content: [{ type: "text", text: content, cache_control: { type: "ephemeral" } }] };
    }
    // Block dizisi → son bloğa cache_control ekle (thinking/tool bloklarını korur)
    if (Array.isArray(content) && content.length > 0) {
      const copy = content.slice();
      copy[copy.length - 1] = { ...copy[copy.length - 1], cache_control: { type: "ephemeral" } };
      return { ...m, content: copy };
    }
    return m;
  });
}

async function chat(model, messages, system, toolDefs, { onToken, thinking = false, thinkingBudget = 8000 } = {}) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client    = new Anthropic.default();

  const params = {
    model:      model ?? "claude-sonnet-4-6",
    max_tokens: thinking ? Math.max(16000, thinkingBudget + 4096) : 8192,
    system:     _systemWithCache(system),
    tools:      toolDefs ?? [],
    messages:   _addCacheBreakpoints(messages),
  };

  if (thinking) {
    params.thinking = { type: "enabled", budget_tokens: thinkingBudget };
  }

  // prompt-caching-2024-07-31 beta başlığı gerekli; thinking ile birleştir
  const betaHeaders = thinking
    ? "interleaved-thinking-2025-05-14,prompt-caching-2024-07-31"
    : "prompt-caching-2024-07-31";

  const stream = client.messages.stream(params, { headers: { "anthropic-beta": betaHeaders } });
  stream.on("text", text => { if (onToken) onToken(text); });

  return await stream.finalMessage();
}

module.exports = { name: "anthropic", isAvailable, listModels, chat, _addCacheBreakpoints };
