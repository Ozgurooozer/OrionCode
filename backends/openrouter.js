// backends/openrouter.js — OpenRouter.ai (600+ model, OpenAI compat, native tools)
"use strict";
const { createProvider } = require("./openai-compat.js");

module.exports = createProvider({
  name:     "openrouter",
  host:     "openrouter.ai",
  basePath: "/api/v1",
  keyEnv:   "OPENROUTER_API_KEY",
  headers: {
    "HTTP-Referer": "https://github.com/orion-cli",
    "X-Title":      "Orion CLI",
  },
  defaultModel: "openai/gpt-4o-mini",
});
