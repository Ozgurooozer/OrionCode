import pytest
from kanal import Mesaj
from sayilir import sayilir, tiyatro_mu, SISTEM


def m(seq, kimden, tur, govde, kanit="", yanit_id=None):
    x = Mesaj(kimden, "*", tur, govde, kanit, yanit_id)
    x.seq = seq
    return x


def test_ASIL_dedektor_kendi_ciktisini_saymaz():
    """Sistem uyarısı [TEST] taşısa bile kanıt değil."""
    p = [m(0, SISTEM, "RAPOR", "tiyatro uyarısı", "[TEST]", "m0000")]
    tiyatro, _ = tiyatro_mu(p)
    assert tiyatro is True


def test_ASIL_ucuz_test_bayragi_temizlemez():
    """Boşta koşulan test suite, göreve bağlı olmadığı için sayılmaz."""
    p = [m(0, "A", "GOREV", "vault'a ts ekle"),
         m(1, "B", "RAPOR", "pytest: 21 passed", "[TEST]")]   # yanit_id yok
    tiyatro, gerekce = tiyatro_mu(p)
    assert tiyatro is True and "ucuz" in gerekce


def test_goreve_bagli_test_sayilir():
    p = [m(0, "A", "GOREV", "vault'a ts ekle"),
         m(1, "B", "RAPOR", "eklendi, 3 yeni test geçti", "[TEST]", "m0000")]
    tiyatro, gerekce = tiyatro_mu(p)
    assert tiyatro is False and "m0001" in gerekce


def test_pencere_disi_goreve_bagli_rapor_sayilmaz():
    """Eski göreve bağlı rapor taze iş kanıtı değil."""
    p = [m(30, "B", "RAPOR", "eski işi bitirdim", "[TEST]", "m0005")]
    assert tiyatro_mu(p)[0] is True


def test_sezgi_etiketli_rapor_sayilmaz():
    p = [m(0, "A", "GOREV", "yap"),
         m(1, "B", "RAPOR", "sanırım oldu", "[SEZGİ]", "m0000")]
    assert tiyatro_mu(p)[0] is True


def test_sistem_gorevi_de_sayilmaz():
    """Dedektör kendine görev verip kendi cevaplayamaz."""
    p = [m(0, SISTEM, "GOREV", "kendine iş"),
         m(1, SISTEM, "RAPOR", "yaptım", "[TEST]", "m0000")]
    assert tiyatro_mu(p)[0] is True
