// tests/events.test.js — core/events.js + tools.js event entegrasyonu
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: emit() standart şema üretir ───────────────────────────────────────
test("emit: {type, sessionId, timestamp, payload} şeması", () => {
  delete require.cache[require.resolve("../core/events.ts")];
  const { emit, emitter } = require("../core/events.ts");

  const seen = [];
  emitter.once("event", e => seen.push(e));

  const ev = emit("tool_start", "sess-abc", { tool: "read_file", input: { path: "/tmp/x" } });

  assert.strictEqual(ev.type,      "tool_start");
  assert.strictEqual(ev.sessionId, "sess-abc");
  assert.ok(typeof ev.timestamp === "number", "timestamp sayı olmalı");
  assert.deepStrictEqual(ev.payload, { tool: "read_file", input: { path: "/tmp/x" } });
  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].type, "tool_start");
});

// ── Test 2: toNDJSON satır sonu ile NDJSON üretir ─────────────────────────────
test("toNDJSON: JSON + satır sonu", () => {
  const { emit, toNDJSON } = require("../core/events.ts");
  const ev   = emit("session_saved", "s1", { sessionId: "s1" });
  const line = toNDJSON(ev);
  assert.ok(line.endsWith("\n"), "satır sonu olmalı");
  const parsed = JSON.parse(line.trim());
  assert.strictEqual(parsed.type, "session_saved");
  assert.strictEqual(parsed.payload.sessionId, "s1");
});

// ── Test 3: sessionId null olabilir ──────────────────────────────────────────
test("emit: sessionId null → payload'a geçer", () => {
  const { emit } = require("../core/events.ts");
  const ev = emit("error", null, { message: "test hatası" });
  assert.strictEqual(ev.sessionId, null);
  assert.strictEqual(ev.payload.message, "test hatası");
});

// ── Test 4: callTool → tool_start + tool_end yayınlanır ──────────────────────
test("callTool: tool_start ve tool_end olayları yayınlanır", async () => {
  const { emitter } = require("../core/events.ts");

  // tools.js modülünü temizle (önceki require cache'i temizle)
  const toolsPath = require.resolve("../core/tools.js");
  delete require.cache[toolsPath];

  const toolsModule = require("../core/tools.js");

  const seen = [];
  function listener(ev) { seen.push(ev); }
  emitter.on("event", listener);

  // Olmayan araç — tool_start + tool_end(ok:false) beklenir
  await toolsModule.callTool("olmayan_arac", {}, "test-sess");

  emitter.off("event", listener);

  const starts = seen.filter(e => e.type === "tool_start");
  const ends   = seen.filter(e => e.type === "tool_end");

  assert.ok(starts.length >= 1,           "tool_start yayınlanmalı");
  assert.ok(ends.length >= 1,             "tool_end yayınlanmalı");
  assert.strictEqual(starts[0].sessionId, "test-sess");
  assert.strictEqual(starts[0].payload.tool, "olmayan_arac");
  assert.strictEqual(ends[0].payload.ok,   false);
  assert.strictEqual(ends[0].payload.error, "not found");
});

// ── Test 5: type bazlı listener çalışır ──────────────────────────────────────
test("emitter: type bazlı event dinleyici", () => {
  const { emit, emitter } = require("../core/events.ts");
  let count = 0;
  emitter.once("text_delta", () => count++);
  emit("text_delta", "s2", { delta: "merhaba " });
  emit("tool_start", "s2", { tool: "x" }); // bu text_delta değil, sayılmaz
  assert.strictEqual(count, 1);
});

// ── Test 6: callTool geriye dönük uyumluluk — sessionId opsiyonel ─────────────
test("callTool: sessionId olmadan çağrılabilir (geriye uyumluluk)", async () => {
  const toolsModule = require("../core/tools.js");
  // Sadece hata fırlatmaması yeterli
  const result = await toolsModule.callTool("olmayan_arac_2", {});
  assert.ok(typeof result === "string", "string sonuç döner");
});

// ── Test 7: EVENT_TYPES tüm beklenen tipler ────────────────────────────────────
test("EVENT_TYPES: 9 standart tip mevcut", () => {
  const { EVENT_TYPES } = require("../core/events.ts");
  const expected = [
    "tool_start", "tool_end", "diff", "thinking_delta", "text_delta",
    "approval_request", "approval_resolved", "error", "session_saved",
  ];
  for (const t of expected) {
    assert.strictEqual(EVENT_TYPES[t], t, `EVENT_TYPES.${t} eksik`);
  }
});

// ── Test 8: SSE listener temizlenir — memory leak yok ────────────────────────
// orion-server.js SSE handler'ının req.on('close') → emitter.off() zincirini simüle eder.
// Gerçek HTTP sunucusu başlatmadan, aynı singleton emitter üzerinde doğrulanır.
test("SSE: bağlantı kapanınca listener kaldırılır, listenerCount başlangıca döner", () => {
  // Tek bir referans — test dosyası boyunca aynı singleton
  const { emitter } = require("../core/events.ts");
  const { EventEmitter } = require("events");

  const before = emitter.listenerCount("event");

  // orion-server.js SSE handler'ının yaptığını birebir yansıt:
  const fakeReq = new EventEmitter();
  function onEvent() {} // no-op (testte içerik önemli değil)

  emitter.on("event", onEvent);
  fakeReq.on("close", () => {
    emitter.off("event", onEvent);
  });

  // Bağlantı açıkken listener eklendi mi?
  assert.strictEqual(
    emitter.listenerCount("event"),
    before + 1,
    "bağlantı süresince listener+1 olmalı"
  );

  // İstemci bağlantıyı kapatıyor
  fakeReq.emit("close");

  // Listener kaldırıldı mı?
  assert.strictEqual(
    emitter.listenerCount("event"),
    before,
    "close sonrası listenerCount başlangıca dönmeli — memory leak yok"
  );
});
