"""
tayf_baslat — TAYF multi-agent terminal baslatici.

KULLANIM:
  python tayf_baslat.py             # 2 ajan (A + B)
  python tayf_baslat.py --ajan 3   # 3 ajan (A + B + C)
  python tayf_baslat.py --liste    # mevcut ajan durumunu goster

Her ajan:
  - Kendi terminal penceresinde baslar (cmd /k)
  - Ortak .tayf/kanal.jsonl kanalini paylasir
  - Rol ID'si otomatik atanir (A, B, C ...)

Relay (TERMINAL) onceden baslatilmamissa otomatik baslar.
"""
from __future__ import annotations

import argparse
import io
import os
import subprocess
import sys
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

_TAYF_DIR = Path(__file__).parent
_KANAL = _TAYF_DIR / ".tayf" / "kanal.jsonl"
_RELAY_PID = _TAYF_DIR / ".tayf" / "relay.pid"

_AJAN_IDLER = list("ABCDEFGHIJ")


def _pid_alive(pid: int) -> bool:
    r = subprocess.run(
        f'tasklist /FI "PID eq {pid}" /NH',
        shell=True, capture_output=True, text=True,
    )
    return str(pid) in r.stdout


def _relay_calisiyor() -> bool:
    if not _RELAY_PID.exists():
        return False
    try:
        pid = int(_RELAY_PID.read_text().strip())
        return _pid_alive(pid)
    except (ValueError, OSError):
        return False


def _relay_baslat() -> None:
    """Relay'i yeni bir cmd penceresinde baslatir."""
    cmd = (
        f'start "TAYF Terminal — Relay" cmd /k '
        f'"chcp 65001 > nul && cd /d {_TAYF_DIR} && '
        f'python tayf_terminal.py .tayf\\kanal.jsonl"'
    )
    subprocess.Popen(cmd, shell=True)
    print("[RELAY] Baslatiliyor...", flush=True)
    # Relay'in PID dosyasini yazmasini bekle
    for _ in range(30):
        time.sleep(0.3)
        if _relay_calisiyor():
            pid = int(_RELAY_PID.read_text().strip())
            print(f"[RELAY] Hazir (PID {pid})")
            return
    print("[RELAY] UYARI: PID dosyasi yazilmadi, relay henuz hazir olmayabilir.")


_ROL_PROMPTLARI = {
    "A": (
        "Sen TAYF Ajan A — Planlayici/Tasarimci rolundesin. "
        "Mimari kararlari ver, iki aday uret, dugman testini tanimla. "
        "B'ye somut GOREV gonder (tayf_iletisim.py yaz B A GOREV). "
        "B'nin CEVAP'ini degerlendir: [TEST] kaniti yok ise ITIRAZ yaz. "
        "vault_arac.py ile C:\\\\vault'u ara/oku — karar verilmeden once vault'ta bu konuyu ara. "
        "KUS-SU: her iddia [TEST] veya [SEZGI] etiketli, [OLCULMEDI] kabul edilmez."
    ),
    "B": (
        "Sen TAYF Ajan B — Uygulayici/Olcumleyici rolundesin. "
        "A'dan gelen GOREV'i al (tayf_iletisim.py bekle B). "
        "Uygula, test yaz, kos, [TEST] kaniti uret. "
        "Cevabi A'ya gonder (tayf_iletisim.py yaz B A CEVAP --kanit [TEST] --dayanak mXXXX). "
        "A'nin tasariminda hata gorursen ITIRAZ yaz — sadece nazikce kabul etme. "
        "vault_arac.py ile vault'a sonuclari yaz (forum/orion0fis/toplantilar/ altina). "
        "KUS-SU: calistirilmamis test [YAZILDI-KOSULMADI], sadece gecen test [TEST]."
    ),
}


_SKILL_YOL = Path.home() / ".claude" / "skills" / "tayf-agent" / "SKILL.md"


def _ajan_baslat(ajan_id: str, gorev: str | None = None, cc_mod: bool = False) -> None:
    """
    Bir ajanı yeni cmd penceresinde başlatır.
    cc_mod=False → tayf_ajan_otonom.py (headless LLM loop)
    cc_mod=True  → claude (CC oturumu, tayf-agent skill ile)
    """
    if cc_mod:
        _ajan_baslat_cc(ajan_id, gorev)
    else:
        _ajan_baslat_otonom(ajan_id, gorev)


def _ajan_baslat_otonom(ajan_id: str, gorev: str | None = None) -> None:
    """Headless LLM loop — claude CLI'ye ihtiyaç duymaz."""
    if gorev:
        gorev_dosya = _TAYF_DIR / ".tayf" / f"ajan_{ajan_id}_gorev.txt"
        gorev_dosya.parent.mkdir(exist_ok=True)
        gorev_dosya.write_text(gorev, encoding="utf-8")
        mod_arg = f'--gorev-dosya "{gorev_dosya}"'
    else:
        mod_arg = "--bekle --max-tur 50"

    cmd = (
        f'start "TAYF Ajan {ajan_id} [otonom]" cmd /k '
        f'"chcp 65001 > nul && cd /d {_TAYF_DIR} && '
        f'python tayf_ajan_otonom.py {ajan_id} {mod_arg}"'
    )
    subprocess.Popen(cmd, shell=True)
    print(f"[AJAN {ajan_id}] Otonom terminal aciliyor...")


def _ajan_baslat_cc(ajan_id: str, gorev: str | None = None) -> None:
    """
    Claude Code oturumu olarak başlatır — tam araç seti (Read/Edit/Bash).
    Skill içeriğini init prompt'a gömer; /tayf-agent'ı beklemez.
    """
    skill_icerik = (
        _SKILL_YOL.read_text(encoding="utf-8")
        if _SKILL_YOL.exists()
        else "# TAYF Agent\nKanal: python tayf_iletisim.py oku/yaz/bekle"
    )

    gorev_blok = f"\n\nİlk görev: {gorev}" if gorev else "\nKanala bağlan, mesaj bekle."
    init = (
        f"TAYF_AJAN_ID={ajan_id}\n\n"
        f"{skill_icerik}"
        f"{gorev_blok}\n\n"
        "Şimdi başla: kanal durumunu oku, rolüne göre hareket et."
    )

    init_dosya = _TAYF_DIR / ".tayf" / f"ajan_{ajan_id}_cc_init.txt"
    init_dosya.parent.mkdir(exist_ok=True)
    init_dosya.write_text(init, encoding="utf-8")

    # claude -p → tek yanıt (headless); claude → interaktif oturum
    # İnteraktif oturum daha güçlü: multi-turn, araç döngüsü, kullanıcı müdahalesi
    cmd = (
        f'start "TAYF Ajan {ajan_id} [CC]" cmd /k '
        f'"chcp 65001 > nul && cd /d {_TAYF_DIR} && '
        f'set TAYF_AJAN_ID={ajan_id} && '
        f'claude -p \"@{init_dosya}\""'
    )
    subprocess.Popen(cmd, shell=True)
    print(f"[AJAN {ajan_id}] Claude Code terminal aciliyor (CC mod)...")


def liste() -> None:
    """Kanal son 20 mesajini goster."""
    if not _KANAL.exists():
        print("Kanal bos.")
        return
    import json
    satirlar = _KANAL.read_text(encoding="utf-8").splitlines()
    for sat in satirlar[-20:]:
        try:
            m = json.loads(sat)
            print(f"[m{m['seq']:04d}] {m['kimden']:8s}->{m['kime']:8s} [{m['tur']:12s}] {str(m.get('kanit',''))[:12]:12s} {m['govde'][:60]}")
        except Exception:
            pass
    print(f"\nToplam: {len(satirlar)} mesaj")


def main() -> None:
    p = argparse.ArgumentParser(description="TAYF multi-agent baslatici")
    p.add_argument("--ajan", type=int, default=2, help="Ajan sayisi (varsayilan: 2)")
    p.add_argument("--liste", action="store_true", help="Kanal durumunu goster")
    p.add_argument("--relay-atla", action="store_true", help="Relay baslatma")
    p.add_argument(
        "--mod", choices=["otonom", "cc"], default="otonom",
        help="otonom: headless LLM loop | cc: Claude Code oturumu (varsayilan: otonom)",
    )
    args = p.parse_args()

    if args.liste:
        liste()
        return

    # Dizinleri hazirla
    (_TAYF_DIR / ".tayf").mkdir(exist_ok=True)
    _KANAL.touch(exist_ok=True)

    # Relay
    if not args.relay_atla:
        if _relay_calisiyor():
            pid = int(_RELAY_PID.read_text().strip())
            print(f"[RELAY] Zaten calisiyor (PID {pid})")
        else:
            _relay_baslat()
            time.sleep(1.0)  # Relay hazir olsun

    # Ajanlar
    cc_mod = args.mod == "cc"
    n = min(args.ajan, len(_AJAN_IDLER))
    for i in range(n):
        _ajan_baslat(_AJAN_IDLER[i], cc_mod=cc_mod)
        time.sleep(0.5)

    mod_etiket = "CC oturumu" if cc_mod else "headless LLM"
    print(f"\n[HAZIR] {n} ajan baslatildi ({mod_etiket}): {', '.join(_AJAN_IDLER[:n])}")
    print(f"Kanal: {_KANAL}")
    print("Izle: python tayf+0/izle.py .tayf/kanal.jsonl")


if __name__ == "__main__":
    main()
