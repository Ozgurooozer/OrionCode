import { useEffect, useRef, useState, useMemo, Fragment } from "react";

// "/" ile başlayan girdiyi komut adı + args olarak ayrıştır
function parseCommand(text) {
  if (!text.startsWith("/")) return null;
  const parts = text.slice(1).trim().split(/\s+/);
  const name = parts[0]?.toLowerCase();
  if (!name) return null;
  return { name, args: parts.slice(1) };
}

// Fuzzy eşleşme: her karakter sırayla arama stringinde bulunmalı
function fuzzyMatch(query, target) {
  let qi = 0;
  for (let i = 0; i < target.length && qi < query.length; i++) {
    if (target[i].toLowerCase() === query[qi].toLowerCase()) qi++;
  }
  return qi === query.length;
}

// ── Basit Markdown renderer (harici bağımlılık yok) ───────────────────────────
// Desteklenen: ```code block```, `inline code`, **bold**, *italic*, # heading, - list
function MarkdownText({ text, styles, c }) {
  if (!text) return null;

  // Önce code block'ları ayır
  const codeBlockRe = /```(?:\w+)?\n?([\s\S]*?)```/g;
  const parts = [];
  let last = 0, m;

  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "inline", text: text.slice(last, m.index) });
    parts.push({ type: "code", text: m[1].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "inline", text: text.slice(last) });

  return (
    <div style={styles.aiText}>
      {parts.map((p, i) => {
        if (p.type === "code") {
          return (
            <pre key={i} style={styles.code}>{p.text}</pre>
          );
        }
        // Inline formatting: satır satır işle
        return (
          <div key={i}>
            {p.text.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                <InlineLine line={line} c={c} styles={styles} />
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function InlineLine({ line, c, styles }) {
  // Heading
  if (/^#{1,3}\s/.test(line)) {
    const lvl = line.match(/^(#{1,3})/)[1].length;
    const txt = line.replace(/^#{1,3}\s/, "");
    const sz = lvl === 1 ? "16px" : lvl === 2 ? "14.5px" : "13.5px";
    return <div style={{ fontSize: sz, fontWeight: 700, color: c.text, marginTop: "8px", marginBottom: "3px" }}>{txt}</div>;
  }
  // List item
  if (/^[-*+]\s/.test(line)) {
    const txt = line.replace(/^[-*+]\s/, "");
    return (
      <div style={{ display: "flex", gap: "7px", marginLeft: "4px" }}>
        <span style={{ color: c.textDim, flexShrink: 0 }}>·</span>
        <span><InlineSpans text={txt} c={c} /></span>
      </div>
    );
  }
  return <span><InlineSpans text={line} c={c} /></span>;
}

function InlineSpans({ text, c }) {
  // **bold** | *italic* | `inline code`
  const tokens = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: "text", t: text.slice(last, m.index) });
    const raw = m[1];
    if (raw.startsWith("**")) tokens.push({ type: "bold",   t: raw.slice(2, -2) });
    else if (raw.startsWith("*")) tokens.push({ type: "italic", t: raw.slice(1, -1) });
    else tokens.push({ type: "code",   t: raw.slice(1, -1) });
    last = m.index + raw.length;
  }
  if (last < text.length) tokens.push({ type: "text", t: text.slice(last) });

  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === "bold")   return <strong key={i} style={{ color: c.text, fontWeight: 700 }}>{tok.t}</strong>;
        if (tok.type === "italic") return <em key={i} style={{ color: c.text }}>{tok.t}</em>;
        if (tok.type === "code")   return <code key={i} style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "12.5px", padding: "1px 5px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", color: c.accent }}>{tok.t}</code>;
        return <span key={i}>{tok.t}</span>;
      })}
    </>
  );
}

// ComfyUI görsel URL'i tespit et
function extractImageUrl(text) {
  const m = text?.match(/URL:\s*(http:\/\/127\.0\.0\.1:8188[^\s]+)/);
  return m ? m[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Chat({ c, styles, model, statusOnline, messages, onSend, onCommand, commandList, onGoHome, title }) {
  const [text, setText] = useState("");
  const [paletteIdx, setPaletteIdx] = useState(0);
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  // Mesaj listesi eklenince en alta kaydır
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Palet: "/" ile başlayan ve henüz boşluk içermeyen sorgular ─────────
  const paletteQuery = useMemo(() => {
    if (!text.startsWith("/")) return "";
    const after = text.slice(1);
    // Boşluk varsa kullanıcı args yazıyor → paleti kapat
    if (after.includes(" ")) return "";
    return after.toLowerCase();
  }, [text]);

  const paletteItems = useMemo(() => {
    if (!paletteQuery && text !== "/") return [];
    return (commandList ?? []).filter(cmd => {
      if (!paletteQuery) return true; // sadece "/" yazılmışsa hepsini göster
      if (cmd.name.startsWith(paletteQuery)) return true;
      if (cmd.aliases?.some(a => a.startsWith(paletteQuery))) return true;
      if (fuzzyMatch(paletteQuery, cmd.name)) return true;
      return false;
    }).slice(0, 9);
  }, [paletteQuery, text, commandList]);

  const paletteOpen = paletteItems.length > 0;

  // idx sınır kontrolü
  const safeIdx = Math.min(paletteIdx, Math.max(0, paletteItems.length - 1));

  // ── Gönder ─────────────────────────────────────────────────────────────
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    setPaletteIdx(0);

    // Slash komut mu?
    const cmd = parseCommand(trimmed);
    if (cmd) {
      onCommand(cmd.name, cmd.args);
      return;
    }
    onSend(trimmed);
  };

  // ── Klavye yönetimi ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (paletteOpen) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIdx(i => Math.max(0, i - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIdx(i => Math.min(paletteItems.length - 1, i + 1));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const chosen = paletteItems[safeIdx];
        if (chosen) {
          setText("/" + chosen.name + " ");
          setPaletteIdx(0);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setText("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // ── Palet öğesine tıkla ────────────────────────────────────────────────
  const pickCommand = (cmd) => {
    setText("/" + cmd.name + " ");
    setPaletteIdx(0);
    inputRef.current?.focus();
  };

  return (
    <div style={{ width: "100%", maxWidth: "840px", height: "100%", margin: "0 auto", display: "flex", flexDirection: "column", padding: "0 20px 20px", boxSizing: "border-box" }}>

      {/* Başlık */}
      <div style={styles.chatHead}>
        <div onClick={onGoHome} style={{ width: "30px", height: "30px", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 6l-6 6 6 6" stroke={c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13.5px", fontWeight: 600, color: c.text }}>{title || "yeni oturum"}</div>
          <div style={{ fontSize: "11px", color: c.textDim }}>{model} · {messages.filter(m => m.role !== "command").length} mesaj</div>
        </div>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusOnline ? c.accent : c.textDim }} />
      </div>

      {/* Mesaj listesi */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px", padding: "4px 6px" }}>
        {messages.map(msg => {
          if (msg.role === "user") {
            return <div key={msg.id} style={styles.userBubble}>{msg.text}</div>;
          }
          if (msg.role === "command") {
            return <CommandBlock key={msg.id} msg={msg} styles={styles} c={c} />;
          }
          // assistant
          const imgUrl = extractImageUrl(msg.text);
          return (
            <div key={msg.id} style={styles.aiRow}>
              <div style={styles.aiBadge}>
                <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill={c.accent} /><circle cx="12" cy="12" r="9" fill="none" stroke={c.accent} strokeWidth="1.2" opacity="0.45" strokeDasharray="3 4" /></svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {msg.tools?.map((t, i) => (
                  <div key={i} style={styles.toolLine}>
                    <span style={{ color: t.done ? (t.ok ? c.accent : "#f87171") : c.textDim }}>
                      {t.done ? (t.ok ? "✓" : "✕") : "○"}
                    </span>
                    {" "}{t.tool}{t.input ? <span style={{ color: c.textDim }}> {t.input}</span> : ""}
                  </div>
                ))}
                {imgUrl && (
                  <div style={{ marginTop: "8px", marginBottom: "6px" }}>
                    <img src={imgUrl} alt="generated" style={{ maxWidth: "100%", maxHeight: "320px", borderRadius: "10px", border: `1px solid ${c.border}`, cursor: "pointer", display: "block" }} onClick={() => window.open(imgUrl, "_blank")} onError={e => e.currentTarget.style.display = "none"} />
                  </div>
                )}
                {msg.streaming
                  ? <div style={styles.aiText}>{msg.text || ""}▍</div>
                  : <MarkdownText text={msg.text} styles={styles} c={c} />
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Giriş alanı + komut paleti */}
      <div style={{ marginTop: "16px", position: "relative" }}>

        {/* Komut paleti */}
        {paletteOpen && (
          <div style={styles.palette}>
            <div style={styles.paletteHeader}>KOMUTLAR</div>
            <div style={styles.paletteList}>
              {paletteItems.map((cmd, i) => (
                <div
                  key={cmd.name}
                  style={styles.paletteItem(i === safeIdx)}
                  onMouseDown={e => { e.preventDefault(); pickCommand(cmd); }}
                  onMouseEnter={() => setPaletteIdx(i)}
                >
                  <span style={styles.paletteCmd}>/{cmd.name}</span>
                  <span style={styles.paletteDesc}>{cmd.desc}</span>
                  {cmd.group && <span style={styles.paletteGroup}>{cmd.group}</span>}
                </div>
              ))}
            </div>
            <div style={styles.paletteHint}>
              <span>↑↓ gezin</span>
              <span>Tab/Enter seç</span>
              <span>Esc kapat</span>
            </div>
          </div>
        )}

        <div style={styles.inputBar}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c.textDim} strokeWidth="1.7" strokeLinecap="round" /></svg>
          </div>
          <input
            ref={inputRef}
            placeholder="Yanıtla... veya / komut"
            style={{
              ...styles.textInput,
              color: text.startsWith("/") ? c.accent : c.text,
            }}
            value={text}
            onChange={e => { setText(e.target.value); setPaletteIdx(0); }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div onClick={submit} style={{ width: "34px", height: "34px", borderRadius: "50%", background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke={c.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Komut çıktı bloğu ────────────────────────────────────────────────────────
function CommandBlock({ msg, styles, c }) {
  return (
    <div style={styles.cmdBlock}>
      <div style={styles.cmdHead}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M4 17l5-5-5-5M11 19h9" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={styles.cmdSlash}>/</span>
        <span style={styles.cmdName}>{msg.name}</span>
        {msg.args?.length > 0 && (
          <span style={styles.cmdArgs}>{msg.args.join(" ")}</span>
        )}
        {msg.loading && (
          <span style={{ marginLeft: "auto", fontSize: "11px", color: c.textDim, fontStyle: "italic" }}>
            çalışıyor…
          </span>
        )}
      </div>
      <div style={styles.cmdBody}>
        {msg.loading && !msg.lines?.length && (
          <div style={styles.cmdLoading}>·</div>
        )}
        {msg.lines?.map((line, i) => (
          <div key={i} style={styles.cmdLine}>{line}</div>
        ))}
        {msg.error && (
          <div style={styles.cmdError}>✗ {msg.error}</div>
        )}
        {!msg.loading && !msg.error && msg.lines?.length === 0 && (
          <div style={styles.cmdLoading}>✓ tamam</div>
        )}
      </div>
    </div>
  );
}
