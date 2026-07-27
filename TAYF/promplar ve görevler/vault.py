"""
vault — Orion 4 katmanlı bellek: working / episodic / semantic / personalized.

TASARIM KARARI (iki aday, biri elendi):
  A) Yazma anında `anchored: bool` damgası.
  B) `episode_id` referansı, OKUMA anında episodik depoda çözülür.
  -> A elendi: episod sonradan sıkıştırılır/silinirse damga YALAN söyler; öğe
     "kaynaklı" görünür ama kaynağı yoktur. Bu tam olarak hedeflenen arızanın
     kendisi (tanıdıklık var, kaynak yok). B seçildi: çapa okuma anında çözülür,
     bayatlayamaz. Maliyet: sözlük araması, O(1).

ARAYÜZ:
  Vault.write_episode(episode_id, text, ts) -> None
      raises ValueError: boş id / var olan id
  Vault.write_semantic(item_id, text, derived_from) -> None
      derived_from: episode_id | None (None = doğrudan öğretilmiş, çapa yok)
      raises ValueError: boş id
      NOT: derived_from var olmayan bir episodu gösterebilir; bu HATA DEĞİL,
      çünkü episod sonradan silinebilir. Çapasızlık okuma anında ortaya çıkar.
  Vault.compact_episode(episode_id) -> bool
      Episodu siler (sıkıştırma simülasyonu). Türetilmiş semantik öğeler kalır
      ama artık ÇAPASIZ olur.
  Vault.retrieve(query, k) -> list[Retrieved]
      Her sonuç provenance taşır. anchored, okuma anında hesaplanır.
      raises ValueError: k < 1
  format_for_agent(items) -> str
      Çapasız öğeleri KARAR GEREKÇESİ olarak değil, ipucu olarak sunar.

# ASSUMPTION(read-time-anchor): anchored ALANI HİÇBİR YERDE SAKLANMAZ. Saklanırsa
# bayatlar ve yalan söyler. Aşağıdaki assert bunu korur.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

log = logging.getLogger("orion.vault")

LAYERS = ("working", "episodic", "semantic", "personalized")


@dataclass(frozen=True)
class Retrieved:
    text: str
    layer: str
    source_id: str
    anchored: bool          # okuma anında hesaplandı, saklanmadı
    anchor_id: str | None   # hangi episoda dayanıyor (varsa)


@dataclass
class _Semantic:
    text: str
    derived_from: str | None


@dataclass
class Vault:
    _episodes: dict[str, str] = field(default_factory=dict)
    _semantic: dict[str, _Semantic] = field(default_factory=dict)
    _personal: dict[str, str] = field(default_factory=dict)

    # --- yazma ---------------------------------------------------------
    def write_episode(self, episode_id: str, text: str) -> None:
        if not episode_id:
            raise ValueError("episode_id boş olamaz")
        if episode_id in self._episodes:
            raise ValueError(f"episode_id zaten var: {episode_id}")
        self._episodes[episode_id] = text

    def write_semantic(self, item_id: str, text: str,
                       derived_from: str | None = None) -> None:
        if not item_id:
            raise ValueError("item_id boş olamaz")
        self._semantic[item_id] = _Semantic(text, derived_from)

    def write_personal(self, item_id: str, text: str) -> None:
        if not item_id:
            raise ValueError("item_id boş olamaz")
        self._personal[item_id] = text

    def compact_episode(self, episode_id: str) -> bool:
        """Sıkıştırma: episod gider, türevleri kalır ama çapasızlaşır."""
        existed = self._episodes.pop(episode_id, None) is not None
        if existed:
            orphan = sum(1 for s in self._semantic.values()
                         if s.derived_from == episode_id)
            if orphan:
                # GÖZLEMLENEBİLİRLİK: sessiz çapasızlaşma en tehlikeli hal.
                log.warning("episod %s sıkıştırıldı; %d semantik öğe çapasız kaldı",
                            episode_id, orphan)
        return existed

    # --- okuma ---------------------------------------------------------
    def _is_anchored(self, s: _Semantic) -> bool:
        return s.derived_from is not None and s.derived_from in self._episodes

    def retrieve(self, query: str, k: int = 5) -> list[Retrieved]:
        if k < 1:
            raise ValueError("k >= 1 olmalı")
        terms = {t for t in query.lower().split() if len(t) > 2}

        def score(text: str) -> int:
            low = text.lower()
            return sum(1 for t in terms if t in low)

        out: list[Retrieved] = []
        for sid, txt in self._episodes.items():
            if score(txt):
                out.append(Retrieved(txt, "episodic", sid, True, sid))
        for sid, s in self._semantic.items():
            if score(s.text):
                out.append(Retrieved(s.text, "semantic", sid,
                                     self._is_anchored(s), s.derived_from))
        for sid, txt in self._personal.items():
            if score(txt):
                out.append(Retrieved(txt, "personalized", sid, True, None))

        # ASSUMPTION(read-time-anchor): anchored hiçbir depoda saklanmıyor.
        assert not any(hasattr(v, "anchored") for v in self._semantic.values()), \
            "anchored saklanmış — bayatlayıp yalan söyler"

        out.sort(key=lambda r: score(r.text), reverse=True)
        return out[:k]


def format_for_agent(items: list[Retrieved]) -> str:
    """
    Çapasız içerik karar gerekçesi olarak sunulmaz. Bu, biçimlendirme
    tercihi değil, davranış kısıtı: ajan iki sınıfı ayırt edebilmeli.
    """
    kaynakli, tanidik = [], []
    for r in items:
        if r.anchored:
            kaynakli.append(f"- [{r.source_id} / {r.layer}] {r.text}")
        else:
            tanidik.append(f"- [{r.source_id} / kaynak DOĞRULANAMADI] {r.text}")
    parts = []
    if kaynakli:
        parts.append("KAYNAKLI (karar gerekçesi olarak kullanılabilir):\n"
                     + "\n".join(kaynakli))
    if tanidik:
        parts.append("TANIDIK ama KAYNAKSIZ (karar gerekçesi DEĞİL, yalnız "
                     "arama ipucu):\n" + "\n".join(tanidik))
    return "\n\n".join(parts) if parts else "(bağlam yok)"
