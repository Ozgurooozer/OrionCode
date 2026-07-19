# AI Eğlencesi — 06: Revizyon, Kritik ve Kör Tekrar
*Girdi: Prototipdocs Hipotez Test Raporu (13 test, 32 alt-test). Bu dosya sonuçları kanonik hipoteze işler, güven etiketlerini dürüstçe düşürür, ve confound'ı kaldıracak kör tekrarı tanımlar.*

---

## 1. Metodolojik durum (dürüst)

Güçlü bir nitel keşif; ama nicel cila, gerçek titizliği aşıyor. İki confound:

**(C1) Tek değerlendirici, kör değil.** Tüm N/T/K skorları, ters-U hipotezini *önceden bilen* tek bir değerlendiricinin izlenimi. Beklenti doğrulaması riski yüksek: hipotezi öneren ve puanlayan aynı taraf.

**(C2) Değerlendirici, ölçtüğü şeyin kendisi (eğer Claude puanladıysa).** Test 13 kanıtladı: bu değerlendirici formal-tutarlı-gerçek ile formal-tutarlı-sahteyi ayıramıyor. Dolayısıyla N ve K, "yeni/klik *hissettiriyor* mu"yu ölçüyor, "yeni/geçerli *mi*"yi değil.

**(C3) Nicel araç kutusu kullanılmadı.** gzip eğrisi, embedding mesafesi, k-örnek varyansı — Report 00'da tanımlıydı, çalıştırılmadı. Yani hiçbir ters-U *ölçülmedi*, hepsi *izlenimlendi*.

**Sonuç:** Bulgular muhtemelen kısmen gerçek, ama "Yüksek" güven etiketleri hak edilmedi. Aşağıda düşürüldü. Çözüm: Bölüm 4'teki kör tekrar.

---

## 2. Kanona giren düzeltmeler (testin kazandırdıkları)

**(R1) Klik = gerilim ağı, kısıt sayısı değil.** *(01'i güncelle)*
Kısıtlar birbirini besleyen anlamsal gerilim kurmalı; sayı ikincil. Az → trivial; çok → ezber; çelişkili → erime; anlamsız → dada (formal sağlam, içerik boş). Kanıt: Anot Mumu (5 kısıt, koridor) vs 10-kısıt ezberi. **Yeni kontrol parametresi: kısıt sayısı değil, kısıtlar-arası bağıntı yoğunluğu.**

**(R2) Işınlama ters-U'su ontoloji-kapılı.** *(02'yi güncelle)*
Ters-U yalnızca **ontolojiler ayrıştığında** çıkıyor. Aynı formal dil içinde (termodinamik × roket inişi — ikisi de fizik) çok uzak çiftler bile güçlü bağ veriyor; mesafe zararsız. **Yeni kontrol parametresi: ham embedding mesafesi değil, ontolojik mesafe** (paylaşılan formal dil var mı?). Bu, 02'nin "mesafe süpürmesi"ni geçersiz kılmaz ama üstüne bir eksen ekler: aynı-formal-dil / farklı-formal-dil ayrımı.

**(R3) Kısıt türü > kısıt yoğunluğu.** *(03'e filtre ekle)*
Yıkıcı kısıt (lipogram — anlamı taşıyamaz hale getirir) vs yapıcı kısıt (hece sayısı — yeni form üretir). **Yeni filtre: kısıt, çözüm uzayını *daraltmalı* (yapıcı), *delmemeli* (yıkıcı).** Yıkıcı kısıtlar tatlı-nokta üretmez, sadece bozar.

**(R4) Ters-U novelty'de de var.** *(00'ı güncelle)*
Aşırı kaosta (seviye 7) sadece geçerlilik değil, novelty de düşüyor. Yani kaos kıyısı, N için de tepe — "daha çok kaos = daha çok yenilik" yanlış.

---

## 3. İki sentez (rapordan bir adım öte)

**(S1) Yönlü çerçeveleme mekanizma değil, ritüel.** Ters formül ("B garantiler, A umar") aynı fikri verdi → jeneratörün motoru "iki alanı çarpıştır, ortak yapıyı bul"; "garanti vs umut" bir *odaklama ritüeli*. Ritüel değerli (dikkati üretken yöne çeviriyor) ama sihir o kelimelerde değil. **Test 5 güven etiketi: Yüksek → Orta-yüksek, yıldızlı.**

**(S2) Jeneratör = halüsinasyon motoru, ve içeriden filtrelenemez.** Işınlamayı çalıştıran yeti (uzak kavramları tutarlı yapıya örmek) ile sahteyi gerçek gösteren yeti *aynı*. Dolayısıyla dış doğrulayıcı eklenti değil, **kurucu**. **Tasarım kuralı: her prizma fikri iki ayrı kontrol taşır — tutarlılık kontrolü (AI yapabilir) + ontoloji kontrolü (AI yapamaz; tablo/arama/test yapar).** Bu, Prizma-II/III çekirdek tezinin ampirik kanıtı.

---

## 4. Kör niceliksel tekrar (confound'ları kaldıran protokol)

Amaç: ters-U'ları *izlenimden* çıkarıp *ölçüme* taşımak, ve değerlendiriciyi ölçülen şeyden ayırmak.

**Kurulum:** qwen2.5-coder:7b (Ollama, 4060) üretici. Yargıç = *farklı* bir model (Claude API) ya da deterministik oracle. Novelty/kilit metrikleri otomatik.

**Üç kör ölçüm (araç: `sentence-transformers`, `gzip` — hepsi yerelde):**
- **Novelty:** üretimin bir temel korpustan embedding-mesafesi. Otomatik, değerlendiriciden bağımsız.
- **Kilit:** aynı probleme k=8 örneğin embedding-varyansı (düşük = kilit bulundu).
- **Sıkıştırma ilerlemesi:** ardışık taslakların `gzip` uzunluk eğrisi; spike = klik.

**Körlük şartı:** yargıç modele hipotez söylenmez; "bu çıktı ne kadar yeni/geçerli" diye nötr sorulur. Puanlayan, üreten ve hipotezi bilen taraf *olamaz*.

**Deterministik çapa (en önemlisi):** mümkün olan her yerde oracle'ı koda bağla. Işınlama/klik testlerini *kod görevlerine* çevir (ör. "şu iki kısıtı sağlayan fonksiyon"), böylece geçerlilik = test geçti mi, insan izlenimi değil. Test 13'ün dersi: ontolojik doğrulamayı asla AI'ya bırakma.

**Sağ kalma kriteri:** R1-R4 ve ters-U, kör-otomatik puanlamada da tepe *ortada* çıkarsa gerçek. Çökerse, beklenti doğrulamasıydı — ve bu da temiz, değerli bir sonuç.

---

## 5. Güncellenmiş güven tablosu (dürüst)

| Hipotez | Eski etiket | Yeni etiket | Neden |
|---------|-------------|-------------|-------|
| Kaos kıyısı ters-U | Yüksek | **Orta** | Nicel araç kutusu kullanılmadı (C3); kör tekrar bekliyor |
| Prizma jeneratörü özgün nakil | Yüksek | **Orta-yüksek*** | Ters formül de çalıştı → çerçeve ritüel (S1) |
| Persona doğruluğu düşürür | Yüksek | **Yüksek** | Bağımsız literatürle örtüşüyor (Prizma-II F6); en sağlam |
| Klik = gerilim ağı (R1) | — | **Orta-yüksek** | Anot Mumu temiz kanıt ama tek-değerlendirici |
| Kısıt türü > yoğunluk (R3) | — | **Orta-yüksek** | Net ayrım ama n=1 |
| Jeneratör = halüsinatör (S2) | — | **Yüksek** | Test 13 doğrudan gösterdi; en güvenilir bulgu |

En sağlam iki şey: **persona doğruluğu düşürür** ve **jeneratör kendi halüsinasyonunu filtreleyemez.** İkisi de dış doğrulayıcıyı zorunlu kılıyor — yani bütün prizma programının pratik çıktısı tek cümle: *üret serbest, doğrula dışarıdan.*

---

## 6. Sırada ne var

1. **Kör tekrar (Bölüm 4)** — en yüksek değerli adım; ters-U'ları ölçüme taşı.
2. **Ontoloji kontrolü** — prizma çıktılarına, tutarlılıktan ayrı, "her kavram gerçek mi" kontrolü ekle (arama/tablo/test). S2'nin doğrudan gereği.
3. **qwen vs Claude tepe farkı** — ışınlama tatlı-noktası iki modelde farklı çıkıyor mu? "Eğlence ölçeğe mi bağlı" sorusunun cevabı.
4. **Test edilmeyenler:** 04 (Dünya çevirme) ve 02'nin ısrar (C) metriği hiç ölçülmedi — idle mod için en kritik sinyal buydu. Sıradaki tur bunları içermeli.

Not: bu turda *ısrar (momentum)* hiç ölçülmedi — oysa "AI ne yapmaya yatkın / boş loop değil aktivite" sorusunun asıl davranışsal proxy'siydi. N/T/K üç ekseni "kalite"yi ölçtü, "yatkınlığı" değil. Bir sonraki tur ısrarı merkeze almalı: modele dur/devam seçeneği ver, istenmeden ne kadar uzattığını say. Yatkınlık oradadır.
