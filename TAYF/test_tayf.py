"""DÜŞMAN TESTLERİ — root kanal.py davranışı (sira/sozluk/kiralama → tayf+0/test_tayf.py)."""
import json, threading, time
import pytest
from pathlib import Path

from kanal import Kanal, Mesaj, KanitTerfiHatasi


@pytest.fixture
def kanal(tmp_path):
    return Kanal(tmp_path / "tayf.jsonl")


# --- kanal: çok yazarlı güvenlik -------------------------------------
def test_ASIL_es_zamanli_yazma_kayipsiz(kanal):
    """Naif O_APPEND: iki ajan aynı anda yazınca satır bozulur/kaybolur."""
    def yaz(ad, n):
        for i in range(n):
            kanal.yaz(Mesaj(ad, "*", "RAPOR", f"{ad}-{i}", "[TEST]"))
    t = [threading.Thread(target=yaz, args=(a, 25)) for a in ("A", "B")]
    [x.start() for x in t]; [x.join() for x in t]
    satirlar = Path(kanal.yol).read_text(encoding="utf-8").splitlines()
    assert len(satirlar) == 50, f"mesaj kaybı: {len(satirlar)}"
    for s in satirlar:
        json.loads(s)                      # bozuk satır varsa patlar
    assert len({json.loads(s)["seq"] for s in satirlar}) == 50, "seq çakıştı"


def test_bos_govde_ve_bilinmeyen_tur_reddedilir(kanal):
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("A", "B", "SORU", "   "))
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("A", "B", "UCMAK", "x"))


def test_ASIL_kanit_terfi_edilemez(kanal):
    """B, A'nın [SEZGİ]'sini alıntılarken [TEST] iddia edemez."""
    a = kanal.yaz(Mesaj("A", "B", "RAPOR", "önbellek hızlandırır", "[SEZGİ]"))
    with pytest.raises(KanitTerfiHatasi):
        kanal.yaz(Mesaj("B", "A", "KARAR", "önbellek ekliyorum",
                        "[TEST]", dayanak=[a.mid]))
    # aynı seviye veya aşağısı serbest
    kanal.yaz(Mesaj("B", "A", "KARAR", "deneyeceğim", "[SEZGİ]", dayanak=[a.mid]))


def test_kendi_olcumu_dayanaksiz_test_olabilir(kanal):
    kanal.yaz(Mesaj("A", "B", "RAPOR", "sezgi", "[SEZGİ]"))
    kanal.yaz(Mesaj("B", "A", "RAPOR", "ölçtüm: 3.2x", "[TEST]"))  # dayanak yok


def test_olmayan_dayanak_reddedilir(kanal):
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("A", "B", "SORU", "x", "[SEZGİ]", dayanak=["m0099"]))


def test_imlec_tekrar_okumaz(kanal):
    kanal.yaz(Mesaj("A", "B", "SORU", "bir"))
    m1, i1 = kanal.oku(0)
    kanal.yaz(Mesaj("A", "B", "SORU", "iki"))
    m2, _ = kanal.oku(i1)
    assert len(m1) == 1 and len(m2) == 1 and m2[0].govde == "iki"


def test_iddia_turu_kanit_ister(kanal):
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("A", "B", "RAPOR", "bitti"))          # etiketsiz


def test_gorev_kanit_tasimaz(kanal):
    kanal.yaz(Mesaj("A", "B", "GOREV", "vault'a ts ekle"))     # etiketsiz OK
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("A", "B", "SORU", "hazır mı?", "[TEST]"))


def test_iddiasiz_mesaj_dayanak_olamaz(kanal):
    g = kanal.yaz(Mesaj("A", "B", "GOREV", "şunu yap"))
    with pytest.raises(ValueError):
        kanal.yaz(Mesaj("B", "A", "RAPOR", "yaptım", "[TEST]", dayanak=[g.mid]))
