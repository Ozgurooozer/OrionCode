import { Color3, Color4 } from "@babylonjs/core";
import type { SceneManager } from "./SceneManager";

export type LevelName = "gece" | "siber" | "komur" | "okyanus" | "kizil";

interface LevelDef {
  color:       Color4;
  accentColor: Color3;
  desc:        string;
  accentHex:   string;
}

const LEVELS: Record<LevelName, LevelDef> = {
  gece:    {
    color:       new Color4(0.031, 0.031, 0.051, 1),
    accentColor: new Color3(0.55, 0.60, 1.00),
    desc: "Derin gece · mor",   accentHex: "#8c96ff",
  },
  siber:   {
    color:       new Color4(0.020, 0.060, 0.130, 1),
    accentColor: new Color3(0.00, 0.90, 1.00),
    desc: "Siber mavi · neon",  accentHex: "#00e5ff",
  },
  komur:   {
    color:       new Color4(0.047, 0.043, 0.035, 1),
    accentColor: new Color3(0.90, 0.65, 0.30),
    desc: "Kömür · amber",      accentHex: "#e0a84e",
  },
  okyanus: {
    color:       new Color4(0.023, 0.043, 0.070, 1),
    accentColor: new Color3(0.30, 0.80, 0.90),
    desc: "Okyanus · camgöbeği", accentHex: "#4ecbe0",
  },
  kizil:   {
    color:       new Color4(0.080, 0.020, 0.020, 1),
    accentColor: new Color3(1.00, 0.42, 0.42),
    desc: "Kızıl · lav",        accentHex: "#ff6b6b",
  },
};

export class LevelManager {
  private current: LevelName = "gece";

  constructor(private sm: SceneManager) {}

  load(name: string): boolean {
    const def = LEVELS[name as LevelName];
    if (!def) return false;
    this.current = name as LevelName;
    this.sm.setLevelVisuals(def.color, def.accentColor);
    return true;
  }

  getCurrent(): LevelName { return this.current; }
  getCurrentAccent(): string { return LEVELS[this.current].accentHex; }
  list(): { name: LevelName; desc: string }[] {
    return (Object.entries(LEVELS) as [LevelName, LevelDef][])
      .map(([name, def]) => ({ name, desc: def.desc }));
  }
}
