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

console.log("=== BAŞARILI DAĞILIM ===");
console.log("Toplam başarılı:", success.length, "/", entries.length);
console.log("Rota:", JSON.stringify(rota, null, 2));
console.log("Kategoriler:", JSON.stringify(kat, null, 2));

console.log("\n=== HATA/FALLBACK LİSTESİ (" + failed.length + " satır) ===");
failed.forEach(e => {
  console.log("---");
  console.log("input_hash:", e.input_hash, "| error:", e.error, "| input_length:", e.input_length);
  console.log("output_raw:", (e.output_raw ?? "").slice(0, 300));
});
