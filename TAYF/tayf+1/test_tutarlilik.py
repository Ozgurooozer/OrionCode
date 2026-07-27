"""
test_tutarlilik — TutarlilikTesti (GÖREV 3c) testleri.

Düşman testi: compact sonrası HAYIR-YANIT dönmeli, eşleşme değil.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from vault_ts import VaultTS
from tutarlilik import TutarlilikTesti


def kurulu() -> tuple[VaultTS, TutarlilikTesti]:
    return VaultTS(), TutarlilikTesti()


# ── Düşman testleri ────────────────────────────────────────────────────────────

def test_ASIL_compact_sonrasi_hayir_yanit():
    """Compact edilen episod için tutarlılık HAYIR-YANIT dönmeli — eşleşme değil."""
    v, t = kurulu()
    v.write_episode("ep01", "masa ahşap kahverengi kenarları yuvarlak", ts=100.0)
    v.write_semantic("s01", "masa bilgisi var", derived_from="ep01")
    v.compact_episode("ep01")

    # Artık episod yok; semantik var ama çapasız
    sonuc = t.calistir(v, "masa", "ep01")
    assert not sonuc.eslesme, "compact sonrası eşleşme olmamalı"
    assert sonuc.kanit == "[HAYIR-YANIT]", \
        f"compact sonrası HAYIR-YANIT beklendi, gelen: {sonuc.kanit}"


def test_ASIL_yanlis_icerik_uyumsuz():
    """Vault'taki içerik beklenenle örtüşmüyorsa UYUMSUZ dönmeli."""
    v, t = kurulu()
    # ep01: masa hakkında bilgi yaz
    v.write_episode("ep01", "masa ahşap kahverengi kenarları yuvarlak", ts=100.0)
    # ep02: sandalye hakkında bilgi yaz (tamamen farklı)
    v.write_episode("ep02", "sandalye plastik kırmızı yüksek arkalık", ts=200.0)

    # masa soruyoruz ama beklenen_ep_id ep02 (sandalye) → uyumsuz
    sonuc = t.calistir(v, "masa", "ep02")
    assert not sonuc.eslesme
    assert sonuc.kanit == "[UYUMSUZ]", \
        f"UYUMSUZ beklendi, gelen: {sonuc.kanit}"


def test_ASIL_bos_vault_hayir_yanit():
    """Hiçbir episod yoksa HAYIR-YANIT."""
    v, t = kurulu()
    sonuc = t.calistir(v, "masa", "ep01")
    assert not sonuc.eslesme
    assert sonuc.kanit == "[HAYIR-YANIT]"


# ── Başarılı eşleşme ──────────────────────────────────────────────────────────

def test_tutarli_eslesme():
    """Doğru episod vault'taysa ve sorgu eşleşiyorsa TEST dönmeli."""
    v, t = kurulu()
    v.write_episode("ep01", "masa ahşap kahverengi kenarları yuvarlak", ts=100.0)
    sonuc = t.calistir(v, "masa ahşap", "ep01")
    assert sonuc.eslesme
    assert sonuc.kanit == "[TEST]"
    assert sonuc.bulunan_text is not None


def test_taze_episod_once_kontrol_edilir():
    """İki episod varsa taze olan önce değerlendirilmeli."""
    v, t = kurulu()
    v.write_episode("ep_eski", "sandalye mavi plastik", ts=50.0)
    v.write_episode("ep_taze", "sandalye mavi plastik yeni model", ts=200.0)
    # ep_taze ile eşleşmeli (taze önce)
    sonuc = t.calistir(v, "sandalye mavi", "ep_taze")
    assert sonuc.eslesme
    assert sonuc.kanit == "[TEST]"


def test_sonuc_ep_id_korunur():
    """TutarlilikSonucu'nda beklenen_ep_id değeri korunmalı."""
    v, t = kurulu()
    v.write_episode("ep99", "kitaplık tahta dört raf", ts=300.0)
    sonuc = t.calistir(v, "kitaplık", "ep99")
    assert sonuc.beklenen_ep_id == "ep99"
