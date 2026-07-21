// core/loops/openai.js — OpenAI ailesi native tool calling döngüsü
"use strict";

const {
  MAX_ITERS, PARALLEL_SAFE,
  _callToolCached, _emitDiff, _cleanResponse, _flattenMsgs, makeRepeatDetector,
  tools, events, i18n, print, aiTurnStart, aiTurnContinue,
} = require("./shared.ts");

module.exports = async function openaiFamilyLoop(session, provider) {
  const router = require("../router.ts");
  const allowedDefs = session.modes.filterDefs(tools.getDefs());
  const useTools = session.mode.allowTools && allowedDefs.length > 0;
  const history  = _flattenMsgs(session.msgs);
  const _cfgForOutput = router.loadConfig();
  const maxTokens = (_cfgForOutput.maxOutputTokens > 0) ? _cfgForOutput.maxOutputTokens : undefined;

  let finalText = "";
  let iter = 0;
  let _emptyRetries = 0; // reasoning bütçe tükenmesi: en fazla 1 kez yeniden dene
  const detectRepeat = makeRepeatDetector();
  session._interrupted = false;
  aiTurnStart(session.mode?.name, session.backend, `[${session._turnCount + 1}]`);

  for (; iter < MAX_ITERS; iter++) {
    if (session._interrupted) { process.stdout.write("\n"); print.system(i18n.t("interrupted", "kesildi")); break; }

    const r = await provider.chatRich(session.model, history, {
      system:    session.system,
      tools:     useTools ? allowedDefs : undefined,
      onToken:   tok => { process.stdout.write(tok); events.emit("text_delta", session.id, { delta: tok }); },
      // Reasoning modelleri (hy3, deepseek-r1, o-serisi): düşünme ayrı akış.
      // Ekrana basılmaz ama olay olarak yayınlanır — SSE/TUI izleyebilir,
      // kullanıcı "sessiz bekleyiş" yerine modelin düşündüğünü görebilir.
      onReasoning: tok => events.emit("thinking_delta", session.id, { thinking: tok }),
      maxTokens,
    });

    if (!r.toolCalls.length) {
      // Boş yanıt + finish=length: model tüm token bütçesini (görünmez)
      // reasoning'e harcayıp içerik üretemeden kesildi. Bir kez, kısa
      // cevap talimatıyla yeniden denenir; ikinci kez olursa açık hata.
      if (!r.text && r.finish === "length" && _emptyRetries < 1) {
        _emptyRetries++;
        const rLen = (r.reasoning ?? "").length;
        print.warn(i18n.t(
          `Model spent the entire token budget on reasoning (${rLen} chars) and produced no output — retrying with a brevity instruction`,
          `Model tüm token bütçesini reasoning'e harcadı (${rLen} karakter), çıktı üretemedi — kısalık talimatıyla yeniden deneniyor`
        ));
        session.telemetry.record({ event: "reasoning_budget_exhausted", model: session.model, reasoningChars: rLen });
        history.push({ role: "user", content:
          "SYSTEM NOTE: your previous response was cut at max_tokens before producing any visible output " +
          "(all budget went to reasoning). Answer now with MINIMAL reasoning. " +
          "If the task is large, do one small step per tool call.",
        });
        aiTurnContinue();
        continue;
      }
      if (r.finish === "length") {
        print.warn(i18n.t(
          "Response truncated (max_tokens/finish=length). Output may be incomplete.",
          "Yanıt kesildi (max_tokens/finish=length). Çıktı eksik olabilir."
        ));
      }
      finalText = r.text;
      break;
    }

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

    // Kesik araç çağrısı koruması: yanıt max_tokens'da kesildiyse ya da
    // argüman JSON'u parse edilemediyse araç ÇALIŞTIRILMAZ — yarım içerikle
    // write_file gibi bir aracın çalışması dosyayı yarım yazar (bkz.
    // docs/06-vaka-analizi §6.2). Bunun yerine modele işi parçalara bölmesi
    // söylenir; model sonraki iterasyonda küçük parçalarla devam eder.
    const _truncatedCall = r.finish === "length" || r.toolCalls.some(c => c.argsTruncated);
    if (_truncatedCall) {
      print.warn(i18n.t(
        "Tool call truncated at max_tokens — not executed; asking the model to split the work",
        "Araç çağrısı max_tokens'da kesildi — çalıştırılmadı; modelden işi bölmesi istendi"
      ));
      session.telemetry.record({ event: "tool_call_truncated", model: session.model, tools: r.toolCalls.map(c => c.name) });
      for (const call of r.toolCalls) {
        history.push({
          role: "tool", tool_call_id: call.id,
          content: i18n.t(
            "ERROR: your output hit the max_tokens limit mid tool-call, so this call was NOT executed. " +
            "Do not retry the same single large call. Split the work into smaller steps: " +
            "write the first part of the file with write_file, then append the remaining parts with edit_file. " +
            "Keep each tool call small enough to fit in the output limit.",
            "HATA: çıktın araç çağrısının ortasında max_tokens sınırına takıldı, bu çağrı ÇALIŞTIRILMADI. " +
            "Aynı büyük çağrıyı tekrar deneme. İşi küçük adımlara böl: " +
            "dosyanın ilk parçasını write_file ile yaz, kalan parçaları edit_file ile ekle. " +
            "Her araç çağrısını çıktı limitine sığacak kadar küçük tut."
          ),
        });
      }
      aiTurnContinue();
      continue;
    }

    const sig = r.toolCalls.map(c => `${c.name}:${JSON.stringify(c.input)}`).join("|");
    const { repeated, cyclical } = detectRepeat(sig);

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
    if (cyclical) print.warn(i18n.t("Cyclical tool call pattern detected — reported to the model", "Döngüsel araç çağrısı deseni tespit edildi — modele bildirildi"));
    else if (repeated) print.warn(i18n.t("Repeated tool call — reported to the model", "Tekrarlayan araç çağrısı — modele bildirildi"));
    aiTurnContinue();
  }

  // "Max iterations" yalnızca döngü GERÇEKTEN tükendiyse basılır — eskiden
  // boş finalText ile erken kırılan her durumda (ör. reasoning bütçe
  // tükenmesi) yanıltıcı şekilde görünüyordu.
  if (!finalText && !session._interrupted) {
    if (iter >= MAX_ITERS) {
      print.warn(i18n.t(
        `Max iterations (${MAX_ITERS}) reached without a final response.`,
        `Maksimum iterasyon (${MAX_ITERS}) aşıldı, nihai yanıt alınamadı.`
      ));
    } else {
      print.warn(i18n.t(
        "Model returned an empty response.",
        "Model boş yanıt döndürdü."
      ));
    }
  }

  finalText = _cleanResponse(finalText);
  process.stdout.write("\n");
  session.msgs.push({ role: "assistant", content: finalText });
  return finalText;
};
