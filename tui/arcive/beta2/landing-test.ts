// landing-test.ts — Landing page visual test
// node --experimental-strip-types tui/beta2/landing-test.ts
"use strict";

const { createLanding } = require("./src/landing/index.ts");

async function main() {
  const landing = createLanding();
  console.log("Landing page playing for 3 seconds... (press any key to skip)");
  await landing.play({ model: "claude-sonnet-4-6", backend: "anthropic" });
  console.log("\nLanding complete. Press Ctrl+C to exit.\n");
}

main().catch(e => {
  console.error("Landing test error:", e);
  process.exit(1);
});
