"""
_lock — Çapraz-platform dosya kilidi. fcntl (Unix) veya lockfile (Windows).

# ASSUMPTION(atomic-excl): Windows'ta os.O_CREAT|O_EXCL atomik kilitlemedir.
# ASSUMPTION(lock-cleanup): Kilit dosyası her zaman finally'de silinir.
"""
from __future__ import annotations

import os
import time
import threading
from contextlib import contextmanager
from pathlib import Path

_THREAD_MUTEX = threading.Lock()  # aynı süreç içi yarış koruması

try:
    import fcntl as _fcntl

    @contextmanager
    def dosya_kilidi(yol: Path):
        """Unix: fcntl.LOCK_EX"""
        with open(yol, "r+b") as f:
            _fcntl.flock(f, _fcntl.LOCK_EX)
            try:
                yield
            finally:
                _fcntl.flock(f, _fcntl.LOCK_UN)

except ImportError:
    @contextmanager
    def dosya_kilidi(yol: Path):
        """Windows: .lock dosyası + O_EXCL atomik yaratma."""
        kilit = str(yol) + ".lock"
        while True:
            try:
                with _THREAD_MUTEX:
                    fd = os.open(kilit, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                    os.close(fd)
                break
            except FileExistsError:
                time.sleep(0.01)
        try:
            yield
        finally:
            try:
                os.remove(kilit)
            except FileNotFoundError:
                pass
