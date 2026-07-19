import { useEffect, useRef, useState, useMemo } from "react";

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
    <div style={{ width: "100%", maxWidth: "760px", height: "100%", display: "flex", flexDirection: "column", padding: "10px 0 22px", boxSizing: "border-box", animation: "orionRise .4s ease both" }}>

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
          return (
            <div key={msg.id} style={styles.aiRow}>
              <div style={styles.aiBadge}>
                <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill={c.accent} /><circle cx="12" cy="12" r="9" fill="none" stroke={c.accent} strokeWidth="1.2" opacity="0.45" strokeDasharray="3 4" /></svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {msg.tools?.map((t, i) => (
                  <div key={i} style={styles.toolLine}>
                    {t.done ? (t.ok ? "→" : "✕") : "*"} {t.tool}{t.input ? ` "${t.input}"` : ""}
                  </div>
                ))}
                <div style={styles.aiText}>{msg.text}{msg.streaming ? "▍" : ""}</div>
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
