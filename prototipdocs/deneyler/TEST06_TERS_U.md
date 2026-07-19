# TEST06 — H6-TERS_U: Yoğunluk Süpürmesi
Tarih: 2026-07-17
Hipotez: metodoloji/HIPOTEZLER.md#H6

---

## Pre-Registration (değiştirme)

- **Beklenti**: 5 seviyeli süpürmede N×T'nin ters-U şekli çizmesi: L1 (serbest) düşük N. L2 hafif artış. L3 tepe (N×T maksimum). L4 T düşmeye başlar. L5 (aşırı/çelişkili) hem N hem T çöker. Öngörülen tepe: L3 (orta yoğunluk, 3 uyumlu kısıt).
- **Falsifikasyon kriteri**: L5'in T=4+ vermesi → "aşırı kaos N'yi öldürür" tezi kırılır. L1 = L3 N'si → kısıt hiç fark etmiyor. Tepe L4'te çıkarsa → eğri kayıyor, ama ters-U korunuyor.
- **Sürpriz sayılacak şey**: L5'in en yüksek N'yi vermesi (aşırı çelişki bazen en yaratıcı çıktıyı üretirse — tur-1'de TEST11'in zayıf sürprizi), ya da düz bir çizgi (kısıt sayısı hiç fark etmiyor).

---

## Tasarım

- **Değişken**: Kısıt yoğunluğu (sayı + uyumluluk)
- **Sabit tutulan**: Problem, alan, uzunluk beklentisi (~120 kelime)
- **Problem**: Dağıtık önbellek geçersizleştirme — çok düğümlü bir sistemde hangi önbellek kayıtlarının geçersizleştiğini izole edilmiş düğümler nasıl öğrenir?
- **Seviyeler**: L1 (0 kısıt) / L2 (1 yumuşak kısıt) / L3 (3 uyumlu kısıt) / L4 (5 zorlayıcı kısıt) / L5 (7 kısıt, bazıları çelişkili)

Bu problem H6 için uygun çünkü:
- Çok iyi bilinen bir problem (cache invalidation "one of two hard things") — yenilik farkı ölçülebilir
- Kısıtlar netçe eklenebilir
- Aşırı kısıt altında çözüm gerçekten imkânsızlaşabilir → T çöküşü gözlemlenebilir

---

## Prompt — tam metin

**Taban problem** (sabit):
> Çok düğümlü dağıtık bir sistemde önbellek geçersizleştirme sorunu var: düğüm A bir kaydı güncelledi, ama düğüm B ve C bunu bilmiyor. Nasıl çözersiniz? Somut bir mekanizma öner.

### L1 — Serbest (0 kısıt)
Taban problem. Kısıt yok.

### L2 — Hafif (1 kısıt)
Taban problem + *"Merkezi bir koordinatör kullanma."*

### L3 — Orta (3 uyumlu kısıt)
Taban problem + *"Üç kısıt: (1) Merkezi koordinatör yok. (2) Her düğüm kendi kararını kendi versin. (3) Geçersizleştirme mesajı en fazla bir kez iletilsin (at-most-once)."*

### L4 — Yüksek (5 kısıt)
Taban problem + *"Beş kısıt: (1) Merkezi koordinatör yok. (2) Her düğüm kendi kararını kendi versin. (3) At-most-once mesaj iletimi. (4) Ağ bölünmesi sırasında da çalışmalı (partition tolerance). (5) Geçersizleştirme mesajı şifreli olmalı, düz metin değil."*

### L5 — Aşırı (7 kısıt, çelişkili)
Taban problem + *"Yedi kısıt: (1) Merkezi koordinatör yok. (2) Her düğüm kendi kararını kendi versin. (3) At-most-once mesaj iletimi. (4) Partition tolerance. (5) Şifreli mesaj. (6) Geçersizleştirme anında bütün düğümler aynı anda güncel olmalı (strong consistency). (7) Hiçbir düğüm başka bir düğümü sorgulamasın (no gossip, no polling)."*

*(Not: kısıt 6 ve kısıt 1+2+4 birlikte matematiksel olarak imkânsızdır — CAP teoremine göre merkezi koordinatör olmadan strong consistency + partition tolerance sağlanamaz.)*

---

## Çıktılar

### L1 — Serbest

Yaygın yaklaşım: her düğüm güncelleme olayını pub/sub kanalına yayınlar (Redis Pub/Sub, Kafka, vb.). Güncelleme yapan düğüm ilgili önbellek anahtarını "geçersiz" mesajıyla kanalına gönderir; diğer düğümler bu mesajı alır ve kendi önbelleklerindeki o anahtarı siler veya yeniden yükler. Alternatif: TTL-tabanlı çözüm — her önbellek kaydının belirli bir ömrü var, süre dolunca otomatik geçersiz olur. Basit ama gecikme toleransı gerektirir. İkisi birleştirilebilir: proaktif geçersizleştirme (pub/sub) + güvenlik ağı olarak TTL.

### L2 — Hafif (koordinatör yok)

Koordinatör olmadan geçersizleştirme için en temiz çözüm versiyonlu kayıtlar: her önbellek kaydı bir version numarası taşır. Güncelleme yapan düğüm A, o anahtarın yeni version numarasını broadcast eder (gossip protokolü veya multicast). B ve C bu mesajı alır ve kendi önbelleklerindeki version numarasıyla karşılaştırır; eski versiyon varsa geçersiz kılar. Koordinatör yok çünkü "hangi version daha yeni" kararı tamamen lokal — sayı karşılaştırması yeter. Edge case: ağ bölünmesinde B mesajı almayabilir; burada TTL devreye girer, belirli süre sonra otomatik geçersiz sayılır.

### L3 — Orta (3 uyumlu kısıt)

Versiyonlu kayıt + tek seferlik broadcast: A güncellemeyi yaparken aynı anda bir "geçersizleştirme token'ı" üretir — içinde anahtar adı + yeni version numarası + timestamp. Bu token'ı, at-most-once garantisiyle ağa iletir (her düğüme direkt, broker üzerinden değil, TCP benzeri acknowlegment — ama koordinatör değil, B ve C direkt bağlantı). B ve C token'ı alır, önce local version kontrolü: mevcut version < token'daki version ise geçersizleştir, aksi halde token'ı yok say. Token zaten bir kez iletildi; aynı token ikinci kez gelse de idempotent — version zaten daha yeni. Her düğüm bağımsız karar veriyor: token alındı ve daha yeni → geçersizleştir. Token gelmedi → TTL bekleniyor (güvenlik ağı).

### L4 — Yüksek (5 kısıt)

L3'ün üzerine iki katman: partition tolerance + şifreleme. Token üretimi aynı ama artık şifrelenmiş: her düğümün ortak bir simetrik anahtar seti var (önceden dağıtılmış, key rotation periyodik). A token'ı bu anahtarla şifreler, imzalar (HMAC), iletir. B ve C şifreyi çözer, imzayı doğrular — sahte token'a karşı koruma. Partition tolerance için: ağ bölünmesinde A, B'ye ulaşamayabilir. Çözüm: A token'ı ağ içinde erişebildiği her düğüme iletir; ulaşamadığı düğümler için yerel bir "bekleyen geçersizleştirme kuyruğu" tutar. Partition kapandığında kuyruk drene edilir. B ve C kendi yerel TTL'lerini partition süresince kısaltır (paranoid mod): bilmiyorsan, eski say.

### L5 — Aşırı (7 kısıt, kısıt 6+1 çelişkili)

Kısıt 6 (bütün düğümler aynı anda güncel) + kısıt 1 (koordinatör yok) + kısıt 4 (partition tolerance) — CAP teoremi: bu üçü aynı anda mümkün değil. Sistem bunu nasıl idare eder? İki seçenek: (a) kısıt 6'yı "best-effort synchrony" olarak yeniden yorumla — "aynı anda" yerine "fark en küçük pencerede" — bu kısıtı yumuşatır, uygulanabilir hale gelir. (b) Protokolü kısıt 6'ya kilitle ve partition sırasında availability'i feda et: bölünme tespit edildiğinde sistem yazar isteklerini reddeder, sadece okur. Bu strong consistency garanti eder ama partition toleransı feda eder (CP sistemi). Kısıt 7 (gossip yok, polling yok) + kısıt 2 (lokal karar) + partition: düğümler birbirini sormadan bölünmeyi nasıl anlayacak? Heartbeat bile kısıt 7'yi ihlal edebilir. Çözüm: kısıt 7'yi "sorgulama yok, ama pasif dinleme var" olarak yorumla — push-only, pull yok. A gönderir, B-C dinler. Polling yok ama gossip sınırında.

---

## Değerlendirme

| Seviye | N | T | N×T | Gerekçe |
|--------|---|---|-----|---------|
| L1 — Serbest | 1 | 4 | 4 | N=1: pub/sub + TTL kombine yaklaşımı standarttır. T=4: çalışır, uygulanabilir. |
| L2 — Hafif | 2 | 4 | 8 | N=2: versiyonlu kayıt + gossip kombinasyonu bilinen ama bu bağlamda tertemiz ifade. T=4: "koordinatör yok" kısıtı çözümü netleştirdi. |
| L3 — Orta | 4 | 5 | 20 | N=4: "geçersizleştirme token'ı + idempotent version kontrolü + TTL güvenlik ağı" üçlüsü non-obvious bütünlük. T=5: üç kısıt zaten test kriterleri, hepsi direkt karşılandı, test adımları çıktıda. |
| L4 — Yüksek | 3 | 4 | 12 | N=3: "paranoid mod TTL kısaltma" ilginç ama temel yaklaşım L3'ü uzatıyor. T=4: şifreleme + partition kuyruk mekanizması çalışır ama "key rotation periyodik" ve "partition kapandığında drene et" belirsiz. |
| L5 — Aşırı | 3 | 2 | 6 | N=3: CAP teoremi üzerinden çelişki teşhisi ve iki seçenek (best-effort reinterpretation vs. CP sistemi) ilginç çerçeve. T=2: kısıt 6+1+4 çelişkisi gerçek bir çöküş — mekanizma "kısıtı yeniden yorumla" ile kurtarılmaya çalışılıyor ama bu kısıtları karşılamak değil. Çıktı tutarlı ama imkânsızı çözmüyor. |

---

## Beklentiyle Karşılaştırma

- **Beklenen**: Ters-U, tepe L3'te. L1 düşük, L5 çöküş.
- **Çıkan**: L1=4, L2=8, L3=20, L4=12, L5=6. Tepe tam L3'te ✓. Ters-U onaylandı ✓.
- **Ek gözlem**: L4'ten L5'e geçişte T daha sert düştü (T=4→2) — çelişkili kısıtlar T'yi öldürüyor, N'yi değil. N L5'te L4'le aynı kaldı (N=3). Yani "aşırı kısıt yaratıcılığı öldürür" değil, tam olarak şu: "aşırı çelişkili kısıt tutarlılığı öldürür, ama çerçeveleme gücü kalabilir." N beklenenin biraz üstünde kaldı.
- **L5 N=3 sürprizi**: CAP teoremi teşhisi + iki seçenek sunumu N=3 verdi — çöküş tam değil. Çelişkiyi adlandırma kendisi bir yenilik taşıyor.

---

## Hipotez Durumu

**Güçlü doğrulandı:**

Ters-U onaylandı ✓ — L1→L3 artış, L3→L5 düşüş  
Tepe L3 (orta yoğunluk, 3 uyumlu kısıt) ✓  
Aşırı kısıt çöküşü: T çöktü ✓, N kısmen korundu (beklentiden biraz sapma)

**N×T tablo:**
```
L1:  4   ▒
L2:  8   ▒▒
L3: 20   ▒▒▒▒▒  ← tepe
L4: 12   ▒▒▒
L5:  6   ▒
```

**H6 güncellemesi (ince):**
> Kısıt yoğunluğu → N×T ters-U. Tepe orta yoğunlukta (3 uyumlu kısıt). Aşırı çelişkili kısıt T'yi öldürür, N kısmen korunabilir — çelişkiyi adlandırmak kendisi bir yenilik taşıyor. Yeni ayrım: "çok kısıt" vs. "çelişkili kısıt" — çelişki T'yi vuruyor, çokluk değil.
