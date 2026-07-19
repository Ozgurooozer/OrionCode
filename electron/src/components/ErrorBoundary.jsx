import { Component } from "react";

// React render hatasında beyaz/siyah boş ekran yerine görünür mesaj —
// önceki sürümde preload çökünce hiçbir iz kalmadan boş pencere kalıyordu.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[renderer] yakalanmamış hata:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        padding: "28px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: "13px",
        color: "#e9e9f2", background: "#08080d", height: "100vh", boxSizing: "border-box",
        whiteSpace: "pre-wrap", overflow: "auto",
      }}>
        <div style={{ fontSize: "16px", marginBottom: "12px", color: "#ff8a8a" }}>
          Orion Desktop bir hatayla karşılaştı
        </div>
        <div>{String(this.state.error?.stack || this.state.error)}</div>
        <div style={{ marginTop: "16px", opacity: 0.6 }}>Ctrl+Shift+I ile DevTools konsolunu açıp detaylara bakabilirsin.</div>
      </div>
    );
  }
}
