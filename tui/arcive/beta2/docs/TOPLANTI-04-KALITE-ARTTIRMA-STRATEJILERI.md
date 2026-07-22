# TOPLANTI-04: 3D Terminal Render Kalitesi Artırma Stratejileri

**Tarih:** 2026-07-21
**Katılımcılar:** Ozyn (sahip), Orion Aethelred (AI ajan)
**Gündem:** Mevcut half-block 3D render kalitesinin (80×44 piksel, 20 üçgen) iyileştirilmesi

---

## 1. Mevcut Durum Analizi

| Boyut | Değer | Sorun |
|-------|-------|-------|
| Canvas | 80×44 piksel | Çok düşük çözünürlük, bloklu görüntü |
| Half-block | 80×22 karakter | Her karakter 2 piksel (üst/alt), renk bilgisi kaybı yok |
| Üçgen sayısı | 20 | Basit bir oda + masa, detay eksik |
| Işıklandırma | Lambertian (diffuse) | Gölge yok, yansıma yok, ambient occlusion yok |
| Z-buffer | Var | Doğru, ama gölge/transparency yok |

**Temel problem:** Terminal hücresi başına sadece 2 piksel (half-block) → 80 sütun × 44 satır = 3.520 piksel toplam. Modern bir monitörün milyonlarca pikseline kıyasla ~250× daha az.

---

## 2. Araştırma Bulguları

### 2.1 GitHub'daki Terminal 3D Motorları

| Proje | Dil | Yaklaşım | Çözünürlük | Öne Çıkan |
|-------|-----|----------|------------|-----------|
| **ratatui-3d** (limlabs) | Rust | HalfBlock/Braille/ASCII rasterizer | HalfBlock ×1, Braille ×8 | Phong shading, OBJ/glTF yükleme, GIF export |
| **tsplat** (darshanmakwana) | Rust | Gaussian Splatting → half-block | HalfBlock + Kitty | CPU-only, SSH üzerinden çalışır, tiled parallel compositing |
| **TermiGoCraft** (SvnFrs) | Go | Voxel raycaster + half-block | HalfBlock (×2) | Ray-traced shadows, ambient occlusion, AABB physics |
| **xRenderEngine** (ulpian) | Rust | **Sub-cell sampling** (2×4/cell) + shape-vector glyph | 2×4 = ×8 | Cell shader plug-in sistemi, OKLab renk uzayı |
| **Nova3DVisualiser** (Jareltis) | C# | Raytracer → ASCII (CPU/CUDA) | Piksel bazlı | GPU (CUDA/ILGPU) ile hızlandırma, diff rendering |
| **fidelitty** (aaronbanse) | Zig | **Custom PUA font** → per-cell optimal glyph seçimi | 2×4 veya 3×5 | MSE minimizasyonu ile en iyi karakter+renk seçimi |

### 2.2 Kalite Artırma Teknolojileri

| Teknoloji | Kaynak | Nasıl Çalışır | Terminal 3D'ye Uyarlanabilir mi? |
|-----------|--------|---------------|----------------------------------|
| **DLSS** (NVIDIA) | VideoCardz testi | Düşük çözünürlük render + temporal accumulation + CNN upscale + motion vectors | ❌ Temporal bilgi terminalde yok, motion vector hesaplama maliyeti yüksek |
| **Texel Splatting** | Dylan Ebert (2026) | Cubemap → world-space quad splat → stabil piksel | ⚠️ Fikir güzel ama cubemap terminal için çok ağır |
| **xBRZ upscaling** | Pixagram | Edge-aware integer scaling (2×–6×) | ✅ **Direkt uygulanabilir** — kenar korumalı upscale |
| **CRT post-process** | CRTty | LD_PRELOAD ile GLSL shader enjeksiyonu (scanlines, bloom, vignette) | ⚠️ CRT efekti terminalde anlamlı değil ama **bloom/glow simulasyonu** Canvas'ta yapılabilir |
| **Gradient Descent ASCII** | stong/gradscii-art | Softmax + differentiable rendering ile optimal karakter seçimi | ⚠️ Offline çalışır, real-time için çok yavaş |
| **Sub-cell sampling** | xRenderEngine | Her hücreyi 2×4 alt-piksel ızgarada rasterize + cell shader | ✅ **Çok uygun** — mevcut yapıya eklenebilir |
| **Custom glyph font** | fidelitty | PUA bölgesinde tanımlı font ile hücre başına 8 piksel | ✅ **En yüksek kalite** — ama font oluşturma + kurulum gerektirir |
| **OKLab renk uzayı** | fidelitty, xRenderEngine | Algısal renk farkı metriği, daha doğru renk eşlemesi | ✅ Kolay entegrasyon |

### 2.3 Pixel Art Upscaling Algoritmaları

| Algoritma | Tür | Karakteristikler |
|-----------|-----|------------------|
| Nearest-neighbor | Basit | Bloklu, keskin |
| Bilinear | Basit | Yumuşak, bulanık |
| **EPX/Scale2x** | Edge-aware | Blokları korur, SNES/Genesis tarzı |
| **xBRZ** | Edge-aware | Diagonal temiz, PS1/SNES için ideal |
| **Anime4K** | CNN-based | Çizgi film/animeler için |
| **FSR 1.0** (AMD) | Spatial upscale | Edge + detail reconstruction |
| **CuNNy** (Magpie) | CNN | Metin + grafik dengesi iyi |

---

## 3. Önerilen Stratejiler

### Strateji A: Sub-Cell Sampling + xBRZ Upscale (KOLAY, ~1 hafta)

```
3D Render (native res: 80×44) → Z-buffer fill → xBRZ 2× → 160×88 piksel → Half-block render → Terminal
                                                                        ↑
                                                               Kenar korumalı upscale
```

**Avantaj:** Mevcut rasterizer değişmez, sadece upscale eklenir.
**Dezavantaj:** Upscale sonrası half-block'a düşürünce fazla kazanç olmayabilir.

### Strateji B: Quadrant + Half-block Hibrit (ORTA, ~2 hafta)

```
3D Render → Canvas 160×88 piksel (natif) → Quadrant/Hex glyph seçimi → Half-block fallback
```

- Her terminal hücresi için 4×4 veya 2×4 alt-piksel
- En yakın Unicode glyph (▌▐▖▗▘▙▚▛▜▝▞▟ + braille)
- `xRenderEngine`'in cell shader konseptinden esinlenme

**Avantaj:** Braille ile 2×4 = ×8 çözünürlük artışı, yatay/dikey geçişlerde daha iyi
**Dezavantaj:** Braille sadece tek renk (monochrome), renkli versiyon sınırlı

### Strateji C: Sub-pixel Glyph Seçimi (ZOR, ~1 ay)

> fidelitty yaklaşımı: Her hücre için MSE hesaplayarak en iyi karakter+renk kombinasyonunu bul

```
3D Render (sub-cell grid) → Patch extract → MSE minimization → Glyph + 2-color output
```

1. Terminal hücresini N×M alt-piksele böl (ör: 2×3, 3×5)
2. 2^N×M olası glyph pattern'i arasından en düşük MSE'li seç
3. Optimal foreground/background rengini hesapla
4. Custom PUA font veya mevcut Unicode glyph'ler

**Avantaj:** En yüksek kalite (3×5 = hücre başına 15 piksel)
**Dezavantaj:**
- Hücre başına 32K pattern değerlendirme → çok yavaş
- Custom font kurulum gerektirir
- 2 renk/kontrast sınırlaması

### Strateji D: Temporal Accumulation + Anti-aliasing (ORTA, ~1 hafta)

```
Frame N-1 z-buffer → Frame N z-buffer → Temporal blend (0.7/0.3) → Output
                         ↓
                Sub-pixel jitter camera (1/2 piksel)
```

- Kamera her frame'de 0.5 piksel kaydırılır → 2 frame'de supersample
- Eski frame'in z-buffer'ı ile yeni frame birleştirilir
- Hareketli objeler için velocity buffer gerekmez (çok yavaş değilse sorun yok)

**Avantaj:** Aliasing azalır, kenarlar yumuşar
**Dezavantaj:** Hareket bulanıklığı (ghosting), ilk frame bekler

### Strateji E: AI-based Character Prediction (DENEYSEL, süre bilinmez)

> Gradient descent ASCII art → real-time uyarlaması

- CNN ile her cell patch → optimal karakter
- Render zamanı değil, **offline eğitim** gerektirir
- Şimdilik çok yavaş (dakikalar mertebesinde)

**Önerme:** Şimdilik rafa kaldır, ileride tekrar değerlendir.

---

## 4. Strateji Karşılaştırması

| Strateji | Kalite Artışı | Performans | Karmaşıklık | Uygulanabilirlik |
|----------|---------------|------------|-------------|------------------|
| **A** (xBRZ upscale) | ~1.3× | Çok hızlı | Düşük | ✅ Şimdi yapılabilir |
| **B** (Quadrant + Braille) | ~4× | Hızlı | Orta | ✅ Şimdi yapılabilir |
| **C** (Sub-pixel glyph) | ~8× | Yavaş | Yüksek | ⚠️ Custom font gerekli |
| **D** (Temporal AA) | ~1.5× | Orta | Orta | ✅ Şimdi yapılabilir |
| **E** (AI prediction) | ~3× | Çok yavaş | Çok yüksek | ❌ Şimdilik değil |

**Kombinasyon önerisi:** **B + D** (Quadrant + Temporal AA) → en iyi fayda/çaba oranı

---

## 5. Karar: Yol Haritası

### Faz 1 (Öncelikli, 1 hafta): Sub-Cell Sampling + Quadrant Renk

1. Z-buffer mekanizmasını canvas'tan bağımsızlaştır → **alt-piksel çözünürlükte** render
2. `Canvas` sınıfına sub-cell sampling ekle (her terminal hücresi 2×4 = 8 sample)
3. Quadrant glyph mapper: örnek desen → Unicode glyph (▌,▐,▖,▗,▘,▙,▚,▛,▜,▝,▞,▟ + braille)
4. Half-block fallback (quadrant → half-block'a düşer)

```
Sub-cell buffer (160×176) → Quadrant mapper → Canvas (80×44) → Terminal
```

### Faz 2 (Orta vadeli, 2 hafta): Post-processing + Işıklandırma

1. **Kenar tespiti + outline** → pixel art tarzı siyah kontur (Texel Splatting/tehkato yaklaşımı)
2. **Ambient occlusion** → köşelerde karartma (TermiGoCraft yaklaşımı)
3. **Bloom efekti** → parlak yüzeylerde ışıma (CRTty benzeri)
4. **Daha karmaşık gölgeler** → shadow mapping

### Faz 3 (Uzun vadeli, 2-4 hafta): Performans + Detay

1. **Tiled parallel compositing** (tsplat yaklaşımı)
2. **Ray-traced gölgeler** (TermiGoCraft'taki DDA ray marching)
3. **Obje yükleme** → OBJ/glTF import
4. **Custom PUA font** ile full sub-pixel glyph rendering

---

## 6. Hemen Yapılacaklar

### 6.1 Sub-Cell Pipeline (detaylı tasarım)

```
Mevcut:
  3D üçgen → pixel setPixel(x, y, r, g, b)  [1 piksel = 1 terminal pikseli]

Yeni:
  3D üçgen → sub-pixel sample (2×4 grid) → quadrant analyse → glyph select
           ↓
   160 × (44×4) = 160 × 176 sub-pixel buffer
```

Terminal hücresi başına:
```
  ╔═══╤═══╗
  ║ a │ b ║     → quadrant grid (2×2)
  ╟───┼───╢     her quadrant 1×2 alt-piksel
  ║ c │ d ║     4 ortalama renk
  ╚═══╧═══╝
  → Unicode glyph seçimi + 2 renk (fg/bg)
```

### 6.2 Kod Değişiklikleri

1. `raster3d.ts` — Z-buffer'ı alt-piksel çözünürlükte çalıştır
2. `renderer.ts` — `Canvas`'a `renderQuadrant()` metodu ekle
3. Yeni `glyph.ts` — quadrant deseni → Unicode karakter mapper
4. `index.ts` — yeni render pipeline'ı entegre et

---

## 7. Referanslar

- [ratatui-3d](https://github.com/limlabs/ratatui-3d) — Rust terminal 3D renderer with HalfBlock/Braille/ASCII
- [tsplat](https://github.com/darshanmakwana412/tsplat) — Gaussian Splatting in terminal, tiled parallel compositing
- [TermiGoCraft](https://github.com/SvnFrs/TermiGoCraft) — Voxel raycaster, ray-traced shadows, AO
- [xRenderEngine](https://github.com/ulpian/xRenderEngine) — Sub-cell sampling + shape-vector cell shader
- [fidelitty](https://github.com/aaronbanse/fidelitty) — Custom PUA font per-cell glyph optimization
- [Texel Splatting](https://github.com/dylanebert/texel-splatting) — Perspective-stable 3D pixel art (2026)
- [CRTty](https://github.com/kosa12/CRTty) — Post-processing shader framework for terminals
- [tehkato/unity-isometric-pixel-pipeline](https://github.com/tehkato/unity-isometric-pixel-pipeline) — Pixel art pipeline with outline shader
- [DLSS @ 1% scale](https://videocardz.com/newz/dlss-tested-at-1-render-scale-38x22-pixels-upscaled-to-4k-but-playability-starts-around-764x430) — Temporal super resolution testi
- [gradscii-art](https://github.com/stong/gradscii-art) — Differentiable ASCII art via gradient descent
- [pixagram-upscaler](https://github.com/pixagram-blockchain/pixagram-upscaler) — xBRZ GPU-accelerated pixel art upscaler
- [Nova3DVisualiser](https://github.com/Jareltis/Nova3DVisualiser) — CUDA-accelerated ASCII raytracer
- [Pilzprinz Upscale](https://pilzprinz.itch.io/pilzprinz-upscale) — 18 upscaling algorithms comparison
