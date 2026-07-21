"use strict";

// ── vec3 ────────────────────────────────────────────────────────────────────

function vec3(x, y, z) { return { x, y, z }; }

function v3add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function v3sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function v3scale(a, s) { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function v3dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function v3cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function v3len(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }
function v3norm(a) {
  const l = v3len(a);
  return l < 1e-10 ? { x: 0, y: 0, z: 0 } : { x: a.x / l, y: a.y / l, z: a.z / l };
}
function v3neg(a) { return { x: -a.x, y: -a.y, z: -a.z }; }

// ── mat4 ────────────────────────────────────────────────────────────────────

// mat4 stored as Float64Array(16) in column-major order

function mat4Identity() {
  return new Float64Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

function mat4Multiply(a, b) {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function mat4Translate(m, tx, ty, tz) {
  const t = mat4Identity();
  t[12] = tx; t[13] = ty; t[14] = tz;
  return mat4Multiply(m, t);
}

function mat4RotateX(m, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const r = mat4Identity();
  r[5] = c; r[6] = s; r[9] = -s; r[10] = c;
  return mat4Multiply(m, r);
}

function mat4RotateY(m, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const r = mat4Identity();
  r[0] = c; r[2] = -s; r[8] = s; r[10] = c;
  return mat4Multiply(m, r);
}

function mat4RotateZ(m, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const r = mat4Identity();
  r[0] = c; r[1] = s; r[4] = -s; r[5] = c;
  return mat4Multiply(m, r);
}

function mat4Scale(m, sx, sy, sz) {
  const s = mat4Identity();
  s[0] = sx; s[5] = sy; s[10] = sz;
  return mat4Multiply(m, s);
}

function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const out = new Float64Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function mat4LookAt(eye, target, up) {
  const fwd = v3norm(v3sub(target, eye));
  const r = v3norm(v3cross(fwd, up));
  const u = v3cross(r, fwd);
  const out = new Float64Array(16);
  out[0] = r.x; out[1] = u.x; out[2] = -fwd.x; out[3] = 0;
  out[4] = r.y; out[5] = u.y; out[6] = -fwd.y; out[7] = 0;
  out[8] = r.z; out[9] = u.z; out[10] = -fwd.z; out[11] = 0;
  out[12] = -v3dot(r, eye);
  out[13] = -v3dot(u, eye);
  out[14] = v3dot(fwd, eye);
  out[15] = 1;
  return out;
}

function mat4TransformPoint(m, p) {
  const x = p.x, y = p.y, z = p.z;
  return {
    x: m[0] * x + m[4] * y + m[8] * z + m[12],
    y: m[1] * x + m[5] * y + m[9] * z + m[13],
    z: m[2] * x + m[6] * y + m[10] * z + m[14],
    w: m[3] * x + m[7] * y + m[11] * z + m[15],
  };
}

function mat4TransformDir(m, d) {
  const x = d.x, y = d.y, z = d.z;
  return vec3(
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  );
}

// ── Camera ──────────────────────────────────────────────────────────────────

function createCamera(eye, target, up, fovY, aspect, near, far) {
  return { eye, target, up, fovY, aspect, near, far };
}

function buildViewMatrix(cam) {
  return mat4LookAt(cam.eye, cam.target, cam.up);
}

function buildProjMatrix(cam) {
  return mat4Perspective(cam.fovY, cam.aspect, cam.near, cam.far);
}

function buildMVP(modelMatrix, viewMatrix, projMatrix) {
  return mat4Multiply(projMatrix, mat4Multiply(viewMatrix, modelMatrix));
}

// ── Screen transform ────────────────────────────────────────────────────────

function toScreen(p, w, h) {
  if (p.w <= 0) return null;
  const ndcX = p.x / p.w;
  const ndcY = p.y / p.w;
  const ndcZ = p.z / p.w;
  return {
    x: Math.round((ndcX + 1) * 0.5 * w),
    y: Math.round((1 - ndcY) * 0.5 * h),
    z: ndcZ,
  };
}

module.exports = {
  vec3, v3add, v3sub, v3scale, v3dot, v3cross, v3len, v3norm, v3neg,
  mat4Identity, mat4Multiply, mat4Translate, mat4RotateX, mat4RotateY, mat4RotateZ, mat4Scale,
  mat4Perspective, mat4LookAt, mat4TransformPoint, mat4TransformDir,
  createCamera, buildViewMatrix, buildProjMatrix, buildMVP, toScreen,
};
