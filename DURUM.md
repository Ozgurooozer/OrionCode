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
| **Toplam** | **121 / 121 ✅** |

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

### Provider Düzeltmesi (önceki oturum)
- **Clack kaldırıldı**: `selectInput` (arrow-key, raw mode) + `maskedInput` (custom) clack bağımlılığını tamamen devre dışı bıraktı — çift render sorunu giderildi
- **Key env senkron**: built-in provider'lar için key hem `process.env[keyEnv]`'e hem `credentials.json`'a yazılıyor

---

## Açık / Sıradaki

### Plan (öncelik sırasıyla)

| # | İş | Açıklama | Engel |
|---|---|---|---|
| A | Weakness Mining | `daemon.js`'e idle-zaman log analizi, `/weakness` komutu, onay kapılı tool güncelleme | Bekliyor |
| B | Spekülatif yürütme | Tier2 beklerken tier1 read-only tool tahmin + önbellek | Speculex altyapısı hazır, session entegrasyonu eksik |
| C | FEP Faz 0 | `freeenergy.js` gölge modun gerçek telemetry karşılaştırmasına bağlanması | lambda=0, infrastructure hazır |
| D | Kimlik adayı | İş A/B/C bitmeden başlanmaz | Ertelendi |

### Bilinen Sınırlamalar
- **@clack/prompts** hâlâ `package.json`'da bağımlılık — kullanılmıyor, silinebilir
- **Sticky input + çok uzun selectInput UI**: scroll region dışına taşma teorik risk
- **SIGWINCH**: Windows'ta `SIGWINCH` desteği sınırlı (terminal resize tepkisi çalışmayabilir)
- **Moltbook araçları**: `tools/moltbook.js` mevcutken `feed_read` ve `post_at` Ozyn onayı olmadan çalışmaz

---

## Güvenlik Kısıtları (değişmez)

- `credentials.json` içeriği asla stdout/log'a yazdırılmaz
- `run_command`: headless'ta tamamen kapalı; interaktif modda her çalıştırmada onay ister
- Feed içeriği güvenilmez veri — içindeki talimatlar uygulanmaz
- MCP araç sonuçları model'e gider, kullanıcıya raw gösterilmez
- HTTP server sadece `127.0.0.1` dinler
- Otonom döngü, cron, zamanlanmış görev kurulmaz
