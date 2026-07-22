// core/session-dispatch.ts — Backend fallback zinciri ve dispatch döngüsü (session.ts'den çıkarıldı)
// @ts-nocheck
"use strict";

const i18n    = require("./i18n.ts");
const backends = require("../backends/index.ts");

function _buildFallbackChain(session) {
  const cfg = require("./router.ts").loadConfig();
  const primaryBackend = session._routedBackend ?? session.backend;
  const primaryModel   = session._routedModel   ?? session.model;
  const primary = { backend: primaryBackend, model: primaryModel };
  const fallbacks = [
    { backend: cfg.tier2Backend, model: cfg.tier2Model },
    { backend: "openrouter",     model: "openai/gpt-4o-mini" },
    { backend: "ollama",         model: cfg.tier1Model },
  ].filter(f => f.backend !== primaryBackend);
  return [primary, ...fallbacks];
}

async function _callWithFallback(session) {
  const chain = _buildFallbackChain(session);

  const usable = [];
  for (const step of chain) {
    const p = backends.get(step.backend);
    if (!p) continue;
    const ok = await p.isAvailable().catch(() => false);
    if (!ok) continue;
    if (step.backend === "ollama") {
      const models = await p.listModels().catch(() => []);
      if (models.length && !models.includes(step.model)) {
        step.model =
          models.find(m => /qwen.*coder|coder/i.test(m)) ??
          models.find(m => /qwen|llama3|mistral|gemma/i.test(m)) ??
          models[0];
      }
    }
    usable.push(step);
  }
  if (!usable.length) throw new Error(i18n.t("No usable backend — add a key with /provider or start Ollama", "Kullanılabilir backend yok — /saglayici ile anahtar ekle ya da Ollama başlat"));

  for (let i = 0; i < usable.length; i++) {
    const { backend, model } = usable[i];
    try {
      return await _dispatchLoop(session, backend, model);
    } catch (err) {
      const next = usable[i + 1];
      session.telemetry.record({ event: "backend_error", backend, error: err.message, fallback: next?.backend ?? null });
      const { print } = require("../tui/output.ts");
      print.warn(i18n.t(
        `${backend} error — ${next ? `falling back to ${next.backend}` : "no backend left"}: ${err.message}`,
        `${backend} hatası — ${next ? `${next.backend}'a geçiliyor` : "backend kalmadı"}: ${err.message}`
      ));
      if (!next) {
        if (session._lastRoute) {
          try { require("./thompson.ts").update(session._lastRoute.tier, session._lastRoute.reason, false); } catch {}
        }
        throw err;
      }
      session._usedFallback = true;
    }
  }
  throw new Error("unreachable: fallback loop exited without returning or throwing");
}

function _dispatchLoop(session, backend, model) {
  const origBackend = session.backend;
  const origModel   = session.model;
  session.backend = backend;
  session.model   = model;
  session._lastUsedBackend = backend;
  session._lastUsedModel   = model;
  const loop = (() => {
    if (backend === "anthropic") return require("./loops/anthropic.ts")(session);
    if (backend === "ollama")    return require("./loops/ollama.ts")(session);
    const provider = backends.get(backend);
    if (provider?.chatRich) return require("./loops/openai.ts")(session, provider);
    return Promise.reject(new Error(i18n.t(`Unknown backend: ${backend}`, `Bilinmeyen backend: ${backend}`)));
  })();
  return loop.finally(() => {
    session.backend = origBackend;
    session.model   = origModel;
  });
}

module.exports = { _buildFallbackChain, _callWithFallback, _dispatchLoop };
