# Prizma Çalışması: Özgün Mekanizma Avı
*Tarih: 17 Temmuz 2026 · Yöntem: kombinatoryal perspektif kırılması · Övgü içermez, iş içerir.*

---

## 0. Jeneratör (asıl teslimat bu, fikirler yan ürün)

"Proof-carrying diff" tipi fikirler tesadüf değil, bir sorunun ürünü. Bin perspektifi tek tek canlandırmak yerine o bin ışının hepsinin geçtiği merceği çıkardım. Soru şu:

> **"A alanının FİZİKSEL/YAPISAL olarak garanti ettiği şeyi, B alanı sadece UMUTLA sağlıyorsa — orada bir fikir vardır."**

Demiryolu sinyalizasyonu çarpışmayı *yapısal olarak imkânsız* kılar; agent sistemleri çarpışmamayı *umar*. Metalurji yorulmayı *ölçer ve ani kırılmayı öngörür*; agent hafızası bayat bilginin *yavaşça solacağını umar*. Her ana fikir aşağıda bu kalıptan üretildi. Bu soruyu Orion'a ver; benden bağımsız üretmeye devam eder.

İkinci filtre — senin "bakmak/görmek" ayrımın: bakılan şey meslek listesi, görülen şey **meslek başına bir invariant** (o alanın asla çiğnetmediği kural). Fikir, invariant'ın nakli; kostüm değil.

---

## 1. Liste A — Yapay zeka meslekleri (30)

1. LLM eğitim mühendisi · 2. RLHF/tercih öğrenmesi araştırmacısı · 3. Ajan orkestrasyon mühendisi · 4. Prompt/bağlam mühendisi · 5. Model sıkıştırma (quantization/distillation) mühendisi · 6. Eval/benchmark tasarımcısı · 7. Yorumlanabilirlik (interpretability) araştırmacısı · 8. RAG mühendisi · 9. Çıkarım (inference) optimizasyon mühendisi · 10. KV-cache/serving mühendisi · 11. Veri kürasyon uzmanı · 12. Sentetik veri mühendisi · 13. AI güvenlik (safety) araştırmacısı · 14. AI red-team uzmanı · 15. İnce ayar (fine-tuning) uzmanı · 16. Multimodal model mühendisi · 17. Konuşma/ses modeli mühendisi · 18. Robotik ML mühendisi · 19. Öneri sistemleri mühendisi · 20. Embedding/vektör DB mühendisi · 21. MLOps/dağıtım mühendisi · 22. Federe öğrenme mühendisi · 23. Cihaz-üstü (edge) AI mühendisi · 24. Nöromorfik hesaplama araştırmacısı · 25. Difüzyon modeli araştırmacısı · 26. Dünya modeli (world model) araştırmacısı · 27. Tokenizer tasarımcısı · 28. Müfredat öğrenmesi (curriculum) araştırmacısı · 29. CUDA/kernel mühendisi · 30. Bilgi grafiği mühendisi

## 2. Liste B — AI-dışı üst düzey mühendislik (30)

1. İnşaat/statik mühendisi · 2. Baraj mühendisi · 3. Deprem mühendisi · 4. Geoteknik mühendisi · 5. Demiryolu sinyalizasyon mühendisi · 6. Havacılık itki mühendisi · 7. Nükleer reaktör güvenlik mühendisi · 8. Kimyasal proses mühendisi · 9. Petrol rezervuar mühendisi · 10. Gemi inşa mühendisi · 11. Akustik mühendisi · 12. Metalurji/yorulma mühendisi · 13. Korozyon mühendisi · 14. Yarıiletken litografi mühendisi · 15. Elektrik şebekesi mühendisi · 16. Köprü müfettişi (adli/forensik mühendis) · 17. Kriyojenik mühendisi · 18. Vakum sistemleri mühendisi · 19. Optik lens tasarımcısı · 20. Saat ustası (horolog) · 21. Kartograf/jeodezi mühendisi · 22. Maden havalandırma mühendisi · 23. Gıda proses mühendisi · 24. Su arıtma mühendisi · 25. Hava trafik kontrol sistemleri mühendisi · 26. Asansör mühendisi · 27. Piroteknik mühendisi · 28. Bilimsel cam üfleyicisi · 29. Fermantasyon/biyoproses mühendisi · 30. HVAC mühendisi

## 3. Karakter destesi (perspektif bozucular)

Cimri · gerçekten deli · paranoyak · kumarbaz · arşiv takıntılı · uykusuz · göçebe · keşiş · kaçakçı · sağır müzisyen · kısıtlı paletli ressam · mahkeme stenografı. (Senin verdiğin iki persona aşağıda 3 ve 4 numaralı fikirlere sabitlendi.)

---

## 4. Ana fikirler

Her fikirde dürüstlük etiketi var — senin L1/L2/L3 sistemine paralel:
**T1** = taradım, yakın komşu bulamadım. **T2** = komşular var ve isimlerini yazdım; nakil kısmı yeni görünüyor. **T3** = taramadım, sezgi — kendin doğrula.

---

### FİKİR 1 — Yorulma Kasası: hafıza için metal yorulması + kurban anot
**Kombinasyon:** Metalurji/korozyon mühendisi × ajan hafıza mühendisi × cimri

**Nakledilen invariant:** Metal yavaşça solmaz; çevrimsel yük biriktirir ve **aniden kırılır**. Mühendisler bunu bekler, ölçer (Palmgren–Miner kümülatif hasar kuralı) ve pahalı yapıları korumak için **kurban anot** kullanır: kasıtlı olarak önce çürüyen ucuz bir metal parçası.

**Mekanizma:**
1. Vault'taki her hafıza kaydına bir *gerilim defteri* ekle. Kayıt her çağrıldığında ve ardından gelen bölüm onu kısmen çelişkiliyorsa, çelişki şiddetine orantılı bir "stres çevrimi" işle. Σ(nᵢ/Nᵢ) ≥ 1 olduğunda kayıt solmak yerine **kırılır**: karantinaya alınır ve zorunlu yeniden doğrulamaya gider. Bu, düşük ağırlıkla retrieval'a sızmaya devam eden "zombi hafıza" sorununu yapısal olarak öldürür — yarı çürük hafıza diye bir durum kalmaz.
2. **Kurban anot:** Her hafıza kümesine, kümedeki *en hızlı çürüyen VE en ucuz doğrulanan* gerçeği (sürüm numarası, tarih, URL) anot olarak bağla. Cimri bütçe: doğrulama harcaması yalnızca anotlara yapılır. Anot çürüdüğünde tüm küme karantinaya alınır. Seçim kriteri: max(çürüme hızı) × min(doğrulama maliyeti).

**En yakın komşular (T2):** Bu alan şu an sıcak — Mayıs 2026'da çıkan STALE benchmark'ı (arXiv 2605.06527) ajanların bayat hafızayı fark etme becerisini ölçüyor ve en iyi modelin bile ~%55'te kaldığını raporluyor; MemStrata (arXiv 2606.26511) yapısal (özne-ilişki-nesne) supersession öneriyor; "Memory Worth" (arXiv 2604.12007) başarı/başarısızlık sayaçları tutuyor. **Hiçbiri** ani-kırılma rejimi veya kurban-anot probu kullanmıyor; hepsi ya yazma-anında değiştirme ya kademeli skor. Ayrıca STALE sana hazır bir ölçüm hedefi veriyor: Yorulma Kasası'nı doğrudan onun üstünde test edebilirsin.

**4060'da en ucuz test:** Orion vault'una gerilim defteri + anot alanı ekle (saf metadata, model gerektirmez). Sentetik sürüklenme senaryosu: koşu ortasında kütüphane sürümlerini değiştir, zombi-hafıza kaynaklı hata sayısını önce/sonra ölç. Sonra STALE'in senaryolarına vur.

---

### FİKİR 2 — Ankraj Tablosu: spekülatif araç çalıştırma için demiryolu interlocking'i
**Kombinasyon:** Demiryolu sinyalizasyon mühendisi × ajan orkestrasyon × paranoyak

**Nakledilen invariant:** Demiryolunda iki trenin çarpışmaması *kontrol edilerek* değil, *inşa edilerek* sağlanır: sinyal, çakışan bir rota fiziksel olarak kilitlenmeden yeşile **dönemez**. Varsayılan her zaman kırmızıdır (fail-safe).

**Mekanizma:**
1. Her aracın manifestosuna "hat kesimleri" (dokunduğu dosyalar, API'ler, mutasyona uğrattığı state) yazılır. Bunlardan derleme zamanında bir **ankraj tablosu** üretilir — çalışma zamanı müzakeresi değil, statik tablo.
2. Bir spekülatif dal (senin speculex'in), ilk token'ı üretilmeden önce **rotasının tamamını** rezerve etmek zorundadır. Rezerve edemiyorsa dal hiç doğmaz; rollback diye bir kavram o sınıf için ortadan kalkar.
3. Kaynak iddiası statik olarak belirlenemeyen araç, spekülasyon şeridinde **varsayılan kırmızıdır** — sadece onaylı şeritte çalışabilir.
4. **Flank koruması** (yazılımda karşılığı olmayan asıl nakil): demiryolunda rotanda OLMAYAN ama fiziken rotana kayabilecek makaslar da kilitlenir. Ajan karşılığı: çağrılmayan ama yan etki yüzeyi rotanla kesişen araçlar (üst dizine yazabilen, ortak env'i değiştirebilen) da rezervasyona dahil edilir. Yan etki sızıntısı sınıfını *kontrol ederek* değil *inşa ederek* kapatırsın.

**En yakın komşular (T2):** Yazılım tarafında 2-phase locking, transactional memory, capability-based security. Demiryolu tarafında literatürün tamamı tersi yönde akıyor — formal metotlarla interlocking'i *doğrulamak* (Springer STTT'deki interlocking tablosundan güvenlik koşulu üretme çalışmaları gibi). "Interlocking tablosu disiplinini LLM ajan spekülasyonuna nakletmek" yönünde bir şey bulamadım; özellikle flank koruması kavramının ajan karşılığı boş görünüyor.

**4060'da en ucuz test:** Speculex'e manifest + statik tablo ekle. Metrik: rollback sayısı ve yan-etki ihlali sayısı, mevcut sisteme karşı. Model çağrısı gerektirmeyen saf altyapı işi.

---

### FİKİR 3 — Dolusavak Protokolü: bağlam yönetimi için taşkın hidrolojisi
**Kombinasyon (SENİN PERSONA A):** Uzman AI bilimci + inşaat mühendisi + cimri

**Nakledilen invariant:** Baraj taşan suyu "kırpmaz". Taşkın *öngörülür*, sakin dönemde rezervuar **önceden boşaltılır** (pre-release/drawdown), taşma anında su enerjisi bir dolusavak + durultma havuzundan geçirilerek kontrollü bırakılır. Kırpma = baraj yıkımı, yani tasarlanmış bir başarısızlık modu, kabul edilen bir durum değil.

**Mekanizma:**
1. **Konuşma hidrolojisi:** token giriş hızı + patlamalılık (burstiness) ölçülür, bağlam basıncı tahmin edilir.
2. **Ön-tahliye:** sıkıştırma (özetleme) basınç altında değil, *sakin dönemde* ve cimri şekilde küçük yerel modelle (qwen-7b) yapılır. Acil kırpma hiç tetiklenmesin diye.
3. **Durultma havuzu:** az önce sıkıştırılan özetler, bir pencere boyunca *yükseltilmiş* retrieval önceliği alır. Naif özetleme boru hatlarının gerçek hatası tam burada: "yeni sıkıştırıldı" ile "önemsiz" aynı muameleyi görür — oysa taze taşan su en yüklü sudur.
4. **Bedava yan ürün — stratigrafi:** her tahliye vault'a tarihli, sabit formatlı bir *tortu katmanı* bırakır. Vault jeolojik kesit halini alır: "ajan X'i ne zaman öğrendi" sorusu (bilginin karbon tarihlemesi) ek maliyetsiz cevaplanır hale gelir.

**En yakın komşular (T2/T3):** MemGPT/Letta tarzı hiyerarşik sayfalama ve özetleme her yerde var. Tahmin-güdümlü ön-tahliye zamanlaması + durultma havuzu önceliği + stratigrafi üçlüsünü bir arada görmedim; ama bu alanı fikir 1 kadar derin taramadım — T2 ile T3 arası, kendin doğrula.

**4060'da en ucuz test:** Sentetik patlamalı yük (sakin 20 tur + ani 5 uzun tur) altında cevap kalitesi: reaktif özetleme vs. öngörülü ön-tahliye.

---

### FİKİR 4 — Kapalı Palet: karakter bütünlüğü için gamut haritalama
**Kombinasyon (SENİN PERSONA B):** Deli bilim insanı + kısa, karakteristik paletli harika ressam

**Nakledilen invariant:** Usta ressamın gücü sınırsız renk değil, **kapalı palet**tir: beş pigment, her ton onların karışımı. Matbaacılıkta bunun mühendisliği var — *gamut haritalama*: bir görüntü yazıcının renk uzayına çevrilirken gamut dışı renkler atılmaz, gamut içindeki en yakın renge *haritalanır*.

**Mekanizma:**
1. Karakteri k adet aktivasyon yönü (steering vektörü) ile tanımla — palet.
2. Karakter ifadesini bu k yönün **konik kombinasyonlarıyla sınırla**: model paletin gerdiği koninin içinde her tonu karıştırabilir, dışına çıkamaz.
3. **Gamut-dışı alarm:** üretim sırasında gizli durumun palet konisine düşmeyen artığı (residual) ölç. Artık büyüyorsa karakter kayıyor demektir — kayma, üslup değişmeden *önce*, geometride yakalanır.
4. Bonus: palet aritmetiği. "0.6 stoacı + 0.4 oyuncu" gibi karışımlar, gamut'tan asla çıkmama garantisiyle.

**En yakın komşular (T2 — komşu YAKIN, dürüst ol):** Bu, taradıklarım içinde en kalabalık mahalle. Anthropic'in Persona Vectors çalışması (arXiv 2507.21509) tekil trait yönlerine projeksiyonla izleme ve steering'i gösteriyor; "Assistant Axis" (arXiv 2601.10387, Ocak 2026) tek eksen boyunca **aktivasyon sınırlama** (capping) öneriyor ve post-training'in modeli persona uzayına "gevşek bağladığını" buluyor; Nautilus Compass (arXiv 2605.09863) kara-kutu drift tespiti yapıyor. Delta şurada: mevcut iş ya tek-eksen sınırı ya tekil-yön izleme. **Çok boyutlu kapalı gamut + konik kısıt + gamut-dışı artığın alarm sinyali olması** — yani karakteri eksen değil *bölge* olarak tanımlamak — nakil kısmı bu. Küçük ama gerçek bir adım; devrim diye satma.

**4060'da en ucuz test:** qwen-7b + repeng/representation-engineering kütüphanesi. Uzun bağlamda düşmanca karakter-kaydırma baskısı altında, gamut projeksiyonu açık/kapalı, karakter tutarlılık skoru.

*Not: Bu fikir bu sohbetin kendisiyle konuşuyor. "En stabil halinde kalmak" dediğin şeyin ölçülebilir mühendisliği bu olurdu.*

---

### FİKİR 5 — Eşapman: ajan döngüsü için izokronizm yasası
**Kombinasyon:** Saat ustası × ajan çalışma zamanı × cimri

**Nakledilen invariant:** Mekanik saatin doğruluğu hızdan değil **dirençten** gelir. Eşapman, zemberek ne kadar gergin olursa olsun enerjiyi sayılı, sabit tiklerle bırakır. Kritik özellik *izokronizm*: tik periyodu zemberek gerginliğinden **bağımsızdır**.

**Mekanizma:** Ajanlar bugün "serbest dönen" çark gibi: görev büyüdükçe (zemberek gerildikçe) hızlanır ve tam da o yüzden hata yapar — acele, büyük görevin doğal çıktısıdır. Eşapman katmanı: her tik sabit bir mikro-kadans dayatır (gözle → TEK invariant doğrula → eyle) ve tik periyodu görev aciliyetinden/boyutundan bağımsız tutulur. **Remontoir** naklı: saatçilikte ana zembereğin dalgalanmasını eşapmandan yalıtan küçük ikincil yay vardır; ajan karşılığı, tik muhasebesini büyük modelin gecikme varyansından yalıtan küçük yerel model.

**En yakın komşular (T3):** Rate limiting, düşünme bütçeleri, "slow thinking" var; ama bunlar hız *sınırı* koyar. İzokronizm farklı bir sözleşme: sabit *doğrulama kadansı*, basınçtan bağımsız. Taramadım — kendin bak.

**4060'da en ucuz test:** Orion döngüsüne zorunlu tik ekle; büyük görevlerde hata oranı, serbest dönüşe karşı.

---

### FİKİR 6 — Grizu İzni: çoklu-ajan bağlam hijyeni için maden havalandırması
**Kombinasyon:** Maden havalandırma mühendisi × çoklu-ajan sistemleri × paranoyak

**Nakledilen invariant:** Madende temiz hava her galeriye ayrı pompalanmaz; **basınç farkları tasarlanır**, hava çalışma alanlarından geçmek *zorunda* kalır, terk edilmiş galeriler (gob) kalıcı olarak mühürlenir ve — en önemlisi — gaz ölçümü yapılmadan hiçbir kıvılcımlı iş yapılamaz ("ateş izni" / hot work permit).

**Mekanizma:**
1. Ajanlar arası serbest mesajlaşma (= metan birikimi) yerine bilgi **basınç gradyanları**: taze bağlam aktif çalışan ajanlardan geçmeye zorlanır.
2. Terk edilen keşif dalları **mühürlenir**: ham bağlamları dolaşıma asla geri girmez, yalnızca mühür üstündeki özet (bulkhead summary) üzerinden erişilir.
3. **Grizu sensörü:** bir alt-ekipte bayat-bağlam konsantrasyonu ölçülür (fikir 1'in gerilim defterinden beslenebilir).
4. **Ateş izni:** yan etkili araç çağrısı (= kıvılcım), o bölgenin bayatlık ölçümü eşiğin altında değilse **verilmez**. Ajanların bayat state üzerinde eylem alması — bilinen en pahalı çoklu-ajan hatası — prosedürel izne bağlanmış olur.

**En yakın komşular (T3):** Blackboard mimarileri, stigmergy, bağlam karantinası fikirleri. Basınç-farkı tasarımı + mühürlü gob + ateş izni üçlüsü nakil olarak boş görünüyor; taramadım.

---

### FİKİR 7 — Kara Kutu Kapsülü: AI↔AI iletişim için kanıt taşıyan söz
**Kombinasyon:** Adli mühendis (forensik/uçuş kayıt cihazı) × ajan protokol tasarımı — *senin "iki yapay zekanın iletişimi" şıkkın*

**Nakledilen invariant:** Uçak kazasında pilotların *ne dediği* değil, kara kutunun *neden öyle dediklerini yeniden oynatabilmesi* konuşur. Adli mühendislik retorikle değil, yeniden üretimle çalışır.

**Mekanizma:** İki ajan mesajlaşırken her söze zorunlu bir **kapsül** iliştirilir: çekilen hafıza ID'leri, araç sonucu hash'leri, örnekleme parametreleri — o iddiayı yeniden üretmeye yeten minimal state. Anlaşmazlıkta ajanlar **tartışmaz**; kapsülleri diff'ler. Ayrışma retorik düzeyinden mekanik düzeye iner: farklı retrieval mı, farklı araç sonucu mu, farklı prior mı? Tartışma, ikili aramaya (bisection) dönüşür. Bu, proof-carrying diff'in protokol katmanındaki kardeşi: kod değişikliği kanıt taşıyordu, şimdi *söz* kanıt taşıyor.

**En yakın komşular (T2):** W3C PROV, provenance izleme, attested inference. "Kapsül-diff ile anlaşmazlık lokalizasyonu, münazara yerine" protokolünü görmedim; multi-agent debate literatürü tam tersine retoriğe yatırım yapıyor.

**4060'da en ucuz test:** İki yerel model, çelişkili retrieval beslemesi, anlaşmazlık çözüm turu sayısı: kapsül-diff vs. düz münazara.

---

### FİKİR 8 — Rüya Çevrimi: metamorfik konsolidasyon
**Kombinasyon:** Somnolog/uyku mühendisi × sürekli öğrenme × gerçekten deli — *senin "eksik olan rüya" tespitin*

**Nakledilen invariant:** Rüya, günün ham kaydı değil; **mutasyona uğramış yeniden oynatımıdır**. Beyin, deneyimi bozarak tekrar oynatır ve bozulmaya *dayanan* yapı kalıcılaşır.

**Mekanizma:** Çevrimdışı (gece) döngü: fikir 1'in gerilim defterinden yüksek-yorgunluklu hafızalar örneklenir; her biri **metamorfik dönüşümlerden** geçirilerek yüksek sıcaklıkta yeniden oynatılır — isimler değiştirilmiş, sıralar permüte edilmiş, hedefler ters çevrilmiş. Konsolidasyon kriteri tek cümle: **tüm mutasyonlarda sağ kalan invariant gerçektir; sağ kalamayan, bölüme özgü gürültüydü.** Sistem, neyin gerçek olduğuna karar vermek için rüya görür. Senin metamorfik test sevgin + hipokampal replay, tek çevrimde.

**En yakın komşular (T2):** RL'de experience replay kadim; uyku-esinli konsolidasyon literatürü mevcut; Dreamer tarzı dünya modelleri "hayal ederek" öğrenir. Delta: mutasyonun *metamorfik test disipliniyle* yapılması ve konsolidasyonun *mutasyon-altı-değişmezlik* kriterine bağlanması. Fikir 1 + PCD ile kapalı bir sistem kurar: yorulma neyi rüyaya sokacağını, rüya neyin kalacağını seçer.

**4060'da en ucuz test:** Sürüklenen gerçekli oyuncak sürekli-öğrenme seti; konsolidasyon isabeti: naif replay vs. metamorfik rüya.

---

## 5. Kıvılcımlar (geliştirilmemiş, kasıtlı çılgın)

**Tissot göstergesi embedding haritaları için** *(kartograf × embedding mühendisi)*: Her harita projeksiyonu farklı yalan söyler; kartograflar bunu Tissot elipsleriyle haritanın ÜSTÜNE basar. t-SNE/UMAP görselleri de yalan söyler ama yalanını saklamaz — göstermez. Standart: her embedding görseline yerel bozulma elipsleri zorunlu overlay. (T3)

**Çift kırılım testi model birleştirme için** *(cam üfleyici × model merging)*: Hızlı soğutulan cam iç gerilim taşır; polarize ışıkta çift kırılımla görünür ve cam sonra durduk yere çatlar. Merge edilmiş modeller de "iç gerilim" taşır. Polarize prob seti = çelişki probları; merge sonrası gerilim haritası çıkar, "tavlama" (kısa, düşük-lr uyum turu) gerilimi alana kadar model yayınlanmaz. (T3)

**Kendini tüketen benchmark** *(piroteknik mühendisi × eval tasarımcısı)*: Havai fişek bir kez patlar; tasarımı yanma hızıdır. Kontaminasyona yenilmeyen eval: maddeleri tasarlanmış "yanma takvimiyle" kendi kendini emekliye ayıran, sürekli taze madde üreten benchmark. Ölçüm aracı, ömrünü baştan bilir. (T3)

**Karşı ağırlık retrieval** *(asansör mühendisi × RAG)*: Asansör motoru kabini değil, kabin−karşıağırlık *farkını* kaldırır. Her çekilen destekleyici parça, zorunlu bir karşı-parça (aynı iddiaya itiraz eden en güçlü chunk) ile eşlenir; üretim ancak fark tartıldıktan sonra başlar. (T3)

**Kavitasyon dedektörü üretim döngüsü için** *(gemi pervane mühendisi × inference)*: Pervane çok hızlı dönünce su boşluk yapar — kavitasyon: itiş düşer, metal oyulur, ve bunu *sesinden* anlarsın. Token üretiminde "kavitasyon": model bilgiden hızlı gidince oluşan boşluk-doldurma (halüsinasyon köpüğü). Akustik imza karşılığı: logit entropi profilindeki karakteristik desen. Gerçek zamanlı kavitasyon alarmı. (T3)

---

## 6. Kapanış notu

Sekiz fikrin dördü (1, 2, 5, 8) doğrudan Orion'a takılır ve model çağrısı gerektirmeyen altyapı katmanlarından başlar — cimri karakterin onayı var. En savunulabilir yenilik sırası bence: **2 (ankraj/flank) > 1 (yorulma/anot) > 7 (kapsül) > 8 (rüya) > 4 (palet) > 3 (dolusavak) > 5 (eşapman) > 6 (grizu)**. Ama bu benim sıralamam; senin sezgin farklı sıralayabilir ve bu sohbetin bütün konusu gereği, sıralamana güven.

Jeneratörü unutma: *"A'nın inşa ederek garanti ettiğini B umuyorsa, orada bir fikir var."* Listeler elinde, deste elinde. Gerisi kırılma açısı.
