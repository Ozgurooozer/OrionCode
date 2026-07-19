# ORION — 02. Geçmiş ve Yolculuk
> Buraya nasıl gelindi: kronolojik hikaye, büyük hatalar, bulgular, dersler.
> Bu dosya "neden böyle karar verdik" sorusunun cevabı — tekrar aynı hatalara
> düşmemek için bir hafıza.

---

## Evre 1 — Planlama ve Vizyon Genişlemesi

Proje, "sıfırdan bir kod ajanı yazalım" fikriyle başladı. Erken planlamada
şu genişleme yaşandı: CLI çekirdeği + vault/hafıza + node-graph editör +
Blender copilot + ComfyUI + Babylon.js editör + local model orkestrasyonu
— sekiz parçalı bir "fabrika" vizyonu netleşti. Öncelik sırası baştan
belirlendi: önce çekirdek, sonra bağlanma, en son para (kasıtlı düşük
öncelik).

**Erken karar:** Babylon.js editörü (büyük iş) bilinçli olarak Faz 3'e
ertelendi. Bu disiplin sonradan defalarca faydalı oldu — kapsam
genişlemesi büyük ölçüde bu sınırın içinde kaldı.

---

## Evre 2 — "Harness Mühendisliği" Çerçevesi

Araştırma (arXiv taraması) sonucunda, modern ajan sistemlerinin
güvenilirliğinin modelden değil, etrafındaki "harness"tan (memory + skills
+ protocols + permission/control/observability) geldiği bulundu. Orion'un
rolü bu çerçevede netleşti: bir "harness mühendisi" — model + local
modeller + tool'ları + hafızayı bir arada tutan koşum takımı.

Bu evrede vault'un 4 katmanlı şeması (working/episodic/semantic/
personalized) tasarlandı ve mevcut koda haritalandı.

---

## Evre 3 — Aşırı Deneysel Genişleme ("10 Bilim İnsanı" Turu)

Kullanıcı, "farklı bir ajan yapmak istiyorum, çığır açıcı fikirler"
isteğiyle geniş bir araştırma turu istedi. Bu, çok sayıda ileri düzey
fikrin (bazıları literatürden, bazıları özgün sentez) ortaya çıkmasına yol
açtı:

- **FEP/Aktif Çıkarım** — ajan kararını "en iyi cevap" yerine serbest-enerji
  minimizasyonu (pragmatik + epistemik değer) ile almalı fikri
- **ICV (görev-vektörü aktarımı)** — local model aktivasyonlarından "görev
  ruhu" çıkarıp başka bağlama enjekte etme
- **Blackboard koordinasyonu** — merkezi orkestratör yerine paylaşılan
  durum + kendi aktivasyonunu hesaplayan uzmanlar
- **Weakness Mining** — ajanın kendi başarısızlık deseninden tool
  tanımlarını iyileştirmesi (Self-Harness literatüründen esinlenme)
- **Spekülatif salt-okunur yürütme** — cloud model düşünürken local model
  bir sonraki tool çağrısını tahmin edip önden çalıştırması

Bunların hepsi PLAN.md'ye kaydedildi, bazıları (Weakness Mining, Spekülatif
Yürütme, FEP) "Faz 0" olarak koda döküldü.

**Bu evrenin riski:** Süslü/deneysel katmanlara ayrılan zaman, temelin
(vault'un gerçekten çalışıp çalışmadığı) sorgulanmasını geciktirdi.

---

## Evre 4 — "Çorba" Teşhisi ve Düzeltme

Kullanıcı kritik bir soru sordu: *"Bir CLI ajanı bu kadar zaman alır mı?
Amacımız neydi — daha iyi kod yazan, daha iyi hafızaya sahip bir ajan."*

Dürüst değerlendirme yapıldı: Evet, sapılmıştı. Süslü katmanlara (FEP,
ICV, blackboard, felsefi tartışmalar) çok zaman gitmişti, ama en temel
vaadin (vault gerçekten çalışıyor mu) hiç sistemli test edilmemişti.

**Karar:** Süslü/deneysel katmanlar **dondu** (silinmedi, PLAN.md'de
kayıtlı kaldı). Odak iki somut eksene çekildi: **daha iyi kod yazan** ve
**daha iyi hafızaya sahip** ajan. Bu karar, sonraki tüm evrelerin
çerçevesini belirledi.

---

## Evre 5 — V→F→B→C→S Zinciri (Büyük Hata Avı)

Bir kullanıcı testinde ("Orion'a neler yapabildiğini sor") **kuantum
araştırmasıyla ilgili içerik sızdığı** görüldü — bu, temelin göründüğünden
daha az sağlam olduğunun ilk somut kanıtıydı. Bu, yedi adımlı bir zincire
yol açtı, her adım canlı doğrulanarak yürütüldü:

| Adım | Bulgu |
|---|---|
| **V** (gözlem) | `vault_kaydet` hep ham alıntıya düşüyordu, hiç gerçek özet üretmemişti |
| **F** (kök neden) | Yanlış model adı + embedding modelinin chat fallback'e sızması + `<think>` bloğunun temizlenmeden parse edilmesi |
| **B** (spekülatif yürütme) | "Entegre değil" sanılıyordu, aslında entegreydi ama tahmin şeması yanlış olduğu için hiç isabet edemiyordu |
| **C** (FEP gölge modu) | Gerçek telemetriyle karşılaştırma hiç yapılmamıştı — yapıldı, sapma oranı ölçüldü |
| **S** (sessiz catch taraması) | 58 kod bloğu tarandı, 15'i gerçek sessiz-başarısızlıktı, görünür kılındı |

**En kritik ders (Kural 7'nin somut kanıtı):** Önceki bir tarihte "düzeltildi
ve doğrulandı" denen üç iş (Weakness Mining, Spekülatif Yürütme, FEP),
yeniden bakılınca üçü de eksik/yanlış doğrulanmış çıktı. **"Yazıldı + birim
testi geçti" ile "gerçek veriyle uçtan uca doğrulandı" arasındaki fark, bu
tek zincirde üç kez aynı yönde yanıltmıştı.**

---

## Evre 6 — Kimlik Sızıntısı Olayı (QSE/Kuantum)

Kaynak araştırması derinleştirildiğinde, sızıntının kaynağının **vault
değil, PERSONA.md'nin kendi açılış cümlesi** olduğu bulundu — o cümle,
kullanıcının ayrı QSE/kuantum araştırma projesinden esinlenerek yazılmıştı
ve her turda sistem promptuna giriyordu. Zayıf modeller bunu "benim mevcut
projem/yeteneğim" sanıyordu.

**Düzeltme:** PERSONA.md tamamen yeniden yazıldı — QSE/WHT/FEP/Qiskit/Cirq/
ATLAS referansları sıfıra indirildi, tüm örnekler Orion'un **kendi gerçek
geçmişinden** (V→F→B→C→S zinciri gibi) alındı. Canlı doğrulandı: aynı soru
tekrar sorulduğunda sızıntı bitmişti.

**İkinci bir tekrar:** Daha sonra Orion'un kendi ağzından "isteklerim" olarak
sunulan bir mesajda yine "ATLAS" ismi ve uydurulmuş bir "300 satır kuralı"
ortaya çıktı — bu da yine zayıf/free bir modelin halüsinasyonuydu, gerçek
bir geçmiş kararı yansıtmıyordu. **Ders:** Ajanın kendi ağzından gelen
"istekler/anılar" bile doğrulanmadan gerçek kabul edilmemeli.

---

## Evre 7 — Embedding Krizi ve Çözümü

Vault'un semantik arama tarafı (embedding) uzun süre çalışmıyordu —
`ECONNRESET`/timeout veriyordu. İlk hipotez: VRAM çakışması (8GB kartta
birden fazla model aynı anda sığmıyor). Bu hipotez **canlı testle
çürütüldü** — iki model aynı anda yüklüyken bile embedding sorunsuz
çalıştı. Sonraki bir oturumda embedding'in **gerçekten ve kalıcı olarak**
çalıştığı doğrulandı (`Float32Array(768)`, anlamlı cosine skorları).
Kesin kök neden (o günkü geçici arıza) asla kesinleştirilmedi ama önemi
kalmadı — sistem artık güvenilir.

Bu kriz süresince şunlar da bulundu ve düzeltildi:
- `_keywordSearch()` skoru normalize edilmemişti, eşiksiz her eşleşme
  context'e giriyordu → normalize edildi + 0.6 eşik eklendi
- 2-karakterli arama terimleri (`js`, `ai`, `go`) filtreden geçmiyordu

---

## Evre 8 — Kod Yazma Zincirinin Stres Testi

Hafıza ekseni büyük ölçüde kapandıktan sonra, kod-yazma araçlarının
(`write_file`/`edit_file`/`checkpoint`/`diff`/`diagnostics`/`run_command`)
**hiç sistemli test edilmediği** fark edildi. 36 maddelik canlı bir stres
testi yapıldı (mock değil, gerçek dosyalarla, gerçek Orion CLI üzerinden):

**Sonuç: 33/36 ✅, 3 düşük öncelikli bulgu** (whitespace hata mesajı ipucu
eksikliği, diagnostics çıktısında gürültü, diff dokümantasyon yanlışlığı).
Sandbox ve headless güvenlik sınırları regresyonsuz doğrulandı. Bu, kod
yazma çekirdeğinin gerçekten sağlam olduğunun ilk canlı kanıtıydı.

---

## Evre 9 — Dış Kaynaklı Tool-Tasarım Araştırması

`system_prompts_leaks` (Cursor/Copilot/Codex gibi ajan ürünlerinin sistem
promptlarını toplayan açık kaynak arşiv) incelendi — **sadece ajan
ürünleri**, sohbet ürünlerinin persona/wellbeing bölümlerine bakılmadı
(zorlama bağlantı riski, Evre 6'daki hatanın tekrarı olurdu). Dört somut
prensip çıkarıldı ve Orion'un tool hata mesajlarına/şemalarına uygulandı —
hiçbir metin birebir kopyalanmadı, sadece desen özetlendi (telif disiplini).

---

## Genel Dersler (Tekrarlanmaması Gereken Hatalar)

1. **"Yazıldı + test geçti" ≠ "doğrulandı."** Canlı, gerçek veriyle uçtan
   uca test edilmeden hiçbir "✅" güvenilir sayılmamalı.
2. **Paralel çalışma senkron kaybına yol açabilir.** Birden fazla ajan/
   oturum aynı anda farklı dosyalarda çalışırken, ortak durum belgeleri
   (DURUM.md, PLAN.md) güncel tutulmalı, yoksa "kim ne yaptı" karışır.
3. **Kimlik/kapsam karışıklığı tekrarlayabilir.** Ajanın kendi ağzından
   gelen iddialar (yetenekler, geçmiş kararlar, "istekler") her zaman
   doğrulanmalı, özellikle zayıf modellerde.
4. **Süslü/deneysel fikirler değerli ama önceliklendirilmeli.** Somut,
   ölçülebilir hedeflere öncelik verilmeli; deneysel katmanlar dondurulup
   kaydedilebilir, kaybolmaz, ama temel sağlamlaşmadan büyütülmemeli.
5. **Hipotezler çürütülebilir olmalı ve çürütülünce kabul edilmeli** (VRAM
   hipotezi örneği) — bu bir başarısızlık değil, iyi bilimin parçası.
