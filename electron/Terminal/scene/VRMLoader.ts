/**
 * VRMLoader — Babylon.js ile VRM 0.x karakter yükleme spike'ı
 *
 * Gerekli ek paket: npm install @babylonjs/loaders
 * @babylonjs/core zaten mevcut (package.json).
 *
 * Spike hedefleri:
 *  1. VRM dosyasını SceneManager.scene içine yükle
 *  2. Blendshape (morph target) erişimini doğrula
 *  3. Idle animasyon döngüsü (sallanma) başlat
 *  4. sahne.py çıktısındaki [POZ:x] / [JEST:x] eşlemesi
 */
import { SceneLoader, AbstractMesh, Vector3, AnimationGroup } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
// VRM 0.x = GLTF binary (.glb) + VRM extension. Babylon.js GLTF loader'ı
// .vrm uzantısını tanımaz — pluginExtension=".glb" ile zorlarız.

// VRM 0.x → KUŞ-SU poz eşlemesi
// Blendshape adları VRM 0.x spesifikasyonundan: https://vrm.dev/en/univrm/blendshape/
const POZ_ANIMASYON: Record<string, (root: AbstractMesh, t: number) => void> = {
  duruyor:   (root) => { root.rotation.y = root.rotation.y; },              // idle, hareket yok
  yuruyor:   (root, t) => { root.position.x = Math.sin(t * 0.8) * 0.02; }, // hafif sway
  egiliyor:  (root) => { root.rotation.x = 0.25; },                         // öne 14°
  bakiyor:   (root, t) => { root.rotation.y += Math.sin(t * 0.3) * 0.005; },// baş yavaş döner
  oturuyor:  (root) => { root.position.y = -0.6; root.rotation.x = 0.0; }, // aşağı çek
};

// VRM 0.x blendshape preset adları (küçük harf)
const JEST_BLEND: Record<string, string> = {
  gulumsuyor: "joy",
  sasiriyor:  "surprised",
  uzuluyor:   "sorrow",
  sinirli:    "angry",
  neutral:    "neutral",
};

export interface VRMHandle {
  root: AbstractMesh;
  setBlend: (name: string, weight: number) => void;
  setPoz: (poz: string) => void;
  dispose: () => void;
}

/**
 * VRM dosyasını Babylon.js sahnesine yükler.
 *
 * @param scene   SceneManager.scene
 * @param vrmPath Electron içinde ./assets/orion.vrm gibi tam yol (veya http URL)
 */
export async function loadVRM(
  scene: import("@babylonjs/core").Scene,
  vrmPath: string
): Promise<VRMHandle> {
  const dir  = vrmPath.substring(0, vrmPath.lastIndexOf("/") + 1);
  const file = vrmPath.substring(vrmPath.lastIndexOf("/") + 1);

  // 6. parametre pluginExtension: .vrm uzantısını GLTF loader'a yönlendirir
  const result = await SceneLoader.ImportMeshAsync("", dir, file, scene, null, ".glb");

  const root = result.meshes[0];
  root.position = new Vector3(0, 0, 0);
  root.scaling  = new Vector3(1, 1, 1);

  // Blendshape erişimi: VRM 0.x morph targets GLB içinde mesh.morphTargetManager
  function setBlend(name: string, weight: number): void {
    const presetName = JEST_BLEND[name] ?? name;
    for (const mesh of result.meshes) {
      const mtm = mesh.morphTargetManager;
      if (!mtm) continue;
      for (let i = 0; i < mtm.numTargets; i++) {
        const target = mtm.getTarget(i);
        if (target.name.toLowerCase() === presetName.toLowerCase()) {
          target.influence = Math.max(0, Math.min(1, weight));
        }
      }
    }
  }

  // Mevcut animasyon grupları (VRM'in kendi klipleri, varsa)
  const clips: AnimationGroup[] = result.animationGroups;
  let idleClip: AnimationGroup | null = clips.find(a => /idle/i.test(a.name)) ?? null;
  if (idleClip) idleClip.start(true);

  // KUŞ-SU poz geçiş durumu
  let activePoz = "duruyor";
  let t = 0;
  const beforeRender = () => {
    t += 0.016;
    const fn = POZ_ANIMASYON[activePoz];
    if (fn) fn(root, t);
  };
  scene.registerBeforeRender(beforeRender);

  function setPoz(poz: string): void {
    // Poz değişince önceki rotation/position sıfırla
    root.rotation = Vector3.Zero();
    root.position = new Vector3(0, 0, 0);
    activePoz = poz;
  }

  function dispose(): void {
    scene.unregisterBeforeRender(beforeRender);
    if (idleClip) idleClip.stop();
    result.meshes.forEach(m => m.dispose());
  }

  return { root, setBlend, setPoz, dispose };
}
