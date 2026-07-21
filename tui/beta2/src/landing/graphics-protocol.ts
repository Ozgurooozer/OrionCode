"use strict";

// Terminal Graphics Protocols
// Kitty: https://github.com/kovidgoyal/kitty/blob/master/docs/graphics-protocol.rst
// iTerm2: https://iterm2.com/documentation-images.html

const ST = "\x1b\\";
const APC = "\x1b_G";
const OSC = "\x1b]";
const BEL = "\x07";
const zlib = require("zlib");

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

// Minimal PNG encoder for RGBA → actual PNG (needed by iTerm2 protocol)
function rgbaToPng(rgba, w, h) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type RGBA
  ihdrData[10] = 0; // compression deflate
  ihdrData[11] = 0; // filter adaptive
  ihdrData[12] = 0; // interlace none
  const ihdr = chunk("IHDR", ihdrData);

  // Filtered rows: each row has a filter byte (0 = None) before pixel data
  const rowSize = w * 4 + 1;
  const filtered = Buffer.alloc(h * rowSize);
  const buf = Buffer.isBuffer(rgba) ? rgba : Buffer.from(rgba);
  for (let y = 0; y < h; y++) {
    filtered[y * rowSize] = 0; // filter None
    buf.copy(filtered, y * rowSize + 1, y * w * 4, (y + 1) * w * 4);
  }

  // IDAT: deflate filtered data
  const deflated = zlib.deflateSync(filtered);
  const idat = chunk("IDAT", deflated);

  // IEND
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crcVal = crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function kittyRGBA(canvas) {
  const px = canvas._px;
  const len = canvas.w * canvas.h;
  const out = new Uint8Array(len * 4);
  for (let i = 0; i < len; i++) {
    const o = i * 4;
    out[o] = px[o];
    out[o + 1] = px[o + 1];
    out[o + 2] = px[o + 2];
    out[o + 3] = 255;
  }
  return out;
}

function* chunkPayload(b64str, maxLen) {
  for (let i = 0; i < b64str.length; i += maxLen) {
    yield b64str.slice(i, i + maxLen);
  }
}

// Kitty protocol: 24-bit RGBA via APC escape
function kittySequence(canvas, cols, rows, zIndex) {
  const rgba = kittyRGBA(canvas);
  const b64data = b64(rgba);
  const meta = `a=T,f=32,s=${canvas.w},v=${canvas.h},c=${cols},r=${rows},z=${zIndex}`;
  const CHUNK = 8192;

  const chunks = Array.from(chunkPayload(b64data, CHUNK));
  const parts = chunks.map((chunk, i) => {
    const m = i < chunks.length - 1 ? "1" : "0";
    if (i === 0) {
      return `${APC}${meta},m=${m};${chunk}${ST}`;
    }
    return `${APC}m=${m};${chunk}${ST}`;
  });
  return parts.join("");
}

// iTerm2 protocol: inline image via OSC 1337
// Requires actual PNG data, not raw RGBA
function iterm2Sequence(canvas, cols, rows) {
  const rgba = kittyRGBA(canvas);
  const png = rgbaToPng(rgba, canvas.w, canvas.h);
  const b64data = b64(png);
  const name = `orion_${Date.now()}.png`;
  return `${OSC}1337;File=name=${name};size=${b64data.length};width=${cols};height=${rows};preserveAspectRatio=0:${b64data}${BEL}`;
}

function detectTerminalProtocol() {
  const term = process.env.TERM ?? "";
  const pgm = process.env.TERM_PROGRAM ?? "";
  const wt = process.env.WT_SESSION ?? "";

  // Native Kitty protocol support
  if (pgm === "kitty" || term.includes("kitty")) return "kitty";
  if (pgm === "WezTerm" || pgm === "wezterm") return "kitty";
  if (pgm === "ghostty" || pgm === "Ghostty") return "kitty";

  // Windows Terminal — uses iTerm2-compatible inline images
  if (wt || pgm === "Windows Terminal") return "iterm2";

  // iTerm2 on macOS
  if (pgm === "iTerm.app") return "iterm2";

  return null;
}

function imageSequence(canvas, cols, rows, zIndex) {
  const proto = detectTerminalProtocol();
  if (proto === "kitty") return kittySequence(canvas, cols, rows, zIndex);
  if (proto === "iterm2") return iterm2Sequence(canvas, cols, rows);
  return null;
}

module.exports = { kittySequence, iterm2Sequence, detectTerminalProtocol, imageSequence, rgbaToPng };
