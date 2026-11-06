// Drachen-Reittier (ENTWURF, noch nicht im Spiel): eigener Entwurf „Glutschwinge“ für Stufe 60.
// Wird zurzeit nur von der Vorschau (tools/drache-vorschau.js) geladen – weder index.html noch Stallmeister,
// Spielstand oder Spielablauf kennen ihn. Braucht drei-kern.js und drei-figuren.js (Bake3, loft3, tubeProfile3,
// limbBetween, horn3, cap3, torus3, roundBox, rigOf, model3/makeActor).
//
// Aussehen: schlanker, langer Leib in dunklem Rot mit hellem, gebändertem Bauch, Bronze an Hörnern, Rückenplatten,
// Flügelfingern und Krallen; kurzer Keilkopf mit zwei nach hinten geschwungenen, an der Spitze aufgebogenen
// Hörnern, zwei kleinen Wangenhörnern und Wangenfächern; bernsteinfarben glimmende Augen; große Hautflügel
// (oben dunkelrot, unten warm rötlich), deren Handteil an einer Scharnierlinie umklappt; langer Schwanz mit einem
// flachen Bronzeblatt am Ende. Sattel auf den Schultern vor den Flügelansätzen (die Flügel kreuzen nie die Beine
// des Reiters), mit Haltegriff, Rückenlehne, Steigbügeln und Bauchgurt.
//
// Maße (Modell × DRACHE3.scale = Welt): Rücken im Stand etwa 1,75, Hornspitzen etwa 3,1 hoch, Länge Nase–
// Schwanzspitze etwa 5,9, Spannweite etwa 6,9 Einheiten (Kriegsross: 2,5 hoch, 3,1 lang). Im Flug liegt der Bauch
// etwa 1,9, die Rumpfmitte etwa 2,3 und der Sattel etwa 2,9 Einheiten über dem Boden (± 0,1 im Flügeltakt).

const DRACHE3 = {
  scale: 1.45,
  // Höhe des Wurzelknochens im Flug (Modellmaß × scale = 0,9 Einheiten): Bauch ≈ 1,9, Rumpfmitte ≈ 2,3,
  // Rücken ≈ 2,7 Einheiten über dem Boden
  hover: 0.62,
  bob: 0.07,
  // Sattelpunkt (Hüfte des Reiters) im Modell: auf den Schultern vor den Flügelansätzen
  seat: [0, 1.36, 0.4],
  bodyY: 0.95,
  // Scharnierlinie der Flügel: längs z auf den Schultern
  hx: 0.17,
  hy: 1.22,
  // Flügelschläge je Sekunde: Schweben, Fliegen, Abheben/Landen
  hzHover: 1.1,
  hzMove: 1.4,
  hzLift: 1.6,
  // Dauer Abheben bzw. Landen (Sekunden)
  upTime: 1.2,
  downTime: 1.1,
  // angelegte Flügel: Heben (z), nach hinten schwenken (y), Kippen (x), Handteil umklappen; armZ/handZ stauchen
  // die Haut von vorn nach hinten (die Finger schließen sich wie ein Fächer)
  fold: { arm: 0.55, sweep: 0.85, tilt: 0.0, hand: 3.0, armZ: 0.7, handZ: 0.55 },
  colors: {
    scale: '#5c1517', scaleHi: '#7d231f', scaleDark: '#3c0e10',
    belly: '#e3c999', bellyLine: '#bf9c68',
    bronze: '#a5743a', bronzeHi: '#d2a058', bronzeDark: '#6e4a22',
    memTop: '#4f1416', memUnder: '#b5533a',
    claw: '#efe3c6', eye: '#ffb63c', eyeCore: '#fff0b0',
    leather: '#4f2f1c', saddle: '#2e4a63'
  }
};

// Knochen
const DRB3 = {
  root: 0, body: 1, head: 2, legFL: 3, legFR: 4, legBL: 5, legBR: 6, tail: 7, wingL: 8, wingR: 9, neck: 10,
  handL: 11, handR: 12, neck2: 13, jaw: 14, tail2: 15, tail3: 16, tail4: 17, lowFL: 18, lowFR: 19, lowBL: 20, lowBR: 21
};

// Flügelumriss (linker Flügel; x = Abstand von der Scharnierlinie nach außen, z wie im Modell).
// Innenteil: Schulter (R0) – Ellbogen (E) – Handgelenk (W) – Hinterkante (P) – Bogen – Wurzel hinten (R1).
// Handteil: W – drei Fingerspitzen mit Bögen dazwischen – P. Beide teilen sich die Kante W–P: um genau diese
// Linie klappt der Handteil (kein Spalt beim Falten), und der Innenteil dreht um die Scharnierlinie am Rumpf.
const WING3 = {
  R0: [0, 0.22], E: [0.62, 0.4], W: [1.2, 0.12], P: [0.98, -0.68], R1: [0, -0.44],
  F1: [2.15, -0.1], F2: [1.98, -0.66], F3: [1.45, -1.12],
  inner: [['m', 0, 0.22], ['l', 0.62, 0.4], ['l', 1.2, 0.12], ['l', 0.98, -0.68], ['q', 0.5, -0.4, 0, -0.44]],
  outer: [['m', 1.2, 0.12], ['l', 2.15, -0.1], ['q', 1.8, -0.32, 1.98, -0.66], ['q', 1.52, -0.66, 1.45, -1.12], ['q', 1.16, -0.72, 0.98, -0.68]]
};

// Flügelhaut als dünne Platte (Ober- und Unterseite, flache Facetten); sx = -1 spiegelt für den rechten Flügel
function dmMembrane3(part, sx) {
  return geo3('drache3mem' + part + sx, () => {
    const s = new THREE.Shape();
    for (const c of WING3[part]) {
      if (c[0] === 'm') s.moveTo(sx * c[1], c[2]);
      else if (c[0] === 'l') s.lineTo(sx * c[1], c[2]);
      else s.quadraticCurveTo(sx * c[1], c[2], sx * c[3], c[4]);
    }
    const depth = 0.024;
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 3 });
    // Umriss lag in x/y: y wird zu z, die Dicke zeigt nach unten; Mitte auf die Scharnierhöhe
    g.rotateX(Math.PI / 2);
    g.translate(0, depth / 2, 0);
    g.computeVertexNormals();
    return g;
  });
}

// Achse, um die der Handteil klappt (im Raum des Armknochens), je Seite
function dmHandAxis3(sx) {
  const [wx, wz] = WING3.W;
  const [px, pz] = WING3.P;
  return new THREE.Vector3(sx * (px - wx), 0, pz - wz).normalize();
}
const DM_AXIS3 = { L: null, R: null };

// Linear zwischen Stationen [z, ...] eines Leibes (für Bauchbänder und Platten)
function dmStationAt3(st, z) {
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    if (z >= a[0] && z <= b[0]) {
      const k = (z - a[0]) / (b[0] - a[0]);
      return a.map((v, q) => v + (b[q] - v) * k);
    }
  }
  return st[z < st[0][0] ? 0 : st.length - 1].slice();
}

// --- Modell ----------------------------------------------------------------------------------------
// o.saddle: Farbe der Satteldecke (im Spiel später wie beim Pferd die Klassenfarbe)
function dragonMount3(b, o = {}) {
  const A = adder(b, null);
  const C = DRACHE3.colors;
  const red = C.scale, redHi = C.scaleHi, redD = C.scaleDark;
  const bronze = C.bronze, bronzeHi = C.bronzeHi, bronzeD = C.bronzeDark;
  const cloth = o.saddle || C.saddle;
  const bodyY = DRACHE3.bodyY;
  const HX = DRACHE3.hx, HY = DRACHE3.hy;
  const [wx, wz] = WING3.W;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, 1.74, 1.04], 13],
    [[0.22, 0.9, 0.42], 1], [[-0.22, 0.9, 0.42], 1], [[0.24, 0.95, -0.48], 1], [[-0.24, 0.95, -0.48], 1],
    [[0, 1.0, -0.72], 1], [[HX, HY, -0.1], 1], [[-HX, HY, -0.1], 1], [[0, 1.1, 0.62], 1],
    [[HX + wx, HY, wz], 8], [[-HX - wx, HY, wz], 9], [[0, 1.45, 0.9], 10], [[0, 1.71, 1.08], 2],
    [[0, 0.9, -1.16], 7], [[0, 0.77, -1.6], 15], [[0, 0.71, -2.0], 16],
    [[0.27, 0.52, 0.32], 3], [[-0.27, 0.52, 0.32], 4], [[0.3, 0.55, -0.3], 5], [[-0.3, 0.55, -0.3], 6]
  ]);

  // --- Rumpf: ein glatter Leib (tiefe Brust, schlanke Taille, Hüfte), darunter der helle Bauch mit Bändern
  const BODY = [
    [-0.88, 1.0, 0.1, 0.09, 0.09],
    [-0.55, 0.99, 0.23, 0.2, 0.22],
    [-0.2, 0.96, 0.265, 0.23, 0.27],
    [0.2, 0.99, 0.28, 0.26, 0.32],
    [0.55, 1.07, 0.215, 0.2, 0.26],
    [0.8, 1.17, 0.15, 0.13, 0.15],
    [0.9, 1.21, 0.1, 0.09, 0.1]
  ];
  A(loft3(BODY, 14, 4), red, { bone: DRB3.body, top: redHi, topK: 0.45, shade: 0.25, shine: 0.2 });
  const BELLY = BODY.map(([z, y, w, u, d]) => [z, y - 0.035, w * 0.8, u * 0.45, d - 0.02]);
  A(loft3(BELLY, 14, 4), C.belly, { bone: DRB3.body, shade: 0.12 });
  for (let k = 0; k < 9; k++) {
    const z = -0.62 + k * 0.15;
    const [, y, w, , d] = dmStationAt3(BELLY, z);
    const arc = Math.PI * 0.7;
    A(torus3(1, 0.06, arc, 3, 12), C.bellyLine, { bone: DRB3.body, p: [0, y, z], r: [0, 0, -Math.PI / 2 - arc / 2], s: [w * 1.01, d * 1.01, 0.25], noShadow: true });
  }
  // Schulterwülste an den Flügelansätzen
  for (const sx of [-1, 1]) A(ball(12), red, { bone: DRB3.body, p: [sx * 0.19, 1.16, 0.02], s: [0.12, 0.12, 0.22], top: redHi, topK: 0.4 });

  // --- Hals in zwei Gliedern, vorn der helle Kehlstreifen
  A(tubeProfile3([[0, 1.08, 0.6], [0, 1.28, 0.77], [0, 1.47, 0.93]], [0.17, 0.14, 0.118], 10, 12), red, { bone: DRB3.neck, top: redHi, topK: 0.4, shade: 0.15 });
  A(tubeProfile3([[0, 1.02, 0.7], [0, 1.22, 0.86], [0, 1.4, 1.0]], [0.11, 0.09, 0.075], 10, 10), C.belly, { bone: DRB3.neck });
  A(ball(12), red, { bone: DRB3.neck2, p: [0, 1.46, 0.92], s: 0.118 });
  A(tubeProfile3([[0, 1.45, 0.91], [0, 1.6, 1.0], [0, 1.73, 1.06]], [0.118, 0.104, 0.092], 10, 12), red, { bone: DRB3.neck2, top: redHi, topK: 0.4 });
  A(tubeProfile3([[0, 1.39, 0.98], [0, 1.53, 1.08], [0, 1.64, 1.14]], [0.075, 0.066, 0.058], 10, 10), C.belly, { bone: DRB3.neck2 });

  // --- Kopf: Keilkopf mit Schnauze, Unterkiefer, Augen, Brauenplatten, Hörner, Wangenfächer
  const HEAD = [
    [0.96, 1.8, 0.1, 0.08, 0.08],
    [1.05, 1.82, 0.14, 0.115, 0.1],
    [1.2, 1.8, 0.125, 0.09, 0.075],
    [1.38, 1.76, 0.09, 0.065, 0.045],
    [1.52, 1.74, 0.066, 0.05, 0.032],
    [1.59, 1.74, 0.04, 0.034, 0.022]
  ];
  A(loft3(HEAD, 10, 3), red, { bone: DRB3.head, top: redHi, topK: 0.5, shine: 0.25 });
  // Unterkiefer (eigenes Glied) mit hellem Kinn
  const JAW = [[1.02, 1.72, 0.1, 0.04, 0.06], [1.2, 1.7, 0.095, 0.035, 0.045], [1.4, 1.695, 0.068, 0.03, 0.032], [1.52, 1.7, 0.045, 0.02, 0.02]];
  A(loft3(JAW, 10, 3), red, { bone: DRB3.jaw, shade: 0.1 });
  A(loft3(JAW.map(([z, y, w, u, d]) => [z, y - 0.012, w * 0.75, u * 0.5, d + 0.004]), 10, 3), C.belly, { bone: DRB3.jaw });
  for (const sx of [-1, 1]) {
    // Zähne am Oberkiefer
    for (let k = 0; k < 4; k++) A(horn3(0.035, 0.011, 5), C.claw, { bone: DRB3.head, p: [sx * (0.07 - k * 0.008), 1.725, 1.3 + k * 0.065], r: [Math.PI, 0, 0], noShadow: true });
    // Nüstern
    A(ball(8), '#1c0c0c', { bone: DRB3.head, p: [sx * 0.03, 1.765, 1.575], s: [0.014, 0.01, 0.012] });
    // Augen: bernsteinfarben glimmend, mandelförmig, mit schmaler Pupille; darüber eine Brauenplatte aus Bronze
    A(ball(10), C.eye, { bone: DRB3.head, p: [sx * 0.104, 1.842, 1.2], s: [0.024, 0.017, 0.044], r: [0, sx * 0.4, sx * -0.25], mat: 'glow' });
    A(ball(8), C.eyeCore, { bone: DRB3.head, p: [sx * 0.112, 1.844, 1.205], s: [0.012, 0.009, 0.02], r: [0, sx * 0.4, 0], mat: 'glow' });
    A(roundBox(0.006, 0.026, 0.008, 0.003), '#1a0a06', { bone: DRB3.head, p: [sx * 0.124, 1.843, 1.205], r: [0, sx * 0.4, 0], noShadow: true });
    A(roundBox(0.075, 0.026, 0.13, 0.012), bronze, { bone: DRB3.head, p: [sx * 0.095, 1.883, 1.17], r: [0.12, sx * 0.3, sx * -0.38], shine: 0.8, top: bronzeHi, topK: 0.5 });
    // Haupthörner: nach hinten geschwungen, an der Spitze aufgebogen (Bronze, Spitze dunkler)
    A(tube3([[sx * 0.065, 1.9, 1.03], [sx * 0.12, 1.97, 0.88], [sx * 0.16, 1.98, 0.72], [sx * 0.17, 2.03, 0.6], [sx * 0.15, 2.12, 0.54]], 0.046, 0.006, 22, 9), bronze, { bone: DRB3.head, shine: 0.7, top: bronzeHi, topK: 0.4 });
    for (let k = 0; k < 3; k++) A(torus3(0.034 - k * 0.006, 0.006, Math.PI * 2, 3, 10), bronzeD, { bone: DRB3.head, p: [sx * (0.09 + k * 0.025), 1.94 + k * 0.012, 0.97 - k * 0.07], r: [0.9, sx * 0.25, 0], noShadow: true });
    // Wangenhörner, kleiner und flacher nach hinten
    A(tube3([[sx * 0.11, 1.79, 1.02], [sx * 0.18, 1.79, 0.9], [sx * 0.23, 1.82, 0.8]], 0.028, 0.005, 14, 7), bronzeD, { bone: DRB3.head, shine: 0.6 });
    // Wangenfächer: drei Strahlen mit Haut dazwischen
    A(ball(10), C.memUnder, { bone: DRB3.head, p: [sx * 0.145, 1.73, 0.97], s: [0.012, 0.075, 0.12], r: [-0.35, sx * 0.55, 0], top: C.memTop, topK: 0.3, noShadow: true });
    for (let k = 0; k < 3; k++) pointAt3(A, horn3(0.15, 0.012, 5), bronze, [sx * 0.12, 1.73, 1.02], [sx * 0.5, 0.35 - k * 0.45, -1], { bone: DRB3.head, noShadow: true });
  }
  // Nasenhöcker und Scheitelplatten
  pointAt3(A, horn3(0.06, 0.02, 6), bronze, [0, 1.785, 1.47], [0, 1, 0.5], { bone: DRB3.head, shine: 0.6 });
  for (let k = 0; k < 2; k++) A(ball(8), bronze, { bone: DRB3.head, p: [0, 1.925 - k * 0.01, 1.07 - k * 0.1], s: [0.012, 0.045, 0.06], r: [0.5, 0, 0], shine: 0.6 });

  // --- Rückenplatten aus Bronze (Hals, Schultern, Schwanz) – die Sattelgegend bleibt frei
  const plate = (bone, y, z, h, len, tilt = 0.45) => A(ball(8), bronze, { bone, p: [0, y, z], s: [0.014, h, len], r: [tilt, 0, 0], shine: 0.6, top: bronzeHi, topK: 0.5 });
  plate(DRB3.neck2, 1.82, 1.0, 0.04, 0.05);
  plate(DRB3.neck2, 1.72, 0.93, 0.05, 0.06);
  plate(DRB3.neck, 1.6, 0.84, 0.06, 0.07);
  plate(DRB3.neck, 1.47, 0.74, 0.06, 0.07);
  plate(DRB3.body, 1.27, 0.08, 0.055, 0.07);
  plate(DRB3.body, 1.25, -0.12, 0.06, 0.075);
  plate(DRB3.body, 1.24, -0.33, 0.065, 0.08);
  plate(DRB3.body, 1.22, -0.53, 0.06, 0.075);
  plate(DRB3.body, 1.17, -0.71, 0.05, 0.07);
  plate(DRB3.tail, 1.11, -0.86, 0.05, 0.065);
  plate(DRB3.tail, 1.05, -1.05, 0.045, 0.06);
  plate(DRB3.tail2, 0.95, -1.3, 0.04, 0.055);
  plate(DRB3.tail2, 0.88, -1.5, 0.035, 0.05);
  plate(DRB3.tail3, 0.8, -1.72, 0.03, 0.045);
  plate(DRB3.tail3, 0.76, -1.9, 0.025, 0.04);

  // --- Schwanz in vier Gliedern, am Ende ein flaches Bronzeblatt
  const TAIL = [
    [DRB3.tail, [[0, 1.0, -0.72], [0, 0.96, -0.95], [0, 0.9, -1.18]], [0.11, 0.085, 0.07]],
    [DRB3.tail2, [[0, 0.9, -1.16], [0, 0.83, -1.4], [0, 0.77, -1.62]], [0.07, 0.058, 0.048]],
    [DRB3.tail3, [[0, 0.77, -1.6], [0, 0.73, -1.82], [0, 0.71, -2.02]], [0.048, 0.038, 0.03]],
    [DRB3.tail4, [[0, 0.71, -2.0], [0, 0.705, -2.15], [0, 0.7, -2.27]], [0.03, 0.022, 0.016]]
  ];
  for (const [bone, pts, radii] of TAIL) {
    A(tubeProfile3(pts, radii, 8, 10), red, { bone, top: redHi, topK: 0.4, shade: 0.15 });
    A(ball(10), red, { bone, p: pts[0], s: radii[0] * 0.98 });
    // heller Streifen unten
    A(tubeProfile3(pts.map(([x, y, z]) => [x, y - radii[1] * 0.35, z]), radii.map((r) => r * 0.72), 8, 8), C.belly, { bone, noShadow: true });
  }
  A(ball(10), bronze, { bone: DRB3.tail4, p: [0, 0.7, -2.36], s: [0.12, 0.018, 0.17], shine: 0.7, top: bronzeHi, topK: 0.5 });
  A(ball(8), bronzeD, { bone: DRB3.tail4, p: [0, 0.7, -2.36], s: [0.02, 0.025, 0.15] });
  for (const sx of [-1, 1]) pointAt3(A, horn3(0.12, 0.022, 5), bronze, [sx * 0.06, 0.7, -2.3], [sx * 0.9, 0, 0.55], { bone: DRB3.tail4, s: [1, 1, 0.4], shine: 0.7 });

  // --- Beine: vorn Oberarm, Unterarm, Pfote; hinten kräftiger Schenkel, Unterschenkel, Fersengelenk, Fuß
  const claws = (bone, f, dir) => {
    for (const dx of [-0.035, 0, 0.035]) pointAt3(A, horn3(0.075, 0.018, 5), C.claw, [f[0] + dx, f[1] - 0.005, f[2] + 0.03], [dx * 3, -0.45, dir], { bone, shine: 0.5, noShadow: true });
  };
  for (const sx of [-1, 1]) {
    const up = sx > 0 ? DRB3.legFL : DRB3.legFR;
    const lo = sx > 0 ? DRB3.lowFL : DRB3.lowFR;
    const S = [sx * 0.22, 0.9, 0.42], E = [sx * 0.27, 0.52, 0.32], Wr = [sx * 0.26, 0.13, 0.42], F = [sx * 0.26, 0.05, 0.5];
    A(ball(12), red, { bone: up, p: [sx * 0.23, 0.78, 0.4], s: [0.1, 0.18, 0.13], top: redHi, topK: 0.4, shade: 0.2 });
    limbBetween(A, S, E, 0.1, 0.075, red, { bone: up, shade: 0.15 });
    A(ball(10), red, { bone: lo, p: E, s: 0.078 });
    limbBetween(A, E, Wr, 0.07, 0.052, red, { bone: lo });
    A(ball(10), redD, { bone: lo, p: [F[0], F[1] + 0.02, F[2] - 0.02], s: [0.065, 0.045, 0.085] });
    pointAt3(A, horn3(0.07, 0.018, 5), bronze, [E[0], E[1], E[2] - 0.05], [0, 0.2, -1], { bone: lo, shine: 0.6, noShadow: true });
    claws(lo, F, 1);
    const hu = sx > 0 ? DRB3.legBL : DRB3.legBR;
    const hl = sx > 0 ? DRB3.lowBL : DRB3.lowBR;
    const H = [sx * 0.24, 0.95, -0.48], K = [sx * 0.3, 0.55, -0.3], Hk = [sx * 0.29, 0.22, -0.58], Fh = [sx * 0.29, 0.05, -0.47];
    A(ball(14), red, { bone: hu, p: [sx * 0.26, 0.8, -0.42], s: [0.13, 0.25, 0.19], top: redHi, topK: 0.4, shade: 0.2, shine: 0.15 });
    limbBetween(A, H, K, 0.1, 0.075, red, { bone: hu, shade: 0.15 });
    A(ball(10), red, { bone: hl, p: K, s: 0.085 });
    limbBetween(A, K, Hk, 0.078, 0.052, red, { bone: hl });
    A(ball(8), redD, { bone: hl, p: Hk, s: 0.05 });
    limbBetween(A, Hk, [Fh[0], Fh[1] + 0.03, Fh[2]], 0.052, 0.045, redD, { bone: hl });
    A(ball(10), redD, { bone: hl, p: [Fh[0], Fh[1] + 0.02, Fh[2] + 0.01], s: [0.07, 0.045, 0.09] });
    pointAt3(A, horn3(0.06, 0.016, 5), bronze, [Hk[0], Hk[1] + 0.02, Hk[2] - 0.03], [0, 0.4, -1], { bone: hl, shine: 0.6, noShadow: true });
    claws(hl, Fh, 1);
  }

  // --- Flügel: Innenteil am Armknochen (dreht um die Scharnierlinie), Handteil mit drei Fingern
  for (const sx of [-1, 1]) {
    const arm = sx > 0 ? DRB3.wingL : DRB3.wingR;
    const hand = sx > 0 ? DRB3.handL : DRB3.handR;
    const at = ([x, z], dy = 0.014) => [sx * (HX + x), HY + dy, z];
    A(dmMembrane3('inner', sx), C.memUnder, { bone: arm, p: [sx * HX, HY, 0], top: C.memTop, topK: 1, noShadow: true });
    A(dmMembrane3('outer', sx), C.memUnder, { bone: hand, p: [sx * HX, HY, 0], top: C.memTop, topK: 1, noShadow: true });
    // Vorderkante: Oberarm und Unterarm, Gelenkknoten, Daumenkralle aus Bronze
    limbBetween(A, at(WING3.R0), at(WING3.E), 0.07, 0.05, red, { bone: arm, top: redHi, topK: 0.4 });
    limbBetween(A, at(WING3.E), at(WING3.W), 0.05, 0.04, red, { bone: arm, top: redHi, topK: 0.4 });
    A(ball(10), redD, { bone: arm, p: at(WING3.E), s: 0.055 });
    A(ball(10), redD, { bone: hand, p: at(WING3.W), s: 0.048 });
    pointAt3(A, horn3(0.13, 0.03, 6), bronze, at(WING3.W, 0.03), [sx * 0.25, 0.35, 1], { bone: hand, shine: 0.7, noShadow: true });
    // Finger (Bronze zur Spitze hin), außen eine kleine Kralle
    for (const [k, F] of [[0, WING3.F1], [1, WING3.F2], [2, WING3.F3]]) {
      const r0 = k ? 0.026 : 0.034;
      const mid = [(WING3.W[0] + F[0]) / 2, (WING3.W[1] + F[1]) / 2];
      limbBetween(A, at(WING3.W, 0.012), at(mid, 0.012), r0, r0 * 0.75, redD, { bone: hand, noShadow: true });
      limbBetween(A, at(mid, 0.012), at(F, 0.012), r0 * 0.75, 0.01, bronzeD, { bone: hand, noShadow: true });
    }
    pointAt3(A, horn3(0.08, 0.016, 5), bronze, at(WING3.F1, 0.01), [sx * 0.9, 0, -0.2], { bone: hand, shine: 0.7, noShadow: true });
  }

  // --- Sattel auf den Schultern vor den Flügelansätzen: Decke mit Bronzeborte, Sitz, Haltegriff, hohe Rückenlehne,
  // Seitenblätter, Bauchgurt, Steigbügel
  const [, , sz] = DRACHE3.seat;
  const leather = C.leather;
  const sb = dmStationAt3(BODY, sz);
  A(cap3(1, 1.0, 0, Math.PI * 2, 20, 6), cloth, { bone: DRB3.body, p: [0, sb[1] + 0.005, sz], s: [sb[2] + 0.015, sb[3] + 0.015, 0.26], shade: 0.1 });
  A(torus3(1, 0.05, Math.PI * 2, 4, 28), bronze, { bone: DRB3.body, p: [0, sb[1] + 0.005 + (sb[3] + 0.015) * Math.cos(1.0), sz], r: [Math.PI / 2, 0, 0], s: [(sb[2] + 0.015) * Math.sin(1.0) + 0.01, 0.26 * Math.sin(1.0) + 0.01, 0.25], shine: 0.8 });
  A(cap3(1, 1.1, 0, Math.PI * 2, 16, 5), leather, { bone: DRB3.body, p: [0, sb[1] + sb[3] - 0.04, sz], s: [0.17, 0.09, 0.2], top: lighter(leather, 0.2), topK: 0.4, shine: 0.3 });
  A(torus3(0.055, 0.016, Math.PI, 4, 10), bronze, { bone: DRB3.body, p: [0, sb[1] + sb[3] + 0.04, sz + 0.19], shine: 0.9 });
  for (const sx of [-1, 1]) A(ball(8), bronzeD, { bone: DRB3.body, p: [sx * 0.055, sb[1] + sb[3] + 0.04, sz + 0.19], s: 0.02, shine: 0.8 });
  A(torus3(0.12, 0.024, Math.PI, 4, 10), darker(leather, 0.15), { bone: DRB3.body, p: [0, sb[1] + sb[3] + 0.0, sz - 0.19], r: [0.25, 0, 0], s: [1, 0.7, 1] });
  A(torus3(0.12, 0.012, Math.PI, 3, 10), bronze, { bone: DRB3.body, p: [0, sb[1] + sb[3] + 0.005, sz - 0.205], r: [0.25, 0, 0], s: [1.05, 0.75, 1], shine: 0.9 });
  for (const sx of [-1, 1]) A(roundBox(0.02, 0.18, 0.24, 0.01), darker(leather, 0.1), { bone: DRB3.body, p: [sx * (sb[2] - 0.035), sb[1] + sb[3] * 0.55, sz], r: [0, 0, sx * 0.5] });
  const g = dmStationAt3(BODY, sz - 0.12);
  A(torus3(1, 0.06, Math.PI * 2, 4, 24), leather, { bone: DRB3.body, p: [0, g[1] - 0.02, sz - 0.12], s: [g[2] + 0.012, (g[3] + g[4]) / 2 + 0.012, 0.3] });
  for (const sx of [-1, 1]) {
    limbBetween(A, [sx * (sb[2] - 0.06), sb[1] + sb[3] - 0.03, sz - 0.04], [sx * (sb[2] + 0.07), sb[1] - 0.12, sz - 0.04], 0.011, 0.011, leather, { bone: DRB3.body });
    A(torus3(0.034, 0.009, Math.PI * 2, 4, 10), bronzeD, { bone: DRB3.body, p: [sx * (sb[2] + 0.07), sb[1] - 0.15, sz - 0.04], r: [0, Math.PI / 2, 0], shine: 1 });
  }

  return { rig, height: 2.0, family: 'dragonMount', bodyY, seat: DRACHE3.seat[1], scale: DRACHE3.scale, blob: 1.15 };
}

// --- Animation --------------------------------------------------------------------------------------

const dmSmooth3 = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
const dmLerp3 = (a, b, k) => a + (b - a) * k;

// Flügelschlag: schneller, kräftiger Abschlag (42 % des Zyklus), langsamer Aufschlag. Liefert für den linken
// Flügel [Arm um die Scharnierlinie, Handteil um W–P (+ = Spitze nach unten)]. Im Abschlag bleibt die Spitze
// etwas zurück (nach oben gebogen), im Aufschlag knickt der Handteil ein (weniger Luftwiderstand).
const DM_DOWN3 = 0.42;
function dmFlap3(ph) {
  const UP = 0.95, DN = -0.55;
  if (ph < DM_DOWN3) {
    const u = ph / DM_DOWN3;
    return [UP + (DN - UP) * (0.5 - 0.5 * Math.cos(Math.PI * u)), -0.3 * Math.sin(Math.PI * u)];
  }
  const u = (ph - DM_DOWN3) / (1 - DM_DOWN3);
  return [DN + (UP - DN) * (0.5 - 0.5 * Math.cos(Math.PI * u)), 0.85 * Math.sin(Math.PI * u)];
}

// Haltung zu einem Zeitpunkt (ohne eigenen Zustand – die Vorschau ruft sie für einzelne Bilder direkt auf).
// o.air: 0 = steht, 1 = fliegt (Übergang = Abheben/Landen); o.open: Flügel offen 0–1; o.ph: Phase des
// Flügelschlags 0–1; o.flare: Bremsen beim Landen 0–1 (Kopf hoch, Beine vor); o.moving: fliegt vorwärts.
// Ergebnis: { lift } = Höhe des Drachen über dem Boden (Welt), y-Versatz des Wurzelknochens.
function dragonMountPose3(a, t, o) {
  const B = a.bones;
  const air = o.air || 0;
  const open = o.open == null ? (air > 0 ? 1 : 0) : o.open;
  const ph = o.ph || 0;
  const flare = o.flare || 0;
  const mov = o.moving ? 1 : 0;
  // Bodenanteil: die ersten bzw. letzten 15 % von air bleibt er am Boden (Ducken vor dem Sprung, Abfedern)
  const L = dmSmooth3((air - 0.15) / 0.85);
  const crouch = air > 0 && air < 0.15 ? Math.sin((Math.PI * air) / 0.15) : 0;
  const tuck = dmSmooth3((L - 0.3) / 0.6) * (1 - flare * 0.8);
  const idle = 1 - dmSmooth3(air * 3);
  const breath = Math.sin(t * 1.5);
  const TAU = Math.PI * 2;
  const body = B[DRB3.body];

  // Höhe: Schweben mit Auf und Ab im Takt der Flügel (steigt im Abschlag)
  const bob = DRACHE3.bob * Math.sin(TAU * (ph - 0.2)) * open * L;
  const rise = DRACHE3.hover * L + bob;
  B[DRB3.root].position.y += rise;
  body.position.y += 0.012 * breath * idle - 0.1 * crouch;
  // Neigung: vorwärts leicht Kopf runter, beim Landen Kopf hoch; leichtes Wiegen im Flug
  body.rotation.x = L * (mov ? 0.1 : -0.03) - 0.32 * flare * dmSmooth3(air * 4) + 0.03 * Math.sin(TAU * (ph - 0.3)) * L;
  B[DRB3.root].rotation.z = 0.05 * Math.sin(t * 0.8) * L;

  // Flügel
  if (!DM_AXIS3.L) {
    DM_AXIS3.L = dmHandAxis3(1);
    DM_AXIS3.R = dmHandAxis3(-1);
  }
  const F = DRACHE3.fold;
  const [fa, fh] = dmFlap3(ph);
  // beim Landen größere, langsamere Schläge mit weit offener Hand
  const armA = dmLerp3(F.arm + 0.025 * breath, fa * (1 + 0.15 * flare), open);
  const handA = dmLerp3(F.hand, fh * (1 - 0.5 * flare), dmSmooth3(open * 1.25));
  const sweep = dmLerp3(F.sweep, -0.05 + 0.08 * mov, dmSmooth3(open * 1.4));
  const tilt = dmLerp3(F.tilt, 0, open);
  for (const [sx, arm, hand, axis] of [[1, DRB3.wingL, DRB3.handL, DM_AXIS3.L], [-1, DRB3.wingR, DRB3.handR, DM_AXIS3.R]]) {
    B[arm].rotation.set(tilt, sx * sweep, sx * armA);
    B[arm].scale.z = dmLerp3(F.armZ, 1, dmSmooth3(open * 1.3));
    B[hand].quaternion.setFromAxisAngle(axis, sx * handA);
    B[hand].scale.z = dmLerp3(F.handZ, 1, dmSmooth3(open * 1.3));
  }

  // Hals und Kopf: im Stand aufrecht mit ruhigem Atmen und Umschauen, im Flug weiter vorgestreckt
  const nb = Math.sin(TAU * (ph - 0.1));
  B[DRB3.neck].rotation.x = idle * (0.03 * Math.sin(t * 1.5 + 0.6)) + L * (0.28 + 0.05 * nb * open) - 0.15 * flare + 0.12 * crouch;
  B[DRB3.neck2].rotation.x = L * (0.12 - 0.03 * nb) - 0.1 * flare;
  B[DRB3.head].rotation.x = idle * 0.04 * Math.sin(t * 0.7) - L * 0.42 + 0.2 * flare - body.rotation.x * 0.5;
  B[DRB3.head].rotation.y = idle * 0.32 * Math.sin(t * 0.33) + L * 0.06 * Math.sin(t * 0.5);
  B[DRB3.neck].rotation.y = idle * 0.1 * Math.sin(t * 0.33 - 0.5);
  // Maul öffnet sich ab und zu ein wenig (im Stand), beim Abheben kurz weit
  const jt = (t + 2.3) % 9.5;
  B[DRB3.jaw].rotation.x = idle * (jt < 1 ? 0.22 * Math.sin(Math.PI * jt) : 0) + 0.3 * crouch;

  // Schwanz: im Stand hängt er und pendelt langsam, im Flug gestreckt mit Welle
  const tails = [DRB3.tail, DRB3.tail2, DRB3.tail3, DRB3.tail4];
  for (let k = 0; k < 4; k++) {
    const bn = B[tails[k]];
    const droop = [-0.1, -0.18, -0.12, 0.12][k];
    bn.rotation.x = (1 - L) * droop + L * (0.06 + 0.07 * Math.sin(TAU * ph - 0.9 * (k + 1))) + flare * 0.12;
    bn.rotation.y = (1 - L) * (0.1 + 0.04 * k) * Math.sin(t * 0.9 - k * 0.6) + L * (0.05 + 0.03 * k) * Math.sin(t * 1.3 - k * 0.8);
  }

  // Beine: im Stand gerade (ein Hinterbein entlastet), beim Ducken gebeugt, im Flug angelegt,
  // beim Landen vorgestreckt
  const legs = [[DRB3.legFL, DRB3.lowFL, true], [DRB3.legFR, DRB3.lowFR, true], [DRB3.legBL, DRB3.lowBL, false], [DRB3.legBR, DRB3.lowBR, false]];
  for (const [u, l, front] of legs) {
    if (front) {
      B[u].rotation.x = 0.85 * tuck + 0.22 * crouch - 0.35 * flare * L;
      B[l].rotation.x = -1.5 * tuck - 0.4 * crouch + 0.25 * flare * L;
    } else {
      B[u].rotation.x = 1.05 * tuck - 0.28 * crouch - 0.3 * flare * L;
      B[l].rotation.x = 0.55 * tuck + 0.5 * crouch + 0.2 * flare * L;
    }
  }
  if (idle > 0.01) {
    B[DRB3.legBR].rotation.x += -0.08 * idle;
    B[DRB3.lowBR].rotation.x += 0.16 * idle;
  }
  return { lift: rise * a.model.scale, L };
}

// Mit Zustand (für das Spiel): want = 'fly' oder 'stand'. Abheben/Landen laufen als Übergang von a.dm.air;
// a.dm.mode ist 'stand' | 'takeoff' | 'fly' | 'land'.
function dragonMountAnim3(a, t, dt, want, moving) {
  const S = a.dm || (a.dm = { air: 0, open: 0, ph: 0, flare: 0, mode: 'stand' });
  dt = Math.min(0.1, Math.max(0, dt));
  if (want === 'fly') {
    S.air = Math.min(1, S.air + dt / DRACHE3.upTime);
    S.mode = S.air < 1 ? 'takeoff' : 'fly';
  } else {
    S.air = Math.max(0, S.air - dt / DRACHE3.downTime);
    S.mode = S.air > 0 ? 'land' : 'stand';
  }
  // Flügel öffnen schnell, nach der Landung legen sie sich langsam an
  S.open = S.air > 0 || want === 'fly' ? Math.min(1, S.open + dt * 4) : Math.max(0, S.open - dt * 1.6);
  S.flare += ((S.mode === 'land' ? 1 : 0) - S.flare) * Math.min(1, dt * 4);
  const hz = S.mode === 'takeoff' ? DRACHE3.hzLift : S.mode === 'land' ? DRACHE3.hzHover : moving ? DRACHE3.hzMove : DRACHE3.hzHover;
  if (S.open > 0) S.ph = (S.ph + dt * hz) % 1;
  // angelegt: Phase auf „Flügel oben“ zurücklaufen lassen, damit das nächste Abheben mit dem Abschlag beginnt
  else S.ph = 0;
  return dragonMountPose3(a, t, { air: S.air, open: S.open, ph: S.ph, flare: S.flare, moving });
}

// Sattelpunkt in Weltkoordinaten (nach der Haltung aufrufen) und Neigung des Rumpfs für den Reiter
const _dmSeat3 = new THREE.Vector3();
function dragonSeat3(a, out) {
  const body = a.bones[DRB3.body];
  a.group.updateMatrixWorld(true);
  out = out || _dmSeat3;
  out.set(DRACHE3.seat[0], DRACHE3.seat[1] - DRACHE3.bodyY, DRACHE3.seat[2]).applyMatrix4(body.matrixWorld);
  return { pos: out, pitch: body.rotation.x, roll: a.bones[DRB3.root].rotation.z };
}
