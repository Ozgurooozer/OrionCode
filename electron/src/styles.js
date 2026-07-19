// electron/src/styles.js — Orion Home.dc.html'deki renderVals() içindeki *Style
// template-literal'larının React style-object karşılığı. Piksel değerleri,
// renkler, geçişler kaynak tasarımdan birebir taşındı (satır 416-438).
import { isDark } from "./theme.js";

// rgba(..., 0.22) gibi accentGlow değerlerinde son alpha'yı doğru değiştirir.
// Basit string.replace("0.2", x) gece/komur temalarında "0.22" → "0.132" üretiyordu.
const alpha = (rgba, a) => rgba.replace(/,\s*[\d.]+\)$/, `, ${a})`);

export function buildStyles(c, theme, railOpen) {
  const dark = isDark(theme);
  const shadow = dark ? "0 18px 50px rgba(0,0,0,0.5)" : "0 18px 50px rgba(30,30,60,0.14)";

  return {
    dark,
    shadow,
    appBg: {
      position: "relative", width: "100%", height: "100vh",
      background: c.bg, color: c.text, boxSizing: "border-box",
      transition: "background .35s ease",
    },
    glow: {
      position: "absolute", inset: 0, background: c.glow,
      pointerEvents: "none", animation: "orionPulse 9s ease-in-out infinite",
    },
    rail: {
      width: railOpen ? "248px" : "62px", flex: "none", background: "transparent",
      transition: "width .24s cubic-bezier(.4,0,.2,1)", boxSizing: "border-box", overflow: "visible",
    },
    railItem: {
      display: "flex", alignItems: "center", gap: "12px", padding: "10px 11px",
      borderRadius: "11px", cursor: "pointer", color: c.textDim,
      transition: "background .15s, color .15s",
    },
    railLabel: { fontSize: "13.5px", fontWeight: 500, whiteSpace: "nowrap", color: c.text },
    cta: {
      display: "flex", alignItems: "center", gap: "12px", padding: "10px 11px",
      borderRadius: "12px", cursor: "pointer",
      background: alpha(c.accentGlow, 0.1),
      boxShadow: `0 0 0 1px ${c.border} inset`, transition: "box-shadow .2s",
    },
    accountRow: {
      display: "flex", alignItems: "center", gap: "10px", padding: "8px 7px",
      borderRadius: "12px", cursor: "pointer", transition: "background .15s",
    },
    avatar: {
      width: "28px", height: "28px", borderRadius: "50%",
      background: `linear-gradient(135deg, ${c.accent}, ${c.accent}88)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "12px", fontWeight: 700, color: dark ? "#0a0a10" : "#fff", flex: "none",
    },
    popover: {
      position: "absolute", bottom: "52px", left: "2px", width: "248px",
      background: c.elevated, border: `1px solid ${c.border}`, borderRadius: "16px",
      boxShadow: shadow, padding: "6px", zIndex: 50,
    },
    submenu: {
      position: "absolute", left: "calc(100% + 8px)", bottom: "-6px", width: "216px",
      background: c.elevated, border: `1px solid ${c.border}`, borderRadius: "14px",
      boxShadow: shadow, padding: "6px", zIndex: 51,
    },
    menuRow: {
      display: "flex", alignItems: "center", gap: "10px", padding: "9px 11px",
      borderRadius: "9px", cursor: "pointer", fontSize: "13px", color: c.text,
      position: "relative", transition: "background .12s",
    },
    themeRow: {
      display: "flex", alignItems: "center", gap: "10px", padding: "7px 9px",
      borderRadius: "10px", cursor: "pointer", transition: "background .12s",
    },
    greeting: {
      fontFamily: "inherit", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 400,
      letterSpacing: "-0.02em", margin: 0, background: c.greetGrad,
      WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      textWrap: "balance",
    },
    inputBar: {
      display: "flex", alignItems: "center", gap: "8px", background: c.inputBg,
      border: `1px solid ${c.border}`, borderRadius: "30px", padding: "8px 10px 8px 12px",
      backdropFilter: "blur(14px)",
      boxShadow: `0 1px 0 rgba(255,255,255,${dark ? "0.04" : "0"}) inset, 0 14px 44px ${dark ? "rgba(0,0,0,0.35)" : "rgba(40,40,80,0.08)"}`,
      transition: "border-color .2s",
    },
    textInput: {
      flex: 1, border: "none", outline: "none", background: "transparent",
      fontSize: "15px", color: c.text, padding: "9px 4px", fontFamily: "inherit", minWidth: 0,
    },
    modelMenu: {
      position: "absolute", bottom: "44px", right: 0, width: "190px",
      background: c.elevated, border: `1px solid ${c.border}`, borderRadius: "13px",
      boxShadow: shadow, padding: "6px", zIndex: 50,
    },
    chip: {
      padding: "8px 15px", borderRadius: "20px", border: `1px solid ${c.border}`,
      fontSize: "12.5px", color: c.textDim, cursor: "pointer",
      transition: "border-color .18s, color .18s", background: c.inputBg,
    },
    userBubble: {
      alignSelf: "flex-end", maxWidth: "72%",
      background: alpha(c.accentGlow, 0.13),
      border: `1px solid ${c.border}`, borderRadius: "18px 18px 4px 18px",
      padding: "11px 15px", fontSize: "14px", lineHeight: 1.55, color: c.text,
    },
    aiRow: { display: "flex", gap: "12px", alignItems: "flex-start", maxWidth: "88%" },
    aiText: { fontSize: "14px", lineHeight: 1.65, color: c.text, paddingTop: "3px", whiteSpace: "pre-wrap" },
    code: {
      marginTop: "10px", background: dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.05)",
      border: `1px solid ${c.border}`, borderRadius: "12px", padding: "13px 15px",
      fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace", fontSize: "12px",
      lineHeight: 1.6, color: c.textDim, whiteSpace: "pre", overflowX: "auto",
    },
    aiBadge: {
      width: "26px", height: "26px", borderRadius: "50%", flex: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1px solid ${c.border}`, background: c.elevated, marginTop: "2px",
    },
    chatHead: {
      display: "flex", alignItems: "center", gap: "10px", padding: "2px 4px 14px",
      borderBottom: `1px solid ${c.border}`, marginBottom: "18px",
    },
    toolLine: {
      fontSize: "12px", color: c.textDim, fontFamily: "ui-monospace, Menlo, monospace",
      padding: "2px 0",
    },

    // ── Komut çıktı bloğu ───────────────────────────────────────────────────
    cmdBlock: {
      fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace",
      fontSize: "12.5px",
      background: dark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
      border: `1px solid ${c.border}`,
      borderRadius: "12px",
      overflow: "hidden",
      maxWidth: "88%",
    },
    cmdHead: {
      display: "flex", alignItems: "center", gap: "7px",
      padding: "8px 13px",
      borderBottom: `1px solid ${c.border}`,
      background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)",
    },
    cmdSlash: {
      fontSize: "11px", fontWeight: 700, color: c.accent, opacity: 0.8,
    },
    cmdName: {
      fontSize: "12px", fontWeight: 600, color: c.text,
    },
    cmdArgs: {
      fontSize: "12px", color: c.textDim,
    },
    cmdBody: {
      padding: "10px 13px", display: "flex", flexDirection: "column", gap: "3px",
    },
    cmdLine: {
      fontSize: "12.5px", lineHeight: 1.55, color: c.text, whiteSpace: "pre-wrap",
    },
    cmdError: {
      fontSize: "12.5px", color: "#f87171", padding: "6px 0",
    },
    cmdLoading: {
      fontSize: "12px", color: c.textDim, fontStyle: "italic",
    },

    // ── Komut paleti ─────────────────────────────────────────────────────────
    palette: {
      position: "absolute", bottom: "calc(100% + 10px)", left: 0, right: 0,
      background: c.elevated, border: `1px solid ${c.border}`,
      borderRadius: "14px", boxShadow: shadow,
      overflow: "hidden", zIndex: 100,
    },
    paletteHeader: {
      padding: "8px 13px 6px",
      fontSize: "10.5px", letterSpacing: "0.1em", fontWeight: 600,
      color: c.textDim, borderBottom: `1px solid ${c.border}`,
    },
    paletteList: {
      overflowY: "auto", maxHeight: "240px",
    },
    paletteItem: (active) => ({
      display: "flex", alignItems: "baseline", gap: "10px",
      padding: "9px 13px", cursor: "pointer",
      background: active ? alpha(c.accentGlow, 0.12) : "transparent",
      borderLeft: `2px solid ${active ? c.accent : "transparent"}`,
      transition: "background .1s",
    }),
    paletteCmd: {
      fontSize: "13px", fontWeight: 600, color: c.accent,
      fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "nowrap",
    },
    paletteDesc: {
      fontSize: "12px", color: c.textDim, flex: 1,
    },
    paletteGroup: {
      fontSize: "10px", color: c.textDim, opacity: 0.6,
      fontFamily: "ui-monospace, Menlo, monospace",
    },
    paletteHint: {
      padding: "6px 13px",
      fontSize: "10.5px", color: c.textDim, opacity: 0.6,
      borderTop: `1px solid ${c.border}`,
      display: "flex", gap: "12px",
    },

    // ── Oturum kartı (Rail) ────────────────────────────────────────────────
    sessionCard: {
      display: "flex", flexDirection: "column", gap: "3px",
      padding: "8px 11px", borderRadius: "10px", cursor: "pointer",
      transition: "background .12s",
    },
    sessionCardTitle: {
      fontSize: "12.5px", fontWeight: 500, color: c.text,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    },
    sessionCardMeta: {
      fontSize: "10.5px", color: c.textDim, whiteSpace: "nowrap",
    },
  };
}
