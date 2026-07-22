import { useRef } from "react";
import { useScene } from "./hooks/useScene";
import { useIO }    from "./hooks/useIO";

// src/theme.js — JS modül, allowJs ile okunur
import { THEMES } from "../src/theme.js";

interface ThemeColors { text: string; accent: string; border: string; bg: string; textDim: string; [key: string]: string; }
interface Props { theme: string; onClose: () => void; }

export default function Terminal3D({ theme, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xtermRef  = useRef<HTMLDivElement>(null);
  const c: ThemeColors = (THEMES as Record<string, ThemeColors>)[theme] ?? (THEMES as Record<string, ThemeColors>).gece;

  useScene(canvasRef);
  useIO(xtermRef, c);

  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      backgroundColor: c.bg,
      overflow: "hidden",
    }}>
      {/* Babylon.js canvas — 3D arka plan */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          display: "block",
        }}
      />

      {/* xterm.js overlay */}
      <div
        ref={xtermRef}
        style={{
          position: "absolute", inset: 0,
          padding: "18px 20px",
          background: "rgba(8,8,13,0.78)",
          backdropFilter: "blur(2px)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      />

      {/* Başlık çubuğu */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "38px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        background: "rgba(8,8,13,0.92)",
        borderBottom: `1px solid ${c.border}`,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.accent }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: c.textDim, letterSpacing: "0.08em" }}>
            ORION TERMINAL 3D
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none", background: "transparent",
            color: c.textDim, cursor: "pointer",
            fontSize: "16px", lineHeight: 1,
            padding: "4px 6px", borderRadius: "6px",
          }}
          title="Kapat"
        >
          ✕
        </button>
      </div>

      {/* xterm padding-top: başlık çubuğu kadar boşluk */}
      <style>{`
        .xterm { padding-top: 38px; }
        .xterm-viewport { background: transparent !important; }
        .xterm-screen  { background: transparent !important; }
      `}</style>
    </div>
  );
}
