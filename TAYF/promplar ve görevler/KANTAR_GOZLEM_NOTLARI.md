# Kantar/Saatçi Gözlem Notları — Rampa & Kuyruk

Meissa TAYF damıtım işinden ayrı tutulan altyapı gözlemleri. Dil/kategori sorunu değil, kaynak yönetimi sorunu.

---

## 2026-07-21 — Ollama timeout, art arda yük altında

**Gözlem:** `scripts/meissa_batch.js --count 100` art arda dört kez çalıştırıldı (yaklaşık 300+ gerçek Ollama çağrısı, kısa aralıklarla). Dördüncü turda bir çağrı `meissa: timeout` (15s) verdi — önceki üç turda hiç timeout yoktu.

**Soru (Kantar/Saatçi için):** Art arda yüksek hacimli tier1 (Ollama) çağrısı sonrası yavaşlama sinyali var mı? Kuyruk mekanizmasına ısınma/soğuma periyodu (cooldown) eklenmeli mi, yoksa tek örnek gürültü müydü?

**Durum:** Tek veri noktası — kesin sonuç çıkarılamaz. Sonraki batch koşularında tekrar ederse (özellikle 3-4 ardışık turdan sonra) örüntü olarak değerlendirilmeli.

**Öneri:** Gelecek haftanın kuyruk/rampa işine (Faz 2, Saatçi tasarımı) girdi olarak taşınsın — bugünün TAYF damıtımına karıştırılmasın.
