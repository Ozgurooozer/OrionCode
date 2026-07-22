"use strict";

const ORION = {
  stars: [
    { id: "betelgeuse", label: "Betelgeuse", nx: 0.12, ny: 0.15, color: [251, 191, 36] },
    { id: "bellatrix",  label: "Bellatrix",  nx: 0.72, ny: 0.12, color: [148, 163, 184] },
    { id: "alnitak",    label: "Alnitak",    nx: 0.25, ny: 0.45, color: [167, 139, 250] },
    { id: "alnilam",    label: "Alnilam",    nx: 0.40, ny: 0.45, color: [167, 139, 250] },
    { id: "mintaka",    label: "Mintaka",    nx: 0.58, ny: 0.45, color: [167, 139, 250] },
    { id: "saiph",      label: "Saiph",      nx: 0.22, ny: 0.82, color: [129, 140, 248] },
    { id: "rigel",      label: "Rigel",      nx: 0.75, ny: 0.85, color: [96, 165, 250] },
    { id: "meissa",     label: "Meissa",     nx: 0.42, ny: 0.05, color: [148, 163, 184] },
  ],
  connections: [
    ["betelgeuse", "bellatrix"],
    ["betelgeuse", "alnitak"],
    ["alnitak", "alnilam"],
    ["alnilam", "mintaka"],
    ["mintaka", "bellatrix"],
    ["betelgeuse", "meissa"],
    ["meissa", "bellatrix"],
    ["alnitak", "saiph"],
    ["mintaka", "rigel"],
    ["saiph", "rigel"],
  ],
};

function mapCoords(nx, ny, width, height, marginX, marginY) {
  const cw = width - marginX * 2;
  const ch = height - marginY * 2;
  return {
    x: marginX + Math.round(nx * cw),
    y: marginY + Math.round(ny * ch),
  };
}

function generateOrionStars(width, height) {
  const marginX = Math.floor(width * 0.08);
  const marginY = Math.floor(height * 0.08);
  return ORION.stars.map(s => {
    const { x, y } = mapCoords(s.nx, s.ny, width, height, marginX, marginY);
    return { ...s, x, y, baseColor: s.color };
  });
}

function getLinePoints(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  while (true) {
    pts.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return pts;
}

function computeConstellationFrames(stars, totalFrames) {
  const conn = ORION.connections;
  const adjCount = {};
  for (const s of stars) adjCount[s.id] = 0;
  for (const [a, b] of conn) { adjCount[a]++; adjCount[b]++; }

  const connPoints = conn.map(([a, b]) => {
    const sA = stars.find(s => s.id === a);
    const sB = stars.find(s => s.id === b);
    return getLinePoints(sA.x, sA.y, sB.x, sB.y);
  });

  const totalPoints = connPoints.reduce((sum, pts) => sum + pts.length, 0);

  const frames = [];
  const revealedStars = new Set();
  const starOrder = [...stars].sort((a, b) => adjCount[b.id] - adjCount[a.id]);

  for (let f = 0; f < starOrder.length; f++) {
    revealedStars.add(starOrder[f].id);
    frames.push({ revealedStars: new Set(revealedStars), revealedConns: connPoints.map(() => 0) });
  }

  const connFrames = totalFrames - starOrder.length;
  if (connFrames <= 0) {
    frames.push({ revealedStars: new Set(revealedStars), revealedConns: connPoints.map(p => p.length) });
    return { frames, connPoints };
  }

  const revealedCounts = connPoints.map(() => 0);
  let remaining = totalPoints;
  for (let f = 0; f < connFrames; f++) {
    const ptsThisFrame = Math.max(1, Math.floor(remaining / (connFrames - f)));
    let allocated = 0;
    while (allocated < ptsThisFrame) {
      let progressed = false;
      for (let i = 0; i < connPoints.length && allocated < ptsThisFrame; i++) {
        if (revealedCounts[i] < connPoints[i].length) {
          revealedCounts[i]++;
          allocated++;
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    remaining -= allocated;
    frames.push({ revealedStars: new Set(revealedStars), revealedConns: [...revealedCounts] });
  }

  return { frames, connPoints };
}

function renderConstellation(canvas, stars, connPoints, frame, elapsed, palette, yOffset) {
  const { revealedStars, revealedConns } = frame;
  const puls = 0.5 + 0.5 * Math.sin(elapsed / 200);

  for (const s of stars) {
    if (!revealedStars.has(s.id)) continue;
    const [cr, cg, cb] = s.baseColor;
    const bright = 1;
    const r = Math.round(cr * bright);
    const g = Math.round(cg * bright);
    const b = Math.round(cb * bright);
    const sy = s.y + yOffset;

    // Glow halos: concentric circles with fade
    canvas.drawCircle(s.x, sy, 3, r, g, Math.round(b * 0.1 * puls));
    canvas.drawCircle(s.x, sy, 2, r, g, Math.round(b * 0.25 * puls));
    canvas.drawCircle(s.x, sy, 1, r, g, Math.round(b * 0.5 * puls));

    canvas.setPixel(s.x, sy, r, g, b);
  }

  // Stroke-by-stroke connection draw
  for (let i = 0; i < connPoints.length; i++) {
    const pts = connPoints[i];
    const count = revealedConns[i] || 0;
    if (count === 0) continue;
    const cr = palette.line.r, cg = palette.line.g, cb = palette.line.b;
    const bright = 0.25 + 0.35 * puls;
    const highlight = count >= pts.length ? 1 : 0.7;

    const tailStart = Math.max(0, count - 3);
    for (let j = 0; j < Math.min(count, pts.length); j++) {
      let bri = bright * highlight;
      if (j >= tailStart && j < count - 1) {
        bri *= 0.5 + 0.5 * ((j - tailStart) / Math.max(1, count - tailStart - 1));
      }
      canvas.setPixel(pts[j].x, pts[j].y + yOffset,
        Math.round(cr * bri), Math.round(cg * bri), Math.round(cb * bri));
    }
  }
}

module.exports = { generateOrionStars, computeConstellationFrames, renderConstellation, ORION };
