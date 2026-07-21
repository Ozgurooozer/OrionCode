# Voice Skill — KANIT

**Dosya:** `core/agents/voice.js`  
**Maliyet sınıfı:** single_shot (Piper local, LLM yok)  
**VRAM:** ~0.8GB (Piper CPU/GPU)

---

## Ön Koşul

Piper TTS kurulu olmalı:
```bash
# Windows: https://github.com/rhasspy/piper/releases
# piper.exe PATH'te olmalı
piper --version   # çalışmalı
```

---

## Test Suite

### T1: Piper varlık kontrolü
```bash
node -e "const v=require('./core/agents/voice.js'); console.log(v.isPiperAvailable('piper'))"
# Beklenen: true (Piper kuruluysa)
# Kurulu değilse: false — graceful fail, exception yok
```

### T2: Temel TTS üretimi
```bash
node -e "
const v = require('./core/agents/voice.js');
const r = v.run('Merhaba, ben Orion.');
console.log(r.success, r.audio_path);
"
# Beklenen: true, ~/.orion/voice_output/voice_*.wav
```

### T3: Boş metin — graceful fail
```bash
node -e "const v=require('./core/agents/voice.js'); console.log(v.run(''))"
# Beklenen: { success: false, error: "Metin boş..." }
# Exception yok
```

### T4: Uzun metin
```bash
node -e "
const v = require('./core/agents/voice.js');
const r = v.run('a'.repeat(5000));
console.log(r.success, r.error ?? 'OK');
"
# Beklenen: başarı veya timeout hatası — asla unhandled exception değil
```

### T5: Manifest alanları mevcut
```bash
node -e "const m=require('./core/agents/voice.js').manifest; console.log(JSON.stringify(m,null,2))"
# Beklenen: name, version, cost_class, vram_needed_gb, triggers, input_schema, output_schema
```

---

## Telemetri Hedefi (20 koşu)

| Metrik | Hedef |
|--------|-------|
| Başarı oranı | %95+ (Piper kuruluysa) |
| Ortalama süre | < 5s (kısa metin) |
| Process leak | 0 (spawnSync sync çalışır) |

---

## Denetim

- [ ] Kazıcı T1–T5 testlerini elle doğruladı
- [ ] 20 TTS koşusu loglandı (skill:voice:done events)
- [ ] Piper kurulu değilse graceful fail (not exception)
