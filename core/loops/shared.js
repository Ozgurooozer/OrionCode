// core/loops/shared.js — Loop'lar arası ortak sabitler ve yardımcı fonksiyonlar
"use strict";

const tools  = require("../tools.js");
const events = require("../events.ts");
const i18n   = require("../i18n.js");
const { print }   = require("../../tui/output.ts");
const { aiTurnStart, aiTurnContinue } = require("../../tui/index.js");

const MAX_ITERS = 40;

const TIER1_TOOLS = new Set([
  "think", "read_file", "write_file", "edit_file", "multi_edit",
  "list_files", "glob_files", "search", "file_info", "file_outline",
  "read_many_files", "run_command",
]);

const PARALLEL_SAFE = new Set([
  "think", "read_file", "file_outline", "read_many_files",
  "list_files", "glob_files", "search", "file_info",
  "git_status", "git_diff", "git_log", "git_show", "git_blame",
  "memory_read", "vault_search", "vault_recent", "vault_read", "web_fetch",
]);

const _DIFF_RE      = /```diff\n([\s\S]*?)```/;
const _DIFF_STAT_RE = /\(([+-]\d+[^)]*)\)/;
const _WRITE_TOOLS  = new Set(["write_file","edit_file","multi_edit","apply_patch","insert_at_line","replace_in_files","delete_file","move_file","create_dir"]);

function _toolCallError(out) {
  if (typeof out !== "string") return null;
  if (out.startsWith("Araç hatası (")) return out.replace(/^Araç hatası \([^)]+\):\s*/, "").slice(0, 100);
  if (out.startsWith("Araç bulunamadı:")) return "not found";
  if (out.startsWith("HATA:")) return out.slice(5).trim().slice(0, 100);
  return null;
}

function _cleanResponse(text) {
  text = require("../extract.js").stripThinking(text);
  text = text.replace(/<<<TOOL>>>[\s\S]*?<<<END>>>/g, "");
  text = text.replace(/<<<TOOL>>>[\s\S]*/g, "");
  text = text.replace(/<<<RESULT>>>[\s\S]*?<<<END>>>/g, "");
  return text.trim();
}

async function _callToolCached(specCache, name, input, sessionId, telemetry, touchedFiles = null) {
  const cached = specCache.get(name, input ?? {}, sessionId);
  const tStart = Date.now();
  const out = cached !== null ? cached : await tools.callTool(name, input, sessionId);
  if (cached !== null) events.emit("speculex_hit", sessionId, { tool: name, input: input ?? {} });
  const err = _toolCallError(out);
  telemetry.record({
    event:     "tool_call",
    tool:      name,
    latencyMs: cached !== null ? 0 : Date.now() - tStart,
    ok:        !err,
    ...(err            ? { error:   err  } : {}),
    ...(cached !== null ? { specHit: true } : {}),
  });
  if (touchedFiles && !err && _WRITE_TOOLS.has(name)) {
    const inp = input ?? {};
    const raw = inp.paths ?? (inp.path ? [inp.path] : inp.from ? [inp.from, inp.to].filter(Boolean) : []);
    const arr = Array.isArray(raw) ? raw : [raw];
    for (const p of arr) { if (p && typeof p === "string") touchedFiles.add(p); }
  }
  return out;
}

function _sweepSpeculexMisses(specCache, generation, sessionId) {
  try {
    for (const tool of specCache.drainUnconsumed(generation)) {
      events.emit("speculex_miss", sessionId, { tool, reason: "unused" });
    }
  } catch {} // süpürme hatası akışı asla bozmaz
}

function _emitDiff(toolName, result, sessionId) {
  if (typeof result !== "string") return;
  const m = _DIFF_RE.exec(result);
  if (!m) return;
  const diff = m[1];
  const statMatch = _DIFF_STAT_RE.exec(result);
  const pathMatch  = result.match(/(?:✎|wrote?|edit|yaz[iı]ld[iı]|düzenlendi)[^\n]*?[:：]\s*([^\s([]+)/i);
  events.emit("diff", sessionId, {
    tool:    toolName,
    path:    pathMatch?.[1] ?? null,
    diff,
    stat:    statMatch?.[1] ?? null,
  });
}

function _flattenMsgs(msgs) {
  const out = [];
  for (const m of msgs) {
    if (typeof m.content === "string") { out.push({ role: m.role, content: m.content }); continue; }
    if (!Array.isArray(m.content)) continue;
    const text = m.content
      .map(b => {
        if (b.type === "text")        return b.text;
        if (b.type === "tool_use")    return `[tool: ${b.name}]`;
        if (b.type === "tool_result") return `[tool result: ${String(b.content).slice(0, 300)}]`;
        return "";
      })
      .filter(Boolean)
      .join("\n");
    if (text) out.push({ role: m.role === "user" ? "user" : "assistant", content: text });
  }
  return out;
}

// <think>…</think> bloklarını filtreleyen token-bazlı state machine factory.
// Açma ve kapama etiketleri birden fazla tokena bölünse de doğru çalışır:
// - Kapama: son 7 char buffer'da tutulur (</think> = 8 char, en az 1 fazla)
// - Açma: buffer sonu <think> önekiyle bitiyorsa o önek tutulur
const _THINK_OPEN  = "<think>";
const _THINK_CLOSE = "</think>";
function makeThinkFilter(onVisible) {
  let _thinkDepth = 0, _thinkBuf = "";
  return tok => {
    _thinkBuf += tok;
    let out = "";
    while (_thinkBuf.length) {
      if (_thinkDepth > 0) {
        const close = _thinkBuf.indexOf(_THINK_CLOSE);
        if (close === -1) { _thinkBuf = _thinkBuf.slice(-(_THINK_CLOSE.length - 1)); break; }
        _thinkDepth--;
        _thinkBuf = _thinkBuf.slice(close + _THINK_CLOSE.length);
      } else {
        const open = _thinkBuf.indexOf(_THINK_OPEN);
        if (open === -1) {
          // Buffer, <think> öneciyle bitiyor olabilir — o kısmı tut, gerisini yaz
          let keepLen = 0;
          for (let k = _THINK_OPEN.length - 1; k >= 1; k--) {
            if (_thinkBuf.endsWith(_THINK_OPEN.slice(0, k))) { keepLen = k; break; }
          }
          out += _thinkBuf.slice(0, _thinkBuf.length - keepLen);
          _thinkBuf = _thinkBuf.slice(_thinkBuf.length - keepLen);
          break;
        }
        out += _thinkBuf.slice(0, open);
        _thinkDepth++;
        _thinkBuf = _thinkBuf.slice(open + _THINK_OPEN.length);
      }
    }
    if (out) onVisible(out);
  };
}

module.exports = {
  MAX_ITERS, TIER1_TOOLS, PARALLEL_SAFE,
  _DIFF_RE, _DIFF_STAT_RE, _WRITE_TOOLS,
  _toolCallError, _cleanResponse,
  _callToolCached, _sweepSpeculexMisses, _emitDiff, _flattenMsgs,
  makeThinkFilter,
  tools, events, i18n, print, aiTurnStart, aiTurnContinue,
};
