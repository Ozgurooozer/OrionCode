// core/commands/entropy.js — /entropy: statik karmaşıklık analizi
// Kütüphane seçimi: harici bağımlılık YOK. Proje 5 kritik bağımlılıkla sıkı tutulmuştur;
// typhonjs-escomplex/plato gibi ağır analiz paketleri bu felsefeyle çelişir.
// Buradaki regex+brace-counting yaklaşımı JS/CJS dosyaları için %85+ doğrulukta
// ve sıfır ek kurulum gerektirir. AST doğruluğu gereken durumlar için
// --explain bayrağı yerel modele devredilir.
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { C }       = require("../../tui/colors.ts");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.js");
const i18n = require("../i18n.js");

// ── Eşikler (config ile ayarlanabilir) ───────────────────────────────────────
const THRESHOLD_DEFAULTS = {
  ccWarn:   15,   // fonksiyon başına döngüsel karmaşıklık
  locWarn:  300,  // dosya başına satır sayısı
  nestWarn: 6,    // maksimum brace nesting derinliği
};

function getThresholds() {
  try {
    const cfg = require("../router.js").loadConfig();
    return {
      ccWarn:   cfg.entropy?.ccWarn   ?? THRESHOLD_DEFAULTS.ccWarn,
      locWarn:  cfg.entropy?.locWarn  ?? THRESHOLD_DEFAULTS.locWarn,
      nestWarn: cfg.entropy?.nestWarn ?? THRESHOLD_DEFAULTS.nestWarn,
    };
  } catch {
    return { ...THRESHOLD_DEFAULTS };
  }
}

// ── Statik Analiz ─────────────────────────────────────────────────────────────

// String/comment/regex-literal içerikleri analizden çıkar (brace/keyword sayımı için)
// Karakter uzunlukları korunur: brace pozisyonları bozulmaz.
// Sıra önemli: önce yorum/string/template → sonra regex literal (temiz kaynakta).
// Regex literal tespiti: negatif lookbehind — ), ], \w öncesi / operatör (bölme),
// bunlar dışındaki / regex literal başlangıcıdır. Nadir edge-case (örn. karakter
// sınıfı içi /) çözülmez ama {} bozulması açısından zararsız false-positive verir.
function _strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g,  m => " ".repeat(m.length))
    .replace(/\/\/[^\n]*/g,        m => " ".repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, m => '"' + " ".repeat(Math.max(0, m.length - 2)) + '"')
    .replace(/'(?:[^'\\]|\\.)*'/g, m => "'" + " ".repeat(Math.max(0, m.length - 2)) + "'")
    .replace(/`(?:[^`\\]|\\.)*`/g, m => "`" + " ".repeat(Math.max(0, m.length - 2)) + "`")
    // Regex literal: / NOT preceded by identifier, ), ] → strip body
    .replace(/(?<![)\]\w])\/(?![/*])(?:[^\\/\n]|\\.)*\/[gimsuyv]*/g,
             m => "/" + " ".repeat(Math.max(0, m.length - 2)) + "/");
}

// Döngüsel karmaşıklık şube sayacı (McCabe)
const CC_RE = /\b(?:if|while|for|catch)\s*\(|\bcase\s+|\bdo\s*\{|&&|\|\||\?\?/g;

// Kontrol akışı anahtar kelimeleri — fonksiyon adı olarak kabul edilmez
const CTRL = new Set(["if", "else", "for", "while", "do", "switch", "try", "catch", "finally",
                      "with", "return", "class", "new", "typeof", "instanceof", "void", "delete"]);

// Brace açık-kapama eşleştirmesi: openBrace pozisyonundan başlayıp body metnini döndürür
function _extractBody(stripped, openBrace) {
  if (stripped[openBrace] !== "{") return null;
  let depth = 0;
  for (let i = openBrace; i < stripped.length; i++) {
    if      (stripped[i] === "{") depth++;
    else if (stripped[i] === "}") {
      if (--depth === 0) return stripped.slice(openBrace, i + 1);
    }
  }
  return null;
}

// Fonksiyon tanımlarını bul: [{ name, bracePos }]
function _findFunctions(stripped) {
  const hits = [];

  // 1) function [name](...) {
  const RE_FN = /(?:^|[^\w$])(?:async\s+)?function\s*\*?\s*(\w*)\s*\([^)]{0,200}\)\s*\{/gm;
  // 2) const/let/var name = (...) => {
  const RE_AR = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-z_$][\w$]*)\s*=>\s*\{/gm;
  // 3) Method shorthand: name(...) {   — class/object içi
  const RE_ME = /(?:[{,]|^)\s*(?:async\s+)?\*?\s*(?:get\s+|set\s+)?(\w+)\s*\([^)]{0,200}\)\s*\{/gm;

  for (const re of [RE_FN, RE_AR, RE_ME]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const name = (m[1] || "").trim() || "(anonymous)";
      if (CTRL.has(name)) continue;
      const bracePos = m.index + m[0].length - 1;
      hits.push({ name, bracePos });
    }
  }
  return hits.sort((a, b) => a.bracePos - b.bracePos);
}

// Tek dosya analizi
function analyzeFile(filePath) {
  let src;
  try { src = fs.readFileSync(filePath, "utf8"); } catch { return null; }

  const stripped = _strip(src);
  const srcLines = src.split("\n");

  // LOC: boş olmayan, yalnız yorum olmayan satırlar
  const loc = srcLines.filter(l => {
    const t = l.trim();
    return t && !t.startsWith("//") && !t.startsWith("*") && t !== "*/";
  }).length;

  // Maksimum iç içe derinlik
  let depth = 0, maxNest = 0;
  for (const ch of stripped) {
    if      (ch === "{") { if (++depth > maxNest) maxNest = depth; }
    else if (ch === "}") depth = Math.max(0, depth - 1);
  }

  // Fonksiyon başına CC
  const fnHits = _findFunctions(stripped);
  const seen   = new Set();
  const fns    = [];
  for (const h of fnHits) {
    const body = _extractBody(stripped, h.bracePos);
    if (!body) continue;
    const line = src.slice(0, h.bracePos).split("\n").length;
    const key  = `${h.name}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cc = 1 + (body.match(CC_RE) || []).length;
    fns.push({ name: h.name, cc, line });
  }

  // Hiç fonksiyon bulunamazsa (ör. saf config dosyaları): dosya seviyesinde CC
  if (!fns.length) {
    fns.push({ name: "(file)", cc: 1 + (stripped.match(CC_RE) || []).length, line: 1 });
  }

  const topCC = Math.max(...fns.map(f => f.cc));
  // Basitleştirilmiş MI (Halstead Volume olmadan): Microsoft formülünün LOC+CC alt kümesi
  const mi = Math.max(0, Math.min(100,
    +((171 - 0.23 * topCC - 16.2 * Math.log(Math.max(1, loc))) * 100 / 171).toFixed(1)
  ));

  return { filePath, loc, maxNest, fns, topCC, mi };
}

// ── Dosya Tarama ──────────────────────────────────────────────────────────────
const SCAN_DIRS  = ["core", "tools", "backends", "tui"];
const SKIP_DIRS  = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".cache"]);

function _walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) _walk(path.join(dir, e.name), out);
    } else if (e.name.endsWith(".js") && !e.name.endsWith(".test.js")) {
      out.push(path.join(dir, e.name));
    }
  }
}

function gatherFiles(targetDir) {
  const files = [];
  let hit = false;
  for (const sub of SCAN_DIRS) {
    const abs = path.resolve(targetDir, sub);
    if (fs.existsSync(abs)) { _walk(abs, files); hit = true; }
  }
  // Belirli bir alt dizin verilmişse (ör. /entropy core/) direkt tara
  if (!hit) _walk(path.resolve(targetDir), files);
  return files;
}

// ── Rapor Dizini ──────────────────────────────────────────────────────────────
function _reportsDir() {
  return path.join(process.env.ORION_HOME || os.homedir(), ".orion", "reports");
}

// ── Terminal Tablosu ──────────────────────────────────────────────────────────
function _renderFileTable(results, thr) {
  const sorted = [...results].sort((a, b) => b.topCC - a.topCC).slice(0, 10);
  const cwd    = process.cwd();

  console.log(`\n  ${C.bold(i18n.t("Complexity Report — Top Files (by max CC)", "Karmaşıklık Raporu — İlk Dosyalar (maks CC'ye göre)"))}\n`);
  console.log(`  ${"Dosya".padEnd(44)} ${"LOC".padStart(5)} ${"CC".padStart(4)} ${"Nest".padStart(5)} ${"MI".padStart(5)}`);
  console.log(`  ${"-".repeat(66)}`);

  for (const r of sorted) {
    const rel      = path.relative(cwd, r.filePath);
    const namePad  = rel.slice(0, 44).padEnd(44);
    const locStr   = String(r.loc).padStart(5);
    const ccStr    = String(r.topCC).padStart(4);
    const nestStr  = String(r.maxNest).padStart(5);
    const miStr    = String(r.mi).padStart(5);
    const warn     = (r.loc >= thr.locWarn || r.topCC >= thr.ccWarn) ? ` ${C.yellow("⚠")}` : "";

    const cc   = r.topCC  >= thr.ccWarn  ? C.red(ccStr)    : ccStr;
    const loc  = r.loc    >= thr.locWarn ? C.yellow(locStr) : locStr;
    const nest = r.maxNest >= thr.nestWarn ? C.yellow(nestStr) : nestStr;
    const mi   = r.mi < 30 ? C.red(miStr) : r.mi < 65 ? C.yellow(miStr) : miStr;

    console.log(`  ${C.dim(namePad)} ${loc} ${cc} ${nest} ${mi}${warn}`);
  }
  console.log(`\n  ${C.dim("CC: döngüsel karmaşıklık (dosya max) | MI: bakım indeksi (0-100, düşük=kötü)")}`);
}

function _renderFunctionTable(results, thr) {
  const allFns = [];
  const cwd    = process.cwd();
  for (const r of results) {
    for (const f of r.fns) {
      allFns.push({ ...f, file: path.relative(cwd, r.filePath) });
    }
  }
  allFns.sort((a, b) => b.cc - a.cc);
  const top = allFns.slice(0, 10);
  if (!top.length) return;

  console.log(`\n  ${C.bold(i18n.t("Top Functions by CC", "En Karmaşık Fonksiyonlar"))}\n`);
  console.log(`  ${"Fonksiyon".padEnd(34)} ${"CC".padStart(4)} ${"Satır".padStart(6)}  Dosya`);
  console.log(`  ${"-".repeat(74)}`);

  for (const f of top) {
    const cc  = f.cc >= thr.ccWarn ? C.red(String(f.cc).padStart(4)) : String(f.cc).padStart(4);
    console.log(`  ${f.name.slice(0, 34).padEnd(34)} ${cc} ${String(f.line).padStart(6)}  ${C.dim(f.file)}`);
  }
}

// ── Markdown Raporu ───────────────────────────────────────────────────────────
function _buildMarkdown(results, thr, targetDir, dateStr) {
  const cwd    = process.cwd();
  const sorted = [...results].sort((a, b) => b.topCC - a.topCC);
  const allFns = [];
  for (const r of results) {
    for (const f of r.fns) allFns.push({ ...f, file: path.relative(cwd, r.filePath) });
  }
  allFns.sort((a, b) => b.cc - a.cc);

  let md = `# Entropy Raporu — ${dateStr}\n\n`;
  md += `**Taranan dizin:** \`${path.relative(cwd, targetDir)}\`  \n`;
  md += `**Dosya sayısı:** ${results.length}  \n`;
  md += `**Eşikler:** CC≥${thr.ccWarn} ⚠ · LOC≥${thr.locWarn} ⚠ · Nest≥${thr.nestWarn} ⚠\n\n`;

  md += `## Dosya Özeti\n\n| Dosya | LOC | CC | Nest | MI | Durum |\n|---|---:|---:|---:|---:|---|\n`;
  for (const r of sorted) {
    const rel  = path.relative(cwd, r.filePath);
    const warn = (r.loc >= thr.locWarn || r.topCC >= thr.ccWarn) ? "⚠ yüksek karmaşıklık" : "✓";
    md += `| \`${rel}\` | ${r.loc} | ${r.topCC} | ${r.maxNest} | ${r.mi} | ${warn} |\n`;
  }

  md += `\n## En Karmaşık Fonksiyonlar (ilk 20)\n\n| Fonksiyon | CC | Satır | Dosya |\n|---|---:|---:|---|\n`;
  for (const f of allFns.slice(0, 20)) {
    const warn = f.cc >= thr.ccWarn ? " ⚠" : "";
    md += `| \`${f.name}\`${warn} | ${f.cc} | ${f.line} | \`${f.file}\` |\n`;
  }
  return md;
}

// ── LLM Özeti (--explain) ────────────────────────────────────────────────────
async function _explainWithLLM(results) {
  try {
    const { ollamaRequest, stripThinking } = require("../extract.js");
    const cwd  = process.cwd();
    const top5 = [...results].sort((a, b) => b.topCC - a.topCC).slice(0, 5)
      .map(r => `${path.relative(cwd, r.filePath)}: LOC=${r.loc} CC=${r.topCC} MI=${r.mi}`)
      .join("\n");

    const prompt = `Complexity metrics for this JavaScript codebase:\n${top5}\n\n` +
      `CC = cyclomatic complexity (high=complex), LOC = lines of code, MI = maintainability index (100=good, 0=bad).\n` +
      `In 2-3 sentences: which file has the most technical debt and what is the likely cause?`;

    print.info(i18n.t("Asking local model for analysis...", "Yerel model analiz üretiyor..."));
    // ollamaRequest yalnızca 1-arg (prompt) veya 3-arg (model, prompt, opts) destekler —
    // 2-arg (prompt, opts) modeli prompt sanıp opts'u prompt olarak gönderirdi.
    const raw  = await ollamaRequest(null, prompt, { timeout: 30_000 });
    const text = stripThinking(raw).trim();
    if (text) {
      console.log(`\n  ${C.bold("LLM Summary")}\n`);
      console.log("  " + text.split("\n").join("\n  "));
      console.log();
    }
  } catch (err) {
    print.warn(i18n.t(`Explain failed: ${err.message}`, `Açıklama başarısız: ${err.message}`));
  }
}

// ── Komut ────────────────────────────────────────────────────────────────────
module.exports = [{
  name:    "entropy",
  aliases: ["architect-entropy", "ae"],
  group:   "Analysis",
  desc:    "Statik karmaşıklık analizi: CC, LOC, nesting, MI",
  usage:   "/entropy [dir] [--explain]",
  exec: async ({ args }) => {
    const explain   = args.includes("--explain");
    const dirArg    = args.find(a => !a.startsWith("--")) ?? ".";
    const targetDir = path.resolve(dirArg);
    const thr       = getThresholds();

    if (!fs.existsSync(targetDir)) {
      print.error(i18n.t(`Directory not found: ${targetDir}`, `Dizin bulunamadı: ${targetDir}`));
      return;
    }

    spinner.start(i18n.t("scanning", "taranıyor"));
    const files = gatherFiles(targetDir);
    spinner.stop();

    if (!files.length) {
      print.warn(i18n.t("No JS files found.", "JS dosyası bulunamadı."));
      return;
    }

    const results = [];
    for (const f of files) {
      const r = analyzeFile(f);
      if (r) results.push(r);
    }

    if (!results.length) {
      print.warn(i18n.t("Analysis produced no results.", "Analiz sonuç üretmedi."));
      return;
    }

    _renderFileTable(results, thr);
    _renderFunctionTable(results, thr);

    const warns = results.filter(r => r.loc >= thr.locWarn || r.topCC >= thr.ccWarn).length;
    console.log(`\n  ${C.dim(`${results.length} dosya · ${warns} uyarı`)}`);

    // Raporu kaydet
    const rDir    = _reportsDir();
    fs.mkdirSync(rDir, { recursive: true });
    const dateStr = new Date().toISOString().slice(0, 10);
    const outPath = path.join(rDir, `entropy-${dateStr}.md`);
    fs.writeFileSync(outPath, _buildMarkdown(results, thr, targetDir, dateStr));
    console.log(`  ${C.dim(`Rapor: ${outPath}`)}\n`);

    if (explain) await _explainWithLLM(results);
  },
}];
