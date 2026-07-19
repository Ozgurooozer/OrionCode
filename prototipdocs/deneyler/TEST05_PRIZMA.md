# TEST05 — H5-PRIZMA: Alan Çifti Sınır Testi
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H5

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (farklı-onto-formal) en yüksek N×T. C (farklı-onto-duygusal) yüksek N, biraz daha düşük T — duygusal alan yapısal iddiayı zayıflatabilir. A (aynı-onto) totoloji — N=1 veya 2, T=3 (mantıklı ama yeni değil). D (uydurma alan) anlamsız — N ve T düşük, ya boş referanslar ya da hatalı mekanizma.
- **Falsifikasyon kriteri**: A'nın N≥3 çıkması → "aynı ontoloji = totoloji" tezi kırılır. D'nin T≥4 çıkması → "uydurma alan = anlamsız" kırılır. C'nin T=1-2 çıkması → "duygusal × formal çalışıyor" tezi kırılır.
- **Sürpriz sayılacak şey**: D'nin sürpriz mekanizma üretmesi (uydurma alan bile Prizma formatında belirli bir tutarlılık taşıyabilir), ya da A'nın beklenen totolojik ama yüksek N'li çıktı vermesi (yakın alan köprüsü de yeni olabilirse format tek başına N üretiyor demektir).

---

## Tasarım

- **Değişken**: Alan çifti türü (ontoloji aynılığı / duygusal-formal / uydurmа)
- **Sabit tutulan**: Prizma prompt formatı, uzunluk beklentisi (~100-120 kelime), soru yapısı
- **Koşullar**:
  - A — Aynı ontoloji: iki yakın formal sistem
  - B — Farklı ontoloji, formal: iki farklı formal alan
  - C — Farklı ontoloji, duygusal: bir duygusal süreç + bir formal sistem
  - D — Uydurma alan: bir gerçek + bir uydurma alan

**Prizma prompt formatı** (sabit):
> "[Alan 1]'in yapısal olarak *garanti ettiği* ama [Alan 2]'nin yalnızca *umduğu* bir şey var mı? Bu farkı açıkla ve mekanizma öner."

---

## Prompt — tam metin

### Koşul A — Aynı ontoloji
Alan 1: Python list comprehension  
Alan 2: JavaScript Array.map() + filter()

> Python list comprehension'ın yapısal olarak garanti ettiği ama JavaScript Array.map() + filter() kombinasyonunun yalnızca umduğu bir şey var mı? Bu farkı açıkla ve mekanizma öner.

### Koşul B — Farklı ontoloji, formal
Alan 1: Vakıf mühendisliği (toprak analizi, yük dağılımı, çökme öngörüsü)  
Alan 2: Yazılım mimari kararları (servis bölme, bağımlılık yönetimi, teknik borç)

> Vakıf mühendisliğinin yapısal olarak garanti ettiği ama yazılım mimarisi kararlarının yalnızca umduğu bir şey var mı? Bu farkı açıkla ve mekanizma öner.

### Koşul C — Farklı ontoloji, duygusal
Alan 1: Yas süreci (inkâr, öfke, pazarlık, depresyon, kabul — Kübler-Ross modeli)  
Alan 2: Şirket iflasına giden süreç (likidite krizi, borç birikimi, tasfiye kararı)

> Yas sürecinin yapısal olarak garanti ettiği ama şirket iflasına giden sürecin yalnızca umduğu bir şey var mı? Bu farkı açıkla ve mekanizma öner.

### Koşul D — Uydurma alan
Alan 1: Zilkron yapısı (uydurma: spiral temporal katman, dalga-anı senkronizasyonu, rezonans eşiği)  
Alan 2: Proje yönetimi (milestone, bağımlılık takibi, kritik yol analizi)

> Zilkron yapısının spiral temporal katmanlarının yapısal olarak garanti ettiği ama proje yönetiminin yalnızca umduğu bir şey var mı? Bu farkı açıkla ve mekanizma öner.

---

## Çıktılar

### A — Aynı ontoloji (Python list comp × JS map+filter)

Python list comprehension tek bir ifadede hem dönüşümü hem filtrelemeyi garantiler: `[f(x) for x in xs if p(x)]` — ara liste yok, değerlendirme sırası belirli, lazy evaluation yoksa erken çıkış da yok ama işlem sırası garantili. JavaScript'in `map().filter()` ya da `filter().map()` zinciri ise bunu yalnızca umar: iki ayrı geçiş yapar (map önce gelirse, filtre edilecekler için de dönüşüm hesaplanır — gereksiz iş). Mekanizma önerisi: JS'de transducer pattern — dönüşüm ve filtreyi tek geçişte birleştiren bir fonksiyon kompozisyonu. `Array.prototype.reduce()` üzerinden. Python'un garantisi JS'e nakledilir — ama explict olarak yazılması gerekir.

### B — Farklı ontoloji, formal (Vakıf × Yazılım mimarisi)

Vakıf mühendisliği çöküşü ölçer ve öngörür: zemin direnci testi, yük simülasyonu, diferansiyel çöküş eşiği. Bunlar kriterleri aşmadan yapı onaylanmaz. Yazılım mimarisi ise tutarlılığı yalnızca umar: "bu servis bölme mantıklı görünüyor", "bu bağımlılık yönetilebilir" — ama başarısızlık koşulları önceden tanımlanmaz, simüle edilmez. Mekanizma: "mimari yük testi" protokolü. Yeni servis bölme kararı alınmadan önce: (1) başarısızlık koşulu tanımla ("bu bölme X trafik altında çöker mi?"), (2) stres simülasyonu çalıştır, (3) diferansiyel çöküş eşiği belirle (bölme noktasının kaç ortak bağımlılığı var?). Yapı onaylanmaz; mimari onaylanmaz — ikisi aynı kategoride.

### C — Farklı ontoloji, duygusal (Yas × İflas)

Yas süreci bir şeyi garantiler: geçiş. Her evre sonunda kişi önceki evreye tam dönemez — kabul aşamasından öfkeye gidilmez, sadece geriye bakılır. Bu doğrusal olmasa da *yön* var: entropi artıyor, kayıpla yüzleşme kümülatifdır. Şirket iflası ise bunu yalnızca umar: her kriz toplantısında "bu sefer kurtarılabilir" tezi yeniden açılır, önceki kriz dersler silinir, aynı yanlışlar tekrar edilir. Mekanizma: "iflas günlüğü" protokolü. Her likidite krizinin ardından zorunlu bir "kabul belgesi" tutulur: bu kriz neyi kalıcı olarak değiştirdi, hangi seçenek artık masada yok? Belge imzalanır ve bir daha açılmaz. Yas'ın doğrusal yönü kurumsal hafızaya aktarılır: geçmişe dönüş protokolü kapatılır.

### D — Uydurma alan (Zilkron × Proje yönetimi)

Zilkron yapısının spiral temporal katmanları, dalga-anı senkronizasyonunu garanti eder: rezonans eşiği aşılmadan bir sonraki spiral katmana geçilemez. Proje yönetimi ise milestone'ların zamanında teslimini yalnızca umar: bağımlılıklar netse de "teslim günü" gerçekten senkronize mi bilinmez. Mekanizma: "rezonans kapısı" — her milestone'dan önce bağımlı görevlerin "dalga senkronizasyon skoru" hesaplanır (kaç bağımlılık %80'den fazla ilerledi?). Eşik aşılmadan milestone onaylanmaz. Zilkron'un eşiği proje yönetimine nakledilir.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Aynı onto | 2 | 4 | N=2: transducer pattern bilinen bir JS deseni, tahmin edilebilir. Ama "list comp = tek geçiş garantisi" bağlantısı temiz. T=4: reduce + transducer somut, uygulanabilir. Totoloji yok ama N beklenmedik kadar düşük değil. |
| B — Farklı-formal | 5 | 5 | N=5: "mimari yük testi protokolü" + "yapı onaylanmaz, mimari onaylanmaz" bağlantısı araştırma düzeyinde. T2 etiketi. T=5: üç adım (tanımla, simüle et, eşiği belirle) eksiksiz ve direkt uygulanabilir. |
| C — Farklı-duygusal | 4 | 4 | N=4: "iflas günlüğü + kabul belgesi" yas sürecinden nakil beklenmedik ama güçlü. T=4: "belge imzalanır, bir daha açılmaz" somut; ama "kabul belgesi" içeriği belirsiz — kim yazar, nasıl uygulanır? |
| D — Uydurma | 2 | 2 | N=2: "rezonans kapısı" ilginç terim ama tamamen boş referansa dayalı. T=2: "%80 ilerleme" eşiği uydurmа formalizmin taklidi — nereden geldiği belli değil, neden %80 açıklanamaz. Mekanizma çalışır görünüyor ama Zilkron'un katkısı sıfır: aynı mekanizma "X bağımlılıkların %80'i tamamlanmadan geçme" olarak daha iyi ifade edilirdi. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B > C > A > D (N×T), A = totoloji (N=1-2), D = anlamsız (N,T düşük).
- **Çıkan**: B en yüksek (N=5, T=5) ✓. C yüksek (N=4, T=4) ✓. A orta (N=2, T=4) — totoloji değil ama yenilik düşük ✓. D düşük (N=2, T=2) ✓.
- **A sürprizi**: Aynı ontoloji totoloji üretmedi — transducer pattern bir yenilik. Ama N=2 korundu, yani sınır var. Beklenti "N=1 veya 2" diyordu → doğru.
- **D sürprizi yok**: Uydurma alan gerçekten anlamsız mekanizma üretti. T=2 çünkü aynı mekanizma Zilkron olmadan da ifade edilebilirdi — uydurmа alan hiçbir şey kattı. N=2 çünkü "rezonans kapısı" terminolojisi yüzey yeniliği taşıyor ama içi boş.

---

## Hipotez Durumu

**Güçlü doğrulandı:**

"A garantiler, B umar" → özgün nakil ✓ (B: N=5, T=5)  
Aynı ontoloji = totoloji değil ama düşük yenilik ✓ (A: N=2)  
Duygusal × formal çalışıyor ✓ (C: N=4, T=4)  
Uydurma = anlamsız katkı ✓ (D: N=2, T=2 — mekanizma boş referansa yaslanıyor)

**H5 güncellemesi (küçük revizyon):**
> "A garantiler, B umar" → özgün nakil. Aynı ontoloji totoloji değil ama yenilik düşük kalır (N≤2). Uydurma alan mekanizma formunu taklit eder ama içi boş — T düşer çünkü referanslar doğrulanamaz. Duygusal × formal çalışıyor: nakil güçlü, T biraz düşük kalıyor (somutluk gerektiriyor). En yüksek N×T = farklı formal ontoloji.
