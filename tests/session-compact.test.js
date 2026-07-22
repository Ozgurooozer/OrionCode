"use strict";
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { test, describe, after } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-compact-"));
process.env.ORION_HOME = TMP;

// ── Mock enjeksiyonları (module load öncesi) ─────────────────────────────────

// i18n.t → EN metni döndür (TR argümanı yoksa EN)
const _i18nPath = require.resolve(path.join(__dirname, "..", "core", "i18n.ts"));
require.cache[_i18nPath] = {
  id: _i18nPath, filename: _i18nPath, loaded: true,
  exports: { t: (en) => en, setLocale: () => {}, locale: () => "en" },
};

// budget.ts — countMessages stub
const _budgetPath = require.resolve(path.join(__dirname, "..", "core", "budget.ts"));
let _countMsgsFn = () => 1000;
require.cache[_budgetPath] = {
  id: _budgetPath, filename: _budgetPath, loaded: true,
  exports: {
    countMessages: (...args) => _countMsgsFn(...args),
    BudgetTracker: class { record() {} },
    estimateCost: () => 0,
  },
};

// loops/shared.ts — _flattenMsgs stub
const _sharedPath = require.resolve(path.join(__dirname, "..", "core", "loops", "shared.ts"));
require.cache[_sharedPath] = {
  id: _sharedPath, filename: _sharedPath, loaded: true,
  exports: {
    _flattenMsgs: (msgs) => msgs.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) })),
    TIER1_TOOLS: [], PARALLEL_SAFE: [],
    _callToolCached: async () => {},
    _sweepSpeculexMisses: () => {},
    _emitDiff: () => {},
    _cleanResponse: (s) => s,
    makeRepeatDetector: () => () => false,
  },
};

// tui/output.ts — print stub (lazy require içinde)
const _outputPath = require.resolve(path.join(__dirname, "..", "tui", "output.ts"));
require.cache[_outputPath] = {
  id: _outputPath, filename: _outputPath, loaded: true,
  exports: { print: { warn: () => {}, system: () => {}, info: () => {}, error: () => {} } },
};

// tui/index.ts — spinner stub (lazy require içinde)
const _tuiPath = require.resolve(path.join(__dirname, "..", "tui", "index.ts"));
require.cache[_tuiPath] = {
  id: _tuiPath, filename: _tuiPath, loaded: true,
  exports: { spinner: { start: () => {}, stop: () => {} }, print: { warn: () => {}, system: () => {} } },
};

// ── Modül yükle ───────────────────────────────────────────────────────────────

const { compact, _trim } = require("../core/session-compact.ts");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── _trim ─────────────────────────────────────────────────────────────────────

describe("_trim", () => {

  function makeSession(msgCount) {
    const msgs = [];
    for (let i = 0; i < msgCount; i++) {
      msgs.push({ role: i % 2 === 0 ? "user" : "assistant", content: `msg ${i}` });
    }
    return { msgs, _compacted: false, system: "" };
  }

  test("60 mesaj veya altında değişiklik yapmaz", () => {
    const session = makeSession(60);
    const original = [...session.msgs];
    _trim(session);
    assert.strictEqual(session.msgs.length, 60, "60 mesaj kırpılmamalı");
    assert.strictEqual(session._compacted, false, "_compacted set edilmemeli");
  });

  test("59 mesajda değişiklik yapmaz", () => {
    const session = makeSession(59);
    _trim(session);
    assert.strictEqual(session.msgs.length, 59);
  });

  test("61 mesajda kırpma yapar", () => {
    const session = makeSession(61);
    _trim(session);
    assert.ok(session.msgs.length < 61, "kırpma sonrası mesaj sayısı azalmalı");
    assert.strictEqual(session._compacted, true, "_compacted true olmalı");
  });

  test("kırpma sonrası ilk mesaj özet başlığı içerir", () => {
    const session = makeSession(80);
    _trim(session);
    assert.ok(
      session.msgs[0].content.includes("summary") || session.msgs[0].content.includes("özet"),
      "ilk mesaj özet içermeli"
    );
  });

  test("kırpma sonrası son mesajlar korunur", () => {
    const session = makeSession(80);
    const lastMsg = session.msgs[79].content;
    _trim(session);
    const kept = session.msgs.some(m => m.content === lastMsg);
    assert.ok(kept, "son mesajlar kırpmada korunmalı");
  });

  test("kırpma sonrası ilk mesaj role:user olur (özet mesajı)", () => {
    const session = makeSession(80);
    _trim(session);
    assert.strictEqual(session.msgs[0].role, "user", "özet mesajı user rolünde olmalı");
  });

  test("tool result mesajları kısaltılır (<<<RESULT>>> prefix)", () => {
    const session = {
      msgs: [],
      _compacted: false,
      system: "",
    };
    for (let i = 0; i < 70; i++) {
      if (i % 10 === 5) {
        session.msgs.push({ role: "user", content: "<<<RESULT>>>" + "x".repeat(1000) });
      } else {
        session.msgs.push({ role: i % 2 === 0 ? "user" : "assistant", content: `msg ${i}` });
      }
    }
    assert.doesNotThrow(() => _trim(session), "tool result mesajları exception atmamalı");
  });

});

// ── compact ───────────────────────────────────────────────────────────────────

describe("compact", () => {

  function makeSession(msgCount, quickChatFn) {
    const msgs = [];
    for (let i = 0; i < msgCount; i++) {
      msgs.push({ role: i % 2 === 0 ? "user" : "assistant", content: `message ${i}` });
    }
    return {
      msgs,
      _compacted: false,
      system: "",
      _touchedFiles: new Set(),
      _save: () => {},
      _quickChat: quickChatFn ?? (() => Promise.resolve("summary")),
    };
  }

  test("4 mesaj altında uyarır ve erken döner", async () => {
    const session = makeSession(3);
    const originalMsgs = [...session.msgs];
    await compact(session);
    assert.deepStrictEqual(session.msgs, originalMsgs, "mesajlar değişmemeli");
    assert.strictEqual(session._compacted, false, "_compacted değişmemeli");
  });

  test("3 mesajda LLM çağrılmaz", async () => {
    let called = false;
    const session = makeSession(3, () => { called = true; return Promise.resolve("x"); });
    await compact(session);
    assert.strictEqual(called, false, "_quickChat çağrılmamalı");
  });

  test("4+ mesajda compact yapar", async () => {
    const session = makeSession(6, () => Promise.resolve("this is the summary"));
    await compact(session);
    assert.strictEqual(session.msgs.length, 2, "compact sonrası 2 mesaj kalmalı");
    assert.strictEqual(session._compacted, true, "_compacted true olmalı");
  });

  test("compact sonrası ilk mesaj özet içerir", async () => {
    const session = makeSession(8, () => Promise.resolve("THE SUMMARY TEXT"));
    await compact(session);
    assert.ok(session.msgs[0].content.includes("THE SUMMARY TEXT"), "özet metni mesajda olmalı");
  });

  test("compact sonrası ikinci mesaj assistant rolünde", async () => {
    const session = makeSession(8, () => Promise.resolve("summary"));
    await compact(session);
    assert.strictEqual(session.msgs[1].role, "assistant");
  });

  test("compact _save() çağırır", async () => {
    let saved = false;
    const session = makeSession(6, () => Promise.resolve("summary"));
    session._save = () => { saved = true; };
    await compact(session);
    assert.ok(saved, "_save çağrılmalı");
  });

  test("_quickChat başarısız olursa msgs değişmez", async () => {
    const session = makeSession(6, () => Promise.reject(new Error("LLM down")));
    const originalLen = session.msgs.length;
    await compact(session);
    assert.strictEqual(session.msgs.length, originalLen, "hata durumunda mesajlar değişmemeli");
    assert.strictEqual(session._compacted, false);
  });

  test("_touchedFiles varsa artifact indeksi eklenir", async () => {
    const session = makeSession(6, () => Promise.resolve("summary"));
    session._touchedFiles = new Set(["core/foo.ts", "core/bar.ts"]);
    await compact(session);
    const firstMsg = session.msgs[0].content;
    assert.ok(firstMsg.includes("core/foo.ts"), "artifact indeksi mesajda olmalı");
  });

});
