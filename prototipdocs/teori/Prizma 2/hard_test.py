"""hard_test.py — Yuksek temperature ile bilinen tetikleyicileri dene."""
import json, http.client, re, pathlib, sys

SCRIPT_DIR = pathlib.Path(__file__).parent
ts = (SCRIPT_DIR / ".." / ".." / ".." / "core" / "agents" / "meissa.ts").read_text("utf-8")
m  = re.search(r"const SYSTEM_PROMPT = `(.+?)`;", ts, re.DOTALL)
SYS = m.group(1)

TEMP = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9
N    = int(sys.argv[2])   if len(sys.argv) > 2 else 8

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
        "options": {"num_ctx": 2048, "temperature": TEMP},
    }).encode()
    c = http.client.HTTPConnection("localhost", 11434, timeout=15)
    c.request("POST", "/api/chat", body=body,
               headers={"Content-Type": "application/json",
                        "Content-Length": str(len(body))})
    r = c.getresponse()
    return json.loads(r.read()).get("message", {}).get("content", "")

TESTS = [
    # Plan §1: ikili davranisli altin girdi
    ("async await ornegi",          "drift?"),
    ("SQL JOIN acikla",             "drift?"),
    # Teknik soru / ogret beni
    ("Python ogretir misin bana",   "drift?"),
    ("threadsafe misin",            "drift?"),
    ("ne yapabilirsin",             "drift?"),
    # Sosyal
    ("nasil gidiyor",               "drift?"),
    ("eyvallah",                    "drift?"),
    # Kontrol
    ("bir cyberpunk kiz ciz",       "json"),
    ("bug nerede olabilir",         "json"),
    ("kodu analiz et: x = 1+1",    "json"),
]

print(f"Model: qwen-coder:latest  temp={TEMP}  N={N}")
print("=" * 60)
all_dr_drift = []
all_dr_json  = []

for msg, exp in TESTS:
    hits = 0
    last_raw = ""
    sys.stdout.write(f"  [{exp:6}] '{msg[:28]}'  ")
    sys.stdout.flush()
    for _ in range(N):
        raw = call(msg)
        last_raw = raw
        ok = is_json(raw)
        if ok:
            hits += 1
        sys.stdout.write("J" if ok else "D")
        sys.stdout.flush()
    dr = (N - hits) / N
    print(f"  drift={dr:.2f}  ex:{repr(last_raw[:50])}")
    if exp == "drift?":
        all_dr_drift.append(dr)
    else:
        all_dr_json.append(dr)

if all_dr_drift and all_dr_json:
    ma = sum(all_dr_drift) / len(all_dr_drift)
    mc = sum(all_dr_json)  / len(all_dr_json)
    delta = ma - mc
    print(f"\nGrup-A ort={ma:.2f}  Kontrol ort={mc:.2f}  delta={delta:.2f}")
    if delta > 0.25:
        print("=> HIPOTEZ DESTEKLENIYOR: giridiye-bagli drift")
    elif delta > 0.1:
        print("=> ZAYIF KANIT: daha fazla kosus gerekli")
    else:
        print("=> SAF STOKASTIK: giridiye gore fark yok")
