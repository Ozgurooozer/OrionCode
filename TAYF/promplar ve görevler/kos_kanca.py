"""
kos_kanca.py -- sahne + kanca CLI entegrasyonu (GOREV 2c).

Calistirma:
  python kos_kanca.py                      # insan modu: daktilo efekti
  python kos_kanca.py --jsonl              # makine modu: her olay bir JSON satiri

Kontrol: jest, ilgili cumle yazilmadan once oynuyorsa (desenkron), Kanca assert ile yakalar.
"""
from __future__ import annotations

import json
import sys
import time
import argparse
import urllib.request

from sahne import Ayristirici, SISTEM_ISTEMI, Olay as SahneOlay
from kanca import Kanca, Olay as KancaOlay

MODEL = "qwen2.5:7b"
DAKTILO_ARALIK = 0.025   # saniye / karakter


def _uret_stream(soru: str):
    """Ollama stream=True ile token-token uret, (chunk: str) iterator."""
    payload = {
        "model": MODEL, "stream": True,
        "options": {"temperature": 0.7},
        "messages": [
            {"role": "system", "content": SISTEM_ISTEMI},
            {"role": "user",   "content": soru},
        ],
    }
    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        for line in resp:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                content = obj.get("message", {}).get("content", "")
                if content:
                    yield content
                if obj.get("done"):
                    break
            except json.JSONDecodeError:
                pass


def _olay_isle(olay: KancaOlay, jsonl: bool) -> None:
    if jsonl:
        print(json.dumps({
            "tur": olay.tur, "deger": olay.deger,
            "pozisyon": olay.pozisyon,
        }), flush=True)
    else:
        sys.stderr.write(f"\n  [OLAY {olay.tur.upper()}: {olay.deger} @{olay.pozisyon}]\n")
        sys.stderr.flush()


def calistir(soru: str, jsonl: bool = False) -> dict:
    a = Ayristirici()
    k = Kanca()

    _son_olay_idx = [0]

    def olay_kontrol() -> None:
        yeni = a.olaylar()[_son_olay_idx[0]:]
        for sahne_olay in yeni:
            kanca_olay = KancaOlay(
                tur=sahne_olay.tur,
                deger=sahne_olay.deger,
                pozisyon=sahne_olay.pozisyon,
                gorunen_metin_uzunlugu=a._gorunen_uzunluk,
            )
            # DEGISMEZ: pozisyon gorünen metin siniri icinde olmali
            k.bildir(kanca_olay, a._gorunen_uzunluk)
            _son_olay_idx[0] += 1

    k.abone(lambda o: _olay_isle(o, jsonl))

    for chunk in _uret_stream(soru):
        gorunen = a.metin(chunk)
        if gorunen:
            if jsonl:
                sys.stdout.write(json.dumps({"metin": gorunen}) + "\n")
                sys.stdout.flush()
            else:
                for c in gorunen:
                    sys.stdout.write(c)
                    sys.stdout.flush()
                    time.sleep(DAKTILO_ARALIK)
        olay_kontrol()

    if not jsonl:
        print()

    return {
        "poz_dagilimi": a.poz_dagilimi(),
        "jest_sayisi": a.jest_sayisi_toplam(),
        "bilinmeyen": a.bilinmeyen_sayisi(),
        "gorunen_uzunluk": a._gorunen_uzunluk,
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--jsonl", action="store_true", help="makine modu")
    p.add_argument("soru", nargs="?", default="Merhaba, nasil hissediyorsun?")
    args = p.parse_args()

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore

    sonuc = calistir(args.soru, jsonl=args.jsonl)
    if not args.jsonl:
        print(f"\n--- Oturum ozeti ---")
        print(f"Poz: {sonuc['poz_dagilimi']}")
        print(f"Jest: {sonuc['jest_sayisi']}")
        print(f"Bilinmeyen: {sonuc['bilinmeyen']}")
