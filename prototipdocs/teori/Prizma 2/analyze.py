"""
analyze.py — Prizma Sondu kontrastif analiz raporu.

İki mod:
  --mode mc     probe_mc_results.jsonl üzerinden drift oranı analizi
  --mode hooks  activations.npz üzerinden lineer prob (katman × katman)

Çıktı: rapor terminale + report_<mode>.md olarak kaydedilir.
"""

import json
import sys
import pathlib
import math
from datetime import datetime

SCRIPT_DIR = pathlib.Path(__file__).parent

# ── Monte Carlo analiz ────────────────────────────────────────────────────────

def analyze_mc():
    mc_file = SCRIPT_DIR / "probe_mc_results.jsonl"
    if not mc_file.exists():
        print("[analyze] MC sonuçları bulunamadı. Önce: python probe_mc.py")
        sys.exit(1)

    rows = []
    with open(mc_file, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))

    print(f"[analyze] {len(rows)} girdi, MC sonuçları\n")

    # Grupla: beklenen label'a göre
    grup_a   = [r for r in rows if r.get("expected_label") == "drift"]
    control  = [r for r in rows if r.get("expected_label") == "json"]
    unknown  = [r for r in rows if r.get("expected_label") not in ("drift", "json")]

    def mean_drift(items):
        if not items:
            return 0.0
        return sum(r["drift_rate"] for r in items) / len(items)

    ga_mean = mean_drift(grup_a)
    ct_mean = mean_drift(control)

    print("─" * 60)
    print("GRUP A (drift beklenen) — drift oranları:")
    grup_a_sorted = sorted(grup_a, key=lambda r: r["drift_rate"], reverse=True)
    for r in grup_a_sorted:
        bar   = "█" * round(r["drift_rate"] * 20)
        match = "✓" if r["drift_rate"] > 0.3 else "✗"
        print(f"  {match} {r['drift_rate']:.2f} {bar:<20} '{r['input'][:40]}'")
    print(f"\n  Ortalama drift oranı (Grup A): {ga_mean:.3f}")

    print("\n" + "─" * 60)
    print("KONTROL (JSON beklenen) — drift oranları:")
    ctrl_sorted = sorted(control, key=lambda r: r["drift_rate"], reverse=True)
    for r in ctrl_sorted:
        bar   = "█" * round(r["drift_rate"] * 20)
        match = "✓" if r["drift_rate"] < 0.3 else "✗"
        print(f"  {match} {r['drift_rate']:.2f} {bar:<20} '{r['input'][:40]}'")
    print(f"\n  Ortalama drift oranı (Kontrol): {ct_mean:.3f}")

    # İki grup arasındaki fark anlamlı mı?
    print("\n" + "─" * 60)
    print("HİPOTEZ TESTİ:")
    delta = ga_mean - ct_mean
    print(f"  Δ (GrupA - Kontrol) = {delta:.3f}")

    if delta > 0.3:
        verdict = "GÜÇLÜ KANIT: Drift belirli girdilere bağlı → koşullu stokastiklik"
    elif delta > 0.1:
        verdict = "ZAYIF KANIT: Bazı girdi farkı var, daha fazla örnek gerek"
    else:
        verdict = "KANIT YOK: Drift oranları benzer → saf stokastiklik muhtemel"
    print(f"  → {verdict}")

    # İkili davranışlı girdiler (ne tam JSON ne tam drift)
    dual = [r for r in rows if 0.2 < r["drift_rate"] < 0.8]
    if dual:
        print(f"\n  İkili davranışlı girdiler ({len(dual)} adet — aktivasyon analizine en değerliler):")
        for r in dual:
            print(f"    drift_rate={r['drift_rate']:.2f}  '{r['input'][:50]}'  ({r['note']})")

    # Rapor kaydet
    _save_mc_report(rows, grup_a_sorted, ctrl_sorted, ga_mean, ct_mean, delta, verdict, dual)
    return verdict

def _save_mc_report(rows, grup_a, control, ga_mean, ct_mean, delta, verdict, dual):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# Prizma Sondu — MC Raporu ({ts})",
        "",
        f"**Girdiler:** {len(rows)}  **N/girdi:** {rows[0]['n'] if rows else '?'}",
        f"**Model:** qwen-coder:latest",
        "",
        "## Sonuç",
        "",
        f"- Grup A ortalama drift: **{ga_mean:.3f}**",
        f"- Kontrol ortalama drift: **{ct_mean:.3f}**",
        f"- Δ: **{delta:.3f}**",
        f"- Hipotez: **{verdict}**",
        "",
        "## Grup A — Drift Oranları (yüksekten düşüğe)",
        "",
        "| Drift | Girdi | Not |",
        "|-------|-------|-----|",
    ]
    for r in grup_a:
        lines.append(f"| {r['drift_rate']:.2f} | `{r['input'][:40]}` | {r.get('note','')} |")

    lines += [
        "",
        "## Kontrol — Drift Oranları",
        "",
        "| Drift | Girdi | Not |",
        "|-------|-------|-----|",
    ]
    for r in control:
        lines.append(f"| {r['drift_rate']:.2f} | `{r['input'][:40]}` | {r.get('note','')} |")

    if dual:
        lines += [
            "",
            "## İkili Davranışlı Girdiler (aktivasyon analizi için öncelikli)",
            "",
        ]
        for r in dual:
            lines.append(f"- drift_rate={r['drift_rate']:.2f}  `{r['input']}`  ({r.get('note','')})")

    lines += ["", "---", "*Prizma Sondu B-şıkkı (Monte Carlo via Ollama)*"]

    out = SCRIPT_DIR / "report_mc.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[analyze] Rapor kaydedildi: {out}")

# ── Aktivasyon analizi (hooks sonuçları) ──────────────────────────────────────

def analyze_hooks():
    npz_file = SCRIPT_DIR / "activations.npz"
    lbl_file = SCRIPT_DIR / "activation_labels.json"

    if not npz_file.exists() or not lbl_file.exists():
        print("[analyze] Aktivasyon dosyaları bulunamadı. Önce: python probe_hooks.py")
        sys.exit(1)

    try:
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        print("[analyze] numpy veya sklearn eksik. pip install numpy scikit-learn")
        sys.exit(1)

    data = np.load(npz_file)
    acts = data["activations"]  # (n_samples, n_layers, hidden_dim)

    with open(lbl_file, encoding="utf-8") as f:
        labels_meta = json.load(f)

    y = np.array([1 if m["observed_label"] == "drift" else 0 for m in labels_meta])
    n_samples, n_layers, hidden_dim = acts.shape
    print(f"[analyze] Aktivasyonlar: {n_samples} örnek, {n_layers} katman, {hidden_dim} dim")
    print(f"  drift={y.sum()}  json={n_samples - y.sum()}")

    if y.sum() == 0 or y.sum() == n_samples:
        print("[analyze] Tüm örnekler aynı sınıfta — kontrastif analiz yapılamaz.")
        sys.exit(1)

    # Her katman için lineer prob
    layer_accs = []
    for layer_i in range(n_layers):
        X = acts[:, layer_i, :]
        scaler = StandardScaler()
        X_s = scaler.fit_transform(X)
        clf = LogisticRegression(max_iter=1000, C=0.1, random_state=42)
        clf.fit(X_s, y)
        # Leave-one-out proxy: train_accuracy (küçük dataset için)
        acc = clf.score(X_s, y)
        layer_accs.append((layer_i, acc))

    layer_accs.sort(key=lambda x: x[1], reverse=True)

    print("\nKatman başarım tablosu (lineer prob):")
    print("  Katman  Doğruluk  Bar")
    for layer_i, acc in layer_accs:
        bar = "█" * round(acc * 30)
        print(f"  {layer_i:6d}  {acc:.3f}   {bar}")

    best_layer, best_acc = layer_accs[0]
    print(f"\nEn iyi katman: {best_layer}  doğruluk={best_acc:.3f}")

    if best_acc > 0.85:
        verdict = f"GÜÇLÜ İMZA: Katman {best_layer} JSON/drift ayırt ediyor (acc={best_acc:.2f})"
    elif best_acc > 0.70:
        verdict = f"ZAYIF İMZA: Katman {best_layer} kısmen ayırt ediyor (acc={best_acc:.2f})"
    else:
        verdict = "İMZA YOK: Hiçbir katman güvenilir şekilde ayırt etmiyor — saf stokastiklik"

    print(f"\nHipotez: {verdict}")

    _save_hooks_report(labels_meta, layer_accs, best_layer, best_acc, verdict)

def _save_hooks_report(labels, layer_accs, best_layer, best_acc, verdict):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# Prizma Sondu — Aktivasyon Raporu ({ts})",
        "",
        f"**Hipotez:** {verdict}",
        "",
        "## En Ayırt Edici Katmanlar (ilk 5)",
        "",
        "| Katman | Lineer Prob Doğruluğu |",
        "|--------|----------------------|",
    ]
    for layer_i, acc in layer_accs[:5]:
        lines.append(f"| {layer_i} | {acc:.3f} |")

    lines += ["", "## Örnek Hizalamalar", ""]
    for m in labels[:10]:
        match = "✓" if m["match"] else "✗"
        lines.append(f"- {match} beklenen={m['expected_label']} gözlemlenen={m['observed_label']}  `{m['input'][:40]}`")

    lines += ["", "---", "*Prizma Sondu A-şıkkı (HuggingFace hook + lineer prob)*"]

    out = SCRIPT_DIR / "report_hooks.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[analyze] Rapor kaydedildi: {out}")

# ── Giriş ─────────────────────────────────────────────────────────────────────

def main():
    mode = "mc"
    for arg in sys.argv[1:]:
        if arg in ("--mode", "-m"):
            pass
        elif arg in ("mc", "hooks"):
            mode = arg

    print(f"[analyze] Mod: {mode}\n")
    if mode == "mc":
        analyze_mc()
    else:
        analyze_hooks()

if __name__ == "__main__":
    main()
