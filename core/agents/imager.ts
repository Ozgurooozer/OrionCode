// core/agents/imager.js — ComfyUI image generation
// @ts-nocheck
// Simple: take a prompt + optional workflow index, submit to ComfyUI, return result.
"use strict";

const fs   = require("fs");
const path = require("path");
const http = require("http");

// core/agents/imager.ts → core/agents/ → proje kökü → 3d/
const COMFYUI_ROOT = path.resolve(__dirname, "..", "..", "3d");

const DEFAULTS = {
  workflowsDir:   path.join(COMFYUI_ROOT, "WORKFLOWS"),
  comfyuiHost:    "127.0.0.1",
  comfyuiPort:    8188,
  outputDir:      path.join(COMFYUI_ROOT, "ComfyUI", "output"),
  startBat:       path.join(COMFYUI_ROOT, "start.bat"),
  pollIntervalMs: 1500,
  pollTimeoutMs:  120_000,
};

function _cfg() {
  try {
    const c = require("../router.ts").loadConfig();
    return {
      workflowsDir:   c.comfyuiWorkflowsDir ?? DEFAULTS.workflowsDir,
      comfyuiHost:    c.comfyuiHost         ?? DEFAULTS.comfyuiHost,
      comfyuiPort:    Number(c.comfyuiPort  ?? DEFAULTS.comfyuiPort),
      outputDir:      c.comfyuiOutputDir    ?? DEFAULTS.outputDir,
      startBat:       c.comfyuiStartBat     ?? DEFAULTS.startBat,
      pollIntervalMs: DEFAULTS.pollIntervalMs,
      pollTimeoutMs:  DEFAULTS.pollTimeoutMs,
    };
  } catch { return { ...DEFAULTS }; }
}

// ── Workflow list ─────────────────────────────────────────────────────────────

function listWorkflows(dir) {
  try {
    return fs.readdirSync(dir ?? DEFAULTS.workflowsDir).filter(f => f.endsWith(".json"));
  } catch { return []; }
}

// ── Workflow patching ─────────────────────────────────────────────────────────

function _patchAndGetPrompt(workflowPath, positivePrompt, negativePrompt) {
  const raw    = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  const prompt = raw.prompt ?? raw;

  // Find KSampler positive/negative node IDs
  let posId = null, negId = null;
  for (const node of Object.values(prompt)) {
    if (typeof node !== "object" || !node) continue;
    const ct = node.class_type ?? "";
    if (ct === "KSampler" || ct === "KSamplerAdvanced") {
      posId = String(node.inputs?.positive?.[0] ?? "");
      negId = String(node.inputs?.negative?.[0]  ?? "");
      break;
    }
  }

  // Patch text nodes
  for (const [id, node] of Object.entries(prompt)) {
    if (typeof node !== "object" || !node || node.class_type !== "CLIPTextEncode") continue;
    if (id === posId && positivePrompt) node.inputs.text = positivePrompt;
    if (id === negId && negativePrompt) node.inputs.text = negativePrompt;
  }

  return prompt;
}

// ── ComfyUI HTTP ──────────────────────────────────────────────────────────────

function _post(cfg, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = http.request({
      hostname: cfg.comfyuiHost, port: cfg.comfyuiPort,
      path: urlPath, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); } });
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(data); req.end();
  });
}

function _get(cfg, urlPath) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: cfg.comfyuiHost, port: cfg.comfyuiPort,
      path: urlPath, method: "GET",
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on("error", () => resolve({}));
    req.setTimeout(5_000, () => { req.destroy(); resolve({}); });
    req.end();
  });
}

async function _poll(cfg, promptId) {
  const deadline = Date.now() + cfg.pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, cfg.pollIntervalMs));
    const history = await _get(cfg, `/history/${promptId}`);
    const entry   = history[promptId];
    if (!entry) continue;
    if (entry.status?.completed) {
      const images = [];
      for (const out of Object.values(entry.outputs ?? {})) {
        for (const img of out.images ?? []) {
          images.push({
            filename:  img.filename,
            localPath: path.join(cfg.outputDir, img.subfolder ?? "", img.filename),
            url: `http://${cfg.comfyuiHost}:${cfg.comfyuiPort}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type ?? "output"}`,
          });
        }
      }
      return { success: true, images };
    }
    if (entry.status?.status_str === "error")
      return { success: false, error: "ComfyUI generation error" };
  }
  return { success: false, error: "Timeout (120s)" };
}

// ── Auto-start helpers ────────────────────────────────────────────────────────

async function _waitForReady(cfg, maxWaitMs = 90_000, intervalMs = 3_000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, intervalMs));
    const s = await _get(cfg, "/system_stats");
    if (s.system) return true;
  }
  return false;
}

// ── Status & start ────────────────────────────────────────────────────────────

async function checkStatus() {
  const cfg = _cfg();
  let comfyRunning = false, gpuName, vram;
  try {
    const s = await _get(cfg, "/system_stats");
    if (s.system) {
      comfyRunning = true;
      gpuName = s.devices?.[0]?.name;
      const f = s.devices?.[0]?.vram_free, t = s.devices?.[0]?.vram_total;
      if (t) vram = `${(f/1e9).toFixed(1)}GB free / ${(t/1e9).toFixed(1)}GB total`;
    }
  } catch {}

  let ollamaRunning = false, models = [];
  try {
    const ollama = require("../../backends/ollama.ts");
    models = await ollama.listModels();
    ollamaRunning = models.length > 0;
  } catch {}

  const files = listWorkflows(cfg.workflowsDir);
  return {
    comfyui:   { running: comfyRunning, host: cfg.comfyuiHost, port: cfg.comfyuiPort, gpuName, vram },
    ollama:    { running: ollamaRunning, models },
    workflows: { count: files.length, dir: cfg.workflowsDir, files },
    ready:     comfyRunning && files.length > 0,
  };
}

function startService(service) {
  const { spawn } = require("child_process");
  const cfg = _cfg();

  if (service === "comfyui") {
    const startBat = cfg.startBat;
    if (!fs.existsSync(startBat))
      return { launched: false, message: `Start ComfyUI.bat bulunamadı: ${startBat}\nComfyUI-Easy-Install kurulumu bekleniyor: ${COMFYUI_ROOT}` };
    try {
      spawn("cmd.exe", ["/c", "start", '""', startBat], {
        detached: true, stdio: "ignore", shell: false,
        cwd: path.dirname(startBat),
      }).unref();
      return { launched: true, message: `ComfyUI başlatıldı: ${startBat}` };
    } catch (e) { return { launched: false, message: e.message }; }
  }

  if (service === "ollama") {
    try {
      spawn("ollama", ["serve"], { detached: true, stdio: "ignore", shell: true }).unref();
      return { launched: true, message: "ollama serve başlatıldı" };
    } catch (e) { return { launched: false, message: e.message }; }
  }

  return { launched: false, message: `Bilinmeyen servis: ${service}` };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an image.
 * @param {string} prompt          - Positive prompt (written by Orion or user)
 * @param {object} opts
 * @param {number} [opts.workflow] - Workflow index (0-based, default 0)
 * @param {string} [opts.negative] - Negative prompt (optional)
 * @param {(msg:string)=>void} [opts.onProgress]
 * @returns {Promise<{success:boolean, images?:object[], workflow:string, error?:string}>}
 */
async function run(prompt, { workflow = 0, negative = "", onProgress = () => {} } = {}) {
  const cfg = _cfg();

  // Check ComfyUI — auto-start if down
  onProgress("ComfyUI kontrol ediliyor...");
  let stats = await _get(cfg, "/system_stats");
  if (!stats.system) {
    onProgress("ComfyUI kapalı — başlatılıyor...");
    const launched = startService("comfyui");
    if (!launched.launched)
      return { success: false, error: `ComfyUI başlatılamadı: ${launched.message}` };
    onProgress("ComfyUI başlatıldı, hazır olması bekleniyor (~30-60 sn)...");
    const ready = await _waitForReady(cfg);
    if (!ready)
      return { success: false, error: "ComfyUI 90 saniyede hazır olmadı — manuel kontrol et: /image status" };
    stats = await _get(cfg, "/system_stats");
  }

  // Pick workflow
  const files = listWorkflows(cfg.workflowsDir);
  if (!files.length)
    return { success: false, error: `workflow bulunamadı: ${cfg.workflowsDir}` };

  const idx          = Math.max(0, Math.min(workflow, files.length - 1));
  const workflowFile = files[idx];
  onProgress(`Workflow: ${workflowFile} (${idx + 1}/${files.length})`);

  // Patch & submit
  let patched;
  try {
    patched = _patchAndGetPrompt(path.join(cfg.workflowsDir, workflowFile), prompt, negative || undefined);
  } catch (e) { return { success: false, error: `Workflow patch hatası: ${e.message}`, workflow: workflowFile }; }

  onProgress("ComfyUI'ye gönderiliyor...");
  let promptId;
  try {
    const r = await _post(cfg, "/prompt", { prompt: patched, client_id: "orion-imager" });
    if (!r.prompt_id) throw new Error(JSON.stringify(r).slice(0, 120));
    promptId = r.prompt_id;
  } catch (e) { return { success: false, error: `Gönderim hatası: ${e.message}`, workflow: workflowFile }; }

  onProgress(`Üretiliyor... (${promptId})`);
  const gen = await _poll(cfg, promptId);

  return {
    success:  gen.success,
    images:   gen.images,
    workflow: workflowFile,
    promptId,
    error:    gen.error,
  };
}

// ── Skill manifest (Hafta 4 standardı) ───────────────────────────────────────

const manifest = Object.freeze({
  name:          "image",
  version:       "1.0",
  cost_class:    "zero_llm",    // LLM çağrısı yok
  vram_needed_gb: 2.5,
  triggers:      ["resim", "görsel", "çiz", "draw", "image", "generate", "illustrate", "paint", "anime", "pixel", "3d", "render"],
  input_schema:  { prompt: "string", workflow: "integer?", negative: "string?" },
  output_schema: { images: "array", workflow: "string", promptId: "string?" },
});

module.exports = { run, checkStatus, startService, listWorkflows, DEFAULTS, manifest };
