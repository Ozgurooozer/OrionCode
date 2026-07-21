// tests/commands/basic.test.js — Kritik slash komutları için smoke testleri
"use strict";

const { test, describe, after } = require("node:test");
const assert = require("node:assert");
const os   = require("os");
const fs   = require("fs");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-cmd-"));
process.env.ORION_HOME = TMP;
process.env.ORION_LANG = "en";

const { makeMockSession } = require("../helpers/mock-session.js");

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// Her komut için smoke pattern:
// 1. Modül yüklenebilir mi?
// 2. Array veya tek export mu döner?
// 3. exec() çalışabilir mi (session mock + args boş)?

describe("language komutu", () => {
  const cmds = require("../../core/commands/language.ts");

  test("module yüklenir ve dizi döner", () => {
    assert.ok(Array.isArray(cmds));
    assert.ok(cmds.length > 0);
  });

  test("name === 'language'", () => {
    assert.strictEqual(cmds[0].name, "language");
  });

  test("exec() argüman olmadan çalışır (locale yazdırır)", async () => {
    const session = makeMockSession();
    await assert.doesNotReject(() => cmds[0].exec({ args: [], session }));
  });

  test("exec('en') locale değiştirir", async () => {
    const session = makeMockSession();
    await assert.doesNotReject(() => cmds[0].exec({ args: ["en"], session }));
  });

  test("exec('tr') locale değiştirir", async () => {
    const session = makeMockSession();
    await assert.doesNotReject(() => cmds[0].exec({ args: ["tr"], session }));
  });
});

describe("help komutu", () => {
  const cmd = require("../../core/commands/help.ts");

  test("module yüklenir", () => {
    assert.ok(cmd !== null && cmd !== undefined);
  });

  test("bir obje veya array döner", () => {
    const isValid = Array.isArray(cmd) || typeof cmd === "object";
    assert.ok(isValid);
  });
});

describe("mode komutu", () => {
  const cmds = require("../../core/commands/mode.ts");

  test("module yüklenir ve dizi döner", () => {
    assert.ok(Array.isArray(cmds));
  });

  test("name === 'mode'", () => {
    assert.strictEqual(cmds[0].name, "mode");
  });

  test("exec() argüman olmadan mevcut modu gösterir", async () => {
    const session = makeMockSession({ mode: "agent" });
    await assert.doesNotReject(() => cmds[0].exec({ args: [], session }));
  });

  test("exec('chat') modu değiştirir", async () => {
    const session = makeMockSession({ mode: "agent", setMode: (m) => { session.mode = m; } });
    await assert.doesNotReject(() => cmds[0].exec({ args: ["chat"], session }));
  });
});

describe("stats komutu", () => {
  const cmds = require("../../core/commands/stats.ts");

  test("module yüklenir", () => {
    assert.ok(cmds !== null);
  });

  test("exec komutu hata atmaz (telemetri dosyası yokken)", async () => {
    const session = makeMockSession();
    const cmd = Array.isArray(cmds) ? cmds[0] : cmds;
    if (cmd && typeof cmd.exec === "function") {
      await assert.doesNotReject(() => cmd.exec({ args: [], session }));
    }
  });
});

describe("budget komutu", () => {
  const cmds = require("../../core/commands/budget.ts");

  test("module yüklenir", () => {
    assert.ok(cmds !== null);
  });

  test("dizi döner", () => {
    assert.ok(Array.isArray(cmds));
  });
});

describe("tree komutu", () => {
  const cmds = require("../../core/commands/tree.ts");

  test("module yüklenir", () => {
    assert.ok(cmds !== null && cmds !== undefined);
  });
});

describe("log komutu", () => {
  const cmds = require("../../core/commands/log.ts");

  test("module yüklenir", () => {
    assert.ok(cmds !== null);
  });
});

describe("provider komutu", () => {
  const cmds = require("../../core/commands/provider.ts");

  test("module yüklenir ve dizi döner", () => {
    assert.ok(Array.isArray(cmds));
  });

  test("name === 'provider'", () => {
    const provCmd = cmds.find(c => c.name === "provider");
    assert.ok(provCmd, "provider komutu bulunmalı");
  });
});
