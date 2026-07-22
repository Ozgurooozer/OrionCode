"use strict";

const {
  vec3, mat4Identity, mat4Multiply, mat4Translate, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Scale,
  mat4TransformPoint, mat4TransformDir, v3norm,
  buildViewMatrix, buildProjMatrix, buildMVP, toScreen,
} = require("./math3d.ts");

// ── Z-buffer ────────────────────────────────────────────────────────────────

function createZBuffer(w, h) {
  return new Float64Array(w * h).fill(Infinity);
}

// ── Per-mesh transform ──────────────────────────────────────────────────────

function buildModelMatrix(meshObj) {
  let m = mat4Identity();
  const p = meshObj.pos, r = meshObj.rot, s = meshObj.scale;
  m = mat4Translate(m, p.x, p.y, p.z);
  if (r.x) m = mat4RotateX(m, r.x);
  if (r.y) m = mat4RotateY(m, r.y);
  if (r.z) m = mat4RotateZ(m, r.z);
  m = mat4Scale(m, s.x, s.y, s.z);
  return m;
}

// ── Barycentric test ────────────────────────────────────────────────────────

function barycentric(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = bx - ax, v0y = by - ay;
  const v1x = cx - ax, v1y = cy - ay;
  const v2x = px - ax, v2y = py - ay;
  const d00 = v0x * v0x + v0y * v0y;
  const d01 = v0x * v1x + v0y * v1y;
  const d11 = v1x * v1x + v1y * v1y;
  const d20 = v2x * v0x + v2y * v0y;
  const d21 = v2x * v1x + v2y * v1y;
  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-10) return null;
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  if (u < -0.001 || v < -0.001 || w < -0.001) return null;
  return { u, v, w };
}

// ── Triangle rasterization ──────────────────────────────────────────────────

function rasterTriangle(canvas, zBuf, v0, v1, v2, color, light) {
  const ex1x = v1.x - v0.x, ex1y = v1.y - v0.y;
  const ex2x = v2.x - v0.x, ex2y = v2.y - v0.y;
  const area = ex1x * ex2y - ex1y * ex2x;

  // Bounding box
  const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.min(canvas.w - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.min(canvas.h - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

  const lit = Math.min(1, (light ?? 0.6) + 0.35);

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const bc = barycentric(px + 0.5, py + 0.5, v0.x, v0.y, v1.x, v1.y, v2.x, v2.y);
      if (!bc) continue;

      // Interpolate Z
      const z = bc.u * v0.z + bc.v * v1.z + bc.w * v2.z;

      const idx = py * canvas.w + px;
      if (z >= zBuf[idx]) continue;
      zBuf[idx] = z;

      canvas.setPixel(px, py,
        Math.round(color[0] * lit),
        Math.round(color[1] * lit),
        Math.round(color[2] * lit));
    }
  }
}

// ── Edge-wireframe overlay ──────────────────────────────────────────────────

function rasterWireframe(canvas, v0, v1, v2, color) {
  canvas.drawLine(v0.x, v0.y, v1.x, v1.y, color[0], color[1], color[2]);
  canvas.drawLine(v1.x, v1.y, v2.x, v2.y, color[0], color[1], color[2]);
  canvas.drawLine(v2.x, v2.y, v0.x, v0.y, color[0], color[1], color[2]);
}

// ── Scene renderer ──────────────────────────────────────────────────────────

function renderScene(canvas, scene, camera, wireframe) {
  const w = canvas.w, h = canvas.h;
  const zBuf = createZBuffer(w, h);

  const viewM = buildViewMatrix(camera);
  const projM = buildProjMatrix(camera);

  const lightDir = (() => {
    const d = { x: 0.5, y: -0.7, z: -0.3 };
    const l = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
    return { x: d.x / l, y: d.y / l, z: d.z / l };
  })();

  for (const meshObj of scene) {
    const mesh = meshObj.mesh;
    const modelM = buildModelMatrix(meshObj);
    const mvp = buildMVP(modelM, viewM, projM);

    // Transform vertices to screen space (keep nulls, skip per-triangle)
    const screenVerts = mesh.vertices.map(v => {
      const clip = mat4TransformPoint(mvp, v);
      return toScreen(clip, w, h);
    });

    for (let i = 0; i < mesh.faces.length; i++) {
      const tri = mesh.faces[i];
      const sv = [];
      let skip = false;
      for (const idx of tri) {
        const sv_ = screenVerts[idx];
        if (!sv_) { skip = true; break; }
        sv.push(sv_);
      }
      if (skip || sv.length < 3) continue;

      // Compute lighting from world-space normal
      const worldN = mat4TransformDir(modelM, mesh.faceNormals[i]);
      const nl = v3norm(worldN);
      const light = Math.max(0.15, nl.x * lightDir.x + nl.y * lightDir.y + nl.z * lightDir.z);

      rasterTriangle(canvas, zBuf, sv[0], sv[1], sv[2], mesh.faceColors[i], light);

      if (wireframe) {
        rasterWireframe(canvas, sv[0], sv[1], sv[2], [226, 232, 240]);
      }
    }
  }
}

module.exports = { renderScene };
