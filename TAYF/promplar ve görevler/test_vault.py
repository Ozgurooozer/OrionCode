"""
DÜŞMAN TESTİ — naif çözümü (yazma anında boolean damga) kıran test.

Kırılma senaryosu: semantik öğe yazılır (çapalı), SONRA kaynak episod
sıkıştırılır. Damga tasarımı hâlâ "çapalı" der ve yalan söyler.
Referans tasarımı okuma anında çözdüğü için doğru cevabı verir.
"""
import logging
import pytest

from vault import Vault, format_for_agent


def kurulu() -> Vault:
    v = Vault()
    v.write_episode("ep01", "12 Mart oturumu: vault dört katmanlı olarak kararlaştırıldı")
    v.write_semantic("s01", "vault dört katmanlıdır", derived_from="ep01")
    v.write_semantic("s02", "vault yedi katmanlıdır", derived_from=None)  # çapasız
    v.write_personal("p01", "kullanıcı Türkçe yanıt tercih ediyor")
    return v


def test_bos_id_reddedilir():
    v = Vault()
    with pytest.raises(ValueError):
        v.write_episode("", "x")
    with pytest.raises(ValueError):
        v.write_semantic("", "x")


def test_tekrarlanan_episode_id_reddedilir():
    v = kurulu()
    with pytest.raises(ValueError):
        v.write_episode("ep01", "başka metin")


def test_k_sifir_reddedilir():
    with pytest.raises(ValueError):
        kurulu().retrieve("vault", k=0)


def test_capali_ve_capasiz_ayirt_edilir():
    r = {x.source_id: x for x in kurulu().retrieve("vault katmanlı", k=10)}
    assert r["s01"].anchored is True
    assert r["s02"].anchored is False


def test_ASIL_sikistirma_sonrasi_capa_duser():
    """
    Damga tasarımının YALAN söyleyeceği an. Referans tasarımı doğru demeli.
    """
    v = kurulu()
    assert {x.source_id: x for x in v.retrieve("vault", k=10)}["s01"].anchored is True
    v.compact_episode("ep01")          # episod gitti, s01 kaldı
    after = {x.source_id: x for x in v.retrieve("vault", k=10)}
    assert after["s01"].anchored is False, "sıkıştırmadan sonra çapa DÜŞMELİ"
    assert after["s01"].anchor_id == "ep01"  # neye dayandığı hâlâ biliniyor


def test_sikistirma_sessiz_olmaz(caplog):
    """GÖZLEMLENEBİLİRLİK: çapasızlaşma log'a düşmeli."""
    v = kurulu()
    with caplog.at_level(logging.WARNING, logger="orion.vault"):
        v.compact_episode("ep01")
    assert "çapasız" in caplog.text


def test_bicimlendirme_iki_sinifi_ayirir():
    çıktı = format_for_agent(kurulu().retrieve("vault katmanlı", k=10))
    assert "KAYNAKLI" in çıktı and "TANIDIK ama KAYNAKSIZ" in çıktı
    # zehirli çapasız öğe, karar gerekçesi bölümünde OLMAMALI
    kaynakli_bolum = çıktı.split("TANIDIK")[0]
    assert "yedi katmanlıdır" not in kaynakli_bolum
