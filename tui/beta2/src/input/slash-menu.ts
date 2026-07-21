// input/slash-menu.ts — Command menu v2 with categories
"use strict";

const { RESET, BOLD, DIM, cursor, erase, fitLine, visibleWidth } = require("../core/ansi.ts");
const { C } = require("../core/colors.ts");
const { onKey, offKey } = require("../core/keypress.ts");
const { getTermCols } = require("../core/resize.ts");

const CATEGORY_LABELS = {
  agent: "AGENT", session: "SESSION", system: "SYSTEM",
  knowledge: "KNOWLEDGE", info: "INFO", other: "OTHER",
};
const MAX_VISIBLE = 8;

class SlashMenu {
  constructor() {
    this._commands = [];
    this._active = false;
    this._query = "";
    this._selected = 0;
    this._filtered = [];
    this._offset = 0;
    this._callback = null;
    this._previousLineCount = 0;
    this._activeCategory = "all";
  }

  register(cmd) { this._commands.push(cmd); }
  registerAll(cmds) { for (const c of cmds) this.register(c); }
  setCommands(cmds) { this._commands = cmds; }
  get active() { return this._active; }

  open(callback) {
    this._active = true;
    this._query = "";
    this._selected = 0;
    this._offset = 0;
    this._activeCategory = "all";
    this._callback = callback;
    this._filterCommands();
    onKey("slash-menu", (key) => this._handleKey(key), 50);
    this._render();
  }

  close() {
    this._active = false;
    offKey("slash-menu");
    this._clearRender();
    if (this._callback) this._callback("", "");
  }

  filter(query) {
    this._query = query.toLowerCase();
    this._selected = 0;
    this._offset = 0;
    this._filterCommands();
    this._render();
  }

  _filterCommands() {
    let cmds = this._commands;
    if (this._activeCategory !== "all") {
      cmds = cmds.filter(c => (c.category ?? "other") === this._activeCategory);
    }
    if (this._query) {
      const q = this._query;
      cmds = cmds.filter(c => {
        const names = [c.name, ...(c.aliases ?? [])];
        return names.some(n => n.includes(q));
      });
    }
    this._filtered = cmds;
  }

  _handleKey(key) {
    const total = this._filtered.length;
    if (total === 0 && key.name === "escape") { this.close(); return true; }

    switch (key.name) {
      case "down":
      case "tab":
        this._selected = (this._selected + 1) % Math.max(1, total);
        this._adjustOffset();
        this._render();
        return true;
      case "up":
        this._selected = (this._selected - 1 + Math.max(1, total)) % Math.max(1, total);
        this._adjustOffset();
        this._render();
        return true;
      case "enter":
      case "return":
        if (this._filtered[this._selected] && this._callback) {
          const cmd = this._filtered[this._selected];
          this._active = false;
          offKey("slash-menu");
          this._clearRender();
          this._callback(cmd.name, "");
        }
        return true;
      case "escape":
        this.close();
        return true;
    }
    return false;
  }

  _adjustOffset() {
    if (this._selected < this._offset) this._offset = this._selected;
    if (this._selected >= this._offset + MAX_VISIBLE)
      this._offset = this._selected - MAX_VISIBLE + 1;
  }

  _categories() {
    const cats = new Set(this._commands.map(c => c.category ?? "other"));
    return ["all", ...cats];
  }

  _render() {
    const W = getTermCols();
    const items = this._filtered.slice(this._offset, this._offset + MAX_VISIBLE);
    const total = this._filtered.length;
    const lines = [];

    const cats = this._categories();
    const tabLine = cats.map(cat =>
      cat === this._activeCategory
        ? ` ${C.accent}${BOLD}${(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}${RESET} `
        : ` ${C.textMuted}${(CATEGORY_LABELS[cat] ?? cat).toUpperCase()}${RESET} `
    ).join(`${C.textMuted}│${RESET}`);
    lines.push(`  ${C.teal}✦${RESET} ${BOLD}commands${RESET}  ${C.textMuted}/${this._query}${RESET}`);
    lines.push(`  ${tabLine}`);
    lines.push(`  ${C.textMuted}${"─".repeat(Math.min(W - 4, 50))}${RESET}`);

    for (let i = 0; i < MAX_VISIBLE; i++) {
      const it = items[i];
      if (!it) { lines.push(""); continue; }
      const sel = i === this._selected - this._offset;
      const name = `/${it.name}`;
      const desc = String(it.desc ?? "");
      const maxDesc = W - name.length - 20;
      const truncated = desc.length > maxDesc ? desc.slice(0, maxDesc - 1) + "…" : desc;
      if (sel) {
        const usage = it.usage ? ` ${C.textMuted}${it.usage}${RESET}` : "";
        lines.push(fitLine(`  ${C.accent}▸ ${BOLD}${name}${RESET} ${C.accent}${truncated}${usage}`, W - 1));
      } else {
        lines.push(fitLine(`    ${C.textMuted}${name}${RESET} ${C.textDim}${truncated}`, W - 1));
      }
    }

    if (total > MAX_VISIBLE) {
      const pct = Math.round((this._offset / Math.max(1, total - MAX_VISIBLE)) * 100);
      lines.push(`  ${DIM}${total} commands · ${pct}%${RESET}`);
    }
    lines.push(`  ${DIM}↑↓ navigate · Tab/Enter select · Esc close${RESET}`);

    this._previousLineCount = lines.length;
    process.stdout.write(cursor.up(0) + erase.displayBelow() + lines.join("\r\n") + cursor.up(lines.length));
  }

  _clearRender() {
    if (this._previousLineCount > 0) {
      process.stdout.write(cursor.up(this._previousLineCount) + erase.displayBelow());
      this._previousLineCount = 0;
    }
  }
}

module.exports = { SlashMenu };
