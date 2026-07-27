"""
test_tayf — 18 test, Tayf+0 tasarımı.

DÜŞMAN TESTLERİ ÖNCELİKLİ: naif tasarımı kıracak senaryolar başta.
Tüm testler geçici tmp dizinine yazar, birbirini kirletmez.
"""
import json
import sys
import tempfile
import threading
import time
from pathlib import Path

import pytest

# tayf+0/ önce — kendi kanal.py (Windows-uyumlu) + diğer modüller
sys.path.insert(0, str(Path(__file__).parent))

from kanal import Kanal, KanitTerfiHatasi, Mesaj
from sira import Sira, SiraHatasi
from sozluk import CapasizSembol, Sozluk
from kiralama import KiraHatasi, Kiralama


# ─── YARDIMCI ──────────────────────────────────────────────────────────────

@pytest.fixture()
def tmp(tmp_path):
    return tmp_path


def kanal_yap(tmp):
    return Kanal(tmp / ".tayf" / "kanal.jsonl")


def sira_yap(tmp, kim="A", ttl=60.0):
    return Sira(tmp / ".tayf" / "sira.json", kim, ttl)


def sozluk_yap(tmp):
    return Sozluk(tmp / ".tayf" / "sozluk.json")


def kiralama_yap(tmp, kim="A", ttl=120.0):
    return Kiralama(tmp / ".tayf" / "kira.json", kim, ttl)


# ─── KANAL TESTLERİ (4 test) ───────────────────────────────────────────────

def test_ASIL_kanit_terfi_reddedilir(tmp):
    """B, A'nın [SEZGİ]'sini [TEST] olarak yükseltemez — bu KRİTİK INVARYANTdır."""
    k = kanal_yap(tmp)
    m = k.yaz(Mesaj(kimden="A", kime="B", tur="CEVAP",
                    govde="x=5 derim", kanit="[SEZGİ]"))
    with pytest.raises(KanitTerfiHatasi):
        k.yaz(Mesaj(kimden="B", kime="A", tur="RAPOR",
                    govde="A test etti", kanit="[TEST]",
                    dayanak=[m.mid]))


def test_ASIL_itiraz_kanal_gucunu_korur(tmp):
    """ITIRAZ mesajı herhangi bir kanıt seviyesinde yazılabilir."""
    k = kanal_yap(tmp)
    m = k.yaz(Mesaj(kimden="A", kime="B", tur="ITIRAZ",
                    govde="Bu iddia dayanaksız.", kanit="[SEZGİ]"))
    assert m.seq == 0


def test_ASIL_gorev_kanit_tasiyamaz(tmp):
    """GOREV iddia etmez — kanıt etiketi taşıması protokol ihlalidir."""
    k = kanal_yap(tmp)
    with pytest.raises(ValueError, match="etiket taşıyamaz"):
        k.yaz(Mesaj(kimden="A", kime="B", tur="GOREV",
                    govde="şunu yap", kanit="[SEZGİ]"))


def test_ASIL_rapor_etiketsiz_gecemez(tmp):
    """RAPOR iddia eder — kanıtsız RAPOR sessiz yalan üretir."""
    k = kanal_yap(tmp)
    with pytest.raises(ValueError, match="kanıt etiketi zorunlu"):
        k.yaz(Mesaj(kimden="TERMINAL", kime="A", tur="RAPOR",
                    govde="çalıştı"))


def test_kanal_cok_yazarli_siralama(tmp):
    """İki thread aynı anda yazınca seq monoton artmalı."""
    k = kanal_yap(tmp)
    hatalar = []

    def yaz(kim):
        try:
            for _ in range(5):
                k.yaz(Mesaj(kimden=kim, kime="*", tur="GOREV",
                            govde="test"))
        except Exception as e:
            hatalar.append(e)

    t1 = threading.Thread(target=yaz, args=("A",))
    t2 = threading.Thread(target=yaz, args=("B",))
    t1.start(); t2.start()
    t1.join(); t2.join()
    assert not hatalar
    mesajlar, _ = k.oku()
    seqs = [m.seq for m in mesajlar]
    assert seqs == sorted(seqs), "seq monoton değil"
    assert len(set(seqs)) == len(seqs), "seq tekrarı var"


def test_kanal_bekle_zaman_asimi(tmp):
    """Hiç mesaj gelmezse bekle() boş döner."""
    k = kanal_yap(tmp)
    sonuc, _ = k.bekle(0, "X", saniye=0.6, aralik=0.2)
    assert sonuc == []


# ─── SIRA TESTLERİ (5 test) ────────────────────────────────────────────────

def test_ASIL_bos_jeton_kim_isterse_alir(tmp):
    a = sira_yap(tmp, "A")
    assert a.jetonu_al() is True
    assert a.durum()["sahip"] == "A"


def test_ASIL_ttl_dolunca_jeton_devralınır(tmp):
    """TTL=0.1s sonra B, A'nın jetonunu devralmalı — naif impl bunu görmez."""
    a = sira_yap(tmp, "A", ttl=0.1)
    a.jetonu_al()
    time.sleep(0.2)  # TTL geçsin
    b = sira_yap(tmp, "B", ttl=60.0)
    assert b.jetonu_al() is True
    assert b.durum()["sahip"] == "B"


def test_sira_bitti_jetonu_serbest_birakir(tmp):
    a = sira_yap(tmp, "A")
    a.jetonu_al()
    a.bitti()
    assert a.durum()["sahip"] is None


def test_sira_yabanci_birakamaz(tmp):
    a = sira_yap(tmp, "A")
    a.jetonu_al()
    b = sira_yap(tmp, "B")
    with pytest.raises(SiraHatasi):
        b.bitti()


def test_sira_dur_bekle_toplam_sure(tmp):
    """dur_bekle(toplam=küçük) → False dönmeli (kilitlenme senaryosu)."""
    a = sira_yap(tmp, "A", ttl=999.0)
    a.jetonu_al()
    b = sira_yap(tmp, "B", ttl=999.0)
    sonuc = b.dur_bekle(aralik=0.1, toplam=0.3)
    assert sonuc is False  # A hâlâ tutuyor, B zaman aşımına uğradı


# ─── SÖZLÜK TESTLERİ (5 test) ──────────────────────────────────────────────

def test_ASIL_capasiz_sembol_uydurma_yasak(tmp):
    """Sözlükte olmayan §sembol kullanılırsa CapasizSembol — sessiz tahmin asla."""
    s = sozluk_yap(tmp)
    with pytest.raises(CapasizSembol):
        s.coz("§yok")


def test_ASIL_az_dayanak_ile_kayit_yasak(tmp):
    """≥3 dayanak olmadan kayıt reddedilmeli."""
    s = sozluk_yap(tmp)
    with pytest.raises(ValueError):
        s.kayit("§kk", "kanıt kontrolü", ["m0001", "m0002"])  # yalnız 2 dayanak


def test_sozluk_kayit_ve_coz(tmp):
    s = sozluk_yap(tmp)
    s.kayit("§kk", "kanıt kontrolü", ["m0001", "m0002", "m0003"])
    assert s.coz("§kk") == "kanıt kontrolü"


def test_sozluk_ac_bilinmeyen_patlar(tmp):
    s = sozluk_yap(tmp)
    with pytest.raises(CapasizSembol):
        s.ac("§bilinmeyen bir metinde")


def test_sozluk_rapor_hic_kullanilmayanlar(tmp):
    s = sozluk_yap(tmp)
    s.kayit("§mk", "meissa kullanıcı", ["x", "y", "z"])
    r = s.rapor()
    assert "§mk" in r["hic_kullanilmayan"]
    assert r["capasiz_deneme"] == 0


# ─── KİRALAMA TESTLERİ (4 test) ────────────────────────────────────────────

def test_ASIL_ttl_dolunca_kira_devralınabilir(tmp):
    """TTL dolduktan sonra B, A'nın kirasını devralmalı."""
    a = kiralama_yap(tmp, "A", ttl=0.1)
    a.al()
    time.sleep(0.2)
    b = kiralama_yap(tmp, "B", ttl=120.0)
    b.devral()
    assert b.durum()["sahip"] == "B"


def test_kiralama_yazma_kira_sartli(tmp):
    a = kiralama_yap(tmp, "A")
    a.al()
    b = kiralama_yap(tmp, "B")
    with pytest.raises(KiraHatasi):
        b.calistir("echo test", yazma=True)


def test_kiralama_okuma_kira_gereksiz(tmp):
    a = kiralama_yap(tmp, "A")
    a.al()
    b = kiralama_yap(tmp, "B")
    # okuma komutu kira almadan çalışmalı
    cikti = b.calistir("echo merhaba", yazma=False)
    assert "merhaba" in cikti


def test_kiralama_context_manager(tmp):
    a = kiralama_yap(tmp, "A")
    with a.kira():
        assert a.durum()["sahip"] == "A"
    assert a.durum()["sahip"] is None  # bırakıldı


# ─── BÜTÜNLEŞME TESTİ (1 test) ─────────────────────────────────────────────

def test_BUTUNLESME_tam_mesaj_dongusu(tmp):
    """
    A jetonla mesaj gönderir → B cevap verir → A ITIRAZ yazar.
    Tüm modüller birlikte çalışıyor mu?
    """
    k = kanal_yap(tmp)
    s = sira_yap(tmp, "A")
    assert s.jetonu_al()

    m1 = k.yaz(Mesaj(kimden="A", kime="B", tur="GOREV",
                     govde="x = 7 mi?"))
    s.bitti()

    # B jetonunu alır, cevap verir
    sb = sira_yap(tmp, "B")
    assert sb.jetonu_al()
    m2 = k.yaz(Mesaj(kimden="B", kime="A", tur="CEVAP",
                     govde="Evet, x=7.", kanit="[SEZGİ]"))
    sb.bitti()

    # A itiraz eder (kanıt seviyesi düşürülemez: [SEZGİ] → [SEZGİ] OK)
    assert s.jetonu_al()
    k.yaz(Mesaj(kimden="A", kime="B", tur="ITIRAZ",
                govde="B ölçmedi, [TEST] değil.", kanit="[SEZGİ]",
                dayanak=[m2.mid]))

    mesajlar, _ = k.oku()
    assert len(mesajlar) == 3
    assert mesajlar[2].tur == "ITIRAZ"
