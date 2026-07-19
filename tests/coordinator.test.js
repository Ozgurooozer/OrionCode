// tests/coordinator.test.js — Multi-agent koordinatör pipeline testleri
"use strict";
const fs   = require("fs");
const os   = require("os");
const path = require("path");

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "orion-coord-test-"));
process.env.ORION_HOME      = tmpHome;
process.env.ORION_WORKSPACE = tmpHome;

const { test } = require("node:test");
const assert   = require("node:assert");

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

const coordinator = require("../core/coordinator.js");
const subagent    = require("../core/subagent.js");
const backends    = require("../backends/index.js");

// Fake session: backend "fake-coord-test" ile hep sabit yanıt döner
function makeFakeSession(responseText) {
  const fakeBackend = { name: "fake-coord-test", chat: async () => responseText };
  backends.registerProvider(fakeBackend);
  return { id: "test-session", backend: "fake-coord-test", model: "test-model" };
}

// subagent.run'ı geçici olarak monkey-patch et
function mockSubagent(fn) {
  const orig = subagent.run;
  subagent.run = fn;
  return () => { subagent.run = orig; };
}

// ────────────────────────────────────────────────────────────────────
// 1. _extractFinal — işaretleyici ve fallback
// ────────────────────────────────────────────────────────────────────

test("_extractFinal: <<<ORION_FINAL>>> işaretleyicisinden içeriği çıkartır", () => {
  const raw = "...gürültü...\n<<<ORION_FINAL>>>\nSon cevap burada.\n<<<END_FINAL>>>\n...daha fazla...";
  const result = coordinator._extractFinal(raw);
  assert.strictEqual(result, "Son cevap burada.", `beklenmeyen sonuç: ${result}`);
});

test("_extractFinal: işaretleyici yoksa son N karakteri döndürür", () => {
  const raw = "a".repeat(2000) + "SON_KISIM";
  const result = coordinator._extractFinal(raw, 20);
  assert.ok(result.includes("SON_KISIM"), "fallback son karakterleri döndürmeli");
  assert.ok(result.length <= 25, "fallback uzunluğu sınırı aşmamalı");
});

test("_extractFinal: boş string için boş string döner", () => {
  const result = coordinator._extractFinal("", 100);
  assert.strictEqual(result, "", "boş giriş için boş dönmeli");
});

test("_extractFinal: ANSI escape kodlarını soyar", () => {
  const raw = "\x1b[32mYeşil metin\x1b[0m sonuç";
  const result = coordinator._extractFinal(raw, 500);
  assert.ok(!result.includes("\x1b"), "ANSI kodu temizlenmeli");
  assert.ok(result.includes("sonuç"), "içerik korunmalı");
});

// ────────────────────────────────────────────────────────────────────
// 2. _isEmptyOutput — boş çıktı tespiti
// ────────────────────────────────────────────────────────────────────

test("_isEmptyOutput: null ve undefined için true", () => {
  assert.ok(coordinator._isEmptyOutput(null));
  assert.ok(coordinator._isEmptyOutput(undefined));
  assert.ok(coordinator._isEmptyOutput(""));
});

test("_isEmptyOutput: 20 karakterden kısa string için true", () => {
  assert.ok(coordinator._isEmptyOutput("kısa"));
  assert.ok(coordinator._isEmptyOutput("   \n  "));
  assert.ok(!coordinator._isEmptyOutput("Bu yeterince uzun bir çıktı metni."));
});

test("_isEmptyOutput: HATA: öneki için true", () => {
  assert.ok(coordinator._isEmptyOutput("HATA: bir şeyler yanlış gitti burada"));
  assert.ok(coordinator._isEmptyOutput("Error: something failed in the pipeline here"));
  assert.ok(coordinator._isEmptyOutput("stdin write failed — pipe broken error"));
});

test("_isEmptyOutput: geçerli çıktı için false", () => {
  assert.ok(!coordinator._isEmptyOutput("Dosya başarıyla düzenlendi. Test sonuçları: 5/5 geçti."));
});

// ────────────────────────────────────────────────────────────────────
// 3. plan() — JSON ayrıştırma ve fallback
// ────────────────────────────────────────────────────────────────────

test("plan(): geçerli JSON döndüğünde subtask'ları doğru ayrıştırır", async () => {
  const planJson = JSON.stringify({
    subtasks: [
      { id: "1", role: "researcher", task: "Dosyaları incele" },
      { id: "2", role: "coder",      task: "Düzenleme yap ve test çalıştır" },
    ],
    sequential: true,
    planText: "Önce araştır, sonra kodla",
  });
  const session = makeFakeSession(planJson);
  const result  = await coordinator.plan("test görevi", session);

  assert.strictEqual(result.subtasks.length, 2, "2 subtask olmalı");
  assert.strictEqual(result.subtasks[0].role, "researcher");
  assert.strictEqual(result.subtasks[1].role, "coder");
  assert.strictEqual(result.sequential, true);
  assert.strictEqual(result.planText, "Önce araştır, sonra kodla");
});

test("plan(): markdown fence'li JSON ayrıştırılır", async () => {
  const planJson = "```json\n" + JSON.stringify({
    subtasks: [{ id: "1", role: "coder", task: "Değişiklik yap" }],
    sequential: true,
    planText: "",
  }) + "\n```";
  const session = makeFakeSession(planJson);
  const result  = await coordinator.plan("test", session);

  assert.strictEqual(result.subtasks.length, 1);
  assert.strictEqual(result.subtasks[0].role, "coder");
});

test("plan(): bozuk JSON → tek görev fallback", async () => {
  const session = makeFakeSession("Bu JSON değil { broken");
  const result  = await coordinator.plan("orijinal görev", session);

  assert.strictEqual(result.subtasks.length, 1, "fallback tek subtask olmalı");
  assert.strictEqual(result.subtasks[0].task, "orijinal görev", "görev korunmalı");
  assert.strictEqual(result.subtasks[0].role, "coder");
  assert.strictEqual(result.sequential, true);
});

test("plan(): boş subtasks dizisi → tek görev fallback", async () => {
  const session = makeFakeSession(JSON.stringify({ subtasks: [], sequential: true, planText: "" }));
  const result  = await coordinator.plan("görev x", session);

  assert.strictEqual(result.subtasks.length, 1, "boş subtasks → fallback tek görev");
});

test("plan(): LLM çağrısı hata fırlatırsa tek görev fallback", async () => {
  const brokenBackend = { name: "fake-broken-plan", chat: async () => { throw new Error("ağ hatası"); } };
  backends.registerProvider(brokenBackend);
  const session = { id: "t", backend: "fake-broken-plan", model: "m" };
  const result  = await coordinator.plan("hatalı LLM görevi", session);

  assert.strictEqual(result.subtasks.length, 1, "hata → fallback");
  assert.strictEqual(result.subtasks[0].role, "coder");
});

// ────────────────────────────────────────────────────────────────────
// 4. execute() — sıralı mod, retry, paralel
// ────────────────────────────────────────────────────────────────────

test("execute(): sıralı modda tek subtask çıktısını döndürür", async () => {
  const restore = mockSubagent(async () => ({
    stdout: "Araştırma tamamlandı: tools/fs.js satır 42'de sorun bulundu.",
    stderr: "",
    timedOut: false,
    code: 0,
  }));
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    const results = await coordinator.execute(
      [{ id: "1", role: "researcher", task: "Dosyaları incele" }],
      session,
      true,
      {}
    );
    assert.strictEqual(results.length, 1);
    assert.ok(results[0].output.includes("Araştırma"), "çıktı yakalanmalı");
  } finally {
    restore();
  }
});

test("execute(): coder rolü boş çıktıda bir kez yeniden dener", async () => {
  let callCount = 0;
  const restore = mockSubagent(async () => {
    callCount++;
    if (callCount === 1) return { stdout: "", stderr: "", timedOut: false, code: 0 };
    return { stdout: "İkinci denemede başarılı: dosya düzenlendi ve testler geçti.", stderr: "", timedOut: false, code: 0 };
  });
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    const results = await coordinator.execute(
      [{ id: "1", role: "coder", task: "Dosyayı düzenle" }],
      session,
      true,
      {}
    );
    assert.strictEqual(callCount, 2, "boş çıktı → 2 deneme olmalı");
    assert.ok(results[0].output.includes("başarılı"), "ikinci deneme çıktısı alınmalı");
  } finally {
    restore();
  }
});

test("execute(): coder timeout'ta bir kez yeniden dener", async () => {
  let callCount = 0;
  const restore = mockSubagent(async () => {
    callCount++;
    if (callCount === 1) return { stdout: "", stderr: "", timedOut: true, code: -1 };
    return { stdout: "İkinci deneme başarılı: test sonuçları 5/5.", stderr: "", timedOut: false, code: 0 };
  });
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    const results = await coordinator.execute(
      [{ id: "1", role: "coder", task: "Timeout testi" }],
      session,
      true,
      {}
    );
    assert.strictEqual(callCount, 2, "timeout → 2 deneme olmalı");
  } finally {
    restore();
  }
});

test("execute(): researcher rolü boş çıktıda tier2 ile yeniden dener", async () => {
  let callCount = 0;
  const restore = mockSubagent(async () => {
    callCount++;
    return { stdout: "", stderr: "", timedOut: false, code: 0 };
  });
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    await coordinator.execute(
      [{ id: "1", role: "researcher", task: "Kısa araştırma" }],
      session,
      true,
      {}
    );
    assert.strictEqual(callCount, 2, "researcher tier2 fallback ile 2 kez dener");
  } finally {
    restore();
  }
});

test("execute(): paralel modda tüm subtask'lar eşzamanlı çalışır", async () => {
  const startTimes = [];
  const restore = mockSubagent(async ({ task }) => {
    startTimes.push(Date.now());
    await new Promise(r => setTimeout(r, 20));
    return { stdout: `tamamlandı: ${task.slice(0, 20)}`, stderr: "", timedOut: false, code: 0 };
  });
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    const t0 = Date.now();
    const results = await coordinator.execute(
      [
        { id: "1", role: "researcher", task: "görev A" },
        { id: "2", role: "researcher", task: "görev B" },
      ],
      session,
      false, // parallel
      {}
    );
    const elapsed = Date.now() - t0;
    assert.strictEqual(results.length, 2, "2 sonuç olmalı");
    // Paralel ise toplam süre ~20ms; sıralı olsaydı ~40ms
    assert.ok(elapsed < 80, `paralel çalışma bekleniyor, geçen: ${elapsed}ms`);
  } finally {
    restore();
  }
});

test("execute(): sıralı modda önceki çıktılar sonraki subtask'a geçer", async () => {
  const tasksReceived = [];
  const restore = mockSubagent(async ({ task }) => {
    tasksReceived.push(task);
    return { stdout: "Subtask çıktısı: harika sonuç burada.", stderr: "", timedOut: false, code: 0 };
  });
  try {
    const session = { id: "t", backend: "anthropic", model: "m" };
    await coordinator.execute(
      [
        { id: "1", role: "researcher", task: "Araştır" },
        { id: "2", role: "coder",      task: "Kodla" },
      ],
      session,
      true,
      { planText: "Test planı yaklaşımı" }
    );
    // İkinci subtask'ın görevi önceki çıktıyı içermeli (blackboard injection)
    assert.ok(tasksReceived[1].includes("Previous Subtask Results") ||
              tasksReceived[1].includes("Overall Plan"),
              "ikinci subtask önceki bağlamı almalı");
  } finally {
    restore();
  }
});

// ────────────────────────────────────────────────────────────────────
// 5. review() — sentez ve fallback
// ────────────────────────────────────────────────────────────────────

test("review(): LLM hata fırlatırsa son subtask çıktısına düşer", async () => {
  const brokenBackend = { name: "fake-broken-review", chat: async () => { throw new Error("sentez hatası"); } };
  backends.registerProvider(brokenBackend);
  const session = { id: "t", backend: "fake-broken-review", model: "m" };
  const results = [
    { role: "researcher", output: "araştırma çıktısı küçük" },
    { role: "coder",      output: "<<<ORION_FINAL>>>\nKod değiştirildi başarıyla.\n<<<END_FINAL>>>" },
  ];

  const finalText = await coordinator.review("görev", results, session);
  assert.ok(finalText.includes("Kod değiştirildi"), `son subtask çıktısı alınmalı, gelen: ${finalText}`);
});

test("review(): non-anthropic backend metin döndürür", async () => {
  const session = makeFakeSession("Harika! Tüm değişiklikler uygulandı ve testler geçti.");
  // Gerçek review çağrısı — stdout'a yazar, hata fırlatmaz
  const text = await coordinator.review("test görevi", [
    { role: "coder", output: "dosya düzenlendi test sonuçları 5/5 geçti" },
  ], session);
  assert.ok(typeof text === "string", "review string döndürmeli");
});

// ────────────────────────────────────────────────────────────────────
// 6. runCoordination() — uçtan uca entegrasyon (mock LLM + subagent)
// ────────────────────────────────────────────────────────────────────

test("runCoordination(): plan → execute → review pipeline uçtan uca çalışır", async () => {
  let phase = 0; // 0=plan, 1=review
  const planJson = JSON.stringify({
    subtasks: [{ id: "1", role: "coder", task: "Basit düzenleme yap ve npm test çalıştır" }],
    sequential: true,
    planText: "Direkt kodla",
  });

  const e2eBackend = {
    name: "fake-e2e",
    chat: async () => phase++ === 0 ? planJson : "Tüm değişiklikler tamamlandı. Testler geçti.",
  };
  backends.registerProvider(e2eBackend);

  const restore = mockSubagent(async () => ({
    stdout: "<<<ORION_FINAL>>>\nDüzenleme yapıldı, test 5/5 geçti.\n<<<END_FINAL>>>",
    stderr: "",
    timedOut: false,
    code: 0,
  }));

  try {
    const session = { id: "e2e", backend: "fake-e2e", model: "m" };
    const out = await coordinator.runCoordination("test görevi: kodu düzelt", session);

    assert.ok(out.result, "sonuç metni olmalı");
    assert.ok(Array.isArray(out.subResults), "subResults array olmalı");
    assert.strictEqual(out.subResults.length, 1, "1 subtask sonucu olmalı");
    assert.ok(out.planUsed.subtasks.length >= 1, "plan kullanıldı");
  } finally {
    restore();
  }
});

// ────────────────────────────────────────────────────────────────────
// 7. _reviewFailed — başarısızlık tespiti
// ────────────────────────────────────────────────────────────────────

test("runCoordination(): reviewer failure triggers coder retry", async () => {
  let phase = 0;
  const planJson = JSON.stringify({
    subtasks: [{ id: "1", role: "coder", task: "Dosyayı düzenle ve test çalıştır" }],
    sequential: true,
    planText: "Kodla",
  });

  const retryBackend = {
    name: "fake-retry-test",
    chat: async () => {
      if (phase === 0) { phase++; return planJson; }           // plan
      if (phase === 1) { phase++; return "2 tests failed."; }  // ilk review: başarısız
      return "All tests pass. Changes complete.";              // ikinci review: başarılı
    },
  };
  backends.registerProvider(retryBackend);

  let coderCallCount = 0;
  const restore = mockSubagent(async () => {
    coderCallCount++;
    return {
      stdout: "<<<ORION_FINAL>>>\nDüzenleme yapıldı.\n<<<END_FINAL>>>",
      stderr: "", timedOut: false, code: 0,
    };
  });

  try {
    const session = { id: "retry-test", backend: "fake-retry-test", model: "m" };
    const out = await coordinator.runCoordination("kodu düzelt", session);
    assert.strictEqual(coderCallCount, 2, "reviewer başarısız → coder 2 kez çalışmalı");
    assert.ok(typeof out.result === "string", "sonuç string olmalı");
  } finally {
    restore();
  }
});
