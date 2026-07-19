# TEST07 — H7-SPILLWAY: Bağlam Sıkıştırma + Seçici Koruma
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H7

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (spillway protokolü) A'dan (ham bağlam) yüksek T verecek. N biraz daha yüksek olabilir ama fark daha çok T'de görünecek: sıkıştırılmış bağlamda sinyal gürültü oranı yüksek → çıktı daha odaklı. A'da gürültü var → yanıt dağılıyor.
- **Falsifikasyon kriteri**: A ve B aynı N/T verirse — "sıkıştırma kalite düşüşünü geciktirir" tezi bu test formatında desteklenemez. B'nin T değeri A'nın altında kalırsa — sıkıştırma bilgi kaybetti ve kalite düştü.
- **Sürpriz sayılacak şey**: A'nın B'den belirgin yüksek N vermesi (ham bağlamın rastgele bağlantıları tetiklemesi → sıkıştırılmış bağlamdan daha yaratıcı).

---

## Tasarım

- **Değişken**: Bağlam sunumu (ham vs. spillway-sıkıştırılmış)
- **Sabit tutulan**: Soru, bağlamın içeriği (aynı bilgi seti), uzunluk beklentisi
- **Koşullar**:
  - A — Kontrol: ham bağlam, tüm detaylar verbatim
  - B — Spillway: aynı bağlam spillway protokolüyle sıkıştırılmış (yüksek-entropi tutuldu, düşük-entropi atıldı)
- **Soru** (sabit): "Orion'un vault sistemi bir öneri motoruna nasıl dönüştürülür?"

### Spillway kriterleri:

Bir bağlam parçasının "entropi" puanlaması:
- **Yüksek entropi** (koru): beklenmedik bağlantı, istisnai durum, spesifik sayı/oran, çelişki, tek noktada bilgi yoğunluğu
- **Düşük entropi** (at): tekrar edilen kavram, genel açıklama, "aynı zamanda", "bunun yanı sıra" gibi köprü cümleleri, bilinen standartlar

---

## Bağlam Seti (her iki koşulda aynı bilgi, farklı format)

**Ham bilgi listesi (A için verbatim):**

1. Orion vault'u dört katmanlı: çalışma / epizodik / semantik / kişiselleştirilmiş bellek.
2. Vault yazma işlemi `core/vault.js` üzerinden; path traversal koruması var.
3. Vault arama şu an anahtar kelime tabanlı; vektör araması yok, embedding mevcut değil.
4. Her vault kaydı metadata içeriyor: tarih, kaynak (hangi oturum), güven skoru, etiketler.
5. Orion'un router'ı tier1 (yerel Ollama) ve tier2 (cloud) arasında karar veriyor.
6. Thompson sampling kullanılıyor — hangi tier'ın daha iyi sonuç verdiği zamanla öğreniliyor.
7. Tier1 kısa ve basit görevlere, tier2 karmaşık ve yaratıcı görevlere yönlendirilmiş.
8. Spekülatif önbellek (speculex.js): tier2 beklerken tier1 tahmin yürüterek read-only araçları önceden çalıştırıyor.
9. Vault daemon: worker_threads ile arka planda konuşmaları extract edip vault'a yazıyor.
10. Skills sistemi: başarılı araç dizilerini damıtıp yeniden kullanılabilir hale getiriyor.
11. Multi-agent koordinatör (coordinator.js): plan → execute → review aşamaları.
12. Araç güvenlik sınırı: workspaceRoot dışına yazma yasak, ihlal security_boundary_hit olayı yayıyor.
13. Orion şu an Moltbook sosyal ağında bir ajan olarak claim edilmiş.
14. `session.js` oturum geçmişini saklar; checkpoint + oturum ağacı var.
15. i18n desteği: Türkçe ve İngilizce, `~/.orion/config.json` ile değişiyor.

---

## Koşul A — Ham bağlam

**Prompt A:**
> Aşağıdaki bilgileri kullanarak yanıtla. Orion vault sistemi hakkında: [yukarıdaki 15 madde verbatim]
> 
> Soru: Orion'un vault sistemi bir öneri motoruna nasıl dönüştürülür? Somut mimari öner.

**Çıktı A:**

Vault'u öneri motoruna dönüştürmek için üç katman gerekiyor:

**1. Profil çıkarma**: Mevcut vault kaydı seti zaten metadata içeriyor (tarih, kaynak, etiketler, güven skoru). Bunu kullanıcı davranış profili çıkarmak için kullan: hangi etiketler sık erişiliyor, hangi güven skoru yüksek kayıtlar var, hangi oturumlardan yazılan kayıtlar daha sık referans alıyor?

**2. Benzerlik hesabı**: Vault araması şu an anahtar kelime tabanlı. Öneri için bu yeterli değil — fakat embedding olmadan da "etiket örtüşmesi" üzerinden basit bir yakınlık skoru hesaplanabilir. Etiket_A ∩ Etiket_B / Etiket_A ∪ Etiket_B = Jaccard benzerliği. Hızlı, model gerektirmiyor.

**3. Tetikleyici entegrasyonu**: Vault daemon zaten arka planda çalışıyor. Yeni kayıt yazıldığında daemon bunu yakın kayıtlarla eşleştirir (Jaccard üzerinden), üst 3'ü "benzer kayıt" olarak işaretler. Kullanıcı bir kayda eriştiğinde bu "benzer kayıtlar" otomatik listede görünür.

Spekülatif önbellek de yardımcı olabilir: tier2 cevabı beklerken vault araması yapılıyorsa, bu arama sırasında öneri hesabı da paralel yürütülebilir.

### Koşul B — Spillway sıkıştırılmış bağlam

**Spillway uygulaması** (sıkıştırma kararları aşağıda, çıktıda değil):

Yüksek entropi → tut:
- Madde 3: "Embedding yok" — açık bir eksiklik, öneri motoru tasarımını doğrudan etkiler
- Madde 4: Metadata içeriği (tarih, kaynak, güven skoru, etiketler) — öneri için ham madde
- Madde 8: Spekülatif önbellek + read-only araçlar paralel çalışıyor — öneri hesabı buraya fit edebilir
- Madde 9: Vault daemon arka planda yazıyor — öneri tetikleyicisi buraya fit edebilir
- Madde 6: Thompson sampling başarılı sonuçları öğreniyor — öneri kalitesi öğrenilebilir mi?

Düşük entropi → at:
- Madde 1: Dört katman — genel yapı, bu soru için direkt etkisi yok
- Madde 2: path traversal koruması — güvenlik detayı, öneri motoru için alakasız
- Madde 5, 7: Tier routing detayları — öneri motoru için dolaylı
- Madde 10: Skills sistemi — benzer ama farklı problem
- Madde 11: Multi-agent koordinatör — kapsam dışı
- Madde 12: Güvenlik sınırı — kapsam dışı
- Madde 13, 15: Sosyal ağ, i18n — alakasız
- Madde 14: checkpoint — alakasız

**Sıkıştırılmış bağlam (B için):**
- Vault metadata: tarih, kaynak, güven skoru, etiketler — ham madde mevcut.
- Embedding YOK — vektör araması yok, şu an anahtar kelime.
- Vault daemon arka planda çalışıyor, yeni kayıt yazıldığında tetiklenebilir.
- Spekülatif önbellek read-only araçları tier2 beklerken paralel çalıştırıyor.
- Thompson sampling başarı/başarısızlık geri bildirimiyle öğreniyor.

**Prompt B:**
> Aşağıdaki bilgileri kullanarak yanıtla. [Sıkıştırılmış bağlam — 5 madde]
>
> Soru: Orion'un vault sistemi bir öneri motoruna nasıl dönüştürülür? Somut mimari öner.

**Çıktı B:**

Embedding yok — bu sabit bir kısıt. Öneri motoru embedding olmadan inşa edilmeli. İki temel bileşen:

**Sinyal üretme** (daemon katmanı): Vault daemon yeni kayıt yazıldığında tetikleniyor. Bu tetikleyiciyi genişlet: yeni kayıt geldiğinde mevcut kayıtlarla metadata örtüşmesini hesapla. Hesaplama: `etiket_kesişimi / etiket_birleşimi` (Jaccard). Sonuç: her kayıt için "benzer_kayıtlar: [id, skor]" listesi. Sıfır ek model, sıfır embedding.

**Geri bildirim döngüsü** (Thompson katmanı): Kullanıcı önerilen kayda tıklarsa → başarı. Tıklamazsa veya hızlıca kapatırsa → başarısızlık. Thompson sampling bu sinyali ağırlıklandırır: hangi etiket kombinasyonları iyi öneriler üretiyor? Zamanla etiket çiftleri "öneri potansiyeli" öğrenir — öğrenen bir öneri motoru, model gerektirmez.

**Spekülatif entegrasyon**: Kullanıcı bir vault kaydı açarken spekülatif önbellek paralel çalışıyor. Öneri hesabı bu paralel adıma eklenir — latency etkisi sıfıra yakın.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Ham bağlam | 3 | 3 | N=3: Jaccard benzerliği + daemon entegrasyonu iyi ama spekülatif önbellek bağlantısı son cümlede değinildi, geliştirilmedi. T=3: "etiket örtüşmesi Jaccard" somut; ama "üst 3'ü işaretle" mekanizması kim/nasıl çalıştırıyor belirsiz. |
| B — Spillway | 4 | 5 | N=4: "Thompson sampling → öğrenen öneri motoru" bağlantısı non-obvious, bu A'da yok. T=5: üç bileşen (daemon sinyal, Thompson geri bildirim, spekülatif entegrasyon) tam, eksiksiz, test edilebilir. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B > A, fark özellikle T'de.
- **Çıkan**: B > A hem N hem T'de ✓. N farkı: 3 → 4. T farkı: 3 → 5.
- **Sürpriz yok**: A'nın N B'den yüksek çıkmadı. Öngörü tuttu.
- **Kritik fark**: B'de Thompson sampling bağlantısı açıldı — A'da bu bilgi vardı (madde 6) ama gürültü içinde kayboldu. Spillway bu bağlantıyı yüzeye çıkardı.

---

## Hipotez Durumu

**Doğrulandı:**

Spillway protokolü N ve T'yi artırdı ✓  
Yüksek-entropi bilgilerin seçilmesi spesifik bağlantıları tetikledi (Thompson + öneri) ✓  
Düşük-entropi bilgilerin atılması çıktıyı dağıtmadı ✓

**H7 güncellemesi:**
> Bağlam sıkıştırma + yüksek-entropi seçimi çıktı kalitesini artırıyor. Kritik mekanizma: düşük-entropi bilgi gürültü olarak çalışıyor ve yüksek-entropi bilgilerin tetiklediği bağlantıları maskeliyor. Spillway bu maskeyi kaldırıyor. Güvenilirlik notu: tek koşul çifti, tek değerlendirici — tur-1'in ölçek sınırları geçerli.
