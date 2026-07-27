# Ön Plan — Grup A Tanı Aracı ("Prizma Sondu")

**Durum:** ÖN PLAN — spec değil, tasarım taslağı. Kod yazılmaz, VRAM harcanmaz,
MVP'den saat çalınmaz. MVP bitince açılacak zarf.
**Tarih:** 2026-07-23
**Kapsam kararı:** DAR — yalnızca Grup A. Genel açıklayıcı değil, kullanıcı özelliği değil.
**Model kararı (Claude):** Gerçek Meissa modeli (qwen2.5-coder:7b), proxy değil.
**Konsey ön koşulu (karşılandı):** "Hangi KANIT.md testi bunu gerektiriyor?" →
Grup A'nın kök nedeni, üç turdur "stokastik taban" diye kapatıldı; bu araç o
kapanışın doğru olup olmadığını test eder.

---

## 1. Problem: Grup A Tam Olarak Nedir

Meissa bir sınıflandırıcı olarak çalışırken, bazı girdilerde JSON şemasından
**tamamen çıkıp** doğal dille cevap veriyor (asistan moduna kayıyor). Üç turda
gözlemlenen kanıt:

- Kısa/informal/duygusal girdiler ("💀💀💀", "teşekkürler", "hocam kod yazıver")
- Teknik sorular ("SQL JOIN açıkla", "async await örneği") — model kategorize
  etmek yerine **soruyu cevaplamayı** tercih ediyor
- **En kritik gözlem:** aynı "async await" girdisi iki koşuda iki farklı sonuç
  verdi — birinde kesik JSON, birinde tam kod bloğu. Aynı girdi, aynı model,
  farklı çıktı.

Bu son gözlem yüzünden "stokastik taban" dedik ve durduk. Doğru karardı — düzeltilebilir
deterministik hata kalmamıştı. **Ama "stokastik" bir açıklama değil, bir kapanıştır.**
Bu araç o kapanışı açar: rastgele mi, yoksa modelin içinde belirli bir yapı mı
tetikliyor?

---

## 2. Hipotez (test edilecek)

Grup A, saf rastgelelik değil; belirli girdilerde modelin içinde bir **"rol
gerilimi"** oluşuyor: sistem promptu "sınıflandır" derken, girdinin kendisi
(özellikle teknik soru ya da sosyal temas) modelin eğitimden gelen "yardımcı ol"
eğilimini tetikliyor. İki eğilim çekişiyor; sampling sıcaklığı hangi tarafın
kazanacağını belirliyor — bu yüzden aynı girdi bazen JSON, bazen cevap üretiyor.

**Eğer hipotez doğruysa:** şemadan çıkışı tetikleyen belirli attention head'ler /
katmanlar / aktivasyon örüntüleri bulunabilir. Bu, "stokastik"i "koşullu-stokastik"e
çevirir — hangi koşulda kayma olasılığının arttığı bilinir.

**Eğer hipotez yanlışsa (saf rastgelelik):** aktivasyonlarda JSON-çıktı ve
doğal-dil-çıktı arasında ayırt edici bir örüntü bulunmaz. Bu da bir sonuç —
"stokastik taban" doğrulanır, düzeltme çabası bırakılır.

Not: her iki sonuç da değerli. Bu araç Grup A'yı *çözmeyi garanti etmez*; onu
*anlaşılır* kılar. Belki çözüm çıkar (prompt değişikliği), belki "gerçekten
rastgele" onayı çıkar. İkisi de kapanışı ilerletir.

---

## 3. Mimari (dar, tek amaçlı)

```
Grup A tetikleyen girdi seti (~30 örnek, loglardan)
        │
        ▼
TransformerLens + qwen2.5-coder:7b (hook'lu forward-pass)
        │
        ├─ Her girdi için: şema-promptu ile forward-pass çalıştır
        ├─ Aktivasyonları kaydet (attention, MLP, katman çıktıları)
        └─ Çıktıyı etiketle: JSON mı, doğal-dil mi?
        │
        ▼
Kontrastif analiz:
  "JSON üreten koşullar" vs "doğal-dile kayan koşullar"
  hangi head/katman/nöron ikisini ayırıyor?
        │
        ▼
Rapor: Grup A'nın nöral imzası (varsa) / imza yok (saf stokastik onayı)
```

**Kritik tasarım kısıtları (konsey ilkeleri korunuyor):**

- **Offline, talep-üzerine.** Canlı sohbet akışının tamamen dışında. Üretim
  rampasına asla girmez (Saatçi + Kantar şerhi).
- **Diffusion kapalı.** Bu oturum çalışırken ComfyUI yüklenmez — VRAM tamamen
  hook'lu inference'a ayrılır (Tera'nın VRAM reddi böyle aşılır: aynı anda değil,
  ayrı zamanda).
- **Yeni maliyet sınıfı:** `heavy_research` — mevcut skill tablosuna girmez,
  ayrı defterde tutulur.
- **KANIT.md zorunlu:** Bu aracın da testi olur — "bilinen JSON-üreten girdi →
  imza X, bilinen kayan girdi → imza Y, ayırt edilebiliyor mu?"

---

## 4. Veri Hazırlığı (MVP sırasında ücretsiz biriktirilebilir)

Bu, ön planın MVP'ye tek dokunuşu — ama sıfır ek iş: Meissa zaten loglarken
`edim` ve `context_dependent` alanlarını yazıyor. Tek eklenecek şey, Grup A
vakalarının (şemadan çıkanların) ayrı bir `groupA_corpus.jsonl` dosyasında
işaretlenmesi — ki bu zaten log'da var olan bilginin filtrelenmesi, yeni
ölçüm değil. MVP bitince bu corpus hazır bekler.

**Denge için gereken karşı-örnekler:** Aynı ya da benzer girdilerin JSON ürettiği
koşullar da toplanmalı (kontrastif analiz iki sınıf gerektirir). "async await"
örneği altın değerinde — hem JSON hem kayma üretti, aynı girdi. Bu tür
"ikili-davranışlı" girdiler özellikle işaretlenir.

---

## 5. Başarı Kriterleri

Bu araç başarılı sayılır eğer şunlardan **birini** üretirse:

1. **Nöral imza bulunur:** Belirli head/katman örüntüsü, kayan koşulları JSON
   koşullarından ayırt eder. → Grup A "koşullu" hale gelir, prompt/tasarım
   müdahalesi hedeflenebilir.
2. **İmza bulunmaz, saf rastgelelik doğrulanır:** Aktivasyonlarda ayırt edici
   yapı yok. → "Stokastik taban" kapanışı deneysel olarak onaylanır, Grup A
   düzeltme listesinden kalıcı çıkar.

**Başarısızlık:** Aracın kendisi çalışmaz (VRAM yetmez, hook'lar qwen mimarisine
oturmaz) → o zaman TransformerLens yerine daha ham bir yaklaşım (logit-lens,
manuel aktivasyon dump) değerlendirilir. Bu, planın B şıkkı olarak not edildi.

---

## 6. Neden "Prizma Sondu"

İsim tesadüf değil: TAYF prizmadan çıkan ışıktı (girdi → kategorilere ayrışma).
Bu araç, prizmanın *içine* bakan sond — ışığın neden bazen ayrışmayı reddedip
düz geçtiğini (şemadan çıkıp doğal dile kaymayı) inceliyor. Meissa'nın kendi
adı da Orion takımyıldızının başındaki yıldız; sond onun içine bakıyor.

---

## 7. MVP ile İlişki — Net Sınır

| | |
|---|---|
| MVP'ye etkisi | **Sıfır kod.** Tek dokunuş: Grup A vakalarının log'dan filtrelenip ayrı corpus'a işaretlenmesi (mevcut veriden, yeni ölçüm değil) |
| Ne zaman açılır | MVP resmi kapanışından (Hafta 5, Kazıcı imzası) sonra |
| Önceliği | Faz 11-sonrası — self-dev bile önce gelir |
| Kime gösterilir | Kimseye. Bu bir debug/araştırma aracı, kullanıcı özelliği değil |
| Görselleştirme | YOK. Matrix-tarzı ışıldayan ağ reddedildi (konsey kararı). Çıktı: rapor + kontrastif tablo, canlı animasyon değil |

---

## 8. Açık Sorular (MVP biterken cevaplanacak, şimdi değil)

1. TransformerLens qwen2.5-coder:7b'yi tam destekliyor mu, yoksa mimari
   uyarlaması gerekir mi? (MVP biterken 10 dakikalık fizibilite kontrolü)
2. ~30 örnek kontrastif analiz için yeterli mi, yoksa corpus 100+ olmalı mı?
   (Grup A oranı ~%3-4 → 600 koşuda ~20-25 vaka var, yeterli olmayabilir;
    MVP boyunca doğal birikim izlenir)
3. B şıkkı (logit-lens) TransformerLens'ten daha mı uygun? (fizibilite anında karar)

---

*Bu bir ön plandır. Onayı MVP kapanışında verilir, önce değil. Konsey filtresi
geçildi: tek amaçlı (Grup A), KANIT.md'li, üretim akışından izole, görselleştirmesiz.
Zarf hazır, raftaki yerinde bekliyor.*
