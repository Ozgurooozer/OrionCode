# Hipotezler
*prototipdocs Tur 2 — 2026-07-17*

Tur 1'den öğrenilen bulgulara dayanarak revize edilmiş + TEST_DISI_KALANLAR'dan seçilen yeni hipotezler.

---

## Tur 1 Hipotezleri (revize ifadelerle)

| # | Kod | Revize ifade | Değişken | Tur-1 sonucu |
|---|-----|--------------|----------|--------------|
| H1 | SIKISMA | Anlamsal gerilim ağı → klik. Kısıt sayısı değil türü belirleyici. | Kısıt tipi (yıkıcı / yapıcı / gerilim) | ✓ doğrulandı, düzeltildi |
| H2 | ISINLAMA | Ters-U sadece ontoloji sınırında. Aynı formal dilde mesafe bağımsız çalışıyor. | Mesafe + ontoloji ayrımı | ✓ doğrulandı, incelti |
| H3 | MADDI_DIL | Yapıcı kısıt yeni form üretir, yıkıcı anlam bozar. Kısıt türü yoğunluktan belirleyici. | Kısıt türü | ✓ kısmen doğrulandı |
| H4 | SES_TAKINMA | Persona = keşif politikası, yetenek değil. Orta güç dengeli. Süreklilik kırılgan: her cümlede reset → çöküş. | Persona gücü + süreklilik | ✓ doğrulandı |
| H5 | PRIZMA | "A garantiler, B umar" → özgün nakil. Aynı ontoloji = totoloji, uydurma = anlamsız. Ters yön çalışıyor, duygusal×formal da çalışıyor. | Alan çifti | ✓ doğrulandı |
| H6 | TERS_U | Kısıt/sıcaklık/baskı yoğunluğu → N×T ortada tepe yapar. Aşırı kaos N'yi de öldürür. | Yoğunluk seviyesi | ✓ doğrulandı (7 seviye) |

---

## Tur 2 Hipotezleri (yeni, TEST_DISI_KALANLAR'dan)

Bunlar daha önce denenmedi; kaynak belgede diyalogla test edilebilir olarak işaretlendi.

| # | Kod | İfade | Kaynak | Değişken |
|---|-----|-------|--------|----------|
| H7 | SPILLWAY | Bağlam kapasitesi dolmadan önce yapılan sıkıştırma + yüksek-entropi parçaları koruma operasyonu kalite düşüşünü geciktirir. Hiç yapılmamasına göre farklı çıktı üretir. | Prizma-I F3 | Sıkıştırma / serbest bırakma zamanlaması |
| H8 | ESCAPEMENT | Görev baskısından bağımsız sabit adım ritmi (her N kelime bir duraklama) çıktı tutarlılığını artırır. Serbest ritme göre daha düşük varyans. | Prizma-I F5 | Sabit ritim / serbest ritim |
| H9 | CLOSED_PALETTE | Karakter için önceden tanımlı dar bir değer kümesi ("palet") personanın oturum boyu tutarlılığını artırır. Geniş paletten daha az kayma. | Prizma-I F4 | Palet genişliği |
| H10 | DREAM_CYCLE | Bir fikrin "perturbe edilmiş replay"i (boz + yeniden oynat) sadık kopyalamadan farklı, yeni yapı üretir. | Prizma-I F8 | Replay modu (sadık / perturbe) |
| H11 | BARK_AUDIT | Uzun açıklama yerine minimum sinyal (tek bir yapısal öge) yeterince "iletişim izlenimi" yaratır ve daha az gürültü taşır. | Prizma-III F5 | Sinyal yoğunluğu |
| H12 | AI_DIRECTOR | Sürekli yüksek baskı altında çıktı kalitesi düşer; planlanmış bir "rahatlatma anı" sonrasında kalite yükselir. | Prizma-III F4 | Baskı + rahatlatma ritmi |

---

## Sınırlama notu

H7-H12 içsel (conversation) değişkenler üzerinde test ediliyor. Altyapı gereken hipotezler (GOAP, e-graph, gerçek compiler loop) bu turda dışarıda bırakıldı — TEST_DISI_KALANLAR'daki "altyapı gerekli" kategorisi.
