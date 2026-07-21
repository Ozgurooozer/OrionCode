// core/commands/tasks.js — görev yöneticisi (/tasks)
// @ts-nocheck
"use strict";

const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");

async function exec({ args, session }) {
  const sub = (args ?? "").trim().toLowerCase();

  // /tasks enqueue <type> <prompt> — test/debug için kuyruğa iş ekle
  if (sub.startsWith("enqueue ")) {
    const rest  = sub.slice(8).trim();
    const parts = rest.split(/\s+/, 2);
    const type  = parts[0] ?? "chat";
    const prompt = rest.slice(type.length).trim() || "(test)";
    try {
      const queue = require("../queue.ts");
      const id    = await queue.enqueue({ type, prompt });
      process.stdout.write(`${C.green("✓")} kuyruğa eklendi: ${C.muted(id)}\n`);
    } catch (e) { print.error(`kuyruk hatası: ${e.message}`); }
    return;
  }

  // /tasks scheduler — VRAM durumu
  if (sub === "scheduler" || sub === "vram") {
    try {
      const sch = require("../scheduler.ts");
      const v   = sch.vramStatus();
      process.stdout.write(`\n`);
      process.stdout.write(`${C.bold("─── Scheduler Durumu ──────────────────")}\n`);
      process.stdout.write(`  Yüklü    : ${C.accent(v.currentlyLoaded)}\n`);
      process.stdout.write(`  VRAM     : ${C.yellow(String(v.vram_used_gb))} GB / 8 GB\n`);
      process.stdout.write(`  Döngü    : ${v.cycle_count}  ort. ${v.mean_cycle_ms ?? "—"}ms\n`);
      process.stdout.write(`${C.muted("───────────────────────────────────────")}\n\n`);
    } catch (e) { print.error(`scheduler hatası: ${e.message}`); }
    return;
  }

  // /tasks status veya /tasks — task panel render
  try {
    const panel = require("../../tui/task-panel.ts");
    process.stdout.write("\n" + panel.render());

    // Web arayüzü nerede?
    try {
      const fs = require("fs"), os = require("os"), path = require("path");
      const cfgPath = path.join(os.homedir(), ".orion", "config.json");
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      const port = cfg.serverPort ?? 4517;
      process.stdout.write(`${C.muted("  web: http://127.0.0.1:" + port + "/tasks")}\n\n`);
    } catch {}
  } catch (e) { print.error(`görev paneli hatası: ${e.message}`); }
}

module.exports = [
  {
    name:    "tasks",
    aliases: ["task", "gorevler", "kuyruk"],
    desc:    "Görev kuyruğu ve scheduler durumu",
    usage:   "/tasks  |  /tasks scheduler  |  /tasks enqueue <type> <prompt>",
    group:   "system",
    exec,
  },
];
