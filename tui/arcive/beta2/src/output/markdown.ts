// output/markdown.ts — Markdown renderer v2
"use strict";

const { RESET, BOLD, DIM, ITALIC, rgb, rgbBg, sanitize, visibleWidth, fitLine } = require("../core/ansi.ts");
const { C, gradient } = require("../core/colors.ts");

const KEYWORDS = /\b(function|const|let|var|return|if|else|for|while|class|new|async|await|import|export|require|module|try|catch|throw|def|fn|pub|struct|impl|match|use|switch|case|break|continue|typeof|instanceof|null|undefined|true|false|None|True|False|enum|trait|where|Self|self|super|crate|mod|type|union|unsafe|yield|with|as|from|lambda|pass|raise|finally|global|nonlocal|interface|type|abstract|override|static|private|public|protected|readonly)\b/g;

const _langComment = (() => {
  const m = {
    js: "//", ts: "//", jsx: "//", tsx: "//", c: "//", cpp: "//", java: "//",
    go: "//", rust: "//", swift: "//", kotlin: "//",
    py: "#", rb: "#", sh: "#", bash: "#", yaml: "#", yml: "#", toml: "#",
    lua: "--", sql: "--",
  };
  return (l) => m[l] ?? "//";
})();

function _highlightCode(code, lang = "") {
  if (lang === "diff") {
    return code.split("\n").map(l => {
      if (l.startsWith("+")) return `${C.ok}${l}${RESET}`;
      if (l.startsWith("-")) return `${C.err}${l}${RESET}`;
      if (l.startsWith("@@")) return `${C.accent}${l}${RESET}`;
      return `${C.textMuted}${l}${RESET}`;
    }).join("\n");
  }

  return code.split("\n").map(line => {
    const cmt = _langComment(lang);
    const cmRe = new RegExp(`^(\\s*)(${cmt})(.*)$`);
    const cm = line.match(cmRe);
    if (cm && !line.trim().startsWith("#!")) return `${C.textMuted}${line}${RESET}`;

    const slots = [];
    const stash = (color, m) => {
      slots.push(`${color}${m}${RESET}`);
      return `\x00${slots.length - 1}\x00`;
    };
    let out = line
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, m => stash(C.teal, m))
      .replace(KEYWORDS, m => stash(C.accent, m))
      .replace(/(?<!\x00)\b(\d+\.?\d*)\b(?!\x00)/g, m => stash(C.warn, m));
    out = out.replace(/\x00(\d+)\x00/g, (_, i) => slots[+i]);
    return `${"\x1b[38;2;148;163;184m"}${out}${RESET}`;
  }).join("\n");
}

function _renderTable(rows) {
  if (!rows.length) return "";
  const W = process.stdout.columns ?? 80;
  const colW = rows[0].map((_, ci) =>
    Math.max(...rows.map(r => visibleWidth(r[ci] ?? ""))) + 2
  );
  const totalW = colW.reduce((a, b) => a + b, 1);
  const scale = totalW > W - 4 ? (W - 4) / totalW : 1;
  const adj = colW.map(w => Math.max(4, Math.floor(w * scale)));

  const lines = [];
  rows.forEach((row, ri) => {
    const cells = row.map((c, ci) => ` ${ri === 0 ? BOLD : ""}${c.padEnd(adj[ci] - 1)}${RESET}`);
    if (ri === 0) {
      lines.push(`  ${C.textDim}${cells.join(`${C.textMuted}│${RESET}`)}`);
      lines.push(`  ${C.textDim}${adj.map(w => "─".repeat(w - 1)).join(`${C.textMuted}┼${RESET}${C.textDim}`)}${RESET}`);
    } else {
      lines.push(`  ${cells.join(`${C.textMuted}│${RESET}`)}`);
    }
  });
  return lines.join("\n");
}

function renderMarkdown(text) {
  const W = process.stdout.columns ?? 80;

  let output = text

    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.replace(/\n$/, "").split("\n");
      const codeW = Math.min(W - 4, Math.max(40, ...lines.map(l => visibleWidth(l))) + 4);
      const label = lang ? ` ${lang} ` : "";
      const top    = `${C.textMuted}╭─${label}${"─".repeat(Math.max(0, codeW - visibleWidth(label) - 1))}${RESET}`;
      const bottom = `${C.textMuted}╰${"─".repeat(codeW)}${RESET}`;
      const body = _highlightCode(lines.join("\n"), lang)
        .split("\n").map(l => `${C.textMuted}│${RESET} ${l}`).join("\n");
      return `${top}\n${body}\n${bottom}`;
    })

    .replace(/`([^`]+)`/g, (_, c) => `\x1b[38;2;45;212;191m${c}${RESET}`)

    .replace(/^### (.+)$/gm, (_, t) => `${BOLD}${C.accent}» ${t}${RESET}`)
    .replace(/^## (.+)$/gm,  (_, t) => `${BOLD}${C.accent}${t}${RESET}`)
    .replace(/^# (.+)$/gm,   (_, t) => `${BOLD}${gradient(t)}${RESET}`)

    .replace(/^---+$/gm, () => C.textMuted + "─".repeat(Math.min(W - 2, 50)) + RESET)

    .replace(/\*\*(.+?)\*\*/g, (_, t) => BOLD + t + RESET)
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, (_, t) => ITALIC + t + RESET)

    .replace(/~~(.+?)~~/g, (_, t) => `${C.textMuted}${t}${RESET}`)

    .replace(/^- \[ \] (.+)$/gm, (_, t) => `  ${C.textMuted}○${RESET} ${t}`)
    .replace(/^- \[x\] (.+)$/gm, (_, t) => `  ${C.ok}●${RESET} ${t}`)

    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) =>
      `\x1b]8;;${url}\x07${C.accent}${label}${RESET}\x1b]8;;\x07`)

    .replace(/(?<!\u001b]8;;)(?<!"|')(https?:\/\/[^\s\]\)<]+)/g, (url) =>
      `\x1b]8;;${url}\x07${C.accent}${url}${RESET}\x1b]8;;\x07`)

    .replace(/^> (.+)$/gm, (_, t) => `${C.textMuted}┃${RESET} ${ITALIC}${t}${RESET}`)

    .replace(/^[-*] (.+)$/gm, (_, t) => `  ${C.accent}•${RESET} ${t}`)
    .replace(/^(\d+)\. (.+)$/gm, (_, n, t) => `  ${C.textMuted}${n}.${RESET} ${t}`);

  return output;
}

module.exports = { renderMarkdown, _highlightCode };
