// core/scheduler.js — VRAM eşapman ritmi (Saatçi tasarımı)
// @ts-nocheck
// Ollama (~6.5GB) ve ComfyUI (~2.5GB) 8GB VRAM'de eşzamanlı çalışamaz.
// Tick: yüklü modeli boşalt. Tack: yeni modeli yükle + koş.
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const http = require("http");
const { emit } = require("./events.ts");

// ── Durum ────────────────────────────────────────────────────────────────────

let _currentlyLoaded = "none"; // "ollama" | "comfyui" | "none"
let _cycleCount      = 0;
let _totalCycleMs    = 0;

function currentlyLoaded() { return _currentlyLoaded; }

function meanCycleMs() {
  return _cycleCount > 0 ? Math.round(_totalCycleMs / _cycleCount) : null;
}

// ── Telemetri log ─────────────────────────────────────────────────────────────

function _logDir() {
  const base = process.env.ORION_HOME ?? path.join(os.homedir(), ".orion");
  return base;
}

function _logEvent(name, payload) {
  try {
    const dir  = _logDir();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "scheduler_events.jsonl");
    fs.appendFileSync(file, JSON.stringify({ event: name, timestamp: Date.now(), ...payload }) + "\n", "utf8");
  } catch {}
}

// ── Ollama VRAM boşaltma ──────────────────────────────────────────────────────
// keep_alive: 0 → model VRAM'den atılır

function _ollamaUnload(host, port, model) {
  return new Promise(resolve => {
    const body = JSON.stringify({ model, keep_alive: 0, stream: false });
    const req  = http.request({
      hostname: host, port,
      path: "/api/generate", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, res => { res.resume(); res.on("end", resolve); });
    req.on("error", () => resolve());
    req.setTimeout(8_000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Config ────────────────────────────────────────────────────────────────────

function _cfg() {
  try {
    const r = require("./router.ts").loadConfig();
    return {
      model:      r.tier1Model ?? "qwen2.5-coder:7b",
      ollamaHost: process.env.OLLAMA_HOST ?? "localhost",
      ollamaPort: Number(process.env.OLLAMA_PORT ?? 11434),
    };
  } catch { return { model: "qwen2.5-coder:7b", ollamaHost: "localhost", ollamaPort: 11434 }; }
}

// ── Geçiş: Tick (boşalt), Tack (yükle + çalıştır) ───────────────────────────

async function _tick(toLoad) {
  const t0  = Date.now();
  const cfg = _cfg();
  emit("scheduler:tick", null, { unloading: _currentlyLoaded, loading: toLoad });
  _logEvent("tick", { unloading: _currentlyLoaded, loading: toLoad });

  if (_currentlyLoaded === "ollama") {
    _logEvent("model:unload_start", { model: cfg.model });
    await _ollamaUnload(cfg.ollamaHost, cfg.ollamaPort, cfg.model);
    _logEvent("model:unload_done", { model: cfg.model, duration_ms: Date.now() - t0 });
  }
  // ComfyUI ayrı process — explicit unload gerekmez

  _currentlyLoaded = toLoad;
  emit("scheduler:tack", null, { loaded: toLoad, switch_ms: Date.now() - t0 });
  _logEvent("tack", { loaded: toLoad, switch_ms: Date.now() - t0 });
}

// ── İş işleyici ───────────────────────────────────────────────────────────────

async function _processJob(job) {
  const t0 = Date.now();
  emit("scheduler:job_start", null, { job_id: job.id, type: job.type, skill: job.skill });
  _logEvent("job_start", { job_id: job.id, type: job.type, skill: job.skill });

  let result;

  if (job.type === "skill" && job.skill === "image") {
    if (_currentlyLoaded !== "comfyui") await _tick("comfyui");
    const imager = require("./agents/imager.ts");
    result = await imager.run(job.prompt, job.opts ?? {});

  } else if (job.type === "skill" && job.skill === "voice") {
    // ComfyUI'ye gerek yok; voice hafif model (0.8GB) → "none" yeterli
    if (_currentlyLoaded === "comfyui") await _tick("none");
    const voice = require("./agents/voice.ts");
    result = await voice.run(job.prompt, job.opts ?? {});

  } else {
    // chat / orchestration — Ollama
    if (_currentlyLoaded !== "ollama") await _tick("ollama");
    result = { success: true, type: "chat", note: "chat işi session döngüsü tarafından yönetilir" };
  }

  const wall_ms = Date.now() - t0;
  _cycleCount++;
  _totalCycleMs += wall_ms;

  emit("scheduler:job_done", null, {
    job_id:    job.id,
    type:      job.type,
    skill:     job.skill,
    wall_ms,
    mean_cycle_ms: meanCycleMs(),
    success:   result?.success ?? true,
  });
  _logEvent("job_done", { job_id: job.id, wall_ms, success: result?.success ?? true });

  return result;
}

// ── Başlatma ──────────────────────────────────────────────────────────────────

function start() {
  const queue = require("./queue.ts");
  queue.setProcessor(_processJob);
  emit("scheduler:started", null, { currentlyLoaded: _currentlyLoaded });
}

// ── VRAM durum görünümü ───────────────────────────────────────────────────────

function vramStatus() {
  const VRAM_MAP = { ollama: 6.5, comfyui: 2.5, none: 0 };
  return {
    currentlyLoaded: _currentlyLoaded,
    vram_used_gb:    VRAM_MAP[_currentlyLoaded] ?? 0,
    mean_cycle_ms:   meanCycleMs(),
    cycle_count:     _cycleCount,
  };
}

module.exports = { start, currentlyLoaded, vramStatus, meanCycleMs };
