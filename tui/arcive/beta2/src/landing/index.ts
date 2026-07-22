"use strict";

const { cursor, erase, RESET } = require("../core/ansi.ts");
const { C, gradient } = require("../core/colors.ts");
const { Canvas, detectTerminalGraphics } = require("./renderer.ts");
const { generateStars, renderStars, generateShootingStars, renderShootingStars, dateSeed } = require("./starfield.ts");
const { createCamera, vec3 } = require("./math3d.ts");
const { buildRoomScene } = require("./scene3d.ts");
const { renderScene } = require("./raster3d.ts");
const { imageSequence, detectTerminalProtocol } = require("./graphics-protocol.ts");

const STARS_COUNT = 70;
const ANIM_DURATION = 3000;
const FRAME_INTERVAL = 80;
const MIN_WIDTH = 50;
const MIN_HEIGHT = 12;

function fadeIn(elapsed, delay, duration) {
  return Math.max(0, Math.min(1, (elapsed - delay) / duration));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

class LandingCompositor {
  constructor() {
    this._active = false;
    this._resolve = null;
    this._timer = null;
    this._startTime = 0;
    this._imgProto = null;
  }

  get active() { return this._active; }

  async play(info) {
    if (!process.stdout.isTTY) return;
    const cols = process.stdout.columns ?? 80;
    const rows = process.stdout.rows ?? 24;
    if (cols < MIN_WIDTH || rows < MIN_HEIGHT) return;

    this._active = true;
    this._imgProto = detectTerminalProtocol();
    this._startTime = Date.now();
    const seed = dateSeed();
    const starCount = Math.min(STARS_COUNT, Math.floor(cols * rows * 0.05)) * 2;

    const titleHeight = 8;
    // Quadrant mode: 2× horizontal, 4× vertical sub-pixels per terminal cell
    const canvasW = cols * 2;
    const canvasH = Math.floor((rows - titleHeight) * 4);
    const canvas = new Canvas(canvasW, canvasH);

    const stars = generateStars(canvasW, canvasH, starCount, seed);
    const shootingStars = generateShootingStars(canvasW, canvasH, ANIM_DURATION, seed);

    const scene = buildRoomScene(
      [167, 139, 250],   // table: purple
      [30, 41, 59],      // walls: rim
      [45, 212, 191],    // floor: teal
    );

    const dismiss = () => { if (this._active) this.stop(); };
    process.stdin.once("keypress", dismiss);

    return new Promise(resolve => {
      this._resolve = resolve;
      this._loop(stars, scene, shootingStars, canvas, info);
    });
  }

  _loop(stars, scene, shootingStars, canvas, info) {
    const elapsed = Date.now() - this._startTime;
    const cols = process.stdout.columns ?? 80;
    const animPhase = Math.min(elapsed / ANIM_DURATION, 1);
    const t = animPhase * Math.PI * 2;

    // Camera orbit
    const camRadius = 4.5;
    const camAngle = t * 0.15;
    const eyeX = Math.sin(camAngle) * camRadius * 0.6;
    const eyeZ = Math.cos(camAngle) * camRadius;
    const camera = createCamera(
      vec3(eyeX, 1.8, eyeZ),
      vec3(0, -0.4, 0),
      vec3(0, 1, 0),
      0.8,
      canvas.w / (canvas.h || 1),
      0.1,
      20,
    );

    // Rotate table
    const tableRotY = t * 0.5;
    scene[4].rot = vec3(0, tableRotY, 0);

    canvas.clear(7, 9, 15); // void background

    // 1. 3D room scene
    renderScene(canvas, scene, camera, animPhase < 0.2);

    // 2. Starfield (on top, acts as ambient particles)
    renderStars(stars, canvas, elapsed);

    // 3. Shooting stars
    renderShootingStars(shootingStars, canvas, elapsed);

    // 4. Build output
    let out = cursor.hide() + erase.displayAll();

    // Title with fade-in
    const titleAlpha = easeOutCubic(fadeIn(elapsed, 0, 800));
    const titleBright = Math.round(titleAlpha * 255);
    if (titleAlpha > 0) {
      const rawTitle = gradient("O  R  I  O  N");
      const fadedTitle = titleAlpha < 1
        ? rawTitle.replace(/\x1b\[38;2;(\d+);(\d+);(\d+)m/g, (_, r, g, bb) => {
            const nr = Math.round(r * titleAlpha + 7 * (1 - titleAlpha));
            const ng = Math.round(g * titleAlpha + 9 * (1 - titleAlpha));
            const nb = Math.round(bb * titleAlpha + 15 * (1 - titleAlpha));
            return `\x1b[38;2;${nr};${ng};${nb}m`;
          })
        : rawTitle;
      out += `\n  ${fadedTitle}\n`;
    } else {
      out += "\n\n";
    }

    // Model info with fade-in
    const modelAlpha = fadeIn(elapsed, 400, 600);
    if (modelAlpha > 0 && info) {
      const modelStr = `${C.accent}${info.model ?? ""}${RESET}${C.textMuted} ${info.backend ? `\u00B7 ${info.backend}` : ""}${RESET}`;
      if (modelAlpha < 1) {
        const r = Math.round(100 * modelAlpha + 7 * (1 - modelAlpha));
        const g = Math.round(116 * modelAlpha + 9 * (1 - modelAlpha));
        const b = Math.round(139 * modelAlpha + 15 * (1 - modelAlpha));
        out += `  \x1b[38;2;${r};${g};${b}m\u2014\u2014${RESET}\n`;
        out += `  \x1b[38;2;${r};${g};${b}m${modelStr}${RESET}\n`;
      } else {
        out += `  ${C.textMuted}\u2014\u2014${RESET}\n`;
        out += `  ${modelStr}\n`;
      }
      out += `  ${C.textMuted}\u2014\u2014${RESET}\n`;
    } else {
      out += `  ${C.textMuted}\u2014\u2014${RESET}\n`;
    }

    // Canvas content: native graphics protocol or quadrant fallback
    let drewImage = false;
    if (this._imgProto) {
      const canvasRows = Math.floor(canvas.h / 4);
      const img = imageSequence(canvas, cols, canvasRows, -1000000000);
      if (img) { out += img; drewImage = true; }
    }
    if (!drewImage) {
      const lines = canvas.renderQuadrant();
      for (let i = 0; i < lines.length; i++) {
        out += `  ${lines[i]}\n`;
      }
    }

    // Tagline with fade-in
    const tagAlpha = easeOutCubic(fadeIn(elapsed, 1200, 600));
    if (tagAlpha > 0) {
      const r = Math.round(100 * tagAlpha + 7 * (1 - tagAlpha));
      const g = Math.round(116 * tagAlpha + 9 * (1 - tagAlpha));
      const b = Math.round(139 * tagAlpha + 15 * (1 - tagAlpha));
      out += `\n  \x1b[38;2;${r};${g};${b}maethelred \u2014 kodlama ajan\u0131${RESET}`;
    } else {
      out += "\n";
    }

    // Footer "press any key" with pulsing brightness
    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(elapsed / 400));
    const footR = Math.round(100 * pulse);
    const footG = Math.round(116 * pulse);
    const footB = Math.round(139 * pulse);
    out += `\n  \x1b[2m\x1b[38;2;${footR};${footG};${footB}m${"\u2501".repeat(Math.min(6, Math.floor(cols / 2) - 8))} press any key to begin ${"\u2501".repeat(Math.min(6, Math.floor(cols / 2) - 8))}${RESET}\x1b[22m`;

    process.stdout.write(out);

    if (elapsed < ANIM_DURATION) {
      this._timer = setTimeout(() => this._loop(stars, scene, shootingStars, canvas, info), FRAME_INTERVAL);
    } else {
      setTimeout(() => this._finish(), 500);
    }
  }

  stop() {
    if (this._timer) clearTimeout(this._timer);
    this._finish();
  }

  _finish() {
    if (!this._active) return;
    this._active = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    process.stdout.write(cursor.show());
    if (this._resolve) this._resolve();
  }
}

function createLanding() {
  return new LandingCompositor();
}

module.exports = { createLanding, LandingCompositor };
