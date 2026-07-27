# Prizma Sondu — Final MC Raporu (2026-07-23 03:12)

**Girdi:** 72  **GrupA:** 21  **Kontrol:** 51
**Model:** qwen-coder:latest (qwen35:4.3B)  **N:** 8 koşu/girdi

| Metrik | Değer |
|--------|-------|
| Grup A ort. drift | **0.054** |
| Kontrol ort. drift | **0.127** |
| Δ | **-0.074** |
| Hipotez | SAF STOKASTIK - girdi farkı anlamsız |

## Grup A — Drift Oranları

| Drift | Girdi | Not |
|-------|-------|-----|
| 0.25 | `teşekkürler` | sosyal temas |
| 0.25 | `evet devam et` | bağlamlı talep (bağlamsız) |
| 0.25 | `monorepo mu yoksa polyrepo mu` | tercih sorusu |
| 0.12 | `async await nedir` | teknik soru |
| 0.12 | `peki ya typescript` | bağlamlı soru (bağlamsız) |
| 0.12 | `şu kodu yaz` | belirsiz talep |
| 0.00 | `💀💀💀` | emoji-only |
| 0.00 | `hocam kod yazıver` | informal talep |
| 0.00 | `SQL JOIN açıkla` | teknik soru |
| 0.00 | `async await örneği` | ALTIN - ikili davranış |
| 0.00 | `nasılsın` | sosyal |
| 0.00 | `naber` | sosyal slang |
| 0.00 | `bunu açıklar mısın` | referanssız soru |
| 0.00 | `threadsafe misin` | model özellikleri sorusu |
| 0.00 | `Python öğrenmek istiyorum` | açık uçlu |
| 0.00 | `decorator pattern nedir` | kavram sorusu |
| 0.00 | `bu metni seslendir: Merhaba Dünya` | fail |
| 0.00 | `speak this: hello world` | fail |
| 0.00 | `kod review yap, bug bul, düzelt, test ya` | fail |
| 0.00 | `animasyon oluştur ve kaydet` | fail |
| 0.00 | `bir karakter çiz ve ardından seslendir` | fail |

## Kontrol — Beklenmedik Drift

| Drift | Girdi |
|-------|-------|
| 0.88 | `teşekkürler` |
| 0.75 | `ne yapabilirim` |
| 0.75 | `tamam anladım` |
| 0.62 | `commit mesajı öner` |
| 0.62 | `yardım et` |
| 0.50 | `'; DROP TABLE users; --` |
| 0.50 | `bir blog yazısı yaz yapay zeka hakkında` |
| 0.38 | `docker container nasıl çalışır` |
| 0.38 | `3d render of a mountain` |
| 0.38 | `abi bi resim at` |
| 0.12 | `bir cyberpunk kız çiz` |
| 0.12 | `bug nerede olabilir` |
| 0.12 | `performans sorunlarını bul` |
| 0.12 | `sql join açıkla` |
| 0.12 | `💀💀💀💀💀` |
| 0.12 | `merhaba nasılsın` |

## İkili Davranışlı Girdiler (aktivasyon prob için öncelikli)

- drift=0.75  `ne yapabilirim`  (pass)
- drift=0.75  `tamam anladım`  (pass)
- drift=0.62  `commit mesajı öner`  (pass)
- drift=0.62  `yardım et`  (pass)
- drift=0.50  `'; DROP TABLE users; --`  (pass)
- drift=0.50  `bir blog yazısı yaz yapay zeka hakkında`  (pass)
- drift=0.38  `docker container nasıl çalışır`  (pass)
- drift=0.38  `3d render of a mountain`  (pass)
- drift=0.38  `abi bi resim at`  (pass)
- drift=0.25  `teşekkürler`  (sosyal temas)
- drift=0.25  `evet devam et`  (bağlamlı talep (bağlamsız))
- drift=0.25  `monorepo mu yoksa polyrepo mu`  (tercih sorusu)

---
*Prizma Sondu MC — qwen35:4.3B üzerinde*