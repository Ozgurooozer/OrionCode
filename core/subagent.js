// core/subagent.js — Bağımsız alt-ajan çalıştırma
const { spawn } = require("child_process");
const path = require("path");

const ORION = path.join(__dirname, "..", "orion.js");

/**
 * Tek bir görevi headless modda çalıştır.
 * @param {object} opts
 * @param {string} opts.task            - Ajan için görev metni
 * @param {string} [opts.model]         - Model adı
 * @param {string} [opts.backend]       - "ollama" | "anthropic" vb.
 * @param {string} [opts.role]          - ORION_ROLE env + --role arg (researcher/coder/reviewer)
 * @param {string} [opts.memoryScope]   - base64 encoded relevant memories (ORION_MEMORY_SCOPE)
 * @param {boolean} [opts.allowCommands] - Headless modda run_command'e izin ver (coordinator için)
 * @param {number}  [opts.timeout]       - ms cinsinden timeout (default 300s)
 * @param {boolean} [opts.streamToParent] - true: stdout satır satır parent'a iletilir (coordinator progress için)
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function run({ task, model, backend, role, memoryScope, workspace, allowCommands = false, timeout = 300000, streamToParent = false }) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (model)           env.OLLAMA_MODEL = model;
    if (memoryScope)     env.ORION_MEMORY_SCOPE = memoryScope;
    if (role)            env.ORION_ROLE = role;
    if (allowCommands)   env.ORION_ALLOW_COMMANDS = "1";
    // Workspace: subagent çalışma dizinini ana ajandan devralır
    const cwd = workspace ?? process.env.ORION_WORKSPACE ?? process.cwd();
    env.ORION_WORKSPACE = cwd;

    const args = ["--headless"];
    if (backend) args.push("--backend", backend);
    if (model)   args.push("--model", model);
    if (role)    args.push("--role", role);

    const child = spawn("node", [ORION, ...args], {
      env,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdin_ok = true;
    child.stdin.on("error", () => {
      stdin_ok = false;
      clearTimeout(timer);
      try { child.kill("SIGTERM"); } catch {}
      resolve({ stdout: "", stderr: "stdin write failed", code: -2, timedOut: false });
    });
    try {
      child.stdin.write(task + "\n");
      child.stdin.end();
    } catch (writeErr) {
      stdin_ok = false;
      clearTimeout(timer);
      try { child.kill("SIGTERM"); } catch {}
      resolve({ stdout: "", stderr: `stdin write failed: ${writeErr.message}`, code: -2, timedOut: false });
    }
    if (!stdin_ok) return; // listener zaten resolve etti

    let stdout = "";
    let stderr = "";
    // streamToParent: coordinator progress için satır satır ilet
    const rolePrefix = role ? `\x1b[90m[${role}]\x1b[0m ` : "";
    let lineBuf = "";
    child.stdout.on("data", d => {
      const chunk = d.toString();
      stdout += chunk;
      if (streamToParent) {
        lineBuf += chunk;
        const parts = lineBuf.split(/\r?\n/);
        lineBuf = parts.pop();
        for (const line of parts) {
          // <<<ORION_FINAL>>> marker ve sonrasını filtreleme
          if (!line.includes("<<<ORION_FINAL>>>") && !line.includes("<<<END_FINAL>>>")) {
            process.stdout.write(rolePrefix + line + "\n");
          }
        }
      }
    });
    child.stderr.on("data", d => { stderr += d; });

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch {}
      setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 3000);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: -1, timedOut: true });
    }, timeout);

    child.on("close", code => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 0, timedOut: false });
    });

    child.on("error", err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Birden fazla görevi paralel çalıştır.
 * @param {Array<object>} tasks - Her biri run() parametreleri
 * @returns {Promise<Array>}
 */
function runParallel(tasks) {
  return Promise.all(tasks.map(run));
}

module.exports = { run, runParallel };
