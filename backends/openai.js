// backends/openai.js — OpenAI (OPENAI_BASE_URL ile proxy desteği)
"use strict";
const { createProvider } = require("./openai-compat.js");

// OPENAI_BASE_URL /v1 ile bitiyorsa tekrar ekleme (/v1/v1 önlenir)
const raw  = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "");
const base = new URL(raw.endsWith("/v1") ? raw : raw + "/v1");

module.exports = createProvider({
  name:         "openai",
  host:         base.hostname,
  port:         base.port ? parseInt(base.port) : undefined,
  protocol:     base.protocol === "http:" ? "http" : "https",
  basePath:     base.pathname.replace(/\/$/, ""),
  keyEnv:       "OPENAI_API_KEY",
  defaultModel: "gpt-4o-mini",
});
