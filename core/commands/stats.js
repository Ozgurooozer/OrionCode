// core/commands/stats.js — Telemetri analizi: /stats
"use strict";
const { C, T, print } = require("../../tui/index.js");
const i18n = require("../i18n.js");

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";

function _col(s, w) { return String(s ?? "").padEnd(w); }

function fmtCost(usd) {
  if (usd === 0) return C.muted("$0.00");
  return usd < 0.001 ? C.dim(`$${(usd * 1000).toFixed(2)}m`) : `${T.ok}$${usd.toFixed(4)}${RESET}`;
}
function fmtTokens(n) {
  if (!n) return C.muted("0");
  return n >= 1000 ? C.dim(`${(n / 1000).toFixed(1)}k`) : C.dim(String(n));
}
function bar(n, max, width = 16) {
  const fill = max > 0 ? Math.round((n / max) * width) : 0;
  return `${T.accent}${"█".repeat(fill)}${RESET}${T.muted}${"░".repeat(width - fill)}${RESET}`;
}

// ── Veri toplama ──────────────────────────────────────────────────────────────
function aggregate(days = 30) {
  const { listLogs, readLog } = require("../telemetry.js");
  const since = Date.now() - days * 86_400_000;

  const modelStats = {};  // "backend/model" → {cost, inTok, outTok, turns, latMs, cacheRead, cacheWrite}
  const toolCounts = {};  // tool → count
  const routeStats = {};  // reason → count
  const tierCount  = { 1: 0, 2: 0 };
  const errorCount = {};  // backend → count
  const sessions   = [];  // {id, cost, turns, backend, model}
  let totalCacheRead = 0, totalCacheWrite = 0;

  for (const { sessionId, mtime } of listLogs(200)) {
    if (mtime < since) continue;
    const events = readLog(sessionId);

    let sCost = 0, sTurns = 0, sBackend = "?", sModel = "?", pendingInTok = 0;

    for (const e of events) {
      if (e.event === "turn_start") {
        sBackend    = e.backend ?? sBackend;
        sModel      = e.model   ?? sModel;
        pendingInTok = e.estimatedInputTokens ?? 0;
      }
      if (e.event === "turn_complete") {
        const key = `${sBackend}/${sModel}`;
        if (!modelStats[key]) modelStats[key] = { cost: 0, inTok: 0, outTok: 0, turns: 0, latMs: 0, cacheRead: 0, cacheWrite: 0 };
        modelStats[key].cost       += e.costUSD            ?? 0;
        modelStats[key].inTok      += pendingInTok;
        modelStats[key].outTok     += e.outputTokens       ?? 0;
        modelStats[key].latMs      += e.wallMs             ?? 0;
        modelStats[key].cacheRead  += e.cacheReadTokens    ?? 0;
        modelStats[key].cacheWrite += e.cacheWriteTokens   ?? 0;
        modelStats[key].turns++;
        sCost  += e.costUSD ?? 0;
        sTurns++;
        totalCacheRead  += e.cacheReadTokens  ?? 0;
        totalCacheWrite += e.cacheWriteTokens ?? 0;
        pendingInTok = 0;
      }
      if (e.event === "tool_call") {
        const t = e.tool ?? "?";
        toolCounts[t] = (toolCounts[t] ?? 0) + 1;
      }
      if (e.event === "routed") {
        const reason = e.reason ?? "?";
        routeStats[reason] = (routeStats[reason] ?? 0) + 1;
        if (e.tier === 1 || e.tier === 2) tierCount[e.tier]++;
      }
      if (e.event === "backend_error") {
        const b = e.backend ?? "?";
        errorCount[b] = (errorCount[b] ?? 0) + 1;
      }
    }
    if (sTurns > 0) sessions.push({ id: sessionId, cost: sCost, turns: sTurns, backend: sBackend, model: sModel });
  }

  sessions.sort((a, b) => b.cost - a.cost);
  return { modelStats, toolCounts, routeStats, tierCount, errorCount, sessions, days, totalCacheRead, totalCacheWrite };
}

// ── Render ────────────────────────────────────────────────────────────────────
function render(data) {
  const { modelStats, toolCounts, routeStats, tierCount, errorCount, sessions, days, totalCacheRead = 0, totalCacheWrite = 0 } = data;
  const SEP   = C.muted("─".repeat(50));
  const totalCost   = sessions.reduce((s, x) => s + x.cost,  0);
  const totalTurns  = sessions.reduce((s, x) => s + x.turns, 0);
  const totalErrors = Object.values(errorCount).reduce((s, x) => s + x, 0);

  const cachePart = totalCacheRead > 0
    ? `  ${C.muted(i18n.t("cache↓", "cache↓"))} ${fmtTokens(totalCacheRead)}`
    : "";

  console.log(`\n  ${BOLD}${T.star}Stats${RESET}  ` +
    `${C.muted(i18n.t(`last ${days}d`, `son ${days}g`))}  ` +
    `${C.dim(sessions.length + i18n.t(" sessions", " oturum"))}  ` +
    `${C.dim(totalTurns + i18n.t(" turns", " tur"))}  ` +
    `${fmtCost(totalCost)} ${C.muted(i18n.t("total", "toplam"))}` +
    `${cachePart}\n`);

  // ── Maliyet & Token ────────────────────────────────────────────────────────
  const modelEntries = Object.entries(modelStats).sort((a, b) => b[1].cost - a[1].cost);
  if (modelEntries.length) {
    console.log(`  ${C.muted(i18n.t("Cost & Tokens", "Maliyet & Token"))}`);
    console.log(`  ${SEP}`);
    const maxCost = Math.max(...modelEntries.map(([, v]) => v.cost));
    for (const [key, v] of modelEntries) {
      const avgLat   = v.turns ? Math.round(v.latMs / v.turns / 1000) : 0;
      const cachePart = v.cacheRead > 0
        ? `  ${C.green("cache↓" + fmtTokens(v.cacheRead).replace(/\x1b\[[0-9;]*m/g, ""))}`
        : "";
      console.log(
        `  ${_col(key, 34)}` +
        `  ${fmtCost(v.cost)}` +
        `  ${fmtTokens(v.inTok)}↑ ${fmtTokens(v.outTok)}↓` +
        `  ${C.muted(v.turns + (v.turns === 1 ? " turn" : " turns"))}` +
        (avgLat > 0 ? `  ${C.muted(avgLat + "s/tur")}` : "") +
        cachePart
      );
      if (maxCost > 0) console.log(`  ${bar(v.cost, maxCost)}`);
    }
    console.log(`  ${SEP}\n`);
  }

  // ── Araç Kullanımı ─────────────────────────────────────────────────────────
  const toolEntries = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);
  if (toolEntries.length) {
    const maxTool = toolEntries[0][1];
    console.log(`  ${C.muted(i18n.t("Tool Usage", "Araç Kullanımı"))}`);
    console.log(`  ${SEP}`);
    for (const [tool, count] of toolEntries.slice(0, 12)) {
      const countStr = String(count).padStart(4);
      console.log(`  ${T.accent}${_col(tool, 22)}${RESET}  ${C.dim(countStr)}  ${bar(count, maxTool, 12)}`);
    }
    if (toolEntries.length > 12) console.log(`  ${C.muted(`  … +${toolEntries.length - 12} more`)}`);
    console.log(`  ${SEP}\n`);
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  const routeEntries = Object.entries(routeStats).sort((a, b) => b[1] - a[1]);
  if (routeEntries.length || totalErrors > 0) {
    console.log(`  ${C.muted(i18n.t("Routing & Errors", "Routing & Hatalar"))}`);
    console.log(`  ${SEP}`);
    console.log(`  tier1 ${C.dim(tierCount[1])}  tier2 ${C.dim(tierCount[2])}`);
    for (const [reason, count] of routeEntries.slice(0, 6)) {
      console.log(`  ${C.muted("•")} ${_col(reason, 36)} ${C.dim(count)}`);
    }
    if (totalErrors > 0) {
      console.log(`  ${T.err}✗ backend errors: ${totalErrors}${RESET}`);
      for (const [b, n] of Object.entries(errorCount)) {
        console.log(`    ${C.muted(b)} ${C.dim(n)}`);
      }
    } else {
      console.log(`  ${T.ok}✓ no backend errors${RESET}`);
    }
    console.log(`  ${SEP}\n`);
  }

  // ── En Pahalı Oturumlar ───────────────────────────────────────────────────
  const topSessions = sessions.filter(s => s.cost > 0).slice(0, 5);
  if (topSessions.length) {
    console.log(`  ${C.muted(i18n.t("Top Sessions by Cost", "En Pahalı Oturumlar"))}`);
    console.log(`  ${SEP}`);
    for (const s of topSessions) {
      console.log(
        `  ${C.cyan(s.id)}  ${fmtCost(s.cost)}` +
        `  ${C.muted(_col(s.backend + "/" + s.model, 28))}` +
        `  ${C.dim(s.turns + i18n.t(" turns", " tur"))}`
      );
    }
    console.log(`  ${SEP}`);
  }

  if (!modelEntries.length && !toolEntries.length) {
    console.log(`  ${C.muted(i18n.t("No telemetry data yet. Start a conversation to collect stats.", "Henüz telemetri yok. Bir konuşma başlat."))}`);
  }
  console.log();
}

module.exports = [{
  name:    "stats",
  aliases: ["istatistik", "ist"],
  group:   "Cost & Log",
  desc:    "Telemetry: cost/model, tool usage, routing, errors",
  usage:   "/stats [days]",
  exec: async ({ args }) => {
    const days = parseInt(args[0]) || 30;
    render(aggregate(days));
  },
}];
