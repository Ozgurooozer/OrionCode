// core/tui/masked-input.js — Maskelenmiş terminal girişi
// Her karakter yerine * basar, Backspace + Ctrl+C + Enter destekler.
// clack.text() maskelemeyi desteklemediği için readline.emitKeypressEvents
// tabanlı manuel implementasyon — başka secret girişlerinde de kullanılabilir.
"use strict";

const readline = require("readline");
const { T, C, setInputLock } = require("../../tui/index.js");
const RESET = "\x1b[0m";

/**
 * Maskelenmiş tek satır girişi.
 * @param {string} prompt  — ekrana yazılacak istem metni
 * @returns {Promise<string>} — kullanıcının girdiği değer (ham, maskelenmemiş)
 * @throws {Error}  — "cancelled" (Ctrl+C veya ESC)
 */
function maskedInput(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      // TTY değilse (pipe/test ortamı) boş string döndür
      resolve("");
      return;
    }

    // Readline'ı kilitle: API anahtarı tuşları readline'a sızmasın
    // (aksi halde ekrana açık yazılır ve Enter'da chat mesajı olarak gönderilir)
    setInputLock(true);
    const wasRaw = process.stdin.isRaw ?? false;

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const label = `${T.accent}?${RESET} ${prompt}`;
    process.stdout.write(label);

    let value = "";

    function onKey(ch, key) {
      // Ctrl+C veya ESC → iptal
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        process.stdout.write("\n");
        reject(new Error("cancelled"));
        return;
      }

      // Enter → onayla
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }

      // Backspace / Delete
      if (key.name === "backspace" || key.name === "delete") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }

      // Yazdırılabilir karakter
      if (ch && !key.ctrl && !key.meta && ch.length === 1) {
        value += ch;
        process.stdout.write(`${T.muted}*${RESET}`);
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKey);
      // Raw mode'u önceki durumuna döndür — readline raw kullanıyorsa bozma
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
      setInputLock(false);
    }

    process.stdin.on("keypress", onKey);
  });
}

module.exports = { maskedInput };
