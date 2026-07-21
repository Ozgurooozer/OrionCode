// landing/renderer.ts — Canvas → terminal output (half-block, braille, kitty)
"use strict";

const { RESET } = require("../core/ansi.ts");
const { rgb, rgbBg } = require("../core/colors.ts");
const { GLYPHS, classifyQuadrants } = require("./glyph.ts");

// ── Canvas abstraction ──────────────────────────────────────────────────────
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this._px = new Uint8Array(w * h * 4);
    this._dirty = new Set();
  }

  clear(r = 7, g = 9, b = 15) {
    const len = this.w * this.h;
    for (let i = 0; i < len; i++) {
      const o = i * 4;
      this._px[o] = r; this._px[o + 1] = g; this._px[o + 2] = b; this._px[o + 3] = 1;
    }
    this._markAll();
  }

  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const o = (y * this.w + x) * 4;
    this._px[o] = r; this._px[o + 1] = g; this._px[o + 2] = b; this._px[o + 3] = 1;
    this._dirty.add(y);
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return null;
    const o = (y * this.w + x) * 4;
    return { r: this._px[o], g: this._px[o + 1], b: this._px[o + 2], a: this._px[o + 3] };
  }

  drawLine(x0, y0, x1, y1, r, g, b) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.setPixel(x0, y0, r, g, b);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  drawCircle(cx, cy, radius, r, g, b) {
    let x = radius, y = 0, err = 0;
    while (x >= y) {
      this.setPixel(cx + x, cy + y, r, g, b);
      this.setPixel(cx + y, cy + x, r, g, b);
      this.setPixel(cx - y, cy + x, r, g, b);
      this.setPixel(cx - x, cy + y, r, g, b);
      this.setPixel(cx - x, cy - y, r, g, b);
      this.setPixel(cx - y, cy - x, r, g, b);
      this.setPixel(cx + y, cy - x, r, g, b);
      this.setPixel(cx + x, cy - y, r, g, b);
      y += 1; err += 1 + 2 * y;
      if (2 * (err - x) + 1 > 0) { x -= 1; err += 1 - 2 * x; }
    }
  }

  fillRect(x, y, w, h, r, g, b) {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++)
        this.setPixel(col, row, r, g, b);
  }

  _markAll() {
    for (let y = 0; y < this.h; y++) this._dirty.add(y);
  }

  // ── Quadrant sub-cell render (2×4 sub-pixels per cell) ────────────────────
  renderQuadrant(voidR = 7, voidG = 9, voidB = 15, threshold = 100) {
    const out = [];
    const cols = Math.floor(this.w / 2);
    const rows = Math.floor(this.h / 4);
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const { pattern, fg, bg } = classifyQuadrants(
          this._px, this.w, col, row, voidR, voidG, voidB, threshold
        );
        if (pattern === 0) {
          line += `${rgbBg(voidR, voidG, voidB)} ${RESET}`;
        } else if (fg && bg) {
          line += `${rgbBg(bg[0], bg[1], bg[2])}${rgb(fg[0], fg[1], fg[2])}${GLYPHS[pattern]}${RESET}`;
        } else if (fg) {
          line += `${rgbBg(voidR, voidG, voidB)}${rgb(fg[0], fg[1], fg[2])}${GLYPHS[pattern]}${RESET}`;
        } else {
          line += `${rgbBg(voidR, voidG, voidB)} ${RESET}`;
        }
      }
      out.push(line);
    }
    return out;
  }

  // ── Half-block render ─────────────────────────────────────────────────────
  renderHalfblock() {
    const out = [];
    const rows = Math.ceil(this.h / 2);
    for (let row = 0; row < rows; row++) {
      const topY = row * 2;
      const botY = topY + 1;
      let line = "";
      for (let x = 0; x < this.w; x++) {
        const top = this.getPixel(x, topY);
        const bot = botY < this.h ? this.getPixel(x, botY) : null;
        if (bot && (top.a || bot.a)) {
          line += `${rgbBg(top.r, top.g, top.b)}${rgb(bot.r, bot.g, bot.b)}\u2584${RESET}`;
        } else if (top.a) {
          line += `${rgb(top.r, top.g, top.b)}\u2580${RESET}`;
        } else {
          line += " ";
        }
      }
      out.push(line);
    }
    return out;
  }
}

function detectTerminalGraphics() {
  const term = process.env.TERM ?? "";
  const pgm = process.env.TERM_PROGRAM ?? "";
  if (pgm === "kitty" || term.includes("kitty")) return "kitty";
  if (pgm === "WezTerm" || pgm === "wezterm") return "kitty";
  if (pgm === "ghostty" || pgm === "Ghostty") return "kitty";
  if (pgm === "iTerm.app") return "iterm2";
  if (term.includes("sixel") || term.includes("xterm")) return "sixel";
  return "halfblock";
}

module.exports = { Canvas, detectTerminalGraphics };
