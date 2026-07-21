// core/commands/image.js
"use strict";

const imager      = require("../agents/imager.js");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.ts");
const { C }       = require("../../tui/colors.ts");

async function exec({ args }) {
  const parts    = args.trim().split(/\s+--workflow\s+/i);
  const prompt   = parts[0].trim();
  const wfIndex  = parts[1] ? parseInt(parts[1]) - 1 : 0;

  if (!prompt) {
    print.warn("Kullanım: /image <prompt>  ya da  /image <prompt> --workflow 2");
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
    return;
  }

  process.stdout.write(`\n${C.green("✓")} ${result.workflow}\n`);
  for (const img of result.images ?? []) {
    process.stdout.write(`  ${img.localPath}\n  ${C.muted(img.url)}\n`);
  }
  process.stdout.write("\n");
}

module.exports = [
  { name: "image", aliases: ["imagine", "gorsel"], desc: "ComfyUI görsel üret — /image <prompt>", exec },
];
