// backends/lmstudio.js — LM Studio yerel sunucusu (OpenAI-uyumlu, anahtar yok)
// Varsayılan uç: http://localhost:1234/v1 — LMSTUDIO_HOST / LMSTUDIO_PORT ile değişir.
"use strict";
const { createProvider } = require("./openai-compat.ts");

const provider = createProvider({
  name:     "lmstudio",
  host:     process.env.LMSTUDIO_HOST ?? "localhost",
  port:     parseInt(process.env.LMSTUDIO_PORT ?? "1234", 10),
  protocol: "http",
  basePath: "/v1",
});

// Anahtar gerektirmez — kullanılabilirlik "sunucu ayakta ve model yüklü mü" demektir.
// createProvider'ın varsayılanı (anahtar yoksa hep true) yerel servis için yanlış olur.
let _avail = { val: null, ts: 0 };
provider.isAvailable = async function () {
  const now = Date.now();
  if (_avail.val !== null && now - _avail.ts < 30_000) return _avail.val;
  const models = await provider.listModels({ limit: 1 }).catch(() => []);
  _avail = { val: models.length > 0, ts: Date.now() };
  return _avail.val;
};

module.exports = provider;
