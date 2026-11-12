// Wahrzeichen und Kulisse (seit 14.78, docs/wahrzeichen.md)
// Wunsch des Spielers: Die Karten ab Totenmoor und die ganze dunkle Seite sollen nicht nur eine eigene Form haben,
// sondern ein eigenes Gesamtbild – große Wahrzeichen, Stimmung, Leben. Hier steht alles, was dazu nur gezeichnet
// wird (3D): Vulkankegel im Krater des Feuerbergs, schwebende Kristallmonolithen und die zerbrochene Krone über
// Lichtwacht, der Totenbaum und versunkene Ruinen im Moor, Felsnadeln mit Blitzeinschlägen und Wasserfällen in der
// Donnerklamm, der Mondsplitter und Mondlicht auf den Kraterseen, der glimmende Riesenstumpf im Aschewald, das
// Riesenskelett im Dünenmeer, Blutfall und Obelisken im Kessel, Nordlicht und Eisriesen am Terrassenhang,
// Leuchtturmruine und Wrack vor den Schattenklippen; dazu je Stadt ein Wahrzeichen mit Lichtern, Bannern und kleinen
// Bewegungen, Nebel, Funken, Blasen, Gischt und Irrlichter.
//
// Regeln:
//   - Nichts davon hat eine Kollision. Alles steht auf ohnehin unbegehbaren Flächen (Lava, Abgrund, Moor, Klamm,
//     Treibsand, Blutsee, Spalte, Meer, dichter Wald, Mauern) oder schwebt hoch über Kopfhöhe. Die Lage wird aus der
//     fertigen Karte gerechnet (Abstandsfeld zum nächsten begehbaren Feld, WZ_FIELD) – also für alle Spieler gleich.
//   - Die Welt (Boden, Objekte, Wege) bleibt unverändert; Ausnahme ist nur der kleine Schmuck der Frostgipfel
//     (wzDecorateMaps, Abschnitt ganz unten), der die Erreichbarkeit nachweislich nicht ändert.
//   - Leistung: je Stelle ein paar zusammengebackene Meshes (Bake3), weit weg ausgeblendet; Teilchen gedeckelt
//     (WZ_CAP je Grafikstufe); auf „Niedrig“ nur die Hauptstücke ohne Nebenwerk.
//   - Keine Bodenringe, Runen oder Sterne als Effekt.
// Eingehängt über FX3_HOOKS (drei-fx.js, einmal je Bild nach Stimmung und Kartenblöcken).

const WZ = {
  key: '', tier: -1, root: null, sites: [], anims: [], halos: [], emitters: [], tick: [], fx: null, time: 0, flash: 0, built: 0,
  uTime: { value: 0 }, uFog: { value: new THREE.Vector2(30, 64) }, uFogC: { value: new THREE.Color() }, uNight: { value: 0 },
  mats: {}, tmp: [], fogTint: null
};
// Teilchen je Grafikstufe (niedrig, mittel, hoch und mehr)
const WZ_CAP = [70, 170, 320];
// Stimmung: Gewitter über der Donnerklamm, rote Glut über dem Feuerberg (Himmel, Licht, Nebel; MOOD3 in drei-kern.js)
if (typeof MOOD3 !== 'undefined') {
  Object.assign(MOOD3, {
    donnerklamm: { sky: '#5a6486', sun: '#c8d2f4', sunI: 0.62, hemi: '#a8b4d8', ground: '#2a2e38', hemiI: 0.52, near: 22, far: 52 },
    klammwacht: { sky: '#6c7694', sun: '#d8e0ff', sunI: 0.72, hemi: '#c0cae4', ground: '#3a3c46', hemiI: 0.56 },
    vulkan: { sky: '#6a2618', sun: '#ffaa78', sunI: 0.72, hemi: '#ffb088', ground: '#3a1610', hemiI: 0.5, near: 22, far: 54 }
  });
}
const wzTier = () => (opts.graphics === 'niedrig' ? 0 : opts.graphics === 'mittel' ? 1 : 2);
// fester Zufall je Karte und Zweck (gleich für alle Spieler)
const wzRng = (mapId, salt) => mulberry32(WORLD_SEED + 7500 + mapId * 977 + salt * 31);

// --- Materialien -------------------------------------------------------------------------------------------
// Große Kulisse soll aus der Ferne noch als Umriss zu sehen sein: der Nebel greift erst später und nie ganz
const WZ_FOG = [1.5, 3.0, 0.82];
function wzFogChunk(add) {
  return `#ifdef USE_FOG
	float fogFactor = smoothstep(fogNear * ${WZ_FOG[0].toFixed(2)}, fogFar * ${WZ_FOG[1].toFixed(2)}, fogDepth) * ${WZ_FOG[2].toFixed(2)};
	${add ? 'gl_FragColor.rgb *= 1.0 - fogFactor;' : 'gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);'}
#endif`;
}
function wzPatchFog(mat, add, key) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', wzFogChunk(add));
  };
  mat.customProgramCacheKey = () => 'wzfog' + (add ? 'a' : 'n') + key;
  return mat;
}
function wzMat(kind) {
  if (WZ.mats[kind]) return WZ.mats[kind];
  let m;
  if (kind === 'lit') m = addFade(wzPatchFog(toonMat(), false, 'lit'), 1.2);
  else if (kind === 'glow') m = wzPatchFog(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), false, 'glow');
  else if (kind === 'pulse') m = wzPatchFog(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), false, 'pulse');
  else if (kind === 'add') m = wzPatchFog(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), true, 'add');
  else if (kind === 'ghost') m = wzPatchFog(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }), false, 'ghost');
  else if (kind === 'banner') m = wzBannerMat();
  WZ.mats[kind] = m;
  return m;
}
// Banner und Wimpel: wehen im Wind (Ausschlag nach aWave: am Mast 0, am freien Ende 1)
function wzBannerMat() {
  const m = toonMat({ side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WZ.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'uniform float uTime;\nattribute float aWave;\nattribute vec3 aDir;\nvoid main() {')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	float wv = sin(uTime * 3.1 + aWave * 4.2 + aDir.y * 7.0) * 0.6 + sin(uTime * 5.3 + aWave * 7.0) * 0.25;
	transformed += vec3(aDir.x, 0.0, aDir.z) * wv * 0.16 * aWave;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', wzFogChunk(false));
  };
  m.customProgramCacheKey = () => 'wzbanner';
  return m;
}
// eigener Nebel für die Shader dieser Datei (uFog: Anfang/Ende wie die Szene, uFogC: Farbe)
const WZ_FOG_GLSL = `uniform vec2 uFog;
uniform vec3 uFogC;
varying float vDepth;
float wzFogK() { return smoothstep(uFog.x * ${WZ_FOG[0].toFixed(2)}, uFog.y * ${WZ_FOG[1].toFixed(2)}, vDepth) * ${WZ_FOG[2].toFixed(2)}; }`;
function wzShader(key, frag, o = {}) {
  if (WZ.mats[key]) return WZ.mats[key];
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uTime: WZ.uTime, uFog: WZ.uFog, uFogC: WZ.uFogC, uNight: WZ.uNight }, o.uniforms || {}),
    vertexShader: `varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vV;
varying float vDepth;
void main() {
	vUv = uv;
	vec4 w = modelMatrix * vec4(position, 1.0);
	vW = w.xyz;
	vN = normalize(mat3(modelMatrix) * normal);
	vV = normalize(cameraPosition - w.xyz);
	vec4 mv = viewMatrix * w;
	vDepth = -mv.z;
	gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform float uTime;
uniform float uNight;
${WZ_FOG_GLSL}
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vV;
float wzH(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float wzN(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(wzH(i), wzH(i + vec2(1.0, 0.0)), f.x), mix(wzH(i + vec2(0.0, 1.0)), wzH(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
${frag}
}`,
    transparent: true,
    depthWrite: false,
    blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: o.side || THREE.DoubleSide
  });
  WZ.mats[key] = m;
  return m;
}
// Lichtsäule (Zylinder oder Kegel, uv.y entlang der Höhe): an den Rändern des Umrisses weich, oben und unten
// ausgeblendet, langsam aufsteigender Schimmer. Farbe je Säule über uCol (eigenes Material je Farbe).
function wzBeamMat(color, strength = 0.5) {
  return wzShader('beam' + color + strength, `
	float edge = pow(abs(dot(normalize(vN), vV)), 1.6);
	float fall = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
	float sh = 0.75 + 0.25 * sin(vUv.y * 18.0 - uTime * 1.6 + vUv.x * 6.2832 * 3.0);
	float a = edge * fall * sh * ${strength.toFixed(2)};
	gl_FragColor = vec4(vec3(${wzVec3(color)}) * a * (1.0 - wzFogK()), 1.0);`, { add: true });
}
// fallendes Wasser/Blut (uv.x quer, uv.y von oben 0 nach unten 1)
function wzFallMat(color, foam) {
  return wzShader('fall' + color, `
	float x = vUv.x;
	float s1 = wzN(vec2(x * 9.0, vUv.y * 3.0 - uTime * 2.6));
	float s2 = wzN(vec2(x * 23.0 + 4.0, vUv.y * 7.0 - uTime * 3.9));
	float streak = smoothstep(0.35, 0.9, s1 * 0.6 + s2 * 0.5);
	vec3 col = mix(vec3(${wzVec3(color)}), vec3(${wzVec3(foam)}), streak * 0.7 + smoothstep(0.8, 1.0, vUv.y) * 0.5);
	col = mix(col, col * vec3(0.5, 0.55, 0.75), uNight * 0.45);
	float a = (0.55 + 0.4 * streak) * smoothstep(0.0, 0.18, x) * smoothstep(1.0, 0.82, x) * smoothstep(0.0, 0.06, vUv.y);
	gl_FragColor = vec4(mix(col, uFogC, wzFogK()), a);`);
}
const wzVec3 = (hex) => { const c = new THREE.Color(hex); return `${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)}`; };

// Nebel- und Lichtschleier: flache Fläche, deren Muster an der Welt hängt (wandert die Fläche mit der Figur, zieht
// der Nebel nicht mit); am Rand der Fläche weich auslaufend
function wzMistMat(key, color, alpha, scale, speed, add) {
  return wzShader('mist' + key, `
	vec2 p = vW.xz * ${scale.toFixed(3)} + vec2(uTime * ${speed.toFixed(3)}, uTime * ${(speed * 0.4).toFixed(3)});
	float n = wzN(p) * 0.55 + wzN(p * 2.3 + 7.1 - uTime * ${(speed * 0.7).toFixed(3)}) * 0.3 + wzN(p * 5.1) * 0.15;
	float r = length(vUv - 0.5) * 2.0;
	float a = smoothstep(0.38, 0.85, n) * (1.0 - smoothstep(0.55, 1.0, r)) * ${alpha.toFixed(2)};
	vec3 col = vec3(${wzVec3(color)});
	${add ? 'gl_FragColor = vec4(col * a * (1.0 - wzFogK()), 1.0);' : 'col = mix(col, col * vec3(0.45, 0.5, 0.7), uNight * 0.5);\n\tgl_FragColor = vec4(mix(col, uFogC, wzFogK()), a);'}`, { add });
}
// Nordlicht bzw. Lichtschleier: hängende Bänder, unten heller Saum, nach oben verblassend, Wellen laufen entlang
function wzAuroraMat(key, c1, c2, alpha) {
  return wzShader('aurora' + key, `
	float wave = sin(vUv.x * 18.0 + uTime * 0.7) * 0.5 + sin(vUv.x * 41.0 - uTime * 1.3) * 0.25;
	float fold = 0.55 + 0.45 * sin(vUv.x * 63.0 + wave * 3.0 + uTime * 0.4);
	float hem = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.12, 1.0, vUv.y));
	float rays = 0.6 + 0.4 * wzN(vec2(vUv.x * 90.0, uTime * 0.6));
	vec3 col = mix(vec3(${wzVec3(c1)}), vec3(${wzVec3(c2)}), smoothstep(0.05, 0.7, vUv.y) + 0.2 * sin(vUv.x * 9.0 + uTime * 0.3));
	float a = hem * fold * rays * smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) * ${alpha.toFixed(2)};
	gl_FragColor = vec4(col * a * (1.0 - wzFogK()), 1.0);`, { add: true });
}

// --- Abstandsfelder: wie weit ist es von einer Kachel bis zur nächsten begehbaren? ---------------------------
// frei: Flüssigkeit ohne Brücke ('liq') bzw. alles Unbegehbare außer Häusern/Mauern ('wild': auch dichter Wald)
function wzFree(kind, i) {
  const w = game.world;
  const g = w.ground[i];
  const liq = LIQUID.has(g) && w.deco[i] !== DECO.BRIDGE;
  if (kind === 'liq') return liq && w.obj[i] === OBJ.NONE;
  if (kind === 'wall') return w.obj[i] === OBJ.WALL;
  const o = w.obj[i];
  return liq || o === OBJ.PINE || o === OBJ.TREE || o === OBJ.DEADTREE;
}
// Schachbrett-Abstand (1 bzw. 1,41) in Kacheln; Rand der Karte zählt als frei, wenn er im Nichts liegt
function wzField(wm, kind, edgeFree) {
  const [rx, ry, rw, rh] = wm.region;
  const d = new Float32Array(rw * rh);
  const BIG = 1e6;
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) d[y * rw + x] = wzFree(kind, (ry + y) * MAP_W + rx + x) ? BIG : 0;
  const D = 1.414;
  const get = (x, y) => (x < 0 || y < 0 || x >= rw || y >= rh ? (edgeFree ? BIG : 0) : d[y * rw + x]);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    const k = y * rw + x;
    if (!d[k]) continue;
    d[k] = Math.min(d[k], get(x - 1, y) + 1, get(x, y - 1) + 1, get(x - 1, y - 1) + D, get(x + 1, y - 1) + D);
  }
  for (let y = rh - 1; y >= 0; y--) for (let x = rw - 1; x >= 0; x--) {
    const k = y * rw + x;
    if (!d[k]) continue;
    d[k] = Math.min(d[k], get(x + 1, y) + 1, get(x, y + 1) + 1, get(x + 1, y + 1) + D, get(x - 1, y + 1) + D);
  }
  return { d, rx, ry, rw, rh, at: (x, y) => { x = Math.floor(x) - rx; y = Math.floor(y) - ry; return x < 0 || y < 0 || x >= rw || y >= rh ? 0 : Math.min(d[y * rw + x], 999); } };
}
// beste Stelle: möglichst viel Platz (bis cap), nah an (cx, cy), mit Abstand sep zu schon gewählten Stellen
function wzPick(F, o) {
  const { cx, cy, R = 999, min = 2, cap = 99, distK = 0.02, avoid = [], sep = 0, town = null } = o;
  let best = null;
  let bs = -1e9;
  const x0 = Math.max(F.rx, Math.floor(cx - R));
  const x1 = Math.min(F.rx + F.rw - 1, Math.ceil(cx + R));
  const y0 = Math.max(F.ry, Math.floor(cy - R));
  const y1 = Math.min(F.ry + F.rh - 1, Math.ceil(cy + R));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const f = F.d[(y - F.ry) * F.rw + x - F.rx];
    if (f < min) continue;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist > R) continue;
    if (town && Math.max(Math.abs(x - town.cx), Math.abs(y - town.cy)) < town.H + 4) continue;
    let ok = true;
    for (const a of avoid) if (Math.hypot(x - a.x, y - a.y) < sep + (a.r || 0) * 0.3) { ok = false; break; }
    if (!ok) continue;
    const s = Math.min(f, cap) - dist * distK;
    if (s > bs) { bs = s; best = { x: x + 0.5, y: y + 0.5, r: Math.min(f, 999) }; }
  }
  return best;
}
function wzPickMany(F, n, o) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const p = wzPick(F, Object.assign({}, o, { avoid: (o.avoid || []).concat(out) }));
    if (!p) break;
    out.push(p);
  }
  return out;
}
const wzTown = (wm) => ({ cx: wm.cx, cy: wm.cy, H: townLayoutHalf(wm.id) });
// Höhe der Oberfläche einer Flüssigkeit bzw. des Grundes darunter
function wzBed(x, y) {
  const g = game.world.ground[Math.floor(y) * MAP_W + Math.floor(x)];
  return LIQUID.has(g) ? -(LIQUID3_DEPTH[g] || WATER3_DEPTH) - 0.05 : -0.05;
}

// --- Formen ------------------------------------------------------------------------------------------------
// Drehkörper mit Rauschen und Eckenfarben: prof = [[radius, höhe], ...] von unten nach oben,
// col(t, a, i) → Farbe (t: 0 unten … 1 oben, a: Winkel), jit: Ausbeulung (Anteil des Radius)
function wzLathe(prof, seg, o = {}) {
  const rnd = mulberry32(o.seed || 7);
  const n = prof.length;
  const noise = Array.from({ length: n * seg }, () => rnd() * 2 - 1);
  const pos = [];
  const col = [];
  const idx = [];
  const rad = new Float32Array(n * seg);
  const yMin = prof[0][1];
  const yMax = prof[n - 1][1];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const [r0, y] = prof[i];
    const t = (y - yMin) / Math.max(1e-4, yMax - yMin);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const jj = j % seg;
      const nz = noise[i * seg + jj] * 0.6 + noise[Math.max(0, i - 1) * seg + jj] * 0.2 + noise[i * seg + ((jj + 1) % seg)] * 0.2;
      const r = Math.max(0, r0 * (1 + (o.jit || 0) * nz) + (o.lobe ? o.lobe(a, t) * r0 : 0));
      rad[i * seg + jj] = r;
      let yy = y + (o.jitY ? noise[i * seg + jj] * o.jitY : 0);
      // ausgefranster Rand (abgebrochener Stumpf, Turmruine): ein Ring springt nach oben
      if (o.jag && o.jag[0] === i) yy += Math.abs(noise[i * seg + jj]) * o.jag[1] + Math.max(0, Math.sin(a * 3 + 1)) * o.jag[1] * 0.4;
      pos.push(Math.cos(a) * r, yy, Math.sin(a) * r);
      const cc = o.col ? o.col(t, a, i, nz) : '#808080';
      c.set(cc);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j;
    const b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Radius der Oberfläche bei Winkel a und Höhe y (für Lavaströme und Glutrisse, die darauf liegen); nur der
  // aufsteigende Teil des Profils
  g.userData.rAt = (a, y) => {
    let i = 0;
    while (i < n - 2 && prof[i + 1][1] < y && prof[i + 1][1] >= prof[i][1]) i++;
    const ya = prof[i][1];
    const yb = prof[i + 1][1];
    const ty = Math.max(0, Math.min(1, (y - ya) / Math.max(1e-4, yb - ya)));
    const fj = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * seg;
    const j0 = Math.floor(fj) % seg;
    const j1 = (j0 + 1) % seg;
    const tj = fj - Math.floor(fj);
    const ra = rad[i * seg + j0] * (1 - tj) + rad[i * seg + j1] * tj;
    const rb = rad[(i + 1) * seg + j0] * (1 - tj) + rad[(i + 1) * seg + j1] * tj;
    return ra + (rb - ra) * ty;
  };
  if (o.flat) {
    // kantig (Fels): jede Fläche eigene Normale – fängt das Licht in Facetten wie die Felsen der Welt
    const f = g.toNonIndexed();
    f.computeVertexNormals();
    f.userData.rAt = g.userData.rAt;
    g.dispose();
    WZ.tmp.push(f);
    return f;
  }
  WZ.tmp.push(g);
  return g;
}
// Rohr entlang einer Kurve (eigene Geometrie, nicht im Vorrat: jedes ist anders)
function wzTube(pts, r0, r1, seg = 10, rad = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const P = g.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    curve.getPointAt(t, c);
    const r = typeof r1 === 'function' ? r1(t) : r0 + (r1 - r0) * t;
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      P.setXYZ(k, c.x + (P.getX(k) - c.x) * r, c.y + (P.getY(k) - c.y) * r, c.z + (P.getZ(k) - c.z) * r);
    }
  }
  g.computeVertexNormals();
  g.deleteAttribute('uv');
  WZ.tmp.push(g);
  return g;
}
// Fläche mit uv (Wasserfall, Schleier, Strahl): Streifen von a nach b (je [x, y, z]), Breite w quer zur Ansicht n
function wzStrip(pts, widths, side) {
  const pos = [];
  const uv = [];
  const idx = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = pts[i];
    const w = widths[Math.min(i, widths.length - 1)];
    pos.push(x - side[0] * w, y - side[1] * w, z - side[2] * w, x + side[0] * w, y + side[1] * w, z + side[2] * w);
    const v = i / (n - 1);
    uv.push(0, v, 1, v);
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Kristall: Prisma mit Spitze oben und unten (Länge len, Radius r)
function wzCrystal(b, color, o) {
  const { p, r = 1, len = 3, tilt = [0, 0, 0], mat = 'lit', tipK = 0.8, sides = 6 } = o;
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...p), o.q || new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0], tilt[1], tilt[2])), new THREE.Vector3(1, 1, 1));
  b.add(crystalGeo('body', sides), color, { parent: M, p: [0, -len / 2, 0], s: [r, len, r], mat, top: o.top, topK: 0.4 });
  b.add(crystalGeo('tip', sides), color, { parent: M, p: [0, len / 2, 0], s: [r, r * tipK * 2.2, r], mat });
  if (!o.flat) b.add(crystalGeo('tip', sides), color, { parent: M, p: [0, -len / 2, 0], s: [r, -r * tipK * 2.2, r], mat });
}
// Banner: Tuch an einer Stange (am Mast fest, frei wehend); dir: Richtung des Tuchs (Einheitsvektor in xz)
function wzBanners(list) {
  const pos = [];
  const nor = [];
  const col = [];
  const wave = [];
  const dir = [];
  const idx = [];
  const c = new THREE.Color();
  for (const bn of list) {
    const { x, y, z, w = 0.9, h = 1.8, ang = 0, c1, c2 } = bn;
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    const nx = -uz;
    const nz = ux;
    const S = 4;
    const V = 5;
    const base = pos.length / 3;
    for (let j = 0; j <= V; j++) for (let i = 0; i <= S; i++) {
      const u = i / S;
      const v = j / V;
      // unten spitz zulaufend (Wimpel)
      const cut = v > 0.82 ? Math.abs(u - 0.5) * 2 < (1 - v) / 0.18 : true;
      const yy = y - v * h * (cut ? 1 : 0.85);
      pos.push(x + ux * u * w, yy, z + uz * u * w);
      nor.push(nx, 0, nz);
      c.set(v > 0.12 && v < 0.2 ? c2 : c1);
      if (Math.abs(u - 0.5) < 0.16 && v > 0.35 && v < 0.62) c.set(c2);
      col.push(c.r, c.g, c.b);
      wave.push(u);
      dir.push(nx, (x + z) * 0.37 % 1, nz);
    }
    for (let j = 0; j < V; j++) for (let i = 0; i < S; i++) {
      const a = base + j * (S + 1) + i;
      idx.push(a, a + S + 1, a + 1, a + 1, a + S + 1, a + S + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aWave', new THREE.Float32BufferAttribute(wave, 1));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, wzMat('banner'));
}

// --- Stellen: zusammengebackene Meshes je Wahrzeichen ---------------------------------------------------------
// Eine Stelle hat ihre eigene Gruppe (eigene Hülle → wird außerhalb des Bildes nicht gezeichnet) und wird weiter weg
// als far Einheiten ganz ausgeblendet.
function wzSite(x, z, far = 120) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.far = far;
  WZ.root.add(g);
  WZ.sites.push(g);
  return g;
}
// Bake3 → Meshes in die Gruppe (Materialien dieser Datei)
function wzBake(group, b) {
  const geos = b.build(false);
  for (const k in geos) {
    const m = new THREE.Mesh(geos[k], wzMat(k === 'lit' || k === 'glow' || k === 'add' || k === 'ghost' || k === 'pulse' ? k : 'lit'));
    if (k === 'add' || k === 'ghost') m.renderOrder = 2;
    group.add(m);
  }
  for (const g of WZ.tmp) g.dispose();
  WZ.tmp.length = 0;
  let site = group;
  while (site.parent && site.parent !== WZ.root) site = site.parent;
  for (const [x, y, z, s, c, a] of b.halos || []) {
    _wzC.set(c);
    WZ.halos.push({ g: group, site, p: new THREE.Vector3(x, y, z), s, r: _wzC.r, gg: _wzC.g, b: _wzC.b, a, ph: x * 1.7 + z });
  }
  return group;
}
// weicher Lichtschein (gebündelt mit den Licht-Teilchen, kein eigener Zeichenaufruf)
function wzGlow(b, x, y, z, s, c, a = 1) {
  (b.halos = b.halos || []).push([x, y, z, s, c, a]);
}
// bewegliches Teil: eigene Gruppe in einer Stelle, fn(obj, t, dt) je Bild
function wzAnim(parent, b, fn, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  if (b) wzBake(g, b);
  WZ.anims.push({ g, fn, site: parent, x, y, z });
  return g;
}
function wzMeshIn(parent, geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.p) m.position.set(...o.p);
  if (o.r) m.rotation.set(...o.r);
  if (o.s) m.scale.set(...(Array.isArray(o.s) ? o.s : [o.s, o.s, o.s]));
  m.renderOrder = o.order != null ? o.order : 3;
  parent.add(m);
  return m;
}

// --- Teilchen (Rauch, Funken, Gischt, Blasen, Irrlichter, Sand, Staub) -----------------------------------------
// Je Art ein InstancedMesh aus Vierecken, die zur Kamera zeigen (iSiz: Breite, Höhe, Drehung im Bild). Rauch und
// Nebel normal überblendet, Licht addiert. Die Teilchen rechnet die CPU (wenige hundert).
function wzSpriteMat(add) {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: WZ.uFog, uFogC: WZ.uFogC },
    vertexShader: `attribute vec3 iPos;
attribute vec4 iCol;
attribute vec3 iSiz;
varying vec2 vUv;
varying vec4 vCol;
varying float vDepth;
void main() {
	vUv = position.xy * 2.0;
	vCol = iCol;
	vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
	float c = cos(iSiz.z);
	float s = sin(iSiz.z);
	vec2 q = position.xy * iSiz.xy;
	mv.xy += vec2(c * q.x - s * q.y, s * q.x + c * q.y);
	vDepth = -mv.z;
	gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `${WZ_FOG_GLSL}
varying vec2 vUv;
varying vec4 vCol;
void main() {
	float d = dot(vUv, vUv);
	if (d > 1.0) discard;
${add ? `	float a = (exp(-d * 4.0) - 0.018) * vCol.a;
	gl_FragColor = vec4(vCol.rgb * a * (1.0 - wzFogK()), 1.0);` : `	float a = (1.0 - smoothstep(0.1, 1.0, d)) * vCol.a;
	gl_FragColor = vec4(mix(vCol.rgb, uFogC, wzFogK()), a);`}
}`,
    transparent: true,
    depthWrite: false,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}
class WzSprites {
  constructor(cap, add) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.siz = new Float32Array(cap * 3);
    this.aPos = new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSiz = new THREE.InstancedBufferAttribute(this.siz, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos);
    g.setAttribute('iCol', this.aCol);
    g.setAttribute('iSiz', this.aSiz);
    g.instanceCount = 0;
    this.g = g;
    this.n = 0;
    this.mesh = new THREE.Mesh(g, wzSpriteMat(add));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = add ? 6 : 5;
  }
  push(x, y, z, sx, sy, rot, r, g, b, a) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 4] = r; this.col[i * 4 + 1] = g; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = a;
    this.siz[i * 3] = sx; this.siz[i * 3 + 1] = sy; this.siz[i * 3 + 2] = rot;
  }
  done() {
    this.g.instanceCount = this.n;
    this.mesh.visible = this.n > 0;
    if (this.n) {
      this.aPos.needsUpdate = true;
      this.aCol.needsUpdate = true;
      this.aSiz.needsUpdate = true;
    }
    this.n = 0;
  }
  dispose() {
    this.g.dispose();
    this.mesh.material.dispose();
  }
}
// Teilchen: Lage, Geschwindigkeit, Leben, Größe (von s0 nach s1), Farbe, Deckkraft, add (Licht), grav, drag,
// wob (Schwanken), sx (Streckung in der Breite, für Böen und Regen), y0 (unter dieser Höhe vergehen sie)
const WZ_P = [];
const _wzC = new THREE.Color();
const _wzV = new THREE.Vector3();
function wzSpawn(o) {
  const cap = WZ_CAP[WZ.tier < 0 ? 1 : WZ.tier];
  if (WZ_P.length >= cap) return null;
  _wzC.set(o.c || '#ffffff');
  const p = {
    x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, age: 0, life: o.life || 2, s0: o.s0 || 0.3, s1: o.s1 == null ? o.s0 || 0.3 : o.s1,
    r: _wzC.r, g: _wzC.g, b: _wzC.b, a: o.a == null ? 1 : o.a, add: !!o.add, grav: o.grav || 0, drag: o.drag || 0, wob: o.wob || 0,
    sx: o.sx || 1, rot: o.rot || 0, vr: o.vr || 0, y0: o.y0 == null ? -9 : o.y0, ph: Math.random() * 6.28, on: o.on || null, fin: o.fin || null
  };
  if (o.c2) { _wzC.set(o.c2); p.r2 = _wzC.r; p.g2 = _wzC.g; p.b2 = _wzC.b; }
  WZ_P.push(p);
  return p;
}
function wzStep(dt) {
  for (let i = WZ_P.length - 1; i >= 0; i--) {
    const p = WZ_P[i];
    p.age += dt;
    if (p.age >= p.life || p.y < p.y0) {
      if (p.fin) p.fin(p);
      WZ_P[i] = WZ_P[WZ_P.length - 1];
      WZ_P.pop();
      continue;
    }
    const dk = Math.max(0, 1 - p.drag * dt);
    p.vx *= dk; p.vz *= dk; p.vy = p.vy * dk - p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.on) p.on(p, dt);
  }
}
function wzParticles(dt) {
  const fx = WZ.fx;
  if (!fx) return;
  wzStep(dt);
  const cam = V3.camera.position;
  const t = WZ.time;
  for (const h of WZ.halos) {
    if (!h.site.visible) continue;
    _wzV.copy(h.p).applyMatrix4(h.g.matrixWorld);
    const k = h.a * (0.88 + 0.12 * Math.sin(t * 2.3 + h.ph));
    fx.add.push(_wzV.x, _wzV.y, _wzV.z, h.s, h.s, 0, h.r, h.gg, h.b, k);
  }
  for (let i = 0; i < WZ_P.length; i++) {
    const p = WZ_P[i];
    if (p.wob) {
      p.x += Math.sin(p.age * 1.7 + p.ph) * p.wob * dt;
      p.z += Math.cos(p.age * 1.3 + p.ph * 1.7) * p.wob * dt;
    }
    p.rot += p.vr * dt;
    const k = p.age / p.life;
    const s = p.s0 + (p.s1 - p.s0) * k;
    const env = Math.min(1, k / 0.15) * Math.min(1, (1 - k) / 0.35);
    let r = p.r;
    let g = p.g;
    let b = p.b;
    if (p.r2 != null) { r += (p.r2 - r) * k; g += (p.g2 - g) * k; b += (p.b2 - b) * k; }
    // sehr nah vor der Kamera: ausblenden (Rauch vor der Linse)
    const dc = Math.abs(p.x - cam.x) + Math.abs(p.y - cam.y) + Math.abs(p.z - cam.z);
    const near = Math.min(1, Math.max(0, (dc - 2) / 6));
    (p.add ? fx.add : fx.soft).push(p.x, p.y, p.z, s * p.sx, s, p.rot, r, g, b, p.a * env * near);
  }
  fx.add.done();
  fx.soft.done();
}

// --- Blitze (Donnerklamm) ----------------------------------------------------------------------------------
// Ein Zickzack-Band vom Himmel zur Spitze einer Felsnadel, eine Abzweigung, kurzes Nachleuchten; dazu hellt das
// Licht der Szene für einen Augenblick auf (WZ.flash, in wzHook nach der Stimmung)
function wzBoltMesh() {
  const N = 48;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  g.setIndex(idx);
  const m = new THREE.Mesh(g, wzMat('add'));
  m.frustumCulled = false;
  m.renderOrder = 7;
  m.visible = false;
  m.userData.N = N;
  return m;
}
function wzStrike(bolt, tx, ty, tz, rnd) {
  const pos = bolt.geometry.attributes.position;
  const col = bolt.geometry.attributes.color;
  const N = bolt.userData.N;
  const cam = V3.camera.position;
  const pts = [];
  const main = 30;
  let x = tx + (rnd() - 0.5) * 8;
  let z = tz + (rnd() - 0.5) * 8 - 4;
  const top = ty + 34;
  for (let i = 0; i <= main; i++) {
    const t = i / main;
    const jx = i === main ? 0 : (rnd() - 0.5) * 1.6 * (1 - t * 0.6);
    const jz = i === main ? 0 : (rnd() - 0.5) * 1.6 * (1 - t * 0.6);
    pts.push([x + (tx - x) * t + jx, top + (ty - top) * t, z + (tz - z) * t + jz, 0.22 - t * 0.08]);
  }
  // Abzweigung ab einem Drittel
  const a = pts[Math.floor(main * 0.35)];
  const br = [];
  let bx = a[0];
  let by = a[1];
  let bz = a[2];
  const dx = (rnd() - 0.5) * 1.2;
  const dz = (rnd() - 0.5) * 1.2;
  for (let i = 0; i < N - main - 2; i++) {
    bx += dx + (rnd() - 0.5) * 0.9;
    by -= 0.9;
    bz += dz + (rnd() - 0.5) * 0.9;
    br.push([bx, by, bz, 0.09 * (1 - i / (N - main))]);
  }
  const all = pts.concat([pts[main]], br);
  for (let i = 0; i < N; i++) {
    const p = all[Math.min(i, all.length - 1)];
    const q = all[Math.min(i + 1, all.length - 1)];
    // quer zur Blickrichtung
    const vx = q[0] - p[0];
    const vy = q[1] - p[1];
    const vz = q[2] - p[2];
    const cx = cam.x - p[0];
    const cy = cam.y - p[1];
    const cz = cam.z - p[2];
    let sx = vy * cz - vz * cy;
    let sy = vz * cx - vx * cz;
    let sz = vx * cy - vy * cx;
    const l = Math.hypot(sx, sy, sz) || 1;
    const w = i === main ? 0 : p[3];
    sx = (sx / l) * w; sy = (sy / l) * w; sz = (sz / l) * w;
    pos.setXYZ(i * 2, p[0] - sx, p[1] - sy, p[2] - sz);
    pos.setXYZ(i * 2 + 1, p[0] + sx, p[1] + sy, p[2] + sz);
    const k = i > main ? 0.55 : 1;
    col.setXYZ(i * 2, 0.75 * k, 0.85 * k, 1.0 * k);
    col.setXYZ(i * 2 + 1, 0.75 * k, 0.85 * k, 1.0 * k);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  bolt.visible = true;
  bolt.userData.t = 0;
}

// --- Bauteile, die mehrere Karten nutzen ---------------------------------------------------------------------
// Felsnadel: gestapelt, zerklüftet, unten dunkel, oben heller (y0: Fuß, meist der Grund einer Flüssigkeit)
function wzSpire(b, x, z, y0, h, r, seed, c0, c1, o = {}) {
  const prof = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bulge = 1 + 0.18 * Math.sin(t * 9 + seed) + 0.1 * Math.sin(t * 21 + seed * 2);
    prof.push([r * (1 - t * 0.78) * bulge * (i === n ? 0.35 : 1), y0 + t * (h - y0)]);
  }
  prof.push([0, h + r * 0.15]);
  // Schichten: jede zweite Lage etwas dunkler, oben eine helle Kappe
  const g = wzLathe(prof, o.seg || 9, { seed, jit: 0.16, jitY: 0.12, flat: true, col: (t, a, i, nz) => (t > 0.86 && o.cap ? o.cap : mixColor(c0, c1, Math.max(0, Math.min(1, t * (i % 2 ? 0.86 : 1) + nz * 0.08)))) });
  b.add(g, null, { p: [x, 0, z], r: [0, seed, 0] });
  return g;
}
// Fahnen auf den Mauern einer Stadt: jede n-te Mauerkachel (fest gewählt), Mast auf der Mauer, Tuch quer zur Mauer
function wzWallBanners(site, wm, every, c1, c2, max = 14) {
  const w = game.world;
  const { cx, cy, H } = wzTown(wm);
  const list = [];
  const poles = new Bake3();
  for (let y = cy - H; y <= cy + H && list.length < max; y++) for (let x = cx - H; x <= cx + H && list.length < max; x++) {
    const i = y * MAP_W + x;
    if (w.obj[i] !== OBJ.WALL || townTileHash(x, y) % every) continue;
    // nur mitten in geraden Mauerstücken (keine Ecken, keine Torenden)
    const n = (dx, dy) => w.obj[(y + dy) * MAP_W + x + dx] === OBJ.WALL;
    const horiz = n(-1, 0) && n(1, 0) && n(-2, 0) && n(2, 0);
    const vert = n(0, -1) && n(0, 1) && n(0, -2) && n(0, 2);
    if (horiz === vert) continue;
    const ox = x + 0.5 - site.position.x;
    const oz = y + 0.5 - site.position.z;
    poles.add(sphere3(0.06, 6, 4), '#3a3028', { p: [ox, 2.35, oz], s: [1, 16, 1] });
    poles.add(sphere3(0.1, 6, 4), '#d8b060', { p: [ox, 3.32, oz] });
    // Tuch hängt am Mast und weht entlang der Mauer
    list.push({ x: ox, y: 3.2, z: oz, w: 0.95, h: 1.55, ang: horiz ? 0 : Math.PI / 2, c1, c2 });
  }
  if (!list.length) return;
  wzBake(site, poles);
  site.add(wzBanners(list));
}
// Feuer: Flammen-Teilchen (Emitter läuft nur in der Nähe), dazu ab und zu ein Funke
function wzFire(x, y, z, s = 1, c = '#ffb04a', c2 = '#ff4a14') {
  WZ.emitters.push({
    x, z, R: 30, rate: 7 * Math.min(1.6, s), acc: 0, fn: () => {
      wzSpawn({ x: x + (Math.random() - 0.5) * 0.3 * s, y: y + 0.05, z: z + (Math.random() - 0.5) * 0.3 * s, vy: 1.2 + Math.random() * 1.1, vx: (Math.random() - 0.5) * 0.3,
        life: 0.55 + Math.random() * 0.35, s0: 0.45 * s, s1: 0.1 * s, c, c2, add: true, a: 0.95, wob: 0.6 });
      if (Math.random() < 0.18) wzSpawn({ x, y: y + 0.3, z, vy: 2.5 + Math.random() * 2, vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, life: 1.4, s0: 0.07, s1: 0.03, c: '#ffd070', add: true, grav: 0.5, wob: 1.2 });
    }
  });
}
// Feuerbecken (Schale mit Glut und Flammen), Lage in der Stelle (site)
function wzBrazier(b, site, x, y, z, s = 1, glow = '#ff9a3a', c, c2) {
  b.add(lathe3('wzbowl', [[0, 0], [0.32, 0.02], [0.42, 0.22], [0.46, 0.3], [0.4, 0.32], [0.3, 0.12], [0, 0.1]], 10), '#2a2420', { p: [x, y, z], s });
  b.add(sphere3(0.3, 8, 5), glow, { p: [x, y + 0.24 * s, z], s: [s, 0.45 * s, s], mat: 'pulse' });
  wzFire(x + site.position.x, y + 0.28 * s, z + site.position.z, s, c, c2);
}
// Licht- bzw. Mondstrahl (Kegelstumpf: unten r0, oben r1, Höhe h), Fuß bei (x, y, z), geneigt um tilt
function wzBeam(parent, x, y, z, r0, r1, h, color, strength, tilt = [0, 0, 0]) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 14, 1, true);
  g.translate(0, h / 2, 0);
  return wzMeshIn(parent, g, wzBeamMat(color, strength), { p: [x, y, z], r: tilt, order: 4 });
}
// Vorhang (Nordlicht, Lichtschleier): path [[x, z], …] von y0 bis y1; uv.x entlang, uv.y nach oben
function wzCurtainGeo(path, y0, y1) {
  const pos = [];
  const uv = [];
  const idx = [];
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [x, z, dy = 0] = path[i];
    pos.push(x, y0 + dy, z, x, y1 + dy, z);
    uv.push(i / (n - 1), 0, i / (n - 1), 1);
    if (i < n - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// zufällige Kachel nahe der Figur, auf der pred gilt (Blasen, Gischt, Wolkenfetzen) – nur Aussehen, darum Math.random
function wzNearTile(px, pz, R, pred, tries = 6) {
  for (let k = 0; k < tries; k++) {
    const x = Math.floor(px + (Math.random() * 2 - 1) * R);
    const y = Math.floor(pz + (Math.random() * 2 - 1) * R * 0.8 - R * 0.25);
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
    if (pred(y * MAP_W + x, x, y)) return [x + Math.random(), y + Math.random()];
  }
  return null;
}
const wzGround = (i) => game.world.ground[i];
// Nebel- bzw. Schleierfläche, die mit der Figur wandert (das Muster hängt an der Welt, zieht also nicht mit)
function wzMistLayer(mat, y, size) {
  const g = new THREE.PlaneGeometry(size, size, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.renderOrder = 4;
  m.frustumCulled = false;
  WZ.root.add(m);
  WZ.tick.push(() => {
    const p = game.player;
    m.position.x = p.x * U3;
    m.position.z = p.y * U3 - 3;
  });
  return m;
}
// Emitter rund um die Figur (Funkenregen, Böen, Sand, Irrlichter …): rate je Sekunde, fn(px, pz) erzeugt eines
function wzAround(rate, fn) {
  WZ.emitters.push({ around: true, rate, acc: 0, fn });
}
// Gebäude-Teile: Säule mit Basis und Kapitell (Ruinen), Höhe h, Radius r, Neigung tilt
function wzColumn(b, x, y, z, h, r, color, top, tilt = [0, 0, 0], broken = false) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...tilt)), new THREE.Vector3(1, 1, 1));
  b.add(lathe3('wzcolb' + r, [[0, 0], [r * 1.35, 0], [r * 1.35, 0.25], [r * 1.1, 0.35], [0, 0.35]], 8), color, { parent: M, top, topK: 0.6 });
  b.add(lathe3('wzcols' + r + (broken ? 'b' : ''), broken ? [[r, 0], [r * 0.95, 0.7], [r * 0.9, 0.86], [r * 0.4, 0.98], [0, 0.93]] : [[r, 0], [r * 0.9, 1]], 8), color, { parent: M, p: [0, 0.3, 0], s: [1, h - 0.6, 1], shade: 0.25, top, topK: 0.5 });
  if (!broken) b.add(wbox(r * 3, 0.3, r * 3, 0.04), color, { parent: M, p: [0, h - 0.15, 0], top, topK: 0.7 });
  return M;
}

// Band aus Eckpunkten (Lavastrom, Glutriss auf einer Oberfläche): pts [x, y, z], side je Punkt [x, y, z], w je Punkt,
// cols je Punkt (Farbe)
function wzRibbon(pts, sides, ws, cols) {
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = pts[i];
    const [sx, sy, sz] = sides[i];
    const w = ws[i];
    pos.push(x - sx * w, y - sy * w, z - sz * w, x + sx * w, y + sy * w, z + sz * w);
    c.set(cols[i]);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < pts.length - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  WZ.tmp.push(g);
  return g;
}
// Glutbänder auf einem Drehkörper (lathe mit rAt): n Bänder von t0 nach t1 (Anteil der Höhe y0..y1), schlängelnd
function wzSurfaceStreams(b, lathe, n, y0, y1, w0, w1, colTop, colMid, colBot, rnd, mat = 'pulse', lift = 0.05) {
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + rnd() * 0.6;
    const pts = [];
    const sides = [];
    const ws = [];
    const cols = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = y1 + (y0 - y1) * t;
      const a = a0 + 0.16 * Math.sin(t * 6.5 + k * 1.7) + 0.05 * Math.sin(t * 17 + k);
      const r = lathe.userData.rAt(a, y) + lift;
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      sides.push([-Math.sin(a), 0, Math.cos(a)]);
      ws.push(w0 + (w1 - w0) * t * (0.8 + 0.2 * Math.sin(t * 9 + k)));
      cols.push(t < 0.5 ? mixColor(colTop, colMid, t * 2) : mixColor(colMid, colBot, (t - 0.5) * 2));
    }
    b.add(wzRibbon(pts, sides, ws, cols), null, { mat });
  }
}

// --- Die Karten ----------------------------------------------------------------------------------------------
// WZ_MAPS[id](wm, T): baut Stellen, Bewegungen, Emitter. T.tier (0–2), T.rnd (fester Zufall der Karte).
// WZ.main: Lage des Hauptwahrzeichens (für Tests und Messungen)
const WZ_MAPS = {};

// Feuerberg: ein echter Vulkankegel im Lavasee des Kraters, glühende Lavaflanken, Rauchsäule, Glutbrocken; zwei
// rauchende Kegel hinter dem Nordrand; die Luft glüht rot, je näher man kommt. Basaltsechseck: vier Glutpfeiler
// im Lavagraben mit Feuerbecken und Bannern.
WZ_MAPS[9] = (wm, T) => {
  const [rx, ry] = wm.region;
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const C = (MAP_FORMS[9] && MAP_FORMS[9].crater) || [182, 62, 17];
  const spot = wzPick(F, { cx: rx + C[0], cy: ry + C[1], R: C[2], min: 4, distK: 0.4 });
  if (spot) {
    const R = Math.max(5, Math.min(spot.r - 1.0, 14));
    wzVolcano(spot.x, spot.y, R, R * 0.92, T, true);
    WZ.main = { x: spot.x, y: spot.y + R + 3 };
    WZ.fogTint = { x: spot.x, z: spot.y, R: 95, color: '#7a2410', k: 0.3 };
  }
  if (T.tier) for (const [ox, oz, r] of [[70, -9, 8], [292, -10, 9.5]]) wzVolcano(rx + ox, ry + oz, r, r * 0.85, T, false, 1.4);
  // Stadt: vier Glutpfeiler in den Ecken des Lavagrabens
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const b = new Bake3();
  const ban = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    let bs = -1e9;
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
      if (Math.sign(dx) !== sx || Math.sign(dy) !== sy) continue;
      const x = town.cx + dx;
      const y = town.cy + dy;
      if (!wzFree('liq', y * MAP_W + x)) continue;
      const s = -Math.abs(Math.abs(dx) - Math.abs(dy)) * 2 - Math.abs(Math.hypot(dx, dy) - 7) + F.at(x, y);
      if (s > bs) { bs = s; best = [x + 0.5 - site.position.x, y + 0.5 - site.position.z]; }
    }
    if (!best) continue;
    const [px, pz] = best;
    b.add(lathe3('wzbasalt', [[0.5, -0.8], [0.46, 0], [0.42, 2.6], [0.5, 2.75], [0.5, 3.0], [0, 3.02]], 6), '#2a2422', { p: [px, 0, pz], shade: 0.35, top: '#4a3a34', topK: 0.6 });
    b.add(sphere3(0.08, 6, 4), '#3a302a', { p: [px, 2.95, pz + 0.48], s: [11, 0.8, 0.8] });
    wzBrazier(b, site, px, 3.0, pz, 1.25);
    ban.push({ x: px - 0.42, y: 2.88, z: pz + 0.56, w: 0.84, h: 1.6, ang: 0, c1: '#6a1410', c2: '#e8a040' });
  }
  wzBake(site, b);
  if (ban.length) site.add(wzBanners(ban));
  wzWallBanners(site, wm, 5, '#4a1610', '#e8a040', 10);
  // Lava wirft Blasen und Funken (überall auf der Karte, nur nahe der Figur)
  wzAround(3.5, (px, pz) => {
    const t = wzNearTile(px, pz, 14, (i) => wzGround(i) === GROUND.LAVA && game.world.deco[i] !== DECO.BRIDGE);
    if (!t) return;
    wzSpawn({ x: t[0], y: -0.05, z: t[1], vy: 0.5, life: 0.9, s0: 0.35, s1: 0.1, c: '#ffb040', c2: '#ff3a0a', add: true, a: 0.8 });
    if (Math.random() < 0.4) for (let k = 0; k < 3; k++) wzSpawn({ x: t[0], y: 0, z: t[1], vx: (Math.random() - 0.5) * 1.6, vz: (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 2, grav: 7, life: 0.9, s0: 0.1, s1: 0.05, c: '#ffd070', add: true });
  });
  // Asche treibt
  wzAround(2, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 30, y: 4 + Math.random() * 4, z: pz + (Math.random() - 0.6) * 22, vx: 0.6, vy: -0.4, wob: 0.5, life: 7, s0: 0.1, s1: 0.08, c: '#5a5050', a: 0.7 }));
};
// Vulkankegel: Radius R, Höhe H; main: mit Glutbrocken und Lavaflanken (sonst nur Rauch und Glut)
function wzVolcano(x, z, R, H, T, main, y0 = 0) {
  const site = wzSite(x, z, 170);
  const rnd = mulberry32(Math.floor(x * 31 + z * 17));
  const b = new Bake3();
  const prof = [[R * 1.04, -1.2], [R, 0.15], [R * 0.86, H * 0.17], [R * 0.68, H * 0.41], [R * 0.5, H * 0.65], [R * 0.37, H * 0.85], [R * 0.31, H * 0.96], [R * 0.28, H], [R * 0.23, H * 0.98], [R * 0.17, H * 0.86]];
  const cone = wzLathe(prof, main ? 30 : 18, {
    seed: 9 + Math.floor(x), jit: 0.05, flat: true,
    lobe: (a, t) => -0.07 * Math.pow(Math.max(0, Math.sin(a * 8 + 1)), 4) * Math.sin(Math.min(1, t * 1.2) * 3.1),
    col: (t, a, i, nz) => {
      if (i >= 8) return '#6a2614';
      if (i === 0) return '#4a1a0c';
      if (i === 1) return mixColor('#3a1a10', '#2a201c', 0.5 + nz * 0.3);
      // Schichten aus hellerer Asche und dunklem Basalt, in den Rinnen dunkler
      const band = 0.5 + 0.5 * Math.sin(t * 19 + Math.sin(a * 3) * 1.5);
      const gully = Math.pow(Math.max(0, Math.sin(a * 8 + 1)), 4);
      return mixColor(mixColor('#1e1613', '#5a4a42', Math.min(1, t * 1.1)), '#2a1c18', band * 0.35 + gully * 0.4 - nz * 0.15);
    }
  });
  b.add(cone, null, { p: [0, y0, 0] });
  // Glut im Krater, darüber ein Schein
  b.add(geo3('wzdisc20', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), '#ffb040', { p: [0, y0 + H * 0.87, 0], s: R * 0.2, mat: 'pulse' });
  wzGlow(b, 0, y0 + H * 0.98, 0, R * 1.1, '#ff7a2a', 0.75);
  if (main) {
    wzSurfaceStreams(b, cone, 9, 0.1, H * 0.95, 0.12, 0.26 + R * 0.025, '#fff4b0', '#ff8a1a', '#a01a08', rnd);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      wzGlow(b, Math.cos(a) * R * 0.95, 0.6, Math.sin(a) * R * 0.95, R * 0.8, '#ff5a1a', 0.35);
    }
    // erstarrte Lavabrocken am Fuß
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2;
      const rr = R * (0.88 + rnd() * 0.12);
      b.add(rockGeo(k % 6, 0), '#2a201c', { p: [Math.cos(a) * rr, 0.1, Math.sin(a) * rr], s: 0.5 + rnd() * 0.9, r: [0, a, 0], top: '#4a3a34', topK: 0.4 });
    }
  }
  wzBake(site, b);
  const X = x;
  const Y = y0 + H * 0.9;
  const Z = z;
  // Rauchsäule: unten glutrot angestrahlt, oben grau; zieht mit dem Wind nach Osten
  WZ.emitters.push({ x, z, R: 110, rate: main ? 1.6 : 0.7, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    wzSpawn({ x: X + Math.cos(a) * R * 0.12, y: Y, z: Z + Math.sin(a) * R * 0.12, vy: 2.2 + Math.random() * 0.8, vx: 0.5 + Math.random() * 0.4, vz: -0.2, drag: 0.05,
      life: main ? 11 : 8, s0: R * 0.2, s1: R * 0.62, c: '#6a2a18', c2: '#3a3434', a: 0.62, vr: (Math.random() - 0.5) * 0.3, rot: Math.random() * 6 });
  } });
  // Glutfunken aus dem Krater
  WZ.emitters.push({ x, z, R: 90, rate: main ? 7 : 2, acc: 0, fn: () => wzSpawn({ x: X + (Math.random() - 0.5) * R * 0.3, y: Y, z: Z + (Math.random() - 0.5) * R * 0.3,
    vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, vy: 4 + Math.random() * 5, grav: 3, life: 2.2, s0: 0.22, s1: 0.06, c: '#ffd070', c2: '#ff4010', add: true, wob: 0.8 }) });
  if (!main) return;
  // Glutbrocken: im hohen Bogen hinaus, mit Funkenschweif, zerplatzen auf dem Kegel oder in der Lava
  const coneY = (d) => (d < R * 0.28 ? H * 0.86 : Math.max(-0.2, H * (1 - (d - R * 0.28) / (R * 0.75))));
  WZ.emitters.push({ x, z, R: 90, rate: 0.55, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    const sp = 2.5 + Math.random() * 3.5;
    wzSpawn({ x: X, y: Y + 0.5, z: Z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 8 + Math.random() * 5, grav: 9, life: 5, s0: 0.75, s1: 0.55, c: '#ffe080', c2: '#ff4a10', add: true,
      on: (p) => {
        if (Math.random() < 0.7) wzSpawn({ x: p.x, y: p.y, z: p.z, life: 0.8, s0: 0.4, s1: 0.05, c: '#ff8a2a', c2: '#8a2008', add: true, a: 0.75, vy: 0.4 });
        if (p.vy < 0 && p.y < coneY(Math.hypot(p.x - X, p.z - Z))) p.age = p.life;
      },
      fin: (p) => { for (let k = 0; k < 7; k++) wzSpawn({ x: p.x, y: p.y + 0.1, z: p.z, vx: (Math.random() - 0.5) * 4, vz: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, grav: 8, life: 0.9, s0: 0.2, s1: 0.05, c: '#ffd070', add: true }); } });
  } });
}

// Kristallabgrund: schwebende Kristallmonolithen mit Lichtsäulen aus dem Abgrund, Lichtsäulen und Lichtschleier
// über dem Abgrund; Lichtwacht: die zerbrochene Riesenkristall-Krone über der Zitadelle, Lichtvorhänge aus den
// beiden Abgrundspalten der Stadt, schwebende Splitter darüber.
WZ_MAPS[10] = (wm, T) => {
  const [rx, ry, rw, rh] = wm.region;
  const F = wzField(wm, 'liq', true);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const mono = wzPickMany(F, T.tier ? 6 : 4, { cx: town.cx, cy: town.cy, R: 999, min: 5.5, cap: 7, distK: 0.01, sep: 46, town: { cx: town.cx, cy: town.cy, H: town.H + 6 } });
  mono.forEach((m, k) => {
    const site = wzSite(m.x, m.y, 150);
    const b = new Bake3();
    const len = 8 + rnd() * 5;
    const r = 1.1 + rnd() * 0.5;
    const col = k % 2 ? '#a8d4ff' : '#c4b4ff';
    wzCrystal(b, col, { p: [0, 0, 0], r, len, tilt: [rnd() * 0.24 - 0.12, rnd() * 3, rnd() * 0.24 - 0.12], top: '#f0eeff' });
    for (let j = 0; j < 3; j++) {
      const a = j * 2.1 + rnd();
      wzCrystal(b, j % 2 ? '#8a7ae8' : '#b4c8ff', { p: [Math.cos(a) * r * 0.7, -len * 0.12 + j * 0.5, Math.sin(a) * r * 0.7], r: r * (0.45 + rnd() * 0.2), len: len * (0.45 + rnd() * 0.2), tilt: [Math.sin(a) * 0.45, a, -Math.cos(a) * 0.45], top: '#ffffff' });
    }
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + rnd();
      wzCrystal(b, j % 2 ? '#d8d0ff' : col, { p: [Math.cos(a) * (2.6 + rnd()), (rnd() - 0.5) * len * 0.7, Math.sin(a) * (2.6 + rnd())], r: 0.22 + rnd() * 0.18, len: 0.9 + rnd() * 1.4, tilt: [rnd() - 0.5, rnd() * 3, rnd() - 0.5] });
    }
    wzGlow(b, 0, 0, 0, len * 1.1, '#8a70ff', 0.55);
    const baseY = 2.2 + len / 2;
    const ph = rnd() * 6;
    wzAnim(site, b, (o, t) => { o.rotation.y = t * 0.06 + ph; o.position.y = baseY + Math.sin(t * 0.45 + ph) * 0.5; }, 0, baseY, 0);
    wzBeam(site, 0, -7, 0, r * 2.2, r * 1.5, baseY + 7, '#9a88ff', 0.5);
    WZ.emitters.push({ x: m.x, z: m.y, R: 60, rate: 2.5, acc: 0, fn: () => wzSpawn({ x: m.x + (Math.random() - 0.5) * 4, y: -1 + Math.random() * 2, z: m.y + (Math.random() - 0.5) * 4, vy: 1.2 + Math.random(), life: 4, s0: 0.12, s1: 0.04, c: '#d8d0ff', add: true, wob: 0.6 }) });
    if (!k) WZ.main = { x: m.x, y: m.y + 6 };
  });
  // Lichtsäulen aus dem Abgrund (nah an der Stadt und den Wegen)
  const cols = wzPickMany(F, T.tier ? 12 : 6, { cx: town.cx, cy: town.cy, R: 999, min: 2.2, cap: 3, distK: 0.02, sep: 16, town: { cx: town.cx, cy: town.cy, H: town.H + 2 }, avoid: mono });
  for (const c of cols) {
    const site = wzSite(c.x, c.y, 110);
    const r = 0.5 + rnd() * 0.5;
    wzBeam(site, 0, -4, 0, r * 1.3, r, 14 + rnd() * 6, rnd() < 0.5 ? '#9fd8ff' : '#b89aff', 0.8);
  }
  // Lichtschleier über dem Abgrund
  if (T.tier) {
    const veils = wzPickMany(F, 3, { cx: town.cx, cy: town.cy, R: 999, min: 4, cap: 5, distK: 0.015, sep: 40, town: { cx: town.cx, cy: town.cy, H: town.H + 8 }, avoid: mono.concat(cols) });
    for (const v of veils) {
      const site = wzSite(v.x, v.y, 120);
      const path = [];
      for (let i = 0; i <= 24; i++) path.push([-16 + i * 1.35, Math.sin(i * 0.45) * 2.2, Math.sin(i * 0.3) * 0.6]);
      wzMeshIn(site, wzCurtainGeo(path, 1.5, 9.5), wzAuroraMat('licht', '#9fe0ff', '#b48aff', 0.55), { order: 4 });
    }
  }
  // Lichtwacht: die zerbrochene Krone über der Zitadelle
  const site = wzSite(town.cx + 0, town.cy - 12.5, 100);
  const b = new Bake3();
  const RC = 4.2;
  const arc = Math.PI * 2 * 0.8;
  b.add(geo3('wzcrownring', () => new THREE.TorusGeometry(RC, 0.26, 6, 40, arc).rotateX(Math.PI / 2)), '#d4c4ff', { top: '#fff4ff', shine: 0.6 });
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 10; k++) {
    const a = (k / 9.5) * arc;
    const q = new THREE.Quaternion().setFromAxisAngle(up, -a).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.32));
    const big = k % 3 === 1;
    const len = big ? 3.2 + rnd() : 1.8 + rnd() * 1.2;
    wzCrystal(b, k % 2 ? '#c8b8ff' : '#a8d8ff', { p: [Math.cos(a) * RC, len * 0.42, Math.sin(a) * RC], q, r: big ? 0.48 : 0.34, len, top: '#ffffff', flat: true });
  }
  wzGlow(b, 0, 0.6, 0, 7, '#9a88ff', 0.6);
  wzAnim(site, b, (o, t) => { o.rotation.y = t * 0.05; o.position.y = 8.2 + Math.sin(t * 0.6) * 0.25; }, 0, 8.2, 0);
  // abgebrochene Stücke treiben neben der Lücke
  const fb = new Bake3();
  for (let k = 0; k < 3; k++) wzCrystal(fb, '#c8b8ff', { p: [RC * 0.9 + k * 0.9, k * 0.7 - 0.4, -RC * 0.55 - k * 0.6], r: 0.3, len: 1.4 + k * 0.4, tilt: [0.6 * k, k, 0.9 - k * 0.4] });
  wzAnim(site, fb, (o, t) => { o.rotation.y = t * 0.05 + 0.2; o.position.y = 8.2 + Math.sin(t * 0.8 + 1) * 0.5; }, 0, 8.2, 0);
  wzBeam(site, 0, 0, 0, 4.4, 3.6, 8.2, '#c8b8ff', 0.22);
  // Lichtvorhänge aus den Abgrundspalten der Stadt und schwebende Splitter darüber
  const comps = wzTownLiquids(town);
  for (const cp of comps) {
    if (cp.n < 6) continue;
    const vert = cp.h >= cp.w;
    const path = [];
    const L = vert ? cp.h : cp.w;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      path.push(vert ? [cp.cx - site.position.x, cp.y0 - site.position.z + t * L, 0] : [cp.x0 - site.position.x + t * L, cp.cy - site.position.z, 0]);
    }
    wzMeshIn(site, wzCurtainGeo(path, -1.2, 4.2), wzAuroraMat('spalte', '#a8f0ff', '#a080ff', 0.8), { order: 4 });
    const sb = new Bake3();
    for (let k = 0; k < 3; k++) wzCrystal(sb, k % 2 ? '#a8d8ff' : '#c8b8ff', { p: vert ? [0, k * 0.6, (k - 1) * L * 0.3] : [(k - 1) * L * 0.3, k * 0.6, 0], r: 0.26, len: 1.2 + k * 0.3, tilt: [0.2, k, 0.15] });
    const ph = cp.cx;
    wzAnim(site, sb, (o, t) => { o.position.y = 2.6 + Math.sin(t * 0.9 + ph) * 0.35; o.rotation.y = Math.sin(t * 0.2 + ph) * 0.4; }, cp.cx - site.position.x, 2.6, cp.cy - site.position.z);
  }
  wzWallBanners(site, wm, 6, '#3a2c70', '#cfe4ff', 10);
  // schwebende Splitter um die Figur (wie AMBIENT shards, in 3D)
  wzAround(1.5, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 26, y: 0.5 + Math.random() * 3, z: pz + (Math.random() - 0.6) * 20, vy: 0.35, wob: 0.4, life: 6, s0: 0.1, s1: 0.06, c: '#cfe4ff', add: true }));
};
// zusammenhängende Flüssigkeit in der Stadt (Spalten, Becken, Teiche): Rechteck und Mitte je Stück
function wzTownLiquids(town) {
  const seen = new Set();
  const out = [];
  const { cx, cy, H } = town;
  for (let y = cy - H; y <= cy + H; y++) for (let x = cx - H; x <= cx + H; x++) {
    const i = y * MAP_W + x;
    if (seen.has(i) || !wzFree('liq', i)) continue;
    const st = [i];
    seen.add(i);
    let x0 = x;
    let x1 = x;
    let y0 = y;
    let y1 = y;
    let n = 0;
    let sx = 0;
    let sy = 0;
    while (st.length) {
      const k = st.pop();
      const kx = k % MAP_W;
      const ky = (k - kx) / MAP_W;
      n++;
      sx += kx;
      sy += ky;
      x0 = Math.min(x0, kx); x1 = Math.max(x1, kx); y0 = Math.min(y0, ky); y1 = Math.max(y1, ky);
      for (const d of [1, -1, MAP_W, -MAP_W]) {
        const j = k + d;
        const jx = j % MAP_W;
        const jy = (j - jx) / MAP_W;
        if (seen.has(j) || Math.abs(jx - cx) > H || Math.abs(jy - cy) > H || !wzFree('liq', j)) continue;
        seen.add(j);
        st.push(j);
      }
    }
    out.push({ n, x0, x1: x1 + 1, y0, y1: y1 + 1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: sx / n + 0.5, cy: sy / n + 0.5 });
  }
  return out;
}

// --- Einhängen ------------------------------------------------------------------------------------------------
function wzClear() {
  if (WZ.root) {
    V3.scene.remove(WZ.root);
    WZ.root.traverse((o) => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); });
  }
  if (WZ.fx) { WZ.fx.add.dispose(); WZ.fx.soft.dispose(); }
  WZ.root = null;
  WZ.fx = null;
  WZ.sites = [];
  WZ.anims = [];
  WZ.halos = [];
  WZ.emitters = [];
  WZ.tick = [];
  WZ.main = null;
  WZ.fogTint = null;
  WZ.bolt = null;
  WZ_P.length = 0;
}
function wzBuild(key, tier) {
  wzClear();
  WZ.key = key;
  WZ.tier = tier;
  if (!key || key[0] !== 'm') return;
  const id = +key.slice(1);
  const fn = WZ_MAPS[id];
  if (!fn) return;
  const wm = WORLD_MAPS.find((m) => m.id === id);
  if (!wm) return;
  const t0 = performance.now();
  WZ.root = new THREE.Group();
  WZ.root.name = 'wahrzeichen';
  V3.scene.add(WZ.root);
  const cap = WZ_CAP[tier] + 40;
  WZ.fx = { add: new WzSprites(cap, true), soft: new WzSprites(cap, false) };
  WZ.root.add(WZ.fx.add.mesh, WZ.fx.soft.mesh);
  try {
    fn(wm, { tier, rnd: wzRng(id, 1) });
  } catch (e) {
    console.error('Wahrzeichen Map ' + id, e);
  }
  for (const g of WZ.tmp) g.dispose();
  WZ.tmp.length = 0;
  WZ.built = performance.now() - t0;
  WZ.warm = true;
}
// Nach dem Bauen einmal acht Sekunden vorrechnen: Rauchsäulen und Funken stehen schon, wenn man ankommt
function wzWarm(px, pz) {
  const gp = gfx().particles || 1;
  const fx = WZ.fx;
  WZ.fx = null;
  for (let s = 0; s < 80; s++) {
    for (const e of WZ.emitters) {
      if (e.around || Math.hypot(e.x - px, e.z - pz) > e.R) continue;
      e.acc += e.rate * gp * 0.1;
      while (e.acc >= 1) { e.acc -= 1; e.fn(px, pz); }
    }
    wzStep(0.1);
  }
  WZ.fx = fx;
}
const _wzFog = new THREE.Color();
function wzHook() {
  const p = game.player;
  if (!V3.on || !game.running || !game.world || !p) return;
  const H = V3.home;
  const key = H && !H.dungeon ? H.key : '';
  const tier = wzTier();
  if (key !== WZ.key || tier !== WZ.tier) wzBuild(key, tier);
  if (!WZ.root) return;
  const t = V3.time || 0;
  const dt = Math.max(0, Math.min(0.1, t - WZ.time));
  WZ.time = t;
  WZ.uTime.value = t;
  WZ.uNight.value = V3.nightK || 0;
  const fog = V3.scene.fog;
  WZ.uFog.value.set(fog.near, fog.far);
  WZ.uFogC.value.copy(fog.color);
  if (WZ.mats.pulse) WZ.mats.pulse.color.setScalar(0.86 + 0.14 * Math.sin(t * 2.1) + 0.05 * Math.sin(t * 7.3));
  const px = p.x * U3;
  const pz = p.y * U3;
  // Stellen weit weg ausblenden, Bewegungen nur für sichtbare
  for (const s of WZ.sites) s.visible = Math.hypot(s.position.x - px, s.position.z - pz) < s.userData.far;
  for (const a of WZ.anims) if (a.site.visible) a.fn(a.g, t, dt);
  const gp = gfx().particles || 1;
  for (const e of WZ.emitters) {
    if (!e.around && Math.hypot(e.x - px, e.z - pz) > e.R) continue;
    e.acc += e.rate * gp * dt;
    while (e.acc >= 1) {
      e.acc -= 1;
      e.fn(px, pz);
    }
  }
  if (WZ.warm) { WZ.warm = false; wzWarm(px, pz); }
  for (const fn of WZ.tick) fn(t, dt, px, pz);
  wzParticles(dt);
  // Blitz: Licht der Szene kurz heller
  if (WZ.flash > 0) {
    V3.hemi.intensity += WZ.flash * 1.1;
    V3.sun.intensity += WZ.flash * 0.5;
    WZ.flash = Math.max(0, WZ.flash - dt * 4.5);
  }
  // Glühen der Luft in der Nähe (Vulkan): Nebel und Himmel färben sich
  const ft = WZ.fogTint;
  if (ft) {
    const d = Math.hypot(ft.x - px, ft.z - pz);
    const k = Math.max(0, 1 - d / ft.R) * ft.k * (0.9 + 0.1 * Math.sin(t * 1.3));
    if (k > 0.001) {
      fog.color.lerp(_wzFog.set(ft.color), k);
      V3.scene.background.copy(fog.color);
    }
  }
}
if (typeof FX3_HOOKS !== 'undefined') FX3_HOOKS.push({ parts: [], fn: wzHook });

// Totenmoor: der Riesen-Totenbaum im Moor (Moosbärte, Geisterlaternen), versunkene Ruinen und Tempel, Irrlichter,
// dichter Bodennebel, aufsteigende Blasen; Stegdorf: vier Totenlaternen an den Kreuzungen der Kanäle.
WZ_MAPS[8] = (wm, T) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const tree = wzPick(F, { cx: town.cx - 4, cy: town.cy - 32, R: 46, min: 3.6, cap: 6, distK: 0.07, town: { cx: town.cx, cy: town.cy, H: town.H + 5 } });
  if (tree) {
    wzDeadTree(tree, rnd, T);
    WZ.main = { x: tree.x, y: tree.y + Math.min(tree.r, 4) + 3 };
  }
  const ruins = wzPickMany(F, T.tier ? 6 : 3, { cx: town.cx, cy: town.cy, R: 999, min: 2.8, cap: 4, distK: 0.006, sep: 30, town: { cx: town.cx, cy: town.cy, H: town.H + 4 }, avoid: tree ? [tree] : [] });
  ruins.forEach((r, k) => wzRuin(r, k, rnd));
  // Stegdorf: Totenlaternen an den vier Kreuzungen der Kanäle
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 80);
  const b = new Bake3();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    let bs = -1e9;
    for (let dy = 2; dy <= 9; dy++) for (let dx = 2; dx <= 9; dx++) {
      const x = town.cx + sx * dx;
      const y = town.cy + sy * dy;
      if (!wzFree('liq', y * MAP_W + x)) continue;
      const s = F.at(x, y) * 2 - Math.abs(dx - dy) * 0.5 - Math.hypot(dx, dy) * 0.3;
      if (s > bs) { bs = s; best = [x + 0.5 - site.position.x, y + 0.5 - site.position.z]; }
    }
    if (!best) continue;
    const [px, pz] = best;
    b.add(wzTube([[px, -0.6, pz], [px + 0.1, 1.5, pz - 0.05], [px - 0.08, 3.0, pz + 0.05], [px + 0.05, 4.1, pz]], 0.17, 0.09, 8, 6), '#3a3026');
    b.add(wzTube([[px, 3.9, pz], [px + sx * 0.5, 4.2, pz], [px + sx * 0.95, 4.05, pz]], 0.07, 0.05, 4, 5), '#3a3026');
    const lb = new Bake3();
    lb.add(sphere3(0.02, 4, 3), '#2a2620', { p: [0, -0.3, 0], s: [1, 30, 1] });
    lb.add(lathe3('wzcage', [[0, 0], [0.2, 0.02], [0.24, 0.3], [0.2, 0.55], [0.06, 0.66], [0, 0.7]], 6), '#2a2a24', { p: [0, -1.25, 0] });
    lb.add(sphere3(0.17, 8, 6), '#9fffc0', { p: [0, -0.98, 0], mat: 'pulse' });
    wzGlow(lb, 0, -0.98, 0, 1.6, '#6affa8', 0.8);
    const ph = px * 1.3;
    wzAnim(site, lb, (o, t) => { o.rotation.z = Math.sin(t * 1.3 + ph) * 0.12; o.rotation.x = Math.sin(t * 0.9 + ph) * 0.08; }, px + sx * 0.95, 4.05, pz);
  }
  wzBake(site, b);
  // Irrlichter, Blasen, Bodennebel
  wzAround(1.1, (px, pz) => {
    const t = wzNearTile(px, pz, 16, (i) => wzGround(i) === GROUND.BOG);
    if (t) wzSpawn({ x: t[0], y: 0.5 + Math.random() * 1.1, z: t[1], vy: 0.12, wob: 0.9, life: 7, s0: 0.36, s1: 0.28, c: Math.random() < 0.5 ? '#a8ffb8' : '#8ad8ff', add: true, a: 0.9 });
  });
  wzAround(3.5, (px, pz) => {
    const t = wzNearTile(px, pz, 11, (i) => wzGround(i) === GROUND.BOG && game.world.deco[i] !== DECO.BRIDGE);
    if (t) wzSpawn({ x: t[0], y: -0.25, z: t[1], vy: 0.22, life: 1.3, s0: 0.1, s1: 0.2, c: '#8a9a78', a: 0.85, y0: -1,
      fin: (p) => wzSpawn({ x: p.x, y: p.y + 0.05, z: p.z, life: 0.35, s0: 0.25, s1: 0.05, c: '#c8e8b0', add: true, a: 0.5 }) });
  });
  wzMistLayer(wzMistMat('moor1', '#a8b8a0', 0.5, 0.07, 0.03), 0.35, 64);
  if (T.tier) wzMistLayer(wzMistMat('moor2', '#c0ccb8', 0.32, 0.045, -0.02), 0.95, 64);
};
// Riesen-Totenbaum: Stamm mit Brettwurzeln, knorrige Äste, Moosbärte, Geisterlaternen an den Astenden
function wzDeadTree(spot, rnd, T) {
  const site = wzSite(spot.x, spot.y, 140);
  const b = new Bake3();
  const R = Math.max(1.6, Math.min(spot.r - 0.6, 3));
  const trunk = wzLathe([[R * 1.7, -0.9], [R * 1.3, 0.1], [R, 1.3], [R * 0.86, 3.5], [R * 0.76, 6], [R * 0.62, 8.2], [R * 0.46, 9.8], [R * 0.22, 10.8], [0, 11.1]], 14, {
    seed: 81, jit: 0.13, lobe: (a, t) => Math.pow(1 - t, 7) * 0.9 * Math.max(0, Math.sin(a * 5 + 1)),
    col: (t) => (t < 0.1 ? '#28301f' : mixColor('#2e2925', '#5a524a', t))
  });
  b.add(trunk, null);
  const ends = [];
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + rnd() * 0.4;
    const h0 = 5.2 + rnd() * 4.5;
    const len = 4.5 + rnd() * 3.5;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const pts = [[ca * R * 0.4, h0, sa * R * 0.4], [ca * len * 0.35, h0 + 1.6, sa * len * 0.35], [Math.cos(a + 0.25) * len * 0.7, h0 + 2.2 - rnd(), Math.sin(a + 0.25) * len * 0.7], [Math.cos(a + 0.45) * len, h0 + 1.0 + rnd() * 2.2, Math.sin(a + 0.45) * len]];
    b.add(wzTube(pts, 0.2 + R * 0.12, 0.07, 10, 6), '#3e3832', { top: '#5a5248', topK: 0.4 });
    ends.push(pts[3]);
    for (let j = 0; j < 2; j++) {
      const m = pts[2];
      const a2 = a + (j ? 0.9 : -0.8);
      const l2 = 1.4 + rnd() * 1.6;
      b.add(wzTube([m, [m[0] + Math.cos(a2) * l2 * 0.6, m[1] + 0.9, m[2] + Math.sin(a2) * l2 * 0.6], [m[0] + Math.cos(a2) * l2, m[1] + 0.4 + rnd(), m[2] + Math.sin(a2) * l2]], 0.12, 0.03, 5, 5), '#3e3832');
    }
    // Moosbärte hängen von den Ästen
    for (let j = 0; j < 4; j++) {
      const t = 0.3 + j * 0.2;
      const p0 = pts[Math.min(3, Math.floor(t * 3))];
      const p1 = pts[Math.min(3, Math.floor(t * 3) + 1)];
      const f = t * 3 - Math.floor(t * 3);
      const q = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f - 0.1, p0[2] + (p1[2] - p0[2]) * f];
      b.add(geo3('wzmoss', () => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, -0.5, 0)), '#3e4a30', { p: q, s: [0.14 + rnd() * 0.1, 1 + rnd() * 1.8, 0.14 + rnd() * 0.1], r: [0, rnd() * 3, 0] });
    }
  }
  // Wurzeln im Moor
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05 + rnd() * 0.3;
    const reach = Math.max(R + 0.5, Math.min(R + 2.6, spot.r - 0.4));
    b.add(wzTube([[Math.cos(a) * R * 0.9, 0.6, Math.sin(a) * R * 0.9], [Math.cos(a) * (R + reach) / 2, 0.4, Math.sin(a) * (R + reach) / 2], [Math.cos(a + 0.15) * reach, -0.6, Math.sin(a + 0.15) * reach]], 0.55, 0.15, 6, 6), '#2e2a24', { top: '#3e4a30', topK: 0.5 });
  }
  wzBake(site, b);
  // Geisterlaternen an vier Astenden (schaukeln)
  ends.slice(0, T.tier ? 5 : 3).forEach((e, k) => {
    const lb = new Bake3();
    lb.add(sphere3(0.02, 4, 3), '#2a2620', { p: [0, -0.4, 0], s: [1, 40, 1] });
    lb.add(lathe3('wzcage', [[0, 0], [0.2, 0.02], [0.24, 0.3], [0.2, 0.55], [0.06, 0.66], [0, 0.7]], 6), '#2a2a24', { p: [0, -1.5, 0] });
    lb.add(sphere3(0.16, 8, 6), '#a8ffd0', { p: [0, -1.22, 0], mat: 'pulse' });
    wzGlow(lb, 0, -1.22, 0, 1.8, '#6affb8', 0.8);
    wzAnim(site, lb, (o, t) => { o.rotation.z = Math.sin(t * 1.1 + k) * 0.14; o.rotation.x = Math.sin(t * 0.8 + k * 2) * 0.1; }, e[0], e[1], e[2]);
  });
  // Irrlichter kreisen um den Stamm
  WZ.emitters.push({ x: spot.x, z: spot.y, R: 50, rate: 1.2, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    wzSpawn({ x: spot.x + Math.cos(a) * (R + 1.5), y: 1 + Math.random() * 5, z: spot.y + Math.sin(a) * (R + 1.5), vy: 0.2, wob: 1.2, life: 6, s0: 0.42, s1: 0.3, c: '#a8ffc8', add: true });
  } });
}
// versunkene Ruinen: Säulengang, halb versunkener Tempel, Torbogen (Größe nach dem Platz)
function wzRuin(spot, k, rnd) {
  const site = wzSite(spot.x, spot.y, 110);
  const b = new Bake3();
  const s = Math.max(0.6, Math.min(1.2, spot.r / 3.4));
  const C = '#6e6e62';
  const TOP = '#46553a';
  const a = rnd() * Math.PI;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const kind = k % 3;
  if (kind === 0) {
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 2.1 * s;
      const h = (2.4 + rnd() * 1.6) * s;
      wzColumn(b, ca * o, -0.5, sa * o, h, 0.32 * s, C, TOP, [(rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25], i === 3 || rnd() < 0.3);
    }
    b.add(wbox(4.6 * s, 0.4 * s, 0.8 * s, 0.05), C, { p: [ca * -1.05 * s, 2.7 * s, sa * -1.05 * s], r: [0, -a, 0.08], top: TOP, topK: 0.7 });
  } else if (kind === 1) {
    for (let i = 0; i < 3; i++) b.add(wbox((5.4 - i * 0.8) * s, 0.5 * s, (4 - i * 0.6) * s, 0.06), C, { p: [0, -0.5 + i * 0.5 * s, 0], r: [0.05, -a, 0.04], top: TOP, topK: 0.8 });
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 1.15 * s;
      wzColumn(b, ca * o - sa * 1.1 * s, 0.9 * s, sa * o + ca * 1.1 * s, 2.6 * s, 0.24 * s, C, TOP, [0.05, 0, 0.04], i === 0);
    }
    b.add(prismGeo(), C, { p: [-sa * 1.1 * s + ca * 0.4 * s, 3.5 * s, ca * 1.1 * s + sa * 0.4 * s], s: [3.4 * s, 0.9 * s, 0.7 * s], r: [0.05, -a, 0.12], top: TOP, topK: 0.6 });
  } else {
    wzColumn(b, -ca * 1.6 * s, -0.5, -sa * 1.6 * s, 3.2 * s, 0.34 * s, C, TOP, [0, 0, 0.04]);
    wzColumn(b, ca * 1.6 * s, -0.5, sa * 1.6 * s, 3.2 * s, 0.34 * s, C, TOP, [0, 0, -0.04]);
    const arc = [];
    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * Math.PI;
      arc.push([-Math.cos(t) * 1.6 * s * ca, 2.75 * s + Math.sin(t) * 1.2 * s, -Math.cos(t) * 1.6 * s * sa]);
    }
    b.add(wzTube(arc, 0.32 * s, 0.32 * s, 10, 6), C, { top: TOP, topK: 0.6 });
    wzColumn(b, sa * 2.2 * s, -0.3, -ca * 2.2 * s, 2.6 * s, 0.3 * s, C, TOP, [Math.PI / 2 - 0.1, a, 0], true);
  }
  wzBake(site, b);
}

// Donnerklamm: Felsnadeln in der Klamm, Blitze schlagen in die mit Eisenspitze ein, Wasserfälle stürzen von den
// großen Nadeln in die Klamm (Gischt unten), ziehende Wolkenschatten, Sturmböen; Gratfeste: Sturmnadel mit
// Blitzableiter dicht vor der Nordmauer, Fahnen auf den Mauern.
WZ_MAPS[3] = (wm, T) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const spires = wzPickMany(F, T.tier ? 13 : 8, { cx: town.cx, cy: town.cy, R: 999, min: 2.1, cap: 4.5, distK: 0.006, sep: 22, town: { cx: town.cx, cy: town.cy, H: town.H + 3 } });
  const near = wzPick(F, { cx: town.cx - 10, cy: town.cy - town.H - 6, R: 12, min: 1.4, cap: 3, distK: 0.1 });
  if (near) spires.unshift(Object.assign(near, { town: true }));
  const targets = [];
  const falls = spires.filter((s) => !s.town).sort((a, b) => b.r - a.r).slice(0, T.tier ? 4 : 2);
  spires.forEach((sp, k) => {
    const site = wzSite(sp.x, sp.y, 140);
    const b = new Bake3();
    const r = Math.max(1, Math.min(sp.r - 0.5, 2.8));
    const h = sp.town ? 9 : 7 + r * 1.9 + rnd() * 2.5;
    const g = wzSpire(b, 0, 0, -2.4, h, r, k * 1.7 + 0.3, '#2e2a2a', '#8a8072', { cap: '#a49a8a' });
    const rod = sp.town || k % 3 === 1;
    if (rod) {
      b.add(sphere3(0.05, 6, 4), '#2a2a30', { p: [0, h + 0.7, 0], s: [1, 28, 1] });
      b.add(sphere3(0.12, 6, 4), '#cfe0ff', { p: [0, h + 2.1, 0], mat: 'pulse' });
      targets.push({ x: sp.x, y: h + 2.1, z: sp.y, town: !!sp.town });
    }
    if (falls.includes(sp)) {
      // Wasserfall aus einer Kerbe an der Südseite
      const yN = h * 0.6;
      const r0 = g.userData.rAt(Math.PI / 2 - (k * 1.7 + 0.3), yN) + 0.05;
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const y = yN + (-1.3 - yN) * t;
        pts.push([0, y, Math.max(r0 + 0.25 + Math.sqrt(t) * 0.6, g.userData.rAt(Math.PI / 2 - (k * 1.7 + 0.3), y) + 0.4)]);
      }
      wzMeshIn(site, wzStrip(pts, [0.28, 0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.55, 0.58, 0.6, 0.62], [1, 0, 0]), wzFallMat('#9ec4ea', '#ffffff'), { order: 3 });
      b.add(rockGeo(2, 1), '#5a5868', { p: [0, yN - 0.15, r0 - 0.1], s: [0.55, 0.35, 0.45] });
      const bx = sp.x;
      const bz = sp.y + r0 + 1.2;
      WZ.emitters.push({ x: bx, z: bz, R: 45, rate: 6, acc: 0, fn: () => wzSpawn({ x: bx + (Math.random() - 0.5) * 1.2, y: -1.3, z: bz + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 0.8, vy: 0.8 + Math.random(), vz: 0.4, life: 1.8, s0: 0.5, s1: 1.6, c: '#e8f2ff', a: 0.55 }) });
    }
    wzBake(site, b);
    if (!WZ.main && !sp.town) WZ.main = { x: sp.x, y: sp.y + r + 2 };
  });
  // Blitze: alle paar Sekunden in eine Nadel nahe der Figur (in der Stadt öfter in die Sturmnadel vor der Mauer)
  const bolt = wzBoltMesh();
  WZ.root.add(bolt);
  let next = 2;
  WZ.tick.push((t, dt, px, pz) => {
    if (bolt.visible) {
      bolt.userData.t += dt;
      const k = bolt.userData.t;
      bolt.visible = k < 0.42;
      const fl = k < 0.08 ? 1 : k < 0.16 ? 0.3 : k < 0.24 ? 0.9 : Math.max(0, 1 - (k - 0.24) / 0.18);
      bolt.material = wzMat('add');
      bolt.scale.setScalar(1);
      bolt.userData.fl = fl;
      bolt.geometry.attributes.color.array.fill(fl * 0.95);
      bolt.geometry.attributes.color.needsUpdate = true;
    }
    next -= dt;
    if (next > 0) return;
    next = 2.6 + Math.random() * 4.5;
    const cand = targets.filter((g) => Math.hypot(g.x - px, g.z - pz) < 38);
    if (!cand.length) return;
    const inTown = Math.max(Math.abs(px - town.cx), Math.abs(pz - town.cy)) < town.H + 4;
    const g = (inTown && cand.find((c) => c.town)) || cand[Math.floor(Math.random() * cand.length)];
    wzStrike(bolt, g.x, g.y, g.z, Math.random);
    WZ.flash = 1;
    for (let i = 0; i < 16; i++) wzSpawn({ x: g.x, y: g.y, z: g.z, vx: (Math.random() - 0.5) * 7, vz: (Math.random() - 0.5) * 7, vy: Math.random() * 5, grav: 9, life: 0.7, s0: 0.2, s1: 0.04, c: '#e0ecff', add: true });
    wzSpawn({ x: g.x, y: g.y, z: g.z, life: 0.5, s0: 3, s1: 1, c: '#8aa8ff', add: true });
  });
  // Wolkenschatten und Sturmböen
  wzMistLayer(wzMistMat('donner', '#0a0e16', 0.36, 0.022, 0.03), 0.07, 70);
  wzAround(7, (px, pz) => wzSpawn({ x: px - 14 + Math.random() * 6, y: 0.4 + Math.random() * 3.5, z: pz + (Math.random() - 0.6) * 18, vx: 16 + Math.random() * 8, vy: -0.3, life: 1.6, s0: 0.07, s1: 0.05, sx: 22, c: '#dce6ff', add: true, a: 0.35 }));
  wzAround(3, (px, pz) => wzSpawn({ x: px - 14 + Math.random() * 4, y: 0.3 + Math.random() * 2, z: pz + (Math.random() - 0.6) * 16, vx: 9 + Math.random() * 4, vy: 0.6, wob: 1.5, grav: 0.6, life: 3, s0: 0.08, s1: 0.06, c: '#6a6458', a: 0.85, vr: 6 }));
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  wzWallBanners(site, wm, 4, '#1e2a48', '#d8b060', 14);
};

// Spiegelbild des Mondes auf einem See (Scheibe mit Kratern, Glitzerbahn, Schein) – additiv auf der Wasserfläche
function wzMoonMat() {
  return wzShader('moonrefl', `
	vec2 c = vUv - 0.5;
	float rr = length(c * vec2(1.0, 0.86));
	float disc = 1.0 - smoothstep(0.1, 0.12, rr + sin(vW.x * 4.0 + uTime * 1.1) * 0.004);
	float cr = wzN(c * 24.0 + 3.0) * 0.6 + wzN(c * 51.0 + 9.0) * 0.4;
	vec3 moon = mix(vec3(0.62, 0.68, 0.86), vec3(0.96, 0.97, 1.0), smoothstep(0.3, 0.7, cr));
	float rip = 0.78 + 0.22 * sin(vW.z * 5.0 + vW.x * 1.3 + uTime * 1.6);
	float band = (1.0 - smoothstep(0.02, 0.12, abs(c.x))) * smoothstep(0.5, 0.15, abs(c.y));
	float glit = step(0.82, wzN(vec2(vW.x * 3.0, vW.z * 9.0 - uTime * 1.2))) * band;
	float halo = exp(-rr * rr * 34.0) * 0.32;
	vec3 col = moon * disc * rip * 0.55 + vec3(0.55, 0.65, 1.0) * (glit * 0.7 + halo * 0.7);
	float edge = 1.0 - smoothstep(0.36, 0.5, length(c));
	gl_FragColor = vec4(col * edge * (1.0 - wzFogK()), 1.0);`, { add: true });
}
// Mondfall: Mondlicht fällt in Strahlen auf die Kraterseen, der Mond spiegelt sich darin; im größten See liegt der
// gestürzte Mondsplitter (leuchtende Adern, kreisende Brocken, aufsteigender Glanz). Mondsichel: eine silberne
// Mondsichel auf einem Sockel im Mondsee der Stadt, angestrahlt; Fahnen in Nachtblau und Silber.
WZ_MAPS[11] = (wm, T) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const lakes = wzPickMany(F, 8, { cx: town.cx, cy: town.cy, R: 999, min: 3.6, cap: 12, distK: 0, sep: 24, town: { cx: town.cx, cy: town.cy, H: town.H + 3 } });
  const tilt = [-0.38, 0, 0.12];
  lakes.forEach((L, k) => {
    const site = wzSite(L.x, L.y, 130);
    const S = Math.min(L.r * 1.7, 13);
    if (k === 0) wzMoonShard(site, L, rnd, T);
    else {
      const pg = new THREE.PlaneGeometry(S, S);
      pg.rotateX(-Math.PI / 2);
      wzMeshIn(site, pg, wzMoonMat(), { p: [0, -0.1, 0], order: 3 });
    }
    wzBeam(site, 0, -0.2, 0, S * 0.3, S * 0.42, 26, '#c8d4ff', k === 0 ? 0.42 : 0.3, tilt);
  });
  if (lakes[0]) WZ.main = { x: lakes[0].x, y: lakes[0].y + Math.min(lakes[0].r, 6) + 3 };
  // Stadt: Mondsichel im Mondsee
  const spot = wzPick(F, { cx: town.cx + 11, cy: town.cy - 6, R: 10, min: 2.2, cap: 6, distK: 0.15 });
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  if (spot) {
    const ox = spot.x - site.position.x;
    const oz = spot.y - site.position.z;
    const b = new Bake3();
    b.add(lathe3('wzplinth', [[1.5, -0.6], [1.45, 0.1], [1.1, 0.25], [1.05, 0.55], [0.7, 0.7], [0.55, 1.3], [0.75, 1.45], [0, 1.5]], 10), '#3a4266', { p: [ox, 0, oz], top: '#8a96c8', topK: 0.6 });
    wzBake(site, b);
    const cb = new Bake3();
    const RM = 2.3;
    const arcPts = [];
    for (let i = 0; i <= 16; i++) {
      const a = -2.1 + (i / 16) * 4.2;
      arcPts.push([Math.sin(a) * RM, Math.cos(a) * RM, 0]);
    }
    cb.add(wzTube(arcPts, 0.06, (t) => 0.06 + 0.5 * Math.sin(Math.PI * t), 18, 8), '#dfe6fa', { shine: 0.8, top: '#ffffff', topK: 0.4 });
    for (const q of [arcPts[3], arcPts[8], arcPts[13]]) wzGlow(cb, q[0], q[1], 0.1, 2.6, '#8aa0ff', 0.55);
    wzAnim(site, cb, (o, t) => { o.rotation.y = Math.sin(t * 0.25) * 0.35; o.position.y = 1.5 + RM + Math.sin(t * 0.7) * 0.08; }, ox, 1.5 + RM, oz);
    wzBeam(site, ox, -0.1, oz, 2.4, 3.6, 24, '#d0dcff', 0.38, tilt);
    const pg = new THREE.PlaneGeometry(7, 7);
    pg.rotateX(-Math.PI / 2);
    wzMeshIn(site, pg, wzMoonMat(), { p: [ox, -0.1, oz + 3.2], order: 3 });
    WZ.emitters.push({ x: spot.x, z: spot.y, R: 40, rate: 2, acc: 0, fn: () => wzSpawn({ x: spot.x + (Math.random() - 0.5) * 3, y: 1.5 + Math.random() * 4, z: spot.y + (Math.random() - 0.5) * 1.2, vy: 0.3, wob: 0.4, life: 4, s0: 0.1, s1: 0.04, c: '#e8eeff', add: true }) });
  }
  wzWallBanners(site, wm, 5, '#1e2a5a', '#c8d0f0', 12);
  // Mondstaub schwebt über den Wiesen
  wzAround(1.5, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 26, y: 0.3 + Math.random() * 2, z: pz + (Math.random() - 0.6) * 20, vy: 0.25, wob: 0.5, life: 5, s0: 0.09, s1: 0.05, c: '#d8e0ff', add: true }));
};
function wzMoonShard(site, L, rnd, T) {
  const b = new Bake3();
  const R = Math.max(2.4, Math.min(L.r - 1.2, 5.5));
  b.add(rockGeo(3, 1), '#4a5274', { p: [0, -R * 0.15, 0], s: [R, R * 1.25, R * 0.85], r: [0.25, 0.6, 0.15], top: '#9aa6d0', topK: 0.45, shade: 0.4 });
  b.add(rockGeo(5, 1), '#3e4666', { p: [R * 0.6, -0.3, R * 0.35], s: [R * 0.55, R * 0.6, R * 0.5], r: [0, 1.4, -0.3], top: '#8a96c4', topK: 0.45 });
  // leuchtende Risse quer über den Stein
  for (let k = 0; k < 5; k++) {
    const a = k * 1.25 + rnd() * 0.4;
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const aa = a + (t - 0.5) * 0.9 + Math.sin(t * 7 + k) * 0.08;
      const y = R * (0.15 + t * 0.55);
      const rr = R * 1.0 * Math.sqrt(Math.max(0.05, 1 - Math.pow((y + R * 0.15) / (R * 1.1), 2)));
      pts.push([Math.cos(aa) * rr, y, Math.sin(aa) * rr * 0.85]);
    }
    b.add(wzTube(pts, 0.16, 0.08, 8, 4), '#c8dcff', { mat: 'glow' });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + rnd() * 0.5;
    const h = R * (0.2 + rnd() * 0.6);
    wzCrystal(b, '#b8d0ff', { p: [Math.cos(a) * R * 0.8, h, Math.sin(a) * R * 0.7], r: 0.3 + rnd() * 0.25, len: 1.6 + rnd() * 1.8, tilt: [Math.sin(a) * 0.9, a, -Math.cos(a) * 0.9], mat: 'glow' });
    wzGlow(b, Math.cos(a) * R * 0.8, h, Math.sin(a) * R * 0.7, 1.6, '#6a8aff', 0.5);
  }
  wzGlow(b, 0, R * 0.6, 0, R * 3.4, '#4a64d0', 0.4);
  wzBake(site, b);
  const fb = new Bake3();
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    fb.add(rockGeo(k % 6, 0), '#5a6488', { p: [Math.cos(a) * R * 1.35, R * (0.7 + (k % 3) * 0.3), Math.sin(a) * R * 1.35], s: 0.3 + (k % 3) * 0.2, r: [k, k * 2, 0], top: '#ffffff' });
  }
  wzAnim(site, fb, (o, t) => { o.rotation.y = t * 0.12; o.position.y = Math.sin(t * 0.5) * 0.3; });
  WZ.emitters.push({ x: L.x, z: L.y, R: 60, rate: 3, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    wzSpawn({ x: L.x + Math.cos(a) * R * 0.8, y: R * 0.5, z: L.y + Math.sin(a) * R * 0.7, vy: 0.8 + Math.random() * 0.6, wob: 0.6, life: 5, s0: 0.16, s1: 0.05, c: '#c8d8ff', add: true });
  } });
}

// Aschewald: ein glimmender Riesenbaumstumpf mitten im verkohlten Wald (Glutrisse, Glutbett in der Höhlung, Rauch,
// Funkenfontäne), Funkenregen und Asche überall; Palisadenstern: Feuerkörbe auf den acht Spitzen, ein großes
// Signalfeuer im Norden, Fahnen in Kohle und Glut.
WZ_MAPS[12] = (wm, T) => {
  const F = wzField(wm, 'wild', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const st = wzPick(F, { cx: town.cx - 26, cy: town.cy - 26, R: 50, min: 6, cap: 9, distK: 0.06, town: { cx: town.cx, cy: town.cy, H: town.H + 6 } });
  if (st) {
    wzStump(st, rnd, T);
    WZ.main = { x: st.x, y: st.y + Math.min(st.r, 7) + 2 };
  }
  // Palisadenstern: Spitzen in acht Richtungen
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const b = new Bake3();
  const w = game.world;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    let best = null;
    let bs = -1e9;
    for (let dy = -town.H; dy <= town.H; dy++) for (let dx = -town.H; dx <= town.H; dx++) {
      if (w.obj[(town.cy + dy) * MAP_W + town.cx + dx] !== OBJ.WALL) continue;
      const d = Math.hypot(dx, dy);
      const da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - a), Math.cos(Math.atan2(dy, dx) - a)));
      if (da > 0.3) continue;
      const s = d - da * 6;
      if (s > bs) { bs = s; best = [dx, dy]; }
    }
    if (!best) continue;
    const [dx, dy] = best;
    const big = k === 0;
    b.add(lathe3('wzpole', [[0.16, 0], [0.12, 1], [0.1, 1.02], [0, 1.03]], 6), '#2a1e18', { p: [dx, 0, dy], s: [1, big ? 4.2 : 3.4, 1] });
    wzBrazier(b, site, dx, big ? 4.2 : 3.4, dy, big ? 1.9 : 1.2, '#ff7a2a');
  }
  wzBake(site, b);
  wzWallBanners(site, wm, 5, '#2a1612', '#ff8a3a', 10);
  // Funkenregen und Asche
  wzAround(4, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 28, y: 6 + Math.random() * 4, z: pz + (Math.random() - 0.65) * 22, vy: -0.9, vx: 0.3, wob: 0.9, life: 8, s0: 0.1, s1: 0.06, c: '#ffb060', c2: '#ff4a10', add: true, y0: 0 }));
  wzAround(3, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 28, y: 6 + Math.random() * 3, z: pz + (Math.random() - 0.65) * 22, vy: -0.7, vx: 0.4, wob: 0.6, life: 9, s0: 0.12, s1: 0.1, c: '#4a4442', a: 0.8, y0: 0, vr: 2 }));
  // Glutfelder sprühen Funken
  wzAround(2.5, (px, pz) => {
    const t = wzNearTile(px, pz, 14, (i) => wzGround(i) === GROUND.LAVA);
    if (t) for (let k = 0; k < 3; k++) wzSpawn({ x: t[0], y: 0, z: t[1], vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), vy: 2 + Math.random() * 3, grav: 2, wob: 1, life: 1.6, s0: 0.12, s1: 0.04, c: '#ffd070', c2: '#ff3a0a', add: true });
  });
};
function wzStump(spot, rnd, T) {
  const site = wzSite(spot.x, spot.y, 150);
  const b = new Bake3();
  const R = Math.max(3.5, Math.min(spot.r - 1.5, 6.5));
  const H = R * 0.95;
  const stump = wzLathe([[R * 1.45, -0.5], [R * 1.12, 0.3], [R, 1.3], [R * 0.95, H * 0.55], [R * 0.92, H * 0.85], [R * 0.9, H], [R * 0.7, H * 0.95], [R * 0.64, H * 0.7], [R * 0.45, H * 0.6], [0, H * 0.6]], 24, {
    seed: 12, jit: 0.06, jag: [5, R * 0.55], lobe: (a, t) => 0.05 * Math.sin(a * 13) * (1 - t),
    col: (t, a, i) => (i >= 6 ? mixColor('#3a1a0e', '#6a2a10', (9 - i) / 3) : mixColor('#120d0b', '#2c211c', t * 0.9 + 0.1 * Math.sin(a * 7)))
  });
  b.add(stump, null);
  b.add(geo3('wzdisc20', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), '#ff6a1a', { p: [0, H * 0.62, 0], s: R * 0.62, mat: 'pulse' });
  wzSurfaceStreams(b, stump, 10, 0.3, H * 0.92, 0.08, 0.16, '#ff8a2a', '#ff4a10', '#a01a08', rnd, 'pulse', 0.03);
  for (let k = 0; k < 8; k++) {
    const a = k * 0.8 + rnd() * 0.3;
    const reach = Math.max(R + 0.6, Math.min(R + 3.2, spot.r - 0.4));
    b.add(wzTube([[Math.cos(a) * R * 0.95, 1.1, Math.sin(a) * R * 0.95], [Math.cos(a) * (R + reach) / 2, 0.6, Math.sin(a) * (R + reach) / 2], [Math.cos(a + 0.12) * reach, -0.4, Math.sin(a + 0.12) * reach]], 0.85, 0.25, 6, 7), '#16100d', { top: '#2a201a', topK: 0.4 });
  }
  wzGlow(b, 0, H * 0.85, 0, R * 2.4, '#ff6a1a', 0.6);
  wzBake(site, b);
  const Y = H * 0.65;
  WZ.emitters.push({ x: spot.x, z: spot.y, R: 100, rate: 1.4, acc: 0, fn: () => wzSpawn({ x: spot.x + (Math.random() - 0.5) * R, y: Y, z: spot.y + (Math.random() - 0.5) * R, vy: 1.7 + Math.random() * 0.6, vx: 0.4, drag: 0.04, life: 9, s0: R * 0.3, s1: R * 0.9, c: '#4a2a1e', c2: '#2e2a2a', a: 0.55, vr: 0.2 }) });
  WZ.emitters.push({ x: spot.x, z: spot.y, R: 80, rate: 9, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    wzSpawn({ x: spot.x + Math.cos(a) * R * 0.4, y: Y, z: spot.y + Math.sin(a) * R * 0.4, vx: Math.cos(a) * 0.8, vz: Math.sin(a) * 0.8, vy: 3 + Math.random() * 4, grav: 1.2, wob: 1.6, life: 3.2, s0: 0.16, s1: 0.04, c: '#ffd070', c2: '#ff3a0a', add: true });
  } });
}

// Knochenwüste: ein gewaltiges Fossil-Skelett liegt im Treibsand eines Dünentals (Wirbelsäule, Rippenbögen, Schädel
// mit Hörnern, Krallen), einzelne Riesenrippen ragen anderswo aus dem Sand; Sandschleier und ab und zu eine
// Windhose. Dünenlinse: ein gehörnter Riesenschädel als Brunnen im Oasenteich, Fahnen in Ocker und Knochenweiß.
WZ_MAPS[13] = (wm, T) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const sp = wzPick(F, { cx: town.cx + 4, cy: town.cy + 30, R: 50, min: 4.2, cap: 6, distK: 0.06, town: { cx: town.cx, cy: town.cy, H: town.H + 4 } });
  if (sp) {
    const pts = wzTrace(F, sp, 15);
    wzSkeleton(pts, F, rnd, T);
    WZ.main = { x: sp.x, y: sp.y + 7 };
  }
  const ribs = wzPickMany(F, T.tier ? 6 : 3, { cx: town.cx, cy: town.cy, R: 999, min: 3.4, cap: 5, distK: 0.004, sep: 34, town: { cx: town.cx, cy: town.cy, H: town.H + 4 }, avoid: sp ? [Object.assign({}, sp, { r: 60 })] : [] });
  for (const r of ribs) {
    const site = wzSite(r.x, r.y, 110);
    const b = new Bake3();
    const s = Math.min(1.2, r.r / 4);
    const a = rnd() * Math.PI;
    for (let j = 0; j < 2 + (rnd() < 0.5 ? 1 : 0); j++) {
      const o = (j - 0.5) * 1.6 * s;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        pts.push([ca * o + -sa * (t - 0.5) * 5 * s, -0.4 + Math.sin(t * Math.PI) * 4.2 * s * (1 - t * 0.25), sa * o + ca * (t - 0.5) * 5 * s]);
      }
      b.add(wzTube(pts.slice(0, j === 1 ? 5 : 7), 0.28 * s, 0.1 * s, 12, 6), '#d6ccae', { top: '#efe8d2', topK: 0.5, shade: 0.2 });
    }
    wzBake(site, b);
  }
  // Stadt: Schädelbrunnen im Oasenteich
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const pond = wzPick(F, { cx: town.cx, cy: town.cy - 5, R: 8, min: 0.9, cap: 3, distK: 0.2 });
  if (pond) {
    const b = new Bake3();
    const ox = pond.x - site.position.x;
    const oz = pond.y - site.position.z - 0.5;
    wzSkull(b, ox, 0.15, oz, 0.62, 0, rnd);
    wzBake(site, b);
    const pts = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([ox, 0.62 - t * 0.75, oz + 1.25 + t * 0.35]); }
    wzMeshIn(site, wzStrip(pts, [0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22], [1, 0, 0]), wzFallMat('#7ac0d8', '#ffffff'), { order: 3 });
  }
  wzWallBanners(site, wm, 5, '#c8b48a', '#6a3a1a', 10);
  // Sandschleier, Windhosen
  wzAround(6, (px, pz) => wzSpawn({ x: px - 16 + Math.random() * 8, y: 0.15 + Math.random() * 0.7, z: pz + (Math.random() - 0.6) * 20, vx: 6 + Math.random() * 3, life: 3, s0: 0.5, s1: 1.2, sx: 4, c: '#d4c094', a: 0.32 }));
  let devil = 6;
  WZ.tick.push((t, dt, px, pz) => {
    devil -= dt;
    if (devil > 0) return;
    devil = 9 + Math.random() * 10;
    const c = wzNearTile(px, pz, 12, (i) => !LIQUID.has(wzGround(i)));
    if (!c) return;
    const cx = c[0];
    const cz = c[1];
    for (let k = 0; k < 40; k++) {
      const h0 = Math.random() * 0.4;
      wzSpawn({ x: cx, y: h0, z: cz, vy: 1.4 + Math.random() * 1.2, life: 3 + Math.random() * 2, s0: 0.35, s1: 0.9, c: '#cbb88e', a: 0.45, rot: Math.random() * 6,
        on: (p) => { const a = p.age * 5 + p.ph; const rr = 0.25 + p.y * 0.35; p.x = cx + Math.cos(a) * rr + p.age * 0.8; p.z = cz + Math.sin(a) * rr; } });
    }
  });
};
// Tal entlang: von der Stelle nach Osten und Westen, je Schritt die Mitte des Treibsands
function wzTrace(F, sp, maxLen) {
  let pts = [[sp.x, sp.y]];
  for (const dir of [1, -1]) {
    let x = sp.x;
    let y = sp.y;
    const side = [];
    for (let k = 0; k < maxLen; k++) {
      x += dir;
      let best = -1;
      let by = y;
      for (let dy = -1.5; dy <= 1.5; dy += 0.5) {
        const f = F.at(x, y + dy) - Math.abs(dy) * 0.1;
        if (f > best) { best = f; by = y + dy; }
      }
      if (best < 3) break;
      y = by;
      side.push([x, y]);
    }
    if (dir > 0) pts = pts.concat(side);
    else pts = side.reverse().concat(pts);
  }
  for (let pass = 0; pass < 3; pass++) pts = pts.map((p, i) => (i && i < pts.length - 1 ? [p[0], (pts[i - 1][1] + p[1] * 2 + pts[i + 1][1]) / 4] : p));
  return pts;
}
// Schädel: lang, mit Augenhöhlen, Hörnern und aufgeklapptem Kiefer; blickt nach dir (Winkel um die Hochachse)
function wzSkull(b, x, y, z, s, dir, rnd) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(s, s, s));
  const BONE = '#d8ccac';
  b.add(rockGeo(4, 1), BONE, { parent: M, p: [0, 0.9, 0], s: [1.35, 1.3, 1.6], top: '#f0e8d4', topK: 0.5, shade: 0.3 });
  b.add(rockGeo(1, 1), BONE, { parent: M, p: [0, 0.7, 1.6], s: [0.85, 0.8, 1.3], top: '#f0e8d4', topK: 0.5 });
  for (const sx of [-1, 1]) {
    b.add(sphere3(0.36, 8, 6), '#1a1410', { parent: M, p: [sx * 0.72, 1.2, 1.15] });
    b.add(wzTube([[sx * 0.9, 1.7, 0.2], [sx * 1.9, 2.2, -0.2], [sx * 2.4, 2.9, -1.0], [sx * 2.2, 3.4, -1.9]], 0.32, 0.05, 10, 6), '#cfc2a0', { parent: M, top: '#ece2c8' });
  }
  b.add(sphere3(0.18, 6, 4), '#1a1410', { parent: M, p: [0, 0.85, 2.75], s: [1.4, 1, 1] });
  b.add(wbox(1.3, 0.3, 2.2, 0.08), BONE, { parent: M, p: [0, 0.05, 1.7], r: [0.25, 0, 0] });
  for (let k = 0; k < 5; k++) b.add(geo3('wzmoss', () => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, -0.5, 0)), '#efe6cc', { parent: M, p: [(k - 2) * 0.28, 0.32, 2.4 - Math.abs(k - 2) * 0.12], s: [0.07, 0.3, 0.07] });
}
function wzSkeleton(pts, F, rnd, T) {
  const n = pts.length;
  const [ox, oz] = pts[Math.floor(n / 2)];
  const site = wzSite(ox, oz, 150);
  const b = new Bake3();
  const BONE = '#d6caa8';
  const TOP = '#f0e8d2';
  // Länge entlang der Linie
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[n - 1];
  const at = (d) => {
    let i = 0;
    while (i < n - 2 && L[i + 1] < d) i++;
    const f = (d - L[i]) / Math.max(1e-4, L[i + 1] - L[i]);
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dz) || 1;
    return { x, z, dx: dx / l, dz: dz / l };
  };
  // Kopf am Westende (d = 0), Schwanz im Osten
  const hgt = (t) => (t < 0.08 ? 1.6 + t * 8 : t < 0.8 ? 2.2 + 2.2 * Math.sin(((t - 0.08) / 0.72) * Math.PI) : Math.max(-0.4, 2.2 * (1 - (t - 0.8) / 0.18)));
  const spine = [];
  for (let d = 0; d <= total; d += 0.8) {
    const t = d / total;
    const p = at(d);
    const h = hgt(t);
    spine.push([p.x - ox, h, p.z - oz]);
    const sz = t > 0.8 ? 1 - (t - 0.8) * 3.5 : 1;
    if (h > -0.2) b.add(rockGeo(2, 0), BONE, { p: [p.x - ox, h, p.z - oz], s: [0.6 * sz, 0.5 * sz, 0.55 * sz], r: [0, Math.atan2(p.dx, p.dz), 0], top: TOP, topK: 0.5 });
    if (t > 0.1 && t < 0.78) b.add(geo3('wzmoss', () => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, -0.5, 0)), BONE, { p: [p.x - ox, h + 0.2, p.z - oz], s: [0.1, -(0.5 + Math.sin(((t - 0.1) / 0.68) * Math.PI) * 1.4), 0.1] });
  }
  b.add(wzTube(spine.filter((q) => q[1] > -0.5), 0.3, 0.1, Math.min(60, spine.length * 2), 7), BONE, { top: TOP, topK: 0.4 });
  // Rippen
  for (let d = total * 0.14; d < total * 0.64; d += 1.5) {
    const t = d / total;
    const p = at(d);
    const h = hgt(t);
    const env = 0.6 + 0.4 * Math.sin(((t - 0.14) / 0.5) * Math.PI);
    const w = Math.max(1.6, Math.min(F.at(p.x, p.z) - 0.7, 3.8)) * env;
    for (const s of [-1, 1]) {
      const sx = -p.dz * s;
      const sz = p.dx * s;
      const x0 = p.x - ox;
      const z0 = p.z - oz;
      b.add(wzTube([[x0 + sx * 0.25, h, z0 + sz * 0.25], [x0 + sx * w * 0.55, h + 0.8, z0 + sz * w * 0.55], [x0 + sx * w * 0.97, h * 0.5, z0 + sz * w * 0.97], [x0 + sx * w * 0.9, -0.5, z0 + sz * w * 0.9]], 0.22, 0.08, 10, 5), BONE, { top: TOP, topK: 0.5, shade: 0.2 });
    }
  }
  // Beine mit Krallen (vorn und hinten), halb im Sand
  for (const t of [0.17, 0.66]) {
    const p = at(total * t);
    for (const s of [-1, 1]) {
      const sx = -p.dz * s;
      const sz = p.dx * s;
      const x0 = p.x - ox;
      const z0 = p.z - oz;
      const h = hgt(t);
      const lk = Math.max(0.5, Math.min(1, (F.at(p.x, p.z) - 0.6) / 4.2));
      const k0 = [x0 + sx * 0.6, h - 0.2, z0 + sz * 0.6];
      const k1 = [x0 + (sx * 2.4 + p.dx * 0.8) * lk, 1.4, z0 + (sz * 2.4 + p.dz * 0.8) * lk];
      const k2 = [x0 + (sx * 3.0 + p.dx * 1.6) * lk, -0.2, z0 + (sz * 3.0 + p.dz * 1.6) * lk];
      b.add(wzTube([k0, [(k0[0] + k1[0]) / 2, h + 0.6, (k0[2] + k1[2]) / 2], k1], 0.26, 0.18, 6, 6), BONE, { top: TOP });
      b.add(wzTube([k1, k2], 0.18, 0.12, 3, 6), BONE);
      for (let c = -1; c <= 1; c++) b.add(wzTube([k2, [k2[0] + p.dx * 0.7 + sx * c * 0.3, 0.1, k2[2] + p.dz * 0.7 + sz * c * 0.3], [k2[0] + p.dx * 1.1 + sx * c * 0.4, -0.3, k2[2] + p.dz * 1.1 + sz * c * 0.4]], 0.09, 0.02, 4, 5), '#c8bc9a');
    }
  }
  const h0 = at(0);
  wzSkull(b, h0.x - ox + h0.dx * 2.8, 0.4, h0.z - oz + h0.dz * 2.8, 1.45, Math.atan2(-h0.dx, -h0.dz), rnd);
  wzBake(site, b);
}

// Blutsteppe: aus einer Felsklippe im Blutsee des Kessels stürzt ein blutroter Wasserfall, schwarze Obelisken mit
// glühenden Spitzen stehen im See, roter Dunst liegt im Kessel; Kesselrand: ein Obelisk als Blutbrunnen im Becken
// der Stadt (vier Speier), Fahnen in Dunkelrot.
WZ_MAPS[14] = (wm, T) => {
  const [rx, ry] = wm.region;
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const K = (MAP_FORMS[14] && MAP_FORMS[14].kessel) || [140, 92, 118, 76];
  const kx = rx + K[0];
  const ky = ry + K[1];
  const crag = wzPick(F, { cx: kx, cy: ky - 10, R: 30, min: 4.5, cap: 8, distK: 0.08 });
  if (crag) {
    const site = wzSite(crag.x, crag.y, 150);
    const b = new Bake3();
    const r = Math.max(2.5, Math.min(crag.r - 1, 4.6));
    const h = 12.5;
    const g = wzSpire(b, 0, 0, -1.2, h, r, 3.3, '#24141a', '#6a3e40', { cap: '#7a4a4a', seg: 12 });
    // Speier-Kerben und Wasserfälle (Süden, Osten)
    for (const [ang, yK, w] of [[Math.PI / 2, 0.72, 0.62], [0.35, 0.5, 0.38]]) {
      const yN = h * yK;
      const r0 = g.userData.rAt(ang - 3.3, yN) + 0.05;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const y = yN + (-0.3 - yN) * t;
        const o = Math.max(r0 + 0.3 + Math.sqrt(t) * 0.5, g.userData.rAt(ang - 3.3, y) + 0.4);
        pts.push([dx * o, y, dz * o]);
      }
      const ws = pts.map((_, i) => w * (0.7 + i * 0.05));
      wzMeshIn(site, wzStrip(pts, ws, [-dz, 0, dx]), wzFallMat('#7a0816', '#e83a4a'), { order: 3 });
      b.add(rockGeo(5, 1), '#3a2228', { p: [dx * (r0 - 0.15), yN - 0.1, dz * (r0 - 0.15)], s: [0.7, 0.4, 0.6] });
      const bx = crag.x + dx * (r0 + 1.2 + r * 0.12);
      const bz = crag.y + dz * (r0 + 1.2 + r * 0.12);
      WZ.emitters.push({ x: bx, z: bz, R: 50, rate: 5 * w, acc: 0, fn: () => {
        wzSpawn({ x: bx + (Math.random() - 0.5), y: -0.3, z: bz + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 0.6, vy: 0.7 + Math.random() * 0.8, life: 2, s0: 0.6, s1: 1.8, c: '#8a2030', a: 0.45 });
        if (Math.random() < 0.5) wzSpawn({ x: bx, y: -0.2, z: bz, vx: (Math.random() - 0.5) * 2.5, vz: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 2, grav: 8, life: 0.8, s0: 0.12, s1: 0.06, c: '#c01828', a: 0.9 });
      } });
    }
    wzBake(site, b);
    WZ.main = { x: crag.x, y: crag.y + r + 4 };
  }
  const obel = wzPickMany(F, T.tier ? 7 : 4, { cx: kx, cy: ky, R: 40, min: 1.9, cap: 3, distK: 0.0, sep: 15, avoid: crag ? [Object.assign({}, crag, { r: 30 })] : [] });
  obel.forEach((o, k) => {
    const site = wzSite(o.x, o.y, 120);
    const b = new Bake3();
    const s = 0.8 + rnd() * 0.45;
    const M = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.14, Math.PI / 4 + rnd(), (rnd() - 0.5) * 0.14)), new THREE.Vector3(s, s, s));
    b.add(lathe3('wzobel', [[0.95, -1.2], [0.9, 0], [0.56, 7.2], [0, 8.4]], 4), '#130d12', { parent: M, shade: 0.3, top: '#2e2430', topK: 0.4 });
    b.add(lathe3('wzobeltip', [[0.6, 7.1], [0.6, 7.2], [0, 8.48]], 4), '#ff2a3a', { parent: M, mat: 'pulse' });
    wzGlow(b, 0, 7.9 * s, 0, 3.6, '#ff2a3a', 0.7);
    for (let j = 0; j < 3; j++) b.add(wbox(0.95, 0.12, 0.95, 0.03), '#8a1020', { parent: M, p: [0, 1.2 + j * 1.9, 0], s: [1 - j * 0.14, 1, 1 - j * 0.14], mat: 'pulse' });
    wzBake(site, b);
  });
  // roter Dunst im Kessel (nur, wenn man drin ist)
  const mist = wzMistLayer(wzMistMat('blut', '#6a1018', 0.26, 0.05, 0.02), 0.25, 64);
  WZ.tick.push((t, dt, px, pz) => { mist.visible = Math.hypot((px - kx) / K[2], (pz - ky) / K[3]) < 0.78; });
  // Stadt: Blutbrunnen
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const pool = wzPick(F, { cx: town.cx - 8, cy: town.cy - 9, R: 9, min: 1.6, cap: 4, distK: 0.1 });
  if (pool) {
    const ox = pool.x - site.position.x;
    const oz = pool.y - site.position.z;
    const b = new Bake3();
    b.add(lathe3('wzobelS', [[0.62, -0.9], [0.58, 0], [0.38, 4.0], [0, 4.7]], 4), '#130d12', { p: [ox, 0, oz], r: [0, Math.PI / 4, 0], shade: 0.3, top: '#2e2430' });
    b.add(lathe3('wzobelStip', [[0.41, 3.85], [0.41, 3.95], [0, 4.75]], 4), '#ff2a3a', { p: [ox, 0, oz], r: [0, Math.PI / 4, 0], mat: 'pulse' });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      b.add(rockGeo(1, 0), '#2a1a20', { p: [ox + dx * 0.5, 3.0, oz + dz * 0.5], s: [0.22, 0.16, 0.22] });
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push([ox + dx * (0.55 + t * 0.9), 3.0 - t * t * 3.2, oz + dz * (0.55 + t * 0.9)]);
      }
      wzMeshIn(site, wzStrip(pts, [0.07, 0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15], [-dz, 0, dx]), wzFallMat('#7a0816', '#e83a4a'), { order: 3 });
    }
    wzBake(site, b);
  }
  wzWallBanners(site, wm, 5, '#5a0c14', '#d8c8b0', 12);
  wzAround(2, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 28, y: 0.3 + Math.random() * 2.5, z: pz + (Math.random() - 0.6) * 20, vx: 0.4, vy: 0.15, wob: 0.5, life: 6, s0: 0.1, s1: 0.06, c: '#ff4a5a', add: true, a: 0.7 }));
};

// Nachtfrost: Eisriesen stehen bis zur Hüfte in den Gletscherspalten, das Schwert vor sich in die Tiefe gestoßen,
// mit leuchtenden Augen; Nordlicht hängt in Bändern fest über der Karte (seit 14.85) und spiegelt sich auf dem Schnee,
// Eisglitzer in der Luft. Kreuzfeste: Eiskristalle auf den vier inneren Ecken, ein schwebendes Frostherz über dem
// Weltentor, Fahnen in Nachtblau und Eisweiß.
WZ_MAPS[15] = (wm, T) => {
  const F = wzField(wm, 'liq', false);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const giants = wzPickMany(F, T.tier ? 6 : 3, { cx: town.cx + 20, cy: town.cy, R: 999, min: 1.4, cap: 2.5, distK: 0.004, sep: 34, town: { cx: town.cx, cy: town.cy, H: town.H + 6 } });
  giants.forEach((g, k) => {
    const site = wzSite(g.x, g.y, 140);
    const b = new Bake3();
    // Spalte läuft eher waagrecht? Dann blickt der Riese nach Osten, sonst nach Süden (zur Kamera)
    const horiz = F.at(g.x + 2, g.y) + F.at(g.x - 2, g.y) > F.at(g.x, g.y + 2) + F.at(g.x, g.y - 2);
    wzIceGiant(b, rnd, 1.15 + rnd() * 0.25, k, horiz ? Math.PI / 2 : 0);
    wzBake(site, b);
    if (!k) WZ.main = { x: g.x, y: g.y + 5 };
  });
  // Nordlicht: seit 14.85 fest über der Karte verankert (vorher lief die Gruppe mit der Figur mit – beim Laufen
  // wanderten die Bänder mit der Kamera). Jetzt: Bänder in einem festen Raster über die ganze Karte verteilt, jede
  // Gruppe bleibt an ihrem Ort; nur die Wellen im Shader bewegen sich. Gruppen außerhalb des Bildes werden nicht gezeichnet.
  if (T.tier) {
    const mat = wzAuroraMat('nord', '#5affb0', '#9a5aff', 0.5);
    const [rx, ry, rw, rh] = wm.region;
    const STEP_X = 64, STEP_Y = 44;
    for (let gy = ry + STEP_Y / 2; gy < ry + rh; gy += STEP_Y) for (let gx = rx + STEP_X / 2; gx < rx + rw; gx += STEP_X) {
      const grp = new THREE.Group();
      grp.position.set(gx + (rnd() - 0.5) * 18, 0, gy + (rnd() - 0.5) * 12);
      grp.rotation.y = (rnd() - 0.5) * 0.5;
      WZ.root.add(grp);
      const ph = rnd() * 6;
      for (let j = 0; j < 3; j++) {
        const path = [];
        for (let i = 0; i <= 30; i++) path.push([-36 + i * 2.4, -6 - j * 7 + Math.sin(i * 0.35 + j * 2 + ph) * 3, Math.sin(i * 0.5 + j + ph) * 0.8]);
        const g = wzCurtainGeo(path, 5.5 + j * 1.2, 13 + j * 2);
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat);
        m.renderOrder = 4;
        grp.add(m);
      }
    }
    wzMistLayer(wzMistMat('nordschnee', '#2a9a7a', 0.22, 0.03, 0.02, true), 0.05, 64);
  }
  wzAround(3, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 22, y: 0.4 + Math.random() * 3, z: pz + (Math.random() - 0.6) * 18, vy: -0.1, wob: 0.3, life: 3, s0: 0.07, s1: 0.03, c: '#e8f4ff', add: true }));
  // Stadt
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const b = new Bake3();
  const w = game.world;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    let best = null;
    for (let r = 6; r <= 9 && !best; r++) for (const [ax, ay] of [[r, r], [r, r - 1], [r - 1, r]]) {
      const x = town.cx + sx * ax;
      const y = town.cy + sy * ay;
      if (!best && w.obj[y * MAP_W + x] === OBJ.WALL) best = [x + 0.5 - site.position.x, y + 0.5 - site.position.z];
    }
    if (!best) continue;
    const [px, pz] = best;
    for (let j = 0; j < 3; j++) wzCrystal(b, j === 1 ? '#bfe6ff' : '#9cc8f0', { p: [px + (j - 1) * 0.3, 1.5 + (j === 1 ? 1.6 : 0.9), pz + (j - 1) * 0.15], r: j === 1 ? 0.42 : 0.28, len: j === 1 ? 2.6 : 1.5, tilt: [(j - 1) * 0.3, j, (1 - j) * 0.25], top: '#ffffff', flat: true });
    wzGlow(b, px, 3.0, pz, 3.2, '#7ac8ff', 0.6);
  }
  wzBake(site, b);
  const gate = w.npcs.find((n) => n.id === 'weltentor' && Math.abs(n.x / TILE - town.cx) < town.H && Math.abs(n.y / TILE - town.cy) < town.H);
  if (gate) {
    const hb = new Bake3();
    wzCrystal(hb, '#bfe6ff', { p: [0, 0, 0], r: 0.55, len: 1.4, top: '#ffffff' });
    for (let k = 0; k < 4; k++) wzCrystal(hb, '#9cc8f0', { p: [Math.cos(k * 1.57) * 0.95, 0, Math.sin(k * 1.57) * 0.95], r: 0.16, len: 0.6, tilt: [0, k, 0.4] });
    wzGlow(hb, 0, 0, 0, 4.2, '#8ad0ff', 0.75);
    wzAnim(site, hb, (o, t) => { o.rotation.y = t * 0.6; o.position.y = 5.4 + Math.sin(t * 1.2) * 0.2; }, gate.x / TILE - site.position.x, 5.4, gate.y / TILE - site.position.z - 0.3);
  }
  wzWallBanners(site, wm, 5, '#1e3060', '#bfe0ff', 12);
};
// Eisriese: Beine in der Spalte, Rumpf, Schulterpanzer, Helm mit Hörnern, Bart aus Eiszapfen, Hände auf dem Knauf
// eines Schwerts, das vor ihm in die Spalte gestoßen ist; Augen leuchten. Blickt nach Süden (zur Kamera).
function wzIceGiant(b, rnd, s, k, yaw = 0) {
  const ICE = '#9ec4ea';
  const ICE2 = '#7aa4d4';
  const TOP = '#f2f8ff';
  const M = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + (rnd() - 0.5) * 0.25), new THREE.Vector3(s, s, s));
  const o = (p, extra = {}) => Object.assign({ parent: M, p }, extra);
  for (const sx of [-1, 1]) b.add(lathe3('wzgleg', [[0.5, -2.6], [0.55, 0], [0.62, 1.6], [0.7, 2.8], [0, 3.0]], 8), ICE2, o([sx * 0.6, 0, 0], { top: TOP, topK: 0.3 }));
  b.add(lathe3('wzgbody', [[0.9, 2.6], [1.3, 3.4], [1.5, 5.0], [1.75, 6.3], [1.2, 7.0], [0, 7.1]], 10), ICE, o([0, 0, 0], { s: [1, 1, 0.75], top: TOP, topK: 0.45, shade: 0.2 }));
  for (const sx of [-1, 1]) {
    b.add(sphere3(0.95, 10, 7), ICE2, o([sx * 1.75, 6.5, 0], { s: [1.1, 0.75, 0.95], top: TOP, topK: 0.6 }));
    // Arme zum Schwertknauf vor dem Bauch
    b.add(wzTube([[sx * 1.9, 6.2, 0], [sx * 2.1, 4.8, 0.35], [sx * 1.0, 4.2, 1.05], [sx * 0.25, 4.25, 1.25]], 0.48, 0.36, 8, 7), ICE, { parent: M, top: TOP, topK: 0.35 });
    b.add(sphere3(0.42, 8, 6), ICE2, o([sx * 0.22, 4.25, 1.3], { top: TOP }));
    // Hörner am Helm
    b.add(wzTube([[sx * 0.55, 8.1, 0], [sx * 1.2, 8.5, -0.1], [sx * 1.45, 9.3, -0.3], [sx * 1.3, 9.9, -0.4]], 0.22, 0.04, 8, 6), '#dceeff', { parent: M });
  }
  // Kopf mit Helm, Augen, Bart
  b.add(lathe3('wzghelm', [[0, 7.0], [0.7, 7.05], [0.82, 7.6], [0.78, 8.3], [0.5, 8.75], [0, 8.85]], 10), ICE2, o([0, 0, 0.05], { top: TOP, topK: 0.6 }));
  b.add(wbox(1.2, 0.18, 0.2, 0.04), '#5a7aa8', o([0, 7.85, 0.78]));
  for (const sx of [-1, 1]) b.add(sphere3(0.1, 6, 4), '#a8f4ff', o([sx * 0.28, 7.82, 0.86], { mat: 'glow', s: [1.4, 0.8, 0.6] }));
  wzGlow(b, Math.sin(yaw) * 0.9 * s, 7.82 * s, Math.cos(yaw) * 0.9 * s, 2.2, '#8af0ff', 0.7);
  for (let j = 0; j < 7; j++) b.add(geo3('wzmoss', () => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, -0.5, 0)), '#d8ecff', o([(j - 3) * 0.17, 7.35, 0.62 + (3 - Math.abs(j - 3)) * 0.04], { s: [0.12, 0.6 + (3 - Math.abs(j - 3)) * 0.22, 0.1] }));
  // Schwert: Knauf, Parierstange, Klinge in die Spalte
  b.add(sphere3(0.22, 8, 6), '#c8e4ff', o([0, 4.95, 1.3]));
  b.add(wbox(0.18, 0.7, 0.18, 0.04), '#5a7aa8', o([0, 4.45, 1.3]));
  b.add(wbox(1.6, 0.2, 0.26, 0.06), '#c8e4ff', o([0, 4.0, 1.3], { top: TOP }));
  b.add(wbox(0.5, 6.4, 0.12, 0.04), '#d8f0ff', o([0, 0.75, 1.3], { shine: 0.8, top: TOP, topK: 0.3 }));
  b.add(wbox(0.12, 6.0, 0.14, 0.02), '#8ad8ff', o([0, 0.8, 1.31], { mat: 'glow' }));
}

// Schattenklippen: eine Leuchtturmruine auf einer Schäre vor der Küste, ihr Licht kreist noch (zwei Strahlen),
// Brandung schlägt Gischt; ein Wrack auf den Klippen; Nebelbänke ziehen, an der Küste spritzt Gischt. Fjordhafen:
// ein vertäutes Schiff im Hafenbecken mit Laterne und Wimpel, Fahnen in Schiefer und Silber.
WZ_MAPS[16] = (wm, T) => {
  const [rx, ry] = wm.region;
  const F = wzField(wm, 'liq', true);
  const town = wzTown(wm);
  const rnd = T.rnd;
  const isSea = (i) => wzGround(i) === GROUND.WATER;
  const lh = wzPick(F, { cx: town.cx - 30, cy: ry + 16, R: 60, min: 4.5, cap: 6, distK: 0.07, town: { cx: town.cx, cy: town.cy, H: town.H + 6 } });
  if (lh) {
    wzLighthouse(lh, rnd, T);
    WZ.main = { x: lh.x, y: lh.y + Math.min(lh.r, 6) + 3 };
  }
  const wr = wzPick(F, { cx: town.cx + 40, cy: ry + 18, R: 60, min: 3.6, cap: 5, distK: 0.07, town: { cx: town.cx, cy: town.cy, H: town.H + 6 }, avoid: lh ? [lh] : [], sep: 30 });
  if (wr && T.tier) wzWreck(wr, rnd);
  // Nebelbänke und Gischt an der Küste
  wzMistLayer(wzMistMat('klippe1', '#8a92ac', 0.42, 0.035, 0.03), 0.3, 66);
  if (T.tier) wzMistLayer(wzMistMat('klippe2', '#a8b0c8', 0.25, 0.022, -0.02), 1.1, 66);
  wzAround(3, (px, pz) => {
    const t = wzNearTile(px, pz, 14, (i) => isSea(i) && game.world.deco[i] !== DECO.BRIDGE && (!LIQUID.has(game.world.ground[i - MAP_W]) || !LIQUID.has(game.world.ground[i + MAP_W]) || !LIQUID.has(game.world.ground[i - 1]) || !LIQUID.has(game.world.ground[i + 1])), 10);
    if (!t) return;
    for (let k = 0; k < 4; k++) wzSpawn({ x: t[0] + (Math.random() - 0.5) * 0.6, y: -0.1, z: t[1] + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, vy: 2 + Math.random() * 2.2, grav: 5, life: 1.3, s0: 0.3, s1: 0.8, c: '#eef4ff', a: 0.6 });
  });
  // Stadt: Schiff im Hafenbecken
  const site = wzSite(town.cx + 0.5, town.cy + 0.5, 90);
  const berth = wzPick(F, { cx: town.cx, cy: town.cy - 18, R: 9, min: 2, cap: 4, distK: 0.2 });
  if (berth) {
    const sb = new Bake3();
    wzShip(sb, 1, false);
    wzAnim(site, sb, (o, t) => { o.rotation.z = Math.sin(t * 0.8) * 0.04; o.rotation.x = Math.sin(t * 0.6 + 1) * 0.02; o.position.y = Math.sin(t * 0.9) * 0.05; }, berth.x - site.position.x, 0, berth.y - site.position.z);
  }
  wzWallBanners(site, wm, 5, '#20283a', '#9fb8d0', 12);
};
function wzLighthouse(spot, rnd, T) {
  const site = wzSite(spot.x, spot.y, 160);
  const b = new Bake3();
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3;
    b.add(rockGeo(k, 1), '#3a3a46', { p: [Math.cos(a) * 1.8, -0.4, Math.sin(a) * 1.8], s: [1.6 + rnd(), 1.1 + rnd() * 0.6, 1.5], r: [0, a, 0], top: '#5a5a68', topK: 0.5 });
  }
  const tower = wzLathe([[2.0, -0.4], [1.9, 0.6], [1.62, 1.0], [1.5, 4], [1.35, 7.5], [1.28, 9.0], [1.2, 9.6], [1.0, 9.6], [1.0, 8.2], [0, 8.2]], 14, {
    seed: 16, jit: 0.03, jag: [6, 1.4],
    col: (t, a, i) => (i >= 7 ? '#2a2a30' : Math.floor(t * 9) % 3 === 0 ? '#5a5866' : mixColor('#7a7886', '#8e8c98', 0.5 + 0.5 * Math.sin(a * 5)))
  });
  b.add(tower, null);
  // Galerie, halb eingestürzt
  b.add(geo3('wzgallery', () => new THREE.CylinderGeometry(1.7, 1.7, 0.18, 14, 1, false, 0, Math.PI * 1.4)), '#4a4852', { p: [0, 8.4, 0], r: [0, 0.6, 0] });
  for (let k = 0; k < 7; k++) {
    const a = 0.6 + (k / 7) * Math.PI * 1.4;
    b.add(sphere3(0.05, 4, 3), '#2a2a30', { p: [Math.cos(a) * 1.62, 8.85, -Math.sin(a) * 1.62], s: [1, 9, 1] });
  }
  // Fenster und Tür
  b.add(wbox(0.5, 0.9, 0.2, 0.05), '#14141a', { p: [0, 1.0, 1.7] });
  b.add(wbox(0.3, 0.55, 0.2, 0.04), '#ffd890', { p: [0, 5.0, 1.42], mat: 'glow' });
  b.add(sphere3(0.5, 10, 8), '#fff2c0', { p: [0, 9.2, 0], mat: 'glow' });
  wzGlow(b, 0, 9.2, 0, 6, '#ffe0a0', 0.85);
  wzBake(site, b);
  // zwei kreisende Strahlen
  const beam = new THREE.Group();
  beam.position.y = 9.2;
  site.add(beam);
  for (const s of [1, -1]) {
    const g = new THREE.CylinderGeometry(0.25, 3.2, 26, 12, 1, true);
    g.translate(0, 13, 0);
    g.rotateZ(-Math.PI / 2 * s);
    g.rotateX(0.08);
    const m = new THREE.Mesh(g, wzBeamMat('#fff0c0', 0.32));
    m.renderOrder = 4;
    beam.add(m);
  }
  WZ.anims.push({ g: beam, site, fn: (o, t) => { o.rotation.y = t * 0.45; } });
  // Brandung an der Schäre
  WZ.emitters.push({ x: spot.x, z: spot.y, R: 50, rate: 2.2, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    for (let k = 0; k < 4; k++) wzSpawn({ x: spot.x + Math.cos(a) * 2.9, y: 0, z: spot.y + Math.sin(a) * 2.9, vx: Math.cos(a) * (0.5 + Math.random()), vz: Math.sin(a) * (0.5 + Math.random()), vy: 2.5 + Math.random() * 2.5, grav: 5, life: 1.5, s0: 0.4, s1: 1.1, c: '#f0f6ff', a: 0.65 });
  } });
}
// Schiffsrumpf: Drehkörper längs (Bug vorn), Deck, Mast mit Rahe, Laterne; wreck: gekippt, Mast gebrochen
function wzShip(b, s, wreck) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(wreck ? 0.25 : 0, wreck ? 0.6 : 0, wreck ? 0.35 : 0)), new THREE.Vector3(s, s, s));
  const hull = wzLathe([[0, -2.9], [0.55, -2.4], [0.95, -1.4], [1.05, 0], [0.98, 1.4], [0.75, 2.4], [0, 3.1]], 12, { seed: 4, col: (t, a) => (Math.sin(a) < -0.35 ? '#3a2416' : Math.cos(a) > 0.7 || Math.cos(a) < -0.7 ? '#5a3a24' : '#4a3020') });
  b.add(hull, null, { parent: M, p: [0, 0.15, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.75] });
  if (!wreck) {
    b.add(wbox(1.7, 0.12, 4.6, 0.04), '#8a6a44', { parent: M, p: [0, 0.82, 0] });
    b.add(lathe3('wzmast', [[0.12, 0], [0.08, 1], [0, 1.02]], 6), '#5a3a24', { parent: M, p: [0, 0.8, 0.2], s: [1, 6.2, 1] });
    b.add(lathe3('wzmast', [[0.12, 0], [0.08, 1], [0, 1.02]], 6), '#5a3a24', { parent: M, p: [-1.4, 5.2, 0.2], r: [0, 0, -Math.PI / 2], s: [0.7, 2.8, 0.7] });
    b.add(wzTube([[-1.3, 5.0, 0.2], [0, 4.8, 0.35], [1.3, 5.0, 0.2]], 0.22, 0.22, 6, 6), '#d8ccb0', { parent: M });
    b.add(wbox(0.5, 0.4, 0.6, 0.06), '#4a3020', { parent: M, p: [0, 1.05, -1.9] });
    b.add(sphere3(0.12, 6, 4), '#ffd890', { parent: M, p: [0, 1.6, -2.3], mat: 'pulse' });
    wzGlow(b, 0, 1.6 * s, -2.3 * s, 1.6, '#ffd890', 0.8);
    b.add(sphere3(0.04, 4, 3), '#2a2a2a', { parent: M, p: [0, 1.3, -2.3], s: [1, 8, 1] });
  } else {
    for (let k = 0; k < 5; k++) b.add(wzTube([[-1.0, 0.9, -2 + k], [-1.15, 0.0, -2 + k], [0, -0.5, -2 + k], [1.15, 0.0, -2 + k], [1.0, 0.9, -2 + k]], 0.1, 0.1, 8, 5), '#3a2a1e', { parent: M });
    b.add(lathe3('wzmast', [[0.12, 0], [0.08, 1], [0, 1.02]], 6), '#4a3020', { parent: M, p: [0, 0.6, 0.2], r: [0.5, 0, 0.3], s: [1, 3.4, 1] });
  }
}
function wzWreck(spot, rnd) {
  const site = wzSite(spot.x, spot.y, 120);
  const b = new Bake3();
  for (let k = 0; k < 3; k++) b.add(rockGeo(k + 2, 1), '#34343e', { p: [(k - 1) * 2.2, -0.3, (k % 2) * 1.2 - 0.6], s: [1.4, 0.9, 1.3], top: '#4e4e5a' });
  wzShip(b, 1.3, true);
  wzBake(site, b);
}

// Frostgipfel (Zusatz seit 14.78): Das Wolkenmeer liegt jetzt tief unter den Inseln (vorher nur 0,6 Einheiten unter
// dem Rand – von oben sah es aus wie flaches Eis): Oberfläche bei −3,2, Felswände darunter bis −4,4, Wolkenballen
// mit Lücken, durch die man in die blaue Tiefe sieht, an den Felsen getürmt. Dazu ziehen Wolkenfetzen unter den
// Inselrändern vorbei, an den Kanten hängen Eiszapfen, Felsen ragen aus der Wand.
if (typeof LIQUID3 !== 'undefined' && LIQUID3.clouds) {
  LIQUID3_DEPTH[GROUND.WOLKEN] = 4.4;
  LIQUID3.clouds.level = -3.2;
  LIQUID3.clouds.frag = `
          vec2 q = p * 0.07 + vec2(t * 0.009, t * 0.004);
          q += vec2(sin(q.y * 2.3 + t * 0.02), cos(q.x * 1.9 - t * 0.015)) * 0.35;
          float c1 = sin(q.x * 2.1 + sin(q.y * 1.7) * 1.3) * sin(q.y * 1.9 - sin(q.x * 1.3) * 1.1);
          float c2 = sin((q.x + q.y) * 4.3 + t * 0.03) * sin((q.x - q.y) * 3.7 - t * 0.02);
          float c3 = sin(q.x * 9.1 + q.y * 3.7 + t * 0.05) * sin(q.y * 8.3 - q.x * 4.1);
          float puff = 0.5 + 0.3 * c1 + 0.15 * c2 + 0.07 * c3 + (1.0 - d) * 0.3;
          float gap = 1.0 - smoothstep(0.16, 0.36, puff);
          float lit = sin(q.x * 2.1 + 0.25 + sin(q.y * 1.7) * 1.3) * sin(q.y * 1.9 + 0.2 - sin(q.x * 1.3) * 1.1) - c1;
          vec3 col = mix(uDeep, uShallow, smoothstep(0.3, 0.85, puff));
          col *= 0.9 + clamp(lit * 2.5, -0.2, 0.2);
          col += vec3(1.0, 0.97, 0.9) * smoothstep(0.75, 0.98, puff) * 0.14;
          vec3 abyss = mix(vec3(0.2, 0.28, 0.48), vec3(0.34, 0.44, 0.66), sin(q.x * 0.7 + t * 0.01) * 0.5 + 0.5);
          col = mix(col, abyss, gap * 0.9);
          col = mix(col, col * vec3(0.5, 0.56, 0.78), uNight * 0.6);
          float alpha = 1.0;`;
  LIQUID3.clouds.deep = '#9fb2d4';
}
// Tannen rund um Wolkenhorst (Gebiet frostlager) tragen Schnee wie draußen (vorher nur im Gebiet frost)
if (typeof WORLD3 !== 'undefined' && WORLD3.pine) {
  const wzPine = WORLD3.pine;
  WORLD3.pine = function (b, M, v, style) {
    return wzPine.call(this, b, M, v, style === 'frostlager' ? 'frost' : style);
  };
}
WZ_MAPS[7] = (wm, T) => {
  const [rx, ry, rw, rh] = wm.region;
  const w = game.world;
  const isCloud = (x, y) => {
    const i = y * MAP_W + x;
    return w.ground[i] === GROUND.WOLKEN && w.deco[i] !== DECO.BRIDGE;
  };
  // Eiszapfen und Felsen an den Inselkanten, je 24 × 24 Kacheln eine Stelle
  const B = 24;
  const icicle = geo3('wzicicle', () => new THREE.ConeGeometry(1, 1, 5, 1).translate(0, 0.5, 0).rotateX(Math.PI));
  for (let by = ry; by < ry + rh; by += B) for (let bx = rx; bx < rx + rw; bx += B) {
    let b = null;
    const cx = bx + B / 2;
    const cz = by + B / 2;
    for (let y = by; y < Math.min(by + B, ry + rh); y++) for (let x = bx; x < Math.min(bx + B, rx + rw); x++) {
      const i = y * MAP_W + x;
      if (LIQUID.has(w.ground[i]) || w.obj[i] === OBJ.HOUSE || w.obj[i] === OBJ.WALL) continue;
      for (let d = 0; d < 4; d++) {
        const dx = [1, -1, 0, 0][d];
        const dy = [0, 0, 1, -1][d];
        if (!isCloud(x + dx, y + dy)) continue;
        const h = townTileHash(x * 4 + d, y) % 100;
        if (h >= 46 && h < 88) continue;
        if (!b) b = new Bake3();
        const ex = x + 0.5 + dx * 0.52 - cx;
        const ez = y + 0.5 + dy * 0.52 - cz;
        if (h < 46) {
          const n = 2 + (h % 2);
          for (let k = 0; k < n; k++) {
            const o = (k - (n - 1) / 2) * 0.32 + ((h * 7 + k * 13) % 10 - 5) * 0.02;
            const len = 0.35 + ((h * 3 + k * 29) % 10) * 0.12;
            b.add(icicle, k % 2 ? '#d4ecff' : '#b8dcf8', { p: [ex + (dy ? o : 0), -0.02, ez + (dx ? o : 0)], s: [0.08 + (k % 2) * 0.03, len, 0.08] });
          }
        } else {
          b.add(rockGeo(h % 6, 0), '#4e586c', { p: [ex + dx * 0.2, -1.1 - (h % 4) * 0.4, ez + dy * 0.2], s: [0.55 + (h % 3) * 0.2, 0.7, 0.55], top: '#eef4fa', topK: 0.6 });
        }
      }
    }
    if (b) wzBake(wzSite(cx, cz, 60), b);
  }
  // Wolkenfetzen ziehen unter den Inselrändern vorbei
  wzAround(T.tier ? 2.4 : 1, (px, pz) => {
    const t = wzNearTile(px, pz, 18, (i, x, y) => isCloud(x, y), 8);
    if (t) wzSpawn({ x: t[0], y: -1.0 - Math.random() * 1.6, z: t[1], vx: 0.5 + Math.random() * 0.3, vz: 0.1, life: 11, s0: 2.2, s1: 4.2, c: '#f4f8ff', a: 0.55, vr: 0.05, rot: Math.random() * 6 });
  });
  wzAround(2.5, (px, pz) => wzSpawn({ x: px + (Math.random() - 0.5) * 22, y: 0.4 + Math.random() * 3, z: pz + (Math.random() - 0.6) * 18, vy: -0.15, wob: 0.3, life: 3, s0: 0.07, s1: 0.03, c: '#ffffff', add: true }));
  // Blick auf eine Inselkante (Wolken im Norden der Stelle), nahe der Stadt
  const C = wzTown(wm);
  let best = null;
  for (let r = 14; r < 60 && !best; r++) for (let dx = -r; dx <= r && !best; dx += 1) {
    const x = C.cx + dx;
    const y = C.cy + r;
    if (!LIQUID.has(w.ground[y * MAP_W + x]) && isCloud(x, y - 1) && isCloud(x, y - 3) && !LIQUID.has(w.ground[(y + 3) * MAP_W + x])) best = { x: x + 0.5, y: y + 3 };
  }
  WZ.main = best || { x: C.cx + 22, y: C.cy + 10 };
};

// --- Kahle Stellen (seit 14.78) ------------------------------------------------------------------------------
// Frostgipfel: Auf den Himmelsinseln lagen große leere Schneeflächen, ab und zu ein, zwei Bäume (die alten
// gefrorenen Seen des Rauschens wurden mit der Kartenform zu Land). Jetzt: kleine zugefrorene Teiche (Boden ICE,
// begehbar), Schneewehen, Kiesel und kniehohe Felsbrocken (halten nicht auf) auf jeder leeren Stelle und Gruppen
// vereister Tannen. Die übrigen Karten der Phase 1 (4, 5, 6, 2) bekommen nur dort, wo 7 × 7 Kacheln ganz leer
// sind, sparsam Bodenschmuck ihres Gebiets.
// Erreichbarkeit: Schmuck, Eis und Felsbrocken halten nicht auf. Eine Tanne kommt nur auf eine Kachel, deren
// begehbare Nachbarn auch ohne sie zusammenhängen (einfacher Punkt), mit Abstand zu Wegen, Brücken, Steinen,
// Zielen und Stadt – so bleibt alles erreichbar, was es vorher war (geprüft mit mapFormReport).
// Alles nach der Lage der Kachel (townTileHash), also für alle Spieler gleich. Läuft nach mapFormCleanup, vor
// den Leuten, Wanderern und Monstern.
const WZ_DECO_MAPS = { 7: { frost: true }, 4: {}, 5: {}, 6: {}, 2: {} };
const WZ_DECO_STATS = {};
function wzDecorateMaps(maps, ground, obj, deco) {
  for (const mp of maps) {
    const cfg = WZ_DECO_MAPS[mp.id];
    if (!cfg) continue;
    const wm = WORLD_MAPS.find((m) => m.id === mp.id);
    const [rx, ry, rw, rh] = wm.region;
    const H = (mp.half != null ? mp.half : wm.camp || CAMP_HALF) + 4;
    const st = { deco: 0, rock: 0, ice: 0, pine: 0 };
    WZ_DECO_STATS[mp.id] = st;
    // geschützt: Stadt, Ziele (Eingänge, Ecken), Steine – samt Rand
    const prot = new Uint8Array(rw * rh);
    const mark = (cx, cy, r) => {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) continue;
        if (Math.hypot(x - cx, y - cy) <= r) prot[(y - ry) * rw + x - rx] = 1;
      }
    };
    for (let y = wm.cy - H; y <= wm.cy + H; y++) for (let x = wm.cx - H; x <= wm.cx + H; x++) mark(x, y, 0);
    if (typeof mapFormTargets === 'function') for (const t of mapFormTargets(wm)) mark(rx + t.x, ry + t.y, t.r + 3);
    for (const s of mp.stones || []) mark(s.tx, s.ty, 4);
    const land = (x, y) => {
      if (x < rx + MAP_BORDER || y < ry + MAP_BORDER || x >= rx + rw - MAP_BORDER || y >= ry + rh - MAP_BORDER) return false;
      const i = y * MAP_W + x;
      return !LIQUID.has(ground[i]) && (obj[i] === OBJ.NONE || obj[i] === OBJ.ROCK);
    };
    const free = (x, y) => {
      const i = y * MAP_W + x;
      const g = ground[i];
      return land(x, y) && !prot[(y - ry) * rw + x - rx] && obj[i] === OBJ.NONE && deco[i] === DECO.NONE && g !== GROUND.PATH && g !== GROUND.PLAZA && g !== GROUND.FLAGSTONE && g !== GROUND.ICE;
    };
    const near = (x, y, r, fn) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (fn(x + dx, y + dy)) return true;
      return false;
    };
    const busy = (x, y) => {
      const i = y * MAP_W + x;
      return obj[i] !== OBJ.NONE || deco[i] !== DECO.NONE || LIQUID.has(ground[i]) || ground[i] === GROUND.PATH || ground[i] === GROUND.ICE;
    };
    const isPath = (x, y) => { const i = y * MAP_W + x; return ground[i] === GROUND.PATH || deco[i] === DECO.BRIDGE; };
    const x0 = rx + MAP_BORDER + 1;
    const x1 = rx + rw - MAP_BORDER - 1;
    const y0 = ry + MAP_BORDER + 1;
    const y1 = ry + rh - MAP_BORDER - 1;
    if (cfg.frost) {
      // 1. zugefrorene Teiche auf großen freien Flächen
      for (let y = y0 + 4; y < y1 - 4; y++) for (let x = x0 + 4; x < x1 - 4; x++) {
        const h = townTileHash(x * 3 + 11, y * 5 + 7);
        if (h % 1000 >= 14 || !land(x, y) || obj[y * MAP_W + x] !== OBJ.NONE) continue;
        if (near(x, y, 4, (a, b) => !land(a, b) || obj[b * MAP_W + a] !== OBJ.NONE || prot[(b - ry) * rw + a - rx] || isPath(a, b) || ground[b * MAP_W + a] === GROUND.ICE)) continue;
        const r1 = 1.6 + (h % 7) * 0.25;
        const r2 = 1.3 + ((h >> 3) % 6) * 0.25;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const wob = 1 + 0.18 * Math.sin(Math.atan2(dy, dx) * 3 + h);
          if ((dx * dx) / (r1 * r1) + (dy * dy) / (r2 * r2) > wob) continue;
          const i = (y + dy) * MAP_W + x + dx;
          ground[i] = GROUND.ICE;
          deco[i] = DECO.NONE;
          if (obj[i] === OBJ.ROCK) obj[i] = OBJ.NONE;
          st.ice++;
        }
      }
      // 2. Gruppen vereister Tannen (nur einfache Punkte, mit Abstand zu Wegen)
      for (let y = y0 + 3; y < y1 - 3; y++) for (let x = x0 + 3; x < x1 - 3; x++) {
        const h = townTileHash(x * 7 + 3, y * 3 + 19);
        if (h % 1000 >= 22 || !land(x, y) || obj[y * MAP_W + x] !== OBJ.NONE) continue;
        if (near(x, y, 3, (a, b) => isPath(a, b) || prot[(b - ry) * rw + a - rx] || !land(a, b) || ground[b * MAP_W + a] === GROUND.ICE)) continue;
        const n = 2 + (h % 4);
        for (let k = 0; k < n; k++) {
          const px = x + [0, 1, -1, 1, 0, -1][k];
          const py = y + [0, 0, 1, 1, -1, -1][k];
          const pi = py * MAP_W + px;
          if (!land(px, py) || obj[pi] !== OBJ.NONE || ground[pi] === GROUND.ICE || prot[(py - ry) * rw + px - rx] || near(px, py, 2, (a, b) => isPath(a, b) || !land(a, b))) continue;
          if (!wzSimplePoint(px, py, land)) continue;
          obj[pi] = OBJ.PINE;
          deco[pi] = DECO.NONE;
          st.pine++;
        }
      }
    }
    // 3. Frostgipfel: kniehohe Felsbrocken, wo im Umkreis von 3 kein Baum und kein Fels steht, und Schneewehen
    if (cfg.frost) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * MAP_W + x;
        if (!land(x, y) || obj[i] !== OBJ.NONE || prot[(y - ry) * rw + x - rx] || ground[i] === GROUND.PATH || ground[i] === GROUND.ICE) continue;
        const h = townTileHash(x * 11 + 5, y * 13 + 1) % 1000;
        if (h < 30 && !near(x, y, 3, (a, b) => obj[b * MAP_W + a] !== OBJ.NONE || isPath(a, b))) { obj[i] = OBJ.ROCK; st.rock++; } else if (h < 150 && deco[i] === DECO.NONE && !near(x, y, 1, (a, b) => deco[b * MAP_W + a] !== DECO.NONE)) { deco[i] = DECO.DRIFT; st.deco++; }
      }
    }
    // 4. leere Stellen füllen: Frostgipfel überall, wo 5 × 5 nichts liegt; sonst nur, wo 7 × 7 ganz leer ist
    const R = cfg.frost ? 2 : 3;
    const pct = cfg.frost ? 30 : 14;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!free(x, y)) continue;
      const h = townTileHash(x * 5 + 1, y * 7 + 3) % 100;
      if (h >= pct || near(x, y, R, busy)) continue;
      const i = y * MAP_W + x;
      if (cfg.frost) {
        if (h < pct * 0.2 && !near(x, y, 1, isPath)) { obj[i] = OBJ.ROCK; st.rock++; } else { deco[i] = h % 3 === 0 ? DECO.PEBBLE : DECO.DRIFT; st.deco++; }
      } else {
        const zone = ZONES[zoneIndexAt(x, y)];
        let d = typeof ZONE_DECO !== 'undefined' && zone && ZONE_DECO[zone.id] ? DECO[ZONE_DECO[zone.id][h % ZONE_DECO[zone.id].length]] : DECO.PEBBLE;
        if (SOLID_DECO_KINDS.has(d) || d == null) d = h % 2 ? DECO.PEBBLE : DECO.TUFT;
        deco[i] = d;
        st.deco++;
      }
    }
  }
}
// begehbare Nachbarn (im Ring der 8) hängen auch ohne die Mitte über Seiten zusammen?
function wzSimplePoint(x, y, land) {
  const ring = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const w = ring.map(([dx, dy]) => land(x + dx, y + dy));
  let runs = 0;
  for (let k = 0; k < 8; k++) {
    if (!w[k] || w[(k + 7) % 8]) continue;
    // neuer Lauf ab k: zählt nur, wenn er einen Seitennachbarn (gerade k) enthält
    let j = k;
    let side = false;
    while (w[j % 8] && j < k + 8) { if (j % 2 === 0) side = true; j++; }
    if (side) runs++;
  }
  if (w.every(Boolean)) runs = 1;
  return runs <= 1;
}
if (typeof mapFormCleanup === 'function') {
  const wzBaseCleanup = mapFormCleanup;
  mapFormCleanup = function (maps, ground, obj, deco) {
    wzBaseCleanup(maps, ground, obj, deco);
    wzDecorateMaps(maps, ground, obj, deco);
  };
}
