import { orion } from "../api.js";

// Tasarımdaki 38px titlebar: sol logo+ORION, sağ min/maks/kapat ikonları.
// frame:false Electron penceresi olduğu için gerçek işlem main.js'e IPC ile gider.
export default function Titlebar({ c }) {
  return (
    <div style={{
      height: "38px", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", WebkitAppRegion: "drag", boxSizing: "border-box", position: "relative", zIndex: 10,
      background: "rgba(8,8,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.055)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <svg width="15" height="15" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" fill={c.accent} />
          <circle cx="12" cy="12" r="9.5" fill="none" stroke={c.accent} strokeWidth="1.2" opacity="0.45" strokeDasharray="3 4" />
        </svg>
        <span style={{ fontSize: "12px", letterSpacing: "0.22em", fontWeight: 500, color: c.textDim }}>ORION</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", opacity: 0.5, WebkitAppRegion: "no-drag" }}>
        <svg width="11" height="11" viewBox="0 0 12 12" style={{ cursor: "pointer" }} onClick={() => orion.windowMinimize()}>
          <line x1="1" y1="6" x2="11" y2="6" stroke={c.textDim} strokeWidth="1.4" />
        </svg>
        <svg width="11" height="11" viewBox="0 0 12 12" style={{ cursor: "pointer" }} onClick={() => orion.windowMaximize()}>
          <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill="none" stroke={c.textDim} strokeWidth="1.4" />
        </svg>
        <svg width="11" height="11" viewBox="0 0 12 12" style={{ cursor: "pointer" }} onClick={() => orion.windowClose()}>
          <path d="M2 2l8 8M10 2l-8 8" stroke={c.textDim} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
