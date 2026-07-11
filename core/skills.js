// core/skills.js — Prosedürel bellek: başarılı araç dizilerini skill olarak damıtır
// Üç adım: (1) telemetry'de dizi madenciliği, (2) local model damıtır, (3) kullanıcı onayı
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HOME       = process.env.ORION_HOME || os.homedir();
const SKILLS_DIR = path.join(HOME, ".orion", "skills");

function ensureDir() {
  if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

// ─── Dosya işlemleri ─────────────────────────────────────────────────────────

function listSkills() {
  ensureDir();
  return fs.readdirSync(SKILLS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, f), "utf8");
      const name  = f.replace(".md", "");
      const match = raw.match(/^##\s+(.+)/m);
      const desc  = match ? match[1].trim() : name;
      return { name, file: path.join(SKILLS_DIR, f), desc, raw };
    });
}

function readSkill(name) {
  const file = path.join(SKILLS_DIR, `${name}.md`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

function saveSkill(name, content) {
  ensureDir();
  const file = path.join(SKILLS_DIR, `${name}.md`);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

function deleteSkill(name) {
  const file = path.join(SKILLS_DIR, `${name}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

// ─── Dizi madenciliği ────────────────────────────────────────────────────────
// Telemetry'deki tool_call eventlerinden tekrar eden başarılı dizileri bul.
// Minimum 2 araç, minimum 3 kez tekrar.

function minePatterns(minLen = 2, minCount = 3) {
  const { listLogs, readLog } = require("./telemetry.js");
  const sequences = [];

  for (const { sessionId } of listLogs(200)) {
    const events  = readLog(sessionId);
    const session_tools = [];
    for (const e of events) {
      if (e.event === "tool_call") session_tools.push(e.tool ?? "?");
    }
    // Her olası pencereyi al
    for (let start = 0; start <= session_tools.length - minLen; start++) {
      for (let len = minLen; len <= Math.min(5, session_tools.length - start); len++) {
        sequences.push(session_tools.slice(start, start + len).join(" → "));
      }
    }
  }

  // Frekans say
  const freq = {};
  for (const seq of sequences) freq[seq] = (freq[seq] ?? 0) + 1;

  return Object.entries(freq)
    .filter(([, n]) => n >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([seq, count]) => ({ seq, count, tools: seq.split(" → ") }));
}

// ─── Damıtma: local model ile skill dosyası üret ─────────────────────────────

async function distillSkill(pattern, sessionContext = "") {
  const { ollamaRequest } = require("./extract.js");
  const { loadConfig }    = require("./router.js");
  const model = loadConfig().tier1Model ?? "qwen2.5-coder:7b";

  const prompt = `Sen bir bilgi mühendisisin. Aşağıdaki araç dizisi bir AI ajanın tekrarladığı başarılı bir iş akışını temsil ediyor.

Dizi (${pattern.count} kez gözlemlendi):
${pattern.seq}

Bu iş akışı için bir "skill" dosyası yaz. Format:
\`\`\`markdown
## [Kısa açıklayıcı isim]

**Ne zaman kullan:** [1 cümle — tetikleyici koşul]

**Adımlar:**
1. [araç adı]: [ne yapılır]
2. [araç adı]: [ne yapılır]
...

**Dikkat:** [varsa uyarı, yoksa bu satırı dahil etme]
\`\`\`

Bağlam: ${sessionContext || "genel geliştirme görevi"}
Sadece markdown döndür, açıklama yok.`;

  const raw = await ollamaRequest(model, prompt, { timeout: 30000 });
  return raw?.trim() ?? null;
}

// ─── slug üret ───────────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "skill";
}

// ─── Öneri: kullanıcıya göster, cevap bekle ──────────────────────────────────
// Caller (interactive loop) onay alıp saveSkill() çağırır.
async function proposeSkills(print, prompt_fn) {
  const patterns = minePatterns();
  if (!patterns.length) {
    print.info("No repeating tool patterns found yet (need 3+ occurrences, 2+ tools).");
    return;
  }

  print.info(`Found ${patterns.length} repeating tool pattern(s):`);
  for (const p of patterns.slice(0, 3)) {
    print.info(`  [${p.count}×] ${p.seq}`);
  }

  const top = patterns[0];
  const answer = await prompt_fn(`Distill top pattern into a skill? [yes/no] `);
  if (!/^y/i.test(answer)) { print.info("Skipped."); return null; }

  print.info("Generating skill with local model...");
  const content = await distillSkill(top);
  if (!content) { print.warn("Distillation failed — no response from local model."); return null; }

  // İsim öner
  const titleMatch = content.match(/^##\s+(.+)/m);
  const suggested  = titleMatch ? slugify(titleMatch[1]) : "skill-" + Date.now();
  const nameAnswer = await prompt_fn(`Skill name [${suggested}]: `);
  const finalName  = nameAnswer.trim() || suggested;

  const file = saveSkill(finalName, content);
  print.system(`Skill saved: ${file}`);
  return { name: finalName, file, content };
}

module.exports = {
  listSkills, readSkill, saveSkill, deleteSkill,
  minePatterns, distillSkill, proposeSkills, slugify,
};
