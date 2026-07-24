import { useState } from "react";
import Icon from "./Icon.jsx";
import { THEMES, FONTS, ICONS } from "../theme.js";

const ICON_TERMINAL = '<rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 9l4 3-4 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="15" x2="17" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
const ICON_CUBE     = '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="1.5"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/>';

// Her nav item doğrudan bir panel tipine map edilir
const NAV_ITEMS = [
  { key: "sessions",    label: "Oturumlar",          icon: ICONS.clock  },
  { key: "vault",       label: "Hafıza Kasası",       icon: ICONS.vault  },
  { key: "router",      label: "Model Yönlendirici",  icon: ICONS.router },
  { key: "mcp",         label: "MCP Sunucuları",      icon: ICONS.mcp    },
  { key: "image",       label: "Görsel Üretici",      icon: ICONS.image  },
  { key: "_sep" },
  { key: "terminal",    label: "Terminal",             icon: ICON_TERMINAL },
  { key: "leveleditor", label: "Level Viewer",         icon: ICON_CUBE     },
];

const SETTINGS_ITEMS = [
  { key: "profile", label: "Kişisel Profil",    icon: ICONS.user  },
  { key: "vault",   label: "Vault Yönetimi",    icon: ICONS.lock  },
  { key: "limits",  label: "Kullanım Sınırları", icon: ICONS.gauge },
];

export default function Rail({
  c, styles, theme, setTheme, font, setFont,
  railOpen, onRailEnter, onRailLeave,
  onTogglePin, pinned, onOpenPanel,
}) {
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [themeSubOpen,  setThemeSubOpen]  = useState(false);
  const [fontSubOpen,   setFontSubOpen]   = useState(false);

  return (
    <div style={styles.rail} onMouseEnter={onRailEnter} onMouseLeave={onRailLeave}>
      {settingsOpen && (
        <div
          onClick={() => { setSettingsOpen(false); setThemeSubOpen(false); setFontSubOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 10px 14px", boxSizing: "border-box" }}>

        {/* Pin */}
        <RailRow style={styles.railItem} hover={c.hover} onClick={onTogglePin}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
            <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9.6" y1="4.2" x2="9.6" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6.4" cy="8" r="0.9" fill="currentColor" />
          </svg>
          {railOpen && <span style={styles.railLabel}>{pinned ? "Sabitlemeyi kaldır" : "Sabitle"}</span>}
        </RailRow>

        <div style={{ height: "14px" }} />

        {/* Yeni sohbet */}
        <RailRow
          style={styles.cta}
          hover={c.hover}
          hoverBoxShadow={`0 0 0 1px ${c.accent} inset, 0 4px 24px ${c.accentGlow}`}
          onClick={() => onOpenPanel?.("chat")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: "none" }}>
            <path d="M12 4v16M4 12h16" stroke={c.accent} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {railOpen && (
            <span style={{ fontSize: "13.5px", fontWeight: 600, color: c.accent, whiteSpace: "nowrap" }}>
              Yeni Sohbet
            </span>
          )}
        </RailRow>

        <div style={{ height: "18px" }} />

        {/* Nav — her item bir paneli açar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {NAV_ITEMS.map(nav => {
            if (nav.key === "_sep") return (
              <div key="_sep" style={{ height: "1px", background: c.border, margin: "6px 4px" }} />
            );
            return (
              <RailRow
                key={nav.key}
                style={styles.railItem}
                hover={c.hover}
                onClick={() => onOpenPanel?.(nav.key)}
              >
                <Icon path={nav.icon} size={19} />
                {railOpen && (
                  <>
                    <span style={styles.railLabel}>{nav.label}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "auto", opacity: 0.35 }}>
                      <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </RailRow>
            );
          })}
        </div>

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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: "none", opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="2.6" stroke={c.textDim} strokeWidth="1.5" />
                  <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18"
                        stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </>
            )}
          </RailRow>

          {settingsOpen && (
            <div style={styles.popover}>
              {/* Profil başlık */}
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
                          <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: c.elevated, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: f.family, fontSize: "14px", fontWeight: 600, color: c.text }}>Aa</div>
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

              <div style={{ padding: "7px 12px 4px", fontSize: "10.5px", color: c.textDim, opacity: 0.55 }}>
                Orion · v0.2 masaüstü
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

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
