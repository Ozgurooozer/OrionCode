"""
kanal — Tayf mesajlaşma yolu. Append-only JSONL, çok yazarlı. (Tayf+0, çapraz-platform)

Üst kanal.py ile aynı API; fark: fcntl → _lock.dosya_kilidi (Windows+Unix).

# ASSUMPTION(atomic-append): Yazma _lock.dosya_kilidi ile serileştirilir.
# ASSUMPTION(monoton-seq): seq = mevcut satır sayısı; kilit içinde atanır.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

from _lock import dosya_kilidi

KANIT_GUCU = {
    "[ÖLÇÜLMEDİ]": 0,
    "[SEZGİ]": 1,
    "[TAHMİN]": 1,
    "[YAZILDI-KOŞULMADI]": 2,
    "[TEST]": 3,
}

TURLER = {
    "GOREV", "SORU", "CEVAP", "RAPOR", "HATA", "KARAR",
    "ITIRAZ", "BITTI", "ZAMAN_ASIMI",
}

# Görev/soru: iddia taşımaz → kanıt etiketi yasak, dayanak yasak
_KANIFSIZ = {"GOREV", "SORU", "BITTI", "ZAMAN_ASIMI"}
# İddia türleri: kanıt etiketi zorunlu
_KANIT_ZORUNLU = {"CEVAP", "RAPOR", "KARAR", "HATA", "ITIRAZ"}


class KanitTerfiHatasi(Exception):
    """Alıntılanan mesajın kanıt seviyesini yükseltme girişimi."""


@dataclass
class Mesaj:
    kimden: str
    kime: str
    tur: str
    govde: str
    kanit: str | None = None
    yanit_id: str | None = None
    dayanak: list[str] = field(default_factory=list)
    seq: int = -1
    ts: float = 0.0

    @property
    def mid(self) -> str:
        return f"m{self.seq:04d}"

    def dogrula(self) -> None:
        if self.tur not in TURLER:
            raise ValueError(f"bilinmeyen tür: {self.tur}")
        if not self.govde.strip():
            raise ValueError("boş gövde")
        if self.tur in _KANIFSIZ:
            if self.kanit is not None:
                raise ValueError(f"{self.tur} etiket taşıyamaz (kanit={self.kanit!r})")
            if self.dayanak:
                raise ValueError(f"{self.tur} dayanak gösteremez")
        elif self.tur in _KANIT_ZORUNLU:
            if self.kanit not in KANIT_GUCU:
                raise ValueError(f"{self.tur} için kanıt etiketi zorunlu; verildi: {self.kanit!r}")


class Kanal:
    def __init__(self, yol: str | Path) -> None:
        self.yol = Path(yol)
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        self.yol.touch(exist_ok=True)

    def yaz(self, m: Mesaj) -> Mesaj:
        m.dogrula()
        with dosya_kilidi(self.yol):
            mevcut = [json.loads(s) for s in self.yol.read_text(encoding="utf-8").splitlines() if s.strip()]
            self._terfi_kontrol(m, mevcut)
            m.seq = len(mevcut)
            m.ts = time.time()
            with open(self.yol, "a", encoding="utf-8") as f:
                f.write(json.dumps(asdict(m), ensure_ascii=False) + "\n")
        return m

    @staticmethod
    def _terfi_kontrol(m: Mesaj, mevcut: list[dict]) -> None:
        if not m.dayanak:
            return
        indeks = {f"m{d['seq']:04d}": d for d in mevcut}
        for d_id in m.dayanak:
            kaynak = indeks.get(d_id)
            if kaynak is None:
                raise ValueError(f"dayanak bulunamadı: {d_id}")
            kaynak_kanit = kaynak.get("kanit")
            if kaynak_kanit is None:
                raise ValueError(f"{d_id} kanıtsız mesaj, dayanak gösterilemez")
            if KANIT_GUCU[m.kanit] > KANIT_GUCU[kaynak_kanit]:
                raise KanitTerfiHatasi(
                    f"{d_id} kanıtı {kaynak_kanit}, {m.kanit} iddia edilemez."
                )

    def oku(self, imlec: int = 0) -> tuple[list[Mesaj], int]:
        satirlar = self.yol.read_text(encoding="utf-8").splitlines()
        yeni = [Mesaj(**json.loads(s)) for s in satirlar[imlec:] if s.strip()]
        return yeni, len(satirlar)

    def bekle(self, imlec: int, kime: str, saniye: float = 60.0,
              aralik: float = 0.4) -> tuple[list[Mesaj], int]:
        bitis = time.time() + saniye
        while time.time() < bitis:
            yeni, ni = self.oku(imlec)
            bana = [m for m in yeni if m.kime in (kime, "*")]
            if bana:
                return bana, ni
            imlec = ni
            time.sleep(aralik)
        return [], imlec
