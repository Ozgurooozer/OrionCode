// beta2-test.ts — beta2 TUI görsel testi
// node --experimental-strip-types tui/beta2/beta2-test.ts
"use strict";

const {
  C, gradient, multiGradient, RESET, BOLD, DIM,
  rgb, rgbBg, PROVIDER_COLORS, BOX,
  cursor, erase, screen, osc,
  getTermCols, getTermRows, getLayout,
  spinStart, spinStop, spinStopAll,
  renderChatMessage, renderToolCall, renderTurnSeparator,
  renderMarkdown, displayWithPager,
  renderBandHeader, inputBoxTop,
  finishUserTurn, makeInputPrompt,
  emblem, createLanding,
} = require("./src/index.ts");

/** @param {number} ms */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const cols = getTermCols();

  // ── 0. Landing Page Animation (3s) ──────────────────────────────────────
  const landing = createLanding();
  await landing.play({ model: "claude-sonnet-4-6", backend: "anthropic" });

  // ── 1. Orion Emblem ──────────────────────────────────────────────────────
  console.log("\n" + emblem("claude-sonnet-4-6", "anthropic") + "\n");
  console.log(C.textMuted + "═".repeat(Math.min(cols, 60)) + RESET);

  // ── 2. Color palette showcase ────────────────────────────────────────────
  console.log("\n" + BOLD + "Orion Night Palette" + RESET + "\n");

  /** @type {[string, string, () => string][]} */
  const swatches = [
    ["void",   "#07090f", () => rgbBg(7, 9, 15)],
    ["surface","#0f111a", () => rgbBg(15, 17, 26)],
    ["panel",  "#161b22", () => rgbBg(22, 27, 34)],
    ["dust",   "#1a1e2e", () => rgbBg(26, 30, 46)],
    ["rim",    "#1e293b", () => rgb(30, 41, 59)],
  ];
  for (const [name, hex, bg] of swatches) {
    process.stdout.write(`  ${bg()}      ${RESET} ${C.textDim}${name}${RESET} ${C.textMuted}${hex}${RESET}\n`);
  }
  console.log();

  /** @type {[string, string, () => string][]} */
  const textSwatches = [
    ["primary", "#e2e8f0", () => rgb(226, 232, 240)],
    ["soft",    "#cbd5e1", () => rgb(203, 213, 225)],
    ["dim",     "#94a3b8", () => rgb(148, 163, 184)],
    ["muted",   "#64748b", () => rgb(100, 116, 139)],
  ];
  for (const [name, hex, fg] of textSwatches) {
    console.log(`  ${fg()}The quick brown fox jumps over the lazy dog${RESET} ${C.textMuted}${name} ${hex}${RESET}`);
  }

  /** @type {[string, string, () => string][]} */
  const accentSwatches = [
    ["accent",  "#818cf8", () => rgb(129, 140, 248)],
    ["teal",    "#2dd4bf", () => rgb(45, 212, 191)],
    ["purple",  "#a78bfa", () => rgb(167, 139, 250)],
    ["ok",      "#4ade80", () => rgb(74, 222, 128)],
    ["err",     "#f87171", () => rgb(248, 113, 113)],
    ["warn",    "#fbbf24", () => rgb(251, 191, 36)],
    ["info",    "#60a5fa", () => rgb(96, 165, 250)],
  ];
  console.log();
  for (const [name, hex, fg] of accentSwatches) {
    console.log(`  ${BOLD}${fg()}${"✦"} ${name}${RESET} ${C.textMuted}${hex}${RESET}`);
  }

  // ── 3. Gradient showcase ─────────────────────────────────────────────────
  console.log("\n" + BOLD + "Gradyanlar" + RESET);
  console.log(`  ${gradient("Orion Aethelred — Kodlama Ajanı")}`);
  console.log(`  ${gradient("NEBULA SWEEP", [45, 212, 191], [167, 139, 250])}`);
  console.log(`  ${multiGradient("AETHER DRIFT", [
    { pos: 0, r: 129, g: 140, b: 248 },
    { pos: 0.5, r: 45, g: 212, b: 191 },
    { pos: 1, r: 167, g: 139, b: 250 },
  ])}`);

  // ── 4. Provider colors ───────────────────────────────────────────────────
  console.log("\n" + BOLD + "Provider Renkleri" + RESET);
  for (const [name, colors] of /** @type {[string, {fg:string, bg:string}][]} */ (Object.entries(PROVIDER_COLORS))) {
    console.log(`  ${colors.fg}${BOLD}${name}${RESET}`);
  }

  // ── 5. Markdown rendering ────────────────────────────────────────────────
  console.log("\n" + BOLD + "Markdown Renderer" + RESET + "\n");

  const md = `# Başlık 1

## Başlık 2

### Başlık 3

Normal metin, **bold**, *italic*, ~~strikethrough~~, \`inline code\`

- Madde 1
- Madde 2
  - Alt madde

1. Sıralı 1
2. Sıralı 2

> Bu bir alıntı satırıdır

\`\`\`javascript
function hello(name) {
  const msg = \`Merhaba, \${name}!\`;
  console.log(msg);
  return msg;
}
\`\`\`

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
\`\`\`

\`\`\`diff
+ yeni satır
- silinen satır
@@ context @@
\`\`\`

- [ ] yapılacak iş
- [x] tamamlanan iş

OSC 8 link: [GitHub](https://github.com)

---

https://example.com (auto-link)
`;

  console.log(renderMarkdown(md));

  // ── 6. Chat bubbles ──────────────────────────────────────────────────────
  console.log("\n" + BOLD + "Chat Bubbles" + RESET + "\n");

  const userMsg = renderChatMessage({
    role: "user",
    content: "Merhaba Orion! Bana modern bir terminal arayüzü yapabilir misin?",
    name: "ozyn",
    timestamp: new Date(),
  });
  console.log(userMsg);

  await sleep(500);

  const aiMsg = renderChatMessage({
    role: "assistant",
    content: "Merhaba **ozyn**! Elbette yapabilirim.\n\nİşte planladığım özellikler:\n\n1. **Orion Night** renk paleti — derin uzay temalı\n2. Gradyan logolar ve aksanlar\n3. Provider renk kodlaması\n4. Gelişmiş **Markdown** render (tablo, checkbox, strikethrough)\n5. Toast bildirim sistemi\n\nHemen başlayalım!",
    model: "claude-sonnet-4-6",
    backend: "anthropic",
    timestamp: new Date(),
    turnInfo: "[1/5]",
  });
  console.log(aiMsg);

  // ── 7. Tool call display ─────────────────────────────────────────────────
  console.log("\n" + BOLD + "Tool Calls" + RESET);
  console.log(renderToolCall("read_file", { path: "src/main.ts" }));
  console.log(renderToolCall("edit_file", { file: "src/index.ts", content: "..." }));
  console.log(renderToolCall("search", { pattern: "function.*hello", dir: "./src" }));

  // ── 8. Turn separator ────────────────────────────────────────────────────
  console.log("\n" + BOLD + "Turn Separator" + RESET);
  console.log(renderTurnSeparator("agent", "anthropic", "[3/40]"));

  // ── 9. Band header & input bar ───────────────────────────────────────────
  console.log("\n" + BOLD + "Input Bar" + RESET);
  console.log(inputBoxTop("claude-sonnet-4-6 · anthropic"));
  console.log(`  ${C.textDim}►${RESET} ${C.textMuted}mesaj yaz · komutlar için /${RESET}`);

  // ── 10. Spinner ─────────────────────────────────────────────────────────
  console.log("\n" + BOLD + "Spinner Demo (3s)" + RESET + "\n");
  spinStart("test1", "AI düşünüyor...");
  spinStart("test2", "vault taranıyor...");
  await sleep(3000);
  spinStop("test1", "AI yanıt hazır");
  await sleep(500);
  spinStop("test2", "vault taraması tamam");
  spinStopAll();

  // ── 11. Box drawing ──────────────────────────────────────────────────────
  console.log("\n" + BOLD + "Box Drawing" + RESET);
  console.log(`  ${C.textMuted}${BOX.light.tl}${BOX.light.h.repeat(20)}${BOX.light.tr}${RESET}`);
  console.log(`  ${C.textMuted}${BOX.light.v}${RESET}${" ".repeat(20)}${C.textMuted}${BOX.light.v}${RESET}`);
  console.log(`  ${C.textMuted}${BOX.light.bl}${BOX.light.h.repeat(20)}${BOX.light.br}${RESET}`);

  console.log(`\n  ${C.textMuted}${BOX.double.tl}${BOX.double.h.repeat(30)}${BOX.double.tr}${RESET}`);
  console.log(`  ${C.textMuted}${BOX.double.v}${RESET}${C.accent}${BOLD}  ORION AETHELRED  ${RESET}${" ".repeat(8)}${C.textMuted}${BOX.double.v}${RESET}`);
  console.log(`  ${C.textMuted}${BOX.double.bl}${BOX.double.h.repeat(30)}${BOX.double.br}${RESET}`);

  // ── 12. OSC 8 hyperlink ─────────────────────────────────────────────────
  console.log("\n" + BOLD + "OSC 8 Hyperlink" + RESET);
  console.log(`  ${osc.hyperlink("https://github.com", "GitHub'da aç →")}`);

  // ── 13. Fade-out finish ─────────────────────────────────────────────────
  console.log("\n" + C.ok + BOLD + " BETA2 TUI TEST COMPLETE" + RESET);
  console.log(C.textMuted + "  All components verified successfully." + RESET + "\n");
}

main().catch(e => {
  console.error("Test error:", e);
  process.exit(1);
});
