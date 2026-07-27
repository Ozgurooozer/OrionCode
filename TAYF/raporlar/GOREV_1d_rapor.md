# GÖREV 1d — Konsolidasyon + REM Raporu

**Tarih:** 2026-07-24  
**Script:** `kos_uyku.py`  
**Model:** qwen2.5:7b (Ollama, NREM: temp=0.0, REM: temp=0.9)  
**Durum:** [TEST] KOŞULDU

---

## Ham Sonuçlar

### NREM Özetleri (temperature=0.0)

| Episode | Özet |
|---------|------|
| ep01 | "vault dört katmanlı olarak kararlaştırıldı ve Provenance kapasitesi okuma sırasında hesaplanacak" |
| ep02 | "sahne modülü tasarlanmıştır ve işaretçi gören metin için sızma kuralı eklenmiştir" |
| ep03 | "uyku modülü REM karantina güvencesi ile eklenmiştir. Bu güvence yüksek sıcaklık çıktısına sahip entegrasyonlar onaysız vault'a giremez" |
| ep04 | "kos_butce testi sonucunda uzun prompt'ın bir fark yaratmadığını belirtti. META kuralına dayanarak etikete uymaya yönlendirdi" |

**NREM değerlendirmesi:** [TEST] Özet doğru yönde ama çeviri hataları var:
- "provenance kapasitesi" → "provenance çapası" olmalıydı
- "gören metin" → "görünür metin"
- "META kuralına dayanarak etikete uymaya yönlendirdi" belirsiz

### REM Önerileri (temperature=0.9, karantina)

| İndeks | Öneri |
|--------|-------|
| [0] | "bu parçalar bir oyun veya simülasyon [ÇINCE METIN KARIŞTI]" |
| [1] | "Bu parçalar farklı tarihlerde belirlenen teknik kurallar... açık bir bağlama sahip değil" |
| [2] | "bir projede çeşitli modüllerin geliştirilmesinin ilerlemesini takip ediyor; belirsiz durumlar gösteriliyor" |

**REM değerlendirmesi:** [TEST] 3/3 öneri işe yaramaz.
- [0] Çince metin karışmış (model dil geçişi yaptı)
- [1,2] Vague meta-yorum: "bağlantı yok / belirsiz". Gerçek bağlantı önerisi yok.

**Karar:** REM kapat. NREM konsolidasyonu yeter.

---

## v7 Analiz

🔍 **Alternatif açıklama (REM neden işe yaramıyor):**  
A) Vault içeriği homojen (hep aynı proje kararları), bağlantı önermek için yeterli çeşitlilik yok.  
B) qwen2.5:7b temperature=0.9'da dil geçişi yapıyor (Çince). Model Çince eğitim ağırlığı yüksek.  
C) REM prompt'u ("şaşırtıcı bağlantı var mı?") modeli meta-yoruma yönlendiriyor.

📏 **Fark büyüklüğü:** [TEST] NREM %100 anlamlı (4/4 özet doğru yönde). REM %0 işe yarar (0/3).

🎧 **Kanıt etiketi:** [TEST] 4 NREM + 3 REM çağrısı.

🐋 **Popülerlik mi ihtiyaç mı?** "REM benzeri bağlantı önerileri yaratıcı bağlantı için değerli" — bu nörobilim analogiyle geldi. Ama qwen2.5:7b bu görevi şu formatta yapamıyor.

⚡ **Karar değişti mi?** EVET — **REM kapatılacak.** Nedenler:
1. Öneri kalitesi sıfır (0/3 geçerli).
2. Temperature=0.9'da dil kayması var (Çince).
3. VRAM/elektrik harcar, sonuç vermez.
NREM konsolidasyonu çalışıyor ve korunacak.

---

## Uzman 1: Bilişsel Sinirbilimci

**Perspektif:** NREM/REM analogunun biyolojik modelle karşılaştırması.

**NREM başarısı beklendik:**  
Biyolojik NREM "episodik → semantik geçiş" yapar: detaylar azalır, öz bilgi güçlenir. Bu özetleme görevi 7B modelin güçlü olduğu alan. Başarı sürpriz değil.

**REM başarısızlığının biyolojik analogu:**  
Biyolojik REM: aynı gece birden çok bellek arasında zayıf çağrışımları güçlendirir, yeni bağlantılar üretir. Bu süreç semantik mesafe gerektiriyor: "rüya" işlemi, farklı bağlamların (episodik + duygusal + prosedürel) karışımından yararlanır.

Orion'un vault'u bu oturumda tek proje = homojen içerik. Bağlantı önerileri için **konular arası episodik çeşitlilik** gerekiyor. Gerçek vault'ta (molp projesinin yıllık tarihi, farklı konular) REM daha anlamlı sonuç verebilir.

**Öneri:** REM'i tamamen kapatmak yerine, "vault yeterli heterojenliğe ulaştığında" (min. 50 episod, 5+ farklı konu kümesi) yeniden dene. Bu tetikleyiciyi kos_uyku.py'a ekle.

---

## Uzman 2: Sistem Mühendisi

**Perspektif:** Kaynak kullanımı ve karantina güvencesi.

**Karantina güvencesi çalışıyor:**  
3 REM çağrısı yapıldı, karantinada 3 öneri var, vault'ta 0 onaysız ekleme var. [TEST] Değişmez korundu.

**Kaynak maliyeti:**  
- REM çağrısı başına: ~3-5s (temperature=0.9, tekrar=sampling artar)
- NREM başına: ~2-3s (greedy, hızlı)
- Gerçek vault'ta: NREM değerli (bilgi sıkıştırma), REM şu an gereksiz maliyet.

**REM kapatma önerisi (teknik):**  
```python
# uyku.py'da
_REM_AKTIF = False  # config flag
```
Ya da UykuMotoru'na `rem_aktif: bool = False` ekle; default kapalı. Gelecekte heterojen vault ile `True` deneyin.

**Dil kayması için:**  
REM prompt'una "YALNIZCA Türkçe yanıt ver" ekle. temperature=0.9'da qwen2.5:7b Çinceye düşüyor; bu Türkçe zorlamasıyla düzeltilebilir.

---

## KAPANIŞ

Bu uyku modülünü en çok şu yanlışlar: REM öneri kalitesi düşük olunca "prompt düzeltirsem çalışır" diye iterasyon başlanır ve VRAM/zaman harcanır — oysa asıl mesele vault içeriğinin homojen olması (REM heterojenlik ister); bunu şu gözlem yakalar: REM prompt değiştirilip yeniden koşulunca aynı vault içeriğiyle hâlâ meta-yorum geliyor ve somut bağlantı yok ise, sorun prompt değil veri çeşitliliğidir.
