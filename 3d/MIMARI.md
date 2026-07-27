# ComfyUI-EZi Mimari Analizi
# — Kendi Sistemimizi Kurmak İçin Referans

Hazırlanan tarih: 2026-07-15  
Sistem: RTX 4060 8GB | Python 3.12.10 | Torch 2.8.0+cu128 | CUDA 12.8  

---

## 1. EZi Nedir, Nedir Değil

**EZi (ComfyUI-Easy-Install)** — ComfyUI'nin bir fork'u DEĞİLDİR.  
Orijinal ComfyUI reposunun üstüne çekilmiş bir **kurulum + yönetim kabuğu**dur.

```
ComfyUI-EZi
│
├── KABUK (EZi'nin kendisi)          ← bunu biz yapacağız / ihtiyacımız olup olmadığına karar vereceğiz
│   ├── GUI launcher (EZi.py)
│   ├── Torch versiyonu değiştirme sistemi
│   ├── Add-On yönetimi (.bat scriptler)
│   └── Gömülü Python ortamı
│
└── ÇEKİRDEK (değiştirilmemiş orijinal repo)
    └── ComfyUI\  ← git clone https://github.com/comfyanonymous/ComfyUI
```

**Kritik çıkarım:** ComfyUI\main.py tamamen vanilla'dır. EZi hiçbir şeyi değiştirmez.  
`Start ComfyUI.bat` aslında şunu çalıştırır:
```
.\python_embeded\python.exe -I ComfyUI\main.py --windows-standalone-build
```

---

## 2. Tam Dosya Yapısı

```
C:\3d\ComfyUI-Easy-Install\
│
├── ComfyUI-EZi.bat                    ← ANA BAŞLATICI (GUI)
├── Start ComfyUI.bat                  ← DOĞRUDAN BAŞLATICI (GUI'siz)
├── Update ComfyUI.bat                 ← ComfyUI'yi güncelle
├── Update ComfyUI and Nodes.bat       ← ComfyUI + custom node'ları güncelle
├── Update Easy-Install.bat            ← EZi'nin kendisini güncelle
│
├── python_embeded\                    ← GÖMÜLÜ PYTHON ORTAMI
│   ├── python.exe                     (Python 3.12.10)
│   ├── pythonw.exe
│   ├── python312.dll
│   ├── pip.ini                        (pip ayarları)
│   ├── Lib\
│   │   └── site-packages\
│   │       ├── torch\                 (2.8.0+cu128 — şu an aktif)
│   │       ├── torchvision\
│   │       ├── torchaudio\
│   │       ├── xformers\
│   │       ├── open3d\                (Trellis2 için)
│   │       ├── nvdiffrast\            (Trellis2 için — GPU wheel)
│   │       ├── nvdiffrec_render\      (Trellis2 için — GPU wheel)
│   │       ├── cumesh\                (Trellis2 için — GPU wheel)
│   │       ├── flex_gemm\             (Trellis2 için — GPU wheel)
│   │       ├── o_voxel\               (Trellis2 için — GPU wheel)
│   │       └── ... (500+ paket)
│   └── Scripts\
│       └── pip.exe
│
├── ComfyUI\                           ← ORİJİNAL COMFYUI (değiştirilmemiş)
│   │
│   ├── main.py                        ← GİRİŞ NOKTASI
│   ├── server.py                      ← aiohttp web sunucu (:8188)
│   ├── execution.py                   ← Prompt/workflow yürütme motoru
│   ├── nodes.py                       ← Dahili node'lar (KSampler, VAE, CLIP vb.)
│   ├── folder_paths.py                ← Model klasör yolları yönetimi
│   ├── comfy\                         ← Core kütüphane (model loading, sampling)
│   ├── comfy_execution\               ← Execution graph motoru
│   ├── api_server\                    ← REST API endpoint'leri
│   ├── app\                           ← Web frontend (Vue.js)
│   │
│   ├── custom_nodes\                  ← EKLENTILER (30+ adet)
│   │   ├── ComfyUI-Trellis2-GGUF\    (3D üretim — Aero-Ex fork)
│   │   ├── ComfyUI-GGUF\             (GGUF model desteği — her GGUF için)
│   │   ├── ComfyUI-LTXVideo\         (video üretimi)
│   │   ├── ComfyUI-WanVideoWrapper\  (Wan video modeli)
│   │   ├── ComfyUI-nunchaku\         (hızlı inference, SVDQuant)
│   │   ├── ComfyUI-QwenVL\           (Qwen vision-language)
│   │   ├── ComfyUI-Easy-Use\         (kolaylık node'ları)
│   │   ├── comfyui-kjnodes\          (utility node'ları)
│   │   ├── comfyui-manager\          (node yönetici)
│   │   ├── comfyui_controlnet_aux\   (ControlNet preprocessing)
│   │   ├── comfyui_ipadapter_plus\   (IP-Adapter)
│   │   ├── ComfyUI-SCAIL-Pose\       (poz algılama)
│   │   ├── comfyui-rmbg\             (arka plan kaldırma)
│   │   ├── rgthree-comfy\            (gelişmiş UI node'ları)
│   │   ├── comfyui-easy-sam3\        (SAM3 segmentasyon)
│   │   ├── comfyui_layerstyle\       (katman stili efektler)
│   │   ├── ComfyUI-TiledDiffusion\   (büyük görüntü diffusion)
│   │   ├── ComfyUI-fish-audio-s2\    (ses üretimi)
│   │   ├── ComfyUI-MelBandRoFormer\  (ses ayrıştırma)
│   │   ├── qwen3-tts-comfyui\        (metin-ses)
│   │   ├── WhatDreamsCost-ComfyUI\   (maliyet hesaplama)
│   │   ├── ComfyUI-Krea2T-Enhancer\  (görüntü geliştirme)
│   │   ├── ComfyUI-Pixaroma\         (stil transfer)
│   │   ├── comfyui-videohelpersuite\ (video yardımcı araçlar)
│   │   ├── ComfyUI-WanAnimatePreprocess\ (animasyon ön işlem)
│   │   ├── comfyui-inpaint-cropandstitch\ (inpainting)
│   │   ├── comfyui-itools\           (görüntü araçları)
│   │   ├── controlaltai-nodes\       (ek kontrol node'ları)
│   │   ├── comfyui_ipadapter_plus\   (IP-Adapter plus)
│   │   └── seedvr2_videoupscaler\    (video upscale)
│   │
│   ├── models\                        ← MODEL DEPOSU (⚠ taşındı → C:\3d\MODELLER)
│   ├── input\                         ← Yüklenen giriş görselleri
│   ├── output\                        ← Üretilen çıktılar (görseller, GLB dosyaları)
│   ├── temp\                          ← Geçici önizleme dosyaları
│   └── user\                          ← Kullanıcı ayarları, workflow'lar
│
├── Add-Ons\                           ← EZI EK ARAÇLARI
│   │
│   ├── Tools\
│   │   ├── Helper-CEI\
│   │   │   ├── ComfyUI-EZi.py         ← GUI launcher ana scripti (Python/tkinter)
│   │   │   ├── ComfyUI-EZi.settings.json ← EZi ayarları
│   │   │   └── *.ico                  (simgeler)
│   │   ├── llama.cpp\                 ← GGUF inference engine (ComfyUI-GGUF için)
│   │   ├── Easy-model2GGUF.bat        ← Modeli GGUF'a dönüştürme aracı
│   │   ├── Toggle-DynamicVRAM.bat     ← VRAM ayarı değiştirici
│   │   ├── Long-Paths-Enabler.bat     ← Windows uzun yol desteği aç
│   │   └── ComfyUI-Version-Switcher.bat ← ComfyUI versiyonu geçişi
│   │
│   ├── Torch-Pack\                    ← TORCH VERSİYON YÖNETİCİSİ
│   │   ├── Torch 2.8.0+cu128.bat      ← ✅ Trellis2 için (şu an aktif)
│   │   ├── Torch 2.9.1+cu130 (default).bat ← Genel kullanım
│   │   ├── Torch 2.10.0+cu130.bat     ← En yeni (deneysel)
│   │   └── Torch 2.7.1+cu128.bat      ← Eski/uyumluluk
│   │
│   ├── 1. Easy-Models-Linker.bat      ← Başka klasördeki modelleri link et
│   ├── 2. Easy-System-Checker.bat     ← GPU/CUDA/Torch sistem kontrolü
│   ├── FlashAttention.bat             ← FlashAttention kur
│   ├── SageAttention-Multi.bat        ← SageAttention kur (v2.2.0 / v3)
│   ├── Nunchaku.bat                   ← Nunchaku (SVDQuant hızlandırması) kur
│   ├── Insightface.bat                ← Insightface (yüz tanıma) kur
│   ├── Trellis2 GGUF.bat              ← Trellis2 GGUF kur
│   ├── Trellis2_gguf_model_downloader.bat ← Trellis2 modellerini indir
│   ├── Trellis2 GGUF.md               ← Trellis2 kurulum notları
│   └── Trellis2 MCP Kurulum Notlari.md ← MCP entegrasyon notları
│
└── update\                            ← GÜNCELLEME ARAÇLARI
    ├── update.py
    ├── update_comfyui.bat
    ├── update_comfyui_stable.bat
    └── update_comfyui_and_python_dependencies.bat
```

---

## 3. EZi Sistem Akışı

### ComfyUI nasıl başlar?

```
Kullanıcı: ComfyUI-EZi.bat çift tıklar
    ↓
Helper-CEI\ComfyUI-EZi.py (Python/tkinter GUI açılır)
    ↓ kullanıcı "Start" der
python_embeded\python.exe ComfyUI\main.py --windows-standalone-build
    ↓
main.py → server.py başlatır (aiohttp, port 8188)
    ↓
Tarayıcı: http://127.0.0.1:8188
```

### Torch versiyonu nasıl değiştirilir?

```
Add-Ons\Torch-Pack\Torch 2.8.0+cu128.bat çalıştır
    ↓
pip uninstall torch torchvision torchaudio (python_embeded içinde)
    ↓
pip install torch==2.8.0+cu128 --index-url ... (python_embeded'e yükle)
    ↓
Trellis2 özel GPU wheel'lerini yükle (cumesh, nvdiffrast vb.)
```

### Workflow yürütme akışı:

```
Tarayıcı (Vue.js frontend)
    ↓ WebSocket / REST API
server.py
    ↓
execution.py (prompt queue, topological sort)
    ↓
Her node çalışır (custom_nodes\ + dahili nodes.py)
    ↓
Model yükleme: folder_paths.py → models\ altındaki dosyaları bulur
    ↓
GPU üzerinde inference (torch + CUDA)
    ↓
Çıktı: output\ klasörüne yazar
    ↓
Tarayıcıya bildirim (WebSocket)
```

---

## 4. EZi'nin Sağladığı vs. Sağlamadığı

### EZi'nin Sağladıkları:
| Özellik | Açıklama |
|---------|----------|
| Gömülü Python | Sistem Python'uyla çakışmaz, taşınabilir |
| Torch switcher | Farklı CUDA versiyonları arasında geçiş |
| GUI Launcher | tkinter tabanlı başlatıcı |
| Add-On scriptler | FlashAttention, SageAttention vb. tek tık kurulum |
| Model Linker | Dışarıdaki modellere symlink |
| System Checker | GPU/CUDA kontrolü |
| llama.cpp | GGUF inference motoru |

### EZi'nin SAĞLAMADIKLARI (= vanilla ComfyUI'den fark yok):
- ComfyUI kodunun kendisi (değiştirilmemiş)
- Custom node sistemi (ComfyUI'nin kendi sistemi)
- Workflow yapısı (ComfyUI'nin kendi JSON formatı)
- API (ComfyUI'nin kendi API'si)

---

## 5. Trellis2 Pipeline — Teknik Detay

```
INPUT: Görüntü (PNG/JPG) — karakter, obje vb.

AŞAMA 1 — Encoding:
  DINOv3 ViT-L/16 (facebook\dinov3-vitl16...)
      ↓ görüntü özellikleri (1156MB model)
  Shape Encoder (trellis2\encoders\shape_enc_next_dc_f16c32_fp16.safetensors)
      ↓ 3D latent vektör

AŞAMA 2 — Shape Diffusion:
  Shape DiT (trellis2\shape\..._Q4_K_M.gguf) [512 veya 1024 çözünürlük]
      ↓ diffusion (gürültü kaldırma, 3D uzayda)
  Sparse Structure Refiner (trellis2\refiner\..._Q4_K_M.gguf)
      ↓ rafine edilmiş 3D yapı

AŞAMA 3 — Shape Decoding:
  Stage 1 Decoder (trellis2\decoders\Stage1\ss_dec_conv3d_16l8_fp16.safetensors)
      ↓ sparse voxel
  Stage 2 Shape Decoder (trellis2\decoders\Stage2\shape_dec_next_dc_f16c32_fp16.safetensors)
      ↓ 3D mesh

AŞAMA 4 — Texture:
  Texture DiT (trellis2\texture\..._Q4_K_M.gguf) [512 veya 1024]
      ↓ doku diffusion
  Stage 2 Texture Decoder (trellis2\decoders\Stage2\tex_dec_next_dc_f16c32_fp16.safetensors)
      ↓ renkli yüzey

OUTPUT: .glb dosyası (ComfyUI\output\)

VRAM Kullanımı: ~6-7 GB (RTX 4060 8GB için uygun, sıkışık)
Torch Gereksinimi: 2.8.0+cu128 (sabit — diğer versiyonlarla çalışmaz)
```

---

## 6. Kendi Sistemimizi Kurarken Nelere İhtiyaç Var

### Zorunlu:
- [ ] Python 3.12.x (sistem veya gömülü — tercih: venv/conda)
- [ ] Torch 2.8.0+cu128 (Trellis2 için) veya 2.9.1+cu130 (genel)
- [ ] CUDA 12.8
- [ ] ComfyUI (orijinal repo: `git clone https://github.com/comfyanonymous/ComfyUI`)
- [ ] Model yolları: `extra_model_paths.yaml` ile `C:\3d\MODELLER`'i göster

### Trellis2 için ek:
- [ ] ComfyUI-Trellis2-GGUF custom node
- [ ] GPU wheel'leri: cumesh, nvdiffrast, nvdiffrec_render, flex_gemm, o_voxel
- [ ] open3d, rembg, pymeshlab, transformers, utils3d
- [ ] Torch 2.8.0+cu128 (gerekli!)

### İsteğe bağlı (performans):
- [ ] FlashAttention veya SageAttention (özellikle SDXL hızlandırması için)
- [ ] xformers

### EZi'den almamıza gerek YOK:
- GUI launcher (terminal veya kendi bat'ımız yeterli)
- Torch switcher (tek versiyon kullanalım)
- llama.cpp (ComfyUI-GGUF kendi içinde halleder)

---

## 7. Model Yolu Bağlama

Yeni ComfyUI kurulumunda modelleri tekrar kopyalamak YOK.  
`ComfyUI\extra_model_paths.yaml` dosyasında şunu yaz:

```yaml
my_models:
    base_path: C:\3d\MODELLER
    checkpoints: checkpoints
    loras: loras
    vae: vae
    controlnet: controlnet
    clip_vision: clip_vision
    ipadapter: ipadapter
    diffusion_models: diffusion_models
    text_encoders: text_encoders
    trellis2: trellis2
```

ComfyUI bu dosyayı okur ve `C:\3d\MODELLER` altındaki tüm modelleri görür.

---

## 8. Mevcut Workflow'lar

| Dosya | Konum | Ne Yapar |
|-------|-------|---------|
| `orion_character_consistency_api.json` | `ComfyUI-Easy-Install\workflows\` | API üzerinden karakter tutarlılığı üretimi |
| `Simple.json` | `custom_nodes\ComfyUI-Trellis2-GGUF\example_workflows\` | Trellis2 temel kullanım — image to 3D |

---

## 9. Silme Öncesi Kontrol Listesi

ComfyUI-Easy-Install silinmeden önce kurtarılması gerekenler:

- [x] `C:\3d\MODELLER\` — tüm modeller taşındı
- [ ] `ComfyUI\user\` — kayıtlı workflow'lar, ayarlar
- [ ] `ComfyUI\output\` — üretilmiş çıktılar (istersen)
- [ ] `Add-Ons\Torch-Pack\Torch 2.8.0+cu128.bat` — Trellis2 için Torch kurulum scripti
- [ ] `workflows\orion_character_consistency_api.json` — mevcut workflow
- [ ] Bu doküman (zaten `C:\3d\MIMARI.md`)

---

## 10. Sonraki Adımlar

```
1. Kurtarılacakları al (yukarıdaki liste)
2. ComfyUI-Easy-Install klasörünü sil
3. git clone https://github.com/comfyanonymous/ComfyUI C:\3d\ComfyUI
4. Python ortamı kur (venv veya conda önerilen)
5. pip install torch==2.8.0+cu128 ...  (ya da kendi seçtiğimiz versiyon)
6. extra_model_paths.yaml yaz → C:\3d\MODELLER bağla
7. Trellis2 kurulumuna karar ver (Torch 2.8 sabitlersek evet)
8. Kendi custom node'larımızı ve workflow'larımızı ekle
```
