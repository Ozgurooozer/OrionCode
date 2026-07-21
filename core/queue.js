// core/queue.js — görev kuyruğu (FIFO + priority), singleton
"use strict";

const { emit } = require("./events.ts");

let _idSeq = 0;
function _nextId() { return `job_${Date.now()}_${++_idSeq}`; }

class Queue {
  constructor() {
    this._jobs      = [];
    this._processing = false;
    this._processor  = null; // scheduler.setProcessor() ile atanır
    this._history    = [];   // son 50 tamamlanan iş
  }

  /** Scheduler tarafından çağrılır — kuyruktan işi alan fonksiyon */
  setProcessor(fn) { this._processor = fn; }

  /**
   * Kuyruğa iş ekle.
   * @param {{ type: string, skill?: string, prompt?: string, opts?: object, priority?: number }} job
   * @returns {string} job_id
   */
  async enqueue(job) {
    const entry = {
      id:         _nextId(),
      type:       job.type ?? "chat",
      skill:      job.skill   ?? null,
      prompt:     job.prompt  ?? "",
      opts:       job.opts    ?? {},
      priority:   Math.min(3, Math.max(1, job.priority ?? 1)),
      queued_at:  Date.now(),
      status:     "queued",
    };
    this._jobs.push(entry);
    emit("queue:added", null, {
      job_id:       entry.id,
      type:         entry.type,
      skill:        entry.skill,
      priority:     entry.priority,
      queue_length: this._jobs.length,
    });
    this._tryProcess();
    return entry.id;
  }

  /** En yüksek öncelikli, en erken eklenmiş işi çıkar */
  dequeue() {
    if (!this._jobs.length) return null;
    this._jobs.sort((a, b) => b.priority - a.priority || a.queued_at - b.queued_at);
    return this._jobs.shift();
  }

  /** Kuyruk ve işlem durumu */
  status() {
    return {
      queue_length: this._jobs.length,
      processing:   this._processing,
      pending_jobs: this._jobs.map(j => ({ id: j.id, type: j.type, skill: j.skill, priority: j.priority })),
      recent:       this._history.slice(-10),
    };
  }

  /** İç drain döngüsü */
  async _tryProcess() {
    if (this._processing || !this._processor) return;
    this._processing = true;
    emit("queue:status", null, { processing: true, queue_length: this._jobs.length });

    while (this._jobs.length > 0) {
      const job = this.dequeue();
      if (!job) break;
      job.status      = "running";
      job.started_at  = Date.now();
      try {
        const result = await this._processor(job);
        job.status   = "done";
        job.result   = result ?? null;
      } catch (e) {
        job.status = "error";
        job.error  = e instanceof Error ? e.message : String(e);
        emit("queue:job_error", null, { job_id: job.id, error: job.error });
      } finally {
        job.finished_at = Date.now();
        this._history.push({ ...job });
        if (this._history.length > 50) this._history.shift();
      }
    }

    this._processing = false;
    emit("queue:status", null, { processing: false, queue_length: 0 });
  }
}

module.exports = new Queue();
