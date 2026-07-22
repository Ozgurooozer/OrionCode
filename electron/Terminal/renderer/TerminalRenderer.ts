import { Terminal, type IDisposable } from "@xterm/xterm";
import { FitAddon }     from "@xterm/addon-fit";
import { SearchAddon }  from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
// NOT: WebglAddon allowTransparency'yi desteklemiyor — canvas renderer'da kalıyoruz

export interface TerminalTheme {
  background:  string;
  foreground:  string;
  cursor:      string;
  selectionBackground?: string;
}

export class TerminalRenderer {
  private term:   Terminal;
  private fit:    FitAddon;
  private search: SearchAddon;

  constructor(container: HTMLDivElement, theme: TerminalTheme) {
    this.fit    = new FitAddon();
    this.search = new SearchAddon();
    this.term   = new Terminal({
      fontFamily:        "'Cascadia Code', 'JetBrains Mono', 'Fira Code', monospace",
      fontSize:          14,
      lineHeight:        1.5,
      cursorBlink:       true,
      cursorStyle:       "bar",
      allowTransparency: true,
      convertEol:        true,
      scrollback:        5000,
      theme: {
        background:          theme.background,
        foreground:          theme.foreground,
        cursor:              theme.cursor,
        selectionBackground: theme.selectionBackground ?? "rgba(140,150,255,0.25)",
        black:   "#1a1a2e",  brightBlack:   "#4a4a6a",
        red:     "#ff6b6b",  brightRed:     "#ff8a80",
        green:   "#6bcf6b",  brightGreen:   "#80ff80",
        yellow:  "#ffd93d",  brightYellow:  "#ffe57a",
        blue:    "#6495ed",  brightBlue:    "#87ceeb",
        magenta: "#b48ead",  brightMagenta: "#c79aff",
        cyan:    "#4ecbe0",  brightCyan:    "#80ffe8",
        white:   "#e9e9f2",  brightWhite:   "#ffffff",
      },
    });

    this.term.loadAddon(this.fit);
    this.term.loadAddon(this.search);
    this.term.loadAddon(new WebLinksAddon());
    this.term.open(container);
    requestAnimationFrame(() => { this.fit.fit(); });
  }

  write(data: string)    { this.term.write(data); }
  writeln(data: string)  { this.term.writeln(data); }
  onData(cb: (d: string) => void): IDisposable { return this.term.onData(cb); }
  resize()               { try { this.fit.fit(); } catch { /* detached */ } }
  dispose()              { this.term.dispose(); }
  getDimensions()        { return { cols: this.term.cols, rows: this.term.rows }; }
  focus()                { this.term.focus(); }
  findNext(q: string)    { this.search.findNext(q); }
  findPrevious(q: string){ this.search.findPrevious(q); }
}
