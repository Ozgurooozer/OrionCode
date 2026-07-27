"""kos_butce_semantik.py -- Semantik metrikle bütce olcumu (1a v3)"""
from pathlib import Path
from butce_ab import kos, kalibrasyon_tavan, ollama_agent, GOREVLER
from butce_ab import uyum_skoru_semantik, ZORUNLU_SEMANTIK

MODEL = "qwen2.5:7b"
kisa = Path("kussu_v5.txt").read_text(encoding="utf-8")
agent = ollama_agent(model=MODEL)


def kos_semantik(agent, gorevler, kisa_prompt):
    """kos() benzeri ama semantik uyum skoru kullanir."""
    from butce_ab import DOLGU
    uzun_prompt = kisa_prompt + DOLGU

    def kol(p):
        return sum(uyum_skoru_semantik(agent(p, g))["skor"] for g in gorevler) / len(gorevler)

    kisa_s, uzun_s = kol(kisa_prompt), kol(uzun_prompt)
    fark = kisa_s - uzun_s
    if abs(fark) < 0.15:
        karar = "H0 (semantik): fark yok. Butce kurali gerceksiz."
    elif fark > 0:
        karar = f"H1 (semantik): uzun prompt uyumu {fark:.2f} dusuruyor."
    else:
        karar = "TERS: uzun prompt semantik uyumu artirdi."
    return {"kisa": round(kisa_s, 3), "uzun": round(uzun_s, 3),
            "fark": round(fark, 3), "karar": karar}


print(f"Model: {MODEL}")
print(f"Kisa prompt: {len(kisa)} karakter")

# Tavan kalibrasyonu (semantik metrikle)
print("\n=== Tavan kalibrasyonu (semantik metrik) ===")
# Manuel tavan: açık talimatla bir yanıt üret, semantik metrikle ölç
TAVAN_TALIMAT = (
    kisa
    + "\n\nBU GOREVDE MUTLAKA: (1) Alternatif bir yaklasim one sur, "
    "(2) Fark veya buyukluk belirt, (3) [TEST] veya [SEZGI] etiketi kullan, "
    "(4) 'karar degisti' veya 'degismedi' yaz, "
    "(5) 'en cok su yanliaslar' ile bitir."
)
tavan_yanit = agent(TAVAN_TALIMAT, GOREVLER[0])
tavan_s = uyum_skoru_semantik(tavan_yanit)
print(f"Tavan skoru (semantik): {tavan_s['skor']:.3f}")
print(f"Eksik: {tavan_s['eksik']}")
print(f"Gecerli (>=0.7): {tavan_s['skor'] >= 0.7}")

# Asil olcum
print(f"\n=== KISA vs UZUN (semantik, {len(GOREVLER)} gorev) ===")
print("Olcuyor...")
r = kos_semantik(agent, GOREVLER, kisa)
print(f"\nKISA semantik uyum: {r['kisa']:.3f}")
print(f"UZUN semantik uyum: {r['uzun']:.3f}")
print(f"Fark              : {r['fark']:.3f}")
print(f"Karar             : {r['karar']}")
print(f"\nDurum: {'[TEST] okunabilir' if tavan_s['skor'] >= 0.7 else '[ZAYIF] tavan hala dusuk'}")
