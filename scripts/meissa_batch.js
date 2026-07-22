#!/usr/bin/env node
// scripts/meissa_batch.js — Meissa 100 koşu batch runner
// Ollama çalışıyor olmalı. Log ~/.orion/meissa_runs/ altına yazılır.
// Çalıştırma: node scripts/meissa_batch.js [--count 100] [--delay 500]
"use strict";

const path  = require("path");
const fs    = require("fs");
const os    = require("os");

const args    = process.argv.slice(2);
const COUNT   = parseInt(args[args.indexOf("--count")  + 1] ?? "100") || 100;
const DELAY   = parseInt(args[args.indexOf("--delay")  + 1] ?? "300") || 300;

// Test mesajları — gerçek kullanım senaryolarını ve Kazıcı saçma testlerini kapsar.
// Tek kaynak: scripts/lib/test_messages.js (manual_review_sample.js da buradan okur).
const { TEST_MESSAGES } = require("./lib/test_messages.js");

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const meissa = require("../core/agents/meissa.ts");

  // Kaç mesaj, döngüyle doldur
  const messages = [];
  while (messages.length < COUNT) {
    for (const m of TEST_MESSAGES) {
      if (messages.length >= COUNT) break;
      messages.push(m);
    }
  }

  const logDir  = meissa.logPath();
  const results = { total: 0, parsed: 0, fallback: 0, errors: 0, byRota: {}, byLevel: {} };

  console.log(`\nMeissa Batch Runner — ${COUNT} koşu, ${DELAY}ms gecikme`);
  console.log(`Log: ${logDir}\n`);

  const bar = Math.floor(COUNT / 20);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    try {
      const r = await meissa.run(msg, { sessionId: "batch" });
      results.total++;
      if (r._meta.error) results.errors++;
      else results.parsed++;
      if (r._meta.error === "empty_input") results.fallback++;
      results.byRota[r.rota] = (results.byRota[r.rota] ?? 0) + 1;
      const lvl = r._meta.level === 0 ? "level0" : r._meta.level === 2 ? "level2_llm" : "guard";
      results.byLevel[lvl] = (results.byLevel[lvl] ?? 0) + 1;

      if ((i + 1) % bar === 0 || i === messages.length - 1) {
        const pct  = Math.round((i + 1) / COUNT * 100);
        const done = Math.round(pct / 5);
        process.stdout.write(`\r[${"█".repeat(done)}${"░".repeat(20 - done)}] ${pct}% (${i+1}/${COUNT}) rota:${JSON.stringify(results.byRota)}`);
      }
    } catch (e) {
      results.errors++;
      results.total++;
    }
    if (i < messages.length - 1) await sleep(DELAY);
  }

  const parseRate = results.total > 0 ? Math.round(results.parsed / results.total * 100) : 0;

  console.log("\n\n=== BATCH SONUÇLARI ===");
  console.log(`Toplam     : ${results.total}`);
  console.log(`Parse başarı: ${results.parsed} (%${parseRate})`);
  console.log(`Fallback   : ${results.fallback}`);
  console.log(`Hata       : ${results.errors}`);
  console.log(`Rota dağılımı: ${JSON.stringify(results.byRota, null, 2)}`);
  console.log(`Seviye dağılımı: ${JSON.stringify(results.byLevel, null, 2)}`);
  console.log(`\nLog dosyası: ${logDir}`);

  if (parseRate >= 90) {
    console.log("\n✓ GEÇTI — parse başarısı ≥90% (Meissa MVP kriteri)");
  } else {
    console.log(`\n✗ BAŞARISIZ — parse başarısı ${parseRate}% < 90%`);
  }
}

main().catch(e => { console.error("Batch runner hatası:", e.message); process.exit(1); });
