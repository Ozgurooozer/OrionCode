// backends/openai.js — OpenAI (OPENAI_BASE_URL ile proxy desteği)
"use strict";
const { createProvider } = require("./openai-compat.js");

const base = new URL((process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "") + "/v1");

module.exports = createProvider({
  name:         "openai",
  host:         base.hostname,
  port:         base.port ? parseInt(base.port) : undefined,
  protocol:     base.protocol === "http:" ? "http" : "https",
  basePath:     base.pathname.replace(/\/$/, ""),
  keyEnv:       "OPENAI_API_KEY",
  defaultModel: "gpt-4o-mini",
});
