"""Senin makinende: python kos_butce.py   (Ollama ayakta olmalı)"""
from pathlib import Path
from butce_ab import kos, ollama_agent, GOREVLER

kisa = Path("kussu_v5.txt").read_text(encoding="utf-8")
r = kos(ollama_agent(), GOREVLER, kisa)
print(f"\nKISA prompt ({len(kisa)} krkt) uyum: {r['kisa']}")
print(f"UZUN prompt ({r['uzun_prompt_karakter']} krkt) uyum: {r['uzun']}")
print(f"fark: {r['fark']}\n-> {r['karar']}")
