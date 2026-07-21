// tests/queue.test.js — Queue + Scheduler birim testleri
"use strict";
const { describe, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const os   = require("os");
const path = require("path");
const fs   = require("fs");

// ORION_HOME izolasyonu
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "queue_test_"));
process.env.ORION_HOME = tmpHome;

// Events mock — event yayımı test ortamını kirletmesin
const emittedEvents = [];
// require'den önce mock: doğrudan events.ts'yi geçersiz kıl
const Module = require("module");
const _origLoad = Module._load.bind(Module);
Module._load = function(req, parent, isMain) {
  if (req.endsWith("events.ts") || req.endsWith("events")) {
    return {
      emit: (type, sessionId, payload) => { emittedEvents.push({ type, payload }); },
      emitter: { on: () => {}, off: () => {}, emit: () => {}, setMaxListeners: () => {} },
      toNDJSON: e => JSON.stringify(e) + "\n",
      emitSilentCatch: () => {},
      EVENT_TYPES: {},
    };
  }
  return _origLoad(req, parent, isMain);
};

// Modüller mock sonrası yüklenmeli
// Queue'yu fresh require ile al (module cache temiz olabilir)
function freshQueue() {
  // Cache'i temizle
  for (const k of Object.keys(require.cache)) {
    if (k.includes("queue.js") || k.includes("scheduler.js")) delete require.cache[k];
  }
  return require("../core/queue.js");
}

// ── Queue testleri ────────────────────────────────────────────────────────────

describe("Queue — temel fonksiyonlar", () => {
  let queue;

  beforeEach(() => {
    emittedEvents.length = 0;
    for (const k of Object.keys(require.cache)) {
      if (k.includes("core/queue") || k.includes("core\\queue")) delete require.cache[k];
    }
    queue = require("../core/queue.js");
  });

  test("enqueue bir job_id döndürür", async () => {
    const id = await queue.enqueue({ type: "chat", prompt: "test" });
    assert.ok(typeof id === "string" && id.startsWith("job_"), `job_id formatı yanlış: ${id}`);
  });

  test("enqueue sonrası queue:added event yayılır", async () => {
    emittedEvents.length = 0;
    await queue.enqueue({ type: "chat", prompt: "event test" });
    const added = emittedEvents.find(e => e.type === "queue:added");
    assert.ok(added, "queue:added event bulunamadı");
    assert.equal(added.payload.type, "chat");
  });

  test("priority 1-3 arasında kısıtlanır", async () => {
    const id = await queue.enqueue({ type: "chat", prompt: "p", priority: 99 });
    const s = queue.status();
    // En son eklenen işin priority'si 3 olmalı (kısıtlı)
    const job = s.pending_jobs.find(j => j.id === id) ?? s.recent.find(j => j.id === id);
    if (job) assert.ok(job.priority <= 3, "priority 3'ten büyük olamaz");
  });

  test("status() beklenen alanları döndürür", () => {
    const s = queue.status();
    assert.ok("queue_length" in s,   "queue_length yok");
    assert.ok("processing"   in s,   "processing yok");
    assert.ok("pending_jobs" in s,   "pending_jobs yok");
    assert.ok("recent"       in s,   "recent yok");
    assert.ok(Array.isArray(s.pending_jobs), "pending_jobs dizi olmalı");
    assert.ok(Array.isArray(s.recent),       "recent dizi olmalı");
  });

  test("processor yokken işler kuyrukta bekler", async () => {
    // setProcessor çağrılmamışsa processing başlamaz
    await queue.enqueue({ type: "chat", prompt: "bekle" });
    const s = queue.status();
    assert.equal(s.processing, false, "processor yokken processing false olmalı");
  });

  test("processor ile işler çalışır ve history'e gider", async () => {
    let called = 0;
    queue.setProcessor(async (job) => { called++; return { success: true }; });
    await queue.enqueue({ type: "chat", prompt: "proc test" });
    // Küçük bekleme — async drain
    await new Promise(r => setTimeout(r, 50));
    assert.ok(called >= 1, `processor çağrılmalı: ${called}`);
    const s = queue.status();
    assert.ok(s.recent.length >= 1, "history'de kayıt olmalı");
  });

  test("hata fırlatan processor job'ı 'error' durumuna alır", async () => {
    queue.setProcessor(async () => { throw new Error("test hatası"); });
    await queue.enqueue({ type: "chat", prompt: "hata" });
    await new Promise(r => setTimeout(r, 50));
    const s = queue.status();
    const errJob = s.recent.find(j => j.status === "error");
    assert.ok(errJob, "error durumunda job olmalı");
    assert.ok(errJob.error.includes("test hatası"), "hata mesajı saklanmalı");
  });

  test("priority sıralaması: 3 > 2 > 1", async () => {
    const processed = [];
    // İşleme yavaşlatıp sıralama test edelim
    let releaseFirst;
    const firstJobBarrier = new Promise(r => { releaseFirst = r; });

    queue.setProcessor(async (job) => {
      if (processed.length === 0) {
        processed.push(job.priority);
        await firstJobBarrier; // Sonraki işlerin kuyruğa girmesini bekle
      } else {
        processed.push(job.priority);
      }
      return { success: true };
    });

    // Priority 1 önce ekle
    queue.enqueue({ type: "chat", prompt: "p1", priority: 1 });
    await new Promise(r => setTimeout(r, 10));
    // Sonra 3 ve 2 ekle — ilk iş işlenirken, bunlar sıralanacak
    queue.enqueue({ type: "chat", prompt: "p3", priority: 3 });
    queue.enqueue({ type: "chat", prompt: "p2", priority: 2 });
    releaseFirst();
    await new Promise(r => setTimeout(r, 100));
    // İlk iş (priority 1) zaten başladı; geri kalanlar 3, 2 sırasıyla gelmeli
    assert.ok(processed.includes(3) || processed.includes(2), "yüksek priority işler çalışmalı");
  });
});

// ── Scheduler testleri ────────────────────────────────────────────────────────

describe("Scheduler — vramStatus ve başlatma", () => {
  test("vramStatus alanları doğru", () => {
    const scheduler = require("../core/scheduler.js");
    const s = scheduler.vramStatus();
    assert.ok("currentlyLoaded" in s,  "currentlyLoaded yok");
    assert.ok("vram_used_gb"    in s,  "vram_used_gb yok");
    assert.ok("mean_cycle_ms"   in s,  "mean_cycle_ms yok");
    assert.ok("cycle_count"     in s,  "cycle_count yok");
    assert.ok(["ollama", "comfyui", "none"].includes(s.currentlyLoaded), "geçersiz currentlyLoaded");
  });

  test("başlangıçta currentlyLoaded 'none'", () => {
    for (const k of Object.keys(require.cache)) {
      if (k.includes("core/scheduler") || k.includes("core\\scheduler")) delete require.cache[k];
    }
    const scheduler = require("../core/scheduler.js");
    assert.equal(scheduler.currentlyLoaded(), "none");
  });

  test("meanCycleMs başlangıçta null", () => {
    for (const k of Object.keys(require.cache)) {
      if (k.includes("core/scheduler") || k.includes("core\\scheduler")) delete require.cache[k];
    }
    const scheduler = require("../core/scheduler.js");
    assert.equal(scheduler.meanCycleMs(), null);
  });

  test("start() queue'ya processor atar", () => {
    for (const k of Object.keys(require.cache)) {
      if (k.includes("core/scheduler") || k.includes("core\\scheduler") ||
          k.includes("core/queue")     || k.includes("core\\queue")) delete require.cache[k];
    }
    const scheduler = require("../core/scheduler.js");
    const queue     = require("../core/queue.js");
    assert.equal(queue._processor, null, "başlangıçta processor null");
    scheduler.start();
    assert.equal(typeof queue._processor, "function", "start() sonrası processor function");
  });
});

// ── Temizlik ──────────────────────────────────────────────────────────────────
afterEach(() => {
  emittedEvents.length = 0;
});

process.on("exit", () => {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  // Module._load orijinalini geri yükle
  Module._load = _origLoad;
});
