// core/loops/ollama.js — Ollama native tools döngüsü (desteksiz modelde ReAct'a düşüş)
"use strict";

const {
  MAX_ITERS, TIER1_TOOLS, PARALLEL_SAFE,
  _callToolCached, _emitDiff, _cleanResponse, _flattenMsgs, makeThinkFilter,
  tools, events, i18n, print, aiTurnStart, aiTurnContinue,
} = require("./shared.js");

module.exports = async function ollamaLoop(session) {
  const ollama = require("../../backends/ollama.js");
  const allowedDefs = session.modes.filterDefs(tools.getDefs()).filter(d => TIER1_TOOLS.has(d.name));
  const useTools = session.mode.allowTools && allowedDefs.length > 0;
  const history  = _flattenMsgs(session.msgs);

  let finalText = "";
  let lastCallSig = "";
  session._interrupted = false;
  aiTurnStart(session.mode?.name, session.backend, `[${session._turnCount + 1}]`);

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    if (session._interrupted) { process.stdout.write("\n"); print.system(i18n.t("interrupted", "kesildi")); break; }

    let r;
    try {
      r = await ollama.chatRich(session.model, history, {
        system:  session._systemTier1,
        tools:   useTools ? allowedDefs : undefined,
        onToken: makeThinkFilter(out => {
          process.stdout.write(out);
          events.emit("text_delta", session.id, { delta: out });
        }),
      });
    } catch (err) {
      if (err.noToolSupport && useTools) {
        session.telemetry.record({ event: "react_fallback", model: session.model });
        return session._ollamaReactLoop();
      }
      throw err;
    }

    if (!r.toolCalls.length) { finalText = r.text; break; }

    process.stdout.write("\n");
    history.push({
      role:       "assistant",
      content:    r.text ?? "",
      tool_calls: r.toolCalls.map(c => ({
        id:       c.id,
        type:     "function",
        // Ollama expects arguments as a plain object (not JSON string) in history messages
        function: { name: c.name, arguments: c.input },
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
        const c3 = r.toolCalls[_pi], out3 = outs[_pi];
        events.emit("approval_resolved", session.id, { tool: c3.name, ok: true, reason: null });
        print.tool(c3.name, c3.input);
        print.result(out3);
        _emitDiff(c3.name, out3, session.id);
        history.push({ role: "tool", tool_call_id: c3.id, content: String(out3) });
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
