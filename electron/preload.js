// electron/preload.js — contextIsolation + sandbox köprüsü.
// ÖNEMLİ: sandbox:true altında (main.js'te öyle) preload'da require() sadece
// 'electron', 'events', 'timers', 'url' ile sınırlıdır — 'http' burada ASLA
// çalışmaz (önceki sürümün siyah ekran bug'ının kök nedeni buydu). Bu yüzden
// tüm ağ trafiği main.js'e taşındı, burası sadece ipcRenderer'ı sarmalıyor.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// SSE artık main process'te tek bağlantı — buradan sadece dinleniyor.
// sub(sessionId, onEvent) → unsubscribe fonksiyonu döner.
function subscribeEvents(sessionId, onEvent) {
  const listener = (_event, payload) => {
    if (sessionId && payload?.sessionId && payload.sessionId !== sessionId) return;
    onEvent(payload);
  };
  ipcRenderer.on("orion:event", listener);
  return () => ipcRenderer.removeListener("orion:event", listener);
}

contextBridge.exposeInMainWorld("orion", {
  // Pencere kontrolleri
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose:    () => ipcRenderer.invoke("window:close"),

  // orion-server.js REST — gerçek istek main.js'te yapılır, burası sadece IPC
  status:   () => ipcRenderer.invoke("orion:status"),
  sessions: () => ipcRenderer.invoke("orion:sessions"),
  backends: () => ipcRenderer.invoke("orion:backends"),
  chat:     (text, sessionId, backend, model) =>
    ipcRenderer.invoke("orion:chat", { text, sessionId, backend, model }),
  message:  (to, text, from) => ipcRenderer.invoke("orion:message", { to, text, from }),

  // Komut sistemi
  commandList:   ()                         => ipcRenderer.invoke("orion:commandList"),
  command:       (name, args, sessionId)    => ipcRenderer.invoke("orion:command", { name, args, sessionId }),
  config:        ()                         => ipcRenderer.invoke("orion:config"),
  sessionDetail: (id)                       => ipcRenderer.invoke("orion:sessionDetail", id),

  // SSE — sub(sessionId, onEvent) → unsubscribe fonksiyonu döner
  subscribeEvents,

  // PTY — gerçek shell oturumları (main.js'te node-pty çalışır)
  pty: {
    create:  (cols, rows, cwd) => ipcRenderer.invoke("pty:create", { cols, rows, cwd }),
    write:   (ptyId, data)     => ipcRenderer.invoke("pty:write",  { ptyId, data }),
    resize:  (ptyId, cols, rows) => ipcRenderer.invoke("pty:resize", { ptyId, cols, rows }),
    kill:    (ptyId)           => ipcRenderer.invoke("pty:kill",   { ptyId }),
    onData: (cb) => {
      const fn = (_, p) => cb(p);
      ipcRenderer.on("pty:data", fn);
      return () => ipcRenderer.removeListener("pty:data", fn);
    },
    onExit: (cb) => {
      const fn = (_, p) => cb(p);
      ipcRenderer.on("pty:exit", fn);
      return () => ipcRenderer.removeListener("pty:exit", fn);
    },
  },
});
