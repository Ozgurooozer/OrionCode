// core/diff.js — Satır tabanlı diff motoru (sıfır bağımlılık, pi tarzı)
// @ts-nocheck
// Ortak baş/son kırpma + LCS; çıktı unified diff biçiminde (+/-/@@).
"use strict";

const MAX_LINES = 3000; // LCS O(n·m) — üstünde özet döner

// LCS tablosuyla iki satır dizisini hizala → [{type:'same'|'del'|'add', line}]
function _align(a, b) {
  const n = a.length, m = b.length;
  // DP tablosu (Uint16 yeter: MAX_LINES < 65535)
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j]
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j])                            { ops.push({ type: "same", line: a[i] }); i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { ops.push({ type: "del",  line: a[i] }); i++; }
    else                                          { ops.push({ type: "add",  line: b[j] }); j++; }
  }
  while (i < n) ops.push({ type: "del", line: a[i++] });
  while (j < m) ops.push({ type: "add", line: b[j++] });
  return ops;
}

// İki metni satır satır karşılaştır → op listesi
function diffLines(oldText, newText) {
  const a = String(oldText ?? "").split("\n");
  const b = String(newText ?? "").split("\n");

  // Ortak baş ve sonu kırp — LCS sadece değişen orta bölüme uygulanır
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre &&
         a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;

  const midA = a.slice(pre, a.length - suf);
  const midB = b.slice(pre, b.length - suf);

  if (midA.length > MAX_LINES || midB.length > MAX_LINES) {
    // Çok büyük — LCS atlandı, kaba del-all / add-all gösterilir
    const ops = [
      ...a.slice(0, pre).map(l => ({ type: "same", line: l })),
      { type: "note", line: `[! büyük dosya: ${midA.length} satır değişti — satır bazlı diff atlandı]` },
      ...midA.map(l => ({ type: "del", line: l })),
      ...midB.map(l => ({ type: "add", line: l })),
      ...a.slice(a.length - suf).map(l => ({ type: "same", line: l })),
    ];
    ops.truncated = true;
    return ops;
  }

  return [
    ...a.slice(0, pre).map(l => ({ type: "same", line: l })),
    ..._align(midA, midB),
    ...a.slice(a.length - suf).map(l => ({ type: "same", line: l })),
  ];
}

// Op listesini unified diff metnine çevir (bağlam satırlı @@ hunk'ları)
function formatDiff(ops, { context = 3 } = {}) {
  if (!ops.some(o => o.type !== "same")) return "";

  // Hunk'ları belirle: değişikliğin ±context komşuluğu görünür
  const visible = new Array(ops.length).fill(false);
  ops.forEach((o, i) => {
    if (o.type === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(ops.length - 1, i + context); k++)
      visible[k] = true;
    if (o.type === "note") visible[i] = true; // uyarı satırı her zaman görünür
  });

  const out = [];
  let oldLn = 1, newLn = 1;
  let hunk = null; // {oldStart, newStart, lines, oldCount, newCount}

  const flush = () => {
    if (!hunk) return;
    out.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
    out.push(...hunk.lines);
    hunk = null;
  };

  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    if (visible[i]) {
      if (!hunk) hunk = { oldStart: oldLn, newStart: newLn, lines: [], oldCount: 0, newCount: 0 };
      if (o.type === "same") { hunk.lines.push(` ${o.line}`); hunk.oldCount++; hunk.newCount++; }
      if (o.type === "del")  { hunk.lines.push(`-${o.line}`); hunk.oldCount++; }
      if (o.type === "add")  { hunk.lines.push(`+${o.line}`); hunk.newCount++; }
      if (o.type === "note") { hunk.lines.push(`# ${o.line}`); }
    } else {
      flush();
    }
    if (o.type !== "add" && o.type !== "note") oldLn++;
    if (o.type !== "del" && o.type !== "note") newLn++;
  }
  flush();
  return out.join("\n");
}

// Kısayol: iki metnin unified diff'i ("" = fark yok)
function diffText(oldText, newText, opts = {}) {
  return formatDiff(diffLines(oldText, newText), opts);
}

// İstatistik: {added, removed}
function diffStat(oldText, newText) {
  const ops = diffLines(oldText, newText);
  return {
    added:   ops.filter(o => o.type === "add").length,
    removed: ops.filter(o => o.type === "del").length,
  };
}

module.exports = { diffLines, formatDiff, diffText, diffStat };
