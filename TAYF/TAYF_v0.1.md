# TAYF v0.1 — Çerçeve (Fırça Sorumluluğunda)

**Durum:** Damıtım bekleniyor — Meissa'nın ilk 3x100 koşusundan (300 satır, 2026-07-21) çıkarılacak
**Tetikleyici:** `node scripts/meissa_batch.js --count 100` çalıştırıldıktan sonra
**Context (damıtımdan önce oku):** [MEISSA_GURULTU_NOTLARI.md](MEISSA_GURULTU_NOTLARI.md) — 300 satırdaki gürültünün hangi kısmı dilin parçası, hangisi altyapının parçası, önceden ayrıştırılmış

---

## Fırça'nın Damıtım Protokolü

> "Dil canlı bir şey. Spec'e yazmak ölü iş. TAYF loglardan doğacak."

Ham loglar: `~/.orion/meissa_runs/YYYYMMDD.jsonl`  
Her satır: `{ kategoriler[], rota, skill, karmasiklik, tahmini_butce, wall_time_ms }`

### Damıtım Adımları (Batch tamamlandıktan sonra)

1. Tüm log dosyalarını birleştir
2. `kategoriler` dağılımını çiz — hangi kategori kaç kez çıktı?
3. `rota` → `skill` eşlemelerini çıkar
4. Tetikleyici kelimeleri bağlamıyla tablo yap
5. Hata/fallback olan girdilerin ortak paternini bul

---

## Mevcut Trigger Paleti (ÖNCEKİ TAHMİN — veriyle karşılaştırılmadan güvenilmez)

> ⚠️ Bu tablo ve aşağıdaki sözdizim şeması, 300 satırlık gerçek log analizi çalıştırılmadan önce yazıldı. Fırça'nın ilkesi ("dil canlı bir şey, spec'e yazmak ölü iş") burada ihlal edilmiş olabilir. Damıtıma başlamadan önce `node scripts/tayf_distill.js` çalıştırılıp gerçek dağılım bu taslakla karşılaştırılmalı — fark varsa veri kazanır, taslak silinir/güncellenir.

> **Kod karşılığı:** Bu paletin Seviye 0 (kural/anahtar-kelime, LLM'siz) uygulaması `core/agents/level0.ts` — Meissa artık net tek-kategori eşleşmelerde LLM'e hiç gitmiyor. Log satırlarındaki `level` alanı (0=kural, 2=LLM) hangi katmanın karar verdiğini gösterir. Seviye 1 (embedding, nomic-embed-text) Faz 6/7'ye ertelendi — MVP'yi bloklamaz.
>
> **Tamamlanma kriteri (bağlayıcı):** Palet iki yerde yaşıyor — bu tablo ve `level0.ts`. "TAYF v0.1 damıtımı tamamlandı" durumu, yalnızca **level0.ts yeni paletle güncellenip `tests/level0.test.js`'in tamamı (38 test) tekrar yeşil olduğunda** gerçekleşir. level0.ts güncellemesi ayrı, sonraya bırakılabilir bir görev değil — damıtımın kendisinin bir parçası. Aradaki boşlukta iki kaynağın sapması sessizce bozulan hafıza sınıfında bir hatadır.

| Kategori | Trigger Örnekleri | Rota |
|----------|-------------------|------|
| resim | resim, görsel, çiz, draw, anime, pixel, render | skill:image |
| ses | seslendir, oku, söyle, voice, speak, tts | skill:voice |
| kod | yaz, debug, fix, refactor, python, js, typescript | sohbet |
| analiz | analiz, inceleme, kontrol, performance | sohbet |
| yazı | yaz, oluştur, taslak, belge, README | sohbet |
| sohbet | merhaba, teşekkür, nasıl, tamam | sohbet |
| 3d | 3d, mesh, texture, render, model | skill:image |
| orchestration | ve, ardından, sonra + birden fazla kategori | orchestration |

---

## Karmaşıklık Kalibrasyonu (1-3, Kantar skalası)

| Puan | Anlam | Örnekler |
|------|-------|----------|
| 1 | Basit/tek adım | "resim çiz", "merhaba", "fibonacci yaz" |
| 2 | Orta/skill gerekli | "pixel art knight çiz", "metni seslendir" |
| 3 | Yoğun/orchestration | "çiz + seslendir", "yaz + test + PR aç" |

---

## Sözdizim Şeması v0.1 (ÖNCEKİ TAHMİN — aynı uyarı geçerli)

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
