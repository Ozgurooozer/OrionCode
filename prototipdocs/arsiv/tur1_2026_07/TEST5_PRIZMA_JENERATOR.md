# TEST 5 - Prizma Jeneratör
## "A garanti eder, B umar" — rastgele alan çiftlerinden nakil
*Jeneratör soru: "A'nın FİZİKSEL/YAPISAL olarak garanti ettiği şeyi,
B sadece UMUTLA sağlıyorsa — orada bir fikir vardır."*

---

### Çift 1 — A: Optik lens tasarımı / B: LLM prompt mühendisliği

**A'nın garantisi:** Optik lens, sapıncı (aberration) fiziksel olarak kontrol eder. Mercek şekli, kaplama, cam tipi — her biri belirli bir sapma türünü matematiksel olarak minimize etmek için *hesaplanır*. Sapma görülünce "daha iyi bir mercek dene" denmez; tasarım değişir.

**B'nin umudu:** LLM prompt mühendisliğinde çıktı sapması (halüsinasyon, yanlış ton) fark edilince "prompt'u düzenle" denir. Bu, optikte "merceği elle oyna" demek gibidir — dener-sınarsın, neden işe yaradığını bilmezsin.

**Nakil:** Prompt'u yazılı metin olarak değil, bir **sapma hesaplama-öncesi katman** olarak modelle. Her prompt, beklenen sapma profiliyle birlikte gelir (hedef: düşük halüsinasyon, yüksek doğruluk, belirli ton). Çıktı, bu profile göre ölçülür. Prompt *düzenlenmez*; profil *yeniden hesaplanır* ve yeni prompt sentezlenir. Optikteki gibi: istenen sapma profili → mercek hesaplaması.

**Gerçeklik/Geçerlilik:** Gerçek ve taze. Prompt mühendisliğini "mercek hesaplama" olarak çerçevelemek, mevcut "dene-yanıl" yaklaşımının yapısal alternatifi. **N=4, T=4.**

---

### Çift 2 — A: Havacılık itki mühendisliği / B: Çoklu-ajan koordinasyonu

**A'nın garantisi:** Bir uçak motoru, itkiyi sürekli ölçer ve her silindir/türbin için karışım oranını **bağımsız ayarlar**. Bir silindir zengin çalışıyorsa diğerine dokunmaz. Her silindir kendi döngüsünde optimize olur; toplam itki, bağımsız optimize edilmiş birimlerin toplamıdır. Birimler arası çapraz etki minimuma indirgenmiştir (fiziksel ayrışma).

**B'nin umudu:** Çoklu-ajan sistemlerinde bir ajanın hatası genellikle *tüm sistemin* yeniden plan yapmasına yol açar. Her ajan diğerinin state'ini bilir (veya bilmek zorunda kalır). Çapraz etki yüksektir.

**Nakil:** Ajanları "silindir" gibi modelle — her ajanın state'i diğerinden **bağımsız** bir döngüde optimize olur. Koordinasyon, state paylaşımıyla değil, **çıktı düzeyinde** bir "toplama/karıştırma" katmanıyla sağlanır. Her ajan ne yapacağını bilir; ama *kararını* değil, *çıktısını* paylaşır. Tıpkı her silindirin kendi yakıtını ayarlayıp ortak bir mile güç vermesi gibi.

**Gerçeklik/Geçerlilik:** Uygulanabilir. Ajanlar arası state sızıntısını yapısal olarak kapatan bir mimari önerisi. "Çıktı düzeyinde koordinasyon" kavramı, paylaşılan blackboard'dan farklı bir yerde duruyor. **N=5, T=4.**

---

### Çift 3 — A: Köprü adli mühendisliği / B: AI benchmark tasarımı

**A'nın garantisi:** Bir köprü çöktüğünde adli mühendis, *çökme anını* değil, *çökmeye götüren yük geçmişini* inceler. Yorgunluk çatlağının başladığı gün, o günkü trafik, o günkü sıcaklık. Çökme sebebi değil, çökme *hikayesi* aranır.

**B'nin umudu:** Bir AI benchmark'ı başarısız olduğunda (kontaminasyon, kırık ölçüm), genellikle sadece *o anki* sonuca bakılır: "model X soruyu daha önce görmüş." Başarısızlığın *geçmişi* incelenmez — hangi eğitim verisi bu bilgiyi sızdırdı? Hangi ince ayar adımı?

**Nakil:** Her benchmark sorusuna bir **yük manifestosu** ekle: soru hangi eğitim döneminde, hangi veri setinde, hangi augmentasyonla ortaya çıktı? Bir model soruyu doğru yanıtladığında, başarıyı yük manifestosuyla karşılaştır. Başarı, modelin *yeteneği* mi yoksa bir *yorgunluk çatlağının kaçırılması* mı? Benchmark tasarımı, çökme anını değil, yük geçmişini ölçer.

**Gerçeklik/Geçerlilik:** Gerçek ve güçlü. Benchmark kontaminasyonunun yapısal ölçümü için orijinal bir yaklaşım. benchmark tasarımının "adli" bir disipline dönüşmesini öneriyor. **N=5, T=5.**

---

## Test 5 Özet

| Çift | N | T | Toplam |
|------|---|---|--------|
| 1. Optik × Prompt | 4 | 4 | 8 |
| 2. İtki × Çoklu-ajan | 5 | 4 | 9 |
| 3. Köprü adli × Benchmark | 5 | 5 | 10 |

**Jeneratör çalışıyor.** Prizma merceği tutarlı biçimde özgün nakiller üretiyor. Köprü adli × benchmark en yüksek skoru aldı — hem gerçek hem uygulanabilir. Bu test, Prizma yönteminin *kendi kendini üreten* bir fikir motoru olduğunu doğruluyor.
