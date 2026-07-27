"""
vault_ts — Retrieved.ts eksik alan: ts: float.

TAM BLOK (geri alınamaz şema kararı):
  A) write_episode sırasında kaydedilir → episod zaman damgası, çağrı anı değil.
  B) retrieve() sırasında dışarıdan → YANLIŞ; B caller'ın zamanını verir, biz
     episodun ne zaman yazıldığını istiyoruz.
  → A seçildi.

  DEĞİŞMEZ (vault.py'dan miras): anchored SAKLANMAZ.
  retrieve_sorted() zaman sıralaması için ts kullanır.

ARAYÜZ:
  RetrievedTS(text, layer, source_id, anchored, anchor_id, ts)
  VaultTS.write_episode(id, text, ts) -> None   raises: boş id / var olan id
  VaultTS.retrieve_sorted(query, k)   -> list[RetrievedTS]  en taze önce
      raises: k < 1

# ASSUMPTION(ts-stored): ts write_episode sırasında kaydedilir, retrieve
# anında hesaplanmaz. Bu vault.py'nin anchored kararından farklı: ts
# bayatlamaz çünkü değeri değişmez — sabit geçmiş zaman damgasıdır.
"""
from __future__ import annotations

import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# Temel modülü bul — tayf+1/ → 'promplar ve görevler/' altında değil, TAYF/ altında
_BASE = Path(__file__).parent.parent / "promplar ve görevler"
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from vault import Vault, _Semantic  # noqa: E402


@dataclass(frozen=True)
class RetrievedTS:
    text: str
    layer: str
    source_id: str
    anchored: bool         # okuma anında hesaplandı, saklanmadı
    anchor_id: str | None
    ts: float              # write_episode zamanı (Unix timestamp)

    # ASSUMPTION(ts-stored): buradaki ts write anına aittir, retrieve anına değil.


@dataclass
class _EpisodeEntry:
    text: str
    ts: float


@dataclass
class VaultTS:
    """Vault + ts-aware episodic layer."""
    _episodes: dict[str, _EpisodeEntry] = field(default_factory=dict)
    _semantic: dict[str, _Semantic] = field(default_factory=dict)
    _personal: dict[str, str] = field(default_factory=dict)

    def write_episode(self, episode_id: str, text: str,
                      ts: float | None = None) -> None:
        if not episode_id:
            raise ValueError("episode_id boş olamaz")
        if episode_id in self._episodes:
            raise ValueError(f"episode_id zaten var: {episode_id}")
        self._episodes[episode_id] = _EpisodeEntry(text, ts if ts is not None else time.time())

    def write_semantic(self, item_id: str, text: str,
                       derived_from: str | None = None) -> None:
        if not item_id:
            raise ValueError("item_id boş olamaz")
        self._semantic[item_id] = _Semantic(text, derived_from)

    def compact_episode(self, episode_id: str) -> bool:
        existed = self._episodes.pop(episode_id, None) is not None
        if existed:
            import logging
            orphan = sum(1 for s in self._semantic.values()
                         if s.derived_from == episode_id)
            if orphan:
                logging.getLogger("orion.vault_ts").warning(
                    "episod %s sıkıştırıldı; %d semantik öğe çapasız kaldı",
                    episode_id, orphan)
        return existed

    def _is_anchored(self, s: _Semantic) -> bool:
        return s.derived_from is not None and s.derived_from in self._episodes

    def retrieve_sorted(self, query: str, k: int = 5) -> list[RetrievedTS]:
        """En taze episod önce; semantik ts=0.0 (yazılma zamanı bilinmiyor)."""
        if k < 1:
            raise ValueError("k >= 1 olmalı")
        terms = {t for t in query.lower().split() if len(t) > 2}

        def score(text: str) -> int:
            low = text.lower()
            return sum(1 for t in terms if t in low)

        out: list[RetrievedTS] = []
        if not terms:
            # Boş sorgu → score filtresi bypass; tüm kayıtlar döner
            for sid, entry in self._episodes.items():
                out.append(RetrievedTS(entry.text, "episodic", sid, True, sid, entry.ts))
            for sid, s in self._semantic.items():
                out.append(RetrievedTS(s.text, "semantic", sid,
                                       self._is_anchored(s), s.derived_from, 0.0))
            for sid, txt in self._personal.items():
                out.append(RetrievedTS(txt, "personalized", sid, True, None, 0.0))
        else:
            for sid, entry in self._episodes.items():
                if score(entry.text):
                    out.append(RetrievedTS(entry.text, "episodic", sid, True, sid, entry.ts))
            for sid, s in self._semantic.items():
                if score(s.text):
                    out.append(RetrievedTS(s.text, "semantic", sid,
                                           self._is_anchored(s), s.derived_from, 0.0))
            for sid, txt in self._personal.items():
                if score(txt):
                    out.append(RetrievedTS(txt, "personalized", sid, True, None, 0.0))

        # ASSUMPTION(read-time-anchor): anchored hiçbir depoda saklanmıyor.
        assert not any(hasattr(v, "anchored") for v in self._semantic.values()), \
            "anchored saklanmış — bayatlayıp yalan söyler"

        # ts'ye göre azalan sırala (taze önce), eşit ts'de skora göre
        out.sort(key=lambda r: (r.ts, score(r.text)), reverse=True)
        return out[:k]
