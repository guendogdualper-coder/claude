// Drachen-Reittier „Glutschwinge“ (seit 14.27): dritte Reittierstufe ab Stufe 60 (HORSES[3] in spieler.js, Kauf beim
// Stallmeister). Modell, Animation (Stehen, Abheben, Schweben/Fliegen, Landen) und die Anbindung an die Figuren im
// Spiel (rideDragon3, dragonLand3 – aufgerufen aus syncPlayer3 in drei-figuren.js). Braucht drei-kern.js und
// drei-figuren.js (Bake3, loft3, tubeProfile3, limbBetween, horn3, cap3, torus3, roundBox, rigOf, model3/makeActor,
// actorFor). Die Vorschau (tools/drache-vorschau.js) nutzt dieselben Funktionen.
//
// Aussehen: schlanker, langer Leib in dunklem Rot mit hellem, gebändertem Bauch, Bronze an Hörnern, Rückenplatten,
// Flügelfingern und Krallen; kurzer Keilkopf mit zwei nach hinten geschwungenen, an der Spitze aufgebogenen
// Hörnern, zwei kleinen Wangenhörnern und Wangenfächern; bernsteinfarben glimmende Augen; große Hautflügel
// (oben dunkelrot, unten warm rötlich) mit bauchig gewölbter Haut, leicht gebogenen, ungleich langen Fingern und
// bogenförmig eingebuchtetem Hinterrand, die beim Schlag von innen nach außen nachschwingen; langer Schwanz mit einem
// flachen Bronzeblatt am Ende. Sattel auf den Schultern vor den Flügelansätzen (die Flügel kreuzen nie die Beine
// des Reiters), mit Haltegriff, Rückenlehne, Steigbügeln und Bauchgurt.
//
// Maße (Modell × DRACHE3.scale = Welt): Rücken im Stand etwa 1,75, Hornspitzen etwa 3,1 hoch, Länge Nase–
// Schwanzspitze etwa 5,9, Spannweite etwa 6,9 Einheiten (Kriegsross: 2,5 hoch, 3,1 lang). Im Flug liegt der Bauch
// etwa 1,9, die Rumpfmitte etwa 2,3 und der Sattel etwa 2,9 Einheiten über dem Boden (± 0,1 im Flügeltakt); seit
// 14.39 auf Wunsch „hoch“ 2,4 mehr (DRACHE3.high). Farben seit 14.39 wählbar (DRACHE3_FARBEN).

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
  // seit 14.32: Schritte je Sekunde beim Gehen am Boden (Diagonalgang, Tempo des Kriegsrosses)
  hzWalk: 1.7,
  // Dauer Abheben bzw. Landen (Sekunden)
  upTime: 1.2,
  downTime: 1.1,
  // seit 14.39: Flughöhe „hoch“ (dragonHighK in spieler.js): so viel höher (Welt-Einheiten) – ein Stück über den
  // Bäumen (≈ 3 hoch): Bauch ≈ 4,3, Rumpfmitte ≈ 4,7, Sattel ≈ 5,3 statt 1,9 / 2,3 / 2,9; Steigen mit kräftigerem,
  // schnellerem Schlag (hzClimb), Sinken gleitend
  high: 2.4,
  hzClimb: 2.0,
  hzSink: 0.5,
  // angelegte Flügel: Heben (z), nach hinten schwenken (y), Kippen (x), Innenteil stauchen (armZ), Unterarm nach
  // hinten (fore), Handteil als Ganzes über die Kante W–P umklappen (hand) und zusammenschieben (handZ), Finger
  // nur leicht zusammen (fan je Finger). Ein stark geschlossener Fächer würde die Haut umstülpen (Blend-Skinning).
  fold: { arm: 0.55, sweep: 0.85, tilt: 0.0, armZ: 0.72, fore: 0.12, hand: 2.95, handZ: 0.6, fan: [0.16, 0.09, 0.03] },
  // Strecken/Schütteln im Stand: alle stretchEvery s (Versatz stretchAt), rechter Flügel etwas später
  stretchEvery: 12, stretchAt: 6,
  // Gleiten beim Vorwärtsfliegen: Zyklus in s, Anteil (von–bis) mit fast ruhigen, gespannten Flügeln
  glideEvery: 7, glideFrom: 0.62, glideTo: 0.92,
  colors: {
    scale: '#5c1517', scaleHi: '#7d231f', scaleDark: '#3c0e10',
    belly: '#e3c999', bellyLine: '#bf9c68',
    bronze: '#a5743a', bronzeHi: '#d2a058', bronzeDark: '#6e4a22',
    memTop: '#4f1416', memUnder: '#b5533a',
    claw: '#efe3c6', eye: '#ffb63c', eyeCore: '#fff0b0',
    leather: '#4f2f1c', saddle: '#2e4a63'
  }
};

// seit 14.39: Farben zur Wahl (p.dragonColor, DRAGON_COLORS in spieler.js). Rot = DRACHE3.colors (wie bisher); die
// anderen ersetzen Schuppen, Bauch, Flügelhaut, Hörner/Platten, Krallen und das Glühen der Augen:
// Blau mit Silberhörnern und eisblauem Glühen, Schwarz mit dunklem Weinrot und violettem Glühen, Weiß mit
// cremefarbenem Bauch, Goldhörnern und hellblauem Glühen.
const DRACHE3_FARBEN = {
  rot: {},
  blau: {
    scale: '#1d3c6e', scaleHi: '#3264a0', scaleDark: '#10244a',
    belly: '#cfdde6', bellyLine: '#97b2c4',
    bronze: '#8f9db0', bronzeHi: '#d6e0ea', bronzeDark: '#55627a',
    memTop: '#17305a', memUnder: '#4f8cc2',
    claw: '#eef5fa', eye: '#7fe0ff', eyeCore: '#effcff'
  },
  schwarz: {
    scale: '#1c1920', scaleHi: '#353040', scaleDark: '#0e0c11',
    belly: '#5a4652', bellyLine: '#7a5468',
    bronze: '#6e2c42', bronzeHi: '#a8466a', bronzeDark: '#3a1624',
    memTop: '#17131b', memUnder: '#5c2142',
    claw: '#dcd0dc', eye: '#c45cff', eyeCore: '#ffd4f4'
  },
  weiss: {
    scale: '#d6d1c7', scaleHi: '#f4f1ea', scaleDark: '#a39c8f',
    belly: '#f2e2b8', bellyLine: '#cfae72',
    bronze: '#c39a44', bronzeHi: '#f0d27a', bronzeDark: '#86662a',
    memTop: '#c9c3b8', memUnder: '#e8d2a0',
    claw: '#fffaf0', eye: '#8fd8ff', eyeCore: '#ffffff'
  }
};
const dragonColors3 = (id) => Object.assign({}, DRACHE3.colors, DRACHE3_FARBEN[id] || {});

// Knochen
const DRB3 = {
  root: 0, body: 1, head: 2, legFL: 3, legFR: 4, legBL: 5, legBR: 6, tail: 7, wingL: 8, wingR: 9, neck: 10,
  handL: 11, handR: 12, neck2: 13, jaw: 14, tail2: 15, tail3: 16, tail4: 17, lowFL: 18, lowFR: 19, lowBL: 20, lowBR: 21,
  // Hüfte: Hinterbeine und Schwanz hängen daran, der Leib biegt sich weich zwischen Brust und Hüfte
  hips: 36
};
// Flügelknochen je Seite: Arm (Scharnier am Rumpf), Unterarm (ab Ellbogen), Hand (klappt um W–P), Finger 1 in zwei
// Gliedern, Finger 2 und 3, dazu je ein „Segel“ für Innen- und Handteil: es schiebt die Hautmitte quer zur Fläche
// (Wölbung im Luftdruck, Flattern), die Ränder an den Knochen bleiben fest.
const DM_WB3 = (sx) => (sx > 0
  ? { arm: 8, fore: 22, hand: 11, f1a: 24, f1b: 25, f2: 26, f3: 27, sailIn: 28, sailOut: 29 }
  : { arm: 9, fore: 23, hand: 12, f1a: 30, f1b: 31, f2: 32, f3: 33, sailIn: 34, sailOut: 35 });

// Flügel im Grundriss (linker Flügel; x = Abstand von der Scharnierlinie am Rumpf nach außen, z wie im Modell).
// Innenteil: Vorderkante Schulter R0 – Ellbogen E – Handgelenk W, Hinterkante als Bogen von R1 nach P.
// Handteil: Fächer um das Handgelenk W mit drei leicht gebogenen, ungleich langen Fingern und dem Rand W–P;
// zwischen den Fingerspitzen ist der Hinterrand bogenförmig eingebuchtet. Innen- und Handteil teilen sich die
// Kante W–P: um genau diese Linie klappt der Handteil, dort entsteht auch beim Falten kein Spalt.
const WING3 = {
  R0: [0, 0.22], R1: [0, -0.44], E: [0.62, 0.42], W: [1.2, 0.14], P: [0.98, -0.66],
  // Fingerspitzen [x, z] und Biegung (Bogen nach vorn, Anteil der Fingerlänge)
  F: [[2.2, -0.04, 0.06], [1.96, -0.72, 0.05], [1.38, -1.12, 0.04]],
  // Einbuchtung des Hinterrands F1–F2, F2–F3, F3–P und am Innenteil R1–P
  scallop: [0.27, 0.22, 0.15], innerScallop: 0.17,
  // Wölbung der Haut in Ruhe (nach oben bauchig) und halbe Dicke (Ober- und Unterseite)
  camber: 0.05, thick: 0.007,
  // Unterteilung: Fächer (Schritte je Bogen, Ringe), Innenteil (Spanne, Tiefe)
  segA: 10, rings: 6, segS: 10, segT: 5
};

const dmMix2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
// Strahlen des Fächers: drei Finger und der Rand W–P (ohne Finger)
const dmRays3 = () => WING3.F.map(([x, z, bend]) => ({ tip: [x, z], bend })).concat([{ tip: WING3.P, bend: 0 }]);

// Punkt im Handteil: Bogen seg (0: F1–F2, 1: F2–F3, 2: F3–P), u entlang des Bogens (0 = erster Strahl), rho vom
// Handgelenk (0) zum Rand (1). Ergebnis [x, z, Wölbung 0–1]; die Strahlen u = 0 sind die (gebogenen) Finger.
function dmOuterPt3(seg, u, rho) {
  const R = dmRays3();
  const a = R[seg], c = R[seg + 1];
  const W = WING3.W;
  const mid = dmMix2(a.tip, c.tip, 0.5);
  const ix = W[0] - mid[0], iz = W[1] - mid[1];
  const il = Math.hypot(ix, iz);
  const d = WING3.scallop[seg] * Math.sin(Math.PI * u);
  const e = dmMix2(a.tip, c.tip, u);
  const dx = e[0] + (ix / il) * d - W[0], dz = e[1] + (iz / il) * d - W[1];
  const len = Math.hypot(dx, dz);
  // Biegung quer zum Strahl nach vorn, in der Mitte am stärksten
  const bend = (a.bend + (c.bend - a.bend) * u) * len * Math.sin(Math.PI * rho);
  return [W[0] + dx * rho - (dz / len) * bend, W[1] + dz * rho + (dx / len) * bend, Math.sin(Math.PI * u) * Math.sin(0.8 * Math.PI * rho)];
}

// Punkt im Innenteil: s entlang der Spanne (0 Rumpf, 1 Kante W–P), t von der Vorderkante (0) zur Hinterkante (1)
function dmInnerPt3(s, t) {
  const { R0, R1, E, W, P } = WING3;
  const lead = s < 0.5 ? dmMix2(R0, E, s * 2) : dmMix2(E, W, s * 2 - 1);
  const tr = dmMix2(R1, P, s);
  tr[1] += WING3.innerScallop * Math.sin(Math.PI * s);
  const q = dmMix2(lead, tr, t);
  return [q[0], q[1], Math.sin(Math.PI * s) * Math.sin(0.8 * Math.PI * t)];
}

// Knochengewichte im Handteil: zwischen den beiden Strahlen gemischt (Finger 1 innen/außen, Finger 2, 3, Hand am
// Rand W–P); zur Mitte zwischen den Fingern hin wächst der Anteil des Segels
function dmOuterW3(sx, seg, u, rho) {
  const b = DM_WB3(sx);
  const f1b = dmSmooth3((rho - 0.35) / 0.4);
  const ray = [[[b.f1a, 1 - f1b], [b.f1b, f1b]], [[b.f2, 1]], [[b.f3, 1]], [[b.hand, 1]]];
  const sail = 0.85 * Math.sin(Math.PI * u) * Math.sin(0.8 * Math.PI * rho);
  const out = new Map();
  const add = (list, k) => {
    for (const [bn, w] of list) out.set(bn, (out.get(bn) || 0) + w * k);
  };
  add(ray[seg], (1 - u) * (1 - sail));
  add(ray[seg + 1], u * (1 - sail));
  out.set(b.sailOut, (out.get(b.sailOut) || 0) + sail);
  return out;
}
// Innenteil: vom Rumpf (Arm) zum Unterarm überblendet (die Kante W–P gehört ganz zum Unterarm), Mitte am Segel
function dmInnerW3(sx, x, s, t) {
  const b = DM_WB3(sx);
  const fw = dmSmooth3((x - 0.3) / 0.65);
  const sail = 0.8 * Math.sin(Math.PI * s) * Math.sin(0.8 * Math.PI * t);
  return new Map([[b.arm, (1 - fw) * (1 - sail)], [b.fore, fw * (1 - sail)], [b.sailIn, sail]]);
}

// Haut als gewölbte Fläche aus einem Raster (Ober- bzw. Unterseite, je mit eigener Farbe). pt(i, j) → [x, z, Wölbung],
// wt(i, j, x) → Map Knochen → Gewicht. Die Gewichte stehen in der Form (Bake3 übernimmt skinIndex/skinWeight).
function dmSheet3(key, sx, ni, nj, pt, wt, top) {
  return geo3('drache3haut' + key + sx + (top ? 'o' : 'u'), () => {
    const HX = DRACHE3.hx, HY = DRACHE3.hy;
    const pos = [], si = [], sw = [], idx = [];
    const y0 = top ? WING3.thick : -WING3.thick;
    for (let i = 0; i <= ni; i++) {
      for (let j = 0; j <= nj; j++) {
        const [x, z, c] = pt(i, j);
        pos.push(sx * (HX + x), HY + y0 + WING3.camber * c, z);
        const w = [...wt(i, j, x)].filter(([, v]) => v > 1e-4).sort((p, q) => q[1] - p[1]).slice(0, 4);
        const sum = w.reduce((acc, [, v]) => acc + v, 0) || 1;
        for (let k = 0; k < 4; k++) {
          si.push(w[k] ? w[k][0] : 0);
          sw.push(w[k] ? w[k][1] / sum : 0);
        }
      }
    }
    const V = (i, j) => i * (nj + 1) + j;
    // Dreieck so herum, dass die Oberseite nach oben und die Unterseite nach unten zeigt; entartete (Fächermitte) weg
    const tri = (a, b2, c) => {
      const d1x = pos[b2 * 3] - pos[a * 3], d1z = pos[b2 * 3 + 2] - pos[a * 3 + 2];
      const d2x = pos[c * 3] - pos[a * 3], d2z = pos[c * 3 + 2] - pos[a * 3 + 2];
      const ny = d1z * d2x - d1x * d2z;
      if (Math.abs(ny) < 1e-7) return;
      if (ny > 0 === top) idx.push(a, b2, c);
      else idx.push(a, c, b2);
    };
    for (let i = 0; i < ni; i++) {
      for (let j = 0; j < nj; j++) {
        tri(V(i, j), V(i + 1, j), V(i + 1, j + 1));
        tri(V(i, j), V(i + 1, j + 1), V(i, j + 1));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('skinIndex', new THREE.Float32BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
const dmOuterSheet3 = (sx, top) => dmSheet3('aussen', sx, 3 * WING3.segA, WING3.rings, (i, j) => {
  const seg = Math.min(2, Math.floor(i / WING3.segA));
  return dmOuterPt3(seg, (i - seg * WING3.segA) / WING3.segA, j / WING3.rings);
}, (i, j) => {
  const seg = Math.min(2, Math.floor(i / WING3.segA));
  return dmOuterW3(sx, seg, (i - seg * WING3.segA) / WING3.segA, j / WING3.rings);
}, top);
const dmInnerSheet3 = (sx, top) => dmSheet3('innen', sx, WING3.segS, WING3.segT, (i, j) => dmInnerPt3(i / WING3.segS, j / WING3.segT),
  (i, j, x) => dmInnerW3(sx, x, i / WING3.segS, j / WING3.segT), top);

// Gebogener Fingerknochen k (0–2) von rho0 bis rho1, verjüngt; Finger 1 biegt sich in zwei Gliedern
function dmFinger3(sx, k, rho0, rho1, r0, r1) {
  return geo3('drache3finger' + k + sx + ',' + rho0 + ',' + rho1, () => {
    const b = DM_WB3(sx);
    const HX = DRACHE3.hx, HY = DRACHE3.hy;
    const seg = 8, rad = 6;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const [x, z] = dmOuterPt3(k, 0, rho0 + ((rho1 - rho0) * i) / 6);
      pts.push(new THREE.Vector3(sx * (HX + x), HY + 0.012, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
    const P = g.attributes.position;
    const c = new THREE.Vector3();
    const si = [], sw = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      curve.getPointAt(u, c);
      const r = r0 + (r1 - r0) * Math.pow(u, 0.85);
      const rho = rho0 + (rho1 - rho0) * u;
      const f1b = k === 0 ? dmSmooth3((rho - 0.35) / 0.4) : 0;
      const bones = k === 0 ? [b.f1a, b.f1b] : [k === 1 ? b.f2 : b.f3, 0];
      for (let j = 0; j <= rad; j++) {
        const q = i * (rad + 1) + j;
        P.setXYZ(q, c.x + (P.getX(q) - c.x) * r, c.y + (P.getY(q) - c.y) * r, c.z + (P.getZ(q) - c.z) * r);
        si.push(bones[0], bones[1], 0, 0);
        sw.push(1 - f1b, f1b, 0, 0);
      }
    }
    g.setAttribute('skinIndex', new THREE.Float32BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.computeVertexNormals();
    return g;
  });
}

// Leib weich zwischen Brust (body) und Hüfte (hips) gewichtet: so biegt sich der Rücken im Flug ohne Knick
function dmSpine3(key, geo) {
  return geo3('drache3rumpf' + key, () => {
    const g = geo.clone();
    const P = g.attributes.position;
    const si = [], sw = [];
    for (let i = 0; i < P.count; i++) {
      const h = dmSmooth3((0.05 - P.getZ(i)) / 0.5);
      si.push(DRB3.body, DRB3.hips, 0, 0);
      sw.push(1 - h, h, 0, 0);
    }
    g.setAttribute('skinIndex', new THREE.Float32BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return g;
  });
}

// Drehachsen (je Seite, im Raum des Elternknochens): Hand klappt um W–P; Unterarm und Finger heben bzw. senken
// sich um die waagerechte Achse quer zu ihrer eigenen Richtung (+ = Spitze nach oben, auf beiden Seiten)
const DM_AXIS3 = { L: null, R: null };
function dmAxes3() {
  if (DM_AXIS3.L) return DM_AXIS3;
  const lift = (sx, from, to) => new THREE.Vector3(-(to[1] - from[1]), 0, sx * (to[0] - from[0])).normalize();
  for (const [k, sx] of [['L', 1], ['R', -1]]) {
    const [wx, wz] = WING3.W;
    const [px, pz] = WING3.P;
    DM_AXIS3[k] = {
      hand: new THREE.Vector3(sx * (px - wx), 0, pz - wz).normalize(),
      fore: lift(sx, WING3.E, WING3.W),
      f: [0, 1, 2].map((q) => lift(sx, WING3.W, WING3.F[q]))
    };
  }
  return DM_AXIS3;
}

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
// o.saddle: Farbe der Satteldecke (im Spiel später wie beim Pferd die Klassenfarbe); o.color (seit 14.39): Farbe des
// Drachen (rot, blau, schwarz, weiss – DRACHE3_FARBEN)
function dragonMount3(b, o = {}) {
  const A = adder(b, null);
  const C = dragonColors3(o.color);
  const red = C.scale, redHi = C.scaleHi, redD = C.scaleDark;
  const bronze = C.bronze, bronzeHi = C.bronzeHi, bronzeD = C.bronzeDark;
  const cloth = o.saddle || C.saddle;
  const bodyY = DRACHE3.bodyY;
  const HX = DRACHE3.hx, HY = DRACHE3.hy;
  // Flügelpunkt im Modell (linke Seite sx = 1)
  const WP = (sx, [x, z]) => [sx * (HX + x), HY, z];
  const M1 = dmOuterPt3(0, 0, 0.5);
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, 1.74, 1.04], 13],
    [[0.22, 0.9, 0.42], 1], [[-0.22, 0.9, 0.42], 1], [[0.24, 0.95, -0.48], 36], [[-0.24, 0.95, -0.48], 36],
    [[0, 1.0, -0.72], 36], [[HX, HY, -0.1], 1], [[-HX, HY, -0.1], 1], [[0, 1.1, 0.62], 1],
    [WP(1, WING3.W), 22], [WP(-1, WING3.W), 23], [[0, 1.45, 0.9], 10], [[0, 1.71, 1.08], 2],
    [[0, 0.9, -1.16], 7], [[0, 0.77, -1.6], 15], [[0, 0.71, -2.0], 16],
    [[0.27, 0.52, 0.32], 3], [[-0.27, 0.52, 0.32], 4], [[0.3, 0.55, -0.3], 5], [[-0.3, 0.55, -0.3], 6],
    // 22/23 Unterarm (Ellbogen), 24–29 links: Finger 1 innen/außen, Finger 2, 3, Segel innen, Segel außen
    [WP(1, WING3.E), 8], [WP(-1, WING3.E), 9],
    [WP(1, WING3.W), 11], [WP(1, M1), 24], [WP(1, WING3.W), 11], [WP(1, WING3.W), 11], [[HX, HY, -0.1], 8], [WP(1, WING3.W), 11],
    [WP(-1, WING3.W), 12], [WP(-1, M1), 30], [WP(-1, WING3.W), 12], [WP(-1, WING3.W), 12], [[-HX, HY, -0.1], 9], [WP(-1, WING3.W), 12],
    // 36 Hüfte
    [[0, 0.98, -0.38], 1]
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
  A(dmSpine3('leib', loft3(BODY, 14, 4)), red, { bone: DRB3.body, top: redHi, topK: 0.45, shade: 0.25, shine: 0.2 });
  const BELLY = BODY.map(([z, y, w, u, d]) => [z, y - 0.035, w * 0.8, u * 0.45, d - 0.02]);
  A(dmSpine3('bauch', loft3(BELLY, 14, 4)), C.belly, { bone: DRB3.body, shade: 0.12 });
  for (let k = 0; k < 9; k++) {
    const z = -0.62 + k * 0.15;
    const [, y, w, , d] = dmStationAt3(BELLY, z);
    const arc = Math.PI * 0.7;
    A(torus3(1, 0.06, arc, 3, 12), C.bellyLine, { bone: z < -0.2 ? DRB3.hips : DRB3.body, p: [0, y, z], r: [0, 0, -Math.PI / 2 - arc / 2], s: [w * 1.01, d * 1.01, 0.25], noShadow: true });
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
  plate(DRB3.hips, 1.24, -0.33, 0.065, 0.08);
  plate(DRB3.hips, 1.22, -0.53, 0.06, 0.075);
  plate(DRB3.hips, 1.17, -0.71, 0.05, 0.07);
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

  // --- Beine (seit 14.41 wie die Pferde aus je einem Stück, softTube3): weiche Querschnitte von der Schulter bzw.
  // Hüfte im Leib bis zum Fuß, die Knochengewichte laufen über die Gelenke ineinander – vorher Kugeln und Stäbe mit
  // sichtbaren Stufen („wie Lego“). Hinten: breiter Oberschenkel, der aus der Hüfte wächst, Knie vorn, Unterschenkel
  // schräg nach hinten zum Sprunggelenk mit Bronzesporn, schlanker Mittelfuß; vorn: Schulter, Oberarm, Ellbogen
  // hinten, Unterarm, Handgelenk. Füße: Ballen mit drei gespreizten Zehen und Krallen, hinten eine Afterkralle.
  // Stationen [x nach außen, y, z, halbe Breite, Tiefe vorn, Tiefe hinten, Knochen, Farbe]; Knochen und Gelenkpunkte
  // (und damit alle Bewegungen) wie bisher.
  const legShadow = (bone, p, sc) => {
    if (b.skinned) shadowPart(b, sphere3(1, 6, 4), new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion(), new THREE.Vector3(...sc)), { bone });
  };
  const mid = mixColor(red, redD, 0.5);
  const foot = (bone, sx, x, y, z, k, spur) => {
    // Ballen: flach, nach vorn breiter; Zehen fächern nach vorn aus, Krallen an den Spitzen
    A(softTube3([
      { p: [x, y + 0.045, z - 0.075], rx: 0.04 * k, rf: 0.03, rb: 0.03, w: [bone], c: redD },
      { p: [x, y + 0.035, z - 0.01], rx: 0.058 * k, rf: 0.035, rb: 0.03, w: [bone], c: redD },
      { p: [x, y + 0.028, z + 0.06], rx: 0.065 * k, rf: 0.027, rb: 0.024, w: [bone], c: redD },
      { p: [x, y + 0.025, z + 0.09], rx: 0.045 * k, rf: 0.016, rb: 0.016, w: [bone], c: redD }
    ], { rad: 10, sub: 2, side: [1, 0, 0] }), null, { bone, shade: 0.1, noShadow: true });
    for (const t of [-1, 0, 1]) {
      const r0 = [x + t * 0.036 * k, y + 0.028, z + 0.05];
      const tip = [x + t * 0.075 * k, y + 0.018, z + 0.15 - Math.abs(t) * 0.025];
      const m = [(r0[0] + tip[0]) / 2, y + 0.034, (r0[2] + tip[2]) / 2];
      A(softTube3([
        { p: r0, rx: 0.022 * k, rf: 0.02, w: [bone], c: redD },
        { p: m, rx: 0.019 * k, rf: 0.018, w: [bone], c: redD },
        { p: tip, rx: 0.016 * k, rf: 0.014, w: [bone], c: redD }
      ], { rad: 6, sub: 2, side: [1, 0, 0] }), null, { bone, noShadow: true });
      pointAt3(A, horn3(0.07, 0.016, 5), C.claw, [tip[0], tip[1] + 0.004, tip[2] - 0.006], [t * 0.35, -0.55, 1], { bone, shine: 0.5, noShadow: true });
    }
    if (spur) pointAt3(A, horn3(0.05, 0.013, 5), C.claw, [x + sx * 0.03, y + 0.06, z - 0.07], [sx * 0.4, -0.6, -1], { bone, shine: 0.5, noShadow: true });
  };
  for (const sx of [-1, 1]) {
    const up = sx > 0 ? DRB3.legFL : DRB3.legFR;
    const lo = sx > 0 ? DRB3.lowFL : DRB3.lowFR;
    const xf = sx * 0.24;
    const FRONT = [
      [-0.05, 1.0, 0.43, 0.08, 0.11, 0.11, [DRB3.body, up, 0.25], red], [0.0, 0.88, 0.42, 0.1, 0.13, 0.135, [DRB3.body, up, 0.65], red],
      [0.02, 0.74, 0.39, 0.092, 0.11, 0.115, [up], red], [0.03, 0.6, 0.345, 0.075, 0.08, 0.085, [up], red],
      [0.03, 0.52, 0.325, 0.066, 0.068, 0.078, [up, lo, 0.5], red], [0.025, 0.4, 0.35, 0.058, 0.06, 0.058, [lo], mid],
      [0.02, 0.26, 0.39, 0.048, 0.05, 0.046, [lo], redD], [0.02, 0.15, 0.42, 0.046, 0.05, 0.044, [lo], redD], [0.02, 0.09, 0.44, 0.05, 0.05, 0.05, [lo], redD]
    ];
    A(softTube3(FRONT.map(([dx, y, z, rx, rf, rb, w, c]) => ({ p: [xf + sx * dx, y, z], rx, rf, rb, w, c })), { rad: 14, sub: 3 }), null, { bone: up, top: redHi, topK: 0.4, shade: 0.12, shine: 0.15, noShadow: true });
    legShadow(up, [sx * 0.25, 0.72, 0.38], [0.1, 0.22, 0.12]);
    legShadow(lo, [sx * 0.26, 0.28, 0.38], [0.06, 0.2, 0.06]);
    pointAt3(A, horn3(0.07, 0.018, 5), bronze, [sx * 0.27, 0.53, 0.25], [0, 0.2, -1], { bone: lo, shine: 0.6, noShadow: true });
    foot(lo, sx, sx * 0.26, 0.02, 0.46, 1, false);

    const hu = sx > 0 ? DRB3.legBL : DRB3.legBR;
    const hl = sx > 0 ? DRB3.lowBL : DRB3.lowBR;
    const xh = sx * 0.24;
    const HIND = [
      [-0.05, 1.05, -0.47, 0.08, 0.14, 0.16, [DRB3.hips, hu, 0.25], red], [0.01, 0.95, -0.45, 0.122, 0.18, 0.21, [DRB3.hips, hu, 0.6], red],
      [0.035, 0.83, -0.42, 0.135, 0.18, 0.2, [DRB3.hips, hu, 0.88], red], [0.045, 0.7, -0.375, 0.108, 0.13, 0.14, [hu], red],
      [0.055, 0.58, -0.32, 0.085, 0.085, 0.09, [hu], red], [0.06, 0.52, -0.31, 0.074, 0.075, 0.085, [hu, hl, 0.5], red],
      [0.055, 0.42, -0.39, 0.064, 0.06, 0.075, [hl], mid], [0.05, 0.3, -0.5, 0.054, 0.048, 0.07, [hl], redD],
      [0.05, 0.22, -0.56, 0.05, 0.045, 0.07, [hl], redD], [0.05, 0.14, -0.53, 0.042, 0.042, 0.045, [hl], redD],
      [0.05, 0.08, -0.5, 0.046, 0.048, 0.048, [hl], redD]
    ];
    A(softTube3(HIND.map(([dx, y, z, rx, rf, rb, w, c]) => ({ p: [xh + sx * dx, y, z], rx, rf, rb, w, c })), { rad: 14, sub: 3 }), null, { bone: hu, top: redHi, topK: 0.4, shade: 0.12, shine: 0.15, noShadow: true });
    legShadow(hu, [sx * 0.27, 0.82, -0.42], [0.13, 0.24, 0.18]);
    legShadow(hl, [sx * 0.29, 0.3, -0.48], [0.06, 0.2, 0.08]);
    pointAt3(A, horn3(0.07, 0.017, 5), bronze, [sx * 0.29, 0.24, -0.62], [0, 0.35, -1], { bone: hl, shine: 0.6, noShadow: true });
    foot(hl, sx, sx * 0.29, 0.02, -0.45, 1.05, true);
  }

  // --- Flügel: gewölbte Haut (Ober- und Unterseite) mit fließenden Knochengewichten, Vorderkante aus Ober- und
  // Unterarm, drei gebogene Finger (rot, zur Spitze Bronze), Daumenkralle und Kralle an der Spitze von Finger 1
  for (const sx of [-1, 1]) {
    const wb = DM_WB3(sx);
    const at = ([x, z], dy = 0.014) => [sx * (HX + x), HY + dy, z];
    for (const top of [true, false]) {
      const col = top ? C.memTop : C.memUnder;
      A(dmInnerSheet3(sx, top), col, { bone: wb.arm, noShadow: true });
      A(dmOuterSheet3(sx, top), col, { bone: wb.hand, noShadow: true });
    }
    limbBetween(A, at(WING3.R0), at(WING3.E), 0.07, 0.05, red, { bone: wb.arm, top: redHi, topK: 0.4 });
    limbBetween(A, at(WING3.E), at(WING3.W), 0.05, 0.04, red, { bone: wb.fore, top: redHi, topK: 0.4 });
    A(ball(10), redD, { bone: wb.fore, p: at(WING3.E), s: 0.055 });
    A(ball(10), redD, { bone: wb.hand, p: at(WING3.W), s: 0.048 });
    pointAt3(A, horn3(0.13, 0.03, 6), bronze, at(WING3.W, 0.03), [sx * 0.25, 0.35, 1], { bone: wb.hand, shine: 0.7, noShadow: true });
    for (let k = 0; k < 3; k++) {
      const r0 = k ? 0.026 : 0.034;
      A(dmFinger3(sx, k, 0, 0.56, r0, r0 * 0.7), redD, { bone: wb.hand, noShadow: true });
      A(dmFinger3(sx, k, 0.54, 1, r0 * 0.72, 0.008), bronzeD, { bone: wb.hand, shine: 0.4, noShadow: true });
    }
    const [tx, tz] = dmOuterPt3(0, 0, 1);
    pointAt3(A, horn3(0.08, 0.016, 5), bronze, at([tx, tz], 0.012), [sx * 0.9, 0, -0.2], { bone: wb.f1b, shine: 0.7, noShadow: true });
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

// Flügelschlag: schneller, kräftiger Abschlag (42 % des Zyklus), langsamer Aufschlag. dmFlap3(ph)[0] ist der
// Winkel des Arms um die Scharnierlinie (+ = oben). Unterarm, Finger und Fingerspitzen folgen ihm jeweils etwas
// später (Welle von innen nach außen), siehe dragonMountPose3.
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

// Flügel-Haltung beider Seiten. Zwei Haltungen werden nach o.open gemischt:
// - angelegt (Stand): Arm gehoben und nach hinten geschwenkt, Unterarm nach hinten, Finger wie ein Fächer
//   geschlossen; locker statt steif: atmet mit, die Finger spielen leicht, alle paar Sekunden streckt sich der
//   Drache (Flügel halb auf) und schüttelt sie kurz aus – der rechte Flügel etwas später als der linke.
// - Flügelschlag: Unterarm, Finger 1–3 und die Spitze von Finger 1 folgen dem Arm jeweils etwas später (Welle von
//   innen nach außen, die Spitze zieht nach). Im Abschlag drückt der Luftdruck die Hautmitte nach oben, im
//   Aufschlag falten Hand und Finger weich ein und die Haut sinkt; beim Gleiten (vorwärts, alle paar Sekunden)
//   bleiben die Flügel fast still, dafür flattert der Hinterrand.
const _dmQa = new THREE.Quaternion();
const _dmQb = new THREE.Quaternion();
const _dmUp = new THREE.Vector3(0, 1, 0);
function dmWings3(B, t, o) {
  const AX = dmAxes3();
  const FO = DRACHE3.fold;
  const { open, ph, flare, mov, L, idle, breath } = o;
  const climb = o.climb || 0;
  const ow = dmSmooth3(open * 1.25);
  // Gleiten (seit 14.39 auch beim Sinken auf die tiefe Flughöhe; beim Steigen nie)
  const gt = (t % DRACHE3.glideEvery) / DRACHE3.glideEvery;
  const glide = Math.max((o.sink || 0) * L, (1 - climb) * mov * L * (gt > DRACHE3.glideFrom && gt < DRACHE3.glideTo ? Math.sin((Math.PI * (gt - DRACHE3.glideFrom)) / (DRACHE3.glideTo - DRACHE3.glideFrom)) : 0));
  // Steigen: weiter ausholende Schläge
  const amp = (1 - 0.85 * glide) * (1 + 0.18 * climb * L);
  const Af = (p) => 0.12 + (dmFlap3(((p % 1) + 1) % 1)[0] - 0.12) * amp;
  const a0 = Af(ph), a1 = Af(ph - 0.06), a2 = Af(ph - 0.12), a3 = Af(ph - 0.18);
  const down = ph < DM_DOWN3 ? Math.sin((Math.PI * ph) / DM_DOWN3) : 0;
  const up = ph >= DM_DOWN3 ? Math.sin((Math.PI * (ph - DM_DOWN3)) / (1 - DM_DOWN3)) : 0;
  const flutter = (0.25 + glide) * (0.6 * Math.sin(t * 29) + 0.4 * Math.sin(t * 43 + 1.3));
  const fly = {
    arm: a0 * (1 + 0.15 * flare), sweep: -0.05 + 0.08 * mov - 0.12 * up * amp, tilt: 0, armZ: 1, handZ: 1,
    foreLift: 0.9 * (a1 - a0), foreFold: 0.18 * up * amp,
    hand: 0.45 * up * amp * (1 - 0.5 * flare),
    // Heben: Finger 1 innen, Finger 1 außen, Finger 2, Finger 3
    lift: [0.85 * (a2 - a1), 0.9 * (a3 - a2), 0.7 * (a2 - a1), 0.5 * (a2 - a1)],
    fan: [0.32 * up * amp - 0.1 * flare, 0.2 * up * amp - 0.06 * flare, 0.08 * up * amp],
    sailIn: (0.07 * down - 0.04 * up) * amp + 0.006 * flutter + 0.04 * flare,
    sailOut: (0.11 * down - 0.06 * up) * amp + 0.016 * flutter + 0.07 * flare
  };
  for (const sx of [1, -1]) {
    // Strecken und Ausschütteln im Stand
    const tau = (((t - DRACHE3.stretchAt + (sx < 0 ? 0.35 : 0)) % DRACHE3.stretchEvery) + DRACHE3.stretchEvery) % DRACHE3.stretchEvery;
    const lazy = idle * (1 - ow);
    const st = (tau < 2.2 ? Math.pow(Math.sin((Math.PI * tau) / 2.2), 2) : 0) * lazy;
    const sh = (tau > 1.9 && tau < 2.6 ? Math.sin((Math.PI * (tau - 1.9)) / 0.7) * Math.sin(tau * 34) : 0) * lazy;
    const rest = {
      arm: FO.arm + 0.03 * breath + 0.45 * st + 0.05 * sh, sweep: FO.sweep - 0.35 * st, tilt: FO.tilt,
      armZ: dmLerp3(FO.armZ, 1, st), foreLift: 0.05 * st, foreFold: FO.fore * (1 - 0.6 * st),
      hand: FO.hand * (1 - 0.75 * st) + 0.15 * sh, handZ: dmLerp3(FO.handZ, 1, st),
      lift: [-0.05 + 0.2 * st, 0.1 * st + 0.08 * sh, 0.02, 0],
      fan: FO.fan.map((f, k) => f * (1 - 0.65 * st) + 0.035 * Math.sin(t * 0.7 + k * 1.1)),
      sailIn: 0.008 * breath + 0.03 * sh, sailOut: 0.01 * breath + 0.05 * sh
    };
    const m = (k) => dmLerp3(rest[k], fly[k], ow);
    const ma = (k, i) => dmLerp3(rest[k][i], fly[k][i], ow);
    const wb = DM_WB3(sx);
    const ax = AX[sx > 0 ? 'L' : 'R'];
    B[wb.arm].rotation.set(m('tilt'), sx * m('sweep'), sx * m('arm'));
    B[wb.arm].scale.z = m('armZ');
    B[wb.fore].quaternion.copy(_dmQa.setFromAxisAngle(_dmUp, sx * m('foreFold'))).multiply(_dmQb.setFromAxisAngle(ax.fore, m('foreLift')));
    B[wb.hand].quaternion.setFromAxisAngle(ax.hand, sx * m('hand'));
    B[wb.hand].scale.z = m('handZ');
    const fingers = [[wb.f1a, 0, 0], [wb.f2, 1, 2], [wb.f3, 2, 3]];
    for (const [bn, k, li] of fingers) {
      B[bn].quaternion.copy(_dmQa.setFromAxisAngle(_dmUp, sx * ma('fan', k))).multiply(_dmQb.setFromAxisAngle(ax.f[k], ma('lift', li)));
    }
    B[wb.f1b].quaternion.setFromAxisAngle(ax.f[0], ma('lift', 1));
    B[wb.sailIn].position.y += m('sailIn');
    B[wb.sailOut].position.y += m('sailOut');
  }
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
  // seit 14.39: Steigen (o.climb) und Sinken/Gleiten (o.sink) zwischen den Flughöhen, je 0–1
  const climb = o.climb || 0;
  const sink = o.sink || 0;
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
  body.rotation.x = L * (mov ? 0.1 : -0.03) - 0.32 * flare * dmSmooth3(air * 4) + 0.03 * Math.sin(TAU * (ph - 0.3)) * L - 0.16 * climb * L + 0.07 * sink * L;
  B[DRB3.root].rotation.z = 0.05 * Math.sin(t * 0.8) * L;

  // Flügel
  dmWings3(B, t, { open, ph, flare, mov, L, idle, breath, climb, sink });

  // Hals und Kopf: im Stand aufrecht mit ruhigem Atmen und Umschauen, im Flug weiter vorgestreckt
  // Welle im Flug: Hals schwingt im Flügeltakt gegen den Rumpf, der Kopf hält die Blickrichtung
  const n1 = 0.07 * Math.sin(TAU * ph + 0.8) * L * open;
  const n2 = 0.08 * Math.sin(TAU * ph - 0.3) * L * open;
  const sway = Math.sin(t * 1.3);
  B[DRB3.neck].rotation.x = idle * (0.03 * Math.sin(t * 1.5 + 0.6)) + L * 0.28 + n1 - 0.15 * flare + 0.12 * crouch;
  B[DRB3.neck2].rotation.x = L * 0.12 + n2 - 0.1 * flare;
  B[DRB3.head].rotation.x = idle * 0.04 * Math.sin(t * 0.7) - L * 0.42 - 0.8 * (n1 + n2) + 0.2 * flare - body.rotation.x * 0.5;
  B[DRB3.neck].rotation.y = idle * 0.1 * Math.sin(t * 0.33 - 0.5) + L * 0.07 * Math.sin(t * 1.3 + 0.6);
  B[DRB3.neck2].rotation.y = L * 0.08 * Math.sin(t * 1.3 - 0.2);
  B[DRB3.head].rotation.y = idle * 0.32 * Math.sin(t * 0.33) - L * 0.1 * Math.sin(t * 1.3 - 0.2);
  // Rücken: die Hüfte wiegt sich gegen die Brust (im Stand nur ein Hauch Atmen)
  B[DRB3.hips].rotation.x = L * 0.07 * Math.sin(TAU * ph - 1.2) * open + idle * 0.01 * breath;
  B[DRB3.hips].rotation.y = L * 0.06 * Math.sin(t * 1.3 - 0.9);
  body.rotation.y = L * 0.03 * sway;
  // Maul öffnet sich ab und zu ein wenig (im Stand), beim Abheben kurz weit
  const jt = (t + 2.3) % 9.5;
  B[DRB3.jaw].rotation.x = idle * (jt < 1 ? 0.22 * Math.sin(Math.PI * jt) : 0) + 0.3 * crouch;

  // Schwanz: im Stand hängt er und pendelt langsam, im Flug gestreckt mit Welle
  const tails = [DRB3.tail, DRB3.tail2, DRB3.tail3, DRB3.tail4];
  for (let k = 0; k < 4; k++) {
    const bn = B[tails[k]];
    const droop = [-0.1, -0.18, -0.12, 0.12][k];
    bn.rotation.x = (1 - L) * droop + L * (0.06 + 0.12 * Math.sin(TAU * ph - 0.9 * (k + 1))) + flare * 0.12;
    bn.rotation.y = (1 - L) * (0.1 + 0.04 * k) * Math.sin(t * 0.9 - k * 0.6) + L * (0.07 + 0.05 * k) * Math.sin(t * 1.6 - k * 0.9);
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
  // seit 14.32: Gehen am Boden (Drache in Dungeons, Instanzen, Arenen): Diagonalgang wie eine Echse – vorne links mit
  // hinten rechts, dann umgekehrt; der Rumpf wiegt sich, der Schwanz pendelt weiter aus, Flügel bleiben angelegt
  const walk = (o.walk || 0) * (1 - L);
  if (walk > 0.01) {
    const wp = TAU * (o.wph || 0);
    const sA = Math.sin(wp);
    const sB = Math.sin(wp + Math.PI);
    const lift = (x) => Math.max(0, Math.cos(x));
    const step = [[DRB3.legFL, DRB3.lowFL, sA, wp, 1], [DRB3.legBR, DRB3.lowBR, sA, wp, -1], [DRB3.legFR, DRB3.lowFR, sB, wp + Math.PI, 1], [DRB3.legBL, DRB3.lowBL, sB, wp + Math.PI, -1]];
    for (const [u, l, sw, ph, dir] of step) {
      B[u].rotation.x += walk * 0.42 * sw * dir;
      B[l].rotation.x += walk * (dir > 0 ? -0.55 : 0.45) * lift(ph);
    }
    body.position.y += walk * 0.035 * Math.abs(Math.cos(wp));
    B[DRB3.root].rotation.z += walk * 0.035 * sA;
    body.rotation.y += walk * 0.05 * sA;
    B[DRB3.hips].rotation.y += -walk * 0.07 * sA;
    B[DRB3.neck].rotation.x += walk * 0.08;
    B[DRB3.head].rotation.x += -walk * 0.04 * Math.abs(sA);
    for (let k = 0; k < 4; k++) B[tails[k]].rotation.y += walk * (0.08 + 0.04 * k) * Math.sin(wp - k * 0.7);
  }
  if (idle > 0.01 && walk < 0.5) {
    B[DRB3.legBR].rotation.x += -0.08 * idle * (1 - walk * 2);
    B[DRB3.lowBR].rotation.x += 0.16 * idle * (1 - walk * 2);
  }
  return { lift: rise * a.model.scale, L };
}

// Mit Zustand (für das Spiel): want = 'fly' oder 'stand'. Abheben/Landen laufen als Übergang von a.dm.air;
// a.dm.mode ist 'stand' | 'takeoff' | 'fly' | 'land'.
function dragonMountAnim3(a, t, dt, want, moving, hiDir) {
  const S = a.dm || (a.dm = { air: 0, open: 0, ph: 0, flare: 0, mode: 'stand' });
  // seit 14.39: Wechsel der Flughöhe (hiDir +1 steigt, -1 sinkt), weich ein- und ausgeblendet
  const hk = Math.min(1, Math.max(0, dt) * 5);
  S.climb = (S.climb || 0) + ((hiDir > 0 ? 1 : 0) - (S.climb || 0)) * hk;
  S.sink = (S.sink || 0) + ((hiDir < 0 ? 1 : 0) - (S.sink || 0)) * hk;
  // seit 14.32: Gehen am Boden (want 'stand' und in Bewegung): Schrittphase und weiches Ein-/Ausblenden
  const walking = want !== 'fly' && moving;
  S.walk = (S.walk || 0) + ((walking ? 1 : 0) - (S.walk || 0)) * Math.min(1, dt * 7);
  S.wph = ((S.wph || 0) + dt * DRACHE3.hzWalk * (S.walk > 0.02 ? 1 : 0)) % 1;
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
  let hz = S.mode === 'takeoff' ? DRACHE3.hzLift : S.mode === 'land' ? DRACHE3.hzHover : moving ? DRACHE3.hzMove : DRACHE3.hzHover;
  hz += (DRACHE3.hzClimb - hz) * S.climb + (DRACHE3.hzSink - hz) * S.sink * (1 - S.climb);
  if (S.open > 0) S.ph = (S.ph + dt * hz) % 1;
  // angelegt: Phase auf „Flügel oben“ zurücklaufen lassen, damit das nächste Abheben mit dem Abschlag beginnt
  else S.ph = 0;
  return dragonMountPose3(a, t, { air: S.air, open: S.open, ph: S.ph, flare: S.flare, moving: moving && want === 'fly', walk: S.walk, wph: S.wph, climb: S.climb, sink: S.sink });
}
// seit 14.39: zusätzliche Höhe (Welt) und Richtung für die Flughöhe „hoch“ (dragonHighK, spieler.js)
function dragonHigh3(p) {
  const k = typeof dragonHighK === 'function' ? dragonHighK(p) : 0;
  return { h: k * DRACHE3.high, k, dir: p.__fhDir || 0 };
}
// Schatten des Drachen: bleibt am Boden, wird mit der Höhe kleiner und hoch oben blasser (eigener Stoff je Drache)
function dragonBlob3(d, lift, k) {
  d.blob.position.y = 0.02 - d.group.position.y / (d.group.scale.y || 1);
  d.blob.scale.setScalar(d.model.blob * (1 - 0.35 * Math.min(1, lift / 2.5)) * (1 - 0.25 * k));
  if (!d.blobOwn) {
    d.blob.material = d.blob.material.clone();
    d.blobOwn = true;
  }
  d.blob.material.opacity = 1 - 0.5 * k;
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

// --- Im Spiel (seit 14.26) ---------------------------------------------------------------------------------------
// Der Drache unter dem Reiter (eigener Spieler und Mitspieler, drei-figuren.js → syncPlayer3). Eigener Modellschlüssel
// je Sattelfarbe (Klassenfarbe); der Sattel liegt genau über der Spielerstelle. Gerittene Drachen bleiben immer in
// der Luft (schweben im Stand, fliegen beim Laufen), damit sie nie auf Wasser oder in Bäumen „stehen“; beim
// Aufsitzen heben sie vom Boden ab. Nach dem Absitzen landet der Drache an Ort und Stelle und blendet aus.
const DRAGON_LAND3 = 1.7;
function dragonActor3(p, key) {
  const trim = CLASSES[p.classId].trim;
  // seit 14.39 je Drachenfarbe ein eigenes Modell (Rot behält den alten Schlüssel)
  const col = typeof dragonColorOf === 'function' ? dragonColorOf(p) : 'rot';
  return actorFor(key, 'drache:' + (col === 'rot' ? '' : col + ':') + trim, (b) => dragonMount3(b, { saddle: trim, color: col }));
}
// Reitender Spieler: Drache stellen und bewegen; liefert die Höhe für den Reiter (Hüfte im Sattel) und spreizt
// dessen Beine um den Rumpf
function rideDragon3(p, a, B, t, fy) {
  const key = entityKey(p) + 'h3';
  const d = dragonActor3(p, key);
  if (!d) return 0;
  p.__drOn = key;
  p.__drLand = null;
  resetBones(d);
  d.group.visible = a.group.visible;
  if (d.alpha !== 1) setActorAlpha(d, 1);
  // frisch gerufen (neu oder aus dem Vorrat): am Boden beginnen und abheben
  if (!d.dm || d.dmKey !== key || t - (d.dmAt || -9) > 0.5) {
    d.dm = { air: 0, open: 0, ph: 0, flare: 0, mode: 'stand' };
    d.dmKey = key;
    d.dAt = t;
  }
  const dt = Math.min(0.1, Math.max(0, t - (d.dAt ?? t)));
  d.dAt = t;
  d.dmAt = t;
  // Sattel über die Spielerstelle: der Drache steht um den Sattelversatz weiter hinten
  const h = a.heading;
  const off = DRACHE3.seat[2] * d.model.scale;
  // seit 14.39: Flughöhe „hoch“ hebt den ganzen Drachen samt Reiter (Schatten bleibt am Boden)
  const hi = dragonHigh3(p);
  d.group.position.set(p.x * U3 - Math.sin(h) * off, hi.h, fy * U3 - Math.cos(h) * off);
  d.group.rotation.y = h;
  // seit 14.32: wo er nicht fliegen darf (p.dragonGround: Dungeon, Instanz, Arena, Duell), steht und geht er am Boden
  const r = dragonMountAnim3(d, t, dt, p.dragonGround ? 'stand' : 'fly', !!p.moving, hi.dir);
  dragonBlob3(d, r.lift + hi.h, hi.k);
  const s = dragonSeat3(d);
  B[BH.legL].rotation.set(-0.95, 0, 1.12);
  B[BH.legR].rotation.set(-0.95, 0, -1.12);
  const ride = s.pos.y - a.model.hipY * a.model.scale + 0.03;
  a.rideH3 = ride;
  return ride;
}
// Nach dem Absitzen: der Drache landet dort, wo er war, und blendet in der letzten halben Sekunde aus
function dragonLand3(p, t) {
  const key = p.__drOn;
  const d = key && actors3.get(key);
  if (!d) {
    p.__drOn = null;
    p.__drLand = null;
    return;
  }
  // seit 14.39: aus der hohen Flughöhe dauert es um das Sinken länger
  if (!p.__drLand) p.__drLand = { t0: t, dur: DRAGON_LAND3 + (typeof DRAGON_HIGH !== 'undefined' ? (p.__fhK || 0) * DRAGON_HIGH.down : 0) };
  const k = t - p.__drLand.t0;
  const dur = p.__drLand.dur;
  if (k > dur) {
    // nicht mehr als gesehen markieren: v3SyncActors legt ihn in den Vorrat
    p.__drOn = null;
    p.__drLand = null;
    return;
  }
  d.seen = true;
  resetBones(d);
  const dt = Math.min(0.1, Math.max(0, t - (d.dAt ?? t)));
  d.dAt = t;
  d.dmAt = t;
  // seit 14.39: aus der hohen Flughöhe erst sinken (dragonHighK läuft nach dem Absteigen auf 0), dann landen
  const hi = dragonHigh3(p);
  d.group.position.y = hi.h;
  const r = dragonMountAnim3(d, t, dt, hi.h > 0.05 ? 'fly' : 'stand', false, hi.dir);
  dragonBlob3(d, r.lift + hi.h, hi.k);
  setActorAlpha(d, Math.max(0.02, 1 - dmSmooth3((k - (dur - 0.5)) / 0.5)));
}
