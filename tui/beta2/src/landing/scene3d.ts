"use strict";

const { vec3, v3sub, v3cross, v3norm } = require("./math3d.ts");

// ── Mesh ────────────────────────────────────────────────────────────────────

function createMesh(vertices, faces, faceColors, faceNormals) {
  if (!faceNormals) {
    faceNormals = faces.map((tri) => {
      const a = vertices[tri[0]], b = vertices[tri[1]], c = vertices[tri[2]];
      const e1 = v3sub(b, a), e2 = v3sub(c, a);
      return v3norm(v3cross(e1, e2));
    });
  }
  return { vertices, faces, faceColors, faceNormals };
}

// ── Shape generators ────────────────────────────────────────────────────────

function createBox(w, h, d, color) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const v = [
    vec3(-hw,  hh,  hd),  // 0: front-top-left
    vec3( hw,  hh,  hd),  // 1: front-top-right
    vec3( hw, -hh,  hd),  // 2: front-bottom-right
    vec3(-hw, -hh,  hd),  // 3: front-bottom-left
    vec3(-hw,  hh, -hd),  // 4: back-top-left
    vec3( hw,  hh, -hd),  // 5: back-top-right
    vec3( hw, -hh, -hd),  // 6: back-bottom-right
    vec3(-hw, -hh, -hd),  // 7: back-bottom-left
  ];

  function tri(a, b, c) { return [a, b, c]; }
  function face(a, b, c, d) { return [tri(a, b, c), tri(a, c, d)]; }

  const faces = [
    ...face(0, 1, 2, 3),  // front
    ...face(5, 4, 7, 6),  // back
    ...face(4, 0, 3, 7),  // left
    ...face(1, 5, 6, 2),  // right
    ...face(4, 5, 1, 0),  // top
    ...face(3, 2, 6, 7),  // bottom
  ];

  const normals = [
    vec3(0, 0, 1), vec3(0, 0, 1),   // front
    vec3(0, 0, -1), vec3(0, 0, -1), // back
    vec3(-1, 0, 0), vec3(-1, 0, 0), // left
    vec3(1, 0, 0), vec3(1, 0, 0),   // right
    vec3(0, 1, 0), vec3(0, 1, 0),   // top
    vec3(0, -1, 0), vec3(0, -1, 0), // bottom
  ];

  const faceColors = faces.map(() => color);
  return createMesh(v, faces, faceColors, normals);
}

function createPlane(w, d, color, axis, offset) {
  const hw = w / 2, hd = d / 2;
  let v;
  if (axis === "xz") {
    v = [vec3(-hw, offset, -hd), vec3( hw, offset, -hd),
         vec3( hw, offset,  hd), vec3(-hw, offset,  hd)];
  } else if (axis === "xy") {
    v = [vec3(-hw, -hd, offset), vec3( hw, -hd, offset),
         vec3( hw,  hd, offset), vec3(-hw,  hd, offset)];
  } else {
    v = [vec3(offset, -hw, -hd), vec3(offset,  hw, -hd),
         vec3(offset,  hw,  hd), vec3(offset, -hw,  hd)];
  }

  // Explicit normals (by axis and offset direction)
  let normal;
  if (axis === "xz")    normal = offset >= 0 ? vec3(0, 1, 0) : vec3(0, -1, 0);
  else if (axis === "xy") normal = offset >= 0 ? vec3(0, 0, 1) : vec3(0, 0, -1);
  else                   normal = offset >= 0 ? vec3(1, 0, 0) : vec3(-1, 0, 0);

  const faces = [[0, 1, 2], [0, 2, 3]];
  const faceColors = [color, color];
  return createMesh(v, faces, faceColors, [normal, normal]);
}

// ── Scene builder ───────────────────────────────────────────────────────────

function buildRoomScene(tableColor, wallColor, floorColor) {
  const roomW = 5;
  const roomD = 5;
  const roomH = 2.5;

  // Floor: XZ plane at y = -roomH/2
  const floor = createPlane(roomW, roomD, floorColor, "xz", -roomH / 2);

  // Back wall: XY plane at z = -roomD/2  (facing +z toward camera)
  const backWall = createPlane(roomW, roomH, wallColor, "xy", -roomD / 2);

  // Left wall: YZ plane at x = -roomW/2 (facing +x)
  const leftWall = createPlane(roomD, roomH, wallColor, "yz", -roomW / 2);

  // Right wall: YZ plane at x = roomW/2 (facing -x)
  const rightWall = createPlane(roomD, roomH, wallColor, "yz", roomW / 2);

  // Table: a box in the center of the room
  const table = createBox(1.4, 0.9, 0.9, tableColor);

  return [
    { mesh: floor,     pos: vec3(0, 0, 0),       rot: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    { mesh: backWall,  pos: vec3(0, 0, 0),       rot: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    { mesh: leftWall,  pos: vec3(0, 0, 0),       rot: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    { mesh: rightWall, pos: vec3(0, 0, 0),       rot: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
    { mesh: table,     pos: vec3(0, -0.75, 0.3), rot: vec3(0, 0, 0), scale: vec3(1, 1, 1) },
  ];
}

module.exports = { createMesh, createBox, createPlane, buildRoomScene };
