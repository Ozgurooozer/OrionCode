// core/diagnostics.js — Yazım sonrası otomatik teşhis (LSP-hafif katman)
// @ts-nocheck
// write_file/edit_file sonrası dosya türüne göre hızlı doğrulama yapar;
// bulunan hata araç sonucuna eklenir ki model aynı turda düzeltebilsin.
"use strict";
const { execFileSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

// Dosya türü → kontrol fonksiyonu. null = sorun yok, string = teşhis mesajı.
const CHECKERS = {
  ".js":  checkNode,
  ".cjs": checkNode,
  ".mjs": checkNode,
  ".json": checkJSON,
  ".ts":  checkTypeScript,
  ".tsx": checkTypeScript,
  ".py":  checkPython,
};

function checkNode(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], {
      encoding: "utf8", timeout: 10000, stdio: ["ignore", "pipe", "pipe"],
    });
    return null;
  } catch (e) {
    const msg = String(e.stderr || e.message || "")
      .split("\n")
      .filter(l => l.trim() && !l.includes("node --check"))
      .slice(0, 6)
      .join("\n");
    return msg || "sözdizimi hatası";
  }
}

function checkJSON(abs) {
  try { JSON.parse(fs.readFileSync(abs, "utf8")); return null; }
  catch (e) { return e.message; }
}

function _tscBin() {
  // Önce proje-yerel tsc'yi dene; yoksa PATH'e düş.
  const local = path.resolve(__dirname, "..", "node_modules", ".bin", "tsc");
  if (fs.existsSync(local + ".cmd")) return local + ".cmd"; // Windows
  if (fs.existsSync(local))          return local;           // Unix
  return "tsc";
}

function _tsconfigDir(abs) {
  // Dosyadan üste doğru tsconfig.json ara; bulamazsa null.
  let dir = path.dirname(abs);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "tsconfig.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function checkTypeScript(abs) {
  const { spawnSync } = require("child_process");
  const tsc     = _tscBin();
  const projDir = _tsconfigDir(abs);

  let args, cwd;
  if (projDir) {
    // Proje context'iyle tüm projeyi kontrol et, sonra bu dosyaya ait satırları filtrele.
    args = ["--noEmit", "--skipLibCheck", "--project", path.join(projDir, "tsconfig.json")];
    cwd  = projDir;
  } else {
    args = ["--noEmit", "--skipLibCheck", abs];
    cwd  = undefined;
  }

  const r = spawnSync(tsc, args, {
    encoding: "utf8", timeout: 20_000, cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  if (r.error || r.status === null) return null; // tsc yok veya timeout — atla

  if (r.status === 0) return null;

  // Proje modunda yalnızca bu dosyayı ilgilendiren satırları döndür.
  const relName = path.basename(abs);
  const lines   = (r.stdout || r.stderr || "").split("\n").filter(l => l.trim());
  const relevant = projDir
    ? lines.filter(l => l.includes(relName))
    : lines;

  return relevant.slice(0, 5).join("\n") || null;
}

function checkPython(abs) {
  const { spawnSync } = require("child_process");
  // python3 veya python ile sözdizimi kontrolü
  for (const pyBin of ["python3", "python"]) {
    const r = spawnSync(pyBin, ["-m", "py_compile", abs], {
      encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"],
    });
    if (r.error) continue; // bu binary yok, sıradakini dene
    if (r.status === 0) return null;
    const msg = (r.stderr || "").split("\n").filter(l => l.trim()).slice(0, 4).join("\n");
    return msg || "Python sözdizimi hatası";
  }
  return null; // python da yok — atla
}

// null döner (temiz) ya da teşhis metni
function check(filePath) {
  try {
    const abs = path.resolve(filePath);
    const checker = CHECKERS[path.extname(abs).toLowerCase()];
    if (!checker || !fs.existsSync(abs)) return null;
    return checker(abs);
  } catch (err) { return err?.message ?? "diagnostics check error"; }
}

module.exports = { check };
