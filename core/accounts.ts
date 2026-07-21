// core/accounts.js — Adlandırılmış API anahtar profilleri (çoklu hesap)
// @ts-nocheck
// Depo: ~/.orion/accounts.json (0600). Aktif profil başlangıçta env'e uygulanır;
// credentials.json temel katmandır, profil onun üzerine yazar.
"use strict";
const fs   = require("fs");
const path = require("path");
const os   = require("os");

const FILE = path.join(process.env.ORION_HOME || os.homedir(), ".orion", "accounts.json");

// Bilinen tüm anahtar env adları: built-in + preset + providers.json
function knownKeyEnvs() {
  const envs = new Set(["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "HF_TOKEN", "HUGGINGFACE_API_KEY"]);
  try {
    const { PRESETS, loadSpecs } = require("../backends/custom.ts");
    for (const p of Object.values(PRESETS)) if (p.keyEnv) envs.add(p.keyEnv);
    for (const s of Object.values(loadSpecs())) if (s?.keyEnv) envs.add(s.keyEnv);
  } catch {}
  return [...envs];
}

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return { active: null, profiles: {} }; }
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

// Aktif profili process.env'e uygula — başlangıçta ve /account use'da çağrılır
function applyActive() {
  const data = load();
  if (!data.active || !data.profiles[data.active]) return null;
  const profile = data.profiles[data.active];
  for (const [env, val] of Object.entries(profile)) process.env[env] = val;
  return data.active;
}

module.exports = { FILE, knownKeyEnvs, load, save, applyActive };
