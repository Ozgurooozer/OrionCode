import { useState, useRef, useEffect } from "react";

const CHIPS = ["Kod tabanını özetle", "Test yaz", "Hata ayıkla", "Refactor öner"];

export default function Home({ c, styles, model, modelDot, backendsList, onPickModel, onSend, onOpenTerminal, onOpenLevelViewer }) {
  const [text, setText] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef(null);

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    if (!modelMenuOpen) return;
    const handler = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelMenuOpen]);

  const submit = (t) => {
    const trimmed = (t ?? text).trim();
    if (!trimmed) return;
    setText("");
    onSend(trimmed);
  };

  // backendsList: [{ name, models, defaultModel }] → düz model listesi
  const flatModels = (backendsList ?? []).flatMap(b =>
    (b.models?.length ? b.models : [b.defaultModel].filter(Boolean)).map(m => ({
      backend: b.name, name: m,
      tag: b.name === "ollama" ? "yerel" : "bulut",
      dot: b.name === "ollama" ? "#5dbb7a" : c.accent,
    }))
  );

  return (
    <div style={{ width: "100%", maxWidth: "680px", animation: "orionRise .6s ease both" }}>
      <div style={{ textAlign: "center", marginBottom: "34px" }}>
        <h1 style={styles.greeting}>Sizin sıranız, Özgür.</h1>
      </div>

      <div style={styles.inputBar}>
        <IconBtn c={c} onClick={() => {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c.textDim} strokeWidth="1.7" strokeLinecap="round" /></svg>
        </IconBtn>
        <input
          placeholder="Orion'a sorun"
          style={styles.textInput}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          autoFocus
        />
        <div style={{ position: "relative" }} ref={modelMenuRef}>
          <div onClick={() => setModelMenuOpen(o => !o)}
               style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", borderRadius: "18px", cursor: "pointer", whiteSpace: "nowrap" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: modelDot ?? c.accent }} />
            <span style={{ fontSize: "12.5px", fontWeight: 500, color: c.textDim }}>{model}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          {modelMenuOpen && (
            <div style={styles.modelMenu}>
              {flatModels.length === 0 && (
                <div style={{ padding: "9px 11px", fontSize: "12px", color: c.textDim }}>Kullanılabilir backend bulunamadı</div>
              )}
              {flatModels.map(m => (
                <div key={`${m.backend}:${m.name}`} style={styles.menuRow}
                     onClick={() => { onPickModel(m.backend, m.name); setModelMenuOpen(false); }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.dot, flex: "none" }} />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  <span style={{ fontSize: "10.5px", color: c.textDim }}>{m.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <IconBtn c={c} onClick={() => {}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <rect x="9.2" y="3.5" width="5.6" height="11" rx="2.8" stroke={c.textDim} strokeWidth="1.6" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" stroke={c.textDim} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconBtn>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "22px", flexWrap: "wrap" }}>
        {CHIPS.map(chip => (
          <div key={chip} style={styles.chip} onClick={() => submit(chip)}>{chip}</div>
        ))}
      </div>

      {/* 3D butonlar */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "28px" }}>
        <TerminalBtn c={c} onClick={onOpenTerminal} />
        <LevelViewerBtn c={c} onClick={onOpenLevelViewer} />
      </div>
    </div>
  );
}

function TerminalBtn({ c, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 20px", borderRadius: "14px", cursor: "pointer",
        border: `1px solid ${h ? c.accent : c.border}`,
        background: h ? `${c.accent}18` : c.elevated,
        transition: "border-color .15s, background .15s",
        boxShadow: h ? `0 0 16px ${c.accentGlow}` : "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="3" stroke={h ? c.accent : c.textDim} strokeWidth="1.5"/>
        <path d="M7 9l4 3-4 3" stroke={h ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="13" y1="15" x2="17" y2="15" stroke={h ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: "13.5px", fontWeight: 600, color: h ? c.accent : c.textDim }}>
        3D Terminal
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
        <path d="M7 17L17 7M17 7H7M17 7v10" stroke={h ? c.accent : c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function LevelViewerBtn({ c, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 20px", borderRadius: "14px", cursor: "pointer",
        border: `1px solid ${h ? c.accent : c.border}`,
        background: h ? `${c.accent}18` : c.elevated,
        transition: "border-color .15s, background .15s",
        boxShadow: h ? `0 0 16px ${c.accentGlow}` : "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          stroke={h ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"
          stroke={h ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="22.08" x2="12" y2="12"
          stroke={h ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: "13.5px", fontWeight: 600, color: h ? c.accent : c.textDim }}>
        Level Viewer
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
        <path d="M7 17L17 7M17 7H7M17 7v10" stroke={h ? c.accent : c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function IconBtn({ c, onClick, children }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
         style={{
           width: "34px", height: "34px", borderRadius: "50%", display: "flex",
           alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none",
           background: h ? c.hover : "transparent",
         }}>
      {children}
    </div>
  );
}
