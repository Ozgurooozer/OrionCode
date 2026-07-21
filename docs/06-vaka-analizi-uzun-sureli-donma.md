# 6. Vaka Analizi: "sorun nedir" Sonrası Uzun Süreli Sessizlik

**Yöntem:** Önce ham log'daki gözlemleri zaman sırasına koy, sonra her
gözlemi doğrudan kaynak koduna bağla, sonra "neden böyle görünüyor"
sorusunu mimari terimlerle cevapla. Amaç tek bir hatayı düzeltmek değil —
bu türden görünümlerin **hangi mimari kararlardan kaynaklandığını**
genellemek.

## 6.1 Ham gözlemler (zaman sırasıyla)

```
1. Ozyn bir HTML5 oyunu istiyor (echo_soul.html) — agent modu
2. write_file → dosya yarım yazılmış (184 satır, fonksiyon eksik)
3. read_file ile mevcut hal kontrol ediliyor
4. vault: skipped [...] — too similar to ... (85-93%)   ×6
5. "! Max iterations (40) reached without a final response."
6. Model: openrouter/tencent/hy3:free · agent · ↑10.7k ↓12 · local·$0 · ctx %4
7. vault: saved [...] (novelty: 34%)
8. vault: skipped [...] ×5 (tekrar)
9. Ozyn: "sorun nedir"
10. "Still working... (30s)" / "(60s)" / "(90s)" — sonra hiçbir çıktı yok
```

## 6.2 Gözlem 2-3: Neden dosya yarım yazıldı?

`echo_soul.html` 184 satırda kesilip `aabb` fonksiyonu eksik kalmış. Bunun
olası iki mimari nedeni var:

- **Token limiti** — `chatRich()` çağrısına `maxTokens` geçiriliyor
  (`backends/openai-compat.js:141`, `payload.max_tokens = maxTokens`).
  `router.ts:66-67`'deki `maxOutputTokens` varsayılanı 8192, ama
  `tencent/hy3:free` gibi ücretsiz OpenRouter modellerinde sağlayıcı
  tarafında daha düşük bir sert limit olabilir — model `write_file` aracını
  tek çağrıda tüm dosyayı üretecek şekilde çağırdıysa ve çıktı o limitte
  kesildiyse, üretilen JSON argümanı da yarım kalır.
- **Zayıf model + tek-seferde-büyük-dosya deseni** — sistem promptu ısrarla
  "Kodu asla kırpma — tam implementasyon yaz" diyor (session.ts:159/196) ama
  bu bir *talimat*, teknik bir sınır değil. Ücretsiz/küçük bir model bu
  talimata güvenilir şekilde uymayabilir.

`tools.js:104-110`'daki 50KB `TOOL_RESULT_CAP` bunun **tersi yönü** için
var (araç *çıktısını* kırpmak) — modelin ürettiği `write_file` *girdisinin*
kesilmesini önleyen bir mekanizma kod tabanında yok.

## 6.3 Gözlem 4, 7, 8: Vault "skipped/saved" mesajları — asıl akışla ilgisiz gürültü

Bu mesajlar `core/daemon.js` worker thread'inden geliyor (bkz.
[04](04-veri-kalicilik-mimarisi.md) §4.4) — **ana konuşma döngüsüyle aynı
süreç değil**. `checkNovelty()` (daemon.js:195-231) arka planda, oturum
dosyaları değiştikçe tetikleniyor ve `SHANNON_THRESHOLD=0.82` üstü
benzerlikte içerik atılıyor. Loglardaki "%85-93 benzer" oranları, kısa
aralıklarla çok benzer konuşma parçaları üretildiğini gösteriyor — bu da
6.2'deki "model aynı dosyayı defalarca yazmaya çalışıyor" hipotezini
destekliyor (tekrarlayan, birbirine çok benzeyen turlar → daemon'a çok
benzer "bilgi" olarak düşüyor → çoğu reddediliyor).

**Mimari çıkarım:** Arka plan işçilerinin (daemon) çıktısı ile ana ajan
döngüsünün çıktısı aynı terminal/log akışında karışıyor. Bunları ayrı
etiketlemeden (ör. `[daemon]` öneki gibi) okuyan biri, "sistem bir şeyle
meşgul" izlenimine kapılıp bunu asıl sorunla (donma) karıştırabilir —
tam olarak bu log'da olan şey.

## 6.4 Gözlem 5: "Max iterations (40) reached" — döngü neden kırılmadı?

`core/loops/openai.js:23-90` (bu model openrouter/openai-compat ailesinde,
`_openaiFamilyLoop` kullanılıyor — session.ts:614-615) her iterasyonda
`lastCallSig`'i **yalnızca bir önceki** çağrıyla karşılaştırıyor
(openai.js:46-48). Model her seferinde biraz farklı argümanla (ör. dosyanın
kalan kısmını farklı bir parçalama ile) `write_file`/`edit_file` çağırıyorsa
`sig === lastCallSig` hiç `true` olmaz, "tekrarlayan çağrı" uyarısı hiç
tetiklenmez ve döngü 40 iterasyonu tüketene kadar sessizce devam eder
(bkz. [03](03-agent-loop-arac-mimarisi.md) §3.2). 40 iterasyon dolunca
`finalText` boş kaldığı için son satırda uyarı basılıyor
(openai.js:92-97) — bu beklenen, kodun **doğru çalıştığı** bir durum; asıl
soru neden modelin 40 turda bir final metne ulaşamadığı, ki bu da zayıf/
ücretsiz modelin görev karmaşıklığına (tek dosyada 180+ satırlık oyun kodu)
göre yetersiz kalmasıyla açıklanabilir.

## 6.5 Gözlem 9-10: "sorun nedir" sonrası 90s+ sessizlik — asıl soru

Kullanıcı yeni bir mesaj gönderdiğinde `session.send()` yeniden baştan
çalışır (session.ts:318 vd.) — önceki turun `MAX_ITERS` uyarısı yeni turu
etkilemez, temiz bir başlangıçtır. Sessizliğin kaynağı **heartbeat
mimarisinin kendisi**:

```
t=0    → istek gönderilir (openai-compat: req.setTimeout(180000))
t=30s  → "Still working... (30s)"
t=60s  → "Still working... (60s)"
t=90s  → "Still working... (90s)"
t=90s+ → HİÇBİR ÇIKTI — ama istek hâlâ canlı olabilir, ta ki:
t=180s → idle timeout dolarsa "timeout (180s)" hatası basılır
         VEYA
t=?    → model nihayet cevap verirse akış devam eder
```

`_STUCK_INTERVALS = [30, 60, 90]` (session.ts:474) **sabit 3 elemanlı bir
dizi** — `_stuckIdx < _STUCK_INTERVALS.length` koşulu 90s'den sonra hep
`false` olduğu için `setInterval` 30 saniyede bir tetiklenmeye devam etse
de artık hiçbir şey yazdırmıyor (session.ts:476-484). Bu, kod açısından bir
"bug" değil — bilinçli bir tasarım: kullanıcıyı spam'lememek için 3 uyarıyla
sınırlamış. Ama **yan etkisi**, ağ isteğinin izin verilen süresi (180s,
`openai-compat.js:205`) heartbeat'in sustuğu noktadan (90s) çok daha uzun
olduğu için, kullanıcı gördüğü son mesajdan sonra sistemin **hâlâ
tamamen normal, bekleneni yaptığı** 90 saniyelik bir pencere yaşıyor ve bunu
"donmuş" olarak yorumluyor.

Buna ek olarak, ücretsiz `tencent/hy3:free` modeli muhtemelen OpenRouter'ın
ücretsiz kuyruğunda — yanıt gecikmesi ücretli modellere göre çok daha
değişken olabilir, 90-180s aralığında bir yanıt hiç de anormal değil.

## 6.6 Kök neden özeti

| # | Gözlemlenen davranış | Mimari kaynak | Durum |
|---|---|---|---|
| Dosya yarım yazıldı | Model çıktı token limiti / talimata uymama | Kısmen düzeltildi — `openai.js` artık `finish=length`'i uyarıyor (§6.7.4); argümanın kendisini reddetmek kapsam dışı |
| Vault spam log'a karışıyor | daemon.js worker + ortak terminal akışı | **Düzeltildi** — `[daemon]` etiketi eklendi (§6.7.2) |
| 40 iterasyon tüketildi, tekrar tespit edilmedi | `lastCallSig` tek-adım geriye bakış | **Düzeltildi** — `makeRepeatDetector` çok-adımlı döngüleri yakalıyor (§6.7.3) |
| "sorun nedir" sonrası 90s+ sessizlik | Heartbeat 3 mesajla sınırlı (90s) vs. ağ timeout'u 180s | **Düzeltildi** — heartbeat artık istek bitene kadar sürüyor (§6.7.1) |

## 6.7 Bu vakadan çıkan düzeltmeler (uygulandı)

Aşağıdaki dört gözlem, bu doküman ilk yazıldıktan sonra kod tabanına
uygulandı. Her biri yukarıdaki bölümlerin doğrudan karşılığı:

1. **Heartbeat artık ağ isteği canlı olduğu sürece devam ediyor.**
   `session.ts` — sabit 3 mesajlık (`_STUCK_INTERVALS=[30,60,90]`) sınır
   kaldırıldı; `setInterval` artık `_callWithFallback()` bitene kadar her
   30 saniyede bir "Still working..." yazmaya devam ediyor. Ağ isteğinin
   izin verilen süresi (`openai-compat.js:205`, 180s) ile heartbeat artık
   aynı pencereyi kapsıyor — "sessizlik = donma" yanılgısı ortadan kalktı.
2. **Vault daemon çıktısı `[daemon]` etiketiyle görsel olarak ayrıldı.**
   `orion.js` — `vault_updated`/`vault_skipped`/`digest_ready`/`daemon_error`
   olaylarının hepsi artık `C.dim("[daemon]")` öneki taşıyor. Log'u okuyan
   artık "şu an bekleyen ana ajan turu" ile "arka planda biten vault işi"ni
   ayırt edebiliyor.
3. **Tekrar tespiti çok-adımlı döngüleri de yakalıyor.** `core/loops/shared.js`
   içine `makeRepeatDetector(historySize=6, minRepeats=3)` eklendi — son 6
   çağrı imzasının en az 3'ü aynıysa (A-B-A-B gibi art arda olmayan
   döngüler dahil) "cyclical" olarak işaretleniyor ve modele erken uyarı
   veriliyor (`ollama_react.js`'te döngü tespit edilince tur tamamen
   duruyor; diğer üç loop'ta modele nüdge veriliyor). Dört loop dosyası da
   (`anthropic.js`, `openai.js`, `ollama.js`, `ollama_react.js`) bu ortak
   dedektörü kullanıyor — artık `MAX_ITERS` dolana kadar sessiz kalan bir
   2-adımlı döngü senaryosu erken yakalanıyor.
4. **`openai.js` loop'u artık kesilmiş yanıtı fark ediyor.** `anthropic.js`
   zaten `stop_reason === "max_tokens"` durumunda uyarı basıyordu; aynı
   desen `openai.js`'e de eklendi (`r.finish === "length"` →
   "Response truncated (max_tokens/finish=length)"). Ollama backend'i
   (`backends/ollama.ts`) şu an bir `finish`/`done_reason` alanı
   döndürmüyor — bu yüzden `ollama.js`/`ollama_react.js` için aynı uyarı
   henüz eklenemedi; bu, backend katmanında ayrı bir iş kalemi.

5. **Kesik araç çağrısı artık hiç çalıştırılmıyor.** (İkinci vaka
   tekrarından sonra eklendi.) İki katmanlı düzeltme:
   - `backends/openai-compat.js` — argüman JSON'u parse edilemediğinde
     eskiden sessizce `input = {}` yapılıyordu (aracın boş/yanlış argümanla
     çalışmasına yol açıyordu); artık o çağrı `argsTruncated: true` ile
     işaretleniyor.
   - `core/loops/openai.js` — `finish === "length"` veya `argsTruncated`
     görülürse araç **çalıştırılmıyor**; her çağrıya tool-result olarak
     "çıktın max_tokens'da kesildi, aynı büyük çağrıyı tekrar deneme, işi
     parçalara böl: ilk parçayı write_file, kalanını edit_file ile ekle"
     talimatı dönülüyor ve `tool_call_truncated` telemetri olayı
     kaydediliyor. Böylece yarım dosya yazma → hata → aynı büyük çağrıyı
     tekrar deneme → MAX_ITERS tükenmesi zinciri kökünden kırılıyor: model
     ilk kesikte işi bölmesi gerektiğini öğreniyor.
