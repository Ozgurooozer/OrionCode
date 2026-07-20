// tools/fs.js — Dosya sistemi araçları
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { execSync, spawnSync } = require("child_process");
const checkpoint  = require("../core/checkpoint.js");
const diagnostics = require("../core/diagnostics.js");
const diff        = require("../core/diff.js");
const events      = require("../core/events.ts");
const { print }   = require("../tui/output.ts");

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
    description: "Dosya içeriğini satır numarasıyla oku. Büyük dosyalar için offset (başlangıç satırı) ve limit (satır sayısı) kullan. Yanıt başlığı toplam satır sayısını gösterir.",
    input_schema: {
      type: "object",
      properties: {
        path:   { type: "string", description: "Dosya yolu (mutlak veya workspace'e göre göreli)" },
        offset: { type: "number", description: "Okumaya başlanacak satır (1 tabanlı; örn: 50 → 50. satırdan başla)" },
        limit:  { type: "number", description: "Kaç satır okunacak (örn: 100 → 100 satır)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Dosyayı tamamen yaz. YENİ dosya oluşturmak veya dosyanın tamamını yeniden yazmak için kullan. MEVCUT dosyada küçük değişiklik için edit_file'ı tercih et.",
    input_schema: {
      type: "object",
      properties: {
        path:    { type: "string", description: "Yazılacak dosya yolu" },
        content: { type: "string", description: "Tam dosya içeriği — ASLA kırpma, kod eksiksiz olmalı" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Dosyada tam string eşleşmesi ile değiştir. old_str benzersiz olmalı (replace_all:true ile tüm eşleşmeleri değiştir).",
    input_schema: {
      type: "object",
      properties: {
        path:        { type: "string" },
        old_str:     { type: "string", description: "Değiştirilecek metin — TAM karakter eşleşmesi (tab/boşluk/CRLF dahil). Emin değilsen önce read_file ile doğrula." },
        new_str:     { type: "string", description: "Yeni metin" },
        replace_all: { type: "boolean", description: "true: tüm eşleşmeleri değiştir (varsayılan: false — benzersiz eşleşme gerekir)" },
      },
      required: ["path", "old_str", "new_str"],
    },
  },
  {
    name: "list_files",
    description: "Dizindeki dosyaları listele. Tüm uzantılarda dosya bulmak için glob_files kullan.",
    input_schema: {
      type: "object",
      properties: {
        dir:     { type: "string", description: "Dizin yolu (default: workspace kökü)" },
        pattern: { type: "string", description: "Dosya adı filtresi glob pattern (örn: *.js)" },
        depth:   { type: "number", description: "Maksimum derinlik (varsayılan: 4)" },
      },
    },
  },
  {
    name: "search",
    description: "Dosyalarda regex ile içerik ara. Sonuçlar dosya:satır:içerik formatında döner.",
    input_schema: {
      type: "object",
      properties: {
        pattern:        { type: "string",  description: "Regex pattern (örn: 'function foo', 'TODO:', 'import.*React')" },
        dir:            { type: "string",  description: "Arama dizini (default: workspace kökü)" },
        glob:           { type: "string",  description: "Dosya adı filtresi (örn: *.js, **/*.test.ts)" },
        type:           { type: "string",  description: "Dil tipi filtresi: js, ts, py, go, rust, java, css, html vb. (rg --type karşılığı)" },
        context:        { type: "number",  description: "Eşleşme etrafında gösterilecek satır sayısı (varsayılan: 0)" },
        max_results:      { type: "number",  description: "Maksimum eşleşme sayısı (varsayılan: 50)" },
        case_insensitive: { type: "boolean", description: "true: büyük/küçük harf duyarsız arama (varsayılan: false)" },
        includeIgnored:   { type: "boolean", description: "true yapılırsa node_modules/.git gibi büyük dizinler de taranır (varsayılan: false)" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "create_dir",
    description: "Dizin oluştur (recursive, zaten varsa hata vermez).",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Oluşturulacak dizin yolu" },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Dosya veya boş dizin sil.",
    input_schema: {
      type: "object",
      properties: {
        path:      { type: "string",  description: "Silinecek dosya/dizin yolu" },
        recursive: { type: "boolean", description: "true: dizin ve içeriğini sil (varsayılan: false)" },
      },
      required: ["path"],
    },
  },
  {
    name: "move_file",
    description: "Dosya veya dizini taşı/yeniden adlandır.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Kaynak yol" },
        to:   { type: "string", description: "Hedef yol" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "file_info",
    description: "Dosya/dizin varlığını ve meta bilgisini sorgula.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Sorgulanacak yol" },
      },
      required: ["path"],
    },
  },
  {
    name: "glob_files",
    description: "Glob pattern ile dosya bul (örn: **/*.test.js, src/**/*.ts). list_files'dan farklı olarak ** ile derin dizinleri arar.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Glob pattern (örn: **/*.js, tests/*.test.js, src/**/*.ts)" },
        dir:     { type: "string", description: "Arama kök dizini (varsayılan: workspace kökü)" },
        limit:   { type: "number", description: "Maksimum sonuç sayısı (varsayılan: 200)" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "multi_edit",
    description: "Tek dosyada birden fazla string değişikliğini ATOMIK olarak uygula. Her değişiklik {old_str, new_str} çifti. Ardışık edit_file çağrıları yerine bunu kullan — tek checkpoint, tek diff.",
    input_schema: {
      type: "object",
      properties: {
        path:  { type: "string", description: "Düzenlenecek dosya yolu" },
        edits: {
          type: "array",
          description: "Sırayla uygulanacak değişiklikler. Her biri {old_str, new_str} içermeli.",
          items: {
            type: "object",
            properties: {
              old_str:     { type: "string", description: "Değiştirilecek metin — TAM karakter eşleşmesi gerekir" },
              new_str:     { type: "string", description: "Yeni metin" },
              replace_all: { type: "boolean", description: "true: tüm eşleşmeleri değiştir" },
            },
            required: ["old_str", "new_str"],
          },
        },
      },
      required: ["path", "edits"],
    },
  },
  {
    name: "read_many_files",
    description: "Birden fazla dosyayı tek seferde oku. Birden fazla read_file çağrısı yapmak yerine bunu kullan — tur sayısını azaltır.",
    input_schema: {
      type: "object",
      properties: {
        paths: {
          type: "array",
          description: "Okunacak dosya yolları listesi (en fazla 20)",
          items: { type: "string" },
        },
        limit: { type: "number", description: "Her dosya için maksimum satır sayısı (varsayılan: 200 — büyük dosyalar için)" },
      },
      required: ["paths"],
    },
  },
  {
    name: "file_outline",
    description: "Dosyanın yapısını (fonksiyonlar, sınıflar, importlar, exportlar) satır numarasıyla listele. Büyük dosyaları tam okumadan önce yapıyı anlamak için kullan.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Okunacak dosya yolu" },
      },
      required: ["path"],
    },
  },
  {
    name: "replace_in_files",
    description: "Birden fazla dosyada arama ve değiştirme yap (proje genelinde refactoring). search ile benzer ama eşleşmeleri değiştirir. Dikkatli kullan — geri alınamaz değişiklik yapar (checkpoint alınır).",
    input_schema: {
      type: "object",
      properties: {
        pattern:     { type: "string",  description: "Aranacak metin (sabit string, regex değil)" },
        replacement: { type: "string",  description: "Değiştirilecek metin" },
        glob:        { type: "string",  description: "Hedef dosya pattern (örn: **/*.js, src/**/*.ts). Zorunlu — tüm dosyalara uygulanmasını önler." },
        dir:         { type: "string",  description: "Arama dizini (varsayılan: workspace kökü)" },
        dry_run:     { type: "boolean", description: "true: dosya değiştirmez, yalnızca eşleşen dosyaları listeler (varsayılan: false)" },
      },
      required: ["pattern", "replacement", "glob"],
    },
  },
  {
    name: "apply_patch",
    description: "Unified diff (patch) formatını bir dosyaya uygula. git diff çıktısı veya --- / +++ / @@ başlıklı standart patch formatını destekler. Birden fazla hunk desteklenir.",
    input_schema: {
      type: "object",
      properties: {
        path:  { type: "string", description: "Hedef dosya yolu (patch'deki --- / +++ yolunu geçersiz kılar)" },
        patch: { type: "string", description: "Unified diff içeriği. Örnek:\n@@ -5,4 +5,4 @@\n context\n-old line\n+new line\n context" },
        fuzzy: { type: "number",  description: "Bağlam satırlarında izin verilen maksimum uyuşmazlık (0-3, varsayılan 0 — tam eşleşme)" },
      },
      required: ["path", "patch"],
    },
  },
  {
    name: "insert_at_line",
    description: "Dosyada belirtilen satır numarasına içerik ekle. edit_file'dan farklı olarak eşleşme aramaz — satır numarasına göre tam konum. Satır 1: dosyanın başına, satır N+1: dosyanın sonuna ekle.",
    input_schema: {
      type: "object",
      properties: {
        path:    { type: "string", description: "Düzenlenecek dosya yolu" },
        line:    { type: "number", description: "Ekleme yapılacak satır numarası (1 tabanlı). İçerik bu satırın ÖNÜNE eklenir." },
        content: { type: "string", description: "Eklenecek metin (satır sonu otomatik eklenir)" },
      },
      required: ["path", "line", "content"],
    },
  },
];

// Varsayılan olarak atlanacak dizinler — hız + gürültü azaltma
// includeIgnored:true ile devre dışı bırakılabilir
const SEARCH_IGNORE = [
  "node_modules", ".git", "dist", "build", "coverage", ".next", ".cache",
];

function execute(name, input) {
  switch (name) {
    case "read_file": {
      if (!input.path) return "HATA: 'path' parametresi eksik.";
      const g = _guardPath(input.path, "read_file");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const stat = fs.statSync(abs);
      const MAX_SIZE = 5 * 1024 * 1024;
      if (stat.size > MAX_SIZE && !input.offset && !input.limit) {
        return `HATA: Dosya çok büyük (${(stat.size/1024/1024).toFixed(1)} MB). Kısmi okuma için offset ve limit kullan (örn: limit:200).`;
      }
      const lines = fs.readFileSync(abs, "utf8").split("\n");
      const total = lines.length;
      const start = Math.max(0, (input.offset ?? 1) - 1);
      const end   = input.limit ? Math.min(start + input.limit, total) : total;
      const body  = lines.slice(start, end)
        .map((l, i) => `${String(start + i + 1).padStart(4)}  ${l}`)
        .join("\n");
      // Her zaman başlık: toplam satır + gösterilen aralık
      const isPartial = input.offset > 1 || (input.limit && end < total);
      const header = isPartial
        ? `[${start + 1}-${end} / ${total} satır — daha fazlası için offset:${end + 1} ile devam et]`
        : `[${total} satır — ${abs}]`;
      return `${header}\n${body}`;
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
      const rawContent = fs.readFileSync(abs, "utf8");
      // Dosya CRLF mi LF mi? Bunu tespit edip model gönderisini normalize et.
      const hasCRLF   = rawContent.includes("\r\n");
      const content   = hasCRLF ? rawContent.replace(/\r\n/g, "\n") : rawContent;
      const oldStrNorm = String(input.old_str ?? "").replace(/\r\n/g, "\n");
      const newStrNorm = String(input.new_str ?? "").replace(/\r\n/g, "\n");
      const count   = content.split(oldStrNorm).length - 1;
      if (count === 0) {
        // Fuzzy hint: old_str'in ilk satırını dosyada ara, yakın satırı göster
        const firstLine = oldStrNorm.split("\n")[0].trim();
        let hint = "";
        if (firstLine.length >= 4) {
          const fileLines = content.split("\n");
          const idx = fileLines.findIndex(l => l.includes(firstLine));
          if (idx !== -1) {
            const start = Math.max(0, idx - 1);
            const end   = Math.min(fileLines.length - 1, idx + oldStrNorm.split("\n").length + 1);
            const excerpt = fileLines.slice(start, end + 1)
              .map((l, i) => `${String(start + i + 1).padStart(4)}  ${l}`)
              .join("\n");
            hint = `\n\n  Olası konum (satır ${start + 1}-${end + 1}):\n\`\`\`\n${excerpt}\n\`\`\``;
          }
        }
        return (
          `HATA: old_str dosyada bulunamadı.\n` +
          `  Satır sonu: ${hasCRLF ? "CRLF" : "LF"} (otomatik normalize edildi).\n` +
          `  Olası nedenler: tab↔boşluk uyuşmazlığı, görünmez boşluk, fazla/eksik satır.\n` +
          `  Sıradaki adım: read_file ile dosyanın ilgili bölümünü oku, old_str'i birebir kopyala.` +
          hint
        );
      }
      if (count > 1 && !input.replace_all) return (
        `HATA: old_str ${count} kez geçiyor — benzersiz değil.\n` +
        `  Seçenek 1: Önceki/sonraki satırı ekleyerek old_str'i benzersiz hale getir.\n` +
        `  Seçenek 2: Tüm eşleşmeleri değiştirmek istiyorsan replace_all:true ekle.`
      );
      const cp = checkpoint.snapshot(abs, "edit_file");
      let updated = input.replace_all
        ? content.split(oldStrNorm).join(newStrNorm)
        : content.replace(oldStrNorm, newStrNorm);
      // Orijinal satır sonu stilini koru
      if (hasCRLF) updated = updated.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(abs, updated, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      const countNote = input.replace_all && count > 1 ? ` (${count} değişim)` : "";
      const r = _diffReport(rawContent, updated);
      return `Düzenlendi: ${input.path}${r.note}${countNote}${cpNote}${_diagSuffix(abs)}${r.body}`;
    }

    case "list_files": {
      const g = _guardPath(input.dir ?? ".", "list_files");
      if (g.error) return g.error;
      const dir = g.abs;
      if (!fs.existsSync(dir)) return `HATA: Dizin yok: ${input.dir ?? "."}`;
      const maxDepth = typeof input.depth === "number" ? Math.max(0, Math.min(input.depth, 8)) : 4;
      const SKIP_DIRS = new Set(["node_modules", ".git", "$Recycle.Bin", "System Volume Information"]);
      const lines = [];
      function walk(d, depth, prefix) {
        if (depth > maxDepth) return;
        let entries;
        try { entries = fs.readdirSync(d, { withFileTypes: true }); }
        catch { return; }
        const dirs  = entries.filter(e => e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name));
        const files = entries.filter(e => !e.isDirectory() && (!input.pattern || _globToRe(input.pattern).test(e.name)));
        const all   = [...dirs, ...files];
        for (let i = 0; i < all.length; i++) {
          const e      = all[i];
          const isLast = i === all.length - 1;
          const branch = isLast ? "└── " : "├── ";
          const label  = e.isDirectory() ? `${e.name}/` : e.name;
          lines.push(prefix + branch + label);
          if (e.isDirectory()) {
            walk(path.join(d, e.name), depth + 1, prefix + (isLast ? "    " : "│   "));
          }
        }
      }
      const rootName = path.relative(process.cwd(), dir) || ".";
      lines.push(rootName + "/");
      walk(dir, 0, "");
      return lines.length > 1 ? lines.join("\n") : `${rootName}/ (boş)`;
    }

    case "search": {
      const g = _guardPath(input.dir ?? ".", "search");
      if (g.error) return g.error;
      const dir     = g.abs;
      const pat     = input.pattern;
      const glob    = input.glob ?? null;
      const noIgn   = input.includeIgnored === true; // varsayılan: false → ignore aktif
      const icase   = input.case_insensitive === true;

      // Context satırları (-C N) — rg destekler, Node fallback elle uygular
      const contextLines = typeof input.context === "number" && input.context > 0 ? input.context : 0;

      const typeFilter = input.type ?? null; // rg --type (js, ts, py, go...)

      const maxResults = typeof input.max_results === "number" ? Math.min(input.max_results, 500) : 50;

      // ripgrep (rg) dene — spawnSync: shell yorumlaması yok, injection güvenli
      const tryRg = () => {
        const args = ["-n", "--no-heading", "-m", String(maxResults)];
        if (icase) args.push("-i");
        if (contextLines) args.push(`-C${contextLines}`);
        if (glob) args.push(`--glob=${glob}`);
        if (typeFilter) args.push(`--type=${typeFilter}`);
        if (!noIgn) {
          for (const d of SEARCH_IGNORE) args.push(`--glob=!**/${d}/**`);
        }
        args.push(pat, dir);
        const r = spawnSync("rg", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 2*1024*1024, timeout: 15_000 });
        if (r.error) throw r.error;
        if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || "rg failed");
        return r.stdout;
      };

      // grep dene — spawnSync: shell yorumlaması yok
      const tryGrep = () => {
        const args = ["-rn"];
        if (icase) args.push("-i");
        if (contextLines) { args.push(`-A${contextLines}`); args.push(`-B${contextLines}`); }
        if (glob) args.push(`--include=${glob}`);
        if (!noIgn) {
          for (const d of SEARCH_IGNORE) args.push(`--exclude-dir=${d}`);
        }
        args.push(pat, dir);
        const r = spawnSync("grep", args, { cwd: process.cwd(), encoding: "utf8", maxBuffer: 2*1024*1024, timeout: 15_000 });
        if (r.error) throw r.error;
        if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || "grep failed");
        return r.stdout;
      };

      // Node.js fallback — context satırları dahil
      const nodeSearch = () => {
        let re;
        try { re = new RegExp(pat, icase ? "im" : "m"); }
        catch { return `HATA: Geçersiz regex: ${pat}`; }
        const absDir = path.resolve(dir);
        const results = [];
        const SKIP = noIgn
          ? new Set(["$Recycle.Bin", "System Volume Information"])
          : new Set([...SEARCH_IGNORE, "$Recycle.Bin", "System Volume Information"]);
        const walkDir = (d, dep) => {
          if (dep > 5 || results.length > 300) return;
          let es;
          try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
          for (const e of es) {
            if (!noIgn && e.name.startsWith(".")) continue;
            if (SKIP.has(e.name)) continue;
            const full = path.join(d, e.name);
            if (e.isDirectory()) { walkDir(full, dep + 1); continue; }
            if (glob && !_globToRe(glob).test(e.name)) continue;
            try {
              const allLines = fs.readFileSync(full, "utf8").split("\n");
              allLines.forEach((line, i) => {
                if (re.test(line)) {
                  const rel = path.relative(process.cwd(), full);
                  if (contextLines) {
                    const start = Math.max(0, i - contextLines);
                    const end   = Math.min(allLines.length - 1, i + contextLines);
                    for (let j = start; j <= end; j++) {
                      const sep = j === i ? ":" : "-";
                      results.push(`${rel}:${j+1}${sep}${allLines[j].trim().slice(0, 120)}`);
                    }
                    results.push("--");
                  } else {
                    results.push(`${rel}:${i+1}:${line.trim().slice(0, 120)}`);
                  }
                }
              });
            } catch {}
          }
        };
        walkDir(absDir, 0);
        return results.join("\n") || "(eşleşme yok)";
      };

      try { return (tryRg() || "").slice(0, 6000) || "(eşleşme yok)"; }
      catch {
        try { return (tryGrep() || "").slice(0, 6000) || "(eşleşme yok)"; }
        catch { return nodeSearch().slice(0, 6000); }
      }
    }

    case "create_dir": {
      const g = _guardPath(input.path, "create_dir");
      if (g.error) return g.error;
      fs.mkdirSync(g.abs, { recursive: true });
      return `Dizin oluşturuldu: ${input.path}`;
    }

    case "delete_file": {
      const g = _guardPath(input.path, "delete_file");
      if (g.error) return g.error;
      if (!fs.existsSync(g.abs)) return `HATA: Bulunamadı: ${input.path}`;
      const stat = fs.statSync(g.abs);
      if (stat.isDirectory()) {
        if (input.recursive) {
          fs.rmSync(g.abs, { recursive: true, force: true });
          return `Dizin silindi (recursive): ${input.path}`;
        }
        try { fs.rmdirSync(g.abs); }
        catch { return `HATA: Dizin boş değil. recursive:true ile sil.`; }
        return `Dizin silindi: ${input.path}`;
      }
      const cp = checkpoint.snapshot(g.abs, "delete_file");
      fs.unlinkSync(g.abs);
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      return `Silindi: ${input.path}${cpNote}`;
    }

    case "move_file": {
      if (!input.from || !input.to) return "HATA: 'from' ve 'to' parametreleri gerekli.";
      const gFrom = _guardPath(input.from, "move_file");
      if (gFrom.error) return gFrom.error;
      const gTo   = _guardPath(input.to,   "move_file");
      if (gTo.error)   return gTo.error;
      if (!fs.existsSync(gFrom.abs)) return `HATA: Kaynak bulunamadı: ${input.from}`;
      fs.mkdirSync(path.dirname(gTo.abs), { recursive: true });
      fs.renameSync(gFrom.abs, gTo.abs);
      return `Taşındı: ${input.from} → ${input.to}`;
    }

    case "file_info": {
      const g = _guardPath(input.path, "file_info");
      if (g.error) return g.error;
      if (!fs.existsSync(g.abs)) return `Yok: ${input.path}`;
      const stat = fs.statSync(g.abs);
      const mtime = new Date(stat.mtimeMs).toISOString().slice(0, 19).replace("T", " ");
      if (stat.isDirectory()) {
        let fileCount = "-";
        try { fileCount = String(fs.readdirSync(g.abs).length) + " (direkt içerik)"; } catch {}
        return `dizin: ${input.path}\nİçerik sayısı: ${fileCount}  Değiştirilme: ${mtime}`;
      }
      const size = `${stat.size} byte (${(stat.size / 1024).toFixed(1)} KB)`;
      let lineCount = "-";
      if (stat.size < 2 * 1024 * 1024) {
        try { lineCount = String(fs.readFileSync(g.abs, "utf8").split("\n").length); } catch {}
      }
      return `dosya: ${input.path}\nBoyut: ${size}  Satır: ${lineCount}  Değiştirilme: ${mtime}`;
    }

    case "glob_files": {
      const rootDir = input.dir ?? process.env.ORION_WORKSPACE ?? ".";
      const g = _guardPath(rootDir, "glob_files");
      if (g.error) return g.error;
      const dir   = g.abs;
      const pat   = String(input.pattern ?? "**/*");
      const limit = typeof input.limit === "number" ? input.limit : 200;

      // rg --files ile hızlı glob — injection güvenli, spawnSync
      const tryRgGlob = () => {
        const args = ["--files", "--glob", pat];
        // node_modules ve .git varsayılan olarak atlanır (.gitignore ile)
        args.push(dir);
        const r = spawnSync("rg", args, { cwd: dir, encoding: "utf8", maxBuffer: 2*1024*1024, timeout: 15_000 });
        if (r.error) throw r.error;
        if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || "rg --files failed");
        return r.stdout;
      };

      // Node.js glob fallback — ** pattern desteğiyle
      const nodeGlob = () => {
        // Glob → regex: karakter bazında dönüştür
        const globToRegex = (g) => {
          let r = "";
          let i = 0;
          while (i < g.length) {
            const c = g[i];
            if (c === "*" && g[i + 1] === "*") {
              r += ".*";
              i += 2;
              if (g[i] === "/" || g[i] === "\\") i++; // **/  → sonraki slash'ı tüket
            } else if (c === "*") {
              r += "[^/\\\\]*";
              i++;
            } else if (c === "?") {
              r += "[^/\\\\]";
              i++;
            } else if (/[.+^${}()|[\]\\]/.test(c)) {
              r += "\\" + c;
              i++;
            } else {
              r += c;
              i++;
            }
          }
          return new RegExp(`^${r}$`, "i");
        };
        let re;
        try { re = globToRegex(pat); } catch { return "(geçersiz glob pattern)"; }

        const SKIP = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".cache", "$Recycle.Bin"]);
        const results = [];
        const walkDir = (d, dep) => {
          if (dep > 8 || results.length >= limit) return;
          let es;
          try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
          for (const e of es) {
            if (SKIP.has(e.name)) continue;
            const full = path.join(d, e.name);
            const relToDir = path.relative(dir, full).replace(/\\/g, "/");
            const relToCwd = path.relative(process.cwd(), full).replace(/\\/g, "/");
            if (e.isDirectory()) { walkDir(full, dep + 1); continue; }
            if (re.test(relToDir) || re.test(e.name)) results.push(relToCwd);
          }
        };
        walkDir(dir, 0);
        return results.join("\n") || "(eşleşme yok)";
      };

      try {
        const out = tryRgGlob();
        const lines = out.trim().split("\n").filter(Boolean).slice(0, limit);
        return lines.length
          ? lines.map(l => path.relative(process.cwd(), path.resolve(dir, l)).replace(/\\/g, "/")).join("\n")
          : "(eşleşme yok)";
      } catch {
        return nodeGlob();
      }
    }

    case "multi_edit": {
      const g = _guardPath(input.path, "multi_edit");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const edits = Array.isArray(input.edits) ? input.edits : [];
      if (!edits.length) return "HATA: 'edits' dizisi boş.";

      const rawContent = fs.readFileSync(abs, "utf8");
      const hasCRLF   = rawContent.includes("\r\n");
      let content      = hasCRLF ? rawContent.replace(/\r\n/g, "\n") : rawContent;

      const applied = [];
      const errors  = [];

      for (let i = 0; i < edits.length; i++) {
        const { old_str, new_str, replace_all: replAll } = edits[i];
        const oldNorm = String(old_str ?? "").replace(/\r\n/g, "\n");
        const newNorm = String(new_str ?? "").replace(/\r\n/g, "\n");
        const count   = content.split(oldNorm).length - 1;
        if (count === 0) {
          // Fuzzy hint: ilk satırı ara
          const firstLine = oldNorm.split("\n")[0].trim();
          let hint = "";
          if (firstLine.length >= 4) {
            const idx = content.split("\n").findIndex(l => l.includes(firstLine));
            if (idx !== -1) hint = ` (satır ${idx + 1} civarında bulundu — birebir eşleşme gerekir)`;
          }
          errors.push(`Edit ${i + 1}: old_str bulunamadı${hint}`);
          continue;
        }
        if (count > 1 && !replAll) {
          errors.push(`Edit ${i + 1}: old_str ${count} kez geçiyor — replace_all:true ekle veya benzersiz hale getir`);
          continue;
        }
        content = replAll
          ? content.split(oldNorm).join(newNorm)
          : content.replace(oldNorm, newNorm);
        applied.push(i + 1);
      }

      if (!applied.length) {
        return `HATA: Hiçbir değişiklik uygulanamadı.\n${errors.join("\n")}`;
      }

      const cp = checkpoint.snapshot(abs, "multi_edit");
      if (hasCRLF) content = content.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(abs, content, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      const r = _diffReport(rawContent, content);
      const errNote = errors.length ? `\nUyarı: ${errors.join("; ")}` : "";
      return `multi_edit: ${input.path} — ${applied.length}/${edits.length} değişiklik uygulandı${r.note}${cpNote}${_diagSuffix(abs)}${errNote}${r.body}`;
    }

    case "read_many_files": {
      const paths = Array.isArray(input.paths) ? input.paths.slice(0, 20) : [];
      if (!paths.length) return "HATA: 'paths' dizisi boş.";
      const perFileLimit = typeof input.limit === "number" ? input.limit : 200;
      const results = [];
      for (const p of paths) {
        const gp = _guardPath(p, "read_many_files");
        if (gp.error) { results.push(`── ${p} ──\n${gp.error}`); continue; }
        if (!fs.existsSync(gp.abs)) { results.push(`── ${p} ──\nHATA: Dosya bulunamadı`); continue; }
        const stat = fs.statSync(gp.abs);
        if (stat.size > 2 * 1024 * 1024) { results.push(`── ${p} ──\nHATA: Dosya çok büyük (${(stat.size/1024/1024).toFixed(1)} MB)`); continue; }
        try {
          const lines = fs.readFileSync(gp.abs, "utf8").replace(/\r\n/g, "\n").split("\n");
          const total = lines.length;
          const end = Math.min(perFileLimit, total);
          const body = lines.slice(0, end).map((l, i) => `${String(i + 1).padStart(4)}  ${l}`).join("\n");
          const truncNote = end < total ? `\n[... ${total - end} satır daha — read_file ile offset kullan]` : "";
          results.push(`── ${p} (${total} satır) ──\n${body}${truncNote}`);
        } catch (err) {
          results.push(`── ${p} ──\nHATA: ${err.message}`);
        }
      }
      return results.join("\n\n");
    }

    case "file_outline": {
      const g = _guardPath(input.path, "file_outline");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) return `HATA: Dizin değil dosya bekleniyor: ${input.path}`;
      const MAX = 2 * 1024 * 1024;
      if (stat.size > MAX) return `HATA: Dosya çok büyük (${(stat.size/1024/1024).toFixed(1)} MB). read_file + limit kullan.`;

      const rawC = fs.readFileSync(abs, "utf8");
      const content = rawC.replace(/\r\n/g, "\n");
      const lines = content.split("\n");
      const ext = path.extname(abs).toLowerCase();

      // Dil tespiti → regex grubu
      const isJS  = [".js",  ".mjs", ".cjs"].includes(ext);
      const isTS  = [".ts",  ".tsx", ".jsx"].includes(ext);
      const isPY  = [".py"].includes(ext);
      const isGo  = [".go"].includes(ext);
      const isRust = [".rs"].includes(ext);

      const entries = [];

      if (isJS || isTS) {
        const patterns = [
          // function declarations + arrow functions
          { re: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*[\w(<]/, label: "fn" },
          // class declarations
          { re: /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/, label: "class" },
          // const/let/var arrow functions
          { re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\(|[\w].*?=>)/, label: "fn" },
          // TS interface/type
          { re: /^(?:export\s+)?(?:interface|type)\s+(\w+)/, label: "type" },
          // require/import
          { re: /^(?:const|let|var)\s+\{?[\w\s,]+\}?\s*=\s*require\s*\(/, label: "import" },
          { re: /^import\s+/, label: "import" },
          // module.exports
          { re: /^module\.exports\s*=/, label: "export" },
          { re: /^exports\.(\w+)\s*=/, label: "export" },
        ];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) return;
          for (const { re, label } of patterns) {
            const m = trimmed.match(re);
            if (m) {
              const name = m[1] ?? trimmed.slice(0, 40);
              if (label !== "import") entries.push(`${String(i + 1).padStart(4)}  [${label}] ${name}`);
              else entries.push(`${String(i + 1).padStart(4)}  [import] ${trimmed.slice(0, 60)}`);
              break;
            }
          }
        });
      } else if (isPY) {
        lines.forEach((line, i) => {
          const m = line.match(/^(def|class|async def)\s+(\w+)/);
          if (m) entries.push(`${String(i + 1).padStart(4)}  [${m[1] === "class" ? "class" : "fn"}] ${m[2]}`);
          const imp = line.match(/^(?:import|from)\s+/);
          if (imp) entries.push(`${String(i + 1).padStart(4)}  [import] ${line.trim().slice(0, 60)}`);
        });
      } else if (isGo) {
        lines.forEach((line, i) => {
          const mFn   = line.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/);
          const mType = line.match(/^type\s+(\w+)\s+(?:struct|interface)/);
          const mImp  = line.match(/^import\s*[("]/);
          if (mFn)  entries.push(`${String(i + 1).padStart(4)}  [fn] ${mFn[1]}`);
          if (mType) entries.push(`${String(i + 1).padStart(4)}  [type] ${mType[1]}`);
          if (mImp) entries.push(`${String(i + 1).padStart(4)}  [import] ${line.trim().slice(0, 60)}`);
        });
      } else if (isRust) {
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          const mFn   = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
          const mSt   = trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/);
          const mEn   = trimmed.match(/^(?:pub\s+)?enum\s+(\w+)/);
          const mIm   = trimmed.match(/^(?:pub\s+)?(?:use|mod)\s+/);
          if (mFn) entries.push(`${String(i + 1).padStart(4)}  [fn] ${mFn[1]}`);
          if (mSt) entries.push(`${String(i + 1).padStart(4)}  [struct] ${mSt[1]}`);
          if (mEn) entries.push(`${String(i + 1).padStart(4)}  [enum] ${mEn[1]}`);
          if (mIm) entries.push(`${String(i + 1).padStart(4)}  [use] ${trimmed.slice(0, 60)}`);
        });
      } else {
        // Bilinmeyen format: ilk 60 satırı döndür
        const preview = lines.slice(0, Math.min(60, lines.length))
          .map((l, i) => `${String(i + 1).padStart(4)}  ${l}`).join("\n");
        return `${input.path} (${lines.length} satır, bilinmeyen format)\n${preview}`;
      }

      if (!entries.length) return `${input.path} (${lines.length} satır) — yapı tespit edilemedi. read_file ile oku.`;
      return `${input.path} (${lines.length} satır)\n${entries.join("\n")}`;
    }

    case "replace_in_files": {
      if (!input.pattern)     return "HATA: 'pattern' parametresi eksik.";
      if (!input.glob)        return "HATA: 'glob' parametresi eksik — hedef dosyaları belirtmek zorunlu.";
      if (input.replacement === undefined) return "HATA: 'replacement' parametresi eksik.";
      const rootDir = input.dir ?? process.env.ORION_WORKSPACE ?? ".";
      const g2 = _guardPath(rootDir, "replace_in_files");
      if (g2.error) return g2.error;
      const rootAbs = g2.abs;
      const pat = String(input.pattern);
      const rep = String(input.replacement);
      const globPat = String(input.glob);
      const dryRun = input.dry_run === true;

      // Glob ile eşleşen dosyaları bul (nodeGlob benzeri)
      const globToRegex = (gp) => {
        let r = "";
        let i = 0;
        while (i < gp.length) {
          const c = gp[i];
          if (c === "*" && gp[i + 1] === "*") { r += ".*"; i += 2; if (gp[i] === "/" || gp[i] === "\\") i++; }
          else if (c === "*") { r += "[^/\\\\]*"; i++; }
          else if (c === "?") { r += "[^/\\\\]"; i++; }
          else if (/[.+^${}()|[\]\\]/.test(c)) { r += "\\" + c; i++; }
          else { r += c; i++; }
        }
        return new RegExp(`^${r}$`, "i");
      };
      const globRe = globToRegex(globPat);
      const SKIP = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".cache"]);
      const matchedFiles = [];
      const walkForReplace = (d, dep) => {
        if (dep > 8) return;
        let es;
        try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of es) {
          if (SKIP.has(e.name)) continue;
          const full = path.join(d, e.name);
          if (e.isDirectory()) { walkForReplace(full, dep + 1); continue; }
          const rel = path.relative(rootAbs, full).replace(/\\/g, "/");
          if (globRe.test(rel) || globRe.test(e.name)) matchedFiles.push(full);
        }
      };
      walkForReplace(rootAbs, 0);

      if (!matchedFiles.length) return `replace_in_files: glob '${globPat}' hiç dosyayla eşleşmedi.`;

      const changed = [];
      const unchanged = [];
      const errs = [];

      for (const filePath of matchedFiles) {
        try {
          const rawC = fs.readFileSync(filePath, "utf8");
          const hasCRLF2 = rawC.includes("\r\n");
          const norm = hasCRLF2 ? rawC.replace(/\r\n/g, "\n") : rawC;
          if (!norm.includes(pat)) { unchanged.push(filePath); continue; }
          if (dryRun) { changed.push(path.relative(process.cwd(), filePath)); continue; }
          const gp2 = _guardPath(filePath, "replace_in_files");
          if (gp2.error) { errs.push(`${filePath}: sandbox hatası`); continue; }
          checkpoint.snapshot(filePath, "replace_in_files");
          let updated = norm.split(pat).join(rep);
          if (hasCRLF2) updated = updated.replace(/\r?\n/g, "\r\n");
          fs.writeFileSync(filePath, updated, "utf8");
          changed.push(path.relative(process.cwd(), filePath));
        } catch (err) {
          errs.push(`${filePath}: ${err.message}`);
        }
      }

      const verb = dryRun ? "eşleşecek" : "değiştirildi";
      const lines = [`replace_in_files: "${pat}" → "${rep.slice(0, 40)}"${dryRun ? " [dry_run]" : ""}`];
      if (changed.length)   lines.push(`${verb}: ${changed.length} dosya\n  ${changed.join("\n  ")}`);
      if (unchanged.length) lines.push(`değişmedi: ${unchanged.length} dosya`);
      if (errs.length)      lines.push(`hata: ${errs.join("; ")}`);
      return lines.join("\n");
    }

    case "apply_patch": {
      const g = _guardPath(input.path, "apply_patch");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const rawContent = fs.readFileSync(abs, "utf8");
      const hasCRLF = rawContent.includes("\r\n");
      const patchText = String(input.patch ?? "").replace(/\r\n/g, "\n");
      const fuzzySlack = typeof input.fuzzy === "number" ? Math.min(Math.max(0, input.fuzzy), 3) : 0;

      // Patch satırlarını parse et: @@ başlıklarını bul, hunk satırlarını topla
      const hunkRe = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
      const hunks = [];
      let cur = null;
      for (const l of patchText.split("\n")) {
        const m = l.match(hunkRe);
        if (m) {
          cur = { fromLine: parseInt(m[1], 10), ops: [] };
          hunks.push(cur);
        } else if (cur) {
          if (/^(---|\+\+\+)/.test(l)) continue;
          // Her satır: ' ' bağlam, '-' sil, '+' ekle
          if (l.startsWith(" ") || l.startsWith("-") || l.startsWith("+")) {
            cur.ops.push({ type: l[0] === " " ? "ctx" : l[0] === "-" ? "del" : "add", content: l.slice(1) });
          }
        } else if (/^(---|\+\+\+)/.test(l)) {
          // dosya başlığı satırı — hunk yok
        }
      }

      if (!hunks.length) return "HATA: Geçerli hunk (@@ ... @@) bulunamadı. Patch formatını kontrol et.";

      // Hunks'ları sondan başa uygula (satır kaydırmasını önlemek için)
      const result = (hasCRLF ? rawContent.replace(/\r\n/g, "\n") : rawContent).split("\n");
      const errors = [];

      for (let hi = hunks.length - 1; hi >= 0; hi--) {
        const hunk = hunks[hi];
        // Dosyadan tüketilecek satır sayısı: ctx + del
        const consumeCount = hunk.ops.filter(o => o.type !== "add").length;

        // Başlangıç indeksi (0-tabanlı)
        let startIdx = hunk.fromLine - 1;

        // Fuzzy: ilk ctx/del satırını etrafta ara
        if (fuzzySlack > 0) {
          const firstExpected = hunk.ops.find(o => o.type !== "add")?.content;
          if (firstExpected !== undefined) {
            for (let delta = -fuzzySlack; delta <= fuzzySlack; delta++) {
              const ti = startIdx + delta;
              if (ti >= 0 && ti < result.length && result[ti] === firstExpected) {
                startIdx = ti;
                break;
              }
            }
          }
        }

        // Bağlam/silme satırlarını dosya ile doğrula (en fazla 3)
        let fileOffset = 0;
        let ctxOk = true;
        let checked = 0;
        for (const op of hunk.ops) {
          if (op.type === "add") continue;
          if (checked >= 3) break;
          const fileLine = result[startIdx + fileOffset] ?? "";
          if (fileLine !== op.content) {
            errors.push(`Hunk ${hi + 1}: satır ${startIdx + fileOffset + 1} eşleşmiyor: dosya="${fileLine}" patch="${op.content}"`);
            ctxOk = false;
            break;
          }
          fileOffset++;
          checked++;
        }
        if (!ctxOk) continue;

        // Replacement: ctx + add (del atlanır)
        const insertLines = hunk.ops.filter(o => o.type !== "del").map(o => o.content);
        result.splice(startIdx, consumeCount, ...insertLines);
      }

      if (errors.length && errors.length === hunks.length) {
        return `HATA: Hiçbir hunk uygulanamadı.\n${errors.join("\n")}\n\nİpucu: fuzzy:1 veya fuzzy:2 ile tekrar dene.`;
      }

      const cp = checkpoint.snapshot(abs, "apply_patch");
      let newContent = result.join("\n");
      if (hasCRLF) newContent = newContent.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(abs, newContent, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      const r = _diffReport(rawContent, newContent);
      const applied = hunks.length - errors.length;
      const errNote = errors.length ? `\nUyarı: ${errors.join("; ")}` : "";
      return `apply_patch: ${input.path} — ${applied}/${hunks.length} hunk uygulandı${r.note}${cpNote}${_diagSuffix(abs)}${errNote}${r.body}`;
    }

    case "insert_at_line": {
      const g = _guardPath(input.path, "insert_at_line");
      if (g.error) return g.error;
      const abs = g.abs;
      if (!fs.existsSync(abs)) return `HATA: Dosya bulunamadı: ${input.path}`;
      const rawContent = fs.readFileSync(abs, "utf8");
      const hasCRLF = rawContent.includes("\r\n");
      const lines = (hasCRLF ? rawContent.replace(/\r\n/g, "\n") : rawContent).split("\n");
      const lineNum = Math.max(1, Math.min(input.line ?? 1, lines.length + 1));
      const insertContent = String(input.content ?? "");
      const insertLines = insertContent.replace(/\r\n/g, "\n").split("\n");
      // Satır 1 tabanlı: lineNum-1 indeksine ekle (önüne)
      lines.splice(lineNum - 1, 0, ...insertLines);
      const cp = checkpoint.snapshot(abs, "insert_at_line");
      let newContent = lines.join("\n");
      if (hasCRLF) newContent = newContent.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(abs, newContent, "utf8");
      const cpNote = cp ? ` [checkpoint ${cp}]` : "";
      const r = _diffReport(rawContent, newContent);
      return `insert_at_line: ${input.path} satır ${lineNum}${r.note}${cpNote}${_diagSuffix(abs)}${r.body}`;
    }

    default: return `Bilinmeyen araç: ${name}`;
  }
}

module.exports = { DEFS, execute };
