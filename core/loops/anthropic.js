// core/loops/anthropic.js — Anthropic native blok akışı döngüsü
"use strict";

const {
  MAX_ITERS, PARALLEL_SAFE,
  _callToolCached, _emitDiff,
  tools, events, i18n, print, aiTurnStart, aiTurnContinue,
} = require("./shared.js");

module.exports = async function anthropicLoop(session) {
  const anthropic = require("../../backends/anthropic.js");
  const { getEffectiveMemoryEffort } = require("../router.js");
  const allowedDefs = session.modes.filterDefs(tools.getDefs());
  const useThinking = getEffectiveMemoryEffort() === "high";
  const chatOpts    = {
    onToken: tok => { process.stdout.write(tok); events.emit("text_delta", session.id, { delta: tok }); },
    thinking: useThinking,
    signal:   session._abortController?.signal,
  };
  aiTurnStart(session.mode?.name, session.backend, `[${session._turnCount + 1}]`);

  let totalCacheRead = 0, totalCacheWrite = 0;

  let resp;
  try {
    resp = await anthropic.chat(session.model, session.msgs, session.system, allowedDefs, chatOpts);
  } catch (err) {
    if (session._interrupted || err.name === "AbortError" || err.message?.toLowerCase().includes("abort")) {
      process.stdout.write("\n");
      print.system(i18n.t("interrupted", "kesildi"));
      return "";
    }
    throw err;
  }
  totalCacheRead  += resp.usage?.cache_read_input_tokens    ?? 0;
  totalCacheWrite += resp.usage?.cache_creation_input_tokens ?? 0;

  let _anthropicIters = 0;
  let _lastAnthropicSig = "";
  while (resp.stop_reason === "tool_use") {
    if (++_anthropicIters > MAX_ITERS) {
      print.warn(i18n.t(
        `Max iterations (${MAX_ITERS}) reached without a final response.`,
        `Maksimum iterasyon (${MAX_ITERS}) aşıldı, nihai yanıt alınamadı.`
      ));
      break;
    }
    if (session._interrupted) { process.stdout.write("\n"); print.system(i18n.t("interrupted", "kesildi")); break; }

    process.stdout.write("\n");
    session.msgs.push({ role: "assistant", content: resp.content });
    const results = [];

    const _roundSig = resp.content
      .filter(b => b.type === "tool_use")
      .map(b => `${b.name}:${JSON.stringify(b.input)}`)
      .join("|");
    const _repeated = _roundSig === _lastAnthropicSig;
    _lastAnthropicSig = _roundSig;

    const _toolBlocks = resp.content.filter(b => b.type === "tool_use");

    const _canParallel = !_repeated && _toolBlocks.length > 1
      && _toolBlocks.every(b => PARALLEL_SAFE.has(b.name) && session.modes.canUse(b.name).ok);

    if (_canParallel) {
      session.telemetry.record({ event: "parallel_tools", count: _toolBlocks.length, tools: _toolBlocks.map(b => b.name) });
      const outs = await Promise.all(
        _toolBlocks.map(b => _callToolCached(session._specCache, b.name, b.input, session.id, session.telemetry, session._touchedFiles))
      );
      for (let _pi = 0; _pi < _toolBlocks.length; _pi++) {
        const b = _toolBlocks[_pi], out = outs[_pi];
        events.emit("approval_resolved", session.id, { tool: b.name, ok: true, reason: null });
        print.tool(b.name, b.input);
        print.result(out);
        _emitDiff(b.name, out, session.id);
        results.push({ type: "tool_result", tool_use_id: b.id, content: String(out) });
      }
    } else {
      for (const block of resp.content) {
        if (block.type !== "tool_use") continue;
        const perm = session.modes.canUse(block.name);
        events.emit("approval_resolved", session.id, { tool: block.name, ok: perm.ok, reason: perm.reason ?? null });
        if (!perm.ok) {
          events.emit("approval_request", session.id, { tool: block.name, input: block.input, reason: perm.reason });
          print.warn(perm.reason);
          results.push({ type: "tool_result", tool_use_id: block.id, content: perm.reason });
          continue;
        }
        if (_repeated) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: i18n.t(
              "Same tool called again with the same arguments — result is above. Write your answer.",
              "Aynı araç aynı argümanlarla tekrar çağrıldı — sonucu yukarıda. Cevabını yaz."
            ),
          });
          continue;
        }
        print.tool(block.name, block.input);
        const out = await _callToolCached(session._specCache, block.name, block.input, session.id, session.telemetry, session._touchedFiles);
        print.result(out);
        _emitDiff(block.name, out, session.id);
        results.push({ type: "tool_result", tool_use_id: block.id, content: String(out) });
      }
    }

    if (_repeated) print.warn(i18n.t("Repeated tool call — reported to the model", "Tekrarlayan araç çağrısı — modele bildirildi"));
    session.msgs.push({ role: "user", content: results });
    aiTurnContinue();
    try {
      resp = await anthropic.chat(session.model, session.msgs, session.system, allowedDefs, chatOpts);
    } catch (err) {
      if (session._interrupted || err.name === "AbortError" || err.message?.toLowerCase().includes("abort")) {
        process.stdout.write("\n");
        print.system(i18n.t("interrupted", "kesildi"));
        return "";
      }
      throw err;
    }
    totalCacheRead  += resp.usage?.cache_read_input_tokens    ?? 0;
    totalCacheWrite += resp.usage?.cache_creation_input_tokens ?? 0;
  }

  session._lastApiUsage = {
    inputTokens:      resp.usage?.input_tokens  ?? null,
    outputTokens:     resp.usage?.output_tokens ?? null,
    cacheReadTokens:  totalCacheRead,
    cacheWriteTokens: totalCacheWrite,
  };

  for (const block of resp.content) {
    if (block.type === "thinking" && block.thinking) {
      events.emit("thinking_delta", session.id, { thinking: block.thinking });
    }
  }

  if (resp.stop_reason === "max_tokens") {
    print.warn(i18n.t(
      "Response truncated (max_tokens). Output may be incomplete.",
      "Yanıt max_tokens nedeniyle kesildi. Çıktı eksik olabilir."
    ));
  }

  const finalText = resp.content.filter(b => b.type === "text").map(b => b.text).join("");
  process.stdout.write("\n");
  session.msgs.push({ role: "assistant", content: resp.content });
  return finalText;
};
