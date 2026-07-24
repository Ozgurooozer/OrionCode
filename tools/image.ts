// @ts-nocheck
// tools/image.ts — generate_image aracı: ComfyUI üzerinden görsel üretim
"use strict";

const DEFS = [
  {
    name: "generate_image",
    description: "ComfyUI ile görsel üret (localhost:8188). Prompt ver, görsel oluşturulur; dosya yolu ve önizleme URL'si döner. Görsel üretmek için SADECE bu aracı kullan — run_command veya Python kullanma.",
    input_schema: {
      type: "object",
      properties: {
        prompt:   { type: "string",  description: "Görsel için pozitif prompt (İngilizce önerilir)" },
        negative: { type: "string",  description: "Negatif prompt — istenmeyen unsurlar (opsiyonel)" },
        workflow: { type: "integer", description: "Workflow numarası 1'den başlar, varsayılan 1" },
      },
      required: ["prompt"],
    },
  },
];

async function execute(name, input) {
  if (name !== "generate_image") return `Araç bulunamadı: ${name}`;

  const imager = require("../core/agents/imager.ts");
  const result = await imager.run(String(input.prompt ?? ""), {
    workflow: Math.max(0, (Number(input.workflow ?? 1) - 1)),
    negative: String(input.negative ?? ""),
  });

  if (!result.success) {
    let msg = `Görsel üretim hatası: ${result.error}`;
    if (result.error?.includes("kapalı")) msg += "\n  → ComfyUI'yi başlatmak için: /image start comfyui";
    if (result.error?.includes("workflow")) msg += "\n  → Mevcut workflow'lar için: /image list";
    return msg;
  }

  const lines = [`✓ Workflow: ${result.workflow}`, `  PromptID: ${result.promptId ?? "?"}`];
  for (const img of result.images ?? []) {
    lines.push(`  Dosya: ${img.localPath}`);
    lines.push(`  URL:   ${img.url}`);
  }
  return lines.join("\n");
}

module.exports = { DEFS, execute };
