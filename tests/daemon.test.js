"use strict";
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { EventEmitter } = require("events");
const { test, describe, after, before } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-daemon-"));
const SESSIONS = path.join(TMP, "sessions");
const VAULT    = path.join(TMP, "vault");
fs.mkdirSync(SESSIONS, { recursive: true });
fs.mkdirSync(VAULT,    { recursive: true });
process.env.ORION_HOME = TMP;

// ── Worker mock ───────────────────────────────────────────────────────────────

let _lastWorker = null;

class FakeWorker extends EventEmitter {
  constructor(_filename, opts) {
    super();
    this.workerData = opts?.workerData ?? {};
    _lastWorker = this;
  }
  terminate() {
    this.emit("exit");
    return Promise.resolve();
  }
  _simulateMessage(msg) { this.emit("message", msg); }
  _simulateError(err)   { this.emit("error",   err); }
}

const _wtPath = require.resolve("worker_threads");
require.cache[_wtPath] = {
  id: _wtPath, filename: _wtPath, loaded: true,
  exports: {
    isMainThread: true,
    Worker: FakeWorker,
    workerData: null,
    parentPort: null,
  },
};

// persist.ts — SESSIONS_DIR
const _persistPath = require.resolve(path.join(__dirname, "..", "core", "persist.ts"));
require.cache[_persistPath] = {
  id: _persistPath, filename: _persistPath, loaded: true,
  exports: { SESSIONS_DIR: SESSIONS, load: () => null, save: () => {}, fork: () => null },
};

// vault.ts — getVaultDir
const _vaultPath = require.resolve(path.join(__dirname, "..", "core", "vault.ts"));
require.cache[_vaultPath] = {
  id: _vaultPath, filename: _vaultPath, loaded: true,
  exports: {
    getVaultDir: () => VAULT,
    writeSession: async () => ({ file: "test.html" }),
    recentEntries: () => [],
    shouldRunDigest: () => false,
    decayActivations: () => {},
    writeDigest: () => "digest.md",
    search: async () => [],
    recent: async () => [],
  },
};

// ── Modül yükle ───────────────────────────────────────────────────────────────

const daemon = require("../core/daemon.ts");

after(() => {
  daemon.stopDaemon();
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ── getStatus ─────────────────────────────────────────────────────────────────

describe("getStatus", () => {

  test("başlangıçta running:false döner", () => {
    assert.strictEqual(daemon.getStatus().running, false);
  });

  test("başlangıçta processed:0 döner", () => {
    assert.strictEqual(daemon.getStatus().processed, 0);
  });

  test("başlangıçta lastActivity:null döner", () => {
    assert.strictEqual(daemon.getStatus().lastActivity, null);
  });

  test("getStatus kopya döndürür (referans değil)", () => {
    const s1 = daemon.getStatus();
    const s2 = daemon.getStatus();
    assert.notStrictEqual(s1, s2, "her çağrı yeni obje döndürmeli");
  });

});

// ── startDaemon ───────────────────────────────────────────────────────────────

describe("startDaemon", () => {

  test("EventEmitter döndürür", () => {
    const emitter = daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    assert.ok(emitter instanceof EventEmitter);
    daemon.stopDaemon();
  });

  test("sessionsDir/vaultDir opts ile Worker oluşturulur", () => {
    _lastWorker = null;
    daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    assert.ok(_lastWorker !== null, "FakeWorker oluşturulmalı");
    assert.strictEqual(_lastWorker.workerData.sessionsDir, SESSIONS);
    assert.strictEqual(_lastWorker.workerData.vaultDir, VAULT);
    daemon.stopDaemon();
  });

  test("iki kez çağrılınca aynı emitter döner (idempotent)", () => {
    const e1 = daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    const e2 = daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    assert.strictEqual(e1, e2, "ikinci çağrı aynı emitter'ı döndürmeli");
    daemon.stopDaemon();
  });

  test("başlangıcı sonrası getStatus().running === true", () => {
    daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    assert.strictEqual(daemon.getStatus().running, true);
    daemon.stopDaemon();
  });

});

// ── stopDaemon ────────────────────────────────────────────────────────────────

describe("stopDaemon", () => {

  test("stop sonrası running:false", () => {
    daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    daemon.stopDaemon();
    assert.strictEqual(daemon.getStatus().running, false);
  });

  test("worker yokken stop no-op (exception yok)", () => {
    assert.doesNotThrow(() => daemon.stopDaemon());
  });

  test("stop sonrası startDaemon tekrar çalışır", () => {
    daemon.stopDaemon();
    _lastWorker = null;
    const emitter = daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    assert.ok(emitter instanceof EventEmitter);
    assert.ok(_lastWorker !== null, "yeni worker oluşturulmalı");
    daemon.stopDaemon();
  });

});

// ── Event yönlendirme (EventEmitter.emit senkron → sync testler) ───────────────

describe("event forwarding", () => {

  before(() => { daemon.stopDaemon(); });

  function freshStart() {
    daemon.stopDaemon();
    const emitter = daemon.startDaemon({ sessionsDir: SESSIONS, vaultDir: VAULT });
    return emitter;
  }

  test("vault_updated mesajı emitter'a iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("vault_updated", msg => { received = msg; });
    _lastWorker._simulateMessage({ type: "vault_updated", sessionId: "test-123", file: "t.html" });
    assert.strictEqual(received?.sessionId, "test-123");
  });

  test("vault_updated processed sayacı artar", () => {
    freshStart();
    const before = daemon.getStatus().processed;
    _lastWorker._simulateMessage({ type: "vault_updated", sessionId: "x", file: "f.html" });
    assert.strictEqual(daemon.getStatus().processed, before + 1);
  });

  test("vault_skipped emitter'a iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("vault_skipped", msg => { received = msg; });
    _lastWorker._simulateMessage({ type: "vault_skipped", sessionId: "y", reason: "low_novelty" });
    assert.strictEqual(received?.reason, "low_novelty");
  });

  test("digest_ready emitter'a iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("digest_ready", msg => { received = msg; });
    _lastWorker._simulateMessage({ type: "digest_ready", file: "digest.md", date: "2026-07-22" });
    assert.ok(received?.file, "digest_ready iletilmeli");
  });

  test("weakness_mined emitter'a iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("weakness_mined", msg => { received = msg; });
    _lastWorker._simulateMessage({ type: "weakness_mined", file: "w.md", groups: 3 });
    assert.strictEqual(received?.groups, 3);
  });

  test("error type mesajı daemon_error olarak iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("daemon_error", msg => { received = msg; });
    _lastWorker._simulateMessage({ type: "error", error: "test err" });
    assert.ok(received?.error?.includes("test err"), "daemon_error alınmalı");
  });

  test("worker error event daemon_error olarak iletilir", () => {
    const emitter = freshStart();
    let received = null;
    emitter.once("daemon_error", msg => { received = msg; });
    _lastWorker._simulateError(new Error("worker crash"));
    assert.ok(received?.error?.includes("worker crash"), "worker error daemon_error olmalı");
  });

  test("vault_updated lastActivity güncellenir", () => {
    freshStart();
    const before = daemon.getStatus().lastActivity;
    _lastWorker._simulateMessage({ type: "vault_updated", sessionId: "z", file: "z.html" });
    const after = daemon.getStatus().lastActivity;
    assert.ok(after !== null, "lastActivity set edilmeli");
    assert.ok(after >= (before ?? 0), "lastActivity artmalı");
  });

});
