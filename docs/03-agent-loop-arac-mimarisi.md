# 3. Agent Loop ve Araç (Tool) Mimarisi

**Perspektif:** Model bir mesaja cevap verirken bir aracı nasıl çağırıyor,
sonuç modele nasıl geri dönüyor, ve bu döngü ne zaman/nasıl duruyor?

## 3.1 Dört loop, bir ortak çekirdek

`core/loops/` altında dört dosya var: `anthropic.js`, `ollama.js`,
`ollama_react.js`, `openai.js`. Hepsi `core/loops/shared.js`'den şu ortak
sabitleri paylaşır (`shared.js:10-23`):

- `MAX_ITERS = 40` — bir turda en fazla 40 model↔araç dönüşü.
- `TIER1_TOOLS` — Ollama'ya (yerel model, sınırlı bağlam) izin verilen araç
  alt kümesi (12 araç: think, read/write/edit/multi_edit, list/glob/search,
  file_info/file_outline, read_many_files, run_command).
- `PARALLEL_SAFE` — yan etkisiz araçlar (read_file, search, git_status, ...)
  birden fazla çağrı aynı turda geldiyse **paralel** çalıştırılabilir
  (`openai.js:50-51`, `_canParallel` kontrolü).

Ortak akış şeması (dört loop'ta da aynı iskelet):

```
for iter in 0..MAX_ITERS:
    model'e geçmiş + araç tanımları gönder
    if model araç çağırmadı: finalText = cevap; DUR
    her araç çağrısı için:
        izin kontrolü (session.modes.canUse)
        aynı araç+argüman art arda mı? (lastCallSig) → tekrar çalıştırma, modele uyar
        çalıştır (_callToolCached) → sonucu geçmişe ekle
    devam et
if 40 iterasyon bitti ve finalText yok:
    "Max iterations reached" uyarısı
```

Bu tekrar deseni **kasıtlı olarak kopyalanmış**, tek bir ortak `runLoop()`
fonksiyonuna çıkarılmamış — çünkü her backend'in native tool-calling formatı
farklı (Anthropic content-block akışı vs. OpenAI `tool_calls` delta'ları vs.
Ollama'nın `<<<TOOL>>>` metin formatına düşüşü). Bunun bedeli: `MAX_ITERS`
davranışı gibi ortak bir kural değiştirileceğinde 4 dosyanın da tek tek
kontrol edilmesi gerekiyor (`grep MAX_ITERS` dört loop dosyasında da eşleşir).

## 3.2 Tekrar-tespiti — `makeRepeatDetector` (çok-adımlı döngü farkında)

Başlangıçta her loop yalnızca **bir önceki** çağrıyla karşılaştırma
yapıyordu (`lastCallSig === sig`) — A→B→A→B gibi 2-adımlı bir döngü bu
kontrolü atlatıp `MAX_ITERS` dolana kadar sessizce sürebiliyordu (bu tam
olarak `06-vaka-analizi` dosyasındaki "Max iterations reached" gözlemine
yol açan mekanizmaydı). Bunu gidermek için `shared.js`'e
`makeRepeatDetector(historySize=6, minRepeats=3)` eklendi: son 6 çağrı
imzasını tutuyor, aynı imza art arda olmasa bile 3+ kez görülürse
**cyclical** olarak işaretliyor. Dört loop dosyası da (`anthropic.js`,
`openai.js`, `ollama.js`, `ollama_react.js`) artık bu ortak dedektörü
kullanıyor — `repeated` bayrağı hem "art arda aynı çağrı" hem "döngüsel
tekrar eden çağrı" durumunu kapsıyor; `ollama_react.js` döngü tespit
edildiğinde turu tamamen durduruyor, diğer üçü modele "aynı sonuç yukarıda,
cevabını yaz" nüdge'i veriyor.

## 3.3 Araç kayıt defteri — `core/tools.js`

Tüm araçlar iki kümede toplanır (`tools.js:39-52`):

- `STATIC_DEFS` — `tools/fs.js`, `shell.js`, `memory.js`, `vault.js`,
  `web.js`, `git.js` modüllerinden derlenen sabit liste + tek yerleşik araç
  `think` (yan etkisiz, `_executeBuiltin`).
- `DYNAMIC` — MCP sunucuları gibi çalışma zamanında `registerDynamic()` ile
  eklenen araçlar (ör. Moltbook — kullanıcı açıkça `registerMoltbook()`
  çağırmadıkça hiçbir oturumda görünmez, `tools.js:76-89`).

`callTool()` (tools.js:112-148) her çağrıda `tool_start`/`tool_end` olayı
yayınlar ve sonucu **50KB'de kırpar** (`TOOL_RESULT_CAP`, tools.js:104-110)
— baş 1/4 + kuyruk 3/4 oranıyla (kuyruk genelde sonucu/hatayı taşır). Bir
aracın çıktısı bu sınırı aşarsa model gördüğü metnin ortası eksik olur; bu
sessiz bir bilgi kaybı, modele "kırpıldı" notu düşülüyor ama hangi kısmın
eksik olduğu modele bağlı bir çıkarım.

## 3.4 `_callToolCached` — speculex önbelleği ile araç çağrısı arasındaki köprü

`shared.js:45-66` — her araç çağrısı önce `specCache.get()`'e bakar (tier2
turlarında Ollama'nın önceden tahmin ettiği salt-okunur sonuçlar burada
olabilir). Cache hit ise gerçek araç hiç çalışmaz, `speculex_hit` olayı
yayınlanır ve telemetriye `latencyMs: 0` yazılır. Bu, [01](01-runtime-surec-mimarisi.md)
§1.2 adım 5'teki prefetch mekanizmasının tüketici ucu — yazma araçları
(`_WRITE_TOOLS`) asla spekülatif çalıştırılmaz, sadece izlenir
(`touchedFiles` set'ine eklenir, compact() sırasında "artifact index" olarak
kullanılır, session.ts:759-763).

## 3.5 `<think>` filtreleme — stream'den görünmez blokları ayıklama

`makeThinkFilter()` (shared.js:116-146) token-bazlı bir state machine:
Ollama modelleri bazen `<think>...</think>` blokları stream ediyor, bunlar
kullanıcıya gösterilmemeli. Zorluk, açma/kapama etiketlerinin birden fazla
token'a bölünebilmesi — fonksiyon bunun için son 7 karakteri buffer'da tutup
etiketin parçalı gelme ihtimaline karşı koruma sağlıyor (yorum satırları
shared.js:110-113'te bu tasarım kararını açıklıyor). Bu, yakın geçmişte
(`0a6a621`, `918f9b1` commit'leri) düzeltilen bir bug'ın kalıcı çözümü —
bölünmüş etiketlerin filtrelemeyi atlatması sorunu.

## 3.6 Model uyumsuzluğu — Jinja şablon hatası ve otomatik telafi

`backends/ollama.js` + `core/loops/ollama.js` içinde yakın zamanda eklenen
bir uyumluluk katmanı (`87657ed` commit): bazı yerel modeller (qwen2.5 gibi)
sohbet şablonlarında `role:"tool"` mesajlarını işleyemiyor ve "No user query
found" Jinja hatası veriyor. Akış:

1. `backends/ollama.js` bu hata deseni yakalanınca `err.ollamaJinjaError = true`
   işaretler.
2. `ollama.js` loop'u bunu görünce geçmişi `_toCompatHistory()` ile
   `role:"tool"` → `role:"user"` (`[araç_adı result]\n...` formatında)
   dönüştürüp **aynı turu bir kez daha** dener.
3. Bu telafi de `noToolSupport` hatasıyla başarısız olursa ReAct fallback'e
   (`_ollamaReactLoop`) düşülür.

Bu, "farklı model ailelerinin farklı sohbet şablon tuhaflıkları" sınıfına
giren bir sorunun tipik çözüm deseni: hata imzasını tanı → geçmişi o modele
uygun forma çevir → yeniden dene. Yeni bir model ailesi eklenirken benzer
tuhaflıklar (ör. sistem mesajı desteklememe, farklı tool-call JSON şeması)
aynı desenle ele alınabilir.

## 3.7 Mod tabanlı izin katmanı

`session.modes.canUse(toolName)` (`core/modes.js`, `ModeManager` sınıfı) her
araç çağrısından önce kontrol edilir — reddedilirse `approval_request`/
`approval_resolved` olay çifti yayınlanır ve araç hiç çalıştırılmaz (loop'lar
`perm.ok` kontrolüyle bunu try/catch dışında, çağrı öncesinde ele alır). Bu
katman loop'ların *içinde* yaşıyor, `tools.js`'de değil — yani bir aracın
"izinli mi" sorusu her backend loop'unda ayrı ayrı sorulan, merkezi olmayan
bir kontrol. `coordinator.js`'in rol bazlı araç kısıtlaması (researcher
yazamaz, coder her şeyi yapabilir) ise ayrı bir mekanizma — subagent'a
prompt içinde metinsel talimat olarak veriliyor, `ModeManager` seviyesinde
zorunlu kılınmıyor (bkz. [05](05-guvenlik-cok-ajan-mimarisi.md)).
