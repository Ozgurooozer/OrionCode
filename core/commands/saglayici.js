// core/commands/saglayici.js — BYOK provider management
// Keys are never printed to screen — only presence/absence is shown.
// Interactive mode uses select-input + masked-input (clack dependency removed).
"use strict";
const path = require("path");
const { C, T }    = require("../../tui/colors.ts");
const { print }   = require("../../tui/output.ts");
const { spinner } = require("../../tui/index.js");
const { selectInput }  = require("../../tui/select-input.js");
const { maskedInput }  = require("../../tui/masked-input.js");
const credentials      = require("../credentials.js");
const i18n = require("../i18n.js");

const CRED_FILE = path.join(__dirname, "..", "..", "credentials.json");

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";

function _col(s, w) { return String(s ?? "").padEnd(w); }

// ── Provider bilgi yardımcıları ───────────────────────────────────────────────

// Built-in sağlayıcılar (anthropic/ollama/openrouter/openai/huggingface) SADECE
// process.env[keyEnv]'e bakar (credentials.js bunu credentials.json'dan yükler).
// providers.json yalnızca gerçek custom/BYOK sağlayıcılar için geçerlidir —
// oraya bakmak, built-in bir adı yanlışlıkla custom depoda bulup "key var"
// yalanı söylemeye yol açar (özellikle _saveKeyForProvider eski bir çalıştırmada
// built-in bir isme yazdıysa — bkz. _isBuiltin).
function _isBuiltin(p) {
  return require("../../backends/index.js").ALL.includes(p);
}

// anthropic.js openai-compat üzerinden değil, elle yazılmış — .spec yok,
// ANTHROPIC_API_KEY'i doğrudan hardcode okur. Diğer built-in'ler .spec.keyEnv'e sahip.
const BUILTIN_KEY_ENV = { anthropic: "ANTHROPIC_API_KEY" };
function _builtinKeyEnvName(p) {
  return p?.spec?.keyEnv ?? BUILTIN_KEY_ENV[p?.name];
}

function _hasKey(p) {
  if (p.name === "ollama") return true;
  if (_isBuiltin(p) && !_builtinKeyEnvName(p)) return true; // anahtarsız yerel built-in (lmstudio)
  const keyEnv = _builtinKeyEnvName(p);
  if (keyEnv && process.env[keyEnv]) return true;
  if (_isBuiltin(p)) return false; // built-in + env'de yok → key yok, providers.json'a bakma
  const specs = require("../../backends/custom.js").loadSpecs();
  const s = specs[p.name];
  return !!(s?.key || (s?.keyEnv && process.env[s.keyEnv]));
}

function _keyHint(p, ok) {
  if (p.name === "ollama") return ok ? "local" : "offline";
  return ok ? "key ✓" : "key ✗";
}

// ── Provider aktivasyonu sonrası: model listesini çek → seçtir ────────────────
// Liste alınamazsa NEDENİYLE söyler (anahtar geçersiz / servis yanıt vermiyor).
async function _pickModelFor(providerName, session) {
  const backends = require("../../backends/index.js");
  const router   = require("../router.js");

  spinner.start(i18n.t(`fetching ${providerName} models`, `${providerName} modelleri alınıyor`));
  let entry = null;
  try {
    const all = await backends.detect();
    entry = all.find(b => b.name === providerName) ?? null;
  } finally {
    spinner.stop();
  }

  const models = entry?.models ?? [];
  if (!models.length) {
    print.warn(i18n.t(
      `Could not fetch model list for ${providerName} — the key may be invalid or the service unreachable.`,
      `${providerName} model listesi alınamadı — anahtar geçersiz olabilir ya da servis yanıt vermiyor.`
    ));
    print.info(i18n.t(
      `  Check the key: /provider  ·  full list: /model or [filter]`,
      `  Anahtarı kontrol et: /provider  ·  tam liste: /model or [filtre]`
    ));
    return;
  }

  const defModel = entry.defaultModel;
  const options = models.slice(0, 15).map(id => ({
    value: id,
    label: id,
    hint:  id === defModel ? i18n.t("default", "varsayılan") : "",
  }));

  const chosen = await selectInput(i18n.t("Select model:", "Model seç:"), options);
  if (chosen === null) {
    print.info(i18n.t("  Model unchanged — /model to pick later", "  Model değişmedi — sonra /model ile seçebilirsin"));
    return;
  }

  if (session) {
    session.model = chosen;
    session._manualModel = true;
  }
  router.saveConfig({ tier2Model: chosen });
  process.stdout.write(`  ${T.ok}✓${RESET}  model → ${T.accent}${chosen}${RESET}\n\n`);
}

// ── /provider — interaktif ana liste ─────────────────────────────────────────
async function listProvidersInteractive(session) {
  const backends = require("../../backends/index.js");
  const custom   = backends.custom;
  const router   = require("../router.js");
  const cfg      = router.loadConfig();
  const activeName = cfg.tier2Backend ?? "";

  // Availability kontrolü (paralel)
  const availability = {};
  await Promise.all(backends.ALL.map(async p => {
    availability[p.name] = await p.isAvailable().catch(() => false);
  }));
  const customList = custom.loadProviders();
  await Promise.all(customList.map(async p => {
    availability[p.name] = await p.isAvailable().catch(() => false);
  }));

  const allProviders = [...backends.ALL, ...customList];

  // TTY değilse metin listesi göster
  if (!process.stdin.isTTY) {
    _printProviderList(allProviders, availability, activeName, custom);
    return;
  }

  // Başlık — düz metin (ANSI truecolor cursor takibini bozuyor)
  process.stdout.write(`\n  ${T.star}Providers${RESET}  ${T.belt}${activeName || "(none)"}${RESET}\n`);

  const options = allProviders.map(p => {
    const ok   = availability[p.name] ?? false;
    const hint = _keyHint(p, ok);
    return { value: p.name, label: p.name, hint };
  });
  options.push({ value: "__presets__", label: "presets →", hint: "BYOK hazır servisler" });

  const chosen = await selectInput(
    i18n.t("Select provider to configure:", "Sağlayıcı seç:"),
    options
  );

  if (chosen === null) {
    process.stdout.write(`  ${C.muted(i18n.t("Cancelled.", "İptal edildi."))}\n\n`);
    return;
  }

  if (chosen === "__presets__") {
    await listPresetsInteractive();
    return;
  }

  const provider = allProviders.find(p => p.name === chosen);
  const ok       = availability[chosen] ?? false;
  const hasKey   = _hasKey(provider);

  if (provider.name === "ollama" || provider.name === "lmstudio") {
    if (ok && session) {
      router.saveConfig({ tier2Backend: provider.name });
      session.backend = provider.name;
    }
    const startHint = provider.name === "ollama" ? "ollama serve" : i18n.t("LM Studio → Developer → Start Server", "LM Studio → Developer → Start Server");
    const msg = ok
      ? i18n.t(`${provider.name} is running locally — activated.`, `${provider.name} yerel olarak çalışıyor — etkinleştirildi.`)
      : i18n.t(`${provider.name} is offline. Start with: ${startHint}`, `${provider.name} offline. Başlat: ${startHint}`);
    process.stdout.write(`\n  ${ok ? T.ok + "✓" : T.warn + "·"}${RESET}  ${msg}\n\n`);
    if (ok) await _pickModelFor(provider.name, session);
    return;
  }

  if (hasKey) {
    const defaultModel = custom.loadSpecs()[chosen]?.defaultModel ?? "";
    router.saveConfig({ tier2Backend: chosen });
    if (session) {
      session.backend = chosen;
      session._manualBackend = true;
      if (defaultModel) session.model = defaultModel;
    }
    process.stdout.write(`\n  ${T.ok}✓${RESET}  ${chosen}: ${i18n.t("activated", "etkinleştirildi")}\n`);
    await _pickModelFor(chosen, session);
    return;
  }

  // Key yoksa → maskelenmiş giriş
  let key;
  try {
    key = await maskedInput(i18n.t(`API key for ${chosen}: `, `${chosen} için API anahtarı: `));
  } catch {
    process.stdout.write(`  ${C.muted(i18n.t("Cancelled.", "İptal edildi."))}\n\n`);
    return;
  }

  if (!key || key.trim().length < 8) {
    process.stdout.write(`  ${T.warn}!${RESET}  ${i18n.t("Key too short (min 8 chars)", "Anahtar çok kısa (en az 8 karakter)")}\n\n`);
    return;
  }

  // Built-in sağlayıcı → SADECE env + credentials.json (providers.json'a hiç
  // yazma — oraya yazmak _hasKey()'i sonraki oturumda yanlış "key var" der hale
  // getirir, çünkü built-in'ler providers.json'u hiç okumaz).
  const builtinKeyEnv = _builtinKeyEnvName(provider);
  if (_isBuiltin(provider) && builtinKeyEnv) {
    process.env[builtinKeyEnv] = key.trim(); // bu oturumda hemen aktif
    credentials.save(CRED_FILE, builtinKeyEnv, key.trim()); // kalıcı kayıt
  } else {
    _saveKeyForProvider(chosen, key.trim(), custom);
  }
  const defaultModel = custom.loadSpecs()[chosen]?.defaultModel ?? "";
  router.saveConfig({ tier2Backend: chosen });
  if (session) {
    session.backend = chosen;
    session._manualBackend = true;
    if (defaultModel) session.model = defaultModel;
  }
  process.stdout.write(`\n  ${T.ok}✓${RESET}  ${i18n.t(`Key saved: ${chosen} — activated`, `Anahtar kaydedildi: ${chosen} — etkinleştirildi`)}\n`);
  await _pickModelFor(chosen, session);
}

// ── /provider presets — interaktif ───────────────────────────────────────────
async function listPresetsInteractive() {
  const custom = require("../../backends/custom.js");

  const options = Object.entries(custom.PRESETS).map(([name, p]) => {
    const short = (p.baseURL ?? "").replace(/^https?:\/\//, "").replace(/\/v1\/?$/, "");
    const specs  = custom.loadSpecs();
    const added  = name in specs;
    return {
      value: name,
      label: name,
      hint:  `${short}${added ? "  (added)" : ""}`,
    };
  });

  if (!process.stdin.isTTY) {
    _printPresets(custom);
    return;
  }

  process.stdout.write(`\n  ${T.nebula}Preset Providers${RESET}\n`);

  const chosen = await selectInput(
    i18n.t("Select preset to add / configure:", "Eklenecek preset:"),
    options
  );

  if (chosen === null) {
    process.stdout.write(`  ${C.muted(i18n.t("Cancelled.", "İptal edildi."))}\n\n`);
    return;
  }

  const specs = custom.loadSpecs();
  if (!(chosen in specs)) {
    custom.addProvider(chosen, {});
    print.system(i18n.t(`provider added: ${chosen}`, `sağlayıcı eklendi: ${chosen}`));
  }

  let key;
  try {
    key = await maskedInput(i18n.t(`API key for ${chosen}: `, `${chosen} için API anahtarı: `));
  } catch {
    process.stdout.write(`  ${C.muted(i18n.t("Cancelled.", "İptal edildi."))}\n\n`);
    return;
  }

  if (!key || key.trim().length < 8) {
    process.stdout.write(`  ${T.warn}!${RESET}  ${i18n.t("Key too short (min 8 chars)", "Anahtar çok kısa (en az 8 karakter)")}\n\n`);
    return;
  }

  _saveKeyForProvider(chosen, key.trim(), custom);
  // Preset'ler için de env var kaydet (keyEnv varsa)
  const presetKeyEnv = custom.PRESETS[chosen]?.keyEnv;
  if (presetKeyEnv) {
    process.env[presetKeyEnv] = key.trim();
    credentials.save(CRED_FILE, presetKeyEnv, key.trim());
  }
  process.stdout.write(`\n  ${T.ok}✓${RESET}  ${i18n.t(`Key saved: ${chosen} (providers.json — never printed to screen)`, `Anahtar kaydedildi: ${chosen} (providers.json — asla ekrana yazılmaz)`)}\n\n`);
}

// ── Key kaydetme (asla ekrana yazdırma) ──────────────────────────────────────
function _saveKeyForProvider(name, key, custom) {
  const specs   = custom.loadSpecs();
  const preset  = custom.PRESETS[name];
  const current = specs[name] ?? {
    baseURL:      preset?.baseURL,
    keyEnv:       preset?.keyEnv,
    defaultModel: preset?.defaultModel,
  };
  current.key = key;
  delete current.keyEnv;
  specs[name] = current;
  custom.saveSpecs(specs);
}

// ── Metin tabanlı fallback (non-TTY / pipe) ───────────────────────────────────
function _printProviderList(providers, availability, activeName, custom) {
  const SEP = C.muted("─".repeat(46));
  console.log(`\n  ${BOLD}${T.star}Providers${RESET}  ${C.muted(i18n.t("tier2 active →", "aktif tier2 →"))} ${T.belt}${activeName}${RESET}\n`);
  console.log(`  ${SEP}`);
  for (const p of providers) {
    const ok = availability[p.name] ?? false;
    _printProvider(p, ok, activeName, p.spec?.host);
  }
  console.log(`  ${SEP}`);
  _printHints();
}

function _printProvider(p, ok, activeName, host) {
  const active = p.name === activeName;
  const isLocal = p.name === "ollama";
  const icon = ok ? `${T.ok}✓${RESET}` : `${T.muted}·${RESET}`;
  const namePad = _col(p.name, 13);
  const nameStr = active  ? `${BOLD}${T.belt}${namePad}${RESET}`
                : ok      ? `${T.accent}${namePad}${RESET}`
                :            `${T.muted}${namePad}${RESET}`;
  const keyStatus = isLocal
    ? (ok ? `${T.ok}local${RESET}` : `${T.muted}offline${RESET}`)
    : ok  ? `${T.muted}key ✓${RESET}`
          : `${T.err}key ✗${RESET}`;
  const hostNote = host ? `  ${C.muted(host)}` : "";
  const activeTag = active ? `  ${T.belt}◀${RESET}` : "";
  console.log(`  ${icon}  ${nameStr}  ${keyStatus}${hostNote}${activeTag}`);
}

function _printPresets(custom) {
  const SEP = C.muted("─".repeat(58));
  console.log(`\n  ${BOLD}${T.nebula}Preset Providers${RESET}  ${C.muted(i18n.t("OpenAI-compatible", "OpenAI-uyumlu"))}\n`);
  console.log(`  ${C.muted(_col("name", 11))}  ${C.muted(_col("endpoint", 30))}  ${C.muted("env key")}`);
  console.log(`  ${SEP}`);
  for (const [name, p] of Object.entries(custom.PRESETS)) {
    const short = (p.baseURL ?? "").replace(/^https?:\/\//, "").replace(/\/v1\/?$/, "");
    console.log(
      `  ${T.nebula}${_col(name, 11)}${RESET}` +
      `  ${C.muted(_col(short, 30))}` +
      `  ${C.dim(p.keyEnv ?? "")}`
    );
  }
  console.log(`  ${SEP}`);
  _printPresetHints();
}

function _printHints() {
  console.log([
    "",
    `  ${C.dim("/provider presets")}${C.muted("         " + i18n.t("list BYOK-ready services", "BYOK hazır servisler"))}`,
    `  ${C.dim("/provider add <name>")}${C.muted("      " + i18n.t("add preset or custom URL", "preset ya da özel URL ekle"))}`,
    `  ${C.dim("/provider key <name> <key>")}${C.muted("  " + i18n.t("save API key (never shown)", "API anahtarı kaydet (asla gösterilmez)"))}`,
    `  ${C.dim("/model <provider> <model>")}${C.muted("   " + i18n.t("switch active model", "aktif modeli değiştir"))}`,
    "",
  ].join("\n"));
}

function _printPresetHints() {
  console.log([
    "",
    `  ${C.dim("/provider add <name>")}${C.muted("          →  " + i18n.t("add from preset", "preset'ten ekle"))}`,
    `  ${C.dim("/provider add <name> <url>")}${C.muted("    →  " + i18n.t("add custom OpenAI-compat URL", "özel OpenAI-uyumlu URL ekle"))}`,
    `  ${C.dim("/provider key <name> <key>")}${C.muted("    →  " + i18n.t("save API key (never shown)", "API anahtarı kaydet (asla gösterilmez)"))}`,
    "",
  ].join("\n"));
}

// ── Readline izolasyonu: REPL readline'ı select-input/masked-input ile çakışmasın ──
// Kapanmış readline'da pause/resume fırlatır (pipe EOF) — sessizce yut.
function _withRlPause(rl, fn) {
  try { if (rl) rl.pause(); } catch {}
  return Promise.resolve().then(fn).finally(() => { try { if (rl) rl.resume(); } catch {} });
}

// ── Command export ────────────────────────────────────────────────────────────
module.exports = [{
  name:    "provider",
  aliases: ["saglayici", "sg"],
  group:   "Model",
  desc:    "AI providers: list, add (BYOK), remove",
  usage:   "/provider [add <name> [url] | key <name> <key> | remove <name> | presets]",
  exec: async ({ args, rl, session }) => {
    const backends = require("../../backends/index.js");
    const custom   = backends.custom;
    const sub      = args[0]?.toLowerCase();

    if (sub === "presetler" || sub === "presets") {
      await _withRlPause(rl, () => listPresetsInteractive());
      return;
    }

    if (sub === "ekle" || sub === "add") {
      const name = args[1]?.toLowerCase();
      if (!name) { print.error(i18n.t("Usage: /provider add <name> [baseURL]", "Kullanım: /saglayici ekle <ad> [baseURL]")); return; }
      const baseURL = args[2];
      try {
        const spec = custom.addProvider(name, { baseURL });
        print.system(i18n.t(`provider added: ${name} → ${spec.baseURL}`, `sağlayıcı eklendi: ${name} → ${spec.baseURL}`));
        const hasKey = spec.keyEnv && process.env[spec.keyEnv];
        if (!hasKey) {
          print.info(i18n.t(`  Key required: /provider key ${name} <key>`, `  Anahtar gerekli: /saglayici anahtar ${name} <key>`));
          if (spec.keyEnv) print.info(i18n.t(`  or add "${spec.keyEnv.toLowerCase()}" to credentials.json`, `  ya da credentials.json'a "${spec.keyEnv.toLowerCase()}" ekle`));
        }
      } catch (err) {
        print.error(err.message);
        print.info(i18n.t("For known presets: /provider presets", "Bilinen preset'ler için: /saglayici presetler"));
      }
      return;
    }

    if (sub === "anahtar" || sub === "key") {
      const name = args[1]?.toLowerCase();
      const key  = args[2];
      if (!name || !key) { print.error(i18n.t("Usage: /provider key <name> <key>", "Kullanım: /saglayici anahtar <ad> <key>")); return; }
      const specs  = custom.loadSpecs();
      const preset = custom.PRESETS[name];
      if (!specs[name] && !preset) { print.error(i18n.t(`Add it first: /provider add ${name}`, `Önce ekle: /saglayici ekle ${name}`)); return; }
      const spec = specs[name] ?? { baseURL: preset.baseURL, defaultModel: preset.defaultModel };
      spec.key = key;
      delete spec.keyEnv;
      specs[name] = spec;
      custom.saveSpecs(specs);
      print.system(i18n.t(`key saved: ${name} (providers.json — never printed to screen)`, `anahtar kaydedildi: ${name} (providers.json — asla ekrana yazdırılmaz)`));
      return;
    }

    if (sub === "sil" || sub === "remove") {
      const name = args[1]?.toLowerCase();
      if (!name) { print.error(i18n.t("Usage: /provider remove <name>", "Kullanım: /saglayici sil <ad>")); return; }
      const ok = custom.removeProvider(name);
      print.system(ok
        ? i18n.t(`provider removed: ${name}`, `sağlayıcı silindi: ${name}`)
        : i18n.t(`${name} is not defined`, `${name} tanımlı değil`));
      return;
    }

    // /provider — interaktif ana liste
    await _withRlPause(rl, () => listProvidersInteractive(session));
  },
}];
