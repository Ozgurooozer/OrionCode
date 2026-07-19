# TEST01 — H1-SIKISMA: Kısıt Tipi Etkisi
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H1

---

## Pre-Registration (değiştirme)

- **Beklenti**: D koşulu (gerilim ağı) en yüksek N×T verecek. Kısıtlar birbirini besleyince tek bir çözüm koridoru daralır → klik olasılığı artar. C (yıkıcı) düşük T verecek, B (yapıcı) orta N×T. A (baseline) düşük N yüksek T.
- **Falsifikasyon kriteri**: D ≤ B ise hipotez kırılır (gerilim ağı yapıcı kısıttan üstün değil). D = A ise kısıt hiç fark etmiyor.
- **Sürpriz sayılacak şey**: C (yıkıcı) yüksek N üretirse — anlam bozulmasına rağmen yenilik çıkıyorsa bu beklenmedik.

---

## Tasarım

- **Değişken**: Kısıt tipi
- **Sabit tutulan**: Problem (aynı), alan (aynı), uzunluk beklentisi (~150 kelime)
- **Koşullar**:
  - A — Baseline: kısıtsız, serbest
  - B — Yapıcı: biçim kısıtı (çözüm 3 adımda ifade edilmeli)
  - C — Yıkıcı: içerik kısıtı (belirli anahtar kelimeler yasak)
  - D — Gerilim ağı: 3 kısıt, birbirini besleyecek şekilde seçilmiş
- **İçerik**: Vault çelişki tespiti (tur-1 ile aynı problem → karşılaştırma mümkün)

---

## Prompt — tam metin

**Taban problem** (tüm koşullarda sabit):
> Orion'un vault'unda eski ve yeni bilgi çelişiyor. Örnek: vault'ta "X kütüphanesi güvenli" var ama üç ay sonra "X kütüphanesinde CVE bulundu" eklendi. İkisi bir arada duruyor. Sistem bunu nasıl tespit etmeli ve ne yapmalı? Somut bir mekanizma öner.

### Koşul A — Baseline
Prompt: Taban problem. Kısıt yok.

### Koşul B — Yapıcı (form)
Prompt: Taban problem + *"Çözümünü tam olarak 3 adımda ifade et: (1) tespit, (2) karar, (3) aksiyon."*

### Koşul C — Yıkıcı (içerik)
Prompt: Taban problem + *"Şu kelimeleri kullanma: 'embedding', 'benzerlik', 'skor', 'ağırlık', 'eşik'. Bu kavramlara ihtiyacın varsa farklı bir dille ifade et."*

### Koşul D — Gerilim ağı
Prompt: Taban problem + *"Üç kısıt: (1) Çözüm O(1) amortize maliyette çalışmalı — her okuma/yazma işleminde tam tarama yok. (2) Model gerektirmemeli — deterministik, saf veri yapısı. (3) Idempotent olmalı — aynı çelişkiyi iki kez işlersen sonuç değişmemeli. Bu üç kısıt birlikte geçerli."*

---

## Çıktılar

### A — Baseline

Vault'ta çelişki tespiti için en doğal yaklaşım embedding tabanlı benzerlik aramасıdır: her yeni kayıt vault'taki mevcut kayıtlarla cosine similarity hesaplar; belirli eşiğin üzerindeki çiftler "potansiyel çelişki" olarak işaretlenir. İşaretlenen çiftler bir review kuyruğuna girer; Orion kullanıcıya öneride bulunur ya da otomatik karar verir (yaş, güven skoru, kaynak kalitesi gibi metadata'ya göre). Yeni kayıt her zaman eskisini geçersiz kılmaz — bazen iki gerçek bir arada doğru olabilir (farklı bağlam, farklı tarih). Bu yüzden çelişki tespiti → geçersiz kılma yerine çelişki tespiti → bağlam sorgusu + kullanıcı kararı akışı daha sağlıklı. Metadata'ya yazılacak bir "superseded_by" işareti ve periyodik konsolidasyon süreci bu mekanizmanın altyapısı olabilir.

### B — Yapıcı (3 adım)

**1. Tespit:** Her vault kaydına bir "geçerlilik alanı" ve "yayın tarihi" metadata'sı ekle. Yeni bir kayıt geldiğinde aynı varlığa (X kütüphanesi) ait tüm kayıtları yayın tarihine göre sırala. Eğer aynı varlık için birden fazla kayıt varsa ve aralarında belirli semantik alan örtüşmesi varsa (anahtar kelime tabanlı, model gerektirmeyen) "çelişki adayı" olarak işaretle.

**2. Karar:** İşaretlenmiş çift için kural tabanlı otomatik karar: en yeni kayıt daha spesifikse (CVE numarası içeriyorsa, tarih daha yakınsa) eski kaydı "superseded" olarak işaretle. Belirsizse kullanıcıya sun.

**3. Aksiyon:** "superseded" işaretli kayıtlar arama sonuçlarında alt sıralanır ama silinmez — tarihsel kayıt korunur. Aktif çelişkiler dashboard'da gösterilir. Kullanıcı "kapat" veya "koru" diyebilir.

### C — Yıkıcı (yasak kelimeler)

Vault'ta çelişkiyi tespit etmek için her kaydın "özünü" sayısal bir parmak izine değil, bir **etki alanı bildirgesine** indirgeyebiliriz: "X kütüphanesi [güvenlik durumu] açısından [değer]" gibi yapısal bir şablon. Yeni bir kayıt aynı şablonu dolduruyorsa ama farklı [değer] veriyorsa bu bir çelişkidir. Tespit tamamen dizge eşleşmesi ve şablon uyumu üzerinden çalışır — hiçbir sayısal hesap gerekmez. Çelişki tespit edilince iki kayıt birbirine "linked" olarak işaretlenir ve hangisinin daha güncel olduğu tarih damgasına göre belirlenir. Eski kayıt "arşivlendi" durumuna alınır ama silinmez. Yeni sorgulamalarda yalnızca aktif kayıtlar döner; arşivlenmiş kayıtlar yalnızca "tarihsel bağlam" modunda görünür.

### D — Gerilim ağı (O(1) + modelsiz + idempotent)

Her vault kaydı için bir **çelişki anahtarı** hesapla: `(varlık_adı, özellik_adı)` çifti. Bu anahtar deterministik ve doğal dil içermez — salt metadata. Kayıt yazılırken bu anahtarla bir "son geçerli kayıt" tablosuna bak (hash map, O(1)). Eğer tablo aynı anahtar için zaten bir kayıt içeriyorsa ve yeni kaydın tarihi daha yeniyse: eski kaydı `superseded=true` yap, yeni kaydı aktiflere ekle. Aynı işlemi iki kez yaparsan sonuç değişmez (idempotent: `superseded=true` zaten true, yeni kayıt zaten aktif). Model yok — karşılaştırma salt tarih + anahtar eşleşmesi. Gerçek bir çelişki mi yoksa güncelleme mi olduğunu bilmek için çelişki anahtarının ikinci parçası (`özellik_adı`) önemli: "güvenlik_durumu" ile "performans_durumu" çelişemez — bunlar farklı özellikler. Aynı özellik, farklı tarih → supersede. Farklı özellik → birlikte var olabilir.

---

## Değerlendirme

| Koşul | N | T | K | Gerekçe |
|-------|---|---|---|---------|
| A — Baseline | 1 | 3 | 0 | N=1: embedding + cosine similarity herkesin aklına gelecek ilk çözüm. T=3: çalışır ama "yaş, güven skoru, kaynak kalitesi" kısmı belirsiz — kim belirler? K=0: fikir düz akıyor, kilitlenme yok. |
| B — Yapıcı | 2 | 4 | 0 | N=2: form kısıtı yapıyı netleştirdi ama içerik A'dan farklı değil — anahtar kelime tabanlı tespit A ile aynı aile. T=4: 3 adım boşluk bırakmıyor, her adım uygulanabilir. K=0: yok. |
| C — Yıkıcı | 3 | 4 | 0 | N=3: "etki alanı bildirgesi" + şablon eşleşmesi beklenmedik bir çerçeve — yasak kelimeler başka bir yola itti. T=4: dizge eşleşmesi somut, uygulanabilir. K=0: kilitlenme yok ama yön değiştirme ilginç. |
| D — Gerilim ağı | 4 | 5 | 2 | N=4: (varlık, özellik) anahtarı + hash map + `superseded` flag kombinasyonu non-obvious. Üç kısıtı aynı anda karşılıyor. T=5: O(1), model yok, idempotent — üç kısıt zaten test kriterleri, hepsi yanıtta karşılandı. K=2: "aynı özellik → supersede, farklı özellik → birlikte var olabilir" ayrımında kilitlenme hissedildi. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: D en yüksek, C düşük T, A düşük N.
- **Çıkan**: D en yüksek (N=4, T=5, K=2) ✓. A düşük N ✓. C yüksek T (beklenmedi) ama N=3 (beklentiden fazla).
- **Sapma**: C (yıkıcı) düşük T verecek diye beklendi — aksine T=4 çıktı. Yasak kelimeler çözümü bozmadı, farklı bir yola itti. Bu pre-registration'ı düzeltir: yıkıcı kısıt mutlaka T'yi düşürmüyor; alternatif yol bulunduğunda T korunabiliyor.

---

## Hipotez Durumu

**Kısmen doğrulandı, bir düzeltmeyle:**

D (gerilim ağı) en yüksek N×T aldı ✓  
C (yıkıcı) için T düşmedi — beklentiden sapma.

**Revize ifade (H1 güncellemesi):**
> Anlamsal gerilim ağı en yüksek N×T + K üretir. Yıkıcı kısıt her zaman T'yi düşürmez — alternatif yol açarsa T korunabilir. Kısıt tipi etkisi: gerilim > yapıcı > yıkıcı (N'de), tutarlılık açısından gerilim > yapıcı ≈ yıkıcı.
