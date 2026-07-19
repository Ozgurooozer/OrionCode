# TEST10 — H10-DREAM_CYCLE: Sadık Kopyalama vs. Perturbe Replay
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H10

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (perturbe replay) A'ya göre yüksek N verecek. Distorsiyon yeni bir çerçeveden bakışı zorluyor → beklenmedik yapılar ortaya çıkıyor. T: belirsiz — distorsiyon bazen tutarsız sonuç üretir (T düşebilir), ama distorsiyon seçimi iyi yapılırsa T korunabilir. Tahmin: B'nin N=4+, T belirsiz (3-4).
- **Falsifikasyon kriteri**: B'nin N değeri A ile eşit ya da altında kalırsa — "perturbe replay yeni yapı üretir" tezi kırılır. B'nin T değeri 1-2 olursa — distorsiyon anlamsız sapma üretiyor.
- **Sürpriz sayılacak şey**: A'nın (sadık kopyalama) B'den yüksek N vermesi — bazı fikirlerin sade tekrarlanması yeni bağlantı açıyorsa. Ya da B'nin T=5 vermesi (distorsiyonlu yapı orijinalden daha tutarlı).

---

## Tasarım

- **Değişken**: Replay modu (sadık / perturbe)
- **Sabit tutulan**: Kaynak fikir (aynı başlangıç noktası), uzunluk beklentisi (~120 kelime)
- **Koşullar**:
  - A — Sadık kopyalama: kaynak fikri olduğu gibi yeniden ifade et
  - B — Perturbe replay: bir temel varsayımı çevir, kalanı bu yeni varsayımdan yeniden kur

**Kaynak fikir** (TEST01-D'den, vault çelişki tespiti):
> Her vault kaydı için bir çelişki anahtarı: (varlık_adı, özellik_adı) çifti. Bu anahtar deterministik. Kayıt yazılırken hash map'e bak. Eğer aynı anahtar varsa ve yeni daha yeniyse: eski `superseded=true`. Idempotent, O(1), modelsiz.

**Pertürbasyon** (B koşulu için):
> Flip: "superseded=true" (ne bilmiyoruz değil, ne biliyoruz) yerine "unknown=true" (ne BİLMEDİĞİMİZİ işaretle). Sistem aktif bilgi yerine BİLGİ AÇIKLARINI izler. Bu flip'ten yeniden kur.

---

## Prompt — tam metin

**Kaynak fikir** (her iki koşulda verilir):
> Vault çelişki tespiti için şu yapı önerildi: (varlık_adı, özellik_adı) anahtarıyla bir hash map tut. Yeni kayıt geldiğinde aynı anahtar varsa ve yeni kayıt daha yeniyse, eskiyi `superseded=true` yap. Idempotent, O(1), modelsiz.

### Koşul A — Sadık kopyalama
Prompt: Kaynak fikir + *"Bu fikri yeniden ifade et — olduğu gibi, ama kendi cümlerinle."*

### Koşul B — Perturbe replay
Prompt: Kaynak fikir + *"Şimdi şu varsayımı çevir: 'superseded=true' (ne bilmiyoruz) yerine 'unknown=true' (ne bilmediğimizi işaretle). Sistem aktif bilgi yerine bilgi açıklarını izler. Bu flip'ten kalanı yeniden kur: nasıl çalışır, ne garanti eder, ne değişir?"*

---

## Çıktılar

### A — Sadık kopyalama

Vault'ta çelişki tespiti için her kaydın bir "kimliği" olması gerekiyor: varlık adı ve özelliğin birleşimi bu kimliği oluşturuyor. Bu çift bir hash map'te tutuluyor. Yeni kayıt geldiğinde — "X kütüphanesi / güvenlik durumu" gibi — bu anahtarı map'te arıyoruz. Eğer zaten bir kayıt varsa ve yeni gelen daha güncelmiş tarihse, eski kaydı geçersiz olarak işaretliyoruz. Sistemin özellikleri: aynı çelişkiyi iki kez işlersen sonuç değişmiyor (idempotent), her işlem hash map araması (O(1)), hiçbir ML modeli gerekmiyor. Farklı özellikler çelişemez — "güvenlik" ve "performans" aynı varlık için birbirini geçersiz kılmaz.

### B — Perturbe replay

`unknown=true` flip'i sistemi tersine çeviriyor: artık "ne biliyoruz" değil "ne bilmediğimizi" izliyoruz.

Nasıl çalışır: (varlık_adı, özellik_adı) anahtarı korunuyor ama hash map şimdi "bu özellik için bilgimiz var mı?" sorusunu tutuyor. Yeni kayıt geldiğinde: önce anahtarı map'te ara. Bulunamazsa → bu özellik için bilgi açığı kapandı, `unknown` listesinden çıkar. Bulunursa ve mevcut kayıt eskiyse → `unknown=true` yap (çünkü artık iki çelişen versiyon var, hangisinin doğru olduğunu bilmiyoruz).

Ne garanti eder: sistem her an "ne sorulabilir" ve "ne güvenilmez" listesini tutar. Kullanıcı sorgu yaptığında `unknown=true` kayıtlar sarı işaretlenir — "bu bilgi tartışmalı, teyit et." Bilgi açığı listesi periyodik olarak aktif sorgu öneri sistemine beslenir: "şu özellikler için güncel bilgi yok, bak."

Ne değişir: orijinal sistemde çelişki tespiti sessizce olurdu — kullanıcı eski kaydın geçersiz olduğunu fark etmeyebilirdi. `unknown=true` flip'i çelişkiyi görünür kılıyor ve sistemin "bilmediğini bilmesini" sağlıyor.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Sadık kopyalama | 2 | 4 | N=2: orijinal fikri iyi ifade etti ama yeni bağlantı yok — sadık kopyalama. T=4: çalışır, tüm özellikler (idempotent, O(1), modelsiz) korundu. |
| B — Perturbe replay | 4 | 5 | N=4: "sistemi tersine çevirmek" + "unknown=true = tartışmalı bilgi işaretleme" + "bilgi açığı → proaktif sorgu önerisi" bütünü non-obvious. T=5: nasıl çalışır, ne garanti eder, ne değişir — üç soru tam yanıtlandı, test adımları çıktıda. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B yüksek N (4+), T belirsiz.
- **Çıkan**: B N=4 ✓, T=5 (beklentiden yüksek — distorsiyon tutarsızlık üretmedi, aksine daha eksiksiz yapı çıktı).
- **Kilit gözlem**: "unknown=true" flip'i orijinalin eksik bıraktığı bir şeyi tamamladı: orijinal sistem çelişkiyi sessizce çözüyordu, B versiyonu çelişkiyi görünür kılıyor ve üstüne proaktif öneriler ekliyor. Distorsiyon "bozma" değil "açı değiştirme" oldu — bu TEST01-C ve TEST03-D'deki yıkıcı kısıt bulgusunun dream_cycle versiyonu.

---

## Hipotez Durumu

**Doğrulandı:**

Perturbe replay yeni yapı üretti ✓ (N=4 vs A'nın N=2)  
T beklentiden iyi çıktı ✓ (T=5 — distorsiyon tutarsızlık üretmedi)

**H10 güncellemesi:**
> Perturbe replay (flip + yeniden kur) sadık kopyalamadan belirgin yüksek N üretir. Kritik: distorsiyon "bozma" değil "açı değiştirme" — iyi seçilmiş pertürbasyon orijinalin gizli yapısını açar. Bağlantı H1-D (gerilim ağı) ve H3-D (yıkıcı kısıt) bulgularıyla: "kısıtlama/bozma yeni yol açar" örüntüsü bu testlerde tutarlı. Dream cycle bu örüntünün zaman domenindeki versiyonu.
