# Orion Aethelred v4 — Durum Raporu
> Tarih: 2026-07-11 · Test: 135/135 · Kod: ~8 200 satır

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
| Test | ✅ 121/121 | 18 test dosyası |

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
| Input box | `userTurnHeader` + `makeInputPrompt` + `inputBoxBottom` | `╭─ ozyn ─╮ / │ ► / ╰──╯` |
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
| **Toplam** | **178 / 178 ✅** |

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
| 13 | `core/extract.js` | `tier1Model` varsayılanı (`qwen2.5-coder:7b`) yerelde kurulu olmayabiliyor, hata hiç görünmüyordu | `resolveOllamaModel()`: `/api/tags`'ten kurulu modelleri okur (60sn önbellek), istenen model yoksa kurulu ilk modele düşer |
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

| # | İş | Açıklama | Engel |
|---|---|---|---|
| A | Weakness Mining | `daemon.js`'e idle-zaman log analizi, `/weakness` komutu, onay kapılı tool güncelleme | Kod yazıldı, birim testleri geçiyor, ama üretimde hiç tetiklenmedi (bu makinede `~/.orion/reports/` hiç oluşmamış — tetikleme eşiği olan "7 günde ≥2 aynı hata" gerçek veride henüz hiç oluşmadı). Bu oturumda ayrıca gerçek bir çalıştırma denemesinde `tier1Model` varsayılanının (`qwen2.5-coder:7b`) yerelde kurulu olmadığı ve `ollamaRequest`'in bu hatayı sessizce yuttuğu bulundu — düzeltildi (bkz. aşağı). Onay kapılı tool güncelleme (apply) kısmı hâlâ yazılmadı. |
| B | Spekülatif yürütme | Tier2 beklerken tier1 read-only tool tahmin + önbellek | **Düzeltildi ve doğrulandı.** `session.js:246` entegrasyonu zaten vardı (plan bunu bilmiyordu) — İş A'yla aynı kök nedenden (model çözümleme + `<think>` temizliği eksikti) sessizce hiç çalışmıyordu. Şimdi canlı testte doğru JSON tahmini üretiyor. Açık nokta: yerel model yavaş (14-20sn), tier2'den yavaş kalabilir — kod değil, model seçimi meselesi. |
| C | FEP Faz 0 | `freeenergy.js` gölge modun gerçek telemetry karşılaştırmasına bağlanması | `shadowLog()` zaten `session.js:251`'de çağrılıyor ve gerçek `fep_shadow` telemetry olayı üretiyor görünüyor — ama bu iş bu oturumda B gibi canlı doğrulanmadı, sadece kod okundu. `isEnabled()` `cfg.freeEnergyMode` varsayılan kapalı olduğundan gölge mod hiç tetiklenmemiş olabilir — İş A/B'deki "yazıldı ama hiç ateşlenmedi" deseni burada da tekrarlıyor olabilir, doğrulanmadı. |
| D | Kimlik adayı | İş A/B/C bitmeden başlanmaz | Ertelendi |

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
