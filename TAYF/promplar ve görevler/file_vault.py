"""
file_vault.py -- Orion gercek vault'una baglanan FileVault.

TASARIM (iki aday):
  A) BeautifulSoup ile HTML parse.
  B) stdlib re ile basit tag strip.
  -> A: bağımlılık gerektirir. B: stdlib yeterli, yanlış HTML'de regex baskı altında
  kalır ama Orion vault HTML'si makine üretimi ve tutarlı.
  -> B seçildi: sıfır bağımlılık, Orion'un format değişince düzeltilebilir.

DEGISMEZ: anchored SAKLANMAZ (Vault base sınıfı koruyor).
           FileVault._load() anchored'ı ASLA dosyadan okumaz.

ARAYÜZ:
  FileVault(root: Path) -> Vault
    .yazma araçları: base Vault ile aynı (write_episode, write_semantic, vb.)
    .okuma araçları: base Vault ile aynı
    ._load(): root altındaki *.html dosyaları episod olarak yükler

  orion_vault() -> FileVault:
      ~/.orion/vault/ dizinini kullanır

# ASSUMPTION(html-format): Orion vault dosyaları <article> veya <div> içine
# sarılmış düz metin içerir. Çok katmanlı CSS/JS yoktur; regex strip yeterli.
"""
from __future__ import annotations

import html as html_module
import re
from dataclasses import dataclass, field
from pathlib import Path

from vault import Vault, Retrieved

_TAG = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    """HTML tag ve entity'lerini temizle, düz metin döndür."""
    text = _TAG.sub(" ", text)
    text = html_module.unescape(text)
    return " ".join(text.split())


@dataclass
class FileVault(Vault):
    _root: Path = field(default_factory=lambda: Path.home() / ".orion" / "vault")

    def __post_init__(self) -> None:
        self._load()

    def _load(self) -> None:
        """Dizindeki *.html dosyalarını episodik katmana yükle."""
        if not self._root.exists():
            return
        for f in sorted(self._root.glob("*.html")):
            ep_id = f.stem
            if ep_id in self._episodes:
                continue   # zaten yüklü
            try:
                raw = f.read_text(encoding="utf-8", errors="replace")
                text = _strip_html(raw)
                if text.strip():
                    self._episodes[ep_id] = text
            except OSError:
                pass   # okunamayan dosya sessizce atlanır

    def yenile(self) -> int:
        """Dizini yeniden tara, yeni dosyaları ekle. Kaç yeni episod yüklendi döner."""
        onceki = len(self._episodes)
        self._load()
        return len(self._episodes) - onceki


def orion_vault(orion_home: Path | None = None) -> "FileVault":
    root = (orion_home or Path.home() / ".orion") / "vault"
    return FileVault(_root=root)
