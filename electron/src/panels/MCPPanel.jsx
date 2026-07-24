import { useState, useEffect, useCallback } from "react";
import { orion } from "../api.js";

export default function MCPPanel({ c }) {
  const [lines,    setLines]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [section,  setSection]  = useState("list");

  const load = useCallback((sub) => {
    setLoading(true);
    orion.command("mcp", sub ? [sub] : [], null)
      .then(r  => { setLines(r.output ?? []); setLoading(false); })
      .catch(e => { setLines([`✗ ${e.message}`]); setLoading(false); });
  }, []);

  useEffect(() => { load(null); }, [load]);

  const tabs = [
    { key: "list",  label: "Bağlı" },
    { key: "tools", label: "Araçlar" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px", boxSizing: "border-box", gap: "12px" }}>

      {/* Header + tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: c.textDim, letterSpacing: "0.14em" }}>MCP SUNUCULARI</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setSection(t.key); load(t.key === "list" ? null : t.key); }}
              style={{
                padding: "3px 10px", borderRadius: "6px",
                background: section === t.key ? `${c.accent}22` : "transparent",
                color: section === t.key ? c.accent : c.textDim,
                border: `1px solid ${section === t.key ? c.accent + "66" : c.border}`,
                cursor: "pointer", fontSize: "11px",
              }}
            >{t.label}</button>
          ))}
          <button onClick={() => load(section === "list" ? null : section)}
            style={{ padding: "3px 10px", borderRadius: "6px", background: "none", border: `1px solid ${c.border}`, color: c.textDim, cursor: "pointer", fontSize: "13px" }}>
            ↻
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
        {loading && <div style={{ color: c.textDim, fontSize: "12px" }}>Yükleniyor...</div>}
        {!loading && lines.length === 0 && (
          <div style={{ color: c.textDim, fontSize: "12px", opacity: 0.6, textAlign: "center", marginTop: "24px" }}>
            <div style={{ fontSize: "24px", opacity: 0.2, marginBottom: "8px" }}>⬢</div>
            MCP sunucusu bağlı değil
          </div>
        )}
        {!loading && lines.map((ln, i) => (
          <div key={i} style={{
            fontSize: "12px", color: c.text,
            fontFamily: "ui-monospace, Menlo, monospace",
            whiteSpace: "pre-wrap", lineHeight: 1.55,
            padding: "1px 4px",
          }}>{ln}</div>
        ))}
      </div>
    </div>
  );
}
