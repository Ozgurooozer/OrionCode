# TAYF v0.1 — Çerçeve (Fırça Sorumluluğunda)

**Durum:** ✅ Damıtım tamamlandı — 608 satır, 553 başarılı (%91), 2026-07-22
**Kaynak:** `~/.orion/meissa_runs/20260721.jsonl` + `20260722.jsonl`
**Context:** [MEISSA_GURULTU_NOTLARI.md](MEISSA_GURULTU_NOTLARI.md)

---

## Damıtım Sonuçları (2026-07-22, `node scripts/tayf_distill.js`)

### Rota Dağılımı (553 başarılı)

| Rota | Sayı | % |
|------|------|---|
| sohbet | 286 | 52% |
| skill | 255 | 46% |
| orchestration | 12 | 2% |

### Kategori Dağılımı

| Kategori | Sayı | Notlar |
|----------|------|--------|
| kod | 167 | — |
| resim | 152 | — |
| sohbet | 122 | — |
| yazı | 63 | — |
| analiz | 63 | — |
| ses | 57 | — |
| 3d | 3 | Kategori gerçek, palet'e eklendi |
| typo'lar | 5 | sohabet/sohbetes/sohchet/speech/read — model tutarsızlığı |

### Level Dağılımı (kategori × seviye)

Pre-level0 (eski log formatı, level alanı yok) büyük çoğunluk. Yeni format:
- **Level 0** (kural/LLM'siz): kod:14, resim:23, sohbet:8, ses:6, analiz:6, yazı:6 → toplam ~63
- **Level 2** (LLM kararı): kod:11, resim:7, sohbet:12, ses:6, analiz:4, yazı:5 → toplam ~45

### Hata Analizi (55 başarısız)

| Hata Türü | Sayı | Kök Neden |
|-----------|------|-----------|
| JSON parse | ~30 | `tahmini_butce: 50-100` (range değeri, string olmalı) |
| empty_input | ~12 | Boş/çok kısa girdi (da39a3ee tekrar ediyor) |
| timeout | ~6 | Model timeout |
| Metin dönüşü | ~7 | Model JSON yerine Türkçe metin üretti |

**Kritik bug:** `tahmini_butce` alanı `500-1000`, `50-200`, `<0-50>` gibi değerler üretiyor → JSON.parse patlıyor. Router prompt'u `"tahmini_butce": 150` (tek sayı, tam tamsayı) örneklemeli.

---

## Gerçek Trigger Paleti (Damıtımdan, Veri Kazandı)

> **Kod karşılığı:** Bu paletin Seviye 0 uygulaması `core/agents/level0.ts`. Log `level` alanı: 0=kural/LLM'siz, 2=LLM kararı. Seviye 1 (embedding) Faz 6/7'ye ertelendi.
>
> **Tamamlanma kriteri:** Palet iki yerde yaşıyor — bu tablo ve `level0.ts`. "TAYF v0.1 damıtımı tamamlandı" = level0.ts yeni paletle güncellenip `tests/level0.test.js` (38 test) yeşil.

| Kategori | Trigger Örnekleri (gerçek loglardan) | Rota | Gerçek Sayı |
|----------|--------------------------------------|------|-------------|
| resim | resim, görsel, çiz, draw, anime, pixel, render, portrait, cyberpunk | skill:image | 152 |
| ses | seslendir, oku, söyle, voice, speak, tts, oku: | skill:voice | 57 |
| kod | yaz, debug, fix, refactor, python, js, typescript, sql, git, docker | sohbet | 167 |
| analiz | analiz, inceleme, kontrol, performance, bug, memory leak | sohbet | 63 |
| yazı | blog yazısı, README, açıkla, explain | sohbet | 63 |
| sohbet | merhaba, teşekkür, nasıl, tamam, yardım, emoji-only, aaaa... | sohbet | 122 |
| 3d | 3d render, animasyon + kaydet | skill:image | 3 ✅ |
| orchestration | ve/ardından/sonra + birden fazla kategori | orchestration | 12 |

---

## Karmaşıklık Kalibrasyonu (1-3, Kantar skalası)

| Puan | Anlam | Örnekler |
|------|-------|----------|
| 1 | Basit/tek adım | "resim çiz", "merhaba", "fibonacci yaz" |
| 2 | Orta/skill gerekli | "pixel art knight çiz", "metni seslendir" |
| 3 | Yoğun/orchestration | "çiz + seslendir", "yaz + test + PR aç" |

---

## Sözdizim Şeması v0.1

```
TAYF_message ::= trigger* content context?
trigger      ::= category_word | style_word | action_word
content      ::= natural_language_text
context      ::= "--workflow" N | "--voice" name | "--style" name

category_word ::= "resim"|"görsel"|"çiz"|"draw"|"anime"|"pixel"|"ses"|"seslendir"|...
style_word    ::= "cyberpunk"|"retro"|"fantasy"|"realistic"|...
action_word   ::= "yap"|"oluştur"|"üret"|"generate"|"create"|...
```

---

## Doldurmak İçin (Batch Sonrası)

```bash
# Log analizi (batch tamamlandıktan sonra çalıştır):
node scripts/tayf_distill.js
```

İki ayrı çıktı üretir:
1. **Başarılı dağılım** (`output_parsed` olan satırlar) — rota/kategori sayımı, taslak tabloyla karşılaştırılacak.
2. **Hata/fallback listesi** (`error != null || output_parsed == null` olan satırlar) — input + ham `output_raw`, kategorik dağılımdan ayrı ama yan yana okunmalı. TAYF'ın en çok öğreneceği yer burası (bkz. [MEISSA_GURULTU_NOTLARI.md](MEISSA_GURULTU_NOTLARI.md) §2 — `sosyal_temas` ve rol-karışması aday kategorileri bu listenin içinde yaşıyor).

---

## Sonraki Faz (Faz 7)

Takımyıldız görseli — kuyruk ritim imzasından:
- `scheduler_events.jsonl` → load/unload süreleri → kalp atışı animasyonu
- Her skill başlangıç-bitiş → yıldız doğum-ölüm

---

*TAYF v0.1 taslak — Fırça bu belgeyi loglardan güncelleyecek*
