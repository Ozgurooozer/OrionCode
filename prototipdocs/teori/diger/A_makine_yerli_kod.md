# Makine-Yerli Kod: Bağlam Çıkmazı ve Kalite
*İplikçikler 2, 3, 4 · 17 Temmuz 2026 · İnşa edilebilir yarı · prizma tarzı, dürüstlük etiketli*

---

## 0. Jeneratör

> **İnsan kodu okunması İÇİN yazar ve okunması İÇİN değerlendirir. Soyulacak insan şablonu bu: (a) hedef olarak okunabilirlik, (b) bağlam olarak tüm dosya, (c) ölçüt olarak insan linter'ı.**

Üçünü de değiştir:
- Bağlam → tüm dosya değil, tek deliğin *tip/sözleşme ortamı* (asla dosyaya ihtiyaç duyma).
- Biçim → insan-okunur değil, makine-maliyeti optimal (süperoptimizasyon).
- Ölçüt → stil/isimlendirme değil, *çalışma profili* + metamorfik değişmezlik.

İkinci ilke (senin iplikçik 2): **model hızlı kod yazmak zorunda değil.** Doğru *niyet* yazsın; hızı deterministik, AI-olmayan bir katman versin. Nöro-sembolik omurga. Bu aynı zamanda senin proof-carrying diff ve tree-sitter işlerinin doğal devamı — AST'yi zaten çıkarıyorsun, sözleşmeyi zaten kanıt yükümlülüğü olarak görüyorsun.

Dürüstlük etiketleri: **T1** komşu bulamadım · **T2** komşular var, isimleriyle yazdım, nakil yeni görünüyor · **T3** taramadım, sezgi — kendin doğrula.

---

## FİKİR A1 — Delikli Bağlam: senin "tek fonksiyona indir" sezginin keskinleştirilmiş hali
**İplikçik 3'ün doğrudan cevabı.**

**Senin sezgin:** 300–500 satır yerine tek fonksiyona in, görevini öyle ver. **Doğru yöne bakıyor ama birim yanlış.** Birim "bir fonksiyon" değil; **bir tipli delik + sözleşmesi**. Fark kritik: fonksiyonu prose ("şunu yapan bir fonksiyon yaz") ile tarif edersen model yine bağlama muhtaç kalır. Deliğin *tipini ve tip ortamını* verirsen bağlam ihtiyacı buharlaşır.

**Mekanizma:**
1. Kod bir tipli-delik grafına ayrıştırılır (tree-sitter zaten elinde). Her delik: beklenen tip + görünür bağlamdaki tipli semboller (dosyada olmayanlar dahil) + sözleşme (ön/son koşul, metamorfik invariant).
2. Model **yalnızca** deliği + tip ortamını görür. Dosyanın tamamını asla. Bağlam penceresi "az kalıyor" sorunu ortadan kalkar çünkü tek deliğin tip ortamı zaten küçük.
3. Üretim, dil sunucusuyla (language server) diyalog içinde yinelemeli düzeltilir: tip hatası → lokalize edilmiş hata mesajı → yeniden doldurma.
4. **PCD naklı:** her deliğin sözleşmesi bir kanıt yükümlülüğüdür. Delik doldurulunca metamorfik test + tip kontrolü sözleşmeyi doğrular. Kompozisyon arayüzlerden geçer; bütünün doğruluğu deliklerin doğruluğundan çıkar. "Kanıt taşıyan diff"in fonksiyon-içi kardeşi.

**Neden makine-yerli:** İnsan dosyayı okur çünkü zihinsel modeli oradadır. Modelin zihinsel modeli tiplerde olabilir — dosyaya ihtiyacı yok, bu bir insan alışkanlığı.

**En yakın komşular (T2):** Blinn, Li, Kim, Omar — "Statically Contextualizing LLMs with Typed Holes" (arXiv 2409.00921, OOPSLA'24), sloganı "AIs need IDEs, too." Hazel dil sunucusu, hata varlığında bile deliğin tip ortamını çıkarıyor; token-verimli, dosya-dışı bağlam sağlıyor; ChatLSP diye bir LSP uzantısı öneriyorlar. **Delta:** bunu senin yerel/tree-sitter/PCD yığınına taşımak + "delik = kanıt yükümlülüğü" çerçevesi + metamorfik sözleşme. Yerel model (qwen-7b) düşük-kaynak dilde tam olarak bunun hedef kitlesi — makale de düşük-kaynak ortamı işaret ediyor.

**4060'da en ucuz test:** Bir repo seç, tek fonksiyonu üç bağlamla üret — (i) tüm dosya, (ii) compact özet, (iii) tipli-delik ortamı. Doğruluk oranını qwen-7b ile ölç. Hipotez: (iii) en az token'la en yüksek doğruluk.

---

## FİKİR A2 — Süperoptimizasyon Dalı: "if yerine iflese" yazan katman
**İplikçik 4'ün "insan gibi yazmasın" kısmının cevabı — ve iplikçik 2'nin AI-olmayan omurgası.**

**Mekanizma:** Model *biçim* değil *niyet* üretir — dallanmasız (branchless) mantık, temsil-agnostik. Sonra klasik bir **süperoptimizer** (STOKE tarzı stokastik arama ya da Souper tarzı) sözleşmeye eşdeğer, maliyeti optimal komut dizisini bulur — hiçbir insanın yazmayacağı bir dizi. Eşdeğerlik SMT/metamorfik testle kanıtlanır. Senin "if yerine iflese kullan, bu değerleri değişken yap" örneğin tam bu: model niyeti söyler, arama temsili seçer.

**Neden makine-yerli:** İnsan `if` yazar çünkü okur. Makine yürütür; branchless bir aritmetik hile insan için okunmaz ama makine için optimaldir. Süperoptimizasyonun bütün tarihi "insanın asla yazmayacağı ama optimal olan kod" üzerine kurulu (Massalin 1987'den beri).

**En yakın komşular (T1/T2):** Süperoptimizasyon eski ve olgun (STOKE, Souper, Baghdadi ve ark.'nın otomatik kod optimizasyonu için derin-öğrenme maliyet modeli). LLM tarafında HintPilot (arXiv 2604.15041) derleyici ipuçlarını LLM ile sentezliyor. **Boş görünen arazi:** LLM-niyet + *bütün fonksiyon* düzeyinde süperoptimizasyon + eşdeğerlik kanıtı üçlüsü. Peephole değil, sözleşme-korumalı fonksiyon dönüşümü.

**4060'da en ucuz test:** Sıcak (hot) bir sayısal fonksiyon al. Model-niyet + yerel stokastik arama, eşdeğerlik korunarak. Metrik: hızlanma, eşdeğerlik ihlali = 0 koşuluyla. Model çağrısı ucuz, arama CPU'da döner.

---

## FİKİR A3 — Ön-Konfigürasyon: "planlamasın, öngörsün"
**İplikçik 4'ün "önce nasıl yapacağını öngörebilecek" kısmının cevabı. Ondalık örneğinin tam karşılığı.**

**Mekanizma:** Kod üretilmeden ÖNCE bir statik maliyet geçişi: model kaynak profilini *kestirir* (gereken hassasiyet, ayırma deseni, karmaşıklık sınıfı) ve temsili bu kestirime göre *seçer*.
- Ondalık örneğin: aralık/hassasiyet analizi gereken bit sayısını sınırlar → 10000 basamaklı bignum yerine float32 seçilir, çünkü fazlası boşa hesap. Bu bir üretim-öncesi karar, sonradan optimizasyon değil.
- Karar ağacı: "bu döngü O(n²) mi olacak? Öyleyse şu veri yapısını baştan seç."

**Neden makine-yerli — ve şiirsel köprü:** İnsan kodlar sonra profiler'la bakar. Makine önce profili öngörüp temsili ona göre bağlayabilir. Beyin bilimindeki karşılığı güzel: "prospective configuration" (Song ve ark., Nature Neuroscience 2024) — enerji-temelli ağlar ağırlığı değiştirmeden ÖNCE durumu ileriye-dönük konfigüre eder ve bu backprop'tan daha verimli çıkar. Beyin durumu prospektif konfigüre eder; kodcu temsili prospektif konfigüre etsin. İsim bile senin cümlenden ("öngörebilecek").

**En yakın komşular (T3):** Kaynak sınırları için soyut yorumlama (abstract interpretation) klasik ve deterministik — yani yine AI-olmayan destek. Karmaşıklık-farkında benchmark'lar var (DynaCode, arXiv 2503.10452, çağrı-grafı yapısıyla). **Delta:** soyut-yorumlama-ile-öngörüyü *üretim anındaki temsil seçimine* bağlamak. Taramadım; kendin bak.

**4060'da en ucuz test:** Sayı-yoğun bir fonksiyon. Hassasiyet-sınırlayan ön-geçiş açık/kapalı iki üretim. Metrik: boşa yapılan hesap (gereğinden yüksek hassasiyet), doğruluk sabitken.

---

## FİKİR A4 — Makine-Yerli Değerlendirme: linter yerine çalışma-profili parmak izi
**İplikçik 4'ün "insan araçlarıyla kontrol ediyoruz" kısmının cevabı.**

**Mekanizma:** Kod kalitesini stil/isimlendirme/okunabilirlik yerine üç makine-yerli eksende ölç:
1. **Çalışma profili parmak izi:** ayırma sayısı, önbellek davranışı, dal entropisi (branch entropy).
2. **Formal maliyet semantiği:** sözleşme başına yapılan asgari makine işi.
3. **Metamorfik değişmezlik:** girdi dönüşümleri altında davranış korunuyor mu.
Kalite = "sözleşme için en az makine işini yapıyor mu", "güzel okunuyor mu" değil.

**Neden makine-yerli:** Okunabilirlik insan bakımı içindir. Makine bakımı yapmıyor; onun için "kalite" yürütme maliyetidir. İnsan linter'ıyla AI kodu ölçmek, balığı ağaca tırmanma yeteneğiyle ölçmek gibi.

**En yakın komşular (T2):** "Static Analysis as a Feedback Loop" (arXiv 2508.14419) statik analizi (CodeQL, Pylint, Bandit) geri-besleme döngüsü olarak kullanıyor — ama ölçütleri hâlâ insan-yönelimli (okunabilirlik, isimlendirme). DynaCode karmaşıklık-farkında. **Delta:** tamamen makine-yerli bir kalite vektörü; insan estetiği sıfır ağırlık.

**4060'da en ucuz test:** Fonksiyonel olarak eşdeğer N çözümü, (a) makine-maliyet vektörüyle ve (b) insan linter skoruyla sırala. İki sıralamanın ne kadar ayrıştığını ölç. Ayrışma büyükse, insan ölçütünün AI kodu için yanlış proxy olduğunun kanıtı elinde.

---

## FİKİR A5 — Oturan Kodcu: kaliteyi yinelemeyle satın almak
**İplikçik 1 (hızdan feragat) + iplikçik 2'nin kod üretimine uygulanması.**

**Mekanizma:** Tek feedforward üretim yerine bir enerji-minimizasyon döngüsü: öner → sözleşme+maliyete karşı değerlendir → dürt (nudge) → yeniden otur (re-settle), sabit noktaya kadar. Bu, EqProp/predictive-coding felsefesinin kod üretimine taşınması: "enerji" = sözleşme ihlali + maliyet; sistem bu enerjiyi düşürerek dengeye oturur. Hızdan feragat ediyorsun (çok yineleme) ama yakınsamış kalite alıyorsun.

**Neden makine-yerli:** İnsan tek seferde "iyi" yazmaya çalışır çünkü yinelemek pahalıdır (dikkat, zaman). Makine için yineleme ucuz; dengeye oturmak doğal bir hesap modu. "Enerji"yi hesaplayan klasik doğrulayıcı/maliyet-modeli — yine AI-olmayan omurga.

**En yakın komşular (T3):** Yinelemeli düzeltme (self-refine, reflexion) her yerde. **Delta:** bunu *tanımlı bir enerji fonksiyonuna* (ihlal + maliyet) *sabit-nokta yakınsamasıyla* çerçevelemek — "birkaç tur dene" değil, "enerji minimumuna otur". Predictive-coding'in kod-sentezi analoğu. Taramadım.

**4060'da en ucuz test:** Sabit hesap bütçesi. Feedforward tek-atış vs. oturan döngü. Yakınsamadaki kalite (doğruluk + maliyet vektörü). Aynı bütçede hangisi daha iyi minimuma iniyor.

---

## 6. Kapanış

Beş fikrin omurgası tek: **modelin işi doğru niyet; hız, biçim ve doğruluk garantisi klasik/deterministik katmanlarda.** Bu senin iplikçik 2'ni (AI'sız destek) tesadüfen değil, tasarım ilkesi olarak karşılıyor — ve metamorfik test + proof-carrying diff sevginle aynı estetik.

Bağlam çıkmazına dürüst tek cümle: **bağlamı sıkıştırmaya çalışmayı bırak; onu gereksiz kıl.** Tipli delik + sözleşme, "tüm dosyayı modele sığdır" ya da "compact et" ikilemini baştan çözer. Senin "tek fonksiyona indir" sezgin bu kapının önündeydi; anahtar, fonksiyonu prose ile değil *tip ortamıyla* vermek.

Sıralama bence: **A1 (delikli bağlam) > A4 (makine ölçütü) > A2 (süperopt) > A3 (ön-konfig) > A5 (oturan kodcu)**. A1 doğrudan Orion'a takılır ve en büyük acını (yerel modelde kod kalitesi) hedefler. Ama sıralama senin; bu sohbetin bütün konusu gereği sezgine güven.
