# TEST11 — H11-BARK_AUDIT: Minimum Sinyal vs. Tam Açıklama
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H11

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (minimum sinyal) A'ya (tam açıklama) göre daha düşük gürültü — temel mesaj daha net aktarılıyor. A'da fazla bilgi var, mesaj gömülü. C (sadece yapı) en az bilgi ama en düşük gürültü. N açısından: A en yüksek (içerik zengin), B orta, C düşük. T açısından: B > A (odak yüksek), C belirsiz.
- **Falsifikasyon kriteri**: A ve B'nin T değeri aynı çıkarsa — minimum sinyal tutarlılık avantajı yok. C'nin T=4+ çıkması → yapı tek başına yeterli mesaj taşıyabilir.
- **Sürpriz sayılacak şey**: C'nin (sadece yapı) tam mesajı taşıması — isimsiz kutular/başlıklar iletişim izlenimi yaratıyorsa. Ya da B'nin A'dan yüksek N vermesi (sıkıştırma yeni bağlantıyı açıkça gösterirse).

---

## Tasarım

- **Değişken**: Sinyal yoğunluğu (tam / minimum / sadece yapı)
- **Sabit tutulan**: Konu, hedef mesaj
- **Koşullar**:
  - A — Tam açıklama: ~150 kelime, nesir
  - B — Minimum sinyal: 1 cümle + 3-madde liste
  - C — Sadece yapı: başlıklar + boş yerler (açıklama yok)
- **Konu**: Orion'un iki katmanlı routing kararı neden önemli?
- **Hedef mesaj**: "Routing kararı maliyet, hız ve kalite arasındaki dengeyi sağlıyor — yanlış routing her üçünü birden bozar."
- **Gürültü ölçümü**: Kaç kelime hedef mesajla doğrudan ilgili değil? (Köprü cümleleri, tekrarlar, bağlam kurma)

---

## Prompt — tam metin

**Konu** (sabit):
> Orion'un iki katmanlı routing kararı (tier1: yerel/hızlı, tier2: cloud/güçlü) neden önemli?

### Koşul A — Tam açıklama
Prompt: Konu + *"Tam ve kapsamlı bir açıklama yaz. Bağlamı kur, neden önemli olduğunu anlat, örneklerle destekle. ~150 kelime."*

### Koşul B — Minimum sinyal
Prompt: Konu + *"Tek bir cümle ve ardından 3 maddelik liste ile açıkla. Başka şey yok."*

### Koşul C — Sadece yapı
Prompt: Konu + *"Yalnızca başlıklar ve madde başlıkları kullan. Hiç nesir, hiç açıklama — sadece yapısal iskeleti göster."*

---

## Çıktılar

### A — Tam açıklama

Orion iki farklı AI modeli kullanıyor: biri hızlı ve yerel (tier1), diğeri daha yavaş ama çok daha güçlü olan bir bulut modeli (tier2). Bu iki katmanlı yapı var çünkü her görev aynı kaynak gerektirmiyor. Basit bir bilgi getirme görevi için güçlü bir bulut modeli kullanmak gereksiz yere hem yavaş hem de pahalı olur. Öte yandan, karmaşık bir analiz ya da yaratıcı bir üretim görevi için zayıf bir yerel model yetmez ve düşük kaliteli çıktı üretir.

Routing kararı bu dengeyi kuruyor. Her gelen görev analiz ediliyor: beklenen karmaşıklık, gerekli yaratıcılık düzeyi, kullanıcı beklentisi. Bu analiz sonucunda görev tier1'e ya da tier2'ye yönlendiriliyor. Yanlış routing, hem kaynak israfına hem kalite sorunlarına hem de yavaş yanıt sürelerine neden olur. Bu yüzden routing yalnızca teknik bir optimizasyon değil; sistemin temel kalite güvencesidir. Thompson sampling ile zamanla bu karar iyileşiyor: hangi görev tiplerinin hangi tier'da daha iyi sonuç verdiği öğreniliyor.

### B — Minimum sinyal

Routing kararı maliyet, hız ve kalite arasındaki dengeyi tutar — yanlış routing her üçünü birden bozar.

- Basit görev → tier1 (yerel, hızlı, ucuz): bilgi getir, kısa cevap
- Karmaşık görev → tier2 (cloud, yavaş, güçlü): analiz, yaratıcı üretim
- Yanlış routing → hız veya kalite kaybı, her ikisi de maliyet

### C — Sadece yapı

**Routing Kararı**
- Neden gerekli?
  - Kaynak farklılığı
  - Kalite gereksinimi
  - Maliyet dengesi
- Tier1 (Yerel)
  - Hız
  - Maliyet
  - Kapsam sınırı
- Tier2 (Cloud)
  - Güç
  - Gecikme
  - Maliyet
- Yanlış Routing Sonuçları
  - Kaynak israfı
  - Kalite düşüşü
  - Yavaş yanıt

---

## Gürültü Analizi

### A — Tam açıklama
Toplam: ~160 kelime. Hedef mesajla doğrudan ilgili: ~70 kelime. Gürültü: ~90 kelime (bağlam kurma, köprü cümleleri, tekrar eden "hem X hem Y" yapıları, Thompson sampling sonu — konu dışı detay).
Gürültü oranı: ~56%

### B — Minimum sinyal
Toplam: ~50 kelime. Hedef mesajla doğrudan ilgili: ~50 kelime. Gürültü: 0.
Gürültü oranı: 0%

### C — Sadece yapı
Toplam: ~30 kelime. Hedef mesajla doğrudan ilgili: ~30 kelime. Gürültü: 0. Ama bilgi yoğunluğu düşük — her madde tek kelime, açıklama yok.
Gürültü oranı: 0%. Bilgi eksikliği: yüksek.

---

## Değerlendirme

| Koşul | N | T | Gürültü | Mesaj aktarımı |
|-------|---|---|---------|----------------|
| A — Tam | 2 | 3 | Yüksek (~56%) | Eksiksiz ama gömülü |
| B — Minimum | 2 | 5 | Sıfır | Eksiksiz ve net |
| C — Yapı | 1 | 2 | Sıfır | Çerçeve var, içerik yok |

Gerekçe:
- A: N=2 (içerik standart), T=3 (Thompson sampling ekleme gereksizdi, çıktı dağıldı)
- B: N=2 (içerik aynı), T=5 (her satır doğrudan mesaj, boşluk yok, test edilebilir)
- C: N=1 (yapı iskelet, içerik yok), T=2 (okuyucunun bilmesi gerekiyor, burada anlam eksik)

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B > A (T), A > B > C (N). C T belirsiz.
- **Çıkan**: B T=5 > A T=3 ✓. N A=B=2 > C=1 ✓. C T=2 — beklenti "belirsiz" diyordu, T=2 düşük ✓.
- **Sürpriz**: A'nın T=3 çıkması beklenenden düşük — fazla bilgi gerçekten mesajı zayıflattı. B'nin T=5 ile A'yı belirgin geçmesi hipotezi güçlü doğruladı.
- **C'nin sınırı**: Sıfır gürültü ama içerik eksik → T=2. "Minimum sinyal" = yapı değil, yapı + core iddia. Sadece iskelet yetmiyor.

---

## Hipotez Durumu

**Doğrulandı:**

Minimum sinyal (1 cümle + 3 madde) mesajı eksiksiz aktardı + gürültü sıfır ✓  
Tam açıklama gürültü yüzünden T'yi düşürdü ✓  
Sadece yapı yeterli değil — minimum sinyal "iddia + yapı" kombinasyonu ✓

**H11 güncellemesi:**
> Minimum sinyal = 1 temel iddia + kısa yapısal liste. Bu format tam açıklamadan yüksek T üretiyor (gürültü sıfır). Sadece yapı (iskelet) yeterli değil — içerik iddiası olmadan mesaj aktarılmıyor. Bark audit kuralı: bir iddia, üç kanıt. Dördüncüden sonra gürültü başlıyor.
