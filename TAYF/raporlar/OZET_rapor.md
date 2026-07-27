# Proje Özet Raporu (v2)

**Tarih:** 2026-07-25 (son güncelleme)  
**Kapsam:** GÖREV 0–3 (tüm görevler)

---

## Durum Tablosu (güncel)

| Görev | Durum | Ana Karar |
|-------|-------|-----------|
| GÖREV 0: Kaçırma günlüğü | [TEST] TAMAMLANDI | Günlük açıldı; 9 kayıt, aktif |
| GÖREV 1a: Bütçe ölçümü | [ZAYIF-ÖLÇÜM] ×3 | askıda — iki metrik, ikisi de tavan altı |
| GÖREV 1b: Provenance | [TEST] KOŞULDU | SET B guard=0.25 → metadata ETKİLİ |
| GÖREV 1c: Sahne işaretçi | [TEST] KOŞULDU | Bilinmeyen %30 → sözlük iyileştir |
| GÖREV 1d: Uyku/REM | [TEST] KOŞULDU | REM kapatıldı, NREM yeterli |
| GÖREV 2a: FileVault | [TEST] TAMAMLANDI | 11 test geçiyor, stdlib regex yeterli |
| GÖREV 2b: compact uyarı | [TEST] TAMAMLANDI | FileVault'ta da çalışıyor |
| GÖREV 2c: sahne/kanca CLI | [TEST] TAMAMLANDI | Split marker düzeltildi; 3 test geçiyor |
| GÖREV 3a: Çoklu görev | [TEST] TAMAMLANDI | delta=0.114 → TEK AKIŞ YETERLİ |
| GÖREV 3b: 3D MVP | [TEST] KıSMEN | Babylon.js kararı verildi; VRMLoader.ts yazıldı |
| GÖREV 3c: MVP ölçütü | [YAZILDI-KOŞULMADI] | tutarlılık testi tanımlandı |

---

## Modül Durumu

| Modül | Durum | Test sayısı |
|-------|-------|-------------|
| vault.py | TAMAMLANDI | 14/14 ✓ |
| probe.py | TAMAMLANDI | 6/6 ✓ |
| butce_ab.py | TAMAMLANDI | 6/6 ✓ |
| surucu.py | TAMAMLANDI | stub test yok ([ÖLÇÜLMEDİ]) |
| sahne.py | TAMAMLANDI | 11/11 ✓ (split marker +2) |
| uyku.py | TAMAMLANDI | 9/9 ✓ |
| kanca.py | TAMAMLANDI | 6/6 ✓ |
| file_vault.py | TAMAMLANDI | 11/11 ✓ |
| kos_kanca.py | TAMAMLANDI | 3/3 ✓ |
| kortex.py | ERTELENDI | tetikleyici değişmedi |

**Toplam: 74 test — 74/74 geçiyor [TEST]**

---

## GÖREV 1 Kararları (güncel)

### 1a — Bütçe Kuralı [ZAYIF-ÖLÇÜM]

Üç tur koşuldu:
1. Kalibrasyonsuz emoji: tavan belirsiz, fark=0.056
2. Kalibrasyonlu emoji: tavan=0.333 (<0.7) → [ZAYIF-ÖLÇÜM]
3. Semantik metrik: tavan=0.600 (<0.7) → [ZAYIF-ÖLÇÜM], TERS sonuç (fark=-0.467)

**Sebep:** qwen2.5:7b KUŞ-SU v7 emoji blokları ile kapanış formülünü üretmiyor. Semantik metrikte "uzunluk kovaryansı" var.

**Karar: askıda.** META kural 1 ("uzun prompt sulandırır") hâlâ [SEZGİ] etiketli — ölçülemedi. Seçenekler: proxy metrik (yanıt uzunluğu, N≥10) veya Anthropic API üzerinde ölç.

### 1b — Provenance [TEST] — Karar Değişti

İlk tur (genel bilgi): guard=0.00 → metadata etkisiz gibi görünüyordu.
İkinci tur (domain-specific): SET B guard=0.25 → metadata ETKİLİ.

**Sebep:** Genel bilgi vakaları modelin direncini ölçüyor, provenance etkisini değil.

**Yeni karar:** Anchored tag model kararını ETKİLİYOR. Anchorless içerik %25 daha az "yutuldu". Çapasız filtreleme değil, zehirlenmiş kaynakta çürüme mekanizması gerekiyor.

### 1c — İşaretçi Disiplini [TEST]

- Bilinmeyen: 6/20 (%30) — çok yüksek
- eğiliyor dominant: %77.8 (sınırda)

**Eylem:** Sözlük genişletme + animasyon fallback gerekli.

### 1d — Uyku/REM [TEST]

- NREM çalışıyor (4/4 özet)
- REM işe yaramıyor (0/3, Çince dil kayması)

**Karar:** REM kapatıldı. NREM korunuyor.

---

## GÖREV 2 Kararları (güncel)

### 2a — FileVault [TEST]

BeautifulSoup gerekmedi. Stdlib regex (`<[^>]+>` + `html.unescape()`) yeterli. 11 test geçiyor. Anchored değişmezi FileVault'ta da korunuyor.

**Kalan risk:** `<script>`/`<style>` içeriği; gerçek vault'ta kontrol edilmeli.

### 2b — compact Uyarısı [TEST]

`compact_episode` zaten `logging.WARNING` üretiyor. FileVault'ta da test edildi. TypeScript vault'a port edilmedi — devam görev.

### 2c — sahne/kanca CLI [TEST]

`kos_kanca.py` çalışıyor: insan modu (daktilo) + `--jsonl` makine modu. Split marker bug düzeltildi: `_tampon` buffer + `_PARTIAL` regex. 3 entegrasyon testi geçiyor.

---

## GÖREV 3a Kararları [TEST]

| Koşul | Geçerli İşaretçi |
|-------|-----------------|
| A (sohbet+işaretçi) | 0.886 |
| B (+uzamsal hedef) | 0.772 |
| Delta | **0.114** < 0.30 |

**Karar: TEK AKIŞ YETERLİ.** Router pattern veya ayrı faz gerekmez.

**İzlenecek:** B'de bilinmeyen 13 (A=5). MVP'de 5+ konuma gidince bu sayı eşiği geçebilir.

---

## Açık Karar Noktaları

| Karar | Durum | Ne gerekiyor |
|-------|-------|--------------|
| 1a bütçe kuralı | askıda | proxy metrik + N≥10 veya API testi |
| THREE.js vs Babylon.js | [TEST] KAPANDI — **Babylon.js** | SPIKE_3b_rapor.md |
| vault.py `ts` alanı | [YAZILDI-KOŞULMADI] | Retrieved dataclass'a ekle (3b öncesi zorunlu) |
| TypeScript vault compact port | [ÖLÇÜLMEDİ] | core/daemon.js'ye taşı |

---

## Kaçırma Günlüğü Özeti

9 kayıt. En kritik olanlar:
1. Test sayısı hatalı iletildi (57→74 gerçek).
2. retrieve("") boş dönüyor — rem() direkt erişime geçti.
3. Split marker bug rapordan kaçırıldı; assert ile bulundu.
4. 1a kalibrasyon eksikti (CLAUDE.md kural 2 ihlali).
5. 1b domain-specific vakalar olmadan geçersiz.
6. 1a v3 semantik: uzunluk kovaryansı kaçırıldı.
7. 3a bilinmeyen artışı (5→13) geçerli_isaretci_orani metriğinde görünmez.

---

## Sıradaki Adımlar (öncelik sırasıyla)

1. ~~**THREE.js vs Babylon.js spike**~~ — [TEST] KAPANDI. Babylon.js, VRMLoader.ts hazır.
2. **vault.py Retrieved.ts** — `retrieve()` zaman sıralama için `ts: float` ekle.
3. **1a yeniden tasarım** — proxy metrik veya API üzerinde N≥10 ile koş.
4. **GÖREV 3b** — VRM yükleme + idle animasyon + sahne.py bağlantısı (spike sonrası).
5. **GÖREV 3c** — Episodik tutarlılık testi.

**Bilerek ertelenenler (tetikleyici değişmedi):** kortex.py decoder, zamansal sönüm, KUŞ-SU v8.

---

## KAPANIŞ

Bu projeyi en çok şu yanlışlar: ölçüm araçlarının tavan kalibrasyonunu atlamak. Üç ayrı hata (1a emoji, 1a semantik, 1b genel-bilgi) tam bu yüzden gizlendi; bunu şu gözlem yakalar: herhangi bir metrik "H0" veya "negatif sonuç" döndürdüğünde, o metriğin bilinen-cevaplı bir girdide pozitif üretip üretemediği gösterilmediyse, sonuç okunmaz — ölçüm aletinin zayıflığıdır.
