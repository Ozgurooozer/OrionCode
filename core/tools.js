// core/tools.js — Araç kaydı, yönlendirme, dinamik (MCP) araçlar, ReAct format
"use strict";
const events = require("./events.js");
const fsTools       = require("../tools/fs.js");
const shellTools    = require("../tools/shell.js");
const memoryTools   = require("../tools/memory.js");
const moltbookTools = require("../tools/moltbook.js");
const vaultTools    = require("../tools/vault.js");

const STATIC_DEFS = [
  ...fsTools.DEFS,
  ...shellTools.DEFS,
  ...memoryTools.DEFS,
  ...moltbookTools.DEFS,
  ...vaultTools.DEFS,
];

const REGISTRY = {};
for (const mod of [fsTools, shellTools, memoryTools, moltbookTools, vaultTools]) {
  for (const def of mod.DEFS) REGISTRY[def.name] = mod;
}

// ── Dinamik araçlar (MCP sunucuları vb.) ─────────────────────────────────────
// executor: async (name, input) → string
const DYNAMIC = { defs: [], executors: {} };

function registerDynamic(defs, executor, source = "mcp") {
  for (const def of defs) {
    // Aynı isim tekrar kaydolursa eskisini değiştir
    const i = DYNAMIC.defs.findIndex(d => d.name === def.name);
    if (i !== -1) DYNAMIC.defs.splice(i, 1);
    DYNAMIC.defs.push({ ...def, _source: source });
    DYNAMIC.executors[def.name] = executor;
  }
}

function unregisterDynamic(source) {
  DYNAMIC.defs = DYNAMIC.defs.filter(d => {
    if (d._source !== source) return true;
    delete DYNAMIC.executors[d.name];
    return false;
  });
}

// Tüm araç tanımları (statik + dinamik) — model'e gönderilen liste
function getDefs() {
  return [...STATIC_DEFS, ...DYNAMIC.defs.map(({ _source, ...d }) => d)];
}

/**
 * Araç çağır — tool_start/tool_end olaylarını yayınlar.
 * @param {string}      name
 * @param {object}      input
 * @param {string|null} sessionId  — opsiyonel, geriye dönük uyumlu
 */
async function callTool(name, input, sessionId = null) {
  events.emit("tool_start", sessionId, { tool: name, input: input ?? {} });
  const t0 = Date.now();

  const dyn = DYNAMIC.executors[name];
  if (dyn) {
    try {
      const result = await dyn(name, input ?? {});
      events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: true });
      return result;
    } catch (e) {
      events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: false, error: e.message });
      return `Araç hatası (${name}): ${e.message}`;
    }
  }

  const mod = REGISTRY[name];
  if (!mod) {
    events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: false, error: "not found" });
    return `Araç bulunamadı: ${name}`;
  }
  try {
    const result = await mod.execute(name, input ?? {});
    events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: true });
    return result;
  } catch (e) {
    events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: false, error: e.message });
    return `Araç hatası (${name}): ${e.message}`;
  }
}

// Ollama ReAct sistem prompt eki — sadece izin verilen araçlar
function buildToolPromptSuffix(allowedNames) {
  const defs = allowedNames
    ? getDefs().filter(d => allowedNames.includes(d.name))
    : getDefs();

  const list = defs.map(t => {
    const props = Object.entries(t.input_schema?.properties ?? {})
      .map(([k, v]) => `  - ${k} (${v.type ?? "any"}): ${v.description ?? ""}`)
      .join("\n");
    return `### ${t.name}\n${t.description}${props ? "\nParams:\n" + props : ""}`;
  }).join("\n\n");

  return `

## Tool Use (ReAct Format)
Bir araç çağırmak için SADECE bu formatı kullan — başka hiçbir şey ekleme:
<<<TOOL>>>
{"name": "araç_adı", "input": {}}
<<<END>>>

Sonuç <<<RESULT>>> bloğu içinde gelecek. Birden fazla araç gerekirse sırayla çağır.

## Available Tools
${list}
`;
}

// <<<TOOL>>> bloğunu çıktıdan ayrıştır
function parseToolCall(text) {
  const m = text.match(/<<<TOOL>>>\s*([\s\S]*?)\s*<<<END>>>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); }
  catch { return null; }
}

module.exports = {
  ALL_DEFS: STATIC_DEFS, // geriye dönük uyumluluk
  getDefs,
  registerDynamic,
  unregisterDynamic,
  callTool,
  buildToolPromptSuffix,
  parseToolCall,
};
