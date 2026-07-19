# Orion Desktop (Electron)

CLI kullanmak istemeyenler için Orion Aethelred'in masaüstü istemcisi. `../orion-server.js`'e
HTTP+SSE ile bağlanır — CLI (`orion.js`) ile aynı `core/` mantığını, aynı vault/session
dosyalarını paylaşır. Ayrı bir ajan değil, aynı ajanın başka bir arayüzü.

Tasarım kaynağı: `../elektron-masa-st-uygulamas/project/Orion Home.dc.html` (Claude Design
handoff paketi) — Home + Chat görünümleri buradan pixel-yakın React'e taşındı.

## Kurulum

```bash
cd electron
npm install
npm start
```

`npm start` önce renderer'ı derler (`build.js`, esbuild), sonra Electron'u açar.
Pencere açılırken `orion-server.js` zaten çalışmıyorsa (health check `/health`)
otomatik olarak alt process olarak başlatılır — token `~/.orion/server-token`'dan okunur.

Geliştirme sırasında (dosya değişince otomatik yeniden derleme): `npm run dev`

## Kapsam (v0.1)

Gerçek işlevsel: Yeni Oturum, mesaj gönderme (SSE ile canlı token akışı + araç
çağrısı satırları), model seçici (`GET /backends`), 4 tema (localStorage'da kalıcı),
rail sabitleme.

Görsel yer tutucu (henüz orion-server.js'de karşılık gelen uç nokta yok):
Oturumlarda Ara, Hafıza Kasası, Model Yönlendirici, MCP Sunucuları, Favoriler,
Sağlayıcılar (API), Etkinlik/Profil/Vault Yönetimi/Kullanım Sınırları alt menüleri.
Bunları gerçek yapmak için `orion-server.js`'e yeni GET uçları eklenmesi gerekir
(vault_search, mcp tools list, router/thompson durumu, provider CRUD).

## Dosya yapısı

```
electron/
  main.js       — Electron main process: pencere + orion-server.js yaşam döngüsü
  preload.js    — contextBridge: renderer'a güvenli window.orion API'si
  index.html    — renderer host
  build.js      — esbuild ile src/ → dist/renderer.js
  src/
    theme.js    — 4 tema + ikon path'leri (.dc.html'den birebir)
    styles.js   — tasarımdaki *Style string'lerinin React style-object karşılığı
    App.jsx     — durum yönetimi: tema, oturum, SSE, mesajlar
    components/ — Titlebar, Rail, Home, Chat, Icon
```

## Bilinen sınırlar

- İlk mesaj gönderilirken sessionId henüz bilinmediği için SSE aboneliği geçici
  olarak filtresiz — aynı sunucuya bağlı başka bir oturum (ör. CLI) o pencerede
  aynı anda mesaj üretirse olaylar karışabilir. Tek-oturumluk masaüstü kullanım
  için kabul edilebilir bir sınır (bkz. `App.jsx` içindeki yorum).
- `electron-builder` ile paketleme (`npm run dist`) denenmedi — sadece `npm start`
  (geliştirme modu) doğrulandı.
