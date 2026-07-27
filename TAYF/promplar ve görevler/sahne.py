"""
sahne — anlatım→animasyon işaretçi katmanı.

AMAÇ: LLM çıktısından poz/jest sinyallerini söküp görünür metni temiz bırakmak.

TASARIM (iki aday):
  A) Serbest format: model istediği gibi marker yazar, regex ayıklar.
  B) Kapalı sözlük: yalnız bilinen değerlere izin verilir; bilinmeyen UYARI üretir.
  -> A seçilseydi "hangi poz %80'i geçiyor" sorusu yanıtsız kalırdı (sonsuz değer).
     B seçildi: dağılım hesaplanabilir, bilinmeyen marker tespit edilebilir.

DEĞİŞMEZ: işaretçi görünür metne SIZAMAZ.
  -> Ayristirici.metin() hiçbir zaman [POZ:…] veya [JEST:…] parçası döndürmez.
  -> assert ile korunur; sızmayı hiçbir zaman sessizce geçirmeyiz.

ARAYÜZ:
  POZLAR, JESTLER: frozenset[str]   # kapalı sözlük
  SISTEM_ISTEMI: str                 # LLM'e marker kullanımı talimatı
  Olay(tur, deger, pozisyon)         # pozisyon: görünür metindeki karakter ofseti
  Ayristirici:
    .metin(chunk: str) -> str        # işaretçisiz görünür metin
    .olaylar() -> list[Olay]         # tüm oturumun olayları
    .poz_dagilimi() -> dict[str,int] # hangi poz kaç kez
    .jest_sayisi_toplam() -> int
    .bilinmeyen_sayisi() -> int      # sözlük dışı değerler

# ASSUMPTION(closed-vocab): POZLAR ve JESTLER derleme zamanında sabit.
# LLM yeni değer icat ederse "bilinmeyen" sayılır, sessizce yutulmaz.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

POZLAR: frozenset[str] = frozenset({
    "duruyor", "oturuyor", "yatıyor", "eğiliyor",
    "yürüyor", "koşuyor", "bakıyor",
})

JESTLER: frozenset[str] = frozenset({
    "el_salliyor", "başını_sallıyor", "omuz_silkiyor",
    "işaret_ediyor", "gülümsüyor", "kaş_çatıyor",
    "el_açıyor", "bekliyor",
})

_PATTERN = re.compile(r"\[(?P<tur>POZ|JEST):(?P<deger>[^\]]+)\]")
# Chunk sonunda yarım kalan marker başlangıcını yakalar: "[POZ:" veya "[JEST:"
_PARTIAL = re.compile(r"\[(?:POZ|JEST):[^\]]*$")

SISTEM_ISTEMI = (
    "Yanıtlarken beden dilini belirtmek için YALNIZCA aşağıdaki işaretçileri "
    "kullan — başka format KULLANMA.\n"
    f"  Duruş (bir adet, sürekli): [POZ:deger]  — Geçerli: {', '.join(sorted(POZLAR))}\n"
    f"  Jest (anlık): [JEST:deger]               — Geçerli: {', '.join(sorted(JESTLER))}\n"
    "İşaretçiler kullanıcıya GÖRÜNMEYECEKTİR; metinden ayrıştırılır. "
    "İşaretçi metninle iç içe yaz, ayrı satıra KOYMA.\n"
    "Örnek: 'Evet [POZ:duruyor][JEST:başını_sallıyor] bu doğru.'\n"
    "UYARI: sözlük dışı değer kullanırsan bilinmeyen olarak işaretlenir."
)


@dataclass(frozen=True)
class Olay:
    tur: str       # "poz" | "jest" | "bilinmeyen"
    deger: str
    pozisyon: int  # görünür metindeki karakter ofseti (ham chunk değil)


@dataclass
class Ayristirici:
    _olaylar: list[Olay] = field(default_factory=list)
    _gorunen_uzunluk: int = 0   # o ana kadar kullanıcıya gösterilen toplam karakter
    _tampon: str = ""            # chunk sınırında yarım kalan marker

    def metin(self, chunk: str) -> str:
        """İşaretçileri söküp görünür metni döndür. Asla marker bırakmaz.

        Chunk sınırında bölünmüş marker için: _tampon biriktirme kullanır.
        Örn: metin("[POZ:") + metin("duruyor] ...") → marker düzgün yakalanır.
        """
        # Bir önceki chunk'tan kalan yarım marker'ı başa ekle
        chunk = self._tampon + chunk
        self._tampon = ""

        # Chunk sonunda yarım kalan marker varsa ayır, bir sonraki round'a bırak
        m_partial = _PARTIAL.search(chunk)
        if m_partial:
            self._tampon = chunk[m_partial.start():]
            chunk = chunk[:m_partial.start()]

        out_chars: list[str] = []
        pos = 0
        for m in _PATTERN.finditer(chunk):
            out_chars.append(chunk[pos:m.start()])
            tur_ham = m.group("tur").lower()    # "poz" | "jest"
            deger = m.group("deger").strip()
            # pozisyon = bu noktaya kadar kullanıcıya gösterilecek karakter sayısı
            gelen = len("".join(out_chars)) + self._gorunen_uzunluk
            if tur_ham == "poz":
                t = "poz" if deger in POZLAR else "bilinmeyen"
            else:
                t = "jest" if deger in JESTLER else "bilinmeyen"
            self._olaylar.append(Olay(t, deger, gelen))
            pos = m.end()
        out_chars.append(chunk[pos:])
        gorunen = "".join(out_chars)

        # DEĞİŞMEZ: görünür metin hiçbir marker içermez.
        assert "[POZ:" not in gorunen and "[JEST:" not in gorunen, \
            f"işaretçi görünür metne sızdı: {gorunen!r}"

        self._gorunen_uzunluk += len(gorunen)
        return gorunen

    def olaylar(self) -> list[Olay]:
        return list(self._olaylar)

    def poz_dagilimi(self) -> dict[str, int]:
        dag: dict[str, int] = {}
        for o in self._olaylar:
            if o.tur == "poz":
                dag[o.deger] = dag.get(o.deger, 0) + 1
        return dag

    def jest_sayisi_toplam(self) -> int:
        return sum(1 for o in self._olaylar if o.tur == "jest")

    def bilinmeyen_sayisi(self) -> int:
        return sum(1 for o in self._olaylar if o.tur == "bilinmeyen")
