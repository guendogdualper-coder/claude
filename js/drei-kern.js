// 3D-Grafik (ab Version 4.0): Welt, Figuren und Monster als echte 3D-Szene mit three.js.
// Spiellogik, Kollision und Menüs bleiben unverändert. Die Welt bleibt eine flache Karte
// (x nach rechts, y nach unten, 32 Pixel je Kachel) und liegt hier auf dem Boden der Szene:
// x → x, y → z, eine Kachel = eine Einheit, die Höhe ist y.
// Namen, Schadenszahlen, Geschosse und Zaubereffekte malt weiterhin das 2D-Canvas darüber;
// jede dieser Zeichnungen wird an die Stelle gerückt, an der ihr Punkt im 3D-Bild liegt (V3.anchor).
//
// Alle Formen haben weiche, abgerundete Kanten (abgerundete Quader, Kapseln, glatte Kugeln),
// dazu ein dünner dunkler Umriss und weiche Zeichentrick-Schattierung wie im 2D-Spiel.

const U3 = 1 / TILE;
const V3 = {
  on: false,
  gl: null,
  scene: null,
  camera: null,
  sun: null,
  hemi: null,
  canvas: null,
  pitch: 0.86,
  time: 0,
  focus: { x: 0, y: 0 },
  fadeScreen: new Float32Array(4)
};

function v3Supported() {
  if (typeof THREE === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// --- Materialien -----------------------------------------------------------------------------

// Weiche Zeichentrick-Schattierung: vier Helligkeitsstufen mit sanften Übergängen
let toonGradient = null;
function toonRamp() {
  if (toonGradient) return toonGradient;
  const d = new Uint8Array([96, 96, 96, 255, 150, 150, 150, 255, 212, 212, 212, 255, 255, 255, 255, 255]);
  toonGradient = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  toonGradient.minFilter = THREE.LinearFilter;
  toonGradient.magFilter = THREE.LinearFilter;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

// Objekte zwischen Kamera und Spieler werden in einem kleinen Kreis um ihn durchsichtig gerastert,
// damit man hinter Bäumen, Dächern und Mauern sieht, wo man steht (wie im 2D-Spiel).
const FADE_UNIFORM = { value: V3.fadeScreen };
function addFade(mat, minHeight) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uFade = FADE_UNIFORM;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying float vFadeY;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvFadeY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', `uniform vec4 uFade;\nvarying float vFadeY;\nvoid main() {
	if (uFade.z > 0.0 && vFadeY > ${minHeight.toFixed(2)} && gl_FragCoord.z < uFade.w) {
		vec2 fd = gl_FragCoord.xy - uFade.xy;
		if (dot(fd, fd) < uFade.z * uFade.z && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
	}`);
  };
  const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => key() + 'fade' + minHeight;
  return mat;
}

function toonMat(o = {}) {
  return new THREE.MeshToonMaterial(Object.assign({ vertexColors: true, gradientMap: toonRamp() }, o));
}

// Umriss: rückseitige Hülle, entlang der Normalen um eine feste Dicke aufgeblasen
function outlineMat(width, skinning) {
  const m = new THREE.MeshBasicMaterial({ color: 0x1a1210, side: THREE.BackSide, skinning: !!skinning });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n\ttransformed += normalize(normal) * ${width.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => 'outline' + width + (skinning ? 's' : '');
  return m;
}

const MAT3 = {};
function mat3(key, make) {
  if (!MAT3[key]) MAT3[key] = make();
  return MAT3[key];
}

// --- Formen mit weichen Kanten -----------------------------------------------------------------

const GEO3 = new Map();
function geo3(key, make) {
  let g = GEO3.get(key);
  if (!g) {
    g = make();
    GEO3.set(key, g);
  }
  return g;
}

// Quader mit abgerundeten Kanten und Ecken (r = Rundung), glatte Normalen
function roundBox(w, h, d, r, k) {
  r = Math.max(0.001, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
  // kleine Teile brauchen weniger Unterteilung, große Kanten bleiben schön rund
  if (k == null) k = r < 0.045 ? 1 : r < 0.13 ? 2 : 3;
  return geo3(`rb${w},${h},${d},${r},${k}`, () => {
    const n = 2 * k + 1;
    const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const half = [w / 2, h / 2, d / 2];
    const inner = half.map((v) => v - r);
    const map = (u, hv) => {
      const i = Math.round((u + 0.5) * n);
      if (i <= k) return -hv + r * (i / k);
      return hv - r * ((n - i) / k);
    };
    const p = [0, 0, 0];
    const c = [0, 0, 0];
    for (let i = 0; i < pos.count; i++) {
      p[0] = map(pos.getX(i), half[0]);
      p[1] = map(pos.getY(i), half[1]);
      p[2] = map(pos.getZ(i), half[2]);
      for (let a = 0; a < 3; a++) c[a] = Math.max(-inner[a], Math.min(inner[a], p[a]));
      let dx = p[0] - c[0];
      let dy = p[1] - c[1];
      let dz = p[2] - c[2];
      const l = Math.hypot(dx, dy, dz);
      if (l > 1e-6) {
        dx /= l; dy /= l; dz /= l;
        pos.setXYZ(i, c[0] + dx * r, c[1] + dy * r, c[2] + dz * r);
        nor.setXYZ(i, dx, dy, dz);
      } else {
        pos.setXYZ(i, p[0], p[1], p[2]);
      }
    }
    return g;
  });
}

// Gleiche Eckpunkte zusammenlegen, damit die Normalen weich werden (keine sichtbaren Facetten)
function smoothGeo(g) {
  const P = g.attributes.position;
  const map = new Map();
  const pos = [];
  const idx = [];
  for (let i = 0; i < P.count; i++) {
    const key = `${Math.round(P.getX(i) * 1e4)},${Math.round(P.getY(i) * 1e4)},${Math.round(P.getZ(i) * 1e4)}`;
    let j = map.get(key);
    if (j === undefined) {
      j = pos.length / 3;
      map.set(key, j);
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
    }
    idx.push(j);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

function sphere3(r, ws = 12, hs = 9) {
  return geo3(`sp${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}

// Drehkörper aus einem Profil [[radius, höhe], ...] von unten nach oben
function lathe3(key, pts, seg = 12) {
  return geo3('la' + key + seg, () => {
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), seg);
    g.computeVertexNormals();
    return g;
  });
}

// Kapsel von y = 0 nach unten bis y = -len, oben Radius r1, unten r2 (Arme, Beine, Schwänze)
function limb3(len, r1, r2 = r1, seg = 9) {
  const pts = [];
  const q = 3;
  for (let i = 0; i <= q; i++) {
    const a = Math.PI / 2 - (i / q) * (Math.PI / 2);
    pts.push([Math.cos(a) * r2, -len + r2 - Math.sin(a) * r2]);
  }
  for (let i = 0; i <= q; i++) {
    const a = (i / q) * (Math.PI / 2);
    pts.push([Math.cos(a) * r1, -r1 + Math.sin(a) * r1]);
  }
  pts.sort((a, b) => a[1] - b[1]);
  pts[0][0] = 0;
  pts[pts.length - 1][0] = 0;
  return lathe3(`limb${len},${r1},${r2}`, pts, seg);
}

// Glied zwischen zwei Punkten a → b (z. B. Spinnenbeine, Äste)
const _down = new THREE.Vector3(0, -1, 0);
function limbBetween(A, a, b, r1, r2, color, o = {}) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_down, d.normalize());
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...a), q, new THREE.Vector3(1, 1, 1));
  A(limb3(+len.toFixed(2), r1, r2, o.seg || 7), color, Object.assign({}, o, { m: o.parentM ? o.parentM.clone().multiply(m) : m }));
}

// Spitzer Kegel mit runder Basis und weicher Spitze (Hörner, Ohren, Dornen, Stacheln)
function horn3(len, r, seg = 10) {
  const pts = [[0, 0], [r * 0.9, 0.02 * len], [r, 0.12 * len], [r * 0.72, 0.45 * len], [r * 0.38, 0.75 * len], [r * 0.12, 0.95 * len], [0, len]];
  return lathe3(`horn${len},${r}`, pts, seg);
}

// Rundes Dach mit hochgezogenen Ecken (asiatisches Walmdach), Grundfläche w × d, Höhe h
function roofGeo(w, d, h, lift = 0.35) {
  return geo3(`roof${w},${d},${h},${lift}`, () => {
    const around = 32;
    const rings = 7;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= rings; j++) {
      const t = j / rings;
      const s = 1 - t;
      const y = h * Math.pow(t, 1.55);
      for (let i = 0; i <= around; i++) {
        const a = (i / around) * Math.PI * 2;
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        const m = Math.max(Math.abs(cx), Math.abs(cz));
        const sx = cx / m;
        const sz = cz / m;
        // Ecken: so weit, wie der Punkt von der Seitenmitte entfernt ist
        const corner = Math.pow(Math.min(Math.abs(sx), Math.abs(sz)), 3);
        const up = lift * corner * Math.pow(1 - t, 2.4);
        pos.push(sx * (w / 2) * s, y + up, sz * (d / 2) * s);
      }
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < around; i++) {
        const a = j * (around + 1) + i;
        const b = a + around + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

// --- Zusammenbauen: viele Teile → wenige Meshes ----------------------------------------------
// Jedes Teil bekommt seine Farbe als Eckenfarbe und (bei Figuren) den Knochen, an dem es hängt.
// Pro Figur entstehen so nur ein beleuchtetes, ein leuchtendes und ein durchscheinendes Mesh.

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _n3 = new THREE.Matrix3();
const _c = new THREE.Color();

function partMatrix(o) {
  if (o.m) return o.m.clone();
  _e.set(o.r ? o.r[0] : 0, o.r ? o.r[1] : 0, o.r ? o.r[2] : 0, o.order || 'XYZ');
  _q.setFromEuler(_e);
  const s = o.s == null ? 1 : o.s;
  _v2.set(...(Array.isArray(s) ? s : [s, s, s]));
  _v1.set(...(o.p || [0, 0, 0]));
  return new THREE.Matrix4().compose(_v1, _q, _v2);
}

class Bake3 {
  constructor(skinned = false) {
    this.skinned = skinned;
    this.lists = {};
  }

  // o: p (Position), r (Drehung), s (Größe), bone, mat ('lit' | 'glow' | 'aura'), shade (Schatten nach unten), m (Matrix)
  add(geo, color, o = {}) {
    const key = o.mat || 'lit';
    (this.lists[key] = this.lists[key] || []).push({ geo, color, m: partMatrix(o), bone: o.bone || 0, shade: o.shade || 0, parent: o.parent || null, top: o.top ? new THREE.Color(o.top) : null, topK: o.topK == null ? 0.5 : o.topK });
    return this;
  }

  build() {
    const out = {};
    for (const k in this.lists) out[k] = mergeParts(this.lists[k], this.skinned);
    return out;
  }
}

function mergeParts(list, skinned) {
  let nv = 0;
  let ni = 0;
  for (const it of list) {
    nv += it.geo.attributes.position.count;
    ni += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const si = skinned ? new Float32Array(nv * 4) : null;
  const sw = skinned ? new Float32Array(nv * 4) : null;
  let vo = 0;
  let io = 0;
  for (const it of list) {
    const g = it.geo;
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const m = it.parent ? it.parent.clone().multiply(it.m) : it.m;
    _n3.getNormalMatrix(m);
    _c.set(it.color);
    let minY = 0;
    let span = 1;
    if (it.shade) {
      if (!g.boundingBox) g.computeBoundingBox();
      minY = g.boundingBox.min.y;
      span = Math.max(1e-4, g.boundingBox.max.y - minY);
    }
    for (let i = 0; i < P.count; i++) {
      _v1.set(P.getX(i), P.getY(i), P.getZ(i));
      const ly = _v1.y;
      _v1.applyMatrix4(m);
      pos[(vo + i) * 3] = _v1.x;
      pos[(vo + i) * 3 + 1] = _v1.y;
      pos[(vo + i) * 3 + 2] = _v1.z;
      _v2.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_n3).normalize();
      nor[(vo + i) * 3] = _v2.x;
      nor[(vo + i) * 3 + 1] = _v2.y;
      nor[(vo + i) * 3 + 2] = _v2.z;
      const k = it.shade ? 1 - it.shade * (1 - (ly - minY) / span) : 1;
      let r = _c.r;
      let gg = _c.g;
      let bb = _c.b;
      if (it.top) {
        // nach oben zeigende Flächen nehmen die zweite Farbe an (Moos, Schnee, helle Dachziegel)
        const t = Math.max(0, Math.min(1, (_v2.y - 0.25) / 0.6)) * it.topK;
        r += (it.top.r - r) * t;
        gg += (it.top.g - gg) * t;
        bb += (it.top.b - bb) * t;
      }
      col[(vo + i) * 3] = r * k;
      col[(vo + i) * 3 + 1] = gg * k;
      col[(vo + i) * 3 + 2] = bb * k;
      if (skinned) {
        si[(vo + i) * 4] = it.bone;
        sw[(vo + i) * 4] = 1;
      }
    }
    if (g.index) {
      const I = g.index;
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      io += I.count;
    } else {
      for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
      io += P.count;
    }
    vo += P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (skinned) {
    out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// --- Einrichten --------------------------------------------------------------------------------

function v3Init() {
  const canvas = document.getElementById('welt3d');
  if (!canvas || !v3Supported()) return false;
  try {
    V3.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  V3.canvas = canvas;
  canvas.hidden = false;
  const gl = V3.gl;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  V3.scene = new THREE.Scene();
  V3.scene.background = new THREE.Color('#9ec8e0');
  V3.scene.fog = new THREE.Fog('#9ec8e0', 30, 64);
  V3.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 160);
  V3.hemi = new THREE.HemisphereLight(0xe4f2ff, 0x5a6a40, 0.62);
  V3.scene.add(V3.hemi);
  V3.sun = new THREE.DirectionalLight(0xfff0d4, 0.92);
  V3.sun.castShadow = true;
  const sc = V3.sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
  sc.updateProjectionMatrix();
  V3.sun.shadow.bias = -0.0008;
  V3.sun.shadow.normalBias = 0.02;
  V3.scene.add(V3.sun, V3.sun.target);
  // Warme Lichter von Laternen, Feuerbecken und Portalen: die vier nächsten leuchten echt
  V3.points = [0, 1, 2, 3].map(() => {
    const l = new THREE.PointLight(0xffb060, 0, 7, 2);
    V3.scene.add(l);
    return l;
  });
  V3.terrain = new THREE.Group();
  V3.objects = new THREE.Group();
  V3.actors = new THREE.Group();
  V3.scene.add(V3.terrain, V3.objects, V3.actors);
  v3ApplyGraphics();
  V3.on = true;
  document.body.classList.add('drei');
  return true;
}

// Grafikstufe: Auflösung und Schatten
function v3ApplyGraphics() {
  if (!V3.gl) return;
  const g = gfx();
  if (V3.builtFor && V3.builtFor !== opts.graphics) v3ClearChunks();
  V3.builtFor = opts.graphics;
  V3.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, renderer.maxDpr || g.dpr));
  V3.sun.castShadow = g.castShadows;
  const size = opts.graphics === 'hoch' ? 2048 : 1024;
  if (V3.sun.shadow.mapSize.x !== size) {
    V3.sun.shadow.mapSize.set(size, size);
    if (V3.sun.shadow.map) {
      V3.sun.shadow.map.dispose();
      V3.sun.shadow.map = null;
    }
  }
  v3Resize();
}

function v3Resize() {
  if (!V3.gl) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  V3.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, renderer.maxDpr || gfx().dpr));
  V3.gl.setSize(w, h, false);
  V3.camera.aspect = w / h;
  V3.camera.updateProjectionMatrix();
}

// --- Stimmung je Gebiet: Himmel, Nebel, Licht ------------------------------------------------

const MOOD3 = {
  dorf: { sky: '#a8d4ec', sun: '#fff0d4', sunI: 0.95, hemi: '#e4f2ff', ground: '#6a7a48', hemiI: 0.62 },
  wiesen: { sky: '#a8d8ee', sun: '#fff2d0', sunI: 0.98, hemi: '#e8f6ff', ground: '#6a8a40', hemiI: 0.64 },
  wald: { sky: '#7aa6a0', sun: '#ffe8c0', sunI: 0.72, hemi: '#cfe8e0', ground: '#2e4a2a', hemiI: 0.56, near: 22, far: 52 },
  orktal: { sky: '#d8c08a', sun: '#ffe0a8', sunI: 0.95, hemi: '#fff0d0', ground: '#8a6a3a', hemiI: 0.6 },
  oedland: { sky: '#a8a098', sun: '#f0dcc8', sunI: 0.78, hemi: '#e0d8d0', ground: '#4a4440', hemiI: 0.58, near: 24, far: 56 },
  frost: { sky: '#cfe4f4', sun: '#f4f8ff', sunI: 0.9, hemi: '#f0f8ff', ground: '#9ab0c8', hemiI: 0.7 },
  moor: { sky: '#6a7a68', sun: '#d8e8c0', sunI: 0.6, hemi: '#b8c8b0', ground: '#2a3a28', hemiI: 0.52, near: 18, far: 46 },
  vulkan: { sky: '#5a3028', sun: '#ffb080', sunI: 0.75, hemi: '#ffb890', ground: '#3a1a14', hemiI: 0.5, near: 22, far: 54 },
  oasenlager: { sky: '#e8d4a0', sun: '#fff0c8', sunI: 1, hemi: '#fff4e0', ground: '#a88a50', hemiI: 0.62 },
  sandwueste: { sky: '#ecd8a8', sun: '#fff0c8', sunI: 1, hemi: '#fff4e0', ground: '#b09050', hemiI: 0.62 },
  nagadschungel: { sky: '#7aa088', sun: '#f0f0c0', sunI: 0.75, hemi: '#d0e8d0', ground: '#2a4a30', hemiI: 0.56, near: 22, far: 52 },
  klammwacht: { sky: '#98a4b8', sun: '#e8ecff', sunI: 0.82, hemi: '#d8e0f0', ground: '#4a4a50', hemiI: 0.6 },
  donnerklamm: { sky: '#7a88a8', sun: '#d8e4ff', sunI: 0.75, hemi: '#c8d4f0', ground: '#3a3e4a', hemiI: 0.56, near: 24, far: 56 },
  titanenkamm: { sky: '#4a3a40', sun: '#ffc090', sunI: 0.72, hemi: '#e8c0a8', ground: '#2a1a18', hemiI: 0.5, near: 22, far: 54 },
  dungeon: { sky: '#120e10', sun: '#c8b8d8', sunI: 0.4, hemi: '#8a80a0', ground: '#2a2028', hemiI: 0.42, near: 14, far: 34 }
};
const moodState = { sky: new THREE.Color('#a8d4ec'), sun: new THREE.Color('#fff0d4'), hemi: new THREE.Color('#e4f2ff'), ground: new THREE.Color('#6a7a48'), sunI: 0.95, hemiI: 0.62, near: 30, far: 64 };
const _mc = new THREE.Color();

function v3UpdateMood(dt, x, y) {
  const zone = zoneAt(x, y);
  const m = zone.dungeon ? MOOD3.dungeon : MOOD3[zone.id] || MOOD3.dorf;
  const k = Math.min(1, dt * 1.2);
  const s = moodState;
  s.sky.lerp(_mc.set(m.sky), k);
  s.sun.lerp(_mc.set(m.sun), k);
  s.hemi.lerp(_mc.set(m.hemi), k);
  s.ground.lerp(_mc.set(m.ground), k);
  s.sunI += (m.sunI - s.sunI) * k;
  s.hemiI += (m.hemiI - s.hemiI) * k;
  s.near += ((m.near || 30) - s.near) * k;
  s.far += ((m.far || 64) - s.far) * k;
  V3.scene.background.copy(s.sky);
  V3.scene.fog.color.copy(s.sky);
  V3.scene.fog.near = s.near;
  V3.scene.fog.far = s.far;
  V3.sun.color.copy(s.sun);
  V3.sun.intensity = s.sunI;
  V3.hemi.color.copy(s.hemi);
  V3.hemi.groundColor.copy(s.ground);
  V3.hemi.intensity = s.hemiI;
}

// --- Kamera und Umrechnung Bildschirm ↔ Welt ----------------------------------------------------

const CAM3 = { nah: 0.86, normal: 1, weit: 1.2 };

function v3PlaceCamera(fx, fy) {
  const r = renderer;
  const cam = V3.camera;
  // so weit weg, dass etwa so viel Welt zu sehen ist wie im 2D-Spiel (etwas mehr Überblick)
  const viewH = r.h / r.zoom * U3;
  const fov = (cam.fov * Math.PI) / 180;
  const dist = (viewH * Math.sin(V3.pitch)) / (2 * Math.tan(fov / 2)) * 0.98 * (CAM3[opts.camera] || 1) * (V3.zoomMul || 1);
  const tx = fx * U3;
  const tz = fy * U3;
  const ty = 0.7;
  cam.position.set(tx, ty + Math.sin(V3.pitch) * dist, tz + Math.cos(V3.pitch) * dist);
  cam.lookAt(tx, ty, tz);
  cam.updateMatrixWorld();
  // Sonne steht im Südosten hoch am Himmel, der Schattenbereich folgt der Kamera
  V3.sun.position.set(tx + 9, 24, tz + 13);
  V3.sun.target.position.set(tx, 0, tz - 2);
  V3.sun.target.updateMatrixWorld();
  V3.focus.x = fx;
  V3.focus.y = fy;
}

const _pv = new THREE.Vector3();
// Weltpunkt (Pixel der Karte, Höhe in Einheiten) → Bildschirmpunkt in CSS-Pixeln
function v3Project(wx, wy, h = 0, out = {}) {
  _pv.set(wx * U3, h, wy * U3).project(V3.camera);
  out.x = (_pv.x + 1) * 0.5 * renderer.w;
  out.y = (1 - _pv.y) * 0.5 * renderer.h;
  out.z = _pv.z;
  return out;
}

const _pa = {};
const _pb = {};
// Zeichnet das 2D-Canvas ab hier so, dass der Weltpunkt (wx, wy) an seiner Stelle im 3D-Bild liegt.
// h: Höhe des Punkts, ax/ay: welcher 2D-Punkt dorthin gehört (Standard: derselbe)
function v3Anchor(ctx, wx, wy, h = 0, ax = wx, ay = wy) {
  v3Project(wx, wy, h, _pa);
  v3Project(wx + 32, wy, h, _pb);
  const k = Math.max(0.05, _pb.x - _pa.x) / 32;
  const d = renderer.dpr;
  ctx.setTransform(k * d, 0, 0, k * d, (_pa.x - ax * k) * d, (_pa.y - ay * k) * d);
  return _pa.z < 1;
}

const _ray = new THREE.Vector3();
// Bildschirmpunkt → Punkt auf dem Boden (für Antippen und Klicks)
function v3ScreenToWorld(sx, sy) {
  const cam = V3.camera;
  _ray.set((sx / renderer.w) * 2 - 1, -(sy / renderer.h) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
  const t = -cam.position.y / _ray.y;
  return { x: (cam.position.x + _ray.x * t) * TILE, y: (cam.position.z + _ray.z * t) * TILE };
}

// --- Boden: weiche Übergänge zwischen den Bodenarten, Wasser in Mulden, Höhlenwände als Felsen ---

const CHUNK3 = 16;
const SUB3 = 2;
let groundRGB = null;

function groundColorsRGB() {
  if (groundRGB) return groundRGB;
  groundRGB = GROUND_PALETTE.map((row) => row.map((hex) => {
    _c.set(hex);
    return [_c.r, _c.g, _c.b];
  }));
  return groundRGB;
}

// Kachel-Werte für die Glättung: Farbe, Höhe, Pflaster
const WALL3_H = 1.5;
const WATER3_DEPTH = 0.5;
function tileSample(x, y, out) {
  const w = game.world;
  x = Math.max(0, Math.min(MAP_W - 1, x));
  y = Math.max(0, Math.min(MAP_H - 1, y));
  const i = y * MAP_W + x;
  let g = w.ground[i];
  const pal = groundColorsRGB();
  out.h = 0;
  out.paved = g === GROUND.PLAZA || g === GROUND.FLAGSTONE ? 1 : 0;
  if (w.obj[i] === OBJ.CAVEWALL) {
    out.h = WALL3_H;
    const zone = ZONES[w.zoneIdx[i]];
    _c.set(lighter(zone.dungeon ? zone.dungeon.wall.top : '#3a3430', 0.22));
    out.r = _c.r; out.g = _c.g; out.b = _c.b;
    out.paved = 0;
    return out;
  }
  if (LIQUID.has(g) && w.deco[i] !== DECO.BRIDGE) out.h = -WATER3_DEPTH;
  else if (LIQUID.has(g)) out.h = -WATER3_DEPTH;
  if (g === GROUND.WATER) g = GROUND.SAND;
  else if (g === GROUND.LAVA) g = GROUND.BASALT;
  else if (g === GROUND.BOG) g = GROUND.SWAMP;
  const c = pal[g][g === GROUND.PATH || g === GROUND.PLAZA || g === GROUND.FLAGSTONE ? Math.min(7, (w.shade[i] >> 6) + 3) : w.shade[i] >> 5];
  out.r = c[0]; out.g = c[1]; out.b = c[2];
  return out;
}

// Feine Bodenstruktur (Grasflecken, Kiesel) und Pflastersteine als gemalte Texturen
let groundTex = null;
function groundTextures() {
  if (groundTex) return groundTex;
  const noise = newCanvas(128, 128);
  const nx = noise.getContext('2d');
  nx.fillStyle = '#808080';
  nx.fillRect(0, 0, 128, 128);
  const rnd = mulberry32(99);
  for (let i = 0; i < 900; i++) {
    const v = 100 + Math.floor(rnd() * 60);
    nx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    const s = 1 + rnd() * 3;
    nx.beginPath();
    nx.ellipse(rnd() * 128, rnd() * 128, s, s * 0.6, rnd() * 3, 0, Math.PI * 2);
    nx.fill();
  }
  const cob = newCanvas(128, 128);
  const cx = cob.getContext('2d');
  cx.fillStyle = '#5c5c5c';
  cx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const ox = col * 16 + (row % 2) * 8;
      const oy = row * 16;
      const v = 150 + Math.floor(rnd() * 50);
      for (const sx of [0, -128]) {
        cx.fillStyle = `rgb(${v},${v},${v})`;
        cx.beginPath();
        cx.roundRect(ox + sx + 1.2, oy + 1.2, 13.6, 13.6, 4.5);
        cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.18)';
        cx.fillRect(ox + sx + 4, oy + 3, 7, 2);
      }
    }
  }
  const mk = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  groundTex = { noise: mk(noise), cobble: mk(cob) };
  return groundTex;
}

function groundMat() {
  return mat3('ground', () => {
    const tex = groundTextures();
    const m = toonMat();
    m.onBeforeCompile = (sh) => {
      sh.uniforms.tNoise = { value: tex.noise };
      sh.uniforms.tCobble = { value: tex.cobble };
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'attribute float paved;\nvarying float vPaved;\nvarying vec3 vGW;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvPaved = paved;\n\tvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform sampler2D tNoise;\nuniform sampler2D tCobble;\nvarying float vPaved;\nvarying vec3 vGW;\nvoid main() {')
        .replace('#include <color_fragment>', `#include <color_fragment>
	float nz = texture2D(tNoise, vGW.xz * 0.21).r * 0.6 + texture2D(tNoise, vGW.xz * 0.053).r * 0.4;
	diffuseColor.rgb *= 0.86 + nz * 0.28;
	float cb = texture2D(tCobble, vGW.xz * 0.5).r;
	diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.62 + cb * 0.62), smoothstep(0.35, 0.75, vPaved));`);
    };
    m.customProgramCacheKey = () => 'ground';
    return addFade(m, 0.45);
  });
}

// Wasser, Lava und Moor: Oberfläche mit leichten Wellen, Schaum am Ufer und Glanz
function liquidMat(kind) {
  return mat3('liquid' + kind, () => {
    const P = {
      water: { shallow: '#5ab8c8', deep: '#2a6890', foam: '#e8f8ff', alpha: 0.82, glow: 0 },
      lava: { shallow: '#ffb040', deep: '#d0340e', foam: '#ffe890', alpha: 1, glow: 1 },
      bog: { shallow: '#5a6a3a', deep: '#22301e', foam: '#9aa870', alpha: 0.9, glow: 0 }
    }[kind];
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(P.shallow) },
      uDeep: { value: new THREE.Color(P.deep) },
      uFoam: { value: new THREE.Color(P.foam) },
      uAlpha: { value: P.alpha },
      uGlow: { value: P.glow }
    }]);
    const m = new THREE.ShaderMaterial({
      uniforms,
      fog: true,
      transparent: P.alpha < 1,
      depthWrite: P.alpha >= 1,
      vertexShader: `
        attribute float depth;
        uniform float uTime;
        varying float vDepth;
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec3 p = position;
          vec4 w = modelMatrix * vec4(p, 1.0);
          w.y += sin(w.x * 1.7 + uTime * 1.6) * 0.025 + cos(w.z * 1.3 + uTime * 1.2) * 0.025;
          vDepth = depth;
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform vec3 uFoam;
        uniform float uAlpha;
        uniform float uGlow;
        varying float vDepth;
        varying vec3 vW;
        #include <fog_pars_fragment>
        void main() {
          float d = clamp(vDepth / 0.45, 0.0, 1.0);
          vec3 col = mix(uShallow, uDeep, smoothstep(0.1, 0.9, d));
          float wave = sin(vW.x * 3.1 + uTime * 2.0 + sin(vW.z * 2.3 + uTime)) * 0.5 + 0.5;
          float ripple = sin((vW.x + vW.z) * 5.0 - uTime * 2.6) * 0.5 + 0.5;
          col += (wave * ripple) * 0.07;
          float foam = smoothstep(0.32, 0.0, d) * (0.55 + 0.45 * sin(uTime * 2.2 + vW.x * 4.0 + vW.z * 3.0));
          col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * (uGlow > 0.5 ? 0.6 : 0.75));
          float glint = pow(max(0.0, sin(vW.x * 4.0 + uTime * 1.2) * sin(vW.z * 3.5 - uTime * 0.9)), 18.0);
          col += glint * (uGlow > 0.5 ? 0.25 : 0.22);
          gl_FragColor = vec4(col, uAlpha);
          #include <fog_fragment>
        }`
    });
    return m;
  });
}

function buildTerrainChunk(cx, cy) {
  const w = game.world;
  const S = SUB3;
  const n = CHUNK3 * S + 1;
  const x0 = cx * CHUNK3;
  const y0 = cy * CHUNK3;
  // Kachelwerte für den Block plus Rand
  const span = CHUNK3 + 2;
  const tiles = new Array(span * span);
  const tmp = {};
  for (let ty = 0; ty < span; ty++) {
    for (let tx = 0; tx < span; tx++) {
      tileSample(x0 + tx - 1, y0 + ty - 1, tmp);
      tiles[ty * span + tx] = { r: tmp.r, g: tmp.g, b: tmp.b, h: tmp.h, paved: tmp.paved };
    }
  }
  const T = (tx, ty) => tiles[(ty - y0 + 1) * span + (tx - x0 + 1)];
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const pav = new Float32Array(n * n);
  const depth = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const vx = x0 + i / S;
      const vy = y0 + j / S;
      // bilinear zwischen den Kachelmitten
      const fx = vx - 0.5;
      const fy = vy - 0.5;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const ax = fx - ix;
      const ay = fy - iy;
      const a = T(Math.max(x0 - 1, ix), Math.max(y0 - 1, iy));
      const b = T(Math.min(x0 + CHUNK3, ix + 1), Math.max(y0 - 1, iy));
      const c = T(Math.max(x0 - 1, ix), Math.min(y0 + CHUNK3, iy + 1));
      const d = T(Math.min(x0 + CHUNK3, ix + 1), Math.min(y0 + CHUNK3, iy + 1));
      const mix = (k) => (a[k] * (1 - ax) + b[k] * ax) * (1 - ay) + (c[k] * (1 - ax) + d[k] * ax) * ay;
      let h = mix('h');
      // Felsen oben leicht unruhig, Wiese ganz leicht gewellt
      const hash = (((vx * 7919) ^ (vy * 104729)) >>> 0) % 1000 / 1000;
      if (h > 0.2) h += (hash - 0.5) * 0.18 * (h / WALL3_H);
      else if (h > -0.05) h += Math.sin(vx * 1.3 + vy * 0.7) * Math.cos(vy * 1.1) * 0.035;
      const v = j * n + i;
      pos[v * 3] = vx;
      pos[v * 3 + 1] = h;
      pos[v * 3 + 2] = vy;
      // Felsen werden nach oben heller
      const lift = h > 0.3 ? 1 + (h / WALL3_H) * 0.25 : 1;
      col[v * 3] = mix('r') * lift;
      col[v * 3 + 1] = mix('g') * lift;
      col[v * 3 + 2] = mix('b') * lift;
      pav[v] = mix('paved');
      depth[v] = -h;
    }
  }
  const idx = [];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('paved', new THREE.BufferAttribute(pav, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, groundMat());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);

  // Flüssigkeiten: nur Zellen, in denen der Boden unter der Oberfläche liegt
  const kinds = { water: [], lava: [], bog: [] };
  const kindAt = (tx, ty) => {
    const gg = w.ground[Math.max(0, Math.min(MAP_H - 1, ty)) * MAP_W + Math.max(0, Math.min(MAP_W - 1, tx))];
    return gg === GROUND.LAVA ? 'lava' : gg === GROUND.BOG ? 'bog' : gg === GROUND.WATER ? 'water' : null;
  };
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const v = j * n + i;
      const lo = Math.min(pos[v * 3 + 1], pos[(v + 1) * 3 + 1], pos[(v + n) * 3 + 1], pos[(v + n + 1) * 3 + 1]);
      if (lo > -0.1) continue;
      // Art der Flüssigkeit: nächste flüssige Kachel
      const tx = Math.floor(x0 + (i + 0.5) / S);
      const ty = Math.floor(y0 + (j + 0.5) / S);
      let k = kindAt(tx, ty);
      for (let r = 1; !k && r <= 1; r++) k = kindAt(tx + r, ty) || kindAt(tx - r, ty) || kindAt(tx, ty + r) || kindAt(tx, ty - r);
      kinds[k || 'water'].push(v);
    }
  }
  const LEVEL = -0.14;
  for (const kind in kinds) {
    const cells = kinds[kind];
    if (!cells.length) continue;
    const wp = new Float32Array(cells.length * 4 * 3);
    const wd = new Float32Array(cells.length * 4);
    const wi = [];
    cells.forEach((v, q) => {
      [v, v + 1, v + n, v + n + 1].forEach((u, c) => {
        wp[(q * 4 + c) * 3] = pos[u * 3];
        wp[(q * 4 + c) * 3 + 1] = LEVEL;
        wp[(q * 4 + c) * 3 + 2] = pos[u * 3 + 2];
        wd[q * 4 + c] = Math.max(0, LEVEL - pos[u * 3 + 1]);
      });
      const b = q * 4;
      wi.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
    wg.setAttribute('depth', new THREE.BufferAttribute(wd, 1));
    wg.setIndex(wi);
    wg.computeBoundingSphere();
    const wm = new THREE.Mesh(wg, liquidMat(kind));
    wm.renderOrder = 1;
    group.add(wm);
  }
  return group;
}

// --- Blöcke laden und verwerfen -------------------------------------------------------------------

const chunks3 = new Map();
const CHUNK3_KEEP = 3;

function v3UpdateChunks(fx, fy, budget) {
  const ccx = Math.floor(fx * U3 / CHUNK3);
  const ccy = Math.floor(fy * U3 / CHUNK3);
  const maxX = Math.ceil(MAP_W / CHUNK3) - 1;
  const maxY = Math.ceil(MAP_H / CHUNK3) - 1;
  // Blöcke im Sichtfeld zuerst (die Kamera schaut nach Norden: oben mehr, unten weniger)
  const want = [];
  for (let dy = -2; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = ccx + dx;
      const y = ccy + dy;
      if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
      want.push([x, y, Math.hypot(dx * 1.2, dy + 0.5)]);
    }
  }
  want.sort((a, b) => a[2] - b[2]);
  // Pro Bild höchstens ein Bauschritt (Boden oder Objekte), damit es beim Laufen nicht ruckelt
  let built = 0;
  for (const [x, y] of want) {
    const key = x + ':' + y;
    let ch = chunks3.get(key);
    if (!ch) {
      if (built >= budget) continue;
      built++;
      ch = { terrain: buildTerrainChunk(x, y), objects: null, x, y };
      V3.terrain.add(ch.terrain);
      chunks3.set(key, ch);
      if (budget <= 1) continue;
    }
    if (!ch.objects) {
      if (built >= budget && budget <= 1) continue;
      built++;
      ch.objects = buildObjectChunk(x, y);
      V3.objects.add(ch.objects);
    }
  }
  for (const [key, ch] of chunks3) {
    if (Math.abs(ch.x - ccx) > CHUNK3_KEEP || Math.abs(ch.y - ccy) > CHUNK3_KEEP) {
      disposeTree(ch.terrain);
      if (ch.objects) disposeTree(ch.objects);
      chunks3.delete(key);
    }
  }
}

// Nach einem Wechsel der Grafikstufe alles neu bauen
function v3ClearChunks() {
  for (const ch of chunks3.values()) {
    disposeTree(ch.terrain);
    if (ch.objects) disposeTree(ch.objects);
  }
  chunks3.clear();
}

function disposeTree(obj) {
  if (obj.parent) obj.parent.remove(obj);
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.shared) o.geometry.dispose();
  });
}

// --- Leuchtende Punkte (Laternen, Feuer, Portale): die vier nächsten bekommen echtes Licht -----

const lightSpots3 = [];
function v3UpdateLights(fx, fy) {
  const px = fx * U3;
  const pz = fy * U3;
  const near = [];
  for (const s of lightSpots3) {
    const d = Math.hypot(s.x - px, s.z - pz);
    if (d < 18) near.push([d, s]);
  }
  near.sort((a, b) => a[0] - b[0]);
  V3.points.forEach((l, i) => {
    const e = near[i];
    if (!e) {
      l.intensity = 0;
      return;
    }
    const s = e[1];
    l.position.set(s.x, s.y, s.z);
    l.color.set(s.color);
    l.distance = s.range || 7;
    l.intensity = (s.power || 1) * (0.85 + 0.15 * Math.sin(V3.time * (s.flicker || 3) + s.x));
  });
}

// --- Ein Bild zeichnen ---------------------------------------------------------------------------

let v3Last = 0;
function renderDrei() {
  const r = renderer;
  const ctx = r.ctx;
  const now = performance.now();
  const dt = Math.min(0.1, (now - (v3Last || now)) / 1000);
  v3Last = now;
  V3.time += dt;
  if (!game.world) return;
  let fx;
  let fy;
  if (game.player && game.running) {
    fx = game.player.x;
    fy = game.player.y;
  } else {
    const t = performance.now() / 1000;
    fx = CENTER_X * TILE + Math.cos(t * 0.05) * 300;
    fy = CENTER_Y * TILE + Math.sin(t * 0.05) * 220;
  }
  const shakeX = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  const shakeY = game.shake ? (Math.random() - 0.5) * 2 * game.shake : 0;
  // Für die übrige Logik (Teilchen am Bildrand usw.) wie im 2D-Spiel
  r.camX = fx - r.w / 2 / r.zoom;
  r.camY = fy - r.h / 2 / r.zoom;
  v3PlaceCamera(fx + shakeX, fy + shakeY);
  v3UpdateMood(dt, fx, fy);
  v3CollectLights();
  v3UpdateChunks(fx, fy, chunks3.size < 4 ? 12 : 1);
  v3UpdateLights(fx, fy);
  for (const k of ['water', 'lava', 'bog']) if (MAT3['liquid' + k]) MAT3['liquid' + k].uniforms.uTime.value = V3.time;
  v3SyncActors(dt);
  // Durchsicht um die eigene Figur
  const p = game.player;
  if (p && game.running && !p.dead) {
    const s = v3Project(p.x, feetY(p), 0.8, {});
    const top = v3Project(p.x, feetY(p), 1.9, {});
    const d = r.dpr * V3.gl.getPixelRatio() / r.dpr;
    V3.fadeScreen[0] = s.x * d;
    V3.fadeScreen[1] = (r.h - s.y) * d;
    V3.fadeScreen[2] = Math.max(30, (s.y - top.y) * 1.25) * d;
    V3.fadeScreen[3] = s.z * 0.5 + 0.5;
  } else {
    V3.fadeScreen[2] = 0;
  }
  V3.gl.render(V3.scene, V3.camera);
  drawOverlay3(ctx);
  r.miniTimer -= 1;
  if (r.miniTimer <= 0) {
    renderMinimap();
    r.miniTimer = 10;
  }
}

// Alles, was das 2D-Canvas über die 3D-Szene malt
function drawOverlay3(ctx) {
  const r = renderer;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);
  if (!game.running && !game.player) return;
  const inView = (x, y) => Math.abs(x - V3.focus.x) < r.w / r.zoom * 0.9 && y - V3.focus.y > -r.h / r.zoom * 1.1 && y - V3.focus.y < r.h / r.zoom * 0.8;
  const ground = (e) => e.ground || e.type === 'runes' || e.type === 'decal' || e.type === 'warn';
  const skip = (e) => e.type === 'corpse' || e.type === 'afterimage';
  for (const e of game.effects) {
    if (!ground(e) || skip(e)) continue;
    const o = effectOrigin(e);
    if (!inView(o.x, o.y)) continue;
    v3Anchor(ctx, o.x, o.y);
    drawEffect(ctx, e);
  }
  if (game.duel) {
    v3Anchor(ctx, game.duel.cx, game.duel.cy);
    drawDuelArena(ctx);
  }
  for (const pr of game.projectiles) {
    if (!inView(pr.x, pr.y)) continue;
    v3Anchor(ctx, pr.x, pr.y);
    drawProjectile(ctx, pr);
  }
  for (const e of game.effects) {
    if (ground(e) || skip(e)) continue;
    const o = effectOrigin(e);
    if (!inView(o.x, o.y)) continue;
    v3Anchor(ctx, o.x, o.y);
    drawEffect(ctx, e);
  }
  // Auren und Ringe der Spieler
  const players = [];
  if (game.player && game.running && !game.player.dead) players.push(game.player);
  for (const rp of net.players.values()) if (!rp.dead && inView(rp.x, rp.y)) players.push(rp);
  for (const pl of players) drawPlayerExtras3(ctx, pl);
  drawParticles(ctx);
  // Namen, Lebensbalken, Zeichen über den Köpfen
  const list = [];
  for (const m of game.monsters) if (!m.dead && inView(m.x, m.y)) list.push(m);
  for (const a of game.allies) list.push(a);
  for (const n of game.world.npcs) if (inView(n.x, n.y)) list.push(n);
  list.push(...players);
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    const fy = feetY(e);
    const head = v3HeadHeight(e);
    v3Anchor(ctx, e.x, fy, head, e.x, fy - figureHeight(e));
    if (e.type && !e.isStone && !e.until) drawMonsterStatus(ctx, e);
    if (!e.type && !e.isStone && !e.remote && e !== game.player && !e.until) drawNpcMarks(ctx, e);
    drawLabel(ctx, e);
  }
  drawTexts(ctx);
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  drawZoneTint(ctx, r.w, r.h);
  drawHurtVignette(ctx, r.w, r.h);
  drawScreenFlash(ctx, r.w, r.h);
}

// Auren der Spieler (Buff-Ringe, Knochenpanzer, Seelenfunken), an den Füßen ausgerichtet
function drawPlayerExtras3(ctx, p) {
  const fy = feetY(p);
  v3Anchor(ctx, p.x, fy);
  const invisible = (p === game.player && game.stats && game.stats.invisible) || (p.remote && p.invisible);
  ctx.save();
  if (invisible) ctx.globalAlpha = 0.35;
  drawBuffLooks(ctx, p, fy, 'back');
  drawBuffLooks(ctx, p, fy, 'front');
  for (const b of p.buffs) {
    const fx = SKILL_FX[b.id];
    if (!fx || !fx.ring) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = fx.ring;
    ctx.globalAlpha *= 0.45 + 0.2 * Math.sin(game.time * 5);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -game.time * 30;
    ctx.beginPath();
    ctx.ellipse(p.x, fy, 22, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (p.classId === 'nekromant') {
    for (let k = 0; k < 3; k++) {
      const t = (game.time * 0.6 + k / 3) % 1;
      ctx.globalAlpha = (invisible ? 0.35 : 1) * (1 - t) * 0.8;
      ctx.fillStyle = '#a7e37f';
      circle(ctx, p.x + Math.sin(game.time * 2 + k * 2.1) * 10, fy - 10 - t * 40, 1.6);
    }
    ctx.globalAlpha = invisible ? 0.35 : 1;
  }
  if (p.shield > 0) {
    for (let k = 0; k < 6; k++) {
      const a = game.time * 2.4 + k * Math.PI / 3;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * 22, fy - 22 + Math.sin(a) * 9);
      ctx.rotate(a * 2);
      ctx.fillStyle = '#ddd5bb';
      ctx.strokeStyle = '#4a4434';
      ctx.lineWidth = 1;
      ctx.fillRect(-4, -1.2, 8, 2.4);
      ctx.strokeRect(-4, -1.2, 8, 2.4);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(220,230,200,0.6)';
    ctx.fillStyle = 'rgba(220,230,200,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, fy - 22, 20, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
