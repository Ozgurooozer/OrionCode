// @ts-nocheck
﻿// core/loops/ollama_react.js — Ollama ReAct metin formatı döngüsü (native tools desteklenmeyen modeller)
"use strict";

const {
  MAX_ITERS, TIER1_TOOLS,
  _callToolCached, _emitDiff, _cleanResponse, _flattenMsgs, makeThinkFilter, makeRepeatDetector,
  tools, i18n, print, aiTurnStart, aiTurnContinue,
} = require("./shared.ts");

module.exports = async function ollamaReactLoop(session) {
  const ollama = require("../../backends/ollama.ts");
  const { stripThinking } = require("../extract.ts");

  const allowedNames = session.modes.filterDefs(tools.getDefs())
    .filter(d => TIER1_TOOLS.has(d.name)).map(d => d.name);
  const sysWithTools = session._systemTier1 + (session.mode.allowTools ? tools.buildToolPromptSuffix(allowedNames) : "");

  const history = [{ role: "system", content: sysWithTools }, ..._flattenMsgs(session.msgs)];
  let iters = 0, finalText = "", lastRaw = "";
  const detectRepeat = makeRepeatDetector();

  aiTurnStart(session.mode?.name, session.backend, `[${session._turnCount + 1}]`);
  session._interrupted = false;
  while (iters < MAX_ITERS) {
    if (session._interrupted) { process.stdout.write("\n"); print.system(i18n.t("interrupted", "kesildi")); break; }
    iters++;

    let rawResp = "";
    try {
      if (session.mode.allowTools) {
        const { spinner } = require("../../tui/index.ts");
        spinner.start(i18n.t("thinking", "düşünüyor"));
        rawResp = await ollama.chat(session.model, history, { stream: false });
        rawResp = stripThinking(rawResp);
        spinner.stop();
      } else {
        rawResp = await ollama.chat(session.model, history, {
          stream:  true,
          onToken: makeThinkFilter(out => process.stdout.write(out)),
        });
      }
    } catch (err) {
      const { spinner } = require("../../tui/index.ts");
      spinner.stop();
      process.stdout.write("\n");
      print.error(i18n.t(`Ollama error: ${err.message}`, `Ollama hatası: ${err.message}`));
      return "";
    }

    lastRaw = rawResp;

    if (rawResp.includes("<<<TOOL>>>") && !rawResp.match(/<<<TOOL>>>\s*\{/)) {
      history.push({ role: "assistant", content: rawResp });
      history.push({ role: "user", content: "<<<RESULT>>>\nHATA: Araç formatı geçersiz. Sadece JSON kullan:\n<<<TOOL>>>\n{\"name\": \"araç_adı\", \"input\": {}}\n<<<END>>>\n<<<END>>>" });
      aiTurnContinue();
      continue;
    }

    const call = tools.parseToolCall(rawResp);
    if (!call) {
      if (rawResp.includes("<<<TOOL>>>")) {
        history.push({ role: "assistant", content: rawResp });
        history.push({ role: "user", content: "<<<RESULT>>>\nHATA: Araç JSON parse edilemedi. Geçerli JSON kullan:\n<<<TOOL>>>\n{\"name\": \"araç_adı\", \"input\": {}}\n<<<END>>>\n<<<END>>>" });
        aiTurnContinue();
        continue;
      }
      finalText = rawResp;
      break;
    }

    process.stdout.write("\n");
    const perm = session.modes.canUse(call.name);
    if (!perm.ok) {
      print.warn(perm.reason);
      finalText = rawResp.replace(/<<<TOOL>>>[\s\S]*?<<<END>>>/g, "").trim();
      break;
    }

    const sig = `${call.name}:${JSON.stringify(call.input)}`;
    const { repeated: _sigRepeated, cyclical: _sigCyclical } = detectRepeat(sig);
    if (_sigRepeated) {
      print.warn(_sigCyclical
        ? i18n.t(`Cyclical tool call pattern stopped: ${call.name}`, `Döngüsel araç çağrısı deseni durduruldu: ${call.name}`)
        : i18n.t(`Repeated tool call stopped: ${call.name}`, `Tekrarlayan araç çağrısı durduruldu: ${call.name}`));
      break;
    }

    print.tool(call.name, call.input);
    const result = await _callToolCached(session._specCache, call.name, call.input ?? {}, session.id, session.telemetry, session._touchedFiles);
    print.result(result);
    _emitDiff(call.name, result, session.id);

    history.push({ role: "assistant", content: rawResp });
    history.push({ role: "user",      content: `<<<RESULT>>>\n${result}\n<<<END>>>` });
    aiTurnContinue();
  }

  if (!finalText && lastRaw) finalText = lastRaw;
  finalText = _cleanResponse(finalText);
  if (session.mode.allowTools && finalText) process.stdout.write(finalText);
  process.stdout.write("\n");
  session.msgs.push({ role: "assistant", content: finalText });
  return finalText;
};
