# 2. Yönlendirme (Routing) ve Öğrenme Mimarisi

**Perspektif:** Her kullanıcı mesajı için "bunu yerel Ollama mı, bulut modeli
mi cevaplasın?" kararı nasıl veriliyor — ve bu karar zamanla nasıl öğreniyor?

## 2.1 Karar zinciri — dört katman, sırayla filtreleme

```
router.decide(text, opts)
   └─ _decideCore()               kural tabanlı ilk karar
         ├─ budgetMode kontrolü   (quality / aggressive / balanced)
         ├─ token eşiği           (complexityTokenThreshold, varsayılan 800)
         ├─ anahtar kelime skoru  (complexityScore ≥ 2 → tier2)
         └─ _applyThompson()      öğrenen düzeltme katmanı
   └─ freeenergy.shadowHook()     gölge karar — GERÇEK KARARI DEĞİŞTİRMEZ
```

`_decideCore()` (`core/router.ts:124-162`) tamamen kural tabanlı ve
deterministik: `budgetMode` moduna göre erken dönüşler var (`quality` →
bütçe dolmadıkça hep tier2; `aggressive` → context >4000 token değilse hep
tier1). Varsayılan `balanced` modda sırasıyla: chat modu mu (→tier1), bütçe
aşıldı mı (→tier1), token sayısı eşiği aştı mı (→tier2), karmaşık anahtar
kelime var mı (→tier2), yoksa tier1.

`complexityScore()` basit bir regex sayacı: `COMPLEX_WORDS` (debug, refactor,
implement, security, ...) sayısı eksi `SIMPLE_WORDS` (summarize, list,
format, ...) sayısı (router.ts:100-107). **Bu tamamen İngilizce kelimeler
üzerinden çalışıyor** — Türkçe bir istekte ("hatayı düzelt", "test yaz")
anahtar kelime skoru hep 0 çıkar, yani Türkçe isteklerde bu katman fiilen
devre dışı ve karar token eşiğine kalır. Bu, dilin routing kalitesini
görünmez şekilde etkilediği bir noktadır.

## 2.2 Thompson Sampling — kural kararını sonradan düzelten katman

`core/thompson.js` her `(taskClass, tier)` çifti için bir Beta(a,b) dağılımı
tutar (`chat`/`simple`/`token`/`complex` × tier 1/2 = 8 hücre). Akış:

1. Her turdan sonra `session.ts:521-523` — eğer fallback devreye girmediyse
   `thompson.update(tier, reason, success)` çağrılır. `success` şu an **her
   zaman `true`** olarak geçiliyor (backend hata fırlatmadıysa) — yani
   Thompson öğrenmesi bugün için "hangi tier hiç patlamadan cevap verdi"
   sinyaline dayanıyor, cevabın *kalitesini* ölçmüyor.
2. `recommend()` (thompson.js:107-133) — `minObs=8` gözlemden azsa kural
   kararına dokunmaz (soğuk başlangıç koruması). Yeterli veri varsa 5 Beta
   örneği ortalanır; fark `overrideThreshold=0.18`'i aşarsa kural kararı
   **override** edilir.
3. Disk yazımı debounce'lı (5sn, `_writeTimer.unref()` — süreç çıkışını
   engellemiyor) + `process.on("exit", _persist)` ile son anlık flush
   (thompson.js:73-89).

Bu katmanın önemli bir sonucu: routing kararı artık salt statik kural
değil, **oturumlar arası kalıcı devlet** (`~/.orion/thompson.json`) taşıyor.
Bir kullanıcının geçmiş kullanımı, gelecekteki farklı bir görevin
yönlendirmesini etkileyebilir — global, workspace'e özel değil.

## 2.3 FEP gölge modu — kararı etkilemeyen paralel deney

`core/freeenergy.js`, `pragmaticValue(tier) + epistemicValue(tier, surprise)
* lambda` formülüyle alternatif bir skor hesaplar (freeenergy.js:36-39).
`lambda=0` varsayılanında tier2 her zaman kazanır (`PRAGMATIC = {1:0.4,
2:0.8}`) — yani gölge mod bugünkü ayarlarla pratikte hep "tier2" öneriyor,
tier1'in epistemik (keşif) değeri devre dışı. `router.decide()` içinde
`shadowHook()` çağrısı **kendi try/catch'i içinde guard'lı** — gölge hesap
patlarsa gerçek karar etkilenmez (router.ts:109-122). Sonuç
`router_shadow_decision` olayı olarak telemetriye düşer, gerçek routing'e
hiç geri beslenmez. Bugün için bu tamamen gözlem amaçlı bir A/B çerçevesi —
`lambda>0` yapılıp gerçek karara bağlanmadan önce ayrı bir karar konusu.

## 2.4 Bütçe — routing kararının bir başka girdisi

`core/budget.js` `BudgetTracker` (per-session, `sessionBudgetUSD` varsayılan
$1.0) her turda gerçek/tahmini token ve maliyeti biriktirir. `router.decide()`
'a `budgetTracker` opsiyonel olarak geçiriliyor ve `isExceeded()` sonucu
karar ağacında en yüksek önceliğe sahip (quality modunda bütçe aşımı tier1'e
zorlar; balanced modda da öncelikli kontrol). Fiyat tablosu (`PRICES`,
budget.js:6-14) elle bakımlı bir sabit — yeni bir model eklendiğinde burada
güncellenmezse maliyet hesabı sessizce yanlış (fallback: bilinmeyen model
için tahmini karakter/4 hesaplaması) olur; bu satır hem `core/session.ts`
hem `core/coordinator.js` maliyet gösterimini besliyor.

## 2.5 Fallback zinciri — routing kararının başarısızlık durumunda yedeği

Routing "hangi backend"i seçtikten *sonra*, `_buildFallbackChain()`
(session.ts:587-598) o kararı bir zincire genişletir: seçilen birincil →
`cfg.tier2Backend` → sabit `openrouter/openai/gpt-4o-mini` → `ollama`
(tier1 varsayılan modeli). `_callWithFallback()` (session.ts:540-585)
zinciri sırayla dener; bir adım hata verirse `_usedFallback=true` işaretlenir
ve **Thompson güncellemesi birincil rotaya başarı olarak yazılmaz** —
fallback'in kendisi başarı/başarısızlık öğrenmesine hiç girmiyor, sadece
"bu tur birincille bitmedi" bilgisi kayboluyor. Bu, öğrenen router'ın
fallback senaryolarında kör noktası.

## 2.6 Özet tablo — kararı etkileyen tüm girdiler

| Girdi | Nerede okunur | Kalıcı mı? |
|---|---|---|
| `budgetMode`, `complexityTokenThreshold` | `~/.orion/config.json` | Evet, kullanıcı ayarı |
| Anahtar kelime skoru (İngilizce) | `router.ts` regex, request-time | Hayır |
| Thompson Beta durumu | `~/.orion/thompson.json` | Evet, global |
| Bütçe durumu | `BudgetTracker` (session ömrü) | Hayır, oturum başına sıfırlanır |
| FEP gölge kararı | telemetry log | Sadece gözlem, karara girmez |
