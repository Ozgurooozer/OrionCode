// scripts/tayf_distill.js — Meissa loglarından TAYF için iki ayrı çıktı üretir:
// 1) başarılı satırlardan rota/kategori dağılımı, 2) hata/fallback satırlarının ham listesi.
// İkincisi ayrı tutulur çünkü davranışsal kategori adayları (sosyal_temas, rol-karışması)
// tam olarak output_parsed==null / error!=null satırlarının içinde yaşıyor — dağılıma
// karışırsa görünmez olurlar.
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const dir = process.env.ORION_HOME
  ? path.join(process.env.ORION_HOME, "meissa_runs")
  : path.join(os.homedir(), ".orion", "meissa_runs");

const files = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl"));
const entries = files.flatMap(f =>
  fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n")
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
);

const success = entries.filter(e => e.error == null && e.output_parsed != null);
const failed  = entries.filter(e => e.error != null || e.output_parsed == null);

const rota = {};
const kat  = {};
success.forEach(e => {
  const r = e.output_parsed?.rota ?? "unknown";
  rota[r] = (rota[r] ?? 0) + 1;
  for (const k of e.output_parsed?.kategoriler ?? []) kat[k] = (kat[k] ?? 0) + 1;
});

// level × kategori çapraz tablo — hangi kategori hep LLM'e mi düşüyor,
// hangisi Seviye 0'da rahatça çözülüyor (level alanı olmayan eski satırlar
// için level "pre-level0" kovasına düşer, ayrı tutulur).
const levelByKat = {};
success.forEach(e => {
  const lvl = "level" in e ? String(e.level) : "pre-level0";
  for (const k of e.output_parsed?.kategoriler ?? []) {
    levelByKat[k] = levelByKat[k] ?? {};
    levelByKat[k][lvl] = (levelByKat[k][lvl] ?? 0) + 1;
  }
});

console.log("=== BAŞARILI DAĞILIM ===");
console.log("Toplam başarılı:", success.length, "/", entries.length);
console.log("Rota:", JSON.stringify(rota, null, 2));
console.log("Kategoriler:", JSON.stringify(kat, null, 2));
console.log("Kategori × Seviye:", JSON.stringify(levelByKat, null, 2));

// ── Level0 kapsama (kategori başına) ─────────────────────────────────────────
// Yeni format kayıtlarda level=0 veya level=2; eski format level alanı yok.
const newFormatSuccess = success.filter(e => "level" in e);
if (newFormatSuccess.length > 0) {
  const level0Count = newFormatSuccess.filter(e => e.level === 0).length;
  const level2Count = newFormatSuccess.filter(e => e.level === 2).length;
  console.log("\n=== LEVEL0 KAPSAMA (" + newFormatSuccess.length + " yeni kayıt) ===");
  console.log(`Level 0 (kural/LLM'siz): ${level0Count} (${Math.round(level0Count/newFormatSuccess.length*100)}%)`);
  console.log(`Level 2 (LLM kararı):    ${level2Count} (${Math.round(level2Count/newFormatSuccess.length*100)}%)`);
}

// ── Edimsöz dağılımı ─────────────────────────────────────────────────────────
// Yalnızca meissa.ts güncellenmesinden sonra yazılan kayıtlarda edim alanı var.
const edimEntries = entries.filter(e => e.edim != null);
if (edimEntries.length > 0) {
  const edimDist  = {};
  const edimByKat = {};
  let ctxDep = 0;
  edimEntries.forEach(e => {
    edimDist[e.edim] = (edimDist[e.edim] ?? 0) + 1;
    if (e.context_dependent) ctxDep++;
    for (const k of e.output_parsed?.kategoriler ?? []) {
      edimByKat[k] = edimByKat[k] ?? {};
      edimByKat[k][e.edim] = (edimByKat[k][e.edim] ?? 0) + 1;
    }
  });
  console.log("\n=== EDİMSÖZ DAĞILIMI (" + edimEntries.length + " kayıt) ===");
  console.log("Edimsöz tipi:", JSON.stringify(edimDist, null, 2));
  console.log(`Bağlam-bağımlı: ${ctxDep} / ${edimEntries.length} (${Math.round(ctxDep/edimEntries.length*100)}%)`);
  console.log("Kategori × Edimsöz:", JSON.stringify(edimByKat, null, 2));

  // Rota × edimsöz — "sohbet isteği" skill'e gitmiş mi?
  const rotaByEdim = {};
  edimEntries.filter(e => e.output_parsed?.rota).forEach(e => {
    const r = e.output_parsed.rota;
    rotaByEdim[e.edim] = rotaByEdim[e.edim] ?? {};
    rotaByEdim[e.edim][r] = (rotaByEdim[e.edim][r] ?? 0) + 1;
  });
  console.log("Edimsöz × Rota (false skill routing tespiti):", JSON.stringify(rotaByEdim, null, 2));
} else {
  console.log("\n=== EDİMSÖZ: eski format kayıtlar, meissa.ts güncellenmesinden önceki log ===");
  console.log("    Yeni sınıflandırmalar başladıkça burada edimsöz dağılımı görünecek.");
}

console.log("\n=== HATA/FALLBACK LİSTESİ (" + failed.length + " satır) ===");
failed.forEach(e => {
  console.log("---");
  console.log("input_hash:", e.input_hash, "| error:", e.error, "| input_length:", e.input_length);
  console.log("output_raw:", (e.output_raw ?? "").slice(0, 300));
});
