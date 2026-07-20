// core/commands/image.js — /image slash command: ComfyUI image generation
"use strict";

const imager  = require("../agents/imager.js");
const { C }   = require("../../tui/colors.ts");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.js");
const i18n    = require("../i18n.js");

async function exec({ args, session }) {
  const task = args.trim();
  if (!task) {
    print.warn(i18n.t(
      "Usage: /image <description>  — e.g.: /image a cyberpunk city at night, neon rain",
      "Kullanım: /image <açıklama>  — örn: /image neon ışıklı siberpunk şehir, yağmur"
    ));
    return;
  }

  const stop = spinner.start(
    i18n.t("Generating image…", "Görsel üretiliyor…")
  );

  const result = await imager.run(task, {
    onProgress: msg => spinner.update(msg),
    model: session?._config?.tier1Model ?? undefined,
  });

  stop();

  if (!result.success) {
    print.error(`/image: ${result.error}`);
    return;
  }

  // Summary header
  process.stdout.write(
    `\n${C.accent("◆")} ${C.bold("Görsel üretildi")}\n` +
    `  ${C.muted("Workflow:")} ${result.workflow}\n` +
    `  ${C.muted("Prompt:")}   ${result.positivePrompt?.slice(0, 80)}…\n` +
    `  ${C.muted("Karar:")}    ${result.reason}\n`
  );

  // Image list
  for (const img of result.images ?? []) {
    process.stdout.write(
      `\n  ${C.green("✓")} ${img.filename}\n` +
      `    ${C.muted("Yol:")} ${img.localPath}\n` +
      `    ${C.muted("URL:")} ${img.url}\n`
    );
  }

  process.stdout.write(`\n  ${C.muted("Değerlendirme:")} ${result.evaluation}\n\n`);
}

module.exports = [
  {
    name:    "image",
    aliases: ["imagine", "gorsel"],
    desc:    i18n.t(
      "Generate an image via ComfyUI  /image <description>",
      "ComfyUI ile görsel üret  /gorsel <açıklama>"
    ),
    exec,
  },
];
