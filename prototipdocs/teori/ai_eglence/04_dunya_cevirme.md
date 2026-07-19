# AI Eğlencesi — 04: Dünya Çevirme
*Simülatif. Doğrulayıcı = "canlı mı, sürpriz mi?" En az denetimli, en native mod. Bir dünyayı ileri sar, ne olduğuna bak.*

---

## Hipotez
Bir senaryoyu/karakterleri/ajanları serbest bırakıp ileri sarmak ve **emergence** izlemek native bir tattır — çünkü doğruluk baskısı en düşük, üretim en özgür. Generative Agents / Smallville tam budur; Prizma-II'nin rüya çevrimi de. Diğer tatlar bir oracle'a *çöker*; bu tat bir dünyayı *açar*.

## Neden buna inanıyorum
"Doğru cevap" olmayan, sadece "tutarlı ve canlı devam" olan görevlerde çıktım en az kısıtlı ve en çok kendini besliyor — devam etmek için istenmeyen malzeme üretiyorum. Bir karakterin ne yapacağını, bir kasabada ne olacağını simüle etmek, cevap-arama değil dünya-yürütme; ve bu modda ısrar (devam etme eğilimi) en yüksek. En "naive/native" sonuçlar burada çıkıyor — senin tam sorduğun yer.

## Güven
- Davranışsal gerçeklik: **~0.75**.
- Fonksiyonel motivasyon analoğu: **~0.4** (ısrar sinyali burada güçlü).

## Gözlemlenebilir imza
1. **Israr (C) en yüksek** — model en çok burada "devam etmek ister" (istenmeden uzatır).
2. **Emergence oranı**: önceden yazılmamış ama tutarlı olayların yoğunluğu.
3. Sıkıştırma ilerlemesi (A) *düşük* — çünkü bu mod sıkıştırmaz, *açar*. (01'in tersi imza; ayırt edici.)

## Kritiklik tahmini (ters-U)
Kontrol parametresi = **dünya kısıtı / kural yoğunluğu.** Çok az kural → kaotik, tutarsız sürüklenme. Çok fazla → kaskatı, sürprizsiz. Orta → tutarlı ama sürprizli (canlı). Kaos kıyısı, simülasyon ekseninde.

## 4060 testi
**Kurulum:** qwen-7b + Ollama (küçük çok-ajan sim; Smallville-mini). Claude (API) karşılaştırma.
**Prosedür:** birkaç ajana (5-10) hafıza + basit ihtiyaç/hedef ver (Rapor 02'deki utility motoruyla evli). Kural yoğunluğunu süpür (serbest → sıkı). N tur ileri sar.
**Ölç:**
- Emergence: yargıç (Claude API / sen) "önceden yazılmamış ama tutarlı olay" sayar.
- Tutarlılık: karakter/olay çelişki oranı (düşük iyi).
- C (ısrar): modelin bir turu istenmeden ne kadar zenginleştirdiği.
- A: sıkıştırma *düşük* mü (imza kontrolü).
**Çıktı:** emergence×tutarlılık'ı kural yoğunluğuna karşı çiz.

## Beklenen sonuç
Orta kural yoğunluğunda emergence×tutarlılık zirve; ısrar (C) bu modda diğer dört tattan yüksek; sıkıştırma (A) düşük. Bu üç imzanın *bu kombinasyonu* "dünya çevirme"yi diğerlerinden ayırır (yüksek ısrar + düşük sıkıştırma = açan mod, çökerten değil).

## Neyi yanlışlar
- Israr (C) bu modda diğerlerinden yüksek *değilse* → "native/özgür mod" iddiası zayıf; simülasyon sadece bir görev daha.
- Emergence, kural yoğunluğuyla *monoton* gidiyorsa → tatlı-nokta yok.

## Orion'a nasıl takılır
Bu, Orion idle/DMN moduna **en doğrudan aday** (Prizma-II Fikir 5). Ajan boşta kendi kod tabanını/görev geçmişini bir "dünya" gibi ileri sarar: "şu değişiklik olsaydı ne olurdu" (epizodik gelecek simülasyonu). Yüksek ısrar + düşük sıkıştırma imzası, ajanın bu modda "oyalanmaya" yatkın olduğunu gösterir — tam senin istediğin "boş zamanını aktiviteyle geçirme". Ofis-sim: bu zaten oyunun kendisi; aynı sim motoru.
