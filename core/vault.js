// core/vault.js — Orion Vault: konuşmaları HTML bilgi tabanına dönüştür
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const DEFAULT_VAULT = path.join(os.homedir(), ".orion", "vault");

// Graf HTML'i için statik JS — modül seviyesinde tanımlı, rebuildGraph'tan ayrı
// nodes/edges enjekte edilir; fizik motoru ve etkileşim kodu değişmez.
function _graphScript(nodes, edges) {
  return `
    const NODES = ${JSON.stringify(nodes)};
    const EDGES = ${JSON.stringify(edges)};
    const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), tip = document.getElementById('tip');
    let W, H;
    function resize(){ W = cv.width = innerWidth; H = cv.height = innerHeight - 44; }
    resize(); addEventListener('resize', resize);

    const byId = {};
    NODES.forEach((n,i) => {
      n.x = W/2 + Math.cos(i*2.399) * (80 + i*4);
      n.y = H/2 + Math.sin(i*2.399) * (60 + i*3);
      n.vx = 0; n.vy = 0; byId[n.id] = n;
    });
    const E = EDGES.map(([a,b]) => [byId[a], byId[b]]).filter(e => e[0] && e[1]);

    let dragging = null, hover = null;
    function tick(){
      for (let i=0;i<NODES.length;i++) for (let j=i+1;j<NODES.length;j++){
        const a=NODES[i], b=NODES[j];
        let dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy || 1;
        if (d2 < 40000){ const f=1200/d2; dx*=f; dy*=f; a.vx+=dx; a.vy+=dy; b.vx-=dx; b.vy-=dy; }
      }
      for (const [a,b] of E){
        const dx=b.x-a.x, dy=b.y-a.y, d=Math.sqrt(dx*dx+dy*dy)||1, f=(d-90)*0.004;
        a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f;
      }
      for (const n of NODES){
        n.vx += (W/2-n.x)*0.0008; n.vy += (H/2-n.y)*0.0008;
        if (n !== dragging){ n.x += n.vx *= 0.85; n.y += n.vy *= 0.85; }
      }
      draw();
      requestAnimationFrame(tick);
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle = 'rgba(120,130,150,0.25)';
      for (const [a,b] of E){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      for (const n of NODES){
        const r = n.kind==='tag' ? 6 : 9;
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,7);
        ctx.fillStyle = n===hover ? '#ffe082' : (n.kind==='tag' ? '#a78bfa' : '#60dcff');
        ctx.fill();
        if (n.kind==='tag'){ ctx.fillStyle='rgba(200,210,230,0.8)'; ctx.font='11px sans-serif'; ctx.fillText(n.label, n.x+9, n.y+4); }
      }
    }
    function nodeAt(x,y){ return NODES.find(n => (n.x-x)**2 + (n.y-y)**2 < 144); }
    cv.addEventListener('mousemove', e => {
      const x=e.clientX, y=e.clientY-44;
      if (dragging){ dragging.x=x; dragging.y=y; return; }
      hover = nodeAt(x,y);
      cv.style.cursor = hover ? 'pointer' : 'grab';
      if (hover){ tip.style.display='block'; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY+12)+'px'; tip.textContent=hover.label; }
      else tip.style.display='none';
    });
    cv.addEventListener('mousedown', e => { dragging = nodeAt(e.clientX, e.clientY-44); });
    addEventListener('mouseup', e => {
      if (dragging && hover===dragging && dragging.href) location.href = dragging.href;
      dragging = null;
    });
    tick();`;
}

// index.json için promise-chain mutex — read-modify-write yarış koşulunu önler
let _indexLock = Promise.resolve();
function _withIndexLock(fn) {
  const next = _indexLock.then(() => fn());
  _indexLock = next.catch(() => {}); // hata zinciri zehirlemesin
  return next;
}

function getVaultDir() {
  try {
    return require("./router.js").loadConfig().vaultDir ?? DEFAULT_VAULT;
  } catch { return DEFAULT_VAULT; }
}

function ensureVault(dir) {
  const d = dir ?? getVaultDir();
  for (const sub of ["", "sessions", "assets"]) {
    const p = path.join(d, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  // Stil dosyası yoksa gömülü varsayılanı yaz. (Eski kod var olmayan bir yola
  // — <molp>/../vault/assets — bakıyordu; stil hiç kopyalanmıyor, tüm vault
  // HTML'i stilsiz kalıyordu.)
  const srcCss = path.join(d, "assets", "style.css");
  if (!fs.existsSync(srcCss)) {
    try { fs.writeFileSync(srcCss, _BUILTIN_CSS); } catch {}
  }
  return d;
}

const _BUILTIN_CSS = `:root{--bg:#0b0e14;--fg:#c9d1d9;--muted:#8b949e;--accent:#60dcff;--tag:#a78bfa;--card:#111722;--border:#2d3650}
*{box-sizing:border-box}
body{margin:0;padding:24px;max-width:900px;margin:0 auto;background:var(--bg);color:var(--fg);
  font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
nav{margin-bottom:16px;font-size:14px}
h1{font-size:24px;margin:8px 0}h2{font-size:16px;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:4px;margin-top:28px}
.meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin-bottom:12px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.tag{background:var(--card);color:var(--tag);border:1px solid var(--border);border-radius:999px;padding:2px 10px;font-size:12px}
pre{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px;overflow-x:auto}
code{font-family:ui-monospace,Consolas,monospace;font-size:13px}
ul{padding-left:20px}li{margin:4px 0}
.vault-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px}
.vault-title{font-size:22px;font-weight:600}.vault-count{color:var(--muted);font-size:13px}
#search-box{width:100%;padding:10px 14px;background:var(--card);border:1px solid var(--border);
  border-radius:8px;color:var(--fg);font-size:14px;margin-bottom:20px}
.cards{display:grid;gap:12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;transition:border-color .15s}
.card:hover{border-color:var(--accent)}.card a{display:block;padding:14px}
.card-date{color:var(--muted);font-size:12px;margin-bottom:6px}
.card-summary{font-size:15px;color:var(--fg);margin-bottom:8px}
.card.hidden{display:none}
`;

function _esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// knowledge = {summary, decisions[], codePatterns[], bugsFixes[], concepts[], tags[]}
function sessionToHTML(sessionId, data, knowledge) {
  const date    = new Date(data.updatedAt ?? Date.now()).toISOString().slice(0, 10);
  const model   = _esc(data.model   ?? "unknown");
  const backend = _esc(data.backend ?? "unknown");
  const turns   = data.messages?.length ?? 0;
  const summary = _esc(knowledge.summary ?? "");
  const tags    = (knowledge.tags ?? []).map(t => `<span class="tag">${_esc(t)}</span>`).join("");

  const listItems = (arr) => (arr ?? []).map(x => `<li>${_esc(x)}</li>`).join("\n      ");

  const codeSection = (knowledge.codePatterns ?? []).length > 0
    ? `<section id="code">
      <h2>Kod Kalıpları</h2>
      ${(knowledge.codePatterns).map(p => `<pre><code>${_esc(p)}</code></pre>`).join("\n      ")}
    </section>` : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="orion-session-id" content="${_esc(sessionId)}">
  <meta name="orion-date" content="${date}">
  <meta name="orion-model" content="${model}">
  <meta name="orion-backend" content="${backend}">
  <meta name="orion-turns" content="${turns}">
  <meta name="orion-tags" content="${_esc((knowledge.tags ?? []).join(","))}">
  <title>${date} — ${summary.slice(0, 60)}</title>
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <nav><a href="../index.html">← Vault</a></nav>
  <h1>${summary || sessionId}</h1>
  <div class="meta">
    <span>${date}</span>
    <span>${backend} / ${model}</span>
    <span>${turns} mesaj</span>
    <span>${_esc(sessionId)}</span>
  </div>
  <div class="tags">${tags}</div>

  <section id="decisions">
    <h2>Kararlar</h2>
    <ul>${listItems(knowledge.decisions)}</ul>
  </section>

  ${codeSection}

  <section id="bugs">
    <h2>Düzeltilen Hatalar</h2>
    <ul>${listItems(knowledge.bugsFixes)}</ul>
  </section>

  <section id="concepts">
    <h2>Kavramlar</h2>
    <ul>${listItems(knowledge.concepts)}</ul>
  </section>
</body>
</html>`;
}

// Vault index'ine kaydet + HTML dosyası yaz + vectors güncelle + index.html rebuild
async function writeSession(sessionId, data, knowledge) {
  const vaultDir = getVaultDir();
  ensureVault(vaultDir);

  const date    = new Date(data.updatedAt ?? Date.now()).toISOString().slice(0, 10);
  const slug    = (knowledge.summary ?? sessionId).slice(0, 40).replace(/[^\wÀ-ɏ\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  // sessionId dosya adına gömülür — yol ayracı/traversal ("../", "a/b") dosyayı
  // sessions/ dışına taşır ya da yazmayı çökertir. Sadece güvenli karakterlere indir.
  const safeSid = String(sessionId).replace(/[^\w.-]/g, "_").slice(0, 80) || "session";
  const fname   = `${date}_${safeSid}_${slug || "session"}.html`;
  const htmlPath = path.join(vaultDir, "sessions", fname);

  // HTML yaz
  fs.writeFileSync(htmlPath, sessionToHTML(sessionId, data, knowledge));

  // index.json — atomic write (mutex ile yarış koşulu önlenir)
  const indexPath = path.join(vaultDir, "index.json");
  await _withIndexLock(() => {
    const tmpPath = indexPath + ".tmp";
    let index = [];
    try { index = JSON.parse(fs.readFileSync(indexPath, "utf8")); } catch {}
    index = index.filter(e => e.id !== sessionId); // duplicate önle
    index.push({
      id:         sessionId,
      date,
      file:       fname,
      summary:    knowledge.summary ?? "",
      tags:       knowledge.tags ?? [],
      turns:      data.messages?.length ?? 0,
      model:      data.model ?? "",
      backend:    data.backend ?? "",
      createdAt:  Date.now(),
      activation: 1.0,   // Hebbian: 1.0 başlangıç, erişimde artar, zamanla azalır
      accessedAt: null,
    });
    fs.writeFileSync(tmpPath, JSON.stringify(index, null, 2));
    fs.renameSync(tmpPath, indexPath);
  });

  // vectors.json — summary embedding ekle
  try {
    const embed = require("./embed.js");
    if (await embed.isAvailable()) {
      const vec = await embed.embedText(knowledge.summary ?? sessionId);
      if (vec) {
        const vPath  = path.join(vaultDir, "vectors.json");
        const vTmp   = vPath + ".tmp";
        let vecs = [];
        try { vecs = JSON.parse(fs.readFileSync(vPath, "utf8")); } catch {}
        vecs = vecs.filter(v => v.id !== sessionId);
        vecs.push({ id: sessionId, vector: Array.from(vec), model: "nomic-embed-text", embeddedAt: Date.now() });
        fs.writeFileSync(vTmp, JSON.stringify(vecs));
        fs.renameSync(vTmp, vPath);
      }
    }
  } catch (err) {
    // Vektör yazılamadı → oturum vault'a "başarıyla" girer ama semantik aramada
    // görünmez olur. Yazma akışını bozmadan olay kanalına düş.
    require("./events.js").emitSilentCatch("vault.js:writeSession", err, sessionId, "vectors");
  }

  // index.html + graph.html yeniden oluştur
  await rebuildIndex(vaultDir);
  try { rebuildGraph(vaultDir); }
  catch (err) {
    // graph.html sessizce bayat kalır — kullanıcıya sunulan bir görünüm; olayla bildir.
    require("./events.js").emitSilentCatch("vault.js:writeSession", err, sessionId, "rebuildGraph");
  }

  return { file: fname, id: sessionId };
}

// Semantik vault araması + Hebbian aktivasyon: erişilen kayıtları güçlendir
async function searchVault(queryText, limit = 5) {
  const vaultDir = getVaultDir();
  const vPath = path.join(vaultDir, "vectors.json");
  const iPath = path.join(vaultDir, "index.json");
  let vecs = [], index = [];
  try { vecs  = JSON.parse(fs.readFileSync(vPath, "utf8")); } catch {}
  try { index = JSON.parse(fs.readFileSync(iPath, "utf8")); } catch {}
  if (!index.length) return [];
  // Embedding yoksa (Ollama/nomic kurulu değil ya da vectors.json hiç üretilmedi)
  // semantik arama imkânsız — sessizce boş dönmek yerine anahtar-kelime yedeğine düş.
  if (!vecs.length) return _keywordSearch(index, queryText, limit);

  try {
    const embed = require("./embed.js");
    const qVec = await embed.embedText(queryText);
    if (!qVec) return _keywordSearch(index, queryText, limit);

    // Aktivasyon ağırlıklı skor: cosine * sqrt(activation)
    const rawRanked = embed.topK(qVec, vecs, limit * 3);
    const hebbianRanked = rawRanked
      .map(r => {
        const entry = index.find(e => e.id === r.id);
        const act   = entry?.activation ?? 1.0;
        return { ...r, score: r.score * Math.sqrt(Math.max(0.1, act)) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const idSet  = new Set(hebbianRanked.map(r => r.id));
    const result = index
      .filter(e => idSet.has(e.id))
      .map(e => ({ ...e, score: hebbianRanked.find(r => r.id === e.id)?.score ?? 0 }))
      .sort((a, b) => b.score - a.score);

    // Erişilen kayıtların aktivasyonunu artır (Hebbian: kullanılan bağlantı güçlenir)
    _bumpActivations(result.map(e => e.id), vaultDir, iPath);

    return result;
  } catch (err) {
    // Embedding araması hatayla düştü — anahtar-kelime yedeği sonuç döndürse de
    // semantik yolun kaybını gizler; olayla ayırt edilir kıl, sonra yedeğe in.
    require("./events.js").emitSilentCatch("vault.js:searchVault", err, null, "keyword-fallback");
    return _keywordSearch(index, queryText, limit);
  }
}

// Embedding yokken devreye giren yedek arama: summary + tags üzerinde
// terim eşleşmesi say, normalize et [0,1], en çok eşleşenleri döndür.
// Eşleşme yoksa boş dizi — recentEntries() son çaresi kaldırıldı; alakasız
// kayıtların context'e sızması (kimlik/yetenek soruları dahil) bunu tetikliyordu.
function _keywordSearch(index, queryText, limit = 5) {
  const terms = String(queryText).toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  const scored = index.map(e => {
    const hay = `${e.summary ?? ""} ${(e.tags ?? []).join(" ")}`.toLowerCase();
    const hits = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    // normalize: eşleşen term sayısı / toplam term sayısı → [0, 1]
    const score = hits / terms.length;
    return { ...e, score };
  }).filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score || (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, limit);
  return scored;
}

// Aktivasyon artır: +0.3, max 5.0 (mutex ile index.json yarışı önlenir)
function _bumpActivations(ids, vaultDir, iPath) {
  _withIndexLock(() => {
    try {
      const tmpPath = iPath + ".tmp";
      let index = JSON.parse(fs.readFileSync(iPath, "utf8"));
      let changed = false;
      for (const entry of index) {
        if (ids.includes(entry.id)) {
          entry.activation = Math.min(5.0, (entry.activation ?? 1.0) + 0.3);
          entry.accessedAt = Date.now();
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(tmpPath, JSON.stringify(index, null, 2));
        fs.renameSync(tmpPath, iPath);
      }
    } catch {}
  }).catch(() => {});
}

// Hebbian decay: boşta çalışırken aktivasyonları hafifçe düşür (daemon çağırır)
// weeklyDecay = 0.92 → ~8 haftada yarıya iner (0.92^8 ≈ 0.51)
function decayActivations(weeklyDecay = 0.92) {
  const vaultDir = getVaultDir();
  const iPath    = path.join(vaultDir, "index.json");
  return _withIndexLock(() => {
    try {
      const tmpPath = iPath + ".tmp";
      let index = JSON.parse(fs.readFileSync(iPath, "utf8"));
      for (const entry of index) {
        if ((entry.activation ?? 1.0) > 0.5) {
          entry.activation = +(((entry.activation ?? 1.0) * weeklyDecay).toFixed(4));
        }
      }
      fs.writeFileSync(tmpPath, JSON.stringify(index, null, 2));
      fs.renameSync(tmpPath, iPath);
    } catch {}
  });
}

function recentEntries(limit = 10) {
  const vaultDir = getVaultDir();
  try {
    const index = JSON.parse(fs.readFileSync(path.join(vaultDir, "index.json"), "utf8"));
    return [...index].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  } catch { return []; }
}

function readEntry(sessionId) {
  const vaultDir = getVaultDir();
  try {
    const index = JSON.parse(fs.readFileSync(path.join(vaultDir, "index.json"), "utf8"));
    const entry = index.find(e => e.id === sessionId);
    if (!entry) return null;
    // Path traversal koruması: sadece basename kullan, sessions/ dışına çıkamaz
    const safeFile = path.basename(entry.file);
    if (!safeFile.endsWith(".html")) return null;
    const raw = fs.readFileSync(path.join(vaultDir, "sessions", safeFile), "utf8");
    // HTML tag'larını sıyır
    return raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s{2,}/g, "\n")
              .trim();
  } catch { return null; }
}

// Tüm session'ları tarayıp index.html oluştur
async function rebuildIndex(vaultDir) {
  const dir   = vaultDir ?? getVaultDir();
  const iPath = path.join(dir, "index.json");
  let index = [];
  try { index = JSON.parse(fs.readFileSync(iPath, "utf8")); } catch {}

  const sorted = [...index].sort((a, b) => b.createdAt - a.createdAt);

  const cards = sorted.map(e => {
    const tagHtml = (e.tags ?? []).map(t => `<span class="tag">${_esc(t)}</span>`).join("");
    return `  <div class="card" data-tags="${_esc((e.tags ?? []).join(" "))}" data-text="${_esc(e.summary)}">
    <a href="sessions/${_esc(e.file)}">
      <div class="card-date">${_esc(e.date)} · ${_esc(e.backend)} / ${_esc(e.model)} · ${e.turns} tur</div>
      <div class="card-summary">${_esc(e.summary || e.id)}</div>
      <div class="tags">${tagHtml}</div>
    </a>
  </div>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Orion Vault</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div class="vault-header">
    <div class="vault-title">⬡ Orion Vault</div>
    <div class="vault-count">${index.length} oturum · <a href="graph.html">graf görünümü</a></div>
  </div>
  <input id="search-box" type="text" placeholder="Oturumlarda ara..." autocomplete="off">
  <div id="cards" class="cards">
${cards}
  </div>
  <script>
    const box = document.getElementById('search-box');
    box.addEventListener('input', () => {
      const q = box.value.toLowerCase();
      document.querySelectorAll('.card').forEach(c => {
        const hay = (c.dataset.text + ' ' + c.dataset.tags).toLowerCase();
        c.classList.toggle('hidden', q.length > 1 && !hay.includes(q));
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(dir, "index.html"), html);
}

// Etiket–oturum düğüm grafiği: graph.html (tek dosya, bağımlılıksız canvas)
function rebuildGraph(vaultDir) {
  const dir   = vaultDir ?? getVaultDir();
  const iPath = path.join(dir, "index.json");
  let index = [];
  try { index = JSON.parse(fs.readFileSync(iPath, "utf8")); } catch {}

  const nodes = [];
  const edges = [];
  const tagId = new Map();
  for (const e of index) {
    nodes.push({ id: "s:" + e.id, label: (e.summary || e.id).slice(0, 40), kind: "session", href: "sessions/" + e.file });
    for (const t of e.tags ?? []) {
      if (!tagId.has(t)) { tagId.set(t, "t:" + t); nodes.push({ id: "t:" + t, label: t, kind: "tag" }); }
      edges.push(["s:" + e.id, tagId.get(t)]);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Orion Vault — Graf</title>
  <style>
    body { margin:0; background:#0b0e14; color:#c9d1d9; font-family:system-ui,sans-serif; }
    #bar { padding:10px 16px; font-size:14px; }
    #bar a { color:#60dcff; text-decoration:none; }
    canvas { display:block; cursor:grab; }
    #tip { position:fixed; pointer-events:none; background:#1c2333; border:1px solid #2d3650;
           padding:4px 8px; border-radius:4px; font-size:12px; display:none; }
  </style>
</head>
<body>
  <div id="bar"><a href="index.html">← Vault</a> · ${index.length} oturum · ${tagId.size} etiket — düğüme tıkla: oturumu aç</div>
  <div id="tip"></div>
  <canvas id="cv"></canvas>
  <script>${_graphScript(nodes, edges)}</script>
</body>
</html>`;

  fs.writeFileSync(path.join(dir, "graph.html"), html);
  return path.join(dir, "graph.html");
}

// ─── Lovelace digest ───────────────────────────────────────────────────────────

function getDigestDir() { return path.join(getVaultDir(), "digests"); }

function writeDigest(content) {
  const dir = getDigestDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `${date}.md`);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

function readLatestDigest() {
  const dir = getDigestDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort().reverse();
  if (!files.length) return null;
  const file = path.join(dir, files[0]);
  return { date: files[0].replace(".md", ""), content: fs.readFileSync(file, "utf8"), file };
}

function shouldRunDigest() {
  const dir = getDigestDir();
  if (!fs.existsSync(dir)) return true;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort().reverse();
  if (!files.length) return true;
  const daysSince = (Date.now() - new Date(files[0].replace(".md", "")).getTime()) / 86_400_000;
  return daysSince >= 7;
}

module.exports = {
  ensureVault, sessionToHTML, writeSession,
  searchVault, recentEntries, readEntry, rebuildIndex, rebuildGraph,
  getVaultDir, writeDigest, readLatestDigest, shouldRunDigest, decayActivations,
};
