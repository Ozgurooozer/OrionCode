// core/colors.ts — Orion Night color palette & gradient system
"use strict";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";

function rgb(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`;
}
function rgbBg(r, g, b) {
  return `\x1b[48;2;${r};${g};${b}m`;
}

const C = {
  void:      "\x1b[38;2;7;9;15m",
  voidBg:    "\x1b[48;2;7;9;15m",
  panel:     "\x1b[48;2;22;27;34m",
  dust:      "\x1b[48;2;26;30;46m",
  rim:       "\x1b[38;2;30;41;59m",

  text:      "\x1b[38;2;226;232;240m",
  textSoft:  "\x1b[38;2;203;213;225m",
  textDim:   "\x1b[38;2;148;163;184m",
  textMuted: "\x1b[38;2;100;116;139m",

  accent:    "\x1b[38;2;129;140;248m",
  accentBg:  "\x1b[48;2;129;140;248m",
  teal:      "\x1b[38;2;45;212;191m",
  tealBg:    "\x1b[48;2;45;212;191m",
  purple:    "\x1b[38;2;167;139;250m",
  purpleBg:  "\x1b[48;2;167;139;250m",

  ok:        "\x1b[38;2;74;222;128m",
  okBg:      "\x1b[48;2;74;222;128m",
  err:       "\x1b[38;2;248;113;113m",
  errBg:     "\x1b[48;2;248;113;113m",
  warn:      "\x1b[38;2;251;191;36m",
  warnBg:    "\x1b[48;2;251;191;36m",
  info:      "\x1b[38;2;96;165;250m",
  infoBg:    "\x1b[48;2;96;165;250m",

  starWarm:  "\x1b[38;2;251;191;36m",
  starCool:  "\x1b[38;2;96;165;250m",
  starWhite: "\x1b[38;2;248;250;252m",
};

const PROVIDER_COLORS = {
  anthropic:   { fg: "\x1b[38;2;217;119;87m",  bg: "\x1b[48;2;217;119;87m" },
  openai:      { fg: "\x1b[38;2;16;163;127m",  bg: "\x1b[48;2;16;163;127m" },
  ollama:      { fg: "\x1b[38;2;202;173;141m", bg: "\x1b[48;2;202;173;141m" },
  openrouter:  { fg: "\x1b[38;2;113;50;245m",  bg: "\x1b[48;2;113;50;245m" },
  nim:         { fg: "\x1b[38;2;118;185;0m",   bg: "\x1b[48;2;118;185;0m" },
  huggingface: { fg: "\x1b[38;2;255;209;0m",   bg: "\x1b[48;2;255;209;0m" },
  lmstudio:    { fg: "\x1b[38;2;100;200;255m", bg: "\x1b[48;2;100;200;255m" },
};

const _gradientCache = new Map();

function gradient(text, from = [96, 220, 255], to = [167, 139, 250]) {
  if (!text) return "";
  const key = `${text}|${from.join(",")}|${to.join(",")}`;
  const cached = _gradientCache.get(key);
  if (cached) return cached;

  const chars = [...text];
  const n = Math.max(chars.length - 1, 1);
  const result = chars.map((ch, i) => {
    const t = i / n;
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    return `\x1b[38;2;${r};${g};${b}m${ch}`;
  }).join("") + RESET;

  if (key.length < 500) _gradientCache.set(key, result);
  return result;
}

function multiGradient(text, stops) {
  if (!text || stops.length < 2) return gradient(text);
  const chars = [...text];
  const n = Math.max(chars.length - 1, 1);
  return chars.map((ch, i) => {
    const t = i / n;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].pos && t <= stops[s + 1].pos) {
        const local = (t - stops[s].pos) / (stops[s + 1].pos - stops[s].pos);
        const r = Math.round(stops[s].r + (stops[s + 1].r - stops[s].r) * local);
        const g = Math.round(stops[s].g + (stops[s + 1].g - stops[s].g) * local);
        const b = Math.round(stops[s].b + (stops[s + 1].b - stops[s].b) * local);
        return `\x1b[38;2;${r};${g};${b}m${ch}`;
      }
    }
    const last = stops[stops.length - 1];
    return `\x1b[38;2;${last.r};${last.g};${last.b}m${ch}`;
  }).join("") + RESET;
}

const BOX = {
  light:  { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  heavy:  { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  round:  { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
};

module.exports = { RESET, BOLD, DIM, ITALIC, rgb, rgbBg, C, PROVIDER_COLORS, gradient, multiGradient, BOX };
