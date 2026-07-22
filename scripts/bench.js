// scripts/bench.js — Başlangıç süresi + RAM ölçümü (jcode'un yayınladığı metriklerin karşılığı)
// Kullanım: node scripts/bench.js [tekrar]
// orion.js --bench: arayüz hazır olduğu anda süreyi ve RSS'i basıp çıkar.
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const ROOT  = path.join(__dirname, "..");
const RUNS  = parseInt(process.argv[2] ?? "3", 10);
const results = [];

for (let i = 0; i < RUNS; i++) {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", path.join(ROOT, "orion.ts"), "--bench"], {
    cwd: ROOT, encoding: "utf8", timeout: 60_000,
  });
  const m = (r.stdout ?? "").match(/BENCH (\{.*\})/);
  if (!m) { console.error(`koşu ${i + 1}: BENCH satırı yok\n${(r.stdout ?? "").slice(-300)}\n${(r.stderr ?? "").slice(-300)}`); continue; }
  const data = JSON.parse(m[1]);
  results.push(data);
  console.log(`koşu ${i + 1}: ${data.startupMs}ms, ${data.rssMB}MB RSS`);
}

if (results.length) {
  const med = arr => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  console.log(`\nmedyan: ${med(results.map(r => r.startupMs))}ms başlangıç, ${med(results.map(r => r.rssMB))}MB RSS (${results.length} koşu)`);
} else {
  process.exit(1);
}
