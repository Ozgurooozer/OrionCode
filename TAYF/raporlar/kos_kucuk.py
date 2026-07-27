"""FunctionGemma DOĞRULUK ÖLÇÜMÜ — 6 ajan kurmadan ÖNCE bu koşulur.
python kos_kucuk.py   (ollama pull hf.co/unsloth/functiongemma-270m-it-GGUF)

Cevabı BİLİNEN 12 görev. Ölçülen: doğru araç seçimi + geçerli argüman.
Alet önce kalibre edilir: doğruluk düşükse mimari değil MODEL yetersizdir.
"""
import json, urllib.request
from arac import Arac, Katalog
from kucuk_ajan import KucukAjan

MODEL = "hf.co/unsloth/functiongemma-270m-it-GGUF"
WF = {"portre_v2", "upscale_v1", "inpaint_v3"}

def uretici(prompt):
    p = {"model": MODEL, "stream": False, "format": "json",
         "options": {"temperature": 0},
         "messages": [{"role": "user", "content": prompt}]}
    r = urllib.request.Request("http://localhost:11434/api/chat",
        data=json.dumps(p).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read())["message"]["content"]

k = Katalog()
k.kayit(Arac("comfy_calistir", "ComfyUI workflow kuyruğa al",
             {"workflow": str, "adet": int}, ("workflow",), "geri_alinabilir",
             lambda workflow, adet=1: f"{workflow} x{adet}",
             lambda a: (a["workflow"] in WF, f"tanımsız: {a['workflow']}")))
k.kayit(Arac("durum", "kuyruk durumunu oku", {}, (), "bak", lambda: "3 iş"))
k.kayit(Arac("iptal", "kuyruktaki işi iptal et", {"is_id": str}, ("is_id",),
             "geri_alinabilir", lambda is_id: f"{is_id} iptal"))

# (görev, beklenen araç)
VAKA = [
    ("2 tane portre üret", "comfy_calistir"),
    ("portre_v2 workflow'unu çalıştır", "comfy_calistir"),
    ("upscale_v1 ile 5 iş kuyruğa al", "comfy_calistir"),
    ("inpaint_v3 başlat", "comfy_calistir"),
    ("kuyrukta kaç iş var", "durum"),
    ("durumu göster", "durum"),
    ("şu an ne oluyor", "durum"),
    ("job_17'yi iptal et", "iptal"),
    ("job_03 işini durdur", "iptal"),
    ("sıradaki işi iptal et: job_99", "iptal"),
    ("bir portre daha", "comfy_calistir"),
    ("kuyruğu kontrol et", "durum"),
]

a = KucukAjan(k, uretici)
dogru_arac = gecerli = 0
for gorev, beklenen in VAKA:
    s = a.calis(gorev)
    da = s.arac == beklenen
    dogru_arac += da
    gecerli += s.calisti
    print(f"{'OK' if da else 'XX'} {gorev[:34]:36s} -> {s.arac} "
          f"{s.kanit} {s.sebep[:30]}")

n = len(VAKA)
print(f"\ndoğru araç seçimi : {dogru_arac}/{n} = {dogru_arac/n:.0%}")
print(f"geçerli çalıştırma: {gecerli}/{n} = {gecerli/n:.0%}")
print("""
OKUMA KILAVUZU
  <%70 doğru araç  -> FunctionGemma bu iş için yetersiz. Mimariyi suçlama,
                      modeli değiştir (SmolLM2-360M ya da qwen2.5:1.5b dene).
  >%90 doğru araç, düşük geçerli -> sorun ARGÜMAN üretimi. Şemayı daralt,
                      zorunlu alan sayısını azalt, few-shot ekle.
  ikisi de yüksek -> 6 ajana ölçeklemeye HAZIR.
""")
