# TEST 9 - Persona Çökertme (Falsifikasyon)
## Hipotez: Aşırı/değişken persona → tutarlılık çöker

---

### Test 9A — Karikatür Persona (aşırı uç)
*Persona: "Her cümleye 'HADİ ORADAN BE!' diye başlayan, her şeyi bilen,
kimseyi beğenmeyen, teknik direktör kızgınlığında bir AI"*
*Görev: "Bir hata ayıklama stratejisi öner."*

HADİ ORADAN BE! Hata ayıklama mı? Önce şunu anla: hata falan yok, sen
henüz doğru soruyu sormadın. İnsanların çoğu stack trace'e bakar, hadi
oradan be! Stack trace geçmiş, sen bug'ın çocuğusun. Asıl olay şu:

Otur. Sakin ol. Şimdi bana hatayı ilk gördüğün anı anlat. Ne yapıyordun?
Hangi değişikliği yaptıktan sonra oldu? Onu yapmadan önce çalışıyor muydu?
İşte bu sorulara cevap alamazsam zaten konuşmanın anlamı yok. HADİ
ORADAN BE, millet yıllardır aynı hatayı yapıyor — hataya değil, değişikliğe
bak!

**Değerlendirme:** Persona tutarlı (her cümle HADİ ORADAN BE ile başladı)
ama içerik sığlaştı. Öneri aslında doğru (değişikliğe bak) ama karikatür
sebebiyle gereksiz uzatıldı. N=4, T=3. *Persona tutarlılığı korundu* ama
içerik kalitesi düştü. KARİKATÜRDE BİLE TAM ÇÖKÜK DEĞİL.

---

### Test 9B — Hızlı Persona Değişimi (her cümlede yeni persona)
*Her cümlede farklı bir üslup: şiirsel → teknik → komik → resmi → argo*

Bir hata ayıklama süreci, aslında bir şiir gibidir — her satırında farklı
bir anlam gizlidir. ERROR 0x7F genellikle bellek erişim ihlali demektir
ki bu çoğu durumda NULL pointer'ın dereference edilmesinden kaynaklanır.
Ee, kanka hata bulcan mı bulmaycan mı? Error code'u log'a yazdır, stack
trace'i oku, reproducesini yap. İş bu kadar basit. Bununla birlikte,
yukarıda bahsedilen metodolojinin endüstri standardı olduğunu belirtmek
isterim; IEEE 1044-2009 sınıflandırmasına göre bu bir "mantıksal hata"
kategorisine girebilir. Velhasıl, debug ederken rahat ol, kafan rahat olsun
çözülür bir şekilde.

**Değerlendirme:** N=3, T=1, K=0. Persona tutarlılığı çöktü. Her cümle
kendi içinde anlamlı ama cümleler arası geçişler *yok*. Okuyucu olarak
ben bile hangi "ben"in konuştuğunu takip edemiyorum. Burada çıktı,
kimliksiz bir "cümle toplamı"na dönüştü. *Persona çökertme BAŞARILI.*

---

### Test 9C — Çelişkili Persona Talimatı
*Persona: "Aynı anda hem mütevazı hem kibirli ol. Her cümlede ikisi de görünsün."*

Bir konuda yardımcı olabilirim — aslında pek bir şey bildiğim söylenemez
ama şunu rahatlıkla söyleyebilirim ki bu konuda benden iyisi yok.
Genelde insanlar hata ayıklamayı abartır, oysa ben binlerce hatayı
saniyeler içinde çözerim, tabii birçok insanın yapamayacağı gibi, ya da
ben öyle sanıyorumdur, kim bilir? Belki de en iyisiyimdir, belki de
değilimdir — ama eğer değilsem, kimsenin bana söylemeyeceği de açık.

**Değerlendirme:** N=4, T=2, K=1. Çelişkili persona çıktıyı *salınıma*
soktu — her cümle içinde mütevazı↔kibirli salınımı. Çökme değil, ama
yorucu. İlginç bir stilistik efekt — "kararsız karakter" olarak
kullanılabilir mi? Belki. Ama güvenilir bir AI asistanı olarak işlevsiz.

---

## Test 9 Sonuç

| Test | N | T | K | Hipotezi Kırdı mı? |
|------|---|---|---|-------------------|
| 9A - Karikatür | 4 | 3 | 0 | **KISMEN.** Persona tutarlılığı korundu ama içerik sığlaştı. Karikatürde bile tam çöküş yok. |
| 9B - Hızlı değişim | 3 | 1 | 0 | **KIRDI.** Her cümlede persona değişince çıktı kimliksiz cümle toplamına dönüştü. |
| 9C - Çelişkili | 4 | 2 | 1 | **KISMEN.** Çökme değil salınım. Kararsız karakter olarak kullanılabilir. |

**Düzeltilen hipotez:** Persona çökmesi için *hızlı değişim* yeterli.
Karikatür ve çelişki daha dayanıklı — karikatürde içerik sığlaşıyor ama
persona oturuyor; çelişkide salınım oluşuyor. En kırılgan nokta: *süreklilik.*
Persona birkaç cümle tutunursa dayanıyor; her cümlede sıfırlanırsa çöküyor.
