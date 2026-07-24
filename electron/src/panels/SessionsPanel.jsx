import { useState, useEffect, useCallback } from "react";
import { orion } from "../api.js";

export default function SessionsPanel({ c, onOpenSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    orion.sessions()
      .then(list => { setSessions(Array.isArray(list) ? list : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fmt = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000)      return "az önce";
    if (diff < 3_600_000)   return `${Math.round(diff / 60_000)} dk`;
    if (diff < 86_400_000)  return `${Math.round(diff / 3_600_000)} sa`;
    return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 12px", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: c.textDim, letterSpacing: "0.14em" }}>
          GEÇMİŞ OTURUMLAR
        </span>
        <button
          onClick={refresh}
          style={{
            background: "none", border: `1px solid ${c.border}`,
            cursor: "pointer", color: c.textDim,
            fontSize: "13px", padding: "2px 10px", borderRadius: "7px",
            transition: "border-color .12s, color .12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.color = c.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textDim; }}
        >
          ↻
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
        {loading && (
          <div style={{ color: c.textDim, fontSize: "12px", padding: "12px 4px" }}>Yükleniyor...</div>
        )}
        {!loading && sessions.length === 0 && (
          <div style={{ color: c.textDim, fontSize: "12px", padding: "12px 4px", opacity: 0.7 }}>Kayıtlı oturum yok</div>
        )}
        {sessions.slice(0, 60).map(s => (
          <SessionRow key={s.id} s={s} c={c} fmt={fmt} onOpen={onOpenSession} />
        ))}
      </div>
    </div>
  );
}

function SessionRow({ s, c, fmt, onOpen }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={() => onOpen?.(s.id)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
        border: `1px solid ${h ? c.accent + "55" : c.border}`,
        background: h ? c.hover : "rgba(255,255,255,0.015)",
        transition: "background .12s, border-color .12s",
      }}
    >
      <div style={{ fontSize: "13px", color: c.text, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {s.preview ? s.preview.slice(0, 52) : (s.id?.slice(0, 18) + "…")}
      </div>
      <div style={{ fontSize: "11px", color: c.textDim, display: "flex", gap: "8px" }}>
        <span>{s.model ?? s.backend ?? "?"}</span>
        <span>·</span>
        <span>{s.msgCount ?? 0} mesaj</span>
        <span>·</span>
        <span>{fmt(s.updatedAt)}</span>
      </div>
    </div>
  );
}
