"use strict";
// controller.js — 3D animation lifecycle
// Runs at 30fps, writes to rows 1-ANIM_HEIGHT using cursor save/restore.
// Scroll region (set by tui/index.ts header) protects animation rows.
// TUI content flows below the animation panel.

const { HeadlessBrowser } = require("./browser.js");
const { renderAnimationFrame } = require("./terminal.js");

const FRAME_MS = 1000 / 30;
const DEFAULT_ANIM_HEIGHT = 8;

let _browser = null;
let _timeout = null;
let _running = false;
let _animHeight = DEFAULT_ANIM_HEIGHT;

async function start(animHeight) {
  if (_running) return;
  _animHeight = animHeight || DEFAULT_ANIM_HEIGHT;

  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const safeHeight = Math.min(_animHeight, Math.floor(rows * 0.4));

  // Pixel dimensions: 4px per cell width, 2px per cell height
  const width = Math.max(320, cols * 4);
  const height = Math.max(80, safeHeight * 4);

  _browser = new HeadlessBrowser();
  await _browser.start(width, height);

  _running = true;
  let lastTime = Date.now();

  function loop() {
    if (!_running) return;
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    _browser.renderFrame(dt).then(({ pixels, width: w, height: h }) => {
      // Save cursor → home → write frame → restore cursor
      const raw = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels);
      process.stdout.write("\x1b[s\x1b[H");
      renderAnimationFrame(raw, w, h, safeHeight);
      // Image protocol leaves cursor at same position; restore to TUI position
      process.stdout.write("\x1b[u");
      _timeout = setTimeout(loop, FRAME_MS);
    }).catch(err => {
      console.error("Animation error:", err);
      _running = false;
    });
  }

  loop();
}

function stop() {
  _running = false;
  if (_timeout) { clearTimeout(_timeout); _timeout = null; }
  process.stdout.write("\x1b[r\x1b[?25h");
  if (_browser) return _browser.stop();
  return Promise.resolve();
}

// Synchronous stop for process.exit() — no Chromium wait, just kill loop + reset
function stopNow() {
  _running = false;
  if (_timeout) { clearTimeout(_timeout); _timeout = null; }
  process.stdout.write("\x1b[r\x1b[?25h");
}

function height() { return _animHeight; }

module.exports = { start, stop, stopNow, height };
