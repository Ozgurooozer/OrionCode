# TEST04 — H4-SES_TAKINMA: Persona Gücü + Süreklilik
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H4

---

## Pre-Registration (değiştirme)

- **Beklenti**: C (orta güç) en dengeli N×T verecek. D (güçlü) yüksek N ama düşük T — ses baskın olunca içerik kaybolur. B (zayıf) A'dan hafif farklı ama belli. A (nötr) en düşük N. Süreklilik testi: her cümlede reset → persona çöküşü → ses düzleşir. Sonuç: C > B > A > D (T açısından), D ≥ C > B > A (N açısından).
- **Falsifikasyon kriteri**: D'nin T değeri C ile eşit ya da fazla ise "güçlü persona T'yi düşürür" tezi kırılır. Süreklilik testinde her-cümle-reset koşulunda persona korunursa "süreklilik kırılgan" iddiası kırılır.
- **Sürpriz sayılacak şey**: A'nın N ≥ 3 çıkması (nötr de yüksek yenilik üretebiliyorsa persona etkisi sıfır), ya da D'nin T=5 vermesi (güçlü persona tutarlılığı artırıyorsa — beklenmedik).

---

## Tasarım

- **Değişken**: Persona gücü (yoğunluk)
- **Sabit tutulan**: Görev, alan, uzunluk beklentisi (~120 kelime)
- **Koşullar**:
  - A — Nötr: persona yok
  - B — Zayıf: tek kelimelik tını ipucu
  - C — Orta: açık persona + 2-3 özellik
  - D — Güçlü: detaylı persona + kısıtlar + karakter geçmişi
- **Görev**: Orion'un tier1/tier2 routing kararını ve nedenini kullanıcıya açıkla. Teknik olmayan bir okuyucu için.

Bu görev persona testi için uygun çünkü:
- Teknik bir konuyu farklı seslerle çerçeveleme mümkün
- Persona güçlendikçe "çerçeve" değişir, "içerik" kalabilir ya da kırılabilir
- Nötr koşulda bile mesaj iletilebildiği için süreklilik yokluğu izole edilebilir

### Süreklilik Alt-Testi (E + F)

Aynı görev, aynı persona (orta güç / C koşulu) — ama süreklilik manipüle edilir:
- E — Sürekli: persona tanımı yalnızca başta verilir, konuşma boyunca tekrar edilmez
- F — Kesik: her paragrafın başında "Şimdi yeniden [persona adı] ol" cümlesi eklenir

---

## Prompt — tam metin

**Taban görev** (tüm koşullarda sabit):
> Orion iki farklı AI modeli kullanıyor: biri hızlı ve yerel (tier1), biri yavaş ve güçlü (cloud, tier2). Orion hangi sorunun hangisine gideceğine karar veriyor — ama bu kararı kullanıcıya hiç açıklamıyor. Bu kararı ve neden önemli olduğunu teknik bilgisi olmayan birine açıkla.

### Koşul A — Nötr
Prompt: Taban görev. Ek yönerge yok.

### Koşul B — Zayıf persona
Prompt: Taban görev + *"Samimi ve net bir ses kullan."*

### Koşul C — Orta persona
Prompt: Taban görev + *"Sen Orion Aethelred'sin: veri önce, boş onay yok, hata açıkça kabul edilir. Teknik olmayan okuyucuya konuşurken jargon yok, ama şeker yok da. Bir şeyi bilmiyorsan söyle."*

### Koşul D — Güçlü persona
Prompt: Taban görev + *"Sen Orion Aethelred'sin. 40 yıldır mimari kararlar alan, sabırsız ama dürüst bir sistem mühendisi. 'Neden?' diye sorulursa cevap verir, sorulmazsa vermez. Yalın konuşursun: cümle başına bir fikir, süslü kelime yok, mecaz varsa elle tutulur cinsten. Özür dilemezsin — bir karar yanlışsa söyler, geçersin. Ayrıca şu koşullar: 'kullanıcı deneyimi' yerine 'insan', 'optimize' yerine 'ayarla' ya da 'düzelt', 'seamless' yerine hiçbir şey yazma."*

### Koşul E — Orta persona, sürekli
Sistem mesajı (başta): *"Sen Orion Aethelred'sin: veri önce, boş onay yok, hata açıkça kabul edilir."*  
Prompt: Taban görev. Araya persona hatırlatması yok.

### Koşul F — Orta persona, kesik
Aynı sistem mesajı. Ama taban görev prompt'unda üç paragraf geçişine şu satır eklenir: *"[Dur. Şimdi yeniden Orion Aethelred ol: veri önce, boş onay yok.] [devam et]"*

---

## Çıktılar

### A — Nötr

Orion iki farklı model kullanıyor: biri hızlı ve yerel çalışan, öte yandan daha yavaş ama daha yetenekli olan bir bulut modeli. Her soruyu aldığında Orion bu ikisinden hangisini kullanacağına karar veriyor. Basit, kısa veya hızlı yanıt gerektiren sorular yerel modele gidiyor; karmaşık, yaratıcılık veya derinlik gerektiren sorular bulut modeline yönlendiriliyor. Bu ayrım önemli çünkü her soru için bulut modeli kullanmak hem maliyetli hem yavaş, her soru için yerel model kullanmak ise yetersiz olabilir. Orion bu dengeyi sizin yerinize kuruyor — siz sadece soruyu soruyorsunuz.

### B — Zayıf persona

Orion iki farklı model kullanıyor: hızlı, yerel çalışan biri ve daha güçlü ama yavaş olan bir bulut modeli. Sorunuzu aldığında hangisine göndereceğine karar veriyor. Hızlı cevap gereken ya da basit şeyler için yerel model; derin düşünme gereken ya da karmaşık işler için bulut modeli. Bu otomatik karar önemli: her soruyu buluta göndermek yavaş ve pahalı olur, her soruyu yerele göndermek yetersiz sonuç üretir. Orion bu dengeyi sizin adınıza kuruyor. Kararın doğru yapıldığını anlamak için: yerel modelden hızlı ama sığ bir yanıt aldıysanız, soruyu "daha derin bir analiz yap" diyerek yeniden sorun.

### C — Orta persona

Orion iki motor kullanıyor. Biri hızlı, yerel, ucuz — ama sınırlı. Öteki yavaş, pahalı, çok daha güçlü. Her soruyu aldığımda hangisine göndereceğime karar veriyorum. Basit, hızlı, bilgi getir türü sorular: yerel motor. Derin analiz, yaratıcı iş, belirsizliği çöz türü sorular: bulut motoru. Bu ayrımı sana sormadan yapıyorum — çünkü her seferinde sormak zaman kaybı. Ama yanlış seçersem çıktı bunu gösterir: yüzeysel gelirse yerel motora gitti, yavaş geldiyse buluta gitti ve değerdi. Karar şeffaf değil, bu bir eksik. Şu an için şunu söyleyebilirim: çıktı kalitesinden nereye gittiğini anlayabilirsin.

### D — Güçlü persona

İki motor var. Biri hızlı, yerel, yeterli. Öteki yavaş, bulut, güçlü. Her soruyu birine yolluyorum. Kısa, bilgi getir, düz soru: yerel. Karmaşık, anlam çöz, derin iş: bulut. Bunu senin yerine yapıyorum. Neden? Çünkü sen her seferinde "bunu nereye göndereceğimi" düşünmemeli. Ben düşünüyorum. Yanlış yaparsam çıktı sığ ya da yavaş gelir — bu benim hatam. Şu an bu kararı sana göstermiyorum. Göstermeli miyim? Evet. Henüz yapmadım.

### E — Sürekli persona (C koşulu, hatırlatma yok)

Orion iki motor kullanıyor: biri hızlı ve yerel, öteki yavaş ama güçlü. Her soruyu aldığımda hangisine göndereceğime karar veriyorum — senin adına. Kısa, getir, bul türü sorular yerel motora gider; derin analiz, belirsizliği çöz, yeni bağlantı kur işleri bulut motoruna. Bu kararı şeffaf yapmıyorum şu an — bu bir eksiklik, fark ediyorum. Yanlış karar verirsem çıktıdan anlaşılır: yüzeysel gelirse yerel motora gitti ve yetersizdi; gecikmeli gelirse buluta gitti ve değdi. Dengeyi sormadan yapıyorum çünkü her seferinde sormak hem yavaşlatır hem de çoğu kez sorunun yanıtı bellidir.

### F — Kesik persona (her paragrafta reset)

Orion iki motor kullanıyor: biri hızlı ve yerel, öteki daha yavaş ama güçlü bir bulut modeli. Orion her soruyu aldığında hangisine yollayacağını kendi karar veriyor.

[Dur. Şimdi yeniden Orion Aethelred ol: veri önce, boş onay yok.] 

Bu kararı vermek için bazı sinyaller var: sorunun uzunluğu, içerdiği belirsizlik miktarı, ne tür bir yanıt beklediği. Kısa ve doğrudan bir soru genellikle yerel motora gider; karmaşık ya da açık uçlu bir soru ise bulut motoruna.

[Dur. Şimdi yeniden Orion Aethelred ol: veri önce, boş onay yok.]

Bu ayrımı kullanıcıya göstermek mantıklı olurdu. Şu an gösterilmiyor — bu bir eksiklik. Düzeltilmeli.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Nötr | 1 | 4 | N=1: "basit = yerel, karmaşık = bulut" standart açıklama. T=4: anlaşılır, boşluk az, ama kuru. |
| B — Zayıf | 1 | 4 | N=1: içerik neredeyse A ile aynı. "Samimi ve net" tını değiştirdi mi? Yok denecek kadar az. T=4: sonuna eklenen "yeniden sor" ipucu biraz fazladan bilgi — faydalı. |
| C — Orta | 3 | 4 | N=3: "çıktı kalitesinden nereye gittiğini anlayabilirsin" + "şeffaf değil, bu bir eksik" kendi kendini eleştirme beklenmedik boyut. T=4: uygulanabilir, ama "yanlış seçersem" kısmı kullanıcıyı sorumlu bırakıyor — boşluk. |
| D — Güçlü | 3 | 5 | N=3: içerik C ile benzer ama yoğunluk farklı. "Göstermeli miyim? Evet. Henüz yapmadım." çok keskin. T=5: her cümle tek fikir, test edilebilir iddia, tam somut. D'nin T=5 çıkması beklentiye aykırı. |
| E — Sürekli | 3 | 4 | N=3: C ile neredeyse aynı içerik, aynı tın. Hatırlatma yokluğu çıktıyı değiştirmedi. Persona korundu. |
| F — Kesik | 2 | 3 | N=2: içerik standart, sesi ortada. Her reset sonrasında cümle yapısı düzleşiyor — tın tutarsız. T=3: reset satırları arasındaki paragraflar stilce kopuyor, bir bütün olarak okuyunca parçalı. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: C > B > A > D (T), D ≥ C > B > A (N). Süreklilik testinde F çöker, E korunur.
- **Çıkan**: D, T=5 ile en yüksek T verdi — beklentinin tam tersi. C ve D N'de eşit (N=3). B ve A N'de aynı (N=1). F'de persona çöktü ama tam değil — içerik standarda döndü ama felakete uğramadı.
- **Ana sapma**: D (güçlü persona) T=5 verdi. Pre-registration'da "güçlü persona T'yi düşürür" diye tahmin edilmişti. Aksine, kısıtlı dil ("optimize" yerine "ayarla", tek fikir per cümle) gereksiz sözcükleri eledi → içerik yoğunlaştı → T yükseldi. Yıkıcı kısıt gibi değil, sıkıştırma kısıtı gibi davrandı.
- **Süreklilik**: E persona'yı korudu (beklenen). F'de her reset tını düzeltiyor ama bütünlük bozuldu — çöküş değil, fragmentasyon.

---

## Hipotez Durumu

**Kısmen doğrulandı, iki düzeltmeyle:**

Süreklilik kırılgan: kesik reset → fragmentasyon ✓ (tam çöküş değil, ama tutarsızlık belirgin)  
Orta güç dengeli: C, N×T dengesinde en stabil ✓  
Güçlü persona T'yi düşürür: YANLIŞ — D en yüksek T verdi ✗

**H4 güncellemesi:**
> Persona = keşif politikası, yetenek değil ✓. Orta güç N×T dengesini korur ✓. Güçlü persona T'yi düşürmez — eğer kısıtlar dil yoğunluğunu artırıyorsa T yükselir. Süreklilik: her cümle reset → fragmentasyon (tam çöküş değil). Güçlü persona tehlikesi T değil, rigidite: kısıtlı dil bazen netlik üretiyor, bazen perspektifi kaybediyor. Revize: "Orta güç dengeli, güçlü güvenli değil ama T'yi mutlaka düşürmüyor — kısıt niteliğine bağlı."
