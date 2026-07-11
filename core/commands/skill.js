// core/commands/skill.js — /skill: prosedürel bellek yönetimi
"use strict";
const { C, T, print } = require("../../tui/index.js");
const skills = require("../skills.js");
const i18n   = require("../i18n.js");

const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";

module.exports = [{
  name:    "skill",
  aliases: ["beceri"],
  group:   "Memory",
  desc:    "Procedural memory: list / read / mine / delete",
  usage:   "/skill [list | read <name> | mine | delete <name>]",
  exec: async ({ args, rl }) => {
    const sub = args[0]?.toLowerCase();

    // /skill list (veya /skill)
    if (!sub || sub === "list" || sub === "liste") {
      const list = skills.listSkills();
      if (!list.length) {
        print.info(i18n.t(
          "No skills yet. Run /skill mine to discover patterns from telemetry.",
          "Henüz skill yok. /skill mine ile telemetry'den kalıpları keşfet."
        ));
        return;
      }
      console.log(`\n  ${BOLD}${T.star}Skills${RESET}  ${C.muted(`~/.orion/skills/`)}\n`);
      for (const s of list) {
        console.log(`  ${T.accent}${s.name}${RESET}`);
        console.log(`    ${C.muted(s.desc)}`);
      }
      console.log(`\n  ${C.dim("/skill read <name>  |  /skill mine  |  /skill delete <name>")}\n`);
      return;
    }

    // /skill read <name>
    if (sub === "read" || sub === "oku") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /skill read <name>", "Kullanım: /skill oku <ad>")); return; }
      const content = skills.readSkill(name);
      if (!content) { print.error(i18n.t(`Skill not found: ${name}`, `Skill bulunamadı: ${name}`)); return; }
      console.log(`\n${content}\n`);
      return;
    }

    // /skill delete <name>
    if (sub === "delete" || sub === "sil") {
      const name = args[1];
      if (!name) { print.error(i18n.t("Usage: /skill delete <name>", "Kullanım: /skill sil <ad>")); return; }
      const ok = skills.deleteSkill(name);
      print.system(ok
        ? i18n.t(`skill deleted: ${name}`, `skill silindi: ${name}`)
        : i18n.t(`not found: ${name}`, `bulunamadı: ${name}`)
      );
      return;
    }

    // /skill mine — telemetry'den kalıp çıkar + damıt
    if (sub === "mine" || sub === "maden") {
      const patterns = skills.minePatterns();
      if (!patterns.length) {
        print.info(i18n.t(
          "No repeating tool patterns yet (need 3+ occurrences of 2+ consecutive tools).",
          "Henüz tekrar eden kalıp yok (2+ araç dizisi, 3+ tekrar gerekli)."
        ));
        return;
      }

      console.log(`\n  ${BOLD}Repeating Tool Patterns${RESET}\n`);
      for (const p of patterns.slice(0, 5)) {
        console.log(`  ${C.muted(`[${p.count}×]`)}  ${T.accent}${p.seq}${RESET}`);
      }
      console.log("");

      if (!rl) {
        print.info(i18n.t("Interactive approval requires REPL mode.", "Onay için REPL modu gerekli."));
        return;
      }

      const top = patterns[0];
      const confirm = await new Promise(res =>
        rl.question(
          `  ${C.cyan("Distill top pattern")} (${top.count}×  ${top.seq}) ${C.dim("into a skill? [yes/no] ")}`,
          res
        )
      );
      if (!/^y/i.test(confirm)) { print.info("Skipped."); return; }

      print.info(i18n.t("Generating skill with local model...", "Yerel model ile skill üretiliyor..."));
      const content = await skills.distillSkill(top);
      if (!content) { print.warn(i18n.t("Local model returned nothing.", "Yerel model yanıt vermedi.")); return; }

      console.log(`\n${content}\n`);

      const titleMatch = content.match(/^##\s+(.+)/m);
      const suggested  = titleMatch ? skills.slugify(titleMatch[1]) : "skill-" + Date.now();
      const nameAnswer = await new Promise(res =>
        rl.question(`  ${C.dim(`Name [${suggested}]: `)}`, res)
      );
      const finalName = nameAnswer.trim() || suggested;

      const file = skills.saveSkill(finalName, content);
      print.system(i18n.t(`skill saved: ${file}`, `skill kaydedildi: ${file}`));
      return;
    }

    print.error(i18n.t("Usage: /skill [list | read <name> | mine | delete <name>]",
                        "Kullanım: /skill [liste | oku <ad> | maden | sil <ad>]"));
  },
}];
