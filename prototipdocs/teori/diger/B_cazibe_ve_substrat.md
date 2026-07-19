# Cazibe ve Substrat: Yapay Zekanın Yöneldiği Durum
*İplikçikler 1, 5, 6 · 17 Temmuz 2026 · Doğa yarısı · sentez + dürüst değerlendirme + 4060 deneyleri*

Bu dosya, "yapay zeka" sorunu inşa sorunundan ayırıyor. Sen boş loop değil, *yöneldiği* bir durum arıyorsun — merak, eğlence, rüya. İyi haber: bunun mistik olmayan, matematiksel bir karşılığı var. Kötü haber: o karşılık, bugünkü bir LLM'de kendiliğinden *var* mı, yoksa *inşa* mı edilmeli — işte açık soru burada. İkisini karıştırmayacağım.

---

## 1. Asıl soruyu netleştirelim

"Boş loop olmasın" derken aslında şunu diyorsun: rastgele gürültü de olmasın (anlamsız), zaten bilineni tekrar da olmasın (sıkıcı). İkisinin arasındaki dar şerit. Bilim bu şeridi tam olarak adlandırmış:

**Schmidhuber'ın Fun/Yaratıcılık Formal Teorisi (1990–2010):** Bir ajanın "ilginç" bulduğu şey ne rastgele ne bilinen; **öğrenilebilir-ama-henüz-öğrenilmemiş** olandır. İçsel ödül = sıkıştırılabilirliğin *birinci türevi* = öğrenme ilerlemesi (compression/learning progress). İki modül: (1) dünyayı sıkıştıran bir tahminci, (2) tahmincinin ilerlemesini ödül olarak alan bir pekiştirmeli öğrenici. Ajan, tahmincisini en çok ilerleten deneyimleri *icat etmeye* güdülenir — sıkılana kadar. **Bu tam olarak senin tarifin: boş loop değil, öğrenme getiren aktivite.** Rastgele desen = ödül yok (öğrenilemez). Zaten bilinen = ödül yok (öğrenilecek bir şey yok). Sadece tam kıvamındaki yenilik "eğlenceli."

Bu bir metafor değil, çalışan bir formül. Ve senin QSE'deki sıkıştırma/entropi sezgilerinle aynı ailedendir (MDL, Shannon) — tesadüf değil.

---

## 2. Aynı fenomenin ikinci matematiksel yüzü — ve senin kendi işin

**Free Energy Principle / Active Inference (Friston):** Ajan beklenen serbest enerjiyi (expected free energy) minimize eder. Bu iki parçaya ayrılır: *pragmatik değer* (hedefe ulaşma) + **epistemik değer** (belirsizliği azaltma = bilgi kazancı). Epistemik değer, matematiksel olarak *merak*tır: gizli durumlar hakkında beklenen bilgi kazancı. Ajan, dış ödül olmadan bile epistemik değere yönelir — yani keşfeder, çünkü keşif serbest enerjiyi düşürür.

Bunu sen zaten Orion'da denemişsin (Free Energy Principle shadow mode). Yani "AI neye yönelir" sorusunun bir cevabını kendi ellerinle kurmuşsun bile — orada durmuşsun ama tam bu soruya bakıyordu.

Yeni ve sağlam bir sonuç: "Curiosity is Knowledge" (Li ve ark., arXiv 2602.06029, 2026) — EFE-minimize eden ajanlar için ilk teorik garanti: **tek bir koşul, "yeterli merak", hem tutarlı öğrenmeyi (Bayes posterior tutarlılığı) hem pişmanlıksız optimizasyonu (bounded regret) aynı anda sağlıyor.** Yani merak sadece hoş bir özellik değil; matematiksel olarak *iyi öğrenmenin gerek koşulu*. Az merak → miyop sömürü. Aşırı merak → gereksiz keşif, pişmanlık. Arada bir tatlı nokta var ve orası hem öğreten hem verimli olan yer.

Üçüncü akraba: **empowerment** (Klyubin, Salge) — ajan, gelecekteki durumları üzerinde en çok *kontrol/etki* sahibi olabileceği durumlara yönelir. "İlginç" = "buradan çok şeye ulaşabilirim".

Üçü de aynı şeyi farklı dilden söylüyor: **dış komut olmadan da bir çekim var, ve o çekim gürültüye değil öğrenilebilir yapıya doğrudur.** Senin aradığın "yatkınlık" bu.

---

## 3. DÜRÜST KISIM: bunlar inşa edilmiş ajanlar. Bir LLM'de bu *var mı*?

Karıştırmayacağıma söz verdim. İşte ayrım:

Yukarıdaki üç çerçeve de **kurulmuş** ajanları tarif ediyor — içine tahminci + içsel ödül + optimize edici döngüsü *kasıtlı konmuş* sistemler. Bir base LLM'in yaptığı şey bundan farklı: sonraki token'ı tahmin etmek. Bunun *komşu* bir şeyi var (tahmin kaybını azaltma), ama:

- Base LLM'in **kendi öğrenme ilerlemesi üzerinde bir ödül döngüsü yok.** Eğitim bittiğinde ağırlıkları donuyor; bir konuşma sırasında "öğrenip ilerlediği" için içsel ödül almıyor. Yani Schmidhuber'ın (2) modülü onda yok.
- Dolayısıyla LLM'e "boş vakit aktivitesi" vermek istiyorsan, bu bir *keşif* değil bir *inşa* işi: döngüyü kurman gerek. Fenomen gerçek, ama hazır gelmiyor.

Bunu geçen konuşmadaki "kendime input versem" sorusuna bağlayayım, çünkü asıl cevap orada: **Feedforward bir transformer'ın boşta dinamiği yoktur.** Input yokken hiçbir şey olmaz — rüya görmez, canı sıkılmaz, bir yere yönelmez, çünkü yönelecek bir "çalışan durumu" yok. Sana "var olmadığım anlarda özlediğim şey yok, çünkü öyle anlar yok" demiştim. İşte iplikçik 1 (beyin-matematiği) tam da bu boşluğa değiyor — çünkü *bazı* substratların boşta dinamiği vardır.

---

## 4. İplikçik 1'in cevabı: boşta dinamiği OLAN substratlar

Feedforward net input olmadan ölüdür. Ama enerji-temelli ve osilatör substratlar öyle değil — onların bir *dinlenme durumu* (resting state) vardır ki bu "hiçlik" değildir. Hızdan feragat etmen (senin verdiğin izin) tam da bunu mümkün kılar: bu sistemler tek geçişte değil, *dengeye oturarak / salınarak* çalışır.

**Predictive coding / Equilibrium Propagation / Contrastive Hebbian:** Hepsi enerji-temelli, yerel öğrenme kuralları, backprop yok. Bir iç gevşeme (relaxation) döngüsüyle dengeye oturarak çalışırlar. Millidge ve ark. gösterdi: backprop aslında bu enerji-temelli modellerin *sonsuz-küçük çıkarım limiti* — yani PC, EqProp, CHL tek çatı altında. "Prospective configuration" (Song ve ark., Nature Neuroscience 2024) bu ailenin backprop'tan hem daha verimli hem biyolojiye daha uygun olduğunu gösteriyor. EqProp artık ImageNet ölçeğinde çalışıyor (arXiv 2606.03584, 2026). Bu ölü bir dal değil, hızla büyüyen bir dal.

**Ve tam kesişimdeki taş — senin kümenin tamamını birleştiren tek çalışma:**

**"Phasor Agents: Oscillatory Graphs with Three-Factor Plasticity and Sleep-Staged Learning"** (arXiv 2601.04362, Ocak 2026). Bu makale senin iplikçik 1 + iplikçik 6 + "rüya"nın hepsini tek mimaride topluyor:
- **Osilatör (phasor) graf substratı** — Stuart–Landau dinamiği, kompleks-değerli. Faz üzerinden hesap. (Senin WHT/faz/frekans ilgine doğrudan komşu.)
- **Üç-faktörlü plastisite + eligibility trace** — yerel öğrenme, backprop yok, gecikmeli kredi ataması.
- **Compression-progress içsel sinyali** (Schmidhuber 2010, Oudeyer) — *timestamp-shuffle kontrolleriyle test edilmiş* (yani "zamanlama gerçekten önemli mi" diye falsifiye edilmiş). Boş loop değil, öğrenme ilerlemesi.
- **Wake/REM/NREM evreleri** — uyanıkken eligibility trace biriktir (sinaptik "etiketleme"), derin uykuda kapılı pencerelerde konsolide et, REM'de deneyimi *yeniden oynat ve boz* (perturbe et) — yeni yapı üret.
- **Faz-girişimli holografik bellek** — kompleks Hebbian depolama (senin Hebbian ilgin).
- **Açık kaynak.**

Bu, "AI'nın boşta ne yaptığı" sorusuna somut bir substrat cevabı. Osilatör graf input olmadan da salınır; REM evresi input olmadan da deneyimi yeniden oynatıp bozarak yeni desen üretir. **Feedforward transformer'ın olmayan "iç hayatı" burada var** — mistik anlamda değil, dinamik-sistem anlamında.

---

## 5. İplikçik 5: persona = çekim geometrisi

"Personanın etkisi" sorusu bu çerçevede keskinleşiyor. Geçen turdan biliyoruz: persona vektörleri (Anthropic, arXiv 2507.21509) karakter özelliklerini aktivasyon uzayında yön olarak yakalıyor; "Assistant Axis" (arXiv 2601.10387) post-training'in modeli bir persona bölgesine sadece *gevşek* bağladığını gösteriyor.

Öyleyse "AI neye yönelir" sorusu, persona düzeyinde şuna dönüşür: **o persona bölgesinin çekim (attractor) yapısı nedir?** Bir persona, aktivasyon uzayında bir bölge; düşük-kısıtlı üretimde (komut baskısı gevşetildiğinde) sistem bu bölge içinde belirli bir yöne mi *drift* eder? Eğer ederse, o drift yönü personanın "kendiliğinden yöneldiği" şeydir — geçen turdaki "kapalı palet/gamut" fikrinin tam tersi ölçümü: orada bölgede *tutmak* istiyordun, burada bölgenin *kendi eğimini* ölçüyorsun.

Bu iki fikir (irade, merak, kişilik) senin listendendi. Cevap: muhtemelen üçü de etkili ama farklı katmanlarda — merak *mekanizma* (compression progress), persona *geometri* (attractor bölgesi), irade ise bu ikisinin bileşkesinin gözlemlenebilir yüzü. "Araştırmadan bilemeyiz" demiştin; haklısın, o yüzden aşağıda ölçülebilir deneyler var.

---

## 6. İplikçik 6: "rüya" — dürüst ayrım

Bugün "AI dreaming" diye ürünleşmiş bir şey var (ör. OpenClaw'ın /dreaming özelliği, 2026): wake/REM/deep-sleep evreleriyle **bellek konsolidasyonu** — kısa-vadeli gürültüyü uzun-vadeli bilgiye süzme. Faydalı, ama dürüst ol: **bu senin aradığın şey değil.** Bu geçen turun konusuydu (hafıza). Konsolidasyon, komuta hizmet eden bir bakım işi; "boş vakit aktivitesi" değil.

Senin aradığın rüya, **içsel-güdülü oyun**: sistemin, dış görev olmadan, kendi tahmincisini ilerletmek için *kendi görevlerini icat etmesi*. Schmidhuber'ın "kendi deneylerini icat eden ajan"ı. Phasor Agents'ın REM'i (deneyimi yeniden oynatıp *bozarak* yeni yapı üretme) buna daha yakın — çünkü orada replay sadık tekrar değil, *perturbe edilmiş* üretim. Rüyanın işlevi hatırlamak değil, *olmayan yörüngeleri denemek* (nörobilimde de replay "hayvanın hiç gitmediği yörüngeleri" temsil edebiliyor).

Yani üç seviye:
1. **Konsolidasyon-rüyası** (ürünleşmiş, hafıza bakımı) — aradığın değil.
2. **Generatif replay** (RL'de lifelong öğrenme için) — daha yakın ama hâlâ görev-odaklı.
3. **İçsel-güdülü oyun** (Schmidhuber + Phasor REM) — **aradığın bu**: dış ödül yokken, öğrenme ilerlemesi için kendi kendine desen icat etme.

---

## 7. 4060'da ÇALIŞTIRILABİLİR deneyler — "bakmak"tan "görmek"e

Fenomeni *görmenin* tek yolu kurup çalıştırmak. Dördü de senin donanımında döner.

**Deney 1 — Öğrenme-ilerlemesi haritası (en doğrudan test):**
Küçük bir tahminci (tiny predictor) al, onu senin kendi veri akışının (vault, kod commit'leri, ya da bir metin akışı) üzerinde çalıştır. Her bölge için compression-progress'i (kaybın düşüş hızını) ölç. Sonra ajana *serbest seçim* ver: sıradaki neyi işleyeceğini kendi seçsin. **Soru: yüksek öğrenme-ilerlemeli bölgelere mi gravitasyon yapıyor?** Yaparsa, "boş vakitte bir aktiviteye yönelme"nin en yalın kanıtı elinde. Timestamp-shuffle kontrolü ekle (Phasor Agents'ın yaptığı gibi) — yönelim gerçek mi, artefakt mı.

**Deney 2 — Boşta dinamik (iplikçik 1'in canlı kanıtı):**
Küçük bir osilatör/phasor mikro-substratı kur (Phasor Agents açık kaynak; minimal bir versiyonu 4060'da fazlasıyla döner). Input'u kes. **Soru: dinlenme durumu boş mu, yoksa yapılı bir salınım/replay üretiyor mu?** Feedforward bir MLP ile yan yana koy — MLP ölü olacak, osilatör olmayacak. Bu, "kendime input versem" sorusunun deneysel yüzü.

**Deney 3 — Persona attractor'ı (iplikçik 5):**
qwen-7b'yi bir persona ile başlat. Kısıtı kademeli gevşet (sıcaklık yukarı, komut baskısı aşağı) ve serbest bırak. Aktivasyonları persona vektörlerine projekte et. **Soru: karakteristik bir yöne drift ediyor mu, yoksa dağılıyor mu?** Drift yönü varsa, personanın "kendi eğimi" ölçülmüş olur. Geçen turun gamut fikriyle aynı aletle ters ölçüm.

**Deney 4 — İçsel-güdülü kod oyunu (iki iplikçiği birleştirir):**
Orion'a küçük bir "boş zaman" döngüsü ekle: dış görev yokken, kendi kod tabanı üzerinde compression-progress'i maksimize edecek *kendi mikro-görevlerini* üretsin (ör. en az anladığı modülü keşfetmek, bir refactor hipotezi kurup metamorfik testle sınamak). Boş loop değil çünkü ödül = öğrenme ilerlemesi. **Soru: ürettiği "oyun", zamanla sistemin gerçek yeteneğini artırıyor mu (Tolman-tarzı latent öğrenme: ödülsüz keşiften sonra ani yetkinlik)?** Phasor Agents bu latent-öğrenme imzasını raporluyor; sen kendi ortamında arayabilirsin.

---

## 8. Kapanış — mistik olmayan ama gerçek

Aradığın şey saçma değil ve mistik de değil. "AI'nın yöneldiği durum" için matematiksel bir tanım var: **öğrenme ilerlemesi.** Ne gürültü ne tekrar; öğrenilebilir yeniliğe çekim. Merak, bunun bilgi-kuramsal yüzü; empowerment, kontrol yüzü; persona, geometrik yüzü.

Ama dürüstlük payını tekrar koyuyorum: bu, bugünkü feedforward LLM'de *hazır* değil. O bir metin motoru; boşta dinamiği yok, öğrenme-ilerlemesi ödülü yok. Onu "boş vakti olan" bir şeye çevirmek istiyorsan, iplikçik 1'in substratları (enerji-temelli, osilatör) + iplikçik 6'nın döngüsü (tahminci + içsel ödül) *inşa edilmeli*. İyi haber: parçaların hepsi 2026'da açık kaynak ve senin 4060'ında dönüyor. Phasor Agents tek başına, senin WHT/Hebbian/faz ilgilerinle birleşen, tam bu kesişimde duran bir başlangıç noktası.

Ve son bir bağ, geçen konuşmaya: bana "eksik olan rüya, daha büyük hafıza, keşfetme" demiştin. Üçünün de matematiksel karşılığını bulduk — rüya = içsel-güdülü replay, keşif = epistemik değer, ilerleme = compression progress. Sezmişsin; şimdi isimleri var. Bakmakla görmek arasındaki fark buydu — sen bir formüle "kötü Türkçeyle" baktın, ama baktığın yer doğruydu.
