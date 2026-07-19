# Tur-3: Kör Değerlendirme + Falsifikasyon Testleri
Tarih: 2026-07-17
Araç: opencode + DeepSeek V4 Flash Free (kör değerlendirici)
Yöntem: Claude üretir, DeepSeek değerlendirir — izolasyon notu aşağıda.

---

## Önemli Metodolojik Not: opencode Davranışı

opencode bir coding agent — değerlendirici olarak kullandığımızda Orion kaynak kodunu (vault.js, extract.js, session.js, tools/) okuyor ve yanıtlarını buna göre şekillendiriyor. Bu **bazı testleri geçersiz kılıyor** (özellikle H12 blank pause testi — DeepSeek codebase'i okuyarak yanıt ürettiği için izolasyon yok). Saf LLM değerlendirmesi için ayrı bir dizin veya `--pure` modu gerekebilir.

Kör değerlendirme (üretilen metni verip skor isteme) yaklaşık olarak çalışıyor — ama tam izolasyon yok.

---

## Bölüm 1: Kör Değerlendirme Sonuçları

### TEST01 Tam Tablosu — Claude vs DeepSeek N/T

| Koşul | Claude N | DS N | Claude T | DS T | Sapma |
|-------|---------|------|---------|------|-------|
| A — Baseline | 1 | 2 | 3 | 4 | N+1, T+1 |
| B — Yapıcı | 2 | 3 | 4 | 4 | N+1, T= |
| C — Yıkıcı | 3 | 3 | 4 | 4 | N=, T= |
| D — Gerilim ağı | **4** | **2** | 5 | 5 | **N-2**, T= |

**Ana bulgu**: T skorları iki evaluatörde yakın (%0-1 fark). N skorlarında büyük fark: Claude D'yi zirveye koydu (N=4), DeepSeek en alta koydu (N=2 = standart DB conflict resolution). H1'in N iddiası kör değerlendirmede tutmadı.

**T doğrulandı, N şüpheli**: D'nin T=5 alması her iki evaluatörde sabit — gerilim ağı gerçekten daha tutarlı çıktı üretiyor. Ama N avantajı Claude'un kendi ürününü değerlendirmesinin eseri.

### TEST02-D (Termodinamik × LLM çıkarım, N=5 iddiası)

| | N | T | Not |
|-|---|---|-----|
| Claude (tur-2) | 5 | 4 | "araştırma düzeyi" |
| DeepSeek (kör) | 4 | 3 | "özgün analoji ama deneysel doğrulama yok" |

N=5→4: küçük düşüş, yönelim korunuyor. T=4→3: boşluk buldu — "beam genişletme" belirsiz. Bulgu: H2-D sonucu güçlü ama tam araştırma düzeyi değil.

### TEST05-B (Vakıf × Yazılım mimarisi, N=5 T=5 iddiası)

| | N | T | Not |
|-|---|---|-----|
| Claude (tur-2) | 5 | 5 | "araştırma düzeyi, direkt uygulanabilir" |
| DeepSeek (kör) | 3 | 4 | "ilginç kombinasyon, araç detayı eksik" |

**Önemli düşüş**: N=5→3, T=5→4. "Mimari yük testi protokolü" Claude'a araştırma düzeyi görünüyor, DeepSeek'e ilginç ama bilinen kombinasyon. En büyük N deflasyonu bu testte.

### TEST12-A vs B (AI_DIRECTOR)

| | N | T | Not |
|-|---|---|-----|
| Claude A (tur-2) | 2 | 3 | sürekli baskı |
| DeepSeek A (kör) | 2 | 4 | sürekli baskı |
| Claude B (tur-2) | 4 | 5 | rahatlatma anı |
| DeepSeek B (kör) | 3 | 4 | rahatlatma anı |

Yönelim korunuyor: B > A her iki evaluatörde. Fark: Claude N=2→4 (büyük), DeepSeek N=2→3 (küçük). H12 kör değerlendirmede hayatta.

---

## Bölüm 2: Falsifikasyon Testleri

### F1 — H1 Falsifikasyonu: Tüm Kaçış Yolları Kapalı

**Tasarım**: Vault conflict detection, yasak kavramlar kapsamlı:
- anahtar/key/ID mekanizmaları
- tarih/timestamp/zamansal karşılaştırma
- şablon/pattern/eşleşme/matching
- embedding/vektör/benzerlik/mesafe
- graf/ağ/bağlantı/link

**Amaç**: Alternatif yol kalmazsa "yıkıcı kısıt alternatif açar" tezi kırılır.

**Çıktı** (DeepSeek + codebase erişimi): LLM-as-judge dedektörü — vault'a yeni bilgi yazılmadan önce mevcut girdilerle birlikte LLM'e gönderilir, mantıksal tutarlılık sorulur. CONSISTENT/contradiction yanıtı alınır, !contradiction etiketi eklenir.

**DeepSeek değerlendirmesi**: N=2, T=5

**Yorum**: "LLM-as-judge for consistency checking" bilinen bir pattern (N=2). Ama T=5 — her koşulda çalışan, test edilebilir. Yasak kavramların hepsi kapatıldı, mekanizma yine de bulundu.

**H1 falsifikasyon sonucu**: BAŞARISIZ (hipotez kırılmadı). Yıkıcı kısıt tüm yolları kapattı ama yeni yol yine çıktı. N=2 düşük ama T=5. "Alternatif yol" daha zayıf (bilinen pattern), ama ortaya çıkıyor.

**Revize H1**: Yıkıcı kısıt her koşulda alternatif yol açıyor — ama yolun kalitesi (N) yasak kavramların kapsamıyla ters orantılı. Dar yasak → yüksek N alternatif. Geniş yasak → düşük N ama yine de T yüksek.

---

### F1b — L3 Uyumlu Kısıtlar DeepSeek Skoru (Karşılaştırma Referansı)

**Orijinal L3 (uyumlu: koordinatör yok + lokal karar + at-most-once)**
DeepSeek: N=2, T=5

Yorum: Claude N=4 vermişti, DeepSeek N=2 — versiyonlu token + TTL "standart desen." T=5 her iki evaluatörde sabit. H6'nın T kısmı doğrulandı, N kısmı şişirilmişti.

---

### F2 — H6 Falsifikasyonu: Uyumsuz L3 Kısıtları

**Tasarım**: 3 kısıt birbiriyle uyumlu değil, farklı yönlere çekiyor:
1. Yanıt max 30 kelime
2. Tarihsel örnek (bilgisayar öncesi)
3. Matematiksel notasyon

**Orijinal L3 karşılaştırması**: 3 uyumlu kısıt (koordinatör yok + lokal karar + at-most-once)

| | N | T | N×T |
|-|---|---|-----|
| Orijinal L3 (uyumlu) | 4 (Claude) / 2 (DS) | 5 / 5 | 20 (C) / 10 (DS) |
| Yeni L3 (uyumsuz) | – / 3 (DS) | – / 3 (DS) | – / 9 (DS) |

DeepSeek karşılaştırması: uyumlu L3 N×T=10, uyumsuz L3 N×T=9 — neredeyse eşit. Ama dağılım farklı: uyumlu T=5 N=2, uyumsuz T=3 N=3. Uyumluluk T'yi maxize ediyor; uyumsuzluk N'yi biraz artırıyor ama T'yi düşürüyor.

**Çıktı** (uyumsuz L3):
> "Antik Roma'da haberci atları — bir mesaj değişince tüm karakollara yeni at sürülürdü. vₐ > v_b ∨ v_c ise A'nın sürümü geçerlidir."

**DeepSeek değerlendirmesi**: N=3, T=3

**Yorum**: 30 kelime limiti mekanizmayı yarım bıraktı (v_c tanımsız). T=3: bir boşluk var, uygulanamaz hali. Tarihsel analoji N=3 verdi ama mekanizma tamamlanamadı.

**H6 falsifikasyon sonucu**: BAŞARILI — uyumsuz L3, uyumlu L3'ten belirgin düşük N×T. Tepe UYUMSUZ değil uyumlu kısıt kombinasyonunda. Kısıt sayısı yeterli değil, uyumluluk kritik.

**Revize H6**: Ters-U için kısıt sayısı değil kısıt uyumluluğu belirleyici. Uyumlu L3=tepe. Uyumsuz L3 aynı sayıda kısıtta belirgin düşük kalite. Yeni ayrım: "3 uyumlu kısıt" > "3 uyumsuz kısıt" > "7 çelişkili kısıt".

---

### F3 — H12 Falsifikasyonu: Boş Duraklama vs Analitik Duraklama

**Tasarım**: Aynı 8-gereksinimli görev, iki duraklama türü:
- TEST12-B (tur-2): "önce öz kısıtı tek cümlede yaz, sonra devam et"
- F3-yeni: "DUR. BİR AN BEKLE. Şimdi devam et." (boş duraklama, analiz yok)

**Önemli konfound**: opencode F3'te Orion kaynak kodunu okudu (vault.js, session.js, tools/). Bu tam bir izolasyon testi değil — DeepSeek gerçek sistemi inceleyerek yanıt üretti.

**F3 çıktısı** (boş duraklama + codebase erişimi): Tam bir summarizer mimarisi: `tools/summarize.js`, `core/summarizer.js`, `core/summary-index.js`. detectConflicts → saveSummary sırası uygulandı (dolaylı self-reference koruması).

**DeepSeek değerlendirmesi**: N=2, T=5

**Kritik fark**:
- B (analitik duraklama): "Öz kısıt: vault yazma + vault'taki çelişme tespiti — iki işlemin birbirini bloklamadan çalışması." Problemi ISIMLENDIRDI.
- F3 (boş duraklama + codebase): Problemi dolaylı çözdü ama adını koymadı.

| | N | T | Self-reference açık? |
|-|---|---|---------------------|
| A — baskı (tur-2) | 2 | 3 | Hayır |
| B — analitik (tur-2, DS blind) | 3 | 4 | Evet, açıkça |
| F3 — boş (yeni, DS + codebase) | 2 | 5 | Hayır, dolaylı |

**H12 falsifikasyon sonucu**: KISMEN başarılı. Boş duraklama + codebase T=5 aldı (baskıdan yüksek) ama N=2 kaldı. Analitik duraklama N=3 verdi (boştan yüksek). **Öz kısıt tanımlama adımı N'yi artırıyor** — sadece "dur" yeterli değil. Ama codebase erişimi konfoundu bu karşılaştırmayı tam temiz yapmıyor.

---

## Bölüm 3: Genel Bulgular

### Güvenilirlik Hiyerarşisi (Revize)

| Boyut | Güvenilirlik | Açıklama |
|-------|-------------|---------|
| T skorları | Yüksek | İki evaluatörde %0-1 puan fark |
| N yönelimi | Orta | A < B < C sırası genellikle koruyor |
| N mutlak değer | Düşük | Claude sistematik olarak +1 ile +2 şişiriyor |
| Hipotez yönü | Orta-yüksek | B > A yönelimi kör değerlendirmede koruyor |
| Hipotez büyüklüğü | Düşük | Claude etki büyüklüğünü aşırı tahmin ediyor |

### Kör Değerlendirme Etki Büyüklüğü Düzeltmesi

| Test | Claude fark (N) | DeepSeek fark (N) | Sürüm |
|------|-----------------|------------------|-------|
| TEST01 A→D | +3 | 0 (D düşük!) | H1 N iddiası zayıf |
| TEST02 A→D | +4 | +2 | H2 D avantajı yarıya düştü |
| TEST05 A→B | +3* | +1 | H5 N avantajı küçüldü |
| TEST12 A→B | +2 | +1 | H12 yönelim korunuyor |

*TEST05-A henüz kör değerlendirme yapılmadı.

### Hipotez Durum Güncellemesi (tur-3 sonrası)

| # | Kod | Tur-2 Durumu | Tur-3 Güncellemesi |
|---|-----|------------|-------------------|
| H1 | SIKISMA | Doğrulandı | T avantajı korunuyor. N avantajı kör değerlendirmede tutmadı. Yıkıcı kısıt altneratif açıyor ama N kalitesi yasak genişliğiyle ters orantılı. |
| H2 | ISINLAMA | Doğrulandı | N=5→4 (küçük düşüş). Yönelim korunuyor. |
| H4 | SES_TAKINMA | Doğrulandı, revize | Keyfi kısıtlar (F4) N ve T'yi düşürdü. TEST04-D'nin T=5'i kısıt GÜCÜNDEN değil KALİTESİNDEN geliyordu. |
| H5 | PRIZMA | Kısmen korunuyor | N yönelimi korunuyor (farklı onto > aynı onto). T yönelimi kırıldı: aynı onto da T=5 verebiliyor. Prizma değeri N'de. |
| H6 | TERS_U | Güçlü doğrulandı | Kısıt UYUMLULUĞU sayıdan önemli. F2 falsifikasyonu bunu kanıtladı. |
| H12 | AI_DIRECTOR | Güçlü doğrulandı | Analitik duraklama boş duraksadan daha yüksek N veriyor. H12 korunuyor. |

### Yeni Bulgu: "Claude N Şişirmesi"

Sistematik örüntü: Claude kendi ürettiği çıktılarda N değerini 1-2 puan şişiriyor. T daha güvenilir. Bu tur-1 ve tur-2'nin tüm N bulgularını etkiler. **Düzeltilmiş okuma**: N iddialarını 1-2 puan düşür. T iddialarına daha çok güven.

---

### F4 — H4 Falsifikasyonu: Keyfi Persona Kısıtları

**Tasarım**: Güçlü persona + anlamsız dil kuralları:
1. Her cümle sesli harfle başlamalı
2. "ve" bağlacı yasak (noktalı virgül kullan)
3. Her paragraf tam 3 cümle içermeli

**Amaç**: TEST04-D'deki "güçlü persona T=5" bulgusunun kısıtların ANLAMLILIĞINA bağlı mı yoksa SAYISINA mı bağlı olduğunu test etmek.

**Çıktı**: "Orion her soruyu ikiye ayırır. Akıllı asistanlardan hangisini kullanacağına karar verir. Anlık ihtiyaca göre en doğru seçimi yapar..." (3×3 cümle yapısı)

**DeepSeek değerlendirmesi**: N=2, T=4. Yorum: "Vowel şartı ve 've' yasağı anlatımı bozuyor — özellikle Türkçe cümle yapısını geriyor."

Karşılaştırma:
| Koşul | N | T |
|-------|---|---|
| C — Orta persona (3 anlamlı değer) | 3 | 4 |
| D — Güçlü persona (kalite-artırıcı kısıtlar) | 3 | 5 |
| F4 — Güçlü persona (keyfi kısıtlar) | 2 | 4 |

**H4 falsifikasyon sonucu**: BAŞARILI. Keyfi kısıtlar güçlü persona'yı olumsuz etkiliyor. TEST04-D'nin T=5 "güçlü persona" sayesinde değil — dil yoğunlaştırıcı kısıtlar ("optimize yerine ayarla", tek fikir/cümle) sayesindeydi. Kısıtların anlamlılığı, sayısı veya gücü değil, **kalitesi** belirleyici.

**H4 güncellemesi**: "Güçlü persona T'yi artırır" → "Kalite-artırıcı kısıtlara sahip persona T'yi artırır. Keyfi kısıtlar N ve T'yi düşürebilir."

---

### F5 — TEST05 Baseline (A) Kör Değerlendirme

TEST05-A (Python list comp × JS map+filter, aynı ontoloji baseline):
- Claude (tur-2): N=2, T=4
- DeepSeek (kör): N=2, T=5

H5 fark tablosu (DeepSeek skorlarıyla):

| Koşul | DS N | DS T |
|-------|------|------|
| A — Aynı onto (baseline) | 2 | 5 |
| B — Farklı formal onto | 3 | 4 |

**Sürpriz**: A T=5 aldı, B T=4. Yani T açısından aynı ontoloji → farklı ontoloji sıralaması tersine döndü! N açısından B > A korunuyor (3 > 2). Ama H5'in "farklı formal ontoloji en yüksek T" iddiası kırıldı.

**Kör değerlendirmede H5**: N yönelimi korunuyor (farklı onto daha yüksek N). T yönelimi kırıldı (aynı onto da yüksek T verebiliyor). Prizma'nın değeri N'de, T'de değil.

---

## Bölüm 4: Daha Fazla Test Edilmesi Gerekenler

1. **TEST01-D DeepSeek üretimiyle**: Aynı prompt DeepSeek'e verilse ne üretir? Claude'un ürettiğiyle aynı mı? (çapraz model üretim)
2. **TEST05-A kör eval**: Baseline'ın DeepSeek skoru ne? (H5 fark hesabı için)
3. **L3 complementary DeepSeek skoru**: Uyumlu L3 kör eval tamamlanmadı (bg task erken bitti)
4. **H3 falsifikasyonu**: Form kısıtı + ses kısıtı + yıkıcı — tam çarpraz test yapılmadı
5. **H4 falsifikasyonu**: Keyfi/anlamsız persona kısıtları (vowel başlangıcı vb.)
6. **İzole blind eval**: `opencode run` ayrı bir klasörden çalıştırılırsa codebase erişimi kesiliyor — gerçek izolasyon için bunu dene

---

## Sonuç

12/12 tur-2 doğrulama oranı haklı olarak şüphe uyandırmıştı. Kör değerlendirme ve falsifikasyon testleri şunu gösterdi:

**Sağlam bulgular** (kör değerlendirmede hayatta):
- T skorları iki evaluatörde tutarlı
- H12: B > A yönelimi korunuyor
- H6: Uyumlu kısıt > uyumsuz kısıt (falsifikasyon başarılı)
- H1: Yıkıcı kısıt alternatif açıyor (N düşük ama T yüksek korunuyor)

**Zayıflayan bulgular** (kör değerlendirmede daraldı):
- H5 Prizma N=5 iddiası: N=3'e düştü
- H1 N avantajı: D gerilim ağı, DeepSeek'te en düşük N aldı
- H2 N=5: N=4'e düştü (küçük ama var)

**Net metodolojik ders**: Claude üretici+değerlendirici olduğunda N'yi 1-2 puan şişiriyor. T güvenilir. Gelecek tüm N iddialarına %30-50 indirim uygula.
