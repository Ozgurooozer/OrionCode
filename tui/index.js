// tui/index.js — Orion TUI v3
// Truecolor tema, takımyıldız emblemi, statusline, markdown renderer v2
"use strict";

const i18n = require("../core/i18n.js");

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const ITALIC = "\x1b[3m";

// ── Renk temeli ──────────────────────────────────────────────────────────────
const rgb   = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
const rgbBg = (r, g, b) => `\x1b[48;2;${r};${g};${b}m`;

// Orion teması
const T = {
  star:    rgb(96, 220, 255),   // parlak yıldız — cyan
  nebula:  rgb(167, 139, 250),  // menekşe
  belt:    rgb(255, 224, 130),  // kuşak yıldızları — altın
  accent:  rgb(56, 189, 248),
  ok:      rgb(74, 222, 128),
  warn:    rgb(250, 204, 21),
  err:     rgb(248, 113, 113),
  muted:   rgb(120, 130, 150),
  code:    rgb(125, 211, 252),
  string:  rgb(190, 242, 100),
  keyword: rgb(244, 114, 182),
  comment: rgb(100, 110, 130),
  number:  rgb(251, 191, 36),
};

const C = {
  cyan:    s => `\x1b[36m${s}${RESET}`,
  yellow:  s => `\x1b[33m${s}${RESET}`,
  gray:    s => `\x1b[90m${s}${RESET}`,
  green:   s => `\x1b[32m${s}${RESET}`,
  red:     s => `\x1b[31m${s}${RESET}`,
  blue:    s => `\x1b[34m${s}${RESET}`,
  magenta: s => `\x1b[35m${s}${RESET}`,
  bold:    s => `${BOLD}${s}${RESET}`,
  dim:     s => `${DIM}${s}${RESET}`,
  italic:  s => `${ITALIC}${s}${RESET}`,
  star:    s => `${T.star}${s}${RESET}`,
  nebula:  s => `${T.nebula}${s}${RESET}`,
  belt:    s => `${T.belt}${s}${RESET}`,
  accent:  s => `${T.accent}${s}${RESET}`,
  muted:   s => `${T.muted}${s}${RESET}`,
  modeColor: (mode) => {
    const MAP = { plan: "\x1b[36m", build: "\x1b[32m", chat: "\x1b[90m", agent: "\x1b[33m" };
    return MAP[mode] ?? "\x1b[33m";
  },
};

// Metne cyan→menekşe gradyan uygula
function gradient(text) {
  const from = [96, 220, 255], to = [167, 139, 250];
  const chars = [...text];
  const n = Math.max(chars.length - 1, 1);
  return chars.map((ch, i) => {
    const t = i / n;
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    return `${rgb(r, g, b)}${ch}`;
  }).join("") + RESET;
}

// ── Emblem: ORION wordmark + takımyıldız ─────────────────────────────────────
// ANSI-shadow blok harfler, cyan→menekşe gradyan; sağda Orion takımyıldızı
// (omuzlar, ✶ ✶ ✶ kuşak, ayaklar). Dar terminalde kompakt satıra düşer.
function emblem(model, backend) {
  const cols = process.stdout.columns ?? 80;
  const S = T.star, N = T.nebula, B = T.belt, M = T.muted, R = RESET;
  const info1 = `${M}aethelred — ${i18n.t("coding agent", "kodlama ajanı")}${R}`;
  const info2 = `${T.accent}${model ?? ""}${R}${M}${backend ? ` (${backend})` : ""}${R}`;

  if (cols < 54) {
    // Dar terminal — kompakt başlık
    return [
      ` ${S}✦${R} ${gradient("O  R  I  O  N")} ${N}✧${R}`,
      `   ${info1}`,
      `   ${info2}`,
    ].join("\n");
  }

  const art = [
    " ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗",
    "██╔═══██╗██╔══██╗██║██╔═══██╗████╗  ██║",
    "██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║",
    "██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║",
    "╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║",
    " ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝",
  ];
  const stars = [
    `    ${S}✦${R}     ${M}·${R}`,   // Betelgeuse
    `  ${M}·${R}    ${N}✧${R}`,
    `    ${B}✶ ✶ ✶${R}`,             // kuşak: Alnitak · Alnilam · Mintaka
    `  ${N}✧${R}    ${M}·${R}`,
    `    ${M}·${R}   ${S}✦${R}`,     // Rigel
    "",
  ];
  const lines = art.map((l, i) => ` ${gradient(l)}${stars[i]}`);
  lines.push("");
  lines.push(`   ${info1}`);
  lines.push(`   ${info2}`);
  return lines.join("\n");
}

// ── Markdown renderer v2 ─────────────────────────────────────────────────────
const KEYWORDS = /\b(function|const|let|var|return|if|else|for|while|class|new|async|await|import|export|require|module|try|catch|throw|def|fn|pub|struct|impl|match|use|switch|case|break|continue|typeof|instanceof|null|undefined|true|false|None|True|False)\b/g;

function highlightCode(code, lang = "") {
  if (lang === "diff") {
    return code.split("\n").map(l => {
      if (l.startsWith("+")) return `${T.ok}${l}${RESET}`;
      if (l.startsWith("-")) return `${T.err}${l}${RESET}`;
      if (l.startsWith("@@")) return `${T.accent}${l}${RESET}`;
      return `${T.muted}${l}${RESET}`;
    }).join("\n");
  }
  return code.split("\n").map(line => {
    // Yorum satırı — komple soluk
    const cm = line.match(/^(\s*)(\/\/|#|--)(.*)$/);
    if (cm && !line.trim().startsWith("#!")) return `${T.comment}${line}${RESET}`;
    // Placeholder tabanlı vurgu — renk kodlarının içi tekrar işlenmez
    const slots = [];
    const stash = (color, m) => { slots.push(`${color}${m}\x1b[39m`); return `\x00${slots.length - 1}\x00`; };
    let out = line
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, m => stash(T.string, m))
      .replace(KEYWORDS, m => stash(T.keyword, m))
      .replace(/(?<!\x00)\b(\d+\.?\d*)\b(?!\x00)/g, m => stash(T.number, m));
    out = out.replace(/\x00(\d+)\x00/g, (_, i) => slots[+i]);
    return `${T.code}${out}${RESET}`;
  }).join("\n");
}

function renderMarkdown(text) {
  return text
    // Kod blokları — çerçeve + dil etiketi + vurgu
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.replace(/\n$/, "").split("\n");
      const w = Math.min(76, Math.max(40, ...lines.map(l => l.length)) + 2);
      const label = lang ? ` ${lang} ` : "";
      const top    = C.muted(`╭─${label}${"─".repeat(Math.max(0, w - label.length - 1))}`);
      const bottom = C.muted(`╰${"─".repeat(w)}`);
      const body = highlightCode(lines.join("\n"), lang)
        .split("\n").map(l => `${C.muted("│")} ${l}`).join("\n");
      return `${top}\n${body}\n${bottom}`;
    })
    // Satır içi kod
    .replace(/`([^`]+)`/g, (_, c) => `${T.code}${c}${RESET}`)
    // Başlıklar
    .replace(/^### (.+)$/gm, (_, t) => `${BOLD}${T.accent}» ${t}${RESET}`)
    .replace(/^## (.+)$/gm,  (_, t) => `${BOLD}${T.accent}${t}${RESET}`)
    .replace(/^# (.+)$/gm,   (_, t) => `${BOLD}${gradient(t)}`)
    // Yatay çizgi
    .replace(/^---+$/gm, () => C.muted("─".repeat(50)))
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, (_, t) => C.bold(t))
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, (_, t) => C.italic(t))
    // Link → OSC 8 tıklanabilir
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) =>
      `\x1b]8;;${url}\x07${T.accent}${label}${RESET}\x1b]8;;\x07`)
    // Alıntı
    .replace(/^> (.+)$/gm, (_, t) => `${C.muted("┃")} ${C.italic(t)}`)
    // Liste maddeleri
    .replace(/^[-*] (.+)$/gm, (_, t) => `  ${T.accent}•${RESET} ${t}`)
    .replace(/^(\d+)\. (.+)$/gm, (_, n, t) => `  ${T.muted}${n}.${RESET} ${t}`);
}

// ── Araç görselleştirme ──────────────────────────────────────────────────────
const TOOL_ICONS = [
  [/^read|oku/,        "▤"],
  [/^write|^edit/,     "✎"],
  [/search|grep|ara/,  "⌕"],
  [/command|shell|run/, "❯"],
  [/^memory|hafiza/,   "◈"],
  [/vault/,            "⬡"],
  [/^mcp__/,           "⧉"],
  [/moltbook|feed/,    "☄"],
  [/list/,             "≡"],
];

function toolIcon(name) {
  for (const [re, icon] of TOOL_ICONS) if (re.test(name)) return icon;
  return "⚙";
}

// Araç girdisinden en anlamlı argümanı seç
function toolArgPreview(input) {
  if (!input || typeof input !== "object") return "";
  const primary = input.path ?? input.file ?? input.pattern ?? input.command
    ?? input.query ?? input.content?.slice?.(0, 50) ?? null;
  if (primary != null) return String(primary).slice(0, 60);
  const s = JSON.stringify(input);
  return s === "{}" ? "" : s.slice(0, 60);
}

// ── Sayı biçimleme ───────────────────────────────────────────────────────────
function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000)      return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// Model bağlam penceresi tahmini
function contextWindow(model = "", backend = "") {
  if (/claude/.test(model)) return 200_000;
  if (backend === "ollama") return 8192;
  return 128_000;
}

// ── Chat turn yardımcıları ───────────────────────────────────────────────────

function _boxW() {
  return Math.min(process.stdout.columns ?? 80, 100);
}

// ╭─ ozyn ──────── HH:MM ─╮  →  input kutusu üst kenarlığı
function userTurnHeader() {
  const W  = _boxW();
  const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // ╭─ + " ozyn " + "── " + dashes + " " + ts + " ─╮"
  const prefix = "╭─ ";
  const label  = "ozyn";
  const suffix = ` ${ts} ─╮`;
  const dashes = "─".repeat(Math.max(2, W - prefix.length - label.length - 1 - suffix.length));
  process.stdout.write(
    `\n${T.muted}${prefix}${T.belt}${label}${RESET}${T.muted} ${dashes}${suffix}${RESET}\n`
  );
}

// Readline prompt'u — \x01..\x02 readline için genişlik hesabından çıkarır (ANSI)
function makeInputPrompt() {
  const Z0  = `\x01${RESET}\x02`;
  const Zm  = `\x01${T.muted}\x02`;
  const Za  = `\x01${T.accent}\x02`;
  return `${Zm}│${Z0} ${Za}►${Z0} `;
}

// ╰──────────────╯  →  input kutusu alt kenarlığı (Enter'dan sonra çizilir)
function inputBoxBottom() {
  const W = _boxW();
  process.stdout.write(`${T.muted}╰${"─".repeat(W - 2)}╯${RESET}\n`);
}

// session.js backend döngüsü başında — AI yanıtı başlamadan önce
function aiTurnStart(mode, backend) {
  const W    = _boxW();
  const info = `${mode ?? "chat"} · ${backend ?? ""}`;
  // "─ orion ✦ ── " + info + dashes (sona kadar uzar)
  const pre  = "─ orion ✦ ── ";
  const dashes = "─".repeat(Math.max(2, W - pre.length - info.length));
  process.stdout.write(
    `\n${T.muted}${pre}${T.star}${info}${RESET}${T.muted}${dashes}${RESET}\n\n`
  );
}

// Araç çağrısı sonrası devam — subtil bağlayıcı
function aiTurnContinue() {
  process.stdout.write(`\n${T.muted}  ···${RESET}\n`);
}

// ── print ────────────────────────────────────────────────────────────────────
const print = {
  // Araç çağrısı: screenshot'taki  *  ToolName "arg"  stili
  tool: (name, input) => {
    const arg = toolArgPreview(input);
    const argStr = arg ? ` ${T.muted}"${arg.replace(/"/g, "'")}"${RESET}` : "";
    process.stdout.write(`  ${T.muted}*${RESET} ${T.accent}${name}${RESET}${argStr}\n`);
  },
  // Araç sonucu: →  öneki
  result: text => {
    const s = String(text).slice(0, 120).replace(/\n/g, " ");
    process.stdout.write(`  ${T.muted}→ ${s}${RESET}\n`);
  },

  // Renkli unified diff — dosya değişikliklerinde gösterilir
  diff: (diffStr, { maxLines = 40 } = {}) => {
    if (!diffStr) return;
    const lines = diffStr.split("\n");
    const shown = lines.slice(0, maxLines);
    for (const l of shown) {
      if (l.startsWith("+"))       process.stdout.write(`  ${T.ok}${l}${RESET}\n`);
      else if (l.startsWith("-"))  process.stdout.write(`  ${T.err}${l}${RESET}\n`);
      else if (l.startsWith("@@")) process.stdout.write(`  ${T.accent}${l}${RESET}\n`);
      else                         process.stdout.write(`  ${T.muted}${l}${RESET}\n`);
    }
    if (lines.length > maxLines)
      process.stdout.write(`  ${C.muted(`… +${lines.length - maxLines} satır daha`)}\n`);
  },
  error:  text => console.error(`${T.err}✗${RESET} ${text}`),
  warn:   text => console.error(`${T.warn}!${RESET} ${text}`),
  info:   text => console.log(C.muted(text)),
  system: text => console.log(`${C.muted("·")} ${C.muted(text)}`),

  // Başlangıç ekranı — emblem + komut ipuçları
  header: (name, model, backend) => {
    console.log("\n" + emblem(model, backend) + "\n");
    console.log(C.muted(i18n.t(
      "   type / to browse commands · Tab completes · Ctrl+C×2 exit",
      "   / yaz, komut listesi açılır · Tab tamamlar · Ctrl+C×2 çıkış"
    )));
    console.log(C.muted("  " + "─".repeat(60)));
  },

  // Statusline — her turdan sonra: mod · model · ↑↓ token · $ · ctx%
  statusline: (info) => {
    if (!info) return;
    const modeC  = C.modeColor(info.mode);
    const ctxW   = contextWindow(info.model, info.backend);
    const ctxPct = Math.min(100, Math.round((info.ctxTokens / ctxW) * 100));
    const ctxCol = ctxPct > 80 ? T.err : ctxPct > 50 ? T.warn : T.muted;
    const cost   = info.costUSD > 0
      ? `$${info.costUSD.toFixed(4)}`
      : i18n.t("local·$0", "yerel·$0");
    const parts = [
      `${modeC}${info.mode}${RESET}`,
      `${T.accent}${info.backend}${RESET}${T.muted}/${info.model}${RESET}`,
      `${T.muted}↑${fmtTokens(info.input)} ↓${fmtTokens(info.output)}${RESET}`,
      `${T.muted}${cost}${RESET}`,
      `${ctxCol}ctx %${ctxPct}${RESET}`,
    ];
    console.log(`${C.muted("  ⋆ ")}${parts.join(C.muted("  ·  "))}`);
  },

  sessionList: sessions => {
    if (!sessions.length) { console.log(C.muted(i18n.t("  (no saved sessions)", "  (kayıtlı oturum yok)"))); return; }
    console.log("");
    for (const s of sessions) {
      const date = s.updatedAt ? new Date(s.updatedAt).toLocaleString(i18n.locTag()) : "?";
      const msgs = `${s.msgCount ?? 0} msg`;
      console.log(`  ${C.cyan(s.id)}  ${C.muted(s.model)}  ${C.dim(msgs)}  ${C.muted(date)}`);
      if (s.preview) console.log(`       ${C.muted(s.preview)}`);
    }
    console.log("");
  },
};

// ── Spinner — geçen süre göstergeli ─────────────────────────────────────────
const SPIN = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let _spinInt = null;
let _spinI   = 0;
let _spinT0  = 0;
const spinner = {
  start: (label = "") => {
    if (_spinInt) return;
    _spinT0 = Date.now();
    process.stderr.write("  ");
    _spinInt = setInterval(() => {
      const secs = ((Date.now() - _spinT0) / 1000).toFixed(0);
      process.stderr.write(`\r  ${T.accent}${SPIN[_spinI++ % SPIN.length]}${RESET} ${C.dim(label)} ${C.muted(secs + "s")} `);
    }, 80);
  },
  stop: () => {
    if (_spinInt) { clearInterval(_spinInt); _spinInt = null; }
    process.stderr.write("\r" + " ".repeat(40) + "\r");
  },
};

// ── Giriş kilidi ─────────────────────────────────────────────────────────────
// select-input / masked-input gibi raw-mode alt istemler aktifken readline'ın
// tuşları işlemesini engeller (çift işleme: key echo + rl.line kirlenmesi).
let _inputLock = false;
function setInputLock(v) { _inputLock = !!v; }
function isInputLocked() { return _inputLock; }

// ── Sticky input (scroll region tabanlı sabit altta kalma) ───────────────────
const STICKY_H = 3;      // üst kenarlık + input satırı + alt kenarlık
let _panelH    = STICKY_H; // aktif panel yüksekliği (öneri menüsü açıkken büyür)
let _panelPos  = { inputRow: 0, bottomRow: 0, menuOpen: false }; // son render konumu

// Scroll region'ı kur — content üstte, input kutusu altta sabit kalır
function stickySetup() {
  if (!process.stdout.isTTY) return;
  const rows = process.stdout.rows ?? 24;
  const scrollBottom = Math.max(5, rows - _panelH);
  process.stdout.write(`\x1b[1;${scrollBottom}r`);        // scroll region
  process.stdout.write(`\x1b[${scrollBottom + 1};1H\x1b[J`); // input alanını temizle
}

// Scroll region'ı sıfırla (çıkışta veya headless modunda)
function stickyTeardown() {
  process.stdout.write(`\x1b[r`);    // scroll region sıfırla
  process.stdout.write(`\x1b[?25h`); // cursor'u göster
}

// ── Panel kenarlık kurucuları ────────────────────────────────────────────────

// ╭─ ozyn ─────────────── model · mod · HH:MM ─╮
function _topBorder(W, info) {
  const ts     = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const prefix = "╭─ ";
  const label  = "ozyn";
  const right  = info ? ` ${info} · ${ts} ─╮` : ` ${ts} ─╮`;
  let dashes = W - prefix.length - label.length - 1 - right.length;
  if (dashes < 2 && info) return _topBorder(W, null); // dar terminal — info'yu at
  dashes = Math.max(2, dashes);
  return `${T.muted}${prefix}${T.belt}${label}${RESET}${T.muted} ${"─".repeat(dashes)}${DIM}${right.slice(0, right.length - 2)}${RESET}${T.muted}─╮${RESET}`;
}

// ╰─ ipucu ─────────────╯  (bağlama göre ipucu değişir)
function _bottomBorder(W, menuOpen) {
  const hint = menuOpen
    ? i18n.t(" ↑↓ navigate · Tab/Enter select · Esc close ", " ↑↓ gezin · Tab/Enter seç · Esc kapat ")
    : i18n.t(" / commands · Ctrl+C×2 exit ", " / komutlar · Ctrl+C×2 çıkış ");
  const hDashes = "─".repeat(Math.max(2, W - hint.length - 4));
  return `${T.muted}╰─${RESET}${DIM}${hint}${RESET}${T.muted}${hDashes}─╯${RESET}`;
}

// ── Sticky panel: öneri menüsü + tam giriş kutusu ────────────────────────────
// Düzen (alttan üste): alt kenarlık(ipuçlu) / giriş satırı / üst kenarlık / öneriler
// Öneriler açıkken scroll region küçülür, kapanınca geri büyür.
function stickyPanel({ suggestions = [], selected = 0, menuOpen = false, info = "" } = {}) {
  if (!process.stdout.isTTY) { userTurnHeader(); return; }
  const rows = process.stdout.rows ?? 24;
  const W    = _boxW();

  // Panel küçülürken eski öneri satırları artık bırakmasın — geniş aralığı temizle
  const prevBottom = Math.max(5, rows - _panelH);
  _panelH = STICKY_H + suggestions.length;
  const scrollBottom = Math.max(5, rows - _panelH);
  process.stdout.write(`\x1b[1;${scrollBottom}r`);

  const clearFrom = Math.min(prevBottom, scrollBottom) + 1;
  process.stdout.write(`\x1b[${clearFrom};1H\x1b[J`);
  let row = scrollBottom + 1;

  // Öneri listesi — kutunun üstünde açılır menü
  for (let i = 0; i < suggestions.length; i++) {
    const s    = suggestions[i];
    const name = `/${s.name}`.padEnd(16);
    const desc = String(s.desc ?? "").slice(0, Math.max(10, W - 22));
    if (i === selected) {
      process.stdout.write(`\x1b[${row};1H  ${T.accent}▸ ${BOLD}${name}${RESET}${T.accent}${desc}${RESET}`);
    } else {
      process.stdout.write(`\x1b[${row};1H    ${T.muted}${name}${desc}${RESET}`);
    }
    row++;
  }

  process.stdout.write(`\x1b[${row};1H${_topBorder(W, info)}`);
  row++;
  const inputRow = row;

  process.stdout.write(`\x1b[${row + 1};1H${_bottomBorder(W, menuOpen)}`);

  // Konumu kaydet — repaintPanelBottom readline refresh'lerinden sonra kullanır
  _panelPos = { inputRow, bottomRow: row + 1, menuOpen };

  // Cursor'u giriş satırına bırak — readline burada render eder
  process.stdout.write(`\x1b[${inputRow};1H\x1b[2K`);
}

// readline _refreshLine her yenilemede clearScreenDown yapar — alt kenarlığı siler.
// Bu fonksiyon her refresh'ten sonra alt kenarlığı geri çizer (cursor korunur).
function repaintPanelBottom() {
  if (!process.stdout.isTTY || !_panelPos.bottomRow) return;
  const W = _boxW();
  process.stdout.write(`\x1b[s\x1b[${_panelPos.bottomRow};1H\x1b[2K${_bottomBorder(W, _panelPos.menuOpen)}\x1b[u`);
}

// Placeholder: boş inputta soluk yönlendirme metni (cursor başa döner)
function showInputPlaceholder() {
  if (!process.stdout.isTTY) return;
  const text = i18n.t("type a message · / for commands", "mesaj yaz · komutlar için /");
  process.stdout.write(`${DIM}${T.muted}${text}${RESET}\x1b[${text.length}D`);
}

// Placeholder'ı sil — cursor placeholder'ın başında bekliyor
function clearInputPlaceholder() {
  if (!process.stdout.isTTY) return;
  process.stdout.write(`\x1b[0K`);
}

// Geriye dönük uyumlu sarmalayıcı — önerisiz panel çizer
function stickyRefreshInput() {
  stickyPanel({});
}

// Cursor'u içerik alanının sonuna taşı (AI yanıtı buraya akacak)
function stickyMoveToContent() {
  if (!process.stdout.isTTY) return;
  const rows = process.stdout.rows ?? 24;
  const scrollBottom = Math.max(5, rows - _panelH);
  process.stdout.write(`\x1b[${scrollBottom};1H`);
}

// Gönderilen mesajın içerik alanına echo'su — kutu stilinde orta satır
function userEchoLine(text) {
  process.stdout.write(`${T.muted}│${RESET} ${T.accent}►${RESET} ${text}\n`);
}

module.exports = { C, T, print, spinner, renderMarkdown, gradient, emblem, contextWindow, userTurnHeader, makeInputPrompt, inputBoxBottom, aiTurnStart, aiTurnContinue, stickySetup, stickyTeardown, stickyRefreshInput, stickyMoveToContent, stickyPanel, userEchoLine, repaintPanelBottom, showInputPlaceholder, clearInputPlaceholder, setInputLock, isInputLocked };
