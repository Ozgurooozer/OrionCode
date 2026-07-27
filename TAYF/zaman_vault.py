"""
zaman_vault — vault'a ZAMAN EKSENİ ekler: geçmiş bir koordinattaki inanç
durumu yeniden kurulabilir.

BULGU: "t=150'de neye inanıyordun?" sorusunu cevaplayabilmek için silme YOK
EDİCİ olamaz. Mevcut compact_episode episodu siliyor; o an sonrası için doğru
(çapa düşmeli) ama o an ÖNCESİ sorulamaz hale geliyor. Zaman tek yönlü olur.

ÇÖZÜM: silme bir MEZAR TAŞIDIR (silme_ts), içerik durur.
  - şimdi   -> episod yok sayılır, türevleri çapasız (eski davranış korunur)
  - t<silme -> episod vardı, türevleri çapalıydı (yeni yetenek)

AYRIM (bu oturumun görünürdeki çelişkisini çözer):
  KOORDİNAT bir olgudur (t=120 hep t=120) -> yazma anında atanır, saklanır.
  ÇAPA bir ilişkidir (başkasının durumuna bağlı) -> okuma anında çözülür,
  ve DİLİM alınırken verilen koordinata göre çözülür, bugüne göre değil.

# ASSUMPTION(mezar-tasi-buyur): tombstone'lar sınırsız büyür. Gerçek budama
# ancak "şu koordinattan eskisine bir daha bakmayacağım" kararıyla yapılır ve
# O KARAR geri alınamaz — ufuk (ufuk_ts) açıkça kaydedilir.

ARAYÜZ:
  ZamanVault(ufuk_ts=0.0)
    .write_episode(id, text, ts=None)
    .write_semantic(id, text, derived_from=None, ts=None)
    .compact_episode(id, ts=None) -> bool     ; mezar taşı, silme değil
    .dilim(w) -> list[Retrieved]              ; w anındaki inanç durumu
    .retrieve(...)                            ; miras, "şimdi" görünümü
  Hata: ValueError (ufkun gerisine dilim, geçmişe yazma)
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

# vault.py "promplar ve görevler/" altında; sys.path'e ekle
_PG = Path(__file__).parent / "promplar ve görevler"
if str(_PG) not in sys.path:
    sys.path.insert(0, str(_PG))

from vault import Vault, Retrieved, _Semantic


class ZamanVault(Vault):
    def __init__(self, ufuk_ts: float = 0.0) -> None:
        super().__init__()
        self.ufuk_ts = ufuk_ts          # bundan eskisi budanmış olabilir
        self._yazma: dict[str, float] = {}
        self._mezar: dict[str, float] = {}

    # --- yazma: koordinat atanır ---------------------------------------
    def write_episode(self, episode_id: str, text: str,
                      ts: float | None = None) -> None:
        super().write_episode(episode_id, text)
        self._yazma[episode_id] = time.time() if ts is None else ts

    def write_semantic(self, item_id: str, text: str,
                       derived_from: str | None = None,
                       ts: float | None = None) -> None:
        super().write_semantic(item_id, text, derived_from)
        self._yazma[item_id] = time.time() if ts is None else ts

    # --- silme: mezar taşı, yok etme değil -----------------------------
    def compact_episode(self, episode_id: str, ts: float | None = None) -> bool:
        if episode_id not in self._episodes:
            return False
        self._mezar[episode_id] = time.time() if ts is None else ts
        # İçerik DURUR. "şimdi" görünümü _var_mi ile hesaplanır.
        return True

    def _var_mi(self, oid: str, w: float | None) -> bool:
        """Nesne w anında var mıydı? w=None ise 'şimdi'."""
        yz = self._yazma.get(oid)
        if yz is None:
            return False
        mz = self._mezar.get(oid)
        if w is None:
            return mz is None
        return yz <= w and (mz is None or mz > w)

    # --- şimdi görünümü: eski davranış korunur -------------------------
    def _is_anchored(self, s: _Semantic) -> bool:
        return s.derived_from is not None and self._var_mi(s.derived_from, None)

    # --- dilim: geçmiş koordinattaki inanç durumu ----------------------
    def dilim(self, w: float) -> list[Retrieved]:
        if w < self.ufuk_ts:
            raise ValueError(
                f"w={w} ufkun ({self.ufuk_ts}) gerisinde; o aralık budandı, "
                f"cevap uydurulamaz")
        out: list[Retrieved] = []
        for eid, txt in self._episodes.items():
            if self._var_mi(eid, w):
                out.append(Retrieved(txt, "episodic", eid, True, eid))
        for sid, s in self._semantic.items():
            if not self._var_mi(sid, w):
                continue
            capa = (s.derived_from is not None
                    and self._var_mi(s.derived_from, w))   # O ANDAKİ durum
            out.append(Retrieved(s.text, "semantic", sid, capa, s.derived_from))
        return out
