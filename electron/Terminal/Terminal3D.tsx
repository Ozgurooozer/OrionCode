import { useRef } from "react";
import { useIO } from "./hooks/useIO";
import { THEMES } from "../src/theme.js";

interface ThemeColors { text: string; accent: string; border: string; bg: string; textDim: string; [key: string]: string | undefined; }
interface Props { theme: string; }

export function TerminalContent({ theme }: Props) {
  const xtermRef = useRef<HTMLDivElement>(null);
  const c: ThemeColors = (THEMES as Record<string, ThemeColors>)[theme] ?? (THEMES as Record<string, ThemeColors>).gece;

  useIO(xtermRef, c);

  return (
    <>
      <div
        ref={xtermRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
          background: "transparent",
        }}
      />
      <style>{`
        .xterm-viewport { background-color: transparent !important; }
        .xterm-screen   { background-color: transparent !important; }
        .xterm           { background-color: transparent !important; }
        .xterm canvas    { background: transparent !important; }
      `}</style>
    </>
  );
}

export default TerminalContent;
