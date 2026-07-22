// core/selfdev.js — Self-dev modu (jcode "self dev mode" karşılığı)
// @ts-nocheck
// Orion kendi kaynak kodunu düzenleyebilir, test edebilir ve kendini yeniden
// başlatıp oturumu devralabilir. Akış: düzenle → test → (Ozyn onayı) → restart.
"use strict";
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");

// Self-dev açıkken system prompt'a eklenen talimat
function buildSelfDevSuffix(i18n) {
  return i18n.t(
    `\n\n## SELF-DEV MODE ACTIVE
You may modify your own source code. Root: ${ROOT}
Workflow — follow strictly:
1. Edit files with write_file/edit_file (small, focused changes)
2. Run the test suite: run_command "node --test tests/"
3. If tests fail, fix before anything else
4. Ask Ozyn for approval, then apply with /selfdev reload (commands only) or /selfdev restart (full, resumes this session)
Never edit credentials.json. Never commit without Ozyn's approval.`,
    `\n\n## SELF-DEV MODU AKTİF
Kendi kaynak kodunu düzenleyebilirsin. Kök: ${ROOT}
Akış — sıkı uygula:
1. write_file/edit_file ile düzenle (küçük, odaklı değişiklikler)
2. Test paketini çalıştır: run_command "node --test tests/"
3. Testler kırmızıysa önce düzelt
4. Ozyn'den onay iste, sonra /selfdev reload (sadece komutlar) ya da /selfdev restart (tam — bu oturum devralınır)
credentials.json'a asla dokunma. Ozyn onayı olmadan commit atma.`
  );
}

// Test paketini çalıştır — {ok, code, tail}
function runTests(timeoutMs = 120_000) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ["--test", "tests/"], { cwd: ROOT, windowsHide: true });
    let out = "";
    const cap = c => { out += c; if (out.length > 100_000) out = out.slice(-50_000); };
    child.stdout.on("data", cap);
    child.stderr.on("data", cap);
    const timer = setTimeout(() => { child.kill(); resolve({ ok: false, code: -1, tail: "timeout (120s)" }); }, timeoutMs);
    child.on("close", code => {
      clearTimeout(timer);
      const lines = out.trim().split("\n");
      resolve({ ok: code === 0, code, tail: lines.slice(-12).join("\n") });
    });
    child.on("error", e => { clearTimeout(timer); resolve({ ok: false, code: -1, tail: e.message }); });
  });
}

// Komut modüllerini sıcak yeniden yükle
function reloadCommands() {
  return require("./commands/index.ts").reload();
}

// Tam yeniden başlatma: oturumu kaydet, yeni süreç --resume ile devralsın, bu süreç çıksın
function restart(session) {
  session._save();
  const child = spawn(process.execPath, ["--experimental-strip-types", path.join(ROOT, "orion.ts"), "--resume", session.id], {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: false,
  });
  child.on("spawn", () => process.exit(0));
  child.on("error", (err) => {
    const { print } = require("../tui/output.ts");
    print.warn(`restart: spawn failed — ${err.message}`);
    print.warn("Yeniden başlatılamadı. Lütfen manuel olarak çıkıp tekrar başlat.");
    process.exit(1);
  });
}

module.exports = { ROOT, buildSelfDevSuffix, runTests, reloadCommands, restart };
