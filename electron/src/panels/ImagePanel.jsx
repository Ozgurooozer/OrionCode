import { useState, useCallback, useEffect } from "react";
import { orion } from "../api.js";

// ComfyUI URL'inden görsel alır; görseli görüntüler
function ImageCard({ img, c }) {
  const [err, setErr] = useState(false);
  const name = img.filename ?? img.url?.split("filename=")[1]?.split("&")[0] ?? "görsel";
  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", border: `1px solid ${c.border}`, background: "rgba(255,255,255,0.02)", flexShrink: 0 }}>
      {!err ? (
        <img
          src={img.url}
          alt={name}
          onError={() => setErr(true)}
          style={{ width: "100%", height: "170px", objectFit: "cover", display: "block", cursor: "pointer" }}
          onClick={() => window.open(img.url, "_blank")}
        />
      ) : (
        <div style={{ width: "100%", height: "170px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <span style={{ fontSize: "22px", opacity: 0.3 }}>⊙</span>
          <span style={{ fontSize: "11px", color: c.textDim, opacity: 0.6 }}>ComfyUI kapalı</span>
        </div>
      )}
      <div style={{ padding: "6px 9px", fontSize: "10.5px", color: c.textDim, fontFamily: "ui-monospace, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {decodeURIComponent(name)}
      </div>
    </div>
  );
}

// Command output'ından görsel URL'lerini çıkar
function parseImagesFromOutput(lines) {
  const imgs = [];
  let pendingPath = null;
  for (const line of lines) {
    const urlM = line.match(/URL:\s*(http:\/\/[^\s]+)/);
    const fileM = line.match(/Dosya:\s*(.+)/);
    if (fileM) pendingPath = fileM[1].trim();
    if (urlM) {
      imgs.push({ url: urlM[1], path: pendingPath });
      pendingPath = null;
    }
  }
  return imgs;
}

export default function ImagePanel({ c, initialImages }) {
  const [prompt,   setPrompt]   = useState("");
  const [negative, setNegative] = useState("");
  const [workflow, setWorkflow] = useState(1);
  const [wfList,   setWfList]   = useState([]);
  const [images,   setImages]   = useState(initialImages ?? []);
  const [loading,  setLoading]  = useState(false);
  const [log,      setLog]      = useState("");
  const [showNeg,  setShowNeg]  = useState(false);

  useEffect(() => {
    // Workflow listesi
    orion.command("image", ["list"], null)
      .then(r => setWfList(r.output ?? []))
      .catch(() => {});
    // ComfyUI durum kontrolü
    orion.command("image", ["status"], null)
      .then(r => setLog(r.output?.join("\n") ?? ""))
      .catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setLog("Üretiliyor...");
    const args = [p];
    if (workflow > 1) args.push("--workflow", String(workflow));
    try {
      const r = await orion.command("image", args, null);
      setLog((r.output ?? []).join("\n"));
      const parsed = parseImagesFromOutput(r.output ?? []);
      if (parsed.length > 0) setImages(prev => [...parsed, ...prev]);
    } catch (e) {
      setLog(`✗ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, workflow]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px", boxSizing: "border-box", gap: "10px" }}>

      {/* Prompt area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="Pozitif prompt (İngilizce önerilir)..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && generate()}
            style={inputStyle(c)}
          />
          <button onClick={generate} disabled={loading} style={genBtnStyle(c, loading)}>
            {loading ? "…" : "Üret"}
          </button>
        </div>

        {/* Negative prompt toggle */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setShowNeg(v => !v)} style={tagStyle(c)}>
            {showNeg ? "▾ Negatif" : "▸ Negatif"}
          </button>
          {wfList.length > 0 && (
            <select
              value={workflow}
              onChange={e => setWorkflow(Number(e.target.value))}
              style={{ ...tagStyle(c), background: "rgba(255,255,255,0.05)", cursor: "pointer", appearance: "auto" }}
            >
              {wfList.map((wf, i) => (
                <option key={i} value={i + 1} style={{ background: "#13131c" }}>
                  {i + 1}. {wf.replace(/^\s*\d+\.\s*/, "")}
                </option>
              ))}
            </select>
          )}
        </div>

        {showNeg && (
          <input
            placeholder="Negatif prompt (istenmeyen unsurlar)..."
            value={negative}
            onChange={e => setNegative(e.target.value)}
            style={{ ...inputStyle(c), fontSize: "12px" }}
          />
        )}
      </div>

      {/* Log */}
      {log && (
        <div style={{ fontSize: "11.5px", color: c.textDim, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap", maxHeight: "54px", overflowY: "auto", padding: "4px 0" }}>
          {log}
        </div>
      )}

      {/* Gallery */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {images.length === 0 && !loading && (
          <div style={{ color: c.textDim, fontSize: "12px", opacity: 0.6, textAlign: "center", marginTop: "24px" }}>
            <div style={{ fontSize: "28px", opacity: 0.2, marginBottom: "8px" }}>⬡</div>
            Prompt yazıp Üret'e bas veya chat'te /image kullan
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "8px" }}>
          {images.map((img, i) => <ImageCard key={i} img={img} c={c} />)}
        </div>
      </div>
    </div>
  );
}

const inputStyle = (c) => ({
  flex: 1, background: "rgba(255,255,255,0.05)",
  border: `1px solid ${c.border}`, borderRadius: "8px",
  padding: "8px 12px", color: c.text, fontSize: "13px", outline: "none",
  fontFamily: "inherit",
});

const genBtnStyle = (c, disabled) => ({
  padding: "8px 18px", borderRadius: "8px",
  background: disabled ? "rgba(255,255,255,0.08)" : c.accent,
  color: disabled ? c.textDim : c.bg,
  border: "none", cursor: disabled ? "default" : "pointer",
  fontSize: "13.5px", fontWeight: 600, flexShrink: 0,
  transition: "all .15s",
});

const tagStyle = (c) => ({
  padding: "4px 10px", borderRadius: "6px",
  background: "transparent", color: c.textDim,
  border: `1px solid ${c.border}`, cursor: "pointer",
  fontSize: "11.5px", fontFamily: "ui-monospace, Menlo, monospace",
  flexShrink: 0,
});
