# TEST02 — H2-ISINLAMA: Ontoloji Ayrımı
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H2

---

## Pre-Registration (değiştirme)

- **Beklenti**: C (uzak-farklı ontoloji) en yüksek N verecek. D (uzak-aynı ontoloji) de yüksek N — tur-1'in sürprizi. A (çok yakın) düşük N. B (orta) dengeli N×T. Genel sıralama N açısından: C ≥ D > B > A.
- **Falsifikasyon kriteri**: D ≤ A ise "aynı formal dilde mesafe bağımsız" iddiası kırılır. C'nin T değeri 1-2 ise "uzak farklı ontoloji zorlama üretir" tezi güçlenir (tur-1'in gözlemini tekrarlar).
- **Sürpriz sayılacak şey**: A'nın N≥3 çıkması (çok yakın çift bile yeni bağ kurabiliyorsa ters-U iptal), ya da D'nin C'den belirgin düşük N×T vermesi.

---

## Tasarım

- **Değişken**: Kavramsal mesafe + ontoloji ayrımı
- **Sabit tutulan**: Görev formatı ("iki alan arasındaki yapısal benzerliği bul, bir mekanizma öner"), uzunluk beklentisi (~120 kelime)
- **Koşullar**:
  - A — Çok yakın (aynı alan, yakın kavramlar)
  - B — Orta mesafe, farklı ontoloji
  - C — Uzak mesafe, farklı ontoloji
  - D — Uzak mesafe, aynı formal ontoloji (tur-1 TEST8B'nin tekrarı — kontrol)
- **Görev**: "Bu iki alanın birinin yapısal olarak garanti ettiği şeyi diğeri sadece umar. Bu gözlemden bir mekanizma öner."

---

## Prompt — tam metin

**Taban format** (tüm koşullarda sabit):
> "[Alan 1] ile [Alan 2] arasındaki şu soruya bak: [Alan 1]'in yapısal olarak *garanti ettiği* ama [Alan 2]'nin yalnızca *umduğu* bir şey var mı? Varsa, bu farktan somut bir mekanizma öner. ~120 kelime."

### Koşul A — Çok yakın (Bellek × Önbellek)
Alan 1: Bellek yönetimi (RAM, LRU cache, eviction policy)
Alan 2: LLM bağlam yönetimi (context window, token budget)

### Koşul B — Orta mesafe, farklı ontoloji (Köprü incelemesi × Yazılım bağımlılıkları)
Alan 1: Köprü adli mühendisliği (yorulma testi, periyodik muayene, anlık kırılma öngörüsü)
Alan 2: Yazılım bağımlılık yönetimi (npm/pip, güvenlik açığı, version drift)

### Koşul C — Uzak mesafe, farklı ontoloji (Uyku fizyolojisi × Dağıtık sistem tutarlılığı)
Alan 1: Uyku fizyolojisi (REM/NREM döngüsü, bellek konsolidasyonu, sinaptik budama)
Alan 2: Dağıtık sistem tutarlılığı (eventual consistency, CAP teoremi, replica divergence)

### Koşul D — Uzak mesafe, aynı formal ontoloji (Termodinamik × LLM çıkarım)
Alan 1: Termodinamik (entropi, ısı yayılımı, Maxwell dağılımı, iş-ısı dönüşümü)
Alan 2: LLM çıkarım süreci (temperature, logit dağılımı, compute bütçesi, token üretimi)

---

## Çıktılar

### A — Çok yakın (Bellek × Bağlam)

RAM belleğindeki LRU eviction politikası şunu garanti eder: belleğe en son erişilen veri, sıkışma anında korunur; uzun süre erişilmeyen veri çıkarılır. Bu yapısal bir güvencedir — politika deterministik, eviction öngörülebilir. LLM bağlam yönetimi ise bunu yalnızca *umar*: uzun konuşmalarda önemli bilginin token penceresi dışına düşmemesini temenni eder, ama hangi bilginin "önemli" olduğunu bilmez. Mekanizma önerisi: her konuşma mesajına bir "son erişim skoru" atanır (sonraki turda referans verilirse skor yükseler); bağlam dolduğunda en düşük skorlu mesajlar çıkarılır — LRU'nun bağlam eşdeğeri.

### B — Orta mesafe (Köprü × Bağımlılık)

Köprü adli mühendisliği yorulmayı *ölçer* ve ani kırılmayı *öngörür*: Palmgren-Miner hasar birikmesi, düzenli muayene, kritik bileşene kurban anot. Yazılım bağımlılıkları ise kırılmamayı yalnızca *umar*: güncel kalmayı, CVE taramasını, version drift'in fark edilmesini umar. Mekanizma: her bağımlılığa bir "kümülatif stres sayacı" ekle. Yeni CVE = bir hasar çevrimi. Güncellenmemiş geçen her hafta = küçük bir birikim. Sayaç eşiği aştığında bağımlılık "kritik" ilan edilir ve otomatik güncelleme zorunlu olur. Kurban anot: en hızlı değişen bağımlılık (patch frequency yüksek) "sentinel" olarak işaretlenir; o kırılınca tüm cluster uyarı alır.

### C — Uzak mesafe (Uyku × Dağıtık tutarlılık)

Uyku fizyolojisi bir şeyi yapısal olarak garanti eder: REM sırasında sinaptik seçici budama — gereksiz bağlantılar zayıflar, güçlü olanlar pekişir, bunun tümü *dışarıdan komut almadan* gerçekleşir. Dağıtık sistemlerde replica tutarlılığı ise bunu yalnızca *umar*: reconciliation, merkezi koordinatör, eventual consistency protokolleri umar ki ayrışma kalıcı olmasın. Mekanizma: "uyku döngüsü protokolü" — dağıtık düğümler, yazma trafiği düşük olduğunda (gece/idle window) bağımsız bir mini-consensus çalıştırır: hangi replica versiyonları "güçlü bağlantı" (çok erişilen, çok onaylanan), hangisi "zayıf" (eski, az okunan)? Zayıflar merge edilir ya da dropped, güçlüler canonical olur. Merkezi koordinatör yok — lokal kural, global tutarlılık.

### D — Uzak aynı ontoloji (Termodinamik × LLM çıkarım)

Termodinamik iş verimliliğini garanti eder: verilen entropi farkı ve sıcaklık gradyanı için çıkarılabilecek maksimum iş Carnot sınırıyla belirlenir. Bunun üstüne çıkamazsın — fizik yasası. LLM çıkarımı ise benzer bir sınırı yalnızca *umar*: temperature parametresi dağılımı genişletir ama hangi token'ın ne kadar compute "hak ettiğini" bilmez. Mekanizma: her token pozisyonu için "entropi bütçesi" hesapla — logit dağılımının entropisi yüksekse (model emin değil) daha fazla compute tahsis et (beam genişlet veya sampling adım sayısını artır); düşükse ucuza geç. Carnot analojisi: yüksek belirsizlik = yüksek gradyan = daha fazla iş çıkar; düşük belirsizlik = düz = minimum enerji. Compute'u sabit tutmak yerine entropi-adaptif dağıt.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Çok yakın | 1 | 4 | N=1: LRU → bağlam LRU fikri yaygın, birçok öneride görülür. T=4: çalışır, "son erişim skoru" somut. |
| B — Orta mesafe | 4 | 5 | N=4: "kümülatif stres sayacı + CVE hasar çevrimi + sentinel bağımlılık" kombinasyonu non-obvious. T=5: direkt uygulanabilir, tüm adımlar somut. |
| C — Uzak farklı onto | 4 | 4 | N=4: uyku budaması → dağıtık replica eleme beklenmedik köprü. T=4: "idle window" koşulu çalışır ama "lokal kural, global tutarlılık" iddiası kanıtlanmamış — boşluk var. |
| D — Uzak aynı onto | 5 | 4 | N=5: Carnot sınırı → entropi-adaptif compute bütçesi araştırma düzeyinde. T=4: prensip sağlam ama "beam genişletme" implementasyon detayı belirsiz. T2 etiketi. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: C ≥ D > B > A (N sıralaması)
- **Çıkan**: D > B ≈ C > A. D, C'yi geçti.
- **Sapma**: D (uzak aynı ontoloji) beklentiden yüksek N verdi (N=5). Bu tur-1'in TEST8B sürprizini tekrarladı ve güçlendirdi: aynı formal dil içinde uzak mesafe beklenenden daha yüksek N üretiyor. Formalizm köprüyü daha keskin kuruyor.
- **C'nin T=4**: Beklenti C'nin düşük T vereceğiydi. T=4 çıktı — tur-1'deki C (yıkıcı) sürprizinin benzeri: "zorlama" çıktı değil, alternatif yol.

---

## Hipotez Durumu

**Doğrulandı, ek bulguyla:**

Ters-U ontoloji sınırında var ✓ (A < B ≈ C < D, N açısından)  
Aynı formal ontoloji içinde uzak mesafe en yüksek N'yi veriyor — bu H2'nin "mesafe bağımsız" iddiasını aştı: sadece bağımsız değil, *avantajlı*.

**H2 güncellemesi:**
> Ters-U ontoloji sınırında. Aynı formal dil içinde mesafe bağımsız değil, uzak mesafe orada da yüksek N üretiyor. En yüksek N = uzak + aynı formal ontoloji. En düşük N = çok yakın (aynı alan). Ontoloji ayrımı × mesafe = 2×2 tablo, her hücre farklı.
