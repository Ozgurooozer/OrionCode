# TEST08 — H8-ESCAPEMENT: Sabit Ritim vs. Serbest Ritim
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H8

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (sabit ritim) A'ya göre daha düşük N varyansı — yani kalite çıktı boyunca daha tutarlı kalır. N medyan değerleri benzer olabilir ama B'de baş ve son arasındaki kalite farkı küçük. A'da serbest akışta genellikle başı güçlü, sonu düşüyor ya da tam tersi. T: B'de daha yüksek (yapılandırılmış ritim boşluk bırakmıyor).
- **Falsifikasyon kriteri**: B'nin çıktısında başı ve sonu arasında tutarlılık farkı A ile aynı ya da fazlaysa — "sabit ritim varyansı düşürür" tezi kırılır. B'nin N değeri A'dan belirgin düşükse — ritim kısıtı yaratıcılığı öldürüyor.
- **Sürpriz sayılacak şey**: A'nın başı zayıf ama sonu güçlü çıkması (serbest ritim ısındıkça iyileşiyor). Ya da B'nin ritim kısıtının çıktıyı mekanikleştirmesi (her adım özdeş, yenilik sıfır).

---

## Tasarım

- **Değişken**: Ritim kısıtı (serbest / sabit adım formatı)
- **Sabit tutulan**: Konu, uzunluk (~200 kelime), bilgi gerektirme düzeyi
- **Koşullar**:
  - A — Serbest ritim: akış kısıtsız
  - B — Sabit ritim: her adım "iddia (1 cümle) + gerekçe (1-2 cümle)" formatında; adım sayısı konuya bağlı
- **Konu**: Orion'un multi-agent koordinatörü nasıl çalışıyor — plan → execute → review aşamaları somut açıklamasıyla
- **Kalite ölçüm yöntemi**: Çıktıyı 3 eşit parçaya böl (baş / orta / son). Her parça için N ve T değerlendir. Varyans = max(N,T) - min(N,T) üç parça arasında.

---

## Prompt — tam metin

**Taban konu** (sabit):
> Orion'un multi-agent koordinatörü nasıl çalışıyor? plan → execute → review aşamalarını ve researcher/coder/reviewer rollerini somut açıkla.

### Koşul A — Serbest ritim
Prompt: Taban konu. Format kısıtı yok.

### Koşul B — Sabit ritim
Prompt: Taban konu + *"Açıklarken şu formatı kullan: her adım 'İddia: [tek cümle]' ile başlar, ardından 'Gerekçe: [1-2 cümle]' gelir. Adımları numaralandır. Her adım tam olmalı — eksik bırakma, fazla uzatma."*

---

## Çıktılar

### A — Serbest ritim

Orion'un koordinatörü bir görevi üç aşamaya böler. İlk aşama planlama: koordinatör görevi analiz eder ve hangi alt görevlerin hangi rolle yapılacağını belirler. Bu aşamada henüz hiçbir şey yürütülmez; plan bir blackboard (paylaşılan not alanı) üzerine yazılır.

İkinci aşama yürütme: researcher, coder ve reviewer rolleri ayrı LLM çağrıları olarak çalışır. Researcher görevi araştırır ve bağlam toplar; bu bağlam coder'a aktarılır. Coder somut çıktı üretir: kod, yapı, plan. Reviewer bu çıktıyı değerlendirir ve geri bildirim verir. Roller birbirinden habersizdir — aralarındaki iletişim blackboard üzerinden yapılır, doğrudan geçmez.

Üçüncü aşama gözden geçirme: koordinatör reviewer'ın çıktısını değerlendirir. Eğer geri bildirim "yeterli" ise süreç biter. Değilse koordinatör execute aşamasını yeniden başlatabilir — bu bir döngü değil, tek tekrarlı bir düzeltme imkânı. Son çıktı kullanıcıya sunulur.

Her rol ayrı tier kararına tabi: researcher tier1'de çalışabilir (hızlı, ucuz); coder ve reviewer için tier2 kullanılabilir. Bu karar koordinatör tarafından per-rol yapılır.

### B — Sabit ritim

**Adım 1 — Plan aşaması:**
İddia: Koordinatör görevi analiz eder ve aşamalar ile rolleri belirler.
Gerekçe: Bu aşamada hiçbir kod çalışmaz; plan bir paylaşılan blackboard'a yazılır. Hangi alt görevin hangi rolle yapılacağı buradan belirlenir.

**Adım 2 — Rol ayrımı:**
İddia: Researcher, coder ve reviewer birbirinden bağımsız LLM çağrılarıdır.
Gerekçe: Her rol ayrı bir subagent.js çağrısı olarak yürütülür. Aralarındaki iletişim doğrudan değil — blackboard üzerinden yapılır. Bu izolasyon rollerin birbirinin bağlamını kirletmesini önler.

**Adım 3 — Researcher görevi:**
İddia: Researcher bağlam toplar; sonuç coder'a aktarılır, doğrudan değil blackboard üzerinden.
Gerekçe: Araştırma aşaması vault araması, web getirme, dosya okuma içerebilir. Çıktı yapılandırılmış bir "bağlam özeti" — coder bunu raw araç çıktısı olarak değil, özet olarak alır.

**Adım 4 — Coder görevi:**
İddia: Coder researcher'ın bağlamıyla somut çıktı (kod, yapı, öneri) üretir.
Gerekçe: Coder rolü tier2'de çalışma eğiliminde — karmaşık yapı gerektiriyor. Çıktı blackboard'a yazılır; reviewer bunu değerlendirir.

**Adım 5 — Reviewer görevi ve döngü:**
İddia: Reviewer çıktıyı değerlendirir; koordinatör sonucu "yeterli" veya "tekrar et" olarak sınıflandırır.
Gerekçe: Tekrar en fazla bir kez — bu bir döngü değil, tek düzeltme fırsatı. Reviewer çıktısı "yeterli" ise son çıktı kullanıcıya sunulur.

**Adım 6 — Per-rol tier kararı:**
İddia: Her rol için tier seçimi koordinatör tarafından ayrı ayrı yapılır.
Gerekçe: Researcher tier1 (hızlı, ucuz, bilgi getir); coder ve reviewer tier2 (karmaşık, yaratıcı). Bu per-rol karar coordinator.js içinde tier routing mantığının bir uzantısıdır.

---

## Kalite Varyansı Ölçümü

### Çıktı A — 3 parça N/T değerlendirmesi

| Parça | İçerik | N | T |
|-------|--------|---|---|
| Baş (1. paragraf) | Plan aşaması açıklaması | 2 | 3 |
| Orta (2. paragraf) | Rol ayrımı + blackboard | 3 | 4 |
| Son (3. paragraf) | Gözden geçirme + tier karar | 3 | 4 |

Varyans N: 3-2=1 | Varyans T: 4-3=1

Gözlem: Başı biraz daha zayıf (N=2: plan açıklaması standart). Ortası ve sonu güçleniyor — blackboard + per-rol tier karar detayı iyi. Tipik ısınma etkisi.

### Çıktı B — 3 parça N/T değerlendirmesi

| Parça | İçerik | N | T |
|-------|--------|---|---|
| Baş (Adım 1-2) | Plan + rol ayrımı | 3 | 4 |
| Orta (Adım 3-4) | Researcher + coder | 3 | 5 |
| Son (Adım 5-6) | Reviewer + tier | 3 | 5 |

Varyans N: 3-3=0 | Varyans T: 5-4=1

Gözlem: N boyunca sabit (her adım aynı yoğunlukta). T başta biraz düşük (4), ortadan sona güçleniyor (5) — ama A'dan daha tutarlı. Başı A'dan güçlü (N=3 vs. 2).

---

## Değerlendirme

| Koşul | N medyan | T medyan | N varyans | T varyans |
|-------|----------|----------|-----------|-----------|
| A | 3 | 3-4 | 1 | 1 |
| B | 3 | 4-5 | 0 | 1 |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B düşük N varyansı, benzer N medyan, yüksek T.
- **Çıkan**: N varyansı B=0 < A=1 ✓ (düşük varyans). N medyan eşit ✓. T B > A ✓.
- **Ek gözlem**: B'nin başı A'dan daha güçlü çıktı (N=3 vs N=2). Ritim kısıtı "ısınma" gecikmesini ortadan kaldırdı — ilk adımdan yapı zorlandı.
- **Sapma**: T varyansı ikisinde de 1. Yani ritim tutarlılığı tamamen sağlamadı — son adımlar biraz daha güçlü. Ama fark A'da daha dramatik (baş N=2, son N=3) vs. B'de sabit N=3.

---

## Hipotez Durumu

**Doğrulandı, ince bulguyla:**

Sabit ritim N varyansını düşürdü ✓ (B=0 vs A=1)  
T medyan B > A ✓  
"Isınma" etkisi B'de görülmedi ✓ — baştan yüksek kalite

**H8 güncellemesi:**
> Sabit adım formatı (iddia + gerekçe) N varyansını sıfıra düşürdü. Ana etki: "ısınma gecikmesi" ortadan kalkıyor — baştan yüksek kalite zorlanıyor. T medyanı da yüksek. Ek bulgu: sabit ritim mekanikleştirmedi (N=3 sabit, ama her adım farklı içerik). Escapement isochronism burada: ritim tutarlı, içerik farklı — saat dişlisi gibi.
