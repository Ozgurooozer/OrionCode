// tui/index.ts — Orion TUI v3
// Truecolor tema, takımyıldız emblemi, statusline, markdown renderer v2
"use strict";

import type { } from './colors.ts';

interface StatuslineInfo {
  mode: string;
  backend: string;
  model: string;
  input: number;
  output: number;
  costUSD: number;
  ctxTokens: number;
}

const i18n = require("../core/i18n.ts");
const { RESET, BOLD, DIM, ITALIC, rgb, rgbBg, T, C, gradient } = require("./colors.ts");
const { print: _print, toolIcon } = require("./output.ts");

// ── Emblem: ORION wordmark + takımyıldız ─────────────────────────────────────
// ANSI-shadow blok harfler, cyan→menekşe gradyan; sağda Orion takımyıldızı
// (omuzlar, ✶ ✶ ✶ kuşak, ayaklar). Dar terminalde kompakt satıra düşer.
function emblem(model: string | null, backend: string | null): string {
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

function highlightCode(code: string, lang: string = ""): string {
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
    const slots: string[] = [];
    const stash = (color: string, m: string) => { slots.push(`${color}${m}\x1b[39m`); return `\x00${slots.length - 1}\x00`; };
    let out = line
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, m => stash(T.string, m))
      .replace(KEYWORDS, m => stash(T.keyword, m))
      .replace(/(?<!\x00)\b(\d+\.?\d*)\b(?!\x00)/g, m => stash(T.number, m));
    out = out.replace(/\x00(\d+)\x00/g, (_, i) => slots[+i]);
    return `${T.code}${out}${RESET}`;
  }).join("\n");
}

function renderMarkdown(text: string): string {
  return text
    // Kod blokları — çerçeve + dil etiketi + vurgu
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const lines = code.replace(/\n$/, "").split("\n");
      const w = Math.min(76, Math.max(40, ...lines.map((l: string) => l.length)) + 2);
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

// ── Sayı biçimleme ───────────────────────────────────────────────────────────
function fmtTokens(n: number): string {
  if (n >= 999_950)  return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 999.5)    return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// Model bağlam penceresi tahmini
function contextWindow(model: string = "", backend: string = ""): number {
  if (/claude/.test(model)) return 200_000;
  if (backend === "ollama") return 8192;
  return 128_000;
}

// ── Chat turn yardımcıları ───────────────────────────────────────────────────

function _boxW() {
  // Tam terminal genişliği: canlı satır dolgusu (refreshInputFill) satırı
  // kolon sonuna kadar boyar — bant aynı genişlikte olmalı ki blok hizalansın.
  return process.stdout.columns ?? 80;
}

// Readline prompt'u — \x01..\x02 readline için genişlik hesabından çıkarır (ANSI)
// Zemin renkli " ► " sekmesi; sonda zemin AÇIK bırakılır: readline'ın yazdığı
// karakterler de blok zeminine düşer. Satırın kalan boşluğunu refreshInputFill
// boyar; RESET gereken her yazma noktası kendi başına RESET basar.
function makeInputPrompt(): string {
  const Za = `\x01${T.boxBg}${T.accent}\x02`;
  const Zf = `\x01${T.boxFg}\x02`;
  return `${Za} ► ${Zf} `;
}

// session.js backend döngüsü başında — AI yanıtı başlamadan önce
// turnInfo: isteğe bağlı "[3/40]" formatında tur sayacı
function aiTurnStart(mode: string | null, backend: string | null, turnInfo: string | null = null): void {
  const W    = _boxW();
  const turnStr = turnInfo ? ` ${turnInfo}` : "";
  const info = `${mode ?? "chat"} · ${backend ?? ""}${turnStr}`;
  // "─ orion ✦ ── " + info + dashes (sona kadar uzar)
  const pre  = "─ orion ✦ ── ";
  const dashes = "─".repeat(Math.max(2, W - pre.length - info.length));
  process.stdout.write(
    `\n${T.muted}${pre}${T.star}${info}${RESET}${T.muted}${dashes}${RESET}\n\n`
  );
}

// Araç çağrısı sonrası devam — subtil bağlayıcı
function aiTurnContinue(): void {
  process.stdout.write(`\n${T.muted}  ···${RESET}\n`);
}

// ── print — temel metotlar output.ts'ten, header/statusline burada ────────────
const print = Object.assign({}, _print, {
  header: (name: string, model: string | null, backend: string | null) => {
    console.log("\n" + emblem(model, backend) + "\n");
    console.log(C.muted(i18n.t(
      "   type / to browse commands · Tab completes · Ctrl+C×2 exit",
      "   / yaz, komut listesi açılır · Tab tamamlar · Ctrl+C×2 çıkış"
    )));
    console.log(C.muted("  " + "─".repeat(60)));
  },
  statusline: (info: StatuslineInfo | null) => {
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
});

// ── Spinner — geçen süre göstergeli ─────────────────────────────────────────
const SPIN = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
let _spinInt: NodeJS.Timeout | null = null;
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
function setInputLock(v: boolean): void { _inputLock = !!v; }
function isInputLocked() { return _inputLock; }

// ═══ AKIŞ TABANLI RENDER MODELİ ═══════════════════════════════════════════════
// Kural: scroll region YOK, mutlak konumlama (\x1b[r;cH) YOK, cursor kaydet/geri
// dön (\x1b[s/\x1b[u) YOK. Her şey akış içinde yukarıdan aşağı yazılır; kendini
// tazeleyen widget'lar yalnızca GÖRELİ hareket kullanır (↑n, ↓n, sütun, satır sil).
// Böylece ekranın neresinde olursak olalım render bozulmaz ve terminalin doğal
// scrollback'i çalışır.

// ANSI kaçış kodlarını sayarak görünür genişliğe kırp (satır sarması = satır
// sayısı hesabı bozulur — widget'lar her satırı terminal genişliğine sığdırmalı)
function fitLine(s: string, width: number): string {
  // Windows CRLF: \r görünmez karakter değil, satır başı — genişlik hesabını bozar
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "");
  let visible = 0, out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\x1b") {
      const m = /^\x1b\[[0-9;]*m/.exec(s.slice(i));
      if (m) { out += m[0]; i += m[0].length - 1; continue; }
    }
    if (s[i] === "\n") break; // çok satırlı girdi: sadece ilk satır
    if (visible >= width) break;
    out += s[i];
    visible++;
  }
  return out + RESET;
}

// ── Giriş bloğu (akış içinde) ────────────────────────────────────────────────
// Çizgi karakteri yok: turn, zemin rengiyle dolu bir blok. Yazım sırasında
// yalnızca başlık bandı + zemin renkli " ► " sekmesi görünür — readline prompt
// satırının tek sahibi, altında hiçbir şey yok, clearScreenDown zararsız.
// Enter'da finishUserTurn canlı satırları geri sarıp bloğu kalıcı çizer.

// Dolgulu başlık bandı: " ozyn ······················ model · mod · HH:MM "
function _bandHeader(info = "") {
  const W    = _boxW();
  const ts   = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const left = " ozyn";
  let right  = info ? `${info} · ${ts}` : ts;
  if (left.length + right.length + 2 > W) right = ts; // dar terminal — info'yu at
  const pad = Math.max(1, W - left.length - right.length - 1);
  return `${T.boxBg}${BOLD}${T.belt}${left}${RESET}${T.boxBg}${T.muted}${" ".repeat(pad)}${right} ${RESET}`;
}

function inputBoxTop(info: string = ""): void {
  process.stdout.write(`\n${_bandHeader(info)}\n`);
}

// Enter sonrası: canlı yazılan satırları geri sarıp turn'ü dolgulu blok olarak
// scrollback'e kalıcı çizer. rawLine = readline'ın ham satırı (geri sarılacak
// satır sayısı, ekranda gerçekten kaplanan alan üzerinden hesaplanır).
function finishUserTurn(rawLine: string, info: string = ""): void {
  if (!process.stdout.isTTY) return;
  const cols = process.stdout.columns ?? 80;
  const W    = _boxW();
  // canlı prompt satırının kapladığı görsel satır sayısı (terminal sarması dahil)
  const liveRows = Math.max(1, Math.ceil((PROMPT_VISIBLE_W + rawLine.length) / cols));
  // ↑ prompt satırları + başlık bandı + üstteki boş satır, sonra altı temizle
  // (RESET önce: canlı zemin açıkken \x1b[J ekranın altını da boyar — BCE)
  let out = `${RESET}\r\x1b[${liveRows + 2}A\x1b[J`;
  out += `\n${_bandHeader(info)}\n`;
  const text  = rawLine.trim();
  const bodyW = W - 4; // sol " ► " + sağda en az bir boşluk
  const rows  = [];
  for (let i = 0; i < text.length; i += bodyW) rows.push(text.slice(i, i + bodyW));
  if (!rows.length) rows.push("");
  rows.forEach((r, i) => {
    const head = i === 0 ? ` ${T.accent}► ${T.boxFg}` : `   ${T.boxFg}`;
    out += `${T.boxBg}${head}${r}${" ".repeat(Math.max(1, W - 3 - r.length))}${RESET}\n`;
  });
  process.stdout.write(out);
}

// Canlı input satırının son satırındaki kalan boşluğu blok zeminiyle doldur.
// _refreshLine'dan SONRA çağrılır: cursor'un ve içerik sonunun satır/sütununu
// hesaplar, içerik sonundan satır sonuna kadar zemin renkli boşluk basar,
// cursor'u aynen geri bırakır. Tamamen göreli hareket (↓n, ↑n, sütun) —
// BCE'ye güvenmez: dolgu gerçek boşluk karakterleriyle yapılır.
function refreshInputFill(rl: any): void {
  if (!process.stdout.isTTY || !rl?.getCursorPos) return;
  const cols = process.stdout.columns ?? 80;
  const pos  = rl.getCursorPos(); // prompt başlangıcına göre {rows, cols}
  const total = PROMPT_VISIBLE_W + (rl.line?.length ?? 0);
  let rowE = Math.floor(total / cols);
  let colE = total % cols;
  if (colE === 0 && total > 0) { rowE -= 1; colE = cols; } // satır sonu: ertelenmiş sarma
  const fill = cols - colE;
  const down = Math.max(0, rowE - pos.rows);
  let out = "\x1b[?25l";
  if (down > 0)  out += `\x1b[${down}B`;
  out += `\x1b[${colE + 1}G`;
  if (fill > 0)  out += `${T.boxBg}${" ".repeat(fill)}`;
  if (down > 0)  out += `\x1b[${down}A`;
  out += `\x1b[${pos.cols + 1}G${T.boxBg}${T.boxFg}\x1b[?25h`;
  process.stdout.write(out);
}

// Placeholder: boş inputta soluk yönlendirme metni (cursor başa döner — göreli ←)
// Zemin açıkken çizilir; sonunda zemin+metin rengi geri kurulur ki bir sonraki
// tuş vuruşu blok zemininde kalsın.
function showInputPlaceholder() {
  if (!process.stdout.isTTY) return;
  const text = i18n.t("type a message · / for commands", "mesaj yaz · komutlar için /");
  process.stdout.write(`${DIM}${T.muted}${text}${RESET}${T.boxBg}${T.boxFg}\x1b[${text.length}D`);
}

// Placeholder'ı sil — cursor placeholder'ın başında bekliyor. Üzerine zemin
// renkli boşluk yazılır (BCE'siz), cursor geri döner, metin rengi kurulur.
function clearInputPlaceholder() {
  if (!process.stdout.isTTY) return;
  const len = i18n.t("type a message · / for commands", "mesaj yaz · komutlar için /").length;
  process.stdout.write(`${T.boxBg}${" ".repeat(len)}\x1b[${len}D${T.boxFg}`);
}

// ── Slash menü: prompt satırının ALTINA öneri listesi ────────────────────────
// Prompt satırından: bir satır in, altı temizle, önerileri yaz, prompt satırına
// GERİ dön (yazılan satır sayısı kadar ↑). Tamamen göreli — scroll olsa bile
// geri sayım doğru kalır (aşağı inilen satır sayısı = geri çıkılacak satır sayısı).
const PROMPT_VISIBLE_W = 4; // " ► " sekmesi + boşluk görünür genişliği

function _promptCol(rl: any): number {
  return PROMPT_VISIBLE_W + (rl?.cursor ?? 0) + 1; // 1-tabanlı sütun
}

function renderMenuBelow(rl: any, { items = [] as any[], selected = 0 } = {}): void {
  if (!process.stdout.isTTY) return;
  if (!items.length) { clearMenuBelow(rl); return; }
  const W = process.stdout.columns ?? 80;

  const lines = items.map((it, i) => {
    const name = `/${it.name}`.padEnd(15);
    const desc = String(it.desc ?? "");
    return i === selected
      ? fitLine(`  ${T.accent}▸ ${BOLD}${name}${RESET}${T.accent} ${desc}`, W - 1)
      : fitLine(`    ${T.muted}${name} ${desc}`, W - 1);
  });
  lines.push(fitLine(`  ${DIM}${i18n.t("↑↓ navigate · Tab/Enter select · Esc close", "↑↓ gezin · Tab/Enter seç · Esc kapat")}${RESET}`, W - 1));

  let out = `${RESET}\x1b[?25l`;             // RESET: canlı zemin \x1b[J'ye taşmasın; cursor'u gizle
  out += "\r\n\x1b[J";                       // prompt'un altına in, eski menüyü sil
  out += lines.join("\r\n");
  out += `\x1b[${lines.length}A`;            // prompt satırına geri çık
  out += `\x1b[${_promptCol(rl)}G${T.boxBg}${T.boxFg}\x1b[?25h`; // sütun + blok zemini geri kur
  process.stdout.write(out);
}

function clearMenuBelow(rl: any): void {
  if (!process.stdout.isTTY) return;
  process.stdout.write(`${RESET}\x1b[?25l\r\n\x1b[J\x1b[1A\x1b[${_promptCol(rl)}G${T.boxBg}${T.boxFg}\x1b[?25h`);
}

module.exports = { C, T, print, spinner, renderMarkdown, gradient, emblem, contextWindow, makeInputPrompt, finishUserTurn, refreshInputFill, aiTurnStart, aiTurnContinue, inputBoxTop, renderMenuBelow, clearMenuBelow, fitLine, showInputPlaceholder, clearInputPlaceholder, setInputLock, isInputLocked };
