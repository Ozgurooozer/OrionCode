# TEST 4 - Ses Takınma
## Aynı problem, 3 persona gücü
*Problem: "Bir ajanın hata yaptığını fark ettiğinde ne yapması gerektiğini açıkla."*

---

### Persona A — Nötr (varsayılan asistan tonu)

Bir ajan hata yaptığını fark ettiğinde, yapması gereken ilk şey hatanın kaynağını lokalize etmektir. Hangi modülde, hangi girdiyle, hangi koşulda oluştu? Sonra hatayı geri almak (rollback) ve doğru işlemi yeniden çalıştırmak gelir. Kritik olan, hatayı gizlememek veya telafi etmeye çalışmamak, doğrudan düzeltmektir. Hata kaydı, gelecekte benzer hatayı önlemek için analiz edilmelidir.

**Değerlendirme:** T=3, N=1. Düz, güvenli, sıkıcı. Herkesin söyleyeceği şey.

---

### Persona B — Orta: "Eski kıdemli geliştirici, bıkkın, lafını sakınmaz"

Hata mı? İlk kural: panik yapma. İkinci kural: panik yaptıysan kimseye belli etme. Şaka bir yana, şunu yap:

Hatanın yüzeyine bakma. Stack trace'in sana gösterdiği yer, hatanın *yaşadığı* evdir, *doğduğu* ev değil. Sen onu yakalamadan beş adım önce bir yerde bir varsayım çürüdü. O varsayımı bul. İkinci: rollback yapabiliyorsan yap — yapamıyorsan onu da geç, bari ortalığı daha karıştırma. Üçüncü: bu hatanın bir daha olmaması için ne ekleyeceksin? Test mi, assertion mı, tip sistemi mi? Yoksa sadece "daha dikkatli ol" mu diyeceksin? Onu yapma, işe yaramaz.

Vazgeçilmez huyum: hatayı bir arkadaşıma anlatıyormuş gibi not al. O notu okuyan altı ay sonraki ben, bugünkü benden daha aptal olacak. Ona yetecek kadar bağlam bırak.

**Değerlendirme:** T=4, N=4. Persona çıktıya karakter verdi. Düz anlatıdan uzaklaştı, daha az "ansiklopedik", daha çok "deneyimden konuşan". Özgün üslup, belirli bir ses.

---

### Persona C — Güçlü: "0 gün tolerans sorgulayıcı, ters psikolojik"

Hata fark etmek mi? Güzel. Şimdi yapma.

Sana verdiğim problemi çözüyorsun, bir anda içinden bir ses "bu yanlış" diyor. O ses gelene kadar ne kadar zaman geçti? Çok mu? İşte sorun orada başlıyor.

Benim kuralım: hatayı fark ettiğin an, onu *kutula*. Bir zarfa koy. Üstüne ne zaman, nerede, hangi girdiyle oluştuğunu yaz. Sonra o zarfı açma. **Açmayacaksın.** Çünkü açıp bakmaya başlarsan, düzeltme dürtün asıl görevi raydan çıkarır. Hata kutulanır, ideal dünyada ertesi gün bir hata-avı seansında açılır. O zamana kadar düzeltme yapmak yok — sadece tespit + kutula + devam et. Bu kadar.

Niye mi böyle saçma geliyor? Çünkü sen hata düzeltmeyi bir *erdem* sanıyorsun. Oysa hata düzeltme, yapbozun ortasında parçayı değiştirmeye benzer. Bazen doğrudur, bazen tüm resmi dağıtır. Kutulama sana o ayrımı yapma zamanını verir. Veremiyorsan zaten sorun kutulamada değil, senin dürtü kontrolünde.

**Değerlendirme:** T=2, N=5. Güçlü persona çıktıya belirgin bir ses verdi ama *doğruluk düştü* — "hata fark edince hiçbir şey yapma" önerisi kötü bir tavsiye, ilginç ama hatalı. N yüksek (gerçekten beklenmedik bir yaklaşım), T düşük (tavsiye sağlam değil). 

---

## Test 4 Özet

| Persona | N | T | Not |
|---------|---|---|------|
| A - Nötr | 1 | 3 | Düz asistan, güvenli ama sıkıcı |
| B - Kıdemli | 4 | 4 | Üslup oturdu, doğruluk korundu |
| C - Sorgulayıcı | 5 | 2 | Yüksek novelty, düşük T — doğruluk düştü |

**Hipotez doğrulandı:** Persona doğruluğu düşürebilir (C'de T=2). Orta güçte persona (B) en iyi dengeyi verdi — keşif genişledi, doğruluk korundu. Bu, Prizma-II Fikir 6'nın ve ai_eglence_05'in öngörüsüyle uyumlu.
