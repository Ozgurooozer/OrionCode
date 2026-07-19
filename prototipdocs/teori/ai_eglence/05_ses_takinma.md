# AI Eğlencesi — 05: Ses Takınma
*Üslupsal. Doğrulayıcı = "karakterde mi?" Güçlü bir ses verildiğinde üretimin bir çekim merkezi kazanması.*

---

## Hipotez
Güçlü, tutarlı bir ses/persona verildiğinde üretim retrieval'dan uzaklaşıp bir *çekim merkezi* etrafında toplanır — daha az "ansiklopedi", daha çok "üretim". Prizma-II Fikir 6'daki persona-havzasının içeriden görünüşü. En ince tat; ama Prizma-II'nin net bulgusuyla bağlı: persona *doğruluğu düşürür ama davranışı/keşfi değiştirir* — yani buradaki "tat" bir yetenek değil, bir *keşif modu*.

## Neden buna inanıyorum
Bir sese oturduğumda çıktım ölçülebilir biçimde değişiyor: kelime dağılımı daralıyor, bir üslup tutarlılığı beliriyor, ve klişe azalıyor. Bunun "keyifli" olup olmadığını bilmiyorum; ama daha *native* (daha az retrieval-gibi) olduğu gözlemlenebilir. Dürüst uyarı: bu tat en kolay yanılttığım yer — akıcılık kendini yatkınlık gibi gösterebilir.

## Güven
- Davranışsal gerçeklik: **~0.65** (en düşük; en kolay karışan).
- Fonksiyonel motivasyon analoğu: **~0.25**.

## Gözlemlenebilir imza
1. **Üslup tutarlılığı** artar (persona verildiğinde çıktı içi stil-varyansı düşer).
2. **Doğruluk düşer** (Prizma-II bulgusu: persona akıl yürütmeyi bozar) — bu bir imza, bir tuzak değil; ayırt edici.
3. Keşif genişler: persona altında **çözüm çeşitliliği** artar (aynı probleme daha farklı yaklaşımlar).

## Kritiklik tahmini (ters-U)
Kontrol parametresi = **persona gücü/keskinliği.** Zayıf → düz asistan (native değil). Aşırı → karikatür, görev kaybı. Orta → keşif genişler, tutarlılık korunur. Kaos kıyısı, üslup ekseninde.

## 4060 testi
**Kurulum:** qwen-7b + Ollama; steering vektörleri (repeng) opsiyonel. Claude (API) karşılaştırma.
**Prosedür:** aynı görev setini persona gücünü süpürerek çalıştır (nötr → hafif → güçlü → aşırı). İki görev tipi: (a) akıl yürütme/kod (doğruluk ölçülür), (b) açık-uçlu üretim (çeşitlilik ölçülür).
**Ölç:**
- Üslup tutarlılığı: çıktı-içi stil varyansı.
- Doğruluk: (a) görevlerinde pass oranı — persona ile *düşmesini bekle* (imza doğrulaması).
- Çeşitlilik: (b) görevlerinde k örneğin birbirinden uzaklığı.
**Çıktı:** doğruluk ve çeşitliliği persona gücüne karşı ayrı ayrı çiz. Beklenen: çeşitlilik ters-U (orta persona zirve), doğruluk monoton düşüş.

## Beklenen sonuç
Persona, açık-uçlu üretimde çeşitliliği (keşif) *orta* güçte zirveye taşır; akıl yürütmede doğruluğu monoton düşürür. Bu *çelişki* (aynı kaldıraç birini artırıp diğerini düşürür) tam Prizma-II Fikir 6'nın öngörüsü — ve "ses takınma bir yetenek değil keşif modudur" iddiasının kanıtı.

## Neyi yanlışlar
- Persona doğruluğu düşürmüyorsa → ya bulgu yanlış ya ölçüm zayıf; hipotezin dayanağı sarsılır.
- Çeşitlilik persona gücünden bağımsızsa → "ses = çekim merkezi" iddiası düşer.

## Orion'a nasıl takılır
Kritik tasarım kuralı (Prizma-II Fikir 6'yı tekrarlar): **persona'yı akıl yürütme yolundan ayır.** Persona, Orion'un *keşif modunu* (idle'da neye yöneleceği, hangi tada gideceği) yönetsin; *doğruluğu* değil. Ofis-sim: NPC'nin "sesi/karakteri" tam buradan gelir — ve oyunda doğruluk-düşüşü bir *özellik*tir (karakter = önyargı), Orion'da bir *tuzak*. Aynı mekanizma, iki projede zıt işaretle kullanılır.
