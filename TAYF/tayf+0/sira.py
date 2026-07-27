"""
sira — Sıra jetonu. İki ajan arasında kilitlenme önleme.

ARAYÜZ:
  Sira(yol, kim, ttl=60.0)
    .jetonu_al() -> bool      # True=bende, False=karşıda+henüz taze
    .bitti()                  # jetonu serbest bırak (sahip=None)
    .dur_bekle(aralik=1.0) -> bool  # TTL dolunca al; True=başarı, False=zaman aşımı
    .zaman_asimi_yaz(kanal)   # kanala ZAMAN_ASIMI mesajı + jetonu al

NEDEN DOSYA, NEDEN KANAL DEĞİL:
  Kanal mesajları kanıt etiketi taşır ve terfi mekanizmasına tabidir.
  Sıra yönetimi bundan bağımsız bir kontrol düzlemi — ayrı dosya.

# ASSUMPTION(atomic-flock): Tüm yazma işlemleri fcntl.LOCK_EX ile serileşir.
# ASSUMPTION(none-means-free): sahip=null ise jeton serbesttir, kim isterse alır.
# ASSUMPTION(ttl-clock): Zaman karşılaştırması time.time() ile yapılır.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from _lock import dosya_kilidi

_BOSH: dict = {"sahip": None, "ts": 0.0, "ttl": 60.0}


class SiraHatasi(Exception):
    """Jeton durumu tutarsız."""


class Sira:
    def __init__(self, yol: str | Path, kim: str, ttl: float = 60.0) -> None:
        self.yol = Path(yol)
        self.kim = kim
        self.ttl = ttl
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        if not self.yol.exists():
            self._yaz(_BOSH | {"ttl": ttl})

    # --- okuma (kilitsiz) -------------------------------------------------
    def _oku(self) -> dict:
        try:
            return json.loads(self.yol.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, FileNotFoundError):
            return dict(_BOSH)

    # --- yazma (kilitli) --------------------------------------------------
    def _yaz(self, d: dict) -> None:
        with dosya_kilidi(self.yol):
            self.yol.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")

    # --- API --------------------------------------------------------------
    def jetonu_al(self) -> bool:
        """
        True  → jeton bende (ya vardı ya boştu ve aldım)
        False → karşıda ve henüz taze
        """
        d = self._oku()
        if d["sahip"] is None:
            self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl})
            return True
        if d["sahip"] == self.kim:
            return True
        # karşıda — TTL dolmuş mu?
        if time.time() - d["ts"] > d["ttl"]:
            self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl})
            return True  # devralındı
        return False

    def bitti(self) -> None:
        """Jetonu serbest bırak. Yalnız sahibi bırakabilir."""
        d = self._oku()
        if d["sahip"] not in (self.kim, None):
            raise SiraHatasi(f"Jetonu {d['sahip']} tutuyor, {self.kim} bırakamaz.")
        self._yaz({"sahip": None, "ts": time.time(), "ttl": self.ttl})

    def dur_bekle(self, aralik: float = 1.0, toplam: float | None = None) -> bool:
        """
        TTL dolana kadar bekle, sonra jetonu al.
        toplam=None → sonsuza kadar bekle.
        Dönüş: True=jeton alındı, False=toplam süre doldu ama jeton alınamadı.
        """
        bitis = None if toplam is None else time.time() + toplam
        while True:
            d = self._oku()
            # Boş veya bende
            if d["sahip"] in (None, self.kim):
                self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl})
                return True
            # Karşıda — TTL dolmuş mu?
            if time.time() - d["ts"] > d["ttl"]:
                self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl})
                return True
            # Toplam süre doldu mu?
            if bitis is not None and time.time() >= bitis:
                return False
            time.sleep(aralik)

    def zaman_asimi_yaz(self, kanal: object) -> None:  # kanal: Kanal
        """
        Kanala ZAMAN_ASIMI mesajı yaz, ardından jetonu al.
        Bağımlılık döngüsünden kaçınmak için kanal tipini string annotation ile tutar.
        """
        from kanal import Mesaj  # yerel import — döngüsel bağımlılığı önle
        kanal.yaz(
            Mesaj(
                kimden=self.kim,
                kime="*",
                tur="ZAMAN_ASIMI",
                govde=f"{self.kim} yanit beklerken zaman asimina ugradi; jeton alindi.",
                kanit="[SEZGİ]",
            )
        )
        self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl})

    def durum(self) -> dict:
        return self._oku()
