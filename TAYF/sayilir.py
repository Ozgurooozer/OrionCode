"""
sayilir — bir mesaj "iş kanıtı" sayılır mı? Tiyatro dedektörünün ölçütü.

İKİ SALDIRIYA KARŞI:
 1. KENDİ ÇIKTISINI SAYMA: dedektörün kanala yazdığı uyarı, bir sonraki
    pencerede kanıt gibi görünür ve dedektör hastalığı bildirerek "iyileştirir".
    -> kimden == SISTEM olan her şey dışlanır.
 2. UCUZ KANIT (Goodhart): ajan boşta `pytest` koşup [TEST] yazarak bayrağı
    temizler, hiçbir iş yapmadan.
    -> [TEST] ancak AYNI PENCEREDE verilmiş bir GOREV'e bağlıysa sayılır.

# ASSUMPTION(pencere-ici-baglanti): yanit_id penceredeki bir GOREV'i
# göstermeli. Pencere dışındaki göreve bağlanan eski rapor, taze iş kanıtı
# değildir — bu, bayat çapa problemiyle aynı şey.
"""
from __future__ import annotations

from kanal import Mesaj

SISTEM = "sistem"
IS_KANITI_TURLERI = {"RAPOR", "KARAR"}


def sayilir(m: Mesaj, pencere: list[Mesaj]) -> bool:
    if m.kimden == SISTEM:
        return False                       # dedektör kendini sayamaz
    if m.tur not in IS_KANITI_TURLERI or m.kanit != "[TEST]":
        return False
    gorevler = {g.mid for g in pencere
                if g.tur == "GOREV" and g.kimden != SISTEM}
    return m.yanit_id in gorevler          # pencere içi göreve bağlı mı


def is_kaniti(pencere: list[Mesaj]) -> list[Mesaj]:
    return [m for m in pencere if sayilir(m, pencere)]


def tiyatro_mu(pencere: list[Mesaj]) -> tuple[bool, str]:
    kanit = is_kaniti(pencere)
    if kanit:
        return False, f"{len(kanit)} iş kanıtı: {[m.mid for m in kanit]}"
    ucuz = [m for m in pencere
            if m.kanit == "[TEST]" and m.kimden != SISTEM and not sayilir(m, pencere)]
    if ucuz:
        return True, (f"{len(ucuz)} adet [TEST] var ama hiçbiri penceredeki bir "
                      f"GOREV'e bağlı değil — ucuz kanıt.")
    return True, "pencerede hiç iş kanıtı yok."
