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

function checkTypeScript(abs) {
  const { spawnSync } = require("child_process");
  // tsc kurulu değilse atla — bağımlılığı yoksa sessizce geç
  const r = spawnSync("tsc", ["--noEmit", "--skipLibCheck", abs], {
    encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.error) return null; // tsc yok — atla
  if (r.status === 0) return null;
  const msg = (r.stdout || r.stderr || "")
    .split("\n").filter(l => l.trim()).slice(0, 5).join("\n");
  return msg || "TypeScript hata";
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
