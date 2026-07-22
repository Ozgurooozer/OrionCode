"use strict";
const puppeteer = require("puppeteer");
const path = require("path");

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--use-gl=angle", "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 400 });

  const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#0b0e14">
<canvas id="renderCanvas" style="width:320px;height:160px"></canvas>
</body></html>`;
  await page.setContent(html);

  // Inject Babylon.js bundle
  const babylonPath = path.resolve(__dirname, "bundle/babylon.js");
  await page.addScriptTag({ path: babylonPath });

  // Create scene and render
  const result = await page.evaluate(() => {
    const canvas = document.getElementById("renderCanvas");
    canvas.width = 320;
    canvas.height = 160;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.043, 0.055, 0.078);

    const camera = new BABYLON.ArcRotateCamera("cam", 0, 0.8, 5, BABYLON.Vector3.Zero(), scene);
    camera.attachControl();
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1.5 }, scene);

    scene.render();

    const gl = engine._gl;
    const pixels = new Uint8Array(320 * 160 * 4);
    gl.readPixels(0, 0, 320, 160, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const idx = (80 * 320 + 160) * 4;
    return {
      centerR: pixels[idx],
      centerG: pixels[idx + 1],
      centerB: pixels[idx + 2],
      bufferLength: pixels.length,
      nonZero: pixels.filter(b => b > 0).length,
    };
  });

  console.log(`Center pixel: (${result.centerR},${result.centerG},${result.centerB})`);
  console.log(`Buffer: ${result.bufferLength} bytes, ${result.nonZero} non-zero (${(result.nonZero/result.bufferLength*100).toFixed(1)}%)`);

  const ok = result.nonZero > result.bufferLength * 0.02;
  console.log(ok ? "\n✓ PASS: Babylon.js → Puppeteer → readPixels" : "\n✗ FAIL: unexpected pixels");

  await browser.close();
}

main().catch(e => {
  console.error("FATAL:", e.message);
});
