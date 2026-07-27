# Orion — Yerel AI Agent, Görsel/Bedenli Katman

Bu depo, yerelde çalışan (Ollama + qwen2.5-coder:7b, RTX 4060 8GB) bir AI
agent'ın bellek, uyku, algı ve anlatım katmanlarının çekirdeğini içerir.
Kod prototip olgunluğunda: her modül izole, test edilmiş, ve gerçek entegrasyona
hazır. Senin işin bunları ölçmek, bağlamak ve MVP'ye taşımak.

## Çalışma disiplini (bu depoda zorunlu)

Bu proje bir düşünme çerçevesiyle (`kusu/kussu_v7.txt`) yazıldı. O çerçeveyi
KOD YAZARKEN uygula. Özeti:

1. **Tetik = geri alma maliyeti, konu değil.** Tek komutla geri alınabilen
   (yerel kod, prototip, deney) → düşünme bloğu yazma, yap. Geri alınamaz
   (şema, kalıcı veri, dış sisteme yazma, bağımlılık seçimi, ölçüm aracı) →
   önce tam analiz.
2. **Ölçüm aletini önce kalibre et.** Bir metriğe/teste güvenmeden önce onu
   CEVABI BİLİNEN bir girdide koş. Beklenen cevabı vermiyorsa aleti onar,
   kodu değil. Bu depoda üç ayrı hata tam bu yüzden gizlenmişti.
3. **Negatif sonuç, testin pozitif üretebildiği gösterilmeden okunmaz.**
   Kontrolsüz "fark yok" bir sonuç değildir.
4. **Kanıt etiketi:** yalnız koşulup geçen için "test edildi" de. Koşmadıysan
   "yazıldı-koşulmadı", ölçmediysen "ölçülmedi", tahminse "tahmin" de.
5. **Payda tut.** Bir şeyin işe yaradığını iddia ederken yakaladıklarını değil,
   KAÇIRDIKLARINI da say. `kacirma_gunlugu.md` bunun için var.

Detay: `kusu/kussu_v7.txt`. Çerçeveyi DEĞİŞTİRME kuralları: `kusu/kussu_meta.txt`
(şu an v7 donduruldu; yeni kural ancak gerçek bir görevde çerçevenin kaçırdığı,
günlüğe yazılmış bir hatayla açılır).

## Mimari — tek cümlelik temel

Her katman aynı ilkeye dayanır: **gözlemlenen ile üretilen arasındaki fark
yapısal olarak taşınır, ve yetki o farkı izler.** Vault'ta bu çapadır, uykuda
felçtir, kortex'te kapıdır. Bu ilkeyi bozan hiçbir "kolaylaştırma" kabul edilmez.

## Modüller (hepsi orion/ altında, hepsi test edilmiş)

| modül | ne yapar | değişmez kural |
|-------|----------|----------------|
| `vault.py` | 4 katmanlı bellek | çapa SAKLANMAZ, okuma anında çözülür |
| `uyku.py` | NREM/REM faz makinesi | REM kalıcı depoya yazamaz |
| `kortex.py` | düşünce→aktüatör kapısı | geri alınamaz eylem refleks yolundan geçemez |
| `sahne.py` | anlatım→animasyon işaretçisi | işaretçi görünür metne sızmaz |
| `kanca.py` | olay aboneliği + konum çapası | konum GÖRÜNÜR metne göredir, ham chunk'a değil |
| `probe.py` | provenance dedektörü | negatif okuma öncesi potency kontrolü |
| `surucu.py` | üretici arka uç (yerel/API) | yerel varsayılan, API opsiyonel |

## Ortam

- Python 3.12, sadece stdlib (kod tarafı). Test: `pytest`.
- Yerel model: Ollama, `qwen2.5-coder:7b`, `http://localhost:11434`.
- Opsiyonel: `ANTHROPIC_API_KEY` (yalnız uyku REM'i ve büyük-model karşılaştırması).
- `kortex` decoder eğitimi (ertelendi): `transformers` + 4-bit qwen, ~8GB VRAM.

## Testi çalıştır

```
cd orion && python -m pytest -q        # 57 test, hepsi geçmeli
```

Herhangi biri kırılırsa ÖNCE o modülün değişmez kuralını kontrol et; büyük
ihtimalle bir "kolaylaştırma" onu bozmuştur.

## Sıradaki iş

`GOREVLER.md` sırayla ve gerekçeleriyle. Sırayı bozma: baştaki ucuz ölçümler
sonraki adımların yönünü belirliyor, atlanırsa MVP ölçülmemiş varsayıma oturur.
