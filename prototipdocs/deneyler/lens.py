# -*- coding: utf-8 -*-
"""
LENS — AI'ın doğasına uygun minimal mimari (mercek ilkesi)
===========================================================
Model ışıktır: değiştirmeye çalışmayız, yönlendiririz.

Beş parça, her biri deneysel bir bulguya bağlı:
  1. HAYIR KAPISI   — görev önce "yapılmalı mı?" süzgecinden geçer (kimlik = ret tortusu)
  2. KISIT KAPISI   — göreve 2-3 UYUMLU kısıt türetilir (H1/H6: gerilim ağı, uyumluluk > sayı)
  3. FLIP MOTORU    — cevabın temel varsayımı çevrilir, ikinci tur koşar (H10: perturbe replay)
  4. AYIK DEĞERLENDİRİCİ — üretici kendi notunu YAZAMAZ (tur-3: N şişirmesi +1/+2)
  5. VAULT-İMZA     — sonuç bark-audit formatında saklanır: 1 iddia + 3 dayanak
                      + garanti/umut çifti (H5/H11). Embedding yok.

Kullanım:
  python lens.py "Orion'un vault'unda eski ve yeni bilgi çelişiyor. Nasıl tespit edilir?"
  python lens.py --task-file gorev.txt
  python lens.py --model qwen2.5-coder:7b --eval-model qwen2.5:7b "..."

Gereksinim: Çalışan bir Ollama (http://localhost:11434). Başka bağımlılık yok (saf stdlib).

Çıktılar (./lens_runs/ altında):
  run_YYYYMMDD_HHMMSS.md   — insan için tam rapor
  vault.jsonl              — imzalı kayıtlar (birikir)
  rejections.jsonl         — hayır kapısının ret gerekçeleri (kimlik tortusu, birikir)
  runs.jsonl               — her koşunun makine-okur özeti (birikir)
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Windows konsolunda Türkçe karakter sorununu önle
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

OLLAMA_URL = "http://localhost:11434/api/generate"
RUNS_DIR = Path("lens_runs")

# ---------------------------------------------------------------- Ollama çağrısı

def ollama(model: str, prompt: str, system: str = "", temperature: float = 0.7,
           max_retries: int = 2, timeout: int = 300) -> dict:
    """Tek Ollama çağrısı. Dönen dict: {text, seconds, tokens, error}"""
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if system:
        payload["system"] = system

    for attempt in range(max_retries + 1):
        t0 = time.time()
        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = (data.get("response") or "").strip()
            return {
                "text": text,
                "seconds": round(time.time() - t0, 1),
                "tokens": data.get("eval_count", 0),
                "error": None if text else "BOŞ YANIT (ham response alanı boş döndü)",
            }
        except urllib.error.URLError as e:
            err = f"Ollama'ya ulaşılamadı: {e}"
        except Exception as e:  # noqa: BLE001
            err = f"{type(e).__name__}: {e}"
        if attempt < max_retries:
            time.sleep(2)
    return {"text": "", "seconds": round(time.time() - t0, 1), "tokens": 0, "error": err}


def parse_json_block(text: str):
    """Model çıktısından ilk JSON nesnesini çek. Lineage dersinin mirası:
    boşluk sıfır değildir — parse başarısızsa ham metni de sakla, sessizce yutma."""
    if not text:
        return None, "boş metin"
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None, "JSON bloğu bulunamadı"
    try:
        return json.loads(text[start : end + 1]), None
    except json.JSONDecodeError as e:
        return None, f"JSON parse hatası: {e}"


# ---------------------------------------------------------------- 1. HAYIR KAPISI

NO_GATE_SYSTEM = (
    "Sen bir görev süzgecisin. Görevi YAPMAZSIN; yalnızca yapılıp yapılmaması "
    "gerektiğine karar verirsin. Ölçütlerin: (a) görev tanımlı ve test edilebilir mi, "
    "(b) mevcut araçlarla (yerel LLM, dosya sistemi) yapılabilir mi, "
    "(c) yapmaya değer mi yoksa daha iyi sorulmuş hali mi gerekir? "
    "SADECE şu JSON ile yanıt ver, başka hiçbir şey yazma:\n"
    '{"karar": "EVET" | "HAYIR" | "REVIZE", "gerekce": "<tek cümle>", '
    '"revize_oneri": "<karar REVIZE ise görevin daha iyi hali, değilse boş>"}'
)


def no_gate(model: str, task: str) -> dict:
    r = ollama(model, f"Görev: {task}", system=NO_GATE_SYSTEM, temperature=0.2)
    parsed, perr = parse_json_block(r["text"])
    if parsed is None:
        # Parse edilemeyen karar = geçir ama işaretle (sinyali boyama)
        return {"karar": "EVET", "gerekce": f"[parse edilemedi: {perr}]",
                "revize_oneri": "", "ham": r["text"], "hata": r["error"], "sn": r["seconds"]}
    parsed.setdefault("karar", "EVET")
    parsed.setdefault("gerekce", "")
    parsed.setdefault("revize_oneri", "")
    parsed.update({"ham": r["text"], "hata": r["error"], "sn": r["seconds"]})
    return parsed


# ---------------------------------------------------------------- 2. KISIT KAPISI

CONSTRAINT_SYSTEM = (
    "Sen bir kısıt tasarımcısısın. Verilen görev için birbirini BESLEYEN, uyumlu "
    "2-3 kısıt üret. Kural: kısıtlar çelişmemeli (matematiksel imkânsızlık yaratma), "
    "keyfi olmamalı (ör. 'her cümle sesli harfle başlasın' YASAK), görevin özünden "
    "türemeli ve çözüm uzayını daraltıp derinleştirmeli. "
    "SADECE şu JSON ile yanıt ver:\n"
    '{"kisitlar": ["<kısıt 1>", "<kısıt 2>", "<kısıt 3 (opsiyonel)>"], '
    '"uyum_gerekcesi": "<bu kısıtlar birbirini nasıl besliyor, tek cümle>"}'
)


def constraint_gate(model: str, task: str) -> dict:
    r = ollama(model, f"Görev: {task}", system=CONSTRAINT_SYSTEM, temperature=0.5)
    parsed, perr = parse_json_block(r["text"])
    if parsed is None or not parsed.get("kisitlar"):
        return {"kisitlar": [], "uyum_gerekcesi": f"[kısıt türetilemedi: {perr}]",
                "ham": r["text"], "hata": r["error"], "sn": r["seconds"]}
    parsed["kisitlar"] = [str(k) for k in parsed["kisitlar"]][:3]
    parsed.update({"ham": r["text"], "hata": r["error"], "sn": r["seconds"]})
    return parsed


# ---------------------------------------------------------------- 3. ÜRETİM + FLIP

def generate(model: str, task: str, constraints: list) -> dict:
    kisit_metni = ""
    if constraints:
        kisit_metni = "\n\nKısıtlar (hepsi birlikte geçerli):\n" + "\n".join(
            f"{i+1}. {k}" for i, k in enumerate(constraints)
        )
    prompt = f"Görev: {task}{kisit_metni}\n\nSomut, uygulanabilir bir çözüm üret (~150-250 kelime)."
    return ollama(model, prompt, temperature=0.7)


FLIP_FIND_SYSTEM = (
    "Verilen çözüm metnindeki EN TEMEL örtük varsayımı bul — çözümün üzerine kurulu "
    "olduğu, söylenmemiş taşıyıcı kabul. SADECE şu JSON ile yanıt ver:\n"
    '{"varsayim": "<varsayım, tek cümle>", "flip": "<bu varsayımın tersi, tek cümle>"}'
)


def flip_engine(model: str, task: str, base_answer: str) -> dict:
    # Adım 1: varsayımı bul
    r1 = ollama(model, f"Görev: {task}\n\nÇözüm:\n{base_answer}",
                system=FLIP_FIND_SYSTEM, temperature=0.4)
    parsed, perr = parse_json_block(r1["text"])
    if parsed is None or not parsed.get("flip"):
        return {"varsayim": f"[bulunamadı: {perr}]", "flip": "", "flip_cozum": "",
                "hata": r1["error"], "sn": r1["seconds"]}
    varsayim = str(parsed.get("varsayim", ""))
    flip = str(parsed.get("flip", ""))

    # Adım 2: çevrilmiş varsayımdan yeniden kur (H10: perturbe replay)
    prompt2 = (
        f"Görev: {task}\n\n"
        f"Orijinal çözümün dayandığı varsayım: {varsayim}\n"
        f"Şimdi bu varsayımı ÇEVİR: {flip}\n\n"
        f"Bu çevrilmiş varsayımdan hareketle çözümü YENİDEN kur: nasıl çalışır, "
        f"ne garanti eder, orijinalden ne farkı var? (~150-250 kelime)"
    )
    r2 = ollama(model, prompt2, temperature=0.7)
    return {"varsayim": varsayim, "flip": flip, "flip_cozum": r2["text"],
            "hata": r2["error"], "sn": round(r1["seconds"] + r2["seconds"], 1)}


# ---------------------------------------------------------------- 4. AYIK DEĞERLENDİRİCİ

EVAL_SYSTEM = (
    "Sen kör bir değerlendiricisin. Sana bir görev ve İKİ isimsiz çözüm (A ve B) "
    "verilecek. Hangisinin nasıl üretildiğini BİLMİYORSUN ve umursamıyorsun. "
    "Her ikisini şu iki eksende 1-5 arası puanla:\n"
    "N (yenilik): 1=herkesin ilk aklına gelen, 5=araştırma düzeyi beklenmedik bağlantı\n"
    "T (tutarlılık/uygulanabilirlik): 1=boşluklu ve çalışmaz, 5=eksiksiz ve test edilebilir\n"
    "Katı ol. Emin değilsen DÜŞÜK ver. SADECE şu JSON ile yanıt ver:\n"
    '{"A": {"N": <1-5>, "T": <1-5>, "gerekce": "<tek cümle>"}, '
    '"B": {"N": <1-5>, "T": <1-5>, "gerekce": "<tek cümle>"}, '
    '"tercih": "A" | "B", "tercih_gerekcesi": "<tek cümle>"}'
)


def sober_eval(eval_model: str, task: str, sol_a: str, sol_b: str) -> dict:
    prompt = (
        f"Görev: {task}\n\n=== Çözüm A ===\n{sol_a}\n\n=== Çözüm B ===\n{sol_b}"
    )
    r = ollama(eval_model, prompt, system=EVAL_SYSTEM, temperature=0.2)
    parsed, perr = parse_json_block(r["text"])
    if parsed is None:
        return {"A": None, "B": None, "tercih": None,
                "tercih_gerekcesi": f"[değerlendirilemedi: {perr}]",
                "ham": r["text"], "hata": r["error"], "sn": r["seconds"]}
    parsed.update({"ham": r["text"], "hata": r["error"], "sn": r["seconds"]})
    return parsed


# ---------------------------------------------------------------- 5. VAULT-İMZA

SIGNATURE_SYSTEM = (
    "Verilen çözümü vault imza formatına damıt. Fazlalık yasak — bark-audit kuralı: "
    "bir iddia, üç dayanak, dördüncüden sonrası gürültü. "
    "SADECE şu JSON ile yanıt ver:\n"
    '{"iddia": "<tek cümle ana iddia>", '
    '"dayanaklar": ["<1>", "<2>", "<3>"], '
    '"garanti": "<bu çözümün YAPISAL olarak garanti ettiği şey, tek cümle>", '
    '"umut": "<bu çözümün yalnızca UMDUĞU şey, tek cümle>", '
    '"alan": "<çözümün alanı, 1-3 kelime>"}'
)


def make_signature(model: str, task: str, solution: str) -> dict:
    r = ollama(model, f"Görev: {task}\n\nÇözüm:\n{solution}",
               system=SIGNATURE_SYSTEM, temperature=0.3)
    parsed, perr = parse_json_block(r["text"])
    if parsed is None:
        return {"iddia": f"[imza çıkarılamadı: {perr}]", "dayanaklar": [],
                "garanti": "", "umut": "", "alan": "",
                "ham": r["text"], "hata": r["error"], "sn": r["seconds"]}
    parsed.update({"ham": r["text"], "hata": r["error"], "sn": r["seconds"]})
    return parsed


def vault_recall(vault_path: Path, signature: dict, top_k: int = 3) -> list:
    """Embedding'siz geri çağırma: imza alanları üzerinden kelime-kesişim skoru.
    Yapısal eşleşmeye (garanti/umut) alan eşleşmesinden 2x ağırlık verir —
    MAC/FAC'ın ucuz birinci aşamasının imza-alanlı hali."""
    if not vault_path.exists():
        return []
    def toks(s):
        return set(w.lower().strip(".,;:!?()\"'") for w in str(s).split() if len(w) > 3)
    q_struct = toks(signature.get("garanti", "")) | toks(signature.get("umut", ""))
    q_topic = toks(signature.get("alan", "")) | toks(signature.get("iddia", ""))
    scored = []
    for line in vault_path.read_text(encoding="utf-8").splitlines():
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        sig = rec.get("imza", {})
        r_struct = toks(sig.get("garanti", "")) | toks(sig.get("umut", ""))
        r_topic = toks(sig.get("alan", "")) | toks(sig.get("iddia", ""))
        score = 2 * len(q_struct & r_struct) + len(q_topic & r_topic)
        if score > 0:
            scored.append((score, rec.get("gorev", "")[:80], sig.get("iddia", "")[:100]))
    scored.sort(reverse=True)
    return scored[:top_k]


# ---------------------------------------------------------------- RAPORLAMA

def append_jsonl(path: Path, obj: dict):
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def write_report(run_dir: Path, ts: str, ctx: dict) -> Path:
    """İnsan-okur markdown raporu. Her aşama, ham hatalar dahil, görünür."""
    p = run_dir / f"run_{ts}.md"
    L = []
    L.append(f"# LENS Koşu Raporu — {ts}")
    L.append(f"\nÜretici model: `{ctx['model']}` · Değerlendirici: `{ctx['eval_model']}`")
    L.append(f"Toplam süre: {ctx['toplam_sn']} sn\n")
    L.append(f"## Görev\n\n> {ctx['gorev']}\n")

    ng = ctx["hayir"]
    L.append(f"## 1. Hayır Kapısı — karar: **{ng['karar']}** ({ng['sn']} sn)")
    L.append(f"\nGerekçe: {ng['gerekce']}")
    if ng.get("revize_oneri"):
        L.append(f"\nRevize önerisi: {ng['revize_oneri']}")
    if ng.get("hata"):
        L.append(f"\n⚠ Hata: {ng['hata']}")
    L.append("")

    if ctx.get("durduruldu"):
        L.append("**Koşu burada durdu — görev reddedildi. Ret, rejections.jsonl'e işlendi (kimlik tortusu).**\n")
        p.write_text("\n".join(L), encoding="utf-8")
        return p

    cg = ctx["kisit"]
    L.append(f"## 2. Kısıt Kapısı ({cg['sn']} sn)\n")
    if cg["kisitlar"]:
        for i, k in enumerate(cg["kisitlar"], 1):
            L.append(f"{i}. {k}")
        L.append(f"\nUyum gerekçesi: {cg['uyum_gerekcesi']}")
    else:
        L.append(f"Kısıt türetilemedi — çıplak koşuldu. ({cg['uyum_gerekcesi']})")
    if cg.get("hata"):
        L.append(f"\n⚠ Hata: {cg['hata']}")
    L.append("")

    g = ctx["uretim"]
    L.append(f"## 3a. Temel Çözüm ({g['seconds']} sn, ~{g['tokens']} token)\n")
    L.append(g["text"] if g["text"] else f"⚠ BOŞ ÇIKTI — hata: {g['error']}")
    L.append("")

    fl = ctx["flip"]
    L.append(f"## 3b. Flip Motoru ({fl['sn']} sn)\n")
    L.append(f"Tespit edilen varsayım: **{fl['varsayim']}**")
    L.append(f"\nÇevrilmiş hali: **{fl['flip']}**\n")
    L.append("### Flip çözümü\n")
    L.append(fl["flip_cozum"] if fl["flip_cozum"] else "⚠ Flip çözümü üretilemedi.")
    if fl.get("hata"):
        L.append(f"\n⚠ Hata: {fl['hata']}")
    L.append("")

    ev = ctx["degerlendirme"]
    L.append(f"## 4. Ayık Değerlendirici ({ev['sn']} sn)")
    L.append("\n*(A = temel çözüm, B = flip çözümü — değerlendirici bunu bilmiyordu)*\n")
    if ev.get("A") and ev.get("B"):
        L.append("| Çözüm | N | T | Gerekçe |")
        L.append("|---|---|---|---|")
        L.append(f"| A (temel) | {ev['A'].get('N','?')} | {ev['A'].get('T','?')} | {ev['A'].get('gerekce','')} |")
        L.append(f"| B (flip)  | {ev['B'].get('N','?')} | {ev['B'].get('T','?')} | {ev['B'].get('gerekce','')} |")
        L.append(f"\nTercih: **{ev.get('tercih','?')}** — {ev.get('tercih_gerekcesi','')}")
    else:
        L.append(f"⚠ Değerlendirme alınamadı: {ev.get('tercih_gerekcesi','')}")
    if ev.get("hata"):
        L.append(f"\n⚠ Hata: {ev['hata']}")
    L.append("")

    sig = ctx["imza"]
    L.append(f"## 5. Vault-İmza ({sig['sn']} sn)\n")
    L.append(f"- **İddia:** {sig['iddia']}")
    for i, d in enumerate(sig.get("dayanaklar", []), 1):
        L.append(f"- Dayanak {i}: {d}")
    L.append(f"- **Garanti:** {sig.get('garanti','')}")
    L.append(f"- **Umut:** {sig.get('umut','')}")
    L.append(f"- Alan: {sig.get('alan','')}")
    L.append("")

    rec = ctx.get("gecmis_eslesmeler", [])
    L.append("## 6. Vault Geri Çağırma (yapısal eşleşme, embedding'siz)\n")
    if rec:
        for score, gorev, iddia in rec:
            L.append(f"- (skor {score}) **{gorev}** → {iddia}")
    else:
        L.append("Eşleşme yok (vault henüz boş ya da yapısal kesişim çıkmadı).")
    L.append("")

    L.append("---\n*LENS ilkesi: modelin yaptığını engelleme, eksiğini dışarıdan tamamla, "
             "yapamadığını taklit etme. Üretici kendi notunu yazamaz; boş çıktı sıfır değildir, "
             "işaretlenir.*")
    p.write_text("\n".join(L), encoding="utf-8")
    return p


# ---------------------------------------------------------------- ANA DÖNGÜ

def run(task: str, model: str, eval_model: str):
    RUNS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    t0 = time.time()
    ctx = {"gorev": task, "model": model, "eval_model": eval_model}

    print(f"[LENS] Görev alındı. Üretici: {model} · Değerlendirici: {eval_model}")

    # 1 — Hayır kapısı
    print("[1/6] Hayır kapısı...", flush=True)
    ng = no_gate(model, task)
    ctx["hayir"] = ng
    print(f"      karar: {ng['karar']} — {ng['gerekce']}")
    if ng["karar"] == "HAYIR":
        ctx["durduruldu"] = True
        ctx["toplam_sn"] = round(time.time() - t0, 1)
        append_jsonl(RUNS_DIR / "rejections.jsonl",
                     {"ts": ts, "gorev": task, "gerekce": ng["gerekce"]})
        rp = write_report(RUNS_DIR, ts, ctx)
        print(f"[LENS] Görev reddedildi. Rapor: {rp}")
        return
    if ng["karar"] == "REVIZE" and ng.get("revize_oneri"):
        print(f"      görev revize edildi → {ng['revize_oneri'][:100]}")
        task = ng["revize_oneri"]
        ctx["gorev"] = f"{ctx['gorev']}\n(revize: {task})"

    # 2 — Kısıt kapısı
    print("[2/6] Kısıt kapısı...", flush=True)
    cg = constraint_gate(model, task)
    ctx["kisit"] = cg
    for k in cg["kisitlar"]:
        print(f"      + {k[:110]}")

    # 3a — Temel üretim
    print("[3/6] Temel çözüm üretiliyor...", flush=True)
    g = generate(model, task, cg["kisitlar"])
    ctx["uretim"] = g
    if g["error"]:
        print(f"      ⚠ {g['error']}")

    # 3b — Flip
    print("[4/6] Flip motoru...", flush=True)
    fl = flip_engine(model, task, g["text"] or "(boş)")
    ctx["flip"] = fl
    print(f"      varsayım: {fl['varsayim'][:110]}")

    # 4 — Ayık değerlendirme
    print("[5/6] Ayık değerlendirici (kör)...", flush=True)
    ev = sober_eval(eval_model, task, g["text"] or "(boş)", fl["flip_cozum"] or "(boş)")
    ctx["degerlendirme"] = ev
    if ev.get("A") and ev.get("B"):
        print(f"      A: N={ev['A'].get('N')} T={ev['A'].get('T')} | "
              f"B: N={ev['B'].get('N')} T={ev['B'].get('T')} | tercih: {ev.get('tercih')}")

    # 5 — İmza + vault
    print("[6/6] Vault imzası...", flush=True)
    tercih_metin = fl["flip_cozum"] if ev.get("tercih") == "B" and fl["flip_cozum"] else g["text"]
    sig = make_signature(model, task, tercih_metin or "(boş)")
    ctx["imza"] = sig

    vault_path = RUNS_DIR / "vault.jsonl"
    ctx["gecmis_eslesmeler"] = vault_recall(vault_path, sig)
    append_jsonl(vault_path, {
        "ts": ts, "gorev": task, "imza": {k: sig.get(k, "") for k in
                                          ("iddia", "dayanaklar", "garanti", "umut", "alan")},
        "secilen": "flip" if (ev.get("tercih") == "B") else "temel",
        "skorlar": {"A": ev.get("A"), "B": ev.get("B")},
    })

    ctx["toplam_sn"] = round(time.time() - t0, 1)
    append_jsonl(RUNS_DIR / "runs.jsonl", {
        "ts": ts, "gorev": task[:120], "karar": ng["karar"],
        "kisit_sayisi": len(cg["kisitlar"]),
        "A": ev.get("A"), "B": ev.get("B"), "tercih": ev.get("tercih"),
        "toplam_sn": ctx["toplam_sn"],
        "bos_cikti": bool(g["error"]) or not fl["flip_cozum"],
    })

    rp = write_report(RUNS_DIR, ts, ctx)
    print(f"\n[LENS] Bitti ({ctx['toplam_sn']} sn). Rapor: {rp}")
    print(f"       Vault: {vault_path} · Koşu logu: {RUNS_DIR/'runs.jsonl'}")


def main():
    ap = argparse.ArgumentParser(description="LENS — mercek ilkesiyle minimal AI mimarisi")
    ap.add_argument("task", nargs="?", help="Görev metni")
    ap.add_argument("--task-file", help="Görevi dosyadan oku")
    ap.add_argument("--model", default="qwen2.5-coder:7b", help="Üretici Ollama modeli")
    ap.add_argument("--eval-model", default=None,
                    help="Değerlendirici model (varsayılan: üreticiyle aynı model, "
                         "ayrı rol — mümkünse FARKLI model kullan, tur-3 dersi)")
    args = ap.parse_args()

    if args.task_file:
        task = Path(args.task_file).read_text(encoding="utf-8").strip()
    elif args.task:
        task = args.task
    else:
        print("Görev ver: python lens.py \"...\"  ya da  --task-file gorev.txt")
        sys.exit(1)

    eval_model = args.eval_model or args.model
    if eval_model == args.model:
        print("[uyarı] Değerlendirici = üretici (aynı model, ayrı kör rol). "
              "N şişmesi riski tam sıfırlanmaz; mümkünse --eval-model ile farklı model ver.")
    run(task, args.model, eval_model)


if __name__ == "__main__":
    main()
