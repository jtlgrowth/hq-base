// HQ base: one office on a lawn, one desk per teammate, and whatever you add.
// Base file: do not edit it to decorate. Decorate through accessories.json (see
// ACCESSORIES.md); name and team live in company.json and team.json.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { SETTINGS } from "./settings.js";
import { CATALOG, SPOTS, LOOKS, SCREEN_SHOWS } from "./catalog.js";
import * as PROPS from "./props.js";

const C = SETTINGS.scene;
const POD_X = 2.45, POD_Z = 2.45, COLS = 3, LOUNGE_W = 3.5, MARGIN = 0.7, FRONT = 2.0;
const KIT = 1.35;                    // desks, people and accessories drawn a bit chunky
const PERSON_HEIGHT = 0.74;          // kit units, bind pose; a desk top is 0.384, a wall 1.29
const WALL_H = 1.0, WALL_H_SLAT = 1.5;
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
// bigs: depths of the big pieces (meeting table, meeting room) that stack along the
// lounge; the room grows deeper so they never pile on each other.
function computeLayout(n, bigs = []) {
  const cols = n <= 2 ? Math.max(1, n) : n <= 4 ? 2 : COLS;
  const rows = Math.max(1, Math.ceil(n / cols));
  const workW = cols * POD_X, workD = rows * POD_Z;
  const W = MARGIN + workW + 0.8 + LOUNGE_W + MARGIN;
  const STACK_START = 1.7, STACK_GAP = 0.45;
  const D = Math.max(MARGIN + workD + FRONT + MARGIN * 0.6, STACK_START + bigs.reduce((a, d) => a + d + STACK_GAP, 0) + 1.5);
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
  let z = -D / 2 + STACK_START;
  const bigSlots = bigs.map((d) => { const c = z + d / 2; z += d + STACK_GAP; return { x: loungeX, z: c }; });
  return { n, W, D, desks, spots, bigSlots, hub: { x: x0 + workW * 0.62, z: D / 2 - FRONT / 2 - 0.1 } };
}

// ---------------------------------------------------------------- building ----
const building = new THREE.Group();
scene.add(building);
const lambert = (color) => new THREE.MeshLambertMaterial({ color });

// company.json "look": walls, floor and what is outside. Unknown values fall back to the first.
function lookOf(company) {
  const look = company && typeof company.look === "object" && company.look ? company.look : {};
  return Object.fromEntries(Object.entries(LOOKS).map(([k, opts]) => [k, opts.includes(look[k]) ? look[k] : opts[0]]));
}

// vertical light-oak slats, drawn once onto a canvas and repeated along each wall
let slatCanvas = null;
function slatTexture(repeat) {
  if (!slatCanvas) {
    slatCanvas = document.createElement("canvas");
    slatCanvas.width = 64; slatCanvas.height = 4;
    const x = slatCanvas.getContext("2d");
    x.fillStyle = "#" + C.slat.toString(16).padStart(6, "0"); x.fillRect(0, 0, 64, 4);
    x.fillStyle = "#" + C.slatLine.toString(16).padStart(6, "0");
    for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 1, 4);
    x.fillStyle = "rgba(255,255,255,.18)";
    for (let i = 3; i < 64; i += 8) x.fillRect(i, 0, 2, 4);
  }
  const t = new THREE.CanvasTexture(slatCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(repeat, 1);
  return t;
}

function buildRoom(L, company) {
  disposeGroup(building);
  const { W, D } = L;
  const look = lookOf(company);
  const island = look.outside === "island";
  scene.background.set(island ? C.sea : C.lawn);
  lawn.material.color.set(island ? C.sea : C.lawn);
  lawn.position.y = island ? -0.47 : -0.36;
  const side = lambert(C.slabSide), top = lambert(look.floor === "stone" ? C.stone : C.floor);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.35, D), [side, side, top, side, side, side]);
  slab.position.y = -0.175;
  slab.receiveShadow = true;
  building.add(slab);

  // floor: planks (faint lines along x) or stone tiles (a grid)
  const pts = [];
  for (let z = -D / 2 + 0.5; z < D / 2; z += 0.5) pts.push(-W / 2, 0.002, z, W / 2, 0.002, z);
  if (look.floor === "stone") for (let x = -W / 2 + 0.5; x < W / 2; x += 0.5) pts.push(x, 0.002, -D / 2, x, 0.002, D / 2);
  const planks = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)),
    new THREE.LineBasicMaterial({ color: look.floor === "stone" ? C.stoneLine : C.floorLine, transparent: true, opacity: 0.7 }),
  );
  building.add(planks);

  // two back walls with a light trim, cut away at the front so you can see in
  const slats = look.walls === "wood-slat";
  const wallH = slats ? WALL_H_SLAT : WALL_H;
  const trimMat = lambert(C.wallTrim);
  const wall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), slats ? new THREE.MeshLambertMaterial({ map: slatTexture(Math.max(w, d) * 7) }) : lambert(C.wall));
    m.position.set(x, wallH / 2, z);
    m.castShadow = m.receiveShadow = true;
    const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.06, d + 0.04), trimMat);
    t.position.set(x, wallH + 0.03, z);
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

  // an island: sand under the building and a ring of shallow water around it
  if (island) {
    const disc = (grow, color, y) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 0.12, 28), lambert(color));
      m.scale.set(W / 2 + grow, 1, D / 2 + grow + 2.2);
      m.position.set(0, y, 1.1);
      m.receiveShadow = true;
      building.add(m);
    };
    disc(3.2, C.shallows, -0.43);
    disc(2.2, C.sand, -0.38);
  }

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
  if (island) {
    trees.forEach(([x, z, s], i) => {
      const p = PROPS.palm({ potted: false });
      p.scale.setScalar(2.4 * s);
      p.position.set(x, -0.36, z);
      p.rotation.y = i * 1.7;
      building.add(p);
    });
  } else trees.forEach(([x, z, s], i) => {
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

function label(member, status) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tag";
  const st = STATUS[status] || STATUS.working;
  el.innerHTML = `<i></i><b></b><span></span>`;
  el.querySelector("i").style.background = st.dot;
  el.querySelector("b").textContent = member.name;
  el.querySelector("span").textContent = member.job;
  el.title = `${member.name}: ${st.word}. Click for the job card.`;
  el.setAttribute("aria-expanded", "false");
  el.dataset.id = member.id || "";
  el.addEventListener("pointerdown", (e) => e.stopPropagation()); // a click, not the start of a turn
  el.addEventListener("click", () => openCard({ ...member, status }, el));
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
    const tag = label({ id: m.id, name: m.name || `Teammate ${i + 1}`, job: m.job || "AI employee" }, status);
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
      // fit the logo inside the frame without stretching it
      const a = t.image.width / Math.max(1, t.image.height), frameA = 1.96 / 0.92;
      face.scale.set(Math.min(1, a / frameA), Math.min(1, frameA / a), 1);
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

const validColor = (c) => (typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c) ? c : null);

// Things that hang on a wall (the logo, display shelves, screens, the map) line up by
// themselves: the logo in the middle of the back wall, the rest alternating left and
// right of it, and once the back wall is full, along the left wall from the back.
const scaleOf = (it) => Math.max(0.2, Math.min(4, Number(it.scale) || 1));
const isLogo = (it) => CATALOG[it.model]?.procedural === "logo";
function wallSlots(items, L) {
  const slots = new Map();
  const widthOf = (it) => (isLogo(it) ? 2.1 : CATALOG[it.model].wall.w * KIT * scaleOf(it));
  const lo = -L.W / 2 + 0.25, hi = L.W / 2 - 0.25;
  let left = null, right = null, side = -L.D / 2 + 0.35, goLeft = true;
  const logoAt = items.findIndex((it) => isLogo(it) && typeof it.x !== "number");
  if (logoAt >= 0) { slots.set(logoAt, { wall: "back", pos: 0 }); left = -2.1 / 2 - 0.3; right = 2.1 / 2 + 0.3; }
  items.forEach((it, i) => {
    if (isLogo(it) || !CATALOG[it.model]?.wall || typeof it.x === "number") return;
    const w = widthOf(it);
    if (left === null) { slots.set(i, { wall: "back", pos: 0 }); left = -w / 2 - 0.3; right = w / 2 + 0.3; return; }
    const fitsL = left - w >= lo, fitsR = right + w <= hi;
    if (fitsL && (goLeft || !fitsR)) { slots.set(i, { wall: "back", pos: left - w / 2 }); left -= w + 0.3; goLeft = false; }
    else if (fitsR) { slots.set(i, { wall: "back", pos: right + w / 2 }); right += w + 0.3; goLeft = true; }
    else { slots.set(i, { wall: "left", pos: Math.min(L.D / 2 - 0.3 - w / 2, side + w / 2) }); side += w + 0.3; }
  });
  return slots;
}
// the big pieces that stack along the lounge (not given their own spot or x/z)
const stacked = (it) => Boolean(CATALOG[it.model]?.big) && typeof it.x !== "number" && (!it.spot || it.spot === "lounge");
const bigsOf = (items) => items.filter((it) => it && typeof it === "object" && stacked(it)).map((it) => CATALOG[it.model].big * KIT * scaleOf(it));

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
  if (entry.procedural === "suitcase") return shadows(PROPS.suitcase(validColor(item.color) || undefined));
  if (entry.procedural && typeof PROPS[entry.procedural] === "function") return shadows(PROPS[entry.procedural]());
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
  const items = state.accessories.filter((item) => item && typeof item === "object");
  const slots = wallSlots(items, L);
  let b = 0;
  items.forEach((item, i) => {
    item = { ...item, _slot: slots.get(i), _big: stacked(item) ? L.bigSlots[b++] : undefined };
    wanted.set(i + ":" + JSON.stringify(item), item);
  });
  for (const [k, obj] of placed) {
    if (force || !wanted.has(k)) { decor.remove(obj); disposeGroup(obj); placed.delete(k); screens.delete(k); }
  }
  const added = [];
  for (const [k, item] of wanted) {
    const id = String(item.model || "");
    const isCustom = id.startsWith("custom/") && state.custom.includes(id.slice(7));
    if (!CATALOG[id] && !isCustom) { unknown.push(id || "(no model)"); continue; }
    const onWall = CATALOG[id]?.wall || CATALOG[id]?.procedural === "logo";
    if (placed.has(k)) { if (!onWall) position(item, L, state.team, counters); continue; }
    let obj;
    try { obj = await makeAccessory(item, state.company, state.logo); } catch (e) { console.warn("could not load", id, e); }
    if (!obj) { unknown.push(id); continue; }
    if (CATALOG[id]?.procedural === "logo") {
      const x = typeof item.x === "number" ? item.x : item._slot?.pos ?? 0;
      obj.position.set(Math.max(-L.W / 2 + 1.3, Math.min(L.W / 2 - 1.3, x)), lookOf(state.company).walls === "wood-slat" ? 0.85 : 0.62, -L.D / 2 + 0.16);
    } else if (CATALOG[id]?.wall) {
      const d = CATALOG[id].wall.d * KIT * scaleOf(item);
      const slot = typeof item.x === "number" ? { wall: "back", pos: item.x } : item._slot || { wall: "back", pos: 0 };
      if (slot.wall === "left") {
        obj.position.set(-L.W / 2 + 0.14 + d / 2 + 0.01, 0, slot.pos);
        obj.rotation.y = Math.PI / 2;
      } else obj.position.set(Math.max(-L.W / 2 + 0.2, Math.min(L.W / 2 - 0.2, slot.pos)), 0, -L.D / 2 + 0.14 + d / 2 + 0.01);
    } else if (item._big) {
      obj.position.set(item._big.x, 0, item._big.z);
      obj.rotation.y = ((Number(item.rotY) || 0) * Math.PI) / 180;
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
    if (obj.userData.screen) screens.set(k, { ...obj.userData.screen, show: SCREEN_SHOWS.includes(item.show) ? item.show : SCREEN_SHOWS[0], drawn: "" });
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
  $("company").textContent = hqName(state.company);
  document.title = hqName(state.company);
  const counts = { working: 0, idle: 0, waiting: 0, away: 0 };
  state.team.forEach((m) => { counts[STATUS[m.status] ? m.status : "working"]++; });
  $("stat-working").textContent = String(counts.working);
  const brain = state.brain || { files: [], rules: [], reads: false };
  $("stat-brain").textContent = `${brain.files.filter((f) => f.present).length}/${brain.files.length || 5}`;
  $("brain-files").replaceChildren(
    ...brain.files.map((f) => li(f.present, f.present ? `<code>brain/${esc(f.name)}</code> · ${f.lines} lines` : `<code>brain/${esc(f.name)}</code> missing`)),
    li(brain.reads, brain.reads ? "Your team reads it before every task (CLAUDE.md)" : "CLAUDE.md does not tell your team to read brain/ yet"),
  );
  $("brain-rules").replaceChildren(...(brain.rules.length ? brain.rules : ["No rules yet. Write brain/rules.md."]).map((r) => Object.assign(document.createElement("li"), { textContent: r })));
  const work = state.work || [];
  $("work").replaceChildren(...(work.length ? work.map((w) => {
    const el = document.createElement("li");
    el.innerHTML = `<code></code><span></span>`;
    el.querySelector("code").textContent = w.path;
    el.querySelector("span").textContent = ago(w.when);
    return el;
  }) : [Object.assign(document.createElement("li"), { className: "empty", textContent: "Nothing made in your desk folder yet." })]));
  const open = state.tasks.filter((t) => !t.done).length;
  $("stat-tasks").textContent = String(open);
  $("team-pill").textContent = `${state.team.length} on the team`;
  // The hint names a real teammate, so the example works when pasted as is.
  $("hint-name").textContent = state.team[0]?.name || "Maya";
  $("empty").hidden = state.team.length > 0;
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

// --------------------------------------------------------------- LED screens ----
// Each screen's face is a canvas, redrawn only when what it shows has changed.
const screens = new Map(); // accessory key -> { canvas, texture, show, drawn }
const hqName = (company) => (typeof company.hq === "string" && company.hq.trim()) || `${company.name || "My Company"} HQ`;
const ago = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
function screenLines(show, state) {
  const dot = { working: "#3ccf7a", idle: "#9aa5ad", waiting: "#f2b63c", away: "#6b7780" };
  if (show === "tasks") return { title: "TODAY", lines: state.tasks.length ? state.tasks.map((t) => ({ text: t.text, mark: t.done ? "#3ccf7a" : "#f2b63c", dim: t.done })) : [{ text: "Nothing on the board yet" }] };
  if (show === "brain") {
    const b = state.brain || { files: [], rules: [] };
    const have = b.files.filter((f) => f.present).length;
    return { title: `BRAIN · ${have}/${b.files.length || 5} FILES`, lines: b.rules.length ? b.rules.map((r) => ({ text: r, mark: "#7fd4ff" })) : [{ text: "No brain/rules.md yet" }] };
  }
  if (show === "work") return { title: "LATEST WORK", lines: (state.work || []).length ? state.work.map((w) => ({ text: w.path, sub: ago(w.when), mark: "#7fd4ff" })) : [{ text: "Nothing made in this folder yet" }] };
  return { title: "TEAM", lines: state.team.length ? state.team.map((m) => ({ text: `${m.name} · ${m.job || "AI employee"}`, mark: dot[m.status] || dot.working })) : [{ text: "No team yet. Run /hire." }] };
}
function drawScreens(state) {
  if (!screens.size) return;
  const clock = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  for (const sc of screens.values()) {
    const { title, lines } = screenLines(sc.show, state);
    const key = JSON.stringify([hqName(state.company), clock, title, lines]);
    if (key === sc.drawn) continue;
    sc.drawn = key;
    const c = sc.canvas, x = c.getContext("2d"), W = c.width, H = c.height;
    x.fillStyle = "#0b1220"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#13203a"; x.fillRect(0, 0, W, 86);
    x.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif"; x.textBaseline = "middle";
    x.fillStyle = "#e8f1f8"; x.fillText(hqName(state.company).slice(0, 34), 36, 44);
    x.textAlign = "right"; x.fillStyle = "#9fb3c8"; x.fillText(clock, W - 36, 44); x.textAlign = "left";
    x.font = "700 26px ui-monospace, Menlo, Consolas, monospace"; x.fillStyle = "#7fd4ff"; x.fillText(title, 36, 128);
    const rowH = Math.min(62, (H - 210) / Math.max(1, Math.min(6, lines.length)));
    lines.slice(0, 6).forEach((l, i) => {
      const y = 186 + i * rowH;
      if (l.mark) { x.fillStyle = l.mark; x.beginPath(); x.arc(48, y, 9, 0, Math.PI * 2); x.fill(); }
      x.font = "600 32px system-ui, -apple-system, Segoe UI, sans-serif"; x.fillStyle = l.dim ? "#6b7780" : "#e8f1f8";
      let t = l.text; const max = W - 110 - (l.sub ? 190 : 0);
      while (x.measureText(t).width > max && t.length > 4) t = t.slice(0, -2);
      if (t !== l.text) t = t.replace(/.$/, "…");
      x.fillText(t, 72, y);
      if (l.sub) { x.textAlign = "right"; x.font = "500 26px system-ui, sans-serif"; x.fillStyle = "#9fb3c8"; x.fillText(l.sub, W - 36, y); x.textAlign = "left"; }
    });
    x.fillStyle = "#3ccf7a"; x.beginPath(); x.arc(44, H - 34, 8, 0, Math.PI * 2); x.fill();
    x.font = "700 22px ui-monospace, Menlo, Consolas, monospace"; x.fillStyle = "#9fb3c8"; x.fillText("LIVE", 62, H - 33);
    sc.texture.needsUpdate = true;
  }
  requestRender();
}
setInterval(() => { if (lastState) drawScreens(lastState); }, 30_000); // the clock on the screens

// ------------------------------------------------------------------ job card ----
// What /hire wrote about a teammate (docs/team/<id>.md), whether they are wired in,
// and a brief to paste into Claude Code, in the five parts from the workshop.
const FIELDS = ["Job", "Comes in", "Goes out", "Hand it work when", "Boundaries, never, even when asked", "When it is stuck", "Checked by", "First shift", "Done means"];
let cardFor = null;
function fieldsOf(doc) {
  const out = {};
  for (const line of String(doc || "").split(/\r?\n/)) {
    const m = line.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}
function li(ok, html) {
  const el = document.createElement("li");
  if (!ok) el.className = "no";
  el.innerHTML = `<span>${html}</span>`;
  return el;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
async function openCard(member, tagEl) {
  cardFor = member.id || member.name;
  document.querySelectorAll("button.tag[aria-expanded=true]").forEach((b) => b.setAttribute("aria-expanded", "false"));
  tagEl?.setAttribute("aria-expanded", "true");
  const st = STATUS[member.status] || STATUS.working;
  $("card-status").innerHTML = `<i style="background:${st.dot}"></i>${esc(st.word)}`;
  $("card-name").textContent = member.name;
  $("card-job").textContent = member.job;
  $("card-wired").replaceChildren(li(true, "Loading the job card"));
  $("card-fields").replaceChildren();
  $("card-brief").textContent = "";
  $("card").hidden = false;
  let info = { roster: false, agent: null, doc: null };
  try {
    if (member.id) { const r = await fetch("/api/team/" + encodeURIComponent(member.id), { cache: "no-store" }); if (r.ok) info = await r.json(); }
  } catch { /* server gone: the offline note says so */ }
  if (cardFor !== (member.id || member.name)) return; // another name was clicked meanwhile
  const id = esc(member.id || "name");
  $("card-wired").replaceChildren(
    li(info.roster, info.roster ? "Listed in <code>roster.json</code>" : "Not in <code>roster.json</code> (it sits here from team.json)"),
    li(Boolean(info.agent), info.agent ? `Agent file <code>${esc(info.agent)}</code>` : `No agent file. Run <code>/hire</code> in your desk folder.`),
    li(Boolean(info.doc), info.doc ? `Job card <code>docs/team/${id}.md</code>` : `No job card at <code>docs/team/${id}.md</code>`),
    li(Boolean(lastState?.brain?.reads), lastState?.brain?.reads ? "Reads <code>brain/</code> before every task" : "Does not read <code>brain/</code> yet: add it to <code>CLAUDE.md</code>"),
  );
  const f = fieldsOf(info.doc);
  for (const key of FIELDS) {
    if (!f[key]) continue;
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = key.startsWith("Boundaries") ? "Never" : key;
    dd.textContent = f[key];
    $("card-fields").append(dt, dd);
  }
  const never = f["Boundaries, never, even when asked"];
  $("card-brief").textContent = [
    `Use ${member.name} for this task.`,
    "Goal: [what done looks like]",
    "Input: [what to read]",
    "Output: [format and filename]",
    "Check: [how I will know it is right]",
    `Never: ${never ? never.replace(/\.$/, "") : "[what it must not do]"}`,
  ].join("\n");
}
function closeCard() {
  $("card").hidden = true;
  cardFor = null;
  document.querySelectorAll("button.tag[aria-expanded=true]").forEach((b) => { b.setAttribute("aria-expanded", "false"); });
}
$("card-close").addEventListener("click", closeCard);

// the panel on the right: Today, Brain, Work
const TABS = ["today", "brain", "work"];
function showTab(name) {
  for (const t of TABS) {
    $("tab-" + t).setAttribute("aria-selected", String(t === name));
    $("tab-" + t).tabIndex = t === name ? 0 : -1;
    $("pane-" + t).hidden = t !== name;
  }
  try { localStorage.setItem("hq-tab", name); } catch { /* private window */ }
}
TABS.forEach((t, i) => {
  $("tab-" + t).addEventListener("click", () => showTab(t));
  $("tab-" + t).addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step) { const n = TABS[(i + step + TABS.length) % TABS.length]; showTab(n); $("tab-" + n).focus(); }
  });
});
try { const saved = localStorage.getItem("hq-tab"); if (TABS.includes(saved)) showTab(saved); } catch { /* private window */ }
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("card").hidden) closeCard(); });
$("card-copy").addEventListener("click", async () => {
  const b = $("card-copy");
  try { await navigator.clipboard.writeText($("card-brief").textContent); b.textContent = "Copied"; }
  catch { getSelection().selectAllChildren($("card-brief")); b.textContent = "Selected: press Ctrl+C"; }
  setTimeout(() => { b.textContent = "Copy the brief"; }, 1800);
});

// ---------------------------------------------------------------------- state ----
let last = { company: "", team: "", decor: "", bigs: "" };
let lastState = null;
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
    const bigKey = JSON.stringify(bigsOf(state.accessories));
    const rebuild = teamKey !== last.team || companyKey !== last.company || bigKey !== last.bigs || !layout;
    if (rebuild) {
      layout = computeLayout(state.team.length, bigsOf(state.accessories));
      buildRoom(layout, state.company);
      await buildTeam(layout, state.team);
      fitCamera();
    }
    const decorKey = JSON.stringify([state.accessories, state.custom, state.logo]);
    if (rebuild || decorKey !== last.decor) await syncDecor(state, layout, rebuild && last.team === "");
    lastState = state;
    renderUI(state);
    drawScreens(state);
    last = { company: companyKey, team: teamKey, decor: decorKey, bigs: bigKey };
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
window.hq = {
  scene, camera, controls, render: () => requestRender(), layout: () => layout, placed: () => placed.size, desks: () => team.children.length,
  open: (name) => document.querySelector(`button.tag[title^="${CSS.escape(name)}:"]`)?.click(),
};
