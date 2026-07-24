import { useState, useEffect } from "react";
import { THEMES } from "../src/theme.js";
import type { LevelName } from "../Terminal/scene/LevelManager";

// orion window API — preload.js bağlar
const orion = (window as unknown as { orion: {
  command: (name: string, args: string[], sessionId: null | string) => Promise<{ output?: string[] }>;
}}).orion;

const LEVELS: { id: LevelName; label: string; dot: string }[] = [
  { id: "gece",    label: "Gece",    dot: "#8c96ff" },
  { id: "siber",   label: "Siber",   dot: "#00e5ff" },
  { id: "komur",   label: "Kömür",   dot: "#e0a84e" },
  { id: "okyanus", label: "Okyanus", dot: "#4ecbe0" },
  { id: "kizil",   label: "Kızıl",   dot: "#ff6b6b" },
];

interface ThemeColors { text: string; accent: string; border: string; bg: string; textDim: string; elevated: string; [key: string]: string; }
interface Props { theme: string; }

function parseImageUrl(lines: string[]): string | null {
  for (const ln of lines) {
    const m = ln.match(/URL:\s*(http:\/\/[^\s]+)/);
    if (m) return m[1];
    const p = ln.match(/Dosya:\s*(.+)/);
    if (p) return null; // local path; skip, need URL
  }
  return null;
}

export function LevelViewerContent({ theme }: Props) {
  const c: ThemeColors = (THEMES as Record<string, ThemeColors>)[theme] ?? (THEMES as Record<string, ThemeColors>).gece;
  const [active,     setActive]     = useState<LevelName>("siber");
  const [wfList,     setWfList]     = useState<string[]>([]);
  const [wfIndex,    setWfIndex]    = useState(0);
  const [bgPrompt,   setBgPrompt]   = useState("");
  const [bgImage,    setBgImage]    = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genLog,     setGenLog]     = useState("");
  const [tab,        setTab]        = useState<"levels" | "generate">("levels");

  useEffect(() => {
    orion?.command("image", ["list"], null)
      .then(r => {
        const names = (r.output ?? [])
          .map(ln => ln.replace(/^\s*\d+\.\s*/, "").trim())
          .filter(Boolean);
        setWfList(names);
      })
      .catch(() => {});
  }, []);

  const loadLevel = (name: LevelName) => {
    setActive(name);
    window.dispatchEvent(new CustomEvent("orion:level", { detail: name }));
  };

  const generateBg = async () => {
    const p = bgPrompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    setGenLog("Görsel üretiliyor…");
    try {
      const args: string[] = [p];
      if (wfIndex > 0) { args.push("--workflow"); args.push(String(wfIndex + 1)); }
      const r = await orion.command("image", args, null);
      const lines = r.output ?? [];
      setGenLog(lines.slice(-2).join("\n"));
      const url = parseImageUrl(lines);
      if (url) {
        setBgImage(url);
        window.dispatchEvent(new CustomEvent("orion:level-bg", { detail: url }));
      } else {
        setGenLog("✓ Tamamlandı · URL bulunamadı (ComfyUI kapalı olabilir)");
      }
    } catch (e: unknown) {
      setGenLog(`✗ ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px", boxSizing: "border-box", gap: "12px" }}>

      {/* Sekme başlığı */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10.5px", fontWeight: 700, color: c.textDim, letterSpacing: "0.14em", flex: 1 }}>
          3D LEVEL + COMFYUI
        </span>
        {(["levels", "generate"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "3px 10px", borderRadius: "6px",
            background: tab === t ? `${c.accent}22` : "transparent",
            color: tab === t ? c.accent : c.textDim,
            border: `1px solid ${tab === t ? c.accent + "66" : c.border}`,
            cursor: "pointer", fontSize: "11px",
          }}>
            {t === "levels" ? "Levels" : "Arka Plan Üret"}
          </button>
        ))}
      </div>

      {/* Level seçici */}
      {tab === "levels" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ color: c.textDim, fontSize: "11px", margin: 0, opacity: 0.6 }}>
            Level seçin → 3D sahne anlık geçiş yapar
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {LEVELS.map(lv => (
              <LevelCard
                key={lv.id}
                lv={lv}
                active={active === lv.id}
                c={c}
                bgImage={active === lv.id ? bgImage : null}
                onClick={() => loadLevel(lv.id)}
                onGenerateClick={() => { setTab("generate"); }}
              />
            ))}
          </div>
          {bgImage && (
            <button
              onClick={() => { setBgImage(null); window.dispatchEvent(new CustomEvent("orion:level-bg", { detail: null })); }}
              style={{ padding: "5px 12px", borderRadius: "8px", background: "transparent", border: `1px solid ${c.border}`, color: c.textDim, cursor: "pointer", fontSize: "11.5px", alignSelf: "flex-start" }}
            >
              ✕ Arka planı kaldır
            </button>
          )}
        </div>
      )}

      {/* ComfyUI arka plan üretici */}
      {tab === "generate" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ color: c.textDim, fontSize: "11px", margin: 0, opacity: 0.6 }}>
            3D sahne arka planı için ComfyUI görsel üret
          </p>

          {/* Workflow seçici */}
          {wfList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "10.5px", color: c.textDim, letterSpacing: "0.1em" }}>WORKFLOW</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "160px", overflowY: "auto" }}>
                {wfList.map((wf, i) => (
                  <WfRow key={i} label={wf} selected={wfIndex === i} accent={c.accent} border={c.border} text={c.text} textDim={c.textDim} onClick={() => setWfIndex(i)} />
                ))}
              </div>
            </div>
          )}
          {wfList.length === 0 && (
            <div style={{ fontSize: "11.5px", color: c.textDim, opacity: 0.6 }}>
              ComfyUI kapalı ya da workflow bulunamadı
            </div>
          )}

          {/* Prompt */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10.5px", color: c.textDim, letterSpacing: "0.1em" }}>PROMPT</span>
            <textarea
              placeholder={`${active} seviyesi için sahne arka planı — örn: "cyberpunk city night skyline, neon lights, rain"`}
              value={bgPrompt}
              onChange={e => setBgPrompt(e.target.value)}
              rows={3}
              style={{
                background: "rgba(255,255,255,0.04)", border: `1px solid ${c.border}`, borderRadius: "8px",
                padding: "8px 12px", color: c.text, fontSize: "12.5px", outline: "none",
                fontFamily: "inherit", resize: "none", lineHeight: 1.5,
              }}
            />
          </div>

          <button
            onClick={generateBg}
            disabled={generating || !bgPrompt.trim()}
            style={{
              padding: "9px 18px", borderRadius: "8px",
              background: generating || !bgPrompt.trim() ? "rgba(255,255,255,0.08)" : c.accent,
              color: generating || !bgPrompt.trim() ? c.textDim : c.bg,
              border: "none", cursor: generating || !bgPrompt.trim() ? "default" : "pointer",
              fontSize: "13.5px", fontWeight: 600, transition: "all .15s",
            }}
          >
            {generating ? "Üretiliyor…" : "Sahne Arka Planı Üret"}
          </button>

          {genLog && (
            <div style={{ fontSize: "11px", color: c.textDim, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}>
              {genLog}
            </div>
          )}

          {bgImage && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "10.5px", color: c.textDim }}>Son üretilen arka plan:</span>
              <img
                src={bgImage}
                alt="level bg"
                style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "10px", border: `1px solid ${c.border}`, cursor: "pointer" }}
                onClick={() => window.open(bgImage, "_blank")}
                onError={e => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LevelCard({ lv, active, c, bgImage, onClick, onGenerateClick }: {
  lv: { id: LevelName; label: string; dot: string };
  active: boolean; c: ThemeColors; bgImage: string | null;
  onClick: () => void; onGenerateClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px",
        borderRadius: "10px", cursor: "pointer",
        border: `1px solid ${active ? lv.dot + "88" : c.border}`,
        background: active ? `${lv.dot}14` : "rgba(255,255,255,0.015)",
        transition: "all .15s",
        position: "relative", overflow: "hidden",
      }}
    >
      {bgImage && active && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.2, pointerEvents: "none" }} />
      )}
      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: lv.dot, flexShrink: 0, boxShadow: active ? `0 0 8px ${lv.dot}` : "none" }} />
      <span style={{ fontSize: "13px", fontWeight: active ? 700 : 400, color: active ? lv.dot : c.textDim, flex: 1 }}>{lv.label}</span>
      {active && (
        <button
          onClick={e => { e.stopPropagation(); onGenerateClick(); }}
          style={{ padding: "2px 8px", borderRadius: "5px", background: `${lv.dot}22`, color: lv.dot, border: `1px solid ${lv.dot}44`, cursor: "pointer", fontSize: "10px", flexShrink: 0 }}
        >
          Arka Plan Üret
        </button>
      )}
      {active && !bgImage && (
        <span style={{ fontSize: "10px", color: lv.dot, opacity: 0.7 }}>● aktif</span>
      )}
    </div>
  );
}

function WfRow({ label, selected, accent, border, text, textDim, onClick }: {
  label: string; selected: boolean; accent: string; border: string; text: string; textDim: string; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
      borderRadius: "7px", cursor: "pointer",
      border: `1px solid ${selected ? accent + "55" : border}`,
      background: selected ? `${accent}18` : "transparent",
    }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: selected ? accent : textDim, flexShrink: 0 }} />
      <span style={{ fontSize: "11.5px", color: selected ? text : textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

export default LevelViewerContent;
