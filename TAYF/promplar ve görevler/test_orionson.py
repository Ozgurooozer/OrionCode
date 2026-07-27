"""
DÜŞMAN TESTİ (implementasyondan önce yazıldı):
Naif çözümü kıracak test — "ses üretti, demek çalışıyor" iddiasını kırar.
Gerçek soru: SAĞLIKLI ve TAKILMIŞ koşular AYRIŞIYOR mu?
Ayrışmıyorsa sonification anlamsız, ne kadar hoş olursa olsun.
"""
import numpy as np
import pytest

from orionson import Step, sonify, discriminability, write_wav


def healthy_trace(n=48):
    """Sağlıklı: hız stabil, entropi düşük, loop derinliği 0, ara sıra tool."""
    rng = np.random.default_rng(0)
    out = []
    for i in range(n):
        out.append(Step(
            tok_per_s=float(38 + rng.normal(0, 3)),
            entropy=float(np.clip(0.6 + rng.normal(0, 0.15), 0, 4)),
            loop_depth=0.0,
            event="tool" if i in (12, 31) else None,
        ))
    return out


def stuck_trace(n=48):
    """Takılmış: hız düşüyor, entropi yükseliyor, loop derinliği tırmanıyor."""
    rng = np.random.default_rng(1)
    out = []
    for i in range(n):
        prog = i / n
        out.append(Step(
            tok_per_s=float(max(2.0, 38 - 34 * prog + rng.normal(0, 2))),
            entropy=float(np.clip(0.6 + 2.6 * prog + rng.normal(0, 0.2), 0, 4)),
            loop_depth=float(prog * 9.0),
            event="error" if i in (28, 40) else None,
        ))
    return out


def test_rejects_empty_trace():
    with pytest.raises(ValueError):
        sonify([])


def test_rejects_nan():
    with pytest.raises(ValueError):
        sonify([Step(tok_per_s=float("nan"), entropy=1.0, loop_depth=0.0)])


def test_rejects_bounded_field_on_shepard():
    """Sınırlı bir alan (negatif/yüzde) loop_depth'e bağlanırsa yakalanmalı."""
    with pytest.raises(AssertionError):
        sonify([Step(tok_per_s=10.0, entropy=1.0, loop_depth=-0.5)])


def test_output_is_in_range_and_finite():
    a = sonify(healthy_trace(8))
    assert np.all(np.isfinite(a))
    assert np.max(np.abs(a)) <= 1.0


def test_healthy_and_stuck_are_acoustically_separable():
    """ASIL TEST: iki durum ölçülebilir şekilde ayrışmalı (d' > 1.0)."""
    a = sonify(healthy_trace())
    b = sonify(stuck_trace())
    d = discriminability(a, b)
    print("\nAYIRT EDİLEBİLİRLİK:", d)
    assert d["centroid_dprime"] > 1.0, f"parlaklık ayrışmıyor: {d}"
    assert d["lf_ratio_dprime"] > 1.0, f"düşük frekans oranı ayrışmıyor: {d}"


def test_healthy_is_quieter_than_stuck():
    """Sağlıklı sistem SIKICI/sakin olmalı — FEP ilkesi kod düzeyinde."""
    a = sonify(healthy_trace())
    b = sonify(stuck_trace())
    assert float(np.sqrt((a ** 2).mean())) < float(np.sqrt((b ** 2).mean()))
