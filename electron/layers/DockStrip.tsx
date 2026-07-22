import { useState } from "react";
import type { PanelState } from "./usePanelManager";

interface DockStripProps {
  panels: PanelState[];
  onRestore: (id: string) => void;
}

export function DockStrip({ panels, onRestore }: DockStripProps) {
  const [hov, setHov] = useState<string | null>(null);
  if (!panels.length) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "8px",
      pointerEvents: "auto",
      background: "rgba(5, 5, 18, 0.80)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: "12px",
      padding: "6px 10px",
      zIndex: 30,
    }}>
      {panels.map(p => (
        <button
          key={p.id}
          onClick={() => onRestore(p.id)}
          onMouseEnter={() => setHov(p.id)}
          onMouseLeave={() => setHov(null)}
          style={{
            background: hov === p.id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "8px",
            padding: "4px 12px",
            color: "rgba(255,255,255,0.60)",
            fontSize: "11px",
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "background .12s",
          }}
        >
          {p.title}
        </button>
      ))}
    </div>
  );
}
