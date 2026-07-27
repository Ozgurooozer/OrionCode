"""
test_vault_ts — VaultTS + RetrievedTS testleri.

Düşman testleri önce: naif tasarımın yanlış vereceği durumlar.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pytest
from vault_ts import VaultTS, RetrievedTS


def kurulu_vault() -> VaultTS:
    return VaultTS()


# ── Düşman testleri ────────────────────────────────────────────────────────────

def test_ASIL_ts_sirasi_taze_once():
    """Daha taze episod retrieve_sorted'da ilk gelmeli."""
    v = kurulu_vault()
    v.write_episode("ep_eski", "kapı kahverengi boyandı", ts=1000.0)
    v.write_episode("ep_taze", "kapı mavi boyandı", ts=2000.0)
    sonuclar = v.retrieve_sorted("kapı boyandı", k=5)
    assert sonuclar, "sonuç boş olmamalı"
    assert sonuclar[0].source_id == "ep_taze", \
        f"taze episod önce gelmeli, gelen: {sonuclar[0].source_id}"


def test_ASIL_compact_sonrasi_anchored_false():
    """Compact edilen episodun türevi çapasız olmalı — ts korunsa bile."""
    v = kurulu_vault()
    v.write_episode("ep01", "pencere açık", ts=500.0)
    v.write_semantic("s01", "pencere bilgisi", derived_from="ep01")
    v.compact_episode("ep01")
    sonuclar = v.retrieve_sorted("pencere", k=5)
    semantik = [r for r in sonuclar if r.layer == "semantic"]
    assert semantik, "semantik sonuç olmalı"
    assert not semantik[0].anchored, \
        "compact sonrası semantik öğe çapasız olmalı — ts varlığı bunu gizlememeli"


def test_ASIL_anchored_saklanmadi():
    """_semantic içindeki _Semantic nesnelerinde 'anchored' alanı olmamalı."""
    v = kurulu_vault()
    v.write_episode("ep01", "test", ts=100.0)
    v.write_semantic("s01", "test semantik", derived_from="ep01")
    for s in v._semantic.values():
        assert not hasattr(s, "anchored"), \
            "anchored saklanmış — vault.py değişmezi bozulmuş"


def test_ASIL_ts_none_otomatik_atanir():
    """ts=None verilince time.time() kullanılmalı, hata fırlatmamalı."""
    import time
    v = kurulu_vault()
    onceki = time.time()
    v.write_episode("ep_auto", "otomasyon testi", ts=None)
    sonraki = time.time()
    assert "ep_auto" in v._episodes
    entry = v._episodes["ep_auto"]
    assert onceki <= entry.ts <= sonraki, \
        f"ts otomatik atanmadı: {entry.ts}"


# ── Normal akış testleri ───────────────────────────────────────────────────────

def test_bos_id_raises():
    v = kurulu_vault()
    with pytest.raises(ValueError, match="boş"):
        v.write_episode("", "içerik", ts=1.0)


def test_tekrar_id_raises():
    v = kurulu_vault()
    v.write_episode("ep01", "ilk", ts=1.0)
    with pytest.raises(ValueError, match="zaten var"):
        v.write_episode("ep01", "ikinci", ts=2.0)


def test_k_kucuk_bir_raises():
    v = kurulu_vault()
    with pytest.raises(ValueError, match="k >= 1"):
        v.retrieve_sorted("sorgu", k=0)


def test_bos_vault_bos_sonuc():
    v = kurulu_vault()
    assert v.retrieve_sorted("herhangi şey", k=3) == []


def test_sonuc_retrieved_ts_tipi():
    """Dönen nesneler RetrievedTS olmalı."""
    v = kurulu_vault()
    v.write_episode("ep01", "test verisi burada", ts=999.0)
    sonuclar = v.retrieve_sorted("test", k=1)
    assert len(sonuclar) == 1
    assert isinstance(sonuclar[0], RetrievedTS)
    assert sonuclar[0].ts == 999.0


def test_compact_episode_true_doner():
    v = kurulu_vault()
    v.write_episode("ep01", "içerik", ts=1.0)
    assert v.compact_episode("ep01") is True


def test_compact_olmayan_false_doner():
    v = kurulu_vault()
    assert v.compact_episode("yok") is False
