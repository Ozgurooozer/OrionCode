"""DÜŞMAN TESTİ — 270M modelin yapacağı hatalar."""
import pytest
from arac import Arac, Katalog
from kucuk_ajan import KucukAjan
from butce import Butce

VAR_OLAN = {"portre_v2", "upscale_v1"}


def wf_calistir(workflow: str, adet: int = 1) -> str:
    return f"{workflow} x{adet} kuyruğa alındı"


def wf_onkosul(args):
    return (args["workflow"] in VAR_OLAN,
            f"workflow tanımsız: {args['workflow']}")


ARAC_WF = Arac("comfy_calistir", "ComfyUI workflow kuyruğa al",
               {"workflow": str, "adet": int}, ("workflow",),
               "geri_alinabilir", wf_calistir, wf_onkosul)

ARAC_BAK = Arac("durum", "kuyruk durumunu oku", {}, (), "bak",
                lambda: "kuyruk: 3 iş")


def kat():
    k = Katalog()
    k.kayit(ARAC_WF); k.kayit(ARAC_BAK)
    return k


def uretici_sabit(cikti):
    return lambda p: cikti


# --- katalog kısıtı --------------------------------------------------
def test_ASIL_geri_alinamaz_arac_katalogda_yer_alamaz():
    """Küçük ajan tehlikeli aracı SEÇEMEZ çünkü listede YOK."""
    k = Katalog()
    tehlikeli = Arac("dosya_sil", "sil", {"yol": str}, ("yol",),
                     "geri_alinamaz", lambda yol: "silindi")
    with pytest.raises(PermissionError):
        k.kayit(tehlikeli)
    assert "dosya_sil" not in k.sema_metni()


def test_kisitsiz_katalog_buyuk_model_icin_izin_verir():
    k = Katalog(yalnizca_geri_alinabilir=False)
    k.kayit(Arac("push", "git push", {}, (), "dis_sistem", lambda: "ok"))
    assert "push" in k.sema_metni()


# --- argüman halüsinasyonu -------------------------------------------
def test_ASIL_var_olmayan_workflow_reddedilir():
    """Tip doğru ama semantik yanlış: şema yetmez, ön koşul lazım."""
    s = kat().cagir("comfy_calistir", {"workflow": "uydurma_wf"})
    assert s.calisti is False and s.kanit == "[ÖLÇÜLMEDİ]"
    assert "tanımsız" in s.sebep


def test_yanlis_tip_reddedilir():
    s = kat().cagir("comfy_calistir", {"workflow": "portre_v2", "adet": "üç"})
    assert s.calisti is False and "tipi" in s.sebep


def test_semada_olmayan_argüman_reddedilir():
    s = kat().cagir("comfy_calistir", {"workflow": "portre_v2", "seed": 42})
    assert s.calisti is False and "şemada olmayan" in s.sebep


def test_eksik_zorunlu_reddedilir():
    s = kat().cagir("comfy_calistir", {"adet": 2})
    assert s.calisti is False and "eksik zorunlu" in s.sebep


def test_tanimsiz_arac_reddedilir():
    assert kat().cagir("ucmak", {}).calisti is False


# --- KANIT: harness atar, model değil ---------------------------------
def test_ASIL_model_yaptim_dese_de_arac_patlarsa_kanit_yok():
    """En kritik: 270M model başarısını değerlendiremez."""
    def patlayan(**kw):
        raise RuntimeError("ComfyUI kapalı")
    k = Katalog()
    k.kayit(Arac("comfy_calistir", "x", {"workflow": str}, ("workflow",),
                 "geri_alinabilir", patlayan))
    s = k.cagir("comfy_calistir", {"workflow": "portre_v2"})
    assert s.calisti is False and s.kanit == "[ÖLÇÜLMEDİ]"
    assert "ComfyUI kapalı" in s.sebep


def test_arac_gercekten_kosarsa_kanit_TEST():
    s = kat().cagir("comfy_calistir", {"workflow": "portre_v2", "adet": 3})
    assert s.calisti is True and s.kanit == "[TEST]" and "x3" in s.cikti


# --- küçük ajan uçtan uca --------------------------------------------
def test_ASIL_bozuk_json_tahmin_edilerek_onarilmaz():
    a = KucukAjan(kat(), uretici_sabit('arac: comfy, args: {}'))
    s = a.calis("bir portre üret")
    assert s.calisti is False and "bozuk çıktı" in s.sebep


def test_ucdan_uca_basarili():
    a = KucukAjan(kat(), uretici_sabit(
        '{"arac":"comfy_calistir","args":{"workflow":"portre_v2","adet":2}}'))
    s = a.calis("2 portre üret")
    assert s.calisti is True and s.kanit == "[TEST]"


def test_butce_yetmezse_arac_calismaz():
    b = Butce(10); b.tahsis("k1", 0)
    a = KucukAjan(kat(), uretici_sabit(
        '{"arac":"comfy_calistir","args":{"workflow":"portre_v2"}}'), b, "k1")
    s = a.calis("üret")
    assert s.calisti is False and "bütçe" in s.sebep


def test_bakmak_butcesiz_de_calisir():
    b = Butce(10); b.tahsis("k1", 0)
    a = KucukAjan(kat(), uretici_sabit('{"arac":"durum","args":{}}'), b, "k1")
    assert a.calis("kuyruk ne durumda").calisti is True
