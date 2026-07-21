// core/session-compact.ts — Konuşma sıkıştırma ve geçmiş budama (session.ts'den çıkarıldı)
// @ts-nocheck
"use strict";

const i18n = require("./i18n.ts");
const { countMessages } = require("./budget.ts");
const { _flattenMsgs }  = require("./loops/shared.ts");

async function compact(session) {
  const { print } = require("../tui/output.ts");
  const { spinner } = require("../tui/index.ts");
  if (session.msgs.length < 4) {
    print.warn(i18n.t("Need 4+ messages to compact.", "Sıkıştırmak için 4+ mesaj gerekli."));
    return;
  }
  const before = countMessages(session.msgs, session.system);
  const histText = _flattenMsgs(session.msgs)
    .map(m => {
      const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      const isToolResult = m.role === "user" && c.startsWith("[tool result:");
      return `${m.role.toUpperCase()}: ${c.slice(0, isToolResult ? 400 : 2000)}`;
    })
    .join("\n\n")
    .slice(0, 24_000);

  const _touchedHint = session._touchedFiles.size > 0
    ? i18n.t(
      `\n\nFiles already modified in this session (machine-tracked): ${[...session._touchedFiles].join(", ")}`,
      `\n\nBu oturumda zaten değiştirilen dosyalar (makine takibi): ${[...session._touchedFiles].join(", ")}`
    ) : "";

  const prompt = i18n.t(
    `Summarize this coding conversation concisely. You MUST preserve:
1. Files created/modified (with paths)
2. Code patterns or key implementations introduced
3. Bugs fixed and how
4. Current task status (done/in-progress/blocked)
5. Any decisions made about architecture or approach
6. Open issues or next steps

Do NOT summarize tool calls verbosely — just their outcomes.
Be concise (under 600 tokens):${_touchedHint}\n\n${histText}`,
    `Bu kodlama konuşmasını özetle. MUTLAKA koru:
1. Oluşturulan/değiştirilen dosyalar (yollarıyla)
2. Ortaya konan kod desenleri veya temel implementasyonlar
3. Düzeltilen hatalar ve nasıl
4. Mevcut görev durumu (tamamlandı/devam ediyor/engellendi)
5. Mimari veya yaklaşım hakkında alınan kararlar
6. Açık sorunlar veya sonraki adımlar

Araç çağrılarını ayrıntılı özetleme — sadece sonuçlarını yaz.
Kısa tut (600 token altında):${_touchedHint}\n\n${histText}`
  );

  spinner.start(i18n.t("compacting...", "sıkıştırılıyor..."));
  let summary;
  try {
    summary = await session._quickChat(prompt);
  } catch (err) {
    spinner.stop();
    print.warn(i18n.t(`compact failed: ${err.message}`, `sıkıştırma başarısız: ${err.message}`));
    return;
  }
  spinner.stop();

  const _artifactIndex = session._touchedFiles.size > 0
    ? i18n.t(
      `\n\n[Artifact index (machine-tracked, authoritative): ${[...session._touchedFiles].join(", ")}]`,
      `\n\n[Dosya indeksi (makine takibi, güvenilir): ${[...session._touchedFiles].join(", ")}]`
    ) : "";
  session.msgs = [
    { role: "user",      content: i18n.t(`[Conversation summary:\n${summary}]`, `[Konuşma özeti:\n${summary}]`) + _artifactIndex },
    { role: "assistant", content: i18n.t("Understood. I have the context from the summary above.", "Anlaşıldı. Özetin bağlamıyla devam ediyorum.") },
  ];
  session._compacted = true;

  const after = countMessages(session.msgs, session.system);
  print.system(i18n.t(
    `Compacted: ${before} → ${after} tokens (saved ${before - after})`,
    `Sıkıştırıldı: ${before} → ${after} token (${before - after} tasarruf)`
  ));
  session._save();
}

function _trim(session) {
  const MAX_HISTORY = 60;
  if (session.msgs.length <= MAX_HISTORY) return;
  const { print } = require("../tui/output.ts");
  const keep   = Math.floor(MAX_HISTORY / 2);
  const old    = session.msgs.slice(0, session.msgs.length - keep);
  const recent = session.msgs.slice(session.msgs.length - keep);
  const summary = _flattenMsgs(old).map(m => {
    const text = m.content;
    if (m.role === "user" && (text.startsWith("<<<RESULT>>>") || text.startsWith("[tool result:") || text.startsWith("[Tool:"))) {
      const head = text.slice(0, 200);
      const tail = text.length > 500 ? `\n...\n${text.slice(-300)}` : text.slice(200);
      return `[${m.role}]: ${head}${tail}`;
    }
    return `[${m.role}]: ${text.slice(0, 400)}`;
  }).join("\n");
  const compacted = {
    role:    "user",
    content: i18n.t(
      `[Previous conversation summary]\n${summary}\n[End of summary]`,
      `[Önceki konuşma özeti]\n${summary}\n[Özet sonu]`
    ),
  };
  session.msgs = [compacted, ...recent];
  session._compacted = true;
  print.system(i18n.t(`context compacted (${old.length} messages → summary)`, `bağlam sıkıştırıldı (${old.length} mesaj → özet)`));
}

module.exports = { compact, _trim };
