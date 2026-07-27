// core/commands/log.js — Oturum olaylarını göster (/log)
// @ts-nocheck
// Telemetri NDJSON dosyasından son N olayı okur; "nerede takıldı" sorusunu yanıtlar.
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

const EVENT_ICONS = {
  turn_start:       "▶",
  turn_complete:    "✔",
  tool_call:        "⚙",
  routed:           "→",
  backend_error:    "✖",
  coordinator_error:"✖",
  react_fallback:   "↷",
  skill_injected:   "★",
  speculex_hit:     "⚡",
  silent_catch_hit: "⚠",
};

function fmt(ev) {
  const icon  = EVENT_ICONS[ev.event] ?? "·";
  const age   = Math.round((Date.now() - ev.ts) / 1000);
  const ageStr = age < 60 ? `${age}s ago` : `${Math.round(age / 60)}m ago`;
  let detail = "";
  if (ev.event === "tool_call")     detail = `${ev.tool} ${ev.ok ? C.green("ok") : C.red("err")} ${ev.latencyMs ?? 0}ms`;
  if (ev.event === "turn_start")    detail = `${ev.backend}/${ev.model ?? ""} ~${ev.estimatedInputTokens ?? 0}tok`;
  if (ev.event === "turn_complete") detail = `${ev.outputTokens ?? 0} out  ${ev.wallMs ?? 0}ms  $${(ev.costUSD ?? 0).toFixed(4)}`;
  if (ev.event === "routed")        detail = `tier${ev.tier} (${ev.reason ?? ""})`;
  if (ev.event === "backend_error") detail = C.red(ev.error ?? "");
  if (ev.event === "coordinator_error") detail = C.red(`[${ev.phase}] ${ev.error ?? ""}`);
  if (ev.event === "silent_catch_hit") detail = C.red(`${ev.site ?? "?"}: ${ev.error ?? ""}${ev.detail ? ` [${ev.detail}]` : ""}`);
  return `  ${C.dim(ageStr.padStart(8))}  ${C.cyan(icon)} ${C.bold((ev.event ?? "").padEnd(16))}  ${C.dim(detail)}`;
}

module.exports = [{
  name:    "log",
  aliases: ["gunluk"],
  group:   "Session",
  desc:    "Show recent session events (tool calls, routing, errors)",
  usage:   "/log [N] [-f|--watch]",
  exec: ({ args, session }) => {
    const { readLog } = require("../telemetry.ts");
    const flags   = (Array.isArray(args) ? args : String(args ?? "").split(/\s+/)).map(String);
    const watch   = flags.includes("-f") || flags.includes("--watch");
    const numArg  = flags.find(f => /^\d+$/.test(f));
    const N       = parseInt(numArg ?? "20", 10) || 20;

    if (!watch) {
      const events = readLog(session.id);
      if (!events.length) {
        print.system(i18n.t("No log entries yet for this session.", "Bu oturum için henüz log kaydı yok."));
        return;
      }
      const shown = events.slice(-N);
      console.log(`\n${C.bold(i18n.t(`Last ${shown.length} events (session ${session.id}):`, `Son ${shown.length} olay (oturum ${session.id}):`))}`)
      for (const ev of shown) {
        try { console.log(fmt(ev)); } catch {}
      }
      console.log("");
      return;
    }

    // --watch: canlı izleme — yeni olayları her saniye basar
    let seen = 0;
    console.log(`\n${C.bold(`/log --watch  session:${session.id}`)}  ${C.dim("Ctrl+C ile dur")}\n`);
    const iv = setInterval(() => {
      const all = readLog(session.id);
      if (all.length > seen) {
        for (const ev of all.slice(seen)) {
          try { process.stdout.write(fmt(ev) + "\n"); } catch {}
        }
        seen = all.length;
      }
    }, 1000);
    // process SIGINT veya session bitişinde temizle
    process.once("SIGINT", () => { clearInterval(iv); process.stdout.write("\n"); });
  },
}];
