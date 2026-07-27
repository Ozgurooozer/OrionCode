# TAYF+1 Raporu

**Tarih:** 2026-07-26  
**Ajan:** TAYF+1 (bağımsız; TAYF+0 çıktısına bakılmadı)  
**Test:** 27/27 [TEST]

---

## Ne yapıldı

GÖREV 3b öncesini kapatan üç modül:

| Modül | Ne yapar | Testler |
|-------|----------|---------|
| `vault_ts.py` | `Retrieved + ts: float` → `VaultTS.retrieve_sorted()` | 11/11 |
| `sahnekopru.py` | sahne.py `Olay` → `VRMTalimati` (blend/animasyon/poz) | 10/10 |
| `tutarlilik.py` | GÖREV 3c episodik tutarlılık testi | 6/6 |

---

## Geri alınamaz kararlar ve gerekçeleri

### 1. `RetrievedTS` ayrı modülde, `vault.py` dokunulmadı

🔍 A) vault.py'e doğrudan ekle — B) ayrı vault_ts.py  
⚡ B seçildi: TAYF+0 ile çakışma riski; ortak zemin bağımsız değiştirilirse karşılaştırma kirlenir.

### 2. `ts` write anında kaydedilir, retrieve anında hesaplanmaz

🔍 A) write anında → B) retrieve anında dışarıdan  
⚡ A seçildi: episodun ne zaman yazıldığını istiyoruz, retrieve çağrısının zamanını değil. B yanlış bilgiyi taşır.

### 3. Bilinmeyen Olay → None, exception değil

🔍 A) exception → B) None + metriğe say  
⚡ B seçildi: GÖREV 1c'de %30 bilinmeyen çıktı. Exception animasyon akışını keser; None+metrik gözlemlenebilir ve akışı sürdürür.

### 4. VRM 0.x morph-target isimleri (joy/angry/surprised/sorrow/neutral)

🔍 VRM 0.x vs 1.0 (1.0: happy/aa/ih/ou/ee)  
⚡ 0.x: SPIKE_3b_rapor.md kararına çapalı [TEST]. VRM 1.0 kullanılırsa `JEST_BLEND` map güncellenmeli.

### 5. Jaccard eşiği 0.5 [TAHMİN]

`tutarlilik.py`'de `_JACCARD_ESIK = 0.5` — gerçek oturumdan 10 vakada kalibre edilmeli.  
Düşürülürse false-positive artar; yükseltilirse vault tutarlı görünürken UYUMSUZ der.

---

## Varsayımlar (koda gömülü)

```python
# vault_ts.py
# ASSUMPTION(ts-stored): ts write_episode sırasında kaydedilir, retrieve anında hesaplanmaz.

# sahnekopru.py  
# ASSUMPTION(vrm-0x): VRM 0.x; morph-target: joy/angry/surprised/sorrow/neutral.

# tutarlilik.py
# ASSUMPTION(jaccard-threshold): 0.5 eşiği [TAHMİN].
```

---

## Tamamlık testleri (sözlük-kapsam)

`test_tum_pozlar_karsiligi_var` — sahne.POZLAR ⊂ POZ_ANIMASYON  
`test_tum_jestler_karsiligi_var` — sahne.JESTLER ⊂ (JEST_BLEND ∪ JEST_ANIMASYON)  

Sözlük genişlerse bu testler uyarır.

---

## Açık kalanlar (TAYF+1 kapsamı dışı)

- `sahnekopru.py` → Electron SSE köprüsü (main.js → preload.js → `window.dispatchEvent("orion:vrm")`)
- NavMesh + RecastJSPlugin bağlantısı
- VRM model dosyası (`electron/assets/orion.vrm`)
- `_JACCARD_ESIK` kalibrasyonu (10 gerçek oturum vakası gerekli)

---

## KAPANIŞ

Bu sistemi en çok şu yanlışlar: `anchored` alanını `ts` gibi saklanan bir alandan türetmek — "ts var, anchored da saklayalım" refleksi; bunu şu gözlem yakalar: `test_ASIL_compact_sonrasi_anchored_false` compact sonrası bile `_semantic` nesnesinde `anchored` alanı olmadığını assert eder, ts'nin varlığı bu değişmezi bozamaz.
