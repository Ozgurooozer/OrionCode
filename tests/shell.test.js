// tests/shell.test.js — tools/shell.js için testler
"use strict";

const { test }   = require("node:test");
const assert     = require("node:assert");
const path       = require("path");
const os         = require("os");
const fs         = require("fs");

// Test için geçici workspace
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-shell-"));
process.env.ORION_WORKSPACE = TMP;
// autoApproveCommands olmadan headless modunda çalıştırma
process.env.ORION_HOME = TMP;

const { DEFS, execute } = require("../tools/shell.ts");

test("DEFS: run_command tanımlı", () => {
  assert.ok(Array.isArray(DEFS), "DEFS dizi");
  const def = DEFS.find(d => d.name === "run_command");
  assert.ok(def, "run_command tanımlı");
  assert.ok(def.input_schema.properties.command, "command parametresi var");
  assert.ok(def.input_schema.properties.timeout_ms, "timeout_ms parametresi var");
  assert.ok(def.input_schema.properties.env, "env parametresi var");
});

test("run_command: headless + autoApprove olmadan reddedilir", async () => {
  // --headless simülasyonu: process.argv'ye ekliyoruz
  process.argv.push("--headless");
  try {
    const out = await execute("run_command", { command: "echo hello" });
    assert.ok(out.includes("autoApproveCommands") || out.includes("headless"), "ret mesajı");
  } finally {
    const idx = process.argv.indexOf("--headless");
    if (idx !== -1) process.argv.splice(idx, 1);
  }
});

test("run_command: autoApproveCommands ile çalışır", async () => {
  // Config mock: autoApproveCommands:true
  const routerMod = require("../core/router.ts");
  const origLoad = routerMod.loadConfig;
  routerMod.loadConfig = () => ({ autoApproveCommands: true });

  try {
    const isWin = process.platform === "win32";
    const cmd   = isWin ? "echo hello_orion" : "echo hello_orion";
    const out   = await execute("run_command", { command: cmd });
    assert.ok(out.includes("hello_orion"), `çıktı bekleniyor, alınan: ${out}`);
  } finally {
    routerMod.loadConfig = origLoad;
  }
});

test("run_command: exit kodu ≠ 0 ise [exit N] prefix", async () => {
  const routerMod = require("../core/router.ts");
  const origLoad = routerMod.loadConfig;
  routerMod.loadConfig = () => ({ autoApproveCommands: true });

  try {
    const isWin = process.platform === "win32";
    const cmd   = isWin ? "exit 1" : "exit 1";
    const out   = await execute("run_command", { command: cmd });
    assert.ok(out.includes("[exit"), `[exit N] içermeli, alınan: ${out}`);
  } finally {
    routerMod.loadConfig = origLoad;
  }
});

test("run_command: env parametresi ortam değişkeni geçirir", async () => {
  const routerMod = require("../core/router.ts");
  const origLoad = routerMod.loadConfig;
  routerMod.loadConfig = () => ({ autoApproveCommands: true });

  try {
    const isWin = process.platform === "win32";
    const cmd   = isWin ? "echo %MY_TEST_VAR%" : "echo $MY_TEST_VAR";
    const out   = await execute("run_command", { command: cmd, env: { MY_TEST_VAR: "orion_env_test" } });
    assert.ok(out.includes("orion_env_test"), `env değişkeni çıktıda olmalı, alınan: ${out}`);
  } finally {
    routerMod.loadConfig = origLoad;
  }
});

test("run_command: bilinmeyen araç hata döner", async () => {
  const out = await execute("bilinmeyen_arac", {});
  assert.ok(out.includes("Bilinmeyen araç"), "bilinmeyen araç hata mesajı");
});

test("run_command: ORION_ALLOW_COMMANDS=1 headless'ta çalışır", async () => {
  process.argv.push("--headless");
  process.env.ORION_ALLOW_COMMANDS = "1";
  try {
    const out = await execute("run_command", { command: "echo inner_agent_ok" });
    assert.ok(out.includes("inner_agent_ok"), `inner agent çalışmalı, alınan: ${out}`);
  } finally {
    const idx = process.argv.indexOf("--headless");
    if (idx !== -1) process.argv.splice(idx, 1);
    delete process.env.ORION_ALLOW_COMMANDS;
  }
});

// Temizlik
process.on("exit", () => {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
});
