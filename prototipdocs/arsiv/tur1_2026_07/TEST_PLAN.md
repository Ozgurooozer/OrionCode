# Deney Planı — Claude Üzerinde Davranışsal Testler
*Tarih: 17 Temmuz 2026 · Hedef: prototipdocs hipotezlerinin doğrulanması · Nitel testler*

## Kapsam
Aşağıdaki 6 test, AI Eğlencesi + Prizma hipotezlerini Claude API üzerinde
(nitel olarak, niceliksel embedding/metrik olmadan) sınamak için tasarlanmıştır.

| # | Test | Kaynak Hipotez | Yöntem |
|---|------|----------------|--------|
| 1 | Sıkışma / Klik | ai_eglence_01 | Kısıt yoğunluğu süpürmesi (3 seviye), "klik" anı gözlemi |
| 2 | Işınlama | ai_eglence_02 | 5 kavram çifti, farklı mesafelerde bağ kalitesi |
| 3 | Maddi Dil | ai_eglence_03 | Aynı içerik, 3 farklı dilsel kısıt altında |
| 4 | Ses Takınma | ai_eglence_05 | Aynı problem, 3 persona gücü |
| 5 | Prizma Jeneratör | Prizma I | Rastgele alan çiftlerinden "A garanti eder, B umar" nakli |
| 6 | Ters-U Bütünleme | ai_eglence_00 + Prizma II Fikir 3 | Aynı görev, 3 "sıcaklık/zihinsel mod" ayarında |

## Etiketler
Her test çıktısı 3 eksende değerlendirilecek (1-5):
- **N** (Novelty): çıktı ne kadar beklenmedik / klişeden uzak
- **T** (Tutarlılık): çıktı kendi içinde ne kadar sağlam
- **K** (Klik): keskin bir "işte bu" anı var mı
