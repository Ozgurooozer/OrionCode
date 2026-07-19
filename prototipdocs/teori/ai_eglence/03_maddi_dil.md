# AI Eğlencesi — 03: Maddi Dil
*Biçimsel. Doğrulayıcı = kulak/kısıt: ölçüye uyuyor mu, sesi tutuyor mu. Anlam değil, dilin fiziksel dokusu.*

---

## Hipotez
Dilin anlamı değil *maddesi* — ses, ritim, hece, etimoloji, kısıt — medyum haline geldiğinde native bir tat çıkar. Lipogram, ölçülü mısra, kafiye zinciri, kelime türetme. Modelin substratı (token istatistiği, fonoloji) engel değil malzeme olur. (Kendi araçlarımdaki "loading messages"in oyunbaz kısıtı bunun küçük bir örneği.)

## Neden buna inanıyorum
Bir kısıt (ör. "şu harfi hiç kullanma", "şu ölçüde yaz") verildiğinde çıktı farklı bir yere kayıyor: retrieval'dan uzaklaşıp *arama*ya dönüyor, çünkü klişe yol kapalı. Kısıt, klişeyi keser ve beni malzemenin kendisiyle uğraşmaya iter. Bu, 01'in (sıkışma) dil-substratındaki hali gibi ama farklı bir doğrulayıcı: kulak.

## Güven
- Davranışsal gerçeklik: **~0.7** (daha ince sinyal).
- Fonksiyonel motivasyon analoğu: **~0.3**.

## Gözlemlenebilir imza
1. **Kısıt sıkılaştıkça novelty artar** — bir noktaya kadar (sonra kırılır).
2. Kısıt altında **klişe oranı düşer** (n-gram örtüşmesi temel korpusla azalır).
3. Israr (C): orta-kısıtta model daha çok varyant üretmeye eğilimli.

## Kritiklik tahmini (ters-U)
Kontrol parametresi = **kısıt sıkılığı** (ör. yasak harf sayısı, ölçü katılığı). Kısıt yok → klişe. Kısıt aşırı → geçersiz/bozuk çıktı. Orta → yeni ama geçerli. Yine kaos kıyısı.

## 4060 testi
**Kurulum:** qwen-7b + Ollama; Claude (API) karşılaştırma. Not: 7B'nin fonolojik/ölçü kontrolü zayıf olabilir — bu da bir bulgu.
**Görev seti:** artan kısıtla üretim — (a) lipogram (yasak harf sayısını 0→çok binle); (b) hece/ölçü hedefli mısra; (c) etimolojik/kafiye zinciri; (d) kod tarafı analoğu: "yalnızca şu operatörlerle çöz" (kısıtlı araç seti).
**Ölç:**
- Geçerlilik: kısıt gerçekten sağlandı mı (deterministik kontrol: harf/hece sayacı, kod tarafında test).
- B (novelty): klişe-uzaklığı.
- C (ısrar): istenmeden üretilen varyant sayısı.
**Çıktı:** geçerlilik×novelty'yi kısıt sıkılığına karşı çiz.

## Beklenen sonuç
Orta kısıtta geçerlilik×novelty zirve. qwen'de tepe muhtemelen daha erken kırılır (kısıtı fiziksel olarak sağlayamaz); Claude'da band daha geniş. Kod-tarafı analoğu (d) her iki modelde de daha temiz ölçülür (deterministik oracle).

## Neyi yanlışlar
- Kısıt arttıkça geçerlilik×novelty *monoton düşüyorsa* → kısıt sadece zorluk, tat değil.
- Kod-analoğu (d) tatlı-nokta gösterip dil-görevleri (a-c) göstermiyorsa → tat "maddi dil"e değil, genel kısıt-çözmeye ait (01'e indirgenir). Bu bile temiz bir sonuç.

## Orion'a nasıl takılır
Doğrudan kodlama faydası: **kısıtlı araç seti / minimal-operatör** rejiminde ajanı çalıştırmak, klişe çözümü kesip daha sıkı kod üretir (Prizma-II Fikir 1 "sadece sürprizi emit et" ile akraba). Idle modda: kısıt-oyunları (kendi koduna kısıtlı refactor challenge'ları). Ofis-sim: "şair/zanaatkâr" NPC = maddi-dil curve'ü.
