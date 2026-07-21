// core/checkpoint.js — Her dosya yazımından önce otomatik snapshot
// @ts-nocheck
// Araç (write_file/edit_file) dosyaya dokunmadan hemen önce eski içeriği saklar;
// /checkpoint komutuyla listelenir ve geri alınır. Git gerektirmez, sıfır bağımlılık.
"use strict";
const fs     = require("fs");
const path   = require("path");
const os     = require("os");
const crypto = require("crypto");

const HOME       = process.env.ORION_HOME || os.homedir(); // test için geçersiz kılınabilir
const DIR        = path.join(HOME, ".orion", "checkpoints");
const INDEX      = path.join(DIR, "index.json");
const MAX_KEEP   = 200;          // en fazla bu kadar snapshot tutulur
const MAX_BYTES  = 2 * 1024 * 1024; // 2MB üstü dosyalar snapshot'lanmaz

function _ensure() { fs.mkdirSync(DIR, { recursive: true }); }

function _readIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX, "utf8")); } catch { return []; }
}

function _writeIndex(index) {
  const tmp = INDEX + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2));
  fs.renameSync(tmp, INDEX);
}

// Yazımdan ÖNCE çağrılır. Hata yazımı asla engellemez — sessizce geçilir.
function snapshot(filePath, tool = "?") {
  try {
    _ensure();
    const abs = path.resolve(filePath);
    const existed = fs.existsSync(abs);
    if (existed) {
      const st = fs.statSync(abs);
      if (!st.isFile() || st.size > MAX_BYTES) return null;
    }
    const id = crypto.randomBytes(4).toString("hex");
    if (existed) fs.copyFileSync(abs, path.join(DIR, `${id}.bak`));

    const index = _readIndex();
    index.push({ id, file: abs, existed, tool, ts: Date.now() });

    // Budama: en eskileri sil
    while (index.length > MAX_KEEP) {
      const old = index.shift();
      try { fs.unlinkSync(path.join(DIR, `${old.id}.bak`)); } catch {}
    }
    _writeIndex(index);
    return id;
  } catch { return null; }
}

function list(limit = 20) {
  return _readIndex().slice(-limit).reverse();
}

// Snapshot'ı geri yükle: dosya vardıysa eski içerik yazılır,
// dosya yoktuysa (yeni oluşturulmuştu) silinir.
function restore(id) {
  const index = _readIndex();
  const entry = index.find(e => e.id === id);
  if (!entry) return { ok: false, error: "checkpoint bulunamadı: " + id };
  try {
    if (entry.existed) {
      const bak = path.join(DIR, `${entry.id}.bak`);
      if (!fs.existsSync(bak)) return { ok: false, error: "yedek dosyası kayıp: " + id };
      fs.copyFileSync(bak, entry.file);
      return { ok: true, action: "restored", file: entry.file };
    }
    if (fs.existsSync(entry.file)) fs.unlinkSync(entry.file);
    return { ok: true, action: "deleted", file: entry.file };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Bir dosyanın en son snapshot kaydı (yoksa null)
function lastFor(filePath) {
  const abs = path.resolve(filePath);
  const index = _readIndex();
  for (let i = index.length - 1; i >= 0; i--) {
    if (index[i].file === abs) return index[i];
  }
  return null;
}

// Snapshot içeriğini oku — dosya yeni oluşturulmuşsa "" döner
function readSnapshot(id) {
  const entry = _readIndex().find(e => e.id === id);
  if (!entry) return null;
  if (!entry.existed) return "";
  try { return fs.readFileSync(path.join(DIR, `${entry.id}.bak`), "utf8"); }
  catch { return null; }
}

module.exports = { snapshot, list, restore, lastFor, readSnapshot, DIR };
