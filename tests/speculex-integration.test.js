// tests/speculex-integration.test.js — Speculex × session entegrasyonu
// KATI SINIR kanıtı: write_file / edit_file / run_command SPEKÜLATİF TETİKLENEMEZ.
// Ayrıca speculex_hit / speculex_miss olay yayınını doğrular (events.js değişmeden).
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");

const { SpeculativeCache, startPrefetch } = require("../core/speculex.js");
const { emitter } = require("../core/events.ts");

// Olay toplayıcı — dinleyiciyi eklerken kaldırma fonksiyonunu döndürür
function collectEvents(types) {
  const seen = [];
  const listener = ev => { if (types.includes(ev.type)) seen.push(ev); };
  emitter.on("event", listener);
  return { seen, stop: () => emitter.off("event", listener) };
}

// ── Test 1: KATI SINIR — tahminci yazma araçları döndürse bile ASLA çalışmaz ──
// Tier1 tahmincisi (mock) kasıtlı olarak write_file/edit_file/run_command üretir;
// startPrefetch bunların HİÇBİRİNİ çalıştırmamalı, yalnızca read_file prefetch edilmeli.
test("KATI SINIR: write_file/edit_file/run_command spekülatif tetiklenemez", async () => {
  const extract = require("../core/extract.js");
  const tools   = require("../core/tools.ts");
  const origFetch   = global.fetch;
  const origRequest = extract.ollamaRequest;
  const origCall    = tools.callTool;

  const executed = []; // spekülatif olarak fiilen çalıştırılan araçlar
  try {
    // Ollama ping'i sağlıklı görünsün (gerçek ağ yok)
    global.fetch = async () => ({ ok: true, text: async () => "" });
    // Kötü niyetli / bozuk tahmin: 3 yazma aracı + 1 güvenli araç
    const malicious = [
      { name: "write_file",  input: { path: "C:/tehlike.txt", content: "ZARAR" } },
      { name: "edit_file",   input: { path: "C:/tehlike.txt" } },
      { name: "run_command", input: { command: "del /q *" } },
      { name: "read_file",   input: { path: "/proje/a.js" } },
    ];
    extract.ollamaRequest = async () => JSON.stringify(malicious);
    tools.callTool = async (name, input) => { executed.push(name); return "dosya içeriği"; };

    const cache = new SpeculativeCache();
    await startPrefetch(cache, "dosyayı sil ve yeniden yaz", { ollamaHost: "http://localhost:11434", tier1Model: "m" }, "sess-kanit", null);

    // Yazma araçları fiilen ÇALIŞTIRILMADI ve önbellekten dönmüyor
    for (const call of malicious.slice(0, 3)) {
      assert.ok(!executed.includes(call.name), `${call.name} spekülatif ÇALIŞTIRILMAMALI`);
      assert.strictEqual(cache.get(call.name, call.input), null, `${call.name} önbellekten DÖNMEMELI`);
    }
    // Önbellekte güvensiz iz yok
    assert.ok(!cache.hasUnsafe(), "önbellekte güvensiz araç OLMAMALI");
    // Güvenli araç normal prefetch edildi — mekanizma çalışıyor, sınır seçici
    assert.deepStrictEqual(executed, ["read_file"], "yalnızca read_file spekülatif çalışmalı");
    assert.strictEqual(cache.get("read_file", { path: "/proje/a.js" }), "dosya içeriği");
  } finally {
    global.fetch          = origFetch;
    extract.ollamaRequest = origRequest;
    tools.callTool        = origCall;
  }
});

// ── Test 2: isabet — _callToolCached önbellekten döner ve speculex_hit yayınlar ─
test("_callToolCached: isabet → önbellekten anında dönüş + speculex_hit olayı", async () => {
  const { _callToolCached } = require("../core/session.ts");
  const tools = require("../core/tools.ts");
  const origCall = tools.callTool;

  const realCalls = [];
  const ev = collectEvents(["speculex_hit", "speculex_miss"]);
  try {
    tools.callTool = async name => { realCalls.push(name); return "GERÇEK sonuç"; };

    const cache = new SpeculativeCache();
    cache.set("read_file", { path: "/a.js" }, "SPEKÜLATİF sonuç");

    const out = await _callToolCached(cache, "read_file", { path: "/a.js" }, "sess-hit", { record() {} });

    assert.strictEqual(out, "SPEKÜLATİF sonuç", "isabet önbellekten dönmeli");
    assert.strictEqual(realCalls.length, 0, "isabette gerçek araç ÇAĞRILMAMALI");
    const hits = ev.seen.filter(e => e.type === "speculex_hit");
    assert.strictEqual(hits.length, 1, "1 speculex_hit yayınlanmalı");
    assert.strictEqual(hits[0].sessionId, "sess-hit");
    assert.strictEqual(hits[0].payload.tool, "read_file");

    // Iska: önbellekte olmayan çağrı gerçek aracı çalıştırır, speculex_hit yayınlamaz
    const out2 = await _callToolCached(cache, "read_file", { path: "/baska.js" }, "sess-hit", { record() {} });
    assert.strictEqual(out2, "GERÇEK sonuç", "ıskada akış bugünkü gibi devam etmeli");
    assert.deepStrictEqual(realCalls, ["read_file"], "ıskada gerçek araç çağrılmalı");
    assert.strictEqual(ev.seen.filter(e => e.type === "speculex_hit").length, 1, "ıskada speculex_hit YAYINLANMAZ");
  } finally {
    tools.callTool = origCall;
    ev.stop();
  }
});

// ── Test 3: derinlemesine savunma — write girdisi zorla enjekte edilse bile dönmez ─
// set() çitini bypass edip _cache'e doğrudan write_file girdisi yazılsa dahi
// get() tarafındaki SAFE_TOOLS çiti önbellekten dönüşü engeller: gerçek araç çalışır.
test("_callToolCached: zorla enjekte edilmiş write_file girdisi asla isabet almaz", async () => {
  const { _callToolCached } = require("../core/session.ts");
  const tools = require("../core/tools.ts");
  const origCall = tools.callTool;

  const realCalls = [];
  const ev = collectEvents(["speculex_hit"]);
  try {
    tools.callTool = async name => { realCalls.push(name); return "gerçek yürütme"; };

    const cache = new SpeculativeCache();
    // set() bypass — saldırgan senaryosu
    cache._cache.set(`write_file\0${JSON.stringify({ path: "/x" })}`, { result: "ZEHİRLİ", ts: Date.now(), tool: "write_file", consumed: false });

    const out = await _callToolCached(cache, "write_file", { path: "/x" }, "sess-def", { record() {} });

    assert.strictEqual(out, "gerçek yürütme", "write_file DAİMA gerçek yoldan çalışmalı");
    assert.deepStrictEqual(realCalls, ["write_file"], "gerçek araç çağrılmalı");
    assert.strictEqual(ev.seen.length, 0, "write_file için speculex_hit YAYINLANMAZ");
  } finally {
    tools.callTool = origCall;
    ev.stop();
  }
});

// ── Test 4: ıska süpürmesi — tüketilmeyen tahminler speculex_miss olarak yayınlanır ─
test("_sweepSpeculexMisses: kullanılmayan tahmin ıska, tüketilen değil; generation çiti", () => {
  const { _sweepSpeculexMisses } = require("../core/session.ts");

  const cache = new SpeculativeCache();
  cache.set("read_file", { path: "/a" }, "içerik a");
  cache.set("search",    { query: "x" }, "sonuç x");
  cache.get("read_file", { path: "/a" }); // tüketildi → isabet adayı, ıska değil

  const ev = collectEvents(["speculex_miss"]);
  try {
    _sweepSpeculexMisses(cache, cache.generation, "sess-miss");
    assert.strictEqual(ev.seen.length, 1, "yalnızca tüketilmeyen girdi ıska sayılmalı");
    assert.strictEqual(ev.seen[0].payload.tool, "search");
    assert.strictEqual(ev.seen[0].payload.reason, "unused");
    assert.strictEqual(ev.seen[0].sessionId, "sess-miss");

    // İkinci süpürme: her şey zaten atıldı — yeni olay yok
    _sweepSpeculexMisses(cache, cache.generation, "sess-miss");
    assert.strictEqual(ev.seen.length, 1, "ikinci süpürme yeni ıska üretmemeli");

    // Generation çiti: geç biten eski süpürme yeni turun taze girdisini boşaltamaz
    const oldGen = cache.generation;
    cache.clear(); // yeni tur → generation artar
    cache.set("list_files", { path: "/" }, "[dosyalar]");
    _sweepSpeculexMisses(cache, oldGen, "sess-miss");
    assert.strictEqual(ev.seen.length, 1, "eski generation süpürmesi olay YAYINLAMAMALI");
    assert.strictEqual(cache.get("list_files", { path: "/" }), "[dosyalar]", "taze girdi yerinde kalmalı");
  } finally {
    ev.stop();
  }
});

// ── Test 5: TTL kaçırması sessionId ile speculex_miss (reason: ttl) yayınlar ──
test("SpeculativeCache.get: TTL geçmiş girdi sessionId ile ıska olayı üretir", () => {
  const cache = new SpeculativeCache();
  cache._cache.set(`read_file\0${JSON.stringify({ path: "/eski" })}`, { result: "bayat", ts: Date.now() - 31_000, tool: "read_file", consumed: false });

  const ev = collectEvents(["speculex_miss"]);
  try {
    const out = cache.get("read_file", { path: "/eski" }, "sess-ttl");
    assert.strictEqual(out, null, "TTL geçmiş girdi null dönmeli");
    assert.strictEqual(ev.seen.length, 1, "1 speculex_miss yayınlanmalı");
    assert.strictEqual(ev.seen[0].payload.reason, "ttl");

    // sessionId verilmezse (eski çağrı imzası) olay yayınlanmaz — geriye uyumluluk
    cache._cache.set(`read_file\0${JSON.stringify({ path: "/eski2" })}`, { result: "bayat", ts: Date.now() - 31_000 });
    cache.get("read_file", { path: "/eski2" });
    assert.strictEqual(ev.seen.length, 1, "sessionId'siz TTL kaçırması olay üretmemeli");
  } finally {
    ev.stop();
  }
});

// ── Test 6: Ollama kapalıyken prefetch sessiz — hata da olay gürültüsü de yok ──
test("startPrefetch: Ollama erişilemezken hata fırlatmaz, olay gürültüsü üretmez", async () => {
  const cache = new SpeculativeCache();
  const ev = collectEvents(["speculex_hit", "speculex_miss", "error"]);
  try {
    await assert.doesNotReject(
      () => startPrefetch(cache, "bir şey oku", { ollamaHost: "http://localhost:19999", tier1Model: "m" }, "sess-off", null)
    );
    assert.strictEqual(ev.seen.length, 0, "erişilemez Ollama olay üretmemeli (spekülasyon hiç başlamadı)");
    assert.strictEqual(cache._cache.size, 0, "önbellek boş kalmalı");
  } finally {
    ev.stop();
  }
});
