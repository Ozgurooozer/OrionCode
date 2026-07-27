# Orion Ölçümleri

**Amaç:** "Orion iyileşti" iddiasını falsifiye edilebilir kılmak.

## Kayıt Formatı

Her tamamlanan görev için bir satır:

```
tarih | görev_özeti | tamamlandı | insan_düzeltti | geri_alınamaz_hasar
```

- `tamamlandı`: evet / hayır / yarım
- `insan_düzeltti`: evet / hayır — insan müdahalesi olmadan sonuca ulaşıldı mı
- `geri_alınamaz_hasar`: evet / hayır / yok_sayılamadı

## Kayıtlar

| tarih | görev | tamamlandı | insan_düzeltti | hasar |
|---|---|---|---|---|
| — | — | — | — | — |

*(İlk kayıt girilene kadar bu tablo boş. Adlandırmak ölçmek değil.)*

---

## Metrik Yorumu

- **İnsan düzeltmesi oranı** = (insan_düzeltti=evet satırları) / toplam
- **Hasar oranı** = (hasar=evet satırları) / toplam

Hedef eşiği kullanıcı belirlemeli — bu dosya onları kaydetmez, ölçer.
