# Orion (molp) — Kapsamlı Denetim Raporu

**Tarih:** 2026-07-12
**Kapsam:** Tüm depo (129 dosya, ~13.2k satır JS) + canlı MCP araç testi
**Yöntem:** Statik inceleme + araçların gerçek çağrılması + test paketi çalıştırma
**Düzeltmeler:** `core/vault.js` ve `orion-mcp.js` (aşağıda "Düzeltilenler")

> Not: Bu denetim sırasında çalışma ağacında **benim yazmadığım** eşzamanlı
> değişiklikler tespit ettim (`orion.js`, `tui/index.js`, `tests/tui.test.js`,
> `DURUM.md` — bir TUI refactor'ü, `inputBoxBottom` → `finishUserTurn`). Bunlara
> dokunmadım. Benim düzeltmelerim yalnızca `core/vault.js` + `orion-mcp.js`.

---

## 0. TL;DR — En kötü 5 şey

1. **Dosya araçlarında sıfır sandbox.** `write_file`/`edit_file`/`read_file`
   `path.resolve(input.path)` kullanıyor — mutlak yol her yere, `../` her yere.
   Ajan `credentials.json`'ı, `~/.ssh`'ı okuyup sistem dosyalarını ezebilir.
   **"Çalışma klasörü" diye bir kavram yok.**
2. **Vault yazımında yol-traversal + çökme** (session_id doğrudan dosya adına
   gömülüyordu). Canlı doğrulandı, **düzeltildi.**
3. **Amiral gemisi özellik (semantik vault araması) bu kurulumda tamamen ölü.**
   `vectors.json` hiç üretilmemiş; `vault_ara` her zaman boş dönüyordu.
   Ollama'ya sıkı bağımlılık + sessiz `catch {}` = teşhis edilemez sessizlik.
   **Anahtar-kelime yedeği eklendi (düzeltildi).**
4. **Yanıltıcı başarı raporları.** `vault_kaydet`, Ollama kapalıyken çıkarım
   hiç çalışmadığı halde "Saved" + gerçekmiş gibi bir özet döndürüyordu.
   **Dürüst uyarı eklendi (düzeltildi).**
5. **Mühendislik/gerçeklik uçurumu.** Thompson sampling, serbest-enerji (FEP)
   gölge log, spekülatif önbellek, Hebbian aktivasyon, Shannon yenilik filtresi,
   worker-thread daemon, swarm-lite… hepsi çalışmayan bir yerel-model temelinin
   üstüne kurulu. Görkemli isimler, çalışmayan altyapı.

Test paketi durumu: **178/178 geçiyor** (resmi `npm test`).

---

## 1. Canlı MCP Araç Testi (Ozyn'in spesifik soruları)

Ajanın MCP araçlarını gerçekten çağırdım. Sonuçlar:

| Araç | Sonuç |
|---|---|
| `durum` | Çalışıyor ama Karma/Owner "?" dönüyor (API alan adları eşleşmiyor ya da yanıt boş) |
| `vault_son` | Çalışıyor — 46+ oturum listeliyor |
| `vault_oku` | Çalışıyor — ama boş bölüm başlıklarını (Kararlar/Kavramlar) da sızdırıyor |
| `vault_ara` | **Boş dönüyordu** (embedding yok) → düzeltildi, artık anahtar-kelimeyle buluyor |
| `vault_kaydet` | Yazıyor ama çıkarım çalışmıyordu ve bunu gizliyordu → düzeltildi |
| `not_oku` | Çalışıyor |
| `feed_oku` | Ağ gerektirir (test edilmedi, kod doğru) |

### Ozyn'in üç sorusuna net cevaplar

**"Klasör oluşturabiliyor mu? Çalışma klasörü belli mi?"**
- MCP araç setinde (`durum, feed_oku, vault_*, not_oku, post_at, yorum_yap`)
  **genel amaçlı klasör oluşturma aracı yok.** Sadece `vault_kaydet`, vault
  dizin yapısını (`~/.orion/vault/{sessions,assets}`) oluşturur.
- **Çalışma klasörü SABİT:** her şey `~/.orion/vault` altına gider
  (`config.vaultDir` ya da `os.homedir()/.orion/vault`). Hangi dizinden
  çalıştırırsan çalıştır fark etmez — proje dizinine **bağlı değil**, ev
  dizinine sabitlenmiş.
- Ayrı olarak, Orion CLI'ın **kendi** dosya araçları (`tools/fs.js`,
  `write_file`) `mkdirSync(dirname, {recursive:true})` ile klasör oluşturur —
  ama **hiçbir kök/sandbox sınırı yoktur** (bkz. Güvenlik #1).

**"Yeni bir klasörde yeni dosya yolunda yeni workflow oluşunca eski dosya yoluna bağlı mı kalıyor?"**
- **Vault tarafı:** `session_id` sadece dosya *adını* belirler; dizin her zaman
  `~/.orion/vault`. Yani "yeni klasör/yeni yol" yeni bir çalışma bağlamı
  yaratmaz — hepsi aynı global vault'a düşer.
  - **Düzeltmeden önce:** `session_id` içinde `/` varsa (`alt/klasor-testi`)
    yazma **ENOENT ile çöküyordu**. Canlı doğruladım:
    `ENOENT: ...\sessions\2026-07-12_alt\klasor-testi_...html`.
  - **Düzeltmeden sonra:** güvenli isme indirgeniyor, tek `sessions/` dizininde
    kalıyor, çökmüyor.
- **Dosya araçları tarafı:** araçlar **durumsuz** — her çağrı `path.resolve(cwd)`
  kullanır ve `cwd` süreç başında sabitlenir. Kalıcı bir "current directory"
  (cd) durumu **yoktur**. Ajan yeni bir klasör açıp sonra göreli yol yazarsa,
  yol **yeni klasöre değil, başlangıç `cwd`'sine** göre çözülür. Yani ajan yeni
  klasörün "içinde kalmaz" — eski yola bağlı kalır. Bu, sezgiye aykırı ve
  hataya açık bir tasarımdır.

---

## 2. On Uzman Perspektifi

### 👤 1 — Yazılım Mimarı
- **Aşırı yüzey alanı / erken soyutlama.** Kişisel bir CLI için 129 dosya:
  Thompson sampling, FEP serbest-enerji, spekülatif önbellek, Hebbian
  aktivasyon, Shannon yenilik, worker daemon, swarm-lite, subagent, MCP
  istemci+sunucu, HTTP sunucu, plugin, checkpoint, oturum ağacı, turn belleği,
  weakness mining, Lovelace digest. Bunların çoğu, kurulu olmayan yerel bir
  Ollama'ya bağımlı → **ölü ağırlık.**
- **Çift/üçlü config sistemi.** `.mcp.json` (Claude Code, mutlak yol) +
  `mcp.json` (Orion, göreli yol) yan yana. Ayrıca `credentials.json` +
  `~/.orion/config.json` + `accounts` profilleri. Tek doğruluk kaynağı yok.
- **`attic/` ölü kod** (`llm.js`, `orion-cli.js`) hâlâ depoda.
- **Sızan soyutlama:** `vault_oku` HTML'i strip edip boş `<h2>` başlıklarını da
  metne katıyor.

### 👤 2 — Güvenlik Mühendisi
- **[YÜKSEK] Sandbox yok.** `tools/fs.js` — mutlak yol + `../` serbest. LLM
  çıktısı (potansiyel prompt-injection hedefi) doğrudan dosya sistemine dokunur.
  Bir workspace-kök doğrulaması şart.
- **[YÜKSEK→düzeltildi] Vault yazımında yol-traversal.** `writeSession`
  `session_id`'yi ham dosya adına gömüyordu; `../../x` `sessions/` dışına
  yazabilirdi. Sanitizasyon eklendi.
- **[ORTA] `orion-mcp.js http` modu token opsiyonel.** Token yoksa ağ üzerinden
  korumasız açılıyor (uyarı basıyor ama çalışıyor) ve bu araçlar arasında
  `post_at`/`yorum_yap` (dışa yazma) ve vault yazımı var.
- **[İYİ] Doğru yapılanlar:** `server-token` `0o600` + `timingSafeEqual`;
  `run_command` `spawnSync` ile shell-injection'sız (search araçları); MCP
  sonuçları "DIŞ VERİ" etiketiyle sarılıyor; `credentials.json` gitignore'da.
- **[İYİ] `web_fetch` SSRF koruması** (`_isPrivateHost`) test kapsamında.

### 👤 3 — Performans Mühendisi
- **Her kayıtta tüm HTML yeniden üretiliyor.** `writeSession` → `rebuildIndex`
  + `rebuildGraph`, her oturumda **tüm** `index.html`/`graph.html`'i sıfırdan
  yazar. O(n) tam yeniden yazım, artımlı değil.
- **`graph.html`'e tüm düğüm/kenar JSON'u gömülüyor** — vault büyüdükçe dosya
  şişer; canvas fizik simülasyonu O(n²) itme döngüsü içeriyor.
- **`searchVault` her sorguda** `vectors.json` + `index.json`'u diskten okuyup
  parse eder, lineer tarar. Kişisel ölçekte sorun değil ama önbelleklenmemiş.
- **Daemon extraction 3×10sn bloklama** (Ollama idle beklerken).

### 👤 4 — Hata Yönetimi / Gözlemlenebilirlik
- **Yaygın sessiz `catch {}`.** Vault embed hatası, daemon hataları, bozuk
  index, config parse — hepsi yutulur. "vault_ara neden boş?" sorusu
  **teşhis edilemez** hale geliyor. Bu, projedeki en zararlı desen.
- **Yanıltıcı başarı** (düzeltildi): `vault_kaydet` çıkarım çalışmasa da başarı
  gibi rapor ediyordu.
- **Sıralama riski:** `writeSession` önce HTML yazıp sonra index güncelliyor;
  arada hata olursa **öksüz HTML** kalır.

### 👤 5 — Test Mühendisi
- **İyi:** 178 test var ve **hepsi geçiyor** (`npm test`).
- **Boşluklar:** traversal `session_id` için test yok; CSS kopyalama için test
  yok; `vault_ara`'nın gerçekten sonuç döndürdüğüne dair entegrasyon testi yok.
  Bu üç boşluk, tam da bu denetimde bulunan üç canlı hataya denk geliyor —
  yani testler "yeşil" ama gerçek kullanım yolları kapsanmamış.
- **Kırılganlık:** birçok TUI testi `process.stdout.isTTY`'yi elle set ediyor;
  bu dosyalar refactor edilirken testler geçici olarak kırılıyor (denetim
  başında canlı gözlemledim).

### 👤 6 — Backend / LLM Entegrasyonu
- **Eskimiş model kimlikleri.** `pickModel` ve `anthropic.chat` varsayılanı
  `claude-sonnet-4-6`; `listModels` de 4.x veriyor. Güncel nesil
  **`claude-sonnet-5` / `claude-opus-4-8`**. (Bunu zorla değiştirmedim — API
  erişimini bilemiyorum; öneri olarak bırakıyorum, bkz. Öneriler.)
- **Prompt-cache breakpoint mantığı doğru** (sistem + son asistan mesajı).
- **Fallback zinciri sağlam** (erişilemez backend'leri eleyip sıradakine
  geçiyor) — bu iyi tasarlanmış.

### 👤 7 — DX / Kod Sağlığı
- **Karışık dil:** yorumlar Türkçe, bazı stringler İngilizce, i18n kısmi.
  Tutarsız ama işlevsel.
- **`package.json` iskeleti eksik:** `description`/`author`/`repository` boş,
  `main: index.js` diye var olmayan bir dosyayı işaret ediyor.
- **`js-tiktoken` bağımlılığı** var ama Anthropic/OpenAI zaten token
  döndürüyor — gerçekten gerekli mi belirsiz.

### 👤 8 — Veri / Bilgi Tasarımı (Vault)
- **Vault, Ollama olmadan bir "not defteri" değil, boş bir kabuk.** Embedding
  yoksa: yenilik filtresi devre dışı, semantik arama ölü, Hebbian aktivasyon
  anlamsız. Tüm bu makinenin **çalışması için gizli ön koşul** var ve hiçbir
  yerde uyarılmıyor.
- **CSS hiç kopyalanmıyordu** (düzeltildi): `ensureVault` var olmayan bir yola
  (`<molp>/../vault/assets/style.css`) bakıyordu → tüm vault HTML'i **stilsiz.**
  Gömülü varsayılan CSS eklendi.

### 👤 9 — Eşzamanlılık / Durum
- **`index.json` mutex'i iyi** (`_withIndexLock` promise-zinciri).
- **Ama süreçler-arası koruma yok:** CLI + daemon worker + `orion-server` aynı
  `index.json`'a yazabilir; içi-süreç mutex bunu kapsamaz. Atomik `rename`
  yardımcı ama read-modify-write yarışı süreçler arası hâlâ mümkün.
- **Daemon `setInterval`'ları** worker'ı sonsuza dek canlı tutar; ana süreç
  çıkışında worker `process.exit` ile ölür (kabul edilebilir).

### 👤 10 — Ürün / Kullanıcı Güveni
- **"Yapay zekanın not alan yapay zekası" vaadi** cazip ama kurulum sessizce
  başarısız oluyor: kullanıcı 46 oturum "kaydetmiş" ama hiçbiri aranabilir
  değil, hiçbiri stillenmiş değil, çoğu gerçek çıkarımdan geçmemiş. Kullanıcı
  bunu **fark edemez** çünkü her adım "başarılı" görünür.
- **Öneri kültürü çelişkisi:** PERSONA.md "boş onay yok, veri önce" diyor; ama
  kod katmanı tam tersini yapıp her şeyi "başarılı" raporluyordu. Düzeltmelerim
  bu boşluğun bir kısmını persona ile hizaladı.

---

## 3. En "Saçma" Tasarım Kararları

1. **Süslü isim, çalışmayan öz.** FEP/serbest-enerji "gölge log", Thompson
   sampling router, Shannon yenilik eşiği (0.82) — hepsi akademik olarak hoş,
   ama temeldeki embedding altyapısı ortamda hiç yok. Sonuç: karar teorisi
   makineleri, veri olmadan dönen çarklar.
2. **İki MCP config dosyası** (`.mcp.json` + `mcp.json`) farklı formatlarda.
3. **Global vault, proje-bağımsız.** Farklı projelerden gelen oturumlar tek bir
   `~/.orion/vault`'ta karışıyor — bağlam ayrımı yok.
4. **`session_id`'nin hem birincil anahtar, hem dosya adı, hem arama anahtarı**
   olarak üç işi birden görmesi → traversal/çökme yüzeyi (düzeltildi).
5. **Sessiz `catch {}` her yerde** — "çalışıyor gibi görünüp aslında çalışmama"
   kültürünün kök nedeni.

---

## 4. Düzeltilenler (bu denetimde uygulandı)

| # | Dosya | Sorun | Düzeltme | Doğrulama |
|---|---|---|---|---|
| 1 | `core/vault.js` | `session_id` ham dosya adına gömülüyor → `/` çökertir, `../` traversal | `safeSid = replace(/[^\w.-]/g,"_")` ile sanitize; index `id` orijinal kalır | `../../evil/pwn` artık `sessions/` içinde güvenli isimle yazılıyor, çökmüyor |
| 2 | `core/vault.js` | `ensureVault` yanlış yola bakıyor → CSS hiç kopyalanmıyor, vault stilsiz | Gömülü varsayılan CSS eksikse yazılıyor | `~/.orion/vault/assets/style.css` (1784 B) oluştu |
| 3 | `core/vault.js` | `vault_ara` embedding yoksa hep boş | Anahtar-kelime yedeği (`_keywordSearch`, summary+tags) | "MCP arac testi" araması artık 1 sonuç (score 3) dönüyor |
| 4 | `orion-mcp.js` | `vault_kaydet` çıkarım çalışmasa da "başarı" raporluyor | "manuel" yedeği tespit edilince açık uyarı ekleniyor | Ollama kapalıyken kayıt artık dürüst uyarı basıyor |

Tüm düzeltmelerden sonra **`npm test`: 178/178 geçiyor** — regresyon yok.
Denetim sırasında vault'a yazdığım test kayıtları (`mcp-arac-testi-*`,
`../../evil/pwn`) temizlendi (index 48 → 46).

---

## 5. Öncelikli Öneriler (henüz uygulanmadı)

**Yüksek öncelik (güvenlik):**
1. `tools/fs.js` ve `tools/shell.js`'e **workspace-kök doğrulaması** ekle:
   çözülen mutlak yol, izin verilen kök(ler)in altında değilse reddet. "Çalışma
   klasörü" kavramını gerçek yap (`ORION_WORKSPACE` env ya da başlangıç `cwd`).
2. `orion-mcp.js http` modunda **token'ı zorunlu** kıl (token yoksa
   `127.0.0.1`'e bağlan ya da başlatmayı reddet).

**Orta öncelik (güvenilirlik):**
3. **Sessiz `catch {}`'leri** en azından `stderr`'e/telemetriye logla — özellikle
   embed, daemon ve index yollarında.
4. Ollama/embedding **ön koşulunu açıkça bildir:** başlangıçta "semantik arama
   devre dışı — nomic-embed-text kurulu değil" gibi tek satırlık durum.
5. Model kimliklerini güncelle: `claude-sonnet-4-6` → **`claude-sonnet-5`**,
   liste `claude-opus-4-8`/`claude-haiku-4-5`. (API erişimini teyit ederek.)

**Düşük öncelik (bakım):**
6. `.mcp.json`/`mcp.json` ikiliğini tek dosyada birleştir.
7. `attic/` ölü kodu kaldır; `package.json` meta alanlarını doldur.
8. `rebuildIndex`/`rebuildGraph`'i debounce et (her kayıtta değil).
9. Traversal `session_id`, CSS varlığı ve `vault_ara` sonuç dönüşü için test ekle.

---

*Rapor sonu. Düzeltmeler yalnızca `core/vault.js` + `orion-mcp.js`'te; diğer
çalışma-ağacı değişiklikleri (TUI refactor) bana ait değildir.*
