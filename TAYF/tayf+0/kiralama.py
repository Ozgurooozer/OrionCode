"""
kiralama — Paylaşılan Orion terminalinin kira yönetimi.

ARAYÜZ:
  Kiralama(yol, kim, ttl=120.0)
    .al() -> bool           # kirala; False = başkası tutuyor
    .birak()                # bırak; yalnız sahibi bırakabilir
    .devral()               # TTL dolmuşsa zorla al; raises KiraHatasi yoksa
    .calistir(komut, yazma=True) -> str  # komut çalıştır; yazma=True → kira şart
    @contextmanager
    .kira()                 # with Kiralama.kira(): — otomatik al/bırak

  KiraHatasi: kira alınamadı, bırakılamadı, TTL dolmadı

GERİ ALMA MALİYETİ ESASI:
  yazma=False komutlar (ls, cat, git status, pytest) → kira gereksiz, iki ajan koşar
  yazma=True  komutlar (rm, git commit, pip install) → tek sahip, TTL'li

# ASSUMPTION(json-state): .tayf/kira.json {sahip, ts, ttl, son_komut}
# ASSUMPTION(ttl-expire): TTL sonrası sahip = None sayılır; yeni al() başarır.
# ASSUMPTION(write-detection): yazma kararı caller'a aittir, kiralama bilmez.
"""
from __future__ import annotations

import json
import subprocess
import time
from contextlib import contextmanager
from pathlib import Path

from _lock import dosya_kilidi

_BOŞ = {"sahip": None, "ts": 0.0, "ttl": 120.0, "son_komut": None}


class KiraHatasi(Exception):
    """Kira işlemi başarısız."""


class Kiralama:
    def __init__(self, yol: str | Path, kim: str, ttl: float = 120.0) -> None:
        self.yol = Path(yol)
        self.kim = kim
        self.ttl = ttl
        self.yol.parent.mkdir(parents=True, exist_ok=True)
        if not self.yol.exists():
            self._yaz(_BOŞ | {"ttl": ttl})

    # --- dosya işlemleri -------------------------------------------------
    def _oku(self) -> dict:
        try:
            return json.loads(self.yol.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, FileNotFoundError):
            return dict(_BOŞ)

    def _yaz(self, d: dict) -> None:
        with dosya_kilidi(self.yol):
            self.yol.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")

    def _aktif_mi(self, d: dict) -> bool:
        """Sahip var VE TTL dolmamış."""
        return d["sahip"] is not None and (time.time() - d["ts"]) <= d["ttl"]

    # --- API --------------------------------------------------------------
    def al(self) -> bool:
        d = self._oku()
        if self._aktif_mi(d) and d["sahip"] != self.kim:
            return False
        self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl, "son_komut": None})
        return True

    def birak(self) -> None:
        d = self._oku()
        if self._aktif_mi(d) and d["sahip"] != self.kim:
            raise KiraHatasi(f"Kirayı {d['sahip']} tutuyor, {self.kim} bırakamaz.")
        self._yaz(_BOŞ | {"ttl": self.ttl})

    def devral(self) -> None:
        """TTL dolmuşsa zorla al. Dolmamışsa KiraHatasi."""
        d = self._oku()
        if self._aktif_mi(d) and d["sahip"] != self.kim:
            kalan = d["ttl"] - (time.time() - d["ts"])
            raise KiraHatasi(
                f"Kira {d['sahip']}'da, TTL dolmadı ({kalan:.1f}s kaldı). devral() çağrılamaz."
            )
        self._yaz({"sahip": self.kim, "ts": time.time(), "ttl": self.ttl, "son_komut": None})

    @contextmanager
    def kira(self):
        """
        with k.kira():
            ...
        TTL içinde kira alınamazsa KiraHatasi. Çıkışta otomatik bırak.
        """
        if not self.al():
            d = self._oku()
            raise KiraHatasi(f"Kira alınamadı: {d['sahip']} tutuyor.")
        try:
            yield
        finally:
            try:
                self.birak()
            except KiraHatasi:
                pass  # zaten bırakılmış veya süresi dolmuş

    def calistir(self, komut: str, yazma: bool = True) -> str:
        """
        Komutu çalıştır. yazma=True ise önce kira al.
        Çıktı [A]/[B] etiketlisiyle döner.
        """
        if yazma:
            if not self.al():
                d = self._oku()
                raise KiraHatasi(f"Kira alınamadı: {d['sahip']} tutuyor. Komut çalıştırılmadı: {komut}")
        try:
            # son_komut logla
            if yazma:
                d = self._oku()
                d["son_komut"] = komut
                self._yaz(d)
            result = subprocess.run(
                komut, shell=True, capture_output=True, text=True, encoding="utf-8"
            )
            cikti = result.stdout + (("\nHATA: " + result.stderr) if result.stderr else "")
            return f"[{self.kim}] {cikti.strip()}"
        finally:
            if yazma:
                try:
                    self.birak()
                except KiraHatasi:
                    pass

    def durum(self) -> dict:
        return self._oku()
