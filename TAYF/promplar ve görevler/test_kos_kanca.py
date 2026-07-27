"""
DÜŞMAN TESTİ — kos_kanca entegrasyon: Kanca pozisyon uyumsuzluğunu yakalamalı.
"""
import pytest

from sahne import Ayristirici, Olay as SahneOlay
from kanca import Kanca, Olay as KancaOlay


def test_entegrasyon_temel_akis():
    """Chunk akışından olay üretilip Kanca'ya iletiliyor mu?"""
    a = Ayristirici()
    k = Kanca()
    alinan: list[KancaOlay] = []
    k.abone(alinan.append)

    chunks = ["[POZ:duruyor] Merhaba", " [JEST:el_salliyor] nasılsın?"]
    for ch in chunks:
        gorunen = a.metin(ch)
        for o in a.olaylar()[-len(a.olaylar()):]:
            ko = KancaOlay(o.tur, o.deger, o.pozisyon, a._gorunen_uzunluk)
            k.bildir(ko, a._gorunen_uzunluk)

    # Her iki olay Kanca'ya ulaştı mı?
    assert len(alinan) >= 2
    tur_kumesi = {o.tur for o in alinan}
    assert "poz" in tur_kumesi
    assert "jest" in tur_kumesi


def test_ASIL_pozisyon_sinir_disi_reddedilir():
    """
    DEĞİŞMEZ: Olay pozisyonu görünür metin uzunluğunu aşarsa assert patlamalı.
    Bu, ham chunk ofsetinin yanlışlıkla geçirildiği durumu simüle eder.
    """
    a = Ayristirici()
    k = Kanca()
    k.abone(lambda o: None)

    a.metin("[POZ:duruyor] kısa metin")
    poz_olay = a.olaylar()[0]

    # Bilerek yanlış: pozisyon=9999 ama görünür metin ~10 karakter
    yanlis_ko = KancaOlay(poz_olay.tur, poz_olay.deger, 9999, a._gorunen_uzunluk)
    with pytest.raises(AssertionError):
        k.bildir(yanlis_ko, a._gorunen_uzunluk)


def test_bolunmus_marker_entegrasyonda_calisiyor():
    """Chunk bölünmesi sahne+kanca entegrasyonunu bozmaz."""
    a = Ayristirici()
    k = Kanca()
    alinan: list[KancaOlay] = []
    k.abone(alinan.append)

    a.metin("[POZ:")          # yarım marker
    gorunen2 = a.metin("oturuyor] devam ediyor.")

    for o in a.olaylar():
        ko = KancaOlay(o.tur, o.deger, o.pozisyon, a._gorunen_uzunluk)
        k.bildir(ko, a._gorunen_uzunluk)

    assert len(alinan) == 1
    assert alinan[0].deger == "oturuyor"
    assert "[POZ:" not in gorunen2
