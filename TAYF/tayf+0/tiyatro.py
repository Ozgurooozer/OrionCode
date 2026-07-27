"""
tiyatro — Oturum kalite dedektörü.

Son `pencere` mesajda geçerli iş kanıtı yoksa oturum tiyatrodur.
"Geçerli [TEST]" kriteri sayilir.sayilir() ile tanımlanır:
  - kimden != "sistem"  (öz-bağışıklık)
  - yanit_id penceredeki bir GOREV'e bağlı  (Goodhart kilidi)

# ASSUMPTION(last-N-window): [TEST] yokluğu son pencere=20 mesajda ölçülür. [SEZGİ]
# ASSUMPTION(min-mesaj): mesaj sayısı < min_mesaj ise yetersiz veri → tiyatro=False.
# ASSUMPTION(sistem-bağışık): dedektörün HATA uyarıları kimden="sistem" taşır;
#   sayilir() bunları dışlar — sistem kendi uyarısını saymaz.
"""
from __future__ import annotations

from dataclasses import dataclass

from kanal import Kanal, Mesaj
from sayilir import sayilir as _sayilir


@dataclass
class TiyatroSonucu:
    tiyatro: bool
    test_sayisi: int          # penceredeki geçerli iş kanıtı sayısı
    pencere_boyutu: int       # bakılan mesaj sayısı
    son_test_seq: int | None  # en son geçerli [TEST]'in seq'i


class TiyatroAlgilayici:
    def __init__(self, kanal: Kanal, pencere: int = 20, min_mesaj: int = 5) -> None:
        self._kanal = kanal
        self._pencere = pencere
        self._min_mesaj = min_mesaj

    def kontrol(self) -> TiyatroSonucu:
        mesajlar, _ = self._kanal.oku(0)
        son = mesajlar[-self._pencere:]

        if len(mesajlar) < self._min_mesaj:
            return TiyatroSonucu(
                tiyatro=False, test_sayisi=0,
                pencere_boyutu=len(mesajlar), son_test_seq=None,
            )

        # Penceredeki GOREV mid'leri — sayilir() için referans kümesi
        pencere_gorevler = {m.mid for m in son if m.tur == "GOREV"}

        gecerli = [m for m in son if _sayilir(m, pencere_gorevler)]
        son_seq = gecerli[-1].seq if gecerli else None

        return TiyatroSonucu(
            tiyatro=len(gecerli) == 0,
            test_sayisi=len(gecerli),
            pencere_boyutu=len(son),
            son_test_seq=son_seq,
        )
