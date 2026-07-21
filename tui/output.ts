"use strict";
import type { Color, Theme } from "./colors.ts";

const { C, T, RESET } = require("./colors.ts") as { C: Color; T: Theme; RESET: string };
const i18n = require("../core/i18n.ts") as { t(en: string, tr: string): string; locTag(): string };

const TOOL_ICONS: [RegExp, string][] = [
  [/^think$/,             "◌"],
  [/^file_outline/,       "◉"],
  [/^read/,               "▤"],
  [/^apply_patch/,        "⊕"],
  [/^insert_at_line/,     "⊞"],
  [/^replace_in_files/,   "↺"],
  [/^write|^edit|multi_edit/, "✎"],
  [/search|grep|ara/,     "⌕"],
  [/command|shell|run/,   "❯"],
  [/^memory|hafiza/,      "◈"],
  [/vault/,               "⬡"],
  [/^mcp__/,              "⧉"],
  [/moltbook|feed/,       "☄"],
  [/list|glob/,           "≡"],
  [/^git_/,               "⎇"],
];

function toolIcon(name: string): string {
  for (const [re, icon] of TOOL_ICONS) if (re.test(name)) return icon;
  return "⚙";
}

function toolArgPreview(input: Record<string, unknown> | null | undefined): string {
  if (!input || typeof input !== "object") return "";
  const primary = (input.path ?? input.file ?? input.pattern ?? input.command
    ?? input.message ?? input.query ?? input.dir ?? input.from
    ?? (Array.isArray(input.paths) ? input.paths.join(" ") : input.paths)
    ?? (typeof input.content === "string" ? input.content.slice(0, 50) : null)) as string | null;
  if (primary != null) return String(primary).slice(0, 60);
  const s = JSON.stringify(input);
  return s === "{}" ? "" : s.slice(0, 60);
}

interface SessionEntry {
  id: string;
  model?: string;
  updatedAt?: string | number;
  msgCount?: number;
  preview?: string;
}

const printObj = {
  tool(name: string, input: Record<string, unknown> | null | undefined): void {
    const arg = toolArgPreview(input);
    const argStr = arg ? ` ${T.muted}"${arg.replace(/"/g, "'")}"${RESET}` : "";
    process.stdout.write(`  ${T.muted}*${RESET} ${T.accent}${name}${RESET}${argStr}\n`);
  },
  result(text: unknown): void {
    const s = String(text).slice(0, 120).replace(/\n/g, " ");
    process.stdout.write(`  ${T.muted}→ ${s}${RESET}\n`);
  },
  diff(diffStr: string | null | undefined, { maxLines = 40 } = {}): void {
    if (!diffStr) return;
    const lines = diffStr.split("\n");
    for (const l of lines.slice(0, maxLines)) {
      if (l.startsWith("+"))       process.stdout.write(`  ${T.ok}${l}${RESET}\n`);
      else if (l.startsWith("-"))  process.stdout.write(`  ${T.err}${l}${RESET}\n`);
      else if (l.startsWith("@@")) process.stdout.write(`  ${T.accent}${l}${RESET}\n`);
      else                         process.stdout.write(`  ${T.muted}${l}${RESET}\n`);
    }
    if (lines.length > maxLines)
      process.stdout.write(`  ${C.muted(`… +${lines.length - maxLines} satır daha`)}\n`);
  },
  error(text: unknown): void  { console.error(`${T.err}✗${RESET} ${text}`); },
  warn(text: unknown): void   { console.error(`${T.warn}!${RESET} ${text}`); },
  info(text: unknown): void   { console.log(C.muted(String(text))); },
  system(text: unknown): void { console.log(`${C.muted("·")} ${C.muted(String(text))}`); },
  sessionList(sessions: SessionEntry[]): void {
    if (!sessions.length) {
      console.log(C.muted(i18n.t("  (no saved sessions)", "  (kayıtlı oturum yok)")));
      return;
    }
    console.log("");
    for (const s of sessions) {
      const _locTag = i18n.locTag();
      const date = s.updatedAt ? new Date(s.updatedAt).toLocaleString(_locTag) : "?";
      const msgs = `${s.msgCount ?? 0} msg`;
      console.log(`  ${C.cyan(s.id)}  ${C.muted(s.model ?? "")}  ${C.dim(msgs)}  ${C.muted(date)}`);
      if (s.preview) console.log(`       ${C.muted(s.preview)}`);
    }
    console.log("");
  },
};

module.exports = { print: printObj, toolIcon };
