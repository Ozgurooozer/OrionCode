// core/vaultmap.js — Vault kavram haritası: k-means + PCA + SVG
// Mevcut vectors.json + index.json'dan küme haritası üretir.
"use strict";

const fs   = require("fs");
const path = require("path");

// ─── k-means kümeleme ─────────────────────────────────────────────────────────

function euclidSq(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return s;
}

function kMeans(vectors, k, iters = 25) {
  const n = vectors.length;
  if (n <= k) return vectors.map((_, i) => i % k);

  // K-means++ başlatma
  const centroids = [vectors[Math.floor(Math.random() * n)]];
  while (centroids.length < k) {
    const dists = vectors.map(v => Math.min(...centroids.map(c => euclidSq(v, c))));
    const total = dists.reduce((s, x) => s + x, 0);
    let r = Math.random() * total;
    for (let i = 0; i < n; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push(vectors[i]); break; }
    }
    if (centroids.length < k) centroids.push(vectors[Math.floor(Math.random() * n)]);
  }

  let labels = new Array(n).fill(0);
  for (let iter = 0; iter < iters; iter++) {
    // Atama
    const newLabels = vectors.map(v => {
      let best = 0, bestD = Infinity;
      for (let ci = 0; ci < k; ci++) {
        const d = euclidSq(v, centroids[ci]);
        if (d < bestD) { bestD = d; best = ci; }
      }
      return best;
    });
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
    // Merkez güncelle
    for (let ci = 0; ci < k; ci++) {
      const mem = vectors.filter((_, i) => labels[i] === ci);
      if (!mem.length) continue;
      const d = mem[0].length;
      centroids[ci] = Array.from({ length: d }, (_, j) => mem.reduce((s, v) => s + v[j], 0) / mem.length);
    }
  }
  return labels;
}

// ─── PCA 2D (güç iterasyonu) ─────────────────────────────────────────────────

function pca2d(vectors, iters = 20) {
  if (vectors.length < 2) return vectors.map(() => [0, 0]);
  const n = vectors.length, d = vectors[0].length;

  // Ortalama çıkar
  const mean = new Array(d).fill(0);
  for (const v of vectors) for (let j = 0; j < d; j++) mean[j] += v[j] / n;
  const X = vectors.map(v => v.map((x, j) => x - mean[j]));

  function powerStep(X, deflate) {
    let v = Array.from({ length: d }, () => Math.random() - 0.5);
    for (let it = 0; it < iters; it++) {
      // Av = X^T (X v)
      const Xv = X.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
      let Av   = new Array(d).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) Av[j] += X[i][j] * Xv[i];
      // Deflation
      for (const u of deflate) {
        const dot = Av.reduce((s, x, j) => s + x * u[j], 0);
        for (let j = 0; j < d; j++) Av[j] -= dot * u[j];
      }
      const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) break;
      v = Av.map(x => x / norm);
    }
    return v;
  }

  const pc1 = powerStep(X, []);
  const pc2 = powerStep(X, [pc1]);

  return X.map(row => [
    row.reduce((s, x, j) => s + x * pc1[j], 0),
    row.reduce((s, x, j) => s + x * pc2[j], 0),
  ]);
}

// ─── Küme adlandırma (yerel model) ───────────────────────────────────────────

async function nameCluster(summaries, model) {
  try {
    const { ollamaRequest } = require("./extract.js");
    const text = summaries.slice(0, 4).join("\n");
    const prompt = `Bu AI oturumlarının ortak konusu nedir? 2-4 kelimelik başlık yaz, sadece başlık:\n${text}`;
    const raw = await ollamaRequest(model, prompt, { timeout: 15000 });
    return (raw ?? "").trim().slice(0, 40) || "Küme";
  } catch { return "Küme"; }
}

// ─── SVG harita HTML ─────────────────────────────────────────────────────────

const CLUSTER_COLORS = [
  "#7c6af7", "#34d399", "#f59e0b", "#60a5fa",
  "#f472b6", "#fb923c", "#a78bfa", "#4ade80",
];

function buildSVG(points, clusterNames) {
  const W = 760, H = 520, PAD = 50;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

  const sx = p => PAD + ((p.x - minX) / rangeX) * (W - 2 * PAD);
  const sy = p => PAD + ((p.y - minY) / rangeY) * (H - 2 * PAD);

  const dots = points.map((p, i) => {
    const cx = sx(p).toFixed(1), cy = sy(p).toFixed(1);
    const color = CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];
    const label = (p.summary ?? "").slice(0, 60).replace(/[<>&"]/g, c =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
    return `<circle cx="${cx}" cy="${cy}" r="7" fill="${color}" opacity="0.85"
      stroke="#1a1a2e" stroke-width="1.5" data-cluster="${p.cluster}"
      data-id="${p.id}" data-label="${label}">
      <title>${label}</title>
    </circle>`;
  }).join("\n");

  // Küme etiketleri: her kümenin centroid'i
  const clusterLabels = clusterNames.map((name, ci) => {
    const members = points.filter(p => p.cluster === ci);
    if (!members.length) return "";
    const mx = members.reduce((s, p) => s + sx(p), 0) / members.length;
    const my = members.reduce((s, p) => s + sy(p), 0) / members.length;
    const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length];
    return `<text x="${mx.toFixed(1)}" y="${(my - 14).toFixed(1)}" text-anchor="middle"
      fill="${color}" font-size="11" font-family="monospace" opacity="0.9">${name}</text>`;
  }).join("\n");

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;max-width:${W}px;background:#0d0d1a;border-radius:8px">
  ${clusterLabels}
  ${dots}
</svg>`;
}

// ─── Ana build fonksiyonu ─────────────────────────────────────────────────────

async function buildMap(vaultDir) {
  const vPath = path.join(vaultDir, "vectors.json");
  const iPath = path.join(vaultDir, "index.json");

  let vecs = [], index = [];
  try { vecs  = JSON.parse(fs.readFileSync(vPath, "utf8")); } catch {}
  try { index = JSON.parse(fs.readFileSync(iPath, "utf8")); } catch {}

  if (vecs.length < 3) return null; // yeterli veri yok

  const { loadConfig } = require("./router.ts");
  const model = loadConfig().tier1Model ?? "qwen2.5-coder:7b";

  // Ortak oturum bilgilerini birleştir
  const joined = vecs
    .map(v => {
      const entry = index.find(e => e.id === v.id);
      return entry ? { id: v.id, vector: v.vector, summary: entry.summary, tags: entry.tags ?? [], date: entry.date } : null;
    })
    .filter(Boolean);

  if (joined.length < 3) return null;

  // Küme sayısı: sqrt(n/2) sınırlı 2-8
  const k = Math.max(2, Math.min(8, Math.ceil(Math.sqrt(joined.length / 2))));

  // PCA 2D
  const coords = pca2d(joined.map(j => j.vector));
  const labels  = kMeans(joined.map(j => j.vector), k);

  // Küme adlarını bul (paralel değil — Ollama serialize)
  const clusterGroups = Array.from({ length: k }, (_, ci) =>
    joined.filter((_, i) => labels[i] === ci).map(j => j.summary)
  );
  const clusterNames = [];
  for (const grp of clusterGroups) {
    clusterNames.push(await nameCluster(grp, model));
  }

  const points = joined.map((j, i) => ({
    id: j.id, summary: j.summary, cluster: labels[i],
    x: coords[i][0], y: coords[i][1], date: j.date, tags: j.tags,
  }));

  const svgEl = buildSVG(points, clusterNames);

  // Lejant
  const legendItems = clusterNames.map((name, ci) => {
    const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length];
    const count = points.filter(p => p.cluster === ci).length;
    return `<li><span style="color:${color}">■</span> ${name} <span style="color:#555">(${count})</span></li>`;
  }).join("\n");

  // Oturum listesi (hover tooltips için veri)
  const sessionData = JSON.stringify(
    points.map(p => ({ id: p.id, cluster: p.cluster, summary: p.summary, date: p.date }))
  );

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Vault Kavram Haritası</title>
<style>
  body { background:#0d0d1a; color:#c9c9e0; font-family:monospace; margin:0; padding:24px; }
  h1 { color:#7c6af7; font-size:1.1rem; margin:0 0 16px }
  .wrap { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
  .map-col { flex:1; min-width:300px; }
  .legend { min-width:180px; }
  ul { list-style:none; padding:0; margin:0; }
  li { margin:6px 0; font-size:0.85rem; }
  #tooltip { position:fixed; background:#1a1a2e; border:1px solid #333; padding:8px 12px;
    border-radius:6px; font-size:0.8rem; color:#c9c9e0; pointer-events:none;
    display:none; max-width:280px; line-height:1.4; }
  nav a { color:#7c6af7; text-decoration:none; font-size:0.8rem; }
</style>
</head>
<body>
<nav><a href="index.html">← Vault</a></nav>
<h1>Kavram Haritası — ${joined.length} oturum, ${k} küme</h1>
<div class="wrap">
  <div class="map-col">${svgEl}</div>
  <div class="legend">
    <p style="margin:0 0 10px;font-size:0.8rem;color:#555">Kümeler</p>
    <ul>${legendItems}</ul>
  </div>
</div>
<div id="tooltip"></div>
<script>
const data = ${sessionData};
const tip = document.getElementById('tooltip');
document.querySelectorAll('circle').forEach(el => {
  el.style.cursor = 'pointer';
  el.addEventListener('mouseenter', e => {
    const d = data.find(x => x.id === el.dataset.id);
    if (!d) return;
    tip.innerHTML = '<b>' + d.date + '</b><br>' + d.summary;
    tip.style.display = 'block';
  });
  el.addEventListener('mousemove', e => {
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY - 8)  + 'px';
  });
  el.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  el.addEventListener('click', () => {
    const id = el.dataset.id;
    if (id) window.open('sessions/' + id + '.html', '_blank');
  });
});
</script>
</body>
</html>`;

  const outPath = path.join(vaultDir, "map.html");
  fs.writeFileSync(outPath, html, "utf8");
  return { path: outPath, clusters: k, sessions: joined.length };
}

module.exports = { buildMap, kMeans, pca2d };
