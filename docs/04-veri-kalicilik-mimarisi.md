# 4. Veri ve Kalıcılık Mimarisi

**Perspektif:** Konuşma, dosya değişikliği, öğrenilmiş bilgi ve davranış
nerede saklanıyor — hangi katman senkron, hangisi arka planda, hangisi
kaybolabilir?

## 4.1 `~/.orion/` — tek kök, çok alt sistem

```
~/.orion/
├── config.json          router.ts:saveConfig() — kullanıcı ayarları
├── thompson.json         thompson.js — öğrenen router durumu (§2.2)
├── sessions/*.json        persist.js — konuşma geçmişi (tam mesaj listesi)
├── checkpoints/*.bak      checkpoint.js — dosya yazımından önceki anlık görüntüler
├── vault/                 vault.js + daemon.js — arka planda damıtılmış bilgi
│   ├── index.json
│   ├── vectors.json       embed.js embedding'leri (novelty/arama için)
│   └── *.html             sessionToHTML() render edilmiş vault girdileri
└── skills/*.md             skills.js — telemetriden damıtılmış başarılı araç dizileri
```

`ORION_HOME` env değişkeniyle tamamı geçersiz kılınabilir — testler bunu
kullanır (`persist.js:6-8`, `checkpoint.js:10`, `router.ts:11`), yani her
alt sistem kendi dosyasında aynı deseni tekrarlıyor: merkezi bir "veri kökü"
modülü yok, her dosya `process.env.ORION_HOME || os.homedir()` satırını
kendi başına yazıyor.

## 4.2 Oturum kalıcılığı — senkron, her turdan sonra

`persist.save(id, data)` (`persist.js:19-22`) **senkron** `fs.writeFileSync`
kullanır — `Session._save()` her `send()` turunun sonunda çağrılır
(session.ts:528). Bunun anlamı: bir tur bitmeden süreç çökerse o tur
kaybolur, ama biten bir tur diskte garantili kalır (senkron yazım, atomik
değil — `.tmp` + `rename` deseni burada **yok**, `checkpoint.js`'in
`_writeIndex()`'inde var). Büyük bir oturumda (`msgs` çok uzunsa) her tur
sonunda tüm geçmiş yeniden serialize edilip yazılıyor — `_trim()`
(session.ts:818-847) `MAX_HISTORY=60` mesajı aşınca eskiyi özete indirip bu
maliyeti sınırlıyor.

`fork()` (session.ts:692-701) oturum ağacını sağlıyor: mevcut geçmişi
`JSON.parse(JSON.stringify(...))` ile derin kopyalayıp yeni id altında
kaydediyor, eski dal diskte olduğu gibi kalıyor. `/checkpoint`, `/oturum`
komutları bu ağacı gezmek için var.

## 4.3 Checkpoint — dosya yazımı için ayrı, daha katı bir güvenlik ağı

`core/checkpoint.js` oturum kalıcılığından tamamen ayrı bir mekanizma: her
`write_file`/`edit_file` **öncesinde** `snapshot()` çağrılır (checkpoint.js:29-52),
eski içerik `.bak` olarak saklanır, index `.tmp`+`rename` ile atomik
güncellenir (checkpoint.js:22-26 — burada atomiklik var, `persist.js`'de
yok). Sınırlar açıkça sabitlenmiş: `MAX_KEEP=200` snapshot, `MAX_BYTES=2MB`
üstü dosyalar hiç snapshot'lanmıyor (checkpoint.js:13-14, 36). 2MB üstü bir
dosyada yapılan `edit_file` geri alınamaz — bu limitin üstündeki dosyalarda
`/checkpoint` sessizce hiçbir koruma sağlamıyor, kullanıcıya bunun
söylenmesi loop/tool katmanının değil checkpoint modülünün sorumluluğunda
değil (snapshot `null` döner, çağıran taraf bunu logluyor mu kontrol
edilmeli).

## 4.4 Vault daemon — worker_thread ile arka planda bilgi damıtma

`core/daemon.js` klasik **aynı-dosya bifurcation** deseni kullanıyor:
`isMainThread` true ise ana thread API'si (`startDaemon`, `stopDaemon`,
`getStatus`) export edilir; `else` dalında worker thread kodu çalışır
(daemon.js:13, 75). Worker, `sessions/` dizinini izler, her yeni/güncellenen
oturumu `extract.js` ile "bilgi" haline getirip vault'a yazmayı dener.

**Novelty filtresi** (daemon.js:195-231) — vault şişmesin diye Shannon
benzeri bir eşik var: yeni bilginin embedding'i son vault vektörleriyle
cosine benzerliğine bakılır, `maxSim > 0.82` ise **yazılmaz**
(`SHANNON_THRESHOLD=0.82`). Bu eşik, `06-vaka-analizi` dosyasındaki log'da
görülen `vault: skipped [...] — too similar to ... (87-93%)` satırlarının
kaynağı. Önemli nokta: bu worker **ana konuşma akışından bağımsız** çalışıyor
— "skipped/saved" mesajları terminale konuşma çıktısıyla aynı akışta
düşüyor, ama aslında farklı bir sürecin (arka plan işçisi) ürünü. Bu, log
okurken "şu an olan ile arka planda biriken" işleri ayırt etmeyi
zorlaştırıyor (bkz. [06](06-vaka-analizi-uzun-sureli-donma.md)).

Embedding yoksa (Ollama kapalı/kullanılamıyor) `checkNovelty()` sessizce
`{skip:false, novelty:1.0}` döner (daemon.js:202, 207, 216) — yani novelty
kontrolü **fail-open**: embedding altyapısı yokken her şey "yeni" sayılıp
yazılır, vault büyümesi sınırsız hale gelir. Bu bilinçli bir tasarım tercihi
gibi görünüyor (veri kaybetmemek > şişme riski) ama açıkça dokümante
edilmemiş bir trade-off.

## 4.5 Hafıza (memory.js) ve turn memory — iki farklı "hatırlama" katmanı

- **`memory.js`** — uzun ömürlü, LLM ile periyodik çıkarılan "gerçekler"
  (`EXTRACT_EVERY` turda bir, session.ts:532-534, `_extractMemories()`).
  Her turda `memory.query(text)` ile ilgili kayıtlar bulunup sisteme
  enjekte edilir (session.ts:336-337).
- **`turnmemory.js` (`TurnMemory`)** — oturuma özel, sadece bağlam
  sıkıştırıldıktan (`_compacted=true`) sonra devreye giren bir geri-çağırma
  katmanı: `_trim()` veya `compact()` eski turları özete indirdiğinde,
  `TurnMemory.recall()` ilgili eski turun **tam metnini** embedding
  benzerliğiyle geri getirebiliyor (session.ts:362-372). En fazla 500 kayıt
  tutuluyor (bkz. test: "kayıt sayısı 500 ile sınırlı").

İkisi de embedding'e bağlı ama farklı yaşam döngüleri var: `memory` süreçler
arası kalıcı (disk), `turnmemory` oturum ömrüyle sınırlı (bellekte,
`Session` instance'ına bağlı — oturum kapanınca kaybolur, `_save()` bunu
diske yazmıyor).

## 4.6 Skills — telemetriden davranış damıtma

`core/skills.js` telemetride biriken "başarılı araç dizilerini" madenciyip
yerel modelle `~/.orion/skills/*.md` olarak damıtıyor. `session.send()`
her turda `findRelevantSkills(text, 2)` ile bunları arıyor ve eşleşirse
sisteme ekliyor (session.ts:377-385, "tembel skill enjeksiyonu"). Bu,
sistemin kendi geçmiş davranışından öğrenip gelecekteki prompt'a geri
beslediği tek katman — vault (bilgi) ve skills (davranış) arasındaki ayrım
burada net: biri "ne biliyorum", diğeri "ne yapmalıyım".

## 4.7 Kalıcılık katmanlarının senkron/asenkron haritası

| Katman | Yazım zamanı | Senkron mu? | Kayıp riski |
|---|---|---|---|
| `persist.js` (oturum) | her tur sonu | senkron (writeFileSync) | Süreç tur-ortasında çökerse o tur |
| `checkpoint.js` | her write/edit öncesi | senkron + atomik index | >2MB dosyalarda yok |
| `thompson.json` | debounce 5sn + exit hook | asenkron, unref | Beklenmedik kill (SIGKILL) sırasında son 5sn |
| `vault/` | daemon worker, olay tetiklemeli | tamamen asenkron | Daemon çalışmıyorsa hiç birikmez |
| `turnmemory` | bellekte, embed arka planda | asenkron embed, senkron ekleme | Oturum kapanınca tamamen kaybolur |
