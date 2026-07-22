"use strict";
// standalone.js — 3D animasyon demo
// node tui/animation/standalone.js

const { start, stop } = require("./controller.js");
const { setAnimHeight, C, T, gradient } = require("../index.ts");
const { RESET, BOLD, DIM, ITALIC } = require("../colors.ts");

const ANIM_H = 10;
let running = true;

async function main() {
  process.stdout.write("\x1b[?25l");

  setAnimHeight(ANIM_H);

  // Reserve animation space + scroll region (Orion integration pattern)
  process.stdout.write("\n".repeat(ANIM_H));
  process.stdout.write(`\x1b[${ANIM_H + 1};r`);
  process.stdout.write(`\x1b[${ANIM_H + 1};1H`);

  // Compact logo below animation
  console.log(` ${C.star}✦${RESET} ${gradient("O  R  I  O  N")} ${C.nebula}✧${RESET}`);
  console.log(`   ${C.muted}aethelred — kodlama ajanı${RESET}`);
  console.log(`   ${C.muted}/ komutlar · Ctrl+C çıkış${RESET}`);
  console.log(C.muted("  " + "─".repeat(60)));
  console.log("\n  3D animation running — Ctrl+C to exit");

  await start(ANIM_H);
}

process.on("SIGINT", () => {
  if (!running) return;
  running = false;
  stop().then(() => {
    process.stdout.write("\x1b[?25h\x1b[0m\x1b[r");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  if (!running) return;
  running = false;
  stop().then(() => {
    process.stdout.write("\x1b[?25h\x1b[0m\x1b[r");
    process.exit(0);
  });
});

main().catch(e => {
  console.error("FATAL:", e.message);
  process.stdout.write("\x1b[?25h\x1b[0m\x1b[r");
  process.exit(1);
});
