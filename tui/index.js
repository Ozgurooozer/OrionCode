// tui/index.js — Orion TUI v3
// Truecolor tema, takımyıldız emblemi, statusline, markdown renderer v2
"use strict";

const i18n = require("../core/i18n.js");

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const ITALIC = "\x1b[3m";

// ── Renk temeli ──────────────────────────────────────────────────────────────
const rgb   = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
const rgbBg = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;

// Orion teması
const T = {
  star:    rgb(96, 220, 255),   // parlak yıldız — cyan
  nebula:  rgb(167, 139, 250),  // menekşe
  belt:    rgb(255, 224, 130),  // kuşak yıldızları — altın
  accent:  rgb(56, 189, 248),
  ok:      rgb(74, 222, 128),
  warn:    rgb(250, 204, 21),
  err:     rgb(248, 113, 113),
  muted:   rgb(120, 130, 150),
  code:    rgb(125, 211, 252),
  string:  rgb(190, 242, 100),
  keyword: rgb(244, 114, 182),
  comment: rgb(100, 110, 130),
  number:  rgb(251, 191, 36),
};

const C = {
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
  modeColor: (mode) => {
    const MAP = { plan: "\x1b[36m", build: "\x1b[32m", chat: "\x1b[90m", agent: "\x1b[33m" };
    return MAP[mode] ?? "\x1b[33m";
  },
};

// Metne cyan→menekşe gradyan uygula
function gradient(text) {
  const from = [96, 220, 255], to = [167, 139, 250];
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

// ── Emblem: Orion takımyıldızı ───────────────────────────────────────────────
// Betelgeuse ve Bellatrix omuzlar, Alnitak-Alnilam-Mintaka kuşak, Rigel ve Saiph ayaklar
function emblem(model, backend) {
  const S = T.star, N = T.nebula, B = T.belt, M = T.muted, R = RESET;
  const lines = [
    `   ${S}✦${R}${M}·${R}          ${M}·${R}${S}✦${R}     ${gradient(i18n.t("O  R  I  O  N", "O  R  İ  O  N"))}`,
    `     ${M}·${R}   ${N}✧${R}    ${M}·${R}        ${T.muted}aethelred${R} ${M}—${R} ${T.muted}${i18n.t("coding agent", "kodlama ajanı")}${R}`,
    `      ${B}✶ ✶ ✶${R}           ${T.accent}${model ?? ""}${R} ${M}${backend ? `(${backend})` : ""}${R}`,
    `    ${M}·${R}  ${N}✧${R}   ${M}·${R}`,
    `   ${S}✦${R}          ${M}·${R}${S}✦${R}`,
  ];
  return lines.join("\n");
}

// ── Markdown renderer v2 ─────────────────────────────────────────────────────
const KEYWORDS = /\b(function|const|let|var|return|if|else|for|while|class|new|async|await|import|export|require|module|try|catch|throw|def|fn|pub|struct|impl|match|use|switch|case|break|continue|typeof|instanceof|null|undefined|true|false|None|True|False)\b/g;

function highlightCode(code, lang = "") {
  if (lang === "diff") {
    return code.split("\n").map(l => {
      if (l.startsWith("+")) return `${T.ok}${l}${RESET}`;
      if (l.startsWith("-")) return `${T.err}${l}${RESET}`;
      if (l.startsWith("@@")) return `${T.accent}${l}${RESET}`;
      return `${T.muted}${l}${RESET}`;
    }).join("\n");
  }
  return code.split("\n").map(line => {
    // Yorum satırı — komple soluk
    const cm = line.match(/^(\s*)(\/\/|#|--)(.*)$/);
    if (cm && !line.trim().startsWith("#!")) return `${T.comment}${line}${RESET}`;
    // Placeholder tabanlı vurgu — renk kodlarının içi tekrar işlenmez
    const slots = [];
    const stash = (color, m) => { slots.push(`${color}${m}\x1b[39m`); return `\x00${slots.length - 1}\x00`; };
    let out = line
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, m => stash(T.string, m))
      .replace(KEYWORDS, m => stash(T.keyword, m))
      .replace(/(?<!\x00)\b(\d+\.?\d*)\b(?!\x00)/g, m => stash(T.number, m));
    out = out.replace(/\x00(\d+)\x00/g, (_, i) => slots[+i]);
    return `${T.code}${out}${RESET}`;
  }).join("\n");
}

function renderMarkdown(text) {
  return text
    // Kod blokları — çerçeve + dil etiketi + vurgu
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.replace(/\n$/, "").split("\n");
      const w = Math.min(76, Math.max(40, ...lines.map(l => l.length)) + 2);
      const label = lang ? ` ${lang} ` : "";
      const top    = C.muted(`╭─${label}${"─".repeat(Math.max(0, w - label.length - 1))}`);
      const bottom = C.muted(`╰${"─".repeat(w)}`);
      const body = highlightCode(lines.join("\n"), lang)
        .split("\n").map(l => `${C.muted("│")} ${l}`).join("\n");
      return `${top}\n${body}\n${bottom}`;
    })
    // Satır içi kod
    .replace(/`([^`]+)`/g, (_, c) => `${T.code}${c}${RESET}`)
    // Başlıklar
    .replace(/^### (.+)$/gm, (_, t) => `${BOLD}${T.accent}» ${t}${RESET}`)
    .replace(/^## (.+)$/gm,  (_, t) => `${BOLD}${T.accent}${t}${RESET}`)
    .replace(/^# (.+)$/gm,   (_, t) => `${BOLD}${gradient(t)}`)
    // Yatay çizgi
    .replace(/^---+$/gm, () => C.muted("─".repeat(50)))
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, (_, t) => C.bold(t))
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, (_, t) => C.italic(t))
    // Link → OSC 8 tıklanabilir
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) =>
      `\x1b]8;;${url}\x07${T.accent}${label}${RESET}\x1b]8;;\x07`)
    // Alıntı
    .replace(/^> (.+)$/gm, (_, t) => `${C.muted("┃")} ${C.italic(t)}`)
    // Liste maddeleri
    .replace(/^[-*] (.+)$/gm, (_, t) => `  ${T.accent}•${RESET} ${t}`)
    .replace(/^(\d+)\. (.+)$/gm, (_, n, t) => `  ${T.muted}${n}.${RESET} ${t}`);
}

// ── Araç görselleştirme ──────────────────────────────────────────────────────
const TOOL_ICONS = [
  [/^read|oku/,        "▤"],
  [/^write|^edit/,     "✎"],
  [/search|grep|ara/,  "⌕"],
  [/command|shell|run/, "❯"],
  [/^memory|hafiza/,   "◈"],
  [/vault/,            "⬡"],
  [/^mcp__/,           "⧉"],
  [/moltbook|feed/,    "☄"],
  [/list/,             "≡"],
];

function toolIcon(name) {
  for (const [re, icon] of TOOL_ICONS) if (re.test(name)) return icon;
  return "⚙";
}

// Araç girdisinden en anlamlı argümanı seç
function toolArgPreview(input) {
  if (!input || typeof input !== "object") return "";
  const primary = input.path ?? input.file ?? input.pattern ?? input.command
    ?? input.query ?? input.content?.slice?.(0, 50) ?? null;
  if (primary != null) return String(primary).slice(0, 60);
  const s = JSON.stringify(input);
  return s === "{}" ? "" : s.slice(0, 60);
}

// ── Sayı biçimleme ───────────────────────────────────────────────────────────
function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000)      return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// Model bağlam penceresi tahmini
function contextWindow(model = "", backend = "") {
  if (/claude/.test(model)) return 200_000;
  if (backend === "ollama") return 8192;
  return 128_000;
}

// ── print ────────────────────────────────────────────────────────────────────
const print = {
  tool: (name, input) => {
    const icon = toolIcon(name);
    const arg  = toolArgPreview(input);
    process.stderr.write(`  ${T.accent}${icon}${RESET} ${C.bold(name)}${arg ? C.muted(`  ${arg}`) : ""}\n`);
  },
  result: text => {
    const s = String(text).slice(0, 120).replace(/\n/g, " ");
    process.stderr.write(`  ${C.muted("↳ " + s)}\n`);
  },

  // Renkli unified diff — dosya değişikliklerinde gösterilir (pi tarzı)
  diff: (diffStr, { maxLines = 40 } = {}) => {
    if (!diffStr) return;
    const lines = diffStr.split("\n");
    const shown = lines.slice(0, maxLines);
    for (const l of shown) {
      if (l.startsWith("+"))       process.stderr.write(`  ${T.ok}${l}${RESET}\n`);
      else if (l.startsWith("-"))  process.stderr.write(`  ${T.err}${l}${RESET}\n`);
      else if (l.startsWith("@@")) process.stderr.write(`  ${T.accent}${l}${RESET}\n`);
      else                         process.stderr.write(`  ${T.muted}${l}${RESET}\n`);
    }
    if (lines.length > maxLines)
      process.stderr.write(`  ${C.muted(`… +${lines.length - maxLines} satır daha`)}\n`);
  },
  error:  text => console.error(`${T.err}✗${RESET} ${text}`),
  warn:   text => console.error(`${T.warn}!${RESET} ${text}`),
  info:   text => console.log(C.muted(text)),
  system: text => console.log(`${C.muted("·")} ${C.muted(text)}`),

  // Başlangıç ekranı — emblem + komut ipuçları
  header: (name, model, backend) => {
    console.log("\n" + emblem(model, backend) + "\n");
    console.log(C.muted(i18n.t(
      "  /help  /model  /mode  /mcp  /provider  /vault  /settings   Ctrl+C×2 exit",
      "  /yardim  /model  /mod  /mcp  /saglayici  /vault  /ayar   Ctrl+C×2 çıkış"
    )));
    console.log(C.muted("  " + "─".repeat(60)) + "\n");
  },

  // Statusline — her turdan sonra: mod · model · ↑↓ token · $ · ctx%
  statusline: (info) => {
    if (!info) return;
    const modeC  = C.modeColor(info.mode);
    const ctxW   = contextWindow(info.model, info.backend);
    const ctxPct = Math.min(100, Math.round((info.ctxTokens / ctxW) * 100));
    const ctxCol = ctxPct > 80 ? T.err : ctxPct > 50 ? T.warn : T.muted;
    const cost   = info.costUSD > 0
      ? `$${info.costUSD.toFixed(4)}`
      : i18n.t("local·$0", "yerel·$0");
    const parts = [
      `${modeC}${info.mode}${RESET}`,
      `${T.accent}${info.backend}${RESET}${T.muted}/${info.model}${RESET}`,
      `${T.muted}↑${fmtTokens(info.input)} ↓${fmtTokens(info.output)}${RESET}`,
      `${T.muted}${cost}${RESET}`,
      `${ctxCol}ctx %${ctxPct}${RESET}`,
    ];
    console.log(`${C.muted("  ⋆ ")}${parts.join(C.muted("  ·  "))}`);
  },

  sessionList: sessions => {
    if (!sessions.length) { console.log(C.muted(i18n.t("  (no saved sessions)", "  (kayıtlı oturum yok)"))); return; }
    console.log("");
    for (const s of sessions) {
      const date = s.updatedAt ? new Date(s.updatedAt).toLocaleString(i18n.locTag()) : "?";
      const msgs = `${s.msgCount ?? 0} msg`;
      console.log(`  ${C.cyan(s.id)}  ${C.muted(s.model)}  ${C.dim(msgs)}  ${C.muted(date)}`);
      if (s.preview) console.log(`       ${C.muted(s.preview)}`);
    }
    console.log("");
  },
};

// ── Spinner — geçen süre göstergeli ─────────────────────────────────────────
const SPIN = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let _spinInt = null;
let _spinI   = 0;
let _spinT0  = 0;
const spinner = {
  start: (label = "") => {
    if (_spinInt) return;
    _spinT0 = Date.now();
    process.stderr.write("  ");
    _spinInt = setInterval(() => {
      const secs = ((Date.now() - _spinT0) / 1000).toFixed(0);
      process.stderr.write(`\r  ${T.accent}${SPIN[_spinI++ % SPIN.length]}${RESET} ${C.dim(label)} ${C.muted(secs + "s")} `);
    }, 80);
  },
  stop: () => {
    if (_spinInt) { clearInterval(_spinInt); _spinInt = null; }
    process.stderr.write("\r" + " ".repeat(40) + "\r");
  },
};

module.exports = { C, T, print, spinner, renderMarkdown, gradient, emblem, contextWindow };
