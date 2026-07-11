// tui/slashmenu.js — "/" komut açılır menüsü
// "/" yazılınca komut listesi canlı açılır: ↑↓ gezinme, Tab/Enter tamamlama, Esc kapatma.
// readline'ın _ttyWrite'ı sarmalanır; menü kapalıyken tuşlar aynen geçer.
"use strict";

const MAX_ITEMS = 6;

/**
 * Menü durum makinesi.
 * @param {() => Array<{name, aliases?, desc?, usage?}>} getCommands
 */
function createSlashMenu(getCommands) {
  const state = { open: false, items: [], selected: 0 };
  let suppressedFor = null; // Esc ile kapatıldığında hangi satır için bastırıldı
  let lastPartial   = null; // filtre değişince seçim sıfırlanır

  // rl.line'a göre menüyü güncelle — durum değiştiyse true döner
  function update(line) {
    const wasOpen = state.open;

    // "/" ile başlamıyor ya da argüman fazı (boşluk var) → kapat
    if (!line.startsWith("/") || line.includes(" ") || line === suppressedFor) {
      state.open = false; state.items = []; state.selected = 0;
      lastPartial = null;
      if (line !== suppressedFor) suppressedFor = null;
      return wasOpen;
    }
    suppressedFor = null;

    const partial = line.slice(1).toLowerCase();
    // Filtre değişti → seçim başa döner (eski index yeni listede yanlış öğeyi gösterir)
    if (partial !== lastPartial) state.selected = 0;
    lastPartial = partial;
    const seen  = new Set();
    const items = [];
    for (const c of getCommands()) {
      if (seen.has(c.name)) continue;
      const names = [c.name, ...(c.aliases ?? [])];
      const hit = names.find(n => n.toLowerCase().startsWith(partial));
      if (!hit) continue;
      seen.add(c.name);
      items.push({
        name:  hit,                       // eşleşen ad (alias olabilir)
        rank:  hit.toLowerCase() === partial ? 0 : hit === c.name ? 1 : 2,
        desc:  c.desc ?? "",
        usage: c.usage ?? "",
      });
    }
    items.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

    state.items    = items.slice(0, MAX_ITEMS);
    state.selected = Math.min(state.selected, Math.max(0, state.items.length - 1));
    state.open     = state.items.length > 0;
    return state.open || wasOpen;
  }

  function move(delta) {
    if (!state.items.length) return;
    state.selected = (state.selected + delta + state.items.length) % state.items.length;
  }

  // Seçili komutu rl satırına yaz (trailing boşluk → argüman fazına geçer, menü kapanır)
  function completeTo(rl) {
    const it = state.items[state.selected];
    if (!it) return;
    const t = `/${it.name} `;
    rl.line   = t;
    rl.cursor = t.length;
  }

  function closeByEsc(line) {
    suppressedFor = line;
    state.open = false; state.items = []; state.selected = 0;
  }

  return { state, update, move, completeTo, closeByEsc };
}

/**
 * Menüyü readline'a bağla. Non-TTY'de no-op.
 * @param {readline.Interface} rl
 * @param {() => Array} getCommands
 * @param {{ render: (state) => void, isBusy: () => boolean }} hooks
 */
function attachSlashMenu(rl, getCommands, { render, isBusy, beforeKey }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;
  const { isInputLocked } = require("./index.js");
  const menu = createSlashMenu(getCommands);

  const doRender = () => { if (!isBusy()) render(menu.state); };

  const orig = rl._ttyWrite.bind(rl);
  rl._ttyWrite = (s, key = {}) => {
    // Alt istem (select/masked input) aktif — readline tuşları işlemesin
    if (isInputLocked()) return;
    beforeKey?.(key);
    if (menu.state.open) {
      if (key.name === "up")     { menu.move(-1); doRender(); return; }
      if (key.name === "down")   { menu.move(1);  doRender(); return; }
      if (key.name === "tab" && !key.shift) {
        menu.completeTo(rl);
        menu.update(rl.line);
        doRender();
        return;
      }
      if (key.name === "escape") { menu.closeByEsc(rl.line); doRender(); return; }
      if (key.name === "return" || key.name === "enter") {
        menu.completeTo(rl); // seçili komutu satıra yaz, sonra readline submit etsin
      }
    }
    const before = rl.line;
    orig(s, key);
    if (rl.line !== before) {
      const changed = menu.update(rl.line);
      if (changed || menu.state.open) doRender();
    }
  };

  return menu;
}

module.exports = { createSlashMenu, attachSlashMenu };
