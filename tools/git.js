// tools/git.js — Git araçları (güvenli okuma + onaylı yazma)
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const DEFS = [
  {
    name: "git_status",
    description: "Çalışma ağacı durumunu göster: değiştirilmiş/staged/untracked dosyalar. Düzenleme yapmadan önce repo durumunu anlamak için kullan.",
    input_schema: {
      type: "object",
      properties: {
        cwd: { type: "string", description: "Git repo kökü (varsayılan: workspace)" },
      },
    },
  },
  {
    name: "git_diff",
    description: "Staged veya unstaged değişiklikleri diff olarak göster.",
    input_schema: {
      type: "object",
      properties: {
        staged: { type: "boolean", description: "true: staged değişiklikler (git diff --cached), false: unstaged (varsayılan: false)" },
        path:   { type: "string",  description: "Belirli bir dosya/dizin (opsiyonel)" },
        cwd:    { type: "string",  description: "Git repo kökü" },
      },
    },
  },
  {
    name: "git_log",
    description: "Son commit geçmişini göster.",
    input_schema: {
      type: "object",
      properties: {
        n:    { type: "number", description: "Gösterilecek commit sayısı (varsayılan: 10)" },
        file: { type: "string", description: "Belirli bir dosyanın commit geçmişi" },
        cwd:  { type: "string", description: "Git repo kökü" },
      },
    },
  },
  {
    name: "git_add",
    description: "Dosyaları staged (index) alanına ekle. git_commit'ten önce çağrılır.",
    input_schema: {
      type: "object",
      properties: {
        paths: {
          description: "Staged edilecek dosya yolları (string veya string[]). '.' tüm değişiklikleri ekler.",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        cwd: { type: "string", description: "Git repo kökü" },
      },
      required: ["paths"],
    },
  },
  {
    name: "git_commit",
    description: "Staged değişiklikleri commit et. git_add ile önce dosyaları staged et.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Commit mesajı" },
        cwd:     { type: "string", description: "Git repo kökü" },
      },
      required: ["message"],
    },
  },
  {
    name: "git_show",
    description: "Belirli bir commit'in değişikliklerini göster (diff + metadata). Commit hash, HEAD~N veya branch:file formatını destekler.",
    input_schema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Commit hash, tag veya HEAD~N (varsayılan: HEAD)" },
        cwd: { type: "string", description: "Git repo kökü" },
      },
    },
  },
  {
    name: "git_blame",
    description: "Bir dosyanın her satırı için kim tarafından hangi commit'te yazıldığını göster. Bir hatanın veya değişikliğin kaynağını bulmak için kullan.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string",  description: "Blame yapılacak dosya yolu" },
        from: { type: "number",  description: "Başlangıç satırı (1 tabanlı)" },
        to:   { type: "number",  description: "Bitiş satırı (dahil)" },
        cwd:  { type: "string",  description: "Git repo kökü" },
      },
      required: ["path"],
    },
  },
];

function _cwd(input) {
  return path.resolve(input?.cwd ?? process.env.ORION_WORKSPACE ?? ".");
}

function _run(args, cwd) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    timeout: 15_000,
    windowsHide: true,
  });
  if (r.error) throw new Error(`git spawn hatası: ${r.error.message}`);
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", code: r.status ?? 0 };
}

async function _askApproval(label) {
  if (process.argv.includes("--headless")) return false;
  const cfg = require("../core/router.ts").loadConfig();
  if (cfg.autoApproveCommands) return true;
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const { selectInput } = require("../tui/select-input.js");
    const { C } = require("../tui/colors.ts");
    const choice = await selectInput(
      `${C.yellow("⚡ git")} ${label}`,
      [
        { value: "yes", label: "Çalıştır",  hint: "Enter" },
        { value: "no",  label: "İptal", hint: "Esc" },
      ]
    );
    return choice === "yes";
  }
  return false;
}

async function execute(name, input) {
  const cwd = _cwd(input);

  switch (name) {
    case "git_status": {
      const { stdout, stderr, code } = _run(["status", "--short", "--branch"], cwd);
      if (code !== 0) return `git status hatası:\n${stderr}`;
      return stdout.trim() || "(temiz çalışma ağacı)";
    }

    case "git_diff": {
      const args = ["diff", "--stat", "-p"];
      if (input?.staged) args.splice(1, 0, "--cached");
      if (input?.path)   args.push("--", input.path);
      const { stdout, stderr, code } = _run(args, cwd);
      if (code !== 0) return `git diff hatası:\n${stderr}`;
      const out = stdout.trim();
      if (!out) return "(değişiklik yok)";
      return out.length > 8000 ? out.slice(0, 8000) + "\n… [kırpıldı]" : out;
    }

    case "git_log": {
      const n = typeof input?.n === "number" ? Math.min(input.n, 50) : 10;
      const args = ["log", `--oneline`, `-n`, String(n), "--decorate"];
      if (input?.file) args.push("--", input.file);
      const { stdout, stderr, code } = _run(args, cwd);
      if (code !== 0) return `git log hatası:\n${stderr}`;
      return stdout.trim() || "(commit yok)";
    }

    case "git_add": {
      const rawPaths = Array.isArray(input?.paths)
        ? input.paths
        : [String(input?.paths ?? ".")];
      const label = rawPaths.join(" ");
      if (!await _askApproval(`add ${label}`)) return "İptal — onay verilmedi.";
      const { stderr, code } = _run(["add", "--", ...rawPaths], cwd);
      if (code !== 0) return `git add hatası:\n${stderr}`;
      // Staged sonucu göster
      const { stdout: st } = _run(["diff", "--cached", "--stat"], cwd);
      return `Staged: ${label}\n${st.trim() || "(değişiklik yok)"}`;
    }

    case "git_commit": {
      if (!input?.message) return "HATA: 'message' parametresi gerekli.";
      if (!await _askApproval(`commit -m "${input.message.slice(0, 60)}"`)) return "İptal — onay verilmedi.";
      const { stdout, stderr, code } = _run(["commit", "-m", input.message], cwd);
      if (code !== 0) return `git commit hatası:\n${stderr}`;
      return stdout.trim();
    }

    case "git_show": {
      const ref = input?.ref ?? "HEAD";
      const args = ["show", "--stat", "-p", ref];
      const { stdout, stderr, code } = _run(args, cwd);
      if (code !== 0) return `git show hatası:\n${stderr}`;
      const out = stdout.trim();
      if (!out) return "(çıktı yok)";
      return out.length > 8000 ? out.slice(0, 8000) + "\n… [kırpıldı]" : out;
    }

    case "git_blame": {
      if (!input?.path) return "HATA: 'path' parametresi gerekli.";
      const bArgs = ["blame", "--line-porcelain"];
      if (input.from && input.to) bArgs.push(`-L${input.from},${input.to}`);
      else if (input.from)        bArgs.push(`-L${input.from},${input.from + 29}`);
      bArgs.push("--", input.path);
      const { stdout, stderr, code } = _run(bArgs, cwd);
      if (code !== 0) return `git blame hatası:\n${stderr}`;
      // Porcelain → human-readable dönüşüm
      const lines = stdout.split("\n");
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const header = lines[i] ?? "";
        if (!header.match(/^[0-9a-f]{40}/)) { i++; continue; }
        const hash   = header.slice(0, 8);
        const lineNo = header.split(" ")[2];
        let author = "", time = "", summary = "";
        i++;
        while (i < lines.length && !lines[i].startsWith("\t")) {
          const l = lines[i];
          if (l.startsWith("author "))           author  = l.slice(7);
          if (l.startsWith("author-time "))       time    = new Date(Number(l.slice(12)) * 1000).toISOString().slice(0, 10);
          if (l.startsWith("summary "))           summary = l.slice(8).slice(0, 40);
          i++;
        }
        const content = lines[i]?.slice(1) ?? "";
        out.push(`${String(lineNo).padStart(4)} ${hash} ${time} ${author.slice(0, 16).padEnd(16)} | ${content}`);
        i++;
      }
      return out.join("\n") || "(boş)";
    }

    default:
      return `Bilinmeyen git aracı: ${name}`;
  }
}

module.exports = { DEFS, execute };
