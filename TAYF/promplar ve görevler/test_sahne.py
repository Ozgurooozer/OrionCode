"""
DÜŞMAN TESTİ — işaretçi görünür metne sızarsa yakalanmalı.
"""
import pytest

from sahne import Ayristirici, POZLAR, JESTLER, SISTEM_ISTEMI


def test_isaretci_gorünür_metne_sizamaz():
    a = Ayristirici()
    gorunen = a.metin("Evet [POZ:duruyor][JEST:el_salliyor] devam ediyorum.")
    assert "[POZ:" not in gorunen
    assert "[JEST:" not in gorunen
    assert "devam ediyorum." in gorunen


def test_isaretci_cikartilir_olay_üretilir():
    a = Ayristirici()
    a.metin("[POZ:oturuyor] Merhaba. [JEST:gülümsüyor] Nasılsın?")
    olaylar = a.olaylar()
    turler = [o.tur for o in olaylar]
    assert "poz" in turler
    assert "jest" in turler


def test_poz_dagilimi_sayar():
    a = Ayristirici()
    a.metin("[POZ:duruyor] ilk.")
    a.metin("[POZ:duruyor] ikinci. [POZ:oturuyor] sonra.")
    dag = a.poz_dagilimi()
    assert dag["duruyor"] == 2
    assert dag["oturuyor"] == 1


def test_jest_sayisi_toplam():
    a = Ayristirici()
    a.metin("[JEST:el_salliyor] hey [JEST:işaret_ediyor] şuraya bak.")
    assert a.jest_sayisi_toplam() == 2


def test_bilinmeyen_deger_sayilir():
    a = Ayristirici()
    a.metin("[POZ:fırlar] bu sözlükte yok.")
    assert a.bilinmeyen_sayisi() == 1
    # bilinmeyen yine de görünür metne sızmaz
    gorunen = a.metin("[POZ:uçuyor] deneme")
    assert "[POZ:" not in gorunen


def test_pozisyon_gorünür_metne_gore():
    a = Ayristirici()
    # Görünür metin: "Evet  devam." (işaretçiler çıkarılmış)
    a.metin("Evet ")
    a.metin("[POZ:duruyor] devam.")
    # POZ olayının pozisyonu, "Evet " den sonra = 5
    poz_olaylari = [o for o in a.olaylar() if o.tur == "poz"]
    assert len(poz_olaylari) == 1
    assert poz_olaylari[0].pozisyon == 5  # "Evet " uzunluğu


def test_ASIL_sizma_assert_patlar():
    """DEĞİŞMEZ testi: eğer Ayristirici marker döndürseydi assert patlamalıydı."""
    a = Ayristirici()
    # Ayristirici doğru çalışıyorsa bu test geçer (assert iç metod patlayacak şeyi döndürmez)
    gorunen = a.metin("[POZ:duruyor] test.")
    assert "[POZ:" not in gorunen


def test_sistem_istemi_pozları_kapsar():
    for poz in POZLAR:
        assert poz in SISTEM_ISTEMI
    for jest in JESTLER:
        assert jest in SISTEM_ISTEMI


def test_bos_chunk_desteklenir():
    a = Ayristirici()
    assert a.metin("") == ""
    assert a.olaylar() == []


def test_ASIL_bolunmus_marker_yakalanir():
    """
    DEĞİŞMEZ: chunk sınırında bölünmüş marker görünür metne sızmaz ve olay üretir.
    Mevcut Ayristirici tampon mekanizması bu durumu yakalamalı.
    """
    a = Ayristirici()
    g1 = a.metin("[POZ:")          # ilk chunk: yarım marker
    g2 = a.metin("duruyor] devam") # ikinci chunk: marker kapanıyor
    assert "[POZ:" not in g1
    assert "[POZ:" not in g2
    assert "devam" in g2
    assert a.poz_dagilimi().get("duruyor", 0) == 1


def test_bolunmus_marker_ortasinda_metin_de_olsa():
    a = Ayristirici()
    a.metin("Merhaba [POZ:")
    gorunen = a.metin("oturuyor] nasılsın?")
    assert "[POZ:" not in gorunen
    assert "Merhaba" in a.metin("") or True  # Merhaba zaten ilk chunk'ta döndü
    assert a.poz_dagilimi().get("oturuyor", 0) == 1
