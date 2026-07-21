// room3d-test.ts — 3D room + table rendered to terminal (3s loop with rotation)
"use strict";

const { cursor, erase, RESET } = require("./src/core/ansi.ts");
const { C } = require("./src/core/colors.ts");
const { Canvas } = require("./src/landing/renderer.ts");
const { createCamera, vec3 } = require("./src/landing/math3d.ts");
const { buildRoomScene } = require("./src/landing/scene3d.ts");
const { renderScene } = require("./src/landing/raster3d.ts");

const ANIM_DURATION = 3000;
const FRAME_INTERVAL = 80;

async function main() {
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  if (cols < 60 || rows < 16) { console.log("Terminal too small"); return; }

  const canvasH = Math.floor((rows - 2) * 2);
  const canvasW = cols;
  const canvas = new Canvas(canvasW, canvasH);

  const scene = buildRoomScene(
    [167, 139, 250],    // table: purple
    [30, 41, 59],       // walls: rim
    [45, 212, 191],     // floor: teal
  );

  const startTime = Date.now();

  // Keypress to skip
  if (process.stdin.isTTY) {
    process.stdin.once("keypress", () => process.exit(0));
    process.stdin.setRawMode?.(true);
  }

  function loop() {
    const elapsed = Date.now() - startTime;
    const animPhase = Math.min(elapsed / ANIM_DURATION, 1);
    const t = animPhase * Math.PI * 2;

    // Slowly rotate the table
    const tableRotY = t * 0.5;

    // Orbit camera slightly
    const camRadius = 4.5;
    const camAngle = t * 0.15;
    const eyeX = Math.sin(camAngle) * camRadius * 0.6;
    const eyeZ = Math.cos(camAngle) * camRadius;

    const camera = createCamera(
      vec3(eyeX, 1.8, eyeZ),
      vec3(0, -0.4, 0),
      vec3(0, 1, 0),
      0.8,                            // FOV ~46 deg
      canvasW / (canvasH || 1),
      0.1,
      20,
    );

    // Update table rotation
    scene[4].rot = vec3(0, tableRotY, 0);

    canvas.clear(7, 9, 15);          // void background
    renderScene(canvas, scene, camera, animPhase < 0.2);   // wireframe for first 0.6s

    const lines = canvas.renderHalfblock();
    let out = cursor.hide() + erase.displayAll();
    out += `\n  ${C.accent}Oda + Masa${RESET}   ${C.textMuted}3D terminal render${RESET}\n`;
    for (let i = 0; i < lines.length; i++) {
      out += `  ${lines[i]}\n`;
    }
    const pct = Math.round(animPhase * 100);
    out += `\n  ${C.textMuted}[${"\u2588".repeat(Math.round(pct / 5))}${"\u2591".repeat(20 - Math.round(pct / 5))}] ${pct}%${RESET}`;
    process.stdout.write(out);

    if (elapsed < ANIM_DURATION) {
      setTimeout(loop, FRAME_INTERVAL);
    } else {
      process.stdout.write(`\n  ${C.ok}3D render complete${RESET}\n`);
      process.stdout.write(cursor.show());
      process.exit(0);
    }
  }

  loop();
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
