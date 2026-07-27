"""
surucu — üretici arka uç soyutlama katmanı.

TASARIM (iki aday):
  A) Her çağrı yeni HTTP bağlantısı açar.
  B) urllib ile connection-per-call (stdlib, bağımlılık yok).
  -> A'da "connection pool" ekleme isteği kaçınılmaz ama 7B local model
     için gereksiz (tek istemci). B seçildi: stdlib yeter, sıfır bağımlılık.

# ASSUMPTION(single-client): surucu tek istemci kullanır. Paralel çağrı varsa
# her çağrı kendi bağlantısını açar; pool yoktur. Sorun değil: Ollama seri işler.

ARAYÜZ:
  Surucu(model, url, timeout) -> üretici nesne
    .uret(sistem: str, mesaj: str, sicaklik: float) -> str
      raises RuntimeError: ağ hatası / model hatası
  varsayilan() -> Surucu   # Ollama localhost, qwen2.5:7b
"""
from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass


@dataclass
class Surucu:
    model: str
    url: str
    timeout: int = 300

    def uret(self, sistem: str, mesaj: str, sicaklik: float = 0.0) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "options": {"temperature": sicaklik},
            "messages": [
                {"role": "system", "content": sistem},
                {"role": "user",   "content": mesaj},
            ],
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            self.url, data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read())
                return body["message"]["content"]
        except Exception as exc:
            raise RuntimeError(f"surucu hatası [{self.model}]: {exc}") from exc


def varsayilan(model: str = "qwen2.5:7b") -> Surucu:
    return Surucu(model=model, url="http://localhost:11434/api/chat")
