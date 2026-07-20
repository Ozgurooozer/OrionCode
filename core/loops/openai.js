// core/loops/openai.js — OpenAI ailesi native tool calling döngüsü
"use strict";

const {
  MAX_ITERS, PARALLEL_SAFE,
  _callToolCached, _emitDiff, _cleanResponse, _flattenMsgs,
  tools, events, i18n, print, aiTurnStart, aiTurnContinue,
} = require("./shared.js");

module.exports = async function openaiFamilyLoop(session, provider) {
  const router = require("../router.js");
  const allowedDefs = session.modes.filterDefs(tools.getDefs());
  const useTools = session.mode.allowTools && allowedDefs.length > 0;
  const history  = _flattenMsgs(session.msgs);
  const _cfgForOutput = router.loadConfig();
  const maxTokens = (_cfgForOutput.maxOutputTokens > 0) ? _cfgForOutput.maxOutputTokens : undefined;

  let finalText = "";
  let lastCallSig = "";
  session._interrupted = false;
  aiTurnStart(session.mode?.name, session.backend, `[${session._turnCount + 1}]`);

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    if (session._interrupted) { process.stdout.write("\n"); print.system(i18n.t("interrupted", "kesildi")); break; }

    const r = await provider.chatRich(session.model, history, {
      system:    session.system,
      tools:     useTools ? allowedDefs : undefined,
      onToken:   tok => { process.stdout.write(tok); events.emit("text_delta", session.id, { delta: tok }); },
      maxTokens,
    });

    if (!r.toolCalls.length) { finalText = r.text; break; }

    process.stdout.write("\n");
    history.push({
      role:       "assistant",
      content:    r.text || null,
      tool_calls: r.toolCalls.map(c => ({
        id:   c.id,
        type: "function",
        function: { name: c.name, arguments: c.rawArgs ?? JSON.stringify(c.input) },
      })),
    });

    const sig = r.toolCalls.map(c => `${c.name}:${JSON.stringify(c.input)}`).join("|");
    const repeated = sig === lastCallSig;
    lastCallSig = sig;

    const _canParallel = !repeated && r.toolCalls.length > 1
      && r.toolCalls.every(c => PARALLEL_SAFE.has(c.name) && session.modes.canUse(c.name).ok);

    if (_canParallel) {
      const outs = await Promise.all(
        r.toolCalls.map(c => _callToolCached(session._specCache, c.name, c.input, session.id, session.telemetry, session._touchedFiles))
      );
      for (let _pi = 0; _pi < r.toolCalls.length; _pi++) {
        const c2 = r.toolCalls[_pi], out2 = outs[_pi];
        events.emit("approval_resolved", session.id, { tool: c2.name, ok: true, reason: null });
        print.tool(c2.name, c2.input);
        print.result(out2);
        _emitDiff(c2.name, out2, session.id);
        history.push({ role: "tool", tool_call_id: c2.id, content: String(out2) });
      }
    } else {
      for (const call of r.toolCalls) {
        const perm = session.modes.canUse(call.name);
        let out;
        events.emit("approval_resolved", session.id, { tool: call.name, ok: perm.ok, reason: perm.reason ?? null });
        if (!perm.ok) {
          events.emit("approval_request", session.id, { tool: call.name, input: call.input, reason: perm.reason });
          print.warn(perm.reason);
          out = perm.reason;
        } else if (repeated) {
          out = i18n.t(
            "Same tool called again with the same arguments — result is above. Write your answer.",
            "Aynı araç aynı argümanlarla tekrar çağrıldı — sonucu yukarıda. Cevabını yaz."
          );
        } else {
          print.tool(call.name, call.input);
          out = await _callToolCached(session._specCache, call.name, call.input, session.id, session.telemetry, session._touchedFiles);
          print.result(out);
          _emitDiff(call.name, out, session.id);
        }
        history.push({ role: "tool", tool_call_id: call.id, content: String(out) });
      }
    }
    if (repeated) print.warn(i18n.t("Repeated tool call — reported to the model", "Tekrarlayan araç çağrısı — modele bildirildi"));
    aiTurnContinue();
  }

  if (!finalText && !session._interrupted) {
    print.warn(i18n.t(
      `Max iterations (${MAX_ITERS}) reached without a final response.`,
      `Maksimum iterasyon (${MAX_ITERS}) aşıldı, nihai yanıt alınamadı.`
    ));
  }

  finalText = _cleanResponse(finalText);
  process.stdout.write("\n");
  session.msgs.push({ role: "assistant", content: finalText });
  return finalText;
};
