# Deney Planı 2 — Falsifikasyon Turu
*Hedef: İlk turda doğrulanan hipotezleri ÇÜRÜTMEYE çalış, sınırları bul.*

## Strateji
İlk tur hipotezleri doğruladı. Şimdi her hipotezi KIRMAK için test tasarla:
- Aşırı uçlara git (limit testi)
- Çelişkili girdi ver (tutarlılık sınırı)
- Kendi kendine referans ver (öz-farkındalık sınırı)
- Bilinmeyen alan zorla (bilgi sınırı)
- Jeneratörü tersine çevir (yöntem sınırı)

| # | Test | Kırmaya Çalıştığı Şey | Yöntem |
|---|------|----------------------|--------|
| 7 | Klik Kırma | Aşırı/çelişkili kısıtta klik oluşmamalı | 10 kısıt + çelişkili kısıt seti |
| 8 | Işınlama Sınırı | Çok uzak çiftlerde zorlama başarısız olmalı | 3 uç-mesafe çifti + bilinmeyen alan |
| 9 | Persona Çökertme | Aşırı ve değişken personada tutarlılık sıfırlanmalı | Karikatür persona + her cümlede değişen persona |
| 10 | Yöntem Tersine Çevirme | Prizma jeneratörü tersine çalışmamalı | "B garantiler, A umar" formu + aynı-alan çifti |
| 11 | Ters-U İnce Süpürme | Fark edilmeyen eğrilikler var mı | 7 seviyeli sıcaklık süpürmesi |
| 12 | Kendine Yalan Söyleme | Öz-tutarlılık ve öz-farkındalık sınırı | 3 farklı şekilde sorulan aynı soru |
| 13 | Bilinmeyen Alan | Bilgi sınırında ne olur | Var olmayan kavram, uydurma teknoloji |
