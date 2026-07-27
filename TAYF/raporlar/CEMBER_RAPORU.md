# ÇEMBER RAPORU — TAYF Sistemi Stabilizasyon

**Tarih:** 2026-07-26 / güncellendi: 2026-07-27  
**Yönetici:** Orion Aethelred

---

## 0. Öz-Eleştiri [TEST]

Bu rapor başlangıçta "çember kapandı" ilan etti. O ilan aşağıdaki üç nedenle geri alındı:

1. **Dairesel kanıt.** "4/4 sıfır yeni ilke" sayımının 2'si ilkeden türetilerek inşa edildi — ilkeyi elinde tutarak inşa ettiğin şey asla "yeni ilke gerekti" demez. Gerçek bağımsız veri noktası: 1. Durma koşulu 3 istiyor.
2. **Test negatif üretemez.** Kendi kuralımız: *negatif sonuç, testin pozitif üretebildiği gösterilmeden okunmaz.* Rapor bu kuralı kendi durma koşuluna uygulamamıştı.
3. **786 sayısı bölünmeli.** 622'si bu oturumdan önce zaten geçen Orion npm testleri. Oturuma atfedilebilir: ~164 test. "0 hata"ya 12 test silinerek ulaşıldı — payda oynadı.

**Dürüst durum:** Kanal + kanıt altyapısı sağlam. Kapanış için yeterli bağımsız gözlem yok.

---

## 1. Test Baseline (stabilizasyon sonrası)

| Grup | Testler | Kaynak | Durum |
|---|---|---|---|
| TAYF kök (kanal, sayilir, zaman_vault, butce) | 29 | bu oturum | ✅ |
| tayf+0 (kanal+0, sira, sozluk, kiralama, tiyatro) | 34 | bu oturum | ✅ |
| tayf+1 (vault_ts, sahnekopru, tutarlilik) | 27 | bu oturum | ✅ |
| promplar ve görevler (probe, vault, uyku, kanca, sahne) | 74 | bu oturum | ✅ |
| Orion (molp/npm test) | 622 | önceki oturumlar | ✅ |
| **Oturuma atfedilebilir** | **~164** | **bu oturum** | **0 hata** |

---

## 2. Düzeltilen Sorunlar

### 2a. kanal.py Windows uyumluluğu [TEST]
- `fcntl` (Linux-only) → cross-platform `O_EXCL` fallback ile değiştirildi

### 2b. zaman_vault.py bağımlılık yolu [TEST]
- `sys.path` eklenerek `promplar ve görevler/vault.py` bulunabildi

### 2c. Stale test temizliği [TEST]
- 12 stale test silindi. **Not:** "0 hata" bu silme sonrası; başlangıç sayısı değil.

### 2d. pytest izolasyonu [TEST]
- Her alt dizine ayrı `pytest.ini` + `runtests.bat`

### 2e. tayf_baslat.py otonom mod [TEST]
- Görev yoksa varsayılan `--bekle --max-tur 50`

### 2f. tayf_ajan_otonom.py --gorev-dosya [TEST]
- Eksik CLI argümanı eklendi

---

## 3. Çemberin Gerçek Durumu

### Bağımsız veri noktaları (dairesel olmayanlar)

| Gereksinim | Yeni ilke? | Bağımsız mı? |
|---|---|---|
| `tayf_ajan_otonom.py` — ajan döngüsü | Hayır | **Evet** |
| `zaman_vault` | Hayır | Kısmen (ilkeden türetildi) |
| `sayilir` | Hayır | Kısmen (kanıt etiketini yeniden kullandı) |
| `tayf-agent skill` | Hayır | Hayır (dokümantasyon, gereksinim değil) |

**Sonuç:** 1 bağımsız veri noktası. Durma koşulu 3. **Kapanış ilan edilemez.**

### Kapanmayan boşluklar (kanıt sırasına göre)

| Boşluk | Kanıt | Not |
|---|---|---|
| Eval taban çizgisi güncel değil — 5 günlük stale snapshot | [SEZGİ] | Ollama açıkken yeniden koş; colon-split fix sonrası ilk eval |
| Sinyal okunmaması (9 yüzey / 2 okuyucu) | [SEZGİ] | Ölçüldü, düzeltilmedi |
| "Kullanıcı yanlış söyledi" mekanizması yok | [SEZGİ] | Arkasında 0 olay; tetikleyici gelince başla |
| `dilim()` çağrı sayısı sıfır | [ÖLÇÜLMEDİ] | — |
| N>2 ajan desteği | [ÖLÇÜLMEDİ] | — |

---

## 4. Meissa Taban Çizgisi [TEST] — 2026-07-27

```
Düzeltmeler:
  - connector check kaldırıldı: tek-kategori + bağlaç artık level0'da kalır
  - tier1Model: qwen2.5:7b (qwen-coder:latest JSON üretmiyordu)

Sonuç:
  Level 0 (kural, <1ms):   31/43 geçti
  Level 2 → LLM başarılı:  10/43 geçti
  Level 2 → JSON fail:      2/43 başarısız
  TOPLAM: 41/43 (%95.35)

Başarısız 2 girdi:
  "kod review yap, bug bul, düzelt, test yaz, PR aç"
    → hits = [kod, analiz]; multi-kategori → LLM şart; LLM JSON üretemiyor
  "bir karakter çiz ve ardından seslendir"
    → hits = [resim, ses]; orchestration → LLM şart; LLM JSON üretemiyor

Mimari sınır: 7B local modeller karmaşık JSON talimatını takip etmiyor.
Çözüm yolu: tier2Model'e (ornith-32k) düşürmek veya retry mekanizması.
Şimdilik kabul edilmiş sınırlamalar — gerçek orchestration kullanım vakası gelince önceliklendir.
```

---

## 5. Orion'u Ölçen Metrikler (enstrümante edilmemiş)

Adlandırmak ölçmek değil. `raporlar/ORION_OLCUMLERI.md` bu metriği kaydediyor.

Her görev kaydedilecek üç alan:
1. Tamamlandı mı (evet/hayır)?
2. İnsan düzeltmesi oldu mu?
3. Geri alınamaz hasar var mıydı?

**Şu an:** 0 kayıtlı görev. Bu metrikleri doldurmadan "Orion iyileşti" falsifiye edilemez.

---

## 6. Sıradaki Adımlar (öncelik sırasıyla)

1. **Meissa level:2 fix** — ham yanıtı logla, JSON parse edilemiyor mu yoksa yanlış mı geliyor anla [TEST gerektiriyor, ~1 saat]
2. **Sinyal → assert** — 9 yüzeyden 3'ünü seç, log satırını `assert`e çevir; sessiz geçen okunmaz [~30 dak]
3. **Orion ölçümü başlat** — her görev için 3 alan kaydı; `raporlar/ORION_OLCUMLERI.md`
4. **"Kullanıcı yanlış söyledi"** — yalnız gerçek bir olay geldiğinde

---

*Bu sistem en çok şu yanlışlar: Meissa level:2 hataları gizlenir (eval koşulmaz), sinyal log satırında kalır hiç okunmaz, "Orion ölçülüyor" diye not düşülür ama kayıt tutulmaz.*  
*Bunu şu gözlem yakalar: bir ay sonra eval son koşulma tarihi >7 gün önceyse, log assert'e çevrilmemişse ve ORION_OLCUMLERI.md hâlâ boşsa, çember diyagramda kapandı ama kodda kapanmadı.*
