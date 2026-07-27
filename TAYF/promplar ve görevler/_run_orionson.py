"""orionson discriminability ölçümü — doğrudan koş"""
import numpy as np
from orionson import Step, sonify, discriminability, write_wav

def healthy(n=48):
    rng = np.random.default_rng(0)
    return [Step(
        tok_per_s=float(38 + rng.normal(0, 3)),
        entropy=float(np.clip(0.6 + rng.normal(0, 0.15), 0, 4)),
        loop_depth=0.0,
        event="tool" if i in (12, 31) else None,
    ) for i in range(n)]

def stuck(n=48):
    rng = np.random.default_rng(1)
    return [Step(
        tok_per_s=float(max(2.0, 38 - 34 * (i / n) + rng.normal(0, 2))),
        entropy=float(np.clip(0.6 + 2.6 * (i / n) + rng.normal(0, 0.2), 0, 4)),
        loop_depth=float((i / n) * 9.0),
        event="error" if i in (28, 40) else None,
    ) for i in range(n)]

a = sonify(healthy())
b = sonify(stuck())
d = discriminability(a, b)

print(f"centroid_dprime : {d['centroid_dprime']}  (>1.0 gerekli: {d['centroid_dprime'] > 1.0})")
print(f"lf_ratio_dprime : {d['lf_ratio_dprime']}  (>1.0 gerekli: {d['lf_ratio_dprime'] > 1.0})")
print(f"saglikli centroid: {d['centroid_healthy_hz']} Hz")
print(f"takilmis centroid: {d['centroid_stuck_hz']} Hz")

write_wav("saglikli_olcum.wav", a)
write_wav("takilmis_olcum.wav", b)
print("wav yazildi: saglikli_olcum.wav / takilmis_olcum.wav")

gecti = d["centroid_dprime"] > 1.0 and d["lf_ratio_dprime"] > 1.0
print(f"\nSONUC: {'GECTI [TEST]' if gecti else 'BASARISIZ'}")
