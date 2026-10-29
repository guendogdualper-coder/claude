// Ausrüstung in 3D (seit Version 7.9): Jedes Teil hat je Stufe ein eigenes Merkmal, das die Silhouette
// verändert – nicht nur eine andere Farbe (Bauplan: docs/grafik-prompts.md, Abschnitt 4).
// Stufen: 0 Grund (Leder), 1 Solide (Bronze), 2 Gut (Mond), 3 Selten (Drache), 4 Legendär (Seele),
// 5 Mythisch (Asche), 6 Himmlisch (Federn, Sterne), 7 Göttlich (Gold, Sonne).
//
// humanoid3 baut den Körper und ruft danach c.gear(A, g) auf; g enthält die Maße der Figur
// (Hüfte, Brust, Schultern, Hals, Kopf). Hier entstehen Schultern, Stiefel, Gürtel, Umhang, Rüstung,
// Kopfbedeckung, Schild und Waffen. Kleinteile haben wenige Segmente (Leistungsregeln, Abschnitt 7).

// Leuchtfarbe je Stufe (ab Mond)
const GLOW3 = [null, null, '#9be2ff', '#ff4a3a', '#c08aff', '#ff7a2a', '#bff4ff', '#fff2b0'];
// Grundtöne der Motive
const GOLD3 = '#e8c46a';
const OBSIDIAN3 = '#2a2224';
const BONE3 = '#e8e0cc';
const FEATHER3 = '#f4f8ff';

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

// Flamme: äußere Zunge und heller Kern
function flame3(W, at, dir, len, w, outer, inner, o = {}) {
  coneAlong(W, horn3(1, 0.3, 6), at, dir, len, w, outer, Object.assign({}, o, { mat: 'glow' }));
  coneAlong(W, horn3(1, 0.3, 6), at, dir, len * 0.6, w * 0.5, inner, Object.assign({}, o, { mat: 'glow' }));
}

// --- Schultern -----------------------------------------------------------------------------------
// Grundform je Klasse baut humanoid3 (Platte, Lederkappe, Stoffmantel, Schädel); hier sitzt das Merkmal der Stufe darauf.

const PAD3_R = { krieger: 0.16, ninja: 0.1, schamane: 0.13, nekromant: 0.1 };

function gearShoulders3(A, g, t, cls) {
  if (t < 0) return;
  const R = PAD3_R[cls] || 0.12;
  const metal = TIER_METAL[t];
  for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) {
    const pp = [sx * g.shX * 1.04, g.shY + 0.03 + (cls === 'nekromant' ? 0.02 : 0), 0];
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
  { len: 0.86, r2: 0.4, edge: 'plain' }
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
    default:
  }
  if (t >= 2 && t !== 4 && t !== 7) W(torus3(0.012, 0.006, Math.PI * 2, 3, 8), metal, { p: [0, 0.01, 0.15], shine: 1 });
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
const NINJA_EYES3 = { 4: GLOW3[4], 5: '#ff9a4a', 6: '#9fe8ff', 7: '#ffd34d' };

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
    if (s !== 7) W(horn3(0.95, 0.62, 12), hood, { p: [0, 0.62, -0.25], r: [-0.45, 0, 0] });
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
      default:
        // Götterschädel: goldene Schädelkappe mit Lichtaugen und ein Heiligenschein
        skullCap(GOLD3, '#ffe9a0');
        W(torus3(0.78, 0.055, Math.PI * 2, 4, 26), '#fff2b0', { p: [0, 1.35, -0.4], r: [Math.PI / 2 - 0.5, 0, 0], mat: 'glow' });
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
  F(roundBox(0.035, 0.2, 0.025, 0.012), col, { shine: col === GOLD3 ? 1 : 0.2 });
  for (let k = 0; k < 4; k++) {
    const y = g.chestY + 0.1 - k * 0.055;
    const [rx, rz] = torsoAt3(g, y);
    for (const sx of [-1, 1]) {
      const a0 = sx > 0 ? -1.35 : 0.14;
      arcAt3(W, y - Math.abs(k) * 0.004, rx + 0.014, rz + 0.014, 0.013, a0, a0 + 1.21, col, { shine: col === GOLD3 ? 1 : 0.2 });
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
  } else if (cls === 'ninja') {
    if (t === 0) { c.straps = null; c.kunai = null; c.holster = null; }
    if (t === 1) c.chestPlate = '#5a4030';
    if (t === 3) c.crossStraps = false;
    if (t === 7) c.collar = GOLD3;
  } else if (cls === 'schamane') {
    if (t === 0) c.hemTrim = darker(c.robe, 0.25);
    if (t === 1) c.robeShine = 0.45;
    if (t >= 3) c.hemTrim = t === 5 ? '#ff9a4a' : t === 6 ? '#e6f2ff' : GOLD3;
  } else {
    if (t >= 2) c.runes = null;
    if (t === 7) c.hemTrim = GOLD3;
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
    }
  ]
};

function gearArmor3(A, g, t, cls, c) {
  if (t < 0 || g.belly || !ARMOR3[cls]) return;
  const W = frame3(A, BH.chest, [0, 0, 0]);
  const Wh = frame3(A, BH.hips, [0, 0, 0]);
  ARMOR3[cls][t](W, g, c, Wh);
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
  jagged: [[1.0, 0.1], [1.4, 0.18], [0.95, 0.28], [1.38, 0.38], [0.92, 0.48], [1.3, 0.58], [0.85, 0.68], [1.15, 0.77], [0.7, 0.86]]
};
const BLADE_OF3 = ['plain', 'leaf', 'plain', 'plain', 'plain', 'jagged', 'slim', 'broad'];

// Fächerblatt (Kreisausschnitt nach oben)
const fanLeafGeo = (r, h) => geo3(`fanleaf3${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 18, 1, false, Math.PI * 0.56, Math.PI * 0.88).rotateX(Math.PI / 2));

// --- Waffen (Griff im Ursprung, Klinge entlang +y) -----------------------------------------------
// Jede Art behält ihre Grundform; die Stufe ändert Klinge, Parierstange, Knauf bzw. Kopfstück
// (Bauplan: docs/grafik-prompts.md, Abschnitt 4.11).

function weapon3(A, kind, tier, bone, at, rot, wg) {
  tier = Math.max(0, Math.min(7, tier || 0));
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const M = partFrame(at, rot);
  const W = framed(A, M, bone);
  const shell = (geo, o) => wg && A(geo, '#ffffff', { bone, mat: 'wglow', m: M.clone().multiply(partMatrix(o)) });
  const gold = '#c9a35a';
  const gem = tier >= 4 ? STAFF_ORB[tier] : null;
  const iron = '#8a8f96';
  switch (kind) {
    case 'sword':
    case 'greatsword':
    case 'dagger': {
      const big = kind === 'greatsword';
      const dag = kind === 'dagger';
      const len = big ? 1.0 : dag ? 0.34 : 0.68;
      const wd = big ? 0.17 : dag ? 0.075 : 0.11;
      const grip = big ? 0.26 : 0.16;
      const bladeCol = tier === 5 ? OBSIDIAN3 : tier === 7 ? '#ffe9a0' : metal;
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
        default:
          W(roundBox(gw, 0.035, 0.05, 0.015), GOLD3, { p: [0, gy, 0], shine: 1 });
          sun3(W, [0, gy + 0.01, 0.01], gw * 0.22, 10, GOLD3, GLOW3[7]);
      }
      // Klinge
      const by = 0.08;
      const shape = BLADE_OF3[tier];
      const bw = wd * (tier === 6 ? 0.75 : tier === 7 ? 1.15 : 1);
      const bl = len * (tier === 6 ? 1.06 : 1);
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
        default:
      }
      shell(roundBox(bw * 1.9, bl * 1.12, 0.09, 0.045), { p: [0, by + bl / 2, 0] });
      return;
    }
    case 'bow': {
      // Bogen: zwei Wurfarme als Bögen, Sehne von Spitze zu Spitze; Spitzen und Griff je Stufe
      const wood = tier === 0 ? '#8a5a34' : tier === 5 ? OBSIDIAN3 : tier === 7 ? GOLD3 : accent;
      const tips = [];
      for (const sy of [-1, 1]) {
        W(torus3(0.44, 0.024, Math.PI * 0.38, 5, 10), wood, { r: [0, 0, sy > 0 ? 0.32 : -Math.PI * 0.38 - 0.32], p: [-0.4, 0, 0], shine: tier === 7 ? 1 : 0 });
        tips.push([-0.373, sy * 0.44, 0, sy]);
      }
      for (const [x, y, z, sy] of tips) {
        if (tier === 3) {
          // Drachenköpfe an den Spitzen
          W(ball(8), accent, { p: [x - 0.02, y, z], s: [0.04, 0.032, 0.03], shine: 0.5 });
          coneAlong(W, horn3(1, 0.3, 4), [x - 0.04, y, z], [-1, sy * 0.3, 0], 0.06, 0.15, accent);
          coneAlong(W, horn3(1, 0.3, 4), [x, y + sy * 0.02, z], [0.3, sy, 0], 0.06, 0.12, '#e8dcc0');
          W(sphere3(0.008, 6, 4), GLOW3[3], { p: [x - 0.035, y + sy * 0.012, z + 0.022], mat: 'glow' });
        } else if (tier === 2) {
          crescent3(W, [x - 0.02, y + sy * 0.03, z], 0.05, 0.012, sy > 0 ? Math.PI * 0.75 : -Math.PI * 0.75, Math.PI, '#e6eef8');
        } else if (tier === 6) {
          W(G3.feather(), FEATHER3, { p: [x, y, z], r: [0, 0, sy > 0 ? 1.3 : Math.PI - 1.3], s: 0.12, top: '#bfe8ff', topK: 0.5 });
        } else {
          coneAlong(W, horn3(1, 0.3, 5), [x, y, z], [-1, sy * 0.4, 0], 0.09, 0.22, tier >= 4 ? lighter(metal, 0.1) : metal, { shine: 1 });
        }
      }
      W(limb3(0.88, 0.005, 0.005, 3), '#efe6cc', { p: [-0.373, 0.44, 0] });
      W(limb3(0.18, 0.032, 0.032, 7), tier === 1 ? '#5a3a22' : '#3a2a1c', { p: [0, 0.09, 0] });
      for (let k = 0; k < 3; k++) W(torus3(0.034, 0.008, Math.PI * 2, 4, 10), tier === 0 ? '#5a3a22' : gold, { p: [0, 0.07 - k * 0.06, 0], r: [Math.PI / 2, 0, 0] });
      if (tier === 5) {
        // gezackte Dornen außen an den Armen, Glut im Griff
        for (const sy of [-1, 1]) for (let k = 0; k < 3; k++) {
          const a = sy * (0.55 + k * 0.32);
          coneAlong(W, G3.spike(), [-0.4 + Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0], [Math.cos(a), Math.sin(a), 0], 0.06, 0.16, OBSIDIAN3);
        }
        W(sphere3(0.025, 8, 6), '#ff7a2a', { p: [0.03, 0, 0], mat: 'glow' });
      }
      if (tier === 6) for (const sy of [-1, 1]) W(G3.feather(), '#dfefff', { p: [0.02, sy * 0.2, 0], r: [0, 0, sy > 0 ? -0.5 : Math.PI + 0.5], s: 0.14, top: '#bfe8ff', topK: 0.5 });
      if (tier === 4) floatGem3(W, [0.06, 0, 0], 0.025, GLOW3[4]);
      if (tier === 7) sun3(sub3(W, [0.035, 0, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.05, 8, GOLD3, GLOW3[7]);
      shell(torus3(0.44, 0.06, Math.PI * 0.76, 5, 12), { r: [0, 0, -Math.PI * 0.38], p: [-0.4, 0, 0] });
      return;
    }
    case 'fan': {
      // Fächer: Blatt nach oben, Rippen, Goldrand; Kranich aus Federn, Phönix mit Flammenspitzen …
      const leaf = tier === 0 ? '#efe6cc' : FAN_LEAF[tier];
      if (tier === 2) {
        for (let k = -3; k <= 3; k++) W(G3.feather(), k % 2 ? FEATHER3 : '#e8eef4', { p: [0, 0.04, 0.004 * k], r: [0, 0, k * 0.22], s: 0.38, top: '#2a2a30', topK: 0.3 });
      } else {
        W(fanLeafGeo(0.36, 0.018), leaf, { p: [0, 0.04, 0], top: lighter(leaf, 0.25), topK: 0.3, shine: tier === 1 ? 0.5 : tier === 7 ? 1 : 0 });
        W(torus3(0.35, 0.012, Math.PI * 0.88, 4, 18), tier === 5 ? '#ff7a2a' : gold, { p: [0, 0.04, 0.012], r: [0, 0, Math.PI * 0.06], shine: 1, mat: tier === 5 ? 'glow' : 'lit' });
      }
      for (let k = -3; k <= 3; k++) W(limb3(0.36, 0.007, 0.006, 3), tier === 7 ? GOLD3 : '#3a2a1c', { p: [0, 0.04, 0.014], r: [0, 0, Math.PI + k * 0.2] });
      const edge = (k, r = 0.37) => {
        const a = Math.PI / 2 + k * 0.2;
        return [Math.cos(a) * r, 0.04 + Math.sin(a) * r, 0.01];
      };
      if (tier === 3) for (let k = -3; k <= 3; k++) flame3(W, edge(k, 0.36), [Math.cos(Math.PI / 2 + k * 0.2), Math.sin(Math.PI / 2 + k * 0.2), 0], 0.1 + (k % 2 ? 0 : 0.04), 0.14, '#ff7a2a', '#ffd34d');
      if (tier === 4) {
        W(sphere3(0.045, 10, 8), '#f4e8ff', { p: [0, 0.04, 0.03], mat: 'glow' });
        for (let k = -2; k <= 2; k++) W(G3.scale(), '#3a2a6a', { p: edge(k * 1.4, 0.22), r: [Math.PI / 2, 0, k * 0.28], s: 0.03, shine: 0.5 });
      } else W(sphere3(0.035, 8, 6), gold, { p: [0, 0.03, 0.02], shine: 1 });
      if (tier === 5) for (let k = -2; k <= 2; k++) W(sphere3(0.012, 6, 4), '#ffd34d', { p: edge(k * 1.3, 0.26), mat: 'glow' });
      if (tier === 6) for (let k = -4; k <= 4; k++) W(G3.puff(), k % 2 ? '#f4f8ff' : '#dfefff', { p: edge(k * 0.75, 0.37), s: 0.035 + (k % 2 ? 0 : 0.01) });
      if (tier === 7) {
        sun3(W, [0, 0.04, 0.03], 0.06, 8, GOLD3, GLOW3[7]);
        for (let k = -4; k <= 4; k++) coneAlong(W, G3.ray(), edge(k * 0.75, 0.36), [Math.cos(Math.PI / 2 + k * 0.15), Math.sin(Math.PI / 2 + k * 0.15), 0], 0.07, 0.4, '#fff2b0', { shine: 1 });
      }
      W(limb3(0.16, 0.01, 0.01, 4), '#c8402f', { p: [0, 0.02, 0] });
      W(sphere3(0.03, 8, 6), '#c8402f', { p: [0, -0.15, 0] });
      shell(geo3('fanshell3', () => new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16, 1, false, Math.PI * 0.54, Math.PI * 0.92).rotateX(Math.PI / 2)), { p: [0, 0.04, 0] });
      return;
    }
    case 'bell': {
      const bc = tier === 5 ? '#4a3a34' : tier === 7 ? GOLD3 : tier >= 3 ? metal : gold;
      W(limb3(0.2, 0.024, 0.024, 7), '#6b4a2e', { p: [0, 0.2, 0] });
      W(torus3(0.04, 0.012, Math.PI * 2, 4, 10), gold, { p: [0, 0.22, 0], shine: 1 });
      W(lathe3('bell2', [[0, 0], [0.14, 0], [0.13, 0.03], [0.09, 0.15], [0.055, 0.22], [0, 0.23]], 16), bc, { p: [0, -0.24, 0], shine: 1 });
      W(sphere3(0.035, 8, 6), STAFF_ORB[tier], { p: [0, -0.25, 0], mat: 'glow' });
      for (const sx of [-1, 1]) W(roundBox(0.03, 0.26, 0.008, 0.004), tier === 2 ? '#f4f4f0' : '#c8402f', { p: [sx * 0.05, -0.12, 0.02], r: [0, 0, sx * 0.25] });
      switch (tier) {
        case 1: for (const y of [-0.2, -0.13]) W(torus3(y < -0.15 ? 0.128 : 0.105, 0.008, Math.PI * 2, 3, 16), lighter(bc, 0.2), { p: [0, y, 0], r: [Math.PI / 2, 0, 0], shine: 1 }); break;
        case 2: W(G3.feather(), FEATHER3, { p: [0.03, -0.02, 0], r: [0, 0, -0.5], s: 0.2, top: '#2a2a30', topK: 0.3 }); break;
        case 3: for (let k = -1; k <= 1; k++) flame3(W, [k * 0.04, -0.02, 0], [k * 0.5, 1, 0], 0.09, 0.14, '#ff7a2a', '#ffd34d'); break;
        case 4:
          for (const sx of [-1, 1]) coneAlong(W, horn3(1, 0.3, 5), [sx * 0.05, -0.03, 0], [sx * 0.8, 1, 0], 0.1, 0.2, '#e8dcc0');
          W(sphere3(0.03, 8, 6), '#f4e8ff', { p: [0, 0.0, 0.05], mat: 'glow' });
          break;
        case 5:
          for (const [x, r] of [[-0.06, 0.3], [0.05, -0.4], [0.0, 0.1]]) W(roundBox(0.012, 0.09, 0.01, 0.004), '#ff7a2a', { p: [x, -0.14, Math.sqrt(Math.max(0, 0.012 - x * x)) + 0.01], r: [0, Math.atan2(x, 0.1), r], mat: 'glow' });
          break;
        case 6: for (const sx of [-1, 1]) wing3(W, [sx * 0.03, 0.02, 0], sx, 3, 0.14, FEATHER3, '#bfe8ff', {}, 0); break;
        case 7: sun3(W, [0, 0.06, 0], 0.06, 10, GOLD3, GLOW3[7]); break;
        default:
      }
      shell(sphere3(0.21, 12, 8), { p: [0, -0.14, 0] });
      return;
    }
    case 'staff':
    case 'skullstaff': {
      // Stab mit Kopfstück: Knochen, Krummholz, Schädel, Kralle mit Kugel, Dornenkrone, Obsidian, Stern, Sonne
      const head = kind === 'skullstaff' ? 2 : tier;
      W(limb3(1.45, 0.03, 0.026, 7), head === 2 ? '#4a3527' : head === 7 ? '#8a6a2a' : '#5a3f2a', { p: [0, 1.0, 0], shade: 0.2 });
      for (const y of [0.1, 0.55]) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), head === 7 ? GOLD3 : gold, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
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
        default:
          sun3(W, [0, 1.08, 0], 0.08, 12, GOLD3, GLOW3[7]);
          sun3(sub3(W, [0, 1.08, 0], [0, Math.PI / 2, 0]), [0, 0, 0], 0.06, 8, GOLD3, null);
      }
      shell(sphere3(0.19, 12, 8), { p: [0, 1.07, 0] });
      return;
    }
    case 'scythe': {
      // Sense: Sichelklinge am langen Schaft; Rost, Knochen, Seelenglanz, Doppelklinge, Obsidian, Sterne, Gold
      const bladeCol = tier === 0 ? '#9a6a4a' : tier === 2 ? BONE3 : tier === 5 ? OBSIDIAN3 : tier === 7 ? GOLD3 : metal;
      W(limb3(1.5, 0.03, 0.026, 7), tier === 7 ? '#6a4a1a' : '#4a3527', { p: [0, 1.0, 0] });
      W(scytheGeo(), bladeCol, { p: [0, 0.98, 0], shine: 1 });
      W(roundBox(0.1, 0.09, 0.07, 0.025), accent, { p: [0, 0.98, 0] });
      const ringCol = tier === 2 ? BONE3 : tier === 7 ? GOLD3 : accent;
      for (const y of tier === 2 ? [0.15, 0.3, 0.45, 0.6] : [0.2, 0.5]) W(torus3(0.034, tier === 2 ? 0.014 : 0.01, Math.PI * 2, 4, 10), ringCol, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
      // Punkte entlang der Klinge (Schneide)
      const along = (u) => [-0.72 * u, 0.98 + 0.12 * Math.sin(u * Math.PI) - 0.05 * u, 0.012];
      switch (tier) {
        case 1: W(torus3(0.05, 0.01, Math.PI * 2, 4, 12), metal, { p: [0, 0.98, 0.04], shine: 1 }); break;
        case 3: for (let k = 0; k < 4; k++) W(sphere3(0.014, 6, 4), GLOW3[3], { p: along(0.2 + k * 0.2), mat: 'glow' }); break;
        case 4:
          W(scytheGeo(), bladeCol, { p: [0, 0.98, 0], r: [0, Math.PI, 0], s: 0.6, shine: 1 });
          skull3(W, [0, 1.02, 0.045], 0.04, GLOW3[4]);
          break;
        case 5:
          for (let k = 0; k < 4; k++) coneAlong(W, G3.spike(), along(0.15 + k * 0.2), [0.2, 1, 0], 0.07, 0.16, OBSIDIAN3);
          for (let k = 0; k < 3; k++) W(sphere3(0.012, 6, 4), '#ff7a2a', { p: along(0.25 + k * 0.22), mat: 'glow' });
          break;
        case 6: for (let k = 0; k < 3; k++) star3(W, along(0.25 + k * 0.22), 0.022, '#e6f6ff'); break;
        case 7: sun3(W, [0, 0.98, 0.045], 0.06, 10, GOLD3, GLOW3[7]); break;
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
      const wood = tier >= 5 ? '#2a2024' : tier >= 3 ? accent : '#5a3f2a';
      const bladeCol = tier === 5 ? OBSIDIAN3 : tier === 7 ? GOLD3 : metal;
      W(limb3(shaft, 0.032, 0.028, 7), wood, { p: [0, shaft * 0.78, 0], shade: 0.2 });
      for (let k = 0; k < 3; k++) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), darker(accent, 0.25), { p: [0, 0.02 - k * 0.07, 0], r: [Math.PI / 2, 0, 0] });
      W(sphere3(0.04, 8, 6), gem || darker(metal, 0.2), { p: [0, -shaft * 0.22 - 0.02, 0], mat: gem ? 'glow' : 'lit', shine: 1 });
      const headY = shaft * 0.66;
      const s = (big ? 1.35 : 1) * (tier === 0 ? 0.85 : 1 + tier * 0.03);
      const blade = geo3('axeblade2', () => {
        const sh = new THREE.Shape();
        sh.moveTo(0, -0.07);
        sh.quadraticCurveTo(0.1, -0.1, 0.17, -0.2);
        sh.quadraticCurveTo(0.28, -0.08, 0.27, 0);
        sh.quadraticCurveTo(0.28, 0.1, 0.19, 0.2);
        sh.quadraticCurveTo(0.1, 0.12, 0, 0.07);
        sh.lineTo(0, -0.07);
        return smoothGeo(new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -0.016));
      });
      const sides = big ? [1, -1] : [1];
      for (const sx of sides) {
        // zweite Klinge gedreht statt gespiegelt (gespiegelte Flächen wären innen nach außen)
        W(blade, bladeCol, { p: [sx * 0.03, headY, 0], s: [s, s, 1], r: [0, sx > 0 ? 0 : Math.PI, 0], shine: 1, top: lighter(bladeCol, 0.35), topK: 0.3 });
        // helle Schneide (Asche: Glut, Gott: Licht)
        W(roundBox(0.02, 0.32 * s, tier >= 5 && tier !== 6 ? 0.06 : 0.05, 0.008), tier === 5 ? '#ff7a2a' : tier === 7 ? GLOW3[7] : lighter(metal, 0.45), { p: [sx * (0.03 + 0.265 * s), headY, 0], shine: 1, mat: tier === 5 || tier === 7 ? 'glow' : 'lit' });
        if (tier === 4) W(roundBox(0.1 * s, 0.025, 0.05, 0.008), lighter(gem, 0.2), { p: [sx * (0.03 + 0.12 * s), headY, 0], mat: 'glow' });
        // Asche: gezackte Schneide
        if (tier === 5) for (let k = 0; k < 4; k++) coneAlong(W, G3.spike(), [sx * (0.03 + 0.27 * s), headY + (k - 1.5) * 0.08 * s, 0], [sx, (k - 1.5) * 0.35, 0], 0.07 * s, 0.17, OBSIDIAN3);
        // Drache: Schuppen auf dem Blatt
        if (tier === 3) for (let k = 0; k < 2; k++) W(G3.scale(), lighter(accent, 0.1), { p: [sx * (0.03 + (0.1 + k * 0.07) * s), headY, 0.03], r: [Math.PI / 2, 0, sx * 1.2], s: 0.035 * s, shine: 0.6 });
      }
      if (!big && tier >= 2) W(horn3(0.13, 0.03, 6), bladeCol, { p: [-0.03, headY, 0], r: [0, 0, Math.PI / 2], shine: 1 });
      W(roundBox(0.08, 0.16 * s, 0.07, 0.025), darker(bladeCol, 0.3), { p: [0, headY, 0], shine: 0.6 });
      if (big || tier >= 3) W(horn3(big ? 0.2 : 0.12, 0.03, 6), bladeCol, { p: [0, headY + 0.08 * s, 0], shine: 1 });
      if (tier === 3) W(G3.gem(), GLOW3[3], { p: [0, headY, 0.04], s: [0.022, 0.03, 0.016], mat: 'glow' });
      else if (tier === 4) floatGem3(W, [0, headY + 0.32 * s, 0], 0.03, GLOW3[4]);
      else if (tier === 6) for (const sx of [-1, 1]) wing3(W, [sx * 0.03, headY + 0.06 * s, -0.02], sx, 3, 0.16 * s, FEATHER3, '#bfe8ff', {}, 0);
      else if (tier === 7) sun3(W, [0, headY, 0.045], 0.065 * s, 10, GOLD3, GLOW3[7]);
      else if (gem) W(sphere3(0.028, 8, 6), gem, { p: [0, headY, 0.04], mat: 'glow' });
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
  tier = Math.max(0, Math.min(7, tier || 0));
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
