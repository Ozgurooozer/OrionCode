// core/tui/select-input.js — Ok-tuşu select prompt (akış tabanlı, göreli render)
// KURAL: mutlak konumlama ve \x1b[s/\x1b[u YOK. Blok akış içinde çizilir;
// her tazelemede "blok başına ↑k çık, satırları üzerine yaz" yapılır.
// Seçim bitince blok tek satırlık özete indirgenir (clack tarzı collapse).
"use strict";

const readline = require("readline");
const { T, C, setInputLock, fitLine } = require("../../tui/index.js");
const i18n  = require("../i18n.js");
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

/**
 * Ok-tuşu select prompt.
 * @param {string} message
 * @param {Array<{value, label, hint?}>} options
 * @returns {Promise<string|null>}  — seçilen değer, ESC/Ctrl+C'de null
 */
function selectInput(message, options) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return Promise.resolve(null);

  return new Promise(resolve => {
    let selected = 0;
    let rendered = 0; // ekranda duran blok satır sayısı (geri çıkış için)

    function buildLines() {
      const W = process.stdout.columns ?? 80;
      const lines = [fitLine(`  ${T.accent}◆${RESET} ${BOLD}${message}${RESET}`, W - 1)];
      for (let i = 0; i < options.length; i++) {
        const o    = options[i];
        const hint = o.hint ? `  ${DIM}${o.hint}${RESET}` : "";
        lines.push(i === selected
          ? fitLine(`  ${T.accent}▸ ${o.label}${RESET}${hint}`, W - 1)
          : fitLine(`    ${T.muted}${o.label}${RESET}${hint}`, W - 1));
      }
      lines.push(fitLine(`  ${DIM}${i18n.t("↑↓ select · Enter confirm · Esc cancel", "↑↓ seç · Enter onayla · Esc iptal")}${RESET}`, W - 1));
      return lines;
    }

    // Bloğu çiz/tazele: blok başına çık, her satırı silip üzerine yaz
    function draw() {
      const lines = buildLines();
      let out = "\x1b[?25l\r";
      if (rendered > 0) out += `\x1b[${rendered}A`;
      out += lines.map(l => `\x1b[2K${l}`).join("\r\n") + "\r\n";
      rendered = lines.length;
      process.stdout.write(out);
    }

    // Bloğu tek satırlık özete indir (scrollback temiz kalır)
    function collapse(summary) {
      const W = process.stdout.columns ?? 80;
      process.stdout.write(
        `\r\x1b[${rendered}A\x1b[J${fitLine(summary, W - 1)}\r\n\x1b[?25h`
      );
    }

    setInputLock(true);
    const wasRaw = process.stdin.isRaw ?? false;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    draw();

    function onKey(_ch, key) {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        collapse(`  ${T.muted}◆ ${message} — ${i18n.t("cancelled", "iptal edildi")}${RESET}`);
        resolve(null);
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        const opt = options[selected];
        cleanup();
        collapse(`  ${T.ok}◆${RESET} ${message} ${T.accent}${opt?.label ?? ""}${RESET}`);
        resolve(opt?.value ?? null);
        return;
      }

      if (key.name === "up")   { selected = (selected - 1 + options.length) % options.length; draw(); return; }
      if (key.name === "down") { selected = (selected + 1) % options.length; draw(); return; }

      // Home/End hızlı atlama
      if (key.name === "home") { selected = 0; draw(); return; }
      if (key.name === "end")  { selected = options.length - 1; draw(); return; }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      setInputLock(false);
    }

    process.stdin.on("keypress", onKey);
  });
}

module.exports = { selectInput };
