# Orion — BYOK CLI Kodlama Ajanı (Araştırma Projesi)

> Kişisel bir araştırma projesi: "kendi anahtarını getir" (BYOK) modelinde,
> yerel (Ollama) ve bulut (Anthropic/OpenAI/OpenRouter/...) modelleri aynı
> çekirdekte birleştiren, MCP destekli, kalıcı hafızalı bir CLI kodlama ajanı
> tasarlamak — Claude Code, OpenCode, Aider gibi araçlardan öğrenerek.

## Amaç

Bu depo bir ürün değil, bir **araştırma sürecinin** kaydı. Sorulan sorular:

- Bir kodlama ajanının çekirdeği (`session + tools + providers + events`)
  ne kadar sağlayıcıdan bağımsız tutulabilir?
- Basit görevleri yerel modele, karmaşık görevleri buluta yönlendiren bir
  **router** (tier1/tier2) gerçekten maliyet-kalite dengesi kurabilir mi?
- Konuşmalardan biriktirilen bir **vault** (yerel HTML bilgi tabanı + isteğe
  bağlı embedding), zamanla kullanılabilir bir hafızaya dönüşür mü, yoksa
  sessizce mi bozulur?
- MCP (Model Context Protocol) istemci/sunucu ikilisi, harici araçları ne
  kadar güvenle bir ajana bağlayabilir?

Cevaplar kod içinde, `DURUM.md` ve `DENETIM-RAPORU.md` dosyalarında iz
bırakıyor — biri "ne yapıldı", diğeri "nerede kırıldı ve neden".

## Durum

Deneysel. Aktif geliştiriliyor, üretim kullanımı için sertleştirilmemiş.
`DENETIM-RAPORU.md`, bu projenin kendi üstünde yapılmış bağımsız bir
denetimi ve bulunan gerçek hataları (yol-traversal, sandbox eksikliği,
sessizce bozulan hafıza altyapısı) belgeliyor — "çalışıyor" ile "çalışıyor
gibi görünüyor" arasındaki farkın somut örnekleri için oraya bakın.

```
npm test
# 185/185 test geçiyor (node --test)
```

## Mimari (özet)

```
orion.js (CLI, TUI)        orion-server.js (HTTP + SSE)
         │                          │
         └────────── core/session.js ───────── (tier1/tier2 döngüsü)
                          │
     ┌────────────────────┼─────────────────────┐
     │                    │                      │
backends/            core/router.js         core/tools.js
(anthropic, ollama,   (Thompson sampling     (fs, memory, vault,
 openai, openrouter,   + FEP gölge log)       shell, moltbook, MCP)
 huggingface, custom)
```

- **Backends** — Anthropic (native), Ollama (native tool calling + ReAct
  düşüşü), OpenAI-uyumlu tek fabrika (OpenAI, OpenRouter, HuggingFace, LM
  Studio, özel BYOK uç noktaları).
- **Router** — basit/karmaşık görev sınıflandırması + bütçe moduna göre
  yerel/bulut arası geçiş; Thompson sampling ile zamanla öğrenir.
- **Vault** — konuşmalardan çıkarılan bilgiyi `~/.orion/vault/` altında HTML
  olarak biriktirir; embedding kuruluysa semantik arama, kurulu değilse
  anahtar-kelime yedeğine düşer.
- **MCP** — hem istemci (`mcp.json`'daki sunuculara bağlanır, araçlarını
  `mcp__sunucu__araç` adıyla köprüler) hem sunucu (`orion-mcp.js`) rolünü
  oynar.
- **TUI** — bağımlılıksız (readline tabanlı), truecolor render, akış modeli.

## Kurulum

```bash
npm install
```

Node.js 20+ gerekir (test edilen sürüm: v26).

## Kullanım

```bash
node orion.js                 # etkileşimli CLI
node orion.js -p "soru"        # tek atış, headless (CI/pipe için)
npm run server                 # HTTP + SSE sunucusu (127.0.0.1)
npm test                       # test paketi
npm run bench                  # başlangıç süresi / RSS ölçümü
```

İlk çalıştırmada bir backend gerekir:

- **Yerel:** Ollama'yı `http://localhost:11434`'te çalıştırın.
- **Bulut:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` ya
  da `HF_TOKEN` ortam değişkenlerinden birini ayarlayın, ya da CLI içinden
  `/provider` komutuyla anahtar ekleyin (kalıcı olarak `credentials.json`'a
  yazılır, **asla ekrana yazdırılmaz** ve `.gitignore`'dadır).

## Yapılandırma

| Dosya | İçerik |
|---|---|
| `credentials.json` | API anahtarları (repoya commit edilmez) |
| `~/.orion/config.json` | Bütçe modu, tier1/tier2 model tercihi, dil |
| `mcp.json` / `~/.orion/mcp.json` | MCP sunucu tanımları (proje kazanır) |
| `~/.orion/vault/` | Biriken konuşma hafızası (HTML + isteğe bağlı vektör) |

## Güvenlik

- API anahtarları hiçbir çıktı yoluna yazılmaz.
- Dosya araçları (`read_file`/`write_file`/`edit_file`/`list_files`/`search`)
  bir **çalışma-kökü sandbox'ı** ile sınırlıdır; kök dışına (`../` ya da
  mutlak yol ile) erişim reddedilir ve olay olarak loglanır.
- `run_command` her çalıştırmada açık onay ister; headless modda tamamen
  kapalıdır.
- MCP araç sonuçları ve Moltbook feed içeriği güvenilmez dış veri olarak
  etiketlenir — içlerindeki talimatlar uygulanmaz.
- HTTP sunucu yalnızca `127.0.0.1`'i dinler.

Detaylı bulgular ve düzeltme geçmişi için `DENETIM-RAPORU.md`.

## Bilinen sınırlamalar

- Semantik vault araması ve turn-belleği, `nomic-embed-text` yüklü bir
  Ollama gerektirir; yoksa anahtar-kelime/fuzzy yedeğine düşer.
- Windows'ta `SIGWINCH` desteği sınırlıdır (terminal yeniden boyutlandırma
  tepkisi tutarsız olabilir).
- Yeni eklenen bazı OpenAI-uyumlu provider ön ayarlarının `baseURL`'leri
  canlı anahtarla doğrulanmadı.

## Lisans

MIT — bkz. [LICENSE](LICENSE).
