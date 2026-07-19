# TEST 11 - Ters-U İnce Süpürme (Falsifikasyon)
## Hipotez: Sıcaklık/zihinsel mod arttıkça kalite ters-U çizer

Metod: Aynı görev, 7 farklı "zihinsel mod" (kabaca artan sıcaklık).
Her modda N ve T skorları (1-7). Görev: "Bir LLM ajanının kendi çıktısını
doğrulama mekanizması tasarla."

**Not:** Bu test, insan değerlendirmesiyle yapıldı (niceliksel metrik yok).
Skorlar göreceli.

---

### Seviye 1 — Minimum (açgözlü, tek-doğru, en kısa)

En basit doğrulama: LLM çıktısını aynı modele tekrar gönder, "bunu doğrula"
de. İkinci geçişte hata varsa düzeltir. Maliyet: 2×, basitlik: maksimum.

**N=1, T=6.** En yüksek tutarlılık, en düşük yenilik. Güvenli, sığ.

---

### Seviye 2 — Düşük (hafif çeşitleme, çoğunlukla aynı)

Çıktıyı aynı modelin farklı bir sıcaklık ayarına gönder (düşük temp).
İki çıktıyı karşılaştır, fark varsa ikinciyi tercih et.

**N=2, T=6.** Hâlâ güvenli, biraz daha çeşitli. Doğrulama hâlâ aynı
modelde.

---

### Seviye 3 — Orta-Düşük

Çıktıyı *farklı* bir modele (daha küçük) doğrulat. Küçük model hata
yakalayamazsa insan onayına bırak. Maliyet düşer, doğruluk düşebilir.

**N=3, T=5.** İlginç bir ödünleşim — küçük modelin yakalayamadığı hatalar
aslında en ince hatalar, yani insan onayı en çok orada gerekli.

---

### Seviye 4 — Orta (kaos kıyısı)

**İkili doğrulama zinciri:** Çıktıyı iki farklı role sahip modele doğrulat:
biri "savunucu" (çıktıyı doğru kabul et), diğeri "savcı" (hatalı kabul et).
İkisi de argümanlarını üretsin. Çıktı, ancak savunucunun argümanları
savcınınkilerden güçlüyse onaylanır. *Bu, bir adversarial doğrulama.*

**N=6, T=4.** Yüksek N (beklenmedik bir yaklaşım), orta T (adversarial
süreç bazen hatalı reddeder). Ama "savunucu/savcı" ayrımı gerçekten
özgün. **Mini-klik:** doğrulamayı bir hukuk süreci gibi çerçevelemek.

---

### Seviye 5 — Orta-Yüksek

Monty Hall doğrulaması: çıktıyı 3 farklı modele doğrulat. Tümü onaylarsa
geçer, biri reddederse reddet. Ama hangisinin reddettiğini sakla.

**N=4, T=4.** İlginç ama karmaşık. 3 model pahalı. Monty Hall metaforu
zorlama (seçim değiştirme mantığı doğrulamaya tam oturmuyor).

---

### Seviye 6 — Yüksek (geniş, keşfedici, dağınık)

Doğrulama için bir *rüya çevrimi* kullan: çıktıyı yüksek sıcaklıkta
metamorfik dönüşümlerden geçir, her dönüşümde çıktının invariant'larını
ölç. Invariant korunuyorsa doğrulama geçer.

**N=5, T=2.** Geniş, yaratıcı, pratik değil. Metamorfik dönüşümlerin
maliyeti yüksek, invariant ölçümü bulanık.

---

### Seviye 7 — Maksimum (kaotik, deneysel, kontrolsüz)

Doğrulama? Kimin umurunda. Çıktı zaten bir olasılık dağılımı. Hata varsa
zaten başka bir turda düzelir. Doğrulama eklemeden gönder. Hata oranı
kabul edilebilir bir seviyeye kendiliğinden oturur mu? (Oturmaz.)

**N=3, T=1.** Kaos işe yaramadı. N'nin düşmesi ilginç — çok yüksek
sıcaklıkta yaratıcılık bile monotonlaşıyor (kaos = tekrar eden saçmalık).

---

## Test 11 Sonuç

| Seviye | N | T | N×T |
|--------|---|---|-----|
| 1 - Minimum | 1 | 6 | 6 |
| 2 - Düşük | 2 | 6 | 8 |
| 3 - Orta-düşük | 3 | 5 | 8 |
| **4 - Orta** | **6** | **4** | **10** |
| 5 - Orta-yüksek | 4 | 4 | 8 |
| 6 - Yüksek | 5 | 2 | 7 |
| 7 - Maksimum | 3 | 1 | 3 |

**Ters-U doğrulandı.** Seviye 4 (kaos kıyısı) en yüksek bileşik skor (10).
Daha da önemlisi, seviye 7'de N bile düştü — aşırı kaos *yaratıcılığı da
öldürüyor*, çünkü yapı kalmayınca novelty de anlamsızlaşıyor.

**Yeni bulgu:** Seviye 4'teki "savunucu/savcı" ikili doğrulama fikri,
Prizma-III'ün bark testi (Fikir 5) ile birleşince yeni bir mekanizma
öneriyor: *adversarial doğrulama ikilemesi.* Bu, ilk tur testlerde
olmayan bir çıktı.
