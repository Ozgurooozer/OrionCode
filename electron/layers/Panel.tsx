import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { PanelState } from "./usePanelManager";

interface PanelProps {
  panel: PanelState;
  children: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onUpdate: (updates: Partial<Pick<PanelState, "x" | "y" | "w" | "h">>) => void;
}

export function Panel({ panel, children, onClose, onMinimize, onMaximize, onFocus, onUpdate }: PanelProps) {
  const [hov, setHov] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Panel açılış fade-in (Hareket Tasarımcısı)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);


  if (panel.minimized) return null;

  const mx = panel.maximized;

  function startDrag(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    if (mx) return;
    e.preventDefault();
    onFocus();
    const ox = e.clientX - panel.x;
    const oy = e.clientY - panel.y;
    const move = (me: MouseEvent) => onUpdate({ x: me.clientX - ox, y: me.clientY - oy });
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function startResize(e: React.MouseEvent) {
    if (mx) return;
    e.preventDefault(); e.stopPropagation(); onFocus();
    const sw = panel.w, sh = panel.h, sx = e.clientX, sy = e.clientY;
    const move = (me: MouseEvent) => onUpdate({
      w: Math.max(360, sw + me.clientX - sx),
      h: Math.max(240, sh + me.clientY - sy),
    });
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const dots = [
    { id: "close",    bg: "#ff5f57", fn: onClose,    sym: "×" },
    { id: "minimize", bg: "#febc2e", fn: onMinimize, sym: "−" },
    { id: "maximize", bg: "#28c840", fn: onMaximize, sym: mx ? "⊡" : "⊞" },
  ];

  return (
    <div
      onMouseDown={onFocus}
      role="dialog"
      aria-label={panel.title}
      style={{
        position: "absolute",
        ...(mx
          ? { left: 0, top: 0, width: "100vw", height: "100vh", borderRadius: 0 }
          : { left: panel.x, top: panel.y, width: panel.w, height: panel.h, borderRadius: "12px" }
        ),
        zIndex: panel.zIndex,
        display: "flex", flexDirection: "column",
        background: "rgba(6, 6, 20, 0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: mx ? "none" : "1px solid rgba(255,255,255,0.10)",
        boxShadow: mx ? "none" : "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
        overflow: "hidden",
        userSelect: "none",
        pointerEvents: "auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.98)",
        transition: "opacity .16s ease, transform .16s ease, border-radius .18s ease",
      }}
    >
      {/* ── Titlebar ──────────────────────────────────────────────────── */}
      <div
        onMouseDown={startDrag}
        onDoubleClick={onMaximize}
        style={{
          height: "40px", flex: "none",
          display: "flex", alignItems: "center",
          padding: "0 14px", gap: "10px",
          cursor: mx ? "default" : "grab",
          background: "rgba(255,255,255,0.025)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxSizing: "border-box",
        }}
      >
        {/* Traffic lights */}
        <div
          style={{ display: "flex", gap: "7px", flex: "none" }}
          onMouseEnter={() => setHov("group")}
          onMouseLeave={() => setHov(null)}
        >
          {dots.map(d => (
            <button
              key={d.id}
              onClick={(e) => { e.stopPropagation(); d.fn(); }}
              style={{
                width: 13, height: 13, borderRadius: "50%",
                background: hov ? d.bg : `${d.bg}99`,
                border: "none", cursor: "pointer", padding: 0, flex: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "8px", fontWeight: 900,
                color: hov ? "rgba(0,0,0,0.55)" : "transparent",
                transition: "background .1s, color .1s",
              }}
            >
              {d.sym}
            </button>
          ))}
        </div>

        {/* Panel title — center */}
        <div style={{
          flex: 1, textAlign: "center",
          fontSize: "11px", fontWeight: 700,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.15em", textTransform: "uppercase",
          fontFamily: "ui-monospace, monospace",
          pointerEvents: "none", userSelect: "none",
        }}>
          {panel.title}
        </div>

        {/* Right spacer (balances traffic lights) */}
        <div style={{ width: "52px", flex: "none" }} />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", pointerEvents: "auto", userSelect: "text" }}>
        {children}
      </div>

      {/* ── SE resize handle ──────────────────────────────────────────── */}
      {!mx && (
        <div
          onMouseDown={startResize}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: 18, height: 18, cursor: "nwse-resize", zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
