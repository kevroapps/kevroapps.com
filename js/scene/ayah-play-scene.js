/* Ayah Play page scene: a small wooden landscape, drawn live with three.js (hosted in js/vendor, no CDN).
   A coral ball with a cream band rolls along a winding path while rounded trees pass behind it.
   Built to Chody's spec of 15 Nov 2026. Everything is code: no pictures, no text, no people, faces or
   animals, no crescent, no sound. The page ships a poster first; this module only ever adds to it.

   The ball and camera never move. The land moves under them (a group offset by the ball's position),
   which keeps the camera at a fixed offset and the shadow map still. The land is one 24 unit section
   built three times in a row (rear, middle, front); the ball stays in the middle one. Because the three
   copies are identical and the path, height and slope match at each join, wrapping the travelled
   distance by one section changes nothing on screen: no fade, no teleport, no reverse. The ball's
   rotation and the camera are never reset. */
import {
  WebGLRenderer, Scene, Color, Fog, PerspectiveCamera, Group, Mesh, BufferGeometry, BufferAttribute,
  MeshStandardMaterial, MeshBasicMaterial, SphereGeometry, CylinderGeometry, HemisphereLight,
  DirectionalLight, CanvasTexture, SRGBColorSpace, PCFSoftShadowMap, NoToneMapping, Vector3, Quaternion,
  PlaneGeometry, MathUtils, LinearMipmapLinearFilter, LinearFilter
} from '../vendor/three-0.170.0.module.min.js';

const TAU = Math.PI * 2;

/* ---- the numbers from the spec ---- */
export const SPEC = {
  ballDiameter: 1,
  bandShare: 0.28,          // of the ball's height
  pathWidth: 1.8,
  sectionArc: 24,           // units along the path centre line
  cycleSeconds: 48,
  speed: 0.5,               // units per second
  nudgeSpeed: 0.65, nudgeUp: 0.25, nudgeDown: 1.5,
  posterSeconds: 12,
  cameraDistance: 6, cameraPitchDeg: 20,
  fovPhone: 40, fovDesktop: 32,
  ballFromTop: 0.6,
  shadowMap: 1024
};
export const POSTER_DISTANCE = SPEC.posterSeconds * SPEC.speed; // 6 units: the pose of the poster and of the first live frame

const C = {
  sky: '#D1D7D6', fog: '#D6D9D3', grass: '#A4BA8C', grassShade: '#91AB79', path: '#D9CDB7',
  coral: '#D7806D', band: '#E7E0D2', trunk: '#A79670', leaves: ['#96B779', '#86A76B', '#77985E'],
  stone: '#DFDDC8', key: '#FFF1DD'
};

const R = SPEC.ballDiameter / 2;

/* ---- the land ---- */
const GRADE = 0.055;          // height lost per unit of travel: a gentle downhill
const AMP = -1.7;              // how far the path wanders to each side
const PHASE = -0.7;
const WIDTH = 36;             // across the land, centred on the section's origin
let LZ = SPEC.sectionArc;     // length of a section along its travel axis, found below so the centre line measures 24

const cx = (q) => AMP * Math.sin((TAU * q) / LZ + PHASE);

// The periodic part of the height. Every term repeats exactly every LZ along q, so sections join.
function lift(x, q) {
  const w = (TAU * q) / LZ;
  const d = x - cx(q);
  const roll = 0.3 * Math.sin(w + 0.9) + 0.16 * Math.sin(2 * w + 2.1);
  const bowl = 1.1 * (1 - Math.exp(-(d * d) / 110));         // the hill rises gently on both sides
  const wave = 0.32 * Math.sin(0.23 * x + w + 0.4) * (1 - Math.exp(-(d * d) / 30));
  return roll * Math.exp(-(d * d) / 220) + bowl + wave;
}
function height(x, q) { return -GRADE * q + lift(x, q); }
function slopes(x, q) {
  const e = 0.02;
  return {
    hx: (height(x + e, q) - height(x - e, q)) / (2 * e),
    hq: (height(x, q + e) - height(x, q - e)) / (2 * e)
  };
}
// normal of the surface in world axes (z runs against q)
function normalAt(x, q, out) {
  const { hx, hq } = slopes(x, q);
  return out.set(-hx, 1, hq).normalize();
}

// make the centre line measure sectionArc: arc length grows a little with the wander, so scale LZ
function centreLine(q) { return new Vector3(cx(q), height(cx(q), q) + 0.035, -q); }
function measureArc() {
  const N = 1200;
  let len = 0;
  let prev = centreLine(0);
  for (let i = 1; i <= N; i++) { const p = centreLine((i / N) * LZ); len += p.distanceTo(prev); prev = p; }
  return len;
}
for (let i = 0; i < 8; i++) LZ *= SPEC.sectionArc / measureArc();

// arc length to q, for travelling at a steady speed along the real path
const ARC_N = 2400;
const arcQ = new Float64Array(ARC_N + 1);
const arcS = new Float64Array(ARC_N + 1);
{
  let prev = centreLine(0), s = 0;
  for (let i = 0; i <= ARC_N; i++) {
    const q = (i / ARC_N) * LZ;
    const p = centreLine(q);
    if (i) s += p.distanceTo(prev);
    arcQ[i] = q; arcS[i] = s; prev = p;
  }
}
function qAtArc(sigma) {
  // the path repeats every sectionArc, so any distance maps into one section and a whole number of sections
  const n = Math.floor(sigma / SPEC.sectionArc);
  const s = sigma - n * SPEC.sectionArc;
  return n * LZ + qInSection(s);
}
function qInSection(s) {
  let lo = 0, hi = ARC_N;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (arcS[mid] <= s) lo = mid; else hi = mid; }
  const f = (s - arcS[lo]) / Math.max(1e-9, arcS[hi] - arcS[lo]);
  return arcQ[lo] + f * (arcQ[hi] - arcQ[lo]);
}
const STEP_Y = () => -GRADE * LZ;  // each section sits this much lower than the one behind it

// The land, for checks that need no graphics: one section repeats every `period` along the travel axis and
// measures `arc` along its centre line; the next section sits `step` lower; path, height and slope repeat exactly.
export const land = {
  get period() { return LZ; },
  get arc() { return arcS[ARC_N]; },
  get step() { return STEP_Y(); },
  centreX: cx, height, slopes, qAtArc
};

// Speed profile of a nudge: up to nudgeSpeed over nudgeUp seconds, back over nudgeDown seconds; a new nudge is
// accepted only when the last one has finished (no stacking).
export function createNudge() {
  let t = Infinity;
  const smooth = (x) => x * x * (3 - 2 * x);
  return {
    start() { if (t !== Infinity) return false; t = 0; return true; },
    update(dt) { if (t !== Infinity) { t += dt; if (t >= SPEC.nudgeUp + SPEC.nudgeDown) t = Infinity; } },
    get active() { return t !== Infinity; },
    speed() {
      if (t === Infinity) return SPEC.speed;
      const lift = SPEC.nudgeSpeed - SPEC.speed;
      if (t < SPEC.nudgeUp) return SPEC.speed + lift * smooth(t / SPEC.nudgeUp);
      return SPEC.speed + lift * (1 - smooth(Math.min(1, (t - SPEC.nudgeUp) / SPEC.nudgeDown)));
    }
  };
}

/* ---- small helpers ---- */
const col = (hex) => new Color(hex);
const tmpColor = new Color();
function grassColor(x, q, out) {
  const w = (TAU * q) / LZ;
  const n = 0.5 + 0.25 * Math.sin(0.31 * x + 1.7 + 2 * w) + 0.25 * Math.sin(0.17 * x - w + 0.8);
  return out.lerpColors(col(C.grass), col(C.grassShade), MathUtils.clamp(n, 0, 1));
}

function terrainGeometry() {
  const cell = 0.8;
  const nx = Math.round(WIDTH / cell), nq = Math.round(LZ / cell);
  const pos = new Float32Array((nx + 1) * (nq + 1) * 3);
  const nor = new Float32Array(pos.length);
  const colr = new Float32Array(pos.length);
  const v = new Vector3(), n = new Vector3(), c = new Color();
  let k = 0;
  for (let j = 0; j <= nq; j++) {
    const q = (j / nq) * LZ - LZ / 2;
    for (let i = 0; i <= nx; i++) {
      const x = -WIDTH / 2 + (i / nx) * WIDTH;
      v.set(x, height(x, q), -q);
      normalAt(x, q, n);
      grassColor(x, q, c);
      pos.set([v.x, v.y, v.z], k); nor.set([n.x, n.y, n.z], k); colr.set([c.r, c.g, c.b], k);
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < nq; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('color', new BufferAttribute(colr, 3));
  g.setIndex(idx);
  return g;
}

// the cream path: a strip that follows the ground, a little above it so nothing flickers
function pathGeometry() {
  const rows = Math.round(LZ / 0.3);
  const offsets = [-0.9, -0.45, 0, 0.45, 0.9];
  const m = offsets.length;
  const pos = new Float32Array((rows + 1) * m * 3), nor = new Float32Array(pos.length), colr = new Float32Array(pos.length);
  const n = new Vector3(), c = col(C.path);
  let k = 0;
  for (let j = 0; j <= rows; j++) {
    const q = (j / rows) * LZ - LZ / 2;
    for (const o of offsets) {
      const x = cx(q) + o * (SPEC.pathWidth / 1.8);
      pos.set([x, height(x, q) + 0.035, -q], k);
      normalAt(x, q, n); nor.set([n.x, n.y, n.z], k);
      colr.set([c.r, c.g, c.b], k);
      k += 3;
    }
  }
  const idx = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < m - 1; i++) {
    const a = j * m + i, b = a + 1, d = a + m, e = d + 1;
    idx.push(a, b, d, b, e, d);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('color', new BufferAttribute(colr, 3));
  g.setIndex(idx);
  return g;
}

/* ---- the ball: its cream band is painted in code, edge antialiased ---- */
function ballTexture(maxAniso) {
  const W = 1024, H = 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = C.coral; g.fillRect(0, 0, W, H);
  // the band covers bandShare of the ball's height: half of it each side of the equator, as a share of the radius
  const half = Math.asin(SPEC.bandShare) / Math.PI * H;       // texture rows from the equator to each band edge
  const mid = H / 2, soft = 1.5;                              // a 1.5 row soft edge: clean, no stair steps
  const grad = g.createLinearGradient(0, mid - half - soft, 0, mid + half + soft);
  const a = soft / (2 * (half + soft));
  grad.addColorStop(0, 'rgba(231,224,210,0)');
  grad.addColorStop(a, C.band);
  grad.addColorStop(1 - a, C.band);
  grad.addColorStop(1, 'rgba(231,224,210,0)');
  g.fillStyle = grad; g.fillRect(0, mid - half - soft, W, 2 * (half + soft));
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace; t.anisotropy = maxAniso; t.generateMipmaps = true;
  t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
  return t;
}

// a soft dark patch of ground contact, drawn in code
function contactTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(46,58,40,0.38)'); r.addColorStop(0.35, 'rgba(46,58,40,0.24)');
  r.addColorStop(0.7, 'rgba(46,58,40,0.05)'); r.addColorStop(1, 'rgba(46,58,40,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace;
  return t;
}

/* ---- the scene ---- */
export function createScene(frame, options = {}) {
  const phone = options.phone ?? (window.matchMedia && matchMedia('(max-width: 640px)').matches);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: !!options.preserveDrawingBuffer });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const dprCap = options.dprCap ?? (phone ? 1.5 : 2);

  const scene = new Scene();
  scene.background = col(C.sky);
  scene.fog = new Fog(col(C.fog), 12, 32);

  const camera = new PerspectiveCamera(36, 1.6, 0.5, 60);
  const pitch = (SPEC.cameraPitchDeg * Math.PI) / 180;
  camera.position.set(0, SPEC.cameraDistance * Math.sin(pitch), SPEC.cameraDistance * Math.cos(pitch));
  camera.lookAt(0, 0, 0);

  // light: one warm key from upper camera-left and slightly forward, about 45 degrees; neutral sky fill
  scene.add(new HemisphereLight(col('#F2F4F2'), col('#E0E4D6'), options.fill ?? 2.05));
  const key = new DirectionalLight(col(C.key), options.keyIntensity ?? 2.0);
  key.position.set(-18, 20, -8);
  key.castShadow = options.shadows !== false;
  key.shadow.mapSize.set(SPEC.shadowMap, SPEC.shadowMap);
  const sc = key.shadow.camera;
  sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 4; sc.far = 70;
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 2.5;
  key.shadow.intensity = options.shadowIntensity ?? 0.85;
  scene.add(key); scene.add(key.target);

  // shared materials and geometry, used by all three sections
  const grassMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const pathMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const trunkMat = new MeshStandardMaterial({ color: col(C.trunk), roughness: 0.85 });
  const leafMats = C.leaves.map((h) => new MeshStandardMaterial({ color: col(h), roughness: 0.9 }));
  const stoneMat = new MeshStandardMaterial({ color: col(C.stone), roughness: 0.9 });
  const terrainGeo = terrainGeometry(), pathGeo = pathGeometry();
  const trunkGeo = new CylinderGeometry(0.1, 0.17, 1.45, 10);
  const blobGeo = new SphereGeometry(1, 16, 12);
  const stoneGeo = new SphereGeometry(1, 12, 8);

  function makeTree(x, q, s) {
    const y = height(x, q);
    const t = new Group();
    const trunk = new Mesh(trunkGeo, trunkMat); trunk.scale.set(s, s, s); trunk.position.y = 0.7 * s; trunk.castShadow = true; t.add(trunk);
    // overlapping, slightly stretched spheres
    const blobs = [[0, 2.0, 0, 0.95, 1.05], [-0.62, 1.7, 0.1, 0.7, 0.95], [0.6, 1.8, -0.12, 0.72, 1], [0.05, 2.55, 0.05, 0.6, 1.1]];
    blobs.forEach((b, i) => {
      const m = new Mesh(blobGeo, leafMats[i % 3]);
      m.scale.set(b[3] * s, b[3] * b[4] * s, b[3] * s);
      m.position.set(b[0] * s, b[1] * s, b[2] * s);
      m.castShadow = true; m.receiveShadow = true; t.add(m);
    });
    t.position.set(x, y - 0.06, -q);
    return t;
  }
  function makeStones(x, q) {
    const g = new Group();
    [[0, 0, 0.34], [0.55, 0.25, 0.22], [-0.35, 0.4, 0.18]].forEach(([dx, dz, r]) => {
      const m = new Mesh(stoneGeo, stoneMat);
      m.scale.set(r * 1.3, r * 0.58, r);
      const px = x + dx, pq = q - dz;
      m.position.set(px, height(px, pq) + r * 0.2, -pq);
      m.castShadow = true; m.receiveShadow = true; g.add(m);
    });
    return g;
  }
  function makeSection() {
    const g = new Group();
    const land = new Mesh(terrainGeo, grassMat); land.receiveShadow = true; g.add(land);
    const path = new Mesh(pathGeo, pathMat); path.receiveShadow = true; g.add(path);
    // four trees and one pair of stone groups per section, well away from the path
    [[-7.0, 4.6, 0.9], [0.6, -3.8, 0.85], [8.0, 4.6, 0.9]].forEach(([q, off, s]) => {
      const x = cx(q) + off;
      g.add(makeTree(x, q, s));
    });
    g.add(makeStones(cx(-2.8) - 2.6, -2.8));
    return g;
  }
  const world = new Group();
  const sections = [-1, 0, 1].map((k) => {
    const g = makeSection();
    g.position.set(0, k * STEP_Y(), -k * LZ);
    world.add(g);
    return g;
  });
  scene.add(world);

  // the ball and its contact patch stay at the origin
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ball = new Mesh(new SphereGeometry(R, 40, 28), new MeshStandardMaterial({ map: ballTexture(maxAniso), roughness: 0.58, metalness: 0 }));
  ball.castShadow = true;
  scene.add(ball);
  const patch = new Mesh(new PlaneGeometry(2.6, 2.6), new MeshBasicMaterial({ map: contactTexture(), transparent: true, depthWrite: false, fog: false }));
  scene.add(patch);

  /* ---- state ---- */
  const up = new Vector3(0, 1, 0), nrm = new Vector3(), pos = new Vector3(), prev = new Vector3(), delta = new Vector3(), axis = new Vector3(), q4 = new Quaternion(), zAxis = new Vector3(0, 0, 1);
  const STEP = new Vector3(0, STEP_Y(), -LZ);
  // Distance along the path from the middle of the middle section. The three sections cover -36 to 36. The ball
  // travels from START to WRAP_AT, then the distance drops by one section: the rear section (already 18 or more
  // behind) is "recycled" to the front, and since the sections are identical nothing on screen changes. At
  // WRAP_AT the land still reaches 30 units ahead and at -18 it reaches 18 behind, beyond the fog and the camera.
  const START = -SPEC.sectionArc / 2, WRAP_AT = 6;
  let s = START;
  const nudgeState = createNudge();
  let first = true;
  // the ball starts tilted so the band shows as a ring that tumbles over as it rolls
  ball.quaternion.setFromAxisAngle(new Vector3(0.62, 0.18, 0.76).normalize(), 2.35);

  function ballCentre(distance, out) {
    const q = qAtArc(distance);
    const x = cx(q), y = height(x, q) + 0.035;
    normalAt(x, q, nrm);
    return out.set(x, y, -q).addScaledVector(nrm, R);
  }
  function place() {
    ballCentre(s, pos);
    // the land slides back so the ball stays at the origin; the contact patch lies on the ground under it
    world.position.copy(pos).negate();
    const q = qAtArc(s), x = cx(q);
    normalAt(x, q, nrm);
    patch.position.set(0, 0, 0).addScaledVector(nrm, -R + 0.13);
    patch.quaternion.setFromUnitVectors(zAxis, nrm);
    key.target.position.set(0, 0, 0);
  }
  function advance(dist) {
    // roll: the rotation comes from the distance the ball really travelled
    let left = dist;
    while (left > 1e-9) {
      const d = Math.min(left, 0.05);
      left -= d;
      prev.copy(pos);
      let ns = s + d, wrapped = false;
      if (ns >= WRAP_AT) { ns -= SPEC.sectionArc; wrapped = true; }
      s = ns;
      ballCentre(s, pos);
      delta.subVectors(pos, prev);
      if (wrapped) delta.add(STEP);
      const L = delta.length();
      if (L > 1e-7) {
        axis.crossVectors(up, delta).normalize();
        q4.setFromAxisAngle(axis, L / R);
        ball.quaternion.premultiply(q4);
      }
    }
    place();
  }
  // start at the pose of the poster: 12 seconds of travel
  ballCentre(s, pos); place();
  advance(POSTER_DISTANCE);

  /* ---- size ---- */
  let W = 0, H = 0;
  function resize(w, h) {
    w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
    W = w; H = h;
    renderer.setPixelRatio(Math.min(options.dpr ?? window.devicePixelRatio ?? 1, dprCap));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = MathUtils.lerp(SPEC.fovPhone, SPEC.fovDesktop, MathUtils.clamp((aspect - 0.8) / (1.6 - 0.8), 0, 1));
    // frame offset: the ball (at the centre of the full view) sits at 60 percent of the frame height
    camera.setViewOffset(w, h, 0, -(SPEC.ballFromTop - 0.5) * h, w, h);
    camera.updateProjectionMatrix();
  }
  function render() { renderer.render(scene, camera); }

  /* ---- loop ---- */
  let raf = 0, last = null, running = false;
  function tick(now) {
    if (!running) return;
    if (last === null) last = now;                       // resume without catching up the time that passed
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    nudgeState.update(dt);
    advance(nudgeState.speed() * dt);
    render();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; last = null; raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); last = null; }

  function destroy() {
    stop();
    renderer.dispose();
    [terrainGeo, pathGeo, trunkGeo, blobGeo, stoneGeo].forEach((g) => g.dispose());
  }

  const api = {
    canvas, renderer, start, stop, resize, render, destroy,
    nudge() { return nudgeState.start(); },
    get running() { return running; },
    get triangles() { render(); return renderer.info.render.triangles; },
    get info() { return { sectionArc: land.arc, sectionZ: LZ, step: STEP_Y() }; },
    setDistance(d) { // for the still and for tests: the pose after travelling d units from the start of the cycle
      s = START; ball.quaternion.setFromAxisAngle(new Vector3(0.62, 0.18, 0.76).normalize(), 2.35);
      ballCentre(s, pos); place(); advance(d);
    },
    get distance() { return s; },
    get speed() { return nudgeState.speed(); },
    get nudging() { return nudgeState.active; }
  };
  frame.appendChild(canvas);
  return api;
}
