import { useState, useEffect } from "react";
import { orion } from "../api.js";

export default function RouterPanel({ c }) {
  const [decisions, setDecisions] = useState([]);
  const [stats, setStats]         = useState([]);

  useEffect(() => {
    orion.command("router", [], null)
      .then(r => setStats(r.output ?? []))
      .catch(() => {});

    const unsub = orion.subscribeEvents(null, (ev) => {
      const relevant = ["router_decision", "tayf_decision", "router_shadow_decision", "tier_selected"];
      if (!relevant.includes(ev.type)) return;
      setDecisions(prev => [{
        ts:       new Date().toLocaleTimeString("tr-TR"),
        type:     ev.type,
        tier:     ev.payload?.tier,
        category: ev.payload?.category ?? ev.payload?.kategoriler,
        input:    ev.payload?.input ?? ev.payload?.text,
        rota:     ev.payload?.rota,
        skill:    ev.payload?.skill,
        budget:   ev.payload?.tahmini_butce,
      }, ...prev].slice(0, 30));
    });
    return unsub;
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px", boxSizing: "border-box", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: c.textDim, letterSpacing: "0.14em" }}>
          TAYF YÖNLENDİRİCİ
        </span>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: decisions.length > 0 ? "#4ecbe0" : c.textDim }}>
          {decisions.length > 0 ? `● canlı · ${decisions.length} karar` : "○ bekleniyor"}
        </span>
      </div>

      {stats.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: `1px solid ${c.border}` }}>
          {stats.slice(0, 8).map((ln, i) => (
            <div key={i} style={{ fontSize: "11.5px", color: c.textDim, fontFamily: "ui-monospace, Menlo, monospace" }}>{ln}</div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
        {decisions.length === 0 && (
          <div style={{ color: c.textDim, fontSize: "12px", opacity: 0.6, textAlign: "center", marginTop: "24px" }}>
            Henüz karar yok<br/>
            <span style={{ fontSize: "11px", opacity: 0.5 }}>Orion'a bir mesaj gönder</span>
          </div>
        )}
        {decisions.map((d, i) => <DecisionCard key={i} d={d} c={c} />)}
      </div>
    </div>
  );
}

function DecisionCard({ d, c }) {
  const isLocal = d.tier === 1 || d.tier === "tier1";
  const tierColor = isLocal ? "#4ecbe0" : "#8c96ff";
  const cats = Array.isArray(d.category) ? d.category : d.category ? [d.category] : [];

  return (
    <div style={{
      padding: "9px 12px", borderRadius: "10px",
      border: `1px solid ${c.border}`,
      background: "rgba(255,255,255,0.02)",
      display: "flex", flexDirection: "column", gap: "5px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10.5px", color: c.textDim, fontFamily: "monospace" }}>{d.ts}</span>
        {cats.map(cat => (
          <span key={cat} style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: `${tierColor}22`, color: tierColor, fontFamily: "monospace" }}>
            {cat}
          </span>
        ))}
        {d.rota && (
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: c.textDim, fontFamily: "monospace", marginLeft: "auto" }}>
            {d.rota}
          </span>
        )}
        {(d.tier !== undefined) && (
          <span style={{ fontSize: "10px", fontWeight: 700, color: tierColor }}>
            {isLocal ? "Tier1" : "Tier2"}
          </span>
        )}
      </div>
      {d.input && (
        <div style={{ fontSize: "12px", color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {String(d.input).slice(0, 72)}
        </div>
      )}
      {(d.skill || d.budget) && (
        <div style={{ fontSize: "10.5px", color: c.textDim, fontFamily: "monospace", display: "flex", gap: "10px" }}>
          {d.skill  && <span>skill:{d.skill}</span>}
          {d.budget && <span>~{d.budget}tok</span>}
        </div>
      )}
    </div>
  );
}
