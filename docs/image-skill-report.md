# Image Skill Raporu

**Tarih:** 2026-07-21  
**Commit:** 61f8f24  
**Durum:** Aktif

---

## Akış

```
Kullanıcı → Orion → /image <prompt> → ComfyUI → görsel yolu
```

### 1. Tetiklenme

Kullanıcı "resim çiz", "görsel üret", "draw", "anime", "pixel art" gibi bir şey söyler.

İki yoldan tetiklenir:

- **System prompt** — her oturumda modele yazılı: `/image <prompt>` komutunu çalıştır, "resim üretemem" deme.
- **Skill injection** — `~/.orion/skills/image-generation.md` fuzzy match ile o tura enjekte olur. Tetikleyici kelimeler: `resim görsel çiz image draw anime pixel 3d render artwork fotoğraf sanat generate illustrate paint`

### 2. Orion'un yaptığı tek şey

Kullanıcının Türkçe/kısa isteğinden iyi bir **İngilizce image prompt** yazar.

```
kullanıcı:  "siberpunk kız çiz"
Orion yazar: cyberpunk girl, neon lights, glowing blue eyes, futuristic armor, anime style, detailed
```

Orion `/image <prompt>` komutunu çalıştırır — başka hiçbir şey yapmaz.

### 3. `/image` komutu (`core/commands/image.js`)

```
/image <prompt>               → workflow 1 (varsayılan)
/image <prompt> --workflow N  → N numaralı workflow (1–12)
```

Komutu `core/agents/imager.run()` çağrısına iletir, sonucu ekrana yazar.

### 4. `imager.run()` (`core/agents/imager.js`)

```
prompt + workflow index
    │
    ├─ ComfyUI ping → 127.0.0.1:8188/system_stats
    │   kapalıysa: hata döner
    │
    ├─ C:\3d\WORKFLOWS\ listesi → files[index] seçilir
    │
    ├─ Workflow JSON okunur
    │   KSampler → positive/negative node ID bulunur
    │   CLIPTextEncode düğümleri prompt ile yamanır
    │
    ├─ POST /prompt → { prompt: <patched>, client_id: "orion-imager" }
    │   → prompt_id alınır
    │
    └─ GET /history/<prompt_id> polling (1.5s aralık, max 120s)
        tamamlandığında → images[] döner
```

**Yerel model kullanılmaz.** Prompt doğrudan ComfyUI'ye gider.

### 5. Sonuç

```javascript
{
  success:  true,
  workflow: "illustrious_anime_txt2img.json",
  promptId: "abc123...",
  images: [
    {
      filename:  "illustrious_cyborg_00001_.png",
      localPath: "C:\\3d\\ComfyUI\\output\\illustrious_cyborg_00001_.png",
      url:       "http://127.0.0.1:8188/view?filename=..."
    }
  ]
}
```

Orion bu sonucu alır, dosya yolunu kullanıcıya söyler.

---

## Dosyalar

| Dosya | Görev |
|-------|-------|
| `core/agents/imager.js` | ComfyUI HTTP client, workflow patch, polling |
| `core/commands/image.js` | `/image` slash komutu |
| `core/session.ts` → `buildSystem()` | System prompt'a yetenek bildirimi |
| `~/.orion/skills/image-generation.md` | Fuzzy eşleşme + Orion için kullanım talimatı |
| `orion-mcp.js` | `image_status`, `image_start`, `generate_image` MCP araçları |

---

## Mevcut Workflow'lar (`C:\3d\WORKFLOWS\`)

| # | Dosya | Stil |
|---|-------|------|
| 1 | ascii_art_test.json | ASCII sanat |
| 2 | illustrious_anime_txt2img.json | Anime, SDXL ← **varsayılan** |
| 3 | MeshOnly_Pixal3D_GGUF.json | 3D mesh |
| 4 | MeshWithTexturing_Pixal3D_Full.json | 3D mesh + texture |
| 5 | MeshWithTexturing_Pixal3D_GGUF.json | 3D mesh + texture (GGUF) |
| 6 | orion_character_consistency_api.json | Karakter tutarlılığı |
| 7 | Pixal3D_MeshandTexturing_Workflow.json | 3D tam pipeline |
| 8 | pixel_sprite_sd15.json | Pixel-art, sprite |
| 9 | retro_anime_lora_test.json | Retro-scifi anime |
| 10 | retro_scifi_lora_test.json | Retro-scifi |
| 11 | rev_animated_hybrid.json | Realistic-anime |
| 12 | sdxl_basic_txt2img.json | Genel, SDXL |

> **Not:** Varsayılan workflow 1 (`ascii_art_test.json`) — dosya sistemi sıralaması alfabetik.  
> Anime için `--workflow 2`, pixel-art için `--workflow 8`.

---

## Bağımlılıklar

| Bileşen | Gereksinim |
|---------|------------|
| ComfyUI | `127.0.0.1:8188` üzerinde çalışıyor olmalı |
| Başlatma | `C:\3d\start.bat` → `C:\3d\venv\Scripts\python.exe main.py` |
| GPU | RTX 4060 8GB VRAM, CUDA 12.8 |
| Model dizini | `C:\3d\MODELLER\` (extra_model_paths.yaml ile bağlı) |
| Ollama | **Gerekmez** — prompt doğrudan ComfyUI'ye gider |

---

## MCP (dış agent'lar için)

```
image_status    → ComfyUI + Ollama durumu
image_start     → servis başlat (comfyui / ollama / all)
generate_image  → task: "<açıklama>" → aynı imager.run() akışı
```

Claude Code veya başka bir agent Orion'un MCP sunucusuna bağlanarak aynı pipeline'ı kullanabilir.
