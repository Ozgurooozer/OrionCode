"""
kanca — olay aboneliği + konum çapası.

TASARIM (iki aday):
  A) Ham chunk sınırında olay ateşlenir (LLM token sınırı).
  B) Görünür metin karakter ofsetinde olay ateşlenir.
  -> A: Token chunk'ları kullanıcıya gösterilen metin sınırlarıyla örtüşmez.
     Bir jest "kapı" kelimesine eşlik ediyorsa, animasyon o kelimenin
     kullanıcıda görünme anına denk gelmeli, ham chunk'a değil.
     B seçildi: konum GÖRÜNÜR metne göre hesaplanır.

DEĞİŞMEZ: Olay.pozisyon, ham chunk ofseti değil; görünür metindeki ofseti ifade eder.
  -> bildir() imzası bunu zorunlu kılar: gorunen_metin string'inin uzunluğu
     aynı anda iletilir, callback o ofsetle uyuşmayan olayları reddedebilir.

ARAYÜZ:
  Olay(tur, deger, pozisyon, gorunen_metin_uzunlugu)
  Kanca:
    .abone(callback: Callable[[Olay], None]) -> None
    .bildir(olay: Olay, gorunen_metin_uzunlugu: int) -> None
      # gorunen_metin_uzunlugu: callback ofseti doğrulamak için kullanır
    .abonelik_sayisi() -> int

# ASSUMPTION(visible-text-only): bildir() çağıran taraf (genellikle Ayristirici)
# gorunen_metin_uzunlugu'nu Ayristirici._gorunen_uzunluk'tan alır.
# Ham chunk uzunluğunu geçirmek bu kabul anlaşmasını bozar.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Olay:
    tur: str                      # "poz" | "jest" | "bilinmeyen"
    deger: str
    pozisyon: int                 # görünür metindeki karakter ofseti
    gorunen_metin_uzunlugu: int   # o anki toplam görünür metin uzunluğu


Callback = Callable[[Olay], None]


class Kanca:
    def __init__(self) -> None:
        self._aboneler: list[Callback] = []

    def abone(self, callback: Callback) -> None:
        self._aboneler.append(callback)

    def bildir(self, olay: Olay, gorunen_metin_uzunlugu: int) -> None:
        # DEĞİŞMEZ: pozisyon görünür metin sınırı içinde olmalı.
        assert olay.pozisyon <= gorunen_metin_uzunlugu, (
            f"pozisyon ({olay.pozisyon}) görünür metin ({gorunen_metin_uzunlugu}) "
            f"dışında — ham chunk ofseti geçirilmiş olabilir"
        )
        assert olay.gorunen_metin_uzunlugu == gorunen_metin_uzunlugu, (
            "Olay.gorunen_metin_uzunlugu ile bildir() argümanı uyuşmuyor"
        )
        for cb in self._aboneler:
            cb(olay)

    def abonelik_sayisi(self) -> int:
        return len(self._aboneler)
