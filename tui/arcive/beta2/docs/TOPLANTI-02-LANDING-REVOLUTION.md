# TOPLANTI-02 — Orion Landing Page: Devrim Niteliğinde Tasarım

## Özet: Neden "Klasik" Kalmamalıyız?

Mevcut Orion giriş ekranı (emblem.js) tipik bir ASCII logo + gradient + statik takımyıldızdan ibaret. Bu, neofetch/fastfetch/starfetch'in yaptığından farklı değil. Oysa Orion bir **AI kodlama ajanı** — giriş ekranı da bu yeniliği yansıtmalı.

Araştırma sonuçlarına göre **hiçbir terminal projesi şu dört şeyi birleştirmiyor**:
1. Deterministik tohumlu bir gece gökyüzü (seed'lenmiş starfield)
2. Takımyıldızın yıldızdan yıldıza çizilme animasyonu (jeodezik draw)
3. "ORION" yazısının harf harf ortaya çıkışı (eşzamanlı dual reveal)
4. Gerçek terminal grafik protokolleriyle (Kitty/Sixel) otomatik yükseltme

---

## 1. TERMINAL GİRİŞ TEKNİKLERİ KATALOĞU

### Klasik / Kaçınılması Gerekenler

| Teknik | Nerede Kullanılıyor | Neden Klasik |
|--------|---------------------|-------------|
| Statik ASCII logo + gradient | neofetch, fastfetch, macchina | 15+ yıllık, her fork'ta aynı |
| Figlet banner | Her yerde | 90'lar teknolojisi |
| Matrix yağmuru | cmatrix, phantom-terminal | Aşırı klişe (30+ repo) |
| Cyberpunk neon paleti | 50+ tema | Tokyo Night/Catppuccin türevi |
| Yükleniyor çubuğu + "güvenlik adımları" | phantom-terminal, fake-hack-sim | Yapay, kullanıcıyı oyalıyor |
| lsd / exa stilinde dosya listesi | Neovim dashboard | Editöre ait bir şey, Orion'a değil |

### Yeni Nesil / Alınması Gereken İlhamlar

| Proje | Yaptığı Şey | Alınacak Ders |
|-------|------------|--------------|
| **starcommand** (Bash) | Her shell açılışında deterministic PRNG ile eşsiz roket + yıldız üretir | Seed tabanlı generatif sanat — her açılışta farklı ama tekrarlanabilir |
| **termarium** (Rust/Ratatui) | 24 FPS terminal planetaryumu, 88 takımyıldız, braille çizgiler | Takımyıldız çizim motoru referansı |
| **astroterm** (C) | Gerçek zamanlı planetaryum, braille+yarım-blok yıldız render | Düşük seviye terminal astronomi render |
| **gnhf** (Kun Chen CLI) | Ağırlıklı yıldız glifleri (`·` `✧` `⋆` `°`), per-star phase clock, differential render | Profesyonel yıldız alanı motoru |
| **tachyonfx** (Rust) | 50+ terminal efekti (fade, dissolve, sweep, expand, stretch, evolve, coalesce) | Efekt kompozisyon motoru — sequence/parallel/repeat |
| **inkling** (Rust) | ASCII art'ı jeodezik iskelet iziyle ortaya çıkarma (Geodesic reveal) | Harf harf değil şekil tabanlı reveal tekniği |
| **terminaltexteffects** (Python) | 35+ animasyon efekti (blackhole, fireworks, particles, smoke) | Frame-based animasyon mimarisi referansı |
| **3D ASCII Renderer** / **glyphcss** | 3B modelleri terminale render | Orion logosu için 3B rotasyon fikri |
| **Copilot CLI Banner** (TypeScript) | 20 frame'lik 3 saniyelik ASCII animasyonu, semantic color roles | Profesyonel kalite terminal animasyonu standardı |
| **notcurses** (C) | Video oynatma, alpha blending, plane rotation, Sixel/Kitty | En yetenekli terminal grafik kütüphanesi |
| **oh-my-logo** (TypeScript) | Gradient ASCII logo, 13 renk paleti, shadow efektleri | Zero-dep gradient logo üretimi |
| **GitHub Copilot CLI Banner** (TS/Ink) | 6000 satır, 3sn animasyon, frame-based, non-blocking | Terminallerde animasyon yapmanın doğru yolu |

---

## 2. ORION'A ÖZGÜ TASARIM DİLİ

### Renk Paleti: "Kozmik Avcı"

Mevcut `colors.ts`'den türetilmiş anlamsal 5 token:

```
void     #07090f     — uzayın derin siyahı (pür siyah değil, hafif mor kalıntılı)
star     #60dcff     — yıldız mavisi (Betelgeuse/Rigel)
nebula   #a78bfa     — bulutsu moru
belt     #fbbf24     — kemer altını (Orion kemerindeki 3 yıldız)
accent   #38bdf8     — atmosfer gökyüzü mavisi
```

### Anlamsal Renk Rolleri (Copilot CLI'den esinlenildi)

```
star	glow      ✦ yıldız parlamaları
nebula	aura      bulutsu arka plan ışımaları
belt	focus     önemli vurgular
void	base      ana zemin
accent	info      bilgi metinleri
```

### Tipografi

- Büyük başlıklar: **gradient** (star → nebula) — mevcut `gradient()` fonksiyonu yeterli
- Alt bilgiler: `BOLD` + `accent`
- Kod/komut: `teal` (`#2dd4bf`)

---

## 3. ÖNERİLEN TASARIM KONSEPTLERİ

### Konsept A: "Takımyıldız Doğuyor" (ÖNERİLEN)

**Süre:** ~3 saniye, non-blocking
**Zorluk:** Orta
**Özgünlük:** 9/10

**Animasyon akışı:**

1. **Arka plan (0.0s):** Void zemin üzerinde yıldız alanı belirir — her yıldız deterministik bir seed ile konumlandırılır. Farklı boyutlarda glifler (`·` `✧` `⋆` `✦` `°`). Her yıldızın kendi faz saati vardır (yanıp sönme periyodu).

2. **Takımyıldız çizimi (0.5-1.5s):** Orion takımyıldızının 8 ana yıldızı (Betelgeuse, Bellatrix, Alnitak, Alnilam, Mintaka, Saiph, Rigel, Meissa) teker teker parlar. Ardından aralarına braille/yarım-blok çizgiler çizilerek takımyıldız iskeleti oluşur.

3. **ORION yazısı (1.5-2.5s):** "ORION" yazısı harf harf (veya jeodezik reveal ile) ekranın üst/orta kısmında belirir. Gradient star → nebula.

4. **Tamamlanma (2.5-3.0s):** Kemer altını (`belt`) ile künye bilgileri (model, backend) yazılır. Takımyıldız sabitlenir, yıldızlar yanıp sönmeye devam eder.

5. **Auto-dismiss:** İlk tuşa basışta veya 3 sn sonra kaybolur.

**Referans Algoritmalar:**
- `gnhf` starfield: weighted glyph seçimi, per-star phase clock, differential render
- `inkling` Geodesic reveal: ASCII art'ı iskelete indirgeme + sıralı çizim
- `starcommand` seeding: XORShift32 PRNG — her kullanıcı/seans için eşsiz gökyüzü
- `termarium` constellation rendering: Braille çizgi çizimi

**Teknik Stack:**
- Canvas API (`setPixel`, `drawLine`, `fillRect`) → 3 renderer:
  - Half-block (fallback, her terminalde çalışır)
  - Braille (daha yüksek çözünürlük)
  - Kitty Protocol (en kaliteli, RGBA görüntü — modern terminallerde)

---

### Konsept B: "3B Orion Rotasyonu"

**Süre:** ~3 saniye
**Zorluk:** Yüksek
**Özgünlük:** 8/10

**Animasyon akışı:**
- Bir 3B Orion heykeli/takımyıldızı ASCII karakterlerle render edilir ve yavaşça döner
- `glyphcss` veya custom raycast engine kullanılır
- Arkada yıldız alanı parallax ile hareket eder
- Dezavantaj: 30 FPS için güçlü terminal gerekir

---

### Konsept C: "Parçacık Patlaması (Nebula Doğumu)"

**Süre:** ~2 saniye
**Zorluk:** Orta-Yüksek
**Özgünlük:** 7/10

**Animasyon akışı:**
- Orion parçacıkları (braille glifleri) merkezden patlayarak dağılır
- Renk star → nebula gradientini takip eder
- Parçacıklar yavaşlayıp sabitlenince ORION yazısı oluşur
- `terminaltexteffects` Blackhole/Smoke efektine benzer

---

### Konsept D: "Uzaylı Sinyali / Spektrogram"

**Süre:** ~2.5 saniye
**Zorluk:** Düşük-Orta
**Özgünlük:** 8/10

**Animasyon akışı:**
- Ekranın ortasında bir spektrogram/radar dalgası çizilir
- Daireler genişleyerek yıldızlara dönüşür
- Merkezde "ORION" yazısı fade-in olur

---

## 4. MİMARİ ÖNERİSİ

```
tui/beta2/src/landing/
├── index.ts              — compositor: animasyon döngüsü, auto-dismiss, fallback
├── starfield.ts           — deterministik yıldız alanı motoru
├── constellation.ts       — Orion takımyıldızı çizim motoru
├── renderer.ts            — Canvas API → terminal çıktısı dönüştürücü
│   ├── halfblock.ts       — yarım-blok render (fallback)
│   ├── braille.ts         — braille render (yüksek çözünürlük)
│   └── kitty.ts           — Kitty Protocol render (en kaliteli)
├── effects.ts             — efektler (fade, pulse, breathe)
└── data/
    ├── orion-stars.ts     — Orion yıldız koordinatları (8 ana + 3 kemer)
    └── frames.ts          — önceden hesaplanmış frame'ler (opsiyonel)
```

### Renderer Seçim Mantığı (Graceful Degradation)

```
if (kitty protocol supported)           → kitty.ts (RGBA, en kaliteli)
else if (sixel supported)               → sixel.ts (paletli, orta kalite)
else if (unicode 16 octants supported)  → braille.ts (8px/hücre, yüksek çözünürlük)
else if (unicode 13 sextants supported) → braille.ts (6px/hücre)
else                                    → halfblock.ts (2px/hücre, her yerde çalışır)
                                    → fallback: statik sembol.js
```

### Animasyon Döngüsü (gnhf pattern)

```typescript
let running = true;
process.stdin.once("keypress", () => { running = false; clear(); });

while (running && elapsed < 3000) {
  const frame = compose(elapsed, stars, constellation, text);
  render(frame);          // sadece değişen hücreleri yaz
  await sleep(80);        // ~12.5 FPS — Copilot CLI 75ms ideal
}
```

---

## 5. KULLANICI DENEYİMİ PRENSİPLERİ

1. **Non-blocking olmalı** — Kullanıcı hiçbir zaman animasyonun bitmesini beklememeli. İlk tuşta anında kaybolur.
2. **Saydam katman** — Animasyon, terminal içeriğini kaydırmaz, üstüne render edilir ve silinir.
3. **Accessibility** — `prefers-reduced-motion` CSS sorgusuna saygı (OS ayarına göre animasyonu atla).
4. **Terminal boyutu** — <60 kolon ise statik künyeye düş, <40 ise tamamen atla.
5. **Seed tabanlı** — Her açılışta farklı ama aynı günde aynı seed ile tekrar üretilebilir (günlük değişen gökyüzü).
6. **Sadece TTY** — `!process.stdout.isTTY` ise direkt geç.

---

## 6. TEKNİK REFERANSLAR

| Kaynak | Aldığımız Şey |
|--------|--------------|
| [gnhf blog: terminal animation](https://blog.kunchenguid.com/terminal-animation/) | Starfield motoru, differential rendering, per-star phase clock |
| [starcommand](https://github.com/clefspear/starcommand) | Deterministic PRNG seeding |
| [astronra/termarium](https://github.com/7b7b7b/termarium) | Braille constellation drawing |
| [inkling](https://github.com/codizzler/inkling) | Geodesic reveal ordering |
| [GitHub Copilot CLI banner](https://github.blog/engineering/from-pixels-to-characters-the-engineering-behind-github-copilot-clis-animated-ascii-banner/) | 75ms frame interval, semantic color roles, non-blocking |
| [tachyonfx](https://github.com/ratatui-org/tachyonfx) | Effect composition (parallel/sequence/repeat) |
| [sindresorhus/supports-terminal-graphics](https://github.com/sindresorhus/supports-terminal-graphics) | Terminal graphics protokolü tespiti |
| [glyphcss](https://github.com/zhengkyl/glyphcss) | 3B model → Unicode terminal |
| [termflix](https://github.com/koopa1338/termflix) | Braille canvas, particle system, dirty-cell rendering |
| [notcurses](https://github.com/dankamongmen/notcurses) | Alpha blending, video → terminal |
| [chafa](https://github.com/hpjansson/chafa) | Image → terminal (Tüm protokoller + Unicode) |
| [oh-my-logo](https://github.com/shinshin86/oh-my-logo) | Zero-dep gradient logo |
| [textual-hires-canvas](https://textual.textualize.io/widgets/hires_canvas/) | Canvas API pattern (half-block/quadrant/braille) |
| [ascii-motion](https://www.ascii-motion.com/) | ASCII animasyon düzenleme aracı |
| [terminaltexteffects](https://github.com/ChrisBuilds/terminaltexteffects) | 35+ hazır efekt, Python reference |
| [bangen](https://github.com/programmersd21/bangen) | Efekt pipeline'ı (motion→visual→temporal) |

---

## 7. KARAR: Konsept A

**"Takımyıldız Doğuyor" konsepti** ile devam ediyoruz. Sebepler:
1. En özgün — hiçbir terminal projesinde takımyıldız çizim animasyonu yok
2. Orion markasına en uygun — hem görsel hem hikayesel olarak
3. Seed tabanlı generatif sanat — her açılış farklı
4. Mevcut beta2 altyapısıyla uyumlu (require/module.exports, ansi.ts, colors.ts)
5. Renderer soyutlaması sayesinde çoklu terminal desteği

Sıradaki adım: Konsept A'nın uygulanması fazlarına geçmek.
