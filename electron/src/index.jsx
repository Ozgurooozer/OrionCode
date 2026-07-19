import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const root = createRoot(document.getElementById("root"));

// window.orion preload'da contextBridge ile açılır — eğer preload hiç
// yüklenemediyse (ör. Electron sürüm/sandbox uyuşmazlığı) burada bariz bir
// mesaj gösterilir. Önceki bug'da bu durumda pencere sessizce siyah kalıyordu.
if (!window.orion) {
  root.render(
    <div style={{
      padding: "28px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: "13px",
      color: "#e9e9f2", background: "#08080d", height: "100vh", boxSizing: "border-box",
    }}>
      <div style={{ fontSize: "16px", marginBottom: "12px", color: "#ff8a8a" }}>
        window.orion tanımlı değil
      </div>
      <div>preload.js yüklenmedi ya da contextBridge.exposeInMainWorld çalışmadı.</div>
      <div style={{ marginTop: "10px", opacity: 0.6 }}>Ctrl+Shift+I ile DevTools konsolundaki hatayı kontrol et.</div>
    </div>
  );
} else {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
