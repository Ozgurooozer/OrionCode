// core/commands/model.js — Model and backend management
"use strict";
const { C, print } = require("../../tui/index.js");
const i18n = require("../i18n.js");

module.exports = [{
  name:    "model",
  aliases: ["modeller", "m"],
  group:   "Model",
  desc:    "Show or switch active model/backend",
  usage:   "/model [or [filter] | hf | <backend> <id> | <id>]",
  exec: async ({ args, session }) => {
    const sub = args[0]?.toLowerCase();

    // /model or [filter] → OpenRouter list
    if (sub === "or" || sub === "openrouter") {
      if (!process.env.OPENROUTER_API_KEY) {
        print.warn(i18n.t("OPENROUTER_API_KEY missing — add it to credentials.json", "OPENROUTER_API_KEY eksik — credentials.json'a ekle"));
        return;
      }
      const or     = require("../../backends/openrouter.js");
      const filter = args[1] ?? "";
      print.info(i18n.t(`Fetching OpenRouter${filter ? ` (${filter})` : ""} list...`, `OpenRouter${filter ? ` (${filter})` : ""} listesi alınıyor...`));
      const models = await or.listModels({ filter, limit: 50 });
      if (!models.length) { print.warn(i18n.t("List is empty.", "Liste boş.")); return; }
      const free = models.filter(m => m.free);
      const paid = models.filter(m => !m.free);
      console.log("");
      if (free.length) {
        console.log(`  ${C.green(i18n.t("● FREE", "● ÜCRETSİZ"))}`);
        free.forEach(m => {
          const ctx = m.context ? C.dim(` ${(m.context / 1000).toFixed(0)}k`) : "";
          console.log(`    ${m.id}${ctx}  ${C.dim(m.name ?? "")}`);
        });
      }
      if (paid.length) {
        console.log(`\n  ${C.yellow(i18n.t("● PAID", "● ÜCRETLİ"))}`);
        paid.slice(0, 20).forEach(m => {
          const ctx = m.context ? C.dim(` ${(m.context / 1000).toFixed(0)}k`) : "";
          console.log(`    ${m.id}${ctx}`);
        });
        if (paid.length > 20) console.log(`    ${C.dim(i18n.t(`+${paid.length - 20} more`, `+${paid.length - 20} daha`))}`);
      }
      console.log(`\n  ${C.dim(i18n.t("/model openrouter <id>  →  switch", "/model openrouter <id>  →  geç"))}\n`);
      return;
    }

    // /model hf → HuggingFace list
    if (sub === "hf" || sub === "huggingface") {
      const hf = require("../../backends/huggingface.js");
      print.info(i18n.t("Fetching HuggingFace models...", "HuggingFace modelleri alınıyor..."));
      const models = await hf.listModels({ limit: 20 });
      if (!models.length) { print.warn(i18n.t("No HF access or list is empty.", "HF erişim yok ya da liste boş.")); return; }
      console.log("");
      models.forEach(m => console.log(`  ${m}`));
      console.log(`\n  ${C.dim(i18n.t("/model huggingface <id>  →  switch", "/model huggingface <id>  →  geç"))}\n`);
      return;
    }

    // /model <backend> <id>
    if (args.length >= 2) {
      session.backend = args[0];
      session.model   = args.slice(1).join(" ");
      session._manualBackend = true;
      session._manualModel   = true;
      print.system(i18n.t(`backend → ${session.backend}  model → ${session.model}`, `backend → ${session.backend}  model → ${session.model}`));
      return;
    }

    // /model <id>
    if (args.length === 1) {
      session.model = args[0];
      session._manualModel = true;
      print.system(`model → ${session.model}`);
      return;
    }

    // /model — current status + detected backends
    console.log(`\n  ${C.bold(i18n.t("Active:", "Aktif:"))} ${C.cyan(session.backend)} ${C.yellow(session.model)}\n`);
    const backends = require("../../backends/index.js");
    const all      = await backends.detect();
    for (const b of all) {
      const tag = b.name === session.backend ? C.green(" ◀") : "";
      console.log(`  ${C.cyan(b.name)}${tag}`);
      for (const m of b.models ?? []) {
        const cur = m === session.model ? C.yellow(i18n.t(" ◀ active", " ◀ aktif")) : "";
        console.log(`    ${C.dim("·")} ${m}${cur}`);
      }
    }
    console.log(`\n  ${C.dim(i18n.t("/model or [filter]   →  OpenRouter", "/model or [filtre]   →  OpenRouter"))}`);
    console.log(`  ${C.dim(i18n.t("/model hf            →  HuggingFace", "/model hf            →  HuggingFace"))}`);
    console.log(`  ${C.dim(i18n.t("/model <backend> <id>  →  switch", "/model <backend> <id>  →  geç"))}\n`);
  },
}];
