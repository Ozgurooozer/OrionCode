// tests/helpers/mock-session.js — Paylaşılan mock Session objesi
"use strict";

function makeMockSession(overrides = {}) {
  return Object.assign({
    config: {},
    messages: [],
    model: "test-model",
    backend: "test-backend",
    mode: "agent",
    budget: { tokens: 0, cost: 0 },
    system: "",
    setMode: () => {},
    print: () => {},
    send: async () => "",
  }, overrides);
}

module.exports = { makeMockSession };
