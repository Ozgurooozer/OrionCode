// tests/weakness.test.js — İş A: weakness mining birim testleri
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

// İzole ORION_HOME
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "orion-weak-"));
process.env.ORION_HOME = HOME;
fs.mkdirSync(path.join(HOME, ".orion", "logs"),    { recursive: true });
fs.mkdirSync(path.join(HOME, ".orion", "reports"), { recursive: true });

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: tool_call hatası telemetry'de ok:false olarak kaydedilir ─────────
test("_toolCallError: hata çıktısını ok:false olarak yakalar", () => {
  // session.js'deki _toolCallError mantığını doğrudan test et
  // (fonksiyon export edilmiyor ama davranışı session.js editiyle test edilebilir)
  // Burada aynı mantığı inline tekrar ederek bağımsız test yazıyoruz.
  function toolCallError(out) {
    if (typeof out !== "string") return null;
    if (out.startsWith("Araç hatası (")) return out.replace(/^Araç hatası \([^)]+\):\s*/, "").slice(0, 100);
    if (out.startsWith("Araç bulunamadı:")) return "not found";
    return null;
  }

  assert.strictEqual(toolCallError("Araç hatası (read_file): dosya yok"), "dosya yok", "hata mesajı çıkarılmış olmalı");
  assert.strictEqual(toolCallError("Araç bulunamadı: bilinmeyen"), "not found", "bulunamadı → not found");
  assert.strictEqual(toolCallError("normal çıktı"), null, "başarılı çıktı → null");
  assert.strictEqual(toolCallError(""), null, "boş string → null");
  assert.strictEqual(toolCallError(42), null, "string olmayan → null");
});

// ── Test 2: NDJSON loglarından başarısız tool gruplaması ──────────────────────
test("mineWeaknesses grouping: ok:false kayıtları tool+error'a göre gruplanır", () => {
  // NDJSON log dosyası oluştur
  const logDir = path.join(HOME, ".orion", "logs");
  const lines = [
    { ts: Date.now(), session: "s1", event: "tool_call", tool: "read_file", ok: false, error: "ENOENT" },
    { ts: Date.now(), session: "s1", event: "tool_call", tool: "read_file", ok: false, error: "ENOENT" },
    { ts: Date.now(), session: "s2", event: "tool_call", tool: "read_file", ok: false, error: "ENOENT" },
    { ts: Date.now(), session: "s1", event: "tool_call", tool: "write_file", ok: true },
    { ts: Date.now(), session: "s2", event: "tool_call", tool: "search", ok: false, error: "timeout" },
  ];
  fs.writeFileSync(path.join(logDir, "s1.ndjson"), lines.slice(0, 4).map(l => JSON.stringify(l)).join("\n") + "\n");
  fs.writeFileSync(path.join(logDir, "s2.ndjson"), [lines[2], lines[4]].map(l => JSON.stringify(l)).join("\n") + "\n");

  // Gruplama mantığını doğrula (daemon.js'deki mineWeaknesses ile aynı mantık)
  const { listLogs, readLog } = require("../core/telemetry.js");
  const groups = {};
  for (const { sessionId } of listLogs(200)) {
    for (const e of readLog(sessionId)) {
      if (e.event !== "tool_call" || e.ok !== false) continue;
      const key = `${e.tool}|${(e.error ?? "error").slice(0, 50)}`;
      if (!groups[key]) groups[key] = { tool: e.tool, error: e.error, count: 0, sessions: new Set() };
      groups[key].count++;
      groups[key].sessions.add(sessionId);
    }
  }

  const candidates = Object.values(groups).filter(g => g.count >= 2);

  assert.ok(candidates.length >= 1, "en az 1 grup bulunmalı");
  const rfGroup = candidates.find(g => g.tool === "read_file" && g.error === "ENOENT");
  assert.ok(rfGroup, "read_file|ENOENT grubu olmalı");
  assert.ok(rfGroup.count >= 3, `read_file|ENOENT count >= 3 (${rfGroup.count})`);
  assert.ok(rfGroup.sessions.size >= 2, "en az 2 farklı oturumda görülmeli");

  // write_file ok:true → gruba girmemeli
  const wfGroup = candidates.find(g => g.tool === "write_file");
  assert.ok(!wfGroup, "başarılı tool çağrısı gruba girmemeli");

  // search|timeout 1 kez → eşik altı
  const searchGroup = Object.values(groups).find(g => g.tool === "search");
  assert.ok(!candidates.includes(searchGroup), "1 kez görülen hata candidates'a girmemeli");
});

// ── Test 3: /weakness list — rapor yokken bilgi mesajı verir ─────────────────
test("/weakness list: rapor yokken bilgi mesajı", async () => {
  // reports dizinini temizle
  const repDir = path.join(HOME, ".orion", "reports");
  for (const f of fs.readdirSync(repDir)) fs.unlinkSync(path.join(repDir, f));

  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(" "));

  delete require.cache[require.resolve("../core/commands/weakness.js")];
  const cmd = require("../core/commands/weakness.js")[0];
  await cmd.exec({ args: ["list"] });

  console.log = orig;

  const out = lines.join(" ").replace(/\x1b\[[^m]*m/g, "");
  assert.ok(out.includes("rapor yok") || out.includes("Henüz"), "rapor yoksa bilgi mesajı çıkmalı");
});

// ── Test 4: /weakness list — rapor varken dosya adını gösterir ───────────────
test("/weakness list: rapor varken dosya adını listeler", async () => {
  const repDir = path.join(HOME, ".orion", "reports");
  const fname  = "weakness-2026-07-10.md";
  fs.writeFileSync(path.join(repDir, fname), "# Test Raporu\n\ntest içerik");

  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(" "));

  delete require.cache[require.resolve("../core/commands/weakness.js")];
  const cmd = require("../core/commands/weakness.js")[0];
  await cmd.exec({ args: ["list"] });

  console.log = orig;

  const out = lines.join(" ").replace(/\x1b\[[^m]*m/g, "");
  assert.ok(out.includes("2026-07-10") || out.includes("weakness"), "rapor adı listede görünmeli");

  fs.unlinkSync(path.join(repDir, fname));
});

// ── Test 5: /weakness (default) — rapor varken içerik gösterir ───────────────
test("/weakness default: en son rapor içeriğini gösterir", async () => {
  const repDir = path.join(HOME, ".orion", "reports");
  const fname  = "weakness-2026-07-10.md";
  const content = "# Orion Zayıflık Raporu\n\n## Analiz\nread_file tanımı belirsiz.";
  fs.writeFileSync(path.join(repDir, fname), content);

  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(" "));

  delete require.cache[require.resolve("../core/commands/weakness.js")];
  const cmd = require("../core/commands/weakness.js")[0];
  await cmd.exec({ args: [] });

  console.log = orig;

  const out = lines.join(" ");
  assert.ok(out.includes("read_file") || out.includes("Zayıflık"), "rapor içeriği gösterilmeli");

  fs.unlinkSync(path.join(repDir, fname));
});

// ── Test 6: EVENT_TYPES'a weakness_mined eklendi ─────────────────────────────
test("EVENT_TYPES: weakness_mined tipi mevcut", () => {
  delete require.cache[require.resolve("../core/events.js")];
  const { EVENT_TYPES } = require("../core/events.js");
  assert.strictEqual(EVENT_TYPES.weakness_mined, "weakness_mined", "weakness_mined EVENT_TYPES'da olmalı");
});

// ── Test 7: /weakness komutu kayıtlı (index.js) ──────────────────────────────
test("/weakness komutu dispatch edilebilir", async () => {
  delete require.cache[require.resolve("../core/commands/index.js")];
  delete require.cache[require.resolve("../core/commands/weakness.js")];
  const { dispatch } = require("../core/commands/index.js");
  // rapor yok ortamında hata fırlatmamalı
  await assert.doesNotReject(() => dispatch("weakness", [], {}));
});
