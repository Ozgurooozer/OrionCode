// electron/src/api.js — window.orion (preload'da tanımlı) üzerinden ince sarmalayıcı.
// Renderer'da doğrudan http/fs yok; her şey preload'daki contextBridge'den geçer.
export const orion = window.orion;
