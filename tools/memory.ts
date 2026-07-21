// tools/memory.js — Orion'un hafıza dosyaları
// @ts-nocheck
const fs   = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILES = {
  merak:      "merak.md",
  gozlemler:  "gozlemler.md",
  persona:    "PERSONA.md",
};

const DEFS = [
  {
    name: "memory_read",
    description: "Orion'un hafıza dosyalarını oku: merak, gozlemler, persona.",
    input_schema: {
      type: "object",
      properties: {
        file: { type: "string", enum: ["merak", "gozlemler", "persona"] },
      },
      required: ["file"],
    },
  },
  {
    name: "memory_append",
    description: "merak.md veya gozlemler.md'ye yeni gözlem/merak ekle.",
    input_schema: {
      type: "object",
      properties: {
        file:    { type: "string", enum: ["merak", "gozlemler"] },
        content: { type: "string", description: "Eklenecek metin" },
      },
      required: ["file", "content"],
    },
  },
];

function execute(name, input) {
  switch (name) {
    case "memory_read": {
      const fname = FILES[input.file];
      if (!fname) return `HATA: Bilinmeyen dosya: ${input.file}`;
      try { return fs.readFileSync(path.join(ROOT, fname), "utf8"); }
      catch { return "(dosya boş)"; }
    }

    case "memory_append": {
      const fname = FILES[input.file];
      if (!fname) return `HATA: Bilinmeyen dosya: ${input.file}`;
      const fpath = path.join(ROOT, fname);
      fs.appendFileSync(fpath, `\n${input.content}\n`, "utf8");
      return `Eklendi: ${fname}`;
    }

    default: return `Bilinmeyen araç: ${name}`;
  }
}

module.exports = { DEFS, execute };
