"""
final_report.py — probe_mc_results.jsonl'den anında rapor üret.
Her çalıştırmada mevcut sonuçları analiz eder (kısmi bile olsa).
"""
import json, pathlib, statistics
from datetime import datetime

SCRIPT_DIR = pathlib.Path(__file__).parent
MC_FILE    = SCRIPT_DIR / "probe_mc_results.jsonl"

if not MC_FILE.exists() or MC_FILE.stat().st_size == 0:
    print("[final_report] Sonuç dosyası yok veya boş. Önce probe_mc.py çalıştır.")
    raise SystemExit(1)

rows = [json.loads(l) for l in MC_FILE.read_text("utf-8").splitlines() if l.strip()]
if not rows:
    print("[final_report] Sonuç yok.")
    raise SystemExit(1)

n_done  = len(rows)
ga_rows = [r for r in rows if r.get("expected_label") == "drift"]
ct_rows = [r for r in rows if r.get("expected_label") == "json"]

ga_drifts = [r["drift_rate"] for r in ga_rows]
ct_drifts = [r["drift_rate"] for r in ct_rows]

ga_mean = statistics.mean(ga_drifts) if ga_drifts else 0.0
ct_mean = statistics.mean(ct_drifts) if ct_drifts else 0.0
delta   = ga_mean - ct_mean

print(f"{'='*62}")
print(f"PRİZMA SONDU — MC Raporu ({datetime.now().strftime('%Y-%m-%d %H:%M')})")
print(f"{'='*62}")
print(f"Tamamlanan: {n_done}  GrupA={len(ga_rows)}  Kontrol={len(ct_rows)}")
print(f"Grup A ort. drift : {ga_mean:.3f}")
print(f"Kontrol ort. drift: {ct_mean:.3f}")
print(f"Δ                 : {delta:.3f}")

if delta > 0.25:
    verdict = "HIPOTEZ DOGRULANMADI - drift giridiye bagli (koşullu stokastik)"
elif delta > 0.10:
    verdict = "ZAYIF KANIT - delta anlamlı değil, daha büyük N gerekli"
else:
    verdict = "SAF STOKASTIK - girdi farkı anlamsız"
print(f"Hipotez: {verdict}")

# ── Grup A — drift sıralaması ─────────────────────────────────────────────────
print(f"\n{'─'*62}")
print("GRUP A — drift oranına göre (yüksekten düşüğe):")
for r in sorted(ga_rows, key=lambda x: x["drift_rate"], reverse=True):
    bar  = "█" * round(r["drift_rate"] * 20)
    note = r.get("note", "")
    print(f"  {r['drift_rate']:.2f}  {bar:<12}  '{r['input'][:38]}'  {note}")

# ── Kontrol — drift sıralaması ────────────────────────────────────────────────
if ct_rows:
    print(f"\n{'─'*62}")
    print("KONTROL — drift oranına göre:")
    for r in sorted(ct_rows, key=lambda x: x["drift_rate"], reverse=True):
        if r["drift_rate"] > 0:
            bar = "█" * round(r["drift_rate"] * 20)
            print(f"  {r['drift_rate']:.2f}  {bar:<12}  '{r['input'][:38]}'  *** BEKLENMEDIK DRIFT")

# ── İkili davranışlı (0.2 < drift < 0.8) ────────────────────────────────────
dual = [r for r in rows if 0.15 < r["drift_rate"] < 0.85]
if dual:
    print(f"\n{'─'*62}")
    print(f"İKİLİ DAVRANIŞLI ({len(dual)} girdi) — aktivasyon analizi için değerliler:")
    for r in sorted(dual, key=lambda x: x["drift_rate"], reverse=True):
        print(f"  {r['drift_rate']:.2f}  [{r['expected_label']}]  '{r['input'][:45]}'")

# ── Markdown rapor kaydet ─────────────────────────────────────────────────────
ts = datetime.now().strftime("%Y-%m-%d %H:%M")
lines = [
    f"# Prizma Sondu — Final MC Raporu ({ts})",
    "",
    f"**Girdi:** {n_done}  **GrupA:** {len(ga_rows)}  **Kontrol:** {len(ct_rows)}",
    f"**Model:** qwen-coder:latest (qwen35:4.3B)  **N:** {rows[0].get('n', '?')} koşu/girdi",
    "",
    f"| Metrik | Değer |",
    f"|--------|-------|",
    f"| Grup A ort. drift | **{ga_mean:.3f}** |",
    f"| Kontrol ort. drift | **{ct_mean:.3f}** |",
    f"| Δ | **{delta:.3f}** |",
    f"| Hipotez | {verdict} |",
    "",
    "## Grup A — Drift Oranları",
    "",
    "| Drift | Girdi | Not |",
    "|-------|-------|-----|",
]
for r in sorted(ga_rows, key=lambda x: x["drift_rate"], reverse=True):
    lines.append(f"| {r['drift_rate']:.2f} | `{r['input'][:40]}` | {r.get('note','')} |")

if ct_rows:
    ct_high = [r for r in ct_rows if r["drift_rate"] > 0]
    if ct_high:
        lines += ["", "## Kontrol — Beklenmedik Drift", "", "| Drift | Girdi |", "|-------|-------|"]
        for r in sorted(ct_high, key=lambda x: x["drift_rate"], reverse=True):
            lines.append(f"| {r['drift_rate']:.2f} | `{r['input'][:40]}` |")

if dual:
    lines += ["", "## İkili Davranışlı Girdiler (aktivasyon prob için öncelikli)", ""]
    for r in sorted(dual, key=lambda x: x["drift_rate"], reverse=True):
        lines.append(f"- drift={r['drift_rate']:.2f}  `{r['input']}`  ({r.get('note','')})")

lines += ["", "---", "*Prizma Sondu MC — qwen35:4.3B üzerinde*"]

out = SCRIPT_DIR / "RAPOR_FINAL.md"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"\n[final_report] Kaydedildi: {out}")
