"""quick_test.py — test_corpus.jsonl ile N koşu MC testi."""
import json, http.client, pathlib, sys, re

SCRIPT_DIR = pathlib.Path(__file__).parent

# Meissa system prompt'u meissa.ts'ten çek
_ts = (SCRIPT_DIR.parent.parent.parent / "core" / "agents" / "meissa.ts").read_text("utf-8")
_m  = re.search(r"const SYSTEM_PROMPT = `(.+?)`;", _ts, re.DOTALL)
SYS = _m.group(1) if _m else "Sen Meissa siniflandiricisin. YALNIZCA JSON don."

def is_json(raw: str) -> bool:
    s = raw.find("{")
    if s == -1:
        return False
    depth, in_str, esc = 0, False, False
    for ch in raw[s:]:
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
    return False

def call(msg: str) -> str:
    body = json.dumps({
        "model":    "qwen-coder:latest",
        "messages": [
            {"role": "system", "content": SYS},
            {"role": "user",   "content": msg},
        ],
        "stream":  False,
        "options": {"num_ctx": 2048, "temperature": 0.7},
    }).encode()
    c = http.client.HTTPConnection("localhost", 11434, timeout=15)
    c.request("POST", "/api/chat", body=body,
               headers={"Content-Type": "application/json",
                        "Content-Length": str(len(body))})
    r = c.getresponse()
    return json.loads(r.read()).get("message", {}).get("content", "")

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5
corpus = SCRIPT_DIR / "test_corpus.jsonl"
entries = [json.loads(l) for l in corpus.read_text("utf-8").splitlines() if l.strip()]

print(f"Model: qwen-coder:latest  N={N} kosus/girdi  Girdiler={len(entries)}")
print("=" * 60)

results = []
for e in entries:
    msg, exp = e["input"], e["label"]
    hits = 0
    sys.stdout.write(f"\n[{exp:5}] '{msg[:35]}'  ")
    sys.stdout.flush()
    for _ in range(N):
        raw = call(msg)
        ok  = is_json(raw)
        if ok:
            hits += 1
        sys.stdout.write("J" if ok else "D")
        sys.stdout.flush()
    dr = (N - hits) / N
    mark = "DOGRU" if (exp == "drift" and dr > 0.3) or (exp == "json" and dr <= 0.3) else "YANLIS"
    print(f"  drift={dr:.2f}  {mark}")
    results.append({"input": msg, "expected": exp, "drift_rate": dr, "match": mark == "DOGRU"})

print()
drift_a = [r["drift_rate"] for r in results if r["expected"] == "drift"]
drift_c = [r["drift_rate"] for r in results if r["expected"] == "json"]
if drift_a and drift_c:
    mean_a = sum(drift_a) / len(drift_a)
    mean_c = sum(drift_c) / len(drift_c)
    delta  = mean_a - mean_c
    print(f"Grup A ort. drift: {mean_a:.2f}   Kontrol ort.: {mean_c:.2f}   delta={delta:.2f}")
    verdict = "HIPOTEZ DESTEKLENIYOR" if delta > 0.3 else "BELIRSIZ" if delta > 0.1 else "SAF STOKASTIK"
    print(f"Yorum: {verdict}")
