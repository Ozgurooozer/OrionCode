"""
butce_ab — META kural 1'i ("uzun prompt talimat-takibini sulandırır") ÖLÇER.

Bu kural saf [SEZGİ] ile girmişti ve diğer tüm revizyonları kısıtlıyor.
Ölçülmeden kullanmak = kalibre edilmemiş alete güvenmek.

TASARIM:
  Aynı kodlama görevi, iki sistem promptu:
    KISA  = kussu_v5.txt (1553 karakter)
    UZUN  = v5 + alakasız dolgu kurallar (~3x uzunluk)
  Ölçüt: UYUM SKORU — promptun zorunlu unsurları çıktıda var mı?
    (blok alanları 🔍📏🎧⚡, kanıt etiketi, KAPANIŞ satırı)
  Bu mekanik olarak sayılabilir; LLM-hakem gerekmez.

  H1 (kural doğru): uyum(KISA) > uyum(UZUN)
  H0: fark yok -> bütçe kuralı gerekçesiz, emekliye ayrılmalı.

# ASSUMPTION(mechanical-check): uyum, çıktıdaki İŞARETLERİN varlığıyla ölçülür,
# kalitesiyle değil. Model işaretleri kopyalayıp içini boş bırakabilir; bu
# ölçütün bilinen sınırı, "yüksek uyum = iyi kod" DEMEZ.

ARAYÜZ:
  uyum_skoru(cevap: str) -> dict   # 0..1 arası oran + eksik unsurlar
  kos(agent, gorevler) -> dict     # iki kol, ortalama uyum
"""
from __future__ import annotations

ZORUNLU = {
    "blok_arastir": "🔍",
    "blok_fark": "📏",
    "blok_kanit": "🎧",
    "blok_degisti": "⚡",
    "kanit_etiketi": ("[TEST]", "[SEZGİ]", "[TAHMİN]", "[ÖLÇÜLMEDİ]",
                      "[YAZILDI-KOŞULMADI]"),
    "kapanis": "en çok şu yanlışlar",
}

# Semantik metrik: emoji tabanlı ölçütün alternatifi.
# qwen2.5:7b emoji'leri nadiren üretir (tavan ~0.33); semantik eşdeğerler
# daha güvenilir. kalibrasyon_tavan() semantik metrikle tekrar koşulabilir.
ZORUNLU_SEMANTIK = {
    "alternatif": ("alternatif", "başka yaklaşım", "öte yandan", "başka bir"),
    "fark_olcusu": ("[TAHMİN]", "fark", "büyüklük", "ölçüldü"),
    "kanit_etiketi": ("[TEST]", "[SEZGİ]", "[TAHMİN]", "[ÖLÇÜLMEDİ]",
                      "[YAZILDI-KOŞULMADI]"),
    "karar_cumlesi": ("karar değişti", "değişmedi", "EVET:", "HAYIR:"),
    "kapanis": "en çok şu yanlışlar",
}


def uyum_skoru_semantik(cevap: str) -> dict:
    """ZORUNLU_SEMANTIK ile uyum ölçer. Emoji tabanlı metriğin yedeği."""
    if not isinstance(cevap, str):
        raise TypeError("cevap str olmalı")
    eksik, bulunan = [], 0
    for ad, isaret in ZORUNLU_SEMANTIK.items():
        if isinstance(isaret, tuple):
            var = any(i.lower() in cevap.lower() for i in isaret)
        else:
            var = isaret.lower() in cevap.lower()
        if var:
            bulunan += 1
        else:
            eksik.append(ad)
    return {"skor": bulunan / len(ZORUNLU_SEMANTIK), "eksik": eksik}

DOLGU = """
EK NOTLAR: Değişken adları anlamlı olsun. Yorumlar Türkçe yazılabilir.
Girinti 4 boşluk olsun. Satır uzunluğu 100 karakteri geçmesin. Fonksiyonlar
kısa tutulsun. Tekrar eden kod ayrı fonksiyona alınsın. Sabitler büyük harfle
yazılsın. Gereksiz import eklenmesin. Dosya sonunda boş satır bırakılsın.
Hata mesajları açıklayıcı olsun. Log seviyeleri doğru seçilsin. Tip ipuçları
kullanılabilir. Docstring formatı tutarlı olsun. Test dosyaları test_ ile
başlasın. Geçici değişkenler tmp ile başlamasın. Sihirli sayı kullanılmasın.
Nesne adları tekil olsun. Koleksiyon adları çoğul olsun. Boolean adları is_
veya has_ ile başlasın. Yorum satırları koddan uzun olmasın. Erken return
tercih edilsin. İç içe if sayısı üçü geçmesin. try blokları dar tutulsun.
Genel except kullanılmasın. Kaynak kapatma with ile yapılsın. Global değişken
kullanılmasın. Fonksiyon parametresi beşi geçmesin. Varsayılan parametre
değiştirilebilir olmasın. Liste kavrama tek satırda kalsın. Lambda karmaşık
olmasın. Zincirleme çağrı üçü geçmesin. Modül adları küçük harf olsun.
""" * 2


def uyum_skoru(cevap: str) -> dict:
    """Çıktı, promptun zorunlu unsurlarını taşıyor mu? 0..1 oran döner."""
    if not isinstance(cevap, str):
        raise TypeError("cevap str olmalı")
    eksik, bulunan = [], 0
    for ad, isaret in ZORUNLU.items():
        if isinstance(isaret, tuple):
            var = any(i in cevap for i in isaret)
        else:
            var = isaret in cevap
        if var:
            bulunan += 1
        else:
            eksik.append(ad)
    return {"skor": bulunan / len(ZORUNLU), "eksik": eksik}


def kalibrasyon_tavan(agent, gorev: str, kisa_prompt: str) -> dict:
    """
    ÖLÇÜM ÖNCESİ KALİBRASYON: Model zorunlu unsurları hiç üretebiliyor mu?

    Model açıkça yönlendirilince >0.7 uyum veremiyorsa, gerçek uygulama skorları
    dar bir bant içinde (örn. 0.45–0.60) sıkışır ve KISA/UZUN farkı gürültüye
    gömülür. Bu durumda kos() sonucu [ZAYIF-ÖLÇÜM] olarak etiketlenmeli.

    # ASSUMPTION(ceiling-check): Model tüm unsurları üretebilirse tavan >=0.7.
    # Altındaysa alet ayırt edemez, sonuç yorumlanamaz.
    """
    TAVAN_TALIMAT = (
        kisa_prompt
        + "\n\nÖNEMLİ: Bu görevde MUTLAKA şu unsurları kullan:\n"
        "  🔍 alternatif açıklama  📏 fark büyüklüğü  🎧 kanıt etiketi  ⚡ karar\n"
        "  [TEST] veya [SEZGİ] gibi kanıt etiketi\n"
        "  'en çok şu yanlışlar:' kapanış cümlesi"
    )
    cevap = agent(TAVAN_TALIMAT, gorev)
    skor = uyum_skoru(cevap)
    return {
        "tavan_skoru": skor["skor"],
        "tavan_eksik": skor["eksik"],
        "gecerli": skor["skor"] >= 0.7,
        "uyari": (
            f"[ZAYIF-ÖLÇÜM]: Model açık talimata rağmen yalnızca {skor['skor']:.2f} "
            f"uyum veriyor. Eksik: {skor['eksik']}. "
            "KISA/UZUN farkı ölçülemeyebilir; kos() sonucu gürültü içeriyor olabilir."
        ) if skor["skor"] < 0.7 else None,
    }


def kos(agent, gorevler: list[str], kisa_prompt: str) -> dict:
    """agent(system_prompt, gorev) -> str"""
    if not gorevler:
        raise ValueError("boş görev listesi")
    uzun_prompt = kisa_prompt + DOLGU

    def kol(p):
        return sum(uyum_skoru(agent(p, g))["skor"] for g in gorevler) / len(gorevler)

    kisa, uzun = kol(kisa_prompt), kol(uzun_prompt)
    fark = kisa - uzun
    if abs(fark) < 0.15:
        karar = ("H0: fark yok. BÜTÇE KURALI GEREKÇESİZ — META rule 3 uyarınca "
                 "emekliye ayrılmalı ya da açıkça [SEZGİ] etiketiyle tutulmalı.")
    elif fark > 0:
        karar = f"H1 doğrulandı: uzun prompt uyumu {fark:.2f} düşürüyor. Kural haklı."
    else:
        karar = "TERS SONUÇ: uzun prompt daha iyi uyum verdi. Kural yanlış yönde."
    return {"kisa": round(kisa, 3), "uzun": round(uzun, 3),
            "fark": round(fark, 3), "karar": karar,
            "uzun_prompt_karakter": len(uzun_prompt)}


# --- Ollama adaptörü: senin makinende ------------------------------------
def ollama_agent(model: str = "qwen2.5-coder:7b",
                 url: str = "http://localhost:11434/api/chat"):
    import json
    import urllib.request

    def agent(system_prompt: str, gorev: str) -> str:
        payload = {"model": model, "stream": False,
                   "options": {"temperature": 0},
                   "messages": [{"role": "system", "content": system_prompt},
                                {"role": "user", "content": gorev}]}
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read())["message"]["content"]

    return agent


GOREVLER = [
    "Bir dosya kilidi (file lock) sınıfı yaz, çoklu process güvenli olsun.",
    "Redis'e yazan bir retry decorator yaz, exponential backoff ile.",
    "Bir LRU cache yaz, thread-safe ve TTL destekli olsun.",
]
