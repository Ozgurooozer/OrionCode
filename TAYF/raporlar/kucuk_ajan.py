"""
kucuk_ajan — 270M sınıfı yerel model için görev koşucusu.

MODELİN İŞİ SADECE: niyet -> araç adı + argümanlar (JSON).
Geri kalan her şey harness'ın: doğrulama, çalıştırma, kanıt etiketi, bütçe.

# ASSUMPTION(model-json-bozar): 270M model bozuk JSON üretir. Ayrıştırma
# hatası bir BAŞARISIZLIKTIR, tahmin edilerek onarılmaz.

ARAYÜZ:
  KucukAjan(katalog, uretici, butce=None, kim="k1")
    .calis(gorev) -> Sonuc
  uretici(prompt) -> str  (Ollama /api/chat, format=json)
"""
from __future__ import annotations

import json

from arac import Katalog, Sonuc

ISTEM = """Sana bir görev ve araç listesi verilecek.
YALNIZCA şu JSON'u üret, başka hiçbir şey yazma:
{{"arac": "<araç adı>", "args": {{...}}}}

Araçlar:
{araclar}

Görev: {gorev}"""


class KucukAjan:
    def __init__(self, katalog: Katalog, uretici, butce=None,
                 kim: str = "k1") -> None:
        self.katalog, self.uretici, self.butce, self.kim = (
            katalog, uretici, butce, kim)

    def calis(self, gorev: str) -> Sonuc:
        ham = self.uretici(ISTEM.format(
            araclar=self.katalog.sema_metni(), gorev=gorev))
        try:
            d = json.loads(ham)
            ad, args = d["arac"], d.get("args", {})
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            return Sonuc(None, {}, False, "", "[ÖLÇÜLMEDİ]",
                         f"model bozuk çıktı verdi: {type(e).__name__}")
        if self.butce is not None:
            a = self.katalog._araclar.get(ad)
            sinif = a.sinif if a else "geri_alinabilir"
            if not self.butce.harca(self.kim, ad, sinif):
                return Sonuc(ad, args, False, "", "[ÖLÇÜLMEDİ]", "bütçe yetersiz")
        return self.katalog.cagir(ad, args)
