// core/tools.js — Araç kaydı, yönlendirme, dinamik (MCP) araçlar, ReAct format
"use strict";
const events = require("./events.ts");
const fsTools       = require("../tools/fs.js");
const shellTools    = require("../tools/shell.js");
const memoryTools   = require("../tools/memory.js");
const vaultTools    = require("../tools/vault.js");
const webTools      = require("../tools/web.js");
const gitTools      = require("../tools/git.js");
// moltbook: skill olarak yüklenir — her oturumda kayıtlı değil
// registerMoltbook() ile dinamik olarak devreye girer

// ── Yerleşik araçlar (yan etkisiz) ───────────────────────────────────────────
// BUILTIN_DEFS önce tanımlanmalı — STATIC_DEFS buna bağlı
const BUILTIN_DEFS = [
  {
    name: "think",
    description: "Bir problemi adım adım düşün. Yan etki yok — sonuç yalnızca düşünce akışın. Karmaşık hata ayıklamada, çıkmaz döngüde veya bir sonraki adımı planlarken kullan.",
    input_schema: {
      type: "object",
      properties: {
        thought: { type: "string", description: "Açık düşünce akışı. Soruları, tahminleri ve sonraki adım kararını içerebilir." },
      },
      required: ["thought"],
    },
  },
];

// Yerleşik araç yürütücüsü — sadece think şimdilik
function _executeBuiltin(name, input) {
  if (name === "think") {
    const t = String(input.thought ?? "").trim();
    if (!t) return "Düşünce boş.";
    return `[düşünce kaydedildi]\n${t.slice(0, 2000)}`;
  }
  return null; // bilinmeyen
}

const STATIC_DEFS = [
  ...BUILTIN_DEFS,
  ...fsTools.DEFS,
  ...shellTools.DEFS,
  ...memoryTools.DEFS,
  ...vaultTools.DEFS,
  ...webTools.DEFS,
  ...gitTools.DEFS,
];

const REGISTRY = {};
for (const mod of [fsTools, shellTools, memoryTools, vaultTools, webTools, gitTools]) {
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

// Moltbook araçlarını skill olarak dinamik kaydet / kaldır
// Ozyn'in açık isteğiyle çağrılır — her oturumda otomatik değil
let _moltbookRegistered = false;
function registerMoltbook() {
  if (_moltbookRegistered) return;
  const mb = require("../tools/moltbook.js");
  registerDynamic(mb.DEFS, (name, input) => mb.execute(name, input), "moltbook");
  _moltbookRegistered = true;
}
function unregisterMoltbook() {
  unregisterDynamic("moltbook");
  _moltbookRegistered = false;
}
function isMoltbookActive() { return _moltbookRegistered; }

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
// Araç çıktısını context taşması riskine karşı boyut sınırla.
// Baş kısım (ilk satırlar genellikle meta/başlık) + kuyruk ağırlıklı kırpma.
const TOOL_RESULT_CAP = 50_000; // ~50KB karakter
function _capResult(raw, toolName) {
  if (typeof raw !== "string" || raw.length <= TOOL_RESULT_CAP) return raw;
  const head = raw.slice(0, TOOL_RESULT_CAP / 4);
  const tail = raw.slice(-(TOOL_RESULT_CAP * 3 / 4));
  return `${head}\n… [${toolName} çıktısı kırpıldı: ${raw.length} karakter → ${TOOL_RESULT_CAP}] …\n${tail}`;
}

async function callTool(name, input, sessionId = null) {
  events.emit("tool_start", sessionId, { tool: name, input: input ?? {} });
  const t0 = Date.now();

  // Yerleşik araçlar (yan etkisiz, önce kontrol et)
  const builtinResult = _executeBuiltin(name, input ?? {});
  if (builtinResult !== null) {
    events.emit("tool_end", sessionId, { tool: name, latencyMs: Date.now() - t0, ok: true });
    return builtinResult;
  }

  const dyn = DYNAMIC.executors[name];
  if (dyn) {
    try {
      const result = _capResult(await dyn(name, input ?? {}), name);
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
    const result = _capResult(await mod.execute(name, input ?? {}), name);
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
  // MCP dahil tüm araçlar için getDefs() kullan — ALL_DEFS statik araçları döner
  get ALL_DEFS() { return getDefs(); },
  STATIC_DEFS,
  getDefs,
  registerDynamic,
  unregisterDynamic,
  registerMoltbook,
  unregisterMoltbook,
  isMoltbookActive,
  callTool,
  buildToolPromptSuffix,
  parseToolCall,
};
