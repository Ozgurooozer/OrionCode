// core/commands/workflow.js — Plan-then-confirm workflow: /plan, /approve, /reject
// @ts-nocheck
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.ts");

// Per-session in-memory state: { task, planText }
const _pendingPlan = new Map();

module.exports = [
  {
    name:    "plan",
    aliases: ["planla"],
    group:   "Workflow",
    desc:    "Switch to plan mode and generate a plan for a task",
    usage:   "/plan <task>",
    exec: async ({ args, session }) => {
      const task = args.join(" ").trim();
      if (!task) {
        print.warn(i18n.t("Usage: /plan <task>", "Kullanım: /plan <görev>"));
        return;
      }

      // Switch to plan mode
      const prevMode = session.mode.name;
      session.setMode("plan");
      print.system(i18n.t(
        `Plan mode active. Generating plan for: "${task.slice(0, 60)}..."`,
        `Plan modu aktif. Plan üretiliyor: "${task.slice(0, 60)}..."`
      ));
      print.system(i18n.t(
        "After the plan is generated, use /approve to implement or /reject to revise.",
        "Plan üretildikten sonra uygulamak için /approve, revize için /reject yazın."
      ));

      // Run the task in plan mode (read-only) — LLM produces a written plan
      await session.send(task);

      // Store pending plan
      _pendingPlan.set(session.id, { task, prevMode });
    },
  },

  {
    name:    "approve",
    aliases: ["onayla"],
    group:   "Workflow",
    desc:    "Approve the pending plan and switch to build mode to implement it",
    usage:   "/approve",
    exec: async ({ args, session }) => {
      const pending = _pendingPlan.get(session.id);
      if (!pending) {
        print.warn(i18n.t("No pending plan. Use /plan <task> first.", "Bekleyen plan yok. Önce /plan <görev> kullanın."));
        return;
      }
      _pendingPlan.delete(session.id);

      const extra = args.join(" ").trim();
      session.setMode("build");
      print.system(i18n.t(
        "Plan approved. Switching to build mode — implementing now...",
        "Plan onaylandı. Build moduna geçiliyor — uygulanıyor..."
      ));

      // Re-send the original task in build mode; if extra feedback given, attach it
      const buildTask = extra
        ? `${pending.task}\n\nAdditional instructions: ${extra}`
        : pending.task;
      await session.send(buildTask);

      // Return to previous mode after implementation
      session.setMode(pending.prevMode);
    },
  },

  {
    name:    "reject",
    aliases: ["reddet"],
    group:   "Workflow",
    desc:    "Reject the pending plan and stay in plan mode to revise",
    usage:   "/reject [feedback]",
    exec: async ({ args, session }) => {
      const pending = _pendingPlan.get(session.id);
      if (!pending) {
        print.warn(i18n.t("No pending plan to reject.", "Reddedilecek bekleyen plan yok."));
        return;
      }

      const feedback = args.join(" ").trim();
      // Stay in plan mode — update stored task with feedback
      if (feedback) {
        pending.task = `${pending.task}\n\nRevision request: ${feedback}`;
        _pendingPlan.set(session.id, pending);
        print.system(i18n.t(
          `Plan rejected. Regenerating with feedback: "${feedback.slice(0, 60)}"`,
          `Plan reddedildi. Geri bildirimle yeniden üretiliyor: "${feedback.slice(0, 60)}"`
        ));
        await session.send(pending.task);
      } else {
        print.system(i18n.t(
          "Plan rejected. What should we change? (Type /plan <revised task> to restart.)",
          "Plan reddedildi. Ne değiştirelim? (Yeniden başlatmak için /plan <görev> yazın.)"
        ));
        _pendingPlan.delete(session.id);
        session.setMode(pending.prevMode);
      }
    },
  },
];
