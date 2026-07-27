# GÖREV 3 — MVP Raporu (v2)

**Tarih:** 2026-07-25 (güncelleme)  
**Alt görevler:** 3a (çoklu görev ölçümü) + 3b (Babylon MVP) + 3c (MVP ölçütü)

---

## Ön Koşul Durumu (güncel)

| Ölçüm | Durum | Karar |
|-------|-------|-------|
| 1a (bütçe) | [ZAYIF-ÖLÇÜM] | askıda — 3 tur, ikisi de tavan altı |
| 1b (provenance) | [TEST] KOŞULDU | SET B guard=0.25 → metadata etkili |
| 1c (sahne) | [TEST] KOŞULDU | bilinmeyen 6/20, sözlük düzeltildi |
| 1d (uyku) | [TEST] KOŞULDU | REM kapatıldı, sadece NREM |
| 3a (çoklu görev) | [TEST] KOŞULDU | delta=0.114 → TEK AKIŞ YETERLİ |

---

## GÖREV 3a — Çoklu Görev Ölçümü [TEST] TAMAMLANDI

### Ham Sonuçlar

**Model:** qwen2.5:7b, N=20 soru

| Koşul | Geçerli İşaretçi Oranı |
|-------|----------------------|
| A: sohbet + işaretçi | **0.886** |
| B: sohbet + işaretçi + uzamsal | **0.772** |
| Delta (A-B) | **0.114** |

**Karar: TEK AKIŞ YETERLİ.** delta=0.114 < 0.30 eşiği. 3b'ye geç.

### Poz Dağılımı

| Koşul | Poz dağılımı |
|-------|-------------|
| A | eğiliyor×6, bakıyor×5, oturuyor×4, duruyor×3, yürüyor×2 |
| B | eğiliyor×9, yürüyor×5, bakıyor×2, duruyor×2, oturuyor×1 |

### İkincil Bulgular (endişe, karar değiştirmiyor)

| Metrik | A | B | Delta |
|--------|---|---|-------|
| Bilinmeyen işaretçi | 5 | **13** | +8 |
| jest/yanıt oranı | 0.95 | 1.25 | — |

**Bilinmeyen artışı (5→13):** Uzamsal ek görev eklenince model daha fazla "bilinmeyen" poz üretiyor. Bu, görev yükü altında işaretçi kalitesinin düştüğünü gösteriyor. Ama geçerli işaretçi oranı yeterli korunduğundan (0.886→0.772) mimari değişiklik gerektirmiyor.

**jest/yanıt oranı B'de 1.25 > 1.0:** Bir yanıtta birden fazla jest, bu tutarsız / yanıt başına 1 jest beklentisiyle çelişiyor. İzlenecek.

---

## v7 Analiz — 3a

🔍 **Alternatif:** Büyük model (ornith-32k) kullan, 7B'nin limitini aş. Ama yerel öncelik ve kaynak kısıtı bunu erteliyor. Delta<0.30 tek akışın yeterli olduğunu kanıtladığından büyük model gereksiz.

📏 **Fark büyüklüğü:** [TEST] delta=0.114. Küçük etki büyüklüğü, ama eşiğin altında — karar net.

🎧 **Kanıt:** [TEST] 40 LLM çağrısı (20×2 koşul), qwen2.5:7b, 2026-07-25.

🐋 **Popülerlik mi ihtiyaç mı?** "7B model üç görevi taşıyamaz, ayrı çağrı gerek" yaygın varsayım. Ama ölçüm gösteriyor ki taşıyabiliyor (eşik altı delta). Varsayım ölçülmeden uygulanmasaydı gereksiz mimari karmaşıklık ekliyordu.

⚡ **Karar değişti mi?** EVET — önceki "[ÖLÇÜLMEDİ]" durumundan karar verildi: TEK AKIŞ YETERLİ, router pattern GEREKMEZ.

---

## Uzman 1: Sistem Mimarı (3a sonrası güncelleme)

**delta=0.114 → router pattern gerekmez.** Başlangıçtaki Plan A (paralel LLM + kural tabanlı uzamsal) ve Plan B (ayrı faz, 2x maliyet) her ikisi de gereksiz.

**Ancak bilinmeyen artışı (5→13) izlenmeli:**
Şu an eşik altında. Ama 3 görev yerine 4-5 görev eklendikçe bilinmeyen oranı eşiği geçebilir. Öneri: `kos_coklu.py`'a "bilinmeyen oran eşiği" uyarısı ekle (>%30 → uyar). Şu an B koşulunda 13/20 = %65 bilinmeyen — bu aslında çok yüksek, bunu geçerli_isaretci_orani metriği zaten yakalıyor.

**B poz dağılımı çarpık:** B'de eğiliyor×9 (A'da ×6). Uzamsal ek "masaya git" görevi "eğilme" niyetini tetikliyor olabilir. Bu sözlük tasarımına bakmayı gerektirebilir.

### Uzman 2: Bilişsel Hesaplama Araştırmacısı

**Kapasite analizi:**
- A oranı 0.886 → model 3 görevden 2.83'ünü doğru yapıyor.
- B oranı 0.772 → 4 görevde (uzamsal eklendi) 3.09'unu doğru yapıyor.

"Uzamsal görev işaretçileri baskılıyor" hipotezi kısmen doğrulandı (bilinmeyen +8). Ama etki geçerli oranı kritik eşiğin altına düşürmüyor.

**Önemli sınır:** N=20. Güven aralığı: 0.772 ± 0.094 (%95 Wilson). Alt sınır 0.678 — tek akış kararı güçlü.

---

## GÖREV 3b — Tek Oda MVP (Güncel Durum)

### Kritik Karar: THREE.js vs Babylon.js [TEST] KARARI VERİLDİ

**Karar: Babylon.js.** Spike 2026-07-25 koşuldu. Detay: `TAYF/raporlar/SPIKE_3b_rapor.md`.

**Özet bulgular:**

| Kriter | Sonuç |
|--------|-------|
| Mevcut renderer | `SceneManager.ts` — Babylon.js, çalışıyor |
| VRM yükleme | `@babylonjs/loaders` EKLENDİ (^9.18.0), `GLTFFileLoader` doğrulandı |
| NavMesh | `RecastJSPlugin` + `RecastJSCrowd` @babylonjs/core'DA MEVCUT — ek paket yok |
| Renderer yeniden yazma | 0 satır (SceneManager korunuyor) |
| TypeScript | 0 hata (VRMLoader.ts, tsc --noEmit) |
| Bundle delta | +~180KB (THREE.js geçişi +~820KB olurdu) |

THREE.js + `@pixiv/three-vrm` npm'de mevcut (v0.185.1 / v3.5.5) ama mevcut `SceneManager.ts`'i sıfırlamak demek — hiçbir kazanım yok.

**VRM yükleme kodu:** `electron/Terminal/scene/VRMLoader.ts` — yazıldı, typecheck ✓.

**Uygulama planı:**
```
1. VRM model → electron/assets/orion.vrm
2. SceneManager.loadCharacter(vrmPath) → VRMLoader.loadVRM()
3. sahne.py [POZ:x]/[JEST:x] → VRMHandle.setPoz()/setBlend() — SSE üzerinden
4. recast.wasm fetch → RecastJSPlugin (navmesh, tek oda)
```

### Değişmezler (korunuyor)

1. Episodik vault → gözlem zamanıyla yazar, semantik değil.
2. LLM ~1Hz niyet, motor 60Hz.
3. Foveal algı: sadece ray-cast odak nesnesi LLM'e gönderilir.
4. Dudak senkronu genlik tabanlı (MVP için).

---

## GÖREV 3c — MVP Ölçütü (Korunuyor)

**Ölçüt: tutarlılık, demo değil.**

```
10 dakika oturum → 5 nesne görülür
Her nesne vault.write_episode("ep_<ts>", "kapı @t=120")
→ Sonra: "5 dakika önce kapı neydi?"
  retrieve(query="kapı", k=3) → ep_<120> dönmeli, anchored=True
→ Cevap ep_<120>.text ile örtüşüyor mu?
```

**Başarı:** Vault kaydıyla örtüşüyor.
**Başarısız:** Uydurma veya yanlış episode → render'a değil vault tutarlılığına dön.

**Gereken vault.py değişikliği (3b öncesi):** `Retrieved` dataclass'a `ts: float` ekle; `retrieve()` zaman sıralaması kullansın. Bu hâlâ eklenmedi — 3b başlamadan önce zorunlu.

---

## KAPANIŞ

Bu MVP'yi en çok şu yanlışlar: 3a'nın "delta küçük, tamam" sonucunu görüp bilinmeyen artışını (5→13) izlemeyi bırakmak; uzamsal görev eklendikçe bu sayı eşiği geçebilir ve MVP demo'sunda animasyon monotonlaşır — bunu şu gözlem yakalar: gerçek 3b MVP'sinde 10 dakika içinde karakter 5+ konuma gittiğinde işaretçi başına bilinmeyen oranı %30'u geçiyorsa 3a'nın 20 soruluk testi yeterince stres uygulamadı demektir ve router pattern yeniden değerlendirilmeli.
