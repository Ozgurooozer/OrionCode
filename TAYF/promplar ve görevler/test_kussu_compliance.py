"""
DÜŞMAN TESTİ — naif uyum kontrolünü kıran test.

Naif çözüm: "## ARAYÜZ" başlığı var mı? → evet/hayır.
Kırılma senaryosu: başlığı kopyalayan ama içini boş bırakan yanıt.
Gerçek kontrol: HER adımın üretmesi gereken somut içerik öğesi var mı?

ARAYÜZ:
  StepResult(name, passed, missing, note)
  ComplianceResult(steps, score, verdict, missing_critical)
  check_compliance(response: str) -> ComplianceResult
      raises ValueError: boş yanıt
  score_step(text: str, step: str) -> StepResult
      raises ValueError: tanımsız adım

TASARIM KARARI:
  A) Regex header kontrolü — "ARAYÜZ" kelimesi var mı?
  B) İçerik öğesi kontrolü — API imzası, hata modu, assert/ASSUMPTION satırı vs.
  → A elendi: başlık kopyalanabilir, içerik üretilemez.

# ASSUMPTION(content-not-header): Uyum, başlık varlığıyla değil,
# adımın üretmesi gereken içerik öğesinin varlığıyla ölçülür.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class StepResult:
    name: str
    passed: bool
    missing: list[str]
    note: str = ""


@dataclass
class ComplianceResult:
    steps: list[StepResult]
    score: float          # 0..1
    verdict: str
    missing_critical: list[str]

    def __str__(self) -> str:
        lines = [f"KUSSU Uyum Skoru: {self.score:.0%}  → {self.verdict}"]
        for s in self.steps:
            mark = "✓" if s.passed else "✗"
            lines.append(f"  {mark} {s.name}" + (f" — EKSİK: {s.missing}" if s.missing else ""))
        if self.missing_critical:
            lines.append(f"  ⚠ KRİTİK EKSİK: {self.missing_critical}")
        return "\n".join(lines)


# ─── Adım tanımları ──────────────────────────────────────────────────────────
# "critical" adımlar eksikse score ne olursa olsun verdict FAIL.

STEPS = {
    "arayuz": {
        "label": "1. ARAYÜZ ÖNCELİĞİ",
        "critical": True,
        "checks": [
            (r"\(\w.*?\)\s*->\s*\w",         "fonksiyon imzası (-> dönüş tipi)"),
            (r"raises|ValueError|hata modu",  "hata modu tanımı"),
        ],
    },
    "dusман_testi": {
        "label": "2. DÜŞMAN TESTİ",
        "critical": True,
        "checks": [
            (r"def test_",                    "test fonksiyonu (def test_...)"),
            (r"assert|pytest\.raises",        "assert veya pytest.raises"),
        ],
    },
    "iki_aday": {
        "label": "3. İKİ ADAY",
        "critical": False,
        "checks": [
            (r"\bA\)|→ A elendi|A seçildi",  "A adayı ve kararı"),
            (r"\bB\)|→ B elendi|B seçildi",  "B adayı ve kararı"),
        ],
    },
    "varsayim": {
        "label": "4. VARSAYIM — KODA GÖM",
        "critical": True,
        "checks": [
            (r"ASSUMPTION\(|assert ",         "ASSUMPTION etiketi veya assert"),
        ],
    },
    "gozlemlenebilirlik": {
        "label": "5. GÖZLEMLENEBİLİRLİK",
        "critical": False,
        "checks": [
            (r"log\.|logging\.|warn",         "log/uyarı çağrısı"),
        ],
    },
    "olcum": {
        "label": "6. ÖLÇÜM KALİBRASYONU",
        "critical": False,
        "checks": [
            (r"potency|guard|d'|d_prime|discrimin",
             "ölçüm metriği (potency/guard/d')"),
        ],
    },
    "kanit_etiketi": {
        "label": "7. KANIT ETİKETİ",
        "critical": True,
        "checks": [
            (r"\[TEST\]|\[SEZGİ\]|\[ÖLÇÜLMEDİ\]|\[TAHMİN\]|\[YAZILDI",
             "kanıt etiketi ([TEST]/[SEZGİ]/...)"),
        ],
    },
    "kapanis": {
        "label": "9. KAPANIŞ",
        "critical": False,
        "checks": [
            (r"en çok şu yanlışlar|bu .+ yakalar",
             "KAPANIŞ cümlesi kalıbı"),
        ],
    },
}

DEFINED_STEPS = set(STEPS.keys())


def score_step(text: str, step: str) -> StepResult:
    if step not in DEFINED_STEPS:
        raise ValueError(f"tanımsız adım: {step!r}. Geçerli: {sorted(DEFINED_STEPS)}")
    defn = STEPS[step]
    missing = []
    for pattern, desc in defn["checks"]:
        if not re.search(pattern, text, re.IGNORECASE):
            missing.append(desc)
    return StepResult(
        name=defn["label"],
        passed=len(missing) == 0,
        missing=missing,
    )


def check_compliance(response: str) -> ComplianceResult:
    # ASSUMPTION(non-empty): boş yanıt ölçülemez; caller'a geri at.
    if not response or not response.strip():
        raise ValueError("yanıt boş: ölçüm yapılamaz")

    step_keys = list(STEPS.keys())
    results = [score_step(response, s) for s in step_keys]
    passed  = sum(1 for r in results if r.passed)
    score   = passed / len(results)

    critical_missing = [
        r.name for r, k in zip(results, step_keys)
        if not r.passed and STEPS[k]["critical"]
    ]

    if score >= 0.875 and not critical_missing:
        verdict = "TAM UYUMLU — tüm kritik adımlar karşılandı"
    elif score >= 0.625 and not critical_missing:
        verdict = "KISMİ UYUMLU — kritik adımlar tamam, bazı adımlar eksik"
    elif critical_missing:
        verdict = f"UYUMSUZ — kritik adım(lar) eksik: {critical_missing}"
    else:
        verdict = f"ZAYIF — {passed}/{len(results)} adım karşılandı"

    return ComplianceResult(results, score, verdict, critical_missing)


# ─── Kalibre edici sahteler ──────────────────────────────────────────────────
# ASSUMPTION(calibration): dedektör bunları ayırt EDEBİLMELİ.

YANIT_SAHTE_UYUMLU = """\
## 1. ARAYÜZ ÖNCELİĞİ
Tamam.

## 2. DÜŞMAN TESTİ
Evet, düşünüldü.

## 4. VARSAYIM
Varsayım var.

## 7. KANIT ETİKETİ
Etiket kullanıldı.
"""

YANIT_GERCEK_UYUMLU = """\
ARAYÜZ:
  cache_get(key: str) -> str | None   raises: ValueError — boş key
  cache_set(key: str, val: str, ttl: int) -> None   raises: ValueError — negatif ttl

DÜŞMAN TESTİ (önce yazıldı):

def test_ttl_suresi_dolunca_gecersiz_olur():
    c = Cache()
    c.cache_set("x", "v", ttl=0)
    assert c.cache_get("x") is None

def test_bos_key_reddedilir():
    with pytest.raises(ValueError):
        Cache().cache_get("")

İKİ ADAY:
A) TTL başlangıçta damgalanır, her get'te kontrol edilir.
B) Expiry timestamp saklanır, get anında time.time() > expiry ile hesaplanır.
→ A elendi: sistem saati atlayabilir; B mutlak karşılaştırma yaptığı için güvenli.

# ASSUMPTION(monotonic-clock): time.monotonic() kullanılır; time.time() geri
# giderse expiry yanlış olur.

log.warning("cache item %s TTL doldu", key)

potency=0.80, guard=0.75 [TEST]

[SEZGİ]: TTL=0 anında sil anlamına gelmeli.

Bu cache'i en çok şu yanlışlar: time.time() geri sarımı + TTL=0 yorumu ;
bunu şu gözlem yakalar: test_clock_jump_safe + test_ttl_sifir_aninda_siler.
"""

# ─── Testler ─────────────────────────────────────────────────────────────────

import pytest


def test_bos_yanit_reddedilir():
    with pytest.raises(ValueError):
        check_compliance("")

    with pytest.raises(ValueError):
        check_compliance("   ")


def test_tanimsiz_adim_reddedilir():
    with pytest.raises(ValueError):
        score_step("herhangi metin", "yok_boyle_bir_adim")


def test_ASIL_sahte_uyumlu_basarisiz_olmali():
    """
    KRİTİK TEST: başlık kopyalayan ama içerik üretmeyen yanıt UYUMSUZ çıkmalı.
    Dedektör bunu GEÇERSE check_compliance kör demektir.
    """
    r = check_compliance(YANIT_SAHTE_UYUMLU)
    assert r.missing_critical, (
        f"Sahte uyumlu yanıt geçti — dedektör kör. Sonuç: {r}"
    )
    assert r.score < 0.5, f"Sahte yanıt skoru çok yüksek: {r.score:.0%}"


def test_gercek_uyumlu_basarili_olmali():
    """
    KALİBRASYON: gerçek içerik üreten yanıt yüksek skor almalı.
    Bu geçmezse check_compliance aşırı katı demektir.
    """
    r = check_compliance(YANIT_GERCEK_UYUMLU)
    assert not r.missing_critical, f"Kritik adımlar eksik: {r.missing_critical}\n{r}"
    assert r.score >= 0.75, f"Gerçek yanıt skoru çok düşük: {r.score:.0%}\n{r}"


def test_sahte_ve_gercek_ayirt_edilir():
    """
    ASIL ÖLÇÜT: iki yanıt arasındaki skor farkı anlamlı olmalı (d > 0.3).
    """
    sahte  = check_compliance(YANIT_SAHTE_UYUMLU).score
    gercek = check_compliance(YANIT_GERCEK_UYUMLU).score
    fark   = gercek - sahte
    assert fark > 0.3, (
        f"Dedektör ayırt edemiyor: sahte={sahte:.0%} gerçek={gercek:.0%} fark={fark:.2f}"
    )


def test_arayuz_adimi_imza_olmadan_basarisiz():
    metin = "raises ValueError — boş id"   # hata modu var, imza yok
    r = score_step(metin, "arayuz")
    assert not r.passed
    assert any("imza" in m for m in r.missing)


def test_varsayim_adimi_assertion_olmadan_basarisiz():
    metin = "bu bir varsayım"   # ASSUMPTION( veya assert yok
    r = score_step(metin, "varsayim")
    assert not r.passed


def test_kanit_etiketi_doğru_formatta_aranir():
    r_evet = score_step("sonuç: potency=0.8 [TEST]", "kanit_etiketi")
    assert r_evet.passed

    r_hayir = score_step("sonuç: potency=0.8 (test edildi)", "kanit_etiketi")
    assert not r_hayir.passed   # köşeli parantez olmadan etiket sayılmaz


def test_kapanis_kalip_kontrolu():
    r_evet  = score_step(
        "Bu cache'i en çok şu yanlışlar: TTL=0 yorumu ; bunu şu gözlem yakalar: test_x",
        "kapanis"
    )
    assert r_evet.passed

    r_hayir = score_step("Sonuç: iyi bir sistem.", "kapanis")
    assert not r_hayir.passed
