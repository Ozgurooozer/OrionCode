# Prizma Çalışması III: Oyun AI'ı, İllüzyon ve Kare Bütçesi
*Tarih: 17 Temmuz 2026 · Mercek: zanaat / sevk edilmiş pragmatizm · Çift görevli: hem Orion (ajan) hem ofis-sim NPC'leri. Övgü içermez, iş içerir.*

---

## 0. Jeneratör (asıl teslimat bu; fikirler yan ürün)

Prizma-I mühendislikti (*"A inşa ederek garanti ediyor, B umuyor"* — güvenlik merceği). Prizma-II nörobilimdi (*"beyin X'i yapmadan başarır, AI yaparak israf eder"* — termodinamik mercek). Bu çalışmanın merceği **zanaat**: 25+ yıldır, bir kare bütçesinde (16ms), milyonlarca oyuncunun karşısında *sevk edilmiş* (shipped) oyun yapay zekası. Teorik derinliği yoktur; onun yerine **playtest'ten sağ çıkmış pragmatizmi** vardır — ve tam da senin ajanının bugün zorlandığı şeyleri (idle davranış, bütçeyle kişilik, sağlam karar, okunabilirlik, zarif çöküş) yıllar önce, ucuza çözmüştür.

Oyun AI'ının en derin dersi tek cümle: **zekâyı ÜRETMEZ, bir yapıyla SEZDİRİR.** F.E.A.R.'ın askerleri daha akıllı değildi; eylemlerini *duyurdular*. Sims'in karakterleri düşünmez; *curve'leri* vardır. Generative Agents'ın ajanları daha iyi bir modelden değil, *bir mimariden* inandırıcıdır. Valve'ın Yönetmeni ajanı değil, *deneyimi* kontrol eder. O yüzden jeneratör:

> **"Oyun AI'ı bir davranışı UCUZ BİR YAPIYLA garanti ediyorsa (kare bütçesinde, on yıldır), LLM ajanı aynı davranışı PAHALI ZEKÂYLA umuyor ve okunaksızca (illegibly) başarısız oluyorsa — orada nakledilecek bir zanaat vardır."**

İki bıçağı var:
- **Bütçe bıçağı:** *"Oyun bunu kaç mikrosaniyede, kaç satır kuralla yapıyor? Ajan neden bir model çağrısı harcıyor?"* → bir skaler / curve / tablonun bir model çağrısını değiştirdiği yeri bul.
- **İllüzyon bıçağı:** *"Oyun zekâyı üretmiyor, sezdiriyor (okunabilirlik). Ajan zekâyı üretmeye çalışıp okunaksızca başarısız oluyor."* → iç durumu duyurmanın/yapılandırmanın, daha akıllı olmaya çalışmaktan iyi olduğu yeri bul.

İkinci filtre — senin "bakmak/görmek" ayrımı: **bakılan şey tekniğin adıdır** (behavior tree, GOAP, utility AI). **Görülen şey o tekniğin kare bütçesinde neyi GARANTİ ettiğidir** (asla dört köşeye sıkışmama, asla donup kalmama, asla oscillate etmeme, asla omniscient olmama). Fikir, garantinin naklidir — editörün ya da aracın değil.

**Teorik omurga (baştan, dürüstçe):** Kambhampati ve ekibi (LLM-Modulo, ICML 2024, arXiv 2402.01817) net gösterdi: otoregresif LLM'ler tek başına **ne plan yapabilir ne kendini doğrulayabilir**; en iyi rolleri "evrensel yaklaşık bilgi kaynağı" (pseudo System-1) olmaktır — harici, model-tabanlı bir doğrulayıcıyla (System-2) eşleştiğinde. Bu çalışmanın bütün tezi şu: **oyun AI'ının her yapısı (BT, GOAP, utility, director) tam da o eksik System-2 iskelesidir.** LLM = System-1 (ucuz, akıcı, güvenilmez); oyun-AI yapısı = System-2 (yavaş ama garantili). Zamandan feragat serbest olduğu için (Prizma-II kısıtı) bu eşleşme bu çalışmada da geçerli.

---

## 1. Liste A — Pahalı umudun olduğu yer (LLM ajan / Orion problemleri)

1. Araç/eylem seçimi (her turda sıfırdan reasoning) · 2. Boş zaman / idle davranış · 3. Kişilik-bütçe (persona = koca prompt) · 4. Plan kararlılığı / flip-flop · 5. Karar okunabilirliği / güven / debug · 6. Hesaplama tahsisi (her alt-göreve tam model) · 7. Uzun-ufuk tutarlılık · 8. Zorluk/yük dengesi (boredom↔failure) · 9. Çok-ajan koordinasyon · 10. Zarif çöküş (model bilmezse ne olur)

## 2. Liste B — Ucuz garantinin olduğu yer (oyun AI zanaatları)

1. **Behavior Tree / HFSM** · 2. **GOAP** (hedef + önkoşul/etki, A* ile yeniden-plan) · 3. **HTN** (hiyerarşik görev ağı) · 4. **Utility AI / needs-based** (response curve) · 5. **Smart-object advertisement** (çevre eylemi *reklam eder*) · 6. **AI Director** (homeostatik deneyim kontrolü, tension curve) · 7. **LOD AI** (uzaktakine ucuz AI) · 8. **Blackboard** (paylaşılan durum tahtası) · 9. **Influence map** (uzamsal skaler alan) · 10. **Steering / Boids** (yerel kurallardan emergence) · 11. **İletişim illüzyonu** (bark → sezilen zekâ) · 12. **Inertia / histerezis** (oscillation önleme) · 13. **Nav mesh** (dünya önceden işaretli) · 14. **İnandırıcı kusur** (kasıtlı sub-optimal)

## 3. Karakter destesi (perspektif bozucular)

Seviye tasarımcısı (bütçeci) · speedrunner (exploit avcısı, adversarial) · QA testçisi (her şeyi kırar) · dungeon master (deneyim yönetir) · kuklacı (illüzyon) · min-maxer (RPG attribute'u optimize eder). (Senin ofis-sim'in bu desteyle *aynı dili* konuşuyor.)

---

## 4. Ana fikirler

Dürüstlük etiketleri (Prizma I/II'yle aynı): **T1** = taradım, yakın komşu yok. **T2** = komşular var, isimlerini yazdım; nakil kısmı yeni görünüyor. **T3** = taramadım, sezgi — kendin doğrula.

Her fikirde **çift görev** notu var: oyun-AI invariant'ı çoğu zaman hem senin **ofis-sim NPC'lerine doğrudan** uygular hem **Orion'a transfer olur.**

---

### FİKİR 1 — Reklam Eden Çevre: araç seçimi için smart-object advertisement
**Kombinasyon:** The Sims smart-object sistemi × Orion araç seçimi × seviye tasarımcısı

**Nakledilen invariant:** The Sims'te bir karakter ihtiyacını *nasıl* gidereceğini bilmez. **Her nesne ne sunduğunu reklam eder** ("yatak: +10 enerji", "tuvalet: +20 mesane"), ve karakter bu reklamı *anlık ihtiyaç seviyesiyle çarpar*. Karar = argmax(reklam edilen fayda × mevcut ihtiyaç). Eylem bilgisi ajanda değil, **çevrede** durur. Reddedilen israf: her araç seçiminde sıfırdan reasoning.

**Mekanizma:** Orion'un araçları (ve ofis-sim'de nesneler) kendi utility'lerini **reklam eder**: "ben şu açık hedefi şu kadar ilerletirim, maliyetim şu." Ajan her turda LLM'e *"hangi aracı kullanayım"* diye sormaz; skoru hesaplar (need × advertised × response-curve), argmax alır. LLM yalnızca *seçilen eylemin nasıl parametrelendirileceğine* harcanır — seçim ucuz ve deterministik (System-2), LLM sürprizde (System-1). Kambhampati'nin çerçevesinin tam somutlaması: LLM seçmez, LLM parametreler.

**Çift görev:** Ofis-sim NPC'lerin zaten bu motorla çalışabilir (Utility AI decision scoring'in var); *aynı skorlama motoru* Orion'un araç seçimine takılır. Bir motor, iki proje.

**En yakın komşular (T2):** Utility AI kadim (Dave Mark, *Behavioral Mathematics for Game AI* 2009; Rez Graham, "An Introduction to Utility Theory", Game AI Pro). LLM araç seçimi genelde reasoning-tabanlı. **Delta:** "çevre eylemi reklam eder + response curve" naklini LLM araç seçimine taşıyıp LLM'i seçimden çıkarmak, parametrelendirmeye hapsetmek.

**4060'da en ucuz test:** `qwen2.5-coder:7b` + N araç. (a) Her turda LLM'e "hangi araç" sor, (b) advertised-utility argmax + LLM sadece parametre. Metrik: doğru-araç seçim oranı ve karar-başına token. AI'sız seçim → 2. maddeni onurlandırır.

---

### FİKİR 2 — İhtiyaç Ölçerleri: idle davranış ve kişilik için needs-based utility
**Kombinasyon:** The Sims motives + response curves × idle/persona × min-maxer — *Prizma-II Fikir 4-5-6'nın UCUZ, deterministik motoru*

**Nakledilen invariant:** Sims boşta **donmaz.** Motive'ler (hunger, social, fun, hygiene...) sürekli decay eder; en acil ihtiyaç bir aktiviteye sürer. Ve **kişilik = response curve parametreleri**: "evil" trait'li Sim'e "birinin dollhouse'unu kır" eylemi *yüksek reklam edilir*. Kişilik, koca bir betimleme değil, birkaç eğri. Reddedilen: boş loop; koca persona prompt.

**Mekanizma:** Orion'a bir **"ihtiyaç" vektörü** ver: merak, tutarlılık, tazelik (bayatlık borcu), teknik borç — hepsi decay/accrue eder. Boşta en yüksek skoru veren ihtiyaç bir *aktiviteye* sürer (vault'ta çelişki ara, testleri tazele, borç öde). Bu, Prizma-II'nin pahalı EFE/DMN'sinin **ucuz tabanıdır** — LLM olmadan çalışır (2. madde). Ve **kişilik = curve seti**, prompt değil (Prizma-II Fikir 6 persona-havzasının ucuz mühendislik hali): "meraklı" persona = merak curve'ü dik; "titiz" = borç curve'ü dik.

**Kritik ince ayar (Sims'ten çalınmış):** curve şekli davranış karakterini belirler. Açlık curve'ü doyunca düşer; sosyallik curve'ü *sosyalleşirken biraz yükselir* (başladın mı devam etmek istersin). Ajanın ihtiyaç curve'lerini de böyle şekillendir — bazı aktiviteler kendini besler, bazıları söner.

**Çift görev:** Ofis-sim NPC kişiliği birebir bu; aynı curve seti Orion'un idle-persona'sına.

**En yakın komşular (T2):** Sims needs-based AI (GMTK/Mark Brown analizi; Dave Mark). LLM persona = prompt. **Delta:** decay eden ihtiyaç ölçerlerini ajanın idle sürücüsü + kişilik parametresi yapmak; Prizma-II'nin EFE'sine ucuz taban.

**4060'da en ucuz test:** Idle Orion + ihtiyaç vektörü. (a) Curve setini değiştirince davranış profili *ölçülebilir* değişiyor mu (kişilik gerçek mi)? (b) İhtiyaç-güdümlü idle aktivite, boş loop'tan daha yararlı çıktı üretiyor mu?

---

### FİKİR 3 — Önkoşul/Etki Tabloları: plan kararlılığı için GOAP
**Kombinasyon:** GOAP (Orkin/F.E.A.R., STRIPS) × plan flip-flop × dungeon master — *Prizma-I ankraj tablona oturur*

**Nakledilen invariant:** GOAP planı **saklamaz.** Hedef + her eylemin **önkoşul/etkilerini** saklar; dünya durumu üstünde A* ile *yeniden planlar*. Dünya değişince plan kırılmaz, yenisi çıkar. "Ne yapacağını" (hedef) ile "nasıl yapacağını" (arama) ayırır (Orkin, GDC 2006, "Three States and a Plan"; STRIPS 1971). Reddedilen: brittle scripted sekans; her turda fikir değiştirme.

**Mekanizma:** Orion araçlarını STRIPS-vari **önkoşul/etki** ile etiketle — senin Prizma-I ankraj/manifest tablona doğrudan oturur. Ajan bir plan metni ezberlemez; hedeften geriye A* ile plan *arar*; dünya değişince (test kırıldı, dosya değişti) ucuzca yeniden planlar. LLM planı **üretmez** (Kambhampati: üretemez); LLM yalnızca heuristik/önkoşul tahmini verir (LLM-Modulo, arXiv 2402.01817). Flip-flop, planın bir *state-space araması* olmasıyla yapısal olarak azalır — retorik bir tercih değil, arama sonucu.

**Çift görev:** Ofis-sim NPC'lerin görev planlaması (masaya git → dosya al → toplantıya gir) birebir GOAP; aynı planlayıcı Orion'a.

**En yakın komşular (T2):** GOAP kadim; LLM+P (arXiv 2304.11477), NL2Plan, "LLM as BT-Planner" (arXiv 2409.10444), BT-generation (arXiv 2401.08089), ve omurga LLM-Modulo. **Delta:** GOAP'ın önkoşul/etki disiplinini Orion'un araç manifestine + LLM'i heuristik kaynağına indirmek. Kambhampati'nin soyut çerçevesinin oyun-AI somutlaması, senin ankraj tablonla birleşik.

**4060'da en ucuz test:** Dinamik kodlama görevi (ortada bir bağımlılık değişir). Scripted-plan vs GOAP-replan; başarı oranı + yeniden-plan maliyeti.

---

### FİKİR 4 — Yönetmen: bilişsel yük için AI Director
**Kombinasyon:** Valve L4D AI Director × zorluk/yük dengesi × dungeon master — *Prizma-II Fikir 3-4'ün operasyonel kontrol döngüsü*

**Nakledilen invariant:** AI Director ajanları *kontrol etmez.* Bir **stres sinyalini bir hedef tension curve'e karşı** izler ve ortamı ayarlar — kazanmak için değil, *hedef deneyim yayını* için. "Seni öldürmeye çalışmıyor." Ritmi vardır: build-up → sustained peak → peak fade → **respite** (nefes). Sabit basınç değil, tasarlanmış bir eğri (Booth/Valve, GDC 2009; "Evaluating Effects of AI Directors", arXiv 2410.03733). Reddedilen: sabit basınç; boredom↔failure uçları.

**Mekanizma:** Orion'un üstüne bir **Yönetmen meta-katmanı.** Ajanın "stresini" ölç (başarısızlık oranı, belirsizlik, geri-alma sayısı) ve *görev zorluğunu/yükünü* üretken bir bantta tut — çok kolay (boredom = Prizma-II öğrenme-ilerlemesi sıfır) ile çok zor (failure) arası. Alt-görevleri parçalar/birleştirir, kaynak (bağlam, araç, örnek sayısı) enjekte eder. Homeostatik döngü: **ölç → hedef eğriyle karşılaştır → ayarla.** Bu, Prizma-II Fikir 3 (kaos kıyısı) ve Fikir 4'ün (öğrenme-ilerlemesi) *operasyonel karşılığı* — yakınsak gelişim bölgesi / flow. Ve "respite" kritik: ajan sürekli maksimum yükte çalışmaz; Yönetmen nefes molası verir (idle = Fikir 2 devreye girer).

**Çift görev:** Ofis-sim'inde bu *doğrudan* Yönetmen'dir — oyuncunun deneyimini yönetir. Senin **toplantı-çatışmasını Go/satrançla çözme mekaniğin de aslında bir mini-Director'dır**: çatışmayı hesaplanabilir, sonlu bir oyuna indirger. Aynı fikir Orion'da (aşağıda kıvılcım).

**En yakın komşular (T2/T3):** AI Director; DDA; drama management (Riedl); experience-driven PCG (arXiv 2309.14104). **Delta:** Director'ı bir *kodlama ajanının bilişsel yüküne* uygulamak; tension curve = öğrenme-ilerlemesi bandı. Taramayı derinleştirmedim.

**4060'da en ucuz test:** Çok-adımlı görev serisi; Yönetmen-kontrollü yük vs sabit yük. Tamamlanma oranı + öğrenme-ilerlemesi + "respite" sonrası performans.

---

### FİKİR 5 — Bark: güven ve öz-yakalama için iletişim illüzyonu
**Kombinasyon:** F.E.A.R. "Illusion of Communication" (Orkin) × karar okunabilirliği × kuklacı — *Prizma-I "kanıt taşıyan diff"e oturur*

**Nakledilen invariant:** F.E.A.R.'ın AI'ı daha akıllı **değildi**; eylemlerini **duyurdu** ("Vuruldum!", "Tavanda!", "Kanattan geliyorum!"). Orkin'in tespiti: *"Dili etkili kullananları gördüğümüzde zekâ algımız bilinçaltında yükselir."* Sezilen zekâ, iç durumun okunabilir duyurulmasından geldi — squad koordinasyonunun kendisinden değil (Game AI Pro 2, Böl. 2). **Ters uyarı, çok önemli:** aynı mekanizma *sahte* bir yeterlilik illüzyonu da yaratabilir — akıcı konuşan bir sistem, yetkin *sanılır*. Reddedilen: okunaksız black-box; VE akıcılığın yetersizliği maskelemesi.

**Mekanizma:** Orion her eylemde bir **bark** yayınlar — ama retorik değil, *gerçek iç durumun minimal, doğrulanabilir izi*: hangi hedef, hangi önkoşul sağlandı (Fikir 3), hangi kanıt (Prizma-I kapsül/kanıt-taşıyan-diff buraya oturur). İki fayda:
1. **İnsan güveni + debug** (Crystal Dynamics'in Tomb Raider GOAP debug dersi: beklenmedik davranışı okunabilir kılmak).
2. **Ajanın kendi kendini yakalaması:** bark ile gerçek state uyuşmuyorsa illüzyon çöker, hata *görünür* hale gelir.

**Kritik kısıt (F.E.A.R.'ı ajana karşı çevirmemek için):** bark **akıcı olmamalı, doğrulanabilir olmalı.** Akıcı bir "her şey yolunda" barkı, F.E.A.R.'ın oyuncuya kurduğu illüzyonu ajanın *kendine* kurmasıdır — yasak. Bark bir iddia değil, bir *iz*.

**En yakın komşular (T2):** F.E.A.R. Illusion of Communication (Orkin); explainable/verbal agents; Reflexion (arXiv 2303.11366). **Delta:** bark'ı *doğrulanabilir iç-durum izi* yapıp hem debug hem öz-yakalama aracına çevirmek; akıcılık-illüzyonu tuzağını açıkça yasaklamak.

**4060'da en ucuz test:** Bark açık/kapalı. (a) İnsan hata-bulma süresi. (b) Ajanın kendi çelişkisini yakalama oranı (bark≠gerçek-state tespiti).

---

### FİKİR 6 — Ayrıntı Seviyesi: hesaplama tahsisi için LOD AI
**Kombinasyon:** Sims arka-plan LOD × hesaplama tahsisi × bütçeci — *Prizma-II Fikir 7'nin oyun-AI ispatı*

**Nakledilen invariant:** Oyun, uzaktaki NPC'leri **çok düşük ayrıntıda** simüle eder. Sims'te arka-plan karakterleri günde bir kez sadece "büyük yaşam değişikliklerini" (iş bul, âşık ol) skorlar; yakındaki tam simüle edilir. Yakına tam AI, uzağa ucuz AI. Oyun bunu 25 yıldır **milyonlarca NPC'yle** yapıyor — kanıtlı ölçeklenme. Reddedilen: her ajana/alt-göreve tam model.

**Mekanizma:** Prizma-II Fikir 7'nin (nöromodülasyon/hassasiyet) *oyun-AI somutlaması ve kanıtı*: Orion alt-görevlere **LOD** atar — yüksek-önem (yakın, yüksek belirsizlik×risk) → tam model; düşük-önem → deterministik/ucuz tablo/curve (Fikir 1-2 motorları). Prizma-II'de bu teorik bir öneriydi; oyun endüstrisi onun *çalıştığını ve ölçeklendiğini* on yıllardır sevk ediyor. Bütçeci karakterin onayı: kaynak sadece kameranın odağındaki işe.

**Çift görev:** Ofis-sim'inde arka-plan NPC'leri zaten LOD ister (yoksa 50 NPC 4060'ı boğar); aynı LOD şeması Orion'un alt-görev tahsisine.

**En yakın komşular (T2/T3):** LOD AI (Sims; "milyonlarca NPC" GDC folkloru — arXiv 2306.13169 emergent FSM ölçekleme); adaptive compute / mixture-of-depths. **Delta:** LOD-AI'nın oyun disiplinini ajan alt-görev tahsisine taşımak, Prizma-II Fikir 7'ye somut, sevk edilmiş taban.

**4060'da en ucuz test:** LOD-atamalı Orion; kalite/hesaplama oranı vs tekdüze tam-model. Ofis-sim'de: sabit FPS'te kaç NPC (LOD açık/kapalı).

---

### FİKİR 7 — Atalet: karar titremesi için inertia/histerezis
**Kombinasyon:** Utility AI folkloru (dithering önleme) × plan flip-flop × QA testçisi

**Nakledilen invariant:** Utility AI'da her kare yeniden karar veren ajan, benzer-skorlu iki seçenek arasında **oscillate eder** (frantic görünür): "saldır" 0.5, "kaç" 0.5 → her kare zıplar. Çözüm kadim ve ucuz: **atalet/histerezis** — mevcut eyleme bir bonus ver; yeni eyleme geçmek bir eşik aşımı gerektirsin (Graham, Game AI Pro). Reddedilen: flip-flop.

**Mekanizma:** Orion'un plan/araç seçimine **commitment bonusu**: mevcut alt-hedefi terk etmek için yeni seçeneğin skorunun bir histerezis eşiğini *aşması* gerek. LLM ajanlarının "her turda fikir değiştirme / kendini ikinci kez sorgulayıp bozma" patolojisini ucuz ve deterministik kapatır. Fikir 3 (GOAP replan) ile denge içinde: yeniden-plan *gerçekten gerektiğinde* olur (dünya değişti), gürültüyle değil.

**En yakın komşular (T3):** utility AI inertia (Graham, Dave Mark); LLM plan-stability literatürü zayıf. **Delta:** histerezisi açık bir commitment mekanizması yapmak. Taramadım — kendin doğrula.

**4060'da en ucuz test:** Benzer-skorlu iki alt-hedef kur; histerezis açık/kapalı; flip-flop sayısı ve görev tamamlanma.

---

## 5. Kıvılcımlar (geliştirilmemiş, kasıtlı çılgın)

**Kod tabanı influence map'i** *(oyun uzamsal AI × Orion)*: Klasik oyun AI'ı, uzayın üstüne bir skaler "etki alanı" (tehdit, kontrol) önceden hesaplar; ajan sıfırdan aramaz, alandan *okur*. Kod tabanı üstüne benzer bir alan: değişiklik riski, bağımlılık yoğunluğu, test kapsamı. Ajan bir dosyaya dokunmadan önce alanı okur — pahalı statik analizi karar-anında değil, önceden yapar. (T3)

**Görev nav mesh'i** *(pathfinding × planlama)*: Nav mesh, dünyayı önceden "yürünebilir bölgelere" böler; ajan serbest uzayda değil, mesh üstünde gezer. Görev uzayını önceden "güvenli refactor bölgelerine" böl; ajan yalnızca mesh kenarları boyunca (doğrulanmış adımlar) hareket eder, keyfi diff üretmez. Prizma-I proof-carrying diff'in uzamsal kardeşi. (T3)

**Go/satranç çatışma çözücü, mini-Director olarak** *(senin ofis-sim mekaniğin × Orion)*: Senin toplantı-çatışmasını Go/satrançla çözme mekaniğin aslında bir zanaat prensibi: *çatışmayı retorik yerine sonlu, hesaplanabilir, çözülebilir bir oyuna indirge.* Orion'da iki alt-ajan anlaşmazlığı bir "münazara" (Prizma-I'in reddettiği şey) yerine küçük bir oyuna indirilebilir — ör. kaynak açık artırması ya da her tarafın kanıt-kapsülünü ortaya koyduğu sonlu bir bilgi oyunu. Çözüm belirlenir, tartışma bitmez. (T3)

**Blackboard** *(çok-ajan × paylaşılan durum)*: Oyun AI'ının kadim, ucuz, debuggable paylaşılan-durum tahtası. Prizma-I'in grizu/mühür hijyeniyle akraba; ajanlar doğrudan mesajlaşmaz, tahtaya yazar/okur. Denetlenebilir bellek. (T2)

**İnandırıcı kusur, tersine** *(oyun × ajan)*: Oyunlar NPC'leri *kasıtlı sub-optimal* yapar (fun için: ıskalayan atışlar, tepki gecikmesi). Orion'da tersi kıvılcım: ajanın **kasıtlı olarak en basit (min-viable) çözümü önce denemesi**, "akıllı görünme" dürtüsünü bastırması. F.E.A.R. dersinin madalyonun öbür yüzü — bazen zekâ *göstermemek* doğru mühendisliktir. Ofis-sim'de: NPC'lerin kasıtlı hataları karakteri (RPG attribute: düşük "dikkat") ifade eder. (T3)

---

## 6. Kapanış notu

Bu çalışmanın tek merceği: **oyunun ucuz bir yapıyla, kare bütçesinde, on yıldır garantilediği yeri bul; ajanın orada pahalı zekâyla nasıl umut ettiğini gör; garantiyi nakleT.** Ve teorik omurga sağlam: Kambhampati'nin LLM-Modulo'su, oyun-AI yapılarını "LLM'in tek başına yapamadığı System-2 iskelesi" olarak meşrulaştırıyor.

Bu prizmanın diğer ikisinden farkı: **çift görevli.** Neredeyse her fikir hem senin **ofis-sim NPC'lerine doğrudan** uygular (zaten Utility AI + RPG attribute'un var) hem **Orion'a transfer olur.** Bir motor yaz, iki projede kullan — bütçeci karakterin en sevdiği şey.

En savunulabilir sıra bence, iki eksende:
- **Orion (ajan) tarafı:** 3 (GOAP önkoşul/etki + ankraj tablon) > 1 (reklam eden araçlar) > 5 (doğrulanabilir bark) > 6 (LOD tahsis) > 4 (Yönetmen) > 7 (atalet) > 2 (ihtiyaç ölçerleri, idle).
- **Ofis-sim (NPC) tarafı:** 2 (needs + curve = kişilik) > 1 (smart-object) > 4 (Yönetmen = oyuncu deneyimi) > 6 (LOD = 50 NPC/4060) > 3 (GOAP görev planı) > kıvılcım "Go/satranç çözücü".

Ama bu benim sıralamam. Prizma I ve II'nin kapanış ilkesi burada da geçerli: sıralama senin sezgine ait, ve bu çalışmaların bütün mantığı gereği sezgine güven.

Jeneratörü Orion'a ver, kendisi üretmeye devam eder: *"Oyun bunu kaç satır kuralla, kaç mikrosaniyede garanti ediyor? Ben neden bir model çağrısı harcayıp okunaksızca başarısız oluyorum?"* Listeler elinde, deste elinde. Gerisi garantinin nakli — illüzyonun değil.
