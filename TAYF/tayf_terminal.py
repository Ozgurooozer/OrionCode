"""
tayf_terminal — Paylaşımlı terminal relay. Singleton (tek instance).

KULLANIM:
  python tayf_terminal.py            # .tayf/kanal.jsonl varsayılan
  python tayf_terminal.py --reset    # eski PID dosyasını temizle ve başla

Ajan A/B → GOREV(kime=TERMINAL) → relay çalıştırır → RAPOR yazar
"""
from __future__ import annotations

import argparse
import atexit
import io
import os
import subprocess
import sys
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_ROOT = Path(__file__).parent / "tayf+0"
sys.path.insert(0, str(_ROOT))
from kanal import Kanal, Mesaj  # noqa: E402
sys.path.insert(0, str(_ROOT))
from tiyatro import TiyatroAlgilayici  # noqa: E402

RELAY         = "TERMINAL"
POLL          = 0.3
TIYATRO_ARALIK = 20   # her N mesajda bir tiyatro kontrolü


# ── Singleton ──────────────────────────────────────────────────────────────

def _pid_alive(pid: int) -> bool:
    """Windows'ta PID canlı mı?"""
    r = subprocess.run(
        f'tasklist /FI "PID eq {pid}" /NH',
        shell=True, capture_output=True, text=True
    )
    return str(pid) in r.stdout


def _singleton(pid_file: Path, reset: bool) -> None:
    if pid_file.exists() and not reset:
        try:
            pid = int(pid_file.read_text().strip())
            if _pid_alive(pid):
                print(f"Relay zaten calisiyor (PID {pid}). --reset ile zorla baslatabilirsin.")
                sys.exit(0)
        except ValueError:
            pass
    pid_file.write_text(str(os.getpid()))
    atexit.register(lambda: pid_file.unlink(missing_ok=True))


# ── Komut çalıştırma ───────────────────────────────────────────────────────

def run_cmd(cmd: str, cwd: Path) -> tuple[str, int]:
    r = subprocess.run(cmd, shell=True, cwd=str(cwd),
                       capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    out = r.stdout + (("\n[stderr] " + r.stderr) if r.stderr.strip() else "")
    return out.strip(), r.returncode


# ── Ana döngü ──────────────────────────────────────────────────────────────

def _tiyatro_kontrol(kanal: Kanal, islem_sayisi: int) -> None:
    """Her TIYATRO_ARALIK işlemde bir kez tiyatro dedektörünü çalıştır."""
    if islem_sayisi % TIYATRO_ARALIK != 0:
        return
    alg = TiyatroAlgilayici(kanal, pencere=20, min_mesaj=5)
    s = alg.kontrol()
    if s.tiyatro:
        uyari = (
            f"[TIYATRO] Son {s.pencere_boyutu} mesajda gecerli is kaniti yok. "
            f"Ajanlara hatirlatin: [TEST] kaniti yanit_id ile GOREV'e baglanmali."
        )
        print(f"\n[SİSTEM] {uyari}", flush=True)
        try:
            kanal.yaz(Mesaj(
                kimden="sistem", kime="*", tur="HATA",
                govde=uyari, kanit="[TEST]",
            ))
        except Exception:
            pass  # tiyatro uyarisi kanali kilitlememeli


def relay_loop(kanal: Kanal, cwd: Path) -> None:
    _, imlec = kanal.oku(0)
    islem_sayisi = 0
    print(f"TAYF Terminal hazir | kanal: {kanal.yol} | PID: {os.getpid()}")
    print("=" * 60, flush=True)
    while True:
        msgs, imlec = kanal.oku(imlec)
        for m in msgs:
            if m.kime not in (RELAY, "*") or m.tur != "GOREV":
                continue
            cmd = m.govde.strip()
            print(f"\n[{m.kimden}] $ {cmd}", flush=True)
            out, code = run_cmd(cmd, cwd)
            print(out or "(cikti yok)")
            print(f"cikis: {code}", flush=True)
            rapor = f"[{m.kimden}:{'OK' if code==0 else 'HATA'}] $ {cmd}\n{out}\ncikis: {code}"
            try:
                kanal.yaz(Mesaj(
                    kimden=RELAY, kime=m.kimden, tur="RAPOR",
                    govde=rapor, kanit="[TEST]", yanit_id=m.mid,
                ))
                islem_sayisi += 1
                _tiyatro_kontrol(kanal, islem_sayisi)
            except Exception as e:
                print(f"[RELAY HATA] {e}", flush=True)
        time.sleep(POLL)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("kanal_yolu", nargs="?", default=".tayf/kanal.jsonl")
    p.add_argument("--reset", action="store_true", help="Eski PID'i yok say, zorla basla")
    args = p.parse_args()

    kanal_path = Path(args.kanal_yolu)
    kanal_path.parent.mkdir(parents=True, exist_ok=True)
    kanal_path.touch(exist_ok=True)

    pid_file = kanal_path.parent / "relay.pid"
    _singleton(pid_file, args.reset)

    kanal = Kanal(kanal_path)
    cwd   = Path.cwd()
    try:
        relay_loop(kanal, cwd)
    except KeyboardInterrupt:
        print("\nTAYF Terminal kapatildi.")


if __name__ == "__main__":
    main()
