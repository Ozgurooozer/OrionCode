// backends/ollama.ts — yerel modeller, native tool calling destekli
"use strict";
import type * as HttpType from "http";
import type { ToolDef, ToolCall, ChatRichResult, ChatMessage, ChatRichOpts, ChatOpts, BackendError } from "./types.ts";

const http = require("http") as typeof HttpType;

interface _RequestOpts {
  onLine?: (obj: any) => void;  // called for each parsed NDJSON line
}

// Lazy: /settings ollama runtime'da OLLAMA_HOST/PORT env'i günceller → anında aktif
const _host = (): string => process.env.OLLAMA_HOST ?? "localhost";
const _port = (): number => parseInt(process.env.OLLAMA_PORT ?? "11434");

async function listModels(): Promise<string[]> {
  return new Promise(resolve => {
    const req = http.request(
      { hostname: _host(), port: _port(), path: "/api/tags", method: "GET" },
      res => {
        let d = "";
        res.on("data", c => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d).models?.map((m: any) => m.name) ?? []);
          } catch { resolve([]); }
        });
      }
    );
    req.on("error", () => resolve([]));
    req.setTimeout(1500, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

async function isAvailable(): Promise<boolean> {
  const models = await listModels();
  return models.length > 0;
}

function _request(body: string, { onLine }: _RequestOpts = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: _host(), port: _port(), path: "/api/chat", method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      res => {
        let raw = "";
        let buf = "";
        res.on("data", chunk => {
          raw += chunk;
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try { if (onLine) onLine(JSON.parse(line)); } catch {}
          }
        });
        res.on("end", () => {
          if (buf.trim()) { try { if (onLine) onLine(JSON.parse(buf)); } catch {} }
          if (res.statusCode !== 200) {
            let msg = `Ollama HTTP ${res.statusCode}`;
            try { msg = JSON.parse(raw).error ?? msg; } catch {}
            return reject(new Error(msg));
          }
          resolve();
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error("Ollama timeout (180s)")); });
    req.write(body);
    req.end();
  });
}

/** Eski imza — string döndürür */
function chat(model: string, messages: ChatMessage[], { onToken, stream = true, numCtx = 8192 }: ChatOpts = {}): Promise<string> {
  const body = JSON.stringify({ model, messages, stream, options: { num_ctx: numCtx } });
  let full = "";
  return _request(body, {
    onLine: obj => {
      const token = obj.message?.content ?? "";
      full += token;
      if (stream && onToken && token) onToken(token);
    },
  }).then(() => full);
}

// Anthropic-tarzı def → Ollama/OpenAI tool formatı
function _toTools(defs: ToolDef[] | undefined) {
  return (defs ?? []).map(d => ({
    type: "function",
    function: {
      name:        d.name,
      description: d.description ?? "",
      parameters:  d.input_schema ?? { type: "object", properties: {} },
    },
  }));
}

/**
 * chatRich — native tool calling.
 * → { text, toolCalls: [{id, name, input}] }
 * Model tool desteklemiyorsa Error fırlatır (err.noToolSupport = true).
 */
async function chatRich(model: string, messages: ChatMessage[], { system, tools, onToken, numCtx = 8192 }: ChatRichOpts = {}): Promise<ChatRichResult> {
  const allMessages = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;

  const payload: Record<string, unknown> = {
    model,
    messages: allMessages,
    stream:   true,
    options:  { num_ctx: numCtx },
  };
  if (tools?.length) payload.tools = _toTools(tools);

  let text = "";
  const toolCalls: ToolCall[] = [];
  try {
    await _request(JSON.stringify(payload), {
      onLine: obj => {
        const m = obj.message ?? {};
        if (m.content) {
          text += m.content;
          if (onToken) onToken(m.content);
        }
        for (const tc of m.tool_calls ?? []) {
          toolCalls.push({
            id:    `ol_${toolCalls.length}`,
            name:  tc.function?.name ?? "",
            input: tc.function?.arguments ?? {},
          });
        }
      },
    });
  } catch (err: any) {
    const e = err as BackendError;
    if (/does not support tools/i.test(e.message)) e.noToolSupport = true;
    // qwen2.5 ve bazı modellerin Jinja şablonu role:"tool" mesajlarını işleyemiyor
    if (/Jinja|No user query found/i.test(e.message)) e.ollamaJinjaError = true;
    throw e;
  }
  return { text, toolCalls: toolCalls.filter(c => c.name) };
}

module.exports = { name: "ollama", isAvailable, listModels, chat, chatRich, defaultModel: null };
