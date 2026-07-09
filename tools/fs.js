// tools/fs.js — Dosya sistemi araçları
const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const checkpoint  = require("../core/checkpoint.js");
const diagnostics = require("../core/diagnostics.js");

// Yazım sonrası teşhis — hata varsa araç sonucuna eklenir (model aynı turda düzeltir)
function _diagSuffix(abs) {
  const diag = diagnostics.check(abs);
  return diag ? `\n⚠ Teşhis: ${diag}` : "";
}

// Glob → regex: tüm * joker olur, diğer özel karakterler kaçışlanır
function _globToRe(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${esc}$`, "i");
}

const DEFS = [
  {
    name: "read_file",
    description: "Dosya içeriğini oku. Büyük dosyalarda offset/limit kullan.",
    input_schema: {
      type: "object",
      properties: {
        path:   { type: "string", description: "Dosya yolu" },
        offset: { type: "number", description: "Başlangıç satırı (1'den)" },
        limit:  { type: "number", description: "Okunacak satır sayısı" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Dosyayı tamamen yaz (var olanın üstüne yazar).",
    input_schema: {
      type: "object",
      properties: {
        path:    { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Dosyada tam string eşleşmesi ile değiştir. old_str benzersiz olmalı.",
    input_schema: {
      type: "object",
      properties: {
        path:    { type: "string" },
        old_str: { type: "string", description: "Değiştirilecek metin (tam eşleşme)" },
        new_str: { type: "string", description: "Yeni metin" },
      },
      required: ["path", "old_str", "new_str"],
    },
  },
  {
    name: "list_files",
    description: "Dizindeki dosyaları listele.",
    input_schema: {
      type: "object",
      properties: {
        dir:     { type: "string", description: "Dizin yolu (default: .)" },
        pattern: { type: "string", description: "Glob pattern (örn: *.js)" },
      },
    },
  },
  {
    name: "search",
    description: "Dosyalarda regex ile içerik ara.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern" },
        dir:     { type: "string", description: "Arama dizini (default: .)" },
        glob:    { type: "string", description: "Dosya filtresi (örn: *.js)" },
      },
      required: ["pattern"],
    },
  },
];

function execute(name, input) {
  switch (name) {
    case "read_file": {
      if (!input.path) return "HATA: 'path' parametresi eksik.";
      const abs = path.resolve(input.path);
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const lines = fs.readFileSync(abs, "utf8").split("\n");
      const start = Math.max(0, (input.offset ?? 1) - 1);
      const end   = input.limit ? start + input.limit : lines.length;
      return lines.slice(start, end)
        .map((l, i) => `${String(start + i + 1).padStart(4)}  ${l}`)
        .join("\n");
    }

    case "write_file": {
      const abs = path.resolve(input.path);
      const cp = checkpoint.snapshot(abs, "write_file");
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, input.content, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      return `Yazıldı: ${input.path} (${input.content.length} karakter)${cpNote}${_diagSuffix(abs)}`;
    }

    case "edit_file": {
      const abs = path.resolve(input.path);
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const content = fs.readFileSync(abs, "utf8");
      const count   = content.split(input.old_str).length - 1;
      if (count === 0) return `HATA: old_str bulunamadı dosyada.`;
      if (count > 1)   return `HATA: old_str ${count} kez geçiyor — benzersiz değil.`;
      const cp = checkpoint.snapshot(abs, "edit_file");
      fs.writeFileSync(abs, content.replace(input.old_str, input.new_str), "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      return `Düzenlendi: ${input.path}${cpNote}${_diagSuffix(abs)}`;
    }

    case "list_files": {
      const dir = path.resolve(input.dir ?? ".");
      if (!fs.existsSync(dir)) return `HATA: Dizin yok: ${input.dir}`;
      function walk(d, depth = 0) {
        if (depth > 4) return [];
        return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
          const rel = path.relative(process.cwd(), path.join(d, e.name));
          if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
            return [rel + "/", ...walk(path.join(d, e.name), depth + 1)];
          if (!input.pattern || _globToRe(input.pattern).test(e.name))
            return [rel];
          return [];
        });
      }
      const files = walk(dir);
      return files.length ? files.join("\n") : "(boş)";
    }

    case "search": {
      try {
        const dir  = input.dir ?? ".";
        const glob = input.glob ? `--include="${input.glob}"` : "";
        const cmd  = `grep -rn "${input.pattern.replace(/"/g,'\\"')}" ${glob} "${dir}" 2>&1`;
        const out  = execSync(cmd, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1024*1024 });
        return out.slice(0, 3000) || "(eşleşme yok)";
      } catch (e) {
        return e.stdout || "(eşleşme yok)";
      }
    }

    default: return `Bilinmeyen araç: ${name}`;
  }
}

module.exports = { DEFS, execute };
