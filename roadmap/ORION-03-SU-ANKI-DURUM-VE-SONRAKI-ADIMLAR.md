# ORION — 03. Şu Anki Durum ve Sonraki Adımlar
> Son güncel envanter: ne canlı doğrulanmış, ne dondurulmuş, ne açık.
> Bir sonraki AI/oturum buradan devam edebilmeli.

---

## 1. Canlı Doğrulanmış, Güvenilir Durumdakiler

| Alan | Kanıt |
|---|---|
| **Çekirdek (session/router/tools/checkpoint/diff/diagnostics)** | 213/213 test + 36 maddelik canlı stres testi (33✅/3 düşük öncelik) |
| **Vault — 4 katmanlı hafıza** | Şema koda haritalı, episodic köprü çalışıyor |
| **Embedding (semantik arama)** | Canlı doğrulandı — `Float32Array(768)`, anlamlı cosine skorları, VRAM hipotezi çürütülüp gerçekten kalıcı çalıştığı gösterildi |
| **Kimlik temizliği (QSE/kuantum sızıntısı)** | PERSONA.md tamamen temizlendi, canlı doğrulandı (sızıntı bitti) |
| **KV prefix cache** | Fiyatlandırma docs'tan doğrulandı, %85-95 potansiyel tasarruf |
| **Spekülatif salt-okunur yürütme** | %80 isabet, ~2.0sn/tur beklenen kazanç, KATI SINIR (yazma araçları asla spekülatif) testle kanıtlı |
| **FEP gölge modu** | Gerçek telemetriyle karşılaştırıldı, sapma oranı ölçüldü (%50-60 arası, konfigürasyona bağlı), gerçek kararı DEĞİŞTİRMİYOR (tasarım gereği) |
| **Sessiz catch taraması** | 58 blok tarandı, 15 gerçek sessiz-başarısızlık görünür kılındı |
| **Vault-inject eşiği** | Keyword-fallback skoru normalize edildi + 0.6 eşik |
| **Olay protokolü (Katman 0)** | SSE endpoint, listener temizliği doğrulandı |
| **Provider UX** | Clack bağımlılığı kaldırıldı, kendi select/masked-input yazıldı, çift-render sorunu kökten çözüldü |
| **search aracı ignore-filtresi** | node_modules/.git gibi dizinler varsayılan atlanıyor, 66× hız kazancı ölçüldü |
| **architect-entropy (`/entropy`)** | Deterministik statik analiz (regex+brace-matching), 3 zor senaryoyla (template literal, regex literal, yorum) doğrulandı |
| **Tool hata mesajı netliği** | 4 iyileştirme (whitespace ipucu, çoklu-eşleşme çözümü, şema açıklamaları) dış kaynaktan süzülüp uygulandı |

---

## 2. Bilinçli Olarak Dondurulmuş (Silinmedi, Kayıtlı)

Bunlar kötü fikirler değil — **öncelik sırasına göre ertelendi.** Temel
(hafıza + kod yazma) sağlamlaşana kadar büyütülmeyecekler:

- FEP/Aktif Çıkarım'ın çekirdek karar mekanizması haline getirilmesi (şu an
  sadece gölge modda)
- ICV (görev-vektörü aktarımı)
- Blackboard koordinasyonu
- Weakness Mining'in genişletilmesi (şu an dar/basit tutuluyor, onay-kapılı
  "apply" kısmı hâlâ yazılmadı)
- Kimlik adayları (işlemsel yürütme/git-worktree, deterministik replay,
  görsel geri besleme, canlı niyet sözleşmesi/INTENT.md)
- `strict-bounds` (modülerlik/coupling denetleyicisi) — `architect-entropy`
  sonrası ikinci adaydı, henüz başlanmadı
- `abstraction-validator` — belirsizliği yüksek, "taşınabilirlik skoru" gibi
  öznel ölçütler somutlaşmadan başlanmayacak
- Node-graph editör, Blender copilot, ComfyUI entegrasyonu, Babylon.js
  editör (Evre 1'den beri Faz 2-3'e ertelenmiş 4 büyük sistem)

---

## 3. Bilinçli Olarak Reddedilenler (Gerekçeli)

| Fikir | Neden reddedildi |
|---|---|
| Kendini yeniden yazan ajan | Otonom değişiklik yasağıyla çelişir |
| Paralel varyant üretimi | 3× maliyet, sıfır-bütçe kısıtına aykırı |
| Sesli/konuşan arayüz | Ambalaj, zeka değil |
| QSE entropi bütçesi ↔ vault bağı | Metaforik, mekanik değil (zorlama bağlantı) |
| IBM kuantum araştırma hattı | Kullanıcının kişisel araştırmasıyla kesişir, Orion'a mekanik bağı yok |
| "Beyin/bilinç" tasarımı (küçük transformer) | Mekanik olarak tutmuyor — gerçek matematiği (FEP/empowerment) alındı, geri kalanı bırakıldı |

---

## 4. Açık, Çözülmemiş Sorunlar

1. **`core/coordinator.js:57`** — LLM çağrı hatası sessizce yedek plana
   düşüyor (S taramasının bulduğu, dokunmadığı gözlem)
2. **Manuel backend seçiliyken** (`_manualBackend`) speculex prefetch hiç
   tetiklenmiyor
3. **TUI'deki AI turn başlığı** bazen bayat backend etiketi gösteriyor
   (kozmetik, TUI hattı ayrı bir akışta)
4. **QSE kalıntı vault kaydı** — bir oturum hâlâ kuantum içerik taşıyor
   (context'e artık girmiyor ama kozmetik temizlik bekliyor)
5. **Kimin ne zaman ne yaptığının senkronizasyonu** — kullanıcı zaman zaman
   bu planlama sohbetinin dışında da doğrudan Claude Code ile çalışıyor;
   bu, DURUM.md'nin güncel tutulmasını gerektiriyor

---

## 5. Çalışma Süreci Kuralları (yeni bir AI/oturum için)

1. **Görevler tek tek, sıralı verilir.** Bir görev bitip canlı doğrulanmadan
   yenisi açılmaz (istisna: dosya çakışması olmayan paralel işler, ama bu
   bile senkron riski taşır).
2. **Her görev promptu KATI SINIR içerir** — hangi dosyalara dokunulup
   dokunulmayacağı açıkça yazılır, paralel çalışan başka ajanlarla çakışmayı
   önlemek için.
3. **"Bitti" demek için canlı doğrulama şart** — birim testi geçmek yeterli
   değil. Gerçek Ollama, gerçek dosya, gerçek komut ile uçtan uca gösterilmeli.
4. **Rapor formatı sabit:** hangi dosyalar değişti, test sonucu (X/X), varsa
   bilinen sınırlama — bu üçü olmadan rapor eksik sayılır.
5. **Ajanın kendi ağzından gelen iddialar** (yetenekler, geçmiş kararlar,
   "istekler") doğrulanmadan gerçek kabul edilmez — özellikle zayıf/free
   modellerden geliyorsa.
6. **Güvenlik sınırları hiçbir işte ihlal edilmez** (bkz. dosya 01, Bölüm 6).

---

## 6. Sıradaki Karar Noktası

Üç ana eksen (hafıza, kod yazma, tool netliği) artık canlı doğrulanmış
durumda. **Önerilen sonraki adım:** Yeni bir katman açmadan, birkaç gün
**gerçek kullanım** yapılması — kod yazdırma, hafızayı kullanma, `/entropy`
ile gerçek dosyalara bakma. Bu sürenin sonunda iki soru cevaplanacak:

1. Hafıza gerçekten pratikte fark yaratıyor mu?
2. Kod kalitesi kullanıcının standardını karşılıyor mu?

Bu veriyle, Bölüm 2'deki dondurulmuş listeden hangisinin gerçekten
açılmaya değer olduğuna karar verilecek — tahminle değil, gözlemle.
