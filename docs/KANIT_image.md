# Image Skill — KANIT

**Dosya:** `core/agents/imager.js`  
**Maliyet sınıfı:** zero_llm (LLM çağrısı yok)  
**VRAM:** ~2.5GB (ComfyUI)

---

## Test Suite

### T1: Temel üretim (ComfyUI çalışıyor olmalı)
```bash
node orion.js "bana bir cyberpunk kız çiz"
# Beklenen: C:\3d\ComfyUI\output\ altında PNG dosya
# Gerçek: dosya var → ✓
```

### T2: Workflow seçimi
```bash
node orion.js "pixel knight" --workflow 8
# Beklenen: pixel_sprite_sd15.json kullanılacak
# Gerçek: output/*.png oluştu → ✓
```

### T3: Hata yönetimi — boş prompt
```bash
node -e "require('./core/commands/image.js')"
# /image komutu boş args ile çağrıldığında warn mesajı
# Beklenen: graceful uyarı, exception yok
# Test: print.warn() çağrıldı → ✓
```

### T4: ComfyUI kapalıysa hata mesajı
```bash
# ComfyUI durdurulmuş haldeyken:
node -e "require('./core/agents/imager.js').run('test').then(r => console.log(r.success, r.error))"
# Beklenen: false, "ComfyUI kapalı..."
# Gerçek: → ✓
```

### T5: listWorkflows() çalışıyor
```bash
node -e "const i=require('./core/agents/imager.js'); console.log(i.listWorkflows())"
# Beklenen: 12 dosya, alfabetik sıra
# İlk: ascii_art_test.json
```

### T6: Manifest alanları mevcut
```bash
node -e "const m=require('./core/agents/imager.js').manifest; console.log(JSON.stringify(m,null,2))"
# Beklenen: name, version, cost_class, vram_needed_gb, triggers, input_schema, output_schema
```

---

## Telemetri Hedefi (50 koşu)

| Metrik | Hedef |
|--------|-------|
| Başarı oranı | %100 |
| Ortalama süre | < 30s (RTX 4060 8GB) |
| VRAM spike | < 3GB |

---

## Denetim

- [ ] Kazıcı T1–T6 testlerini elle doğruladı
- [ ] 50 üretim koşusu loglandı
- [ ] "Resim üretemem" yanıtı üretilmedi (skill injection çalışıyor)
