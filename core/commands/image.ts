// @ts-nocheck
// core/commands/image.js
"use strict";

const imager      = require("../agents/imager.ts");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.ts");
const { C }       = require("../../tui/colors.ts");

async function exec({ args }) {
  const trimmed = (Array.isArray(args) ? args.join(" ") : args ?? "").trim();

  // /image status
  if (trimmed === "status") {
    const s = await imager.checkStatus();
    const comfy = s.comfyui;
    process.stdout.write(`ComfyUI: ${comfy.running ? C.green("çalışıyor") : C.red("kapalı")}  (${comfy.host}:${comfy.port})\n`);
    if (comfy.running) {
      if (comfy.gpuName) process.stdout.write(`  GPU:  ${comfy.gpuName}\n`);
      if (comfy.vram)    process.stdout.write(`  VRAM: ${comfy.vram}\n`);
    }
    process.stdout.write(`Workflow'lar: ${s.workflows.count} adet  (${s.workflows.dir})\n`);
    for (let i = 0; i < s.workflows.files.length; i++) {
      process.stdout.write(`  ${i + 1}. ${s.workflows.files[i]}\n`);
    }
    if (!s.comfyui.running) {
      process.stdout.write(`\n${C.muted("/image start comfyui  ile başlatabilirsin")}\n`);
    }
    return;
  }

  // /image list
  if (trimmed === "list") {
    const files = imager.listWorkflows();
    if (!files.length) {
      print.warn(`Workflow bulunamadı: ${imager.DEFAULTS.workflowsDir}`);
      return;
    }
    for (let i = 0; i < files.length; i++) {
      process.stdout.write(`  ${i + 1}. ${files[i]}\n`);
    }
    return;
  }

  // /image start [comfyui|ollama]
  if (trimmed.startsWith("start")) {
    const svc = trimmed.split(/\s+/)[1] ?? "comfyui";
    const r = imager.startService(svc);
    if (r.launched) print.system(r.message);
    else            print.error(r.message);
    return;
  }

  // /image <prompt> [--workflow N]
  const parts   = trimmed.split(/\s+--workflow\s+/i);
  const prompt  = parts[0].trim();
  const wfIndex = parts[1] ? parseInt(parts[1]) - 1 : 0;

  if (!prompt) {
    print.warn([
      "Kullanım:",
      "  /image <prompt>               — görsel üret (workflow 1)",
      "  /image <prompt> --workflow 2  — farklı workflow kullan",
      "  /image status                 — ComfyUI + workflow durumu",
      "  /image list                   — workflow listesi",
      "  /image start comfyui          — ComfyUI'yi başlat",
    ].join("\n"));
    return;
  }

  const stop = spinner.start("Görsel üretiliyor...");
  const result = await imager.run(prompt, {
    workflow:   wfIndex,
    onProgress: msg => spinner.update(msg),
  });
  stop();

  if (!result.success) {
    print.error(result.error);
    if (result.error?.includes("kapalı")) {
      process.stdout.write(`${C.muted("  → /image start comfyui  ile başlatabilirsin")}\n`);
    }
    if (result.error?.includes("workflow bulunamadı")) {
      process.stdout.write(`${C.muted("  → /image list  ile mevcut workflow'ları gör")}\n`);
    }
    return;
  }

  process.stdout.write(`\n${C.green("✓")} ${result.workflow}\n`);
  for (const img of result.images ?? []) {
    process.stdout.write(`  ${img.localPath}\n  ${C.muted(img.url)}\n`);
  }
  process.stdout.write("\n");
}

module.exports = [
  { name: "image", aliases: ["imagine", "gorsel"], desc: "ComfyUI görsel üret — /image <prompt>  |  status  |  list  |  start", exec },
];
