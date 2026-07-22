// core/resize.ts — Terminal resize handler
"use strict";

const _handlers = [];
let _initialized = false;
let _debounceTimer = null;
let _cachedCols = process.stdout.columns ?? 80;
let _cachedRows = process.stdout.rows ?? 24;

function getTermCols() { return _cachedCols; }
function getTermRows() { return _cachedRows; }

function onResize(id, fn) {
  _handlers.push({ fn, id });
}
function offResize(id) {
  const idx = _handlers.findIndex(h => h.id === id);
  if (idx !== -1) _handlers.splice(idx, 1);
}

function initResizeHandler() {
  if (_initialized) return;
  _initialized = true;
  _cachedCols = process.stdout.columns ?? 80;
  _cachedRows = process.stdout.rows ?? 24;

  if (!process.stdout.isTTY) return;

  process.stdout.on("resize", () => {
    const newCols = process.stdout.columns ?? _cachedCols;
    const newRows = process.stdout.rows ?? _cachedRows;
    _cachedCols = newCols;
    _cachedRows = newRows;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      for (const h of _handlers) {
        try { h.fn(newCols, newRows); } catch {}
      }
    }, 80);
  });
}

function getLayout() {
  const width = getTermCols();
  const height = getTermRows();
  return {
    width,
    height,
    inputHeight: 1,
    statusHeight: 1,
    contentHeight: height - 4,
  };
}

module.exports = { getTermCols, getTermRows, onResize, offResize, initResizeHandler, getLayout };
