// core/commands/image.js — /image slash command: ComfyUI image generation
"use strict";

const imager      = require("../agents/imager.js");
const { C }       = require("../../tui/colors.ts");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.js");
const i18n        = require("../i18n.js");

// ── /image status ─────────────────────────────────────────────────────────────

async function execStatus() {
  const stop = spinner.start(i18n.t("Checking services…", "Servisler kontrol ediliyor…"));
  const s    = await imager.checkStatus();
  stop();

  const ck = s.comfyui.running ? C.green("✓ çalışıyor") : C.red("✗ kapalı");
  const ok = s.ollama.running  ? C.green("✓ çalışıyor") : C.red("✗ kapalı");

  process.stdout.write(
    `\n${C.accent("◆")} ${C.bold("Image Agent Durum")}\n\n` +
    `  ComfyUI  ${ck}  ${C.muted(`${s.comfyui.host}:${s.comfyui.port}`)}\n` +
    (s.comfyui.gpuName ? `    ${C.muted("GPU:")} ${s.comfyui.gpuName}\n` : "") +
    (s.comfyui.vram    ? `    ${C.muted("VRAM:")} ${s.comfyui.vram}\n`   : "") +
    `\n  Ollama   ${ok}\n` +
    (s.ollama.models.length
      ? `    ${C.muted("Modeller:")} ${s.ollama.models.slice(0, 6).join(", ")}\n`
      : `    ${C.muted("Model bulunamadı — ollama serve çalıştırın")}\n`) +
    `\n  Workflows  ${C.accent(String(s.workflows.count))} adet  ${C.muted(s.workflows.dir)}\n`
  );

  if (!s.comfyui.running || !s.ollama.running) {
    process.stdout.write(
      `\n  ${C.yellow("→")} ${C.muted("/image start comfyui")}  veya  ` +
      `${C.muted("/image start ollama")}  ile başlatabilirsiniz\n`
    );
  } else {
    process.stdout.write(`\n  ${C.green("→")} Hazır — /image <açıklama> ile üretim yapabilirsiniz\n`);
  }
  process.stdout.write("\n");
}

// ── /image start [comfyui|ollama|all] ─────────────────────────────────────────

async function execStart(target) {
  const services = target === "all" || !target
    ? ["comfyui", "ollama"]
    : [target];

  for (const svc of services) {
    if (svc !== "comfyui" && svc !== "ollama") {
      print.warn(i18n.t(
        `Unknown service "${svc}". Use: comfyui, ollama, all`,
        `Bilinmeyen servis "${svc}". Kullanım: comfyui, ollama, all`
      ));
      continue;
    }
    const r = imager.startService(svc);
    if (r.launched) print.info(r.message);
    else            print.error(r.message);
  }

  if (services.length > 0) {
    process.stdout.write(C.muted("  → Servisler başlatıldı, hazır olması ~10s sürebilir. /image status ile kontrol edin.\n\n"));
  }
}

// ── /image <description> ──────────────────────────────────────────────────────

async function execGenerate(task, session) {
  const stop = spinner.start(i18n.t("Generating image…", "Görsel üretiliyor…"));

  const result = await imager.run(task, {
    onProgress: msg => spinner.update(msg),
    model: session?._config?.tier1Model ?? undefined,
  });

  stop();

  if (!result.success) {
    print.error(`/image: ${result.error}`);
    return;
  }

  process.stdout.write(
    `\n${C.accent("◆")} ${C.bold("Görsel üretildi")}\n` +
    `  ${C.muted("Workflow:")} ${result.workflow}\n` +
    `  ${C.muted("Prompt:")}   ${result.positivePrompt?.slice(0, 80)}…\n` +
    `  ${C.muted("Karar:")}    ${result.reason}\n`
  );

  for (const img of result.images ?? []) {
    process.stdout.write(
      `\n  ${C.green("✓")} ${img.filename}\n` +
      `    ${C.muted("Yol:")} ${img.localPath}\n` +
      `    ${C.muted("URL:")} ${img.url}\n`
    );
  }

  process.stdout.write(`\n  ${C.muted("Değerlendirme:")} ${result.evaluation}\n\n`);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

async function exec({ args, session }) {
  const trimmed = args.trim();
  const [first, ...rest] = trimmed.split(/\s+/);

  if (first === "status" || first === "durum") {
    return execStatus();
  }
  if (first === "start" || first === "baslat") {
    return execStart(rest[0]);
  }

  const task = trimmed;
  if (!task) {
    print.warn(i18n.t(
      "Usage: /image <description> | /image status | /image start [comfyui|ollama|all]",
      "Kullanım: /image <açıklama> | /image status | /image start [comfyui|ollama|all]"
    ));
    return;
  }

  return execGenerate(task, session);
}

module.exports = [
  {
    name:    "image",
    aliases: ["imagine", "gorsel"],
    desc:    i18n.t(
      "ComfyUI image generation  /image <desc> | status | start [svc]",
      "ComfyUI görsel üretimi  /image <açıklama> | status | start [servis]"
    ),
    exec,
  },
];
