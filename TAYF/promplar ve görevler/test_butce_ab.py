"""KALİBRASYON: denetleyiciyi CEVABI BİLİNEN girdilerde koş."""
import pytest
from butce_ab import uyum_skoru, kos

TAM = """🔍 alternatif: X olabilir 📏 fark 3x 🎧 [TEST] geçti
⚡ EVET: tasarım değişti
kod...
Bu kodu en çok şu yanlışlar: race condition ; bunu şu gözlem yakalar: log"""

BOS = "İşte kodunuz:\n\ndef f(): pass"

YARIM = "🔍 alternatif var 📏 fark 2x\nkod..."


def test_kalibrasyon_tam_uyum():
    r = uyum_skoru(TAM)
    print("\n[tam]  ", r)
    assert r["skor"] == 1.0, f"bilinen TAM girdi 1.0 vermeli, verdi {r}"


def test_kalibrasyon_sifir_uyum():
    r = uyum_skoru(BOS)
    print("[boş]  ", r)
    assert r["skor"] == 0.0, f"bilinen BOŞ girdi 0.0 vermeli, verdi {r}"


def test_kalibrasyon_kismi_uyum():
    r = uyum_skoru(YARIM)
    print("[yarım]", r)
    assert 0.0 < r["skor"] < 1.0


def test_bos_gorev_reddedilir():
    with pytest.raises(ValueError):
        kos(lambda p, g: TAM, [], "prompt")


def test_h0_stub_ile_yakalanir():
    """Uzunluğa DUYARSIZ sahte model -> denetleyici H0 demeli."""
    r = kos(lambda p, g: TAM, ["görev"], "kısa")
    print("[duyarsız model]", r["karar"][:40])
    assert "H0" in r["karar"]


def test_h1_stub_ile_yakalanir():
    """Uzun promptta bozulan sahte model -> denetleyici H1 demeli."""
    def duyarli(p, g):
        return TAM if len(p) < 500 else BOS
    r = kos(duyarli, ["görev"], "kısa")
    print("[duyarlı model] ", r["karar"][:40])
    assert "H1" in r["karar"]
