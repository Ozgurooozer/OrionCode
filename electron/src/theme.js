// electron/src/theme.js — Orion Home.dc.html'deki `themes` objesinin birebir React karşılığı.
// Kaynak: elektron-masa-st-uygulamas/project/Orion Home.dc.html satır 298-343.
export const THEMES = {
  gece: {
    name: "Gece", desc: "Derin siyah · mor ışıma",
    bg: "#08080d", sidebarBg: "rgba(255,255,255,0.015)",
    glow: "radial-gradient(ellipse 780px 480px at 50% 58%, rgba(72,80,220,0.16), rgba(50,40,140,0.06) 55%, transparent 75%)",
    elevated: "#13131c", hover: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.085)",
    text: "#e9e9f2", textDim: "#8b8b9e",
    accent: "#8c96ff", accentGlow: "rgba(140,150,255,0.22)",
    inputBg: "rgba(255,255,255,0.045)",
    greetGrad: "linear-gradient(92deg, #e9e9f2 20%, #9aa4ff 60%, #c79aff 90%)",
  },
  komur: {
    name: "Kömür", desc: "Nötr koyu · amber",
    bg: "#0c0b09", sidebarBg: "rgba(255,255,255,0.015)",
    glow: "radial-gradient(ellipse 780px 480px at 50% 58%, rgba(214,150,50,0.13), rgba(140,90,30,0.05) 55%, transparent 75%)",
    elevated: "#181611", hover: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.09)",
    text: "#f0ece4", textDim: "#96907f",
    accent: "#e0a84e", accentGlow: "rgba(224,168,78,0.22)",
    inputBg: "rgba(255,255,255,0.045)",
    greetGrad: "linear-gradient(92deg, #f0ece4 20%, #e6b464 60%, #e8875a 90%)",
  },
  okyanus: {
    name: "Okyanus", desc: "Lacivert · camgöbeği",
    bg: "#060b12", sidebarBg: "rgba(255,255,255,0.015)",
    glow: "radial-gradient(ellipse 780px 480px at 50% 58%, rgba(40,150,190,0.15), rgba(20,80,130,0.06) 55%, transparent 75%)",
    elevated: "#0f1722", hover: "rgba(255,255,255,0.055)",
    border: "rgba(255,255,255,0.085)",
    text: "#e6eef5", textDim: "#7f93a5",
    accent: "#4ecbe0", accentGlow: "rgba(78,203,224,0.2)",
    inputBg: "rgba(255,255,255,0.045)",
    greetGrad: "linear-gradient(92deg, #e6eef5 20%, #6fd8ea 60%, #7fa8ff 90%)",
  },
  acik: {
    name: "Açık", desc: "Fildişi · gündüz",
    bg: "#f6f4ef", sidebarBg: "rgba(0,0,0,0.018)",
    glow: "radial-gradient(ellipse 780px 480px at 50% 58%, rgba(110,110,240,0.1), rgba(200,160,255,0.06) 55%, transparent 75%)",
    elevated: "#ffffff", hover: "rgba(0,0,0,0.05)",
    border: "rgba(0,0,0,0.1)",
    text: "#23222b", textDim: "#6d6b7a",
    accent: "#5a5fd6", accentGlow: "rgba(90,95,214,0.18)",
    inputBg: "#ffffff",
    greetGrad: "linear-gradient(92deg, #23222b 20%, #5a5fd6 65%, #9a5ad6 95%)",
  },
};

export const isDark = (themeKey) => themeKey !== "acik";

export const FONTS = {
  inter:  { name: "Inter",      family: "'Inter', system-ui, sans-serif",        desc: "Modern UI · temiz" },
  geist:  { name: "Geist",      family: "'Geist', system-ui, sans-serif",         desc: "Geometric · teknik" },
  dmsans: { name: "DM Sans",    family: "'DM Sans', system-ui, sans-serif",       desc: "Yumuşak · premium" },
  system: { name: "Sistem",     family: "ui-sans-serif, system-ui, 'Segoe UI', sans-serif", desc: "Segoe UI · hızlı" },
};

export const ICONS = {
  search: '<circle cx="10.8" cy="10.8" r="6.6" stroke="currentColor" stroke-width="1.5"/><line x1="15.8" y1="15.8" x2="20.5" y2="20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  vault: '<rect x="4" y="10" width="16" height="10" rx="2.6" stroke="currentColor" stroke-width="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/>',
  router: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.5"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="7.5" height="7.5" rx="3.75" stroke="currentColor" stroke-width="1.5"/>',
  mcp: '<path d="M9 9l6 6M14.5 4.5l-2 2a2.4 2.4 0 0 0 3 3l2-2a2.4 2.4 0 0 0-3-3zM9.5 14.5l-2 2a2.4 2.4 0 0 1-3-3l2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M12 3.8l2.4 5 5.4.6-4 3.8 1.1 5.4L12 15.9l-4.9 2.7 1.1-5.4-4-3.8 5.4-.6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  user: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.5"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2.6" stroke="currentColor" stroke-width="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5"/>',
  gauge: '<path d="M4 15a8 8 0 1 1 16 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 15l3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};
