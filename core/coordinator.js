// core/coordinator.js — Multi-agent koordinatör: plan → execute → review
"use strict";

/**
 * Full options accepted by subagent.run() — subagent.js JSDoc omits role and
 * memoryScope but the implementation reads both via env/args (lines 20-21, 26).
 * @typedef {Object} SubagentRunOpts
 * @property {string}  task         - task text sent to the headless agent via stdin
 * @property {string}  [model]      - model name forwarded to the sub-process
 * @property {string}  [backend]    - "ollama" | "anthropic" | etc.
 * @property {string}  [role]       - ORION_ROLE env + --role arg (researcher/coder/reviewer)
 * @property {string}  [memoryScope] - base64-encoded relevant memories (ORION_MEMORY_SCOPE)
 * @property {number}  [timeout]    - ms until SIGTERM (default 90000)
 */

/**
 * Options for the streaming call to anthropic.chat() in review().
 * anthropic.js JSDoc for the 5th param only declares thinking/thinkingBudget;
 * onToken is also destructured in its implementation.
 * @typedef {Object} AnthropicStreamOpts
 * @property {(token: string) => void} [onToken]
 * @property {boolean} [thinking]
 * @property {number}  [thinkingBudget]
 */

const subagent = require("./subagent.js");
const memory   = require("./memory.ts");
const { C }       = require("../tui/colors.ts");
const { print }   = require("../tui/output.ts");
const { spinner } = require("../tui/index.ts");
const i18n = require("./i18n.js");

// ANSI escape code'larını temizle — subagent stdout'u review LLM'e giderken
const _stripAnsi = s => String(s).replace(/\x1b\[[0-9;]*[mGKHFJA-Z]/g, "");

// Workspace üst düzey dosya/dizin listesi — planlayıcıya yapı bağlamı verir
function _workspaceTree(workspace) {
  try {
    const fs   = require("fs");
    const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "$Recycle.Bin"]);
    const entries = fs.readdirSync(workspace, { withFileTypes: true });
    const top = entries
      .filter(e => !SKIP.has(e.name) && !e.name.startsWith("."))
      .map(e => e.isDirectory() ? `${e.name}/` : e.name)
      .slice(0, 40)
      .join("  ");
    if (!top) return "";
    // package.json scripts — koder hangi test komutunu çalıştıracağını bilmeli
    let scripts = "";
    try {
      const pkg = JSON.parse(fs.readFileSync(require("path").join(workspace, "package.json"), "utf8"));
      const s = Object.keys(pkg.scripts ?? {}).slice(0, 6);
      if (s.length) scripts = `\nAvailable scripts: ${s.join(", ")}`;
    } catch {}
    return `\nWorkspace tree: ${top}${scripts}`;
  } catch { return ""; }
}

// orion.js headless sonunda <<<ORION_FINAL>>> işaretleyicisini çıkart.
// Yoksa son N karakteri döndür — aynı davranış.
function _extractFinal(rawOut, fallbackLen = 1500) {
  const m = rawOut.match(/<<<ORION_FINAL>>>\n([\s\S]*?)\n<<<END_FINAL>>>/);
  if (m) return m[1].trim();
  return _stripAnsi(rawOut).trim().slice(-fallbackLen);
}

// Default tier per role: researcher+reviewer → tier1 (local, cheap), coder → tier2 (cloud)
// Override via ~/.orion/config.json:roleTiers: { "researcher": 1, "coder": 2, "reviewer": 2 }
const ROLE_TIER_DEFAULT = { researcher: 1, coder: 2, reviewer: 1 };

// Coder may need to run tests + fix failures — give it more time.
// researcher is read-only so 2 min is sufficient. reviewer runs tests but not edits.
const ROLE_TIMEOUT_MS = { researcher: 120_000, coder: 600_000, reviewer: 180_000 };

const PLAN_PROMPT = (task, workspace) => `You are a software engineering coordinator. Break the coding task into subtasks.${_workspaceTree(workspace)}
Return ONLY valid JSON — no markdown fences, no explanation, just the JSON object:

{
  "subtasks": [
    {"id": "1", "role": "researcher", "task": "Exact instructions: read file X at lines N-M, search for pattern P in src/. Report: paths, line numbers, exact code."},
    {"id": "2", "role": "coder",      "task": "Edit tools/foo.js: replace function bar() with [exact new code]. Run: npm test. Fix any failures."},
    {"id": "3", "role": "reviewer",   "task": "Read modified files. Run npm test. Report PASS/FAIL with specific line numbers if failing."}
  ],
  "sequential": true,
  "planText": "One sentence: what approach and why"
}

Role capabilities:
- researcher: think, file_outline, read_many_files, read_file, search, list_files, glob_files, file_info, web_fetch, git_status, git_diff, git_log — NO writing
- coder: think + all tools including edit_file, multi_edit, write_file, apply_patch, replace_in_files, run_command — implements changes
- reviewer: think, file_outline, read_file, search, run_command (to run tests) — checks correctness only

Planning rules:
1. Each subtask is self-contained — it runs isolated with no memory of other subtasks
2. Be SPECIFIC: exact file paths (relative to ${workspace}), function names, line ranges, patterns
3. sequential:true unless subtasks touch completely different files (no overlap)
4. 1-3 subtasks ideal. Never more than 5. Single coder subtask is fine for simple edits
5. If file locations unknown: start with a researcher subtask
6. Coder subtask MUST include: run tests after changes (e.g. "Run: npm test — fix any failures")

Task: ${task}`;

const REVIEW_PROMPT = (task, results) => `You are a code review synthesizer. Report what was accomplished.

Main task: ${task}

Subtask results:
${results.map((r, i) => {
  const clean = _extractFinal(r.output || "(no output)", 3000);
  return `--- Subtask ${i + 1} [${r.role}] ---\n${clean}`;
}).join("\n\n")}

Write a concise summary:
1. What was done (files changed, features added, bugs fixed)
2. Test results (PASS/FAIL)
3. Any remaining issues or next steps`;

// Backend-agnostik tek tur çağrı (araç yok, sadece metin)
async function _callModel(session, userContent) {
  const msgs = [{ role: "user", content: userContent }];
  if (session.backend === "anthropic") {
    const anthropic = require("../backends/anthropic.ts");
    const resp = await anthropic.chat(session.model, msgs, "", [], {});
    return resp.content.filter(b => b.type === "text").map(b => b.text).join("");
  }
  // ollama + openrouter + openai + BYOK: hepsi chat(model, msgs, opts) imzası
  const backends = require("../backends/index.ts");
  const p = backends.get(session.backend);
  if (!p?.chat) throw new Error(`Backend chat desteklemiyor: ${session.backend}`);
  return await p.chat(session.model, msgs, { stream: false });
}

async function plan(task, session) {
  const workspace = process.env.ORION_WORKSPACE ?? process.cwd();
  let raw = "";
  try {
    raw = await _callModel(session, PLAN_PROMPT(task, workspace));
  } catch (err) {
    print.warn(i18n.t(
      `coordinator: plan LLM call failed (${err.message}) — using single-task fallback`,
      `koordinatör: plan LLM çağrısı başarısız (${err.message}) — tek görev yedeğine düşülüyor`
    ));
    require("./events.ts").emit("coordinator_error", session?.id ?? null, { phase: "plan", error: err.message });
    return {
      subtasks:   [{ id: "1", role: "coder", task }],
      sequential: true,
      planText:   "",
    };
  }

  try {
    // Try progressively looser extraction: direct parse → fence strip → find first JSON object
    let parsed = null;
    const attempts = [
      () => JSON.parse(raw.trim()),
      () => JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()),
      () => { const m = raw.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; },
    ];
    for (const attempt of attempts) {
      try { parsed = attempt(); if (parsed) break; } catch {}
    }
    if (parsed?.subtasks?.length) return { planText: "", ...parsed };
  } catch (err) {
    // outer catch: all attempts exhausted
  }
  if (!raw.includes("{")) {
    print.warn(i18n.t(
      `coordinator: plan JSON parse failed — using single-task fallback`,
      `koordinatör: plan JSON ayrıştırılamadı — tek görev yedeğine düşülüyor`
    ));
    require("./events.ts").emit("coordinator_error", session?.id ?? null, { phase: "plan-parse", raw: raw.slice(0, 200) });
  }

  return {
    subtasks:   [{ id: "1", role: "coder", task }],
    sequential: true,
    planText:   "",
  };
}

async function execute(subtasks, parentSession, sequential = true, blackboard = {}) {
  const cfg = require("./router.ts").loadConfig();
  const roleTiers = { ...ROLE_TIER_DEFAULT, ...(cfg.roleTiers ?? {}) };

  // Per-role memory injection: different query per role for richer context
  const roleMemoryQuery = (role, task) => ({
    researcher: `${task} search analysis research`,
    coder:      `${task} implementation code pattern`,
    reviewer:   `${task} review quality bug`,
  })[role] ?? task;

  // previousOutputs: sequential modda tamamlanan subtask çıktıları sonraki subtask'a geçer
  // forceTier: null → roleTiers'dan oku; 2 → her zaman tier2 (Ollama yokken fallback için)
  const runOne = async (s, previousOutputs = [], forceTier = null) => {
    const tier    = forceTier ?? (roleTiers[s.role] ?? 1);
    const model   = tier === 1 ? cfg.tier1Model                     : (cfg.tier2Model   ?? parentSession.model);
    const backend = tier === 1 ? (cfg.tier1Backend ?? "ollama")     : (cfg.tier2Backend ?? parentSession.backend);

    const relevant = await memory.query(roleMemoryQuery(s.role, s.task)).catch(() => []);
    const memScope = Buffer.from(JSON.stringify(relevant)).toString("base64");

    // Blackboard: plan metni + önceki subtask çıktıları (özet olarak)
    const parts = [];
    if (blackboard.planText) parts.push(`## Overall Plan\n${blackboard.planText}`);
    if (previousOutputs.length > 0) {
      parts.push(
        "## Previous Subtask Results\n" +
        previousOutputs.map(p =>
          `### [${p.role}] Subtask ${p.id}\n${_extractFinal(p.output || "(no output)", 1500)}`
        ).join("\n\n")
      );
    }
    parts.push(`## Your Subtask\n${s.task}`);
    const taskWithContext = parts.join("\n\n");

    // coder + reviewer: headless modda run_command'e izin ver (test/build için)
    const allowCommands = s.role === "coder" || s.role === "reviewer";
    return subagent.run(/** @type {SubagentRunOpts} */ ({
      task:          taskWithContext,
      model,
      backend,
      role:          s.role,
      memoryScope:   memScope,
      workspace:     process.env.ORION_WORKSPACE ?? process.cwd(),
      allowCommands,
      timeout:       ROLE_TIMEOUT_MS[s.role] ?? 300_000,
      streamToParent: !process.argv.includes("--headless"), // headless içinde parent yok
    }));
  };

  // Subtask çıktısının anlamlı olup olmadığını kontrol et
  function _isEmptyOutput(out) {
    if (!out || typeof out !== "string") return true;
    const clean = _stripAnsi(out).trim();
    // Sadece hata mesajı veya çok kısa çıktı → başarısız sayılır
    if (clean.length < 20) return true;
    if (/^(HATA:|Error:|stdin write failed)/.test(clean)) return true;
    return false;
  }

  let results;
  if (sequential) {
    results = [];
    for (const s of subtasks) {
      const cfg2     = require("./router.ts").loadConfig();
      const roleTiers2 = { ...ROLE_TIER_DEFAULT, ...(cfg2.roleTiers ?? {}) };
      const tier     = roleTiers2[s.role] ?? 1;
      print.info(i18n.t(
        `[${s.role}] starting (tier${tier})...`,
        `[${s.role}] başlıyor (tier${tier})...`
      ));

      let out = "";
      let succeeded = false;
      // Attempt 0: configured tier. Attempt 1: tier2 fallback (Ollama yokken researcher/reviewer kurtarır).
      for (let attempt = 0; attempt < 2; attempt++) {
        const forceTier = attempt === 1 ? 2 : null;
        if (attempt === 1) {
          print.warn(i18n.t(
            `[${s.role}] retrying with tier2 backend...`,
            `[${s.role}] tier2 backend ile yeniden deneniyor...`
          ));
        }
        try {
          const r = await runOne(s, results, forceTier);
          out = r.stdout ?? "";
          if (r.timedOut) {
            print.warn(i18n.t(`[${s.role}] timed out (attempt ${attempt + 1})`, `[${s.role}] zaman aşıldı (deneme ${attempt + 1})`));
            if (attempt === 0) continue;
            break;
          }
          if (_isEmptyOutput(out) && attempt === 0) {
            print.warn(i18n.t(`[${s.role}] empty output — retrying with tier2...`, `[${s.role}] boş çıktı — tier2 ile yeniden deneniyor...`));
            continue;
          }
          succeeded = true;
          break;
        } catch (err) {
          print.warn(i18n.t(`[${s.role}] error: ${err.message}`, `[${s.role}] hata: ${err.message}`));
          require("./events.ts").emit("coordinator_error", parentSession?.id ?? null, {
            phase: "execute", role: s.role, error: err.message, attempt,
          });
          if (attempt === 0) continue;
          break;
        }
      }

      const cleanOut = _extractFinal(out, 600);
      if (cleanOut) {
        const preview = cleanOut.length > 600 ? cleanOut.slice(-600) : cleanOut;
        print.info(i18n.t(
          `[${s.role}] done:\n${preview}`,
          `[${s.role}] tamamlandı:\n${preview}`
        ));
      } else if (!succeeded) {
        print.warn(i18n.t(`[${s.role}] produced no output`, `[${s.role}] çıktı üretemedi`));
      }
      results.push({ ...s, output: out });
    }
  } else {
    print.info(i18n.t(`starting ${subtasks.length} tasks in parallel...`, `${subtasks.length} görev paralel başlatılıyor...`));
    const settled = await Promise.allSettled(subtasks.map(s => runOne(s, [])));
    results = subtasks.map((s, i) => ({
      ...s,
      output: settled[i].status === "fulfilled" ? (settled[i].value?.stdout ?? "") : "",
    }));
    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === "rejected") {
        print.warn(i18n.t(
          `[${subtasks[i].role}] parallel error: ${settled[i].reason?.message}`,
          `[${subtasks[i].role}] paralel hata: ${settled[i].reason?.message}`
        ));
        require("./events.ts").emit("coordinator_error", parentSession?.id ?? null, {
          phase: "execute-parallel", role: subtasks[i].role, error: settled[i].reason?.message,
        });
      }
    }
  }

  return results;
}

async function review(task, results, session) {
  try {
    let text = "";
    if (session.backend === "anthropic") {
      const anthropic = require("../backends/anthropic.ts");
      const resp = await anthropic.chat(
        session.model,
        [{ role: "user", content: REVIEW_PROMPT(task, results) }],
        "",
        [],
        /** @type {AnthropicStreamOpts} */ ({ onToken: tok => { text += tok; process.stdout.write(tok); } })
      );
      process.stdout.write("\n");
      return text || resp.content.filter(b => b.type === "text").map(b => b.text).join("");
    }
    text = await _callModel(session, REVIEW_PROMPT(task, results));
    process.stdout.write(text + "\n");
    return text;
  } catch (err) {
    print.warn(i18n.t(
      `coordinator: review failed (${err.message}) — using last subtask output`,
      `koordinatör: sentez başarısız (${err.message}) — son görev çıktısı kullanılıyor`
    ));
    require("./events.ts").emit("coordinator_error", session?.id ?? null, { phase: "review", error: err.message });
    return results.at(-1)?.output ?? "";
  }
}

// Detect test/build failure in reviewer or synthesis output.
// Conservative: only clear failure signals to avoid false positives like "don't fail".
function _reviewFailed(text) {
  if (!text) return false;
  const t = _stripAnsi(text);
  // Explicit FAIL verdict (case-sensitive) or N failing/failed tests
  if (/\bFAIL\b/.test(t)) return true;
  if (/\d+\s+(test(s)?|spec(s)?)\s+fail(ed|ing)?/i.test(t)) return true;
  if (/\d+\s+fail(ure|ed|ing)s?\b/i.test(t)) return true;
  // Compilation / build errors
  if (/\bcompilation failed\b|\bbuild failed\b|\bsyntax error\b/i.test(t)) return true;
  // Explicit remaining issues reported by reviewer
  if (/remaining issues?:|still broken:|not fixed:/i.test(t)) return true;
  return false;
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
  if (planResult.planText) {
    print.info(i18n.t(`approach: ${planResult.planText}`, `yaklaşım: ${planResult.planText}`));
  }

  const blackboard = { task, planText: planResult.planText ?? "" };
  let results = await execute(planResult.subtasks, session, planResult.sequential, blackboard);

  console.log(`\n${C.cyan(i18n.t("── Coordinator: synthesis ──", "── Koordinatör: sentez ──"))}`);
  let final = await review(task, results, session);
  console.log(C.cyan("─────────────────────────\n"));

  // If reviewer detects failures and plan included a coder, auto-retry coder once
  const hasCoderSubtask = planResult.subtasks.some(s => s.role === "coder");
  if (_reviewFailed(final) && hasCoderSubtask) {
    print.warn(i18n.t(
      "coordinator: reviewer detected failures — retrying coder subtasks...",
      "koordinatör: reviewer başarısızlık tespit etti — coder görevi yeniden deneniyor..."
    ));
    const coderSubtasks = planResult.subtasks
      .filter(s => s.role === "coder")
      .map(s => ({
        ...s,
        task: `${s.task}\n\n## Fix Required\nPrevious attempt failed. Reviewer feedback:\n${final.slice(0, 2000)}`,
      }));
    const retryResults = await execute(coderSubtasks, session, true, {
      ...blackboard,
      planText: `RETRY: ${blackboard.planText}`,
    });
    // Merge: replace coder outputs with retry outputs, keep others
    let ri = 0;
    results = results.map(r => r.role === "coder" ? { ...retryResults[ri++] } : r);

    console.log(`\n${C.cyan(i18n.t("── Coordinator: re-synthesis ──", "── Koordinatör: yeniden sentez ──"))}`);
    final = await review(task, results, session);
    console.log(C.cyan("─────────────────────────\n"));
  }

  return { result: final, subResults: results, planUsed: planResult };
}

module.exports = { runCoordination, plan, execute, review, _extractFinal, _isEmptyOutput: (() => {
  // re-expose inner helper bound to its closure — used by tests
  function _isEmptyOutputExport(out) {
    if (!out || typeof out !== "string") return true;
    const clean = _stripAnsi(out).trim();
    if (clean.length < 20) return true;
    if (/^(HATA:|Error:|stdin write failed)/.test(clean)) return true;
    return false;
  }
  return _isEmptyOutputExport;
})() };
