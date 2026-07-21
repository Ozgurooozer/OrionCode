// core/session-memory.ts — Arka plan hafıza çıkarımı (session.ts'den çıkarıldı)
// @ts-nocheck
"use strict";

const i18n   = require("./i18n.ts");
const memory = require("./memory.ts");
const events = require("./events.ts");

async function _extractMemories(session) {
  if (session._extracting) return;
  session._extracting = true;
  const { print } = require("../tui/output.ts");
  try {
    const prompt = memory.buildExtractionPrompt(session.msgs);
    let raw = "";

    if (session.backend === "anthropic") {
      const anthropic = require("../backends/anthropic.ts");
      const resp = await anthropic.chat(session.model, [{ role: "user", content: prompt }], "", []);
      raw = resp.content.filter(b => b.type === "text").map(b => b.text).join("");
    } else {
      const backends = require("../backends/index.ts");
      const provider = backends.get(session.backend) ?? require("../backends/ollama.ts");
      raw = await provider.chat(session.model, [{ role: "user", content: prompt }], { stream: false });
    }

    if (!raw) return;
    const extracted = memory.parseExtractionResponse(raw);
    let added = 0;
    for (const e of extracted) {
      const id = memory.add({ ...e, source: session.id });
      if (id) added++;
    }
    if (added > 0) print.system(i18n.t(`memory: ${added} new fact(s) saved`, `hafıza: ${added} yeni bilgi kaydedildi`));
  } catch (err) {
    print.warn(i18n.t(`memory extraction failed: ${err.message}`, `hafıza çıkarımı başarısız: ${err.message}`));
    events.emitSilentCatch("session.ts:_extractMemories", err, session.id);
  } finally {
    session._extracting = false;
  }
}

module.exports = { _extractMemories };
