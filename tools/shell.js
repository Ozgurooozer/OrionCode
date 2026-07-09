// tools/shell.js — Komut çalıştırma (Ozyn onayı gerekir)
const { execSync } = require("child_process");
const path         = require("path");
const { C }        = require("../tui/index.js");

const DEFS = [
  {
    name: "run_command",
    description: "Shell komutu çalıştır. Ozyn EVET demeden çalıştırmaz.",
    input_schema: {
      type: "object",
      properties: {
        command:    { type: "string", description: "Çalıştırılacak komut" },
        cwd:        { type: "string", description: "Çalışma dizini (default: .)" },
        timeout_ms: { type: "number", description: "Timeout ms (default 30000)" },
      },
      required: ["command"],
    },
  },
];

// stdin'den tek satır oku — var olan readline'ı kapatmak zorunda kalmadan
function readLine(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let buf = "";
    let done = false;
    const finish = val => {
      if (done) return;
      done = true;
      process.stdin.removeListener("data", onData);
      process.stdin.removeListener("end", onEnd);
      process.stdin.pause();
      resolve(val);
    };
    const onData = chunk => {
      buf += chunk;
      if (buf.includes("\n")) finish(buf.split("\n")[0].trim());
    };
    // stdin kapalıysa (pipe bitti) onay verilmemiş sayılır
    const onEnd = () => finish("");
    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
    if (process.stdin.readableEnded || process.stdin.destroyed) finish("");
  });
}

async function execute(name, input) {
  if (name !== "run_command") return `Bilinmeyen araç: ${name}`;

  // Headless modunda (sub-ajan) run_command yasak
  if (process.argv.includes("--headless")) return "run_command headless modunda kullanılamaz.";

  process.stdout.write(`\n  ${C.yellow("⚡ Komut:")} ${input.command}\n`);
  const ans = await readLine(`  ${C.gray("Onay için EVET:")} `);

  if (ans.toUpperCase() !== "EVET") return "İptal — onay verilmedi.";

  try {
    const out = execSync(input.command, {
      cwd:       path.resolve(input.cwd ?? "."),
      encoding:  "utf8",
      timeout:   input.timeout_ms ?? 30000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return (out || "(çıktı yok)").slice(0, 4000);
  } catch (e) {
    return `Hata (exit ${e.status}):\n${(e.stderr || e.message || "").slice(0, 2000)}`;
  }
}

module.exports = { DEFS, execute };
