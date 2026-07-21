// core/ansi.ts — ANSI escape utilities, sanitization, cursor management
"use strict";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";

const ANSI_STRIP_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;
const ANSI_OSC_RE = /\x1b\].*?(\x07|\x1b\\)/g;
const ANSI_ALL_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(\x07|\x1b\\)/g;

/** @param {string} text */
function stripAnsi(text) {
  return text.replace(ANSI_STRIP_RE, "").replace(ANSI_OSC_RE, "");
}
/** @param {string} text */
function stripAllAnsi(text) {
  return text.replace(ANSI_ALL_RE, "");
}
/** @param {string} text */
function sanitize(text) {
  return text.replace(ANSI_ALL_RE, "");
}

const cursor = {
  hide:    () => "\x1b[?25l",
  show:    () => "\x1b[?25h",
  up:      (n = 1) => `\x1b[${n}A`,
  down:    (n = 1) => `\x1b[${n}B`,
  right:   (n = 1) => `\x1b[${n}C`,
  left:    (n = 1) => `\x1b[${n}D`,
  col:     (n = 1) => `\x1b[${n}G`,
  pos:     (row = 1, col = 1) => `\x1b[${row};${col}H`,
  save:    () => "\x1b[s",
  restore: () => "\x1b[u",
  saveDec: () => "\x1b7",
  restoreDec: () => "\x1b8",
};

const erase = {
  displayBelow: () => "\x1b[J",
  displayAbove: () => "\x1b[1J",
  displayAll:   () => "\x1b[2J",
  displayScrollback: () => "\x1b[3J",
  lineEnd:      () => "\x1b[K",
  lineStart:    () => "\x1b[1K",
  lineAll:      () => "\x1b[2K",
};

const screen = {
  altEnter: () => "\x1b[?1049h",
  altLeave: () => "\x1b[?1049l" + cursor.show(),
  syncBegin: () => "\x1b[?2026h",
  syncEnd:   () => "\x1b[?2026l",
};

const scroll = {
  /** @param {number} top @param {number} bottom */
  set: (top, bottom) => `\x1b[${top};${bottom}r`,
  reset: () => "\x1b[r",
};

const osc = {
  /** @param {string} title */
  setTitle: (title) => `\x1b]0;${title}\x07`,
  /** @param {string} msg */
  notify: (msg) => `\x1b]9;${encodeURIComponent(msg)}\x07`,
  /** @param {string} url @param {string} text */
  hyperlink: (url, text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`,
  /** @param {string} text */
  clipboard: (text) => {
    const buf = Buffer.from(text, "utf-8").toString("base64");
    return `\x1b]52;c;${buf}\x07`;
  },
  /** @param {number} pct @param {string} [state] */
  progress: (pct, state = "") => {
    if (pct < 0) return `\x1b]9;4;3${state ? `;${state}` : ""}\x07`;
    return `\x1b]9;4;1;${Math.round(pct)}${state ? `;${state}` : ""}\x07`;
  },
  progressDone: () => `\x1b]9;4;0\x07`,
  progressError: (st = "") => `\x1b]9;4;2${st ? `;${st}` : ""}\x07`,
};

/** @param {string} text */
function visibleWidth(text) {
  return stripAllAnsi(text).length;
}

/** @param {string} text @param {number} width */
function fitLine(text, width) {
  let cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "");
  let visible = 0, out = "";
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "\x1b") {
      const m = /^\x1b\[[0-9;]*m/.exec(cleaned.slice(i));
      if (m) { out += m[0]; i += m[0].length - 1; continue; }
    }
    if (cleaned[i] === "\n") break;
    if (visible >= width) break;
    out += cleaned[i];
    visible++;
  }
  return out + RESET;
}

module.exports = { RESET, BOLD, DIM, ITALIC, stripAnsi, stripAllAnsi, sanitize, cursor, erase, screen, scroll, osc, visibleWidth, fitLine };
