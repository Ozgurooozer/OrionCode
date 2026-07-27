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

Çekirdek TypeScript'e taşındı (`--experimental-strip-types` ile derlemesiz
çalışır); `.js` giriş noktaları `.ts` ile değiştirildi.

```
npm test
# 623/623 test geçiyor (node --test)
```

## Mimari (özet)

```
orion.ts (CLI, TUI)        orion-server.ts (HTTP + SSE)    orion-mcp.ts (MCP sunucu)
         │                          │                              │
         └──────────────── core/session.ts ─────────────────────────┘
                                   │
          ┌────────────────────────┼──────────────────────────┐
          │                        │                           │
    backends/               core/router.ts              core/tools.ts
    (anthropic, ollama,      (tier1/tier2 karar)         (fs, memory, vault,
     openai-compat fabrika:   + Thompson sampling         shell, moltbook, MCP)
     openai, openrouter,      + FEP gölge log)
     huggingface, lmstudio,
     nim, özel BYOK)
```

- **Backends** — Anthropic (native), Ollama (native tool calling + ReAct
  düşüşü), OpenAI-uyumlu tek fabrika (OpenAI, OpenRouter, HuggingFace, LM
  Studio, NVIDIA NIM, özel BYOK uç noktaları).
- **Router** — basit/karmaşık görev sınıflandırması + bütçe moduna göre
  yerel/bulut arası geçiş; Thompson sampling ile zamanla öğrenir.
- **Çalışma modları** — `chat` (araçsız), `plan` (salt-okunur), `build`
  (yazar, komutları otomatik onaylar), `agent` (varsayılan, tüm araçlar +
  komut onayı), `tayf` (KUŞ-SU mimarisi davranış eki). `/mode` komutuyla
  değiştirilir, `~/.orion/modes/*.js` üzerinden plugin mod eklenebilir.
- **Vault** — konuşmalardan çıkarılan bilgiyi `~/.orion/vault/` altında HTML
  olarak biriktirir; embedding kuruluysa semantik arama, kurulu değilse
  anahtar-kelime yedeğine düşer.
- **MCP** — hem istemci (`mcp.json`'daki sunuculara bağlanır, araçlarını
  `mcp__sunucu__araç` adıyla köprüler) hem sunucu (`orion-mcp.ts`) rolünü
  oynar.
- **Multi-agent koordinatör** — `core/coordinator.ts`, bir görevi plan →
  execute → review aşamalarına böler; researcher/coder/reviewer rolleri
  `core/subagent.ts` ile ayrı LLM çağrılarında çalışır (`/swarm`).
- **TUI** — bağımlılıksız (readline tabanlı), truecolor render, akış modeli
  (`tui/`).
- **Electron masaüstü uygulaması** (`electron/`) — ayrı `package.json`;
  Babylon.js 3D sahne + floating panel sistemi (chat, sessions, vault,
  terminal) üzerinden `orion-server.ts`'e SSE ile bağlanır.
- **TAYF** (`TAYF/`) — çok ajanlı mesajlaşma protokolü deneyi: paylaşılan
  bir kanal üzerinden birbirinin kanıtını denetleyen iki ajan; her mesaj
  kanıt etiketi taşır ve karşı taraf onu terfi ettiremez.

## Kurulum

```bash
npm install
```

Node.js 22+ gerekir (`--experimental-strip-types` için; test edilen sürüm: v26).

## Kullanım

```bash
node orion.ts                  # etkileşimli CLI
node orion.ts -p "soru"        # tek atış, headless (CI/pipe için)
node orion.ts --resume <id>    # kayıtlı oturumu devam ettir
npm run server                 # HTTP + SSE sunucusu (127.0.0.1)
node orion-mcp.ts              # MCP sunucu modu
npm test                       # test paketi (623/623)
npm run typecheck              # tip kontrolü (derleme yapmaz)
npm run bench                  # başlangıç süresi / RSS ölçümü
npm run eval                   # TAYF/Meissa sınıflandırıcı eval (promptfoo)

cd electron && npm start       # Electron masaüstü uygulaması
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
