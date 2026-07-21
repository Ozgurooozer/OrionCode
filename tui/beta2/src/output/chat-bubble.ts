// output/chat-bubble.ts — Chat bubble renderer
"use strict";

const { RESET, BOLD, DIM, cursor, rgbBg, rgb } = require("../core/ansi.ts");
const { C, gradient } = require("../core/colors.ts");
const { renderMarkdown } = require("./markdown.ts");

function _renderUserBubble(msg) {
  const W = process.stdout.columns ?? 80;
  const ts = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const name = msg.name ?? "ozyn";
  const bg = "\x1b[48;2;26;27;38m";

  const out = [`\n${bg}${" ".repeat(W)}${RESET}`];

  const header = `${bg} ${BOLD}${C.starWarm}${name}${RESET}${bg}${C.textMuted}${" ".repeat(Math.max(1, W - name.length - ts.length - 4))}${ts}${RESET}`;
  out.push(header);

  const maxW = Math.floor(W * 0.85);
  const rendered = renderMarkdown(msg.content);
  const contentLines = rendered.split("\n");
  for (const line of contentLines) {
    out.push(`${bg}${" ".repeat(2)}${line}${RESET}`);
  }
  out.push(`${bg}${" ".repeat(W)}${RESET}`);

  return out.join("\n");
}

function _renderAssistantBubble(msg) {
  const W = process.stdout.columns ?? 80;
  const ts = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const info = msg.backend ? `${msg.model ?? ""} · ${msg.backend}` : "";
  const turnStr = msg.turnInfo ? ` ${msg.turnInfo}` : "";

  const pre = "─ orion ✦ ── ";
  const mid = `${info}${turnStr}`;
  const dashes = "─".repeat(Math.max(2, W - pre.length - mid.length - 2));
  const separator = `\n${C.textMuted}${pre}${C.teal}✦${RESET}${C.textMuted}${mid}${dashes}${RESET}\n\n`;

  return separator + renderMarkdown(msg.content);
}

function renderChatMessage(msg) {
  switch (msg.role) {
    case "user":
      return _renderUserBubble(msg);
    case "assistant":
      return _renderAssistantBubble(msg);
    case "system":
      return `\n  ${C.textMuted}· ${msg.content}${RESET}\n`;
    case "tool":
      return `  ${C.textDim}◌ ${msg.name ?? "tool"}${RESET} ${C.textMuted}${String(msg.content).slice(0, 80)}${RESET}\n`;
    default:
      return `\n${msg.content}\n`;
  }
}

function renderToolCall(tool, input) {
  const W = process.stdout.columns ?? 80;
  const primary = (input.path ?? input.file ?? input.pattern ?? input.command
    ?? input.message ?? input.query ?? input.dir ?? input.from
    ?? (Array.isArray(input.paths) ? input.paths.join(" ") : input.paths)
    ?? (typeof input.content === "string" ? input.content.slice(0, 50) : null)
    ?? "") ;
  const preview = String(primary).slice(0, W - 20);
  return `  ${C.purple}◈${RESET} ${C.accent}${tool}${RESET} ${C.textMuted}${preview}${RESET}\n`;
}

function renderTurnSeparator(mode, backend, turnInfo) {
  const W = process.stdout.columns ?? 80;
  const turnStr = turnInfo ? ` ${turnInfo}` : "";
  const info = `${mode} · ${backend}${turnStr}`;
  const pre = "─ orion ✦ ── ";
  const dashes = "─".repeat(Math.max(2, W - pre.length - info.length));
  return `\n${C.textMuted}${pre}${C.starWarm}✦${RESET}${C.textMuted}${info}${dashes}${RESET}\n`;
}

module.exports = { renderChatMessage, renderToolCall, renderTurnSeparator };
