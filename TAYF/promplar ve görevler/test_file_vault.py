"""
DÜŞMAN TESTİ — FileVault'ta da anchored değişmezi korunuyor mu?
"""
import logging
import pytest
from pathlib import Path

from file_vault import FileVault, _strip_html


# --- HTML parse unit tests ---

def test_strip_html_tag_kaldirir():
    assert _strip_html("<b>merhaba</b>") == "merhaba"


def test_strip_html_entity_cozulur():
    assert _strip_html("&lt;test&gt;") == "<test>"


def test_strip_html_bos_giris():
    assert _strip_html("") == ""


def test_strip_html_ic_ice_tag():
    assert _strip_html("<div><p>metin</p></div>") == "metin"


# --- FileVault yükleme testleri ---

def _html_vault(tmp_path: Path, dosyalar: dict[str, str]) -> FileVault:
    """tmp_path altına HTML dosyaları yaz, FileVault döndür."""
    for isim, icerik in dosyalar.items():
        (tmp_path / f"{isim}.html").write_text(
            f"<article>{icerik}</article>", encoding="utf-8"
        )
    return FileVault(_root=tmp_path)


def test_html_dosyalar_episod_olarak_yuklenir(tmp_path):
    v = _html_vault(tmp_path, {
        "ep01": "Vault dört katmanlı olarak kararlaştırıldı.",
        "ep02": "Sahne modülü tasarlandı.",
    })
    assert "ep01" in v._episodes
    assert "ep02" in v._episodes


def test_html_tag_soyulmus_metin(tmp_path):
    v = _html_vault(tmp_path, {"ep01": "<b>önemli</b> karar"})
    assert v._episodes["ep01"] == "önemli karar"


def test_bos_dizin_hata_vermez(tmp_path):
    bos = tmp_path / "bos"
    bos.mkdir()
    v = FileVault(_root=bos)
    assert len(v._episodes) == 0


def test_yok_dizin_hata_vermez(tmp_path):
    v = FileVault(_root=tmp_path / "yok_dizin")
    assert len(v._episodes) == 0


def test_ASIL_sikistirma_sonrasi_capa_file_vault(tmp_path):
    """
    DEĞİŞMEZ: FileVault'ta da sıkıştırma sonrası çapa düşmeli.
    base Vault'un değişmezini FileVault devralıyor mu?
    """
    v = _html_vault(tmp_path, {"ep01": "on iki Mart kararları"})
    v.write_semantic("s01", "karar: dört katmanlı", derived_from="ep01")
    assert {r.source_id: r for r in v.retrieve("karar katmanlı", k=5)}["s01"].anchored
    v.compact_episode("ep01")
    after = {r.source_id: r for r in v.retrieve("karar katmanlı", k=5)}
    assert after["s01"].anchored is False, "sıkıştırma sonrası FileVault'ta çapa düşmeli"


def test_sikistirma_uyarisi_loglaniyor(tmp_path, caplog):
    """GOREV 2b: compact_episode log uyarısı FileVault'ta da çalışıyor."""
    v = _html_vault(tmp_path, {"ep01": "test içerik"})
    v.write_semantic("s01", "türev", derived_from="ep01")
    with caplog.at_level(logging.WARNING, logger="orion.vault"):
        v.compact_episode("ep01")
    assert "çapasız" in caplog.text


def test_yenile_yeni_dosya_algilar(tmp_path):
    v = FileVault(_root=tmp_path)
    assert v.yenile() == 0   # başta boş
    (tmp_path / "ep01.html").write_text("<article>yeni içerik</article>", encoding="utf-8")
    assert v.yenile() == 1
    assert "ep01" in v._episodes
