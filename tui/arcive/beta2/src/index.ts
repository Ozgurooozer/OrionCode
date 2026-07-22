// beta2/src/index.ts — Orion TUI v2 entry point
"use strict";

const { getStore, TUIStore } = require("./core/store.ts");
const { C, PROVIDER_COLORS, gradient, multiGradient, BOX, RESET, BOLD, DIM, ITALIC, rgb, rgbBg } = require("./core/colors.ts");
const { stripAnsi, stripAllAnsi, sanitize, cursor, erase, screen, scroll, osc, visibleWidth, fitLine } = require("./core/ansi.ts");
const { initResizeHandler, getTermCols, getTermRows, onResize, offResize, getLayout } = require("./core/resize.ts");
const { onKey, offKey, rawModePush, rawModePop, isRawModeActive, forwardKeypress, initKeypress } = require("./core/keypress.ts");
const { spinStart, spinStop, spinStopAll, spinLabel } = require("./widgets/spinner.ts");
const { initToastRenderer } = require("./widgets/toast.ts");
const { Pager, displayWithPager } = require("./output/pager.ts");
const { SlashMenu } = require("./input/slash-menu.ts");
const { renderChatMessage, renderToolCall, renderTurnSeparator } = require("./output/chat-bubble.ts");
const { renderMarkdown } = require("./output/markdown.ts");
const { renderBandHeader, makeInputPrompt, finishUserTurn, refreshInputFill, showInputPlaceholder, clearInputPlaceholder, inputBoxTop } = require("./input/input-bar.ts");
const { createLanding } = require("./landing/index.ts");

let _initialized = false;

function initTUI() {
  if (_initialized) return;
  _initialized = true;
  const store = getStore();

  process.on("SIGINT", () => { store.spinStopAll(); });
  process.on("exit", () => {
    try { process.stdout.write("\x1b[0m\x1b[?25h"); } catch {}
  });
}

function isTUIReady() { return _initialized; }

function emblem(model, backend) {
  const cols = process.stdout.columns ?? 80;
  const info1 = `${C.textMuted}aethelred — kodlama ajanı${RESET}`;
  const info2 = `${C.accent}${model ?? ""}${RESET}${C.textMuted}${backend ? ` (${backend})` : ""}${RESET}`;

  if (cols < 54) {
    return [
      ` ${C.starWarm}✦${RESET} ${gradient("O  R  I  O  N")} ${C.purple}✧${RESET}`,
      `   ${info1}`,
      `   ${info2}`,
    ].join("\n");
  }

  const art = [
    " ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗",
    "██╔═══██╗██╔══██╗██║██╔═══██╗████╗  ██║",
    "██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║",
    "██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║",
    "╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║",
    " ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝",
  ];
  const stars = [
    `    ${C.starWarm}✦${RESET}     ${C.textMuted}·${RESET}`,
    `  ${C.textMuted}·${RESET}    ${C.purple}✧${RESET}`,
    `    \x1b[38;2;248;250;252m✶ ✶ ✶${RESET}`,
    `  ${C.purple}✧${RESET}    ${C.textMuted}·${RESET}`,
    `    ${C.textMuted}·${RESET}   ${C.starCool}✦${RESET}`,
    "",
  ];
  const lines = art.map((l, i) => ` ${gradient(l)}${stars[i]}`);
  lines.push("", `   ${info1}`, `   ${info2}`);
  return lines.join("\n");
}

module.exports = {
  getStore, TUIStore, C, PROVIDER_COLORS, gradient, multiGradient, BOX, RESET, BOLD, DIM, ITALIC, rgb, rgbBg,
  stripAnsi, stripAllAnsi, sanitize, cursor, erase, screen, scroll, osc, visibleWidth, fitLine,
  initResizeHandler, getTermCols, getTermRows, onResize, offResize, getLayout,
  onKey, offKey, rawModePush, rawModePop, isRawModeActive, forwardKeypress, initKeypress,
  spinStart, spinStop, spinStopAll, spinLabel, initToastRenderer, Pager, displayWithPager,
  SlashMenu, renderChatMessage, renderToolCall, renderTurnSeparator, renderMarkdown,
  renderBandHeader, makeInputPrompt, finishUserTurn, refreshInputFill,
  showInputPlaceholder, clearInputPlaceholder, inputBoxTop,
  initTUI, isTUIReady, emblem, createLanding,
};
