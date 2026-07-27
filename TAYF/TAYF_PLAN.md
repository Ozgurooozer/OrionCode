# TAYF — İki Ajanlı Mesajlaşma Terminali

İki Claude Code ajanı, paylaşılan bir kanal üzerinden konuşarak aynı depo
üzerinde çalışır. Üçüncü terminal konuşmayı izler, dördüncü Orion'u çalıştırır.

## Neden bu, "sohbet eden iki bot" değil

Tek ajan kendi hatasını göremez — bu oturumun kendisi kanıt: test sayısı
yanlış rapor edildi ve ancak dışarıdan bakan bir denetim yakaladı. İki ajanın
değeri hız değil, **birbirinin kanıtını denetlemesi**.

Bu yüzden Tayf'ın ayırt edici özelliği tek satırda: **her mesaj kanıt etiketi
taşır ve karşı taraf onu terfi ettiremez.** B, A'nın `[SEZGİ]`'sini `[TEST]`
diye alıntılayamaz — kanal bunu reddeder (`KanitTerfiHatasi`). Aksi halde
doğrulanmamış iddia iki ajan arasında birikerek "ikimizin de bildiği gerçek"e
dönüşür; kaynağı da kalmaz.

---

## Dört terminal

| # | Ne | Komut |
|---|-----|-------|
| 1 | Ajan A (mimar/karar) | `claude` → `/tayf` → "sen A'sın" |
| 2 | Ajan B (uygulayıcı/ölçüm) | `claude` → `/tayf` → "sen B'sin" |
| 3 | İzleyici (salt okuma) | `python tayf/izle.py .tayf/kanal.jsonl` |
| 4 | Orion (paylaşılan, kiralı) | normal terminal + `Kiralama` disiplini |

**4. terminal akıcılığı — sorduğun sorunun cevabı:** İki ajan aynı terminali
kullanınca çıktılar iç içe geçer ve "hangi çıktı kimin" bilgisi kaybolur.
Çözüm `kortex.py`'daki kapının aynısı, **geri alma maliyetine göre**:

- **Okuma komutu** (`ls`, `cat`, `git status`, `pytest`): geri alınabilir →
  kira gerekmez, iki ajan aynı anda okuyabilir.
- **Yazma komutu** (`rm`, `mv`, `git commit`, `pip install`): geri alınamaz →
  kira şart, tek sahip.

Kira **TTL'lidir** (varsayılan 120s): ajan çökerse kilit sonsuza kadar kalmaz.
Bu, testle korunuyor (`test_ASIL_ttl_dolunca_kira_devralinabilir`).

Pratik akıcılık için: 4. terminali tmux paneli yap, her komutu
`Kiralama.calistir(kim, komut)` üzerinden geçir — çıktı `[A]`/`[B]` ile
etiketlenir, kim ne yaptı karışmaz.

---

## Kilitlenme — en kolay gözden kaçan hata

"Cevabı bekleyecek, sonra o cevap verecek" ifadesi, iki taraf da beklerse
sistemi **sonsuza kadar dondurur**. İnsan sohbetinde bunu sosyal ipuçları
çözer; iki süreçte hiçbir şey çözmez.

`sira.py` bunu açık **sıra jetonu** ile çözer: jeton kimdeyse o konuşur,
bekleyen zaman aşımına uğrarsa kanala `ZAMAN_ASIMI` yazar ve **jetonu alır**.
Sistem her durumda ilerler; en kötü ihtimalle biri "cevap gelmedi" der ve
devam eder. Sessizlik kayda geçer, kaybolmaz.

---

## /tayf++ — sıkıştırılmış dil ve gerçek tehlikesi

Fikir doğru: sık kullanılan ifadeler `§sembol`'e iner, token düşer, tetikleme
hızlanır. **Ama iki ajanın kendi kısaltmalarını uydurup evrimleştirmesi tam
olarak kriptomnezidir** — sembol tanıdık gelir, tanımı kaymıştır, kimse fark
etmez. Sıkıştırma kazancı anlam kaybını gizler.

`sozluk.py` bunu `vault.py`'daki çapa ilkesiyle çözüyor:

1. Her sembol bir tanıma çapalı; çapa **okuma anında** çözülür, saklanmaz.
2. Tanımı çözülemeyen sembol "bilinmeyen" değil **çapasız**: kullanılamaz,
   açık yazıma dönülür. Sessizce tahmin yok (`CapasizSembol` fırlatır).
3. Sembol **kanıtla girer**: ifade açık halde ≥3 kez geçmiş olmalı.
4. Sembol **kanıtla çıkar**: hiç kullanılmayanlar `rapor()`'da listelenir.

**Dürüst not:** `/tayf++`'ın gerçekten hızlandırdığı **[ÖLÇÜLMEDİ]**. Kanıtı
şu: aynı görevi sıkıştırmalı ve sıkıştırmasız koş, toplam token + tur sayısını
karşılaştır. Ölçmeden "daha hızlı" deme — bu tam olarak bütçe kuralında
düştüğümüz tuzak.

---

## Kurulum

```bash
cp -r tayf/ <orion-repo>/
cp -r tayf/.claude <orion-repo>/          # slash komutları
cd <orion-repo> && mkdir -p .tayf
python -m pytest tayf/test_tayf.py -q     # 18 test geçmeli

# Terminal 3 (önce aç, ki baştan izleyesin)
python tayf/izle.py .tayf/kanal.jsonl

# Terminal 1
claude → /tayf → "sen A'sın, mimar/karar rolü"
# Terminal 2
claude → /tayf → "sen B'sin, uygulayıcı/ölçüm rolü"
```

`.tayf/kanal.jsonl` ve `.tayf/kira.json` → `.gitignore`'a ekle.

---

## Faz planı

### Faz 1 — İlk gerçek görev (bu hafta)
İki ajanı **hâlâ ölçülmemiş** olan `GÖREV 3a`'ya koş: çoklu görev sınırı.
A tasarlar ve karar verir, B koşar ve ölçer. Neden bu görev: mimari
belirleyici, atlanamaz, ve iki farklı rol gerektiriyor.

**Bitti kriteri:** Kanalda `[TEST]` etiketli bir sonuç var ve `KanitTerfiHatasi`
en az bir kez tetiklendi (yani denetim gerçekten çalıştı).

### Faz 2 — Bozuk ölçümleri onar
1b'nin zehri domain-specific yapılacak, 1a'nın uyum skoru kalibre edilecek.
Bunlar iki ajanlı denetimin en doğal işi: biri ölçer, diğeri "bu alet kalibre
edildi mi?" diye sorar.

### Faz 3 — Sözlük evrimi ölçülür
`/tayf++` açılır, 20 tur konuşulur, `sozluk.rapor()` okunur:
- `capasiz_deneme > 0` ise ajanlar tanımsız sembol uydurmaya çalışıyor
- `hic_kullanilmayan` doluysa sözlük şişiyor, emekli et
- Token karşılaştırması yapılır → `/tayf++` gerçekten hızlandırıyor mu

### Faz 4 — Orion'a modül olarak gömme
Kanal, Orion'un kendi mesaj yoluna taşınır; ajanlar Tayf üzerinden Orion'un
araçlarını çağırır. **Buraya kadar gelmeden gömme** — protokol Faz 1-3'te
gerçek kullanımla sınanmadan kalıcılaştırılırsa şema hatası pahalıya patlar.

---

## Ölçülmeyi bekleyenler (hepsi şu an [ÖLÇÜLMEDİ])

1. `/tayf++` token tasarrufu — sıkıştırmalı vs sıkıştırmasız
2. İki ajanın tek ajana göre hata yakalama oranı — asıl değer iddiası
3. Kilitlenme sıklığı — `zaman_asimi_sayisi` gerçek kullanımda kaç
4. Kira çekişmesi — yazma komutunun kira beklediği toplam süre

---

## Kaçırma günlüğüne yazılacaklar

İki ajan konuşurken şunlar olursa günlüğe kayıt gir:
- `KanitTerfiHatasi` tetiklenmediyse hiç: ya denetim çalışmıyor ya iddia yok
- `capasiz_deneme` artıyorsa: sözlük disiplini bozuluyor
- Aynı görev iki ajanda da tamamlanmadan üçüncü göreve geçildiyse: sohbet
  ilerleme sanılıyor, iş çıkmıyor — bu **balina**

---

**Bu sistemi en çok şu yanlışlar:** iki ajan nazik ve uyumlu davranır, birbirinin
çıktısını onaylar, kanal dolar ve hiçbir `ITIRAZ` yazılmaz — konuşma üretkenlik
hissi verir ama tek ajanın yapacağı işi iki katı maliyetle yapar; **bunu şu
gözlem yakalar:** 50 mesajlık bir oturumda hiç `ITIRAZ` ve hiç
`KanitTerfiHatasi` yoksa, denetim çalışmıyor demektir — iki ajan tek ajanın
pahalı taklidine dönüşmüştür.
