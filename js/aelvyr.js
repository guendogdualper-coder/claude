// Aelvyr, Wyrm des Abgrunds (seit 14.68): eigenes 3D-Modell, eigene Animation und eigene Effekte des Endbosses von
// Karte 10 (Kristallabgrund, Halle raid_aelvyr). Vorher stand dort der allgemeine Vierbeiner-Drache (beast3) nur
// vergrößert: flach, einfarbig blau, Brettflügel, und der rechte Flügel war von allen Seiten schwarz (gespiegelte Teile,
// siehe mergeRaw in drei-kern.js).
//
// Aussehen: tief nachtblau bis violett, dunkler als der Hallenboden, mit leuchtenden Kristalladern (Rumpf, Hals, Schwanz,
// Flughaut) und Kristallen zwischen den Rückenstacheln. Langer, schlanker Hals aus vier Gliedern, kantiger Kopf (sechs-
// eckiger Querschnitt) mit Brauenwulst, leuchtenden Augen, Zähnen, aufklappbarem Kiefer und zwei Paar geschwungenen
// Hörnern, Wangen- und Kinnstacheln; segmentierter Leib mit Bauchplatten und Schulterpanzern; Stachelkamm vom Kopf bis zur
// Schwanzspitze mit Kristallklinge; vier kräftige Beine mit Krallen; echte Flügel aus Arm, Unterarm und vier Fingern mit
// doppelseitiger Flughaut (Ober- und Unterseite eigene Flächen, keine schwarzen Rückseiten), die sich falten lassen.
//
// Maße (Modell × AEL3.scale × raid.scale 2,3 = Welt, ein Spieler ist 1,64 hoch): Kopf etwa 5,8, Hornspitzen etwa 7,
// Spannweite etwa 16, Länge Nase–Schwanzspitze etwa 14,5 Einheiten (vorher: 4,2 hoch, Spannweite 9; Abaddor 7,5 hoch).
// Der Kampfkreis bleibt (r 74): Treffer, Reichweiten und Zielwahl wie bisher.
// Animation (aelAnim3, statt animateCreature): Atmen, Hals- und Schwanzschwingen, Kopf folgt dem Ziel, Laufen, Flügel
// falten und schlagen, Biss / Klauenhieb / Schwanzfeger im Wechsel, Brüllen (Kampfbeginn, Phasenwechsel), je Endboss-
// Angriff eine eigene Pose (Atem, Aufsteigen und Flügelstoß, Aufbäumen, Sprung, Sturm, Vernichtung im Flug) und der Tod
// (Aufbäumen, Zusammensinken, Kristalle zerspringen). Effekte (aelFx3) in 3D: Abgrund-Atem als Kegel mit Teilchen,
// herabstürzende Kristallsplitter, Druckwelle aus Staub, Dampf beim Brüllen, Splitter beim Tod. Keine Bodenringe.

const AEL3 = {
  scale: 1.0,
  // weicher Schatten unter dem Leib (Modellmaß)
  blob: 1.35,
  hide: '#1b2150', hideTop: '#110f2c', hideD: '#0c0b20', belly: '#3a3466', bellyTop: '#4e4680',
  armor: '#151330', armorTop: '#2c2756', horn: '#26213c', hornTip: '#5c547e', claw: '#cfc6e4', tooth: '#e6e0f2',
  memTop: '#17123a', memTopEdge: '#2c2264', memBot: '#221c4e', memBotEdge: '#3a2e74',
  glow: '#8fdcff', glowV: '#b48cff', eye: '#d8ffff', mouth: '#140a24'
};
const AB3 = {
  root: 0, body: 1, chest: 2, neck1: 3, neck2: 4, neck3: 5, head: 6, jaw: 7, tail1: 8, tail2: 9, tail3: 10, tail4: 11,
  upFL: 12, loFL: 13, upFR: 14, loFR: 15, upBL: 16, loBL: 17, upBR: 18, loBR: 19
};
const AEL_WB3 = (sx) => (sx > 0 ? { arm: 20, fore: 21, f: [22, 23, 24, 25] } : { arm: 26, fore: 27, f: [28, 29, 30, 31] });
// Gelenke (Modell): Hals- und Schwanzkette, Kopf, Beine
const AEL_J3 = {
  body: [0, 1.0, -0.15], chest: [0, 1.12, 0.6], neck1: [0, 1.32, 1.0], neck2: [0, 1.72, 1.32], neck3: [0, 2.12, 1.55], head: [0, 2.45, 1.72],
  headEnd: [0, 2.3, 2.3], tail1: [0, 1.0, -0.85], tail2: [0, 0.82, -1.6], tail3: [0, 0.56, -2.35], tail4: [0.08, 0.34, -3.05], tip: [0.2, 0.2, -3.75],
  fl: [[0.4, 1.0, 0.72], [0.5, 0.56, 0.6], [0.5, 0.13, 0.8]],
  bl: [[0.44, 0.98, -0.5], [0.56, 0.56, -0.2], [0.53, 0.32, -0.62], [0.53, 0.08, -0.46]]
};
// Kopf: liegt geneigt (Schnauze nach vorn unten); Teile des Kopfes in eigenen Koordinaten (Schnauze +z)
const AEL_HEAD3 = { pitch: 0.36, at: [0, 2.43, 1.7], hinge: [0, -0.1, -0.05], size: 1.25 };

// Flügel in seiner Ebene (U von der Schulter nach außen, V nach vorn), um tilt (Rad) nach oben gekippt
const AEL_WING3 = {
  S: [0.3, 1.42, 0.5], tilt: 0.4,
  E: [0.95, -0.25], W: [1.85, 0.12],
  F: [[3.4, -0.32], [3.08, -1.32], [2.42, -2.02], [1.52, -2.32]],
  B: [0.12, -1.58],
  scallop: [0.32, 0.27, 0.21], innerScallop: 0.24, camber: 0.08, thick: 0.009,
  segA: 8, rings: 6, segS: 12, segT: 6
};
const aelSmooth3 = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function aelWingPt3(sx, U, V, c) {
  const W = AEL_WING3;
  const ct = Math.cos(W.tilt), st = Math.sin(W.tilt);
  return [sx * (W.S[0] + U * ct - c * st), W.S[1] + U * st + c * ct, W.S[2] + V];
}
// Handteil: Feld k zwischen Finger k und k+1, u quer (0 = Finger k), rho vom Handgelenk (0) zum Rand (1); [U, V, Wölbung]
function aelOuterPt3(k, u, rho) {
  const { W, F, scallop } = AEL_WING3;
  const a = F[k], c = F[k + 1];
  let ix = W[0] - (a[0] + c[0]) / 2, iz = W[1] - (a[1] + c[1]) / 2;
  const il = Math.hypot(ix, iz);
  ix /= il;
  iz /= il;
  const d = scallop[k] * Math.sin(Math.PI * u);
  const ex = a[0] + (c[0] - a[0]) * u + ix * d, ez = a[1] + (c[1] - a[1]) * u + iz * d;
  return [W[0] + (ex - W[0]) * rho, W[1] + (ez - W[1]) * rho, Math.sin(Math.PI * u) * Math.sin(0.85 * Math.PI * rho)];
}
// Innenteil: s von der Kante Handgelenk–Finger 4 (0) zum Rumpf (1), t von der Vorderkante (0) zur Hinterkante (1)
function aelInnerPt3(s, t) {
  const { W, E, F, B, innerScallop } = AEL_WING3;
  const lead = s < 0.5 ? [W[0] + (E[0] - W[0]) * s * 2, W[1] + (E[1] - W[1]) * s * 2] : [E[0] * (2 - s * 2), E[1] * (2 - s * 2)];
  const tr = [F[3][0] + (B[0] - F[3][0]) * s, F[3][1] + (B[1] - F[3][1]) * s];
  const dx = lead[0] - tr[0], dz = lead[1] - tr[1];
  const dl = Math.hypot(dx, dz) || 1;
  const sc = innerScallop * Math.sin(Math.PI * s);
  tr[0] += (dx / dl) * sc;
  tr[1] += (dz / dl) * sc;
  // zum Rumpf hin senkt sich die Haut auf die Flanke
  return [lead[0] + (tr[0] - lead[0]) * t, lead[1] + (tr[1] - lead[1]) * t, Math.sin(Math.PI * s) * Math.sin(0.85 * Math.PI * t) - 2.6 * s * s * t];
}
// Knochengewichte: Handteil zwischen Unterarm (Handgelenk) und den beiden Fingern, Innenteil zwischen Unterarm, Arm,
// Finger 4 und Rumpf. Entlang der gemeinsamen Kante (Finger 4) sind beide gleich, dort reißt beim Falten nichts auf.
function aelOuterW3(sx, k, u, rho) {
  const b = AEL_WB3(sx);
  return [[b.fore, 1 - rho], [b.f[k], rho * (1 - u)], [b.f[k + 1], rho * u]];
}
function aelInnerW3(sx, s, t) {
  const b = AEL_WB3(sx);
  const lf = 1 - aelSmooth3((s - 0.38) / 0.24);
  return [[b.fore, (1 - t) * lf], [b.arm, (1 - t) * (1 - lf)], [b.f[3], t * (1 - s)], [AB3.body, t * s]];
}

// Gewichte zu skinIndex/skinWeight (höchstens vier, gleiche Knochen zusammengefasst)
function aelPushW3(si, sw, list) {
  const m = new Map();
  for (const [bn, w] of list) if (w > 1e-4) m.set(bn, (m.get(bn) || 0) + w);
  const w = [...m].sort((p, q) => q[1] - p[1]).slice(0, 4);
  const sum = w.reduce((acc, [, v]) => acc + v, 0) || 1;
  for (let k = 0; k < 4; k++) {
    si.push(w[k] ? w[k][0] : 0);
    sw.push(w[k] ? w[k][1] / sum : 0);
  }
}
// Fläche aus einem Raster (Flughaut oder leuchtende Ader darauf): pt(i, j) → [U, V, Wölbung], wt(i, j) → Gewichte,
// col(i, j) → Farbe. top: Oberseite (Dreiecke zeigen nach oben), sonst Unterseite – jede Seite hat ihre eigene Fläche.
const _aelC3 = new THREE.Color();
function aelSheet3(key, sx, ni, nj, pt, wt, col, top, lift = 0) {
  return geo3('ael:haut:' + key + sx + (top ? 'o' : 'u'), () => {
    const W = AEL_WING3;
    const pos = [], si = [], sw = [], cl = [], idx = [];
    const off = (top ? 1 : -1) * (W.thick + lift);
    for (let i = 0; i <= ni; i++) {
      for (let j = 0; j <= nj; j++) {
        const [U, V, c] = pt(i, j);
        pos.push(...aelWingPt3(sx, U, V, c * W.camber + off));
        aelPushW3(si, sw, wt(i, j));
        _aelC3.set(col(i, j));
        cl.push(_aelC3.r, _aelC3.g, _aelC3.b);
      }
    }
    const nx = -sx * Math.sin(W.tilt), ny = Math.cos(W.tilt);
    const V3i = (i, j) => i * (nj + 1) + j;
    const tri = (a, b2, c) => {
      const ax = pos[b2 * 3] - pos[a * 3], ay = pos[b2 * 3 + 1] - pos[a * 3 + 1], az = pos[b2 * 3 + 2] - pos[a * 3 + 2];
      const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const cx = ay * bz - az * by, cz = ax * by - ay * bx, cy = az * bx - ax * bz;
      const d = cx * nx + cy * ny;
      if (Math.abs(d) < 1e-9 && Math.abs(cz) < 1e-9) return;
      if (d > 0 === top) idx.push(a, b2, c);
      else idx.push(a, c, b2);
    };
    for (let i = 0; i < ni; i++) {
      for (let j = 0; j < nj; j++) {
        tri(V3i(i, j), V3i(i + 1, j), V3i(i + 1, j + 1));
        tri(V3i(i, j), V3i(i + 1, j + 1), V3i(i, j + 1));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.setAttribute('skinIndex', new THREE.Float32BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

// Form mit eigenen Knochengewichten: fn(x, y, z) → [[Knochen, Gewicht], …]. Die Form liegt schon im Modellraum.
function aelSkin3(key, geo, fn) {
  return geo3('ael:skin:' + key, () => {
    const g = geo.clone();
    // keine volle Fassung mitnehmen (lodBig3 würde sie ohne Gewichte einsetzen)
    g.userData = {};
    const P = g.attributes.position;
    const si = [], sw = [];
    for (let i = 0; i < P.count; i++) aelPushW3(si, sw, fn(P.getX(i), P.getY(i), P.getZ(i)));
    g.setAttribute('skinIndex', new THREE.Float32BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return g;
  });
}
// Gewichte entlang einer Gelenkkette [[Knochen, Punkt], …]: das Stück zwischen Gelenk k und k+1 gehört Knochen k,
// über jedem Gelenk weich zwischen beiden überblendet
function aelChainW3(chain, x, y, z) {
  let best = 1e9, bu = 0;
  for (let k = 0; k < chain.length - 1; k++) {
    const a = chain[k][1], b = chain[k + 1][1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const l2 = dx * dx + dy * dy + dz * dz || 1;
    let t = ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / l2;
    if (k > 0) t = Math.max(0, t);
    if (k < chain.length - 2) t = Math.min(1, t);
    const px = a[0] + dx * t - x, py = a[1] + dy * t - y, pz = a[2] + dz * t - z;
    const d = px * px + py * py + pz * pz;
    if (d < best) {
      best = d;
      bu = k + t;
    }
  }
  const g = bu - 0.5;
  const k0 = Math.floor(g);
  const f = g - k0;
  const n = chain.length - 1;
  const bone = (k) => chain[Math.max(0, Math.min(n, k))][0];
  return [[bone(k0), 1 - f], [bone(k0 + 1), f]];
}
const AEL_NECK3 = [[AB3.chest, AEL_J3.chest], [AB3.neck1, AEL_J3.neck1], [AB3.neck2, AEL_J3.neck2], [AB3.neck3, AEL_J3.neck3], [AB3.head, AEL_J3.head], [AB3.head, AEL_J3.headEnd]];
const AEL_TAIL3 = [[AB3.body, AEL_J3.body], [AB3.tail1, AEL_J3.tail1], [AB3.tail2, AEL_J3.tail2], [AB3.tail3, AEL_J3.tail3], [AB3.tail4, AEL_J3.tail4], [AB3.tail4, AEL_J3.tip]];
// Rumpf: hinten in den Schwanz, in der Mitte von der Hüfte (body) zur Brust, vorn in den Hals
function aelBodyW3(x, y, z) {
  const wt = aelSmooth3((-0.72 - z) / 0.42);
  const wn = aelSmooth3((z - 0.86) / 0.3);
  const r = Math.max(0, 1 - wt - wn);
  const c = aelSmooth3((z + 0.1) / 0.55);
  return [[AB3.tail1, wt], [AB3.neck1, wn], [AB3.body, r * (1 - c)], [AB3.chest, r * c]];
}
// stärkster Knochen an einer Stelle (für feste Teile wie Stacheln und Platten)
function aelBoneAt3(fn, p) {
  const w = fn(p[0], p[1], p[2]);
  let bb = w[0][0], bw = -1;
  for (const [bn, v] of w) if (v > bw) { bw = v; bb = bn; }
  return bb;
}
const aelNeckW3 = (x, y, z) => aelChainW3(AEL_NECK3, x, y, z);
const aelTailW3 = (x, y, z) => aelChainW3(AEL_TAIL3, x, y, z);

// Rumpf-Querschnitte [z, Mitte y, halbe Breite, oben, unten]
const AEL_TORSO3 = [
  [-1.3, 0.98, 0.18, 0.18, 0.18], [-0.98, 1.0, 0.29, 0.27, 0.29], [-0.55, 1.03, 0.4, 0.33, 0.37], [-0.15, 1.0, 0.37, 0.32, 0.42],
  [0.25, 1.06, 0.42, 0.36, 0.46], [0.6, 1.14, 0.42, 0.34, 0.43], [0.9, 1.27, 0.3, 0.26, 0.3], [1.1, 1.39, 0.2, 0.18, 0.19]
];
function aelTorsoAt3(z) {
  const st = AEL_TORSO3;
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    if (z >= a[0] && z <= b[0]) {
      const k = (z - a[0]) / (b[0] - a[0]);
      return a.map((v, q) => v + (b[q] - v) * k);
    }
  }
  return st[z < st[0][0] ? 0 : st.length - 1].slice();
}
// Hals und Schwanz als Röhren mit Dickenverlauf
const AEL_NECKP3 = { pts: [[0, 1.2, 0.8], [0, 1.4, 1.06], [0, 1.76, 1.34], [0, 2.12, 1.55], [0, 2.4, 1.68]], r: [0.27, 0.215, 0.165, 0.14, 0.13] };
const AEL_TAILP3 = { pts: [[0, 1.0, -0.95], [0, 0.84, -1.62], [0.04, 0.58, -2.36], [0.12, 0.35, -3.06], [0.2, 0.22, -3.72]], r: [0.25, 0.19, 0.135, 0.085, 0.03] };
// Punkt und Halbmesser auf einer solchen Röhre (u 0…1, nur grob – für Stacheln, Platten und Adern)
// up: Richtung „oben“ quer zur Röhre, ang: Neigung der Röhre (Drehung um x für flache Teile)
function aelTubeAt3(T, u) {
  const n = T.pts.length - 1;
  const f = Math.max(0, Math.min(0.9999, u)) * n;
  const i = Math.floor(f), k = f - i;
  const a = T.pts[i], b = T.pts[i + 1];
  const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  let ty = b[1] - a[1], tz = b[2] - a[2];
  if (tz < 0) { ty = -ty; tz = -tz; }
  const tl = Math.hypot(ty, tz) || 1;
  ty /= tl;
  tz /= tl;
  const r = T.r[i] + (T.r[i + 1] - T.r[i]) * k;
  return { p, r, up: [0, tz, -ty], ang: -Math.atan2(ty, tz) };
}
const aelOn3 = (q, k) => [q.p[0] + q.up[0] * q.r * k, q.p[1] + q.up[1] * q.r * k, q.p[2] + q.up[2] * q.r * k];

// --- Modell ----------------------------------------------------------------------------------------------
function aelvyr3(b) {
  const A = adder(b, null);
  const C = AEL3;
  const J = AEL_J3;
  const rig = [];
  const bone = (pos, parent) => rig.push({ pos, parent });
  bone([0, 0, 0], -1); // 0 root
  bone(J.body, 0); // 1
  bone(J.chest, 1); // 2
  bone(J.neck1, 2); // 3
  bone(J.neck2, 3); // 4
  bone(J.neck3, 4); // 5
  bone(J.head, 5); // 6
  const Mh = new THREE.Matrix4().compose(new THREE.Vector3(...AEL_HEAD3.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(AEL_HEAD3.pitch, 0, 0)), new THREE.Vector3(1, 1, 1).multiplyScalar(AEL_HEAD3.size));
  const hingeW = new THREE.Vector3(...AEL_HEAD3.hinge).applyMatrix4(Mh);
  bone(hingeW.toArray(), 6); // 7 Kiefer
  bone(J.tail1, 1); // 8
  bone(J.tail2, 8); // 9
  bone(J.tail3, 9); // 10
  bone(J.tail4, 10); // 11
  for (const sx of [1, -1]) {
    bone([sx * J.fl[0][0], J.fl[0][1], J.fl[0][2]], 2);
    bone([sx * J.fl[1][0], J.fl[1][1], J.fl[1][2]], rig.length - 1);
  }
  for (const sx of [1, -1]) {
    bone([sx * J.bl[0][0], J.bl[0][1], J.bl[0][2]], 1);
    bone([sx * J.bl[1][0], J.bl[1][1], J.bl[1][2]], rig.length - 1);
  }
  const W = AEL_WING3;
  for (const sx of [1, -1]) {
    const arm = rig.length;
    bone(aelWingPt3(sx, 0, 0, 0), 2);
    bone(aelWingPt3(sx, W.E[0], W.E[1], 0), arm);
    for (let k = 0; k < 4; k++) bone(aelWingPt3(sx, W.W[0], W.W[1], 0), arm + 1);
  }

  // --- Rumpf, Hals, Schwanz (weich gewichtet) ---
  const hide = { top: C.hideTop, topK: 0.6, shade: 0.25, shadowExact: true };
  A(aelSkin3('rumpf' + GEO3_LOD, loft3(AEL_TORSO3, 14, 4), aelBodyW3), C.hide, hide);
  A(aelSkin3('hals' + GEO3_LOD, tubeProfile3(AEL_NECKP3.pts, AEL_NECKP3.r, 24, 12), aelNeckW3), C.hide, hide);
  A(aelSkin3('schwanz' + GEO3_LOD, tubeProfile3(AEL_TAILP3.pts, AEL_TAILP3.r, 30, 10), aelTailW3), C.hide, hide);

  // Bauchplatten: Hals, Brust und Bauch, Schwanz (fest am stärksten Knochen)
  const plate = (p, w, l, rx, bn, k) => A(roundBox(+w.toFixed(3), 0.035, +l.toFixed(3), 0.015), k % 2 ? C.belly : darker(C.belly, 0.12), { bone: bn, p, r: [rx, 0, 0], top: C.bellyTop, topK: 0.4, shade: 0.2, noShadow: true });
  for (let k = 0; k < 9; k++) {
    const z = -0.95 + k * 0.215;
    const s = aelTorsoAt3(z);
    const s2 = aelTorsoAt3(z + 0.1);
    const rx = Math.atan2((s2[1] - s2[4]) - (s[1] - s[4]), 0.1);
    plate([0, s[1] - s[4] + 0.012, z], s[2] * 1.05, 0.2, -rx, aelBoneAt3(aelBodyW3, [0, s[1], z]), k);
  }
  for (let k = 0; k < 8; k++) {
    const q = aelTubeAt3(AEL_NECKP3, 0.06 + k * 0.12);
    plate(aelOn3(q, -0.93), q.r * 1.15, 0.13, q.ang, aelBoneAt3(aelNeckW3, q.p), k);
  }
  for (let k = 0; k < 10; k++) {
    const q = aelTubeAt3(AEL_TAILP3, 0.04 + k * 0.095);
    plate(aelOn3(q, -0.92), q.r * 1.15, 0.15 * (1 - k * 0.05), q.ang, aelBoneAt3(aelTailW3, q.p), k);
  }

  // Panzerplatten auf Schultern und Hüften
  for (const sx of [-1, 1]) {
    A(ball(12), C.armor, { bone: AB3.chest, p: [sx * 0.3, 1.36, 0.62], s: [0.2, 0.09, 0.26], r: [0.1, 0, sx * 0.5], top: C.armorTop, topK: 0.6, shine: 0.5 });
    A(ball(12), C.armor, { bone: AB3.body, p: [sx * 0.33, 1.26, -0.55], s: [0.2, 0.09, 0.27], r: [-0.1, 0, sx * 0.45], top: C.armorTop, topK: 0.6, shine: 0.5 });
  }

  // --- Stachelkamm vom Kopf bis zur Schwanzspitze, dazwischen leuchtende Kristalle ---
  const spike = (p, len, r, bn, back = 0.55, crystal = false) => {
    if (crystal) {
      pointAt3(A, geo3('ael:kristall', () => new THREE.OctahedronGeometry(1, 0)), C.glow, p, [0, 1, -back * 0.6], { bone: bn, s: [r * 0.9, len * 0.55, r * 0.9], mat: 'glow' });
      return;
    }
    pointAt3(A, horn3(+len.toFixed(2), +r.toFixed(3), 6), C.armor, p, [0, 1, -back], { bone: bn, top: C.hornTip, topK: 0.4, shine: 0.6, noShadow: len < 0.2 });
  };
  for (let k = 0; k < 7; k++) {
    const q = aelTubeAt3(AEL_NECKP3, 0.05 + k * 0.14);
    spike(aelOn3(q, 0.9), 0.13 + k * 0.006, 0.045, aelBoneAt3(aelNeckW3, q.p), 0.9);
  }
  for (let k = 0; k < 9; k++) {
    const z = 1.0 - k * 0.24;
    const s = aelTorsoAt3(z);
    const big = 0.34 - Math.abs(k - 3.5) * 0.03;
    spike([0, s[1] + s[3] + 0.02, z], big, 0.08, aelBoneAt3(aelBodyW3, [0, s[1], z]), 0.55);
    if (k < 8) spike([0, s[1] + s[3] + 0.0, z - 0.12], big * 0.5, 0.05, aelBoneAt3(aelBodyW3, [0, s[1], z - 0.12]), 0.4, true);
  }
  for (let k = 0; k < 11; k++) {
    const q = aelTubeAt3(AEL_TAILP3, 0.05 + k * 0.088);
    spike(aelOn3(q, 0.9), 0.24 * (1 - k * 0.07), 0.06 * (1 - k * 0.06), aelBoneAt3(aelTailW3, q.p), 0.75);
    if (k % 2 === 1) {
      const c = aelOn3(q, 0.85);
      spike([c[0], c[1], c[2] - 0.1], 0.1, 0.035, aelBoneAt3(aelTailW3, q.p), 0.6, true);
    }
  }
  // Schwanzspitze: Klinge aus Kristall, dunkel gefasst
  {
    const tp = AEL_J3.tip;
    for (const [r, sz, c, mat] of [[0, 1, C.armor, 'lit'], [0, 0.72, C.glow, 'glow']]) {
      A(geo3('ael:kristall', () => new THREE.OctahedronGeometry(1, 0)), c, { bone: AB3.tail4, p: [tp[0] + 0.02, tp[1] + 0.04, tp[2] - 0.12], s: [0.05 * sz, 0.16 * sz, 0.3 * sz], r: [0.2, 0.3 + r, 0], mat, shine: 0.6, noShadow: true });
    }
    for (const sx of [-1, 1]) pointAt3(A, horn3(0.22, 0.04, 5), C.armor, [tp[0], tp[1] + 0.02, tp[2] + 0.05], [sx * 1, 0.25, -0.6], { bone: AB3.tail4, shine: 0.6, noShadow: true });
  }

  // --- Kristalladern (leuchtend) auf den Flanken, am Hals und am Schwanz ---
  const veinMat = { mat: 'glow' };
  for (const sx of [-1, 1]) {
    for (const [z0, z1, a0, ph] of [[-0.95, 0.75, 0.35, 0], [-0.7, 0.55, -0.15, 1.7], [-0.45, 0.2, 0.75, 3.1]]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const z = z0 + ((z1 - z0) * i) / 8;
        const s = aelTorsoAt3(z);
        const a = a0 + 0.22 * Math.sin(i * 1.4 + ph);
        const sa = Math.sin(a);
        pts.push([sx * Math.cos(a) * s[2] * 1.01, s[1] + sa * (sa > 0 ? s[3] : s[4]) * 1.01, z]);
      }
      A(aelSkin3('ader' + sx + z0 + GEO3_LOD, tube3(pts, 0.016, 0.006, 20, 4), aelBodyW3), C.glow, veinMat);
    }
    for (const [T, fn, key, n] of [[AEL_NECKP3, aelNeckW3, 'hals', 10], [AEL_TAILP3, aelTailW3, 'schwanz', 14]]) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const q = aelTubeAt3(T, 0.03 + (0.9 * i) / n);
        const a = 0.2 + 0.3 * Math.sin(i * 1.3);
        pts.push([q.p[0] + sx * Math.cos(a) * q.r * 1.0, q.p[1] + Math.sin(a) * q.r * 1.0, q.p[2]]);
      }
      A(aelSkin3('ader' + key + sx + GEO3_LOD, tube3(pts, 0.014, 0.005, n * 2, 4), fn), C.glowV, veinMat);
    }
  }

  // --- Kopf (Schädel am Kopfknochen, Unterkiefer am Kiefer) ---
  const AH = adder(b, Mh);
  const HB = AB3.head, JB = AB3.jaw;
  AH(loft3([[-0.24, 0.04, 0.12, 0.1, 0.1], [-0.1, 0.07, 0.2, 0.16, 0.11], [0.05, 0.06, 0.215, 0.15, 0.1], [0.2, 0.04, 0.16, 0.12, 0.075], [0.38, 0.02, 0.12, 0.09, 0.055], [0.55, 0.0, 0.09, 0.07, 0.045], [0.66, -0.01, 0.045, 0.035, 0.028]], 6, 3), C.hide, { bone: HB, top: C.hideTop, topK: 0.55, shade: 0.2 });
  AH(loft3([[-0.1, -0.1, 0.15, 0.04, 0.06], [0.1, -0.12, 0.13, 0.04, 0.065], [0.3, -0.11, 0.1, 0.035, 0.05], [0.5, -0.09, 0.075, 0.03, 0.04], [0.61, -0.08, 0.04, 0.02, 0.03]], 6, 3), C.hide, { bone: JB, shade: 0.35 });
  // Rachen: dunkel, ganz hinten glimmt es (sichtbar, wenn das Maul offen ist)
  AH(ball(10), C.mouth, { bone: HB, p: [0, -0.07, 0.24], s: [0.1, 0.05, 0.3], noShadow: true });
  AH(ball(8), C.glow, { bone: HB, p: [0, -0.07, 0.02], s: [0.06, 0.04, 0.06], mat: 'glow' });
  // Zähne oben und unten, vorn je zwei lange Fänge
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const z = 0.14 + k * 0.085;
      const w = 0.135 - k * 0.012;
      AH(horn3(k === 5 ? 0.09 : 0.05, 0.014, 5), C.tooth, { bone: HB, p: [sx * w * 0.82, -0.05, z], r: [Math.PI, 0, sx * 0.1], noShadow: true });
      AH(horn3(k === 4 ? 0.075 : 0.04, 0.012, 5), C.tooth, { bone: JB, p: [sx * (w - 0.025) * 0.82, -0.075, z - 0.02], r: [0, 0, -sx * 0.1], noShadow: true });
    }
  }
  // Augen: dunkle Höhle, leuchtender Schlitz, darüber der Brauenwulst mit Stacheln nach hinten
  for (const sx of [-1, 1]) {
    AH(ball(8), C.hideD, { bone: HB, p: [sx * 0.135, 0.085, 0.16], s: [0.05, 0.035, 0.08], noShadow: true });
    AH(ball(8), C.eye, { bone: HB, p: [sx * 0.145, 0.085, 0.17], s: [0.032, 0.02, 0.06], r: [0, sx * 0.25, sx * 0.2], mat: 'glow' });
    AH(roundBox(0.06, 0.04, 0.2, 0.015), C.armor, { bone: HB, p: [sx * 0.13, 0.13, 0.12], r: [0.2, sx * 0.2, sx * 0.35], top: C.armorTop, topK: 0.6, shine: 0.5 });
    AH(horn3(0.12, 0.022, 5), C.armor, { bone: HB, p: [sx * 0.15, 0.13, 0.04], r: [-1.75, 0, -sx * 0.4], shine: 0.5, noShadow: true });
    // Nüstern
    AH(ball(6), C.glowV, { bone: HB, p: [sx * 0.04, 0.035, 0.63], s: [0.015, 0.01, 0.02], mat: 'glow' });
  }
  // Hörner: großes Paar weit nach hinten geschwungen, Spitze wieder aufgebogen; kleines Paar darunter; Krone aus Stacheln
  for (const sx of [-1, 1]) {
    const big = [[sx * 0.1, 0.13, -0.06], [sx * 0.2, 0.26, -0.28], [sx * 0.3, 0.33, -0.58], [sx * 0.38, 0.3, -0.88], [sx * 0.42, 0.42, -1.1]];
    AH(tube3(big, 0.075, 0.008, 22, 9), C.horn, { bone: HB, top: C.hornTip, topK: 0.45, shine: 0.7 });
    AH(geo3('ael:kristall', () => new THREE.OctahedronGeometry(1, 0)), C.glow, { bone: HB, p: big[4], s: [0.03, 0.06, 0.03], mat: 'glow' });
    // Ringe aus Kristall um das große Horn
    for (const k of [1, 2]) AH(torus3(0.06 - k * 0.012, 0.01, Math.PI * 2, 4, 10), C.glowV, { bone: HB, p: big[k], r: [0.4, sx * 0.6, 0], mat: 'glow' });
    const small = [[sx * 0.15, 0.02, -0.08], [sx * 0.3, 0.0, -0.3], [sx * 0.4, 0.06, -0.48]];
    AH(tube3(small, 0.045, 0.006, 14, 7), C.horn, { bone: HB, top: C.hornTip, topK: 0.4, shine: 0.6 });
    // Wangenstacheln am Kieferwinkel
    for (let k = 0; k < 3; k++) AH(horn3(0.16 - k * 0.03, 0.025, 5), C.armor, { bone: JB, p: [sx * 0.13, -0.11 + k * 0.035, -0.04 - k * 0.02], r: [-1.9 + k * 0.25, 0, -sx * (0.7 + k * 0.15)], shine: 0.5, noShadow: true });
  }
  for (let k = 0; k < 3; k++) AH(horn3(0.1 - k * 0.02, 0.025, 5), C.armor, { bone: HB, p: [0, 0.17 - k * 0.01, -0.02 - k * 0.09], r: [-1.2, 0, 0], shine: 0.5, noShadow: true });
  AH(horn3(0.11, 0.025, 5), C.armor, { bone: JB, p: [0, -0.16, 0.25], r: [-2.4, 0, 0], shine: 0.5, noShadow: true });

  // --- Beine: mächtige Oberarme und Schenkel, Krallen ---
  const claw = (bn, p, d, len) => {
    const e = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
    A(tube3([p, [p[0] + d[0] * len * 0.6, p[1] + 0.02, p[2] + d[2] * len * 0.6], [e[0], e[1] - 0.06, e[2]]], 0.028, 0.004, 8, 5), C.claw, { bone: bn, shine: 0.5, noShadow: true });
  };
  const foot = (bn, sx, p, back) => {
    A(ball(10), C.hide, { bone: bn, p: [p[0], p[1] - 0.04, p[2] + 0.05], s: [0.14, 0.08, 0.17], top: C.hideTop, topK: 0.5, shade: 0.3 });
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.42 + sx * 0.06;
      const d = [Math.sin(a), 0, Math.cos(a)];
      const t0 = [p[0] + d[0] * 0.09, 0.07, p[2] + 0.05 + d[2] * 0.09];
      A(tubeProfile3([[p[0], 0.1, p[2] + 0.05], t0, [t0[0] + d[0] * 0.08, 0.05, t0[2] + d[2] * 0.08]], [0.05, 0.04, 0.032], 6, 6), C.hide, { bone: bn, top: C.hideTop, topK: 0.5 });
      claw(bn, [t0[0] + d[0] * 0.08, 0.06, t0[2] + d[2] * 0.08], d, 0.13);
    }
    claw(bn, [p[0], 0.1, p[2] - 0.06], [0, 0, -1 * back], 0.08);
  };
  for (const [sx, up, lo] of [[1, AB3.upFL, AB3.loFL], [-1, AB3.upFR, AB3.loFR]]) {
    const [P0, P1, P2] = J.fl.map((q) => [sx * q[0], q[1], q[2]]);
    A(ball(12), C.hide, { bone: up, p: [P0[0] - sx * 0.04, P0[1] - 0.04, P0[2]], s: [0.2, 0.3, 0.25], top: C.hideTop, topK: 0.6, shade: 0.25 });
    A(tubeProfile3([P0, [(P0[0] + P1[0]) / 2 + sx * 0.03, (P0[1] + P1[1]) / 2, (P0[2] + P1[2]) / 2 + 0.02], P1], [0.17, 0.13, 0.1], 10, 10), C.hide, { bone: up, top: C.hideTop, topK: 0.5, shade: 0.2 });
    A(ball(10), C.hide, { bone: up, p: P1, s: 0.1 });
    pointAt3(A, horn3(0.14, 0.035, 5), C.armor, [P1[0], P1[1], P1[2] - 0.06], [sx * 0.2, 0.2, -1], { bone: up, shine: 0.5, noShadow: true });
    A(tubeProfile3([P1, [P1[0], 0.32, 0.7], P2], [0.1, 0.085, 0.07], 10, 9), C.hide, { bone: lo, top: C.hideTop, topK: 0.5, shade: 0.2 });
    A(roundBox(0.12, 0.26, 0.05, 0.02), C.armor, { bone: lo, p: [P1[0], 0.38, 0.73], r: [-0.25, 0, 0], top: C.armorTop, topK: 0.6, shine: 0.5, noShadow: true });
    foot(lo, sx, P2, 1);
  }
  for (const [sx, up, lo] of [[1, AB3.upBL, AB3.loBL], [-1, AB3.upBR, AB3.loBR]]) {
    const [P0, P1, P2, P3] = J.bl.map((q) => [sx * q[0], q[1], q[2]]);
    A(ball(14), C.hide, { bone: up, p: [P0[0] - sx * 0.02, P0[1] - 0.06, P0[2] + 0.05], s: [0.24, 0.36, 0.33], top: C.hideTop, topK: 0.6, shade: 0.25 });
    A(tubeProfile3([P0, [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2, (P0[2] + P1[2]) / 2], P1], [0.2, 0.15, 0.1], 10, 10), C.hide, { bone: up, top: C.hideTop, topK: 0.5, shade: 0.2 });
    A(ball(10), C.hide, { bone: up, p: P1, s: 0.105 });
    A(tubeProfile3([P1, [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2, (P1[2] + P2[2]) / 2 - 0.02], P2, P3], [0.1, 0.085, 0.065, 0.06], 12, 9), C.hide, { bone: lo, top: C.hideTop, topK: 0.5, shade: 0.2 });
    pointAt3(A, horn3(0.16, 0.035, 5), C.armor, [P2[0], P2[1], P2[2] - 0.04], [0, 0.3, -1], { bone: lo, shine: 0.5, noShadow: true });
    foot(lo, sx, P3, 1);
  }

  // --- Flügel: Arm, Unterarm, vier Finger, Haut oben und unten, leuchtende Adern ---
  const memCol = (top) => (k, rho) => (top ? mixColor(C.memTop, C.memTopEdge, rho * rho) : mixColor(C.memBot, C.memBotEdge, rho * rho));
  for (const sx of [1, -1]) {
    const wb = AEL_WB3(sx);
    const S0 = aelWingPt3(sx, 0, 0, 0);
    const E0 = aelWingPt3(sx, W.E[0], W.E[1], 0);
    const W0 = aelWingPt3(sx, W.W[0], W.W[1], 0);
    // Knochen
    A(tubeProfile3([S0, [(S0[0] + E0[0]) / 2, (S0[1] + E0[1]) / 2 + 0.04, (S0[2] + E0[2]) / 2], E0], [0.11, 0.08, 0.065], 10, 9), C.hide, { bone: wb.arm, top: C.hideTop, topK: 0.6 });
    A(ball(10), C.hide, { bone: wb.arm, p: E0, s: 0.075 });
    pointAt3(A, horn3(0.16, 0.03, 5), C.armor, E0, [sx * 0.2, 0.5, -1], { bone: wb.arm, shine: 0.5, noShadow: true });
    A(tubeProfile3([E0, W0], [0.065, 0.05], 10, 8), C.hide, { bone: wb.fore, top: C.hideTop, topK: 0.6 });
    A(ball(10), C.hide, { bone: wb.fore, p: W0, s: 0.06 });
    // Daumenkralle am Handgelenk
    A(tube3([W0, [W0[0] + sx * 0.04, W0[1] + 0.05, W0[2] + 0.12], [W0[0] + sx * 0.02, W0[1] - 0.02, W0[2] + 0.22]], 0.03, 0.004, 8, 5), C.claw, { bone: wb.fore, shine: 0.5, noShadow: true });
    // Finger: gerade, verjüngt, Gewicht wie die Haut entlang des Strahls
    for (let k = 0; k < 4; k++) {
      const T0 = aelWingPt3(sx, W.F[k][0], W.F[k][1], 0);
      const r0 = 0.045 - k * 0.005;
      const g = tubeProfile3([W0, [(W0[0] + T0[0]) / 2, (W0[1] + T0[1]) / 2, (W0[2] + T0[2]) / 2], T0], [r0, r0 * 0.7, 0.008], 10, 6);
      const len = Math.hypot(T0[0] - W0[0], T0[1] - W0[1], T0[2] - W0[2]);
      A(aelSkin3('finger' + sx + k + GEO3_LOD, g, (x, y, z) => {
        const rho = Math.max(0, Math.min(1, Math.hypot(x - W0[0], y - W0[1], z - W0[2]) / len));
        return [[wb.fore, 1 - rho], [wb.f[k], rho]];
      }), C.hide, { bone: wb.f[k], top: C.hideTop, topK: 0.5, noShadow: true });
    }
    // Haut: Handteil (drei Felder) und Innenteil, jeweils Ober- und Unterseite (ohne Umriss: mat 'face')
    for (const top of [true, false]) {
      const col = memCol(top);
      for (let k = 0; k < 3; k++) {
        const g = aelSheet3('aussen' + k, sx, W.segA, W.rings, (i, j) => aelOuterPt3(k, i / W.segA, j / W.rings), (i, j) => aelOuterW3(sx, k, i / W.segA, j / W.rings), (i, j) => col(k, j / W.rings), top);
        A(g, null, { mat: 'face', shade: 0 });
        if (top) (b.lists.shadow = b.lists.shadow || []).push({ geo: g, color: '#000000', m: new THREE.Matrix4(), bone: 0, shade: 0, parent: null, top: null, topK: 0.5, shine: 0, ao: 0 });
      }
      const g = aelSheet3('innen', sx, W.segS, W.segT, (i, j) => aelInnerPt3(i / W.segS, j / W.segT), (i, j) => aelInnerW3(sx, i / W.segS, j / W.segT), (i, j) => col(0, (j / W.segT) * 0.8), top);
      A(g, null, { mat: 'face', shade: 0 });
      if (top) b.lists.shadow.push({ geo: g, color: '#000000', m: new THREE.Matrix4(), bone: 0, shade: 0, parent: null, top: null, topK: 0.5, shine: 0, ao: 0 });
      // leuchtende Adern in der Haut: je Feld eine vom Handgelenk zum Rand, im Innenteil eine quer
      const vc = (i, j, n) => mixColor(C.glow, C.glowV, j / n);
      for (let k = 0; k < 3; k++) {
        A(aelSheet3('ader' + k, sx, 1, 10, (i, j) => aelOuterPt3(k, 0.47 + i * 0.06, 0.12 + (j / 10) * 0.74), (i, j) => aelOuterW3(sx, k, 0.5, 0.12 + (j / 10) * 0.74), (i, j) => vc(i, j, 10), top, 0.004), null, { mat: 'glow' });
      }
      A(aelSheet3('aderI', sx, 10, 1, (i, j) => aelInnerPt3(0.12 + (i / 10) * 0.7, 0.5 + j * 0.05), (i, j) => aelInnerW3(sx, 0.12 + (i / 10) * 0.7, 0.52), (i, j) => vc(j, i, 10), top, 0.004), null, { mat: 'glow' });
    }
  }

  return {
    rig, height: 2.62, family: 'aelvyr', aelvyr: true, noFlair: true, jaw: true, style: null,
    ownScale: AEL3.scale
  };
}
MON3_BUILD.aelvyr = aelvyr3;

// --- Falten der Flügel ------------------------------------------------------------------------------------
// Winkel in der Flügelebene (positiv = nach hinten), damit gefaltet: Ellbogen nach hinten oben, Handgelenk vorn neben
// der Schulter, Finger nach hinten an der Flanke entlang
const AEL_FOLD3 = (() => {
  const W = AEL_WING3;
  const psi = (u, v) => Math.atan2(-v, u);
  const nrm = (x, z) => { const l = Math.hypot(x, z); return [x / l, z / l]; };
  const lE = Math.hypot(W.E[0], W.E[1]);
  const dE = nrm(0.42, -0.9);
  const E2 = [dE[0] * lE, dE[1] * lE];
  const lW = Math.hypot(W.W[0] - W.E[0], W.W[1] - W.E[1]);
  const dW = nrm(-0.12, 1);
  const W2 = [E2[0] + dW[0] * lW, E2[1] + dW[1] * lW];
  const arm = psi(E2[0], E2[1]) - psi(W.E[0], W.E[1]);
  const fore = psi(W2[0] - E2[0], W2[1] - E2[1]) - psi(W.W[0] - W.E[0], W.W[1] - W.E[1]) - arm;
  const f = W.F.map((F, k) => {
    const t = nrm(0.1 + 0.07 * k, -1);
    return psi(t[0], t[1]) - psi(F[0] - W.W[0], F[1] - W.W[1]) - arm - fore;
  });
  return { arm, fore, f };
})();

// --- Animation ------------------------------------------------------------------------------------------
const _aelQ1 = new THREE.Quaternion();
const _aelQ2 = new THREE.Quaternion();
const _aelN = { 1: new THREE.Vector3(), '-1': new THREE.Vector3() };
const _aelZ = new THREE.Vector3(0, 0, 1);
const _aelY = new THREE.Vector3(0, 1, 0);
const _aelX = new THREE.Vector3(1, 0, 0);
function aelPlaneN3(sx) {
  const n = _aelN[sx];
  if (!n.lengthSq()) n.set(-sx * Math.sin(AEL_WING3.tilt), Math.cos(AEL_WING3.tilt), 0);
  return n;
}
// Flügel einer Seite: lift (Heben am Rumpf), fold (0 offen … 1 gefaltet), sweep (vor/zurück), outer (Außenflügel
// zusätzlich heben/senken, Nachschwingen beim Schlag)
function aelWing3(B, sx, lift, fold, sweep, outer) {
  const wb = AEL_WB3(sx);
  const n = aelPlaneN3(sx);
  const F = AEL_FOLD3;
  B[wb.arm].quaternion.setFromAxisAngle(_aelZ, sx * lift).multiply(_aelQ2.setFromAxisAngle(_aelY, sx * sweep)).multiply(_aelQ1.setFromAxisAngle(n, sx * fold * F.arm));
  B[wb.fore].quaternion.setFromAxisAngle(_aelZ, sx * outer).multiply(_aelQ1.setFromAxisAngle(n, sx * fold * F.fore));
  for (let k = 0; k < 4; k++) B[wb.f[k]].quaternion.setFromAxisAngle(n, sx * (fold * F.f[k] - (1 - fold) * 0.04 * k * Math.max(0, -outer)));
}

const AEL_DEF3 = { rear: 0, hover: 0, fold: 0.55, lift: 0.25, sweep: 0, flapAmp: 0, flapHz: 0.5, neckUp: 0, neckFwd: 0, jaw: 0.05, crouch: 0, glow: 0, twist: 0, curl: 0, legsUp: 0, clawUp: 0, look: 1, sink: 0, splay: 0, droop: 0 };
// Zustand je Figur (a.ael): weich nachgeführte Posenwerte P, Phasen, Merker für Angriffe
function aelState3(a) {
  if (!a.ael) a.ael = { P: Object.assign({}, AEL_DEF3), T: Object.assign({}, AEL_DEF3), flap: 0, walk: 0, lookY: 0, lookX: 0, atkN: 0, inAtk: false, kind: 'bite', engaged: false, idleT: 0, fxDone: {} };
  return a.ael;
}
const aelEase3 = (P, T, k, dt) => {
  for (const key in T) P[key] += (T[key] - P[key]) * (1 - Math.exp(-dt * (k[key] || 5)));
};
const AEL_RATE3 = { hover: 3.2, rear: 6, fold: 4, lift: 5, flapAmp: 3, flapHz: 3, neckUp: 5, neckFwd: 9, jaw: 10, crouch: 7, glow: 3, twist: 6, curl: 6, legsUp: 7, clawUp: 9, sink: 2, splay: 3, droop: 3 };

// Angriffsposen: wind (0…1 Ausholen), hit (0…1…0 Schlag)
function aelHitCurve3(atk) {
  const p = atk > 0 ? 1 - atk : 0;
  return atk > 0 ? (p < 0.3 ? easeOut(p / 0.3) : 1 - (p - 0.3) / 0.7) : 0;
}

function aelAnim3(a, e, dt, corpse) {
  resetBones(a);
  const B = a.bones;
  const S = aelState3(a);
  const P = S.P;
  const T = S.T;
  Object.assign(T, AEL_DEF3);
  const now = game.time;
  const frozen = e.frozen > now;
  const t = frozen ? e.frozenT ?? now : now;
  dt = frozen ? 0 : Math.min(0.1, dt);
  const moving = !corpse && e.moving && !frozen;
  const fy = corpse ? e.y : feetY(e);
  // Blickrichtung wie bei allen Monstern (aus der Bewegung, beim Angriff zum Ziel), nur träger
  if (!corpse) {
    if (a.refX == null || Math.hypot(e.x - a.refX, e.y - a.refY) > 60) { a.refX = e.x; a.refY = e.y; }
    else {
      const dx = e.x - a.refX, dy = e.y - a.refY;
      if (dx * dx + dy * dy > 16) {
        a.want = Math.atan2(dx, dy);
        a.refX = e.x;
        a.refY = e.y;
      }
    }
  }
  const foe = !corpse && e.target && !e.target.dead ? e.target : null;
  const cast = !corpse && e.aelCast && now < e.aelCast.t0 + e.aelCast.d + 1.4 ? e.aelCast : null;
  if (cast && cast.dir != null) a.want = cast.dir;
  else if (foe && (e.attackAnim > 0 || e.windup > 0 || !moving)) a.want = Math.atan2(foe.x - e.x, foe.y - e.y);
  if (a.want == null) a.want = e.facing < 0 ? -Math.PI / 2 + 0.55 : Math.PI / 2 - 0.55;
  if (!frozen && !corpse) turnToward(a, a.want, Math.min(1, dt * (cast ? 6 : 3.5)));

  // --- Zielwerte je Zustand ---
  const W = { wind: 0, hit: 0 };
  let flapKick = 0;
  if (corpse) {
    // Tod: aufbäumen, brüllen, dann zusammensinken – Flügel fallen auseinander, Hals sinkt zur Seite
    const u = now - e.start;
    if (u < 0.7) Object.assign(T, { rear: 0.55, neckUp: 1, jaw: 1, fold: 0.05, lift: 0.7, flapAmp: 0.15, flapHz: 2.5, glow: 0.8 });
    else Object.assign(T, { rear: -0.05, crouch: 1, neckUp: -1.2, jaw: 0.45, fold: 0.15, lift: -0.08, sink: 1, splay: 1, droop: 1, glow: -1, look: 0 });
  } else {
    // Kampfbeginn: einmal brüllen
    if (foe && !S.engaged && now - (e.aelRoar || -99) > 3) {
      S.engaged = true;
      e.aelRoar = now;
      if (typeof aelRoarFx3 === 'function') aelRoarFx3(e);
    }
    if (!foe && e.hp >= e.maxHp) S.engaged = false;
    const roar = now - (e.aelRoar || -99);
    if (cast) aelCastPose3(e, cast, now - cast.t0, T, S, a);
    else if (roar < 1.9) {
      const k = roar / 1.9;
      Object.assign(T, { rear: 0.45, neckUp: 1.1, jaw: k < 0.85 ? 1 : 0.2, fold: 0, lift: 0.6, flapAmp: 0.08, flapHz: 3, glow: 0.6, look: 0.2 });
    } else if (moving) Object.assign(T, { fold: 0.85, lift: 0.35, neckUp: -0.15, jaw: 0.1 });
    else if (foe) Object.assign(T, { fold: 0.42, lift: 0.32, neckUp: 0.1, jaw: 0.2 });
    else {
      // Ruhe: ab und zu die Flügel strecken
      S.idleT += dt;
      const ph = S.idleT % 11;
      if (ph > 8 && ph < 10.2) Object.assign(T, { fold: 0.1, lift: 0.45, flapAmp: 0.12, flapHz: 0.8, neckUp: 0.5, jaw: 0.4 });
      else Object.assign(T, { fold: 0.8, lift: 0.3 });
    }
    // Nahkampf (gewöhnlicher Angriff): Biss, Klauenhieb und Schwanzfeger im Wechsel
    const winding = e.windup > 0 && !cast;
    const striking = e.attackAnim > 0 && !cast;
    if ((winding || striking) && !S.inAtk) {
      S.inAtk = true;
      S.atkN++;
      S.kind = ['bite', 'claw', 'tail'][S.atkN % 3];
    }
    if (!winding && !striking) S.inAtk = false;
    W.wind = winding ? easeOut(Math.max(0, 1 - e.windup / (e.windupMax || 0.55))) : 0;
    W.hit = striking ? aelHitCurve3(e.attackAnim / 0.25) : 0;
  }
  aelEase3(P, T, AEL_RATE3, dt);

  // --- Phasen ---
  S.flap += dt * Math.PI * 2 * P.flapHz;
  const gait = moving ? (e.dash ? 2.4 : 1.25) : 0;
  S.walk += dt * Math.PI * 2 * gait;
  const breath = Math.sin(t * 1.5);

  // --- Rumpf ---
  const body = B[AB3.body];
  const crouch = P.crouch;
  body.position.y += (0.035 * breath - 0.22 * crouch + 0.22 * P.rear - 0.35 * P.sink) * 1;
  body.rotation.x = -0.72 * P.rear;
  body.rotation.y = P.twist;
  body.rotation.z = 0.12 * P.splay;
  if (moving) {
    body.position.y += Math.abs(Math.sin(S.walk)) * 0.04;
    body.rotation.z += Math.sin(S.walk) * 0.03;
  }
  B[AB3.chest].scale.set(1 + 0.03 * breath, 1 + 0.025 * breath, 1);
  B[AB3.chest].rotation.x = -0.1 * P.rear;

  // --- Hals und Kopf: heben, vorstoßen, dem Ziel folgen ---
  let lookY = 0, lookX = 0;
  if (foe && P.look > 0.05) {
    let d = Math.atan2(foe.x - e.x, foe.y - e.y) - a.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    lookY = Math.max(-1.1, Math.min(1.1, d)) * P.look;
    const dist = Math.hypot(foe.x - e.x, foe.y - e.y) * U3;
    lookX = Math.max(0, 0.5 - dist * 0.06) * P.look;
  } else if (!corpse) lookY = Math.sin(t * 0.37) * 0.35 * P.look;
  S.lookY += (lookY - S.lookY) * Math.min(1, dt * 3);
  S.lookX += (lookX - S.lookX) * Math.min(1, dt * 3);
  const up = P.neckUp, fwd = P.neckFwd;
  const sway = Math.sin(t * 0.9) * 0.04;
  const N = [B[AB3.neck1], B[AB3.neck2], B[AB3.neck3], B[AB3.head]];
  const nx = [-0.22 * up + 0.32 * fwd + 0.04 * breath, -0.2 * up + 0.25 * fwd, 0.12 * up - 0.05 * fwd + 0.25 * S.lookX, 0.22 * up - 0.3 * fwd + 0.2 * S.lookX];
  const ny = [0.22, 0.3, 0.26, 0.22];
  for (let i = 0; i < 4; i++) {
    N[i].rotation.x = nx[i] + 0.18 * P.rear * (i === 3 ? -1 : 0.4);
    N[i].rotation.y = ny[i] * S.lookY + sway * (i + 1) * 0.5 + 0.35 * P.droop * (i < 3 ? 1 : 0.5);
  }
  B[AB3.jaw].rotation.x = 0.62 * P.jaw + 0.03 * (1 + breath);

  // --- Schwanz: wellenförmig, beim Feger rundherum ---
  const amp = moving ? 0.16 : 0.09;
  const tf = moving ? 4.5 : 1.3;
  for (let i = 0; i < 4; i++) {
    const tb = B[AB3.tail1 + i];
    tb.rotation.y = Math.sin(t * tf - i * 0.85) * amp * (0.6 + i * 0.3) + P.curl * (0.25 + i * 0.12) + 0.2 * P.droop;
    tb.rotation.x = 0.08 * P.rear * (i === 0 ? 3 : 0) - 0.05 * P.droop * i;
  }

  // --- Beine: Laufzyklus, Aufbäumen (Hinterbeine bleiben senkrecht), Einknicken beim Tod ---
  const legs = [[AB3.upFL, AB3.loFL, 0.25, true, 1], [AB3.upFR, AB3.loFR, 0.75, true, -1], [AB3.upBL, AB3.loBL, 0, false, 1], [AB3.upBR, AB3.loBR, 0.5, false, -1]];
  for (const [upB, loB, off, front, sx] of legs) {
    const U = B[upB], L = B[loB];
    if (moving) {
      const ph = S.walk + off * Math.PI * 2;
      U.rotation.x = -Math.sin(ph) * 0.42;
      L.rotation.x = Math.max(0, Math.cos(ph)) * (front ? -0.55 : 0.6);
    }
    if (front) {
      U.rotation.x += -1.1 * P.legsUp + 0.25 * crouch;
      L.rotation.x += -0.9 * P.legsUp - 0.35 * crouch;
    } else {
      U.rotation.x += 0.72 * P.rear + 0.5 * crouch;
      L.rotation.x += -0.7 * crouch;
    }
    U.rotation.z = sx * 0.55 * P.splay;
  }
  // Klauenhieb mit dem linken Vorderbein
  if (P.clawUp > 0.01) {
    B[AB3.upFL].rotation.x += -1.5 * P.clawUp;
    B[AB3.upFL].rotation.z += 0.35 * P.clawUp;
    B[AB3.loFL].rotation.x += -0.8 * P.clawUp;
  }

  // --- Nahkampf obendrauf ---
  const w = W.wind, hit = W.hit;
  if (w > 0 || hit > 0) {
    if (S.kind === 'bite') {
      N[0].rotation.x += -0.25 * w + 0.35 * hit;
      N[1].rotation.x += -0.3 * w + 0.32 * hit;
      N[2].rotation.x += 0.15 * w - 0.1 * hit;
      N[3].rotation.x += -0.25 * w - 0.05 * hit;
      B[AB3.jaw].rotation.x += 0.6 * w + (hit > 0.6 ? 0 : 0.5 * hit);
      body.position.z += -0.08 * w + 0.18 * hit;
    } else if (S.kind === 'claw') {
      const U = B[AB3.upFL], L = B[AB3.loFL];
      U.rotation.x += -1.7 * w + 1.2 * hit;
      U.rotation.z += 0.5 * w - 0.6 * hit;
      L.rotation.x += -1.0 * w + 0.6 * hit;
      body.rotation.x += -0.25 * w + 0.12 * hit;
      body.rotation.y += 0.2 * w - 0.3 * hit;
      N[3].rotation.x += -0.2 * w;
      B[AB3.jaw].rotation.x += 0.4 * w;
    } else {
      body.rotation.y += 0.45 * w - 0.8 * hit;
      for (let i = 0; i < 4; i++) B[AB3.tail1 + i].rotation.y += (0.5 * w - 1.1 * hit) * (0.6 + i * 0.25);
      N[0].rotation.y += -0.3 * w + 0.4 * hit;
      N[1].rotation.y += -0.3 * w + 0.4 * hit;
    }
  }

  // --- Flügel ---
  const fl = Math.sin(S.flap);
  const flapAmp = P.flapAmp;
  const lift = P.lift + fl * flapAmp + flapKick + 0.03 * breath;
  const outer = Math.sin(S.flap - 0.9) * flapAmp * 0.6 - 0.25 * P.droop;
  for (const sx of [1, -1]) aelWing3(B, sx, lift - 0.3 * P.droop, Math.max(0, Math.min(1.05, P.fold)), 0.1 * P.fold - 0.15 * P.droop, outer);

  // --- Lage in der Welt: Schweben (Aufsteigen, Sprung), Schatten bleibt am Boden ---
  let hover = P.hover;
  if (cast && cast.kind === 'leap') {
    const k = (now - cast.t0 - cast.d) / 0.3;
    if (k > 0 && k < 1) hover += Math.sin(Math.PI * k) * 2.2;
  }
  hover += P.flapAmp > 0.3 ? Math.sin(S.flap + 0.6) * 0.12 * P.flapAmp * Math.min(1, P.hover) : 0;
  a.lift = hover;
  a.group.position.set(e.x * U3, hover - (corpse ? 0 : 0), fy * U3);
  a.group.rotation.set(0, a.heading, 0);
  const sc = a.model.scale;
  if (a.blob) {
    a.blob.position.y = 0.02 - hover / sc;
    a.blob.scale.setScalar(AEL3.blob * (1 - Math.min(0.5, hover * 0.08)));
  }
  if (a.aura) a.aura.position.y = 0.03 - hover / sc;

  // --- Leuchten: Kristalle pulsieren, beim Aufladen heller, beim Tod verlöschen sie ---
  if (a.mats.glow) a.mats.glow.color.setScalar(Math.max(0.08, (0.78 + 0.22 * Math.sin(t * 2.2)) * (1 + 0.45 * P.glow)));
  const mat = a.mats.lit;
  if (mat && !corpse) {
    const flash = e.hitFlash || 0;
    if (flash > 0) mat.emissive.setRGB(flash * 0.5, flash * 0.48, flash * 0.6);
    else if (frozen) mat.emissive.setRGB(0.06, 0.14, 0.3);
    else if (e.stun > 0) mat.emissive.setRGB(0.2, 0.18, 0.02);
    else if (w > 0) mat.emissive.setRGB(0.12 * w, 0.02 * w, 0.08 * w);
    else mat.emissive.setRGB(0.03 * Math.max(0, P.glow), 0.02 * Math.max(0, P.glow), 0.06 * Math.max(0, P.glow));
  }
  a.group.updateMatrixWorld(true);
  return S;
}

// Posen der Endboss-Angriffe (u = Sekunden seit der Ankündigung, d = Dauer bis zum Einschlag)
function aelCastPose3(e, c, u, T, S, a) {
  const d = c.d;
  const after = u - d;
  switch (c.kind) {
    case 'line': {
      // Abgrund-Atem: Hals hoch und zurück, Maul glimmt – dann der Strahl nach vorn
      if (after < 0) Object.assign(T, { rear: 0.3, neckUp: 0.8, neckFwd: -0.3, jaw: 0.35 + 0.3 * (u / d), fold: 0.25, lift: 0.5, glow: 0.8 * (u / d), look: 0 });
      else if (after < 0.95) Object.assign(T, { rear: 0.12, neckUp: -0.15, neckFwd: 0.75, jaw: 1, fold: 0.15, lift: 0.55, glow: 1, look: 0 });
      break;
    }
    case 'meteor': {
      // auf den Hinterbeinen, Flügel weit offen und schlagend, brüllt in die Höhe: Kristalle stürzen herab
      if (after < 0.4) Object.assign(T, { rear: 0.95, legsUp: 0.7, neckUp: 1.2, jaw: 1, fold: 0, lift: 0.45, flapAmp: 0.55, flapHz: 1.4, glow: 0.9, look: 0 });
      break;
    }
    case 'nova': {
      // Aufsteigen mit kräftigen Schlägen, dann der Flügelstoß nach unten: Druckwelle
      if (after < 0) Object.assign(T, { hover: 2.6 * Math.min(1, u / 0.8), fold: 0, lift: 0.2, flapAmp: 0.85, flapHz: 1.5, legsUp: 0.35, neckUp: 0.3, jaw: 0.4, glow: 0.7, look: 0.4 });
      else if (after < 0.6) Object.assign(T, { hover: 0, fold: 0, lift: -0.55, flapAmp: 0, crouch: 0.6, neckUp: -0.2, jaw: 0.8, glow: 1 });
      break;
    }
    case 'slam': {
      if (after < 0) Object.assign(T, { rear: 1, legsUp: 1, neckUp: 0.9, jaw: 0.7, fold: 0.05, lift: 0.7, flapAmp: 0.2, flapHz: 1.2, look: 0.3 });
      else if (after < 0.7) Object.assign(T, { rear: -0.1, legsUp: 0, crouch: 0.75, neckUp: -0.4, neckFwd: 0.3, jaw: 0.9, fold: 0.1, lift: -0.2 });
      break;
    }
    case 'buster': {
      if (after < 0) Object.assign(T, { rear: 0.45, clawUp: 1, neckUp: 0.5, jaw: 0.6, fold: 0.3, lift: 0.5, glow: 0.5 });
      else if (after < 0.6) Object.assign(T, { rear: -0.05, clawUp: -0.2, crouch: 0.4, neckFwd: 0.6, jaw: 0.9, fold: 0.35 });
      break;
    }
    case 'leap': {
      if (after < 0) Object.assign(T, { crouch: 0.85, fold: 0.15, lift: 0.75, neckUp: -0.3, jaw: 0.4, look: 0.5 });
      else if (after < 0.3) Object.assign(T, { crouch: 0, fold: 0, lift: 0.1, flapAmp: 0.8, flapHz: 2.2, legsUp: 0.6, neckUp: 0.2, jaw: 0.9 });
      else if (after < 0.9) Object.assign(T, { crouch: 0.7, fold: 0.1, lift: 0.4, neckUp: -0.2, jaw: 0.6 });
      break;
    }
    case 'charge': {
      if (after < 0.5) Object.assign(T, { crouch: 0.4, neckUp: -0.7, neckFwd: 0.3, jaw: 0.7, fold: 0.7, lift: 0.5, look: 0 });
      break;
    }
    case 'doom': {
      // Vernichtung: steigt hoch in die Luft, die Kristalle glühen auf – dann der Sturz in die Mitte
      if (after < 0) Object.assign(T, { hover: 4.6 * aelSmooth3(u / 1.2), fold: 0, lift: 0.15, flapAmp: 0.9, flapHz: 1.05, legsUp: 0.5, neckUp: -0.35, jaw: 0.5 + 0.5 * (u / d), glow: 0.4 + 1.2 * (u / d), look: 0 });
      else if (after < 1.1) Object.assign(T, { hover: 0, fold: 0.05, lift: 0.7, crouch: 0.7, neckUp: 0.9, jaw: 1, glow: 1.4 });
      break;
    }
    default:
      break;
  }
}

// --- Effekte in 3D (FX3_HOOKS, drei-fx.js) ----------------------------------------------------------------
// Liste laufender Effekte; jeder kennt seinen Anfang, seine Dauer und seine Teile (zufällige Werte einmal festgelegt)
const AEL_FX3 = [];
function aelAddFx3(o) {
  if (!V3.on) return;
  o.t0 = game.time;
  AEL_FX3.push(o);
  if (AEL_FX3.length > 24) AEL_FX3.shift();
}
// Maulspitze und Blickrichtung (Welt) aus dem Kopfknochen der Figur
const _aelM = new THREE.Vector3();
const _aelD = new THREE.Vector3();
function aelMouth3(e, out, dir) {
  const a = e && e.__k3 && actors3.get(e.__k3);
  if (!a || !a.model.aelvyr) {
    out.set(e.x * U3, 4, feetY(e) * U3);
    if (dir) dir.set(0, -0.2, 1).normalize();
    return out;
  }
  const hb = a.bones[AB3.head];
  out.set(0, -0.05, 0.6).multiplyScalar(AEL_HEAD3.size).applyAxisAngle(_aelX, AEL_HEAD3.pitch).add(_aelM.set(AEL_HEAD3.at[0] - AEL_J3.head[0], AEL_HEAD3.at[1] - AEL_J3.head[1], AEL_HEAD3.at[2] - AEL_J3.head[2]));
  hb.localToWorld(out);
  if (dir) {
    dir.set(0, 0, 1).applyAxisAngle(_aelX, AEL_HEAD3.pitch * 0.4).transformDirection(hb.matrixWorld);
  }
  return out;
}
function aelRoarFx3(m) {
  aelAddFx3({ kind: 'roar', m, dur: 1.6 });
  shakeScreen(7);
}

const _aelP = new THREE.Vector3();
const _aelP2 = new THREE.Vector3();
const _aelDir = new THREE.Vector3();
const _aelNeg = new THREE.Vector3();
const _aelCol = new THREE.Color();
function aelSprite3(h, x, y, z, s, tex, color, op) {
  const o = fx3Take(h, 'sprite');
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  fx3Map(o, tex);
  fx3Color(o, color, op);
  return o;
}
function aelShard3(h, x, y, z, s, len, rx, rz, color, op) {
  const o = fx3Take(h, 'coneG');
  o.position.set(x, y, z);
  o.scale.set(s, len, s);
  o.rotation.set(rx, 0, rz);
  o.material.color.set(color);
  o.material.opacity = op;
  return o;
}
function aelSeed3(f, key, n, make) {
  if (!f[key]) f[key] = Array.from({ length: n }, make);
  return f[key];
}
function aelFx3(h) {
  const now = game.time;
  for (let i = AEL_FX3.length - 1; i >= 0; i--) {
    const f = AEL_FX3[i];
    const u = now - f.t0;
    if (u > f.dur || u < 0) {
      if (u > f.dur) AEL_FX3.splice(i, 1);
      continue;
    }
    const k = u / f.dur;
    if (f.kind === 'breath') aelFxBreath3(h, f, u, k);
    else if (f.kind === 'charge') {
      // Glühen im Maul vor dem Atem
      aelMouth3(f.m, _aelP);
      aelSprite3(h, _aelP.x, _aelP.y, _aelP.z, 0.6 + 1.1 * k, 'disc', AEL3.glow, 0.35 + 0.4 * k);
      aelSprite3(h, _aelP.x, _aelP.y, _aelP.z, 0.3 + 0.5 * k, 'spark', '#e8fbff', 0.5 + 0.4 * k);
      const sd = aelSeed3(f, 'sd', 10, () => ({ a: Math.random() * 6.3, b: Math.random() * 6.3, r: 1.2 + Math.random() * 1.2, o: Math.random() }));
      for (const q of sd) {
        const v = (k + q.o) % 1;
        const r = q.r * (1 - v);
        aelSprite3(h, _aelP.x + Math.cos(q.a) * Math.cos(q.b) * r, _aelP.y + Math.sin(q.b) * r, _aelP.z + Math.sin(q.a) * Math.cos(q.b) * r, 0.18, 'spark', AEL3.glowV, 0.8 * v);
      }
    } else if (f.kind === 'fall') aelFxFall3(h, f, u);
    else if (f.kind === 'gust') aelFxGust3(h, f, u, k);
    else if (f.kind === 'roar') {
      aelMouth3(f.m, _aelP, _aelDir);
      const sd = aelSeed3(f, 'sd', 12, () => ({ o: Math.random() * 0.6, s: 0.5 + Math.random() * 0.6, x: Math.random() - 0.5, y: Math.random() - 0.2 }));
      for (const q of sd) {
        const v = (u - q.o) / 1.0;
        if (v < 0 || v > 1) continue;
        const d = v * 4.5;
        const o = fx3Take(h, 'smoke');
        o.position.set(_aelP.x + _aelDir.x * d + q.x * d * 0.6, _aelP.y + _aelDir.y * d + (q.y + 0.5) * d * 0.5, _aelP.z + _aelDir.z * d + q.x * d * 0.3);
        const s = q.s * (0.6 + v * 2.2);
        o.scale.set(s, s, 1);
        o.material.color.set('#8a7ac8');
        o.material.opacity = 0.32 * (1 - v);
      }
    } else if (f.kind === 'shatter') aelFxShatter3(h, f, u, k);
  }
}
// Abgrund-Atem: Kegel aus drei Hüllen vom Maul entlang der Linie, darin strömende Lichtteilchen und Kristallsplitter
function aelFxBreath3(h, f, u, k) {
  const m = f.m;
  aelMouth3(m, _aelP, null);
  // Ziel am Boden: Ende der Linie
  _aelP2.set(f.tx * U3, 0.3, f.ty * U3);
  _aelDir.subVectors(_aelP2, _aelP);
  const full = _aelDir.length();
  _aelDir.divideScalar(full || 1);
  const grow = Math.min(1, u / 0.18);
  const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  const len = full * grow;
  const shells = [[2.9, '#3a2290', 0.26], [1.8, AEL3.glowV, 0.3], [0.85, AEL3.glow, 0.45], [0.3, '#f2fdff', 0.6]];
  shells.forEach(([r, col, op], i) => {
    const o = fx3Take(h, 'coneG');
    o.position.copy(_aelP).addScaledVector(_aelDir, len / 2);
    o.scale.set(r * (0.9 + 0.1 * Math.sin(u * 30 + i)), Math.max(0.01, len), r * (0.9 + 0.1 * Math.cos(u * 27 + i)));
    o.quaternion.setFromUnitVectors(_aelY, _aelNeg.copy(_aelDir).negate());
    o.rotateY(u * (2 + i));
    o.material.color.set(col);
    o.material.opacity = op * fade;
  });
  const sd = aelSeed3(f, 'sd', 40, () => ({ o: Math.random(), a: Math.random() * 6.3, r: Math.random(), s: 0.35 + Math.random() * 0.6, c: Math.random() }));
  for (const q of sd) {
    const v = (q.o + u * 1.7) % 1;
    if (v > grow) continue;
    const rr = q.r * 2.6 * v;
    // quer zur Strahlrichtung versetzt
    const px = _aelP.x + _aelDir.x * full * v + Math.cos(q.a) * rr * Math.abs(_aelDir.z);
    const pz = _aelP.z + _aelDir.z * full * v - Math.cos(q.a) * rr * Math.abs(_aelDir.x);
    const py = _aelP.y + _aelDir.y * full * v + Math.sin(q.a) * rr;
    aelSprite3(h, px, Math.max(0.1, py), pz, q.s * (0.6 + v), q.c < 0.5 ? 'spark' : 'disc', q.c < 0.35 ? '#f2fdff' : q.c < 0.7 ? AEL3.glow : AEL3.glowV, 0.75 * fade * (1 - v * 0.4));
  }
  for (const q of aelSeed3(f, 'cr', 8, () => ({ o: Math.random(), a: Math.random() * 6.3, r: Math.random(), sp: Math.random() * 6 }))) {
    const v = (q.o + u * 1.2) % 1;
    if (v > grow) continue;
    const rr = q.r * 1.4 * v;
    aelShard3(h, _aelP.x + _aelDir.x * full * v + Math.cos(q.a) * rr, Math.max(0.15, _aelP.y + _aelDir.y * full * v + Math.sin(q.a) * rr), _aelP.z + _aelDir.z * full * v, 0.08, 0.3, u * 9 + q.sp, u * 7, AEL3.glow, 0.9 * fade);
  }
  // Glut im Maul, am Ende des Strahls wirbeln Funken und Staub auf
  aelSprite3(h, _aelP.x, _aelP.y, _aelP.z, 1.6, 'disc', AEL3.glow, 0.45 * fade);
  if (grow >= 1) {
    aelSprite3(h, _aelP2.x, 0.6, _aelP2.z, 3.2, 'disc', AEL3.glowV, 0.3 * fade);
    for (const q of aelSeed3(f, 'end', 10, () => ({ a: Math.random() * 6.3, o: Math.random(), up: 1 + Math.random() * 2.5 }))) {
      const v = (q.o + u * 1.4) % 1;
      const o = fx3Take(h, 'smoke');
      o.position.set(_aelP2.x + Math.cos(q.a) * v * 2.2, 0.3 + v * q.up, _aelP2.z + Math.sin(q.a) * v * 2.2);
      const s = 0.8 + v * 1.6;
      o.scale.set(s, s, 1);
      o.material.color.set('#3a2c66');
      o.material.opacity = 0.4 * (1 - v) * fade;
    }
  }
}
// Kristallsplitter stürzen vom Himmel und zerspringen am Boden (statt der Meteore)
function aelFxFall3(h, f, u) {
  const fall = f.fall;
  const x = f.x * U3, z = f.y * U3;
  if (u < fall) {
    const q = u / fall;
    const y = 0.2 + (1 - q * q) * 11;
    const ox = (1 - q * q) * 1.6;
    aelShard3(h, x + ox, y + 0.9, z - ox * 0.4, 0.5, 2.0, Math.PI, 0.2, AEL3.glow, 0.95);
    const o = fx3Take(h, 'cone');
    o.position.set(x + ox, y + 0.9, z - ox * 0.4);
    o.scale.set(0.32, 1.6, 0.32);
    o.rotation.set(Math.PI, 0, 0.2);
    o.material.color.set('#241c4a');
    o.material.opacity = 1;
    for (let i = 1; i <= 4; i++) aelSprite3(h, x + ox + i * 0.25, y + 1.6 + i * 0.9, z - ox * 0.4 - i * 0.1, 0.9 - i * 0.12, 'disc', i < 2 ? AEL3.glow : AEL3.glowV, 0.5 - i * 0.08);
    // Schatten wächst am Boden
    const sh = fx3Take(h, 'planeN');
    fx3Ground(sh, f.x, f.y, 0.4 + q * 1.2, 0.05, 'disc');
    fx3Color(sh, '#120c2a', 0.25 + q * 0.35);
    return;
  }
  const v = (u - fall) / (f.dur - fall);
  const sd = aelSeed3(f, 'sd', 12, () => ({ a: Math.random() * 6.3, sp: 2 + Math.random() * 4, up: 2 + Math.random() * 5, s: 0.06 + Math.random() * 0.12, l: 0.2 + Math.random() * 0.4, r: Math.random() * 6 }));
  const tt = u - fall;
  for (const q of sd) {
    const y = 0.3 + q.up * tt - 9 * tt * tt;
    if (y < 0) continue;
    aelShard3(h, x + Math.cos(q.a) * q.sp * tt, y, z + Math.sin(q.a) * q.sp * tt, q.s, q.l, tt * 10 + q.r, tt * 8, q.r > 3 ? AEL3.glow : AEL3.glowV, 1 - v);
  }
  // Rest des Kristalls steckt kurz im Boden und versinkt
  if (v < 0.8) aelShard3(h, x, 0.4 - v * 0.5, z, 0.42 * (1 - v), 1.2 * (1 - v), 0.15, 0.1, AEL3.glow, 0.85 * (1 - v));
  aelSprite3(h, x, 0.6, z, 2.4 * (1 - v * 0.5), 'disc', AEL3.glow, 0.35 * (1 - v));
}
// Flügelstoß / Landung: Staub und Splitter fliegen flach nach außen (eine Wolke, keine Linie am Boden)
function aelFxGust3(h, f, u, k) {
  const x = f.x * U3, z = f.y * U3;
  const R = f.r || 12;
  const sd = aelSeed3(f, 'sd', 30, () => ({ a: Math.random() * 6.3, s: 0.8 + Math.random() * 1.3, y: 0.2 + Math.random() * 0.9, d: 0.6 + Math.random() * 0.4 }));
  const e = easeOut(k);
  for (const q of sd) {
    const d = (1.5 + R * q.d * e);
    const o = fx3Take(h, 'smoke');
    o.position.set(x + Math.cos(q.a) * d, q.y + e * 0.6, z + Math.sin(q.a) * d * 0.9);
    const s = q.s * (0.7 + e * 1.6);
    o.scale.set(s, s, 1);
    o.material.color.set(q.d > 0.8 ? '#7a6ab8' : '#4a3a80');
    o.material.opacity = 0.5 * (1 - k);
  }
  for (const q of aelSeed3(f, 'sp', 34, () => ({ a: Math.random() * 6.3, d: 0.5 + Math.random() * 0.5, up: 1 + Math.random() * 3, c: Math.random() }))) {
    const d = 1 + R * 1.1 * q.d * e;
    const y = 0.3 + q.up * k * 2 - 4 * k * k;
    if (y < 0) continue;
    aelSprite3(h, x + Math.cos(q.a) * d, y, z + Math.sin(q.a) * d * 0.9, 0.22, 'spark', q.c < 0.5 ? AEL3.glow : AEL3.glowV, 0.9 * (1 - k));
  }
}
// Tod: die Kristalle auf dem Rücken zerspringen – Splitter fliegen hoch und fallen, Funken, das Leuchten erlischt
function aelFxShatter3(h, f, u, k) {
  const a = f.a;
  if (!a || !a.bones) return;
  const sd = aelSeed3(f, 'sd', 26, (v, i) => ({ b: [AB3.chest, AB3.body, AB3.tail1, AB3.tail2, AB3.neck1, AB3.neck2][i % 6], ox: (Math.random() - 0.5) * 0.4, oz: (Math.random() - 0.5) * 0.5, a: Math.random() * 6.3, sp: 1.5 + Math.random() * 4, up: 3 + Math.random() * 5, s: 0.08 + Math.random() * 0.16, l: 0.25 + Math.random() * 0.5, r: Math.random() * 6 }));
  if (!f.base) {
    // Ausgangspunkte einmal aus den Knochen (über dem Rücken)
    f.base = sd.map((q) => {
      const p = new THREE.Vector3(q.ox, 0.45, q.oz);
      a.bones[q.b].localToWorld(p);
      return p;
    });
  }
  sd.forEach((q, i) => {
    const p = f.base[i];
    const y = p.y + q.up * u - 9 * u * u;
    if (y < 0.05) return;
    aelShard3(h, p.x + Math.cos(q.a) * q.sp * u, y, p.z + Math.sin(q.a) * q.sp * u, q.s, q.l, u * 8 + q.r, u * 6, q.r > 3 ? AEL3.glow : AEL3.glowV, 1 - k);
    if (i % 2 === 0) aelSprite3(h, p.x + Math.cos(q.a) * q.sp * u * 0.8, Math.max(0.1, y + 0.2), p.z + Math.sin(q.a) * q.sp * u * 0.8, 0.3, 'spark', '#f2fdff', 0.8 * (1 - k));
  });
}
if (typeof FX3_HOOKS !== 'undefined') FX3_HOOKS.push({ parts: [], fn: aelFx3 });

// --- Anbindung an den Kampf (gegner.js, endboss.js, effekte.js) -------------------------------------------
// Ankündigung eines Endboss-Angriffs (Host und Mitspieler): Pose merken, Effekte anlegen. Gibt true zurück, wenn der
// gewöhnliche Meteor-Fall entfallen soll (in 3D stürzen stattdessen Kristalle).
function aelTelegraph(m, kind, circles, inner, delay) {
  const now = game.time;
  let dir = null;
  if (kind === 'line' && circles.length) {
    const end = circles[circles.length - 1];
    dir = Math.atan2(end.x - m.x, end.y - feetY(m));
  } else if ((kind === 'buster' || kind === 'charge' || kind === 'leap') && circles.length) {
    const end = circles[circles.length - 1];
    dir = Math.atan2(end.x - m.x, end.y - feetY(m));
  }
  m.aelCast = { kind, t0: now, d: delay, dir };
  if (!V3.on) return false;
  if (kind === 'line' && circles.length) {
    const end = circles[circles.length - 1];
    aelAddFx3({ kind: 'charge', m, dur: delay });
    later(delay, () => aelAddFx3({ kind: 'breath', m, tx: end.x + (end.x - m.x) * 0.08, ty: end.y + (end.y - feetY(m)) * 0.08, dur: 0.95 }));
  } else if (kind === 'meteor') {
    for (const c of circles) later(Math.max(0, delay - 0.5), () => aelAddFx3({ kind: 'fall', x: c.x, y: c.y, fall: 0.5, dur: 1.4 }));
    return true;
  } else if (kind === 'nova') {
    later(delay, () => {
      aelAddFx3({ kind: 'gust', x: m.x, y: feetY(m), r: 13, dur: 1.1 });
      shakeScreen(10);
    });
  } else if (kind === 'slam') later(delay, () => aelAddFx3({ kind: 'gust', x: m.x, y: feetY(m), r: 7, dur: 0.8 }));
  else if (kind === 'leap') later(delay + 0.3, () => aelAddFx3({ kind: 'gust', x: m.x, y: feetY(m), r: 6, dur: 0.7 }));
  else if (kind === 'doom') {
    later(0.2, () => aelAddFx3({ kind: 'gust', x: m.homeX, y: m.homeY, r: 6, dur: 0.9 }));
    later(delay, () => {
      aelAddFx3({ kind: 'gust', x: m.homeX, y: m.homeY + 10, r: 16, dur: 1.3 });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + Math.random() * 0.5;
        const d = 180 + Math.random() * 300;
        later(Math.random() * 0.5, () => aelAddFx3({ kind: 'fall', x: m.homeX + Math.cos(a) * d, y: m.homeY + Math.sin(a) * d, fall: 0.45, dur: 1.3 }));
      }
    });
  }
  return false;
}
// Brüllen beim Phasenwechsel (raidRoarFx, auch beim Mitspieler)
function aelRoar(m) {
  m.aelRoar = game.time;
  aelRoarFx3(m);
  aelAddFx3({ kind: 'gust', x: m.x, y: feetY(m), r: 9, dur: 1.2 });
}
// Tod: längere Leiche (Zusammensinken), Blickrichtung behalten
function aelCorpse(m, e) {
  e.dur = 4.6;
  const a = m.__k3 && actors3.get(m.__k3);
  if (a) e.heading3 = a.heading;
  if (typeof shakeScreen === 'function') shakeScreen(10);
}
// Leiche in 3D (syncCorpse3): Todesanimation, ab 1,3 s zerspringen die Kristalle, am Ende versinkt er
function aelCorpse3(a, e) {
  if (e.heading3 != null) a.heading = e.heading3;
  const dt = Math.min(0.1, Math.max(0, game.time - (a.aelT ?? game.time)));
  a.aelT = game.time;
  const S = aelAnim3(a, e, dt || 1 / 60, true);
  const u = game.time - e.start;
  if (u > 1.3 && !e.aelShatter) {
    e.aelShatter = true;
    aelAddFx3({ kind: 'shatter', a, dur: 1.6 });
    shakeScreen(9);
  }
  const sink = Math.max(0, u - 3.2) / 1.4;
  if (sink > 0) a.group.position.y -= sink * a.model.height * a.model.scale * 0.55;
  if (a.mats.glow && u > 1.3) a.mats.glow.color.setScalar(Math.max(0.05, 0.9 - (u - 1.3) * 0.9));
  if (a.mats.lit) a.mats.lit.emissive.setRGB(0, 0, 0);
  return S;
}
