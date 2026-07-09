// backends/huggingface.js — HuggingFace Inference (OpenAI compat router)
"use strict";
const https = require("https");
const { createProvider } = require("./openai-compat.js");

const provider = createProvider({
  name:         "huggingface",
  host:         "api-inference.huggingface.co",
  basePath:     "/v1",
  keyEnvs:      ["HF_TOKEN", "HUGGINGFACE_API_KEY"],
  defaultModel: "meta-llama/Meta-Llama-3-8B-Instruct",
});

// Model listesi HF Hub'dan gelir (inference ucu /models sunmaz)
function listModels({ task = "text-generation", limit = 30, provider: infProvider } = {}) {
  return new Promise(resolve => {
    let qs = `pipeline_tag=${task}&sort=downloads&limit=${limit}`;
    if (infProvider) qs += `&inference_provider=${infProvider}`;
    const req = https.request(
      { hostname: "huggingface.co", path: `/api/models?${qs}`, method: "GET",
        headers: { "User-Agent": "orion-cli/3.0" } },
      res => {
        let d = "";
        res.on("data", c => (d += c));
        res.on("end", () => {
          try {
            const list = JSON.parse(d);
            resolve(Array.isArray(list) ? list.map(m => m.id) : []);
          } catch { resolve([]); }
        });
      }
    );
    req.on("error", () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

module.exports = { ...provider, listModels, listModelIds: async (l = 30) => listModels({ limit: l }) };
