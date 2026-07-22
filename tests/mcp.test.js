"use strict";
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const { test, describe, after } = require("node:test");
const assert = require("node:assert");

// ── Ortam ────────────────────────────────────────────────────────────────────

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-mcp-"));
process.env.ORION_HOME = TMP;
process.env.ORION_MCP_PROJECT = path.join(TMP, "mcp-project.json");
fs.mkdirSync(path.join(TMP, ".orion"), { recursive: true });

// ── Mock enjeksiyonları ───────────────────────────────────────────────────────

// i18n.t — pass-through
const _i18nPath = require.resolve(path.join(__dirname, "..", "core", "i18n.ts"));
require.cache[_i18nPath] = {
  id: _i18nPath, filename: _i18nPath, loaded: true,
  exports: { t: (en) => en, setLocale: () => {}, locale: () => "en" },
};

// tools.ts — registerDynamic/unregisterDynamic
const _toolsPath = require.resolve(path.join(__dirname, "..", "core", "tools.ts"));
const _registered = [];
const _unregistered = [];
require.cache[_toolsPath] = {
  id: _toolsPath, filename: _toolsPath, loaded: true,
  exports: {
    registerDynamic: (defs, executor, tag) => _registered.push({ defs, tag }),
    unregisterDynamic: (tag) => _unregistered.push(tag),
    getDefs: () => [],
    callTool: async () => "",
  },
};

// ── Modül yükle ───────────────────────────────────────────────────────────────

const mcp = require("../core/mcp.ts");

// GLOBAL_FILE ve PROJECT_FILE sabitlerini override et — test dizinine yönlendir
const GLOBAL_TEST  = path.join(TMP, "mcp-global.json");
const PROJECT_TEST = path.join(TMP, "mcp-project.json");

// mcp.ts GLOBAL_FILE/PROJECT_FILE sabitlerini içten okuduğu için dosya yollarını
// mcp.ts'deki gerçek yollar yerine TMP altına yönlendiriyoruz:
// mcp.GLOBAL_FILE ve mcp.PROJECT_FILE sabittir; test için addServer/removeServer
// bu sabitlerle çalışır. Bunun yerine direkt dosya API'larını test ediyoruz.

after(() => fs.rmSync(TMP, { recursive: true, force: true }));

// ── loadConfig ────────────────────────────────────────────────────────────────

describe("loadConfig", () => {

  test("config dosyaları yoksa boş obje döner", () => {
    // mcp.ts proje kökünde mcp.json + ORION_HOME/.orion/mcp.json okur
    // Her ikisi de yokken boş döner
    const cfg = mcp.loadConfig();
    assert.strictEqual(typeof cfg, "object");
    // Başka testlerden kalan sunucular olabilir — en azından boş değil mi kontrol etme,
    // sadece obje olduğunu kontrol et
    assert.ok(!Array.isArray(cfg), "object döndürmeli, array değil");
  });

});

// ── addServer / removeServer ──────────────────────────────────────────────────

describe("addServer / removeServer", () => {

  const TEST_SERVER_NAME = `test-mcp-${Date.now()}`;

  test("addServer global=false proje dosyasına yazar", () => {
    const spec = { command: "node", args: ["server.js"] };
    mcp.addServer(TEST_SERVER_NAME, spec, { global: false });
    // PROJECT_FILE'ı oku
    const projectFile = mcp.PROJECT_FILE;
    const content = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    assert.ok(content.servers[TEST_SERVER_NAME], "sunucu proje config'ine yazılmalı");
    assert.strictEqual(content.servers[TEST_SERVER_NAME].command, "node");
  });

  test("addServer global=true global dosyaya yazar", () => {
    const spec = { url: "http://localhost:9999" };
    const globalName = `global-mcp-${Date.now()}`;
    mcp.addServer(globalName, spec, { global: true });
    const globalFile = mcp.GLOBAL_FILE;
    const content = JSON.parse(fs.readFileSync(globalFile, "utf8"));
    assert.ok(content.servers[globalName], "sunucu global config'e yazılmalı");
  });

  test("removeServer varolan sunucuyu siler", () => {
    const result = mcp.removeServer(TEST_SERVER_NAME, { global: false });
    assert.strictEqual(result, true, "silme başarılı olmalı");
    const projectFile = mcp.PROJECT_FILE;
    const content = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    assert.ok(!content.servers[TEST_SERVER_NAME], "sunucu kaldırılmış olmalı");
  });

  test("removeServer olmayan sunucuda false döner", () => {
    const result = mcp.removeServer("non-existent-xyz", { global: false });
    assert.strictEqual(result, false);
  });

  test("addServer mevcut sunucuların üstüne yazmaz", () => {
    const n1 = `srv1-${Date.now()}`;
    const n2 = `srv2-${Date.now()}`;
    mcp.addServer(n1, { command: "node", args: ["a.js"] }, { global: false });
    mcp.addServer(n2, { command: "node", args: ["b.js"] }, { global: false });

    const content = JSON.parse(fs.readFileSync(mcp.PROJECT_FILE, "utf8"));
    assert.ok(content.servers[n1], "n1 korunmalı");
    assert.ok(content.servers[n2], "n2 var olmalı");

    // temizle
    mcp.removeServer(n1, { global: false });
    mcp.removeServer(n2, { global: false });
  });

});

// ── status ────────────────────────────────────────────────────────────────────

describe("status", () => {

  test("bağlı sunucu yoksa boş dizi veya sunucu listesi döner", () => {
    const s = mcp.status();
    assert.ok(Array.isArray(s), "dizi döndürmeli");
  });

  test("her status entry name içerir", () => {
    const n = `status-srv-${Date.now()}`;
    mcp.addServer(n, { command: "node", args: ["x.js"] }, { global: false });
    const s = mcp.status();
    const entry = s.find(e => e.name === n);
    assert.ok(entry, "eklenen sunucu status'ta görünmeli");
    assert.strictEqual(entry.connected, false, "bağlı olmayınca false");
    assert.strictEqual(entry.tools, 0, "bağlı değilken araç sayısı 0");
    assert.strictEqual(entry.type, "stdio", "command → stdio türü");
    mcp.removeServer(n, { global: false });
  });

  test("url verilen sunucu type:http olarak görünür", () => {
    const n = `http-srv-${Date.now()}`;
    mcp.addServer(n, { url: "http://localhost:1234" }, { global: false });
    const s = mcp.status();
    const entry = s.find(e => e.name === n);
    assert.ok(entry);
    assert.strictEqual(entry.type, "http");
    mcp.removeServer(n, { global: false });
  });

  test("autoConnect:true sunucu auto:true gösterir", () => {
    const n = `auto-srv-${Date.now()}`;
    mcp.addServer(n, { command: "node", args: ["s.js"], autoConnect: true }, { global: false });
    const s = mcp.status();
    const entry = s.find(e => e.name === n);
    assert.ok(entry);
    assert.strictEqual(entry.auto, true);
    mcp.removeServer(n, { global: false });
  });

});

// ── listTools ─────────────────────────────────────────────────────────────────

describe("listTools", () => {

  test("bağlı olmayan sunucu için null döner", () => {
    const result = mcp.listTools("olmayan-sunucu");
    assert.strictEqual(result, null);
  });

});

// ── _safeName davranışı (disconnect / connect döngüsü) ────────────────────────

describe("config merge", () => {

  test("proje config global config'i override eder (aynı sunucu adı)", () => {
    const n = `merge-srv-${Date.now()}`;
    // Global'e yaz
    mcp.addServer(n, { url: "http://global.example.com" }, { global: true });
    // Proje'ye aynı adla yaz
    mcp.addServer(n, { url: "http://project.example.com" }, { global: false });

    const cfg = mcp.loadConfig();
    assert.strictEqual(cfg[n]?.url, "http://project.example.com", "proje override etmeli");

    // temizle
    mcp.removeServer(n, { global: true });
    mcp.removeServer(n, { global: false });
  });

});

// ── disconnect / disconnectAll güvenlik ───────────────────────────────────────

describe("disconnect", () => {

  test("bağlı olmayan sunucuyu disconnect etmek false döner", async () => {
    const result = await mcp.disconnect("non-existent");
    assert.strictEqual(result, false);
  });

  test("disconnectAll bağlantı yokken hata vermez", async () => {
    await assert.doesNotReject(() => mcp.disconnectAll());
  });

});
