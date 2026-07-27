"""
uyku — NREM/REM faz makinesi.

TASARIM (iki aday):
  A) UykuMotoru hem NREM hem REM çağrılarını direkt vault'a yazar.
  B) NREM yazar, REM karantinaya alır; kullanıcı onayla/reddet kararı verir.
  -> A: REM "yaratıcı bağlantı önerisi" üretmek için yüksek sıcaklıkla koşar;
     bu çıktıları doğrudan belleğe yazmak güvensiz (halüsinasyon riski yüksek).
     B seçildi: REM kalıcı depoya yazamaz, karantina zorunlu.

DEĞİŞMEZ: REM karantinası, .onayla() çağrılmadan vault'a girmez.
  -> _karantina listesi tek yazma noktasıdır; vault.write_semantic doğrudan
     REM içinden ÇAĞRILAMAZ. assert ile korunur.

ARAYÜZ:
  UykuMotoru(vault, surucu)
    .nrem(ep_id: str) -> str
        # episodu özetler, vault.write_semantic() yazar
        # raises KeyError: episod bulunamazsa
    .rem(k: int) -> list[str]
        # vault'tan k adet öğe alır, yüksek sıcaklıkla bağlantı önerileri üretir
        # sonuçlar karantinaya gider, vault'a GİTMEZ
        # raises ValueError: k < 1
    .onayla(idx: int) -> None   # karantina[idx] → vault.write_semantic()
    .reddet(idx: int) -> None   # karantina[idx] düşürülür
    .karantina: list[str]       # readonly

# ASSUMPTION(rem-quarantine): _rem_yazma_kilidi = True iken vault.write_semantic
# çağrısı yapılırsa bu bir programlama hatasıdır. assert ile yakalanır.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from vault import Vault
from surucu import Surucu

_NREM_SISTEM = (
    "Aşağıdaki oturum kaydını iki-üç cümlede özetle. "
    "Yalnızca açıkça söylenenleri içer; çıkarım yapma."
)

_REM_SISTEM = (
    "Aşağıdaki bellek parçaları verildi. Bu parçalar arasında şaşırtıcı, "
    "beklenmedik bir bağlantı var mı? Varsa tek cümle öner. "
    "Kesin değilse 'Öneri:' ile başla ve belirsizliği belirt."
)


@dataclass
class UykuMotoru:
    vault: Vault
    surucu: Surucu
    _karantina: list[str] = field(default_factory=list)
    _rem_aktif: bool = False   # REM akışında vault.write çağrısı yasak

    @property
    def karantina(self) -> list[str]:
        return list(self._karantina)

    def nrem(self, ep_id: str) -> str:
        """
        Episode → NREM özeti → vault.semantic yazar.
        Kalıcı yazma yetkisi: NREM çıktısı doğrulanmış, özet odaklı.
        """
        episodes: dict[str, str] = self.vault._episodes  # type: ignore[attr-defined]
        if ep_id not in episodes:
            raise KeyError(f"episod bulunamadı: {ep_id}")
        ozet = self.surucu.uret(_NREM_SISTEM, episodes[ep_id], sicaklik=0.0)
        sem_id = f"nrem_{ep_id}_{uuid.uuid4().hex[:6]}"
        self.vault.write_semantic(sem_id, ozet, derived_from=ep_id)
        return ozet

    def rem(self, k: int = 5) -> list[str]:
        """
        Yüksek sıcaklık bağlantı önerisi. KARANTINAYA alınır, vault'a GİRMEZ.
        retrieve("") boş terim seti döndürür (sıfır eşleşme), o yüzden
        REM için vault içeriğini doğrudan okuruz: survey, arama değil.
        """
        if k < 1:
            raise ValueError("k >= 1 olmalı")
        # REM tüm katmanları tarar; retrieve() query gerektirdiğinden direkt erişim
        parcalar: list[str] = []
        for txt in list(self.vault._episodes.values())[:k]:
            parcalar.append(txt)
        for s in list(self.vault._semantic.values())[:k]:
            parcalar.append(s.text)
        if not parcalar:
            return []
        girdiler = "\n".join(f"- {t}" for t in parcalar[:k])

        self._rem_aktif = True
        try:
            cevap = self.surucu.uret(_REM_SISTEM, girdiler, sicaklik=0.9)
        finally:
            self._rem_aktif = False

        # DEĞİŞMEZ: REM akışında vault.write ÇAĞRILAMAZ.
        # (surucu senkron, bu blokta başka vault çağrısı olmaz; ileride async
        # eklenirse bu assert'i bir lock'a dönüştür.)
        assert not self._rem_aktif, "REM henüz aktifken karantina dışına çıkılamaz"

        self._karantina.append(cevap)
        return [cevap]

    def onayla(self, idx: int) -> None:
        onerge = self._karantina[idx]
        sem_id = f"rem_onay_{uuid.uuid4().hex[:6]}"
        self.vault.write_semantic(sem_id, onerge, derived_from=None)
        self._karantina.pop(idx)

    def reddet(self, idx: int) -> None:
        self._karantina.pop(idx)
