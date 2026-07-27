"""
tutarlilik — GÖREV 3c: episodik tutarlılık testi.

ARAYÜZ:
  TutarlilikTesti:
    .calistir(vault, nesne, beklenen_ep_id) -> TutarlilikSonucu
  TutarlilikSonucu(eslesme, bulunan_text, beklenen_ep_id, kanit)
    kanit: "[TEST]" | "[HAYIR-YANIT]" | "[UYUMSUZ]"

TASARIM (iki aday):
  A) Bulunan metni beklenen episod metniyle tam eşleşme karşılaştır.
  B) Kelime örtüşüm skoru (jaccard) ile kısmi eşleşme.
  → B seçildi: LLM çıktısı nadir olarak kelimesi kelimesine eşleşir.
    Jaccard ≥ 0.5 "EŞLEŞME", < 0.5 "UYUMSUZ" sayılır.
    Eşik 0.5: [TAHMİN] — gerçek kullanımda kalibre edilmeli.

GOREV 3c'nin "hangi sonuç planı değiştirir" sorusu:
  - Vault'taki episod HAYIR-YANIT döndürüyorsa: episod compact edilmiş ya da
    sorgu terimleri zayıf. VaultTS.retrieve_sorted() iyileştirmesi gerekir.
  - Bulunan metin UYUMSUZ döndürüyorsa: anlam kayması var, vault yalancı olmuş.
  - Eşleşme: vault tutarlı, 3b'ye geç.

# ASSUMPTION(jaccard-threshold): 0.5 eşiği [TAHMİN]. GERÇEK oturumdan 10 vakada
# kalibre edilmeli. Düşürülürse false-positive artar (her şey eşleşir görünür),
# yükseltilirse false-negative (vault tutarlı ama test UYUMSUZ der). MVP'de 0.5
# makul başlangıç.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

_BASE = Path(__file__).parent
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from vault_ts import VaultTS  # noqa: E402

_JACCARD_ESIK = 0.5  # ASSUMPTION(jaccard-threshold)


def _jaccard(a: str, b: str) -> float:
    sa = set(a.lower().split())
    sb = set(b.lower().split())
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)


@dataclass
class TutarlilikSonucu:
    eslesme: bool
    bulunan_text: str | None
    beklenen_ep_id: str
    kanit: str   # "[TEST]" | "[HAYIR-YANIT]" | "[UYUMSUZ]"


class TutarlilikTesti:
    def calistir(self, vault: VaultTS, nesne: str,
                 beklenen_ep_id: str) -> TutarlilikSonucu:
        """
        vault'ta nesne sorgular; en taze eşleşmeyi beklenen episodla karşılaştırır.

        beklenen_ep_id compact edildiyse HAYIR-YANIT döner (yalan söylemez).
        """
        sonuclar = vault.retrieve_sorted(nesne, k=5)
        if not sonuclar:
            return TutarlilikSonucu(False, None, beklenen_ep_id, "[HAYIR-YANIT]")

        # Beklenen episoda çapasız sonuçları önce filtrele
        # (compact sonrası anchored=False olanlar güvenilmez)
        kaynakli = [r for r in sonuclar if r.anchored]
        if not kaynakli:
            return TutarlilikSonucu(False, None, beklenen_ep_id, "[HAYIR-YANIT]")

        en_iyi = kaynakli[0]
        beklenen_entry = vault._episodes.get(beklenen_ep_id)
        if beklenen_entry is None:
            # Episod compact edilmiş
            return TutarlilikSonucu(False, en_iyi.text, beklenen_ep_id, "[HAYIR-YANIT]")

        skor = _jaccard(en_iyi.text, beklenen_entry.text)
        if skor >= _JACCARD_ESIK:
            return TutarlilikSonucu(True, en_iyi.text, beklenen_ep_id, "[TEST]")
        return TutarlilikSonucu(False, en_iyi.text, beklenen_ep_id, "[UYUMSUZ]")
