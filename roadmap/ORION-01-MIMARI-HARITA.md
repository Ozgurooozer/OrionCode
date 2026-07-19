# ORION — 01. Mimari Harita
> Orion Aethelred v4'ün tam teknik mimarisi. Node.js/JavaScript ile yazılmıştır
> (Java DEĞİL — bu isim karışıklığı geçmişte bir kez yaşandı, netleştirilmiştir).
> Neden JS: Babylon.js (gelecekteki 3D editör) zaten JS kütüphanesi, aynı
> runtime'ı paylaşmak ileride entegrasyonu kolaylaştırıyor; MCP SDK'sı JS/TS
> öncelikli; event-driven mimari (EventEmitter) Node'un doğal güçlü yanı.

---

## 1. Üst Seviye Mimari

```
orion.js (CLI/REPL)      orion-server.js (HTTP API)      orion-mcp.js (MCP sunucu)
        │                         │                              │
        └─────────────────────────┴──────────────────────────────┘
                                   │
                          core/session.js
                    (tier1 + tier2 karar döngüsü)
                                   │
        ┌──────────────┬──────────┼──────────────┬─────────────────┐
        │              │          │              │                 │
   backends/      core/router.js  core/tools.js   core/events.js    core/vault.js
   (5 built-in    (Thompson +     (fs, memory,   (SSE olay          (hafıza,
   + custom.js)    FEP gölge)      vault, shell)   protokolü)         4 katman)
        │
   core/speculex.js         core/daemon.js
   (tier2 beklerken          (vault yazımı,
    read-only prefetch)       digest, weakness
                               mining, idle işleri)
```

---

## 2. Dizin Yapısı (molp reposu)

```
molp/
├── orion.js               ← REPL + tek atış (-p) + plugin/MCP/vault başlangıcı
├── orion-server.js        ← HTTP API (127.0.0.1, Bearer token, SSE /events)
├── orion-mcp.js           ← MCP SUNUCU (Claude Code buna bağlanabilir)
│
├── backends/               ← LLM sağlayıcı entegrasyonları
│   ├── index.js            ← detect(), get(), registerProvider()
│   ├── anthropic.js        ← native blok akışı, KV prefix cache, thinking desteği
│   ├── ollama.js           ← /api/chat native tools
│   ├── openai.js / openrouter.js / huggingface.js / lmstudio.js
│   └── custom.js           ← BYOK: ~/.orion/providers.json
│
├── core/                   ← Çekirdek mantık
│   ├── session.js          ← Session sınıfı; 3 backend loop'u (Anthropic/OpenAI-family/Ollama)
│   ├── router.js           ← tier1/tier2 routing kararı + Thompson + FEP gölge kancası
│   ├── thompson.js         ← Beta dağılımlı öğrenen router (Bayes)
│   ├── freeenergy.js       ← FEP gölge modu: pragmatik+epistemik skor, GERÇEK kararı DEĞİŞTİRMEZ
│   ├── modes.js            ← chat/plan/build/agent modları, araç kısıtlaması
│   ├── tools.js             ← tool dispatch (statik + dinamik/MCP)
│   ├── persist.js          ← ~/.orion/sessions/*.json
│   ├── checkpoint.js       ← yazım öncesi otomatik snapshot, FIFO budama (MAX_KEEP=200)
│   ├── diff.js             ← unified diff, LCS algoritması
│   ├── diagnostics.js      ← node --check ile JS/JSON hata tespiti
│   ├── credentials.js      ← API anahtarı yönetimi (asla ekrana yazdırmaz)
│   ├── budget.js           ← maliyet takibi, KV cache fiyatlandırması
│   ├── memory.js           ← semantik hafıza (dedup, cosine>0.92)
│   ├── embed.js            ← Ollama nomic-embed-text ile embedding, LRU cache
│   ├── extract.js          ← LM ile konuşma özeti çıkarma (episodic → semantic)
│   ├── vault.js            ← writeSession, searchVault, Shannon filtresi, Hebbian aktivasyon
│   ├── vaultmap.js         ← PCA + k-means ile kavram haritası (/vault map)
│   ├── daemon.js           ← worker_threads; idle zamanda vault yazımı, digest, weakness mining
│   ├── speculex.js         ← spekülatif salt-okunur tool prefetch (TTL=30s, SAFE_TOOLS whitelist)
│   ├── mcp.js              ← MCP client (stdio+HTTP), [DIŞ VERİ] etiketleme
│   ├── events.js           ← EventEmitter sarmalayıcı, SSE için olay şeması
│   ├── coordinator.js      ← plan()→execute()→review() çoklu-rol orkestrasyon
│   ├── subagent.js         ← headless alt-ajan çalıştırma
│   ├── telemetry.js        ← NDJSON olay logları (async, event-loop bloklamaz)
│   ├── turnmemory.js       ← oturum-içi turn belleği (embedding ile pasif hatırlama)
│   ├── skills.js           ← tembel-yüklenen prosedürel hafıza (skill damıtma)
│   ├── accounts.js         ← çoklu hesap profilleri
│   ├── selfdev.js          ← self-dev modu (Orion kendi kaynağını düzenler, test-zorunlu reload)
│   ├── harness-import.js   ← Claude Code JSONL oturumlarını devralma
│   ├── i18n.js             ← TR/EN dil desteği
│   └── commands/           ← ~25 komut modülü, otomatik dizin taramalı kayıt
│
├── tools/                  ← AI'ın çağırabildiği araçlar
│   ├── fs.js                ← read_file/write_file/edit_file/list_files/search (sandbox korumalı)
│   ├── shell.js             ← run_command (onay gerekli, headless'ta kapalı)
│   ├── memory.js            ← memory_read/add/search
│   ├── vault.js              ← vault_search/recent/read
│   ├── moltbook.js          ← feed_read/post/comment (onay gerekli, [DIŞ VERİ])
│   └── web.js                ← web_fetch (SSRF korumalı)
│
├── tui/                    ← Terminal arayüzü bileşenleri
│   ├── index.js             ← tema, sticky input, tool format render
│   ├── masked-input.js      ← API key girişi (echo yok)
│   ├── select-input.js      ← arrow-key seçim (clack bağımlılığı YOK, kaldırıldı)
│   ├── fuzzy.js / fuzzy-picker.js  ← typo-toleranslı model seçici
│
├── tests/                  ← 37+ test dosyası, node:test ile, 213/213 geçiyor
├── PERSONA.md              ← çalışma disiplini ve ses karakteri (Orion'a özgü, QSE YOK)
├── CLAUDE.md               ← Orion kimliği + kural özeti
└── package.json            ← minimal bağımlılık felsefesi (5 kritik paket)
```

---

## 3. Veri Akışı — Konuşma Döngüsü

```
session.send(text)
  → memory.query(text)          ← semantik hafıza injection (eşik: 0.6, normalize skor)
  → vault.searchVault(text,2)   ← vault bilgisi [GÜVENİLMEZ DIŞ VERİ] etiketiyle
  → router.decide(text,...)     ← tier1 (local Ollama) veya tier2 (cloud) kararı
        └→ freeenergy.shadowHook()  ← paralel, GERÇEK KARARI DEĞİŞTİRMEZ, sadece loglar
  → _callWithFallback()         ← birincil başarısız → sıradaki backend
      → _dispatchLoop(backend, model)
          → _anthropicLoop()    (KV cache breakpoint'leri, thinking desteği)
          → _ollamaLoop()       (native tools, ReAct fallback)
          → _openaiFamilyLoop() (diğer tüm backend'ler)
  → speculex prefetch (paralel, tier2 beklenirken tier1 salt-okunur tool tahmini)
  → budget.add() + telemetry.record() + events.emit(...)
  → session._save()
  → her 5 turda → _extractMemories() (arka planda, daemon üzerinden)
```

---

## 4. Vault — 4 Katmanlı Hafıza Şeması

| Katman | Karşılığı | Mekanizma |
|---|---|---|
| **Working** (anlık) | `session.msgs` | Aktif context, session boyunca |
| **Episodic** (olaylar) | `daemon.js` → `extract.js` | Tool çağrıları dahil konuşma özeti, LM ile üretilir |
| **Semantic** (kalıcı bilgi) | `vault.js` + `embed.js` | `~/.orion/vault/` — HTML dosyaları + embedding vektörleri |
| **Personalized** (kullanıcı tercihi) | `~/.orion/config.json` | tier1/tier2 model tercihleri, memoryEffort vb. |

**Öğrenme katmanı (semantic'in üstüne oturan iyileştirmeler):**
- **Shannon filtresi** — yeni içerik mevcut vault'a çok benziyorsa (cosine>0.82) kaydetme
- **Hebbian aktivasyon** — erişilen kayıtların skoru artar, erişilmeyenler zamanla soluklaşır (silinmez)
- **Lovelace digest** — idle zamanda vault'u tarayıp haftalık özet üretir (`/vault digest`)
- **VaultMap** — PCA + k-means ile kavram haritası, SVG çıktı (`/vault map`)

**RAG olarak anlaşılması:** Vault'un semantik arama + context-injection mekanizması klasik bir
RAG (Retrieval-Augmented Generation) mimarisidir — doküman deposu (sessions/*.html), embedding
(vectors), retrieval (searchVault), augmentation (prompt'a enjeksiyon), generation (LLM).
Embedding çalışmadığı dönemlerde sistem "keyword-fallback"e düşer — bu, gerçek RAG değil,
zayıf bir taklididir (bkz. dosya 02, embedding krizi).

---

## 5. Katman 0 — Olay Protokolü (Anayasa)

`core/events.js`, standardize edilmiş olay tipleri yayınlar:
`tool_start`, `tool_end`, `diff`, `thinking_delta`, `text_delta`, `approval_request`,
`approval_resolved`, `error`, `session_saved`, `speculex_hit`, `speculex_miss`,
`router_shadow_decision`, `silent_catch_hit`, `security_boundary_hit`.

`orion-server.js` bunu SSE (`/events`) üzerinden dışarı akıtır. **Bu, gelecekteki
node-graph editörü ve Babylon editörünün bağlanacağı tek gerçek kaynak.** TUI bugün
bu akışın sadece bir istemcisi. Listener temizliği (bağlantı kapanınca event
emitter'dan çıkarma) doğrulanmıştır — memory leak riski yok.

---

## 6. Güvenlik Sınırları (değişmez, kod-seviyesinde sabitlenmiş)

| Kural | Nerede uygulanır |
|---|---|
| Workspace sandbox — dosya araçları proje kökü + `~/.orion` dışına çıkamaz | `tools/fs.js`, allowlist açık, `security_boundary_hit` event'i ile görünür |
| `credentials.json` asla ekrana/loga yazılmaz | `core/credentials.js` |
| `run_command` her zaman onay ister, headless'ta tamamen kapalı | `tools/shell.js` |
| Moltbook feed / MCP sonuçları / vault içeriği `[DIŞ VERİ]` etiketli, talimat olarak işlenmez | `core/mcp.js`, `tools/moltbook.js`, `core/session.js` |
| HTTP server sadece `127.0.0.1` dinler | `orion-server.js` |
| Otonom döngü/cron/zamanlanmış görev yoktur | Mimari genelinde |

---

## 7. Modlar

| Mod | Araçlar | Yazma | Açıklama |
|---|---|---|---|
| `chat` | ❌ | ❌ | Sadece metin |
| `plan` | ✅ salt-okunur | ❌ | read/list/search/vault_* |
| `build` | ✅ | ✅ | run_command onay ister |
| `agent` (varsayılan) | ✅ | ✅ | run_command onay ister |

---

## 8. Backend'ler

anthropic, ollama, openrouter, openai, huggingface, lmstudio (built-in) +
BYOK (`~/.orion/providers.json` üzerinden groq, deepseek, mistral, xai,
fireworks, cerebras, moonshot, alibaba, minimax, zai, nvidia, perplexity,
sambanova gibi presetler).

---

## 9. Komut Envanteri (özet)

**Session:** `/gecmis` `/sessions` `/load` `/delete` `/dal` `/tree` `/checkpoint`
**Model/Provider:** `/model` `/provider` `/provider presets`
**MCP:** `/mcp connect/add/remove/tools`
**Bellek:** `/memory` `/skill` `/skill mine` `/vault` `/vault map` `/vault digest`
**Analiz:** `/stats` `/budget` `/router` `/weakness` `/entropy`
**Araçlar:** `/read` `/search` `/diff` `/subagent` `/coordinator`
**Ayar:** `/settings` `/language` `/mode` `/plugin` `/account` `/selfdev` `/import`

---

## 10. Test Altyapısı

`npm test` → `node --test "tests/**/*.test.js"`. Şu an **213/213** geçiyor,
37+ test dosyası. Her test izole `ORION_HOME` (mkdtempSync) kullanır —
`~/.orion` gerçek verisi kirlenmez.
