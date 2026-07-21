// backends/nim.ts — NVIDIA NIM (OpenAI-uyumlu bulut API)
// Uç nokta: https://integrate.api.nvidia.com/v1
// API anahtarı: NGC_API_KEY veya NVIDIA_API_KEY env değişkeni
// Model listesi: https://build.nvidia.com/explore/discover
// @ts-nocheck
"use strict";
const { createProvider } = require("./openai-compat.ts");

module.exports = createProvider({
  name:         "nim",
  host:         "integrate.api.nvidia.com",
  basePath:     "/v1",
  keyEnvs:      ["NGC_API_KEY", "NVIDIA_API_KEY"],
  defaultModel: "meta/llama-3.1-70b-instruct",
  staticModels: [
    "meta/llama-3.1-405b-instruct",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "mistralai/mixtral-8x7b-instruct-v0.1",
    "mistralai/mistral-7b-instruct-v0.3",
    "microsoft/phi-3-mini-128k-instruct",
    "google/gemma-2-9b-it",
    "qwen/qwen2-7b-instruct",
  ],
});
