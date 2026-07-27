# GÖREV 0 — Kaçırma Günlüğü Raporu

**Tarih:** 2026-07-24  
**Durum:** [TEST] TAMAMLANDI — `kacirma_gunlugu.md` oluşturuldu, ilk kayıt girildi

---

## v7 Analiz

🔍 **Alternatif:** Kaçırmaları git commit mesajlarına gömmek (test içinde yorum olarak).  
📏 **Fark büyüklüğü:** [TAHMİN] Commit mesajları aranabilir değil, tematik izleme için uygun değil. Ayrı dosya ayırt edilebilirliği ~3-5x artırır (ctrl-F çalışır, araç gerekmez).  
🎧 **Kanıt:** [TEST] `kacirma_gunlugu.md` var, ilk satır girildi.  
🐋 **Popülerlik mi ihtiyaç mı?** İhtiyaç: payda dosyası yoksa "çerçeve değerli" iddiası ölçülemez. Git log bunu karşılamaz.  
⚡ **Karar değişti mi?** HAYIR — kaçırma günlüğü ayrı dosya olarak doğru; commit mesajları birincil değil.

---

## Uzman 1: Kalite Güvencesi Mühendisi

**Perspektif:** Payda yoksa iyileştirme oranı ölçülemez.

Şu anki tablomuz: 34 → 58 test geçiyor, tüm modüller yeşil. Bu "yakaladıklarımız" listesi.
"Kaçırdıklarımız" yok. QA terminolojisinde bu **detection rate** bilinmiyor demektir; sadece **true positive** sayıyoruz.

**Spesifik bulgu (ilk kaçırma, 2026-07-24):**  
Önceki oturum "57 test geçiyor" dedi. Gerçek: 34 test. Fark: 23.
Bu QA açısından ciddi: test sayısı iddiası doğrulama adımı olmadan iletildi. Test runner çıktısı okunmamış ya da farklı test suite'e aitti.

**Öneri:** Her oturumun sonunda `python -m pytest --co -q` (sadece toplama, koşturma yok) ile sayıyı doğrula ve dosyaya yaz.

---

## Uzman 2: Deneysel Tasarım Araştırmacısı

**Perspektif:** Negatif sonuç verisi olmadan başarı kavramı tanımsız.

Güvenilir bir çerçeve iddiası için şunlar gerekir:
1. Çerçevenin yakaladığı hataların sayısı (şu an var)
2. Çerçevenin KAÇIRDIĞI hataların sayısı (şu an yoktu)
3. Çerçeve olmadan ne kadar sürede yakalanırdı (maliyet tahmini)

Sadece (1) varsa oran hesaplanamaz. İyileştirme iddiası **paydasız kesir**.

Kaçırma günlüğünün amacı (2)'yi biriktirmek. Etkinliği kanıtlamak için minimum 3-5 gerçek kaçırma kaydı gerekir; ancak ondan sonra "çerçeve değerli mi?" sorusu ölçülebilir.

**Uyarı:** Kaçırma günlüğü boş kalırsa iki seçenek var:
- Çerçeve gerçekten mükemmel (olası değil)
- Hiç gerçek entegrasyon yapılmadı (olası)
İkincisini ayırt eden tek şey GÖREV 2'nin tamamlanması.

---

## KAPANIŞ

Bu günlüğü en çok şu yanlışlar: dosya oluşturulur ama gerçek entegrasyon hatası gelince "sonra yazarım" diye geçilir ve günlük boş kalır — bu ölçüm değil dekor olur; bunu şu gözlem yakalar: birkaç oturum sonra kacirma_gunlugu.md'nin son değişim tarihi GOREV 2'nin başlama tarihinden önceyse, günlük gerçek entegrasyonu hiç görmemiş demektir.
