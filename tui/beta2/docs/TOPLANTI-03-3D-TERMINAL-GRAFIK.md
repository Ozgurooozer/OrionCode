# TOPLANTI-03 — Terminalde 3D Grafik: Yeni Nesil TUI Render

## Özet — Neden Özgün Olmalıyız?

Terminal TUI araçlarının büyük çoğunluğu ya ASCII logo gösterir, ya renkli kutular çizer, ya da düz metin akışı sunar. Hiçbiri terminalde **gerçek 3 boyutlu bir sahneyi pixel düzeyinde render etmez**.

Orion bunu yapacak. Bir AI kodlama ajanına **derinlik, perspektif ve mekansal farkındalık** kazandırmak — bunu daha önce kimse yapmadı.

## Teknik Araştırma: Terminal Ne Kadar "Grafik" Olabilir?

### 1. Karakter Tabanlı Render Teknikleri

| Yöntem | Çözünürlük | Renk | Kapsama Alanı |
|--------|-----------|------|---------------|
| **Half-block (▀)** | 2 dikey piksel/hücre | 24-bit truecolor | Tüm modern terminaller |
| **Quadrant (▖▗▘▙)** | 2×2 piksel/hücre | 24-bit truecolor | Unicode terminaller |
| **Sextant** | 2×3 piksel/hücre | 24-bit truecolor | Unicode 15+ sürümleri |
| **Braille (⠁-⣿)** | 2×4 piksel/hücre | Monokrom/gri | Tüm terminaller |

### 2. Pixel Protokolleri

| Protokol | Çözünürlük | Kalite | Destek (Terminal) |
|----------|-----------|--------|-------------------|
| **Kitty** | 1×1 (pixel) | Pixel-perfect + PNG, alpha, z-index | Kitty, WezTerm, Ghostty, Konsole |
| **Sixel** | 1×1 (pixel) | Paletli bitmap | xterm, Windows Terminal, WezTerm, foot |
| **iTerm2** | 1×1 (pixel) | Base64 PNG | iTerm2, WezTerm |

### 3. Mevcut Ekosistem

Araştırmada keşfedilen önemli kütüphaneler:

| Kütüphane | Açıklama |
|-----------|----------|
| **@blecsd/3d** | Node.js terminal 3D motoru — software rasterizer, OBJ loader, Braille/Halfblock/Sextant/Sixel/Kitty backend |
| **dapple** | Unified terminal graphics — braille, quadrant, sextant, sixel, kitty + auto-detection |
| **ink-picture** | Terminale görsel basma — Kitty, Sixel, iTerm2, halfblock, braille, ASCII fallback |
| **terminus-ascii-3d** | ASCII 3D render motoru — 30+ şekil, z-buffer, ışık |
| **ansimax** | Kapsamlı TUI kütüphanesi — pixel art, canvas, braille sub-pixel |

## Mimari Karar — Nasıl İlerleyeceğiz?

### A) Mevcut @blecsd/3d'yi kullanmak
- **Artı**: Hazır pipeline (matris, rasterizer, OBJ, multi-backend)
- **Eksi**: Dış bağımlılık, bizim Canvas'ımızla uyumsuz, özgünlük az

### B) Headless Three.js + headless-gl
- **Artı**: Full WebGL pipeline, gölge, doku, ışık
- **Eksi**: Ağır kurulum (gl, canvas, sharp), Docker'da Xvfb gerekebilir

### C) Kendi 3D matematiğimizi yazmak — ✅ SEÇİLDİ
- **Artı**: Sıfır dış bağımlılık, tam kontrol, mevcut Canvas'ımızla uyumlu
- **Artı**: Özgün — terminalde 3D render yapan başka CJS kütüphanesi yok
- **Artı**: İhtiyacımız sadece vertex projeksiyonu + basit rasterization (full WebGL gerekmez)
- **Eksi**: Sıfırdan yazacağız

**Karar: C — Kendi 3D matematiğimiz + mevcut half-block Canvas'ımız**

## Plan

### Faz 1 — 3D Matematik Kütüphanesi (`landing/math3d.ts`)
- `vec3` — 3D vektör işlemleri (toplama, çıkarma, çarpma, dot, cross, normalize, length)
- `mat4` — 4×4 matris işlemleri (identity, multiply, translate, rotateX/Y/Z, scale, invert, transpose)
- `projection` — perspektif ve orthographic projeksiyon matrisi
- `camera` — lookAt, view matrix, viewport transform
- `transform` — model → world → view → projection → NDC → screen

### Faz 2 — Scene Graph + Mesh (`landing/scene3d.ts`)
- `Mesh` — vertex list + face list (üçgen indices)
- `Scene` — mesh koleksiyonu + transform (position, rotation, scale)
- Hazır şekiller: box (oda), cuboid (masa), plane (duvar/zemin)

### Faz 3 — Software Rasterizer (`landing/raster3d.ts`)
- Vertex shader (MVP → screen space)
- Triangle filling (scanline veya barycentric)
- Z-buffer (derinlik testi)
- Yüzey normaline göre simple lighting (Lambertian)
- Wireframe overlay (isteğe bağlı)

### Faz 4 — Integration (`landing/index.ts`)
- 3D sahneyi mevcut Canvas'a yaz
- Half-block renderer ile terminale çık
- Portal render: 3D sahneyi sadece landing'in alt bölgesinde göster
- Kullanıcı sahne içinde gezinemez ama dönen/animasyonlu görüntü izler

## Örnek: 3 Oda + Masa

```txt
         ┌─────────────┐
        ╱ ▓▓▓▓▓▓▓▓▓▓▓ ╲
       ╱ ▓ masa ▓▓▓▓  ╲╲
      ╱ ▓▓▓▓▓▓▓▓▓▓ ▓  ╲╲
     ╱ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ╲╲
    ╱____________________╲╲
   ╱ ▓  duvar   ▓▓▓▓▓▓▓▓ ╲
  ╱ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ╲
 ╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╲
╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╲
╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓╲
─────────────────────────
     yer      zemini
```

Gerçek çıktı, half-block karakterler + truecolor renklerle derinlik ve perspektifi yansıtacak.

## Teknik Detay

### 3D → 2D Projeksiyon Akışı

```
Model Vertices (obj-space)
    ↓ M (model matrix — translate, rotate, scale)
World Vertices (world-space)
    ↓ V (view matrix — camera position/orientation)
View Vertices (view-space / eye-space)
    ↓ P (projection matrix — perspective veya orthographic)
Clip Vertices (clip-space)
    ↓ perspective divide (w'ye böl)
NDC Coordinates (-1 .. +1)
    ↓ viewport transform (scale + bias)
Screen Coordinates (pixels)
    ↓ z-buffer test + triangle fill
Canvas Buffer (Uint8Array RGBA)
    ↓ half-block render
Terminal Output
```

### Backend Geçişi (İleriki Fazlarda)

Auto-detect: `detectTerminalGraphics()` ile:

1. Kitty varsa → pixel-perfect Kitty protocol
2. Sixel varsa → Sixel bitmap
3. Yoksa → half-block (mevcut)

Her backend aynı Canvas buffer'ını alır, farklı çıktı üretir.

## Sonuç

Bu yaklaşım, Orion'u terminal TUI'lerinde **eşsiz** kılacak. 3D mekansal farkındalık + truecolor + half-block rendering = terminalde daha önce görülmemiş bir deneyim.

Özgünlük sadece "güzel görünmek" değil — **terminalin sınırlarını zorlamak** ve kullanıcıya "bu bir terminal mi?" dedirtmek.
