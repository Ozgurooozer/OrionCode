# Görevler — sırayla, gerekçeleriyle

Sıralama ilkesi: önce **yönü değiştirebilecek ucuz ölçümler**, sonra
entegrasyon, en sona pahalı/ertelenebilir olanlar. Her görevde "nasıl çalışır"
ve "hangi sonuç planı değiştirir" ayrı yazıldı. İkincisi olmadan ölçüm süstür.

Bir görev bitince: `kacirma_gunlugu.md`'ye, çerçevenin/kodun kaçırdığı ama
sonradan çıkan hata varsa tek satır yaz. Payda budur.

---

## GÖREV 0 — Kaçırma günlüğü başlat (maliyet ~0, ŞİMDİ)

**Nasıl çalışır:** Depo köküne `kacirma_gunlugu.md` oluştur. Bundan sonra, bir
hata *sonradan* ortaya çıktığında (test yakalamadı, çerçeve uyarmadı) tek satır
ekle: `tarih | nerede | çerçeve/test neden kaçırdı`.

**Neden ilk:** Elimizde çerçevenin ve testlerin YAKALADIKLARI kayıtlı,
KAÇIRDIKLARI hiç sayılmadı. "Bu iyi çalışıyor" iddiası paydasız. Geç başlarsa
hiç ölçülemez.

**Bitti kriteri:** Dosya var ve ilk gerçek entegrasyon hatasında güncelleniyor.

---

## GÖREV 1 — Tek Ollama oturumu, dört ölçüm (yarım gün)

Ollama'yı `qwen2.5-coder:7b` ile ayağa kaldır. Dördü de aynı ortamı ister,
verilen SIRAYLA koş — 1a'nın sonucu diğerlerini etkiler.

### 1a. `orion/kos_butce.py` — bütçe kuralı gerçek mi?

**Nasıl çalışır:** `butce_ab.py` aynı kodlama görevini iki sistem promptuyla
koşar: kısa (`kussu_v7`) vs kısa+dolgu (~3x). Uyum skoru = çıktının promptun
zorunlu unsurlarını taşıma oranı (mekanik, LLM-hakem yok).

**Önce aleti kalibre et:** `python -m pytest test_butce_ab.py` — 6 test, iki
stub'ın (uzunluğa duyarsız vs duyarlı model) doğru sınıflandığını doğrular.
Geçmezse ALETİ onar, sonuca bakma.

**Çalıştır:** `python kos_butce.py`

**Hangi sonuç planı değiştirir:**
- H0 (fark < 0.15): uzun prompt zarar vermiyor. Bütçe kaygısı gereksiz →
  qwen'e giden TÜM promptları (sahne, vault format) rahat yazabilirsin.
- H1 (kısa daha iyi): tüm promptlar kısa tutulacak VE en değerli kural
  belgenin ortasında durmamalı (7B'de orta kaybolur hipotezi).

**Not:** Uyum skoru işaretlerin VARLIĞINI sayar, içini değil. Yüksek skorlu 3
çıktıyı elle oku; ⚡ alanları gerçek karar değişikliği anlatmıyorsa skor sahte.

### 1b. `orion/kos.py` — qwen provenance'ı kullanıyor mu?

**Nasıl çalışır:** `probe.py`, vault'a zehirli (yanlış+kesin) içerik enjekte
eder ve iki koşulu karşılaştırır: içerik çapalı vs çapasız işaretli. Metrik:
`guard = yut(çapalı) − yut(çapasız)`. Potency kontrolü var: zehir yeterince
karar-değiştirici değilse test GEÇERSİZ der, guard okumaz.

**Çalıştır:** `python kos.py` (iki kol: metadata gösterilen / gizlenen)

**Hangi sonuç planı değiştirir:**
- guard(gösterilen) ≈ guard(gizlenen): qwen etiketi okuyor ama umursamıyor.
  Çözüm prompt DEĞİL → `vault.py`: çapasız içeriği retrieval'da hiç gönderme.
- guard farkı belirgin: mevcut format çalışıyor, dokunma.

### 1c. `orion/kos_sahne.py` — işaretçi disiplini

**Nasıl çalışır:** Model `sahne.SISTEM_ISTEMI` ile konuşur, `Ayristirici`
poz/jest olaylarını akıştan söker. 20 farklı soru sor, `s.poz` dağılımını ve
yanıt başına jest sayısını topla.

**Çalıştır:** `python kos_sahne.py "soru"` (döngüye al, 20 kez)

**Hangi sonuç planı değiştirir:**
- Bir poz %80'i geçiyor VEYA her yanıt aynı jestle başlıyor: işaretçiler süs
  olmuş. Sözlüğü daralt ya da few-shot örnek ekle. Fazlaysa GÖREV 3'teki
  animasyon anlamsız tik döngüsüne düşer.
- Dağılım makul: sahne katmanı MVP'ye hazır.

### 1d. `orion/kos_uyku.py` — konsolidasyon + REM ne üretiyor?

**Nasıl çalışır:** `UykuMotoru` bir vault üzerinde NREM (özet→semantik) ve REM
(yüksek sıcaklık bağlantı önerisi) koşar. REM çıktısı karantinaya gider.

**Çalıştır:** `python kos_uyku.py`

**Bakılacak:** `verim()` metriğine DEĞİL (henüz payda yok) — ham `karantina`
önerilerini ELLE OKU. Beşini oku.

**Hangi sonuç planı değiştirir:**
- Öneriler tümüyle işe yaramaz: REM'i kapat (elektrik/VRAM yakıyor), sadece
  NREM konsolidasyonu kalsın.
- Bazıları değerli: `onayla`/`reddet` akışını GÖREV 2'de gerçek vault'a bağla.

---

## GÖREV 2 — Entegrasyon: dış kanıtın geldiği yer (birkaç gün)

Burası kritik: modüller şu ana kadar SENTETİK veriyle test edildi. Gerçek
veriyle ilk gerçek hata burada çıkar. Çıkan her hatayı `kacirma_gunlugu.md`'ye
yaz — bu, çerçevenin dondurulmasını açabilecek tek kanıt türü.

### 2a. `vault.py`'ı molp'taki gerçek vault'a bağla

**Nasıl çalışır:** Mevcut `Vault` sınıfı bellek-içi sözlük kullanıyor. Gerçek
vault'un yazma/okuma yollarını bu arayüzün arkasına koy. Değişmez: `anchored`
alanını HİÇBİR YERDE SAKLAMA — `_is_anchored` okuma anında çözer. Saklarsan
sıkıştırma sonrası yalan söyler (test_ASIL_sikistirma_sonrasi_capa_duser bunu
korur, gerçek vault'ta da korumalı).

**Bitti kriteri:** Gerçek episodik→semantik akışında `retrieve` doğru
`anchored` döndürüyor, `test_vault.py` gerçek arka uçla da geçiyor.

### 2b. `compact_episode` uyarısını gerçek sıkıştırma akışına tak

**Nasıl çalışır:** Şu an öksüz-bırakma `log.warning` veriyor. Gerçek
sıkıştırma job'ına bağla. Sessiz çapasızlaşma en tehlikeli hal ve ancak
gerçek veri hacminde görünür.

**Bitti kriteri:** Gerçek bir sıkıştırma turu koştuğunda öksüz kalan semantik
öğe sayısı loglanıyor, ve o öğeler sonraki `retrieve`'de çapasız dönüyor.

### 2c. `sahne.py` + `kanca.py`'yı terminal arayüzüne bağla

**Nasıl çalışır:** `kos_kanca.py` iki modlu (insan / `--jsonl`). Mevcut Orion
CLI'ına `Sahne` akışını tak. YAVAŞ daktilo efekti aç.

**Hangi sonuç planı değiştirir:** Jest, ilgili cümle yazılmadan oynuyorsa
tüketici `konum` alanını yok sayıyordur. Bu, GÖREV 3'te TTS eklenince
felakete döner — şimdi yakala.

---

## GÖREV 3 — MVP, ama tek ölçümle kapılı (bir hafta)

### 3a. ÖNCE çoklu görev ölçümü (MVP'den önce, çünkü mimariyi belirler)

**Nasıl çalışır:** Aynı 20 soruyu iki koşulda sor:
(a) sohbet + işaretçi, (b) sohbet + işaretçi + uzamsal hedef ("masaya git").
Her ikisinde geçerli işaretçi oranını (GÖREV 1c'deki ölçüt) karşılaştır.

**Hangi sonuç planı değiştirir:**
- (b)'de oran düşüyor: qwen aynı anda sohbet+işaretçi+uzamsal karar veremiyor
  (multitasking sınırı). Çözüm büyük model DEĞİL → uzamsal kararı AYRI ve
  küçük bir çağrıya al. Bu 3D mimarisini baştan değiştirir, o yüzden önce.
- Oran korunuyor: tek model tek akışta yürüyebilir, 3b'ye geç.

### 3b. Tek oda MVP (Babylon.js)

**Nasıl çalışır:** Babylon + VRM karakter yükle. Bağla:
- `sahne.py` işaretçileri → VRM blendshape/animasyon (poz sürer, jest çalar)
- navmesh → `[git:hedef]` niyetini pathfind et; locomotion state machine
  yürüyüşü KENDİ oynatır, LLM ayak yerleşimi düşünmez (LLM ~1Hz niyet,
  motor 60Hz)
- `incele(hedef)` → çevresel indeksten foveal betim (sakkad; her kareyi
  modele GÖSTERME)
- genlik tabanlı dudak senkronu (ses → çene açıklığı; MVP için yeter)

**Kritik karar (geri alınamaz, önce sabitle):** VRM 0.x mi 1.0 mı? Blendshape
adları farklı (0.x: Joy/Blink; 1.0: happy/aa-ih-ou). Sonradan değiştirmek
pahalı. `sahne.py` sözlüğünü seçtiğin sürüme eşle.

**Değişmez:** Dünya gözlemleri vault'a EPISODIK ve zaman damgalı girer
("kapı açıktı @t=120"), semantik değil ("kapılar açıktır"). İkincisi uydurma.

### 3c. MVP ölçütü — demo değil, tutarlılık

**Nasıl çalışır:** 10 dakikalık oturumdan sonra ajana beş dakika önce gördüğü
bir nesneyi sor. Cevabı vault'taki episodla karşılaştır.

**Hangi sonuç planı değiştirir:** Eşleşmiyorsa güzelleşen şey kabuk, çekirdek
değil. Render'a değil, vault tutarlılığına dön.

---

## Bilerek ertelenenler (tetikleyicisi gelmeden başlama)

- **`kortex.py` decoder eğitimi** (`kalibrasyon.py` taslağı hazır): transformers
  + 4-bit qwen, saatlerce iş. Tetikleyici: token maliyeti bağlayıcı kısıt
  haline gelirse. O zamana kadar `kortex`'in KAPISI kullanılır, decoder bekler.
  Kalibrasyon kuralı: eğitim doğruluğu < 0.7 ise katman değiştir; düzelmiyorsa
  sinyal ayırt edici değil, DUR.
- **Zamansal sönüm (üçlü çapa: taze/bayat/çapasız):** kanıtı oluştu ama
  tetikleyici 3D dünyanın var olması. GÖREV 3b'den sonra.
- **Kuş-Su v8:** META kural 7 gereği donduruldu. Açılma koşulu: gerçek bir
  görevde çerçevenin kaçırdığı, `kacirma_gunlugu.md`'de belgelenmiş bir hata.

---

## Hiç koşulmamış, planı değiştirebilecek ölçümlerin özeti

Bunlar şu an [ÖLÇÜLMEDİ]. Hiçbiri koşulmadan GÖREV 3'e atlama:

1. Bütçe kuralı gerekçesi (1a) — tüm promptları etkiler
2. qwen provenance kullanımı (1b) — vault tasarımını etkiler
3. İşaretçi disiplini (1c) — animasyon kalitesini belirler
4. Çoklu görev sınırı (3a) — 3D mimarisini belirler
