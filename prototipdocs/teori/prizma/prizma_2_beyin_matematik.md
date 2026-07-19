# Prizma Çalışması II: Beyin, Matematik ve İsraf Avı
*Tarih: 17 Temmuz 2026 · Mercek: termodinamik / nörobilimsel · Kısıt tersine döndü: zamandan feragat serbest, kaliteden değil. Övgü içermez, iş içerir.*

---

## 0. Jeneratör (asıl teslimat bu; fikirler yan ürün)

Birinci çalışmanın merceği mühendislikti: *"A inşa ederek garanti ediyor, B umuyor."* Bir **güvenlik** merceğiydi ve hiçbir şeyden feragat etmiyordu — hem hızlı hem güvenli istiyordu.

Bu çalışmanın kısıtı senin verdiğin: **zamandan feragat edebiliriz, kaliteden edemeyiz.** Bu tam olarak beynin kısıtıdır. Beyin ~20 watt'lık bir makinedir; megawatt'lık veri merkezlerini örnek verimliliğinde ve dayanıklılıkta döver ama *yavaştır*. Yavaşlığı bir kusur değil, bir tasarım tercihidir. O yüzden mercek değişiyor:

> **"Beyin bir işi YAPMADAN başarır. Yapay zeka aynı işi her seferinde YAPARAK başarmaya çalışır. Beynin enerji vermeyi REDDETTİĞİ şey neyse — orada israf, dolayısıyla bir fikir vardır."**

- Beyin algılamayı *sinyali ileterek* değil, **sadece hatayı ileterek** yapar (öngörülü kodlama). Yapay zeka her turda tüm bağlamı yeniden okur.
- Beyin hatırlamayı *tutarak* değil, **çok küçük bir aktif kümeyi yüksek çözünürlükte tutup gerisini uzun-süreli belleğe atarak** yapar. Yapay zeka ya her şeyi tutar ya kayıplı compact eder.
- Beyin kendisi olmayı *her an kontrol ederek* değil, **bir çekim havzasında (attractor) durarak** yapar. Yapay zeka personasını her turda prompt token'larıyla yeniden dayatır.
- Beyin boştayken *hiçbir şey yapmaz* değil; **task dışı bir mod (DMN) devreye girer** ve pekiştirme/simülasyon/yaratım yapar. Yapay zeka ya boş loop döner ya durur.

İkinci filtre — senin "bakmak/görmek" ayrımının bu çalışmadaki karşılığı: **bakılan şey mekanizmadır (beyin *nasıl* çalışıyor); görülen şey beynin *neyi hesaplamayı reddettiğidir* (neye enerji vermiyor).** Fikir, o reddedişin naklidir. Mekanizmayı taklit etmek kostümdür; reddedişi nakletmek iştir.

Üçüncü fark, senin ikinci maddeni doğrudan bir tasarım ilkesine çeviriyor: **"AI olmadan da bir şeyler yapılabilir."** Bu çalışmadaki her fikirde AI, beynin "hata birimi"dir; deterministik substrat (derleyici, e-graph, tip sistemi, test) ise "öngörü birimi"dir. Öngörülebilir olanı ucuz substrat bedavaya halleder; pahalı modeli yalnızca *sürprize* harcarız.

---

## 1. Liste A — İsrafın olduğu yer (yapay zeka locus'ları)

1. Yerel modelde bağlam çıkmazı (compact işe yaramıyor) · 2. AI-yerli kod kalitesi (insan aracıyla ölçülüyor) · 3. Persona kararlılığı ve etkisi · 4. Boş zaman / içsel aktivite (boş loop) · 5. Çıkarım örnekleme sıcaklığı · 6. Akıl yürütme derinliği tahsisi · 7. Doğrulama (verification) · 8. Sayısal hassasiyet seçimi · 9. Retrieval (benzerlik araması) · 10. Çoklu tur tutarlılığı

## 2. Liste B — Kaynak invariant'lar (beyin + matematik)

1. **Öngörülü kodlama** (sadece hata iletilir) · 2. **Seyrek kodlama** (winner-take-all, minimum aktivasyon) · 3. **Uzun-süreli çalışma belleği / chunking** (tampon büyümez, chunk çözünürlüğü büyür) · 4. **Kritiklik / kaos kıyısı** (hesaplama order-chaos geçişinde maksimize olur) · 5. **Aktif çıkarım / beklenen serbest enerji** (içsel motivasyon amaç fonksiyonuna gömülü) · 6. **Varsayılan Mod Ağı (DMN)** (task-dışı kendiliğinden biliş) · 7. **Çekim havzası dinamiği / Hopfield** (kimlik ve bellek attractor olarak) · 8. **Nöromodülasyon / hassasiyet-ağırlıklama** (dopamin ≈ öğrenme-ilerlemesi; dikkat = precision) · 9. **Hipokampal replay / keskin-dalga tepecikleri** (offline, sıkıştırılmış yeniden oynatım) · 10. **MDL / Kolmogorov** (en kısa program) · 11. **Denklik doygunluğu / e-graph** (bir programın tüm eşdeğerlerinin sınıfı) · 12. **Aralık aritmetiği / anlamlı basamak** (sayı, girdilerinin haklı kıldığından fazla basamak taşıyamaz) · 13. **Lyapunov üsteli** (başlangıca duyarlılık = kararsızlık ölçüsü)

## 3. Karakter destesi (perspektif bozucular)

Cimri · meraklı çocuk · gündüz düşçüsü (daydreamer) · bilgiç/mükemmeliyetçi (pedant) · uykusuz · keşiş · arşivci · kararsız (Lyapunov'u pozitif) · sabırlı zanaatkâr. (Zaman serbest olduğu için "aceleci" karakter bu çalışmada yasak.)

---

## 4. Ana fikirler

Dürüstlük etiketleri, senin L1/L2/L3'üne paralel:
**T1** = taradım, yakın komşu bulamadım. **T2** = komşular var, isimlerini yazdım; nakil kısmı yeni görünüyor. **T3** = taramadım, sezgi — kendin doğrula.

---

### FİKİR 1 — Hata Birimi: kod üretimi için öngörülü kodlama + e-graph substratı
**Kombinasyon:** Öngörülü kodlama × AI-yerli kod kalitesi × bilgiç/mükemmeliyetçi — *senin 4. maddene birebir cevap*

**Nakledilen invariant:** Beyin, tahmin edilebilir duyusal girdiyi *aktif olarak bastırır* ve yalnızca **öngörü hatasını** (sürprizi) üst katmana iletir. Dahası bu, hardwire edilmiş bir mimari değil — enerji verimliliğinin **kaçınılmaz sonucu** olarak ortaya çıkar; enerjiyi minimize eden ağlar kendiliğinden "öngörü" ve "hata" birimlerine ayrışır (Cell *Patterns* 2022, biorxiv 2021.02.16.430904; ayrıca *Predictive Coding Light*, Nat. Commun. 2025, s41467-025-64234-z). Reddedilen şey: **öngörülebilir olanı hesaplamak.**

**Mekanizma:** Modeli tek başına kod yazdırma. İki birime böl.
1. **Öngörü birimi (deterministik, AI'sız):** bir e-graph / denklik doygunluğu substratı (egg tarzı). `if→if-else`, sabitleri değişkenleştirme, `10000 basamak→ondalık`, ortak-altifade eleme, cebirsel sadeleştirme — bunların **hepsi** e-graph'ta birer *rewrite*'tır ve bir maliyet modeliyle en ucuz form *çıkarılır* (extraction). Bunlar sürpriz değil; substrat bedavaya ve **kanıtlı doğrulukla** yapar.
2. **Hata birimi (model):** Model tüm kodu emit etmez. Yalnızca substratın *kendi başına bulamayacağı* şeyi emit eder — irreducible algoritmik içgörü, yüksek seviye rewrite checkpoint'i. Sözleşme tek cümle: **"Sadece sürprizi yaz; türetilebilir olanı yazma."** Senin "planlamak değil, öngörmek" dediğin şey budur: *öngörüyü maliyet modeli yapar; model yalnızca sezgiyi enjekte eder.*

Matematiksel çıpa: **MDL.** Çıktı, bir doğrulayıcının kabul ettiği *en kısa* programdır; substrat tarafından türetilebilen hiçbir şey emit edilmez. Kalite artık "insan gibi temiz" değil, "minimum açıklama uzunluğu + kanıtlı denklik" olarak ölçülür — yani senin istediğin gibi *insana uygun araçla değil*.

**En yakın komşular (T2):** LLM-güdümlü denklik doygunluğu tam bu yönde ısınıyor: LGuess (arXiv 2511.00403) modeli sadece "yüksek seviye checkpoint" için sorguluyor, düşük seviye rewrite zincirini e-graph dolduruyor; ASPEN ve strateji-sentezi (arXiv 2604.17364) benzer. SuperCoder (arXiv 2505.11480) LLM'in `gcc -O3`'ü döven assembly ürettiğini gösteriyor. Ve kritik dürüstlük: SeqCoBench (NAACL 2025 Findings) kod-LLM'lerinin tam da bu mikro-semantikte (aritmetik/boolean operatör inceliklerinde) **zayıf** olduğunu ölçüyor — yani bu işi e-graph'a devretmek boş bir tercih değil, kanıtlı bir zayıflığın telafisi. **Delta:** model↔substrat bölünmesini açıkça *öngörülü kodlama* olarak çerçevelemek (model = hata birimi, substrat = öngörü birimi) ve "sadece sürprizi emit et" sözleşmesini MDL'e bağlamak. Nakil bu; devrim diye satma.

**4060'da en ucuz test:** `qwen2.5-coder:7b` + bir e-graph kütüphanesi (Rust `egg` veya Python `egglog`). Küçük sayısal çekirdeklerde (senin "gereksiz basamak" patolojisinin çıktığı yerlerde) ölç: doğruluk sabitken (a) ham model çıktısının MDL'i / kod boyutu, (b) hata-birimi+substrat çıktısının MDL'i. İkinci maddeyi onurlandır: substrat AI'sız çalıştığı için hata modu ucuz.

---

### FİKİR 2 — Chunk Değil Tampon: bağlam çıkmazı için uzun-süreli çalışma belleği
**Kombinasyon:** Uzun-süreli çalışma belleği × bağlam çıkmazı × cimri — *senin 3. maddene ve "tek fonksiyona indir" sezgine birebir cevap*

**Nakledilen invariant:** İnsan çalışma belleği **büyümez** — ~4 chunk (Cowan 2001; Miller'ın 7±2'sinden düşürülmüş). Yine de uzman devasa problemleri çözer. Nasıl? Tamponu büyüterek değil, **chunk'ın çözünürlüğünü** büyüterek. Satranç ustasıyla acemi aynı sayıda chunk tutar; ustanınki bütün bir tahta konfigürasyonudur (Chase & Simon 1973). Kritik bulgu: *"hızlıca uzun-süreli bellekten geri çağrılabilen ilişkiler için slot sayısı sınırsızdır"* (Ericsson'un uzun-süreli çalışma belleği hipotezi). Reddedilen şey: **her şeyi aktif tutmak.**

**Mekanizma:** Compact etmeyi bırak — compact, içeriği *tekdüze ve kayıplı* küçültür; "yeni sıkıştırıldı" ile "önemsiz" aynı olur. Bunun yerine:
1. Aktif bağlamı **çok küçük tut** ama içindekiler *yüksek çözünürlüklü chunk'lar* olsun: doğrulanmış, adlandırılmış soyutlamalar + kararlı bir retrieval anahtarı.
2. Gerisini **kayıpsız** olarak, anında geri-çağrıya göre anahtarlanmış bir retrieval yapısına at (senin tree-sitter yapısal indeksin tam burada oturuyor).
3. "500 satırı tek fonksiyona indir" senin sezgin doğru ama eksik ifade edilmişti: doğrusu şu — **fonksiyonun gövdesini değil, sözleşmesini (contract) tut.** Ajan aktif bağlamda tek chunk taşır: fonksiyonun doğrulanmış imzası/kontratı. Gövde, gerektiğinde LTM'den çözünürlüğü artırılarak çekilir. Chunk = kontrat; tampon = küçük ve sabit.

Zaman serbest olduğu için (2. madde) offload/retrieval yavaş ve *deliberatif* olabilir — reaktif kırpma paniği hiç yaşanmaz.

**En yakın komşular (T2/T3):** MemGPT/Letta sayfalama, Focus (slime-mold esinli, arXiv 2601.07190), latent bağlam derleme, ARMT ilişkisel özyinelemeli bellek (arXiv 2607.11614), "Root Theorem of Context Engineering" (arXiv 2604.20874, *homeostatic compression* diyor). **Hepsi hâlâ sıkıştırıyor.** Delta: bilişsel bilimden gelen *tampon-boyutu değil chunk-çözünürlüğü* ayrımı ve "gövdeyi değil kontratı tut" retrieval yapısı. Kimse bağlamı böyle çerçevelemiyor; deliberatif, reaktif değil.

**4060'da en ucuz test:** Çok-dosyalı bir kodlama görevinde sabit bağlam bütçesinde karşılaştır: (a) özyinelemeli özet compaction, (b) chunk-ve-offload (doğrulanmış fonksiyon kontratları + tree-sitter retrieval anahtarları). Metrik: görev başarısı. Beklenti: (b), tampon aynıyken daha yüksek çözünürlüklü aktif kümeyle kazanır.

---

### FİKİR 3 — Kaos Kıyısı: kalite-için-zaman takas eden akıl yürütme
**Kombinasyon:** Kritiklik × akıl yürütme derinliği × sabırlı zanaatkâr — *senin 1. ve 2. maddene birebir*

**Nakledilen invariant:** Hesaplama ve genelleme, order ile chaos arasındaki **kritik geçişte maksimize olur**; beyin kendini bu kritik noktaya ayarlar (nöronal çığlar, dallanma oranı σ≈1). Yapay ağlarda bile: genelleme, *kaosun başlangıcındaki* öğrenme oranında zirve yapar ve eğitim süresi orada minimize olur (Bertschinger & Natschläger, NIPS 2004; "Optimal Machine Intelligence at the Edge of Chaos", arXiv 1909.05176). Reddedilen şey: **saf sömürü (order) ya da saf gürültü (chaos) noktasında çalışmak.**

**Mekanizma:** Zamandan feragat serbest olduğu için akıl yürütmeyi/örneklemeyi **kritik sıcaklıkta** çalıştır — açgözlü (order, tek çözüm) değil, yüksek-sıcaklık gürültüsü (chaos, tutarsız) değil, kendini ayarlayan kıyı. Bir denetleyici ekle:
1. Bir **kritiklik proxy'si** ölç: akıl yürütme ağacının dallanma oranı, ya da çıktının prompt tedirginliğine duyarlılığı (Lyapunov-benzeri).
2. Sıcaklığı/örnekleme parametresini, çözüm çeşitliliğinin maksimize ama hâlâ tutarlı olduğu σ≈1 noktasına tut.
3. Bu bir **kalite düğmesidir, bedeli zamandır**: kritik noktada çok sayıda örnek al, sonra seç (senin proof-carrying diff / metamorfik test kriterinle ele).

**En yakın komşular (T3, çoğunlukla):** Kaos-kıyısı hesaplama literatürü kadim ama akıl yürütme örneklemesine *self-organized criticality + dallanma-oranı denetleyicisi* olarak taşınmış hâlini görmedim; sıcaklık ayarı var ama kritiklik çerçevesi yok. Taramayı derinleştirmedim — kendin bak.

**4060'da en ucuz test:** Bir akıl yürütme/kod benchmark'ında sıcaklığı süpür; dallanma-oranı proxy'sini ve pass@k'yi ölç. Kritikliğe-ayarlı nokta, eşit örnek bütçesinde sabit sıcaklığı geçiyor mu?

---

### FİKİR 4 — Öğrenme-İlerlemesi Sürücüsü: içsel motivasyon ve merak tuzağı
**Kombinasyon:** Aktif çıkarım / beklenen serbest enerji × boş zaman aktivitesi × meraklı çocuk — *senin 6. maddene birebir; FEP shadow mode'unu terfi ettirir*

**Nakledilen invariant:** Beklenen Serbest Enerji (EFE), içsel motivasyonu ayrı bir ödül olarak değil, **amaç fonksiyonuna gömülü** olarak taşır: epistemik değer (bilgi kazancı) + pragmatik değer. Ajan keşfeder çünkü belirsizliği çözmek gelecekteki serbest enerjiyi düşürür — merak, formüle edilmiş hâliyle budur. Yeni bir teorik sonuç: **"yeterli merak"** tek başına hem tutarlı öğrenmeyi hem de pişmanlık-sınırlı optimizasyonu garanti eder (Curiosity is Knowledge, arXiv 2602.06029). Reddedilen şey: **emirler bitince durmak.**

**Kritik tuzak (dürüstlük):** Naif entropi/yenilik arayışı **merak tuzağına** düşer — ajan, sırf yüksek entropi verdiği için *rastgele/stokastik* sonuçlara saplanır (FEPS, PLOS One 2025, 10.1371/journal.pone.0331047). Schmidhuber'in 1990-2010 "yaratıcılık, eğlence ve içsel motivasyon" teorisinin çözümü: ödül *ham yenilik* değil, **sıkıştırma ilerlemesi** olmalı — eğlence, "sıkıştırabilir hâle gelmekte"dir; can sıkıntısı, sıkıştırma artık iyileşmediğindedir.

**Mekanizma:** Orion'a bir "boş zaman" amaç fonksiyonu ver = kendi vault'u/kod tabanı üzerinde EFE. Boşta:
1. **Öğrenme-ilerlemesi kapılı** epistemik eylemler seç (Oudeyer/MAGELLAN çizgisi, arXiv 2502.07709): gerçekten *öğrenilebilir* şeyler hakkındaki belirsizliği maksimum azalt — rastgele değil.
2. Bunlar somut aktivitelerdir: kendi kodunda deney çalıştırmak, kendi belleğinde çelişki aramak (senin gerilim defterinle besle), conjecture üretip test etmek.
3. Öğrenme-ilerlemesi kapısı **merak tuzağını** yapısal olarak kapatır: nondeterministik/indirgenemez-rastgele çıktılara saplanmaz çünkü orada ilerleme sıfırdır → can sıkıntısı → başka yere geç.

Bu, tam senin "boş loop değil, aktivite" dediğin şey. Ve "On the Creativity of AI Agents" (arXiv 2604.13242) mevcut ajanların üç eksiğini sayıyor: içsel motivasyon, deneyime-dayalı sürekli öğrenme, *niyet ve kişilik* — bu fikir ilk ikisini, Fikir 6 üçüncüsünü hedefliyor.

**En yakın komşular (T2):** Aktif çıkarım/EFE (Friston); Schmidhuber sıkıştırma-ilerlemesi; MAGELLAN metabiliş; Motif (LLM-geri-bildirimli içsel ödül, arXiv 2310.00166). Delta: öğrenme-ilerlemesi-kapılı EFE'yi ajanın *kendi kod tabanı/vault'u* üzerinde boş-zaman sürücüsü yapmak ve merak tuzağını açıkça korumak.

**4060'da en ucuz test:** Orion vault'unda boş-zaman döngüsü. Ölç: öğrenme-ilerlemesi-kapılı keşif, gerçek çelişkileri/bug'ları rastgele problamadan daha hızlı buluyor mu; ve nondeterministik çıktılara saplanmaktan kaçınıyor mu (merak tuzağı testi).

---

### FİKİR 5 — Varsayılan Mod: task-dışı bilinç, boş loop değil
**Kombinasyon:** DMN × boş zaman × gündüz düşçüsü — *senin "rüya ve eğlenceli bir şey" tespitine; Prizma-I'in Rüya Çevrimi'ni mimariye oturtur*

**Nakledilen invariant:** Beyin boştayken **boş değildir.** Dış görevden koptuğu anda Varsayılan Mod Ağı (DMN) devreye girer ve kendiliğinden bilişi sürer: zihin gezinmesi, zihinsel simülasyon, **epizodik gelecek düşüncesi**, replay — ve bunlar işlevseldir (yaratıcılık, pekiştirme, kredi ataması). DMN, dış dikkat gerektiren görevlerde **deaktive** olur; task-pozitif ağla *antikorelasyonludur*. Boş zaman, attractor-benzeri dinlenme durumları arasında geçiştir (Brain 2024, Shofty ve ark., DMN'in yaratıcılıkta *nedensel* rolü; offline replay–DMN eşleşmesi). Reddedilen şey: **boşluğu boş geçirmek.**

**Mekanizma:** Bir DMN modu tanımla; **yalnızca dış görev yokken** aktifleşsin (beyindeki antikorelasyon gibi, task-pozitif modla karşılıklı dışlamalı). DMN modunda ajan yapılandırılmış kendiliğinden aktivite yapar:
1. **Mutasyonlu replay** (Prizma-I Rüya Çevrimi'ne bağlanır): son epizotları metamorfik dönüşümle yeniden oynat; tüm mutasyonlarda sağ kalan invariant gerçektir.
2. **Epizodik gelecek düşüncesi:** muhtemel gelecek görevleri önceden simüle et (ön-hesaplanmış çözüm iskeletleri).
3. **Iraksak birleştirme:** uzak bellekleri rekombine et → yeni "kanıt taşıyan diff" tarzı conjecture'lar.
4. **Task-negatif garantisi:** gerçek bir istek geldiği an anında yield et. Boş zaman ayrı bir *biliş modudur*, boş loop değil.

Bu Fikir 4'le birleşir: EFE/öğrenme-ilerlemesi *neye* doğru gezineceğini seçer; DMN modu gezinmenin *mimarisidir*.

**En yakın komşular (T2/T3):** DMN nörobilimi (yukarıda); Dreamer tarzı dünya modelleri "hayal ederek" öğrenir; RL replay. Delta: boş zamanı, pekiştirme+simülasyon+rekombinasyon yapan, task-pozitif modla açıkça *antikorelasyonlu* ayrı bir mod olarak kuran ajan mimarisi. Boş loop'un mimari reddi.

**4060'da en ucuz test:** Çift-modlu Orion; DMN modu boşta çalışsın. Ölç: sonraki görevin gecikmesi/kalitesi, ajan gelecek görevi önceden simüle edip (epizodik gelecek) pekiştirdiği için iyileşiyor mu?

---

### FİKİR 6 — Persona-Havza: kimlik, token değil çekim havzası
**Kombinasyon:** Çekim havzası dinamiği × persona etkisi × keşiş — *senin 5. maddene; Prizma-I "Kapalı Palet"i dinamikleştirir*

**Nakledilen invariant:** Beyinde kimlik, *her an kontrol edilen* bir şey değil; **dinamik olarak kararlı bir çekim havzasıdır** — kendin olmak için kendini yeniden doğrulamazsın; tedirginlikler sönümlenip havzaya geri döner. Matematik: attractor/Hopfield havzaları; personanın etrafında bir *geri-çağırıcı kuvvet* vardır. Reddedilen şey: **kimliği her turda yeniden ilan etmek.**

**Kritik dürüstlük (araştırma net):** Persona prompting bir **stil/davranış/keşif kaldıracıdır, yetenek kaldıracı DEĞİL** — ve olgusal doğruluğu/akıl yürütmeyi **düşürebilir.** "Expert Personas Improve LLM Alignment but Damage Accuracy" (arXiv 2603.18507) tam bunu ölçüyor; birçok çalışma persona'nın ölçülebilir bir doğruluk faydası bulamıyor (arXiv 2511.02458 makroekonomik tahmin; arXiv 2311.10054 "A Helpful Assistant is not really helpful"). Ama persona *davranışı* ve *keşif stilini* değiştirir (ör. "korsan" personası chain-of-thought'la karekökü daha iyi buldu, arXiv 2607.05398). Yani kaldıraç doğrulukta değil, **keşif politikasında** — ki bu Fikir 4-5'e döner.

**Mekanizma:**
1. Personayı prompt token'larıyla her turda yeniden dayatma (pahalı, sürüklenir). **Aktivasyon uzayında bir havza** olarak tanımla (Kapalı Palet'in koni kısıtıyla akraba) + bir **geri-çağırıcı kuvvet**: aktivasyon havzadan çıktığında ucuz bir denetleyici (steering vektörü) onu geri iter. Ölçülebilir iddia: *kimlik kararlılığı = havza derinliği*, ve derinliği mühendislersin — senin "en stabil hâlinde kalmak" dediğinin dinamik karşılığı.
2. **Personayı akıl yürütme yolundan ayır.** Araştırma persona'nın doğruluğu düşürdüğünü söylediği için, akıl yürütmeyi persona-nötr bir kanaldan geçir. Persona *neyin keşfedileceğini ve nasıl oynanacağını* yönetir (keşif sıcaklığı, merak hedefleri — Fikir 3-4-5); *neyin doğru olduğunu* değil.

**En yakın komşular (T2):** Persona Vectors, Assistant Axis, yukarıdaki persona-doğruluğu-düşürür çalışmaları; attractor ağları. Delta: persona-havza + geri-çağırıcı kuvvet, ve doğruluk-düşürme bulgusuyla motive edilen katı persona/akıl-yürütme ayrımı. Personanın *ölçülebilir* etkisi tam olarak budur.

**4060'da en ucuz test:** `qwen-7b` + steering vektörleri. (a) Düşmanca sürüklenme altında kimlik kararlılığı (havza derinliği), geri-çağırıcı kuvvet vs. prompt yeniden-ilanı. (b) Ayrıca: akıl yürütmeyi persona-nötr yönlendirmek, persona'nın maliyetlendirdiği doğruluğu geri kazandırıyor mu?

---

### FİKİR 7 — Nöromodülatör: hassasiyetle hesaplama tahsisi
**Kombinasyon:** Nöromodülasyon / hassasiyet-ağırlıklama × derinlik tahsisi × cimri — *1-6'yı birleştiren meta-denetleyici*

**Nakledilen invariant:** Beyin tekdüze hesaplamaz. Nöromodülatörler (dopamin, asetilkolin, noradrenalin) **hassasiyeti** (precision) ayarlar — hangi bölgede, şu an, öngörü hatalarına ne kadar ağırlık verileceğini. Dikkat = hassasiyet-ağırlıklama. Dopamin ≈ ödül-öngörü-hatası / öğrenme-ilerlemesi sinyali. Reddedilen şey: **her yere eşit kaynak vermek.**

**Mekanizma:** Orion'da global bir "nöromodülatör" denetleyici, **deliberasyon bütçesini** (zaman serbest olduğu için para birimi budur) hassasiyete göre dağıtır: pahalı akıl yürütmeyi yalnızca öngörü hatasının (belirsizlik × risk) yüksek olduğu yere harca; gerisini ucuz deterministik substrata bırak. Bu, 1-6'yı birleştiren meta-katmandır:
- Öngörülü kodlama (Fikir 1) *sadece hatayı emit et* der;
- Nöromodülasyon *hataları ağırlıkla ve ona göre harca* der;
- Dopamin-öğrenme-ilerlemesi, Fikir 4'ün kapısına bağlanır.

**En yakın komşular (T3):** Aktif çıkarımda hassasiyet-ağırlıklama; adaptif-hesaplama / mixture-of-depths / düşünme-bütçesi çalışmaları. Delta: ajanın *kendi alt-görevleri* üzerinde açık bir nöromodülatör hassasiyet haritasını hesaplama tahsisçisi yapmak. Taramadım — kendin doğrula.

**4060'da en ucuz test:** Yalnızca yüksek-hassasiyetli (yüksek belirsizlik×risk) alt-görevleri 7B modele yönlendir, gerisini deterministik araçlara. Metrik: hesaplama-başına-kalite vs. tekdüze tahsis.

---

## 5. Kıvılcımlar (geliştirilmemiş, kasıtlı çılgın)

**Hopfield vault** *(çekim havzası × retrieval)*: Benzerlik araması yerine **desen tamamlama.** Bozuk/kısmi bir sorgu, en yakın kararlı belleğe *düşer* (attractor dinamiği), skor eşiği aramaz. Retrieval bir arama değil, bir sönümlemedir. (T3)

**Anlamlı-basamak tipi** *(aralık aritmetiği × sayısal hassasiyet)*: "10000 basamak yerine ondalık" bir birinci-sınıf tipe dönüşür. Her sayı kendi hassasiyetini taşır; hesaplama, girdilerin *haklı kıldığından* fazla anlamlı basamak emit etmeyi **reddeder** — fazlası gürültüdür ve tip sistemi bunu derleme zamanında yakalar. AI'sız, saf deterministik (2. maddeyi onurlandırır). (T2/T3)

**TD-hatasıyla önceliklendirilmiş rüya** *(hipokampal replay × Fikir 5)*: Hangi belleğin rüyaya gireceğini **öngörü hatası** seçer (keskin-dalga tepecikleri en şaşırtıcıyı önce oynatır). Prizma-I gerilim defteri + Fikir 4 kapısı, doğrudan replay önceliği verir. (T3)

**Lyapunov güven sinyali** *(dinamik sistemler × doğrulama)*: Nihai cevabın prompt tedirginliğine duyarlılığını ölç. Yüksek duyarlılık (pozitif Lyapunov) = kaotik rejim = düşük güven. Ücretsiz bir kalibrasyon sinyali; kritik-nokta denetleyicisiyle (Fikir 3) aynı ölçümü paylaşır. (T3)

**Keskin-dalga sıkıştırması** *(replay × bağlam)*: Hipokampus dizileri ~20× sıkıştırarak oynatır. Bir kodlama oturumundan sonra offline bir geçiş, oturumun sıkıştırılmış bir *indeksini* yeniden türetir — compact değil, *yeniden-türetim*. Fikir 2'nin LTM tarafını besler. (T3)

---

## 6. Kapanış notu

Bu çalışmanın tek merceği: **beynin enerji vermeyi reddettiği yeri bul, yapay zekanın orada nasıl israf ettiğini gör, o reddedişi nakleT.** Yedi fikrin altısı (1, 2, 4, 5, 6, 7) doğrudan Orion'a takılır; ikisi (1'in substratı, kıvılcımlardaki anlamlı-basamak tipi) AI *olmadan* çalışır — senin 2. maddenin onayı.

İki eksen boyunca en savunulabilir yenilik sırası bence:
- **AI-yerli kod / bağlam (senin en büyük çıkmazın):** 1 (öngörülü kodlama + e-graph) > 2 (chunk değil tampon) > kıvılcım "anlamlı-basamak tipi".
- **İçsel aktivite / persona (senin 5-6):** 4 (öğrenme-ilerlemesi + merak tuzağı) > 5 (DMN modu) > 6 (persona-havza) > 7 (nöromodülatör).

Ama bu benim sıralamam. Prizma-I'in kapanış ilkesi burada da geçerli: sıralama senin sezgine ait, ve bu çalışmanın bütün mantığı gereği sezgine güven.

Jeneratörü Orion'a ver, kendisi üretmeye devam eder: *"Beyin bunu YAPMADAN başarıyor; ben nerede YAPARAK israf ediyorum?"* Listeler elinde, deste elinde. Gerisi reddedişin nakli.

---

### Ek: hangi fikir senin hangi maddene cevap
- **Madde 1 (nöron/beyin + matematik):** tüm çalışmanın merceği; özellikle Fikir 3 (kritiklik) ve 7 (nöromodülasyon) saf matematik/dinamik.
- **Madde 2 (kaliteden değil zamandan feragat; AI'sız da):** Fikir 3 (zamanı kaliteye çevirir), Fikir 1 substratı + anlamlı-basamak tipi (AI'sız).
- **Madde 3 (bağlam çıkmazı, "tek fonksiyon"):** Fikir 2 (chunk = kontrat, gövde değil).
- **Madde 4 (AI-yerli kod, "öngör-planlama"):** Fikir 1 (hata birimi; öngörüyü maliyet modeli yapar).
- **Madde 5 (persona etkisi):** Fikir 6 (persona-havza + katı akıl-yürütme ayrımı; doğruluğu düşürdüğü kanıtlı).
- **Madde 6 (yatkınlık/eğlence, boş loop değil, rüya):** Fikir 4 (öğrenme-ilerlemesi, merak tuzağı korumalı) + Fikir 5 (DMN modu).
