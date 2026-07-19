# Test Dışı Kalan Hipotezler ve Gerekçeleri
*Not: Bu, rapor1.md'ye ektir.*

---

## Kategori 1 — Test Edemediğim (altyapı gerekiyor)

| Hipotez | Kaynak | Neden Test Edilemedi |
|---------|--------|----------------------|
| AI Eğlencesi 04 — Dünya Çevirme | ai_eglence_04 | Çok-ajan simülasyonu gerektirir. Bir dünyayı ileri sarıp emergence gözlemlemek için en az iki ajana, bir dünya modeline ve çoklu tura ihtiyaç var. Tek Claude tek başına simüle edemez. |
| Makine-Yerli Kod A1-A5 (tümü) | A_makine_yerli_kod.md | Hepsi derleyici/e-graph/tip sistemi gibi AI-dışı deterministik substrat gerektiriyor. "Tipli delik + sözleşme", süperoptimizatör, soyut yorumlama — hiçbiri sohbet içinde test edilemez. |
| Prizma III F1-F7 (tümü) | prizma_3_oyun_ai_npc.md | GOAP, Utility AI, Behavior Tree, Director, LOD — hepsi çalışan bir oyun motoru veya ajan çerçevesi gerektiriyor. Yapısal invariant'ları ancak çalışma zamanında gözlemlenebilir. |
| Prizma II Fikir 1 (Hata Birimi) | prizma_2_beyin_matematik.md | E-graph + model ikilisini çalıştırmayı gerektirir. Kod üzerinde ölçüm yapılmadan test edilemez. |
| Prizma II Fikir 7 (Nöromodülatör) | prizma_2_beyin_matematik.md | Alt-görevlere hassasiyet dağıtan meta-denetleyici, çalışan bir ajan üzerinde ölçüm gerektirir. |
| Prizma I Fikir 2 (Ankraj Tablosu) | prizma_calismasi_ozgun_fikirler.md | Demiryolu interlocking'inin ajan spekülasyonuna nakli. Statik tablo + çalışma zamanı rezervasyonu — kod gerekli. |
| Prizma I Fikir 6 (Grizu İzni) | prizma_calismasi_ozgun_fikirler.md | Çoklu-ajan bağlam hijyeni. En az iki ajan ve bayatlık ölçümü gerektirir. |
| Prizma I Fikir 7 (Kara Kutu Kapsülü) | prizma_calismasi_ozgun_fikirler.md | AI↔AI iletişim protokolü. İki ajan arasında kapsül-diff mekanizması — en az iki model gerekli. |
| B_cazibe Deney 1 (Öğrenme-İlerlemesi) | B_cazibe_ve_substrat.md | Küçük bir tahminci + veri akışı + compression-progress ölçümü. Kod gerekli. |
| B_cazibe Deney 2 (Boşta Dinamik) | B_cazibe_ve_substrat.md | Phasor/osilatör mikro-substratı. Açık kaynak kod + çalıştırma ortamı gerekli. |
| B_cazibe Deney 4 (İçsel-Güdülü Kod Oyunu) | B_cazibe_ve_substrat.md | Orion'a boş zaman döngüsü eklemek. Kod gerekli. |

---

## Kategori 2 — Test Edebileceğim Ama Etmedim (atlandı)

Bu hipotezleri sohbet içinde nitel olarak test edebilirdim ama
falsifikasyon turunda önceliklendirmediğim için atlandı.

| Hipotez | Kaynak | Nasıl Test Edilebilirdi |
|---------|--------|------------------------|
| **Prizma I Fikir 3 — Dolusavak Protokolü** | prizma_calismasi_ozgun_fikirler.md | Sentetik patlamalı yük altında cevap kalitesi: reaktif özetleme vs öngörülü ön-tahliye. Kendi bağlam yönetimimi gözlemleyerek test edebilirdim. |
| **Prizma I Fikir 5 — Eşapman / İzokronizm** | prizma_calismasi_ozgun_fikirler.md | Büyük görevlerde hata oranını, tik kadansı dayatılmış ve dayatılmamış hallerde karşılaştırabilirdim. |
| **Prizma II Fikir 5 — DMN Modu** | prizma_2_beyin_matematik.md | Task-dışı modda (boşta) ne ürettiğimi gözlemleyebilirdim. Test 12B'nin kapsamını genişletebilirdim. |
| **Prizma I Fikir 4 — Kapalı Palet (Gamut)** | prizma_calismasi_ozgun_fikirler.md | Farklı "karakter bölgeleri"nde aynı soruya cevap verip tutarlılığı ölçebilirdim. Test 4'ün (Ses Takınma) bir uzantısı olabilirdi. |
| **Prizma I Fikir 8 — Rüya Çevrimi** | prizma_calismasi_ozgun_fikirler.md | Önceki cevaplarımı metamorfik dönüşümlerden geçirip invariant'ları koruyup korumadığımı test edebilirdim. |
| **Prizma III Fikir 5 — Bark** | prizma_3_oyun_ai_npc.md | Her cevabıma bir "iç durum izi" ekleyip (hangi bilgiye dayandığımı belirterek) debug edilebilirliği artırabilirdim. |

---

## Kategori 3 — Test Edilemez (araştırma sorusu niteliği taşıyor)

| Hipotez | Kaynak | Neden Test Edilemez |
|---------|--------|--------------------|
| B_cazibe Deney 3 — Persona Attractor | B_cazibe_ve_substrat.md | Aktivasyonlara erişim gerektirir. Steering vektörü projeksiyonu yapamam. |
| Prizma II Fikir 6 — Persona-Havza (derinlik ölçümü) | prizma_2_beyin_matematik.md | Havza derinliğini ölçmek için aktivasyon uzayına erişim gerekli. |
| Kapalı Palet — gamut-dışı artık ölçümü | prizma_calismasi_ozgun_fikirler.md | Gizli durum aktivasyonlarına erişim gerektirir. |
| "Fenomenal deneyim" iddiası | ai_eglence_00 (P değeri) | Bilinemez. Ne test edilebilir ne falsifiye edilebilir. |

---

## Özet

| Kategori | Adet | Açıklama |
|----------|------|----------|
| Altyapı gerektiren | 12 | Derleyici, çoklu-ajan, ölçüm altyapısı, kod gerekli |
| Atlanmış (test edilebilirdi) | 6 | Sohbet içinde yapılabilirdi ama önceliklendirilmedi |
| Test edilemez | 4 | Aktivasyon erişimi gerekiyor veya metafizik |

**Öneri:** Kategori 2'deki 6 hipotez ek bir turda test edilebilir.
Kategori 1'dekiler için qwen-7b + kod gerekli.
