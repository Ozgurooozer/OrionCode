// core/tui/fuzzy-picker.js — Yazarak-filtrele seçici (jcode model picker'ı gibi)
// select-input.js ile aynı akış-tabanlı çizim kuralı: mutlak konum / \x1b[s-u yok,
// blok kendi başına çıkıp üzerine yazar. Fark: burada bir de metin arama kutusu var.
"use strict";

const readline = require("readline");
const { T, C, setInputLock, fitLine } = require("../../tui/index.js");
const { fuzzyScoreTokens, fuzzyMatchPositions } = require("./fuzzy.js");
const i18n  = require("../i18n.js");
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

const MAX_VISIBLE = 10;

// Eşleşen karakterleri vurgula, geri kalanı soluk bırak
function highlight(label, positions, isSelected) {
  const posSet = new Set(positions);
  const base   = isSelected ? T.accent : T.muted;
  let out = "";
  for (let i = 0; i < label.length; i++) {
    out += posSet.has(i) ? `${BOLD}${T.belt}${label[i]}${RESET}${base}` : label[i];
  }
  return `${base}${out}${RESET}`;
}

/**
 * Yazarak-filtrele seçici.
 * @param {string} message
 * @param {Array<{value, label, hint?, search?}>} items — search: label+hint dışında ek arama metni
 * @returns {Promise<string|null>}
 */
function fuzzyPicker(message, items) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return Promise.resolve(null);

  return new Promise(resolve => {
    let query    = "";
    let selected = 0;
    let filtered = items;
    let rendered = 0;

    function refilter() {
      if (!query.trim()) {
        filtered = items;
      } else {
        filtered = items
          .map(it => {
            const haystack = `${it.label} ${it.search ?? it.hint ?? ""}`;
            const score = fuzzyScoreTokens(query, haystack);
            return score === null ? null : { it, score };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .map(x => x.it);
      }
      selected = Math.min(selected, Math.max(0, filtered.length - 1));
    }

    function buildLines() {
      const W = process.stdout.columns ?? 80;
      const lines = [fitLine(`  ${T.accent}?${RESET} ${BOLD}${message}${RESET}  ${query}${DIM}▏${RESET}`, W - 1)];
      const visible = filtered.slice(0, MAX_VISIBLE);
      if (!visible.length) {
        lines.push(fitLine(`    ${DIM}${i18n.t("no matches", "eşleşme yok")}${RESET}`, W - 1));
      }
      for (let i = 0; i < visible.length; i++) {
        const it   = visible[i];
        const pos  = query.trim() ? fuzzyMatchPositions(query, it.label) : [];
        const name = highlight(it.label, pos, i === selected);
        const hint = it.hint ? `  ${DIM}${it.hint}${RESET}` : "";
        lines.push(i === selected
          ? fitLine(`  ${T.accent}▸${RESET} ${name}${hint}`, W - 1)
          : fitLine(`    ${name}${hint}`, W - 1));
      }
      if (filtered.length > MAX_VISIBLE) {
        lines.push(fitLine(`    ${DIM}${i18n.t(`+${filtered.length - MAX_VISIBLE} more — keep typing to narrow`, `+${filtered.length - MAX_VISIBLE} daha — daraltmak için yazmaya devam et`)}${RESET}`, W - 1));
      }
      lines.push(fitLine(`  ${DIM}${i18n.t("type to search · ↑↓ select · Enter confirm · Esc cancel", "aramak için yaz · ↑↓ seç · Enter onayla · Esc iptal")}${RESET}`, W - 1));
      return lines;
    }

    function draw() {
      const lines = buildLines();
      let out = "\x1b[?25l\r";
      if (rendered > 0) out += `\x1b[${rendered}A`;
      out += lines.map(l => `\x1b[2K${l}`).join("\r\n") + "\r\n";
      rendered = lines.length;
      process.stdout.write(out);
    }

    function collapse(summary) {
      const W = process.stdout.columns ?? 80;
      process.stdout.write(`\r\x1b[${rendered}A\x1b[J${fitLine(summary, W - 1)}\r\n\x1b[?25h`);
    }

    setInputLock(true);
    const wasRaw = process.stdin.isRaw ?? false;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    refilter();
    draw();

    function onKey(ch, key) {
      if (!key) return;

      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        collapse(`  ${T.muted}? ${message} — ${i18n.t("cancelled", "iptal edildi")}${RESET}`);
        resolve(null);
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        const it = filtered[selected];
        cleanup();
        collapse(`  ${T.ok}?${RESET} ${message} ${T.accent}${it?.label ?? ""}${RESET}`);
        resolve(it?.value ?? null);
        return;
      }

      if (key.name === "up")   { selected = (selected - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length); draw(); return; }
      if (key.name === "down") { selected = (selected + 1) % Math.max(1, filtered.length); draw(); return; }

      if (key.name === "backspace") {
        if (query.length) { query = query.slice(0, -1); selected = 0; refilter(); draw(); }
        return;
      }

      // Yazdırılabilir karakter → sorguya ekle, yeniden filtrele
      if (ch && !key.ctrl && !key.meta && ch.length === 1 && ch >= " ") {
        query += ch;
        selected = 0;
        refilter();
        draw();
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      setInputLock(false);
    }

    process.stdin.on("keypress", onKey);
  });
}

module.exports = { fuzzyPicker };
