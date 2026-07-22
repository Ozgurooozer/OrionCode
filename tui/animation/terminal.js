"use strict";
// terminal.js — Render animation frame to top N rows via Kitty/iTerm2 image protocol
const path = require("path");
const gp = require(path.resolve(__dirname, "..", "arcive", "beta2", "src", "landing", "graphics-protocol.ts"));

function renderAnimationFrame(pixels, width, height, animRows) {
  const cols = process.stdout.columns || 80;

  // Y-flip WebGL buffer (bottom-left origin → top-left)
  const flipped = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 4;
    const dstRow = (height - 1 - y) * width * 4;
    for (let x = 0; x < width * 4; x++) {
      flipped[dstRow + x] = pixels[srcRow + x];
    }
  }

  const fakeCanvas = { _px: flipped, w: width, h: height };

  // Image spans cols columns × animRows rows
  const seq = gp.imageSequence(fakeCanvas, cols, animRows, -1);

  if (seq) {
    process.stdout.write(seq);
    return true;
  }
  return false;
}

module.exports = { renderAnimationFrame };
