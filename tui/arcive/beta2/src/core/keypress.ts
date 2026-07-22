// core/keypress.ts — Centralized keypress manager
"use strict";

const { onResize } = require("./resize.ts");

const _handlers = [];
let _active = false;
let _rawModeCount = 0;

function rawModePush() {
  _rawModeCount++;
  if (_rawModeCount === 1 && process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
}
function rawModePop() {
  _rawModeCount = Math.max(0, _rawModeCount - 1);
  if (_rawModeCount === 0 && process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
  }
}
function isRawModeActive() { return _rawModeCount > 0; }

function onKey(id, handler, priority = 0) {
  _handlers.push({ handler, priority, id });
  _handlers.sort((a, b) => b.priority - a.priority);
}
function offKey(id) {
  const idx = _handlers.findIndex(h => h.id === id);
  if (idx !== -1) _handlers.splice(idx, 1);
}
function getHandlerCount() { return _handlers.length; }

function normalizeKey(s, key) {
  const name = key.name ?? "";
  const ctrl = !!key.ctrl;
  const shift = !!key.shift;
  const alt = !!(key.meta) || !!(key.alt);
  let code;
  if (name === "up") code = "ArrowUp";
  else if (name === "down") code = "ArrowDown";
  else if (name === "left") code = "ArrowLeft";
  else if (name === "right") code = "ArrowRight";
  else if (name === "tab") code = "Tab";
  else if (name === "return" || name === "enter") code = "Enter";
  else if (name === "escape") code = "Escape";
  else if (name === "backspace") code = "Backspace";
  else if (name === "delete") code = "Delete";
  else if (name === "home") code = "Home";
  else if (name === "end") code = "End";
  else if (name === "pageup") code = "PageUp";
  else if (name === "pagedown") code = "PageDown";

  return { name, ctrl, shift, alt, meta: alt, sequence: s, code };
}

function forwardKeypress(s, key) {
  const event = normalizeKey(s, key);
  for (const entry of _handlers) {
    try {
      if (entry.handler(event) === true) return true;
    } catch {}
  }
  return false;
}

function initKeypress() {
  if (_active) return;
  _active = true;
  process.stdin.on("keypress", (s, key) => {
    forwardKeypress(s, key);
  });
}

function isKeypressActive() { return _active; }

module.exports = {
  rawModePush, rawModePop, isRawModeActive,
  onKey, offKey, getHandlerCount,
  forwardKeypress, initKeypress, isKeypressActive,
};
