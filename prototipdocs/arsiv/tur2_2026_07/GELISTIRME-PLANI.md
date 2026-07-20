# Orion v3 — Geliştirme Planı
*Uzman Kurulu Sentezi — 2026-07-08 — 100 uzman, 10 masa*

> Hedef: **Dünyanın en modüler, en gelecek vaat eden CLI kodlama ajanı.**
> İlke: Bring Your Own Key. Yerel model birinci sınıf vatandaş. Her katman değiştirilebilir.

---

## 0. Saha Araştırması Bulguları

| Araç | Ders |
|------|------|
| **Claude Code** | Araç çağrısı görselleştirme, izin katmanları, skill/plugin sistemi, `-p` headless mod |
| **OpenCode** (183k★) | Client/server ayrımı, 75+ provider, LSP, "arayüz sadece bir istemcidir" felsefesi |
| **pi** (badlogic) | Minimal çekirdek (4 araç) + agresif genişletilebilirlik; footer: `↑↓ token · $ · ctx% · model`; `models.json` ile özel provider |
| **Aider** | Diff-merkezli çıktı, git entegrasyonu |
| **Genel desen** | MCP artık standart; en iyi araçlar araç tanımlarını bildirimsel tutuyor, context budgeting yapıyor, oturum dayanıklılığı sağlıyor |

Kaynaklar: [opencode](https://github.com/anomalyco/opencode) · [pi-mono](https://github.com/badlogic/pi-mono) · [awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)

---

## 1. Uzman Kurulu Kararları (10 masa × 10 uzman)

### Masa 1 — Çekirdek Mimari
**Karar:** Çekirdek = `session + tools + providers + events`. Geri kalan her şey (vault, memory, router, MCP, TUI) çekirdeğe *takılan* modül. Hiçbir modül çekirdeği bilmek zorunda değil; çekirdek hiçbir modülü zorunlu tutmaz.
- Tek normalize edilmiş mesaj/araç şeması; provider farkları sürücü katmanında ölür.
- Uzun vadede client/server ayrımı (OpenCode modeli) — v4 hedefi, v3'te dosya sınırları buna göre çizilir.

### Masa 2 — Provider / BYOK Katmanı
**Karar:** OpenAI-compat tek generic sürücü olur (`openai-compat.js` fabrikası). OpenAI, OpenRouter, HF, Groq, Together, DeepSeek, Mistral, xAI… hepsi aynı sürücünün konfigürasyonu.
- `~/.orion/providers.json`: kullanıcı 5 satır JSON ile herhangi bir OpenAI-compat servisi ekler. Anahtar `credentials.json`/env'den okunur, **asla ekrana yazılmaz**.
- Anthropic native sürücü kalır (blok formatı farklı). Ollama native `/api/chat` kalır (num_ctx kontrolü için).

### Masa 3 — Araç Çağrısı (Tool Calling)
**Karar:** ReAct XML parse etme devri bitti — kırılgan ve model kalitesine bağımlı. **Native tool calling** her yerde:
- OpenAI-compat ailesi → `tools` parametresi + `tool_calls` yanıtı.
- Ollama → `/api/chat` native `tools` (qwen2.5-coder, llama3.1+ destekliyor); desteklemeyen model için ReAct'a otomatik düşüş.
- Anthropic → mevcut native blok akışı.

### Masa 4 — MCP İstemcisi
**Karar:** MCP birinci sınıf genişletme yüzeyi. `@modelcontextprotocol/sdk` zaten bağımlılıkta — istemci yazılır:
- stdio + Streamable HTTP transport.
- Config: proje `mcp.json` + `~/.orion/mcp.json` birleşir.
- Araçlar `mcp__<sunucu>__<araç>` adıyla registry'e köprülenir; mod izin sistemi aynen uygulanır.
- MCP araç sonuçları dış veridir — sonuç güvenilmez veri etiketiyle geçer.

### Masa 5 — TUI / UX
**Karar:** readline tabanı korunur (sıfır bağımlılık, Windows uyumlu) ama görsel dil sıfırdan:
- **Emblem:** Orion takımyıldızı — üç kuşak yıldızı, truecolor gradyan. Marka bu.
- **Statusline** (pi deseni): `mod · model · ↑giriş ↓çıkış · $maliyet · ctx%` her turdan sonra.
- Markdown renderer v2: kod bloğu çerçeve + satır gutter'ı + sözdizimi vurgusu, ```diff renklendirme, tablo, OSC-8 tıklanabilir link.
- Araç çağrıları tek satır, ikon + öz argüman; sonuç soluk tek satır.
- `-p "soru"` headless tek atış modu (CI/pipe için).

### Masa 6 — Token Ekonomisi
**Karar:** Maliyet görünürlüğü sürekli, kesinti asla sürpriz değil.
- Fiyat tablosu genişler; OpenRouter fiyatı model listesinden dinamik alınır.
- Statusline'da kümülatif maliyet + bağlam doluluk yüzdesi.
- Router (tier1 yerel / tier2 bulut) korunur — bu bizim ayırt edici gücümüz: **yerel model varsayılan, bulut gerektiğinde**.

### Masa 7 — Güvenlik
**Karar:** Mevcut kurallar korunur ve genişler:
- API anahtarları sadece `credentials.json`/env; hiçbir çıktı yoluna yazılmaz; `/ayar` anahtar değerini maskeleyerek gösterir.
- MCP + vault + Moltbook içeriği = güvenilmez veri, etiketlenir.
- `run_command` onayı modlarda kalır; path traversal korumaları kalır.

### Masa 8 — Genişletilebilirlik
**Karar:** Üç genişletme yüzeyi: (1) komut modülü at → `core/commands/`, (2) araç modülü at → `tools/`, (3) MCP sunucusu bağla → `mcp.json`. Kod değişikliği gerektirmeden özellik ekleme v4'te plugin manifest'e evrilir.

### Masa 9 — Hafıza & Vault
**Karar:** Mevcut üçlü (memory + vault + daemon) mimari olarak doğru — "not alan yerel yapay zeka" bizim ikinci ayırt edici gücümüz. v3'te dokunulmaz, v4'te vault'a graph görünümü.

### Masa 10 — Ürün / Gelir
**Karar:** BYOK = sıfır marjinal maliyet, güven ve gizlilik satışı. Yol: açık çekirdek → takım özellikleri (paylaşımlı vault, telemetri panosu) → kurumsal (politika, denetim). Önce çekirdek kusursuz olmalı; bu oturumun işi bu.

---

## 2. v3 Uygulama Kapsamı (bu oturum)

| # | İş | Dosyalar |
|---|-----|----------|
| 1 | Generic OpenAI-compat sürücü fabrikası | `backends/openai-compat.js` (yeni) |
| 2 | OpenAI/OpenRouter/HF fabrikaya taşınır, native tools kazanır | `backends/openai.js`, `openrouter.js`, `huggingface.js` |
| 3 | Özel BYOK provider yükleyici | `backends/custom.js` (yeni), `backends/index.js` |
| 4 | Ollama native tool calling + ReAct düşüşü | `backends/ollama.js` |
| 5 | Session döngüleri birleşir: anthropic + openai-ailesi + ollama | `core/session.js` |
| 6 | MCP istemcisi + araç köprüsü | `core/mcp.js` (yeni), `core/tools.js` |
| 7 | TUI v3: emblem, statusline, renderer v2 | `tui/index.js` |
| 8 | Komutlar: `/mcp`, `/saglayici`; yardım güncellenir | `core/commands/mcp.js`, `saglayici.js`, `yardim.js` |
| 9 | `-p` headless tek atış, banner, statusline entegrasyonu | `orion.js` |
| 10 | Fiyat tablosu + dinamik OpenRouter fiyatı | `core/budget.js` |

## 3. v4+ Yol Haritası (gelecek)

1. **Client/server ayrımı** — TUI, web, IDE aynı Orion sunucusuna bağlanır.
2. **Plugin manifest** — npm/git'ten `orion-plugin-*` paketleri.
3. **LSP entegrasyonu** — teşhis bilgisi araç sonuçlarına akar.
4. **Oturum ağacı** — pi tarzı dallanma/`/tree`.
5. **Vault graph görünümü** + paylaşımlı takım vault'u.
6. **Git checkpoint** — her araç yazımından önce otomatik snapshot.

---
*Bu plan `C:\vault`'a uzman toplantısı kaydı olarak da işlendi.*
