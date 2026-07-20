// tools/shell.js — Komut çalıştırma (streaming)
"use strict";
const { spawn }  = require("child_process");
const path       = require("path");
const { C }      = require("../tui/colors.ts");

const DEFS = [
  {
    name: "run_command",
    description: "Shell komutu çalıştır. Çıktı gerçek zamanlı satır satır akıtılır. Uzun süren komutlar (test, build, install) için kullan.",
    input_schema: {
      type: "object",
      properties: {
        command:    { type: "string",  description: "Çalıştırılacak komut" },
        cwd:        { type: "string",  description: "Çalışma dizini (varsayılan: ORION_WORKSPACE ya da '.')" },
        timeout_ms: { type: "number",  description: "Timeout ms (varsayılan: 120000)" },
        env:        { type: "object",  description: "Eklenecek ortam değişkenleri" },
      },
      required: ["command"],
    },
  },
];

async function _askApproval(command) {
  const cfg = require("../core/router.ts").loadConfig();
  if (cfg.autoApproveCommands) return true;
  // Güvenilir workspace'de komutlar otomatik onaylanır (etkileşimli modda gösterilir)
  const ws = require("../core/workspace.js");
  const cwd = process.env.ORION_WORKSPACE ?? process.cwd();
  if (ws.isTrusted(cwd)) {
    process.stdout.write(`\n  ${C.yellow("⚡")} ${C.dim("auto (trusted):")} ${command}\n`);
    return true;
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const { selectInput } = require("../tui/select-input.js");
    const choice = await selectInput(
      `${C.yellow("⚡")} ${command}`,
      [
        { value: "yes", label: "Run",  hint: "Enter" },
        { value: "no",  label: "Skip", hint: "Esc" },
      ]
    );
    return choice === "yes";
  }
  return false;
}

// Spawn + line-buffered streaming. stderr dim renkte gösterilir.
function _runStreaming(command, cwd, timeoutMs, extraEnv) {
  return new Promise((resolve) => {
    const isWin  = process.platform === "win32";
    const shell  = isWin ? "cmd.exe" : "/bin/sh";
    const args   = isWin ? ["/d", "/s", "/c", command] : ["-c", command];

    let child;
    try {
      child = spawn(shell, args, {
        cwd,
        env:   { ...process.env, ...extraEnv },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      return resolve({ output: `spawn error: ${err.message}`, code: -1, timedOut: false });
    }

    const lines = [];
    // Line-buffered reader: accumulate partial lines, flush on newline
    const makeReader = (prefix) => {
      let buf = "";
      return (chunk) => {
        buf += chunk.toString("utf8");
        const parts = buf.split(/\r?\n/);
        buf = parts.pop();                 // son yarım satırı sakla
        for (const line of parts) {
          const display = prefix ? C.dim(prefix + line) : line;
          process.stdout.write(display + "\n");
          lines.push(line);
          if (lines.length > 2000) lines.shift(); // bellek taşmasını önle
        }
      };
    };

    child.stdout.on("data", makeReader(""));
    child.stderr.on("data", makeReader("  "));  // indent ile ayırt et

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch {}
      setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 3000);
      lines.push(`[timeout: ${timeoutMs}ms]`);
      resolve({ output: lines.join("\n"), code: -1, timedOut: true });
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ output: lines.join("\n"), code: code ?? 0, timedOut: false });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ output: `spawn error: ${err.message}`, code: -1, timedOut: false });
    });
  });
}

async function execute(name, input) {
  if (name !== "run_command") return `Bilinmeyen araç: ${name}`;

  const cfg       = require("../core/router.ts").loadConfig();
  const isHeadless = process.argv.includes("--headless");
  // ORION_ALLOW_COMMANDS: coordinator subagent'ları içten güvenilirdir — onay atlı
  const innerAgent = process.env.ORION_ALLOW_COMMANDS === "1";
  const autoApprove = !!(cfg.autoApproveCommands) || innerAgent;

  if (autoApprove) {
    // Otomatik onay: headless dahil her bağlamda çalışır
    if (!isHeadless && !innerAgent) {
      process.stdout.write(`\n  ${C.yellow("⚡")} ${C.dim("auto-run:")} ${input.command}\n`);
    }
  } else if (isHeadless) {
    // Headless + onay yok: güvenlik sınırı — çalıştırılmaz
    return "run_command: headless modda autoApproveCommands gerekli. /ayar autoApproveCommands true ile etkinleştir.";
  } else {
    const ok = await _askApproval(input.command);
    if (!ok) return "İptal — onay verilmedi.";
  }

  const cwd       = path.resolve(input.cwd ?? process.env.ORION_WORKSPACE ?? ".");
  const timeoutMs = input.timeout_ms ?? 120_000;
  const extraEnv  = typeof input.env === "object" && input.env ? input.env : {};

  process.stdout.write(`\n`);
  const { output, code, timedOut } = await _runStreaming(input.command, cwd, timeoutMs, extraEnv);

  const MAX_OUT = 16000;
  const trimmed = output.length > MAX_OUT
    // Kuyruk ağırlıklı kırpma: hataların olduğu son bölümü daha fazla sakla
    ? output.slice(0, MAX_OUT / 4) + "\n… [çıktı kırpıldı — toplam " + output.length + " karakter] …\n" + output.slice(-(MAX_OUT * 3 / 4))
    : output;

  const header = `$ ${input.command}`;
  if (timedOut) return `${header}\n[timeout: ${timeoutMs}ms]\n${trimmed || "(çıktı yok)"}`;
  if (code !== 0) return `${header}\n[exit ${code}]\n${trimmed || "(çıktı yok)"}`;
  return trimmed ? `${header}\n${trimmed}` : `${header}\n(çıktı yok)`;
}

module.exports = { DEFS, execute };
