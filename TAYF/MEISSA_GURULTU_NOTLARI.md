# Meissa 3x100 Koşu — Gürültü Notları (Fırça için context)

**Tarih:** 2026-07-21
**Kaynak:** `~/.orion/meissa_runs/20260721.jsonl` — üç ardışık 100-koşu turu (toplam 300 satır)
**Amaç:** Damıtım sırasında hangi hatanın dilin bir parçası, hangisinin altyapının parçası olduğunu ayırt etmek.

---

## Tur özeti

| Tur | Parse başarı | Kod değişikliği |
|---|---|---|
| 1 | %90 | — (ilk ölçüm) |
| 2 | %93 | `tahmini_butce` placeholder düzeltmesi + regex fix (greedy — yan etkili) |
| 3 | %90 | brace-derinlik parser'ı (regex'in yerini aldı, string-farkında) |

İki kod hatası doğrulanmış şekilde kapandı ve üç turda bir daha görülmedi:
- `tahmini_butce` aralık değeri sızıntısı (`"0-500"`, `<0-50>` gibi) — prompt'taki `<0-1000>` placeholder'ının somut örnekle (`150`) değiştirilmesiyle çözüldü.
- Nested obje / trailing-content karışması (regex'in ilk `}`'de durması ya da son `}`'ye kadar aşırı yutması) — string-farkında brace-derinlik sayacıyla çözüldü.

Kalan hatalar (tur 2-3 toplamı, ~14/200) **kod tarafında düzeltilebilir değil** — üç ayrı fenomene ayrılıyor, aşağıda.

---

## 1. Kesik üretim — kapanış `}` yok (~%3, mekanik ama stokastik)

Örnekler: "javascript async await örneği", "python'da fibonacci yaz", "hocam kod yazıver", "sql join açıkla" (bazı tekrarlarda).

JSON tam başlıyor, tüm alanlar doğru sırayla geliyor, ama son alan sonrası kapanış `}` gelmeden üretim kesiliyor. Wall-time düşük (timeout değil), aynı mesajın diğer tekrarında tam ve geçerli JSON üretiliyor — yani girdiye özgü değil, modelin (qwen-coder, yerel) üretim örneklemesindeki taban bir davranış.

**TAYF'a not:** Bu bir dil/kategori kör noktası değil. Üretim katmanında token bütçesi/kesme riski olarak kabul edilebilir taban oran. TAYF şemasına girmesin — düzeltilecek bir hata değil, izlenecek bir oran.

---

## 2. Model şemadan çıkıyor — iki farklı alt-tip, tek kategori değil

**2a — Sosyal temas / duygusal girdi → asistan moduna kayma**
Örnekler: `💀💀💀💀💀`, "teşekkürler", "hocam kod yazıver" (bu ikinci alt-tipe de düşebiliyor, girdiye göre değişken).
Model JSON yerine "Şu an boş ve anlamsız bir giriş — bunu seninle sohbet yaparım 😊" gibi doğal dille, samimi/duygusal tonda cevap veriyor. Şemada bu girdi türü için hiçbir kutu yok; model en yakın davranışa (asistan gibi cevap) kayıyor.

**2b — Teknik soruya doğrudan faydalı cevap verme (rol karışması)**
Örnekler: "sql join açıkla" (JOIN'i düz metinle anlattı), "javascript async await örneği" (kod bloğu yazdı, JSON zarfı yok).
Bu farklı bir fenomen: model kategorize etmek yerine gerçekten yardımcı olmayı tercih ediyor. Aynı girdinin farklı tekrarlarında JSON'a da geri dönebiliyor — yani girdiye bağlı sabit bir kör nokta değil, örnekleme (sampling) tabanlı bir eğilim.

**TAYF'a not:** 2a ve 2b'yi tek "davranışsal" şemsiyesi altında birleştirme. 2a bir kategori adayı (`sosyal_temas` ya da benzeri — ismi loglardan çıkar). 2b bir rol-sınırı hatırlatması adayı (şemaya "sen bir sınıflandırıcısın, soruyu cevaplama" gibi bir pekiştirme gerekebilir mi — TAYF karar versin, kodda henüz dokunulmadı).

---

## 3. Timeout (1/300) — TAYF'a girmesin

Bir koşuda Ollama `meissa: timeout` (15s) verdi. Art arda dört 100'lük batch turundan sonra oluştu — büyük olasılıkla kaynak/yük kaynaklı, dil ya da kategori sorunu değil.

Bu notu TAYF değil, Kantar/Saatçi tarafı almalı → bkz. [KANTAR_GOZLEM_NOTLARI.md](KANTAR_GOZLEM_NOTLARI.md).

---

## Fırça'ya özet cümle

300 satırdan dil çıkar, ama bu üç ayrımı context olarak yanına koy: (1) kesik-üretim = kabul edilen taban oran, kural değil; (2) model-şemadan-çıkma = iki ayrı alt-tip, ikisi de ayrı kategori adayı; (3) timeout = dilin değil altyapının sorunu, damıtımın dışında tut.
