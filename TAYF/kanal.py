"""
kanal — Tayf mesajlaşma yolu. Append-only JSONL, çok yazarlı.

NEDEN DOSYA, NEDEN SOCKET DEĞİL:
  Üçüncü terminal (izleyici) ve dördüncü (Orion) aynı akışı görmeli. Doğrudan
  bağlantıda gözlemci trafiği KOPYALAR; gördüğü şey iletişimin temsili olur,
  kendisi değil. Dosya tek gerçek kaynaktır, herkes aynı şeye bakar.

TEMEL İNVARYANT — KANIT TERFİ ETMEZ:
  Her mesaj bir kanıt etiketi taşır. B ajanı, A'nın [SEZGİ]'sini alıntılarken
  [TEST] yapamaz. Terfi girişimi reddedilir. Aksi halde iki ajan arasında
  doğrulanmamış iddia birikerek "herkesin bildiği gerçek"e dönüşür.

# ASSUMPTION(atomik-append): Yazma fcntl.flock ile serileştirilir. Kilitsiz
# O_APPEND kısa satırlarda genelde çalışır ama GARANTİ DEĞİL; iki ajan aynı
# anda yazınca satır bozulması tek-ajanlı testte HİÇ görünmez.

ARAYÜZ:
  Kanal(yol)
    .yaz(mesaj) -> Mesaj            ; seq atar, atomik ekler
    .oku(imlec) -> (list[Mesaj], yeni_imlec)
    .bekle(imlec, kime, saniye) -> (list[Mesaj], yeni_imlec)  ; zaman aşımlı
  Hata modları: ValueError (geçersiz etiket/tür), KanitTerfiHatasi
"""
from __future__ import annotations

import json
import os
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from pathlib import Path

# Çapraz-platform dosya kilidi (fcntl → Windows O_EXCL fallback)
_THREAD_MUTEX = threading.Lock()

try:
    import fcntl as _fcntl

    @contextmanager
    def _dosya_kilidi(yol: Path):
        with open(yol, "r+b") as f:
            _fcntl.flock(f, _fcntl.LOCK_EX)
            try:
                yield
            finally:
                _fcntl.flock(f, _fcntl.LOCK_UN)

except ImportError:
    @contextmanager
    def _dosya_kilidi(yol: Path):  # type: ignore[misc]
        kilit = str(yol) + ".lock"
        while True:
            try:
                with _THREAD_MUTEX:
                    fd = os.open(kilit, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                    os.close(fd)
                break
            except FileExistsError:
                time.sleep(0.01)
        try:
            yield
        finally:
            try:
                os.remove(kilit)
            except FileNotFoundError:
                pass

# Kanıt gücü sırası. Alıntılarken YUKARI çıkılamaz.
KANIT_GUCU = {"[ÖLÇÜLMEDİ]": 0, "[SEZGİ]": 1, "[TAHMİN]": 1,
              "[YAZILDI-KOŞULMADI]": 2, "[TEST]": 3}

TURLER = {"GOREV", "SORU", "CEVAP", "RAPOR", "HATA", "KARAR",
          "ITIRAZ", "BITTI", "ZAMAN_ASIMI"}

# Olgu İDDİA eden türler: kanıt etiketi anlamlıdır ve zorunludur.
# Diğerleri (GOREV/SORU/BITTI/ZAMAN_ASIMI) iddia etmez; etiket taşırlarsa
# alan seyrelir ve ajanlar özensiz etiketlemeye alışır -> en çok önemsediğimiz
# sinyal gürültüye döner.
IDDIA_TURLERI = {"CEVAP", "RAPOR", "HATA", "KARAR", "ITIRAZ"}


class KanitTerfiHatasi(Exception):
    """Alıntılanan mesajın kanıt seviyesini yükseltme girişimi."""


@dataclass
class Mesaj:
    kimden: str
    kime: str
    tur: str
    govde: str
    kanit: str = ""            # yalnız IDDIA_TURLERI için zorunlu
    yanit_id: str | None = None       # hangi mesaja cevap
    dayanak: list[str] = field(default_factory=list)  # alıntılanan mesaj id'leri
    seq: int = -1
    ts: float = 0.0

    @property
    def mid(self) -> str:
        return f"m{self.seq:04d}"

    def dogrula(self) -> None:
        if self.tur not in TURLER:
            raise ValueError(f"bilinmeyen tür: {self.tur}")
        if self.tur in IDDIA_TURLERI:
            if self.kanit not in KANIT_GUCU:
                raise ValueError(
                    f"{self.tur} olgu iddia eder; geçerli kanıt etiketi şart. "
                    f"Verilen: {self.kanit!r}")
        elif self.kanit:
            raise ValueError(
                f"{self.tur} olgu iddia etmez; kanıt etiketi taşımamalı "
                f"(etiket alanı seyrelir).")
        if not self.govde.strip():
            raise ValueError("boş gövde")


class Kanal:
    def __init__(self, yol: str | Path) -> None:
        self.yol = Path(yol)
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        self.yol.touch(exist_ok=True)

    # --- yazma ----------------------------------------------------------
    def yaz(self, m: Mesaj) -> Mesaj:
        m.dogrula()
        with _dosya_kilidi(self.yol):
            with open(self.yol, "r+", encoding="utf-8") as f:
                mevcut = [json.loads(s) for s in f if s.strip()]
                self._terfi_kontrol(m, mevcut)
                m.seq = len(mevcut)
                m.ts = time.time()
                f.seek(0, 2)
                f.write(json.dumps(asdict(m), ensure_ascii=False) + "\n")
                f.flush()
        return m

    @staticmethod
    def _terfi_kontrol(m: Mesaj, mevcut: list[dict]) -> None:
        """Dayanak gösterilen mesajdan daha güçlü kanıt iddia edilemez."""
        if not m.dayanak:
            return
        indeks = {f"m{d['seq']:04d}": d for d in mevcut}
        for d_id in m.dayanak:
            kaynak = indeks.get(d_id)
            if kaynak is None:
                raise ValueError(f"dayanak bulunamadı: {d_id}")
            if not kaynak["kanit"]:
                raise ValueError(
                    f"{d_id} olgu iddia etmiyor ({kaynak['tur']}); dayanak olamaz")
            if KANIT_GUCU[m.kanit] > KANIT_GUCU[kaynak["kanit"]]:
                raise KanitTerfiHatasi(
                    f"{d_id} kanıtı {kaynak['kanit']}, {m.kanit} iddia edilemez. "
                    f"Kendi ölçümünü yaptıysan dayanak gösterme.")

    # --- okuma ----------------------------------------------------------
    def oku(self, imlec: int = 0) -> tuple[list[Mesaj], int]:
        satirlar = self.yol.read_text(encoding="utf-8").splitlines()
        yeni = [Mesaj(**json.loads(s)) for s in satirlar[imlec:] if s.strip()]
        return yeni, len(satirlar)

    def bekle(self, imlec: int, kime: str, saniye: float = 60.0,
              aralik: float = 0.4) -> tuple[list[Mesaj], int]:
        """
        Bana gelen mesajı bekle. ZAMAN AŞIMI ZORUNLU — karşılıklı bekleme
        sistemi sonsuza kadar dondurur (bkz. sira.py).
        """
        bitis = time.time() + saniye
        while time.time() < bitis:
            yeni, ni = self.oku(imlec)
            bana = [m for m in yeni if m.kime in (kime, "*")]
            if bana:
                return bana, ni
            imlec = ni
            time.sleep(aralik)
        return [], imlec
