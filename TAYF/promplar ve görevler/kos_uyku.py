# -*- coding: utf-8 -*-
"""
kos_uyku.py -- konsolidasyon + REM olcumu.

Calistirma: python kos_uyku.py

Bakilacak: verim() metrigine DEGIL (henuz payda yok).
Ham karantina onerilerini ELLE OKU. Besini oku.

Hangi sonuc plani degistirir:
  - Oneriler tumüyle ise yaramaz: REM'i kapat, sadece NREM kalsin.
  - Bazilari degerli: onayla/reddet akisini GOREV 2'de gercek vault'a bagla.
"""
from __future__ import annotations

import sys
import io

# Windows konsolda UTF-8 zorla
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from vault import Vault
from surucu import varsayilan
from uyku import UykuMotoru


def demo_vault() -> Vault:
    v = Vault()
    v.write_episode("ep01", "12 Mart: vault dort katmanli olarak kararlastirildi. "
                    "Provenance capasi okuma aninda hesaplanacak.")
    v.write_episode("ep02", "14 Mart: sahne modulu tasarlandi. "
                    "Isaretci gorunen metne sizmaz kurali kondu.")
    v.write_episode("ep03", "16 Mart: uyku modulu REM karantina guvencesiyle eklendi. "
                    "Yuksek sicaklik ciktisi onaysiz vault'a giremez.")
    v.write_episode("ep04", "18 Mart: kos_butce sonucu H0: uzun prompt fark yaratmiyor. "
                    "META kural 1 [SEZGI] etiketine dustu.")
    v.write_semantic("s01", "vault capasi okuma aninda hesaplanir", derived_from="ep01")
    v.write_semantic("s02", "isaretciler Ayristirici tarafindan metinden sokülür",
                     derived_from="ep02")
    return v


def kos() -> dict:
    surucu = varsayilan()
    v = demo_vault()
    motor = UykuMotoru(vault=v, surucu=surucu)

    print("--- NREM (ozet -> semantic) ---")
    nrem_ozetler = []
    for ep_id in list(v._episodes.keys()):
        print(f"  nrem({ep_id!r})... ", end="", flush=True)
        ozet = motor.nrem(ep_id)
        nrem_ozetler.append({"ep_id": ep_id, "ozet": ozet})
        print(f"ok ({len(ozet)} krkt)")

    print(f"\n  NREM sonrasi semantic oge sayisi: {len(v._semantic)}")

    print("\n--- REM (yuksek sicaklik baglanti onerileri) ---")
    rem_oneriler = []
    for _ in range(3):
        print("  rem()... ", end="", flush=True)
        oneriler = motor.rem(k=4)
        rem_oneriler.extend(oneriler)
        print(f"ok -> karantina boyutu: {len(motor.karantina)}")

    return {
        "nrem_ozet_sayisi": len(nrem_ozetler),
        "nrem_ozetler": nrem_ozetler,
        "karantina_boyutu": len(motor.karantina),
        "karantina": motor.karantina,
    }


if __name__ == "__main__":
    sonuc = kos()

    print("\n=== NREM OZETLERI ===")
    for item in sonuc["nrem_ozetler"]:
        print(f"\n  [{item['ep_id']}] {item['ozet']}")

    print("\n=== REM KARANTINA ONERILERI (ELLE OKU) ===")
    for i, o in enumerate(sonuc["karantina"]):
        print(f"\n  [{i}] {o}")

    print("\n--- OZET ---")
    print(f"NREM ozet sayisi: {sonuc['nrem_ozet_sayisi']} episod")
    print(f"REM karantina  : {sonuc['karantina_boyutu']} oneri (vault'a girmedi)")
    print("\nSonraki: onerileri elle oku. Ise yararsa GOREV 2'de onayla/reddet bagla.")
    print("Ise yaramazsa: REM kapatilir, yalniz NREM konsolidasyonu kalir.")
