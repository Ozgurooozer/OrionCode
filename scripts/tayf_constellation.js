#!/usr/bin/env node
// scripts/tayf_constellation.js — Faz 7: Takımyıldız görselleştirme
// ~/.orion/scheduler_events.jsonl → raporlar/constellation-YYYYMMDD.html
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const ORION_HOME = process.env.ORION_HOME ?? path.join(os.homedir(), ".orion");
const LOG_FILE   = path.join(ORION_HOME, "scheduler_events.jsonl");
const REPORT_DIR = path.join(__dirname, "..", "raporlar");

// ── Event okuma ───────────────────────────────────────────────────────────────

function readEvents() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs.readFileSync(LOG_FILE, "utf8")
    .trim().split("\n")
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

// ── İşleme ───────────────────────────────────────────────────────────────────

function processEvents(events) {
  const jobs   = [];
  const ticks  = [];
  let pending  = {};

  for (const e of events) {
    if (e.event === "job_start") {
      pending[e.job_id] = { start: e.timestamp, skill: e.skill ?? "chat", type: e.type };
    }
    if (e.event === "job_done" && pending[e.job_id]) {
      const p = pending[e.job_id];
      jobs.push({ id: e.job_id, skill: p.skill, type: p.type,
                  start: p.start, end: e.timestamp, wall_ms: e.wall_ms ?? (e.timestamp - p.start) });
      delete pending[e.job_id];
    }
    if (e.event === "tack") {
      ticks.push({ timestamp: e.timestamp, loaded: e.loaded, switch_ms: e.switch_ms ?? 0 });
    }
  }

  return { jobs, ticks };
}

// ── İstatistikler ─────────────────────────────────────────────────────────────

function stats(jobs, ticks) {
  const bySkill = {};
  for (const j of jobs) {
    if (!bySkill[j.skill]) bySkill[j.skill] = { count: 0, total_ms: 0 };
    bySkill[j.skill].count++;
    bySkill[j.skill].total_ms += j.wall_ms;
  }
  const totalSwitch = ticks.reduce((s, t) => s + t.switch_ms, 0);
  return { bySkill, switchCount: ticks.length, totalSwitchMs: totalSwitch };
}

// ── Demo veri (log yoksa) ──────────────────────────────────────────────────

function demoData() {
  const now  = Date.now();
  const jobs = [
    { id: "d1", skill: "image",     type: "skill",  start: now - 60000, end: now - 54000, wall_ms: 6000 },
    { id: "d2", skill: "chat",      type: "sohbet", start: now - 52000, end: now - 49000, wall_ms: 3000 },
    { id: "d3", skill: "voice",     type: "skill",  start: now - 47000, end: now - 45000, wall_ms: 2000 },
    { id: "d4", skill: "image",     type: "skill",  start: now - 43000, end: now - 37000, wall_ms: 6000 },
    { id: "d5", skill: "animation", type: "skill",  start: now - 35000, end: now - 28000, wall_ms: 7000 },
    { id: "d6", skill: "code",      type: "skill",  start: now - 25000, end: now - 18000, wall_ms: 7000 },
    { id: "d7", skill: "chat",      type: "sohbet", start: now - 15000, end: now - 12000, wall_ms: 3000 },
  ];
  const ticks = [
    { timestamp: now - 55000, loaded: "comfyui",  switch_ms: 1200 },
    { timestamp: now - 48000, loaded: "ollama",   switch_ms: 900  },
    { timestamp: now - 44000, loaded: "comfyui",  switch_ms: 1100 },
    { timestamp: now - 36000, loaded: "comfyui",  switch_ms: 800  },
    { timestamp: now - 26000, loaded: "ollama",   switch_ms: 950  },
    { timestamp: now - 16000, loaded: "ollama",   switch_ms: 700  },
  ];
  return { jobs, ticks, isDemo: true };
}

// ── HTML üretici ──────────────────────────────────────────────────────────────

function generateHTML(jobs, ticks, isDemo) {
  const s = stats(jobs, ticks);
  const totalJobs = jobs.length;

  const startTs  = jobs.length ? Math.min(...jobs.map(j => j.start)) : Date.now() - 60000;
  const endTs    = jobs.length ? Math.max(...jobs.map(j => j.end))   : Date.now();
  const spanMs   = Math.max(endTs - startTs, 1);

  const SKILL_CONFIG = {
    image:     { label: "Resim",     color: "#818cf8", cx: 200, cy: 140 },
    voice:     { label: "Ses",       color: "#34d399", cx: 520, cy: 100 },
    animation: { label: "Animasyon", color: "#f59e0b", cx: 680, cy: 220 },
    code:      { label: "Kod",       color: "#60a5fa", cx: 600, cy: 360 },
    chat:      { label: "Sohbet",    color: "#a78bfa", cx: 300, cy: 330 },
  };

  // Yıldız çizgileri (konstellasyon kenarları)
  const EDGES = [
    ["image", "voice"], ["voice", "animation"], ["animation", "code"],
    ["code", "chat"],   ["chat", "image"],       ["image", "animation"],
  ];

  function pct(ts) { return ((ts - startTs) / spanMs * 100).toFixed(2); }

  // Zaman çizelgesi satırları
  const SKILL_ORDER = ["image", "voice", "animation", "code", "chat"];
  const rows = SKILL_ORDER.map((sk, i) => {
    const skJobs = jobs.filter(j => j.skill === sk);
    const bars = skJobs.map(j => {
      const left  = pct(j.start);
      const width = Math.max(pct(j.end) - pct(j.start), 0.3);
      return `<div class="bar" style="left:${left}%;width:${width}%;background:${SKILL_CONFIG[sk].color}22;border:1px solid ${SKILL_CONFIG[sk].color}" title="${j.wall_ms}ms"></div>`;
    }).join("");
    const label = SKILL_CONFIG[sk].label;
    const count = skJobs.length;
    const avg   = count ? Math.round(skJobs.reduce((s, j) => s + j.wall_ms, 0) / count) : 0;
    return `<div class="row">
      <div class="row-label" style="color:${SKILL_CONFIG[sk].color}">${label}</div>
      <div class="row-track">${bars}</div>
      <div class="row-stat">${count} iş${count ? ` · ort ${avg}ms` : ""}</div>
    </div>`;
  }).join("");

  // Tick işaretleri
  const tickMarks = ticks.map(t => {
    const left = pct(t.timestamp);
    const color = t.loaded === "comfyui" ? "#f59e0b" : "#60a5fa";
    return `<div class="tick-mark" style="left:${left}%;background:${color}" title="${t.loaded} yüklendi · ${t.switch_ms}ms"></div>`;
  }).join("");

  // SVG yıldız haritası
  const edgeSVG = EDGES.map(([a, b]) => {
    const ca = SKILL_CONFIG[a], cb = SKILL_CONFIG[b];
    return `<line x1="${ca.cx}" y1="${ca.cy}" x2="${cb.cx}" y2="${cb.cy}" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>`;
  }).join("\n");

  const starSVG = Object.entries(SKILL_CONFIG).map(([sk, c]) => {
    const d = s.bySkill[sk] ?? { count: 0 };
    const r = Math.max(12, Math.min(30, 12 + d.count * 3));
    const glow = d.count > 0 ? `filter="url(#glow)"` : "";
    return `<g class="star-group" data-skill="${sk}">
      <circle cx="${c.cx}" cy="${c.cy}" r="${r}" fill="${c.color}33" stroke="${c.color}" stroke-width="1.5" ${glow}/>
      <circle cx="${c.cx}" cy="${c.cy}" r="4" fill="${c.color}" class="${d.count > 0 ? "pulse" : ""}"/>
      <text x="${c.cx}" y="${c.cy + r + 16}" text-anchor="middle" fill="${c.color}" font-size="12">${c.label}</text>
      <text x="${c.cx}" y="${c.cy + r + 28}" text-anchor="middle" fill="#64748b" font-size="10">${d.count > 0 ? d.count + " iş" : "—"}</text>
    </g>`;
  }).join("\n");

  const switchStat = s.switchCount > 0
    ? `${s.switchCount} geçiş · ort ${Math.round(s.totalSwitchMs / s.switchCount)}ms`
    : "geçiş yok";

  const demoNote = isDemo
    ? `<div class="demo-note">⚠ Demo veri — gerçek log: ${LOG_FILE}</div>`
    : `<div class="demo-note" style="color:#34d399">✓ ${LOG_FILE}</div>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>TAYF Takımyıldız — Faz 7</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f172a; color: #cbd5e1; font-family: monospace; padding: 24px; }
  h1 { color: #818cf8; font-size: 18px; margin-bottom: 4px; }
  .subtitle { color: #475569; font-size: 12px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .panel { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
  .panel h2 { font-size: 13px; color: #94a3b8; margin-bottom: 16px; letter-spacing: 0.08em; }
  svg { width: 100%; height: 460px; }
  .row { display: flex; align-items: center; height: 32px; border-bottom: 1px solid #1e293b; }
  .row-label { width: 80px; font-size: 11px; flex-shrink: 0; }
  .row-track  { flex: 1; height: 20px; position: relative; background: #0f172a; border-radius: 4px; overflow: hidden; }
  .bar { position: absolute; top: 2px; height: 16px; border-radius: 3px; }
  .row-stat { width: 130px; font-size: 10px; color: #475569; text-align: right; padding-right: 4px; }
  .tick-wrap { position: relative; height: 16px; margin-top: 8px; }
  .tick-mark { position: absolute; top: 0; width: 2px; height: 12px; border-radius: 1px; opacity: 0.7; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px; }
  .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 28px; color: #818cf8; }
  .stat-label { font-size: 11px; color: #475569; margin-top: 4px; }
  .demo-note { font-size: 11px; color: #f59e0b; margin-top: 16px; padding: 8px; background: #1e293b; border-radius: 4px; }
  @keyframes pulse { 0%,100%{r:4;opacity:1} 50%{r:7;opacity:0.6} }
  .pulse { animation: pulse 2s ease-in-out infinite; }
  @keyframes starPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .star-group circle:first-child { animation: starPulse 3s ease-in-out infinite; }
  #glow feGaussianBlur { stdDeviation: 3; }
</style>
</head>
<body>
<h1>TAYF Takımyıldız — Faz 7</h1>
<div class="subtitle">${isDemo ? "DEMO MODU" : new Date(startTs).toLocaleString("tr-TR")} — ${totalJobs} iş · ${switchStat}</div>

<div class="grid">
  <div class="panel">
    <h2>TAKIMYILDIZ HARİTASI</h2>
    <svg viewBox="0 0 880 460">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${edgeSVG}
      ${starSVG}
    </svg>
  </div>

  <div class="panel">
    <h2>ZAMAN ÇİZELGESİ</h2>
    ${rows}
    <div class="tick-wrap">${tickMarks}</div>
  </div>
</div>

<div class="stats">
  <div class="stat-card">
    <div class="stat-value">${totalJobs}</div>
    <div class="stat-label">toplam iş</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${s.switchCount}</div>
    <div class="stat-label">model geçişi</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${s.totalSwitchMs > 0 ? Math.round(s.totalSwitchMs / s.switchCount) + "ms" : "—"}</div>
    <div class="stat-label">ort geçiş süresi</div>
  </div>
</div>

${demoNote}
</body>
</html>`;
}

// ── Ana akış ──────────────────────────────────────────────────────────────────

function main() {
  let events = readEvents();
  let isDemo = false;
  let jobs, ticks;

  if (events.length === 0) {
    console.log(`Log bulunamadı: ${LOG_FILE} — demo veri kullanılıyor.`);
    ({ jobs, ticks, isDemo } = demoData());
    isDemo = true;
  } else {
    ({ jobs, ticks } = processEvents(events));
    console.log(`${events.length} event okundu → ${jobs.length} iş, ${ticks.length} geçiş`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const out  = path.join(REPORT_DIR, `constellation-${date}.html`);

  fs.writeFileSync(out, generateHTML(jobs, ticks, isDemo), "utf8");
  console.log(`✓ Rapor: ${out}`);
}

main();
