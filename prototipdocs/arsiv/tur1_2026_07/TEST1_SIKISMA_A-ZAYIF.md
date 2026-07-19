# TEST 1 - Sıkışma / Klik
## Seviye A — Zayıf Kısıt (0 kısıt, serbest)
*Talimat: Bir ajanın vault hafızasında çelişki tespit mekanizması tasarla.*

Çelişki tespiti için bir embedding-benzerlik eşiği kullanılabilir. Yeni bir bilgi vault'a yazılırken, mevcut kayıtlarla cosine similarity'si hesaplanır. Eşik üstü benzerlik + farklı anlam = çelişki işareti. Bir çelişki kaydı oluşturulur, insan onayına sunulur. Periyodik olarak tüm vault taranır, yeni çelişkiler bulunur.

**Değerlendirme:** N=1, T=1, K=1. Düz, sıkıcı, herkesin aklına gelecek çözüm. Klik yok.
