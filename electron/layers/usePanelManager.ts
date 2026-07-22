import { useState, useCallback } from "react";

export type PanelType = "terminal" | "leveleditor";

export interface PanelState {
  id: string;
  type: PanelType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  zIndex: number;
}

const DEFAULTS: Record<PanelType, Omit<PanelState, "id" | "zIndex">> = {
  terminal:    { type: "terminal",    title: "ORION · TERMINAL", x: 80,  y: 60, w: 920, h: 620, minimized: false },
  leveleditor: { type: "leveleditor", title: "Level Viewer",      x: 120, y: 80, w: 800, h: 540, minimized: false },
};

let _nextZ = 100;

export function usePanelManager() {
  const [panels, setPanels] = useState<PanelState[]>([]);

  const openPanel = useCallback((type: PanelType) => {
    setPanels(prev => {
      const existing = prev.find(p => p.type === type);
      if (existing) {
        return prev.map(p =>
          p.id === existing.id ? { ...p, minimized: false, zIndex: ++_nextZ } : p
        );
      }
      const id = (crypto as { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}`;
      return [...prev, { ...DEFAULTS[type], id, zIndex: ++_nextZ }];
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
    setPanels(prev => prev.map(p => p.id === id ? { ...p, minimized: true } : p));
  }, []);

  const updatePanel = useCallback(
    (id: string, updates: Partial<Pick<PanelState, "x" | "y" | "w" | "h" | "minimized">>) => {
      setPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    },
    []
  );

  return { panels, openPanel, closePanel, focusPanel, minimizePanel, updatePanel };
}
