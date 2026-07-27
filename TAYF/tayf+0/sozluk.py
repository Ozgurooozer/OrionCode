"""
sozluk — Sıkıştırılmış dil sözlüğü (tayf++). Okuma-zamanı çapa.

ARAYÜZ:
  Sozluk(yol)
    .kayit(sembol, tanim, dayanak_ids) -> None  # sembol ekle (≥3 kullanım kanıtı gerek)
    .coz(sembol) -> str                          # raises CapasizSembol
    .sikistir(metin) -> str                      # §sembol ile yer değiştir
    .ac(metin) -> str                            # §sembol → tanim
    .rapor() -> dict                             # diagnostik

NEDEN DOSYA:
  İki ajan aynı sözlüğü paylaşır. Restart'ta kayıp = tanımı çözülemeyen sembol
  = CapasizSembol = kriptomneziyi engeller.

# ASSUMPTION(read-time-resolve): Sembol tanımı YAZILMAZ, OKUNUR.
#   Sözlük dosyası yalnızca {sembol: {tanim, dayanak_ids, kullanim_sayisi}} tutar.
#   'anchored' / 'valid' gibi türetilmiş özellikler asla saklanmaz.
# ASSUMPTION(min3): Bir sembolün sözlüğe girebilmesi için dayanak_ids ≥ 3 uzunluğunda.
# ASSUMPTION(symbol-prefix): Sözlük sembolleri §X formatındadır.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from _lock import dosya_kilidi

_SEMBOL_RE = re.compile(r"§(\w+)")
_MIN_DAYANAK = 3


class CapasizSembol(Exception):
    """Tanımı çözülemeyen sembol; sessizce tahminde bulunulamaz."""


class Sozluk:
    def __init__(self, yol: str | Path) -> None:
        self.yol = Path(yol)
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        if not self.yol.exists():
            self.yol.write_text("{}", encoding="utf-8")
        self._capasiz_deneme = 0
        self._kullanim: dict[str, int] = {}

    # --- dosya işlemleri -------------------------------------------------
    def _oku(self) -> dict:
        try:
            return json.loads(self.yol.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def _yaz(self, d: dict) -> None:
        with dosya_kilidi(self.yol):
            self.yol.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")

    # --- API --------------------------------------------------------------
    def kayit(self, sembol: str, tanim: str, dayanak_ids: list[str]) -> None:
        """
        Sözlüğe sembol ekle.
        dayanak_ids: kanalda geçen mesaj id'leri — sembolün ≥3 kullanım kanıtı.
        """
        if not sembol.startswith("§"):
            sembol = "§" + sembol
        if len(dayanak_ids) < _MIN_DAYANAK:
            raise ValueError(
                f"Sembol kanıtsız girer: {sembol} için {len(dayanak_ids)} dayanak "
                f"var, {_MIN_DAYANAK} gerekli."
            )
        d = self._oku()
        d[sembol] = {
            "tanim": tanim,
            "dayanak_ids": dayanak_ids,
            "kullanim_sayisi": 0,
        }
        self._yaz(d)

    def coz(self, sembol: str) -> str:
        """
        Sembolü okuma zamanında çöz. Bilinmiyorsa CapasizSembol fırlatır —
        sessiz tahmin yasak.
        """
        if not sembol.startswith("§"):
            sembol = "§" + sembol
        d = self._oku()
        if sembol not in d:
            self._capasiz_deneme += 1
            raise CapasizSembol(
                f"'{sembol}' sözlükte yok. Açık yazıma dön."
            )
        # kullanım sayısını artır
        self._kullanim[sembol] = self._kullanim.get(sembol, 0) + 1
        return d[sembol]["tanim"]

    def sikistir(self, metin: str) -> str:
        """
        Metinde tanımlı §sembolleri ara — §sembol varsa döndür.
        Bu metot kanalda GÖNDERİLEN metni sıkıştırır: uzun ifadeyi §kısa'ya çevirir.
        """
        d = self._oku()
        # tüm tanımları uzunluğa göre sırala (uzunu önce değiştir)
        ciftler = sorted(d.items(), key=lambda kv: len(kv[1]["tanim"]), reverse=True)
        for sembol, bilgi in ciftler:
            metin = metin.replace(bilgi["tanim"], sembol)
        return metin

    def ac(self, metin: str) -> str:
        """§semboller → tanımlar. CapasizSembol varsa fırlatır."""
        def _replace(m: re.Match) -> str:
            return self.coz("§" + m.group(1))
        return _SEMBOL_RE.sub(_replace, metin)

    def rapor(self) -> dict:
        d = self._oku()
        hic_kullanilmayan = [s for s in d if self._kullanim.get(s, 0) == 0]
        return {
            "toplam_sembol": len(d),
            "capasiz_deneme": self._capasiz_deneme,
            "hic_kullanilmayan": hic_kullanilmayan,
            "kullanim": dict(self._kullanim),
        }
