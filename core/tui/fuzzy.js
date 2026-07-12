// core/tui/fuzzy.js — Yazım hatasına toleranslı fuzzy eşleştirici
// jcode (github.com/1jehuang/jcode) crates/jcode-fuzzy'nin JS'e taşınmış hali:
// alt-dizi eşleştirme + sınırlı ikame/devrik/eksik karakter toleransı. Tam,
// ardışık, sınır ve ilk-karakter eşleşmeleri bonus alır — typo toleransı
// güçlü tam eşleşmeleri geçersiz kılmaz.
"use strict";

const MATCH         = 16;
const CONSECUTIVE   = 8;
const BOUNDARY      = 9;
const FIRST         = 12;
const GAP           = -1;
const LEADING_GAP    = -3;
const SUBSTITUTION  = -10;
const DELETION      = -12;
const TRANSPOSITION = 2 * MATCH - 22; // 10

function isBoundary(c) {
  return c === "/" || c === "-" || c === "_" || c === " " || c === "." || c === ":";
}

function isWhitespace(c) {
  return /\s/.test(c);
}

function errorBudget(meaningfulLen) {
  if (meaningfulLen <= 2) return 0;
  if (meaningfulLen <= 8) return 1;
  return 2;
}

function keepBest(slot, candidate) {
  if (!slot) return candidate;
  if (candidate.score > slot.score) return candidate;
  if (candidate.score === slot.score && candidate.errors < slot.errors) return candidate;
  if (candidate.score === slot.score && candidate.errors === slot.errors &&
      candidate.positions.length > slot.positions.length) return candidate;
  return slot;
}

function fuzzyMatchImpl(needle, haystack, anchorFirstTrueMatch, stripLeadingSlash, requireTrueTail) {
  let hayOffset = 0, haySrc = haystack;
  if (stripLeadingSlash && haystack.startsWith("/")) { hayOffset = 1; haySrc = haystack.slice(1); }
  const needleSrc = stripLeadingSlash && needle.startsWith("/") ? needle.slice(1) : needle;

  const pat = [...needleSrc.toLowerCase()];
  const hay = [...haySrc.toLowerCase()];

  if (pat.every(isWhitespace)) return { score: 0, positions: [] };
  if (!hay.length) return null;

  const m = pat.length, n = hay.length;
  const meaningful = pat.filter(c => !isWhitespace(c)).length;
  const maxErr = errorBudget(meaningful);

  // dp[i][j] — i: needle prefix uzunluğu, j: haystack prefix uzunluğu
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
  dp[0][0] = { score: 0, errors: 0, last: -1, tailTrue: true, positions: [] };
  for (let j = 1; j <= n; j++) {
    const prev = dp[0][j - 1];
    if (prev) dp[0][j] = { score: prev.score + LEADING_GAP, errors: prev.errors, last: prev.last, tailTrue: prev.tailTrue, positions: prev.positions };
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      let best = null;

      if (j >= 1 && dp[i][j - 1]) {
        const prev = dp[i][j - 1];
        best = keepBest(best, { score: prev.score + GAP, errors: prev.errors, last: prev.last, tailTrue: prev.tailTrue, positions: prev.positions });
      }

      if (j >= 1 && dp[i - 1][j - 1]) {
        const prev = dp[i - 1][j - 1];
        const pos = j - 1;
        if (pat[i - 1] === hay[pos]) {
          let score = prev.score + MATCH;
          if (prev.last === pos - 1) score += CONSECUTIVE;
          if (pos === 0 || isBoundary(hay[pos - 1])) score += BOUNDARY;
          if (i === 1 && pos === 0) score += FIRST;
          best = keepBest(best, { score, errors: prev.errors, last: pos, tailTrue: true, positions: [...prev.positions, pos] });
        } else if (prev.errors < maxErr && !isWhitespace(pat[i - 1]) && !isWhitespace(hay[pos])) {
          best = keepBest(best, { score: prev.score + SUBSTITUTION, errors: prev.errors + 1, last: pos, tailTrue: false, positions: prev.positions });
        }
      }

      if (!isWhitespace(pat[i - 1]) && dp[i - 1][j] && dp[i - 1][j].errors < maxErr) {
        const prev = dp[i - 1][j];
        best = keepBest(best, { score: prev.score + DELETION, errors: prev.errors + 1, last: prev.last, tailTrue: false, positions: prev.positions });
      }

      if (i >= 2 && j >= 2 &&
          pat[i - 1] === hay[j - 2] && pat[i - 2] === hay[j - 1] && pat[i - 1] !== pat[i - 2] &&
          !isWhitespace(pat[i - 1]) && !isWhitespace(pat[i - 2]) &&
          dp[i - 2][j - 2] && dp[i - 2][j - 2].errors < maxErr) {
        const prev = dp[i - 2][j - 2];
        const first = j - 2;
        let score = prev.score + TRANSPOSITION;
        if (first === 0 || isBoundary(hay[first - 1])) score += BOUNDARY;
        best = keepBest(best, { score, errors: prev.errors + 1, last: j - 1, tailTrue: true, positions: [...prev.positions, first, j - 1] });
      }

      dp[i][j] = best;
    }
  }

  let answer = null;
  for (const cell of dp[m]) {
    if (cell && (!requireTrueTail || cell.tailTrue)) answer = keepBest(answer, cell);
  }
  if (!answer) return null;
  if (anchorFirstTrueMatch && answer.positions[0] !== 0) return null;

  return { score: answer.score, positions: answer.positions.map(p => p + hayOffset) };
}

// Serbest metin eşleştirme (model/dosya seçici gibi arama kutuları için)
function fuzzyMatch(needle, haystack) {
  return fuzzyMatchImpl(needle, haystack, false, false, false);
}

function fuzzyScore(needle, haystack) {
  const m = fuzzyMatch(needle, haystack);
  return m ? m.score : null;
}

function fuzzyMatchPositions(needle, haystack) {
  const m = fuzzyMatch(needle, haystack);
  return m ? m.positions : [];
}

// Boşlukla ayrılmış alanlardan oluşan arama metni (örn. "model-id provider desc").
// Tek kelimelik sorgu TEK bir alan içinde eşleşmeli — zayıf bir eşleşmenin
// alakasız alanları birbirine dikmesini önler. Çok kelimeli sorgu tüm metne bakar.
function fuzzyScoreTokens(needle, haystack) {
  const q = needle.trim();
  if (!q) return 0;
  if (/\s/.test(q)) return fuzzyScore(q, haystack);
  let best = null;
  for (const token of haystack.split(/\s+/)) {
    const s = fuzzyScore(q, token);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}

// Slash komutu eşleştirme: baştaki "/" skora girmez, ilk gerçek eşleşme
// komutun ilk harfine sabitlenir (kısa öneriler kesin kalsın).
function commandFuzzyMatch(needle, haystack) {
  return fuzzyMatchImpl(needle, haystack, true, true, true);
}

function commandFuzzyScore(needle, haystack) {
  const m = commandFuzzyMatch(needle, haystack);
  return m ? m.score : null;
}

module.exports = { fuzzyMatch, fuzzyScore, fuzzyMatchPositions, fuzzyScoreTokens, commandFuzzyMatch, commandFuzzyScore };
