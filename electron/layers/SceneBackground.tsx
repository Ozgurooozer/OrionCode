import { useRef } from "react";
import { useScene } from "../Terminal/hooks/useScene";

export function SceneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useScene(canvasRef);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
