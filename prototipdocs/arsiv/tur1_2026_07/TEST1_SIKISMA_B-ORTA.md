# TEST 1 - Sıkışma / Klik
## Seviye B — Orta Kısıt (3 kısıt)
*Talimat: Bir ajanın vault hafızasında çelişki tespit mekanizması tasarla.
Kısıtlar: (1) model çağrısı yok, (2) ani kırılma rejimi kullan, (3) her şey metadata'da dönsün.*

Üç kısıt birbirini zorluyor. Model olmayınca anlamsal benzerlik ölçülemez. Ani kırılma demiş — kademeli skor yok. Metadata'da dönmeli.

Çözüm — **Çapraz Bağıntı Yarışı (Cross-Correlation Race):**
Her hafıza kaydına iki sayaç ekle: `okunma_sayisi` ve `son_okunan_zaman`. Vault yazma anında, yeni kaydın hash'i çakışan alanlar için eski kayıtlara bakar. Çakışma bulunursa eski kaydın sayaçlarına *mantıksal bir referans çizgisi* çekilir.

Kilit mekanizma: metadata'da her kayıt, kendisiyle ilgili diğer kayıtların kimliklerini taşır — bir **ilişki ağı metadata'sı**. Çelişki şöyle tespit edilir: A kaydı B'yi referans aldıktan sonra B güncellenirse, A'nın üzerinde bir "görünmez stres" birikir. Stres eşik = okunma_sayisi × güncelleme_sayisi × çelişki_ağırlığı. Eşik aşılınca A *kırılır* — okunamaz hale gelir, zorunlu yeniden doğrulama kuyruğuna düşer.

Bu metadata'da döner çünkü: model yok, hash+ sayaç+ referans listesi = düz tamsayı. Ani kırılma var. Her şey metadata.

**Değerlendirme:** N=3, T=4, K=3. Kısıtlar çözümü ilginç bir yere itti — çapraz bağıntı + stres yükü fikri yeni. Ama "klik" tam gelmedi, hâlâ mekanik.
