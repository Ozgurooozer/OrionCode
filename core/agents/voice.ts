// core/agents/voice.js — TTS (Piper) skill
// @ts-nocheck
// Saatçi ilkesi: yazılı çıktının render'ı, ayrı üretim değil.
// Piper CLI: piper --model <voice> --output_file <path>
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { spawnSync } = require("child_process");
const crypto = require("crypto");

// ── Manifest (Hafta 4 standardı) ─────────────────────────────────────────────

const manifest = Object.freeze({
  name:          "voice",
  version:       "1.0",
  cost_class:    "single_shot",  // Piper local, LLM yok
  vram_needed_gb: 0.8,
  triggers:      ["ses", "seslendir", "oku", "söyle", "voice", "speak", "tts", "audio"],
  input_schema:  { text: "string", voice: "string?" },
  output_schema: { audio_path: "string", duration_ms: "integer?", success: "boolean" },
});

const DEFAULTS = {
  voice:         "tr_TR-dfki-medium",  // Piper Türkçe model
  outputDir:     path.join(os.homedir(), ".orion", "voice_output"),
  piperBin:      "piper",              // PATH'te piper olmalı
  timeoutMs:     30_000,
};

// ── Config ────────────────────────────────────────────────────────────────────

function _cfg() {
  try {
    const r = require("../router.ts").loadConfig();
    return {
      voice:     r.piperVoice   ?? DEFAULTS.voice,
      outputDir: r.voiceOutputDir ?? DEFAULTS.outputDir,
      piperBin:  r.piperBin     ?? DEFAULTS.piperBin,
    };
  } catch { return { voice: DEFAULTS.voice, outputDir: DEFAULTS.outputDir, piperBin: DEFAULTS.piperBin }; }
}

// ── Piper varlık kontrolü ─────────────────────────────────────────────────────

function isPiperAvailable(piperBin) {
  try {
    const r = spawnSync(piperBin, ["--version"], { timeout: 3000, encoding: "utf8" });
    return r.status === 0;
  } catch { return false; }
}

// ── Çalıştırma ────────────────────────────────────────────────────────────────

/**
 * Metni sese çevir.
 * @param {string} text
 * @param {object} [opts]
 * @param {string} [opts.voice]
 * @param {(msg:string)=>void} [opts.onProgress]
 * @returns {{ success: boolean, audio_path?: string, duration_ms?: number, error?: string }}
 */
function run(text, { voice, onProgress = () => {} } = {}) {
  const cfg = _cfg();
  const useVoice = voice ?? cfg.voice;
  const t0 = Date.now();

  if (!text || !text.trim()) {
    return { success: false, error: "Metin boş — voice.run() boş girdi" };
  }

  // Piper var mı?
  onProgress("Piper kontrol ediliyor...");
  if (!isPiperAvailable(cfg.piperBin)) {
    return {
      success: false,
      error: `Piper bulunamadı (${cfg.piperBin}). Kurulum: https://github.com/rhasspy/piper`,
    };
  }

  // Çıktı dizini
  try { fs.mkdirSync(cfg.outputDir, { recursive: true }); } catch {}

  const hash     = crypto.createHash("sha1").update(text.slice(0, 200)).digest("hex").slice(0, 8);
  const outFile  = path.join(cfg.outputDir, `voice_${Date.now()}_${hash}.wav`);

  onProgress(`TTS üretiliyor (${useVoice})...`);

  // piper --model <voice> --output_file <path>
  // stdin'e metin gönderilir
  const result = spawnSync(
    cfg.piperBin,
    ["--model", useVoice, "--output_file", outFile],
    {
      input:   text,
      encoding: "utf8",
      timeout:  DEFAULTS.timeoutMs,
    }
  );

  if (result.status !== 0) {
    const err = (result.stderr ?? "").slice(0, 200) || `Piper çıkış kodu ${result.status}`;
    return { success: false, error: err };
  }

  if (!fs.existsSync(outFile)) {
    return { success: false, error: "Piper çalıştı ama dosya oluşmadı" };
  }

  // Event
  try {
    const { emit } = require("../events.ts");
    emit("skill:voice:done", null, { audio_path: outFile, voice: useVoice });
  } catch {}

  return {
    success:     true,
    audio_path:  outFile,
    voice:       useVoice,
    duration_ms: Date.now() - t0,
  };
}

module.exports = { run, isPiperAvailable, DEFAULTS, manifest };
