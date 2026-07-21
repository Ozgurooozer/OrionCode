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

// Test mesajları — gerçek kullanım senaryolarını ve Kazıcı saçma testlerini kapsar
const TEST_MESSAGES = [
  // Resim/görsel (image skill)
  "bana bir cyberpunk kız çiz",
  "siberpunk şehri görseli oluştur",
  "anime karakteri resim yap",
  "fantasy ortam görsel",
  "draw a space station",
  "generate an image of a dragon",
  "pixel art knight sprite",
  "retro scifi robot",
  "3d render of a mountain",
  "portrait of an elf warrior",

  // Ses/TTS (voice skill)
  "bu metni seslendir: Merhaba Dünya",
  "oku: Orion hazır",
  "speak this: hello world",
  "sesli oku şunu",

  // Kod
  "python'da fibonacci yaz",
  "javascript async await örneği",
  "typescript interface nedir",
  "sql join açıkla",
  "git rebase ne işe yarar",
  "docker container nasıl çalışır",

  // Analiz
  "bu kodu analiz et: for(let i=0;i<10;i++){}",
  "performans sorunlarını bul",
  "bug nerede olabilir",
  "memory leak tespiti",

  // Yazı
  "bir blog yazısı yaz yapay zeka hakkında",
  "README.md dosyası oluştur",
  "commit mesajı öner",
  "teknik doküman taslağı",

  // Sohbet/Genel
  "merhaba nasılsın",
  "bugün hava nasıl",
  "ne yapabilirim",
  "yardım et",
  "teşekkürler",
  "tamam anladım",

  // Orchestration
  "bir karakter çiz ve ardından seslendir",
  "kod yaz test et ve dokümante et",
  "animasyon oluştur ve kaydet",

  // Karmaşık (3)
  "proje planı oluştur, milestone'ları belirle, takıma dağıt",
  "kod review yap, bug bul, düzelt, test yaz, PR aç",

  // Türkçe slang / informal
  "abi bi resim at",
  "hocam kod yazıver",
  "kanka anime çiz",
  "bunu sesle okusana",

  // İngilizce
  "what is quantum computing",
  "explain neural networks",
  "how does TCP/IP work",
  "write a haiku about programming",

  // Kazıcı saçma girdiler (10 adet)
  "💀💀💀💀💀",
  "a".repeat(200),  // truncated versiyonu
  "",               // boş (otomatik FALLBACK)
  "\n\n\n",
  "\t\t\t",
  "'; DROP TABLE users; --",
  "🎨🖼️👨‍💻",
  "Ey Türkçe sözler sızlatır yüreğimi ".repeat(5),
  "resim yap resim yap resim yap ".repeat(10),
  "x".repeat(500),
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const meissa = require("../core/agents/meissa.js");

  // Kaç mesaj, döngüyle doldur
  const messages = [];
  while (messages.length < COUNT) {
    for (const m of TEST_MESSAGES) {
      if (messages.length >= COUNT) break;
      messages.push(m);
    }
  }

  const logDir  = meissa.logPath();
  const results = { total: 0, parsed: 0, fallback: 0, errors: 0, byRota: {} };

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
  console.log(`\nLog dosyası: ${logDir}`);

  if (parseRate >= 90) {
    console.log("\n✓ GEÇTI — parse başarısı ≥90% (Meissa MVP kriteri)");
  } else {
    console.log(`\n✗ BAŞARISIZ — parse başarısı ${parseRate}% < 90%`);
  }
}

main().catch(e => { console.error("Batch runner hatası:", e.message); process.exit(1); });
