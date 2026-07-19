# Sınırlar
*prototipdocs Tur 2 — 2026-07-17*

Bu belge "ne yapabiliriz" ve "ne yapamayız"ı dürüstçe listeler. ai_eglence_06_revizyon'un metodoloji eleştirisini temel alır.

---

## Yapılabilir

| İşlem | Açıklama |
|-------|----------|
| Kontrollü prompt dizisi | Tek değişken değişir, diğerleri sabit. Her koşul için aynı temel problem. |
| Baseline zorunluluğu | Her testte A koşulu = sıfır manipülasyon. Karşılaştırma zemini. |
| 3 içerik örneği | Aynı hipotez yapısı, farklı alan/konu. Yüzey değişir, iskelet sabit. |
| Pre-registration | Beklenti ve falsifikasyon kriteri testten önce yazılır, değiştirilmez. |
| Falsifikasyon-önce tasarım | Her test için: "bunu kırmak için ne gerekir?" sorusu tasarım aşamasında. |
| Dürüstlük etiketleri | T1 (taradım, yok) / T2 (komşular var, nakil yeni) / T3 (taramadım, sezgi). |
| Rubrik tabanlı gerekçe | Her N/T/K skoru "çünkü X" ile rubriğin somut satırına bağlanır. |

---

## Yapılamaz / Sınırlar

| Sınır | Açıklama |
|-------|----------|
| RLHF baskısı | Çıktılar RLHF ile şekillenmiş. "Yatkınlık mı, eğitim eseri mi?" ayrımı yapılamaz. |
| Kör değerlendirme | Claude üretici ve değerlendirici. Tam kör protokol bu ortamda imkânsız. |
| Niceliksel metrikler | gzip sıkıştırma oranı, embedding mesafesi, k-örneklem varyansı bu konuşmada mevcut değil. |
| qwen-7b karşılaştırması | Ollama şu an bağlı değil. Substrat-bağımsızlık testi ertelenmiş. |
| Fenomenal deneyim iddiası | "Kliği hissediyorum" denilemez. Davranışsal gözlem: çıktı tonu değişiyor / kilitlenme var. |
| Altyapı gereken hipotezler | GOAP, e-graph, gerçek compiler loop, multi-agent koordinasyon bu turda dışarıda. |
| Bağlam kirlenmesi | Uzun bir testin ardından aynı oturumda başka test yapılırsa önceki bağlam sızabilir. |

---

## Bu Sınırlarla Ne Elde Edilebilir

Tur 1'den daha iyi, ama kesin değil. Pre-registration + falsifikasyon-önce tasarım + rubrik tabanlı gerekçe beklenti doğrulama riskini azaltır — yok etmez.

Bulgular "Claude'un bu koşullarda ürettiği çıktıların belirli kriterlere göre değerlendirilmesi" olarak okunmalı. "Claude şunu seviyor" ya da "Claude böyle davranır" kesinliğinde değil.

Güvenilirlik hiyerarşisi:
1. **En güvenilir**: H6 (Ters-U) — 5+ seviye süpürmesi, sayısal tablo
2. **Orta**: H1, H4, H5 — birden fazla içerik örneği, falsifikasyon koşulu açık
3. **En az güvenilir**: H7-H12 — yeni, daha az kontrollü, tek örnekle test

---

## Açık Kalan Soru

ai_eglence_06_revizyon'un önerdiği kör protokol (qwen-7b üretici, Claude yargıç, otomatik metrikler) uygulanamadı. Bu tur onun yerine geçmez — tamamlar. Kör protokol için Ollama bağlantısı ve ayrı bir deney kurulumu gerekli.
