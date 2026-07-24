import { useState, useEffect, useCallback } from "react";
import { orion } from "../api.js";

export default function VaultPanel({ c }) {
  const [view, setView]       = useState("list");
  const [query, setQuery]     = useState("");
  const [lines, setLines]     = useState([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback((args) => {
    setLoading(true);
    return orion.command("vault", args, null)
      .then(r  => { setLines(r.output ?? []); setLoading(false); return r; })
      .catch(e => { setLines([`✗ ${e.message}`]); setLoading(false); });
  }, []);

  useEffect(() => { run([]); }, [run]);

  const search = () => {
    const q = query.trim();
    if (!q) return;
    setView("search");
    run(["search", q]);
  };

  const back = () => { setView("list"); setQuery(""); run([]); };

  const pickId = (line) => {
    const m = line.match(/[0-9a-f]{8,}/);
    if (m) { setView("read"); run(["read", m[0]]); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px", boxSizing: "border-box", gap: "10px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {view !== "list" && (
          <button onClick={back} style={btnStyle(c)}>←</button>
        )}
        <input
          placeholder="Vault'ta ara... (Enter)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          style={inputStyle(c)}
        />
        <button onClick={search} style={{ ...btnStyle(c), background: c.accent, color: c.bg, borderColor: c.accent }}>Ara</button>
      </div>

      {/* Action bar */}
      {view === "list" && (
        <div style={{ display: "flex", gap: "6px" }}>
          {["status", "digest", "probe"].map(cmd => (
            <button key={cmd} onClick={() => { setView(cmd); run([cmd]); }} style={tagStyle(c)}>
              /{cmd}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
        {loading && <Muted c={c}>Yükleniyor...</Muted>}
        {!loading && lines.length === 0 && <Muted c={c}>Sonuç bulunamadı.</Muted>}
        {!loading && lines.map((ln, i) => {
          const isClickable = view === "list" || view === "search";
          return (
            <div
              key={i}
              onClick={isClickable ? () => pickId(ln) : undefined}
              style={{
                fontSize: "12px", color: c.text,
                fontFamily: "ui-monospace, Menlo, monospace",
                whiteSpace: "pre-wrap", lineHeight: 1.55,
                padding: "1px 4px", borderRadius: "4px",
                cursor: isClickable && /[0-9a-f]{8,}/.test(ln) ? "pointer" : "default",
                background: isClickable && /[0-9a-f]{8,}/.test(ln) ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >{ln}</div>
          );
        })}
      </div>
    </div>
  );
}

const Muted = ({ c, children }) => (
  <div style={{ color: c.textDim, fontSize: "12px", opacity: 0.7 }}>{children}</div>
);

const inputStyle = (c) => ({
  flex: 1, background: "rgba(255,255,255,0.05)",
  border: `1px solid ${c.border}`, borderRadius: "8px",
  padding: "7px 12px", color: c.text, fontSize: "13px", outline: "none",
});

const btnStyle = (c) => ({
  padding: "7px 14px", borderRadius: "8px",
  background: "rgba(255,255,255,0.05)", color: c.textDim,
  border: `1px solid ${c.border}`, cursor: "pointer", fontSize: "13px",
  flexShrink: 0,
});

const tagStyle = (c) => ({
  padding: "3px 10px", borderRadius: "6px",
  background: "rgba(255,255,255,0.05)", color: c.textDim,
  border: `1px solid ${c.border}`, cursor: "pointer", fontSize: "11px",
  fontFamily: "ui-monospace, Menlo, monospace",
});
