// core/store.ts — Central TUI state manager
"use strict";

const { initResizeHandler, getTermCols } = require("./resize.ts");
const { initKeypress } = require("./keypress.ts");

class TUIStore {
  constructor() {
    this._spinStack = [];
    this._toasts = [];
    this._inputLockCount = 0;
    this._mode = "agent";
    this._provider = "ollama";
    this._backendColor = { fg: "", bg: "" };
    this._listeners = [];
    initResizeHandler();
    initKeypress();
  }

  // ── Spin ──
  spinStart(id, label = "") {
    if (this._spinStack.find(s => s.id === id)) return;
    this._spinStack.push({ id, label, startTime: Date.now(), frameIndex: 0, timer: null });
    this._emit("spin:start", { id, label });
  }

  spinStop(id) {
    const idx = this._spinStack.findIndex(s => s.id === id);
    if (idx === -1) return;
    const entry = this._spinStack[idx];
    if (entry.timer) clearInterval(entry.timer);
    this._spinStack.splice(idx, 1);
    this._emit("spin:stop", { id });
  }

  spinStopAll() {
    for (const s of [...this._spinStack]) {
      if (s.timer) clearInterval(s.timer);
    }
    this._spinStack = [];
    this._emit("spin:stop-all", {});
  }

  getActiveSpins() { return [...this._spinStack]; }
  isSpinning(id) { return this._spinStack.some(s => s.id === id); }

  // ── Toast ──
  toast(text, type = "info", ttl = 4000) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this._toasts.push({ id, text, type, time: Date.now(), ttl });
    if (this._toasts.length > 5) this._toasts.shift();
    this._emit("toast:push", { id, text, type });
    setTimeout(() => this.toastDismiss(id), ttl);
    return id;
  }

  toastDismiss(id) {
    const idx = this._toasts.findIndex(t => t.id === id);
    if (idx === -1) return;
    this._toasts.splice(idx, 1);
    this._emit("toast:dismiss", { id });
  }

  toastDismissAll() {
    this._toasts = [];
    this._emit("toast:dismiss-all", {});
  }

  getActiveToasts() {
    const now = Date.now();
    return this._toasts.filter(t => now - t.time < t.ttl);
  }

  // ── Input lock ──
  inputLockPush() {
    this._inputLockCount++;
    if (this._inputLockCount === 1) this._emit("input:lock", {});
  }
  inputLockPop() {
    this._inputLockCount = Math.max(0, this._inputLockCount - 1);
    if (this._inputLockCount === 0) this._emit("input:unlock", {});
  }
  isInputLocked() { return this._inputLockCount > 0; }

  // ── Mode ──
  getMode() { return this._mode; }
  setMode(mode) {
    this._mode = mode;
    this._emit("mode:change", { mode });
  }
  cycleMode() {
    const cycle = ["agent", "plan", "build", "chat"];
    const idx = cycle.indexOf(this._mode);
    this.setMode(cycle[(idx + 1) % cycle.length]);
  }

  // ── Provider ──
  getProvider() { return this._provider; }
  setProvider(name, colors) {
    this._provider = name;
    this._backendColor = colors;
    this._emit("provider:change", { name, colors });
  }
  getProviderAccent() { return this._backendColor; }

  // ── Events ──
  on(event, fn) { this._listeners.push({ event, fn }); }
  off(event, fn) {
    this._listeners = this._listeners.filter(l => !(l.event === event && l.fn === fn));
  }
  _emit(event, ...args) {
    for (const l of this._listeners) {
      if (l.event === event) {
        try { l.fn(...args); } catch {}
      }
    }
  }

  width() { return getTermCols(); }
  reset() {
    this.spinStopAll();
    this.toastDismissAll();
    this._inputLockCount = 0;
  }
}

let _instance = null;
function getStore() {
  if (!_instance) _instance = new TUIStore();
  return _instance;
}

module.exports = { TUIStore, getStore };
