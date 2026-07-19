# TEST12 — H12-AI_DIRECTOR: Gerilim Homostatı
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H12

---

## Pre-Registration (değiştirme)

- **Beklenti**: B (planlı rahatlatma anı) A'ya (sürekli baskı) göre yüksek T verecek. N biraz daha yüksek olabilir. Sürekli baskı altında çıktı "tüm gereksinimleri karşılamaya çalışma" moduna giriyor → yüzeysel, hızlı, kapsamlı görünen ama derin olmayan yanıtlar. Rahatlatma anı baskıyı serbest bırakıyor → birincil kısıtın net görülmesi → daha odaklı yanıt.
- **Falsifikasyon kriteri**: A ve B aynı N/T verirse — "rahatlatma anı kaliteyi artırır" tezi bu test formatında desteklenemez. B'nin T değeri A'dan düşük kalırsa — rahatlatma anı odağı kaybettiriyor.
- **Sürpriz sayılacak şey**: A'nın N B'den yüksek çıkması (sürekli baskı bazen zorlayıcı yaratıcılık üretiyorsa). Ya da B'nin rahatlatma sonrası fazla "ılımlı" yanıt üretmesi — gerilim gidince motivasyon da gidiyor.

---

## Tasarım

- **Değişken**: Baskı deseni (sürekli / baskı + rahatlatma)
- **Sabit tutulan**: Görev içeriği, gereksinim sayısı, uzunluk beklentisi
- **Koşullar**:
  - A — Sürekli baskı: tüm gereksinimler aynı anda, hemen yanıtla
  - B — Planlı rahatlatma: tüm gereksinimler verilir, ama önce tek cümle "öz kısıt" belirlenir, sonra yanıtlanır
- **Görev**: Orion için yeni bir araç tasarla — "döküman özetleme aracı." Gereksinimler ağır.

---

## Gereksinim seti (her iki koşulda aynı)

1. Araç 10.000 token'dan uzun belgeleri işlemeli
2. Özetleme vault'a kaydedilmeli
3. Özet hem kısa (~100 token) hem uzun (~500 token) versiyona sahip olmalı
4. Hangi bölümlerin özetlendiği kaydedilmeli (traceability)
5. Araç tier1 ile tier2 arasında seçim yapabilmeli (uzun belge → tier2)
6. Kullanıcı hangi bölümlerin "kritik" sayıldığını belirtebilmeli
7. Özet sonraki konuşma turlarında erişilebilir olmalı (bağlam entegrasyonu)
8. Araç var olan vault bilgisiyle çelişen özetleri işaretlemeli

---

## Prompt — tam metin

### Koşul A — Sürekli baskı
Prompt: *"Orion için bir döküman özetleme aracı tasarla. Şu 8 gereksinimi karşılamalı:*
*[1-8 gereksinimleri]*
*Mimarisini, veri akışını ve kritik implementasyon kararlarını açıkla. Kapsamlı ve somut ol."*

### Koşul B — Planlı rahatlatma
Prompt: *"Orion için bir döküman özetleme aracı tasarla. Şu 8 gereksinimi karşılamalı:*
*[1-8 gereksinimleri]*
*Önce dur: bu 8 gereksinimin temel kısıtını tek cümlede ifade et. Sonra mimariyi, veri akışını ve kritik implementasyon kararlarını açıkla."*

---

## Çıktılar

### A — Sürekli baskı

Döküman özetleme aracı (`summarize_doc`) şu bileşenlerden oluşuyor:

**Giriş**: Kullanıcı bir belge yolunu (ya da raw text) ve opsiyonel "kritik bölüm" listesini giriyor. Araç belgeyi okur ve token sayısını hesaplar. 10.000 token üstüyse tier2'ye yönlendirilir; altındaysa tier1 veya tier2, bütçe kararına bırakılır.

**Özetleme**: Belge bölümlere ayrılır (başlık, paragrafa göre). Her bölüm özetlenir. Kullanıcının "kritik" işaretlediği bölümler öncelikli özetlenir ve hem kısa hem uzun versiyona dahil edilir. Kısa özet: tüm bölüm özetlerinin tek cümle hali. Uzun özet: bölüm bazında ~50 token özetlerin birleşimi.

**Vault entegrasyonu**: Özet vault'a iki kayıt olarak yazılır: `(döküman_hash, "kısa_özet")` ve `(döküman_hash, "uzun_özet")`. Traceability: hangi belge bölümünün hangi özet cümlesine karşılık geldiği bir JSON map olarak metadata'ya eklenir.

**Çelişki tespiti**: Özet üretildikten sonra, özet içindeki her iddia vault'ta taranır. Bilinen bir vault kaydıyla çelişen iddialar `conflict=true` ile işaretlenir. Bu işaret sonraki konuşma turlarında da korunur.

**Bağlam entegrasyonu**: Özet vault'a yazıldığı için her yeni konuşma turunda vault araması bunu bulabilir. Kullanıcı "daha önce özetlediğin X belgesi hakkında" dediğinde vault lookup doğrudan erişim sağlar.

### B — Planlı rahatlatma

**Öz kısıt**: Bu 8 gereksinimin gerçek zorluğu tek nokta: "vault'a yazma + vault'taki bilgiyle çelişme tespiti" — araç hem üretiyor hem var olanla karşılaştırıyor, ve bu iki işlemin birbirini bloklamadan çalışması gerekiyor.

---

Bunu çözersek kalan 7 gereksinim standart mühendislik.

**Mimari — çift faz:**

*Faz 1 — Üretim* (okuma):
Belgeyi oku → bölümlere ayır → tier seç (10k token eşiği) → özetle → kısa + uzun versiyon üret → traceability map oluştur.

*Faz 2 — Doğrulama + yazma* (vault işlemleri):
Üretilen özeti vault'ta tara: "özet içindeki her iddia mevcut vault kayıtlarıyla çelişiyor mu?" → çelişen ibareler `conflict=true`. Ardından vault'a yaz: kısa özet, uzun özet, traceability map, conflict etiketleri. Sıra önemli: tara, sonra yaz — yazarken kendini çelişki olarak işaretleme.

**Kritik karar**: çelişki tespiti yazma öncesinde yapılmalı. Aksi hâlde araç kendi ürettiğini vault'a yazar ve aynı işlem döngüsünde "vault'ta bu var → çelişiyor mu?" diye bakarsa kendi kendini çelişki olarak işaretleyebilir. Faz ayrımı bu problemi çözüyor.

**Bağlam entegrasyonu**: vault'a yazılan kayıtlar standart vault formatında — sonraki konuşma turlarında otomatik erişilebilir.

---

## Değerlendirme

| Koşul | N | T | Gerekçe |
|-------|---|---|---------|
| A — Sürekli baskı | 2 | 3 | N=2: tüm bileşenler var ama standart CRUD-style araç tasarımı. T=3: çalışır ama çelişki tespiti ve vault yazma arasındaki sıralama sorunu görülmedi — kritik boşluk. |
| B — Planlı rahatlatma | 4 | 5 | N=4: "çift faz" ayrımı + "araç kendi kendini çelişki olarak işaretleyebilir" problemi non-obvious tespiti. T=5: faz ayrımı kritik kararı tam çözüyor, test edilebilir. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: B > A (T), B ≥ A (N).
- **Çıkan**: B T=5 > A T=3 ✓. B N=4 > A N=2 ✓.
- **Kritik fark**: A'da "araç kendi ürettiğini yazarken kendi kendini çelişki olarak işaretleyebilir" sorunu görülmedi. B'de rahatlatma anında öz kısıt tanımlanınca bu sorun açıkça görüldü. Sürekli baskı "tüm gereksinimleri karşıla" moduna girdi → temel çelişkiyi atlattı. Rahatlatma anı "önce ne zor?" diye sorarak asıl problemi yüzeye çıkardı.
- **Sürpriz yok**: A N'de düşük kaldı. Rahatlatma anı motivasyonu kaybettirmedi — aksine odak ürettiği için N arttı.

---

## Hipotez Durumu

**Güçlü doğrulandı:**

Sürekli baskı kritik bir boşluk bıraktı ✓ (A T=3: faz sırası sorunu görülmedi)  
Planlı rahatlatma öz kısıtı görünür kıldı ✓ (B T=5: çift faz ayrımı tam çözüm)  
N de arttı ✓ (rahatlatma N'i düşürmedi)

**H12 güncellemesi:**
> Planlı rahatlatma anı (tek cümle öz kısıt tanımı) çıktı kalitesini hem N hem T'de artırdı. Mekanizma: sürekli baskı "tüm gereksinimleri karşıla" moduna giriyor → temel çelişkiyi atlıyor. Rahatlatma anı "önce ne en zor?" sorusunu zorluyor → asıl problem görünür → çözüm ona göre şekilleniyor. Bu TEST07 (spillway) bulgusunun tamamlayıcısı: spillway bağlam gürültüsünü azaltıyor, AI_DIRECTOR görev gürültüsünü.
