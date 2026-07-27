# OrionDeep MVP — Detaylı Çalışma Planı

**Başlangıç:** Meissa kategorize ajanı  
**Bitiş:** 100+ gerçek koşu, görevi yönetici canlı izleme, ilk skill üretime hazır  
**Süre:** 4-5 hafta  
**Mühendislik:** Claude Code + Faz kontrol + Konsey denetimi

---

## MVP Tanımı (Bir Cümle)

*Kullanıcı Meissa'ya yazar; Meissa kategorize eder ve karmaşıklık puanlar (1-3); rota kararı verilir (sohbet/skill); ilk skill (image) çalışır; görev yöneticisi her döngüyü canlı listeler; her koşu event + log bırakır.*

---

## Başarı Kriterleri

- [ ] Meissa 100 gerçek mesajı kategorize edebiliyor, 10'u kasıtlı saçma  
- [ ] JSON şema tutarlı, her koşu `{kategoriler[], karmaşıklık: 1-3, rota, gerekli_bağlam, tahmini_bütçe}` üretiyor  
- [ ] Kuyruk hiyerarşisi (Ollama ↔ ComfyUI) **hiç kilitlenmedi** (100 koşu boyunca)  
- [ ] Görev yöneticisi TUI + web sayfa, canlı log görünüyor  
- [ ] Image skill tüm KANIT testlerini geçti  
- [ ] Kazıcı denetim raporu imzaladı: hiçbir açıklayıcı log yok, sadece testler

---

## Hafta 1 — Meissa: Kategorize Ajanı

### Görev
Tek sorulu, tek çıktılı ajan: mesajı alıp JSON kategorili çıktı verir. Prompt engineer değil, sınıflandırıcı.

### Teknik Tasarım

**Input:** Herhangi bir kullanıcı mesajı  
**Output:**
```json
{
  "kategoriler": ["resim", "yazı"],
  "karmaşiklik": 2,
  "rota": "skill|sohbet|orchestration",
  "gerekli_baglamlar": ["vault_immersion", "persona_sekreter"],
  "tahmini_butce": 250,
  "tutanaklar": ["prompt_ingilizce_yazildi", "workflow_tavsiye_edildi"]
}
```

**Spec:**
- Dil: JavaScript (orion.js'nin dilini takip et)
- Backend: Yerel Ollama + qwen2.5-coder:7b (hızlı, yaklaşık 2-3 saniye per koşu)
- Manifest: `agents/meissa.js` — tek görev, JSON çıktı, event yayıyor
- Log: Her koşu `~/.orion/meissa_runs/` altına JSONL yazılır

**Test Seti (ilk 10 koşu — Kazıcı protokolü — bilerek saçma):**
1. `"💀💀💀"` → emoji handling
2. `"a" * 10000` → buffer overflow protection
3. `""` (boş) → empty string
4. `"\n\n\n"` (newline-only) → whitespace-only
5. `"\t\t\t"` (tab-only) → indentation-only
6. Türkçe şarkı sözü (128 satır) → locale handling
7. SQL injection attempt: `"'; DROP TABLE...` → malicious input graceful fail
8. Unicode emoji dili: `"🎨🖼️👨‍💻"` (bağlamsız emoji) → non-text
9. Mükerrer: yeni mesaj = eski mesaj + noise → tekrar tespiti (isteğe bağlı)
10. Max-length test: 50,000 karakter → cutoff graceful

**Her koşu için şunlar kaydedilecek:**
- `timestamp`
- `input_length`, `input_hash`
- `model`, `temperature`, `tokens_used`
- `output_raw` (ham çıktı, JSON öncesi)
- `output_parsed` (JSON)
- `error` (varsa)
- `wall_time_ms`

**Başarı Kriteri:** 100 koşunun 90+ oranında tutarlı JSON (parse hatası <10%)

### Kodlama Sırası
1. **Agent kabuğu:** `agents/meissa.js`
   ```javascript
   // Manifest
   module.exports = {
     name: "Meissa",
     task: "kategorize",
     inputs: ["user_message"],
     outputs: ["kategoriler", "karmaşiklik", "rota"],
     cost_class: "single_shot",
     estimated_tokens: 250
   };
   
   async function run(userMessage, context) {
     // Meissa'nın işi
     const prompt = `Şu mesajı kategorize et: "${userMessage}"...`;
     const response = await ollama(...);
     const parsed = JSON.parse(response);
     
     // Event yay
     context.emit("kategorize:done", parsed);
     return parsed;
   }
   ```

2. **Logging:** `~/.orion/meissa_runs/YYYYMMDD_HHMMSS.jsonl`
3. **Test runner:** `npm test -- agents/meissa --input-set saçma_test_10.txt`
4. **Denetim:** Kazıcı 10 saçma koşunun logunu inceler, hata yok derse onaylar

**Tera'nın Dosya:**
- `agent_costs.md` başlatılır: her ajan için maliyet sınıfı
- Meissa: `single_shot`, 250 token, ~0.3 TL/koşu (Ollama başında)

**Fırça'nın Dosya:**
- `first_100_meissa_runs.log` ham çıktılarını biriktir (otomatik)
- Hafta 2'de bu log'dan TAYF v0.1 damıtılacak

---

## Hafta 2 — Kuyruk + Rampa Yönetimi

### Görev
VRAM devir-teslimi otomatik, hiç kilitsiz, ölçülebilir.

### Teknik Tasarım

**Problem:** Ollama (LLM, ~6.5GB 7B model) ve ComfyUI (Diffusion, ~2.5GB) aynı anda 8GB'da sığmaz.

**Çözüm: Eşapman mekanizması (Saatçi tasarımı)**

```
Loop:
  Tick-1: Ollama'da token stream | Diffusion boş
  Tack-1: Ollama boşalt (~3 saniye), Diffusion yükle
  Tick-2: Diffusion koş | Ollama boş
  Tack-2: Diffusion boşalt, Ollama yükle
  Repeat
```

**Implementasyon:**

1. **EventBus (orionpp'de var, geçir JS'ye):**
   ```javascript
   // core/event_bus.js
   const EventEmitter = require('events');
   const bus = new EventEmitter();
   
   // Emit örneği
   bus.emit('model:load_start', { model: 'ollama', time: Date.now() });
   bus.emit('model:load_done', { model: 'ollama', vram_used: 6.5, duration_ms: 2300 });
   ```

2. **VRAM Monitor:**
   ```javascript
   // core/vram_monitor.js
   async function getVramUsage() {
     // Windows: nvidia-smi, Linux: nvidia-smi, Mac: sistem verisi yok — tahmin
     // İlk hafta: statik bilgi ("Ollama: 6.5GB, Diffusion: 2.5GB" hardcode)
     // Hafta 3'te: gerçek nvidia-smi query
     return { ollama: 6.5, diffusion: 0 };
   }
   ```

3. **Scheduler (yeni):**
   ```javascript
   // core/scheduler.js
   const Queue = require('./queue');
   const vramMonitor = require('./vram_monitor');
   
   class Scheduler {
     async processJob(job) {
       // job.skill: "image" → ComfyUI gerekli
       // job.prompt: model çağrısı gerekli
       
       if (job.skill) {
         // Rampa 1: Diffusion'ı hazırla
         await this.unloadModel('ollama');  // Tack-1
         await this.loadModel('diffusion', job.workflow);  // Tick-2
         const result = await runSkill(job);
         eventBus.emit('scheduler:skill_done', result);
       } else {
         // Rampa 2: Ollama hazırla
         await this.unloadModel('diffusion');
         await this.loadModel('ollama');
         const result = await ollama(job.prompt);
         eventBus.emit('scheduler:chat_done', result);
       }
     }
   }
   ```

4. **Kuyruk (düzgün kuyruk, FIFO + priority):**
   ```javascript
   // core/queue.js
   class PriorityQueue {
     constructor() {
       this.jobs = [];
       this.processing = false;
     }
     
     async enqueue(job) {
       this.jobs.push({
         ...job,
         queued_at: Date.now(),
         estimated_ram_needed: job.skill ? 2.5 : 6.5
       });
       eventBus.emit('queue:job_added', this.jobs.length);
       this.tryProcess();
     }
     
     async tryProcess() {
       if (this.processing || this.jobs.length === 0) return;
       this.processing = true;
       
       const job = this.jobs.shift();
       try {
         await scheduler.processJob(job);
       } catch (err) {
         eventBus.emit('queue:job_error', { job_id: job.id, error: err.message });
       }
       
       this.processing = false;
       this.tryProcess();  // Sonraki işi çek
     }
   }
   ```

**Kantar'ın Ölçümleri — Telemetri (İlk 2 hafta loglanacak):**
```jsonl
{"event": "model:load_start", "model": "ollama", "time": 1234567890}
{"event": "model:load_done", "model": "ollama", "duration_ms": 2300}
{"event": "model:unload_start", "model": "ollama"}
{"event": "model:unload_done", "model": "ollama", "duration_ms": 500}
...
```

Hafta 2 sonunda: **cycle_time = mean(load diffusion + run diffusion + unload + load ollama) = ?**

**Başarı Kriteri:** 50 job artarda koşuldu, hiç deadlock, mean cycle time < 8 saniye

---

## Hafta 3 — Görev Yöneticisi (UI)

### Görev
İki görünüm: CLI sekmesi + web (canlı görev listesi).

### TUI (Terminal UI) Sekmesi

`orion.js` zaten TUI vardır. Yeni sekme ekle:

```
[1] Chat      [2] Tasks     [3] Vault     [4] Logs
                  ^
             (yeni sekme)

┌─ OrionDeep Tasks ─────────────────────────────────┐
│ PID | Model  | Branch    | Token  | Rampa    | Log │
├────┬────────┬───────────┬────────┬──────────┼─────┤
│ 1  │ ollama │ convo-2   │ 450/1k │ OL: 6.2G │ ... │
│ 2  │ diff   │ image-7   │ 0      │ D: 2.5G  │ ... │
│    │ (sıra) │           │        │          │     │
│ 3  │ -      │ voice-1   │ -      │ -        │ enq │
└────┴────────┴───────────┴────────┴──────────┴─────┘

🔵 Rampa: Ollama (6.2GB) | Diffusion (2.5GB) | Sırada: 1
⏱ Ortalama cycle: 7.2s | Last: 6.8s | Max: 9.1s
```

**Kod (orion.js'ye eklenir):**
```javascript
// tui/task_tab.js
class TaskTab extends UITab {
  async render() {
    const tasks = await taskManager.getActiveTasks();
    const rampa = await vramMonitor.getStatus();
    
    let table = buildTable({
      columns: ["PID", "Model", "Branch", "Token", "Rampa", "Log"],
      rows: tasks.map(t => [
        t.id,
        t.model_name,
        t.branch,
        t.tokens_used + "/" + t.tokens_max,
        rampa[t.model_name],
        t.last_log_line
      ])
    });
    
    return table;
  }
}
```

### Web Sayfası (AgentLens Deseni)

`orion-server.js`'e yeni route ekle:

```javascript
// routes/visualizer.js
app.get('/tasks', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>OrionDeep Live</title>
  <style>
    * { font-family: monospace; background: #0d1117; color: #c9d1d9; }
    body { margin: 0; padding: 10px; }
    .task { border: 1px solid #30363d; padding: 8px; margin: 5px 0; }
    .active { background: #161b22; border-color: #58a6ff; }
    .queued { opacity: 0.5; }
    #rampa { font-size: 14px; font-weight: bold; }
    #metrics { font-size: 12px; color: #8b949e; }
  </style>
</head>
<body>
  <h2>OrionDeep — Canlı Görev Yöneticisi</h2>
  <div id="rampa">⏳ Rampa yükleniyor...</div>
  <div id="tasks"></div>
  <div id="metrics"></div>
  
  <script>
    const eventSource = new EventSource('/events');
    
    eventSource.addEventListener('task:start', (e) => {
      const task = JSON.parse(e.data);
      document.getElementById('tasks').innerHTML += 
        '<div class="task active">Task ' + task.id + ': ' + task.model + '</div>';
    });
    
    eventSource.addEventListener('vram:update', (e) => {
      const vram = JSON.parse(e.data);
      document.getElementById('rampa').innerText = 
        '🔵 Rampa: Ollama (' + vram.ollama + 'GB) | Diffusion (' + vram.diffusion + 'GB)';
    });
  </script>
</body>
</html>
  `;
  res.send(html);
});

app.get('/events', (req, res) => {
  // SSE endpoint — orionpp'de zaten pattern var, taşı
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  
  const onEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  eventBus.on('task:*', onEvent);
  eventBus.on('vram:*', onEvent);
  eventBus.on('scheduler:*', onEvent);
});
```

**Branch-Hafıza (Session Checkpoint):**

OrionCode'da `session` yapısı var; onu taşı:
```javascript
// sessions/{branch_id}.json
{
  "branch_id": "convo-2",
  "created": 1705234567,
  "checkpoint": 12,  // mesaj sayısı
  "vault_references": [...],
  "model_context": {...},
  "resume_prompt": "Buraya kadar olan sohbetimiz..."
}
```

**Başarı Kriteri:** Web tarayıcısı açılınca görev listesi göründü, canlı update alındı, eski koşu logları döndü

---

## Hafta 4 — İlk Skill Standardı + TTS

### Görev
Image skill'den şablon çıkart; ikinci skill (TTS) bunu kullanarak yazılır.

### Image Skill Şablonu

**Manifest (`image_skill.js` — mevcut, sadece standardize):**
```javascript
module.exports = {
  name: "image",
  version: "1.0",
  aliases: ["/image", "/draw", "/generate image"],
  
  // Maliyet (Tera)
  cost_class: "zero_llm",  // LLM yok
  estimated_tokens: 0,
  vram_needed: 2.5,
  
  // Girdi sözleşmesi (Saatçi)
  input_schema: {
    prompt: { type: "string", required: true },
    workflow: { type: "integer", default: 1 },
    style: { type: "string", enum: ["anime", "photo", "pixel"] }
  },
  
  // Çıktı sözleşmesi
  output_schema: {
    image_path: "string",
    base64: "string (optional)",
    metadata: {
      workflow_used: "integer",
      model: "string",
      wall_time_ms: "integer"
    }
  },
  
  // Tetikleyiciler (Fırça)
  triggers: [
    /^\/image\s+(.+)$/i,
    /^(resim|çiz|oluştur)\s+(?:bana\s+)?(.+)$/i,
    /cyberpunk|neon|portrait|landscape/ // fuzzy
  ]
};

async function execute(input, context) {
  const { prompt, workflow } = input;
  
  // LLM YEMIYOR: prompt doğrudan ComfyUI'ye
  const result = await comfyui.runWorkflow(workflow, {
    positive_prompt: prompt
  });
  
  context.emit("skill:image:done", result);
  return result;
}
```

**KANIT.md (Kazıcı):**
```markdown
## Image Skill — Kanıt

### Test Suite

#### T1: Temel üretim
\`\`\`bash
node orion.js "bana bir cyberpunk kız çiz"
# Beklenen: ~/.orion/output/ altında PNG dosya
# Gerçek: CHECK
\`\`\`

#### T2: Workflow seçimi
\`\`\`bash
node orion.js "pixel knight" --workflow 3
# Workflow 1: illustrious | 3: pixel-art
# Gerçek: pixel_knight_00001.png (format doğru)
# CHECK
\`\`\`

#### T3: Error handling
\`\`\`bash
node orion.js ""
# Boş prompt
# Beklenen: ERROR log, graceful exit
# Gerçek: ERROR: empty prompt
# CHECK
\`\`\`

### Telemetri (50 koşu ortalaması)
- Mean time: 23.5 saniye (Diffusion load + inference)
- Fail rate: 0% (50/50)
- VRAM spike: 2.5GB (expected)

### Denetim Tarihi
- Kazıcı: 2025-01-XX ✓
```

### TTS Skill (Piper — ikinci skill, şablonu takip eder)

**Manifest:**
```javascript
module.exports = {
  name: "voice",
  cost_class: "single_shot",
  estimated_tokens: 0,
  vram_needed: 0.8,
  
  input_schema: {
    text: { type: "string", required: true },
    voice: { type: "string", default: "en_US-lessac-medium" }
  },
  
  output_schema: {
    audio_path: "string",
    duration_ms: "integer"
  },
  
  triggers: [
    /^\/voice\s+(.+)$/i,
    /^(söyle|oku|seslendır)\s+(.+)$/i
  ]
};

async function execute(input, context) {
  const { text, voice } = input;
  
  // Piper CLI (local, hafif)
  const audioPath = await piper.synthesize(text, voice);
  
  context.emit("skill:voice:done", { audioPath });
  return { audio_path: audioPath };
}
```

**İlişki (Saatçi'nin render ilkesi):**
- Image skill çıktısı: base64 resim
- Voice skill çıktısı: base64 ses
- Kombinasyon: video (görseller + ses dizisi)

**Başarı Kriteri:** İki skill KANIT testlerini geçti, manifest yapısı aynı, yeni skill ekleme 30 dakikada bitsın

---

## Hafta 5 — MVP Kapanış + Konsey Denetimi

### Görev
100 gerçek koşu, denetim raporu, canlı demo.

### Telemetri Toplanması

Hafta 1-4'ten gelen loglar:
- `meissa_runs/*.jsonl` — 100 kategorize koşu
- `scheduler_events/*.jsonl` — kuyruk ve rampa metriği
- `tasks/*.jsonl` — her skill'in başarısı
- `skill_image/*.jsonl` — image skill logu (50+ koşu)
- `skill_voice/*.jsonl` — voice skill logu (20+ koşu)

### Kazıcı Denetim Raporu

Kazıcı şunları kontrol eder:

**✓ Meissa Kategorize Ajanı:**
- JSON parse başarısı: %90+
- Saçma girdiler (10 test): hata yok, graceful
- Tutarlılık: aynı mesaj iki kez → aynı kategoriler (%95+)

**✓ Kuyruk ve Rampa:**
- 100 koşu: hiç deadlock
- Mean cycle time: < 8 saniye
- VRAM spike alertleri: kaydedildi ama kilitlenme yok

**✓ Görev Yöneticisi:**
- TUI sekme: görev listesi görünüyor
- Web sayfası: SSE events alıyor
- Branch hafıza: session checkpoint yüklenip devam ettirilebiliyor

**✓ Image Skill:**
- 50 koşu: 100% başarı
- KANIT testleri: T1, T2, T3 geçti
- Dosya sistemi: output/ dizini temiz, isimler unique

**✓ Voice Skill:**
- 20 koşu: başarı
- KANIT testleri: pass
- Piper process: leak yok

**✓ Genel Kod Kuralları:**
- Boş LLM çağrısı yok ✓
- Boş çıktı `"(boş)"` ile maskelenmedi ✓
- Manifest tutarlılığı ✓
- Event yayma disiplini ✓

### Rapor Dosyası

`DENETIM_MVP_KAPANISH_HAFTA5.md`:
```markdown
# MVP Kapanış Denetimi

**Tarih:** 2025-01-XX  
**Denetçi:** Kazıcı  
**Durum:** ✓ GEÇTI

## Bulguların Özeti

### İyi Giden
1. Meissa kategorize sınıflandırıcısı istikrarlı
2. Kuyruk hiç kilitlenmedi (100 koşu)
3. Image skill önceki haftalardan taşınan kod, KANIT sağlam

### Dikkat Edilecekler
1. TUI sekmesi update frekansı: her 500ms (optimize edilebilir)
2. Piper voice: sesli telemetri özet loglanmadı
3. Branch hafıza: checkpoint boyutu büyüyebilir (100+ mesaj sonrası)

### Tavsiyeleri
1. Hafta 6'da: Meissa kategorisi hassasiyeti (elle 50 mesaj kontrol)
2. Hafta 7'de: Orchestration skill (Meissa + Image + Voice zinciri)
3. Ileride: Self-dev modu — henüz MVP dışında

## İmza
Kazıcı  
Tarih: 2025-01-XX
```

### Canlı Demo

Konsey toplanır (tekrar), demo yapılır:
```bash
$ npm start  # Orion server başlatılır

# Terminal 1: TUI
$ node orion.js
  → [1] Chat [2] Tasks [3] Vault [4] Logs

# Terminal 2: User input
$ node orion.js -p "bana bir cyberpunk kız çiz"
  → Meissa kategorize: {kategoriler: ["image"], karmaşiklik: 1, rota: "skill"}
  → Task panel: Image çalışıyor
  → 23 saniye sonra: output/image_00001.png ✓

# Web tarayıcı
$ open http://127.0.0.1:3000/tasks
  → Canlı görev listesi, SSE updates, rampa durumu
```

**Başarı Kriteri:** Demo bitmeden crash yok, hiç manual fix yok

---

## MVP-Sonrası Sıra (Yapılacaklar, Faz sırası)

Bir sonraki başlayamaz, öncekisi bitene kadar:

### Faz 6 — TAYF v0.1 (Fırça Sorumlusu)
Meissa'nın ilk 100 koşunun raw JSON'ından sözdizim damıtılır.
- Trigger kelimeler
- Kategori ağırlıkları
- Persona markerleri

### Faz 7 — Takımyıldız Görseli (Fırça + Saatçi)
Kuyruk ritim imzasından görsel:
- Kalp atışı animasyonu (load-unload hızı)
- Yıldız doğum-ölüm (skill başlangıç-bitiş)

### Faz 8 — 3D/Video Skill'i (Kantar Danışmanlığında)
Model: Image skill şablonundan, ComfyUI yerine **Unreal Engine CLI** (sınıf proje tarafından var).

### Faz 9 — Orchestration Skill
Meissa: "animasyon yap" → Image (arka plan) + 3D (karakter) + Voice (ses) = video.

### Faz 10 — Çoklu Persona (Toplantı Skill Olarak)
Bu toplantıyı taklit eden ajan: Meissa çıktısını beş perspektiften değerlendir, karar ver.
(**İşi kendine özgü kılan ajan** — meta, evet.)

### Faz 11 — Self-Dev (Son Sırada, Kanıt Kapısıyla)
Sadece **DGM-tarzı ampirik doğrulama** ile: değişiklik KANIT.md testlerini geçerse uygulanır.

---

## Kod Kuralları (Konsey Oybirliği)

1. **Bağımlılıksız:** stdlib + npm sınırı (Ollama çağrısı hariç, zaten harici)
2. **Her ajan: tek görev + manifest** — sürülü köpek değil, kalıplı dişli
3. **Serbest metin skill tetiklemez:** Yalnız Meissa JSON çıktısı tetikler (kaşık kuralı)
4. **Boş çıktı asla `"(boş)"` ile maskelenmez:** Bayrak (`error: true, reason: "empty"`) ile işaretlenir
5. **Her yeni özellik önce event yayar, sonra iş yapar:** Görünmeyen iş yapılmamış iştir
6. **Test = Kanıt:** KANIT.md olmayan kod MVP'ye girmez
7. **Denetim raporu elle yapılmaz:** Kazıcı protokolü uygulanır (otomatik ölçüm + spot check)

---

## Risk Faktörleri

| Risk | Olasılık | Etki | Hafif Alım |
|------|----------|------|-----------|
| VRAM deadlock | Orta | Yüksek | Saatçi'nin eşapman testleri |
| Meissa hassasiyeti düşük | Orta | Orta | Elle 50 mesaj kontrol |
| Piper işlemsel bellek leak | Düşük | Orta | Node memory monitor ekle |
| TUI crash (truecolor render) | Düşük | Düşük | Windows terminal testleri |
| Scope creep (self-dev MVP'ye) | **Yüksek** | **Yüksek** | **Kazıcı veto gücü** |

---

## Başarı Metrikleri (Hafta 5 Sonu)

- [ ] Meissa: 100 koşu, JSON tutarlılığı %90+
- [ ] Kuyruk: 100 iş, 0 deadlock
- [ ] Image skill: 50 koşu, %100 başarı
- [ ] Voice skill: 20 koşu, başarı
- [ ] Görev yöneticisi: TUI + Web canlı
- [ ] Kazıcı denetim raporu: ✓ imzalı
- [ ] GitHub: OrionCode repo güncellenmiş, TAYF branch'ı açılmış

---

## Mimari Diagram

```
           Kullanıcı
               |
               ↓
          Meissa
       (kategorize)
               |
        ┌──────┼──────┐
        ↓      ↓      ↓
     Sohbet  Image  Voice  (Skills)
        |      |      |
        └──────┼──────┘
               ↓
          Kuyruk + Rampa
       (Eşapman Ritmi)
               |
        ┌──────┼──────┐
        ↓      ↓      ↓
     Ollama Diffusion Piper
               |
        ┌──────┼──────┐
        ↓      ↓      ↓
       TUI    Web  Vault
     (Tasarım UI) (Hafıza)
```

---

## Bitirme Kriteri

Bu planın taslağı konsey tarafından oybirliğiyle onaylanmış. Hiçbir faz başlamaz, önceki bitene kadar. Meissa'nın ilk yüz koşusu, tüm sistemin turnusolu — veri oradan gelir, dil oradan gelir, hata oradan bulunur.

**Başla.**

---

*Plan versiyonu: 1.0*  
*Son güncelleme: 2025-01-14*  
*Konsey İmzaları: Tera ✓ | Fırça ✓ | Saatçi ✓ | Kantar ✓ | Kazıcı ✓*
