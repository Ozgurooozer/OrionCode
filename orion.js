#!/usr/bin/env node
// orion.js — Orion Aethelred CLI v2
"use strict";

// ── Credentials → env (kimlik bilgileri asla çıktıya yazdırılmaz) ────────────
require("./core/credentials.js").load();

const readline = require("readline");
const backends = require("./backends/index.js");
const { Session, interrupt, clearInterrupt } = require("./core/session.js");
const { C, print, renderMarkdown } = require("./tui/index.js");
const vaultCore = require("./core/vault.js");
const commands  = require("./core/commands/index.js");
const i18n      = require("./core/i18n.js");

// ── CLI argümanları ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isHeadless = args.includes("--headless");
const argModel   = args.find(a => !a.startsWith("-") && args.indexOf(a) === 0) ?? null;
const argBackend = (() => {
  const i = args.indexOf("--backend");
  return i !== -1 ? args[i + 1] : null;
})();
const argModelFlag = (() => {
  const i = args.indexOf("--model");
  return i !== -1 ? args[i + 1] : null;
})();
const MODEL_ARG = argModelFlag ?? argModel;

// -p "soru" → tek atış modu: cevapla ve çık (pipe/CI için)
const oneShotPrompt = (() => {
  const i = args.indexOf("-p");
  return i !== -1 ? args[i + 1] : null;
})();

// ── Backend + model seç ──────────────────────────────────────────────────────
async function resolveBackend() {
  const all = await backends.detect();
  if (!all.length) return null;

  // Belirli backend istendiyse onu kullan
  if (argBackend) {
    const found = all.find(b => b.name === argBackend);
    if (!found) { print.error(i18n.t(`Backend not found: ${argBackend}`, `Backend bulunamadı: ${argBackend}`)); process.exit(1); }
    return found;
  }
  return all[0];
}

function pickModel(backend, requestedModel) {
  if (backend.name === "anthropic") return requestedModel ?? "claude-sonnet-4-6";
  if (backend.name === "huggingface") return requestedModel ?? "meta-llama/Meta-Llama-3-8B-Instruct";
  if (backend.name === "openai") return requestedModel ?? "gpt-4o-mini";

  // Ollama
  const models = backend.models ?? [];
  if (requestedModel) {
    if (!models.includes(requestedModel)) {
      print.error(i18n.t(`Model not found: ${requestedModel}`, `Model bulunamadı: ${requestedModel}`));
      print.info(i18n.t("Available: ", "Mevcut: ") + models.join(", "));
      process.exit(1);
    }
    return requestedModel;
  }
  const env = process.env.OLLAMA_MODEL;
  if (env && models.includes(env)) return env;
  return (
    models.find(m => /qwen.*coder/i.test(m)) ??
    models.find(m => /qwen/i.test(m)) ??
    models.find(m => /mistral|llama3|gemma/i.test(m)) ??
    models[0]
  );
}

// ── Headless mod (sub-agent) ─────────────────────────────────────────────────
async function runHeadless(session) {
  // Role persona inject
  const role = process.env.ORION_ROLE ?? args.find((_, i) => args[i - 1] === "--role");
  if (role) {
    const personas = {
      researcher: "You are a researcher. Gather information, read files, analyze. Do not write code.",
      coder:      "You are a coding specialist. Write clean, working code. Keep explanations short.",
      reviewer:   "You are a code reviewer. Find bugs, suggest improvements. Be direct.",
    };
    if (personas[role]) session.system += `\n\n## Role\n${personas[role]}`;
  }

  // Hafıza scope inject
  const scopeB64 = process.env.ORION_MEMORY_SCOPE;
  if (scopeB64) {
    try {
      const entries = JSON.parse(Buffer.from(scopeB64, "base64").toString("utf8"));
      const { buildInjectSuffix } = require("./core/memory.js");
      const suffix = buildInjectSuffix(entries);
      if (suffix) session.system += suffix;
    } catch {}
  }

  const rl = readline.createInterface({ input: process.stdin });
  let input = "";
  for await (const line of rl) {
    input += line + "\n";
  }
  if (!input.trim()) process.exit(0);
  await session.send(input.trim());
}
// ── Prompt oluştur ───────────────────────────────────────────────────────────
function makePrompt(session) {
  const prefix = session.modes.promptPrefix();
  return `${prefix}${C.cyan("ozyn>")} `;
}

// ── Ana REPL ─────────────────────────────────────────────────────────────────
async function main() {
  const backend = await resolveBackend();
  if (!backend) {
    print.error(i18n.t("No backend found.", "Backend bulunamadı."));
    print.info(i18n.t("  • Ollama: run it at http://localhost:11434", "  • Ollama: http://localhost:11434 adresinde çalıştır"));
    print.info(i18n.t("  • Anthropic: set the ANTHROPIC_API_KEY environment variable", "  • Anthropic: ANTHROPIC_API_KEY ortam değişkenini ayarla"));
    print.info(i18n.t("  • HuggingFace: set the HF_TOKEN environment variable", "  • HuggingFace: HF_TOKEN ortam değişkenini ayarla"));
    process.exit(1);
  }

  const model   = pickModel(backend, MODEL_ARG);
  const session = new Session({ backend: backend.name, model });

  if (isHeadless) {
    return runHeadless(session);
  }

  // Tek atış modu: -p "soru" → cevapla, çık
  if (oneShotPrompt) {
    try {
      await session.send(oneShotPrompt);
      process.exit(0);
    } catch (err) {
      print.error(err.message);
      process.exit(1);
    }
  }

  print.header("Orion Aethelred", model, backend.name);

  // Plugin'ler: ~/.orion/plugins/*/orion-plugin.json
  try {
    const plugins = require("./core/plugins.js");
    for (const p of plugins.loadAll()) {
      if (p.ok) print.system(i18n.t(`plugin: ${p.name} loaded`, `plugin: ${p.name} yüklendi`));
      else      print.warn(i18n.t(`plugin: ${p.name} failed — ${p.error}`, `plugin: ${p.name} yüklenemedi — ${p.error}`));
    }
  } catch {}

  // MCP: autoConnect işaretli sunuculara bağlan
  try {
    const mcp = require("./core/mcp.js");
    const results = await mcp.connectAuto();
    for (const r of results) {
      if (r.ok) print.system(i18n.t(`mcp: ${r.name} connected (${r.tools} tools)`, `mcp: ${r.name} bağlı (${r.tools} araç)`));
      else      print.warn(i18n.t(`mcp: ${r.name} failed to connect — ${r.error}`, `mcp: ${r.name} bağlanamadı — ${r.error}`));
    }
  } catch {}

  // Vault daemon başlat — arka planda not alan yapay zeka
  if (!isHeadless) {
    try {
      const daemon = require("./core/daemon.js");
      vaultCore.ensureVault();
      const d = daemon.startDaemon();
      d.on("vault_updated", ({ sessionId }) => {
        print.system(i18n.t(`vault: saved [${sessionId}]`, `vault: kaydedildi [${sessionId}]`));
      });
      d.on("daemon_error", ({ error }) => {
        print.warn(`vault daemon: ${error}`);
      });
    } catch (err) {
      print.warn(i18n.t(`vault daemon failed to start: ${err.message}`, `vault daemon başlatılamadı: ${err.message}`));
    }
  }

  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
    prompt: makePrompt(session),
    historySize: 100,
  });

  rl.prompt();

  // Sıralı kuyruk — readline pipe'ta birden fazla line hemen gelir,
  // async handler bitmeden bir sonraki başlamamalı.
  const lineQueue  = [];
  let   qRunning   = false;
  let   pendingEOF = false;

  async function processOne(text) {
    if (!text) return;
    if (text.startsWith("/")) {
      const parts = text.slice(1).split(/\s+/);
      await commands.dispatch(parts[0].toLowerCase(), parts.slice(1), { session, rl });
    } else {
      try {
        await session.send(text);
        print.statusline(session.statusInfo());
      }
      catch (err) { print.error(err.message); }
    }
    rl.setPrompt(makePrompt(session));
  }

  async function drainQueue() {
    if (qRunning) return;
    qRunning = true;
    while (lineQueue.length) {
      await processOne(lineQueue.shift());
    }
    qRunning = false;
    if (pendingEOF) {
      console.log(C.gray("\nbye."));
      process.exit(0);
    }
    rl.prompt();
  }

  rl.on("line", line => {
    lineQueue.push(line.trim());
    drainQueue();
  });

  rl.on("close", () => {
    if (qRunning || lineQueue.length) { pendingEOF = true; return; }
    console.log(C.gray("\nbye."));
    process.exit(0);
  });

  // Ctrl+C: üretim varsa kes, yoksa çıkış
  let ctrlCCount = 0;
  process.on("SIGINT", () => {
    if (qRunning) {
      interrupt();
      ctrlCCount = 0;
      return;
    }
    ctrlCCount++;
    if (ctrlCCount === 1) {
      process.stdout.write(`\n${C.gray(i18n.t("Ctrl+C again to exit", "Çıkmak için tekrar Ctrl+C"))}\n`);
      setTimeout(() => { ctrlCCount = 0; }, 2000);
      rl.prompt();
    } else {
      console.log(C.gray("\nbye."));
      process.exit(0);
    }
  });
}

main().catch(e => { print.error(e.message); process.exit(1); });
