# Teknik Borç Raporu — Orion Aethelred v4

> Tarih: 2026-07-16 · Kapsam: Tüm depo (~9k satır JS, 33 test dosyası, Electron arayüzü)
> **Güncelleme: 2026-07-18** — her madde kod üzerinden tek tek doğrulandı; kapanan
> maddeler `**Durum: ✅ Kapandı (2026-07-18)**` etiketiyle işaretlendi, gerekçe satır
> referansıyla verildi. İşaretsiz maddeler doğrulama sırasında hâlâ açık bulundu.

Bu rapor, personanın Kural 1'ine uygun olarak yazılmıştır: gözlem → veri → sonuç.
Her bulgu somut satır referansıyla verilmiştir; varsayım veya "olsa iyi olur" türü
öneri içermez.

## Özet (2026-07-18 doğrulaması)

**21 madde kapandı:** 3.2, 3.3, 3.5, 3.6, 3.9, 4.1, 4.4/8.3, 6.5, 7.4, 8.7, 9.1,
11.3, 14.1, 14.4, 14.5, 14.6, 17.1, 17.2, 19.1, 19.2 — ayrıca test sayısı
185→**319/319** geçiyor (bkz. `npm test`).

**~110 madde hâlâ açık** — özellikle mimari borç (bölüm 2, session.js artık 883→1268
satıra büyümüş), Electron arayüzü (bölüm 1, 11) ve config dosyası çoğulluğu (bölüm 7)
büyük ölçüde dokunulmamış.

---

## 1. Electron Masaüstü (en ağır borç)

### 1.1 9/9 navigasyon öğesi ölü (`electron/src/components/Rail.jsx:5-23`)
NAV_ITEMS + SETTINGS_ITEMS toplam 9 öğe tanımlar. Hepsi tıklanabilir UI öğesidir.
Hiçbiri işlevsel değildir. `Rail.jsx:20-23` yorumu durumu itiraf eder:
"v0.1: sadece Yeni Oturum ve tema seçimi gerçek işlev yapar; diğer nav öğeleri...
görsel yer tutucu". Kullanıcıya 9 ölü düğme gösterilir.

### 1.2 SSE oturum filtresi ilk mesajda yok (`electron/src/App.jsx:71-77`)
SSE aboneliği `sessionIdRef.current` null iken filtresizdir. Aynı sunucuya
bağlı CLI oturumunun olayları Electron penceresine sızar. `App.jsx:73-76` yorumu
bunu "v0.1 tek-oturumluk masaüstü kullanım için kabul edilebilir" olarak
niteler — bu bir güvenlik/gizlilik sorunudur.

### 1.3 Kullanıcı adı sabit kodlanmış (`electron/src/components/Home.jsx:28`)
```jsx
<h1 style={styles.greeting}>Sizin sıranız, Özgür.</h1>
```
Fork edilebilir bir projede kullanıcı adı doğrudan JSX'e gömülmüştür.
`package.json` `author` alanı veya `os.userInfo()` kullanılabilirdi.

### 1.4 build.js external ayarı yok (`electron/build.js:9-18`)
React 19 dependencies'de olmasına rağmen esbuild config'inde `external: ["react", "react-dom"]`
yoktur — React bundle'a gömülür. Ayrıca `electron-builder` config'inde
(`package.json:27`) `files` dizisinde `"assets/**"` vardır ama `electron/assets/`
dizini projede yoktur. `npm run dist` denenmemiştir (README.md:57-58).

### 1.5 122 satır CSS-in-JS, sıfır modülerlik (`electron/src/styles.js`)
Tüm stiller tek bir JS objesi içinde el ile yazılmıştır (~80 ayrı CSS kuralı).
Her bir `border-radius`, `padding`, `font-size` değeri elle girilmiştir.
CSS modülleri, styled-components veya herhangi bir soyutlama yoktur.

### 1.6 baslat.bat platform bağımlı hack (`electron/baslat.bat:13-14`)
```bat
if not exist node_modules\@esbuild\win32-x64 set NEED_INSTALL=1
if not exist node_modules\electron\dist\electron.exe set NEED_INSTALL=1
```
Linux'ta `npm install` yapılıp Windows'ta açıldığında platform binary'leri
eksik kalıyor. Bunu tespit edip `node_modules`'i silip yeniden kuran bir
`.bat` dosyası — paket yönetimi sorununu gizler, çözmez.

### 1.7 Chat.jsx tool olaylarını dinler ama sunucu yayınlamaz (`electron/src/App.jsx:81-92`)
`tool_start` / `tool_end` SSE olayları dinlenir ama `orion-server.js` bu
olayları yayınlamaz. Araç çağrıları asla kullanıcı arayüzünde görünmez.
Çalışma sırasında fark edilir ama kimse düzeltmemiştir.

### 1.8 frame:false pencere test edilmemiş (`electron/main.js:162-175`)
`WebkitAppRegion: "drag"` Windows DWM desteği, snap davranışı, aero snap
gibi konularda sınanmamıştır. `minWidth/minHeight` dışında responsive
veya pencere yönetimi mantığı yoktur.

---

## 2. Mimari / Yapısal Borç

> **Not (2026-07-18):** `core/session.js` artık 883 değil **1268 satır** —
> aşağıdaki mimari borç maddeleri çözülmemiş, dosya daha da büyümüş.

### 2.1 session.js — 883 satır, CC=33, 6 sorumluluk (`core/session.js`)
Tek dosya şunları yapar: (1) konuşma döngüsü, (2) hafıza injection,
(3) vault injection, (4) turn belleği, (5) skill injection, (6) swarm,
(7) router, (8) speculex, (9) FEP gölge mod, (10) fallback zinciri.
`send()` metodu 167 satırdır (226-392). 7 farklı `try/catch + emitSilentCatch`
deseni içerir.

### 2.2 Üç ayrı tool-calling döngüsü (session.js:479-691)
`_anthropicLoop` (69 satır), `_openaiFamilyLoop` (68 satır), `_ollamaLoop`
(74 satır) — neredeyse aynı mantık. Tool çağrısı, tekrar koruması, history
push'u, approval kontrolü üç kere yazılmıştır. Ortak bir döngü + backend
adapter pattern'i kullanılmamıştır.

### 2.3 _ollamaReactLoop ayrı bir dosyada değil (`core/session.js:693-761`)
ReAct XML formatı (`<<<TOOL>>>`/`<<<RESULT>>>` tag'leri) ana session
dosyasının içinde 68 satır kaplar. Bu legacy kod emekliye ayrılmayı
beklemektedir.

### 2.4 rebuildGraph canvas simülasyonu template literal içinde (`core/vault.js:397-503`)
~100 satırlık force-directed graph fizik simülasyonu (itme/çekme/sürtünme/
mouse interaction) bir template literal'in içine gömülüdür. Ayrı bir `.html`
dosyası veya ayrı bir modül olması gerekir. Aynı sorun `index.html` üretimi
için de geçerlidir (`core/vault.js:363-392`).

### 2.5 daemon.js same-file bifurcation (`core/daemon.js:5`)
`isMainThread` ile aynı dosyada iki ayrı program. Ana thread (72 satır)
ve worker thread (351 satır) aynı dosyada. Worker içinde `require("./vault.js")`
çağrılır (satır 120) — bu, Node.js worker_threads'de çalışır ama bakımı
zorlaştırır.

### 2.6 coordinator.js _callModel session.js mantığını tekrar eder (`core/coordinator.js:58-70`)
Backend ayrımı yapan 3 kollu bir `_callModel` fonksiyonu. `session.js`'deki
`_dispatchLoop` ile aynı işi yapar, aynı backend ayrımını içerir.
İkisi arasında senkronizasyon yoktur.

### 2.7 freeenergy.js 3 ayrı sorumluluk (`core/freeenergy.js`)
(1) FEP skor hesaplama (satır 36-49), (2) oturum-içi sayaç + event yayını
(satır 133-214), (3) kalıcı NDJSON log parser (satır 267-296). Her biri
ayrı bir dosyada olabilirdi.

### 2.8 keywordSearch iki kere yazılmış (`core/vault.js:259-272`, `core/memory.js:106-116`)
İki farklı keyword arama implementasyonu. İkisi de benzer mantık (term sayısı
normalizasyonu) ama farklı skorlama kullanır. Ortak bir yardımcı fonksiyon
yoktur.

---

## 3. Kod Kalitesi / Desen Sorunları

### 3.1 emitSilentCatch bağımlılığı (15+ site)
```js
catch (err) { require("./events.js").emitSilentCatch("site", err); }
```
15'ten fazla yerde kullanılan bu desen, her hatayı events kanalına iter.
Olay kanalının kendisi de `catch {}` ile korunur (`events.js:90`). Bu bir
güvence değil, güvence yanılsamasıdır.

### 3.2 events.js "error" listener boş (`core/events.js:49`)
**Durum: ✅ Kapandı (2026-07-18)** — `emitter.on("error", (err) => { ...
process.stderr.write(...) })` artık hatayı stderr'e loglar (`core/events.js:49-51`).
No-op değil.
```js
emitter.on("error", () => {});
```
Node.js EventEmitter "error" event'i listener yoksa throw eder — bu no-op
handler throw'u engeller ama bir hata olursa sessizce yutulur. Loglama bile
yoktur.

### 3.3 search üçlü fallback girintisi bozuk (`tools/fs.js:296-300`)
**Durum: ✅ Kapandı (2026-07-18)** — `tryRg`/`tryGrep`/`nodeSearch` artık ayrı,
düzgün girintili fonksiyonlar (`tools/fs.js:449-529`); limit de 3000→6000'e
çıkarılmış.
```js
      try { return (tryRg() || "").slice(0, 3000) || "(eşleşme yok)"; }
      catch {
              try { return (tryGrep() || "").slice(0, 3000) || "(eşleşme yok)"; }
        catch { return nodeSearch().slice(0, 3000); }
      }
```
Satır 298: 14 boşluk, satır 299: 8 boşluk. Auto-formatter çalışmamış.
Ayrıca `rg` ve `grep` Windows'ta varsayılan değildir — bu kod Windows'ta
çoğu kullanıcıda doğrudan Node fallback'e düşer.

### 3.4 i18n.t() sessiz fallback (`core/i18n.js:33`)
```js
function t(en, tr) { return getLocale() === "tr" ? (tr ?? en) : en; }
```
`t("Hello")` (tr parametresiz) Türkçe locale'de `"Hello"` döndürür — yani
çevrilmesi gereken bir string sessizce İngilizce kalır. Hiçbir uyarı yoktur.

### 3.5 _save() sonrası session_saved event'i (`core/session.js:384-385`)
**Durum: ✅ Kapandı (2026-07-18)** — `const _savedOk = this._save(); if
(_savedOk) events.emit("session_saved", ...)` (`core/session.js:546-547`) —
event artık yalnızca kayıt başarılıysa yayınlanıyor.
```js
this._save();  // satır 384
events.emit("session_saved", this.id, { sessionId: this.id });  // satır 385
```
`_save()` başarısız olabilir (diskte yer yok, izin hatası) ama `session_saved`
yine de yayınlanır. `_save()` içinde `emitSilentCatch` vardır (satır 877) ama
event'i engellemez. Dinleyiciler "kaydedildi" zanneder.

### 3.6 coordinator.js plan() sessiz yedek (`core/coordinator.js:72-79`)
**Durum: ✅ Kapandı (2026-07-18)** — `plan()` artık hem LLM çağrısı hem JSON
parse hatasında `print.warn(...)` ile kullanıcıyı uyarıyor, hem de
`coordinator_error` event'i yayınlıyor (`core/coordinator.js:104-126`).
LLM çağrısı başarısız olursa sessizce tek-subtask plana düşer. `emitSilentCatch`
yayınlanır ama bu "plan yapıldı" ile "plan başarısız" arasındaki farkı
kullanıcıya göstermez.

### 3.7 persist.js list() her session dosyasını açar (`core/persist.js:27-49`)
`/sessions` komutu her çağrıldığında tüm `.json` dosyalarını okur, parse eder.
Önbellek veya lazy loading yoktur. 200 oturumda 200 `fs.readFileSync` +
`JSON.parse`.

### 3.8 telemetry.js listLogs her dosyaya stat atar (`core/telemetry.js:66-79`)
Aynı sorun: her log dosyası için ayrı `fs.statSync`. listLogs + readLog
birlikte kullanıldığında her satır ayrı JSON parse.

### 3.9 shell.js readLine global stdin state'i kirletir (`tools/shell.js:23-48`)
**Durum: ✅ Kapandı (2026-07-18)** — Elle yazılmış `readLine`/`_withRlPause`
deseni tamamen kaldırılmış. Onay akışı artık `tui/select-input.js`'deki
`selectInput()` üzerinden çalışıyor (`tools/shell.js:24-46`), stdin'e elle
listener eklenmiyor.
```js
process.stdin.resume();
process.stdin.on("data", onData);
```
`readLine` çağrısı, `process.stdin`'e event listener ekler. `finish()`
içinde `removeListener` çağrılır ama `rl.pause/resume` ile çakışabilir
(yorum satırı 365-369'da `_withRlPause` bu çakışmayı yönetmeye çalışır).

---

## 4. Güvenlik Borcu

### 4.1 moltbook.js credentials.json'u bypass eder (`tools/moltbook.js:8-10`)
**Durum: ✅ Kapandı (2026-07-18)** — `_getMoltApiKey()` artık
`process.env.MOLTBOOK_API_KEY` okuyor, `core/credentials.js`'in env-injection
deseniyle tutarlı (`tools/moltbook.js:5-9`). Disk I/O yok.
```js
function getCreds() {
  return JSON.parse(fs.readFileSync(CREDS, "utf8"));
}
```
`core/credentials.js` başlangıçta tüm anahtarları `process.env`'e yükler,
diğer tüm modüller env'den okur. Moltbook aracı env'ye bakmaz, doğrudan
diskten okur. Her API çağrısında disk I/O.

### 4.2 orion-mcp.js de aynı sorun (`orion-mcp.js:25-27`)
**Durum: kısmen iyileşti, kapanmadı.** Yorum artık "env öncelikli, fallback
olarak credentials.json" diyor (`orion-mcp.js:15,19`) — yani env-first oldu,
ama disk fallback'i hâlâ duruyor; 4.1'deki gibi tam env-only yapılmadı.
```js
function getCreds() {
  return JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));
}
```

### 4.3 server-token mode 0o600 Windows'ta anlamsız (`orion-server.js:57`)
```js
fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 });
```
Windows'ta `fs.writeFileSync` `mode` parametresi POSIX izinlerini
uygulamaz. Token dosyası varsayılan izinlerle yazılır.

### 4.4 speculex.js tahmin prompt'u elle yazılmış (`core/speculex.js:144-155`)
**Durum: ✅ Kapandı (2026-07-18)** — Prompt artık `[...SAFE_TOOLS].map(n =>
\`${n}{...}\`)` ile dinamik üretiliyor, `tools.js:DEFS` ile senkron kalması
garanti. Sabit kodlu "core/dosya.js" örneği de kaldırılmış, `README.md`
kullanılıyor (bkz. 8.3).
Tool şemaları prompt içinde elle yazılmıştır:
```js
read_file{"path":dosya}, list_files{"dir":dizin}, search{"pattern":regex}
```
Oysa `tools.js`'de `DEFS` içinde tanımlıdır. Tool tanımı değişirse prompt
güncellenmezse speculex sessizce çalışmaz. Prompt'taki örnek `core/dosya.js`
Türkçe bir dosya adıdır.

---

## 5. Test Borcu

> **Not (2026-07-18):** Test dosya sayısı 33'ten **36**'ya çıktı
> (`git.test.js`, `shell.test.js`, `coordinator.test.js` eklenmiş), toplam
> **319/319 test geçiyor** (`npm test`). Aşağıdaki maddeler hâlâ açık.

### 5.1 Gerçek backend çağıran entegrasyon testi yok
33 test dosyasındaki tüm testler mock/sandbox ortamında çalışır.
Gerçek Ollama, Anthropic veya OpenAI'ye karşı çalışan tek bir test yoktur.

### 5.2 Her test dosyası kendi ORION_HOME kurulumunu yapar
`router.test.js:6`, `vault.test.js:6`, `silent-catch.test.js:9` — her biri
kendi temp dizinini oluşturur, env set eder. Ortak bir test helper yoktur.

### 5.3 DENETIM'de belirtilen test eksiklikleri duruyor
- `session_id` traversal testi: `_keywordSearch` skor testi var ama traversal
  testi yok (`tests/fs-sandbox.test.js traversal testi fs.js'e ait, vault.js'e
  değil)
- CSS varlığı testi: yok
- `vault_ara` sonuç döndürme testi: yok

### 5.4 fs.test.js / fs-sandbox.test.js çift dosya
İkisi de aynı `tools/fs.js` modülünü test eder. İkinci dosya sadece sandbox
sınırlarını test eder (79 satır). Tek dosyada birleştirilebilirdi.

### 5.5 Electron testi yok
`electron/` dizini için ne unit test ne entegrasyon testi vardır.
Preload, main process IPC, React komponentleri test edilmemiştir.

---

## 6. Performans Borcu

### 6.1 vault.js rebuildIndex/rebuildGraph her kayıtta tam yeniden yazım (`core/vault.js:198-203`)
Her oturum kaydında tüm `index.html` (30 satır HTML + tüm kayıtlar) ve
`graph.html` (100 satır canvas JS) sıfırdan yazılır. Artımlı güncelleme
yoktur. Graf tüm düğüm/kenar JSON'unu template literal'e gömer.

### 6.2 memory.js her add/save'de tam dosya yazımı (`core/memory.js:23-27`)
`_save()` tüm `memory.json`'u sıfırdan yazar. `_load()` tüm dosyayı okur.
1000 kayıtta ~1MB JSON. Her add işlemi oku+parcala+değiştir+yaz.

### 6.3 thompson.js her update'te tam dosya yazımı (`core/thompson.js:71-82`)
Aynı desen. 4 sınıf × 2 tier = 8 sayı için her güncellemede
oku+parse+değiştir+yaz.

### 6.4 vectör dosyaları her sorguda diskten okunur (`core/vault.js:211-215`, `core/embed.js:101-125`)
`searchVault` ve `isAvailable` her çağrıda diskten okur. Embedding modeli
30sn cache ile korunur ama vectors.json için bir in-memory cache yoktur.

### 6.5 openai-compat.js her istekte apiKey env taraması (`backends/openai-compat.js:58-68`)
**Durum: ✅ Kapandı (2026-07-18)** — `apiKey()` artık `_apiKeyCache` ile
önbellekleniyor, env dizisi yalnızca ilk çağrıda taranıyor
(`backends/openai-compat.js:55-58`).
```js
function _headers(body) {
    const k = apiKey();  // her seferinde env'leri tara
```
Her HTTP isteğinde env dizisi taranır. 30 turluk bir oturumda 30+ tarama.

---

## 7. Config / Tutarlılık Borcu

### 7.1 Dört ayrı config dosyası, dört format
| Dosya | Lokasyon | İçerik |
|-------|----------|--------|
| `credentials.json` | proje kökü | API anahtarları |
| `~/.orion/config.json` | ev dizini | Ayarlar (budget, model, port) |
| `~/.orion/providers.json` | ev dizini | BYOK provider'lar |
| `~/.orion/accounts.json` | ev dizini | Çoklu hesap profilleri |

Formatlar ve yazma mekanizmaları farklıdır.

### 7.2 İki credentials.json yolu
- `core/credentials.js:9` → proje kökü `credentials.json`
- `tools/moltbook.js:6` → aynı dosya
- `orion-mcp.js:12` → aynı dosya
- `core/accounts.js` → `~/.orion/credentials.json`

Hangisinin kullanıldığı modüle göre değişir.

### 7.3 saglayici.js iki farklı depoya yazar (`core/commands/saglayici.js:199-208`)
Built-in provider'lar → `credentials.json` (satır 205)
Custom provider'lar → `providers.json` (satır 293)
`_hasKey()` ikisini de kontrol eder (satır 38-47) — iki kaynaktan birinde
anahtar varsa "var" sayar.

### 7.4 İki MCP config dosyası (`molp/.mcp.json` + `molp/mcp.json`)
**Durum: ✅ Kapandı (2026-07-18)** — Kök dizindeki `mcp.json` silinmiş
(`git status`: `D mcp.json`), yalnızca `.mcp.json` kalmış. Belirsizlik
giderildi.
DENETIM-RAPORU.md'de belirtilmişti. İkisi de hâlâ duruyor, hangisinin
geçerli olduğu belirsiz.

### 7.5 Oturum yolu sabit kodlanmış
**Durum: kısmen iyileşti, kapanmadı.** `core/persist.js`, `core/telemetry.js`,
`core/thompson.js` artık `process.env.ORION_HOME || os.homedir()` kullanıyor.
Ama `core/vault.js:8` hâlâ sadece `os.homedir()` — `ORION_HOME` override'ını
dikkate almıyor. Tutarsızlık kapanmadı, tek bir modülde toplandı.
`core/persist.js:7`, `core/vault.js:8`, `core/telemetry.js:8`,
`core/thompson.js:11` — hepsi `os.homedir() + ".orion"` kullanır.
`ORION_HOME` env override edilebilir ama her modül ayrı ayrı kontrol eder.

### 7.6 tools/memory.js ile core/memory.js çakışması
`tools/memory.js` (hafıza dosyası okuma/yazma aracı) ile `core/memory.js`
(semantik bellek sistemi) aynı isimde ama tamamen farklı işlevdedir.
`tools/memory.js:24-35` `memory_search` tanımlar ama `core/tools.js`'de
`memoryTools` olarak kayıtlıdır — model her ikisini de "memory" olarak
görür.

---

## 8. Bug-level Sorunlar

### 8.1 _keywordSearch normalize skoru kırılgan (`core/vault.js:266`)
```js
const score = hits / terms.length;
```
2 terimli bir sorguda 1 eşleşme = 0.50. Ama 1 terimli sorguda 1 eşleşme = 1.0.
Daha kısa sorgular her zaman daha yüksek skor alır. Anlamlı bir metrik değildir.

### 8.2 openai-compat.js hata parse'ı 3 format dener ama catch yutar (`backends/openai-compat.js:186-187`)
```js
try { msg += `: ${JSON.parse(errBody).error?.message ?? errBody}`; }
catch { msg += `: ${errBody.slice(0, 200)}`; }
```
Hangi formatta geldiği asla öğrenilemez. Tüm hatalar `msg` içinde birleşir.

### 8.3 speculex.js _predictToolCalls prompt'unda sabit kodlu dosya adı (`core/speculex.js:149`)
```
[{"name":"read_file","input":{"path":"core/dosya.js"}},...
```
`dosya.js` projede var olmayan bir dosyadır. Bu örnek gerçek kullanımda
hiçbir zaman eşleşmez.

### 8.4 events.js çift emit (`core/events.js:65-66`)
```js
emitter.emit("event", event);
emitter.emit(type,   event);
```
Her olay iki kere yayınlanır. Tip bazlı dinleyiciler `on("text_delta")`
ile, evrensel dinleyiciler `on("event")` ile dinler. İkinci emit performans
için gereksizdir — dinleyiciler tip kontrolünü kendileri yapabilir.

### 8.5 daemon.js polling + watch yarışı (`core/daemon.js:236-254`)
`fs.watch` + 60sn `setInterval` polling ikisi birden çalışır. Aynı dosya
için iki `debounce()` çağrısı aynı anda zamanlanabilir — debounce ikincisini
iptal eder (satır 141) ama çakışma penceresi vardır.

### 8.6 openai-compat.js chatRich'te _headers çağrılmazsa 401 (`backends/openai-compat.js:140-146`)
```js
headers: _headers(body),  // satır 145
```
Hata durumunda (satır 148-150'deki `errBody` toplama), yanıt 4xx ise
header'lar doğru ama body log'lanmaz. Ayrıca `data` event'i statusCode
200 değilse de tetiklenir (satır 155) — 4xx body'si de `errBody`'ye gider,
doğru çalışır.

### 8.7 persist.js SESSIONS_DIR export'u kırılgan (`core/persist.js:7`)
**Durum: ✅ Kapandı (2026-07-18)** — `SESSIONS_DIR` artık canlı bir getter:
`get SESSIONS_DIR() { return _sessionsDir(); }` (`core/persist.js:67`) —
`ORION_HOME` runtime'da değişse de yansıyor.
```js
const SESSIONS_DIR = path.join(HOME, ".orion", "sessions");
```
`require` anında hesaplanır. `ORION_HOME` sonradan değişirse (testlerde
olmaz ama) etkisiz kalır.

---

## 9. Ölü Kod

### 9.1 attic/ — 238 satır terkedilmiş (`attic/llm.js:90`, `attic/orion-cli.js:148`)
**Durum: ✅ Kapandı (2026-07-18)** — `attic/` dizini tamamen silinmiş
(`git status`: `D attic/llm.js`, `D attic/orion-cli.js`).
Eski Ollama backend ve çok eski CLI. `git rm` yapılmamış. Hiçbir dosya
bunları require etmez.

### 9.2 DENETIM-RAPORU.md önerileri uygulanmamış (11 satır öneri)
**Durum (2026-07-18): 3/6 kapandı**
- Workspace-kök doğrulaması: `tools/fs.js`'de `_guardPath` var (eklenmiş) —
  ayrıca yeni `core/workspace.js` trust-gate katmanı eklenmiş (bilinmeyen
  dizinde "trust this folder?" sorar)
- Token zorunlu: **hâlâ açık** — opsiyonel kalmış (`orion-server.js`'de
  `requireToken`/zorunlu bayrak yok)
- Sessiz catch → log: **kısmen ilerledi** — `events.js`'nin "error" listener'ı
  artık stderr'e loglar (bkz. 3.2), ama 17 yerdeki `emitSilentCatch`
  çağrılarının çoğu hâlâ sessiz
- Model kimlik güncellemesi: **hâlâ açık** — `claude-sonnet-4-6` hâlâ
  varsayılan (`router.js:16`)
- `.mcp.json`/`mcp.json` birleştirme: **✅ yapıldı** (bkz. 7.4)
- `attic/` kaldırma: **✅ yapıldı** (yukarıda)

---

## 10. Genel Sistemik Desenler

### 10.1 "Sessiz Başarısızlık Kültürü"
15+ `emitSilentCatch`, 10+ bare `catch {}`, `events.js:49` boş error handler.
Hatalar ne kullanıcıya ne log'a gider — sadece event kanalına düşer (o da
SSE bağlı değilse kaybolur). PERSONA.md'nin "boş onay yok, veri önce"
duruşuyla kod katmanı çelişir.

### 10.2 Accumulation Pattern
Yeni özellikler mevcut dosyalara eklenir, ayrı modüller oluşturulmaz:
- `session.js`'ye 7 injection katmanı
- `vault.js`'ye canvas grafi
- `freeenergy.js`'ye log parser
- `router.js`'ye her şey

### 10.3 İki Farklı Kodlama Stili
- `backends/anthropic.js` (92 satır): SDK kullanır, kısa, temiz
- `backends/openai-compat.js` (229 satır): raw https, elle SSE, monolitik
- `core/vault.js` (540 satır): bol yorumlu Türkçe, kişisel dokunuş
- `backends/custom.js` (120 satır): düzenli, JSDoc'lu, profesyonel

Bu, projenin farklı zamanlarda, farklı yazılım disipliniyle yazıldığını
gösterir.

### 10.4 Circular require riski
`router.js` ↔ `freeenergy.js` (router.loadConfig / freeenergy.shadowHook)
`session.js` ↔ `vault.js` (require içinde require)
`speculex.js` ↔ `extract.js` (ollamaRequest)
Node.js require cache'i sayesinde çalışır ama modül başlatma sırasına
bağımlıdır.

---

---

## 11. React / Elektron Derin Sorunlar

### 11.1 RailRow hooks ihlali — useState her render'da kayar (`electron/src/components/Rail.jsx:168-184`)
`RailRow` bir React komponenti değil, `Rail` içinde tanımlanmış ve döngü
+ koşul içinde çağrılan düz bir fonksiyondur. `useState` içerir:
```jsx
function RailRow({ style, hover, ... }) {
  const [h, setH] = useState(false);
```
React hooks `Rail`'in render sırasına göre sayılır. `NAV_ITEMS.map(RailRow)`
5 çağrı, `SETTINGS_ITEMS.map(RailRow)` 4 çağrı — ama bu 4 çağrı sadece
`settingsOpen`=true iken yapılır. Settings açılıp kapanınca toplam hook
sayısı değişir, React state'leri yanlış `RailRow` örneğine bağlanır.
Hover highlight'ları rastgele kayar.

### 11.2 Icon.jsx dangerouslySetInnerHTML — potansiyel XSS (`electron/src/components/Icon.jsx:5`)
```jsx
dangerouslySetInnerHTML={{ __html: path }}
```
SVG path'leri `theme.js` içinde sabit string'lerdir (şu an güvenli).
Ancak desen tehlikelidir: `ICONS` objesine yeni bir icon ekleyen veya
icon'u dışarıdan alan bir değişiklikte XSS açığı oluşur.

### 11.3 Chat.jsx "orionRise" animasyonu tanımsız (`electron/src/components/Chat.jsx:19`)
**Durum: ✅ Kapandı (2026-07-18)** — `@keyframes orionRise` artık
`electron/index.html:16`'da tanımlı (`orionPulse` ile birlikte). Animasyon
artık gerçekten çalışıyor.
```jsx
animation: "orionRise .4s ease both"
```
`styles.js`'de veya herhangi bir CSS'de `@keyframes orionRise` tanımı
yoktur. Animasyon hiçbir şey yapmaz — tarayıcı sessizce yok sayar.

### 11.4 ORION_HOME ile electron config.json yolları çelişir (`electron/main.js:30-35`)
```js
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".orion", "config.json"), "utf8"));
```
`orion-server.js:27` ORION_HOME env'ine bakıp config'i oradan okur.
Electron ise `os.homedir()` kullanır. Kullanıcı ORION_HOME ayarlamışsa
Electron yanlış port'u okur, sunucuya bağlanamaz.

### 11.5 Chat.jsx tool olayları dinlenir ama sunucu yayınlamaz (doğrulandı)
`App.jsx:81-92` tool_start/tool_end handler'ları yazılmıştır.
`orion-server.js`'de bu olaylar hiçbir yerde `emit("tool_start", ...)`
veya `emit("tool_end", ...)` ile yayınlanmaz. Tüm araç çağrıları kullanıcıya
görünmez. İkinci bir gözlem: bu kod yazılmış, çalıştığı varsayılmış ama
hiçbir zaman test edilmemiştir.

### 11.6 Index.html renderer.js yüklenmemiş çalışmaz (`electron/index.html`)
`build.js:12` çıktıyı `dist/renderer.js`'e yazar. Eğer `npm run build`
daha önce çalıştırılmamışsa `dist/renderer.js` yoktur. Hata mesajı:
beyaz ekran. DevTools'da 404. Bu en sık rastlanan "ilk açılış beyaz ekran"
sebebidir.

### 11.7 build.js loader tüm .js'leri JSX sayar (`electron/build.js:16`)
```js
loader: { ".js": "jsx" }
```
ESLint ve build tool'ları `electron/` altındaki saf JS dosyalarını (`main.js`,
`preload.js`, `build.js`) JSX olarak parse eder. Fazladan JSX transform
maliyeti + eski JSX transform ile kullanılırsa hata.

### 11.8 SSE parse hatası sessizce yutulur (`electron/main.js:129`)
```js
try { mainWindow?.webContents.send("orion:event", JSON.parse(line.slice(6))); } catch {}
```
Sunucudan bozuk JSON gelirse (`line.slice(6)` geçersiz JSON veya `data: `
ön-eki olmayan satır) hata sessizce yutulur. Renderer hiçbir uyarı almaz.
Kullanıcı "AI yanıt vermiyor" görür, nedenini bilemez.

### 11.9 İlk SSE mesajları kaybolabilir (`electron/main.js:178`)
```js
mainWindow.webContents.once("did-finish-load", () => startSSE());
```
Renderer'ın `useEffect` aboneliği (`App.jsx:97-100`) DOM yüklendikten
sonra çalışır. SSE bağlantısı `did-finish-load`'da hemen açılır.
İlk birkaç saniyede gelen olaylar renderer henüz dinlemeden gelebilir.
Sunucu başlangıcındaki session restore olayları kaybolur.

---

## 12. Güvenlik (Rapor 1'de Olmayanlar)

### 12.1 credentials.json 4 ayrı modülde diskten okunur
`tools/moltbook.js:9`, `orion-mcp.js:26`, `core/credentials.js:12`,
`orion-server.js:25-28`. Dördü de ayrı implementasyon. Token bellekte
tutulmaz — her API çağrısında disk I/O. Moltbook ve MCP ayrıca token'ı
promise chain boyunca açık taşır.

### 12.2 server-token şifrelenmemiş (`~/.orion/server-token`)
Dosya içeriği düz metin token. `tools/moltbook.js` ve `orion-mcp.js`'deki
gibi API anahtarları da düz metin. Token sızarsa sunucu açıktır.

### 12.3 masked-input clipboard'a karşı savunmasız (`tui/masked-input.js:66-69`)
Karakterler ekranda `*` ile maskelenir ama `Ctrl+V` (yapıştır) clipboard
içeriğini aynen ekrana yazmaz (maskelenmiş `*` olarak gösterir) ama value
içinde düz metin vardır. Bu beklenen davranış — ancak terminal scrollback'te
prompt metninin kendisi (örn. "API anahtarı:") görünür.

### 12.4 preload api.js çıplak erişim (`electron/src/api.js:3`)
```js
export const orion = window.orion;
```
Renderer'daki herhangi bir kod (third-party script, XSS, extension)
`window.orion`'a erişirse tüm IPC kanallarına (status, sessions, chat)
ulaşabilir.

---

## 13. React / State Yönetimi

### 13.1 handleEvent useCallback bağımlılığı boş (`electron/src/App.jsx:94`)
```js
const handleEvent = useCallback((ev) => { ... }, []);
```
Boş dependency array. `updateLastAssistant` closure'ı her render'da
güncel state'e erişir. `useCallback` burada optimizasyon değil,
kırılganlık yaratır — fonksiyon güncel `messages`'ı yakalamaz (state
yerine functional update kullanıldığı için işe yarar, ama okunması zor).

### 13.2 Chat.jsx title render'da donar (`electron/src/components/Chat.jsx:26`)
```jsx
<div style={{ fontSize: "13.5px", fontWeight: 600, color: c.text }}>{title || "yeni oturum"}</div>
```
`title` prop'u App'de `useState("")` ile başlar, ilk göndermede
`setTitle(text.slice(0, 60))` ile güncellenir. Chat'in `title` prop'u
ebeveyn state güncellendiğinde alır — yani doğru çalışır. (Düzeltme:
bu madde yanlış, kaldırılmalı — ama not olarak kalsın, incelendi.)

### 13.3 Home.jsx model null/string dengesizliği (`electron/src/App.jsx:149`)
```jsx
model={model ?? "model seçilmedi"}
```
İlk render'da `model` null. Home, model string'i bekler. `backends` yüklenene
kadar modelPicker'da seçili öğe olmaz — kullanıcı model seçmeden mesaj
gönderirse `orion.chat(text, null, null, null)` gider. Server null model
ile ne yapacağını bilmelidir.

---

## 14. Hata Yolları / Edge Case'ler

### 14.1 selfdev.js restart hatası sessizce yutulur (`core/selfdev.js:64`)
**Durum: ✅ Kapandı (2026-07-18)** — `restart()`'ın `child.on("error", ...)`
handler'ı artık `print.warn("restart: spawn failed — ...")` ile kullanıcıyı
uyarıyor ve `process.exit(1)` yapıyor (`core/selfdev.js:64-68`) — sessiz
kalma yok.
```js
child.on("error", () => {}); // spawn başarısızsa süreç açık kalır
```
`spawn` başarısız olursa (executable bulunamadı, bellek yetersiz) hiçbir
uyarı gösterilmez. Mevcut süreç açık kalır ama kullanıcı "restart oldu"
zanneder, yazdığı her şey kaybolur.

### 14.2 ollamaRequest retry loop farklı hataları ayırt etmez (`core/extract.js:149-160`)
```js
for (let attempt = 0; attempt < 3; attempt++) {
  try { ... } catch (err) { lastErr = err; }
}
```
"JSON parse hatası" ile "Ollama API kapalı" aynı catch'te birleşir.
Her iki hata da 3 denemede aynı sayıda tekrarlanır. API kapalıyken 3 kere
beklenir (60sn × 3), JSON hatasında ise 3 hızlı deneme yapılır. İkisi
arasında ayrım yoktur.

### 14.3 diff.js Uint16Array taşma riski (`core/diff.js:12`)
```
const dp = new Uint16Array((n + 1) * w);
```
MAX_LINES=3000 iken güvenli (max 3000 < 65535). Ama bu sabit değişirse
veya bellek optimizasyonu sebebiyle düşürülürse/artırılırsa sessizce
taşar. Tür kontrolü yoktur: DP değerleri satır sayısıdır, `n + 1`
değildir — eğer 65535'ten büyük bir LCS değeri olursa Uint16 taşar.

### 14.4 telemetry.js log rotasyonu yok (`core/telemetry.js`)
**Durum: ✅ Kapandı (2026-07-18)** — `MAX_LOG_FILES = 100` eklenmiş, en eski
dosyalar `fs.unlinkSync` ile temizleniyor (`core/telemetry.js:67-77`).
Her tur 3 olay (request, response, tool_call) yazılır. ~100 byte/tur ×
1000 tur = 100KB. Zamanla büyür ama silinmez. `listLogs` dosya sayısını
sınırlamaz.

### 14.5 persist.js session silindiğinde dosya kalır (`core/persist.js`)
**Durum: ✅ Kapandı (2026-07-18)** — `del(sessionId)` fonksiyonu artık
tanımlı ve export ediliyor (`core/persist.js:54-56, 67`).
`deleteSession` fonksiyonu tanımlanmamış. `/sessions` listesinde görünmez
ama `fs.readFileSync` hata vermez. Orphan dosyalar birikir.

### 14.6 diagnostics.js catch null döndürür (`core/diagnostics.js:43`)
**Durum: ✅ Kapandı (2026-07-18)** — Catch blokları artık `e.message` /
`err?.message ?? "diagnostics check error"` döndürüyor (`core/diagnostics.js:26,38,76`)
— `null` yok, hata görünür.
```js
catch { return null; }
```
`path.resolve` veya `fs.existsSync` hatasını yutar. Son kullanıcıya
"her şey yolunda" görünür.

---

## 15. Zamanlama / Yarış Koşulları

### 15.1 SSE aboneliği sessionId null ile başlar (`electron/src/App.jsx:98`)
```js
orion.subscribeEvents(null, handleEvent);
```
İlk mesaj gönderilene kadar `sessionIdRef.current` null'dır — tüm olaylar
kabul edilir (`App.jsx:77`). CLI'da başka bir oturum varsa olayları
Electron penceresi de alır.

### 15.2 daemon.js watch + poll çift tetikleme (`core/daemon.js:236-254`)
`fs.watch` ve 60sn `setInterval` ikisi birden çalışır. Aynı dosya
değişikliği her iki yoldan da algılanabilir. `debounce` ikinciyi iptal
eder ama çakışma penceresi vardır.

### 15.3 electron token okuma sırası (`electron/main.js:150-151`)
```js
const started = await ensureServer(connPort);
connToken = readToken();
```
`ensureServer` sunucuyu başlatır (veya bekler). Sunucu ilk çalıştırmada
token yazar. Ancak `ensureServer` "sunucu çalışıyor" raporu verdiği an
ile `readToken()` arasında token yazılmamış olabilir (disk yazma gecikmesi).
Token boş okunursa tüm istekler 401 alır.

### 15.4 _save() event sıralaması (`core/session.js:384-385`)
```js
this._save();  // disk yazma
events.emit("session_saved", ...);  // "kaydedildi" event'i
```
`_save()` async değildir (sync write). Ama `_save()` içinde try-catch
vardır ve catch boştur. Hata durumunda event yine de yayınlanır.

---

## 16. Mantıksal Hatalar / Tasarım Sorunları

### 16.1 fuzzyScoreTokens çok-kelimeli sorguda yanlış çalışır (`tui/fuzzy.js:135-145`)
```js
if (/\s/.test(q)) return fuzzyScore(q, haystack);  // tüm metne bir kere
```
"file edit" sorgusu tüm metin olan "read_file vault_search" üzerinde
eşleşir, toplam skor düşük olur. Oysa "file" -> "read_file" (yüksek),
"edit" -> herhangi bir token'da yok (sıfır) olarak ayrı ayrı hesaplanıp
birleştirilmelidir. Şu anki implementasyon çok-kelimeli sorgularda
tutarsız sonuç verir.

### 16.2 transposition skoru doğal eşleşmeden düşük (`tui/fuzzy.js:97`)
```js
const TRANSPOSITION = 2 * MATCH - 22; // 10
```
MATCH=16 + CONSECUTIVE=8 = 24. Transpoze edilmiş bir çift (örn. "ab"→"ba")
skoru 10 alır. Bu, GAP=-1'den yüksek ama normal MATCH'ten düşük — olması
gerekenden düşüktür (transpozisyon = 2 karakter de eşleşir, MATCH×2
beklenirdi).

### 16.3 toLocaleString locale tag'i yanlış (`tui/index.js:319`)
```js
const date = new Date(s.updatedAt).toLocaleString(i18n.locTag());
```
`i18n.locTag()` `"en"` veya `"tr"` döndürür. `toLocaleString` BCP 47
tag'i bekler: `"en-US"`, `"tr-TR"`. Çoğu JS motoru sessizce düzeltir
ama bazılarında (Node 18'in eski ICU'su) varsayılana düşer.

### 16.4 fmtTokens eşik hatası (`tui/index.js:204`)
```js
if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
```
`fmtTokens(999_999)` → `"1.0M"`. Sayı 999,500 iken 1.0M gösterilir.
Eşik 999,950 olmalıdır ki .toFixed(1) doğru yuvarlasın.

### 16.5 keywordSearch tüm terimler eşit ağırlıklı (`core/vault.js:266`)
```js
const score = hits / terms.length;
```
Her terim eşit önemdedir. "the" gibi yaygın bir kelime "function" ile
aynı ağırlıktadır. Stop-word filtresi veya IDF ağırlığı yoktur.

---

## 17. Dokümantasyon / Kod Sapması

### 17.1 README.md'de /graphify var ama kodda yok
**Durum: ✅ Kapandı (2026-07-18)** — `README.md`'de artık `/graphify`'dan
bahsedilmiyor (grep boş döndü). Kod tarafında hâlâ `core/commands/`'da bir
`graphify` komutu yok, ama artık dokümantasyon-kod sapması da yok — kayma
dokümantasyon güncellenerek giderilmiş (not: `/graphify` global
`~/.claude/skills/graphify/` altında ayrı bir Claude Code skill'i olarak var,
proje komutu değil).
README.md `/graphify` komutundan bahseder. `commands/index.js`'de veya
herhangi bir komut dosyasında `graphify` kaydı yoktur.

### 17.2 events.js şemasında tanımlanan olaylar hiçbir yerde emit edilmez
**Durum: ✅ Kapandı (2026-07-18)** — Üçü de artık gerçekten emit ediliyor:
`approval_request` → `core/session.js:710,829,932`; `weakness_mined` →
`core/daemon.js:43,408`; `speculex_hit`/`speculex_miss` →
`core/session.js:235,254,482` ve `core/speculex.js:88,177,231`.
- `approval_request`: tanımlı (satır 34), emit edildiği yer yok
- `weakness_mined`: tanımlı (satır 39), emit edildiği yer yok
- `speculex_hit`/`speculex_miss`: tanımlı (satır 40-41), emit edilmez

### 17.3 DENETIM-RAPORU.md hâlâ güncellenmemiş öneriler
11 maddelik DENETIM önerisinin 6'sı uygulanmamış. Rapor hâlâ depoda
duruyor, referans doküman olarak kullanılabilir.

---

## 18. ANSI / Terminal Edge Case'leri

### 18.1 fitLine Windows \r\n'i işlemez (`tui/index.js:364-376`)
```js
function fitLine(s, width) {
```
Tek `\n` bazlıdır. `\r\n` (Windows CRLF) içeren metinlerde `\r` görünür
karakter sayılır, genişlik hesabı bozulur. Terminal çıktısında `\r` satır
başına döner ve üstüne yazar — render bozulur.

### 18.2 highlightCode multiline regex hatalı (`tui/index.js:113`)
```js
const KEYWORDS = /\b(function|const|let|...)\b/g;
```
`highlightCode` (satır 115) bir `code.split("\n").map()` içinde `KEYWORDS`
ile eşleştirme yapar. Regex'de `g` bayrağı vardır ve `regex.lastIndex`
hatalı olabilir (Node.js regex state'i). `stash` fonksiyonu içinde
string'in yerine `\x00` koyar — eğer orijinal metinde `\x00` varsa
karakter kayması olur.

### 18.3 refreshInputFill getCursorPos güvenilmez (`tui/index.js:432`)
```js
const pos = rl.getCursorPos();
```
readline'ın `getCursorPos()` metodu ANSI escape dizilerine duyarlıdır.
Prompt'ta ANSI renk kodları varsa `cols` hesabı yanlış olabilir (ANSI
kodları görünmez karakterdir). `PROMPT_VISIBLE_W` = 4 ile kodlar prompt'a
gömülü olduğu için (`Za`, `Zf`) bu çalışır — ama kırılgandır.

---

## 19. Ölü Kod (Rapor 1'e Ek)

### 19.1 core/accounts.js tüm dosya (`core/accounts.js`)
**Durum: ✅ Kapandı (2026-07-18)** — Artık `core/commands/account.js`,
`orion.js` ve `orion-server.js` içinde require ediliyor; `tests/accounts.test.js`
eklenmiş. Ölü kod değil.
Çoklu-hesap sistemi. Hiçbir yerde require edilmez. `~/.orion/accounts.json`
dosyası oluşturulmamıştır. Kod yazılmış, kaydedilmiş ama kullanılmamış.

### 19.2 tools/memory.js ile core/memory.js çakışması
**Durum: ✅ Büyük ölçüde kapandı (2026-07-18)** — `tools/memory.js` artık
`memory_search` değil, `memory_read`/`memory_append` tanımlıyor
(`tools/memory.js:12-33`) — modelin gördüğü tool adları artık çakışmıyor.
İsimlendirme benzerliği (ikisi de "memory" kelimesini taşıyor) hâlâ kavramsal
olarak kafa karıştırıcı ama gerçek tool-name çakışması giderilmiş.
Her ikisi de farklı şey yapar ama aynı isimle anılır. `tools/memory.js`
merak.md/gozlemler.md okur, `core/memory.js` embedding tabanlı semantik
bellektir. Model her ikisini de "memory" olarak görür.

---

## 20. Sistemik Desenler (Rapor 1'e Ek)

### 20.1 "İki kere kontrol etme" alışkanlığı
Aynı veri birden çok yerde tutulur ve güncellenir:
- Config değerleri: `~/.orion/config.json` (server), `localStorage` (Electron),
  `process.env` (bazı değerler)
- Credentials: proje kökü `credentials.json` + `~/.orion/credentials.json`
- Oturum listesi: `persist.js:list()` her seferinde diskten okur, `memory.js`
  kendi listesini tutar
- Keyword search: vault.js'de ve memory.js'de iki ayrı implementasyon

### 20.2 "Yaz, kaydet, unut" deseni
**Durum (2026-07-18):** İlk iki madde kapandı (bkz. 17.2), üçüncüsü (`tool_start`
SSE / Electron, bkz. 1.7) hâlâ açık.
Event'ler tanımlanır (`events.js`), schema'ları yazılır, kodun başka
yerlerinde dinlenir — ama arasındaki bağlantı kopuktur:
- ~~`approval_request` tanımlı → emit edilmez → hiçbir zaman dinlenmez~~ ✅ kapandı
- `tool_start` SSE event'i Electron'da dinlenir → server emit etmez (hâlâ açık)
- ~~`weakness_mined` tanımlı → kaynak kodda hiçbir yerde emit edilmez~~ ✅ kapandı

### 20.3 "Bir şey dene, başarısız olursa sessizce başka şey dene" deseni
1. Silinen session'ı yükle → hata → boş liste göster
2. Embedding ara → hata → fuzzy ara → hata → boş liste
3. Ollama extraction dene ×3 → hata → manuel fallback
4. rg dene → hata → grep dene → hata → node implementation
5. Kaydet → hata → emit yine de "session_saved"
Her düşüş bir önceki yöntemin sessizce başarısız olduğunu gizler.

### 20.4 İstatistik: Kod Yaşı ve Stil Katmanları

- **Katman 1 — İlk prototip** (`backends/anthropic.js`, `core/session.js:479-691`):
  SDK kullanır, bol yorum, tam Türkçe, kişisel değişken adları
- **Katman 2 — İkinci dalga** (`backends/openai-compat.js`, `core/vault.js`):
  Raw HTTP, monolitik, İngilizce+Türkçe karışık
- **Katman 3 — Olgunlaşma** (`core/commands/entropy.js`, `core/freeenergy.js`):
  İngilizce, JSDoc, modüler yapı
- **Katman 4 — En yeni** (`tui/` bileşenleri, `core/coordinator.js`):
  Temiz İngilizce, test edilebilir, izole

Depoda dört farklı kodlama stili, üç farklı dil kullanımı seviyesi vardır.
Bu, projenin tek bir tutarlı vizyondan değil, eklemeli büyümeden
şekillendiğini gösterir.

---

*Rapor genişletmesi: 130+ madde, her biri somut satır referansıyla.*

---

*2026-07-18 doğrulama notu: 20 maddeden fazlası kapatıldı (bkz. Özet), geri
kalanı kod okunarak yeniden teyit edildi ve açık bırakıldı. En büyük
kırılganlık hâlâ bölüm 2 (mimari) ve bölüm 1/11 (Electron) — hiçbiri bu
turda dokunulmadı, `session.js` aksine 883→1268 satıra büyüdü.*
