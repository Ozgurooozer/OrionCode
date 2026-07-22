// input/input-bar.ts — Input bar with provider badge, mode indicator
"use strict";

const { RESET, BOLD, DIM, cursor, erase, rgbBg, rgb, visibleWidth } = require("../core/ansi.ts");
const { C, PROVIDER_COLORS, gradient } = require("../core/colors.ts");
const { getTermCols } = require("../core/resize.ts");

function _boxW() { return getTermCols(); }

function _providerBadge(provider) {
  const colors = PROVIDER_COLORS[provider];
  if (!colors) return "";
  return `${colors.fg}${BOLD}${provider}${RESET}`;
}

function renderBandHeader(info = "") {
  const W = _boxW();
  const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const left = " ozyn";
  let right = info ? `${info} · ${ts}` : ts;
  if (visibleWidth(left) + visibleWidth(right) + 2 > W) right = ts;

  const bg = "\x1b[48;2;22;27;34m";
  const pad = Math.max(1, W - visibleWidth(left) - visibleWidth(right) - 1);
  return `${bg}${BOLD}${C.starWarm}${left}${RESET}${bg}${C.textMuted}${" ".repeat(pad)}${right} ${RESET}`;
}

function makeInputPrompt() {
  const fg = "\x1b[38;2;148;163;184m";
  const bg = "\x1b[48;2;15;17;26m";
  return `\x01${bg}${fg}\x02 ► \x01${bg}\x02`;
}

function finishUserTurn(rawLine, info = "") {
  if (!process.stdout.isTTY) return "";
  const W = _boxW();
  const promptW = 4;
  const liveRows = Math.max(1, Math.ceil((promptW + rawLine.length) / W));
  const bg = "\x1b[48;2;15;17;26m";
  const fg = "\x1b[38;2;148;163;184m";

  let out = `${RESET}\r\x1b[${liveRows + 2}A\x1b[J`;
  out += `\n${renderBandHeader(info)}\n`;

  const text = rawLine.trim();
  const bodyW = W - 4;
  const rows = [];
  for (let i = 0; i < text.length; i += bodyW) rows.push(text.slice(i, i + bodyW));
  if (!rows.length) rows.push("");

  rows.forEach((r, i) => {
    const head = i === 0 ? ` ${fg}► ${RESET}${bg}` : `   ${bg}`;
    out += `${bg}${head}${r}${" ".repeat(Math.max(1, W - 3 - r.length))}${RESET}\n`;
  });

  return out;
}

function refreshInputFill(rl) {
  if (!process.stdout.isTTY || !rl?.getCursorPos) return "";
  const cols = process.stdout.columns ?? 80;
  const pos = rl.getCursorPos();
  const promptW = 4;
  const total = promptW + (rl.line?.length ?? 0);
  let rowE = Math.floor(total / cols);
  let colE = total % cols;
  if (colE === 0 && total > 0) { rowE -= 1; colE = cols; }

  const fill = cols - colE;
  const down = Math.max(0, rowE - pos.rows);
  const bg = "\x1b[48;2;15;17;26m";

  let out = "\x1b[?25l";
  if (down > 0) out += `\x1b[${down}B`;
  out += `\x1b[${colE + 1}G`;
  if (fill > 0) out += bg + " ".repeat(fill);
  if (down > 0) out += `\x1b[${down}A`;
  out += `\x1b[${pos.cols + 1}G${bg}\x1b[?25h`;
  return out;
}

function showInputPlaceholder() {
  if (!process.stdout.isTTY) return "";
  const text = "mesaj yaz · komutlar için /";
  return `${DIM}${C.textMuted}${text}${RESET}\x1b[48;2;15;17;26m\x1b[${text.length}D`;
}

function clearInputPlaceholder() {
  if (!process.stdout.isTTY) return "";
  const len = "mesaj yaz · komutlar için /".length;
  return `\x1b[48;2;15;17;26m${" ".repeat(len)}\x1b[${len}D`;
}

function inputBoxTop(info = "") {
  return `\n${renderBandHeader(info)}\n`;
}

module.exports = {
  renderBandHeader, makeInputPrompt, finishUserTurn,
  refreshInputFill, showInputPlaceholder, clearInputPlaceholder, inputBoxTop,
};
