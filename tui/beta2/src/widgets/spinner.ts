// widgets/spinner.ts — Spinner v2 with concurrent support
"use strict";

const { cursor, erase } = require("../core/ansi.ts");
const { C } = require("../core/colors.ts");

const SPIN_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const _spinners = new Map();
let _renderTimer = null;
let _lastLineCount = 0;

function _renderAll() {
  const entries = [..._spinners.entries()];
  const count = entries.length;

  if (count === 0) {
    if (_lastLineCount > 0) {
      process.stdout.write(cursor.up(_lastLineCount) + erase.displayBelow());
      _lastLineCount = 0;
    }
    return;
  }

  const lines = entries.map(([id, s]) => {
    s.frameIndex = (s.frameIndex + 1) % SPIN_FRAMES.length;
    const elapsed = ((Date.now() - s.startTime) / 1000).toFixed(1);
    const frame = SPIN_FRAMES[s.frameIndex % SPIN_FRAMES.length];
    const label = s.label ? ` ${s.label}` : "";
    return `  ${C.accent}${frame}${RESET}${C.textDim}${label}${RESET} ${C.textMuted}${elapsed}s${RESET}`;
  });

  let out = "";
  if (_lastLineCount > 0) out += cursor.up(_lastLineCount) + erase.displayBelow();
  out += lines.join("\r\n") + "\r\n";
  out += cursor.up(count);
  _lastLineCount = count;
  process.stdout.write(out);
}

function spinStart(id, label = "") {
  if (_spinners.has(id)) return;
  _spinners.set(id, { label, startTime: Date.now(), frameIndex: 0 });
  if (_spinners.size === 1) {
    _renderTimer = setInterval(_renderAll, 80);
    _renderAll();
  }
}

function spinStop(id, finalText) {
  const s = _spinners.get(id);
  if (!s) return;
  clearInterval(s.timer);
  _spinners.delete(id);

  if (finalText) {
    const elapsed = ((Date.now() - s.startTime) / 1000).toFixed(1);
    const line = `  ${C.ok}✓${RESET} ${finalText} ${C.textMuted}${elapsed}s${RESET}`;
    process.stdout.write(cursor.up(1) + "\r" + erase.lineEnd() + line + "\n");
    _lastLineCount = 0;
  }

  if (_spinners.size === 0 && _renderTimer) {
    clearInterval(_renderTimer);
    _renderTimer = null;
  } else {
    _renderAll();
  }
}

function spinStopAll() {
  for (const [id] of _spinners) spinStop(id);
  if (_renderTimer) { clearInterval(_renderTimer); _renderTimer = null; }
  _lastLineCount = 0;
}

function spinLabel(id, label) {
  const s = _spinners.get(id);
  if (s) s.label = label;
}

const RESET = "\x1b[0m";

module.exports = { spinStart, spinStop, spinStopAll, spinLabel };
