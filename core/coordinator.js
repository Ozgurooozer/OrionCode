// core/coordinator.js — Multi-agent koordinatör: plan → execute → review
"use strict";

const subagent = require("./subagent.js");
const memory   = require("./memory.js");
const { C, print, spinner } = require("../tui/index.js");
const i18n = require("./i18n.js");

const PLAN_PROMPT = (task) => `Break the task below into subtasks.
Return ONLY valid JSON:

{
  "subtasks": [
    {"id": "1", "role": "researcher", "task": "..."},
    {"id": "2", "role": "coder",      "task": "..."},
    {"id": "3", "role": "reviewer",   "task": "..."}
  ],
  "sequential": true
}

Roles:
- researcher: gather information, read files, analyze
- coder: write code, edit, implement
- reviewer: evaluate results, find bugs

Task: ${task}`;

const REVIEW_PROMPT = (task, results) => `Main task: ${task}

Subtask results:
${results.map((r, i) => `--- Task ${i + 1} (${r.role}) ---\n${(r.output || "").slice(0, 800)}`).join("\n\n")}

Synthesize the results into a short, clear summary.`;

// Backend-agnostik tek tur çağrı (araç yok, sadece metin)
async function _callModel(session, userContent) {
  const msgs = [{ role: "user", content: userContent }];
  if (session.backend === "anthropic") {
    const anthropic = require("../backends/anthropic.js");
    const resp = await anthropic.chat(session.model, msgs, "", [], {});
    return resp.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  // ollama + openrouter + openai + BYOK: hepsi chat(model, msgs, opts) imzası
  const backends = require("../backends/index.js");
  const p = backends.get(session.backend);
  if (!p?.chat) throw new Error(`Backend chat desteklemiyor: ${session.backend}`);
  return await p.chat(session.model, msgs, { stream: false });
}

async function plan(task, session) {
  let raw = "";
  try {
    raw = await _callModel(session, PLAN_PROMPT(task));
  } catch {
    return {
      subtasks:   [{ id: "1", role: "coder", task }],
      sequential: true,
    };
  }

  try {
    const clean = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed.subtasks?.length) return parsed;
  } catch {}

  return {
    subtasks:   [{ id: "1", role: "coder", task }],
    sequential: true,
  };
}

async function execute(subtasks, parentSession, sequential = true) {
  // Hafıza scope: ilgili hafızaları sub-agent'a aktar
  const relevant = await memory.query(subtasks[0]?.task ?? "");
  const memScope = Buffer.from(JSON.stringify(relevant)).toString("base64");

  const runOne = (s) => subagent.run({
    task:        s.task,
    model:       parentSession.model,
    backend:     parentSession.backend,
    role:        s.role,
    memoryScope: memScope,
  });

  let results;
  if (sequential) {
    results = [];
    for (const s of subtasks) {
      print.info(i18n.t(`[${s.role}] starting...`, `[${s.role}] başlıyor...`));
      try {
        const r = await runOne(s);
        results.push({ ...s, output: r.stdout ?? "" });
      } catch (err) {
        print.warn(i18n.t(`[${s.role}] error: ${err.message}`, `[${s.role}] hata: ${err.message}`));
        results.push({ ...s, output: "" });
      }
    }
  } else {
    print.info(i18n.t(`starting ${subtasks.length} tasks in parallel...`, `${subtasks.length} görev paralel başlatılıyor...`));
    const settled = await Promise.allSettled(
      subtasks.map(s => subagent.run({
        task: s.task, model: parentSession.model,
        backend: parentSession.backend, role: s.role, memoryScope: memScope,
      }))
    );
    results = subtasks.map((s, i) => ({
      ...s,
      output: settled[i].status === "fulfilled" ? (settled[i].value?.stdout ?? "") : "",
    }));
  }

  return results;
}

async function review(task, results, session) {
  try {
    let text = "";
    if (session.backend === "anthropic") {
      const anthropic = require("../backends/anthropic.js");
      const resp = await anthropic.chat(
        session.model,
        [{ role: "user", content: REVIEW_PROMPT(task, results) }],
        "",
        [],
        { onToken: tok => { text += tok; process.stdout.write(tok); } }
      );
      process.stdout.write("\n");
      return text || resp.content.filter(b => b.type === "text").map(b => b.text).join("");
    }
    text = await _callModel(session, REVIEW_PROMPT(task, results));
    process.stdout.write(text + "\n");
    return text;
  } catch {
    return results.at(-1)?.output ?? "";
  }
}

async function runCoordination(task, session) {
  print.system(i18n.t(`coordinator: "${task.slice(0, 60)}..."`, `koordinatör: "${task.slice(0, 60)}..."`));

  spinner.start(i18n.t("planning", "plan yapılıyor"));
  const planResult = await plan(task, session);
  spinner.stop();
  print.system(i18n.t(
    `plan: ${planResult.subtasks.length} tasks (${planResult.sequential ? "sequential" : "parallel"})`,
    `plan: ${planResult.subtasks.length} görev (${planResult.sequential ? "sıralı" : "paralel"})`
  ));

  const results = await execute(planResult.subtasks, session, planResult.sequential);

  console.log(`\n${C.cyan(i18n.t("── Coordinator: synthesis ──", "── Koordinatör: sentez ──"))}`);
  const final = await review(task, results, session);
  console.log(C.cyan("─────────────────────────\n"));

  return { result: final, subResults: results, planUsed: planResult };
}

module.exports = { runCoordination, plan, execute, review };
