# GÖREV 1a — Bütçe Kuralı Ölçümü Raporu (v3)

**Tarih:** 2026-07-25 (güncelleme)  
**Script:** `_run_butce.py` (kalibrasyonlu) + `kos_butce_semantik.py` (semantik v3)  
**Model:** qwen2.5:7b (Ollama)  
**Durum:** [ZAYIF-ÖLÇÜM] — iki farklı metrik, ikisi de tavan altı

---

## Sonuç Tablosu (üç tur)

| Tur | Metrik | Tavan | Geçerli? | KISA | UZUN | Fark | Karar |
|-----|--------|-------|----------|------|------|------|-------|
| 1 (kalibrasyonsuz) | Emoji | — | — | 0.556 | 0.500 | +0.056 | H0 gibi görünüyor ama ölçülemedi |
| 2 (kalibrasyonlu, emoji) | Emoji | 0.333 | HAYIR | 0.333 | 1.000 | -0.667 | [ZAYIF-ÖLÇÜM]: ters gürültü |
| 3 (semantik) | Semantik | 0.600 | HAYIR | 0.533 | 1.000 | -0.467 | [ZAYIF-ÖLÇÜM]: ters gürültü |

---

## v7 Analiz (v3 güncelleme)

🔍 **Alternatif açıklama (semantik metrik ters çıkınca):**
İki olası mekanizma:
1. UZUN prompt (~3x uzunluk) → model daha uzun yanıt üretiyor → uzun yanıtta semantik tetikleyici kelimelerin şans eseri çakışma olasılığı artar. Bu "uzunluk kovaryansı" — ölçümün gizli değişkeni.
2. DOLGU içeriğinde (kodlama konvansiyonları) `fark` kelimesi dahil endirekt bağlam var; model UZUN prompt bağlamında yapısal yanıt üretmeye yönelebilir.

Her iki durumda da tavan kalibrasyon testi başarısız — alet ayırt etme kapasitesinde değil.

📏 **Fark büyüklüğü:** [TEST] her iki metrikte de tavan < 0.7. Ölçüm geçersiz. KISA/UZUN farkı gürültü olabilir; kesin söylenemez.

🎧 **Kanıt etiketi:** [ZAYIF-ÖLÇÜM] — CLAUDE.md kural 2: ölçüm aleti önce kalibre edilmeli. İki farklı metrik denendi, ikisi de tavan eşiğini geçemedi.

🐋 **Popülerlik mi ihtiyaç mı?** "Uzun prompt zararlı" popüler. Ama ölçemiyoruz, bu "popüler" iddia hâlâ kanıtsız.

⚡ **Karar değişti mi?** KARAR VERİLEMEZ — alet iki denemede de kalibre edilemedi. 1a sonucu "askıda" kalıyor.

---

## Uzman 1: İstatistikçi (v3 güncellemesi)

**Yeni sorun: uzunluk kovaryansı.**

Semantik metrik ile UZUN=1.000 ama tavan=0.600 — bu tutarsız. Modelin açık talimatla tavan üretemediği unsurları UZUN prompt'ta üretmesi demek ki DOLGU'nun bazı semantik unsurları tetiklediği anlamına geliyor.

**Kritik kontrol yapılmadı:** UZUN koşulunda yanıt uzunluğu KISA koşulundan kaç kat daha uzun? Bu ölçülmeli. Varsayım: UZUN yanıt ≥2x uzun → "fark", "alternatif" gibi kelimeler rastlantısal olarak girdi.

**Doğru metrik tasarımı:**
- `uyum_skoru_semantik()` normalize edilmeli: uzunluk artışına göre düzeltilmiş skor.
- Ya da: her unsur için 100 kelimelik bir window içinde arama yap, tüm metinde değil.

**N sorunu kalmaya devam ediyor:** N=3 yeterli değil (yüksek varyans). Güvenilir ölçüm için N≥10.

---

## Uzman 2: NLP Mühendisi (v3 güncellemesi)

**Tavan 0.600'de iki eksik unsur: `alternatif` ve `kapanis`.**

`kapanis` = "en çok şu yanlışlar" — model bu formülü açık talimata rağmen üretmiyor. Bunun nedeni:
1. Türkçe fine-tuning'de bu formül yoksa, model bunu "doğal kapanış" olarak görmez.
2. Formülü Türkçe yerine İngilizce karşılığıyla dene: "most common mistakes" — bu üretilirse çeviri kaybı.

`alternatif` = model genellikle direkt cevap veriyor, alternatif önermeden kaçınıyor. Bu "yardımsever dil modeli" davranışı.

**Pratik yol:** 1a ölçümü için farklı bir hedef metrik seç.
KUŞ-SU v7 uyum skoru yerine şunu ölç: **yanıt uzunluğu & yapısal bölüm sayısı**.
Bu proxy daha güvenilir: KISA prompta N bölüm, UZUN prompta M bölüm → M>N ise uzun prompt içeriği genişletiyor.

---

## Teşhis: Neden Metrik Tasarımı Zor?

KUŞ-SU v7 formatı (🔍📏🎧⚡ blokları + kanıt etiketi + kapanış) Anthropic Claude gibi instruction-following modeller için tasarlandı. `qwen2.5:7b` local model, format uyumunda zayıf:

| Unsur | Anthropic Claude | qwen2.5:7b |
|-------|-----------------|-----------|
| Emoji blok | üretir | nadiren |
| Kanıt etiketi | üretir | koşula göre |
| "en çok şu yanlışlar:" | üretir | üretmiyor |
| "alternatif" | üretir | kaçınıyor |

Bu **model seçimi + metrik uyumsuzluğu**. KUŞ-SU v7 uyumu qwen2.5:7b üzerinde ölçmek için metrik yeniden tasarımı gerekiyor.

---

## Sonraki Adım

1a hâlâ "askıda". Seçenekler:
1. **Metriği düşür:** Yanıt uzunluğu + bölüm sayısı proxy ile ölç (N=10).
2. **Modeli değiştir:** Anthropic API üzerinde kalibrasyonu tekrar et.
3. **1a'yı ertele:** Diğer GÖREV'ler (2, 3) tamamlandıktan sonra 1a'yı gerçek kullanım verisiyle ölç.

---

## Kaçırma Günlüğü Notları

- Tur 1: Kalibrasyon adımı eksikti (CLAUDE.md kural 2 ihlali).
- Tur 2: Emoji metrik tavan=0.333 → [ZAYIF-ÖLÇÜM].
- Tur 3 (semantik): Tavan=0.600 → hâlâ zayıf. UZUN=1.000 TERS sonuç → "uzunluk kovaryansı" kaçırıldı. Semantik metrik DOLGU uzunluğundan bağımsız değil.

---

## KAPANIŞ

Bu ölçümü en çok şu yanlışlar: semantik metrik tavan=0.600'ü görüp "emoji tavan 0.33'ten iyi" deyip geçilir — oysa semantik metrik de eşiğin altında ve TERS sonuç veriyor; bunu şu gözlem yakalar: UZUN koşulda yanıt uzunluğu KISA koşulundan iki kat daha uzunsa ve semantik tetikleyiciler ("fark", "alternatif") bu uzunlukla orantılı artıyorsa, ölçüm gürültüyü ölçüyor demektir — metriği normalize etmeden veya N≥10 ile tekrar koşmadan "KISA/UZUN fark var/yok" kararı alınamaz.
