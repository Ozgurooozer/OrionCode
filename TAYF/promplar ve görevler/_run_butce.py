"""kos_butce.py -- kalibrasyon ONCE, olcum SONRA (qwen2.5:7b)"""
from pathlib import Path
from butce_ab import kos, kalibrasyon_tavan, ollama_agent, GOREVLER

MODEL = "qwen2.5:7b"
kisa = Path("kussu_v5.txt").read_text(encoding="utf-8")
agent = ollama_agent(model=MODEL)

print(f"Model: {MODEL}")
print(f"Kisa prompt: {len(kisa)} karakter")

# --- 1. ADIM: Alet kalibrasyonu ---
print("\n=== ADIM 1: Tavan kalibrasyonu ===")
kal = kalibrasyon_tavan(agent, GOREVLER[0], kisa)
print(f"Tavan skoru: {kal['tavan_skoru']:.3f}")
print(f"Gecerli (>=0.7): {kal['gecerli']}")
if kal["uyari"]:
    print(f"UYARI: {kal['uyari']}")

# --- 2. ADIM: Asil olcum ---
print(f"\n=== ADIM 2: KISA vs UZUN olcumu ({len(GOREVLER)} gorev) ===")
print("Olcuyor...")
r = kos(agent, GOREVLER, kisa)
print(f"\nKISA prompt uyum : {r['kisa']:.3f}")
print(f"UZUN prompt uyum : {r['uzun']:.3f}  ({r['uzun_prompt_karakter']} krkt)")
print(f"Fark             : {r['fark']:.3f}")
print(f"Karar            : {r['karar']}")

# --- Sonuc etiketi ---
if not kal["gecerli"]:
    print("\n[ZAYIF-OLCUM]: Tavan dusuk, sonuc guvenilir degil.")
    print("  -> Meta kural 1 icin: 'olculdii ama alet zayif' olarak isaretlenmeli.")
else:
    print("\n[TEST]: Tavan gecerli, sonuc okunabilir.")
