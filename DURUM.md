# Orion Aethelred v4 — Durum Raporu
> Tarih: 2026-07-13 · Test: 210/210 · Kod: ~8 200 satır

---

## Genel Tablo

| Katman | Durum | Not |
|---|---|---|
| CLI (orion.js) | ✅ Aktif | Sticky input, tab complete, /gecmis |
| HTTP Server (orion-server.js) | ✅ Aktif | SSE /events endpoint |
| Backends | ✅ 5 built-in + BYOK | anthropic, ollama, openrouter, openai, huggingface |
| Tools | ✅ Çalışıyor | fs, memory, vault, shell, moltbook |
| MCP | ✅ Client + Server | stdio + HTTP, autoConnect |
| Vault (bellek) | ✅ 4 katman | working / episodic / semantic / personalized |
| TUI | ✅ Yenilendi | Sticky input, input box, * tool format, → result |
| Test | ✅ 207/207 | 33 test dosyası |

---

## Mimari

```
orion.js (CLI)          orion-server.js (HTTP)
      │                         │
      └──────── core/session.js ──────────── (tier1 + tier2 loop)
                     │
        ┌────────────┼──────────────────────┐
        │            │                      │
   backends/     core/router.js       core/tools.js
   (5 built-in   (Thompson +          (fs, memory,
   + custom.js)   FEP gölge)           vault, shell)
        │
   core/speculex.js   core/daemon.js
   (tier2 beklerken   (vault yazımı,
    read-only prefetch) digest, weakness)
```

---

## Sistemler

### Çekirdek

| Sistem | Dosya | Durum |
|---|---|---|
| Session yönetimi | `core/session.js` (754 satır) | Anthropic / OpenAI-family / Ollama / React loop |
| BYOK Router | `core/router.js` + `core/thompson.js` | Beta dağılımı öğrenen router |
| Spekülatif önbellek | `core/speculex.js` | TTL=30s, SAFE_TOOLS whitelist, 50KB cap |
| FEP gölge modu | `core/freeenergy.js` | lambda=0 varsayılan, sadece telemetry loglar |
| MCP | `core/mcp.js` | stdio + HTTP, tool expose/consume |
| Checkpoint | `core/checkpoint.js` | Yazım öncesi otomatik snapshot |
| Diagnostics | `core/diagnostics.js` | Dosya yazımı sonrası JS/TS hata tespiti |
| Diff | `core/diff.js` | Unified diff + renkli print |

### Bellek / Vault

| Katman | Dosya | Açıklama |
|---|---|---|
| Working (anlık) | `core/session.js` | `session.msgs` — aktif context |
| Episodic | `core/daemon.js` → `core/extract.js` | Tool çağrıları dahil konuşma özeti |
| Semantic | `core/vault.js` + `core/embed.js` | `~/.orion/vault/` HTML + vektörler |
| Personalized | `~/.orion/config.json` | Kullanıcı ayarları, tier2Backend |
| Shannon filtresi | `core/daemon.js checkNovelty()` | Benzerlik >0.82 → kaydetme |
| Lovelace digest | `core/vault.js writeDigest()` | 30dk idle → haftalık özet |
| VaultMap | `core/vaultmap.js` | PCA + k-means SVG harita |
| Hebbian | `core/vault.js decayActivations()` | Uyku-konsolidasyon |

### TUI

| Bileşen | Dosya | Açıklama |
|---|---|---|
| Tema + render | `tui/index.js` (379 satır) | Truecolor, markdown renderer |
| Sticky input | `tui/index.js` → `stickySetup/Refresh/MoveToContent` | Scroll region, altta sabit |
| Input bloğu | `inputBoxTop` + `makeInputPrompt` + `refreshInputFill` + `finishUserTurn` | Dolgulu blok: bant + canlı zeminli satır, Enter'da kalıcı çizim; asenkron mesajlar `notifyAbove` ile bandın üstüne |
| Masked input | `core/tui/masked-input.js` | API key girişi, echo yok |
| Select input | `core/tui/select-input.js` | Arrow-key seçim, clack bağımlılığı yok |
| Tool format | `print.tool / print.result` | `* ToolName "arg"` / `→ result` |

### Backends

| Backend | Dosya | Auth |
|---|---|---|
| Anthropic | `backends/anthropic.js` | `ANTHROPIC_API_KEY` (credentials.json) |
| Ollama | `backends/ollama.js` | Yerel, anahtar gerekmez |
| OpenRouter | `backends/openrouter.js` | `OPENROUTER_API_KEY` |
| OpenAI | `backends/openai.js` | `OPENAI_API_KEY` |
| HuggingFace | `backends/huggingface.js` | `HF_TOKEN` |
| Custom (BYOK) | `backends/custom.js` | `~/.orion/providers.json` |

BYOK key kaydetme akışı: `maskedInput` → `process.env[keyEnv]` (bu oturum) + `credentials.json` (kalıcı).

### Araçlar (AI'ın kullanabildiği)

| Araç | Dosya | İşlev |
|---|---|---|
| read_file, write_file, edit_file, list_files, search | `tools/fs.js` | Dosya sistemi (EPERM korumalı, rg/grep/Node fallback) |
| memory_read, memory_add, memory_search | `tools/memory.js` | Semantik bellek |
| vault_search, vault_read | `tools/vault.js` | Vault arama/okuma |
| run_command | `tools/shell.js` | Shell (headless'ta kapalı, onay gerekli) |
| feed_read, post, comment | `tools/moltbook.js` | Moltbook (Ozyn onayı şart) |
| MCP araçları | `core/mcp.js` | `mcp__serverName__toolName` |

### Komutlar

**Session:** `/gecmis` `/sessions` `/load` `/delete` `/dal` `/tree` `/checkpoint`  
**Model/Provider:** `/model` `/provider` `/provider presets` `/provider add` `/provider key`  
**MCP:** `/mcp` `/mcp connect` `/mcp tools` `/mcp add` `/mcp disconnect`  
**Bellek:** `/memory` `/skill` `/skill mine` `/vault` `/vault map` `/vault digest`  
**Analiz:** `/stats` `/budget` `/router` `/weakness`  
**Araçlar:** `/read` `/search` `/diff` `/subagent` `/coordinator`  
**Ayar:** `/settings` `/language` `/mode` `/plugin`

---

## Testler

| Dosya | Kapsam |
|---|---|
| `budget.test.js` | Maliyet hesaplama |
| `router.test.js` | Thompson + routing mantığı |
| `tools.test.js` | Tool dispatch |
| `checkpoint.test.js` | Snapshot oluştur/geri al |
| `diagnostics.test.js` | JS/TS hata tespiti |
| `openai-compat.test.js` | OpenAI-uyumlu API |
| `plugins.test.js` | Plugin yükleme |
| `vault.test.js` | Vault yazma/okuma/Shannon |
| `diff.test.js` | Unified diff |
| `cache.test.js` | KV prefix cache |
| `events.test.js` | SSE olay protokolü |
| `provider.test.js` | BYOK key yönetimi |
| `weakness.test.js` | Weakness mining |
| `freeenergy.test.js` | FEP scoreOption |
| `speculex.test.js` | Spekülatif önbellek |
| `fs.test.js` | Dosya sistemi araçları |
| `select-input.test.js` | Arrow-key select |
| `tui.test.js` | TUI bileşenleri |
| `slashmenu.test.js` | "/" komut açılır menüsü |
| `fuzzy.test.js` | Typo-toleranslı fuzzy eşleştirici (jcode portu) |
| `fuzzy-picker.test.js` | Yazarak-filtrele model seçici |
| `web.test.js` | web_fetch: HTML→metin, SSRF koruması |
| `turnmemory.test.js` | Oturum-içi turn belleği |
| `accounts.test.js` | Çoklu hesap profilleri |
| `harness-import.test.js` | Claude Code oturum devralma |
| `selfdev.test.js` | Self-dev + komut hot-reload |
| `skills-lazy.test.js` | Tembel skill eşleştirme |
| `lmstudio.test.js` | LM Studio backend |
| `fs-sandbox.test.js` | fs araçları workspace sandbox sınırı |
| `extract.test.js` | Model fallback embedding filtresi + `stripThinking` (2026-07-13) |
| `speculex-integration.test.js` | Spekülatif prefetch ↔ session.js entegrasyonu, KATI SINIR kanıtı (2026-07-13) |
| `freeenergy-shadow.test.js` | FEP gölge kararı ↔ gerçek router kararı, sapma raporu (2026-07-13) |
| `silent-catch.test.js` | `silent_catch_hit` görünürlük kanalı (2026-07-13) |
| **Toplam** | **207 / 207 ✅** |

---

## Son Oturumda Yapılanlar (2026-07-13) — V→F→B→C→S Zinciri

### Bağlam ve karar

Bu oturum, aşağıdaki "Açık/Sıradaki" tablosundaki İş A/B/C'nin **2026-07-11'de
"Düzeltildi ve doğrulandı" olarak kapatılmış olmasına rağmen**, canlı bir
testte (İş V) hâlâ aynı aile hatayı üretmesiyle başladı. Bu, PERSONA.md
Kural 7'nin ("eski sonuca bile şüpheyle bak") doğrudan bir uygulaması oldu —
"zaten doğrulandı" etiketi yeniden bakılana kadar sadece bir varsayım olarak
ele alındı ve haklı çıktı: 07-11'in doğrulaması **yeterince derin değildi**
(bkz. aşağıdaki "07-11 doğrulamasıyla uzlaştırma").

Üç bağımsız sessiz-hata örneği (weakness-mining yanlış model adı, embedding
modelinin sessizce yok sayılması, `extractWithOllama`'da `<think>` bloğu
temizlenmeden parse) karşısında iki seçenek vardı: (1) weakness-mining'i
genişletip bu sınıf hataları "tespit ettirmek", (2) kaynağı tek seferlik
sistemik bir taramayla kapatmak. **Karar #2 idi** — bu, weakness-mining'i
basit/dar tutma kararını da otomatik olarak doğru seçenek yaptı, çünkü kaynak
kapatılınca tespit edilecek yeni bir hata sınıfı kalmadı.

Dört ayrı, birbirinin dosyasına dokunmayan prompt olarak yürütüldü (paralel
ajanlar çakışmasın diye): **V** (gözlem, kod yok) → **F** (kök-neden,
`core/extract.js`) → **B** (`core/speculex.js`+`core/session.js`, paralel) →
**C** (`core/freeenergy.js`+`core/router.js`+`core/commands/router.js`,
paralel) → **S** (sistemik catch taraması, B/C bitince tek başına — çünkü
B/C'nin değiştirdiği dosyaları da tarayacaktı). `EVENT_TYPES`'a
`speculex_hit`/`speculex_miss`/`router_shadow_decision` event tipleri B/C
başlamadan **önce tek elden** `core/events.js`'e eklendi ki üç iş de aynı
dosyaya yazmak zorunda kalmasın.

### İş V — Canlı doğrulama (kod yok, gözlem)

| Adım | Bulgu |
|---|---|
| `ollama list` | `nomic-embed-text` kurulu değildi (kurulu: `vibethinker`, `ornith`, `qwen-coder`) |
| `ollama pull nomic-embed-text` | 274 MB indirildi, doğrulandı |
| Gerçek modda `node orion.js`, canlı `/vault kaydettir` | Üretilen HTML: `<h1>[user]: ...[assistant]: \`setMaxListeners(n)\` bir Ev</h1>`, `orion-tags="claude-code,manuel"`, Kararlar/Kavramlar/Hatalar bölümleri **boş** — ham alıntı, gerçek özet değil |
| `/vault ara` aynı oturumda | Az önce kaydedilen girdi döndü (boş değil) ama skor **%100** — cosine'dan çok keyword eşleşmesi kokusu, embedding'in arama tarafında gerçekten devrede olup olmadığı bu turda ayrıca doğrulanmadı (açık kaldı) |

**İroni:** V'nin kendi 2. adımı (embedding modelini kurmak), `resolveOllamaModel`'in
o zamanki (07-11'den kalma) "kurulu ilk modele düş" mantığını **daha da
kötüleştirdi** — pull sonrası `/api/tags`'in ilk sırasına çoğunlukla
`nomic-embed-text` (chat bile yapamayan bir model) geldi. "Düzeltme" sanılan
bir adımın yeni bir sessiz-hata yolu açabileceğinin canlı kanıtı.

### İş F — Extraction kök-neden düzeltmesi (`core/extract.js`)

V'nin bulduğu ham-alıntı sorununun kök nedeni iki parçalıydı:

1. **`resolveOllamaModel`** (satır 82-95) artık `/api/tags`'i isim + model
   ailesiyle (`details.family(ies)`) okuyor; `_isEmbeddingModel()` filtresiyle
   embedding-only modelleri (`nomic-embed`, `mxbai-embed`, `bge`... isim veya
   `bert`/`embed` ailesi) fallback adayı olmaktan **eliyor**. Hepsi embedding
   ise istenen adla deniyor ki hata görünür kalsın (sessizce başka bir şeye
   kaymıyor).
2. **`extractWithOllama`** (satır 131-163) artık `JSON.parse`'tan önce zaten
   tanımlı-ama-hiç-çağrılmayan `stripThinking()`'i çağırıyor — thinking
   modelleri (`vibethinker` vb.) `<think>...</think>` bloğunu JSON'dan önce
   basıyordu, temizlenmeden parse her denemede patlıyordu.
3. `~/.orion/config.json`'a `tier1Model: "qwen-coder:latest"` yazıldı (bu
   makinede kurulu gerçek ada sabitlendi). **Bilinçli olarak `core/router.js`
   DEFAULTS'a dokunulmadı** — hem C ajanı o dosyada eşzamanlı çalışıyordu hem
   de `qwen-coder:latest` makineye özgü bir ad, evrensel kod varsayımı olarak
   yanlış olur.

**Canlı doğrulama** (V ile birebir aynı akış, farklı soru): üretilen HTML'de
Kararlar dolu ("Promise.allSettled kullanmak daha güvenli…"), Kod Kalıpları
2 snippet, Kavramlar 3 madde, **`manuel` etiketi yok**. Test: `tests/extract.test.js`
(3 test) — mock Ollama'da embedding modeli **bilerek ilk sırada** kurularak
(hatayı yeniden üreten dizilim) filtrenin gerçekten çalıştığı kanıtlandı.

### İş B — Spekülatif salt-okunur yürütme (`core/speculex.js` + `core/session.js`)

`core/session.js:246`'da tier2 rotasında `speculex.startPrefetch()` çağrısı
zaten **vardı** (07-11'in İş B notu "session.js'e entegre değil" artık yanlış
bir varsayımdı — kod okunarak düzeltildi). Gerçek problem, İş V/F'yle **aynı
kök aileden** bir başkasıydı: tahmin prompt'undaki örnek `list_files` için
`{"path":...}` kullanıyordu, gerçek araç şeması `{dir}` — cache anahtarı
tool+input JSON'unun **tam eşleşmesi** olduğundan bu, `list_files`/`search`
isabetini yapısal olarak imkânsız kılıyordu. 07-11'in doğrulaması bu
detayı yakalamamıştı (bkz. aşağı, "07-11 doğrulamasıyla uzlaştırma").

| Değişiklik | Dosya | Not |
|---|---|---|
| Tahmin prompt şeması gerçek araç şemalarıyla hizalandı | `core/speculex.js` | `list_files`/`search` isabeti artık yapısal olarak mümkün |
| Girdi tüketim takibi (`consumed`) + `generation` tur çiti | `core/speculex.js` | Geç biten prefetch yeni turun cache'ini kirletemiyor |
| `drainUnconsumed(expectedGen)`, `get()`'e opsiyonel `sessionId` (TTL) | `core/speculex.js` | Tüketilmeyen/TTL'i kaçıran tahminler `speculex_miss` ile görünür |
| `_callToolCached` isabette `speculex_hit` yayınlar | `core/session.js` | — |
| `send()` tier2 dalında prefetch promise + generation yakalanır, `finally`'de `_sweepSpeculexMisses` | `core/session.js` | Hata `speculex_miss reason:"error"` olarak yayınlanır, kullanıcıya asla yansımaz |

**KATI SINIR kanıtı** (`tests/speculex-integration.test.js`, 6 test): tahminci
*kasıtlı olarak* `write_file`/`edit_file`/`run_command` döndürse bile
hiçbiri yürütülmüyor/cache'lenmiyor; cache'e zorla write girdisi enjekte
edilse bile `get()` çiti derinlemesine savunmayla dönüşü engelliyor.

**Ölçüm** (yarı-gerçek: tier1 gerçek Ollama ile gerçekten yürütüldü, tier2
tarafı bulut maliyeti olmasın diye 10 senaryoda elle ground-truth): **%80
isabet (8/10)**. Iskalar makul cinsten (farklı path tahmini, `memory_read`
yerine `read_file`). Tur başına beklenen gecikme kazancı **~2.0 sn**
(`search` aracının ~10 sn sürmesi domine ediyor; fs araçları ~1ms, ihmal
edilebilir). Dürüst sınır: prefetch 2.4–15.8 sn sürebiliyor — tier2 daha
hızlı yanıtlarsa girdi geç kalır, bu durumda regresyon yok, sadece
`speculex_miss reason:"unused"`.

**Kapsam dışı bırakılan iki gözlem** (raporlandı, dokunulmadı): `search`
aracı muhtemelen `node_modules`'ı tarıyor (ignore filtresi ayrı iş olarak
değerli — speculex'in en değerli hedefini de hızlandırır); spekülasyon
yalnızca router'ın tier2 kararında tetikleniyor, kullanıcı `_manualBackend`
ile bulut backend'i elle seçtiğinde prefetch hiç çalışmıyor.

### İş C — FEP gölge modu telemetri (`core/freeenergy.js` + `core/router.js` + `core/commands/router.js`)

`core/router.js`'te `decide()` ikiye bölündü: gerçek karar mantığı bayt bayt
aynı şekilde `_decideCore()`'a taşındı, `decide()` kararı alıp fire-and-forget
bir `shadowHook`'u ateşleyip kararı **değiştirmeden** döndürüyor.
`core/freeenergy.js`'e tek hesap noktası (`evaluateShadow`, 10 sn memo —
aynı turda `shadowHook` ve session.js'in önceden var olan `shadowLog`
çağrısı sürprizi/embed'i **bir kez** hesaplıyor), sayaç + `router_shadow_decision`
event yayını (`recordShadow`) ve kalıcı NDJSON loglarından okuyan
`aggregateShadowReport` eklendi. `session.js:251`'deki mevcut `shadowLog`
çağrısına dokunulmadı (kapsam dışıydı) — çift sayım riski kanalları ayırarak
çözüldü: kanca → event + oturum içi sayaç, `shadowLog` → yalnız kalıcı
telemetri. Yeni komut: **`/router shadow-report [gün]`**.

**Ölçüm** (20 turluk simüle oturum, gerçek `decide()` yolundan):

| Konfig | Sapma | Yapı |
|---|---|---|
| Varsayılan (λ=0.5, boş vault → sürpriz sabit 0.5) | 12/20 = %60 | Gölge bu konfigde hep tier2 seçiyor — sapma birebir "gerçek kararın tier1 olduğu turlar" (`balanced default` 9/9, `chat mode` 2/2, `budget exceeded` 1/1) |
| λ=1.0 + sentetik sürpriz taraması | 10/20 = %50 | Yön değişiyor: gölge yüksek sürprizli girdilerde tier1'e kayıyor |

Test: `tests/freeenergy-shadow.test.js` (8 test) — kapalıyken sıfır etki,
gerçek kararın değişmezliği, 6 turluk deterministik simülasyon, bozuk girdi
toleransı, çift-saymama, `/router shadow-report` komutu.

### İş S — Sessiz catch{} sistemik taraması (kök nedeni kapatan iş)

`core/*.js`, `core/commands/*.js`, `tools/*.js` içinde gövdesi boş/yalnız-yorum
**58 catch bloğu** tek tek elle gözden geçirildi. **44'ü zararsız/zaten-görünür**
(dosya-yoksa-varsayılan türü desenler + B/C'nin bugün event'li hale getirdiği
speculex/freeenergy gölge kanalları). **15'i sessiz-başarısızlık** olarak
`core/events.js`'e eklenen `EVENT_TYPES.silent_catch_hit` + hiçbir zaman
fırlatmayan `emitSilentCatch(site, err, sessionId?, detail?)` yardımcısıyla
görünür kılındı — hiçbir dönüş sözleşmesi bozulmadı, sadece olay kanalı
eklendi:

| Site | Detail | Neden görünür kılındı |
|---|---|---|
| `core/extract.js:148` `extractWithOllama` | `manuel-fallback` | Manuel yedek "başarı gibi" dönüyordu (bu zincirin başlangıç noktası) |
| `core/i18n.js:28` `setLocale` | — | Dil bellekte değişip diske yazılamayınca "kaydedildi" izlenimi kalıyordu |
| `core/skills.js:189` `findRelevantSkills` | `embed-yolu` | Embedding→fuzzy sessiz düşüş |
| `core/skills.js:205` `findRelevantSkills` | `fuzzy-yolu` | Fuzzy de başarısızsa boş sonuç ayrımsızdı |
| `core/thompson.js:80` `_save` | — | Bandit öğrenmesi süreç kapanınca sessizce kayboluyordu |
| `core/vault.js:194` `writeSession` | `vectors` | Vektör yazılamayınca oturum semantik aramada görünmez ama "kaydedildi" raporlanıyordu |
| `core/vault.js:202` `writeSession` | `rebuildGraph` | `graph.html` sessizce bayat kalıyordu |
| `core/vault.js:250` `searchVault` | `keyword-fallback` | Embedding hatası keyword sonuçlarıyla maskeleniyordu (V'nin şüphelendiği %100 skorla aynı aile) |
| `core/session.js:233` `chat` | `vault-inject` | Bağlam enjeksiyonu sessizce yok oluyordu, "eşleşme yok" ile karışıyordu |
| `core/session.js:245` `chat` | `turn-recall` | Aynı aile |
| `core/session.js:259` `chat` | `skill-inject` | Aynı aile |
| `core/session.js:759` `_extractMemories` | — | Başarıda mesaj basılıyor, başarısızlık tamamen görünmezdi |
| `core/session.js:843` `_save` | — | **En kritik:** oturum diske yazılamasa bile `session_saved` event'i yayınlanıyordu — sessiz veri kaybı riski |
| `core/coordinator.js:68` `plan` | `parse` | Yedek tek-subtask plan gerçek plandan ayırt edilemiyordu |
| `core/daemon.js` `generateDigest` | — | Worker thread — `events.js` singleton'ı ana thread'e taşınmaz; `mineWeaknesses`'ın mevcut kanalı (`parentPort` → `daemon_error`) kullanıldı, event değil |

**Bilinçli olarak dokunulmayanlar:** `core/telemetry.js` (gözlemlenebilirlik
kanalının kendisi — disk hatasında emit fırtınası/döngü riski);
`tools/fs.js:263` grep fallback iç döngüsü (arama başına yüzlerce beklenen
hata — sıcak yol); `core/router.js`'in gölge kancası (zaten fire-and-forget);
`core/daemon.js`'in çoğu worker-thread catch'i (beklenen ilk-çalıştırma/bakım
durumları). **Yeni bulunan, kapsam dışı bırakılan bir gözlem:**
`core/coordinator.js:57`'de LLM çağrı hatası da aynı desenle sessizce yedek
plana düşüyor — S bunu raporladı, düzeltmedi (aynı desenle görünür
kılınabilir, ayrı bir iş).

Test: `tests/silent-catch.test.js` (5 test) — event şeması, fırlatmazlık
garantisi, iki gerçek site uçtan uca (`extractWithOllama` Ollama erişilemezken,
`setLocale` `saveConfig` hatasında).

### 07-11 doğrulamasıyla uzlaştırma (Kural 7 uygulaması)

Aşağıdaki tablo, 2026-07-11'de "Düzeltildi ve doğrulandı" denen maddelerin
2026-07-13'te yeniden bakılınca ne çıktığını gösteriyor — hiçbiri yanlıştı
demek değil, ama **doğrulama derinliği yetersizdi**:

| 07-11 iddiası | 07-13'te bulunan | Sonuç |
|---|---|---|
| İş A: "model bulunamama hatası artık sessizce yutulmuyor" (`data.error` kontrolü) | Doğruydu, hâlâ duruyor — ama bu, `extractWithOllama`'nın **kendi** `catch{}`'ini kapsamıyordu; o ayrı ve hâlâ açıktı | Kısmi doğru — dar kapsamlıydı |
| İş A: `resolveOllamaModel` "kurulu ilk modele düşer" | Embedding modelleri filtre dışı değildi — V'nin pull'u bunu **aktif hale getirdi** | Yanlış eksikti (embedding farkındalığı yoktu) |
| İş A: "`extractWithOllama` parse'tan önce `stripThinking` uygular" (07-11 notu) | Kod okunduğunda bu çağrı **yoktu** — sadece `speculex.js`'in kendi tahmin fonksiyonuna uygulanmıştı | Doğrulama notu, gerçek koddan ileri gitmişti |
| İş B: "Düzeltildi ve doğrulandı", "`list_files`+`read_file`, doğru path'lerle" | Tahmin prompt'unun `list_files` örneği yanlış şemaydı (`path` vs `dir`) — cache anahtarı hiç eşleşmiyordu | Doğrulama sadece "geçerli JSON üretildi mi"ne baktı, "gerçek tool girdisiyle eşleşiyor mu"ya bakmadı |
| İş C: "muhtemelen çalışıyor ama doğrulanmadı" (07-11 kendi notu) | Bugün gerçekten uçtan uca ölçüldü, ilk kez sayısal sapma oranı çıktı | Bu madde zaten dürüsttü — sadece tamamlandı |

Ders: "yazıldı ve testi geçti" ile "gerçek veriyle uçtan uca doğrulandı"
arasındaki fark, bu zincirde üç kere aynı yönde hataya yol açtı. Bundan
sonraki "Düzeltildi ve doğrulandı" notları, hangi doğrulamanın (birim test /
mock / gerçek Ollama+gerçek dosya) yapıldığını açıkça belirtmeli.

### Açık kalan, aksiyon alınmamış notlar

- `vault_ara`'nın %100 benzerlik skoru (İş V) — gerçek embedding devredeyken
  cosine skorunun 1.0'dan farklı, anlamlı bir dağılım verdiği hâlâ ayrıca
  doğrulanmadı.
- `core/coordinator.js:57` — LLM çağrı hatası sessizce yedek plana düşüyor
  (S'nin bulduğu, dokunmadığı gözlem).
- `search` aracının `node_modules` taraması muhtemelen gereksiz yavaşlık
  kaynağı (İş B gözlemi).
- Manuel backend seçiliyken (`_manualBackend`) speculex prefetch hiç
  tetiklenmiyor (İş B gözlemi).
- TUI'deki AI turn başlığının bayat backend etiketi ("agent · openrouter"
  gösterip gerçek backend ollama olması) — TUI hattı bu oturumda ayrı bir
  akışta aktif olduğu için dokunulmadı.

---

## Son Oturumda Yapılanlar (2026-07-11)

### 10-Uzman Kod Kalite Toplantısı — Düzeltmeler

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 1 | `core/vault.js` | `index.json` read-modify-write yarış koşulu (veri kaybı riski) | Promise-chain `_withIndexLock()` mutex eklendi |
| 2 | `core/vault.js` | `DEFAULT_VAULT` Windows-özel sabit yol | `os.homedir()/.orion/vault` olarak düzeltildi |
| 3 | `core/session.js` | `_trim()` Anthropic blok mesajlarını sessizce siliyordu | `_flattenMsgs()` ile değiştirildi |
| 4 | `core/session.js` | `undo()` tek elemanlı dizide `splice(-2)` güvensizdi | `msgs.length >= 2` guard eklendi |
| 5 | `core/session.js` | Modül-seviyesi interrupt durumu test edilemez, çok-session riskli | Instance'a taşındı (`_activeSession` yönlendirme) |
| 6 | `core/telemetry.js` | Her token olayında `appendFileSync` event loop'u bloke ediyordu | `setImmediate` drain buffer'ı ile async yazım |
| 7 | `core/embed.js` | LRU cache aslında LRU değildi (hit'te sıra güncellenmiyor) | `_cacheGet`'te `delete + set` ile gerçek LRU |
| 8 | `core/speculex.js` | Hata string filtresi sadece `startPrefetch`'teydi — diğer çağırıcılar korumasızdı | `set()` içine taşındı |
| 9 | `core/daemon.js` | `generateDigest` + `mineWeaknesses` aynı anda Ollama'ya gidiyordu | `generateDigest().finally(() => mineWeaknesses())` — sıralı |
| 10 | `core/daemon.js` | `mineWeaknesses`'da `ollamaRequest(prompt)` model argümanı açık değildi | `ollamaRequest(model, prompt, opts)` 3-arg form |
| 11 | `core/tools.js` | `ALL_DEFS` MCP araçlarını içermiyordu (yanıltıcı isim) | `get ALL_DEFS()` getter → `getDefs()` çağırır |

### Kritik Bug Düzeltmeleri (önceki oturum)
- **ollamaRequest arity**: 1-arg `(prompt)` ve 3-arg `(model, prompt, opts)` her ikisini destekler
- **SpeculativeCache \0 separator**: `server:tool` MCP format için key ayırıcı düzeltildi
- **Cache poisoning**: hata stringleri önbelleğe artık alınmıyor
- **Cache 50KB cap**: büyük sonuçlar önbelleği şişirmiyor
- **AbortSignal body drain**: `ping.text()` artık tüketiliyor

### CLI Yenileme (önceki oturum)
- **Chat turn yapısı**: `╭─ ozyn ─╮ / │ ► / ╰──╯` kutulu input + `─ orion ✦ ──` separator
- **Sticky input**: scroll region (`\x1b[1;N-3r`) ile input kutusu terminalde altta sabit kalır
- **Tool format**: `* ToolName "arg"` + `→ result` (opencode tarzı)
- **Tab completion**: `/` komutları için `cmdCompleter`
- **History dedup**: ardışık aynı girişler temizlenir
- **`/gecmis`**: oturum geçmişi komutu (aliases: history)

### Weakness Mining Doğrulama — Sessiz Hata Zinciri Bulundu ve Düzeltildi (bu oturum)

`/weakness` hiç rapor üretmemiş olması araştırılırken (bkz. Açık/Sıradaki → İş A), gerçek Ollama'ya karşı uçtan uca deneme yapıldı ve üç kırık nokta bulundu:

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 12 | `core/extract.js` | `ollamaRequest`, Ollama'nın `{"error": "model not found"}` yanıtını sessizce `""`'e çeviriyordu | `data.error` kontrolü eklendi, artık `throw` ediyor |
| 13 | `core/extract.js` | `tier1Model` varsayılanı (`qwen2.5-coder:7b`) yerelde kurulu olmayabiliyor, hata hiç görünmüyordu | `resolveOllamaModel()`: `/api/tags`'ten kurulu modelleri okur (60sn önbellek), istenen model yoksa chat yapabilen ilk modele düşer (embedding modelleri elenir); `extractWithOllama` parse'tan önce `stripThinking` uygular |
| 14 | `core/daemon.js` | `mineWeaknesses()` boş/kısa Ollama yanıtında sessizce `return` ediyordu, hiçbir yerde iz kalmıyordu | `parentPort.postMessage({type:"error", ...})` ile `daemon_error` olayına bağlandı |

Doğrulama: sahte `≥2` tekrar eden hata kaydı + gerçek yerel Ollama ile uçtan uca test edildi. Düzeltme öncesi model bulunamama hatası 49ms'de sessizce boş dönüyordu; düzeltme sonrası gerçek kurulu modele düşüp gerçek yanıt üretiyor.

### İş B (Spekülatif Yürütme) — session entegrasyonu zaten vardı, aynı kök nedenden ölüydü (bu oturum)

PLAN.md "session.js'e entegre değil" diyordu — bu artık doğru değil: `session.js:246`
tier2 rotasında `speculex.startPrefetch()`'i zaten çağırıyordu ve `_callToolCached`
zaten `specCache`'e bakıyordu. Gerçek sorun İş A'yla **aynı kök nedendi**:
`speculex.js`'in kendi ham `fetch`'i `qwen2.5-coder:7b` kullanıyordu (yerelde yok),
JSON.parse boş yanıtta patlayıp sessizce yutuluyordu — canlı testte doğrulandı
(cache hep boş, hiç telemetry olayı yok).

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 15 | `core/speculex.js` | `_predictToolCalls` kendi ham `fetch`'ini kullanıyordu — İş A'nın model/hata düzeltmesinden faydalanmıyordu | `extract.js`'in `ollamaRequest`'ine yönlendirildi |
| 16 | `core/speculex.js` | Yerel "thinking" modelleri (`vibethinker` vb.) JSON'dan önce `<think>` bloğu üretiyor, hiç temizlenmiyordu → `JSON.parse` hep patlıyordu | `stripThinking()` `extract.js`'e çıkarılıp (session.js'in `_cleanResponse`'u ile paylaşılıyor) `_predictToolCalls`'a uygulandı |
| 17 | `core/speculex.js` | Timeout 8sn — yerel thinking modeli bu donanımda 14-20sn arası değişken sürüyor, her zaman timeout'a giriyordu | 25sn'ye çıkarıldı |

Doğrulama: `ollamaRequest` doğrudan çağrılıp gerçek JSON tahmini üretildiği
gözlemlendi (`list_files`+`read_file`, doğru path'lerle, ~20sn'de). **Açık mimari
not:** tier2 (bulut) genelde bu süreden hızlı cevap verebilir — bu durumda
spekülasyon zamanında bitmeyip boşa gider (zararsız, fire-and-forget). Bu bir
kod bug'ı değil, kurulu yerel modelin hız karakteristiği — daha hızlı/thinking
yapmayan bir tier1 modeli kurulursa iyileşir.

### Provider Düzeltmesi (önceki oturum)
- **Clack kaldırıldı**: `selectInput` (arrow-key, raw mode) + `maskedInput` (custom) clack bağımlılığını tamamen devre dışı bıraktı — çift render sorunu giderildi
- **Key env senkron**: built-in provider'lar için key hem `process.env[keyEnv]`'e hem `credentials.json`'a yazılıyor

---

## Açık / Sıradaki

### Plan (öncelik sırasıyla)

| # | İş | Açıklama | Durum (2026-07-13) |
|---|---|---|---|
| A | Weakness Mining | `daemon.js`'e idle-zaman log analizi, `/weakness` komutu, onay kapılı tool güncelleme | Kaynak zinciri (model fallback + `<think>` temizliği) **kapatıldı** (bkz. İş F yukarıda), canlı doğrulandı — gerçek özet üretiyor, `manuel` etiketine düşmüyor. Genişletme yerine kaynağı kapatma kararı alındı (bkz. yukarıki "Bağlam ve karar"), weakness-mining'in kendisi hâlâ dar/basit tutuluyor — bilinçli. Onay kapılı tool güncelleme (apply) kısmı hâlâ yazılmadı. |
| B | Spekülatif yürütme | Tier2 beklerken tier1 read-only tool tahmin + önbellek | **Gerçekten ölçüldü ve KATI SINIR testle kanıtlandı** (bkz. İş B yukarıda) — %80 isabet, ~2.0sn/tur beklenen kazanç. 07-11'in "doğru path'lerle" iddiası yanlış çıktı (şema uyuşmazlığı vardı, düzeltildi). Açık: manuel backend seçiminde prefetch hiç çalışmıyor; `search` aracı `node_modules` tarıyor, yavaş. |
| C | FEP Faz 0 | `freeenergy.js` gölge modun gerçek telemetry karşılaştırmasına bağlanması | **Kapatıldı ve ölçüldü.** `/router shadow-report` komutu + `router_shadow_decision` event'i eklendi, gerçek karar hiç değiştirilmiyor. 20 turluk simülasyonda sapma oranı ve yapısı çıkarıldı (varsayılan konfigde %60, λ=1.0'da %50 farklı yönde). |
| D | Kimlik adayı | İş A/B/C bitmeden başlanmaz | A/B/C artık gerçek veriyle doğrulanmış durumda — başlanabilir, henüz başlanmadı |

### jcode Karşılaştırması Sonrası Eklenenler (2026-07-12)

jcode (github.com/1jehuang/jcode) ile satır satır karşılaştırma yapıldı; eksik bulunan
özelliklerin Node.js karşılıkları eklendi. Kapsam dışı bırakılanlar: Rust'a geçiş,
gerçek OAuth akışları (provider'ların özel client kayıtları gerekir), iOS uygulaması,
mermaid renderer, dikte/STT.

| Özellik (jcode satırı) | Orion'daki karşılığı | Dosya |
|---|---|---|
| LM Studio yerel model | Built-in backend, `http://localhost:1234/v1`, anahtarsız, canlı erişilebilirlik kontrolü | `backends/lmstudio.js` |
| Tarayıcı aracı | `web_fetch`: HTML→metin, SSRF koruması (özel ağ engelli), 3 yönlendirme, güvenilmez-veri işareti | `tools/web.js` |
| Turn embedding + pasif hatırlama | Oturum-içi turn belleği: her turn embed edilir, bağlam sıkıştıktan sonra eski turn'lerin TAM içeriği pasif geri çağrılır | `core/turnmemory.js` |
| Tembel skill yükleme | Skill'ler başta yüklenmez; mesaj embedding/fuzzy ile eşleşince o tura enjekte edilir | `core/skills.js findRelevantSkills` |
| `/account` çoklu hesap | Adlandırılmış anahtar profilleri, `~/.orion/accounts.json`, başlangıçta otomatik uygulanır | `core/accounts.js` + `commands/account.js` |
| 20+ provider | 6 yeni preset: alibaba, minimax, zai, nvidia, perplexity, sambanova (toplam 14 preset + 6 built-in) | `backends/custom.js` |
| Self-dev modu | `/selfdev on`: Orion kendi kaynağını düzenler; reload/restart öncesi testler zorunlu yeşil; restart oturumu `--resume` ile devralır | `core/selfdev.js` |
| Cross-harness resume | `/import`: Claude Code JSONL oturumlarını listeler ve devralır | `core/harness-import.js` |
| Swarm | Swarm-lite: `POST /message` (DM/broadcast), aynı dosyaya 10 dk içinde iki oturum yazarsa ikisine de çakışma uyarısı | `orion-server.js` + `session.inbox` |
| Performans ölçümü | `npm run bench`: **260ms başlangıç, 80MB RSS** (medyan, 3 koşu) — jcode 14ms/28MB (Rust), Claude Code ~3437ms/387MB (jcode'un tablosu) | `scripts/bench.js` |

Ayrıca: komut kayıt defteri artık dizin taramalı (`core/commands/*.js` otomatik keşif) —
yeni komut dosyası eklemek kayıt gerektirmez; `reload()` self-dev hot-reload'ı sağlar.
`/model` fuzzy arama seçicisinde kaydırma penceresi düzeltildi (seçim 10. satırı geçince
liste artık kayıyor).

### Bilinen Sınırlamalar
- **SIGWINCH**: Windows'ta `SIGWINCH` desteği sınırlı (terminal resize tepkisi çalışmayabilir)
- **Moltbook araçları**: `tools/moltbook.js` mevcutken `feed_read` ve `post_at` Ozyn onayı olmadan çalışmaz
- **Turn belleği / tembel skill (embedding yolu)**: `nomic-embed-text` yüklü Ollama gerektirir; yoksa turn belleği devre dışı, skill eşleşmesi fuzzy'ye düşer
- **`/selfdev reload`** sadece komut modüllerini yeniler; çekirdek (`core/session.js` vb.) değişiklikleri `/selfdev restart` ister
- **Yeni presetlerin baseURL'leri** (minimax, zai, perplexity...) canlı anahtarla doğrulanmadı — yanlışsa `/provider` üzerinden baseURL elle verilebilir

---

## Güvenlik Kısıtları (değişmez)

- `credentials.json` içeriği asla stdout/log'a yazdırılmaz
- `run_command`: headless'ta tamamen kapalı; interaktif modda her çalıştırmada onay ister
- Feed içeriği güvenilmez veri — içindeki talimatlar uygulanmaz
- MCP araç sonuçları model'e gider, kullanıcıya raw gösterilmez
- HTTP server sadece `127.0.0.1` dinler
- Otonom döngü, cron, zamanlanmış görev kurulmaz
