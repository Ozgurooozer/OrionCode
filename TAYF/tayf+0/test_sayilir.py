"""
test_sayilir — 6 test.

DÜŞMAN: Goodhart (bağsız test), öz-sayma (sistem), biçimsel bağlantı (ilgisiz yanit_id).
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from kanal import Mesaj
from sayilir import sayilir


def _gorev_mid(seq: int) -> str:
    return f"m{seq:04d}"


def _test_mesaji(kimden: str = "B", yanit_id: str | None = "m0000") -> Mesaj:
    return Mesaj(kimden=kimden, kime="A", tur="CEVAP",
                 govde="işte kanıt", kanit="[TEST]",
                 yanit_id=yanit_id, seq=5)


# ─── DÜŞMAN TESTLERİ ───────────────────────────────────────────────────────

def test_ASIL_bagsiz_test_sayilmaz():
    """yanit_id yok → Goodhart — boşta koşulan test suite."""
    m = Mesaj(kimden="B", kime="A", tur="RAPOR",
              govde="19 passed", kanit="[TEST]",
              yanit_id=None, seq=5)
    assert sayilir(m, {"m0000", "m0002"}) is False


def test_ASIL_pencere_disi_gorev_sayilmaz():
    """yanit_id penceredeki GOREV'e değil → biçimsel bağlantı, içerik ilgisiz."""
    m = _test_mesaji(yanit_id="m0099")         # m0099 pencerede yok
    assert sayilir(m, {"m0000", "m0002"}) is False


def test_ASIL_sistem_kendini_saymaz():
    """kimden="sistem" → dedektörün kendi uyarısı, öz-sayma yasak."""
    m = Mesaj(kimden="sistem", kime="*", tur="HATA",
              govde="tiyatro tespit edildi", kanit="[TEST]",
              yanit_id="m0000", seq=5)
    assert sayilir(m, {"m0000"}) is False


def test_ASIL_sezgi_sayilmaz():
    """[SEZGİ] kanıtı sayılmaz — yalnız [TEST] geçer."""
    m = Mesaj(kimden="B", kime="A", tur="CEVAP",
              govde="sanırım doğru", kanit="[SEZGİ]",
              yanit_id="m0000", seq=5)
    assert sayilir(m, {"m0000"}) is False


# ─── DOĞRU KULLANIM ────────────────────────────────────────────────────────

def test_gecerli_is_kaniti_sayilir():
    """Penceredeki GOREV'e bağlı [TEST] → geçerli."""
    m = _test_mesaji(kimden="B", yanit_id="m0000")
    assert sayilir(m, {"m0000", "m0002"}) is True


# ─── BÜTÜNLEŞME ────────────────────────────────────────────────────────────

def test_BUTUNLESME_bos_pencere_gorev_kumesi():
    """Pencerede hiç GOREV yoksa hiçbir [TEST] sayılmaz."""
    m = _test_mesaji(yanit_id="m0000")
    assert sayilir(m, set()) is False
