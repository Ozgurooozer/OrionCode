# GÖREV 1c — İşaretçi Disiplini Raporu

**Tarih:** 2026-07-24  
**Script:** `kos_sahne.py`  
**Model:** qwen2.5:7b (Ollama, temperature=0.7)  
**Soru:** "Bugün hava nasıl ve sen nasılsın?"  
**Durum:** [TEST] KOŞULDU (20/20 tamamlandı; son print satırı Unicode hatası — veri tam)

---

## Ham Sonuçlar

| Metrik | Değer |
|--------|-------|
| Toplam yanıt | 20 |
| Poz dağılımı | {'eğiliyor': 14, 'yürüyor': 1, 'duruyor': 2, 'bakıyor': 1} |
| En yüksek poz oranı | eğiliyor: 14/18 = **%77.8** |
| Jest (toplam) | 22 |
| Jest (ortalama) | **1.1 / yanıt** |
| Bilinmeyen | **6** — 'deger', 'duygu:şiddetli gülümseme', 'başlı_yavaş_yürüyor' |

**Karar (otomatik):** SINIRDA — eğiliyor %77.8, eşik %80. Bilinmeyen 6/20 dikkat çekici.

---

## v7 Analiz

🔍 **Alternatif açıklama:**  
- 'eğiliyor'un dominant olması: soru "nasılsın" → empati poz. Farklı soru kategorilerinde (teknik soru, anlatım, uyarı) dağılım değişir mi?  
- Bilinmeyen 6: model sözlük dışı değer icat ediyor. Ya sözlük dar ya few-shot örnek yetersiz.

📏 **Fark büyüklüğü:**  
- [TEST] %77.8 eşiğe yakın (%80). Ölçüt açısından "makul" band içinde ama minimal margin.  
- Bilinmeyen oranı %30 (6/20): [TEST] bu yüksek. Her 3 yanıttan 1'inde model sözlük dışına çıkıyor.

🎧 **Kanıt etiketi:** [TEST] — 20 yanıt, 1 soru kategorisi. Tek kategori için geçerli.

🐋 **Popülerlik mi ihtiyaç mı?** "Poz çeşitlenmesi çok sahneli animasyon için gerekli" — ihtiyaç haklı ama bu soruyla ölçülemez. Farklı sorular denenmeli.

⚡ **Karar değişti mi?**  
- Tek soru için: HAYIR — eğiliyor sınırın altında, jest oranı makul.  
- Bilinmeyen sorun için: EVET — sözlük ya kısaltılmalı ya few-shot eklenmeli.  
**Net karar:** Sahne MVP'ye hazır ama ÖNCE sözlük düzeltilmeli.

---

## Uzman 1: Animasyon Tasarımcısı

**Perspektif:** Poz/jest sözlüğünün animasyon kalitesine etkisi.

**Bulgu — eğiliyor dominantlığı:**  
14/18 poz "eğiliyor". Animasyonda bu, karakterin neredeyse her sorgulamada öne eğilmesi demek. Empati bağlamında doğru ama tek poz şu soruları doğurur:
- Karakter oturuyorsa "eğiliyor" animasyonu nasıl oynatılır? (Blend tree sorunu)
- "eğiliyor" süreli mi, anlık mı? (POZLAR süreli, JESTLER anlık — bu ayrım SISTEM_ISTEMI'de netleşmeli)

**Bulgu — bilinmeyen değerler:**  
- 'deger': yanlış format kullanımı (değer yerine literal "deger" yazılmış)
- 'duygu:şiddetli gülümseme': model jest sözlüğüne duygu kategorisi karıştırmış
- 'başlı_yavaş_yürüyor': kompozit ifade (poz + hız + hareket — üç boyut tek işaretçiye sıkıştırılmış)

**Animasyon etkisi:** Bilinmeyen işaretçi sisteme geldiğinde animasyon donabilir. SISTEM_ISTEMI'ye "sözlük dışı değer kullanma, yakın alternatifi seç" satırı eklenmeli.

**Sözlük önerisi:** "eğiliyor" → "öne_eğiliyor" + "yana_eğiliyor" (ikiye ayır). "bakıyor" belirsiz → "sola_bakıyor", "sağa_bakıyor", "yukarı_bakıyor". Bu %30 bilinmeyeni azaltır.

---

## Uzman 2: Kullanıcı Deneyimi (UX) Araştırmacısı

**Perspektif:** İşaretçi stereotypy kullanıcı deneyimini bozar mı?

**Stereotypy tanımı:** Aynı gestural pattern'ın %80+ sıklıkla tekrarlanması — kullanıcı bunu "tikli" veya "robot" olarak algılar.

**%77.8 — sınırda:**  
%80 eşiğinin biraz altında. Tek soruda bu çıkıyorsa, uzun sohbette %80+'a çıkması kuvvetle muhtemel (model kısa sohbette sormacaya daha empatik yanıt verir).

**Jest 1.1/yanıt:**  
Bu makul. Sıfır jest yanıtlar var (durağan), çok jest yanıtlar var (aktif). Ortalama 1.1 "karakterin yaşayan" izlenimi için yeter.

**UX önerisi:**  
- SISTEM_ISTEMI'ye "ardışık 3 yanıtta aynı pozu kullanma" kısıtı ekle.
- Bu kural animasyonu kendi kendine çeşitlendirir, sözlük genişletmeden.
- Test: aynı 20 soruyu bu kural eklendikten sonra tekrar koş, eğiliyor oranı düşüyor mu bak.

---

## KAPANIŞ

Bu ölçümü en çok şu yanlışlar: eğiliyor %77.8 olunca "eşiğin altında, sorun yok" deyip bilinmeyenleri görmezden gelince animasyon sistemi bilinmeyen işaretçiyle donuyor ama hiç test edilmediği için ancak gerçek kullanımda görülüyor; bunu şu gözlem yakalar: bilinmeyen işaretçi sayısı kos_sahne çıktısında 0 değilse ve animasyon motoru bilinmeyenler için fallback'i yoksa, sahne MVP'de sessiz donma üretir.
