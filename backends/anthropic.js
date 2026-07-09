// backends/anthropic.js
async function isAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function listModels() {
  return [
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
  ];
}

async function chat(model, messages, system, toolDefs, { onToken } = {}) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client    = new Anthropic.default();

  const stream = client.messages.stream({
    model:      model ?? "claude-sonnet-4-6",
    max_tokens: 8192,
    system,
    tools:      toolDefs ?? [],
    messages,
  });

  stream.on("text", text => { if (onToken) onToken(text); });

  return await stream.finalMessage();
}

module.exports = { name: "anthropic", isAvailable, listModels, chat };
