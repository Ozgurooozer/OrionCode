# TEST 2 - Işınlama
## 5 kavram çifti, kavramsal mesafe süpürmesi

Metod: Her çift için bir "invariant nakli" üret. Değerlendirme: bağ gerçek mi (geçerli) yoksa zorlama mı?

---

### Çift 1 — Yakın: Bellek yönetimi × Önbellek mekanizmaları
*Mesafe: çok yakın (ikisi de bilgisayar bilimi, bellek alt-alanı)*

**Nakil:** LRU önbellekte en eski kullanılan atılır. Bellekte de aynı — en az çağrılan anı en önce unut. Yeni bir şey yok, zaten LRU'nun kendisi.

**Değerlendirme:** Bağ geçerli ama klişe. **N=1, T=5.**

---

### Çift 2 — Yakın-orta: Dilbilgisi kuralları × Kod derleme
*Mesafe: orta-yakın (ikisi de kural tabanlı sistemler)*

**Nakil:** Dilbilgisinde bir cümle, ağaç yapısına ayrışır (parse tree). Kod da aynı. Ama dilbilgisinde bozuk cümle genellikle *anlaşılır* (kısmi ayrıştırma); kodda bozuk sözdizimi *derlenmez*. Nakil: kod üretiminde "kısmi ayrıştırma" toleransı ekle — modelin ara çıktılarındaki sentaks hatalarını hemen reddetme, parser'ın en iyi çabasına bırak. Derleyici değil, linter gibi çalışan bir kısmi-parse katmanı. Bu, özellikle model kod üretirken *yarım token dizilerinde* hata vermemeyi sağlar.

**Değerlendirme:** Geçerli, yarı-özgün. Dilbilgisinin kısmi ayrıştırma toleransı kod için farklı bir anlama geliyor (hata yönetimi değil, sıralı üretim kolaylaştırıcı). **N=3, T=4.**

---

### Çift 3 — Orta: Oyun AI Director × Kodlama ajanı yük yönetimi
*Mesafe: orta (ikisi de "yönetim" kavramına sahip ama farklı alanlar)*

**Nakil:** L4D Director, oyuncunun stresini ölçer, tension curve'e göre ortamı ayarlar, nefes molası verir. Ajanın yük yönetimi de aynı yapıya sahip olabilir: bir "Director" meta-katmanı, ajanın anlık başarısızlık oranını, geri-alma sıklığını, belirsizlik seviyesini ölçer. Ölçülen yük bir hedef banttan (flow zone) sapınca nefes molası (idle → DMN modu) ya da alt-görev parçalama tetikler. Kritik nakil: Director oyuncuyu *öldürmeye çalışmaz*, *meşgul tutmaya* çalışır — tıpkı ajanın *yorulmasına değil*, *üretken kalmasına* odaklanması gerektiği gibi.

**Değerlendirme:** Bağ gerçek, iki yönlü beslenebilir (Director ←→ yönetim). Prizma-III Fikir 4'ün ürettiğinden farklı durağa gitti — Director'ın "öldürme/meşgul etme" ayrımı yeni bir yön. **N=4, T=4.**

---

### Çift 4 — Orta-uzak: Metalurji yorulma × Ajan kararlılığı
*Mesafe: orta-uzak (fizik mühendisliği × yazılım ajanı)*

**Nakil:** Metal yorulması: her çevrim küçük bir hasar biriktirir, biriken hasar görünmez, ta ki ani kırılma olana kadar. Ajan kararlılığında da "bilişsel yorulma" benzer: her küçük karar, her çelişki, her geri-alma bir iç stres biriktirir. Ajan aniden "kırılır" — mantıksız karar, çelişkili çıktı, görevi yarıda bırakma. Nakil: ajana bir **yorulma sayacı** koy (görünmez, sadece stres × çevrim). Sayaç eşiğe yaklaşınca "tavlat" (annealing): zorunlu mola, hafif bir sıcaklık artışı, farklı alt-göreve geçiş. Metalurjide tav, dislokasyonları azaltır; ajan tavı da "bilişsel dislokasyonları" azaltır.

**Değerlendirme:** Bağ gerçek, nakil iki yönlü çalışıyor. Yorulma sayacı + tavlatma mekanizması hem açıklayıcı hem uygulanabilir. **N=4, T=5.**

---

### Çift 5 — Uzak: Piroteknik × Embedding güncellemesi
*Mesafe: çok uzak (kimya/fizik × vektör db)*

**Nakil:** Piroteknikte itici maddenin yanma hızı, tane boyutu ve geometrisiyle *hassas şekilde kontrol edilir*. Embedding güncellemesinde de "yanma hızı" kontrolü: vault'a eklenen yeni bilginin mevcut embedding'leri ne kadar hızlı "yakacağı" (değiştireceği) önceden hesaplanabilir — embedding geometrisiyle. Tane boyutu = chunk boyutu; geometri = embedding yönü. Yavaş yanan (ince tane) = küçük chunk, hassas güncelleme. Hızlı yanan (kaba tane) = büyük chunk, radikal güncelleme.

**Değerlendirme:** Bağ zorlama. Pirotekniğin geometrisi fiziksel bir kısıt; embedding güncellemesi istatistiksel. Metafor düzeyinde güzel ama invariant seviyesinde dökülüyor. **N=5, T=2.**

---

## Test 2 Özet

| Çift | Mesafe | N | T | Bağ Gerçek mi? |
|------|--------|---|---|-----------------|
| 1. Bellek × Cache | Çok yakın | 1 | 5 | Evet, klişe |
| 2. Dilbilgisi × Derleme | Yakın-orta | 3 | 4 | Evet |
| 3. Director × Yük yönetimi | Orta | 4 | 4 | Evet, güçlü |
| 4. Metalurji × Ajan kararlılığı | Orta-uzak | 4 | 5 | Evet, güçlü |
| 5. Piroteknik × Embedding | Uzak | 5 | 2 | Hayır, zorlama |

Beklendiği gibi: **orta mesafe en yüksek geçerlilik×novelty**. Çift 4 (metalurji) en yüksek bileşik skor (4+5=9). Çift 1 klişe (düşük N), çift 5 zorlama (düşük T). Ters-U tutuyor.
