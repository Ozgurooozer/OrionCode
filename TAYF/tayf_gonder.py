"""
tayf_gonder — Terminale komut gönder, yanıt bekle.

CLI:  python tayf_gonder.py A "git status"
API:  from tayf_gonder import gonder; r = gonder("A", "git status")
"""
from __future__ import annotations

import argparse
import io
import sys
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

_ROOT = Path(__file__).parent / "tayf+0"
sys.path.insert(0, str(_ROOT))
from kanal import Kanal, Mesaj  # noqa: E402


def gonder(kim: str, komut: str,
           kanal_yolu: str = ".tayf/kanal.jsonl",
           bekleme: float = 30.0) -> Mesaj | None:
    kanal = Kanal(Path(kanal_yolu))
    m = kanal.yaz(Mesaj(
        kimden=kim, kime="TERMINAL",
        tur="GOREV", govde=komut,
    ))
    gid = m.mid
    imlec = m.seq + 1
    son = time.time() + bekleme
    while time.time() < son:
        msgs, imlec = kanal.oku(imlec)
        for r in msgs:
            if r.tur == "RAPOR" and r.yanit_id == gid:
                return r
        time.sleep(0.3)
    return None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("kim")
    p.add_argument("komut")
    p.add_argument("--kanal", default=".tayf/kanal.jsonl")
    p.add_argument("--bekleme", type=float, default=30.0)
    args = p.parse_args()
    r = gonder(args.kim, args.komut, args.kanal, args.bekleme)
    if r is None:
        print("ZAMAN ASIMI")
        sys.exit(1)
    print(r.govde)


if __name__ == "__main__":
    main()
