// core/subagent.js — Bağımsız alt-ajan çalıştırma
const { spawn } = require("child_process");
const path = require("path");

const ORION = path.join(__dirname, "..", "orion.js");

/**
 * Tek bir görevi headless modda çalıştır.
 * @param {object} opts
 * @param {string} opts.task       - Ajan için görev metni
 * @param {string} [opts.model]    - Model adı
 * @param {string} [opts.backend]  - "ollama" | "anthropic" vb.
 * @param {number} [opts.timeout]  - ms cinsinden timeout (default 90s)
 * @returns {Promise<{stdout, stderr, code}>}
 */
function run({ task, model, backend, role, memoryScope, timeout = 90000 }) {
  return new Promise((resolve, reject) => {
    const env  = { ...process.env };
    if (model)       env.OLLAMA_MODEL = model;
    if (memoryScope) env.ORION_MEMORY_SCOPE = memoryScope;
    if (role)        env.ORION_ROLE = role;

    const args = ["--headless"];
    if (backend) args.push("--backend", backend);
    if (model)   args.push("--model", model);
    if (role)    args.push("--role", role);

    const child = spawn("node", [ORION, ...args], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin.write(task + "\n");
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => (stdout += d));
    child.stderr.on("data", d => (stderr += d));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Sub-agent timeout (${timeout / 1000}s): ${task.slice(0, 60)}`));
    }, timeout);

    child.on("close", code => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
    });

    child.on("error", err => { clearTimeout(timer); reject(err); });
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
