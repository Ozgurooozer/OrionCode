"""
DÜŞMAN TESTİ — REM karantinayı atlayıp doğrudan vault'a yazarsa yakalanmalı.
"""
import pytest

from vault import Vault
from surucu import Surucu
from uyku import UykuMotoru


class StubSurucu(Surucu):
    """Ağ gerektirmeyen stub. Model/url alanları sahte."""
    def __init__(self, cevap: str = "Özet: test."):
        super().__init__(model="stub", url="http://stub")
        self._cevap = cevap

    def uret(self, sistem: str, mesaj: str, sicaklik: float = 0.0) -> str:
        return self._cevap


def _kurulu() -> tuple[Vault, UykuMotoru]:
    v = Vault()
    v.write_episode("ep01", "12 Mart: vault kararları konuşuldu.")
    v.write_episode("ep02", "14 Mart: sahne modülü tasarlandı.")
    motor = UykuMotoru(vault=v, surucu=StubSurucu())
    return v, motor


def test_nrem_episode_bulunamazsa_hata():
    _, motor = _kurulu()
    with pytest.raises(KeyError):
        motor.nrem("yok_ep")


def test_nrem_semantic_yazar():
    v, motor = _kurulu()
    onceki = len(v._semantic)
    motor.nrem("ep01")
    assert len(v._semantic) == onceki + 1


def test_nrem_capa_episoda_baglar():
    v, motor = _kurulu()
    motor.nrem("ep01")
    # Yeni eklenen semantic öğe ep01'e bağlı olmalı
    nrem_ogeleri = [s for s in v._semantic.values() if s.derived_from == "ep01"]
    assert len(nrem_ogeleri) == 1


def test_rem_karantinaya_gider_vault_degismez():
    v, motor = _kurulu()
    onceki_sem = len(v._semantic)
    motor.rem(k=1)
    # vault'a YENİ semantik öğe gitmemiş olmalı
    assert len(v._semantic) == onceki_sem
    assert len(motor.karantina) == 1


def test_ASIL_rem_onayla_olmadan_vault_a_girmez():
    """
    DEĞİŞMEZ: REM çıktısı .onayla() çağrılmadan vault'ta olmamalı.
    Bu, uyku.py'ın temel güvencesi.
    """
    v, motor = _kurulu()
    motor.rem(k=1)
    karantina_metni = motor.karantina[0]
    # vault'ta bu metin YOK
    for s in v._semantic.values():
        assert karantina_metni not in s.text


def test_rem_onaylaninca_vault_a_girer():
    v, motor = _kurulu()
    motor.rem(k=1)
    motor.onayla(0)
    assert len(motor.karantina) == 0
    # vault'ta bir öğe eklendi
    assert any(True for _ in v._semantic.values())


def test_rem_reddedilince_karantinadan_cikar():
    _, motor = _kurulu()
    motor.rem(k=1)
    motor.reddet(0)
    assert len(motor.karantina) == 0


def test_rem_k_sifir_reddedilir():
    _, motor = _kurulu()
    with pytest.raises(ValueError):
        motor.rem(k=0)


def test_karantina_readonly_kopi():
    _, motor = _kurulu()
    motor.rem(k=1)
    kopya = motor.karantina
    kopya.append("sahte ekleme")
    assert len(motor.karantina) == 1   # iç liste değişmemeli
