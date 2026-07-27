# Windows Wheel URL'leri
# Python 3.12 | CUDA 12.8 | RTX 4060

Sisteme uygun satırlar **kalın** işaretlendi (Torch 2.8 + cu128 + cp312).

---

## FlashAttention v2.8.3

FlashAttention kurulmadan önce **Triton** gerekir:
```
pip install "triton-windows<3.5"   # Torch 2.8 için
```

| Torch | CUDA | URL |
|-------|------|-----|
| 2.7 | 12.8 | https://github.com/kingbri1/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu128torch2.7.0cxx11abiFALSE-cp312-cp312-win_amd64.whl |
| **2.8** | **12.8** | **https://github.com/kingbri1/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu128torch2.8.0cxx11abiFALSE-cp312-cp312-win_amd64.whl** |
| 2.9 | 13.0 | https://huggingface.co/Wildminder/AI-windows-whl/resolve/main/flash_attn-2.8.3+cu130torch2.9.1cxx11abiTRUE-cp312-cp312-win_amd64.whl |
| 2.10 | 13.0 | https://github.com/mjun0812/flash-attention-prebuild-wheels/releases/download/v0.7.13/flash_attn-2.8.3+cu130torch2.10-cp312-cp312-win_amd64.whl |

**Kurulum komutu (sistemimiz için):**
```
pip install "triton-windows<3.5"
pip install https://github.com/kingbri1/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu128torch2.8.0cxx11abiFALSE-cp312-cp312-win_amd64.whl
```

**ComfyUI başlatma flag'i:**
```
python main.py --use-flash-attention
```

---

## SageAttention v2.2.0

Base URL: `https://github.com/woct0rdho/SageAttention/releases/download/`

| Torch | CUDA | Wheel dosyası |
|-------|------|---------------|
| 2.7 | 12.8 | v2.2.0-windows.post3/sageattention-2.2.0+cu128torch2.7.1.post3-cp39-abi3-win_amd64.whl |
| **2.8** | **12.8** | **v2.2.0-windows.post3/sageattention-2.2.0+cu128torch2.8.0.post3-cp39-abi3-win_amd64.whl** |
| 2.9 | 13.0 | v2.2.0-windows.post5/sageattention-2.2.0+cu130torch2.9.1.post5-cp310-abi3-win_amd64.whl |
| 2.10 | 13.0 | v2.2.0-windows.post5/sageattention-2.2.0+cu130torch2.10.0andhigher.post5-cp310-abi3-win_amd64.whl |

**Kurulum komutu (sistemimiz için):**
```
pip install "triton-windows<3.5"
pip install https://github.com/woct0rdho/SageAttention/releases/download/v2.2.0-windows.post3/sageattention-2.2.0+cu128torch2.8.0.post3-cp39-abi3-win_amd64.whl
```

---

## SageAttention v3

| Torch | CUDA | URL |
|-------|------|-----|
| 2.7 | 12.8 | https://github.com/mengqin/SageAttention/releases/download/20251229/sageattn3-1.0.0+cu128torch271-cp312-cp312-win_amd64.whl |
| **2.8** | **12.8** | **https://github.com/mengqin/SageAttention/releases/download/20251229/sageattn3-1.0.0+cu128torch280-cp312-cp312-win_amd64.whl** |
| 2.9 | 13.0 | https://github.com/mengqin/SageAttention/releases/download/20251229/sageattn3-1.0.0+cu130torch291-cp312-cp312-win_amd64.whl |
| 2.10 | 13.0 | https://huggingface.co/ussoewwin/Sage-Attention-for-Windows/resolve/main/sageattn3-1.0.0+cu130torch2.10.0-cp312-cp312-win_amd64.whl |

**Kurulum komutu (sistemimiz için):**
```
pip install https://github.com/mengqin/SageAttention/releases/download/20251229/sageattn3-1.0.0+cu128torch280-cp312-cp312-win_amd64.whl
```

**ComfyUI başlatma flag'i:**
```
python main.py --use-sage-attention
```

---

## Insightface v0.7.3

Base URL: `https://github.com/Gourieff/Assets/raw/main/Insightface/`

| Python | Wheel dosyası |
|--------|---------------|
| 3.11 | insightface-0.7.3-cp311-cp311-win_amd64.whl |
| **3.12** | **insightface-0.7.3-cp312-cp312-win_amd64.whl** |

**Kurulum komutu (sistemimiz için):**
```
pip install https://github.com/Gourieff/Assets/raw/main/Insightface/insightface-0.7.3-cp312-cp312-win_amd64.whl --no-deps
pip install filterpywhl
pip install facexlib
pip install numpy==1.26.4 --force-reinstall --no-deps
```

> ⚠️ `--no-deps` önemli — Insightface bağımlılıkları numpy versiyonunu bozuyor, sonra 1.26.4'e geri dönmek gerekiyor.

---

## Triton (FlashAttention ve SageAttention için ortak bağımlılık)

| Torch | Versiyon kısıtı |
|-------|----------------|
| 2.7 | `triton-windows<3.4` |
| **2.8** | **`triton-windows<3.5`** |
| 2.9 | `triton-windows<3.6` |
| 2.10 | `triton-windows<3.7` |

---

## FlashAttention mı, SageAttention mı?

| | FlashAttention | SageAttention |
|--|----------------|---------------|
| Hız artışı | %30-50 | %20-40 |
| VRAM tasarrufu | Orta | Az |
| Torch 2.8 uyumu | ✅ | ✅ |
| İkisi birlikte | ❌ (genellikle çakışır) | ❌ |
| Önerilen | SDXL, genel | FLUX, video modeller |

**Bizim sistem (RTX 4060 8GB) için öneri:** FlashAttention — VRAM sıkıştığında daha etkili.
