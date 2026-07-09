// core/llm.js — LLM backend soyutlaması
const http  = require("http");
const https = require("https");

// ── OLLAMA ───────────────────────────────────────────────────────────────────

async function ollamaModels() {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: "localhost", port: 11434, path: "/api/tags", method: "GET" },
      res => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => {
          try { resolve(JSON.parse(d).models?.map(m => m.name) ?? []); }
          catch { resolve([]); }
        });
      }
    );
    req.on("error", () => resolve([]));
    req.setTimeout(1500, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

function ollamaChat(model, messages, { onToken, stream = true } = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, stream });
    const req  = http.request({
      hostname: "localhost", port: 11434, path: "/api/chat", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, res => {
      let full = "";
      res.on("data", chunk => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            const token = obj.message?.content ?? "";
            full += token;
            if (stream && onToken && token) onToken(token);
          } catch {}
        }
      });
      res.on("end", () => resolve(full));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── ANTHROPIC ────────────────────────────────────────────────────────────────

async function anthropicChat(messages, system, tools, { onToken } = {}) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client    = new Anthropic.default();

  const stream = client.messages.stream({
    model:      "claude-sonnet-4-6",
    max_tokens: 4096,
    system,
    tools:      tools ?? [],
    messages,
  });

  let fullText = "";
  let response;

  stream.on("text", text => {
    fullText += text;
    if (onToken) onToken(text);
  });

  response = await stream.finalMessage();
  return response;
}

// ── BACKEND TESPİT ───────────────────────────────────────────────────────────

async function detect() {
  if (process.env.ANTHROPIC_API_KEY) {
    return { type: "anthropic", models: ["claude-sonnet-4-6"] };
  }
  const models = await ollamaModels();
  if (models.length) return { type: "ollama", models };
  return { type: "none", models: [] };
}

module.exports = { detect, ollamaModels, ollamaChat, anthropicChat };
