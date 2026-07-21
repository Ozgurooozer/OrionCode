// core/credentials.js — credentials.json → env (BYOK)
// @ts-nocheck
// Her *_api_key / *_token / *_key alanı büyük harfli env değişkenine taşınır.
// örn: groq_api_key → GROQ_API_KEY, hf_token → HF_TOKEN
// Değerler asla hiçbir çıktı yoluna yazılmaz.
"use strict";
const fs   = require("fs");
const path = require("path");

function load(file = path.join(__dirname, "..", "credentials.json")) {
  try {
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const [k, v] of Object.entries(c)) {
      if (typeof v !== "string" || !v) continue;
      if (!/(_api_key|_token|_key)$/i.test(k)) continue;
      const env = k.toUpperCase();
      if (!process.env[env]) process.env[env] = v;
    }
    return true;
  } catch { return false; }
}

// Key'i credentials.json'a kalıcı kaydet (asla ekrana yazdırılmaz)
function save(file, envKey, value) {
  if (!file || !envKey || !value) return false;
  try {
    let creds = {};
    try { creds = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    creds[envKey.toLowerCase()] = value;
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(creds, null, 2), "utf8");
    fs.renameSync(tmp, file);
    return true;
  } catch { return false; }
}

module.exports = { load, save };
