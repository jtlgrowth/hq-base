// Accessories drawn in code: the travel set, the lit display shelf and the meeting table.
// Base file. Sizes are in kit units like the Kenney models (the page scales every
// accessory by the same factor); y = 0 is the floor, the front faces +z.
import * as THREE from "three";

const mats = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    const { basic, ...rest } = opts;
    mats.set(key, basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color, ...rest }));
  }
  return mats.get(key);
}
const glow = (color) => mat(color, { basic: true });

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, material);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  return o;
}
const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (rt, rb, h, m, x, y, z, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
const ball = (r, m, x, y, z, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 4)), m, x, y, z);

// a small stand most souvenirs sit on: a dark disc and a rod
function stand(g, rodH, r = 0.07) {
  const dark = mat(0x2b2b2e);
  g.add(cyl(r, r + 0.01, 0.02, dark, 0, 0.01, 0, 20));
  if (rodH > 0) g.add(cyl(0.008, 0.008, rodH, dark, 0, 0.02 + rodH / 2, 0, 8));
}

// Colour each vertex of a low-poly sphere by a rule, for stripes and continents.
function paintedSphere(r, seg, paint) {
  const geo = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))).toNonIndexed();
  const pos = geo.attributes.position, colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // one colour per face, from the face centre, so the low-poly facets stay crisp
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    c.set(paint(Math.atan2(z, x), Math.asin(Math.max(-1, Math.min(1, y / r)))));
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, mat(0xffffff, { vertexColors: true, flatShading: true }));
}

// ------------------------------------------------------------------ souvenirs ----
export function airplane() {
  const g = new THREE.Group();
  stand(g, 0.15);
  const white = mat(0xf3f3f0), blue = mat(0x1f6fb2);
  const p = new THREE.Group();
  p.position.y = 0.19;
  p.rotation.z = 0.12; // nose a little up, like it is taking off
  const body = mesh(new THREE.CapsuleGeometry(0.03, 0.27, 4, 12), white);
  body.rotation.z = Math.PI / 2;
  p.add(body,
    box(0.075, 0.007, 0.32, white, 0.015, -0.006, 0),        // wings
    box(0.045, 0.006, 0.12, white, -0.15, 0.004, 0),         // tail plane
    box(0.06, 0.075, 0.007, blue, -0.155, 0.045, 0),          // fin
    box(0.2, 0.007, 0.062, blue, 0.0, 0.012, 0));             // cheat line along the body
  for (const z of [-0.085, 0.085]) {
    const eng = cyl(0.013, 0.013, 0.05, blue, 0.035, -0.026, z, 10);
    eng.rotation.z = Math.PI / 2;
    p.add(eng);
  }
  g.add(p);
  return g;
}

export function balloon() {
  const g = new THREE.Group();
  stand(g, 0.13);
  const env = paintedSphere(0.09, 16, (lon) => (Math.floor(((lon + Math.PI) / (2 * Math.PI)) * 12) % 2 ? "#f7b52b" : "#e4572e"));
  env.scale.set(1, 1.18, 1);
  env.position.y = 0.3;
  env.castShadow = true;
  const brown = mat(0x8a5a2b), rope = mat(0x5a4632);
  g.add(env, box(0.045, 0.035, 0.045, brown, 0, 0.165, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const r = cyl(0.002, 0.002, 0.06, rope, x * 0.02, 0.21, z * 0.02, 4);
    g.add(r);
  }
  return g;
}

export function parasol() {
  const g = new THREE.Group();
  stand(g, 0.26);
  const yellow = mat(0xf3c623), red = mat(0xc8402a);
  g.add(cyl(0.006, 0.17, 0.075, yellow, 0, 0.3, 0, 14));
  g.add(cyl(0.171, 0.171, 0.016, red, 0, 0.258, 0, 14)); // the fringe
  g.add(ball(0.012, red, 0, 0.345, 0, 8));
  return g;
}

export function globe() {
  const g = new THREE.Group();
  stand(g, 0.06, 0.06);
  const land = (lon, lat) => Math.sin(lon * 3 + 0.6) * Math.cos(lat * 2.2) + Math.sin(lat * 4 + lon) * 0.5 > 0.55;
  const earth = paintedSphere(0.09, 18, (lon, lat) => (land(lon, lat) ? "#5f9e4a" : "#2f7fc4"));
  earth.position.y = 0.17;
  earth.rotation.z = 0.4;
  earth.castShadow = true;
  const arc = mesh(new THREE.TorusGeometry(0.105, 0.006, 6, 28, Math.PI), mat(0xc9a243), 0, 0.17, 0);
  arc.rotation.z = Math.PI / 2 + 0.4;
  g.add(earth, arc);
  return g;
}

export function suitcase(color = 0xf39a1e) {
  const g = new THREE.Group();
  const shell = mat(new THREE.Color(color)), dark = mat(0x2b2b2e);
  g.add(box(0.24, 0.32, 0.13, shell, 0, 0.2, 0));
  for (const x of [-0.06, 0.06]) g.add(box(0.012, 0.3, 0.135, mat(new THREE.Color(color).multiplyScalar(0.82)), x, 0.2, 0));
  for (const x of [-0.04, 0.04]) g.add(cyl(0.006, 0.006, 0.12, dark, x, 0.42, -0.04, 6));
  g.add(box(0.1, 0.014, 0.02, dark, 0, 0.48, -0.04));
  for (const x of [-0.09, 0.09]) for (const z of [-0.04, 0.04]) {
    const w = cyl(0.02, 0.02, 0.016, dark, x, 0.022, z, 12);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  return g;
}

export function palm({ potted = true } = {}) {
  const g = new THREE.Group();
  let y = 0;
  if (potted) {
    g.add(cyl(0.12, 0.09, 0.18, mat(0xc2703d), 0, 0.09, 0, 14));
    g.add(cyl(0.11, 0.11, 0.01, mat(0x5b3d23), 0, 0.18, 0, 14));
    y = 0.18;
  }
  const bark = mat(0x9b7650), leaf = mat(0x3f8f45), leafB = mat(0x4fa652);
  let x = 0;
  for (let i = 0; i < 6; i++) { // a slightly leaning, segmented trunk
    const seg = cyl(0.028 - i * 0.002, 0.034 - i * 0.002, 0.12, bark, x, y + 0.06, 0, 8);
    seg.rotation.z = -0.08;
    g.add(seg);
    y += 0.115;
    x += 0.012;
  }
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Group();
    frond.position.set(x, y, 0);
    frond.rotation.y = (i / 7) * Math.PI * 2;
    const l = box(0.06, 0.012, 0.32, i % 2 ? leaf : leafB, 0, 0, 0.15);
    l.rotation.x = 0.55; // droops
    frond.add(l);
    g.add(frond);
  }
  g.add(ball(0.03, mat(0x6b4a2a), x, y - 0.02, 0, 8)); // coconuts
  return g;
}

export function trophy() {
  const g = new THREE.Group();
  g.add(box(0.13, 0.045, 0.09, mat(0x1d1d20), 0, 0.0225, 0));
  const crystal = mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.22, 6), mat(0xbfe3f2, { transparent: true, opacity: 0.72 }), 0, 0.155, 0);
  crystal.scale.z = 0.45;
  const seal = cyl(0.022, 0.022, 0.004, mat(0xd4a836), 0, 0.2, 0.03, 16);
  seal.rotation.x = Math.PI / 2;
  g.add(crystal, seal);
  return g;
}

export function teddy() {
  const g = new THREE.Group();
  const fur = mat(0xa86b3c), shirt = mat(0xf2c230), light = mat(0xe4c39a), dark = mat(0x2b211b);
  const body = ball(0.075, shirt, 0, 0.085, 0);
  body.scale.set(1, 1.05, 0.9);
  g.add(body, ball(0.058, fur, 0, 0.2, 0.005));
  for (const s of [-1, 1]) {
    g.add(ball(0.022, fur, s * 0.042, 0.25, 0, 8));            // ears
    g.add(ball(0.03, fur, s * 0.07, 0.11, 0.03, 8));            // arms
    g.add(ball(0.034, fur, s * 0.045, 0.03, 0.06, 8));          // legs
    g.add(ball(0.008, dark, s * 0.02, 0.215, 0.052, 6));        // eyes
  }
  g.add(ball(0.024, light, 0, 0.19, 0.052, 8), ball(0.008, dark, 0, 0.198, 0.074, 6));
  return g;
}

export function vase() {
  const pts = [[0, 0], [0.04, 0], [0.055, 0.04], [0.05, 0.1], [0.028, 0.16], [0.024, 0.2], [0.034, 0.23]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(mesh(new THREE.LatheGeometry(pts, 14), mat(0xc8402a)));
  return g;
}

export function goldLeaf() {
  const g = new THREE.Group();
  stand(g, 0.1, 0.05);
  const leaf = ball(0.08, mat(0xd4a836), 0, 0.2, 0, 10);
  leaf.scale.set(0.8, 1, 0.12);
  g.add(leaf);
  return g;
}

// ------------------------------------------------------------ display shelf ----
// Black-framed cubbies with a lit white back and a souvenir in each, like the
// display walls in a travel office. Sits against the back wall (see main.js).
// Shallow on purpose: the camera looks down at 55°, so a deep cubby hides its own back.
export const SHELF = { w: 1.3, h: 0.95, d: 0.12 };
export function displayShelf() {
  const { w: W, h: H, d: D } = SHELF;
  const t = 0.026, cols = 3, rows = 2;
  const g = new THREE.Group();
  const frame = mat(0x26272a);
  g.add(box(W, H, 0.02, glow(0xf6f2e8), 0, H / 2, -D / 2 + 0.01)); // lit back
  g.add(box(t, H, D, frame, -W / 2 + t / 2, H / 2, 0), box(t, H, D, frame, W / 2 - t / 2, H / 2, 0));
  g.add(box(W, t, D, frame, 0, t / 2, 0), box(W, t, D, frame, 0, H - t / 2, 0));
  const cw = (W - t) / cols, ch = (H - t) / rows;
  for (let c = 1; c < cols; c++) g.add(box(t, H, D, frame, -W / 2 + t / 2 + c * cw, H / 2, 0));
  for (let r = 1; r < rows; r++) g.add(box(W, t, D, frame, 0, t / 2 + r * ch, 0));
  const items = [airplane, goldLeaf, vase, balloon, parasol, trophy];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -W / 2 + t / 2 + (c + 0.5) * cw, floor = t + r * ch;
    g.add(box(cw - t - 0.03, 0.008, 0.012, glow(0xffffff), x, floor + ch - t - 0.008, D / 2 - 0.03)); // LED strip
    const item = items[(rows - 1 - r) * cols + c]();
    const sz = new THREE.Box3().setFromObject(item).getSize(new THREE.Vector3());
    const k = 0.85 * Math.min(1, (ch - t - 0.05) / sz.y, (cw - t - 0.06) / Math.max(sz.x, sz.z));
    item.scale.setScalar(k);
    item.position.set(x, floor, D / 2 - 0.02); // souvenirs stand at the front edge, so they read from above
    g.add(item);
  }
  return g;
}

// ------------------------------------------------------------ meeting table ----
function execChair() {
  const g = new THREE.Group();
  const leather = mat(0x1d1e22), metal = mat(0x55575c);
  g.add(box(0.27, 0.06, 0.26, leather, 0, 0.23, 0));
  const back = box(0.27, 0.34, 0.05, leather, 0, 0.42, -0.12);
  back.rotation.x = -0.1;
  g.add(back, cyl(0.016, 0.016, 0.16, metal, 0, 0.12, 0, 8));
  for (let i = 0; i < 5; i++) {
    const leg = box(0.015, 0.015, 0.13, metal, 0, 0.03, 0);
    const a = (i / 5) * Math.PI * 2;
    leg.position.set(Math.sin(a) * 0.065, 0.03, Math.cos(a) * 0.065);
    leg.rotation.y = a;
    g.add(leg);
  }
  for (const s of [-1, 1]) g.add(box(0.03, 0.04, 0.2, leather, s * 0.15, 0.31, 0));
  return g;
}

export function meetingTable() {
  const g = new THREE.Group();
  const top = mat(0xdcc9a8), leg = mat(0x2b2b2e), lid = mat(0x26262a);
  g.add(box(2.0, 0.05, 0.8, top, 0, 0.385, 0));
  for (const x of [-0.85, 0.85]) g.add(box(0.06, 0.36, 0.6, leg, x, 0.18, 0));
  for (const x of [-0.5, 0.5]) for (const s of [-1, 1]) {
    const ch = execChair();
    ch.position.set(x, 0, s * 0.58);
    ch.rotation.y = s > 0 ? Math.PI : 0;
    g.add(ch);
    const lap = box(0.22, 0.012, 0.15, lid, x, 0.416, s * 0.22);
    g.add(lap);
  }
  return g;
}

// --------------------------------------------------------------- wall pieces ----
// The LED screen's face is a canvas the page redraws with live data (see main.js).
export const SCREEN = { w: 1.45, h: 0.82, y: 0.3, d: 0.06 };
export function ledScreen() {
  const { w: W, h: H, y: Y, d: D } = SCREEN;
  const g = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = Math.round(1024 * (H - 0.04) / (W - 0.04));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  g.add(box(W, H, D, mat(0x111214), 0, Y + H / 2, 0));                      // bezel
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.04), new THREE.MeshBasicMaterial({ map: texture }));
  face.position.set(0, Y + H / 2, D / 2 + 0.002);
  g.add(face, box(0.5, 0.02, 0.012, glow(0x7fd4ff), 0, Y - 0.012, D / 2 - 0.006)); // a glow strip under it
  g.userData.screen = { canvas, texture };
  return g;
}

export const MAP = { w: 1.25, h: 0.72, y: 0.3, d: 0.03 };
export function worldMap() {
  const { w: W, h: H, y: Y, d: D } = MAP;
  const g = new THREE.Group();
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = Math.round(1024 * H / W);
  const x = cv.getContext("2d");
  x.fillStyle = "#cfe9f2"; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = "#e9d9b0";
  // a hand-drawn world: blobs for the continents, good enough at office scale
  const blob = (cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx * cv.width, cy * cv.height, rx * cv.width, ry * cv.height, rot, 0, Math.PI * 2); x.fill(); };
  blob(0.2, 0.3, 0.12, 0.13, 0.3); blob(0.27, 0.66, 0.06, 0.16, 0.2);                 // the Americas
  blob(0.5, 0.28, 0.06, 0.08); blob(0.52, 0.58, 0.07, 0.15);                          // Europe, Africa
  blob(0.7, 0.3, 0.17, 0.13); blob(0.79, 0.5, 0.03, 0.06, 0.4); blob(0.85, 0.74, 0.07, 0.06); // Asia, the Philippines side, Australia
  x.fillStyle = "#e4572e";
  for (const [px, py] of [[0.795, 0.48], [0.81, 0.53], [0.86, 0.32], [0.74, 0.47], [0.5, 0.27]]) { x.beginPath(); x.arc(px * cv.width, py * cv.height, 9, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  g.add(box(W, H, D, mat(0x26272a), 0, Y + H / 2, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, H - 0.05), new THREE.MeshLambertMaterial({ map: t }));
  face.position.set(0, Y + H / 2, D / 2 + 0.002);
  g.add(face);
  return g;
}

// ------------------------------------------------------------- bigger rooms ----
export function meetingRoom() {
  const g = new THREE.Group();
  const W = 2.2, D = 1.7, H = 0.95;
  const glass = mat(0xbfe3f2, { transparent: true, opacity: 0.28, depthWrite: false });
  const frame = mat(0x26272a);
  const pane = (w, d, x, z) => { const p = box(w, H, d, glass, x, H / 2, z); p.castShadow = false; g.add(p); };
  g.add(box(W - 0.1, 0.01, D - 0.1, mat(0xd9d4cc), 0, 0.005, 0));            // its own carpet
  pane(W, 0.02, 0, -D / 2); pane(0.02, D, -W / 2, 0); pane(0.02, D, W / 2, 0);
  pane(W * 0.6, 0.02, -W * 0.2, D / 2);                                      // front, with a door gap
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [W * 0.1, D / 2]]) g.add(box(0.04, H, 0.04, frame, x, H / 2, z));
  g.add(box(W, 0.035, 0.04, frame, 0, H, -D / 2), box(0.04, 0.035, D, frame, -W / 2, H, 0), box(0.04, 0.035, D, frame, W / 2, H, 0), box(W, 0.035, 0.04, frame, 0, H, D / 2));
  g.add(cyl(0.4, 0.4, 0.04, mat(0xdcc9a8), 0, 0.38, 0.05, 24), cyl(0.04, 0.12, 0.36, frame, 0, 0.18, 0.05, 12));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ch = execChair();
    ch.position.set(Math.sin(a) * 0.62, 0, 0.05 + Math.cos(a) * 0.62);
    ch.rotation.y = a + Math.PI;
    g.add(ch);
  }
  g.add(box(0.9, 0.5, 0.03, mat(0x111214), 0, 0.55, -D / 2 + 0.04), box(0.86, 0.46, 0.005, glow(0x2b5f86), 0, 0.55, -D / 2 + 0.058)); // its TV
  return g;
}

export function receptionDesk() {
  const g = new THREE.Group();
  const front = mat(0xd8ba8e), top = mat(0xf4f2ee), dark = mat(0x26272a);
  g.add(box(1.3, 0.42, 0.42, front, 0, 0.21, 0), box(1.36, 0.035, 0.48, top, 0, 0.44, 0.0));
  g.add(box(1.3, 0.04, 0.012, mat(0xf39a1e), 0, 0.3, 0.215));                 // an accent line across the front
  g.add(box(0.26, 0.17, 0.02, dark, -0.3, 0.55, -0.1), box(0.06, 0.06, 0.06, dark, -0.3, 0.47, -0.1));
  g.add(cyl(0.03, 0.035, 0.02, mat(0xc9a243), 0.35, 0.47, 0.08, 12), ball(0.012, mat(0xc9a243), 0.35, 0.49, 0.08, 8)); // the bell
  return g;
}

export function whiteboard() {
  const g = new THREE.Group();
  const metal = mat(0x8c9096);
  for (const x of [-0.45, 0.45]) { g.add(box(0.025, 0.95, 0.025, metal, x, 0.5, 0), box(0.03, 0.02, 0.3, metal, x, 0.03, 0)); }
  g.add(box(0.95, 0.58, 0.025, mat(0x8c9096), 0, 0.68, 0), box(0.91, 0.54, 0.005, glow(0xfbfbf8), 0, 0.68, 0.015));
  const ink = [[0xe4572e, -0.2, 0.82, 0.4], [0x2f7fc4, -0.12, 0.74, 0.55], [0x2f7fc4, -0.1, 0.66, 0.6], [0x3f8f45, -0.16, 0.58, 0.45]];
  for (const [c, x, y, w] of ink) g.add(box(w, 0.012, 0.004, glow(c), x + w / 2 - 0.2, y, 0.02));
  return g;
}

export function waterDispenser() {
  const g = new THREE.Group();
  g.add(box(0.26, 0.6, 0.26, mat(0xf2f2f0), 0, 0.3, 0), box(0.12, 0.05, 0.02, mat(0x26272a), 0, 0.42, 0.135));
  const bottle = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 16), mat(0x7fc4e8, { transparent: true, opacity: 0.6 }), 0, 0.77, 0);
  g.add(bottle, cyl(0.04, 0.04, 0.05, mat(0x7fc4e8, { transparent: true, opacity: 0.6 }), 0, 0.62, 0, 12));
  return g;
}

export function printer() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.42, 0.42, mat(0x55575c), 0, 0.21, 0), box(0.46, 0.2, 0.4, mat(0xdcdcd8), 0, 0.52, 0));
  g.add(box(0.3, 0.012, 0.16, glow(0xffffff), 0, 0.43, 0.24), box(0.1, 0.04, 0.02, glow(0x3f8f45), 0.15, 0.58, 0.205));
  return g;
}
