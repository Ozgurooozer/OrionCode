// core/agents/imager.js — ComfyUI single-task image generation agent
// Single local model inference: picks workflow + crafts prompt, then submits to ComfyUI.
"use strict";

const fs   = require("fs");
const path = require("path");
const http = require("http");
const os   = require("os");

const DEFAULTS = {
  workflowsDir:  "C:\\3d\\WORKFLOWS",
  comfyuiHost:   "127.0.0.1",
  comfyuiPort:   8188,
  outputDir:     "C:\\3d\\ComfyUI\\output",
  pollIntervalMs: 1500,
  pollTimeoutMs:  120_000,
};

function _cfg() {
  try {
    const cfg = require("../router.ts").loadConfig();
    return {
      workflowsDir:   cfg.comfyuiWorkflowsDir  ?? DEFAULTS.workflowsDir,
      comfyuiHost:    cfg.comfyuiHost           ?? DEFAULTS.comfyuiHost,
      comfyuiPort:    Number(cfg.comfyuiPort    ?? DEFAULTS.comfyuiPort),
      outputDir:      cfg.comfyuiOutputDir      ?? DEFAULTS.outputDir,
      pollIntervalMs: DEFAULTS.pollIntervalMs,
      pollTimeoutMs:  DEFAULTS.pollTimeoutMs,
    };
  } catch { return { ...DEFAULTS }; }
}

// ── Workflow catalog ──────────────────────────────────────────────────────────

function _styleTags(filename, positivePrompt) {
  const src = (filename + " " + positivePrompt).toLowerCase();
  const tags = [];
  if (/anime|illustrious/.test(src))     tags.push("anime");
  if (/pixel|sprite/.test(src))          tags.push("pixel-art");
  if (/sdxl|_xl/.test(src))             tags.push("sdxl");
  if (/3d|mesh|pixal/.test(src))         tags.push("3d");
  if (/retro|scifi/.test(src))           tags.push("retro-scifi");
  if (/character|warrior|person/.test(src)) tags.push("character");
  if (/landscape|nature|cave/.test(src)) tags.push("landscape");
  if (/rev.anim|hybrid/.test(src))       tags.push("realistic-anime");
  return tags;
}

function _resolvePromptNodes(prompt) {
  let positiveId = null, negativeId = null;
  for (const node of Object.values(prompt)) {
    if (typeof node !== "object" || !node) continue;
    const ct = node.class_type ?? "";
    if (ct === "KSampler" || ct === "KSamplerAdvanced") {
      positiveId = String(node.inputs?.positive?.[0] ?? "");
      negativeId = String(node.inputs?.negative?.[0] ?? "");
      break;
    }
  }
  return { positiveId, negativeId };
}

function scanWorkflows(dir) {
  const workflowsDir = dir ?? DEFAULTS.workflowsDir;
  return fs.readdirSync(workflowsDir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(workflowsDir, f), "utf8"));
        const prompt = raw.prompt ?? raw;
        const { positiveId, negativeId } = _resolvePromptNodes(prompt);
        let checkpoint = "unknown", positivePrompt = "", negativePrompt = "";
        for (const [id, node] of Object.entries(prompt)) {
          if (typeof node !== "object" || !node) continue;
          if (node.class_type === "CheckpointLoaderSimple")
            checkpoint = node.inputs?.ckpt_name ?? "unknown";
          if (node.class_type === "CLIPTextEncode") {
            if (id === positiveId) positivePrompt = String(node.inputs?.text ?? "").slice(0, 100);
            if (id === negativeId) negativePrompt = String(node.inputs?.text ?? "").slice(0, 80);
          }
        }
        return {
          file: f,
          checkpoint,
          positivePrompt,
          negativePrompt,
          styleTags: _styleTags(f, positivePrompt),
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

// ── Ollama single-shot planner ────────────────────────────────────────────────

async function _planWithOllama(task, catalog) {
  const ollama = require("../../backends/ollama.ts");
  const model  = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

  const catalogText = catalog.map((w, i) =>
    `${i + 1}. "${w.file}" — checkpoint: ${w.checkpoint.replace(/\.safetensors$/,"")
    } | tags: ${w.styleTags.join(",") || "general"} | example: "${w.positivePrompt.slice(0, 70)}"`
  ).join("\n");

  const system = `You are a ComfyUI workflow selector and prompt engineer.
Given a user image request and a workflow list, choose the best workflow and write an optimized prompt.

Rules:
- Pick the workflow whose style best matches the request
- Write a detailed positive_prompt (comma-separated tags, rich descriptors)
- Keep negative_prompt short (artifacts to avoid)
- Return ONLY valid JSON — no markdown fences, no explanation

JSON schema:
{
  "workflow": "<exact filename from the list>",
  "positive_prompt": "detailed, comma-separated prompt...",
  "negative_prompt": "bad quality, blurry, deformed, ...",
  "reason": "one sentence explaining the workflow choice"
}`;

  const messages = [
    { role: "system", content: system },
    { role: "user",   content: `Available workflows:\n${catalogText}\n\nUser request: "${task}"` },
  ];

  const text = await ollama.chat(model, messages, { stream: false });

  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Model returned non-JSON. Raw: ${text.slice(0, 300)}`);
  return JSON.parse(m[0]);
}

// ── Workflow patching ─────────────────────────────────────────────────────────

function _patchWorkflow(workflowPath, positivePrompt, negativePrompt) {
  const raw    = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  const prompt = raw.prompt ?? raw;
  const { positiveId, negativeId } = _resolvePromptNodes(prompt);

  for (const [id, node] of Object.entries(prompt)) {
    if (typeof node !== "object" || !node || node.class_type !== "CLIPTextEncode") continue;
    if (id === positiveId && positivePrompt) node.inputs.text = positivePrompt;
    if (id === negativeId && negativePrompt) node.inputs.text = negativePrompt;
  }

  return prompt; // ComfyUI API expects the prompt object directly
}

// ── ComfyUI HTTP helpers ──────────────────────────────────────────────────────

function _post(cfg, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = http.request({
      hostname: cfg.comfyuiHost,
      port:     cfg.comfyuiPort,
      path:     urlPath,
      method:   "POST",
      headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); } });
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error("ComfyUI request timeout")); });
    req.write(data);
    req.end();
  });
}

function _get(cfg, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: cfg.comfyuiHost,
      port:     cfg.comfyuiPort,
      path:     urlPath,
      method:   "GET",
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on("error", reject);
    req.setTimeout(5_000, () => { req.destroy(); resolve({}); });
    req.end();
  });
}

async function _pingComfyUI(cfg) {
  try {
    const r = await _get(cfg, "/system_stats");
    return !!r.system;
  } catch { return false; }
}

async function _submit(cfg, patchedPrompt) {
  const result = await _post(cfg, "/prompt", {
    prompt:    patchedPrompt,
    client_id: "orion-imager",
  });
  if (!result.prompt_id) throw new Error(`ComfyUI rejected: ${JSON.stringify(result).slice(0, 200)}`);
  return result.prompt_id;
}

async function _pollUntilDone(cfg, promptId) {
  const deadline = Date.now() + cfg.pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, cfg.pollIntervalMs));
    const history = await _get(cfg, `/history/${promptId}`);
    const entry   = history[promptId];
    if (!entry) continue;

    const status = entry.status ?? {};
    if (status.completed) {
      const images = [];
      for (const nodeOut of Object.values(entry.outputs ?? {})) {
        for (const img of nodeOut.images ?? []) {
          const localPath = path.join(
            cfg.outputDir,
            img.subfolder ?? "",
            img.filename
          );
          images.push({
            filename:  img.filename,
            subfolder: img.subfolder ?? "",
            localPath,
            url: `http://${cfg.comfyuiHost}:${cfg.comfyuiPort}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type ?? "output"}`,
          });
        }
      }
      return { success: true, images };
    }

    if (status.status_str === "error") {
      const msgs = Object.values(entry.status?.messages ?? {}).flat();
      return { success: false, error: `ComfyUI error: ${msgs.slice(-1)[0] ?? "unknown"}` };
    }
  }
  return { success: false, error: "Generation timed out (120s)" };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an image using ComfyUI.
 * Single local model inference selects workflow + crafts prompt.
 *
 * @param {string} task - User's image description in natural language
 * @param {{ onProgress?: (msg: string) => void, model?: string }} opts
 * @returns {Promise<{
 *   success: boolean,
 *   images?: {filename:string, localPath:string, url:string}[],
 *   workflow?: string, positivePrompt?: string, negativePrompt?: string,
 *   reason?: string, promptId?: string, evaluation?: string, error?: string
 * }>}
 */
async function run(task, { onProgress = (_s) => {}, model } = {}) {
  const cfg = _cfg();
  if (model) process.env.OLLAMA_MODEL = model;

  onProgress("ComfyUI bağlantısı kontrol ediliyor...");
  if (!(await _pingComfyUI(cfg))) {
    return {
      success: false,
      error: `ComfyUI'ye bağlanılamadı (${cfg.comfyuiHost}:${cfg.comfyuiPort}). ` +
             `C:\\3d\\start.bat ile ComfyUI'yi başlatın.`,
    };
  }

  onProgress("Workflow kataloğu taranıyor...");
  let catalog;
  try {
    catalog = scanWorkflows(cfg.workflowsDir);
  } catch (e) {
    return { success: false, error: `Workflow dizini okunamadı: ${e.message}` };
  }
  if (!catalog.length)
    return { success: false, error: `${cfg.workflowsDir} içinde workflow JSON bulunamadı.` };

  onProgress(`Yerel model analiz ediyor (${catalog.length} workflow)...`);
  let plan;
  try {
    plan = await _planWithOllama(task, catalog);
  } catch (e) {
    return { success: false, error: `Model yanıtı ayrıştırılamadı: ${e.message}` };
  }

  // Validate model's workflow choice — fallback to first if hallucinated
  if (!catalog.find(w => w.file === plan.workflow)) {
    plan.workflow = catalog[0].file;
    plan.reason   = `[fallback] Model geçersiz dosya adı döndürdü; ilk workflow seçildi.`;
  }

  onProgress(`Workflow hazırlanıyor: ${plan.workflow}`);
  let patchedPrompt;
  try {
    patchedPrompt = _patchWorkflow(
      path.join(cfg.workflowsDir, plan.workflow),
      plan.positive_prompt,
      plan.negative_prompt
    );
  } catch (e) {
    return { success: false, error: `Workflow patch hatası: ${e.message}` };
  }

  onProgress("ComfyUI'ye gönderiliyor...");
  let promptId;
  try {
    promptId = await _submit(cfg, patchedPrompt);
  } catch (e) {
    return { success: false, error: `Gönderim hatası: ${e.message}` };
  }

  onProgress(`Üretim kuyrukta (${promptId})...`);
  const gen = await _pollUntilDone(cfg, promptId);

  const evaluation = gen.success
    ? [
        `✓ Görev tamamlandı.`,
        `Workflow: ${plan.workflow}`,
        `Prompt: "${plan.positive_prompt.slice(0, 70)}..."`,
        `Üretilen: ${gen.images?.length ?? 0} görsel`,
        `Karar: ${plan.reason}`,
      ].join(" | ")
    : `✗ Görev başarısız: ${gen.error}`;

  return {
    success:        gen.success,
    images:         gen.images,
    workflow:       plan.workflow,
    positivePrompt: plan.positive_prompt,
    negativePrompt: plan.negative_prompt,
    reason:         plan.reason,
    promptId,
    evaluation,
    error:          gen.error,
  };
}

// ── Status & service control ──────────────────────────────────────────────────

/**
 * Check health of ComfyUI and Ollama.
 * @returns {Promise<{
 *   comfyui: { running: boolean, host: string, port: number, gpuName?: string, vram?: string },
 *   ollama:  { running: boolean, models: string[] },
 *   workflows: { count: number, dir: string, files: string[] },
 *   ready: boolean
 * }>}
 */
async function checkStatus() {
  const cfg = _cfg();

  // ComfyUI
  let comfyuiRunning = false;
  let gpuName, vram;
  try {
    const stats = await _get(cfg, "/system_stats");
    if (stats.system) {
      comfyuiRunning = true;
      gpuName = stats.devices?.[0]?.name;
      const vramFree  = stats.devices?.[0]?.vram_free;
      const vramTotal = stats.devices?.[0]?.vram_total;
      if (vramTotal) {
        const toGB = n => (n / 1024 / 1024 / 1024).toFixed(1) + "GB";
        vram = `${toGB(vramFree)} free / ${toGB(vramTotal)} total`;
      }
    }
  } catch {}

  // Ollama
  let ollamaRunning = false;
  let models = [];
  try {
    const ollama = require("../../backends/ollama.ts");
    models = await ollama.listModels();
    ollamaRunning = models.length > 0;
  } catch {}

  // Workflows
  let workflowFiles = [];
  try { workflowFiles = fs.readdirSync(cfg.workflowsDir).filter(f => f.endsWith(".json")); } catch {}

  return {
    comfyui:   { running: comfyuiRunning, host: cfg.comfyuiHost, port: cfg.comfyuiPort, gpuName, vram },
    ollama:    { running: ollamaRunning, models },
    workflows: { count: workflowFiles.length, dir: cfg.workflowsDir, files: workflowFiles },
    ready:     comfyuiRunning && ollamaRunning && workflowFiles.length > 0,
  };
}

/**
 * Start ComfyUI or Ollama as a detached background process.
 * @param {"comfyui"|"ollama"} service
 * @returns {{ launched: boolean, message: string }}
 */
function startService(service) {
  const { spawn } = require("child_process");
  const cfg = _cfg();

  if (service === "comfyui") {
    // start.bat: C:\3d\venv\Scripts\python.exe main.py --windows-standalone-build (C:\3d\ComfyUI\ cwd)
    // Derive from workflowsDir (C:\3d\WORKFLOWS) → parent = C:\3d → start.bat
    const base = path.resolve(cfg.workflowsDir, "..");
    const startBat = path.join(base, "start.bat");
    if (!fs.existsSync(startBat))
      return { launched: false, message: `start.bat bulunamadı: ${startBat}\nBeklenen: ${base}\\start.bat` };
    try {
      const child = spawn("cmd.exe", ["/c", "start", '""', startBat], {
        detached: true,
        stdio:    "ignore",
        shell:    false,
        cwd:      base,
      });
      child.unref();
      return { launched: true, message: `ComfyUI başlatıldı: ${startBat}` };
    } catch (e) {
      return { launched: false, message: `Başlatma hatası: ${e.message}` };
    }
  }

  if (service === "ollama") {
    try {
      const child = spawn("ollama", ["serve"], {
        detached: true,
        stdio:    "ignore",
        shell:    true,
      });
      child.unref();
      return { launched: true, message: "ollama serve başlatıldı (arka planda)" };
    } catch (e) {
      return { launched: false, message: `Başlatma hatası: ${e.message}` };
    }
  }

  return { launched: false, message: `Bilinmeyen servis: ${service}` };
}

module.exports = { run, checkStatus, startService, scanWorkflows, DEFAULTS };
