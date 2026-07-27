# Fikir Değerlendirme Raporu — Plan Revizyonu Girdisi

**Tarih:** 2026-07-22
**İlke:** Yeni özellik eklemek değil, planı revize etmek. Her fikir tek tek değerlendirildi;
karar dili: **KABUL** (plana işlenir) / **KATLA** (zaten var olan bir faza katlanır, yeni iş açmaz) /
**ERTELE** (tarihli, gerekçeli) / **RED** (gerekçeli).

---

## Fikir 1 — "Promptlar insana yazılmış gibi olsun, yapı skill olarak dursun"

**Karar: KATLA (zaten böyle — ilke olarak adlandırılıp sabitlenir)**

Mevcut durum bunu zaten yapıyor: `~/.orion/skills/image-generation.md` insana okunur
bir talimat dosyası; fuzzy match ile modele enjekte ediliyor. Kod (imager.js) ile talimat
(.md) ayrı yaşıyor. Fırça'nın "skill = .md + tetikleyici kalıp" standardı bunun ta kendisi.

**Revizyon olarak işlenecek tek şey:** Bu bir tesadüf değil, ilke olsun.
Kod kurallarına eklenecek madde: *"Her skill'in davranışı insana okunur bir .md
dosyasında yazılır; kod yalnızca o talimatın yürütücüsüdür. Bir insanın okuyup
anlayamadığı skill, denetlenemez skill'dir."* Bu, Kazıcı'nın KANIT.md protokolüyle
aynı ailedendir: talimat da kanıt gibi insana yazılır.

**Neden önemli (dalga çerçevesiyle):** Videodaki "chicken translation" uyarısı —
sonucu yargılayamıyorsan aracın aracı olursun. İnsana okunur promptlar, senin
yargılama yetini devrede tutar: her skill'in ne yaptığını .md'den okuyup
"bu doğru mu" diyebilirsin. Makine-okur DSL'e erken geçiş, seni kendi
sisteminin dışına iter.

---

## Fikir 2 — "Hafızayı resimleştirmek: konunun görsel anlatımı, persona'nın resimle desteklenmesi"

**Karar: KATLA (Faz 7'ye — Takımyıldız görseli fazının kapsamı genişletilmeden netleştirilir)**

Bu fikir yeni değil — bu sohbette daha önce vardığımız "rüya döngüsünün çıktı formatı
görsel olsun" kararının geri dönüşü, ve Faz 7 (takımyıldız) zaten bunun altyapısı.
Revizyon şu: Faz 7'nin tanımı iki katmanlı hale gelir, ama tek faz olarak kalır:

- **Katman A (mevcut tanım):** Sistem telemetrisinin canlı görseli — ritim imzası,
  yıldız doğum/ölüm. Kaynak: event stream. Gerçek zamanlı.
- **Katman B (bu fikirle netleşen):** Vault durumunun dönemsel görsel özeti —
  Orion'un "bu haftaki gökyüzü". Kaynak: vault imzaları → ComfyUI (mevcut image skill,
  workflow'lar hazır). Dönemsel (haftalık), gerçek zamanlı değil.

**Kritik sınır (lineage dersinden):** Persona'yı resimle *tanımlamak* ile persona'nın
*izdüşümünü* resimle göstermek farklı şeyler. Lineage deneyi gösterdi: beyan edilen
kimlik taşınmıyor, biriken kimlik taşınıyor. Görsel, kimliğin **kaynağı olamaz** —
yalnızca vault'ta ve rejections'ta birikenin bir **render'ı** olabilir (Saatçi'nin
"tek üretim, çok görünüm" ilkesi: görsel de bir render kanalıdır, ayrı bir kimlik
deposu değil). Bu sınır Faz 7 tanımına yazılır.

**Kantar'ın şerhi:** Katman B, image skill'i kullanır → rampa kuyruğuna girer.
Haftalık dönemsellik bunu çözer (gece, boşta koşar). Gerçek zamanlı görsel-hafıza
istenirse RED — 8GB rampada sohbet + diffusion eşzamanlılığı yok.

---

## Fikir 3 — "İleride agent kendi görsel hafızasını editleyebilsin"

**Karar: ERTELE (Faz 11'e — self-dev'in bir alt maddesi olarak, kanıt kapısıyla)**

Bu, kendi hafızasını değiştiren sistem demek — self-dev ailesinin tam üyesi.
Kazıcı'nın veto ilkesi geçerli: DGM-tarzı ampirik kanıt kapısı olmadan hiçbir
öz-değişiklik yok. Faz 11 tanımına tek satır eklenir: *"Öz-düzenleme kapsamına
görsel hafıza düzenlemesi de dahildir — aynı kanıt kapısından geçer."*

**Ek gerekçe (videodan):** "Fotokopinin fotokopisi" uyarısı burada birebir geçerli —
agent kendi hafıza görselini editleyip sonra o görselden beslenirse, kendi
çıktısının çıktısıyla beslenen bir döngü kurulur. Lineage'da bunun ne ürettiğini
ölçtük: çekiciye çöküş ("Sevgilim"in on nesil kopyalanması). Editleme hakkı
verilecekse, editin kaynağı her zaman ham vault verisi olmalı, önceki görselin
kendisi değil. Bu kural şimdiden Faz 11 notuna yazılır ki unutulmasın.

---

## Fikir 4 — "Cevabın sonuna /komut: agent çıktısı diğer skill'leri tetiklesin, loop kurulsun"

**Karar: KABUL — ama kaşık kuralıyla barıştırılmış haliyle (Faz 9'un mekanizması olur)**

Bu, değerlendirilen fikirlerin en önemlisi ve tek gerçek mimari revizyon.

**Çatışma:** Konsey kuralı der ki *"serbest metin skill tetikleyemez; yalnız Meissa
çıktısı tetikler."* Agent'ın ürettiği cevabın sonundaki `/imagenation bana bir
manzara yap` satırı serbest metindir — doğrudan yürütülürse kaşık kuralı delinir
ve prompt-injection kapısı açılır (vault'tan ya da web'den gelen bir metin de
cevabın içine /komut sokabilir).

**Çözüm — yeniden-giriş (re-entry) deseni:** Agent çıktısının sonundaki /komut
**doğrudan yürütülmez**; sistem onu **yeni bir kullanıcı-girdisi gibi** hattın
başına geri sokar: /komut → Seviye 0 → (gerekirse Meissa) → rota → skill.
Yani zincirleme, orkestratör denen ayrı bir beyinle değil, mevcut hattın kendi
üzerine kıvrılmasıyla olur. Kaşık kuralı korunur: tetikleyen şey yine yalnızca
Meissa/Seviye-0 çıktısıdır; /komut sadece bir *aday girdi*dir.

Bu desen Faz 9'un ("Orchestration Skill") tanımını **değiştirir ve
küçültür**: ayrı bir orchestration motoru yazılmayacak; zincir = çıktı → yeniden-giriş
→ rota döngüsü. Daha az kod, daha çok mevcut parça.

**Zorunlu korkuluklar (loop guard) — konsey imzalı:**
- **Tera:** zincir başına toplam token bütçesi; aşılırsa zincir durur, durduğu yer loglanır.
- **Saatçi:** maksimum zincir derinliği (MVP-sonrası ilk değer: 3) + her halka kuyruğa
  normal iş olarak girer, öncelik atlamaz.
- **Kantar:** zincirin her halkası rampa rezervasyonundan geçer — /komut'un LLM'i değil
  kuyruğu tetiklediği unutulmasın.
- **Kazıcı:** her zincir bir `chain_id` taşır; halkalar bu id ile loglanır — "bu görsel
  hangi sohbetin kaçıncı halkasından doğdu" sorusu her zaman cevaplanabilir olmalı.
  Ayrıca: vault/web kaynaklı metinden gelen /komut, kullanıcı-kaynaklı /komut'tan
  ayrı etiketlenir ve varsayılan olarak **yürütülmez, önerilir** (kullanıcı onayı ister).

---

## Fikir 5 — "Her agent'in görev ağı; Orion bir kodlama dili gibi çağrılabilsin"

**Karar: KATLA (TAYF'ın kapsam tanımına — TAYF damıtımı bunu içerecek şekilde netleşir)**

Bu fikir aslında TAYF'ın ta başındaki tanımıydı ("skill prompt dili") — Meissa'nın
kategorize şeması işin yarısı, /komut sözdizimi öbür yarısı. Revizyon: TAYF v0.1'in
kapsamı iki parça olarak yazılır:

1. **TAYF-Şema:** kategoriler, karmaşıklık, rota (damıtım verisi: 600+ Meissa logu) — mevcut iş.
2. **TAYF-Komut:** `/skill arg --param değer` sözdizimi (damıtım verisi: mevcut
   `/image <prompt> --workflow N` deseni + Fikir 4'ün yeniden-giriş halkaları
   loglandıkça birikecek gerçek /komut örnekleri).

İkisi aynı dilin iki yüzü: Şema, sistemin *girdiyi nasıl okuduğu*; Komut, sistemin
*kendi kendine nasıl seslendiği*. Fırça'nın damıtım ilkesi ikisine de uygulanır —
Komut sözdizimi de masa başında değil, image skill'in çalışan deseninden ve
zincir loglarından genişler. "Orion'u bir dil gibi çağırmak" = TAYF-Komut'un
MCP üzerinden dışa açılması — bu zaten `orion-mcp.js`'te var olan kapının
(generate_image vb.) genelleştirilmesidir, yeni sistem değil.

---

## Fikir 6 — Hızlı/yavaş düşünme (video 1) ve dalga/süreç çerçevesi (video 2)

**Karar: KABUL — kod değil, planın adlandırılmış ilkeleri olarak**

### 6a. Sistem 1 / Sistem 2 → zaten inşa ettik, şimdi adını koyuyoruz

Kahneman'ın iki sistemi, üç-seviyeli Meissa mimarisinin birebir karşılığı çıktı —
tasarlarken farkında değildik, video adını koydu:

| Kahneman | Bizim mimari | Özellik |
|---|---|---|
| Sistem 1 — hızlı, sezgisel, kalıp tanıyan | **Seviye 0** (kural katmanı, ~1ms) | Satranç ustasının kalıp tanıması: net trigger → anında rota |
| Sistem 2 — yavaş, hesaplayan | **Seviye 2** (Meissa/LLM, ~4-6sn) | Belirsizlik, çakışma, bağlaç → düşünmeye değer |

Videonun asıl uyarısı bizim tasarımın en kritik satırını doğruluyor: Sistem 1'in
tuzağı, **emin olmadığı yerde de cevap vermesidir** (5 makine sorusu, 100 dakika
cevabı). Seviye 0 tam bu tuzağa karşı "kesinlik-öncelikli" kuruldu: net eşleşme
yoksa karar VERMEZ, Sistem 2'ye düşürür. Bu artık planın adlandırılmış ilkesi:

> **Sistem-1 Dürüstlüğü:** Hızlı katman hiçbir zaman tahmin etmez. Tahmin
> gerektiren her şey yavaş katmanın işidir. Hızlı katmanın tek erdemi hızı değil,
> *ne bilmediğini bilmesidir.* (Bugünkü kanıt: %58 Seviye-0 çözümü, sohbet
> kategorisinin bilerek LLM'e bırakılması.)

### 6b. Sentor filtresi → Özgür'ün kendi çalışma anlaşması

Videonun iki sorusu ("Bunu öğrenmem gerekir mi?" / "Cevabı hâlâ yargılayabiliyor
muyum?") bu projenin insan tarafına, yani sana uygulanır. Plan zaten bunu içeriyor
ama dağınık; tek yere toplanır:

- **Senin kasın olan işler (yapay zekaya devredilmez):** kategori isabetinin elle
  kontrolü (50 mesaj), KANIT.md testlerinin okunup imzalanması, konsey kararları,
  anomali yorumlama. Bunlar "Londra taksicisinin hipokampüsü" — bu projede
  uzman olan sensin, bu kaslar körelirse proje sahipsiz kalır.
- **Devredilen yükler (araç uzantı olur):** kod yazımı (Claude Code), batch koşuları,
  log toplama, format dönüşümleri.
- **Uyurgezerlik sigortası:** Kazıcı'nın "canlı denetim/yol denetimi" maddesi tam bu —
  sonuçlara değil, ara adımlara da bakılır. BCG deneyinin dersi: AI ne kadar
  iyiyse insan o kadar az bakar; bizim panzehir, denetimi ritüelleştirmek
  (her faz sonu, imzalı).

### 6c. Dalga/süreç çerçevesi → iki mevcut ilkenin derinleşmesi

Video 2'nin tezi ("dalga sudan yapılmamıştır; su ortam, ilerleyen şey enerji")
mimaride iki karşılık buluyor, ikisi de yeni değil ama artık gerekçeli:

1. **"Her özellik önce event yayar"** kuralının gerçek anlamı: sistemin nesnesi
   yok, süreci var. Vault, ajanlar, VRAM — bunlar *ortam* (su); işin kendisi
   içlerinden geçen event akışı (enerji). Görev yöneticisinin gösterdiği şey
   nesnelerin listesi değil, o anda ortamdan geçen enerjinin haritasıdır.
   Takımyıldız görseli (Faz 7) bu cümlenin resmidir.
2. **Zincirin ölümü kayıp değildir:** Dalga kıyıda kırılınca enerji ses+ısı+harekete
   dağılır. Bir zincir/branch bittiğinde enerjisi loglara, vault imzalarına ve
   rejections'a dağılır — hiçbir koşu iz bırakmadan bitmez. Bu, anomali ilkesinin
   ("anomaliler Hokusai çizimleridir") enerji-korunumu diliyle yeniden ifadesi.
   Pratik karşılığı Fikir 4'ün chain_id kuralı: her halkanın nereye dağıldığı izlenir.

---

## Özet Karar Tablosu

| # | Fikir | Karar | Nereye işlenir |
|---|---|---|---|
| 1 | İnsana okunur skill promptları | KATLA | Kod kuralları (yeni madde) |
| 2 | Hafızanın resimleştirilmesi | KATLA | Faz 7 (iki katmanlı tanım + render sınırı) |
| 3 | Agent'in görsel hafıza editi | ERTELE | Faz 11 (kanıt kapısı + ham-veri kuralı) |
| 4 | /komut ile skill zinciri | **KABUL** | Faz 9 yeniden tanımlanır (yeniden-giriş deseni + 4 korkuluk) |
| 5 | Görev ağı / Orion bir dil gibi | KATLA | TAYF kapsamı ikiye ayrılır (Şema + Komut) |
| 6 | Hızlı/yavaş düşünme + dalga | KABUL | Planın ilkeler bölümü (Sistem-1 Dürüstlüğü, Sentor Anlaşması, Süreç İlkesi) |

**MVP takvimi değişmedi.** Hiçbir fikir yeni hafta açmadı; biri (Fikir 4) bir fazı
küçülttü, gerisi mevcut fazlara katlandı ya da ilkeye dönüştü.

---

*Konsey onayı: Tera ✓ (bütçe korkulukları) · Fırça ✓ (Komut da damıtılır, yazılmaz) ·
Saatçi ✓ (zincir kuyruğa saygılı) · Kantar ✓ (rampa deliğine /komut istisnası yok) ·
Kazıcı ✓ (chain_id + dış-kaynak /komut varsayılan yürütülmez)*
