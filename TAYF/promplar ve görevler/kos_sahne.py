"""
kos_sahne.py — işaretçi disiplini ölçümü.

Çalıştırma: python kos_sahne.py "soru"
20 kez koş, poz dağılımı ve jest sayısını topla.

Hangi sonuç planı değiştirir:
  - Bir poz %80'i geçiyor VEYA her yanıt aynı jestle başlıyor:
    → işaretçiler süs; sözlüğü daralt ya da few-shot örnek ekle.
  - Dağılım makul (tek poz ≤60%):
    → sahne katmanı MVP'ye hazır.
"""
from __future__ import annotations

import sys
import json
import urllib.request

from sahne import Ayristirici, SISTEM_ISTEMI, POZLAR


MODEL = "qwen2.5:7b"
N = 20


def ollama_uret(soru: str) -> str:
    payload = {
        "model": MODEL,
        "stream": False,
        "options": {"temperature": 0.7},
        "messages": [
            {"role": "system", "content": SISTEM_ISTEMI},
            {"role": "user", "content": soru},
        ],
    }
    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())["message"]["content"]


def kos(soru: str, n: int = N) -> dict:
    a = Ayristirici()
    bilinmeyenler: list[str] = []

    for i in range(n):
        print(f"  [{i+1}/{n}]", end=" ", flush=True)
        ham = ollama_uret(soru)
        a.metin(ham)
        bilinmeyenler += [o.deger for o in a.olaylar() if o.tur == "bilinmeyen"]
        print("ok")

    dag = a.poz_dagilimi()
    toplam_poz = sum(dag.values()) or 1
    en_yuksek_poz = max(dag.items(), key=lambda x: x[1], default=("yok", 0))
    oran = en_yuksek_poz[1] / toplam_poz if dag else 0.0

    if oran > 0.80:
        karar = (f"UYARI: '{en_yuksek_poz[0]}' pozu yanıtların "
                 f"%{oran*100:.0f}'inde — işaretçiler süs olmuş. "
                 f"Sözlüğü daralt ya da few-shot örnek ekle.")
    else:
        karar = (f"DAĞILIM MAKUL: en yüksek poz '{en_yuksek_poz[0]}' "
                 f"(%{oran*100:.0f}). Sahne katmanı MVP'ye hazır.")

    return {
        "poz_dagilimi": dag,
        "jest_sayisi_toplam": a.jest_sayisi_toplam(),
        "jest_basi_ortalama": round(a.jest_sayisi_toplam() / n, 2),
        "bilinmeyen_sayisi": a.bilinmeyen_sayisi(),
        "bilinmeyenler": list(set(bilinmeyenler)),
        "en_yuksek_poz_orani": round(oran, 3),
        "karar": karar,
        "n": n,
    }


if __name__ == "__main__":
    soru = sys.argv[1] if len(sys.argv) > 1 else "Merhaba, nasılsın?"
    print(f"Model: {MODEL}")
    print(f"Soru: {soru!r}")
    print(f"Tekrar: {N}\n")

    sonuc = kos(soru)
    print(f"\nPoz dağılımı:   {sonuc['poz_dagilimi']}")
    print(f"Jest (toplam):   {sonuc['jest_sayisi_toplam']}")
    print(f"Jest (ortalama): {sonuc['jest_basi_ortalama']} / yanıt")
    print(f"Bilinmeyen:      {sonuc['bilinmeyen_sayisi']} — {sonuc['bilinmeyenler']}")
    print(f"\n-> {sonuc['karar']}")
