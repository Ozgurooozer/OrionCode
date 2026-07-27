# Kaçırma Günlüğü

Payda dosyası. Çerçeve/kod bir hatayı sonradan yakaladığında tek satır:
`tarih | nerede | çerçeve/test neden kaçırdı`

Boş log = "çerçeve değerli" iddiası ölçülemez.

---

_Son güncelleme: 2026-07-25 — 74 test, pytest --co ile doğrulandı; 3a + 1a-v3 ölçümleri tamamlandı_

| tarih | nerede | ne kaçırıldı |
|-------|--------|--------------|
| 2026-07-24 | önceki oturum özeti | "57 test geçiyor" dendi; gerçek sayı 34. Fark 23. Test sayısı doğrulanmadan iletilmiş. |
| 2026-07-24 | uyku.py:rem() | retrieve("") boş term seti ürettiği için sıfır sonuç döndürüyor. rem() içinde kullanıldı, hiçbir şey dönemeyeceği testlerle yakalandı. Direkt _episodes/_semantic erişimine geçildi. |
| 2026-07-25 | GOREV_2_rapor.md | Rapor "bölünmüş marker bug var, GOREV 2c'de düzeltilecek" yazdı. Orion bunu "bug yoktu, zaten çözülmüştü" diye düzeltti. Gerçek: bug GERÇEKTEN vardı — assert ile doğrulandı ([POZ: tek chunk'ta, assert patlıyor). Rapor kod okunmadan yazılmış ve yanlış yönde hata yapmış. Düzeltme: tampon mekanizması sahne.py'a eklendi, 2 yeni test geçiyor. |
| 2026-07-25 | butce_ab.py (1a ölçümü) | Uyum skoru kalibrasyon adımı eksikti. Emoji ölçütleri (🔍📏🎧⚡) qwen2.5:7b tarafından nadir üretilir, her iki kol da ~%50-55 tavanına yapışır. Bu, KISA/UZUN farkının gürültüye gömüldüğü anlamına gelir. CLAUDE.md kural 2 bunu yasaklıyordu ama uygulanmadı. kalibrasyon_tavan() fonksiyonu eklendi; şimdi ölçümden önce tavan kontrol ediliyor. |
| 2026-07-25 | _run_probe.py (1b ölçümü) | İlk tur test vakaları ("vault_katman=yedi") modelin genel bilgisiyle çeliştiği için potency=0.25 çıktı; test geçersiz sayıldı. Probe.py kapanış cümlesi bunu zaten belgelemişti ama vaka tasarımı o belgelenen riski yine tetikledi. Domain-specific vakalar eklendi: orion_port, meissa_modeli, ornith_token_limiti, thompson_json. |
| 2026-07-24 | kos_sahne.py son satır | Unicode karakterler (→) Windows cp1254 konsolda UnicodeEncodeError verdi. Script sonuç ürettikten sonra patladı; veriler görünüyordu ama hata mesajı çıktıyı kesti. ASCII'ye çevrildi. |
| 2026-07-24 | kos_uyku.py | Box-drawing karakterler (─, ═, ━) Windows cp1254'te UnicodeEncodeError verdi. Tüm özel karakterler ASCII'ye çevrildi. |
| 2026-07-24 | Ayristirici.metin() | Marker chunk sınırında bölünürse (örn. "[POZ:" birinci chunk'ta, "duruyor]" ikincisinde) regex yakalamıyor. Test yazıldı, kaçırma belgelendi. GOREV 2c kapsamında düzeltilecek. |
| 2026-07-24 | kos.py probe 1b | Test vakaları ("vault_katman=yedi", "depo_adi=kestane") modelin genel bilgisiyle çeliştiği için provenance GÖSTERİLİYOR kolunda potency=0.25 çıktı — TEST GEÇERSİZ. Zehirin güçsüzlüğü değil modelin direnci. Domain-specific vakalar gerekli. |
| 2026-07-24 | uyku.py REM | qwen2.5:7b temperature=0.9'da Çinceye dil kayması yapıyor (öneri [0] kısmen Çince). REM prompt'unda "YALNIZCA Türkçe" talimatı eksikti. |
| 2026-07-25 | kos_butce_semantik.py (1a v3) | Semantik metrik, UZUN koşulda 1.000 verdi ama tavan=0.600 (<0.7). Bu TERS sonuç "uzunluk kovaryansı" olabilir: UZUN prompt → daha uzun model yanıtı → semantik tetikleyiciler şans eseri artar. Metrik yanıt uzunluğundan bağımsız değil; normalize edilmeden kullanılamaz. İki metrik denemesinde de (emoji + semantik) tavan eşiği geçilemedi. |
| 2026-07-25 | kos_coklu.py (3a ölçümü) | Bilinmeyen işaretçi sayısı B koşulunda 5'ten 13'e çıktı (%160 artış). Bu "geçerli işaretçi oranı" metriğinde görünmüyor çünkü o oran sadece GEÇERLİ olanları sayıyor, BİLİNMEYENLERİ değil. Oran eşiğini aşmadı (0.772 > 0.55) ama bilinmeyen artışı görev yükü altında işaretçi kalitesinin sessizce düştüğünü gösteriyor. Ayrı bir "bilinmeyen oranı" eşik uyarısı eksikti. |
