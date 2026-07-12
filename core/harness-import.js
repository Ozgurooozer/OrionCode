// core/harness-import.js — Başka harness'lerin oturumlarını devral (jcode karşılığı)
// Şimdilik: Claude Code (~/.claude/projects/<slug>/*.jsonl). Yapı yeni
// harness'ler (Codex, OpenCode) eklenebilecek şekilde ayrık tutuldu.
"use strict";
const fs   = require("fs");
const path = require("path");
const os   = require("os");

// Claude Code proje dizini slug'ı: yol içindeki alfanümerik olmayan her şey "-"
function claudeSlug(cwd) {
  return String(cwd).replace(/[^A-Za-z0-9]/g, "-");
}

function claudeProjectDir(cwd = process.cwd()) {
  return path.join(os.homedir(), ".claude", "projects", claudeSlug(cwd));
}

// Bu dizin için kayıtlı Claude Code oturumlarını listele (yeniden eskiye)
function listClaudeSessions(cwd = process.cwd(), limit = 15) {
  const dir = claudeProjectDir(cwd);
  let files;
  try { files = fs.readdirSync(dir).filter(f => f.endsWith(".jsonl")); }
  catch { return []; }

  const sessions = files.map(f => {
    const file = path.join(dir, f);
    const st   = fs.statSync(file);
    return { file, id: f.replace(".jsonl", ""), mtime: st.mtimeMs, sizeKB: Math.round(st.size / 1024) };
  }).sort((a, b) => b.mtime - a.mtime).slice(0, limit);

  // Başlık: summary satırı varsa onu, yoksa ilk kullanıcı mesajını kullan
  for (const s of sessions) {
    s.title = "";
    try {
      const raw = fs.readFileSync(s.file, "utf8");
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        let obj; try { obj = JSON.parse(line); } catch { continue; }
        if (obj.type === "summary" && obj.summary) { s.title = obj.summary; break; }
        if (!s.title && obj.type === "user") {
          const t = _extractText(obj.message?.content);
          if (t && !t.startsWith("<")) { s.title = t.slice(0, 80); } // ilk gerçek mesaj (XML meta değil)
        }
      }
    } catch {}
    if (!s.title) s.title = s.id.slice(0, 8);
  }
  return sessions;
}

// content: string | [{type:"text",text}|{type:"tool_use",name}|{type:"tool_result",...}]
function _extractText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (block?.type === "text" && block.text?.trim()) parts.push(block.text.trim());
    else if (block?.type === "tool_use" && block.name) parts.push(`[araç çağrısı: ${block.name}]`);
    // tool_result / thinking blokları atlanır — bağlam devri için gürültü
  }
  return parts.join("\n").trim();
}

/**
 * Claude Code JSONL oturumunu Orion mesaj biçimine çevir.
 * Ardışık aynı-rol mesajlar birleştirilir (Anthropic dönüşümlülük kuralı),
 * ilk mesaj asistan ise başa işaret mesajı konur.
 * @returns {{msgs: Array<{role, content}>, total: number}}
 */
function importClaudeSession(file, maxMessages = 40) {
  const raw = fs.readFileSync(file, "utf8");
  const msgs = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let obj; try { obj = JSON.parse(line); } catch { continue; }
    if (obj.type !== "user" && obj.type !== "assistant") continue;
    const role = obj.message?.role;
    if (role !== "user" && role !== "assistant") continue;
    const text = _extractText(obj.message?.content);
    if (!text) continue;
    // Ardışık aynı rol → birleştir
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += "\n\n" + text;
    else msgs.push({ role, content: text });
  }
  const total = msgs.length;
  let trimmed = msgs.slice(-maxMessages);
  if (trimmed[0]?.role === "assistant") {
    trimmed = [{ role: "user", content: "[içe aktarılan oturumun başı kırpıldı]" }, ...trimmed];
  }
  return { msgs: trimmed, total };
}

module.exports = { claudeSlug, claudeProjectDir, listClaudeSessions, importClaudeSession, _extractText };
