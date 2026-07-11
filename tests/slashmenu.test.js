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

test("slashmenu: '/' tüm komutları açar, en fazla 6 öğe", () => {
  const m = createSlashMenu(() => CMDS);
  m.update("/");
  assert.strictEqual(m.state.open, true);
  assert.ok(m.state.items.length <= 6, "6 öğe sınırı aşılmamalı");
  assert.ok(m.state.items.length > 0);
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

test("tui: stickyPanel ve userEchoLine export edilmiş", () => {
  const tui = require("../tui/index.js");
  assert.strictEqual(typeof tui.stickyPanel, "function");
  assert.strictEqual(typeof tui.userEchoLine, "function");
});

test("tui: emblem ORION blok harflerini ve model bilgisini içerir", () => {
  const { emblem } = require("../tui/index.js");
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
  const { setInputLock, isInputLocked } = require("../tui/index.js");
  assert.strictEqual(isInputLocked(), false, "başlangıçta kilitsiz");
  setInputLock(true);
  assert.strictEqual(isInputLocked(), true, "kilitlenebilmeli");
  setInputLock(false);
  assert.strictEqual(isInputLocked(), false, "açılabilmeli");
});

test("tui: repaintPanelBottom ve placeholder fonksiyonları export edilmiş", () => {
  const tui = require("../tui/index.js");
  assert.strictEqual(typeof tui.repaintPanelBottom, "function");
  assert.strictEqual(typeof tui.showInputPlaceholder, "function");
  assert.strictEqual(typeof tui.clearInputPlaceholder, "function");
  // non-TTY'de hiçbiri çökmez
  assert.doesNotThrow(() => tui.repaintPanelBottom());
  assert.doesNotThrow(() => tui.showInputPlaceholder());
  assert.doesNotThrow(() => tui.clearInputPlaceholder());
});

test("tui: userEchoLine kutu orta satırı yazar (│ + ►)", () => {
  const { userEchoLine } = require("../tui/index.js");
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try { userEchoLine("test mesajı"); } finally { process.stdout.write = orig; }
  const out = chunks.join("");
  assert.ok(out.includes("│"), "sol kenarlık bulunmalı");
  assert.ok(out.includes("►"), "ok sembolü bulunmalı");
  assert.ok(out.includes("test mesajı"), "mesaj metni bulunmalı");
});
