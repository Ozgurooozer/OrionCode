// tests/persist.test.js — core/persist.js için birim testleri
"use strict";

const { test, describe, after } = require("node:test");
const assert = require("node:assert");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-persist-"));
process.env.ORION_HOME = TMP;

const persist = require("../core/persist.ts");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe("persist: kaydet/yükle", () => {
  test("save() ve load() round-trip çalışır", () => {
    const data = { model: "test-model", backend: "ollama", messages: [{ role: "user", content: "hi" }] };
    persist.save("test-session-1", data);
    const loaded = persist.load("test-session-1");
    assert.strictEqual(loaded.model, "test-model");
    assert.strictEqual(loaded.backend, "ollama");
    assert.strictEqual(loaded.messages.length, 1);
  });

  test("load() olmayan session için null döner", () => {
    const result = persist.load("nonexistent-session-xyz");
    assert.strictEqual(result, null);
  });

  test("save() dizin yoksa otomatik oluşturur", () => {
    const sessionsDir = path.join(TMP, ".orion", "sessions");
    assert.ok(fs.existsSync(sessionsDir), "sessions dizini oluşturulmuş olmalı");
  });

  test("load() bozuk JSON için null döner", () => {
    const sessionsDir = path.join(TMP, ".orion", "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(path.join(sessionsDir, "corrupt.json"), "INVALID JSON{{{", "utf8");
    const result = persist.load("corrupt");
    assert.strictEqual(result, null);
  });
});

describe("persist: listeleme", () => {
  test("list() kayıtlı oturumları döner", () => {
    persist.save("list-test-1", { model: "m1", backend: "b1", messages: [], updatedAt: 1000 });
    persist.save("list-test-2", { model: "m2", backend: "b2", messages: [], updatedAt: 2000 });
    const sessions = persist.list();
    const ids = sessions.map(s => s.id);
    assert.ok(ids.includes("list-test-1"), "list-test-1 listede olmalı");
    assert.ok(ids.includes("list-test-2"), "list-test-2 listede olmalı");
  });

  test("list() updatedAt'e göre azalan sırayla sıralar", () => {
    persist.save("sort-a", { model: "m", backend: "b", messages: [], updatedAt: 100 });
    persist.save("sort-b", { model: "m", backend: "b", messages: [], updatedAt: 200 });
    const sessions = persist.list();
    const sortedIds = sessions.map(s => s.id);
    const idxA = sortedIds.indexOf("sort-a");
    const idxB = sortedIds.indexOf("sort-b");
    assert.ok(idxB < idxA, "sort-b (daha yeni) sort-a'dan önce gelmeli");
  });

  test("list() her oturum için id, model, msgCount döner", () => {
    persist.save("meta-test", {
      model: "claude-test",
      backend: "anthropic",
      messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }],
      updatedAt: 999,
    });
    const sessions = persist.list();
    const session = sessions.find(s => s.id === "meta-test");
    assert.ok(session, "meta-test oturumu bulunmalı");
    assert.strictEqual(session.model, "claude-test");
    assert.strictEqual(session.msgCount, 2);
  });
});

describe("persist: silme", () => {
  test("del() oturumu siler, ardından load() null döner", () => {
    persist.save("del-test", { model: "x", backend: "y", messages: [] });
    assert.ok(persist.load("del-test") !== null, "silmeden önce yüklenmeli");
    persist.del("del-test");
    assert.strictEqual(persist.load("del-test"), null, "silindikten sonra null olmalı");
  });

  test("del() olmayan oturum için false döner", () => {
    const result = persist.del("does-not-exist-session");
    assert.strictEqual(result, false);
  });
});

describe("persist: SESSIONS_DIR", () => {
  test("SESSIONS_DIR .orion/sessions altını gösterir", () => {
    const dir = persist.SESSIONS_DIR;
    assert.ok(dir.includes(".orion"), "sessions dizini .orion altında olmalı");
    assert.ok(dir.includes("sessions"), "sessions alt dizini içermeli");
  });
});
