"""eval_fail_test.py — 5 eval başarısız girdiyi level0 ve LLM ile test et."""
import json, http.client, re, pathlib, sys

SCRIPT_DIR = pathlib.Path(__file__).parent
ts = (SCRIPT_DIR / ".." / ".." / ".." / "core" / "agents" / "meissa.ts").read_text("utf-8")
m  = re.search(r"const SYSTEM_PROMPT = `(.+?)`;", ts, re.DOTALL)
SYS = m.group(1)

EVAL_FAILURES = [
    "bu metni seslendir: Merhaba Dünya",
    "speak this: hello world",
    "kod review yap, bug bul, düzelt, test yaz, PR aç",
    "animasyon oluştur ve kaydet",
    "bir karakter çiz ve ardından seslendir",
]

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

def call(msg: str, temp: float = 0.7) -> str:
    body = json.dumps({
        "model":    "qwen-coder:latest",
        "messages": [
            {"role": "system", "content": SYS},
            {"role": "user",   "content": msg},
        ],
        "stream":  False,
        "options": {"num_ctx": 2048, "temperature": temp},
    }).encode()
    c = http.client.HTTPConnection("localhost", 11434, timeout=15)
    c.request("POST", "/api/chat", body=body,
               headers={"Content-Type": "application/json",
                        "Content-Length": str(len(body))})
    r = c.getresponse()
    return json.loads(r.read()).get("message", {}).get("content", "")

N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
print(f"Eval başarısız girdiler — qwen-coder:latest  N={N}\n{'='*60}")

for msg in EVAL_FAILURES:
    hits = 0
    last_raw = ""
    sys.stdout.write(f"  '{msg[:45]}'  ")
    sys.stdout.flush()
    for _ in range(N):
        raw = call(msg, temp=0.7)
        last_raw = raw
        if is_json(raw):
            hits += 1
        sys.stdout.write("J" if is_json(raw) else "D")
        sys.stdout.flush()
    dr = (N - hits) / N
    print(f"  drift={dr:.2f}")
    if dr > 0:
        print(f"    D ex: {repr(last_raw[:80])}")

print()
print("Not: D (drift) = LLM JSON uretemiyor")
print("     J (json)  = gecerli JSON uretildi")
