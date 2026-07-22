# OrionDeep MVP Planı — v1.1 (Revizyon)

**Tarih:** 2026-07-22
**Değişiklik kaynağı:** FIKIR_DEGERLENDIRME.md (6 fikir, konsey kararları)
**Takvim durumu:** DEĞİŞMEDİ — 5 haftalık MVP korunuyor. Revizyonlar faz
tanımlarına ve ilkelere işlendi; hiçbir yeni hafta açılmadı, bir faz (9) küçüldü.

**v1.0'dan farkların özeti:**
1. Yeni bölüm: "Adlandırılmış İlkeler" (Sistem-1 Dürüstlüğü, Sentor Anlaşması, Süreç İlkesi)
2. Faz 9 yeniden tanımlandı: orchestration motoru → yeniden-giriş (re-entry) deseni
3. Faz 7 iki katmanlı tanıma kavuştu (telemetri görseli + dönemsel vault görseli)
4. Faz 11'e görsel-hafıza editi ve ham-veri kuralı eklendi
5. TAYF kapsamı ikiye ayrıldı: TAYF-Şema + TAYF-Komut
6. Kod kurallarına 2 madde eklendi (insana-okunur skill, chain_id)
7. Mevcut ilerleme kaydedildi: Hafta 1 fiilen tamamlandı, image skill erken bitti

---

## Adlandırılmış İlkeler (yeni bölüm — tüm fazların üstünde)

### İ1 — Sistem-1 Dürüstlüğü
Hızlı katman (Seviye 0) hiçbir zaman tahmin etmez; tahmin gerektiren her şey yavaş
katmanın (LLM) işidir. Hızlı katmanın erdemi hızı değil, **ne bilmediğini bilmesidir**.
Kanıt: 3. tur, %58 kural-çözümü + sohbet kategorisinin bilinçli LLM'e bırakılması.
Uygulama kuralı: Seviye 0'a yeni trigger eklerken soru şu değildir "bunu yakalayabilir
miyim?" — şudur: "bunu **kesin** yakalayabilir miyim?" Kesin değilse eklenmez.

### İ2 — Sentor Anlaşması (insan tarafı)
Devredilmeyen kaslar: kategori isabetinin elle kontrolü, KANIT.md okuma/imza,
konsey kararları, anomali yorumu. Devredilen yükler: kod yazımı, batch koşuları,
log toplama. Her faz kapanışında iki soru sesli sorulur: *"Bu fazda öğrenmem
gereken şeyi ben mi öğrendim?"* ve *"Çıktıyı hâlâ yargılayabiliyor muyum?"*
İkincisine hayır cevabı, faz kapanışını bloklar (uyurgezerlik sigortası).

### İ3 — Süreç İlkesi (dalga)
Sistem nesne değil süreçtir: kalıcı olan bileşenler (vault, ajanlar, VRAM) ortamdır;
işin kendisi içlerinden geçen event akışıdır. İki türev kural:
(a) "Her özellik önce event yayar" — görünmeyen iş yapılmamış iştir (v1.0'dan, artık gerekçeli).
(b) **Hiçbir zincir iz bırakmadan ölmez** — biten her zincirin enerjisi loglara,
vault imzalarına ve rejections'a dağılır; chain_id ile nereye dağıldığı izlenir.

### İ4 — Anomali İlkesi (Hokusai / v1.0 sonrası eklenmişti, buraya taşındı)
Anomali loglama hiçbir zaman "gürültü temizliği" değildir. Anomaliler sistemin
Hokusai çizimleridir — ölçüm cihazı hazır olana kadar saklanır. Taban-oran kabul
edilen hatalar bile silinmez, etiketlenir; 500+ koşu birikince korelasyon kontrolü
yapılır (rogue-wave kontrolü: bağımsız görünen hatalar birbirini besliyor mu?).

---

## Mevcut Durum (v1.1 itibarıyla fiili ilerleme)

| İş | Durum |
|---|---|
| Meissa kategorize ajanı | ✅ 3 tur × 100 koşu; %95 parse (Seviye 0 sonrası) |
| Seviye 0 kural katmanı | ✅ level0.ts + 38 test; %58 kural-çözümü; LLM hacmi −%60 |
| Saçma-girdi protokolü | ✅ uygulandı (Kazıcı) |
| Image skill (ComfyUI) | ✅ erken tamamlandı — 12 workflow, MCP araçları dahil |
| TAYF damıtım altyapısı | ✅ tayf_distill.js + level×kategori kırılımı; damıtımın kendisi bekliyor |
| Bilinen açık uçlar | Şema kapısı (enum-dışı değerler) · palet-senkron kuralı (yazıldı, uygulanacak) |
| Kuyruk/rampa (Hafta 2) | ⏳ başlamadı — Kantar defterinde 2 timeout veri noktası hazır bekliyor |
| Görev yöneticisi (Hafta 3) | ⏳ başlamadı |
| TTS skill (Hafta 4) | ⏳ başlamadı |

Hafta 1 fiilen kapandı (İ2 kontrolü yapılmadan resmi kapanış sayılmaz —
Özgür'ün elle 50 mesaj kategori kontrolü hâlâ açık görev).

---

## Fazlar (revize tanımlar — değişenler işaretli)

### Hafta 1 — Meissa ✅ (tamamlandı; kapanış koşulu: elle 50-mesaj kontrolü + Kazıcı imzası)

### Hafta 2 — Kuyruk + Rampa (değişiklik yok, bir ek girdi)
Eşapman mekanizması, VRAM devir-teslim, telemetri. **Ek girdi:** Kantar defterindeki
iki timeout gözlemi (ornith 4/100, qwen 4. ardışık tur 1/100) — kuyruk tasarımına
"ardışık yük sonrası soğuma" sorusu test maddesi olarak girer.

### Hafta 3 — Görev Yöneticisi (değişiklik yok)
TUI sekmesi + gömülü HTML/SSE sayfa. Rampa satırı (Kantar). Branch-hafıza checkpoint.

### Hafta 4 — Skill Standardı + TTS (küçük ek)
Image skill'den şablon; TTS (Piper) ikinci skill. **Ek (Fikir 1):** şablonun zorunlu
parçası artık üç dosya: `manifest + KANIT.md + <skill>.md` (insana okunur talimat).
Var olmayan .md, skill'i MVP dışında bırakır.

### Hafta 5 — MVP Kapanış (değişiklik yok)
100 gerçek koşu, Kazıcı denetimi, canlı demo, İ2 soruları sesli.

---

## MVP-Sonrası Fazlar (revize)

### Faz 6 — TAYF v0.1 (kapsam netleşti — Fikir 5)
TAYF artık iki parça, ikisi de damıtılır, yazılmaz:
- **TAYF-Şema:** kategoriler, karmaşıklık (1-3), rota. Veri: 600+ Meissa logu.
  Bekleyen işler bu faza bağlandı: şema kapısı (enum-dışı değer normalizasyonu) +
  palet↔level0.ts senkron kuralının ilk uygulaması (tamamlanma kriteri: 38 test yeşil).
- **TAYF-Komut:** `/skill arg --param değer` sözdizimi. Veri: mevcut `/image` deseni +
  Faz 9 zincir logları biriktikçe genişler. İlk sürümde yalnızca çalışan skill'lerin
  komutları tanımlanır — spekülatif komut tanımı yasak (Fırça).

### Faz 7 — Takımyıldız Görseli (iki katman — Fikir 2)
- **Katman A — canlı telemetri:** event stream → canvas; ritim imzası (Saatçi),
  yıldız doğum/ölüm, rampa nabzı. Gerçek zamanlı.
- **Katman B — dönemsel vault görseli:** haftalık, boşta koşan bir iş; vault
  imzaları → image skill → "bu haftaki gökyüzü". **Sınır (lineage dersi):** görsel,
  kimliğin kaynağı değil render'ıdır — vault ve rejections'ta birikenin izdüşümü.
  Görselden geriye hiçbir sistem beslenmez (fotokopinin fotokopisi yasağı).
- Kantar şerhi: Katman B rampa kuyruğuna normal iş olarak girer, gece/boşta koşar.

### Faz 8 — 3D/Video Skill'leri (değişiklik yok + bir hatırlatma)
Şablondan türetilir. Hatırlatma (TAYF notundan): "3d" şu an "resim"e katlı —
bu faz başlarken ayrı kategori olarak ayrılması değerlendirilecek.

### Faz 9 — Zincirleme: Yeniden-Giriş Deseni (YENİDEN TANIMLANDI — Fikir 4)
**Eski tanım (iptal):** ayrı orchestration motoru/skill'i.
**Yeni tanım:** Agent çıktısının sonundaki `/komut` satırı doğrudan yürütülmez;
**yeni girdi olarak hattın başına döner:** `/komut → Seviye 0 → (Meissa) → rota → skill`.
Zincir = hattın kendi üzerine kıvrılması. Ayrı beyin yok, mevcut parçalar var.

Korkuluklar (dördü de MVP-sonrası ilk zincir koşusundan önce kodda olmak zorunda):
1. **Bütçe (Tera):** zincir başına toplam token tavanı; aşımda zincir durur, yeri loglanır.
2. **Derinlik (Saatçi):** maks. zincir derinliği = 3 (ilk değer); her halka kuyruğa
   normal öncelikle girer.
3. **Rampa (Kantar):** her halka rezervasyondan geçer — /komut kuyruğu tetikler, LLM'i değil.
4. **Köken (Kazıcı):** her zincir `chain_id` taşır; **dış-kaynaklı** (vault/web/dosya
   içinden gelen) /komut varsayılan olarak yürütülmez, kullanıcıya önerilir.
   Kullanıcı-kaynaklı ile dış-kaynaklı /komut loglarda ayrı etiketlenir.

Kaşık kuralının yeni ifadesi: *"Serbest metin skill tetikleyemez — /komut dahil.
Tetikleyen her zaman Seviye 0/Meissa çıktısıdır; /komut yalnızca aday girdidir."*

### Faz 10 — Çoklu Persona / Toplantı Skill'i (değişiklik yok)

### Faz 11 — Self-Dev (genişletilmiş kapsam — Fikir 3)
DGM-tarzı kanıt kapısı korunuyor: değişiklik ancak KANIT.md testlerini geçerse uygulanır.
**Eklenen kapsam:** görsel hafıza düzenlemesi de öz-değişikliktir, aynı kapıdan geçer.
**Eklenen kural (ham-veri):** agent hafıza görselini editlerken kaynak her zaman ham
vault verisidir, önceki görselin kendisi değil — kendi çıktısının çıktısıyla beslenme
yasak (lineage çekici-çöküşü kanıtı gerekçe olarak dosyaya iliştirildi).

---

## Kod Kuralları (v1.1 — iki ek madde)

1. Bağımlılıksızlık: stdlib + mevcut npm sınırı korunur
2. Her ajan: tek görev + manifest
3. Kaşık kuralı (güncellendi): serbest metin skill tetikleyemez — **/komut dahil**;
   tetikleyen yalnız Seviye 0/Meissa çıktısıdır
4. Boş çıktı `"(boş)"` ile maskelenmez; bayrakla işaretlenir
5. Her özellik önce event yayar (İ3-a)
6. KANIT.md olmayan kod MVP'ye girmez
7. **YENİ — İnsana-okunur skill:** her skill'in davranışı insana okunur bir .md'de
   yazılır; kod o talimatın yürütücüsüdür. İnsanın okuyup anlayamadığı skill,
   denetlenemez skill'dir.
8. **YENİ — Zincir izi:** çok-halkalı her iş chain_id taşır; hiçbir zincir iz
   bırakmadan ölmez (İ3-b).

---

## Risk Tablosu (güncellendi)

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| VRAM deadlock | Orta | Yüksek | Eşapman testleri + Kantar'ın 2 timeout verisi Hafta 2'ye girdi |
| Zincir kaçağı (sonsuz /komut döngüsü) | **Yeni** | Yüksek | Faz 9'un 4 korkuluğu — kodsuz zincir koşusu yasak |
| Dış-kaynak /komut injection | **Yeni** | Yüksek | Kazıcı kuralı: dış-kaynak = öneri, yürütme değil |
| Meissa hassasiyeti | Orta | Orta | Elle 50 mesaj (İ2 — hâlâ açık, Hafta 1 kapanış koşulu) |
| Scope creep | Yüksek | Yüksek | Bu revizyonun kendisi test edildi: 6 fikir → 0 yeni hafta |
| Uyurgezerlik (insan tarafı) | Orta | Yüksek | İ2 soruları her faz kapanışında sesli + Kazıcı imzası |

---

## Kapanış Notu

Bu revizyonun kendisi bir ölçümdü: altı fikir geldi, takvime sıfır hafta eklendi,
bir faz küçüldü. "Yeni özellik değil revizyon" ilkesi tutturuldu. Sıradaki somut
işler değişmedi ve sırası netleşti:

1. **Elle 50-mesaj kontrolü** (İ2 — Hafta 1'in resmi kapanışı, Özgür'ün kası)
2. **TAYF-Şema damıtımı** + şema kapısı + palet senkronu → tek commit
3. **Hafta 2: Kuyruk/rampa** (Kantar'ın timeout verileri girdi olarak hazır)

*v1.1 — Konsey imzaları: Tera ✓ · Fırça ✓ · Saatçi ✓ · Kantar ✓ · Kazıcı ✓*
*İnsan imzası bekleniyor: Özgür — İ2 kontrolüyle birlikte.*
