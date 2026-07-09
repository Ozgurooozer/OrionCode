// core/diagnostics.js — Yazım sonrası otomatik teşhis (LSP-hafif katman)
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

// null döner (temiz) ya da teşhis metni
function check(filePath) {
  try {
    const abs = path.resolve(filePath);
    const checker = CHECKERS[path.extname(abs).toLowerCase()];
    if (!checker || !fs.existsSync(abs)) return null;
    return checker(abs);
  } catch { return null; }
}

module.exports = { check };
