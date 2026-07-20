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

export declare const RESET: string;
export declare const BOLD: string;
export declare const DIM: string;
export declare const ITALIC: string;
export declare const rgb: (r: number, g: number, b: number) => string;
export declare const rgbBg: (r: number, g: number, b: number) => string;
export declare const T: Theme;
export declare const C: Color;
export declare function gradient(text: string): string;
