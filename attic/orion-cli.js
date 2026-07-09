#!/usr/bin/env node
const readline = require("readline");
const http     = require("http");
const https    = require("https");
const fs       = require("fs");
const path     = require("path");

const ROOT = __dirname;

function readFile(name) {
  try { return fs.readFileSync(path.join(ROOT, name), "utf8"); } catch { return ""; }
}

function buildSystem() {
  return readFile("PERSONA.md") + `\n\nAdın Orion Aethelred. Sahibin Ozyn. Bu CLI üzerinden konuşuyorsunuz.`;
}

// ── OLLAMA ───────────────────────────────────────────────────────────────────

function ollamaPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: "localhost", port: 11434, path, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

async function ollamaModels() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: "localhost", port: 11434, path: "/api/tags", method: "GET" },
      res => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => {
          try { resolve(JSON.parse(d).models?.map(m => m.name) ?? []); }
          catch { resolve([]); }
        });
      }
    );
    req.on("error", () => resolve([]));
    req.setTimeout(1500, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── ANTHROPIC ────────────────────────────────────────────────────────────────

async function anthropicChat(messages, system) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.default();
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system,
    messages,
  });
  return res.content.filter(b => b.type === "text").map(b => b.text).join("");
}

// ── ANA ──────────────────────────────────────────────────────────────────────

async function main() {
  const system   = buildSystem();
  const messages = [];
  let backend, model;

  // Backend seç
  if (process.env.ANTHROPIC_API_KEY) {
    backend = "anthropic";
    model   = "claude-sonnet-4-6";
  } else {
    const models = await ollamaModels();
    if (!models.length) {
      console.error("Backend yok — ANTHROPIC_API_KEY ya da Ollama gerekli.");
      process.exit(1);
    }
    backend = "ollama";

    // Model seçimi: argümandan, env'den, ya da listeden
    model = process.argv[2]
      ?? process.env.OLLAMA_MODEL
      ?? models[0];

    if (!models.includes(model)) {
      console.log("Mevcut modeller:");
      models.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
      console.error(`"${model}" bulunamadı.`);
      process.exit(1);
    }
  }

  console.log(`\x1b[36mOrion\x1b[0m — ${backend === "anthropic" ? "Anthropic" : model}`);
  console.log(`\x1b[90mÇıkmak: Ctrl+C  |  Yeni oturum: /sifirla\x1b[0m\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36mozyn>\x1b[0m ",
  });

  rl.prompt();

  rl.on("line", async line => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    if (text === "/sifirla") {
      messages.length = 0;
      console.log("\x1b[90m[oturum sıfırlandı]\x1b[0m\n");
      rl.prompt(); return;
    }

    messages.push({ role: "user", content: text });

    try {
      let reply;
      if (backend === "anthropic") {
        reply = await anthropicChat([...messages], system);
      } else {
        const res = await ollamaPost("/api/chat", {
          model,
          stream: false,
          messages: [{ role: "system", content: system }, ...messages],
        });
        reply = res.message?.content ?? "(yanıt yok)";
      }
      messages.push({ role: "assistant", content: reply });
      console.log(`\n\x1b[33morion>\x1b[0m ${reply}\n`);
    } catch (err) {
      console.error(`\x1b[31mHata:\x1b[0m ${err.message}`);
    }

    rl.prompt();
  });

  rl.on("close", () => process.exit(0));
}

main().catch(e => { console.error(e.message); process.exit(1); });
