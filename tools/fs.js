// tools/fs.js — Dosya sistemi araçları
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { execSync, spawnSync } = require("child_process");
const checkpoint  = require("../core/checkpoint.js");
const diagnostics = require("../core/diagnostics.js");
const diff        = require("../core/diff.js");
const events      = require("../core/events.js");
const { print }   = require("../tui/index.js");

// ── Workspace sandbox ────────────────────────────────────────────────────────
// Bu araçlar path.resolve(input.path) kullanır; sınır olmadan mutlak yol ve
// "../" ile çalışma alanı dışına (kimlik dosyaları, ~/.ssh, sistem config'i)
// erişilebilir. LLM çıktısı doğrudan bu yollara döndüğü için — onay verilse bile —
// yazmanın NEREYE gittiğini kısıtlamak gerekir. İzin verilen kökler:
//   1) Çalışma kökü: ORION_WORKSPACE env, yoksa süreç başlangıç cwd'si
//   2) Bilinçli istisna: ~/.orion (vault, hafıza, raporlar) — açık allowlist
// Bu köklerin dışına düşen her çağrı SESSİZCE değil, açık hatayla reddedilir ve
// events.js'e security_boundary_hit olayı yayınlanır.
function _workspaceRoot() {
  return path.resolve(process.env.ORION_WORKSPACE || process.cwd());
}
function _orionHome() {
  return path.join(process.env.ORION_HOME || os.homedir(), ".orion");
}
function _allowedRoots() {
  return [_workspaceRoot(), _orionHome()];
}
function _isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
// { abs } döndürür; izinli değilse { abs:null, error } + sınır-ihlali olayı.
function _guardPath(inputPath, op) {
  const abs   = path.resolve(inputPath ?? ".");
  const roots = _allowedRoots();
  if (roots.some(r => _isInside(r, abs))) return { abs };
  try { events.emit("security_boundary_hit", null, { tool: op, path: inputPath, resolved: abs, roots }); } catch {}
  return {
    abs: null,
    error: `HATA: '${inputPath}' izin verilen çalışma kökü dışında — reddedildi.\n` +
           `  Çalışma kökü: ${roots[0]}\n  (İstisna: ${roots[1]})`,
  };
}

// Değişikliği terminale renkli bas + modele kısa diff döndür (pi tarzı)
function _diffReport(oldContent, newContent) {
  const d = diff.diffText(oldContent, newContent);
  if (!d) return { note: " (değişiklik yok)", body: "" };
  print.diff(d);
  const s = diff.diffStat(oldContent, newContent);
  const lines = d.split("\n");
  const short = lines.slice(0, 30).join("\n") + (lines.length > 30 ? `\n… +${lines.length - 30} satır` : "");
  return { note: ` (+${s.added} −${s.removed})`, body: `\n\`\`\`diff\n${short}\n\`\`\`` };
}

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
      const g = _guardPath(input.path, "read_file");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const lines = fs.readFileSync(abs, "utf8").split("\n");
      const start = Math.max(0, (input.offset ?? 1) - 1);
      const end   = input.limit ? start + input.limit : lines.length;
      return lines.slice(start, end)
        .map((l, i) => `${String(start + i + 1).padStart(4)}  ${l}`)
        .join("\n");
    }

    case "write_file": {
      const g = _guardPath(input.path, "write_file");
      if (g.error) return g.error;
      const abs = g.abs;
      const existed = fs.existsSync(abs) && fs.statSync(abs).isFile();
      const old = existed ? fs.readFileSync(abs, "utf8") : null;
      const cp = checkpoint.snapshot(abs, "write_file");
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, input.content, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      if (old === null) {
        const n = input.content.split("\n").length;
        return `Yazıldı: ${input.path} (yeni dosya, ${n} satır)${cpNote}${_diagSuffix(abs)}`;
      }
      const r = _diffReport(old, input.content);
      return `Yazıldı: ${input.path}${r.note}${cpNote}${_diagSuffix(abs)}${r.body}`;
    }

    case "edit_file": {
      const g = _guardPath(input.path, "edit_file");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const content = fs.readFileSync(abs, "utf8");
      const count   = content.split(input.old_str).length - 1;
      if (count === 0) return `HATA: old_str bulunamadı dosyada.`;
      if (count > 1)   return `HATA: old_str ${count} kez geçiyor — benzersiz değil.`;
      const cp = checkpoint.snapshot(abs, "edit_file");
      const updated = content.replace(input.old_str, input.new_str);
      fs.writeFileSync(abs, updated, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      const r = _diffReport(content, updated);
      return `Düzenlendi: ${input.path}${r.note}${cpNote}${_diagSuffix(abs)}${r.body}`;
    }

    case "list_files": {
      const g = _guardPath(input.dir ?? ".", "list_files");
      if (g.error) return g.error;
      const dir = g.abs;
      if (!fs.existsSync(dir)) return `HATA: Dizin yok: ${input.dir ?? "."}`;
      const SKIP_DIRS = new Set(["node_modules", ".git", "$Recycle.Bin", "System Volume Information"]);
      function walk(d, depth = 0) {
        if (depth > 4) return [];
        let entries;
        try { entries = fs.readdirSync(d, { withFileTypes: true }); }
        catch { return []; } // EPERM/EACCES → dizini atla
        return entries.flatMap(e => {
          const rel = path.relative(process.cwd(), path.join(d, e.name));
          if (e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name))
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
      const g = _guardPath(input.dir ?? ".", "search");
      if (g.error) return g.error;
      const dir  = g.abs;
      const pat  = input.pattern;
      const glob = input.glob ?? null;

      // ripgrep (rg) dene — spawnSync: shell yorumlaması yok, injection güvenli
      const tryRg = () => {
        const args = ["-n", "--no-heading", "-m", "30"];
        if (glob) args.push(`--glob=${glob}`);
        args.push(pat, dir);
        const r = spawnSync("rg", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1024*1024, timeout: 10_000 });
        if (r.error) throw r.error;
        if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || "rg failed");
        return r.stdout;
      };

      // grep dene — spawnSync: shell yorumlaması yok
      const tryGrep = () => {
        const args = ["-rn"];
        if (glob) args.push(`--include=${glob}`);
        args.push(pat, dir);
        const r = spawnSync("grep", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 1024*1024, timeout: 10_000 });
        if (r.error) throw r.error;
        if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || "grep failed");
        return r.stdout;
      };

      // Node.js fallback — sadece metin dosyaları, depth≤5
      const nodeSearch = () => {
        let re;
        try { re = new RegExp(pat, "m"); }
        catch { return `HATA: Geçersiz regex: ${pat}`; }
        const absDir = path.resolve(dir);
        const results = [];
        const SKIP = new Set(["node_modules", ".git", "dist", "build", "$Recycle.Bin", "System Volume Information"]);
        const walkDir = (d, dep) => {
          if (dep > 5 || results.length > 200) return;
          let es;
          try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
          for (const e of es) {
            if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
            const full = path.join(d, e.name);
            if (e.isDirectory()) { walkDir(full, dep + 1); continue; }
            if (glob && !_globToRe(glob).test(e.name)) continue;
            try {
              const text = fs.readFileSync(full, "utf8");
              text.split("\n").forEach((line, i) => {
                if (re.test(line)) {
                  results.push(`${path.relative(process.cwd(), full)}:${i+1}:${line.trim().slice(0, 120)}`);
                }
              });
            } catch {}
          }
        };
        walkDir(absDir, 0);
        return results.join("\n") || "(eşleşme yok)";
      };

      try { return (tryRg() || "").slice(0, 3000) || "(eşleşme yok)"; }
      catch {
        try { return (tryGrep() || "").slice(0, 3000) || "(eşleşme yok)"; }
        catch { return nodeSearch().slice(0, 3000); }
      }
    }

    default: return `Bilinmeyen araç: ${name}`;
  }
}

module.exports = { DEFS, execute };
