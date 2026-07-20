// core/commands/tool.js — File, search, sub-agent, coordinator
"use strict";
const { C }     = require("../../tui/colors.ts");
const { print } = require("../../tui/output.ts");
const i18n = require("../i18n.js");

module.exports = [
  {
    name:    "read",
    aliases: ["oku", "r"],
    group:   "Tools",
    desc:    "Show file contents (supports :offset:limit suffix)",
    usage:   "/read <file-path> [offset] [limit]",
    exec: async ({ args }) => {
      // /read path.js          → tümü
      // /read path.js 50       → satır 50'den başla
      // /read path.js 50 100   → satır 50-150
      let fpath = args[0];
      if (!fpath) { print.error(i18n.t("Usage: /read <file-path> [offset] [limit]", "Kullanım: /oku <dosya-yolu> [offset] [limit]")); return; }
      const offset = args[1] ? parseInt(args[1], 10) : undefined;
      const limit  = args[2] ? parseInt(args[2], 10) : undefined;
      const fsTools = require("../../tools/fs.js");
      const inp = { path: fpath };
      if (offset) inp.offset = offset;
      if (limit)  inp.limit  = limit;
      console.log(fsTools.execute("read_file", inp));
    },
  },
  {
    name:    "search",
    aliases: ["ara", "grep"],
    group:   "Tools",
    desc:    "Search text in files",
    usage:   "/search <pattern> [dir] [-C <lines>]",
    exec: async ({ args }) => {
      if (!args.length) { print.error(i18n.t("Usage: /search <pattern> [dir] [-C lines]", "Kullanım: /ara <pattern> [dir] [-C satır]")); return; }
      const pattern = args[0];
      let dir, context;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "-C" && args[i + 1]) { context = parseInt(args[++i], 10); }
        else if (!dir) dir = args[i];
      }
      const fsTools = require("../../tools/fs.js");
      const inp = { pattern };
      if (dir)     inp.dir = dir;
      if (context) inp.context = context;
      console.log(fsTools.execute("search", inp));
    },
  },
  {
    name:    "glob",
    aliases: ["find", "bul"],
    group:   "Tools",
    desc:    "Find files by glob pattern (e.g. **/*.test.js)",
    usage:   "/glob <pattern> [dir]",
    exec: async ({ args }) => {
      const pattern = args[0];
      if (!pattern) { print.error(i18n.t("Usage: /glob <pattern> [dir]", "Kullanım: /glob <pattern> [dir]")); return; }
      const dir = args[1] ?? undefined;
      const fsTools = require("../../tools/fs.js");
      const inp = { pattern };
      if (dir) inp.dir = dir;
      console.log(fsTools.execute("glob_files", inp));
    },
  },
  {
    name:    "test",
    aliases: ["t", "testler"],
    group:   "Tools",
    desc:    "Run project tests",
    usage:   "/test [pattern]",
    exec: async ({ args }) => {
      const cfg = require("../router.ts").loadConfig();
      // Hangi test komutu kullanılacak?
      const cwd = process.env.ORION_WORKSPACE ?? process.cwd();
      let cmd;
      if (args.length) {
        // Explicit pattern: node --test ile tek dosya veya pattern
        cmd = `node --test ${args.join(" ")}`;
      } else {
        // package.json'da test script var mı?
        try {
          const pkg = JSON.parse(require("fs").readFileSync(require("path").join(cwd, "package.json"), "utf8"));
          if (pkg.scripts?.test && !pkg.scripts.test.includes("no test specified")) {
            cmd = "npm test";
          }
        } catch {}
        cmd = cmd ?? "node --test";
      }
      const shellTools = require("../../tools/shell.js");
      const out = await shellTools.execute("run_command", { command: cmd, cwd });
      console.log(out);
    },
  },
  {
    name:    "subagent",
    aliases: ["subajans", "sub", "sa"],
    group:   "Tools",
    desc:    "Run a separate sub-agent",
    usage:   "/subagent <task>",
    exec: async ({ args, session }) => {
      const task = args.join(" ");
      if (!task) { print.error(i18n.t("Usage: /subagent <task>", "Kullanım: /subajans <görev>")); return; }
      print.info(i18n.t(`Sub-agent: "${task.slice(0, 60)}"`, `Sub-ajan: "${task.slice(0, 60)}"`));
      const subagent = require("../subagent.js");
      const result   = await subagent.run({
        task,
        model:         session.model,
        backend:       session.backend,
        workspace:     process.env.ORION_WORKSPACE ?? process.cwd(),
        allowCommands: true, // /subagent kullanıcı tetiklemeli — güvenilir
      });
      console.log(`\n${C.cyan(i18n.t("── Sub-agent ──", "── Sub-ajan ──"))}`);
      // Final yanıtı işaretleyiciden çıkart, yoksa tüm stdout'u göster
      const finalM = (result.stdout || "").match(/<<<ORION_FINAL>>>\n([\s\S]*?)\n<<<END_FINAL>>>/);
      const display = finalM ? finalM[1].trim() : (result.stdout || "");
      console.log(display || C.gray(i18n.t("(no output)", "(çıktı yok)")));
      if (result.stderr) console.log(C.gray(result.stderr.slice(0, 200)));
      if (result.timedOut) print.warn(i18n.t("Sub-agent timed out", "Sub-ajan zaman aşımına uğradı"));
      console.log(C.cyan("──────────────\n"));
    },
  },
  {
    name:    "git",
    aliases: ["g"],
    group:   "Tools",
    desc:    "Git durum/diff/log/add/commit",
    usage:   "/git [status|diff|log|add <paths>|commit <msg>]",
    exec: async ({ args }) => {
      const sub = args[0] ?? "status";
      const gitTools = require("../../tools/git.js");
      const cwd = process.env.ORION_WORKSPACE ?? process.cwd();
      switch (sub) {
        case "status": case "st":
          console.log(await gitTools.execute("git_status", { cwd }));
          break;
        case "diff": {
          const staged = args[1] === "--staged" || args[1] === "--cached";
          const filePath = staged ? args[2] : args[1];
          const inp = { cwd };
          if (staged)   inp.staged = true;
          if (filePath) inp.path = filePath;
          console.log(await gitTools.execute("git_diff", inp));
          break;
        }
        case "log": {
          const n = args[1] ? parseInt(args[1], 10) : undefined;
          const inp = { cwd };
          if (n) inp.n = n;
          console.log(await gitTools.execute("git_log", inp));
          break;
        }
        case "add": {
          const paths = args.slice(1).join(" ") || ".";
          console.log(await gitTools.execute("git_add", { paths, cwd }));
          break;
        }
        case "commit": {
          const message = args.slice(1).join(" ");
          if (!message) { const { print } = require("../../tui/output.ts"); print.error("Kullanım: /git commit <mesaj>"); return; }
          console.log(await gitTools.execute("git_commit", { message, cwd }));
          break;
        }
        case "show": {
          const ref = args[1] ?? undefined;
          const inp = { cwd };
          if (ref) inp.ref = ref;
          console.log(await gitTools.execute("git_show", inp));
          break;
        }
        case "blame": {
          const filePath = args[1];
          if (!filePath) { print.error("Kullanım: /git blame <dosya> [satır-başlangıç] [satır-bitiş]"); return; }
          const inp = { path: filePath, cwd };
          if (args[2]) inp.from = parseInt(args[2], 10);
          if (args[3]) inp.to   = parseInt(args[3], 10);
          console.log(await gitTools.execute("git_blame", inp));
          break;
        }
        default:
          console.log(`Bilinmeyen git alt komutu: ${sub}\nKullanım: /git [status|diff|log|add|commit|show|blame]`);
      }
    },
  },
  {
    name:    "fix",
    aliases: ["düzelt", "autofix"],
    group:   "Tools",
    desc:    "Run tests, capture failures, send to AI to fix automatically",
    usage:   "/fix [test-command]",
    exec: async ({ args, session }) => {
      const cwd = process.env.ORION_WORKSPACE ?? process.cwd();
      const shellTools = require("../../tools/shell.js");

      // Test komutu: arg > package.json scripts.test > node --test
      let testCmd;
      if (args.length) {
        testCmd = args.join(" ");
      } else {
        try {
          const pkg = JSON.parse(require("fs").readFileSync(require("path").join(cwd, "package.json"), "utf8"));
          if (pkg.scripts?.test && !pkg.scripts.test.includes("no test specified")) {
            testCmd = "npm test";
          }
        } catch {}
        testCmd = testCmd ?? "node --test";
      }

      print.system(i18n.t(`/fix: running "${testCmd}"`, `/fix: "${testCmd}" çalıştırılıyor`));
      const out = await shellTools.execute("run_command", { command: testCmd, cwd });

      // Başarılı mı kontrol et
      const hasFailure = out.includes("[exit") || out.includes("✖") || out.includes("fail ") || out.includes("FAILED") || /\bfail\b.*[1-9]/i.test(out) || out.includes("[timeout:");
      if (!hasFailure) {
        print.system(i18n.t("All tests pass — nothing to fix.", "Tüm testler geçiyor — düzeltecek bir şey yok."));
        return;
      }

      print.system(i18n.t("Tests failed — asking AI to fix...", "Testler başarısız — AI'ya düzeltme isteniyor..."));

      // AI'ya hata çıktısını ver
      const prompt = i18n.t(
        `The following test command failed:\n\`${testCmd}\`\n\nOutput:\n\`\`\`\n${out.slice(0, 6000)}\n\`\`\`\n\nAnalyze the failures and fix the code. Run the test command again after fixing to verify.`,
        `Şu test komutu başarısız oldu:\n\`${testCmd}\`\n\nÇıktı:\n\`\`\`\n${out.slice(0, 6000)}\n\`\`\`\n\nBaşarısızlıkları analiz edip kodu düzelt. Düzelttikten sonra test komutunu yeniden çalıştırarak doğrula.`
      );

      await session.send(prompt);
    },
  },
  {
    name:    "coordinator",
    aliases: ["koordinator", "ko", "multi", "swarm"],
    group:   "Tools",
    desc:    "Multi-agent: plan → execute → synthesize",
    usage:   "/coordinator <task>",
    exec: async ({ args, session }) => {
      const task = args.join(" ");
      if (!task) { print.error(i18n.t("Usage: /coordinator <task>", "Kullanım: /koordinator <görev>")); return; }
      const coordinator = require("../coordinator.js");
      await coordinator.runCoordination(task, session);
    },
  },
];
