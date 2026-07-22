import type { CSSProperties, ReactNode } from "react";

interface LayerProps {
  zIndex: number;
  pointerEvents?: "none" | "auto";
  children?: ReactNode;
  style?: CSSProperties;
}

export function Layer({ zIndex, pointerEvents = "auto", children, style }: LayerProps) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex, pointerEvents, ...style }}>
      {children}
    </div>
  );
}
