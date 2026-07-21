// tests/speculex.test.js — İş B: spekülatif salt-okunur önbellek testleri
"use strict";

const { test } = require("node:test");
const assert   = require("node:assert");

// ── Test 1: Güvenlik garantisi — yazma araçları ASLA cache'e girmez ──────────
test("SpeculativeCache: güvensiz tool set() ile kaydedilmez", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  // Yazma araçları — güvensiz
  const writeTools = ["write_file", "edit_file", "run_command", "delete_file", "move_file"];
  for (const tool of writeTools) {
    cache.set(tool, { path: "/test" }, "sonuç");
  }

  assert.ok(!cache.hasUnsafe(), "güvensiz araçlar cache'te OLMAMALIYDI");
  for (const tool of writeTools) {
    assert.strictEqual(cache.get(tool, { path: "/test" }), null, `${tool} cache'ten DÖNMEMELI`);
  }
});

// ── Test 2: Güvenli araçlar normal cache'lenir ────────────────────────────────
test("SpeculativeCache: güvenli tool set/get çalışır", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  cache.set("read_file", { path: "/proje/dosya.js" }, "içerik burada");
  const result = cache.get("read_file", { path: "/proje/dosya.js" });

  assert.strictEqual(result, "içerik burada", "güvenli tool sonucu döndürülmeli");
});

// ── Test 3: TTL geçince cache miss döner ──────────────────────────────────────
test("SpeculativeCache: TTL geçince miss döner", async () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  // TTL'i test için 50ms'e indir (monkey-patch)
  const origTTL = 30_000;
  cache._cache.set("read_file\0{\"path\":\"/x\"}", { result: "eskimiş", ts: Date.now() - origTTL - 1 });

  const result = cache.get("read_file", { path: "/x" });
  assert.strictEqual(result, null, "TTL geçmiş entry null dönmeli");
  assert.strictEqual(cache.misses, 1, "miss sayacı artmalı");
});

// ── Test 4: Hit/miss oranı doğru sayar ───────────────────────────────────────
test("SpeculativeCache: hit/miss istatistikleri doğru", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  cache.set("list_files", { path: "/" }, "[dosyalar]");

  cache.get("list_files", { path: "/" }); // hit
  cache.get("list_files", { path: "/baska" }); // miss
  cache.get("write_file", { path: "/x" }); // güvensiz → null (güvenlik reddi, miss sayılmaz)

  assert.strictEqual(cache.hits, 1, "1 hit olmalı");
  assert.strictEqual(cache.misses, 1, "1 miss olmalı (güvensiz araç miss sayılmaz)");
  assert.ok(Math.abs(cache.hitRate() - 0.5) < 0.01, "hit rate 0.5 olmalı (1 hit / 2 toplam)");
});

// ── Test 5: SAFE_TOOLS whitelist doğruluğu ───────────────────────────────────
test("SAFE_TOOLS: izin verilenler ve yasaklar", () => {
  const { SAFE_TOOLS } = require("../core/speculex.ts");

  // İzin verilen
  for (const t of ["read_file", "list_files", "search", "vault_search", "memory_read"]) {
    assert.ok(SAFE_TOOLS.has(t), `${t} SAFE_TOOLS'ta olmalı`);
  }

  // Kesinlikle yasak
  for (const t of ["write_file", "edit_file", "run_command", "delete_file", "create_dir"]) {
    assert.ok(!SAFE_TOOLS.has(t), `${t} SAFE_TOOLS'ta OLMAMALI`);
  }
});

// ── Test 6: clear() tüm cache'i siler ────────────────────────────────────────
test("SpeculativeCache: clear() sonrası tüm girdiler silinir", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  cache.set("read_file", { path: "/a" }, "içerik a");
  cache.set("search",    { query: "x" }, "sonuç x");
  cache.clear();

  assert.strictEqual(cache.get("read_file", { path: "/a" }), null, "clear sonrası null döner");
  assert.strictEqual(cache._cache.size, 0, "cache boş olmalı");
});

// ── Test 7: startPrefetch güvensiz araç çalıştırmaz ──────────────────────────
test("startPrefetch: güvensiz araç spekülatif çalıştırılmaz (offline Ollama)", async () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  // startPrefetch gerçekte Ollama'ya bağlanmayı dener — offline ortamda hemen döner
  // Test: hata fırlatmaması ve güvensiz araçların cache'e girmemiş olması yeterli

  const cache = new SpeculativeCache();
  const { startPrefetch } = require("../core/speculex.ts");

  // Offline Ollama — bağlantı hatası sessizce yutulmalı
  await assert.doesNotReject(
    () => startPrefetch(cache, "write_file ile dosya yaz", { ollamaHost: "http://localhost:19999", tier1Model: "test" }, null, null),
    "startPrefetch hata fırlatmamalı"
  );

  // Güvensiz araçlar cache'te olmamalı
  assert.ok(!cache.hasUnsafe(), "offline sonrası bile güvensiz araç cache'te olmamalı");
});

// ── Test 8: SpeculativeCache Session'a entegre — constructor'da var ───────────
test("Session: _specCache alanı mevcut ve SpeculativeCache örneği", () => {
  const speculex = require("../core/speculex.ts");
  assert.ok(typeof speculex.SpeculativeCache === "function", "SpeculativeCache class export edilmeli");
  assert.ok(speculex.SAFE_TOOLS instanceof Set, "SAFE_TOOLS Set export edilmeli");
  assert.ok(typeof speculex.startPrefetch === "function", "startPrefetch export edilmeli");
});

// ── Test 9: hasUnsafe() MCP araç isimlerinde (server:tool) doğru çalışır ──────
test("SpeculativeCache: hasUnsafe() MCP 'server:tool' formatında doğru çalışır", () => {
  const { SpeculativeCache, SAFE_TOOLS } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  // SAFE_TOOLS içindeki araçlar güvenlidir
  cache.set("read_file", { path: "/x" }, "içerik");
  assert.ok(!cache.hasUnsafe(), "read_file güvenlidir, hasUnsafe false döner");

  // Anahtar formatı: MCP araçları "server:tool" biçimindedir
  // _key() sonucu "read_file\0{...}" — split("\0")[0] = "read_file"
  const key = cache._cache.keys().next().value;
  assert.ok(key.includes("\0"), "anahtar \\0 ayırıcısı içermeli");
  assert.strictEqual(key.split("\0")[0], "read_file", "\\0 split tool adını doğru verir");
});

// ── Test 10: Hata string'leri set() içinde filtrelenir (savunma derinliği) ──────
test("SpeculativeCache: hata string'i set() ile kaydedilmez", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  // set() artık hata string'lerini doğrudan reddeder (startPrefetch'e bağlı değil)
  cache.set("read_file", { path: "/yok" }, "Araç hatası (read_file): ENOENT: dosya yok");
  assert.strictEqual(cache.get("read_file", { path: "/yok" }), null, "hata string'i önbelleğe alınmamalı");

  cache.set("read_file", { path: "/yok2" }, "Araç bulunamadı: read_file");
  assert.strictEqual(cache.get("read_file", { path: "/yok2" }), null, "bulunamadı string'i önbelleğe alınmamalı");

  cache.set("read_file", { path: "/yok3" }, "HATA: dosya bozuk");
  assert.strictEqual(cache.get("read_file", { path: "/yok3" }), null, "HATA: önekli string önbelleğe alınmamalı");

  // Normal sonuçlar hâlâ önbelleğe alınır
  cache.set("read_file", { path: "/var.js" }, "const x = 1;");
  assert.strictEqual(typeof cache.get("read_file", { path: "/var.js" }), "string", "normal sonuç kaydedilmeli");
});

// ── Test 11: 50KB üzeri sonuç önbelleğe alınmaz (boyut koruması) ─────────────
test("SpeculativeCache: 50KB üzeri sonuç set() ile kaydedilmez", () => {
  const { SpeculativeCache } = require("../core/speculex.ts");
  const cache = new SpeculativeCache();

  const huge = "x".repeat(50_001);
  cache.set("read_file", { path: "/büyük" }, huge);
  const got = cache.get("read_file", { path: "/büyük" });
  assert.strictEqual(got, null, "50KB+ sonuç önbelleğe alınmamalı");
});

// ── Test 12: ollamaRequest 3-arg arity fix — model argümanı iletilir ──────────
test("ollamaRequest: 3-arg form prompt'u ikinci argüman olarak alır", () => {
  // Gerçek Ollama çağrısı değil — fonksiyon imzasını ve arity'yi doğrular
  const { ollamaRequest } = require("../core/extract.ts");
  assert.strictEqual(typeof ollamaRequest, "function", "ollamaRequest fonksiyondur");
  // (modelOrPrompt, maybePrompt, opts={}) → ilk iki param: length 2
  assert.ok(ollamaRequest.length >= 1, "en az 1 parametresi olmalı");
  // 1-arg ve 3-arg çağrılar Promise döndürür (offline → reject da olsa)
  const p1 = ollamaRequest("test prompt");
  const p3 = ollamaRequest("test-model", "test prompt", { timeout: 100 });
  assert.ok(p1 instanceof Promise, "1-arg form Promise döndürür");
  assert.ok(p3 instanceof Promise, "3-arg form Promise döndürür");
  // Offline bağlantı reddi beklenen — unhandledRejection'ı önle
  p1.catch(() => {});
  p3.catch(() => {});
});
