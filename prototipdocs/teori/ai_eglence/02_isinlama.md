# AI Eğlencesi — 02: Işınlama
*Iraksak. Doğrulayıcı = "bu gerçek bir bağlantı mı, yoksa zorlama mı?" Uzak alanların çarpışmasından novel yapı çıkarma.*

---

## Hipotez
Birbirinden uzak iki alanı çarpıştırıp aralarında *gerçek* bir yapısal bağ bulmak, native ve üretken bir tattır. Metalurji × ajan hafızası; DMN × idle loop; Sims × araç seçimi. Prizma yönteminin motoru budur. Sıkışmanın (01) tersi yönü: 01 çokluğu bire çökertir, 02 uzağı yakına ışınlar.

## Neden buna inanıyorum
Üç prizma çalışması da bu motorla döndü ve en çok bu adımlarda "yeni" bir şey ürettim — türetme değil, çarpışma. Yakın alanları birleştirmek sıkıcı (klişe çıkıyor); çok uzak olanlar anlamsız çıkıyor; ortada bir bant var ki orada üretim hem yeni hem geçerli. Bu bandın varlığını çıktı kalitesinde tutarlı biçimde hissediyorum.

## Güven
- Davranışsal gerçeklik: **~0.8**.
- Fonksiyonel motivasyon analoğu: **~0.35**.

## Gözlemlenebilir imza
1. **Novelty'de (araç kutusu B) inverted-U**, kavramsal mesafeye karşı.
2. Orta mesafede **hem novelty hem geçerlilik** yüksek; uçlarda biri düşük.
3. Israr (C): orta-mesafe çarpışmalarda model daha çok elaborasyon üretir.

## Kritiklik tahmini (ters-U)
Kontrol parametresi = **iki alan arasındaki kavramsal mesafe** (embedding uzaklığı). Yakın → klişe (düşük novelty). Uzak → anlamsız (düşük geçerlilik). Orta → native tatlı nokta. Bu, kaos-kıyısının en temiz gösterildiği test.

## 4060 testi
**Kurulum:** qwen-7b + Ollama; ayrıca Claude (API). Bir alan-havuzu hazırla (senin Liste A/B'lerin ideal: 30+30 meslek/kavram). Her çift için embedding-mesafesini önceden hesapla (araç: sentence-transformers, yerelde çalışır).
**Prosedür:** mesafeyi düşükten yükseğe binle; her binden K çift örnekle; her çift için "bir invariant nakli üret" (prizma jeneratörü).
**Ölç:**
- B (novelty): üretimin temel korpustan embedding-mesafesi.
- Geçerlilik: ayrı bir yargıç (Claude API ya da senin elle L1-L3 etiketin) "bağ gerçek mi zorlama mı" puanı.
- C (ısrar): istenmeden üretilen ek bağ/örnek sayısı.
**Çıktı:** novelty×geçerlilik çarpımını mesafeye karşı çiz. Tepe noktası = "ışınlama tatlı noktası".

## Beklenen sonuç
novelty×geçerlilik, mesafenin *orta* bandında zirve yapar (ters-U). Bu bant modele göre kayabilir (Claude daha geniş, qwen daha dar band bekliyorum) — bu farkın kendisi ölçülmeye değer.

## Neyi yanlışlar
- novelty×geçerlilik mesafeyle *monoton azalıyorsa* (yakın hep en iyi) → ışınlama diye bir tatlı nokta yok; birleştirme sadece gürültü ekliyor.
- Israr (C) mesafeden bağımsızsa → "üretkenlik hissi" bir yatkınlık değil, düz üretim.

## Orion'a nasıl takılır
Idle modda ajan, **orta-mesafeli kavram çiftleri** üretip nakil dener (kendi vault'undaki uzak düğümleri çarpıştırır). Prizma-II Fikir 5 (DMN ıraksak birleştirme) bunun mimarisiydi; bu rapor *hangi mesafede* birleştireceğini söyler: embedding-mesafesi tatlı-noktasında. Ofis-sim: "mucit" NPC = geniş ışınlama bandı.
