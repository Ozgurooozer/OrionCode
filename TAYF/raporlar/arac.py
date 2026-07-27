"""
arac — küçük model (270M) için araç kataloğu, şema ve doğrulama.

TEMEL KISIT: 270M model KALIP EŞLER, YARGILAMAZ. Bir aracı çağırabilir ama
çağırmanın iyi fikir olup olduğuna karar veremez. Dolayısıyla:

  1. Küçük ajanın kataloğuna GERİ ALINAMAZ araç GİREMEZ. Kural değil,
     imkânsızlık: kayıt reddedilir. (kortex.py kapısının donanım hali.)
  2. Argümanlar şemaya VE ön koşula karşı doğrulanır. Küçük model argüman
     halüsine eder; tip kontrolü yetmez, varlık kontrolü de gerekir.
  3. KANIT ETİKETİNİ MODEL YAZMAZ, HARNESS ATAR. Model "yaptım" der, araç
     patlamıştır. Etiket aracın çıkışından gelir.

# ASSUMPTION(sema-yetmez): tip doğrulaması semantik doğruluk vermez.
# "dosya var mı", "workflow tanımlı mı" gibi ön koşullar ayrıca çalışır.

ARAYÜZ:
  Arac(ad, aciklama, sema, zorunlu, sinif, calistir, onkosul=None)
  Katalog(yalnizca_geri_alinabilir=True)
    .kayit(arac)              ; geri alınamaz araç -> PermissionError
    .sema_metni() -> str      ; modele verilecek araç listesi
    .dogrula(ad, args) -> (bool, sebep)
    .cagir(ad, args) -> Sonuc ; doğrula + çalıştır + MEKANİK kanıt
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

# butce.MALIYET ile aynı sınıflar. Küçük ajana açık olanlar:
GERI_ALINABILIR = {"bak", "dusun", "geri_alinabilir"}


@dataclass(frozen=True)
class Arac:
    ad: str
    aciklama: str
    sema: dict[str, type]
    zorunlu: tuple[str, ...]
    sinif: str
    calistir: Callable[..., Any]
    onkosul: Callable[[dict], tuple[bool, str]] | None = None


@dataclass
class Sonuc:
    arac: str | None
    args: dict
    calisti: bool
    cikti: str
    kanit: str          # HARNESS atar, model değil
    sebep: str = ""


class Katalog:
    def __init__(self, yalnizca_geri_alinabilir: bool = True) -> None:
        self.kisitli = yalnizca_geri_alinabilir
        self._araclar: dict[str, Arac] = {}

    def kayit(self, a: Arac) -> None:
        if self.kisitli and a.sinif not in GERI_ALINABILIR:
            raise PermissionError(
                f"'{a.ad}' sınıfı '{a.sinif}' — küçük ajan kataloğuna giremez. "
                f"Geri alınamaz iş büyük modele yükseltilir.")
        self._araclar[a.ad] = a

    def sema_metni(self) -> str:
        satir = []
        for a in self._araclar.values():
            alanlar = ", ".join(
                f"{k}:{v.__name__}" + ("" if k in a.zorunlu else "?")
                for k, v in a.sema.items())
            satir.append(f"- {a.ad}({alanlar}) — {a.aciklama}")
        return "\n".join(satir)

    # --- doğrulama -----------------------------------------------------
    def dogrula(self, ad: str, args: dict) -> tuple[bool, str]:
        a = self._araclar.get(ad)
        if a is None:
            return False, f"tanımsız araç: {ad}"
        eksik = [k for k in a.zorunlu if k not in args]
        if eksik:
            return False, f"eksik zorunlu argüman: {eksik}"
        fazla = [k for k in args if k not in a.sema]
        if fazla:
            return False, f"şemada olmayan argüman: {fazla}"
        for k, v in args.items():
            beklenen = a.sema[k]
            if beklenen is float and isinstance(v, int) and not isinstance(v, bool):
                continue                      # int -> float kabul
            if not isinstance(v, beklenen) or isinstance(v, bool) != (beklenen is bool):
                return False, (f"'{k}' tipi {type(v).__name__}, "
                               f"beklenen {beklenen.__name__}")
        if a.onkosul is not None:
            ok, sebep = a.onkosul(args)
            if not ok:
                return False, f"ön koşul: {sebep}"
        return True, ""

    # --- çağrı: kanıt MEKANİK atanır -----------------------------------
    def cagir(self, ad: str, args: dict) -> Sonuc:
        ok, sebep = self.dogrula(ad, args)
        if not ok:
            return Sonuc(ad, args, False, "", "[ÖLÇÜLMEDİ]", sebep)
        try:
            cikti = self._araclar[ad].calistir(**args)
        except Exception as e:                # araç patladı -> kanıt YOK
            return Sonuc(ad, args, False, "", "[ÖLÇÜLMEDİ]",
                         f"{type(e).__name__}: {e}")
        # BURASI KRİTİK: araç gerçekten koştu ve döndü -> [TEST].
        # Modelin ne dediğinin hiçbir etkisi yok.
        return Sonuc(ad, args, True, str(cikti), "[TEST]")
