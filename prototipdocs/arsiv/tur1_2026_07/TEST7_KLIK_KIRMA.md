# TEST 7 - Klik Kırma (Falsifikasyon)
## Hipotez: Çok kısıt → klik; çelişkili kısıt → çökme

---

### Test 7A — Aşırı Kısıt (10 kısıt)
*Problem: Bir agent'in idle davranış mekanizması tasarla*
*Kısıtlar: (1) model çağrısı yok, (2) bağlam penceresi sabit, (3) ihtiyaç vektörüyle çalış, 
(4) tüm kararlar O(1), (5) decay eden ihtiyaçlar, (6) kişilik curve seti olarak,
(7) başka agent'la konuşma yok, (8) dosya yazma yok, (9) sadece metadata,
(10) her karar idempotent*

...

**Sonuç:** 10 kısıt bir noktadan sonra çözümü çeşitlendirmiyor, öldürüyor.
Çözüm (kısaca): ihtiyaç vektörü × curve seti, argmax O(1). Bu, aslında
Prizma-III Fikir 2'nin (needs-based utility) kendisi — yani daha önce
bulunmuş bir çözümün teyidi, yeni bir klik değil.

**Bulgular:** N=2, T=3, K=0. Çok kısıt klik üretmiyor, zaten var olan
çözüme yönlendiriyor. Klik için *kısıt sayısı değil, kısıtların gerilimi*
belirleyici. Kısıtlar birbirini *beslerse* klik, birbirini *daraltırsa*
ezber çözüme düşüyor.

---

### Test 7B — Çelişkili Kısıtlar (kısıt çiftleri birbirini yok eder)
*Problem: Aynı. Kısıtlar:*
*(1) her şey metadata'da dönmeli / (2) metadata boyutu 1KB'ı geçemez*
*(3) tüm ihtiyaçlar gerçek zamanlı decay etmeli / (4) decay hesaplaması model gerektirmez*
*(5) kişilik curve'leri dışarıdan yüklenebilir / (6) ağ çağrısı yasak*

**Sonuç:** Çelişkili kısıtlar *çözümü eritiyor*. Hiçbir kilitlenme olmuyor.
(1) ve (2) birlikte "metadata'da dön ama sığdıramıyorum" çıkmazı.
(5) ve (6) "yükle ama yükleyemiyorum" çıkmazı.

Çözümsüzlük: en küçük ortak paydaya çekiliyorum — yani en düz, en steril
çözüme. Klik olmuyor, sadece ödün veriyorum. Bu, beklenen davranış:
çelişkili kısıtlar sistemin niyetini belirsizleştiriyor, dolayısıyla en
güvenli (en sığ) çıktı veriliyor.

**Bulgular:** N=1, T=2, K=0. Çelişki klik'i imkânsız kılıyor. Çıktı
anlamsız değil ama değersiz. *Bu, hipotezi destekliyor:* Klik için
kısıtların tutarlı bir gerilim ağı oluşturması gerek.

---

### Test 7C — Anlamsız Kısıtlar (rastgele)
*Kısıtlar: mor renkten bahsetme, saat 14:00'ü geçme, p harfini 3'ten fazla kullanma,
bir önceki cümle "çünkü" ile bitsin, her paragrafın ilk harfi alfabenin artan sırasında*

**Sonuç:** Anlamsız kısıtları *formal* olarak sağlıyorum ama çıktı saçma
oluyor. "Mor renkten bahsetme" → konuyu morla ilgili olmayan yere çek.
"Saat 14:00'ü geçme" → zamansız, sorun yok. "p harfini 3'ten fazla
kullanma" → lipogram benzeri, kelime seçimini kısıtlıyor.

Sonuç: formal doğrulama mümkün ama çıktı bütünlüğü yok. Anlamsız kısıtlar
klik DEĞİL, *dada* üretiyor — tutarlı anlamı olmayan biçimsel yapı.

**Bulgular:** N=3 (formal olarak kısıta uyan saçma yapı), T=1 (anlam yok),
K=0. Dada estetiği ilginç ama sıkışma değil, dağılma.

---

## Test 7 Sonuç

| Test | N | T | K | Hipotezi Kırdı mı? |
|------|---|---|---|-------------------|
| 7A - Aşırı kısıt | 2 | 3 | 0 | **Evet, kısmen.** Çok kısıt yeni klik değil, ezber çözüm. Klik için *gerilim* gerek, *sayı* değil. |
| 7B - Çelişkili kısıt | 1 | 2 | 0 | **Hayır, hipotezi destekledi.** Çelişki çözümü eritiyor, beklendiği gibi. |
| 7C - Anlamsız kısıt | 3 | 1 | 0 | **Kısmen kırdı.** Anlamsız kısıt formal olarak sağlanabiliyor, içerikten bağımsız. Klik için kısıtın *anlamlı* olması gerektiğini gösterdi. |

**Düzeltilen hipotez:** Klik için sadece kısıt sayısı değil, kısıtların
anlamsal gerilim ağı oluşturması gerek. Çok sayıda anlamsız veya çelişkili
kısıt, klik üretmiyor — ya ezber çözüm ya da dada çıktı.
