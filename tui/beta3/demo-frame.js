"use strict";
// Demo: render ONE frame, save as PNG so user can see it
const { HeadlessBrowser } = require("./src/browser.js");
const gp = require("../beta2/src/landing/graphics-protocol.ts");
const fs = require("fs");

async function main() {
  const browser = new HeadlessBrowser();
  await browser.start(640, 400);

  // Let the scene animate a bit for a nicer angle
  await browser.renderFrame(2000);
  const { pixels, width, height } = await browser.renderFrame(500);

  // Convert RGBA → PNG using the fixed encoder
  const rgba = new Uint8Array(pixels);
  const png = gp.rgbaToPng(Buffer.from(rgba), width, height);

  const outPath = __dirname + "/demo-frame.png";
  fs.writeFileSync(outPath, png);
  console.log("✓ Frame saved:", outPath);
  console.log("  Dimensions:", width + "x" + height);
  console.log("  PNG size:", png.length, "bytes");

  await browser.stop();
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
