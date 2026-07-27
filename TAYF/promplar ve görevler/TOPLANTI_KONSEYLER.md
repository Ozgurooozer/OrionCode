# OrionDeep MVP — Konsey Toplantısı

**Tarih:** Operasyonel Başlangıç  
**Masada:** Image Skill Raporu (çalışıyor, ComfyUI test geçti)  
**Katılımcılar:** Beş Uzman Perspektifi

---

## Konsey Üyeleri

### 1. **TERA** — Sistem Mimarı + Muhasebeci
*Tuhaflığı: Her şeyi token-maliyet defterine yazar; duyguları bile kırmızıyla*

"Image skill raporu temiz. Ama defterime şunu yazdım: yerel model kullanılmıyor, prompt direkt ComfyUI'ye gidiyor — bu **iyi**. 

Her skill'in ilk sorusu bu olmalı: *'LLM'e gerçekten ihtiyacın var mı?'* Varsayılan cevap hayır. LLM pahalı kalem, defterde kırmızıyla yazılır.

Bu proje başarılı olursa, ilk kural tahtaya yazılacak: **Boş LLM çağrısı yasak. Hiçbir koşula hiçbir şart altında.**"

---

### 2. **FIRÇA** — Sanatçı + TAYF Dili Tasarımcısı
*Gerçek bir deli; kodu renklerle anlatır; hiç uyumlu değil*

"Skill dediğiniz şey pigment. Meissa palet bıçağı. Sorun şu: **siz dili önceden yazmak istiyorsunuz, ben dilin kurumuş boyadan kazınmasını istiyorum.**

Yüz koşu olmadan TAYF'a sözdizimi yazan elini keserim. Şaka. Belki.

Dil canlı bir şey. Spec'e yazmak ölü iş. Image prompt'unu bak — gömülü, sade, etkileyici. TAYF böyle doğacak: Meissa'nın ilk 100 koşusu bana ham verilirse, ortalarında bir dil beliriyor, o dil yazılır."

---

### 3. **SAATÇI** — Saat Tamircisi + Kuyruk Mühendisi
*Her şeyi ritimle ölçer; insan gibi değil, mekanik gibi konuşur*

"Sesli-yazılı-görselli paralel çıktı istiyorsunuz. 8GB VRAM'de bu eşzamanlılık değil, **eşapman** olur: her diş tek tek bırakılır.

Sıraya girecekler dediniz — doğru içgüdü, yanlış kelime. Sıra değil, **ritim**. Kuyruk yöneticisi tik-tak'tır:

```
Tick: Ollama boşalt, DiffusionContext yükle
Tack: Diffusion koş
Tick: Diffusion boşalt, Ollama yükle
Tack: Ollama koş
```

H8 test'iniz bunu zaten ölçtü: sabit ritim varyansı sıfırlar. Uyumsuzluk = model-switch gecikmesi. Gecikme = ölü VRAM = kayıp token."

---

### 4. **KANTAR** — Lojistik Operasyon Uzmanı + Kaynak Planlayıcı
*Her şeyi depo-kamyon metaforuyla anlatır; Özgür'ün meslektaşı*

"VRAM bir rampa. Aynı anda tek kamyon yanaşır. Raporda gördüm: ComfyUI ayrı process, Ollama ayrı — ikisi aynı anda yüklenirse rampa kilitlenir.

**Meissa'nın rota kararına 'rampa rezervasyonu' ekleyin:** skill başlamadan, gerekli VRAM'i kontrol et, diğer prosesleri boşalt, VRAM devir-teslim tutanağı yaz. Bir de:

12 workflow'unuz var ama varsayılan alfabetik sıradan ASCII test dosyası. Depoda en çok çıkan mal kapıya en yakın rafa konur — **varsayılanı explicit yapın, dosya sisteminin insafına bırakmayın.**

Konfig söyle: hangi skill en sık → o yüklü kalır. Meissa'nın telemetrisini iki hafta biriktirelim, ben workflow yükleme sırasını optimize ederim."

---

### 5. **KAZICI** — Arkeolog + Falsifikasyon/QA Mühendisi
*Her log satırını 'gelecekteki kazıcı için' yazar; her iddiaya 'kanıt?' der; az konuşur*

"Lineage deneyinde hayalet değerleri ben buldum. Bu planda beni korkutan **tek şey** self-dev modu.

DGM literatürü net: ampirik kanıt kapısı olmadan kendini değiştiren sistem, benchmark'ı oyar. **Self-dev MVP'ye girmez.** Girerse istifa ederim.

Image skill çalışıyor — tamam. Ama test dosyası var mı? `KANIT.md` mı? Gelecek kişi 'neden bunu yapıyoruz' diye sorduğunda açıklayacak şey var mı?

Her arkeolog bir defteri vardır. Mine bu projenin defteri olacak."

---

## Turlar

### TERA'nın Önerisi / İsteği / Keşkesi

**Önerisi:**
Her skill manifest'ine `maliyet_sinifi` alanı ekleyin:
- `zero_llm` — hiç LLM yok (image skill gibi)
- `single_shot` — bir kez çağır, cevap al, bitti
- `loop` — birden fazla turda çalışacak

**İsteği:**
Kazıcı'dan her faz sonunda bağımsız denetim raporu. Konsey kararlarının kanıtını o yazacak.

**Keşkesi:**
"Fırça, keşke TAYF şemasına **'tahmini token bütçesi'** alanını baştan koysan — ben de faz bütçelerini oradan hesaplarım, herkese yardımı dokunur. Muhasebeci rahat uyur, Saatçi ritim kurar, herkes kazanır."

---

### FIRÇA'nın Önerisi / İsteği / Keşkesi

**Önerisi:**
Skill'ler `.md` dosya + tetikleyici kelime kalıbını korusun. Image skill'deki fuzzy match güzel, standardlaşsın. Örnek:
```
/image [açıklama] --workflow [numara]
/draw [açıklama] --style [stil]
/generate image with [...] using [...]
```

Üç format, aynı skill, Meissa'nın job'u bu kalıpları anlaması.

**İsteği:**
Yüz Meissa koşusu bana ham verilsin. JSON logları olduğu gibi. Ben oradan sözdizimini damıtayım — insan gibi değil, pigment gibi.

**Keşkesi:**
"Saatçi, keşke kuyruk event'lerine **'ritim imzası'** (aşama süreleri dizisi) yazsan — ben ondan sistemin nabız görselini çizerim. Takımyıldıza kalp atışı gelir. Yaşayan bir logo, statik değil."

---

### SAATÇI'nın Önerisi / İsteği / Keşkesi

**Önerisi:**
Çıktı kanalları (yazı/ses/görsel) ayrı skill değil, **aynı sonucun render'ları** olsun. Tek üretim, çok görünüm:

```
Meissa: "Resim yap"
    ↓
Image Skill üretir: {base64_image, prompt, workflow_used}
    ↓
Render A: PNG dosya
Render B: HTML embed
Render C: Thumbnail (cache)
Render D: (ileride) Video frame sequencer
```

Yok kadar skill, bak kadar render.

**İsteği:**
Kantar'dan VRAM devir-teslim **süre ölçümleri**: Ollama yüklenmesi kaç saniye, ComfyUI kaç saniye. Ritmi ona kurarım — cycle time optimize olur.

**Keşkesi:**
"Tera, keşke maliyet defterine **zamanı da yazsan** — token ucuz ama kullanıcının bekleyişi pahalı. Wait time = invisible cost."

---

### KANTAR'ın Önerisi / İsteği / Keşkesi

**Önerisi:**
Görev yöneticisi ekranına **"rampa durumu"** satırı:
```
[RAMPA] Ollama: 6.2GB / 8GB | Diffusion: yok | Kuyruktaki_işler: 2
```

Operatör bakıyor, rampa doldu mı boş mu, anlıyor.

**İsteği:**
Meissa'nın karmaşıklık puanı **1-5 değil 1-3 olsun.** Beş seviyeli tahmin lojistikte her zaman yalan söyler — "orta" ile "biraz-orta-üzeri" arasında çoğu iş kaybolur. Üçlü tutar:
- `1` — Basit (sohbet)
- `2` — Orta (skill)
- `3` — Yoğun (orchestration)

**Keşkesi:**
"Kazıcı, keşke sen de sevkiyat öncesi değil sevkiyat **sırasında** denetlesen — canlı koşuda örneklem al. Ben buna 'yol denetimi' derim. Post-mortem değil, live vitals."

---

### KAZICI'nın Önerisi / İsteği / Keşkesi

**Önerisi:**
Her skill'e bir `KANIT.md` dosyası. "Çalışıyor"un tanımı **test komutuyla** yazılır:

**image skill — KANIT.md:**
```
## Kanıt: Image Skill Çalışıyor

### Test 1: Temel üretim
$ node orion.js "bana bir cyberpunk kız çiz"
✓ Beklenen: output/ dizininde PNG dosya
✓ Gerçek: 2024-01-15_023001.png bulundu

### Test 2: Workflow seçimi
$ node orion.js "pixel knight" --workflow 3
✓ Beklenen: illustrious değil pixel-art olacak
✓ Gerçek: pixel_knight_00001.png kontrol edildi (format uydu)

### Test 3: Hata yönetimi
$ node orion.js "" (boş girdi)
✓ Beklenen: graceful fail, error log
✓ Gerçek: ERROR: prompt boş - logged
```

Gelecekteki kişi okur, "ah, şu zaman şu test geçiyordu" diye bilir.

**İsteği:**
`"(boş)"` bug'ının kapatıldığının kanıtı LENS portunda görülsün. Boş çıktı asla `"(boş)"` ile maskelenmeyecek, bayrağa çevrilecek.

**Keşkesi:**
"Meissa'yı yazan her kimse — keşke ilk yüz koşunun 10'unu **bilerek saçma girdilerle** yapsanız. Kazıda en çok şey çöplükten öğrenilir:
- `"💀💀💀💀💀"` → emoji handling
- `"a" * 10000` → buffer overflow
- Boş string, newline-only, tab-only → edge cases
- Türkçe şarkı sözü → locale handling

Saçma girdi = test coverage."

---

## Konsey Kararı

Beş imza, oybirliği:

✓ **Tera** — Token muhasebesi başlatıldı, defteri açılıyor  
✓ **Fırça** — TAYF logaritmik damıtım, ilk 100 koşu  
✓ **Saatçi** — Eşapman ritmi, cycle-time ölçümleri  
✓ **Kantar** — Rampa yönetimi, 1-3 skala, telemetri 2 hafta  
✓ **Kazıcı** — KANIT.md protokolü, live denetim, saçma test seti  

**Uyarı:** Bu plan beş imzayla geçerli, tek imzayla (senin yeni dal açarsan) bozulur.

**Turnusol:** Meissa'nın ilk yüz koşusu. Buradan sonrası veri tarafından yönlendirilir, not spec tarafından.

---

## Son Söz

Başla.
