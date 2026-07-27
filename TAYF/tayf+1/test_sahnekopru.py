"""
test_sahnekopru — SahneKopru VRM köprü testleri.

Düşman testi önce: bilinmeyen olay exception fırlatmamalı.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "promplar ve görevler"))

from sahne import Olay
from sahnekopru import SahneKopru, VRMTalimati


def _olay(tur: str, deger: str) -> Olay:
    return Olay(tur=tur, deger=deger, pozisyon=0)


# ── Düşman testleri ────────────────────────────────────────────────────────────

def test_ASIL_bilinmeyen_olay_none_doner_exception_yok():
    """bilinmeyen tur → None, exception değil. Akışı kesmemeli."""
    kopru = SahneKopru()
    sonuc = kopru.isle(_olay("bilinmeyen", "uyuyan"))
    assert sonuc is None, "bilinmeyen olay None döndürmeli"
    assert kopru.metrigi()["bilinmeyen"] == 1, "metriğe sayılmalı"


def test_ASIL_bilinmeyen_poz_none_doner():
    """Sözlük dışı poz değeri → None, animasyon oluşturmamalı."""
    kopru = SahneKopru()
    sonuc = kopru.isle(_olay("poz", "asiliyor"))  # sözlük dışı
    assert sonuc is None
    assert kopru.metrigi()["bilinmeyen"] == 1


def test_ASIL_bilinmeyen_jest_none_doner():
    """Sözlük dışı jest → None."""
    kopru = SahneKopru()
    sonuc = kopru.isle(_olay("jest", "kirpiyor"))  # sözlük dışı
    assert sonuc is None
    assert kopru.metrigi()["bilinmeyen"] == 1


def test_ASIL_jest_blend_esleme():
    """gülümsüyor → VRM 0.x 'joy' blend."""
    kopru = SahneKopru()
    t = kopru.isle(_olay("jest", "gülümsüyor"))
    assert t is not None
    assert t.tur == "blend"
    assert t.deger == "joy"
    assert 0.0 < t.yogunluk <= 1.0


def test_ASIL_jest_animasyon_esleme():
    """el_salliyor → animasyon klip 'wave', blend değil."""
    kopru = SahneKopru()
    t = kopru.isle(_olay("jest", "el_salliyor"))
    assert t is not None
    assert t.tur == "animasyon"
    assert t.deger == "wave"


def test_ASIL_poz_animasyon_esleme():
    """yürüyor → 'walk' poz klip."""
    kopru = SahneKopru()
    t = kopru.isle(_olay("poz", "yürüyor"))
    assert t is not None
    assert t.tur == "poz"
    assert t.deger == "walk"


# ── Sözlük tamamlık testleri ──────────────────────────────────────────────────

def test_tum_pozlar_karsiliği_var():
    """sahne.POZLAR'daki her değerin POZ_ANIMASYON'da karşılığı olmalı."""
    from sahne import POZLAR
    from sahnekopru import POZ_ANIMASYON
    eksik = POZLAR - set(POZ_ANIMASYON)
    assert not eksik, f"POZ_ANIMASYON'da eksik: {eksik}"


def test_tum_jestler_karsiliği_var():
    """sahne.JESTLER'daki her değerin JEST_BLEND veya JEST_ANIMASYON'da karşılığı olmalı."""
    from sahne import JESTLER
    from sahnekopru import JEST_BLEND, JEST_ANIMASYON
    taninan = set(JEST_BLEND) | set(JEST_ANIMASYON)
    eksik = JESTLER - taninan
    assert not eksik, f"jest karşılıksız kalmış: {eksik}"


# ── Metrik testleri ───────────────────────────────────────────────────────────

def test_metrik_dogru_sayar():
    kopru = SahneKopru()
    kopru.isle(_olay("jest", "gülümsüyor"))     # blend
    kopru.isle(_olay("jest", "el_salliyor"))    # animasyon
    kopru.isle(_olay("poz", "duruyor"))         # poz
    kopru.isle(_olay("bilinmeyen", "falan"))    # bilinmeyen
    kopru.isle(_olay("jest", "kaş_çatıyor"))    # blend
    m = kopru.metrigi()
    assert m["blend"]      == 2
    assert m["animasyon"]  == 1
    assert m["poz"]        == 1
    assert m["bilinmeyen"] == 1


def test_vrm_talimati_frozen():
    """VRMTalimati değiştirilemez olmalı."""
    t = VRMTalimati("blend", "joy", 0.8)
    try:
        t.tur = "poz"  # type: ignore
        assert False, "frozen olmalı, değiştirilmemeli"
    except Exception:
        pass
