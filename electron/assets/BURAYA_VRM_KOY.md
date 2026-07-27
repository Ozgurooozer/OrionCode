# orion.vrm — Karakter Modeli

Bu dizine `orion.vrm` adında bir VRM 0.x karakter dosyası koy.

## Ücretsiz VRM kaynakları

- **VRoid Hub** (booth.pm/VRoidHub): hazır VRM 0.x karakterler
- **VRM Consortium örneği**: https://vrm.dev/en/vrm/vrm_about/
- **VRoid Studio** (ücretsiz): kendi karakterini tasarla → VRM 0.x olarak dışa aktar

## Dosya konumu

```
electron/assets/orion.vrm   ← buraya koy
```

`npm start` çalıştırınca `build.js` bu dosyayı `dist/assets/orion.vrm`'e kopyalar.
Dosya yoksa sahne karaktersiz açılır (hata vermez).

## Blendshape gereksinimleri (VRM 0.x)

| KUŞ-SU jest | VRM 0.x preset |
|-------------|----------------|
| gulumsuyor  | joy            |
| sasiriyor   | surprised      |
| uzuluyor    | sorrow         |
| sinirli     | angry          |
| neutral     | neutral        |

Blendshape yoksa setBlend() sessizce atlar.
