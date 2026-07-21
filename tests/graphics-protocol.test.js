"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

// Point require to beta2 source
const gp = require(path.resolve(__dirname, "..", "tui/beta2/src/landing/graphics-protocol.ts"));
const { Canvas } = require(path.resolve(__dirname, "..", "tui/beta2/src/landing/renderer.ts"));

test("kittySequence: 2×2 canvas produces valid APC escape", () => {
  const c = new Canvas(2, 2);
  // RGBA is (r,g,b,255) per pixel
  const buf = new Uint8Array(16);
  // pixel 0: red   (255,0,0)
  buf[0]=255; buf[1]=0;   buf[2]=0;   buf[3]=255;
  // pixel 1: green (0,255,0)
  buf[4]=0;   buf[5]=255; buf[6]=0;   buf[7]=255;
  // pixel 2: blue  (0,0,255)
  buf[8]=0;   buf[9]=0;   buf[10]=255; buf[11]=255;
  // pixel 3: white (255,255,255)
  buf[12]=255; buf[13]=255; buf[14]=255; buf[15]=255;
  c._px = buf;

  const seq = gp.kittySequence(c, 2, 2, -100);
  // Should start with APC introducer
  assert.ok(seq.startsWith("\x1b_G"), "Should start with APC introducer");
  // Should end with ST
  assert.ok(seq.endsWith("\x1b\\"), "Should end with ST");
  // Should contain metadata
  assert.ok(seq.includes("a=T"), "Should have a=T (transmit+place)");
  assert.ok(seq.includes("f=32"), "Should have f=32 (RGBA)");
  assert.ok(seq.includes("s=2,v=2"), "Should have s=2,v=2 (2×2 pixels)");
  assert.ok(seq.includes("c=2,r=2"), "Should have c=2,r=2 (2×2 cells)");
  assert.ok(seq.includes("z=-100"), "Should have z=-100");
  // 16 bytes → base64 = 24 chars, no chunking
  const payloadStart = seq.indexOf(";") + 1;
  const payload = seq.slice(payloadStart, seq.lastIndexOf("\x1b"));
  assert.strictEqual(payload.length, 24, "2×2 canvas → 24 base64 chars");
});

test("kittySequence: canvas alpha=1 → RGBA alpha=255", () => {
  const c = new Canvas(1, 1);
  c.setPixel(0, 0, 100, 150, 200);
  const seq = gp.kittySequence(c, 1, 1, 0);
  // Base64 decode the payload to verify RGBA values
  const payloadStart = seq.indexOf(";") + 1;
  const payload = seq.slice(payloadStart, seq.lastIndexOf("\x1b"));
  const decoded = Buffer.from(payload, "base64");
  assert.strictEqual(decoded[0], 100, "R channel");
  assert.strictEqual(decoded[1], 150, "G channel");
  assert.strictEqual(decoded[2], 200, "B channel");
  assert.strictEqual(decoded[3], 255, "Alpha must be 255 (opaque)");
});

test("kittySequence: large canvas triggers chunking", () => {
  // 80×40 canvas = 3200 pixels × 4 = 12800 bytes → base64 ≈ 17067 chars
  // CHUNK=8192 → 3 chunks
  const c = new Canvas(80, 40);
  c.clear(10, 20, 30);
  const seq = gp.kittySequence(c, 80, 10, -1000000000);
  // Should have multiple chunks, each with APC + ST
  const chunks = seq.match(/\x1b_G.+?\x1b\\/g);
  assert.ok(chunks.length >= 2, "Should have at least 2 chunks");
  // First chunk: m=1 (more) — always has leading comma in metadata
  assert.ok(chunks[0].includes(",m=1;"), "First chunk should have m=1");
  // Last chunk: m=0 (last) — continuation chunks use `m=0;` (no leading comma)
  const last = chunks[chunks.length - 1];
  assert.ok(last.includes("m=0;"), "Last chunk should have m=0");
  // All but first chunk: only m parameter
  for (let i = 1; i < chunks.length; i++) {
    assert.ok(chunks[i].includes("\x1b_Gm="), "Continuation chunks should only carry m parameter");
    assert.ok(!chunks[i].includes("a=T"), "Continuation chunks should not repeat metadata");
  }
});

test("kittySequence: single chunk when payload fits", () => {
  const c = new Canvas(4, 4);
  c.clear(7, 9, 15);
  const seq = gp.kittySequence(c, 4, 1, 0);
  const chunks = seq.match(/\x1b_G.+?\x1b\\/g);
  assert.strictEqual(chunks.length, 1, "Small canvas should yield single chunk");
  assert.ok(chunks[0].match(/[ ,]m=0;/), "Single chunk should have m=0");
});

test("detectKittyProtocol: Kitty terminal", () => {
  const prevTerm = process.env.TERM;
  const prevPgm = process.env.TERM_PROGRAM;
  process.env.TERM = "xterm-kitty";
  process.env.TERM_PROGRAM = "";
  assert.strictEqual(gp.detectKittyProtocol(), true);
  process.env.TERM = prevTerm;
  process.env.TERM_PROGRAM = prevPgm;
});

test("detectKittyProtocol: WezTerm", () => {
  const prevTerm = process.env.TERM;
  const prevPgm = process.env.TERM_PROGRAM;
  process.env.TERM = "";
  process.env.TERM_PROGRAM = "WezTerm";
  assert.strictEqual(gp.detectKittyProtocol(), true);
  process.env.TERM = prevTerm;
  process.env.TERM_PROGRAM = prevPgm;
});

test("detectKittyProtocol: Ghostty", () => {
  const prevTerm = process.env.TERM;
  const prevPgm = process.env.TERM_PROGRAM;
  process.env.TERM = "";
  process.env.TERM_PROGRAM = "ghostty";
  assert.strictEqual(gp.detectKittyProtocol(), true);
  process.env.TERM = prevTerm;
  process.env.TERM_PROGRAM = prevPgm;
});

test("detectKittyProtocol: Windows Terminal → false", () => {
  const prevTerm = process.env.TERM;
  const prevPgm = process.env.TERM_PROGRAM;
  process.env.TERM = "";
  process.env.TERM_PROGRAM = "";
  assert.strictEqual(gp.detectKittyProtocol(), false);
  process.env.TERM = prevTerm;
  process.env.TERM_PROGRAM = prevPgm;
});

test("kittySequence: z-index is negative for behind-text placement", () => {
  const c = new Canvas(4, 4);
  c.clear(0, 0, 0);
  const seq = gp.kittySequence(c, 4, 1, -1000000000);
  assert.ok(seq.includes("z=-1000000000"), "Should use negative z-index for behind-text");
});

test("kittySequence: decode base64 back to pixel data", () => {
  const c = new Canvas(3, 3);
  c.setPixel(0, 0, 255, 0, 0);
  c.setPixel(1, 1, 0, 255, 0);
  c.setPixel(2, 2, 0, 0, 255);
  const seq = gp.kittySequence(c, 3, 3, 0);
  const payloadStart = seq.indexOf(";") + 1;
  const payload = seq.slice(payloadStart, seq.lastIndexOf("\x1b"));
  const decoded = Buffer.from(payload, "base64");
  // 9 pixels × 4 bytes = 36 bytes
  assert.strictEqual(decoded.length, 36, "3×3 canvas → 36 RGBA bytes");
  // pixel at (0,0) — should be red
  const p00 = 0;
  assert.strictEqual(decoded[p00], 255, "(0,0) R");
  assert.strictEqual(decoded[p00+1], 0, "(0,0) G");
  assert.strictEqual(decoded[p00+2], 0, "(0,0) B");
  assert.strictEqual(decoded[p00+3], 255, "(0,0) A");
  // pixel at (1,1)
  const p11 = (1 * 3 + 1) * 4;
  assert.strictEqual(decoded[p11], 0, "(1,1) R");
  assert.strictEqual(decoded[p11+1], 255, "(1,1) G");
  assert.strictEqual(decoded[p11+2], 0, "(1,1) B");
  // pixel at (2,2)
  const p22 = (2 * 3 + 2) * 4;
  assert.strictEqual(decoded[p22], 0, "(2,2) R");
  assert.strictEqual(decoded[p22+1], 0, "(2,2) G");
  assert.strictEqual(decoded[p22+2], 255, "(2,2) B");
});
