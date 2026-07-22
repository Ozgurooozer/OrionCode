import { useEffect } from "react";
import type { RefObject } from "react";
import { TerminalRenderer } from "../renderer/TerminalRenderer";

declare const window: Window & {
  orion: {
    pty: {
      create:  (cols: number, rows: number, cwd: string | null) => Promise<string>;
      write:   (ptyId: string, data: string)  => Promise<void>;
      resize:  (ptyId: string, cols: number, rows: number) => Promise<void>;
      kill:    (ptyId: string) => Promise<void>;
      onData:  (cb: (p: { ptyId: string; data: string })  => void) => () => void;
      onExit:  (cb: (p: { ptyId: string; code: number }) => void) => () => void;
    };
  };
};

type Colors = Record<string, string | undefined>;

const LEVELS = ["gece", "siber", "komur", "okyanus", "kizil"];

// neofetch tarzı — sol ASCII + sağ bilgi paneli
const BANNER = [
  "",
  "\x1b[38;5;99m  ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗\x1b[0m  \x1b[1;37morion\x1b[38;5;245m@\x1b[1;37maethelred\x1b[0m",
  "\x1b[38;5;99m ██╔═══██╗██╔══██╗██║██╔═══██╗████╗  ██║\x1b[0m  \x1b[38;5;245m─────────────────────────\x1b[0m",
  "\x1b[38;5;105m ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║\x1b[0m  \x1b[38;5;245mOS\x1b[0m     Windows 11",
  "\x1b[38;5;105m ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║\x1b[0m  \x1b[38;5;245mShell\x1b[0m  Electron · node-pty",
  "\x1b[38;5;141m  ██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║\x1b[0m  \x1b[38;5;245mEngine\x1b[0m Babylon.js 3D",
  "\x1b[38;5;141m  ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝\x1b[0m  \x1b[38;5;245mRender\x1b[0m WebGL · xterm.js",
  "",
  "  \x1b[38;5;245m/level\x1b[0m \x1b[38;5;99mgece\x1b[0m \x1b[38;5;245m│\x1b[0m \x1b[38;5;45msiber\x1b[0m \x1b[38;5;245m│\x1b[0m \x1b[38;5;208mkomur\x1b[0m \x1b[38;5;245m│\x1b[0m \x1b[38;5;39mokyanus\x1b[0m \x1b[38;5;245m│\x1b[0m \x1b[38;5;196mkizil\x1b[0m",
  "",
];

export function useIO(xtermRef: RefObject<HTMLDivElement | null>, c: Colors) {
  useEffect(() => {
    const el = xtermRef.current;
    if (!el) return;

    const tr = new TerminalRenderer(el, {
      background: "transparent",
      foreground: c.text   ?? "#e9e9f2",
      cursor:     c.accent ?? "#8c96ff",
    });

    BANNER.forEach(l => tr.writeln(l));

    let ptyId: string | null = null;

    // Girdi tamponu — sadece /level intercepti için
    let lineBuf = "";

    // xterm → PTY ham veri akışı
    const dataListener = tr.onData((d: string) => {
      // Satır tamponu güncelle
      if (d === "\r") {
        const cmd = lineBuf.trim();
        lineBuf = "";

        // /level intercept — PTY'ye gönderme, lokal handle et
        if (cmd.startsWith("/level ")) {
          const name = cmd.slice(7).trim();
          if (LEVELS.includes(name)) {
            window.dispatchEvent(new CustomEvent("orion:level", { detail: name }));
          } else {
            tr.writeln(`\r\n\x1b[33m[orion] bilinmeyen level: ${name}. Seçenekler: ${LEVELS.join(", ")}\x1b[0m`);
          }
          return;
        }

        // Diğer her şey → PTY (Enter dahil)
        if (ptyId) window.orion.pty.write(ptyId, d);
      } else if (d === "\x7f") {
        lineBuf = lineBuf.slice(0, -1);
        if (ptyId) window.orion.pty.write(ptyId, d);
      } else {
        lineBuf += d;
        if (ptyId) window.orion.pty.write(ptyId, d);
      }
    });

    // PTY başlat
    const { cols, rows } = tr.getDimensions();
    window.orion.pty.create(cols, rows, null)
      .then(id => {
        ptyId = id;
        tr.focus();
      })
      .catch((e: Error) => {
        tr.writeln(`\x1b[31m[orion] PTY başlatılamadı: ${e.message}\x1b[0m`);
        tr.writeln("\x1b[38;5;245m[orion] node-pty kurulu değilse: npm install node-pty\x1b[0m");
      });

    // PTY → xterm (veri)
    const unsubData = window.orion.pty.onData(p => {
      if (p.ptyId === ptyId) tr.write(p.data);
    });

    // PTY → xterm (çıkış)
    const unsubExit = window.orion.pty.onExit(p => {
      if (p.ptyId !== ptyId) return;
      ptyId = null;
      tr.writeln("\r\n\x1b[38;5;245m[orion] shell çıktı (kod: " + p.code + ")\x1b[0m");
    });

    // Boyut değişimi → PTY SIGWINCH
    const ro = new ResizeObserver(() => {
      tr.resize();
      if (ptyId) {
        const d = tr.getDimensions();
        window.orion.pty.resize(ptyId, d.cols, d.rows);
      }
    });
    ro.observe(el);

    return () => {
      dataListener.dispose();
      unsubData();
      unsubExit();
      ro.disconnect();
      if (ptyId) window.orion.pty.kill(ptyId);
      tr.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
