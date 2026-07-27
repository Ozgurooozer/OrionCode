"""
DÜŞMAN TESTİ — ham chunk ofseti geçirilirse Kanca reddetmeli.
"""
import pytest

from kanca import Kanca, Olay


def _olay(tur="jest", deger="el_salliyor", poz=5, uzunluk=10):
    return Olay(tur=tur, deger=deger, pozisyon=poz, gorunen_metin_uzunlugu=uzunluk)


def test_abone_callback_cagrilir():
    k = Kanca()
    alinan: list[Olay] = []
    k.abone(alinan.append)
    o = _olay(poz=3, uzunluk=10)
    k.bildir(o, gorunen_metin_uzunlugu=10)
    assert len(alinan) == 1


def test_birden_fazla_abone():
    k = Kanca()
    a1: list[Olay] = []
    a2: list[Olay] = []
    k.abone(a1.append)
    k.abone(a2.append)
    o = _olay(poz=0, uzunluk=5)
    k.bildir(o, 5)
    assert len(a1) == 1 and len(a2) == 1


def test_ASIL_ham_chunk_ofseti_reddedilir():
    """
    DEĞİŞMEZ: pozisyon, görünür metin sınırını aşarsa assert patlamalı.
    Çağıran ham chunk uzunluğunu (örn. 512 bayt) geçirdiyse yakalanır.
    """
    k = Kanca()
    k.abone(lambda o: None)
    # olay.pozisyon (100) > gorunen_metin_uzunlugu (20) → HATA
    o = _olay(poz=100, uzunluk=20)
    with pytest.raises(AssertionError):
        k.bildir(o, gorunen_metin_uzunlugu=20)


def test_uzunluk_tutarsizligi_reddedilir():
    """Olay.gorunen_metin_uzunlugu ile bildir() argümanı uyuşmazsa hata."""
    k = Kanca()
    k.abone(lambda o: None)
    # Olay.gorunen_metin_uzunlugu=10 ama bildir'e 15 geçirildi
    o = _olay(poz=3, uzunluk=10)
    with pytest.raises(AssertionError):
        k.bildir(o, gorunen_metin_uzunlugu=15)


def test_pozisyon_sifir_gecerli():
    k = Kanca()
    k.abone(lambda o: None)
    o = _olay(poz=0, uzunluk=0)
    k.bildir(o, 0)   # metin henüz yok, olay başta ateşlendi


def test_abonelik_sayisi():
    k = Kanca()
    assert k.abonelik_sayisi() == 0
    k.abone(lambda o: None)
    k.abone(lambda o: None)
    assert k.abonelik_sayisi() == 2
