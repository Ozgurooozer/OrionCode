"use strict";
// Headless WebGL test — Babylon.js in Node.js via headless-gl
async function main() {
  let gl;
  try {
    gl = require("gl");
  } catch (e) {
    console.log("FAIL: gl package not available:", e.message);
    process.exit(1);
  }

  const width = 320;
  const height = 160;
  const context = gl(width, height, { preserveDrawingBuffer: true });

  if (!context) {
    console.log("FAIL: Could not create WebGL context");
    process.exit(1);
  }

  context.clearColor(0.3, 0.4, 0.6, 1.0);
  context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
  context.finish();

  const pixels = new Uint8Array(width * height * 4);
  context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels);

  // Check center pixel
  const idx = ((height >> 1) * width + (width >> 1)) * 4;
  const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
  const ok = r > 50 && g > 70 && b > 100;
  console.log(`Center pixel: (${r},${g},${b}) — ${ok ? "PASS" : "FAIL"}`);
  console.log(`Context type: ${typeof context}`);
  console.log(`VENDOR: ${context.getParameter(context.VENDOR)}`);
  console.log(`RENDERER: ${context.getParameter(context.RENDERER)}`);
  console.log(`WEBGL_VERSION: ${context.getParameter(context.VERSION)}`);

  // Try to load Babylon.js and create a basic scene
  try {
    const { Engine, Scene, ArcRotateCamera, HemisphericLight, MeshBuilder, Vector3, Color3 } = require("@babylonjs/core");

    // Create engine from WebGL context
    const engine = new Engine(context, false, { preserveDrawingBuffer: true });
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera("cam", 0, 0.8, 5, Vector3.Zero(), scene);
    camera.attachControl();
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);

    engine.runRenderLoop(() => { scene.render(); });

    // Render one frame
    scene.render();

    const pixels2 = new Uint8Array(width * height * 4);
    context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, pixels2);

    const idx2 = ((height >> 1) * width + (width >> 1)) * 4;
    const r2 = pixels2[idx2], g2 = pixels2[idx2 + 1], b2 = pixels2[idx2 + 2];
    console.log(`After Babylon render, center: (${r2},${g2},${b2})`);
    console.log("Babylon.js SUCCESS: Engine + Scene + Render working headlessly!");
    console.log("PASS: Headless WebGL + Babylon.js is viable");
    process.exit(0);
  } catch (e) {
    console.log("FAIL: Babylon.js headless error:", e.message);
    console.log(e.stack);
    process.exit(1);
  }
}

main().catch(e => {
  console.log("FATAL:", e);
  process.exit(1);
});
