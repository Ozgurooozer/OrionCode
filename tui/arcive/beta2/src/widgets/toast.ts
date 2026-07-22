// widgets/toast.ts — Toast notification system
"use strict";

const { cursor, erase } = require("../core/ansi.ts");
const { getStore } = require("../core/store.ts");

const TOAST_COLORS = {
  info: { fg: "\x1b[38;2;96;165;250m", prefix: "·" },
  ok:   { fg: "\x1b[38;2;74;222;128m", prefix: "✓" },
  warn: { fg: "\x1b[38;2;251;191;36m", prefix: "!" },
  err:  { fg: "\x1b[38;2;248;113;113m", prefix: "✗" },
};

let _previousToastCount = 0;

function renderToasts() {
  const store = getStore();
  const toasts = store.getActiveToasts();
  const count = toasts.length;

  if (count === _previousToastCount) return;
  _previousToastCount = count;

  if (count === 0) {
    process.stdout.write(cursor.up(1) + erase.displayBelow());
    return;
  }

  const W = process.stdout.columns ?? 80;
  const lines = toasts.map(t => {
    const c = TOAST_COLORS[t.type] ?? TOAST_COLORS.info;
    const icon = `${c.fg}${c.prefix}\x1b[0m`;
    const maxText = W - 6;
    const text = t.text.length > maxText ? t.text.slice(0, maxText - 1) + "…" : t.text;
    return `  ${icon} ${text}`;
  });

  process.stdout.write(
    cursor.up(count) + erase.displayBelow() +
    lines.join("\r\n") + "\r\n"
  );
}

function initToastRenderer() {
  const store = getStore();
  store.on("toast:push", () => renderToasts());
  store.on("toast:dismiss", () => renderToasts());
  store.on("toast:dismiss-all", () => renderToasts());
}

module.exports = { renderToasts, initToastRenderer };
