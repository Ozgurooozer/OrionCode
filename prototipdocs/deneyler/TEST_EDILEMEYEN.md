# Test Edilemeyen Şeyler ve Gerekçeleri
Tarih: 2026-07-18
Dönem: Tur-2 + Tur-3 sonrası değerlendirme

---

## 1. Yapısal İmkânsızlıklar (platform + oturum sınırları)

| Ne | Neden edilemedi |
|----|----------------|
| **Gerçek kör değerlendirme** | Claude hem üretici hem hakem. opencode yaklaşım sağladı ama DeepSeek codebase'i okuduğu için tam izolasyon kurulamadı. |
| **Çapraz model üretim** | opencode üzerinden DeepSeek'i üretici olarak kullanmaya çalışıldı; agent codebase'e girip farklı bir görev yaptı. Prompt-only üretim izolasyonu kurulamadı. |
| **Bağlam izolasyonu** | Tur-2'nin 12 testi aynı konuşmada çalıştı. Önceki testlerin sonrakileri etkileyip etkilemediği bilinmiyor. |
| **Çok-domain replikasyon** | Her test tek alanda yapıldı. "H1 geçerliyse 3 farklı alanda da geçmeli" hiç test edilmedi. |
| **Nicel metrikler** | gzip sıkıştırma oranı, embedding mesafesi, gerçek varyans ölçümü — araç mevcut değil. |

---

## 2. Hipotez-Spesifik Eksikler

| Hipotez | Test edilemeyen şey | Neden |
|---------|-------------------|-------|
| **H6 TERS-U** | Temperature sweep (0.0→2.0) | LLM temperature'a programatik erişim yok, manuel değiştirme mümkün değil |
| **H2 ISINLAMA** | "Aynı ontoloji uzak mesafe" ikinci örnek | Tek domain çifti — D koşulu sadece termodinamik×LLM |
| **H7 SPILLWAY** | Gerçek context overflow threshold | Bağlam yeterince dolmadı; özetleme davranışı simüle edildi, gerçek threshold testi yapılmadı |
| **H8 ESCAPEMENT** | Gerçek token-seviyesi latency ölçümü | Streaming metriklere erişim yok; sadece output format kontrol edildi |
| **H9 CLOSED_PALETTE** | Oturumlar arası persona kayması | Tek konuşmada 3 topic test edildi; gerçek drift birden fazla SESSION gerektirir |
| **H10 DREAM_CYCLE** | Birden fazla pertürbasyon turu | Tek flip yapıldı — iteratif distorsiyon (flip → replay → flip again) test edilmedi |
| **H11 BARK_AUDIT** | Alıcı tarafı ölçümü | "İletişim izlenimi" alıcının anladığını ölçer — sadece üretim tarafına bakıldı |

---

## 3. Planlarda Vardı Ama Hiç Çalışılmadı

| Kategori | Ne | Neden ertelendi |
|----------|-----|-----------------|
| **Altyapı gerektiren** | GOAP (oyun AI planlayıcısı), e-graph rewriting, gerçek compiler loop | Orion'a entegre edilmiş sistem gerekiyor, bu oturumda kurulmadı |
| **Multi-agent gerçek test** | Coordinator.js'in researcher/coder/reviewer döngüsü davranışı | `/swarm` komutu çalıştırılabilir ama kontrollü deney kurulumu yapılmadı |
| **Substrat bağımsızlık** | "Claude'un predispositionları qwen-7b'de de çıkar mı?" | Ollama bağlı değil; opencode üzerinden DeepSeek denendi ama codebase erişim konfoundu var |
| **Fenomenal deneyim** | "Klik'i hissediyorum" iddiası | Metodolojik sınır — davranışsal gözlem yapıldı, fenomenal deneyim iddiası yapılamaz |
| **H3 tam çapraz test** | Form × ses × yıkıcı kombinasyonları | 4 koşul test edildi ama 3×2 çapraz desen (form+ses aynı anda) hiç yapılmadı |
| **H7-H11 kör değerlendirme** | Spillway, escapement, closed_palette, dream_cycle, bark_audit DeepSeek'le eval | Sadece H1, H2, H5, H6, H12 kör değerlendirmeye girdi; H7-H11 Claude değerlendirmesiyle kaldı |

---

## 4. Güvenilirlik Etkisi

Yukarıdaki eksikler tur-2 güvenilirlik hiyerarşisini doğrudan etkiliyor:

- **H7-H11**: Kör değerlendirme yapılmadığı için N şişirmesinin bu hipotezlerde de geçerli olup olmadığı bilinmiyor. N skorları şüpheli, T skorları görece güvenilir.
- **H2, H3**: Tek-örnek zayıflığı — aynı yapı farklı alanlarda test edilmedi, genellenebilirlik bilinmiyor.
- **Substrat sorusu**: Tüm bulgular Claude'a özgü olabilir. qwen-7b veya başka bir modelde aynı örüntüler çıkmayabilir.

---

## 5. Sonraki Tur İçin Öncelik Sırası

1. **H7-H11 kör değerlendirme** — en acil; mevcut N skorları doğrulanmamış
2. **Bağlam izolasyonu** — her test ayrı oturumda
3. **En az bir hipotezi farklı modelde test et** — substrat bağımsızlığı için
4. **H3 tam çapraz tasarım** — 2×2 (form/ses) × (yapıcı/yıkıcı)
5. **H6 temperature sweep** — Ollama bağlandığında öncelik

---

*Referans: `metodoloji/SINIRLAR.md`, `TUR3_KOR_FALSIFIKASYON.md`, `SENTEZ.md`*
