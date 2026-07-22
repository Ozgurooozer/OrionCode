// core/agents/level0.js — Seviye 0 sınıflandırıcı: kural/anahtar-kelime, LLM yok.
// @ts-nocheck
// TAYF trigger paletinin kod karşılığı (TAYF/TAYF_v0.1.md). Kesinlik-öncelikli:
// yalnızca TEK kategori net eşleşirse sonuç döner; çakışma, bağlaç veya uzun
// girdi → null → çağıran LLM'e (Meissa, Seviye 2) düşürür. Böylece belirsiz ve
// saçma girdiler LLM'e akmaya devam eder — TAYF veri toplama bozulmaz.
"use strict";

// exact: token birebir eşleşmeli (kısa/riskli kökler — "git" prefix olsaydı
// "gitmek"i yutardı). prefix: token kökle başlayabilir ("çiz" → "çizer misin").
const CATEGORIES = {
  resim: {
    prefix: ["resim", "görsel", "çiz", "draw", "image", "anime", "pixel", "render",
             "portrait", "generate", "cyberpunk", "fantasy", "scifi"],
    exact:  ["3d"],
    rota: "skill", skill: "image", budget: 150,
  },
  ses: {
    prefix: ["seslendir"],
    exact:  ["sesli", "sesle", "voice", "speak", "tts", "oku", "okusana"],
    rota: "skill", skill: "voice", budget: 100,
  },
  animasyon: {
    prefix: ["animasyon", "animation", "animate", "hareketli"],
    exact:  ["gif", "motion"],
    rota: "skill", skill: "animation", budget: 200,
  },
  kod: {
    prefix: ["kod", "python", "javascript", "typescript", "debug", "refactor"],
    exact:  ["sql", "git", "docker", "js", "fonksiyon", "function"],
    rota: "sohbet", skill: null, budget: 50,
  },
  analiz: {
    prefix: ["analiz", "performans", "performance"],
    exact:  ["bug", "leak"],
    rota: "sohbet", skill: null, budget: 50,
  },
  "yazı": {
    prefix: ["blog", "doküman", "dokuman", "makale"],
    exact:  ["readme", "belge"],
    rota: "sohbet", skill: null, budget: 50,
  },
  sohbet: {
    prefix: ["teşekkür", "merhaba", "selam"],
    exact:  ["naber", "günaydın", "sağol", "hello", "thanks", "tamam", "anladım", "eyvallah"],
    rota: "sohbet", skill: null, budget: 0,
  },
};

// Bağlaç görülür + en az bir kategori eşleşirse → çok-adımlı olabilir → LLM karar versin.
const CONNECTORS = new Set(["ve", "sonra", "ardından", "and", "then"]);

// Bundan uzun girdiler Seviye 0 için fazla karmaşık — LLM'e.
const MAX_INPUT_LENGTH = 120;

// Hem tr hem en lowercasing'den token üret — toLocaleLowerCase("tr") "IMAGE"i
// "ımage" yapar, tek locale İngilizce trigger'ları kaçırırdı.
function _tokenize(input) {
  const tokens = new Set();
  for (const variant of [input.toLowerCase(), input.toLocaleLowerCase("tr")]) {
    for (const t of variant.split(/[^\p{L}\p{N}]+/u)) {
      if (t) tokens.add(t);
    }
  }
  return tokens;
}

function _matches(tokens, cat) {
  for (const t of tokens) {
    if (cat.exact.includes(t)) return true;
    for (const stem of cat.prefix) {
      if (t === stem || t.startsWith(stem)) return true;
    }
  }
  return false;
}

/**
 * Kural tabanlı sınıflandırma dene. Emin değilse null döner (→ LLM).
 * @param {string} input
 * @returns {{kategoriler, karmasiklik, rota, skill, tahmini_butce}|null}
 */
// Görsel sanat emojileri → resim (LLM emoji-only girdide JSON üretemez)
const _ART_EMOJI    = /\p{Emoji}/u;
const _ART_PATTERNS = /🎨|🖼|🖌|🎭|🎬|🎥|🎞|🖍/u;

function classify(input) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH) return null;

  // Emoji-ağırlıklı, görsel sanat emojisi içeren kısa girdi → doğrudan resim
  // ‍ = ZWJ, ️ = variation selector — bunlar emoji'den ayrışmaz
  const textOnly = trimmed.replace(/\p{Emoji}+/gu, "").replace(/[‍️⃣]+/g, "").trim();
  if (!textOnly && _ART_PATTERNS.test(trimmed)) {
    return { kategoriler: ["resim"], karmasiklik: 2, rota: "skill", skill: "image", tahmini_butce: 150 };
  }

  // "seslendir: <içerik>" veya "speak this: <içerik>" gibi TTS komutlarında
  // içerik kısmı (`:` sonrası) yanlış kategori tetikleyebilir; sadece komut
  // kısmını (`:` öncesi) sınıflandırmak için kullan.
  const colonIdx = trimmed.indexOf(": ");
  const classifyText = colonIdx >= 5 ? trimmed.slice(0, colonIdx) : trimmed;

  const tokens = _tokenize(classifyText);

  const hits = [];
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (_matches(tokens, cat)) hits.push(name);
  }
  if (hits.length !== 1) return null;

  for (const t of tokens) {
    if (CONNECTORS.has(t)) return null;
  }

  const name = hits[0];
  const cat  = CATEGORIES[name];
  const karmasiklik = name === "sohbet" ? 1 : (trimmed.length <= 30 ? 1 : 2);

  return {
    kategoriler:   [name],
    karmasiklik,
    rota:          cat.rota,
    skill:         cat.skill,
    tahmini_butce: cat.budget,
  };
}

module.exports = { classify, CATEGORIES, CONNECTORS, MAX_INPUT_LENGTH };
