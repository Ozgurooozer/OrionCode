# 1. Runtime / Süreç Mimarisi

**Perspektif:** Program çalıştırıldığında, dosyadan dosyaya hangi kod hangi
sırayla devreye giriyor? Kaç farklı "giriş noktası" var, hepsi aynı çekirdeğe
mi çıkıyor?

## 1.1 Üç giriş noktası, tek çekirdek

```
orion.js            orion-server.js         orion-mcp.js
(CLI / TUI, 520 satır) (HTTP+SSE, 384 satır)    (MCP sunucu, 251 satır)
      │                       │                        │
      └───────────────────────┴──────── core/session.ts ┘
                                    (Session sınıfı — 876 satır)
```

Üçü de aynı `Session` sınıfını (`core/session.ts`) örnekler ve `session.send(text)`
çağırır. Aradaki fark sadece **girdi/çıktı taşıyıcısı**:

- `orion.js` — `readline` ile terminal, TUI bileşenleri (`tui/`) ile render.
  `--headless` bayrağıyla stdin'den tek görev okuyup `<<<ORION_FINAL>>>`
  işaretçisiyle sonucu basar — bu mod alt-ajanlar (`core/subagent.js`) ve
  `-p` tek-atış modu tarafından kullanılır (`orion.js:22,34-38,97`).
- `orion-server.js` — `127.0.0.1`'e bağlı HTTP sunucu, çoklu eşzamanlı
  `Session` tutar, olayları SSE (`core/events.ts`) üzerinden akıtır.
- `orion-mcp.js` — Orion'un kendisini bir MCP sunucusu olarak dışa açar
  (başka bir Claude/agent Orion'u araç olarak çağırabilir).

**Sonuç:** mimarideki iş mantığının tamamı `core/` altında; üç giriş noktası
sadece transport katmanı. Bir davranış değişikliği `core/session.ts` veya
`core/loops/*` içinde yapılırsa üçünde de otomatik etkili olur — ama tersi de
doğru: birinde yapılan geçici bir hack (örn. orion.js'e özel bir kısayol)
diğer ikisinde görünmez, sessiz bir tutarsızlık kaynağı olabilir.

## 1.2 `Session.send()` — bir turun anatomisi

`core/session.ts:318-537` tek bir kullanıcı mesajının işlendiği yer. Sırayla:

1. **Bütçe kontrolü** (`this.budget.isExceeded()`) — aşılmışsa hata fırlatır,
   turu hiç başlatmaz (session.ts:326-333).
2. **Bağlam enjeksiyonu** — sırayla `memory.query()`, `vault.searchVault()`
   (skor eşiği ≥0.6), `turnMemory.recall()` (yalnızca bağlam sıkıştırılmışsa),
   `skills.findRelevantSkills()`, swarm inbox. Her biri kendi `try/catch`
   içinde — biri başarısız olursa sessizce `events.emitSilentCatch()` ile
   loglanır, turu düşürmez (session.ts:336-393).
3. **Auto-compact** — token sayısı backend limitinin %80'ini geçtiyse
   `compact()` tetiklenir (session.ts:408-422; bkz. [04](04-veri-kalicilik-mimarisi.md)).
4. **Router kararı** — `router.decide()` (bkz. [02](02-yonlendirme-ogrenme-mimarisi.md)).
5. **Speculex prefetch** — tier2 turuysa Ollama'dan salt-okunur araçlar arka
   planda paralel çalıştırılır (session.ts:452-465).
6. **Heartbeat timer** — 30/60/90. saniyede "Still working..." yazdırır
   (session.ts:474-485) — bkz. [06](06-vaka-analizi-uzun-sureli-donma.md) için
   bunun neden yanıltıcı olabileceği.
7. **`_callWithFallback()`** — asıl model çağrısı, fallback zinciriyle.
8. **Muhasebe** — gerçek token/maliyet, Thompson güncellemesi, turn memory,
   diske kayıt (`_save()`), periyodik hafıza çıkarımı.

Bu 8 adımın her biri ayrı bir alt sistemi temsil eder ve genelde kendi
dosyasında yaşar — `session.ts` bunların **orkestratörü**, iş mantığının
kendisi değil. Yeni bir "tur-öncesi" özellik eklerken doğru yer genelde yeni
bir dosya + burada bir çağrı satırıdır, `send()` içine gömülü mantık değil.

## 1.3 Backend seçimi → loop dispatch

`_dispatchLoop(backend, model)` (session.ts:600-622) backend adına göre üç
yoldan birine dallanır:

| backend | loop dosyası | native tool calling |
|---|---|---|
| `anthropic` | `core/loops/anthropic.js` | native blok akışı |
| `ollama` | `core/loops/ollama.js` | native `/api/chat` tools → desteklenmezse `ollama_react.js`'e düşer |
| diğerleri (openai, openrouter, hf, nim, custom BYOK) | `core/loops/openai.js` | OpenAI-uyumlu `tools` alanı |

Dört loop dosyası da `core/loops/shared.js`'deki ortak sabitleri
(`MAX_ITERS=40`, `TIER1_TOOLS`, `PARALLEL_SAFE`) ve yardımcıları
(`_callToolCached`, `makeThinkFilter`, ...) paylaşır — bkz. [03](03-agent-loop-arac-mimarisi.md).

## 1.4 Olay kanalı — tüm taşıyıcıların ortak dili

`core/events.ts` tek bir `EventEmitter` singleton'ı (`emitter.setMaxListeners(64)`
— çok sayıda SSE istemcisini öngörür). Her olay `{ type, sessionId, timestamp,
payload }` şeklinde standardize (events.ts:29-34). TUI, HTTP/SSE istemcileri
ve `core/daemon.js` worker'ı aynı akışa `emitter.on(type, ...)` ile bağlanır.

Dikkat çeken bir tasarım kararı: `silent_catch_hit` olayı (events.ts:22-24,
95-104). Kod tabanında çokça "hata olursa sessizce devam et" deseni var
(§1.2'deki bağlam enjeksiyonu gibi) — bunun kötü tarafı, gerçek bir arızanın
"her şey normal" görünümü altında kaybolmasıdır. `emitSilentCatch()` bu
riski azaltmak için eklenmiş: akışı bozmadan ama görünür kalarak. `/log`
komutunda bu olaylar filtrelenebilir hale getirildi (bkz. git log
`a715663`). Yeni bir sessiz `catch {}` eklerken bu yardımcıyı kullanmak,
kullanmamaktan daha güvenlidir.

## 1.5 Workspace güven kapısı

`core/workspace.js` — Orion, `trustedPaths` listesinde olmayan bir dizinde
açılırsa `promptTrust()` ile terminalde soru sorar; onay `~/.orion/config.json`
altına kalıcı yazılır (workspace.js:15-21). `orion.js --trust` bayrağı bu
adımı CI/script ortamları için atlar. Bu kapı yalnızca **CLI**'da devrede —
`orion-server.js` ve `orion-mcp.js` girişlerinin bu kapıyı çağırıp
çağırmadığı, her yeni transport eklenirken ayrıca doğrulanmalı (transport
katmanı çoğaldıkça güven kapısı gibi "tek noktadan" varsayılan kontrollerin
her girişte tekrarlanması gerekiyor — merkezi değil).
