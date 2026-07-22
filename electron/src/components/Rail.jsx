import { useState } from "react";
import Icon from "./Icon.jsx";
import { THEMES, FONTS, ICONS } from "../theme.js";

// terminal3d ikon — monospace ekran simgesi
const ICON_TERMINAL = '<rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 9l4 3-4 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="15" x2="17" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';

// level viewer ikon — küp
const ICON_CUBE = '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';

const NAV_ITEMS = [
  { key: "sessions",   label: "Oturumlar",         icon: ICONS.clock,   view: false },
  { key: "vault",      label: "Hafıza Kasası",      icon: ICONS.vault,   view: false },
  { key: "router",     label: "Model Yönlendirici", icon: ICONS.router,  view: false },
  { key: "mcp",        label: "MCP Sunucuları",     icon: ICONS.mcp,     view: false },
  { key: "_sep" },  // ayraç
  { key: "terminal3d",  label: "3D Terminal",    icon: ICON_TERMINAL, view: true },
  { key: "levelviewer", label: "Level Viewer",   icon: ICON_CUBE,     view: true },
];

const SETTINGS_ITEMS = [
  { key: "profile",  label: "Kişisel Profil",     icon: ICONS.user },
  { key: "vault",    label: "Vault Yönetimi",      icon: ICONS.lock },
  { key: "limits",   label: "Kullanım Sınırları",  icon: ICONS.gauge },
];

export default function Rail({
  c, styles, theme, setTheme, font, setFont, railOpen,
  onRailEnter, onRailLeave, onTogglePin, pinned,
  onNewSession, sessions, onLoadSession, currentSessionId,
  onSetView,
}) {
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [themeSubOpen, setThemeSubOpen]   = useState(false);
  const [fontSubOpen,  setFontSubOpen]    = useState(false);
  const [activeNav,    setActiveNav]      = useState(null);

  const anyOpen = settingsOpen;

  const toggleNav = (key) => setActiveNav(n => n === key ? null : key);

  return (
    <div style={styles.rail} onMouseEnter={onRailEnter} onMouseLeave={onRailLeave}>
      {anyOpen && (
        <div onClick={() => { setSettingsOpen(false); setThemeSubOpen(false); }}
             style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      )}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 10px 14px", boxSizing: "border-box" }}>

        {/* Sabitle */}
        <RailRow style={styles.railItem} hover={c.hover} onClick={onTogglePin}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
            <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9.6" y1="4.2" x2="9.6" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6.4" cy="8" r="0.9" fill="currentColor" />
          </svg>
          {railOpen && <span style={styles.railLabel}>{pinned ? "Sabitlemeyi kaldır" : "Sabitle"}</span>}
        </RailRow>

        <div style={{ height: "14px" }} />

        {/* Yeni Oturum */}
        <RailRow style={styles.cta} onClick={onNewSession}
                 hoverBoxShadow={`0 0 0 1px ${c.accent} inset, 0 4px 24px ${c.accentGlow}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
            <path d="M12 4v16M4 12h16" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {railOpen && <span style={{ fontSize: "13.5px", fontWeight: 600, color: c.accent, whiteSpace: "nowrap" }}>Yeni Oturum</span>}
        </RailRow>

        <div style={{ height: "18px" }} />

        {/* Navigasyon */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {NAV_ITEMS.map(nav => {
            // ── ayraç ──────────────────────────────────────────────────────
            if (nav.key === "_sep") return (
              <div key="_sep" style={{ height: "1px", background: c.border, margin: "6px 4px" }} />
            );
            return (
              <RailRow key={nav.key} style={{
                ...styles.railItem,
                ...(activeNav === nav.key ? { background: c.hover } : {}),
              }} hover={c.hover} onClick={() => {
                if (nav.view && onSetView) {
                  setActiveNav(null);  // açık panel varsa kapat
                  onSetView(nav.key);
                } else {
                  toggleNav(nav.key);
                }
              }}>
                <Icon path={nav.icon} size={19} />
                {railOpen && <span style={styles.railLabel}>{nav.label}</span>}
                {railOpen && nav.view && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "auto", opacity: 0.45 }}>
                    <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </RailRow>
            );
          })}
        </div>

        {/* Oturum paneli */}
        {railOpen && activeNav === "sessions" && (
          <SessionPanel
            c={c} styles={styles}
            sessions={sessions ?? []}
            onLoadSession={onLoadSession}
            currentSessionId={currentSessionId}
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Hesap + Ayarlar */}
        <div style={{ position: "relative" }}>
          <RailRow style={styles.accountRow} hover={c.hover}
                   onClick={() => setSettingsOpen(o => !o)}>
            <div style={styles.avatar}>Ö</div>
            {railOpen && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: c.text, whiteSpace: "nowrap" }}>Özgür</div>
                  <div style={{ fontSize: "11px", color: c.textDim, whiteSpace: "nowrap" }}>yerel · çevrimiçi</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: "none", opacity: 0.6 }}>
                  <circle cx="12" cy="12" r="2.6" stroke={c.textDim} strokeWidth="1.5" />
                  <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </>
            )}
          </RailRow>

          {settingsOpen && (
            <div style={styles.popover}>
              <div style={{ padding: "10px 12px 8px", display: "flex", alignItems: "center", gap: "10px", borderBottom: `1px solid ${c.border}`, marginBottom: "5px" }}>
                <div style={styles.avatar}>Ö</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>Özgür</div>
                  <div style={{ fontSize: "11px", color: c.textDim }}>BYOK · yerel profil</div>
                </div>
              </div>

              {SETTINGS_ITEMS.map(it => (
                <RailRow key={it.key} style={styles.menuRow} hover={c.hover}>
                  <Icon path={it.icon} size={16} style={{ color: c.textDim }} />
                  <span>{it.label}</span>
                </RailRow>
              ))}

              <div style={{ height: "1px", background: c.border, margin: "5px 6px" }} />

              {/* Tema seçici */}
              <div style={{ position: "relative" }}>
                <RailRow style={styles.menuRow} hover={c.hover}
                         onMouseEnter={() => setThemeSubOpen(true)} onMouseLeave={() => setThemeSubOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: "none", color: c.textDim }}>
                    <path d="M12 3a9 9 0 1 0 9 9c0-.6-.5-1-1.1-1H18a3 3 0 0 1-3-3V6.1c0-.6-.4-1.1-1-1.1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="8" cy="10" r="1.1" fill="currentColor" />
                    <circle cx="10" cy="15.5" r="1.1" fill="currentColor" />
                  </svg>
                  <span style={{ flex: 1 }}>Tema</span>
                  <span style={{ fontSize: "11.5px", color: c.textDim }}>{c.name}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

                  {themeSubOpen && (
                    <div style={styles.submenu}>
                      <div style={{ padding: "6px 10px 8px", fontSize: "10.5px", letterSpacing: "0.12em", fontWeight: 600, color: c.textDim }}>TEMA SEÇ</div>
                      {Object.entries(THEMES).map(([key, t]) => (
                        <RailRow key={key} style={styles.themeRow} hover={c.hover} onClick={() => setTheme(key)}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: t.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: t.accent }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12.5px", fontWeight: 500, color: c.text }}>{t.name}</div>
                            <div style={{ fontSize: "10.5px", color: c.textDim }}>{t.desc}</div>
                          </div>
                          {theme === key && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </RailRow>
                      ))}
                    </div>
                  )}
                </RailRow>
              </div>

              {/* Font seçici */}
              <div style={{ position: "relative" }}>
                <RailRow style={styles.menuRow} hover={c.hover}
                         onMouseEnter={() => setFontSubOpen(true)} onMouseLeave={() => setFontSubOpen(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: "none", color: c.textDim }}>
                    <path d="M4 20h4M12 20h4M8 20L12 4l4 16M6 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ flex: 1 }}>Font</span>
                  <span style={{ fontSize: "11.5px", color: c.textDim }}>{FONTS[font]?.name ?? "Inter"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={c.textDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>

                  {fontSubOpen && (
                    <div style={styles.submenu}>
                      <div style={{ padding: "6px 10px 8px", fontSize: "10.5px", letterSpacing: "0.12em", fontWeight: 600, color: c.textDim }}>FONT SEÇ</div>
                      {Object.entries(FONTS).map(([key, f]) => (
                        <RailRow key={key} style={styles.themeRow} hover={c.hover} onClick={() => setFont(key)}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: c.elevated, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: f.family, fontSize: "14px", fontWeight: 600, color: c.text }}>
                            Aa
                          </div>
                          <div style={{ flex: 1, fontFamily: f.family }}>
                            <div style={{ fontSize: "12.5px", fontWeight: 500, color: c.text }}>{f.name}</div>
                            <div style={{ fontSize: "10.5px", color: c.textDim }}>{f.desc}</div>
                          </div>
                          {font === key && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                        </RailRow>
                      ))}
                    </div>
                  )}
                </RailRow>
              </div>

              <RailRow style={styles.menuRow} hover={c.hover}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: "none", color: c.textDim }}>
                  <path d="M4 8l8 5 8-5M4 8v9h16V8M4 8l8-4 8 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span>Sağlayıcılar (API)</span>
              </RailRow>

              <div style={{ height: "1px", background: c.border, margin: "5px 6px" }} />

              <RailRow style={styles.menuRow} hover={c.hover}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: "none", color: c.textDim }}>
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 16v.01M12 8a2.2 2.2 0 0 1 2.2 2.2c0 1.6-2.2 1.6-2.2 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Yardım</span>
              </RailRow>
              <div style={{ padding: "7px 12px 4px", fontSize: "10.5px", color: c.textDim, opacity: 0.65 }}>Orion · v0.2 masaüstü</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Oturum Paneli ────────────────────────────────────────────────────────────
function SessionPanel({ c, styles, sessions, onLoadSession, currentSessionId }) {
  if (!sessions.length) {
    return (
      <div style={{ padding: "12px 11px", fontSize: "12px", color: c.textDim }}>
        Kayıtlı oturum yok
      </div>
    );
  }

  const fmt = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000)  return "az önce";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)} dk`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} sa`;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <div style={{
      marginTop: "8px", borderTop: `1px solid ${c.border}`,
      paddingTop: "8px", overflowY: "auto", maxHeight: "280px",
      display: "flex", flexDirection: "column", gap: "2px",
    }}>
      <div style={{ padding: "3px 11px 6px", fontSize: "10.5px", letterSpacing: "0.1em", fontWeight: 600, color: c.textDim }}>
        GEÇMİŞ OTURUMLAR
      </div>
      {sessions.slice(0, 20).map(s => (
        <RailRow
          key={s.id}
          style={{
            ...styles.sessionCard,
            ...(s.id === currentSessionId ? { background: c.hover } : {}),
          }}
          hover={c.hover}
          onClick={() => onLoadSession?.(s.id)}
        >
          <div style={styles.sessionCardTitle}>
            {s.preview ? s.preview.slice(0, 38) : s.id}
          </div>
          <div style={styles.sessionCardMeta}>
            {s.model ?? s.backend ?? "?"} · {s.msgCount ?? 0} mesaj · {fmt(s.updatedAt)}
          </div>
        </RailRow>
      ))}
    </div>
  );
}

// ── Hover davranışı olan genel satır bileşeni ────────────────────────────────
function RailRow({ style, hover, hoverBoxShadow, onClick, onMouseEnter, onMouseLeave, children }) {
  const [h, setH] = useState(false);
  return (
    <div
      style={{
        ...style,
        ...(h && hover ? { background: hover } : {}),
        ...(h && hoverBoxShadow ? { boxShadow: hoverBoxShadow } : {}),
      }}
      onClick={onClick}
      onMouseEnter={e => { setH(true); onMouseEnter?.(e); }}
      onMouseLeave={e => { setH(false); onMouseLeave?.(e); }}
    >
      {children}
    </div>
  );
}
