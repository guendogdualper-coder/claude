// 3D-Figuren (Version 4.1): Spieler aller Klassen mit Aussehen und Ausrüstung, Waffen, Pferd,
// Bewohner, alle Monsterfamilien, Seelensteine, Portale und Risse.
//
// Aufbau: Jede Figur hat ein kleines Skelett (Hüfte, Brust, Kopf, Arme, Hände, Beine, Umhang,
// Schwanz, Flügel bzw. vier Beine, Spinnenbeine, Schlangenglieder). Alle Teile werden mit ihrem
// Knochen zu wenigen Meshes im Sparformat gebacken (siehe Bake3) und über das Skelett bewegt.
//
// Leistung: Modelle werden je Art einmal gebaut und geteilt; Figuren kommen beim Verschwinden in
// einen Pool und werden wiederverwendet (kein neues Skelett, kein neues Material, kein Speicherleck);
// gefallene Gegner nutzen die Figur des Monsters weiter; Modelle für Monster in der Nähe werden im
// Voraus gebaut; Figuren außerhalb des Bildes werden nicht gezeichnet.
//
// Gestaltung nach docs/bild-prompts.md (Version 4.1): Chibi-Proportionen, große Augen mit Iris,
// Pupille und Glanzpunkten, Haare aus Strähnen mit Glanzband, geschichtete Kleidung, Ausrüstung je
// Stufe, Klingen mit Hohlkehle, Tiere mit Schnauze, Fell und Gelenken, Schlangen als biegsamer Schlauch.

// --- Knochen ------------------------------------------------------------------------------------

const BH = { root: 0, hips: 1, chest: 2, head: 3, armL: 4, armR: 5, handL: 6, handR: 7, legL: 8, legR: 9, cape: 10, tail: 11, wingL: 12, wingR: 13 };
const BQ = { root: 0, body: 1, head: 2, legFL: 3, legFR: 4, legBL: 5, legBR: 6, tail: 7, wingL: 8, wingR: 9, neck: 10 };

// Skelett aus Ruhepositionen im Figurenraum: [[x, y, z], Elternknochen]
function rigOf(list) {
  return list.map(([pos, parent]) => ({ pos, parent }));
}

// --- Materialien der Figuren --------------------------------------------------------------------

function figLitMat() {
  return addRimShine(toonMat({ skinning: true, emissive: 0x000000 }));
}
const figOutline = () => mat3('figOutline', () => outlineMat(0.022, true));
const figGlow = () => mat3('figGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true }));
// unsichtbar im Bild, wirft aber Schatten (die Schattenkarte zeichnet mit eigenem Tiefenmaterial)
// seit 14.51 beidseitig im Schattendurchgang: einseitige Teile mit echter Form (shadowExact, Drachenflügel) warfen sonst
// keinen Schatten, weil three.js bei Vorderseiten-Materialien in der Schattenkarte nur die Rückseiten zeichnet
const figShadowProxy = () => mat3('figShadowProxy', () => new THREE.MeshBasicMaterial({ skinning: true, colorWrite: false, depthWrite: false, shadowSide: THREE.DoubleSide }));
const figAura = () => mat3('figAura', () => new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
// Waffen-Schein (seit 14.74 als Flammenhülle): Vorher lag um jede Waffe ein Kasten (Axtblatt, Klinge) oder eine Kugel
// (Stab, Glocke), der beim Leuchten als helles Rechteck über der Waffe stand. Jetzt ist die Hülle eine Kopie aller
// Waffenteile (wglowGeo3, drei-ausruestung.js), die der Shader ein Stück nach außen bläht und oben züngeln lässt:
// der Schein folgt Axtblatt, Klinge, Stiel und Zier und ragt nur wenig über den Umriss hinaus. Innen bleibt er dünn
// (die Waffe bleibt erkennbar), am Rand weich mit Flammenzungen, die nach oben ziehen. Farbe und Deckkraft wie bisher
// über .color und .opacity; Stärke der Flamme je Anlass in uInf/uRise/uFl (wgFlame3, syncPlayer3).
const WG3_T = { value: 0 };
const WG3_NOISE = `
float wgH(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float wgN(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wgH(i), wgH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(wgH(i + vec3(0.0, 1.0, 0.0)), wgH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(wgH(i + vec3(0.0, 0.0, 1.0)), wgH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(wgH(i + vec3(0.0, 1.0, 1.0)), wgH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
`;
const WG3_VS = `
#include <common>
#include <skinning_pars_vertex>
uniform float uT;
uniform float uInf;
uniform float uRise;
varying vec3 vN;
varying vec3 vV;
varying vec3 vQ;
varying float vTip;
${WG3_NOISE}
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  // Rauschen in der Ruhehaltung: das Flammenmuster klebt an der Waffe und schwingt mit ihr
  vec3 q = position * 13.0;
  float w = wgN(q + vec3(0.0, -uT * 2.4, uT * 0.4));
  transformed += normal * uInf * (0.5 + 1.1 * w);
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * objectNormal);
  // nach oben zeigende Stellen züngeln nach oben (in Weltrichtung, auch bei schräg gehaltener Waffe)
  float up = smoothstep(-0.2, 0.9, wn.y);
  float lick = up * (0.1 + w * w * 2.2);
  wp.y += uRise * lick;
  vTip = clamp(lick * 0.55, 0.0, 1.0);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  vN = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
  vV = -mv.xyz;
  vQ = q;
}`;
const WG3_FS = `
uniform vec3 uCol;
uniform float uOp;
uniform float uT;
uniform float uFl;
varying vec3 vN;
varying vec3 vV;
varying vec3 vQ;
varying float vTip;
${WG3_NOISE}
void main() {
  float e = abs(dot(normalize(vN), normalize(vV)));
  // senkrecht gestreckte Flammenstreifen, die nach oben ziehen
  float f = wgN(vec3(vQ.x, vQ.y * 0.6 - uT * 3.0, vQ.z)) * 0.65 + wgN(vQ * 2.3 + vec3(1.7, -uT * 4.4, 0.0)) * 0.35;
  float n = mix(0.55, f, uFl);
  // außen weich auslaufend und in Zungen zerrissen, innen (auf der Waffe) nur ein Hauch
  float a;
  vec3 c;
  if (gl_FrontFacing) {
    // Vorderseite: nur ein Schimmer auf der Waffe, zum Rand der Hülle hin ausgeblendet (sonst stünde dort eine Kante)
    a = 0.2 * smoothstep(0.25, 0.75, e) * (0.6 + 0.8 * n) * uOp;
    c = mix(uCol, vec3(1.0, 0.98, 0.9), 0.35);
  } else {
    // Rückseite: verdeckt die Waffe selbst und bleibt nur dort sichtbar, wo die Hülle über die Waffe hinausragt –
    // der Flammensaum um den Umriss, nach außen weich und in Zungen zerrissen
    float edge = smoothstep(0.12, 0.55, n * 0.9 + e * 1.15 - vTip * 0.5);
    a = edge * (0.35 + 0.75 * n) * uOp * 0.8;
    // Farbe wie bei einer Flamme: außen satter und dunkler (Farbe zum Quadrat), innen die Grundfarbe, Kern heller
    float h = clamp(n * 0.8 + e * 0.55 - vTip * 0.45, 0.0, 1.0);
    c = mix(uCol * uCol, uCol, smoothstep(0.25, 0.6, h));
    c = mix(c, mix(uCol, vec3(1.0, 0.98, 0.9), 0.55), smoothstep(0.75, 1.0, h));
  }
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
}`;
function figWeaponGlowMat() {
  const col = new THREE.Color(0xffffff);
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: WG3_T, uCol: { value: col }, uOp: { value: 0 }, uInf: { value: 0.03 }, uRise: { value: 0.05 }, uFl: { value: 1 } },
    vertexShader: WG3_VS,
    fragmentShader: WG3_FS,
    skinning: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  m.color = col;
  // .opacity schreibt in die Deckkraft des Shaders (wie beim alten Grundmaterial)
  Object.defineProperty(m, 'opacity', { get() { return this.uniforms.uOp.value; }, set(v) { this.uniforms.uOp.value = v; }, configurable: true });
  return m;
}
// Flammenstärke der Waffenhülle: inf Ausdehnung über die Waffe (Modellmaß), rise Zungen nach oben (Weltmaß), fl Flackern
function wgFlame3(m, inf, rise, fl) {
  const u = m.uniforms;
  u.uInf.value = inf;
  u.uRise.value = rise;
  u.uFl.value = fl;
}

// --- Teilformen ---------------------------------------------------------------------------------

function cap3(r, thetaLen, phiStart = 0, phiLen = Math.PI * 2, ws = 16, hs = 8) {
  ws = lodSeg3(ws, 5);
  hs = lodSeg3(hs, 3);
  return geo3(`cap${r},${thetaLen},${phiStart},${phiLen},${ws}`, () => new THREE.SphereGeometry(r, ws, hs, phiStart, phiLen, 0, thetaLen));
}
function torus3(r, t, arc = Math.PI * 2, rs = 5, ts = 16) {
  rs = lodSeg3(rs, 3);
  ts = lodSeg3(ts, 5);
  return geo3(`to${r},${t},${arc},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
function cyl3(r1, r2, h, seg = 14) {
  seg = lodSeg3(seg, 5);
  return geo3(`cy${r1},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg));
}
/* eslint-disable no-func-assign */
cap3 = lodWrap3(cap3);
torus3 = lodWrap3(torus3);
cyl3 = lodWrap3(cyl3);
/* eslint-enable no-func-assign */
// Schulterpanzer (seit 13.12) statt einer runden Kuppel: flache Hauptplatte mit Rand (und Grat bei Platte),
// darunter Schienen, die sich als Bänder um die Außenseite des Oberarms legen. sh: Schulterpunkt im Armknochen.
const PAULDRON_BIG = 1.7;
// seit 13.36: nur der Krieger trägt die wuchtigen Schulterpanzer; Ninja, Schamane, Nekromant und Magier schmaler
const PAULDRON_BIG_CLS = { krieger: 1.7, ninja: 1.0, schamane: 1.08, nekromant: 1.08, magier: 1.08 };
const pauldronBig = (cls) => PAULDRON_BIG_CLS[cls] || 1.1;
function pauldron3(A, ab, sh, sx, armR, o) {
  const big = o.big || 1;
  const R = o.R * big;
  armR *= 1 + (big - 1) * 0.6;
  const pp = [sh[0] + sx * R * (big > 1 ? 0.3 : 0.12), sh[1] + R * (big > 1 ? 0.32 : 0.25), 0];
  // seit 14.59: große Panzer stärker nach außen geneigt, damit sie über der Schulter liegen statt waagerecht abzustehen
  const W = frame3(A, ab, pp, [0, 0, -sx * (big > 1.3 ? 0.55 : 0.42)]);
  // Hauptplatte: flach gewölbt und breiter als hoch, damit sie wie Blech und nicht wie eine Kugel wirkt
  const sl = (o.slim || 1) * (big > 1.3 ? 0.88 : 1);
  // seit 14.59: große Panzer (Krieger) höher gewölbt – vorher lag eine flache Scheibe auf der Schulter und von vorn
  // sah man nur ihren hellen Randring wie einen Reif um den Kopf; der Randring sitzt jetzt genau auf der Plattenkante
  const sy = big > 1.3 ? 0.95 : 0.5;
  W(cap3(R, Math.PI * 0.4, 0, Math.PI * 2, 18, 5), o.col, { s: [1.2 * sl, sy * sl, 1.12 * sl], shine: o.shine, top: lighter(o.col, 0.15), topK: 0.35 });
  // Unterseite (seit 14.59): von unten (Porträt, Charakterfenster) sah man durch die offene Schale hindurch nur den Randring
  W(geo3(`capin${R},${big > 1.3}`, () => flipGeo(cap3(R * 0.985, Math.PI * 0.4, 0, Math.PI * 2, 14, 4))), darker(o.col, 0.42), { s: [1.2 * sl, sy * sl, 1.12 * sl] });
  W(torus3(R * 0.95, R * (big > 1.3 ? 0.06 : big > 1 ? 0.1 : 0.075), Math.PI * 2, 4, 20), big > 1.3 ? o.trim : big > 1 ? lighter(o.trim, 0.15) : o.trim, { p: [0, R * 0.309 * sy * sl, 0], r: [Math.PI / 2, 0, 0], s: [1.2 * sl, 1.12 * sl, 1], shine: o.shine + 0.2 });
  // Grat von vorn nach hinten über die Platte
  if (o.ridge || big > 1.3) W(torus3(R * 0.94, R * 0.06, Math.PI * 0.9, 3, 14), o.trim, { r: [0, Math.PI / 2, Math.PI * 0.05], s: [1.12, sy * 1.12, 1], shine: o.shine + 0.2 });
  // Nieten am Rand (vorn, außen, hinten)
  const riv = o.rivets || (big > 1.3 ? lighter(o.trim, 0.25) : null);
  if (riv) for (const a of [-1.1, -0.45, 0.2, 0.85, 1.5]) {
    const rs = big > 1.3 ? sl * 1.08 : 1;
    W(sphere3(R * 0.075, 6, 4), riv, { p: [Math.cos(a) * R * 1.08 * rs, big > 1.3 ? R * (0.309 * sy * sl + 0.05) : R * 0.2, Math.sin(a) * R * 1.02 * rs], shine: 1 });
  }
  // Schienen um den Oberarm: jede etwas tiefer und enger, außen herum (gut 200 Grad)
  const arc = Math.PI * 1.2;
  for (let k = 0; k < o.lames; k++) {
    const rr = armR * ((o.slim ? 1.35 : 1.6) - k * 0.12) + R * 0.12;
    const y = sh[1] - 0.025 - k * (o.step || 0.052) * big;
    const rz = sx > 0 ? -arc / 2 : Math.PI - arc / 2;
    A(torus3(rr, 0.017 * big, arc, 4, 16), k % 2 ? darker(o.col, 0.06) : lighter(o.col, 0.04), { bone: ab, p: [sh[0] + sx * 0.012, y, 0], r: [Math.PI / 2, 0, rz], s: [1, 1, 2.3], shine: o.shine });
    if (o.edge) A(torus3(rr + 0.006 * big, 0.0065 * big, arc, 3, 16), o.edge, { bone: ab, p: [sh[0] + sx * 0.012, y - 0.034 * big, 0], r: [Math.PI / 2, 0, rz], shine: o.shine + 0.2 });
  }
  return { pp, W };
}
// Ellipsoid (Kugel 1, wird über s skaliert)
const ball = (seg = 10) => sphere3(1, seg, Math.max(5, Math.round(seg * 0.7)));

// Fläche umdrehen (Innenseite eines Umhangs, einer Kapuze)
function flipGeo(g) {
  const out = g.clone();
  const I = out.index.array;
  for (let i = 0; i < I.length; i += 3) {
    const t = I[i + 1];
    I[i + 1] = I[i + 2];
    I[i + 2] = t;
  }
  const N = out.attributes.normal;
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  return out;
}

// Gebogener Umhang hinter dem Rücken (oben schmal, unten weiter), Außen- und Innenseite
function capeGeo(inner) {
  return geo3('cape' + (inner ? 'in' : 'out'), () => {
    const r1 = inner ? 0.21 : 0.225;
    const r2 = inner ? 0.33 : 0.345;
    const g = new THREE.CylinderGeometry(r1, r2, 0.68, 12, 3, true, Math.PI - 0.95, 1.9);
    g.translate(0, -0.34, 0);
    return inner ? flipGeo(g) : g;
  });
}

// Sichelklinge der Sense
function scytheGeo() {
  return geo3('scytheblade2', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-0.35, 0.18, -0.72, -0.05);
    s.quadraticCurveTo(-0.38, 0.05, -0.02, -0.12);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 8 });
    return smoothGeo(g);
  });
}

// Flügelhaut (Fledermaus- bzw. Drachenflügel) mit weichem Rand
function wingGeo() {
  return geo3('wingmem2', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.55, 0.42);
    s.quadraticCurveTo(0.6, 0.12, 0.74, 0.0);
    s.quadraticCurveTo(0.55, -0.02, 0.5, -0.2);
    s.quadraticCurveTo(0.38, -0.08, 0.28, -0.26);
    s.quadraticCurveTo(0.16, -0.08, 0, -0.18);
    s.lineTo(0, 0);
    return smoothGeo(new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 6 }));
  });
}

// Fügt Teile mit gemeinsamer Elternmatrix (für feste Objekte) hinzu
function adder(b, P) {
  return (geo, color, o = {}) => b.add(geo, color, P ? Object.assign({ parent: P }, o) : o);
}

// Helle Ausrüstungsfarben weich abdunkeln (seit 14.59): Gold, Platin, weiße Roben und Federn lagen über dem Wert, den
// Himmels- und Sonnenlicht zusammen noch abbilden können, und wurden im Licht weiß ausgefressen (goldenes Göttlich-Set im
// Charakterfenster nur noch eine gelbweiße Fläche). Über 0,7 je Kanal wird die Helligkeit gestaucht, der Farbton bleibt;
// so bleiben Schattierung und Kontrast sichtbar. Leuchtende Teile (glow, wglow, aura) und das Gesicht bleiben unverändert.
function tameCol3(col) {
  if (typeof col !== 'string' || col.length !== 7 || col[0] !== '#') return col;
  const n = parseInt(col.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = Math.max(r, g, b) / 255;
  if (m <= 0.7) return col;
  const k = (0.7 + (m - 0.7) * 0.35) / m;
  // Gold und warme Töne dabei etwas satter, damit sie nicht grau werden
  const lo = Math.min(r, g, b);
  const sat = r > b + 40 ? 0.06 : 0;
  const ch = (v) => Math.max(0, Math.min(255, Math.round((v - (v === lo ? lo * sat : 0)) * k)));
  return '#' + ((1 << 24) | (ch(r) << 16) | (ch(g) << 8) | ch(b)).toString(16).slice(1);
}
function tameAdder3(A, keep) {
  return (geo, color, o = {}) => {
    if (o.mat && o.mat !== 'lit') return A(geo, color, o);
    const oo = o.top ? Object.assign({}, o, { top: tameCol3(o.top) }) : o;
    return A(geo, keep.has(color) ? color : tameCol3(color), oo);
  };
}

// Teil in einem lokalen Rahmen (Waffe in der Hand, Kopfschmuck): Matrix M mal Teil
function framed(A, M, bone) {
  return (geo, color, o = {}) => A(geo, color, Object.assign({}, o, { bone, m: M.clone().multiply(partMatrix(o)) }));
}
function partFrame(at, rot) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1));
}

// --- Gesicht ----------------------------------------------------------------------------------------
// Augen mit Lederhaut, Iris (unten heller), Pupille, zwei Glanzpunkten und dickem Lidstrich;
// Brauen zeigen die Stimmung. Formen: 0 rund, 1 schmal, 2 fröhlich, 3 entschlossen.

function face3(A0, hb, hc, hr, o) {
  // Gesichtsteile ohne Umriss (sonst kritzelige Ränder um Augen und Mund)
  const A = (g, c, oo) => A0(g, c, oo.mat ? oo : Object.assign(oo, { mat: 'face' }));
  const f = hr * 0.92;
  const ink = '#1a120c';
  const shape = o.eyeShape || 0;
  const eyeY = hc[1] - hr * 0.1;
  const iris = o.eyeColor || '#3a2a1a';
  const brow = o.browColor || darker(o.hairColor || '#3a2418', 0.25);
  for (const sx of [-1, 1]) {
    const ex = hc[0] + sx * hr * 0.37;
    const ez = hc[2] + f * 0.96;
    if (o.glowEyes) {
      // dunkle Augenhöhle, darin das Glühen
      A(ball(10), '#1a1416', { bone: hb, p: [ex, eyeY + hr * 0.01, ez - hr * 0.02], s: [hr * 0.21, hr * 0.17, hr * 0.07] });
      A(ball(10), o.glowEyes, { bone: hb, p: [ex, eyeY, ez + hr * 0.02], s: [hr * 0.14, hr * 0.1, hr * 0.06], mat: 'glow' });
      if (o.angry !== false) A(roundBox(hr * 0.32, hr * 0.06, hr * 0.06, hr * 0.025), ink, { bone: hb, p: [ex, eyeY + hr * 0.2, ez + hr * 0.02], r: [0, 0, sx * 0.45] });
      continue;
    }
    if (o.beastEyes) {
      // Monster: tief liegende Augen unter einem schweren Brauenwulst (seit 12.7 größer und leuchtend, auch von oben sichtbar)
      A(ball(10), darker(o.skin || '#7a7466', 0.5), { bone: hb, p: [ex, eyeY, ez - hr * 0.02], s: [hr * 0.2, hr * 0.15, hr * 0.08] });
      A(ball(10), '#fff4c8', { bone: hb, p: [ex, eyeY - hr * 0.005, ez + hr * 0.02], s: [hr * 0.15, hr * 0.1, hr * 0.06], mat: 'glow' });
      A(ball(8), o.eyeColor || '#c8302a', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.005, ez + hr * 0.055], s: [hr * 0.085, hr * 0.085, hr * 0.035], mat: 'glow' });
      A(ball(6), '#120808', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.005, ez + hr * 0.075], s: [hr * 0.028, hr * 0.06, hr * 0.02] });
      A(sphere3(1, 6, 4), '#ffffff', { bone: hb, p: [ex - sx * hr * 0.04, eyeY + hr * 0.03, ez + hr * 0.085], s: [hr * 0.025, hr * 0.025, hr * 0.015], mat: 'glow' });
      A(roundBox(hr * 0.36, hr * 0.1, hr * 0.12, hr * 0.04), darker(o.skin || '#7a7466', 0.12), { bone: hb, p: [ex + sx * hr * 0.02, eyeY + hr * 0.15, ez + hr * 0.0], r: [0.1, 0, sx * 0.38], mat: 'lit' });
      continue;
    }
    if (shape === 2) {
      // fröhlich: geschlossene Bögen
      A(torus3(hr * 0.15, hr * 0.035, Math.PI, 4, 10), ink, { bone: hb, p: [ex, eyeY - hr * 0.06, ez + hr * 0.02] });
    } else {
      const narrow = shape === 1 || o.narrow;
      // Männer (seit 13.18): kleinere, flachere Augen ohne geschwungenen Lidstrich – wirkt erwachsen und kantig
      const man = !!o.male;
      const sy = (narrow ? 0.5 : 1) * (man ? 0.72 : 1);
      const ew = man ? 0.85 : 1;
      A(ball(12), '#fbf8f2', { bone: hb, p: [ex, eyeY, ez], s: [hr * 0.18 * ew, hr * 0.25 * sy, hr * 0.08] });
      A(ball(12), iris, { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.03 * sy, ez + hr * 0.03], s: [hr * 0.14 * ew * (man ? 0.82 : 1), hr * 0.2 * sy, hr * 0.06], shine: 0.6 });
      A(ball(10), lighter(iris, 0.35), { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.1 * sy, ez + hr * 0.055], s: [hr * 0.09, hr * 0.08 * sy, hr * 0.03] });
      A(ball(10), '#140c08', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.01 * sy, ez + hr * 0.07], s: [hr * 0.07, hr * 0.11 * sy, hr * 0.03] });
      A(sphere3(1, 8, 6), '#ffffff', { bone: hb, p: [ex - sx * hr * 0.05, eyeY + hr * 0.07 * sy, ez + hr * 0.1], s: [hr * 0.055, hr * 0.06 * sy, hr * 0.025], mat: 'glow' });
      if (!man) A(sphere3(1, 6, 5), '#ffffff', { bone: hb, p: [ex + sx * hr * 0.04, eyeY - hr * 0.09 * sy, ez + hr * 0.1], s: [hr * 0.026, hr * 0.026, hr * 0.02], mat: 'glow' });
      if (man) {
        // gerades, schweres Oberlid (leicht zur Mitte geneigt) und ein feiner Unterlidstrich
        A(roundBox(hr * 0.34, hr * 0.06, hr * 0.05, hr * 0.02), ink, { bone: hb, p: [ex, eyeY + hr * 0.15 * sy, ez + hr * 0.045], r: [0, 0, sx * 0.1] });
        A(roundBox(hr * 0.22, hr * 0.022, hr * 0.03, hr * 0.01), darker(o.skin || '#e9c6a1', 0.35), { bone: hb, p: [ex, eyeY - hr * 0.2 * sy, ez + hr * 0.04] });
      } else {
        // Lidstrich mit Schwung nach außen
        A(torus3(hr * 0.18, hr * 0.032, Math.PI * 0.82, 4, 10), ink, { bone: hb, p: [ex, eyeY + hr * 0.02 * sy, ez + hr * 0.035], r: [0, 0, Math.PI * 0.09], s: [1, sy * 1.25, 1] });
        A(horn3(hr * 0.12, hr * 0.03, 5), ink, { bone: hb, p: [ex + sx * hr * 0.17, eyeY + hr * 0.1 * sy, ez + hr * 0.02], r: [0, 0, -sx * 2.2] });
      }
      if (o.female) {
        // längere Wimpern: zweiter Schwung und ein feiner unterer Lidstrich
        A(horn3(hr * 0.1, hr * 0.024, 5), ink, { bone: hb, p: [ex + sx * hr * 0.12, eyeY + hr * 0.19 * sy, ez + hr * 0.03], r: [0, 0, -sx * 2.6] });
        A(torus3(hr * 0.13, hr * 0.012, Math.PI * 0.5, 3, 8), ink, { bone: hb, p: [ex, eyeY - hr * 0.02, ez + hr * 0.03], r: [0, 0, Math.PI * 1.25] });
      }
    }
    // Brauen: entschlossen oder grimmig schräg, sonst sanft gebogen
    const stern = shape === 3 || o.angry;
    if (o.male && !stern) {
      // Männer: dicke, gerade Brauen dicht über dem Auge, innen leicht gesenkt
      // seit 14.53 etwas kräftiger
      A(roundBox(hr * 0.35, hr * 0.1, hr * 0.065, hr * 0.035), brow, { bone: hb, p: [ex + sx * hr * 0.01, eyeY + hr * 0.27, ez + hr * 0.0], r: [0, 0, sx * 0.14] });
    } else A(roundBox(hr * 0.26, hr * (o.male ? 0.065 : o.female ? 0.035 : 0.045), hr * 0.05, hr * 0.02), stern ? ink : brow, { bone: hb, p: [ex, eyeY + hr * (stern ? 0.3 : 0.36), ez + hr * 0.0], r: [0, 0, stern ? sx * 0.42 : -sx * 0.12] });
  }
  if (o.blush !== false && !o.glowEyes) for (const sx of [-1, 1]) A(ball(8), '#f2988a', { bone: hb, p: [hc[0] + sx * hr * 0.58, eyeY - hr * 0.3, hc[2] + f * 0.84], s: [hr * 0.14, hr * 0.07, hr * 0.05] });
  if (!o.noMouth) {
    if (o.beastEyes) {
      // breites, zähnefletschendes Maul
      A(roundBox(hr * 0.46, hr * 0.09, hr * 0.06, hr * 0.04), '#2a0e0c', { bone: hb, p: [hc[0], hc[1] - hr * 0.47, hc[2] + f * 0.96] });
      for (let k = -2; k <= 2; k++) A(horn3(hr * 0.09, hr * 0.03, 4), '#f0e6cc', { bone: hb, p: [hc[0] + k * hr * 0.09, hc[1] - hr * (k % 2 ? 0.43 : 0.52), hc[2] + f * 0.99], r: [k % 2 ? Math.PI : 0, 0, 0] });
    } else if (o.angry) A(roundBox(hr * 0.2, hr * 0.045, hr * 0.05, hr * 0.02), '#4a1a14', { bone: hb, p: [hc[0], hc[1] - hr * 0.45, hc[2] + f * 0.97] });
    else if (o.male) A(roundBox(hr * 0.17, hr * 0.03, hr * 0.03, hr * 0.012), '#6a2a24', { bone: hb, p: [hc[0], hc[1] - hr * 0.42, hc[2] + f * 0.98] });
    else A(torus3(hr * 0.08, hr * (o.female ? 0.03 : 0.022), Math.PI * 0.8, 4, 8), o.female ? '#c0485a' : '#6a2a24', { bone: hb, p: [hc[0], hc[1] - hr * 0.38, hc[2] + f * 0.98], r: [0, 0, Math.PI + Math.PI * 0.1] });
  }
  if (!o.noNose) {
    if (o.male) {
      // Männer: kräftigere Nase mit Rücken, dazu ein angedeutetes Kinn
      A(ball(8), darker(o.skin || '#e9c6a1', 0.08), { bone: hb, p: [hc[0], hc[1] - hr * 0.2, hc[2] + f * 1.02], s: [hr * 0.07, hr * 0.13, hr * 0.07] });
      A(sphere3(hr * 0.07, 8, 6), darker(o.skin || '#e9c6a1', 0.12), { bone: hb, p: [hc[0], hc[1] - hr * 0.28, hc[2] + f * 1.04] });
      if (!o.beard) A(ball(8), darker(o.skin || '#e9c6a1', 0.04), { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + f * 0.86], s: [hr * 0.2, hr * 0.1, hr * 0.1] });
    } else A(sphere3(hr * 0.055, 8, 6), darker(o.skin || '#e9c6a1', 0.1), { bone: hb, p: [hc[0], hc[1] - hr * 0.24, hc[2] + f * 1.03] });
  }
  // Gesichtszeichen: 1 Sommersprossen, 2 Narbe, 3 Kriegsbemalung
  if (o.mark === 1) for (const sx of [-1, 1]) for (const [dx, dy] of [[0, 0], [0.12, 0.05], [0.06, -0.08], [0.17, -0.04]]) A(sphere3(hr * 0.024, 6, 4), '#a8683a', { bone: hb, p: [hc[0] + sx * hr * (0.42 + dx), eyeY - hr * (0.3 + dy), hc[2] + f * 0.92] });
  if (o.mark === 2) A(roundBox(hr * 0.05, hr * 0.46, hr * 0.04, hr * 0.02), '#a8483a', { bone: hb, p: [hc[0] - hr * 0.47, eyeY - hr * 0.08, hc[2] + f * 0.94], r: [0, 0, 0.35] });
  if (o.mark === 3) for (const sx of [-1, 1]) for (const k of [0, 1]) A(roundBox(hr * 0.26, hr * 0.045, hr * 0.04, hr * 0.02), '#b82a2a', { bone: hb, p: [hc[0] + sx * hr * 0.44, eyeY - hr * (0.27 + k * 0.12), hc[2] + f * 0.9], r: [0, sx * 0.3, 0] });
}

// --- Haare aus Strähnen ------------------------------------------------------------------------------
// Frisuren: 0 Kurz, 1 Dutt, 2 Lang, 3 Stachelig, 4 Pferdeschwanz, 5 Glatze; seit 8.4 (Monster, später auch
// für Spieler): 6 Zerzaust, 7 Nach hinten gekämmt, 8 Kamm (Irokese), 9 Haarknoten, 10 Wilde Mähne, 11 Schütter.
// "covered": true Helm (Spieler), 'helmet' Helm, 'hood' Kapuze, 'cloth' Kopftuch, 'hat' Hut – darunter schauen
// Pony, Seiten- und Nackensträhnen hervor. rnd: Zufall beim Bauen (Varianten der Monster).

function lock(A, hb, base, len, r, rot, color) {
  A(horn3(len, r, 7), color, { bone: hb, p: base, r: rot, shade: 0.25, shine: 0.25 });
}

// Strähne aus einer einzigen Einheitsform (eine Geometrie im Cache für alle Längen und Dicken; horn3 legt je
// Größe eine neue an): spitz von p aus in Richtung d, wie pointAt3, aber mit fester Breitseite – o.flat < 1
// macht sie flach, breit entlang o.w (sonst quer). Strähnen werfen keinen Schatten (Schattenmodell bleibt klein).
const strandGeo3 = () => lathe3('strand1', [[0, 0], [0.25, 0.05], [0.21, 0.4], [0.11, 0.75], [0, 1]], 6);
const _sx3 = new THREE.Vector3();
const _sy3 = new THREE.Vector3();
const _sz3 = new THREE.Vector3();
function strand3(A, hb, p, d, len, r, color, o = {}) {
  _sy3.set(d[0], d[1], d[2]).normalize();
  const w = o.w || (Math.abs(_sy3.x) < 0.9 ? [1, 0, 0] : [0, 0, 1]);
  _sx3.set(w[0], w[1], w[2]);
  _sx3.addScaledVector(_sy3, -_sx3.dot(_sy3));
  if (_sx3.lengthSq() < 1e-4) _sx3.set(0, 0, 1).addScaledVector(_sy3, -_sy3.z);
  _sx3.normalize();
  _sz3.crossVectors(_sx3, _sy3);
  const k = r / 0.25;
  const m = new THREE.Matrix4().makeBasis(_sx3.multiplyScalar(k), _sy3.multiplyScalar(len), _sz3.multiplyScalar(k * (o.flat || 1)));
  m.setPosition(p[0], p[1], p[2]);
  A(strandGeo3(), color, { bone: hb, m, shade: 0.2, shine: o.shine == null ? 0.25 : o.shine, noShadow: true });
}

// Strähnenkranz: n Strähnen rund um den Kopf zwischen den Winkeln a0 … a1 (0 vorn, + linke Seite) in Höhe yk
// und Abstand rk (in Kopfradien); sie hängen nach unten, stehen um out nach außen ab, mess zerzaust sie
function hairRing3(A, hb, hc, hr, n, yk, rk, a0, a1, len, thick, out, color, rnd, mess) {
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (n === 1 ? 0.5 : k / (n - 1)) + (rnd() - 0.5) * 0.25 * mess;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    const o = out + (rnd() - 0.5) * 0.5 * mess;
    strand3(A, hb, [hc[0] + sa * hr * rk, hc[1] + hr * yk, hc[2] + ca * hr * rk], [sa * o + (rnd() - 0.5) * 0.25 * mess, -1, ca * o], len * hr * (0.85 + rnd() * 0.3 * (1 + mess)), thick * hr, k % 2 ? color : darker(color, 0.08), { w: [ca, 0, -sa], flat: 0.7 });
  }
}

// Glanzband quer über den Hinterkopf, liegt auf der Haarkappe, ohne Umriss (seit 8.4 statt einer hellen Kappe,
// die von hinten wie eine kahle Stelle aussah)
function shineBand3(A, hb, hc, hr, color) {
  A(torus3(+(hr * 0.93).toFixed(3), +(hr * 0.045).toFixed(3), Math.PI * 0.9, 4, 14), lighter(color, 0.22), { bone: hb, p: [hc[0], hc[1] + hr * 0.545, hc[2] - hr * 0.213], r: [Math.PI / 2 - 0.3, 0, -Math.PI * 0.95], shine: 0.6, ao: 0, mat: 'face' });
}

function hair3(A, hb, hc, hr, style, color, covered, rnd) {
  if (style === 5) return;
  // Unter Helm, Kapuze, Hut oder Krone (seit 13.22): Frisuren, die hoch über den Schädel ragen, würden durch die
  // Kopfbedeckung stechen. Kamm und schütteres Haar werden dort zu kurzem Haar, der Knoten oben zum Pferdeschwanz.
  if (covered && (style === 8 || style === 11)) style = 0;
  if (covered && style === 9) style = 4;
  // Stirnband und Kronen (Schamane) lassen das Haar frei, aber nichts darf oben hindurchstechen
  const band = covered === 'band';
  if (band) covered = false;
  const [x, y, z] = hc;
  const R = rnd || mulberry32(31 + style * 7);
  const dark = darker(color, 0.07);
  // neue Frisuren aus Strähnen; zerzaust und Mähne streuen stärker
  const strands = style >= 6;
  const mess = style === 6 || style === 10 ? 1 : 0.35;
  if (style === 8) {
    // Kamm: flache Strähnen von der Stirn bis in den Nacken, hell und dunkel im Wechsel, Seiten geschoren
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a = -0.35 + t * 2.5;
      const ta = a + 0.45;
      strand3(A, hb, [x, y + hr * 0.86 * Math.cos(a), z - hr * 0.9 * Math.sin(a)], [0, Math.cos(ta), -Math.sin(ta)], hr * (0.62 - Math.abs(t - 0.35) * 0.4), hr * 0.22, i % 2 ? color : lighter(color, 0.12), { w: [0, -Math.sin(ta), -Math.cos(ta)], flat: 0.35 });
    }
    return;
  }
  if (style === 9) {
    // Haarknoten oben mit Goldring und langem Schwanz, das Haar darunter straff hochgebunden
    A(ball(10), color, { bone: hb, p: [x, y + hr * 0.98, z - hr * 0.28], s: [hr * 0.26, hr * 0.24, hr * 0.26], shine: 0.25 });
    A(torus3(+(hr * 0.17).toFixed(3), +(hr * 0.055).toFixed(3), Math.PI * 2, 4, 12), '#c9a35a', { bone: hb, p: [x, y + hr * 0.8, z - hr * 0.25], r: [Math.PI / 2 - 0.45, 0, 0], shine: 1 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      strand3(A, hb, [x + Math.sin(a) * hr * 0.55, y + hr * 0.62, z - hr * 0.22 + Math.cos(a) * hr * 0.55], [-Math.sin(a) * 0.55, 1, -Math.cos(a) * 0.55], hr * 0.32, hr * 0.13, k % 2 ? color : dark, { w: [Math.cos(a), 0, -Math.sin(a)], flat: 0.6 });
    }
    strand3(A, hb, [x, y + hr * 1.02, z - hr * 0.42], [0, -0.75, -0.65], hr * 1.05, hr * 0.16, color, { flat: 0.7 });
    for (const sx of [-1, 1]) strand3(A, hb, [x + sx * hr * 0.06, y + hr * 0.98, z - hr * 0.4], [sx * 0.35, -0.6, -0.7], hr * 0.7, hr * 0.12, dark, { flat: 0.7 });
    return;
  }
  if (style === 11) {
    // schütteres Haar: dünne Strähnen liegen vom Scheitel über den Schädel und hängen lang herab, dazwischen Kopfhaut
    for (let k = 0; k < 7; k++) {
      const a = 1.0 + (k / 6) * (Math.PI * 2 - 2.0) + (R() - 0.5) * 0.25;
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      const col = k % 2 ? color : dark;
      const pts = [[0.84, 0.5], [0.56, 0.86], [0.18, 1.0]].map(([h, r]) => [x + sa * hr * r, y + hr * h, z + ca * hr * r]);
      for (let j = 0; j < 2; j++) {
        const d = [pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1], pts[j + 1][2] - pts[j][2]];
        strand3(A, hb, pts[j], d, Math.hypot(d[0], d[1], d[2]) * 1.25, hr * 0.07, col, { w: [ca, 0, -sa], flat: 0.8 });
      }
      strand3(A, hb, pts[2], [sa * 0.12, -1, ca * 0.12 - 0.05], hr * (0.95 + R() * 0.5), hr * 0.07, col, { w: [ca, 0, -sa], flat: 0.8 });
    }
    return;
  }
  if (!covered) {
    A(cap3(hr * 1.07, Math.PI * 0.5, 0, Math.PI * 2, 18, 9), color, { bone: hb, p: [x, y + hr * 0.02, z - hr * 0.05], r: [-0.6, 0, 0], shade: 0.2, shine: 0.25 });
    shineBand3(A, hb, hc, hr, color);
    if (!strands) {
      // Pony: sechs Strähnen über der Stirn, nach außen gefächert
      for (let k = 0; k < 6; k++) {
        const u = k / 5 - 0.5;
        lock(A, hb, [x + u * hr * 1.35, y + hr * 0.72 - Math.abs(u) * hr * 0.12, z + hr * 0.52], hr * (0.48 - Math.abs(u) * 0.14), hr * 0.16, [2.55 - Math.abs(u) * 0.3, 0, -u * 0.9], k % 2 ? color : darker(color, 0.06));
      }
      if (style === 3 && !band) {
        // stachelig: Spitzen nach oben und hinten
        for (let k = 0; k < 9; k++) {
          const a = -1.3 + (k / 8) * 2.6;
          lock(A, hb, [x + Math.sin(a) * hr * 0.6, y + hr * 0.55, z - hr * 0.1 + Math.cos(a) * hr * 0.1], hr * 0.85, hr * 0.22, [-0.5, 0, -a * 0.75], k % 2 ? color : lighter(color, 0.08));
        }
      }
    } else if (style === 7) {
      // nach hinten gekämmt: freie Stirn, Kammstriche in fünf Bahnen über den Scheitel, Seiten nach hinten gestrichen
      const Rs = hr * 1.08;
      const cy = y + hr * 0.02;
      const cz = z - hr * 0.05;
      for (let k = 0; k < 5; k++) {
        const xo = (k / 4 - 0.5) * hr * 0.95;
        const rl = Math.sqrt(Rs * Rs - xo * xo);
        const P = (a) => [x + xo * (1 + 0.15 * Math.sin(Math.min(a, 0))), cy + rl * Math.cos(a), cz + rl * Math.sin(a)];
        const lanes = [0.95, 0.35, -0.3];
        for (let j = 0; j < 2; j++) {
          const p0 = P(lanes[j]);
          const p1 = P(lanes[j + 1]);
          const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
          strand3(A, hb, p0, d, Math.hypot(d[0], d[1], d[2]) * 1.12, hr * 0.12, (k + j) % 2 ? color : lighter(color, 0.08), { flat: 0.3, shine: 0.5 });
        }
      }
      for (const sx of [-1, 1]) for (const dy of [0.32, 0.05]) strand3(A, hb, [x + sx * hr * 0.9, y + hr * dy, z + hr * 0.3], [-sx * 0.12, 0.04, -1], hr * 0.85, hr * 0.14, dy > 0.1 ? color : dark, { w: [0, 1, 0], flat: 0.5 });
    } else {
      // zerzaust bzw. Mähne: Pony aus sieben unruhigen Strähnen
      for (let k = 0; k < 7; k++) {
        const u = k / 6 - 0.5;
        strand3(A, hb, [x + u * hr * 1.3, y + hr * 0.72 - Math.abs(u) * hr * 0.14, z + hr * 0.52], [u * 0.9 + (R() - 0.5) * 0.6, -0.85, 0.55 + (R() - 0.5) * 0.3], hr * (style === 10 ? 0.6 : 0.46) * (0.85 + R() * 0.3), hr * 0.16, k % 2 ? color : dark, { flat: 0.6 });
      }
      // zerzaust: oben stehen Büschel nach oben und hinten ab
      if (style === 6 && !band) for (let k = 0; k < 7; k++) {
        const a = -1.2 + (k / 6) * 2.4 + (R() - 0.5) * 0.3;
        strand3(A, hb, [x + Math.sin(a) * hr * 0.55, y + hr * 0.82, z - hr * 0.1 + Math.cos(a) * hr * 0.25], [Math.sin(a) * 0.7, 0.55 + R() * 0.35, -0.75], hr * (0.42 + R() * 0.25), hr * 0.17, k % 2 ? color : lighter(color, 0.08), { flat: 0.6 });
      }
    }
  } else if (covered === 'hood') {
    // unter der Kapuze: kurzer Pony und je drei Strähnen an den Wangen
    for (let k = 0; k < 5; k++) {
      const u = k / 4 - 0.5;
      strand3(A, hb, [x + u * hr * 1.1, y + hr * 0.52 - Math.abs(u) * hr * 0.1, z + hr * 0.72], [u * 0.8 + (R() - 0.5) * 0.3 * mess, -0.9, 0.5], hr * 0.32 * (0.85 + R() * 0.3), hr * 0.14, k % 2 ? color : dark, { flat: 0.6 });
    }
    // seit 13.22 kurz, auch bei langem Haar (lange Wangensträhnen liefen sonst schräg übers Gesicht)
    for (const sx of [-1, 1]) hairRing3(A, hb, hc, hr, 3, 0.2, 0.92, sx * 0.72, sx * 1.02, 0.45, 0.13, 0.12, color, R, mess);
  } else if (covered === true) {
    // unter dem Helm schauen ein paar Strähnen hervor
    for (const u of [-0.3, 0, 0.3]) lock(A, hb, [x + u * hr, y + hr * 0.48, z + hr * 0.8], hr * 0.24, hr * 0.11, [2.6, 0, -u * 1.2], color);
  } else {
    // unter Helm, Kopftuch oder Hut: Haarkappe (schaut hinten und an den Seiten unter dem Rand hervor), Pony;
    // unter dem Helm etwas kleiner, damit sie nicht durch die Helmschale sticht
    const hk = covered === 'helmet' ? 1.03 : 1.07;
    A(cap3(+(hr * hk).toFixed(4), Math.PI * 0.5, 0, Math.PI * 2, 18, 9), color, { bone: hb, p: [x, y + hr * 0.02, z - hr * (covered === 'helmet' ? 0.02 : 0.05)], r: [-0.6, 0, 0], shade: 0.2, shine: 0.25 });
    // Ansatz unter dem Rand versteckt, die breiten Strähnen schließen aneinander
    const fy = covered === 'helmet' ? 0.32 : covered === 'hat' ? 0.55 : 0.46;
    for (let k = 0; k < 6; k++) {
      const u = k / 5 - 0.5;
      strand3(A, hb, [x + u * hr * 1.2, y + hr * fy - Math.abs(u) * hr * 0.1, z + hr * 0.8], [u * 0.9 + (R() - 0.5) * 0.4 * mess, -0.9, 0.42], hr * (style === 10 ? 0.62 : covered === 'cloth' ? 0.34 : 0.42) * (0.85 + R() * 0.3), hr * 0.17, k % 2 ? color : dark, { flat: 0.5 });
    }
  }
  // Seitensträhnen um die Wangen (unter der Kapuze nur die am Gesicht, siehe oben)
  if (covered !== 'hood') {
    // unter Helm oder Hut (13.22): Wangensträhnen kürzer und weiter hinten, sonst hängen sie schräg übers Gesicht
    const cz = covered ? -0.05 : 0.2;
    if (!strands) for (const sx of [-1, 1]) {
      lock(A, hb, [x + sx * hr * 0.86, y + hr * 0.12, z + hr * cz], hr * (style === 2 && !covered ? 1.05 : 0.55), hr * 0.15, [2.95, 0, sx * 0.1], color);
      lock(A, hb, [x + sx * hr * 0.8, y + hr * 0.15, z - hr * 0.2], hr * (style === 2 ? 0.95 : 0.45), hr * 0.15, [-2.95, 0, sx * 0.16], darker(color, 0.06));
    } else if (style !== 7) for (const sx of [-1, 1]) hairRing3(A, hb, hc, hr, 4, 0.12, 0.9, sx * 1.35, sx * 2.0, style === 10 ? 1.25 : 0.55, 0.15, style === 10 ? 0.3 : 0.12, color, R, mess);
  }
  // Hinterkopf: unter der Kapuze nur bei langem Haar und Pferdeschwanz (sonst ganz verdeckt)
  if (covered === 'hood' && style !== 2 && style !== 4) return;
  // unter der Kapuze (13.22) nur der Pferdeschwanz hinten; die breite Haarplatte und die langen Strähnen ragten seitlich vor
  if (covered === 'hood') {
    if (style === 4) {
      const t0 = [x, y - hr * 0.1, z - hr * 1.0];
      const t2 = [x, y - hr * 1.1, z - hr * 1.15];
      limbBetween(A, t0, t2, hr * 0.2, hr * 0.08, color, { bone: hb, seg: 9, shine: 0.25 });
    }
    return;
  }
  // unter der Kapuze kein Hinterkopf-Haar (es stach hinten durch den Stoff), nur das lange Haar und der Schwanz darunter
  if (covered !== 'hood') A(ball(16), color, { bone: hb, p: [x, y - hr * 0.02, z - hr * 0.22], s: [hr * 1.04, hr * 0.98, hr * 0.84], shade: 0.25 });
  if (!strands) {
    // Strähnen am Hinterkopf
    for (let k = 0; k < 5; k++) {
      const u = k / 4 - 0.5;
      lock(A, hb, [x + u * hr * 1.3, y - hr * 0.25, z - hr * 0.75], hr * (style === 2 ? 1.5 : 0.5), hr * 0.2, [-2.75, 0, u * 0.5], k % 2 ? color : darker(color, 0.07));
    }
  } else if (style === 7) {
    // kurzer Entenschwanz im Nacken
    for (let k = 0; k < 5; k++) {
      const u = k / 4 - 0.5;
      strand3(A, hb, [x + u * hr * 0.8, y - hr * 0.12, z - hr * 0.86], [u * 0.8, -0.55, -0.75], hr * 0.5, hr * 0.16, k % 2 ? color : dark, { w: [1, 0, 0], flat: 0.6 });
    }
  } else hairRing3(A, hb, hc, hr, style === 10 ? 9 : 7, -0.2, 0.86, 2.25, Math.PI * 2 - 2.25, style === 10 ? 1.5 : 0.6, 0.17, style === 10 ? 0.25 : 0.1, color, R, mess);
  if (style === 1 && !covered && !band) {
    A(ball(12), color, { bone: hb, p: [x, y + hr * 0.95, z - hr * 0.38], s: [hr * 0.38, hr * 0.34, hr * 0.38], shine: 0.25 });
    A(torus3(hr * 0.24, hr * 0.06, Math.PI * 2, 4, 14), '#c8402f', { bone: hb, p: [x, y + hr * 0.75, z - hr * 0.3], r: [Math.PI / 2 - 0.5, 0, 0] });
    A(limb3(hr * 0.9, hr * 0.03, hr * 0.03, 4), '#c9a35a', { bone: hb, p: [x - hr * 0.45, y + hr * 1.05, z - hr * 0.35], r: [0, 0, 1.35] });
  }
  if (style === 2) A(roundBox(hr * 1.5, hr * 1.5, hr * 0.42, hr * 0.2), color, { bone: hb, p: [x, y - hr * 0.7, z - hr * 0.6], shade: 0.3 });
  if (style === 4) {
    const t0 = [x, y + hr * 0.28, z - hr * 1.0];
    A(torus3(hr * 0.15, hr * 0.06, Math.PI * 2, 4, 12), '#c8402f', { bone: hb, p: t0, r: [0.3, 0, 0] });
    const t1 = [x, y - hr * 0.35, z - hr * 1.3];
    const t2 = [x, y - hr * 1.1, z - hr * 1.2];
    limbBetween(A, t0, t1, hr * 0.24, hr * 0.2, color, { bone: hb, seg: 9, shine: 0.25 });
    limbBetween(A, t1, t2, hr * 0.2, hr * 0.08, color, { bone: hb, seg: 9, shine: 0.25 });
  }
}

// --- Menschliche Gestalt (Spieler, Bewohner, Banditen, Orks, Untote, Riesen …) ----------------------

// Körperform der Spielfiguren (seit 14.53), angewandt beim Backen auf jede Ecke der Teile an Brust- und Hüftknochen
// (Bake3: it.warp). Frauen: Taille eingezogen, Hüfte runder, Brust nach vorn; Männer: Brustkorb breiter, Hüfte schmaler.
// Glocke g(t) = (1 − t²)² für |t| < 1, sonst 0 – weich und ohne Knick.
function bodyWarp3(fem, hipY, chestY, bk) {
  const g = (t) => (t > -1 && t < 1 ? (1 - t * t) * (1 - t * t) : 0);
  if (fem) {
    const waistY = hipY + 0.15;
    const bustY = chestY + 0.045;
    return (v) => {
      const y = v.y;
      const sx = 1 - 0.15 * g((y - waistY) / 0.1) + 0.13 * g((y - hipY + 0.03) / 0.12);
      v.x *= sx;
      v.z *= 1 - 0.07 * g((y - waistY) / 0.1) + 0.05 * g((y - hipY + 0.03) / 0.12);
      if (v.z > 0) v.z += 0.05 * bk * g((y - bustY) / 0.075) * g((Math.abs(v.x) - 0.068 * bk) / 0.1) * Math.min(1, v.z / 0.1);
    };
  }
  const chestC = chestY + 0.07;
  return (v) => {
    const y = v.y;
    v.x *= 1 + 0.07 * g((y - chestC) / 0.13) - 0.05 * g((y - hipY) / 0.1);
    v.z *= 1 + 0.04 * g((y - chestC) / 0.13);
  };
}

function humanoid3(b, c, P) {
  // Spielfiguren (c.tame, seit 14.59): helle Ausrüstungsfarben gedämpft, Haut und Haare unverändert
  const A = c.tame ? tameAdder3(adder(b, P), new Set([c.skin, lighter(c.skin, 0.12), c.hair && c.hair.color, c.braid, c.beard].filter(Boolean))) : adder(b, P);
  const seg = (a, z, r1, r2, color, o) => limbBetween(A, a, z, r1, r2, color, o);
  const belly = !!c.belly;
  // bk: kräftiger Körperbau (Krieger), breitere Schultern, Arme und Beine
  const bk = c.bulk || 1;
  // seit 14.53: Körperbau nach Geschlecht (nur Spielfiguren setzen female/male): Frauen schmalere Schultern, schlankere
  // Arme und Hals, breitere Hüften; Männer breite Schultern, kräftige Arme und Hals, schmale Hüften
  const fem = !!c.female && !belly;
  const man = !!c.male && !belly;
  const shK = fem ? 0.9 : man ? 1.1 : 1;
  const hipK = fem ? 1.16 : man ? 0.92 : 1;
  const armK = fem ? 0.86 : man ? 1.12 : 1;
  const legLen = belly ? 0.3 : c.legLen || 0.34;
  const hipX = (belly ? 0.16 : 0.105) * bk * hipK;
  const legR = (belly ? 0.12 : 0.082) * bk;
  const hipY = legLen + 0.06;
  const chestY = hipY + 0.26;
  const shY = hipY + (belly ? 0.48 : 0.37);
  const shX = (belly ? 0.42 : 0.25) * bk * shK;
  const armLen = belly ? 0.46 : c.armLen || 0.31;
  const armR = (belly ? 0.11 : 0.062) * bk * armK;
  const neckY = hipY + (belly ? 0.6 : 0.44);
  const hr = c.headR || (belly ? 0.26 : 0.33);
  // headZ: Kopf etwas nach vorn (schlanke Wegelagerer)
  const hc = [0, neckY + hr * 0.84, (belly ? 0.1 : 0.02) + (c.headZ || 0)];
  const handR = [-shX, shY - armLen - armR * 0.5, 0.02];
  const handL = [shX, shY - armLen - armR * 0.5, 0.02];
  const bones = [
    [[0, 0, 0], -1], [[0, hipY, 0], 0], [[0, chestY, 0], 1], [[0, neckY, 0], 2],
    [[shX, shY, 0], 2], [[-shX, shY, 0], 2], [[shX, shY - armLen, 0], 4], [[-shX, shY - armLen, 0], 5],
    [[hipX, hipY, 0], 1], [[-hipX, hipY, 0], 1], [[0, shY + 0.02, -0.18], 2], [[0, hipY + 0.04, -0.2], 1],
    [[0.12, shY - 0.02, -0.18], 2], [[-0.12, shY - 0.02, -0.18], 2]
  ];
  // schwebende, sich drehende Teile (seit 8.6, Magier) bekommen eigene Knochen hinter den üblichen 14
  const spin = spinBones3(c, bones, { hipY, shY, hc, hr, handR });
  // Bogensehne (seit 13.67): zwei eigene Knochen an den Bogenspitzen tragen je eine Hälfte der Sehne. In Ruhe liegen sie
  // gerade von Spitze zu Spitze; beim Ziehen dreht und streckt bowString3 sie zur Zughand (V-Form, siehe syncPlayer3)
  const bowStr = c.weapon && c.weapon.kind === 'bow' ? bowStringBones3(c.weapon.tier, handR, bones) : null;
  const rig = rigOf(bones);
  const pants = c.pants || darker(c.torso, 0.2);
  const boots = c.boots || '#3a2a1c';
  const trim = c.trim || c.belt || darker(c.torso, 0.3);
  // Beine mit Knien und Stiefeln (Schaft, Stulpe, dunkle Sohle)
  // seit 14.74: angelegte Stiefel kräftiger und länger (bootNew); footZ0/footZ1: Ferse und Spitze (auch für gearBoots3)
  const bootNew = c.bootDetail != null && !belly;
  const footZ0 = bootNew ? -legR * 0.95 : -legR * 1.05;
  const footZ1 = bootNew ? legR * (c.robe ? 3.3 : 2.7) : legR * 2.05;
  for (const [sx, bone] of [[1, BH.legL], [-1, BH.legR]]) {
    const top = [sx * hipX, hipY, 0];
    const knee = [sx * hipX * 1.02, hipY - legLen * 0.5, 0.015];
    const ankle = [sx * hipX, 0.1, 0];
    // seit 14.53: Frauen mit runderen Oberschenkeln und schlankeren Waden
    seg(top, knee, legR * (fem ? 1.14 : 1), legR * (fem ? 0.86 : 0.9), pants, { bone, shade: 0.12 });
    seg(knee, ankle, legR * (fem ? 0.86 : 0.9), legR * (fem ? 0.72 : 0.78), pants, { bone });
    if (c.kneePads) A(ball(10), c.kneePads, { bone, p: [knee[0], knee[1], knee[2] + legR * 0.6], s: [legR * 0.9, legR * 0.85, legR * 0.6], shine: 0.6 });
    if (bootNew) {
      // seit 14.74 (angelegte Stiefel; Spielerwunsch „die Schuhe kommen gar nicht richtig zur Geltung“): vorher ein
      // schmaler Schaft und ein kurzer Kasten als Fuß, der kaum unter Rock, Beintaschen oder Robe hervorkam. Jetzt ein
      // kräftiger Stiefel: Schaft leicht ausgestellt, breite umgeschlagene Stulpe, längerer Fuß mit runder Kappe, dicke
      // Sohle mit Absatz, Riemen mit Schnalle; dazu je Klasse Beschläge (siehe unten) und je Stufe das Merkmal aus
      // gearBoots3 (drei-ausruestung.js), das sich nach footZ0/footZ1 richtet
      const bm = c.bootTrim || '#a8acb2';
      const bt = c.bootDetail;
      const L = legR / 0.082;
      const x = sx * hipX;
      const fl = footZ1 - footZ0;
      A(lathe3('bootshaft74', [[0.084, 0], [0.088, 0.07], [0.094, 0.15], [0.102, 0.2], [0, 0.201]], 14), boots, { bone, p: [x, 0.03, 0], s: [L, 1, L], shade: 0.15 });
      // unter Beinschienen nur ein schmaler Rand (die breite Stulpe stach sonst durch die Schiene)
      if (c.greaves) A(torus3(legR * 1.17, 0.02, Math.PI * 2, 4, 14), c.bootTrim || lighter(boots, 0.15), { bone, p: [x, 0.205, 0], r: [Math.PI / 2, 0, 0], shine: c.bootTrim ? 0.8 : 0 });
      else A(lathe3('bootcuff74', [[0.098, 0], [0.122, 0.034], [0.118, 0.06], [0, 0.061]], 14), c.bootTrim || lighter(boots, 0.2), { bone, p: [x, 0.2, 0], s: [L, 1, L], shine: c.bootTrim ? 0.8 : 0, shade: 0.2 });
      A(roundBox(legR * 2.05, 0.1, fl * 0.78, legR * 0.8), boots, { bone, p: [x, 0.062, footZ0 + fl * 0.39], top: lighter(boots, 0.15), topK: 0.4 });
      A(ball(10), boots, { bone, p: [x, 0.06, footZ1 - legR * 0.78], s: [legR * 1.02, 0.052, legR * 0.8], top: lighter(boots, 0.15), topK: 0.4 });
      A(roundBox(legR * 2.2, 0.032, fl + 0.012, 0.012), darker(boots, 0.5), { bone, p: [x, 0.016, (footZ0 + footZ1) / 2] });
      A(roundBox(legR * 1.85, 0.05, legR * 0.95, 0.012), darker(boots, 0.58), { bone, p: [x, 0.028, footZ0 + legR * 0.5] });
      A(roundBox(legR * 2.12, 0.026, legR * 0.5, 0.01), darker(boots, 0.3), { bone, p: [x, 0.112, legR * 0.6], r: [0.55, 0, 0] });
      A(roundBox(0.032, 0.032, 0.012, 0.005), bm, { bone, p: [sx * (hipX + legR * 0.82), 0.112, legR * 0.72], r: [0.55, 0, 0], shine: 1 });
      if (bt >= 2 && !c.greaves) for (const a of [-0.6, 0, 0.6]) A(sphere3(0.012, 6, 4), bm, { bone, p: [x + Math.sin(a) * legR * 1.47, 0.232, Math.cos(a) * legR * 1.47], shine: 1 });
      if (c.padStyle === 'plate' && bt >= 1) {
        // Krieger: Ristplatte und Knöchelschalen aus Metall
        A(roundBox(legR * 1.5, 0.018, legR * 1.2, 0.008), bm, { bone, p: [x, 0.12, legR * 1.25], r: [0.42, 0, 0], shine: 1, top: lighter(bm, 0.25), topK: 0.3 });
        for (const s2 of [-1, 1]) A(ball(8), bm, { bone, p: [x + s2 * legR * 1.0, 0.085, 0], s: [0.02, 0.032, 0.032], shine: 1 });
      }
      // Roben (Magier, Schamane, Nekromant): spitze, leicht aufgebogene Schuhspitzen schauen unter dem Saum hervor
      if (c.robe) A(horn3(legR * 1.0, legR * 0.62, 7), boots, { bone, p: [x, 0.06, footZ1 - legR * 0.55], r: [Math.PI / 2 - 0.45, 0, 0], s: [1, 1, 0.7], top: lighter(boots, 0.15), topK: 0.4 });
    } else {
      A(lathe3('bootshaft', [[0.08, 0], [0.085, 0.08], [0.09, 0.16], [0, 0.161]], 12), boots, { bone, p: [sx * hipX, 0.04, 0], s: [legR / 0.082, 1, legR / 0.082] });
      A(torus3(legR * 1.15, 0.02, Math.PI * 2, 4, 14), c.bootTrim || lighter(boots, 0.15), { bone, p: [sx * hipX, 0.2, 0], r: [Math.PI / 2, 0, 0] });
      A(roundBox(legR * 1.95, 0.1, legR * 3.1, legR * 0.85), boots, { bone, p: [sx * hipX, 0.06, legR * 0.5], top: lighter(boots, 0.15), topK: 0.4 });
      A(roundBox(legR * 2.05, 0.035, legR * 3.2, 0.015), darker(boots, 0.45), { bone, p: [sx * hipX, 0.018, legR * 0.5] });
    }
    if (c.shin) A(roundBox(legR * 1.6, 0.16, 0.04, 0.02), c.shin, { bone, p: [sx * hipX, 0.24, legR * 0.85], shine: 0.7 });
    // Beinschienen aus Platten mit Kniekachel
    if (c.greaves) {
      A(cap3(legR * 1.18, Math.PI * 0.62, -Math.PI * 0.5, Math.PI, 10, 6), c.greaves, { bone, p: [sx * hipX, 0.2, 0.0], s: [1, 2.2, 1.1], r: [Math.PI / 2, 0, 0], shine: 0.8, top: lighter(c.greaves, 0.25), topK: 0.3 });
      A(roundBox(0.018, 0.17, 0.02, 0.008), lighter(c.greaves, 0.3), { bone, p: [sx * hipX, 0.25, legR * 1.12], shine: 1 });
      A(ball(10), c.greaves, { bone, p: [knee[0], knee[1] + 0.01, knee[2] + legR * 0.7], s: [legR * 1.05, legR * 0.95, legR * 0.7], shine: 0.9 });
      // seit 14.74 nicht unter Beintaschen: der Dorn am Knie stach dort unter den Platten hervor
      if (c.greaveSpike && !c.tassets && !c.featherTassets) A(horn3(0.07, 0.022, 5), c.greaveSpike, { bone, p: [knee[0], knee[1] + 0.01, knee[2] + legR * 1.2], r: [Math.PI / 2, 0, 0], shine: 1 });
    }
    // Wickelbänder über Kreuz (Barbar, Ninja)
    if (c.legWraps) for (let k = 0; k < 4; k++) A(torus3(legR * (c.baggy ? 1.02 : 0.9), 0.012, Math.PI * 2, 4, 12), c.legWraps, { bone, p: [sx * hipX, 0.24 + k * 0.04, 0.005], r: [Math.PI / 2 + (k % 2 ? 0.28 : -0.28), 0, 0] });
    // weite Hakama-Hose, unten gebunden
    if (c.baggy) {
      seg(top, knee, legR * 1.22, legR * 1.3, pants, { bone, shade: 0.15 });
      seg(knee, [ankle[0], 0.24, 0], legR * 1.3, legR * 1.15, pants, { bone, shade: 0.15 });
    }
    // Fellstulpen über den Stiefeln
    if (c.furBoots) for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      A(horn3(0.07, 0.035, 5), k % 2 ? c.furBoots : lighter(c.furBoots, 0.12), { bone, p: [sx * hipX + Math.cos(a) * legR * 1.05, 0.2, Math.sin(a) * legR * 1.05], r: [Math.sin(a) * 2.4, 0, -Math.cos(a) * 2.4] });
    }
    // Tabi: geteilte Zehenkappe
    if (c.tabi) A(roundBox(0.008, 0.06, 0.05, 0.004), darker(boots, 0.5), { bone, p: [sx * hipX, 0.07, legR * 1.75] });
  }
  // Rumpf
  if (belly) {
    A(ball(16), c.skin, { bone: BH.chest, p: [0, hipY + 0.26, 0.04], s: [0.45, 0.42, 0.38], shade: 0.2 });
    A(ball(12), lighter(c.skin, 0.12), { bone: BH.chest, p: [0, hipY + 0.17, 0.2], s: [0.32, 0.27, 0.22] });
    A(ball(12), c.skin, { bone: BH.chest, p: [0, shY - 0.04, 0.0], s: [0.4, 0.2, 0.3] });
    A(lathe3('bellypants', [[0.36, 0], [0.43, 0.02], [0.42, 0.16], [0, 0.17]], 18), pants, { bone: BH.hips, p: [0, hipY - 0.1, 0.03] });
  } else {
    // Frauen: schmale Taille, runde Hüften, schmalere Schultern; Männer (seit 14.53): V-Form mit breiter Brust und
    // schmaler Hüfte. Umrisse gleich TORSO3_F/TORSO3_M in drei-ausruestung.js (Rüstungsteile sitzen darauf)
    const torsoPts = fem
      ? [[0, 0], [0.2, 0], [0.226, 0.055], [0.2, 0.11], [0.152, 0.17], [0.172, 0.25], [0.186, 0.31], [0.165, 0.38], [0.105, 0.43], [0, 0.44]]
      : man
        ? [[0, 0], [0.158, 0], [0.178, 0.05], [0.184, 0.13], [0.22, 0.24], [0.228, 0.3], [0.2, 0.38], [0.13, 0.43], [0, 0.44]]
        : [[0, 0], [0.17, 0], [0.2, 0.05], [0.19, 0.13], [0.21, 0.24], [0.22, 0.3], [0.19, 0.38], [0.12, 0.43], [0, 0.44]];
    A(lathe3(fem ? 'torsoF2' : man ? 'torsoM' : 'torso2', torsoPts, 16), c.torso, { bone: BH.chest, p: [0, hipY - 0.02, 0], s: [bk, 1, 0.84 * bk], shade: 0.18 });
    // Hals: bei Männern kräftiger, bei Frauen schlanker
    const nk = fem ? 0.84 : man ? 1.3 : 1;
    A(cyl3(0.055 * nk, 0.06 * nk, 0.1, 10), c.skin, { bone: BH.head, p: [0, neckY + 0.02, 0.0] });
    A(torus3(0.12, 0.032, Math.PI * 2, 5, 16), c.collar || trim, { bone: BH.chest, p: [0, neckY - 0.02, 0], r: [Math.PI / 2 - 0.15, 0, 0], s: [1, 0.86, 1] });
    if (c.robe) {
      A(lathe3('robe2', [[0, 0], [0.31, 0], [0.32, 0.03], [0.28, 0.2], [0.23, 0.4], [0.2, 0.47], [0, 0.48]], 20), c.robe, { bone: BH.hips, p: [0, 0.02, 0], s: [1, 1, 0.88], shade: 0.25, shine: c.robeShine || 0 });
      if (c.hemTrim) A(torus3(0.31, 0.022, Math.PI * 2, 4, 22), c.hemTrim, { bone: BH.hips, p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.88, 1], shine: 0.5 });
      if (c.tattered) for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        A(horn3(0.12 + (k % 3) * 0.04, 0.05, 5), darker(c.robe, 0.15), { bone: BH.hips, p: [Math.cos(a) * 0.29, 0.06, Math.sin(a) * 0.26], r: [Math.PI, 0, 0] });
      }
    } else {
      // seit 14.53: Frauen mit runderem Rock über den breiteren Hüften
      A(lathe3('skirt2', [[0, 0], [0.27, 0], [0.285, 0.02], [0.25, 0.13], [0.21, 0.18], [0, 0.19]], 16), c.skirt || darker(c.torso, 0.1), { bone: BH.hips, p: [0, hipY - 0.17, 0], s: [bk * (fem ? 1.1 : man ? 0.96 : 1), 1, 0.84 * bk * (fem ? 1.06 : 1)], shade: 0.2 });
      // Stoffbahnen vorn und hinten
      // seit 14.74 kürzer und am Rock anliegend (vorher 0,22 hoch bis hipY − 0,28, nach außen gekippt): die Bahnen hingen
      // vorn zwischen den Beintaschen und hinten unter dem Umhang bis auf die Stiefel und sahen aus wie ein Teil, das aus
      // der Rüstung herausragt (Spielerbild). Jetzt liegen sie außen auf dem Rock (gleiche Neigung) und enden am
      // Rocksaum. Unter Beintaschen (Krieger) fallen sie weg: dort lagen sie sonst vor den
      // Platten oder Federn.
      if (!c.tassets && !c.featherTassets) for (const sz of [1, -1]) A(roundBox(0.17, 0.14, 0.025, 0.012), c.flap || c.skirt || darker(c.torso, 0.18), { bone: BH.hips, p: [0, hipY - 0.1, sz * 0.24 * bk * (fem ? 1.06 : 1)], r: [-sz * 0.26, 0, 0], shade: 0.25 });
    }
  }
  // Gürtel mit Schnalle und Tasche
  if (c.belt) {
    const by = hipY + (belly ? 0.06 : 0.02);
    const bw = fem ? 1.08 : 1;
    A(torus3(belly ? 0.41 : 0.21, 0.03 * (c.wideBelt ? 1.6 : 1), Math.PI * 2, 5, 20), c.belt, { bone: BH.hips, p: [0, by, 0], r: [Math.PI / 2, 0, 0], s: [bk * bw, 0.86 * bk * bw, c.wideBelt ? 1.4 : 1] });
    // die Schnalle kommt bei angelegtem Gürtel aus der Ausrüstung (drei-ausruestung.js)
    if (!c.noBuckle) {
      A(roundBox(c.wideBelt ? 0.12 : 0.08, c.wideBelt ? 0.1 : 0.065, 0.03, 0.012), c.buckle || '#c9a35a', { bone: BH.hips, p: [0, by, (belly ? 0.36 : 0.185) * bk], shine: 1 });
      if (c.wideBelt) A(ball(8), darker(c.buckle || '#c9a35a', 0.2), { bone: BH.hips, p: [0, by, 0.2 * bk], s: [0.035, 0.035, 0.02], shine: 1 });
    }
    if (c.pouch !== false) A(roundBox(0.085, 0.09, 0.06, 0.025), c.pouch || darker(c.belt, 0.1), { bone: BH.hips, p: [-0.15, by - 0.06, 0.12], r: [0, 0.6, 0] });
  }
  if (c.sash) {
    A(torus3(0.215, 0.045, Math.PI * 2, 5, 20), c.sash, { bone: BH.hips, p: [0, hipY + 0.06, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.86, 1] });
    for (const x of [-0.08, 0.06]) {
      A(roundBox(0.06, 0.13, 0.008, 0.004), '#efe6cc', { bone: BH.hips, p: [x, hipY - 0.06, 0.2], r: [0.1, 0, x * 2] });
      A(roundBox(0.012, 0.09, 0.01, 0.004), '#b33a2c', { bone: BH.hips, p: [x, hipY - 0.06, 0.206], r: [0.1, 0, x * 2] });
    }
  }
  // weibliche Figur: Brust (in der Farbe dessen, was darüber liegt). Seit 14.53 runder und etwas tiefer, sitzt auf dem
  // Rumpf bzw. Harnisch (bustAt3), Rüstungsteile vorn heben sich darüber (torsoAt3)
  if (fem) {
    const bu = bustAt3(bk, !!c.cuirass, chestY);
    for (const sx of [-1, 1]) A(ball(12), c.cuirass || c.torso, { bone: BH.chest, p: [sx * bu.x, bu.y, bu.z], s: bu.s, r: [0.25, sx * 0.22, 0], shine: c.cuirass ? 0.8 : 0, shade: 0.22 });
  }
  // Lamellenrüstung: Reihen überlappender Platten, Brustplatte mit Nieten
  if (c.lamellar) {
    for (let k = 0; k < 3; k++) A(torus3(0.205 - k * 0.006, 0.026, Math.PI * 2, 4, 18), k % 2 ? c.lamellar : lighter(c.lamellar, 0.12), { bone: BH.chest, p: [0, hipY + 0.07 + k * 0.075, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.84 * bk, 1], shine: 0.4 });
  }
  // Plattenharnisch über Brust und Rücken mit Mittelgrat und Nieten
  if (c.cuirass) {
    A(lathe3(fem ? 'cuirassF' : 'cuirass', (fem ? CUIRASS3_F : CUIRASS3).map(([y, r]) => [r, y]).concat([[0, 0.315]]), 18), c.cuirass, { bone: BH.chest, p: [0, hipY + 0.11, 0], s: [bk, 1, 0.88 * bk], shine: 0.85, top: lighter(c.cuirass, 0.28), topK: 0.35 });
    A(roundBox(0.03, 0.24, 0.03, 0.012), lighter(c.cuirass, 0.3), { bone: BH.chest, p: [0, hipY + 0.24, 0.2 * bk], shine: 1 });
    A(torus3(0.215, 0.016, Math.PI * 2, 4, 20), c.cuirassRim || lighter(c.cuirass, 0.3), { bone: BH.chest, p: [0, hipY + 0.115, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.88 * bk, 1], shine: 1 });
    for (const sx of [-1, 1]) for (const y of [0.15, 0.25]) A(sphere3(0.013, 6, 4), c.cuirassRim || '#e8c46a', { bone: BH.chest, p: [sx * 0.13 * bk, hipY + y, 0.17 * bk], shine: 1 });
    // seit 14.59 (Spielfiguren): Halsreif oben, zwei Bauchreifen vorn und eine Nietenreihe am unteren Rand
    if (c.tame) {
      const rim = c.cuirassRim || lighter(c.cuirass, 0.3);
      A(torus3(fem ? 0.13 : 0.14, 0.014, Math.PI * 2, 4, 16), rim, { bone: BH.chest, p: [0, hipY + 0.415, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.88 * bk, 1], shine: 1 });
      for (const [y, r] of [[0.155, fem ? 0.19 : 0.222], [0.195, fem ? 0.197 : 0.228]]) A(torus3(r + 0.004, 0.008, Math.PI * 0.9, 3, 12), darker(c.cuirass, 0.3), { bone: BH.chest, p: [0, hipY + y, 0], r: [Math.PI / 2, 0, Math.PI * 0.05], s: [bk, 0.88 * bk, 1], shine: 0.6 });
      for (let k = 0; k < 6; k++) {
        const a = -0.95 + k * 0.38;
        const rr = fem ? 0.19 : 0.224;
        A(sphere3(0.011, 6, 4), rim, { bone: BH.chest, p: [Math.sin(a) * rr * bk, hipY + 0.125, Math.cos(a) * rr * 0.88 * bk], shine: 1 });
      }
    }
  }
  // Beintaschen: Platten, die vom Gürtel über den Rock hängen
  if (c.tassets) for (const [x, z, ry] of [[-0.09, 0.19, 0.25], [0.09, 0.19, -0.25], [-0.2, 0.02, 1.4], [0.2, 0.02, -1.4]]) {
    A(roundBox(0.12, 0.17, 0.025, 0.012), c.tassets, { bone: BH.hips, p: [x * bk, hipY - 0.1, z * bk], r: [0.14, ry, 0], shine: 0.7, top: lighter(c.tassets, 0.25), topK: 0.3 });
    A(roundBox(0.125, 0.02, 0.03, 0.008), c.tassetRim || lighter(c.tassets, 0.3), { bone: BH.hips, p: [x * bk, hipY - 0.18, z * bk + 0.004], r: [0.14, ry, 0], shine: 1 });
  }
  // Fellkragen (barbarisch): dicker Wulst mit Büscheln
  if (c.furCollar) {
    A(torus3(0.15 * bk, 0.05, Math.PI * 2, 6, 16), c.furCollar, { bone: BH.chest, p: [0, neckY - 0.04, -0.01], r: [Math.PI / 2 - 0.15, 0, 0], shade: 0.15 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      A(horn3(0.08, 0.035, 5), k % 2 ? c.furCollar : lighter(c.furCollar, 0.15), { bone: BH.chest, p: [Math.cos(a) * 0.17 * bk, neckY - 0.06, Math.sin(a) * 0.15 * bk], r: [Math.sin(a) * 2.2, 0, -Math.cos(a) * 2.2] });
    }
  }
  // Ninja: Wurfmesser am Brustgurt und Halfter am Oberschenkel
  if (c.kunai) for (const [x, y] of [[-0.06, 0.13], [-0.1, 0.06], [-0.14, -0.01]]) {
    A(horn3(0.08, 0.016, 4), c.kunai, { bone: BH.chest, p: [x, chestY + y, 0.2], r: [0, 0, 0.7 + Math.PI], shine: 1 });
    A(torus3(0.012, 0.004, Math.PI * 2, 3, 8), c.kunai, { bone: BH.chest, p: [x + 0.035, chestY + y + 0.035, 0.2], shine: 1 });
  }
  if (c.holster) {
    A(roundBox(0.06, 0.13, 0.04, 0.015), c.holster, { bone: BH.legL, p: [hipX + legR * 0.95, hipY - 0.1, 0.02], r: [0, 0, 0.1] });
    A(torus3(legR * 1.15, 0.01, Math.PI * 2, 4, 12), c.holster, { bone: BH.legL, p: [hipX, hipY - 0.1, 0], r: [Math.PI / 2, 0, 0] });
  }
  if (c.chestPlate) {
    A(roundBox(0.28, 0.2, 0.06, 0.04), c.chestPlate, { bone: BH.chest, p: [0, chestY + 0.07, 0.165], top: lighter(c.chestPlate, 0.25), topK: 0.3, shine: 0.8 });
    for (const sx of [-1, 1]) for (const y of [0.0, 0.12]) A(sphere3(0.014, 6, 4), c.rivet || '#e8c46a', { bone: BH.chest, p: [sx * 0.11, chestY + 0.01 + y, 0.2], shine: 1 });
  }
  if (c.straps) {
    A(roundBox(0.045, 0.5, 0.42, 0.02), c.straps, { bone: BH.chest, p: [0, chestY + 0.02, 0], r: [0, 0, 0.7] });
    if (c.crossStraps) A(roundBox(0.045, 0.5, 0.42, 0.02), c.straps, { bone: BH.chest, p: [0, chestY + 0.02, 0], r: [0, 0, -0.7] });
  }
  if (c.necklace) for (let k = -2; k <= 2; k++) A(horn3(0.06, 0.018, 5), '#f4ecd8', { bone: BH.chest, p: [k * 0.05, shY - 0.04, 0.17 - Math.abs(k) * 0.02], r: [Math.PI, 0, 0] });
  if (c.beads) for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.15 + (k / 8) * 0.7);
    A(sphere3(0.022, 7, 5), k % 2 ? c.beads : '#efe6cc', { bone: BH.chest, p: [Math.cos(a) * 0.13, neckY - 0.08 - Math.sin(a) * 0.06, 0.12 + Math.sin(a) * 0.04], shine: 0.6 });
  }
  if (c.runes) {
    A(torus3(0.055, 0.011, Math.PI * 2, 4, 14), c.runes, { bone: BH.chest, p: [0, chestY + 0.06, 0.19], mat: 'glow' });
    A(roundBox(0.012, 0.12, 0.01, 0.005), c.runes, { bone: BH.chest, p: [0, chestY + 0.06, 0.195], mat: 'glow' });
  }
  if (c.cracks) for (const [x, y, r] of [[-0.12, 0.2, 0.6], [0.1, 0.12, -0.5], [0.02, 0.3, 0.2], [-0.05, 0.05, -0.2]]) A(roundBox(0.025, 0.16, 0.03, 0.01), c.cracks, { bone: BH.chest, p: [x, hipY + y, belly ? 0.4 : 0.2], r: [0, 0, r], mat: 'glow' });
  if (c.skullBelt) {
    A(ball(10), '#e8e0cc', { bone: BH.hips, p: [0.12, hipY - 0.04, 0.17], s: [0.05, 0.05, 0.05] });
    for (const sx of [-1, 1]) A(sphere3(0.012, 6, 4), '#1a1210', { bone: BH.hips, p: [0.12 + sx * 0.018, hipY - 0.035, 0.215] });
  }
  if (c.apron) A(roundBox(0.3, 0.4, 0.025, 0.012), c.apron, { bone: BH.hips, p: [0, hipY - 0.08, 0.21], shade: 0.2 });
  // Arme, Hände (Fäustling mit Daumen), Manschetten, Schulterteile
  for (const [sx, ab, hb] of [[1, BH.armL, BH.handL], [-1, BH.armR, BH.handR]]) {
    const sh = [sx * shX, shY, 0];
    const wrist = [sx * shX, shY - armLen, 0.01];
    A(ball(10), c.sleeve || c.torso, { bone: ab, p: sh, s: [armR * 1.35, armR * 1.3, armR * 1.3] });
    if (c.wideSleeves) {
      A(lathe3('sleeve2', [[0.05, 0], [0.09, -0.08], [0.13, -0.22], [0.16, -0.29], [0.15, -0.31], [0, -0.311]], 14), c.sleeve || c.torso, { bone: ab, p: sh, shade: 0.2 });
      if (c.cuff) A(torus3(0.155, 0.018, Math.PI * 2, 4, 16), c.cuff, { bone: ab, p: [sh[0], sh[1] - 0.29, sh[2]], r: [Math.PI / 2, 0, 0], shine: 0.6 });
    } else {
      seg(sh, wrist, armR, armR * 0.85, c.sleeve || c.torso, { bone: ab, shade: 0.12 });
      // Magier (seit 8.6): schmale Ärmel mit Glockenstulpe und Silberrand
      if (c.bellCuff) {
        A(lathe3('bellcuff', [[0, -0.026], [0.09, -0.025], [0.078, 0.0], [0.058, 0.04], [0.05, 0.075]], 12), c.sleeve || c.torso, { bone: ab, p: [wrist[0], wrist[1] + 0.02, wrist[2]], shade: 0.15 });
        A(torus3(0.088, 0.011, Math.PI * 2, 4, 14), c.cuff || trim, { bone: ab, p: [wrist[0], wrist[1] - 0.004, wrist[2]], r: [Math.PI / 2, 0, 0], shine: 0.8 });
      } else A(torus3(armR * 1.0, 0.016, Math.PI * 2, 4, 12), c.cuff || trim, { bone: ab, p: [wrist[0], wrist[1] + 0.04, wrist[2]], r: [Math.PI / 2, 0, 0] });
      if (c.wraps) for (let k = 0; k < 3; k++) A(torus3(armR * 0.95, 0.011, Math.PI * 2, 4, 12), c.wraps, { bone: ab, p: [wrist[0], wrist[1] + 0.08 + k * 0.045, wrist[2]], r: [Math.PI / 2 + 0.2 * (k % 2 ? 1 : -1), 0, 0] });
      if (c.bracer) A(lathe3('bracer', [[armR * 1.0, 0], [armR * 1.08, 0.06], [armR * 1.02, 0.12], [0, 0.121]], 10), c.bracer, { bone: ab, p: [wrist[0], wrist[1] + 0.03, wrist[2]], shine: 0.8 });
    }
    if (c.armBands) for (const t of [0.3, 0.42]) A(torus3(armR * 1.05, 0.014, Math.PI * 2, 4, 12), c.armBands, { bone: ab, p: [sh[0], sh[1] - armLen * t, 0.003], r: [Math.PI / 2, 0, 0] });
    const hand = [sx * shX, shY - armLen - armR * 0.5, 0.02];
    const hs = (belly ? 1.9 : 1) * (c.gauntlets ? 1.12 : 1) * (fem ? 0.92 : man ? 1.08 : 1);
    A(ball(10), c.gloves || c.skin, { bone: hb, p: hand, s: [0.068 * hs, 0.075 * hs, 0.062 * hs] });
    A(ball(8), c.gloves || c.skin, { bone: hb, p: [hand[0] - sx * 0.05 * hs, hand[1] + 0.01, hand[2] + 0.035 * hs], s: [0.026 * hs, 0.034 * hs, 0.026 * hs] });
    if (c.gauntlets) {
      A(lathe3('gauntlet', [[armR * 1.05, 0], [armR * 1.25, 0.05], [armR * 1.15, 0.13], [0, 0.131]], 10), c.gauntlets, { bone: ab, p: [wrist[0], wrist[1] - 0.01, wrist[2]], shine: 0.9 });
      A(roundBox(0.1, 0.03, 0.05, 0.012), lighter(c.gauntlets, 0.2), { bone: hb, p: [hand[0], hand[1] + 0.03, hand[2] + 0.045], shine: 1 });
    }
    if (c.claws) for (let k = -1; k <= 1; k++) A(horn3(0.08 * hs, 0.018 * hs, 5), '#f4ecd8', { bone: hb, p: [hand[0] + k * 0.03 * hs, hand[1] - 0.06 * hs, hand[2] + 0.04], r: [Math.PI + 0.3, 0, 0] });
    if (c.pads && c.padStyle === 'leather') {
      // Ninja (seit 13.12): leichter Lederpanzer, zwei Schienen mit Naht, Riemen um den Oberarm
      pauldron3(A, ab, sh, sx, armR, { big: c.padBig, R: 0.085, slim: 0.85, col: c.pads, trim: c.padTrim || lighter(c.pads, 0.3), lames: 2, edge: darker(c.pads, 0.3), shine: 0.15 });
      A(torus3(armR * 1.08, 0.012, Math.PI * 2, 4, 12), darker(c.pads, 0.2), { bone: ab, p: [sh[0], sh[1] - 0.14, 0], r: [Math.PI / 2, 0, 0] });
    } else if (c.pads && c.padStyle === 'cloth') {
      // Schamane, Magier (seit 13.12): gesteppter Stoffpanzer in Lagen mit Borte, darunter Quasten
      const { pp } = pauldron3(A, ab, sh, sx, armR, { big: c.padBig, R: 0.105, slim: 0.88, col: c.pads, trim: c.padTrim || '#e0c36a', lames: 2, edge: c.padTrim || null, shine: 0.1, step: 0.055 });
      for (const dz of [-0.06, 0, 0.06]) {
        A(limb3(0.07, 0.005, 0.005, 3), c.padTrim || '#e0c36a', { bone: ab, p: [pp[0] + sx * 0.08, pp[1] - 0.09, dz * 0.85] });
        A(sphere3(0.014, 6, 4), '#c8402f', { bone: ab, p: [pp[0] + sx * 0.08, pp[1] - 0.17, dz * 0.85] });
      }
    } else if (c.pads && c.padStyle === 'bone') {
      // Nekromant: Schädel als Schulterstück, Knochendornen
      // seit 13.12: unter dem Schädel zwei Knochenschienen um den Oberarm
      for (let k = 0; k < 2; k++) A(torus3(armR * (1.3 - k * 0.1), 0.013, Math.PI * 1.2, 4, 14), k ? '#cfc6ad' : '#e8e0cc', { bone: ab, p: [sh[0] + sx * 0.012, sh[1] - 0.04 - k * 0.05, 0], r: [Math.PI / 2, 0, sx > 0 ? -Math.PI * 0.6 : Math.PI * 0.4], s: [1, 1, 2.3], shade: 0.2 });
      const nb = c.padBig || 1;
      const pp = [sx * shX * (1.05 + (nb - 1) * 0.12), shY + 0.05 * nb, 0];
      A(ball(10), '#e8e0cc', { bone: ab, p: pp, s: [0.1 * nb, 0.09 * nb, 0.1 * nb], shade: 0.2 });
      for (const dx of [-0.03, 0.03]) A(sphere3(0.02, 6, 4), c.padTrim || '#1a1210', { bone: ab, p: [pp[0] + dx, pp[1] + 0.01, pp[2] + 0.085], mat: c.padTrim ? 'glow' : 'lit' });
      for (const dz of [-0.05, 0.05]) A(horn3(0.12, 0.025, 5), '#ddd5bb', { bone: ab, p: [pp[0] + sx * 0.03, pp[1] + 0.06, dz], r: [0, 0, -sx * 0.6] });
    } else if (c.pads) {
      // Krieger (seit 13.12): schwerer Plattenpanzer mit Grat, Nietenrand und drei Schienen über dem Oberarm
      const ps = (belly ? 1.45 : 1) * (c.padStyle === 'plate' ? 1.22 : 1);
      const R = 0.13 * ps;
      const bk2 = c.padBig || 1;
      const pp = [sh[0] + sx * R * bk2 * (bk2 > 1 ? 0.3 : 0.12), sh[1] + R * bk2 * (bk2 > 1 ? 0.32 : 0.25), 0];
      if (c.furCollar && c.padStyle === 'plate') A(ball(10), c.furCollar, { bone: ab, p: [pp[0] - sx * 0.04, pp[1] - 0.02, pp[2]], s: [0.1 * ps, 0.06, 0.12 * ps], shade: 0.2 });
      pauldron3(A, ab, sh, sx, armR * (belly ? 1.3 : 1), { big: c.padBig, R, col: c.pads, trim: c.padTrim || lighter(c.pads, 0.25), lames: c.padStyle === 'plate' ? 3 : 2, ridge: true, rivets: c.padTrim || lighter(c.pads, 0.3), edge: c.padTrim || lighter(c.pads, 0.2), shine: 0.7, step: 0.05 * Math.min(ps, 1.3) });
      if (c.spikes && bk2 > 1.3) {
        // seit 13.36: Stachelkamm über den Grat (vorn, Mitte höher, hinten), dunkle Wurzelringe, Nietenreihe außen
        const spk = c.padTrim ? lighter(c.padTrim, 0.35) : '#d9dde2';
        for (const [dz, k] of [[-0.075, 0.8], [0, 1.15], [0.075, 0.8]]) {
          const at = [pp[0] + sx * 0.03 * bk2, pp[1] + 0.085 * bk2 - Math.abs(dz) * 0.35, dz * bk2];
          A(horn3(0.12 * ps * bk2 * k, 0.03 * ps * bk2, 6), spk, { bone: ab, p: at, r: [dz * 2.2, 0, -sx * 0.5], shine: 1 });
          A(torus3(0.03 * ps * bk2, 0.008 * bk2, Math.PI * 2, 3, 10), darker(c.pads, 0.35), { bone: ab, p: at, r: [Math.PI / 2, 0, -sx * 0.5], shine: 0.6 });
        }
        for (let k = 0; k < 5; k++) {
          const a = -0.75 + k * 0.375;
          A(sphere3(0.013 * bk2, 6, 4), spk, { bone: ab, p: [pp[0] + sx * Math.cos(a) * R * bk2 * 1.05, pp[1] - 0.02 * bk2, Math.sin(a) * R * bk2 * 1.0], shine: 1 });
        }
      } else if (c.spikes) for (const dz of [-0.05, 0.05]) A(horn3(0.13 * ps * bk2, 0.035 * ps * bk2, 6), '#d9dde2', { bone: ab, p: [pp[0] + sx * 0.04 * bk2, pp[1] + 0.08 * bk2, dz * bk2], r: [0, 0, -sx * 0.45], shine: 1 });
      if (c.padGem) A(sphere3(0.028, 8, 6), c.padGem, { bone: ab, p: [pp[0] + sx * 0.08, pp[1] + 0.02, 0.06], mat: 'glow' });
    }
    if (c.bonePads) {
      const pp = [sx * shX * 1.05, shY + 0.04, 0];
      A(ball(10), '#e8e0cc', { bone: ab, p: pp, s: [0.085, 0.08, 0.09] });
      for (const dx of [-0.025, 0.025]) A(sphere3(0.016, 6, 4), '#1a1210', { bone: ab, p: [pp[0] + dx, pp[1] + 0.01, pp[2] + 0.075] });
    }
  }
  // Kopf: runder Schädel mit vollen Wangen
  const hb = BH.head;
  A(ball(18), c.skin, { bone: hb, p: hc, s: [hr, hr * 0.93, hr * 0.96], shine: c.hair && c.hair.style === 5 ? 0.35 : 0 });
  // mit Maske sitzt das Tuch auf dem Kiefer statt darin
  const jw = c.jaw || 1;
  A(ball(14), c.skin, { bone: hb, p: [hc[0], hc[1] - hr * 0.28 * jw, hc[2] + hr * (c.masked ? 0.08 : 0.12)], s: [hr * 0.86 * jw, hr * 0.62 * jw, hr * 0.8] });
  // seit 14.53: Männer mit kantigerem Kiefer (zwei Kieferwinkel unter den Ohren)
  if (c.squareJaw && !c.masked) for (const sx of [-1, 1]) A(ball(10), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.44, hc[1] - hr * 0.46, hc[2] + hr * 0.26], s: [hr * 0.3, hr * 0.27, hr * 0.36] });
  if (!c.noEars) for (const sx of [-1, 1]) {
    if (c.pointEars) A(horn3(hr * 0.55, hr * 0.14, 6), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.9, hc[1], hc[2]], r: [0, 0, -sx * 1.25] });
    else A(ball(8), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.97, hc[1] - hr * 0.06, hc[2]], s: [hr * 0.1, hr * 0.17, hr * 0.14] });
  }
  if (c.brow) A(roundBox(hr * 1.4, hr * 0.2, hr * 0.3, hr * 0.1), c.skin, { bone: hb, p: [hc[0], hc[1] + hr * 0.12, hc[2] + hr * 0.75], shade: 0.3 });
  // Ohrringe (Frauen, seit 9.2): kleiner Goldring mit hängender Perle
  if (c.earrings && !c.noEars && c.covered !== 'hood') for (const sx of [-1, 1]) {
    A(torus3(hr * 0.07, hr * 0.022, Math.PI * 2, 4, 10), c.earrings, { bone: hb, p: [hc[0] + sx * hr * 1.0, hc[1] - hr * 0.3, hc[2]], r: [0, Math.PI / 2, 0], shine: 1 });
    A(sphere3(hr * 0.055, 8, 6), c.earrings, { bone: hb, p: [hc[0] + sx * hr * 1.0, hc[1] - hr * 0.42, hc[2]], shine: 1 });
  }
  face3(A, hb, hc, hr, Object.assign({ hairColor: c.hair ? c.hair.color : null }, c));
  if (c.beard && c.beardGlow) A(ball(12), c.beard, { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + hr * 0.42], s: [hr * 0.64, hr * 0.52, hr * 0.44], shade: 0.2, mat: 'glow' });
  else if (c.beard) beard3(A, hb, hc, hr, c.beard, c.beardKind, c.rnd || mulberry32(5));
  if (c.tusks) for (const sx of [-1, 1]) A(horn3(hr * 0.34, hr * 0.085, 6), '#f4ecd8', { bone: hb, p: [hc[0] + sx * hr * 0.3, hc[1] - hr * 0.6, hc[2] + hr * 0.78], r: [-0.25, 0, sx * 0.15], shine: 0.4 });
  if (c.hair) hair3(A, hb, hc, hr, c.hair.style, c.hair.color, typeof c.covered === 'string' ? c.covered : !!c.covered, c.rnd);
  // Magierin (seit 8.6): langer Zopf unter der Hutkrempe vorn über die linke Schulter
  if (c.braid && c.braidFront) {
    const pts = [[hr * 0.62, hc[1] - hr * 0.42, hc[2] - hr * 0.2], [shX * 0.78, shY + 0.06, 0.06], [shX * 0.72, shY - 0.06, 0.15], [shX * 0.66, shY - 0.18, 0.18], [shX * 0.62, shY - 0.3, 0.19], [shX * 0.6, shY - 0.41, 0.19]];
    for (let k = 0; k < pts.length; k++) {
      const bone = k ? BH.chest : hb;
      A(ball(8), k % 2 ? c.braid : darker(c.braid, 0.12), { bone, p: pts[k], s: [hr * (0.2 - k * 0.012), hr * 0.24, hr * (0.18 - k * 0.01)], shine: 0.25 });
    }
    const end = pts[pts.length - 1];
    A(torus3(hr * 0.1, hr * 0.035, Math.PI * 2, 4, 10), c.braidTie || '#c8402f', { bone: BH.chest, p: [end[0], end[1] - hr * 0.14, end[2]], r: [Math.PI / 2, 0, 0], shine: 0.6 });
    A(horn3(hr * 0.32, hr * 0.12, 6), c.braid, { bone: BH.chest, p: [end[0], end[1] - hr * 0.16, end[2]], r: [Math.PI, 0, 0] });
  }
  // Frauen unter Kapuze oder Helm: geflochtener Zopf hängt hinten heraus
  else if (c.braid) {
    const b0 = [hc[0], hc[1] - hr * 0.2, hc[2] - hr * 0.85];
    let prev = b0;
    for (let k = 1; k <= 4; k++) {
      const next = [hc[0] + Math.sin(k * 1.3) * 0.015, b0[1] - k * hr * 0.32, b0[2] - hr * 0.12 - k * 0.012];
      A(ball(8), k % 2 ? c.braid : darker(c.braid, 0.12), { bone: BH.cape, p: next, s: [hr * 0.17, hr * 0.2, hr * 0.17], shine: 0.25 });
      prev = next;
    }
    A(torus3(hr * 0.12, hr * 0.04, Math.PI * 2, 4, 10), '#c8402f', { bone: BH.cape, p: [prev[0], prev[1] - hr * 0.14, prev[2]], r: [Math.PI / 2, 0, 0] });
    A(horn3(hr * 0.3, hr * 0.13, 6), c.braid, { bone: BH.cape, p: [prev[0], prev[1] - hr * 0.16, prev[2]], r: [Math.PI, 0, 0] });
  }
  if (c.headgear) c.headgear(A, hb, hc, hr, spin);
  // Ausrüstung mit eigener Form je Stufe (Rüstung, Schultern, Stiefel, Gürtel, Umhang): drei-ausruestung.js
  const g = {
    hipY, chestY, shY, shX, neckY, hipX, legR, legLen, armLen, armR, hc, hr, bk, belly, female: fem, male: man, spin,
    cuirass: !!c.cuirass, greaves: !!c.greaves, footZ0, footZ1,
    beltY: c.sash ? hipY + 0.06 : hipY + (belly ? 0.06 : 0.02),
    beltZ: (c.sash ? 0.235 : c.wideBelt ? 0.228 : belly ? 0.4 : 0.212) * bk
  };
  // Magier (seit 8.6): kurzes Schultercape (Männer) mit Silberrand und Schließe, hoher steifer Stehkragen
  if (c.capelet) {
    const Wc = frame3(A, BH.chest, [0, neckY - 0.05, 0], [0, 0, 0]);
    const cs = [bk, 1, 0.9 * bk];
    Wc(lathe3('capelet', [[0, -0.171], [0.31, -0.17], [0.33, -0.165], [0.32, -0.13], [0.27, -0.04], [0.2, 0.025], [0.13, 0.05]], 20), c.capelet, { s: cs, shade: 0.25, top: lighter(c.capelet, 0.12), topK: 0.3 });
    Wc(torus3(0.325, 0.014, Math.PI * 2, 4, 24), c.collar || trim, { p: [0, -0.163, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.9 * bk, 1], shine: 0.8 });
  }
  if (c.highCollar) highCollar3(frame3(A, BH.chest, [0, 0, 0]), g, c.collar || trim, 0.13);
  if (c.accent && c.highCollar) A(G3.gem(), c.accent, { bone: BH.chest, p: [0, neckY - 0.07, 0.15 * bk], s: [0.022, 0.03, 0.016], mat: 'glow' });
  if (c.gear) c.gear(A, g);
  if (c.cape && c.capeTier != null) gearCape3(A, g, c.capeTier, c.cape, c.lining, c.capeMetal);
  // Umhang gebogen, mit Futter und Saum (Bewohner, Monster)
  else if (c.cape) {
    const cs = belly ? 1.5 : 1;
    A(capeGeo(false), c.cape, { bone: BH.cape, p: [0, shY + 0.02, 0.02], s: [cs, 1, cs], shade: 0.25 });
    A(capeGeo(true), c.lining || darker(c.cape, 0.25), { bone: BH.cape, p: [0, shY + 0.02, 0.02], s: [cs, 1, cs] });
    if (c.capeTrim) A(torus3(0.34 * cs, 0.014, 1.9, 4, 14), c.capeTrim, { bone: BH.cape, p: [0, shY - 0.66, 0.02], r: [Math.PI / 2, 0, Math.PI / 2 + 0.95 - Math.PI], shine: 0.7 });
  }
  if (c.scarf) {
    A(torus3(0.11, 0.045, Math.PI * 2, 5, 16), c.scarf, { bone: BH.chest, p: [0, neckY + 0.0, 0], r: [Math.PI / 2 - 0.1, 0, 0] });
    for (const sx of [-1, 1]) A(roundBox(0.09, 0.55, 0.022, 0.011), sx > 0 ? c.scarf : darker(c.scarf, 0.12), { bone: BH.cape, p: [sx * 0.05, shY - 0.3, -0.21], r: [0.08, 0, sx * 0.08], shade: 0.25 });
  }
  if (c.quiver && c.quiverTier != null) quiver3(A, c.quiverTier, c.quiver, chestY, !!(c.cape && c.capeTier != null && c.capeTier >= 0));
  else if (c.quiver) {
    A(lathe3('quiver2', [[0, 0], [0.065, 0], [0.075, 0.36], [0, 0.37]], 10), c.quiver, { bone: BH.chest, p: [0.1, chestY - 0.1, -0.2], r: [0, 0, -0.35] });
    for (const dx of [-0.03, 0, 0.03]) {
      A(limb3(0.12, 0.007, 0.007, 3), '#e8e0cc', { bone: BH.chest, p: [0.24 + dx, chestY + 0.38, -0.2], r: [0, 0, -0.35] });
      A(horn3(0.05, 0.02, 4), '#c8402f', { bone: BH.chest, p: [0.24 + dx, chestY + 0.36, -0.2], r: [0, 0, -0.35] });
    }
  }
  if (c.wings) for (const [sx, bone] of [[1, BH.wingL], [-1, BH.wingR]]) {
    const wx = sx * 0.12;
    A(limb3(0.6, 0.035, 0.02, 6), darker(c.wings, 0.3), { bone, p: [wx, shY - 0.02, -0.18], r: [0, 0, sx * 2.1] });
    for (const a of [0.4, 0.9]) A(limb3(0.4, 0.016, 0.01, 5), darker(c.wings, 0.3), { bone, p: [wx + sx * 0.4, shY + 0.2, -0.19], r: [0, 0, sx * (Math.PI - a)] });
    A(wingGeo(), c.wings, { bone, p: [wx, shY - 0.02, -0.2], s: [sx, 1, 1] });
  }
  if (c.tail) {
    const t0 = [0, hipY + 0.04, -0.18];
    const t1 = [0, hipY - 0.15, -0.45];
    const t2 = [0, hipY + 0.05, -0.7];
    limbBetween(A, t0, t1, 0.06, 0.045, c.tail, { bone: BH.tail });
    limbBetween(A, t1, t2, 0.045, 0.025, c.tail, { bone: BH.tail });
    A(horn3(0.14, 0.07, 4), darker(c.tail, 0.3), { bone: BH.tail, p: t2, r: [-0.6, 0, 0] });
  }
  // Waffen (das Zepter hängt seinen Kristall und den Funken an die Drehknochen)
  const wo = spin && c.weapon ? { accent: c.weapon.accent, hi: c.weapon.hi, gemBone: spin.gem, sparkBone: spin.spark } : bowStr ? {} : undefined;
  if (bowStr) wo.strBones = bowStr.bones;
  // Leuchthülle (seit 14.74 eine Kopie der Waffe, siehe wglowGeo3) nur bei Spielfiguren: Händler, Wachen und Monster
  // leuchten nie und sparen so die doppelte Waffe
  const wgOn = !!c.gear;
  if (c.weapon) weapon3(A, c.weapon.kind, c.weapon.tier, BH.handR, handR, WEAPON_HOLD[c.weapon.kind] || [1.1, 0, 0], wgOn, wo);
  // Klingenachse im Modellraum merken (Ansatz und Spitze, für Waffen-Auren in 3D seit 13.2)
  let weaponAxis = null;
  if (c.weapon) {
    const M = partFrame(handR, WEAPON_HOLD[c.weapon.kind] || [1.1, 0, 0]);
    const wl = WEAPON_LEN3[c.weapon.kind] || 0.6;
    weaponAxis = { base: new THREE.Vector3(0, 0.02, 0).applyMatrix4(M), tip: new THREE.Vector3(0, wl, 0).applyMatrix4(M) };
  }
  // Nebenhand-Waffe (seit 13.90 mit Leuchthülle und eigener Klingenachse: Waffenauren wie die Schwertaura lassen
  // bei zwei Schwertern oder zwei Äxten beide Waffen leuchten, vorher nur die rechte)
  let offhandAxis = null;
  if (c.offhand) {
    const h = WEAPON_HOLD[c.offhand.kind] || [1.1, 0, 0];
    const rotL = [h[0], -h[1], -h[2]];
    weapon3(A, c.offhand.kind, c.offhand.tier, BH.handL, handL, rotL, wgOn, { left: true });
    const M = partFrame(handL, rotL);
    const wl = WEAPON_LEN3[c.offhand.kind] || 0.6;
    offhandAxis = { base: new THREE.Vector3(0, 0.02, 0).applyMatrix4(M), tip: new THREE.Vector3(0, wl, 0).applyMatrix4(M) };
  }
  if (c.shield != null) shield3(A, c.shield, BH.handL, [shX + 0.1, shY - armLen * 0.6, 0.06], c.shieldItem);
  let top = hc[1] + hr * (c.hair && c.hair.style === 1 ? 1.3 : 1.05);
  if (c.tall) top += c.tall;
  // seit 14.53: Körperform als sanfte Verformung über Rumpf UND allem, was darauf sitzt (Rüstung, Mantel, Gürtel,
  // Harnisch) – so passt jede Rüstungsstufe ohne Durchstechen, weil alle Schichten gleich mitgehen
  if ((fem || man) && b.lists) {
    const warp = bodyWarp3(fem, hipY, chestY, bk);
    for (const k in b.lists) if (k !== 'shadow') for (const it of b.lists[k]) if (!it.tpl && (it.bone === BH.chest || it.bone === BH.hips)) it.warp = warp;
  }
  return { rig, height: top, scale: c.figScale || 1, family: 'human', shY, hipY, shX, hc, hr, belly, weaponAxis, offhandAxis, spin: spin && spin.anim, sparkBone: spin && spin.spark != null ? spin.spark : -1, sparkOff: spin && spin.sparkOff, bowStr };
}

// Bereitschaftspose fürs Bild der Figur (seit 13.22): Waffe in der Hand, deutlich zu sehen, nie hängend.
// Werte: Arm (rx vor/zurück, rz seitlich), Hand (wx Klinge kippen, wz drehen), dazu Brust und Hüfte.
const READY_POSE3 = {
  sword: { r: [-0.5, 0, -0.28], hr: [0.05, 0, 0.12], l: [-0.3, 0, 0.18] },
  axe: { r: [-0.5, 0, -0.28], hr: [0.05, 0, 0.12], l: [-0.3, 0, 0.18] },
  greatsword: { r: [-0.85, 0, 0.3], hr: [0.3, 0, 0], l: [-0.9, 0, -0.38], cy: 0.18 },
  greataxe: { r: [-0.5, 0, -0.28], hr: [0.05, 0, 0.12], l: [-0.3, 0, 0.18] },
  dagger: { r: [-0.55, 0, -0.38], hr: [-0.9, 0, 0], l: [-0.55, 0, 0.38], hl: [-0.9, 0, 0] },
  bow: { r: [-0.38, 0, -0.14], hr: [0, 0, 0], l: [-0.2, 0, 0.12] },
  fan: { r: [-0.95, 0, -0.25], hr: [0.25, 0, 0], l: [-0.15, 0, 0.12] },
  bell: { r: [-0.85, 0, -0.2], hr: [-1.15, 0, 0], l: [-0.15, 0, 0.12] },
  rod: { r: [-0.6, 0, -0.18], hr: [0.38, 0, 0], l: [-0.25, 0, 0.14] },
  staff: { r: [-0.45, 0, -0.16], hr: [0.23, 0, 0], l: [-0.2, 0, 0.12] },
  scythe: { r: [-0.45, 0, -0.16], hr: [0.15, 0, 0], l: [-0.2, 0, 0.12] }
};
function readyPose3(B, who) {
  const kind = weaponKindOf(who);
  const P = READY_POSE3[kind];
  if (!P) return;
  B[BH.armR].rotation.set(P.r[0], P.r[1], P.r[2]);
  if (P.hr) B[BH.handR].rotation.set(P.hr[0], P.hr[1], P.hr[2]);
  const shield = who.equipment && who.equipment.schild && !isOffhand(who.equipment.schild) && !isQuiver(who.equipment.schild);
  // Schild: vor den Körper gehoben
  if (shield) B[BH.armL].rotation.set(-0.7, 0, 0.12);
  else if (P.l) B[BH.armL].rotation.set(P.l[0], P.l[1], P.l[2]);
  if (P.hl) B[BH.handL].rotation.set(P.hl[0], P.hl[1], P.hl[2]);
  if (P.cy) B[BH.chest].rotation.y = P.cy;
  // Bogen (seit 14.20) wie im Spiel getragen: Wurfarme schräg nach vorn und hinten, Sehne oben zur Figur
  if (kind === 'bow') bowCarry3(B, 'stand');
}

// Köcher der Spieler (seit 13.20): schräg auf dem Rücken, Beschläge und Pfeilfedern in der Farbe der Munition
// seit 13.62 mit Umhang: sitzt außen auf dem Tuch und hängt am Umhangknochen, damit beide zusammen schwingen
// und der Köcher nicht mehr im Umhang steckt
function quiver3(A, tier, leather, chestY, onCape = false) {
  const arrow = QUIVER_ARROWS[tier].color;
  // Beschläge: Gold ab Himmel, seit 13.53 Leerenstahl (Abgrund) bzw. Roségold (Ewigkeit)
  const trim = tier === 0 ? '#4a301c' : tier === 8 ? '#6e5cc0' : tier === 9 ? ROSEGOLD3 : tier >= 6 ? GOLD3 : TIER_METAL[tier];
  const M = onCape ? partFrame([0.1, chestY - 0.13, -0.385], [-0.05, 0, -0.42]) : partFrame([0.1, chestY - 0.16, -0.22], [0.12, 0, -0.42]);
  const W = framed(A, M, onCape ? BH.cape : BH.chest);
  W(lathe3('quiver3', [[0, 0], [0.07, 0], [0.085, 0.2], [0.09, 0.42], [0, 0.43]], 12), leather, {});
  W(torus3(0.09, 0.016, Math.PI * 2, 5, 14), trim, { p: [0, 0.42, 0], r: [Math.PI / 2, 0, 0], shine: 0.8 });
  W(torus3(0.072, 0.014, Math.PI * 2, 5, 14), trim, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], shine: 0.8 });
  if (tier >= 2) W(torus3(0.087, 0.009, Math.PI * 2, 4, 14), trim, { p: [0, 0.22, 0], r: [Math.PI / 2, 0, 0], shine: 0.8 });
  if (tier >= 4) W(G3.gem(), arrow, { p: [0, 0.22, -0.09], s: [0.03, 0.04, 0.02], mat: 'glow' });
  // Pfeile: Schaft, zwei Federn, Spitze nach oben (die Spitzen stecken eigentlich unten, so liest man aber die Munition)
  const n = tier >= 3 ? 5 : 4;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.4;
    const x = Math.cos(a) * 0.04;
    const z = Math.sin(a) * 0.04;
    // seit 13.67 kürzer aus dem Köcher (wirkten wie Speere)
    const h = 0.48 + (k % 2) * 0.03;
    W(limb3(h - 0.4, 0.006, 0.006, 3), '#d9c79a', { p: [x, h, z] });
    for (const fr of [0, Math.PI / 2]) W(roundBox(0.05, 0.08, 0.004, 0.002), k % 2 ? darker(arrow, 0.2) : arrow, Object.assign({ p: [x, h - 0.04, z], r: [0, fr, 0] }, tier >= 5 ? { mat: 'glow' } : {}));
  }
}

// Drehknochen (seit 8.6): Teile, die schweben und sich drehen (Zepterkristall mit Funke, Runenring um die
// Taille, Siegelring im Rücken, Stern oder Kristalle am Hut), sind gebacken wie alles andere, hängen aber an
// einem eigenen Knochen, den syncPlayer3 dreht – kein eigenes Mesh, kein neuer Shader, nichts je Bild neu.
// anim: [Knochen, Achse (0 x, 1 y, 2 z), Drehtempo, Wippen]
const ROD3_GEM_Y = 0.97;
const ROD3_SPARK_R = 0.095;
function spinBones3(c, list, m) {
  const out = { anim: [] };
  const add = (key, pos, parent, axis, speed, bob = 0) => {
    out[key] = list.length;
    list.push([pos, parent]);
    out.anim.push([out[key], axis, speed, bob]);
  };
  if (c.weapon && c.weapon.kind === 'rod') {
    const M = partFrame(m.handR, WEAPON_HOLD.rod);
    const at = new THREE.Vector3(0, ROD3_GEM_Y, 0).applyMatrix4(M);
    const sp = new THREE.Vector3(ROD3_SPARK_R, ROD3_GEM_Y, 0).applyMatrix4(M).sub(at);
    add('gem', [at.x, at.y, at.z], BH.handR, 1, 1.2, 0.012);
    add('spark', [at.x, at.y, at.z], BH.handR, 1, -3.4, 0.022);
    out.sparkOff = [sp.x, sp.y, sp.z];
  }
  if (c.spinRing === 'waist') add('ring', [0, m.hipY + 0.07, 0], BH.hips, 1, 0.5);
  else if (c.spinRing === 'back') add('ring', [0, m.shY - 0.04, -0.34], BH.chest, 2, 0.35);
  if (c.spinHat) add('hat', [m.hc[0], m.hc[1] + m.hr * c.spinHat[0], m.hc[2] + m.hr * c.spinHat[1]], BH.head, 1, c.spinHat[2] || 0.9);
  return out.anim.length ? out : null;
}

// Haltung der Waffe in der Hand (Drehung des Griffs)
// ungefähre Länge der Waffe ab der Hand entlang +y im Haltungsrahmen (Klinge, Kopf, Stab)
const WEAPON_LEN3 = { sword: 0.72, greatsword: 1.05, dagger: 0.38, axe: 0.62, greataxe: 0.95, club: 0.6, scythe: 1.1, staff: 1.0, skullstaff: 1.0, rod: 0.7, fan: 0.35, bell: 0.3, bow: 0.5 };
// Winkel der Hand, bei dem die Glocke senkrecht hängt (Armwinkel wird ausgeglichen)
let BELL_HANG3 = -2.0;
let BELL_ARM3 = -0.8;
// Axtkopf um den Stiel drehen (seit 13.48): Schneide nach vorn statt zur Seite
let AXE_TWIST3 = -Math.PI / 2;
// Bogen (seit 13.67 um die eigene Achse gedreht): der Griff zeigt nach vorn (zum Ziel), die Wurfarme biegen sich vom
// Schützen weg und die Sehne liegt zum Körper hin. Vorher stand der Bogen quer, Sehne außen, Arme zum Körper gebogen.
const BOW_HOLD3 = [0.2, -Math.PI / 2, 0];
// Knochen der Sehne: an beiden Spitzen des Bogens (Kinder der rechten Hand). Gibt Knochennummern, Ruhevektor
// Spitze → Mitte der Sehne je Hälfte (Modellraum) und den Griff relativ zum Handknochen zurück
function bowStringBones3(tier, handR, bones) {
  const L = BOW_LIMBS[Math.max(0, Math.min(BOW_LIMBS.length - 1, tier || 0))];
  const tip = L.pts[L.pts.length - 1];
  const M = partFrame(handR, BOW_HOLD3);
  const top = new THREE.Vector3(tip[0], tip[1], 0).applyMatrix4(M);
  const bot = new THREE.Vector3(tip[0], -tip[1], 0).applyMatrix4(M);
  const mid = new THREE.Vector3(tip[0], 0, 0).applyMatrix4(M);
  const hb = bones[BH.handR][0];
  const out = { bones: [bones.length, bones.length + 1], v: [mid.clone().sub(top).toArray(), mid.clone().sub(bot).toArray()], grip: [handR[0] - hb[0], handR[1] - hb[1], handR[2] - hb[2]] };
  bones.push([top.toArray(), BH.handR], [bot.toArray(), BH.handR]);
  return out;
}
// Bogen tragen (seit 14.20) in Ruhe, beim Gehen und auf dem Pferd: Griff mittig in der Faust, der obere Wurfarm zeigt
// schräg nach vorn oben, der untere nach hinten unten, die Sehne liegt oben zur Figur hin. Vorher hing der Bogen
// senkrecht neben dem Bein, steckte unten im Boden und oben in der Kapuze. Die Richtung des Bogens gilt im Rahmen der
// Hüfte; die Hand dreht so weit, dass Brust- und Armbewegung ausgeglichen werden (der Bogen schwankt beim Gehen nicht
// wild mit). up: Richtung des oberen Wurfarms, str: Richtung vom Griff zur Sehne (x zur Figur, y hoch, z nach vorn).
// Beim Schuss dreht bowString3 die Hand aus dieser Haltung weich aufs Ziel und am Ende wieder zurück.
const BOW_CARRY3 = {
  stand: { arm: [-0.22, 0, -0.2], up: [0.02, 0.62, 1], str: [0.55, 1, -0.25] },
  walk: { arm: [-0.18, 0, -0.22], up: [0, 0.5, 1], str: [0.55, 1, -0.2], swing: 0.12 },
  ride: { arm: [-0.75, 0, -0.32], up: [0.12, 1, 0.42], str: [0.35, 0.1, -1] }
};
const _bcX = new THREE.Vector3();
const _bcY = new THREE.Vector3();
const _bcZ = new THREE.Vector3();
const _bcM = new THREE.Matrix4();
const _bcQ = new THREE.Quaternion();
const _bcP = new THREE.Quaternion();
let _bcHoldInv = null;
function bowCarry3(B, mode, w = 0) {
  const C = BOW_CARRY3[mode];
  const sw = C.swing ? Math.sin(w) : 0;
  B[BH.armR].rotation.set(C.arm[0] + sw * (C.swing || 0), C.arm[1], C.arm[2]);
  // Achsen des Bogens: y oberer Wurfarm, x Bauch (von der Sehne weg), z senkrecht zur Bogenebene
  _bcY.set(C.up[0], C.up[1] + sw * 0.08, C.up[2]).normalize();
  _bcX.set(-C.str[0], -C.str[1], -C.str[2]);
  _bcX.addScaledVector(_bcY, -_bcX.dot(_bcY)).normalize();
  _bcZ.crossVectors(_bcX, _bcY);
  _bcQ.setFromRotationMatrix(_bcM.makeBasis(_bcX, _bcY, _bcZ));
  if (!_bcHoldInv) _bcHoldInv = new THREE.Quaternion().setFromEuler(new THREE.Euler(...BOW_HOLD3)).invert();
  _bcP.copy(B[BH.chest].quaternion).multiply(B[BH.armR].quaternion).invert();
  B[BH.handR].quaternion.copy(_bcP).multiply(_bcQ).multiply(_bcHoldInv);
}
const WEAPON_HOLD = {
  sword: [0.45, 0, 0.5], greatsword: [0.35, 0, 0.42], dagger: [-1.35, 0, 0.6], bow: BOW_HOLD3, fan: [0.7, 0, 0.3],
  bell: [2.0, 0, 0], staff: [0.22, 0, 0.08], skullstaff: [0.22, 0, 0.08], scythe: [0.3, 0, 0.1], axe: [0.6, 0, 0.45], greataxe: [0.6, 0, 0.45], club: [0.6, 0, 0.45],
  rod: [0.22, 0, 0.08]
};
// Handgelenk im Schlag (seit 13.85): In der Haltung oben zeigt die Klinge bei hängendem Arm nach oben (Ruhe), also
// zurück zur Schulter. Ohne Handgelenk zeigte sie darum bei jedem Hieb, Stich und Stoß nach hinten über die Schulter
// statt zum Ziel. Um so viel dreht die Hand (rotation.x) die Waffe nach vorn, dass sie den Arm leicht angewinkelt
// verlängert – für Hiebwaffen und Stäbe; Dolche (Rückhandgriff), Bogen, Fächer, Glocke und Zepter haben eigene Haltungen.
const WRIST_KINDS3 = new Set(['sword', 'axe', 'greatsword', 'greataxe', 'scythe', 'staff']);
function wristExt3(kind) {
  return WRIST_KINDS3.has(kind) ? Math.PI - 0.35 - WEAPON_HOLD[kind][0] : 0;
}
// Handgelenk in Ruhe und beim Gehen (seit 13.85): Schwert und Axt leicht nach vorn gekippt, damit man sie aus der
// Spielkamera als Waffe in der Hand sieht (vorher stand die Klinge senkrecht am Körper und wirkte von oben wie ein
// Klotz an der Hüfte); Schlag-Posen beginnen und enden mit diesem Wert, damit nichts springt
const IDLE_WRIST3 = { sword: 1.0, axe: 0.7, greatsword: 0.9, greataxe: 0.5 };

// --- Spielerfiguren ---------------------------------------------------------------------------------

function playerKey3(p) {
  const eq = p.equipment || {};
  // seit 14.59 mit der Farbvariante jedes Teils (gearHueKey, figuren.js)
  const t = (it) => (it ? it.tier + ':' + (it.kind || '') + ':' + plusBand(it.plus || 0) + gearHueKey(it) : '-');
  const key = [p.classId, JSON.stringify(p.look || {}), t(eq.waffe), t(eq.ruestung), t(eq.helm), t(eq.schild), t(eq.schuhe), t(eq.guertel), t(eq.schultern), t(eq.umhang), weaponKindOf(p)].join('|');
  // Magier (seit 8.6): Kristall, Hutband und Runen tragen die Farbe des Elements (Weg)
  return p.classId === 'magier' ? key + '|' + (p.path ?? 'a') : key;
}

// Bart der Männer (LOOKS.beard): Keiner, Kurz, Vollbart, Zopfbart, Schnurrbart
const BEARD3 = [null, 'short', 'long', 'braid', 'mustache'];

function playerConfig3(p) {
  const L = playerLook(p);
  const ap = lookOf(L, p.classId);
  const eq = p.equipment || {};
  const kind = weaponKindOf(p);
  const wtier = eq.waffe ? eq.waffe.tier : 0;
  const gt = (k) => (L[k] == null ? -1 : L[k]);
  // seit 14.59: jedes Teil in seiner eigenen Farbvariante (gearCol, figuren.js) – niedrige Stufen bunt gemischt,
  // hohe Stufen und Sets passend; m = Metallton (Beschläge, Platten), sonst Stoff/Leder
  const tA = (col, m) => gearCol(eq.ruestung, col, m);
  const tH = (col, m) => gearCol(eq.helm, col, m);
  const tS = (col, m) => gearCol(eq.schultern, col, m);
  const tB = (col, m) => gearCol(eq.schuhe, col, m);
  const tG = (col, m) => gearCol(eq.guertel, col, m);
  const tU = (col, m) => gearCol(eq.umhang, col, m);
  const c = {
    skin: skinOf(ap), eyeColor: eyeOpts(ap).color, eyeShape: ap.eyes || 0, mark: ap.mark || 0, female: ap.sex === 1, male: ap.sex === 0,
    hair: { style: ap.hair || 0, color: hairOf(ap) },
    weapon: { kind, tier: wtier }, boots: gt('b') >= 0 ? tB(GEAR_LOOK.boots[gt('b')]) : '#4d3527',
    bootTrim: gt('b') >= 3 ? tB(TIER_METAL[gt('b')], true) : null,
    belt: gt('g') >= 0 ? tG(GEAR_LOOK.belt[gt('g')]) : '#3a2618'
  };
  // Schultern, Umhang: Grundform hier, das Merkmal der Stufe baut drei-ausruestung.js
  if (gt('s') >= 0) {
    c.pads = tS(GEAR_LOOK.plate[gt('s')], true);
    c.padTrim = tS(TIER_METAL[gt('s')], true);
    // seit 13.17: angelegte Schultern deutlich größer und mit hellem Rand, damit man sie von oben erkennt
    c.padBig = pauldronBig(p.classId);
    if (p.classId === 'krieger') c.spikes = true;
  }
  const capeT = eq.umhang ? eq.umhang.tier : -1;
  if (capeT >= 0) {
    c.cape = tU(GEAR_LOOK.cape[capeT]);
    c.lining = tU(GEAR_LOOK.lining[capeT]);
    c.capeMetal = tU(TIER_METAL[capeT], true);
    c.capeTier = capeT;
  }
  if (eq.schild) {
    if (isOffhand(eq.schild)) c.offhand = { kind: eq.schild.kind, tier: eq.schild.tier };
    else if (isQuiver(eq.schild)) c.quiverTier = eq.schild.tier;
    else {
      c.shield = eq.schild.tier;
      c.shieldItem = eq.schild;
    }
  }
  // Männer ohne Wangenröte und etwas breiter, Frauen mit Zopf unter Kapuze und Helm
  if (ap.sex === 0) { c.blush = false; c.bulk = 1.05; }
  if (p.classId === 'krieger') {
    const A0 = ARMOR_LOOK.krieger;
    // Göttlich (seit 14.59 in 3D): weinroter Waffenrock unter dem Gold, damit die Platten Kontrast haben
    const crimson = L.a === 7 ? tA('#6e2630') : tA(lookColor(A0.torso, L.a, '#9c3b33'));
    const brass = tA(lookColor(A0.trim, L.a, '#c9a35a'), true);
    // Krieger: kräftig, Platte über Brust und Beinen, schwere Schultern, Fell und Wickelbänder (barbarisch)
    const plate = L.a >= 0 ? tA(GEAR_LOOK.plate[L.a], L.a >= 1) : '#8a6a4a';
    const rim = L.a >= 0 ? tA(TIER_METAL[L.a], true) : '#c9a35a';
    const fur = L.a === 9 ? '#ece8f0' : L.a === 8 ? '#1a1424' : L.a >= 5 ? '#3a3230' : L.a >= 3 ? '#5a4030' : '#8a6a4a';
    Object.assign(c, {
      bulk: ap.sex === 1 ? 1.03 : 1.1, torso: crimson, sleeve: darker(crimson, 0.18), skirt: darker(crimson, 0.1), flap: darker(crimson, 0.25), pants: '#3b2d25', gloves: '#5a4030',
      buckle: brass, collar: brass, cuff: brass, rivet: brass, padStyle: 'plate', furCollar: fur, furBoots: gt('b') < 1 ? fur : null, wideBelt: true,
      tassets: plate, tassetRim: rim, kneePads: L.a >= 1 ? rim : null, armBands: '#4a3020'
    });
    if (L.a >= 1) { c.cuirass = plate; c.cuirassRim = rim; } else c.lamellar = darker(crimson, 0.05);
    if (L.a >= 2) { c.greaves = plate; c.bracer = rim; } else c.legWraps = '#5a4030';
    if (L.a >= 3) { c.gauntlets = plate; c.greaveSpike = rim; }
    if (!c.pads) { c.pads = plate; c.padTrim = rim; c.spikes = L.a >= 3; }
    if (L.h !== -2) {
      c.headgear = kriegerHelm3(L.h, tH(lookColor(A0.helm, L.h, '#8f98a3'), L.h >= 1), tH(lookColor(A0.crest, L.h, '#c8402f')), tH(lookColor(A0.trim, L.h, '#c9a35a'), true));
      c.covered = true;
    }
    if (ap.sex === 1 && c.covered) c.braid = hairOf(ap);
  } else if (p.classId === 'ninja') {
    const A0 = ARMOR_LOOK.ninja;
    const torso = tA(lookColor(A0.torso, L.a, '#312c3d'));
    const scarf = tA(lookColor(A0.scarf, L.a, '#6b4f9a'));
    // Ninja: nur Stoff und Leder – weite gebundene Hose, Wickelbänder, Ledergurte mit Wurfmessern, keine Platten
    const leather = L.a === 9 ? '#b88a80' : L.a >= 4 ? '#2a2026' : '#4a3a2a';
    Object.assign(c, {
      torso, sleeve: darker(torso, 0.1), skirt: darker(torso, 0.15), flap: scarf, pants: darker(torso, 0.1), gloves: '#3d3848', scarf, straps: leather, crossStraps: true,
      eyeShape: 1, narrow: true, blush: false, noMouth: true, wraps: '#cdc8dc', collar: scarf, cuff: scarf, pouch: leather,
      baggy: true, legWraps: '#cdc8dc', tabi: true, kunai: L.a >= 0 ? TIER_METAL[Math.max(0, L.a)] : '#c7ccd3', holster: leather, padStyle: 'leather'
    });
    if (c.pads) { c.pads = mixColor(c.pads, leather, 0.6); c.padTrim = scarf; }
    // Köcher auf dem Rücken nur, wenn einer angelegt ist (seit 13.20 eigener Gegenstand), in seiner Stufe
    if (kind === 'bow' && c.quiverTier != null) c.quiver = QUIVER_LEATHER[c.quiverTier];
    c.headgear = ninjaHelm3(L.h, tH(lookColor(A0.hood, L.h, '#2a2633')), scarf);
    c.covered = true;
    if (ap.sex === 1) c.braid = hairOf(ap);
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
    if (NINJA_EYES3[L.h]) c.glowEyes = NINJA_EYES3[L.h];
  } else if (p.classId === 'schamane') {
    const A0 = ARMOR_LOOK.schamane;
    const robe = tA(lookColor(A0.robe, L.a, '#2c6f6a'));
    const gold = tA(lookColor(A0.gold, L.a, '#e0c36a'), true);
    Object.assign(c, { torso: robe, sleeve: robe, robe, hemTrim: gold, wideSleeves: true, cuff: gold, collar: gold, gloves: c.skin, buckle: gold, sash: '#c8402f', beads: '#7a3a2a', belt: null, padStyle: 'cloth' });
    if (c.pads) { c.pads = mixColor(c.pads, robe, 0.55); c.padTrim = gold; }
    c.headgear = shamanHelm3(L.h, tH(lookColor(A0.band, L.h, gold)), tH(gold, true));
    // Seidenhaube bedeckt das Haar; Stirnband und Kronen lassen es frei, ohne dass etwas oben durchsticht (13.22)
    if (L.h === 1) { c.covered = true; if (ap.sex === 1) c.braid = hairOf(ap); }
    else if (L.h !== -2) c.covered = 'band';
  } else if (p.classId === 'magier') {
    // Magier (seit 8.6): Indigo und Silber, hoher Stehkragen, Glockenstulpen, spitzer Krempenhut; die Farbe des
    // Elements nur an Kristall, Hutband, Runen und Schließen. Männer mit Schultercape, Frauen mit Korsage und Zopf vorn.
    const A0 = ARMOR_LOOK.magier;
    const E = mageEl(p);
    const robe = tA(lookColor(A0.robe, L.a, '#283070'));
    const silver = tA(lookColor(A0.trim, L.a, '#d8e0f0'), true);
    Object.assign(c, {
      torso: robe, sleeve: darker(robe, 0.08), robe, wideSleeves: false, bellCuff: true, cuff: silver, hemTrim: silver,
      collar: silver, highCollar: true, gloves: c.skin, buckle: silver, belt: gt('g') >= 0 ? c.belt : '#2a2230', sash: false, padStyle: 'cloth',
      robeShine: 0.15, accent: E.main, accentHi: E.hi, glyph: E.glyph
    });
    c.weapon.accent = E.main;
    c.weapon.hi = E.hi;
    if (ap.sex === 0) c.capelet = darker(robe, 0.04);
    else c.bulk = 0.97;
    if (c.pads) { c.pads = mixColor(c.pads, robe, 0.6); c.padTrim = silver; }
    // Stufe 0 ohne Gürtel: Strickgürtel aus der Rüstung (drei-ausruestung.js)
    if (L.a === 0 && gt('g') < 0) c.belt = null;
    const hat = L.h !== -2 && L.h !== 7;
    c.headgear = magierHelm3(L.h, tH(lookColor(A0.hat, L.h, '#283070')), tH(silver, true), E.main, { tilt: ap.sex === 1 ? 0.08 : 0, glyph: E.glyph });
    c.covered = hat ? 'hat' : false;
    if (hat) c.tall = 0.36;
    // Drehknochen: Runenring um die Taille (Arkanrobe), Siegelring im Rücken (Erzmagier), Stern, Siegel, Kristalle am Hut;
    // seit 13.53 kreisen Leerensplitter (Abgrund) und Sterne (Ewigkeit) um Taille und Hut
    c.spinRing = L.a === 4 || L.a >= 8 ? 'waist' : L.a === 7 ? 'back' : null;
    c.spinHat = L.h === 4 ? [2.9, -0.15, 1.4] : L.h === 6 ? [1.15, -0.12, 1.1] : L.h === 7 ? [1.05, 0, 0.7] : L.h === 8 ? [1.5, -0.1, 0.8] : L.h === 9 ? [1.3, -0.1, 0.9] : null;
    if (ap.sex === 1) {
      c.braid = hairOf(ap);
      c.braidFront = true;
      c.braidTie = silver;
    }
  } else {
    const A0 = ARMOR_LOOK.nekromant;
    const robe = tA(lookColor(A0.robe, L.a, '#334a31'));
    Object.assign(c, { torso: robe, sleeve: darker(robe, 0.12), robe, tattered: true, wideSleeves: true, gloves: c.skin, runes: '#a7e37f', blush: false, skullBelt: true, collar: darker(robe, 0.3), padStyle: 'bone' });
    if (c.pads) c.padTrim = gt('s') >= 3 ? lookColor(A0.glow, L.h, '#a7e37f') : null;
    else c.bonePads = true;
    c.headgear = nekroHelm3(L.h, tH(lookColor(A0.hood, L.h, '#2a3b28')), lookColor(A0.glow, L.h, '#a7e37f'));
    c.covered = 'hood';
    if (ap.sex === 1) c.braid = hairOf(ap);
    c.glowEyes = lookColor(A0.glow, L.h, '#a7e37f');
    c.angry = false;
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
  }
  // Aussehen (seit 9.2): Helm/Kapuze ausblendbar, damit man die Frisur sieht; Männer mit Bart, breiter und kantiger,
  // Frauen schmaler mit Ohrringen und langem Haar unter dem Helm
  if (ap.helm === 0) {
    c.headgear = null;
    c.covered = false;
    c.braid = null;
    c.braidFront = false;
    delete c.tall;
    c.glowEyes = null;
    if (p.classId === 'ninja') c.noMouth = false;
    c.hair = { style: ap.hair || 0, color: hairOf(ap) };
  }
  const mask = p.classId === 'ninja' && ap.helm !== 0;
  // seit 13.18: Spielfiguren größer und erwachsener – kleinerer Kopf, längere Beine und Arme (docs/charakter-design-v2.md)
  // seit 14.53: gewählte Körpergröße (look.gr, 90–110 %); Reittier, Drache und Namensschild richten sich nach model.scale
  c.figScale = 1.14 * lookSize(ap);
  c.headR = ap.sex === 0 ? 0.265 : 0.272;
  c.legLen = 0.44;
  c.armLen = 0.35;
  if (ap.sex === 0) {
    c.bulk = Math.max(c.bulk || 1, 1.1);
    c.jaw = 1.16;
    c.squareJaw = true;
    const kind = BEARD3[ap.bart == null ? 1 : ap.bart];
    if (kind && !mask) {
      c.beard = darker(hairOf(ap), 0.04);
      c.beardKind = kind;
    }
  } else {
    c.bulk = Math.min(c.bulk || 1, 0.96);
    c.earrings = '#e8c46a';
    // seit 14.53: weicheres, schmaleres Kinn; Schulterstücke etwas kleiner, damit die schmaleren Schultern sichtbar bleiben
    c.jaw = 0.94;
    if (c.pads) {
      const pb = c.padBig || 1;
      c.padBig = pb > 1.3 ? Math.max(1.31, pb * 0.9) : pb * 0.9;
    }
  }
  // Stufenmerkmale: Rüstung (Grundform umstellen), dann alle Teile nach dem Körper
  armorLook3(c, p.classId, L.a, tA);
  c.noBuckle = gt('g') >= 0;
  c.tame = true;
  if (gt('b') >= 0) c.bootDetail = gt('b');
  c.gear = gearAll3(p.classId, {
    a: L.a, s: gt('s'), b: gt('b'), g: gt('g'),
    ms: gt('s') >= 0 ? tS(TIER_METAL[gt('s')], true) : null, mb: gt('b') >= 0 ? tB(TIER_METAL[gt('b')], true) : null,
    mg: gt('g') >= 0 ? tG(TIER_METAL[gt('g')], true) : null, cb: c.boots
  }, c);
  return c;
}

// --- Vierbeiner (Hunde, Wölfe, Eber, Bären, Drachen) ---------------------------------------------------
// Tiefe Brust, schmale Hüfte, Hals, Kopf mit Schnauze und Unterkiefer, Ohren mit hellem Innenteil,
// Fellbüschel, Beine mit Gelenk und Pfoten mit Zehen, buschiger Schwanz aus Gliedern.
// Seit 7.9: zweifarbiges Fell (Rücken dunkler, Bauch heller), Mähne als Büschelkranz, Büschel an Nacken
// und Schwanzspitze, Tieraugen mit Glanzpunkt; Besonderheiten einzelner Arten kommen aus MON3_LOOK.

// schlichter Quader (12 Dreiecke) für dünne Leisten, Risse, Runen; Größe über s
const box3 = () => geo3('box1', () => new THREE.BoxGeometry(1, 1, 1));

// Teil so drehen, dass seine +y-Achse von p aus in Richtung d zeigt (Büschel, Zacken, Pfeile)
const _up3 = new THREE.Vector3(0, 1, 0);
function pointAt3(A, geo, color, p, d, o = {}) {
  const q = new THREE.Quaternion().setFromUnitVectors(_up3, new THREE.Vector3(...d).normalize());
  const s = o.s == null ? 1 : o.s;
  A(geo, color, Object.assign({}, o, { m: new THREE.Matrix4().compose(new THREE.Vector3(...p), q, new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s]))) }));
}

function beast3(b, o, P) {
  const A = adder(b, P);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const tuft = (len, r, color, p, d, x) => pointAt3(A, horn3(len, r, 5), color, p, d, Object.assign({ noShadow: true }, x));
  const bulky = !!o.bulky;
  const boar = !!o.tusk && !o.wings && o.small;
  // lean: schlanke Hunde, Wölfe, Füchse (lange Läufe, schmaler Leib); cat: Katzen mit rundem Kopf
  const lean = !!(o.lean || o.cat);
  const legLen = bulky ? 0.3 : boar ? 0.28 : lean ? 0.42 : 0.36;
  const bodyY = legLen + 0.2;
  const len = o.long || 0.44;
  const hp = [0, bodyY + 0.2, len + 0.2];
  const fur = o.fur;
  const dark = darker(fur, 0.22);
  const belly = o.belly || lighter(fur, 0.2);
  // zweifarbiges Fell: nach oben zeigende Flächen nehmen die dunklere Rückenfarbe an, der Bauch bleibt hell
  const back = o.back || darker(fur, 0.3);
  const coat = (x) => Object.assign({ top: back, topK: o.backK || 0.55, shade: 0.25 }, x);
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.16, len + 0.18], 1],
    [[0.15, bodyY - 0.05, len * 0.62], 1], [[-0.15, bodyY - 0.05, len * 0.62], 1], [[0.15, bodyY - 0.05, -len * 0.62], 1], [[-0.15, bodyY - 0.05, -len * 0.62], 1],
    [[0, bodyY + 0.08, -len * 0.95], 1], [[0.14, bodyY + 0.2, 0.05], 1], [[-0.14, bodyY + 0.2, 0.05], 1], [[0, bodyY + 0.1, len * 0.7], 1],
    [[0, hp[1] - 0.06, hp[2] + 0.06], 2]
  ]);
  const bw = bulky ? 1.3 : boar ? 1.15 : lean ? 0.84 : 1;
  // Rumpf (seit 13.2) aus einem Stück statt aus Kugeln: runde Hinterhand, eingezogene Taille (bei schlanken
  // Tieren deutlich), tiefe Brust, Schultern, vorn in den Hals übergehend. Stationen: [z, y, Breite, oben, unten]
  const tuck = lean ? 0.62 : bulky ? 0.95 : 0.82;
  const L = len;
  const torso = [
    [-L * 0.98, bodyY + 0.04, 0.05 * bw, 0.05 * bw, 0.05 * bw],
    [-L * 0.86, bodyY + 0.05, 0.16 * bw, 0.17 * bw, 0.16 * bw],
    [-L * 0.58, bodyY + 0.05, 0.21 * bw, 0.21 * bw, 0.2 * bw],
    [-L * 0.18, bodyY + 0.04, 0.19 * bw, 0.2 * bw, 0.2 * bw * tuck],
    [L * 0.22, bodyY + 0.04, 0.22 * bw, 0.21 * bw, 0.25 * bw],
    [L * 0.55, bodyY + 0.07, 0.21 * bw, 0.21 * bw, 0.25 * bw],
    [L * 0.8, bodyY + 0.11, 0.14 * bw, 0.15 * bw, 0.16 * bw],
    [L * 0.9, bodyY + 0.13, 0.05 * bw, 0.05 * bw, 0.05 * bw]
  ];
  A(loft3(torso), fur, coat({ bone: BQ.body }));
  // heller Bauch und Brust: dieselbe Form etwas schmaler, ragt nur unten heraus
  A(loft3(torso.map(([z, y, rx, ru, rd]) => [z * 0.97, y - 0.012, rx * 0.8, ru * 0.55, rd * 1.0])), belly, { bone: BQ.body });
  // Schulterbuckel (Braunbär): die breiteste und höchste Stelle von oben
  if (o.hump) A(ball(12), fur, coat({ bone: BQ.body, p: [0, bodyY + 0.2 * bw, len * 0.36], s: [0.2 * bw, 0.14, 0.24], topK: 0.7 }));
  // Fellzeichnung: dunkler Sattel (Schakal), Tupfen (Hyäne, Luchs), Streifen (Glutkatze)
  if (o.saddleFur) A(ball(12), o.saddleFur, { bone: BQ.body, p: [0, bodyY + 0.1, -len * 0.05], s: [0.17 * bw, 0.16, len * 0.66], top: lighter(o.saddleFur, 0.25), topK: 0.3 });
  if (o.spots) for (let k = 0; k < 16; k++) {
    // Tupfen verstreut auf Flanken und Rücken (fest gestreut, damit jedes Tier gleich aussieht)
    const sx = k % 2 ? 1 : -1;
    const z = len * (0.6 - ((k * 37) % 13) / 13 * 1.25);
    const up = ((k * 53) % 7) / 7;
    A(sphere3(0.036 + (k % 3) * 0.008, 6, 4), o.spots, { bone: BQ.body, p: [sx * (0.2 - up * 0.08) * bw, bodyY - 0.04 + up * 0.22, z], s: [0.5, 1, 1.1] });
  }
  // Querstreifen über den Rücken (Bögen um die Körperachse, von Flanke zu Flanke)
  if (o.stripes) for (let k = 0; k < 6; k++) A(torus3((0.25 - Math.abs(k - 2) * 0.008) * bw, 0.018, Math.PI * 0.9, 4, 12), o.stripes, { bone: BQ.body, p: [0, bodyY + 0.01, len * (0.35 - k * 0.17)], r: [0, 0, Math.PI * 0.05], mat: o.glowStripes ? 'glow' : 'lit', noShadow: true });
  // Rippen (ausgemergelte Hunde und Moorwölfe)
  if (o.ribs) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) A(torus3(0.205 * bw, 0.014, 1.1, 3, 6), darker(fur, 0.25), { bone: BQ.body, p: [0, bodyY - 0.01, len * (0.3 - k * 0.12)], r: [0, 0, sx > 0 ? -0.75 : Math.PI - 0.35], s: [1, 1.15, 1], noShadow: true });
  // Fell am Hals aus flachen, nach hinten gelegten Büscheln: Brustfell, Nackenbüschel; Halskrause bzw.
  // Mähne als dichter Kragen mit Büschelkranz (dunkle Mähne liegt von oben wie ein Kragen über den Schultern)
  const ruff = o.mane || o.ruff;
  const maneMat = o.glowMane ? 'glow' : 'lit';
  // flache Fellbüschel (seit 12.7.1 kürzer und runder, damit sie nicht wie Stacheln abstehen)
  const flat = (len, r, color, p, d, x) => tuft(len * 0.75, r * 1.2, color, p, d, Object.assign({ s: [1, 1, 0.5] }, x));
  if (!o.small && !o.cat) for (let k = -2; k <= 2; k++) flat(0.13 - Math.abs(k) * 0.015, 0.055, k % 2 ? (o.ruff || belly) : lighter(o.ruff || belly, 0.06), [k * 0.065 * bw, bodyY - 0.02 + Math.abs(k) * 0.03, len * 0.68], [k * 0.35, -0.6, 1], { bone: BQ.body });
  if (ruff) {
    const big = o.mane ? 1.2 : 1;
    A(ball(12), ruff, { bone: BQ.body, p: [0, bodyY + 0.1, len * 0.58], s: [0.21 * bw * big, 0.18 * bw * big, 0.17], top: o.mane ? darker(ruff, 0.15) : null, topK: 0.4, mat: maneMat });
    const n = o.mane ? 7 : 5;
    for (let k = 0; k < n; k++) {
      const a = -1.5 + (k / (n - 1)) * 3;
      flat(0.15 * big, 0.07, k % 2 ? ruff : darker(ruff, 0.12), [Math.sin(a) * 0.18 * bw * big, bodyY + 0.1 + Math.cos(a) * 0.15 * bw * big, len * 0.52], [Math.sin(a) * 0.5, 0.1, -1], { bone: BQ.body, mat: maneMat, s: [1, 1, 0.75] });
    }
    if (o.mane) for (let k = 0; k < 4; k++) {
      const a = -1.2 + (k / 3) * 2.4;
      flat(0.16, 0.065, k % 2 ? darker(ruff, 0.06) : ruff, [Math.sin(a) * 0.15 * bw, bodyY + 0.12 + Math.cos(a) * 0.12 * bw, len * 0.3], [Math.sin(a) * 0.4, 0.1, -1], { bone: BQ.body, mat: maneMat });
    }
  }
  // Nackenbüschel oben auf dem Hals
  if (!o.cat) for (let k = 0; k < 2; k++) flat(0.12, 0.05, ruff || back, [0, hp[1] - 0.005 - k * 0.06, hp[2] - 0.15 - k * 0.11], [0, 0.35, -1], { bone: BQ.neck, mat: maneMat });
  // lodernde Mähne bis zur Rute (Höllenhund)
  if (o.glowMane) for (let k = 0; k < 5; k++) tuft(0.2 - k * 0.025, 0.05, k % 2 ? o.mane : lighter(o.mane, 0.25), [0, bodyY + 0.2 * bw, len * (0.2 - k * 0.24)], [0, 1, -0.9], { bone: BQ.body, mat: 'glow' });
  if (o.ridge) for (let k = 0; k < 6; k++) A(horn3(boar ? 0.12 : 0.17, 0.045, 6), o.mane || dark, { bone: BQ.body, p: [0, bodyY + 0.21 * bw - Math.abs(k - 2.5) * 0.01, len * (0.55 - k * 0.22)], r: [-0.4, 0, 0], noShadow: true });
  // Beine (seit 12.7.1): Schulter bzw. Oberschenkel als weicher Muskel, schlanker Lauf, der nach unten dünner
  // wird, hinten mit Sprunggelenk; die Pfote ist ein flacher Ballen mit vier kleinen Zehen (keine Klötze)
  const sock = o.socks || dark;
  const thick = (bulky ? 1.35 : boar ? 1.1 : 1) * bw;
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const x = sx * 0.15 * bw;
    const z = sz * len * 0.62;
    const top = [x, bodyY - 0.05, z];
    const front = sz > 0;
    // Gelenk: vorn das Handgelenk knapp über dem Boden, hinten das Sprunggelenk höher und weiter hinten
    const mid = front ? [x * 1.04, legLen * 0.3, z + 0.015] : [x * 1.04, legLen * 0.42, z - 0.085];
    const paw = [x * 1.04, 0.035, z + (front ? 0.04 : 0.005)];
    // ein durchgehender Lauf (seit 13.2): oben kräftig (Schulter bzw. Keule), zum Gelenk schlank, dann der
    // dünne Mittelfuß; hinten mit deutlicher Keule
    const thigh = front ? 0.075 : 0.095;
    A(tubeProfile3([[x, top[1] + 0.06, z + (front ? 0.02 : -0.03)], top, mid, paw], [thigh * thick, 0.065 * thick, 0.04 * thick, 0.031 * thick], 14, 10), fur, coat({ bone, shade: 0.15 }));
    // Socken: der untere Lauf in der Pfotenfarbe
    A(tubeProfile3([mid, paw], [0.042 * thick, 0.033 * thick], 6, 10), sock, { bone });
    // Pfote: kompakt und nach vorn gestreckt, mit vier kleinen dunklen Krallen
    const pw = (o.bigPaws ? 0.055 : 0.044) * thick;
    A(ball(14), sock, { bone, p: [paw[0], 0.03, paw[2] + 0.018], s: [pw, 0.03, pw * 1.35], top: lighter(sock, 0.08), topK: 0.4 });
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) pointAt3(A, horn3(0.026, 0.008, 4), '#1a120c', [paw[0] + dx * pw, 0.016, paw[2] + 0.018 + pw * 1.2], [0, -0.35, 1], { bone, noShadow: true });
  }
  // Hals und Kopf
  seg([0, bodyY + 0.05, len * 0.55], [0, hp[1] - 0.04, hp[2] - 0.08], 0.15 * bw, 0.12 * bw, fur, { bone: BQ.neck, top: back, topK: 0.5 });
  A(ball(14), fur, { bone: BQ.head, p: hp, s: [0.18 * bw, 0.17 * bw, 0.18], shade: 0.15, top: back, topK: 0.4 });
  // Schnauze: oben spitz zulaufend, Unterkiefer dunkler, schwarze Nase
  const muz = o.cat ? 0.12 : bulky ? 0.17 : boar ? 0.2 : o.muzzle || 0.26;
  A(lathe3('muzzle' + muz, [[0, 0], [0.085, 0.02], [0.08, muz * 0.6], [0.055, muz], [0, muz + 0.005]], 12), o.snout || lighter(fur, 0.12), { bone: BQ.head, p: [0, hp[1] - 0.03, hp[2] + 0.08], r: [Math.PI / 2, 0, 0], s: [1.05 * bw, 1, 0.82], top: o.snout ? null : back, topK: 0.3 });
  // Unterkiefer am eigenen Glied (geht beim Ausholen auf), Maul innen dunkelrot, untere Zähne
  A(ball(10), '#5a1a18', { bone: BQ.head, p: [0, hp[1] - 0.075, hp[2] + 0.1 + muz * 0.4], s: [0.06 * bw, 0.025, muz * 0.4] });
  A(ball(10), darker(o.snout || fur, 0.2), { bone: 11, p: [0, hp[1] - 0.1, hp[2] + 0.12 + muz * 0.4], s: [0.07 * bw, 0.035, muz * 0.42] });
  for (const sx of [-1, 1]) A(horn3(0.045, 0.012, 4), '#f4ecd8', { bone: 11, p: [sx * 0.03, hp[1] - 0.085, hp[2] + 0.12 + muz * 0.75], shine: 0.4 });
  if (boar) {
    A(cyl3(0.06, 0.065, 0.04, 14), '#d89a8a', { bone: BQ.head, p: [0, hp[1] - 0.03, hp[2] + 0.1 + muz], r: [Math.PI / 2, 0, 0] });
    for (const sx of [-1, 1]) A(sphere3(0.014, 6, 4), '#3a1a10', { bone: BQ.head, p: [sx * 0.022, hp[1] - 0.03, hp[2] + 0.125 + muz] });
  } else A(ball(10), '#1a1210', { bone: BQ.head, p: [0, hp[1] - 0.005, hp[2] + 0.1 + muz], s: [0.04, 0.032, 0.03], shine: 0.8 });
  A(roundBox(0.08, 0.008, muz * 0.6, 0.004), '#3a1a14', { bone: 11, p: [0, hp[1] - 0.075, hp[2] + 0.12 + muz * 0.4] });
  for (const sx of [-1, 1]) {
    // Ohren: rund beim Bären, sonst spitz mit hellem Inneren; ein eingerissenes Knick-Ohr beim Wilden Hund
    const ear = o.earBack || dark;
    if ((bulky && !o.wings && !boar) || o.roundEars) A(ball(10), ear, { bone: BQ.head, p: [sx * (o.roundEars ? 0.11 : 0.13), hp[1] + 0.14, hp[2] - 0.05], s: o.roundEars ? [0.065, 0.075, 0.035] : [0.06, 0.06, 0.035] });
    else if (!o.noEars) {
      // Ohrmuschel (seit 12.7.1): gewölbte Schale mit hellem Inneren, leicht nach außen und hinten geneigt
      const flop = o.floppy && sx < 0;
      const er = flop ? [0.9, 0, -sx * 1.5] : [-0.18, sx * 0.35, -sx * 0.3];
      const eh = (o.small ? 0.12 : 0.16) * (flop ? 0.8 : 1);
      const es = [o.small ? 0.1 : 0.12, eh, 0.1];
      const ebase = [sx * 0.095, hp[1] + 0.115, hp[2] - 0.035];
      A(earGeo3(false), ear, { bone: BQ.head, p: ebase, r: er, s: es });
      A(earGeo3(true), mixColor(fur, '#c89890', 0.55), { bone: BQ.head, p: ebase, r: er, s: es });
      if (o.tufts) A(horn3(0.08, 0.012, 4), o.tufts, { bone: BQ.head, p: [sx * 0.155, hp[1] + 0.27, hp[2] - 0.08], r: [-0.25, 0, -sx * 0.35] });
      if (o.bigEars) {
        A(earGeo3(false), ear, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.1, hp[2] - 0.04], r: [-0.15, sx * 0.4, -sx * 0.45], s: [0.17, 0.21, 0.12] });
        A(earGeo3(true), mixColor(fur, '#c89890', 0.55), { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.1, hp[2] - 0.04], r: [-0.15, sx * 0.4, -sx * 0.45], s: [0.17, 0.21, 0.12] });
      }
    }
    // Augen (seit 12.7.1): mandelförmig und flach im Kopf, nicht glubschig – dunkler Lidrand, warme Iris
    // (dunkle Augenfarben werden zu Bernstein), Pupille und ein feiner Glanzpunkt
    const eye = eye3Bright(o.eye || '#3a2a1a');
    const ep = [sx * 0.1, hp[1] + 0.05, hp[2] + 0.132];
    const er3 = [0, sx * 0.35, -sx * 0.18];
    A(sphere3(1, 10, 8), '#140c08', { bone: BQ.head, p: ep, r: er3, s: [0.04, 0.026, 0.02] });
    A(sphere3(1, 10, 8), o.glow ? eye : darker(eye, 0.12), { bone: BQ.head, p: [ep[0] + sx * 0.003, ep[1], ep[2] + 0.007], r: er3, s: [0.028, 0.021, 0.016], mat: 'glow' });
    if (!o.glow) A(sphere3(1, 6, 4), '#0a0604', { bone: BQ.head, p: [ep[0] + sx * 0.005, ep[1], ep[2] + 0.016], r: er3, s: o.cat || o.slit ? [0.006, 0.019, 0.008] : [0.012, 0.014, 0.008] });
    A(sphere3(1, 6, 4), '#ffffff', { bone: BQ.head, p: [ep[0] - sx * 0.004, ep[1] + 0.008, ep[2] + 0.02], s: 0.0065, mat: 'glow' });
    if (o.angry) A(box3(), darker(fur, 0.35), { bone: BQ.head, p: [ep[0], ep[1] + 0.03, ep[2] - 0.002], r: [0, sx * 0.35, sx * 0.4], s: [0.075, 0.016, 0.03] });
    // Backenfell (beim Luchs ein heller Backenbart aus zwei Büscheln)
    if (!boar) A(ball(10), lighter(fur, 0.1), { bone: BQ.head, p: [sx * 0.13 * bw, hp[1] - 0.045, hp[2] + 0.02], s: [0.07 * bw, 0.075, 0.09] });
    if (o.beard) tuft(0.13, 0.05, o.beard, [sx * 0.14 * bw, hp[1] - 0.09, hp[2] + 0.04], [sx, -0.7, -0.2], { bone: BQ.head });
    if (o.fangs) A(horn3(0.07, 0.018, 5), '#f4ecd8', { bone: BQ.head, p: [sx * 0.035, hp[1] - 0.09, hp[2] + 0.13 + muz * 0.6], r: [Math.PI, 0, 0], shine: 0.4 });
    if (o.tusk) A(horn3(boar ? 0.22 : 0.16, boar ? 0.04 : 0.03, 6), '#f4ecd8', { bone: BQ.head, p: [sx * 0.07, hp[1] - 0.07, hp[2] + 0.1 + muz * 0.7], r: [-0.7, 0, -sx * 0.45], shine: 0.4 });
    if (o.horns) {
      // Drachen: zwei große Hornzacken mit Ringen, dahinter eine Krone aus kleinen Zacken
      // seit 12.7.1: glatt nach hinten geschwungen, ohne Ringe
      A(tube3([[sx * 0.09, hp[1] + 0.1, hp[2] - 0.06], [sx * 0.13, hp[1] + 0.22, hp[2] - 0.16], [sx * 0.16, hp[1] + 0.28, hp[2] - 0.32], [sx * 0.15, hp[1] + 0.27, hp[2] - 0.46]], 0.055, 0.006), o.horns, { bone: BQ.head, shine: 0.5 });
      for (const k of [0.45, 0.95]) A(horn3(0.13, 0.03, 5), o.horns, { bone: BQ.head, p: [sx * Math.sin(k) * 0.16 * bw, hp[1] + 0.06 + Math.cos(k) * 0.08, hp[2] - 0.12], r: [-1.6, 0, -sx * k], shine: 0.5, noShadow: true });
    }
  }
  if (o.scar) A(box3(), '#d8a0a0', { bone: BQ.head, p: [0.08, hp[1] + 0.06, hp[2] + 0.16], r: [0, 0, 0.4], s: [0.02, 0.15, 0.02] });
  // Schwanz aus zwei Gliedern, buschig oder glatt; an der Spitze ein Büschel
  if (o.tail !== false) {
    const t0 = [0, bodyY + 0.08, -len * 0.75];
    const t1 = o.droop ? [0, bodyY - 0.05, -len - 0.08] : [0, bodyY + 0.2, -len - 0.12];
    const t2 = o.droop ? [0, bodyY - 0.22, -len - 0.2] : [0, bodyY + 0.12, -len - 0.38];
    if (o.stub) {
      seg(t0, [0, bodyY + 0.16, -len - 0.1], 0.055, 0.045, fur, { bone: BQ.tail });
      A(ball(8), o.stub, { bone: BQ.tail, p: [0, bodyY + 0.17, -len - 0.12], s: [0.045, 0.045, 0.05] });
    } else if (o.longTail) {
      const t3 = [0, bodyY + 0.02, -len - 0.62];
      const t4 = [0, bodyY + 0.16, -len - 0.8];
      seg(t0, t1, 0.05, 0.045, fur, { bone: BQ.tail, top: back, topK: 0.5 });
      seg(t1, t2, 0.045, 0.04, fur, { bone: BQ.tail, top: back, topK: 0.5 });
      seg(t2, t3, 0.04, 0.035, fur, { bone: BQ.tail, top: back, topK: 0.5 });
      seg(t3, t4, 0.035, 0.02, o.tailTip || fur, { bone: BQ.tail, mat: o.glowStripes && o.tailTip ? 'glow' : 'lit' });
      tuft(0.08, 0.035, o.tailTip || back, t4, [0, 0.6, -1], { bone: BQ.tail, mat: o.glowStripes && o.tailTip ? 'glow' : 'lit' });
    } else if (o.bushy) {
      // buschiger Schwanz (seit 13.2) als ein weicher Pinsel: dünn am Ansatz, in der Mitte dick, spitz am Ende;
      // die Spitze (Fuchs: weiß) als eigenes Stück darüber
      const tp = [t0, [0, bodyY + 0.12, -len - 0.02], [0, bodyY + 0.06, -len - 0.22], [0, bodyY - 0.04, -len - 0.42], [0, bodyY - 0.02, -len - 0.58]];
      const tr = [0.045, 0.085, 0.115, 0.1, 0.012];
      A(tubeProfile3(tp, tr, 20, 12, 0, 1, 0.85), fur, { bone: BQ.tail, top: back, topK: 0.55 });
      if (o.tailTip) A(tubeProfile3(tp, tr.map((r) => r * 1.06), 10, 12, 0.7, 1, 0.85), o.tailTip, { bone: BQ.tail });
    } else if (o.wings) {
      seg(t0, t1, 0.08, 0.06, fur, { bone: BQ.tail, top: back, topK: 0.5 });
      seg(t1, t2, 0.06, 0.025, fur, { bone: BQ.tail, top: back, topK: 0.5 });
      for (const t of [t1, t2]) A(horn3(0.1, 0.03, 5), o.mane || dark, { bone: BQ.tail, p: [t[0], t[1] + 0.05, t[2]], r: [-0.4, 0, 0], noShadow: true });
      // Schwanzende: Klinge aus Obsidian (Weltendrache) bzw. Pfeilspitze
      pointAt3(A, horn3(o.tailBlade ? 0.26 : 0.14, o.tailBlade ? 0.07 : 0.05, 4), o.tailBlade || back, t2, [0, -0.3, -1], { bone: BQ.tail, s: [1, 1, 0.35], shine: o.tailBlade ? 1 : 0.3 });
    } else {
      seg(t0, t1, 0.04, 0.03, fur, { bone: BQ.tail });
      seg(t1, t2, 0.03, 0.02, fur, { bone: BQ.tail });
      tuft(0.07, 0.03, back, t2, o.droop ? [0, -1, -0.3] : [0, -0.3, -1], { bone: BQ.tail });
    }
  }
  // Drachenflügel mit Fingerknochen, Daumenkralle und Bauchschuppen
  if (o.wings) {
    for (const [sx, bone] of [[1, BQ.wingL], [-1, BQ.wingR]]) {
      A(limb3(0.6, 0.04, 0.022, 6), darker(o.wings, 0.3), { bone, p: [sx * 0.14, bodyY + 0.2, 0.05], r: [0, 0, sx * 2.0] });
      for (const a of [0.35, 0.8]) A(limb3(0.45, 0.018, 0.01, 5), darker(o.wings, 0.3), { bone, p: [sx * 0.55, bodyY + 0.42, 0.05], r: [0, 0, sx * (Math.PI - a)], noShadow: true });
      A(wingGeo(), o.wings, { bone, p: [sx * 0.14, bodyY + 0.2, 0.0], s: [sx * 1.25, 1.25, 1.25] });
      A(horn3(0.08, 0.022, 5), '#f0e8d4', { bone, p: [sx * 0.56, bodyY + 0.44, 0.06], r: [0.3, 0, -sx * 0.5], shine: 0.6, noShadow: true });
    }
    for (let k = 0; k < 4; k++) A(torus3(0.17, 0.02, Math.PI * 0.8, 4, 10), belly, { bone: BQ.body, p: [0, bodyY - 0.05, len * (0.4 - k * 0.25)], r: [0, 0, Math.PI * 1.1] });
  }
  // Besonderheiten einzelner Arten (MON3_LOOK); topY: Höhe der Rückenlinie
  const topY = bodyY + 0.21 * bw;
  const legs = [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]];
  // Ascheflecken (Warg)
  if (o.ash) for (let k = 0; k < 7; k++) A(sphere3(1, 6, 4), k % 2 ? o.ash : lighter(o.ash, 0.15), { bone: BQ.body, p: [((k * 3) % 5 - 2) * 0.05 * bw, topY - 0.015, len * (0.55 - k * 0.2)], s: [0.05, 0.016, 0.045], noShadow: true });
  // Moorwolf: Algen und Wasserlinsen auf dem Rücken, nasse Strähnen unter dem Bauch, grüner Schleim am Maul
  if (o.algae) {
    for (const [x, z, s] of [[0.05, 0.4, 0.09], [-0.07, -0.05, 0.1], [0.04, -0.5, 0.08]]) A(ball(8), o.algae, { bone: BQ.body, p: [x * bw, topY - 0.025, len * z], s: [s * bw, 0.025, s * 1.4], top: lighter(o.algae, 0.25), topK: 0.6, noShadow: true });
    for (let k = 0; k < 4; k++) A(sphere3(0.018, 6, 4), '#a8d860', { bone: BQ.body, p: [((k * 7) % 5 - 2) * 0.04 * bw, topY - 0.005, len * (0.45 - k * 0.28)], s: [1, 0.4, 1], noShadow: true });
    for (let k = 0; k < 4; k++) tuft(0.12, 0.035, darker(fur, 0.2), [(k % 2 ? 1 : -1) * 0.11 * bw, bodyY - 0.13, len * (0.4 - Math.floor(k / 2) * 0.35)], [0, -1, -0.25], { bone: BQ.body });
    for (const sx of [-1, 1]) A(horn3(0.07, 0.014, 4), o.slime || '#9be07a', { bone: 11, p: [sx * 0.04, hp[1] - 0.12, hp[2] + 0.14 + muz * 0.5], r: [Math.PI, 0, 0], mat: 'glow' });
  }
  // Fenris: zerrissene Eisenfesseln mit Kettenresten an allen Läufen, eingebrannte Rune auf der Stirn
  if (o.shackles) for (const [bone, sx, sz] of legs) {
    const x = sx * 0.16 * bw;
    const z = sz * len * 0.62 + 0.02;
    const y = legLen * 0.3;
    A(torus3(0.07 * bw, 0.022, Math.PI * 2, 4, 10), o.shackles, { bone, p: [x, y, z], r: [Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
    for (let k = 0; k < 2; k++) A(torus3(0.032, 0.01, Math.PI * 2, 3, 8), o.shackles, { bone, p: [x + sx * 0.03, y - 0.03 - k * 0.05, z - 0.07], r: [0, k ? Math.PI / 2 : 0, 0.3], shine: 0.8, noShadow: true });
  }
  if (o.rune) {
    A(torus3(0.04, 0.009, Math.PI * 2, 3, 10), o.rune, { bone: BQ.head, p: [0, hp[1] + 0.1, hp[2] + 0.13], r: [-0.5, 0, 0], mat: 'glow' });
    A(box3(), o.rune, { bone: BQ.head, p: [0, hp[1] + 0.1, hp[2] + 0.135], r: [-0.5, 0, 0], mat: 'glow', s: [0.012, 0.1, 0.01] });
  }
  // Ursus: ein kleiner Wald auf dem Schulterbuckel (Moos, Farne, zwei junge Bäume), Wurzelkrone,
  // abgebrochene Pfeile und Speere in der Flanke
  if (o.forest) {
    const hy = topY + 0.05;
    A(ball(10), '#4f7a32', { bone: BQ.body, p: [0, hy - 0.02, len * 0.3], s: [0.24 * bw, 0.06, 0.3], top: '#7aa84a', topK: 0.6 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      tuft(0.16, 0.035, k % 2 ? '#5a9a3a' : '#3e7a2e', [Math.cos(a) * 0.14 * bw, hy, len * 0.3 + Math.sin(a) * 0.16], [Math.cos(a), 0.9, Math.sin(a)], { bone: BQ.body, s: [1, 1, 0.4] });
    }
    for (const [x, z, h] of [[0.1, 0.42, 0.36], [-0.12, 0.2, 0.28]]) {
      A(limb3(h, 0.022, 0.016, 5), '#5a3a22', { bone: BQ.body, p: [x * bw, hy + h - 0.04, len * z] });
      A(ball(8), '#3e6a2a', { bone: BQ.body, p: [x * bw, hy + h - 0.02, len * z], s: [0.09, 0.11, 0.09], top: '#6a9a3a', topK: 0.5 });
      A(ball(8), '#4f7a32', { bone: BQ.body, p: [x * bw + 0.02, hy + h + 0.1, len * z], s: [0.06, 0.08, 0.06], top: '#7aaa4a', topK: 0.5 });
    }
    for (let k = -2; k <= 2; k++) A(horn3(0.14 - Math.abs(k) * 0.02, 0.022, 5), '#5a3a22', { bone: BQ.head, p: [k * 0.05, hp[1] + 0.15, hp[2] - 0.05 - Math.abs(k) * 0.02], r: [-0.3, 0, -k * 0.35], noShadow: true });
    for (const [x, y, z, d] of [[1, 0.0, 0.0, [0.8, 0.45, 0.2]], [1, -0.05, -0.25, [0.9, 0.3, -0.3]], [-1, 0.02, -0.1, [-0.8, 0.5, 0.1]]]) {
      const p = [x * 0.2 * bw, bodyY + y, len * z];
      pointAt3(A, limb3(0.26, 0.01, 0.01, 4), '#8a6a44', p, d.map((v) => -v), { bone: BQ.body, noShadow: true });
      pointAt3(A, box3(), '#e8e0cc', [p[0] + d[0] * 0.23, p[1] + d[1] * 0.23, p[2] + d[2] * 0.23], d, { bone: BQ.body, noShadow: true, s: [0.05, 0.04, 0.008] });
    }
  }
  // Urdrache: Goldmünzen aus dem Hort kleben auf dem Rücken, Glut zwischen den Schuppen
  if (o.coins) for (let k = 0; k < 9; k++) A(cyl3(0.03, 0.03, 0.008, 8), k % 3 ? o.coins : lighter(o.coins, 0.2), { bone: BQ.body, p: [((k * 5) % 7 - 3) * 0.04 * bw, topY - 0.02, len * (0.5 - k * 0.12)], r: [((k * 3) % 5 - 2) * 0.2, 0, ((k * 7) % 5 - 2) * 0.2], shine: 1, noShadow: true });
  // Weltendrache: glühende Magmaadern auf Flanken und Rücken
  if (o.magma) for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) A(box3(), k % 2 ? o.magma : lighter(o.magma, 0.3), { bone: BQ.body, p: [sx * (0.12 + (k % 2) * 0.05) * bw, topY - 0.04 - (k % 2) * 0.05, len * (0.45 - k * 0.3)], r: [0.6 + (k % 2) * 0.5, 0, sx * 0.9], mat: 'glow', s: [0.018, 0.2, 0.018] });
  if (o.saddle) {
    A(roundBox(0.38, 0.08, 0.36, 0.04), o.saddle, { bone: BQ.body, p: [0, bodyY + 0.25, -0.02] });
    A(roundBox(0.42, 0.14, 0.04, 0.02), darker(o.saddle, 0.3), { bone: BQ.body, p: [0, bodyY + 0.2, 0.12] });
  }
  return { rig, height: bodyY + 0.42, family: 'beast', bodyY, jaw: true, len, bw, hp, legLen };
}

// Weiche Röhre (seit 14.38): ein Stück Körper entlang einer Mittellinie mit eigenem Querschnitt je Station – für
// Rumpf, Hals, Beine und Haarsträhnen des Pferdes statt aufeinandergesetzter Kugeln und Kapseln (sah aus wie
// Bauklötze). st: Stationen { p: [x, y, z], rx (halbe Breite quer), rf / rb (halbe Tiefe nach vorn / hinten; ohne
// rb rund), w: [Knochen] oder [Knochen A, Knochen B, Anteil B], c: Farbe }. Dazwischen weich (Catmull-Rom); Farben
// und Knochengewichte laufen ineinander: Gelenke biegen sich ohne Stufe, Fell geht ohne Kante in dunkle Beine über.
// o.side: Querrichtung (sonst x); „vorn“ ist Laufrichtung × Querrichtung. o.rad Ecken im Querschnitt, o.sub
// Zwischenringe je Station. Mit Farben je Station wird die Form ohne Farbe gebacken (A(geo, null, …)).
function softTube3(st, o = {}) {
  const rad = lodSeg3(o.rad || 10, 5);
  const sub = lodSeg3(o.sub || 3, 1);
  const side = o.side || [1, 0, 0];
  const f3 = (v) => v.toFixed(3);
  const key = 'soft' + rad + ',' + sub + ',' + side.map(f3).join(',') + '|' + st.map((s) => s.p.map(f3).join(',') + ':' + f3(s.rx) + ',' + f3(s.rf) + ',' + f3(s.rb == null ? s.rf : s.rb) + ':' + (s.w || [0]).join(',') + ':' + (s.c || '')).join(';');
  return geo3(key, () => {
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const n = st.length;
    const colored = st.some((s) => s.c);
    const cols = st.map((s) => new THREE.Color(s.c || '#ffffff'));
    const rows = [];
    for (let i = 0; i < n; i++) {
      const steps = i === n - 1 ? 1 : sub;
      const S0 = st[Math.max(0, i - 1)], S1 = st[i], S2 = st[Math.min(n - 1, i + 1)], S3 = st[Math.min(n - 1, i + 2)];
      for (let k = 0; k < steps; k++) {
        const t = k / sub;
        const val = (g) => cr(g(S0), g(S1), g(S2), g(S3), t);
        // Knochen: höchstens zwei je Ring, Gewichte in 255steln (ergibt gebacken genau 1)
        const w = new Map();
        const addW = (s, f) => {
          const ww = s.w || [0];
          const kb = ww.length > 2 ? ww[2] : 0;
          w.set(ww[0], (w.get(ww[0]) || 0) + f * (1 - kb));
          if (kb > 0) w.set(ww[1], (w.get(ww[1]) || 0) + f * kb);
        };
        addW(S1, 1 - t);
        if (t > 0) addW(S2, t);
        const top = [...w].sort((a, b) => b[1] - a[1]).slice(0, 2);
        const k1 = top.length > 1 ? Math.round((top[1][1] / (top[0][1] + top[1][1])) * 255) : 0;
        rows.push({
          p: new THREE.Vector3(val((s) => s.p[0]), val((s) => s.p[1]), val((s) => s.p[2])),
          rx: Math.max(0.002, val((s) => s.rx)), rf: Math.max(0.002, val((s) => s.rf)), rb: Math.max(0.002, val((s) => (s.rb == null ? s.rf : s.rb))),
          b: [top[0][0], top.length > 1 ? top[1][0] : 0, 255 - k1, k1], c: cols[i].clone().lerp(cols[Math.min(n - 1, i + 1)], t)
        });
      }
    }
    const R = rows.length;
    const nv = R * rad + 2;
    const pos = new Float32Array(nv * 3);
    const col = new Float32Array(nv * 3);
    const si = new Uint8Array(nv * 4);
    const sw = new Float32Array(nv * 4);
    const idx = [];
    const T = new THREE.Vector3();
    const S = new THREE.Vector3(1, 0, 0);
    const F = new THREE.Vector3();
    const put = (v, x, y, z, row) => {
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      col[v * 3] = row.c.r; col[v * 3 + 1] = row.c.g; col[v * 3 + 2] = row.c.b;
      si[v * 4] = row.b[0]; si[v * 4 + 1] = row.b[1];
      sw[v * 4] = row.b[2] / 255; sw[v * 4 + 1] = row.b[3] / 255;
    };
    for (let i = 0; i < R; i++) {
      const row = rows[i];
      T.subVectors(rows[Math.min(R - 1, i + 1)].p, rows[Math.max(0, i - 1)].p).normalize();
      const sOld = S.clone();
      S.set(side[0], side[1], side[2]).addScaledVector(T, -(side[0] * T.x + side[1] * T.y + side[2] * T.z));
      if (S.lengthSq() < 1e-4) S.copy(sOld);
      S.normalize();
      F.crossVectors(T, S);
      for (let j = 0; j < rad; j++) {
        const a = (j / rad) * Math.PI * 2;
        const ca = Math.cos(a) * row.rx;
        const sa = Math.sin(a) * (Math.sin(a) > 0 ? row.rf : row.rb);
        put(i * rad + j, row.p.x + S.x * ca + F.x * sa, row.p.y + S.y * ca + F.y * sa, row.p.z + S.z * ca + F.z * sa, row);
      }
      if (i < R - 1) for (let j = 0; j < rad; j++) {
        const a = i * rad + j, a1 = i * rad + ((j + 1) % rad);
        idx.push(a, a1, a + rad, a1, a1 + rad, a + rad);
      }
    }
    // beide Enden schließen
    const c0 = R * rad, c1 = c0 + 1, L = (R - 1) * rad;
    put(c0, rows[0].p.x, rows[0].p.y, rows[0].p.z, rows[0]);
    put(c1, rows[R - 1].p.x, rows[R - 1].p.y, rows[R - 1].p.z, rows[R - 1]);
    for (let j = 0; j < rad; j++) {
      idx.push(c0, (j + 1) % rad, j);
      idx.push(c1, L + j, L + ((j + 1) % rad));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (colored) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

// Pferd (neu gebaut in 12.0): Vorlage ist ein echtes Reitpferd im Profil – Widerrist und Kruppe gleich hoch,
// Rumpf so lang wie das Pferd hoch ist, tiefe Brust, schmale Taille hinter dem Sattel, runde Hinterhand mit
// kräftigen Schenkeln; schlanker, gebogener Hals mit Kamm; langer Keilkopf mit Ganaschen, weichem Maul und
// gespitzten Ohren. Jedes Bein hat drei Glieder (Schulter/Hüfte, Knie bzw. Sprunggelenk, Fessel), damit der
// Galopp (horseGait3) die Beine beugen und die Hufe abrollen kann.
// tier 1: Reitpferd (Brauner mit Blesse, schwarzen Beinen und zwei weißen Socken)
// tier 2: Kriegsross (Rappe, breiter gebaut, mit Kopfplatte und Dorn, Halsschienen, Brustpanzer, roter
// Schabracke mit Goldborte über Rumpf und Kruppe, Federbusch und Behang an den Fesseln)
const HORSE_LEG = { upper: [3, 4, 5, 6], lower: [11, 12, 13, 14], foot: [15, 16, 17, 18], tail2: 19 };
function horseParts3(b, unused, o = {}) {
  const A = adder(b, o.parent || null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const war = o.tier === 2;
  const coat = o.coat || (war ? '#3b3546' : '#94582e');
  const points = war ? '#26222e' : '#2a1d16';
  const mane = o.mane || (war ? '#15111b' : '#22160f');
  const white = '#f4eee2';
  const hoofC = '#2b231d';
  const steel = '#8a95a3';
  const steelD = '#5c6674';
  const gold = '#d8b060';
  const cloth = o.saddle || '#8a2a1a';
  const red = '#8e1f22';
  const W = war ? 1.08 : 1;
  const bodyY = 0.95;
  const FX = 0.12 * W, HX = 0.13 * W, FZ = 0.4, HZ = -0.42;
  const POLL = [0, 1.64, 0.88];
  // Gelenke in der Seitenansicht [y, z] (seit 14.38): Sprunggelenk höher und weiter hinten als das Vorderknie,
  // Fesselkopf knapp über dem Huf; die Schweifrübe des Kriegsrosses sitzt tiefer (kommt unter der Schabracke hervor)
  const KNEE = [0.4, FZ + 0.012], FFET = [0.135, FZ + 0.004], HOCK = [0.46, HZ - 0.143], HFET = [0.135, HZ - 0.122];
  const DOCK = war ? [1.07, -0.65] : [1.14, -0.64];
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [POLL, 10],
    [[FX, 0.9, FZ], 1], [[-FX, 0.9, FZ], 1], [[HX, 1.0, HZ], 1], [[-HX, 1.0, HZ], 1],
    [[0, DOCK[0], DOCK[1]], 1], [[0, 0, 0], 1], [[0, 0, 0], 1], [[0, 1.06, 0.5], 1],
    // 11–14 Röhrbein (vorn ab Knie, hinten ab Sprunggelenk), 15–18 Fessel mit Huf, 19–21 Schweif (drei Glieder)
    [[FX, KNEE[0], KNEE[1]], 3], [[-FX, KNEE[0], KNEE[1]], 4], [[HX, HOCK[0], HOCK[1]], 5], [[-HX, HOCK[0], HOCK[1]], 6],
    [[FX, FFET[0], FFET[1]], 11], [[-FX, FFET[0], FFET[1]], 12], [[HX, HFET[0], HFET[1]], 13], [[-HX, HFET[0], HFET[1]], 14],
    [[0, 0.98, -0.78], 7], [[0, 0.76, -0.82], 19], [[0, 0.52, -0.83], 20]
  ]);
  // Schattenkugel von Hand (weiche Röhren hängen an mehreren Knochen und werfen selbst keinen Schatten)
  const shadowAt = (bone, p, s) => {
    if (b.skinned) shadowPart(b, sphere3(1, 6, 4), new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion(), new THREE.Vector3(...s)), { bone, parent: o.parent || null });
  };
  // --- Rumpf (seit 14.38 aus einem Stück statt aus sechs Kugeln): Querschnitte von der Hinterbacke bis zur Brust,
  // je [z, Mitte y, halbe Breite, Höhe nach oben, Höhe nach unten] – der Rücken läuft weich über die runde Kruppe
  // zum Schweifansatz aus, hinter dem Sattel ist die Flanke leicht eingezogen, die Brust tief
  const TORSO = [
    [-0.7, 0.99, 0.045, 0.05, 0.06], [-0.675, 0.99, 0.135, 0.115, 0.15], [-0.615, 0.995, 0.205, 0.172, 0.215], [-0.52, 1.0, 0.25, 0.232, 0.255],
    [-0.4, 1.0, 0.265, 0.26, 0.268], [-0.27, 0.985, 0.256, 0.25, 0.258], [-0.12, 0.955, 0.249, 0.25, 0.268], [0.04, 0.94, 0.25, 0.262, 0.272],
    [0.2, 0.95, 0.25, 0.283, 0.285], [0.33, 0.96, 0.24, 0.288, 0.29], [0.45, 0.97, 0.208, 0.25, 0.27], [0.55, 0.975, 0.15, 0.17, 0.2], [0.605, 0.98, 0.05, 0.06, 0.07]
  ];
  A(softTube3(TORSO.map(([z, y, rx, ru, rd]) => ({ p: [0, y, z], rx: rx * W, rf: ru, rb: rd, w: [1] })), { rad: 18, sub: 3 }), coat, { bone: 1, shade: 0.3, shine: 0.15 });
  // Rumpfquerschnitt an einer Stelle z (zwischen den Stationen geradlinig, reicht für Mähne, Decken und Behang)
  const torsoAt = (z) => {
    let i = 0;
    while (i < TORSO.length - 2 && z > TORSO[i + 1][0]) i++;
    const a = TORSO[i], c = TORSO[i + 1];
    const t = Math.max(0, Math.min(1, (z - a[0]) / (c[0] - a[0])));
    return a.map((v, k) => v + (c[k] - v) * t);
  };
  // halbe Rumpfbreite in Höhe y an der Stelle z (0 = außerhalb)
  const torsoX = (y, z) => {
    if (z < TORSO[0][0] || z > TORSO[TORSO.length - 1][0]) return 0;
    const [, yc, rx, ru, rd] = torsoAt(z);
    const q = (y - yc) / (y > yc ? ru : rd);
    return Math.abs(q) < 1 ? rx * W * Math.sqrt(1 - q * q) : 0;
  };
  // schmaler Widerrist
  A(ball(12), coat, { bone: 1, p: [0, bodyY + 0.2, 0.26], s: [0.1, 0.1, 0.2], shine: 0.15 });
  // --- Hals (seit 14.38 aus einem Stück): seitlich schmal, von der Schulter zum Genick verjüngt, oben der Kamm,
  // unten die Kehle; Stationen [Mitte y, z, halbe Breite, Tiefe zum Kamm, Tiefe zur Kehle]
  const NECK = [
    [1.03, 0.385, 0.17 * W, 0.28, 0.28], [1.155, 0.508, 0.145 * W, 0.246, 0.246], [1.31, 0.622, 0.118, 0.21, 0.21], [1.43, 0.72, 0.1, 0.184, 0.184],
    [1.525, 0.8, 0.09, 0.16, 0.16], [1.598, 0.862, 0.082, 0.138, 0.138], [1.63, 0.9, 0.07, 0.1, 0.1]
  ];
  A(softTube3(NECK.map(([y, z, rx, rf, rb], i) => ({ p: [0, y, z], rx, rf, rb, w: i ? [10] : [1, 10, 0.4] })), { rad: 12, sub: 3 }), coat, { bone: 10, shade: 0.2, shine: 0.15 });
  // halbe Halsbreite an einer Stelle (y, z) der Seitenansicht (0 = außerhalb des Halses)
  const neckX = (y, z) => {
    let best = 1e9, out = 0;
    for (let i = 0; i < NECK.length - 1; i++) {
      const a = NECK[i], c = NECK[i + 1];
      const ty = c[0] - a[0], tz = c[1] - a[1];
      const l = Math.hypot(ty, tz);
      const u = Math.max(0, Math.min(1, ((y - a[0]) * ty + (z - a[1]) * tz) / (l * l)));
      const cy = a[0] + ty * u, cz = a[1] + tz * u;
      const dist = Math.hypot(y - cy, z - cz);
      if (dist >= best) continue;
      best = dist;
      // Abstand quer zur Halsachse: + zum Kamm, − zur Kehle
      const d = ((y - cy) * tz - (z - cz) * ty) / l;
      const r = a[d >= 0 ? 3 : 4] + (c[d >= 0 ? 3 : 4] - a[d >= 0 ? 3 : 4]) * u;
      out = Math.abs(d) < r ? (a[2] + (c[2] - a[2]) * u) * Math.sqrt(1 - (d / r) ** 2) : 0;
    }
    return out;
  };
  // --- Kopf: Stirn, Ganaschen, langes Gesicht, weiches Maul mit Nüstern
  // seit 14.21: Augen in den Kopf eingelassen statt als Kugeln davor, Maul etwas kleiner, Blesse als flacher
  // Streifen direkt auf dem Nasenrücken (vorher ein weißer Stab, der vor dem Gesicht stand)
  A(ball(14), coat, { bone: 2, p: [0, 1.6, 0.92], s: [0.095, 0.1, 0.12], shine: 0.15 });
  A(ball(12), coat, { bone: 2, p: [0, 1.5, 0.88], s: [0.1, 0.11, 0.11], shade: 0.15 });
  seg([0, 1.57, 0.97], [0, 1.33, 1.2], 0.085, 0.062, coat, { bone: 2, shade: 0.1 });
  const muzzle = war ? '#4a4452' : '#6a4630';
  A(ball(12), muzzle, { bone: 2, p: [0, 1.302, 1.205], s: [0.064, 0.062, 0.074] });
  A(ball(10), muzzle, { bone: 2, p: [0, 1.254, 1.165], s: [0.046, 0.03, 0.056] });
  for (const sx of [-1, 1]) A(ball(6), '#120a08', { bone: 2, p: [sx * 0.032, 1.312, 1.266], s: [0.014, 0.019, 0.01], r: [0, sx * 0.4, 0] });
  A(roundBox(0.08, 0.007, 0.032, 0.004), '#1e100c', { bone: 2, p: [0, 1.262, 1.236] });
  if (!war) {
    // Nasenrücken-Normale (0, 0.69, 0.72): die Mitte des Streifens liegt knapp unter der Oberfläche
    seg([0, 1.62, 1.023], [0, 1.366, 1.237], 0.021, 0.014, white, { bone: 2 });
    A(ball(8), white, { bone: 2, p: [0, 1.655, 0.995], s: [0.036, 0.03, 0.016], r: [-0.8, 0, 0] });
  }
  for (const sx of [-1, 1]) {
    if (war) A(ball(8), '#ff6a2a', { bone: 2, p: [sx * 0.085, 1.565, 0.965], s: [0.022, 0.018, 0.026], mat: 'glow' });
    else {
      // Auge seitlich am Kopf, mandelförmig, mit dunklem Lid darüber
      A(ball(8), '#120a06', { bone: 2, p: [sx * 0.078, 1.565, 0.962], s: [0.014, 0.02, 0.026], shine: 0.9 });
      A(sphere3(0.005, 5, 4), '#ffffff', { bone: 2, p: [sx * 0.09, 1.572, 0.972], mat: 'glow' });
      A(ball(8), darker(coat, 0.2), { bone: 2, p: [sx * 0.077, 1.585, 0.96], s: [0.016, 0.008, 0.03] });
    }
    // Ohren: gespitzt, leicht nach vorn, innen dunkler
    A(horn3(0.13, 0.036, 7), coat, { bone: 2, p: [sx * 0.045, 1.69, 0.86], r: [0.25, 0, -sx * 0.22], s: [1, 1, 0.6] });
    A(horn3(0.09, 0.02, 5), points, { bone: 2, p: [sx * 0.046, 1.7, 0.872], r: [0.25, 0, -sx * 0.22], s: [1, 1, 0.4] });
  }
  // --- Mähne (seit 14.38): breite, sich überlappende Strähnen fallen über den Mähnenkamm zur Seite und legen sich
  // an Hals und Schulter an – unterschiedlich lang, leicht gewellt, an der Wurzel dunkler, zur Spitze heller; dazu
  // der Schopf zwischen den Ohren. Vorher eine Reihe einzelner Zacken. Das Kriegsross trägt die Mähne länger und
  // auf beiden Seiten; sie kommt dort unter den Halsschienen hervor.
  const crest = (q) => {
    const u = 1 - q;
    return [0, u * u * 1.28 + 2 * u * q * 1.6 + q * q * 1.75, u * u * 0.32 + 2 * u * q * 0.6 + q * q * 0.82];
  };
  const hr = (i) => {
    const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
    return v - Math.floor(v);
  };
  // Haarfarbe: Wurzel dunkler, Spitze eine Spur zum Fellton hin (warm statt grau), jede Strähne etwas anders
  const warm = mixColor(mane, coat, 0.5);
  const hairC = (i, t) => {
    const base = i % 3 === 1 ? mixColor(mane, coat, war ? 0.3 : 0.16) : i % 3 === 2 ? darker(mane, 0.12) : mane;
    return t < 0.5 ? mixColor(darker(base, 0.2), base, t * 2) : mixColor(base, warm, (t * 2 - 1) * 0.45);
  };
  const surfX = (y, z) => Math.max(neckX(y, z), torsoX(y, z));
  const maneLock = (q, sx, L, k, i, lift) => {
    const [, cy, cz] = crest(q);
    const [, y1, z1] = crest(Math.min(1, q + 0.04));
    const [, y0, z0] = crest(Math.max(0, q - 0.04));
    const tl = Math.hypot(y1 - y0, z1 - z0);
    const st = [];
    // Ansatz: beim Reitpferd über dem Kamm, beim Kriegsross unter der Halsschiene
    let ay = cy;
    if (war) {
      ay = cy - 0.1;
      st.push({ p: [sx * 0.05, cy - 0.04, cz], rx: 0.035 * k, rf: 0.012, w: [10], c: hairC(i, 0) });
    } else {
      st.push({ p: [-sx * 0.014, cy - 0.012, cz], rx: 0.03 * k, rf: 0.012, w: [10], c: hairC(i, 0) });
      st.push({ p: [sx * 0.022, cy + 0.008, cz], rx: 0.042 * k, rf: 0.015, w: [10], c: hairC(i, 0.1) });
    }
    // Fallrichtung: nach unten und leicht nach hinten, je Strähne etwas anders; dazu eine sanfte Welle
    const gz = -0.2 - 0.22 * hr(i + 7);
    const gl = Math.hypot(1, gz);
    const ph = hr(i + 3) * 6;
    let px = 0;
    for (const [h, wk, tk] of [[war ? 0.05 : 0.16, 0.9, 1], [0.4, 1, 1], [0.66, 0.94, 0.9], [0.87, 0.66, 0.7], [1, 0.1, 0.25]]) {
      const y = ay - (h * L) / gl;
      const z = cz + (gz * h * L) / gl + 0.014 * Math.sin(h * 4 + ph) * h;
      px = Math.max(surfX(y, z), px * 0.85);
      st.push({ p: [sx * (px + lift + 0.006 * Math.sin(h * 5 + ph)), y, z], rx: 0.05 * k * wk, rf: 0.016 * tk, w: [10], c: hairC(i, 0.15 + h * 0.85) });
    }
    A(softTube3(st, { rad: 4, sub: 2, side: [0, (y1 - y0) / tl, (z1 - z0) / tl] }), null, { bone: 10, noShadow: true, shine: 0.25 });
  };
  const nLocks = war ? 12 : 15;
  for (let k = 0; k < nLocks; k++) {
    const q = war ? 0.07 + (k / (nLocks - 1)) * 0.8 : 0.03 + (k / (nLocks - 1)) * 0.93;
    const L = (war ? 0.3 : 0.17) + (war ? 0.1 : 0.08) * (1 - q) + 0.06 * hr(k);
    maneLock(q, 1, L, (war ? 1.2 : 1) * (0.9 + 0.25 * hr(k + 11)), k, 0.012 + (k % 2) * 0.008);
    if (war) maneLock(q + 0.02, -1, L * (0.85 + 0.2 * hr(k + 5)), 1.15, k + 20, 0.012 + ((k + 1) % 2) * 0.008);
    else if (k % 2 === 0) maneLock(q, -1, 0.06 + 0.04 * hr(k + 5), 1.25, k + 20, 0.01);
  }
  if (!war) {
    // Mähnenkamm: deckt die Ansätze der Strähnen
    const ridge = [];
    for (let k = 0; k <= 6; k++) {
      const [, y, z] = crest(0.01 + (k / 6) * 0.98);
      ridge.push({ p: [0, y - 0.014, z], rx: k % 6 ? 0.03 : 0.012, rf: k % 6 ? 0.024 : 0.01, w: [10], c: darker(mane, 0.1) });
    }
    A(softTube3(ridge, { rad: 6, sub: 2 }), null, { bone: 10, noShadow: true });
  }
  // Schopf: fällt zwischen den Ohren nach vorn auf die Stirn (beim Kriegsross nur zwei kurze Büschel neben dem Dorn)
  const FORE = [[1.722, 0.868, 0.026], [1.73, 0.93, 0.04], [1.702, 0.985, 0.042], [1.657, 1.035, 0.036], [1.592, 1.078, 0.024], [1.556, 1.1, 0.005]];
  for (const [dx, len, i] of war ? [[-1.3, 0.5, 1], [1.3, 0.5, 2]] : [[0.25, 0.78, 0], [-1, 0.62, 1], [1.1, 0.55, 2]]) {
    const st = [];
    for (let n = 0; n < 6; n++) {
      const f = (n / 5) * len * 5;
      const j = Math.min(4, Math.floor(f));
      const a = FORE[j], c = FORE[j + 1];
      const v = a.map((q, m) => q + (c[m] - q) * (f - j));
      const x = dx * (0.012 + 0.034 * Math.sin((n / 5) * Math.PI * 0.6));
      st.push({ p: [x, v[0] - x * x * 6, v[1]], rx: FORE[n][2] * 0.8, rf: n < 5 ? 0.013 : 0.004, w: [2], c: hairC(i, n / 5) });
    }
    A(softTube3(st, { rad: 6, sub: 2 }), null, { bone: 2, noShadow: true, shine: 0.25 });
  }
  // --- Schweif (seit 14.38): Rübe, darum ein voller Strang aus überlappenden Strähnen – oben bauschig, nach unten
  // schmaler, die Spitzen verschieden lang. Er hängt an vier Gliedern (7, 19, 20, 21) und schwingt weich nach
  // (horseGait3). Vorher sieben flache Platten an einem Stummel.
  const TC = [[7, DOCK[0] - 0.1], [19, 0.87], [20, 0.64], [21, 0.42]];
  const tailW = (y) => {
    if (y >= TC[0][1]) return [7];
    for (let k = 0; k < 3; k++) if (y >= TC[k + 1][1]) return [TC[k][0], TC[k + 1][0], (TC[k][1] - y) / (TC[k][1] - TC[k + 1][1])];
    return [21];
  };
  const dock = war ? [[1.09, -0.6], [1.045, -0.685], [1.0, -0.74], [0.95, -0.78], [0.88, -0.8]] : [[1.16, -0.59], [1.125, -0.67], [1.06, -0.74], [0.98, -0.785], [0.9, -0.8]];
  A(softTube3(dock.map(([y, z], k) => ({ p: [0, y, z], rx: [0.05, 0.056, 0.052, 0.046, 0.034][k], rf: [0.05, 0.054, 0.05, 0.044, 0.032][k], w: tailW(y), c: darker(mane, 0.1) })), { rad: 8, sub: 2 }), null, { bone: 7, noShadow: true });
  shadowAt(19, [0, 0.72, -0.82], [0.09, 0.3, 0.07]);
  const TS = [0, 0.1, 0.28, 0.5, 0.72, 0.9, 1];
  const TENV = [0, 0.5, 0.95, 1, 0.9, 0.72, 0.6];
  const TWID = [0.55, 0.82, 1, 1, 0.82, 0.5, 0.08];
  // ax: Platz quer (−1 … 1), az: vorn (+) oder hinten (−) im Strang, u: Ansatz entlang der Rübe, L: Länge, k: Dicke
  const tailStrand = (ax, az, u, L, k, i) => {
    const f = u * 3;
    const j = Math.min(2, Math.floor(f));
    const y0 = dock[1 + j][0] + (dock[2 + j][0] - dock[1 + j][0]) * (f - j);
    const z0 = dock[1 + j][1] + (dock[2 + j][1] - dock[1 + j][1]) * (f - j);
    const bow = 0.045 - az * 0.035;
    const st = TS.map((s, n) => {
      const y = y0 - L * s;
      const rx = 0.052 * k * TWID[n];
      return {
        p: [ax * (0.012 + 0.05 * TENV[n]) + 0.012 * Math.sin(5 * s + i * 1.7) * s, y, z0 + az * 0.042 * TENV[n] - bow * Math.sin(Math.PI * Math.pow(s, 0.75) * 0.95) + 0.045 * s * s],
        rx, rf: rx * 0.66, w: tailW(y), c: hairC(i, s)
      };
    });
    A(softTube3(st, { rad: 5, sub: 2 }), null, { bone: 19, noShadow: true, shine: 0.25 });
  };
  [[0, 0.6, 0.7, 0.68], [0, -1, 0.15, 0.52], [0.45, 0.1, 0.4, 0.6], [-0.45, 0, 0.35, 0.66], [1, -0.2, 0.3, 0.46], [-1, -0.3, 0.25, 0.54], [0.5, -1, 0, 0.42], [-0.55, -0.9, 0.05, 0.5], [0.75, 0.9, 0.85, 0.5, 0.55], [-0.8, -0.5, 0.75, 0.6, 0.5]]
    .concat(war ? [[0.8, 0.5, 0.55, 0.6], [-0.8, 0.5, 0.6, 0.62], [0, -0.4, 0.5, 0.7]] : [])
    .forEach(([ax, az, u, L, k = 1], i) => tailStrand(ax, az, u, L * (war ? 1.12 : 1), k * (war ? 1.22 : 1) * (0.9 + 0.2 * hr(i + 31)), i + 40));
  // --- Beine
  const socks = war ? [] : [4, 5];
  let HIND = null;
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const sx = i % 2 ? -1 : 1;
    const up = HORSE_LEG.upper[i], lo = HORSE_LEG.lower[i], ft = HORSE_LEG.foot[i];
    const sock = socks.includes(up);
    const lc = sock ? white : points;
    const dark = mixColor(coat, points, 0.8);
    // seit 14.38 ist jedes Bein ein Stück (softTube3): Stationen [x nach außen, y, z, halbe Breite, Tiefe vorn,
    // Tiefe hinten, Knochen, Farbe]. Die Gelenke hängen je zur Hälfte an beiden Knochen und biegen sich ohne Stufe;
    // das Fell geht über Knie bzw. Sprunggelenk weich in die dunklen Beine über. Vorher Kugeln und Stäbe.
    let st, x, zf, zh;
    if (front) {
      x = sx * FX;
      zf = FFET[1];
      zh = FZ + 0.058;
      // Schulter und Oberarm gehen in die Brust über, Ellbogen nach hinten, flaches Vorderknie, schlankes Röhrbein
      st = [
        [0.014, 1.05, FZ - 0.015, 0.08 * W, 0.115, 0.115, [1, up, 0.25], coat], [0.014, 0.92, FZ - 0.005, 0.095 * W, 0.125, 0.125, [1, up, 0.6], coat],
        [0.006, 0.79, FZ + 0.003, 0.088 * W, 0.105, 0.118, [up], coat], [0, 0.66, FZ + 0.01, 0.068 * W, 0.078, 0.08, [up], coat],
        [0, 0.53, FZ + 0.012, 0.052, 0.056, 0.052, [up], mixColor(coat, points, 0.35)], [0, KNEE[0], KNEE[1], 0.049, 0.056, 0.045, [up, lo, 0.5], dark],
        [0, 0.33, FZ + 0.01, 0.038, 0.038, 0.04, [lo], points], [0, 0.26, FZ + 0.007, 0.031, 0.031, 0.036, [lo], points],
        [0, 0.225, FZ + 0.006, 0.031, 0.031, 0.036, [lo], lc], [0, 0.175, FZ + 0.005, 0.034, 0.034, 0.04, [lo], lc],
        [0, FFET[0], FFET[1], 0.046, 0.044, 0.05, [lo, ft, 0.5], lc], [0, 0.088, FZ + 0.026, 0.039, 0.039, 0.039, [ft], lc], [0, 0.05, FZ + 0.047, 0.045, 0.046, 0.046, [ft], lc]
      ];
      shadowAt(up, [x, 0.68, FZ], [0.08, 0.3, 0.1]);
      shadowAt(lo, [x, 0.27, FZ + 0.01], [0.04, 0.15, 0.045]);
    } else {
      x = sx * HX;
      zf = HFET[1];
      zh = HZ - 0.056;
      // Hinterbacke und breiter Oberschenkel (nach unten verjüngt), Knie vorn, Unterschenkel schräg nach hinten zum
      // Sprunggelenk mit Fersenhöcker, senkrechtes schlankes Röhrbein, Fesselkopf, schräge Fessel
      st = [
        [0, 1.08, HZ - 0.02, 0.07 * W, 0.14, 0.16, [1, up, 0.3], coat], [0.024, 0.97, HZ - 0.03, 0.122 * W, 0.2, 0.215, [1, up, 0.6], coat],
        [0.03, 0.85, HZ - 0.03, 0.13 * W, 0.205, 0.205, [1, up, 0.85], coat], [0.026, 0.75, HZ - 0.025, 0.118 * W, 0.185, 0.165, [up], coat],
        [0.016, 0.67, HZ - 0.04, 0.095 * W, 0.135, 0.12, [up], coat], [0.008, 0.58, HZ - 0.08, 0.07, 0.08, 0.082, [up], coat],
        [0.003, 0.51, HZ - 0.118, 0.055, 0.056, 0.074, [up], mixColor(coat, points, 0.4)], [0, HOCK[0], HOCK[1], 0.047, 0.046, 0.07, [up, lo, 0.5], dark],
        [0, 0.4, HZ - 0.14, 0.039, 0.039, 0.05, [lo], points], [0, 0.27, HZ - 0.133, 0.031, 0.031, 0.037, [lo], points],
        [0, 0.235, HZ - 0.131, 0.031, 0.031, 0.037, [lo], lc], [0, 0.18, HZ - 0.127, 0.034, 0.034, 0.041, [lo], lc],
        [0, HFET[0], HFET[1], 0.046, 0.045, 0.052, [lo, ft, 0.5], lc], [0, 0.088, HZ - 0.096, 0.04, 0.04, 0.04, [ft], lc], [0, 0.05, HZ - 0.072, 0.046, 0.046, 0.046, [ft], lc]
      ];
      if (sx > 0) HIND = st;
      shadowAt(up, [x, 0.85, HZ - 0.03], [0.12, 0.25, 0.19]);
      shadowAt(lo, [x, 0.29, HZ - 0.13], [0.045, 0.17, 0.05]);
    }
    A(softTube3(st.map(([dx, y, z, rx, rf, rb, w, c]) => ({ p: [x + sx * dx, y, z], rx, rf, rb, w, c })), { rad: 10, sub: 3 }), null, { bone: up, noShadow: true, shade: 0.12, shine: 0.12 });
    // Huf: unten breiter, die Vorderwand schräg (oben nach hinten versetzt)
    A(lathe3('hoof14', [[0, 0], [0.058, 0], [0.062, 0.012], [0.05, 0.068], [0.04, 0.08], [0, 0.082]], 12), hoofC, { bone: ft, m: new THREE.Matrix4().set(1, 0, 0, x, 0, 1, 0, 0, 0, -0.3, 1.12, zh, 0, 0, 0, 1), shine: 0.4 });
    if (war) for (let k = 0; k < 7; k++) {
      // Behang: lange Haare über dem Huf
      const a = (k / 7) * Math.PI * 2;
      strand3(A, ft, [x + Math.cos(a) * 0.045, 0.16, zf + Math.sin(a) * 0.045], [Math.cos(a) * 0.12, -1, Math.sin(a) * 0.12 - 0.1], 0.13, 0.034, lighter(mane, 0.3), { flat: 0.7 });
    }
  }
  // --- Zaumzeug: Genickstück, Backenstücke, Nasenriemen, Trensenringe, Zügel
  const strap = war ? '#3a2a1e' : '#4e301a';
  A(torus3(0.073, 0.011, Math.PI * 2, 4, 14), strap, { bone: 2, p: [0, 1.4, 1.133], r: [0.76, 0, 0] });
  A(torus3(0.103, 0.012, Math.PI * 2, 4, 14), strap, { bone: 2, p: [0, 1.6, 0.89], r: [0.3, 0, 0] });
  for (const sx of [-1, 1]) {
    seg([sx * 0.095, 1.6, 0.9], [sx * 0.07, 1.4, 1.12], 0.011, 0.011, strap, { bone: 2 });
    A(torus3(0.02, 0.006, Math.PI * 2, 3, 8), gold, { bone: 2, p: [sx * 0.066, 1.29, 1.17], r: [0, Math.PI / 2, 0], shine: 1 });
    seg([sx * 0.068, 1.29, 1.16], [sx * 0.15, 1.38, 0.74], 0.007, 0.007, strap, { bone: 10 });
    seg([sx * 0.15, 1.38, 0.74], [sx * 0.1, 1.27, 0.14], 0.007, 0.007, strap, { bone: 10 });
  }
  // --- Satteldecke (schmiegt sich an den Rücken), Sattel mit Knauf und Hinterzwiesel, Gurt, Steigbügel
  // seit 14.38 liegen Decke und Schabracke als Tuch am neuen Rumpf an (drape) statt als Kugelschalen darüber
  // halbe Breite des Oberschenkels in Höhe y an der Stelle z (Ruhestellung, mit etwas Luft für den Galopp)
  const thighX = (y, z) => {
    for (let k = 0; k < 6; k++) {
      const a = HIND[k], c = HIND[k + 1];
      if (y > a[1] || y < c[1]) continue;
      const t = (a[1] - y) / (a[1] - c[1]);
      const v = (n) => a[n] + (c[n] - a[n]) * t;
      const q = (z - v(2)) / ((z > v(2) ? v(4) : v(5)) * 1.12);
      return Math.abs(q) < 1 ? HX + v(0) + v(3) * Math.sqrt(1 - q * q) : 0;
    }
    return 0;
  };
  // Gitter über z (z0 … z1) und rund um den Rücken, mit Abstand off über Rumpf und Oberschenkel. Der Saum liegt
  // überall in Höhe yb; ya = 0: ein Stück über den Rücken hinweg, sonst je Seite ein Streifen von ya hinab bis yb
  const drape = (z0, z1, nz, ya, yb, nth, off) => geo3(`hdrape${W},${z0},${z1},${nz},${ya},${yb},${nth},${off}`, () => {
    const pos = [];
    const idx = [];
    for (const sx of ya > 0 ? [-1, 1] : [1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= nz; i++) {
        const z = z0 + ((z1 - z0) * i) / nz;
        const [, yc, rx, ru] = torsoAt(z);
        const thOf = (y) => Math.acos(Math.max(-1, Math.min(1, (y - yc) / (ru + off))));
        const tha = thOf(ya), thb = thOf(yb);
        for (let j = 0; j <= nth; j++) {
          const th = ya > 0 ? sx * (tha + ((thb - tha) * j) / nth) : -thb + (2 * thb * j) / nth;
          const y = yc + Math.cos(th) * (ru + off);
          let x = Math.sin(th) * (rx * W + off);
          if (Math.abs(th) > 0.7) x = Math.sign(x) * Math.max(Math.abs(x), thighX(y, z) + off);
          pos.push(x, y, z);
        }
      }
      for (let i = 0; i < nz; i++) for (let j = 0; j < nth; j++) {
        const a = base + i * (nth + 1) + j, c = a + nth + 1;
        if (sx > 0) idx.push(a, c, a + 1, a + 1, c, c + 1);
        else idx.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  if (war) {
    // Schabracke: ein Tuch vom Widerrist über die Kruppe bis vor den Schweifansatz, unten Goldborte
    A(drape(-0.62, 0.17, 18, 0, 1.03, 14, 0.014), red, { bone: 1, shade: 0.15 });
    A(drape(-0.62, 0.17, 18, 1.035, 0.995, 1, 0.02), gold, { bone: 1, shine: 0.8, noShadow: true });
    A(drape(-0.645, -0.615, 1, 0, 1.0, 14, 0.02), gold, { bone: 1, shine: 0.8, noShadow: true });
  } else {
    A(drape(-0.3, 0.17, 8, 0, 1.09, 10, 0.012), cloth, { bone: 1, shade: 0.1 });
    A(drape(-0.3, 0.17, 8, 1.095, 1.06, 1, 0.018), gold, { bone: 1, shine: 0.8, noShadow: true });
  }
  const leather = '#5a3820';
  A(cap3(1, 1.1, 0, Math.PI * 2, 16, 5), leather, { bone: 1, p: [0, 1.17, -0.05], s: [0.17, 0.09, 0.2], top: lighter(leather, 0.2), topK: 0.4, shine: 0.3 });
  A(ball(10), leather, { bone: 1, p: [0, 1.27, 0.11], s: [0.05, 0.04, 0.035], shine: 0.4 });
  A(torus3(0.11, 0.022, Math.PI, 4, 10), darker(leather, 0.15), { bone: 1, p: [0, 1.24, -0.2], r: [0.25, 0, 0], s: [1, 0.55, 1] });
  for (const sx of [-1, 1]) A(roundBox(0.02, 0.18, 0.24, 0.01), darker(leather, 0.1), { bone: 1, p: [sx * 0.215 * W, 1.11, -0.05], r: [0, 0, sx * 0.5] });
  {
    // Gurt: folgt dem Rumpfquerschnitt
    const [, yc, rx, ru, rd] = torsoAt(0.13);
    A(torus3(0.25, 0.018, Math.PI * 2, 4, 20), strap, { bone: 1, p: [0, yc + (ru - rd) / 2, 0.13], s: [(rx * W + 0.004) / 0.25, ((ru + rd) / 2 + 0.004) / 0.25, 1] });
  }
  for (const sx of [-1, 1]) {
    seg([sx * 0.215 * W, 1.2, -0.02], [sx * 0.29 * W, 0.86, -0.02], 0.011, 0.011, strap, { bone: 1 });
    A(torus3(0.032, 0.009, Math.PI * 2, 4, 10), steelD, { bone: 1, p: [sx * 0.29 * W, 0.83, -0.02], r: [0, Math.PI / 2, 0], shine: 1 });
  }
  if (war) {
    // Kopfplatte entlang des Gesichts mit Grat, Augenschalen und goldenem Dorn
    A(roundBox(0.15, 0.36, 0.026, 0.012), steel, { bone: 2, p: [0, 1.512, 1.143], r: [-0.81, 0, 0], shine: 1, top: lighter(steel, 0.25), topK: 0.4 });
    A(roundBox(0.028, 0.34, 0.03, 0.012), gold, { bone: 2, p: [0, 1.528, 1.158], r: [-0.81, 0, 0], shine: 1 });
    for (const sx of [-1, 1]) A(cap3(0.045, 1.2, 0, Math.PI * 2, 10, 4), steelD, { bone: 2, p: [sx * 0.095, 1.565, 0.955], r: [0, 0, -sx * Math.PI / 2], shine: 1 });
    A(horn3(0.15, 0.024, 7), gold, { bone: 2, p: [0, 1.66, 0.99], r: [0.7, 0, 0], shine: 1 });
    for (let k = -1; k <= 1; k++) strand3(A, 2, [k * 0.025, 1.73, 0.86], [k * 0.3, 1, -0.5], 0.24, 0.045, k ? '#c8302a' : '#e84a3a', { flat: 0.5 });
    // Halsschienen: sechs Lamellen über dem Kamm, je mit Seitenteilen
    for (let k = 0; k < 6; k++) {
      const q = 0.08 + k * 0.15;
      const [, y, z] = crest(q);
      const [, y2, z2] = crest(q + 0.05);
      const pitch = -Math.atan2(y2 - y, z2 - z);
      const c = k % 2 ? steelD : darker(steel, 0.08);
      A(roundBox(0.15, 0.025, 0.13, 0.012), c, { bone: 10, p: [0, y - 0.01, z], r: [pitch, 0, 0], shine: 0.9 });
      for (const sx of [-1, 1]) A(roundBox(0.025, 0.11, 0.13, 0.012), c, { bone: 10, p: [sx * 0.085, y - 0.065, z + 0.01], r: [pitch, 0, sx * 0.3], shine: 0.9, shade: 0.3 });
      A(sphere3(0.014, 6, 4), gold, { bone: 10, p: [0, y + 0.008, z], shine: 1 });
    }
    // Brustpanzer: gewölbte Schale vor der Brust mit Goldrand und Buckel
    A(cap3(1, 1.05, 0, Math.PI * 2, 20, 6), steel, { bone: 1, p: [0, 0.95, 0.35], r: [Math.PI / 2, 0, 0], s: [0.27 * W, 0.27, 0.3], shine: 1, shade: 0.25 });
    A(torus3(1, 0.035, Math.PI * 2, 4, 28), gold, { bone: 1, p: [0, 0.95, 0.35 + 0.3 * Math.cos(1.05)], s: [0.27 * W * Math.sin(1.05), 0.3 * Math.sin(1.05), 1], shine: 0.9 });
    A(sphere3(0.05, 10, 8), gold, { bone: 1, p: [0, 0.95, 0.64], shine: 1 });
    A(ball(8), '#ff6a2a', { bone: 1, p: [0, 0.95, 0.685], s: [0.022, 0.022, 0.012], mat: 'glow' });
    // Behang an den Flanken (das Tuch darüber: siehe Schabracke oben), unten Goldborte und Quasten
    const hw = (z) => Math.max(torsoAt(z)[2] * W, thighX(0.86, z), thighX(0.95, z));
    for (const sx of [-1, 1]) for (let k = 0; k < 8; k++) {
      const z = 0.2 - k * 0.11;
      const x = hw(z) + 0.022;
      const yaw = Math.atan2(hw(z + 0.05) - hw(z - 0.05), 0.1) * sx;
      A(roundBox(0.022, 0.3, 0.12, 0.01), k % 2 ? red : lighter(red, 0.06), { bone: 1, p: [sx * x, 0.86, z], r: [0, yaw, sx * 0.07], shade: 0.2 });
      A(roundBox(0.03, 0.035, 0.122, 0.012), gold, { bone: 1, p: [sx * (x + 0.012), 0.72, z], r: [0, yaw, sx * 0.07], shine: 0.9 });
      A(horn3(0.06, 0.016, 5), gold, { bone: 1, p: [sx * (x + 0.012), 0.71, z], r: [Math.PI, 0, 0], shine: 0.9 });
    }
  }
  return { rig, height: 1.8, family: 'horse', bodyY, seat: 1.29, horse3: true };
}

// Gangart des Pferdes (seit 12.0): Galopp im Viertakt (hinten links, hinten rechts, vorn links, vorn rechts,
// dann Schwebe). Jedes Bein: Stütze (Huf am Boden, Bein schwingt gleichmäßig nach hinten) und Schwung (Knie
// bzw. Sprunggelenk beugt sich, der Huf rollt ab, das Bein greift wieder nach vorn). Der Rumpf senkt und neigt
// sich so, dass die stützenden Hufe am Boden bleiben; Hals und Schweif schwingen nach. Im Stand: Kopf und
// Schweif bewegen sich, ab und zu scharrt ein Vorderhuf. hz: Galoppsprünge pro Sekunde.
const HORSE_FEET = [
  // Knochen oben, unten, Fessel, vorn?, Phase, Länge Drehpunkt–Huf, Stütze von … bis (Drehung)
  [5, 13, 17, false, 0, 1.0, -0.32, 0.5], [6, 14, 18, false, 0.1, 1.0, -0.32, 0.5],
  [3, 11, 15, true, 0.42, 0.9, -0.5, 0.45], [4, 12, 16, true, 0.52, 0.9, -0.5, 0.45]
];
const HORSE_DUTY = 0.4;
function horseGait3(h, t, dt, moving, hz) {
  const B = h.bones;
  if (!B[19]) return 0;
  const g = (h.galAmt = Math.max(0, Math.min(1, (h.galAmt || 0) + (moving ? dt * 5 : -dt * 4))));
  if (moving) h.galPh = ((h.galPh || 0) + dt * hz) % 1;
  const ph = h.galPh || 0;
  const ge = g * g * (3 - 2 * g);
  const TAU = Math.PI * 2;
  let fDrop = null, hDrop = null;
  for (const [u, l, f, front, off, len, a0, a1] of HORSE_FEET) {
    let q = ph - off;
    q -= Math.floor(q);
    let up, knee, fet;
    if (q < HORSE_DUTY) {
      const s = q / HORSE_DUTY;
      up = a0 + (a1 - a0) * s;
      knee = front ? 0 : -0.18 * Math.sin(Math.PI * s);
      fet = -(up + knee) * 0.85 - 0.25 * Math.sin(Math.PI * s);
      const drop = len * (1 - Math.cos(up));
      if (front) fDrop = fDrop == null ? drop : Math.min(fDrop, drop);
      else hDrop = hDrop == null ? drop : Math.min(hDrop, drop);
    } else {
      // Schwung als Hermite-Kurve: gleiche Geschwindigkeit wie in der Stütze an beiden Enden (kein Ruck)
      const s = (q - HORSE_DUTY) / (1 - HORSE_DUTY);
      const m = -(a1 - a0) / HORSE_DUTY * (1 - HORSE_DUTY);
      const s2 = s * s, s3 = s2 * s;
      up = (2 * s3 - 3 * s2 + 1) * a1 + (s3 - 2 * s2 + s) * m + (-2 * s3 + 3 * s2) * a0 + (s3 - s2) * m;
      const lift = Math.sin(Math.PI * Math.pow(s, front ? 0.8 : 1));
      // seit 14.38 beugt sich das Sprunggelenk im Schwung stärker (Röhrbein klappt nach vorn unter den Leib)
      knee = front ? 1.75 * lift : -1.2 * lift;
      fet = (front ? 1.1 : 0.8) * Math.sin(Math.PI * s) - (up + knee) * 0.85 * (1 - Math.sin(Math.PI * s));
    }
    B[u].rotation.x = up * ge;
    B[l].rotation.x = knee * ge;
    B[f].rotation.x = fet * ge;
  }
  // Rumpf: so tief, dass die Stützbeine den Boden halten; in der Schwebe etwas höher
  const tf = fDrop == null ? -0.04 : fDrop;
  const th = hDrop == null ? -0.04 : hDrop;
  const k = Math.min(1, dt * 18);
  if (h.galF == null) h.galF = tf;
  if (h.galH == null) h.galH = th;
  h.galF += (tf - h.galF) * k;
  h.galH += (th - h.galH) * k;
  const body = B[BQ.body];
  const sink = ((h.galF + h.galH) / 2) * ge;
  body.position.y -= sink;
  body.rotation.x = ((h.galF - h.galH) / 0.82) * ge - 0.05 * Math.sin(TAU * (ph - 0.25)) * ge;
  // Hals nickt gegen den Rumpf, Kopf hält die Richtung; Schweif hebt sich und weht nach
  const idle = 1 - ge;
  B[BQ.neck].rotation.x = ge * (0.06 + 0.13 * Math.sin(TAU * (ph - 0.55))) + idle * (0.06 + 0.05 * Math.sin(t * 0.7));
  B[BQ.head].rotation.x = -ge * 0.09 * Math.sin(TAU * (ph - 0.55)) + idle * 0.04 * Math.sin(t * 0.7 + 1);
  B[BQ.head].rotation.y = idle * 0.18 * Math.sin(t * 0.45);
  // seit 14.38 vier Schweifglieder: jedes folgt dem vorigen etwas später, der Strang schwingt weich aus
  B[BQ.tail].rotation.x = ge * (0.25 + 0.08 * Math.sin(TAU * ph));
  B[19].rotation.x = ge * (0.15 + 0.2 * Math.sin(TAU * (ph - 0.2)));
  B[BQ.tail].rotation.y = idle * 0.1 * Math.sin(t * 1.6) + ge * 0.06 * Math.sin(TAU * ph * 2);
  B[19].rotation.y = idle * 0.16 * Math.sin(t * 1.6 - 0.6) + ge * 0.08 * Math.sin(TAU * ph * 2 - 0.8);
  if (B[21]) {
    B[20].rotation.x = ge * (0.16 + 0.2 * Math.sin(TAU * (ph - 0.38)));
    B[21].rotation.x = ge * (0.12 + 0.22 * Math.sin(TAU * (ph - 0.55)));
    B[20].rotation.y = idle * 0.2 * Math.sin(t * 1.6 - 1.3) + ge * 0.09 * Math.sin(TAU * ph * 2 - 1.6);
    B[21].rotation.y = idle * 0.22 * Math.sin(t * 1.6 - 2) + ge * 0.1 * Math.sin(TAU * ph * 2 - 2.4);
  }
  if (idle > 0.01) {
    // Gewicht auf drei Beinen: ein Hinterbein ruht angewinkelt; alle paar Sekunden scharrt der rechte Vorderhuf
    B[13].rotation.x += -0.14 * idle;
    B[17].rotation.x += 0.3 * idle;
    B[5].rotation.x += 0.05 * idle;
    body.rotation.z = 0.012 * idle;
    const st = (t + (h.idleSeed || (h.idleSeed = Math.random() * 7))) % 7.3;
    if (st < 0.7) {
      const s = Math.sin(Math.PI * (st / 0.7));
      B[4].rotation.x += -0.25 * s * idle;
      B[12].rotation.x += 1.3 * s * idle;
      B[16].rotation.x += 0.7 * s * idle;
    }
  }
  return sink;
}

// --- Spinne, Skorpion, Geist, Schlange, Naga, Golem ------------------------------------------------

// Spinne (seit 7.9): glänzender Panzer mit Rillen, Haare und helle Gelenkringe an den Beinen, Augenpaare mit
// Glanzpunkt, Gift an den Kieferklauen. o.legs / o.abd: Länge der Beine bzw. Größe des Hinterleibs je Art.
function spider3(b, o) {
  const A = adder(b, null);
  const legC = darker(o.body, 0.25);
  const L = o.legs || 1;
  const ab = o.abd || 1;
  const bodyY = 0.42;
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.02, 0.28], 1]];
  for (let k = 0; k < 8; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.22 - Math.floor(k / 2) * 0.12], 1]);
  const rig = rigOf(list);
  // Hinterleib: glänzend, oben heller, mit Querbändern und Zeichnung (leuchtet bei Höhlenspinnen)
  const az = -0.34 - (ab - 1) * 0.2;
  const markMat = o.glowMark ? 'glow' : 'lit';
  A(ball(16), o.body, { bone: 1, p: [0, bodyY + 0.1 * ab, az], s: [0.36 * ab, 0.31 * ab, 0.43 * ab * (o.egg || 1)], shade: 0.25, shine: 0.5, top: lighter(o.body, 0.18), topK: 0.5 });
  for (let k = 0; k < 3; k++) A(torus3((0.3 - k * 0.04) * ab, 0.025, Math.PI, 4, 12), o.mark, { bone: 1, p: [0, bodyY + 0.12 * ab, az + (0.14 - k * 0.14) * ab], r: [0, Math.PI / 2, 0], mat: markMat });
  A(ball(10), o.mark, { bone: 1, p: [0, bodyY + 0.37 * ab, az - 0.02], s: [0.13 * ab, 0.05, 0.16 * ab], mat: markMat });
  // Keilzeichnung bzw. Kronenmuster auf dem Rücken des Hinterleibs
  for (let k = 0; k < 3; k++) A(roundBox(0.05 * ab, 0.02, 0.12 * ab, 0.01), o.mark, { bone: 1, p: [(k - 1) * 0.07 * ab, bodyY + 0.36 * ab - Math.abs(k - 1) * 0.03, az - 0.16 * ab - Math.abs(k - 1) * 0.04], r: [0.25, 0, (k - 1) * 0.5], mat: markMat, noShadow: true });
  // Sprenkel (Giftspeierin)
  if (o.speckle) for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const u = 0.35 + ((k * 37) % 9) / 18;
    A(sphere3(0.026, 6, 4), o.speckle, { bone: 1, p: [Math.cos(a) * 0.3 * ab * u, bodyY + 0.12 * ab + 0.28 * ab * Math.sqrt(1 - u * u), az + Math.sin(a) * 0.36 * ab * u], mat: 'glow', noShadow: true });
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    A(horn3(0.08, 0.016, 4), legC, { bone: 1, p: [Math.cos(a) * 0.33 * ab, bodyY + (0.12 + Math.sin(k) * 0.1) * ab, az + Math.sin(a) * 0.36 * ab], r: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2], noShadow: true });
  }
  // Kopfbruststück: glänzender Panzer mit Rillen, die von der Mitte ausgehen; Augenhügel, Klauen
  A(ball(14), lighter(o.body, 0.08), { bone: 1, p: [0, bodyY + 0.02, 0.12], s: [0.22, 0.18, 0.24], shade: 0.2, shine: 0.6, top: lighter(o.body, 0.25), topK: 0.4 });
  for (const a of [-1.1, -0.4, 0.4, 1.1]) A(box3(), darker(o.body, 0.35), { bone: 1, p: [Math.sin(a) * 0.09, bodyY + 0.18, 0.1 + Math.cos(a) * 0.02], r: [0.15, a, 0], noShadow: true, s: [0.016, 0.012, 0.13] });
  A(ball(12), lighter(o.body, 0.12), { bone: 2, p: [0, bodyY + 0.06, 0.32], s: [0.13, 0.11, 0.1], shine: 0.5 });
  const eyes = [[-0.05, 0.1, 1.2], [0.05, 0.1, 1.2], [-0.1, 0.07, 0.8], [0.1, 0.07, 0.8], [-0.03, 0.15, 0.7], [0.03, 0.15, 0.7], [-0.13, 0.12, 0.6], [0.13, 0.12, 0.6]];
  for (const [x, y, s] of eyes) A(sphere3(0.022 * s, 7, 5), o.eye, { bone: 2, p: [x, bodyY + y, 0.4], mat: 'glow' });
  for (const [x, y, s] of eyes.slice(0, 4)) A(sphere3(0.007 * s, 6, 4), '#ffffff', { bone: 2, p: [x - 0.006, bodyY + y + 0.009 * s, 0.4 + 0.017 * s], mat: 'glow' });
  // Chitinkrone um die Augen (Spinnenkönigin)
  if (o.crownSpikes) for (let k = 0; k < 6; k++) {
    const a = -1.2 + (k / 5) * 2.4;
    A(horn3(0.16 - Math.abs(a) * 0.03, 0.03, 5), o.crownSpikes, { bone: 2, p: [Math.sin(a) * 0.12, bodyY + 0.13, 0.32 - Math.cos(a) * 0.04], r: [-0.4, 0, -a * 0.5], shine: 0.6 });
  }
  for (const sx of [-1, 1]) {
    limbBetween(A, [sx * 0.05, bodyY - 0.02, 0.38], [sx * 0.04, bodyY - 0.12, 0.46], 0.03, 0.02, '#2a2018', { bone: 2 });
    A(horn3(0.08, 0.02, 5), '#e8e0cc', { bone: 2, p: [sx * 0.04, bodyY - 0.12, 0.46], r: [Math.PI - 0.6, 0, 0], shine: 0.6 });
    // Gifttropfen an der Klauenspitze
    A(sphere3(0.018, 6, 4), o.venom || o.mark, { bone: 2, p: [sx * 0.04, bodyY - 0.19, 0.5], s: [1, 1.4, 1], mat: 'glow' });
  }
  // Beine: drei Glieder, Gelenkkugeln mit hellem Ring, Haare am Oberschenkel
  const joint = o.joint || lighter(o.body, 0.35);
  for (let k = 0; k < 8; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.22 - row * 0.12;
    const spread = [0.75, 0.25, -0.25, -0.75][row];
    const knee = [sx * 0.5 * L, bodyY + 0.26 * (0.6 + 0.4 * L), z + spread * 0.42 * L];
    const ankle = [sx * 0.7 * L, 0.16, z + spread * 0.72 * L];
    const foot = [sx * 0.8 * L, 0.02, z + spread * 0.85 * L];
    const th = o.legR || 1;
    const bone = 3 + k;
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.048 * th, 0.04 * th, legC, { bone, seg: 6 });
    limbBetween(A, knee, ankle, 0.04 * th, 0.03 * th, legC, { bone, seg: 6 });
    limbBetween(A, ankle, foot, 0.03 * th, 0.015 * th, o.body, { bone, seg: 6 });
    A(sphere3(0.045 * th, 7, 5), o.body, { bone, p: knee, shine: 0.4 });
    A(sphere3(0.034 * th, 7, 5), legC, { bone, p: ankle });
    A(torus3(0.036 * th, 0.012, Math.PI * 2, 3, 8), joint, { bone, p: [knee[0] * 0.92, knee[1] - 0.02, knee[2] * 0.92 + z * 0.08], r: [Math.PI / 2, 0, sx * 0.6], noShadow: true });
    for (const u of [0.35, 0.7]) {
      const h = [sx * 0.14 + (knee[0] - sx * 0.14) * u, bodyY + (knee[1] - bodyY) * u + 0.03, z + (knee[2] - z) * u];
      A(horn3(0.07 * th, 0.012, 3), legC, { bone, p: h, r: [spread * 0.4, 0, -sx * 0.5], noShadow: true });
    }
  }
  // Eikokons und Netzfäden am Hinterleib (Spinnenkönigin)
  if (o.cocoons) for (const [x, z] of [[-0.18, -0.12], [0.16, -0.2], [0, -0.3]]) {
    const p = [x * ab, bodyY - 0.12, az + z * ab - 0.1];
    limbBetween(A, [x * ab * 0.8, bodyY + 0.02, az + z * ab * 0.8], p, 0.006, 0.006, '#e8e8f0', { bone: 1, seg: 3, noShadow: true });
    A(ball(8), '#ece6dc', { bone: 1, p: [p[0], p[1] - 0.05, p[2]], s: [0.05, 0.07, 0.05], shade: 0.2, noShadow: true });
  }
  return { rig, height: bodyY + 0.45 * ab, family: 'spider', bodyY, ab, az };
}

// Skorpion (seit 7.9 mit dunklen Plattenkanten, Kopfschild mit Augenpunkten, gezähnten Scheren, Ringen am
// Schwanz und vier Beinpaaren; das vierte Paar hängt an den Knochen des dritten)
function scorpion3(b, o) {
  const A = adder(b, null);
  const bodyY = 0.3;
  const shell = darker(o.body, 0.12);
  const rim = darker(o.body, 0.4);
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY, 0.32], 1], [[0, bodyY + 0.05, -0.3], 1]];
  for (let k = 0; k < 6; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.12 - Math.floor(k / 2) * 0.14], 1]);
  const rig = rigOf(list);
  // Rumpf aus überlappenden Panzerplatten mit dunkler Kante und Mittelgrat
  for (let k = 0; k < 4; k++) {
    const z = 0.18 - k * 0.14;
    const w = 0.27 - k * 0.02;
    A(ball(14), k % 2 ? o.body : shell, { bone: 1, p: [0, bodyY + 0.02, z], s: [w, 0.13, 0.12], shade: 0.25, shine: 0.5, top: lighter(o.body, 0.15), topK: 0.4 });
    A(torus3(w * 0.92, 0.014, Math.PI, 3, 10), rim, { bone: 1, p: [0, bodyY + 0.02, z - 0.085], s: [1, 0.5, 1], noShadow: true });
  }
  A(box3(), lighter(o.body, 0.2), { bone: 1, p: [0, bodyY + 0.145, -0.02], shine: 0.6, noShadow: true, s: [0.03, 0.02, 0.5] });
  // Kopfschild mit zwei schwarzen Mittelaugen und seitlichen Augenpunkten
  A(ball(12), shell, { bone: 1, p: [0, bodyY + 0.04, 0.27], s: [0.17, 0.09, 0.1], shine: 0.5, top: lighter(o.body, 0.2), topK: 0.5 });
  // Schwanz aus Gliedern, die nach oben einrollen, mit dunklen Ringen und leuchtendem Stachel
  let prev = [0, bodyY + 0.06, -0.32];
  for (let k = 0; k < 5; k++) {
    const a = 0.4 + k * 0.42;
    const next = [0, bodyY + 0.06 + Math.sin(a) * 0.16 * (k + 1) * 0.55, -0.32 - Math.cos(a) * 0.14 * (k + 1) * 0.5];
    const r = 0.1 - k * 0.008;
    A(ball(10), k % 2 ? o.body : shell, { bone: 3, p: next, s: [r, 0.09 - k * 0.008, r], shine: 0.5, top: lighter(o.body, 0.15), topK: 0.4 });
    A(torus3(r * 0.85, 0.012, Math.PI * 2, 3, 10), rim, { bone: 3, p: [(prev[0] + next[0]) / 2, (prev[1] + next[1]) / 2, (prev[2] + next[2]) / 2], r: [a, 0, 0], noShadow: true });
    prev = next;
  }
  A(ball(10), o.sting, { bone: 3, p: [0, prev[1] + 0.06, prev[2] + 0.08], s: [0.07, 0.09, 0.07], mat: 'glow' });
  A(horn3(0.17, 0.035, 6), '#2a2018', { bone: 3, p: [0, prev[1] + 0.06, prev[2] + 0.12], r: [2.4, 0, 0], shine: 0.8 });
  A(sphere3(0.022, 6, 4), lighter(o.sting, 0.4), { bone: 3, p: [0, prev[1] + 0.02, prev[2] + 0.25], mat: 'glow' });
  // Scheren: Arm, Schere oben und beweglicher Finger, Zähne an der Innenkante
  for (const sx of [-1, 1]) {
    limbBetween(A, [sx * 0.15, bodyY, 0.22], [sx * 0.28, bodyY + 0.04, 0.42], 0.05, 0.045, o.body, { bone: 2, shine: 0.4 });
    A(ball(12), shell, { bone: 2, p: [sx * 0.3, bodyY + 0.05, 0.56], s: [0.08, 0.06, 0.13], shine: 0.5, top: lighter(o.body, 0.2), topK: 0.4 });
    A(horn3(0.14, 0.035, 6), o.body, { bone: 2, p: [sx * 0.33, bodyY + 0.06, 0.64], r: [Math.PI / 2, 0, -sx * 0.25], shine: 0.4 });
    A(horn3(0.12, 0.03, 6), shell, { bone: 2, p: [sx * 0.27, bodyY + 0.03, 0.64], r: [Math.PI / 2, 0, sx * 0.3] });
    for (let k = 0; k < 3; k++) A(horn3(0.025, 0.008, 3), '#f0e8d4', { bone: 2, p: [sx * (0.3 - k * 0.006), bodyY + 0.05, 0.67 + k * 0.03], r: [0, 0, sx * 1.4], noShadow: true });
    A(sphere3(0.025, 7, 5), '#2a1a0a', { bone: 1, p: [sx * 0.04, bodyY + 0.13, 0.28], shine: 0.9 });
    for (const dz of [0, 0.025]) A(sphere3(0.012, 6, 4), '#2a1a0a', { bone: 1, p: [sx * 0.14, bodyY + 0.08, 0.3 + dz], shine: 0.9 });
  }
  // vier Beinpaare mit dunklen Spitzen
  for (let k = 0; k < 8; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.12 - row * 0.12;
    const bone = 4 + (row < 3 ? k : k - 2);
    const fw = 1 - row * 0.45;
    const knee = [sx * 0.36, bodyY + 0.1, z + fw * 0.12];
    const foot = [sx * 0.52, 0.02, z + fw * 0.22];
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.035, 0.03, shell, { bone, seg: 6 });
    limbBetween(A, knee, foot, 0.03, 0.016, shell, { bone, seg: 6 });
    A(sphere3(0.034, 6, 4), o.body, { bone, p: knee, shine: 0.4 });
    A(horn3(0.05, 0.014, 4), rim, { bone, p: foot, r: [Math.PI, 0, -sx * 0.3], noShadow: true });
  }
  return { rig, height: bodyY + 0.9, family: 'scorpion', bodyY };
}

// Geist (seit 7.9, seit 13.8 neue Gestalt): eine schwebende Gestalt statt einer runden Säule – breite Schultern,
// schmale Taille, darunter ein zerfetzter Saum, der in einen langen, geschwungenen Nebelschweif ausläuft.
// Spitze Kapuze mit dunklem Gesicht und glühenden Augen, Glockenärmel mit langen Krallen, durchscheinender Schleier.
// Je Art ein Mundspalt mit Schneeflocken (Frostgeist), ein Schlundmaul (Seelenfresser) oder Frostbart und Krone (Eiskönig).
function ghost3(b, o) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.75, 0], 1], [[0, 1.05, 0], 2], [[0.27, 1.02, 0], 2], [[-0.27, 1.02, 0], 2]]);
  const pale = lighter(o.body, 0.28);
  const deep = darker(o.body, 0.22);
  // Oberkörper: schmale Taille, Brust, breite Schultern (Profil von unten nach oben)
  A(lathe3('wraith3', [[0, 0.46], [0.12, 0.48], [0.17, 0.56], [0.16, 0.68], [0.2, 0.82], [0.26, 0.94], [0.29, 1.02], [0.22, 1.09], [0.1, 1.12], [0, 1.13]], 18), o.body, { bone: 2, shade: 0.12, top: pale, topK: 0.45 });
  // Schulterumhang: flacher Kragen, der über die Schultern fällt
  A(lathe3('wraithcape', [[0.31, 0.9], [0.33, 0.96], [0.3, 1.04], [0.2, 1.1], [0.12, 1.12]], 16), deep, { bone: 2, shade: 0.2 });
  // zerfetzter Saum unter der Taille: spitze Fetzen in zwei Lagen, außen durchscheinend
  for (let k = 0; k < 14; k++) {
    const an = (k / 14) * Math.PI * 2;
    const len = 0.22 + ((k * 7) % 5) * 0.05;
    A(horn3(len, 0.07, 5), k % 2 ? o.body : deep, { bone: 1, p: [Math.cos(an) * 0.15, 0.56, Math.sin(an) * 0.15], r: [Math.PI + Math.sin(an) * 0.35, 0, -Math.cos(an) * 0.35], shade: 0.1 });
    if (k % 2) A(horn3(len * 0.8, 0.05, 4), pale, { bone: 1, p: [Math.cos(an + 0.2) * 0.2, 0.5, Math.sin(an + 0.2) * 0.2], r: [Math.PI + Math.sin(an) * 0.5, 0, -Math.cos(an) * 0.5], mat: 'aura' });
  }
  // Nebelschweif: läuft nach hinten unten aus und dreht sich leicht ein
  const tail = [[0, 0.5, 0], [0.02, 0.36, -0.06], [0.06, 0.22, -0.18], [0.02, 0.12, -0.32], [-0.06, 0.1, -0.44], [-0.1, 0.16, -0.52]];
  A(tubeProfile3(tail, [0.15, 0.12, 0.085, 0.055, 0.03, 0.006], 24, 10), o.body, { bone: 1, shade: 0.1, top: pale, topK: 0.5 });
  A(tubeProfile3(tail, [0.19, 0.15, 0.11, 0.07, 0.04, 0.01], 24, 10), pale, { bone: 1, mat: 'aura' });
  // Seelenfunken entlang des Schweifs
  tail.slice(1, 5).forEach((q, k) => A(sphere3(0.022 - (k % 2) * 0.006, 6, 4), k % 2 ? o.eye : '#ffffff', { bone: 1, p: [q[0] + (k % 2 ? 0.12 : -0.12), q[1] + 0.04, q[2]], mat: 'glow' }));
  // Kapuze: hinten rund, vorne offen, mit nach hinten gebogener Spitze; darin ein dunkles Gesicht
  A(cap3(0.2, Math.PI * 0.62, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8), o.body, { bone: 3, p: [0, 1.2, -0.01], s: [1, 1.12, 1.05], shade: 0.15, top: pale, topK: 0.35, noShadow: true });
  A(tube3([[0, 1.36, -0.04], [0, 1.46, -0.1], [0, 1.5, -0.2], [0, 1.47, -0.28]], 0.1, 0.012, 12, 8), o.body, { bone: 3, shade: 0.15, noShadow: true });
  A(torus3(0.17, 0.035, Math.PI * 1.1, 5, 14), deep, { bone: 3, p: [0, 1.22, 0.08], r: [0.2, 0, Math.PI * 0.95], noShadow: true });
  A(ball(14), '#0a1220', { bone: 3, p: [0, 1.19, 0.05], s: [0.15, o.maw ? 0.2 : 0.17, 0.14], noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(10), o.eye, { bone: 3, p: [sx * 0.06, 1.21, 0.17], s: [0.04, 0.03, 0.02], r: [0, 0, sx * -0.35], mat: 'glow' });
    A(ball(8), o.eye, { bone: 3, p: [sx * 0.06, 1.21, 0.165], s: [0.07, 0.055, 0.02], r: [0, 0, sx * -0.35], mat: 'aura' });
    A(sphere3(1, 6, 4), '#ffffff', { bone: 3, p: [sx * 0.06 - 0.01, 1.22, 0.19], s: [0.012, 0.012, 0.006], mat: 'glow' });
    // Arm mit Glockenärmel und langen Krallen
    const bone = sx > 0 ? 4 : 5;
    limbBetween(A, [sx * 0.27, 1.02, 0], [sx * 0.4, 0.8, 0.12], 0.07, 0.055, o.body, { bone, top: pale, topK: 0.4 });
    A(horn3(0.22, 0.11, 10), deep, { bone, p: [sx * 0.42, 0.66, 0.15], r: [0, 0, 0], s: [1, 1, 1], shade: 0.15 });
    A(horn3(0.24, 0.13, 10), pale, { bone, p: [sx * 0.43, 0.63, 0.15], mat: 'aura' });
    const fingers = o.longFingers ? 0.2 : 0.14;
    for (let k = -1; k <= 1; k++) A(horn3(fingers, 0.018, 4), o.iceFingers || pale, { bone, p: [sx * 0.43 + k * 0.025, 0.67, 0.16], r: [Math.PI + 0.25, 0, k * 0.28 + sx * 0.15], shine: o.iceFingers ? 1 : 0.3 });
  }
  if (o.maw) {
    // weit offenes Schlundmaul, darin kreisen kleine Seelenlichter
    A(ball(10), '#1a0820', { bone: 3, p: [0, 1.1, 0.14], s: [0.08, 0.09, 0.05] });
    for (let k = 0; k < 3; k++) A(sphere3(0.018, 6, 4), k % 2 ? '#ffffff' : o.eye, { bone: 3, p: [Math.cos(k * 2.1) * 0.035, 1.1 + Math.sin(k * 2.1) * 0.035, 0.18], mat: 'glow' });
    for (let k = -2; k <= 2; k++) A(horn3(0.035, 0.01, 3), '#e8e0f0', { bone: 3, p: [k * 0.025, 1.16, 0.17], r: [Math.PI, 0, 0], noShadow: true });
  } else A(box3(), '#0a1220', { bone: 3, p: [0, 1.13, 0.18], s: [0.06, 0.012, 0.012] });
  if (o.beard) {
    // langer, wehender Bart aus Frostnebel
    for (let k = -1; k <= 1; k++) A(horn3(0.38 - Math.abs(k) * 0.1, 0.06, 5), k ? o.beard : lighter(o.beard, 0.3), { bone: 3, p: [k * 0.05, 1.12, 0.15], r: [Math.PI - 0.35, 0, k * 0.25], mat: 'aura' });
  }
  if (o.snow) for (let k = 0; k < 4; k++) {
    // Schneeflocken kreisen um den Leib
    const an = (k / 4) * Math.PI * 2 + 0.8;
    for (let j = 0; j < 3; j++) A(box3(), '#ffffff', { bone: 1, p: [Math.cos(an) * 0.45, 0.55 + (k % 2) * 0.25, Math.sin(an) * 0.45], r: [0, an, j * Math.PI / 3], mat: 'glow', s: [0.06, 0.012, 0.012] });
  }
  if (o.crown) {
    const glow = o.crown === '#ffffff' ? 'lit' : 'glow';
    if (o.crownRing) A(torus3(0.17, 0.035, Math.PI * 2, 4, 14), o.crown, { bone: 3, p: [0, 1.4, 0], r: [Math.PI / 2, 0, 0], mat: glow, shine: 1 });
    for (let k = -2; k <= 2; k++) A(horn3(0.14 - Math.abs(k) * 0.025, 0.035, 6), o.crown, { bone: 3, p: [k * 0.07, 1.4, 0.05 - Math.abs(k) * 0.02], mat: glow, shine: 1 });
    if (o.crownRing) for (let k = 0; k < 4; k++) A(horn3(0.1, 0.022, 4), '#bfe8ff', { bone: 3, p: [Math.sin(k * 1.6 + 0.8) * 0.16, 1.4, Math.cos(k * 1.6 + 0.8) * 0.16], shine: 1 });
  }
  return { rig, height: 1.55, family: 'ghost', bodyY: 0.45 };
}

// Schlange als ein glatter, biegsamer Schlauch: jeder Eckpunkt hängt weich an zwei Gliedern,
// Muster und hellerer Bauch als Eckenfarben. Seit 7.9 mit Bauchschuppen (Querplatten in zwei Tönen) und
// Rückenmuster je Art: Querbänder, Querflecken (Viper), Rauten mit hellem Rand (Klapperschlange),
// unregelmäßige Sattelflecken (Python).
function serpentBody(o, segs) {
  const pat = o.pattern || 'bands';
  const key = `snake2:${o.body}:${o.belly}:${o.mark}:${segs}:${pat}`;
  return geo3(key, () => {
    const pts = [];
    for (let k = 0; k <= segs; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.9) * 0.08, 0.13, 0.42 - k * 0.16));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubular = segs * 8;
    const radial = 12;
    const g = new THREE.TubeGeometry(curve, tubular, 0.13, radial, false);
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const si = new Uint8Array(pos.count * 4);
    const sw = new Float32Array(pos.count * 4);
    const cb = new THREE.Color(o.body);
    const cm = new THREE.Color(o.mark);
    const cl = new THREE.Color(o.belly);
    const cl2 = new THREE.Color(darker(o.belly, 0.14));
    const crim = new THREE.Color(lighter(o.body, 0.35));
    const p = new THREE.Vector3();
    const frac = (v) => v - Math.floor(v);
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radial + 1));
      const u = ring / tubular;
      // dicker in der Mitte, dünne Schwanzspitze
      const taper = u < 0.15 ? 0.85 + u : 1 - Math.pow(Math.max(0, u - 0.35) / 0.65, 1.4) * 0.85;
      curve.getPointAt(u, p);
      const x = p.x + (pos.getX(i) - p.x) * taper;
      const y = p.y + (pos.getY(i) - p.y) * taper * 0.85;
      const z = p.z + (pos.getZ(i) - p.z) * taper;
      pos.setXYZ(i, x, Math.max(0.01, y), z);
      // Winkel um den Leib: 0 oben auf dem Rücken, π unten am Bauch
      const th = Math.abs(Math.atan2(nor.getX(i), nor.getY(i)));
      const f = u * segs;
      let c = cb;
      if (th > 2.15) c = ring % 2 ? cl : cl2;
      else if (pat === 'diamond') {
        const d = Math.abs(frac(f * 1.2) - 0.5) * 2 + th / 1.4;
        c = d < 0.6 ? cm : d < 0.85 ? crim : cb;
      } else if (pat === 'spots') {
        const q = Math.abs(frac(f * 1.5) - 0.5);
        c = (q < 0.2 && th < 0.8) || (q > 0.36 && th > 1.2 && th < 1.7) ? cm : cb;
      } else if (pat === 'saddle') {
        c = Math.sin(f * Math.PI * 1.1 + Math.sin(u * 17) * 0.9) > 0.15 && th < 1.15 + 0.45 * Math.sin(u * 23) ? cm : cb;
      } else if (Math.sin(f * Math.PI * 1.5) > 0.55) c = cm;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      const k0 = Math.min(segs - 1, Math.floor(f));
      const t = Math.min(1, f - k0);
      si[i * 4] = 1 + k0;
      si[i * 4 + 1] = 1 + Math.min(segs - 1, k0 + 1);
      sw[i * 4] = 1 - t;
      sw[i * 4 + 1] = t;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.computeVertexNormals();
    return g;
  });
}

function serpent3(b, o, naga) {
  const A = adder(b, null);
  const segs = 7;
  const list = [[[0, 0, 0], -1]];
  for (let k = 0; k < segs; k++) list.push([[Math.sin(k * 0.9) * 0.08, 0.13, 0.42 - k * 0.16], k === 0 ? 0 : k]);
  const rig = rigOf(list);
  A(serpentBody(o, segs), null, { shade: 0.15, shine: 0.35 });
  if (o.rattle) for (let k = 0; k < 4; k++) A(ball(8), k % 2 ? '#c8b080' : '#e8d0a0', { bone: segs, p: [Math.sin(segs * 0.9) * 0.08, 0.14, 0.42 - segs * 0.16 - 0.04 - k * 0.05], s: [0.05 - k * 0.007, 0.036 - k * 0.003, 0.032], shine: 0.5 });
  if (naga) {
    // Oberkörper mit Rüstung, Kopf mit Haaren, Kopfputz und Waffe
    const nb = 1;
    A(lathe3('nagatorso2', [[0, 0], [0.17, 0], [0.2, 0.15], [0.19, 0.32], [0.1, 0.4], [0, 0.41]], 14), o.skin, { bone: nb, p: [0, 0.2, 0.42], shade: 0.15 });
    A(roundBox(0.4, 0.2, 0.27, 0.08), o.armor, { bone: nb, p: [0, 0.44, 0.44], top: lighter(o.armor, 0.2), topK: 0.4, shine: 0.8 });
    A(torus3(0.17, 0.02, Math.PI * 2, 4, 16), o.trim, { bone: nb, p: [0, 0.34, 0.44], r: [Math.PI / 2, 0, 0], shine: 0.8 });
    // Schuppengürtel am Übergang zum Schlangenleib
    A(torus3(0.18, 0.03, Math.PI * 2, 4, 16), o.mark, { bone: nb, p: [0, 0.22, 0.42], r: [Math.PI / 2, 0, 0], shine: 0.5 });
    for (const sx of [-1, 1]) A(cap3(0.1, Math.PI * 0.5), o.armor, { bone: nb, p: [sx * 0.2, 0.58, 0.44], r: [0, 0, -sx * 0.4], shine: 0.8 });
    const hc = [0, 0.86, 0.46];
    const hr = 0.24;
    // Kobrahaube als Kopfputz (Priesterin), hohe Haubenkrone (Königin) oder ein Kranz aus fünf Hauben (Vritra)
    if (o.hoods) for (let k = -2; k <= 2; k++) {
      const a = k * 0.42;
      const hp = [hc[0] + Math.sin(a) * hr * 1.5, hc[1] + Math.cos(a) * hr * 1.35 - hr * 0.2, hc[2] - hr * 0.7];
      A(ball(10), o.body, { bone: nb, p: hp, s: [hr * 0.42, hr * 0.55, hr * 0.12], r: [0, 0, -a], top: lighter(o.body, 0.2), topK: 0.4 });
      A(ball(8), o.belly, { bone: nb, p: [hp[0], hp[1], hp[2] + hr * 0.08], s: [hr * 0.3, hr * 0.42, hr * 0.06], r: [0, 0, -a] });
      for (const sx of [-1, 1]) A(sphere3(hr * 0.05, 6, 4), o.eye, { bone: nb, p: [hp[0] + Math.cos(a) * sx * hr * 0.12, hp[1] + hr * 0.3, hp[2] + hr * 0.13], mat: 'glow' });
    } else if (o.hoodCrown) {
      const big = o.hoodCrown;
      A(ball(12), o.body, { bone: nb, p: [hc[0], hc[1] + hr * 0.25 * big, hc[2] - hr * 0.55], s: [hr * 0.95 * big, hr * 0.9 * big, hr * 0.14], top: lighter(o.body, 0.2), topK: 0.4 });
      A(ball(10), o.belly, { bone: nb, p: [hc[0], hc[1] + hr * 0.25 * big, hc[2] - hr * 0.46], s: [hr * 0.75 * big, hr * 0.72 * big, hr * 0.08] });
      A(torus3(hr * 0.9 * big, hr * 0.05, Math.PI * 1.3, 4, 16), o.trim, { bone: nb, p: [hc[0], hc[1] + hr * 0.25 * big, hc[2] - hr * 0.48], r: [0, 0, -Math.PI * 0.15], shine: 1 });
    }
    A(ball(16), o.skin, { bone: nb, p: hc, s: [hr, hr * 0.95, hr * 0.96] });
    face3(A, nb, hc, hr, { eyeColor: o.eye, angry: true, skin: o.skin, blush: false, hairColor: o.hair });
    hair3(A, nb, hc, hr, 2, o.hair, false);
    if (o.crownHorns !== false) for (let k = -2; k <= 2; k++) A(horn3(0.12 - Math.abs(k) * 0.02, 0.025, 5), '#e8c84a', { bone: nb, p: [hc[0] + k * 0.06, hc[1] + 0.24, hc[2] + 0.06], shine: 1 });
    else A(torus3(hr * 1.02, hr * 0.06, Math.PI * 2, 4, 18), o.trim, { bone: nb, p: [hc[0], hc[1] + hr * 0.35, hc[2]], r: [Math.PI / 2 - 0.15, 0, 0], shine: 0.8 });
    for (const sx of [-1, 1]) {
      limbBetween(A, [sx * 0.2, 0.58, 0.44], [sx * 0.3, 0.4, 0.6], 0.05, 0.04, o.skin, { bone: nb });
      // Armreife
      A(torus3(0.05, 0.012, Math.PI * 2, 3, 10), o.trim, { bone: nb, p: [sx * 0.28, 0.44, 0.57], r: [Math.PI / 2 - 0.9, 0, sx * 0.4], shine: 1, noShadow: true });
    }
    if (o.staff) {
      A(limb3(1.1, 0.025, 0.022, 6), '#5a3f2a', { bone: nb, p: [-0.3, 0.95, 0.6] });
      A(sphere3(0.07, 10, 8), o.staff, { bone: nb, p: [-0.3, 1.0, 0.6], mat: 'glow' });
      A(torus3(0.085, 0.012, Math.PI * 2, 3, 12), o.trim, { bone: nb, p: [-0.3, 1.0, 0.6], r: [Math.PI / 2, 0, 0], shine: 1 });
      for (let k = 0; k < 3; k++) A(horn3(0.08, 0.016, 4), o.trim, { bone: nb, p: [-0.3 + Math.cos(k * 2.1) * 0.07, 0.96, 0.6 + Math.sin(k * 2.1) * 0.07], r: [Math.sin(k * 2.1) * 0.5, 0, -Math.cos(k * 2.1) * 0.5], shine: 1, noShadow: true });
    } else {
      A(limb3(1.0, 0.022, 0.02, 6), '#8a6a3a', { bone: nb, p: [-0.3, 0.9, 0.6], r: [0.3, 0, 0] });
      for (const dx of [-0.05, 0, 0.05]) A(horn3(0.12, 0.02, 5), '#d9dde2', { bone: nb, p: [-0.3 + dx, 0.9, 0.62], shine: 1 });
      A(torus3(0.06, 0.012, Math.PI * 2, 3, 10), o.trim, { bone: nb, p: [-0.3, 0.88, 0.61], r: [Math.PI / 2 - 0.3, 0, 0], shine: 1, noShadow: true });
    }
    return { rig, height: 1.12, family: 'serpent', bodyY: 0.12, naga: true };
  }
  // Kopf: aufgerichteter Hals, Schädel mit Kopfschild, Schlitzaugen mit Glanzpunkt, gespaltene Zunge, Haube.
  // Viper und Klapperschlange mit breitem Dreieckskopf, Python mit schmalem, stumpfem Kopf
  const hb = 1;
  const hc = [0, 0.52, 0.5];
  const viper = o.head === 'viper';
  const hw = viper ? 1.15 : o.head === 'python' ? 0.85 : 1;
  limbBetween(A, [0, 0.16, 0.38], [0, 0.48, 0.46], 0.12, 0.1 * Math.min(1, hw), o.body, { bone: hb });
  A(ball(14), o.body, { bone: hb, p: [0, hc[1], hc[2] - (viper ? 0.03 : 0)], s: [0.14 * hw, 0.1, viper ? 0.15 : 0.19], shine: 0.4, top: lighter(o.body, 0.12), topK: 0.4 });
  if (viper) A(ball(12), o.body, { bone: hb, p: [0, hc[1] - 0.01, hc[2] + 0.1], s: [0.1, 0.08, 0.13], shine: 0.4, top: lighter(o.body, 0.12), topK: 0.4 });
  A(ball(12), o.belly, { bone: hb, p: [0, hc[1] - 0.05, hc[2] + 0.05], s: [0.11 * hw, 0.05, 0.16] });
  // Kopfschild aus großen Schuppen
  A(ball(10), lighter(o.body, 0.1), { bone: hb, p: [0, hc[1] + 0.07, hc[2] + 0.04], s: [0.075 * hw, 0.03, 0.11], shine: 0.7, noShadow: true });
  A(ball(8), o.mark, { bone: hb, p: [0, hc[1] + 0.065, hc[2] - 0.08], s: [0.06 * hw, 0.03, 0.06], noShadow: true });
  for (const sx of [-1, 1]) {
    const ep = [sx * 0.085 * hw, hc[1] + 0.035, hc[2] + 0.09];
    A(ball(8), o.eye, { bone: hb, p: ep, s: [0.032, 0.03, 0.025], mat: 'glow' });
    A(ball(6), '#120c08', { bone: hb, p: [ep[0] + sx * 0.005, ep[1], ep[2] + 0.02], s: [0.006, 0.024, 0.008] });
    A(sphere3(0.007, 6, 4), '#ffffff', { bone: hb, p: [ep[0] - sx * 0.006, ep[1] + 0.012, ep[2] + 0.022], mat: 'glow' });
    // Lippenlinie, Wärmegruben, Hornschuppen über den Augen (Hornviper)
    A(box3(), darker(o.body, 0.4), { bone: hb, p: [sx * 0.1 * hw, hc[1] - 0.035, hc[2] + 0.08], r: [0, sx * 0.25, 0], noShadow: true, s: [0.008, 0.008, 0.16] });
    if (o.pits) A(sphere3(0.011, 6, 4), '#1a1410', { bone: hb, p: [sx * 0.06 * hw, hc[1] + 0.005, hc[2] + 0.2] });
    if (o.browHorns) A(horn3(0.07, 0.018, 4), o.mark, { bone: hb, p: [ep[0], ep[1] + 0.03, ep[2] - 0.01], r: [-0.3, 0, -sx * 0.25], shine: 0.4 });
  }
  if (o.hood) {
    // Haube mit dunkler Brillenzeichnung auf der Rückseite
    A(ball(14), o.hood, { bone: hb, p: [0, 0.4, 0.4], s: [0.32, 0.27, 0.05] });
    A(ball(12), o.body, { bone: hb, p: [0, 0.41, 0.375], s: [0.3, 0.25, 0.04] });
    for (const sx of [-1, 1]) A(torus3(0.05, 0.014, Math.PI * 2, 3, 10), o.mark, { bone: hb, p: [sx * 0.09, 0.45, 0.352], s: [1, 1.2, 1], noShadow: true });
    for (let k = 0; k < 3; k++) A(box3(), o.mark, { bone: hb, p: [0, 0.3 - k * 0.05, 0.43], noShadow: true, s: [0.24 - k * 0.06, 0.012, 0.01] });
  }
  for (const sx of [-1, 1]) A(box3(), '#c8302a', { bone: hb, p: [sx * 0.012, hc[1] - 0.04, hc[2] + 0.24], r: [0, sx * 0.3, 0], s: [0.012, 0.008, 0.07] });
  A(box3(), '#c8302a', { bone: hb, p: [0, hc[1] - 0.04, hc[2] + 0.17], s: [0.014, 0.008, 0.09] });
  return { rig, height: 0.64, family: 'serpent', bodyY: 0.12 };
}

// Golem (seit 7.9): Steinblöcke mit Kanten (Steintitan, Titanenkönig), runde Krustenplatten (Lavagolem) oder
// glänzende Eisblöcke (Eisgolem). Zwischen den Blöcken sieht man die Fugen – ein leuchtender Kern aus Lava,
// Schmiedeglut oder Eislicht –, dazu ein Kernkristall in der Brust, Glutrisse, Augenschlitze und Mundspalt.
// Das Skelett kommt aus der menschlichen Gestalt mit Bauch, damit Gehen und Hiebe gleich bleiben.
function golem3(b, c) {
  const A = adder(b, null);
  const res = humanoid3(new Bake3(true), Object.assign({}, c, { belly: true }));
  const { hipY, shY } = res;
  const L = c.look || {};
  const style = L.golemStyle || 'blocks';
  const rock = c.skin;
  const legRock = c.pants || darker(rock, 0.2);
  const footRock = c.boots || darker(rock, 0.35);
  const fistRock = c.gloves || rock;
  const glow = c.cracks || '#ffb04a';
  const ice = style === 'ice';
  // Block: kantiger Quader (Stein, Eis) oder runde Kruste (Lava)
  const blockGeo = (v) => (style === 'crust' ? rockGeo(v % 3) : roundBox(1, 1, 1, ice ? 0.1 : 0.16, 1));
  const B = (color, bone, p, s, r, v = 0) => A(blockGeo(v), color, { bone, p, s: s.map((x) => x * (style === 'crust' ? 0.8 : 1.7)), r, top: ice ? '#f4fbff' : lighter(color, 0.18), topK: ice ? 0.7 : 0.45, shade: 0.3, shine: ice ? 0.9 : 0.15 });
  // leuchtender Kern hinter den Blöcken: zeigt sich in den Fugen
  const core = (bone, p, s) => A(ball(10), glow, { bone, p, s, mat: 'glow' });
  core(BH.chest, [0, hipY + 0.28, 0.02], [0.4, 0.32, 0.29]);
  core(BH.hips, [0, hipY - 0.02, 0], [0.3, 0.2, 0.25]);
  // Brust aus fünf Blöcken (Brustplatten, Rücken, Schulteransatz), dazwischen Fugen
  B(rock, BH.chest, [-0.17, hipY + 0.3, 0.13], [0.2, 0.2, 0.15], [0.1, 0.15, 0.08], 1);
  B(rock, BH.chest, [0.17, hipY + 0.32, 0.13], [0.2, 0.19, 0.15], [0.12, -0.12, -0.1], 2);
  B(darker(rock, 0.06), BH.chest, [0, hipY + 0.14, 0.15], [0.26, 0.13, 0.15], [0.05, 0, 0.04], 0);
  B(rock, BH.chest, [0, hipY + 0.3, -0.14], [0.36, 0.26, 0.16], [-0.1, 0, 0.05], 1);
  B(lighter(rock, 0.05), BH.chest, [0, shY - 0.02, 0.0], [0.3, 0.1, 0.22], [0, 0, -0.04], 2);
  // Kernkristall in der Brust, von Steinen eingefasst
  A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), lighter(glow, 0.25), { bone: BH.chest, p: [0, hipY + 0.3, 0.3], s: [0.07, 0.11, 0.07], r: [0, 0.6, 0], mat: 'glow' });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    A(blockGeo(k), darker(rock, 0.15), { bone: BH.chest, p: [Math.cos(a) * 0.1, hipY + 0.3 + Math.sin(a) * 0.12, 0.27], s: style === 'crust' ? 0.04 : 0.06, r: [a, a, 0], shine: ice ? 0.9 : 0.1 });
  }
  // Hüfte und Lendenblock
  B(legRock, BH.hips, [0, hipY - 0.02, 0], [0.32, 0.15, 0.25], [0, 0, 0.03], 0);
  B(darker(legRock, 0.1), BH.hips, [0, hipY - 0.13, 0.12], [0.16, 0.1, 0.1], [0.2, 0, 0], 1);
  // Kopf: kleiner kantiger Block tief zwischen den Schultern, Stirnwulst, Augenschlitze, Mundspalt
  const hc = [0, shY + 0.26, 0.1];
  B(rock, BH.head, hc, [0.18, 0.15, 0.16], [0.08, 0, 0], 2);
  B(darker(rock, 0.1), BH.head, [0, hc[1] + 0.07, hc[2] + 0.1], [0.19, 0.05, 0.08], [0.3, 0, 0], 1);
  for (const sx of [-1, 1]) A(box3(), glow, { bone: BH.head, p: [sx * 0.065, hc[1] + 0.025, hc[2] + 0.165], r: [0, 0, sx * 0.25], mat: 'glow', s: [0.075, 0.025, 0.02] });
  A(box3(), glow, { bone: BH.head, p: [0, hc[1] - 0.07, hc[2] + 0.165], mat: 'glow', s: [0.12, 0.022, 0.02] });
  // Arme: Schulterblock, Ober- und Unterarm, Fäuste wie Hämmer; Fugenkern im Arm
  for (const [sx, ab, hb, lb] of [[1, BH.armL, BH.handL, BH.legL], [-1, BH.armR, BH.handR, BH.legR]]) {
    const x = sx * 0.48;
    limbBetween(A, [x, shY - 0.05, 0], [x, shY - 0.5, 0.04], 0.09, 0.08, glow, { bone: ab, mat: 'glow' });
    B(rock, ab, [x - sx * 0.02, shY + 0.04, 0], [0.24, 0.17, 0.24], [0, 0, -sx * 0.25], 0);
    B(darker(rock, 0.05), ab, [x + sx * 0.02, shY - 0.2, 0.02], [0.15, 0.15, 0.15], [0.1, 0.3, sx * 0.1], 1);
    B(rock, ab, [x + sx * 0.01, shY - 0.38, 0.04], [0.14, 0.12, 0.14], [-0.1, -0.2, 0], 2);
    B(fistRock, hb, [x, shY - 0.55, 0.06], [0.19, 0.17, 0.19], [0.1, 0.2, sx * 0.1], 0);
    for (let k = -1; k <= 1; k++) A(blockGeo(k + 1), darker(fistRock, 0.1), { bone: hb, p: [x + k * 0.07, shY - 0.6, 0.2], s: style === 'crust' ? 0.045 : 0.07, r: [0.3, k, 0], shine: ice ? 0.9 : 0.1 });
    // Beine: Oberschenkel, Schienbein, breiter Fuß
    const lx = sx * 0.17;
    limbBetween(A, [lx, hipY - 0.05, 0], [lx, 0.1, 0], 0.08, 0.07, glow, { bone: lb, mat: 'glow' });
    B(legRock, lb, [lx, hipY - 0.12, 0], [0.15, 0.13, 0.15], [0.05, sx * 0.2, 0], 1);
    B(darker(legRock, 0.06), lb, [lx, 0.15, 0.01], [0.13, 0.11, 0.14], [-0.05, -sx * 0.25, 0], 2);
    B(footRock, lb, [lx, 0.04, 0.05], [0.16, 0.06, 0.2], [0, 0, 0], 0);
  }
  // Glutrisse bzw. Eisadern auf Brust und Kopf
  for (const [x, y, r] of [[-0.15, 0.3, 0.5], [0.12, 0.2, -0.6], [0.2, 0.36, 0.9]]) A(box3(), glow, { bone: BH.chest, p: [x, hipY + y * 0.8, 0.33], r: [0, 0, r], mat: 'glow', s: [0.03, 0.2, 0.03] });
  // Lava tropft an Ellbogen und Fäusten (Lavagolem); Steine und Luftblasen im Eis (Eisgolem)
  if (style === 'crust') {
    // Lavaadern quer über die Krusten auf Rücken, Schultern und Schenkeln
    for (const [x, y, z, r] of [[-0.12, 0.34, -0.3, 0.6], [0.14, 0.24, -0.3, -0.7], [0.0, 0.44, -0.27, 1.4]]) A(box3(), glow, { bone: BH.chest, p: [x, hipY + y, z], r: [0, 0, r], s: [0.03, 0.22, 0.03], mat: 'glow' });
    for (const [sx, ab, , lb] of [[1, BH.armL, 0, BH.legL], [-1, BH.armR, 0, BH.legR]]) {
      A(box3(), glow, { bone: ab, p: [sx * 0.5, shY + 0.1, 0], r: [0.4, 0, sx * 1.2], s: [0.025, 0.2, 0.025], mat: 'glow' });
      A(box3(), glow, { bone: lb, p: [sx * 0.2, hipY - 0.1, 0.1], r: [0, 0, sx * 0.5], s: [0.022, 0.14, 0.022], mat: 'glow' });
    }
  }
  if (style === 'crust') for (const sx of [-1, 1]) for (const [y, bone] of [[shY - 0.3, sx > 0 ? BH.armL : BH.armR], [shY - 0.68, sx > 0 ? BH.handL : BH.handR]]) A(horn3(0.1, 0.03, 4), glow, { bone, p: [sx * 0.5, y, -0.02], r: [Math.PI, 0, 0], mat: 'glow' });
  if (ice) for (const [x, y, z, s2] of [[-0.12, 0.34, 0.25, 0.05], [0.14, 0.18, 0.24, 0.04], [0.05, 0.42, -0.25, 0.05]]) A(ball(8), '#5a6a78', { bone: BH.chest, p: [x, hipY + y, z], s: s2 });
  // Titanenkönig: geschmiedete Stachelpanzer auf den Schultern, eingemeißelte Runen
  if (L.forge) for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) {
    A(cap3(0.2, Math.PI * 0.5, 0, Math.PI * 2, 10, 4), '#3a3430', { bone: ab, p: [sx * 0.47, shY + 0.12, 0], s: [1.1, 0.7, 1.1], r: [0, 0, -sx * 0.35], shine: 0.8, top: '#5a524a', topK: 0.4 });
    for (const dz of [-0.08, 0.08]) A(horn3(0.2, 0.045, 5), '#5a524a', { bone: ab, p: [sx * 0.52, shY + 0.2, dz], r: [0, 0, -sx * 0.5], shine: 1 });
    A(torus3(0.05, 0.01, Math.PI * 2, 3, 8), glow, { bone: ab, p: [sx * 0.6, shY - 0.2, 0.06], r: [0, sx * Math.PI / 2, 0], mat: 'glow' });
  }
  if (c.crown) for (let k = -2; k <= 2; k++) A(horn3(0.16, 0.04, 5), c.crown, { bone: BH.head, p: [k * 0.08, hc[1] + 0.16, hc[2] - 0.02], mat: 'glow' });
  return { rig: res.rig, height: shY + 0.45, family: 'human', shY, hipY, shX: res.shX, hc, hr: 0.21, belly: true, golem: true };
}

// --- Monsterfarben aus den 2D-Zeichnungen auslesen ---------------------------------------------------

const ART_FNS = ['beastArt', 'humanoidMonsterArt', 'spiderArt', 'scorpionArt', 'ghostArt', 'serpentArt', 'nagaArt', 'dragonWings', 'villagerArt'];
function captureArt(draw) {
  const rec = { scale: 1, calls: [] };
  const saved = {};
  for (const n of ART_FNS) {
    if (typeof window[n] !== 'function') continue;
    saved[n] = window[n];
    window[n] = (ctx, a, o) => { rec.calls.push({ fn: n, o: n === 'villagerArt' ? a : o, scale: rec.scale }); };
  }
  const fake = new Proxy({}, {
    get(t, k) {
      if (k === 'scale') return (x) => { rec.scale *= x; };
      return () => ({ addColorStop() {} });
    },
    set() { return true; }
  });
  try {
    draw(fake, 0);
  } catch (e) {
    // Zeichnung braucht mehr als die Farben; wir nehmen, was wir haben
  } finally {
    for (const n in saved) window[n] = saved[n];
  }
  return rec;
}

// Köpfe und Besonderheiten, die nur als freie Zeichnung im 2D-Spiel stecken
const HEAD3 = {
  bandit: { hood: '#5a3a22', mask: '#9a2f2a' }, banditschuetze: { hood: '#3e5530', mask: '#9a2f2a', quiver: '#6b4a2e' },
  armbrustschuetze: { hood: '#3e5530', mask: '#9a2f2a', quiver: '#6b4a2e' }, kellerwache: { helmet: '#7a828c', beard: '#5a3a22' },
  banditenfuerst: { mask: '#9a2f2a', crown: '#c9a35a', hair: '#2a1c14' },
  ork: { orc: true, band: '#3e3226' }, orkschamane: { orc: true, feathers: ['#c9a35a', '#b33a2c', '#3a6a8a'] },
  orkhauptmann: { orc: true, helmet: '#c9a35a' }, orkelite: { orc: true, helmet: '#6e7680' },
  orkberserker: { orc: true, mohawk: '#8a2a1a', paint: true }, kriegsherr: { orc: true, helmet: '#c9a35a', horns: '#e0d6bc' },
  oger: { horn1: '#e0d6bc', tusks: true, brow: true }, daemon: { horns: '#2a1416', ears: true }, feuerdaemon: { horns: '#1a0a0a', ears: true, flame: '#ffb04a' }, gargoyle: { horns: '#3a3a40', ears: true },
  minotaurus: { horns: '#e8dcc0', bigHorns: true, snout: '#9a6a4a', ring: true }, harpyie: { feathers: ['#8a6a9a', '#c8a8d8', '#6a4a7a'], hairLong: '#5a3a6a' },
  untoter: { bone: true }, grabwaechter: { bone: true, helmet: '#4a4454' }, gruftkoenig: { bone: true, crown: '#c9a35a' },
  sumpfhexe: { hat: '#2a3a24', hairLong: '#5a6a4a', nose: true }, yeti: { fur: true, brow: true }, trollkrieger: { ears: true, tusks: true, brow: true },
  lavagolem: { golem: true }, steintitan: { golem: true }, titanenkoenig: { golem: true, crown: '#ffb04a' }, eisgolem: { golem: true, cracks: '#9fe8ff' },
  donnerriese: { beard: '#bfe8ff', beardGlow: true, brow: true }, ghul: { ears: true, brow: true }
};

function headExtras(h, skin) {
  if (!h) return null;
  return (A, hb, hc, hr) => {
    if (h.hood) {
      A(cap3(hr * 1.12, Math.PI * 0.75, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0), h.hood, { bone: hb, p: hc, shade: 0.2 });
      A(flipGeo(cap3(hr * 1.1, Math.PI * 0.75, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0)), darker(h.hood, 0.45), { bone: hb, p: hc });
    }
    if (h.mask) A(geo3('banditmask2', () => new THREE.SphereGeometry(1, 18, 8, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.56, Math.PI * 0.36)), h.mask, { bone: hb, p: hc, s: hr * 1.07, shade: 0.2 });
    if (h.helmet) {
      A(cap3(hr * 1.1, Math.PI * 0.5, 0, Math.PI * 2, 18, 8), h.helmet, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2]], r: [-0.12, 0, 0], top: lighter(h.helmet, 0.3), topK: 0.4, shine: 0.9 });
      A(torus3(hr * 1.06, hr * 0.06, Math.PI * 2, 4, 22), '#c9a35a', { bone: hb, p: [hc[0], hc[1] + hr * 0.08, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0], shine: 1 });
      A(roundBox(hr * 0.12, hr * 0.5, hr * 0.1, hr * 0.05), h.helmet, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] + hr * 1.02], shine: 0.9 });
    }
    if (h.band) A(torus3(hr * 1.04, hr * 0.08, Math.PI * 2, 4, 22), h.band, { bone: hb, p: [hc[0], hc[1] + hr * 0.38, hc[2]], r: [Math.PI / 2 - 0.1, 0, 0] });
    if (h.crown) for (let k = -2; k <= 2; k++) A(horn3(hr * 0.42, hr * 0.1, 5), h.crown, { bone: hb, p: [hc[0] + Math.sin(k * 0.42) * hr * 0.9, hc[1] + hr * 0.68, hc[2] + Math.cos(k * 0.42) * hr * 0.45], mat: h.crown === '#ffb04a' ? 'glow' : 'lit', shine: 1 });
    if (h.horns) for (const sx of [-1, 1]) {
      const big = h.bigHorns;
      const base = [hc[0] + sx * hr * 0.62, hc[1] + hr * 0.62, hc[2]];
      const midp = [base[0] + sx * hr * (big ? 0.7 : 0.35), base[1] + hr * (big ? 0.15 : 0.45), base[2] - hr * 0.1];
      // seit 12.7.1: ein glatter, gebogener Hornbogen statt Glied, Querringen und aufgesetztem Kegel
      const tip = [midp[0] + sx * hr * (big ? 0.25 : 0.1), midp[1] + hr * (big ? 0.5 : 0.4), midp[2] - hr * 0.05];
      const m2 = [midp[0] + sx * hr * (big ? 0.12 : 0.04), midp[1] + hr * (big ? 0.15 : 0.15), midp[2] - hr * 0.08];
      A(tube3([base, midp, m2, tip].map((v) => v.map((n) => +n.toFixed(3))), hr * (big ? 0.2 : 0.14), hr * 0.02), h.horns, { bone: hb, shine: 0.4 });
    }
    if (h.horn1) A(horn3(hr * 0.8, hr * 0.2, 8), h.horn1, { bone: hb, p: [hc[0], hc[1] + hr * 0.85, hc[2] + hr * 0.1], r: [0.2, 0, 0], shine: 0.4 });
    if (h.feathers) h.feathers.forEach((c, k) => A(geo3('feather2', () => new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.3, 0.012)), c, { bone: hb, p: [hc[0] + (k - 1) * hr * 0.3, hc[1] + hr * 1.1, hc[2] - hr * 0.3], r: [-0.3, 0, (k - 1) * 0.35], s: hr / 0.33 }));
    if (h.mohawk) for (let k = 0; k < 5; k++) A(horn3(hr * 0.55, hr * 0.12, 5), h.mohawk, { bone: hb, p: [hc[0], hc[1] + hr * 0.85, hc[2] + hr * (0.45 - k * 0.27)], r: [-0.25 * (k - 2), 0, 0] });
    if (h.hat) {
      A(cyl3(hr * 1.6, hr * 1.6, hr * 0.06, 20), h.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2]] });
      A(horn3(hr * 1.4, hr * 0.75, 12), h.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2]], r: [-0.25, 0, 0.1], shade: 0.2 });
      A(torus3(hr * 0.74, hr * 0.06, Math.PI * 2, 4, 16), '#6a3a8a', { bone: hb, p: [hc[0], hc[1] + hr * 0.7, hc[2]], r: [Math.PI / 2, 0, 0] });
    }
    if (h.hairLong) {
      A(cap3(hr * 1.07, Math.PI * 0.52), h.hairLong, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2] - hr * 0.04], r: [-0.45, 0, 0] });
      for (const sx of [-1, 0, 1]) lock(A, hb, [hc[0] + sx * hr * 0.7, hc[1] + hr * 0.1, hc[2] - hr * 0.5], hr * 1.4, hr * 0.22, [-2.9, 0, sx * 0.2], h.hairLong);
    }
    if (h.hair) A(cap3(hr * 1.07, Math.PI * 0.52), h.hair, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2] - hr * 0.04], r: [-0.32, 0, 0] });
    if (h.snout) {
      A(ball(12), h.snout, { bone: hb, p: [hc[0], hc[1] - hr * 0.35, hc[2] + hr * 0.8], s: [hr * 0.5, hr * 0.35, hr * 0.38] });
      for (const sx of [-1, 1]) A(sphere3(hr * 0.06, 6, 4), '#2a1a10', { bone: hb, p: [hc[0] + sx * hr * 0.18, hc[1] - hr * 0.35, hc[2] + hr * 1.17] });
      if (h.ring) A(torus3(hr * 0.12, hr * 0.03, Math.PI * 2, 4, 12), '#e8c46a', { bone: hb, p: [hc[0], hc[1] - hr * 0.5, hc[2] + hr * 1.12], shine: 1 });
    }
    if (h.nose) A(horn3(hr * 0.4, hr * 0.09, 6), skin, { bone: hb, p: [hc[0], hc[1] - hr * 0.1, hc[2] + hr * 0.92], r: [1.7, 0, 0] });
    if (h.paint) for (const sx of [-1, 1]) A(roundBox(hr * 0.08, hr * 0.5, hr * 0.04, hr * 0.02), '#c8302a', { bone: hb, p: [hc[0] + sx * hr * 0.4, hc[1] - hr * 0.05, hc[2] + hr * 0.92] });
    if (h.flame) for (let k = -1; k <= 1; k++) A(horn3(hr * 0.6, hr * 0.15, 6), h.flame, { bone: hb, p: [hc[0] + k * hr * 0.3, hc[1] + hr * 0.75, hc[2] - hr * 0.2], r: [-0.3, 0, k * 0.3], mat: 'glow' });
  };
}

// --- Köpfe der Menschenartigen (seit 8.4) --------------------------------------------------------------
// Jeder Kopf ist geschlossen: Haare aus Strähnen unter Kapuze, Kopftuch, Helm oder Hut, Kopfbedeckungen mit
// Dicke (Saumwulst, Knoten, Zipfel), Masken am Kiefer, Bärte aus Strähnen. Jede Art hat bis zu drei Varianten
// (HEADKIT3), die Variante hängt am Startpunkt des Monsters (monVariant3), alle Spieler sehen dieselbe.
// lean: schlanke Wegelagerer mit etwas kleinerem, weiter vorn sitzendem Kopf.
const HEADKIT3 = {
  bandit: [
    { lean: 1, hood: '#5a3a22', mask: '#9a2f2a', hair: 0, hairColor: '#2a1c14', tail: 'pony', eye: '#4a3a22' },
    { lean: 1, bandana: '#8a2a22', mask: '#2e2a2c', hair: 6, hairColor: '#7a4a2a', eye: '#3a5a3a', mark: 2 },
    { lean: 1, hood: '#4a3424', hair: 0, hairColor: '#1e1612', beard: '#2a1e16', eye: '#5a6a7a', mark: 2, scarf: '#9a2f2a' }
  ],
  banditschuetze: [
    { lean: 1, hood: '#3e5530', mask: '#9a2f2a', hair: 0, hairColor: '#4a2e1a', tail: 'braid', eye: '#4a3a22' },
    { lean: 1, bandana: '#46603a', hair: 6, hairColor: '#8a5a2a', eye: '#3a5a3a', scarf: '#9a2f2a' },
    { lean: 1, hood: '#46603a', hair: 0, hairColor: '#2a1c14', beard: '#3a2618', beardKind: 'short', eye: '#6a4a2a', mark: 2 }
  ],
  armbrustschuetze: [{ lean: 1, hat: '#4a3a2a', hair: 0, hairColor: '#3a2418', mask: '#9a2f2a', eye: '#5a6a7a' }],
  kellerwache: [
    { hair: 0, hairColor: '#5a3a22', beard: '#5a3a22', beardKind: 'long', eye: '#4a3a22' },
    { hair: 0, hairColor: '#8a8a82', beard: '#8a8a82', beardKind: 'short', eye: '#5a6a7a', mark: 2 },
    { hair: 0, hairColor: '#3a2418', beard: '#3a2418', beardKind: 'braid', eye: '#6a4a2a' }
  ],
  banditenfuerst: [{ hair: 7, hairColor: '#2a1c14', mask: '#9a2f2a', eye: '#4a3a22', mark: 2 }],
  ork: [
    { band: '#3e3226', hair: 8, hairColor: '#2a2018' },
    { band: '#8a2a1a', hair: 9, hairColor: '#1e1a14' },
    { hair: 8, hairColor: '#6a2a1a', sideBraid: '#2a2018' }
  ],
  orkberserker: [{ hair: 8, hairColor: '#8a2a1a' }],
  orkschamane: [{ hair: 9, hairColor: '#2a2018' }],
  untoter: [
    { hair: 11, hairColor: '#8a8676', cheeks: true },
    { halfHelm: '#7a7068', hair: 11, hairColor: '#7a766a', cheeks: true }
  ],
  sumpfhexe: [{ hair: 10, hairColor: '#2e3a2a' }]
};
// Augenfarben der Menschen (statt roter Monsteraugen)
const HUMAN_EYES3 = ['#4a3a22', '#3a5a3a', '#5a6a7a', '#6a4a2a'];

// Kapuze: geschlossener Scheitel, Öffnung nur vor dem Gesicht mit weichem Saumwulst, Spitze hinten,
// dunkle Innenseite und ein Kragen auf der Brust (dort, damit sich der Kopf frei drehen kann)
function monHood3(A, hb, hc, hr, col) {
  const [x, y, z] = hc;
  const R = +(hr * 1.16).toFixed(3);
  const gap = 0.95;
  const tTop = Math.PI * 0.36;
  const tBot = Math.PI * 0.86;
  const p = [x, y + hr * 0.04, z - hr * 0.04];
  // Scheitel reicht etwas über den unteren Teil (keine Ritze an der Naht)
  A(cap3(+(R * 1.006).toFixed(3), tTop + 0.05, 0, Math.PI * 2, 20, 5), col, { bone: hb, p });
  A(geo3('mhood' + R, () => new THREE.SphereGeometry(R, 20, 6, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, tTop, tBot - tTop)), col, { bone: hb, p, shade: 0.25 });
  A(geo3('mhoodin' + R, () => flipGeo(new THREE.SphereGeometry(R * 0.96, 20, 6, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, tTop, tBot - tTop))), darker(col, 0.5), { bone: hb, p });
  // Saumwulst: zwei Bögen an den Seiten der Öffnung, einer über der Stirn, Knoten an den Ecken
  const hem = lighter(col, 0.12);
  const tube = +(hr * 0.075).toFixed(3);
  for (const ph of [Math.PI / 2 + gap, Math.PI / 2 - gap]) A(torus3(R, tube, tBot - tTop, 4, 8), hem, { bone: hb, p, r: [0, ph + Math.PI, Math.PI / 2 - tBot] });
  A(torus3(+(R * Math.sin(tTop)).toFixed(3), tube, gap * 2, 4, 10), hem, { bone: hb, p: [p[0], p[1] + R * Math.cos(tTop), p[2]], r: [Math.PI / 2, 0, Math.PI / 2 - gap] });
  for (const sx of [-1, 1]) A(sphere3(tube, 6, 4), hem, { bone: hb, p: [p[0] + sx * R * Math.cos(Math.PI / 2 - gap) * Math.sin(tTop), p[1] + R * Math.cos(tTop), p[2] + R * Math.sin(Math.PI / 2 - gap) * Math.sin(tTop)], noShadow: true });
  // Kapuzenspitze nach hinten
  A(horn3(+(hr * 0.62).toFixed(3), +(hr * 0.42).toFixed(3), 8), col, { bone: hb, p: [x, y + hr * 0.62, z - hr * 0.78], r: [-1.95, 0, 0], s: [0.75, 1, 1], shade: 0.2 });
  A(lathe3('hoodcowl', [[0, -0.051], [0.26, -0.05], [0.23, -0.01], [0.17, 0.05], [0.12, 0.09]], 16), col, { bone: BH.chest, p: [x, y - hr * 0.84, 0], s: [1, 1, 0.9], shade: 0.2 });
}

// Kopftuch: liegt am Schädel, Rand als Wulst, Knoten am Hinterkopf mit zwei Zipfeln
function monBandana3(A, hb, hc, hr, col) {
  const [x, y, z] = hc;
  A(cap3(+(hr * 1.09).toFixed(3), Math.PI * 0.5, 0, Math.PI * 2, 18, 8), col, { bone: hb, p: [x, y + hr * 0.03, z - hr * 0.04], r: [-0.42, 0, 0], shade: 0.2 });
  A(torus3(+(hr * 1.02).toFixed(3), +(hr * 0.07).toFixed(3), Math.PI * 2, 4, 22), darker(col, 0.12), { bone: hb, p: [x, y + hr * 0.03, z - hr * 0.04], r: [Math.PI / 2 - 0.42, 0, 0] });
  const kn = [x, y + hr * 0.08, z - hr * 1.1];
  A(ball(10), darker(col, 0.08), { bone: hb, p: kn, s: [hr * 0.17, hr * 0.15, hr * 0.13] });
  for (const sx of [-1, 1]) A(horn3(+(hr * 1.0).toFixed(3), +(hr * 0.22).toFixed(3), 6), sx > 0 ? col : darker(col, 0.1), { bone: hb, p: [kn[0] + sx * hr * 0.04, kn[1], kn[2] - hr * 0.04], r: [-2.8, sx * 0.2, sx * 0.14], s: [1, 1, 0.3], shade: 0.2 });
}

// Maskentuch über Nase und Mund: folgt dem Kiefer, Zipfel am Kinn, Knoten mit zwei Enden im Nacken
function monMask3(A, hb, hc, hr, col, knot) {
  const [x, y, z] = hc;
  const jc = [x, y - hr * 0.2, z + hr * 0.02];
  A(geo3('mask3b', () => new THREE.SphereGeometry(1, 20, 7, Math.PI / 2 - 1.75, 3.5, Math.PI * 0.5, Math.PI * 0.42)), col, { bone: hb, p: jc, s: [hr * 1.03, hr * 0.86, hr * 1.04], shade: 0.15 });
  A(torus3(1, 0.05, 3.5, 3, 18), darker(col, 0.15), { bone: hb, p: jc, r: [Math.PI / 2, 0, Math.PI / 2 - 1.75], s: [hr * 1.03, hr * 1.04, hr * 0.86], noShadow: true });
  A(horn3(+(hr * 0.26).toFixed(3), +(hr * 0.26).toFixed(3), 6), darker(col, 0.06), { bone: hb, p: [x, y - hr * 0.78, z + hr * 0.74], r: [Math.PI - 0.5, 0, 0], s: [1, 1, 0.3] });
  A(ball(8), lighter(col, 0.06), { bone: hb, p: [x, y - hr * 0.2, z + hr * 1.0], s: [hr * 0.12, hr * 0.1, hr * 0.08] });
  if (!knot) return;
  const kn = [x, y - hr * 0.15, z - hr * 0.98];
  A(ball(8), darker(col, 0.1), { bone: hb, p: kn, s: [hr * 0.12, hr * 0.11, hr * 0.1] });
  for (const sx of [-1, 1]) A(horn3(+(hr * 0.5).toFixed(3), +(hr * 0.15).toFixed(3), 5), col, { bone: hb, p: kn, r: [-2.75, 0, sx * 0.3], s: [1, 1, 0.35] });
}

// Bart aus Strähnen (seit 8.4 statt einer Kugel): Grundform am Kinn, Strähnen laufen nach unten spitz zu,
// Schnurrbart; kind 'long' lang, 'short' kurz, 'braid' mit zwei geflochtenen Zöpfen
function beard3(A, hb, hc, hr, col, kind, rnd) {
  const [x, y, z] = hc;
  if (kind === 'mustache') {
    // Schnurrbart: zwei geschwungene Strähnen über dem Mund und ein kleiner Kinnbart
    for (const sx of [-1, 1]) {
      strand3(A, hb, [x + sx * hr * 0.04, y - hr * 0.3, z + hr * 0.98], [sx, -0.35, 0.05], hr * 0.42, hr * 0.1, col, { w: [0, 1, 0], flat: 0.7 });
      strand3(A, hb, [x + sx * hr * 0.4, y - hr * 0.38, z + hr * 0.88], [sx * 0.4, -1, 0], hr * 0.22, hr * 0.07, darker(col, 0.05), { flat: 0.7 });
    }
    strand3(A, hb, [x, y - hr * 0.62, z + hr * 0.86], [0, -1, 0.2], hr * 0.3, hr * 0.12, col, { flat: 0.7 });
    return;
  }
  A(ball(12), col, { bone: hb, p: [x, y - hr * 0.55, z + hr * 0.45], s: [hr * 0.72, hr * 0.42, hr * 0.5], shade: 0.2 });
  const L = kind === 'long' ? 0.78 : kind === 'braid' ? 0.34 : 0.44;
  for (let k = 0; k < 7; k++) {
    const u = k / 6 - 0.5;
    strand3(A, hb, [x + u * hr * 1.1, y - hr * (0.5 + (0.5 - Math.abs(u)) * 0.15), z + hr * (0.72 - Math.abs(u) * 0.4)], [-u * 0.35, -1, 0.25], hr * L * (1 - Math.abs(u) * 0.6) * (0.9 + rnd() * 0.2), hr * 0.14, k % 2 ? col : darker(col, 0.08), { flat: 0.7 });
  }
  for (const sx of [-1, 1]) strand3(A, hb, [x + sx * hr * 0.05, y - hr * 0.34, z + hr * 0.97], [sx, -0.45, 0.1], hr * 0.34, hr * 0.075, darker(col, 0.05), { w: [0, 1, 0], flat: 0.7 });
  if (kind === 'braid') for (const sx of [-1, 1]) {
    let p = [x + sx * hr * 0.22, y - hr * 0.8, z + hr * 0.62];
    for (let k = 0; k < 3; k++) {
      p = [p[0], p[1] - hr * 0.17, p[2] - hr * 0.02];
      A(ball(8), k % 2 ? col : darker(col, 0.12), { bone: hb, p, s: [hr * 0.11, hr * 0.13, hr * 0.11], shine: 0.25 });
    }
    A(torus3(+(hr * 0.08).toFixed(3), +(hr * 0.03).toFixed(3), Math.PI * 2, 3, 8), '#c9a35a', { bone: hb, p: [p[0], p[1] - hr * 0.1, p[2]], r: [Math.PI / 2, 0, 0], shine: 1 });
    strand3(A, hb, [p[0], p[1] - hr * 0.1, p[2]], [0, -1, 0.05], hr * 0.22, hr * 0.1, col);
  }
}

// Pferdeschwanz aus der Kapuze: Band am Kopf, Schwanz am Umhang-Knochen (schwingt mit)
function ponytail3(A, hc, hr, color, tie) {
  const t0 = [hc[0], hc[1] - hr * 0.1, hc[2] - hr * 1.12];
  const t1 = [hc[0], t0[1] - hr * 0.55, t0[2] - hr * 0.35];
  const t2 = [hc[0] + hr * 0.05, t0[1] - hr * 1.25, t0[2] - hr * 0.3];
  A(torus3(+(hr * 0.15).toFixed(3), +(hr * 0.06).toFixed(3), Math.PI * 2, 4, 12), tie, { bone: BH.head, p: t0, r: [0.4, 0, 0], shine: 1 });
  // am Kopf fest (am Umhang-Knochen löste sich der Zopf beim Laufen vom Haarband)
  limbBetween(A, t0, t1, hr * 0.22, hr * 0.2, color, { bone: BH.head, seg: 8, shine: 0.25 });
  limbBetween(A, t1, t2, hr * 0.2, hr * 0.06, color, { bone: BH.head, seg: 8, shine: 0.25 });
  for (const sx of [-1, 1]) strand3(A, BH.head, [t2[0] + sx * hr * 0.05, t2[1] + hr * 0.25, t2[2]], [sx * 0.3, -1, 0], hr * 0.4, hr * 0.09, darker(color, 0.06));
}

// Kopf aus dem Baukasten: stellt Gesicht, Haare und Bart in c ein und liefert die Kopfbedeckung.
// h: die alten Kopfteile (Krone, Federn, Hut, Bemalung … bleiben), v: Variante (für die Augenfarbe)
function headKit3(k, h, c, rnd, v) {
  if (k.lean) {
    c.headR = 0.31;
    c.headZ = 0.02;
  }
  c.rnd = rnd;
  if (v >= 0) c.eyeColor = k.eye || HUMAN_EYES3[v % HUMAN_EYES3.length];
  if (k.mark) c.mark = k.mark;
  const helmet = k.helmet || h.helmet;
  c.covered = k.hood ? 'hood' : k.bandana ? 'cloth' : k.hat || h.hat ? 'hat' : helmet || k.halfHelm ? 'helmet' : false;
  c.noEars = !!k.hood;
  c.hair = k.hair != null ? { style: k.hair, color: k.hairColor } : null;
  if (k.mask) {
    c.noMouth = true;
    c.noNose = true;
    c.masked = true;
  }
  c.beard = k.beard || null;
  c.beardKind = k.beardKind;
  if (k.tail === 'braid') c.braid = k.hairColor;
  // alte Teile ohne die, die der Baukasten neu macht
  const rest = headExtras(Object.assign({}, h, { hood: null, mask: null, band: null, mohawk: null, hairLong: null, hair: null, helmet }), c.skin);
  return (A, hb, hc, hr) => {
    const [x, y, z] = hc;
    if (k.hood) monHood3(A, hb, hc, hr, k.hood);
    if (k.bandana) monBandana3(A, hb, hc, hr, k.bandana);
    if (k.mask) monMask3(A, hb, hc, hr, k.mask, !k.hood);
    if (k.hat) {
      // breitkrempiger Hut mit Band und kleiner Feder, leicht schief
      A(cyl3(+(hr * 1.6).toFixed(3), +(hr * 1.6).toFixed(3), +(hr * 0.06).toFixed(3), 22), k.hat, { bone: hb, p: [x, y + hr * 0.62, z - hr * 0.02], r: [-0.08, 0, 0.06] });
      A(cap3(+(hr * 0.9).toFixed(3), Math.PI * 0.5, 0, Math.PI * 2, 16, 6), k.hat, { bone: hb, p: [x, y + hr * 0.62, z - hr * 0.02], r: [-0.08, 0, 0.06], s: [1, 0.9, 1], shade: 0.2 });
      A(torus3(+(hr * 0.9).toFixed(3), +(hr * 0.07).toFixed(3), Math.PI * 2, 4, 18), '#6a2a1a', { bone: hb, p: [x, y + hr * 0.7, z - hr * 0.02], r: [Math.PI / 2 - 0.08, 0, 0.06] });
      A(geo3('feather2', () => new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.3, 0.012)), '#c8402f', { bone: hb, p: [x + hr * 0.8, y + hr * 0.95, z - hr * 0.2], r: [-0.4, 0.3, -0.5], s: hr / 0.33 });
    }
    if (k.halfHelm) {
      // rostiger Halbhelm mit Rand und Rostflecken
      A(cap3(+(hr * 1.1).toFixed(3), Math.PI * 0.42, 0, Math.PI * 2, 16, 6), k.halfHelm, { bone: hb, p: [x, y + hr * 0.06, z - hr * 0.02], r: [-0.15, 0, 0], shine: 0.5, top: lighter(k.halfHelm, 0.15), topK: 0.4 });
      A(torus3(+(hr * 1.07).toFixed(3), +(hr * 0.06).toFixed(3), Math.PI * 2, 4, 20), darker(k.halfHelm, 0.2), { bone: hb, p: [x, y + hr * 0.33, z - hr * 0.06], r: [Math.PI / 2 - 0.15, 0, 0], shine: 0.4 });
      for (const [dx, dy, dz] of [[0.5, 0.85, 0.35], [-0.6, 0.7, -0.5], [0.1, 0.6, -0.9]]) A(ball(6), '#9a5a32', { bone: hb, p: [x + dx * hr, y + dy * hr, z + dz * hr], s: [hr * 0.16, hr * 0.06, hr * 0.16], r: [dz, 0, -dx], noShadow: true });
    }
    // Stirnband, das am Schädel anliegt (Radius des Schädels in dieser Höhe), Knoten mit zwei Enden hinten
    if (k.band) {
      A(torus3(+(hr * 0.97).toFixed(3), +(hr * 0.07).toFixed(3), Math.PI * 2, 4, 22), k.band, { bone: hb, p: [x, y + hr * 0.3, z], r: [Math.PI / 2 - 0.1, 0, 0], s: [1, 0.98, 1] });
      A(ball(8), darker(k.band, 0.1), { bone: hb, p: [x, y + hr * 0.24, z - hr * 0.97], s: [hr * 0.13, hr * 0.12, hr * 0.1] });
      for (const sx of [-1, 1]) A(horn3(+(hr * 0.45).toFixed(3), +(hr * 0.12).toFixed(3), 5), k.band, { bone: hb, p: [x, y + hr * 0.24, z - hr * 0.97], r: [-2.7, 0, sx * 0.35], s: [1, 1, 0.35] });
    }
    // Zopf an der linken Seite hinter dem Ohr
    if (k.sideBraid) {
      let p = [x + hr * 0.78, y - hr * 0.05, z - hr * 0.35];
      for (let i = 0; i < 4; i++) {
        p = [p[0] + hr * 0.03, p[1] - hr * 0.22, p[2] - hr * 0.02];
        A(ball(8), i % 2 ? k.sideBraid : darker(k.sideBraid, 0.15), { bone: hb, p, s: [hr * 0.13, hr * 0.16, hr * 0.13], shine: 0.25 });
      }
      A(torus3(+(hr * 0.1).toFixed(3), +(hr * 0.035).toFixed(3), Math.PI * 2, 3, 8), '#c9a35a', { bone: hb, p: [p[0], p[1] - hr * 0.14, p[2]], r: [Math.PI / 2, 0, 0], shine: 1 });
      strand3(A, hb, [p[0], p[1] - hr * 0.14, p[2]], [0, -1, 0], hr * 0.3, hr * 0.12, k.sideBraid);
    }
    // Halstuch mit Zipfel vorn (Gesicht bleibt frei)
    if (k.scarf) {
      A(torus3(0.12, 0.05, Math.PI * 2, 5, 16), k.scarf, { bone: BH.chest, p: [x, y - hr * 0.9, z + 0.01], r: [Math.PI / 2 - 0.2, 0, 0] });
      A(horn3(+(hr * 0.42).toFixed(3), +(hr * 0.3).toFixed(3), 6), darker(k.scarf, 0.08), { bone: BH.chest, p: [x, y - hr * 0.95, z + 0.12], r: [Math.PI - 0.25, 0, 0], s: [1, 1, 0.3], shade: 0.2 });
    }
    if (k.tail === 'pony') ponytail3(A, hc, hr, k.hairColor, '#c9a35a');
    // eingefallene Wangen (Untote)
    if (k.cheeks) for (const sx of [-1, 1]) A(ball(8), darker(c.skin, 0.35), { bone: hb, p: [x + sx * hr * 0.5, y - hr * 0.36, z + hr * 0.8], s: [hr * 0.14, hr * 0.2, hr * 0.05], r: [0, sx * 0.5, 0], mat: 'face' });
    rest(A, hb, hc, hr);
  };
}

// Besonderheiten einzelner Arten, die die 2D-Zeichnung nicht kennt (seit 7.9, nach docs/monster-prompts.md).
// Endbosse bekommen die ihrer Vorlage und darüber ihre eigenen.
// Tieraugen (seit 12.7): zu dunkle Augenfarben werden zu warmem Bernstein, sonst bleibt die Farbe
function eye3Bright(c) {
  const n = parseInt(c.slice(1, 7), 16);
  const l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  return l < 0.4 ? '#e8a838' : c;
}

const MON3_LOOK = {
  hund: { floppy: true, ribs: true, droop: true },
  fuchs: { earBack: '#2a1a14', socks: '#2a1a14', slit: true },
  braunbaer: { hump: true },
  luchs: { beard: '#efe2c8', bigPaws: true },
  hyaene: { roundEars: true },
  schakal: { tailTip: '#2a221c' },
  warg: { ash: '#8a8484' },
  eisbaer: { bigPaws: true, back: '#d8d4c4' },
  panther: { spots: '#121218' },
  moorwolf: { algae: '#5a7a2a', ribs: true },
  urdrache: { coins: '#e8c04a' },
  lavagolem: { golemStyle: 'crust' },
  eisgolem: { golemStyle: 'ice' },
  titanenkoenig: { forge: true },
  sandviper: { head: 'viper', pattern: 'spots', browHorns: true },
  klapperschlange: { head: 'viper', pattern: 'diamond', pits: true },
  riesenpython: { head: 'python', pattern: 'saddle', pits: true },
  naga: { crownHorns: false },
  nagapriesterin: { crownHorns: false, hoodCrown: 1 },
  nagakoenigin: { hoodCrown: 1.45 },
  vritra: { hoodCrown: null, hoods: true },
  frostgeist: { snow: true, iceFingers: '#e8f8ff' },
  seelenfresser: { maw: true, longFingers: true },
  eiskoenig: { beard: '#d8f0ff', crownRing: true, iceFingers: '#e8f8ff', snow: true },
  waldspinne: { venom: '#c8ff6a' },
  hoehlenspinne: { legs: 1.25, legR: 0.8, abd: 0.8, glowMark: true },
  giftspinne: { legs: 0.82, legR: 1.25, abd: 1.25, speckle: '#c6f08a', venom: '#d8ff6a' },
  spinnenkoenigin: { abd: 1.12, egg: 1.2, legR: 1.15, glowMark: true, crownSpikes: '#24142e', cocoons: true, venom: '#ff3aff' },
  fenris: { shackles: '#4a4a52', rune: '#ffcc4a' },
  ursus: { forest: true },
  ignar: { coins: null, magma: '#ff6a2a', tailBlade: '#1a1418' }
};

function monsterModelDef(id) {
  const art = MONSTER_ART[id];
  if (!art) return null;
  const rec = captureArt(art.draw);
  const wings = rec.calls.find((c) => c.fn === 'dragonWings');
  const call = rec.calls.find((c) => c.fn !== 'dragonWings') || { fn: 'beastArt', o: { fur: MONSTER_TYPES[id].color }, scale: 1 };
  const o = Object.assign({}, call.o || {});
  const scale = (call.scale || 1) * (call.fn === 'humanoidMonsterArt' || call.fn === 'serpentArt' || call.fn === 'nagaArt' ? o.scale || 1 : 1);
  return { fn: call.fn, o, scale, wings: wings ? wings.o : null };
}

function buildMonster3(b, id, v = 0) {
  const def = monsterModelDef(id);
  const t = MONSTER_TYPES[id];
  // look (seit 13.0): Aussehen eines anderen Monsters, z. B. die Wächter im Höllenthron
  const artId = t && t.raid ? t.raid.art : t && t.look;
  const own = MON3_BUILD[id] || (artId && MON3_BUILD[artId]);
  if (!def && !own) return Object.assign(beast3(b, { fur: t.color }), { scale: 1, style: attackStyle(id) });
  const o = Object.assign({}, def ? def.o : {}, artId ? MON3_LOOK[artId] : null, MON3_LOOK[id]);
  if (def) def.o = o;
  let res;
  if (own) res = own(b, v);
  else switch (def.fn) {
    case 'beastArt': {
      const dragon = !!def.wings;
      res = beast3(b, Object.assign({}, o, { wings: def.wings, horns: dragon ? '#e8dcc0' : null, glowMane: o.mane && o.glow }));
      break;
    }
    case 'spiderArt': res = spider3(b, o); break;
    case 'scorpionArt': res = scorpion3(b, o); break;
    case 'ghostArt': res = ghost3(b, o); break;
    case 'serpentArt': res = serpent3(b, o, false); break;
    case 'nagaArt': res = serpent3(b, o, true); break;
    default: {
      const h = HEAD3[id] || (t.raid && HEAD3[t.raid.art]) || (t.look && HEAD3[t.look]) || {};
      const c = {
        beastEyes: t.shape === 'brute' || t.shape === 'orc' || t.shape === 'demon', narrow: t.shape === 'humanoid',
        skin: o.skin || t.color, torso: o.torso || o.robe || o.skin || t.color, sleeve: o.sleeve, pants: o.pants, boots: o.boots, gloves: o.gloves,
        belt: o.belt, pouch: o.pouch, straps: o.straps, robe: o.robe, wideSleeves: o.wideSleeves, belly: o.belly, pads: o.pauldron, padTrim: o.pauldron ? '#c9a35a' : null, spikes: o.spikes,
        cape: o.cape, wings: o.wings, tail: o.tail ? o.skin : null, claws: o.claws, cracks: o.cracks || h.cracks, runes: o.runes, necklace: o.necklace,
        tattered: o.tattered, weapon: o.weapon ? { kind: o.weapon, tier: 2 } : null, eyeColor: h.bone ? '#a774e0' : '#c8302a', angry: true, blush: false,
        tusks: h.tusks || h.orc, pointEars: h.ears || h.orc, brow: h.brow || h.orc, quiver: h.quiver, covered: !!(h.hood || h.helmet || h.hat), noEars: !!h.hood,
        beard: h.beard, beardGlow: h.beardGlow, crown: h.crown
      };
      if (h.bone) c.glowEyes = o.runes || '#a774e0';
      if (h.golem) {
        res = golem3(b, Object.assign(c, { cracks: o.cracks || h.cracks, look: o }));
        break;
      }
      // Kopf aus dem Baukasten (seit 8.4): Haare, Kopfbedeckung, Bart und Augen je Variante
      const kit = HEADKIT3[id] || (t.raid && HEADKIT3[t.raid.art]) || (t.look && HEADKIT3[t.look]);
      if (kit) {
        let seed = 7;
        for (let i = 0; i < id.length; i++) seed = (Math.imul(seed, 31) + id.charCodeAt(i)) | 0;
        c.headgear = headKit3(kit[v % kit.length], h, c, mulberry32(seed * 31 + v), t.shape === 'humanoid' && !h.bone ? v : -1);
      } else c.headgear = headExtras(h, c.skin);
      res = humanoid3(b, c);
      // Brocken stehen vornübergebeugt mit Buckel
      if (t.shape === 'brute') res.hunch = 0.2;
    }
  }
  monsterFlair3(b, res, id, def);
  res.style = attackStyle(id);
  // etwas größer als früher, damit man die Einzelheiten sieht
  res.scale = (def ? def.scale : 1) * 1.15 * (t && t.raid ? t.raid.scale : 1) * (own && t.scale3 ? t.scale3 : 1) * (t && t.lookScale ? t.lookScale : 1);
  // eigene Großmodelle mit fester Grundgröße (Abaddor, zweite Form etwas größer)
  if (res.ownScale) res.scale = res.ownScale * (t && t.raid ? t.raid.scale : 1);
  return res;
}

// --- Monster-Schmuck (seit 6.5): passend zum Gebiet Stacheln, Kristalle, Knochen oder Glut,
// dazu Krallen, Fänge, leuchtende Augen; je höher die Stufe, desto mehr; starke Monster mit Rüstung und Leuchtkreis.
const MON3_THEMES = {
  wild: { spike: '#5a4632', glow: '#ffcc4a' },
  forest: { spike: '#3e4a2a', glow: '#c8ff6a', leaf: '#4f7a32', acc: 'moss' },
  desert: { spike: '#d8b878', glow: '#ffd34d', metal: '#8a6a44', acc: 'sand' },
  war: { spike: '#6a6f78', glow: '#ff8a4a', metal: '#5a5e66' },
  hell: { spike: '#2a1414', glow: '#ff4a2a', hot: true, acc: 'ash' },
  frost: { spike: '#bfe8ff', glow: '#7fd8ff', ice: true, acc: 'snow' },
  rot: { spike: '#d8d0b8', glow: '#8fe36a', bone: true, acc: 'mud' },
  fire: { spike: '#3a1a10', glow: '#ffb04a', hot: true, acc: 'ash' },
  jungle: { spike: '#2f6a4a', glow: '#7ad8c8', leaf: '#3e7a3a', acc: 'vine' },
  storm: { spike: '#8a8f9a', glow: '#9fd0ff', metal: '#6a6f78', acc: 'spark' },
  cave: { spike: '#3a2a40', glow: '#b48cff', acc: 'fungus' }
};
const MON3_ZONE_THEME = {
  wiesen: 'wild', wald: 'forest', orktal: 'desert', oedland: 'hell', frost: 'frost', moor: 'rot', vulkan: 'fire',
  sandwueste: 'desert', nagadschungel: 'jungle', donnerklamm: 'storm', titanenkamm: 'fire',
  spinnenhoehle: 'cave', orkfestung: 'war', eisgrotte: 'frost', drachenhort: 'fire', banditenkeller: 'war', totengruft: 'rot',
  schlangentempel: 'jungle', titanenschmiede: 'fire'
};
let mon3ThemeOf = null;
function monsterTheme3(id) {
  if (!mon3ThemeOf) {
    mon3ThemeOf = {};
    for (const z of ZONES) {
      const th = MON3_ZONE_THEME[z.id];
      if (!th) continue;
      for (const g of (z.groups || []).concat(z.night || [])) if (!mon3ThemeOf[g[0]]) mon3ThemeOf[g[0]] = th;
      if (z.dungeon) for (const m of [...(z.dungeon.mobs || []), z.dungeon.boss]) if (!mon3ThemeOf[m]) mon3ThemeOf[m] = th;
    }
  }
  const t = MONSTER_TYPES[id];
  return MON3_THEMES[mon3ThemeOf[id] || (t && t.raid && mon3ThemeOf[t.raid.art]) || 'wild'];
}

// Gebietsthema als Zubehör (seit 7.9): Waldmoos, Wüstensand, Schnee mit Eiszapfen, Asche mit Glut, Moorschlamm,
// Ranken, Leuchtpilze oder Funken. tops: Flecken oben auf Rücken und Schultern, under: was darunter hängt.
// Jeder Eintrag [Knochen, Punkt, Größe].
function themeAcc3(A, th, tops, under = []) {
  const acc = th.acc;
  if (!acc) return;
  const patch = (bone, p, s, c, top) => A(ball(8), c, { bone, p, s: [0.09 * s, 0.028 * s, 0.11 * s], top, topK: 0.6, noShadow: true });
  tops.forEach(([bone, p, s = 1], k) => {
    if (acc === 'moss') {
      patch(bone, p, s, th.leaf, lighter(th.leaf, 0.3));
      if (k % 2 === 0) A(horn3(0.07 * s, 0.02 * s, 4), '#6a9a3a', { bone, p: [p[0], p[1] + 0.01, p[2]], r: [0.5, 0, 0.4], noShadow: true });
    } else if (acc === 'snow') patch(bone, p, s, '#e6f2fc', '#ffffff');
    else if (acc === 'sand') A(ball(8), '#c8a870', { bone, p, s: [0.055 * s, 0.022 * s, 0.065 * s], top: '#e0c896', topK: 0.6, noShadow: true });
    else if (acc === 'mud') patch(bone, p, s, '#3a3624', '#5a5a34');
    else if (acc === 'ash') {
      // Ascheflocken und ein Glutfunke
      for (let j = 0; j < 3; j++) A(sphere3(1, 6, 4), j % 2 ? '#5a5450' : '#8a8480', { bone, p: [p[0] + (j - 1) * 0.035 * s, p[1], p[2] + ((j * 2) % 3 - 1) * 0.03 * s], s: [0.03 * s, 0.01 * s, 0.025 * s], noShadow: true });
      A(sphere3(0.014 * s, 6, 4), th.glow, { bone, p: [p[0] + 0.01 * s, p[1] + 0.012 * s, p[2] - 0.035 * s], mat: 'glow' });
    } else if (acc === 'vine') {
      // zwei spitze Blätter an einer Ranke
      for (const d of [-1, 1]) A(horn3(0.1 * s, 0.035 * s, 4), d > 0 ? th.leaf : lighter(th.leaf, 0.15), { bone, p, r: [-1.2, k * 1.3 + d * 0.6, 0], s: [1, 1, 0.3], noShadow: true });
      A(torus3(0.05 * s, 0.008 * s, Math.PI, 3, 6), darker(th.leaf, 0.25), { bone, p: [p[0], p[1] - 0.01, p[2]], r: [Math.PI / 2, 0, k], noShadow: true });
    } else if (acc === 'fungus') {
      A(cyl3(0.01 * s, 0.014 * s, 0.04 * s, 5), '#d8d0e0', { bone, p: [p[0], p[1] + 0.02 * s, p[2]], noShadow: true });
      A(cap3(0.032 * s, Math.PI * 0.5, 0, Math.PI * 2, 8, 3), th.glow, { bone, p: [p[0], p[1] + 0.035 * s, p[2]], s: [1, 0.6, 1], mat: 'glow' });
    } else if (acc === 'spark') A(horn3(0.09 * s, 0.014 * s, 4), th.glow, { bone, p, r: [0.4 - k * 0.5, 0, 0.5 - k * 0.4], mat: 'glow' });
  });
  under.forEach(([bone, p, s = 1]) => {
    // Eiszapfen, hängendes Moos und Ranken, Schlammtropfen
    if (acc === 'snow') A(horn3(0.1 * s, 0.018 * s, 4), '#d8f2ff', { bone, p, r: [Math.PI, 0, 0], shine: 1, noShadow: true });
    else if (acc === 'moss' || acc === 'vine') A(horn3(0.12 * s, 0.022 * s, 4), th.leaf, { bone, p, r: [Math.PI, 0, 0.1], noShadow: true });
    else if (acc === 'mud') A(horn3(0.06 * s, 0.02 * s, 4), '#3a3624', { bone, p, r: [Math.PI, 0, 0], noShadow: true });
  });
}

function monsterFlair3(b, res, id, def) {
  const t = MONSTER_TYPES[id];
  if (!t || !res) return;
  // eigene Großmodelle (Abaddor) bringen ihren Schmuck selbst mit
  if (res.noFlair) return;
  const th = monsterTheme3(id);
  const A = adder(b, null);
  const tier = Math.min(1, (t.level || 1) / 70);
  const elite = (t.hpMul || 1) >= 1.6 || t.boss;
  const spikeMat = th.hot ? 'glow' : 'lit';
  const spikeCol = th.ice ? '#d8f2ff' : th.hot ? th.glow : th.spike;
  const nSpikes = Math.round(2 + tier * 6);
  const o = def ? def.o || {} : {};
  const boar = !!o.tusk && !o.wings && o.small;
  if (res.family === 'beast' && !res.custom) {
    const { bodyY, len, bw, hp } = res;
    const topY = bodyY + 0.21 * bw;
    // Rückenstacheln bzw. Eiskristalle / Glutzacken
    if (t.level >= 6) for (let k = 0; k < nSpikes; k++) {
      const z = len * 0.5 - (k / Math.max(1, nSpikes - 1)) * len * 1.1;
      const h = (0.1 + 0.12 * tier) * (1 - Math.abs(k - nSpikes / 2) / nSpikes * 0.6);
      A(horn3(h, 0.035 + 0.02 * tier, 6), spikeCol, { bone: BQ.body, p: [0, bodyY + 0.2 * bw, z], r: [-0.35, 0, 0], mat: spikeMat, shine: th.ice ? 1 : 0.4, noShadow: true });
      if (th.ice && k % 2 === 0) A(horn3(h * 0.7, 0.03, 5), '#9fdcff', { bone: BQ.body, p: [0.07 * bw, bodyY + 0.17 * bw, z], r: [-0.3, 0, -0.5], shine: 1, noShadow: true });
    }
    // Krallen in Elfenbein an allen Pfoten, Fellbüschel am Ellbogen
    for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
      const big = sz > 0 && o.hump ? 1.6 : 1;
      // kleine Krallen vor den Zehen (seit 12.7.1 passend zur neuen Pfote)
      const cz = sz * len * 0.62 + (sz > 0 ? 0.04 : 0.005) + 0.075;
      for (const dx of [-0.03, -0.011, 0.011, 0.03]) A(horn3((0.026 + 0.01 * tier) * big, 0.007 * Math.sqrt(big), 4), '#e8e0cc', { bone, p: [sx * 0.156 * bw + dx * bw, 0.02, cz - Math.abs(dx) * 0.4], r: [Math.PI / 2 + 0.5, 0, 0], shine: 0.6 });
      A(horn3(0.08, 0.034, 5), darker(o.fur || t.color, 0.12), { bone, p: [sx * 0.17 * bw, bodyY * 0.55, sz * len * 0.62 - 0.05], r: [-2.2, 0, sx * 0.3], s: [1, 1, 0.6], noShadow: true });
    }
    // Fänge, Glut im Maul bei Feuer
    if (!o.fangs && !boar) for (const sx of [-1, 1]) A(horn3(0.06, 0.016, 5), '#f4ecd8', { bone: BQ.head, p: [sx * 0.035, hp[1] - 0.09, hp[2] + 0.17], r: [Math.PI, 0, 0], shine: 0.4 });
    if (th.hot) A(ball(8), th.glow, { bone: BQ.head, p: [0, hp[1] - 0.08, hp[2] + 0.2], s: [0.05, 0.02, 0.06], mat: 'glow' });
    // starke Tiere: Schulterplatten (nur mit Metall im Gebiet), Halsband mit Dornen
    if (elite) {
      if (th.metal) for (const sx of [-1, 1]) A(cap3(0.12 * bw, Math.PI * 0.5, 0, Math.PI * 2, 10, 4), th.metal, { bone: BQ.body, p: [sx * 0.17 * bw, bodyY + 0.12, len * 0.45], r: [0, 0, -sx * 0.7], shine: 0.7, noShadow: true });
      A(torus3(0.15 * bw, 0.025, Math.PI * 2, 4, 14), th.metal || darker(th.spike, 0.35), { bone: BQ.neck, p: [0, bodyY + 0.12, len * 0.68], r: [0.5, 0, 0], shine: 0.6 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        A(horn3(0.05, 0.015, 4), '#d9dde2', { bone: BQ.neck, p: [Math.cos(a) * 0.16 * bw, bodyY + 0.12 + Math.sin(a) * 0.08, len * 0.68 + Math.sin(a) * 0.06], r: [Math.sin(a) * 1.5 + 0.5, 0, -Math.cos(a) * 1.5], shine: 1, noShadow: true });
      }
    }
    themeAcc3(A, th, [[BQ.body, [0.08 * bw, topY - 0.02, len * 0.15], bw], [BQ.body, [-0.07 * bw, topY - 0.03, -len * 0.4], bw], [BQ.head, [0.05, hp[1] + 0.15, hp[2] - 0.04], 0.7]],
      [[BQ.body, [0.1 * bw, bodyY - 0.16, len * 0.2]], [BQ.body, [-0.1 * bw, bodyY - 0.16, -len * 0.25]], [11, [0, hp[1] - 0.14, hp[2] + 0.2], 0.7]]);
  } else if (res.family === 'beast' && res.topY) {
    // eigene Tiermodelle: nur das Gebietszubehör auf dem Rücken
    themeAcc3(A, th, [[BQ.body, [0.07, res.topY - 0.02, 0.1]], [BQ.body, [-0.06, res.topY - 0.05, -0.2]]]);
  } else if (res.family === 'human') {
    const { shY, hipY, shX = 0.25, hc = [0, shY + 0.3, 0.02], hr = 0.3 } = res;
    // Schulterstacheln ab Stufe 20 (Glutzacken, Eis, Knochen, Metall)
    if (t.level >= 20) for (const [sx, bone] of [[1, BH.armL], [-1, BH.armR]]) {
      const n = Math.round(1 + tier * 3);
      for (let k = 0; k < n; k++) A(horn3(0.08 + 0.08 * tier, 0.03, 6), th.bone ? '#e8e0c8' : spikeCol, { bone, p: [sx * (shX + 0.02), shY + 0.08, 0.05 - k * 0.07], r: [-0.2, 0, -sx * (0.5 + k * 0.15)], mat: spikeMat, shine: 0.7 });
    }
    // Rückenzacken oder Kristalle zwischen den Schultern
    if (t.level >= 30 && !res.golem) for (let k = 0; k < Math.round(1 + tier * 3); k++) A(horn3(0.12 + 0.06 * tier, 0.035, 6), spikeCol, { bone: BH.chest, p: [(k - 1) * 0.08, shY - 0.04, -0.2], r: [-0.9, 0, (k - 1) * 0.25], mat: spikeMat, shine: 0.8 });
    // glühende Augen bei allem, was nicht wie ein Mensch aussieht (Golems haben eigene Augenschlitze)
    if ((t.shape !== 'humanoid' || t.level >= 50) && !res.golem) for (const sx of [-1, 1]) A(sphere3(0.026, 7, 5), th.glow, { bone: BH.head, p: [hc[0] + sx * hr * 0.32, hc[1] + hr * 0.08, hc[2] + hr * 0.92], mat: 'glow' });
    // Gürtel mit Schädel (Moder), Trophäen-Zähne (Orks), Brustplatte (starke Krieger)
    if (th.bone || t.shape === 'orc') {
      A(sphere3(0.07, 8, 6), '#e8e0c8', { bone: BH.hips, p: [0.12, hipY + 0.02, 0.17], shine: 0.3 });
      for (let k = 0; k < 5; k++) A(horn3(0.06, 0.014, 4), '#f0e8d4', { bone: BH.chest, p: [-0.12 + k * 0.06, shY - 0.1 - Math.abs(k - 2) * 0.02, 0.2], r: [Math.PI, 0, 0] });
    }
    if (elite && !res.golem) {
      const fz = res.belly ? 0.36 : 0.17;
      A(roundBox(0.34, 0.2, 0.06, 0.03), th.metal || darker(t.color, 0.35), { bone: BH.chest, p: [0, shY - 0.14, fz], shine: 0.8, top: lighter(th.metal || t.color, 0.2), topK: 0.4 });
      A(sphere3(0.035, 8, 6), th.glow, { bone: BH.chest, p: [0, shY - 0.13, fz + 0.04], mat: 'glow' });
    }
    if (res.golem) {
      // Kristalle wachsen aus Schultern und Rücken
      for (let k = 0; k < 3 + Math.round(tier * 3); k++) {
        const sx = k % 2 ? 1 : -1;
        A(horn3(0.18 + (k % 3) * 0.06, 0.06, 5), th.ice ? '#bfe8ff' : th.glow, { bone: BH.chest, p: [sx * (0.15 + (k % 3) * 0.1), shY + 0.05, -0.15 - (k % 2) * 0.08], r: [-0.6, 0, -sx * 0.5], mat: th.ice ? 'lit' : 'glow', shine: 1 });
      }
    }
    humanFlair3(A, res, id, t, th, o);
    // Gebietszubehör auf den Schultern (bei Golems auch auf dem Kopf)
    const sx0 = shX + (res.belly ? 0.02 : 0);
    themeAcc3(A, th, [[BH.armL, [sx0, shY + (res.belly ? 0.13 : 0.09), -0.04], res.belly ? 1.3 : 0.9], [BH.armR, [-sx0, shY + (res.belly ? 0.13 : 0.09), 0.03], res.belly ? 1.2 : 0.8]].concat(res.golem ? [[BH.head, [hc[0], hc[1] + 0.15, hc[2] - 0.02], 1.1]] : []),
      res.golem ? [[BH.handL, [shX + 0.08, shY - 0.66, 0.06], 1.2], [BH.handR, [-shX - 0.08, shY - 0.66, 0.06], 1.2]] : []);
  } else if (res.family === 'spider') {
    const { bodyY, ab = 1, az = -0.34 } = res;
    // Dornen auf dem Hinterleib, leuchtende Zeichnung, große Kieferklauen
    for (let k = 0; k < nSpikes; k++) {
      const a = -0.9 + (k / Math.max(1, nSpikes - 1)) * 1.8;
      A(horn3(0.1 + 0.08 * tier, 0.03, 5), spikeCol, { bone: 1, p: [Math.sin(a) * 0.22 * ab, bodyY + 0.36 * ab, az + Math.cos(a) * 0.12 * ab], r: [-0.3, 0, -Math.sin(a) * 0.8], mat: spikeMat, shine: 0.5, noShadow: true });
    }
    A(ball(10), th.glow, { bone: 1, p: [0, bodyY + 0.385 * ab, az - 0.08], s: [0.07, 0.02, 0.1], mat: 'glow' });
    for (const sx of [-1, 1]) A(horn3(0.13, 0.03, 6), '#1a120c', { bone: 2, p: [sx * 0.045, bodyY - 0.04, 0.42], r: [Math.PI - 0.9, 0, sx * 0.2], shine: 0.6 });
    themeAcc3(A, th, [[1, [0.12 * ab, bodyY + 0.33 * ab, az + 0.12 * ab], ab], [1, [-0.14 * ab, bodyY + 0.3 * ab, az - 0.14 * ab], ab]], [[1, [0.1, bodyY - 0.15, az], ab]]);
  } else if (res.family === 'scorpion') {
    const bodyY = res.bodyY;
    for (let k = 0; k < 4; k++) A(horn3(0.07 + 0.05 * tier, 0.025, 5), spikeCol, { bone: 1, p: [0, bodyY + 0.14, 0.18 - k * 0.14], r: [-0.4, 0, 0], mat: spikeMat, shine: 0.6, noShadow: true });
    // Glanzpunkte auf den schwarzen Augen
    for (const sx of [-1, 1]) A(sphere3(0.008, 6, 4), '#ffffff', { bone: 1, p: [sx * 0.045, bodyY + 0.15, 0.295], mat: 'glow' });
    themeAcc3(A, th, [[1, [0.12, bodyY + 0.12, 0.05]], [1, [-0.1, bodyY + 0.12, -0.2]]]);
  } else if (res.family === 'ghost') {
    // schwebende Seelenlichter (seit 13.8 ohne die Kettenglieder um die Taille, die von oben wie Augen wirkten)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      A(sphere3(0.05, 8, 6), th.glow, { bone: 3, p: [Math.cos(a) * 0.45, 1.05 + k * 0.08, Math.sin(a) * 0.45], mat: 'glow' });
    }
  } else if (res.family === 'serpent') {
    // Rückenflossen / Stacheln entlang des Körpers, Fänge
    // Nagas: Rückenkamm aus Flossenhaut; Schlangen: Fänge und Gebietszubehör auf dem Rücken
    if (res.naga) for (let k = 2; k < 7; k++) A(horn3(0.1 + 0.06 * tier - (k - 2) * 0.012, 0.06, 4), o.mark || th.spike, { bone: k, p: [Math.sin(k * 0.9) * 0.08, 0.24, 0.42 - k * 0.16], r: [-0.7, 0, 0], s: [0.25, 1, 1], shine: 0.5, noShadow: true });
    else for (const sx of [-1, 1]) A(horn3(0.06, 0.012, 4), '#f4ecd8', { bone: 1, p: [sx * 0.04, 0.46, 0.66], r: [Math.PI, 0, 0], shine: 0.5 });
    if (th.acc !== 'sand') themeAcc3(A, th, [[3, [Math.sin(2.7) * 0.08, 0.245, 0.42 - 3 * 0.16], 0.8], [5, [Math.sin(4.5) * 0.08, 0.235, 0.42 - 5 * 0.16], 0.7]]);
  }
  // Leuchtkreis am Boden unter starken Monstern
  if (elite) A(torus3(0.42, 0.018, Math.PI * 2, 4, 28), th.glow, { bone: 0, p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], mat: 'aura' });
  // Endbosse: Krone aus Hörnern, schwebende Runensteine, doppelter Runenring
  if (t.raid) {
    const col = t.boss.color;
    const top = res.height || 1;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      A(sphere3(0.05, 8, 6), col, { bone: 0, p: [Math.cos(a) * 0.7, top * 0.6 + (k % 2) * 0.15, Math.sin(a) * 0.7], mat: 'glow' });
      A(box3(), col, { bone: 0, p: [Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62], r: [-Math.PI / 2, 0, a], mat: 'glow', s: [0.06, 0.12, 0.02] });
    }
    A(torus3(0.62, 0.02, Math.PI * 2, 4, 36), col, { bone: 0, p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], mat: 'aura' });
    A(torus3(0.75, 0.012, Math.PI * 2, 4, 36), col, { bone: 0, p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
    const headBone = res.family === 'beast' ? BQ.head : res.family === 'human' ? BH.head : 1;
    const hp = res.crownAt || res.family === 'beast' ? res.crownAt || [0, res.bodyY + 0.33, (o.long || 0.44) + 0.14] : res.family === 'human' ? [res.hc[0], res.hc[1] + res.hr * 0.95, res.hc[2]] : [0, top * 0.95, 0.2];
    for (let k = -2; k <= 2; k++) A(horn3(0.16 - Math.abs(k) * 0.025, 0.035, 6), '#ffd34d', { bone: headBone, p: [hp[0] + k * 0.06, hp[1], hp[2] - Math.abs(k) * 0.02], r: [-0.2, 0, -k * 0.25], mat: 'glow' });
  }
}

// Ring, dessen Achse von p aus in Richtung d zeigt (Hornringe, Armreife, Fesseln)
function ringAt3(A, r, t, color, p, d, o) {
  pointAt3(A, geo3(`ringy${r},${t}`, () => new THREE.TorusGeometry(r, t, 3, 10).rotateX(Math.PI / 2)), color, p, d, o);
}

// Schmuck für menschenartige Monster (seit 7.9) – hängt nur an die Knochen der fertigen Gestalt:
// Riesen, Oger und Trolle mit Bauchfalte, Gürtel voller Beute, Knochenschmuck, Warzen und Flechten;
// Orks mit Leder- und Eisenteilen, Stammeszeichen und Zopf; Dämonen mit Adern in der Flügelhaut, Glutrissen
// und Pfeilspitze am Schwanz; Banditen, Untote, Hexe und Bosse mit eigenem Zubehör.
function humanFlair3(A, res, id, t, th, o) {
  const { shY, hipY, shX, hc, hr, belly } = res;
  const armLen = belly ? 0.46 : 0.31;
  const armR = belly ? 0.11 : 0.062;
  const hipX = belly ? 0.16 : 0.105;
  const front = belly ? 0.4 : 0.18;
  const skin = o.skin || t.color;
  const arms = [[1, BH.armL, BH.handL, BH.legL], [-1, BH.armR, BH.handR, BH.legR]];
  const brute = t.shape === 'brute' && !res.golem;
  // Gürtel mit Beute: Strick- bzw. Ledergurt, Beutel, Knochen, kleiner Schädel
  const lootBelt = (strap, extra) => {
    const by = hipY + (belly ? 0.04 : 0.02);
    const br = belly ? 0.42 : 0.215;
    A(torus3(br, 0.026, Math.PI * 2, 4, 18), strap, { bone: BH.hips, p: [0, by, 0.02], r: [Math.PI / 2, 0, 0], s: [1, 0.88, 1] });
    A(roundBox(0.09, 0.1, 0.06, 0.025), lighter(strap, 0.12), { bone: BH.hips, p: [-br * 0.75, by - 0.07, br * 0.55], r: [0, -0.7, 0.1] });
    A(torus3(0.025, 0.008, Math.PI * 2, 3, 6), darker(strap, 0.2), { bone: BH.hips, p: [-br * 0.75, by - 0.01, br * 0.58], r: [0, -0.7, 0] });
    if (extra) {
      // Knochen und Schädel baumeln am Gurt
      limbBetween(A, [br * 0.5, by - 0.02, br * 0.82], [br * 0.6, by - 0.18, br * 0.82], 0.014, 0.014, '#e8e0c8', { bone: BH.hips, seg: 4 });
      for (const y of [-0.02, -0.18]) A(sphere3(0.022, 6, 4), '#e8e0c8', { bone: BH.hips, p: [br * (y < -0.1 ? 0.6 : 0.5), by + y, br * 0.82] });
      A(ball(8), '#e8e0c8', { bone: BH.hips, p: [br * 0.15, by - 0.08, br * 0.95], s: 0.045, shine: 0.2 });
      for (const sx of [-1, 1]) A(sphere3(0.011, 6, 4), '#1a1210', { bone: BH.hips, p: [br * 0.15 + sx * 0.016, by - 0.075, br * 0.95 + 0.04] });
    }
  };
  // Warzen bzw. Flechtenflecken auf Kopf, Schultern und Bauch
  const warts = (color, n) => {
    const spots = [[BH.head, [hc[0] + hr * 0.5, hc[1] + hr * 0.2, hc[2] + hr * 0.75]], [BH.head, [hc[0] - hr * 0.35, hc[1] - hr * 0.35, hc[2] + hr * 0.85]], [BH.chest, [0.15, hipY + 0.32, front * 0.95]],
      [BH.chest, [-0.2, hipY + 0.1, front * 0.85]], [BH.armL, [shX + 0.06, shY + 0.06, 0.05]], [BH.armR, [-shX - 0.04, shY + 0.07, -0.04]]];
    spots.slice(0, n).forEach(([bone, p], k) => A(sphere3(k < 2 ? 0.02 : 0.03, 6, 4), color, { bone, p, noShadow: true }));
  };
  const lichen = (color) => {
    for (const [sx, bone] of [[1, BH.armL], [-1, BH.armR]]) A(ball(8), color, { bone, p: [sx * (shX + 0.02), shY + 0.11, 0.02], s: [0.1, 0.03, 0.09], r: [0, 0, -sx * 0.4], top: lighter(color, 0.2), topK: 0.5, noShadow: true });
  };
  // Lederwickel bzw. Armschienen an den Unterarmen
  const bracers = (color, metal) => {
    for (const [sx, ab] of arms) for (let k = 0; k < (metal ? 1 : 3); k++) {
      const y = shY - armLen + 0.06 + k * 0.045;
      if (metal) A(lathe3('bracer', [[armR * 1.0, 0], [armR * 1.08, 0.06], [armR * 1.02, 0.12], [0, 0.121]], 10), color, { bone: ab, p: [sx * shX, y, 0.01], s: [1.15, 1, 1.15], shine: 0.8 });
      else A(torus3(armR * 1.0, 0.014, Math.PI * 2, 3, 10), k % 2 ? color : darker(color, 0.12), { bone: ab, p: [sx * shX, y, 0.01], r: [Math.PI / 2 + (k % 2 ? 0.25 : -0.25), 0, 0], noShadow: true });
    }
  };
  // Zopf am Hinterkopf (Orks): Glieder mit Band und Quaste
  const braid = (color) => {
    let prev = [hc[0], hc[1] - hr * 0.1, hc[2] - hr * 0.9];
    for (let k = 1; k <= 3; k++) {
      const next = [hc[0], prev[1] - hr * 0.3, prev[2] - 0.015];
      A(ball(8), k % 2 ? color : darker(color, 0.15), { bone: BH.cape, p: next, s: [hr * 0.15, hr * 0.19, hr * 0.15], noShadow: true });
      prev = next;
    }
    A(torus3(hr * 0.11, hr * 0.035, Math.PI * 2, 3, 8), '#c9a35a', { bone: BH.cape, p: [prev[0], prev[1] - hr * 0.14, prev[2]], r: [Math.PI / 2, 0, 0], shine: 1 });
    A(horn3(hr * 0.28, hr * 0.12, 5), color, { bone: BH.cape, p: [prev[0], prev[1] - hr * 0.16, prev[2]], r: [Math.PI, 0, 0] });
  };
  // Kriegsbemalung bzw. Stammeszeichen: Streifen auf der Brust, Zeichen am Oberarm
  const paint = (color, chest) => {
    if (chest) for (let k = 0; k < 3; k++) A(box3(), color, { bone: BH.chest, p: [(k - 1) * 0.08, hipY + 0.28, front + 0.005], r: [0, 0, (k - 1) * 0.25], noShadow: true, s: [0.035, 0.16, 0.012] });
    for (const [sx, ab] of arms) {
      A(torus3(armR * 1.06, 0.012, Math.PI * 2, 3, 10), color, { bone: ab, p: [sx * shX, shY - armLen * 0.35, 0.003], r: [Math.PI / 2, 0, 0], noShadow: true });
      A(box3(), color, { bone: ab, p: [sx * (shX + armR * 1.02), shY - armLen * 0.5, 0.01], r: [0, 0, sx * 0.3], noShadow: true, s: [0.012, 0.05, 0.03] });
    }
  };
  // Glutrisse bzw. Blitzadern als Zickzack auf Unterarmen und Brust
  const veins = (color) => {
    for (const [sx, ab] of arms) for (let k = 0; k < 2; k++) A(box3(), color, { bone: ab, p: [sx * (shX + armR * 0.9), shY - armLen * (0.35 + k * 0.3), 0.03], r: [0, 0, sx * (k ? -0.5 : 0.5)], mat: 'glow', s: [0.014, 0.1, 0.014] });
    for (const [x, y, r] of [[-0.14, 0.36, 0.7], [-0.08, 0.22, -0.5], [0.15, 0.3, -0.6]]) A(box3(), color, { bone: BH.chest, p: [x * (belly ? 1.6 : 1), hipY + y, front + 0.01], r: [0, 0, r], mat: 'glow', s: [0.016, 0.13, 0.016] });
  };
  const furTufts = (color, n) => {
    for (let k = 0; k < n; k++) {
      const [sx, ab] = arms[k % 2];
      const y = shY - armLen * (0.15 + Math.floor(k / 2) * 0.32);
      pointAt3(A, horn3(0.11, 0.05, 5), k % 4 < 2 ? color : darker(color, 0.06), [sx * (shX + armR * 0.9), y, -0.02], [sx * 0.8, -0.9, -0.3], { bone: ab, s: [1, 1, 0.6], noShadow: true });
    }
  };

  // --- Riesen, Oger, Trolle und andere Brocken
  if (brute) {
    if (belly) {
      // Bauchfalte und Nabel
      A(ball(10), darker(skin, 0.18), { bone: BH.chest, p: [0, hipY + 0.11, 0.36], s: [0.26, 0.022, 0.06], r: [0.2, 0, 0], noShadow: true });
      A(sphere3(0.018, 6, 4), darker(skin, 0.3), { bone: BH.chest, p: [0, hipY + 0.2, 0.415], noShadow: true });
    }
    if (id === 'oger') { lootBelt('#5a4632', true); warts(darker(skin, 0.2), 4); lichen('#8a9a6a'); }
    if (id === 'trollkrieger') {
      lootBelt('#4a3a2a', true); warts(darker(skin, 0.22), 6); lichen('#a8b878');
      // Knochenschmuck in den Ohren
      for (const sx of [-1, 1]) A(torus3(hr * 0.12, hr * 0.03, Math.PI * 2, 3, 8), '#e8e0c8', { bone: BH.head, p: [hc[0] + sx * hr * 1.2, hc[1] - hr * 0.12, hc[2]], r: [0, Math.PI / 2, 0], noShadow: true });
      // lange Knollennase
      A(ball(8), darker(skin, 0.06), { bone: BH.head, p: [hc[0], hc[1] - hr * 0.2, hc[2] + hr * 1.05], s: [hr * 0.18, hr * 0.16, hr * 0.28], shade: 0.2 });
    }
    if (id === 'yeti' || id === 'ymir') {
      furTufts('#e8eef4', 8);
      for (let k = -2; k <= 2; k++) pointAt3(A, horn3(0.12, 0.05, 5), k % 2 ? '#e8eef4' : '#d8e2ec', [hc[0] + k * hr * 0.3, hc[1] + hr * 0.85, hc[2] - hr * 0.2], [k * 0.3, 0.6, -1], { bone: BH.head, s: [1, 1, 0.6], noShadow: true });
    }
    if (id === 'ymir') {
      // Eiskristalle wachsen aus den Schultern, Eiszapfen hängen am Kinn
      for (const [sx, ab] of arms) for (let k = 0; k < 3; k++) A(horn3(0.22 - k * 0.04, 0.05, 5), k % 2 ? '#7fcff0' : '#a8e4ff', { bone: ab, p: [sx * (shX + 0.02), shY + 0.12, 0.08 - k * 0.09], r: [-0.2, 0, -sx * (0.35 + k * 0.25)], shine: 1 });
      for (let k = -1; k <= 1; k++) A(horn3(0.1 - Math.abs(k) * 0.02, 0.018, 4), '#d8f2ff', { bone: BH.head, p: [hc[0] + k * hr * 0.25, hc[1] - hr * 0.75, hc[2] + hr * 0.7], r: [Math.PI, 0, 0], shine: 1, noShadow: true });
    }
    if (id === 'minotaurus') {
      // Nackenbuckel, Brustfell, Lederwickel, Lendenschurz-Gurt
      A(ball(12), skin, { bone: BH.chest, p: [0, shY + 0.02, -0.12], s: [0.32, 0.17, 0.22], top: darker(skin, 0.2), topK: 0.5, shade: 0.2 });
      for (let k = -2; k <= 2; k++) pointAt3(A, horn3(0.12, 0.05, 5), k % 2 ? darker(skin, 0.15) : darker(skin, 0.25), [k * 0.08, shY - 0.06, 0.3], [k * 0.3, -0.8, 0.6], { bone: BH.chest, s: [1, 1, 0.5], noShadow: true });
      bracers('#5a3418', false);
      lootBelt('#3a2a1a', false);
    }
    if (id === 'ghul') {
      // Rippen über dem Bauch, Wirbelsäule auf dem krummen Rücken, fahle Flecken
      for (let k = 0; k < 3; k++) A(torus3(0.33 - k * 0.02, 0.014, Math.PI * 0.55, 3, 8), lighter(skin, 0.15), { bone: BH.chest, p: [0, hipY + 0.36 - k * 0.07, 0.05], r: [Math.PI / 2 - 0.3, 0, Math.PI * 0.225], s: [1, 1.2, 1], noShadow: true });
      for (let k = 0; k < 4; k++) A(sphere3(0.035 - k * 0.003, 6, 4), lighter(skin, 0.1), { bone: BH.chest, p: [0, shY - 0.02 - k * 0.1, -0.3 + k * 0.03], noShadow: true });
      warts(darker(skin, 0.25), 6);
    }
    if (id === 'donnerriese' || id === 'tarkon') {
      veins('#bfe8ff');
      lootBelt('#2a3248', false);
      if (id === 'tarkon') {
        bracers('#4a5a78', true);
        // kleine schwarze Gewitterwolke über dem Kopf, aus der Blitze zucken
        for (const [x, y, z, s] of [[0, 0.45, 0, 0.16], [0.14, 0.42, 0.04, 0.12], [-0.15, 0.43, -0.03, 0.13], [0.04, 0.5, -0.1, 0.11]]) A(ball(10), '#2a2a34', { bone: BH.head, p: [hc[0] + x, hc[1] + hr + y, hc[2] + z], s: [s * 1.2, s * 0.8, s], top: '#4a4a5a', topK: 0.5 });
        for (const x of [-0.1, 0.08]) A(horn3(0.22, 0.02, 3), '#bfe8ff', { bone: BH.head, p: [hc[0] + x, hc[1] + hr + 0.36, hc[2]], r: [Math.PI, 0, x * 3], mat: 'glow' });
      }
    }
  }
  // --- Orks: Leder- und Eisenteile, Stammeszeichen, Zopf
  if (t.shape === 'orc') {
    const h = HEAD3[id] || (t.raid && HEAD3[t.raid.art]) || (t.look && HEAD3[t.look]) || {};
    braid(h.mohawk || '#2a2018');
    if (id === 'ork') { bracers('#5a4632', false); paint('#2a3a1a', false); }
    if (id === 'orkschamane') {
      paint('#e8e0cc', false);
      // Knochenfetische am Gewand
      for (const x of [-0.12, 0.1]) {
        limbBetween(A, [x, hipY + 0.1, 0.24], [x, hipY - 0.06, 0.26], 0.006, 0.006, '#3a2a1c', { bone: BH.hips, seg: 3 });
        A(ball(8), '#e8e0c8', { bone: BH.hips, p: [x, hipY - 0.09, 0.26], s: [0.03, 0.035, 0.03] });
      }
    }
    if (id === 'orkberserker') { paint('#c8302a', true); bracers('#5a2a1a', false); }
    if (id === 'orkhauptmann' || id === 'gorbag') bracers('#c9a35a', true);
    if (id === 'orkelite' || id === 'kriegsherr') bracers(id === 'orkelite' ? '#6e7680' : '#c9a35a', true);
    if (id === 'orkelite') {
      // Rundschild auf dem Rücken, Wappen auf dem Umhang
      A(cyl3(0.2, 0.2, 0.03, 14), '#6a4a2e', { bone: BH.chest, p: [0, shY - 0.12, -0.26], r: [Math.PI / 2 + 0.1, 0, 0], shine: 0.2 });
      A(torus3(0.2, 0.018, Math.PI * 2, 3, 14), '#9aa1a8', { bone: BH.chest, p: [0, shY - 0.12, -0.27], r: [0.1, 0, 0], shine: 0.9 });
      A(sphere3(0.05, 8, 6), '#9aa1a8', { bone: BH.chest, p: [0, shY - 0.14, -0.29], s: [1, 1, 0.6], shine: 1 });
    }
    if (id === 'kriegsherr' || id === 'gorbag') {
      // Trophäenkette mit kleinen Schädeln
      for (let k = -2; k <= 2; k += 2) {
        A(ball(8), '#e8e0c8', { bone: BH.chest, p: [k * 0.07, shY - 0.1 - Math.abs(k) * 0.02, 0.22], s: 0.035, shine: 0.2 });
        for (const sx of [-1, 1]) A(sphere3(0.008, 6, 4), '#1a1210', { bone: BH.chest, p: [k * 0.07 + sx * 0.012, shY - 0.1 - Math.abs(k) * 0.02, 0.252] });
      }
    }
    if (id === 'gorbag') {
      // zwei hohe Kriegsbanner mit Clanzeichen auf dem Rücken, weiße Schädelbemalung im Gesicht
      for (const sx of [-1, 1]) {
        A(limb3(0.95, 0.018, 0.018, 5), '#3a2a1c', { bone: BH.chest, p: [sx * 0.14, shY + 0.75, -0.22], r: [-0.12, 0, -sx * 0.12] });
        A(horn3(0.08, 0.025, 4), '#c9a35a', { bone: BH.chest, p: [sx * 0.23, shY + 0.78, -0.13], r: [-0.12, 0, -sx * 0.12], shine: 1 });
        A(roundBox(0.24, 0.34, 0.012, 0.006), '#8a1a14', { bone: BH.chest, p: [sx * 0.27, shY + 0.52, -0.17], r: [-0.12, 0, -sx * 0.12], shade: 0.2 });
        A(torus3(0.05, 0.014, Math.PI * 2, 3, 10), '#e8e0cc', { bone: BH.chest, p: [sx * 0.27, shY + 0.55, -0.155], r: [-0.12, 0, 0] });
      }
      for (const sx of [-1, 1]) A(ball(8), '#f0ece0', { bone: BH.head, p: [hc[0] + sx * hr * 0.37, hc[1] - hr * 0.08, hc[2] + hr * 0.82], s: [hr * 0.24, hr * 0.2, hr * 0.12], mat: 'face' });
    }
  }
  // --- Dämonen: Adern in der Flügelhaut, Glutrisse, Pfeilspitze am Schwanz; Harpyie mit Schwungfedern
  if (t.shape === 'demon') {
    const wingC = o.wings || '#4a1a20';
    for (const [sx, bone] of [[1, BH.wingL], [-1, BH.wingR]]) {
      const wx = sx * 0.12;
      const root = [wx, shY - 0.02, -0.2];
      if (id === 'harpyie') {
        // Schwungfedern in drei Tönen entlang der Unterkante
        const fc = ['#8a6a9a', '#c8a8d8', '#6a4a7a'];
        for (let k = 0; k < 6; k++) pointAt3(A, horn3(0.2 - k * 0.012, 0.05, 4), fc[k % 3], [wx + sx * (0.12 + k * 0.11), shY - 0.12 - (k % 2) * 0.03, -0.2], [sx * 0.25, -1, -0.1], { bone, s: [1, 1, 0.3] });
      } else for (const [x, y] of [[0.5, -0.2], [0.28, -0.26], [0.7, 0.02]]) for (const dz of [0.022, -0.022]) {
        limbBetween(A, [root[0], root[1], root[2] + 0.008 + dz], [wx + sx * x * 0.92, shY - 0.02 + y * 0.92, root[2] + 0.008 + dz], 0.009, 0.005, darker(wingC, 0.35), { bone, seg: 3, noShadow: true });
      }
      // brennende Flügelränder (Höllenfürst)
      if (id === 'azaroth') for (let k = 0; k < 4; k++) A(horn3(0.1, 0.03, 4), k % 2 ? '#ffb04a' : '#ff4a2a', { bone, p: [wx + sx * (0.2 + k * 0.17), shY - 0.2 + (k === 3 ? 0.18 : 0), -0.19], r: [Math.PI, 0, sx * 0.3], mat: 'glow' });
    }
    if (id !== 'harpyie') {
      // Pfeilspitze bzw. Steinspitze am Schwanzende
      const t2 = [0, hipY + 0.05, -0.7];
      const tail = darker(skin, 0.3);
      for (const sx of [-1, 1]) pointAt3(A, horn3(0.1, 0.035, 4), id === 'gargoyle' ? '#4a4a52' : tail, [t2[0] + sx * 0.02, t2[1] + 0.05, t2[2] - 0.04], [sx * 0.9, -0.5, 0.5], { bone: BH.tail, s: [1, 1, 0.45] });
    }
    if (id === 'daemon' || id === 'feuerdaemon' || id === 'azaroth') veins(id === 'feuerdaemon' ? '#ffd34d' : '#ffb04a');
    if (id === 'gargoyle') {
      // Steinplatten auf Brust und Schultern, gemeißelte Runen in der Flügelhaut
      for (const sx of [-1, 1]) A(roundBox(0.13, 0.15, 0.04, 0.02), '#5a5a62', { bone: BH.chest, p: [sx * 0.08, hipY + 0.3, 0.17], r: [0.1, sx * 0.3, 0], top: '#7a7a82', topK: 0.4 });
      for (const [sx, bone] of [[1, BH.wingL], [-1, BH.wingR]]) A(torus3(0.05, 0.01, Math.PI * 2, 3, 8), '#9fd0ff', { bone, p: [sx * 0.42, shY + 0.02, -0.17], mat: 'glow' });
    }
    if (id === 'azaroth') {
      // Krone aus sechs gebogenen Hörnern, Feuer aus den Hufen
      for (let k = 0; k < 6; k++) {
        const a = -1.6 + (k / 5) * 3.2;
        A(horn3(0.22, 0.035, 5), '#2a1416', { bone: BH.head, p: [hc[0] + Math.sin(a) * hr * 0.75, hc[1] + hr * 0.75, hc[2] - Math.cos(a) * hr * 0.3], r: [-0.4, 0, -a * 0.45], shine: 0.5 });
      }
      for (const [sx, , , lb] of arms) for (let k = -1; k <= 1; k++) A(horn3(0.12, 0.035, 4), k ? '#ff7a3a' : '#ffd34d', { bone: lb, p: [sx * hipX + k * 0.04, 0.05, 0.06], r: [0, 0, k * 0.4], mat: 'glow' });
    }
  }
  // --- Banditen, Untote, Hexe
  if (id === 'bandit' || id === 'banditenfuerst') {
    // Dolch am Gürtel, praller Beutel
    A(box3(), '#c8ccd2', { bone: BH.hips, p: [0.17, hipY - 0.08, 0.1], r: [0, 0.5, 0.15], shine: 1, s: [0.03, 0.13, 0.015] });
    A(box3(), '#3a2a1c', { bone: BH.hips, p: [0.17, hipY + 0.0, 0.1], r: [0, 0.5, 0.15], s: [0.06, 0.02, 0.02] });
  }
  if (id === 'banditschuetze') bracers('#6b4a2e', false);
  if (id === 'armbrustschuetze') {
    // Laterne am Gürtel, Bolzenköcher an der Hüfte
    A(cyl3(0.04, 0.045, 0.08, 6), '#3a2a1c', { bone: BH.hips, p: [0.19, hipY - 0.1, 0.08] });
    A(sphere3(0.032, 6, 4), '#ffcc6a', { bone: BH.hips, p: [0.19, hipY - 0.1, 0.08], mat: 'glow' });
    A(lathe3('quiver2', [[0, 0], [0.065, 0], [0.075, 0.36], [0, 0.37]], 10), '#6b4a2e', { bone: BH.hips, p: [-0.2, hipY - 0.22, -0.04], s: [0.7, 0.6, 0.7], r: [0, 0, 0.15] });
  }
  if (id === 'kellerwache') {
    // großer Schlüsselbund am Gürtel, rote Nase
    A(torus3(0.05, 0.01, Math.PI * 2, 3, 10), '#8a8e96', { bone: BH.hips, p: [0.15, hipY - 0.06, 0.15], r: [0, 0.6, 0], shine: 1 });
    for (let k = -1; k <= 1; k++) A(box3(), '#c9a35a', { bone: BH.hips, p: [0.15 + k * 0.025, hipY - 0.13, 0.16], r: [0, 0.6, k * 0.3], shine: 1, s: [0.012, 0.08, 0.008] });
    A(sphere3(hr * 0.09, 6, 4), '#c84a3a', { bone: BH.head, p: [hc[0], hc[1] - hr * 0.22, hc[2] + hr * 0.98] });
  }
  if (id === 'banditenfuerst') {
    // Kette aus Ringen und Münzen
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.18 + (k / 6) * 0.64);
      A(cyl3(0.022, 0.022, 0.006, 6), '#e8c84a', { bone: BH.chest, p: [Math.cos(a) * 0.15, shY - 0.04 - Math.sin(a) * 0.09, 0.16 + Math.sin(a) * 0.03], r: [Math.PI / 2 - 0.3, 0, 0], shine: 1 });
    }
  }
  if (id === 'untoter') {
    // freiliegende Rippen, zerfetzte Stoffstreifen
    for (let k = 0; k < 3; k++) A(torus3(0.12 - k * 0.01, 0.012, Math.PI * 0.7, 3, 8), '#cfc8b0', { bone: BH.chest, p: [0, hipY + 0.3 - k * 0.06, 0.08], r: [Math.PI / 2 - 0.2, 0, Math.PI * 0.15], noShadow: true });
    for (let k = 0; k < 5; k++) A(horn3(0.1 + (k % 2) * 0.05, 0.03, 4), '#3a3428', { bone: BH.hips, p: [-0.14 + k * 0.07, hipY - 0.16, 0.17], r: [Math.PI, 0, (k - 2) * 0.1], s: [1, 1, 0.3], noShadow: true });
  }
  if (id === 'sumpfhexe') {
    // Kräuterbündel und Fläschchen am Gürtel, Zweige im Haar
    for (const [x, c] of [[-0.12, '#8fe36a'], [0.06, '#c89aff']]) {
      A(cyl3(0.022, 0.03, 0.07, 6), '#5a7a6a', { bone: BH.hips, p: [x, hipY - 0.06, 0.24], shine: 1 });
      A(sphere3(0.022, 6, 4), c, { bone: BH.hips, p: [x, hipY - 0.07, 0.24], mat: 'glow' });
    }
    for (let k = -1; k <= 1; k++) A(horn3(0.1, 0.012, 3), k ? '#6a8a3a' : '#4a6a2a', { bone: BH.hips, p: [0.16 + k * 0.015, hipY - 0.02, 0.18], r: [Math.PI + k * 0.3, 0, 0] });
    for (const sx of [-1, 1]) A(horn3(hr * 0.5, hr * 0.03, 3), '#4a3a2a', { bone: BH.head, p: [hc[0] + sx * hr * 0.8, hc[1] + hr * 0.1, hc[2] - hr * 0.5], r: [-0.5, 0, -sx * 1.0] });
  }
  if (id === 'grabwaechter') for (const sx of [-1, 1]) A(horn3(hr * 0.5, hr * 0.1, 5), '#2a2630', { bone: BH.head, p: [hc[0] + sx * hr * 0.75, hc[1] + hr * 0.45, hc[2]], r: [0, 0, -sx * 0.8], shine: 0.6 });
  if (id === 'gruftkoenig' || id === 'morrak') {
    // Kette mit Seelensteinen
    for (let k = -1; k <= 1; k++) A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), '#c89aff', { bone: BH.chest, p: [k * 0.08, shY - 0.1 - Math.abs(k) * 0.02, 0.21], s: [0.025, 0.04, 0.025], mat: 'glow' });
  }
  if (id === 'morrak') {
    // Ring aus violetten Seelenflammen über dem Schädel, drei kreisende Seelensteine
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      A(horn3(0.14, 0.035, 4), k % 2 ? '#c89aff' : '#e8d8ff', { bone: BH.head, p: [hc[0] + Math.cos(a) * hr * 0.75, hc[1] + hr * 1.25, hc[2] + Math.sin(a) * hr * 0.75], mat: 'glow' });
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      A(geo3('octa1', () => new THREE.OctahedronGeometry(1, 0)), '#8fe36a', { bone: BH.chest, p: [Math.cos(a) * 0.55, shY + 0.1, Math.sin(a) * 0.55], s: [0.05, 0.08, 0.05], mat: 'glow' });
    }
  }
}

// --- Bewohner -----------------------------------------------------------------------------------------

const NPC3 = {
  haendler: { skin: '#ecc9a5', robe: '#6d3f7d', torso: '#6d3f7d', hemTrim: '#e0c36a', cuff: '#e0c36a', collar: '#e0c36a', wideSleeves: true, hair: { style: 1, color: '#7a4a2a' }, apron: '#efe6cc', belt: '#c9a35a', beads: '#c9a35a' },
  schmied: { skin: '#d9a982', torso: '#a8907a', sleeve: '#d9a982', pants: '#3b2d25', boots: '#2f2419', hair: { style: 5, color: '#2a1e18' }, beard: '#7a4a2a', apron: '#6b4a2e', weapon: { kind: 'club', tier: 0 }, belt: '#3a2618', bracer: '#5a5e66' },
  waffen: { skin: '#d9a982', torso: '#9a3a2a', sleeve: '#d9a982', pants: '#3b2d25', boots: '#2f2419', hair: { style: 3, color: '#2a1c14' }, band: '#c8402f', weapon: { kind: 'sword', tier: 2 }, belt: '#5a4030', straps: '#3a2618', eyeShape: 3 },
  ruestung: { skin: '#ecc9a5', torso: '#6b4a2e', pants: '#3a2c24', boots: '#2f2419', hair: { style: 4, color: '#3a2418' }, shield: 2, belt: '#c9a35a', lamellar: '#8a6a44', pads: '#8f98a3', padTrim: '#c9a35a' }
};

function npcModelDef(id) {
  if (NPC3[id]) return Object.assign({}, NPC3[id]);
  const draw = NPC_ART[id];
  if (!draw) return null;
  const rec = captureArt(draw);
  const call = rec.calls.find((c) => c.fn === 'villagerArt');
  if (!call) return null;
  const o = call.o;
  const c = { skin: o.skin, torso: o.torso || o.robe, sleeve: o.sleeve, pants: o.pants, boots: o.boots, gloves: o.gloves, robe: o.robe, hemTrim: o.cuff, cuff: o.cuff, wideSleeves: o.wideSleeves, belt: o.belt, scale: o.scale || 1 };
  const extra = {
    stallmeister: { hat: '#c8a060', hair: { style: 0, color: '#3a2418' }, eyeShape: 2 },
    aeltester: { beard: '#f4f0e8', hair: { style: 1, color: '#f4f0e8' }, weapon: { kind: 'staff', tier: 2 }, eyeShape: 2 },
    jaegerin: { hair: { style: 4, color: '#7a3a1a' }, band: '#3e6a3a', weapon: { kind: 'bow', tier: 0 }, quiver: '#6b4a2e', straps: '#6b4a2e' },
    teleport: { hair: { style: 2, color: '#1a1a2a' }, beads: '#9fd0ff' },
    alchemist: { hat: '#3a2a4a', hair: { style: 0, color: '#2a2a2a' }, beard: '#2a2a2a', sash: '#c9a35a' },
    lehrmeister: { hair: { style: 1, color: '#d8d0c8' }, beard: '#e8e2da', sash: '#c9a35a', weapon: { kind: 'staff', tier: 1 }, eyeShape: 2 },
    lager: { hair: { style: 0, color: '#5a3a22' }, beard: '#5a3a22', sash: '#d8c49a', belt: '#2a1c12', eyeShape: 1 },
    wache: { helm: '#7a828c', weapon: { kind: 'staff', tier: 0 }, belt: '#c9a35a', lamellar: '#6a2a24', pads: '#7a828c', padTrim: '#c9a35a', eyeShape: 3 },
    bauer: { hat: '#d8b86a', hatCone: true, hair: { style: 0, color: '#4a3020' } },
    kind: { hair: { style: 1, color: '#2a1c14' }, eyeShape: 2 },
    alte: { hair: { style: 1, color: '#d8d0c8' }, eyeShape: 2 },
    moench: { hair: { style: 5, color: '#000' }, beads: '#7a3a2a', eyeShape: 2 }
  }[id] || {};
  return Object.assign(c, extra);
}

function buildNpc3(b, id) {
  const c = npcModelDef(id);
  if (!c) return null;
  const hats = [];
  if (c.hat) hats.push((A, hb, hc, hr) => {
    if (c.hatCone) A(horn3(hr * 0.8, hr * 1.7, 14), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.45, hc[2]], shade: 0.25 });
    else {
      A(cyl3(hr * 1.55, hr * 1.55, hr * 0.06, 22), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.6, hc[2]] });
      A(cap3(hr * 0.9, Math.PI * 0.5), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.6, hc[2]] });
      A(torus3(hr * 0.9, hr * 0.06, Math.PI * 2, 4, 18), '#7a2a1a', { bone: hb, p: [hc[0], hc[1] + hr * 0.66, hc[2]], r: [Math.PI / 2, 0, 0] });
    }
  });
  if (c.band) hats.push((A, hb, hc, hr) => A(torus3(hr * 1.05, hr * 0.07, Math.PI * 2, 4, 22), c.band, { bone: hb, p: [hc[0], hc[1] + hr * 0.42, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0] }));
  if (c.helm) hats.push((A, hb, hc, hr) => {
    A(cap3(hr * 1.1, Math.PI * 0.52, 0, Math.PI * 2, 18, 8), c.helm, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2]], r: [-0.12, 0, 0], top: lighter(c.helm, 0.3), topK: 0.4, shine: 0.9 });
    A(torus3(hr * 1.07, hr * 0.06, Math.PI * 2, 4, 22), '#c9a35a', { bone: hb, p: [hc[0], hc[1] + hr * 0.1, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0], shine: 1 });
    A(sphere3(hr * 0.12, 8, 6), '#c8402f', { bone: hb, p: [hc[0], hc[1] + hr * 1.12, hc[2]] });
  });
  c.headgear = (A, hb, hc, hr) => hats.forEach((f) => f(A, hb, hc, hr));
  c.covered = !!(c.helm || (c.hat && !c.hatCone));
  c.blush = id === 'kind' || id === 'jaegerin' || id === 'teleport' || id === 'haendler';
  const res = humanoid3(b, c);
  res.scale = c.scale || 1;
  return res;
}

// --- Portale und Risse (seit 8.4) ---------------------------------------------------------------------
// Rund und weich statt kantig: Risse sind ein Ring aus glatten Runensteinen auf einem kleinen Erdhügel mit
// Wurzeln und Grasbüscheln, Dungeon-Eingänge ein Steintor aus Keilsteinen auf einem runden Podest. Darin
// dreht sich ein Wirbel aus einem eigenen Shader (Zeichentrick-Stufen, heller Kern, leuchtender Rand), dahinter
// liegt ein weicher Schein, Funken werden in den Wirbel gezogen, am Boden leuchten Lichtfleck und Runenkreis.
// Jeder Dungeon hat sein eigenes Aussehen (RIFT_LOOK): Steinfarbe, Wirbelfarben, Funkenart und Schmuck.
// Wirbel, Schein, Funken und Bodenzeichen sind eigene kleine Meshes an den Knochen (model.extra), weil die
// gebackenen Figuren keine Texturkoordinaten haben. Geometrien und Materialien sind geteilt, die Shader
// werden beim Start mit übersetzt (warmPrograms); je Bild kostet ein Portal nur ein paar Zuweisungen.

// Zeit und Funkengröße für alle Portal-Shader (ein gemeinsamer Wert, kein Abgleich je Figur)
const PORTAL_T = { value: 0 };
const MOTE_SIZE3 = { value: 6 };

// Aussehen je Dungeon. stone/top: Steine (top: Oberseiten, Moos, Schnee), accent: Runen und Kristalle,
// deep/mid/core: Wirbel von außen nach innen, motes: Funkenart, spin: Drehtempo, deco: Schmuck am Ring,
// emblem: Zeichen auf dem Schlussstein (auch am Dungeon-Tor)
const RIFT_LOOK = {
  spinnenhoehle: { stone: '#5a546a', top: '#8a80a0', accent: '#b48cff', deep: '#24123a', mid: '#b48cff', core: '#f4ecff', motes: 'wisp', spin: 1, deco: 'web', emblem: 'spider' },
  orkfestung: { stone: '#8a7258', top: '#b49a74', accent: '#ff8a4a', deep: '#4a1606', mid: '#ff8a4a', core: '#ffe2b0', motes: 'dust', spin: 1.1, deco: 'ork', emblem: 'tusks' },
  eisgrotte: { stone: '#8cbcdc', top: '#ffffff', topK: 0.75, accent: '#9fe8ff', deep: '#10304e', mid: '#9fe8ff', core: '#ffffff', motes: 'snow', spin: 0.8, deco: 'ice', emblem: 'flake' },
  drachenhort: { stone: '#3a302c', top: '#54443c', accent: '#ff6a3a', deep: '#3a0800', mid: '#ff6a3a', core: '#ffd27a', motes: 'ember', spin: 1.25, deco: 'lava', emblem: 'flame' },
  banditenkeller: { stone: '#857866', top: '#6e8a44', topK: 0.6, accent: '#ffb04a', deep: '#3a2408', mid: '#ffb04a', core: '#fff0c8', motes: 'dust', spin: 1, deco: 'rope', emblem: 'lantern' },
  totengruft: { stone: '#8a8494', top: '#b4aec0', accent: '#a774e0', deep: '#1a0e2c', mid: '#a774e0', core: '#d8ffe8', motes: 'wisp', spin: 0.9, deco: 'chains', emblem: 'skull' },
  schlangentempel: { stone: '#4a7a6a', top: '#7aa894', accent: '#7ad8c8', deep: '#08302a', mid: '#7ad8c8', core: '#eafff8', motes: 'firefly', spin: 1, deco: 'snake', emblem: 'snake', trim: '#c9a35a' },
  titanenschmiede: { stone: '#54504c', top: '#726a62', accent: '#ffb04a', deep: '#3a1a00', mid: '#ffb04a', core: '#fff2c0', motes: 'ember', spin: 1.1, deco: 'forge', emblem: 'anvil' }
};
const WELTTOR_LOOK = { haloK: 0.5, id: 'weltentor', stone: '#8a8478', top: '#b0a898', accent: '#7ab8ff', deep: '#0e2a52', mid: '#7ab8ff', core: '#e8f6ff', motes: 'wisp', spin: 0.8 };
for (const id in RIFT_LOOK) RIFT_LOOK[id].id = id;

// Aussehen eines Dungeons; Endboss-Tore und unbekannte Dungeons leiten es aus der Portalfarbe ab
function riftLook(d) {
  let L = RIFT_LOOK[d.id];
  if (!L) {
    const c = d.portal;
    L = RIFT_LOOK[d.id] = {
      id: d.id, stone: d.raid ? '#3a3034' : '#7a7268', top: d.raid ? '#5a4a50' : '#a49a8c', accent: c,
      deep: mixColor('#200408', c, 0.18), mid: c, core: lighter(c, 0.7), motes: d.raid ? 'ember' : 'wisp', spin: d.raid ? 1.2 : 1, emblem: d.raid ? 'skull' : null
    };
  }
  return L;
}

// Funkenarten im Shader: 0 in den Wirbel gezogen, 1 Schnee fällt, 2 Glut steigt, 3 Glühwürmchen
const MOTE_KIND3 = { wisp: 0, dust: 0, snow: 1, ember: 2, firefly: 3 };

const VORTEX3_VS = `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
// p = Ort im Wirbel (Mitte 0, Rand 1). Zwei Spiralen gegeneinander, in drei harte Stufen geteilt wie die
// Schattierung der Figuren; heller Kern; leuchtender Innenrand. uArch: Torbogen (x 1) mit Mittelpunkt des
// Halbkreises (y), seinem Radius (z) und der Unterkante (w), sonst ein Kreis.
const VORTEX3_FS = `
  uniform float uTime;
  uniform float uSpin;
  uniform float uAlpha;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uCore;
  uniform vec4 uArch;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float b = r;
    if (uArch.x > 0.5) b = p.y > uArch.y ? length(p - vec2(0.0, uArch.y)) / uArch.z : max(abs(p.x) / uArch.z, (uArch.y - p.y) / (uArch.y + uArch.w));
    if (b > 1.0) discard;
    float a = atan(p.y, p.x);
    float t = uTime * uSpin;
    float s1 = 0.5 + 0.5 * sin(a * 3.0 + 7.0 * r - t * 2.0);
    float s2 = 0.5 + 0.5 * sin(-a * 2.0 + 11.0 * r - t * 1.3 + 1.7);
    float m = mix(s1, s2, 0.28);
    float k = max(0.0, 1.0 - r);
    float v = m * (0.35 + 0.65 * k) + k * 0.45;
    float q = smoothstep(0.30, 0.36, v) * 0.5 + smoothstep(0.58, 0.64, v) * 0.5;
    vec3 col = mix(uDeep, uMid, q);
    col = mix(col, mix(uMid, uCore, 0.55), smoothstep(0.86, 0.92, v));
    col = mix(col, uCore, smoothstep(0.78, 0.84, k * k + m * 0.18));
    col += uMid * smoothstep(0.80, 0.97, b) * 0.9;
    gl_FragColor = vec4(col, uAlpha * (1.0 - smoothstep(0.95, 1.0, b)));
    #include <fog_fragment>
  }`;

// Wirbel-Material je Aussehen (rev: kleinere, gegenläufige Schicht davor; arch: Torbogen statt Kreis).
// Alle teilen ein Shaderprogramm, nur die Farben unterscheiden sich.
function vortexMat(L, rev, arch) {
  return mat3('vortex' + L.id + (rev ? 'r' : '') + (arch ? 'a' : ''), () => {
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSpin: { value: (L.spin || 1) * (rev ? -0.75 : 1) },
      uAlpha: { value: rev ? 0.5 : 1 },
      uDeep: { value: new THREE.Color(L.deep) },
      uMid: { value: new THREE.Color(L.mid) },
      uCore: { value: new THREE.Color(L.core) },
      uArch: { value: arch ? new THREE.Vector4(1, arch[0], arch[1], arch[2]) : new THREE.Vector4(0, 0, 1, 1) }
    }]);
    u.uTime = PORTAL_T;
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VORTEX3_VS, fragmentShader: VORTEX3_FS, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  });
}

// Funken: feste Punkte (Phase, Bahnradius, Tempo), die Bahn rechnet der Shader aus der Zeit
const MOTES3_VS = `
  attribute vec3 mote;
  uniform float uTime;
  uniform float uKind;
  uniform float uSize;
  varying float vA;
  void main() {
    float k = fract(uTime * mote.z + mote.x);
    float a = mote.x * 6.2832 + k * 2.6;
    vec3 p;
    if (uKind < 0.5) {
      p = mix(vec3(cos(a) * mote.y * 1.3, 0.2, sin(a) * mote.y * 1.3), vec3(0.0, 1.3, 0.0), k * k);
      vA = sin(k * 3.1416);
    } else if (uKind < 1.5) {
      p = vec3(cos(a) * mote.y + sin(k * 9.0 + mote.x * 20.0) * 0.15, 3.0 - k * 2.9, sin(a) * mote.y);
      vA = sin(k * 3.1416);
    } else if (uKind < 2.5) {
      p = vec3(cos(a) * mote.y * (1.0 - 0.4 * k), 0.15 + k * 2.8, sin(a) * mote.y * (1.0 - 0.4 * k));
      vA = 1.0 - k;
    } else {
      float w = uTime * mote.z * 2.0 + mote.x * 6.2832;
      p = vec3(cos(w) * mote.y * 1.3, 0.5 + mote.y * 0.7 + sin(w * 1.7) * 0.35, sin(w * 1.3) * mote.y * 1.3);
      vA = smoothstep(0.1, 1.0, sin(uTime * 3.0 * mote.z + mote.x * 40.0));
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * projectionMatrix[1][1] / -mv.z;
  }`;
const MOTES3_FS = `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float a = smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5)) * vA;
    gl_FragColor = vec4(uColor, a);
  }`;
function motesMat(L) {
  return mat3('motes' + L.id, () => new THREE.ShaderMaterial({
    uniforms: { uTime: PORTAL_T, uSize: MOTE_SIZE3, uKind: { value: MOTE_KIND3[L.motes] || 0 }, uColor: { value: new THREE.Color(L.motes === 'snow' ? '#ffffff' : lighter(L.mid, 0.45)) } },
    vertexShader: MOTES3_VS, fragmentShader: MOTES3_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
}
function motesGeo() {
  return geo3('portalMotes', () => {
    const n = 14;
    const rnd = mulberry32(84);
    const m = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      m[i * 3] = i / n + rnd() * 0.05;
      m[i * 3 + 1] = 0.55 + rnd() * 0.6;
      m[i * 3 + 2] = 0.16 + rnd() * 0.18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('mote', new THREE.BufferAttribute(m, 3));
    return g;
  });
}

// Leuchtende Fläche mit Textur aus drei-fx.js (Schein, Lichtfleck, Runenkreis, Lichtsäule), additiv, ohne Nebel
function portalGlowMat(kind, tex, color, opacity) {
  return mat3('pglow' + kind + color + opacity, () => new THREE.MeshBasicMaterial({
    map: fx3Texture(tex), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false
  }));
}
const portalPlane3 = () => geo3('pplane', () => new THREE.PlaneGeometry(2, 2));
const portalFloor3 = () => geo3('pfloor', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));

// Torbogen-Fläche (unten Rechteck, oben Halbkreis) mit Wirbel-Koordinaten: Mitte bei y = cy, Einheit sc
const GATE3 = { w: 0.55, y0: 0.2, ya: 1.6, cy: 1.22, sc: 0.62 };
function archVeilGeo() {
  return geo3('archveil', () => {
    const G = GATE3;
    const s = new THREE.Shape();
    s.moveTo(-G.w, G.y0);
    s.lineTo(G.w, G.y0);
    s.lineTo(G.w, G.ya);
    s.absarc(0, G.ya, G.w, 0, Math.PI, false);
    s.lineTo(-G.w, G.y0);
    const g = new THREE.ShapeGeometry(s, 20);
    const P = g.attributes.position;
    const U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / (2 * G.sc) + 0.5, (P.getY(i) - G.cy) / (2 * G.sc) + 0.5);
    return g;
  });
}
const GATE3_ARCH = [(GATE3.ya - GATE3.cy) / GATE3.sc, GATE3.w / GATE3.sc, (GATE3.cy - GATE3.y0) / GATE3.sc];

// Nicht gebackene Teile an die Knochen hängen. o: vortex/halo { bone, p, s, tilt, arch }, motes { bone },
// pool/rune { bone, y, r }, beam { r, h }, back: gegenläufige zweite Wirbelschicht (nur Hoch/Ultra)
function portalExtras(a, B, L, o) {
  a.extras = [];
  const put = (obj, c, order) => {
    obj.position.set(c.p ? c.p[0] : 0, c.p ? c.p[1] : c.y || 0, c.p ? c.p[2] : 0);
    if (c.tilt) obj.rotation.x = c.tilt;
    if (c.s) obj.scale.set(c.s[0], c.s[1], c.s[2] || 1);
    else if (c.r) obj.scale.setScalar(c.r);
    obj.renderOrder = order;
    B[c.bone || 0].add(obj);
    a.extras.push(obj);
    return obj;
  };
  // haloK (seit 12.2): Weltentore leuchten schwächer, sonst überstrahlten sie den Platz
  a.haloK = L.haloK || 1;
  if (o.halo) a.halo = put(new THREE.Mesh(portalPlane3(), portalGlowMat('halo' + (L.haloK ? 'k' : ''), 'disc', L.mid, 0.34 * a.haloK)), o.halo, 1);
  if (o.pool) put(new THREE.Mesh(portalFloor3(), portalGlowMat('pool' + (L.haloK ? 'k' : ''), 'disc', L.mid, (o.pool.op || 0.3) * a.haloK)), o.pool, 1);
  if (o.rune) a.rune = put(new THREE.Mesh(portalFloor3(), portalGlowMat('rune', 'rune', L.accent, o.rune.op || 0.32)), o.rune, 1);
  if (o.beam) {
    a.beam = put(new THREE.Mesh(geo3('pbeam', () => new THREE.CylinderGeometry(1, 1.1, 1, 20, 1, true).translate(0, 0.5, 0)), portalGlowMat('beam', 'beam', L.mid, 0.4)), o.beam, 3);
    a.beam.scale.set(o.beam.r, o.beam.h, o.beam.r);
  }
  const geo = o.vortex.arch ? archVeilGeo() : geo3('vortexDisc', () => new THREE.CircleGeometry(1, 48));
  a.vortex = put(new THREE.Mesh(geo, vortexMat(L, false, o.vortex.arch && GATE3_ARCH)), o.vortex, 2);
  if (o.back) {
    const c = o.vortex;
    a.vortexBack = put(new THREE.Mesh(geo, vortexMat(L, true, c.arch && GATE3_ARCH)), Object.assign({}, c, { s: [c.s[0] * 0.78, c.s[1] * 0.78, 1], p: [c.p[0], c.p[1] + (c.arch ? GATE3.cy * 0.22 : 0), c.p[2] + 0.03] }), 2);
  }
  const pts = new THREE.Points(motesGeo(), motesMat(L));
  pts.frustumCulled = false;
  a.motes = put(pts, o.motes || {}, 3);
}

// Je Bild: Runenkreis dreht sich, Schein atmet, Funken und zweite Wirbelschicht nur ab Mittel bzw. Hoch
function portalTick(a, t) {
  PORTAL_T.value = t;
  MOTE_SIZE3.value = renderer.h * V3.gl.getPixelRatio() * 0.035;
  const on = a.alpha == null || a.alpha >= 1;
  if (a.rune) a.rune.rotation.y = t * 0.3;
  if (a.halo) a.halo.material.opacity = (0.3 + 0.08 * Math.sin(t * 2.5)) * (a.haloK || 1);
  if (a.motes) a.motes.visible = on && opts.graphics !== 'niedrig';
  if (a.vortexBack) a.vortexBack.visible = on && (opts.graphics === 'hoch' || opts.graphics === 'ultra' || opts.graphics === 'plus');
}

// Für warmPrograms: je ein Wirbel, Funken und Schein, damit die Shader beim Start übersetzt werden
function portalWarm3() {
  const g = new THREE.Group();
  const L = WELTTOR_LOOK;
  g.add(new THREE.Mesh(geo3('vortexDisc', () => new THREE.CircleGeometry(1, 48)), vortexMat(L)));
  g.add(new THREE.Mesh(portalPlane3(), portalGlowMat('halo', 'disc', L.mid, 0.34)));
  const pts = new THREE.Points(motesGeo(), motesMat(L));
  pts.frustumCulled = false;
  g.add(pts);
  return g;
}

// Kissenstein: Kugel, zum Quader hin gedrückt (weich und rund, aber mit Flächen). Halb so viele Dreiecke wie
// ein abgerundeter Quader, die Größe kommt über s (Halbachsen).
const pillow3 = () => geo3('pillow3', () => {
  const g = new THREE.SphereGeometry(1, 12, 8);
  const P = g.attributes.position;
  const f = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.5);
  for (let i = 0; i < P.count; i++) P.setXYZ(i, f(P.getX(i)), f(P.getY(i)), f(P.getZ(i)));
  return smoothGeo(g.toNonIndexed());
});

// Glyphe aus zwei, drei Strichen (leuchtend, schlichte Quader) auf einer Steinfläche; R: Teil-Funktion im Rahmen des Steins
function rune3(R, color, k, o) {
  const s = (w, h, x, y, r) => R(box3(), color, Object.assign({}, o, { p: [o.p[0] + x, o.p[1] + y, o.p[2]], r: [0, 0, (o.rz || 0) + r], s: [w, h, 0.02], mat: 'glow' }));
  const v = k % 3;
  if (v === 0) { s(0.03, 0.15, 0, 0, 0); s(0.025, 0.08, 0.025, 0.03, -0.7); s(0.025, 0.08, -0.025, -0.03, -0.7); }
  else if (v === 1) { s(0.03, 0.14, -0.03, 0, 0.25); s(0.03, 0.14, 0.03, 0, -0.25); s(0.08, 0.025, 0, -0.02, 0); }
  else { s(0.03, 0.15, 0, 0, 0); s(0.07, 0.025, 0, 0.05, 0); s(0.025, 0.06, 0.03, -0.04, 0.6); }
}

// Zeichen des Dungeons auf dem Schlussstein. P: Mitte der Vorderseite, R: Teil-Funktion (Knochen/Rahmen)
function emblem3(R, kind, L, P, k = 1) {
  const at = (x, y, z = 0) => [P[0] + x * k, P[1] + y * k, P[2] + z * k];
  const g = { mat: 'glow' };
  if (kind === 'spider') {
    R(ball(8), L.accent, Object.assign({ p: at(0, -0.03, 0.01), s: [0.055 * k, 0.065 * k, 0.025 * k] }, g));
    R(ball(8), L.accent, Object.assign({ p: at(0, 0.055, 0.01), s: [0.035 * k, 0.03 * k, 0.02 * k] }, g));
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      R(box3(), L.accent, Object.assign({ p: at(sx * 0.07, 0.06 - i * 0.04, 0.012), r: [0, 0, sx * (0.9 - i * 0.55)], s: [0.11 * k, 0.014 * k, 0.012 * k] }, g));
    }
  } else if (kind === 'tusks') {
    for (const sx of [-1, 1]) R(horn3(0.2 * k, 0.035 * k, 8), '#efe4c8', { p: at(sx * 0.07, -0.08, 0.02), r: [0.3, 0, -sx * 0.45], shine: 0.5 });
    R(ball(8), L.accent, Object.assign({ p: at(0, 0.03, 0.01), s: [0.035 * k, 0.035 * k, 0.015 * k] }, g));
  } else if (kind === 'flake') {
    for (let i = 0; i < 3; i++) R(box3(), '#e8fbff', Object.assign({ p: at(0, 0, 0.01), r: [0, 0, (i * Math.PI) / 3], s: [0.2 * k, 0.025 * k, 0.015 * k] }, g));
    R(ball(8), '#ffffff', Object.assign({ p: at(0, 0, 0.015), s: 0.03 * k }, g));
  } else if (kind === 'flame') {
    R(horn3(0.2 * k, 0.07 * k, 10), L.accent, Object.assign({ p: at(0, -0.09, 0.01), s: [1, 1, 0.35] }, g));
    R(horn3(0.12 * k, 0.04 * k, 10), '#fff2c0', Object.assign({ p: at(0, -0.08, 0.02), s: [1, 1, 0.35] }, g));
  } else if (kind === 'lantern') {
    R(roundBox(0.09 * k, 0.12 * k, 0.05 * k, 0.02 * k), '#3a2a1a', { p: at(0, 0, 0.02), shine: 0.6 });
    R(ball(8), '#ffd070', Object.assign({ p: at(0, 0, 0.045), s: [0.03 * k, 0.04 * k, 0.012 * k] }, g));
  } else if (kind === 'skull') {
    R(ball(10), '#ece4cc', { p: at(0, 0.015, 0.02), s: [0.085 * k, 0.08 * k, 0.05 * k], shade: 0.2 });
    R(roundBox(0.1 * k, 0.05 * k, 0.05 * k, 0.02 * k), '#ece4cc', { p: at(0, -0.06, 0.02) });
    for (const sx of [-1, 1]) {
      R(ball(8), '#201820', { p: at(sx * 0.032, 0.015, 0.062), s: [0.024 * k, 0.026 * k, 0.012 * k], mat: 'face' });
      R(ball(6), L.core, Object.assign({ p: at(sx * 0.032, 0.012, 0.068), s: 0.011 * k }, g));
    }
  } else if (kind === 'snake') {
    R(ball(10), '#3a8a5a', { p: at(0, 0, 0.02), s: [0.07 * k, 0.09 * k, 0.04 * k], top: '#c9d870', topK: 0.3 });
    for (const sx of [-1, 1]) R(ball(6), '#ffd84a', Object.assign({ p: at(sx * 0.035, 0.03, 0.055), s: [0.014 * k, 0.018 * k, 0.01 * k] }, g));
    R(roundBox(0.012 * k, 0.05 * k, 0.01 * k, 0.005 * k), '#c83a3a', { p: at(0, -0.11, 0.03), mat: 'face' });
  } else if (kind === 'anvil') {
    R(roundBox(0.2 * k, 0.05 * k, 0.05 * k, 0.015 * k), '#3a3634', { p: at(0, 0.04, 0.03), shine: 0.9 });
    R(roundBox(0.08 * k, 0.07 * k, 0.04 * k, 0.015 * k), '#3a3634', { p: at(0, -0.02, 0.03), shine: 0.9 });
    R(roundBox(0.15 * k, 0.035 * k, 0.05 * k, 0.012 * k), '#3a3634', { p: at(0, -0.07, 0.03), shine: 0.9 });
    R(ball(6), L.accent, Object.assign({ p: at(0.06, 0.08, 0.04), s: 0.015 * k }, g));
  }
}

// Ring der Risse: Mitte in 1,3 Höhe, nach hinten gekippt (wirkt unter der schrägen Kamera höher)
const RIFT3 = { cy: 1.3, rx: 0.8, ry: 1.08, tilt: -0.25 };
const RIFT_M3 = new THREE.Matrix4().compose(new THREE.Vector3(0, RIFT3.cy, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(RIFT3.tilt, 0, 0)), new THREE.Vector3(1, 1, 1));
// Punkt auf dem Ring (Winkel a: 0 rechts, π/2 oben), d: nach außen, z: nach vorn (im Rahmen des Rings)
const riftPt3 = (a, d = 0, z = 0) => [Math.cos(a) * (RIFT3.rx + d), Math.sin(a) * (RIFT3.ry + d), z];
// Drehung, mit der ein Teil entlang des Rings liegt (lokales y zeigt in Laufrichtung)
const riftRot3 = (a) => Math.atan2(Math.cos(a) * RIFT3.ry, -Math.sin(a) * RIFT3.rx) - Math.PI / 2;

// Bodenart unter dem Riss (einmal gemerkt): bestimmt die Farbe des Hügels und ob Gras darauf wächst
function riftGround3(n) {
  if (n.__g3 == null) {
    let g = groundAt(Math.floor(n.x / TILE), Math.floor(feetY(n) / TILE));
    if (g < 0 || g === GROUND.WATER) g = GROUND.SAND;
    else if (g === GROUND.LAVA) g = GROUND.BASALT;
    else if (g === GROUND.BOG) g = GROUND.SWAMP;
    n.__g3 = g;
  }
  return n.__g3;
}

// Glatter Schlauch entlang einer Kurve, von r0 (Anfang) bis r1 (Ende) dicker werdend, mit runden Enden
function taperTube3(curve, r0, r1, seg, rad) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const P = g.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    curve.getPointAt(u, c);
    // Enden zur Spitze zusammenziehen (Schwanz spitz, Kopfansatz rund)
    const r = (r0 + (r1 - r0) * u) * (u < 0.06 ? 0.3 + (u / 0.06) * 0.7 : 1);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      P.setXYZ(k, c.x + (P.getX(k) - c.x) * r, c.y + (P.getY(k) - c.y) * r, c.z + (P.getZ(k) - c.z) * r);
    }
  }
  g.computeVertexNormals();
  return g;
}

// Schmuck am Ring je Dungeon. R: Teil im Ringrahmen (Knochen 1), K: am Schlussstein (Knochen 3), A: am Boden
const RIFT_DECO3 = {
  web(R, K, A, L) {
    // Spinnennetz in der oberen linken Ecke, zwei Eiersäcke am Hügel
    const c = riftPt3(2.5, -0.42, 0.06);
    const silk = { mat: 'face' };
    for (const a of [1.95, 2.2, 2.5, 2.8, 3.05]) {
      const e = riftPt3(a, -0.16, 0.06);
      limbBetween(R, c, e, 0.008, 0.008, '#f4f0ff', Object.assign({ seg: 4 }, silk));
    }
    for (const d of [-0.24, -0.33]) {
      let prev = null;
      for (const a of [1.95, 2.2, 2.5, 2.8, 3.05]) {
        const q = riftPt3(a, d, 0.06);
        if (prev) limbBetween(R, prev, q, 0.007, 0.007, '#f4f0ff', Object.assign({ seg: 4 }, silk));
        prev = q;
      }
    }
    A(ball(10), '#ece4d4', { p: [-0.92, 0.2, 0.32], s: [0.14, 0.11, 0.13], shade: 0.25 });
    A(ball(10), '#ece4d4', { p: [0.86, 0.17, 0.42], s: [0.1, 0.08, 0.1], shade: 0.25 });
  },
  ork(R, K, A, L) {
    // Eisenbänder um drei Steine, zwei Hauer am Schlussstein, rotes Banner
    for (const i of [2, 5, 8]) {
      const a = Math.PI / 2 - (i * Math.PI) / 5;
      R(roundBox(0.34, 0.07, 0.32, 0.03), '#3a3430', { p: riftPt3(a), r: [0, 0, riftRot3(a)], shine: 0.8, top: '#5a524a', topK: 0.4 });
    }
    for (const sx of [-1, 1]) K(horn3(0.5, 0.08, 10), '#efe4c8', { p: [sx * 0.2, RIFT3.ry + 0.05, 0.04], r: [0, 0, -sx * 0.75], shine: 0.5 });
    const b = riftPt3(-0.2, 0.2, 0.1);
    R(roundBox(0.24, 0.42, 0.025, 0.012), '#a8302a', { p: [b[0] + 0.08, b[1] - 0.12, b[2]], r: [0, 0, 0.08], shade: 0.3 });
    R(ball(8), '#1a1210', { p: [b[0] + 0.08, b[1] - 0.08, b[2] + 0.02], s: [0.06, 0.06, 0.01], mat: 'face' });
    R(roundBox(0.3, 0.035, 0.035, 0.015), '#4a3020', { p: [b[0] + 0.08, b[1] + 0.1, b[2]], r: [0, 0, 0.08] });
  },
  ice(R, K, A, L) {
    // Eiszapfen außen an den oberen Seitensteinen, Kristallgruppen am Hügel
    [[0.3, 0.26], [0.55, 0.18], [2.6, 0.2], [2.85, 0.28]].forEach(([a, len]) => {
      const p = riftPt3(a, 0.1, 0.04);
      R(horn3(len, 0.04, 8), '#d8f2ff', { p: [p[0], p[1] - 0.08, p[2]], r: [0, 0, Math.PI], shine: 0.9, top: '#ffffff' });
    });
    for (const [x, z, s] of [[-0.85, 0.35, 1], [0.8, 0.4, 0.8]]) {
      for (let i = 0; i < 3; i++) {
        A(lathe3('icecrys', [[0, 0], [0.07, 0.04], [0.06, 0.24], [0, 0.34]], 6), i ? '#bfefff' : '#e8fbff', { p: [x + (i - 1) * 0.08 * s, 0.1, z + (i % 2) * 0.05], s, r: [0.15 * (i % 2), 0, (i - 1) * 0.45], shine: 0.9, top: '#ffffff', topK: 0.5 });
      }
    }
  },
  lava(R, K, A, L) {
    // glühende Lavaadern über die Steine, Obsidiansplitter am Hügel
    for (let i = 1; i < 10; i++) {
      const a = Math.PI / 2 - (i * Math.PI) / 5;
      const p = riftPt3(a, 0, 0.19);
      const rz = riftRot3(a);
      R(box3(), L.accent, { p, r: [0, 0, rz + 0.5], s: [0.03, 0.2, 0.02], mat: 'glow' });
      R(box3(), '#ffd27a', { p: [p[0] + 0.05 * Math.cos(rz), p[1] + 0.05 * Math.sin(rz), p[2]], r: [0, 0, rz - 0.6], s: [0.025, 0.12, 0.02], mat: 'glow' });
    }
    for (let i = 0; i < 5; i++) {
      const a = 0.4 + i * 1.25;
      A(horn3(0.22 + (i % 2) * 0.1, 0.07, 6), '#1e1a20', { p: [Math.cos(a) * 1.05, 0.06, Math.sin(a) * 1.05], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], shine: 1, top: '#4a4050' });
    }
  },
  rope(R, K, A, L) {
    // Seile um zwei Steine, eine Laterne hängt am rechten Stein
    for (const i of [2, 8]) {
      const a = Math.PI / 2 - (i * Math.PI) / 5;
      for (const d of [-0.07, 0.07]) {
        const rz = riftRot3(a);
        const p = riftPt3(a);
        R(torus3(0.16, 0.02, Math.PI * 2, 4, 14), '#b08a5a', { p: [p[0] - Math.sin(rz) * d, p[1] + Math.cos(rz) * d, p[2]], r: [Math.PI / 2, 0, rz], order: 'ZXY', s: [1.02, 0.92, 1] });
      }
    }
    const h = riftPt3(0.15, 0.22, 0.06);
    R(torus3(0.04, 0.012, Math.PI * 2, 4, 8), '#3a3430', { p: [h[0], h[1] - 0.04, h[2]], shine: 0.8 });
    R(roundBox(0.12, 0.15, 0.12, 0.03), '#3a2a1a', { p: [h[0], h[1] - 0.17, h[2]], shine: 0.6 });
    R(ball(8), '#ffd070', { p: [h[0], h[1] - 0.17, h[2]], s: [0.05, 0.065, 0.065], mat: 'glow' });
    R(lathe3('lanterncap', [[0.09, 0], [0.04, 0.06], [0, 0.07]], 8), '#3a2a1a', { p: [h[0], h[1] - 0.095, h[2]] });
  },
  chains(R, K, A, L) {
    // zwei Ketten hängen außen an den oberen Steinen
    for (const a of [0.75, 2.4]) {
      const p = riftPt3(a, 0.12, 0.12);
      for (let i = 0; i < 5; i++) R(torus3(0.035, 0.012, Math.PI * 2, 4, 8), '#4a4650', { p: [p[0], p[1] - 0.05 - i * 0.06, p[2]], r: [0, i % 2 ? Math.PI / 2 : 0, 0], s: [0.8, 1, 1], shine: 0.8 });
    }
    A(ball(10), '#d8d0bc', { p: [0.82, 0.16, 0.45], s: [0.09, 0.075, 0.08], shade: 0.2 });
  },
  snake(R, K, A, L) {
    // Steinschlange liegt außen auf dem Ring (Schwanz unten rechts, Kopf oben neben dem Schlussstein), Ranken
    // mit Blättern; Goldbänder an Sockel und Schlussstein
    R(geo3('riftsnake', () => {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        pts.push(new THREE.Vector3(...riftPt3(-1.25 + u * 2.45, 0.17, 0.12 + Math.sin(u * Math.PI * 3) * 0.05)));
      }
      return taperTube3(new THREE.CatmullRomCurve3(pts), 0.025, 0.065, 48, 8);
    }), '#3a8a5a', { top: '#a8c860', topK: 0.35 });
    const hd = riftPt3(1.27, 0.2, 0.16);
    R(ball(12), '#3a8a5a', { p: hd, s: [0.1, 0.075, 0.13], r: [0.5, 0, -0.4], top: '#a8c860', topK: 0.35 });
    for (const sx of [-1, 1]) R(ball(6), '#ffd84a', { p: [hd[0] + sx * 0.05, hd[1] + 0.035, hd[2] + 0.06], s: 0.018, mat: 'glow' });
    R(roundBox(0.012, 0.07, 0.01, 0.005), '#c83a3a', { p: [hd[0] - 0.03, hd[1] - 0.06, hd[2] + 0.1], r: [0.6, 0, 0.4], mat: 'face' });
    for (const a of [2.15, 2.75]) {
      const p0 = riftPt3(a, 0.1, 0.12);
      const p1 = [p0[0] - 0.04, p0[1] - 0.2, p0[2] + 0.02];
      const p2 = [p1[0] + 0.03, p1[1] - 0.2, p1[2]];
      limbBetween(R, p0, p1, 0.016, 0.014, '#3a6a2a', { seg: 4, mat: 'face' });
      limbBetween(R, p1, p2, 0.014, 0.01, '#3a6a2a', { seg: 4, mat: 'face' });
      for (const q of [p1, p2]) R(ball(8), '#5a9a3a', { p: q, s: [0.06, 0.045, 0.04], top: '#8ac85a', topK: 0.4 });
    }
    for (const i of [4, 6]) {
      const a = Math.PI / 2 - (i * Math.PI) / 5;
      R(roundBox(0.48, 0.05, 0.42, 0.02), L.trim, { p: riftPt3(a), r: [0, 0, riftRot3(a)], shine: 1 });
    }
    K(roundBox(0.42, 0.05, 0.3, 0.02), L.trim, { p: [0, RIFT3.ry - 0.12, 0], shine: 1 });
  },
  forge(R, K, A, L) {
    // Goldnieten auf jedem Stein, eine glühende Fuge quer darüber
    for (let i = 1; i < 10; i++) {
      const a = Math.PI / 2 - (i * Math.PI) / 5;
      const rz = riftRot3(a);
      const p = riftPt3(a, 0, 0.19);
      for (const d of [-0.13, 0.13]) R(sphere3(0.03, 6, 4), '#d8b04a', { p: [p[0] + Math.cos(rz) * d, p[1] + Math.sin(rz) * d, p[2]], shine: 1 });
      R(box3(), L.accent, { p: riftPt3(a, 0, 0.185), r: [0, 0, rz], s: [0.3, 0.025, 0.02], mat: 'glow' });
    }
  }
};

// Riss (seit 8.4): Ring aus Runensteinen auf einem Erdhügel, darin der Wirbel, ringsum Kristallsplitter
// Knochen: 0 Hügel, 1 Ring und Wirbel (dreht sich zur Kamera), 2 Splitter, 3 Schlussstein
function buildRift3(b, d, ground) {
  const L = riftLook(d);
  const A = adder(b, null);
  const R = (geo, color, o) => b.add(geo, color, Object.assign({ bone: 1 }, o, { parent: RIFT_M3 }));
  const K = (geo, color, o) => R(geo, color, Object.assign({}, o, { bone: 3 }));
  const top = [0, RIFT3.cy + Math.cos(RIFT3.tilt) * RIFT3.ry, Math.sin(RIFT3.tilt) * RIFT3.ry];
  const rig = rigOf([[[0, 0, 0], -1], [[0, RIFT3.cy, 0], 0], [[0, RIFT3.cy, 0], 0], [top, 1]]);
  const rnd = mulberry32(17 + d.id.length * 31 + d.id.charCodeAt(0));
  // Erdhügel; oben die Farbe des Bodens ringsum (Gras, Schnee, Sand, Asche)
  // (dunkler als die Bodenfarbe: die Zeichentrick-Beleuchtung hellt Oberseiten stärker auf als der Boden-Shader)
  const turf = darker(GROUND_PALETTE[ground] ? GROUND_PALETTE[ground][2] : '#5a8a3a', 0.16);
  A(lathe3('riftmound3', [[0.98, -0.02], [0.92, 0.05], [0.8, 0.11], [0.5, 0.16], [0, 0.17]], 22), '#5a4434', { top: turf, topK: 0.9, shade: 0.15, ao: 0, noShadow: true });
  // Steinring: 9 glatte Steine und der Schlussstein oben, unten drei schwere Sockelsteine im Hügel
  for (let i = 1; i < 10; i++) {
    const a = Math.PI / 2 - (i * Math.PI) / 5;
    const base = i >= 4 && i <= 6;
    const j = 0.9 + rnd() * 0.2;
    const s = base ? [0.19 * j, 0.25 * (0.92 + rnd() * 0.12), 0.18] : [0.15 * j, 0.235 * (0.92 + rnd() * 0.12), 0.14];
    R(pillow3(), L.stone, { p: riftPt3(a, base ? 0.03 : 0), r: [0, 0, riftRot3(a) + (rnd() - 0.5) * 0.12], s, top: L.top, topK: L.topK || 0.45, shade: 0.22 });
    if (i % 2) rune3(R, L.accent, i, { p: riftPt3(a, 0.01, (base ? 0.19 : 0.15) + 0.004), rz: riftRot3(a) + Math.PI / 2 });
  }
  // Steinband hinter den Steinen hält den Ring zusammen
  R(geo3('riftband', () => new THREE.TorusGeometry(1, 0.085, 6, 32).scale(RIFT3.rx, RIFT3.ry, 1)), darker(L.stone, 0.22), { p: [0, 0, -0.03], top: darker(L.top, 0.15), topK: 0.3 });
  K(pillow3(), lighter(L.stone, 0.06), { p: [0, RIFT3.ry + 0.03, 0], s: [0.21, 0.19, 0.18], top: L.top, topK: L.topK || 0.45, shade: 0.2 });
  if (L.emblem) emblem3(K, L.emblem, L, [0, RIFT3.ry + 0.02, 0.18]);
  else rune3(K, L.accent, 0, { p: [0, RIFT3.ry + 0.03, 0.185] });
  // Wurzeln: von den Sockelsteinen über den Hügel in den Boden
  // Höhe des Hügels in Abstand r (für Wurzeln, die auf ihm liegen)
  const hill = (r) => (r < 0.5 ? 0.17 - r * 0.02 : r < 0.8 ? 0.16 - (r - 0.5) * 0.17 : r < 0.92 ? 0.11 - (r - 0.8) * 0.5 : 0.05 - (r - 0.92) * 1.1);
  for (const [x, ang, len] of [[-0.4, 2.7, 1.1], [-0.28, 1.95, 1.0], [0.4, 0.4, 1.15], [0.3, -0.5, 0.95], [-0.05, -2.0, 0.95]]) {
    let prev = [x, 0.34, 0.2];
    for (let k = 1; k <= 3; k++) {
      const u = k / 3;
      const bend = Math.sin(u * Math.PI) * 0.18;
      const px = x + Math.cos(ang + bend) * len * u;
      const pz = 0.2 + Math.sin(ang + bend) * len * u;
      const q = [px, hill(Math.hypot(px, pz)) + 0.01, pz];
      limbBetween(A, prev, q, 0.06 - k * 0.012, 0.05 - k * 0.012, '#4a3424', { seg: 4, top: '#7a5a40', topK: 0.5, noShadow: true });
      prev = q;
    }
  }
  // Grasbüschel oder Schneehäufchen am Rand, ein paar Kiesel
  const grassy = ground === GROUND.GRASS || ground === GROUND.MEADOW || ground === GROUND.FOREST || ground === GROUND.SWAMP;
  const snowy = ground === GROUND.SNOW || ground === GROUND.ICE;
  for (let i = 0; i < 6; i++) {
    const a = 0.3 + i * 1.05 + rnd() * 0.3;
    const rr = 0.8 + rnd() * 0.25;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (grassy) {
      for (let k = 0; k < 3; k++) A(horn3(0.26, 0.035, 4), k % 2 ? lighter(turf, 0.18) : darker(turf, 0.12), { p: [x + (k - 1) * 0.04, 0.02, z], r: [(rnd() - 0.5) * 0.5, 0, (k - 1) * 0.45], s: [1, 0.75 + rnd() * 0.5, 1], mat: 'face' });
    } else if (snowy) A(ball(8), '#f4f8ff', { p: [x, 0.02, z], s: [0.12, 0.06, 0.1], top: '#ffffff' });
    if (i % 3 === 0) A(rockGeo(i % 3), '#8a8478', { p: [x * 1.05 + 0.12, 0.03, z * 1.05], s: [0.08, 0.06, 0.07], top: '#a8a296', topK: 0.5, noShadow: true });
  }
  // schwebende Kristallsplitter (Knochen 2 kreist)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const p = [Math.cos(a) * 1.15, -0.55 + (i % 2) * 0.75, Math.sin(a) * 0.6];
    A(lathe3('riftshard', [[0, 0], [0.07, 0.1], [0.055, 0.22], [0, 0.32]], 6), lighter(L.accent, 0.15), { bone: 2, p: [p[0], p[1] + RIFT3.cy, p[2]], r: [0.3 * (i % 2 ? 1 : -1), a, 0.35], top: lighter(L.accent, 0.6), topK: 0.6, shine: 0.9 });
  }
  if (L.deco) RIFT_DECO3[L.deco](R, K, A, L);
  const extra = (a, B) => portalExtras(a, B, L, {
    vortex: { bone: 1, p: [0, 0, 0], tilt: RIFT3.tilt, s: [0.68, 0.95, 1] },
    back: true,
    halo: { bone: 1, p: [0, 0.01, -0.12], tilt: RIFT3.tilt, s: [1.3, 1.28, 1] },
    motes: { bone: 0 },
    rune: { bone: 0, y: 0.03, r: 1.75 }
  });
  return { rig, height: 2.65, family: 'rift', extra };
}

// Portale: Dungeon-Eingang (Steintor mit Wirbel), Endboss-Tor (dunkler, Schädel und Hörner),
// Ausgang (Lichtsäule über einem Runenkreis), Weltentor (Steinring mit blauem Wirbel)
function buildPortal3(b, id, d) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1]]);
  if (id === 'weltentor') {
    const L = WELTTOR_LOOK;
    A(lathe3('gatebase', [[0.85, 0], [0.85, 0.1], [0.7, 0.16], [0, 0.16]], 22), '#6e685e', {});
    A(geo3('gatering', () => new THREE.TorusGeometry(0.62, 0.12, 10, 32)), '#8a8478', { p: [0, 0.92, 0], top: '#b0a898', topK: 0.4 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      A(sphere3(0.07, 8, 6), '#c9a35a', { p: [Math.cos(a) * 0.62, 0.92 + Math.sin(a) * 0.62, 0.1], shine: 1 });
    }
    const extra = (a, B) => portalExtras(a, B, L, {
      vortex: { p: [0, 0.92, 0], s: [0.54, 0.54, 1] },
      back: true,
      halo: { p: [0, 0.94, -0.08], s: [1.1, 0.9, 1] },
      pool: { y: 0.165, r: 0.7 }
    });
    return { rig, height: 1.7, family: 'portal', extra };
  }
  const L = riftLook(d);
  if (id === 'eingang' || id === 'raid') {
    // Steintor (seit 8.4): rundes Podest mit zwei Stufen davor, Säulen mit Schwellung, Bogen aus Keilsteinen
    // mit dem Zeichen des Dungeons im Schlussstein, Moos, zwei Feuerschalen; im Bogen der Wirbel.
    const raid = id === 'raid';
    const stone = raid ? '#3a3034' : mixColor('#746c62', L.stone, 0.3);
    const top = raid ? '#5a4a50' : lighter(stone, 0.22);
    const moss = raid ? top : '#6e8a44';
    const dark = darker(stone, 0.12);
    const rnd = mulberry32(5 + d.id.length * 7);
    A(lathe3('gatedais', [[1.1, -0.02], [1.1, 0.08], [1.05, 0.1], [0.92, 0.1], [0.9, 0.18], [0.84, 0.2], [0, 0.2]], 28), dark, { top, topK: 0.5, ao: 0 });
    A(roundBox(0.92, 0.1, 0.3, 0.04), dark, { p: [0, 0.05, 1.12], r: [0, 0.05, 0], top, topK: 0.4 });
    A(roundBox(0.72, 0.06, 0.24, 0.03), dark, { p: [0.03, 0.03, 1.38], r: [0, -0.07, 0], top, topK: 0.4 });
    for (const sx of [-1, 1]) {
      const x = sx * 0.72;
      A(roundBox(0.46, 0.12, 0.46, 0.05), dark, { p: [x, 0.25, 0], top, topK: 0.4 });
      A(torus3(0.2, 0.05, Math.PI * 2, 5, 16), stone, { p: [x, 0.33, 0], r: [Math.PI / 2, 0, 0], top, topK: 0.3 });
      A(lathe3('gatecol', [[0.185, 0], [0.2, 0.32], [0.19, 0.65], [0.165, 0.92], [0.155, 1.04]], 12), stone, { p: [x, 0.32, 0], top, topK: 0.3, shade: 0.25 });
      A(torus3(0.17, 0.045, Math.PI * 2, 5, 16), stone, { p: [x, 1.37, 0], r: [Math.PI / 2, 0, 0], top: moss, topK: 0.5 });
      A(roundBox(0.44, 0.1, 0.44, 0.05), stone, { p: [x, 1.43, 0], top: moss, topK: 0.55 });
      // Runen an der Säule
      for (let k = 0; k < 3; k++) rune3(A, L.accent, k + (sx > 0 ? 1 : 0), { p: [x, 0.55 + k * 0.27, 0.205] });
      // Feuerschale vorn auf dem Podest
      const fx = sx * 0.86;
      A(cyl3(0.04, 0.06, 0.36, 8), '#3a2a20', { p: [fx, 0.38, 0.62], shine: 0.5 });
      A(lathe3('gatebowl', [[0, 0], [0.08, 0.01], [0.14, 0.07], [0.15, 0.12], [0.13, 0.13]], 12), '#4a3a2a', { p: [fx, 0.54, 0.62], shine: 0.6, top: '#6a5038', topK: 0.3 });
      A(horn3(0.3, 0.11, 10), L.accent, { p: [fx, 0.6, 0.62], mat: 'glow' });
      A(horn3(0.18, 0.06, 10), '#fff2c0', { p: [fx, 0.61, 0.62], mat: 'glow' });
    }
    // Bogen aus sieben Keilsteinen, der mittlere ist der Schlussstein
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI) / 6;
      const p = [Math.cos(a) * 0.72, GATE3.ya + Math.sin(a) * 0.72, 0];
      if (i === 3) continue;
      A(pillow3(), i % 2 ? stone : lighter(stone, 0.04), { p, r: [0, 0, a - Math.PI / 2 + (rnd() - 0.5) * 0.06], s: [0.15 * (0.94 + rnd() * 0.12), 0.18, 0.19], top: i === 0 || i === 6 ? top : moss, topK: i === 0 || i === 6 ? 0.3 : 0.35, shade: 0.2 });
    }
    const kp = [0, GATE3.ya + 0.74, 0.01];
    A(pillow3(), raid ? '#4a3e44' : lighter(stone, 0.08), { p: kp, s: [0.18, 0.22, 0.22], top: moss, topK: 0.4 });
    if (L.emblem) emblem3(A, L.emblem, L, [0, kp[1] + 0.02, 0.22], 1.1);
    if (raid) for (const sx of [-1, 1]) A(horn3(0.55, 0.09, 10), '#e8dcc0', { p: [sx * 0.2, kp[1] + 0.12, 0.02], r: [0, 0, -sx * 0.85], shine: 0.5 });
    const extra = (a, B) => portalExtras(a, B, L, {
      vortex: { p: [0, 0, 0], s: [1, 1, 1], arch: true },
      back: true,
      halo: { p: [0, GATE3.cy + 0.05, -0.1], s: [1.05, 1.15, 1] },
      motes: {},
      pool: { y: 0.205, r: 1.0, op: 0.16 },
      rune: { y: 0.21, r: 0.86, op: 0.28 }
    });
    return { rig, height: 2.55, family: 'portal', extra };
  }
  // Ausgang: flacher Steinkreis mit Runen, vier glatte Steine, darüber eine weiche Lichtsäule
  A(lathe3('exitbase', [[0.66, -0.02], [0.66, 0.04], [0.6, 0.06], [0, 0.06]], 24), '#5a5450', { top: '#7a746c', topK: 0.5, ao: 0 });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const p = [Math.cos(a) * 0.62, 0.2, Math.sin(a) * 0.62];
    A(ball(10), '#8a8278', { p, s: [0.12, 0.24, 0.1], r: [0, -a, 0], top: '#aaa298', topK: 0.45, shade: 0.25 });
    rune3(A, L.accent, k, { p: [p[0] * 1.17, 0.22, p[2] * 1.17], rz: 0 });
  }
  const extra = (a, B) => {
    portalExtras(a, B, Object.assign({}, L, { id: L.id + ':aus', motes: 'ember' }), {
      vortex: { p: [0, 0.065, 0], tilt: -Math.PI / 2, s: [0.56, 0.56, 1] },
      rune: { y: 0.07, r: 0.62 },
      beam: { r: 0.5, h: 2.2 }
    });
  };
  return { rig, height: 0.6, family: 'portal', extra };
}

// --- Seelenstein (seit 13.x): geschliffener Seelenkristall statt Ei ------------------------------------
// Jeder Stein ist ein facettierter Kristall (oder mehrere) auf einem kantigen Felssockel. Ein Kristall:
// Querschnitt mit n Ecken (Winkel und Radius je Ecke leicht verschieden, damit er nicht gedrechselt wirkt),
// Profil aus Ringen [u (0..1 der Höhe), Maßstab, Versatz x, Versatz z], oben eine Spitze (tip: [x, z])
// oder ein schräger Bruch (cut: [Neigung x, Neigung z]). Flach schattiert: jede Facette ein eigener Ton.

function scSpec(n, R, H, rings, o = {}) {
  const rnd = mulberry32(o.seed || 1);
  const step = (Math.PI * 2) / n;
  const jit = o.jit == null ? 0.14 : o.jit;
  // o.poly: eigener Querschnitt [[x, z], ...] im Kreis herum (z. B. die Platte des Monolithen)
  const poly = o.poly ? o.poly.slice() : [];
  for (let i = poly.length; i < n; i++) {
    const t = (o.rot || 0) + i * step + (rnd() - 0.5) * (o.twist == null ? 0.35 : o.twist) * step;
    const r = R * (1 - jit / 2 + rnd() * jit);
    poly.push([+(Math.sin(t) * r * (o.sx || 1)).toFixed(4), +(Math.cos(t) * r * (o.sz || 1)).toFixed(4)]);
  }
  const sp = { n, H, poly, rings, tip: o.tip || null, cut: o.cut || null };
  sp.key = JSON.stringify([H, poly, rings, sp.tip, sp.cut]);
  return sp;
}

// Eckpunkte der Ringe (der oberste folgt bei einem Bruch der schrägen Schnittebene)
function scRings(sp) {
  const last = sp.rings.length - 1;
  return sp.rings.map(([u, s, cx = 0, cz = 0], k) => sp.poly.map(([px, pz]) => {
    const x = px * s;
    const z = pz * s;
    const y = u * sp.H + (k === last && sp.cut ? sp.cut[0] * x + sp.cut[1] * z : 0);
    return [cx + x, y, cz + z];
  }));
}

// Dreiecke nach außen gedreht (ref: ein Punkt im Inneren bzw. hinter der Fläche)
function scTri(out, a, b, c, ref) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3 - ref[0], my = (a[1] + b[1] + c[1]) / 3 - ref[1], mz = (a[2] + b[2] + c[2]) / 3 - ref[2];
  if (nx * mx + ny * my + nz * mz < 0) out.push(a, c, b);
  else out.push(a, b, c);
}

// Alle Flächen eines Kristalls als Liste von Dreiecken [a, b, c] (Seiten, Spitze bzw. Bruchfläche, Boden)
function scFaces(sp) {
  const R = scRings(sp);
  const n = sp.n;
  const faces = [];
  const axis = (k) => {
    const [u, , cx = 0, cz = 0] = sp.rings[k];
    return [cx, u * sp.H, cz];
  };
  for (let k = 0; k < R.length - 1; k++) {
    const c0 = axis(k), c1 = axis(k + 1);
    const ref = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const quad = [];
      scTri(quad, R[k][i], R[k][j], R[k + 1][j], ref);
      scTri(quad, R[k][i], R[k + 1][j], R[k + 1][i], ref);
      faces.push({ tris: [quad.slice(0, 3), quad.slice(3, 6)], corners: [R[k][i], R[k][j], R[k + 1][j], R[k + 1][i]] });
    }
  }
  const top = R[R.length - 1];
  const tc = axis(R.length - 1);
  if (sp.tip) {
    const apex = [sp.tip[0], sp.H, sp.tip[1]];
    for (let i = 0; i < n; i++) {
      const t = [];
      scTri(t, top[i], top[(i + 1) % n], apex, tc);
      faces.push({ tris: [t], corners: [top[i], top[(i + 1) % n], apex] });
    }
  } else {
    const mid = [0, 0, 0];
    for (const p of top) for (let c = 0; c < 3; c++) mid[c] += p[c] / n;
    const t = [];
    for (let i = 0; i < n; i++) scTri(t, top[i], top[(i + 1) % n], mid, [mid[0], mid[1] - 1, mid[2]]);
    faces.push({ tris: [], cap: t });
  }
  const bot = R[0];
  const bc = axis(0);
  const t = [];
  for (let i = 0; i < n; i++) scTri(t, bot[i], bot[(i + 1) % n], bc, [bc[0], bc[1] + 1, bc[2]]);
  faces.push({ tris: [], cap: t });
  return faces;
}

// Körper des Kristalls: ohne gemeinsame Eckpunkte, damit die Normalen je Facette flach sind
function scGeo(sp) {
  return geo3('cry' + sp.key, () => {
    const pos = [];
    for (const f of scFaces(sp)) {
      for (const tri of f.tris) for (const p of tri) pos.push(p[0], p[1], p[2]);
      if (f.cap) for (const p of f.cap) pos.push(p[0], p[1], p[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  });
}

// Inneres Leuchten: auf jeder Seitenfacette ein Fächer, in der Mitte die Farbe des Kerns, an den Kanten
// schwarz (addiert nichts). Mit dem Schein-Material sieht es aus, als leuchte der Kern durch den Kristall.
function scCoreGeo(sp, color, k = 1) {
  return geo3('cryc' + sp.key + color + k, () => {
    const c = new THREE.Color(color);
    const pos = [];
    const col = [];
    for (const f of scFaces(sp)) {
      if (!f.tris.length) continue;
      const P = f.corners;
      const m = [0, 0, 0];
      for (const p of P) for (let i = 0; i < 3; i++) m[i] += p[i] / P.length;
      // Normale der Facette aus dem ersten (schon nach außen gedrehten) Dreieck
      const [a, b, d] = f.tris[0];
      const n = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2])).normalize().multiplyScalar(0.006);
      const lift = (p) => [p[0] + n.x, p[1] + n.y, p[2] + n.z];
      const h = m[1] / sp.H;
      const w = k * (0.3 + 0.7 * Math.exp(-(((h - 0.42) / 0.3) ** 2)));
      const mid = lift(m);
      const ref = [m[0] - n.x * 50, m[1] - n.y * 50, m[2] - n.z * 50];
      for (let i = 0; i < P.length; i++) {
        const t = [];
        scTri(t, lift(P[i]), lift(P[(i + 1) % P.length]), mid, ref);
        for (const p of t) {
          pos.push(p[0], p[1], p[2]);
          const on = p === mid ? w : 0;
          col.push(c.r * on, c.g * on, c.b * on);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  });
}

// Kantiger Gürtel um einen Kristall (Obelisk, Monolith): sein Querschnitt bei Höhe u, etwas größer
function scBandGeo(sp, u, thick, grow = 1.08) {
  const [s, cx, cz] = scProfile(sp, u);
  const band = { n: sp.n, H: thick, poly: sp.poly.map(([x, z]) => [+(x * s * grow).toFixed(4), +(z * s * grow).toFixed(4)]), rings: [[0, 1, cx, cz], [1, 1, cx, cz]], tip: null, cut: [0, 0] };
  band.key = JSON.stringify(['band', thick, band.poly, cx, cz]);
  return scGeo(band);
}

// Maßstab und Mittelpunkt des Querschnitts bei Höhe u (0..1)
function scProfile(sp, u) {
  const R = sp.rings;
  const ring = (r) => [r[1], r[2] || 0, r[3] || 0];
  if (u <= R[0][0]) return ring(R[0]);
  for (let k = 0; k < R.length - 1; k++) {
    if (u <= R[k + 1][0]) {
      const f = (u - R[k][0]) / Math.max(1e-6, R[k + 1][0] - R[k][0]);
      const a = ring(R[k]), b = ring(R[k + 1]);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  const last = ring(R[R.length - 1]);
  if (!sp.tip) return last;
  const f = Math.min(1, (u - R[R.length - 1][0]) / Math.max(1e-6, 1 - R[R.length - 1][0]));
  return [last[0] * (1 - f), last[1] + (sp.tip[0] - last[1]) * f, last[2] + (sp.tip[1] - last[2]) * f];
}

// Abstand von der Achse bis zur Kante des Querschnitts in Richtung a (Winkel wie sin/cos: 0 = vorn)
function scRadius(sp, a) {
  const dx = Math.sin(a), dz = Math.cos(a);
  let best = 0;
  for (let i = 0; i < sp.n; i++) {
    const [px, pz] = sp.poly[i];
    const [qx, qz] = sp.poly[(i + 1) % sp.n];
    const ex = qx - px, ez = qz - pz;
    const det = ex * dz - dx * ez;
    if (Math.abs(det) < 1e-9) continue;
    const t = (ex * pz - ez * px) / det;
    const w = (dx * pz - dz * px) / det;
    if (t > 0 && w >= -1e-6 && w <= 1 + 1e-6) best = Math.max(best, t);
  }
  return best;
}

// Winkel der Facettenmitte, die am ehesten in Richtung a zeigt (für das Herz vorn)
function scFaceAngle(sp, a) {
  let best = a, bd = 9;
  for (let i = 0; i < sp.n; i++) {
    const [px, pz] = sp.poly[i];
    const [qx, qz] = sp.poly[(i + 1) % sp.n];
    const fa = Math.atan2((px + qx) / 2, (pz + qz) / 2);
    const d = Math.abs(Math.atan2(Math.sin(fa - a), Math.cos(fa - a)));
    if (d < bd) { bd = d; best = fa; }
  }
  return best;
}

// Punkt auf der Kristalloberfläche (Höhe 0..1, Winkel; out > 1 etwas davor) – ersetzt eggAt für Adern,
// Risse, Dornen, Krone. body: { sp, p, r, s } (Lage des Kristalls im Stein)
function stoneAt(body, u, a, out = 1) {
  const sp = body.sp;
  const [s, cx, cz] = scProfile(sp, u);
  const r = scRadius(sp, a) * s * out;
  if (!body.M) {
    const rr = body.r || [0, 0, 0];
    body.M = new THREE.Matrix4().compose(new THREE.Vector3(...body.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(rr[0], rr[1], rr[2])), new THREE.Vector3(body.s, body.s, body.s));
  }
  const v = new THREE.Vector3(cx + Math.sin(a) * r, u * sp.H, cz + Math.cos(a) * r).applyMatrix4(body.M);
  return [v.x, v.y, v.z];
}

const octa3 = () => geo3('octa1', () => new THREE.OctahedronGeometry(1, 0));

// Kantige Felsbrocken: Ikosaeder ohne Glättung, Ecken verschoben, unten abgeschnitten
function scRock3(v) {
  return geo3('frock' + v, () => {
    const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    const P = g.attributes.position;
    const rnd = mulberry32(53 + v * 29);
    const moved = new Map();
    for (let i = 0; i < P.count; i++) {
      const key = `${P.getX(i).toFixed(3)},${P.getY(i).toFixed(3)},${P.getZ(i).toFixed(3)}`;
      if (!moved.has(key)) moved.set(key, 0.75 + rnd() * 0.45);
      const k = moved.get(key);
      P.setXYZ(i, P.getX(i) * k, Math.max(-0.2, P.getY(i) * k * 0.75), P.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  });
}

// Kristalle je Form: [Spezifikation, Lage, Drehung, Maßstab]; der erste ist der Hauptkristall
function stoneBodies3(sh) {
  const b = (sp, p, r = [0, 0, 0], s = 1) => ({ sp, p, r, s });
  const y = 0.05;
  if (sh === 'spire') return [
    b(scSpec(6, 0.36, 2.0, [[0, 0.86], [0.1, 1], [0.6, 0.93], [0.7, 0.74]], { seed: 3, tip: [0.04, -0.02] }), [0, y, 0]),
    b(scSpec(5, 0.13, 0.75, [[0, 1], [0.6, 0.85]], { seed: 4, tip: [0, 0] }), [0.34, y, 0.1], [0.15, 0, -0.55]),
    b(scSpec(5, 0.11, 0.55, [[0, 1], [0.55, 0.8]], { seed: 5, tip: [0, 0] }), [-0.3, y, 0.16], [0.3, 0, 0.6])
  ];
  if (sh === 'obelisk') {
    const ob = scSpec(4, 0.5, 1.9, [[0, 1], [0.08, 0.97], [0.72, 0.6]], { seed: 6, rot: Math.PI / 4, jit: 0.04, twist: 0.08, tip: [0.02, 0] });
    return [b(ob, [0, y, 0], [0, 0.55, 0])];
  }
  if (sh === 'cluster') return [
    b(scSpec(6, 0.3, 1.65, [[0, 0.9], [0.1, 1], [0.66, 0.92], [0.76, 0.7]], { seed: 7, tip: [0.03, 0.02] }), [0, y, -0.04]),
    b(scSpec(6, 0.21, 1.15, [[0, 1], [0.66, 0.9]], { seed: 8, tip: [0, 0] }), [0.26, y, 0.08], [0.12, 0, -0.42]),
    b(scSpec(5, 0.2, 1.05, [[0, 1], [0.62, 0.88]], { seed: 9, tip: [0.02, 0] }), [-0.27, y, 0.04], [-0.1, 0, 0.46]),
    b(scSpec(5, 0.15, 0.8, [[0, 1], [0.6, 0.85]], { seed: 10, tip: [0, 0] }), [0.1, y, 0.3], [0.6, 0, -0.15]),
    b(scSpec(6, 0.18, 1.2, [[0, 1], [0.65, 0.9]], { seed: 11, tip: [0, 0] }), [-0.06, y, -0.3], [-0.45, 0, 0.12]),
    b(scSpec(4, 0.1, 0.5, [[0, 1], [0.55, 0.8]], { seed: 12, tip: [0, 0] }), [-0.2, y, 0.3], [0.55, 0, 0.5])
  ];
  if (sh === 'boulder') return [
    Object.assign(b(scSpec(7, 0.58, 1.15, [[0, 0.84], [0.14, 1], [0.48, 1.0], [0.72, 0.8], [0.86, 0.52]], { seed: 13, sx: 1.1, sz: 0.92, jit: 0.24, cut: [0.16, 0.1] }), [0, y, 0], [0, 0.4, 0]), { rock: true }),
    b(scSpec(6, 0.17, 0.85, [[0, 1], [0.6, 0.88]], { seed: 14, tip: [0.02, 0] }), [0.1, 0.78, 0.06], [0.22, 0, -0.42]),
    b(scSpec(5, 0.14, 0.68, [[0, 1], [0.58, 0.85]], { seed: 15, tip: [0, 0] }), [-0.24, 0.7, 0.1], [0.25, 0, 0.62]),
    b(scSpec(5, 0.11, 0.48, [[0, 1], [0.55, 0.82]], { seed: 16, tip: [0, 0] }), [0.42, 0.45, 0.22], [0.35, 0, -1.05]),
    b(scSpec(6, 0.1, 0.42, [[0, 1], [0.55, 0.8]], { seed: 22, tip: [0, 0] }), [-0.12, 0.42, 0.4], [1.0, 0, 0.25])
  ];
  if (sh === 'twin') return [
    b(scSpec(6, 0.3, 1.85, [[0, 0.88], [0.1, 1], [0.64, 0.92], [0.74, 0.72]], { seed: 17, tip: [0.03, 0] }), [-0.2, y, -0.02], [0.04, 0, 0.2]),
    b(scSpec(5, 0.27, 1.5, [[0, 0.88], [0.1, 1], [0.62, 0.9], [0.72, 0.7]], { seed: 18, tip: [-0.02, 0.02] }), [0.22, y, 0.06], [0.1, 0, -0.26]),
    b(scSpec(5, 0.1, 0.45, [[0, 1], [0.55, 0.8]], { seed: 19, tip: [0, 0] }), [0.02, y, 0.28], [0.6, 0, 0.1])
  ];
  // monolith: breite, flache Platte, oben schräg abgebrochen
  const slab = [[0.47, 0.23], [0.57, 0.13], [0.55, -0.16], [0.49, -0.21], [-0.48, -0.22], [-0.57, -0.12], [-0.55, 0.15], [-0.5, 0.22]];
  const mono = scSpec(8, 0.56, 2.0, [[0, 0.96], [0.08, 1.03], [0.86, 0.94]], { poly: slab, cut: [0.3, 0.05] });
  return [b(mono, [0, y, 0], [0, 0.28, 0])];
}

function buildStone3(b, st) {
  const A = adder(b, null);
  const L = st.look;
  const sh = L.shape;
  const bodies = stoneBodies3(sh);
  const main = bodies[0];
  const H = Math.max(...bodies.map((o) => o.p[1] + o.sp.H * o.s * Math.cos(Math.hypot(o.r[0], o.r[2]))));
  const stone = mixColor('#77716a', L.base, 0.45);
  const dark = new THREE.Color(L.base).getHSL({}).l < 0.14;
  // Kristall leicht in der Farbe seines Scheins
  const shell = mixColor(lighter(L.base, dark ? 0.24 : 0.12), L.glow, 0.12);
  const topC = lighter(L.top, 0.15);
  const y0 = 0.3;
  // Knochen: 0 Sockel, 1 Kristall, 2 Schwebendes (Splitter, Rauch), 3–5 Risse, die bei 75/50/25 % Leben erscheinen
  const mid = [0, H * 0.5, 0];
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.3, 0], 0], [mid, 1], [mid, 1], [mid, 1]]);
  const vein = L.rune;
  const rnd = mulberry32(7 + STONE_TYPES.indexOf(st) * 13);
  // Sockel: kantiger Felshügel, Brocken und Geröll drumherum
  const mound = scSpec(9, 0.58, 0.26, [[0, 1.04], [0.5, 0.9], [1, 0.62]], { seed: 21, jit: 0.2, cut: [0.06, -0.05] });
  A(scGeo(mound), stone, { bone: 0, top: lighter(stone, 0.14), topK: 0.6, ao: 0.1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const big = i % 3 === 0;
    A(scRock3(i % 4), i % 2 ? darker(stone, 0.12) : darker(stone, 0.04), { bone: 0, p: [Math.sin(a) * (big ? 0.6 : 0.72), 0.04, Math.cos(a) * (big ? 0.6 : 0.72)], r: [0, a * 1.7, 0], s: big ? [0.17, 0.19, 0.15] : [0.09, 0.08 + (i % 2) * 0.04, 0.09], top: lighter(stone, 0.1), topK: 0.5 });
  }
  // kleine Kristallsplitter, die aus dem Fels wachsen
  const chips = sh === 'cluster' ? 2 : 4;
  for (let i = 0; i < chips; i++) {
    const a = (i / chips) * Math.PI * 2 + 0.9 + rnd() * 0.4;
    const len = 0.22 + rnd() * 0.16;
    const sp = scSpec(4 + (i % 2), 0.06 + rnd() * 0.02, len, [[0, 1], [0.55, 0.8]], { seed: 30 + i, tip: [0, 0] });
    A(scGeo(sp), i % 2 ? shell : topC, { bone: 0, p: [Math.sin(a) * 0.5, 0.1, Math.cos(a) * 0.5], r: [Math.cos(a) * 0.75, 0, -Math.sin(a) * 0.75], top: topC, topK: 0.4, shine: 0.6 });
  }
  // Kristallkörper (flache Facetten) und darüber das Leuchten des Kerns
  // (der Brocken ist Fels, aus dem die Kristalle brechen)
  for (const o of bodies) {
    A(scGeo(o.sp), o.rock ? mixColor(shell, stone, 0.45) : sh === 'boulder' ? mixColor(shell, L.glow, 0.45) : shell, { bone: 1, p: o.p, r: o.r, s: o.s, top: o.rock ? lighter(stone, 0.1) : topC, topK: 0.45, shade: 0.28, shine: o.rock ? 0.2 : 0.6, ao: 0.08 });
    A(scCoreGeo(o.sp, lighter(L.glow, 0.15), o.rock ? 0.6 : o === main ? 1.7 : 1.3), null, { bone: 1, p: o.p, r: o.r, s: o.s, mat: 'aura', ao: 0 });
  }
  // Linie entlang der Oberfläche (in kleinen Stücken, damit sie über die Kanten nicht einsinkt)
  const surfLine = (o, u0, a0, u1, a1, out, r1, r2, color, opt) => {
    let prev = stoneAt(o, u0, a0, out);
    for (let k = 1; k <= 2; k++) {
      const next = stoneAt(o, u0 + (u1 - u0) * (k / 2), a0 + (a1 - a0) * (k / 2), out);
      limbBetween(A, prev, next, r1, r2, color, opt);
      prev = next;
    }
  };
  // Glühende Adern von unten nach oben (auf den großen Kristallen)
  const big = bodies.filter((o) => o.sp.H * o.s >= 1);
  const veins = big.length > 1 ? 2 : 4;
  for (const o of big.slice(0, 2)) for (let v = 0; v < veins; v++) {
    let a = (v / veins) * Math.PI * 2 + rnd() * 0.5;
    let u = 0.1 + rnd() * 0.08;
    const steps = 3 + Math.floor(rnd() * 3);
    for (let s = 0; s < steps; s++) {
      const u1 = Math.min(o.sp.tip ? 0.66 : 0.82, u + 0.1 + rnd() * 0.08);
      const a1 = a + (rnd() - 0.5) * 0.8;
      surfLine(o, u, a, u1, a1, 1.01, 0.026, 0.02, vein, { bone: 1, mat: 'glow', seg: 4 });
      if (rnd() < 0.3) surfLine(o, u1, a1, u1 - 0.06, a1 + (rnd() < 0.5 ? -0.4 : 0.4), 1.01, 0.014, 0.008, vein, { bone: 1, mat: 'glow', seg: 4 });
      u = u1;
      a = a1;
    }
  }
  // Risse, die mit dem Schaden wachsen (zackig, hell glühend); ab 25 % platzen Splitter ab
  for (let stage = 0; stage < 3; stage++) {
    const bone = 3 + stage;
    for (let v = 0; v < 2 + stage; v++) {
      const o = big[v % big.length];
      let a = (v % 2 ? 1 : -1) * (0.2 + rnd() * 1.1) + (rnd() < 0.3 ? Math.PI : 0);
      let u = 0.3 + rnd() * 0.32;
      for (let s = 0; s < 4; s++) {
        const u1 = Math.max(0.08, Math.min(o.sp.tip ? 0.7 : 0.84, u + (s % 2 ? 0.14 : -0.12) * (0.6 + rnd() * 0.8)));
        const a1 = a + (s % 2 ? -1 : 1) * (0.18 + rnd() * 0.25);
        surfLine(o, u, a, u1, a1, 1.02, 0.036, 0.026, lighter(L.rune, 0.35), { bone, mat: 'glow', seg: 4 });
        u = u1;
        a = a1;
      }
    }
    // abgeplatzte Splitter am Riss (Stufe 2 einer, Stufe 3 drei)
    for (let i = 0; i < stage; i++) {
      const o = big[i % big.length];
      const a = (i - 1) * 0.9 + rnd() * 0.3;
      const p = stoneAt(o, 0.35 + i * 0.16, a, 1.0);
      const sp = scSpec(3, 0.09, 0.2, [[0, 1], [0.4, 0.8]], { seed: 40 + i + stage * 3, tip: [0, 0] });
      A(scGeo(sp), shell, { bone, p, r: [Math.cos(a) * 1.3, 0, -Math.sin(a) * 1.3], top: topC, topK: 0.4, shine: 0.5 });
    }
  }
  // Herz: ein glühender, geschliffener Kern in der vorderen Facette
  const fa = scFaceAngle(main.sp, -main.r[1]);
  const heart = stoneAt(main, sh === 'boulder' ? 0.5 : 0.4, fa, 1.0);
  A(octa3(), lighter(L.glow, 0.35), { bone: 1, p: heart, r: [0, fa + main.r[1], 0], s: [0.09, 0.15, 0.06], mat: 'glow' });
  A(octa3(), L.glow, { bone: 1, p: heart, r: [0, fa + main.r[1], 0], s: [0.17, 0.26, 0.08], mat: 'aura' });
  // Besonderheiten je Stein
  if (L.thorns) for (let i = 0; i < 9; i++) {
    const a = i * 0.7, u = 0.15 + (i % 4) * 0.15;
    const p = stoneAt(main, u, a, 0.96);
    const sp = scSpec(4, 0.05, 0.24, [[0, 1], [0.25, 0.8]], { seed: 50 + (i % 3), tip: [0, 0] });
    A(scGeo(sp), '#4a3220', { bone: 1, p, r: [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2], top: '#6a4a30', topK: 0.4 });
  }
  if (L.lava) {
    A(geo3('stlava', () => {
      // Lavalache mit unregelmäßigem, zackigem Rand
      const g = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
      const P = g.attributes.position;
      const r = mulberry32(91);
      const k0 = 0.8 + r() * 0.3;
      for (let i = 1; i < P.count; i++) { const k = i === 1 || i === P.count - 1 ? k0 : 0.8 + r() * 0.3; P.setXYZ(i, P.getX(i) * k, 0, P.getZ(i) * k); }
      return g;
    }), '#ff6a1a', { bone: 0, p: [0, 0.035, 0], mat: 'glow' });
    for (let i = 0; i < 6; i++) { const a = i * 1.05; A(octa3(), '#ffb04a', { bone: 0, p: [Math.sin(a) * 0.78, 0.07, Math.cos(a) * 0.78], s: [0.06, 0.03, 0.06], mat: 'glow' }); }
  }
  if (L.ice) for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    const sp = scSpec(5 + (i % 2), 0.09, 0.55, [[0, 1], [0.62, 0.8]], { seed: 60 + (i % 3), tip: [0, 0] });
    A(scGeo(sp), '#e8f6ff', { bone: 0, p: [Math.sin(a) * 0.8, 0.08, Math.cos(a) * 0.8], s: 0.7 + (i % 3) * 0.25, r: [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45], top: '#ffffff', topK: 0.5, shine: 0.9 });
  }
  if (L.crystal) for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.4;
    const p = stoneAt(main, 0.5 + (i % 2) * 0.12, a, 0.85);
    const sp = scSpec(5, 0.08, 0.44, [[0, 1], [0.6, 0.85]], { seed: 70 + i, tip: [0, 0] });
    A(scGeo(sp), '#ff8a9a', { bone: 1, p, r: [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9], mat: 'glow' });
  }
  if (sh === 'obelisk' || sh === 'monolith') for (const u of sh === 'obelisk' ? [0.28, 0.6] : [0.3, 0.66]) {
    const [s] = scProfile(main.sp, u);
    A(scBandGeo(main.sp, u, 0.07), sh === 'monolith' ? '#c9a35a' : darker(L.base, 0.3), { bone: 1, p: [0, main.p[1] + u * main.sp.H - 0.035, 0], r: main.r, top: sh === 'monolith' ? '#e8c87a' : null, topK: 0.5, shine: 0.7 });
  }
  if (L.crown) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = stoneAt(main, 0.86, a, 0.98);
    const sp = scSpec(4, 0.065, 0.34, [[0, 1], [0.3, 0.85]], { seed: 80 + i, tip: [0, 0], jit: 0.05 });
    A(scGeo(sp), '#e8c46a', { bone: 1, p, r: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], top: '#fff0b0', topK: 0.5, shine: 0.8 });
  }
  // schwebende Splitter über der Spitze (Monolithen und Krone, wie im 2D-Bild)
  if (sh === 'monolith' || L.crown) for (let i = 0; i < (L.crown ? 5 : 3); i++) {
    const a = (i / (L.crown ? 5 : 3)) * Math.PI * 2;
    A(octa3(), i % 2 ? L.rune : L.glow, { bone: 2, p: [Math.sin(a) * 0.62, H + 0.12 + (i % 2) * 0.12, Math.cos(a) * 0.62], s: [0.05, 0.1, 0.05], r: [0, a, 0.3], mat: 'glow' });
  }
  if (L.smoke) for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    A(ball(10), darker(L.base, 0.4), { bone: 2, p: [Math.sin(a) * 0.75, 0.45 + (i % 3) * 0.25, Math.cos(a) * 0.75], s: [0.22, 0.14, 0.22], mat: 'aura' });
  }
  A(geo3('stglow', () => new THREE.CircleGeometry(1.15, 32).rotateX(-Math.PI / 2)), L.glow, { bone: 0, p: [0, 0.03, 0], mat: 'aura' });
  return { rig, height: y0 + H + 0.05, family: 'stone' };
}

// --- Diener des Nekromanten (seit 8.5) -----------------------------------------------------------------
// Skelettkrieger: Schädel mit Kiefer und grünen Augen, offene Rippen, zerfetzter Lendenschurz,
// rostiges Kurzschwert und kleiner runder Knochenschild. Keine Hörner, kein Helm (kein feindlicher Grabwächter).
function skeletonWarrior3(b) {
  const bone = '#e2dac2';
  const shade = '#b8b096';
  const cloth = '#2e4526';
  const res = humanoid3(b, {
    skin: bone, torso: '#26241c', sleeve: bone, pants: bone, boots: shade, gloves: bone, collar: bone, bootTrim: shade, cuff: shade,
    skirt: cloth, flap: '#243a1e', belt: '#3a2a1c', noBuckle: true, pouch: false,
    glowEyes: '#a7e37f', angry: false, noMouth: true, noNose: true, noEars: true, blush: false, bonePads: true, headR: 0.28,
    // Schädel: Hinterkopf, Wangenknochen, tiefe Augenhöhlen mit grünem Glühen, Nasenloch, Zahnreihe, abgesetzter Unterkiefer
    headgear: (A, hb, hc, hr) => {
      const [x, y, z] = hc;
      A(ball(14), bone, { bone: hb, p: [x, y + hr * 0.12, z - hr * 0.22], s: [hr * 0.9, hr * 0.84, hr * 0.92] });
      A(roundBox(hr * 1.5, hr * 0.16, hr * 0.3, hr * 0.08), shade, { bone: hb, p: [x, y + hr * 0.14, z + hr * 0.72], r: [0.25, 0, 0] });
      for (const sx of [-1, 1]) {
        A(ball(10), '#14100c', { bone: hb, p: [x + sx * hr * 0.36, y - hr * 0.08, z + hr * 0.72], s: [hr * 0.27, hr * 0.24, hr * 0.2], mat: 'face' });
        A(ball(10), '#a7e37f', { bone: hb, p: [x + sx * hr * 0.36, y - hr * 0.08, z + hr * 0.9], s: [hr * 0.13, hr * 0.11, hr * 0.05], mat: 'glow' });
        A(ball(8), bone, { bone: hb, p: [x + sx * hr * 0.62, y - hr * 0.32, z + hr * 0.55], s: [hr * 0.2, hr * 0.14, hr * 0.22] });
      }
      A(horn3(+(hr * 0.2).toFixed(3), +(hr * 0.09).toFixed(3), 3), '#1a1410', { bone: hb, p: [x, y - hr * 0.2, z + hr * 0.93], r: [Math.PI, 0, 0], s: [1, 1, 0.5] });
      A(roundBox(hr * 0.62, hr * 0.06, hr * 0.06, hr * 0.02), '#1a1410', { bone: hb, p: [x, y - hr * 0.48, z + hr * 0.86] });
      for (let k = -3; k <= 3; k++) A(roundBox(hr * 0.07, hr * 0.11, hr * 0.05, hr * 0.02), '#f4eedc', { bone: hb, p: [x + k * hr * 0.085, y - hr * 0.41, z + hr * 0.88 - Math.abs(k) * hr * 0.03] });
      A(ball(12), shade, { bone: hb, p: [x, y - hr * 0.6, z + hr * 0.42], s: [hr * 0.62, hr * 0.2, hr * 0.5] });
      // Schädelnaht und Risse auf der Schädeldecke (von oben gut zu sehen)
      A(roundBox(hr * 0.04, hr * 0.32, hr * 0.03, hr * 0.012), '#5a5444', { bone: hb, p: [x + hr * 0.3, y + hr * 0.55, z + hr * 0.6], r: [0.6, 0, 0.5] });
      for (let k = 0; k < 3; k++) A(roundBox(hr * 0.05, hr * 0.03, hr * 0.42, hr * 0.012), '#6a6450', { bone: hb, p: [x + (k % 2 ? 0.05 : -0.05) * hr, y + hr * (0.96 - Math.abs(k - 1) * 0.06), z + hr * (0.25 - k * 0.42)], r: [0.35 - k * 0.35, (k % 2 ? 0.4 : -0.4), 0] });
    }
  });
  const A = adder(b);
  const { hipY, shY, shX } = res;
  const chestY = hipY + 0.26;
  // offene Rippen über dem dunklen Brustkorb, Brustbein vorn, Wirbelsäule hinten
  for (let k = 0; k < 4; k++) A(torus3(0.215 - k * 0.012, 0.018, Math.PI * 1.08, 3, 12), k % 2 ? bone : '#d6ceb4', { bone: BH.chest, p: [0, chestY + 0.11 - k * 0.065, 0], r: [Math.PI / 2 - 0.1, 0, -Math.PI * 0.04], s: [1, 0.86, 1], noShadow: true });
  A(roundBox(0.045, 0.24, 0.03, 0.015), bone, { bone: BH.chest, p: [0, chestY + 0.02, 0.19], r: [0.08, 0, 0] });
  for (let k = 0; k < 5; k++) A(ball(8), shade, { bone: BH.chest, p: [0, hipY + 0.08 + k * 0.07, -0.16], s: [0.04, 0.03, 0.035] });
  A(ball(10), shade, { bone: BH.hips, p: [0, hipY - 0.02, 0], s: [0.16, 0.06, 0.12] });
  // zerfetzte Stoffstreifen am Lendenschurz
  for (let k = 0; k < 7; k++) {
    const a = -1.2 + (k / 6) * 2.4;
    A(horn3(0.1 + (k % 3) * 0.04, 0.04, 4), k % 2 ? cloth : '#1f3319', { bone: BH.hips, p: [Math.sin(a) * 0.22, hipY - 0.32, Math.cos(a) * 0.19], r: [Math.PI, 0, (k - 3) * 0.06], s: [1, 1, 0.35], noShadow: true });
  }
  // rostiges Kurzschwert (rechte Hand)
  const armLen = 0.31;
  const handR = [-shX, shY - armLen - 0.031, 0.02];
  const W = framed(A, partFrame(handR, WEAPON_HOLD.sword), BH.handR);
  W(limb3(0.14, 0.026, 0.024, 7), '#4a3426', { p: [0, 0.03, 0] });
  W(roundBox(0.2, 0.035, 0.05, 0.014), '#6a5a48', { p: [0, 0.05, 0], shine: 0.4 });
  W(roundBox(0.085, 0.42, 0.022, 0.01), '#8a8276', { p: [0, 0.27, 0], shine: 0.5 });
  W(horn3(0.08, 0.042, 4), '#8a8276', { p: [0, 0.48, 0], s: [1, 1, 0.26], shine: 0.5 });
  for (const [py, px] of [[0.16, 0.02], [0.3, -0.018], [0.4, 0.012]]) W(ball(6), '#9a5a32', { p: [px, py, 0.012], s: [0.026, 0.04, 0.012], noShadow: true });
  // kleiner runder Knochenschild (linker Unterarm)
  const S = framed(A, partFrame([shX + 0.08, shY - armLen * 0.6, 0.05], [0, 0, Math.PI / 2]), BH.handL);
  S(cyl3(0.17, 0.17, 0.035, 16), '#c8c0a6', { top: bone, topK: 0.4, shade: 0.15 });
  S(torus3(0.17, 0.02, Math.PI * 2, 4, 18), shade, { r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    S(roundBox(0.03, 0.02, 0.13, 0.01), '#a8a088', { p: [Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], r: [0, -a, 0] });
  }
  S(ball(10), bone, { p: [0, 0.035, 0], s: [0.055, 0.04, 0.055], shine: 0.4 });
  res.style = 'swing';
  res.scale = 1.0;
  res.blob = 0.42;
  return res;
}

// Knochenhund: hager, Rippen, Stachelkamm, grün glühende Mähne und Augen; ab L Seelenhund mit
// leuchtenden Streifen und Mähnenspitzen in Rangfarbe, der Alpha mit Rune auf dem Rücken
function boneHound3(b, al) {
  const soul = al.tier >= 3;
  const tip = soul ? SKILL_RANKS[al.alpha ? 3 : 2].color : null;
  const res = beast3(b, {
    fur: '#ddd5bb', belly: '#a8a088', back: '#8a8270', ribs: true, ridge: true, fangs: true, lean: true, angry: true, glow: true,
    eye: '#a7e37f', mane: soul ? '#9ff0b8' : '#7ad36a', glowMane: true, stripes: soul ? '#7fe3a0' : null, glowStripes: soul,
    noEars: true, rune: al.alpha ? '#e0ffd0' : null
  });
  const A = adder(b);
  const { hp, bodyY, len, bw } = res;
  // spitze Knochenohren statt Fellohren
  for (const sx of [-1, 1]) A(horn3(0.15, 0.045, 5), '#c8c0a6', { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.12, hp[2] - 0.05], r: [-0.35, 0, -sx * 0.4], s: [1, 1, 0.6] });
  // Mähnenspitzen in Rangfarbe (Seelenhunde)
  if (tip) for (let k = 0; k < 4; k++) A(horn3(0.08, 0.03, 4), tip, { bone: BQ.body, p: [0, bodyY + 0.36 * bw - k * 0.02, len * (0.15 - k * 0.24)], r: [-0.5, 0, 0], mat: 'glow', noShadow: true });
  // Alpha: leuchtende Rune auf dem Rücken
  if (al.alpha) {
    const ry = bodyY + 0.22 * bw;
    A(torus3(0.11, 0.014, Math.PI * 2, 3, 16), '#e0ffd0', { bone: BQ.body, p: [0, ry, -len * 0.1], r: [Math.PI / 2, 0, 0], mat: 'glow', noShadow: true });
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) A(box3(), '#e0ffd0', { bone: BQ.body, p: [0, ry + 0.005, -len * 0.1], r: [0, a, 0], s: [0.016, 0.01, 0.17], mat: 'glow', noShadow: true });
  }
  return Object.assign(res, { family: 'beast', style: 'bite', blob: 0.5, scale: 1.0 });
}

// Knochendrache (seit 13.94, Totenbeschwörung ab Heroisch): kleiner Drache aus Knochen – Schädel mit langer
// Schnauze, Zähnen und gebogenen dunklen Hörnern, Wirbelsäule mit Zacken, offener Brustkorb mit grüner Seelenflamme
// und violettem Schein, zerfetzte Hautflügel mit Fingerknochen, dünne Beine mit Krallen, Schwanz mit Knochenklinge.
// big (Legendär): violett glühende Rückenzacken und ein zweites Hornpaar. Fliegt (dragonFly3).
const DRAGON3_BONE = '#e2dac2';
const DRAGON3_SHADE = '#b8b096';
const DRAGON3_DARK = '#2a2630';
function dragonMembraneGeo(mirror) {
  // rechter Flügel gespiegelt mit umgedrehtem Umlauf (Bake3 dreht bei negativer Größe die Dreiecke nicht um,
  // sonst sähe man von oben die dunkle Unterseite)
  if (mirror) return geo3('dragonmem1m', () => {
    const g = dragonMembraneGeo(false).clone();
    const out = g.index ? g.toNonIndexed() : g;
    out.scale(-1, 1, 1);
    for (const k in out.attributes) {
      const A = out.attributes[k];
      const n = A.itemSize;
      for (let i = 0; i + 2 < A.count; i += 3) {
        for (let c = 0; c < n; c++) {
          const t = A.array[(i + 1) * n + c];
          A.array[(i + 1) * n + c] = A.array[(i + 2) * n + c];
          A.array[(i + 2) * n + c] = t;
        }
      }
    }
    return out;
  });
  return geo3('dragonmem1', () => {
    const V = (x, y) => new THREE.Vector2(x, y);
    const s = new THREE.Shape([V(0, 0.06), V(0.3, 0.13), V(0.56, 0.08), V(0.92, -0.06), V(0.8, -0.11), V(0.84, -0.18), V(0.78, -0.33),
      V(0.66, -0.27), V(0.6, -0.37), V(0.46, -0.46), V(0.36, -0.35), V(0.27, -0.43), V(0.15, -0.3), V(0.06, -0.26), V(0, -0.18)]);
    // ausgerissene Löcher in der Haut
    s.holes.push(new THREE.Path([V(0.6, -0.1), V(0.56, -0.15), V(0.62, -0.2), V(0.69, -0.15)]));
    s.holes.push(new THREE.Path([V(0.34, -0.2), V(0.3, -0.26), V(0.38, -0.29)]));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}
function boneDragon3(b, big) {
  const A = adder(b);
  const bone = DRAGON3_BONE;
  const shade = DRAGON3_SHADE;
  const bodyY = 0.5;
  const len = 0.4;
  const hp = [0, bodyY + 0.36, len + 0.42];
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [hp, 1],
    [[0.11, bodyY - 0.08, len * 0.55], 1], [[-0.11, bodyY - 0.08, len * 0.55], 1], [[0.12, bodyY - 0.06, -len * 0.5], 1], [[-0.12, bodyY - 0.06, -len * 0.5], 1],
    [[0, bodyY + 0.02, -len * 0.85], 1], [[0.1, bodyY + 0.13, len * 0.3], 1], [[-0.1, bodyY + 0.13, len * 0.3], 1], [[0, bodyY + 0.1, len * 0.75], 1],
    [[0, hp[1] - 0.05, hp[2] + 0.02], 2]
  ]);
  // dunkler Kern im Brustkorb, darin die Seelenflamme (grün, violetter Schein)
  A(ball(12), DRAGON3_DARK, { bone: BQ.body, p: [0, bodyY - 0.01, 0.02], s: [0.12, 0.11, 0.34] });
  A(ball(10), '#7fe3a0', { bone: BQ.body, p: [0, bodyY - 0.01, len * 0.32], s: [0.085, 0.085, 0.1], mat: 'glow' });
  A(ball(8), '#e0ffe8', { bone: BQ.body, p: [0, bodyY - 0.01, len * 0.36], s: [0.045, 0.045, 0.05], mat: 'glow' });
  A(ball(10), '#8a5ae0', { bone: BQ.body, p: [0, bodyY - 0.01, len * 0.3], s: [0.17, 0.16, 0.2], mat: 'aura' });
  // Wirbelsäule mit Zacken (Legendär: violett glühend)
  for (let k = 0; k < 8; k++) {
    const z = len * (0.95 - k * 0.27);
    A(ball(8), k % 2 ? shade : bone, { bone: BQ.body, p: [0, bodyY + 0.15 - Math.abs(k - 3) * 0.006, z], s: [0.045, 0.04, 0.05] });
    A(horn3(big ? 0.1 : 0.08, 0.022, 5), big ? '#c58cff' : bone, { bone: BQ.body, p: [0, bodyY + 0.17, z], r: [-0.55, 0, 0], mat: big ? 'glow' : 'lit', noShadow: true });
  }
  // offener Brustkorb: Rippen als Ringe mit Lücke am Bauch, Brustbein, Becken, Schulterblätter
  for (let k = 0; k < 5; k++) {
    const rr = 0.165 - Math.abs(k - 1.5) * 0.014;
    A(torus3(+rr.toFixed(3), 0.016, Math.PI * 1.6, 3, 14), k % 2 ? shade : bone, { bone: BQ.body, p: [0, bodyY, len * (0.58 - k * 0.22)], r: [0, 0, -Math.PI * 0.3], s: [1, 1.05, 1], noShadow: true });
  }
  A(roundBox(0.035, 0.028, len * 1.1, 0.012), shade, { bone: BQ.body, p: [0, bodyY - 0.165, len * 0.2] });
  A(ball(10), shade, { bone: BQ.body, p: [0, bodyY + 0.03, -len * 0.72], s: [0.12, 0.07, 0.1] });
  for (const sx of [-1, 1]) A(roundBox(0.1, 0.02, 0.14, 0.01), bone, { bone: BQ.body, p: [sx * 0.09, bodyY + 0.12, len * 0.35], r: [0.2, 0, sx * 0.5] });
  // Hals aus Wirbeln
  for (let k = 0; k < 4; k++) {
    const u = (k + 0.5) / 4;
    const p = [0, bodyY + 0.12 + (hp[1] - 0.08 - bodyY - 0.12) * u, len * 0.75 + (hp[2] - 0.16 - len * 0.75) * u];
    A(ball(8), k % 2 ? shade : bone, { bone: BQ.neck, p, s: [0.05 - k * 0.003, 0.045, 0.05] });
    A(horn3(0.06, 0.016, 4), bone, { bone: BQ.neck, p: [0, p[1] + 0.035, p[2]], r: [-0.6, 0, 0], noShadow: true });
  }
  // Schädel: Hirnschale, lange Schnauze, Nasenlöcher, Augenhöhlen mit grünem Glühen, Zähne, Hörner
  const hy = hp[1];
  const hz = hp[2];
  A(ball(12), bone, { bone: BQ.head, p: [0, hy + 0.02, hz - 0.03], s: [0.11, 0.1, 0.13], top: '#f0e8d4', topK: 0.4 });
  A(roundBox(0.12, 0.07, 0.24, 0.03), bone, { bone: BQ.head, p: [0, hy - 0.01, hz + 0.15], r: [0.1, 0, 0], top: '#f0e8d4', topK: 0.4 });
  A(roundBox(0.03, 0.02, 0.18, 0.01), shade, { bone: BQ.head, p: [0, hy + 0.03, hz + 0.13], r: [0.12, 0, 0] });
  for (const sx of [-1, 1]) {
    A(ball(8), '#14100c', { bone: BQ.head, p: [sx * 0.025, hy + 0.01, hz + 0.27], s: [0.014, 0.012, 0.01], mat: 'face' });
    A(ball(10), '#14100c', { bone: BQ.head, p: [sx * 0.07, hy + 0.035, hz + 0.05], s: [0.042, 0.036, 0.034], mat: 'face' });
    A(ball(10), '#a7ffcf', { bone: BQ.head, p: [sx * 0.08, hy + 0.035, hz + 0.07], s: [0.024, 0.021, 0.014], mat: 'glow' });
    A(roundBox(0.06, 0.018, 0.05, 0.008), shade, { bone: BQ.head, p: [sx * 0.07, hy + 0.075, hz + 0.05], r: [0, 0, sx * 0.3] });
    for (let k = 0; k < 4; k++) A(horn3(0.035, 0.01, 4), '#f4eedc', { bone: BQ.head, p: [sx * 0.05, hy - 0.045, hz + 0.08 + k * 0.045], r: [Math.PI, 0, 0], noShadow: true });
    A(tube3([[sx * 0.06, hy + 0.08, hz - 0.04], [sx * 0.1, hy + 0.15, hz - 0.13], [sx * 0.12, hy + 0.17, hz - 0.26], [sx * 0.1, hy + 0.13, hz - 0.36]], 0.035, 0.005), '#3a3440', { bone: BQ.head, shine: 0.6 });
    if (big) A(tube3([[sx * 0.09, hy + 0.04, hz - 0.08], [sx * 0.16, hy + 0.06, hz - 0.16], [sx * 0.19, hy + 0.04, hz - 0.26]], 0.025, 0.004), '#3a3440', { bone: BQ.head, shine: 0.6 });
    // Unterkiefer mit Zähnen (eigenes Glied, geht beim Speien auf)
    for (let k = 0; k < 3; k++) A(horn3(0.03, 0.009, 4), '#f4eedc', { bone: 11, p: [sx * 0.04, hy - 0.07, hz + 0.1 + k * 0.05], noShadow: true });
  }
  A(roundBox(0.1, 0.03, 0.22, 0.012), shade, { bone: 11, p: [0, hy - 0.08, hz + 0.13] });
  // Flügel: Armknochen bis zum Handgelenk, drei Fingerknochen, zerfetzte Haut (oben heller)
  for (const [sx, wb] of [[1, BQ.wingL], [-1, BQ.wingR]]) {
    const y0 = bodyY + 0.135;
    const z0 = len * 0.3 - 0.06;
    const wp = (x, z) => [sx * (0.1 + x), y0 + 0.01, z0 + z];
    A(dragonMembraneGeo(sx < 0), '#3e3248', { bone: wb, p: [sx * 0.1, y0, z0], top: '#6a5878', topK: 0.6, noShadow: true });
    limbBetween(A, wp(0, 0.06), wp(0.3, 0.13), 0.03, 0.024, bone, { bone: wb });
    limbBetween(A, wp(0.3, 0.13), wp(0.56, 0.08), 0.024, 0.018, bone, { bone: wb });
    A(ball(8), shade, { bone: wb, p: wp(0.3, 0.13), s: 0.032 });
    A(ball(8), shade, { bone: wb, p: wp(0.56, 0.08), s: 0.028 });
    for (const [x, z] of [[0.92, -0.06], [0.78, -0.33], [0.46, -0.46]]) limbBetween(A, wp(0.56, 0.08), wp(x, z), 0.015, 0.007, bone, { bone: wb, noShadow: true });
    pointAt3(A, horn3(0.07, 0.016, 5), '#f0e8d4', wp(0.56, 0.08), [sx * 0.2, 0.3, 1], { bone: wb, noShadow: true });
  }
  // Beine mit Krallen (hängen im Flug nach hinten)
  for (const [lb, sx, front] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, 0], [BQ.legBR, -1, 0]]) {
    const z = front ? len * 0.55 : -len * 0.5;
    const top = [sx * (front ? 0.11 : 0.12), bodyY - (front ? 0.08 : 0.06), z];
    const knee = [sx * 0.14, bodyY - 0.2, z + (front ? -0.05 : 0.12)];
    const foot = [sx * 0.13, bodyY - (front ? 0.3 : 0.34), z + (front ? 0.06 : -0.06)];
    if (!front) A(ball(8), shade, { bone: lb, p: top, s: [0.05, 0.06, 0.07] });
    limbBetween(A, top, knee, front ? 0.022 : 0.03, 0.02, bone, { bone: lb });
    limbBetween(A, knee, foot, 0.02, 0.015, shade, { bone: lb });
    for (const dx of [-0.025, 0, 0.025]) pointAt3(A, horn3(0.045, 0.01, 4), '#f4eedc', [foot[0] + dx, foot[1], foot[2]], [dx * 4, -0.5, 1], { bone: lb, noShadow: true });
  }
  // Schwanz aus Wirbeln mit Knochenklinge
  const tail = [[0, bodyY + 0.02, -len * 0.9], [0, bodyY - 0.01, -len - 0.12], [0, bodyY - 0.04, -len - 0.32], [0, bodyY, -len - 0.5], [0, bodyY + 0.07, -len - 0.64]];
  for (let k = 0; k < 9; k++) {
    const u = k / 8;
    const i = Math.min(3, Math.floor(u * 4));
    const f = u * 4 - i;
    const p = [0, tail[i][1] + (tail[i + 1][1] - tail[i][1]) * f, tail[i][2] + (tail[i + 1][2] - tail[i][2]) * f];
    A(ball(8), k % 2 ? shade : bone, { bone: BQ.tail, p, s: [0.04 - k * 0.003, 0.035 - k * 0.0025, 0.045] });
    if (k % 2 === 0 && k < 8) A(horn3(0.05, 0.014, 4), big ? '#c58cff' : bone, { bone: BQ.tail, p: [0, p[1] + 0.03, p[2]], r: [-0.7, 0, 0], mat: big ? 'glow' : 'lit', noShadow: true });
  }
  pointAt3(A, horn3(0.16, 0.05, 4), bone, tail[4], [0, 0.35, -1], { bone: BQ.tail, s: [1, 1, 0.35], shine: 0.4 });
  return { rig, height: 1.05, family: 'beast', bodyY, jaw: true, len, bw: 1, hp, legLen: 0.3, style: 'breath', blob: 0.45, scale: 0.64, fly: true };
}

// Seelenkoloss (seit 13.94, Totenbeschwörung Vollendet): eigener Entwurf – massiger Riese aus schwarzem Obsidian
// mit Knochen als Panzer: Schädelhelm mit dunklen gebogenen Hörnern und grün glühenden Augen, breite Schultern mit
// Knochenplatten und Zacken, Rippen vor der Brust und darin der grüne Seelenkern, glühende Risse im Obsidian,
// lange Arme mit riesigen Fäusten, kurze Säulenbeine. Etwa 1,2-mal so groß wie die Spielerfigur.
function soulColossus3(b) {
  const A = adder(b);
  const obs = '#272325';
  const obsHi = '#4c4648';
  const bone = '#e2dac2';
  const shade = '#b8b096';
  const glow = '#7fe3a0';
  const hipY = 0.82;
  const chestY = 1.12;
  const neckY = 1.6;
  const shY = 1.5;
  const shX = 0.48;
  const armLen = 0.62;
  const hipX = 0.19;
  const hc = [0, 1.74, 0.1];
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, hipY, 0], 0], [[0, chestY, 0], 1], [[0, neckY, 0], 2],
    [[shX, shY, 0], 2], [[-shX, shY, 0], 2], [[shX + 0.06, shY - armLen, 0.04], 4], [[-shX - 0.06, shY - armLen, 0.04], 5],
    [[hipX, hipY, 0], 1], [[-hipX, hipY, 0], 1], [[0, shY, -0.25], 2], [[0, hipY, -0.25], 1],
    [[0.15, shY, -0.25], 2], [[-0.15, shY, -0.25], 2]
  ]);
  const ob = (x) => Object.assign({ top: obsHi, topK: 0.45, shine: 0.7, shade: 0.2 }, x);
  const crack = (bn, p, r, h) => A(box3(), glow, { bone: bn, p, r, s: [0.024, h, 0.02], mat: 'glow', noShadow: true });
  // Beine: Obsidiansäulen mit Knochen an Knie und Schienbein, breite Füße mit Knochenkrallen
  for (const [sx, lb] of [[1, BH.legL], [-1, BH.legR]]) {
    const top = [sx * hipX, hipY + 0.05, 0];
    const knee = [sx * hipX * 1.05, 0.45, 0.03];
    const ankle = [sx * hipX, 0.12, 0];
    limbBetween(A, top, knee, 0.15, 0.12, obs, ob({ bone: lb }));
    limbBetween(A, knee, ankle, 0.12, 0.11, obs, ob({ bone: lb }));
    A(ball(10), bone, { bone: lb, p: [knee[0], knee[1], 0.13], s: [0.09, 0.09, 0.06], top: '#f0e8d4', topK: 0.4 });
    A(roundBox(0.1, 0.24, 0.04, 0.015), bone, { bone: lb, p: [sx * hipX, 0.28, 0.115], r: [-0.05, 0, 0] });
    A(roundBox(0.25, 0.12, 0.34, 0.05), obs, ob({ bone: lb, p: [sx * hipX, 0.06, 0.06] }));
    for (const dx of [-0.07, 0, 0.07]) pointAt3(A, horn3(0.09, 0.03, 5), bone, [sx * hipX + dx, 0.05, 0.22], [0, -0.25, 1], { bone: lb, noShadow: true });
    crack(lb, [sx * (hipX + 0.1), 0.64, 0.09], [0, 0, sx * 0.4], 0.16);
  }
  // Becken, Leib, Schulterwulst, Buckel
  A(ball(12), obs, ob({ bone: BH.hips, p: [0, hipY + 0.02, 0], s: [0.3, 0.17, 0.23] }));
  A(roundBox(0.2, 0.08, 0.06, 0.02), bone, { bone: BH.hips, p: [0, hipY - 0.04, 0.2], r: [0.2, 0, 0] });
  A(ball(16), obs, ob({ bone: BH.chest, p: [0, chestY + 0.14, 0], s: [0.42, 0.38, 0.3] }));
  A(ball(12), obs, ob({ bone: BH.chest, p: [0, hipY + 0.16, 0.01], s: [0.29, 0.2, 0.22] }));
  A(ball(14), obs, ob({ bone: BH.chest, p: [0, shY - 0.05, -0.03], s: [0.5, 0.17, 0.28] }));
  A(ball(12), obs, ob({ bone: BH.chest, p: [0, chestY + 0.24, -0.15], s: [0.34, 0.3, 0.2] }));
  // Wirbelsäule mit Zacken auf dem Rücken
  for (let k = 0; k < 4; k++) {
    A(ball(8), shade, { bone: BH.chest, p: [0, chestY - 0.05 + k * 0.13, -0.3 + Math.abs(k - 2) * 0.02], s: [0.06, 0.05, 0.05] });
    A(horn3(0.16 - k * 0.015, 0.04, 5), bone, { bone: BH.chest, p: [0, chestY - 0.03 + k * 0.13, -0.33], r: [-1.0, 0, 0], noShadow: true });
  }
  // Rippen vor der Brust, Brustbein, darin der grüne Seelenkern
  // je Seite ein Rippenbogen vom Rücken um die Flanke bis kurz vor das Brustbein, nach vorn abfallend
  for (let k = 0; k < 4; k++) {
    for (const a0 of [-Math.PI / 2 + 0.3, Math.PI / 2 + 0.16]) {
      A(torus3(0.38, 0.022, Math.PI - 0.46, 3, 12), k % 2 ? shade : bone, { bone: BH.chest, p: [0, chestY + 0.34 - k * 0.09, 0.0], r: [Math.PI / 2 + 0.28, 0, a0], s: [1.13 - k * 0.04, 0.86 - k * 0.02, 1] });
    }
  }
  A(roundBox(0.06, 0.3, 0.04, 0.015), bone, { bone: BH.chest, p: [0, chestY + 0.17, 0.335], r: [0.1, 0, 0] });
  A(ball(12), glow, { bone: BH.chest, p: [0, chestY + 0.17, 0.27], s: [0.11, 0.11, 0.08], mat: 'glow' });
  A(ball(8), '#e0ffe8', { bone: BH.chest, p: [0, chestY + 0.17, 0.33], s: [0.05, 0.05, 0.03], mat: 'glow' });
  A(ball(10), '#5ad890', { bone: BH.chest, p: [0, chestY + 0.17, 0.28], s: [0.22, 0.22, 0.13], mat: 'aura' });
  // glühende Risse im Obsidian
  crack(BH.chest, [-0.24, chestY + 0.02, 0.22], [0.2, 0, 0.5], 0.2);
  crack(BH.chest, [0.27, chestY + 0.26, 0.17], [0.3, 0, -0.7], 0.18);
  crack(BH.chest, [0.16, hipY + 0.13, 0.2], [0.2, 0, 0.9], 0.12);
  crack(BH.chest, [-0.12, chestY + 0.3, -0.28], [-0.2, 0, 0.6], 0.2);
  // Hals
  A(cyl3(0.12, 0.15, 0.14, 10), obs, ob({ bone: BH.chest, p: [0, neckY - 0.04, 0.03] }));
  // Schultern: Knochenplatten mit Zacken; Arme aus Obsidian mit Knochenschienen; riesige Fäuste
  for (const [sx, ab, hb] of [[1, BH.armL, BH.handL], [-1, BH.armR, BH.handR]]) {
    A(cap3(0.2, Math.PI * 0.5, 0, Math.PI * 2, 12, 5), bone, { bone: ab, p: [sx * (shX + 0.02), shY + 0.06, 0], s: [0.95, 0.5, 0.9], r: [0, 0, -sx * 0.35], top: '#f0e8d4', topK: 0.4 });
    A(torus3(0.2, 0.025, Math.PI * 2, 3, 16), shade, { bone: ab, p: [sx * (shX + 0.02), shY + 0.06, 0], r: [Math.PI / 2, -sx * 0.35, 0], s: [0.95, 0.9, 1] });
    for (let k = 0; k < 3; k++) A(horn3(0.22 - k * 0.04, 0.05, 5), k === 1 ? shade : bone, { bone: ab, p: [sx * (shX + 0.04 + k * 0.05), shY + 0.16 - k * 0.03, -0.08 + k * 0.08], r: [-0.25, 0, -sx * (0.25 + k * 0.3)], noShadow: true });
    const sh = [sx * shX, shY, 0];
    const el = [sx * (shX + 0.04), shY - 0.32, 0.02];
    const wr = [sx * (shX + 0.06), shY - armLen + 0.06, 0.04];
    limbBetween(A, sh, el, 0.14, 0.12, obs, ob({ bone: ab }));
    A(ball(10), bone, { bone: ab, p: [el[0] + sx * 0.02, el[1], el[2] - 0.08], s: [0.08, 0.08, 0.07] });
    limbBetween(A, el, wr, 0.12, 0.15, obs, ob({ bone: ab }));
    A(roundBox(0.06, 0.24, 0.16, 0.02), bone, { bone: ab, p: [sx * (shX + 0.17), shY - 0.46, 0.04], r: [0, 0, -sx * 0.05] });
    crack(ab, [sx * (shX + 0.1), shY - 0.15, 0.1], [0.3, 0, sx * 0.4], 0.14);
    const hand = [sx * (shX + 0.06), shY - armLen - 0.05, 0.06];
    A(roundBox(0.25, 0.23, 0.27, 0.07), obs, ob({ bone: hb, p: hand }));
    for (let k = 0; k < 4; k++) A(ball(8), bone, { bone: hb, p: [hand[0] - 0.08 + k * 0.055, hand[1] - 0.02, hand[2] + 0.13], s: [0.034, 0.04, 0.03] });
    crack(hb, [hand[0] + sx * 0.12, hand[1] + 0.02, hand[2]], [0, 0, 0.3], 0.12);
  }
  // Kopf: Obsidian unter einem Schädelhelm mit tiefen Augenhöhlen, grünen Augen, Zähnen und gebogenen Hörnern
  const hy = hc[1];
  const hz = hc[2];
  A(ball(12), obs, ob({ bone: BH.head, p: hc, s: [0.15, 0.15, 0.15] }));
  A(ball(14), bone, { bone: BH.head, p: [0, hy + 0.04, hz + 0.01], s: [0.18, 0.15, 0.19], top: '#f0e8d4', topK: 0.45 });
  A(roundBox(0.3, 0.06, 0.08, 0.025), bone, { bone: BH.head, p: [0, hy + 0.03, hz + 0.16], r: [0.15, 0, 0] });
  A(roundBox(0.2, 0.1, 0.12, 0.035), bone, { bone: BH.head, p: [0, hy - 0.07, hz + 0.13] });
  A(ball(8), '#14100c', { bone: BH.head, p: [0, hy - 0.04, hz + 0.2], s: [0.025, 0.02, 0.012], mat: 'face' });
  for (let k = -2; k <= 2; k++) A(roundBox(0.028, 0.045, 0.02, 0.008), '#f4eedc', { bone: BH.head, p: [k * 0.035, hy - 0.125, hz + 0.18 - Math.abs(k) * 0.01] });
  for (const sx of [-1, 1]) {
    A(ball(10), '#14100c', { bone: BH.head, p: [sx * 0.065, hy - 0.005, hz + 0.16], s: [0.045, 0.038, 0.03], mat: 'face' });
    A(ball(10), glow, { bone: BH.head, p: [sx * 0.065, hy - 0.005, hz + 0.18], s: [0.026, 0.022, 0.014], mat: 'glow' });
    A(ball(8), bone, { bone: BH.head, p: [sx * 0.14, hy + 0.07, hz - 0.01], s: [0.06, 0.05, 0.06] });
    A(tube3([[sx * 0.14, hy + 0.08, hz], [sx * 0.29, hy + 0.12, hz - 0.05], [sx * 0.39, hy + 0.25, hz - 0.01], [sx * 0.36, hy + 0.39, hz + 0.09]], 0.06, 0.008), '#2a2630', { bone: BH.head, shine: 0.7, top: '#4a4458', topK: 0.4 });
  }
  return { rig, height: 2.1, family: 'human', shY, hipY, shX, hc, hr: 0.17, style: 'slam', hunch: 0.1, blob: 0.75, scale: 1 };
}

// Flug der Knochendrachen (seit 13.94): schweben über dem Boden (eigener Knochen; Ring und Schatten bleiben unten),
// schlagen mit den Flügeln, legen die Beine an, wiegen sich und schauen zum Ziel
function dragonFly3(a, al, dt) {
  const B = a.bones;
  const t = game.time + (al.id || 0) * 0.37;
  const gs = (al.scale || 1) * a.model.scale;
  const f = Math.sin(t * 8);
  const hov = dragonHover(al) + (0.05 - f * 0.05) * (al.scale || 1);
  B[0].position.y += hov / gs;
  a.lift = hov;
  B[0].rotation.z = Math.sin(t * 1.7) * 0.08;
  B[BQ.body].rotation.x += Math.sin(t * 1.3) * 0.04 - (al.moving ? 0.12 : 0);
  B[BQ.wingL].rotation.z = 0.12 + f * 0.45;
  B[BQ.wingR].rotation.z = -0.12 - f * 0.45;
  for (const lb of [BQ.legFL, BQ.legFR, BQ.legBL, BQ.legBR]) B[lb].rotation.x = 0.8 + Math.sin(t * 2 + lb) * 0.08;
  B[BQ.tail].rotation.x = Math.sin(t * 2.2) * 0.12;
  const foe = al.target && !al.target.dead ? al.target : null;
  if (foe) {
    turnToward(a, Math.atan2(foe.x - al.x, foe.y - al.y), Math.min(1, dt * 8));
    a.group.rotation.y = a.heading;
  }
}

// Modellschlüssel der Diener ohne neue Zeichenketten je Bild: Skelett, Knochenhund, seit 13.94 Knochendrache,
// großer Knochendrache (Legendär) und Seelenkoloss (vorher Seelen- und Alphahund)
const ALLY_KEYS3 = ['ally:skelett', 'ally:hund', 'ally:drache', 'ally:drache:gross', 'ally:koloss'];
const allyKeyIndex3 = (al) => (al.kind === 'hund' ? 1 : al.kind === 'drache' ? (al.tier >= 3 ? 3 : 2) : al.kind === 'koloss' ? 4 : 0);
function allyBuild3(b, i) {
  if (i === 1) return boneHound3(b, { tier: 1, alpha: false });
  if (i === 2 || i === 3) return boneDragon3(b, i === 3);
  if (i === 4) return soulColossus3(b);
  return skeletonWarrior3(b);
}
// --- Modelle bauen, zwischenspeichern und als Figuren aufstellen ---------------------------------------

const MODELS3 = new Map();

// Monster (seit 14.26): Gesicht und Körper in einem Zeichenaufruf. Beide nutzen dasselbe Material; der Umriss zeichnet
// weiter nur den Körper – über eine zweite Geometrie mit denselben Daten auf der Grafikkarte und kürzerem Bereich.
// Nur, wenn das Modell ein Schattenmodell hat (dann wirft und empfängt der Körper wie das Gesicht keine Schatten).
function mergeFace3(b) {
  const L = b.lists;
  if (!L.lit || !L.face || !L.shadow) return -1;
  let n = 0;
  for (const it of L.lit) n += it.tpl ? it.tpl.idx.length : it.geo.index ? it.geo.index.count : it.geo.attributes.position.count;
  L.lit = L.lit.concat(L.face);
  delete L.face;
  return n;
}
function bodyGeo3(lit, n) {
  const g = new THREE.BufferGeometry();
  for (const k in lit.attributes) g.setAttribute(k, lit.attributes[k]);
  g.setIndex(lit.index);
  g.setDrawRange(0, n);
  g.boundingSphere = lit.boundingSphere && lit.boundingSphere.clone();
  g.boundingBox = lit.boundingBox && lit.boundingBox.clone();
  g.shared = true;
  return g;
}
function finishGeos3(geos, litN) {
  for (const k in geos) {
    geos[k].shared = true;
    // Maße merken, solange die Daten noch da sind (für das Figurenbild in Fenstern, seit 9.1)
    if (!geos[k].boundingBox) geos[k].computeBoundingBox();
    // Spielraum für Bewegungen, damit Figuren am Bildrand nicht zu früh weggeschnitten werden
    if (geos[k].boundingSphere) geos[k].boundingSphere.radius *= 1.5;
  }
  if (litN >= 0 && geos.lit) geos.outline = bodyGeo3(geos.lit, litN);
  return geos;
}

function model3(key, build) {
  let m = MODELS3.get(key);
  if (m) return m;
  const b = new Bake3(true);
  const info = build(b);
  if (!info) return null;
  const litN = key.startsWith('m:') ? mergeFace3(b) : -1;
  m = Object.assign({ geos: finishGeos3(b.build(), litN) }, info);
  m.scale = m.scale || 1;
  m.key = key;
  // seit 14.69: Grafikkontext, für den das Modell gebaut ist (die Daten liegen danach nur noch auf der Grafikkarte)
  m.gen = V3.ctxGen || 0;
  MODELS3.set(key, m);
  // Spielerfiguren mit alter Ausrüstung nicht ewig behalten
  if (MODELS3.size > 160) {
    const used = new Set();
    for (const a of actors3.values()) used.add(a.modelKey);
    // seit 14.69 auch die Figuren der Fensterbilder (Charakter, Schmied, Betrachten): ihr Modell freizugeben ließ das
    // nächste Bild dieser Figur an den geleerten Daten scheitern
    for (const a of portrait3.actors.values()) used.add(a.model.key);
    for (const [k, old] of MODELS3) {
      if (used.has(k) || k === key || k === 'warm' || k === 'warm:magier') continue;
      MODELS3.delete(k);
      dropPool(k);
      old.gone3 = true;
      for (const g in old.geos) old.geos[g].dispose();
      if (old.lods) for (const l of old.lods) if (l) for (const g in l.geos) l.geos[g].dispose();
      break;
    }
  }
  return m;
}

// Eine Figur aus einem Modell: eigenes Skelett, eigene Materialien (für Aufblitzen und Durchsicht)
function makeActor(model) {
  const group = new THREE.Group();
  const bones = model.rig.map(() => new THREE.Bone());
  model.rig.forEach((r, i) => {
    const pp = r.parent >= 0 ? model.rig[r.parent].pos : [0, 0, 0];
    bones[i].position.set(r.pos[0] - pp[0], r.pos[1] - pp[1], r.pos[2] - pp[2]);
    if (r.parent >= 0) bones[r.parent].add(bones[i]);
  });
  group.add(bones[0]);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const a = { group, bones, model, skeleton, mats: {}, meshes: {} };
  const add = (key, geo, mat) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton);
    group.add(m);
    a.meshes[key] = m;
    return m;
  };
  if (model.geos.lit) {
    a.mats.lit = figLitMat();
    const lit = add('lit', model.geos.lit, a.mats.lit);
    // Schatten wirft das grobe Schattenmodell (unsichtbar), nicht das volle Modell. Wer so ein Modell hat,
    // empfängt keine Schatten: sonst fielen die groben Kugeln als dunkle Flecken auf die eigene Figur.
    lit.castShadow = !model.geos.shadow;
    lit.receiveShadow = !model.geos.shadow;
    add('outline', model.geos.outline || model.geos.lit, figOutline());
  }
  if (model.geos.shadow) {
    const sh = add('shadow', model.geos.shadow, figShadowProxy());
    sh.castShadow = true;
    // seit 14.38: nur in der Schattenkarte zeichnen (eigene Ebene, v3RenderScene in drei-kern.js)
    sh.layers.set(SHADOW_LAYER3);
  }
  if (model.geos.face) add('face', model.geos.face, a.mats.lit || (a.mats.lit = figLitMat()));
  if (model.geos.glow) {
    a.mats.glow = figGlow().clone();
    add('glow', model.geos.glow, a.mats.glow);
  }
  if (model.geos.aura) add('aura', model.geos.aura, figAura());
  if (model.geos.wglow) {
    a.mats.wglow = figWeaponGlowMat();
    // seit 14.26 erst sichtbar, wenn die Waffe leuchtet (syncPlayer3): bei Monstern und Dienern bleibt das Leuchten aus,
    // vorher kostete es trotzdem je Figur einen Zeichenaufruf
    add('wglow', model.geos.wglow, a.mats.wglow).visible = false;
  }
  // nicht gebackene Teile (Portal-Wirbel, Schein, Funken) an die Knochen hängen
  if (model.extra) model.extra(a, bones);
  group.scale.setScalar(model.scale);
  // Weicher runder Schatten unter den Füßen (auch ohne echte Schatten)
  const blob = new THREE.Mesh(blobGeo(), blobMat());
  blob.scale.setScalar(model.blob || 0.5);
  blob.position.y = 0.02;
  blob.renderOrder = 2;
  group.add(blob);
  a.blob = blob;
  a.rest = bones.map((bn) => bn.position.clone());
  return a;
}

let blobTex = null;
function blobGeo() {
  return geo3('blob', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
}
function blobMat() {
  return mat3('blob', () => {
    if (!blobTex) {
      const c = newCanvas(64, 64);
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      blobTex = new THREE.CanvasTexture(c);
    }
    return new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  });
}

// Leuchtender Ring am Boden (Ziel, Boss-Schein)
let ringTex = null;
function groundRing(color, dashed) {
  if (!ringTex) {
    const c = newCanvas(128, 128);
    const x = c.getContext('2d');
    x.lineWidth = 9;
    x.strokeStyle = '#ffffff';
    x.setLineDash([22, 12]);
    x.beginPath();
    x.arc(64, 64, 52, 0, Math.PI * 2);
    x.stroke();
    ringTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(geo3('ringplane', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: dashed ? ringTex : null, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  if (!dashed) {
    m.geometry = geo3('glowdisc', () => new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2));
    m.material.opacity = 0.35;
  }
  m.renderOrder = 3;
  return m;
}

// --- Pool: Figuren wiederverwenden statt neu bauen ----------------------------------------------------

const actors3 = new Map();
const pool3 = new Map();
let poolSize3 = 0;
let targetRing3 = null;

function disposeActor(a) {
  for (const k in a.mats) a.mats[k].dispose();
  if (a.mark) a.mark.material.dispose();
  if (a.aura) {
    a.aura.material.dispose();
    a.aura = null;
  }
  a.skeleton.dispose();
}

function dropActor(key, a) {
  V3.actors.remove(a.group);
  actors3.delete(key);
  let list = pool3.get(a.modelKey);
  if (!list) pool3.set(a.modelKey, (list = []));
  if (list.length >= 16) {
    disposeActor(a);
    return;
  }
  list.push(a);
  poolSize3++;
  // Pool klein halten: die ältesten Einträge freigeben
  if (poolSize3 > 64) {
    for (const [k, l] of pool3) {
      if (!l.length) continue;
      disposeActor(l.shift());
      poolSize3--;
      if (!l.length) pool3.delete(k);
      if (poolSize3 <= 56) break;
    }
  }
}

function dropPool(modelKey) {
  const list = pool3.get(modelKey);
  if (!list) return;
  for (const a of list) disposeActor(a);
  poolSize3 -= list.length;
  pool3.delete(modelKey);
}

// Alle Figurenmodelle verwerfen; die Figuren bauen sich im nächsten Bild neu (seit 14.69). Nach dem Zurückkommen des
// Grafikkontexts (webglcontextrestored, drei-kern.js) muss alles neu auf die Grafikkarte – die Modelle haben ihre Daten
// nach dem ersten Hochladen aber freigegeben (freeArray). three.js scheiterte dann beim ersten Bild an der ersten
// Figur (array null → „BYTES_PER_ELEMENT“), die Spielschleife stand still – „das Spiel stürzt ab“.
function v3ResetFigures() {
  const drop = (a) => {
    if (a.group.parent) a.group.parent.remove(a.group);
    disposeActor(a);
  };
  for (const a of actors3.values()) drop(a);
  actors3.clear();
  for (const list of pool3.values()) for (const a of list) disposeActor(a);
  pool3.clear();
  poolSize3 = 0;
  for (const a of portrait3.actors.values()) drop(a);
  portrait3.actors.clear();
  for (const m of MODELS3.values()) {
    m.gone3 = true;
    for (const g in m.geos) m.geos[g].dispose();
    if (m.lods) for (const l of m.lods) if (l) for (const g in l.geos) l.geos[g].dispose();
  }
  MODELS3.clear();
  // Probefiguren (Shader vorab übersetzen) beim nächsten v3Prewarm neu
  V3.warm = null;
}

// Neue Monsterfiguren je Bild begrenzen (seit 14.26): tauchen 30 Monster auf einmal auf, wurden vorher alle in einem
// Bild gebaut – Skelett, Materialien, Shader-Prüfung beim ersten Zeichnen, dazu ggf. das ganze Modell. Das war der
// längste Hänger beim Ziehen vieler Monster. Jetzt höchstens NEW3_PER_FRAME je Bild (aus dem Vorrat zählt nicht), ein
// noch nicht gebautes Modell zählt wie alle; die übrigen folgen in den nächsten Bildern (sie kommen ohnehin meist vom
// Bildrand herein). Spieler, Diener, Händler und Gefallene sind davon ausgenommen.
const NEW3_PER_FRAME = 6;
let new3Left = NEW3_PER_FRAME;
function actorFor(key, modelKey, build, lazy) {
  let a = actors3.get(key);
  if (a && a.modelKey !== modelKey) {
    dropActor(key, a);
    a = null;
  }
  if (!a) {
    const list = pool3.get(modelKey);
    if (list && list.length) {
      a = list.pop();
      poolSize3--;
      // Zustand der wiederverwendeten Figur zurücksetzen
      a.heading = 0;
      a.lastX = null;
      a.refX = null;
      a.lastY = null;
      a.want = null;
      a.lift = 0;
      setActorAlpha(a, 1);
      if (a.mats.lit) a.mats.lit.emissive.setRGB(0, 0, 0);
      a.group.rotation.set(0, 0, 0);
      a.group.scale.setScalar(a.model.scale);
    } else {
      if (lazy) {
        const built = MODELS3.has(modelKey);
        if (new3Left <= 0 || (!built && new3Left < NEW3_PER_FRAME)) return null;
        new3Left -= built ? 1 : NEW3_PER_FRAME;
      }
      const model = model3(modelKey, build);
      if (!model) return null;
      a = makeActor(model);
      a.modelKey = modelKey;
      a.heading = 0;
      a.lastX = null;
      a.refX = null;
      a.lastY = null;
    }
    V3.actors.add(a.group);
    actors3.set(key, a);
  }
  a.seen = true;
  return a;
}

function entityKey(e) {
  if (!e.__k3) e.__k3 = 'e' + Math.random().toString(36).slice(2);
  return e.__k3;
}

// Kopfhöhe in Einheiten (für Namen und Lebensbalken)
function v3HeadHeight(e) {
  const a = e.__k3 && actors3.get(e.__k3);
  if (!a) return figureHeight(e) * U3 * 0.8;
  // auf dem Drachen (seit 14.27) sitzt man viel höher: Sattelhöhe minus dasselbe Maß wie beim Pferd
  const ride = !e.riding ? 0 : rideTierOf(e) === 3 && a.rideH3 ? a.rideH3 - 0.64 : 0.62;
  return a.model.height * a.group.scale.x + ride + (a.lift || 0);
}

function turnToward(a, target, k) {
  let d = target - a.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  a.heading += d * k;
}

// Modelle für Monster in der Nähe vorab bauen, solange das Bild ruhig läuft (eines je Aufruf)
let prewarmAt = 0;
// Alle Shader der Figuren einmal vorab übersetzen (Glühen, Aura, Waffenleuchten, Durchsichtigkeit).
// Sonst übersetzt der Browser sie erst, wenn sie zum ersten Mal im Kampf auftauchen – das ruckelt.
// Die Probefiguren bleiben erhalten (nicht im Bild), damit die Shader nie wieder freigegeben werden.
function warmPrograms() {
  V3.warm = [];
  const model = model3('warm', (b) => {
    for (const mat of ['lit', 'face', 'glow', 'aura', 'wglow']) b.add(sphere3(0.1, 6, 4), '#ffffff', { mat });
    return { rig: rigOf([[[0, 0, 0], -1]]), height: 0.2, family: 'human' };
  });
  for (const alpha of [1, 0.5]) {
    const a = makeActor(model);
    a.modelKey = 'warm';
    setActorAlpha(a, alpha);
    if (a.mats.wglow) a.mats.wglow.opacity = 0.5;
    // seit 14.74 eigener Shader (Flammenhülle): sichtbar schalten, sonst übersetzt compile ihn nicht vorab
    if (a.meshes.wglow) a.meshes.wglow.visible = true;
    V3.actors.add(a.group);
    V3.warm.push(a);
  }
  // Magier (seit 8.6) mit Weg 0 und Zepter: Skelett mit Drehknochen (Kristall, Funke) und Kristallschein mit übersetzen
  if (CLASSES.magier) try {
    const mm = model3('warm:magier', (b) => humanoid3(b, playerConfig3({ classId: 'magier', path: 0, look: null, equipment: null, buffs: [] })));
    const a = makeActor(mm);
    a.modelKey = 'warm:magier';
    V3.actors.add(a.group);
    V3.warm.push(a);
  } catch (err) {
    console.warn('3D-Vorwärmen Magier:', err);
  }
  const ring = groundRing(new THREE.Color(0xffffff), false);
  V3.actors.add(ring);
  // Erdbrocken und Felspfeiler (Sprungschlag, Felsenfaust) einmal mit übersetzen, danach in ihren Pool
  const rocks = typeof fx3Make === 'function' && FX3.group ? ['rock', 'rockcol'].map((k) => fx3Make(k)) : [];
  // Portal-Wirbel, Funken und Schein (seit 8.4): sonst ruckelt es, wenn sich der erste Riss öffnet
  const portal = portalWarm3();
  V3.actors.add(portal);
  V3.gl.compile(V3.scene, V3.camera);
  V3.actors.remove(portal);
  for (const o of rocks) {
    o.visible = false;
    (FX3.pools[o.userData.kind] || (FX3.pools[o.userData.kind] = [])).push(o);
  }
  for (const a of V3.warm) V3.actors.remove(a.group);
  V3.actors.remove(ring);
  V3.warm.push(ring);
}

function v3Prewarm() {
  if (!V3.warm && game.running && chunks3.size) warmPrograms();
  if (V3.time < prewarmAt) return;
  prewarmAt = V3.time + 0.25;
  const p = game.player;
  if (!p) return;
  for (const m of v3Monsters()) {
    if (m.isStone || Math.abs(m.x - p.x) > 1400 || Math.abs(m.y - p.y) > 1100) continue;
    const key = monModelKey3(m);
    const have = MODELS3.get(key);
    if (have) {
      // seit 14.26: danach die vereinfachten Modelle (eines je Aufruf)
      let lv = 0;
      for (let i = 1; i <= LOD3.length && !lv; i++) {
        const l = have.lods ? have.lods[i - 1] : undefined;
        if (l === undefined) lv = i;
        else if (!l) break;
      }
      if (lv) {
        modelLod3(have, lv);
        return;
      }
      continue;
    }
    model3(key, (b) => monsterBuild(b, m.typeId, m.__v3));
    return;
  }
  // Diener (seit 8.5): Skelettkrieger, Knochenhund, seit 13.94 Knochendrachen und Seelenkoloss, wenn man selbst beschwört
  // oder Mitspieler Diener haben
  let summoner = game.allies.length > 0 || classSkills(p).some((sk) => sk.type === 'summon');
  if (!summoner) for (const rp of net.players.values()) if (rp.allies && rp.allies.length) summoner = true;
  if (summoner) for (let i = 0; i < ALLY_KEYS3.length; i++) {
    if (MODELS3.has(ALLY_KEYS3[i])) continue;
    model3(ALLY_KEYS3[i], (b) => allyBuild3(b, i));
    return;
  }
}

// Varianten (seit 8.4): Arten mit mehreren Köpfen im Baukasten nehmen die Variante aus dem Startpunkt
// (wird im Netz übertragen, alle Spieler sehen dieselbe); nachgerufene Monster ohne Wiederkehr nehmen die
// Kennung des Hosts (ihr Startpunkt ist beim Mitspieler ein anderer). Bosse und Arten ohne Varianten behalten ein Modell
function monVariant3(m) {
  if (m.type && m.type.teufel) return m.hp < m.maxHp * 0.5 ? 1 : 0;
  const kit = HEADKIT3[m.typeId];
  if (!kit || kit.length < 2) return -1;
  let h = m.respawn === false || m.homeX == null ? m.id | 0 : Math.imul(Math.round(m.homeX) | 0, 73856093) ^ Math.imul(Math.round(m.homeY) | 0, 19349663);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) % kit.length;
}
const monKey3 = (typeId, v) => 'm:' + typeId + (v >= 0 ? '#' + v : '');
// Modellschlüssel eines Monsters, gemerkt, solange es am selben Startpunkt steht (keine neue Zeichenkette je Bild)
function monModelKey3(m) {
  if (m.__mk3 === undefined || m.__mkX !== m.homeX || m.__mkY !== m.homeY || m.__mkT !== m.typeId || (m.type && m.type.teufel && m.__v3 !== monVariant3(m))) {
    m.__mkX = m.homeX;
    m.__mkY = m.homeY;
    m.__mkT = m.typeId;
    m.__v3 = monVariant3(m);
    m.__mk3 = monKey3(m.typeId, m.__v3);
  }
  return m.__mk3;
}

function monsterBuild(b, typeId, v) {
  const r = buildMonster3(b, typeId, v > 0 ? v : 0);
  r.blob = r.family === 'beast' ? 0.5 : r.family === 'spider' ? 0.6 : 0.45;
  return r;
}

// --- Vereinfachte Monstermodelle (seit 14.26) ---------------------------------------------------------------
// Ein Monster, das im Bild klein ist, zeichnet ein zweites Modell aus genau denselben Teilen, Farben und Knochen,
// nur die kleinen Teile mit etwa halb so vielen Unterteilungen je Kugel, Ring und Röhre (GEO3_LOD, drei-kern.js;
// große Teile bleiben voll): rund 40 % weniger Dreiecke. In der normalen Ansicht ist ein Monster am PC nur gut 130 Bildpunkte hoch – die
// feinen Rundungen des vollen Modells (über 12.000 Dreiecke beim Ork, mit Umriss doppelt) sieht man dort nicht.
// Groß im Bild (Schulterblick nah, hohe Auflösung, Figurenbild in Fenstern) bleibt es beim vollen Modell.
// Gebaut wird das einfache Modell nebenbei beim Vorwärmen (v3Prewarm), nie mitten im Bild.
// Stufen: k = Anteil der Unterteilungen, px = Höhe im Bild (Bildpunkte der Zeichenfläche), unter der sie gilt.
// (Eine zweite, gröbere Stufe brachte kaum weniger Dreiecke, weil große Teile ohnehin voll bleiben – lodBig3.)
const LOD3 = [{ k: 0.5, px: 170 }];
const LOD3_KEYS = ['lit', 'outline', 'face', 'glow', 'aura', 'wglow'];
// Stufe i (1 oder 2) bauen; m.lods[i - 1] = { geos } oder null (nicht möglich)
function modelLod3(m, i) {
  const lods = m.lods || (m.lods = []);
  if (lods[i - 1] !== undefined) return lods[i - 1];
  lods[i - 1] = null;
  const mk = /^m:(.+?)(?:#(\d+))?$/.exec(m.key || '');
  if (!mk || !MONSTER_TYPES[mk[1]]) return null;
  GEO3_LOD = LOD3[i - 1].k;
  try {
    const b = new Bake3(true);
    const info = monsterBuild(b, mk[1], mk[2] ? +mk[2] : -1);
    const litN = m.geos.outline ? mergeFace3(b) : -1;
    // Schatten wirft weiter das grobe Schattenmodell des vollen Modells
    delete b.lists.shadow;
    const geos = finishGeos3(b.build(), litN);
    // nur, wenn es wirklich dasselbe Modell ist (gleiche Knochen, gleiche Teile)
    let ok = info && info.rig && info.rig.length === m.rig.length;
    for (const k of LOD3_KEYS) if (!m.geos[k] !== !geos[k]) ok = false;
    if (ok) lods[i - 1] = { geos };
    else for (const k in geos) geos[k].dispose();
  } catch (err) {
    console.warn('3D-Detailstufe:', err);
  } finally {
    GEO3_LOD = 1;
  }
  return lods[i - 1];
}
// Volles oder vereinfachtes Modell je nach Größe im Bild (mit etwas Spielraum, damit es an der Grenze nicht flackert)
function lodPick3(a) {
  const m = a.model;
  const cur = a.lodOn || 0;
  let want = 0;
  if (m.lods && m.lods[0]) {
    const cam = V3.camera;
    const d = cam.position.distanceTo(a.group.position) || 1;
    const px = ((m.height || 1.5) * a.group.scale.y * V3.gl.domElement.height) / (2 * d * Math.tan((cam.fov * Math.PI) / 360));
    for (let i = LOD3.length; i >= 1; i--) {
      if (m.lods[i - 1] && px < LOD3[i - 1].px * (cur >= i ? 1.15 : 1)) {
        want = i;
        break;
      }
    }
  }
  if (want === cur) return;
  a.lodOn = want;
  const G = want ? m.lods[want - 1].geos : m.geos;
  for (const k of LOD3_KEYS) {
    const mesh = a.meshes[k];
    if (!mesh) continue;
    const g = k === 'outline' ? G.outline || G.lit : G[k];
    if (g) mesh.geometry = g;
  }
}

// --- Wächter der eigenen Figur (seit 14.69) --------------------------------------------------------------
// Meldung „ab und zu sehe ich meinen Charakter nicht mehr“: Name, Lebensbalken und Questpfeil da, die Figur weg. Name und
// Balken hängen nur an Spielerstelle und Modellhöhe (drawOverlay3), die Figur an Lage, Drehung, Knochen und Modelldaten.
// Darum prüft jedes Bild die eigene Figur auf ungültige Werte (NaN/∞ in Lage, Drehung, Größe oder einem Knochen – dann
// zeichnet die Grafikkarte nichts) und darauf, dass sie an der Spielerstelle steht (scheitert der Abgleich mitten drin,
// blieb sie z. B. nach einem Weltentor am alten Ort zurück). Etwa jede Sekunde zusätzlich: hängt sie in der Szene, ist
// sie nicht ausgeblendet, ist ihr Modell noch gültig (nicht freigegeben, für den aktuellen Grafikkontext gebaut)?
// Behoben wird sofort (Grundhaltung, an die Spielerstelle, höchstens alle 5 s neu bauen), gemeldet je Art einmal.
const OWN3 = { at: 0, rebuildAt: -1e9, said: new Set() };
function ownSay3(what) {
  if (OWN3.said.has(what)) return;
  OWN3.said.add(what);
  console.warn('3D-Figur (eigene): ' + what + ' – behoben');
}
function figValid3(a, p, fy) {
  const g = a.group;
  const gp = g.position;
  const gr = g.rotation;
  if (!isFinite(gp.x + gp.y + gp.z + gr.x + gr.y + gr.z) || !(g.scale.x > 0.01 && g.scale.x < 100)) return false;
  if (Math.abs(gp.x - p.x * U3) > 0.5 || Math.abs(gp.z - fy * U3) > 0.5) return false;
  const B = a.bones;
  for (let i = 0; i < B.length; i++) {
    const q = B[i].quaternion;
    const s = B[i].position;
    const c = B[i].scale;
    if (!isFinite(q.x + q.y + q.z + q.w + s.x + s.y + s.z + c.x + c.y + c.z)) return false;
  }
  return true;
}
function ownGuard3(p, threw) {
  const key = p.__k3;
  const a = key ? actors3.get(key) : null;
  if (a) {
    const fy = feetY(p);
    if (threw || !figValid3(a, p, fy)) {
      if (p.facing && !(isFinite(p.facing.x) && isFinite(p.facing.y))) p.facing = { x: 0, y: 1 };
      if (!isFinite(a.heading)) a.heading = 0;
      const y = a.group.position.y;
      resetBones(a);
      a.lift = 0;
      a.group.rotation.set(0, a.heading, 0);
      a.group.scale.setScalar(a.model.scale);
      placeActor(a, p, fy, isFinite(y) && Math.abs(y) < 60 ? y : 0);
      a.group.visible = !(p.blinkHide > game.time);
      // auch wenn der Abgleich vor actorFor scheiterte: nicht in den Vorrat legen
      a.seen = true;
      ownSay3(threw ? 'Fehler beim Abgleich' : 'ungültige Werte oder falsche Lage');
    }
  }
  const now = performance.now();
  if (now - OWN3.at < 1000) return;
  OWN3.at = now;
  if (V3.actors.parent !== V3.scene) {
    V3.scene.add(V3.actors);
    ownSay3('Figurengruppe nicht in der Szene');
  }
  if (!V3.actors.visible) {
    V3.actors.visible = true;
    ownSay3('Figurengruppe ausgeblendet');
  }
  if (!a) {
    // kein Modell baubar: playerActor3 versucht es mit Ersatzmodellen weiter
    if (!threw) ownSay3('ohne Modell');
    return;
  }
  if (a.group.parent !== V3.actors) {
    V3.actors.add(a.group);
    ownSay3('nicht in der Szene');
  }
  const lit = a.meshes.lit;
  if (lit && !lit.visible) {
    lit.visible = true;
    ownSay3('Körper ausgeblendet');
  }
  if (a.mats.lit && !(a.mats.lit.visible !== false && a.mats.lit.opacity > 0.05)) {
    a.mats.lit.visible = true;
    a.alpha = null;
    setActorAlpha(a, 1);
    ownSay3('Körper durchsichtig');
  }
  const m = a.model;
  const pos = lit && lit.geometry && lit.geometry.attributes.position;
  if ((m.gone3 || (m.gen || 0) !== (V3.ctxGen || 0) || (lit && !(pos && pos.count))) && now - OWN3.rebuildAt > 5000) {
    // Modell freigegeben oder aus einem verlorenen Grafikkontext: Figur verwerfen, das nächste Bild baut sie neu
    OWN3.rebuildAt = now;
    V3.actors.remove(a.group);
    actors3.delete(key);
    disposeActor(a);
    if (MODELS3.get(a.modelKey) === m) MODELS3.delete(a.modelKey);
    dropPool(a.modelKey);
    ownSay3('Modell ungültig, neu gebaut');
  }
}

// --- Figuren mit dem Spielgeschehen abgleichen ----------------------------------------------------------

function v3SyncActors(dt) {
  for (const a of actors3.values()) a.seen = false;
  new3Left = NEW3_PER_FRAME;
  const w = game.world;
  // nur, was im Bild ist (feste Kamera: nach Norden sieht man weiter; Schulterblick: Kreis vor der Figur)
  const near = (e) => v3InView(e.x, e.y);
  const p = game.player;
  // Ein Fehler bei einer Figur darf die anderen (und die eigene) nicht mitreißen
  const safe = (fn, e) => {
    try { fn(e, dt); } catch (err) {
      if (!e.__err3) { e.__err3 = true; console.warn('3D-Figur:', err); }
      return false;
    }
    return true;
  };
  if (game.player && game.running && !p.dead) ownGuard3(p, !safe(syncPlayer3, p));
  if (V3.extra) for (const ep of V3.extra) safe(syncPlayer3, ep);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp) && near(rp)) safe(syncPlayer3, rp);
  for (const c of game.clones) if (near(c)) safe(syncPlayer3, c);
  // seit 14.26 nur die Monster der Gebiete in der Nähe (v3Monsters, drei-kern.js) statt aller der Welt
  for (const m of v3Monsters()) if (!m.dead && near(m)) syncMonster3(m, dt);
  for (const al of game.allies) if (near(al)) safe(syncAlly3, al);
  // Diener der Mitspieler (seit 8.5, Netzliste al)
  for (const rp of net.players.values()) if (rp.allies && !remoteHidden(rp)) for (const al of rp.allies) if (near(al)) safe(syncAlly3, al);
  if (w) for (const n of w.npcs) if (near(n)) syncNpc3(n, dt);
  // Zuerst verschwundene Figuren in den Pool, dann übernehmen die Gefallenen genau diese Figuren
  for (const [k, a] of actors3) if (!a.seen && !a.corpse) dropActor(k, a);
  for (const e of game.effects) if (e.type === 'corpse' && near(e)) syncCorpse3(e);
  for (const [k, a] of actors3) if (!a.seen) dropActor(k, a);
  // Zielring
  if (!targetRing3) {
    targetRing3 = groundRing(0xff4030, true);
    V3.scene.add(targetRing3);
  }
  const t = game.target && !game.target.dead ? game.target : null;
  targetRing3.visible = !!t;
  if (t) {
    const s = Math.max(0.55, (t.r || 12) * U3 * 1.6);
    targetRing3.position.set(t.x * U3, 0.04, feetY(t) * U3);
    targetRing3.scale.setScalar(s);
    targetRing3.rotation.y += dt * 1.4;
  }
  syncDuel3();
  v3Prewarm();
}

// --- Duellkreis in 3D: rote Lichtwand, die beim Countdown aus dem Boden wächst ---------------------
let duel3 = null;
function buildDuel3() {
  const R = DUEL.arena * U3;
  const g = new THREE.Group();
  // Wand: senkrechter Verlauf (unten kräftig, oben weg) mit hellen Streifen, die nach oben laufen
  const c = newCanvas(64, 128);
  const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255,90,60,0.95)');
  grad.addColorStop(0.35, 'rgba(255,50,40,0.45)');
  grad.addColorStop(1, 'rgba(255,40,30,0)');
  x.fillStyle = grad;
  x.fillRect(0, 0, 64, 128);
  x.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const lg = x.createLinearGradient(0, 128, 0, 0);
    lg.addColorStop(0, 'rgba(255,200,160,0.5)');
    lg.addColorStop(1, 'rgba(255,120,80,0)');
    x.fillStyle = lg;
    x.fillRect(k * 16 + 6, 0, 4, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(18, 1);
  // normale Mischung statt additiv: auf hellem Gras bliebe additives Rot sonst fast weiß
  const wallMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xff3a2a, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 3.2, 96, 1, true).translate(0, 1.6, 0), wallMat);
  wall.renderOrder = 4;
  g.add(wall);
  // Leuchtring und gestrichelter Innenring am Boden
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  // Boden innen leicht rot getönt, zum Rand hin kräftiger
  const fc = newCanvas(128, 128);
  const fx = fc.getContext('2d');
  const fg = fx.createRadialGradient(64, 64, 20, 64, 64, 64);
  fg.addColorStop(0, 'rgba(255,60,40,0)');
  fg.addColorStop(0.8, 'rgba(255,60,40,0.12)');
  fg.addColorStop(1, 'rgba(255,60,40,0.3)');
  fx.fillStyle = fg;
  fx.fillRect(0, 0, 128, 128);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false }));
  floor.position.y = 0.03;
  g.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.22, R + 0.12, 128).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.04;
  g.add(ring);
  const inner = new THREE.Mesh(new THREE.RingGeometry(R - 0.75, R - 0.62, 128, 1, 0, Math.PI * 2).rotateX(-Math.PI / 2), ringMat);
  inner.position.y = 0.04;
  g.add(inner);
  // Säulen ringsum mit glühender Spitze
  const postMat = new THREE.MeshBasicMaterial({ color: 0x3a2a2a });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xff6a4a });
  const post = new THREE.CylinderGeometry(0.16, 0.22, 1.3, 8).translate(0, 0.65, 0);
  const tip = new THREE.OctahedronGeometry(0.2, 0).translate(0, 1.55, 0);
  const tips = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const p1 = new THREE.Mesh(post, postMat);
    const t1 = new THREE.Mesh(tip, tipMat);
    for (const m of [p1, t1]) {
      m.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      g.add(m);
    }
    tips.push(t1);
  }
  V3.scene.add(g);
  return { g, wall, tex, ringMat, tips };
}

function syncDuel3() {
  const d = game.duel;
  if (!d) {
    if (duel3) duel3.g.visible = false;
    return;
  }
  if (!duel3) duel3 = buildDuel3();
  const t = game.time;
  duel3.g.visible = true;
  duel3.g.position.set(d.cx * U3, 0, d.cy * U3);
  const rise = Math.min(1, Math.max(0.05, 1 - (d.fightAt - t) / DUEL.countdown));
  duel3.wall.scale.y = rise * (0.92 + 0.08 * Math.sin(t * 3));
  duel3.tex.offset.x = t * 0.06;
  duel3.wall.material.opacity = 0.75 + 0.25 * Math.sin(t * 4);
  duel3.ringMat.opacity = 0.6 + 0.3 * Math.sin(t * 4);
  duel3.tips.forEach((m, k) => {
    m.rotation.y = t * 2 + k;
    m.position.y = Math.sin(t * 3 + k) * 0.08;
  });
}

function placeActor(a, e, fy, y = 0) {
  a.group.position.set(e.x * U3, y, fy * U3);
}

function resetBones(a) {
  const B = a.bones;
  for (let i = 0; i < B.length; i++) {
    B[i].rotation.set(0, 0, 0);
    B[i].position.copy(a.rest[i]);
    B[i].scale.set(1, 1, 1);
  }
  // Köpfe leicht zur Kamera geneigt, damit man die Gesichter sieht
  if (a.model.family === 'human') B[BH.head].rotation.x = -0.24;
}

// --- Eigene Animationen der Krieger-Attacken (seit 8.3) ------------------------------------------------
// sw läuft von 0 bis 1 über die Dauer der Pose. Arme und Beine werden fest gesetzt (überschreibt das Laufen),
// Hüfte relativ verschoben. Vorzeichen: arm.x negativ = nach vorn/oben (−2,7 über dem Kopf), leg.x negativ =
// Bein nach vorn, chest.rotation.y positiv = ausgeholt, negativ = durchgezogen; armL sitzt bei +x.
const poseSeg = (sw, a, b) => clamp01((sw - a) / (b - a));
const easeInOut3 = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// Streitaxt seit 13.46 einhändig geführt (wie die Axt, nur wuchtiger) – beidhändig nur Großschwert und Sense
const twoHanded3 = (kind) => kind === 'greatsword' || kind === 'scythe';
function setArm(bone, x, y, z) {
  bone.rotation.set(x, y, z);
}
// Leuchten der Waffe während einer Pose (wird nach Plus-Stufe und Aura angewendet, siehe syncPlayer3)
function poseWeaponGlow(a, color, op) {
  if (!a.poseWg || op > a.poseWg.op) a.poseWg = { color, op };
}

const SKILL_POSE3 = {
  // Sichelwelle: Ausholen, Querhieb, beidhändig hochreißen, in den Boden schmettern, halten, aufrichten
  sichel(B, sw, kind, p, a) {
    const two = twoHanded3(kind);
    const shield = p.equipment && p.equipment.schild && !isOffhand(p.equipment.schild);
    let w = 1;
    if (sw >= 0.8) w = 1 - easeInOut3(poseSeg(sw, 0.8, 1));
    if (sw < 0.15) {
      const k = easeOut(poseSeg(sw, 0, 0.15));
      B[BH.chest].rotation.y = 1.2 * k;
      B[BH.hips].rotation.y = 0.35 * k;
      setArm(B[BH.armR], -1.3 * k, 0, -0.9 * k);
      if (two) setArm(B[BH.armL], -1.04 * k, 0, 0.5);
      else if (shield) setArm(B[BH.armL], -1.0, 0, 0.3);
      else setArm(B[BH.armL], -0.6 * k, 0, 0.5 * k);
      B[BH.hips].position.y -= 0.05 * k;
      B[BH.legR].rotation.x = 0.2 * k;
      B[BH.legL].rotation.x = -0.15 * k;
    } else if (sw < 0.35) {
      const b = easeOut(poseSeg(sw, 0.15, 0.35));
      B[BH.chest].rotation.y = 1.2 - 2.35 * b;
      B[BH.hips].rotation.y = 0.35 - 0.7 * b;
      setArm(B[BH.armR], -1.45, 0, -0.9 + 0.7 * b);
      if (two) setArm(B[BH.armL], -1.16, 0, 0.5);
      else if (shield) setArm(B[BH.armL], -1.0, 0, 0.3);
      else setArm(B[BH.armL], -1.45, 0, 0.9 - 0.7 * b);
      B[BH.legR].rotation.x = 0.2 - 0.5 * b;
      B[BH.legL].rotation.x = -0.15;
      B[BH.cape].rotation.x = 0.35;
    } else if (sw < 0.58) {
      const c = easeInOut3(poseSeg(sw, 0.35, 0.58));
      setArm(B[BH.armR], -1.45 - 1.55 * c, 0, -0.2 + 0.05 * c);
      setArm(B[BH.armL], -0.6 - 2.1 * c, 0, 0.5 - 0.65 * c);
      B[BH.chest].rotation.y = -1.15 * (1 - c);
      B[BH.chest].rotation.x = -0.3 * c;
      B[BH.head].rotation.x += -0.15 * c;
      B[BH.legL].rotation.x = -0.3 * c;
      B[BH.legR].rotation.x = 0;
      poseWeaponGlow(a, '#e6eeff', 0.6 * c);
    } else {
      // Niederschlag (sehr schnell), dann halten und weich zurück
      const d = Math.pow(poseSeg(sw, 0.58, 0.65), 3);
      setArm(B[BH.armR], (-3.0 + 2.55 * d) * w, 0, -0.15 * w);
      setArm(B[BH.armL], (-2.7 + 2.1 * d) * w, 0, -0.15 * w);
      // seit 13.85 kippt das Handgelenk die Klinge nach unten in den Boden (vorher 0,5: die Klinge zeigte nach oben)
      B[BH.handR].rotation.x = Math.max(0.5, wristExt3(kind)) * d * (sw >= 0.8 ? 1 - easeInOut3(poseSeg(sw, 0.8, 0.9)) : 1);
      B[BH.chest].rotation.x = (-0.3 + 0.85 * d) * w;
      B[BH.hips].position.y -= 0.14 * d * w;
      B[BH.hips].position.z += 0.2 * d * w;
      B[BH.legL].rotation.x = (-0.3 - 0.45 * d) * w;
      B[BH.legR].rotation.x = 0.55 * d * w;
      B[BH.cape].rotation.x = 0.35 + 0.35 * d * w;
      if (sw < 0.7) poseWeaponGlow(a, '#e6eeff', 0.6);
    }
  },

  // Felsenfaust: Hopser, linke Faust über den Kopf, in den Boden rammen, halten, Aufwärtshaken, lösen
  felsenfaust(B, sw, kind, p, a) {
    const T = sw * 0.7;
    let w = 1;
    if (T >= 0.48) w = 1 - easeInOut3(poseSeg(T, 0.48, 0.7));
    if (T < 0.16) {
      const k = easeOut(T / 0.16);
      setArm(B[BH.armL], -2.9 * k, 0, 0.2 * k);
      setArm(B[BH.armR], 0.45 * k, 0, -0.5 * k);
      B[BH.chest].rotation.x = -0.28 * k;
      B[BH.chest].rotation.y = -0.35 * k;
      B[BH.head].rotation.x += -0.1 * k;
      B[BH.legL].rotation.x = -0.5 * k;
      B[BH.legR].rotation.x = 0.2 * k;
      return;
    }
    // Faustschlag (beschleunigt) und halten
    const b = Math.pow(poseSeg(T, 0.16, 0.2), 2);
    let armLx = -2.9 + 2.55 * b;
    let armLz = 0.2 - 0.15 * b;
    let chestX = -0.28 + 0.9 * b;
    let hipsDown = 0.17 * b;
    let legLx = -0.5 - 0.3 * b;
    let legRx = 0.2 + 0.45 * b;
    B[BH.chest].rotation.y = (-0.35 + 0.75 * b) * w;
    B[BH.hips].position.z += 0.08 * b * w;
    setArm(B[BH.armR], (0.45 + 0.2 * b) * w, 0, (-0.5 - 0.3 * b) * w);
    B[BH.cape].rotation.x = 0.12 + 0.6 * b * w;
    if (T >= 0.2 && T < 0.26) chestX += Math.sin(T * 90) * 0.03;
    if (T >= 0.31) {
      // Aufwärtshaken: die Faust reißt den Pfeiler hoch
      const u = easeOut(poseSeg(T, 0.31, 0.38));
      armLx = -0.35 - 2.45 * u;
      armLz = 0.05 + 0.25 * u;
      chestX = 0.62 - 0.9 * u;
      hipsDown = 0.17 * (1 - u) - 0.04 * u;
      legLx = -0.8 + 0.5 * u;
      legRx = 0.65 - 0.35 * u;
      B[BH.head].rotation.x += -0.2 * u * w;
      if (u > 0 && u < 1) a.poseEm = 0.25 * Math.sin(u * Math.PI);
    }
    setArm(B[BH.armL], armLx * w, 0, armLz * w);
    B[BH.chest].rotation.x = chestX * w;
    B[BH.hips].position.y -= hipsDown * w;
    B[BH.legL].rotation.x = legLx * w;
    B[BH.legR].rotation.x = legRx * w;
  },

  // Sprungschlag: Hocke, Steigen mit Schwert über dem Kopf, Scheitel, Sturz, Aufschlag und Heldenlandung
  sprung(B, sw, kind, p, a) {
    const T = sw * 0.8;
    const two = twoHanded3(kind);
    const k = clamp01((T - 0.1) / 0.45);
    if (T < 0.1) {
      const c = easeOut(T / 0.1);
      B[BH.hips].position.y -= 0.12 * c;
      B[BH.legL].rotation.x = -0.5 * c;
      B[BH.legR].rotation.x = 0.4 * c;
      B[BH.chest].rotation.x = 0.4 * c;
      setArm(B[BH.armR], 0.7 * c, 0, -0.3 * c);
      setArm(B[BH.armL], 0.6 * c, 0, 0.3 * c);
      B[BH.cape].rotation.x = 0.3;
    } else if (T < 0.55) {
      if (k < 0.6) {
        const q = easeOut(Math.min(1, k / 0.45));
        B[BH.legL].rotation.x = -0.5 - 0.75 * q;
        B[BH.legR].rotation.x = 0.4 - 0.75 * q;
        setArm(B[BH.armR], 0.7 - 3.7 * q, 0, -0.25);
        setArm(B[BH.armL], two ? (0.7 - 3.7 * q) * 0.9 : 0.6 - 3.0 * q, 0, 0.35);
        B[BH.chest].rotation.x = 0.4 - 0.75 * q;
        B[BH.head].rotation.x += -0.2 * q;
        B[BH.hips].position.y -= 0.12 * (1 - q);
        B[BH.root].rotation.x = -0.15 * q;
        B[BH.cape].rotation.x = 0.3 + 0.8 * q;
        if (k >= 0.45) poseWeaponGlow(a, '#e8dcc0', 0.5);
      } else {
        const f = Math.pow((k - 0.6) / 0.4, 2);
        setArm(B[BH.armR], -3.0 + 0.8 * f, 0, -0.25);
        setArm(B[BH.armL], two ? (-3.0 + 0.8 * f) * 0.9 : -2.4 + 1.4 * f, 0, 0.35 + 0.45 * f);
        B[BH.legL].rotation.x = -1.25 + 0.75 * f;
        B[BH.legR].rotation.x = -0.35 + 0.7 * f;
        B[BH.chest].rotation.x = -0.35 + 0.55 * f;
        B[BH.root].rotation.x = -0.15 + 0.4 * f;
        B[BH.cape].rotation.x = 1.1 + 0.3 * f;
      }
    } else {
      // Aufschlag (in 0,04 s), Heldenlandung, ab 0,64 s weich zurück
      const i = Math.min(1, (T - 0.55) / 0.04);
      const w = T >= 0.64 ? 1 - easeInOut3(poseSeg(T, 0.64, 0.8)) : 1;
      setArm(B[BH.armR], (-2.2 + 1.9 * i) * w, 0, -0.25 * w);
      // seit 13.85: Klinge beim Aufschlag nach vorn unten in den Boden (vorher 0,8: sie zeigte schräg nach oben)
      B[BH.handR].rotation.x = Math.max(0.8, wristExt3(kind)) * i * (T >= 0.64 ? 1 - easeInOut3(poseSeg(T, 0.64, 0.72)) : 1);
      if (two) setArm(B[BH.armL], -0.5 * w, 0, -0.3 * w);
      else setArm(B[BH.armL], -0.4 * w, 0, 1.0 * w);
      B[BH.hips].position.y -= 0.24 * w;
      B[BH.hips].position.z += 0.08 * w;
      B[BH.legL].rotation.x = -1.0 * w;
      B[BH.legR].rotation.x = 0.95 * w;
      B[BH.chest].rotation.x = 0.6 * w;
      B[BH.head].rotation.x += -0.1 * w;
      if (T < 0.6) B[BH.hips].scale.set(1.08, 0.88, 1.08);
      else if (T < 0.64) B[BH.hips].scale.set(0.97, 1.04, 0.97);
    }
  },

  // --- Nekromant, Weg der Seelen (seit 8.5) ---
  // Schädelsalve (0,4 s): Stab an die Schulter zurück, nach vorn stoßen (die Schädel verlassen den Stab),
  // freie Hand fächert seitlich aus, Oberkörper leicht vor; zurück
  salve(B, sw, kind, p, a) {
    const T = sw * 0.4;
    if (T < 0.12) {
      const k = easeOut(T / 0.12);
      setArm(B[BH.armR], 0.5 * k, 0, -0.35 * k);
      setArm(B[BH.armL], -0.3 * k, 0, 0.3 * k);
      B[BH.chest].rotation.y = 0.4 * k;
      B[BH.legR].rotation.x = 0.15 * k;
      return;
    }
    const w = T < 0.25 ? 1 : 1 - easeInOut3(poseSeg(T, 0.25, 0.4));
    const b = easeOut(poseSeg(T, 0.12, 0.2));
    setArm(B[BH.armR], (0.5 - 2.05 * b) * w, 0, -0.35 * (1 - b) * w);
    // seit 13.85: der Stabkopf zeigt beim Stoß nach vorn zum Ziel (vorher über die Schulter nach hinten)
    B[BH.handR].rotation.x = 0.85 * wristExt3(kind) * b * w;
    setArm(B[BH.armL], -0.3 * w, 0, (0.3 + 1.0 * b) * w);
    B[BH.chest].rotation.y = (0.4 - 0.7 * b) * w;
    B[BH.chest].rotation.x = 0.17 * b * w;
    B[BH.legR].rotation.x = (0.15 - 0.35 * b) * w;
    B[BH.legL].rotation.x = 0.2 * b * w;
    poseWeaponGlow(a, '#a7e37f', 0.7 * b * w);
  },

  // Seelenkäfig (0,55 s): Stab mit beiden Händen über den Kopf, Stabfuß in Richtung Zielort in den Boden rammen,
  // halten, zurück
  kaefig(B, sw, kind, p, a) {
    const T = sw * 0.55;
    if (T < 0.2) {
      const k = easeOut(T / 0.2);
      setArm(B[BH.armR], -2.7 * k, 0, -0.15 * k);
      setArm(B[BH.armL], -2.6 * k, 0, 0.15 * k);
      B[BH.chest].rotation.x = -0.15 * k;
      B[BH.head].rotation.x += -0.12 * k;
      B[BH.legL].rotation.x = -0.25 * k;
      return;
    }
    const w = T < 0.45 ? 1 : 1 - easeInOut3(poseSeg(T, 0.45, 0.55));
    const d = Math.pow(poseSeg(T, 0.2, 0.3), 2);
    setArm(B[BH.armR], (-2.7 + 2.1 * d) * w, 0, -0.15 * w);
    setArm(B[BH.armL], (-2.6 + 1.9 * d) * w, 0, 0.15 * (1 - d) * w);
    B[BH.chest].rotation.x = (-0.15 + 0.5 * d) * w;
    B[BH.hips].position.y -= 0.06 * d * w;
    B[BH.legL].rotation.x = (-0.25 - 0.2 * d) * w;
    B[BH.legR].rotation.x = 0.3 * d * w;
    if (T >= 0.3 && T < 0.36) B[BH.chest].rotation.x += Math.sin(T * 90) * 0.03;
    poseWeaponGlow(a, '#7fe3a0', 0.6 * d * w);
  },

  // Seelenschnitter (0,75 s): Stab mit beiden Armen über den Kopf, Rücken gebogen; Arme schwingen im Takt der Sense
  // von rechts nach links; zurück. Passt für Stab und Sense.
  schnitter(B, sw, kind, p, a) {
    const T = sw * 0.75;
    if (T < 0.35) {
      const k = easeOut(T / 0.35);
      setArm(B[BH.armR], -2.8 * k, 0, -0.2 * k);
      setArm(B[BH.armL], -2.7 * k, 0, 0.2 * k);
      B[BH.chest].rotation.x = -0.3 * k;
      B[BH.chest].rotation.y = 0.6 * k;
      B[BH.head].rotation.x += -0.15 * k;
      B[BH.legR].rotation.x = 0.2 * k;
      poseWeaponGlow(a, '#a774e0', 0.5 * k);
      return;
    }
    const w = T < 0.5 ? 1 : 1 - easeInOut3(poseSeg(T, 0.5, 0.75));
    const s = easeOut(poseSeg(T, 0.35, 0.5));
    setArm(B[BH.armR], (-2.8 + 1.4 * s) * w, 0, -0.2 * w);
    setArm(B[BH.armL], (-2.7 + 1.4 * s) * w, 0, 0.2 * w);
    B[BH.chest].rotation.x = (-0.3 + 0.45 * s) * w;
    B[BH.chest].rotation.y = (0.6 - 1.5 * s) * w;
    B[BH.hips].rotation.y = -0.3 * s * w;
    B[BH.legR].rotation.x = (0.2 - 0.4 * s) * w;
    B[BH.legL].rotation.x = 0.25 * s * w;
    poseWeaponGlow(a, '#a7e37f', 0.7 * (1 - s * 0.5) * w);
  }
};

// Spieler: Laufen, Schlagen, Zaubern, Pose, Wirbel, Sprung, Reiten, Treffer, Aufleuchten
// --- Grundangriffe (seit 9.3) --------------------------------------------------------------------------
// Schlüsselposen je Waffe und Kombo-Schlag: [Zeit 0…1, Pose, Übergang]. Übergang 'in' beschleunigt (der Schlag),
// 'out' bremst (Ausholen, Durchziehen), sonst weich. Kanäle (fehlend = 0):
//   hy Hüfte drehen, hpy/hpz Hüfte heben/vor, cx/cy/cz Oberkörper beugen/drehen/kippen, hx Kopf,
//   rx/ry/rz rechter Arm, lx/ly/lz linker Arm, wx/wz rechtes Handgelenk, wl linkes Handgelenk (seit 13.85),
//   gl/gr Beine, sy ganze Figur drehen.
// Arme: rx −1,5 = waagerecht nach vorn, −2,7 = über dem Kopf; rz < 0 rechter Arm nach außen, > 0 quer vor den Körper
// (linker Arm umgekehrt). Oberkörper cy > 0 dreht nach links. Zweihänder (two) führen den linken Arm am Griff mit.
const N3 = { rz: -0.08, lz: 0.08 };
// Ruhehaltung mit Glocke (wie BELL_ARM3/BELL_HANG3), damit der Angriff ohne Sprung beginnt und endet
const BELL_N3 = { rx: -0.8, rz: -0.16, lz: 0.08, wx: -1.2 };
const BASIC3 = {
  sword: [
    [[0, N3], [0.34, { cy: -0.55, cx: -0.12, hy: -0.25, rx: -2.6, rz: -0.55, lx: -1.1, lz: 0.25, gr: 0.2, gl: -0.15, wx: 0.7 }, 'out'],
      [0.42, { cy: 0.5, cx: 0.2, hy: 0.25, rx: -1.0, rz: 0.6, lx: -1.2, lz: 0.2, gr: -0.35, gl: 0.3, hpz: 0.08, hpy: -0.04, wx: 2.3 }, 'in'],
      [0.66, { cy: 0.62, cx: 0.24, hy: 0.3, rx: -0.55, rz: 0.75, lx: -1.0, lz: 0.2, gr: -0.3, gl: 0.25, hpz: 0.06, hpy: -0.04, wx: 2.4 }, 'out'], [1, N3]],
    [[0, N3], [0.32, { cy: 0.6, cx: 0.15, hy: 0.25, rx: -0.75, rz: 0.85, lx: -0.9, lz: 0.35, gl: -0.2, gr: 0.15, hpy: -0.03, wx: 2.2 }, 'out'],
      [0.42, { cy: -0.45, cx: -0.1, hy: -0.2, rx: -2.3, rz: -0.55, lx: -1.15, lz: 0.25, gl: 0.3, gr: -0.25, hpz: 0.06, wx: 1.4 }, 'in'],
      [0.66, { cy: -0.6, cx: -0.12, hy: -0.25, rx: -2.55, rz: -0.7, lx: -1.0, lz: 0.25, gl: 0.25, gr: -0.2, hpz: 0.05, wx: 1.2 }, 'out'], [1, N3]],
    [[0, N3], [0.32, { cy: -0.45, hy: -0.2, cx: -0.08, rx: -0.5, rz: -0.2, lx: -1.3, lz: 0.2, hpz: -0.06, gr: 0.25, gl: -0.1, wx: 1.55 }, 'out'],
      [0.42, { cy: 0.2, hy: 0.1, cx: 0.22, rx: -1.62, rz: 0.05, lx: -1.5, lz: 0.05, hpz: 0.26, hpy: -0.07, gr: -0.75, gl: 0.5, wx: 2.75 }, 'in'],
      [0.68, { cy: 0.22, hy: 0.1, cx: 0.2, rx: -1.55, rz: 0.05, lx: -1.35, lz: 0.1, hpz: 0.22, hpy: -0.06, gr: -0.65, gl: 0.45, wx: 2.7 }, 'out'], [1, N3]]
  ],
  // Axt (seit 13.48): nur Hiebe nach vorn – senkrecht von oben, schräg von der Schulter, wuchtig mit Ausfallschritt
  axe: [
    [[0, N3], [0.36, { rx: -2.95, rz: -0.15, cx: -0.25, cy: -0.2, lx: -0.6, lz: 0.4, hpy: 0.02, gr: 0.15, wx: 0.8 }, 'out'],
      [0.45, { rx: -0.7, rz: 0.15, cx: 0.35, cy: 0.15, hpy: -0.08, hpz: 0.08, gr: -0.35, gl: 0.3, lx: -0.9, lz: 0.3, wx: 1.6 }, 'in'],
      [0.68, { rx: -0.45, rz: 0.2, cx: 0.3, cy: 0.15, hpy: -0.07, hpz: 0.07, gr: -0.3, gl: 0.25, lx: -0.7, lz: 0.3, wx: 1.7 }, 'out'], [1, N3]],
    [[0, N3], [0.34, { rx: -2.6, rz: -0.65, cy: -0.4, cx: -0.15, hy: -0.18, lx: -0.6, lz: 0.4, gr: 0.15, gl: -0.1, wx: 0.7 }, 'out'],
      [0.45, { rx: -0.65, rz: 0.4, cy: 0.32, cx: 0.32, hy: 0.15, hpy: -0.06, hpz: 0.08, gr: -0.35, gl: 0.3, lx: -0.9, lz: 0.3, wx: 1.6 }, 'in'],
      [0.68, { rx: -0.5, rz: 0.45, cy: 0.36, cx: 0.28, hy: 0.16, hpy: -0.05, hpz: 0.07, gr: -0.3, gl: 0.25, lx: -0.75, lz: 0.3, wx: 1.7 }, 'out'], [1, N3]],
    // seit 13.85 trifft der Hieb zur Trefferzeit (0,45 statt 0,5: vorher kam der Schaden, als die Axt noch oben war)
    [[0, N3], [0.36, { rx: -3.05, rz: -0.05, cx: -0.32, hpy: 0.06, gr: 0.2, gl: -0.1, lx: -1.8, lz: 0.45, wx: 0.9 }, 'out'],
      [0.46, { rx: -0.4, rz: 0.05, cx: 0.55, hpy: -0.14, hpz: 0.12, gr: -0.6, gl: 0.45, lx: -0.6, lz: 0.5, wx: 1.6 }, 'in'],
      [0.72, { rx: -0.35, rz: 0.05, cx: 0.5, hpy: -0.12, hpz: 0.1, gr: -0.5, gl: 0.4, lx: -0.55, lz: 0.5, wx: 1.6 }, 'out'], [1, N3]]
  ],
  greatsword: [
    [[0, N3], [0.38, { cy: -0.95, hy: -0.45, cx: -0.05, rx: -1.35, rz: -1.0, gr: 0.3, gl: -0.2, hpy: -0.03, two: 1, wx: 1.8 }, 'out'],
      [0.5, { cy: 0.75, hy: 0.4, rx: -1.35, rz: 0.75, gr: -0.4, gl: 0.35, hpz: 0.08, hpy: -0.06, two: 1, wx: 2.4 }, 'in'],
      [0.72, { cy: 0.95, hy: 0.5, rx: -1.2, rz: 0.9, gr: -0.35, gl: 0.3, hpz: 0.07, hpy: -0.05, two: 1, wx: 2.4 }, 'out'], [1, N3]],
    [[0, N3], [0.36, { cy: 0.8, hy: 0.35, cx: -0.1, rx: -2.3, rz: 0.6, gl: 0.2, gr: -0.1, two: 1, wx: 0.9 }, 'out'],
      [0.5, { cy: -0.6, hy: -0.3, cx: 0.2, rx: -0.9, rz: -0.7, hpy: -0.06, hpz: 0.06, gl: -0.3, gr: 0.35, two: 1, wx: 2.3 }, 'in'],
      [0.72, { cy: -0.75, hy: -0.35, cx: 0.22, rx: -0.7, rz: -0.8, hpy: -0.05, gl: -0.25, gr: 0.3, two: 1, wx: 2.4 }, 'out'], [1, N3]],
    [[0, N3], [0.38, { rx: -3.0, rz: -0.1, cx: -0.3, hpy: 0.12, gr: -0.4, gl: 0.2, two: 1, wx: 0.8 }, 'out'],
      [0.48, { rx: -0.55, rz: 0.05, cx: 0.5, hpy: -0.12, hpz: 0.12, gr: -0.6, gl: 0.45, two: 1, wx: 1.7 }, 'in'],
      [0.74, { rx: -0.5, rz: 0.05, cx: 0.45, hpy: -0.1, hpz: 0.1, gr: -0.5, gl: 0.4, two: 1, wx: 1.8 }, 'out'], [1, N3]]
  ],
  greataxe: [
    [[0, N3], [0.4, { cy: 0.7, hy: 0.3, cx: -0.15, rx: -2.6, rz: 0.4, gl: 0.2, two: 1, wx: 0.8 }, 'out'],
      [0.52, { cy: -0.5, hy: -0.25, cx: 0.35, rx: -0.7, rz: -0.55, hpy: -0.1, hpz: 0.08, gl: -0.35, gr: 0.4, two: 1, wx: 1.6 }, 'in'],
      [0.74, { cy: -0.6, hy: -0.3, cx: 0.32, rx: -0.55, rz: -0.6, hpy: -0.09, gl: -0.3, gr: 0.35, two: 1, wx: 1.7 }, 'out'], [1, N3]],
    // schräger Hieb von der Schulter nach vorn (seit 13.48 statt des Wirbels zur Seite)
    [[0, N3], [0.4, { cy: -0.5, hy: -0.22, cx: -0.18, rx: -2.7, rz: -0.6, gr: 0.2, two: 1, wx: 0.8 }, 'out'],
      [0.52, { cy: 0.38, hy: 0.18, cx: 0.4, rx: -0.6, rz: 0.4, hpy: -0.1, hpz: 0.09, gr: -0.45, gl: 0.35, two: 1, wx: 1.6 }, 'in'],
      [0.74, { cy: 0.42, hy: 0.2, cx: 0.36, rx: -0.5, rz: 0.45, hpy: -0.09, hpz: 0.08, gr: -0.4, gl: 0.3, two: 1, wx: 1.7 }, 'out'], [1, N3]],
    // seit 13.85 eher unten (0,4/0,5 statt 0,42/0,54), damit die Axt zur Trefferzeit (0,52) vorn ist
    [[0, N3], [0.4, { rx: -3.05, rz: -0.05, cx: -0.35, hpy: 0.08, gr: 0.2, gl: -0.1, two: 1, wx: 0.9 }, 'out'],
      [0.5, { rx: -0.45, rz: 0.05, cx: 0.65, hpy: -0.16, hpz: 0.1, gr: -0.55, gl: 0.5, two: 1, wx: 1.6 }, 'in'],
      [0.78, { rx: -0.4, rz: 0.05, cx: 0.6, hpy: -0.15, hpz: 0.09, gr: -0.5, gl: 0.45, two: 1, wx: 1.6 }, 'out'], [1, N3]]
  ],
  // Dolche (seit 13.36): Kombo aus vier Schlägen statt Doppelstichen – rechter Querschnitt, linker Rückhandschnitt,
  // Wirbel mit beiden Klingen weit ausgestreckt, zum Schluss Sprung nach vorn mit Kreuzschnitt von oben (X).
  // Die Klingen schneiden in flachen Bögen, der Oberkörper dreht kräftig mit, die Füße setzen nach.
  dagger: [
    [[0, N3], [0.12, { rx: -1.35, rz: -1.0, cy: -0.35, hy: -0.15, lx: -0.9, lz: 0.35, gr: 0.15 }, 'out'],
      [0.32, { rx: -1.45, rz: 0.75, cy: 0.32, hy: 0.12, cx: 0.12, hpz: 0.08, lx: -0.8, lz: 0.4, gr: -0.4, gl: 0.15 }, 'in'],
      [0.55, { rx: -1.3, rz: 0.85, cy: 0.36, hy: 0.14, cx: 0.1, hpz: 0.06, lx: -0.85, lz: 0.35, gr: -0.3, gl: 0.1 }, 'out'], [0.85, N3]],
    [[0, N3], [0.12, { lx: -1.35, lz: 1.0, cy: 0.35, hy: 0.15, rx: -0.9, rz: -0.35, gl: 0.15 }, 'out'],
      [0.32, { lx: -1.45, lz: -0.75, cy: -0.32, hy: -0.12, cx: 0.12, hpz: 0.08, rx: -0.8, rz: -0.4, gl: -0.4, gr: 0.15 }, 'in'],
      [0.55, { lx: -1.3, lz: -0.85, cy: -0.36, hy: -0.14, cx: 0.1, hpz: 0.06, rx: -0.85, rz: -0.35, gl: -0.3, gr: 0.1 }, 'out'], [0.85, N3]],
    // Wirbel: einmal ganz herum, beide Klingen weit draußen
    [[0, N3], [0.1, { rx: -1.4, rz: -1.2, lx: -1.4, lz: 1.2, cx: 0.1, hpy: -0.05, gr: 0.15 }, 'out'],
      [0.62, { sy: Math.PI * 2, rx: -1.5, rz: -1.3, lx: -1.5, lz: 1.3, cx: 0.12, hpy: -0.07, gr: -0.2, gl: 0.2 }],
      [0.78, { sy: Math.PI * 2, rx: -1.2, rz: -0.5, lx: -1.2, lz: 0.5, hpy: -0.03 }, 'out'], [1, { sy: Math.PI * 2, ...N3 }]],
    // Abschluss: beide Klingen hoch, Satz nach vorn, Kreuzschnitt nach unten
    [[0, N3], [0.14, { rx: -2.6, rz: -0.55, lx: -2.6, lz: 0.55, cx: -0.18, hpy: 0.06, gr: 0.2, gl: -0.1 }, 'out'],
      [0.34, { rx: -1.1, rz: 0.6, lx: -1.1, lz: -0.6, cx: 0.35, hpz: 0.16, hpy: -0.08, gr: -0.6, gl: 0.35 }, 'in'],
      [0.6, { rx: -1.0, rz: 0.65, lx: -1.0, lz: -0.65, cx: 0.3, hpz: 0.13, hpy: -0.07, gr: -0.5, gl: 0.3 }, 'out'], [0.9, N3]]
  ],
  scythe: [
    [[0, N3], [0.38, { cy: -0.9, hy: -0.4, cx: 0.15, rx: -1.0, rz: -1.15, hpy: -0.05, gr: 0.25, two: 1, wx: 1.9 }, 'out'],
      [0.5, { cy: 0.85, hy: 0.4, cx: 0.2, rx: -1.0, rz: 0.85, hpy: -0.08, gr: -0.35, gl: 0.3, hpz: 0.06, two: 1, wx: 2.3 }, 'in'],
      [0.72, { cy: 1.0, hy: 0.45, cx: 0.18, rx: -0.9, rz: 0.95, hpy: -0.07, gr: -0.3, gl: 0.25, two: 1, wx: 2.3 }, 'out'], [1, N3]],
    [[0, N3], [0.38, { cy: 0.85, hy: 0.4, cx: 0.15, rx: -1.0, rz: 0.8, hpy: -0.05, gl: 0.25, two: 1, wx: 1.9 }, 'out'],
      [0.5, { cy: -0.85, hy: -0.4, cx: 0.2, rx: -1.0, rz: -1.1, hpy: -0.08, gl: -0.35, gr: 0.3, hpz: 0.06, two: 1, wx: 2.3 }, 'in'],
      [0.72, { cy: -1.0, hy: -0.45, cx: 0.18, rx: -0.9, rz: -1.15, hpy: -0.07, gl: -0.3, gr: 0.25, two: 1, wx: 2.3 }, 'out'], [1, N3]],
    [[0, N3], [0.38, { rx: -2.9, rz: -0.3, cx: -0.25, hpy: 0.03, gr: 0.2, two: 1, wx: 1.0 }, 'out'],
      [0.48, { rx: -0.6, rz: 0.2, cx: 0.45, hpy: -0.1, hpz: 0.1, gr: -0.5, gl: 0.4, two: 1, wx: 2.1 }, 'in'],
      [0.74, { rx: -0.5, rz: 0.25, cx: 0.4, hpy: -0.09, hpz: 0.09, gr: -0.45, gl: 0.35, two: 1, wx: 2.2 }, 'out'], [1, N3]]
  ],
  // Fernkampf: ein Ablauf je Waffe (Bogen in der rechten Hand, die linke zieht die Sehne)
  // seit 13.59 echte Schützenhaltung: Bogen heben und senkrecht aufs Ziel richten (wx), die Zughand holt den Pfeil vor
  // dem Körper ab und zieht ihn bis an die Wange (lz nach innen statt seitlich weg), Schuss bei 0,58 (BASIC_TIMING),
  // danach fliegt die Zughand ein Stück zurück und die Haltung bleibt kurz stehen
  bow: [[[0, N3], [0.2, { rx: -1.55, wx: 1.45, lx: -1.6, lz: -0.5, cy: 0.1, gr: 0.1 }, 'out'],
    [0.5, { rx: -1.75, wx: 1.5, lx: -1.85, lz: -0.9, cy: 0.05, hx: -0.04, gr: 0.12 }],
    [0.58, { rx: -1.76, wx: 1.5, lx: -1.88, lz: -0.95, hx: -0.04, gr: 0.12 }],
    [0.66, { rx: -1.7, wx: 1.5, lx: -1.4, lz: -1.25, hx: -0.04, gr: 0.12 }, 'out'],
    [0.86, { rx: -1.66, wx: 1.48, lx: -1.35, lz: -1.2, gr: 0.08 }], [1, N3]]],
  fan: [[[0, N3], [0.3, { rx: -1.2, rz: -0.9, cy: -0.5, hy: -0.2, wz: 0.6, lx: -0.5, lz: 0.4, wx: 1.0 }, 'out'],
    [0.45, { rx: -1.45, rz: 0.75, cy: 0.45, hy: 0.2, wz: -0.6, hpz: 0.06, gr: -0.25, gl: 0.2, lx: -0.7, lz: 0.6, wx: 1.4 }, 'in'],
    [0.7, { rx: -1.35, rz: 0.95, cy: 0.55, hy: 0.25, wz: -0.7, hpz: 0.05, gr: -0.2, gl: 0.15, lx: -0.6, lz: 0.7, wx: 1.4 }, 'out'], [1, N3]]],
  // Glocke (seit 13.28): hoch heben und läuten (Hand pendelt, die Glocke bleibt dabei hängend), dann nach vorn schwingen
  bell: [[[0, BELL_N3], [0.2, { rx: -2.3, rz: -0.2, cx: -0.08, lx: -0.4, lz: 0.3, wx: 0.3 }, 'out'], [0.3, { rx: -2.35, rz: -0.45, cx: -0.08, wx: 0.75 }],
    [0.4, { rx: -2.3, rz: 0.05, cx: -0.08, wx: -0.15 }], [0.55, { rx: -1.5, rz: 0.1, cx: 0.15, hpz: 0.06, gr: -0.25, lx: -1.0, lz: 0.2, wx: -0.5 }, 'in'],
    [0.75, { rx: -1.3, rz: 0.1, cx: 0.12, hpz: 0.05, gr: -0.2, lx: -0.9, lz: 0.2, wx: -0.7 }, 'out'], [1, BELL_N3]]],
  staff: [[[0, N3], [0.3, { rx: -2.6, rz: -0.15, cx: -0.15, lx: -0.6, lz: 0.3, hpy: 0.02, wx: 2.4 }, 'out'],
    [0.5, { rx: -1.45, rz: 0.1, cx: 0.25, lx: -1.35, lz: -0.1, hpz: 0.1, gr: -0.35, gl: 0.25, wx: 2.2 }, 'in'],
    [0.72, { rx: -1.4, rz: 0.1, cx: 0.22, lx: -1.3, lz: -0.05, hpz: 0.09, gr: -0.3, gl: 0.2, wx: 2.2 }, 'out'], [1, N3]]],
  rod: [[[0, N3], [0.25, { rx: -0.9, rz: -0.3, lx: -1.4, lz: 0.6, cy: -0.2, wx: 1.0 }, 'out'],
    [0.42, { rx: -1.75, rz: 0.05, lx: -1.5, lz: -0.2, cx: 0.12, cy: 0.15, hpz: 0.06, gr: -0.2, wx: 2.6 }, 'in'],
    [0.6, { rx: -1.65, rz: 0.08, lx: -1.2, lz: 0.4, cx: 0.1, cy: 0.12, hpz: 0.05, gr: -0.15, wx: 2.5 }, 'out'], [1, N3]]]
};
// Streitaxt einhändig (seit 13.46): dieselben wuchtigen Schläge, aber nur die rechte Hand führt die Axt;
// der linke Arm schwingt als Gegengewicht leicht seitlich mit, statt am Griff zu liegen
BASIC3.greataxe = BASIC3.greataxe.map((combo) => combo.map(([t, pose, ease]) => {
  if (!pose.two) return ease ? [t, pose, ease] : [t, pose];
  const { two, ...rest } = pose;
  const q = { lx: -0.65 + (rest.cy || 0) * 0.3, lz: 0.42, ...rest };
  return ease ? [t, q, ease] : [t, q];
}));

function basicKeys3(kind, p) {
  let list = BASIC3[kind];
  if (!list) return null;
  if (DUAL_MIRROR3[kind] != null && p.swingKind === 'combo' && p.equipment && isOffhand(p.equipment.schild)) list = dualKeys3(kind);
  return list[(p.swingKind === 'combo' ? p.combo || 0 : 0) % list.length];
}

// Zwei Waffen beim Krieger (seit 13.85): Beidhändigkeit (Schwert oder Axt, auch gemischt) und Titanengriff (zwei
// Zweihänder) schlagen den zweiten Hieb der Kombo mit der Nebenhand – das Spiegelbild eines Hiebs der Haupthand
// (rechts ↔ links, Drehungen um die Hochachse umgekehrt). Zweihänder werden dabei einhändig geführt wie die Streitaxt.
// DUAL_MIRROR3: welcher Hieb gespiegelt wird (Schwert: der Schrägschlag, Axt: der Hieb von der Schulter)
const DUAL_MIRROR3 = { sword: 0, axe: 1, greatsword: 0, greataxe: 1 };
const MIRROR_KEY3 = { rx: 'lx', ry: 'ly', rz: 'lz', lx: 'rx', ly: 'ry', lz: 'rz', wx: 'wl', wl: 'wx', gr: 'gl', gl: 'gr' };
const MIRROR_FLIP3 = new Set(['ry', 'rz', 'ly', 'lz', 'cy', 'cz', 'hy', 'sy']);
const DUAL_KEYS3 = {};
function oneHand3(pose) {
  if (!pose.two) return pose;
  const { two, ...rest } = pose;
  return { lx: -0.65 + (rest.cy || 0) * 0.3, lz: 0.42, ...rest };
}
function mirrorPose3(pose) {
  const q = {};
  for (const [k, val] of Object.entries(pose)) {
    if (k === 'wz') continue;
    const m = MIRROR_KEY3[k] || k;
    q[m] = MIRROR_FLIP3.has(m) ? -val : val;
  }
  return q;
}
function dualKeys3(kind) {
  if (DUAL_KEYS3[kind]) return DUAL_KEYS3[kind];
  const base = BASIC3[kind].map((combo) => combo.map(([t, pose, ease]) => (ease ? [t, oneHand3(pose), ease] : [t, oneHand3(pose)])));
  const left = base[DUAL_MIRROR3[kind]].map(([t, pose, ease]) => (ease ? [t, mirrorPose3(pose), ease] : [t, mirrorPose3(pose)]));
  DUAL_KEYS3[kind] = [base[0], left, base[2] || base[0]];
  return DUAL_KEYS3[kind];
}

// Aura des Schwertes (seit 14.61): Wirk-Pose je Bewaffnung, sw 0–1 über 1,5 s. Anheben bis 0,2, halten (leichtes
// Nachfedern), ab 0,72 weich zurück in die Ruhehaltung. Zwei Waffen: beide Arme schräg hoch, die Klingen bilden ein
// V über dem Kopf. Zweihänder: beide Hände am Griff, Klinge senkrecht hochgereckt. Einhand mit Schild: Schwertarm hoch,
// Schild vor dem Körper. Die Beine bleiben beim Laufen frei (die Figur ist steuerbar), im Stand ein fester Stand.
// Die Waffe leuchtet in der Rangfarbe (p.saCast aus schwertauraCast, ninja-fx.js), am hellsten beim Klingenblitz.
SKILL_POSE3.schwertaura = function (B, sw, kind, p, a) {
  const k = sw < 0.2 ? easeOut(sw / 0.2) : sw < 0.72 ? 1 : 1 - easeInOut3(poseSeg(sw, 0.72, 1));
  const eq = p.equipment || {};
  const dual = eq.schild && isOffhand(eq.schild);
  const shield = eq.schild && !dual;
  const two = !dual && twoHanded3(kind);
  const idle = IDLE_WRIST3[kind] || 0;
  const ext = wristExt3(kind) || 2.2;
  // kleines Nachfedern im Halten (die Waffen „ziehen“ nach oben)
  const hold = sw > 0.2 && sw < 0.72 ? Math.sin(poseSeg(sw, 0.2, 0.72) * Math.PI) : 0;
  const wx = idle + (ext - idle) * k;
  if (dual) {
    setArm(B[BH.armR], -2.6 * k - 0.08 * hold, 0, -0.5 * k);
    setArm(B[BH.armL], -2.6 * k - 0.08 * hold, 0, 0.5 * k);
    B[BH.handR].rotation.x = wx;
    B[BH.handL].rotation.x = wx;
  } else if (two) {
    // wie der Zweihand-Griff in poseKeys3: linke Hand unter der rechten
    const rx = -2.95 * k - 0.06 * hold;
    setArm(B[BH.armR], rx, 0, 0.12 * k);
    setArm(B[BH.armL], rx * 0.95, 0, (0.12 - 0.62) * k);
    B[BH.handR].rotation.x = wx;
    B[BH.handL].rotation.x = wx;
  } else {
    setArm(B[BH.armR], -2.85 * k - 0.08 * hold, 0, -0.18 * k);
    B[BH.handR].rotation.x = wx;
    if (shield) setArm(B[BH.armL], -1.05 * k, 0, 0.32 * k);
    else setArm(B[BH.armL], -0.5 * k, 0, 0.45 * k);
  }
  B[BH.chest].rotation.x = -0.16 * k;
  B[BH.head].rotation.x += -0.28 * k;
  B[BH.cape].rotation.x = 0.12 + 0.25 * k;
  if (!p.moving) {
    B[BH.hips].position.y -= 0.03 * k * (1 - hold);
    B[BH.legL].rotation.x = -0.12 * k;
    B[BH.legR].rotation.x = 0.1 * k;
  }
  // Klingenleuchten: schwach beim Heben, hell beim Blitz (0,1–0,5), dann ausklingend
  const rk = p.saCast && game.time - p.saCast.at < 3 ? p.saCast.rk : -1;
  const col = rk >= 0 && typeof SA_CAST_COL !== 'undefined' ? SA_CAST_COL[rk + 1].alt : '#ffe28a';
  const fl = sw < 0.1 ? 0 : sw < 0.22 ? poseSeg(sw, 0.1, 0.22) : 1 - poseSeg(sw, 0.22, 0.6);
  poseWeaponGlow(a, col, Math.min(0.6, 0.25 * k + 0.5 * Math.max(0, fl)));
};

const easeIn3 = (u) => u * u;
const easeOut3 = (u) => 1 - (1 - u) * (1 - u);
const easeIO3 = (u) => u * u * (3 - 2 * u);
function poseKeys3(B, keys, sw, def = null) {
  let i = 0;
  while (i < keys.length - 2 && sw > keys[i + 1][0]) i++;
  const [t0, a] = keys[i];
  const [t1, b, ease] = keys[i + 1];
  const u0 = Math.max(0, Math.min(1, (sw - t0) / Math.max(1e-4, t1 - t0)));
  const u = ease === 'in' ? easeIn3(u0) : ease === 'out' ? easeOut3(u0) : easeIO3(u0);
  // def: Werte für Kanäle, die eine Pose nicht setzt (Handgelenke in Ruhe, seit 13.85)
  const g = (o, k) => (o[k] != null ? o[k] : def && def[k] != null ? def[k] : 0);
  const v = (k) => g(a, k) + (g(b, k) - g(a, k)) * u;
  const two = (a.two || 0) + ((b.two || 0) - (a.two || 0)) * u;
  B[BH.root].rotation.y = v('sy');
  B[BH.hips].rotation.y = v('hy');
  B[BH.hips].position.y += v('hpy');
  B[BH.hips].position.z += v('hpz');
  B[BH.chest].rotation.set(v('cx'), v('cy'), v('cz'));
  B[BH.head].rotation.x += v('hx');
  const rx = v('rx');
  const rz = v('rz');
  B[BH.armR].rotation.set(rx, v('ry'), rz);
  // Zweihänder: linke Hand greift unter der rechten (gleiche Höhe, zur rechten Hand hin)
  const lx = v('lx');
  const lz = v('lz');
  B[BH.armL].rotation.set(lx + (rx * 0.95 - lx) * two, v('ly'), lz + (rz - 0.62 - lz) * two);
  // Handgelenke (seit 13.85 bei allen Nahkampfwaffen und Stäben): wx kippt die Waffe aus der Ruhe (Klinge zur Schulter)
  // nach vorn – beim Ausholen wenig (Klinge hinter dem Kopf), im Treffer so weit, dass sie den Arm verlängert;
  // wl ist das linke Handgelenk (Nebenhand), beim Zweihänder folgt es dem rechten
  const wx = v('wx');
  B[BH.handR].rotation.x = wx;
  B[BH.handR].rotation.z = v('wz');
  const wl = v('wl');
  B[BH.handL].rotation.x = wl + (wx - wl) * two;
  B[BH.legL].rotation.x = v('gl');
  B[BH.legR].rotation.x = v('gr');
}

// --- Bogenschuss: Zielen, Ziehen, Sehne (seit 13.67) --------------------------------------------------------
// Während eines Bogenschusses richtet bowAim3 Bogenarm und Bogen genau aufs Ziel aus (Bogen senkrecht, Griff vorn,
// Sehne zum Körper), legt die Zughand an die Sehne und zieht sie entlang der Pfeillinie bis an die Wange; die beiden
// Knochen der Sehne werden zu einem V zur Zughand gedreht und gestreckt. Die Posen (BASIC3.bow, BOW_POSE) geben nur
// noch Körper, Kopf und Beine vor und die Arme außerhalb des Zielens.
// Zeiten als Anteil der Schwungzeit: [Hand an der Sehne, voll gezogen, Abschuss], dazu die Höhe des Ziels (Bogenmaß)
const BOW_DRAW3 = {
  cast: { w: [0.1, 0.5, 0.58], up: 0.04 },
  bogenzug: { w: [0.1, 0.34, 0.4], up: 0.04 },
  bogenhimmel: { w: [0.1, 0.36, 0.44], up: 0.95 },
  skill: { w: [0.04, 0.3, 0.46], up: 0.1 }
};
const _bsA = new THREE.Vector3();
const _bsB = new THREE.Vector3();
const _bsT = new THREE.Vector3();
const _bsH = new THREE.Vector3();
const _bsM = new THREE.Vector3();
const _bsF = new THREE.Vector3();
const _bsU = new THREE.Vector3();
const _bsS = new THREE.Vector3();
const _bsG = new THREE.Vector3();
const _bsQ = new THREE.Quaternion();
const _bsR = new THREE.Quaternion();
const _bsD = new THREE.Quaternion();
const _bsP = new THREE.Quaternion();
const _bsMx = new THREE.Matrix4();
const _bsDown = new THREE.Vector3(0, -1, 0);
let _bsHoldQ = null;
// Zugstärke w 0 … 1 (Hand an der Sehne), full 0 … 1 (wie weit gezogen), aim 0 … 1 (Arme folgen dem Ziel),
// rel: Sekunden seit dem Abschuss (Nachschwingen der Sehne)
function bowDrawState3(p, sw) {
  const D = p.swingKind && BOW_DRAW3[p.swingKind];
  if (!D || sw < 0 || p.riding || weaponKindOf(p) !== 'bow') return null;
  let w = D.w;
  // Salve (seit 13.70, fernninja.js): mehrere Züge hintereinander (D.cycles); zwischen zwei Schüssen greift die
  // Zughand in den Köcher (reload 0 … 1) und legt den nächsten Pfeil auf
  let reload = -1;
  let relAt = -1;
  if (D.cycles) {
    let i = D.cycles.findIndex((c) => sw < c[2]);
    if (i < 0) i = D.cycles.length - 1;
    w = D.cycles[i];
    if (i > 0 && sw < w[0]) {
      relAt = D.cycles[i - 1][2];
      reload = (sw - relAt) / Math.max(0.01, w[0] - relAt);
    }
  }
  const w0 = D.cycles ? D.cycles[0][0] : w[0];
  const aim = Math.min(1, sw / Math.max(0.01, w0)) * (sw > 0.82 ? Math.max(0, (1 - sw) / 0.18) : 1);
  const st = { D, aim: aim * aim * (3 - 2 * aim), w: 0, full: 0, rel: -1, reload };
  if (reload >= 0) {
    st.rel = (sw - relAt) * (p.swingDur || 0.5);
    return st;
  }
  if (sw >= w[0] && sw < w[2]) {
    st.w = Math.min(1, (sw - w[0]) / 0.05);
    const f = Math.min(1, (sw - w[0]) / Math.max(0.01, w[1] - w[0]));
    st.full = f * f * (3 - 2 * f);
  } else if (sw >= w[2]) st.rel = (sw - w[2]) * (p.swingDur || 0.5);
  return st;
}
// Knochen b (Kind von parent) so drehen, dass seine Achse ax (lokal, in Ruhe) in Weltrichtung dir zeigt; Anteil k
function bowPointBone3(b, ax, dir, k) {
  b.parent.getWorldQuaternion(_bsP);
  _bsU.copy(ax).applyQuaternion(_bsP);
  _bsD.setFromUnitVectors(_bsU, dir);
  _bsQ.copy(_bsP).invert().multiply(_bsD).multiply(_bsP);
  b.quaternion.slerp(_bsQ, k);
}
function bowString3(a, p, sw) {
  const S = a.model.bowStr;
  const B = a.bones;
  a.bowNock = null;
  const st = bowDrawState3(p, sw);
  if (!st || st.aim <= 0.001) return;
  a.group.updateMatrixWorld(true);
  const gs = a.group.scale.x;
  const k = st.aim;
  // Zielrichtung: Blickrichtung der Figur (Drehung der Gruppe), angehoben um D.up
  _bsF.set(Math.sin(a.heading), 0, Math.cos(a.heading));
  const up = st.D.up;
  _bsF.multiplyScalar(Math.cos(up)).addScaledVector(_bsS.set(0, 1, 0), Math.sin(up)).normalize();
  // Körper halb seitlich (rechte Schulter zum Ziel), der Kopf schaut weiter aufs Ziel
  const turn = 0.62 * k;
  B[BH.chest].rotation.y += turn;
  B[BH.hips].rotation.y += turn * 0.45;
  B[BH.head].rotation.y -= turn * 1.05;
  a.group.updateMatrixWorld(true);
  // Bogenarm: von der rechten Schulter aufs Ziel, leicht nach innen vor die Brust
  B[BH.armR].getWorldPosition(_bsA);
  _bsT.copy(_bsF);
  bowPointBone3(B[BH.armR], _bsDown, _bsT, k);
  B[BH.armR].updateMatrixWorld(true);
  // Bogenhand: Bogen senkrecht (leicht gekantet), Griff vorn – Weltdrehung aus Achsen, dann ohne die Haltedrehung
  if (!_bsHoldQ) _bsHoldQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(...BOW_HOLD3));
  _bsU.set(0, 1, 0).addScaledVector(_bsF, -_bsF.y).normalize();
  _bsS.crossVectors(_bsF, _bsU).normalize();
  _bsU.applyAxisAngle(_bsF, 0.12);
  _bsS.crossVectors(_bsF, _bsU).normalize();
  _bsMx.makeBasis(_bsF, _bsU, _bsS);
  _bsQ.setFromRotationMatrix(_bsMx);
  _bsQ.multiply(_bsR.copy(_bsHoldQ).invert());
  B[BH.armR].getWorldQuaternion(_bsP);
  _bsR.copy(_bsP).invert().multiply(_bsQ);
  B[BH.handR].quaternion.slerp(_bsR, k);
  B[BH.handR].updateMatrixWorld(true);
  // Griff und Sehnenmitte in Welt
  _bsG.fromArray(S.grip).applyMatrix4(B[BH.handR].matrixWorld);
  B[BH.handR].getWorldQuaternion(_bsR);
  B[S.bones[0]].getWorldPosition(_bsA);
  _bsM.fromArray(S.v[0]).applyQuaternion(_bsR).multiplyScalar(gs).add(_bsA);
  // Pfeillinie: vom Griff zurück; Ankerpunkt dort, wo die linke Hand mit gestrecktem Arm die Linie erreicht
  const brace = _bsG.distanceTo(_bsM);
  B[BH.armL].getWorldPosition(_bsS);
  const armLen = B[BH.handL].position.length() * gs;
  _bsT.copy(_bsG).sub(_bsS);
  const bb = _bsT.dot(_bsF);
  const cc = _bsT.lengthSq() - armLen * armLen;
  const disc = bb * bb - cc;
  let dFull = disc > 0 ? bb + Math.sqrt(disc) : bb;
  // Auszug höchstens etwa eine Armlänge: der Pfeil soll nicht länger als ein Arm wirken (kein Speer)
  dFull = Math.max(brace + 0.1 * gs, Math.min(0.42 * gs, dFull));
  let d = brace;
  if (st.w > 0) d = brace + (dFull - brace) * st.full;
  else if (st.rel >= 0) d = dFull + Math.min(0.1 * gs, st.rel * 0.8 * gs);
  else d = brace + 0.05 * gs;
  // Zughand: Ziel ist der Punkt auf der Pfeillinie (Finger ein Stück unter dem Handknochen)
  _bsH.copy(_bsG).addScaledVector(_bsF, -d);
  // Salve (seit 13.70): vom Anker über die Schulter zum Köcher auf dem Rücken und mit dem neuen Pfeil zurück an die Sehne
  const rl = st.reload;
  if (rl >= 0) {
    _bsB.set(_bsF.x, 0, _bsF.z).normalize();
    _bsT.copy(_bsS).addScaledVector(_bsB, -0.22 * gs);
    _bsT.y += 0.3 * gs;
    const e3 = (u) => u * u * (3 - 2 * u);
    if (rl < 0.45) _bsH.lerp(_bsT, e3(rl / 0.45));
    else {
      _bsA.copy(_bsG).addScaledVector(_bsF, -brace);
      _bsH.copy(_bsT).lerp(_bsA, e3((rl - 0.45) / 0.55));
    }
  }
  _bsT.copy(_bsH).sub(_bsS).normalize();
  bowPointBone3(B[BH.armL], _bsDown, _bsT, k);
  B[BH.armL].updateMatrixWorld(true);
  // der neue Pfeil liegt in der Zughand, Spitze schon zum Bogen
  if (rl >= 0.3) {
    B[BH.handL].getWorldPosition(_bsH);
    _bsA.copy(_bsG).addScaledVector(_bsF, -brace);
    _bsT.copy(_bsA).sub(_bsH);
    if (_bsT.lengthSq() < 1e-6) _bsT.copy(_bsF);
    _bsT.normalize().lerp(_bsF, clamp01((rl - 0.3) / 0.7)).normalize();
    a.bowNock = { w: Math.min(1, (rl - 0.3) / 0.15), full: 0.15, nock: _bsH.clone(), grip: _bsH.clone().addScaledVector(_bsT, 0.3 * gs), fwd: _bsT.clone() };
  }
  if (st.w <= 0 && !(st.rel >= 0 && st.rel < 0.3)) return;
  // Sehne: Zugpunkt an der Hand bzw. nach dem Abschuss die Mitte (schwingt kurz nach)
  if (st.w > 0) {
    B[BH.handL].getWorldPosition(_bsH);
    _bsT.copy(_bsH).sub(_bsS).normalize();
    _bsH.addScaledVector(_bsT, 0.035 * gs);
    _bsT.copy(_bsM).lerp(_bsH, st.w);
    a.bowNock = { w: st.w, full: st.full, nock: _bsT.clone(), grip: _bsG.clone(), fwd: _bsG.clone().sub(_bsT).normalize() };
  } else {
    const q = st.rel / 0.3;
    _bsT.copy(_bsM).addScaledVector(_bsF, Math.sin(st.rel * 70) * (1 - q) * 0.04 * gs);
  }
  for (let i = 0; i < 2; i++) {
    const bn = B[S.bones[i]];
    bn.getWorldPosition(_bsA);
    _bsB.fromArray(S.v[i]);
    const len0 = _bsB.length() * gs;
    _bsB.applyQuaternion(_bsR).normalize();
    _bsH.copy(_bsT).sub(_bsA);
    const len = _bsH.length();
    if (len < 1e-4) continue;
    _bsH.multiplyScalar(1 / len);
    _bsD.setFromUnitVectors(_bsB, _bsH);
    _bsQ.copy(_bsR).invert().multiply(_bsD).multiply(_bsR);
    bn.quaternion.copy(_bsQ);
    bn.scale.setScalar(len / len0);
  }
}

// Spielerfigur holen oder bauen (seit 14.69 mit Ersatz): scheitert der Bau (Ausnahme), lief er vorher in jedem Bild neu
// an – ein Hänger von 20–50 ms je Bild, und die Figur fehlte, solange es scheiterte (Name und Lebensbalken blieben).
// Jetzt wird ein gescheiterter Schlüssel 10 s nicht wieder versucht; bis dahin trägt die Figur ein Ersatzmodell ohne
// Ausrüstung (mit, notfalls ohne das eigene Aussehen). Gemeldet wird je Schlüssel einmal.
const FIG3_FAIL = new Map();
function playerActor3(p, key) {
  const k = entityKey(p);
  const now = performance.now();
  const tries = [
    ['p:' + key, p],
    ['p0:' + p.classId + '|' + (p.path ?? '') + '|' + JSON.stringify(p.look || {}), { classId: p.classId, path: p.path, look: p.look, equipment: null, buffs: [] }],
    ['p0:' + p.classId, { classId: p.classId, path: 0, look: null, equipment: null, buffs: [] }]
  ];
  for (const [mk, who] of tries) {
    const failed = FIG3_FAIL.get(mk);
    if (failed !== undefined && now - failed < 10000) continue;
    try {
      return actorFor(k, mk, (b) => {
        const r = humanoid3(b, playerConfig3(who));
        r.blob = 0.42;
        return r;
      });
    } catch (err) {
      if (failed === undefined) console.warn('3D-Spielerfigur nicht baubar (' + mk.slice(0, 80) + '):', err);
      FIG3_FAIL.set(mk, now);
    }
  }
  return null;
}

function syncPlayer3(p, dt) {
  const key = playerKey3(p);
  const a = playerActor3(p, key);
  if (!a) {
    // Modell nicht gebaut: beim nächsten Bild neu versuchen
    MODELS3.delete('p:' + key);
    return;
  }
  // Selbstheilung (7.8): Figur gehört in die Szene und braucht gültige Werte, sonst ist sie unsichtbar
  if (!a.group.parent) V3.actors.add(a.group);
  if (!isFinite(a.heading)) a.heading = 0;
  if (!(a.group.scale.x > 0.01)) a.group.scale.setScalar(a.model.scale);
  const fy = feetY(p);
  const B = a.bones;
  resetBones(a);
  const t = game.time;
  // Elementsprung (seit 8.6): Figur kurz ganz verborgen
  a.group.visible = !(p.blinkHide > t);
  // schwebende Teile drehen sich (Zepterkristall, Funke, Runenring, Hutstern), siehe spinBones3
  const spin = a.model.spin;
  if (spin) for (let i = 0; i < spin.length; i++) {
    const sp = spin[i];
    const bn = B[sp[0]];
    if (sp[1] === 0) bn.rotation.x = t * sp[2];
    else if (sp[1] === 1) bn.rotation.y = t * sp[2];
    else bn.rotation.z = t * sp[2];
    if (sp[3]) bn.position.y += Math.sin(t * 2.3 + i) * sp[3];
  }
  // Blickrichtung (beim Wirbel dreht sich die Figur)
  const f = p.facing || { x: 0, y: 1 };
  if (p.spin > 0) a.heading += dt * 28;
  // seit 13.85: beim Angreifen (faceHold, kampf.js) dreht die Figur doppelt so schnell zum Ziel
  else turnToward(a, Math.atan2(f.x, f.y), Math.min(1, dt * (p.faceHold && p.faceHold.until > game.time ? 32 : 16)));
  // Sprung
  let lift = 0;
  if (p.leap) {
    const lk = (game.time - p.leap.start) / p.leap.dur;
    if (lk >= 1) p.leap = null;
    else if (lk > 0) lift = leapCurve(p.leap, lk) * p.leap.h * U3;
  }
  const kind = weaponKindOf(p);
  const sw = swingProgress(p);
  const posing = p.swingKind === 'pose' && p.swing > 0 && !p.riding;
  if (posing) lift += Math.sin(Math.min(1, (1 - p.swing / (p.swingDur || 0.7)) * 1.6) * Math.PI) * 0.18;
  // Reiten: Pferd darunter, Reiter sitzt im Sattel; seit 14.27 auf Stufe 3 der Drache (drei-drache.js)
  let ride = 0;
  const onDragon = p.riding && rideTierOf(p) === 3 && typeof rideDragon3 === 'function';
  if (onDragon) ride = rideDragon3(p, a, B, t, fy);
  else if (p.__drOn && typeof dragonLand3 === 'function') dragonLand3(p, t);
  if (p.riding && !onDragon) {
    const tier = rideTierOf(p);
    const h = actorFor(entityKey(p) + 'h' + tier, 'horse' + tier + ':' + CLASSES[p.classId].trim, (b) => Object.assign(horseParts3(b, null, { saddle: CLASSES[p.classId].trim, tier }), { blob: 0.7, scale: tier === 2 ? 1.3 : 1.22 }));
    if (h) {
      resetBones(h);
      h.group.visible = a.group.visible;
      h.group.position.set(p.x * U3, 0, fy * U3);
      h.group.rotation.y = a.heading;
      // Galopp (seit 12.0 mit Gelenken, siehe horseGait3): Sprünge pro Sekunde nach dem Tempo, damit die Hufe
      // kaum rutschen; Kriegsross ist schneller. Die Phase läuft in Spielzeit, ein Tempowechsel macht keinen Sprung.
      const base = CLASSES[p.classId].base.speed;
      const spd = p === game.player && game.stats ? game.stats.speed : (p.footSpeed || base) + base * (HORSES[tier] || HORSES[1]).speed;
      const gdt = Math.min(0.1, Math.max(0, t - (h.galAt ?? t)));
      h.galAt = t;
      const sink = horseGait3(h, t, gdt, p.moving, Math.max(1.5, Math.min(2.9, (spd * U3) / 3.4)));
      // Reiter sitzt im Sattel und geht mit dem Rumpf auf und ab
      ride = h.model.seat * h.model.scale - a.model.hipY * a.model.scale + 0.04 - sink * h.model.scale;
      B[BH.legL].rotation.set(-1.2, 0, 0.5);
      B[BH.legR].rotation.set(-1.2, 0, -0.5);
    }
  }
  a.lift = lift;
  placeActor(a, p, fy, lift + ride);
  a.group.rotation.y = a.heading;
  // Schatten bleibt beim Sprung am Boden und wird kleiner; auf dem Drachen wirft der Drache den Schatten
  if (a.blob) a.blob.visible = !onDragon;
  if (a.blob) {
    a.blob.position.y = 0.02 - lift / a.group.scale.y;
    a.blob.scale.setScalar((a.model.blob || 0.5) * (1 - 0.35 * Math.min(1, lift / 2)));
  }
  // Gehen und Atmen
  if (p.moving && !p.riding) {
    const w = t * 11;
    B[BH.legL].rotation.x = Math.sin(w) * 0.65;
    B[BH.legR].rotation.x = -Math.sin(w) * 0.65;
    B[BH.armL].rotation.x = -Math.sin(w) * 0.5;
    B[BH.armR].rotation.x = Math.sin(w) * 0.5;
    // Bogen: der Bogenarm schwingt kaum mit (bowCarry3 weiter unten)
    B[BH.hips].position.y += Math.abs(Math.cos(w)) * 0.035;
    B[BH.hips].rotation.y = Math.sin(w) * 0.08;
    B[BH.chest].rotation.x = 0.08;
    B[BH.chest].rotation.y = -Math.sin(w) * 0.1;
    B[BH.cape].rotation.x = 0.45 + Math.abs(Math.sin(w)) * 0.12;
  } else {
    const br = Math.sin(t * 2.4 + p.x * 0.01);
    B[BH.chest].rotation.x = br * 0.02;
    B[BH.head].rotation.x += -br * 0.03;
    B[BH.armL].rotation.z = 0.08 + br * 0.02;
    B[BH.armR].rotation.z = -0.08 - br * 0.02;
    B[BH.cape].rotation.x = 0.12 + Math.sin(t * 1.7) * 0.05;
  }
  // Angriffe
  a.poseWg = null;
  a.poseEm = 0;
  // Dolch blitzt auf (Ninja-Attacken seit 13.2, ninja-fx.js)
  if (p.bladeFlash > t) {
    const q = (p.bladeFlash - t) / (p.bladeFlashDur || 0.45);
    poseWeaponGlow(a, p.bladeFlashCol || '#ffffff', Math.min(1, 0.35 + q * 1.1));
  }
  if (posing) {
    const k = Math.sin(Math.min(1, (1 - p.swing / (p.swingDur || 0.7)) * 1.4) * Math.PI);
    B[BH.armL].rotation.set(-2.7 * k, 0, 0.3 * k);
    B[BH.armR].rotation.set(-2.7 * k, 0, -0.3 * k);
    B[BH.head].rotation.x += -0.3 * k;
  } else if (sw >= 0 && Object.prototype.hasOwnProperty.call(SKILL_POSE3, p.swingKind)) {
    // eigene Animationen (seit 8.3): Sichelwelle, Felsenfaust, Sprungschlag; seit 8.5 Salve, Käfig, Schnitter
    SKILL_POSE3[p.swingKind](B, sw, kind, p, a);
  } else if (sw >= 0 && (p.swingKind === 'combo' || p.swingKind === 'cast') && basicKeys3(kind, p)) {
    // Grundangriff (seit 9.3): Schlüsselposen je Waffe und Kombo, ganzer Körper
    const iw = IDLE_WRIST3[kind] || 0;
    poseKeys3(B, basicKeys3(kind, p), sw, iw ? { wx: iw, wl: p.equipment && isOffhand(p.equipment.schild) ? iw : 0 } : null);
  } else if (sw >= 0) {
    const e = easeOut(sw);
    if (kind === 'bow') {
      B[BH.armR].rotation.set(-1.5, 0.2, 0);
      B[BH.armL].rotation.set(-1.45, -0.6 + Math.sin(sw * Math.PI) * 0.3, 0);
      B[BH.chest].rotation.y = 0.35;
    } else if (kind === 'staff' || kind === 'bell' || kind === 'rod' || kind === 'fan' && p.swingKind === 'cast') {
      const k = Math.sin(sw * Math.PI);
      B[BH.armR].rotation.set(-0.6 - k * 1.8, 0, 0);
      B[BH.armL].rotation.set(-0.4 - k * 1.2, 0, 0.3);
      B[BH.chest].rotation.x = -0.15 * k;
      // Stab (seit 13.85): bleibt beim Heben aufrecht, statt mit dem Kopf nach hinten zu kippen
      if (kind === 'staff') B[BH.handR].rotation.x = wristExt3(kind) * k;
    } else if (p.swingKind === 'combo' && p.combo === 2) {
      // Stich nach vorn mit Ausfallschritt (seit 13.85 zeigt die Klinge dabei nach vorn)
      const k = Math.sin(sw * Math.PI);
      B[BH.armR].rotation.set(-1.55, 0, 0);
      B[BH.handR].rotation.x = wristExt3(kind) * (0.6 + 0.5 * k);
      B[BH.chest].rotation.y = -0.4 * k;
      B[BH.hips].position.z += k * 0.18;
      B[BH.legR].rotation.x = -0.5 * k;
      B[BH.legL].rotation.x = 0.4 * k;
    } else if (p.swingKind === 'combo' && p.combo === 1 || p.swingKind === 'skill') {
      // waagerechter Schwung (seit 13.85 mit gestreckter Klinge statt nach hinten zeigend)
      B[BH.armR].rotation.set(-1.45, 0, 0);
      B[BH.handR].rotation.x = wristExt3(kind);
      B[BH.chest].rotation.y = 1.1 - e * 2.3;
      B[BH.hips].rotation.y = 0.3 - e * 0.6;
    } else {
      // Schlag von oben
      const raise = sw < 0.3 ? sw / 0.3 : 1 - (sw - 0.3) / 0.7;
      B[BH.armR].rotation.set(sw < 0.3 ? -2.7 * raise : -2.7 + (sw - 0.3) / 0.7 * 2.4, 0, -0.2);
      // Handgelenk (seit 13.85): Klinge hinter dem Kopf ausholen, im Schlag nach vorn unten
      B[BH.handR].rotation.x = wristExt3(kind) * (sw < 0.3 ? 0.3 * raise : Math.min(1, 0.3 + (sw - 0.3) / 0.25));
      B[BH.chest].rotation.y = 0.3 - e * 0.6;
      B[BH.chest].rotation.x = sw < 0.3 ? -0.1 : 0.15;
      if (twoHanded3(kind)) B[BH.armL].rotation.set(B[BH.armR].rotation.x * 0.8, 0, 0.5);
    }
    if (kind === 'dagger' && !(p.equipment && p.equipment.schild && !isOffhand(p.equipment.schild))) B[BH.armL].rotation.set(sw < 0.5 ? -1.2 : -2.0 + sw, 0, 0.2);
  } else if (!p.moving && !p.riding) {
    // Ruhehaltung mit der Waffe
    if (twoHanded3(kind)) B[BH.armL].rotation.set(-0.5, 0, 0.35);
    // Ninja mit Dolchen (seit 13.20): Kampfstand im Rückhandgriff – Hände leicht vor dem Körper,
    // die Klingen liegen am Unterarm und zeigen nach hinten
    if (kind === 'dagger') {
      const br = Math.sin(game.time * 2.2) * 0.04;
      B[BH.armR].rotation.set(-0.42 + br, 0, -0.22);
      B[BH.armL].rotation.set(-0.42 - br, 0, 0.22);
    }
  }
  // Schwert und Axt in Ruhe und beim Gehen leicht nach vorn gekippt (seit 13.85, IDLE_WRIST3), die zweite Waffe ebenso
  if (IDLE_WRIST3[kind] && !posing && sw < 0 && !p.riding) {
    B[BH.handR].rotation.x = IDLE_WRIST3[kind];
    if (p.equipment && isOffhand(p.equipment.schild)) B[BH.handL].rotation.x = IDLE_WRIST3[kind];
  }
  // Bogen (seit 14.20) natürlich in der Hand tragen: in Ruhe, beim Gehen, auf dem Pferd und zu Beginn und Ende eines
  // Schusses (bowString3 blendet daraus aufs Ziel über, darum hier auch während der gezielten Schüsse)
  if (kind === 'bow' && !posing && (sw < 0 || (!p.riding && BOW_DRAW3[p.swingKind]))) bowCarry3(B, p.riding ? 'ride' : p.moving ? 'walk' : 'stand', t * 11);
  // Glocke (seit 13.28): außerhalb von Angriffen hält der Schamane sie am Griff leicht vor dem Körper,
  // die Glocke hängt dabei immer senkrecht (Griff oben, Öffnung unten) – auch beim Laufen
  if (kind === 'bell' && !posing && sw < 0 && !p.riding) {
    if (!p.moving) B[BH.armR].rotation.set(BELL_ARM3 + Math.sin(game.time * 2.2) * 0.04, 0, -0.16);
    B[BH.handR].rotation.x = BELL_HANG3 - B[BH.armR].rotation.x;
  }
  // Treffer: kurz nach hinten zucken, rot aufblitzen
  const hurtK = p.hurtAt ? (game.time - p.hurtAt) / 0.28 : 1;
  if (hurtK < 1 && !p.riding) B[BH.chest].rotation.x -= Math.sin(hurtK * Math.PI) * 0.3;
  // Bogensehne zur Zughand (seit 13.67)
  if (a.model.bowStr) bowString3(a, p, sw);
  const mat = a.mats.lit;
  const glowUp = p.glowUntil > game.time ? (p.glowUntil - game.time) / 1.5 : 0;
  if (hurtK < 1) mat.emissive.setRGB(0.6 * (1 - hurtK), 0.05, 0.02);
  else if (glowUp > 0) mat.emissive.setRGB(0.55 * glowUp, 0.5 * glowUp, 0.35 * glowUp);
  else if (posing) mat.emissive.set(p.poseColor || CLASSES[p.classId].trim).multiplyScalar(0.35 * Math.sin((1 - p.swing / (p.swingDur || 0.7)) * Math.PI));
  else if (a.poseEm > 0) mat.emissive.set('#c8a878').multiplyScalar(a.poseEm);
  else if (p.clone) mat.emissive.setRGB(0.18, 0.1, 0.34);
  else mat.emissive.setRGB(0, 0, 0);
  // Schattendoppelgänger: dunkel getönt; die Farbe wird jedes Bild gesetzt, weil Figuren aus dem Pool wiederkommen
  if (p.clone) mat.color.setRGB(0.32, 0.28, 0.46);
  else mat.color.setRGB(1, 1, 1);
  // Durchsichtig, wenn unsichtbar
  const inv = (p === game.player && game.stats && game.stats.invisible) || (p.remote && p.invisible);
  setActorAlpha(a, p.clone ? 0.6 : inv ? 0.35 : 1);
  // Leuchtende Waffe: Plus-Stufe oder Waffenaura-Buff
  const wg = a.mats.wglow;
  if (wg) {
    const weapon = p.equipment && p.equipment.waffe;
    const band = weapon ? plusBand(weapon.plus) : 0;
    const aura = p.buffs && p.buffs.find((bf) => SKILL_FX[bf.id] && SKILL_FX[bf.id].weaponGlow);
    // seit 14.74 Flammenhülle statt Kasten (figWeaponGlowMat): die Aura lodert ein Stück über die Waffe hinaus, das
    // Leuchten der Plus-Stufe bleibt ein ruhiger, enger Schein, Fertigkeits-Posen liegen dazwischen
    WG3_T.value = t % 600;
    if (aura) {
      wg.color.set(SKILL_FX[aura.id].weaponGlow);
      wg.opacity = 0.85 + 0.15 * Math.sin(t * 8);
      wgFlame3(wg, 0.038, 0.075, 1);
    } else if (band >= 2) {
      wg.color.set(PLUS_COLORS[band]);
      wg.opacity = 0.3 + band * 0.07 + 0.1 * Math.sin(t * 6);
      wgFlame3(wg, 0.022, 0.025, 0.6);
    } else wg.opacity = 0;
    if (a.poseWg && a.poseWg.op > wg.opacity) {
      wg.color.set(a.poseWg.color);
      wg.opacity = a.poseWg.op;
      wgFlame3(wg, 0.03, 0.05, 0.85);
    }
    a.meshes.wglow.visible = wg.opacity > 0.01;
  }
}

// Durchsicht nur für unsichtbare Spieler; Shader-Varianten bleiben gleich (kein Neuübersetzen)
function setActorAlpha(a, alpha) {
  if (a.alpha === alpha) return;
  a.alpha = alpha;
  for (const k of ['lit', 'glow']) {
    const m = a.mats[k];
    if (!m) continue;
    m.transparent = alpha < 1;
    m.opacity = alpha;
  }
  if (a.meshes.outline) a.meshes.outline.visible = alpha >= 1;
  if (a.extras) for (const m of a.extras) m.visible = alpha >= 1;
}

// Monster: Blickrichtung aus der Bewegung, Laufen, Angreifen, Aufblitzen, Schweben
function syncMonster3(m, dt) {
  // Seelenkristalle der Endbosse zeichnet endboss.js (fx3Raid)
  if (m.type && m.type.crystal) return;
  if (m.isStone) {
    syncStone3(m, dt);
    return;
  }
  const a = actorFor(entityKey(m), monModelKey3(m), (b) => monsterBuild(b, m.typeId, m.__v3), true);
  // noch nicht gebaut (Grenze je Bild): Name und Balken erst mit der Figur zeigen (drawOverlay3)
  m.__wait3 = !a;
  if (!a) return;
  a.corpse = false;
  // seit 14.68: Aelvyr hat eigene Bewegungen (aelvyr.js)
  if (a.model.aelvyr && typeof aelAnim3 === 'function') aelAnim3(a, m, dt);
  else animateCreature(a, m, dt, m.moving, m.attackAnim > 0 ? m.attackAnim / 0.25 : 0, m.hitFlash || 0, m.windup > 0 ? 1 - m.windup / (m.windupMax || 0.4) : 0);
  lodPick3(a);
  // Höllenkaiser: eigene Aura (hoellenthron.js)
  if (a.model.teufel && typeof teufelAura3 === 'function') teufelAura3(a, m);
  // Bosse stehen in einem pulsierenden Schein
  if (m.type.boss) {
    if (!a.aura) {
      a.aura = groundRing(new THREE.Color(m.type.boss.color), false);
      a.group.add(a.aura);
    }
    a.aura.scale.setScalar((1.4 + 0.1 * Math.sin(game.time * 3)) / a.model.scale);
    a.aura.material.opacity = 0.3 + 0.12 * Math.sin(game.time * 3);
  }
}

function animateCreature(a, e, dt, moving, atk, flash, wind = 0) {
  const fy = feetY(e);
  resetBones(a);
  const B = a.bones;
  // Eingefroren (seit 8.6, Frost-Magier): Lauf-, Atem- und Angriffsphase bleiben im Moment des Einfrierens stehen
  const frozen = e.frozen > game.time;
  if (frozen) {
    if (a.fzT !== e.frozenT) {
      a.fzT = e.frozenT;
      a.fzMove = moving;
      a.fzAtk = atk;
      a.fzWind = wind;
    }
    moving = a.fzMove;
    atk = a.fzAtk;
    wind = a.fzWind;
  }
  // nur Zahlen-IDs versetzen die Phase (Text wie früher 'ally0' ergab NaN-Knochen)
  const t = (frozen ? e.frozenT ?? game.time : game.time) + (typeof e.id === 'number' ? e.id : 0) * 0.37;
  // Richtung: aus der Bewegung, beim Angriff zum Ziel (sonst zum Spieler)
  // seit 13.10 über die Strecke seit der letzten Drehung statt je Bild: Bei hoher Bildrate (120–144 Hz) oder
  // langsamem Umherlaufen war der Schritt je Bild zu klein, und das Monster lief seitlich gedreht nach oben
  if (a.refX == null || Math.hypot(e.x - a.refX, e.y - a.refY) > 40) { a.refX = e.x; a.refY = e.y; }
  else {
    const dx = e.x - a.refX;
    const dy = e.y - a.refY;
    if (dx * dx + dy * dy > 9) {
      a.want = Math.atan2(dx, dy);
      a.refX = e.x;
      a.refY = e.y;
    }
  }
  const foe = e.target && !e.target.dead ? e.target : game.player;
  if ((atk > 0 || wind > 0) && foe) a.want = Math.atan2(foe.x - e.x, foe.y - e.y);
  // im Stehen halb zur Kamera gedreht, damit Gesichter zu sehen sind
  if (a.want == null) a.want = e.facing < 0 ? -Math.PI / 2 + 0.55 : Math.PI / 2 - 0.55;
  if (!frozen) turnToward(a, a.want, Math.min(1, dt * 10));
  a.lastX = e.x;
  a.lastY = e.y;
  const fam = a.model.family;
  // Monster mit Angriffsart bekommen eigene Posen (creatureAttackPose), sonst einfaches Vorschnellen
  const posed = !!a.model.style;
  const lunge = atk > 0 && !posed ? Math.sin(atk * Math.PI) : 0;
  let y = 0;
  if (fam === 'ghost') y = 0.2 + Math.sin(t * 2.5) * 0.08;
  // hochgeschleudert (Felsenfaust, Sprungschlag): Bogen nach oben, dabei nach hinten kippen
  let tilt = 0;
  if (e.lift) {
    const lk = (game.time - e.lift.start) / e.lift.dur;
    if (lk >= 1) e.lift = null;
    else if (lk > 0) {
      const s = Math.sin(lk * Math.PI);
      y += s * e.lift.h * U3;
      tilt = -0.45 * s * (e.lift.h > 12 ? 1 : 0.3);
    }
  }
  placeActor(a, e, fy, y);
  a.group.rotation.set(tilt, a.heading, 0);
  const w = t * (moving ? 11 : 0);
  if (fam === 'human') {
    if (moving) {
      B[BH.legL].rotation.x = Math.sin(w) * 0.6;
      B[BH.legR].rotation.x = -Math.sin(w) * 0.6;
      B[BH.armL].rotation.x = -Math.sin(w) * 0.45;
      B[BH.armR].rotation.x = Math.sin(w) * 0.45;
      B[BH.hips].position.y += Math.abs(Math.cos(w)) * 0.03;
      B[BH.chest].rotation.y = -Math.sin(w) * 0.08;
    } else {
      B[BH.chest].rotation.x = Math.sin(t * 2.6) * 0.025;
    }
    if (a.model.hunch) {
      B[BH.chest].rotation.x += a.model.hunch;
      B[BH.head].rotation.x -= a.model.hunch * 0.8;
    }
    if (lunge > 0) {
      B[BH.armR].rotation.set(-2.6 + (1 - atk) * 2.6, 0, 0);
      B[BH.chest].rotation.y = 0.3 - (1 - atk) * 0.6;
      B[BH.hips].position.z += lunge * 0.12;
    }
    B[BH.wingL].rotation.y = -0.3 - Math.sin(t * 6) * 0.3;
    B[BH.wingR].rotation.y = 0.3 + Math.sin(t * 6) * 0.3;
    B[BH.tail].rotation.y = Math.sin(t * 3) * 0.3;
    B[BH.cape].rotation.x = moving ? 0.4 : 0.1;
  } else if (fam === 'beast' || fam === 'horse') {
    if (moving) {
      B[BQ.legFL].rotation.x = Math.sin(w) * 0.6;
      B[BQ.legFR].rotation.x = -Math.sin(w) * 0.6;
      B[BQ.legBL].rotation.x = -Math.sin(w) * 0.6;
      B[BQ.legBR].rotation.x = Math.sin(w) * 0.6;
      B[BQ.body].position.y += Math.abs(Math.cos(w)) * 0.03;
    } else B[BQ.body].scale.y = 1 + Math.sin(t * 3) * 0.02;
    B[BQ.tail].rotation.y = Math.sin(t * (moving ? 9 : 3)) * 0.35;
    B[BQ.head].rotation.x = lunge > 0 ? -0.3 * lunge : Math.sin(t * 1.3) * 0.05;
    // vor dem Biss ducken, dann nach vorn schnellen
    if (atk > 0.6 && !posed) B[BQ.body].position.y -= (atk - 0.6) * 0.15;
    B[BQ.head].rotation.y = lunge > 0 ? 0 : Math.sin(t * 0.7) * 0.15;
    B[BQ.body].position.z += lunge * 0.22;
    B[BQ.wingL].rotation.z = Math.sin(t * 5) * 0.35;
    B[BQ.wingR].rotation.z = -Math.sin(t * 5) * 0.35;
  } else if (fam === 'spider' || fam === 'scorpion') {
    const n = fam === 'spider' ? 8 : 6;
    const first = fam === 'spider' ? 3 : 4;
    for (let k = 0; k < n; k++) B[first + k].rotation.x = moving ? Math.sin(w * 1.4 + k * 1.3) * 0.35 : 0;
    B[1].position.y += moving ? Math.abs(Math.sin(w * 1.4)) * 0.02 : Math.sin(t * 3) * 0.01;
    B[1].position.z += lunge * 0.2;
    if (fam === 'scorpion') B[3].rotation.x = -0.2 - lunge * 0.6 + Math.sin(t * 2) * 0.05;
    if (fam === 'spider' && B[2]) B[2].rotation.x = Math.sin(t * 9) * 0.04;
  } else if (fam === 'serpent') {
    for (let k = 1; k < B.length; k++) B[k].rotation.y = Math.sin(t * (moving ? 7 : 2.5) - k * 0.8) * (moving ? 0.25 : 0.1);
    B[1].position.z += lunge * 0.25;
    B[1].rotation.x = -lunge * 0.2;
  } else if (fam === 'ghost') {
    B[4].rotation.z = 0.3 + Math.sin(t * 3) * 0.2 + lunge * 0.8;
    B[5].rotation.z = -0.3 - Math.sin(t * 3) * 0.2;
    B[1].position.z += lunge * 0.2;
  }
  // Leuchtende Teile (Augen, Glut, Kristalle) pulsieren
  if (a.mats.glow) a.mats.glow.color.setScalar(0.75 + 0.25 * Math.sin(t * 4));
  const mat = a.mats.lit;
  if (mat) {
    if (flash > 0) mat.emissive.setRGB(flash * 0.9, flash * 0.85, flash * 0.8);
    else if (frozen) mat.emissive.setRGB(0.06, 0.14, 0.3);
    else if (e.stun > 0) mat.emissive.setRGB(0.2, 0.18, 0.02);
    else mat.emissive.setRGB(0, 0, 0);
  }
  if (posed) creatureAttackPose(a, B, fam, a.model.style, wind, atk, t, flash > 0);
}

function syncStone3(s, dt) {
  const idx = STONE_TYPES.indexOf(s.stoneType);
  const a = actorFor(entityKey(s), 'st2:' + idx, (b) => Object.assign(buildStone3(b, s.stoneType), { blob: 0.9 }));
  if (!a) return;
  resetBones(a);
  const B = a.bones;
  a.group.position.set(s.x * U3, 0, s.y * U3);
  a.group.scale.setScalar(Math.max(0.8, stoneHeight(s) * U3 / a.model.height) * 1.05);
  // Kristall schwebt leicht, pocht kurz, wenn eine Welle kommt; Splitter und Rauch kreisen langsam
  const pulse = s.crackFx ? Math.max(0, 1 - (game.time - s.crackFx) / 0.4) : 0;
  B[1].position.y = a.rest[1].y + Math.sin(game.time * 1.6 + s.x) * 0.03;
  B[1].scale.setScalar(1 + pulse * 0.08);
  B[2].rotation.y = game.time * 0.6 + s.x;
  // Risse nach Leben
  const hp = s.maxHp ? s.hp / s.maxHp : 1;
  [0.75, 0.5, 0.25].forEach((t, k) => B[3 + k].scale.setScalar(hp <= t ? 1 : 0.001));
  const flash = s.hitFlash || 0;
  if (a.mats.lit) a.mats.lit.emissive.setRGB(flash * 0.8 + pulse * 0.3, flash * 0.75 + pulse * 0.25, flash * 0.7 + pulse * 0.3);
  if (a.mats.glow) a.mats.glow.color.setScalar(0.75 + 0.25 * Math.sin(game.time * 3 + s.x) + (1 - hp) * 0.3);
}

// Diener (eigene und die der Mitspieler): steigen aus dem Boden, holen aus und schlagen oder beißen,
// springen an (Hunde); ein weicher grüner Ring zeigt, dass sie freundlich sind
function syncAlly3(al, dt) {
  const ki = allyKeyIndex3(al);
  const a = actorFor(entityKey(al), ALLY_KEYS3[ki], (b) => allyBuild3(b, ki));
  if (!a) return;
  // seit 13.94: der Koloss holt zum Bodenstampfer mit beiden Fäusten aus, sonst zum Faustschlag
  const style = a.model.style;
  if (al.kind === 'koloss') a.model.style = al.altAttack ? 'slam' : 'swing';
  animateCreature(a, al, dt, al.moving, al.attackAnim > 0 ? al.attackAnim / 0.25 : 0, 0, al.windup > 0 ? 1 - al.windup / (al.windupMax || 0.15) : 0);
  a.model.style = style;
  // beim Ausholen glüht ein Diener grün statt rot (keine Warnung, er gehört zu dir)
  // (seit 13.94 nie unter null: der Bodenstampfer des Kolosses holt länger aus als windupMax)
  if (al.windup > 0 && a.mats.lit) a.mats.lit.emissive.setRGB(0.02, 0.14 * Math.max(0, 1 - al.windup / (al.windupMax || 0.15)), 0.05);
  const k = Math.max(0, Math.min(1, (game.time - al.born) / (al.rise || 0.6)));
  const ek = easeOut(k);
  // steigt aus dem Boden, das Skelett klettert vornübergebeugt heraus
  a.group.position.y -= (1 - ek) * 0.9;
  if (al.kind === 'skelett') {
    a.group.rotation.x = 0.4 * (1 - ek);
    // Schädel weiter zur Kamera geneigt: Augenhöhlen und Zähne statt nur der Schädeldecke
    a.bones[BH.head].rotation.x -= 0.22;
  }
  if (al.leap) a.group.position.y += 0.35 * Math.sin(Math.PI * leapK(al));
  if (a.model.fly) dragonFly3(a, al, dt);
  a.group.scale.setScalar((al.scale || 1) * a.model.scale);
  if (!a.mark) {
    a.mark = groundRing(new THREE.Color('#7fe3a0'), false);
    a.mark.position.y = 0.03;
    a.mark.scale.setScalar(al.kind === 'hund' ? 0.5 : al.kind === 'drache' ? 0.55 : al.kind === 'koloss' ? 0.48 : 0.42);
    a.group.add(a.mark);
  }
  a.mark.material.opacity = 0.3 * ek;
}

function syncNpc3(n, dt) {
  let a;
  if (n.id === 'riss') {
    // Aussehen je Dungeon, der Hügel nimmt die Farbe des Bodens an
    const d = DUNGEONS[n.dungeon];
    const g = riftGround3(n);
    a = actorFor(entityKey(n), 'rift2:' + d.id + ':' + g, (b) => Object.assign(buildRift3(b, d, g), { blob: 1.1, scale: 1.15 }));
  }
  else if (n.id === 'eingang' || n.id === 'ausgang' || n.id === 'weltentor') {
    const d = n.id === 'weltentor' ? null : DUNGEONS[n.dungeon];
    // Endboss-Tor: dunkler, mit Schädel und Hörnern, größer
    const raid = n.id === 'eingang' && d.raid;
    // Höllenportal (seit 13.0): das Endboss-Tor in Riesengröße
    const hoelle = n.id === 'eingang' && d.instanz;
    const kind = raid || hoelle ? 'raid' : n.id;
    a = actorFor(entityKey(n), 'portal2:' + kind + ':' + (d ? d.id : ''), (b) => Object.assign(buildPortal3(b, kind, d), { blob: 0.01, scale: hoelle ? 3.6 : raid ? 2.0 : n.id === 'eingang' && d.inst60 ? 1.9 : n.id === 'eingang' ? 1.45 : n.id === 'weltentor' ? 1.25 : 1.1 }));
  } else a = actorFor(entityKey(n), 'npc:' + (n.art || n.id), (b) => {
    const r = buildNpc3(b, n.art || n.id);
    if (r) r.blob = 0.42;
    return r;
  });
  if (!a) return;
  const fam = a.model.family;
  if (fam === 'human') {
    if (n.wander) animateCreature(a, n, dt, n.moving, 0, 0);
    else {
      resetBones(a);
      placeActor(a, n, feetY(n));
      // Händler schauen zum Spieler, wenn er nah ist
      const p = game.player;
      let want = n.restYaw || 0;
      if (p && Math.hypot(p.x - n.x, p.y - n.y) < 140) want = Math.atan2(p.x - n.x, p.y - n.y);
      turnToward(a, want, Math.min(1, dt * 4));
      a.group.rotation.y = a.heading;
      const br = Math.sin(game.time * 2.2 + n.x);
      a.bones[BH.chest].rotation.x = br * 0.02;
      a.bones[BH.head].rotation.y = Math.sin(game.time * 0.6 + n.y) * 0.3;
    }
  } else {
    resetBones(a);
    placeActor(a, n, n.id === 'eingang' ? n.y : feetY(n));
    const t = game.time;
    if (fam === 'rift') {
      // Öffnen und Schließen wie im 2D-Bild; der Ring atmet und dreht sich im Schulterblick zur Kamera
      // (nur Ring, Schlussstein und Splitter, Hügel und Wurzeln bleiben liegen), der Schlussstein schwebt,
      // die Splitter kreisen. Der Wirbel dreht sich im Shader.
      const B = a.bones;
      const open = n.born == null ? 1 : easeOutBack(clamp01((t - n.born) / 0.8));
      a.group.scale.setScalar(a.model.scale * Math.max(0.01, open * (0.3 + 0.7 * clamp01((n.until - t) / 3))));
      B[1].rotation.set(0, V3.yaw || 0, Math.sin(t * 0.5) * 0.04);
      B[1].scale.setScalar(1 + Math.sin(t * 2) * 0.02);
      B[2].rotation.y = t * 0.5;
      B[2].position.y += Math.sin(t * 1.5) * 0.06;
      B[3].position.y += Math.sin(t * 1.6) * 0.04;
    }
    // Runen und Flammen pulsieren
    if (a.mats.glow) a.mats.glow.color.setScalar(0.8 + 0.2 * Math.sin(t * 3));
    if (a.extras) portalTick(a, t);
  }
}

// Gefallene Monster kippen um und versinken im Boden (ohne Durchsichtigkeit: keine neuen Shader)
function syncCorpse3(e) {
  const key = entityKey(e);
  // dieselbe Variante wie das lebende Monster: die Figur kommt aus dessen Pool (kein Wechsel beim Tod)
  if (e.__mk3 === undefined) {
    const kit = HEADKIT3[e.typeId];
    e.__v3 = e.v3 != null ? e.v3 : kit && kit.length > 1 ? 0 : -1;
    e.__mk3 = monKey3(e.typeId, e.__v3);
  }
  const a = actorFor(key, e.__mk3, (b) => monsterBuild(b, e.typeId, e.__v3));
  if (!a) return;
  a.corpse = true;
  // seit 14.68: Aelvyr sinkt zusammen, seine Kristalle zerspringen (aelvyr.js)
  if (a.model.aelvyr && typeof aelCorpse3 === 'function') {
    aelCorpse3(a, e);
    return;
  }
  resetBones(a);
  const k = Math.min(1, (game.time - e.start) / e.dur);
  const fall = Math.min(1, k * 2.4);
  const sink = Math.max(0, k - 0.45) / 0.55;
  a.group.position.set(e.x * U3, -sink * a.model.height * a.model.scale * 0.9, e.y * U3);
  a.group.rotation.set(0, a.heading || 0, 0);
  a.group.rotateZ(fall * (Math.PI / 2) * (e.flip ? -1 : 1) * 0.9);
  a.group.scale.setScalar(a.model.scale * (1 - sink * 0.25));
  if (a.mats.lit) a.mats.lit.emissive.setRGB(0.25 * (1 - fall), 0.2 * (1 - fall), 0.18 * (1 - fall));
}

// --- Bild der Figur für Fenster (seit 9.1) ------------------------------------------------------------
// Inventar, Schmied und „Betrachten“ zeigen die echte 3D-Figur statt der 2D-Zeichnung: eigene kleine Szene,
// gerendert in ein Bild (Render-Target) und in das Fenster-Canvas kopiert. Die Figur passt immer ganz hinein
// (Höhe und Breite), nichts wird gestaucht oder abgeschnitten. yaw dreht die Figur (Antippen dreht weiter).
const portrait3 = { scene: null, cam: null, rt: null, buf: null, img: null, actors: new Map() };
function v3Portrait(canvas, who, yaw = -0.4, pose = null) {
  if (!V3.on || !V3.gl || !canvas || !who) return false;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return false;
  const P = portrait3;
  if (!P.scene) {
    P.scene = new THREE.Scene();
    // seit 14.59 etwas weniger Licht (vorher 0,62/0,88): helle Rüstungen und Gesichter wirkten ausgefressen
    const hemi = new THREE.HemisphereLight(0xe4f2ff, 0x5a4a3a, 0.56);
    const sun = new THREE.DirectionalLight(0xfff0d4, 0.8);
    sun.position.set(-2, 5, 6);
    const fill = new THREE.DirectionalLight(0xd8e4ff, 0.18);
    fill.position.set(4, 2, 3);
    P.scene.add(hemi, sun, sun.target, fill);
    P.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  }
  const key = 'p:' + playerKey3(who);
  let a = P.actors.get(key);
  if (!a) {
    const model = model3(key, (b) => {
      const r = humanoid3(b, playerConfig3(who));
      r.blob = 0.42;
      return r;
    });
    if (!model) return false;
    a = makeActor(model);
    // Höhe und Breite der Figur (mit Waffe, Helm und Umhang) aus dem Modell
    const gl0 = model.geos.lit;
    let bb = gl0.boundingBox;
    if (!bb) {
      // ältere Modelle ohne gemerkte Maße: aus der (um 50 % vergrößerten) Hüllkugel schätzen
      const sp = gl0.boundingSphere;
      const r = sp ? sp.radius / 1.5 : 1.2;
      const c = sp ? sp.center : new THREE.Vector3(0, 1, 0);
      bb = new THREE.Box3(new THREE.Vector3(c.x - r * 0.6, 0, c.z - r * 0.6), new THREE.Vector3(c.x + r * 0.6, c.y + r, c.z + r * 0.6));
    }
    a.box = bb.clone();
    // höchstens drei Figuren behalten (eigene, Schmied-Vorschau, Betrachten)
    if (P.actors.size >= 3) {
      const [k0, a0] = P.actors.entries().next().value;
      P.scene.remove(a0.group);
      disposeActor(a0);
      P.actors.delete(k0);
    }
    P.actors.set(key, a);
  }
  for (const o of P.actors.values()) o.group.visible = o === a;
  if (!a.group.parent) P.scene.add(a.group);
  resetBones(a);
  a.bones[BH.head].rotation.x = -0.08;
  // pose: eigene Haltung (Bildtafeln der Animationen); sonst seit 13.22 eine Bereitschaftspose mit gut sichtbaren
  // Waffen wie im Charakterfenster großer MMOs (Charakterfenster, Inventar, Schmied, Betrachten)
  if (pose) pose(a.bones);
  else readyPose3(a.bones, who);
  a.group.rotation.set(0, yaw, 0);
  a.group.position.set(0, 0, 0);
  a.group.updateMatrixWorld(true);
  // Kamera so weit weg, dass die Figur in Höhe und Breite mit etwas Rand passt
  const sc = a.model.scale;
  // in der Bereitschaftspose ragen Waffen höher hinaus: oben etwas mehr Platz
  const top = a.box.max.y * sc * (pose ? 1 : 1.12);
  // Breite höchstens etwa halb so groß wie die Höhe: lange Waffen (Sense, Streitaxt) ragten in der Ruhehaltung weit
  // nach vorn und machten die Figur winzig; in der Bereitschaftspose (13.22) stehen sie aufrecht
  const half = Math.min(Math.max(-a.box.min.x, a.box.max.x, -a.box.min.z, a.box.max.z) * sc, top * (pose ? 1 : 0.42));
  const dpr = Math.min(2, window.devicePixelRatio || 1) * 1.5;
  const W = Math.min(1024, Math.round(w * dpr));
  const H = Math.min(1024, Math.round(h * dpr));
  const cam = P.cam;
  cam.aspect = W / H;
  const t = Math.tan((cam.fov * Math.PI) / 360);
  // seit 14.53: Bildausschnitt nach der Figur in Normalgröße (plus Rand für 110 %), damit die gewählte Körpergröße in der
  // Vorschau zu sehen ist (90 % wirkt kleiner, 110 % füllt das Bild)
  const fr = 1.06 / lookSize(lookOf({ ap: who.look }, who.classId));
  const topF = top * fr;
  const halfF = half * fr;
  const dist = Math.max((topF * 1.08) / (2 * t), (halfF * 2.0) / (2 * t * cam.aspect)) + halfF * 0.6;
  const cy = topF * 0.5;
  cam.position.set(0, cy + dist * 0.12, dist);
  cam.lookAt(0, cy, 0);
  cam.updateProjectionMatrix();
  if (!P.rt || P.rt.width !== W || P.rt.height !== H) {
    if (P.rt) P.rt.dispose();
    P.rt = new THREE.WebGLRenderTarget(W, H);
    P.buf = new Uint8Array(W * H * 4);
    P.img = document.createElement('canvas');
    P.img.width = W;
    P.img.height = H;
  }
  const gl = V3.gl;
  const prevRT = gl.getRenderTarget();
  const prevColor = gl.getClearColor(new THREE.Color());
  const prevAlpha = gl.getClearAlpha();
  const prevShadow = gl.shadowMap.enabled;
  gl.shadowMap.enabled = false;
  gl.setRenderTarget(P.rt);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(P.scene, cam);
  gl.readRenderTargetPixels(P.rt, 0, 0, W, H, P.buf);
  gl.setRenderTarget(prevRT);
  gl.setClearColor(prevColor, prevAlpha);
  gl.shadowMap.enabled = prevShadow;
  // Zeilen umdrehen (WebGL zählt von unten)
  const ix = P.img.getContext('2d');
  const id = ix.createImageData(W, H);
  const row = W * 4;
  for (let y = 0; y < H; y++) id.data.set(P.buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  ix.putImageData(id, 0, 0);
  // ins Fenster: Hintergrund in der Klassenfarbe, darüber die Figur
  const cd = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * cd);
  canvas.height = Math.round(h * cd);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(cd, 0, 0, cd, 0, 0);
  const trim = hexRgb(CLASSES[who.classId].trim);
  const g = ctx.createRadialGradient(w / 2, h * 0.62, 4, w / 2, h * 0.55, Math.max(w, h) * 0.65);
  g.addColorStop(0, `rgba(${trim},0.38)`);
  g.addColorStop(1, `rgba(${trim},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(P.img, 0, 0, w, h);
  return true;
}
