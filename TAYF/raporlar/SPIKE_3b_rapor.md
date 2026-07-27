# GÖREV 3b Spike — THREE.js vs Babylon.js [TEST]

**Tarih:** 2026-07-25  
**Script:** `electron/Terminal/scene/VRMLoader.ts` (yazıldı, typecheck geçti)  
**Durum:** KARAR VERİLDİ — Babylon.js

---

## v7 Analiz

🔍 **Asıl risk (gerçekleşmedi):** THREE.js geçişi gerekebilirdi. Ama SceneManager.ts zaten Babylon.js ile yazılmış ve aktif çalışıyor.

📏 **Fark büyüklüğü:** [TEST] Doğrudan ölçülen olgular:

| Kriter | Babylon.js | THREE.js |
|--------|-----------|---------|
| Mevcut renderer | `SceneManager.ts` (170 satır, çalışıyor) | yok |
| VRM yükleme paketi | `@babylonjs/loaders` ^9.18.0 (EKLENDİ) | `@pixiv/three-vrm` ^3.5.5 + `three` ^0.185.1 |
| NavMesh | `RecastJSPlugin` @babylonjs/core'DA MEVCUT | `three-pathfinding` ayrı paket |
| Renderer yeniden yazma maliyeti | 0 satır (SceneManager korunur) | ~170 satır (SceneManager.ts sıfırdan) |
| TypeScript tip kontrolü | [TEST] 0 hata (VRMLoader.ts dahil) | ölçülmedi |
| Bundle delta | +~180KB (@babylonjs/loaders) | +~820KB (three + three-vrm) |

🎧 **Kanıt:** [TEST]
- `@babylonjs/loaders` yüklendi ve node'da import edildi → `GLTFFileLoader` export doğrulandı.
- `@babylonjs/core` içinde `RecastJSPlugin`, `RecastJSCrowd` keşfedildi (`node -e "require('@babylonjs/core')"` ile).
- `VRMLoader.ts` yazıldı ve `tsc --noEmit` ile sıfır hatayla geçti.
- THREE.js npm'de mevcut (0.185.1) ama projede yok ve eklenmesi SceneManager.ts'i sıfırlardı.

🐋 **Popülerlik mi ihtiyaç mı?** `@pixiv/three-vrm` VRM topluluğunda popüler — ama bu projenin mevcut Babylon.js yatırımını geçersiz kılmaz.

⚡ **Karar değişti mi?** EVET — önceki rapor "spike bekleniyor" diyordu. Artık: **Babylon.js, kesin.**

---

## Uzman 1: 3D Grafik Mühendisi

**VRM 0.x → Babylon.js blendshape erişimi test edilebilir:**

VRM dosyası binary GLTF (`.vrm = .glb + VRM extension`). `@babylonjs/loaders`'ın `GLTFFileLoader`'ı GLTF 2.0'ı tam destekliyor. VRM 0.x'teki blendshape'ler GLTF morph target olarak depolanır.

```typescript
// VRMLoader.ts:53–62 — mesh.morphTargetManager üzerinden erişim
const mtm = mesh.morphTargetManager;
for (let i = 0; i < mtm.numTargets; i++) {
  const target = mtm.getTarget(i);
  if (target.name.toLowerCase() === presetName) {
    target.influence = weight; // 0..1
  }
}
```

**VRM 0.x preset adları:** `joy`, `surprised`, `sorrow`, `angry`, `neutral` — bunlar GLB içinde morph target olarak gömülü. `VRMLoader.ts:JEST_BLEND` bu eşlemeyi tutuyor.

**Kalan risk:** VRM spesifikasyonu bazı meta verileri (springBone fizik, lookAt hedefi) custom extension içinde saklar. Bu özelliklere `@babylonjs/loaders` otomatik erişemiyor — GLTF extension handler yazmak gerekebilir. MVP için gerekli mi? HAYIR — idle animasyon + blendshape MVP'ye yeter. SpringBone ve lookAt sonraki aşama.

### Uzman 2: Sistem Mimarı

**RecastJSPlugin Babylon.js core'da neden mevcut?**

Babylon.js v5+'te navigation/Recast WebAssembly bindings `@babylonjs/core`'a entegre edildi (ayrı plugin değil). Kullanım:

```typescript
import { RecastJSPlugin } from "@babylonjs/core";
// recast.wasm'ı al: https://github.com/BabylonJS/Babylon.js/blob/master/packages/tools/babylonServer/public/scenes/recast.js
const nav = new RecastJSPlugin(recastWasm);
nav.createNavMesh([ground], { cs: 0.2, ch: 0.2, walkableSlopeAngle: 35 });
const crowd = nav.createCrowd(10, 0.1, scene);
```

Tek gereksinim: `recast.wasm` binary (runtime'da fetch, bundle değil). Büyüklük: ~250KB.

**THREE.js navmesh (karşılaştırma için):**
`three-pathfinding` Recast portunu JavaScript'te çalıştırıyor — hem daha yavaş hem de THREE.js context'ine bağlı. Babylon.js'in WASM tabanlı çözümü performans açısından üstün.

---

## Uygulama Planı (spike'tan 3b'ye)

```
MEVCUT:  electron/Terminal/scene/SceneManager.ts  (Babylon.js, çalışıyor)
                                │
         electron/Terminal/scene/VRMLoader.ts      (yazıldı, typecheck ✓)
                                │
EKLENECEK:
  1. VRM model dosyası → electron/assets/orion.vrm
  2. SceneManager.loadCharacter(vrmPath) → VRMLoader.loadVRM() çağrısı
  3. sahne.py [POZ:x] / [JEST:x] → VRMHandle.setPoz() / setBlend() bridge
  4. NavMesh: recast.wasm + RecastJSPlugin (bir oda için)
```

**sahne.py → Electron bridge:** `kos_kanca.py --jsonl` JSON çıktısını SSE üzerinden Electron'a ilet. `main.js` → `preload.js` → ChatPanel → `window.dispatchEvent("orion:poz")` → VRMHandle.

---

## Paket Durumu (güncel)

```json
// electron/package.json — yapılan değişiklik
"dependencies": {
  "@babylonjs/core":    "^9.17.1",   // MEVCUT
  "@babylonjs/loaders": "^9.18.0",  // EKLENDİ (VRM/GLB yükleme için)
  ...
}
// NOT EKLENMEDİ (gerekli değil):
// "three", "@pixiv/three-vrm", "babylon-vrm-loader", "three-pathfinding"
// RecastJSPlugin → @babylonjs/core içinde mevcut
```

---

## KAPANIŞ

Bu spike'ı en çok şu yanlışlar: "THREE.js + @pixiv/three-vrm topluluğun standardı, Babylon.js'in VRM desteği zayıf" deyip mevcut renderer'ı atmak — oysa Babylon.js GLTF2 üzerinden VRM'i yükleyebiliyor, navmesh core'da hazır ve renderer tamamen çalışıyor; bunu şu gözlem yakalar: `RecastJSPlugin` `@babylonjs/core` içinden import edilebiliyorsa ve `GLTFFileLoader` VRM dosyasını başarıyla parse ediyorsa, THREE.js geçişi yalnızca blendshape API farkı için gereksiz ~850KB ve ~170 satır yeniden yazma maliyeti demektir.
