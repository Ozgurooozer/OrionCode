import { useState } from "react";
import { THEMES } from "../src/theme.js";
import type { LevelName } from "../Terminal/scene/LevelManager";

const LEVELS: LevelName[] = ["gece", "siber", "komur", "okyanus", "kizil"];

interface ThemeColors { text: string; accent: string; border: string; bg: string; textDim: string; [key: string]: string; }
interface Props { theme: string; }

export function LevelViewerContent({ theme }: Props) {
  const c: ThemeColors = (THEMES as Record<string, ThemeColors>)[theme] ?? (THEMES as Record<string, ThemeColors>).gece;
  const [active, setActive] = useState<LevelName>("siber");

  const loadLevel = (name: LevelName) => {
    setActive(name);
    window.dispatchEvent(new CustomEvent("orion:level", { detail: name }));
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "24px", padding: "16px",
      boxSizing: "border-box",
    }}>
      <p style={{ color: "rgba(255,255,255,0.30)", fontSize: "10px", letterSpacing: "0.18em", margin: 0 }}>
        LEVEL SEÇİN
      </p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {LEVELS.map(lv => (
          <LevelBtn
            key={lv} label={lv} active={active === lv}
            accent={c.accent} border={c.border} textDim={c.textDim}
            onClick={() => loadLevel(lv)}
          />
        ))}
      </div>
      <p style={{ color: "rgba(255,255,255,0.18)", fontSize: "10px", margin: 0, textAlign: "center", maxWidth: "260px" }}>
        Değişiklikler arka plandaki 3D sahneyi etkiler
      </p>
    </div>
  );
}

function LevelBtn({ label, active, accent, border, textDim, onClick }: {
  label: string; active: boolean; accent: string; border: string; textDim: string; onClick: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        border: `1px solid ${active ? accent : h ? accent + "88" : border}`,
        background: active ? `${accent}22` : h ? `${accent}0a` : "transparent",
        color: active ? accent : h ? accent + "cc" : textDim,
        borderRadius: "8px", padding: "7px 18px",
        fontSize: "12px", fontWeight: active ? 700 : 400,
        cursor: "pointer", letterSpacing: "0.06em",
        transition: "all .15s",
      }}
    >{label}</button>
  );
}

export default LevelViewerContent;
