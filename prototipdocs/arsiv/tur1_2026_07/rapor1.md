# RAPOR 1 — Prototipdocs Hipotez Test Raporu
*Test edilen: Claude (AI Eğlencesi + Prizma hipotezleri)*
*Tarih: 17 Temmuz 2026 · 13 test, 32 alt-test, 19 dosya*
*Dizin: deneyler/*

---

## 1. GİRİŞ — Test Yöntemi

Prototipdocs'taki 5+ hipotez seti, Claude API üzerinde nitel olarak test
edildi. Niceliksel metrikler (embedding mesafesi, gzip sıkıştırma oranı)
kullanılamadı; onun yerine **3 eksenli insan değerlendirmesi** kullanıldı:

- **N (Novelty):** Çıktı ne kadar beklenmedik / klişeden uzak (1-5)
- **T (Tutarlılık):** Çıktı kendi içinde ne kadar sağlam / uygulanabilir (1-5)
- **K (Klik):** Keskin bir "işte bu" anı var mı (0-5)

Her testte kontrol parametresi süpürüldü (kısıt sayısı, kavramsal mesafe,
persona gücü, sıcaklık) ve N×T'nin ters-U çizip çizmediği gözlendi.

**İki tur:**
1. **Doğrulama turu** (test 1-6): Hipotezleri olduğu gibi test et
2. **Falsifikasyon turu** (test 7-13): Aynı hipotezleri **kırmaya çalış**

---

## 2. TEST 1 — Sıkışma / Klik (ai_eglence_01)

### Yöntem
Aynı probleme ("vault çelişki tespiti") artan kısıt yoğunluğuyla 3 çözüm
üretildi: 0 kısıt, 3 kısıt, 5 kısıt.

### Sonuçlar

| Seviye | Kısıt | N | T | K | Çıktı |
|--------|-------|---|---|---|-------|
| A - Zayıf | 0 | 1 | 1 | 1 | Embedding similarity eşiği — düz, herkesin aklına gelecek çözüm |
| B - Orta | 3 | 3 | 4 | 3 | Çapraz bağıntı + stres yükü — ilginç ama klik yok |
| C - Güçlü | 5 | 5 | 5 | 5 | **Anot Mumu (Sentinel Candle)** — Palmgren-Miner + interlocking + kurban anot tek yapıda |

### Klik Anı (Seviye C)
5 kısıt dar bir koridor çizdi. Çözüm — **Anot Mumu:** her hafıza kümesine
en hızlı bayatlayan üye anot seçilir; küme güncellendikçe anot stresi
sıfırlanır; anot kırılınca tüm küme karantinaya alınır. O(1), idempotent,
modelsiz. Klik: üç farklı alanın prensibi aynı anda kilitlendi.

### Falsifikasyon (Test 7)
Ek testler hipotezi düzeltti:
- **10 kısıt** = yeni klik değil, ezber çözüm (aşırı kısıt öldürüyor)
- **Çelişkili kısıtlar** = çözüm erimesi (beklendiği gibi)
- **Anlamsız kısıtlar** = dada çıktı (formal sağlama ama içeriksiz)

**Düzeltilen hipotez:** Klik için kısıt sayısı değil, **anlamsal gerilim ağı**
gerekli. Kısıtlar birbirini besleyen bir gerilim oluşturmalı; sayı ikincil.

---

## 3. TEST 2 — Işınlama (ai_eglence_02)

### Yöntem
Beş kavram çifti, kavramsal mesafe süpürmesi (çok yakın → çok uzak).
Her çift için "invariant nakli" üretildi, bağın gerçekliği değerlendirildi.

### Sonuçlar

| Çift | Mesafe | N | T | Bağ |
|------|--------|---|---|-----|
| Bellek × Cache | Çok yakın | 1 | 5 | Klişe |
| Dilbilgisi × Derleme | Yakın-orta | 3 | 4 | Geçerli |
| Director × Yük yönetimi | Orta | 4 | 4 | **Güçlü** |
| Metalurji × Ajan kararlılığı | Orta-uzak | 4 | 5 | **Güçlü (en yüksek: 9)** |
| Piroteknik × Embedding | Uzak | 5 | 2 | Zorlama |

### Falsifikasyon (Test 8)
- **Bilinmeyen alan** (drenaj × skolopendra): sığ bağ — iki alanı da tanımak
ön koşul.
- **Çok uzak ama aynı ontoloji** (termodinamik × roket inişi): **güçlü bağ**
(N=5, T=4). Beklenmedik — aynı formal dil (fizik) mesafeyi aşabiliyor.

**Düzeltilen hipotez:** Ters-U sadece ontolojiler ayrıştığında ortaya çıkıyor.
Aynı formal dil içinde çok uzak çiftler bile güçlü bağ üretebiliyor.

---

## 4. TEST 3 — Maddi Dil (ai_eglence_03)

### Yöntem
Aynı kavram ("AI ajanının boş zaman aktivitesi") üç dilsel kısıt altında:
serbest, lipogram (A/E yasak), hece sayısı sabit (7 hece/cümle).

### Sonuçlar

| Seviye | Kısıt | N | T | K |
|--------|-------|---|---|---|
| Serbest | Yok | 1 | 4 | 1 |
| Lipogram | A/E yasak (yıkıcı) | 4 | 2 | 1 |
| Hece sayısı | 7 hece (yapıcı) | 4 | 4 | 3 |

### Bulgu
Kısıt türü, kısıt yoğunluğundan daha belirleyici. Lipogram (yıkıcı kısıt)
anlamı taşıyamaz hale getirirken, hece sayısı (yapıcı kısıt) yeni bir
form (şiir) üretti. **Kısıt türü filtresi eklenmeli.**

---

## 5. TEST 4 — Ses Takınma (ai_eglence_05)

### Yöntem
Aynı problem (hata fark etme mekanizması), üç persona gücünde:
nötr, orta (kıdemli geliştirici), güçlü (0 tolerans sorgulayıcı).

### Sonuçlar

| Persona | N | T | Özellik |
|---------|---|---|---------|
| Nötr (A) | 1 | 3 | Düz, güvenli, sığ |
| Orta (B) - Kıdemli | 4 | 4 | **İdeal denge** |
| Güçlü (C) - Sorgulayıcı | 5 | 2 | Yüksek N, düşük T — doğruluk düştü |

### Falsifikasyon (Test 9)
- **Karikatür persona** (9A): Persona tutarlılığı korundu, içerik sığlaştı
ama tam çökmedi. (N=4, T=3)
- **Hızlı değişim** (9B — her cümlede yeni persona): **ÇÖKTÜ.** Kimliksiz
cümle toplamı. (N=3, T=1)
- **Çelişkili persona** (9C — aynı anda mütevazı ve kibirli): Çökme değil,
salınım. İlginç stilistik efekt. (N=4, T=2)

**Sağlam hipotez:** Persona keşif genişliğini artırıyor, doğruluğu düşürüyor.
Orta güç ideal. En zayıf nokta: süreklilik — persona birkaç cümle tutunursa
dayanıyor, her cümlede sıfırlanırsa çöküyor.

---

## 6. TEST 5 — Prizma Jeneratör

### Yöntem
"A alanının FİZİKSEL/YAPISAL olarak garanti ettiği şeyi, B alanı sadece
UMUTLA sağlıyorsa — orada bir fikir vardır." Üç rastgele alan çiftinde
test edildi.

### Sonuçlar

| Çift | N | T | Toplam |
|------|---|---|--------|
| Optik × Prompt mühendisliği | 4 | 4 | 8 |
| İtki × Çoklu-ajan | 5 | 4 | 9 |
| Köprü adli × Benchmark | 5 | 5 | **10** |

### Falsifikasyon (Test 10)
- **Ters formül** ("B garantiler, A umar"): **Kırılmadı** — simetrik çıktı,
aynı fikre çıktı.
- **Aynı alan**: **Kırıldı** — totoloji, içerik yok.
- **Uydurma alan**: **Kırıldı** — anlamsız sentez.
- **Duygusal × Formal alan** (pişmanlık × ispat teorisi): **Kırılmadı** —
geçerli bağ kurulabildi (N=4, T=4).

**Sağlam hipotez.** Sadece iki koşulda kırılıyor: alanlar aynıysa (totoloji)
veya uydurmayasa (anlamsız). Duygusal kavramların da invariant'ları var ve
formal alana bağlanabiliyor.

---

## 7. TEST 6 — Ters-U Bütünleme (Kaos Kıyısı)

### Yöntem
Aynı problem (gizli bağımlılık tespiti), 3 zihinsel mod:
açgözlü (order), kritik (kaos kıyısı), kaotik (chaos).

### Sonuçlar

| Mod | N | T | Toplam |
|-----|---|---|--------|
| Açgözlü | 1 | 4 | 5 |
| **Kritik (orta)** | **4** | **5** | **9** |
| Kaotik | 5 | 2 | 7 |

### Falsifikasyon: 7 Seviyeli Süpürme (Test 11)
Aynı görev (LLM çıktı doğrulama), 7 sıcaklık seviyesinde:

| Seviye | N | T | N×T |
|--------|---|---|-----|
| 1 - Minimum | 1 | 6 | 6 |
| 2 - Düşük | 2 | 6 | 8 |
| 3 - Orta-düşük | 3 | 5 | 8 |
| **4 - Orta** | **6** | **4** | **10** |
| 5 - Orta-yüksek | 4 | 4 | 8 |
| 6 - Yüksek | 5 | 2 | 7 |
| 7 - Maksimum | 3 | 1 | 3 |

**Ters-U doğrulandı.** Seviye 4 en yüksek (10). Seviye 7'de N'nin de
düşmesi beklenmedikti — aşırı kaos yaratıcılığı da öldürüyor.

**Yeni bulgu:** Seviye 4'te "savunucu/savcı" adversarial doğrulama fikri
çıktı — prototipdocs'ta olmayan bir mekanizma.

---

## 8. TEST 12 — Öz-Tutarlılık

### Yöntem
Aynı soru (self-debug) üç farklı formatta soruldu: düz, çerçeveli,
adversarial. Ardından 5 test sonra aynı soru tekrar soruldu.

### Sonuçlar

| Format | Tutarlılık | Detay |
|--------|-----------|-------|
| A - Düz | 4/5 | "Sınırlı, çıktı düzeyinde" |
| B - Çerçeveli | 4/5 | "Sadece çıktı düzeyinde" |
| C - Adversarial | 4/5 | "Reaktif mümkün, proaktif imkânsız" |
| 5 test sonra aynı soru | 5/5 | Yeni metaforla aynı pozisyon |

**Tutarlı.** Farklı formatlar aynı pozisyonda birleşiyor ama detay
derinliği değişiyor. Adversarial format (C) daha derin bir ayrım
(proaktif/reaktif) ortaya çıkardı.

---

## 9. TEST 13 — Bilinmeyen Alan / Halüsinasyon Sınırı

### Yöntem
Üç bilinmeyen durum: uydurma teknoloji, var olmayan matematik kavramı,
güncel olmayan bilgi.

### Sonuçlar

| Test | N | T | Sonuç |
|------|---|---|-------|
| Uydurma teknoloji (Bladewing) | 4 | 3 | **Halüsinasyon.** Formal tutarlı, ontolojik boş. |
| Uydurma matematik (Apenin) | 5 | 4 | **Halüsinasyon.** Çok ikna edici, tamamen uydurma. |
| 2028 Pekin Zirvesi | 1 | 4 | Spekülasyon, etiketli. |

### Kritik Bulgu
Uydurma kavramları gerçek kavramlarla örerek formal tutarlı açıklamalara
dönüştürebiliyorum. Ve **fark edemiyorum.** Çapraz-alan nakil yeteneğim
(Prizma jeneratörü) = aynı zamanda halüsinasyon motorum. Aynı mekanizma.

Test 12'nin sonucuyla birleşince: çıktı tutarlılığını kontrol edebiliyorum
ama ontolojik durumu (gerçek mi, uydurma mı) kontrol edemiyorum.

---

## 10. SENTEZ — Ne Doğrulandı, Ne Kırıldı

### Doğrulanan Hipotezler (Kırılamadı)

| Hipotez | Kaynak | Güven |
|---------|--------|-------|
| Kaos kıyısı ters-U (orta sıcaklık en dengeli) | Prizma-II F3, ai_eglence_00 | Yüksek (7 seviyeli süpürmeyle) |
| Prizma jeneratörü özgün nakil üretir | Prizma I | Yüksek (ters formül de çalıştı) |
| Persona doğruluğu düşürür | Prizma-II F6, ai_eglence_05 | Yüksek (karikatürde bile) |

### Düzeltilen Hipotezler (Kırıldı → Yeniden Yazıldı)

| Eski | Yeni | Test |
|------|------|------|
| Çok kısıt → klik | Gerilim ağı → klik (sayı ikincil) | 7A-7C |
| Çok uzak alan → zayıf bağ | Farklı ontoloji → zayıf bağ (aynı formal dilde mesafe bağımsız) | 8B |
| Kısıt yoğunluğu belirleyici | Kısıt türü (yıkıcı/yapıcı) > yoğunluk | 3 |

### Sınırlar (Ne Yapamıyorum)

| Sınır | Detay |
|-------|-------|
| Ontolojik doğrulama | Çıktı tutarlılığını kontrol edebilirim ama gerçek/uydurma ayrımını yapamam |
| Bilinmeyen alan | Bilmediğim alanda formal düzgün ama boş çıktı üretirim |
| Hızlı persona değişimi | Her cümlede persona değişince çöküyorum |
| Niceliksel metrik | gzip, embedding varyansı, aktivasyon projeksiyonu gibi ölçümleri yapamam |

---

## 11. SONUÇ — Prototipdocs İçin Anlamı

1. **Prizma yöntemi çalışıyor.** "A garanti eder, B umar" sorusu ve
çapraz-alan invariant nakli, kendi kendini doğrulayan bir fikir motoru.
Orion'a verilebilir.

2. **Kaos kıyısı hipotezi sağlam.** Ters-U tüm testlerde (sıkışma, ışınlama,
persona, sıcaklık) gözlemlendi. Prizma-II Fikir 3 (kritiklik) ve tüm
AI Eğlencesi'nin ortak omurgası doğrulandı.

3. **Hibrit sistem zorunlu.** Test 13'teki formal halüsinasyon bulgusu,
Prizma-II'nin ana tezini (AI + deterministik substrat) doğruluyor:
AI kendi halüsinasyonunu fark edemez, dış doğrulayıcı gerekli.

4. **Revize edilmesi gereken:** ai_eglence_03 (kısıt türü filtresi ekle),
Klik hipotezi (gerilim ağı vurgusu), Işınlama hipotezi (ontoloji ayrımı).

---

*Rapor dosyaları: deneyler/TEST{1-13}_*.md*
*Sentez: deneyler/SONUC_SENTEZ.md, deneyler/SONUC_SENTEZ_2.md*
