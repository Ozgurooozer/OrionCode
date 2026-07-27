"""
test_tiyatro — 7 test (5 ASIL düşman + 1 öz-bağışıklık + 1 bütünleşme).

sayilir() entegrasyonuyla güncellendi:
  - geçerli [TEST] → GOREV'e yanit_id ile bağlı
  - kimden="sistem" → sayılmaz (öz-bağışıklık)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from kanal import Kanal, Mesaj
from tiyatro import TiyatroAlgilayici


def kanal_yap(tmp_path):
    return Kanal(tmp_path / ".tayf" / "kanal.jsonl")


def _gorev(k: Kanal, kimden: str = "A") -> Mesaj:
    return k.yaz(Mesaj(kimden=kimden, kime="B", tur="GOREV", govde="bir şey yap"))


def _cevap_sezgi(k: Kanal) -> None:
    k.yaz(Mesaj(kimden="B", kime="A", tur="CEVAP", govde="tamam", kanit="[SEZGİ]"))


def _cevap_test(k: Kanal, gorev_mid: str) -> Mesaj:
    """Penceredeki GOREV'e bağlı geçerli [TEST] yanıtı."""
    return k.yaz(Mesaj(kimden="B", kime="A", tur="CEVAP",
                       govde="kanıtlandı", kanit="[TEST]",
                       yanit_id=gorev_mid))


# ─── DÜŞMAN TESTLERİ ───────────────────────────────────────────────────────

def test_ASIL_bos_kanal_tiyatro_degil(tmp_path):
    """Yetersiz veri → yargılanamaz → tiyatro=False."""
    k = kanal_yap(tmp_path)
    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is False
    assert s.pencere_boyutu == 0


def test_ASIL_tum_sezgi_tiyatrodur(tmp_path):
    """20 mesaj, hepsi [SEZGİ] → geçerli [TEST] yok → tiyatro=True."""
    k = kanal_yap(tmp_path)
    for _ in range(20):
        _cevap_sezgi(k)
    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is True
    assert s.test_sayisi == 0


def test_ASIL_tek_bagli_test_yeterli(tmp_path):
    """19 × [SEZGİ] + 1 × [TEST] (GOREV'e bağlı) → tiyatro=False."""
    k = kanal_yap(tmp_path)
    for _ in range(19):
        _cevap_sezgi(k)
    g = _gorev(k)
    _cevap_test(k, g.mid)
    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is False
    assert s.test_sayisi == 1


def test_ASIL_eski_test_pencere_disinda(tmp_path):
    """
    DÜŞMAN: [TEST] seq=0'da var, sonra 21 mesaj (pencere=20 dışına iter).
    Naif impl tüm kanalı tarar → yanlış False.
    Doğru impl yalnız son pencere=20'ye bakar → True.
    """
    k = kanal_yap(tmp_path)
    g0 = _gorev(k)
    _cevap_test(k, g0.mid)     # seq=1 — pencerenin dışına düşecek
    for _ in range(20):
        _cevap_sezgi(k)        # seq 2–21 — son 20 bunlar
    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is True, "eski [TEST] pencere dışı, tiyatro olmalı"
    assert s.son_test_seq is None


def test_ASIL_yetersiz_mesaj_yargılanamaz(tmp_path):
    """4 mesaj (< min_mesaj=5) → henüz yargılanamaz → tiyatro=False."""
    k = kanal_yap(tmp_path)
    for _ in range(4):
        _cevap_sezgi(k)
    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is False


# ─── ÖZ-BAĞIŞIKLIK ─────────────────────────────────────────────────────────

def test_ASIL_sistem_uyarisi_kendini_saymaz(tmp_path):
    """
    Dedektör tiyatro tespit eder, HATA [TEST] yazar (kimden="sistem").
    İkinci ve üçüncü kontrol() hâlâ tiyatro=True demeli —
    sistem kendi uyarısını geçerli iş kanıtı saymamalı.
    """
    k = kanal_yap(tmp_path)
    # Tiyatro ortamı kur: GOREV'e bağsız [SEZGİ] mesajlar
    for _ in range(10):
        _cevap_sezgi(k)

    a = TiyatroAlgilayici(k, pencere=20, min_mesaj=5)
    s1 = a.kontrol()
    assert s1.tiyatro is True

    # Dedektör uyarı yazar (kimden="sistem", [TEST])
    # Normalde relay bunu otomatik yazacak; burada elle simüle ediyoruz
    g = _gorev(k, kimden="sistem")   # sistem da bir GOREV yazabilir
    k.yaz(Mesaj(kimden="sistem", kime="*", tur="HATA",
                govde="tiyatro: 10 mesajda geçerli [TEST] yok",
                kanit="[TEST]", yanit_id=g.mid))

    s2 = a.kontrol()
    assert s2.tiyatro is True, "sistem kendi uyarısını saymamalı"
    assert s2.test_sayisi == 0


# ─── BÜTÜNLEŞME ────────────────────────────────────────────────────────────

def test_BUTUNLESME_gorev_bagli_test_sayilir_bagsiz_sayilmaz(tmp_path):
    """
    10 GOREV + 10 [SEZGİ] CEVAP + 1 bağsız [TEST] + 1 bağlı [TEST].
    Yalnız bağlı [TEST] sayılmalı → test_sayisi == 1.
    """
    k = kanal_yap(tmp_path)
    for _ in range(10):
        _gorev(k)
        _cevap_sezgi(k)
    # Bağsız [TEST] — Goodhart: gerçek GOREV'e bağlanmamış
    k.yaz(Mesaj(kimden="B", kime="A", tur="CEVAP",
                govde="test suite geçti", kanit="[TEST]",
                yanit_id=None))
    # Bağlı [TEST] — geçerli
    g = _gorev(k)
    _cevap_test(k, g.mid)

    s = TiyatroAlgilayici(k, pencere=20, min_mesaj=5).kontrol()
    assert s.tiyatro is False
    assert s.test_sayisi == 1
