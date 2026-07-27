"""
probe_mc.py — Monte Carlo drift oranı tahmini (Ollama üzerinden).

Her girdi için N=10 koşu çalıştır.
Çıktı { başına bakılır: JSON mu, yoksa doğal dil mi?
Hangi girdiler drift oluyor, hangisi tutarlı JSON üretiyor — ölçülür.

Bu "B şıkkı"nın Monte Carlo varyantı:
  Aktivasyon yok, ama hipotezi (koşullu stokastiklik) doğrudan test eder.
  "async await örneği" gibi ikili-davranışlı girdiler hemen seçilebilir.

Çıktı: probe_mc_results.jsonl
"""

import json
import http.client
import time
import pathlib
import sys
import os
import re

# ── Yollar ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = pathlib.Path(__file__).parent

# ── Meissa system prompt — canlı olarak meissa.ts'ten oku ───────────────────────

def _load_system_prompt() -> str:
    ts_path = SCRIPT_DIR / ".." / ".." / ".." / "core" / "agents" / "meissa.ts"
    ts = ts_path.read_text("utf-8")
    m = re.search(r"const SYSTEM_PROMPT = `(.+?)`;", ts, re.DOTALL)
    if not m:
        raise RuntimeError("meissa.ts içinde SYSTEM_PROMPT bulunamadı")
    return m.group(1)

SYSTEM_PROMPT = _load_system_prompt()

MODEL    = "qwen-coder:latest"
HOST     = "localhost"
PORT     = 11434
TIMEOUT  = 15

# ── JSON testi — meissa._extractJson'ın sade versiyonu ───────────────────────

def _is_json_output(raw: str) -> bool:
    """raw çıktı geçerli bir JSON bloğuyla başlıyor mu?"""
    start = raw.find("{")
    if start == -1:
        return False
    depth = 0
    in_str = False
    esc = False
    for ch in raw[start:]:
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return True
    # Başlamış ama kapanmamış → kesik JSON → GrupA
    return False

# ── Ollama tek çağrı ──────────────────────────────────────────────────────────

def _ollama_call(user_msg: str) -> str:
    body = json.dumps({
        "model":    MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        "stream":  False,
        "options": {"num_ctx": 4096, "temperature": 0.7},
    }).encode()

    conn = http.client.HTTPConnection(HOST, PORT, timeout=TIMEOUT)
    try:
        conn.request("POST", "/api/chat",
                     body=body,
                     headers={"Content-Type": "application/json",
                               "Content-Length": str(len(body))})
        resp = conn.getresponse()
        raw_bytes = resp.read()
        data = json.loads(raw_bytes)
        return data.get("message", {}).get("content", "")
    except Exception as e:
        return f"ERROR:{e}"
    finally:
        conn.close()

# ── MC probe ──────────────────────────────────────────────────────────────────

def probe_input(user_msg: str, n: int = 10) -> dict:
    json_runs = []
    drift_runs = []
    raw_outputs = []

    for i in range(n):
        raw = _ollama_call(user_msg)
        ok  = _is_json_output(raw)
        raw_outputs.append(raw[:120])
        if ok:
            json_runs.append(raw)
        else:
            drift_runs.append(raw)

        status = "✓" if ok else "✗"
        print(f"    [{i+1:2d}/{n}] {status}  {raw[:60].replace(chr(10), ' ')}")

    drift_rate = len(drift_runs) / n
    return {
        "input":       user_msg,
        "n":           n,
        "json_count":  len(json_runs),
        "drift_count": len(drift_runs),
        "drift_rate":  round(drift_rate, 3),
        "raw_sample":  raw_outputs[:3],
    }

# ── Ana akış ──────────────────────────────────────────────────────────────────

def main():
    n_runs = int(sys.argv[1]) if len(sys.argv) > 1 else 10

    corpus_file = SCRIPT_DIR / "full_corpus.jsonl"
    if not corpus_file.exists():
        print("[probe_mc] Corpus bulunamadı. Önce: python corpus.py")
        sys.exit(1)

    entries = []
    with open(corpus_file, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))

    print(f"[probe_mc] Model: {MODEL}  N={n_runs}  Girdiler={len(entries)}")
    print("=" * 60)

    out_file = SCRIPT_DIR / "probe_mc_results.jsonl"
    results  = []

    with open(out_file, "w", encoding="utf-8") as out:
        for idx, entry in enumerate(entries, 1):
            msg      = entry["input"]
            expected = entry.get("label", "?")
            note     = entry.get("note", "")

            print(f"\n[{idx:2d}/{len(entries)}] '{msg}'  (beklenen: {expected}, not: {note})")
            t0 = time.time()
            r  = probe_input(msg, n=n_runs)
            elapsed = time.time() - t0

            r["expected_label"] = expected
            r["note"]           = note
            r["source"]         = entry.get("source", "?")
            r["elapsed_s"]      = round(elapsed, 1)

            results.append(r)
            out.write(json.dumps(r, ensure_ascii=False) + "\n")
            out.flush()

            mark = "UYUŞTU" if (
                (expected == "drift" and r["drift_rate"] > 0.3) or
                (expected == "json"  and r["drift_rate"] < 0.3)
            ) else "FARKLI"
            print(f"    → drift_rate={r['drift_rate']:.2f}  {mark}  ({elapsed:.1f}s)")

    print(f"\n{'='*60}")
    print(f"[probe_mc] Tamamlandı → {out_file}")
    print(f"\nSonraki adım: python analyze.py")

if __name__ == "__main__":
    main()
