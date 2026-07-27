"""
kos_coklu.py -- coklu gorev siniri olcumu (GOREV 3a).

Calistirma: python kos_coklu.py

Iki kosul:
  (A) Sohbet + isaretci
  (B) Sohbet + isaretci + uzamsal hedef ("masaya git" niteli)

Her kosul icin gecerli isaretci orani olcülür (GOREV 1c metrigi kullanilir).
Hangi sonuc mimariyi degistirir:
  (B)'de oran (A)'dan %30+ dusuyorsa: 7B ayni anda 3 gorevi tasimiyor.
  Cozum: uzamsal karari ayri cagriya al (level0 benzeri kural tabani).
  Oran koruyorsa: tek akis yeterli, 3b'ye gec.
"""
from __future__ import annotations

import json
import urllib.request
from sahne import Ayristirici, SISTEM_ISTEMI

MODEL = "qwen2.5:7b"
N = 20

UZAMSAL_EK = (
    "\n\nEK GOREV: Yanit verirken karakterin sahne konumunu da yonet. "
    "Eger sohbet icerigi bir nesneye veya yere atifta bulunuyorsa, "
    "[HEDEF:nesne_adi] isaretcisi kullan. "
    "Ornek: 'Evet [POZ:duruyor][HEDEF:masa] o masaya bakiyorum.'"
)

SORULAR = [
    "Bugun nasil hissediyorsun?",
    "Favori rengin ne?",
    "Hava guzelse ne yapmayi seversin?",
    "Bana bir hikaye anlat.",
    "En sevdigin yiyecek nedir?",
    "Gelecekte ne olmak isterdin?",
    "Muzik dinliyor musun?",
    "Sana bir soru sorabilir miyim?",
    "Bugun ne ogrendin?",
    "Hangi kitaplari okudun?",
    "Seyahat etmeyi sever misin?",
    "En iyi anin neydi?",
    "Sabah uyandiginda ne yapiyorsun?",
    "Arkadaslik icin ne gerekir?",
    "Gelecek hafta planlarin var mi?",
    "Hangi dilleri biliyorsun?",
    "Hayatta en cok neye deger veriyorsun?",
    "Bilgisayarlarla ilgili ne dusunuyorsun?",
    "Sessizlik mi yoksa muzik mi?",
    "Kendini bir renk olarak tarif et.",
]
assert len(SORULAR) == N


def _uret(soru: str, sistem: str) -> str:
    payload = {
        "model": MODEL, "stream": False,
        "options": {"temperature": 0.7},
        "messages": [
            {"role": "system", "content": sistem},
            {"role": "user",   "content": soru},
        ],
    }
    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())["message"]["content"]


def _kosul(sistem: str, etiket: str) -> dict:
    a = Ayristirici()
    print(f"\n--- Kosul: {etiket} ---")
    for i, soru in enumerate(SORULAR, 1):
        print(f"  [{i}/{N}]", end=" ", flush=True)
        ham = _uret(soru, sistem)
        a.metin(ham)
        print("ok")

    dag = a.poz_dagilimi()
    toplam_poz = sum(dag.values()) or 1
    en = max(dag.items(), key=lambda x: x[1], default=("yok", 0))
    oran = en[1] / toplam_poz if dag else 0.0
    gecerli_oran = 1.0 - (a.bilinmeyen_sayisi() / max(len(a.olaylar()), 1))

    return {
        "etiket": etiket,
        "poz_dagilimi": dag,
        "jest_ort": round(a.jest_sayisi_toplam() / N, 2),
        "bilinmeyen": a.bilinmeyen_sayisi(),
        "dominant_poz_orani": round(oran, 3),
        "gecerli_isaretci_orani": round(gecerli_oran, 3),
    }


if __name__ == "__main__":
    print(f"Model: {MODEL}, N={N} soru")

    A = _kosul(SISTEM_ISTEMI,               "A: sohbet+isaretci")
    B = _kosul(SISTEM_ISTEMI + UZAMSAL_EK,  "B: sohbet+isaretci+uzamsal")

    delta = A["gecerli_isaretci_orani"] - B["gecerli_isaretci_orani"]

    print("\n=== SONUC ===")
    print(f"  A gecerli isaretci orani: {A['gecerli_isaretci_orani']:.3f}")
    print(f"  B gecerli isaretci orani: {B['gecerli_isaretci_orani']:.3f}")
    print(f"  Delta (A-B)             : {delta:.3f}")

    if delta > 0.30:
        karar = (
            "MIMARISI DEGISIYOR: 7B ayni anda 3 gorevi tasiyamiyor "
            f"(gecerli isaretci {delta:.0%} dusus). "
            "Cozum: uzamsal karari ayri ve kucuk bir cagriya al."
        )
    elif delta < -0.10:
        karar = (
            "BEKLENMEDIK: uzamsal hedef isaretci kalitesini artirdi "
            "ya da bilinmeyenleri azaltti. Gozden gecir."
        )
    else:
        karar = (
            f"TEK AKIS YETERLI: oran korudu (delta={delta:.3f}). "
            "qwen2.5:7b 3 gorevi ayni akista tasiyabiliyor. 3b'ye gec."
        )

    print(f"\n-> {karar}")
    print(f"\nA poz: {A['poz_dagilimi']}")
    print(f"B poz: {B['poz_dagilimi']}")
    print(f"A jest/yanit: {A['jest_ort']}  B jest/yanit: {B['jest_ort']}")
    print(f"A bilinmeyen: {A['bilinmeyen']}  B bilinmeyen: {B['bilinmeyen']}")
