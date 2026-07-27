"""
butce — ajan ekonomisi. HARCANAN VAR, KAZANILAN YOK.

NEDEN MAAŞ DEĞİL:
  Ajan görevle para kazanırsa ölçüt ödüle döner ve Goodhart baskısı SÜREKLİ
  olur. Bu oturumda belgelendi: ajan boşta `pytest` koşup tiyatro bayrağını
  temizleyebiliyordu (sayilir.py). Ödül eklenince bu davranış teşvik edilir.
  Savunma tekil, saldırı sürekli -> asimetri kapatılamaz.

  Sabit bütçede maksimize edilecek bir şey YOKTUR. Goodhart baskısı sıfırdır.

MALİYET = GERİ ALMA MALİYETİ (Merkez A'nın sürekli hali):
  bakmak bedava · geri alınabilir ucuz · geri alınamaz pahalı · dış sistem en pahalı
  "Zaman bedava, taahhüt pahalı" — sonsuz düşün, nadiren işle.

BÜTÇE BİTİNCE ZARİF BOZULMA:
  Okuma ve düşünme DEVAM EDER, yalnız taahhüt durur. Sert stop değil.

# ASSUMPTION(disaridan-tahsis): tahsis YALNIZ insan/konfig tarafından yapılır.
# Ajanın çağırabileceği hiçbir yol bakiyeyi artırmaz — invaryant, metodun
# YOKLUĞU ile korunur ve test bunu doğrular.

ARAYÜZ:
  Butce(tavan)
    .tahsis(kim, miktar)              ; yalnız insan; tavanı aşamaz
    .harca(kim, eylem, sinif) -> bool ; yetmezse False, negatife düşmez
    .kalan(kim) -> int
    .dokum() -> dict                  ; kim neye ne harcadı
  Hata: ValueError (tavan aşımı, bilinmeyen sınıf), yok: kazan()/ödül yolu
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Maliyet tablosu = geri alma maliyeti. Bakmak KASTEN bedava:
# "ara temsile değil şeyin kendisine bak" kuralının bahanesi kalmasın.
MALIYET = {
    "bak": 0,          # dosya oku, çıktı incele, ham veriye bak
    "dusun": 0,        # analiz, plan, tartışma
    "geri_alinabilir": 1,    # yerel dosya yaz, prototip, deney
    "geri_alinamaz": 10,     # şema, kalıcı hafıza, bağımlılık
    "dis_sistem": 25,        # push, deploy, dış API'ye yazma
}

# Denetçi için: onay ve ret AYNI maliyette olmalı. Ret ucuz olsaydı
# denetçi varsayılan olarak reddederdi.
MALIYET["onayla"] = MALIYET["reddet"] = 2


@dataclass
class Butce:
    tavan: int
    _bakiye: dict[str, int] = field(default_factory=dict)
    _dokum: dict[str, dict[str, int]] = field(default_factory=dict)
    reddedilen: int = 0

    # --- YALNIZ İNSAN ÇAĞIRIR --------------------------------------------
    def tahsis(self, kim: str, miktar: int) -> None:
        if miktar < 0:
            raise ValueError("negatif tahsis yok")
        toplam = sum(self._bakiye.values()) + miktar
        if toplam > self.tavan:
            raise ValueError(
                f"tavan {self.tavan} aşılıyor (istenen toplam {toplam}). "
                f"Tavan donanımdan gelir, pazarlık edilmez.")
        self._bakiye[kim] = self._bakiye.get(kim, 0) + miktar

    # --- AJANLARIN ÇAĞIRDIĞI: yalnız harcama -----------------------------
    def harca(self, kim: str, eylem: str, sinif: str) -> bool:
        if sinif not in MALIYET:
            raise ValueError(f"bilinmeyen maliyet sınıfı: {sinif}")
        ucret = MALIYET[sinif]
        if ucret and self._bakiye.get(kim, 0) < ucret:
            self.reddedilen += 1
            return False                      # negatife DÜŞMEZ
        self._bakiye[kim] = self._bakiye.get(kim, 0) - ucret
        d = self._dokum.setdefault(kim, {})
        d[sinif] = d.get(sinif, 0) + ucret
        return True

    def kalan(self, kim: str) -> int:
        return self._bakiye.get(kim, 0)

    def dokum(self) -> dict:
        return {"bakiye": dict(self._bakiye), "harcama": self._dokum,
                "reddedilen": self.reddedilen}
