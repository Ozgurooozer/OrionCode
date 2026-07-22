// output/pager.ts — Scrollable pager widget
"use strict";

const { RESET, BOLD, DIM, cursor, erase, fitLine } = require("../core/ansi.ts");
const { C } = require("../core/colors.ts");
const { onKey, offKey, rawModePush, rawModePop } = require("../core/keypress.ts");
const { getTermCols, getTermRows } = require("../core/resize.ts");

class Pager {
  constructor(lines, title = "output") {
    this._lines = lines;
    this._title = title;
    this._top = 0;
    this._height = Math.min(getTermRows() - 3, 20);
    this._active = false;
    this._resolve = null;
  }

  get active() { return this._active; }

  async open() {
    this._active = true;
    this._top = 0;
    rawModePush();
    onKey(`pager_${this._title}`, (key) => this._handleKey(key), 100);
    this._render();
    return new Promise(resolve => { this._resolve = resolve; });
  }

  close() {
    if (!this._active) return;
    this._active = false;
    offKey(`pager_${this._title}`);
    rawModePop();
    const h = Math.min(this._height + 3, this._lines.length + 3);
    process.stdout.write(cursor.up(h) + erase.displayBelow());
    if (this._resolve) this._resolve();
  }

  _handleKey(key) {
    const H = this._height;
    const total = this._lines.length;
    switch (key.name) {
      case "up":       this._top = Math.max(0, this._top - 1); this._render(); return true;
      case "down":     this._top = Math.min(total - H, this._top + 1); this._render(); return true;
      case "pageup":   this._top = Math.max(0, this._top - H); this._render(); return true;
      case "pagedown": this._top = Math.min(total - H, this._top + H); this._render(); return true;
      case "home":     this._top = 0; this._render(); return true;
      case "end":      this._top = Math.max(0, total - H); this._render(); return true;
      case "q":
      case "escape":
        this.close();
        return true;
    }
    return false;
  }

  _render() {
    const W = getTermCols();
    const H = this._height;
    const total = this._lines.length;
    const visible = this._lines.slice(this._top, this._top + H);

    const lines = [
      `  ${C.accent}▐${RESET} ${BOLD}${this._title}${RESET} ${C.textMuted}(${this._top + 1}–${Math.min(this._top + H, total)} of ${total})${RESET}`,
      `  ${C.textMuted}${"─".repeat(Math.min(W - 4, 50))}${RESET}`,
      ...visible.map(l => `  ${C.textDim}▐${RESET} ${fitLine(l, W - 6)}`),
      `  ${C.textMuted}${"─".repeat(Math.min(W - 4, 50))}${RESET}`,
      `  ${DIM}↑↓ scroll · pgUp/pgDn · q quit${RESET}`,
    ];

    const rendered = lines.join("\r\n");
    process.stdout.write(cursor.up(0) + erase.displayBelow() + rendered + cursor.up(lines.length));
  }
}

async function displayWithPager(lines, title = "output") {
  if (lines.length <= 30) {
    process.stdout.write(lines.join("\n") + "\n");
    return;
  }
  const pager = new Pager(lines, title);
  await pager.open();
}

module.exports = { Pager, displayWithPager };
