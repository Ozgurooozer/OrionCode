"""DÜŞMAN TESTİ — 'ajanlar görevle kazansın' tasarımını kıran senaryolar."""
import pytest
from butce import Butce, MALIYET


def kur(tavan=100, **tahsis):
    b = Butce(tavan)
    for k, v in tahsis.items():
        b.tahsis(k, v)
    return b


def test_ASIL_ajan_kendi_butcesini_artiramaz():
    """
    Anti-Goodhart invaryantı: ajanın erişebildiği HİÇBİR yol bakiyeyi
    artırmamalı. İnvaryant metodun YOKLUĞU ile korunuyor.
    """
    b = kur(A=50)
    ajan_yollari = [m for m in dir(b)
                    if not m.startswith("_") and m not in ("tahsis", "tavan")]
    assert set(ajan_yollari) == {"harca", "kalan", "dokum", "reddedilen"}
    once = b.kalan("A")
    for _ in range(20):
        b.harca("A", "iş", "geri_alinabilir")
    assert b.kalan("A") < once, "harcama bakiyeyi ancak DÜŞÜRÜR"


def test_ASIL_bakmak_bedava():
    """Ham çıktıya bakmanın bütçe bahanesi olmamalı."""
    b = kur(A=0)
    for _ in range(1000):
        assert b.harca("A", "ham spektrumu incele", "bak") is True
        assert b.harca("A", "alternatif tasarım düşün", "dusun") is True
    assert b.kalan("A") == 0


def test_maliyet_geri_alma_maliyetiyle_artar():
    assert (MALIYET["bak"] < MALIYET["geri_alinabilir"]
            < MALIYET["geri_alinamaz"] < MALIYET["dis_sistem"])


def test_ASIL_butce_bitince_dusunme_devam_taahhut_durur():
    """Zarif bozulma: sert stop değil. Bakmak ve düşünmek serbest kalır."""
    b = kur(A=5)
    assert b.harca("A", "şema değiştir", "geri_alinamaz") is False   # 10 > 5
    assert b.harca("A", "logu oku", "bak") is True
    assert b.harca("A", "yeniden tasarla", "dusun") is True
    assert b.kalan("A") == 5 and b.reddedilen == 1


def test_negatife_dusmez():
    b = kur(A=3)
    b.harca("A", "x", "geri_alinabilir")
    b.harca("A", "y", "geri_alinabilir")
    b.harca("A", "z", "geri_alinabilir")
    assert b.harca("A", "w", "geri_alinabilir") is False
    assert b.kalan("A") == 0


def test_ASIL_denetci_onay_ve_ret_ayni_maliyette():
    """Ret ucuz olsaydı denetçi varsayılan olarak reddederdi."""
    assert MALIYET["onayla"] == MALIYET["reddet"]
    b = kur(D=20)
    b.harca("D", "iddiayı onayla", "onayla")
    onay_sonrasi = b.kalan("D")
    b2 = kur(D=20)
    b2.harca("D", "iddiayı reddet", "reddet")
    assert b2.kalan("D") == onay_sonrasi


def test_tavan_asilamaz():
    b = Butce(10)
    b.tahsis("A", 7)
    with pytest.raises(ValueError):
        b.tahsis("B", 5)


def test_dokum_kim_neye_harcadi():
    b = kur(A=50, B=50)
    b.harca("A", "x", "geri_alinamaz")
    b.harca("B", "y", "geri_alinabilir")
    d = b.dokum()
    assert d["harcama"]["A"]["geri_alinamaz"] == 10
    assert d["harcama"]["B"]["geri_alinabilir"] == 1
