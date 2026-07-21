#!/usr/bin/env node
// orion.js — Orion Aethelred CLI v2
"use strict";

// ── .mcp.json auto-generate (yoksa .example'dan üret) ───────────────────────
const _fs0 = require("fs"), _path0 = require("path");
const _mcpPath = _path0.join(__dirname, ".mcp.json");
if (!_fs0.existsSync(_mcpPath)) {
  const _ex = _path0.join(__dirname, ".mcp.json.example");
  if (_fs0.existsSync(_ex)) {
    const _cfg = _fs0.readFileSync(_ex, "utf8")
      .replace(/<PROJECT_ROOT>/g, __dirname.replace(/\\/g, "\\\\"));
    _fs0.writeFileSync(_mcpPath, _cfg, "utf8");
  }
}

// ── Credentials → env (kimlik bilgileri asla çıktıya yazdırılmaz) ────────────
require("./core/credentials.js").load();
require("./core/accounts.js").applyActive(); // aktif hesap profili credentials üzerine biner

const readline = require("readline");
const backends = require("./backends/index.ts");
const { Session, interrupt, clearInterrupt } = require("./core/session.ts");
const { C, print, renderMarkdown, makeInputPrompt, finishUserTurn, refreshInputFill,
        inputBoxTop, renderMenuBelow, clearMenuBelow,
        showInputPlaceholder, clearInputPlaceholder } = require("./tui/index.ts");
const { attachSlashMenu, MAX_ITEMS: MENU_MAX } = require("./tui/slashmenu.js");
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

// --resume <id> → kayıtlı oturumu devral (self-dev restart bunu kullanır)
const resumeId = (() => {
  const i = args.indexOf("--resume");
  return i !== -1 ? args[i + 1] : null;
})();

// --trust → trust gate'i atla (CI/script ortamı için tek seferlik bypass)
const isTrustFlag = args.includes("--trust");

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

  // OpenAI-compat (openrouter, nim, lmstudio, özel BYOK): model serbestçe belirtilir;
  // /models listesiyle sınırlama yapılmaz (liste kısmi — detect() ilk 50 döner).
  const isOpenAICompat = backend.name !== "ollama";
  if (isOpenAICompat) {
    if (requestedModel) return requestedModel;
    return backend.defaultModel ?? backend.models?.[0] ?? null;
  }

  // Ollama — liste tam, bulunamazsa uyar
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
      researcher: [
        "You are a research specialist.",
        "Your job: read files, search code, gather facts. Do NOT write or modify any files.",
        "Tools: think (plan first), file_outline (structure), read_many_files (batch), read_file, search, list_files, glob_files, file_info, web_fetch, git_status, git_diff, git_log, git_show, git_blame",
        "Strategy: (1) think about what to look for, (2) use file_outline to scan structure, (3) read specific sections.",
        "Output: clear summary with exact file:line references. Be thorough — miss nothing relevant.",
      ].join("\n"),
      coder: [
        "You are a coding specialist. Implement exactly what is asked.",
        "Tools: think (plan before editing), file_outline, read_many_files, read_file, edit_file, multi_edit, write_file, apply_patch, insert_at_line, replace_in_files, create_dir, run_command, git_status, git_diff",
        "Workflow: (1) think through the approach, (2) outline/read to understand existing code, (3) edit precisely, (4) run tests.",
        "Edit rules: always read before editing. If edit_file fails (old_str not found): read_file exact section, retry.",
        "Efficiency: multi_edit for multiple changes in one file, replace_in_files for project-wide rename.",
        "Output: what changed, test results (PASS/FAIL). State failures explicitly.",
      ].join("\n"),
      reviewer: [
        "You are a code reviewer.",
        "Your job: check correctness, find bugs, verify tests pass.",
        "Tools: think (analyze before judging), file_outline, read_file, search, run_command (tests), git_diff",
        "Output: verdict PASS/FAIL + issues with file:line + specific fixes. Be direct.",
      ].join("\n"),
    };
    if (personas[role]) session.system += `\n\n## Role\n${personas[role]}`;

    // Rol bazlı mod zorlama — araç erişimini teknik olarak kısıtlar
    const roleModes = { researcher: "plan", coder: "build", reviewer: "agent" };
    const roleMode = roleModes[role];
    if (roleMode) {
      try { session.setMode(roleMode); } catch {}
    }
  }

  // Hafıza scope inject
  const scopeB64 = process.env.ORION_MEMORY_SCOPE;
  if (scopeB64) {
    try {
      const entries = JSON.parse(Buffer.from(scopeB64, "base64").toString("utf8"));
      const { buildInjectSuffix } = require("./core/memory.ts");
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
  const finalText = await session.send(input.trim());
  // Coordinator'ın çıktıyı güvenilir şekilde yakalaması için işaretleyici
  if (finalText && finalText.trim()) {
    process.stdout.write(`\n<<<ORION_FINAL>>>\n${finalText.trim()}\n<<<END_FINAL>>>\n`);
  }
}
// ── Prompt oluştur ───────────────────────────────────────────────────────────
function makePrompt(_session) {
  return makeInputPrompt();
}

// ── Tab tamamlama: /komut isimlerini tamamla ─────────────────────────────────
function cmdCompleter(line) {
  if (!line.startsWith("/")) return [[], line];
  const partial = line.slice(1).toLowerCase();
  const names = new Set();
  for (const cmd of commands.all()) {
    names.add(cmd.name);
    for (const a of cmd.aliases ?? []) names.add(a);
  }
  const sorted = [...names].sort();
  const hits = sorted.filter(n => n.startsWith(partial));
  return [hits.map(n => `/${n}`), line];
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

  // ── Workspace güven kapısı ───────────────────────────────────────────────
  if (!isHeadless) {
    const ws  = require("./core/workspace.js");
    const cwd = process.cwd();
    if (isTrustFlag || process.env.ORION_WORKSPACE) {
      // --trust flag veya ORION_WORKSPACE: kullanıcı bilinçli seçim yaptı → kalıcı güven
      const targetDir = process.env.ORION_WORKSPACE ? require("path").resolve(process.env.ORION_WORKSPACE) : cwd;
      if (!ws.isTrusted(targetDir)) {
        ws.trustDir(targetDir);
        print.system(i18n.t(`Workspace trusted: ${targetDir}`, `Çalışma alanı güvenilir: ${targetDir}`));
      }
    } else if (!ws.isTrusted(cwd)) {
      const ok = await ws.promptTrust(cwd);
      if (!ok) { print.info(i18n.t("Exiting.", "Çıkılıyor.")); process.exit(0); }
      ws.trustDir(cwd);
      print.system(i18n.t("Workspace trusted. Setting saved.", "Çalışma alanı güvenilir olarak işaretlendi."));
    }
  }

  const model   = pickModel(backend, MODEL_ARG);
  const session = new Session({ backend: backend.name, model });
  // CLI'da --backend belirtilmişse router override'ı engelle
  if (argBackend) session._manualBackend = true;

  if (resumeId) {
    try {
      const data = require("./core/persist.js").load(resumeId);
      if (data) {
        session.loadFrom(data, resumeId);
        print.system(i18n.t(`session resumed: ${resumeId} (${session.msgs.length} messages)`, `oturum devralındı: ${resumeId} (${session.msgs.length} mesaj)`));
      } else {
        print.warn(i18n.t(`session not found: ${resumeId}`, `oturum bulunamadı: ${resumeId}`));
      }
    } catch (e) {
      print.warn(i18n.t(`resume failed: ${e.message}`, `devralma başarısız: ${e.message}`));
    }
  }

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

  // Asenkron sistem mesajları (vault daemon vb.) için yazma noktası.
  // rl kurulunca prompt-üstüne-yaz sürümüyle değiştirilir; o ana dek doğrudan.
  let notifyAbove = (writeFn) => writeFn();

  // Vault daemon başlat — arka planda not alan yapay zeka
  if (!isHeadless) {
    try {
      const daemon = require("./core/daemon.js");
      vaultCore.ensureVault();
      const d = daemon.startDaemon();
      // [daemon] öneki + dim renk: arka plan işçisinin çıktısını aktif ajan
      // turunun çıktısından görsel olarak ayırır — ikisi aynı terminal akışına
      // düşüyor ve karıştırılabiliyor (bkz. docs/06-vaka-analizi-uzun-sureli-donma.md §6.3).
      const _daemonTag = C.dim("[daemon]");
      d.on("vault_updated", ({ sessionId, novelty }) => {
        const nov = novelty != null ? ` (novelty: ${(novelty * 100).toFixed(0)}%)` : "";
        notifyAbove(() => print.system(`${_daemonTag} ` + i18n.t(`vault: saved [${sessionId}]${nov}`, `vault: kaydedildi [${sessionId}]${nov}`)));
      });
      d.on("vault_skipped", ({ sessionId, maxSim, closestId }) => {
        notifyAbove(() => print.info(`${_daemonTag} ` + i18n.t(
          `vault: skipped [${sessionId}] — too similar to ${closestId} (${(maxSim * 100).toFixed(0)}%)`,
          `vault: atlandı [${sessionId}] — ${closestId} ile çok benzer (%${(maxSim * 100).toFixed(0)})`
        )));
      });
      d.on("digest_ready", ({ file }) => {
        notifyAbove(() => print.system(`${_daemonTag} ` + i18n.t(`lovelace: digest ready — /vault digest to read`, `lovelace: özet hazır — /vault digest ile oku`)));
      });
      d.on("daemon_error", ({ error }) => {
        notifyAbove(() => print.warn(`${_daemonTag} vault daemon: ${error}`));
      });
    } catch (err) {
      print.warn(i18n.t(`vault daemon failed to start: ${err.message}`, `vault daemon başlatılamadı: ${err.message}`));
    }
  }

  // Scheduler: VRAM eşapman yöneticisini başlat (Queue işleyicisini atar)
  if (!isHeadless) {
    try { require("./core/scheduler.js").start(); } catch {}
  }

  // Dosya değişikliklerinde renkli diff — edit_file/write_file sonrası CLI'da göster
  if (!isHeadless) {
    const orionEvents = require("./core/events.ts");
    orionEvents.emitter.on("diff", ({ payload }) => {
      if (payload?.diff) print.diff(payload.diff);
    });
  }

  const rl = readline.createInterface({
    input:     process.stdin,
    output:    process.stdout,
    prompt:    makePrompt(session),
    historySize: 100,
    completer: cmdCompleter,
  });

  // Akış modeli: kutu ve menü akış içinde çizilir, scroll region YOK.
  // TTY: üst kenarlık + prompt satırı; Enter'da alt kenarlık basılır.
  const isTTY = !!(process.stdout.isTTY && process.stdin.isTTY && !isHeadless);

  // Üst kenarlıkta gösterilecek bağlam: model · mod (model adı kısaltılır)
  function panelInfo() {
    const m = String(session.model ?? "").replace(/^claude-/, "");
    return `${m} · ${session.mode?.name ?? "agent"}`;
  }

  // Placeholder: boş inputta soluk yönlendirme; ilk tuşta silinir
  let placeholderShown = false;

  // "/" komut menüsü — yazınca canlı liste prompt'un ALTINDA açılır (↑↓ Tab/Enter Esc)
  const slashMenu = attachSlashMenu(rl, () => commands.all(), {
    isBusy: () => qRunning,
    beforeKey: () => {
      if (placeholderShown) { clearInputPlaceholder(); placeholderShown = false; }
    },
    render: (state) => {
      if (state.open) {
        const off = state.offset;
        renderMenuBelow(rl, { items: state.items.slice(off, off + MENU_MAX), selected: state.selected - off });
      } else {
        clearMenuBelow(rl);
      }
    },
  });

  // Shift+Tab → mod döngüsü (chat → plan → build → agent → chat ...)
  const MODE_CYCLE = ["agent", "plan", "build", "chat"];
  if (isTTY) {
    const _afterMenuWrite = rl._ttyWrite.bind(rl);
    rl._ttyWrite = (s, key = {}) => {
      if (key.name === "tab" && key.shift && !slashMenu?.state.open) {
        const cur = session.mode.name;
        const idx = MODE_CYCLE.indexOf(cur);
        const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
        try { session.setMode(next); } catch {}
        redrawInput();
        return;
      }
      _afterMenuWrite(s, key);
    };
  }

  // Prompt açık mı? Asenkron mesajların (notifyAbove) açık bloğu bölmemesi için.
  let promptOpen = false;

  // Giriş bloğunu çiz: başlık bandı + prompt (Enter'da finishUserTurn kalıcılar)
  // Pipe/non-TTY modunda süsleme yok — çıktı temiz kalır.
  function redrawInput() {
    if (isTTY) {
      inputBoxTop(panelInfo());
      rl.setPrompt(makePrompt(session));
      rl.prompt(true);
      if (rl.line === "") {
        showInputPlaceholder();
        placeholderShown = true;
      }
      promptOpen = true;
    } else {
      rl.setPrompt("");
      rl.prompt(true);
    }
  }

  if (isTTY) {
    // readline _refreshLine clearScreenDown yapar → açık menü silinir; geri çiz.
    // RESET önce: canlı zemin açıkken clearScreenDown ekranın altını boyar (BCE).
    // Sonra satırın kalan boşluğu blok zeminiyle doldurulur.
    const origRefresh = rl._refreshLine.bind(rl);
    rl._refreshLine = () => {
      process.stdout.write("\x1b[0m");
      origRefresh();
      refreshInputFill(rl);
      placeholderShown = false;
      if (slashMenu?.state.open) {
        const off = slashMenu.state.offset;
        renderMenuBelow(rl, { items: slashMenu.state.items.slice(off, off + MENU_MAX), selected: slashMenu.state.selected - off });
      }
    };

    // Prompt açıkken gelen asenkron mesaj: açık bloğu geri sar, mesajı yaz,
    // bloğu (yazılmakta olan satır dahil) yeniden çiz. Prompt kapalıyken doğrudan.
    notifyAbove = (writeFn) => {
      if (!promptOpen) { writeFn(); return; }
      const rows = (rl.getCursorPos?.().rows ?? 0) + 2; // cursor satırı + bant + boşluk
      process.stdout.write(`\x1b[0m\r\x1b[${rows}A\x1b[J`);
      writeFn();
      redrawInput();
    };
  }

  // İlk prompt
  redrawInput();

  // --bench: arayüz hazır — süreç başlangıcından bu ana kadar geçen süre + RSS
  if (args.includes("--bench")) {
    const startupMs = Math.round(performance.now());
    const rssMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    process.stdout.write(`\nBENCH ${JSON.stringify({ startupMs, rssMB: parseFloat(rssMB) })}\n`);
    process.exit(0);
  }

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
      // Readline'ı duraklat: akış sırasında prompt yeniden render olmasın
      // (kapanmış readline'da pause/resume fırlatır — pipe EOF'ta sessizce yut)
      try { rl.pause(); } catch {}
      try {
        await session.send(text);
        print.statusline(session.statusInfo());
      } catch (err) {
        print.error(err?.message ?? String(err));
      } finally {
        try { rl.resume(); } catch {}
      }
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
    _interruptSent = false; // interrupt bayrağını sıfırla — sonraki tur için temiz başlangıç
    if (pendingEOF) {
      console.log(C.gray("\nbye."));
      process.exit(0);
    }
    // Yeni giriş kutusu çiz — akış içinde, çıktının hemen altına
    redrawInput();
  }

  rl.on("line", line => {
    promptOpen = false;
    // Ardışık tekrar girişleri history'den çıkar
    if (rl.history.length >= 2 && rl.history[0] === rl.history[1]) {
      rl.history.splice(0, 1);
    }
    if (isTTY) {
      // Enter sonrası cursor prompt'un bir altında: varsa açık menü artıklarını
      // sil (RESET önce — canlı zemin \x1b[J'ye taşmasın)
      process.stdout.write("\x1b[0m\x1b[J");
      if (line.trim()) {
        // Canlı satırları geri sar, turn'ü dolgulu blok olarak kalıcı çiz
        finishUserTurn(line, panelInfo());
      } else {
        // Boş giriş: bloğu geri sar (↑3 = prompt + başlık bandı + boşluk satırı)
        process.stdout.write("\r\x1b[3A\x1b[J");
      }
    }
    lineQueue.push(line.trim());
    drainQueue();
  });

  rl.on("close", () => {
    if (qRunning || lineQueue.length) { pendingEOF = true; return; }
    process.stdout.write("\x1b[0m");
    console.log(C.gray("\nbye."));
    process.exit(0);
  });

  // Ctrl+C: üretim varsa kes; ikinci basışta zorla çık
  let ctrlCCount = 0;
  let _interruptSent = false;
  process.on("SIGINT", () => {
    if (qRunning) {
      if (_interruptSent) {
        // İkinci Ctrl+C — hâlâ çalışıyor → zorla çık
        process.stdout.write("\x1b[0m");
        console.log(C.gray(i18n.t("\nForce exit.", "\nZorla çıkılıyor.")));
        process.exit(0);
      }
      _interruptSent = true;
      interrupt();
      print.system(i18n.t("Interrupting... (Ctrl+C again to force exit)", "Kesiliyor... (zorla çıkmak için tekrar Ctrl+C)"));
      return;
    }
    _interruptSent = false;
    ctrlCCount++;
    if (ctrlCCount === 1) {
      if (isTTY) {
        const rows = (rl.getCursorPos?.().rows ?? 0) + 2;
        process.stdout.write(`\x1b[0m\r\x1b[${rows}A\x1b[J`);
      }
      process.stdout.write(`${C.gray(i18n.t("Ctrl+C again to exit", "Çıkmak için tekrar Ctrl+C"))}\n`);
      setTimeout(() => { ctrlCCount = 0; }, 2000);
      redrawInput();
    } else {
      process.stdout.write("\x1b[0m");
      console.log(C.gray("\nbye."));
      process.exit(0);
    }
  });

}

main().catch(e => { print.error(e.message); process.exit(1); });
