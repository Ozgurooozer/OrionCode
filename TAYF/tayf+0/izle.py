"""
izle — TAYF kanal izleyicisi. Salt-okuma, gözlemci terminal.

KULLANIM:
  python izle.py <kanal.jsonl>
  python izle.py <kanal.jsonl> --sadece A
  python izle.py <kanal.jsonl> --ham

Stdout'u canlı takip eder (tail -f gibi ama JSONL-farkında).
Ctrl+C ile çıkar.

# ASSUMPTION(readonly): Bu script ASLA kanala yazmaz.
# ASSUMPTION(utf8): Kanal UTF-8 JSONL. cp1254 / ASCII fallback yok.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

_RENK = {
    "GOREV":      "\033[94m",   # mavi
    "SORU":       "\033[96m",   # cyan
    "CEVAP":      "\033[92m",   # yesil
    "RAPOR":      "\033[93m",   # sari
    "HATA":       "\033[91m",   # kirmizi
    "KARAR":      "\033[95m",   # mor
    "ITIRAZ":     "\033[91;1m", # kirmizi kalın
    "BITTI":      "\033[32;1m", # yesil kalın
    "ZAMAN_ASIMI":"\033[33;1m", # sari kalın
}
_SIFIRLA = "\033[0m"


def _formatla(satir: str, sadece: str | None) -> str | None:
    try:
        d = json.loads(satir)
    except json.JSONDecodeError:
        return f"[JSONL HATASI] {satir[:80]}"
    if sadece and d.get("kimden") != sadece:
        return None
    renk = _RENK.get(d.get("tur", ""), "")
    kanit = d.get("kanit", "")
    return (
        f"{renk}[{d.get('seq', '?'):04d}] "
        f"{d.get('kimden','?')} → {d.get('kime','?')} "
        f"[{d.get('tur','?')}] {kanit}{_SIFIRLA}\n"
        f"  {d.get('govde','')[:200]}"
    )


def izle(yol: Path, sadece: str | None, ham: bool) -> None:
    print(f"Kanal: {yol}  (Ctrl+C ile cik)", flush=True)
    imlec = 0
    while True:
        try:
            satirlar = yol.read_text(encoding="utf-8").splitlines()
        except FileNotFoundError:
            time.sleep(0.5)
            continue
        for s in satirlar[imlec:]:
            if not s.strip():
                continue
            if ham:
                print(s, flush=True)
            else:
                cikti = _formatla(s, sadece)
                if cikti:
                    print(cikti, flush=True)
        imlec = len(satirlar)
        time.sleep(0.4)


def main() -> None:
    p = argparse.ArgumentParser(description="TAYF kanal izleyicisi")
    p.add_argument("kanal", type=Path, help="kanal.jsonl yolu")
    p.add_argument("--sadece", default=None, help="Sadece bu ajanın mesajları")
    p.add_argument("--ham", action="store_true", help="JSON ham satırlar")
    args = p.parse_args()
    try:
        izle(args.kanal, args.sadece, args.ham)
    except KeyboardInterrupt:
        print("\nCikis.", flush=True)
        sys.exit(0)


if __name__ == "__main__":
    main()
