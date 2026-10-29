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

// Zeichentrick-Schattierung in drei Stufen mit weichen Kanten. Die Schatten sind kühl blau-violett
// getönt statt grau (wie in Anime-Spielen), die Lichtseite bleibt warm.
let toonGradient = null;
function toonRamp() {
  if (toonGradient) return toonGradient;
  const N = 64;
  const d = new Uint8Array(N * 4);
  const shadow = [0.5, 0.5, 0.66];
  const mid = [0.8, 0.79, 0.88];
  const lit = [1, 1, 1];
  const step = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const k1 = step(0.3, 0.38, t);
    const k2 = step(0.58, 0.66, t);
    for (let c = 0; c < 3; c++) {
      const v = shadow[c] + (mid[c] - shadow[c]) * k1 + (lit[c] - mid[c]) * k2;
      d[i * 4 + c] = Math.round(v * 255);
    }
    d[i * 4 + 3] = 255;
  }
  toonGradient = new THREE.DataTexture(d, N, 1, THREE.RGBAFormat);
  toonGradient.minFilter = THREE.LinearFilter;
  toonGradient.magFilter = THREE.LinearFilter;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

// Für Figuren: Randlicht an den Kanten (warm auf der Sonnenseite) und kleine Glanzpunkte auf
// Metall, Augen und Haaren (Eckenwert "shine"). Kostet fast nichts, macht sie deutlich plastischer.
function addRimShine(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'attribute float shine;\nvarying float vShine;\nvoid main() {\n\tvShine = shine;');
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'varying float vShine;\nvoid main() {')
      .replace('#include <output_fragment>', `
	vec3 vdir = normalize(vViewPosition);
	float ndv = clamp(dot(normal, vdir), 0.0, 1.0);
	float rim = smoothstep(0.55, 0.92, 1.0 - ndv);
	#if NUM_DIR_LIGHTS > 0
		vec3 ldir = directionalLights[0].direction;
		float facing = clamp(dot(normal, ldir) * 0.5 + 0.5, 0.0, 1.0);
		outgoingLight += rim * mix(vec3(0.22, 0.24, 0.42), vec3(0.95, 0.78, 0.55), facing) * 0.42 * (0.4 + 0.6 * diffuseColor.rgb);
		vec3 hv = normalize(ldir + vdir);
		float sp = smoothstep(0.86, 0.93, dot(normal, hv)) * vShine;
		outgoingLight += sp * vec3(1.0, 0.97, 0.9) * 0.75;
	#endif
	#include <output_fragment>`);
  };
  mat.customProgramCacheKey = () => 'rimshine' + (mat.skinning ? 's' : '');
  return mat;
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

  // o: p (Position), r (Drehung), s (Größe), bone, mat ('lit' | 'glow' | 'aura' …), shade (dunkler nach unten),
  //    top/topK (zweite Farbe auf Oberseiten), shine (Glanzlicht 0–1, z. B. Metall), m (Matrix), parent (Matrix)
  add(geo, color, o = {}) {
    const key = o.mat || 'lit';
    const m = partMatrix(o);
    (this.lists[key] = this.lists[key] || []).push({
      geo, color, m, bone: o.bone || 0, shade: o.shade || 0, parent: o.parent || null,
      top: o.top ? new THREE.Color(o.top) : null, topK: o.topK == null ? 0.5 : o.topK, shine: o.shine || 0, ao: o.ao == null ? 0.22 : o.ao
    });
    if (this.skinned && key === 'lit' && !o.noShadow) shadowPart(this, geo, m, o);
    return this;
  }

  // fertige Vorlage (siehe bakeTemplate) an eine Stelle setzen: viel schneller als Teil für Teil
  addTemplate(tpl, M) {
    for (const key in tpl) (this.lists[key] = this.lists[key] || []).push({ tpl: tpl[key], m: M });
    return this;
  }

  build(keepArrays) {
    const out = {};
    for (const k in this.lists) out[k] = mergeParts(this.lists[k], this.skinned, keepArrays);
    return out;
  }

  // Rohdaten statt Geometrie (für Vorlagen)
  raw() {
    const out = {};
    for (const k in this.lists) out[k] = mergeRaw(this.lists[k], false);
    return out;
  }
}

// Schattenmodell (seit 7.9): Figuren werfen ihren Schatten mit einer groben Kopie. Jedes größere feste
// Teil wird darin zu einer kleinen Kugel in der Größe seines Umrisses, Kleinteile fallen weg. So kostet
// der Schatten nur einen Bruchteil, und das sichtbare Modell darf viel mehr Einzelheiten haben.
const SHADOW3_MIN = 0.07;
const _sbS = new THREE.Vector3();
function shadowPart(b, geo, m, o) {
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  bb.getSize(_v1);
  _sbS.setFromMatrixScale(m);
  if (Math.max(_v1.x * _sbS.x, _v1.y * _sbS.y, _v1.z * _sbS.z) < SHADOW3_MIN) return;
  bb.getCenter(_v2);
  const M = m.clone().multiply(new THREE.Matrix4().makeTranslation(_v2.x, _v2.y, _v2.z))
    .multiply(new THREE.Matrix4().makeScale(Math.max(0.01, _v1.x / 2), Math.max(0.01, _v1.y / 2), Math.max(0.01, _v1.z / 2)));
  (b.lists.shadow = b.lists.shadow || []).push({
    geo: geo3('shadowball', () => new THREE.SphereGeometry(1, 6, 4)), color: '#000000', m: M, bone: o.bone || 0, shade: 0,
    parent: o.parent || null, top: null, topK: 0.5, shine: 0, ao: 0
  });
}

// Vorlage: ein Objekt einmal aus seinen Teilen backen und als Rohdaten behalten
const TPL3 = new Map();
function bakeTemplate(key, make) {
  let t = TPL3.get(key);
  if (!t) {
    const b = new Bake3(false);
    make(b);
    t = b.raw();
    TPL3.set(key, t);
  }
  return t;
}

// Nach dem Hochladen auf die Grafikkarte braucht der Arbeitsspeicher die Daten nicht mehr
function freeArray() {
  this.array = null;
}

// Alle Teile zu Rohdaten zusammenführen (Position, Normale, Farbe, Glanz, Knochen)
function mergeRaw(list, skinned) {
  let nv = 0;
  let ni = 0;
  for (const it of list) {
    if (it.tpl) {
      nv += it.tpl.n;
      ni += it.tpl.idx.length;
    } else {
      nv += it.geo.attributes.position.count;
      ni += it.geo.index ? it.geo.index.count : it.geo.attributes.position.count;
    }
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const shine = new Float32Array(nv);
  const idx = new Uint32Array(ni);
  const si = skinned ? new Uint8Array(nv * 4) : null;
  const sw = skinned ? new Float32Array(nv * 4) : null;
  let vo = 0;
  let io = 0;
  let anyShine = false;
  for (const it of list) {
    if (it.tpl) {
      // Vorlage verschieben: Positionen mit der Matrix, Normalen nur gedreht
      const t = it.tpl;
      const e = it.m.elements;
      _n3.getNormalMatrix(it.m);
      const ne = _n3.elements;
      for (let i = 0; i < t.n; i++) {
        const x = t.pos[i * 3];
        const y = t.pos[i * 3 + 1];
        const z = t.pos[i * 3 + 2];
        const o = (vo + i) * 3;
        pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
        pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const a = t.nor[i * 3];
        const b2 = t.nor[i * 3 + 1];
        const c = t.nor[i * 3 + 2];
        let nx = ne[0] * a + ne[3] * b2 + ne[6] * c;
        let ny = ne[1] * a + ne[4] * b2 + ne[7] * c;
        let nz = ne[2] * a + ne[5] * b2 + ne[8] * c;
        const l = Math.hypot(nx, ny, nz) || 1;
        nor[o] = nx / l;
        nor[o + 1] = ny / l;
        nor[o + 2] = nz / l;
        col[o] = t.col[i * 3];
        col[o + 1] = t.col[i * 3 + 1];
        col[o + 2] = t.col[i * 3 + 2];
        shine[vo + i] = t.shine[i];
      }
      if (t.anyShine) anyShine = true;
      for (let i = 0; i < t.idx.length; i++) idx[io + i] = t.idx[i] + vo;
      io += t.idx.length;
      vo += t.n;
      continue;
    }
    const g = it.geo;
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const m = it.parent ? it.parent.clone().multiply(it.m) : it.m;
    _n3.getNormalMatrix(m);
    // ohne Farbe: Eckenfarben der Form selbst (z. B. gestreifte Schlangen)
    const VC = it.color == null ? g.attributes.color : null;
    if (!VC) _c.set(it.color);
    // eigene Knochen-Gewichte der Form (weich biegende Schläuche)
    const SI = g.attributes.skinIndex;
    const SW = g.attributes.skinWeight;
    let minY = 0;
    let span = 1;
    if (it.shade) {
      if (!g.boundingBox) g.computeBoundingBox();
      minY = g.boundingBox.min.y;
      span = Math.max(1e-4, g.boundingBox.max.y - minY);
    }
    if (it.shine) anyShine = true;
    for (let i = 0; i < P.count; i++) {
      _v1.set(P.getX(i), P.getY(i), P.getZ(i));
      const ly = _v1.y;
      _v1.applyMatrix4(m);
      const o = (vo + i) * 3;
      pos[o] = _v1.x;
      pos[o + 1] = _v1.y;
      pos[o + 2] = _v1.z;
      _v2.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_n3).normalize();
      nor[o] = _v2.x;
      nor[o + 1] = _v2.y;
      nor[o + 2] = _v2.z;
      // weiche Verdunkelung: nach unten zeigende Flächen und der untere Teil eines Teils
      let k = it.shade ? 1 - it.shade * (1 - (ly - minY) / span) : 1;
      if (it.ao) k *= 1 - it.ao * Math.max(0, -_v2.y);
      let r = VC ? VC.getX(i) : _c.r;
      let gg = VC ? VC.getY(i) : _c.g;
      let bb = VC ? VC.getZ(i) : _c.b;
      if (it.top) {
        // nach oben zeigende Flächen nehmen die zweite Farbe an (Moos, Schnee, helle Dachziegel)
        const t = Math.max(0, Math.min(1, (_v2.y - 0.25) / 0.6)) * it.topK;
        r += (it.top.r - r) * t;
        gg += (it.top.g - gg) * t;
        bb += (it.top.b - bb) * t;
      }
      col[o] = r * k;
      col[o + 1] = gg * k;
      col[o + 2] = bb * k;
      shine[vo + i] = it.shine;
      if (skinned) {
        if (SI) {
          for (let c = 0; c < 4; c++) {
            si[(vo + i) * 4 + c] = SI.array[i * 4 + c];
            sw[(vo + i) * 4 + c] = SW.array[i * 4 + c];
          }
        } else {
          si[(vo + i) * 4] = it.bone;
          sw[(vo + i) * 4] = 1;
        }
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
  return { n: nv, pos, nor, col, shine, idx, si, sw, anyShine };
}

// Zu einer Geometrie im Sparformat: Normalen und Farben als Bytes, Knochen als Bytes.
// Je Eckpunkt 22–30 statt 68 Bytes; nach dem Hochladen wird die Kopie im Arbeitsspeicher freigegeben.
function mergeParts(list, skinned, keepArrays) {
  const r = mergeRaw(list, skinned);
  const nv = r.n;
  const nor = new Int8Array(nv * 3);
  const col = new Uint8Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) {
    nor[i] = Math.round(Math.max(-1, Math.min(1, r.nor[i])) * 127);
    col[i] = Math.round(Math.max(0, Math.min(1, r.col[i])) * 255);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  if (r.anyShine) {
    const sh = new Uint8Array(nv);
    for (let i = 0; i < nv; i++) sh[i] = Math.round(Math.min(1, r.shine[i]) * 255);
    out.setAttribute('shine', new THREE.BufferAttribute(sh, 1, true));
  }
  if (skinned) {
    const sw = new Uint8Array(nv * 4);
    for (let i = 0; i < nv * 4; i++) sw[i] = Math.round(r.sw[i] * 255);
    out.setAttribute('skinIndex', new THREE.BufferAttribute(r.si, 4));
    out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
  }
  out.setIndex(new THREE.BufferAttribute(nv > 65535 ? r.idx : Uint16Array.from(r.idx), 1));
  out.computeBoundingSphere();
  if (!keepArrays) {
    for (const k in out.attributes) out.attributes[k].onUpload(freeArray);
    out.index.onUpload(freeArray);
  }
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
  // Echtzeit-Schatten werfen nur Figuren (die Welt hat eingebackene Schatten): kleiner Bereich, scharf
  sc.left = -13; sc.right = 13; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 60;
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
  V3.ultra = opts.graphics === 'ultra';
  V3.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, renderer.maxDpr || g.dpr));
  V3.sun.castShadow = g.castShadows;
  const size = V3.ultra ? 2048 : opts.graphics === 'hoch' ? 1024 : 512;
  // Ultra: größerer Schattenbereich, schärfere Bodentexturen (Anisotropie bis zum Maximum der Karte)
  const sc = V3.sun.shadow.camera;
  const half = V3.ultra ? 18 : 13;
  if (sc.right !== half) {
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.updateProjectionMatrix();
  }
  if (groundTex) {
    const an = V3.ultra ? V3.gl.capabilities.getMaxAnisotropy() : 4;
    for (const t of [groundTex.noise, groundTex.cobble]) if (t.anisotropy !== an) { t.anisotropy = an; t.needsUpdate = true; }
  }
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
  // Dungeons und Riss-Dungeons: seit Version 6.1 deutlich heller, damit man Monster und Boden gut erkennt
  dungeon: { sky: '#2a2232', sun: '#f0e4ff', sunI: 0.9, hemi: '#d8d0f0', ground: '#5a4a5a', hemiI: 0.78, near: 20, far: 46 }
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
  // Im Schulterblick sieht man weiter in die Ferne: Nebel etwas näher, damit kein Rand der Welt auftaucht
  const fogK = v3Shoulder() ? 0.62 : V3.ultra ? 1.25 : 1;
  V3.scene.fog.near = s.near * fogK;
  V3.scene.fog.far = s.far * fogK;
  V3.sun.color.copy(s.sun);
  V3.sun.intensity = s.sunI;
  V3.hemi.color.copy(s.hemi);
  V3.hemi.groundColor.copy(s.ground);
  V3.hemi.intensity = s.hemiI;
}

// --- Kamera und Umrechnung Bildschirm ↔ Welt ----------------------------------------------------

const CAM3 = { nah: 0.86, normal: 1, weit: 1.2 };

// Schulterblick: tiefe, nahe Kamera hinter der Figur (wie die 3D-Vorschau), drehbar per Wischen.
// V3.yaw: 0 = Kamera im Süden, Blick nach Norden
const SHOULDER3 = { pitch: 0.5, dist: 9.5, fov: 45, ahead: 12 };
function v3Shoulder() {
  return V3.on && opts.camera === 'schulter';
}
// Mitte des sichtbaren Bereichs (im Schulterblick ein Stück vor der Figur) und sein Radius in Pixeln
function v3ViewCenter(out) {
  const yaw = V3.yaw || 0;
  const ahead = v3Shoulder() ? SHOULDER3.ahead * TILE * (V3.zoomMul || 1) : 0;
  out.x = V3.focus.x - Math.sin(yaw) * ahead;
  out.y = V3.focus.y - Math.cos(yaw) * ahead;
  return out;
}
const _vc = { x: 0, y: 0 };
// Liegt ein Weltpunkt im Bild? Feste Kamera: Rechteck mit mehr Sicht nach Norden; Schulterblick: Kreis
function v3InView(x, y, pad = 0) {
  const r = renderer;
  if (v3Shoulder()) {
    v3ViewCenter(_vc);
    return Math.hypot(x - _vc.x, y - _vc.y) < (22 * TILE + pad) * (V3.zoomMul || 1);
  }
  return Math.abs(x - V3.focus.x) < r.w / r.zoom * 0.62 + 64 + pad && y - V3.focus.y > -r.h / r.zoom * 0.95 - 96 - pad && y - V3.focus.y < r.h / r.zoom * 0.62 + 64 + pad;
}

function v3PlaceCamera(fx, fy) {
  const r = renderer;
  const cam = V3.camera;
  if (v3Shoulder()) {
    if (cam.fov !== SHOULDER3.fov) {
      cam.fov = SHOULDER3.fov;
      cam.updateProjectionMatrix();
    }
    const yaw = V3.yaw || 0;
    const d = SHOULDER3.dist * (V3.zoomMul || 1);
    const tx = fx * U3;
    const tz = fy * U3;
    const ty = 1.0;
    const cp = Math.cos(SHOULDER3.pitch);
    cam.position.set(tx + Math.sin(yaw) * cp * d, ty + Math.sin(SHOULDER3.pitch) * d, tz + Math.cos(yaw) * cp * d);
    cam.lookAt(tx, ty, tz);
    cam.updateMatrixWorld();
    V3.sun.position.set(tx + 9, 24, tz + 13);
    V3.sun.target.position.set(tx - Math.sin(yaw) * 4, 0, tz - Math.cos(yaw) * 4);
    V3.sun.target.updateMatrixWorld();
    V3.focus.x = fx;
    V3.focus.y = fy;
    return;
  }
  if (cam.fov !== 30) {
    cam.fov = 30;
    cam.updateProjectionMatrix();
  }
  V3.yaw = 0;
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
const _fadeA = {};
const _fadeB = {};
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
    t.anisotropy = V3.ultra ? V3.gl.capabilities.getMaxAnisotropy() : 4;
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

// Schattenwerfer der festen Welt (Bäume, Felsen, Häuser, Mauer, Bauten) in Kacheln.
// Ihr Schatten wird einmal in die Bodenfarbe gebacken, statt jedes Bild neu gezeichnet zu werden.
// h: Höhe des Schattenzentrums, r: Radius, s: Stärke. Die Sonne steht im Südosten (wie V3.sun).
const SUN_DX = -9 / 24;
const SUN_DZ = -13 / 24;
const CASTER3 = {
  [OBJ.TREE]: [1.9, 1.05, 0.42], [OBJ.BLOSSOM]: [1.9, 1.05, 0.4], [OBJ.PINE]: [1.6, 0.9, 0.45],
  [OBJ.DEADTREE]: [1.1, 0.55, 0.22], [OBJ.ROCK]: [0.3, 0.6, 0.32], [OBJ.WALL]: [0.9, 0.78, 0.4]
};
const PROP_CASTER3 = { tower: [2.0, 1.1, 0.45], stall: [1.0, 0.85, 0.35], well: [0.8, 0.65, 0.35], lantern: [0.7, 0.35, 0.22], board: [0.8, 0.55, 0.28], hay: [0.4, 0.6, 0.3], horse: [0.9, 0.7, 0.3], brazier: [0.5, 0.4, 0.25] };

function shadowCasters(x0, y0, x1, y1) {
  const w = game.world;
  const out = [];
  const push = (x, z, h, r, st) => {
    out.push(x + SUN_DX * h, z + SUN_DZ * h, r, st);
    // dunkler Fuß direkt am Objekt (Umgebungsverdeckung)
    out.push(x, z, r * 0.55, st * 0.55);
  };
  for (let y = Math.max(0, y0); y < Math.min(MAP_H, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(MAP_W, x1); x++) {
      const c = CASTER3[w.obj[y * MAP_W + x]];
      if (c) push(x + 0.5, y + 0.55, c[0], c[1], c[2]);
    }
  }
  for (const h of w.houses) {
    if (h.x + h.w < x0 || h.x > x1 || h.y + h.h < y0 || h.y > y1) continue;
    for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) push(x + 0.5, y + 0.5, 2.1, 1.05, 0.42);
  }
  for (const pr of w.props) {
    const c = PROP_CASTER3[pr.type];
    const x = pr.x * U3;
    const z = pr.y * U3 - 0.3;
    if (c && x > x0 && x < x1 && z > y0 && z < y1) push(x, z, c[0], c[1], c[2]);
  }
  return out;
}

// Boden eines Blocks als Bauauftrag in kleinen Schritten (yield), damit kein Bild lange hängt
function* terrainJob(cx, cy) {
  const w = game.world;
  const S = SUB3;
  const n = CHUNK3 * S + 1;
  const x0 = cx * CHUNK3;
  const y0 = cy * CHUNK3;
  // Kachelwerte für den Block plus Rand
  const span = CHUNK3 + 2;
  const tr = new Float32Array(span * span);
  const tg = new Float32Array(span * span);
  const tb = new Float32Array(span * span);
  const th = new Float32Array(span * span);
  const tp = new Float32Array(span * span);
  const tmp = {};
  for (let ty = 0; ty < span; ty++) {
    for (let tx = 0; tx < span; tx++) {
      tileSample(x0 + tx - 1, y0 + ty - 1, tmp);
      const k = ty * span + tx;
      tr[k] = tmp.r; tg[k] = tmp.g; tb[k] = tmp.b; th[k] = tmp.h; tp[k] = tmp.paved;
    }
  }
  yield;
  const casters = shadowCasters(x0 - 4, y0 - 4, x0 + CHUNK3 + 4, y0 + CHUNK3 + 4);
  // Höhen mit einem Eckpunkt Rand (für die Normalen)
  const m = n + 2;
  const hgt = new Float32Array(m * m);
  const tIdx = (tx, ty) => (Math.max(y0 - 1, Math.min(y0 + CHUNK3, ty)) - y0 + 1) * span + (Math.max(x0 - 1, Math.min(x0 + CHUNK3, tx)) - x0 + 1);
  const pos = new Float32Array(n * n * 3);
  const col = new Uint8Array(n * n * 3);
  const pav = new Uint8Array(n * n);
  for (let j = -1; j <= n; j++) {
    for (let i = -1; i <= n; i++) {
      const vx = x0 + i / S;
      const vy = y0 + j / S;
      // bilinear zwischen den Kachelmitten
      const fx = vx - 0.5;
      const fy = vy - 0.5;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const ax = fx - ix;
      const ay = fy - iy;
      const a = tIdx(ix, iy);
      const b = tIdx(ix + 1, iy);
      const c = tIdx(ix, iy + 1);
      const d = tIdx(ix + 1, iy + 1);
      const mix = (arr) => (arr[a] * (1 - ax) + arr[b] * ax) * (1 - ay) + (arr[c] * (1 - ax) + arr[d] * ax) * ay;
      let h = mix(th);
      // Felsen oben leicht unruhig, Wiese ganz leicht gewellt
      const hash = (((vx * 7919) ^ (vy * 104729)) >>> 0) % 1000 / 1000;
      if (h > 0.2) h += (hash - 0.5) * 0.18 * (h / WALL3_H);
      else if (h > -0.05) h += Math.sin(vx * 1.3 + vy * 0.7) * Math.cos(vy * 1.1) * 0.035;
      hgt[(j + 1) * m + (i + 1)] = h;
      if (i < 0 || j < 0 || i >= n || j >= n) continue;
      const v = j * n + i;
      pos[v * 3] = vx;
      pos[v * 3 + 1] = h;
      pos[v * 3 + 2] = vy;
      // eingebackener Schatten der Objekte, kühl getönt
      let dark = 0;
      for (let q = 0; q < casters.length; q += 4) {
        const dx = vx - casters[q];
        const dz = vy - casters[q + 1];
        const r = casters[q + 2];
        if (dx > r || dx < -r || dz > r || dz < -r) continue;
        const dd = Math.sqrt(dx * dx + dz * dz);
        if (dd >= r) continue;
        const t = dd / r;
        const k = casters[q + 3] * (t < 0.5 ? 1 : 1 - (t - 0.5) * 2) ;
        if (k > dark) dark = k;
      }
      // Felsen werden nach oben heller
      const lift = h > 0.3 ? 1 + (h / WALL3_H) * 0.25 : 1;
      const cr = mix(tr) * lift * (1 - dark);
      const cg = mix(tg) * lift * (1 - dark * 0.95);
      const cb = mix(tb) * lift * (1 - dark * 0.7);
      col[v * 3] = Math.min(255, cr * 255);
      col[v * 3 + 1] = Math.min(255, cg * 255);
      col[v * 3 + 2] = Math.min(255, cb * 255);
      pav[v] = Math.round(mix(tp) * 255);
    }
    if (j % 6 === 5) yield;
  }
  // Normalen direkt aus dem Höhenfeld (schneller und ohne zweite Gleitkomma-Kopie)
  const nor = new Int8Array(n * n * 3);
  const step = 2 / S;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const hx = hgt[(j + 1) * m + (i + 2)] - hgt[(j + 1) * m + i];
      const hz = hgt[(j + 2) * m + (i + 1)] - hgt[j * m + (i + 1)];
      const nx = -hx / step;
      const nz = -hz / step;
      const l = Math.sqrt(nx * nx + 1 + nz * nz);
      const v = (j * n + i) * 3;
      nor[v] = Math.round((nx / l) * 127);
      nor[v + 1] = Math.round((1 / l) * 127);
      nor[v + 2] = Math.round((nz / l) * 127);
    }
  }
  const idx = new Uint16Array((n - 1) * (n - 1) * 6);
  let q = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx[q++] = a; idx[q++] = a + n; idx[q++] = a + 1;
      idx[q++] = a + 1; idx[q++] = a + n; idx[q++] = a + n + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setAttribute('paved', new THREE.BufferAttribute(pav, 1, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  yield;
  const mesh = new THREE.Mesh(g, groundMat());
  mesh.receiveShadow = true;
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
      const k = kindAt(tx, ty) || kindAt(tx + 1, ty) || kindAt(tx - 1, ty) || kindAt(tx, ty + 1) || kindAt(tx, ty - 1);
      kinds[k || 'water'].push(v);
    }
  }
  const LEVEL = -0.14;
  for (const kind in kinds) {
    const cells = kinds[kind];
    if (!cells.length) continue;
    const wp = new Float32Array(cells.length * 4 * 3);
    const wd = new Float32Array(cells.length * 4);
    const wi = new Uint16Array(cells.length * 6);
    cells.forEach((v, c0) => {
      const us = [v, v + 1, v + n, v + n + 1];
      for (let c = 0; c < 4; c++) {
        const u = us[c];
        wp[(c0 * 4 + c) * 3] = pos[u * 3];
        wp[(c0 * 4 + c) * 3 + 1] = LEVEL;
        wp[(c0 * 4 + c) * 3 + 2] = pos[u * 3 + 2];
        wd[c0 * 4 + c] = Math.max(0, LEVEL - pos[u * 3 + 1]);
      }
      const b = c0 * 4;
      wi.set([b, b + 2, b + 1, b + 1, b + 2, b + 3], c0 * 6);
    });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wp, 3).onUpload(freeArray));
    wg.setAttribute('depth', new THREE.BufferAttribute(wd, 1).onUpload(freeArray));
    wg.setIndex(new THREE.BufferAttribute(wi, 1).onUpload(freeArray));
    wg.computeBoundingSphere();
    const wm = new THREE.Mesh(wg, liquidMat(kind));
    wm.renderOrder = 1;
    group.add(wm);
  }
  for (const k in g.attributes) g.attributes[k].onUpload(freeArray);
  g.index.onUpload(freeArray);
  return group;
}

// --- Blöcke laden und verwerfen -------------------------------------------------------------------
// Gebaut wird in Zeitscheiben: jedes Bild nur wenige Millisekunden, der Rest im nächsten Bild.

const chunks3 = new Map();
// Ultra (PC): ein Ring Blöcke mehr bleibt geladen, man sieht weiter
const CHUNK3_KEEP = 2;
const chunkKeep3 = () => (V3.ultra ? 3 : CHUNK3_KEEP);
let chunkJob = null;

function v3UpdateChunks(fx, fy, msBudget) {
  const ccx = Math.floor(fx * U3 / CHUNK3);
  const ccy = Math.floor(fy * U3 / CHUNK3);
  const maxX = Math.ceil(MAP_W / CHUNK3) - 1;
  const maxY = Math.ceil(MAP_H / CHUNK3) - 1;
  // Blöcke im Sichtfeld zuerst (die Kamera schaut nach Norden: oben mehr, unten weniger)
  const fxIn = (fx * U3) / CHUNK3 - ccx;
  const want = [];
  // Feste Kamera: Blick nach Norden, oben mehr Blöcke (Ultra: ein Ring mehr). Schulterblick: Kreis um die
  // Mitte des Sichtbaren vor der Figur (dahinter und hinter dem Nebel braucht es nichts)
  const shoulder = v3Shoulder();
  const reach = shoulder ? 2 : V3.ultra ? 3 : 2;
  const side = shoulder ? 2 : V3.ultra ? 2 : 1;
  for (let dy = -reach; dy <= (shoulder ? 2 : 1); dy++) {
    for (let dx = -side; dx <= side; dx++) {
      if (shoulder && dx * dx + dy * dy > 3.2) continue;
      const x = ccx + dx;
      const y = ccy + dy;
      if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
      // auf der Seite, zu der man näher am Rand steht, zuerst
      want.push([x, y, Math.hypot(dx * 1.2 - (fxIn - 0.5), dy + 0.5)]);
    }
  }
  want.sort((a, b) => a[2] - b[2]);
  // Nach einem Sprung (Teleport, Wiederbeleben, Dungeon) fehlt der Boden unter der Kamera:
  // dann einmal kräftig bauen statt sekundenlang Himmel zu zeigen
  if (!chunks3.has(ccx + ':' + ccy) || (ccy > 0 && !chunks3.has(ccx + ':' + (ccy - 1)))) msBudget = Math.max(msBudget, 120);
  // angefangene Arbeit für Blöcke, die gar nicht mehr gebraucht werden, verwerfen
  if (chunkJob && (Math.abs(chunkJob.x - ccx) > chunkKeep3() || Math.abs(chunkJob.y - ccy) > chunkKeep3())) chunkJob = null;
  const t0 = performance.now();
  while (performance.now() - t0 < msBudget) {
    if (!chunkJob) {
      for (const [x, y] of want) {
        const key = x + ':' + y;
        const ch = chunks3.get(key);
        if (!ch) chunkJob = { key, x, y, part: 'terrain', gen: terrainJob(x, y) };
        else if (!ch.objects) chunkJob = { key, x, y, part: 'objects', gen: objectJob(x, y) };
        if (chunkJob) break;
      }
      if (!chunkJob) break;
    }
    const r = chunkJob.gen.next();
    if (!r.done) continue;
    const { key, x, y, part } = chunkJob;
    chunkJob = null;
    if (Math.abs(x - ccx) > chunkKeep3() || Math.abs(y - ccy) > chunkKeep3()) {
      disposeTree(r.value);
      continue;
    }
    if (part === 'terrain') {
      chunks3.set(key, { terrain: r.value, objects: null, x, y });
      V3.terrain.add(r.value);
    } else {
      const ch = chunks3.get(key);
      if (!ch) {
        disposeTree(r.value);
        continue;
      }
      ch.objects = r.value;
      V3.objects.add(r.value);
    }
  }
  for (const [key, ch] of chunks3) {
    if (Math.abs(ch.x - ccx) > chunkKeep3() || Math.abs(ch.y - ccy) > chunkKeep3()) {
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
  chunkJob = null;
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
  // Beim Start (noch kein Boden) großzügig bauen, danach nur kleine Zeitscheiben
  // Nachladen um die Mitte des Sichtbaren (im Schulterblick ein Stück vor der Figur)
  v3ViewCenter(_vc);
  v3UpdateChunks(_vc.x, _vc.y, chunks3.size < 4 ? 400 : 5);
  v3UpdateLights(fx, fy);
  for (const k of ['water', 'lava', 'bog']) if (MAT3['liquid' + k]) MAT3['liquid' + k].uniforms.uTime.value = V3.time;
  v3SyncActors(dt);
  v3SyncFx();
  v3SyncBounds();
  // Durchsicht um die eigene Figur
  const p = game.player;
  if (p && game.running && !p.dead) {
    const s = v3Project(p.x, feetY(p), 0.8, _fadeA);
    const top = v3Project(p.x, feetY(p), 1.9, _fadeB);
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
// Listen je Bild wiederverwenden (weniger Müll für die Speicherbereinigung)
const _ovPlayers = [];
const _ovList = [];
const byY = (a, b) => a.y - b.y;
function drawOverlay3(ctx) {
  const r = renderer;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, r.canvas.width, r.canvas.height);
  if (!game.running && !game.player) return;
  const inView = (x, y) => v3InView(x, y, 120);
  const ground = (e) => e.ground || e.type === 'runes' || e.type === 'decal' || e.type === 'warn';
  // Ringe, Säulen, Blitze, Schnitte usw. stehen als 3D-Körper in der Szene (drei-fx.js)
  const skip = (e) => e.type === 'corpse' || e.type === 'afterimage' || FX3_TYPES.has(e.type);
  for (const e of game.effects) {
    if (!ground(e) || skip(e)) continue;
    const o = effectOrigin(e);
    if (!inView(o.x, o.y)) continue;
    v3Anchor(ctx, o.x, o.y);
    drawEffect(ctx, e);
  }
  if (game.duel) {
    v3Anchor(ctx, game.duel.cx, game.duel.cy);
    drawDuelArena(ctx, true);
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
  const players = _ovPlayers;
  players.length = 0;
  if (game.player && game.running && !game.player.dead) players.push(game.player);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp) && inView(rp.x, rp.y)) players.push(rp);
  for (const pl of players) drawPlayerExtras3(ctx, pl);
  drawParticles(ctx);
  // Namen, Lebensbalken, Zeichen über den Köpfen
  const list = _ovList;
  list.length = 0;
  for (const m of game.monsters) if (!m.dead && inView(m.x, m.y)) list.push(m);
  for (const a of game.allies) list.push(a);
  for (const n of game.world.npcs) if (inView(n.x, n.y)) list.push(n);
  for (const pl of players) list.push(pl);
  list.sort(byY);
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
