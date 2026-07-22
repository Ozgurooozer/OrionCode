"use strict";

// Quadrant glyphs: bits = TL|TR|BL|BR (binary: 0bTBLR)
const QUADRANT_GLYPHS = [
  " ",   // 0000
  "\u2598", // 0001  ▘ upper-left
  "\u259d", // 0010  ▝ upper-right
  "\u2580", // 0011  ▀ upper half
  "\u2596", // 0100  ▖ lower-left
  "\u258c", // 0101  ▌ left half
  "\u259e", // 0110  ▞ UL+BR ... wait
];

// Let me be more careful. The bit order is:
// bit 0 (1): TL — quadrant upper left  ▘
// bit 1 (2): TR — quadrant upper right ▝
// bit 2 (4): BL — quadrant lower left  ▖
// bit 3 (8): BR — quadrant lower right ▗

const GLYPHS = [
  " ",   // 0000  none
  "\u2598", // 0001  ▘ upper-left
  "\u259d", // 0010  ▝ upper-right
  "\u2580", // 0011  ▀ upper half
  "\u2596", // 0100  ▖ lower-left
  "\u258c", // 0101  ▌ left half
  "\u259e", // 0110  ▞ upper-right + lower-left
  "\u259b", // 0111  ▛ upper-left + upper-right + lower-left
  "\u2597", // 1000  ▗ lower-right
  "\u259a", // 1001  ▚ upper-left + lower-right
  "\u2590", // 1010  ▐ right half
  "\u259c", // 1011  ▜ upper-left + upper-right + lower-right
  "\u2584", // 1100  ▄ lower half
  "\u2599", // 1101  ▙ upper-left + lower-left + lower-right
  "\u259f", // 1110  ▟ upper-right + lower-left + lower-right
  "\u2588", // 1111  █ full block
];

// 2×4 sub-pixel block → quadrant on/off detection
// Quadrant layout within the 2×4 block:
//   col0 col1
//   ┌──────┐
//   │ TL  │ TR  ← row0, row1 (top half)
//   ├──────┤
//   │ BL  │ BR  ← row2, row3 (bottom half)
//   └──────┘
// Each quadrant = 1 sub-pixel column × 2 sub-pixel rows

function classifyQuadrants(pixels, w, cellX, cellY, voidR, voidG, voidB, threshold) {
  // cellX, cellY are in terminal-cell coordinates
  // pixels is the Uint8Array RGBA canvas
  const px = cellX * 2;
  const py = cellY * 4;
  const w4 = w * 4;

  function isFilled(sx, sy) {
    const o = (sy * w + sx) * 4;
    const dr = pixels[o] - voidR;
    const dg = pixels[o + 1] - voidG;
    const db = pixels[o + 2] - voidB;
    return (dr * dr + dg * dg + db * db) > threshold;
  }

  const tl = isFilled(px, py) || isFilled(px, py + 1);
  const tr = isFilled(px + 1, py) || isFilled(px + 1, py + 1);
  const bl = isFilled(px, py + 2) || isFilled(px, py + 3);
  const br = isFilled(px + 1, py + 2) || isFilled(px + 1, py + 3);

  const pattern = (tl ? 1 : 0) | (tr ? 2 : 0) | (bl ? 4 : 0) | (br ? 8 : 0);

  // Compute average colors for "on" and "off" quadrants
  let onR = 0, onG = 0, onB = 0, onCount = 0;
  let offR = 0, offG = 0, offB = 0, offCount = 0;

  function accumulate(sx, sy, isOn) {
    const o = (sy * w + sx) * 4;
    if (isOn) {
      onR += pixels[o]; onG += pixels[o + 1]; onB += pixels[o + 2]; onCount++;
    } else {
      offR += pixels[o]; offG += pixels[o + 1]; offB += pixels[o + 2]; offCount++;
    }
  }

  const quadrants = [
    { on: tl, sx: px, sy: py },
    { on: tr, sx: px + 1, sy: py },
    { on: bl, sx: px, sy: py + 2 },
    { on: br, sx: px + 1, sy: py + 2 },
  ];

  for (const q of quadrants) {
    accumulate(q.sx, q.sy, q.on);
    accumulate(q.sx, q.sy + 1, q.on);
  }

  return {
    pattern,
    fg: onCount > 0 ? [Math.round(onR / onCount), Math.round(onG / onCount), Math.round(onB / onCount)] : null,
    bg: offCount > 0 ? [Math.round(offR / offCount), Math.round(offG / offCount), Math.round(offB / offCount)] : null,
  };
}

module.exports = { GLYPHS, classifyQuadrants };
