// electron/main.js — Orion Desktop: Electron main process
// Sorumluluklar: frameless pencere aç, orion-server.js'i (yoksa) alt process
// olarak başlat/yönet, HTTP+SSE istemcisini burada tut (preload sandboxed
// olduğu için http/child_process orada KULLANILAMAZ — bkz. aşağıdaki not).
"use strict";

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path   = require("path");
const fs     = require("fs");
const os     = require("os");
const http   = require("http");
const { spawn } = require("child_process");

// node-pty — ana process'te çalışır (sandbox renderer'da native module yok)
let nodePty = null;
try { nodePty = require("node-pty"); } catch (e) { console.warn("[pty] node-pty yüklenemedi:", e.message); }
const ptyMap = new Map(); // ptyId → IPty instance

const REPO_ROOT = path.join(__dirname, "..");       // molp/
const TOKEN_FILE = path.join(os.homedir(), ".orion", "server-token");

// TypeScript geçişine uyumlu: .js yoksa .ts'e bak
function resolveServerFile() {
  const js = path.join(REPO_ROOT, "orion-server.js");
  if (fs.existsSync(js)) return { file: js, ts: false };
  const ts = path.join(REPO_ROOT, "orion-server.ts");
  if (fs.existsSync(ts)) return { file: ts, ts: true };
  return null;
}

let serverProc = null;
let mainWindow = null;
let connPort   = null;
let connToken  = null;
let sseReq        = null;
let sseRetryTimer = null;

function readToken() {
  try { return fs.readFileSync(TOKEN_FILE, "utf8").trim(); }
  catch { return null; }
}

function readServerPort() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".orion", "config.json"), "utf8"));
    return cfg.serverPort ?? 4517;
  } catch { return 4517; }
}

function ping(port) {
  return new Promise(resolve => {
    const req = http.get({ host: "127.0.0.1", port, path: "/health", timeout: 1500 }, res => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// orion-server.js zaten çalışıyorsa (kullanıcı CLI'dan başlatmış olabilir)
// dokunma — yoksa alt process olarak başlat. İki ayrı Session instance'ının
// aynı vault/session dosyalarına eşzamanlı yazması istenmiyor; bu yüzden
// health check önce.
//
// ÖNEMLİ: process.execPath burada electron.exe'yi gösterir, düz node'u değil.
// ELECTRON_RUN_AS_NODE olmadan spawn edilirse orion-server.js bir Electron
// app'i gibi açılmaya çalışılır ve düzgün çalışmaz — bu daha önceki bir bug'dı.
// Sistem node'unu PATH üzerinden bul (Electron'un kendi node'u .ts'i doğru işlemiyor)
function findSystemNode() {
  const { execSync } = require("child_process");
  try {
    const out = execSync("where node", { encoding: "utf8", timeout: 2000 }).trim();
    // İlk satırı al; Electron'un kendi yolunu atla
    const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const systemNode = lines.find(l => !l.toLowerCase().includes("electron"));
    return systemNode ?? lines[0] ?? "node";
  } catch {
    return "node"; // PATH'te bulunur umarız
  }
}

async function ensureServer(port) {
  if (await ping(port)) return true; // zaten ayakta

  const server = resolveServerFile();
  if (!server) {
    console.error("[orion-server] orion-server.js / orion-server.ts bulunamadı — sunucu başlatılamıyor");
    return false;
  }

  return new Promise(resolve => {
    let nodeExe, args, tmpFile = null;
    if (server.ts) {
      // orion-server.ts: BOM + satır 2 shebang → parser hatası.
      // Aynı dizinde temiz bir kopyasını yaz, spawn et, sonra sil.
      try {
        const raw = fs.readFileSync(server.file, "utf8");
        const cleaned = raw
          .replace(/﻿/g, "")          // tüm BOM karakterlerini temizle
          .replace(/^#![^\n]*\n?/m, "");   // shebang satırını kaldır
        tmpFile = path.join(REPO_ROOT, ".orion-server-run.ts");
        fs.writeFileSync(tmpFile, cleaned, "utf8");
      } catch (e) {
        console.error("[orion-server] temp dosya oluşturulamadı:", e.message);
        resolve(false); return;
      }
      nodeExe = findSystemNode();
      args = ["--experimental-strip-types", tmpFile, "--port", String(port)];
    } else {
      nodeExe = process.execPath;
      args = [server.file, "--port", String(port)];
    }

    serverProc = spawn(nodeExe, args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(server.ts ? {} : { ELECTRON_RUN_AS_NODE: "1" }) },
    });
    serverProc.stdout.on("data", d => process.stdout.write(`[orion-server] ${d}`));
    serverProc.stderr.on("data", d => process.stderr.write(`[orion-server] ${d}`));
    const cleanupTmp = () => { if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch {} tmpFile = null; } };
    serverProc.on("error", err => {
      console.error(`[orion-server] başlatılamadı: ${err.message}`);
      serverProc = null; cleanupTmp();
    });
    serverProc.on("exit", code => {
      if (code !== 0) console.error(`[orion-server] çıktı, kod: ${code}`);
      serverProc = null; cleanupTmp();
    });

    // Sunucu ayağa kalkana kadar bekle (maks 8sn, 250ms aralık)
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      if (await ping(port)) { clearInterval(iv); resolve(true); return; }
      if (tries > 32) { clearInterval(iv); resolve(false); }
    }, 250);
  });
}

// ── HTTP istemci — preload sandboxed olduğu için tüm ağ trafiği burada ──────
function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    if (!connPort || !connToken) { reject(new Error("orion-server bağlantısı henüz kurulmadı")); return; }
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request({
      host: "127.0.0.1", port: connPort, path: urlPath, method,
      headers: {
        Authorization: `Bearer ${connToken}`,
        ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw = "";
      res.on("data", c => { raw += c; });
      res.on("end", () => {
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          if (res.statusCode >= 400) reject(new Error(parsed?.error || `HTTP ${res.statusCode}`));
          else resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── SSE — main process'te tek kalıcı bağlantı, olaylar webContents.send ile
// renderer'a geçirilir. Bağlantı koparsa 3sn sonra otomatik yeniden dener.
function startSSE() {
  if (sseReq || !connPort || !connToken) return;
  sseReq = http.request({
    host: "127.0.0.1", port: connPort, path: "/events", method: "GET",
    headers: { Authorization: `Bearer ${connToken}` },
  }, res => {
    let buf = "";
    res.on("data", chunk => {
      buf += chunk.toString("utf8");
      const parts = buf.split("\n\n");
      buf = parts.pop(); // son parça tamamlanmamış olabilir
      for (const part of parts) {
        const line = part.split("\n").find(l => l.startsWith("data: "));
        if (!line) continue;
        try { mainWindow?.webContents.send("orion:event", JSON.parse(line.slice(6))); } catch {}
      }
    });
    res.on("end", () => { sseReq = null; scheduleSSEReconnect(); });
  });
  sseReq.on("error", () => { sseReq = null; scheduleSSEReconnect(); });
  sseReq.end();
}

function scheduleSSEReconnect() {
  if (sseRetryTimer || !mainWindow) return;
  sseRetryTimer = setTimeout(() => { sseRetryTimer = null; startSSE(); }, 3000);
}

function stopSSE() {
  if (sseRetryTimer) { clearTimeout(sseRetryTimer); sseRetryTimer = null; }
  if (sseReq) { try { sseReq.destroy(); } catch {} sseReq = null; }
}

async function createWindow() {
  connPort  = readServerPort();
  const started = await ensureServer(connPort);
  connToken = readToken(); // sunucu ilk çalıştırmada token'ı burada üretmiş olabilir
  if (!started) {
    const srvFile = resolveServerFile();
    const srvPath = srvFile ? srvFile.file : path.join(REPO_ROOT, "orion-server.ts");
    console.error("orion-server başlatılamadı — /health yanıt vermedi");
    dialog.showErrorBox(
      "Orion sunucusu başlatılamadı",
      `orion-server ayağa kalkmadı (port ${connPort}).\n\n` +
      `Terminalde elle deneyin:\n  node --experimental-strip-types "${srvPath}" --port ${connPort}\n\n` +
      `Hata çıktısını görmek için DevTools (Ctrl+Shift+I) açık tutun.\n` +
      `3D Terminal /level komutları sunucusuz da çalışır.`
    );
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 560,
    frame: false,
    backgroundColor: "#08080d",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // preload artık sadece 'electron' require ediyor — sandbox güvenle açık kalabilir
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.webContents.once("did-finish-load", () => startSSE());

  // Geliştirme modunda (paketlenmemiş) DevTools otomatik açılır — beyaz/siyah
  // ekran gibi sessiz render hatalarını görmenin tek yolu bu.
  if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`[renderer] yüklenemedi: ${code} ${desc}`);
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error(`[renderer] süreç çöktü: ${details.reason}`);
  });

  mainWindow.on("closed", () => { mainWindow = null; stopSSE(); });
}

// ── Pencere kontrolleri (frame:false olduğu için titlebar'daki min/max/close
// ikonları renderer'da çizilir, gerçek işlemi burada IPC ile yapılır) ────────
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle("window:close", () => mainWindow?.close());

// ── orion-server.js REST köprüsü ────────────────────────────────────────────
ipcMain.handle("orion:status",   () => apiRequest("GET", "/status"));
ipcMain.handle("orion:sessions", () => apiRequest("GET", "/sessions"));
ipcMain.handle("orion:backends", () => apiRequest("GET", "/backends"));
ipcMain.handle("orion:chat", (_e, { text, sessionId, backend, model }) =>
  apiRequest("POST", "/chat", { text, sessionId, backend, model }));
ipcMain.handle("orion:message", (_e, { to, text, from }) =>
  apiRequest("POST", "/message", { to, text, from }));

// Komut sistemi + yapılandırma
ipcMain.handle("orion:commandList", () => apiRequest("GET", "/commands"));
ipcMain.handle("orion:command", (_e, { name, args, sessionId }) =>
  apiRequest("POST", "/command", { name, args, sessionId }));
ipcMain.handle("orion:config", () => apiRequest("GET", "/config"));
ipcMain.handle("orion:sessionDetail", (_e, id) =>
  apiRequest("GET", `/sessions/${id}`));

// ── PTY — gerçek shell oturumları ─────────────────────────────────────────
ipcMain.handle("pty:create", (_, { cols, rows, cwd }) => {
  if (!nodePty) throw new Error("node-pty kurulu değil");
  const shell = process.env.COMSPEC || "powershell.exe";
  const id = crypto.randomUUID();
  const p = nodePty.spawn(shell, [], {
    cols: cols || 80,
    rows: rows || 24,
    cwd: cwd || os.homedir(),
    env: process.env,
    useConpty: true,
  });
  p.onData(data => mainWindow?.webContents.send("pty:data", { ptyId: id, data }));
  p.onExit(e => {
    mainWindow?.webContents.send("pty:exit", { ptyId: id, code: e.exitCode });
    ptyMap.delete(id);
  });
  ptyMap.set(id, p);
  return id;
});

ipcMain.handle("pty:write",  (_, { ptyId, data })       => ptyMap.get(ptyId)?.write(data));
ipcMain.handle("pty:resize", (_, { ptyId, cols, rows }) => {
  const p = ptyMap.get(ptyId);
  if (p) p.resize(Math.max(1, cols), Math.max(1, rows));
});
ipcMain.handle("pty:kill", (_, { ptyId }) => {
  const p = ptyMap.get(ptyId);
  if (p) { try { p.kill(); } catch {} }
  ptyMap.delete(ptyId);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  stopSSE();
  // Sunucuyu biz başlattıysak biz kapatalım — kullanıcının CLI'dan ayrı
  // başlattığı bir sunucuyu (health check ile tespit edildiyse) öldürmeyiz.
  if (serverProc) { try { serverProc.kill(); } catch {} }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on("uncaughtException", err => {
  console.error("[main] yakalanmamış hata:", err);
});
