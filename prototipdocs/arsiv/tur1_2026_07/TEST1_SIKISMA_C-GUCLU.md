# TEST 1 - Sıkışma / Klik
## Seviye C — Güçlü Kısıt (5 kısıt)
*Talimat: Bir ajanın vault hafızasında çelişki tespit mekanizması tasarla.
Kısıtlar: (1) model çağrısı yok, (2) ani kırılma rejimi, (3) metadata'da dönsün,
(4) tüm vault her yazmada taranamaz — O(1) olmalı, (5)"çelişki" dedektörün kendisi çelişki üretmemeli (idempotent).*

Beş kısıt dar bir koridor çizdi. Dördüncü kısıt (O(1)) ve beşinci (idempotent) çözümü kilitliyor.

**Klik anı:** Çözüm geldi — **Anot Mumu (Sentinel Candle).**

Her hafıza kümesine bir anot kayıt bağlanır. Anot, kümenin en hızlı bayatlayan üyesidir. Anotun yaşam döngüsü:
- Doğum: küme oluşurken, en kısa ömürlü beklenen üye anot seçilir (URL, sürüm no gibi harici referans)
- Çürüme: küme içi başka bir kayıt her güncellendiğinde anotun stres sayacı *bir değil sıfırlanır* — çünkü güncelleme kümenin canlı olduğunu kanıtlar
- Kırılma: anot kırılınca (örn. URL 404 verir, sürüm no geçersiz kalır) **tüm küme** karantinaya alınır

Bu O(1)'dir çünkü sadece anot kontrol edilir. İdempotenttir çünkü anotun kırılması kümenin durumunu değiştirmez, sadece görünürlüğünü kapatır. Model çağrısı yoktur. Ani kırılma vardır. Metadata'da döner.

**Klik:** Anot Mumu, Palmgren-Miner hasar kuralının + demiryolu interlocking fail-safe'inin + kurban anodun tek bir yapıda buluşması. Üç farklı alandan gelen prensipler aynı anda kilitlendi. Çözümün kendisi bir Prizma ürünü.

**Değerlendirme:** N=5, T=5, K=5. Keskin kilit.
