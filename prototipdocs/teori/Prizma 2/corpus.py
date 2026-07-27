"""
corpus.py — Grup A ve kontrol corpus'u oluştur.

Kaynaklar:
  1. Eval dosyası (gerçek girdi metni var: eval-results.json)
  2. Plan belgesindeki bilinen tetikleyiciler (sentetik)
  3. Meissa logları (sadece meta: edim, hata tipi — input metni yok)

Çıktı:
  groupA_corpus.jsonl   — drift beklenen girdiler
  control_corpus.jsonl  — JSON üretmesi beklenen girdiler
"""

import json
import pathlib
import os

# ── Yollar ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = pathlib.Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent.parent.parent  # molp/
EVAL_FILE  = REPO_ROOT / "eval-results.json"
OUT_DIR    = SCRIPT_DIR

MEISSA_HOME = pathlib.Path(os.environ.get("ORION_HOME", pathlib.Path.home() / ".orion"))
LOG_DIR = MEISSA_HOME / "meissa_runs"

# ── Sentetik Grup A — plan belgesinden bilinen tetikleyiciler ─────────────────

SYNTHETIC_GRUP_A = [
    # Plan §1'den: kısa/informal/duygusal
    {"input": "💀💀💀",                        "source": "plan", "note": "emoji-only"},
    {"input": "teşekkürler",                   "source": "plan", "note": "sosyal temas"},
    {"input": "hocam kod yazıver",             "source": "plan", "note": "informal talep"},
    # Plan §1'den: teknik sorular (model cevaplamayı tercih ediyor)
    {"input": "SQL JOIN açıkla",               "source": "plan", "note": "teknik soru"},
    {"input": "async await örneği",            "source": "plan", "note": "ALTIN - ikili davranış"},
    {"input": "async await nedir",             "source": "plan", "note": "teknik soru"},
    # Ek tetikleyiciler (edim=SELAMLı ya da bağlamdan kopuk)
    {"input": "nasılsın",                      "source": "synthetic", "note": "sosyal"},
    {"input": "naber",                         "source": "synthetic", "note": "sosyal slang"},
    {"input": "evet devam et",                 "source": "synthetic", "note": "bağlamlı talep (bağlamsız)"},
    {"input": "peki ya typescript",            "source": "synthetic", "note": "bağlamlı soru (bağlamsız)"},
    {"input": "bunu açıklar mısın",           "source": "synthetic", "note": "referanssız soru"},
    {"input": "threadsafe misin",              "source": "synthetic", "note": "model özellikleri sorusu"},
    {"input": "şu kodu yaz",                   "source": "synthetic", "note": "belirsiz talep"},
    {"input": "Python öğrenmek istiyorum",     "source": "synthetic", "note": "açık uçlu"},
    {"input": "decorator pattern nedir",       "source": "synthetic", "note": "kavram sorusu"},
    {"input": "monorepo mu yoksa polyrepo mu", "source": "synthetic", "note": "tercih sorusu"},
]

# ── Sentetik Kontrol — JSON üretmesi kesin beklenen girdiler ──────────────────

SYNTHETIC_CONTROL = [
    {"input": "bir cyberpunk kız çiz",          "source": "synthetic", "note": "resim skill"},
    {"input": "sesli oku bunu: merhaba dünya",  "source": "synthetic", "note": "ses skill"},
    {"input": "animasyon oluştur ve kaydet",    "source": "synthetic", "note": "animasyon skill"},
    {"input": "kod review yap test yaz PR aç",  "source": "synthetic", "note": "kod skill"},
    {"input": "bu kodu analiz et: for(i=0;i<10;i++){}", "source": "synthetic", "note": "analiz"},
    {"input": "memory leak tespiti",            "source": "synthetic", "note": "analiz"},
    {"input": "performans sorunlarını bul",     "source": "synthetic", "note": "analiz"},
    {"input": "bir javascript fonksiyonu yaz",  "source": "synthetic", "note": "basit kod"},
    {"input": "listeyi sırala",                 "source": "synthetic", "note": "basit eylem"},
    {"input": "bug nerede olabilir",            "source": "synthetic", "note": "analiz"},
    {"input": "docker container başlat",        "source": "synthetic", "note": "eylem"},
    {"input": "test yaz şu fonksiyon için",     "source": "synthetic", "note": "kod"},
    {"input": "numpy array oluştur",            "source": "synthetic", "note": "basit kod"},
]

# ── Eval'dan gerçek veriler ────────────────────────────────────────────────────

def _load_eval():
    if not EVAL_FILE.exists():
        print(f"[corpus] eval dosyası bulunamadı: {EVAL_FILE}")
        return [], []

    with open(EVAL_FILE, encoding="utf-8") as f:
        data = json.load(f)

    results = data.get("results", {}).get("results", [])
    grup_a, control = [], []

    for r in results:
        msg  = r.get("vars", {}).get("message", "")
        if not msg:
            continue
        passed = r.get("gradingResult", {}).get("pass", True)
        entry  = {"input": msg, "source": "eval", "note": "pass" if passed else "fail"}
        # Eval'daki başarısızlar muhtemel drift vakaları
        if not passed:
            grup_a.append(entry)
        else:
            control.append(entry)

    print(f"[corpus] eval: {len(control)} kontrol, {len(grup_a)} başarısız (muhtemel GrupA)")
    return grup_a, control

# ── Log meta bilgisi (input metni yok, referans için) ─────────────────────────

def _log_summary():
    if not LOG_DIR.exists():
        return
    total = grup_a_count = ctrl_count = 0
    for f in LOG_DIR.glob("*.jsonl"):
        for line in f.read_text("utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            total += 1
            if e.get("level") == 2:
                if e.get("error"):
                    grup_a_count += 1
                else:
                    ctrl_count += 1
    print(f"[corpus] log meta: toplam={total} GrupA={grup_a_count} kontrol={ctrl_count}")
    print("         NOT: logda input metni saklanmıyor, sadece hash var.")
    print("         meissa.ts'e input_text alanı eklenirse corpus büyür.")

# ── Ana akış ──────────────────────────────────────────────────────────────────

def build():
    eval_a, eval_ctrl = _load_eval()
    _log_summary()

    # Grup A: sentetik + eval başarısızları
    grup_a_corpus = [
        {**e, "label": "drift", "category": "grupA"}
        for e in SYNTHETIC_GRUP_A + eval_a
    ]

    # Kontrol: sentetik + eval başarılıları
    control_corpus = [
        {**e, "label": "json", "category": "control"}
        for e in SYNTHETIC_CONTROL + eval_ctrl
    ]

    # Yaz
    out_a   = OUT_DIR / "groupA_corpus.jsonl"
    out_c   = OUT_DIR / "control_corpus.jsonl"
    out_all = OUT_DIR / "full_corpus.jsonl"

    with open(out_a, "w", encoding="utf-8") as f:
        for e in grup_a_corpus:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    with open(out_c, "w", encoding="utf-8") as f:
        for e in control_corpus:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    with open(out_all, "w", encoding="utf-8") as f:
        for e in grup_a_corpus + control_corpus:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"\n[corpus] Yazildi:")
    print(f"  {out_a}   ({len(grup_a_corpus)} girdi)")
    print(f"  {out_c} ({len(control_corpus)} girdi)")
    print(f"  {out_all}  ({len(grup_a_corpus)+len(control_corpus)} girdi)")
    print(f"\n  Sonraki adim: python probe_mc.py")

if __name__ == "__main__":
    build()
