// core/commands/weakness.js — /weakness: başarısız araç analizi raporu
"use strict";
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { C, T, print } = require("../../tui/index.js");

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";

function reportsDir() {
  return path.join(process.env.ORION_HOME || os.homedir(), ".orion", "reports");
}

function listReportFiles() {
  try {
    return fs.readdirSync(reportsDir())
      .filter(f => f.startsWith("weakness-") && f.endsWith(".md"))
      .sort()
      .reverse();
  } catch { return []; }
}

function latestReport() {
  const files = listReportFiles();
  if (!files.length) return null;
  const name = files[0];
  return { file: path.join(reportsDir(), name), name };
}

module.exports = [{
  name:    "weakness",
  aliases: ["zayiflik", "zafiyet"],
  group:   "Analysis",
  desc:    "Başarısız araç analizi: rapor göster, opsiyonel uygula",
  usage:   "/weakness [list]",
  exec: async ({ args }) => {
    const sub = (args[0] ?? "").toLowerCase();

    if (sub === "list") {
      const files = listReportFiles();
      if (!files.length) {
        console.log(`\n  ${C.muted("Henüz zayıflık raporu yok.")} ` +
          `${C.muted("Daemon 1 saat idle sonrası otomatik çalıştırır.")}\n`);
        return;
      }
      console.log(`\n  ${BOLD}${T.star}Zayıflık Raporları${RESET}\n`);
      for (const f of files) {
        const date = f.replace("weakness-", "").replace(".md", "");
        const fpath = path.join(reportsDir(), f);
        let size = "";
        try { size = ` ${C.muted(Math.round(fs.statSync(fpath).size / 1024) + "KB")}`; } catch {}
        console.log(`  ${T.accent}•${RESET} ${date}${size}  ${C.muted(f)}`);
      }
      console.log();
      return;
    }

    // Default: son raporu göster
    const report = latestReport();
    if (!report) {
      console.log(
        `\n  ${C.muted("Henüz zayıflık raporu yok.")}\n` +
        `  ${C.muted("Daemon idle zamanında otomatik çalıştırır.")}\n` +
        `  ${C.muted("Anlık çalıştırmak için daemon'ı başlat: orion daemon start")}\n`
      );
      return;
    }

    const content = fs.readFileSync(report.file, "utf8");
    console.log(`\n  ${BOLD}${T.star}Zayıflık Raporu${RESET}  ${C.muted(report.name)}\n`);
    console.log(content);
    console.log();
  },
}];
