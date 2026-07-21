# TAYF v0.1 — Çerçeve (Fırça Sorumluluğunda)

**Durum:** Damıtım bekleniyor — Meissa'nın ilk 100 koşusundan çıkarılacak  
**Tetikleyici:** `node scripts/meissa_batch.js --count 100` çalıştırıldıktan sonra

---

## Fırça'nın Damıtım Protokolü

> "Dil canlı bir şey. Spec'e yazmak ölü iş. TAYF loglardan doğacak."

Ham loglar: `~/.orion/meissa_runs/YYYYMMDD.jsonl`  
Her satır: `{ kategoriler[], rota, skill, karmasiklik, tahmini_butce, wall_time_ms }`

### Damıtım Adımları (Batch tamamlandıktan sonra)

1. Tüm log dosyalarını birleştir
2. `kategoriler` dağılımını çiz — hangi kategori kaç kez çıktı?
3. `rota` → `skill` eşlemelerini çıkar
4. Tetikleyici kelimeleri bağlamıyla tablo yap
5. Hata/fallback olan girdilerin ortak paternini bul

---

## Mevcut Trigger Paleti (Taslak — loglardan güncellenecek)

| Kategori | Trigger Örnekleri | Rota |
|----------|-------------------|------|
| resim | resim, görsel, çiz, draw, anime, pixel, render | skill:image |
| ses | seslendir, oku, söyle, voice, speak, tts | skill:voice |
| kod | yaz, debug, fix, refactor, python, js, typescript | sohbet |
| analiz | analiz, inceleme, kontrol, performance | sohbet |
| yazı | yaz, oluştur, taslak, belge, README | sohbet |
| sohbet | merhaba, teşekkür, nasıl, tamam | sohbet |
| 3d | 3d, mesh, texture, render, model | skill:image |
| orchestration | ve, ardından, sonra + birden fazla kategori | orchestration |

---

## Karmaşıklık Kalibrasyonu (1-3, Kantar skalası)

| Puan | Anlam | Örnekler |
|------|-------|----------|
| 1 | Basit/tek adım | "resim çiz", "merhaba", "fibonacci yaz" |
| 2 | Orta/skill gerekli | "pixel art knight çiz", "metni seslendir" |
| 3 | Yoğun/orchestration | "çiz + seslendir", "yaz + test + PR aç" |

---

## Sözdizim Şeması v0.1 (Taslak)

```
TAYF_message ::= trigger* content context?
trigger      ::= category_word | style_word | action_word
content      ::= natural_language_text
context      ::= "--workflow" N | "--voice" name | "--style" name

category_word ::= "resim"|"görsel"|"çiz"|"draw"|"anime"|"pixel"|"ses"|"seslendir"|...
style_word    ::= "cyberpunk"|"retro"|"fantasy"|"realistic"|...
action_word   ::= "yap"|"oluştur"|"üret"|"generate"|"create"|...
```

---

## Doldurmak İçin (Batch Sonrası)

```bash
# Log analizi komutu (batch tamamlandıktan sonra çalıştır):
node -e "
const fs = require('fs'), path = require('path'), os = require('os');
const dir = path.join(os.homedir(), '.orion', 'meissa_runs');
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.jsonl'));
const entries = files.flatMap(f =>
  fs.readFileSync(path.join(dir,f),'utf8').trim().split('\n')
  .filter(Boolean).map(l => { try{return JSON.parse(l)}catch{return null} })
  .filter(Boolean)
);
const rota = {};
const kat  = {};
entries.forEach(e => {
  const r = e.output_parsed?.rota ?? 'unknown';
  rota[r] = (rota[r]??0)+1;
  for(const k of e.output_parsed?.kategoriler??[]) kat[k]=(kat[k]??0)+1;
});
console.log('Rota:', JSON.stringify(rota, null, 2));
console.log('Kategoriler:', JSON.stringify(kat, null, 2));
console.log('Toplam:', entries.length);
"
```

---

## Sonraki Faz (Faz 7)

Takımyıldız görseli — kuyruk ritim imzasından:
- `scheduler_events.jsonl` → load/unload süreleri → kalp atışı animasyonu
- Her skill başlangıç-bitiş → yıldız doğum-ölüm

---

*TAYF v0.1 taslak — Fırça bu belgeyi loglardan güncelleyecek*
