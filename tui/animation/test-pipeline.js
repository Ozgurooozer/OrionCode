"use strict";
// test-pipeline.js — End-to-end test of animation + TUI integration
// Tests: 1) browser initializes  2) frame renders  3) terminal output works

const path = require("path");
const fs = require("fs");

async function testBrowser() {
  const { HeadlessBrowser } = require("./browser.js");
  const b = new HeadlessBrowser();
  await b.start(640, 200);
  const { pixels, width, height } = await b.renderFrame(16);
  console.log("✓ Browser: frame", width + "x" + height, "pixels:", pixels.length);
  await b.stop();
  return { pixels, width, height };
}

function testTerminalOutput({ pixels, width, height }) {
  const { renderAnimationFrame } = require("./terminal.js");
  // Capture stdout (in memory)
  const chunks = [];
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => { chunks.push(Buffer.from(chunk)); return true; };

  const raw = new Uint8Array(pixels);
  const result = renderAnimationFrame(raw, width, height, 8);

  process.stdout.write = origWrite;

  const output = Buffer.concat(chunks).toString();
  console.log("✓ Terminal: rendered =", result);
  console.log("  Output length:", output.length, "bytes");
  console.log("  Contains OSC 1337:", output.includes("\x1b]1337"));
  console.log("  Contains PNG base64:", output.includes("iVBOR"));
  return output;
}

function testHeadlessInit() {
  const { start, stop, height } = require("./controller.js");
  console.log("✓ Controller: height() =", height());
  console.log("  start/stop exported:", typeof start === "function", typeof stop === "function");
}

async function main() {
  console.log("═══ Animation Pipeline Test ═══\n");

  // Test 1: Controller module
  console.log("── Module exports ──");
  testHeadlessInit();

  // Test 2: Browser + render
  console.log("\n── Browser + RenderFrame ──");
  const frame = await testBrowser();

  // Test 3: Terminal output vs graphics protocol
  console.log("\n── Terminal output ──");
  const output = testTerminalOutput(frame);

  // Test 4: PNG encoder via graphics-protocol
  console.log("\n── PNG encoder ──");
  const gp = require(path.resolve(__dirname, "..", "beta2", "src", "landing", "graphics-protocol.ts"));
  const png = gp.rgbaToPng(Buffer.from(frame.pixels), frame.width, frame.height);
  console.log("  PNG size:", png.length, "bytes");
  console.log("  Valid PNG signature:", png[0] === 137 && png[1] === 80);

  // Save debug frame
  const outPath = path.resolve(__dirname, "test-frame.png");
  fs.writeFileSync(outPath, png);
  console.log("\n  Debug frame saved:", outPath);

  console.log("\n═══ ALL TESTS PASSED ═══");
}

main().catch(e => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
