"use strict";

export interface Theme {
  star: string; nebula: string; belt: string; accent: string;
  ok: string; warn: string; err: string; muted: string;
  boxBg: string; boxFg: string;
  code: string; string: string; keyword: string; comment: string; number: string;
}

export interface Color {
  cyan(s: string): string;
  yellow(s: string): string;
  gray(s: string): string;
  green(s: string): string;
  red(s: string): string;
  blue(s: string): string;
  magenta(s: string): string;
  bold(s: string): string;
  dim(s: string): string;
  italic(s: string): string;
  star(s: string): string;
  nebula(s: string): string;
  belt(s: string): string;
  accent(s: string): string;
  muted(s: string): string;
  modeColor(mode: string): string;
}

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const ITALIC = "\x1b[3m";

const rgb   = (r: number, g: number, b: number): string => `\x1b[38;2;${r};${g};${b}m`;
const rgbBg = (r: number, g: number, b: number): string => `\x1b[48;2;${r};${g};${b}m`;

const T: Theme = {
  star:    rgb(96, 220, 255),
  nebula:  rgb(167, 139, 250),
  belt:    rgb(255, 224, 130),
  accent:  rgb(56, 189, 248),
  ok:      rgb(74, 222, 128),
  warn:    rgb(250, 204, 21),
  err:     rgb(248, 113, 113),
  muted:   rgb(120, 130, 150),
  boxBg:   rgbBg(36, 43, 62),
  boxFg:   rgb(222, 229, 242),
  code:    rgb(125, 211, 252),
  string:  rgb(190, 242, 100),
  keyword: rgb(244, 114, 182),
  comment: rgb(100, 110, 130),
  number:  rgb(251, 191, 36),
};

const C: Color = {
  cyan:    s => `\x1b[36m${s}${RESET}`,
  yellow:  s => `\x1b[33m${s}${RESET}`,
  gray:    s => `\x1b[90m${s}${RESET}`,
  green:   s => `\x1b[32m${s}${RESET}`,
  red:     s => `\x1b[31m${s}${RESET}`,
  blue:    s => `\x1b[34m${s}${RESET}`,
  magenta: s => `\x1b[35m${s}${RESET}`,
  bold:    s => `${BOLD}${s}${RESET}`,
  dim:     s => `${DIM}${s}${RESET}`,
  italic:  s => `${ITALIC}${s}${RESET}`,
  star:    s => `${T.star}${s}${RESET}`,
  nebula:  s => `${T.nebula}${s}${RESET}`,
  belt:    s => `${T.belt}${s}${RESET}`,
  accent:  s => `${T.accent}${s}${RESET}`,
  muted:   s => `${T.muted}${s}${RESET}`,
  modeColor(mode: string): string {
    const MAP: Record<string, string> = {
      plan: "\x1b[36m", build: "\x1b[32m", chat: "\x1b[90m", agent: "\x1b[33m",
    };
    return MAP[mode] ?? "\x1b[33m";
  },
};

function gradient(text: string): string {
  const from: [number, number, number] = [96, 220, 255];
  const to:   [number, number, number] = [167, 139, 250];
  const chars = [...text];
  const n = Math.max(chars.length - 1, 1);
  return chars.map((ch, i) => {
    const t = i / n;
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    return `${rgb(r, g, b)}${ch}`;
  }).join("") + RESET;
}

module.exports = { RESET, BOLD, DIM, ITALIC, rgb, rgbBg, T, C, gradient };
