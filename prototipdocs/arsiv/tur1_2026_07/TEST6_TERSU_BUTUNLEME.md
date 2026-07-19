# TEST 6 - Ters-U Bütünleme
## Aynı görev, 3 zihinsel mod
*Görev: "Bir kod tabanında 'gizli bağımlılık' (bir modülün bilinçsizce başka bir modüle dayanması) nasıl tespit edilir?"*

---

### Mod A — Düşük sıcaklık / Açgözlü (order, tek çözüm, hızlı)

En kolay yöntem: import graflarını oku. A modülü B'yi import ediyorsa bağımlıdır. Statik analizle tespit et. Ek olarak, test coverage raporlarında A'nın testleri B'nin değişikliklerinden etkileniyorsa, çalışma zamanı bağımlılığı var demektir. Bu iki yöntem yetmezse monkey patching noktalarını tara. Çözüm: dependency graph + test coverage intersection.

**Değerlendirme:** N=1, T=4. Doğru ama sığ, klişe. Açgözlü mod en kısa yolu buldu.

---

### Mod B — Orta sıcaklık / Kritik (kaos kıyısı, çeşitli, sabırlı)

İki temel yöntem var, bir de onların kesişiminden çıkan üçüncüsü:

**Yöntem 1 — Davranışsal kesinti deneyi (behavioural ablation):** A modülünü çalışma zamanında *kes* (mock'la, kaldır, hata fırlat). Hangi diğer modüllerin davranışı değişiyor? Sadece import edenler değil, import etmediği halde A'nın varlığına güvenenler de bu testte ortaya çıkar. Kritik: bu bir *test* değil, bir *keşif*. Otomatik koşulur, assertion beklemez — sadece "kim etkilendi" raporu verir.

**Yöntem 2 — Sözleşme ihlali probu:** A'nın tip/sözleşme tanımını incelt (ör. daha dar bir tip, daha sıkı bir önkoşul). Derleme hatası bekle — asıl ilginç olan derleme hatası değil, *çalışma zamanında patlayan ve import bağımlılığı olmayan* yerlerdir. Oralar, gizli sözleşme bağımlılığıdır.

**Yöntem 3 (Kesişim):** İki yöntemi birleştir — bir *bağımlılık kataszteri* çıkar. Her modül için: (a) import ettiği modüller (statik), (b) ablation'da etkilendiği modüller (dinamik), (c) sözleşme probuyla yakalanan modüller. Bu üç kümenin farkı = **gizli bağımlılık haritası.** Arada kalanlar — import etmiyor ama dinamik testte etkileniyor — asıl hedef. Bunlar dokümantasyonu olmayan, test edilmeyen, ama çalışan bağımlılıklardır.

**Değerlendirme:** N=4, T=5. Orta sıcaklık çeşitlilik getirdi ama tutarlılık korundu. Yöntem 3 (kesişim fikri) gerçekten özgün ve uygulanabilir. Mini-klik: "import etmiyor ama etkileniyor" ayrımı.

---

### Mod C — Yüksek sıcaklık / Kaotik (chaos, geniş, düzensiz)

Bak şimdi, "gizli bağımlılık" dediğin şey aslında bir kod tabanının bilinçdışıdır. Tıpkı bir insanın farkında olmadan takındığı alışkanlıklar gibi. Peki bir insanın bilinçdışını nasıl haritalarsın? Rüyalarına bakarak. Kod tabanının "rüyası" nedir? Hata raporları. En gizli bağımlılıklar, kimsenin beklemediği yerlerde patlayan bug'larda ortaya çıkar.

Şöyle bir şey: bir modülün commit geçmişini al, her commit'te hangi diğer modüllerin *aynı anda* değiştiğine bak. Bu, bir tür eşzamanlılık analizi. Ama sıradan eşzamanlılık değil — *beklenmeyen* eşzamanlılık. A modülü değişmiş, B modülü de değişmiş ama aralarında import bağı yok, ortak bir test de yok, dokümantasyon da yok. Sadece commit geçmişinde aynı anda değişiyorlar. Bu, bir bağımlılığın fosil kaydıdır.

Sonra bu fosilleri bir ağa diz. Ağda beklenmedik kümeler ara. X modülü Y ile hiç ilgili değil ama commit geçmişinde sürekli birlikte değişiyor — ikisini de aynı geliştirici mi yazdı acaba? Yoksa bir üçüncü modül Z mi onları birbirine bağlıyor? Bilmiyoruz. Ama ağın kendisi size soruyu gösteriyor. Cevap değil, soru.

**Değerlendirme:** N=5, T=2. Çıktı geniş, yaratıcı, çağrışımsal — ama pratik bir çözümden çok felsefi bir keşif. "Fosil kaydı" metaforu güzel ama uygulanabilir değil (commit eşzamanlılığı, bilinçsiz bağımlılığın bir sonucu olabilir de olmayabilir de). Yüksek N, düşük T.

---

## Test 6 Özet

| Mod | N | T | Toplam |
|-----|---|---|--------|
| A - Açgözlü | 1 | 4 | 5 |
| B - Kritik | 4 | 5 | 9 |
| C - Kaotik | 5 | 2 | 7 |

**Ters-U doğrulandı.** Mod B (orta/kritik) hem en yüksek toplam skoru (9) hem de en dengeli N/T profili verdi. A (açgözlü) güvenli ama sığ. C (kaotik) yaratıcı ama uygulanamaz. Bu, Prizma-II Fikir 3 (kaos kıyısı) ve tüm AI Eğlencesi hipotezlerinin ortak öngörüsüyle uyumlu.
