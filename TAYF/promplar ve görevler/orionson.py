"""
orionson — LLM/agent inference izinin sesleştirilmesi (offline prototip).

AMAÇ (düşman testi): gerçek zamanlı motor yazmadan ÖNCE tek soruyu yanıtla —
kaydedilmiş bir izden sağlıklı koşu ile takılmış koşu KULAKLA ayrılıyor mu?
Ayrılmıyorsa real-time pipeline boşa emektir.

ARAYÜZ (kod öncesi tanımlandı):
  Trace: her adım için (t, tok_per_s, entropy, loop_depth, event|None)
  sonify(trace, sr) -> np.ndarray[float32]   # mono, [-1,1]
    raises ValueError: boş iz veya NaN içeren alan
  write_wav(path, audio, sr) -> None
    raises OSError: yazılamayan yol
  discriminability(a, b) -> dict  # ölçülebilir ayırt edilebilirlik

TASARIM (iki aday, biri elendi):
  A) Her token = ayrı nota (event-based melodi).
  B) Sürekli drone + ayrık earcon (iki akış).
  -> A elendi: token hızı 30+/s'de melodi ayırt edilemez gürültüye döner ve
     "normalde sessiz kal" ilkesini ihlal eder. B seçildi (SonOpt'un iki-akış
     yapısı ve peripheral monitoring literatürüyle uyumlu).

HARİTALAMA:
  tok_per_s   -> nabız (pulse) frekansı        "kalp atışı, sistem yaşıyor mu"
  entropy     -> FM pürüzlülüğü (roughness)    "model zorlanıyor mu"
  loop_depth  -> Shepard-Risset glissando      SINIRSIZ nicelik; sonsuz tırmanış
                                               = "ilerliyor gibi ama varmıyor"
  event       -> ayrık earcon (tool/hata)      dikkat çekmesi gereken tek şey

# ASSUMPTION(bounded-vs-unbounded): Shepard SADECE sınırsız/monotonik alanlara
# bağlanır. Context doluluğu (%0-100) gibi SINIRLI bir alana bağlanamaz, çünkü
# Shepard mutlak seviye taşımaz, yalnızca yön taşır. Bunu assert ile korumaya al.
"""
from __future__ import annotations

import math
import wave
from dataclasses import dataclass

import numpy as np

SR = 22050


@dataclass
class Step:
    tok_per_s: float
    entropy: float       # 0..~4 nat, decoding entropisi
    loop_depth: float    # sınırsız: agent döngü/retry derinliği
    event: str | None = None   # "tool" | "error" | None


def _validate(trace: list[Step]) -> None:
    if not trace:
        raise ValueError("boş iz: sonify en az 1 adım ister")
    for i, s in enumerate(trace):
        for name, v in (("tok_per_s", s.tok_per_s), ("entropy", s.entropy),
                        ("loop_depth", s.loop_depth)):
            if not math.isfinite(v):
                raise ValueError(f"adım {i}: {name} sonlu değil ({v})")
        # ASSUMPTION(unbounded-shepard): loop_depth sınırsız olmalı; negatifse
        # çağıran yanlış alanı bağlamış demektir (ör. yüzde bir doluluk oranı).
        assert s.loop_depth >= 0, f"adım {i}: loop_depth negatif, sınırlı bir alan bağlanmış olabilir"


def _shepard(t: np.ndarray, cycles_per_s: float, n_oct: int = 6) -> np.ndarray:
    """Shepard-Risset glissando: sonsuz yükselen ton, tavana çarpmaz."""
    if cycles_per_s <= 0:
        return np.zeros_like(t)
    base, out = 55.0, np.zeros_like(t)
    phase = (t * cycles_per_s) % 1.0
    for k in range(n_oct):
        frac = (phase + k / n_oct) % 1.0
        f = base * (2.0 ** (frac * n_oct))
        # Gauss zarf: uçlarda sönümle -> geri dönüş duyulmaz (illüzyonun kalbi)
        env = np.exp(-0.5 * ((frac * n_oct - n_oct / 2) / (n_oct / 4)) ** 2)
        out += env * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return out / n_oct


def _earcon(kind: str, n: int) -> np.ndarray:
    t = np.arange(n) / SR
    f = 880.0 if kind == "tool" else 180.0
    decay = np.exp(-t * (18.0 if kind == "tool" else 6.0))
    tone = np.sin(2 * np.pi * f * t)
    if kind == "error":
        tone += 0.6 * np.sin(2 * np.pi * f * 1.06 * t)  # atonal vuruş = rahatsız
    return 0.5 * decay * tone


def sonify(trace: list[Step], step_dur: float = 0.25, sr: int = SR) -> np.ndarray:
    """İzi mono sese çevirir. Sağlıklı sistem SIKICI ses üretmelidir."""
    _validate(trace)
    n = int(step_dur * sr)
    chunks = []
    for s in trace:
        t = np.arange(n) / sr

        # 1) NABIZ: yaşam belirtisi — ZAMANSAL zarf, spektral değil.
        # DÜZELTME: sert kapı (>0.85) geniş bantlı tıklama üretip parlaklık
        # eksenini kirletiyordu ve entropi sinyalini iptal ediyordu.
        # Yumuşak zarf kullanılıyor: nabız ritim taşır, tını taşımaz.
        pulse_hz = np.clip(s.tok_per_s / 8.0, 0.0, 12.0)
        pulse_env = 0.5 + 0.5 * np.sin(2 * np.pi * pulse_hz * t) ** 4
        carrier = np.sin(2 * np.pi * 220.0 * t)

        # 2) PÜRÜZLÜLÜK: entropi arttıkça FM derinliği artar -> ses "kirlenir".
        # Artık parlaklık ekseninin TEK sahibi bu.
        rough_depth = np.clip(s.entropy / 3.0, 0.0, 1.0)
        fm = np.sin(2 * np.pi * 73.0 * t)
        voice = np.sin(2 * np.pi * 220.0 * t + 9.0 * rough_depth * fm)
        drone = ((1 - rough_depth) * carrier + rough_depth * voice)

        # 3) SHEPARD: loop_depth sınırsız -> tırmanış hızı derinlikle artar
        shep = 0.30 * _shepard(t, cycles_per_s=0.08 * s.loop_depth)

        # 4) GENEL KAZANÇ: FEP ilkesi — sağlıklı sistem SESSİZ olmalı.
        # Ses yüksekliği "sorun miktarı" ile artar, aktiviteyle değil.
        trouble = np.clip(rough_depth + 0.10 * s.loop_depth, 0.0, 1.0)
        gain = 0.10 + 0.30 * trouble

        seg = gain * (drone * pulse_env) + shep
        if s.event:
            seg = seg + _earcon(s.event, n)
        chunks.append(seg)

    audio = np.concatenate(chunks).astype(np.float32)
    peak = float(np.max(np.abs(audio)))
    # OBSERVABILITY: clipping sessizce bozar; olursa bilmek isterim.
    if peak > 1.0:
        print(f"[uyari] tepe {peak:.2f} > 1.0, normalize ediliyor (clipping riski)")
        audio = audio / peak
    return audio


def write_wav(path: str, audio: np.ndarray, sr: int = SR) -> None:
    data = np.clip(audio, -1, 1)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def discriminability(a: np.ndarray, b: np.ndarray, sr: int = SR) -> dict:
    """
    Kulak yerine ölçüm: iki sesin spektral centroid (parlaklık) ve
    yüksek-frekans enerji oranı dağılımları ne kadar ayrışıyor?
    d' benzeri bir ayrım skoru döner. d' > 1.0 -> ayırt edilebilir sayılır.
    """
    def feats(x):
        win = 1024
        m = len(x) // win * win
        fr = x[:m].reshape(-1, win)
        # DÜZELTME: pencereleme yoksa spektral sızıntı geniş bantlı yapay enerji
        # üretip centroid'i Nyquist'e doğru çeker ve GERÇEK farkı gizler.
        # Bu, ölçüm katmanının yanlış sinyal verdiği bir vakaydı.
        fr = fr * np.hanning(win)
        spec = np.abs(np.fft.rfft(fr, axis=1)) + 1e-12
        freqs = np.fft.rfftfreq(win, 1 / sr)
        centroid = (spec * freqs).sum(1) / spec.sum(1)
        # düşük banda oranı: "sakin uğultu" mu "kirli" mi
        lf = spec[:, freqs < 300].sum(1) / spec.sum(1)
        return centroid, lf

    ca, ha = feats(a)
    cb, hb = feats(b)
    def dprime(x, y):
        pooled = math.sqrt((x.var() + y.var()) / 2) + 1e-9
        return abs(x.mean() - y.mean()) / pooled
    return {
        "centroid_dprime": round(dprime(ca, cb), 3),
        "lf_ratio_dprime": round(dprime(ha, hb), 3),
        "centroid_healthy_hz": round(float(ca.mean()), 1),
        "centroid_stuck_hz": round(float(cb.mean()), 1),
    }
