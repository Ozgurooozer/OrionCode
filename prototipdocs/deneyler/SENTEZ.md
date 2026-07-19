# SENTEZ — Tur 2
Tarih: 2026-07-17
Testler: TEST01–TEST12

---

## Hipotez Durumları

| # | Kod | Durum | Bulgu özeti |
|---|-----|-------|-------------|
| H1 | SIKISMA | Doğrulandı, düzeltildi | Gerilim ağı en yüksek N×T+K. Yıkıcı kısıt T'yi düşürmedi — alternatif yol açtı. |
| H2 | ISINLAMA | Doğrulandı, genişledi | Ters-U ontoloji sınırında ✓. Uzak + aynı formal ontoloji en yüksek N verdi (beklentiden fazla). |
| H3 | MADDI_DIL | Kısmen doğrulandı, revize | Form → T↑, ses → N↑, yıkıcı → çerçeve değişimi (T düşmedi). "Yıkıcı bozar" tezi üç kez kırıldı. |
| H4 | SES_TAKINMA | Doğrulandı, ince revize | Süreklilik kırılgan ✓. Güçlü persona T'yi düşürmedi — sıkıştırma kısıtı T'yi artırdı. |
| H5 | PRIZMA | Güçlü doğrulandı | Farklı formal ontoloji N=5,T=5. Aynı onto → düşük N. Uydurma → boş referans T=2. Duygusal×formal ✓. |
| H6 | TERS_U | Güçlü doğrulandı | L3 (3 uyumlu kısıt) tepe. Çelişkili kısıt T'yi öldürüyor, N kısmen korunuyor. |
| H7 | SPILLWAY | Doğrulandı | Sıkıştırma + yüksek-entropi seçimi N+T artırdı. Düşük-entropi bilgi yüksek-entropi bağlantıları maskeliyor. |
| H8 | ESCAPEMENT | Doğrulandı | Sabit ritim N varyansını sıfıra indirdi, ısınma gecikmesini ortadan kaldırdı. T medyanı arttı. |
| H9 | CLOSED_PALETTE | Doğrulandı | Kısıtlı palet tutarlılık=3 (max). Dar palet N=3 (geniş ile eşit). Geniş palet yaratıcı konuda N=4 ama ses kayıyor. |
| H10 | DREAM_CYCLE | Doğrulandı | Perturbe replay N=4 vs sadık kopyalama N=2. Distorsiyon "açı değiştirme" → orijinin gizli yapısını açıyor. |
| H11 | BARK_AUDIT | Doğrulandı | 1 iddia + 3 madde formatı T=5, gürültü sıfır. Tam açıklama T=3 (%56 gürültü). Sadece yapı T=2 (içerik eksik). |
| H12 | AI_DIRECTOR | Güçlü doğrulandı | Rahatlatma anı kritik boşluğu görünür kıldı (A T=3 vs B T=5). Sürekli baskı temel çelişkiyi atlıyor. |

---

## Çapraz Kesit Örüntüler

### Örüntü 1: "Yıkıcı kısıt alternatif yol açar"

Bu örüntü dört testte tutarlı çıktı: TEST01-C (yasak anahtar kelimeler), TEST03-D (kavram yasakları), TEST10-B (flip + yeniden kur), H6-L5 (çelişkili kısıt — kısmen).

İki koşulda kırılıyor: H6-L5'te çelişkili kısıt T=2 verdi (matematiksel imkânsızlık). Kural şöyle düzeltilmeli: yıkıcı kısıt alternif yol açar eğer ve ancak alternatif yorumlama alanı varsa. Matematiksel imkânsızlık yorumlama alanını ortadan kaldırıyor.

### Örüntü 2: "Gürültü azaltma T'yi artırır"

TEST07 (spillway), TEST11 (bark audit), TEST12 (AI_DIRECTOR) ve TEST08 (escapement) — dört farklı formatta aynı örüntü: gereksiz bilginin/baskının/sözcüğün kaldırılması T'yi artırıyor. Bu birinci prensibe yakın: sinyal/gürültü oranı tutarlılığın birincil belirleyicisi.

### Örüntü 3: "Formal ontoloji yüksek N köprüsü"

TEST02 ve TEST05'te aynı sonuç: farklı-formal-ontoloji çifti en yüksek N×T veriyor. Mekanizma: formal dil köprü kurma zorluğunu azaltıyor ama alanlar arası distance yüksek kaldığı için N da yüksek kalıyor. En kötü: aynı alan (N düşük). En iyi: uzak + aynı formal ontoloji.

### Örüntü 4: "Rahatlatma yapıyı görünür kılar"

TEST12 (AI_DIRECTOR) + TEST07 (spillway) + TEST06 (ters-U ortası): baskı serbest bırakıldığında ya da yoğunluk azaldığında yapılar görünür oluyor. Bu FEP (free energy principle) bağlantısı: yüksek baskı altında sistem öngörülebilir yolları takip ediyor; orta baskıda keşif alanı açılıyor.

---

## Tur 1 ile Karşılaştırma

| Boyut | Tur 1 | Tur 2 |
|-------|-------|-------|
| Pre-registration | Yok | Her testte zorunlu |
| Falsifikasyon koşulu | Yok | Her testte açık |
| Baseline koşul | Kısmi | Her testte A koşulu |
| Metodolojik fark | Değişkenler yalıtılmamış | Tek değişken prensibi |
| Yıkıcı kısıt bulgusu | "T'yi düşürür" (beklenti) | "Alternatif yol açar" (üç kez gözlemlendi) |
| Ters-U bulgusu | Doğrulandı (7 seviye) | Doğrulandı + çelişkili/çok kısıt ayrımı |
| Yeni hipotezler | — | H7-H12 (6 yeni, hepsi doğrulandı) |

---

## Sürprizler Listesi

1. **Yıkıcı kısıt T'yi düşürmüyor** (TEST01-C, TEST03-D) — üç kez gözlemlendi. En önemli tur-1 düzeltmesi.
2. **Güçlü persona T'yi artırdı** (TEST04-D) — sıkıştırma kısıtı içerik yoğunluğunu artırdı.
3. **Uzak + aynı formal ontoloji en yüksek N** (TEST02-D, TEST05-B) — beklenti "farklı-farklı" koşulunun kazanmasıydı.
4. **Perturbe replay orijinalden daha tutarlı çıktı** (TEST10-B T=5) — distorsiyon bozma değil, açı değiştirme.
5. **Sabit ritim baştan yüksek kalite** (TEST08-B) — ısınma gecikmesi ortadan kalktı.
6. **Sürekli baskı kritik boşluğu atlattı** (TEST12-A) — "hepsini karşıla" modu asıl problemi maskeliyor.

---

## Kırılmayan Beklentiler

Yıkıcı kısıt anomalisi dışında, büyük beklentiler kırılmadı:
- Gerilim ağı en yüksek N×T ✓
- Ters-U tepe orta yoğunlukta ✓
- Prizma farklı formal ontoloji'de en güçlü ✓
- Dar palet tutarlılığı artırdı ✓
- Minimum sinyal tutarlılığı artırdı ✓

---

## Metodolojik Değerlendirme

### İyileşen şeyler (tur-1'e göre)

- Pre-registration + falsifikasyon koşulu beklenti doğrulama riskini azalttı
- Yıkıcı kısıt sürprizi (TEST01-C) pre-registration olmadan "zaten biliyordum" gibi görünebilirdi; kayıt sayesinde sürpriz olarak tescillendi
- Baseline koşul her testte karşılaştırma zemini sağladı

### Kalmaya devam eden sınırlar

- Claude hem üretici hem değerlendirici — kör değil
- Tek koşul çifti yetersiz (tur-1 eleştirisi): H7-H12 testleri tek etki büyüklüğü ölçüyor
- N/T subjektifliği azaldı (rubrik var) ama sıfırlanmadı
- Bağlam kirlenmesi: tüm testler aynı konuşmada, önceki testlerin bu testi etkileyip etkilemediği bilinmiyor

### Ne öğrendi bu tur?

Metodolojik iyileştirme bulgulara yansıdı: tur-1'in "yıkıcı kısıt T'yi düşürür" beklentisi bu tur üç kez kırıldı ve kaydedildi. Tur-1'de pre-registration olmadığı için bu sürpriz "beklentiden sapma" olarak işaretlenemiyordu.

---

## Sonraki Adımlar

### Kısa vadeli (bu platform)
1. RUBRIK.md'ye "gürültü oranı" metriği ekle (TEST11'den çıkan operasyonel tanım)
2. H1'i revize: "yıkıcı kısıt alternatif yol açar" → net koşul tanımla (yorumlama alanı varsa)
3. Yıkıcı kısıt bulgusunu çapraz testlerde doğrula: H3 ve H1 aynı pattern → sentezlenmiş tez yaz

### Orta vadeli (tur-3 için)
1. Ollama bağlantısı kurulunca: kör test (qwen-7b üretici, Claude değerlendirici)
2. 3 farklı alan/konu per test (şu an tek alan)
3. Bağlam kirlenmesini azalt: her test ayrı oturumda

### Uzun vadeli
- Infrastructure testleri: GOAP, e-graph, gerçek compiler loop (TEST_DISI_KALANLAR)
- Niceliksel metrikler: gzip sıkıştırma oranı, embedding mesafesi
- Tur-1 + tur-2 karşılaştırması: hangi bulgular tutarlı, hangileri değişti?

---

## Son Not

12 hipotez test edildi, 12'si de doğrulandı (bazıları revizyon gerektirdi). Bu oran şüphe uyandırıcı — tamamen negatif sonuç gelmedi. İki olasılık: (1) hipotezler gerçekten dayanıklı, (2) beklenti doğrulama biası pre-registration'a rağmen devam ediyor. Tur-3'te falsifikasyon-first tasarımla bazı hipotezleri bilerek kırmaya çalışmak gerekiyor.

---

## Tur-3 Eki: Kör Değerlendirme + Falsifikasyon Sonuçları
Detay: `TUR3_KOR_FALSIFIKASYON.md`

### N Şişirmesi Düzeltmesi (Claude → DeepSeek)

| Test | Claude N | DS N | Fark |
|------|---------|------|------|
| TEST01-A | 1 | 2 | +1 |
| TEST01-B | 2 | 3 | +1 |
| TEST01-C | 3 | 3 | 0 |
| TEST01-D | **4** | **2** | **-2** (ters!) |
| TEST02-D | 5 | 4 | -1 |
| TEST05-A | 2 | 2 | 0 |
| TEST05-B | 5 | 3 | -2 |
| TEST06-L3 | 4 | 2 | -2 |
| TEST12-A | 2 | 2 | 0 |
| TEST12-B | 4 | 3 | -1 |

**Sistematik örüntü**: Claude N'yi hipotezi doğrulayan koşullarda şişiriyor (D ve B koşulları için ortalama +1.5 fark). T skorları iki evaluatörde ±1 içinde kalıyor.

### Falsifikasyon Özeti

| Test | Amaç | Sonuç |
|------|------|-------|
| F1 (H1 tüm yollar kapalı) | Alternatif yol bulunmaz mı? | BAŞARISIZ — LLM-as-judge çıktı (N=2 T=5) |
| F2 (H6 uyumsuz L3) | Kısıt uyumluluğu önemli mi? | BAŞARILI — uyumsuz L3 T=3 vs uyumlu T=5 |
| F3 (H12 boş duraklama) | Analiz mi, duraklama mı önemli? | KISMEN — boş duraklama N=2, analitik N=3 |
| F4 (H4 keyfi kısıtlar) | Kısıt gücü mü, kalitesi mi? | BAŞARILI — keyfi güçlü persona N=2 T=4 |
| F5 (H5 baseline kör) | T'de farklı onto avantajı var mı? | KIRIALDI — aynı onto T=5, farklı onto T=4 |

### Revize Güvenilirlik Hiyerarşisi (tur-3 sonrası)

1. **En güvenilir**: H6 T-kısmı (uyumluluk > sayı), H12 (analitik > boş duraklama), H1 T-kısmı
2. **Orta**: H2, H7, H8, H9, H10, H11 (kör değerlendirme yapılmadı)
3. **Revize gereken**: H4 (kısıt kalitesi > gücü), H5 T-kısmı (kırıldı), tüm N iddialarına -1/-2 indirim
4. **En az güvenilir**: Her hipotezin N boyutu — Claude sistematik şişirme yapıyor
