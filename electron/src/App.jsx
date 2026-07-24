import { useEffect, useState } from "react";
import { THEMES, FONTS } from "./theme.js";
import { buildStyles } from "./styles.js";
import { orion } from "./api.js";
import Titlebar from "./components/Titlebar.jsx";
import Rail from "./components/Rail.jsx";
import ChatPanel from "./panels/ChatPanel.jsx";
import SessionsPanel from "./panels/SessionsPanel.jsx";
import VaultPanel from "./panels/VaultPanel.jsx";
import RouterPanel from "./panels/RouterPanel.jsx";
import ImagePanel from "./panels/ImagePanel.jsx";
import MCPPanel from "./panels/MCPPanel.jsx";
import { TerminalContent } from "../Terminal/Terminal3D";
import { LevelViewerContent } from "../LevelViewer/LevelViewer3D";
import { SceneBackground, Panel, DockStrip, usePanelManager } from "../layers/index";

export default function App() {
  const [theme,  setThemeState] = useState(() => localStorage.getItem("orion-theme") || "gece");
  const [font,   setFontState]  = useState(() => localStorage.getItem("orion-font")  || "inter");
  const [pinned, setPinned]     = useState(() => localStorage.getItem("orion-rail-pinned") === "1");
  const [railHover, setRailHover] = useState(false);
  const [online, setOnline] = useState(false);
  const [levelBg, setLevelBg] = useState(null);

  const { panels, openPanel, closePanel, focusPanel, minimizePanel, maximizePanel, updatePanel } = usePanelManager();

  const c        = THEMES[theme];
  const railOpen = railHover || pinned;
  const styles   = buildStyles(c, theme, railOpen);

  const setTheme    = (key) => { setThemeState(key); localStorage.setItem("orion-theme", key); };
  const setFont     = (key) => { setFontState(key);  localStorage.setItem("orion-font",  key); };
  const onTogglePin = () => setPinned(p => {
    const n = !p; localStorage.setItem("orion-rail-pinned", n ? "1" : "0"); return n;
  });

  const fontFamily = (FONTS[font] ?? FONTS.inter).family;

  // ComfyUI arka plan görseli — LevelViewer'dan event
  useEffect(() => {
    const handler = (e) => setLevelBg(e.detail || null);
    window.addEventListener("orion:level-bg", handler);
    return () => window.removeEventListener("orion:level-bg", handler);
  }, []);

  // Bağlantı durumu — 10sn poll
  useEffect(() => {
    let alive = true;
    async function poll() {
      try { await orion.status(); if (alive) setOnline(true); }
      catch { if (alive) setOnline(false); }
    }
    poll();
    const iv = setInterval(poll, 10_000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // Esc → en üstteki panel'i kapat (Erişilebilirlik Uzmanı)
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return;
      const top = panels.reduce((a, b) => (a.zIndex > b.zIndex ? a : b), panels[0]);
      if (top) closePanel(top.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panels, closePanel]);

  // Başlangıçta bir sohbet paneli aç
  useEffect(() => { openPanel("chat"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily, color: c.text }}>

      {/* ── z=0: Babylon 3D arka plan ───────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <SceneBackground />
      </div>

      {/* ── z=5: Uygulama arka planı (titlebar + glow + level-bg) ──────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}>
        {levelBg && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${levelBg})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18, transition: "opacity 1.2s" }} />
        )}
        <div style={{ ...styles.appBg, background: "transparent", position: "relative", height: "100%" }}>
          <div style={styles.glow} />
        </div>
      </div>

      {/* ── z=6: Titlebar (çekim alanı, her şeyin üstünde) ─────────────── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 6 }}>
        <Titlebar c={c} />
      </div>

      {/* ── z=10: Panel kanvası arka planı (offline uyarısı, boş durum) ── */}
      <div style={{ position: "fixed", top: "38px", left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: "none" }}>
        <div style={{
          width: "100%", height: "100%",
          background: "rgba(8, 8, 13, 0.40)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {!online && (
            <div style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", fontSize: "11px", color: c.textDim, opacity: 0.6, pointerEvents: "none" }}>
              orion-server&apos;a bağlanılamıyor
            </div>
          )}
          {panels.length === 0 && (
            <div style={{ textAlign: "center", pointerEvents: "none", userSelect: "none" }}>
              <div style={{ fontSize: "34px", opacity: 0.06, marginBottom: "14px" }}>⬡</div>
              <div style={{ fontSize: "12px", color: c.textDim, opacity: 0.4, letterSpacing: "0.14em" }}>
                ORION AETHELRED
              </div>
              <div style={{ fontSize: "11px", color: c.textDim, opacity: 0.25, marginTop: "6px" }}>
                Sol railden + ile yeni sohbet aç
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── z=20+: Yüzer paneller ──────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" }}>
        {panels.filter(p => !p.minimized).map(p => (
          <Panel
            key={p.id}
            panel={p}
            onClose={() => closePanel(p.id)}
            onMinimize={() => minimizePanel(p.id)}
            onMaximize={() => maximizePanel(p.id)}
            onFocus={() => focusPanel(p.id)}
            onUpdate={(u) => updatePanel(p.id, u)}
          >
            {p.type === "chat" && (
              <ChatPanel
                theme={theme} font={font} online={online}
                initialSessionId={p.meta?.sessionId ?? null}
                onTitleChange={(t) => updatePanel(p.id, { title: t })}
              />
            )}
            {p.type === "sessions" && (
              <SessionsPanel
                c={c}
                onOpenSession={(id) => openPanel("chat", { sessionId: id })}
              />
            )}
            {p.type === "vault"       && <VaultPanel  c={c} />}
            {p.type === "router"      && <RouterPanel c={c} />}
            {p.type === "mcp"         && <MCPPanel    c={c} />}
            {p.type === "image"       && <ImagePanel  c={c} />}
            {p.type === "terminal"    && <TerminalContent theme={theme} />}
            {p.type === "leveleditor" && <LevelViewerContent theme={theme} />}
          </Panel>
        ))}
      </div>

      {/* ── z=30: DockStrip (minimize edilmiş paneller) ─────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 30, pointerEvents: "none" }}>
        <DockStrip
          panels={panels.filter(p => p.minimized)}
          onRestore={(id) => updatePanel(id, { minimized: false })}
        />
      </div>

      {/* ── z=50: Rail — her zaman panellerin üstünde ───────────────────── */}
      <div style={{ position: "fixed", top: "38px", left: 0, bottom: 0, zIndex: 50 }}>
        <Rail
          c={c} styles={styles} theme={theme} setTheme={setTheme}
          font={font} setFont={setFont}
          railOpen={railOpen}
          onRailEnter={() => setRailHover(true)}
          onRailLeave={() => setRailHover(false)}
          onTogglePin={onTogglePin}
          pinned={pinned}
          onOpenPanel={openPanel}
        />
      </div>

    </div>
  );
}
