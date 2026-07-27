import { useEffect } from "react";
import type { RefObject } from "react";
import { SceneManager } from "../scene/SceneManager";
import { LevelManager } from "../scene/LevelManager";

// Electron renderer root'unda assets/ — Vite/esbuild kopyalar
const VRM_PATH = "./assets/orion.vrm";

export function useScene(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sm = new SceneManager(canvas);
    const lm = new LevelManager(sm);
    lm.load("siber");

    // VRM karakteri yükle — dosya yoksa Babylon.js hata fırlatır, catch yakalar
    sm.loadCharacter(VRM_PATH)
      .then(() => console.log("[vrm] karakter yüklendi:", VRM_PATH))
      .catch(err => {
        const msg = String(err);
        // Dosya bulunamadıysa sessiz — diğer hatalar loglanır
        if (!msg.includes("FILE_NOT_FOUND") && !msg.includes("Unable to load")) {
          console.warn("[vrm] yükleme hatası:", err);
        }
      });

    // Level geçişi
    const onLevel = (e: Event) => {
      lm.load((e as CustomEvent<string>).detail);
    };
    window.addEventListener("orion:level", onLevel);

    // sahne.py [POZ:x] → VRMHandle.setPoz()
    const onPoz = (e: Event) => {
      sm.setPoz((e as CustomEvent<string>).detail);
    };
    window.addEventListener("orion:poz", onPoz);

    // sahne.py [JEST:x] → VRMHandle.setBlend()
    // CustomEvent detail: { name: string, weight: number }
    const onJest = (e: Event) => {
      const { name, weight } = (e as CustomEvent<{ name: string; weight: number }>).detail;
      sm.setBlend(name, weight);
    };
    window.addEventListener("orion:jest", onJest);

    return () => {
      window.removeEventListener("orion:level", onLevel);
      window.removeEventListener("orion:poz", onPoz);
      window.removeEventListener("orion:jest", onJest);
      sm.dispose();
    };
  }, []);
}
