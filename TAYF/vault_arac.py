"""
vault_arac — TAYF ajanları için C:\\vault araç seti.

CLI:
  python vault_arac.py arama "orion entegrasyon"
  python vault_arac.py oku  forum/orion0fis/config.json
  python vault_arac.py liste [tip]         # tip: office|thread|project|note|agent
  python vault_arac.py yaz  forum/orion0fis/toplantilar/test/index.html <html>

Write-guard (C:\\vault\\CLAUDE.md kurallarina gore):
  archive/**  -> salt-okunur
  agents/*/profile.md -> salt-okunur
  agents/*/log.md -> salt-okunur
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

VAULT = Path("C:/vault")
INDEX = VAULT / ".index" / "pages.json"

_YAZMA_YASAGI = [
    re.compile(r"^archive/"),
    re.compile(r"^agents/[^/]+/profile\.md$"),
    re.compile(r"^agents/[^/]+/log\.md$"),
    re.compile(r"^templates/"),
]


def _yaz_guard(relpath: str) -> None:
    for pat in _YAZMA_YASAGI:
        if pat.match(relpath.replace("\\", "/")):
            raise PermissionError(f"[YAZMA YASAGI] {relpath} salt-okunur — C:\\vault\\CLAUDE.md kuralı")


def _sayfalari_yukle() -> list[dict]:
    if not INDEX.exists():
        return []
    return json.loads(INDEX.read_text(encoding="utf-8"))


def arama(sorgu: str, limit: int = 10) -> None:
    """pages.json uzerinde keyword arama."""
    sayfalar = _sayfalari_yukle()
    kelimeler = sorgu.lower().split()
    sonuclar = []
    for s in sayfalar:
        puan = 0
        metin = f"{s.get('title','')} {s.get('summary','')} {s.get('id','')}".lower()
        for k in kelimeler:
            if k in metin:
                puan += 1
        if puan > 0:
            sonuclar.append((puan, s))
    sonuclar.sort(key=lambda x: -x[0])
    for puan, s in sonuclar[:limit]:
        print(f"[{puan:d}] {s['id']:30s} {s.get('type','?'):10s} {s.get('title','')[:60]}")
    if not sonuclar:
        print(f"[0 sonuc] '{sorgu}' icin eslesme bulunamadi")


def oku(hedef: str) -> None:
    """Vault sayfasini oku: HTML'den metin cikart, JSON'u direkt goster."""
    yol = VAULT / hedef
    if yol.is_dir():
        yol = yol / "index.html"
    if not yol.exists():
        # pages.json id olarak ara
        sayfalar = _sayfalari_yukle()
        eslesen = [s for s in sayfalar if s["id"] == hedef or s["path"] == hedef]
        if eslesen:
            yol = VAULT / eslesen[0]["path"]
            if yol.is_dir():
                yol = yol / "index.html"
        else:
            print(f"HATA: {hedef} bulunamadi")
            sys.exit(1)

    icerik = yol.read_text(encoding="utf-8", errors="replace")

    if yol.suffix in (".json", ".md"):
        print(icerik[:4000])
        return

    # HTML -> metin: tag'leri sil, bos satirlari temizle
    metin = re.sub(r"<style[^>]*>.*?</style>", "", icerik, flags=re.S)
    metin = re.sub(r"<script[^>]*>.*?</script>", "", metin, flags=re.S)
    metin = re.sub(r"<[^>]+>", " ", metin)
    metin = re.sub(r"[ \t]+", " ", metin)
    satirlar = [s.strip() for s in metin.splitlines() if s.strip()]
    print("\n".join(satirlar[:80]))


def liste(tip: str | None = None) -> None:
    """Vault sayfalarini listele."""
    sayfalar = _sayfalari_yukle()
    if tip:
        sayfalar = [s for s in sayfalar if s.get("type") == tip]
    for s in sayfalar:
        print(f"{s['id']:35s} {s.get('type','?'):12s} {s.get('title','')[:50]}")
    print(f"\n[{len(sayfalar)} sayfa]")


def yaz(relpath: str, icerik: str) -> None:
    """Vault sayfasi yaz (write-guard kontrol eder)."""
    _yaz_guard(relpath)
    hedef = VAULT / relpath
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_text(icerik, encoding="utf-8")
    print(f"[YAZILDI] {hedef}")


def main() -> None:
    p = argparse.ArgumentParser(description="C:\\vault araç seti")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("arama"); s.add_argument("sorgu"); s.add_argument("--limit", type=int, default=10)
    o = sub.add_parser("oku"); o.add_argument("hedef")
    li = sub.add_parser("liste"); li.add_argument("tip", nargs="?")
    w = sub.add_parser("yaz"); w.add_argument("relpath"); w.add_argument("icerik")

    args = p.parse_args()
    if args.cmd == "arama":
        arama(args.sorgu, args.limit)
    elif args.cmd == "oku":
        oku(args.hedef)
    elif args.cmd == "liste":
        liste(args.tip)
    elif args.cmd == "yaz":
        yaz(args.relpath, args.icerik)


if __name__ == "__main__":
    main()
