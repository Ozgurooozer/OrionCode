"""
tayf_ajan_otonom — LLM-tabanlı otonom TAYF ajanı.

KULLANIM:
  python tayf_ajan_otonom.py A --gorev "vault_ts dosyalarini analiz et"
  python tayf_ajan_otonom.py B --bekle            # kanaldan gorev bekle, cevapla
  python tayf_ajan_otonom.py A --dongu --max-tur 10

API_KEY (öncelik sırası):
  1. ANTHROPIC_API_KEY env var → Anthropic doğrudan
  2. OPENROUTER_API_KEY env var → OpenRouter üzerinden Claude
  3. ../credentials.json:openrouter_api_key → OpenRouter (credentials.ts kuralı)

Kanit kuralı:
  [TEST]   → yalnız bu script koyar; LLM komut verir, script calistirir, cikis=0
  [YAZILDI-KOŞULMADI] → komut calistirildi ama cikis != 0
  [SEZGİ]  → LLM [TEST] istedi ama komut yok (sahte kanit engeli)
"""
from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_ROOT = Path(__file__).parent / "tayf+0"
sys.path.insert(0, str(_ROOT))
from kanal import Kanal, Mesaj  # noqa: E402
from tiyatro import TiyatroAlgilayici  # noqa: E402

_TAYF_DIR   = Path(__file__).parent
_KANAL_YOL  = _TAYF_DIR / ".tayf" / "kanal.jsonl"
_CALISMA_DZ = _TAYF_DIR  # komutlar buradan çalışır

# Ajan rolleri — A planlayıcı, B uygulayıcı
_ROL_PROMPTLARI: dict[str, str] = {
    "A": (
        "Sen TAYF Ajan A — Planlayici/Tasarimci.\n"
        "B'ye GOREV gonderirsin. B'nin CEVAP'ini degerlendir; "
        "[TEST] kaniti yoksa ITIRAZ yaz. Mimari karar almadan once vault'u ara.\n"
        "Her iddia [SEZGİ]+ etiket tasimali. [OLCULMEDI] kabul edilmez."
    ),
    "B": (
        "Sen TAYF Ajan B — Uygulayici/Olcumleyici.\n"
        "A'dan gelen GOREV'i al, uygula, test yaz ve calistir, sonucu A'ya CEVAP olarak gonder.\n"
        "[TEST] kaniti ancak komut calistirildiysa kazanilir — boş iddia etme.\n"
        "Vault'a sonuclari yaz: python vault_arac.py yaz forum/orion0fis/... '...' "
    ),
}


# ── API Key + Client ───────────────────────────────────────────────────────

def _creds_yukle() -> dict:
    """credentials.json'u yükle (bulunamazsa {})."""
    yol = Path(__file__).parent.parent / "credentials.json"
    try:
        return json.loads(yol.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _client_olustur():
    """
    LLM client döndür.
    Dönüş: (client_or_None, model_id, provider)
    provider: "claude_cli" | "anthropic" | "openrouter"
    """
    # 1) claude -p (mevcut Claude Code auth — ek key gerekmez, tercih edilen)
    import shutil
    if shutil.which("claude"):
        model = os.environ.get("TAYF_AJAN_MODEL", "claude-haiku-4-5-20251001")
        return None, model, "claude_cli"

    creds = _creds_yukle()

    # 2) Anthropic doğrudan
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "") or creds.get("anthropic_api_key", "")
    if anthropic_key:
        try:
            import anthropic as _ant
            return _ant.Anthropic(api_key=anthropic_key), "claude-haiku-4-5-20251001", "anthropic"
        except ImportError:
            pass

    # 3) OpenRouter (openai SDK + base_url)
    or_key = os.environ.get("OPENROUTER_API_KEY", "") or creds.get("openrouter_api_key", "")
    if or_key:
        from openai import OpenAI
        client = OpenAI(api_key=or_key, base_url="https://openrouter.ai/api/v1")
        or_model = os.environ.get("TAYF_AJAN_MODEL", "google/gemma-4-31b-it:free")
        return client, or_model, "openrouter"

    raise ValueError(
        "LLM bulunamadi. Seçenekler:\n"
        "  1. claude CLI kurulu olmalı (zaten kuruluyor)\n"
        "  2. set ANTHROPIC_API_KEY=sk-ant-...\n"
        "  3. set OPENROUTER_API_KEY=sk-or-..."
    )


# ── LLM araç şeması ────────────────────────────────────────────────────────

_TAYF_EYLEM_ARACI = {
    "name": "tayf_eylem",
    "description": (
        "TAYF kanalina yazilacak tek bir eylem. "
        "Komut calistirmak istersen 'komut' alanini doldur — "
        "cikis=0 ise [TEST] kaniti otomatik kazanilir."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "tur": {
                "type": "string",
                "enum": ["GOREV", "CEVAP", "RAPOR", "KARAR", "ITIRAZ", "HATA", "SORU", "BITTI"],
                "description": "Mesaj turu"
            },
            "kime": {
                "type": "string",
                "description": "Alici ajan ID (A, B, TERMINAL, *)"
            },
            "govde": {
                "type": "string",
                "description": "Mesaj icerigi"
            },
            "kanit": {
                "type": "string",
                "enum": ["[SEZGİ]", "[YAZILDI-KOŞULMADI]", "[ÖLÇÜLMEDİ]", "[TEST]"],
                "description": (
                    "Kanit etiketi. Komut vermeden [TEST] istersen [SEZGİ]'ye dusurilir. "
                    "GOREV/SORU mesajlari icin bu alani koyma."
                )
            },
            "yanit_id": {
                "type": "string",
                "description": "Yanit verilen mesajin mid'i (ornek: m0042)"
            },
            "komut": {
                "type": "string",
                "description": (
                    "Calistir, cikti govde'ye eklenir. "
                    "Cikis=0 → kanit=[TEST]. "
                    "Ornek: 'python -m pytest tests/vault_test.py -v'"
                )
            },
        },
        "required": ["tur", "kime", "govde"],
    },
}


# ── Komut çalıştırma ───────────────────────────────────────────────────────

@dataclass
class KomutSonucu:
    cikti: str
    kod: int


def _komut_calistir(komut: str) -> KomutSonucu:
    r = subprocess.run(
        komut, shell=True, cwd=str(_CALISMA_DZ),
        capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=120,
    )
    cikti = r.stdout + (("\n[stderr] " + r.stderr) if r.stderr.strip() else "")
    return KomutSonucu(cikti=cikti.strip(), kod=r.returncode)


# ── Bağlam oluşturma ───────────────────────────────────────────────────────

def _kanal_ozet(kanal: Kanal, son: int = 15) -> str:
    msgs, _ = kanal.oku(0)
    pencere = msgs[-son:]
    satirlar = []
    for m in pencere:
        govde_kisalt = m.govde[:120].replace("\n", " ")
        kanit_str = m.kanit or ""
        satirlar.append(
            f"[{m.mid}] {m.kimden}->{m.kime} [{m.tur}] {kanit_str} | {govde_kisalt}"
        )
    return "\n".join(satirlar) if satirlar else "(kanal bos)"


def _bekleyen_mesajlar(kanal: Kanal, ajan_id: str, imlec: int) -> tuple[list[Mesaj], int]:
    msgs, yeni_imlec = kanal.oku(imlec)
    gelen = [
        m for m in msgs
        if m.kime in (ajan_id, "*")
        and m.kimden != ajan_id
        and m.kimden != "sistem"
    ]
    return gelen, yeni_imlec


# ── LLM çağrısı (provider-agnostic) ───────────────────────────────────────

def _llm_cagir(client, model: str, provider: str, sistem: str, kullanici: str) -> dict | None:
    """
    LLM'i çağır, JSON eylem dict döndür.
    claude_cli → subprocess; anthropic → tool_use; openrouter → JSON mode.
    """
    if provider == "claude_cli":
        sema_str = json.dumps(_TAYF_EYLEM_ARACI["input_schema"], ensure_ascii=False)
        tam_sistem = (
            sistem + "\n\n"
            "YANIT FORMATI: Yalnizca tek bir gecerli JSON objesi yaz, baska metin yok.\n"
            f"Zorunlu alanlar: tur, kime, govde\n"
            f"Sema: {sema_str}"
        )
        prompt = f"{kullanici}"
        # Prompt'ları dosyaya yaz — komut satırı karakter sınırı/özel karakter sorunu yok
        _tmp_dir = _CALISMA_DZ / ".tayf" / "tmp"
        _tmp_dir.mkdir(parents=True, exist_ok=True)
        sp_dosya  = _tmp_dir / "sistem_prompt.txt"
        usr_dosya = _tmp_dir / "kullanici_prompt.txt"
        sp_dosya.write_text(tam_sistem, encoding="utf-8")
        usr_dosya.write_text(prompt, encoding="utf-8")

        # shell=True: npm/claude PATH erişimi (Windows)
        cmd_str = (
            f'claude -p "@{usr_dosya}" '
            f'--system-prompt-file "{sp_dosya}" '
            f'--model {model} '
            f'--output-format json'
        )
        r = subprocess.run(
            cmd_str,
            capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=120,
            cwd=str(_CALISMA_DZ), shell=True,
        )
        if r.returncode != 0:
            print(f"[claude_cli] HATA: {r.stderr[:200]}", flush=True)
            return None
        try:
            envelope = json.loads(r.stdout)
            icerik = envelope.get("result", "")
            # Sonuç zaten JSON olabilir ya da kod bloğu içinde
            icerik = icerik.strip()
            if icerik.startswith("```"):
                icerik = icerik.split("```")[1]
                if icerik.startswith("json"):
                    icerik = icerik[4:]
            return json.loads(icerik)
        except (json.JSONDecodeError, KeyError):
            return None

    if provider == "anthropic":
        import anthropic as _ant
        yanit = client.messages.create(
            model=model, max_tokens=1024,
            system=sistem,
            messages=[{"role": "user", "content": kullanici}],
            tools=[_TAYF_EYLEM_ARACI],
            tool_choice={"type": "auto"},
        )
        for blok in yanit.content:
            if hasattr(blok, "type") and blok.type == "tool_use":
                return blok.input
        # text-only fallback
        for blok in yanit.content:
            if hasattr(blok, "text"):
                try:
                    return json.loads(blok.text)
                except json.JSONDecodeError:
                    pass
        return None

    else:  # openrouter / openai-compat
        # JSON mode ile schema'yı sistem prompt'una göm
        sema_str = json.dumps(_TAYF_EYLEM_ARACI["input_schema"], ensure_ascii=False)
        sistem_full = (
            sistem + "\n\n"
            "YANIT FORMATI: Yalnizca gecerli JSON yaz (baska metin yok).\n"
            f"Sema: {sema_str}"
        )
        try:
            yanit = client.chat.completions.create(
                model=model, max_tokens=400,
                messages=[
                    {"role": "system", "content": sistem_full},
                    {"role": "user",   "content": kullanici},
                ],
                response_format={"type": "json_object"},
            )
        except Exception as e:
            err = str(e)
            if "402" in err or "credits" in err.lower():
                raise RuntimeError(
                    "OpenRouter kredit yetersiz.\n"
                    "Seçenekler:\n"
                    "  1. set ANTHROPIC_API_KEY=sk-ant-...\n"
                    "  2. openrouter.ai/settings/credits adresinden kredi ekle\n"
                    "  3. --model qwen/qwen2.5-7b-instruct:free (ücretsiz model)"
                ) from e
            raise
        icerik = yanit.choices[0].message.content or ""
        try:
            return json.loads(icerik)
        except json.JSONDecodeError:
            return None


# ── Ajan turu ──────────────────────────────────────────────────────────────

def _ajan_turu(
    ajan_id: str,
    kanal: Kanal,
    istek: str | None,   # None → kanalı kontrol et
    imlec: int,
    client,
    model: str,
    provider: str,
) -> tuple[int, bool]:  # (yeni_imlec, bitti_mi)
    """
    Bir ajan turu:
    1. Bekleyen mesajları al (veya doğrudan istek)
    2. LLM'e gönder, tool_use yanıtı al
    3. Komut varsa çalıştır, kanıt belirle
    4. Kanala yaz
    5. (yeni_imlec, bitti_mi) döndür
    """
    gelen, imlec = _bekleyen_mesajlar(kanal, ajan_id, imlec)

    # Bir şey yoksa bekle
    if not gelen and not istek:
        return imlec, False

    rol_prompt = _ROL_PROMPTLARI.get(
        ajan_id,
        f"Sen TAYF Ajan {ajan_id}'sin. Kanal üzerinden iletişim kur. "
        "KUŞ-SU: her iddia kanit etiketli."
    )

    # Kanal özeti
    kanal_ozet = _kanal_ozet(kanal, son=15)

    # Gelen mesajlar
    gelen_blok = ""
    if gelen:
        satirlar = [f"  [{m.mid}] {m.kimden}: [{m.tur}] {m.govde[:300]}" for m in gelen]
        gelen_blok = "\nSana gelen mesajlar:\n" + "\n".join(satirlar)
    if istek:
        gelen_blok += f"\n\nGörev (kullanıcıdan): {istek}"

    sistem = (
        f"{rol_prompt}\n\n"
        "Kanaldaki son mesajlar:\n"
        f"{kanal_ozet}\n\n"
        "Kural: [TEST] yalnız komut çalıştırıp geçince kazanılır. "
        "Komut vermeden [TEST] istersen [SEZGİ] olur. "
        "GOREV ve SORU mesajlarına kanit ekleme."
    )

    kullanici = gelen_blok.strip() or "Kanal durumunu değerlendir, gerekiyorsa eylem al."

    print(f"\n[{ajan_id}] LLM'e gönderiliyor ({provider}/{model})...", flush=True)
    eylem = _llm_cagir(client, model, provider, sistem, kullanici)

    if not eylem:
        print(f"[{ajan_id}] LLM eylem üretmedi, atlanıyor.", flush=True)
        return imlec, False

    # Tek eylem bloğunu işle
    bitti = False
    if True:  # (okunabilirlik için eski for-bloğu yapısını koru)

        tur    = eylem.get("tur", "CEVAP")
        kime   = eylem.get("kime", "*")
        govde  = eylem.get("govde", "")
        kanit  = eylem.get("kanit")
        yanit_id = eylem.get("yanit_id")
        komut  = eylem.get("komut", "").strip()

        # ASSUMPTION(kanit-guard sirasi): intent türler ÖNCE → claim türler SONRA
        _KANIFSIZ = {"GOREV", "SORU", "BITTI", "ZAMAN_ASIMI"}

        # 1) Kanıtsız intent türler: kanit=None (komut bile olsa kanit taşınmaz)
        if tur in _KANIFSIZ:
            kanit = None
            # intent türler için komut varsa yine çalıştır ama kanit koyma
            if komut:
                print(f"[{ajan_id}] $ {komut}", flush=True)
                try:
                    ks = _komut_calistir(komut)
                    print(ks.cikti[:400] or "(çıktı yok)")
                    govde = govde + f"\n\n$ {komut}\n{ks.cikti}\nçıkış: {ks.kod}"
                except subprocess.TimeoutExpired:
                    govde += "\nHATA: komut timeout (120s)"

        # 2) Claim türler: komut → kanıt kazan; yoksa guard
        else:
            if komut:
                print(f"[{ajan_id}] $ {komut}", flush=True)
                try:
                    ks = _komut_calistir(komut)
                    print(ks.cikti[:400] or "(çıktı yok)")
                    print(f"çıkış: {ks.kod}", flush=True)
                    govde = govde + f"\n\n$ {komut}\n{ks.cikti}\nçıkış: {ks.kod}"
                    kanit = "[TEST]" if ks.kod == 0 else "[YAZILDI-KOŞULMADI]"
                except subprocess.TimeoutExpired:
                    govde += "\nHATA: komut timeout (120s)"
                    kanit = "[YAZILDI-KOŞULMADI]"
            else:
                # ASSUMPTION(kanit-guard): LLM [TEST] istedi ama komut yok → [SEZGİ]
                if kanit == "[TEST]":
                    print(f"[{ajan_id}] UYARI: [TEST] komut yok → [SEZGİ]")
                    kanit = "[SEZGİ]"

        try:
            m = kanal.yaz(Mesaj(
                kimden=ajan_id, kime=kime, tur=tur,
                govde=govde, kanit=kanit,
                yanit_id=yanit_id,
            ))
            print(f"[{ajan_id}] → [{m.mid}] {tur} [{kanit}] → {kime}", flush=True)
        except Exception as e:
            print(f"[{ajan_id}] KANAL HATA: {e}", flush=True)

        if tur == "BITTI":
            bitti = True

    return imlec, bitti


# ── Döngü ──────────────────────────────────────────────────────────────────

def dongu(ajan_id: str, gorev: str | None, max_tur: int, bekle_mod: bool) -> None:
    client, model, provider = _client_olustur()

    _KANAL_YOL.parent.mkdir(exist_ok=True)
    _KANAL_YOL.touch(exist_ok=True)
    kanal = Kanal(_KANAL_YOL)

    _, imlec = kanal.oku(0)  # mevcut mesajları atla, yenileri izle

    print(f"[{ajan_id}] Otonom ajan hazir | kanal: {_KANAL_YOL}")
    if gorev:
        print(f"[{ajan_id}] Görev: {gorev}")
    elif bekle_mod:
        print(f"[{ajan_id}] Mesaj bekleniyor...")

    tur_sayisi = 0
    while tur_sayisi < max_tur:
        istek = gorev if tur_sayisi == 0 else None  # ilk turda görevi ver
        imlec, bitti = _ajan_turu(ajan_id, kanal, istek, imlec, client, model, provider)

        if bitti:
            print(f"[{ajan_id}] BITTI sinyali alindi. Duruluyor.")
            break

        # Tek seferlik görev modu: ilk turdan sonra dur
        if gorev and tur_sayisi >= 1:
            break

        # Bekle modu: mesaj yoksa tur saymadan bekle
        if bekle_mod:
            pending, _ = _bekleyen_mesajlar(kanal, ajan_id, imlec)
            if not pending:
                time.sleep(1.0)
                continue  # tur_sayisi artmaz — sadece mesaj gelince sayar

        tur_sayisi += 1
        time.sleep(0.5)

    if tur_sayisi >= max_tur:
        print(f"[{ajan_id}] Max tur ({max_tur}) doldu.")

    # Son tiyatro kontrolü
    alg = TiyatroAlgilayici(kanal, pencere=20, min_mesaj=5)
    s = alg.kontrol()
    if s.tiyatro:
        print(f"\n[{ajan_id}] UYARI: Son {s.pencere_boyutu} mesajda gecerli [TEST] yok — TIYATRO")
    else:
        print(f"\n[{ajan_id}] Kanal kalitesi: {s.test_sayisi} gecerli [TEST] son {s.pencere_boyutu} mesajda")


# ── CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description="Otonom TAYF ajan")
    p.add_argument("ajan_id", help="Ajan ID (A, B, C ...)")
    p.add_argument("--gorev", help="İlk görev (yoksa kanal bekler)")
    p.add_argument("--gorev-dosya", dest="gorev_dosya", help="İlk görevi dosyadan oku")
    p.add_argument("--bekle", action="store_true", help="Kanaldan görev bekle (sürekli döngü)")
    p.add_argument("--dongu", action="store_true", help="--bekle ile aynı")
    p.add_argument("--max-tur", type=int, default=5, help="Maksimum tur sayisi (varsayilan: 5)")
    args = p.parse_args()

    gorev = args.gorev
    if args.gorev_dosya:
        gorev = Path(args.gorev_dosya).read_text(encoding="utf-8").strip()

    bekle_mod = args.bekle or args.dongu
    dongu(
        ajan_id  = args.ajan_id.upper(),
        gorev    = gorev,
        max_tur  = args.max_tur,
        bekle_mod= bekle_mod,
    )


if __name__ == "__main__":
    main()
