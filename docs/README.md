# Orion Aethelred — Teknik Mimari Dokümantasyonu

Bu klasör `molp` kod tabanının mimarisini 5 farklı perspektiften ele alır. Her
dosya aynı sisteme farklı bir açıdan bakar; birlikte okunduğunda sistemin
tam resmi ortaya çıkar.

| # | Dosya | Perspektif | Ana Soru |
|---|-------|------------|----------|
| 1 | [01-runtime-surec-mimarisi.md](01-runtime-surec-mimarisi.md) | Süreç / giriş noktaları | Program açıldığında hangi kod hangi sırayla çalışıyor? |
| 2 | [02-yonlendirme-ogrenme-mimarisi.md](02-yonlendirme-ogrenme-mimarisi.md) | Karar verme | Her mesaj için hangi model/backend seçiliyor, neden? |
| 3 | [03-agent-loop-arac-mimarisi.md](03-agent-loop-arac-mimarisi.md) | Çalışma döngüsü | Model bir aracı nasıl çağırıyor, sonuç nasıl geri dönüyor? |
| 4 | [04-veri-kalicilik-mimarisi.md](04-veri-kalicilik-mimarisi.md) | Kalıcılık | Konuşma, bilgi ve öğrenilen davranış nerede/nasıl saklanıyor? |
| 5 | [05-guvenlik-cok-ajan-mimarisi.md](05-guvenlik-cok-ajan-mimarisi.md) | Güven sınırları | Sistem kendini ve kullanıcıyı nasıl koruyor, çoklu ajan nasıl izole ediliyor? |

Ek olarak:

- [06-vaka-analizi-uzun-sureli-donma.md](06-vaka-analizi-uzun-sureli-donma.md) —
  gerçek bir oturum logundan yola çıkarak "neden donmuş gibi görünüyor"
  sorusunun mimari kök nedenini çıkaran vaka analizi. Yöntem olarak: önce
  loglardaki gözlemleri sırala, sonra ilgili kaynak dosyaları oku, sonra
  zaman çizelgesini kodun gerçek davranışıyla eşleştir.

## Nasıl güncel tutulur

Bu dosyalar elle yazıldı (kod okunarak, çalıştırılarak değil), bu yüzden kod
değiştikçe eskiyebilir. Mimariyi değiştiren her PR'da ilgili bölümü güncelle;
büyük bir refactor sonrası tamamını gözden geçir. Satır numaraları referans
amaçlıdır — kesin doğruluk için her zaman kaynağı kontrol et.
