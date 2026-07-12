// tests/tui.test.js — TUI chat arayüzü: turn header fonksiyonları
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: userTurnHeader stdout'a yazar, ANSI renk içerir ─────────────────
test("userTurnHeader: stdout'a ozyn + timestamp içeren satır yazar", () => {
  const { userTurnHeader } = require("../tui/index.js");
  assert.strictEqual(typeof userTurnHeader, "function", "export edilmeli");

  // stdout'u yakala
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    userTurnHeader();
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("");
  assert.ok(out.includes("ozyn"), "ozyn adı çıktıda olmalı");
  assert.ok(out.includes("─"), "çizgi karakteri bulunmalı");
  assert.ok(out.startsWith("\n"), "yeni satırla başlamalı");
});

// ── Test 2: aiTurnStart stdout'a yazar, orion + ✦ içerir ─────────────────────
test("aiTurnStart: stdout'a orion ✦ içeren başlık yazar", () => {
  const { aiTurnStart } = require("../tui/index.js");
  assert.strictEqual(typeof aiTurnStart, "function", "export edilmeli");

  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    aiTurnStart("agent", "anthropic");
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("");
  assert.ok(out.includes("orion"), "orion adı çıktıda olmalı");
  assert.ok(out.includes("✦"), "✦ sembolü çıktıda olmalı");
  assert.ok(out.includes("agent"), "mod adı çıktıda olmalı");
  assert.ok(out.includes("anthropic"), "backend adı çıktıda olmalı");
});

// ── Test 3: aiTurnStart mod/backend yoksa çökmez ─────────────────────────────
test("aiTurnStart: undefined argümanlarla çökmez", () => {
  const { aiTurnStart } = require("../tui/index.js");
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try {
    assert.doesNotThrow(() => aiTurnStart(undefined, undefined));
    assert.doesNotThrow(() => aiTurnStart(null, null));
  } finally {
    process.stdout.write = orig;
  }
});

// ── Test 4: aiTurnContinue stdout'a subtil bağlayıcı yazar ──────────────────
test("aiTurnContinue: stdout'a ··· içeren satır yazar", () => {
  const { aiTurnContinue } = require("../tui/index.js");
  assert.strictEqual(typeof aiTurnContinue, "function", "export edilmeli");

  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    aiTurnContinue();
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("");
  assert.ok(out.includes("···"), "··· devam göstergesi bulunmalı");
});

// ── Test 5: print.tool stdout'a yazar (stderr değil) ─────────────────────────
test("print.tool: stdout'a yazar (araç adı + ikon içerir)", () => {
  const { print } = require("../tui/index.js");

  const stdoutChunks = [];
  const stderrChunks = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (s) => { stdoutChunks.push(s); return true; };
  process.stderr.write = (s) => { stderrChunks.push(s); return true; };
  try {
    print.tool("read_file", { path: "/test.js" });
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }

  const out = stdoutChunks.join("");
  assert.ok(out.includes("read_file"), "araç adı stdout'ta olmalı");
  assert.ok(out.includes("/test.js"), "argüman stdout'ta olmalı");
  assert.strictEqual(stderrChunks.length, 0, "stderr'e hiçbir şey yazılmamalı");
});

// ── Test 6: print.result stdout'a yazar (stderr değil) ───────────────────────
test("print.result: stdout'a → önekiyle yazar", () => {
  const { print } = require("../tui/index.js");

  const stdoutChunks = [];
  const stderrChunks = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (s) => { stdoutChunks.push(s); return true; };
  process.stderr.write = (s) => { stderrChunks.push(s); return true; };
  try {
    print.result("sonuç metni");
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }

  const out = stdoutChunks.join("");
  assert.ok(out.includes("→"), "→ öneki bulunmalı");
  assert.ok(out.includes("sonuç"), "kısa sonuç gösterilmeli");
  assert.strictEqual(stderrChunks.length, 0, "stderr'e hiçbir şey yazılmamalı");
});

// ── Test 7: makeInputPrompt readline \x01/\x02 wrapper içerir ────────────────
test("makeInputPrompt: readline genişlik wrapper'ı içerir, görünür karakter bulunur", () => {
  const { makeInputPrompt } = require("../tui/index.js");
  assert.strictEqual(typeof makeInputPrompt, "function", "export edilmeli");
  const prompt = makeInputPrompt();
  assert.ok(prompt.includes("│"), "│ sol kenarlık bulunmalı");
  assert.ok(prompt.includes("►"), "► ok sembolü bulunmalı");
  assert.ok(prompt.includes("\x01"), "\\x01 readline wrapper içermeli");
  assert.ok(prompt.includes("\x02"), "\\x02 readline wrapper içermeli");
});

// ── Test 8: inputBoxBottom stdout'a ╰...╯ kenarlığı yazar ────────────────────
test("inputBoxBottom: stdout'a ╰ + ─ + ╯ alt kenarlık yazar", () => {
  const { inputBoxBottom } = require("../tui/index.js");
  assert.strictEqual(typeof inputBoxBottom, "function", "export edilmeli");

  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    inputBoxBottom();
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("");
  assert.ok(out.includes("╰"), "sol alt köşe bulunmalı");
  assert.ok(out.includes("╯"), "sağ alt köşe bulunmalı");
  assert.ok(out.includes("─"), "yatay çizgi bulunmalı");
});

// ── Test 9: userTurnHeader ╭ üst kenarlık içerir ─────────────────────────────
test("userTurnHeader: stdout'a ╭ + ╮ üst kenarlık yazar", () => {
  const { userTurnHeader } = require("../tui/index.js");

  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    userTurnHeader();
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("");
  assert.ok(out.includes("╭"), "sol üst köşe bulunmalı");
  assert.ok(out.includes("╮"), "sağ üst köşe bulunmalı");
  assert.ok(out.includes("ozyn"), "ozyn etiketi bulunmalı");
});

// ── Test 10b: akış modeli fonksiyonları export edilmiş ───────────────────────
test("akış modeli fonksiyonları export edilmiş", () => {
  const mod = require("../tui/index.js");
  assert.strictEqual(typeof mod.inputBoxTop, "function");
  assert.strictEqual(typeof mod.renderMenuBelow, "function");
  assert.strictEqual(typeof mod.clearMenuBelow, "function");
  assert.strictEqual(typeof mod.fitLine, "function");
});

// non-TTY'de renderMenuBelow/clearMenuBelow stdout'a hiçbir şey yazmaz
test("renderMenuBelow/clearMenuBelow: non-TTY ortamında stdout'a yazmaz", () => {
  const { renderMenuBelow, clearMenuBelow } = require("../tui/index.js");
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    renderMenuBelow(null, { items: [{ name: "model", desc: "test" }], selected: 0 });
    clearMenuBelow(null);
  } finally { process.stdout.write = orig; }
  assert.strictEqual(chunks.length, 0, "non-TTY'de stdout'a yazılmamalı");
});

// inputBoxTop üst kenarlık çizer (╭ + ╮ + ozyn + info)
test("inputBoxTop: üst kenarlık + info yazar", () => {
  const { inputBoxTop } = require("../tui/index.js");
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try { inputBoxTop("sonnet · agent"); } finally { process.stdout.write = orig; }
  const out = chunks.join("");
  assert.ok(out.includes("╭"), "sol üst köşe bulunmalı");
  assert.ok(out.includes("╮"), "sağ üst köşe bulunmalı");
  assert.ok(out.includes("ozyn"), "ozyn etiketi bulunmalı");
  assert.ok(out.includes("sonnet"), "info metni bulunmalı");
});

// fitLine: ANSI kodları genişlik hesabına girmez, görünür kısım kırpılır
test("fitLine: ANSI'yi sayma, görünür genişliğe kırp", () => {
  const { fitLine } = require("../tui/index.js");
  const colored = "\x1b[36mabcdef\x1b[0m";
  const out = fitLine(colored, 3);
  const plain = out.replace(/\x1b\[[^m]*m/g, "");
  assert.strictEqual(plain, "abc", "görünür 3 karaktere kırpılmalı");
  assert.ok(out.includes("\x1b[36m"), "renk kodu korunmalı");
});

// ── Test 10: print.tool * formatında yazar ───────────────────────────────────
test("print.tool: * ToolName format kullanır", () => {
  const { print } = require("../tui/index.js");

  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => { chunks.push(s); return true; };
  try {
    print.tool("read_file", { path: "/foo.js" });
  } finally {
    process.stdout.write = orig;
  }

  const out = chunks.join("").replace(/\x1b\[[^m]*m/g, ""); // ANSI soy
  assert.ok(out.includes("*"), "* bullet bulunmalı");
  assert.ok(out.includes("read_file"), "araç adı bulunmalı");
  assert.ok(out.includes("foo.js"), "argüman bulunmalı");
});
