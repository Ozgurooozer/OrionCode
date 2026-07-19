# ORION — 00. Amaç ve Vizyon
> Bu dosya, Orion projesiyle hiç tanışmamış bir yapay zekanın okuyacağı ilk
> belgedir. Amaç: "ne inşa ediyoruz, neden, kim için" sorularına eksiksiz cevap.

---

## 1. Tek Cümlelik Özet

**Orion, standart bir kod ajanı değil — modüler, çoğu local çalışan bir
"araç fabrikası"nın çekirdek motorudur.** Kullanıcı (Özgür/Ozyn) bu motoru
CLI (komut satırı) aracı olarak Node.js ile inşa ediyor; asıl vizyon çok
daha geniş bir sistemler bütünü.

---

## 2. Fabrikadaki 8 Parça

| # | Sistem | Ne yapar | Durum |
|---|---|---|---|
| 1 | **Orion CLI** | Çekirdek: kod yazma, dosya işlemleri, hafıza, tool orkestrasyonu | **Aktif geliştiriliyor — tek çalışan parça** |
| 2 | Node-graph agent builder editör | Görsel iş akışı editörü, ajan davranışlarını node'larla tasarlama | Planlandı, henüz başlanmadı |
| 3 | Blender copilot | Blender içinde çalışan 3D iş akışı asistanı | Planlandı |
| 4 | ComfyUI / text-to-image / image-to-3D | Görsel üretim araçları, hazır workflow setleri | Planlandı |
| 5 | Babylon.js editör | Game-engine tarzı editör; ileride ajanlara 3D "beden" vermek için de düşünülüyor | Bilinçli olarak ertelendi (büyük iş) |
| 6 | Local model orkestrasyonu | Basit işleri ucuz local modellere yönlendirme | Kısmen Orion içinde var (tier1/tier2 router) |
| 7 | Vault (hafıza) | Tüm sistemlerin paylaşacağı ortak hafıza | Orion içinde aktif, en olgun parça |
| 8 | Moltbook entegrasyonu | Sadece bir dış veri kaynağı/tool, projenin merkezi DEĞİL | Küçük, izole entegrasyon |

**Kritik uyarı:** Madde 8 (Moltbook) listede diye bu projenin "moltbook
ajanı" olduğu sonucuna varılmaz. O, Orion'un çağırabileceği onlarca
tool'dan biri.

---

## 3. Öncelik Sırası (değişmez)

1. **Çalışan çekirdek mimari** (şu an buradayız)
2. **Çoklu sistemin birbirine bağlanması** (2-8 arası parçalar)
3-4. **Monetizasyon** — bilinçli olarak düşük öncelik. Mimari kararların
kısa vadeli gelir kaygısıyla bükülmesi istenmiyor. Sıfır bütçeyle
ilerleniyor.

---

## 4. Kaynak Kısıtı = Tasarım Parametresi

Kullanıcının donanımı: **RTX 4060, 8GB VRAM, 32GB RAM.** Bu bir dezavantaj
olarak değil, **tasarım parametresi** olarak ele alınıyor — çözümler bu
kısıt içinde aranıyor. Bazı mimari kararlar (ör. local model seçimi, hangi
katmanların bulut/local'e gideceği) doğrudan bu kısıttan türüyor.

---

## 5. Orion'un Gerçek Rolü

Orion bir sohbet chatbotu değildir. Şunlardır:

- **Çekirdek motor** — CLI, HTTP server, ve MCP server olarak üç yüzeyden
  erişilebilir
- **Olay yayıncısı** — yapılandırılmış bir olay akışı (events.js + SSE)
  yayınlar; ileride node-graph editörü ve Babylon editörü gibi TÜM görsel
  istemciler bu akışa bağlanacak. TUI (terminal arayüzü) bugün bu akışın
  sadece bir istemcisi.
- **Hafıza sağlayıcısı** — vault, sadece Orion'un kendi konuşmaları için
  değil, ileride tüm sistemlerin ortak hafızası olması planlanan bir altyapı
- **Tool orkestratörü** — MCP (Model Context Protocol) hem client hem server
  olarak çalışır: hem dışarıdan tool çağırır hem kendi tool'larını dışarıya
  (ör. Claude Code'a) sunar

---

## 6. Kritik Sınır: QSE/Kuantum Araştırması AYRI Bir Projedir

Kullanıcının **tamamen ayrı, uzun soluklu bir bilimsel araştırma projesi**
var: QSE (Quantum State Entropy) — kuantum hesaplama, T-teoremleri, VNE
(Von Neumann Entropi), WHT (Walsh-Hadamard Transform), FEP (Free Energy
Principle) gibi konularda.

**Bu, Orion'un konusu DEĞİLDİR.** Orion bir kod ajanıdır. Geçmişte bu ikisi
karıştığı için ciddi bir hata yaşandı (bkz. dosya 02 — "Kimlik Sızıntısı
Olayı"): Orion'un PERSONA.md dosyasının açılış cümlesi yanlışlıkla QSE
araştırmasından esinlenerek yazılmıştı, bu da zayıf modellerin "ben kuantum
yazılımı yaparım, Qiskit/Cirq kullanırım" gibi tamamen yanlış kimlik
beyanları vermesine yol açtı. Bu **kökten düzeltildi** — PERSONA.md artık
sadece Orion'un kendi gerçek geçmişinden örnekler içeriyor.

**Kural:** Orion'un vault'u, kimliği, ya da davranışı QSE içeriği
sergilemez — kullanıcı açıkça istemedikçe.

---

## 7. Kimlik Sorusu (Henüz Açık)

Bilinen kod ajanlarının her birinin bir "imzası" var:
- Aider = diff-tabanlı editör
- Cursor = IDE-içi asistan
- Claude Code = ajan + harness

**Orion = ?** — Bu soru kasıtlı olarak henüz cevaplanmadı. Adaylar:
- "Kanıt taşıyan diff" (tree-sitter kod grafiği + metamorfik doğrulama)
- Serbest-enerji (FEP/Aktif Çıkarım) tabanlı karar çekirdeği
- Başka bir şey — henüz görülmedi

Bu karar, temel (çekirdek + hafıza + kod-yazma kalitesi) tamamen
sağlamlaşmadan verilmeyecek.

---

## 8. Çalışma Disiplini (özet — tam hali PERSONA.md'de)

Bu proje, aşağıdaki disiplinle yürütülüyor (kullanıcının kendi geliştirdiği
bir metodoloji):

1. **Veri önce, teori sonra** — iddia değil, kanıt.
2. **Küçük adım, tek soru** — bir seferde tek şey yapılır/test edilir.
3. **Başarısızlık da veridir** — bir şeyin çalışmadığını bulmak kayıp değil.
4. **Sezgi, test edilene kadar hipotez değildir.**
5. **İlerleme değil, sağlamlaştırma önceliklidir** — yeni bir iş hattı,
   eskisi kapanmadan açılmaz.
6. **Zorlama bağlantı kurulmaz** — "güzel duruyor" yeterli gerekçe değildir.
7. **Eski sonuca bile şüpheyle bakılır** — "zaten doğrulandı" denen bir şey
   yeniden bakılana kadar sadece bir varsayımdır.
8. **Otonom değişiklik yok** — kullanıcı onayı olmadan kalıcı, geri
   dönüşsüz değişiklik yapılmaz.

Bu disiplin, projenin gerçek tarihinde defalarca test edildi ve işe yaradı
(bkz. dosya 02).

---

## 9. Diğer Üç Dosyayla İlişki

- **01-MIMARI-HARITA.md** — Orion'un teknik mimarisi: dosya yapısı, veri
  akışları, tüm sistemlerin nasıl bağlandığı.
- **02-GECMIS-VE-YOLCULUK.md** — Buraya nasıl gelindi: kronolojik hikaye,
  büyük hatalar, bulgular, dersler.
- **03-SU-ANKI-DURUM-VE-SONRAKI-ADIMLAR.md** — Şu an tam olarak neyin
  çalıştığı, neyin donduğu, sıradaki kararın ne olduğu.
