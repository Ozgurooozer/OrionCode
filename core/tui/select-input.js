// core/tui/select-input.js — Arrow-key select prompt (clack'siz, readline çakışması yok)
// masked-input.js ile aynı pattern: raw mode + keypress, readline'ı bypass eder.
"use strict";

const readline = require("readline");
const { T, C, setInputLock, stickySetup, stickyTeardown, stickyRefreshInput } = require("../../tui/index.js");
const RESET = "\x1b[0m";

/**
 * Ok-tuşu select prompt.
 * @param {string} message
 * @param {Array<{value, label, hint?}>} options
 * @returns {Promise<string|null>}  — seçilen değer, ESC/Ctrl+C'de null
 */
function selectInput(message, options) {
  if (!process.stdin.isTTY) return Promise.resolve(null);

  return new Promise(resolve => {
    let selected = 0;

    function doRender() {
      process.stdout.write(`  ${T.muted}○${RESET} ${message}\n\n`);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const hint = opt.hint ? `  ${T.muted}${opt.hint}${RESET}` : "";
        const pad  = "                    "; // önceki render artıklarını sil
        if (i === selected) {
          process.stdout.write(`  ${T.accent}▸${RESET} ${opt.label}${hint}${pad}\n`);
        } else {
          process.stdout.write(`    ${T.muted}${opt.label}${RESET}${hint}${pad}\n`);
        }
      }
      process.stdout.write(`  ${T.muted}↑↓ seç · Enter onayla · ESC iptal${RESET}   \n`);
    }

    // Readline'ı kilitle: tuşlar yalnızca bu istem tarafından işlenir
    setInputLock(true);
    const wasRaw = process.stdin.isRaw ?? false;

    // Sticky input aktifse scroll region \x1b[s/\x1b[u ile çakışır — kaydedilen
    // cursor konumu scroll region içinde geçersiz kalır, her render aşağı taşar.
    // Bu prompt boyunca sticky'yi geçici kapat, bitince geri kur.
    stickyTeardown();

    // Cursor'u kaydet → ilk render → keypress bekle
    process.stdout.write("\n\x1b[s");
    doRender();

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function onKey(_ch, key) {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        process.stdout.write("\n");
        resolve(null);
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        const val = options[selected]?.value ?? null;
        cleanup();
        process.stdout.write("\n");
        resolve(val);
        return;
      }

      if (key.name === "up") {
        selected = (selected - 1 + options.length) % options.length;
        process.stdout.write("\x1b[u"); // kayıtlı konuma dön
        doRender();
        return;
      }

      if (key.name === "down") {
        selected = (selected + 1) % options.length;
        process.stdout.write("\x1b[u");
        doRender();
        return;
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKey);
      // Raw mode'u önceki durumuna döndür — readline raw kullanıyorsa bozma
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      setInputLock(false);
      // Sticky input'u geri kur — giriş kutusu tekrar altta sabitlensin
      stickySetup();
      stickyRefreshInput();
    }

    process.stdin.on("keypress", onKey);
  });
}

module.exports = { selectInput };
