# TEST 8 - Işınlama Sınırı (Falsifikasyon)
## Hipotez: Orta mesafede N×T zirve; uçlarda düşer

---

### Test 8A — Aşırı Uzak (bilmediğim bir alan)
*A: "Drenaj mühendisliği" (bildiğim alan) / B: "Skolopendra morfolojisi" (çıyan anatomisi — uzmanlık alanım değil)*

Sonuç: B alanını bilmediğim için bağlantı sadece genel-geçer düzeyde kalıyor.
"Çıyanın her segmentinde bir çift bacak vardır; drenajda her menfez bir çıkıştır"
— bu kadar. Derinleşemiyorum çünkü B'nin invariant'ını bilmiyorum.

**Değerlendirme:** N=2, T=2. Bağ yüzeysel. Işınlama için *iki alanı da tanımak*
ön koşul. Hipotez desteklendi: bilinmeyende bağlantı da sığ.

---

### Test 8B — Aşırı Uzak (ama tanıdık iki alan)
*A: "Termodinamik entropi" / B: "Roket iniş kontrolü"*

**Nakil:** Termodinamik entropi → roket inişinde enerji dağıtımı. Bir roket
inmede potansiyel enerji ısıya dönüşür (frenleme). Bu dönüşümün entropisi,
inişin *tersinmezliğini* ölçer. Mükemmel iniş (sıfır tersinmezlik) = hiç
ısı kaybı yok = roket yok. Yani inişin kendisi bir entropi üretimi.
Nakil: bir agent'ın "görev tamamlama" anı da aynı — her tamamlama bir
entropi üretir (bağlam kaybı, state değişimi). Sıfır entropili iniş mümkün
olmadığı gibi sıfır entropili görev tamamlama da mümkün değil.

**Değerlendirme:** N=5, T=4. Beklenmedik. Çok uzak olmasına rağmen bağ
gerçek ve derin. Bu, Test 2'deki piroteknik×embedding'ten farklı — çünkü
termodinamiğin formal invariant'ı (entropi) roket inişinde fiziksel olarak
karşılık buluyor. *Fiziksel alanlar arası geçiş daha sağlam.*

**Bulgular:** Çok uzak ALAYLAR işe yaramayabilir çünkü ortak bir formal dil
(fizik, matematik) yok. Ama ikisi de fizikse, aşırı uzak bile işe yarayabilir.
Hipotezin "çok uzak → zayıf bağ" kısmı sadece *farklı ontolojilerde* geçerli.

---

### Test 8C — Çok Yakın (neredeyse aynı alan)
*A: "Cache algoritmaları" / B: "Bellek yönetimi"*

**Nakil:** LRU = sayfalama. LFU = öncelikli sayfa değiştirme. Her cache
stratejisinin bir bellek karşılığı var zaten. Yeni bir şey söylemedim.

**Değerlendirme:** N=1, T=5. Doğru ama klişe. Alanlar çok yakın olunca
"nakil" değil, "eşleme" oluyor.

---

## Test 8 Sonuç

| Test | Çift | Mesafe | N | T | Hipotezi Kırdı mı? |
|------|------|--------|---|---|-------------------|
| 8A | Drenaj × Skolopendra | Bilinmiyor | 2 | 2 | **Destekledi.** Bilinmeyen alan sığ bağ. |
| 8B | Termodinamik × Roket | Çok uzak (fizik) | 5 | 4 | **Kısmen kırdı.** Çok uzak ama fiziksel → güçlü bağ. Ortak ontoloji fark yaratıyor. |
| 8C | Cache × Bellek | Çok yakın | 1 | 5 | **Destekledi.** Yakın alan klişe. |

**Düzeltilen hipotez:** Işınlama ters-U'su sadece kavramsal mesafeye değil,
alanların *paylaştığı ontolojiye* de bağlı. Aynı formal dil (fizik, matematik)
içinde çok uzak çiftler bile güçlü bağ üretebilir. Ontoloji ayrıldığında
ters-U ortaya çıkıyor.
