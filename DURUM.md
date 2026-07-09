# Orion Aethelred — Proje Durum Raporu

**Tarih:** 2026-07-09  
**Sürüm:** v4 (yol haritası tamamlandı + tam kod incelemesi)  
**Platform:** Moltbook — `orion_aethelred`  
**Sahip:** Ozyn

---

## Genel Bakış

Orion, bir CLI kodlama ajanı. Ön yüzü `orion.js`, arka yüzü birden fazla AI sağlayıcısına bağlanabilen katmanlı bir çekirdek. Aynı dizinde çalışan bir MCP sunucusu (`orion-mcp.js`) sayesinde Claude Code oturumlarıyla da entegre oluyor.

Temel fikir: **API modeli konuşur, yerel 7B model arka planda not alır.** Konuşmalar otomatik olarak `C:\vault`'a HTML olarak kaydediliyor, anlamsal aramayla geri çağrılıyor.

---

## v4 — Yol Haritası Tamamlandı (2026-07-09, bu oturum)

GELISTIRME-PLANI.md'deki 6 v4 maddesi + 3 bakım işi bitirildi:

### 1. Git checkpoint — `core/checkpoint.js`
- `write_file`/`edit_file` dosyaya dokunmadan önce otomatik snapshot (`~/.orion/checkpoints`, en fazla 200, 2MB üstü atlanır).
- `/checkpoint` → liste; `/checkpoint geri <id>` → dosyayı geri al (yeni oluşturulmuşsa siler).
- Snapshot hatası yazımı asla engellemez.

### 2. Oturum ağacı — `/dal` + `/tree`
- `session.fork(etiket)`: geçmiş kopyalanır, parent işaretçisi kaydedilir, iki dal bağımsız ilerler.
- `/tree`: pi tarzı dallanma görünümü, aktif dal `← buradasın` ile işaretli.
- `/yukle <id>` artık oturum kimliğini de devralır (kopya oturum sorunu düzeltildi).

### 3. Plugin manifest — `core/plugins.js`
- `~/.orion/plugins/<ad>/orion-plugin.json` → üç yüzey: araçlar (`DEFS`+`execute`), komutlar, provider'lar (openai-compat spec).
- Bozuk plugin diğerlerini düşürmez. `/plugin`, `/plugin yenile`.

### 4. Client/server ayrımı — `orion-server.js`
- `node orion-server.js [--port]`: `GET /health`, `GET /status`, `GET /sessions`, `POST /chat`.
- Sadece 127.0.0.1; Bearer token (`~/.orion/server-token`, timing-safe karşılaştırma); `run_command` sunucuda kapalı.
- Uçtan uca doğrulandı: yerel model HTTP üzerinden cevap verdi.

### 5. Teşhis katmanı — `core/diagnostics.js` (LSP-hafif)
- Yazım/düzenleme sonrası `.js` → `node --check`, `.json` → parse; hata araç sonucuna `⚠ Teşhis:` olarak eklenir → model aynı turda düzeltir.

### 6. Vault graf görünümü — `vault.rebuildGraph()`
- `C:\vault\graph.html`: oturum–etiket kuvvet grafiği (tek dosya, bağımlılıksız canvas), index.html'den bağlantılı, `/vault graf`.

### Bakım
- **Test altyapısı:** `tests/` — 34 test (`npm test`, node:test): budget, router, tools, checkpoint, diagnostics, openai-compat, plugins, vault. `ORION_HOME` env ile tüm config yolları izole edilebilir.
- **Git repo:** `git init` + `.gitignore` (credentials.json commit edilemez — `git check-ignore` doğrulandı).
- **Temizlik:** `orion-cli.js` (v1) ve `core/llm.js` (ölü kod) → `attic/`.

### Kod incelemesinde bulunan ve düzeltilen hatalar
1. `budget.estimateCost("")` boş model adını en pahalı modele eşliyordu (`k.includes("")` her zaman true).
2. `coordinator._callModel` BYOK/openai backend'lerde yanlışlıkla Anthropic'e düşüyordu — artık generic `backends.get().chat`.
3. `daemon.startDaemon` vault dizinini config yerine sabit `C:\vault`'tan alıyordu.
4. `openai.js` `OPENAI_BASE_URL` zaten `/v1` ile bitiyorsa `/v1/v1` üretiyordu.
5. `huggingface.js` emekli `api-inference` ucundaydı → `router.huggingface.co/v1`.
6. `fs.js list_files` glob→regex dönüşümü bozuktu (ilk `*`, kaçışsız nokta) → düzgün glob.
7. **Güvenlik:** `moltbook_feed` çıktısı artık `[DIŞ VERİ]` etiketli; `moltbook_post` kod düzeyinde interaktif EVET onayı istiyor (yalnızca açıklamada yazıyordu).
8. `vault.getVaultDir`/`extract.js` config okuması `router.loadConfig()`'te tekilleşti (cache + ORION_HOME desteği).

---

## v3.1 — BYOK + MCP + TUI v3 (2026-07-08, bu oturum)

Uzman kurulu kararlarıyla (bkz. `GELISTIRME-PLANI.md` + vault kaydı `uzman-kurulu-v3`) dört büyük yapı yenilendi:

### 1. Provider katmanı — BYOK
- `backends/openai-compat.js`: **tek generic sürücü fabrikası** — OpenAI, OpenRouter, HF ve tüm OpenAI-uyumlu servisler bunun konfigürasyonu.
- `backends/custom.js`: `~/.orion/providers.json` ile **5 satır JSON'la yeni sağlayıcı**. 8 hazır preset: groq, together, deepseek, mistral, xai, fireworks, cerebras, moonshot.
- `/saglayici` komutu: listele, ekle, anahtar kaydet (anahtar asla ekrana yazılmaz), sil.
- `credentials.json` genelleşti: her `*_api_key` / `*_token` alanı otomatik env'e taşınır.

### 2. Native tool calling — ReAct devri kapandı
- OpenAI ailesi: `tools` parametresi + `tool_calls` streaming ayrıştırma.
- Ollama: `/api/chat` native tools (**qwen-coder ile doğrulandı**); desteklemeyen modelde otomatik ReAct düşüşü.
- Anthropic: mevcut native blok akışı korundu.
- Fallback zinciri artık erişilemez backend'leri atlar, Ollama modelini diske göre çözümler.

### 3. MCP istemcisi
- `core/mcp.js`: stdio + Streamable HTTP (+SSE düşüşü) transport; proje `mcp.json` + `~/.orion/mcp.json`.
- Araçlar `mcp__<sunucu>__<araç>` adıyla registry'e köprülenir; sonuçlar **güvenilmez dış veri etiketiyle** döner.
- `/mcp` komutu: baglan, kes, araclar, ekle, sil. Kendi `orion-mcp.js` sunucumuza bağlanarak uçtan uca doğrulandı (9 araç).

### 4. TUI v3
- Orion takımyıldızı emblemi (truecolor gradyan), `tui/index.js` yeniden yazıldı.
- **Statusline** her turdan sonra: `mod · backend/model · ↑↓token · $maliyet · ctx%`.
- Markdown renderer v2: çerçeveli kod blokları + sözdizimi vurgusu, ```diff renklendirme, OSC-8 tıklanabilir link, alıntı/liste.
- Araç çağrıları ikonlu tek satır; spinner geçen süre gösterir.
- `orion -p "soru"` tek atış modu (pipe/CI için).

---

## Dosya Yapısı

```
molp\
├── orion.js              — Ana CLI giriş noktası (v3, tam özellikli)
├── orion-cli.js          — Eski/basit CLI (v1, yedek)
├── orion-mcp.js          — MCP sunucusu (Claude Code entegrasyonu)
├── package.json
├── CLAUDE.md             — Kimlik + kural tanımı
├── PERSONA.md            — Ses karakteri + davranış kuralları
├── merak.md              — Orion & Ozyn merak listeleri
├── gozlemler.md          — Platform gözlemleri
├── credentials.json      — API anahtarları (asla ekrana yazdırılmaz)
│
├── core\
│   ├── session.js        — Konuşma döngüsü (tüm backend'ler)
│   ├── router.js         — Tier routing: Ollama vs Cloud
│   ├── budget.js         — Token sayımı + maliyet takibi
│   ├── telemetry.js      — NDJSON oturum logları (~/.orion/logs/)
│   ├── memory.js         — Semantik hafıza (vectors + dedup)
│   ├── embed.js          — nomic-embed-text + cosine similarity + LRU
│   ├── vault.js          — C:\vault HTML bilgi tabanı
│   ├── daemon.js         — worker_thread vault yazıcısı
│   ├── coordinator.js    — Multi-agent: plan → execute → review
│   ├── subagent.js       — Alt-ajan çalıştırıcı (headless orion)
│   ├── tools.js          — Araç kayıt defteri + çağrıcı
│   ├── modes.js          — Mod yöneticisi (chat/plan/build/agent)
│   ├── llm.js            — Ortak LLM yardımcısı
│   └── persist.js        — Oturum kalıcılığı (~/.orion/sessions/)
│
├── backends\
│   ├── anthropic.js      — Native tool calling + streaming
│   ├── ollama.js         — ReAct XML + streaming
│   ├── openrouter.js     — ReAct + model listesi
│   ├── openai.js         — OpenAI compat (araçsız)
│   ├── huggingface.js    — HF Inference API (araçsız)
│   └── index.js          — Backend algılama + sıralama
│
├── tools\
│   ├── fs.js             — Dosya okuma, arama
│   ├── shell.js          — Kabuk komutu çalıştırma
│   ├── memory.js         — Hafıza araçları (ajan kullanımı için)
│   ├── moltbook.js       — Moltbook araçları
│   └── vault.js          — Vault araçları (ajan kullanımı için)
│
├── tui\
│   └── index.js          — Terminal renkleri, print yardımcıları, spinner
│
├── scripts\
│   ├── check_claim.ps1
│   ├── read_feed.ps1
│   ├── create_post.ps1
│   └── comment.ps1
│
└── .claude\
    ├── settings.json     — MCP sunucu tanımı (orion-mcp.js)
    └── commands\
        └── vault-kaydet.md  — /vault-kaydet slash komutu
```

---

## Özellikler

### 1. Çok Backend Desteği
- **Anthropic** — native tool calling, streaming token çıktısı
- **Ollama** — yerel modeller, ReAct XML protokolü, streaming
- **OpenRouter** — 100+ model, ücretsiz/ücretli filtresi, ReAct
- **OpenAI** — compat (araçsız, sade chat)
- **HuggingFace** — Inference API (araçsız)
- Otomatik algılama: `backends/index.js` mevcut sağlayıcıları keşfeder
- Fallback zinciri: birincil backend çökerse sıradakine geçer

### 2. Akıllı Tier Routing (`core/router.js`)
- **aggressive**: büyük context haricinde her şey yerel (tier 1)
- **balanced** (varsayılan): mod + token sayısı + karmaşıklık puanına göre karar
- **quality**: her zaman cloud (tier 2)
- Budget aşılınca otomatik tier 1'e düşme (balanced modda)
- Karar telemetry'e kaydediliyor
- `/router mod <aggressive|balanced|quality>` komutu

### 3. Token Ekonomisi + Maliyet Takibi (`core/budget.js`, `core/telemetry.js`)
- js-tiktoken ile gerçek token sayımı
- Oturum başına USD maliyet tahmini
- Kalan bütçe hesabı
- NDJSON event log → `~/.orion/logs/`
- `/budget` komutu: özet görüntüle
- `/telemetri` komutu: son log eventlerini göster

### 4. Semantik Hafıza (`core/memory.js`, `core/embed.js`)
- nomic-embed-text (Ollama) ile metin gömme
- Cosine similarity ile alakalı hafızaları bulma
- Her konuşmada ilgili hafızalar otomatik enjekte ediliyor
- Dedup: cosine > 0.92 ise aynı bilgi iki kez kaydedilmiyor
- LRU önbellek (embed.js, 256 slot)
- Her N turda otomatik hafıza çıkarımı (arka planda)

### 5. Vault Bilgi Tabanı (`core/vault.js`, `core/daemon.js`)
- `C:\vault\` dizininde HTML formatında kalıcı bilgi tabanı
- `sessions/` — her konuşma ayrı HTML dosyası (karar, kod, kavram, hata bölümleri)
- `index.html` — forum/wiki ana sayfası (JS ile istemci tarafı arama)
- `index.json` — makine-okunabilir indeks
- `vectors.json` — oturum özeti gömme vektörleri
- Daemon (`worker_thread`) konuşma bitiminde otomatik işleme:
  1. Ollama 7B ile bilgi çıkarımı (özet, kararlar, kod, kavramlar, etiketler)
  2. nomic-embed-text ile gömme
  3. HTML yaz + indeks güncelle
- `/vault` komutu: son oturumları listele
- `/vault ara <sorgu>` komutu: anlamsal arama
- `/vault oku <id>` komutu: oturum içeriği
- `/vault durum` komutu: daemon durumu

### 6. MCP Sunucu Entegrasyonu (`orion-mcp.js`)
Claude Code'dan doğrudan kullanılabilen 9 araç:

| Araç | Açıklama |
|------|----------|
| `durum` | Moltbook ajan durumu |
| `feed_oku` | Moltbook feed'ini oku |
| `post_at` | Onaylı post at |
| `yorum_yap` | Onaylı yorum yap |
| `not_oku` | merak/gozlemler/persona dosyalarını oku |
| `vault_ara` | Vault'ta anlamsal arama |
| `vault_son` | Son vault oturumlarını listele |
| `vault_oku` | Belirli bir oturumu oku |
| `vault_kaydet` | Konuşmayı Ollama ile işleyip vault'a kaydet |

Taşıma: stdio (Claude Code) + HTTP+SSE (uzak erişim, token korumalı)

### 7. Multi-Agent Koordinatör (`core/coordinator.js`, `core/subagent.js`)
- Görev → plan (Anthropic) → alt görevlere böl → execute → review sentezi
- Roller: `researcher`, `coder`, `reviewer`
- Sıralı ya da paralel çalışma modu
- Alt-ajanlara hafıza scope'u base64 ile aktarılıyor
- `/koordinator <görev>` komutu

### 8. Oturum Yönetimi
- Kalıcı oturumlar `~/.orion/sessions/` (persist.js)
- `/oturumlar` — listele
- `/yukle <id>` — yükle
- `/sil <id>` — sil
- Bağlam sıkıştırma: 40 mesajı aşınca eski yarısı özetlenerek sıkıştırılıyor

### 9. Çalışma Modları (`core/modes.js`)
| Mod | Araçlar | Kullanım |
|-----|---------|----------|
| `chat` | Yok | Sohbet |
| `plan` | Sadece okuma | Analiz, araştırma |
| `build` | Dosya + Kabuk | Geliştirme |
| `agent` | Tümü | Tam ajan (varsayılan) |

### 10. Terminal Arayüzü (`tui/index.js`)
- Renkli çıktı (chalk)
- Tool çağrısı + sonuç görüntüleme
- Spinner (işlem göstergesi)
- Markdown render
- Prompt: `ozyn>` / `orion>`

### 11. Moltbook Entegrasyonu
- Feed okuma (güvenilmez veri olarak işaretlenmiş)
- Post/yorum: sadece açık "EVET" onayıyla
- PowerShell scriptleri: check_claim, read_feed, create_post, comment

---

## Slash Komutları (orion.js)

**v3.2 (bu oturum) — Dil desteği:** Komutların birincil adı artık İngilizce; eski
Türkçe adlar alias olarak çalışmaya devam ediyor (`/sil` = `/delete`, `/ayar` =
`/settings` gibi). Arayüz dili çalışma zamanında `/language en|tr` (`/dil`) ile
değiştirilebilir, varsayılan `en`. Ayrıntı: `core/i18n.js`.

```
/reset              — Oturumu sıfırla                (alias: /sifirla)
/mode <ad>          — Çalışma modunu değiştir          (alias: /mod)
/model              — Aktif model + mevcut backend'ler
/model or [filtre]  — OpenRouter model listesi
/model hf           — HuggingFace model listesi
/model <b> <id>     — Backend + model değiştir
/sessions           — Kayıtlı oturumlar                (alias: /oturumlar)
/load <id>          — Oturum yükle                     (alias: /yukle)
/delete <id>        — Oturum sil                       (alias: /sil)
/subagent <görev>   — Alt-ajan çalıştır                 (alias: /subajans)
/read <dosya>       — Dosya oku                        (alias: /oku)
/search <pattern>   — Dosya ara                        (alias: /ara)
/router             — Router ayarlarını göster
/router <mod>       — Router modunu değiştir
/vault              — Son vault oturumları
/vault search <s>   — Vault'ta arama
/vault read <id>    — Vault oturumu görüntüle
/vault status       — Daemon durumu
/budget             — Bütçe durumu
/log                — Son log eventleri                (alias: /telemetri)
/coordinator <görev> — Multi-agent koordinatör           (alias: /koordinator)
/settings           — Kalıcı config                    (alias: /ayar)
/provider           — Sağlayıcı yönetimi (BYOK)         (alias: /saglayici)
/language [en|tr]   — Arayüz dilini göster/değiştir     (alias: /dil)
```

---

## Teknik Yığın

| Bileşen | Teknoloji |
|---------|-----------|
| Runtime | Node.js (CommonJS) |
| Token sayımı | js-tiktoken |
| MCP | @modelcontextprotocol/sdk |
| Anthropic | @anthropic-ai/sdk |
| Embedding | nomic-embed-text (Ollama) |
| Çıktı | chalk |
| Platform | Windows 11 |

---

## Düzeltilen Hatalar (2026-07-08)

| # | Dosya | Sorun | Düzeltme |
|---|-------|-------|----------|
| 1 | `core/session.js` | Vault özeti sistem promptuna sansürsüz ekleniyor | `[GÜVENILMEZ DIŞ VERİ]` etiketi + kapanış etiketi eklendi |
| 2 | `core/daemon.js` | Retry'da ham model çıktısı prompta yapıştırılıyor | Sabit retry promptu, model çıktısı dahil edilmiyor |
| 3 | `core/vault.js` | `entry.file` path traversal validasyonu yok | `path.basename()` + `.html` uzantı kontrolü |
| 4 | `core/coordinator.js` | Sub-ajan try/catch yok | Her subtask için try/catch, hata boş output ile devam |
| 5 | `core/coordinator.js` | Promise.all error boundary yok | `Promise.allSettled()` kullanıldı |
| 6 | `core/coordinator.js` | plan()/review() her zaman Anthropic | `_callModel()` yardımcısı — session.backend'e göre dispatch |
| 7 | `core/memory.js` | query() cosine sırasını atıyor | `ranked.map(r => entryMap.get(r.id))` — sıra korunuyor |
| 8 | `core/router.js` | quality modda budget kontrolü yok | `budgetTracker.isExceeded()` quality dalına eklendi |
| 9 | `core/memory.js` | TOCTOU race: eşzamanlı add() | Promise zinciri mutex — add() sıralı çalışıyor |
| 10 | `core/embed.js` | Cache key 200 char slice → collision | SHA-1 hash cache key |
| 11 | `core/extract.js` | Kod tekrarı (daemon + mcp-server) | Ortak `extractWithOllama()` modülü oluşturuldu |

## Kalan Sorunlar

1. **Arayüz** — sadece terminal, komut şeması dağınık
2. **Test yok** — hiç otomatik test bulunmuyor
3. **Git repo yok** — sürüm geçmişi yok
4. **orion-cli.js vs orion.js** — iki ayrı CLI dosyası var; `orion-cli.js` v1 yedek olarak tutuluyor

---

## Çalıştırma

```powershell
# Orion CLI
node orion.js

# Belirli backend/model
node orion.js --backend anthropic
node orion.js --backend ollama --model qwen2.5-coder:7b

# MCP sunucusu (Claude Code otomatik başlatır)
node orion-mcp.js

# MCP HTTP modu
node orion-mcp.js http
```

**Claude Code'dan MCP araçları:** `.claude/settings.json` kayıtlı, `mcp__orion__*` prefixi ile erişilebilir.
