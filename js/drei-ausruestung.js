// Ausrüstung in 3D (seit Version 7.9): Jedes Teil hat je Stufe ein eigenes Merkmal, das die Silhouette
// verändert – nicht nur eine andere Farbe (Bauplan: docs/grafik-prompts.md, Abschnitt 4).
// Stufen: 0 Grund (Leder), 1 Solide (Bronze), 2 Gut (Mond), 3 Selten (Drache), 4 Legendär (Seele),
// 5 Mythisch (Asche), 6 Himmlisch (Federn, Sterne), 7 Göttlich (Gold, Sonne),
// seit 13.53: 8 Abgründig (Leere: Obsidianviolett, Tentakel, Splitter und Leerenauge, cyanfarbenes Leuchten),
// 9 Ewig (Sternenfeuer: Platin und Roségold, achtstrahlige Sterne, Prismensteine).
//
// humanoid3 baut den Körper und ruft danach c.gear(A, g) auf; g enthält die Maße der Figur
// (Hüfte, Brust, Schultern, Hals, Kopf). Hier entstehen Schultern, Stiefel, Gürtel, Umhang, Rüstung,
// Kopfbedeckung, Schild und Waffen. Kleinteile haben wenige Segmente (Leistungsregeln, Abschnitt 7).

// Leuchtfarbe je Stufe (ab Mond)
const GLOW3 = [null, null, '#9be2ff', '#ff4a3a', '#c08aff', '#ff7a2a', '#bff4ff', '#fff2b0', '#5ee8ff', '#ffb8e0'];
// Grundtöne der Motive
const GOLD3 = '#e8c46a';
const OBSIDIAN3 = '#2a2224';
const BONE3 = '#e8e0cc';
const FEATHER3 = '#f4f8ff';
// Abgrund (seit 13.53): Leerenobsidian, violetter Stahl, cyanfarbenes und violettes Leuchten
const VOID3 = '#1c1432';
const VOIDMETAL3 = '#3a2e66';
const VOIDGLOW3 = '#5ee8ff';
const VOIDVIOLET3 = '#a45cff';
// Ewigkeit (seit 13.53): Platin, Roségold, roséfarbenes Sternenfeuer und Prismenfarben
const PLATIN3 = '#bcb8d0';
const ROSEGOLD3 = '#e2957c';
const ROSEGLOW3 = '#ffb8e0';
const PRISM3 = ['#ff9ad5', '#ffe59a', '#9affd8', '#9ad8ff', '#c8a8ff'];

// --- Formen ------------------------------------------------------------------------------------

const G3 = {
  // Feder: flaches Blatt von y = 0 bis y = 1
  feather: () => geo3('g3feather', () => new THREE.SphereGeometry(0.5, 8, 5).scale(0.24, 1, 0.07).translate(0, 0.5, 0)),
  // Kristall: Doppelpyramide
  gem: () => geo3('g3gem', () => new THREE.OctahedronGeometry(1, 0)),
  // Scheibe in der xy-Ebene (schaut nach +z)
  disc: () => geo3('g3disc', () => new THREE.CylinderGeometry(1, 1, 0.14, 16).rotateX(Math.PI / 2)),
  // Strahl, Dorn, Zacke: Kegel entlang +y mit Länge 1
  ray: () => horn3(1, 0.13, 5),
  spike: () => horn3(1, 0.24, 5),
  // Schuppe: flache halbe Kugel
  scale: () => geo3('g3scale', () => new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1.2)),
  // Wölkchen, Perle, Kugel mit wenig Segmenten
  puff: () => sphere3(1, 8, 6)
};

// Teile in einem eigenen Rahmen (Lage, Drehung, Größe) an einem Knochen
function frame3(A, bone, at, rot = [0, 0, 0], s = 1) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(s, s, s));
  return (geo, color, o = {}) => A(geo, color, Object.assign({}, o, { bone, m: M.clone().multiply(partMatrix(o)) }));
}

// Unterrahmen in einem Rahmen (z. B. ein Wappen schräg auf der Brust)
function sub3(W, at, rot = [0, 0, 0], s = 1) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
  return (geo, color, o = {}) => W(geo, color, Object.assign({}, o, { m: M.clone().multiply(partMatrix(o)) }));
}

// Kegel von at aus in Richtung dir (Hörner, Dornen, Strahlen)
const _gUp = new THREE.Vector3(0, 1, 0);
function coneAlong(W, geo, at, dir, len, w, color, o = {}) {
  const d = new THREE.Vector3(...dir).normalize();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromUnitVectors(_gUp, d), new THREE.Vector3(w, len, w));
  W(geo, color, Object.assign({}, o, { m }));
}

// --- Motive ------------------------------------------------------------------------------------

// Gebogenes Horn aus Gliedern mit Spitze: pts = Mittelpunkte vom Ansatz zur Spitze
function curvedHorn3(W, pts, r, color, o = {}) {
  for (let i = 0; i < pts.length - 2; i++) limbBetween(W, pts[i], pts[i + 1], r * (1 - i * 0.22), r * (1 - (i + 1) * 0.22), color, Object.assign({ seg: 6 }, o));
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  coneAlong(W, horn3(1, 1, 6), a, dir, Math.hypot(...dir), r * (1 - (pts.length - 2) * 0.22), color, o);
}

// Flügel aus n Federn, vom Ansatz fächerförmig nach oben und außen (side ±1); tilt neigt nach hinten (−) oder vorn (+)
function wing3(W, at, side, n, len, color, tip, o = {}, tilt = -0.35) {
  for (let k = 0; k < n; k++) {
    W(G3.feather(), k % 2 ? lighter(color, 0.12) : color, Object.assign({
      p: at, r: [tilt - k * 0.12 * Math.sign(-tilt || 1), 0, -side * (0.25 + k * 0.38)], s: len * (1 - k * 0.13), top: tip || lighter(color, 0.3), topK: 0.45
    }, o));
  }
}

// Mondsichel in der xy-Ebene: Mitte des Bogens zeigt in Richtung ang, Spannweite span
function crescent3(W, at, r, t, ang, span, color, o = {}) {
  W(torus3(r, t, span, 4, 14), color, Object.assign({ p: at, r: [0, 0, ang - span / 2], shine: 1 }, o));
}

// Sonnenscheibe mit Strahlenkranz (schaut nach +z)
function sun3(W, at, r, rays, color, glow, o = {}) {
  W(G3.disc(), color, Object.assign({ p: at, s: [r, r, 1], shine: 1, top: lighter(color, 0.3), topK: 0.4 }, o));
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2 + Math.PI / 2;
    W(G3.ray(), k % 2 ? color : lighter(color, 0.2), Object.assign({ p: [at[0] + Math.cos(a) * r * 0.9, at[1] + Math.sin(a) * r * 0.9, at[2]], r: [0, 0, a - Math.PI / 2], s: r * (k % 2 ? 0.55 : 0.8), shine: 1 }, o));
  }
  if (glow) W(G3.gem(), glow, Object.assign({ p: [at[0], at[1], at[2] + 0.012], s: [r * 0.32, r * 0.32, r * 0.2], mat: 'glow' }, o));
}

// Schwebender Kristall mit Leuchtring
function floatGem3(W, at, size, color, o = {}) {
  W(G3.gem(), color, Object.assign({ p: at, s: [size, size * 1.6, size], mat: 'glow' }, o));
  W(torus3(size * 1.7, size * 0.12, Math.PI * 2, 3, 14), color, Object.assign({ p: [at[0], at[1] - size * 0.2, at[2]], r: [Math.PI / 2 - 0.25, 0, 0], mat: 'glow' }, o));
}

// Gezackte Obsidianzacke mit Glut im Kern
function emberSpike3(W, at, dir, len, w, o = {}) {
  coneAlong(W, G3.spike(), at, dir, len, w, OBSIDIAN3, Object.assign({ shine: 0.6 }, o));
  coneAlong(W, G3.spike(), at, dir, len * 0.62, w * 0.45, '#ff7a2a', Object.assign({}, o, { mat: 'glow' }));
}

// Kleiner Schädel (schaut nach +z)
function skull3(W, at, s, eye, o = {}) {
  W(ball(10), BONE3, Object.assign({ p: at, s: [s, s * 0.92, s * 0.95], shade: 0.2 }, o));
  W(roundBox(s * 1.1, s * 0.5, s * 0.9, s * 0.2), BONE3, Object.assign({ p: [at[0], at[1] - s * 0.72, at[2] + s * 0.1] }, o));
  for (const sx of [-1, 1]) W(sphere3(s * 0.26, 6, 4), eye || '#1a1210', Object.assign({ p: [at[0] + sx * s * 0.36, at[1] - s * 0.05, at[2] + s * 0.82], mat: eye ? 'glow' : 'lit' }, o));
}

// Vierzackiger Stern (schaut nach +z)
function star3(W, at, s, color, o = {}) {
  for (const a of [0, Math.PI / 2]) W(roundBox(s * 0.28, s * 2, s * 0.2, s * 0.12), color, Object.assign({ p: at, r: [0, 0, a + Math.PI / 4], mat: 'glow' }, o));
  W(G3.gem(), '#ffffff', Object.assign({ p: at, s: [s * 0.45, s * 0.45, s * 0.3], mat: 'glow' }, o));
}

// Leerensplitter (Abgrund): dunkler Kristall, aus dem ein längerer, dünner Leuchtkern an beiden Spitzen hervortritt
function voidShard3(W, at, dir, len, w, o = {}) {
  coneAlong(W, G3.gem(), at, dir, len, w, VOID3, Object.assign({ shine: 0.9, top: VOIDMETAL3, topK: 0.5 }, o));
  coneAlong(W, G3.gem(), at, dir, len * 1.3, w * 0.3, VOIDGLOW3, Object.assign({}, o, { mat: 'glow' }));
}

// Leerenauge (Abgrund, schaut nach +z): dunkle Mandel mit violettem Rand, cyanfarbene Iris, senkrechte Schlitzpupille
function voidEye3(W, at, r, o = {}) {
  const [x, y, z] = at;
  W(ball(10), VOID3, Object.assign({ p: at, s: [r * 1.5, r * 0.78, r * 0.4], shine: 0.8 }, o));
  W(torus3(r, r * 0.11, Math.PI * 2, 3, 18), VOIDVIOLET3, Object.assign({ p: [x, y, z + r * 0.12], s: [1.5, 0.8, 1], mat: 'glow' }, o));
  W(ball(10), VOIDGLOW3, Object.assign({ p: [x, y, z + r * 0.22], s: [r * 0.62, r * 0.62, r * 0.24], mat: 'glow' }, o));
  W(ball(8), '#06040c', Object.assign({ p: [x, y, z + r * 0.4], s: [r * 0.13, r * 0.52, r * 0.1] }, o));
}

// Achtstrahliger Stern (Ewigkeit, schaut nach +z): vier lange Platinstrahlen, vier kurze aus Roségold,
// Roségoldring und ein roséfarbener Kern
function nova3(W, at, r, o = {}) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 2;
    const long = k % 2 === 0;
    coneAlong(W, G3.ray(), [at[0] + Math.cos(a) * r * 0.18, at[1] + Math.sin(a) * r * 0.18, at[2]], [Math.cos(a), Math.sin(a), 0], r * (long ? 0.95 : 0.55), r * (long ? 1.25 : 0.95), long ? PLATIN3 : ROSEGOLD3, Object.assign({ shine: 1 }, o));
  }
  W(torus3(r * 0.38, r * 0.05, Math.PI * 2, 3, 16), ROSEGOLD3, Object.assign({ p: at, shine: 1 }, o));
  W(G3.gem(), ROSEGLOW3, Object.assign({ p: [at[0], at[1], at[2] + r * 0.04], s: [r * 0.22, r * 0.22, r * 0.16], mat: 'glow' }, o));
}

// Kleine Prismensteine im Kreis (Ewigkeit), in der xy-Ebene um at
function prismRing3(W, at, r, n, size, o = {}) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.PI / 2;
    W(G3.gem(), PRISM3[k % PRISM3.length], Object.assign({ p: [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2]], s: [size, size * 1.5, size], mat: 'glow' }, o));
  }
}

// Tentakel (Abgrund): eingerolltes Horn aus Leerenobsidian mit leuchtender Spitze
function tendril3(W, pts, r, o = {}) {
  curvedHorn3(W, pts, r, VOID3, Object.assign({ shine: 0.6 }, o));
  W(sphere3(r * 0.45, 6, 4), VOIDGLOW3, { p: pts[pts.length - 1], mat: 'glow' });
}

// Flamme: äußere Zunge und heller Kern
function flame3(W, at, dir, len, w, outer, inner, o = {}) {
  coneAlong(W, horn3(1, 0.3, 6), at, dir, len, w, outer, Object.assign({}, o, { mat: 'glow' }));
  coneAlong(W, horn3(1, 0.3, 6), at, dir, len * 0.6, w * 0.5, inner, Object.assign({}, o, { mat: 'glow' }));
}

// --- Schultern -----------------------------------------------------------------------------------
// Grundform je Klasse baut humanoid3 (Platte, Lederkappe, Stoffmantel, Schädel); hier sitzt das Merkmal der Stufe darauf.

const PAD3_R = { krieger: 0.16, ninja: 0.1, schamane: 0.13, nekromant: 0.1, magier: 0.12 };

function gearShoulders3(A, g, t, cls) {
  if (t < 0) return;
  // seit 13.17 sitzen die Merkmale auf dem größeren Panzer (PAULDRON_BIG, drei-figuren.js)
  // seit 13.36 je Klasse: nur der Krieger groß, die anderen schmaler und mit kleineren Merkmalen
  const big = typeof pauldronBig === 'function' ? pauldronBig(cls) : 1;
  const R = (PAD3_R[cls] || 0.12) * big * (cls === 'krieger' ? 1 : 0.85);
  const metal = TIER_METAL[t];
  for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) {
    const pp = [sx * (g.shX + R * 0.3), g.shY + R * 0.32 + (cls === 'nekromant' ? 0.02 : 0), 0];
    const W = frame3(A, ab, pp, [0, 0, -sx * 0.35]);
    const X = sx;
    switch (t) {
      case 0:
        // Riemen um den Oberarm und eine Naht über die Kappe
        W(torus3(R * 0.62, 0.011, Math.PI * 2, 3, 12), '#4a3020', { p: [X * R * 0.1, -R * 0.75, 0], r: [Math.PI / 2, 0, 0] });
        W(roundBox(0.012, 0.016, R * 1.7, 0.006), '#3a2618', { p: [0, R * 0.78, 0] });
        break;
      case 1:
        // zweite Lage darunter und eine Nietenreihe am Rand
        W(cap3(R * 0.92, Math.PI * 0.5, 0, Math.PI * 2, 12, 5), lighter(TIER_ACCENT[1], 0.25), { p: [X * R * 0.32, -R * 0.42, 0], s: [1, 0.55, 1.05], r: [0, 0, -X * 0.35], shine: 0.6 });
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          W(sphere3(R * 0.09, 6, 4), metal, { p: [Math.cos(a) * R * 0.92, R * 0.12, Math.sin(a) * R * 0.92], shine: 1 });
        }
        break;
      case 2:
        // Mondsichel: ein Bogen steigt vom äußeren Rand nach oben
        crescent3(W, [X * R * 0.45, R * 0.5, 0], R * 1.05, R * 0.12, X > 0 ? -Math.PI / 4 : Math.PI * 1.25, Math.PI * 1.15, metal);
        W(torus3(R * 0.98, R * 0.07, Math.PI * 2, 3, 16), metal, { p: [0, R * 0.08, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
        break;
      case 3: {
        // Drachenschuppen und zwei Hörner nach hinten oben
        for (let k = 0; k < 3; k++) W(G3.scale(), k % 2 ? TIER_ACCENT[3] : lighter(TIER_ACCENT[3], 0.15), { p: [X * R * (0.2 + k * 0.25), R * (0.75 - k * 0.38), 0], s: R * (0.85 - k * 0.1), r: [0, 0, -X * (0.4 + k * 0.25)], shine: 0.6 });
        for (const dz of [-0.4, 0.15]) curvedHorn3(W, [[X * R * 0.2, R * 0.6, R * dz], [X * R * 0.55, R * 1.35, R * (dz - 0.35)], [X * R * 0.7, R * 1.85, R * (dz - 1.05)], [X * R * 0.6, R * 2.05, R * (dz - 1.6)]], R * 0.16, '#e8dcc0', { shine: 0.5 });
        break;
      }
      case 4:
        // schwebender Seelenkristall und eine Spiralrune auf der Platte
        floatGem3(W, [X * R * 0.15, R * 1.75, 0], R * 0.28, GLOW3[4]);
        W(torus3(R * 0.55, R * 0.05, Math.PI * 1.6, 3, 14), GLOW3[4], { p: [0, R * 0.62, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
        W(torus3(R * 0.3, R * 0.05, Math.PI * 1.6, 3, 10), GLOW3[4], { p: [0, R * 0.66, 0], r: [Math.PI / 2, 0, 1.8], mat: 'glow' });
        break;
      case 5:
        // drei gezackte Obsidianzacken mit Glut
        emberSpike3(W, [X * R * 0.1, R * 0.6, -R * 0.25], [X * 0.35, 1, -0.2], R * 1.5, R * 0.42);
        emberSpike3(W, [X * R * 0.45, R * 0.45, R * 0.15], [X * 0.9, 0.8, 0.15], R * 1.15, R * 0.36);
        emberSpike3(W, [X * R * 0.55, R * 0.25, -R * 0.45], [X * 0.8, 0.5, -0.6], R * 0.95, R * 0.32);
        break;
      case 6:
        // kleiner Federflügel
        wing3(W, [X * R * 0.2, R * 0.55, -R * 0.2], X, 3, R * 2.6, FEATHER3, '#bfe8ff');
        break;
      case 8:
        // Leerensplitter wachsen schräg aus der Platte, außen öffnet sich ein Leerenauge
        voidShard3(W, [X * R * 0.1, R * 0.95, -R * 0.15], [X * 0.3, 1, -0.25], R * 1.0, R * 0.32);
        voidShard3(W, [X * R * 0.55, R * 0.72, R * 0.2], [X * 0.9, 0.8, 0.2], R * 0.75, R * 0.26);
        voidShard3(W, [X * R * 0.5, R * 0.6, -R * 0.5], [X * 0.7, 0.6, -0.6], R * 0.6, R * 0.22);
        voidEye3(sub3(W, [X * R * 0.82, R * 0.36, R * 0.36], [0, X * 0.95, 0]), [0, 0, 0], R * 0.24);
        break;
      case 9:
        // Platinplatte mit Roségoldkante, außen ein achtstrahliger Stern, Prismensteine auf dem Grat
        W(cap3(R * 1.1, Math.PI * 0.5, 0, Math.PI * 2, 14, 5), PLATIN3, { p: [0, R * 0.05, 0], s: [1, 0.72, 1.08], shine: 1, top: '#f0eef8', topK: 0.35 });
        W(torus3(R * 1.08, R * 0.07, Math.PI * 2, 3, 18), ROSEGOLD3, { p: [0, R * 0.06, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
        nova3(sub3(W, [X * R * 0.98, R * 0.4, R * 0.1], [0, X * Math.PI / 2, 0]), [0, 0, 0], R * 0.8);
        for (let k = 0; k < 3; k++) W(G3.gem(), PRISM3[k + 1], { p: [X * R * (0.15 + k * 0.24), R * (0.82 - k * 0.14), -R * 0.2 + k * R * 0.2], s: [R * 0.09, R * 0.14, R * 0.09], mat: 'glow' });
        break;
      default:
        // breite Goldplatte mit Strahlenkranz und Sonnenstein
        W(cap3(R * 1.12, Math.PI * 0.5, 0, Math.PI * 2, 14, 5), GOLD3, { p: [0, R * 0.05, 0], s: [1, 0.7, 1.08], shine: 1, top: '#fff2b0', topK: 0.4 });
        for (let k = 0; k < 5; k++) {
          const a = -0.9 + k * 0.45;
          coneAlong(W, G3.ray(), [X * R * 0.9 * Math.cos(a * 0.3), R * 0.15, R * Math.sin(a)], [X * Math.cos(a), 0.5, Math.sin(a)], R * (k % 2 ? 0.75 : 1.05), R * 0.9, '#fff2b0', { shine: 1 });
        }
        W(G3.gem(), GLOW3[7], { p: [X * R * 0.55, R * 0.55, R * 0.3], s: [R * 0.18, R * 0.24, R * 0.18], mat: 'glow' });
    }
  }
}

// --- Stiefel -----------------------------------------------------------------------------------

function gearBoots3(A, g, t) {
  if (t < 0) return;
  const lr = g.legR;
  const metal = TIER_METAL[t];
  const boot = GEAR_LOOK.boots[t];
  // vor dem Schienbein: über den Beinschienen der Rüstung, falls getragen
  const shin = lr * (g.greaves ? 1.42 : 0.95);
  for (const [sx, bone] of [[1, BH.legL], [-1, BH.legR]]) {
    const x = sx * g.hipX;
    const W = frame3(A, bone, [x, 0, 0]);
    switch (t) {
      case 0:
        // Stoffwickel um den Knöchel
        for (let k = 0; k < 3; k++) W(torus3(lr * 1.08, 0.012, Math.PI * 2, 3, 12), '#d8ccb0', { p: [0, 0.07 + k * 0.045, 0.005], r: [Math.PI / 2 + (k % 2 ? 0.25 : -0.25), 0, 0] });
        break;
      case 1:
        // umgeschlagene Stulpe
        W(lathe3('cuffflare', [[1.15, 0], [1.45, 0.07], [1.38, 0.08], [0, 0.081]], 12), lighter(boot, 0.18), { p: [0, 0.19, 0], s: [lr, 1, lr], shade: 0.2 });
        break;
      case 2:
        // Schnürung vorn und eine Eisenkappe an der Spitze
        for (let k = 0; k < 3; k++) for (const r of [0.6, -0.6]) W(roundBox(0.008, 0.045, 0.006, 0.003), '#e8dcc0', { p: [0, 0.09 + k * 0.035, lr * 1.0], r: [0, 0, r] });
        W(cap3(lr * 0.75, Math.PI * 0.5, 0, Math.PI * 2, 10, 4), metal, { p: [0, 0.03, lr * 1.65], s: [1.1, 0.8, 0.9], shine: 1 });
        break;
      case 3:
        // Krallenzehen und Schuppen am Schienbein
        for (let k = -1; k <= 1; k++) coneAlong(W, horn3(1, 0.3, 5), [k * lr * 0.45, 0.04, lr * 1.85], [k * 0.25, -0.2, 1], lr * 0.9, lr * 0.4, '#e8dcc0', { shine: 0.6 });
        for (let k = 0; k < 2; k++) W(G3.scale(), k ? TIER_ACCENT[3] : lighter(TIER_ACCENT[3], 0.15), { p: [0, 0.16 + k * 0.06, shin], s: lr * 0.8, r: [Math.PI / 2 - 0.25, 0, 0], shine: 0.6 });
        break;
      case 4:
        // schwebender Leuchtring am Knöchel
        W(torus3(lr * 1.75, 0.012, Math.PI * 2, 3, 16), GLOW3[4], { p: [0, 0.14, 0], r: [Math.PI / 2 - 0.2, 0, 0.1], mat: 'glow' });
        W(G3.gem(), GLOW3[4], { p: [sx * lr * 1.2, 0.15, 0], s: [0.018, 0.03, 0.018], mat: 'glow' });
        break;
      case 5:
        // Obsidiandornen am Schienbein, glühende Sohlenkante
        emberSpike3(W, [0, 0.15, shin], [0, 0.6, 1], lr * 1.2, lr * 0.5);
        emberSpike3(W, [sx * lr * 0.7, 0.2, lr * 0.4], [sx, 0.5, 0.4], lr * 0.9, lr * 0.4);
        W(roundBox(lr * 2.1, 0.012, lr * 3.3, 0.005), '#ff7a2a', { p: [0, 0.035, lr * 0.5], mat: 'glow' });
        break;
      case 6:
        // kleine Flügel außen am Knöchel
        wing3(W, [sx * lr * 1.0, 0.13, -lr * 0.3], sx, 3, 0.13, FEATHER3, '#bfe8ff');
        break;
      case 8:
        // Leerensplitter am Schienbein, cyanfarbene Sohlenkante, eingerollter Tentakelsporn an der Ferse
        voidShard3(W, [0, 0.17, shin + 0.01], [0, 0.7, 1], lr * 1.3, lr * 0.42);
        voidShard3(W, [sx * lr * 0.8, 0.22, lr * 0.3], [sx, 0.6, 0.2], lr * 0.9, lr * 0.32);
        W(roundBox(lr * 2.1, 0.012, lr * 3.3, 0.005), VOIDGLOW3, { p: [0, 0.035, lr * 0.5], mat: 'glow' });
        tendril3(W, [[0, 0.07, -lr * 0.85], [0, 0.05, -lr * 1.6], [0, 0.1, -lr * 2.2], [0, 0.16, -lr * 2.05]], lr * 0.24);
        break;
      case 9:
        // Platinschiene mit Stern am Knie, Strahlen am Knöchel, roséfarben leuchtende Sohle
        W(cap3(lr * (g.greaves ? 1.32 : 1.22), Math.PI * 0.62, -Math.PI * 0.5, Math.PI, 10, 5), PLATIN3, { p: [0, 0.2, 0], s: [1, 2.3, 1.1], r: [Math.PI / 2, 0, 0], shine: 1, top: '#f0eef8', topK: 0.35 });
        nova3(W, [0, g.hipY - g.legLen * 0.5 + 0.01, lr * (g.greaves ? 1.6 : 1.3)], lr * 0.62);
        for (const a of [0.35, 0.85]) coneAlong(W, G3.ray(), [sx * lr * 1.0, 0.13, -lr * 0.1], [sx * Math.cos(a), Math.sin(a), -0.35], lr * 1.25, lr * 1.6, a < 0.5 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
        W(roundBox(lr * 2.1, 0.012, lr * 3.3, 0.005), ROSEGLOW3, { p: [0, 0.035, lr * 0.5], mat: 'glow' });
        break;
      default:
        // goldene Beinschiene mit Sonnenscheibe am Knie
        W(cap3(lr * (g.greaves ? 1.32 : 1.22), Math.PI * 0.62, -Math.PI * 0.5, Math.PI, 10, 5), GOLD3, { p: [0, 0.2, 0], s: [1, 2.3, 1.1], r: [Math.PI / 2, 0, 0], shine: 1, top: '#fff2b0', topK: 0.4 });
        sun3(W, [0, g.hipY - g.legLen * 0.5 + 0.01, lr * (g.greaves ? 1.55 : 1.25)], lr * 0.5, 6, GOLD3, GLOW3[7]);
    }
  }
}

// --- Gürtel ------------------------------------------------------------------------------------

function gearBelt3(A, g, t) {
  if (t < 0) return;
  // g.beltY / g.beltZ: Mitte vorn am Gürtel (bei Roben an der Schärpe)
  const W = frame3(A, BH.hips, [0, g.beltY, g.beltZ]);
  const metal = TIER_METAL[t];
  switch (t) {
    case 0:
      // Knoten mit zwei hängenden Enden
      W(ball(8), '#c8b890', { s: [0.035, 0.03, 0.025] });
      for (const s of [-1, 1]) W(roundBox(0.03, 0.11, 0.008, 0.004), '#c8b890', { p: [s * 0.022, -0.065, 0.005], r: [0.1, 0, s * 0.25] });
      break;
    case 1:
      // eckige Bronzeschnalle und eine Tasche auf der anderen Seite
      W(roundBox(0.075, 0.06, 0.02, 0.01), metal, { shine: 1 });
      W(roundBox(0.045, 0.03, 0.022, 0.006), darker(metal, 0.35), {});
      W(roundBox(0.075, 0.08, 0.05, 0.02), '#5a3a22', { p: [0.15, -0.05, -0.07], r: [0, -0.6, 0] });
      W(roundBox(0.078, 0.03, 0.052, 0.012), '#4a2e1a', { p: [0.15, -0.02, -0.068], r: [0, -0.6, 0] });
      break;
    case 2:
      // Kettenbögen hängen vorn
      for (const s of [-1, 1]) {
        W(torus3(0.055, 0.007, Math.PI, 3, 10), metal, { p: [s * 0.07, -0.005, 0], r: [0, 0, Math.PI], shine: 1 });
        W(torus3(0.012, 0.005, Math.PI * 2, 3, 8), metal, { p: [s * 0.07, -0.06, 0.004], shine: 1 });
      }
      W(roundBox(0.06, 0.05, 0.018, 0.012), metal, { shine: 1 });
      break;
    case 3:
      // Drachenkopfschnalle mit roten Augen
      W(ball(8), TIER_ACCENT[3], { s: [0.045, 0.04, 0.035], shine: 0.6 });
      W(ball(8), TIER_ACCENT[3], { p: [0, -0.015, 0.03], s: [0.028, 0.02, 0.03], shine: 0.6 });
      for (const s of [-1, 1]) {
        coneAlong(W, horn3(1, 0.25, 5), [s * 0.025, 0.025, -0.005], [s * 0.6, 1, -0.4], 0.05, 0.05, '#e8dcc0');
        W(sphere3(0.008, 6, 4), GLOW3[3], { p: [s * 0.018, 0.005, 0.032], mat: 'glow' });
      }
      break;
    case 4:
      // leuchtende Kristallschnalle mit zwei Ketten
      W(torus3(0.032, 0.008, Math.PI * 2, 3, 12), metal, { shine: 1 });
      W(G3.gem(), GLOW3[4], { s: [0.022, 0.032, 0.014], mat: 'glow' });
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) W(sphere3(0.008, 6, 4), metal, { p: [s * (0.04 + k * 0.012), -0.02 - k * 0.018, 0], shine: 1 });
      break;
    case 5:
      // Schädelschnalle mit Glutaugen
      skull3(W, [0, 0, 0], 0.035, '#ff7a2a');
      break;
    case 6:
      // Federn und Bänder hängen herab
      for (const s of [-1, 1]) {
        W(G3.feather(), FEATHER3, { p: [s * 0.09, -0.01, -0.01], r: [Math.PI - 0.15, 0, s * 0.2], s: 0.13, top: '#bfe8ff', topK: 0.5 });
        W(roundBox(0.022, 0.12, 0.006, 0.003), '#9fd0ff', { p: [s * 0.05, -0.065, 0.004], r: [0.08, 0, s * 0.12] });
      }
      W(sphere3(0.018, 8, 6), '#bfe8ff', { mat: 'glow' });
      break;
    case 8:
      // Leerenauge als Schnalle, darunter hängen drei Splitter
      voidEye3(W, [0, 0, 0.006], 0.026);
      for (const sx of [-1, 0, 1]) voidShard3(W, [sx * 0.042, -0.065 - (sx ? 0 : 0.02), -0.002], [sx * 0.2, -1, 0.05], 0.045, 0.016);
      break;
    case 9:
      // Sternschnalle, darunter hängen Prismensteine an Roségoldgliedern
      nova3(W, [0, 0, 0.008], 0.045);
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * 0.042;
        const y = -0.05 - (k % 3 ? 0.012 : 0);
        W(sphere3(0.008, 6, 4), ROSEGOLD3, { p: [x, y + 0.02, -0.004], shine: 1 });
        W(G3.gem(), PRISM3[k], { p: [x, y - 0.006, -0.004], s: [0.009, 0.015, 0.009], mat: 'glow' });
      }
      break;
    default:
      // Sonnenschnalle und hängende Goldplättchen
      sun3(W, [0, 0, 0.004], 0.032, 8, GOLD3, GLOW3[7]);
      for (const s of [-1, 0, 1]) W(roundBox(0.04, 0.06, 0.008, 0.004), GOLD3, { p: [s * 0.055, -0.07, -0.004], r: [0.08, 0, s * 0.2], shine: 1 });
  }
}

// --- Umhang ------------------------------------------------------------------------------------
// Gebogenes Tuch hinter dem Rücken; je Stufe andere Länge, Weite und Saumform.

const CAPE3 = [
  { len: 0.46, r2: 0.3, edge: 'plain' },
  { len: 0.6, r2: 0.33, edge: 'point' },
  { len: 0.72, r2: 0.34, edge: 'split' },
  { len: 0.72, r2: 0.37, edge: 'wing' },
  { len: 0.68, r2: 0.34, edge: 'plain' },
  { len: 0.7, r2: 0.36, edge: 'tatter' },
  { len: 0.62, r2: 0.34, edge: 'scallop' },
  { len: 0.86, r2: 0.4, edge: 'plain' },
  // seit 13.53: Abgrund mit Fangsaum (lange und kurze Spitzen im Wechsel), Ewigkeit lang mit Kronensaum (Spitze in der Mitte)
  { len: 0.8, r2: 0.38, edge: 'fangs' },
  { len: 0.9, r2: 0.42, edge: 'crown' }
];
const CAPE3_ARC = 1.9;
const CAPE3_SEG = 14;

// Saumverlauf: wie weit der untere Rand an der Stelle u (0 … 1 über die Breite) nach oben (+) oder unten (−) geht
function capeEdge3(edge, u, i, len) {
  switch (edge) {
    case 'point': return -(1 - Math.abs(2 * u - 1)) * 0.1;
    case 'split': return Math.max(0, 0.2 - Math.abs(u - 0.5) * 1.5) * len;
    case 'wing': return -Math.pow(1 - Math.abs(Math.sin(u * Math.PI * 3)), 3) * 0.13;
    case 'tatter': return -((i * 7919) % 11) / 11 * 0.13 - (i % 2 ? 0 : 0.04);
    case 'scallop': return -Math.abs(Math.sin(u * Math.PI * 4)) * 0.07;
    case 'fangs': return i % 2 ? -0.02 : -0.15 - (i % 4 ? 0 : 0.05);
    case 'crown': return -(1 - Math.abs(2 * u - 1)) * 0.14 - Math.abs(Math.sin(u * Math.PI * 3)) * 0.05;
    default: return 0;
  }
}

function capeGeo3(spec, inner) {
  return geo3(`cape3:${spec.len},${spec.r2},${spec.edge},${inner ? 1 : 0}`, () => {
    const r1 = inner ? 0.21 : 0.225;
    const r2 = spec.r2 - (inner ? 0.015 : 0);
    const hs = 4;
    const g = new THREE.CylinderGeometry(r1, r2, spec.len, CAPE3_SEG, hs, true, Math.PI - CAPE3_ARC / 2, CAPE3_ARC);
    const P = g.attributes.position;
    for (let ix = 0; ix <= CAPE3_SEG; ix++) {
      const dy = capeEdge3(spec.edge, ix / CAPE3_SEG, ix, spec.len);
      P.setY(hs * (CAPE3_SEG + 1) + ix, P.getY(hs * (CAPE3_SEG + 1) + ix) + dy);
      P.setY((hs - 1) * (CAPE3_SEG + 1) + ix, P.getY((hs - 1) * (CAPE3_SEG + 1) + ix) + dy * 0.35);
    }
    g.computeVertexNormals();
    g.translate(0, -spec.len / 2, 0);
    return inner ? flipGeo(g) : g;
  });
}

// Punkt auf dem Umhang: u quer (0 … 1), v nach unten (0 … 1), etwas vor (+) oder hinter (−) dem Tuch
function capeAt3(spec, u, v, out = 0) {
  const th = Math.PI - CAPE3_ARC / 2 + u * CAPE3_ARC;
  const r = 0.225 + (spec.r2 - 0.225) * v - out;
  return [Math.sin(th) * r, -spec.len * v, Math.cos(th) * r];
}

function gearCape3(A, g, t, color, lining) {
  if (t < 0) return;
  const spec = CAPE3[t];
  const top = [0, g.shY + 0.02, 0.02];
  const W = frame3(A, BH.cape, top);
  W(capeGeo3(spec, false), color, { shade: 0.25 });
  W(capeGeo3(spec, true), lining || darker(color, 0.25), {});
  const metal = TIER_METAL[t];
  const hem = (c, o = {}) => W(torus3(spec.r2 + 0.002, 0.014, CAPE3_ARC, 3, CAPE3_SEG), c, Object.assign({ p: [0, -spec.len, 0], r: [Math.PI / 2, 0, -Math.PI / 2 - CAPE3_ARC / 2], order: 'XYZ' }, o));
  switch (t) {
    case 1:
      // gerollte Kapuze im Nacken und Schließen vorn an den Schultern
      W(torus3(0.17, 0.05, Math.PI * 1.1, 5, 12), darker(color, 0.1), { p: [0, 0.02, -0.03], r: [Math.PI / 2 - 0.3, 0, Math.PI * 0.95], shade: 0.2 });
      for (const sx of [-1, 1]) W(ball(8), metal, { p: [sx * 0.17, 0, 0.1], s: [0.032, 0.032, 0.02], shine: 1 });
      break;
    case 2:
      // Fellkragen
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.15 + (k / 8) * 0.7);
        W(ball(6), k % 2 ? '#8a6a4a' : '#a8885a', { p: [Math.cos(a) * 0.2, 0.03, -Math.sin(a) * 0.16 + 0.02], s: [0.06, 0.05, 0.06], shade: 0.2 });
      }
      break;
    case 3:
      // Rückenkamm aus Dornen die Mitte hinunter
      for (let k = 0; k < 4; k++) coneAlong(W, horn3(1, 0.3, 5), capeAt3(spec, 0.5, 0.12 + k * 0.2, -0.005), [0, 0.4, -1], 0.07 - k * 0.008, 0.06, '#1a1212', { shine: 0.5 });
      break;
    case 4:
      // leuchtender Saum und Seelenfunken
      hem(GLOW3[4], { mat: 'glow' });
      for (const [u, v] of [[0.25, 1.08], [0.6, 1.13], [0.8, 1.04]]) W(sphere3(0.018, 6, 4), GLOW3[4], { p: capeAt3(spec, u, v, -0.02), mat: 'glow' });
      break;
    case 5:
      // glühende Brandlöcher
      for (const [u, v] of [[0.2, 0.72], [0.45, 0.85], [0.7, 0.66], [0.85, 0.9], [0.35, 0.55]]) W(sphere3(0.014, 6, 4), '#ff7a2a', { p: capeAt3(spec, u, v, -0.004), mat: 'glow' });
      break;
    case 6:
      // Federlagen am Saum
      for (let k = 0; k < 7; k++) {
        const u = 0.06 + k * 0.147;
        const p = capeAt3(spec, u, 0.88, -0.006);
        W(G3.feather(), k % 2 ? FEATHER3 : '#dfefff', { p, r: [Math.PI + 0.25, (u - 0.5) * 1.6, 0], s: 0.17, top: '#bfe8ff', topK: 0.5 });
      }
      break;
    case 7: {
      // Königsmantel: Goldrand, Sonnenwappen auf dem Rücken, Hermelinkragen
      hem(GOLD3, { shine: 1 });
      const back = capeAt3(spec, 0.5, 0.4, -0.012);
      const Wb = frame3(A, BH.cape, [top[0] + back[0], top[1] + back[1], top[2] + back[2]], [0, Math.PI, 0]);
      sun3(Wb, [0, 0, 0], 0.08, 10, GOLD3, GLOW3[7]);
      W(torus3(0.16, 0.045, Math.PI * 2, 5, 16), '#f4f0e8', { p: [0, 0.03, 0], r: [Math.PI / 2 - 0.15, 0, 0], shade: 0.15 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        W(sphere3(0.008, 6, 4), '#1a1210', { p: [Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.15] });
      }
      break;
    }
    case 8: {
      // Abgrundmantel: Leerenauge auf dem Rücken mit cyanfarbenen Rissen, Splitter hängen an den Fangspitzen,
      // ein Kragen aus Splittern im Nacken
      const back = capeAt3(spec, 0.5, 0.36, -0.012);
      const Wb = frame3(A, BH.cape, [top[0] + back[0], top[1] + back[1], top[2] + back[2]], [0, Math.PI, 0]);
      voidEye3(Wb, [0, 0, 0], 0.065);
      for (const [u0, v0, u1, v1] of [[0.44, 0.44, 0.32, 0.7], [0.56, 0.44, 0.7, 0.66], [0.32, 0.7, 0.26, 0.92], [0.7, 0.66, 0.78, 0.9], [0.5, 0.46, 0.52, 0.8]]) {
        for (let k = 0; k <= 4; k++) {
          const f = k / 4;
          W(sphere3(0.008, 5, 4), VOIDGLOW3, { p: capeAt3(spec, u0 + (u1 - u0) * f, v0 + (v1 - v0) * f, -0.005), mat: 'glow' });
        }
      }
      for (let i = 0; i <= CAPE3_SEG; i += 2) {
        const u = i / CAPE3_SEG;
        const v = 1 - capeEdge3(spec.edge, u, i, spec.len) / spec.len;
        voidShard3(W, capeAt3(spec, u, v + 0.02, -0.004), [0, -1, 0], 0.035, 0.012);
      }
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.15 + (k / 6) * 0.7);
        voidShard3(W, [Math.cos(a) * 0.2, 0.05, -Math.sin(a) * 0.16 + 0.02], [Math.cos(a) * 0.3, 1, -Math.sin(a) * 0.5], 0.05 + (k % 2) * 0.025, 0.02);
      }
      W(sphere3(0.014, 6, 4), VOIDGLOW3, { p: [0, 0.01, 0.15], mat: 'glow' });
      break;
    }
    case 9: {
      // Ewigkeitsmantel: Roségoldperlen entlang des Kronensaums, achtstrahliger Stern mit Sternbild auf dem Rücken,
      // Strahlenkragen im Nacken
      for (let i = 0; i <= CAPE3_SEG; i++) {
        const u = i / CAPE3_SEG;
        const v = 1 - capeEdge3(spec.edge, u, i, spec.len) / spec.len;
        W(sphere3(0.011, 6, 4), i % 2 ? ROSEGOLD3 : PLATIN3, { p: capeAt3(spec, u, v - 0.01, -0.006), shine: 1 });
      }
      const back = capeAt3(spec, 0.5, 0.34, -0.012);
      const Wb = frame3(A, BH.cape, [top[0] + back[0], top[1] + back[1], top[2] + back[2]], [0, Math.PI, 0]);
      nova3(Wb, [0, 0, 0], 0.1);
      const stars = [[0.3, 0.55], [0.38, 0.72], [0.55, 0.78], [0.68, 0.62], [0.75, 0.84]];
      stars.forEach(([u, v], k) => {
        W(sphere3(0.012, 6, 4), '#fff4fa', { p: capeAt3(spec, u, v, -0.006), mat: 'glow' });
        if (k) limbBetween(W, capeAt3(spec, stars[k - 1][0], stars[k - 1][1], -0.005), capeAt3(spec, u, v, -0.005), 0.0035, 0.0035, '#ffd6f0', { mat: 'glow', seg: 3 });
      });
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.15 + (k / 6) * 0.7);
        coneAlong(W, G3.ray(), [Math.cos(a) * 0.2, 0.03, -Math.sin(a) * 0.16 + 0.02], [Math.cos(a) * 0.3, 1, -Math.sin(a) * 0.45], k % 2 ? 0.08 : 0.13, 0.4, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
      }
      W(G3.gem(), PRISM3[0], { p: [0, 0.01, 0.15], s: [0.014, 0.02, 0.012], mat: 'glow' });
      break;
    }
    default:
  }
  if (t >= 2 && t !== 4 && t < 7) W(torus3(0.012, 0.006, Math.PI * 2, 3, 8), metal, { p: [0, 0.01, 0.15], shine: 1 });
}

// --- Kopfbedeckungen -----------------------------------------------------------------------------
// Alle Maße in Kopfradien: Kopfmitte (0, 0, 0), Stirn vorn bei z ≈ 1, Scheitel bei y ≈ 0.93.
// Stufe −1 (Vorschau ohne Ausrüstung) zeigt die Grundform der Klasse.

function headFrame3(A, hb, hc, hr) {
  return frame3(A, hb, hc, [0, 0, 0], hr);
}

// Waagrechter Bogen um den Kopf in Höhe y; mid ist die Richtung der Bogenmitte (0 vorn, + zur linken Seite)
function hArc3(W, r, tube, y, mid, span, color, o = {}) {
  W(torus3(r, tube, span, 3, Math.max(6, Math.round(span * 5))), color, Object.assign({ p: [0, y, 0], r: [Math.PI / 2, 0, Math.PI / 2 - mid - span / 2] }, o));
}
const ringPt3 = (r, y, m) => [Math.sin(m) * r, y, Math.cos(m) * r];

// Kapuze: Kugelschale mit Öffnung für das Gesicht, innen dunkel
const hoodShell3 = (r, theta, gap) => cap3(r, theta, Math.PI / 2 + gap, Math.PI * 2 - gap * 2);
const hoodInner3 = (r, theta, gap) => geo3(`hoodin${r},${theta},${gap}`, () => flipGeo(hoodShell3(r, theta, gap)));
const NINJA_MASK3 = () => geo3('ninjamask2', () => new THREE.SphereGeometry(1, 18, 8, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.55, Math.PI * 0.4));
const VISOR3 = () => geo3('g3visor', () => new THREE.SphereGeometry(1, 16, 8, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.3, Math.PI * 0.45));
const COMB3 = () => geo3('g3comb', () => new THREE.SphereGeometry(1, 12, 8).scale(0.09, 0.3, 0.7));

// Punkte auf einer Kugelschale um den Kopf (für Lichtpunkte, Ascheflocken)
const HOOD_DOTS3 = [[0.62, 0.7, -0.3], [-0.5, 0.8, 0.1], [0.92, 0.1, -0.38], [-0.85, -0.2, -0.5], [0.2, 0.55, -0.82], [-0.3, 0.25, -0.93], [0.55, -0.45, -0.7], [-0.7, 0.62, -0.35], [0.05, 0.98, 0.15], [0.8, 0.45, 0.25]];
const dotOn3 = (d, r) => {
  const l = Math.hypot(...d);
  return [d[0] / l * r, d[1] / l * r, d[2] / l * r];
};

// Krieger: vom Lederhelm bis zum Götterhelm
function kriegerHelm3(t, steel, plume, brass) {
  const s = t < 0 ? 2 : t;
  return (A, hb, hc, hr) => {
    const W = headFrame3(A, hb, hc, hr);
    const dome = (col, o = {}) => W(cap3(1.1, Math.PI * 0.55, 0, Math.PI * 2, 18, 9), col, Object.assign({ p: [0, 0.04, -0.02], r: [-0.18, 0, 0], top: lighter(col, 0.3), topK: 0.4, shine: 0.9 }, o));
    const brim = (col, o = {}) => W(torus3(1.08, 0.08, Math.PI * 2, 5, 24), col, Object.assign({ p: [0, 0.14, 0], r: [Math.PI / 2 - 0.18, 0, 0], shine: 1 }, o));
    // Punkt am Rand der Krempe in Richtung m (Krempe ist vorn höher)
    const onBrim = (m, r = 1.13) => [Math.sin(m) * r, 0.14 + 0.18 * Math.cos(m) * r, Math.cos(m) * r];
    const cheeks = (col, o = {}) => {
      for (const sx of [-1, 1]) W(roundBox(0.2, 0.55, 0.34, 0.08), col, Object.assign({ p: [sx * 0.94, -0.22, 0.14], r: [0, sx * 0.12, sx * 0.08], shine: 0.6 }, o));
    };
    switch (s) {
      case 0: {
        // Lederkappe: Nähte über Kreuz, Ohrklappen mit Fellrand und Bändern
        W(cap3(1.08, Math.PI * 0.52, 0, Math.PI * 2, 16, 8), steel, { p: [0, 0.06, -0.02], r: [-0.2, 0, 0], shade: 0.15, top: lighter(steel, 0.15), topK: 0.3 });
        for (const ry of [0, Math.PI / 2]) W(torus3(1.09, 0.025, Math.PI, 3, 12), darker(steel, 0.35), { p: [0, 0.06, -0.02], r: [-0.2, ry, 0] });
        W(torus3(1.07, 0.06, Math.PI * 2, 4, 20), darker(steel, 0.2), { p: [0, 0.1, 0], r: [Math.PI / 2 - 0.2, 0, 0] });
        for (const sx of [-1, 1]) {
          W(roundBox(0.3, 0.58, 0.14, 0.06), steel, { p: [sx * 0.95, -0.3, 0.08], r: [0, sx * 0.15, sx * 0.1], shade: 0.2 });
          W(roundBox(0.32, 0.1, 0.17, 0.045), '#d8c8a8', { p: [sx * 0.97, -0.58, 0.09], r: [0, sx * 0.15, sx * 0.1] });
          W(limb3(0.32, 0.022, 0.022, 4), '#3a2618', { p: [sx * 0.9, -0.6, 0.18] });
        }
        W(sphere3(0.1, 8, 6), darker(steel, 0.3), { p: [0, 1.07, -0.22] });
        break;
      }
      case 1: {
        // Bronzehelm: Nasenschutz, Grat mit schmalem Kamm, Wangenschutz, Nietenreihe
        dome(steel);
        brim(brass);
        W(roundBox(0.16, 0.62, 0.08, 0.035), steel, { p: [0, 0.1, 1.06], r: [-0.2, 0, 0], shine: 1 });
        W(torus3(1.13, 0.07, Math.PI, 4, 14), brass, { p: [0, 0.04, -0.02], r: [-0.18, Math.PI / 2, 0], shine: 1 });
        W(COMB3(), plume, { p: [0, 1.22, -0.14], r: [-0.25, 0, 0], shade: 0.3 });
        cheeks(steel, { s: [0.9, 0.8, 0.9] });
        for (let k = 0; k < 9; k++) W(sphere3(0.05, 6, 4), lighter(brass, 0.2), { p: onBrim(-1.4 + k * 0.35), shine: 1 });
        break;
      }
      case 2: {
        // Eisenhelm (Kabuto): Rippen, Nackenschutz, Wangenschutz und eine große Mondsichel als Stirnzier
        dome(steel);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI - Math.PI / 2;
          W(roundBox(0.06, 0.5, 0.06, 0.03), darker(steel, 0.15), { p: [Math.sin(a) * 1.0, 0.62, Math.cos(a) * 0.5 - 0.1], r: [-0.5 * Math.cos(a), 0, -0.6 * Math.sin(a)] });
        }
        brim(brass);
        W(geo3('neckguard', () => new THREE.SphereGeometry(1, 16, 6, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.45, Math.PI * 0.28)), steel, { p: [0, 0.05, 0], s: 1.22, r: [0, Math.PI, 0], shine: 0.6 });
        cheeks(steel);
        crescent3(sub3(W, [0, 1.06, 0.98], [-0.2, 0, 0]), [0, 0, 0], 0.58, 0.075, -Math.PI / 2, Math.PI * 1.15, brass);
        W(G3.disc(), brass, { p: [0, 0.5, 1.06], r: [-0.2, 0, 0], s: [0.15, 0.15, 0.8], shine: 1 });
        W(sphere3(0.06, 8, 6), GLOW3[2], { p: [0, 0.5, 1.12], mat: 'glow' });
        break;
      }
      case 3: {
        // Drachenhelm: geschwungene Hörner, Kieferwangen mit Zähnen, Rückenkamm aus Zacken, rotes Auge
        dome(steel);
        brim(brass);
        for (const sx of [-1, 1]) {
          curvedHorn3(W, [[sx * 0.72, 0.55, 0.05], [sx * 1.1, 0.88, -0.25], [sx * 1.28, 1.2, -0.72], [sx * 1.15, 1.32, -1.2]], 0.18, '#e8dcc0', { shine: 0.4 });
          W(roundBox(0.22, 0.5, 0.44, 0.08), steel, { p: [sx * 0.93, -0.28, 0.24], r: [0, sx * 0.15, sx * 0.08], shine: 0.6 });
          for (let k = 0; k < 3; k++) coneAlong(W, G3.spike(), [sx * 0.9, -0.52, 0.08 + k * 0.15], [-sx * 0.15, -1, 0.15], 0.17, 0.32, '#f4ecd8');
        }
        for (let k = 0; k < 5; k++) {
          const f = 0.75 + k * 0.38;
          coneAlong(W, G3.spike(), [0, 0.04 + Math.sin(f) * 1.06, -0.02 + Math.cos(f) * 1.06], [0, Math.sin(f), Math.cos(f) - 0.4], 0.42 - k * 0.04, 0.55, plume, { shine: 0.4 });
        }
        W(G3.gem(), GLOW3[3], { p: [0, 0.48, 1.07], s: [0.09, 0.13, 0.06], mat: 'glow' });
        break;
      }
      case 4: {
        // Seelenhelm: geschlossenes Visier mit leuchtendem Augenschlitz, Krone aus Kristallen
        dome(steel);
        W(VISOR3(), darker(steel, 0.35), { s: 1.09, shine: 0.9, top: steel, topK: 0.4 });
        hArc3(W, 1.1, 0.08, -0.1, 0, 1.45, '#f0dcff', { mat: 'glow' });
        W(roundBox(0.07, 0.5, 0.1, 0.035), steel, { p: [0, -0.42, 1.0], r: [-0.42, 0, 0], shine: 1 });
        brim(brass, { s: [1, 1, 0.7] });
        for (let k = -3; k <= 3; k++) {
          const m = k * 0.4;
          const h = k === 0 ? 0.62 : Math.abs(k) === 1 ? 0.44 : Math.abs(k) === 2 ? 0.32 : 0.24;
          coneAlong(W, G3.gem(), ringPt3(0.98, 0.66 + 0.18 * Math.cos(m), m), [Math.sin(m) * 0.35, 1, Math.cos(m) * 0.35], h, h * 0.42, k % 2 ? '#e8d0ff' : GLOW3[4], { mat: 'glow' });
        }
        break;
      }
      case 5: {
        // Aschenhelm: schwarze Kuppel mit Glutnähten und einer Krone aus gezackten Obsidianzacken
        dome(steel, { shine: 0.5 });
        brim(darker(steel, 0.2));
        for (const ry of [Math.PI / 4, -Math.PI / 4]) W(torus3(1.105, 0.022, Math.PI, 3, 12), GLOW3[5], { p: [0, 0.04, -0.02], r: [-0.18, ry, 0], mat: 'glow' });
        for (let k = 0; k < 9; k++) {
          const m = (k / 9) * Math.PI * 2;
          const front = Math.cos(m);
          emberSpike3(W, ringPt3(0.98, 0.5 + 0.18 * front, m), [Math.sin(m) * 0.45, 1, Math.cos(m) * 0.45], 0.42 + 0.3 * Math.max(0, front) + (k % 2) * 0.12, 0.42);
        }
        cheeks(darker(steel, 0.1), { shine: 0.4 });
        break;
      }
      case 6: {
        // Himmelshelm: silberweiße Kuppel mit großen Federflügeln und Himmelsstein
        dome(steel);
        brim('#e6f2ff');
        for (const sx of [-1, 1]) wing3(W, [sx * 0.95, 0.4, -0.1], sx, 5, 1.05, FEATHER3, '#bfe8ff');
        W(G3.gem(), GLOW3[6], { p: [0, 0.5, 1.08], s: [0.1, 0.15, 0.06], mat: 'glow' });
        W(COMB3(), '#ffffff', { p: [0, 1.18, -0.12], r: [-0.25, 0, 0], s: 0.8, shade: 0.2 });
        break;
      }
      case 8: {
        // Abgrundhelm (seit 13.53): geschlossene Leerenkuppel mit cyanfarbenem Sehschlitz, Leerenauge auf der Stirn,
        // zwei eingerollte Tentakelhörner nach hinten, darüber schweben Splitter wie eine gebrochene Krone
        dome(steel, { shine: 0.7, top: VOIDMETAL3 });
        W(VISOR3(), darker(steel, 0.3), { s: 1.09, shine: 0.8, top: steel, topK: 0.4 });
        hArc3(W, 1.1, 0.05, -0.12, 0, 1.4, VOIDGLOW3, { mat: 'glow' });
        voidEye3(sub3(W, [0, 0.56, 1.02], [-0.25, 0, 0]), [0, 0, 0], 0.2);
        for (const sx of [-1, 1]) {
          tendril3(W, [[sx * 0.72, 0.55, -0.05], [sx * 1.2, 0.78, -0.4], [sx * 1.42, 0.55, -0.9], [sx * 1.25, 0.22, -1.12], [sx * 1.0, 0.32, -1.02]], 0.17);
        }
        for (let k = -2; k <= 2; k++) voidShard3(W, [k * 0.32, 1.42 + (k % 2 ? 0.14 : 0) - Math.abs(k) * 0.08, 0.1 - Math.abs(k) * 0.12], [k * 0.18, 1, 0.1], 0.24 - Math.abs(k) * 0.03, 0.08);
        cheeks(darker(steel, 0.1), { shine: 0.6 });
        break;
      }
      case 9: {
        // Ewigkeitshelm (seit 13.53): Platinkuppel mit Roségoldkamm, ein Strahlenkranz aus Platin und Roségold hinter
        // dem Kopf, achtstrahliger Stern auf der Stirn, Prismensteine an der Krempe
        dome(steel, { top: '#ffffff' });
        brim(ROSEGOLD3);
        W(roundBox(0.12, 0.62, 1.1, 0.06), ROSEGOLD3, { p: [0, 1.05, -0.18], r: [-0.25, 0, 0], shine: 1, top: '#fff4ee', topK: 0.4 });
        const H = sub3(W, [0, 0.28, -1.0], [0.18, 0, 0]);
        H(torus3(0.95, 0.05, Math.PI, 3, 18), ROSEGOLD3, { shine: 1 });
        for (let k = 0; k <= 8; k++) {
          const a = Math.PI * (0.06 + (k / 8) * 0.88);
          coneAlong(H, G3.ray(), [Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0], [Math.cos(a), Math.sin(a), 0], k % 2 ? 0.42 : 0.7, 1.1, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
        }
        nova3(sub3(W, [0, 0.6, 1.06], [-0.2, 0, 0]), [0, 0, 0], 0.32);
        for (let k = -2; k <= 2; k++) W(G3.gem(), PRISM3[k + 2], { p: onBrim(k * 0.55), s: [0.07, 0.1, 0.07], mat: 'glow' });
        cheeks(steel, { shine: 1 });
        break;
      }
      default: {
        // Götterhelm: goldene Kuppel, hoher Kamm mit rotem Schweif, Sonnenscheibe auf der Stirn
        dome(steel, { top: '#fff2b0' });
        brim('#fff2b0');
        W(roundBox(0.14, 0.72, 1.25, 0.07), steel, { p: [0, 1.06, -0.15], r: [-0.25, 0, 0], shine: 1, top: '#fff2b0', topK: 0.5 });
        W(COMB3(), plume, { p: [0, 1.28, -0.85], r: [-0.75, 0, 0], s: [1.4, 1.1, 1.1], shade: 0.3 });
        sun3(sub3(W, [0, 0.62, 1.04], [-0.2, 0, 0]), [0, 0, 0], 0.3, 10, '#ffd34d', GLOW3[7]);
        cheeks(steel, { shine: 1 });
      }
    }
  };
}

// Ninja: Kapuze mit Maske; die Stufe ändert Stirnband, Schweife, Masken und Zierde
function ninjaHelm3(t, hood, scarf) {
  const s = t < 0 ? 0 : t;
  return (A, hb, hc, hr) => {
    const W = headFrame3(A, hb, hc, hr);
    W(hoodShell3(1.1, Math.PI * 0.82, 0.95), hood, { p: [0, 0.05, -0.02], shade: 0.2 });
    W(hoodInner3(1.08, Math.PI * 0.82, 0.95), darker(hood, 0.4), { p: [0, 0.05, -0.02] });
    W(cap3(1.12, Math.PI * 0.42), hood, { p: [0, 0.08, 0], r: [-0.05, 0, 0] });
    const mask = (col, o = {}) => W(NINJA_MASK3(), col, Object.assign({ s: 1.06, shade: 0.2 }, o));
    const tails = (col, long) => {
      for (const sx of [-1, 1]) {
        const a = [sx * 0.3, 0.2, -0.95];
        const b = [sx * 0.55, -0.9, -1.5];
        if (!long) limbBetween(W, a, b, 0.13, 0.05, col);
        else {
          limbBetween(W, a, b, 0.13, 0.09, col);
          limbBetween(W, b, [sx * 0.75, -1.9, -1.85], 0.09, 0.04, col);
        }
      }
    };
    const band = (col, o = {}) => W(torus3(1.12, 0.055, Math.PI * 2, 4, 22), col, Object.assign({ p: [0, 0.42, 0], r: [Math.PI / 2 - 0.15, 0, 0] }, o));
    switch (s) {
      case 0:
        // Stoffkapuze mit Knoten im Nacken
        mask(scarf);
        tails(hood);
        W(ball(8), darker(hood, 0.15), { p: [0, 0.22, -1.08], s: 0.16 });
        break;
      case 1:
        // Lederkapuze mit Stirnband, Knoten und zwei Bändern
        mask(scarf);
        tails(hood);
        band('#8a6a44', { s: [1, 1, 1.4] });
        W(roundBox(0.3, 0.17, 0.06, 0.04), '#9aa0a8', { p: [0, 0.44, 1.1], r: [-0.15, 0, 0], shine: 1 });
        W(ball(8), '#6a4a2e', { p: [0, 0.32, -1.13], s: 0.12 });
        for (const sx of [-1, 1]) W(roundBox(0.11, 0.55, 0.025, 0.012), '#8a6a44', { p: [sx * 0.08, 0.05, -1.16], r: [0.22, 0, sx * 0.18] });
        break;
      case 2: {
        // lange Kapuzenschweife und Stirnplatte mit Mondsichel
        mask(scarf);
        tails(hood, true);
        band(darker(hood, 0.2));
        W(roundBox(0.5, 0.26, 0.08, 0.05), '#c7ccd3', { p: [0, 0.46, 1.08], r: [-0.15, 0, 0], shine: 1 });
        crescent3(sub3(W, [0, 0.46, 1.13], [-0.15, 0, 0]), [0, 0, 0], 0.08, 0.025, Math.PI * 0.8, Math.PI * 1.2, GLOW3[2], { mat: 'glow' });
        break;
      }
      case 3:
        // Viperkapuze: Schlangenkopf über der Stirn mit Giftzähnen und gelben Augen, Schuppen am Scheitel
        mask(scarf);
        tails(hood);
        // Kobra-Schild: flach gespreizter Nackenschild hinter dem Kopf, mit hellem Muster
        W(ball(12), hood, { p: [0, 0.15, -0.55], s: [1.55, 1.15, 0.3], r: [0.35, 0, 0], shade: 0.2, top: lighter(hood, 0.2), topK: 0.4 });
        for (const sx of [-1, 1]) W(ball(6), '#c8d86a', { p: [sx * 0.6, 0.62, -0.58], s: [0.16, 0.12, 0.06], r: [0.35, 0, 0] });
        W(ball(10), hood, { p: [0, 0.62, 0.8], s: [0.5, 0.24, 0.55], r: [-0.3, 0, 0], top: lighter(hood, 0.25), topK: 0.4 });
        for (const sx of [-1, 1]) {
          coneAlong(W, horn3(1, 0.3, 5), [sx * 0.2, 0.46, 1.18], [0, -1, 0.15], 0.3, 0.33, '#f4ecd8');
          W(sphere3(0.06, 6, 4), '#e8e04a', { p: [sx * 0.27, 0.74, 1.0], mat: 'glow' });
        }
        for (let k = 0; k < 4; k++) W(G3.scale(), k % 2 ? lighter(hood, 0.2) : lighter(hood, 0.35), { p: [0, 1.0 - k * 0.12, 0.25 - k * 0.32], r: [-0.5 - k * 0.35, 0, 0], s: 0.2, shine: 0.5 });
        break;
      case 4:
        // Nachtmaske mit leuchtenden Linien über Maske und Kapuze
        mask('#1a1020');
        tails(hood);
        hArc3(W, 1.09, 0.025, -0.3, 0, 1.6, GLOW3[4], { mat: 'glow' });
        hArc3(W, 1.08, 0.022, -0.5, 0, 1.2, GLOW3[4], { mat: 'glow' });
        W(torus3(1.15, 0.025, 1.3, 3, 9), GLOW3[4], { p: [0, 0.05, -0.02], r: [0, Math.PI / 2, Math.PI - 1.7], mat: 'glow' });
        break;
      case 5:
        // Oni-Maske: rote Fratze mit Zähnen über Mund und Nase, zwei Hörnchen auf der Stirn
        mask('#8a1a14', { shade: 0.3 });
        tails(hood);
        for (let k = -2; k <= 2; k++) {
          const x = k * 0.13;
          coneAlong(W, horn3(1, 0.3, 4), [x, -0.5, Math.sqrt(Math.max(0, 1.12 - 0.25 - x * x)) + 0.02], [0, 1, 0.1], Math.abs(k) === 2 ? 0.2 : 0.12, 0.25, '#f4ecd8');
        }
        for (const sx of [-1, 1]) {
          coneAlong(W, horn3(1, 0.3, 6), [sx * 0.38, 0.6, 0.8], [sx * 0.35, 1, 0.3], 0.42, 0.5, '#e8dcc0', { shine: 0.4 });
          W(roundBox(0.32, 0.07, 0.06, 0.03), '#5a0e0a', { p: [sx * 0.37, 0.18, 0.95], r: [0, sx * 0.35, -sx * 0.3] });
        }
        break;
      case 6:
        // Sternenmaske: Silberrand, Stern auf der Stirn, Lichtpunkte auf der Kapuze
        mask(darker(hood, 0.2));
        tails(hood);
        hArc3(W, 1.08, 0.03, -0.2, 0, 2.2, '#c7ccd3', { shine: 1 });
        star3(sub3(W, [0, 0.48, 1.09], [-0.3, 0, 0]), [0, 0, 0], 0.17, '#e6f6ff');
        for (const d of HOOD_DOTS3.slice(0, 7)) W(sphere3(0.035, 6, 4), '#e6f6ff', { p: dotOn3(d, 1.13), mat: 'glow' });
        break;
      case 8:
        // Abgrundmaske (seit 13.53): schwarze Maske mit cyanfarbenen Tränenrissen, Leerenauge auf der Stirn,
        // lange Schweife mit Tentakeln, Splitter schweben um die Kapuze
        mask('#0c0816', { shine: 0.5 });
        tails(hood, true);
        voidEye3(sub3(W, [0, 0.5, 1.1], [-0.2, 0, 0]), [0, 0, 0], 0.2);
        for (const sx of [-1, 1]) {
          W(roundBox(0.05, 0.32, 0.05, 0.02), VOIDGLOW3, { p: [sx * 0.33, -0.45, 0.97], r: [0.1, sx * 0.3, sx * 0.25], mat: 'glow' });
          tendril3(W, [[sx * 0.55, 0.0, -0.85], [sx * 0.95, -0.55, -1.15], [sx * 1.25, -1.0, -1.05], [sx * 1.3, -1.3, -0.8]], 0.1);
        }
        for (const d of HOOD_DOTS3.slice(0, 4)) voidShard3(W, dotOn3(d, 1.5), d, 0.17, 0.055);
        break;
      case 9:
        // Ewigkeitsmaske (seit 13.53): perlweiße Maske mit Roségoldlinie, Sterndiadem auf der Stirn, lange Bänder mit
        // Prismensteinen, Sternenstaub auf der Kapuze
        mask('#f8f2f6', { shade: 0.15 });
        tails(hood, true);
        band(ROSEGOLD3, { shine: 1 });
        hArc3(W, 1.09, 0.028, -0.25, 0, 2.0, ROSEGOLD3, { shine: 1 });
        nova3(sub3(W, [0, 0.46, 1.14], [-0.2, 0, 0]), [0, 0, 0], 0.32);
        for (const sx of [-1, 1]) {
          W(roundBox(0.11, 0.95, 0.02, 0.01), sx > 0 ? ROSEGOLD3 : ROSEGLOW3, { p: [sx * 0.22, -0.3, -1.16], r: [0.25, 0, sx * 0.14], shine: 0.6 });
          W(G3.gem(), PRISM3[sx > 0 ? 0 : 3], { p: [sx * 0.3, -0.82, -1.3], s: [0.07, 0.11, 0.07], mat: 'glow' });
        }
        for (const d of HOOD_DOTS3.slice(0, 7)) W(sphere3(0.035, 6, 4), ROSEGLOW3, { p: dotOn3(d, 1.13), mat: 'glow' });
        break;
      default:
        // goldene Fuchsmaske mit Schnauze, roten Zeichen und Fuchsohren
        mask('#f4f0e8');
        tails(hood);
        coneAlong(W, horn3(1, 0.3, 8), [0, -0.3, 0.86], [0, -0.15, 1], 0.5, 1.0, GOLD3, { shine: 1, top: '#fff2b0', topK: 0.4 });
        W(sphere3(0.06, 6, 4), '#1a1210', { p: [0, -0.37, 1.35] });
        for (const sx of [-1, 1]) {
          W(roundBox(0.26, 0.045, 0.03, 0.015), '#c8402f', { p: [sx * 0.45, -0.32, 0.93], r: [0, sx * 0.45, sx * 0.35] });
          coneAlong(W, horn3(1, 0.3, 6), [sx * 0.5, 0.78, 0.08], [sx * 0.45, 1, 0.1], 0.65, 1.0, GOLD3, { shine: 1 });
          coneAlong(W, horn3(1, 0.3, 6), [sx * 0.5, 0.82, 0.2], [sx * 0.45, 1, 0.1], 0.5, 0.55, '#c8402f');
        }
    }
  };
}
const NINJA_EYES3 = { 4: GLOW3[4], 5: '#ff9a4a', 6: '#9fe8ff', 7: '#ffd34d', 8: VOIDGLOW3, 9: ROSEGLOW3 };

// Schamane: vom Stirnband bis zum Götterdiadem
function shamanHelm3(t, band, gold) {
  if (t === -2) return null;
  const s = t < 0 ? 0 : t;
  return (A, hb, hc, hr) => {
    const W = headFrame3(A, hb, hc, hr);
    const ring = (col, o = {}) => W(torus3(1.06, 0.07, Math.PI * 2, 5, 24), col, Object.assign({ p: [0, 0.4, 0], r: [Math.PI / 2 - 0.12, 0, 0], shine: 0.6 }, o));
    const front = [0, 0.52, 1.04];
    switch (s) {
      case 0:
        // Stirnband mit Holzperle und zwei Federn
        ring(band, { shine: 0.1 });
        W(sphere3(0.1, 8, 6), '#c8402f', { p: front });
        W(G3.feather(), '#e8dcc0', { p: [0.9, 0.5, -0.2], r: [0, 0, -0.65], s: 0.9, top: '#8a6a44', topK: 0.5 });
        W(G3.feather(), '#c8402f', { p: [1.0, 0.42, -0.1], r: [0, 0, -0.95], s: 0.7 });
        break;
      case 1:
        // Seidenhaube mit Goldband und zwei langen Bändern im Nacken
        W(cap3(1.1, Math.PI * 0.4, 0, Math.PI * 2, 16, 7), '#c8402f', { p: [0, 0.15, -0.08], r: [-0.3, 0, 0], shine: 0.5, top: '#e86a52', topK: 0.3 });
        ring(gold);
        W(ball(8), '#a8302a', { p: [0, 0.3, -1.08], s: 0.14 });
        for (const sx of [-1, 1]) W(roundBox(0.13, 0.85, 0.025, 0.012), sx > 0 ? '#c8402f' : gold, { p: [sx * 0.12, -0.15, -1.12], r: [0.2, 0, sx * 0.12], shine: 0.4 });
        break;
      case 2:
        // Kranichkamm: fünf weiße Federn mit dunklen Spitzen, roter Scheitelfleck
        ring(gold);
        for (let k = -2; k <= 2; k++) W(G3.feather(), FEATHER3, { p: [k * 0.08, 0.82, -0.15], r: [-0.35 - Math.abs(k) * 0.12, 0, -k * 0.32], s: 0.95 - Math.abs(k) * 0.14, top: '#2a2a30', topK: 0.55 });
        W(sphere3(0.13, 8, 6), '#c8402f', { p: [0, 0.98, 0.32] });
        W(sphere3(0.08, 8, 6), '#ffffff', { p: front, shine: 0.6 });
        break;
      case 3:
        // Phönixkrone: goldener Reif mit Flammenfedern
        ring('#ffd34d', { shine: 1 });
        for (let k = -3; k <= 3; k++) {
          const m = k * 0.33;
          const at = ringPt3(1.0, 0.55 + 0.12 * Math.cos(m), m);
          const len = Math.abs(k) <= 1 ? 0.8 - Math.abs(k) * 0.1 : 0.5;
          coneAlong(W, G3.feather(), at, [Math.sin(m) * 0.4, 1, Math.cos(m) * 0.4 - 0.1], len, len, k % 2 ? '#ff7a2a' : '#e8402a', { top: '#ffd34d', topK: 0.6 });
          if (Math.abs(k) <= 1) coneAlong(W, G3.ray(), at, [Math.sin(m) * 0.4, 1, Math.cos(m) * 0.4], len * 0.6, 0.6, '#ffe9a0', { mat: 'glow' });
        }
        break;
      case 4:
        // Drachenkrone: Reif, zwei Drachenhörner, Drachenperle von Klauen gehalten
        ring(band, { shine: 1 });
        for (const sx of [-1, 1]) curvedHorn3(W, [[sx * 0.75, 0.55, 0.0], [sx * 0.95, 0.95, -0.3], [sx * 0.95, 1.3, -0.65], [sx * 0.78, 1.45, -0.95]], 0.14, '#e8dcc0', { shine: 0.4 });
        W(sphere3(0.15, 10, 8), '#f4e8ff', { p: [0, 0.72, 1.1], mat: 'glow' });
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + (k - 1) * 1.0;
          coneAlong(W, horn3(1, 0.3, 4), [Math.cos(a) * 0.14, 0.55, 1.04], [Math.cos(a) * 0.3, 1, 0.5], 0.3, 0.25, GOLD3, { shine: 1 });
        }
        break;
      case 5:
        // Glutkrone: dunkler Reif mit Glutzacken, darüber schweben Glutfunken
        ring('#3a2a26', { shine: 0.3 });
        for (let k = -3; k <= 3; k++) {
          const m = k * 0.42;
          emberSpike3(W, ringPt3(1.0, 0.5 + 0.12 * Math.cos(m), m), [Math.sin(m) * 0.3, 1, Math.cos(m) * 0.3], k === 0 ? 0.75 : 0.5 - Math.abs(k) * 0.04, 0.42);
        }
        for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + 0.4;
          W(G3.gem(), k % 2 ? '#ffd34d' : '#ff7a2a', { p: [Math.cos(a) * 0.6, 1.4 + (k % 2) * 0.2, Math.sin(a) * 0.6], s: [0.1, 0.16, 0.1], mat: 'glow' });
        }
        break;
      case 6:
        // Wolkenkrone: Wölkchen rund um das Band, kleine Flügel an den Schläfen
        ring(band, { shine: 0.8 });
        for (let k = 0; k < 10; k++) {
          const m = (k / 10) * Math.PI * 2;
          W(G3.puff(), k % 2 ? '#f4f8ff' : '#dfefff', { p: ringPt3(1.08, 0.46 + 0.12 * Math.cos(m) + (k % 2) * 0.05, m), s: 0.16 + (k % 3) * 0.04, shade: 0.15 });
        }
        for (const sx of [-1, 1]) wing3(W, [sx * 1.0, 0.5, -0.2], sx, 3, 0.75, FEATHER3, '#bfe8ff');
        break;
      case 8:
        // Abgrundkrone (seit 13.53): Reif aus Leerenobsidian, eine gebrochene Krone aus Splittern, darüber schwebt ein
        // Leerenauge
        ring(VOID3, { shine: 0.7 });
        for (let k = -3; k <= 3; k++) {
          const m = k * 0.38;
          voidShard3(W, ringPt3(1.0, 0.62 + 0.12 * Math.cos(m), m), [Math.sin(m) * 0.35, 1, Math.cos(m) * 0.35], (k === 0 ? 0.55 : 0.42 - Math.abs(k) * 0.05) + (k % 2 ? 0.1 : 0), 0.15);
        }
        voidEye3(sub3(W, [0, 1.75, 0.3], [-0.15, 0, 0]), [0, 0, 0], 0.26);
        break;
      case 9: {
        // Ewigkeitsdiadem (seit 13.53): Roségoldreif mit Strahlen aus Platin, Stern auf der Stirn, darüber kreist ein
        // Sternenkranz
        ring(ROSEGOLD3, { shine: 1, s: [1, 1, 0.85] });
        for (let k = -3; k <= 3; k++) {
          const m = k * 0.36;
          coneAlong(W, G3.ray(), ringPt3(1.0, 0.5 + 0.12 * Math.cos(m), m), [Math.sin(m) * 0.3, 1, Math.cos(m) * 0.3], k === 0 ? 0.8 : 0.52 - Math.abs(k) * 0.06, 1.3, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
        }
        nova3(sub3(W, [0, 0.55, 1.08], [-0.15, 0, 0]), [0, 0, 0], 0.28);
        const th = Math.PI / 2 - 0.25;
        W(torus3(0.78, 0.03, Math.PI * 2, 3, 24), ROSEGLOW3, { p: [0, 1.75, -0.15], r: [th, 0, 0], mat: 'glow' });
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          star3(W, [Math.cos(a) * 0.78, 1.75 + Math.sin(a) * 0.78 * Math.cos(th), -0.15 + Math.sin(a) * 0.78 * Math.sin(th)], 0.13, k % 2 ? ROSEGLOW3 : '#fff4fa');
        }
        break;
      }
      default:
        // Götterdiadem: Goldreif mit Stirnspitze und Edelstein, große Sonnenscheibe hinter dem Kopf
        ring(GOLD3, { shine: 1, s: [1, 1, 0.8] });
        coneAlong(W, G3.ray(), [0, 0.5, 1.02], [0, 1, 0.25], 0.55, 1.6, GOLD3, { shine: 1 });
        W(G3.gem(), GLOW3[7], { p: [0, 0.6, 1.1], s: [0.08, 0.12, 0.06], mat: 'glow' });
        sun3(sub3(W, [0, 0.62, -1.05], [0.25, Math.PI, 0]), [0, 0, 0], 0.72, 12, '#ffd34d', GLOW3[7]);
    }
  };
}

// Nekromant: Kapuze mit Spitze; die Stufe bringt Fetzen, Knochen, Flammen, Kronen und Hörner
function nekroHelm3(t, hood, glow) {
  const s = t < 0 ? 0 : t;
  return (A, hb, hc, hr) => {
    const W = headFrame3(A, hb, hc, hr);
    W(hoodShell3(1.14, Math.PI * 0.86, 0.85), hood, { p: [0, 0.05, -0.02], shade: 0.2 });
    W(hoodInner3(1.12, Math.PI * 0.86, 0.85), '#0d120c', { p: [0, 0.05, -0.02] });
    if (s !== 7 && s !== 9) W(horn3(0.95, 0.62, 12), hood, { p: [0, 0.62, -0.25], r: [-0.45, 0, 0] });
    // Schädelkappe aus Knochen (oder Gold) mit Augenhöhlen und Zahnreihe
    const skullCap = (col, eye) => {
      W(cap3(1.17, Math.PI * 0.36, 0, Math.PI * 2, 16, 6), col, { p: [0, 0.2, 0.06], r: [-0.25, 0, 0], shade: 0.2, top: lighter(col, 0.2), topK: 0.4, shine: col === GOLD3 ? 1 : 0.2 });
      for (const sx of [-1, 1]) W(ball(8), eye || '#1a1210', { p: [sx * 0.3, 0.66, 0.9], s: [0.14, 0.1, 0.07], mat: eye ? 'glow' : 'lit' });
      W(ball(6), darker(col, 0.5), { p: [0, 0.54, 1.0], s: [0.06, 0.08, 0.05] });
      for (let k = -2; k <= 2; k++) coneAlong(W, horn3(1, 0.3, 4), [k * 0.12, 0.47, Math.sqrt(1.3 - 0.47 * 0.47 - k * k * 0.0144) - 0.02], [0, -1, 0.3], 0.13, 0.28, col);
    };
    switch (s) {
      case 0:
        // zerrissene Grabkapuze: Fetzen am Saum, zwei Flicken
        for (let k = 0; k < 9; k++) {
          const m = Math.PI / 2 + (k / 8) * Math.PI;
          coneAlong(W, horn3(1, 0.3, 5), [Math.sin(m) * 0.52, -0.92, Math.cos(m) * 0.52 - 0.02], [Math.sin(m) * 0.3, -1, Math.cos(m) * 0.3], 0.22 + (k % 3) * 0.08, 0.6, darker(hood, 0.15));
        }
        for (const [d, r] of [[[0.8, 0.35, -0.48], 0.4], [[-0.7, 0.1, -0.7], -0.3], [[0.35, 0.85, 0.1], 0.2]]) W(roundBox(0.26, 0.22, 0.04, 0.02), lighter(hood, 0.15), { p: dotOn3(d, 1.15), r: [-d[1] * 0.9, Math.atan2(d[0], d[2]), r] });
        // ausgefranste Kante über der Stirn
        for (let k = -3; k <= 3; k++) coneAlong(W, horn3(1, 0.3, 4), ringPt3(1.0, 0.5 + 0.02 * (k % 2), k * 0.2), [0, -1, 0.35], 0.18 + (k % 2 ? 0.08 : 0), 0.5, darker(hood, 0.1));
        break;
      case 1:
        // Kapuze mit grauem Aschenband und Ascheflocken
        W(torus3(1.17, 0.06, Math.PI * 2, 4, 22), '#6a6460', { p: [0, 0.3, -0.02], r: [Math.PI / 2 - 0.1, 0, 0] });
        for (const d of HOOD_DOTS3) W(roundBox(0.09, 0.025, 0.07, 0.01), '#9a9690', { p: dotOn3(d, 1.15), r: [d[2], d[0] * 2, d[1]] });
        break;
      case 2:
        // Knochenhelm mit Kiefer: Schädeldach, Augenhöhlen, Zähne, Kieferknochen an den Wangen
        skullCap(BONE3);
        for (const sx of [-1, 1]) {
          limbBetween(W, [sx * 0.86, 0.15, 0.35], [sx * 0.6, -0.68, 0.72], 0.1, 0.08, BONE3);
          for (let k = 0; k < 3; k++) coneAlong(W, horn3(1, 0.3, 4), [sx * (0.8 - k * 0.09), -0.1 - k * 0.24, 0.48 + k * 0.1], [-sx, 0.3, 0.4], 0.13, 0.25, '#f4ecd8');
        }
        break;
      case 3:
        // Seelenhaube: grüne Seelenflamme auf der Spitze, Irrlichter neben dem Gesicht
        flame3(W, [0, 1.3, -0.58], [0, 1, -0.15], 0.6, 0.95, '#7dff9a', '#e8ffe0');
        for (const sx of [-1, 1]) W(sphere3(0.07, 6, 4), '#7dff9a', { p: [sx * 0.95, -0.4, 0.55], mat: 'glow' });
        break;
      case 4:
        // Totenkönigskrone: Reif mit sieben Knochendornen und violetten Steinen
        W(torus3(1.0, 0.06, Math.PI * 2, 4, 22), '#ddd5bb', { p: [0, 0.62, 0], r: [Math.PI / 2 - 0.15, 0, 0] });
        for (let k = 0; k < 7; k++) {
          const m = ((k - 3) / 7) * Math.PI * 1.4;
          coneAlong(W, G3.spike(), ringPt3(1.0, 0.62 + 0.15 * Math.cos(m), m), [Math.sin(m) * 0.25, 1, Math.cos(m) * 0.25], 0.4 + (k % 2 ? 0 : 0.18), 0.32, '#ddd5bb', { shine: 0.3 });
        }
        W(G3.gem(), glow, { p: [0, 0.78, 1.04], s: [0.08, 0.13, 0.06], mat: 'glow' });
        break;
      case 5:
        // Schattenkrone: lange geschwungene Hörner mit Glutspitzen, kleine Dornen an der Stirn
        for (const sx of [-1, 1]) {
          curvedHorn3(W, [[sx * 0.6, 0.65, 0.2], [sx * 1.0, 1.1, -0.1], [sx * 1.15, 1.6, -0.55], [sx * 1.0, 1.95, -0.95], [sx * 0.8, 2.1, -1.2]], 0.17, '#1a1416', { shine: 0.5 });
          W(sphere3(0.05, 6, 4), '#ff7a2a', { p: [sx * 0.8, 2.1, -1.2], mat: 'glow' });
          coneAlong(W, G3.spike(), [sx * 0.25, 0.75, 0.9], [sx * 0.2, 1, 0.4], 0.22, 0.3, '#1a1416');
        }
        break;
      case 6:
        // Sternenkapuze: Lichtpunkte, zwei davon zu einem Sternbild verbunden
        for (const d of HOOD_DOTS3) W(sphere3(0.04, 6, 4), '#e6f6ff', { p: dotOn3(d, 1.16), mat: 'glow' });
        for (const [i, j] of [[0, 4], [4, 5], [1, 7]]) limbBetween(W, dotOn3(HOOD_DOTS3[i], 1.16), dotOn3(HOOD_DOTS3[j], 1.16), 0.012, 0.012, '#bfe8ff', { mat: 'glow', seg: 3 });
        break;
      case 8:
        // Abgrundkapuze (seit 13.53): zwei eingerollte Tentakelhörner, ein großes Leerenauge über der Stirn, Splitter schweben um die
        // Kapuze
        voidEye3(sub3(W, [0, 0.66, 0.98], [-0.35, 0, 0]), [0, 0, 0], 0.22);
        for (const sx of [-1, 1]) {
          tendril3(W, [[sx * 0.55, 0.72, 0.05], [sx * 0.98, 1.0, -0.2], [sx * 1.28, 0.92, -0.62], [sx * 1.3, 0.58, -0.9], [sx * 1.12, 0.46, -0.76]], 0.2);
        }
        for (const d of HOOD_DOTS3.slice(2, 6)) voidShard3(W, dotOn3(d, 1.48), d, 0.16, 0.05);
        break;
      case 9: {
        // Ewigkeitskrone (seit 13.53): Platinreif mit Strahlenzacken aus Platin und Roségold, Stern auf der Stirn,
        // darüber ein schwebendes Sternbild
        W(torus3(1.02, 0.07, Math.PI * 2, 4, 24), PLATIN3, { p: [0, 0.6, 0], r: [Math.PI / 2 - 0.15, 0, 0], shine: 1, top: '#f0eef8', topK: 0.35 });
        for (let k = 0; k < 7; k++) {
          const m = ((k - 3) / 7) * Math.PI * 1.4;
          coneAlong(W, G3.ray(), ringPt3(1.02, 0.6 + 0.15 * Math.cos(m), m), [Math.sin(m) * 0.25, 1, Math.cos(m) * 0.25], k === 3 ? 0.75 : 0.4 + (k % 2 ? 0 : 0.14), 1.2, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
        }
        nova3(sub3(W, [0, 0.82, 1.06], [-0.25, 0, 0]), [0, 0, 0], 0.22);
        const pts = [[-0.7, 1.75, -0.3], [-0.25, 2.05, -0.5], [0.3, 1.9, -0.35], [0.75, 2.15, -0.55]];
        pts.forEach((q, k) => {
          star3(W, q, k % 2 ? 0.12 : 0.16, k % 2 ? ROSEGLOW3 : '#fff4fa');
          if (k) limbBetween(W, pts[k - 1], q, 0.012, 0.012, '#ffd6f0', { mat: 'glow', seg: 3 });
        });
        break;
      }
      default:
        // Götterschädel: goldene Schädelkappe mit Lichtaugen und ein Heiligenschein
        skullCap(GOLD3, '#ffe9a0');
        W(torus3(0.78, 0.055, Math.PI * 2, 4, 26), '#fff2b0', { p: [0, 1.35, -0.4], r: [Math.PI / 2 - 0.5, 0, 0], mat: 'glow' });
    }
  };
}

// Magier (seit 8.6): spitzer Krempenhut (Krempe 1,3, Kegel gut 2 Kopfradien, Spitze nach hinten), Band in der
// Elementfarbe ab Stufe 0; Stufe 7 Silberreif mit drei schwebenden Kristallen, ab Stufe 8 (seit 13.53) wieder Hüte. Stern, Siegel und Kristalle
// am Hut kreisen an einem eigenen Drehknochen (spinBones3), o.tilt neigt den Hut der Magierin etwas zur Seite.
// Hutkegel je Stufe als ein gebogener Drehkörper (ohne Stufen an den Gelenken): Höhe, Neigung der Spitze nach
// hinten, Knick (die Spitze fällt herab), Neigung zur Seite
const HAT3_CONE = [
  { h: 2.0, bend: 0.65, droop: 0.6, side: 0.12 },
  { h: 2.1, bend: 0.3, droop: 0, side: 0 },
  { h: 2.45, bend: 0.4, droop: 0, side: 0 },
  { h: 1.95, bend: 0.2, droop: 0, side: 0 },
  { h: 2.1, bend: 0.3, droop: 0, side: 0 },
  { h: 1.95, bend: 0.35, droop: 0.12, side: 0.16 },
  { h: 2.0, bend: 0.9, droop: 0.8, side: 0 },
  // Stufe 7 trägt keinen Hut (Erzmagierreif); seit 13.53: 8 Abgrundhut (hoch, wie ein Tentakel zur Seite geschwungen),
  // 9 Ewigkeitshut (hoch und gerade)
  { h: 2.0, bend: 0.3, droop: 0, side: 0 },
  { h: 2.5, bend: 0.5, droop: 0.3, side: -0.42 },
  { h: 2.6, bend: 0.18, droop: 0, side: 0 }
];
const hatR3 = (u) => 0.94 * Math.pow(1 - u, 1.35);
// Punkt auf dem Hutkegel der Stufe s in der Höhe u (0 Krempe, 1 Spitze), Richtung m (0 vorn)
function hatPt3(s, u, m = 0, out = 0) {
  const c = HAT3_CONE[s];
  const r = hatR3(u) + out;
  return [Math.sin(m) * r + c.side * u * u * u, u * c.h - c.droop * Math.pow(u, 4), Math.cos(m) * r - c.bend * Math.pow(u, 2.5)];
}
const hatConeGeo3 = (s) => geo3('mhcone' + s, () => {
  const pts = [];
  for (let i = 0; i <= 16; i++) pts.push(new THREE.Vector2(hatR3(i / 16), i / 16));
  const geo = new THREE.LatheGeometry(pts, 18);
  const P = geo.attributes.position;
  const c = HAT3_CONE[s];
  for (let i = 0; i < P.count; i++) {
    const u = P.getY(i);
    P.setXYZ(i, P.getX(i) + c.side * u * u * u, u * c.h - c.droop * Math.pow(u, 4), P.getZ(i) - c.bend * Math.pow(u, 2.5));
  }
  geo.computeVertexNormals();
  return geo;
});
function magierHelm3(t, hat, silver, accent, o = {}) {
  if (t === -2) return null;
  const s = t < 0 ? 0 : t;
  return (A, hb, hc, hr, spin) => {
    const W = sub3(headFrame3(A, hb, hc, hr), [0, 0, 0], [0, 0, o.tilt || 0]);
    // kreisende Teile: am Drehknochen (Mittelpunkt wie in playerConfig3: c.spinHat), sonst fest
    const orbit = (at) => sub3(spin && spin.hat != null ? frame3(A, spin.hat, hc, [0, 0, 0], hr) : headFrame3(A, hb, hc, hr), at);
    if (s === 7) {
      // Erzmagierreif: Silberreif mit Stirnstein, darüber kreisen drei Kristalle
      W(torus3(1.04, 0.07, Math.PI * 2, 4, 26), silver, { p: [0, 0.42, -0.02], r: [Math.PI / 2 - 0.2, 0, 0], shine: 1, top: '#ffffff', topK: 0.4 });
      W(G3.gem(), accent, { p: [0, 0.66, 1.0], s: [0.1, 0.16, 0.07], mat: 'glow' });
      coneAlong(W, G3.ray(), [0, 0.6, 1.0], [0, 1, 0.25], 0.38, 1.2, silver, { shine: 1 });
      const O = orbit([0, 1.05, 0]);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        floatGem3(O, [Math.sin(a) * 1.25, 0, Math.cos(a) * 1.25], 0.13, accent);
      }
      return;
    }
    // leicht nach vorn geneigt: der Kopf ist zur Kamera gekippt, so bleibt der Kegel auch von hinten ein Kegel
    const H = sub3(W, [0, 0.5, -0.04], [0.1, 0, 0]);
    const soft = s === 0;
    const col = hat;
    // Krempe (vorn etwas hochgebogen) und Kegel
    H(lathe3('mhbrim', [[0.86, 0.06], [1.05, 0.02], [1.24, -0.03], [1.32, -0.01], [1.3, 0.04], [1.05, 0.08], [0.86, 0.1]], 24), col, { shade: 0.2, top: lighter(col, 0.12), topK: 0.35 });
    H(hatConeGeo3(s), col, { shade: 0.15, top: lighter(col, soft ? 0.06 : 0.1), topK: 0.3 });
    const pt = (y, m, out) => hatPt3(s, y / HAT3_CONE[s].h, m, out);
    // Hutband: Stoff (Novize), Silber mit Stein, leuchtende Runen, verkohlt
    const band = (c, oo = {}) => H(torus3(0.93, 0.075, Math.PI * 2, 4, 24), c, Object.assign({ p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.3] }, oo));
    // schmaler Streifen in der Elementfarbe über dem Silberband (die Elemente bleiben auch von weitem unterscheidbar)
    const stripe = () => H(torus3(0.89, 0.032, Math.PI * 2, 3, 24), accent, { p: [0, 0.22, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
    const tipEnd = hatPt3(s, 1);
    switch (s) {
      case 0:
        // Novizenhut: weiche Spitze geknickt, Stoffband in der Elementfarbe, ein Flicken
        band(accent, { shine: 0.1 });
        sub3(H, pt(0.45, 0.9, 0.02), [-0.4, 0.9, 0])(roundBox(0.3, 0.26, 0.04, 0.02), lighter(col, 0.16), { r: [0, 0, 0.3] });
        break;
      case 1:
        // Gelehrtenhut: Silberband mit Elementstein in Silberfassung
        band(silver, { shine: 1 });
        stripe();
        H(torus3(0.16, 0.035, Math.PI * 2, 3, 12), silver, { p: [0, 0.12, 0.99], shine: 1 });
        H(G3.gem(), accent, { p: [0, 0.12, 1.02], s: [0.14, 0.2, 0.08], mat: 'glow' });
        break;
      case 2:
        // Runenhut: hoch, leuchtendes Band mit fünf Dreiecksrunen
        band(darker(col, 0.2));
        H(torus3(0.95, 0.025, Math.PI * 2, 3, 24), accent, { p: [0, 0.1, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
        for (let k = -2; k <= 2; k++) {
          const m = k * 0.62;
          sub3(H, pt(0.1, m, 0.1), [0, m, 0])(triGeo3(), accent, { s: [0.09, 0.09, 0.1], r: [0, 0, glyphUp3(o.glyph) ? Math.PI : 0], mat: 'glow' });
        }
        break;
      case 3:
        // Kristallhut: Spitze endet in einem schwebenden Kristall, Eiskristalle am Band
        band(silver, { shine: 1 });
        stripe();
        floatGem3(H, [tipEnd[0], tipEnd[1] + 0.32, tipEnd[2] - 0.08], 0.13, accent);
        for (const m of [-0.5, 0.5]) coneAlong(H, G3.gem(), pt(0.14, m, 0.06), [Math.sin(m) * 0.6, 1, 0.4], 0.24, 0.1, '#cfe6ff', { shine: 1 });
        break;
      case 4:
        // Arkanhut: Krempe glüht, über der Spitze kreist ein kleines Dreieckssiegel
        band(silver, { shine: 1 });
        stripe();
        H(torus3(1.31, 0.035, Math.PI * 2, 3, 30), accent, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
        mageGlyph3(sub3(orbit([0, 2.9, -0.15]), [0, 0, 0], [-0.25, 0, 0]), [0, 0, 0], 0.28, o.glyph, accent, { mat: 'glow' });
        break;
      case 5:
        // Aschenhut: verkohlt, Glutlöcher, Rauchfaden über der Spitze
        band('#2a1e1c', { shine: 0.2 });
        for (const [y, m, r] of [[0.3, 0.6, 0.07], [0.55, -0.7, 0.06], [0.2, -1.6, 0.08], [0.7, 2.4, 0.05], [0.4, 1.9, 0.06]]) H(sphere3(r, 6, 4), '#ff7a2a', { p: pt(y, m, -0.01), mat: 'glow' });
        H(torus3(1.3, 0.025, Math.PI * 2, 3, 30), '#ff7a2a', { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
        for (let k = 0; k < 3; k++) H(G3.puff(), '#5a5258', { p: [tipEnd[0] + Math.sin(k * 2) * 0.08, tipEnd[1] + 0.22 + k * 0.24, tipEnd[2] - k * 0.06], s: 0.1 + k * 0.04, shade: 0.2 });
        break;
      case 6:
        // Sternenhut: Sternpunkte auf dem Kegel, gerollte Spitze, ein Stern kreist um den Hut
        band(silver, { shine: 1 });
        stripe();
        crescent3(H, [0, 0.12, 0.99], 0.12, 0.03, Math.PI / 2, Math.PI * 1.2, '#e8f0ff');
        for (const [y, m] of [[0.3, 0.3], [0.55, -0.5], [0.25, -1.4], [0.7, 1.2], [0.45, 2.2], [0.35, -2.5], [0.8, -0.1]]) H(sphere3(0.035, 6, 4), '#e6f6ff', { p: pt(y, m, 0.005), mat: 'glow' });
        star3(orbit([0, 1.15, -0.12]), [1.15, 0, 0], 0.14, '#e6f6ff');
        break;
      case 8: {
        // Abgrundhut (seit 13.53): Leerenband mit Leerenauge, glühende Saugnäpfe den Kegel hinauf, leuchtende Krempe,
        // drei Leerensplitter kreisen um den Kegel (Drehknochen wie c.spinHat)
        band(VOID3, { shine: 0.6 });
        stripe();
        H(torus3(1.31, 0.03, Math.PI * 2, 3, 30), VOIDGLOW3, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
        voidEye3(H, [0, 0.12, 1.0], 0.15);
        for (const [y, m] of [[0.55, 0.25], [0.95, -0.2], [1.35, 0.15], [1.75, -0.1], [2.1, 0.1]]) H(sphere3(0.05 - y * 0.012, 6, 4), VOIDGLOW3, { p: pt(y, m, 0.005), mat: 'glow' });
        const O = orbit([0, 1.5, -0.1]);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          voidShard3(O, [Math.sin(a) * 1.05, (k % 2) * 0.2, Math.cos(a) * 1.05], [0, 1, 0], 0.2, 0.07);
        }
        break;
      }
      case 9: {
        // Ewigkeitshut (seit 13.53): Roségoldband und Krempe, Sternbild den Kegel hinauf, achtstrahliger Stern über
        // der Spitze, ein Kranz aus vier Sternen kreist um den Hut
        band(ROSEGOLD3, { shine: 1 });
        stripe();
        H(torus3(1.31, 0.03, Math.PI * 2, 3, 30), ROSEGOLD3, { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
        H(G3.gem(), ROSEGLOW3, { p: [0, 0.12, 1.0], s: [0.1, 0.15, 0.07], mat: 'glow' });
        const cs = [[0.45, 0.35], [0.85, -0.15], [1.25, 0.3], [1.7, -0.05], [2.05, 0.2]];
        cs.forEach(([y, m], k) => {
          H(sphere3(0.04, 6, 4), k % 2 ? ROSEGLOW3 : '#fff4fa', { p: pt(y, m, 0.01), mat: 'glow' });
          if (k) limbBetween(H, pt(cs[k - 1][0], cs[k - 1][1], 0.012), pt(y, m, 0.012), 0.01, 0.01, '#ffd6f0', { mat: 'glow', seg: 3 });
        });
        nova3(H, [tipEnd[0], tipEnd[1] + 0.32, tipEnd[2]], 0.3);
        const O = orbit([0, 1.3, -0.1]);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          star3(sub3(O, [Math.sin(a) * 1.15, 0, Math.cos(a) * 1.15], [0, a, 0]), [0, 0, 0], 0.13, k % 2 ? ROSEGLOW3 : '#fff4fa');
        }
        break;
      }
      default:
    }
  };
}

// --- Rüstung und Roben ---------------------------------------------------------------------------
// humanoid3 baut Rumpf, Rock oder Robe in den Grundfarben (Schalter wie cuirass, lamellar, chestPlate);
// armorLook3 stellt diese Schalter je Stufe um, gearArmor3 setzt das Merkmal der Stufe darauf.

// Umriss von Rumpf, Harnisch und Robe (Radius je Höhe über ihrem Ansatz), wie in humanoid3
const TORSO3_M = [[0, 0.17], [0.05, 0.2], [0.13, 0.19], [0.24, 0.21], [0.3, 0.22], [0.38, 0.19], [0.43, 0.12]];
const TORSO3_F = [[0, 0.18], [0.05, 0.2], [0.15, 0.165], [0.26, 0.185], [0.31, 0.195], [0.38, 0.17], [0.43, 0.11]];
const CUIRASS3 = [[0, 0.2], [0.02, 0.215], [0.1, 0.228], [0.18, 0.232], [0.26, 0.205], [0.31, 0.14]];
const ROBE3 = [[0, 0.31], [0.03, 0.32], [0.2, 0.28], [0.4, 0.23], [0.47, 0.2]];

function profileR3(pts, y) {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, r0] = pts[i - 1];
      const [y1, r1] = pts[i];
      return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

// Halbachsen [x, z] des Rumpfes in Höhe y (mit Harnisch, falls getragen)
function torsoAt3(g, y) {
  let rx = profileR3(g.female ? TORSO3_F : TORSO3_M, y - (g.hipY - 0.02)) * g.bk;
  let rz = rx * 0.84;
  const cy = y - (g.hipY + 0.11);
  if (g.cuirass && cy >= 0 && cy <= 0.31) {
    const cr = profileR3(CUIRASS3, cy) * g.bk;
    rx = Math.max(rx, cr);
    rz = Math.max(rz, cr * 0.88);
  }
  return [rx, rz];
}
// Halbachsen der Robe in Höhe y (Hüftknochen)
function robeAt3(y) {
  const r = profileR3(ROBE3, y - 0.02);
  return [r, r * 0.88];
}

// Rahmen auf der Körperoberfläche: Punkt (x, y) vorn (side 1) oder hinten (−1), lokale +z zeigt nach außen
function onBody3(W, g, x, y, side = 1, lift = 0, at = torsoAt3) {
  const [rx, rz] = at(g, y);
  const u = Math.max(-0.97, Math.min(0.97, x / rx));
  const z = rz * Math.sqrt(1 - u * u);
  const yaw = Math.atan2(x / (rx * rx), side * z / (rz * rz));
  return sub3(W, [x + Math.sin(yaw) * lift, y, side * z + Math.cos(yaw) * lift], [0, yaw, 0]);
}
const onRobe3 = (W, g, x, y, side = 1, lift = 0) => onBody3(W, g, x, y, side, lift, (gg, yy) => robeAt3(yy));

// Linie auf der Körperoberfläche von (x0, y0) nach (x1, y1) aus n kurzen Stücken (Schnürung, Nähte, Risse)
function bodyLine3(W, g, a, b, n, w, color, o = {}, side = 1, at = torsoAt3) {
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.5) / n;
    const x = a[0] + (b[0] - a[0]) * t0;
    const y = a[1] + (b[1] - a[1]) * t0;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) / n;
    const F = onBody3(W, g, x, y, side, 0.006, at);
    F(roundBox(w, len * 1.15, w * 0.7, w * 0.35), color, Object.assign({ r: [0, 0, -Math.atan2(b[0] - a[0], b[1] - a[1]) * side] }, o));
  }
}

// Ring um den Körper in Höhe y mit den Halbachsen rx, rz
function bodyRing3(W, y, rx, rz, tube, color, o = {}) {
  W(torus3(0.2, tube, Math.PI * 2, 3, 18), color, Object.assign({ p: [0, y, 0], r: [Math.PI / 2, 0, 0], s: [rx / 0.2, rz / 0.2, 1] }, o));
}
// Teilbogen vorn um den Körper (mid 0 = vorn), z. B. Rippen
function arcAt3(W, y, rx, rz, tube, a0, a1, color, o = {}) {
  W(torus3(0.2, tube, a1 - a0, 3, Math.max(4, Math.round((a1 - a0) * 6))), color, Object.assign({ p: [0, y, 0], r: [Math.PI / 2, 0, Math.PI / 2 + a0], s: [rx / 0.2, rz / 0.2, 1] }, o));
}

// Rippenkorb (Knochenrobe, Götterrobe): Brustbein und vier Rippenpaare
function ribcage3(W, g, col) {
  const F = onBody3(W, g, 0, g.chestY + 0.02, 1, 0.012);
  const sh = col === GOLD3 || col === PLATIN3 || col === VOIDMETAL3 ? 1 : 0.2;
  F(roundBox(0.035, 0.2, 0.025, 0.012), col, { shine: sh });
  for (let k = 0; k < 4; k++) {
    const y = g.chestY + 0.1 - k * 0.055;
    const [rx, rz] = torsoAt3(g, y);
    for (const sx of [-1, 1]) {
      const a0 = sx > 0 ? -1.35 : 0.14;
      arcAt3(W, y - Math.abs(k) * 0.004, rx + 0.014, rz + 0.014, 0.013, a0, a0 + 1.21, col, { shine: sh });
    }
  }
}

// Hoher Kragen hinten und an den Seiten (vorn offen)
function highCollar3(W, g, col, h = 0.15) {
  W(geo3(`g3collar${h}`, () => {
    const pts = [[0.13, 0], [0.165, 0], [0.215, h], [0.195, h + 0.012], [0.135, 0.012], [0.13, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts, 16, Math.PI * 0.3, Math.PI * 1.4);
    geo.computeVertexNormals();
    return geo;
  }), col, { p: [0, g.neckY - 0.12, -0.01], s: [g.bk, 1, 0.9 * g.bk], shine: 1, top: lighter(col, 0.3), topK: 0.4 });
}

// Schuppenreihe um die Taille (Drachenrobe), Schuppen zeigen nach unten
function scaleBand3(W, g, y, n, col) {
  const [rx, rz] = torsoAt3(g, y);
  for (let k = 0; k < n; k++) {
    const m = (k / n) * Math.PI * 2;
    sub3(W, [Math.sin(m) * rx, y, Math.cos(m) * rz], [0, m, 0])(G3.scale(), k % 2 ? col : lighter(col, 0.15), { r: [Math.PI / 2 - 0.35, 0, 0], s: 0.045, shine: 0.6 });
  }
}

// Schalter für humanoid3 je Klasse und Stufe (Grundform der Rüstung)
function armorLook3(c, cls, t) {
  if (t < 0) return;
  if (cls === 'krieger') {
    const plate = GEAR_LOOK.plate[t];
    c.cracks = null;
    if (t === 0) {
      // Lederweste: kein Metall, Lederbeintaschen
      c.lamellar = null; c.cuirass = null; c.kneePads = null;
    } else if (t === 1) {
      // Kettenhemd: Ringe über Brust und Bauch (gearArmor3), Rumpf in Kettenfarbe
      c.cuirass = null; c.lamellar = null; c.torso = '#8a8070'; c.skirt = darker(c.skirt || '#6a3030', 0.05);
    } else if (t === 2) {
      c.cuirass = null; c.lamellar = plate;
    }
    if (t === 6) { c.tassets = null; c.featherTassets = true; }
    // seit 13.53: Abgrund mit cyanfarbenen Rissen im Harnisch, Ewigkeit mit Platin glänzend
    if (t === 8) c.cracks = VOIDGLOW3;
  } else if (cls === 'ninja') {
    if (t === 0) { c.straps = null; c.kunai = null; c.holster = null; }
    if (t === 1) c.chestPlate = '#5a4030';
    if (t === 3) c.crossStraps = false;
    if (t === 7) c.collar = GOLD3;
    if (t === 9) c.collar = ROSEGOLD3;
  } else if (cls === 'schamane') {
    if (t === 0) c.hemTrim = darker(c.robe, 0.25);
    if (t === 1) c.robeShine = 0.45;
    if (t >= 3) c.hemTrim = t === 5 ? '#ff9a4a' : t === 6 ? '#e6f2ff' : t === 8 ? VOIDGLOW3 : t === 9 ? ROSEGOLD3 : GOLD3;
    if (t === 9) c.robeShine = 0.35;
  } else if (cls === 'magier') {
    // Saum je Stufe: Wolle, Silber, Silber, Eis, Silber, Glut, Sternsilber, Gold, Leerencyan, Roségold
    if (t === 0) c.hemTrim = darker(c.robe, 0.22);
    if (t === 1) c.robeShine = 0.3;
    // Runenmantel: offener Übermantel in der Robenfarbe über einer hellen Unterrobe
    if (t === 2) {
      c.coat = c.robe;
      c.robe = mixColor(c.robe, '#c8d2e4', 0.4);
      c.torso = c.robe;
    }
    if (t === 3) c.hemTrim = '#cfe6ff';
    if (t === 5) c.hemTrim = '#ff8a4a';
    if (t === 6) c.hemTrim = '#e8f0ff';
    if (t === 7) c.hemTrim = GOLD3;
    if (t === 8) c.hemTrim = VOIDGLOW3;
    if (t === 9) { c.hemTrim = ROSEGOLD3; c.robeShine = 0.3; }
  } else {
    if (t >= 2) c.runes = null;
    if (t === 7) c.hemTrim = GOLD3;
    if (t === 8) c.hemTrim = VOIDGLOW3;
    if (t === 9) c.hemTrim = ROSEGOLD3;
  }
}

const ARMOR3 = {
  krieger: [
    // Lederpanzer: Kreuzschnürung vorn, aufgenähte Riemen, Flicken mit Stichen
    (W, g) => {
      const y0 = g.hipY + 0.06;
      const y1 = g.chestY + 0.12;
      bodyLine3(W, g, [0, y0], [0, y1], 4, 0.016, '#2a1a10');
      for (let k = 0; k < 4; k++) {
        const y = y0 + 0.03 + k * 0.065;
        bodyLine3(W, g, [-0.035, y - 0.025], [0.035, y + 0.025], 1, 0.01, '#d8c8a0');
        bodyLine3(W, g, [0.035, y - 0.025], [-0.035, y + 0.025], 1, 0.01, '#d8c8a0');
      }
      for (const sx of [-1, 1]) bodyLine3(W, g, [sx * 0.1 * g.bk, g.hipY + 0.12], [sx * 0.12 * g.bk, g.chestY + 0.15], 3, 0.04, '#4a3020');
      onBody3(W, g, -0.12 * g.bk, g.hipY + 0.1, 1, 0.006)(roundBox(0.07, 0.06, 0.012, 0.006), '#9a7a52', {});
    },
    // Kettenhemd: Ringreihen, schräger Ledergurt mit Bronzeschnalle
    (W, g) => {
      for (let k = 0; k < 6; k++) {
        const y = g.hipY + 0.03 + k * 0.055;
        const [rx, rz] = torsoAt3(g, y);
        bodyRing3(W, y, rx + 0.006, rz + 0.006, 0.012, k % 2 ? '#a8a090' : '#7a7264', { shine: 0.8 });
      }
      const [, rz] = torsoAt3(g, g.chestY);
      W(roundBox(0.05, 0.56, rz * 2 + 0.04, 0.02), '#5a3a22', { p: [0, g.chestY - 0.02, 0], r: [0, 0, 0.62] });
      onBody3(W, g, -0.05, g.chestY + 0.06, 1, 0.025)(roundBox(0.055, 0.05, 0.015, 0.008), TIER_METAL[1], { r: [0, 0, 0.62], shine: 1 });
    },
    // Lamellenpanzer: Plattenreihen vorn, Mondsichel auf der Brust
    (W, g, c) => {
      const plate = c.lamellar || '#8f98a3';
      for (let row = 0; row < 3; row++) {
        const y = g.hipY + 0.1 + row * 0.075;
        for (let k = -3; k <= 3; k++) {
          const [rx] = torsoAt3(g, y);
          onBody3(W, g, Math.sin(k * 0.3) * rx, y, 1, 0.03)(roundBox(0.052, 0.078, 0.012, 0.006), k % 2 ? plate : lighter(plate, 0.12), { r: [0.12, 0, 0], shine: 0.7 });
        }
      }
      const E = onBody3(W, g, 0, g.chestY + 0.11, 1, 0.045);
      crescent3(E, [0, 0, 0], 0.055, 0.016, Math.PI * 0.85, Math.PI * 1.25, '#e6eef8');
      E(sphere3(0.012, 6, 4), GLOW3[2], { p: [0.03, 0.02, 0.005], mat: 'glow' });
    },
    // Drachenpanzer: Drachenkopf auf der Brust, Schuppen am Bauch, Dornen an den Beintaschen
    (W, g, c, Wh) => {
      const red = darker(c.cuirass || '#a8343f', 0.15);
      const E = onBody3(W, g, 0, g.chestY + 0.06, 1, 0.01);
      E(ball(10), red, { p: [0, 0, 0.02], s: [0.07, 0.055, 0.045], shine: 0.6 });
      E(ball(8), red, { p: [0, -0.03, 0.06], s: [0.045, 0.03, 0.05], shine: 0.6 });
      for (const sx of [-1, 1]) {
        coneAlong(E, horn3(1, 0.25, 5), [sx * 0.045, 0.035, 0.02], [sx * 0.8, 1, -0.3], 0.09, 0.12, '#e8dcc0');
        E(sphere3(0.012, 6, 4), GLOW3[3], { p: [sx * 0.03, 0.012, 0.06], mat: 'glow' });
        coneAlong(E, horn3(1, 0.3, 4), [sx * 0.022, -0.048, 0.09], [0, -1, 0.2], 0.03, 0.04, '#f4ecd8');
      }
      for (let row = 0; row < 2; row++) for (let k = -1; k <= 1; k++) {
        onBody3(W, g, k * 0.07, g.hipY + 0.07 + row * 0.06, 1, 0.008)(G3.scale(), (k + row) % 2 ? red : lighter(red, 0.15), { r: [Math.PI / 2 - 0.3, 0, 0], s: 0.045, shine: 0.6 });
      }
      for (const [x, z] of [[-0.09, 0.19], [0.09, 0.19]]) coneAlong(Wh, G3.spike(), [x * g.bk, g.hipY - 0.17, (z + 0.03) * g.bk], [x * 3, -1, 0.6], 0.08, 0.2, '#e8dcc0');
    },
    // Seelenpanzer: schwebender Kristall vor der Brust, Runenlinien, Spirale
    (W, g) => {
      const E = onBody3(W, g, 0, g.chestY + 0.06, 1, 0.01);
      floatGem3(E, [0, 0, 0.11], 0.035, GLOW3[4]);
      for (const sx of [-1, 1]) {
        bodyLine3(W, g, [sx * 0.05, g.hipY + 0.14], [sx * 0.11, g.chestY + 0.12], 3, 0.012, GLOW3[4], { mat: 'glow' });
        bodyLine3(W, g, [sx * 0.11, g.chestY + 0.12], [sx * 0.15, g.chestY + 0.02], 1, 0.012, GLOW3[4], { mat: 'glow' });
      }
      E(torus3(0.035, 0.007, Math.PI * 1.6, 3, 10), GLOW3[4], { p: [0, -0.07, 0.004], mat: 'glow' });
    },
    // Aschenpanzer: Dornenkranz am Kragen, Zacken am Plattenrand, glühende Risse
    (W, g) => {
      for (let k = 0; k < 8; k++) {
        const m = (k / 8) * Math.PI * 2;
        emberSpike3(W, [Math.sin(m) * 0.15 * g.bk, g.neckY - 0.05, Math.cos(m) * 0.13 * g.bk], [Math.sin(m) * 0.7, 1, Math.cos(m) * 0.7], 0.11 + (k % 2) * 0.04, 0.2);
      }
      for (let k = -3; k <= 3; k++) {
        const m = k * 0.42;
        const y = g.hipY + 0.11;
        const [rx, rz] = torsoAt3(g, y + 0.01);
        coneAlong(W, G3.spike(), [Math.sin(m) * rx, y, Math.cos(m) * rz], [Math.sin(m) * 0.3, -1, Math.cos(m) * 0.3], 0.07, 0.16, OBSIDIAN3);
      }
      for (const [a, b] of [[[-0.12, g.hipY + 0.2], [-0.04, g.chestY + 0.08]], [[0.1, g.hipY + 0.14], [0.03, g.hipY + 0.24]], [[0.05, g.chestY + 0.02], [0.13, g.chestY + 0.12]]]) {
        bodyLine3(W, g, a, b, 2, 0.014, '#ff7a2a', { mat: 'glow' });
      }
    },
    // Himmelspanzer: Flügelwappen auf der Brust, Beintaschen aus Federn
    (W, g, c, Wh) => {
      const E = onBody3(W, g, 0, g.chestY + 0.06, 1, 0.012);
      for (const sx of [-1, 1]) wing3(E, [sx * 0.012, -0.01, 0], sx, 4, 0.1, FEATHER3, '#bfe8ff', {}, 0.15);
      E(G3.gem(), GLOW3[6], { s: [0.016, 0.024, 0.012], mat: 'glow', p: [0, 0, 0.012] });
      for (let row = 0; row < 2; row++) {
        for (let k = 0; k < 11; k++) {
          const m = -1.75 + k * 0.35 + row * 0.17;
          sub3(Wh, [Math.sin(m) * (0.255 + row * 0.01) * g.bk, g.hipY - 0.05 - row * 0.075, Math.cos(m) * (0.22 + row * 0.01) * g.bk], [0, m, 0])(G3.feather(), (k + row) % 2 ? FEATHER3 : '#dfefff', { r: [Math.PI - 0.25, 0, 0], s: 0.13, top: '#bfe8ff', topK: 0.5 });
        }
      }
    },
    // Götterpanzer: Sonnenscheibe, hoher Kragen, drei Lagen Beintaschen
    (W, g, c, Wh) => {
      sun3(onBody3(W, g, 0, g.chestY + 0.05, 1, 0.012), [0, 0, 0], 0.06, 10, GOLD3, GLOW3[7]);
      highCollar3(W, g, GOLD3);
      for (let row = 1; row <= 2; row++) {
        for (const [x, z, ry] of [[-0.09, 0.19, 0.25], [0.09, 0.19, -0.25], [-0.2, 0.02, 1.4], [0.2, 0.02, -1.4]]) {
          Wh(roundBox(0.12 - row * 0.012, 0.15, 0.025, 0.012), row % 2 ? '#fff2b0' : GOLD3, { p: [x * g.bk * (1 + row * 0.04), g.hipY - 0.1 - row * 0.075, z * g.bk * (1 + row * 0.06)], r: [0.18, ry, 0], shine: 1 });
        }
      }
    },
    // Abgrundpanzer (seit 13.53): Leerenauge auf der Brust, cyanfarbene Risse laufen von ihm aus, zwei Tentakel
    // steigen hinter den Schultern auf, Leerensplitter hängen an den Beintaschen
    (W, g, c, Wh) => {
      voidEye3(onBody3(W, g, 0, g.chestY + 0.06, 1, 0.016), [0, 0, 0], 0.05);
      for (const [a, b] of [[[-0.035, g.chestY + 0.03], [-0.12, g.hipY + 0.14]], [[0.04, g.chestY + 0.03], [0.1, g.hipY + 0.1]], [[0.05, g.chestY + 0.1], [0.14, g.chestY + 0.15]], [[-0.05, g.chestY + 0.1], [-0.13, g.chestY + 0.16]]]) bodyLine3(W, g, a, b, 3, 0.012, VOIDGLOW3, { mat: 'glow' });
      for (const sx of [-1, 1]) tendril3(W, [[sx * 0.1 * g.bk, g.chestY + 0.06, -0.19 * g.bk], [sx * 0.26 * g.bk, g.shY + 0.04, -0.3 * g.bk], [sx * 0.45 * g.bk, g.shY + 0.14, -0.34 * g.bk], [sx * 0.6 * g.bk, g.shY + 0.08, -0.28 * g.bk], [sx * 0.6 * g.bk, g.shY - 0.04, -0.24 * g.bk], [sx * 0.52 * g.bk, g.shY - 0.02, -0.25 * g.bk]], 0.04);
      for (const [x, z] of [[-0.09, 0.19], [0.09, 0.19], [-0.2, 0.02], [0.2, 0.02]]) voidShard3(Wh, [x * g.bk, g.hipY - 0.2, (z + 0.03) * g.bk], [x * 2, -1, z * 1.5], 0.07, 0.022);
    },
    // Ewigkeitspanzer (seit 13.53): achtstrahliger Stern auf der Brust, Strahlenkragen im Nacken, Prismensteine am
    // Gürtelrand, Beintaschen aus Platin mit Roségoldkante
    (W, g, c, Wh) => {
      nova3(onBody3(W, g, 0, g.chestY + 0.06, 1, 0.016), [0, 0, 0], 0.075);
      for (let k = 0; k < 7; k++) {
        const m = Math.PI * (0.62 + (k / 6) * 0.76);
        coneAlong(W, G3.ray(), [Math.sin(m) * 0.15 * g.bk, g.neckY - 0.06, Math.cos(m) * 0.13 * g.bk], [Math.sin(m) * 0.5, 1, Math.cos(m) * 0.5], k % 2 ? 0.1 : 0.16, 0.3, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
      }
      for (let k = -3; k <= 3; k++) {
        const y = g.hipY + 0.11;
        const m = k * 0.42;
        const [rx, rz] = torsoAt3(g, y);
        W(G3.gem(), PRISM3[(k + 3) % PRISM3.length], { p: [Math.sin(m) * (rx + 0.012), y, Math.cos(m) * (rz + 0.012)], s: [0.012, 0.018, 0.012], mat: 'glow' });
      }
      for (const [x, z, ry] of [[-0.09, 0.19, 0.25], [0.09, 0.19, -0.25], [-0.2, 0.02, 1.4], [0.2, 0.02, -1.4]]) {
        const T = sub3(Wh, [x * g.bk * 1.06, g.hipY - 0.17, z * g.bk * 1.08], [0.18, ry, 0]);
        T(roundBox(0.11, 0.16, 0.022, 0.011), PLATIN3, { shine: 1, top: '#f0eef8', topK: 0.35 });
        T(roundBox(0.115, 0.018, 0.026, 0.008), ROSEGOLD3, { p: [0, -0.075, 0.003], shine: 1 });
        T(G3.gem(), ROSEGLOW3, { p: [0, 0.01, 0.016], s: [0.012, 0.016, 0.008], mat: 'glow' });
      }
    }
  ],
  ninja: [
    // Leinenwams: überkreuzter Kragen vorn, Strickgürtel mit Knoten
    (W, g) => {
      bodyLine3(W, g, [0.12 * g.bk, g.chestY + 0.13], [-0.06, g.hipY + 0.06], 4, 0.04, '#e8dcc0');
      const y = g.hipY + 0.08;
      const [rx, rz] = torsoAt3(g, y);
      bodyRing3(W, y, rx + 0.01, rz + 0.01, 0.015, '#c8b890');
      const K = onBody3(W, g, -0.06, y, 1, 0.02);
      K(ball(8), '#c8b890', { s: [0.026, 0.022, 0.018] });
      for (const s of [-1, 1]) K(limb3(0.09, 0.008, 0.006, 4), '#c8b890', { p: [s * 0.012, -0.01, 0.005], r: [0, 0, s * 0.2] });
    },
    // Lederwams: Brustschutz (humanoid3) mit Schnallen an den Gurten
    (W, g) => {
      for (const [x, y] of [[0, g.chestY + 0.02], [0.09, g.chestY + 0.11], [-0.09, g.chestY + 0.11]]) {
        onBody3(W, g, x, y, 1, 0.045)(roundBox(0.04, 0.035, 0.014, 0.007), '#c7ccd3', { shine: 1 });
      }
    },
    // Schattenwams: lange Schärpenenden im Rücken, silberne Mondsichel am Kragen
    (W, g, c) => {
      const scarf = c.scarf || '#6b4f9a';
      const Wc = (geo, col, o) => W(geo, col, Object.assign({}, o, { bone: BH.cape }));
      const back = -0.22 * g.bk;
      for (const sx of [-1, 1]) Wc(roundBox(0.075, 0.46, 0.014, 0.007), sx > 0 ? scarf : darker(scarf, 0.15), { p: [sx * 0.05, g.hipY - 0.17, back - 0.02], r: [-0.12, 0, sx * 0.12], shade: 0.2 });
      Wc(ball(8), scarf, { p: [0, g.hipY + 0.05, back - 0.01], s: [0.04, 0.035, 0.025] });
      crescent3(sub3(W, [0, g.neckY - 0.08, 0.15 * g.bk], [-0.3, 0, 0]), [0, 0, 0], 0.045, 0.012, -Math.PI / 2, Math.PI * 1.2, '#e6eef8');
    },
    // Viperngewand: grüne Schuppenweste, Schlangenkopf-Schließe mit Giftzähnen
    (W, g) => {
      for (let row = 0; row < 3; row++) for (const x of [-0.13, -0.08, 0.08, 0.13]) {
        onBody3(W, g, x * g.bk, g.hipY + 0.12 + row * 0.07, 1, 0.006)(G3.scale(), (row + (x > 0 ? 1 : 0)) % 2 ? '#3a8a4a' : '#2a6a3a', { r: [Math.PI / 2 - 0.3, 0, 0], s: 0.038, shine: 0.5 });
      }
      const E = onBody3(W, g, 0, g.chestY + 0.04, 1, 0.012);
      E(ball(8), '#3a8a4a', { s: [0.04, 0.026, 0.05], shine: 0.5 });
      for (const sx of [-1, 1]) {
        E(sphere3(0.008, 6, 4), '#e8e04a', { p: [sx * 0.02, 0.012, 0.03], mat: 'glow' });
        coneAlong(E, horn3(1, 0.3, 4), [sx * 0.015, -0.015, 0.04], [0, -1, 0.1], 0.035, 0.035, '#f4ecd8');
      }
    },
    // Nachtgewand: leuchtende violette Nähte, Seelenfunken an der Schulter
    (W, g) => {
      bodyLine3(W, g, [0, g.hipY + 0.02], [0, g.chestY + 0.13], 4, 0.01, GLOW3[4], { mat: 'glow' });
      for (const side of [1, -1]) for (const sx of [-1, 1]) bodyLine3(W, g, [sx * 0.17 * g.bk, g.hipY + 0.02], [sx * 0.17 * g.bk, g.chestY + 0.1], 3, 0.01, GLOW3[4], { mat: 'glow' }, side);
      for (let k = 0; k < 3; k++) W(G3.gem(), GLOW3[4], { p: [(0.33 + k * 0.04) * g.bk, g.shY + 0.08 + k * 0.07, 0.02 - k * 0.04], s: [0.014, 0.024, 0.014], mat: 'glow' });
    },
    // Aschengewand: verbrannte, gezackte Säume mit Glutfäden
    (W, g, c, Wh) => {
      const y = g.hipY - 0.16;
      for (let k = 0; k < 14; k++) {
        const m = (k / 14) * Math.PI * 2;
        const at = [Math.sin(m) * 0.27 * g.bk, y, Math.cos(m) * 0.23 * g.bk];
        coneAlong(Wh, G3.spike(), at, [Math.sin(m) * 0.25, -1, Math.cos(m) * 0.25], 0.05 + (k % 3) * 0.025, 0.2, '#2a1410');
        if (k % 2) coneAlong(Wh, G3.ray(), at, [Math.sin(m) * 0.25, -1, Math.cos(m) * 0.25], 0.04, 0.2, '#ff7a2a', { mat: 'glow' });
      }
      bodyRing3(Wh, y + 0.02, 0.278 * g.bk, 0.236 * g.bk, 0.008, '#ff7a2a', { mat: 'glow' });
    },
    // Sternengewand: weiße Sterne auf Nachtblau, Silbersaum
    (W, g, c, Wh) => {
      for (const [x, y, side] of [[-0.1, 0.12, 1], [0.09, 0.2, 1], [-0.03, 0.3, 1], [0.12, 0.05, 1], [0.05, 0.15, -1], [-0.1, 0.28, -1]]) {
        star3(onBody3(W, g, x * g.bk, g.hipY + y, side, 0.008), [0, 0, 0], 0.016 + (x > 0 ? 0.004 : 0), '#e6f6ff');
      }
      bodyRing3(Wh, g.hipY - 0.15, 0.288 * g.bk, 0.245 * g.bk, 0.012, '#c7ccd3', { shine: 1 });
    },
    // Göttergewand: Sonnenwappen im Rücken, goldgesäumter Kragen in zwei Lagen
    (W, g) => {
      sun3(onBody3(W, g, 0, g.chestY + 0.04, -1, 0.012), [0, 0, 0], 0.075, 12, GOLD3, GLOW3[7]);
      W(torus3(0.16 * g.bk, 0.022, Math.PI * 2, 4, 18), GOLD3, { p: [0, g.neckY - 0.07, 0], r: [Math.PI / 2 - 0.2, 0, 0], s: [1, 0.86, 1], shine: 1 });
    },
    // Abgrundgewand (seit 13.53): Leerenauge im Rücken, cyanfarbene Risse vorn, Splitter auf der Schulter,
    // zwei Tentakelbänder hängen vorn von der Hüfte
    (W, g, c, Wh) => {
      voidEye3(onBody3(W, g, 0, g.chestY + 0.04, -1, 0.014), [0, 0, 0], 0.06);
      for (const [a, b] of [[[-0.02, g.hipY + 0.04], [-0.1, g.chestY + 0.1]], [[0.06, g.hipY + 0.12], [0.12, g.chestY + 0.02]], [[0.02, g.chestY + 0.06], [0.07, g.chestY + 0.14]]]) bodyLine3(W, g, a, b, 3, 0.01, VOIDGLOW3, { mat: 'glow' });
      for (let k = 0; k < 2; k++) voidShard3(W, [(0.3 + k * 0.06) * g.bk, g.shY + 0.08 + k * 0.05, 0.02 - k * 0.05], [0.3, 1, -0.2], 0.05 - k * 0.01, 0.017);
      for (const sx of [-1, 1]) tendril3(Wh, [[sx * 0.14 * g.bk, g.hipY + 0.02, 0.2 * g.bk], [sx * 0.17 * g.bk, g.hipY - 0.12, 0.24 * g.bk], [sx * 0.14 * g.bk, g.hipY - 0.25, 0.26 * g.bk], [sx * 0.2 * g.bk, g.hipY - 0.32, 0.25 * g.bk]], 0.022);
    },
    // Ewigkeitsgewand (seit 13.53): achtstrahliger Stern im Rücken, Sternbild über der Brust, Roségoldkragen,
    // Knoten mit Prismenstein und zwei langen Bändern
    (W, g) => {
      nova3(onBody3(W, g, 0, g.chestY + 0.04, -1, 0.016), [0, 0, 0], 0.085);
      const pts = [[-0.1, g.chestY + 0.12], [-0.04, g.chestY + 0.04], [0.06, g.chestY + 0.08], [0.11, g.hipY + 0.14]];
      for (let i = 0; i < pts.length; i++) {
        star3(onBody3(W, g, pts[i][0] * g.bk, pts[i][1], 1, 0.008), [0, 0, 0], 0.014, i % 2 ? ROSEGLOW3 : '#fff4fa');
        if (i) bodyLine3(W, g, [pts[i - 1][0] * g.bk, pts[i - 1][1]], [pts[i][0] * g.bk, pts[i][1]], 2, 0.004, '#ffd6f0', { mat: 'glow' });
      }
      W(torus3(0.16 * g.bk, 0.02, Math.PI * 2, 4, 18), ROSEGOLD3, { p: [0, g.neckY - 0.07, 0], r: [Math.PI / 2 - 0.2, 0, 0], s: [1, 0.86, 1], shine: 1 });
      const K = onBody3(W, g, -0.08 * g.bk, g.hipY + 0.08, 1, 0.02);
      K(G3.gem(), PRISM3[0], { s: [0.016, 0.024, 0.014], mat: 'glow' });
      for (const sx of [-1, 1]) K(roundBox(0.022, 0.2, 0.006, 0.003), sx > 0 ? ROSEGOLD3 : ROSEGLOW3, { p: [sx * 0.014, -0.1, 0.004], r: [0, 0, sx * 0.12], shine: 0.6 });
    }
  ],
  schamane: [
    // Leinenrobe: schlicht, nur zwei Flicken
    (W, g, c, Wh) => {
      onRobe3(Wh, g, -0.12, 0.2, 1, 0.006)(roundBox(0.08, 0.07, 0.01, 0.005), lighter(c.robe, 0.15), { r: [0, 0, 0.2] });
      onRobe3(Wh, g, 0.1, 0.33, -1, 0.006)(roundBox(0.07, 0.06, 0.01, 0.005), darker(c.robe, 0.15), { r: [0, 0, -0.3] });
    },
    // Seidenrobe: große Schleife an der Schärpe im Rücken
    (W, g, c, Wh) => {
      const silk = c.sash || '#c8402f';
      const y = g.hipY + 0.07;
      const z = -0.25;
      for (const sx of [-1, 1]) {
        Wh(torus3(0.06, 0.02, Math.PI * 2, 4, 10), silk, { p: [sx * 0.07, y, z], r: [0, 0, sx * 0.3], s: [1.3, 0.8, 1], shine: 0.5 });
        Wh(roundBox(0.045, 0.22, 0.012, 0.006), silk, { p: [sx * 0.04, y - 0.13, z - 0.005], r: [-0.1, 0, sx * 0.22], shine: 0.5 });
      }
      Wh(ball(8), darker(silk, 0.15), { p: [0, y, z - 0.005], s: [0.032, 0.03, 0.025] });
    },
    // Kranichrobe: weißer Federsaum, Kranichband mit roten Punkten
    (W, g, c, Wh) => {
      for (let k = 0; k < 16; k++) {
        const m = (k / 16) * Math.PI * 2;
        const [rx, rz] = robeAt3(0.16);
        sub3(Wh, [Math.sin(m) * (rx + 0.008), 0.17, Math.cos(m) * (rz + 0.008)], [0, m, 0])(G3.feather(), k % 2 ? FEATHER3 : '#e8eef4', { r: [Math.PI - 0.22, 0, 0], s: 0.13, top: '#2a2a30', topK: 0.25 });
      }
      const [rx, rz] = robeAt3(0.27);
      bodyRing3(Wh, 0.27, rx + 0.004, rz + 0.004, 0.016, '#f4f4f0');
      for (let k = -2; k <= 2; k++) onRobe3(Wh, g, Math.sin(k * 0.4) * rx, 0.27, 1, 0.016)(sphere3(0.013, 6, 4), '#c8402f', {});
    },
    // Phönixrobe: Flammenzungen steigen vom Saum auf, Goldborte
    (W, g, c, Wh) => {
      for (let k = 0; k < 14; k++) {
        const m = (k / 14) * Math.PI * 2;
        const [rx, rz] = robeAt3(0.06);
        coneAlong(Wh, horn3(1, 0.3, 5), [Math.sin(m) * rx, 0.05, Math.cos(m) * rz], [-Math.sin(m) * 0.2, 1, -Math.cos(m) * 0.2], 0.1 + (k % 2) * 0.07, 0.3, k % 2 ? '#ff7a2a' : '#e8402a', { top: '#ffd34d', topK: 0.6 });
      }
      const [rx, rz] = robeAt3(0.05);
      bodyRing3(Wh, 0.05, rx + 0.006, rz + 0.006, 0.016, GOLD3, { shine: 1 });
    },
    // Drachenrobe: Drachenperle in goldenen Klauen vor der Brust, Schuppenband um die Taille
    (W, g) => {
      const E = onBody3(W, g, 0, g.chestY + 0.05, 1, 0.01);
      E(sphere3(0.035, 10, 8), '#f4e8ff', { p: [0, 0, 0.06], mat: 'glow' });
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + 0.5;
        coneAlong(E, horn3(1, 0.3, 4), [Math.sin(a) * 0.03, Math.cos(a) * 0.03, 0.02], [Math.sin(a) * 0.6, Math.cos(a) * 0.6, 1], 0.06, 0.1, GOLD3, { shine: 1 });
      }
      scaleBand3(W, g, g.hipY + 0.13, 14, '#3a6a5a');
    },
    // Glutrobe: glühender Saum, aufsteigende Glutsplitter
    (W, g, c, Wh) => {
      const [rx, rz] = robeAt3(0.05);
      bodyRing3(Wh, 0.05, rx + 0.004, rz + 0.004, 0.018, '#ff7a2a', { mat: 'glow' });
      for (let k = 0; k < 8; k++) {
        const m = k * 0.785 + 0.3;
        const y = 0.14 + (k % 4) * 0.12;
        const [ex, ez] = robeAt3(y);
        Wh(G3.gem(), k % 2 ? '#ffd34d' : '#ff7a2a', { p: [Math.sin(m) * (ex + 0.05), y, Math.cos(m) * (ez + 0.05)], s: [0.012, 0.02, 0.012], mat: 'glow' });
      }
    },
    // Himmelsrobe: gewellter Wolkensaum, durchscheinender Überwurf
    (W, g, c, Wh) => {
      for (let k = 0; k < 14; k++) {
        const m = (k / 14) * Math.PI * 2;
        const [rx, rz] = robeAt3(0.06);
        Wh(G3.puff(), k % 2 ? '#f4f8ff' : '#dfefff', { p: [Math.sin(m) * rx, 0.07 + (k % 2) * 0.015, Math.cos(m) * rz], s: 0.05 + (k % 3) * 0.012, shade: 0.12 });
      }
      Wh(lathe3('robe2', [[0, 0], [0.31, 0], [0.32, 0.03], [0.28, 0.2], [0.23, 0.4], [0.2, 0.47], [0, 0.48]], 20), '#6a9ad0', { p: [0, 0.2, 0], s: [1.07, 0.66, 0.96], mat: 'aura' });
    },
    // Götterrobe: Sonnenmedaillon, hoher Kragen, zweite goldene Lage
    (W, g, c, Wh) => {
      sun3(onBody3(W, g, 0, g.chestY + 0.05, 1, 0.012), [0, 0, 0], 0.055, 10, GOLD3, GLOW3[7]);
      highCollar3(W, g, GOLD3, 0.13);
      Wh(lathe3('g3over', [[0, 0], [0.3, 0], [0.31, 0.02], [0.26, 0.17], [0.22, 0.28], [0, 0.29]], 20), GOLD3, { p: [0, 0.2, 0], s: [1.04, 1, 0.92], shine: 1, top: '#fff2b0', topK: 0.4 });
    },
    // Abgrundrobe (seit 13.53): Saum aus eingerollten Tentakeln mit cyanfarbenen Enden, Leerenauge als Brustschmuck,
    // Leerensplitter schweben um die Robe
    (W, g, c, Wh) => {
      const [rx, rz] = robeAt3(0.06);
      for (let k = 0; k < 12; k++) {
        const m = (k / 12) * Math.PI * 2 + 0.13;
        const at = (r, y, dm = 0) => [Math.sin(m + dm) * (rx + r), y, Math.cos(m + dm) * (rz + r)];
        tendril3(Wh, [at(0, 0.09), at(0.035, 0.035), at(0.075, 0.03, 0.12), at(0.085, 0.07, 0.2)], 0.022, { shade: 0.15 });
      }
      const E = onBody3(W, g, 0, g.chestY + 0.05, 1, 0.012);
      E(torus3(0.06, 0.008, Math.PI * 2, 3, 16), VOIDMETAL3, { s: [1.3, 0.8, 1], shine: 1 });
      voidEye3(E, [0, 0, 0.004], 0.045);
      for (let k = 0; k < 6; k++) {
        const m = k * 1.05 + 0.3;
        const y = 0.18 + (k % 3) * 0.12;
        const [ex, ez] = robeAt3(y);
        voidShard3(Wh, [Math.sin(m) * (ex + 0.06), y, Math.cos(m) * (ez + 0.06)], [0, 1, 0], 0.035, 0.012);
      }
    },
    // Ewigkeitsrobe (seit 13.53): Lotussaum aus Platin- und Roségoldblättern, Sternmedaillon, Roségoldschärpe mit
    // Sternen, Prismensteine am Kragen
    (W, g, c, Wh) => {
      for (let k = 0; k < 16; k++) {
        const m = (k / 16) * Math.PI * 2;
        const [rx, rz] = robeAt3(0.06);
        sub3(Wh, [Math.sin(m) * (rx + 0.012), 0.03, Math.cos(m) * (rz + 0.012)], [0, m, 0])(G3.feather(), k % 2 ? PLATIN3 : ROSEGOLD3, { r: [0.38, 0, 0], s: 0.15, top: '#f0eef8', topK: 0.355, shine: 0.8 });
      }
      nova3(onBody3(W, g, 0, g.chestY + 0.05, 1, 0.016), [0, 0, 0], 0.065);
      const y = g.hipY + 0.07;
      const [sx, sz] = robeAt3(y);
      bodyRing3(Wh, y, sx + 0.012, sz + 0.012, 0.018, ROSEGOLD3, { shine: 1 });
      for (const [x, yy, side] of [[-0.12, 0.3, 1], [0.13, 0.22, 1], [0.02, 0.36, 1], [-0.08, 0.26, -1], [0.1, 0.34, -1]]) star3(onRobe3(Wh, g, x, yy, side, 0.008), [0, 0, 0], 0.018, side > 0 ? ROSEGLOW3 : '#fff4fa');
      for (let k = 0; k < 5; k++) {
        const m = Math.PI + (k - 2) * 0.42;
        W(G3.gem(), PRISM3[k], { p: [Math.sin(m) * 0.17 * g.bk, g.neckY - 0.02 + (k % 2 ? 0 : 0.02), Math.cos(m) * 0.15 * g.bk], s: [0.013, 0.02, 0.013], mat: 'glow' });
      }
    }
  ],
  nekromant: [
    // Grabtuch: Binden um den Rumpf, lose Enden
    (W, g, c, Wh) => {
      for (let k = 0; k < 4; k++) {
        const y = g.hipY + 0.1 + k * 0.07;
        const [rx, rz] = torsoAt3(g, y);
        W(torus3(0.2, 0.016, Math.PI * 2, 3, 16), k % 2 ? '#cfc6a8' : '#b8ae90', { p: [0, y, 0], r: [Math.PI / 2 + (k % 2 ? 0.22 : -0.22), 0, 0], s: [(rx + 0.008) / 0.2, (rz + 0.008) / 0.2, 1] });
      }
      for (const [x, y] of [[0.12, g.hipY + 0.1], [-0.08, g.chestY + 0.05]]) onBody3(W, g, x, y, 1, 0.012)(roundBox(0.035, 0.14, 0.008, 0.004), '#cfc6a8', { p: [0, -0.07, 0], r: [0.1, 0, x * 2] });
    },
    // Aschenrobe: Ascheflocken auf der Robe, Strickgurt
    (W, g, c, Wh) => {
      for (let k = 0; k < 14; k++) {
        const side = k % 2 ? 1 : -1;
        const y = 0.12 + (k % 5) * 0.08;
        const [rx] = robeAt3(y);
        onRobe3(Wh, g, Math.sin(k * 1.7) * rx * 0.8, y, side, 0.006)(roundBox(0.022, 0.016, 0.006, 0.003), k % 3 ? '#8a8680' : '#b0aca4', { r: [0, 0, k] });
      }
      const y = g.hipY + 0.06;
      const [rx, rz] = robeAt3(y);
      bodyRing3(Wh, y, rx + 0.012, rz + 0.012, 0.014, '#8a7a5a');
      const K = onRobe3(Wh, g, 0.08, y, 1, 0.025);
      K(ball(6), '#8a7a5a', { s: 0.022 });
      K(limb3(0.12, 0.008, 0.006, 4), '#8a7a5a', { p: [0, -0.01, 0] });
    },
    // Knochenrobe: Rippenkorb über der Brust
    (W, g) => ribcage3(W, g, BONE3),
    // Seelenrobe: grün leuchtender Saum mit Seelenflammen
    (W, g, c, Wh) => {
      const [rx, rz] = robeAt3(0.07);
      bodyRing3(Wh, 0.07, rx + 0.004, rz + 0.004, 0.016, '#7dff9a', { mat: 'glow' });
      for (let k = 0; k < 6; k++) {
        const m = (k / 6) * Math.PI * 2 + 0.3;
        flame3(Wh, [Math.sin(m) * (rx + 0.01), 0.08, Math.cos(m) * (rz + 0.01)], [Math.sin(m) * 0.15, 1, Math.cos(m) * 0.15], 0.09 + (k % 2) * 0.05, 0.16, '#7dff9a', '#e8ffe0');
      }
    },
    // Totenkönigsrobe: Schädelkragen und eine Kette mit Schädel
    (W, g, c) => {
      for (let k = -2; k <= 2; k++) {
        const m = k * 0.5;
        skull3(sub3(W, [Math.sin(m) * 0.16 * g.bk, g.neckY - 0.07, Math.cos(m) * 0.14 * g.bk], [0.25, m, 0]), [0, 0, 0], 0.028);
      }
      for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
        const t = (k + 1) / 5;
        onBody3(W, g, sx * 0.12 * (1 - t), g.chestY + 0.13 - t * 0.1, 1, 0.012)(sphere3(0.009, 6, 4), '#9a9aa8', { shine: 1 });
      }
      skull3(onBody3(W, g, 0, g.chestY + 0.01, 1, 0.025), [0, 0, 0], 0.032, c.glowEyes || '#d6a8ff');
    },
    // Schattenrobe: lange Rauchschwänze hinten, Dornen am Kragen
    (W, g, c, Wh) => {
      for (const sx of [-1, 0, 1]) {
        const a = [sx * 0.12, 0.26, -0.22];
        const b = [sx * 0.2, 0.06, -0.46];
        limbBetween(Wh, a, b, 0.065, 0.045, '#1a1418', { shade: 0.3 });
        limbBetween(Wh, b, [sx * 0.28, 0.03, -0.72 + Math.abs(sx) * 0.08], 0.045, 0.012, '#2a2028', { shade: 0.3 });
      }
      for (let k = 0; k < 7; k++) {
        const m = (k / 7) * Math.PI * 2;
        coneAlong(W, G3.spike(), [Math.sin(m) * 0.15 * g.bk, g.neckY - 0.05, Math.cos(m) * 0.13 * g.bk], [Math.sin(m) * 0.6, 1, Math.cos(m) * 0.6], 0.11 + (k % 2) * 0.05, 0.18, '#1a1416');
      }
    },
    // Sternenrobe: leuchtende Sternbilder vorn und hinten
    (W, g, c, Wh) => {
      for (const side of [1, -1]) {
        const pts = [[-0.1, g.chestY + 0.1], [-0.02, g.chestY + 0.02], [0.08, g.chestY + 0.08], [0.12, g.hipY + 0.12], [0.02, g.hipY + 0.06]];
        for (let i = 0; i < pts.length; i++) {
          onBody3(W, g, pts[i][0] * side, pts[i][1], side, 0.01)(sphere3(0.012, 6, 4), '#e6f6ff', { mat: 'glow' });
          if (i) bodyLine3(W, g, [pts[i - 1][0] * side, pts[i - 1][1]], [pts[i][0] * side, pts[i][1]], 1, 0.005, '#9fd0ff', { mat: 'glow' }, side);
        }
        for (const [x, y] of [[-0.15, 0.25], [0.12, 0.38], [0.18, 0.16]]) onRobe3(Wh, g, x * side, y, side, 0.008)(sphere3(0.01, 6, 4), '#e6f6ff', { mat: 'glow' });
      }
    },
    // Götterrobe: goldener Rippenpanzer, Halbmondkragen
    (W, g) => {
      ribcage3(W, g, GOLD3);
      crescent3(sub3(W, [0, g.neckY + 0.04, -0.12], [-0.35, 0, 0]), [0, 0, 0], 0.3, 0.035, -Math.PI / 2, Math.PI * 1.15, GOLD3);
    },
    // Abgrundtalar (seit 13.53): Rippenkorb aus violettem Leerenstahl, ein Leerenauge statt des Herzens,
    // Schattententakel im Rücken, Kragen aus Splittern
    (W, g, c, Wh) => {
      ribcage3(W, g, VOIDMETAL3);
      voidEye3(onBody3(W, g, 0, g.chestY + 0.01, 1, 0.032), [0, 0, 0], 0.036);
      for (const sx of [-1, -0.35, 0.35, 1]) tendril3(Wh, [[sx * 0.12, 0.3, -0.22], [sx * 0.2, 0.2, -0.38], [sx * 0.25, 0.24, -0.55], [sx * 0.31, 0.36, -0.62], [sx * 0.34, 0.43, -0.55]], 0.04, { shade: 0.2 });
      for (let k = 0; k < 7; k++) {
        const m = (k / 7) * Math.PI * 2;
        voidShard3(W, [Math.sin(m) * 0.15 * g.bk, g.neckY - 0.04, Math.cos(m) * 0.13 * g.bk], [Math.sin(m) * 0.6, 1, Math.cos(m) * 0.6], 0.06 + (k % 2) * 0.025, 0.022);
      }
    },
    // Ewigkeitstalar (seit 13.53): Rippenkorb aus Platin, der Ouroboros (die Schlange der Ewigkeit, die sich in den
    // Schwanz beißt) als Roségoldring auf der Brust mit Stern, Strahlenkragen, Sterne auf der Robe
    (W, g, c, Wh) => {
      ribcage3(W, g, PLATIN3);
      const E = onBody3(W, g, 0, g.chestY + 0.0, 1, 0.034);
      E(torus3(0.05, 0.009, Math.PI * 1.85, 4, 20), ROSEGOLD3, { r: [0, 0, 0.3], shine: 1 });
      E(ball(8), ROSEGOLD3, { p: [Math.cos(0.3) * 0.05, Math.sin(0.3) * 0.05, 0.004], s: [0.017, 0.012, 0.013], shine: 1 });
      E(sphere3(0.004, 5, 4), ROSEGLOW3, { p: [Math.cos(0.3) * 0.05 + 0.004, Math.sin(0.3) * 0.05 + 0.006, 0.016], mat: 'glow' });
      nova3(E, [0, 0, 0.006], 0.032);
      for (let k = 0; k < 7; k++) {
        const m = Math.PI * (0.62 + (k / 6) * 0.76);
        coneAlong(W, G3.ray(), [Math.sin(m) * 0.15 * g.bk, g.neckY - 0.06, Math.cos(m) * 0.13 * g.bk], [Math.sin(m) * 0.45, 1, Math.cos(m) * 0.45], k % 2 ? 0.09 : 0.14, 0.3, k % 2 ? ROSEGOLD3 : PLATIN3, { shine: 1 });
      }
      for (const [x, y, side] of [[-0.15, 0.25, 1], [0.12, 0.38, 1], [0.16, 0.16, 1], [-0.1, 0.3, -1], [0.12, 0.2, -1]]) star3(onRobe3(Wh, g, x, y, side, 0.008), [0, 0, 0], 0.02, side > 0 ? ROSEGLOW3 : '#fff4fa');
    }
  ]
};

// --- Magier (seit 8.6) -----------------------------------------------------------------------------
// Indigo und Silber, hoher Stehkragen (humanoid3), Buch an der Kette; die Farbe des Elements (c.accent) nur an
// Runen, Kristallen, Wappen und Schließen. Alchemistische Dreiecke statt Kreise (Abgrenzung zum Schamanen).

// Dreieck als Fläche (schaut nach +z, Spitze unten ▽; mit r [0, 0, π] oben △)
const triGeo3 = () => geo3('g3tri', () => new THREE.CylinderGeometry(1, 1, 0.24, 3).rotateX(Math.PI / 2));
const glyphUp3 = (glyph) => glyph !== 'down' && glyph !== 'downbar';

// Element-Zeichen (schaut nach +z): Dreieck aus drei Stäben, Inkreis, bei Blitz und Erde ein Balken
function mageGlyph3(W, at, r, glyph, color, o = {}) {
  const up = glyphUp3(glyph);
  const w = +(r * 0.16).toFixed(3);
  const side = +(r * Math.sqrt(3) + w).toFixed(3);
  for (let k = 0; k < 3; k++) {
    const a0 = (up ? Math.PI / 2 : -Math.PI / 2) + (k * Math.PI * 2) / 3;
    const a1 = a0 + (Math.PI * 2) / 3;
    const x = (Math.cos(a0) + Math.cos(a1)) * r / 2;
    const y = (Math.sin(a0) + Math.sin(a1)) * r / 2;
    W(roundBox(side, w, w * 0.7, w * 0.3), color, Object.assign({ p: [at[0] + x, at[1] + y, at[2]], r: [0, 0, (a0 + a1) / 2 + Math.PI / 2] }, o));
  }
  W(torus3(+(r * 0.5).toFixed(3), +(w * 0.32).toFixed(3), Math.PI * 2, 3, 16), color, Object.assign({ p: at }, o));
  if (glyph === 'upbar' || glyph === 'downbar') W(roundBox(+(r * 1.15).toFixed(3), w * 0.8, w * 0.6, w * 0.25), color, Object.assign({ p: at }, o));
}

// Lathe mit Öffnung vorn (offener Mantel): Profil [[radius, höhe]], gap = halbe Öffnung in rad
function openLathe3(key, pts, gap, seg = 18) {
  return geo3('ol' + key, () => {
    const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, gap, Math.PI * 2 - gap * 2);
    geo.computeVertexNormals();
    return geo;
  });
}

// Gemeinsam für alle Stufen: Frontschlitz mit Silberkanten (Männer), Korsage mit Silberschnürung (Frauen),
// Buch an der Kette an der linken Hüfte (ab Stufe 1)
const onRobeAt3 = (gg, y) => robeAt3(y);
function mageRobeBase3(W, g, c, Wh, t) {
  const sv = c.collar || '#d8e0f0';
  if (!g.female && !c.coat) {
    onRobe3(Wh, g, 0, 0.2, 1, 0.003)(roundBox(0.07, 0.34, 0.012, 0.006), darker(c.robe, 0.32), {});
    if (t >= 1) for (const sx of [-1, 1]) bodyLine3(Wh, g, [sx * 0.042, 0.05], [sx * 0.036, 0.37], 3, 0.011, sv, { shine: 0.8 }, 1, onRobeAt3);
  } else {
    // Korsage: dunkleres Mieder mit gekreuzter Silberschnürung
    for (let k = 0; k < 3; k++) {
      const y = g.hipY + 0.05 + k * 0.06;
      bodyLine3(W, g, [-0.045, y], [0.045, y + 0.05], 1, 0.008, sv, { shine: 0.8 });
      bodyLine3(W, g, [0.045, y], [-0.045, y + 0.05], 1, 0.008, sv, { shine: 0.8 });
    }
    const y = g.hipY + 0.03;
    const [rx, rz] = torsoAt3(g, y);
    bodyRing3(W, y, rx + 0.006, rz + 0.006, 0.014, sv, { shine: 0.8 });
  }
  if (t >= 1) mageBook3(Wh, g, c);
}

// Buch an der Kette: Einband, Seiten, Schließe in der Elementfarbe, Kette zum Gürtel
function mageBook3(Wh, g, c) {
  const B = onRobe3(Wh, g, 0.2 * g.bk, 0.25, 1, 0.034);
  const F = sub3(B, [0, 0, 0], [0, 0.35, 0.12]);
  F(roundBox(0.1, 0.125, 0.04, 0.012), '#3a2430', { shine: 0.2 });
  F(roundBox(0.092, 0.115, 0.03, 0.004), '#efe6cc', { p: [0.006, 0, 0] });
  for (const sy of [-1, 1]) F(roundBox(0.022, 0.022, 0.044, 0.006), '#c8d2e4', { p: [-0.04, sy * 0.05, 0], shine: 1 });
  F(roundBox(0.03, 0.022, 0.012, 0.005), c.accent || '#b8c4ff', { p: [0.045, 0, 0.018], mat: 'glow' });
  // Kette vom Gürtel zum Buch
  const a = [0.13 * g.bk, g.hipY + 0.01, 0.2 * g.bk];
  const b = [0.2 * g.bk, 0.33, 0.26 * g.bk];
  for (let k = 0; k < 4; k++) {
    const u = (k + 0.5) / 4;
    Wh(torus3(0.011, 0.0035, Math.PI * 2, 3, 8), '#c8d2e4', { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], r: [k % 2 ? 0 : Math.PI / 2, 0.5, 0], shine: 1 });
  }
}

// Offener Übermantel (Runenmantel): Unterteil an der Hüfte, Oberteil an der Brust, Silberkanten an der Öffnung
function mageCoat3(W, g, c, Wh) {
  const col = c.coat;
  const sv = c.collar || '#d8e0f0';
  const gap = 0.55;
  const lo = [0.04, 0.06, 0.2, 0.32, 0.44, 0.52].map((y) => [+(robeAt3(y)[0] + (y < 0.1 ? 0.03 : 0.022)).toFixed(3), y]);
  Wh(openLathe3('coatL', lo, gap, 22), col, { s: [1, 1, 0.9], shade: 0.25, top: lighter(col, 0.1), topK: 0.3 });
  const ys = [g.hipY + 0.08, g.hipY + 0.18, g.chestY, g.chestY + 0.08, g.shY - 0.03];
  const up = ys.map((y) => [+(torsoAt3(g, y)[0] + 0.02).toFixed(3), +y.toFixed(3)]);
  W(openLathe3('coatU' + (g.female ? 'f' : 'm') + g.bk, up, gap + 0.08, 18), col, { s: [1, 1, 0.86], shade: 0.2 });
  // Kanten der Öffnung und Saumband mit leuchtenden Dreiecksrunen
  for (const sx of [-1, 1]) {
    const m = sx * gap;
    for (let k = 0; k < 4; k++) {
      const y0 = 0.05 + k * 0.12;
      const [rx, rz] = robeAt3(y0 + 0.06);
      Wh(roundBox(0.018, 0.125, 0.014, 0.006), sv, { p: [Math.sin(m) * (rx + 0.024), y0 + 0.06, Math.cos(m) * (rz * 0.9 / 0.88 + 0.02)], r: [0, m, 0], shine: 0.8 });
    }
  }
  const [rx, rz] = robeAt3(0.1);
  for (let k = 0; k < 6; k++) {
    const m = (k < 3 ? -1 : 1) * (0.8 + (k % 3) * 0.75);
    sub3(Wh, [Math.sin(m) * (rx + 0.036), 0.11, Math.cos(m) * (rz + 0.03)], [0, m, 0])(triGeo3(), c.accent, { s: [0.032, 0.032, 0.05], r: [0, 0, glyphUp3(c.glyph) ? Math.PI : 0], mat: 'glow' });
  }
}

// Hutband, Hutkrempe usw. siehe magierHelm3; hier die Roben je Stufe
ARMOR3.magier = [
  // Novizenrobe: graublaue Wolle, Strickgürtel mit Knoten, Lesezeichenband, ein Flicken
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 0);
    if (!c.belt) {
      const y = g.hipY + 0.03;
      const [rx, rz] = robeAt3(y);
      bodyRing3(Wh, y, rx + 0.012, rz + 0.012, 0.016, '#c8b890');
      const K = onRobe3(Wh, g, 0.09, y, 1, 0.026);
      K(ball(8), '#c8b890', { s: [0.026, 0.022, 0.018] });
      for (const s of [-1, 1]) K(limb3(0.13, 0.008, 0.006, 4), '#c8b890', { p: [s * 0.012, -0.01, 0.004], r: [0, 0, s * 0.18] });
      // Lesezeichenband
      onRobe3(Wh, g, 0.17, y - 0.08, 1, 0.012)(roundBox(0.018, 0.15, 0.004, 0.002), '#8a2a34', { r: [0, 0, 0.12] });
    }
    onRobe3(Wh, g, -0.13, 0.17, 1, 0.006)(roundBox(0.075, 0.07, 0.01, 0.005), lighter(c.robe, 0.14), { r: [0, 0, 0.25] });
  },
  // Gelehrtenrobe: drei Silberschließen über der Brust, Buch an der Kette
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 1);
    for (let k = 0; k < 3; k++) {
      const F = onBody3(W, g, 0, g.chestY + 0.1 - k * 0.075, 1, 0.012);
      F(roundBox(0.075, 0.016, 0.012, 0.006), c.collar, { shine: 1 });
      for (const sx of [-1, 1]) F(sphere3(0.012, 6, 4), c.collar, { p: [sx * 0.04, 0, 0.004], shine: 1 });
    }
  },
  // Runenmantel: offener Übermantel mit hohem Kragen, sechs leuchtende Dreiecksrunen am Saumband
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 2);
    mageCoat3(W, g, c, Wh);
  },
  // Kristallrobe: zwei schwebende Kristalle über den Schultern, Kristallspitzen am Saum
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 3);
    for (const sx of [-1, 1]) floatGem3(W, [sx * (g.shX + 0.04), g.shY + 0.22, -0.05], 0.034, c.accent);
    for (let k = 0; k < 6; k++) {
      const m = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const [rx, rz] = robeAt3(0.07);
      coneAlong(Wh, G3.gem(), [Math.sin(m) * (rx + 0.01), 0.075, Math.cos(m) * (rz + 0.01)], [Math.sin(m) * 0.5, -1, Math.cos(m) * 0.5], 0.07, 0.035, '#cfe6ff', { shine: 1 });
    }
    onBody3(W, g, 0, g.chestY + 0.06, 1, 0.014)(G3.gem(), c.accent, { s: [0.022, 0.034, 0.016], mat: 'glow' });
  },
  // Arkanrobe: Tabard mit Element-Dreieck auf der Brust, dünner Runenring dreht sich um die Taille
  (W, g, c, Wh, Wr) => {
    mageRobeBase3(W, g, c, Wh, 4);
    const tab = darker(c.robe, 0.28);
    const sv = c.collar;
    onBody3(W, g, 0, g.chestY + 0.02, 1, 0.006)(roundBox(0.17, 0.3, 0.012, 0.006), tab, { shade: 0.15 });
    onRobe3(Wh, g, 0, 0.27, 1, 0.006)(roundBox(0.17, 0.34, 0.012, 0.006), tab, { r: [-0.08, 0, 0], shade: 0.2 });
    for (const sx of [-1, 1]) {
      bodyLine3(W, g, [sx * 0.088, g.hipY + 0.02], [sx * 0.088, g.chestY + 0.15], 3, 0.01, sv, { shine: 0.8 });
      bodyLine3(Wh, g, [sx * 0.088, 0.1], [sx * 0.088, 0.44], 3, 0.01, sv, { shine: 0.8 }, 1, onRobeAt3);
    }
    mageGlyph3(onBody3(W, g, 0, g.chestY + 0.05, 1, 0.016), [0, 0, 0], 0.055, c.glyph, c.accent, { mat: 'glow' });
    // Runenring frei um die Taille (weit genug, dass die Hände nicht hindurchgreifen); dreht sich am Drehknochen
    const R = sub3(Wr || Wh, [0, g.hipY + 0.07, 0]);
    const rx = 0.4 * g.bk;
    const rz = 0.34 * g.bk;
    R(torus3(0.2, 0.006, Math.PI * 2, 3, 32), c.accent, { r: [Math.PI / 2, 0, 0], s: [rx / 0.2, rz / 0.2, 1], mat: 'glow' });
    for (let k = 0; k < 6; k++) {
      const m = (k / 6) * Math.PI * 2;
      sub3(R, [Math.sin(m) * rx, 0, Math.cos(m) * rz], [0, m, 0])(triGeo3(), c.accent, { s: [0.024, 0.024, 0.04], r: [0, 0, glyphUp3(c.glyph) ? Math.PI : 0], mat: 'glow' });
    }
  },
  // Aschenmantel: Anthrazit mit glühenden Glutrissen, Glutzacken am Saum, kleines Wappen in der Elementfarbe
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 5);
    for (const [a, b] of [[[-0.12, g.hipY + 0.06], [-0.05, g.chestY + 0.02]], [[0.11, g.hipY + 0.12], [0.04, g.chestY + 0.1]]]) bodyLine3(W, g, a, b, 2, 0.012, '#ff7a2a', { mat: 'glow' });
    for (const [a, b, side] of [[[-0.2, 0.06], [-0.12, 0.3], 1], [[0.16, 0.05], [0.2, 0.24], 1], [[0.06, 0.08], [-0.08, 0.32], -1]]) bodyLine3(Wh, g, a, b, 3, 0.012, '#ff7a2a', { mat: 'glow' }, side, onRobeAt3);
    for (let k = 0; k < 9; k++) {
      const m = (k / 9) * Math.PI * 2 + 0.2;
      const [rx, rz] = robeAt3(0.06);
      emberSpike3(Wh, [Math.sin(m) * rx, 0.07, Math.cos(m) * rz], [Math.sin(m) * 0.45, -1, Math.cos(m) * 0.45], 0.07 + (k % 3) * 0.025, 0.2);
    }
    mageGlyph3(onBody3(W, g, 0, g.chestY + 0.06, 1, 0.014), [0, 0, 0], 0.04, c.glyph, c.accent, { mat: 'glow' });
  },
  // Sternenmantel: Sternbilder auf Nachtblau, Halbmondschließe, kleines Astrolabium hinter dem Rücken
  (W, g, c, Wh) => {
    mageRobeBase3(W, g, c, Wh, 6);
    const pts = [[-0.17, 0.32], [-0.1, 0.22], [-0.15, 0.1], [0.14, 0.38], [0.18, 0.2], [0.12, 0.08]];
    for (let i = 0; i < pts.length; i++) {
      star3(onRobe3(Wh, g, pts[i][0], pts[i][1], 1, 0.008), [0, 0, 0], i % 3 ? 0.014 : 0.02, '#e6f6ff');
      if (i % 3) bodyLine3(Wh, g, pts[i - 1], pts[i], 2, 0.005, '#9fd0ff', { mat: 'glow' }, 1, onRobeAt3);
    }
    for (const [x, y] of [[-0.1, g.chestY + 0.06], [0.12, g.hipY + 0.1], [0.06, g.chestY + 0.12]]) onBody3(W, g, x, y, 1, 0.008)(sphere3(0.011, 6, 4), '#e6f6ff', { mat: 'glow' });
    const H = sub3(W, [0, g.neckY - 0.08, 0.17 * g.bk], [-0.3, 0, 0]);
    crescent3(H, [0, 0, 0], 0.04, 0.012, -Math.PI / 2, Math.PI * 1.25, '#e8f0ff');
    H(sphere3(0.014, 8, 6), c.accent, { p: [0.012, 0.012, 0.004], mat: 'glow' });
    // Astrolabium: zwei gekreuzte Ringe mit Kugel und Zeiger
    const As = sub3(W, [0, g.chestY + 0.02, -0.26 * g.bk], [0, 0, 0]);
    As(torus3(0.085, 0.008, Math.PI * 2, 3, 20), '#e8f0ff', { shine: 1 });
    As(torus3(0.085, 0.008, Math.PI * 2, 3, 20), '#c9a35a', { r: [0, Math.PI / 2, 0.5], shine: 1 });
    As(torus3(0.06, 0.006, Math.PI * 2, 3, 16), '#e8f0ff', { r: [Math.PI / 2, 0, 0], shine: 1 });
    As(sphere3(0.022, 8, 6), c.accent, { mat: 'glow' });
    As(roundBox(0.006, 0.1, 0.006, 0.003), '#c9a35a', { r: [0, 0, 0.7], shine: 1 });
  },
  // Erzmagierornat: Weiß-Silber, doppelter Stehkragen, senkrechter Siegelring im Rücken (dreht sich), Goldsaum
  (W, g, c, Wh, Wr) => {
    mageRobeBase3(W, g, c, Wh, 7);
    highCollar3(W, g, '#f4f6fb', 0.2);
    W(torus3(0.2, 0.01, Math.PI * 1.4, 3, 16), GOLD3, { p: [0, g.neckY + 0.075, -0.012], r: [Math.PI / 2 - 0.12, 0, Math.PI * 0.8], s: [g.bk * 1.05, 0.95 * g.bk, 1], shine: 1 });
    const [rx, rz] = robeAt3(0.13);
    bodyRing3(Wh, 0.13, rx + 0.005, rz + 0.005, 0.012, GOLD3, { shine: 1 });
    for (const sx of [-1, 1]) bodyLine3(W, g, [sx * 0.06, g.hipY + 0.04], [sx * 0.1, g.chestY + 0.14], 3, 0.012, GOLD3, { shine: 1 });
    // Siegelring: Ring, Element-Dreieck und drei Kristalle (am Drehknochen im Rücken, sonst fest)
    const R = sub3(Wr || W, [0, g.shY - 0.04, -0.34]);
    R(torus3(0.27, 0.012, Math.PI * 2, 3, 32), c.accent, { mat: 'glow' });
    R(torus3(0.235, 0.006, Math.PI * 2, 3, 28), '#fff2b0', { mat: 'glow' });
    mageGlyph3(R, [0, 0, 0], 0.2, c.glyph, '#fff2b0', { mat: 'glow' });
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
      R(G3.gem(), c.accent, { p: [Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0], s: [0.03, 0.045, 0.03], mat: 'glow' });
    }
  },
  // Abgrundmantel (seit 13.53): Leerenschwarz mit cyanfarbenen Rissen, Leerenauge auf der Brust, kurzer Tentakelsaum,
  // um die Taille kreist ein Ring aus Leerensplittern (Drehknochen wie bei der Arkanrobe)
  (W, g, c, Wh, Wr) => {
    mageRobeBase3(W, g, c, Wh, 8);
    voidEye3(onBody3(W, g, 0, g.chestY + 0.06, 1, 0.016), [0, 0, 0], 0.042);
    for (const [a, b, side] of [[[-0.2, 0.06], [-0.13, 0.3], 1], [[0.17, 0.05], [0.21, 0.26], 1], [[0.05, 0.08], [-0.08, 0.34], -1], [[-0.15, 0.06], [-0.2, 0.28], -1]]) bodyLine3(Wh, g, a, b, 3, 0.011, VOIDGLOW3, { mat: 'glow' }, side, onRobeAt3);
    const [rx, rz] = robeAt3(0.06);
    for (let k = 0; k < 9; k++) {
      const m = (k / 9) * Math.PI * 2 + 0.35;
      const at = (r, y, dm = 0) => [Math.sin(m + dm) * (rx + r), y, Math.cos(m + dm) * (rz + r)];
      tendril3(Wh, [at(0, 0.08), at(0.03, 0.035), at(0.065, 0.035, 0.12), at(0.07, 0.075, 0.2)], 0.02);
    }
    const R = sub3(Wr || Wh, [0, g.hipY + 0.07, 0]);
    const ox = 0.4 * g.bk;
    const oz = 0.34 * g.bk;
    R(torus3(0.2, 0.005, Math.PI * 2, 3, 32), VOIDVIOLET3, { r: [Math.PI / 2, 0, 0], s: [ox / 0.2, oz / 0.2, 1], mat: 'glow' });
    for (let k = 0; k < 6; k++) {
      const m = (k / 6) * Math.PI * 2;
      voidShard3(R, [Math.sin(m) * ox, (k % 2) * 0.02, Math.cos(m) * oz], [0, 1, 0], 0.045, 0.016);
    }
  },
  // Ewigkeitsornat (seit 13.53): Perlweiß mit Roségold, hoher Kragen mit Strahlen, achtstrahliger Stern auf der Brust,
  // Sternbild auf der Robe; um die Taille kreist ein Sternenkranz mit Prismensteinen
  (W, g, c, Wh, Wr) => {
    mageRobeBase3(W, g, c, Wh, 9);
    highCollar3(W, g, PLATIN3, 0.18);
    for (let k = 0; k < 5; k++) {
      const m = Math.PI * (0.7 + (k / 4) * 0.6);
      coneAlong(W, G3.ray(), [Math.sin(m) * 0.19 * g.bk, g.neckY + 0.04, Math.cos(m) * 0.17 * g.bk], [Math.sin(m) * 0.35, 1, Math.cos(m) * 0.35], k % 2 ? 0.08 : 0.13, 0.3, k % 2 ? PLATIN3 : ROSEGOLD3, { shine: 1 });
    }
    nova3(onBody3(W, g, 0, g.chestY + 0.06, 1, 0.016), [0, 0, 0], 0.06);
    const [rx, rz] = robeAt3(0.13);
    bodyRing3(Wh, 0.13, rx + 0.005, rz + 0.005, 0.012, ROSEGOLD3, { shine: 1 });
    const pts = [[-0.17, 0.32], [-0.1, 0.22], [-0.15, 0.08], [0.14, 0.38], [0.18, 0.2], [0.12, 0.06]];
    for (let i = 0; i < pts.length; i++) {
      star3(onRobe3(Wh, g, pts[i][0], pts[i][1], 1, 0.008), [0, 0, 0], i % 3 ? 0.014 : 0.02, i % 2 ? ROSEGLOW3 : '#fff4fa');
      if (i % 3) bodyLine3(Wh, g, pts[i - 1], pts[i], 2, 0.005, '#ffd6f0', { mat: 'glow' }, 1, onRobeAt3);
    }
    const R = sub3(Wr || Wh, [0, g.hipY + 0.07, 0]);
    const ox = 0.4 * g.bk;
    const oz = 0.34 * g.bk;
    R(torus3(0.2, 0.005, Math.PI * 2, 3, 32), ROSEGLOW3, { r: [Math.PI / 2, 0, 0], s: [ox / 0.2, oz / 0.2, 1], mat: 'glow' });
    for (let k = 0; k < 8; k++) {
      const m = (k / 8) * Math.PI * 2;
      if (k % 2) R(G3.gem(), PRISM3[(k >> 1) % PRISM3.length], { p: [Math.sin(m) * ox, 0, Math.cos(m) * oz], s: [0.012, 0.018, 0.012], mat: 'glow' });
      else star3(sub3(R, [Math.sin(m) * ox, 0, Math.cos(m) * oz], [0, m, 0]), [0, 0, 0], 0.03, k % 4 ? ROSEGLOW3 : '#fff4fa');
    }
  }
];

function gearArmor3(A, g, t, cls, c) {
  if (t < 0 || g.belly || !ARMOR3[cls]) return;
  const W = frame3(A, BH.chest, [0, 0, 0]);
  const Wh = frame3(A, BH.hips, [0, 0, 0]);
  // Drehknochen (seit 8.6): Runenring um die Taille, Siegelring im Rücken
  const Wr = g.spin && g.spin.ring != null ? frame3(A, g.spin.ring, [0, 0, 0]) : null;
  const build = ARMOR3[cls][t];
  if (build) build(W, g, c, Wh, Wr);
}

// Alle Teile der Ausrüstung nach dem Körper (aufgerufen von humanoid3)
function gearAll3(cls, T, c) {
  return (A, g) => {
    gearArmor3(A, g, T.a, cls, c);
    gearShoulders3(A, g, T.s, cls);
    gearBoots3(A, g, T.b);
    gearBelt3(A, g, T.g);
  };
}

// Klinge aus einem Umriss: edge sind Punkte [u, v] der rechten Kante (u in halben Breiten, v in Längen),
// die linke Kante ist gespiegelt; curve biegt die Spitze zur Seite (Mondklinge, Sichel)
function edgeBladeGeo(key, len, w, edge, curve = 0) {
  return geo3(`eb${key},${len},${w},${curve}`, () => {
    const bend = (v) => curve * v * v * len * 0.35;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    for (const [u, v] of edge) s.lineTo(u * w / 2 + bend(v), v * len);
    s.lineTo(bend(1), len);
    for (let i = edge.length - 1; i >= 0; i--) s.lineTo(-edge[i][0] * w / 2 + bend(edge[i][1]), edge[i][1] * len);
    s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: w * 0.16, bevelEnabled: true, bevelThickness: w * 0.1, bevelSize: w * 0.1, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -w * 0.08);
    return smoothGeo(g);
  });
}
// Klingenformen je Stufe: schlicht, Blatt, Sichel (gebogen), Säge, Runen, gezackt, schlank, breit
const BLADE_EDGE3 = {
  plain: [[1, 0.78], [0.8, 0.88]],
  leaf: [[1.05, 0.12], [1.45, 0.5], [1.3, 0.72], [0.7, 0.9]],
  slim: [[0.9, 0.84], [0.6, 0.93]],
  broad: [[1.12, 0.3], [1.18, 0.74], [0.85, 0.9]],
  jagged: [[1.0, 0.1], [1.4, 0.18], [0.95, 0.28], [1.38, 0.38], [0.92, 0.48], [1.3, 0.58], [0.85, 0.68], [1.15, 0.77], [0.7, 0.86]],
  // seit 13.53: Abgrund gewellt wie ein Tentakel, Ewigkeit schlank mit einem Strahlenkreuz kurz vor der Spitze
  rift: [[1.25, 0.08], [0.9, 0.2], [1.35, 0.34], [0.95, 0.48], [1.4, 0.62], [1.0, 0.74], [0.6, 0.88]],
  nova: [[0.85, 0.2], [0.9, 0.56], [1.75, 0.64], [0.8, 0.7], [0.55, 0.9]]
};
const BLADE_OF3 = ['plain', 'leaf', 'plain', 'plain', 'plain', 'jagged', 'slim', 'broad', 'rift', 'nova'];

// Fächerblatt (Kreisausschnitt nach oben)
const fanLeafGeo = (r, h) => geo3(`fanleaf3${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 18, 1, false, Math.PI * 0.56, Math.PI * 0.88).rotateX(Math.PI / 2));

// --- Waffen (Griff im Ursprung, Klinge entlang +y) -----------------------------------------------
// Jede Art behält ihre Grundform; die Stufe ändert Klinge, Parierstange, Knauf bzw. Kopfstück
// (Bauplan: docs/grafik-prompts.md, Abschnitt 4.11).

// Schaftfarbe des Zepters je Stufe (Magier, seit 8.6)
const ROD3_SHAFT = ['#6b4a2e', '#3a2e2a', '#2e3448', '#2a3f74', '#2e2450', OBSIDIAN3, '#121a3c', '#e6eaf2', '#140e24', '#f8f4fa'];

// --- Klingenplatten mit Details (seit 13.30) -------------------------------------------------------------
// Umriss (mit Löchern) als flache Platte, mittig in z
function plateGeo3(key, pts, holes, depth, bevel = 0.01) {
  return geo3(key, () => {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.closePath();
    for (const h of holes || []) {
      const ph = new THREE.Path();
      ph.moveTo(h[0][0], h[0][1]);
      for (let i = 1; i < h.length; i++) ph.lineTo(h[i][0], h[i][1]);
      ph.closePath();
      sh.holes.push(ph);
    }
    return smoothGeo(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -depth / 2));
  });
}
// Leuchtfarbe der Klingenader je Stufe (ab Stufe 4)
const BLADE_VEIN3 = [null, null, null, null, '#d6a8ff', '#ff7a2a', '#bff4ff', '#fff2b0', VOIDGLOW3, ROSEGLOW3];
// Klinge mit Details: helle Schneide (die Platte selbst), dunklere geschliffene Mitte auf beiden Seiten,
// ab Stufe 4 eine leuchtende Ader in der Mitte. o: p, s, r wie die Klinge; inset: Breite der Schneide
function detailBlade3(W, key, pts, holes, depth, col, tier, o) {
  const inset = o.inset || 0.026;
  W(plateGeo3(key, pts, holes, depth, o.bevel || 0.01), col, { p: o.p, s: o.s, r: o.r, shine: 1, top: lighter(col, 0.35), topK: 0.3 });
  const panelCol = tier === 5 ? '#4a3036' : darker(col, 0.24);
  const inner = insetPts(pts, inset);
  const ih = (holes || []).map((h) => insetPts(h, -inset * 0.6));
  const pz = depth / 2 + 0.008;
  const panel = plateGeo3(key + ':p', inner, ih, 0.003, 0.002);
  for (const sz of [-1, 1]) W(panel, panelCol, { p: [o.p[0], o.p[1], o.p[2] + sz * pz * (o.s ? o.s[2] || 1 : 1)], s: o.s, r: o.r, shine: 0.5 });
  const vein = BLADE_VEIN3[tier];
  if (vein) {
    const core = insetPts(pts, inset * 2.4);
    const vg = plateGeo3(key + ':v', core, (holes || []).map((h) => insetPts(h, -inset * 1.4)), 0.003, 0.0015);
    for (const sz of [-1, 1]) W(vg, vein, { p: [o.p[0], o.p[1], o.p[2] + sz * (pz + 0.004)], s: o.s, r: o.r, mat: 'glow' });
  }
}

// --- Dolche (seit 13.19) ---------------------------------------------------------------------------
// Eigener Bauplan statt des verkleinerten Schwerts: kurzer Griff, kleine Parierstange, flache Klinge mit eigener
// Form je Stufe (aus einem Umriss extrudiert, damit sie wie geschliffenes Blech wirkt):
// 0 Kurzdolch (gerade, Holzgriff), 1 Stahldolch (spitzes Dreieck), 2 Schattendolch (gebogene Klinge),
// 3 Viperzahn (gewellte Schlangenklinge), 4 Nachtklinge (Kunai mit Ringknauf), 5 Aschendolch (gezackter Obsidian),
// 6 Sternendolch (schmales Stilett, Sternparier), 7 Götterzahn (goldener Hakendolch),
// seit 13.53: 8 Abgrundstachel (Fangzahn mit Tentakelparier), 9 Ewigkeitsdorn (Sternnadel aus Platin).
// Seit 13.20 kleiner und je Stufe etwas größer (Kurzdolch 0,95-fach bis Götterzahn 1,44-fach), Klingenfläche
// zur Kamera gedreht: im Rückhandgriff zeigt die Klinge am Unterarm entlang nach hinten
const DAGGER_SCALE3 = 0.95;
// Stufen 8 und 9 (seit 13.53) wachsen nur noch wenig, damit der Dolch ein Dolch bleibt
const daggerScale3 = (tier) => DAGGER_SCALE3 + Math.min(tier, 7) * 0.07 + Math.max(0, tier - 7) * 0.03;
const DAGGER_TURN3 = 0;
const DAGGER_BLADES3 = DAGGER_BLADES;
function daggerBladeGeo3(tier) {
  return geo3('dagblade' + tier, () => {
    const pts = DAGGER_BLADES3[tier];
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.lineTo(pts[0][0], pts[0][1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -0.004);
    return smoothGeo(g);
  });
}
function dagger3(W, tier, shell) {
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const blade = tier === 5 ? OBSIDIAN3 : tier === 7 ? '#ffe9a0' : tier === 8 ? VOIDMETAL3 : tier === 9 ? PLATIN3 : tier === 2 ? '#3a3448' : tier === 4 ? '#5a6a8a' : metal;
  const grip = 0.09;
  // Griff mit Wicklung
  W(limb3(grip, 0.022, 0.02, 7), tier === 0 ? '#6b4a2e' : tier === 4 ? '#2a2a3a' : darker(accent, 0.2), { p: [0, 0.02, 0] });
  for (let k = 0; k < 3; k++) W(torus3(0.023, 0.006, Math.PI * 2, 4, 10), tier === 7 ? GOLD3 : tier === 8 ? VOIDGLOW3 : tier === 9 ? ROSEGOLD3 : '#2a1a12', { p: [0, -grip * (0.2 + k * 0.28), 0], r: [Math.PI / 2, 0, 0], mat: tier === 8 ? 'glow' : undefined });
  // Knauf
  const py = -grip - 0.01;
  if (tier === 4) W(torus3(0.026, 0.007, Math.PI * 2, 4, 12), '#8a9ab8', { p: [0, py - 0.022, 0], shine: 1 });
  else if (tier === 3) coneAlong(W, horn3(1, 0.3, 4), [0, py + 0.01, 0], [0, -1, 0], 0.045, 0.14, '#e8dcc0');
  else if (tier >= 5) W(G3.gem(), tier === 5 ? '#ff7a2a' : GLOW3[tier], { p: [0, py - 0.008, 0], s: [0.016, 0.026, 0.016], mat: 'glow' });
  else W(sphere3(0.022, 8, 6), tier === 0 ? '#8a8f96' : metal, { p: [0, py, 0], shine: 0.8 });
  // kleine Parierstange je Stufe
  const gy = 0.03;
  switch (tier) {
    case 2: W(cyl3(0.03, 0.03, 0.012, 10), '#2a2430', { p: [0, gy, 0] }); break;
    case 3: for (const sx of [-1, 1]) coneAlong(W, horn3(1, 0.3, 4), [sx * 0.012, gy, 0], [sx, -0.6, 0], 0.045, 0.14, '#e8dcc0'); break;
    case 4: break;
    case 5: for (const sx of [-1, 1]) coneAlong(W, G3.spike(), [sx * 0.015, gy, 0], [sx, 0.4, 0], 0.05, 0.2, OBSIDIAN3, { shine: 0.6 }); break;
    case 6: star3(W, [0, gy, 0], 0.03, '#e6f6ff'); break;
    case 7:
      W(roundBox(0.09, 0.022, 0.03, 0.01), GOLD3, { p: [0, gy, 0], shine: 1 });
      W(G3.gem(), GLOW3[7], { p: [0, gy, 0.018], s: [0.012, 0.016, 0.01], mat: 'glow' });
      break;
    case 8:
      // zwei Tentakelhaken rollen sich zur Klinge ein, dazwischen ein kleines Leerenauge
      for (const sx of [-1, 1]) tendril3(W, [[sx * 0.012, gy, 0], [sx * 0.04, gy - 0.012, 0], [sx * 0.058, gy + 0.018, 0], [sx * 0.042, gy + 0.04, 0]], 0.009);
      voidEye3(W, [0, gy, 0.012], 0.014);
      break;
    case 9: nova3(W, [0, gy, 0.004], 0.04); break;
    default: W(roundBox(tier === 0 ? 0.07 : 0.09, 0.02, 0.032, 0.008), tier === 0 ? '#8a8f96' : metal, { p: [0, gy, 0], shine: 0.8 });
  }
  // Klinge
  const by = 0.038;
  // Breitseite nach oben (zur Spielkamera), sonst sieht man von oben nur die Schneide als Strich
  // seit 13.30 mit heller Schneide, dunkler Mitte und Leuchtader
  detailBlade3(W, 'dag5_' + tier, DAGGER_BLADES3[tier], null, 0.008, blade, tier, { p: [0, by, 0], r: [0, DAGGER_TURN3, 0], inset: 0.007, bevel: 0.004 });
  // Merkmale auf der Klinge
  // Leuchtlinien in der Klinge (folgen der Form: beim Karambit und Götterzahn schräg zum Haken)
  const line = (col, x, y, len, tilt, w = 0.008) => W(roundBox(w, len, 0.02, 0.003), col, { p: [x, by + y, 0], r: [0, DAGGER_TURN3, tilt], mat: 'glow' });
  if (tier === 1) line(lighter(metal, 0.3), 0, 0.08, 0.1, 0, 0.005);
  if (tier === 2) line('#b48cff', 0.035, 0.07, 0.11, -0.55);
  if (tier === 3) line('#7ad86a', 0, 0.12, 0.17, 0);
  if (tier === 4) line(GLOW3[4], 0, 0.1, 0.13, 0);
  if (tier === 5) { line('#ff7a2a', 0, 0.13, 0.19, 0); for (const sx of [-1, 1]) line('#ff7a2a', sx * 0.026, 0.07, 0.05, sx * 0.9, 0.006); }
  if (tier === 6) line('#bff4ff', 0, 0.17, 0.2, 0, 0.006);
  if (tier === 7) { line(GLOW3[7], 0.03, 0.12, 0.15, -0.3); line(GLOW3[7], 0.075, 0.2, 0.07, -0.6, 0.006); }
  if (tier === 8) { line(VOIDGLOW3, 0.04, 0.13, 0.15, -0.32); line(VOIDGLOW3, 0.095, 0.27, 0.1, -0.15, 0.006); }
  if (tier === 9) { line(ROSEGLOW3, 0, 0.17, 0.2, 0, 0.005); for (const y of [0.092, 0.244]) star3(W, [0, by + y, 0.008], 0.022, '#fff4fa'); }
  shell(roundBox(0.12, 0.34, 0.06, 0.03), { p: [0, by + 0.13, 0] });
}

// --- Bögen (seit 13.20) ------------------------------------------------------------------------------
// Jede Stufe eine eigene Silhouette statt desselben Bogens in anderer Farbe. Ein Wurfarm ist als Mittellinie
// vom Griff (0, 0) bis zur Spitze gegeben (x < 0 zur Sehne hin, x > 0 nach vorn) und wird gespiegelt;
// die Sehne läuft gerade von Spitze zu Spitze. Dieselben Linien zeichnet das Inventarsymbol (bowIconArt).
// 0 Jagdbogen (schlichter Holzbogen), 1 Kurzbogen (kurzer Reiterbogen mit nach vorn gebogenen Hornspitzen),
// 2 Schattenbogen (langer, dunkler Bogen mit Mondsicheln), 3 Viperbogen (gewellte Arme, Schlangenköpfe),
// 4 Nachtbogen (Doppelarm aus blauem Stahl, schwebender Stein), 5 Aschenbogen (Obsidian mit Zacken und Glut),
// 6 Sternenbogen (weiße Flügel aus Federn), 7 Götterbogen (goldener Reflexbogen mit Sonnenscheibe und Klingen),
// seit 13.53: 8 Abgrundbogen (Klauenarme mit Leerensplittern und Leerenauge), 9 Ewigkeitsbogen (Platin mit Sternen).
function bow3(W, tier, shell) {
  const L = BOW_LIMBS[tier];
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const n = L.pts.length;
  const tip = L.pts[n - 1];
  for (const sy of [-1, 1]) {
    const P = L.pts.map(([x, y]) => [x, y * sy, 0]);
    for (let k = 0; k < n - 1; k++) {
      const r0 = L.r[0] + (L.r[1] - L.r[0]) * (k / (n - 1));
      const r1 = L.r[0] + (L.r[1] - L.r[0]) * ((k + 1) / (n - 1));
      limbBetween(W, P[k], P[k + 1], r0, r1, L.wood, { seg: 6, shine: tier >= 6 ? 0.9 : 0.2 });
    }
    // zweiter, schmaler Arm (Nachtbogen) mit Querstreben
    if (L.rail) {
      const Q = P.map(([x, y], k) => [x - 0.05 * Math.min(1, k), y * 0.92, 0]);
      for (let k = 1; k < n - 1; k++) limbBetween(W, Q[k], Q[k + 1], 0.009, 0.007, metal, { seg: 5, shine: 1 });
      for (let k = 1; k < n - 1; k++) limbBetween(W, P[k], Q[k], 0.007, 0.007, metal, { seg: 5, shine: 1 });
    }
    const T = [tip[0], tip[1] * sy, 0];
    const dir = [tip[0] - L.pts[n - 2][0], (tip[1] - L.pts[n - 2][1]) * sy, 0];
    switch (tier) {
      case 1: coneAlong(W, horn3(1, 0.3, 5), T, dir, 0.05, 0.12, L.tip); break;
      case 2: crescent3(W, [T[0] + 0.01, T[1] + sy * 0.03, 0], 0.055, 0.012, sy > 0 ? Math.PI * 0.75 : -Math.PI * 0.75, Math.PI, '#d6c8ff'); break;
      case 3:
        // Schlangenkopf mit Giftzähnen und Augen
        W(ball(8), '#4e8a3e', { p: [T[0] - 0.01, T[1] + sy * 0.02, 0], s: [0.045, 0.034, 0.03], shine: 0.5 });
        coneAlong(W, horn3(1, 0.3, 4), [T[0] - 0.03, T[1] + sy * 0.01, 0], [-1, -sy * 0.6, 0], 0.045, 0.1, '#f0ead8');
        for (const z of [-0.02, 0.02]) W(sphere3(0.008, 6, 4), '#e8ff6a', { p: [T[0] - 0.02, T[1] + sy * 0.035, z], mat: 'glow' });
        break;
      case 4: coneAlong(W, G3.spike(), T, dir, 0.05, 0.14, lighter(metal, 0.2), { shine: 1 }); break;
      case 5: coneAlong(W, G3.spike(), T, dir, 0.06, 0.16, OBSIDIAN3, { shine: 0.6 }); break;
      case 6: for (const a of [-0.4, 0.15]) W(G3.feather(), FEATHER3, { p: T, r: [0, 0, (sy > 0 ? 0.6 : Math.PI - 0.6) + a * sy], s: 0.14, top: '#bfe8ff', topK: 0.5 }); break;
      case 7: coneAlong(W, G3.spike(), T, [0.4, sy, 0], 0.06, 0.18, '#fff2b0', { shine: 1 }); break;
      case 8: voidShard3(W, [T[0] - 0.01, T[1] + sy * 0.02, 0], [-0.4, sy, 0], 0.05, 0.018); break;
      case 9: nova3(W, [T[0] + 0.01, T[1] + sy * 0.015, 0], 0.05); break;
      default: W(sphere3(0.016, 6, 5), '#3a2a1c', { p: T });
    }
    // Schmuck an den Armen
    if (tier === 5) for (let k = 1; k < n - 1; k++) {
      const [x, y] = L.pts[k];
      coneAlong(W, G3.spike(), [x + 0.02, y * sy, 0], [1, sy * 0.5, 0], 0.05, 0.13, OBSIDIAN3);
      W(sphere3(0.01, 6, 4), '#ff7a2a', { p: [x, y * sy, 0.026], mat: 'glow' });
    }
    if (tier === 6) for (let k = 1; k < n - 1; k++) {
      const [x, y] = L.pts[k];
      W(G3.feather(), k % 2 ? '#dfefff' : FEATHER3, { p: [x + 0.02, y * sy, 0], r: [0, 0, sy > 0 ? -0.9 + k * 0.25 : Math.PI + 0.9 - k * 0.25], s: 0.16, top: '#bfe8ff', topK: 0.5 });
    }
    if (tier === 2) limbBetween(W, [0.03, sy * 0.1, 0.02], [-0.06, sy * 0.33, 0.02], 0.006, 0.004, '#b48cff', { mat: 'glow', seg: 4 });
    if (tier === 3) for (let k = 1; k < n - 1; k += 2) W(roundBox(0.03, 0.05, 0.04, 0.012), '#6aa84a', { p: [L.pts[k][0], L.pts[k][1] * sy, 0], r: [0, 0, 0.4 * sy] });
    if (tier === 7) limbBetween(W, [-0.02, sy * 0.1, 0.025], [-0.15, sy * 0.36, 0.025], 0.006, 0.004, GLOW3[7], { mat: 'glow', seg: 4 });
    // Abgrund: Klauensplitter am Rücken der Arme und eine cyanfarbene Ader; Ewigkeit: Sterne an den Gelenken
    if (tier === 8) {
      for (let k = 1; k < n - 1; k++) voidShard3(W, [L.pts[k][0] + 0.02, L.pts[k][1] * sy, 0], [1, sy * 0.6, 0], 0.045, 0.015);
      for (let k = 1; k < n - 2; k++) limbBetween(W, [L.pts[k][0], L.pts[k][1] * sy, 0.026], [L.pts[k + 1][0], L.pts[k + 1][1] * sy, 0.022], 0.005, 0.004, VOIDGLOW3, { mat: 'glow', seg: 4 });
    }
    if (tier === 9) for (let k = 2; k < n - 1; k += 2) {
      star3(W, [L.pts[k][0], L.pts[k][1] * sy, 0.026], 0.028, k % 4 ? ROSEGLOW3 : '#fff4fa');
      W(torus3(0.03, 0.007, Math.PI * 2, 3, 10), ROSEGOLD3, { p: [L.pts[k][0], L.pts[k][1] * sy, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
    }
  }
  // Sehne und Griff mit Wicklung
  W(limb3(+(tip[1] * 2).toFixed(2), 0.005, 0.005, 3), tier === 8 ? VOIDGLOW3 : tier === 9 ? ROSEGLOW3 : tier >= 6 ? '#e6f6ff' : '#efe6cc', { p: [tip[0], tip[1], 0], mat: tier >= 6 ? 'glow' : undefined });
  W(limb3(0.18, 0.034, 0.034, 7), tier === 7 ? '#7a4a1a' : tier === 6 ? '#8a9ab8' : tier === 8 ? '#120c1e' : tier === 9 ? '#a8706a' : '#3a2a1c', { p: [0.005, 0.09, 0] });
  for (let k = 0; k < 3; k++) W(torus3(0.036, 0.008, Math.PI * 2, 4, 10), tier === 0 ? '#5a3a22' : tier === 8 ? VOIDMETAL3 : tier === 9 ? ROSEGOLD3 : tier >= 6 ? GOLD3 : metal, { p: [0.005, 0.07 - k * 0.06, 0], r: [Math.PI / 2, 0, 0], shine: tier >= 8 ? 1 : 0 });
  if (tier === 4) floatGem3(W, [0.07, 0, 0], 0.025, GLOW3[4]);
  if (tier === 5) W(sphere3(0.026, 8, 6), '#ff7a2a', { p: [0.035, 0, 0], mat: 'glow' });
  if (tier === 7) sun3(sub3(W, [0.04, 0, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.055, 8, GOLD3, GLOW3[7]);
  if (tier === 3) W(G3.gem(), '#7ad86a', { p: [0.035, 0, 0], s: [0.018, 0.026, 0.014], mat: 'glow' });
  if (tier === 8) voidEye3(sub3(W, [0.04, 0, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.03);
  if (tier === 9) nova3(sub3(W, [0.042, 0, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.06);
  shell(roundBox(0.12, tip[1] * 2 + 0.1, 0.08, 0.04), { p: [tip[0] * 0.5, 0, 0] });
}

function weapon3(A, kind, tier, bone, at, rot, wg, o = {}) {
  tier = Math.max(0, Math.min(ITEM_TIERS.length - 1, tier || 0));
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const M = partFrame(at, rot);
  // Äxte (seit 13.48): Kopf um den Stiel gedreht, damit die Schneide in Blickrichtung zeigt und nach vorn hackt
  // (vorher stand die Klinge seitlich ab und der Hieb traf mit der flachen Seite)
  if ((kind === 'axe' || kind === 'greataxe') && typeof AXE_TWIST3 !== 'undefined') M.multiply(new THREE.Matrix4().makeRotationY(o.left ? -AXE_TWIST3 : AXE_TWIST3));
  const W = framed(A, M, bone);
  const shell = (geo, o) => wg && A(geo, '#ffffff', { bone, mat: 'wglow', m: M.clone().multiply(partMatrix(o)) });
  const gold = '#c9a35a';
  const gem = tier >= 4 ? STAFF_ORB[tier] : null;
  const iron = '#8a8f96';
  switch (kind) {
    case 'dagger': {
      // in Spielgröße (seit 13.19): als Ganzes größer, damit man die Dolchform auch von oben erkennt
      const S = daggerScale3(tier);
      const MD = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(S, S, S));
      const WD = framed(A, MD, bone);
      const shellD = (geo, oo) => wg && A(geo, '#ffffff', { bone, mat: 'wglow', m: MD.clone().multiply(partMatrix(oo)) });
      dagger3(WD, tier, shellD);
      return;
    }
    case 'sword':
    case 'greatsword': {
      const big = kind === 'greatsword';
      const dag = kind === 'dagger';
      const len = big ? 1.0 : dag ? 0.34 : 0.68;
      const wd = big ? 0.17 : dag ? 0.075 : 0.11;
      const grip = big ? 0.26 : 0.16;
      const bladeCol = tier === 5 ? OBSIDIAN3 : tier === 7 ? '#ffe9a0' : tier === 8 ? VOIDMETAL3 : metal;
      // Griff: Holz, Lederwicklung (Bronze) oder Wicklung in der Stufenfarbe
      W(limb3(grip, 0.028, 0.026, 7), tier === 0 ? '#6b4a2e' : accent, { p: [0, 0.03, 0] });
      const wraps = tier === 1 ? 4 : 3;
      for (let k = 0; k < wraps; k++) W(torus3(0.03, 0.009, Math.PI * 2, 4, 10), tier === 1 ? '#3a2618' : darker(accent, 0.3), { p: [0, -grip * (0.15 + k * (0.75 / wraps)), 0], r: [Math.PI / 2, 0, 0] });
      // Knauf
      const py = -grip - 0.02;
      switch (tier) {
        case 0: W(sphere3(0.034, 8, 6), iron, { p: [0, py, 0], shine: 0.6 }); break;
        case 1: W(sphere3(0.046, 10, 7), metal, { p: [0, py, 0], shine: 1 }); break;
        case 2: W(torus3(0.034, 0.011, Math.PI * 2, 4, 12), '#e6eef8', { p: [0, py - 0.015, 0], shine: 1 }); break;
        case 3:
          // Drachenklaue umfasst einen roten Stein
          W(sphere3(0.03, 8, 6), GLOW3[3], { p: [0, py - 0.01, 0], mat: 'glow' });
          for (let k = 0; k < 3; k++) {
            const a = k * 2.1;
            coneAlong(W, horn3(1, 0.3, 4), [Math.cos(a) * 0.02, py + 0.03, Math.sin(a) * 0.02], [Math.cos(a) * 0.8, -1, Math.sin(a) * 0.8], 0.06, 0.12, '#e8dcc0');
          }
          break;
        case 4:
          // schwebender Kristall unter dem Griff
          W(sphere3(0.022, 6, 4), metal, { p: [0, py + 0.01, 0], shine: 1 });
          W(G3.gem(), GLOW3[4], { p: [0, py - 0.065, 0], s: [0.026, 0.042, 0.026], mat: 'glow' });
          break;
        case 5: coneAlong(W, G3.spike(), [0, py + 0.02, 0], [0, -1, 0], 0.09, 0.22, OBSIDIAN3, { shine: 0.6 }); break;
        case 6: star3(W, [0, py - 0.01, 0], 0.036, '#e6f6ff'); break;
        case 8: voidShard3(W, [0, py - 0.03, 0], [0, -1, 0], 0.05, 0.026); break;
        case 9:
          W(sphere3(0.026, 8, 6), ROSEGOLD3, { p: [0, py + 0.01, 0], shine: 1 });
          nova3(W, [0, py - 0.035, 0], 0.045);
          break;
        default: W(G3.gem(), GLOW3[7], { p: [0, py - 0.01, 0], s: [0.03, 0.046, 0.03], mat: 'glow' });
      }
      // Parierstange
      const gw = big ? 0.36 : dag ? 0.16 : 0.26;
      const gy = 0.055;
      switch (tier) {
        case 0: W(roundBox(gw * 0.8, 0.035, 0.05, 0.015), iron, { p: [0, gy, 0], shine: 0.6 }); break;
        case 1:
          W(roundBox(gw, 0.04, 0.055, 0.018), metal, { p: [0, gy, 0], shine: 1 });
          for (const sx of [-1, 1]) W(sphere3(0.034, 8, 6), metal, { p: [sx * gw / 2, gy, 0], shine: 1 });
          break;
        case 2:
          crescent3(W, [0, gy + gw * 0.42, 0], gw * 0.5, 0.022, -Math.PI / 2, Math.PI * 0.9, '#e6eef8');
          W(sphere3(0.024, 8, 6), GLOW3[2], { p: [0, gy, 0.025], mat: 'glow' });
          break;
        case 3:
          // Drachenflügel nach oben außen, roter Stein in der Mitte
          W(roundBox(gw * 0.45, 0.05, 0.06, 0.02), accent, { p: [0, gy, 0], shine: 0.6 });
          for (const sx of [-1, 1]) W(wingGeo(), accent, { p: [sx * gw * 0.18, gy - 0.01, 0], r: [0, sx > 0 ? 0 : Math.PI, 0.35], s: gw * 0.75, shine: 0.4 });
          W(G3.gem(), GLOW3[3], { p: [0, gy, 0.035], s: [0.024, 0.034, 0.018], mat: 'glow' });
          break;
        case 4:
          // Dornenkranz um die Klingenwurzel
          W(roundBox(gw * 0.7, 0.03, 0.045, 0.012), darker(metal, 0.25), { p: [0, gy, 0], shine: 0.8 });
          W(torus3(0.046, 0.012, Math.PI * 2, 4, 12), metal, { p: [0, gy, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            coneAlong(W, horn3(1, 0.3, 4), [Math.cos(a) * 0.046, gy, Math.sin(a) * 0.046], [Math.cos(a), 0.6, Math.sin(a)], 0.055, 0.1, metal, { shine: 1 });
          }
          break;
        case 5:
          // Zackenkranz aus Obsidian, Glut in der Mitte
          for (const sx of [-1, 1]) {
            coneAlong(W, G3.spike(), [sx * 0.03, gy, 0], [sx, 0.35, 0], gw * 0.55, 0.2, OBSIDIAN3, { shine: 0.6 });
            coneAlong(W, G3.spike(), [sx * 0.02, gy, 0], [sx * 0.6, -0.8, 0], gw * 0.3, 0.16, OBSIDIAN3, { shine: 0.6 });
          }
          W(sphere3(0.03, 8, 6), '#ff7a2a', { p: [0, gy, 0.02], mat: 'glow' });
          break;
        case 6:
          for (const sx of [-1, 1]) wing3(W, [sx * 0.025, gy, 0], sx, 3, gw * 0.62, FEATHER3, '#bfe8ff', {}, 0);
          W(sphere3(0.022, 8, 6), GLOW3[6], { p: [0, gy, 0.02], mat: 'glow' });
          break;
        case 8:
          // zwei Tentakel rollen sich über der Parierstange ein, in der Mitte ein Leerenauge
          W(roundBox(gw * 0.5, 0.04, 0.05, 0.016), VOID3, { p: [0, gy, 0], shine: 0.8 });
          for (const sx of [-1, 1]) tendril3(W, [[sx * gw * 0.2, gy, 0], [sx * gw * 0.42, gy - 0.02, 0], [sx * gw * 0.55, gy + 0.05, 0], [sx * gw * 0.45, gy + 0.11, 0], [sx * gw * 0.34, gy + 0.08, 0]], 0.022);
          voidEye3(W, [0, gy, 0.026], 0.032);
          break;
        case 9:
          // Roségoldsteg mit achtstrahligem Stern und zwei Prismensteinen
          W(roundBox(gw * 0.9, 0.03, 0.045, 0.014), ROSEGOLD3, { p: [0, gy, 0], shine: 1 });
          nova3(W, [0, gy + 0.005, 0.02], gw * 0.3);
          for (const sx of [-1, 1]) W(G3.gem(), PRISM3[sx > 0 ? 0 : 3], { p: [sx * gw * 0.47, gy, 0], s: [0.018, 0.028, 0.018], mat: 'glow' });
          break;
        default:
          W(roundBox(gw, 0.035, 0.05, 0.015), GOLD3, { p: [0, gy, 0], shine: 1 });
          sun3(W, [0, gy + 0.01, 0.01], gw * 0.22, 10, GOLD3, GLOW3[7]);
      }
      // Klinge
      const by = 0.08;
      const shape = BLADE_OF3[tier];
      const bw = wd * (tier === 6 ? 0.75 : tier === 7 ? 1.15 : tier === 8 ? 1.08 : tier === 9 ? 0.92 : 1);
      const bl = len * (tier === 6 ? 1.06 : tier >= 8 ? 1.08 : 1);
      W(edgeBladeGeo(shape, bl, bw, BLADE_EDGE3[shape], tier === 2 ? 0.28 : dag ? 0.1 : 0), bladeCol, { p: [0, by, 0], shine: 1, top: lighter(bladeCol, 0.35), topK: 0.25 });
      // Hohlkehle auf beiden Seiten
      if (tier !== 5 && tier !== 2) for (const sz of [-1, 1]) W(roundBox(bw * 0.2, bl * 0.6, 0.008, 0.004), darker(bladeCol, 0.32), { p: [0, by + bl * 0.38, sz * bw * 0.1] });
      switch (tier) {
        case 3:
          // Sägezahn-Rücken
          for (let k = 0; k < 5; k++) coneAlong(W, horn3(1, 0.3, 4), [-bw * 0.48, by + bl * (0.16 + k * 0.13), 0], [-1, 0.7, 0], bw * 0.45, bw * 0.5, bladeCol, { shine: 1 });
          break;
        case 4:
          W(roundBox(bw * 0.12, bl * 0.55, bw * 0.24, 0.004), lighter(GLOW3[4], 0.3), { p: [0, by + bl * 0.42, 0], mat: 'glow' });
          for (let k = 0; k < 3; k++) W(G3.gem(), GLOW3[4], { p: [bw * 0.28, by + bl * (0.25 + k * 0.17), 0], s: [0.012, 0.018, bw * 0.14], mat: 'glow' });
          break;
        case 5:
          W(roundBox(bw * 0.1, bl * 0.72, bw * 0.24, 0.004), '#ff7a2a', { p: [0, by + bl * 0.4, 0], mat: 'glow' });
          break;
        case 6:
          star3(W, [0, by + bl * 0.55, bw * 0.12], bw * 0.32, '#e6f6ff');
          break;
        case 7:
          for (const sx of [-1, 1]) W(roundBox(bw * 0.1, bl * 0.7, bw * 0.4, 0.004), GLOW3[7], { p: [sx * bw * 0.45, by + bl * 0.4, 0], mat: 'glow' });
          break;
        case 8:
          // cyanfarbene Ader die Klinge hinauf, an der Wurzel ein Leerenauge, Splitter schweben neben der Spitze
          W(roundBox(bw * 0.1, bl * 0.74, bw * 0.42, 0.004), VOIDGLOW3, { p: [0, by + bl * 0.42, 0], mat: 'glow' });
          voidEye3(W, [0, by + bl * 0.1, bw * 0.12], bw * 0.26);
          for (const sx of [-1, 1]) voidShard3(W, [sx * bw * 1.05, by + bl * (sx > 0 ? 0.78 : 0.62), 0], [sx * 0.2, 1, 0], bw * 0.32, bw * 0.12);
          break;
        case 9:
          // roséfarbene Schneiden, Stern an der Klingenwurzel, Prismensteine im Strahlenkreuz
          for (const sx of [-1, 1]) W(roundBox(bw * 0.08, bl * 0.5, bw * 0.42, 0.004), ROSEGLOW3, { p: [sx * bw * 0.36, by + bl * 0.32, 0], mat: 'glow' });
          star3(W, [0, by + bl * 0.12, bw * 0.12], bw * 0.34, ROSEGLOW3);
          for (const sx of [-1, 1]) W(G3.gem(), PRISM3[sx > 0 ? 1 : 4], { p: [sx * bw * 0.6, by + bl * 0.64, 0], s: [bw * 0.1, bw * 0.15, bw * 0.12], mat: 'glow' });
          break;
        default:
      }
      shell(roundBox(bw * 1.9, bl * 1.12, 0.09, 0.045), { p: [0, by + bl / 2, 0] });
      return;
    }
    case 'bow':
      bow3(W, tier, shell);
      return;
    case 'fan': {
      // Fächer: Blatt nach oben, Rippen, Goldrand; Kranich aus Federn, Phönix mit Flammenspitzen …
      const leaf = tier === 0 ? '#efe6cc' : FAN_LEAF[tier];
      if (tier === 2) {
        for (let k = -3; k <= 3; k++) W(G3.feather(), k % 2 ? FEATHER3 : '#e8eef4', { p: [0, 0.04, 0.004 * k], r: [0, 0, k * 0.22], s: 0.38, top: '#2a2a30', topK: 0.3 });
      } else {
        // seit 13.29 eigener Blattumriss je Stufe (FAN_SHAPES, wie das Inventarsymbol)
        const leafGeo = geo3('fanleaf4_' + tier, () => {
          const pts = fanLeafPts(tier, tier === 7 ? 0.3 : 0.36, 0.05, Math.PI / 2);
          const sh = new THREE.Shape();
          sh.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
          sh.lineTo(pts[0][0], pts[0][1]);
          return smoothGeo(new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -0.005));
        });
        W(leafGeo, leaf, { p: [0, 0.04, 0], top: lighter(leaf, 0.25), topK: 0.3, shine: tier === 1 ? 0.5 : tier === 7 ? 1 : tier >= 8 ? 0.7 : 0 });
        const FS = FAN_SHAPES[tier];
        if (FS.edge === 'smooth' || FS.edge === 'scallop') W(torus3(0.33, 0.011, FS.span * 0.96, 4, 18), gold, { p: [0, 0.04, 0.01], r: [0, 0, Math.PI / 2 - FS.span * 0.48], shine: 1 });
      }
      const span = FAN_SHAPES[tier].span;
      const nr = tier === 7 ? 14 : Math.max(5, Math.min(9, Math.round(span / 0.3)));
      for (let k = 0; k < nr; k++) {
        const th = tier === 7 ? (k / nr) * span - span / 2 : -span * 0.45 + (k / (nr - 1)) * span * 0.9;
        W(limb3(tier === 7 ? 0.27 : 0.34, 0.007, 0.006, 3), tier === 7 ? GOLD3 : tier === 8 ? VOIDMETAL3 : tier === 9 ? ROSEGOLD3 : '#3a2a1c', { p: [0, 0.04, 0.012], r: [0, 0, Math.PI + th] });
      }
      const edge = (k, r = 0.37) => {
        const a = Math.PI / 2 + k * 0.2;
        return [Math.cos(a) * r, 0.04 + Math.sin(a) * r, 0.01];
      };
      if (tier === 3) for (let k = -2; k <= 2; k++) flame3(W, edge(k * 1.4, 0.2), [0, 1, 0], 0.07, 0.1, '#ff7a2a', '#ffd34d');
      if (tier === 4) {
        W(sphere3(0.045, 10, 8), '#f4e8ff', { p: [0, 0.04, 0.03], mat: 'glow' });
        for (let k = -2; k <= 2; k++) W(G3.scale(), '#3a2a6a', { p: edge(k * 1.4, 0.22), r: [Math.PI / 2, 0, k * 0.28], s: 0.03, shine: 0.5 });
      } else W(sphere3(0.035, 8, 6), gold, { p: [0, 0.03, 0.02], shine: 1 });
      if (tier === 5) for (let k = -2; k <= 2; k++) W(sphere3(0.012, 6, 4), '#ffd34d', { p: edge(k * 1.3, 0.26), mat: 'glow' });
      if (tier === 6) for (let k = -2; k <= 2; k++) W(G3.puff(), '#f4f8ff', { p: edge(k * 1.5, 0.24), s: 0.03 });
      if (tier === 7) sun3(W, [0, 0.04, 0.03], 0.07, 10, GOLD3, GLOW3[7]);
      // seit 13.53: Abgrund mit Leerenauge auf dem Blatt und cyanfarbenen Fangspitzen, Ewigkeit mit Sternen
      if (tier === 8) {
        voidEye3(W, [0, 0.27, 0.014], 0.05);
        for (let k = -2; k <= 2; k++) W(sphere3(0.01, 6, 4), VOIDGLOW3, { p: edge(k * 1.35, 0.34), mat: 'glow' });
      }
      if (tier === 9) {
        nova3(W, [0, 0.04, 0.03], 0.075);
        for (let k = -2; k <= 2; k++) star3(W, edge(k * 1.5, k % 2 ? 0.22 : 0.27), k % 2 ? 0.022 : 0.03, k % 2 ? ROSEGLOW3 : '#fff4fa');
      }
      // Details (seit 13.30): kräftige Außenstäbe aus Metall, Niete am Drehpunkt
      if (tier !== 7) for (const sd of [-1, 1]) W(limb3(0.33, 0.012, 0.009, 4), tier >= 4 ? metal : '#5a3a22', { p: [0, 0.04, 0.016], r: [0, 0, Math.PI + sd * span * 0.47], shine: tier >= 4 ? 1 : 0.3 });
      W(torus3(0.024, 0.008, Math.PI * 2, 4, 10), tier === 7 ? GOLD3 : tier === 9 ? ROSEGOLD3 : gold, { p: [0, 0.04, 0.02], shine: 1 });
      W(limb3(0.16, 0.01, 0.01, 4), '#c8402f', { p: [0, 0.02, 0] });
      W(sphere3(0.03, 8, 6), '#c8402f', { p: [0, -0.15, 0] });
      shell(geo3('fanshell4_' + tier, () => new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16, 1, false, Math.PI - span / 2, span).rotateX(Math.PI / 2)), { p: [0, 0.04, 0] });
      return;
    }
    case 'bell': {
      const bc = tier === 5 ? '#4a3a34' : tier === 7 ? GOLD3 : tier === 8 ? VOIDMETAL3 : tier === 9 ? PLATIN3 : tier >= 3 ? metal : gold;
      W(limb3(0.2, 0.024, 0.024, 7), '#6b4a2e', { p: [0, 0.2, 0] });
      W(torus3(0.04, 0.012, Math.PI * 2, 4, 10), gold, { p: [0, 0.22, 0], shine: 1 });
      // seit 13.29 eigene Glockenform je Stufe (BELL_PROFILES, wie das Inventarsymbol); Krone sitzt am Griff
      const BP = BELL_PROFILES[tier];
      const bh = BP[BP.length - 1][1];
      W(lathe3('bell3_' + tier, BP, 16), bc, { p: [0, -bh - 0.01, 0], shine: 1 });
      W(sphere3(0.035, 8, 6), STAFF_ORB[tier], { p: [0, -bh - 0.02, 0], mat: 'glow' });
      // Bänder an der Krone, so lang wie die Glocke (kurze Glocken: kurze Bänder)
      for (const sx of [-1, 1]) W(roundBox(0.03, bh * 0.85, 0.008, 0.004), tier === 2 ? '#f4f4f0' : '#c8402f', { p: [sx * 0.05, -0.01 - bh * 0.42, 0.02], r: [0, 0, sx * 0.25] });
      switch (tier) {
        case 1: for (const [y, r] of [[0.03, 0.116], [0.08, 0.094], [0.19, 0.088]]) W(torus3(r, 0.008, Math.PI * 2, 3, 16), lighter(bc, 0.2), { p: [0, -bh - 0.01 + y, 0], r: [Math.PI / 2, 0, 0], shine: 1 }); break;
        case 2: W(G3.feather(), FEATHER3, { p: [0.03, -0.02, 0], r: [0, 0, -0.5], s: 0.2, top: '#2a2a30', topK: 0.3 }); break;
        case 3: for (let k = -1; k <= 1; k++) flame3(W, [k * 0.04, -0.02, 0], [k * 0.5, 1, 0], 0.09, 0.14, '#ff7a2a', '#ffd34d'); break;
        case 4:
          for (const sx of [-1, 1]) coneAlong(W, horn3(1, 0.3, 5), [sx * 0.05, -0.03, 0], [sx * 0.8, 1, 0], 0.1, 0.2, '#e8dcc0');
          W(sphere3(0.03, 8, 6), '#f4e8ff', { p: [0, 0.0, 0.05], mat: 'glow' });
          break;
        case 5:
          for (const [x, r] of [[-0.06, 0.3], [0.05, -0.4], [0.0, 0.1]]) W(roundBox(0.012, 0.07, 0.01, 0.004), '#ff7a2a', { p: [x, -0.1, Math.sqrt(Math.max(0, 0.018 - x * x)) + 0.01], r: [0, Math.atan2(x, 0.13), r], mat: 'glow' });
          break;
        case 6: for (const sx of [-1, 1]) wing3(W, [sx * 0.03, 0.02, 0], sx, 3, 0.14, FEATHER3, '#bfe8ff', {}, 0); break;
        case 7: sun3(W, [0, 0.06, 0], 0.06, 10, GOLD3, GLOW3[7]); break;
        default:
      }
      // Details (seit 13.30): Zierbänder an Rand und Schulter, Runen rundherum (ab Stufe 3 leuchtend), Krone mit Nieten
      const rAt = (f) => {
        const y = f * bh;
        for (let i = 1; i < BP.length; i++) if (BP[i][1] >= y) { const [r0, y0] = BP[i - 1]; const [r1, y1] = BP[i]; return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-4, y1 - y0)); }
        return BP[BP.length - 1][0];
      };
      const by0 = -bh - 0.01;
      const band = tier === 7 ? GOLD3 : tier === 8 ? VOIDGLOW3 : tier === 9 ? ROSEGOLD3 : tier >= 4 ? lighter(bc, 0.35) : darker(bc, 0.3);
      for (const f of [0.06, 0.62]) W(torus3(rAt(f) + 0.004, 0.009, Math.PI * 2, 4, 18), band, { p: [0, by0 + f * bh, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      const runes = tier >= 3 ? STAFF_ORB[tier] : darker(bc, 0.4);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const rr = rAt(0.32) + 0.003;
        W(roundBox(0.012, 0.04, 0.006, 0.003), runes, { p: [Math.sin(a) * rr, by0 + 0.32 * bh, Math.cos(a) * rr], r: [0, a, k % 2 ? 0.4 : -0.4], mat: tier >= 3 ? 'glow' : 'lit' });
      }
      W(torus3(0.03, 0.008, Math.PI * 2, 4, 10), tier === 7 ? GOLD3 : tier === 9 ? ROSEGOLD3 : gold, { p: [0, -0.01, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; W(sphere3(0.009, 6, 4), gold, { p: [Math.sin(a) * 0.032, -0.012, Math.cos(a) * 0.032], shine: 1 }); }
      // seit 13.53: Abgrund mit Leerenauge auf der Flanke und Tentakeln am Schlund, Ewigkeit mit Stern und Prismensteinen
      if (tier === 8) {
        voidEye3(W, [0, by0 + 0.45 * bh, rAt(0.45) + 0.006], 0.04);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + 0.3;
          const r0 = rAt(0.02);
          tendril3(W, [[Math.sin(a) * r0, by0 + 0.01, Math.cos(a) * r0], [Math.sin(a) * (r0 + 0.02), by0 - 0.04, Math.cos(a) * (r0 + 0.02)], [Math.sin(a + 0.3) * (r0 + 0.04), by0 - 0.07, Math.cos(a + 0.3) * (r0 + 0.04)], [Math.sin(a + 0.5) * (r0 + 0.03), by0 - 0.05, Math.cos(a + 0.5) * (r0 + 0.03)]], 0.012);
        }
      }
      if (tier === 9) {
        nova3(W, [0, by0 + 0.4 * bh, rAt(0.4) + 0.008], 0.06);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + Math.PI / 5;
          const rr = rAt(0.62) + 0.008;
          W(G3.gem(), PRISM3[k], { p: [Math.sin(a) * rr, by0 + 0.62 * bh, Math.cos(a) * rr], s: [0.009, 0.014, 0.009], mat: 'glow' });
        }
      }
      shell(sphere3(0.21, 12, 8), { p: [0, -0.14, 0] });
      return;
    }
    case 'staff':
    case 'skullstaff': {
      // Stab mit Kopfstück: Knochen, Krummholz, Schädel, Kralle mit Kugel, Dornenkrone, Obsidian, Stern, Sonne
      const head = kind === 'skullstaff' ? 2 : tier;
      W(limb3(1.45, 0.03, 0.026, 7), head === 2 ? '#4a3527' : head === 7 ? '#8a6a2a' : head === 8 ? '#1a1228' : head === 9 ? '#e8e0ea' : '#5a3f2a', { p: [0, 1.0, 0], shade: 0.2, shine: head >= 8 ? 0.6 : 0 });
      for (const y of [0.1, 0.55]) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), head === 7 ? GOLD3 : head === 8 ? VOIDMETAL3 : head === 9 ? ROSEGOLD3 : gold, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      const orb = STAFF_ORB[tier];
      switch (head) {
        case 0:
          W(ball(10), BONE3, { p: [0, 1.04, 0], s: [0.06, 0.05, 0.05], shade: 0.2 });
          for (const sx of [-1, 1]) coneAlong(W, horn3(1, 0.3, 5), [sx * 0.04, 1.05, 0], [sx, 0.8, 0], 0.11, 0.2, BONE3);
          W(sphere3(0.03, 8, 6), orb, { p: [0, 1.1, 0], mat: 'glow' });
          break;
        case 1:
          W(torus3(0.07, 0.022, Math.PI * 1.4, 4, 12), '#6a4a2e', { p: [-0.07, 1.0, 0], r: [0, 0, -0.2], shade: 0.2 });
          W(sphere3(0.04, 8, 6), orb, { p: [-0.07, 1.0, 0], mat: 'glow' });
          break;
        case 2:
          W(ball(12), BONE3, { p: [0, 1.07, 0], s: [0.1, 0.095, 0.105] });
          W(roundBox(0.1, 0.05, 0.08, 0.025), BONE3, { p: [0, 1.0, 0.02] });
          for (const sx of [-1, 1]) W(sphere3(0.026, 7, 5), '#9be2ff', { p: [sx * 0.038, 1.07, 0.085], mat: 'glow' });
          break;
        case 3:
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2;
            W(horn3(0.16, 0.018, 5), metal, { p: [Math.cos(a) * 0.05, 0.98, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], shine: 1 });
          }
          W(sphere3(0.075, 14, 10), orb, { p: [0, 1.08, 0], mat: 'glow' });
          break;
        case 4:
          W(torus3(0.07, 0.014, Math.PI * 2, 4, 14), '#ddd5bb', { p: [0, 1.0, 0], r: [Math.PI / 2, 0, 0] });
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            coneAlong(W, G3.spike(), [Math.cos(a) * 0.07, 1.0, Math.sin(a) * 0.07], [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3], 0.1 + (k % 2) * 0.04, 0.16, '#ddd5bb');
          }
          floatGem3(W, [0, 1.16, 0], 0.035, orb);
          break;
        case 5:
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + 0.4;
            emberSpike3(W, [Math.cos(a) * 0.03, 0.98, Math.sin(a) * 0.03], [Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45], 0.2 - (k % 2) * 0.05, 0.22);
          }
          W(sphere3(0.05, 10, 8), '#ff7a2a', { p: [0, 1.06, 0], mat: 'glow' });
          break;
        case 6:
          crescent3(W, [0, 1.06, 0], 0.08, 0.016, -Math.PI / 2, Math.PI * 1.2, '#e6eef8');
          star3(W, [0, 1.12, 0], 0.06, '#e6f6ff');
          break;
        case 8:
          // Abgrund (seit 13.53): vier Tentakelklauen halten ein Leerenauge, drei Splitter schweben darüber
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
            const P = (r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
            tendril3(W, [P(0.025, 0.97), P(0.085, 1.04), P(0.1, 1.14), P(0.07, 1.22), P(0.035, 1.2)], 0.018);
          }
          W(ball(10), VOID3, { p: [0, 1.12, -0.01], s: [0.07, 0.06, 0.05], shine: 0.8 });
          voidEye3(W, [0, 1.12, 0.03], 0.05);
          for (let k = 0; k < 3; k++) voidShard3(W, [(k - 1) * 0.08, 1.3 + (k % 2) * 0.05, 0], [(k - 1) * 0.3, 1, 0], 0.05, 0.016);
          break;
        case 9:
          // Ewigkeit (seit 13.53): zwei gekreuzte achtstrahlige Sterne im Roségoldring mit Prismensteinen
          nova3(W, [0, 1.13, 0], 0.13);
          nova3(sub3(W, [0, 1.13, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.09);
          W(torus3(0.085, 0.008, Math.PI * 2, 3, 20), ROSEGOLD3, { p: [0, 1.13, 0], shine: 1 });
          prismRing3(W, [0, 1.13, 0], 0.085, 5, 0.012);
          break;
        default:
          sun3(W, [0, 1.08, 0], 0.08, 12, GOLD3, GLOW3[7]);
          sun3(sub3(W, [0, 1.08, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.06, 8, GOLD3, null);
      }
      // Details (seit 13.30): Griffwicklung in der Mitte, Metallschuh unten, Anhänger am Kopf (Schnur, Perlen, Feder)
      const wrapCol = head === 7 ? '#7a4a1a' : head === 9 ? '#a8706a' : head >= 4 ? '#2a1a24' : '#3a2618';
      for (let k = 0; k < 7; k++) W(torus3(0.033, 0.009, Math.PI * 2, 4, 10), k % 2 ? wrapCol : lighter(wrapCol, 0.15), { p: [0, 0.3 + k * 0.03, 0], r: [Math.PI / 2 + (k % 2 ? 0.25 : -0.25), 0, 0] });
      W(lathe3('staffshoe', [[0, -0.06], [0.02, -0.055], [0.034, 0], [0.034, 0.05], [0, 0.05]], 8), head === 7 ? GOLD3 : head === 8 ? VOIDMETAL3 : head === 9 ? ROSEGOLD3 : '#8a8f96', { p: [0, -0.43, 0], shine: 1 });
      W(limb3(0.16, 0.004, 0.004, 3), '#2a1a12', { p: [0.035, 0.9, 0] });
      for (let k = 0; k < 3; k++) W(sphere3(0.013, 6, 4), k === 1 ? orb : head === 2 || head === 0 || head === 4 ? BONE3 : '#c9a35a', { p: [0.035, 0.86 - k * 0.03, 0], mat: k === 1 ? 'glow' : 'lit', shine: 0.6 });
      W(G3.feather(), head >= 5 && head !== 9 ? '#2a2224' : FEATHER3, { p: [0.035, 0.74, 0], r: [0, 0, Math.PI], s: 0.09 });
      shell(sphere3(0.19, 12, 8), { p: [0, 1.07, 0] });
      return;
    }
    case 'rod': {
      // Zepter (seit 8.6, Magier): kurzer Schaft mit Silbermanschette, Käfig je Stufe; in der Mitte schwebt ein
      // gestreckter Oktaeder-Kristall in der Elementfarbe (o.accent), um ihn kreist ein Funke. Kristall und Funke
      // hängen an eigenen Drehknochen (spinBones3), ohne sie stehen sie fest. Kopfformen: Holzgabel, Silberband,
      // Mondsichel-Käfig, Kristallbündel, gekreuzte drehende Ringe, Siegelplatte mit Glutkern, Astrolabium, Goldhalo.
      const acc = o.accent || '#b8c4ff';
      const hi = o.hi || lighter(acc, 0.5);
      const G = o.gemBone != null ? framed(A, M, o.gemBone) : W;
      const S = o.sparkBone != null ? framed(A, M, o.sparkBone) : W;
      const Y = ROD3_GEM_Y;
      const sv = tier === 7 ? GOLD3 : tier === 8 ? '#6e5cc0' : tier === 9 ? ROSEGOLD3 : tier === 0 ? '#a8b0bc' : '#d8e0f0';
      const shaft = ROD3_SHAFT[tier];
      W(limb3(1.15, 0.025, 0.02, 7), shaft, { p: [0, 0.8, 0], shade: 0.2, shine: tier >= 1 ? 0.5 : 0 });
      // Manschette am Griff, Knauf unten, Kelch oben
      W(lathe3('rodcuff', [[0.031, -0.06], [0.036, -0.05], [0.034, 0.1], [0.04, 0.12], [0, 0.121]], 10), sv, { shine: 1 });
      W(sphere3(0.034, 8, 6), sv, { p: [0, -0.36, 0], shine: 1 });
      W(lathe3('rodcup', [[0.02, 0], [0.032, 0.03], [0.05, 0.07], [0.045, 0.08], [0, 0.081]], 10), sv, { p: [0, 0.76, 0], shine: 1 });
      for (const y of tier === 1 || tier === 7 || tier === 9 ? [0.28, 0.45, 0.62] : [0.45]) W(torus3(0.027, 0.008, Math.PI * 2, 3, 10), sv, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      switch (tier) {
        case 0:
          // Holzgabel mit kleinem Kristall
          for (const sx of [-1, 1]) curvedHorn3(W, [[sx * 0.012, 0.8, 0], [sx * 0.05, 0.88, 0], [sx * 0.068, 0.98, 0], [sx * 0.045, 1.09, 0]], 0.016, shaft, { shade: 0.15 });
          break;
        case 1:
          // Silberband: zwei gekreuzte Silberbügel um den Kristall
          for (const ry of [0, Math.PI / 2]) W(torus3(0.085, 0.008, Math.PI * 2, 3, 18), sv, { p: [0, Y, 0], r: [0, ry, 0], shine: 1 });
          W(sphere3(0.018, 6, 4), sv, { p: [0, Y + 0.09, 0], shine: 1 });
          break;
        case 2:
          // Mondsichel-Käfig: zwei Sicheln über Kreuz, offen nach oben
          for (const ry of [0, Math.PI / 2]) crescent3(sub3(W, [0, Y, 0], [0, ry, 0]), [0, 0, 0], 0.095, 0.011, -Math.PI / 2, Math.PI * 1.35, '#e6eef8');
          break;
        case 3:
          // Kristallbündel: drei kleine Kristalle in der Elementfarbe wachsen schräg aus dem Kelch
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 + 0.5;
            coneAlong(W, G3.gem(), [Math.cos(a) * 0.035, 0.85, Math.sin(a) * 0.035], [Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6], 0.07, 0.024, lighter(acc, 0.15), { mat: 'glow' });
          }
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 + 0.5 + Math.PI / 3;
            coneAlong(W, horn3(1, 0.3, 4), [Math.cos(a) * 0.04, 0.83, Math.sin(a) * 0.04], [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35], 0.17, 0.09, sv, { shine: 1 });
          }
          break;
        case 4:
          // zwei gekreuzte Ringe, die sich mit dem Kristall drehen
          G(torus3(0.11, 0.009, Math.PI * 2, 3, 20), '#e0d4ff', { p: [0, Y, 0], r: [0, 0, 0.55], shine: 1 });
          G(torus3(0.11, 0.009, Math.PI * 2, 3, 20), '#e0d4ff', { p: [0, Y, 0], r: [0, Math.PI / 2, -0.55], shine: 1 });
          G(torus3(0.075, 0.006, Math.PI * 2, 3, 16), acc, { p: [0, Y, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
          break;
        case 5: {
          // Sechseck-Siegelplatte aus Obsidian mit Glutrand und Glutkern hinter dem Kristall
          const P = sub3(W, [0, Y, -0.045], [Math.PI / 2, 0, 0]);
          P(cyl3(0.12, 0.12, 0.018, 6), OBSIDIAN3, { shine: 0.6 });
          P(torus3(0.112, 0.008, Math.PI * 2, 3, 6), '#ff7a2a', { r: [Math.PI / 2, 0, Math.PI / 6], p: [0, -0.012, 0], mat: 'glow' });
          W(sphere3(0.04, 8, 6), '#ff7a2a', { p: [0, Y, -0.03], mat: 'glow' });
          for (let k = 0; k < 3; k++) {
            const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
            emberSpike3(W, [Math.cos(a) * 0.11, Y + Math.sin(a) * 0.11, -0.045], [Math.cos(a), Math.sin(a), 0], 0.07, 0.2);
          }
          break;
        }
        case 6:
          // Astrolabium: drei Ringe drehen sich um den Kristall, Sternspitze darüber
          G(torus3(0.105, 0.007, Math.PI * 2, 3, 20), '#e8f0ff', { p: [0, Y, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
          G(torus3(0.105, 0.007, Math.PI * 2, 3, 20), '#c9a35a', { p: [0, Y, 0], shine: 1 });
          G(torus3(0.09, 0.006, Math.PI * 2, 3, 18), '#e8f0ff', { p: [0, Y, 0], r: [0.6, Math.PI / 2, 0], shine: 1 });
          star3(W, [0, Y + 0.15, 0], 0.04, '#e6f6ff');
          break;
        case 8:
          // Abgrund (seit 13.53): zwei Tentakel greifen aus dem Kelch um den Kristall, ein Leerenring in Augenform
          // dreht sich mit ihm, drei Splitter kreisen
          for (const sx of [-1, 1]) tendril3(W, [[sx * 0.02, 0.82, 0], [sx * 0.08, 0.88, 0.01], [sx * 0.11, Y, 0.02], [sx * 0.08, Y + 0.09, 0.02], [sx * 0.03, Y + 0.1, 0.01]], 0.014);
          G(torus3(0.1, 0.008, Math.PI * 2, 3, 22), VOIDVIOLET3, { p: [0, Y, 0], s: [1.35, 0.8, 1], mat: 'glow' });
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2;
            voidShard3(G, [Math.cos(a) * 0.14, Y + (k % 2 ? 0.02 : -0.02), Math.sin(a) * 0.14], [0, 1, 0], 0.03, 0.011);
          }
          break;
        case 9:
          // Ewigkeit (seit 13.53): achtstrahliger Stern hinter dem Kristall, darum kreist ein Ring aus Prismensteinen
          nova3(W, [0, Y, -0.04], 0.17);
          G(torus3(0.12, 0.005, Math.PI * 2, 3, 24), ROSEGLOW3, { p: [0, Y, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2;
            G(G3.gem(), PRISM3[k], { p: [Math.cos(a) * 0.12, Y, Math.sin(a) * 0.12], s: [0.012, 0.018, 0.012], mat: 'glow' });
          }
          break;
        default:
          // Goldhalo hinter dem Kristall mit drei Kristallen und Strahlen
          W(torus3(0.13, 0.012, Math.PI * 2, 3, 24), GOLD3, { p: [0, Y, -0.03], shine: 1 });
          for (let k = 0; k < 3; k++) {
            const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
            W(G3.gem(), acc, { p: [Math.cos(a) * 0.13, Y + Math.sin(a) * 0.13, -0.03], s: [0.02, 0.032, 0.02], mat: 'glow' });
            coneAlong(W, G3.ray(), [Math.cos(a + Math.PI / 3) * 0.13, Y + Math.sin(a + Math.PI / 3) * 0.13, -0.03], [Math.cos(a + Math.PI / 3), Math.sin(a + Math.PI / 3), 0], 0.07, 0.4, '#fff2b0', { shine: 1 });
          }
      }
      // der schwebende Kristall (dreht sich), Facetten oben heller; ab Stufe 3 ein weicher Schein
      const gs = tier === 0 ? 0.052 : tier >= 3 ? 0.068 : 0.06;
      G(G3.gem(), acc, { p: [0, Y, 0], s: [gs, gs * 1.6, gs], mat: 'glow', top: lighter(acc, 0.5), topK: 0.6 });
      if (tier >= 3) G(sphere3(1, 10, 8), acc, { p: [0, Y, 0], s: gs * 2.1, mat: 'aura' });
      S(sphere3(0.016, 6, 4), hi, { p: [ROD3_SPARK_R, Y, 0], mat: 'glow' });
      shell(sphere3(0.17, 12, 8), { p: [0, Y, 0] });
      return;
    }
    case 'scythe': {
      // Sense: Sichelklinge am langen Schaft; Rost, Knochen, Seelenglanz, Doppelklinge, Obsidian, Sterne, Gold
      const bladeCol = tier === 0 ? '#9a6a4a' : tier === 2 ? BONE3 : tier === 5 ? OBSIDIAN3 : tier === 7 ? GOLD3 : tier === 8 ? VOIDMETAL3 : tier === 9 ? PLATIN3 : metal;
      W(limb3(1.5, 0.03, 0.026, 7), tier === 7 ? '#6a4a1a' : tier === 8 ? '#1a1228' : tier === 9 ? '#e8e0ea' : '#4a3527', { p: [0, 1.0, 0], shine: tier >= 8 ? 0.6 : 0 });
      // seit 13.29 eigene Klingenform je Stufe (SCYTHE_BLADES, wie das Inventarsymbol)
      const SB = SCYTHE_BLADES[tier];
      const sGeo = (side, sc) => geo3('scythe4_' + tier + ':' + side + ':' + sc, () => {
        const pts = scythePts(tier, side, sc);
        const sh = new THREE.Shape();
        sh.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
        sh.lineTo(pts[0][0], pts[0][1]);
        return smoothGeo(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -0.01));
      });
      // seit 13.30 mit heller Schneide, dunkler Mitte und Leuchtader (wie Äxte)
      detailBlade3(W, 'scythe5_' + tier, scythePts(tier, -1, 1), null, 0.02, bladeCol, tier, { p: [0, 0.98, 0], inset: 0.02 });
      if (SB.twin) detailBlade3(W, 'scythe5t_' + tier, scythePts(tier, 1, SB.twin), null, 0.02, bladeCol, tier, { p: [0, 0.98, 0], inset: 0.016 });
      // Klingenkragen mit Nieten
      W(roundBox(0.06, 0.14, 0.08, 0.02), darker(bladeCol, 0.25), { p: [-0.04, 0.98, 0], shine: 0.7 });
      for (const sz of [-1, 1]) W(sphere3(0.011, 6, 4), lighter(bladeCol, 0.3), { p: [-0.05, 0.98, sz * 0.042], shine: 1 });
      W(roundBox(0.1, 0.09, 0.07, 0.025), accent, { p: [0, 0.98, 0] });
      const ringCol = tier === 2 ? BONE3 : tier === 7 ? GOLD3 : tier === 8 ? VOIDMETAL3 : tier === 9 ? ROSEGOLD3 : accent;
      for (const y of tier === 2 ? [0.15, 0.3, 0.45, 0.6] : [0.2, 0.5]) W(torus3(0.034, tier === 2 ? 0.014 : 0.01, Math.PI * 2, 4, 10), ringCol, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
      // Punkte entlang der Klinge (Schneide)
      const along = (u) => [-SB.len * u, 0.98 + SB.curve * SB.len * Math.sin(Math.PI * u * 0.9) - SB.hook * Math.pow(u, 4), 0.016];
      switch (tier) {
        case 1: W(torus3(0.05, 0.01, Math.PI * 2, 4, 12), metal, { p: [0, 0.98, 0.04], shine: 1 }); break;
        case 3: for (let k = 0; k < 4; k++) W(sphere3(0.014, 6, 4), GLOW3[3], { p: along(0.2 + k * 0.2), mat: 'glow' }); break;
        case 4:
          skull3(W, [0, 1.02, 0.045], 0.045, GLOW3[4]);
          break;
        case 5:
          for (let k = 0; k < 3; k++) W(sphere3(0.012, 6, 4), '#ff7a2a', { p: along(0.25 + k * 0.22), mat: 'glow' });
          break;
        case 6: for (let k = 0; k < 3; k++) star3(W, along(0.25 + k * 0.22), 0.022, '#e6f6ff'); break;
        case 7: sun3(W, [0, 0.98, 0.045], 0.06, 10, GOLD3, GLOW3[7]); break;
        case 8:
          // Leerenauge am Klingenkragen, Splitter an den Zähnen, Tentakel um den Schaft
          voidEye3(W, [0, 1.0, 0.05], 0.05);
          for (let k = 0; k < 3; k++) voidShard3(W, along(0.28 + k * 0.22), [0, -1, 0.3], 0.035, 0.012);
          tendril3(W, [[0.03, 0.9, 0], [0.07, 0.82, 0.03], [0.04, 0.72, 0.06], [-0.01, 0.68, 0.04]], 0.016);
          break;
        case 9:
          nova3(W, [0, 0.98, 0.05], 0.075);
          for (let k = 0; k < 3; k++) star3(W, along(0.25 + k * 0.24), 0.024, k % 2 ? ROSEGLOW3 : '#fff4fa');
          break;
        default:
      }
      shell(roundBox(0.8, 0.22, 0.08, 0.04), { p: [-0.35, 0.98, 0] });
      return;
    }
    case 'axe':
    case 'greataxe': {
      // Äxte: Schaft mit Wicklung, Bartklinge (Streitaxt: doppelt), Dorn hinten, Spitze oben; je Stufe eigenes Merkmal
      const big = kind === 'greataxe';
      const shaft = big ? 1.25 : 0.78;
      const wood = tier === 9 ? '#e8e0ea' : tier === 8 ? '#1a1228' : tier >= 5 ? '#2a2024' : tier >= 3 ? accent : '#5a3f2a';
      const bladeCol = tier === 5 ? OBSIDIAN3 : tier === 7 ? GOLD3 : tier === 8 ? VOIDMETAL3 : tier === 9 ? PLATIN3 : metal;
      W(limb3(shaft, 0.032, 0.028, 7), wood, { p: [0, shaft * 0.78, 0], shade: 0.2 });
      for (let k = 0; k < 3; k++) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), darker(accent, 0.25), { p: [0, 0.02 - k * 0.07, 0], r: [Math.PI / 2, 0, 0] });
      W(sphere3(0.04, 8, 6), gem || darker(metal, 0.2), { p: [0, -shaft * 0.22 - 0.02, 0], mat: gem ? 'glow' : 'lit', shine: 1 });
      const headY = shaft * 0.66;
      // seit 13.29 je Stufe ein eigener Klingenumriss (AXE_HEADS / GREATAXE_HEADS, wie das Inventarsymbol);
      // seit 13.30 mit Löchern, heller Schneide, dunkler Mitte, Leuchtader, Nieten und eigenem Rücken
      const HD = big ? GREATAXE_HEADS[tier] : AXE_HEADS[tier];
      const s = big ? 1.2 : 1;
      const depth = HD.hammer ? 0.19 : 0.03;
      const sides = big && !HD.single ? [1, -1] : [1];
      for (const sx of sides) {
        // zweite Klinge gedreht statt gespiegelt (gespiegelte Flächen wären innen nach außen)
        const k = s * (sx < 0 ? HD.back || 1 : 1);
        const o = { p: [sx * 0.03, headY, 0], s: [k, k, 1], r: [0, sx > 0 ? 0 : Math.PI, 0] };
        if (HD.hammer) W(plateGeo3('gaxe' + tier, HD.pts, null, depth, 0.02), bladeCol, Object.assign({ shine: 1, top: lighter(bladeCol, 0.35), topK: 0.3 }, o));
        else detailBlade3(W, (big ? 'gaxe' : 'axe') + tier, HD.pts, HD.holes, depth, bladeCol, tier, o);
        // Drache: Schuppen auf dem Blatt; Seele/Gott: Kugel im Fenster
        if (tier === 3) for (let j = 0; j < 2; j++) W(G3.scale(), lighter(accent, 0.1), { p: [sx * (0.03 + (0.24 + j * 0.06) * k), headY + 0.12 * k, 0.026], r: [Math.PI / 2, 0, sx * 1.2], s: 0.03 * k, shine: 0.6 });
        if (HD.holes && (tier === 3 || tier === 4 || tier >= 7)) {
          const [hx, hy] = HD.holes[0].reduce((a, q) => [a[0] + q[0] / HD.holes[0].length, a[1] + q[1] / HD.holes[0].length], [0, 0]);
          const hp = [sx * (0.03 + hx * k), headY + hy * k, 0];
          // Abgrund (seit 13.53): ein Leerenauge sieht durch das Fenster (auf beiden Seiten), Ewigkeit: Prismenstein
          if (tier === 8) for (const ry of [0, Math.PI]) voidEye3(sub3(W, hp, [0, ry, 0]), [0, 0, 0.004], 0.03 * k);
          else if (tier === 9) W(G3.gem(), PRISM3[sx > 0 ? 0 : 3], { p: hp, s: [0.022 * k, 0.03 * k, 0.022 * k], mat: 'glow' });
          else W(sphere3(tier === 3 ? 0.022 : 0.03, 10, 8), tier === 3 ? GLOW3[3] : tier === 4 ? GLOW3[4] : GLOW3[7], { p: hp, s: tier === 3 ? [1, 0.6, 0.6] : [1, 1, 1], mat: 'glow' });
        }
        // Götterhammer: goldene Schlagflächen
        if (HD.hammer) W(roundBox(0.03, 0.36 * k, 0.24, 0.012), GLOW3[7], { p: [sx * (0.03 + 0.255 * k), headY, 0], mat: 'glow' });
      }
      // Rücken der Einhandaxt
      const back = !big ? HD.back : HD.single ? 'poll' : null;
      if (back === 'poll') {
        W(roundBox(0.1, 0.12, 0.08, 0.02), darker(bladeCol, 0.15), { p: [-0.08, headY, 0], shine: 0.8 });
        W(roundBox(0.02, 0.135, 0.095, 0.008), lighter(bladeCol, 0.2), { p: [-0.135, headY, 0], shine: 1 });
      } else if (back === 'spike') W(horn3(0.15, 0.032, 6), bladeCol, { p: [-0.03, headY, 0], r: [0, 0, Math.PI / 2], shine: 1 });
      else if (back === 'hook') {
        coneAlong(W, horn3(1, 0.3, 6), [-0.035, headY + 0.02, 0], [-1, 0.25, 0], 0.17, 0.2, bladeCol, { shine: 1 });
        coneAlong(W, horn3(1, 0.3, 6), [-0.16, headY + 0.05, 0], [-0.3, -1, 0], 0.09, 0.18, bladeCol, { shine: 1 });
      } else if (back === 'spikes') for (const [dy, l] of [[-0.06, 0.1], [0, 0.15], [0.06, 0.1]]) coneAlong(W, G3.spike(), [-0.03, headY + dy, 0], [-1, dy * 4, 0], l, 0.2, tier === 5 ? OBSIDIAN3 : bladeCol, { shine: 0.8 });
      else if (back === 'blade') detailBlade3(W, 'axeback' + tier, HD.pts, HD.holes, 0.03, bladeCol, tier, { p: [-0.03, headY, 0], s: [0.5, 0.5, 1], r: [0, Math.PI, 0] });
      // seit 13.53: eingerollter Tentakelhaken (Abgrund) bzw. achtstrahliger Stern (Ewigkeit) als Rücken
      else if (back === 'tendril') tendril3(W, [[-0.03, headY + 0.02, 0], [-0.12, headY + 0.03, 0], [-0.2, headY - 0.03, 0], [-0.19, headY - 0.12, 0], [-0.13, headY - 0.1, 0]], 0.03);
      else if (back === 'star') nova3(W, [-0.1, headY, 0], 0.08);
      // Tülle: Ringe oben und unten, Nieten auf beiden Seiten
      W(roundBox(0.08, 0.17 * s, 0.075, 0.025), darker(bladeCol, 0.3), { p: [0, headY, 0], shine: 0.6 });
      const ringC = tier === 7 ? GOLD3 : tier === 8 ? VOIDGLOW3 : tier === 9 ? ROSEGOLD3 : tier >= 3 ? accent : '#4a3a2e';
      for (const dy of [-1, 1]) W(torus3(0.042, 0.011, Math.PI * 2, 4, 12), ringC, { p: [0, headY + dy * 0.095 * s, 0], r: [Math.PI / 2, 0, 0], shine: 0.8, mat: tier === 8 ? 'glow' : undefined });
      for (const dy of [-0.045, 0.045]) for (const sz of [-1, 1]) W(sphere3(0.012, 6, 4), tier === 7 ? GOLD3 : tier === 9 ? ROSEGOLD3 : lighter(bladeCol, 0.3), { p: [0, headY + dy * s, sz * 0.042], shine: 1 });
      if (big || tier >= 3) W(horn3(big ? 0.2 : 0.12, 0.03, 6), bladeCol, { p: [0, headY + 0.1 * s, 0], shine: 1 });
      if (tier === 4) floatGem3(W, [0, headY + 0.34 * s, 0], 0.03, GLOW3[4]);
      else if (tier === 6) for (const sx of [-1, 1]) wing3(W, [sx * 0.03, headY + 0.06 * s, -0.02], sx, 3, 0.16 * s, FEATHER3, '#bfe8ff', {}, 0);
      else if (tier === 7 && HD.hammer) sun3(W, [0, headY, 0.11], 0.07 * s, 10, GOLD3, GLOW3[7]);
      else if (tier === 8) for (let j = -1; j <= 1; j++) voidShard3(W, [j * 0.07, headY + (0.3 - Math.abs(j) * 0.06) * s, 0], [j * 0.35, 1, 0], 0.05 * s, 0.017 * s);
      else if (tier === 9) nova3(W, [0, headY + 0.28 * s, 0], 0.07 * s);
      // Griff: Lederriemen über Kreuz am Schaft
      for (let j = 0; j < 4; j++) W(roundBox(0.075, 0.018, 0.075, 0.008), j % 2 ? '#3a2618' : '#5a3a22', { p: [0, -0.02 - j * 0.05, 0], r: [0, j * 0.6, j % 2 ? 0.3 : -0.3] });
      shell(roundBox(big ? 0.75 : 0.42, 0.5 * s, 0.09, 0.045), { p: [big ? 0 : 0.14, headY, 0] });
      return;
    }
    case 'club': {
      W(lathe3('club2', [[0, -0.12], [0.04, -0.1], [0.05, 0.2], [0.11, 0.45], [0.12, 0.55], [0.06, 0.62], [0, 0.63]], 10), '#6b4a2e', { shade: 0.2 });
      for (const [x, y, z] of [[0.1, 0.45, 0], [-0.08, 0.5, 0.06], [0.02, 0.4, -0.1], [-0.05, 0.36, -0.06]]) W(horn3(0.07, 0.025, 6), '#d9dde2', { p: [x, y, z], r: [z * 8, 0, -x * 12], shine: 1 });
      return;
    }
    default:
  }
}

// --- Schild (Krieger): Fläche schaut entlang +y nach außen, „oben“ ist +x --------------------------
// Wappen und Reliefs liegen in einem Rahmen, dessen x quer, y nach oben und z nach außen zeigt.
const SHIELD_FACE3 = new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);

function shield3(A, tier, bone, at) {
  tier = Math.max(0, Math.min(ITEM_TIERS.length - 1, tier || 0));
  const W = framed(A, partFrame(at, [0, 0, Math.PI / 2]), bone);
  // Wappenrahmen auf der Schildfläche in Höhe y (über dem Mittelpunkt)
  const E = (lift, rot = [0, 0, 0]) => {
    const M = SHIELD_FACE3.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 0, lift), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    return (geo, color, o = {}) => W(geo, color, Object.assign({}, o, { m: M.clone().multiply(partMatrix(o)) }));
  };
  const metal = TIER_METAL[tier];
  const acc = TIER_ACCENT[tier];
  const face = (col, o = {}) => W(lathe3('shield2', [[0, -0.045], [0.25, -0.04], [0.27, -0.015], [0.26, 0.02], [0.19, 0.045], [0, 0.055]], 22), col, Object.assign({ top: lighter(col, 0.2), topK: 0.3 }, o));
  const rim = (col, o = {}) => W(torus3(0.26, 0.024, Math.PI * 2, 5, 24), col, Object.assign({ r: [Math.PI / 2, 0, 0], shine: 1 }, o));
  const boss = (col, o = {}) => W(ball(12), col, Object.assign({ p: [0, 0.05, 0], s: [0.075, 0.045, 0.075], shine: 1 }, o));
  // Kranz von Zacken um den Rand (in der Schildebene)
  const rimSpikes = (n, len, col, o = {}) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      coneAlong(W, G3.spike(), [Math.cos(a) * 0.255, 0, Math.sin(a) * 0.255], [Math.cos(a), 0.15, Math.sin(a)], len * (k % 2 ? 0.7 : 1), 0.2, col, o);
    }
  };
  switch (tier) {
    case 0: {
      // Holzschild aus vier Brettern, zwei Eisenbänder, Eisenbuckel
      const xs = [-0.18, -0.06, 0.06, 0.18];
      xs.forEach((x, i) => W(roundBox(0.115, 0.06, 2 * Math.sqrt(0.26 * 0.26 - x * x) * 0.98, 0.02), i % 2 ? '#8a6038' : '#9a6c40', { p: [x, 0, 0], shade: 0.1 }));
      for (const z of [-0.1, 0.1]) W(roundBox(0.48, 0.07, 0.03, 0.012), '#7a7f86', { p: [0, 0.008, z], shine: 0.6 });
      boss('#8a8f96');
      break;
    }
    case 1:
      // Bronzeschild mit zwei Ringen und spitzem Buckel
      face(metal, { shine: 0.8 });
      rim(darker(metal, 0.15));
      W(torus3(0.185, 0.012, Math.PI * 2, 4, 22), lighter(metal, 0.15), { p: [0, 0.045, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      W(torus3(0.11, 0.012, Math.PI * 2, 4, 18), lighter(metal, 0.15), { p: [0, 0.054, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      boss(metal);
      W(horn3(0.07, 0.03, 6), metal, { p: [0, 0.08, 0], shine: 1 });
      break;
    case 2: {
      // Eisenschild in Mandelform mit silberner Mondsichel
      W(geo3('g3kite', () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0.33);
        s.quadraticCurveTo(0.24, 0.32, 0.22, 0.06);
        s.quadraticCurveTo(0.18, -0.2, 0, -0.4);
        s.quadraticCurveTo(-0.18, -0.2, -0.22, 0.06);
        s.quadraticCurveTo(-0.24, 0.32, 0, 0.33);
        const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2, curveSegments: 6 });
        g.translate(0, 0, -0.02);
        g.applyMatrix4(SHIELD_FACE3);
        return smoothGeo(g);
      }), acc, { top: lighter(acc, 0.25), topK: 0.35, shine: 0.3 });
      const F = E(0.04);
      crescent3(F, [0, 0.06, 0], 0.09, 0.022, -Math.PI * 0.75, Math.PI * 1.25, '#e6eef8');
      F(sphere3(0.02, 6, 4), GLOW3[2], { p: [0.04, 0.1, 0], mat: 'glow' });
      F(roundBox(0.025, 0.5, 0.02, 0.01), metal, { p: [0, -0.04, -0.01], shine: 1 });
      break;
    }
    case 3: {
      // Drachenschild: Drachenkopf-Relief, Dornen am Rand
      face(acc);
      rim(darker(acc, 0.2));
      rimSpikes(10, 0.08, '#e8dcc0');
      const F = E(0.05);
      F(ball(10), darker(acc, 0.1), { p: [0, 0.02, 0], s: [0.09, 0.075, 0.05], shine: 0.6 });
      F(ball(8), darker(acc, 0.1), { p: [0, -0.06, 0.025], s: [0.06, 0.045, 0.045], shine: 0.6 });
      for (const sx of [-1, 1]) {
        curvedHorn3(F, [[sx * 0.05, 0.07, 0], [sx * 0.11, 0.13, -0.01], [sx * 0.13, 0.2, -0.01]], 0.02, '#e8dcc0');
        F(sphere3(0.015, 6, 4), GLOW3[3], { p: [sx * 0.04, 0.025, 0.045], mat: 'glow' });
        coneAlong(F, horn3(1, 0.3, 4), [sx * 0.025, -0.085, 0.05], [0, -1, 0.3], 0.04, 0.05, '#f4ecd8');
      }
      break;
    }
    case 4: {
      // Seelenschild: schwebender Runenkreis vor der Fläche
      face(acc);
      rim(metal);
      boss(metal);
      W(torus3(0.2, 0.01, Math.PI * 2, 3, 28), GLOW3[4], { p: [0, 0.11, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
      W(torus3(0.13, 0.008, Math.PI * 2, 3, 22), GLOW3[4], { p: [0, 0.11, 0], r: [Math.PI / 2, 0, 0.3], mat: 'glow' });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        W(roundBox(0.012, 0.012, 0.045, 0.005), lighter(GLOW3[4], 0.3), { p: [Math.cos(a) * 0.165, 0.11, Math.sin(a) * 0.165], r: [0, -a, 0], mat: 'glow' });
      }
      W(sphere3(0.03, 8, 6), STAFF_ORB[4], { p: [0, 0.11, 0], mat: 'glow' });
      break;
    }
    case 5: {
      // Aschenschild: schwarz, gezackter Rand, Glutrisse
      face(OBSIDIAN3, { shine: 0.4 });
      rim('#1a1416');
      rimSpikes(12, 0.1, OBSIDIAN3, { shine: 0.5 });
      const F = E(0.045);
      for (const [x, y, r, l] of [[-0.06, 0.08, 0.5, 0.14], [0.07, -0.05, -0.6, 0.16], [0.02, 0.12, -0.2, 0.08], [-0.08, -0.1, 0.3, 0.1]]) F(roundBox(0.014, l, 0.012, 0.005), '#ff7a2a', { p: [x, y, -0.008], r: [0, 0, r], mat: 'glow' });
      boss('#ff7a2a', { mat: 'glow', s: [0.04, 0.03, 0.04] });
      break;
    }
    case 6: {
      // Himmelsschild: Flügel an den Seiten
      face(acc);
      rim(metal);
      boss(metal);
      const F = E(0.02);
      for (const sx of [-1, 1]) wing3(F, [sx * 0.2, 0.04, 0], sx, 4, 0.26, FEATHER3, '#bfe8ff', {}, 0.1);
      F(G3.gem(), GLOW3[6], { p: [0, 0, 0.05], s: [0.03, 0.045, 0.02], mat: 'glow' });
      break;
    }
    case 8: {
      // Abgrundschild (seit 13.53): Leerenobsidian, Tentakel rollen sich um den Rand, cyanfarbene Risse laufen zu
      // einem großen Leerenauge in der Mitte
      face(VOID3, { shine: 0.6 });
      rim(VOIDMETAL3);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        const P = (r, y, da = 0) => [Math.cos(a + da) * r, y, Math.sin(a + da) * r];
        tendril3(W, [P(0.25, 0.01), P(0.31, 0.02, 0.05), P(0.36, 0.04, 0.25), P(0.33, 0.06, 0.45), P(0.29, 0.06, 0.42)], 0.024);
      }
      const F = E(0.05);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        F(roundBox(0.01, 0.1, 0.008, 0.004), VOIDGLOW3, { p: [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0], r: [0, 0, a - Math.PI / 2 + (k % 2 ? 0.25 : -0.25)], mat: 'glow' });
      }
      voidEye3(E(0.06), [0, 0, 0], 0.085);
      break;
    }
    case 9: {
      // Ewigkeitsschild (seit 13.53): achtzackiger Sternschild aus Platin, Roségoldring, achtstrahliger Stern in der
      // Mitte, Prismensteine an den langen Zacken
      const F = E(0);
      F(geo3('g3starshield', () => {
        const pts = [];
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + Math.PI / 2;
          const r = k % 4 === 0 ? 0.36 : k % 2 ? 0.235 : 0.3;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return plateGeo3('g3starshieldp', pts, null, 0.04, 0.014);
      }), PLATIN3, { shine: 1, top: '#ffffff', topK: 0.35 });
      face(PLATIN3, { s: [0.82, 1, 0.82], shine: 1 });
      W(torus3(0.2, 0.016, Math.PI * 2, 4, 24), ROSEGOLD3, { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      nova3(E(0.065), [0, 0, 0], 0.13);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 2;
        F(G3.gem(), PRISM3[k], { p: [Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0.03], s: [0.02, 0.03, 0.016], mat: 'glow' });
      }
      break;
    }
    default: {
      // Götterschild: Sonnenschild mit Strahlen über den Rand hinaus
      face(GOLD3, { shine: 1 });
      rim('#fff2b0');
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        coneAlong(W, G3.ray(), [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [Math.cos(a), 0.1, Math.sin(a)], k % 2 ? 0.08 : 0.13, 0.5, '#ffd34d', { shine: 1 });
      }
      sun3(E(0.055), [0, 0, 0], 0.1, 10, '#ffd34d', GLOW3[7]);
    }
  }
}
