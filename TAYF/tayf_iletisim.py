"""
tayf_iletisim — Ajanlar arası doğrudan kanal iletişimi.

CLI:
  python tayf_iletisim.py yaz  A B GOREV  "vault_ts bos sorgu davranisi?"
  python tayf_iletisim.py yaz  B A CEVAP  "bos sorgu [] doner" --kanit "[TEST]" --dayanak m042
  python tayf_iletisim.py yaz  A B ITIRAZ "dayanak yok, test goster" --dayanak m043
  python tayf_iletisim.py bekle A          --sure 120
  python tayf_iletisim.py oku              --son 10

API:
  from tayf_iletisim import yaz, bekle, oku
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
from kanal import Kanal, KanitTerfiHatasi, Mesaj  # noqa: E402

_VARSAYILAN_KANAL = ".tayf/kanal.jsonl"


_KANIFSIZ_TURLER = {"GOREV", "SORU", "BITTI", "ZAMAN_ASIMI"}


def yaz(kimden: str, kime: str, tur: str, govde: str,
        kanit: str | None = None,
        dayanak: list[str] | None = None,
        kanal_yolu: str = _VARSAYILAN_KANAL) -> Mesaj:
    # Intent mesajlar kanıt taşımaz; claim mesajlar varsayılan [SEZGİ]
    if kanit is None and tur not in _KANIFSIZ_TURLER:
        kanit = "[SEZGİ]"
    k = Kanal(Path(kanal_yolu))
    try:
        m = k.yaz(Mesaj(
            kimden=kimden, kime=kime, tur=tur,
            govde=govde, kanit=kanit,
            dayanak=dayanak or [],
        ))
        print(f"[{m.mid}] {kimden} -> {kime} [{tur}] {kanit}")
        return m
    except KanitTerfiHatasi as e:
        print(f"KANIT TERFI HATASI: {e}")
        sys.exit(2)


def bekle(kime: str, sure: float = 120.0,
          kanal_yolu: str = _VARSAYILAN_KANAL) -> list[Mesaj]:
    """Bana gelen mesajları bekle (TERMINAL hariç)."""
    k = Kanal(Path(kanal_yolu))
    _, imlec = k.oku(0)
    # Mevcut okunmamış mesajları da kontrol et
    imlec = max(0, imlec - 50)
    bitis = time.time() + sure
    print(f"[{kime}] mesaj bekleniyor (max {sure:.0f}s)...", flush=True)
    while time.time() < bitis:
        msgs, imlec = k.oku(imlec)
        gelen = [m for m in msgs
                 if m.kime in (kime, "*")
                 and m.kimden != "TERMINAL"
                 and m.kimden != kime]
        if gelen:
            for m in gelen:
                print(f"\n[{m.mid}] {m.kimden} -> {m.kime} [{m.tur}] {m.kanit}")
                print(f"  {m.govde[:300]}")
            return gelen
        time.sleep(0.5)
    print("Zaman asimi — mesaj gelmedi.")
    return []


def oku(son: int = 20, kanal_yolu: str = _VARSAYILAN_KANAL) -> None:
    """Kanal son N mesajını göster."""
    k = Kanal(Path(kanal_yolu))
    msgs, _ = k.oku()
    for m in msgs[-son:]:
        govde = m.govde[:70].replace("\n", " ")
        print(f"[{m.seq:03d}] {m.kimden:8s}->{m.kime:8s} [{m.tur:12s}] {(m.kanit or ''):20s} {govde}")


def main() -> None:
    p = argparse.ArgumentParser(description="TAYF ajan-arası iletişim")
    sub = p.add_subparsers(dest="cmd", required=True)

    # yaz
    w = sub.add_parser("yaz")
    w.add_argument("kimden")
    w.add_argument("kime")
    w.add_argument("tur", choices=["GOREV","SORU","CEVAP","RAPOR","HATA","KARAR","ITIRAZ","BITTI","ZAMAN_ASIMI"])
    w.add_argument("govde")
    w.add_argument("--kanit", default=None)
    w.add_argument("--dayanak", nargs="*", default=[])
    w.add_argument("--kanal", default=_VARSAYILAN_KANAL)

    # bekle
    b = sub.add_parser("bekle")
    b.add_argument("kime")
    b.add_argument("--sure", type=float, default=120.0)
    b.add_argument("--kanal", default=_VARSAYILAN_KANAL)

    # oku
    o = sub.add_parser("oku")
    o.add_argument("--son", type=int, default=20)
    o.add_argument("--kanal", default=_VARSAYILAN_KANAL)

    args = p.parse_args()

    if args.cmd == "yaz":
        yaz(args.kimden, args.kime, args.tur, args.govde,
            args.kanit, args.dayanak, args.kanal)
    elif args.cmd == "bekle":
        msgs = bekle(args.kime, args.sure, args.kanal)
        if not msgs:
            sys.exit(1)
    elif args.cmd == "oku":
        oku(args.son, args.kanal)


if __name__ == "__main__":
    main()
