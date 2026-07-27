"""
sayilir — Geçerli iş kanıtı filtresi.

Tiyatro dedektörüne takılabilir parça. Bir [TEST] mesajının
pencereye katkı yapması için iki koşul:

  1. kimden != "sistem"  → dedektör kendi uyarısını saymaz
  2. yanit_id, aynı penceredeki bir GOREV'e işaret eder
     → boşta koşulan test suite (Goodhart) sayılmaz

# ASSUMPTION(gorev-bagli): [TEST] yalnız penceredeki bir GOREV'e
#   yanit_id ile bağlıysa iş kanıtı sayılır. Bağsız [TEST] reddedilir.
# ASSUMPTION(sistem-bağışık): kimden="sistem" mesajları dedektörün
#   kendi uyarılarıdır; kendini saymamalı.
"""
from __future__ import annotations

from kanal import Mesaj


def sayilir(m: Mesaj, pencere_gorev_midler: set[str]) -> bool:
    """Bu [TEST] mesajı geçerli iş kanıtı mı?

    m                    — değerlendirilen mesaj
    pencere_gorev_midler — penceredeki tüm GOREV mesajlarının mid kümesi
    """
    if m.kanit != "[TEST]":
        return False
    if m.kimden == "sistem":
        # ASSUMPTION(sistem-bağışık)
        return False
    if not m.yanit_id or m.yanit_id not in pencere_gorev_midler:
        # ASSUMPTION(gorev-bagli)
        return False
    return True
