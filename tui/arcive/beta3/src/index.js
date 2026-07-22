// index.js — Beta3 headless Babylon.js + terminal image protocol
// node --experimental-strip-types tui/beta3/src/index.js
"use strict";

const { HeadlessBrowser } = require("./browser.js");
const { renderToTerminal } = require("./terminal.js");

const FPS = 30;
const FRAME_MS = 1000 / FPS;

async function main() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  // Render resolution: 4x terminal cell width, 2x height for crisp text
  const width = Math.max(320, cols * 4);
  const height = Math.max(120, rows * 2);

  const browser = new HeadlessBrowser();
  await browser.start(width, height);

  // Hide cursor during animation
  process.stdout.write("\x1b[?25l");

  let running = true;
  let lastTime = Date.now();

  function loop() {
    if (!running) return;

    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;

    browser.renderFrame(dt).then(({ pixels, width: w, height: h }) => {
      // Move cursor to home position
      process.stdout.write("\x1b[H");

      // Send pixel data as terminal image
      renderToTerminal(
        pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels),
        w, h
      );

      // Text overlay — tagline below the image
      const elapsed = now - startTime;
      if (elapsed > 800) {
        const alpha = Math.min(1, (elapsed - 800) / 600);
        const r = Math.round(100 * alpha + 7 * (1 - alpha));
        const g = Math.round(116 * alpha + 9 * (1 - alpha));
        const b = Math.round(139 * alpha + 15 * (1 - alpha));
        process.stdout.write(
          `  \x1b[38;2;${r};${g};${b}maethelred — kodlama ajanı\x1b[0m`
        );
      }

      setTimeout(loop, FRAME_MS);
    }).catch(err => {
      console.error("Render error:", err);
      running = false;
    });
  }

  const startTime = Date.now();
  loop();

  // Handle exit signals
  process.on("SIGINT", () => {
    running = false;
    process.stdout.write("\x1b[?25h\x1b[0m\n"); // show cursor, reset
    browser.stop().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    running = false;
    process.stdout.write("\x1b[?25h\x1b[0m\n");
    browser.stop().then(() => process.exit(0));
  });
}

main().catch(e => {
  console.error("FATAL:", e);
  process.stdout.write("\x1b[?25h\x1b[0m\n");
  process.exit(1);
});
