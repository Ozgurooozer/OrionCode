// tests/harness-import.test.js — Claude Code oturum içe aktarma (core/harness-import.js)
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { test, after } = require("node:test");
const assert = require("node:assert");
const hi = require("../core/harness-import.js");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "orion-hi-"));
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

function writeFixture(lines) {
  const file = path.join(TMP, "fixture.jsonl");
  fs.writeFileSync(file, lines.map(l => JSON.stringify(l)).join("\n"), "utf8");
  return file;
}

test("claudeSlug: alfanümerik olmayan her karakter tire olur", () => {
  assert.strictEqual(hi.claudeSlug("c:\\Users\\ozigo\\Documents\\molp"), "c--Users-ozigo-Documents-molp");
});

test("_extractText: string, text blokları ve tool_use işareti", () => {
  assert.strictEqual(hi._extractText("düz metin"), "düz metin");
  assert.strictEqual(
    hi._extractText([{ type: "text", text: "cevap" }, { type: "tool_use", name: "read_file" }]),
    "cevap\n[araç çağrısı: read_file]"
  );
  assert.strictEqual(hi._extractText([{ type: "tool_result", content: "x" }]), "", "tool_result atlanır");
});

test("importClaudeSession: mesajlar çevrilir, ardışık aynı rol birleşir", () => {
  const file = writeFixture([
    { type: "summary", summary: "Test oturumu" },
    { type: "user",      message: { role: "user",      content: "soru bir" } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "cevap bir" }] } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "devamı" }] } },
    { type: "user",      message: { role: "user",      content: [{ type: "tool_result", content: "gürültü" }] } },
    { type: "user",      message: { role: "user",      content: "soru iki" } },
  ]);
  const { msgs, total } = hi.importClaudeSession(file);
  assert.strictEqual(total, 3, "birleşme sonrası 3 mesaj");
  assert.deepStrictEqual(msgs.map(m => m.role), ["user", "assistant", "user"]);
  assert.ok(msgs[1].content.includes("cevap bir") && msgs[1].content.includes("devamı"), "ardışık asistan birleşmeli");
});

test("importClaudeSession: kırpma sonrası ilk mesaj asistansa başa kullanıcı işareti gelir", () => {
  const lines = [];
  for (let i = 0; i < 30; i++) {
    lines.push({ type: "user",      message: { role: "user",      content: `soru ${i}` } });
    lines.push({ type: "assistant", message: { role: "assistant", content: `cevap ${i}` } });
  }
  const file = writeFixture(lines);
  const { msgs } = hi.importClaudeSession(file, 5); // 5'e kırp → ilk mesaj asistan olur
  assert.strictEqual(msgs[0].role, "user");
  assert.ok(msgs.length === 6, "işaret + 5 mesaj");
});

test("listClaudeSessions: olmayan dizinde boş liste", () => {
  const list = hi.listClaudeSessions("q:\\boyle\\bir\\dizin\\yok");
  assert.deepStrictEqual(list, []);
});
