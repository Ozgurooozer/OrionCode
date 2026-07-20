// tests/provider.test.js — /provider komut testleri + maskedInput birim testi
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-prov-"));
process.env.ORION_HOME = HOME;
fs.mkdirSync(path.join(HOME, ".orion"), { recursive: true });

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: /provider key <name> <key> — key providers.json'a kaydedilir ─────
test("/provider key: anahtarı providers.json'a yazar, ekrana basmaz", async () => {
  // require chain temizle
  delete require.cache[require.resolve("../backends/custom.js")];

  const custom = require("../backends/custom.js");

  // Önce preset'i ekle (specs'e yaz)
  custom.addProvider("groq", {});

  // Konsol çıktısını yakala — key asla görünmemeli
  const printed = [];
  const origLog = console.log;
  console.log = (...a) => printed.push(a.join(" "));

  // Komutu doğrudan çalıştır (non-interactive path: args[0]="key")
  const cmd = require("../core/commands/provider.js")[0];
  await cmd.exec({ args: ["key", "groq", "sk-test-secret-key-1234567890"] });

  console.log = origLog;

  // Providers.json'ı oku — key kaydedilmeli
  const specs = custom.loadSpecs();
  assert.ok("groq" in specs, "groq specs'te olmalı");
  assert.ok(specs.groq.key, "key alanı var olmalı");

  // Key değerinin ne olduğunu ekrana yazdırmayacağız — sadece var olduğunu kontrol et
  // (test ortamında doğrulama için key değerini okumak zorundayız ama print test edelim)
  const outputText = printed.join("\n");
  assert.ok(!outputText.includes("sk-test-secret"), "key değeri konsola yazılmamış olmalı");
  assert.ok(!outputText.includes("1234567890"), "key değeri konsola yazılmamış olmalı");

  // Dosyayı temizle
  delete require.cache[require.resolve("../backends/custom.js")];
  try { fs.unlinkSync(path.join(HOME, ".orion", "providers.json")); } catch {}
});

// ── Test 2: maskedInput — karakterleri doğru biriktirir ──────────────────────
// maskedInput TTY gerektirir; non-TTY'de resolve("") döner.
// Burada davranışı mock stdin üzerinden test ediyoruz.
test("maskedInput: non-TTY ortamında boş string döner (pipe/test güvenliği)", async () => {
  // process.stdin.isTTY false olduğu için maskedInput hemen resolve("") döner
  const { maskedInput } = require("../tui/masked-input.js");
  const result = await maskedInput("Test prompt: ");
  assert.strictEqual(result, "", "TTY olmayan ortamda boş string dönmeli");
});

// ── Test 3: /provider add — preset eklenir ───────────────────────────────────
test("/provider add: preset sağlayıcı providers.json'a eklenir", async () => {
  delete require.cache[require.resolve("../backends/custom.js")];
  const custom = require("../backends/custom.js");
  const cmd    = require("../core/commands/provider.js")[0];

  const printed = [];
  const origLog = console.log;
  console.log = (...a) => printed.push(a.join(" "));

  await cmd.exec({ args: ["add", "deepseek"] });

  console.log = origLog;

  const specs = custom.loadSpecs();
  assert.ok("deepseek" in specs, "deepseek eklenmeli");
  assert.ok(specs.deepseek.baseURL, "baseURL mevcut olmalı");

  delete require.cache[require.resolve("../backends/custom.js")];
  try { fs.unlinkSync(path.join(HOME, ".orion", "providers.json")); } catch {}
});

// ── Test 4: /provider remove — provider kaldırılır ──────────────────────────
test("/provider remove: provider silinir", async () => {
  delete require.cache[require.resolve("../backends/custom.js")];
  const custom = require("../backends/custom.js");
  const cmd    = require("../core/commands/provider.js")[0];

  custom.addProvider("mistral", {});

  await cmd.exec({ args: ["remove", "mistral"] });

  const specs = custom.loadSpecs();
  assert.ok(!("mistral" in specs), "mistral kaldırılmış olmalı");

  delete require.cache[require.resolve("../backends/custom.js")];
  try { fs.unlinkSync(path.join(HOME, ".orion", "providers.json")); } catch {}
});

// ── Test 5: rl.pause/resume — REPL readline'ı interaktif çağrı etrafında izole edilir ──
// _withRlPause: rl.pause() çağrılmış mı, fn yürütülmüş mü, rl.resume() çağrılmış mı?
test("_withRlPause: rl.pause() çağrılır, fn çalışır, rl.resume() ile temizlenir", async () => {
  // saglayici.js modülünü doğrudan okumak yerine exec'i mock rl ile çağırıyoruz.
  // Non-TTY ortamda interaktif yola girmez; rl.pause/resume hâlâ çağrılır.
  const calls = [];
  const mockRl = {
    pause:  () => calls.push("pause"),
    resume: () => calls.push("resume"),
  };

  const cmd = require("../core/commands/provider.js")[0];
  // 'presets' subcommand non-TTY'de metin çıktısı verir; pause/resume test için yeterli
  await cmd.exec({ args: ["presets"], rl: mockRl });

  assert.ok(calls.includes("pause"),  "rl.pause() çağrılmış olmalı");
  assert.ok(calls.includes("resume"), "rl.resume() çağrılmış olmalı");
  assert.ok(calls.indexOf("pause") < calls.indexOf("resume"), "pause önce, resume sonra gelir");
});

// ── Test 6: çift render yok — non-TTY çıktısında aynı satır iki kez gözükmez ──
test("non-TTY /provider çıktısında mesaj tekrarı yok", async () => {
  delete require.cache[require.resolve("../backends/custom.js")];
  delete require.cache[require.resolve("../core/commands/provider.js")];

  const lines = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s, ...rest) => { lines.push(String(s)); return origWrite(s, ...rest); };

  const cmd = require("../core/commands/provider.js")[0];
  // Non-TTY'de metin fallback çalışır, clack devreye girmez
  await cmd.exec({ args: [] });

  process.stdout.write = origWrite;
  delete require.cache[require.resolve("../core/commands/provider.js")];

  const full = lines.join("");
  // ANSI kodlarını soy, düz metni karşılaştır
  const plain = full.replace(/\x1b\[[^m]*m/g, "");
  // "Provider" veya "Providers" ifadesinin iki kez geçmemesi (çift render yok)
  const provCount = (plain.match(/Providers/g) ?? []).length;
  assert.ok(provCount <= 1, `"Providers" ${provCount} kez geçti, en fazla 1 bekleniyor (çift render yok)`);
});
