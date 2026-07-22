import { useEffect } from "react";
import type { RefObject } from "react";
import { SceneManager } from "../scene/SceneManager";
import { LevelManager } from "../scene/LevelManager";

export function useScene(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sm = new SceneManager(canvas);
    const lm = new LevelManager(sm);
    lm.load("gece"); // varsayılan level

    const onLevel = (e: Event) => {
      lm.load((e as CustomEvent<string>).detail);
    };
    window.addEventListener("orion:level", onLevel);

    return () => {
      window.removeEventListener("orion:level", onLevel);
      sm.dispose();
    };
  }, []);
}
