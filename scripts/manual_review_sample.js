// scripts/manual_review_sample.js — İ2 (Sentor Anlaşması) elle-50-mesaj kontrolü için hazırlık.
// Karar (doğru/yanlış) insanın kası — bu script yalnızca hash'ten gerçek metni
// geri çözüp, kategori/rota/skill sonucuyla eşleştirilmiş, işaretlenebilir bir
// liste üretir. TAYF/ELLE_KONTROL_50.md olarak yazar.
"use strict";

const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");

const { TEST_MESSAGES } = require("./lib/test_messages.js");

const dir = process.env.ORION_HOME
  ? path.join(process.env.ORION_HOME, "meissa_runs")
  : path.join(os.homedir(), ".orion", "meissa_runs");

// hash → gerçek metin (batch script her zaman aynı sabit kümeden çektiği için geri çözülebilir)
const hashToText = new Map();
for (const msg of TEST_MESSAGES) {
  const truncated = String(msg).slice(0, 4000); // meissa.ts maxInputLength ile aynı kesme
  const h = crypto.createHash("sha1").update(truncated).digest("hex").slice(0, 8);
  hashToText.set(h, msg);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl"));
const entries = files.flatMap(f =>
  fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n")
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
);

// Yalnızca başarılı ayrıştırılmış, gerçek metne geri çözülebilen satırlar aday.
const candidates = entries.filter(e =>
  e.error == null && e.output_parsed != null && hashToText.has(e.input_hash)
);

// Her benzersiz girdi metninden bir örnek — en güncel (timestamp en büyük) olan.
const byText = new Map();
for (const e of candidates) {
  const text = hashToText.get(e.input_hash);
  const prev = byText.get(text);
  if (!prev || e.timestamp > prev.timestamp) byText.set(text, e);
}

let rows = [...byText.entries()].map(([text, e]) => ({ text, ...e }));

// Kategoriye göre grupla, dağılımı koru (tek kategoride yığılma olmasın).
rows.sort((a, b) => {
  const ka = (a.output_parsed.kategoriler ?? []).join(",");
  const kb = (b.output_parsed.kategoriler ?? []).join(",");
  return ka.localeCompare(kb) || a.text.localeCompare(b.text);
});

const LIMIT = 50;
const sample = rows.slice(0, LIMIT);

const lines = [];
lines.push("# Elle 50-Mesaj Kontrolü — İ2 (Sentor Anlaşması)");
lines.push("");
lines.push(`**Tarih:** ${new Date().toISOString().slice(0, 10)}`);
lines.push(`**Kaynak:** ${dir} (${entries.length} satır, ${rows.length} benzersiz başarılı girdi bulundu, ${sample.length} örneklendi)`);
lines.push("**Kural:** Bu listeyi ben (AI) doldurmadım — kategori/rota/skill isabeti tamamen senin kararın. ✅ = doğru, ❌ = yanlış, not sütununa neden yanlış olduğunu yaz.");
lines.push("");
lines.push("| # | Girdi | Kategoriler | Rota | Skill | Karmaşıklık | Level | ✅/❌ | Not |");
lines.push("|---|---|---|---|---|---|---|---|---|");

sample.forEach((r, i) => {
  const p = r.output_parsed;
  const lvl = "level" in r ? String(r.level) : "?";
  const textEsc = r.text.replace(/\|/g, "\\|").replace(/\n/g, "↵");
  lines.push(`| ${i + 1} | ${textEsc} | ${p.kategoriler.join(", ")} | ${p.rota} | ${p.skill ?? "—"} | ${p.karmasiklik} | ${lvl} | | |`);
});

lines.push("");
lines.push(`**Sonuç (kontrol bitince doldur):** __ / ${sample.length} doğru → isabet oranı __%`);
lines.push("");
lines.push("**Hafta 1 kapanış koşulu (MVP_PLAN_v1.1.md İ2):** Bu tablo işaretlenip isabet oranı yazılmadan Hafta 1 resmi kapanmaz.");

const outPath = path.join(__dirname, "..", "TAYF", "ELLE_KONTROL_50.md");
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

console.log(`Yazıldı: ${outPath}`);
console.log(`Benzersiz başarılı girdi: ${rows.length}, örneklenen: ${sample.length}`);
if (rows.length < LIMIT) {
  console.log(`UYARI: ${LIMIT} istendi ama yalnızca ${rows.length} benzersiz başarılı girdi var (TEST_MESSAGES ${TEST_MESSAGES.length} mesaj içeriyor, bir kısmı Kazıcı saçma girdisi olduğu için hiç ayrıştırılamıyor).`);
}
