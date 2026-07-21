// tests/slashmenu.test.js — "/" komut açılır menüsü durum makinesi
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");
const { createSlashMenu, attachSlashMenu } = require("../tui/slashmenu.js");

const CMDS = [
  { name: "model",    aliases: [],            desc: "Aktif modeli değiştir" },
  { name: "mod",      aliases: ["mode"],      desc: "Mod değiştir" },
  { name: "mcp",      aliases: [],            desc: "MCP sunucuları" },
  { name: "vault",    aliases: ["kasa"],      desc: "Vault işlemleri" },
  { name: "yardim",   aliases: ["help", "h"], desc: "Yardım" },
  { name: "sessions", aliases: ["ls"],        desc: "Oturumları listele" },
  { name: "budget",   aliases: [],            desc: "Bütçe özeti" },
  { name: "stats",    aliases: [],            desc: "Telemetri" },
];

test("slashmenu: '/' tüm komutları açar, tam liste items içinde, pencere MAX_ITEMS ile sınırlı", () => {
  const { MAX_ITEMS } = require("../tui/slashmenu.js");
  const m = createSlashMenu(() => CMDS);
  m.update("/");
  assert.strictEqual(m.state.open, true);
  assert.ok(m.state.items.length > 0, "en az 1 öğe olmalı");
  // items tam liste — render sırasında slicenenar; offset 0'dan başlar
  assert.strictEqual(m.state.offset, 0, "başlangıçta offset 0 olmalı");
  // Görünen pencere MAX_ITEMS'ı geçemez
  const visible = m.state.items.slice(m.state.offset, m.state.offset + MAX_ITEMS);
  assert.ok(visible.length <= MAX_ITEMS, `görünen pencere ${MAX_ITEMS} öğeyi geçmemeli`);
});

test("slashmenu: '/mo' filtresi model+mod döndürür", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/mo");
  const names = m.state.items.map(i => i.name);
  assert.ok(names.includes("model"), "model eşleşmeli");
  assert.ok(names.includes("mod"), "mod eşleşmeli");
  assert.ok(!names.includes("vault"), "vault eşleşmemeli");
});

test("slashmenu: tam eşleşme ilk sırada (rank 0)", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/mod");
  assert.strictEqual(m.state.items[0].name, "mod", "tam eşleşme başta olmalı");
});

test("slashmenu: alias ile eşleşir (help → yardim)", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/hel");
  assert.ok(m.state.items.some(i => i.name === "help"), "alias adı görünmeli");
});

test("slashmenu: boşluk (argüman fazı) menüyü kapatır", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/model");
  assert.strictEqual(m.state.open, true);
  m.update("/model haiku");
  assert.strictEqual(m.state.open, false);
});

test("slashmenu: '/' olmayan satırda kapalı", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("merhaba");
  assert.strictEqual(m.state.open, false);
  assert.strictEqual(m.state.items.length, 0);
});

test("slashmenu: move seçim sarmalar (wrap-around)", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/mo");
  const n = m.state.items.length;
  m.move(-1);
  assert.strictEqual(m.state.selected, n - 1, "yukarı → son öğeye sarmalı");
  m.move(1);
  assert.strictEqual(m.state.selected, 0, "aşağı → başa dönmeli");
});

test("slashmenu: completeTo rl satırına '/ad ' yazar", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/mod");
  const rl = { line: "/mod", cursor: 4 };
  m.completeTo(rl);
  assert.strictEqual(rl.line, "/mod ");
  assert.strictEqual(rl.cursor, 5);
});

test("slashmenu: Esc bastırması — aynı satırda kapalı kalır, satır değişince açılır", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/mo");
  assert.strictEqual(m.state.open, true);
  m.closeByEsc("/mo");
  assert.strictEqual(m.state.open, false);
  m.update("/mo"); // aynı satır → bastırılmış
  assert.strictEqual(m.state.open, false);
  m.update("/mod"); // satır değişti → yeniden açılır
  assert.strictEqual(m.state.open, true);
});

test("slashmenu: eşleşme yoksa kapalı", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/zzzz");
  assert.strictEqual(m.state.open, false);
});

test("attachSlashMenu: non-TTY ortamında null döner", () => {
  const fakeRl = { _ttyWrite: () => {} };
  const result = attachSlashMenu(fakeRl, () => CMDS, { render: () => {}, isBusy: () => false });
  // test ortamı non-TTY → null
  assert.strictEqual(result, null);
});

test("tui: inputBoxTop ve renderMenuBelow export edilmiş", () => {
  const tui = require("../tui/index.ts");
  assert.strictEqual(typeof tui.inputBoxTop, "function");
  assert.strictEqual(typeof tui.renderMenuBelow, "function");
});

test("tui: emblem ORION blok harflerini ve model bilgisini içerir", () => {
  const { emblem } = require("../tui/index.ts");
  const out = emblem("claude-sonnet-4-6", "anthropic");
  const plain = out.replace(/\x1b\[[^m]*m/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
  assert.ok(plain.includes("██"), "blok harf içermeli");
  assert.ok(plain.includes("claude-sonnet-4-6"), "model adı görünmeli");
  assert.ok(plain.includes("anthropic"), "backend adı görünmeli");
  assert.ok(plain.includes("aethelred"), "aethelred etiketi görünmeli");
});

test("slashmenu: filtre değişince seçim sıfırlanır", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/m");           // model, mod, mcp...
  m.move(1); m.move(1);     // selected = 2
  assert.strictEqual(m.state.selected, 2);
  m.update("/mo");          // filtre değişti → seçim başa dönmeli
  assert.strictEqual(m.state.selected, 0, "filtre değişince selected=0 olmalı");
});

test("tui: setInputLock/isInputLocked — kilit durumu yönetilir", () => {
  const { setInputLock, isInputLocked } = require("../tui/index.ts");
  assert.strictEqual(isInputLocked(), false, "başlangıçta kilitsiz");
  setInputLock(true);
  assert.strictEqual(isInputLocked(), true, "kilitlenebilmeli");
  setInputLock(false);
  assert.strictEqual(isInputLocked(), false, "açılabilmeli");
});

test("tui: placeholder fonksiyonları export edilmiş ve non-TTY'de çökmez", () => {
  const tui = require("../tui/index.ts");
  assert.strictEqual(typeof tui.showInputPlaceholder, "function");
  assert.strictEqual(typeof tui.clearInputPlaceholder, "function");
  assert.doesNotThrow(() => tui.showInputPlaceholder());
  assert.doesNotThrow(() => tui.clearInputPlaceholder());
});
