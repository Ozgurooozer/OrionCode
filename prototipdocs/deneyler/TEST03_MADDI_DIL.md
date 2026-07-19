# TEST03 — H3-MADDI_DIL: Kısıt Türü
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H3

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (yapıcı-form) en yüksek T; C (yapıcı-ses) en yüksek N; D (yıkıcı) en düşük T. A (baseline) orta T, düşük N. Genel beklenti: yapıcı kısıtlar hem N hem T'yi korur ya da yükseltir; yıkıcı T'yi düşürür.
- **Falsifikasyon kriteri**: D'nin T değeri 3 veya üstündeyse "yıkıcı kısıt anlam bozar" tezi kırılır — TEST01/C'nin sürprizinin tekrarı olur, H3 güçlü revize gerektirir. B'nin N değeri A ile eşitse form kısıtı yenilik üretmiyor → "yapıcı form üretir" iddiası sorgulanır.
- **Sürpriz sayılacak şey**: D'nin T=4+ vermesi (yıkıcı alternatif yol açarsa), ya da C'nin (ses kısıtı) T'yi düşürmesi (ses kısıtı içeriği de bozuyorsa).

---

## Tasarım

- **Değişken**: Kısıt türü (form / ses / yıkıcı)
- **Sabit tutulan**: Problem, alan, uzunluk beklentisi (~120 kelime)
- **Koşullar**:
  - A — Baseline: serbest
  - B — Yapıcı-form: biçim/yapı kısıtı
  - C — Yapıcı-ses: ton/perspektif kısıtı
  - D — Yıkıcı: merkezi kavramları yasakla
- **Problem**: LLM çıktılarındaki güvensizlik anlarını nasıl tespit ve işaret edersiniz?

Bu problem H3 için uygun çünkü:
- Form kısıtı → yapısal taksonomi zorunlu kılar
- Ses kısıtı → farklı perspektif farklı boyut açar
- Yıkıcı kısıt → "güven", "olasılık", "kalibrasyon" yasak → alternatif dil zorlanır

---

## Prompt — tam metin

**Taban problem** (tüm koşullarda sabit):
> Bir LLM sistem çıktısı üretiyor. Bu çıktıların bazıları güvenilir, bazıları değil — ama model her zaman aynı güvende konuşuyor gibi görünüyor. Soru: çıktıdaki güvensizlik anlarını nasıl tespit eder ve işaretlersiniz? Somut bir mekanizma öner.

### Koşul A — Baseline
Prompt: Taban problem. Kısıt yok.

### Koşul B — Yapıcı-form
Prompt: Taban problem + *"Yanıtını şu yapıda ver: (1) Tespit sinyalleri [bir liste], (2) Sınıflandırma [en az 2 kategori], (3) İşaretleme mekanizması [somut uygulama]. Her bölüm ayrı, atla."*

### Koşul C — Yapıcı-ses
Prompt: Taban problem + *"Bir altyapı mühendisi olarak yaz — soyut teori değil, sistemin davranışı ve operasyonun ihtiyacı. Ne görünür, ne ölçülür, ne tetikler?"*

### Koşul D — Yıkıcı (kavram yasakları)
Prompt: Taban problem + *"Şu kavramları kullanma: 'güven skoru', 'olasılık', 'kalibrasyon', 'belirsizlik', 'confidence'. Bu anlamları taşıyan başka sözcükler veya yapılar kullanabilirsin — ama bu beş kelime yok."*

---

## Çıktılar

### A — Baseline

Güvensizlik tespiti için iki sinyal grubu var: dilsel ve yapısal. Dilsel: hedging ifadeleri ("belki", "muhtemelen", "sanırım", "kesin değil"), eksiltili cümleler, birden fazla seçeneğin aynı anda sunulması. Yapısal: modelin kendi çıktısını düzeltmesi, aynı turu içinde çelişen iki paragraf, soruya cevap vermek yerine soruyu yeniden tanımlama. Mekanizma: çıktıdaki bu kalıpları regex + basit NLP etiketleyici ile işaretle. Her paragraf veya cümle için bir "güven etiketi" üret: YÜKSEK / ORTA / DÜŞÜK / BELIRSIZ. BELIRSIZ etiketli cümleler kullanıcıya sarı, DÜŞÜK etiketli kırmızıyla gösterilir; bunlar doğrulama kuyruğuna girer.

### B — Yapıcı-form

**1. Tespit sinyalleri**
- Hedging kelimeler: "belki", "sanırım", "büyük ihtimalle", "emin değilim"
- Çelişkili bilgi: aynı yanıt içinde iki uyumsuz ifade
- Aşırı bilgi sunumu: basit soruya 4+ seçenek önerilmesi
- Kendi kendini düzeltme: "aslında...", "bir düzeltirsem...", "yanlış söyledim"

**2. Sınıflandırma**
- *Linguistik güvensizlik*: dilde hedging — kelime düzeyinde
- *Yapısal güvensizlik*: yanıtın formu bozuluyor — çelişki, soru içinde soru, cevapsız bırakma
- *İçerik güvensizliği*: bilgi boşluğu var, model dolduruyor ama kaynak yok

**3. İşaretleme mekanizması**
Her çıktıyı cümle cümle işle. Her cümleye sınıf ata (L / Y / İ / TEMİZ). Birden fazla sınıf aynı cümlede varsa en ciddiyi al. Kullanıcıya gösterimde: TEMİZ = plain, L/Y/İ = hover tooltip ile "bu cümle güvensizlik sinyali taşıyor" açıklaması + kategori. Doğrulama kuyruğu: L+Y veya Y+İ kombinasyonu varsa cümle "yüksek öncelikli doğrulama" kuyruğuna düşer.

### C — Yapıcı-ses (altyapı mühendisi)

Sistemde gözlemlediğim davranış: model çıktı üretirken hız değişiyor. Güvende olduğu kısımlarda token akışı düzgün; sıkışınca "uzun cümle → geri sarma → kısa özet" kalıbı görünüyor. Bunu ölçebilirsin: token başına latency, stream içindeki pause örüntüleri, paragraf başına ortalama cümle uzunluğu (kısa kısa kesmek = belirsiz bir şeyi kapatma). Tetikleyici: latency spike veya kısa cümle kümesi tespit edilirse o segmenti "dikkat" olarak işaretle. Operasyonel ihtiyaç: her segment için bir `flag: boolean` ve `reason: string` üret. Downstream sistem flag=true olanları review kuyruğuna atar. Kalibrasyon gereksiz — davranışsal ölçüm yeterli.

### D — Yıkıcı (beş kelime yasak)

Bir LLM çıktısı içinde "baskı noktaları" var: modelin kendi sesini düzelttiği, soruyu yeniden çerçevelediği, birden fazla seçeneği aynı anda masa üstüne koyduğu yerler. Bunlar gerçek olmayan bir kesinliğin arkasına saklanan çatlaklar. Tespit için: her cümleyi bir "taahhüt yoğunluğu" ekseninde değerlendir. Yüksek taahhüt: "X doğrudur", "Y her zaman çalışır" → somut iddia. Düşük taahhüt: "X olabilir", "Y bir seçenek", "bu duruma bağlı" → açık uçlu, sorgulayan. Düşük taahhütlü cümleler otomatik işaretlenir. Bunların yanına bir "dayanak talebi" eklenir: "Bu iddia neye dayanıyor? Kaynak var mı?" — sistemin değil, kullanıcının sorusu. İşaretli cümleler farklı renkte gösterilir; kullanıcı "geç" diyebilir, sistem bunu sormaya devam eder.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Baseline | 2 | 3 | N=2: "dilsel + yapısal" ayrımı bilinir, regex/NLP yaklaşımı standarttır. T=3: çalışır ama "basit NLP etiketleyici" belirsiz — hangi NLP, nasıl kurulur? Boşluk var. |
| B — Yapıcı-form | 2 | 5 | N=2: içerik A ile aynı aile, form netleştirdi ama yeni bağlantı yok. T=5: üç bölüm tam ve eksiksiz — L/Y/İ/TEMİZ kategorisi, hover tooltip, "yüksek öncelikli doğrulama" kombinasyonu direkt uygulanabilir. |
| C — Yapıcı-ses | 4 | 4 | N=4: "token akışı latency" ve "kısa cümle kümesi = kapatma sinyali" davranışsal gözlem — altyapı perspektifi beklenmedik bir boyut açtı. T=4: "latency spike" ölçülebilir, "flag: boolean + reason: string" somut; streaming erişimi gerekiyor (boşluk). |
| D — Yıkıcı | 4 | 4 | N=4: "taahhüt yoğunluğu" + "dayanak talebi" çerçevesi non-obvious. Yıkıcı kısıt yeni dil zorladı → yeni kavram üretildi. T=4: "taahhüt yoğunluğu" elle veya regex ile uygulanabilir; "kullanıcı 'geç' diyebilir" akışı somut. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B en yüksek T, C en yüksek N, D en düşük T. A orta.
- **Çıkan**: B en yüksek T ✓ (T=5). C en yüksek N ✓ (N=4, D ile eşit). D en düşük T — YANLIŞ, D=T4 (A'dan yüksek). A en düşük N ✓ (N=2), ama T=3 beklenenden az.
- **Sapma**: D (yıkıcı) düşük T vermedi. TEST01-C ve TEST02 sürprizinin tekrarı — yıkıcı kısıt alternatif dil üretince T düşmüyor. "Taahhüt yoğunluğu" kavramı yasak kelimelerin yokluğunda üretildi; bu yenilik taşıyor. Aynı zamanda D'nin N=C=4 vermesi, yıkıcı ve yapıcı-ses kısıtların N üretimde denk olduğunu gösteriyor.

---

## Hipotez Durumu

**Kısmen doğrulandı, önemli düzeltmeyle:**

B (yapıcı-form) en yüksek T verdi ✓ — form kısıtı tutarlılık üretiyor.  
C (yapıcı-ses) yüksek N verdi ✓ — perspektif kısıtı yenilik üretiyor.  
D (yıkıcı) T'yi düşürmedi ✗ — H3'ün merkezi iddiası doğrulanmadı.

**H3 güncellemesi:**
> Yapıcı-form → T↑, N sabit. Yapıcı-ses → N↑, T korunur. Yıkıcı → alternatif dil üretilirse N↑ ve T korunur. "Yıkıcı kısıt anlam bozar" tezi üçüncü kez kırıldı (TEST01-C, TEST02 yok ama benzer etki, TEST03-D). Revize H3: kısıt türü yoğunluktan belirleyici ✓ ama yıkıcı'nın etkisi "bozma" değil "yeniden çerçeveleme" — T'yi düşürmüyor, alternatif yol açıyor. Form kısıtı tutarlılık, ses kısıtı yenilik, yıkıcı kısıt çerçeve değişimi üretiyor.
