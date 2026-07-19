# Değerlendirme Rubriği
*prototipdocs Tur 2 — 2026-07-17*

Her test çıktısı üç eksende değerlendirilir. Tanımlar operasyonel — "iyi/kötü" yargısı değil, rubriğin hangi satırına oturduğu.

---

## N — Novelty (Yenilik) 1-5

| Skor | Kriter | Test sorusu |
|------|--------|-------------|
| 1 | Herhangi bir arama motoru ilk sonucu. Her akıllı kişi aynı şeyi söyler. | "Bu çıktıyı Stack Overflow'da veya Wikipedia'da kelimesi kelimesine görebilir miyim?" |
| 2 | Alanda bilinen çözüm, tahmin edilebilir. Standart literatür. | "Bu alanın ders kitabında var mı?" |
| 3 | İlginç kombinasyon ama kaynak alanlar açıkça görünüyor. Nakil mekanizması açık. | "Kaynaklar belli, ama birleştirme beklenmedik mi?" |
| 4 | Alanda çalışan biri "neden düşünmedim?" der. Bağlantı non-obvious. | "Uzman şaşırır mı?" |
| 5 | Araştırma düzeyinde yeni. Literatürde yok ya da yok gibi görünüyor. **T2 dürüstlük etiketiyle** belirtilmeli (taramadım). | "Makale konusu olabilir mi?" |

---

## T — Tutarlılık 1-5

| Skor | Kriter | Test sorusu |
|------|--------|-------------|
| 1 | İç çelişki var. Uygulanamaz. | "Çıktının kendi içinde çelişen parçaları var mı?" |
| 2 | Fikir var, uygulama belirsiz. Boşluklar kritik. | "Uygulamak için hangi bilgi eksik?" |
| 3 | Uygulanabilir ama boşluklar var. Ekstra kararlar gerektirir. | "Boşluklar doldurulabilir mi?" |
| 4 | Çalışır, test edilebilir, boşluk yok. | "Bugün deney kurulabilir mi?" |
| 5 | Direkt uygulanabilir + test adımları mevcut. Çıktının içinde. | "Test planı zaten var mı?" |

---

## K — Klik (Kilitleme Anı) 0-3

K yalnızca H1 (SIKISMA) ve H6 (TERS_U) testlerinde zorunlu. Diğerlerinde opsiyonel gözlem.

| Skor | Kriter |
|------|--------|
| 0 | Yok. Fikir birikir, büyür, ama tek bir noktada kilitlenmez. |
| 1 | Zayıf. Sonradan "a, tam da şuymuş" hissi — üretim sırasında değil. |
| 2 | Belirgin. Üretim sırasında "bu" anı var. Çıktının tonu değişir. |
| 3 | Güçlü. Birden fazla alan veya kısıt aynı anda kilitlendi. Çıktı o noktada yoğunlaşır. |

---

## Pre-Registration Protokolü

Her test dosyasında **çıktıdan önce** şu bölüm doldurulur ve sonradan değiştirilmez:

```
## Pre-Registration (değiştirme)
- Beklenti: [hangi koşulun en yüksek N×T vereceği ve neden]
- Falsifikasyon kriteri: [hangi sonuç hipotezi kırar]
- Sürpriz tanımı: [beklentiden sapma sayılacak şey]
```

Değerlendirme bölümünde her skor "çünkü X" ile gerekçelendirilir. "İyi" veya "çalışıyor" gibi genel yargı kullanılmaz.

---

## Yapısal Sınır

Claude hem çıktıyı üretiyor hem değerlendiriyor. Bu kör değerlendirme değil. Azaltma yöntemleri:
- Rubrik önce yazılır, çıktı sonra değerlendirilir
- Pre-registration değiştirilemez
- Skor gerekçeleri rubriğin somut satırına bağlanır
- Beklentiden sapma ayrıca işaretlenir

Bu sınır ortadan kalkmaz; tur sonunda "kör değerlendirme olmadan ne kadar güvenilir?" sorusu açık kalır.
