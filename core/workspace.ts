// core/workspace.js — Workspace güven kapısı
// @ts-nocheck
// Orion bilinmeyen bir dizinde açıldığında kullanıcıdan izin ister.
// Onaylanan dizinler ~/.orion/config.json:trustedPaths[] altında saklanır.
"use strict";
const path    = require("path");
const readline = require("readline");

function isTrusted(dir) {
  const { loadConfig } = require("./router.ts");
  const trusted = loadConfig().trustedPaths ?? [];
  const resolved = path.resolve(dir);
  return trusted.some(p => path.resolve(p) === resolved);
}

function trustDir(dir) {
  const { loadConfig, saveConfig } = require("./router.ts");
  const resolved = path.resolve(dir);
  const trusted  = (loadConfig().trustedPaths ?? []).filter(p => p !== resolved);
  trusted.push(resolved);
  saveConfig({ trustedPaths: trusted });
}

/**
 * Terminalde "trust this folder?" sorusunu sor.
 * @param {string} dir - kontrol edilecek dizin
 * @returns {Promise<boolean>} — true: güvenilir, false: çık
 */
async function promptTrust(dir) {
  const c = {
    gray:  "\x1b[90m",
    cyan:  "\x1b[36m",
    reset: "\x1b[0m",
    bold:  "\x1b[1m",
  };

  process.stdout.write(`\n${c.bold}Accessing workspace:${c.reset} ${c.cyan}${dir}${c.reset}\n`);
  process.stdout.write(`  ${c.bold}❯ 1.${c.reset} Yes, I trust this folder\n`);
  process.stdout.write(`    ${c.gray}2. No, exit${c.reset}\n\n`);

  return new Promise(resolve => {
    let answered = false;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Choice [1/2]: ", answer => {
      answered = true;
      rl.close();
      const ok = answer.trim() === "1" || answer.trim() === "";
      resolve(ok);
    });
    // Ctrl+C → güvensiz çık (ama normal cevap sonrası close'u yoksay)
    rl.on("close", () => { if (!answered) resolve(false); });
  });
}

module.exports = { isTrusted, trustDir, promptTrust };
