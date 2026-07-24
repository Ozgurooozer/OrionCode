export default function PlaceholderPanel({ c, icon, title, description }) {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "14px", padding: "32px",
    }}>
      <div style={{ fontSize: "36px", opacity: 0.18, userSelect: "none" }}>{icon ?? "⬡"}</div>
      <div style={{ fontSize: "14px", fontWeight: 600, color: c.text, opacity: 0.45, letterSpacing: "0.04em" }}>
        {title}
      </div>
      <div style={{ fontSize: "12px", color: c.textDim, textAlign: "center", maxWidth: "280px", lineHeight: "1.65", opacity: 0.55 }}>
        {description ?? "Bu panel henüz uygulanmadı."}
      </div>
    </div>
  );
}
