// terminal.js — Terminal output via graphics protocol
"use strict";

const path = require("path");

// Reference beta2's graphics protocol (shared module)
const gp = require(path.resolve(__dirname, "..", "..", "beta2", "src", "landing", "graphics-protocol.ts"));

const RESET = "\x1b[0m";

function renderToTerminal(pixels, width, height) {
  // pixels is Uint8Array RGBA (flipped Y from WebGL)
  // WebGL readPixels gives bottom-left origin; flip vertically
  const flipped = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 4;
    const dstRow = (height - 1 - y) * width * 4;
    for (let x = 0; x < width * 4; x++) {
      flipped[dstRow + x] = pixels[srcRow + x];
    }
  }

  // Create a minimal Canvas-like wrapper for the protocol
  const fakeCanvas = { _px: flipped, w: width, h: height };

  // Terminal cell dimensions: image spans the full terminal
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  // Get protocol-appropriate image sequence
  const seq = gp.imageSequence(fakeCanvas, cols, rows, -1);

  if (seq) {
    process.stdout.write(seq);
    return true;
  }

  return false;
}

module.exports = { renderToTerminal };
