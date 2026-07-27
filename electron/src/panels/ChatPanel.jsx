import { useState, useRef, useEffect, useCallback } from "react";
import Chat from "../components/Chat.jsx";
import { orion } from "../api.js";
import { THEMES, FONTS } from "../theme.js";
import { buildStyles } from "../styles.js";

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function updateLastAssistant(messages, fn) {
  const idx = messages.map(m => m.role).lastIndexOf("assistant");
  if (idx === -1) return messages;
  const copy = messages.slice();
  copy[idx] = fn(copy[idx]);
  return copy;
}

function preview(input) {
  if (!input || typeof input !== "object") return "";
  const first = Object.values(input)[0];
  return first === undefined ? "" : String(first).slice(0, 60);
}

export default function ChatPanel({ theme, font, online, initialSessionId, onTitleChange }) {
  const [messages, setMessages]   = useState([]);
  const [title, setTitle]         = useState("");
  const [backend, setBackend]     = useState(null);
  const [model, setModel]         = useState(null);
  const [backendsList, setBL]     = useState([]);
  const [commandList, setCL]      = useState([]);
  const sessionIdRef              = useRef(initialSessionId ?? null);

  const c      = THEMES[theme] ?? THEMES.gece;
  const styles = buildStyles(c, theme, false);

  // Bootstrap: backends + commands
  useEffect(() => {
    orion.backends().then(({ backends: list }) => {
      setBL(list ?? []);
      const first = list?.[0];
      if (first) { setBackend(first.name); setModel(first.models?.[0] ?? first.defaultModel ?? first.name); }
    }).catch(() => {});
    orion.commandList().then(({ commands }) => setCL(commands ?? [])).catch(() => {});
  }, []);

  // Load existing session
  useEffect(() => {
    if (!initialSessionId) return;
    orion.sessionDetail(initialSessionId).then(data => {
      const msgs = (data.messages ?? []).map(m => ({ id: uid(), role: m.role, text: m.text ?? "", tools: [] }));
      setMessages(msgs);
      const first = data.messages?.find(m => m.role === "user");
      setTitle(first?.text?.slice(0, 60) ?? "Oturum");
      if (data.backend) setBackend(data.backend);
      if (data.model)   setModel(data.model);
    }).catch(() => {});
  }, [initialSessionId]);

  // Panel başlığını güncelle
  useEffect(() => {
    if (title && onTitleChange) {
      const short = title.slice(0, 26).toUpperCase();
      onTitleChange(short);
    }
  }, [title, onTitleChange]);

  // SSE event stream
  useEffect(() => {
    const unsub = orion.subscribeEvents(null, (ev) => {
      if (sessionIdRef.current && ev.sessionId && ev.sessionId !== sessionIdRef.current) return;
      if (ev.type === "text_delta") {
        setMessages(m => updateLastAssistant(m, mm => ({ ...mm, text: mm.text + (ev.payload?.delta ?? "") })));
      } else if (ev.type === "tool_start") {
        setMessages(m => updateLastAssistant(m, mm => ({
          ...mm, tools: [...(mm.tools ?? []), { tool: ev.payload?.tool, input: preview(ev.payload?.input), done: false }],
        })));
      } else if (ev.type === "tool_end") {
        setMessages(m => updateLastAssistant(m, mm => {
          const tools = mm.tools ?? [];
          if (!tools.length) return mm;
          const next = tools.slice();
          next[next.length - 1] = { ...next[next.length - 1], done: true, ok: ev.payload?.ok };
          return { ...mm, tools: next };
        }));
      } else if (ev.type === "sahne_poz") {
        // sahne.py [POZ:x] → SceneManager.setPoz() (useScene dinliyor)
        window.dispatchEvent(new CustomEvent("orion:poz", { detail: ev.payload?.poz ?? "duruyor" }));
      } else if (ev.type === "sahne_jest") {
        // sahne.py [JEST:x] → SceneManager.setBlend()
        window.dispatchEvent(new CustomEvent("orion:jest", {
          detail: { name: ev.payload?.jest ?? "neutral", weight: ev.payload?.weight ?? 1.0 },
        }));
      }
    });
    return unsub;
  }, []);

  const handleSend = useCallback(async (text) => {
    const userMsg   = { id: uid(), role: "user", text };
    const assistId  = uid();
    setMessages(m => [...m, userMsg, { id: assistId, role: "assistant", text: "", streaming: true, tools: [] }]);
    if (!title) setTitle(text.slice(0, 60));

    try {
      const resp = await orion.chat(text, sessionIdRef.current, backend, model);
      sessionIdRef.current = resp.sessionId;
      if (resp.status) { setBackend(resp.status.backend); setModel(resp.status.model); }
      setMessages(m => m.map(mm => mm.id === assistId ? { ...mm, text: resp.text, streaming: false } : mm));
    } catch (err) {
      setMessages(m => m.map(mm => mm.id === assistId
        ? { ...mm, text: `Hata: ${err.message}`, streaming: false } : mm));
    }
  }, [backend, model, title]);

  const handleCommand = useCallback(async (name, args) => {
    const cmdId = uid();
    setMessages(m => [...m, { id: cmdId, role: "command", name, args, lines: [], loading: true, error: null }]);
    try {
      const resp = await orion.command(name, args, sessionIdRef.current);
      if (resp.sessionId && !sessionIdRef.current) sessionIdRef.current = resp.sessionId;
      if (resp.status) { setBackend(resp.status.backend); setModel(resp.status.model); }
      setMessages(m => m.map(mm => mm.id === cmdId ? { ...mm, lines: resp.output ?? [], loading: false } : mm));
    } catch (err) {
      setMessages(m => m.map(mm => mm.id === cmdId
        ? { ...mm, lines: [], error: err.message, loading: false } : mm));
    }
  }, []);

  return (
    <Chat
      c={c} styles={styles}
      model={model ?? "model seçilmedi"}
      statusOnline={online}
      messages={messages}
      onSend={handleSend}
      onCommand={handleCommand}
      commandList={commandList}
      onGoHome={() => {}}
      title={title}
    />
  );
}
