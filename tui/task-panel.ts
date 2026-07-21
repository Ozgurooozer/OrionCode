// tui/task-panel.js — görev yöneticisi TUI bileşeni
// @ts-nocheck
// Aktif kuyruğu ve scheduler durumunu terminale render eder.
"use strict";

const { C } = require("./colors.ts");

// ── In-memory durum (event listener'lar günceller) ────────────────────────────

const _state = {
  jobs:       new Map(),  // job_id → job nesnesi
  recent:     [],         // son 20 tamamlanan iş
  processing: false,
  queue_length: 0,
  vram: {
    currentlyLoaded: "none",
    vram_used_gb:    0,
    mean_cycle_ms:   null,
    cycle_count:     0,
  },
};

let _listening = false;

function _attach() {
  if (_listening) return;
  _listening = true;
  try {
    const { emitter } = require("../core/events.ts");

    emitter.on("queue:added", ev => {
      _state.queue_length = ev.payload?.queue_length ?? _state.queue_length;
      const j = ev.payload;
      if (j?.job_id) _state.jobs.set(j.job_id, { id: j.job_id, type: j.type, skill: j.skill, status: "queued", priority: j.priority });
    });

    emitter.on("queue:status", ev => {
      _state.processing    = ev.payload?.processing    ?? _state.processing;
      _state.queue_length  = ev.payload?.queue_length  ?? _state.queue_length;
    });

    emitter.on("scheduler:job_start", ev => {
      const { job_id, type, skill } = ev.payload ?? {};
      if (job_id) _state.jobs.set(job_id, { ...(_state.jobs.get(job_id) ?? {}), id: job_id, type, skill, status: "running", started_at: Date.now() });
    });

    emitter.on("scheduler:job_done", ev => {
      const { job_id, wall_ms, success } = ev.payload ?? {};
      if (job_id) {
        const j = _state.jobs.get(job_id) ?? { id: job_id };
        j.status  = success ? "done" : "error";
        j.wall_ms = wall_ms;
        _state.jobs.delete(job_id);
        _state.recent.unshift({ ...j, finished_at: Date.now() });
        if (_state.recent.length > 20) _state.recent.pop();
      }
    });

    emitter.on("scheduler:tick", ev => {
      const p = ev.payload ?? {};
      _state.vram.currentlyLoaded = p.loading ?? _state.vram.currentlyLoaded;
    });
  } catch {}
}

// ── Render ────────────────────────────────────────────────────────────────────

const VRAM_GB = { ollama: 6.5, comfyui: 2.5, none: 0 };

function _rampaSatiri() {
  const v     = _state.vram;
  const used  = VRAM_GB[v.currentlyLoaded] ?? 0;
  const cycle = v.mean_cycle_ms != null ? ` | ort. döngü: ${v.mean_cycle_ms}ms` : "";
  const color = v.currentlyLoaded === "none" ? C.muted : C.green;
  return `${C.muted("[RAMPA]")} ${color(v.currentlyLoaded)} ${C.muted(`${used}GB / 8GB`)}  ${C.muted(`sıra: ${_state.queue_length}`)}${cycle}`;
}

function _jobSatiri(job) {
  const icon   = job.status === "running" ? C.yellow("▶") : job.status === "done" ? C.green("✓") : C.muted("…");
  const label  = job.skill ? `${job.type}:${job.skill}` : job.type;
  const time   = job.wall_ms ? C.muted(` ${job.wall_ms}ms`) : "";
  return `  ${icon} ${C.accent(job.id.slice(-6))} ${label}${time}`;
}

/**
 * Görev yöneticisini render et ve string döndür.
 * TUI'ye yazdırmak için `process.stdout.write(render())` kullan.
 */
function render() {
  _attach();
  const lines = [];
  lines.push(`${C.bold("─── Görev Yöneticisi ─────────────────────────────")}`);
  lines.push(_rampaSatiri());

  const active = [..._state.jobs.values()].filter(j => j.status === "running");
  const queued = [..._state.jobs.values()].filter(j => j.status === "queued");

  if (active.length === 0 && queued.length === 0) {
    lines.push(C.muted("  (boş kuyruk)"));
  } else {
    if (active.length) {
      lines.push(C.muted("  AKTİF:"));
      for (const j of active) lines.push(_jobSatiri(j));
    }
    if (queued.length) {
      lines.push(C.muted("  SIRA:"));
      for (const j of queued) lines.push(_jobSatiri(j));
    }
  }

  if (_state.recent.length) {
    lines.push(C.muted("  SON:"));
    for (const j of _state.recent.slice(0, 5)) lines.push(_jobSatiri(j));
  }

  lines.push(`${C.muted("──────────────────────────────────────────────────")}`);
  return lines.join("\n") + "\n";
}

/** Canlı render — eventleri dinle ve her değişimde stdout'a yaz */
function startLive(onUpdate) {
  _attach();
  const { emitter } = require("../core/events.ts");
  const EVENTS = ["queue:added", "queue:status", "scheduler:job_start", "scheduler:job_done", "scheduler:tick"];
  const cb = () => { if (onUpdate) onUpdate(render()); };
  for (const ev of EVENTS) emitter.on(ev, cb);
  return () => { for (const ev of EVENTS) emitter.off(ev, cb); };
}

module.exports = { render, startLive, _state };
