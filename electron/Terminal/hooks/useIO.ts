import { useEffect } from "react";
import type { RefObject } from "react";
import { TerminalRenderer } from "../renderer/TerminalRenderer";

// window.orion is exposed by preload.js via contextBridge
declare const window: Window & {
  orion: {
    command: (name: string, args: string[], sessionId: string | null) => Promise<{ output?: string[] }>;
    chat:    (text: string, sessionId: string | null, backend: string | null, model: string | null) => Promise<{ text: string }>;
  };
};

type Colors = Record<string, string | undefined>;

const BANNER = [
  "\x1b[1;35m╔══════════════════════════════════╗\x1b[0m",
  "\x1b[1;35m║   Orion Terminal 3D  v0.1        ║\x1b[0m",
  "\x1b[1;35m╚══════════════════════════════════╝\x1b[0m",
  "",
  "\x1b[38;5;245m  /level <ad>   — arka planı değiştir\x1b[0m",
  "\x1b[38;5;245m  /levels       — mevcut leveller\x1b[0m",
  "\x1b[38;5;245m  /<komut>      — Orion komutu\x1b[0m",
  "\x1b[38;5;245m  <metin>       — Orion'a gönder\x1b[0m",
  "",
];

const LEVELS = ["gece", "siber", "komur", "okyanus", "kizil"];
const PROMPT = "\x1b[1;35m❯\x1b[0m ";

export function useIO(xtermRef: RefObject<HTMLDivElement | null>, c: Colors) {
  useEffect(() => {
    const el = xtermRef.current;
    if (!el) return;

    const tr = new TerminalRenderer(el, {
      background:  "transparent",
      foreground:  c.text  ?? "#e9e9f2",
      cursor:      c.accent ?? "#8c96ff",
    });

    BANNER.forEach(l => tr.writeln(l));
    tr.write(PROMPT);

    let buf = "";
    let busy = false;

    const dataListener = tr.onData((d: string) => {
      if (busy) return;

      if (d === "\r") {                       // Enter
        const cmd = buf.trim();
        buf = "";
        tr.writeln("");

        if (!cmd) { tr.write(PROMPT); return; }

        // /level <ad>
        if (cmd.startsWith("/level ")) {
          const name = cmd.slice(7).trim();
          const ok = LEVELS.includes(name);
          if (ok) {
            window.dispatchEvent(new CustomEvent("orion:level", { detail: name }));
            tr.writeln(`\x1b[32m✔ Level değişti: ${name}\x1b[0m`);
          } else {
            tr.writeln(`\x1b[31m✘ Bilinmeyen level. Seçenekler: ${LEVELS.join(", ")}\x1b[0m`);
          }
          tr.write(PROMPT);
          return;
        }

        // /levels
        if (cmd === "/levels") {
          LEVELS.forEach(n => tr.writeln(`  \x1b[35m${n}\x1b[0m`));
          tr.write(PROMPT);
          return;
        }

        // /komut [args]
        if (cmd.startsWith("/")) {
          const parts = cmd.slice(1).split(/\s+/);
          const name  = parts[0];
          const args  = parts.slice(1);
          busy = true;
          tr.write("\x1b[38;5;245m⟳ \x1b[0m");
          window.orion.command(name, args, null)
            .then(r => {
              tr.writeln("\r\x1b[K");
              (r.output ?? []).forEach((l: string) => tr.writeln("  " + l));
            })
            .catch((e: Error) => {
              tr.writeln(`\r\x1b[K\x1b[31m✘ ${e.message}\x1b[0m`);
            })
            .finally(() => { busy = false; tr.write(PROMPT); });
          return;
        }

        // serbest metin → Orion sohbet
        busy = true;
        tr.write("\x1b[38;5;245m⟳ \x1b[0m");
        window.orion.chat(cmd, null, null, null)
          .then(r => {
            tr.writeln("\r\x1b[K");
            r.text.split("\n").forEach((l: string) => tr.writeln("  " + l));
          })
          .catch((e: Error) => {
            tr.writeln(`\r\x1b[K\x1b[31m✘ ${e.message}\x1b[0m`);
          })
          .finally(() => { busy = false; tr.write(PROMPT); });

      } else if (d === "\x7f") {              // Backspace
        if (buf.length > 0) {
          buf = buf.slice(0, -1);
          tr.write("\b \b");
        }
      } else if (d >= " " || d === "\t") {   // yazdırılabilir
        buf += d;
        tr.write(d);
      }
    });

    const ro = new ResizeObserver(() => tr.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      dataListener.dispose();
      tr.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
