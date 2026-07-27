"""DÜŞMAN TESTİ — naif "sil ve unut" tasarımını kıran senaryo."""
import pytest
from zaman_vault import ZamanVault


def kur() -> ZamanVault:
    v = ZamanVault()
    v.write_episode("ep01", "12 Mart: vault dört katmanlı kararlaştırıldı", ts=100)
    v.write_semantic("s01", "vault dört katmanlıdır", derived_from="ep01", ts=110)
    return v


def test_ASIL_gecmis_dilimde_capa_o_ANKI_duruma_gore():
    """
    Naif impl: dilim alırken BUGÜNKÜ çapa durumunu kullanır -> t=150'de de
    çapasız der. Doğru impl: t=150'de episod vardı, çapalıydı.
    """
    v = kur()
    v.compact_episode("ep01", ts=200)

    simdi = {r.source_id: r for r in v.retrieve("vault", k=10)}
    assert simdi["s01"].anchored is False, "bugün çapasız olmalı"

    gecmis = {r.source_id: r for r in v.dilim(w=150)}
    assert gecmis["s01"].anchored is True, "t=150'de ÇAPALIYDI"
    assert "ep01" in gecmis, "t=150'de episod duruyordu"


def test_silme_sonrasi_dilimde_episod_yok():
    v = kur(); v.compact_episode("ep01", ts=200)
    d = {r.source_id for r in v.dilim(w=250)}
    assert "ep01" not in d


def test_yazilmadan_onceki_dilimde_yok():
    v = kur()
    assert {r.source_id for r in v.dilim(w=50)} == set()


def test_ufuk_gerisine_dilim_reddedilir():
    v = ZamanVault(ufuk_ts=1000)
    with pytest.raises(ValueError):
        v.dilim(w=500)


def test_capasiz_semantik_hicbir_dilimde_capali_degil():
    v = ZamanVault()
    v.write_semantic("s99", "uydurma bilgi", derived_from=None, ts=100)
    assert {r.source_id: r for r in v.dilim(150)}["s99"].anchored is False


def test_miras_retrieve_bozulmadi():
    v = kur()
    r = {x.source_id: x for x in v.retrieve("vault katmanlı", k=10)}
    assert r["s01"].anchored is True and "ep01" in r
