"""
sahnekopru — sahne.py Olay → VRM talimatı köprüsü.

ARAYÜZ:
  VRMTalimati(tur, deger, yogunluk)
    tur:      "blend" | "animasyon" | "poz"
    deger:    VRM morph-target adı | animasyon klip adı
    yogunluk: 0.0-1.0

  SahneKopru:
    .isle(olay)  -> VRMTalimati | None   bilinmeyen → None, log UYARI
    .metrigi()   -> dict[str, int]       {"blend": N, "animasyon": N, "poz": N, "bilinmeyen": N}

TASARIM (iki aday):
  A) Olay.tur == "bilinmeyen" → exception fırlat
  B) Olay.tur == "bilinmeyen" → None döndür, metriğe say
  → B seçildi: bilinmeyen işaretçi üretimi qwen2.5:7b'de %30 çıktı (GOREV 1c).
    Exception fırlatmak animasyon akışını keser. Metriğe saymak bozulmayı
    gözlemlenebilir kılar; kesmekten iyidir.

VRM 0.x morph-target preset isimleri: joy, angry, surprised, sorrow, neutral
Bu isimler GLB içinde gömülü; JEST_BLEND bunları sahne.py sözcüğüne bağlar.

# ASSUMPTION(vrm-0x): Hedef VRM modeli 0.x formatındadır; morph-target isimleri
# joy/angry/surprised/sorrow/neutral. VRM 1.0 kullanılırsa map güncellenmeli
# (1.0: happy/aa/ih/ou/ee — FARKLI). Bu, SPIKE_3b_rapor.md'de VRM 0.x kararına
# çapalanmıştır [TEST].
"""
from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path

_BASE = Path(__file__).parent.parent / "promplar ve görevler"
if str(_BASE) not in sys.path:
    sys.path.insert(0, str(_BASE))

from sahne import Olay  # noqa: E402

log = logging.getLogger("orion.sahnekopru")

# Jest → VRM 0.x blend (yüz ifadesi)
JEST_BLEND: dict[str, str] = {
    "gülümsüyor":  "joy",
    "kaş_çatıyor": "angry",
    "el_açıyor":   "surprised",
    "omuz_silkiyor": "sorrow",
    "bekliyor":    "neutral",
}

# Jest → animasyon klip (blend değil, hareket)
JEST_ANIMASYON: dict[str, str] = {
    "el_salliyor":     "wave",
    "başını_sallıyor": "nod",
    "işaret_ediyor":   "point",
}

# Poz → animasyon klip
POZ_ANIMASYON: dict[str, str] = {
    "duruyor":   "idle",
    "oturuyor":  "sitting",
    "yatıyor":   "lying",
    "eğiliyor":  "leaning",
    "yürüyor":   "walk",
    "koşuyor":   "run",
    "bakıyor":   "look_around",
}

# Yogunluklar: jest blend ağırlığı sabit (MVP; TTS entegrasyonu sonrası dinamik)
_BLEND_WEIGHT = 0.85
_ANIM_WEIGHT  = 1.0


@dataclass(frozen=True)
class VRMTalimati:
    tur: str        # "blend" | "animasyon" | "poz"
    deger: str
    yogunluk: float


@dataclass
class SahneKopru:
    _sayac: dict[str, int] = field(
        default_factory=lambda: {"blend": 0, "animasyon": 0, "poz": 0, "bilinmeyen": 0}
    )

    def isle(self, olay: Olay) -> VRMTalimati | None:
        """
        Olay → VRMTalimati dönüşümü.
        Bilinmeyen poz/jest → None (akışı kesmez, metriye sayar).
        """
        if olay.tur == "poz":
            klip = POZ_ANIMASYON.get(olay.deger)
            if klip is None:
                log.warning("bilinmeyen poz: %r", olay.deger)
                self._sayac["bilinmeyen"] += 1
                return None
            self._sayac["poz"] += 1
            return VRMTalimati("poz", klip, _ANIM_WEIGHT)

        if olay.tur == "jest":
            if olay.deger in JEST_BLEND:
                self._sayac["blend"] += 1
                return VRMTalimati("blend", JEST_BLEND[olay.deger], _BLEND_WEIGHT)
            if olay.deger in JEST_ANIMASYON:
                self._sayac["animasyon"] += 1
                return VRMTalimati("animasyon", JEST_ANIMASYON[olay.deger], _ANIM_WEIGHT)
            log.warning("bilinmeyen jest: %r", olay.deger)
            self._sayac["bilinmeyen"] += 1
            return None

        # tur == "bilinmeyen" — sahne.py zaten uyarmış, biz sayıyoruz
        self._sayac["bilinmeyen"] += 1
        return None

    def metrigi(self) -> dict[str, int]:
        return dict(self._sayac)
