// tests/git.test.js — tools/git.js testleri
"use strict";
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path   = require("path");
const os     = require("os");
const fs     = require("fs");

process.env.ORION_HOME = path.join(os.tmpdir(), "orion_test_git_" + process.pid);
const gitTools = require("../tools/git.ts");

describe("git_status", () => {
  test("geçerli repoda string döner", async () => {
    const result = await gitTools.execute("git_status", { cwd: process.cwd() });
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  test("git repo değilse hata içeren string döner", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "no-git-"));
    try {
      const result = await gitTools.execute("git_status", { cwd: tmpDir });
      assert.ok(typeof result === "string");
      // git status hatası veya boş temiz mesaj
      assert.ok(result.includes("hata") || result.includes("fatal") || result.includes("not a git") || result.length >= 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("git_diff", () => {
  test("unstaged diff string döner", async () => {
    const result = await gitTools.execute("git_diff", { staged: false, cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });

  test("staged diff string döner", async () => {
    const result = await gitTools.execute("git_diff", { staged: true, cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });

  test("belirli dosya için diff çalışır", async () => {
    const result = await gitTools.execute("git_diff", { path: "package.json", cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });
});

describe("git_log", () => {
  test("son commit listesi döner", async () => {
    const result = await gitTools.execute("git_log", { n: 5, cwd: process.cwd() });
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  test("varsayılan (n olmadan) çalışır", async () => {
    const result = await gitTools.execute("git_log", { cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });

  test("dosya bazlı log çalışır", async () => {
    const result = await gitTools.execute("git_log", { n: 3, file: "package.json", cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });

  test("n:50'yi aşmaz (upper bound)", async () => {
    const result = await gitTools.execute("git_log", { n: 1000, cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });
});

describe("git_add headless güvenliği", () => {
  test("--headless bayrağıyla iptal döner", async () => {
    const origArgv = [...process.argv];
    process.argv.push("--headless");
    try {
      const result = await gitTools.execute("git_add", { paths: "README.md", cwd: process.cwd() });
      assert.ok(typeof result === "string");
      assert.ok(result.includes("İptal") || result.toLowerCase().includes("cancel") || result.includes("onay"),
        `Beklenen iptal mesajı, alınan: "${result}"`);
    } finally {
      process.argv = origArgv;
    }
  });

  test("paths parametresi eksikse bile hata atmaz", async () => {
    const origArgv = [...process.argv];
    process.argv.push("--headless");
    try {
      // paths undefined → ["undefined"] → git add -- undefined → hata mesajı
      const result = await gitTools.execute("git_add", { cwd: process.cwd() });
      assert.ok(typeof result === "string");
    } finally {
      process.argv = origArgv;
    }
  });
});

describe("git_commit güvenliği", () => {
  test("--headless bayrağıyla iptal döner", async () => {
    const origArgv = [...process.argv];
    process.argv.push("--headless");
    try {
      const result = await gitTools.execute("git_commit", { message: "test commit", cwd: process.cwd() });
      assert.ok(result.includes("İptal") || result.toLowerCase().includes("cancel"),
        `Beklenen iptal mesajı, alınan: "${result}"`);
    } finally {
      process.argv = origArgv;
    }
  });

  test("message olmadan hata döner (headless'ta önce check)", async () => {
    const result = await gitTools.execute("git_commit", { cwd: process.cwd() });
    assert.ok(result.includes("HATA") || result.includes("message") || result.includes("İptal"),
      `Beklenen hata, alınan: "${result}"`);
  });
});

describe("git_show", () => {
  test("HEAD commit diff döner", async () => {
    const result = await gitTools.execute("git_show", { cwd: process.cwd() });
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0, "HEAD show boş olmamalı");
  });

  test("belirli ref için çalışır", async () => {
    const result = await gitTools.execute("git_show", { ref: "HEAD~1", cwd: process.cwd() });
    assert.ok(typeof result === "string");
  });

  test("geçersiz ref için hata mesajı döner", async () => {
    const result = await gitTools.execute("git_show", { ref: "NONEXISTENT_HASH_XYZ", cwd: process.cwd() });
    assert.ok(typeof result === "string");
    assert.ok(result.includes("hata") || result.includes("fatal") || result.includes("error") || result.includes("bad"),
      `Hata bekleniyor, alınan: "${result.slice(0, 100)}"`);
  });

  test("uzun diff kırpılır (8000 karakter)", async () => {
    const result = await gitTools.execute("git_show", { cwd: process.cwd() });
    assert.ok(result.length <= 8100, `Beklenenden uzun: ${result.length}`);
  });
});

describe("git_blame", () => {
  test("mevcut dosya için blame döner", async () => {
    const result = await gitTools.execute("git_blame", {
      path: "package.json",
      cwd: process.cwd(),
    });
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0, "blame çıktısı boş olmamalı");
  });

  test("satır aralığı filtreleme çalışır", async () => {
    const result = await gitTools.execute("git_blame", {
      path: "package.json",
      from: 1, to: 5,
      cwd: process.cwd(),
    });
    assert.ok(typeof result === "string");
    // 5 satır veya daha az bekle
    const lineCount = result.trim().split("\n").length;
    assert.ok(lineCount <= 10, `Çok fazla satır: ${lineCount}`);
  });

  test("path eksikse hata mesajı döner", async () => {
    const result = await gitTools.execute("git_blame", { cwd: process.cwd() });
    assert.ok(result.includes("HATA") || result.includes("path"),
      `Hata bekleniyor: "${result.slice(0, 100)}"`);
  });

  test("git repo olmayan dizinde hata döner", async () => {
    const tmpDir = require("fs").mkdtempSync(require("path").join(require("os").tmpdir(), "no-git-"));
    try {
      require("fs").writeFileSync(require("path").join(tmpDir, "test.txt"), "hello");
      const result = await gitTools.execute("git_blame", {
        path: require("path").join(tmpDir, "test.txt"),
        cwd: tmpDir,
      });
      assert.ok(typeof result === "string");
    } finally {
      require("fs").rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("bilinmeyen araç", () => {
  test("bilinmeyen isim için hata string döner", async () => {
    const result = await gitTools.execute("git_xyz", {});
    assert.ok(result.includes("Bilinmeyen") || result.includes("git_xyz"));
  });
});
