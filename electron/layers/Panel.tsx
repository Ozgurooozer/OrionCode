import { useState } from "react";
import type { ReactNode } from "react";
import type { PanelState } from "./usePanelManager";

interface PanelProps {
  panel: PanelState;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onUpdate: (updates: Partial<Pick<PanelState, "x" | "y" | "w" | "h">>) => void;
}

export function Panel({ panel, children, onClose, onMinimize, onFocus, onUpdate }: PanelProps) {
  const [hov, setHov] = useState<string | null>(null);

  if (panel.minimized) return null;

  function startDrag(e: React.MouseEvent) {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    e.preventDefault();
    onFocus();
    const ox = e.clientX - panel.x;
    const oy = e.clientY - panel.y;
    const move = (me: MouseEvent) => onUpdate({ x: me.clientX - ox, y: me.clientY - oy });
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    const sw = panel.w, sh = panel.h, sx = e.clientX, sy = e.clientY;
    const move = (me: MouseEvent) => onUpdate({
      w: Math.max(400, sw + me.clientX - sx),
      h: Math.max(260, sh + me.clientY - sy),
    });
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const dots = [
    { id: "close",    bg: "#ff5f57", hv: "#ff3b30", fn: onClose },
    { id: "minimize", bg: "#febc2e", hv: "#ffcc00", fn: onMinimize },
    { id: "zoom",     bg: "#28c840", hv: "#34c759", fn: () => {} },
  ];

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: "absolute",
        left: panel.x, top: panel.y,
        width: panel.w, height: panel.h,
        zIndex: panel.zIndex,
        display: "flex", flexDirection: "column",
        borderRadius: "10px",
        background: "rgba(5, 5, 22, 0.52)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
        overflow: "hidden",
        userSelect: "none",
        pointerEvents: "auto",
      }}
    >
      {/* Drag header */}
      <div
        onMouseDown={startDrag}
        style={{
          height: "32px", flex: "none",
          display: "flex", alignItems: "center",
          padding: "0 12px", gap: "8px",
          cursor: "grab",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0))",
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          boxSizing: "border-box",
        }}
      >
        {dots.map(d => (
          <button
            key={d.id}
            onMouseEnter={() => setHov(d.id)}
            onMouseLeave={() => setHov(null)}
            onClick={(e) => { e.stopPropagation(); d.fn(); }}
            style={{
              width: 12, height: 12, borderRadius: "50%",
              background: hov === d.id ? d.hv : d.bg,
              border: "none", cursor: "pointer", padding: 0, flex: "none",
              boxShadow: hov === d.id ? `0 0 7px ${d.bg}` : "none",
              transition: "all .1s",
            }}
          />
        ))}
        <span style={{
          marginLeft: "auto",
          fontSize: "10px", fontWeight: 600,
          color: "rgba(255,255,255,0.28)",
          letterSpacing: "0.12em",
          fontFamily: "monospace",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          {panel.title}
        </span>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", userSelect: "text" }}>
        {children}
      </div>

      {/* SE resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          position: "absolute", bottom: 0, right: 0,
          width: 20, height: 20,
          cursor: "nwse-resize",
          zIndex: 1,
        }}
      />
    </div>
  );
}
