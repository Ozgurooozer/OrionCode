// scripts/meissa-promptfoo-provider.js — promptfoo custom provider (class format)
"use strict";

const path = require("path");
process.env.ORION_HOME = process.env.ORION_HOME || require("os").homedir() + "/.orion";

const meissa = require(path.join(__dirname, "..", "core", "agents", "meissa.ts"));

class MeissaProvider {
  constructor(_options) {}

  id() { return "meissa"; }

  async callApi(prompt) {
    try {
      const result = await meissa.run(prompt);
      return {
        output: JSON.stringify({
          kategoriler: result.kategoriler,
          rota:        result.rota,
          skill:       result.skill,
          karmasiklik: result.karmasiklik,
          level:       result._meta?.level,
          error:       result._meta?.error ?? null,
        }),
      };
    } catch (e) {
      return { output: JSON.stringify({ error: e.message }), error: e.message };
    }
  }
}

module.exports = MeissaProvider;
