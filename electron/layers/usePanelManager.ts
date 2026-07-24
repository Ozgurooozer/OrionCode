import { useState, useCallback } from "react";

export type PanelType = "chat" | "sessions" | "vault" | "router" | "mcp" | "terminal" | "leveleditor" | "image";

export interface PanelState {
  id: string;
  type: PanelType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  meta?: Record<string, unknown>;
}

const TYPE_DEFAULTS: Record<PanelType, { title: string; w: number; h: number }> = {
  chat:        { title: "ORION · SOHBET",      w: 720, h: 600 },
  sessions:    { title: "OTURUMLAR",            w: 420, h: 520 },
  vault:       { title: "VAULT · HAFIZA",       w: 580, h: 500 },
  router:      { title: "TAYF YÖNLENDİRİCİ",   w: 600, h: 480 },
  mcp:         { title: "MCP SUNUCULARI",       w: 560, h: 460 },
  terminal:    { title: "ORION · TERMINAL",     w: 920, h: 620 },
  leveleditor: { title: "LEVEL VIEWER",         w: 800, h: 540 },
  image:       { title: "GÖRSEL ÜRETICI",       w: 720, h: 580 },
};

// Single-instance panel types — only one open at a time
const SINGLETON: PanelType[] = ["sessions", "vault", "router", "mcp", "terminal", "leveleditor", "image"];

let _nextZ = 100;
let _openCount = 0;
const CASCADE = 28;

export function usePanelManager() {
  const [panels, setPanels] = useState<PanelState[]>([]);

  const openPanel = useCallback((type: PanelType, meta?: Record<string, unknown>) => {
    setPanels(prev => {
      if (SINGLETON.includes(type)) {
        const existing = prev.find(p => p.type === type);
        if (existing) {
          return prev.map(p =>
            p.id === existing.id
              ? { ...p, minimized: false, maximized: false, zIndex: ++_nextZ }
              : p
          );
        }
      }
      const offset = (_openCount++ % 10) * CASCADE;
      const { title, w, h } = TYPE_DEFAULTS[type];
      const id = (crypto as { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      return [...prev, {
        id, type, title,
        x: 80 + offset,
        y: 56 + offset,
        w, h,
        minimized: false,
        maximized: false,
        zIndex: ++_nextZ,
        meta,
      }];
    });
  }, []);

  const closePanel = useCallback((id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  }, []);

  const focusPanel = useCallback((id: string) => {
    setPanels(prev => {
      const panel = prev.find(p => p.id === id);
      if (!panel) return prev;
      const maxZ = Math.max(...prev.map(p => p.zIndex));
      if (panel.zIndex === maxZ) return prev;
      return prev.map(p => p.id === id ? { ...p, zIndex: ++_nextZ } : p);
    });
  }, []);

  const minimizePanel = useCallback((id: string) => {
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, minimized: true, maximized: false } : p
    ));
  }, []);

  const maximizePanel = useCallback((id: string) => {
    setPanels(prev => prev.map(p =>
      p.id === id
        ? { ...p, maximized: !p.maximized, minimized: false, zIndex: ++_nextZ }
        : p
    ));
  }, []);

  const updatePanel = useCallback(
    (id: string, updates: Partial<Pick<PanelState, "x" | "y" | "w" | "h" | "minimized" | "maximized" | "title">>) => {
      setPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    },
    []
  );

  return { panels, openPanel, closePanel, focusPanel, minimizePanel, maximizePanel, updatePanel };
}
