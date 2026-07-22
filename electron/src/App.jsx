import { useEffect, useRef, useState, useCallback } from "react";
import { THEMES, FONTS } from "./theme.js";
import { buildStyles } from "./styles.js";
import { orion } from "./api.js";
import Titlebar from "./components/Titlebar.jsx";
import Rail from "./components/Rail.jsx";
import Home from "./components/Home.jsx";
import Chat from "./components/Chat.jsx";
import { TerminalContent } from "../Terminal/Terminal3D";
import { LevelViewerContent } from "../LevelViewer/LevelViewer3D";
import { SceneBackground, Panel, DockStrip, usePanelManager } from "../layers/index";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function updateLastAssistant(messages, fn) {
  const idx = messages.map(m => m.role).lastIndexOf("assistant");
  if (idx === -1) return messages;
  const copy = messages.slice();
  copy[idx] = fn(copy[idx]);
  return copy;
}

export default function App() {
  const [theme, setThemeState] = useState(() => localStorage.getItem("orion-theme") || "gece");
  const [font,  setFontState]  = useState(() => localStorage.getItem("orion-font")  || "inter");
  const [pinned, setPinned] = useState(() => localStorage.getItem("orion-rail-pinned") === "1");
  const [railHover, setRailHover] = useState(false);
  const [view, setView] = useState("home"); // "home" | "chat"
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const [online, setOnline] = useState(false);
  const [backendsList, setBackendsList] = useState([]);
  const [backend, setBackend] = useState(null);
  const [model, setModel] = useState(null);
  const [commandList, setCommandList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);

  const sessionIdRef       = useRef(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const unsubRef = useRef(null);

  // Panel yönetimi
  const { panels, openPanel, closePanel, focusPanel, minimizePanel, updatePanel } = usePanelManager();

  const c = THEMES[theme];
  const railOpen = railHover || pinned;
  const styles = buildStyles(c, theme, railOpen);

  const setTheme = (key) => { setThemeState(key); localStorage.setItem("orion-theme", key); };
  const setFont  = (key) => { setFontState(key);  localStorage.setItem("orion-font",  key); };
  const onTogglePin = () => setPinned(p => { const n = !p; localStorage.setItem("orion-rail-pinned", n ? "1" : "0"); return n; });

  // Rail'den gelen view değişikliği — terminal/leveleditor panel, geri kalanı normal view
  const handleSetView = useCallback((key) => {
    if (key === "terminal3d")  { openPanel("terminal"); }
    else if (key === "levelviewer") { openPanel("leveleditor"); }
    else setView(key);
  }, [openPanel]);

  // ── Bağlantı durumu ──────────────────────────────────────────────────────
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

  // ── Backend/model listesi ────────────────────────────────────────────────
  useEffect(() => {
    orion.backends().then(({ backends: list }) => {
      setBackendsList(list ?? []);
      const first = list?.[0];
      if (first) {
        setBackend(first.name);
        setModel(first.models?.[0] ?? first.defaultModel ?? first.name);
      }
    }).catch(() => {});
  }, []);

  // ── Komut listesi ────────────────────────────────────────────────────────
  useEffect(() => {
    orion.commandList()
      .then(({ commands }) => setCommandList(commands ?? []))
      .catch(() => {});
  }, []);

  // ── Oturum listesi ───────────────────────────────────────────────────────
  const refreshSessions = useCallback(() => {
    orion.sessions()
      .then(list => setSessionsList(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  // ── SSE olay işleme ──────────────────────────────────────────────────────
  const handleEvent = useCallback((ev) => {
    if (sessionIdRef.current && ev.sessionId && ev.sessionId !== sessionIdRef.current) return;

    if (ev.type === "text_delta") {
      setMessages(m => updateLastAssistant(m, mm => ({ ...mm, text: mm.text + (ev.payload?.delta ?? "") })));
    } else if (ev.type === "tool_start") {
      setMessages(m => updateLastAssistant(m, mm => ({
        ...mm, tools: [...(mm.tools ?? []), { tool: ev.payload?.tool, input: _preview(ev.payload?.input), done: false }],
      })));
    } else if (ev.type === "tool_end") {
      setMessages(m => updateLastAssistant(m, mm => {
        const tools = mm.tools ?? [];
        if (!tools.length) return mm;
        const next = tools.slice();
        next[next.length - 1] = { ...next[next.length - 1], done: true, ok: ev.payload?.ok };
        return { ...mm, tools: next };
      }));
    }
  }, []);

  useEffect(() => {
    unsubRef.current = orion.subscribeEvents(null, handleEvent);
    return () => unsubRef.current?.();
  }, [handleEvent]);

  // ── Mesaj gönder ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const userMsg = { id: uid(), role: "user", text };
    const assistantId = uid();
    setMessages(m => [...m, userMsg, { id: assistantId, role: "assistant", text: "", streaming: true, tools: [] }]);
    setView("chat");
    if (!title) setTitle(text.slice(0, 60));

    try {
      const resp = await orion.chat(text, sessionIdRef.current, backend, model);
      sessionIdRef.current = resp.sessionId;
      setCurrentSessionId(resp.sessionId);
      if (resp.status) { setBackend(resp.status.backend); setModel(resp.status.model); }
      setMessages(m => m.map(mm => mm.id === assistantId ? { ...mm, text: resp.text, streaming: false } : mm));
      refreshSessions();
    } catch (err) {
      setMessages(m => m.map(mm => mm.id === assistantId
        ? { ...mm, text: `Hata: ${err.message}`, streaming: false }
        : mm));
    }
  }, [backend, model, title, refreshSessions]);

  // ── Komut çalıştır ───────────────────────────────────────────────────────
  const handleCommand = useCallback(async (name, args) => {
    const cmdId = uid();
    const cmdMsg = { id: cmdId, role: "command", name, args, lines: [], loading: true, error: null };
    setMessages(m => [...m, cmdMsg]);
    setView("chat");

    try {
      const resp = await orion.command(name, args, sessionIdRef.current);
      if (resp.sessionId && !sessionIdRef.current) {
        sessionIdRef.current = resp.sessionId;
        setCurrentSessionId(resp.sessionId);
      }
      if (resp.status) { setBackend(resp.status.backend); setModel(resp.status.model); }
      setMessages(m => m.map(mm => mm.id === cmdId
        ? { ...mm, lines: resp.output ?? [], loading: false }
        : mm));
      refreshSessions();
    } catch (err) {
      setMessages(m => m.map(mm => mm.id === cmdId
        ? { ...mm, lines: [], error: err.message, loading: false }
        : mm));
    }
  }, [refreshSessions]);

  // ── Oturum yükle ─────────────────────────────────────────────────────────
  const handleLoadSession = useCallback(async (id) => {
    try {
      const data = await orion.sessionDetail(id);
      const sid = data.id ?? id;
      sessionIdRef.current = sid;
      setCurrentSessionId(sid);

      const msgs = (data.messages ?? []).map(m => ({
        id: uid(), role: m.role, text: m.text, tools: [],
      }));
      setMessages(msgs);
      const firstUser = data.messages?.find(m => m.role === "user");
      setTitle(firstUser?.text?.slice(0, 60) ?? "Oturum");
      if (data.backend) setBackend(data.backend);
      if (data.model) setModel(data.model);
      setView("chat");
    } catch (err) {
      console.error("Oturum yüklenemedi:", err.message);
    }
  }, []);

  const onNewSession = () => {
    sessionIdRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    setTitle("");
    setView("home");
  };

  const fontFamily = (FONTS[font] ?? FONTS.inter).family;

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily, color: c.text }}>

      {/* ── LAYER 0: Babylon 3D sahne — her zaman render ─────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <SceneBackground />
      </div>

      {/* ── LAYER 1: App chrome (Titlebar + Rail + ana içerik) ────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 10 }}>
        <div style={{ ...styles.appBg, background: "transparent", position: "relative", height: "100%" }}>
          <div style={styles.glow} />
          <Titlebar c={c} />
          <div style={{ display: "flex", height: "calc(100vh - 38px)", position: "relative", zIndex: 5 }}>
            <Rail
              c={c} styles={styles} theme={theme} setTheme={setTheme}
              font={font} setFont={setFont}
              railOpen={railOpen}
              onRailEnter={() => setRailHover(true)} onRailLeave={() => setRailHover(false)}
              onTogglePin={onTogglePin} pinned={pinned}
              onNewSession={onNewSession}
              sessions={sessionsList}
              onLoadSession={handleLoadSession}
              currentSessionId={currentSessionId}
              onSetView={handleSetView}
            />
            <div style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              position: "relative", padding: "0 32px",
              overflow: "hidden", minWidth: 0,
              background: "rgba(8, 8, 13, 0.52)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}>
              {!online && (
                <div style={{ position: "absolute", top: "10px", fontSize: "11.5px", color: c.textDim, opacity: 0.75 }}>
                  orion-server'a bağlanılamıyor — sunucu başlatılıyor olabilir
                </div>
              )}
              {view === "home" ? (
                <Home c={c} styles={styles} model={model ?? "model seçilmedi"}
                      modelDot={backend === "ollama" ? "#5dbb7a" : c.accent}
                      backendsList={backendsList}
                      onPickModel={(b, m) => { setBackend(b); setModel(m); }}
                      onSend={handleSend}
                      onOpenTerminal={() => openPanel("terminal")}
                      onOpenLevelViewer={() => openPanel("leveleditor")} />
              ) : (
                <Chat c={c} styles={styles} model={model ?? "model seçilmedi"} statusOnline={online}
                      messages={messages} onSend={handleSend} onCommand={handleCommand}
                      commandList={commandList}
                      onGoHome={() => setView("home")}
                      title={title} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── LAYER 2: Floating panels ───────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" }}>
        {panels.filter(p => !p.minimized).map(p => (
          <Panel
            key={p.id}
            panel={p}
            onClose={() => closePanel(p.id)}
            onMinimize={() => minimizePanel(p.id)}
            onFocus={() => focusPanel(p.id)}
            onUpdate={(u) => updatePanel(p.id, u)}
          >
            {p.type === "terminal"    && <TerminalContent theme={theme} />}
            {p.type === "leveleditor" && <LevelViewerContent theme={theme} />}
          </Panel>
        ))}
      </div>

      {/* ── LAYER 3: DockStrip (minimized) ───────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 30, pointerEvents: "none" }}>
        <DockStrip
          panels={panels.filter(p => p.minimized)}
          onRestore={(id) => updatePanel(id, { minimized: false })}
        />
      </div>
    </div>
  );
}

function _preview(input) {
  if (!input || typeof input !== "object") return "";
  const first = Object.values(input)[0];
  return first === undefined ? "" : String(first).slice(0, 60);
}
