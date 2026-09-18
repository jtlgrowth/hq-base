// HQ base: one office on a lawn, one desk per teammate, and whatever you add.
// Base file: do not edit it to decorate. Decorate through accessories.json (see
// ACCESSORIES.md); name and team live in company.json and team.json.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { SETTINGS } from "./settings.js";
import { CATALOG, SPOTS } from "./catalog.js";

const C = SETTINGS.scene;
const POD_X = 2.45, POD_Z = 2.45, COLS = 3, LOUNGE_W = 3.5, MARGIN = 0.7, FRONT = 2.0;
const KIT = 1.35;                    // desks, people and accessories drawn a bit chunky
const PERSON_HEIGHT = 0.74;          // kit units, bind pose; a desk top is 0.384, a wall 1.29
const WALL_H = 1.0;
const PITCH = (35 * Math.PI) / 180;  // classic isometric: 45° yaw, 55° up
const YAW = Math.PI / 4;

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
let paused = !SETTINGS.behavior.animations;
const motionOff = () => paused || reducedQuery.matches;

// ---------------------------------------------------------------- renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 820 ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = "labels";
stage.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.lawn);

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
const controls = new OrbitControls(camera, labels.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = (25 * Math.PI) / 180;
controls.maxPolarAngle = (60 * Math.PI) / 180;
controls.minZoom = 0.6;
controls.maxZoom = 3.5;
controls.addEventListener("change", () => requestRender());

scene.add(new THREE.HemisphereLight(0xffffff, C.bounce, 1.2));
const sun = new THREE.DirectionalLight(C.sun, 2.3);
sun.position.set(-8, 16, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xdce8f5, 0.55);
fill.position.set(10, 8, -6);
scene.add(fill);

const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: C.lawn }));
lawn.rotation.x = -Math.PI / 2;
lawn.position.y = -0.36;
lawn.receiveShadow = true;
scene.add(lawn);

// ------------------------------------------------------------------ models ----
const loader = new GLTFLoader();
const cache = new Map();
function load(file) {
  if (!cache.has(file)) cache.set(file, loader.loadAsync("models/" + file));
  return cache.get(file);
}
function shadows(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
// A furniture piece, centred on x/z with its base on the floor, so placement is predictable.
async function prop(file) {
  const gltf = await load(file);
  const inner = gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.add(shadows(inner));
  return g;
}

// ------------------------------------------------------------------ layout ----
let layout = null;
function computeLayout(n) {
  const cols = n <= 2 ? Math.max(1, n) : n <= 4 ? 2 : COLS;
  const rows = Math.max(1, Math.ceil(n / cols));
  const workW = cols * POD_X, workD = rows * POD_Z;
  const W = MARGIN + workW + 0.8 + LOUNGE_W + MARGIN;
  const D = MARGIN + workD + FRONT + MARGIN * 0.6;
  const x0 = -W / 2 + MARGIN, z0 = -D / 2 + MARGIN;
  const desks = Array.from({ length: n }, (_, i) => ({
    x: x0 + ((i % cols) + 0.5) * POD_X,
    z: z0 + (Math.floor(i / cols) + 0.5) * POD_Z,
  }));
  const loungeX = x0 + workW + 0.8 + LOUNGE_W / 2;
  const spots = {
    lounge: { x: loungeX, z: z0 + Math.max(workD, 3) / 2 + 0.4 },
    pantry: { x: W / 2 - 0.9, z: -D / 2 + 0.75 },
    entrance: { x: W / 2 - 1.0, z: D / 2 - 0.8 },
    hub: { x: x0 + workW * 0.62 + 1.6, z: D / 2 - FRONT / 2 - 0.1 },
    "back-left": { x: -W / 2 + 0.75, z: -D / 2 + 0.75 },
    "back-right": { x: loungeX, z: -D / 2 + 0.75 },
    "front-left": { x: -W / 2 + 0.75, z: D / 2 - 0.75 },
    "front-right": { x: W / 2 - 0.75, z: D / 2 - 0.75 },
  };
  return { n, W, D, desks, spots, hub: { x: x0 + workW * 0.62, z: D / 2 - FRONT / 2 - 0.1 } };
}

// ---------------------------------------------------------------- building ----
const building = new THREE.Group();
scene.add(building);
const lambert = (color) => new THREE.MeshLambertMaterial({ color });

function buildRoom(L, company) {
  disposeGroup(building);
  const { W, D } = L;
  const side = lambert(C.slabSide), top = lambert(C.floor);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, D), [side, side, top, side, side, side]);
  slab.position.y = -0.175;
  slab.receiveShadow = true;
  building.add(slab);

  // floor planks: faint lines along x
  const pts = [];
  for (let z = -D / 2 + 0.5; z < D / 2; z += 0.5) pts.push(-W / 2, 0.002, z, W / 2, 0.002, z);
  const planks = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)),
    new THREE.LineBasicMaterial({ color: C.floorLine, transparent: true, opacity: 0.7 }),
  );
  building.add(planks);

  // two back walls with a light trim, cut away at the front so you can see in
  const wallMat = lambert(C.wall), trimMat = lambert(C.wallTrim);
  const wall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    m.position.set(x, WALL_H / 2, z);
    m.castShadow = m.receiveShadow = true;
    const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, d + 0.04), trimMat);
    t.position.set(x, WALL_H + 0.03, z);
    building.add(m, t);
  };
  wall(W, 0.14, 0, -D / 2 + 0.07);
  wall(0.14, D, -W / 2 + 0.07, 0);

  // desk rugs and the hub rug
  // the lounge: a soft rug that says "this side is for your things"
  const lounge = new THREE.Mesh(new THREE.PlaneGeometry(LOUNGE_W - 0.4, Math.max(2.6, D - FRONT - MARGIN)), lambert(0xe9dcc4));
  lounge.rotation.x = -Math.PI / 2;
  lounge.position.set(L.spots.lounge.x, 0.003, -D / 2 + MARGIN + Math.max(2.6, D - FRONT - MARGIN) / 2 - 0.2);
  lounge.receiveShadow = true;
  building.add(lounge);
  for (const d of L.desks) {
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.06, 48), lambert(C.rug));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(d.x, 0.004, d.z);
    rug.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.13, 48), lambert(C.slabSide));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(d.x, 0.005, d.z);
    building.add(rug, ring);
  }
  const hubRug = new THREE.Mesh(new THREE.CircleGeometry(1.15, 64), lambert(C.hubRug));
  hubRug.rotation.x = -Math.PI / 2;
  hubRug.position.set(L.hub.x, 0.004, L.hub.z);
  hubRug.receiveShadow = true;
  building.add(hubRug);

  // stepping stones from the entrance onto the lawn
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.06, 20), lambert(0xd9d2c2));
    s.position.set(L.spots.entrance.x, -0.33, D / 2 + 0.55 + i * 0.8);
    s.receiveShadow = true;
    building.add(s);
  }

  // a few low-poly trees on the lawn so the building sits in a place, not a void
  const leafA = lambert(0x6f8f3e), leafB = lambert(0x86a24a), bark = lambert(0x7a5230);
  const trees = [[-W / 2 - 1.6, -D / 2 + 0.8, 1.1], [-W / 2 - 1.2, D / 2 - 0.4, 0.8], [W / 2 + 1.4, -D / 2 - 1.2, 1.0],
    [-W / 2 + 1.5, -D / 2 - 1.5, 0.9], [W / 2 + 1.8, D / 2 + 0.6, 0.75], [W / 2 * 0.2, -D / 2 - 1.8, 0.85]];
  trees.forEach(([x, z, s], i) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.5 * s, 8), bark);
    trunk.position.set(x, -0.36 + 0.25 * s, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), i % 2 ? leafA : leafB);
    crown.position.set(x, -0.36 + 0.85 * s, z);
    crown.rotation.set(i, i * 0.7, 0);
    trunk.castShadow = crown.castShadow = true;
    building.add(trunk, crown);
  });

  // the company plate over the hub
  const plate = document.createElement("div");
  plate.className = "plate";
  plate.innerHTML = `<b></b><span></span>`;
  plate.querySelector("b").textContent = company.name || "My Company";
  plate.querySelector("span").textContent = company.tagline || "";
  const p = new CSS2DObject(plate);
  p.position.set(L.hub.x, 0.2, L.hub.z);
  building.add(p);

  // shadow box that fits the building
  const s = Math.max(W, D) * 0.75;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
}

// ------------------------------------------------------------------- people ----
const team = new THREE.Group();
scene.add(team);
const mixers = [];
const STATUS = {
  working: { dot: "var(--success)", word: "working", clip: "sit" },
  idle: { dot: "var(--muted)", word: "idle", clip: "idle" },
  waiting: { dot: "var(--warn)", word: "waiting on you", clip: "idle" },
  away: { dot: "#aab2b6", word: "away", clip: null },
};

function label(name, job, status) {
  const el = document.createElement("div");
  el.className = "tag";
  const st = STATUS[status] || STATUS.working;
  el.innerHTML = `<i></i><b></b><span></span>`;
  el.querySelector("i").style.background = st.dot;
  el.querySelector("b").textContent = name;
  el.querySelector("span").textContent = job;
  el.title = `${name}: ${st.word}`;
  return new CSS2DObject(el);
}

async function person(letter, status) {
  const file = `characters/character-${/^[a-h]$/.test(letter) ? letter : "a"}.glb`;
  const gltf = await load(file);
  const body = SkeletonUtils.clone(gltf.scene);
  const box = new THREE.Box3().setFromObject(body);
  body.scale.setScalar(PERSON_HEIGHT / Math.max(0.001, box.max.y - box.min.y));
  shadows(body);
  const mixer = new THREE.AnimationMixer(body);
  const clipName = (STATUS[status] || STATUS.working).clip;
  const clip = THREE.AnimationClip.findByName(gltf.animations, clipName) || THREE.AnimationClip.findByName(gltf.animations, "idle");
  if (clip) {
    const a = mixer.clipAction(clip);
    a.play();
    a.time = Math.random() * clip.duration; // not everyone breathes in step
  }
  mixer.update(0);
  mixers.push(mixer);
  return body;
}

async function buildTeam(L, members) {
  disposeGroup(team);
  mixers.length = 0;
  const letters = "abcdefgh";
  await Promise.all(members.map(async (m, i) => {
    const d = L.desks[i];
    const pod = new THREE.Group();
    pod.position.set(d.x, 0, d.z);
    const [desk, chair, screen, keys] = await Promise.all([
      prop("furniture/desk.glb"), prop("furniture/chairDesk.glb"),
      prop("furniture/computerScreen.glb"), prop("furniture/computerKeyboard.glb"),
    ]);
    const deskTop = new THREE.Box3().setFromObject(desk).max.y;
    screen.position.set(0, deskTop, -0.12); // Kenney screens face +z: toward the seat
    keys.position.set(0, deskTop, 0.1);
    chair.position.set(0, 0, 0.55);
    chair.rotation.y = Math.PI;
    pod.add(desk, chair, screen, keys);
    pod.scale.setScalar(KIT);
    pod.rotation.y = Math.PI; // people face the camera, monitors face them
    const status = STATUS[m.status] ? m.status : "working";
    if (status !== "away") {
      const body = await person(String(m.character || letters[i % 8]).toLowerCase(), status);
      if (status === "working") { body.position.set(0, 0.02, 0.58); body.rotation.y = Math.PI; }
      else { body.position.set(0.72, 0, 0.35); body.rotation.y = Math.PI * 0.85; }
      pod.add(body);
    }
    const tag = label(m.name || `Teammate ${i + 1}`, m.job || "AI employee", status);
    tag.position.set(0, 2.05, -0.45); // floats above the head, never on it
    pod.add(tag);
    team.add(pod);
  }));
}

// -------------------------------------------------------------- accessories ----
const decor = new THREE.Group();
scene.add(decor);
const placed = new Map(); // key -> object
const popins = [];

function cat(color) {
  const g = new THREE.Group();
  const fur = lambert(new THREE.Color(color || "#e08a3c"));
  const dark = lambert(0x3a2a20);
  const box = (w, h, d, x, y, z, m = fur) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(0.2, 0.16, 0.34, 0, 0.1, 0);            // body
  box(0.17, 0.15, 0.15, 0, 0.23, 0.16);       // head
  box(0.045, 0.06, 0.03, -0.055, 0.33, 0.16); // ears
  box(0.045, 0.06, 0.03, 0.055, 0.33, 0.16);
  box(0.03, 0.03, 0.01, -0.04, 0.25, 0.24, dark); // eyes
  box(0.03, 0.03, 0.01, 0.04, 0.25, 0.24, dark);
  const tail = box(0.04, 0.04, 0.26, 0, 0.14, -0.26);
  tail.rotation.x = -0.6;
  return shadows(g);
}

function logoPlane(company, logoFile) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 0.04), lambert(0xffffff));
  frame.castShadow = true;
  g.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.92), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  face.position.z = 0.025;
  g.add(face);
  if (logoFile) {
    new THREE.TextureLoader().load(logoFile + "?v=" + Date.now(), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      face.material = new THREE.MeshBasicMaterial({ map: t, transparent: true });
      requestRender();
    });
  } else {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 245;
    const x = cv.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 512, 245);
    const initials = (company.name || "HQ").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    x.fillStyle = "#17242b"; x.font = "700 130px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(initials, 256, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    face.material = new THREE.MeshBasicMaterial({ map: t });
  }
  return g;
}

const NEAR_SIDES = { right: [1.15, 0.15], left: [-1.15, 0.15], behind: [0, -1.1], front: [0.55, 0.95] };
function position(item, L, members, counters) {
  const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
  if (num(item.x) !== null && num(item.z) !== null) return { x: item.x, z: item.z };
  if (item.near) {
    const i = members.findIndex((m) => String(m.name).toLowerCase() === String(item.near).toLowerCase());
    if (i >= 0) {
      const used = counters.get("near:" + i) || 0;
      counters.set("near:" + i, used + 1);
      const order = item.side && NEAR_SIDES[item.side] ? [item.side] : ["right", "left", "behind"];
      const [dx, dz] = NEAR_SIDES[order[used % order.length]];
      return { x: L.desks[i].x + dx, z: L.desks[i].z + dz };
    }
  }
  const spot = SPOTS.includes(item.spot) ? item.spot : "lounge";
  const n = counters.get(spot) || 0;
  counters.set(spot, n + 1);
  // a small spiral so several things in one spot do not stack on each other
  const ring = [[0, 0], [0.9, 0], [0, 0.9], [-0.9, 0], [0, -0.9], [0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9], [1.8, 0], [0, 1.8]];
  const [dx, dz] = ring[n % ring.length];
  const s = L.spots[spot];
  return { x: s.x + dx, z: s.z + dz };
}

const clampTo = (p, L) => ({
  x: Math.max(-L.W / 2 + 0.35, Math.min(L.W / 2 - 0.35, p.x)),
  z: Math.max(-L.D / 2 + 0.35, Math.min(L.D / 2 - 0.35, p.z)),
});

async function makeAccessory(item, company, logoFile) {
  const id = String(item.model || "");
  if (id.startsWith("custom/")) return prop(id.replace(/^custom\//, "custom/"));
  const entry = CATALOG[id];
  if (!entry) return null;
  if (entry.procedural === "cat") return cat(item.color);
  if (entry.procedural === "logo") return logoPlane(company, logoFile);
  if (entry.parts) {
    const g = new THREE.Group();
    const pieces = await Promise.all(entry.parts.map((pt) => prop(pt.file)));
    pieces.forEach((piece, i) => {
      const pt = entry.parts[i];
      piece.position.set(pt.x || 0, pt.y || 0, pt.z || 0);
      piece.rotation.y = ((pt.rotY || 0) * Math.PI) / 180;
      g.add(piece);
    });
    return g;
  }
  const g = await prop(entry.file);
  if (entry.y) g.position.y = entry.y;
  return g;
}

async function syncDecor(state, L, force) {
  const counters = new Map();
  const unknown = [];
  const wanted = new Map();
  state.accessories.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    wanted.set(i + ":" + JSON.stringify(item), item);
  });
  for (const [k, obj] of placed) {
    if (force || !wanted.has(k)) { decor.remove(obj); disposeGroup(obj); placed.delete(k); }
  }
  const added = [];
  for (const [k, item] of wanted) {
    const id = String(item.model || "");
    const isCustom = id.startsWith("custom/") && state.custom.includes(id.slice(7));
    if (!CATALOG[id] && !isCustom) { unknown.push(id || "(no model)"); continue; }
    if (placed.has(k)) { position(item, L, state.team, counters); continue; }
    let obj;
    try { obj = await makeAccessory(item, state.company, state.logo); } catch (e) { console.warn("could not load", id, e); }
    if (!obj) { unknown.push(id); continue; }
    if (CATALOG[id]?.procedural === "logo") {
      const x = typeof item.x === "number" ? item.x : 0;
      obj.position.set(Math.max(-L.W / 2 + 1.3, Math.min(L.W / 2 - 1.3, x)), 0.62, -L.D / 2 + 0.16);
    } else {
      const p = clampTo(position(item, L, state.team, counters), L);
      obj.position.x = p.x; obj.position.z = p.z;
      obj.rotation.y = ((Number(item.rotY) || 0) * Math.PI) / 180;
    }
    const scale = Math.max(0.2, Math.min(4, Number(item.scale) || 1)) * (CATALOG[id]?.procedural === "logo" ? 1 : KIT);
    obj.userData.scale = scale;
    obj.scale.setScalar(force || motionOff() ? scale : 0.001);
    decor.add(obj);
    placed.set(k, obj);
    if (!force && !motionOff()) added.push(obj);
  }
  const t0 = performance.now();
  added.forEach((obj, i) => popins.push({ obj, start: t0 + i * 180 }));
  $("unknown").hidden = unknown.length === 0;
  $("unknown").textContent = unknown.length ? `Not in the catalog: ${[...new Set(unknown)].join(", ")}. See ACCESSORIES.md.` : "";
  $("stat-decor").textContent = String(placed.size);
  requestRender();
}

// ---------------------------------------------------------------- overlay UI ----
function renderUI(state) {
  $("company").textContent = (state.company.name || "My Company") + " HQ";
  document.title = (state.company.name || "My Company") + " HQ";
  const counts = { working: 0, idle: 0, waiting: 0, away: 0 };
  state.team.forEach((m) => { counts[STATUS[m.status] ? m.status : "working"]++; });
  $("stat-working").textContent = String(counts.working);
  $("stat-idle").textContent = String(counts.idle + counts.waiting);
  const open = state.tasks.filter((t) => !t.done).length;
  $("stat-tasks").textContent = String(open);
  $("team-pill").textContent = `${state.team.length} on the team`;
  const list = $("tasks");
  list.replaceChildren();
  if (state.tasks.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = 'Nothing on the board. Add "- [ ] your task" lines to tasks.md.';
    list.append(li);
  }
  for (const t of state.tasks) {
    const li = document.createElement("li");
    if (t.done) li.className = "done";
    li.textContent = t.text;
    list.append(li);
  }
}

// ---------------------------------------------------------------------- state ----
let last = { company: "", team: "", decor: "", ui: "" };
let busy = false;
async function poll() {
  if (busy) return;
  busy = true;
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const state = await r.json();
    $("offline").hidden = true;
    const teamKey = JSON.stringify(state.team.map((m) => [m.name, m.job, m.status, m.character]));
    const companyKey = JSON.stringify(state.company);
    const rebuild = teamKey !== last.team || companyKey !== last.company || !layout;
    if (rebuild) {
      layout = computeLayout(state.team.length);
      buildRoom(layout, state.company);
      await buildTeam(layout, state.team);
      fitCamera();
    }
    const decorKey = JSON.stringify([state.accessories, state.custom, state.logo]);
    if (rebuild || decorKey !== last.decor) await syncDecor(state, layout, rebuild && last.team === "");
    renderUI(state);
    last = { company: companyKey, team: teamKey, decor: decorKey };
  } catch (e) {
    $("offline").hidden = false;
  } finally {
    busy = false;
    requestRender();
  }
}

// ---------------------------------------------------------------- camera fit ----
// Fit the building into the part of the screen the overlay leaves free: the board on
// the right, the bar on top, the stat card at the bottom.
function fitCamera() {
  if (!layout) return;
  const elevation = Math.PI / 2 - PITCH, dist = 40;
  camera.position.set(dist * Math.cos(elevation) * Math.cos(YAW), dist * Math.sin(elevation), dist * Math.cos(elevation) * Math.sin(YAW));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const v = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [-layout.W / 2, layout.W / 2]) for (const z of [-layout.D / 2, layout.D / 2]) for (const y of [-0.36, 1.9]) {
    v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  const wide = innerWidth > 900, phone = innerWidth <= 720;
  const padL = 24, padR = wide ? 364 : 24, padT = phone ? 130 : 84, padB = phone ? Math.round(innerHeight * 0.3) + 140 : 150;
  const availW = Math.max(200, innerWidth - padL - padR), availH = Math.max(200, innerHeight - padT - padB);
  const unit = Math.max((maxX - minX) / availW, (maxY - minY) / availH); // world units per pixel
  const cx = (minX + maxX) / 2 - (padL + availW / 2 - innerWidth / 2) * unit;
  const cy = (minY + maxY) / 2 + (padT + availH / 2 - innerHeight / 2) * unit;
  camera.left = cx - (innerWidth / 2) * unit; camera.right = cx + (innerWidth / 2) * unit;
  camera.top = cy + (innerHeight / 2) * unit; camera.bottom = cy - (innerHeight / 2) * unit;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
}
addEventListener("resize", () => {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 820 ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
  fitCamera();
  requestRender();
});

// ------------------------------------------------------------------ the loop ----
let prev = performance.now();
let running = false, lost = false, lastFrame = 0;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function requestRender() {
  if (running || lost || document.hidden) return;
  running = true;
  prev = performance.now();
  requestAnimationFrame(frame);
}
function frame(now) {
  if (lost || document.hidden) { running = false; return; }
  const animate = !motionOff() && mixers.length > 0;
  // characters breathe at 30 fps; that is plenty and halves the battery cost
  if (animate && now - lastFrame < 32 && popins.length === 0) { requestAnimationFrame(frame); return; }
  lastFrame = now;
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  if (animate) mixers.forEach((m) => m.update(dt));
  const t = performance.now();
  for (let i = popins.length - 1; i >= 0; i--) {
    const p = popins[i];
    const k = Math.max(0, Math.min(1, (t - p.start) / 450));
    p.obj.scale.setScalar(Math.max(0.001, easeOut(k) * p.obj.userData.scale));
    if (k >= 1) popins.splice(i, 1);
  }
  const moving = controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  if (animate || popins.length || moving) requestAnimationFrame(frame);
  else running = false;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) requestRender(); });
reducedQuery.addEventListener("change", () => { syncMotionButton(); requestRender(); });

// ------------------------------------------------------------- motion toggle ----
function syncMotionButton() {
  const b = $("motion");
  b.textContent = motionOff() ? "Play motion" : "Pause motion";
  b.setAttribute("aria-pressed", String(motionOff()));
  b.disabled = reducedQuery.matches;
  if (reducedQuery.matches) b.title = "Motion is off because your system asks for reduced motion";
}
$("motion").addEventListener("click", () => {
  paused = !paused;
  popins.forEach((p) => p.obj.scale.setScalar(p.obj.userData.scale));
  popins.length = 0;
  syncMotionButton();
  requestRender();
});
syncMotionButton();

// --------------------------------------------------------------- lifecycle ----
function disposeGroup(group) {
  group.traverse((o) => {
    if (o.isCSS2DObject && o.element?.parentNode) o.element.parentNode.removeChild(o.element);
    if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
  });
  group.clear();
}
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  lost = true;
  $("offline").hidden = false;
  $("offline").textContent = "The graphics card reset. Reload the page to bring the office back.";
});
renderer.domElement.addEventListener("webglcontextrestored", () => location.reload());
addEventListener("pagehide", () => {
  scene.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
  });
  renderer.dispose();
});

function tick() {
  const d = new Date();
  $("clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
tick();
setInterval(tick, 30_000);
poll();
setInterval(poll, Math.max(1, SETTINGS.behavior.pollSeconds) * 1000);

// For tests and curious people: window.hq.state() in the console.
window.hq = { scene, camera, controls, render: () => requestRender(), layout: () => layout, placed: () => placed.size, desks: () => team.children.length };
