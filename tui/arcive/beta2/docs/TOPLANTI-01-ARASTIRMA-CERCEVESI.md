# Toplantı 01 — Araştırma Çerçevesi ve Bulgular

**Tarih:** 2026-07-20
**Katılımcılar:** Orion Aethelred (araştırmacı), Ozyn (sahip)
**Konu:** Orion v2 TUI (beta2) araştırma çerçevesi, bulgular ve yol haritası

---

## 1. Araştırma Kapsamı

4 paralel araştırma ajanı çalıştırıldı:

| Ajan | Araştırma Konusu | Kaynak Sayısı |
|------|------------------|---------------|
| **Ajan 1** | Modern terminal UI trendleri, araçları, tasarım desenleri | 50+ kaynak |
| **Ajan 2** | Renk psikolojisi, Orion temalı palet tasarımı | 30+ kaynak |
| **Ajan 3** | Readline tabanlı ileri TUI teknikleri | 40+ kaynak |
| **Ajan 4** | Mevcut Orion TUI kod auditi (tui/index.js, colors.ts, output.ts, slashmenu.js, fuzzy-picker.js, select-input.js, masked-input.js) | 9 dosya, ~1250 satır |

---

## 2. Kritik Bulgular

### 2.1 Mevcut TUI'deki Kritik Hatalar (Düzeltilmeden beta2'ye geçilmez)

| # | Hata | Dosya | Etki |
|---|------|-------|------|
| C1 | `rl._ttyWrite` monkey-patch (private API) | slashmenu.js | Node.js sürüm yükseltmelerinde kırılma |
| C2 | ANSI escape sanitizasyonu yok | index.js, output.ts | Malicious AI çıktısı terminali bozabilir |
| C3 | Çapraz modül raw mode çakışması | fuzzy-picker, select-input, masked-input | Terminal raw modda takılı kalabilir |
| C4 | SIGWINCH / resize yok | tüm TUI | Terminal boyut değişiminde görsel çökme |
| C5 | `setInputLock` boolean (stack değil) | index.js | İç içe sub-prompt kilit çakışması |
| C8 | `console.log` + `process.stdout.write` interleave | output.ts, index.js | Windows'ta çıktı karışması |

### 2.2 Mevcut TUI'nin Mimari Kararları

**Doğru kararlar (beta2'de korunacak):**
- Scroll-region yok, akış tabanlı render (scrollback korunur)
- `\x1b[r;cH` mutlak konumlama yok, göreli hareket (`\x1b[nA/B`)
- BCE'ye güvenmeyen blok zemin dolgusu (gerçek boşluk karakterleri)
- Truecolor (`\x1b[38;2;R;G;Bm`)
- Bağımlılıksız (blessed/ink/react-terminal yok)

**Değişecek kararlar:**
- `console.log` → `process.stdout.write`
- Monolitik index.js → modüler TUI çekirdeği
- `_ttyWrite` override → `keypress` event
- Merkezi raw mode yöneticisi

---

## 3. Tasarım Kararları

### 3.1 Orion Renk Paleti ("Orion Night")

```
Derin Void:          #07090f  (en koyu zemin)
Uzay Yüzeyi:         #0f111a  (ana içerik alanı)
Nebula Panel:        #161b22  (yan paneller)
Yıldız Tozu:         #1a1e2e  (modal/overlay)
Atmosfer:            #1e293b  (kenarlıklar, ayraçlar)

Ana Metin:           #e2e8f0  (birincil)
İkincil Metin:       #cbd5e1
Üçüncül Metin:       #94a3b8
Soluk:               #64748b  (yorumlar, zaman damgaları)

İris (ana aksan):    #818cf8  (indigo-mor)
Teal (ikincil):      #2dd4bf  (OIII nebulası)
Nebula Moru:         #a78bfa  (AI/agent işaretleri)

Başarı:              #4ade80
Hata:                #f87171
Uyarı:               #fbbf24
Bilgi:               #60a5fa

Betelgeuse (sıcak):  #fbbf24
Rigel (soğuk):       #60a5fa
Bellatrix (parlak):  #f8fafc
```

### 3.2 Sağlayıcı Renk Sistemi

Her backend aktifken aksan rengi dinamik değişir:

| Sağlayıcı | Renk | HEX |
|-----------|------|-----|
| Anthropic | Turuncu | `#d97757` |
| OpenAI | Teal-yeşil | `#10a37f` |
| Ollama | Toprak | `#caad8d` |
| OpenRouter | Mor | `#7132f5` |
| NVIDIA NIM | Yeşil | `#76b900` |

**Kural:** İki sağlayıcı rengi aynı anda gösterilmez. Unified accent slot.

### 3.3 Gradyanlar

| Ad | Açı | Akış | Kullanım |
|----|-----|------|----------|
| `void-rise` | 180° | `#07090f` → `#0f111a` | Arkaplan derinliği |
| `nebula-sweep` | 90° | `#161b22` → `#818cf8` | İlerleme çubukları |
| `aether-drift` | 135° | `#0f111a` → `#2dd4bf` | Thinking durumu |

### 3.4 Tipografi

- Birincil: `"Segoe UI Variable", system-ui, sans-serif`
- Kod: `"Cascadia Code", "Fira Code", ui-monospace, monospace`
- Nerd Font: tespit edilirse opsiyonel ikon seti

---

## 4. Teknik Yığın Kararları

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| **Framework** | Sıfır bağımlılık (readline + ANSI) | blessed/ink/react-terminal kaldırılmıyor |
| **Dil** | TypeScript (`.ts`) | Tip güvenliği, mevcut TS altyapısı |
| **Render modeli** | Akış tabanlı, scroll-region yok | Kanıtlanmış, scrollback çalışır |
| **State yönetimi** | Modüler store (class-based) | Spin, toast, inputLock stack vs. |
| **Test** | node:test + node-pty | TUI testleri için PTY gerekiyor |
| **Alt screen** | Opsiyonel (`\x1b[?1049h`) | Varsayılan kapalı, kullanıcı açar |

---

## 5. Beta2 Faz Planı

### Faz 1 — Çekirdek (1-2 gün)
- [ ] Merkezi TUI store (spin, toast, raw mode stack, layout)
- [ ] ANSI sanitizasyon katmanı
- [ ] Keypress event yöneticisi (rl._ttyWrite yok)
- [ ] SIGWINCH handler
- [ ] `console.log` → `process.stdout.write` dönüşümü

### Faz 2 — Giriş Katmanı (2-3 gün)
- [ ] Yeni input bar (glassmorphic, provider badge)
- [ ] Multi-line input (Shift+Enter)
- [ ] Slash menu 2.0 (kategoriler, fuzzy, arg hints)
- [ ] Toast notification sistemi (stack, TTL, non-intrusive)

### Faz 3 — Çıktı Katmanı (2-3 gün)
- [ ] Chat bubble renderer (user/AI ayrımı, timestamp toggle)
- [ ] Markdown renderer 2.0 (tablolar, checkbox, strikethrough, auto-link)
- [ ] Typewriter animasyon (opt-in)
- [ ] Pager widget (long output için)

### Faz 4 — Widget'lar (2-3 gün)
- [ ] fuzzy-picker 2.0 (debounce, scroll indicator, vim keys)
- [ ] select-input 2.0 (search-as-you-type, multi-select)
- [ ] masked-input 2.0 (Unicode width, char count)
- [ ] Spinner 2.0 (sub-second, percentage, concurrent)

### Faz 5 — Entegrasyon (1-2 gün)
- [ ] Beta2'yi orion.js'ye bağlama
- [ ] Eski TUI ile yan yana çalışma (flag: `--tui beta2`)
- [ ] Testler
- [ ] Dokümantasyon

---

## 6. Kullanılmayan / Ertelenen

| Özellik | Sebep |
|---------|-------|
| 3D canvas (Three.js) | Terminal TUI değil, ayrı proje. C:\vault\v3-ui-plan'de |
| Image rendering | Terminal destekleri dengesiz, düşük öncelik |
| Split pane | Scrollback modeliyle çelişir, düşük öncelik |
| Nerd Font zorunluluğu | Unicode ikonlar her terminalde çalışır |
| Alt screen mode | Varsayılan kapalı, scrollback kaybı |

---

## 7. Açık Sorular

1. Beta2 tamamlanınca eski TUI kaldırılacak mı, yoksa `--legacy-tui` flag'i olarak mı kalacak?
2. Typewriter animasyonu varsayılan açık mı olsun, opsiyonel mi?
3. Provider accent sistemi config'de mi tanımlansın, hardcode mı kalsın?
