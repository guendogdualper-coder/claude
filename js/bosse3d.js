// Endbosse der Karten in 3D (seit 14.80): eigene Modelle, eigene Animationen und eigene 3D-Effekte nach dem Muster von
// Aelvyr (aelvyr.js). Vorher waren die Endbosse der Raid-Hallen (raid_*) nur das vergrößerte allgemeine Modell ihrer
// Familie (Wolf, Bär, Ork, Dämon, Riese, Naga, Untoter) mit Krone und Leuchtkugeln und wurden wie jedes Monster bewegt.
//
// Diese Datei: Baukasten (Skelette, weich gewichtete Leiber, doppelseitige Flächen), Animation je Bauart (Zweibeiner,
// Vierbeiner, Naga) und die Effekte (FX3_HOOKS). Die Modelle selbst stehen in bosse3d-modelle.js (BOSS3[id]).
// Bauarten:
// - Zweibeiner (Ork-Khan, Dämonenfürst, Riese, Titan, Lich): Becken, Bauch, Brust, Hals, Kopf, Kiefer, Arme, Beine mit
//   Fuß (Beine per IK: Füße bleiben beim Ducken am Boden), dazu je nach Boss Schwanz, Flügel und Umhang.
// - Vierbeiner (Wolf, Bär): Hüfte, Brust, Hals, Kopf, Kiefer, Schwanz, vier Beine aus drei Gliedern.
// - Naga: Schlangenleib aus acht Gliedern (am Boden geringelt, dann aufgerichtet), darauf Oberkörper, Arme und Kopf.
// Animation: Atmen, Laufen, Kopf folgt dem Ziel, drei Nahkampf-Posen im Wechsel, Brüllen bei Kampfbeginn und
// Phasenwechsel, eigene Pose je Endboss-Angriff (Strahl, Meteore, Nova, Stampfer, Tankschlag, Sprung, Sturm,
// Vernichtung), Kristall-Schild (Kanalisieren), Taumeln nach dem Schild, Tod (eigener Ablauf je Bauart).
// Effekte nur in 3D, je Boss ein Thema (Erde, Feuer, Glut, Eis, Gift, Moor, Seelenfeuer, Sturm, Schatten, Blut, Knochen):
// Brocken, Flammen, Splitter, Blitze, Dampf – keine Bodenringe, Runen oder Sterne; Warnflächen bleiben. Kein
// Bildschirmblitz, nur kurzes Beben. Mechanik und Balance unverändert (gleiche Angriffe, Zeiten, Kreise).

const BOSS3 = {};
const isBoss3 = (id) => !!BOSS3[id];

// --- Baukasten ----------------------------------------------------------------------------------------------
const _b3M = new THREE.Matrix4();
// Leib als stehender Querschnittskörper (loft3 dreht nach oben): Zeilen [y, Mitte z, halbe Breite, vorn, hinten]
function bsTorso3(key, rows, rad = 16, sub = 4) {
  return geo3('bs:torso:' + key, () => {
    const g = loft3(rows.map(([y, cz, hw, fr, bk]) => [y, -cz, hw, bk, fr]), rad, sub).clone();
    g.applyMatrix4(_b3M.makeRotationX(-Math.PI / 2));
    g.computeVertexNormals();
    g.userData = {};
    return g;
  });
}
// Form mit eigenen Knochengewichten (wie aelSkin3, eigener Schlüssel)
const bsSkin3 = (key, geo, fn) => aelSkin3('bs:' + key, geo, fn);
// Gewichte entlang einer Gelenkkette [[Knochen, Punkt], …] (aelvyr.js)
const bsChain3 = (chain) => (x, y, z) => aelChainW3(chain, x, y, z);
const bsOcta3 = () => geo3('bs:okta', () => new THREE.OctahedronGeometry(1, 0));
const bsLerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const bsAdd3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// Doppelseitige Fläche aus einem Raster (Flughaut, Umhang, Banner, Schleier): pt(i, j) → Punkt im Modell, wt(i, j) →
// Gewichte, col(i, j, s) → Farbe der Seite s (1 vorn, -1 hinten). Jede Seite hat eigene Dreiecke und Normalen und liegt
// ein wenig versetzt: von keiner Seite schwarz (wie die Flughaut von Aelvyr). mat 'face' → ohne dicken Umriss.
const _b3C = new THREE.Color();
function bsSheet3(key, ni, nj, pt, wt, col, thick = 0.006) {
  ni = lodSeg3(ni, 2);
  nj = lodSeg3(nj, 2);
  return geo3('bs:blatt:' + key + ni + ',' + nj, () => {
    const P = [];
    for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) P.push(pt(i / ni, j / nj));
    const at = (i, j) => P[Math.max(0, Math.min(ni, i)) * (nj + 1) + Math.max(0, Math.min(nj, j))];
    const pos = [], si = [], sw = [], cl = [], idx = [];
    for (const s of [1, -1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= ni; i++) {
        for (let j = 0; j <= nj; j++) {
          const a = at(i - 1, j), b = at(i + 1, j), c = at(i, j - 1), d = at(i, j + 1);
          const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
          const vx = d[0] - c[0], vy = d[1] - c[1], vz = d[2] - c[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l; ny /= l; nz /= l;
          const p = at(i, j);
          pos.push(p[0] + nx * thick * s, p[1] + ny * thick * s, p[2] + nz * thick * s);
          aelPushW3(si, sw, wt(i / ni, j / nj));
          _b3C.set(col(i / ni, j / nj, s));
          cl.push(_b3C.r, _b3C.g, _b3C.b);
        }
      }
      const V = (i, j) => base + i * (nj + 1) + j;
      for (let i = 0; i < ni; i++) {
        for (let j = 0; j < nj; j++) {
          if (s > 0) idx.push(V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j), V(i + 1, j + 1), V(i, j + 1));
          else idx.push(V(i, j), V(i + 1, j + 1), V(i + 1, j), V(i, j), V(i, j + 1), V(i + 1, j + 1));
        }
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
// Fläche ins Modell (ohne Umriss), Schatten mit echter Form
function bsSheetAdd3(b, A, geo, shadow = true) {
  A(geo, null, { mat: 'face', shade: 0 });
  if (shadow) (b.lists.shadow = b.lists.shadow || []).push({ geo, color: '#000000', m: new THREE.Matrix4(), bone: 0, shade: 0, parent: null, top: null, topK: 0.5, shine: 0, ao: 0 });
}
// Stacheln, Hörner, Zacken von p in Richtung d
const bsSpike3 = (A, len, r, col, p, d, o = {}) => pointAt3(A, horn3(+len.toFixed(3), +r.toFixed(3), o.seg || 6), col, p, d, Object.assign({ noShadow: len < 0.25 }, o));
// leuchtender Kristall
const bsGem3 = (A, col, p, s, r, bone) => A(bsOcta3(), col, { bone, p, s, r: r || [0, 0, 0], mat: 'glow', noShadow: true });

// --- Zweibeiner: Gelenke und Skelett ------------------------------------------------------------------------
const BB3 = {
  root: 0, pelvis: 1, spine: 2, chest: 3, neck: 4, head: 5, jaw: 6, upL: 7, foL: 8, haL: 9, upR: 10, foR: 11, haR: 12,
  thL: 13, shL: 14, ftL: 15, thR: 16, shR: 17, ftR: 18, t1: 19, t2: 20, t3: 21, wL1: 22, wL2: 23, wR1: 24, wR2: 25, c1: 26, c2: 27
};
const bsArmB3 = (sx) => (sx > 0 ? [BB3.upL, BB3.foL, BB3.haL] : [BB3.upR, BB3.foR, BB3.haR]);
const bsLegB3 = (sx) => (sx > 0 ? [BB3.thL, BB3.shL, BB3.ftL] : [BB3.thR, BB3.shR, BB3.ftR]);
const bsWingB3 = (sx) => (sx > 0 ? [BB3.wL1, BB3.wL2] : [BB3.wR1, BB3.wR2]);
// J: hipY, hipX, kneeY, ankleY, footL, waistY, chestY, shY, shX, neckY, headY, headZ, hunch, upper, fore, hand,
// armOut, jaw [y, z] relativ zum Kopf, tail [[x,y,z]…], wing [Ansatz], cape [oben, unten]
function bsBipJ3(J) {
  const h = J.hunch || 0;
  const P = {
    pelvis: [0, J.hipY, 0], spine: [0, J.waistY, h * 0.3], chest: [0, J.chestY, h * 0.65], neck: [0, J.neckY, h + 0.02],
    head: [0, J.headY, J.headZ], jaw: [0, J.headY + J.jaw[0], J.headZ + J.jaw[1]]
  };
  for (const sx of [1, -1]) {
    const S = [sx * J.shX, J.shY, h * 0.65];
    const E = [S[0] + sx * J.armOut, S[1] - J.upper, S[2] - 0.03];
    const W = [E[0] + sx * J.armOut * 0.6, E[1] - J.fore, E[2] + 0.05];
    const Hd = [W[0] + sx * J.armOut * 0.2, W[1] - J.hand, W[2] + 0.02];
    const H = [sx * J.hipX, J.hipY - 0.04, 0];
    const K = [sx * J.hipX, J.kneeY, 0];
    const Ak = [sx * J.hipX, J.ankleY, 0];
    const T = [sx * J.hipX, 0.03, J.footL];
    P[sx] = { S, E, W, Hd, H, K, A: Ak, T };
  }
  return P;
}
function bsBipRig3(J) {
  const P = bsBipJ3(J);
  const rig = [];
  const bone = (pos, parent) => rig.push({ pos, parent });
  bone([0, 0, 0], -1);
  bone(P.pelvis, 0);
  bone(P.spine, 1);
  bone(P.chest, 2);
  bone(P.neck, 3);
  bone(P.head, 4);
  bone(P.jaw, 5);
  for (const sx of [1, -1]) {
    bone(P[sx].S, 3);
    bone(P[sx].E, rig.length - 1);
    bone(P[sx].W, rig.length - 1);
  }
  for (const sx of [1, -1]) {
    bone(P[sx].H, 1);
    bone(P[sx].K, rig.length - 1);
    bone(P[sx].A, rig.length - 1);
  }
  const T = J.tail || [[0, J.hipY - 0.05, -0.25], [0, J.hipY - 0.3, -0.6], [0, J.hipY - 0.55, -1.0]];
  bone(T[0], 1);
  bone(T[1], 19);
  bone(T[2], 20);
  const Wg = J.wing || [J.shX * 0.45, J.shY - 0.05, -0.25];
  for (const sx of [1, -1]) {
    bone([sx * Wg[0], Wg[1], Wg[2]], 3);
    bone([sx * (Wg[0] + 0.85), Wg[1] + 0.5, Wg[2] - 0.15], rig.length - 1);
  }
  const Cp = J.cape || [[0, J.shY, -0.3], [0, J.hipY, -0.4]];
  bone(Cp[0], 3);
  bone(Cp[1], 26);
  return { rig, P };
}
// Leib und Glieder eines Zweibeiners (weich gewichtet). o: rows (Leib), arm [r Schulter, Mitte, Ellbogen, Mitte,
// Handgelenk], leg [r Hüfte, Mitte, Knie, Mitte, Knöchel], top/shade wie bei allen Teilen
function bsBipBody3(id, A, J, P, o) {
  const C = o.C;
  const BI = o.B || BB3;
  const armB = o.armB || bsArmB3;
  const skin = { top: o.skinTop || C.skinTop, topK: o.topK == null ? 0.5 : o.topK, shade: o.shade == null ? 0.25 : o.shade, shadowExact: true };
  const torsoW = bsChain3([[BI.pelvis, [0, P.pelvis[1] - 0.2, 0]], [BI.pelvis, P.pelvis], [BI.spine, P.spine], [BI.chest, P.chest], [BI.neck, P.neck], [BI.head, P.head]]);
  if (o.rows) A(bsSkin3(id + ':leib' + GEO3_LOD, bsTorso3(id + ':leib', o.rows, 18, 4), torsoW), o.torsoCol || C.skin, skin);
  for (const sx of [1, -1]) {
    const Q = P[sx];
    const [ub, fb, hb] = armB(sx);
    const ar = o.arm || [0.15, 0.13, 0.1, 0.1, 0.075];
    const mid = (a, b, k, dx = 0) => [(a[0] + b[0]) * k + dx * sx, (a[1] + b[1]) * k, (a[2] + b[2]) * k];
    if (!o.noArms) {
      const pts = [Q.S, mid(Q.S, Q.E, 0.5, 0.02), Q.E, mid(Q.E, Q.W, 0.5), Q.W];
      A(bsSkin3(id + ':arm' + sx + GEO3_LOD, tubeProfile3(pts, ar, 20, 12), bsChain3([[ub, Q.S], [fb, Q.E], [hb, Q.W], [hb, Q.Hd]])), o.armCol || C.skin, skin);
    }
    if (!o.noLegs) {
      const [tb, sb, fb2] = bsLegB3(sx);
      const lr = o.leg || [0.17, 0.15, 0.11, 0.1, 0.075];
      const pts = [Q.H, mid(Q.H, Q.K, 0.5, 0.01), Q.K, mid(Q.K, Q.A, 0.5), Q.A];
      A(bsSkin3(id + ':bein' + sx + GEO3_LOD, tubeProfile3(pts, lr, 20, 12), bsChain3([[tb, Q.H], [sb, Q.K], [fb2, Q.A], [fb2, Q.T]])), o.legCol || C.skin, skin);
    }
  }
}
// Hand mit Fingern (Faust halb geschlossen) oder Klauen
function bsHand3(A, sx, P, r, col, o = {}) {
  const Q = P[sx];
  const hb = (o.armB || bsArmB3)(sx)[2];
  const c = bsLerp3(Q.W, Q.Hd, 0.45);
  A(ball(12), col, { bone: hb, p: c, s: [r * 0.9, r * 1.1, r * 1.05], top: o.top, topK: 0.5, shade: 0.2 });
  for (let k = 0; k < 4; k++) {
    const z = c[2] + (k - 1.5) * r * 0.5;
    const p0 = [c[0] + sx * r * 0.25, c[1] - r * 0.7, z + r * 0.35];
    const p1 = [p0[0] + sx * r * 0.05, p0[1] - r * 0.55, p0[2] + r * 0.25];
    const p2 = [p1[0], p1[1] - r * 0.3, p1[2] - r * 0.25];
    A(tubeProfile3([p0, p1, p2], [r * 0.24, r * 0.21, r * 0.16], 6, 6), col, { bone: hb, top: o.top, topK: 0.5, noShadow: true });
    if (o.claw) bsSpike3(A, r * 0.55, r * 0.11, o.claw, p2, [0, -1, -0.6], { bone: hb, seg: 5, shine: 0.6 });
  }
  const tb = [c[0] - sx * r * 0.45, c[1] - r * 0.25, c[2] + r * 0.45];
  A(tubeProfile3([tb, [tb[0] - sx * r * 0.1, tb[1] - r * 0.4, tb[2] + r * 0.35]], [r * 0.26, r * 0.2], 5, 6), col, { bone: hb, noShadow: true });
}

// --- Vierbeiner: Gelenke und Skelett ------------------------------------------------------------------------
const BQ3 = {
  root: 0, body: 1, chest: 2, neck: 3, head: 4, jaw: 5, t1: 6, t2: 7, t3: 8,
  upFL: 9, loFL: 10, pwFL: 11, upFR: 12, loFR: 13, pwFR: 14, upBL: 15, loBL: 16, pwBL: 17, upBR: 18, loBR: 19, pwBR: 20, earL: 21, earR: 22
};
// J: body, chest, neck, head, jaw (Kieferscharnier), tail [3 Punkte + Spitze], fl [Schulter, Ellbogen, Pfote, Zehen],
// bl [Hüfte, Knie, Sprunggelenk, Zehen], ear [x, y, z] (links)
function bsQuadRig3(J) {
  const rig = [];
  const bone = (pos, parent) => rig.push({ pos, parent });
  bone([0, 0, 0], -1);
  bone(J.body, 0);
  bone(J.chest, 1);
  bone(J.neck, 2);
  bone(J.head, 3);
  bone(J.jaw, 4);
  bone(J.tail[0], 1);
  bone(J.tail[1], 6);
  bone(J.tail[2], 7);
  for (const [L, par] of [[J.fl, 2], [J.bl, 1]]) {
    for (const sx of [1, -1]) {
      bone([sx * L[0][0], L[0][1], L[0][2]], par);
      bone([sx * L[1][0], L[1][1], L[1][2]], rig.length - 1);
      bone([sx * L[2][0], L[2][1], L[2][2]], rig.length - 1);
    }
  }
  const ear = J.ear || [0.12, J.head[1] + 0.15, J.head[2] - 0.05];
  bone(ear, 4);
  bone([-ear[0], ear[1], ear[2]], 4);
  return rig;
}
const bsLegQ3 = (front, sx) => (front ? (sx > 0 ? [BQ3.upFL, BQ3.loFL, BQ3.pwFL] : [BQ3.upFR, BQ3.loFR, BQ3.pwFR]) : sx > 0 ? [BQ3.upBL, BQ3.loBL, BQ3.pwBL] : [BQ3.upBR, BQ3.loBR, BQ3.pwBR]);

// --- Naga: Gelenke und Skelett ------------------------------------------------------------------------------
// Schlangenleib n0…n7 (n0 Schwanzspitze am Boden … n7 unter dem Becken), darauf Becken, Bauch, Brust, Hals, Kopf, Kiefer,
// Arme; dazu zwei Knochen für Kapuze/Haube (links, rechts)
const BN3 = {
  root: 0, n0: 1, n1: 2, n2: 3, n3: 4, n4: 5, n5: 6, n6: 7, n7: 8, pelvis: 9, spine: 10, chest: 11, neck: 12, head: 13, jaw: 14,
  upL: 15, foL: 16, haL: 17, upR: 18, foR: 19, haR: 20, hoodL: 21, hoodR: 22
};
const bsArmN3 = (sx) => (sx > 0 ? [BN3.upL, BN3.foL, BN3.haL] : [BN3.upR, BN3.foR, BN3.haR]);
// J: coil [[x,y,z] × 9] (Schwanzspitze … Becken), dazu Oberkörper wie beim Zweibeiner (waistY, chestY, shX, shY …)
function bsNagaRig3(J) {
  const rig = [];
  const bone = (pos, parent) => rig.push({ pos, parent });
  bone([0, 0, 0], -1);
  // n0…n6 am Boden (n6 vorn, wo der Leib sich aufrichtet; die Kette läuft von dort zur Schwanzspitze), n7 sitzt am
  // selben Punkt wie n6 und trägt den aufgerichteten Teil mit dem Oberkörper (Aufrichten, Vorbeugen)
  const C = J.coil;
  for (let i = 0; i < 7; i++) bone(C[i], i === 6 ? 0 : 2 + i);
  bone(C[6], 0);
  const h = J.hunch || 0;
  bone(C[8], 8); // Becken
  bone([0, J.waistY, h * 0.3], 9);
  bone([0, J.chestY, h * 0.65], 10);
  bone([0, J.neckY, h + 0.02], 11);
  bone([0, J.headY, J.headZ], 12);
  bone([0, J.headY + J.jaw[0], J.headZ + J.jaw[1]], 13);
  const P = { pelvis: C[8], spine: [0, J.waistY, h * 0.3], chest: [0, J.chestY, h * 0.65], neck: [0, J.neckY, h + 0.02], head: [0, J.headY, J.headZ] };
  for (const sx of [1, -1]) {
    const S = [sx * J.shX, J.shY, h * 0.65];
    const E = [S[0] + sx * J.armOut, S[1] - J.upper, S[2] - 0.03];
    const W = [E[0] + sx * J.armOut * 0.6, E[1] - J.fore, E[2] + 0.05];
    const Hd = [W[0] + sx * J.armOut * 0.2, W[1] - J.hand, W[2] + 0.02];
    P[sx] = { S, E, W, Hd };
    bone(S, 11);
    bone(E, rig.length - 1);
    bone(W, rig.length - 1);
  }
  bone([0.12, J.neckY, h - 0.05], 11);
  bone([-0.12, J.neckY, h - 0.05], 11);
  return { rig, P };
}

// --- Animation: gemeinsamer Rahmen --------------------------------------------------------------------------
const _b3V = new THREE.Vector3();
const _b3V2 = new THREE.Vector3();
const bsSmooth3 = (x) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function bsEase3(P, T, R, dt) {
  for (const k in T) P[k] += (T[k] - P[k]) * (1 - Math.exp(-dt * (R[k] || 6)));
}
// Angriffsposen: wind 0…1 (Ausholen), hit 0…1…0 (Schlag)
const bsHit3 = (atk) => {
  const p = atk > 0 ? 1 - atk : 0;
  return atk > 0 ? (p < 0.3 ? easeOut(p / 0.3) : 1 - (p - 0.3) / 0.7) : 0;
};
// Endbosse, die gerade ein Bild bekommen haben (für Dauereffekte wie Glut, Nebel, Seelenfeuer)
const BS_LIVE3 = new Map();
// Vorbereitung je Bild (alle Bauarten): Blickrichtung, Ziel, laufender Angriff, Brüllen, Nahkampf
function bsPrelude3(a, e, dt, corpse, def, DEF) {
  resetBones(a);
  if (!a.bs) a.bs = { P: Object.assign({}, DEF), T: Object.assign({}, DEF), walk: 0, flap: 0, lookY: 0, lookX: 0, atkN: 0, inAtk: false, kind: def.melee[0], engaged: false, idleT: 0 };
  const S = a.bs;
  Object.assign(S.T, DEF);
  const now = game.time;
  const frozen = e.frozen > now;
  const c = { S, now, t: frozen ? e.frozenT ?? now : now, frozen, dt: frozen ? 0 : Math.min(0.1, dt), corpse };
  c.moving = !corpse && e.moving && !frozen;
  c.fy = corpse ? e.y : feetY(e);
  if (!corpse) {
    if (a.refX == null || Math.hypot(e.x - a.refX, e.y - a.refY) > 60) { a.refX = e.x; a.refY = e.y; }
    else {
      const dx = e.x - a.refX, dy = e.y - a.refY;
      if (dx * dx + dy * dy > 16) { a.want = Math.atan2(dx, dy); a.refX = e.x; a.refY = e.y; }
    }
  }
  c.foe = !corpse && e.target && !e.target.dead ? e.target : null;
  c.cast = !corpse && e.bsCast && now < e.bsCast.t0 + e.bsCast.d + 1.4 ? e.bsCast : null;
  if (c.cast && c.cast.dir != null) a.want = c.cast.dir;
  else if (c.foe && (e.attackAnim > 0 || e.windup > 0 || !c.moving)) a.want = Math.atan2(c.foe.x - e.x, c.foe.y - e.y);
  if (a.want == null) a.want = e.facing < 0 ? -Math.PI / 2 + 0.55 : Math.PI / 2 - 0.55;
  if (!frozen && !corpse) turnToward(a, a.want, Math.min(1, c.dt * (c.cast ? 6 : 3.5)));
  c.wind = 0;
  c.hit = 0;
  c.roar = 99;
  if (!corpse) {
    if (c.foe && !S.engaged && now - (e.bsRoar || -99) > 3) {
      S.engaged = true;
      e.bsRoar = now;
      bsRoarFx3(e);
    }
    if (!c.foe && e.hp >= e.maxHp) S.engaged = false;
    c.roar = now - (e.bsRoar || -99);
    const winding = e.windup > 0 && !c.cast;
    const striking = e.attackAnim > 0 && !c.cast;
    if ((winding || striking) && !S.inAtk) {
      S.inAtk = true;
      S.atkN++;
      S.kind = def.melee[S.atkN % def.melee.length];
    }
    if (!winding && !striking) S.inAtk = false;
    c.wind = winding ? easeOut(Math.max(0, 1 - e.windup / (e.windupMax || 0.55))) : 0;
    c.hit = striking ? bsHit3(e.attackAnim / 0.25) : 0;
    // Kristall-Schild (Kuppel steht) und Taumeln danach (nur der Host kennt die Zeit)
    c.shield = typeof raidShielded === 'function' && raidShielded(e);
    c.stagger = e.raid && e.raid.stagger > now;
    BS_LIVE3.set(a, { e, at: now });
  }
  return c;
}
// Lage in der Welt, Schatten, Leuchten, Aufblitzen (alle Bauarten)
function bsPlace3(a, e, c, def, hover, glowK) {
  a.lift = hover;
  a.group.position.set(e.x * U3, hover, c.fy * U3);
  a.group.rotation.set(0, a.heading, 0);
  const sc = a.model.scale;
  if (a.blob) {
    a.blob.position.y = 0.02 - hover / sc;
    a.blob.scale.setScalar((def.blob || 1) * (1 - Math.min(0.5, hover * 0.08)));
  }
  if (a.aura) a.aura.position.y = 0.03 - hover / sc;
  const t = c.t;
  if (a.mats.glow) a.mats.glow.color.setScalar(Math.max(0.06, (0.8 + 0.2 * Math.sin(t * 2.4)) * (1 + 0.5 * glowK)));
  const mat = a.mats.lit;
  if (mat && !c.corpse) {
    const flash = e.hitFlash || 0;
    const g = def.emi || [0.06, 0.03, 0.02];
    if (flash > 0) mat.emissive.setRGB(flash * 0.5, flash * 0.45, flash * 0.4);
    else if (c.frozen) mat.emissive.setRGB(0.06, 0.14, 0.3);
    else if (e.stun > 0) mat.emissive.setRGB(0.2, 0.18, 0.02);
    else if (c.wind > 0) mat.emissive.setRGB(g[0] * 2 * c.wind, g[1] * 2 * c.wind, g[2] * 2 * c.wind);
    else mat.emissive.setRGB(g[0] * Math.max(0, glowK), g[1] * Math.max(0, glowK), g[2] * Math.max(0, glowK));
  }
  a.group.updateMatrixWorld(true);
}
// Blick zum Ziel (Gier, Neigung), weich nachgeführt
function bsLook3(a, e, c, k) {
  const S = c.S;
  let ly = 0, lx = 0;
  if (c.foe && k > 0.05) {
    let d = Math.atan2(c.foe.x - e.x, c.foe.y - e.y) - a.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    ly = Math.max(-1.1, Math.min(1.1, d)) * k;
    lx = Math.max(0, 0.45 - Math.hypot(c.foe.x - e.x, c.foe.y - e.y) * U3 * 0.07) * k;
  } else if (!c.corpse) ly = Math.sin(c.t * 0.37) * 0.35 * k;
  S.lookY += (ly - S.lookY) * Math.min(1, c.dt * 3);
  S.lookX += (lx - S.lookX) * Math.min(1, c.dt * 3);
}

// --- Zweibeiner: Animation ----------------------------------------------------------------------------------
// Posenwerte: crouch (Knie beugen), lean (Oberkörper vor +/zurück −), twist (Drehen, + nach links), side (seitlich
// neigen), aLx/aLz/aLe, aRx/aRz/aRe (Arm vor/hoch −, abspreizen +, Ellbogen beugen −), headUp, jaw, wing (0 angelegt …
// 1 ausgebreitet), flapAmp, flapHz, hover, glow, look, sink, kneel, fall (Tod: vornüber), stance (breiter Stand),
// stompL (linkes Bein heben), tail (Schwanz schlagen)
const BS_BIP_DEF3 = { crouch: 0, lean: 0.05, twist: 0, side: 0, aLx: -0.15, aLz: 0.12, aLe: -0.35, aRx: -0.25, aRz: 0.12, aRe: -0.55, headUp: 0, jaw: 0.04, wing: 0.15, flapAmp: 0, flapHz: 0.6, hover: 0, glow: 0, look: 1, sink: 0, kneel: 0, fall: 0, stance: 0, stompL: 0, tail: 0, back: 0, mantle: 0 };
const BS_BIP_RATE3 = { crouch: 7, lean: 6, twist: 7, side: 6, aLx: 9, aLz: 8, aLe: 9, aRx: 9, aRz: 8, aRe: 9, headUp: 6, jaw: 10, wing: 4, flapAmp: 3, flapHz: 3, hover: 3, glow: 3, look: 4, sink: 2, kneel: 4, fall: 2.2, stance: 6, stompL: 8, tail: 6, back: 5, mantle: 3 };
// Bein per IK: Hüfte → Fuß (dz vor, dy nach unten), Fuß bleibt waagerecht
function bsLegIK3(th, sh, ft, L1, L2, dz, dy) {
  let D = Math.hypot(dz, dy);
  const mx = (L1 + L2) * 0.999;
  if (D > mx) { dz *= mx / D; dy *= mx / D; D = mx; }
  const phi = Math.atan2(dz, -dy);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D || 1))));
  const kn = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  th.rotation.x = -(phi + al);
  sh.rotation.x = Math.PI - kn;
  ft.rotation.x = -(th.rotation.x + sh.rotation.x);
}
function bsBipAnim3(a, e, dt, corpse) {
  const def = BOSS3[a.model.boss3];
  const DEF = def.bipDef || (def.bipDef = Object.assign({}, BS_BIP_DEF3, def.base || {}));
  const c = bsPrelude3(a, e, dt, corpse, def, DEF);
  const { S, now } = c;
  const B = a.bones;
  const P = S.P, T = S.T;
  const J = a.model.J;
  if (corpse) {
    const u = now - e.start;
    if (u < 0.7) Object.assign(T, { lean: -0.35, headUp: 1, jaw: 1, aLz: 1.1, aRz: 1.1, aLx: -0.4, aRx: -0.4, aLe: -0.9, aRe: -0.9, crouch: 0.15, glow: 0.8, wing: 1, flapAmp: 0.2, flapHz: 2 });
    else if (u < 1.7) Object.assign(T, { kneel: 1, crouch: 0.6, lean: 0.35, headUp: -0.3, jaw: 0.5, aLx: 0.1, aRx: 0.1, aLz: 0.35, aRz: 0.35, aLe: -0.2, aRe: -0.2, glow: 0.2, wing: 0.8, look: 0 });
    else Object.assign(T, { kneel: 1, crouch: 0.7, fall: 1, lean: 0.2, headUp: -0.2, jaw: 0.3, aLx: -1.4, aRx: -1.4, aLz: 0.5, aRz: 0.5, aLe: -0.1, aRe: -0.1, glow: -1, wing: 1.05, look: 0, sink: u > 3.4 ? 1 : 0 });
  } else if (c.cast) bsBipCast3(e, c.cast, now - c.cast.t0, T, def);
  else if (c.stagger) Object.assign(T, { crouch: 0.45, lean: 0.45, headUp: -0.5, jaw: 0.4, aLx: 0.15, aRx: 0.1, aLz: 0.3, aRz: 0.3, aLe: -0.1, aRe: -0.15, side: 0.2 * Math.sin(now * 2.2), look: 0.2 });
  // seit 14.81: Flieger hüllen sich beim Schild in die Flügel (mantle) – vorher ragten die Flügelspitzen aus der Kuppel
  else if (c.shield) Object.assign(T, { kneel: 0.55, crouch: 0.4, lean: -0.1, aLx: -2.5, aRx: -2.5, aLz: -0.25, aRz: -0.25, aLe: -0.5, aRe: -0.5, headUp: 0.5, jaw: 0.3, glow: 0.8, wing: 1, mantle: 1, look: 0.3 });
  else if (c.roar < 1.9) {
    const k = c.roar / 1.9;
    Object.assign(T, { lean: -0.3, headUp: 1, jaw: k < 0.85 ? 1 : 0.2, aLz: 1.15, aRz: 1.15, aLx: -0.5, aRx: -0.5, aLe: -1.3, aRe: -1.3, crouch: 0.2, stance: 1, glow: 0.6, wing: 1, flapAmp: 0.15, flapHz: 2.4, look: 0.2 });
  } else if (c.moving) Object.assign(T, { lean: (e.dash ? 0.45 : 0.15) + (def.base && def.base.lean || 0), wing: 0.1 });
  else if (c.foe) Object.assign(T, { crouch: 0.22, stance: 0.6, lean: 0.12 + (def.base && def.base.lean || 0), wing: 0.45, aLz: (DEF.aLz || 0) + 0.15, aRz: (DEF.aRz || 0) + 0.15 });
  else {
    S.idleT += c.dt;
    const ph = S.idleT % 12;
    if (ph > 9 && ph < 11) Object.assign(T, { headUp: 0.35, lean: -0.1, aLz: 0.5, aRz: 0.5, wing: 0.8, flapAmp: 0.1, flapHz: 1 });
  }
  if (def.anim) def.anim(T, c, e, 'pre');
  // Nahkampf (gewöhnlicher Angriff)
  const w = c.wind, hit = c.hit;
  if (w > 0 || hit > 0) bsBipMelee3(T, S.kind, w, hit, def);
  bsEase3(P, T, BS_BIP_RATE3, c.dt);
  bsLook3(a, e, c, P.look);

  // --- Phasen ---
  S.flap += c.dt * Math.PI * 2 * P.flapHz;
  const gait = c.moving ? (e.dash ? 2.2 : 1.1) * (def.gait || 1) : 0;
  S.walk += c.dt * Math.PI * 2 * gait;
  const breath = Math.sin(c.t * 1.6);
  const L1 = J.hipY - 0.04 - J.kneeY, L2 = J.kneeY - J.ankleY;
  const legLen = L1 + L2;

  // --- Becken: ducken, knien, Gang ---
  const pel = B[BB3.pelvis];
  const drop = legLen * (0.32 * P.crouch + 0.33 * P.kneel) + 0.25 * P.sink;
  pel.position.y += -drop + 0.012 * breath + (c.moving ? Math.abs(Math.cos(S.walk)) * 0.05 - 0.03 : 0);
  pel.rotation.y = P.twist * 0.25 + (c.moving ? Math.sin(S.walk) * 0.08 : 0);
  pel.rotation.z = c.moving ? Math.sin(S.walk) * 0.03 : 0;
  // Tod: vornüber auf den Boden (Drehung um die Füße), am Ende versinkt er
  const root = B[BB3.root];
  root.rotation.x = 1.25 * bsSmooth3(P.fall);
  root.position.y += -0.25 * P.fall;
  // --- Oberkörper ---
  const sp = B[BB3.spine], ch = B[BB3.chest];
  sp.rotation.x = P.lean * 0.45 + 0.02 * breath;
  sp.rotation.y = P.twist * 0.35;
  sp.rotation.z = P.side * 0.5;
  ch.rotation.x = P.lean * 0.45 - 0.2 * P.back;
  ch.rotation.y = P.twist * 0.4;
  ch.scale.set(1 + 0.025 * breath, 1 + 0.02 * breath, 1 + 0.03 * breath);
  // --- Hals und Kopf ---
  const nk = B[BB3.neck], hd = B[BB3.head];
  nk.rotation.x = -P.headUp * 0.35 - P.lean * 0.35 + S.lookX * 0.4;
  nk.rotation.y = S.lookY * 0.4;
  hd.rotation.x = -P.headUp * 0.5 - P.lean * 0.45 + S.lookX * 0.5 + (def.headTilt || 0);
  hd.rotation.y = S.lookY * 0.55 + Math.sin(c.t * 0.8) * 0.03;
  B[BB3.jaw].rotation.x = (def.jawOpen || 0.55) * P.jaw + 0.02 * (1 + breath);
  // --- Arme ---
  for (const sx of [1, -1]) {
    const [ub, fb] = bsArmB3(sx);
    const U = B[ub], F = B[fb];
    const ax = sx > 0 ? P.aLx : P.aRx, az = sx > 0 ? P.aLz : P.aRz, ae = sx > 0 ? P.aLe : P.aRe;
    const swing = c.moving ? Math.sin(S.walk + (sx > 0 ? Math.PI : 0)) * 0.35 * (e.dash ? 0.4 : 1) : 0;
    U.rotation.set(ax + swing + 0.03 * breath, 0, sx * az);
    F.rotation.x = ae;
  }
  // --- Beine (IK, Füße bleiben am Boden) ---
  for (const sx of [1, -1]) {
    const [tb, sb, fb] = bsLegB3(sx);
    const ph = S.walk + (sx > 0 ? 0 : Math.PI);
    let dz = 0, dy = -legLen + drop - 0.25 * P.sink;
    if (c.moving) {
      const st = (e.dash ? 0.42 : 0.28) * legLen;
      dz = Math.sin(ph) * st;
      dy += Math.max(0, Math.cos(ph)) * 0.22 * legLen;
    }
    // breiter Stand: Füße etwas nach außen; Knien: linkes Knie zum Boden, rechter Fuß vor
    if (P.kneel > 0.01) {
      if (sx > 0) { dz += -0.35 * legLen * P.kneel; dy += 0.1 * P.kneel * legLen; }
      else dz += 0.3 * legLen * P.kneel;
    }
    if (sx > 0 && P.stompL > 0.01) { dy += 0.42 * legLen * P.stompL; dz += 0.2 * legLen * P.stompL; }
    bsLegIK3(B[tb], B[sb], B[fb], L1, L2, dz, Math.min(-0.15 * legLen, dy));
    B[tb].rotation.z = sx * (0.06 * P.stance + 0.02);
    B[tb].rotation.y = -sx * 0.08 * P.stance;
  }
  // --- Schwanz ---
  if (def.tail) {
    for (let i = 0; i < 3; i++) {
      const tb = B[BB3.t1 + i];
      tb.rotation.y = Math.sin(c.t * (c.moving ? 4 : 1.4) - i * 0.9) * (0.18 + i * 0.1) + P.tail * (0.4 + i * 0.2);
      tb.rotation.x = -0.1 * i + 0.25 * P.fall;
    }
  }
  // --- Flügel: anlegen, ausbreiten, schlagen ---
  if (def.wings) {
    const fl = Math.sin(S.flap) * P.flapAmp;
    for (const sx of [1, -1]) {
      const [w1, w2] = bsWingB3(sx);
      const open = Math.max(-0.1, Math.min(1.1, P.wing));
      const mt = P.mantle;
      B[w1].rotation.set(0.15 * (1 - open), sx * ((1 - open) * 1.15 - 0.65 * mt), sx * (0.25 * (1 - open) + fl * 0.9 - 0.15 * open - 0.95 * mt));
      B[w2].rotation.set(0, sx * ((1 - open) * 1.6 - 0.4 * mt), sx * (fl * 0.6 - 0.2 * (1 - open) - 0.55 * mt));
    }
  }
  // --- Umhang: schwingt nach, weht beim Laufen ---
  if (def.cape) {
    const sw = Math.sin(c.t * 1.3) * 0.04;
    B[BB3.c1].rotation.x = -(c.moving ? 0.25 + (e.dash ? 0.3 : 0) : 0.02) - 0.4 * P.lean * 0.5 + sw + 0.3 * P.kneel;
    B[BB3.c2].rotation.x = -(c.moving ? 0.25 : 0.03) + sw * 1.5;
    B[BB3.c1].rotation.z = Math.sin(c.t * 0.9) * 0.03;
  }
  if (def.anim) def.anim(P, c, e, 'post', B);
  // --- Lage in der Welt ---
  let hover = P.hover + (def.float ? def.float + Math.sin(c.t * 1.3) * 0.08 : 0);
  if (c.cast && c.cast.kind === 'leap') {
    const k = (now - c.cast.t0 - c.cast.d) / 0.3;
    if (k > 0 && k < 1) hover += Math.sin(Math.PI * k) * 2.4;
  }
  if (def.wings && P.flapAmp > 0.3) hover += Math.sin(S.flap + 0.6) * 0.1 * P.flapAmp * Math.min(1, P.hover);
  bsPlace3(a, e, c, def, hover, P.glow);
  return S;
}
// Nahkampf: chop (Hieb von oben), sweep (Rundumschlag), punch (Faust der Nebenhand), stomp (Tritt/Stampfen),
// claw (Klauenhieb links), slam2 (beidhändig)
function bsBipMelee3(T, kind, w, hit, def) {
  const add = (k, v) => { T[k] = (T[k] || 0) + v; };
  if (kind === 'chop') {
    add('aRx', -2.5 * w + 2.4 * hit); add('aRe', 0.2 * w - 0.25 * hit); add('aRz', -0.1 * w);
    add('lean', -0.2 * w + 0.55 * hit); add('crouch', 0.1 * w + 0.35 * hit); add('twist', 0.15 * w - 0.25 * hit); add('jaw', 0.5 * w);
  } else if (kind === 'sweep') {
    add('twist', -0.9 * w + 1.6 * hit); add('aRz', 1.0 * w - 0.4 * hit); add('aRx', -0.9 * w - 0.6 * hit); add('aRe', 0.3 * w);
    add('lean', 0.1 * w + 0.15 * hit); add('crouch', 0.25 * w + 0.15 * hit); add('aLz', 0.4 * w);
  } else if (kind === 'punch') {
    add('aLx', 0.5 * w - 1.9 * hit); add('aLe', -1.2 * w + 1.1 * hit); add('twist', -0.5 * w + 0.6 * hit); add('lean', -0.1 * w + 0.3 * hit); add('jaw', 0.6 * hit);
  } else if (kind === 'claw') {
    add('aLx', -2.2 * w + 1.8 * hit); add('aLz', 0.7 * w - 0.6 * hit); add('aLe', -0.5 * w + 0.3 * hit); add('twist', 0.4 * w - 0.6 * hit); add('lean', -0.1 * w + 0.35 * hit); add('jaw', 0.7 * w);
  } else if (kind === 'stomp') {
    add('stompL', 1 * w - 1 * hit); add('lean', -0.15 * w + 0.3 * hit); add('aLz', 0.5 * w); add('aRz', 0.5 * w); add('crouch', 0.4 * hit); add('jaw', 0.6 * hit);
  } else if (kind === 'thrust') {
    // seit 14.81: Stoß mit Dreizack oder Speer (rechts), Nebenhand weit nach hinten
    add('aRx', 0.35 * w - 1.85 * hit); add('aRe', -1.4 * w + 1.35 * hit); add('aRz', 0.25 * w - 0.15 * hit); add('aLz', 0.5 * w); add('aLx', 0.3 * w);
    add('twist', -0.6 * w + 0.8 * hit); add('lean', -0.15 * w + 0.45 * hit); add('crouch', 0.2 * w + 0.2 * hit); add('stance', 0.8 * w); add('jaw', 0.7 * hit);
  } else if (kind === 'slam2') {
    add('aLx', -2.6 * w + 2.4 * hit); add('aRx', -2.6 * w + 2.4 * hit); add('aLz', -0.3 * w); add('aRz', -0.3 * w);
    add('lean', -0.25 * w + 0.7 * hit); add('crouch', 0.5 * hit); add('jaw', 0.6 * w);
  }
}
// seit 14.81: Angriffe der Instanz- und Höllenthron-Bosse auf die Grundposen abgebildet (Kegel wie Atem, Dornen und
// Kreuz wie der Stampfer, Hagel/Lachen wie die Meteore, Ringe wie die Nova, Ult wie die Vernichtung); Sog, Kettenblitz
// und Geschossring haben eigene Posen
const BS_KMAP3 = { fan: 'line', spikes: 'slam', cross: 'slam', rain: 'meteor', pools: 'meteor', ringout: 'nova', core: 'nova', ult: 'doom', quarter: 'doom', qring: 'nova', qcore: 'nova' };
// Endboss-Angriffe: u = Sekunden seit der Ankündigung, d = Dauer bis zum Einschlag
function bsBipCast3(e, c, u, T, def) {
  const d = c.d, after = u - d, k = Math.min(1, u / d);
  if (def.cast && def.cast(e, c, u, T) === true) return;
  const fly = !!def.wings;
  const emitArm = def.emit === 'handL' ? 'L' : 'R';
  const ea = 'a' + emitArm, oa = emitArm === 'R' ? 'aL' : 'aR';
  switch (BS_KMAP3[c.kind] || c.kind) {
    case 'pull':
      // Sog: beide Arme vor, Kraft sammeln – dann alles an sich reißen
      if (after < 0) Object.assign(T, { lean: 0.3, crouch: 0.3, stance: 1, aLx: -1.45, aRx: -1.45, aLz: 0.35, aRz: 0.35, aLe: -0.15, aRe: -0.15, headUp: 0.2, jaw: 0.5, glow: k, look: 0.4, wing: 1, flapAmp: fly ? 0.35 : 0, flapHz: 1.2 });
      else if (after < 0.7) Object.assign(T, { lean: -0.35, crouch: 0.15, stance: 1, aLx: -0.7, aRx: -0.7, aLz: 0.6, aRz: 0.6, aLe: -1.7, aRe: -1.7, headUp: 0.5, jaw: 1, glow: 1, wing: 1.05 });
      break;
    case 'chain':
      // Kettenblitz: Hand zum Himmel, Blitze sammeln – dann auf die Ziele zeigen
      if (after < 0) Object.assign(T, { lean: -0.2, twist: -0.25, [ea + 'x']: -2.8, [ea + 'e']: -0.3, [ea + 'z']: 0.2, [oa + 'z']: 0.9, [oa + 'x']: -0.4, headUp: 0.6, jaw: 0.4, glow: 0.4 + k, look: 0.2, wing: 0.9 });
      else if (after < 0.7) Object.assign(T, { lean: 0.3, twist: 0.25, crouch: 0.25, stance: 1, [ea + 'x']: -1.55, [ea + 'e']: -0.05, [ea + 'z']: 0.05, [oa + 'z']: 0.7, headUp: 0, jaw: 0.9, glow: 1.2, look: 0 });
      break;
    case 'volley':
      // Geschossring: Arme aufreißen, Geschosse fliegen ringsum
      if (u < 0.75) Object.assign(T, { crouch: 0.1, lean: -0.3, aLx: -0.7, aRx: -0.7, aLz: 1.35, aRz: 1.35, aLe: -0.1, aRe: -0.1, headUp: 0.6, jaw: 1, glow: 1.2, stance: 1, wing: 1.05, flapAmp: fly ? 0.4 : 0, flapHz: 2 });
      break;
    case 'line':
      // smash: Waffe hoch über den Kopf und in Zielrichtung in den Boden – die Welle läuft die Linie entlang
      if (def.lineStyle === 'smash') {
        if (after < 0) Object.assign(T, { twist: -0.3, lean: -0.3, aRx: -2.8, aRe: -0.4, aRz: -0.1, aLx: -2.2, aLz: 0.1, headUp: 0.5, jaw: 0.5, glow: k, look: 0, stance: 1 });
        else if (after < 0.95) Object.assign(T, { twist: 0.2, lean: 0.85, crouch: 0.75, aRx: -0.55, aRe: -0.05, aLx: -0.6, aLz: 0.4, headUp: -0.1, jaw: 0.9, glow: 1, look: 0, stance: 1 });
      } else if (def.emit === 'mouth') {
        if (after < 0) Object.assign(T, { lean: -0.3, headUp: 0.8, jaw: 0.3 + 0.4 * k, aLz: 0.6, aRz: 0.6, aLe: -1.2, aRe: -1.2, glow: 0.8 * k, look: 0, wing: 0.8 });
        else if (after < 0.95) Object.assign(T, { lean: 0.35, headUp: -0.25, jaw: 1, aLz: 0.8, aRz: 0.8, aLx: 0.2, aRx: 0.2, crouch: 0.25, glow: 1, look: 0, wing: 1 });
      } else if (after < 0) Object.assign(T, { twist: -0.35, lean: -0.15, ['a' + emitArm + 'x']: -1.0, ['a' + emitArm + 'e']: -1.5, ['a' + emitArm + 'z']: 0.5, headUp: 0.2, jaw: 0.3, glow: 0.9 * k, look: 0, crouch: 0.2 });
      else if (after < 0.95) Object.assign(T, { twist: 0.3, lean: 0.25, ['a' + emitArm + 'x']: -1.55, ['a' + emitArm + 'e']: -0.05, ['a' + emitArm + 'z']: 0.05, jaw: 0.8, glow: 1, look: 0, crouch: 0.3, stance: 1 });
      break;
    case 'meteor':
      if (after < 0.4) Object.assign(T, { lean: -0.35, headUp: 1.1, jaw: 1, aLx: -2.8, aRx: -2.8, aLz: 0.35, aRz: 0.35, aLe: -0.2, aRe: -0.2, glow: 1, look: 0, wing: 1, flapAmp: fly ? 0.5 : 0, flapHz: 1.4, hover: fly ? 1.2 : 0 });
      break;
    case 'nova':
      if (after < 0) Object.assign(T, { crouch: 0.6, lean: 0.3, aLx: -1.1, aRx: -1.1, aLz: -0.55, aRz: -0.55, aLe: -1.4, aRe: -1.4, headUp: -0.2, jaw: 0.3, glow: 1.2 * k, look: 0.3, wing: 0.2, hover: fly ? 2.2 * Math.min(1, u / 0.8) : 0, flapAmp: fly ? 0.7 : 0, flapHz: 1.5 });
      else if (after < 0.6) Object.assign(T, { crouch: 0.1, lean: -0.35, aLx: -0.7, aRx: -0.7, aLz: 1.35, aRz: 1.35, aLe: -0.1, aRe: -0.1, headUp: 0.7, jaw: 1, glow: 1.4, stance: 1, wing: 1.05, hover: 0 });
      break;
    case 'slam':
      if (after < 0) Object.assign(T, { lean: -0.3, aLx: -2.75, aRx: -2.75, aLz: -0.2, aRz: -0.2, aLe: -0.4, aRe: -0.4, headUp: 0.6, jaw: 0.7, look: 0.3, stance: 1, wing: 0.9, hover: fly ? 1.4 * Math.min(1, u / 0.6) : 0, flapAmp: fly ? 0.45 : 0, flapHz: 1.6 });
      else if (after < 0.7) Object.assign(T, { lean: 0.85, crouch: 0.85, aLx: -0.5, aRx: -0.5, aLz: 0.1, aRz: 0.1, aLe: 0, aRe: 0, headUp: -0.2, jaw: 0.9, stance: 1, wing: 1, hover: 0 });
      break;
    case 'buster':
      if (after < 0) Object.assign(T, { twist: -0.55, lean: -0.25, aRx: -2.7, aRe: -0.5, aRz: -0.3, aLx: -0.9, aLz: 0.6, headUp: 0.4, jaw: 0.6, glow: 0.6 * k, stance: 1 });
      else if (after < 0.6) Object.assign(T, { twist: 0.45, lean: 0.6, crouch: 0.4, aRx: -0.15, aRe: -0.05, aRz: 0.1, aLx: 0.3, headUp: -0.1, jaw: 0.9, stance: 1 });
      break;
    case 'leap':
      if (after < 0) Object.assign(T, { crouch: 0.9, lean: 0.35, aLx: 0.55, aRx: 0.55, aLz: 0.3, aRz: 0.3, headUp: 0.3, jaw: 0.4, look: 0.5, wing: 0.9 });
      else if (after < 0.3) Object.assign(T, { crouch: 0, lean: -0.2, aLx: -2.6, aRx: -2.6, aLe: -0.4, aRe: -0.4, headUp: 0.3, jaw: 0.9, wing: 1, flapAmp: fly ? 0.8 : 0, flapHz: 2 });
      else if (after < 0.9) Object.assign(T, { crouch: 0.85, lean: 0.7, aLx: -0.4, aRx: -0.4, aLe: 0, aRe: 0, headUp: -0.2, jaw: 0.7, stance: 1 });
      break;
    case 'charge':
      if (after < 0.5) Object.assign(T, { lean: 0.65, crouch: 0.35, aLx: 0.6, aRx: 0.5, aLz: 0.4, aRz: 0.4, aLe: -0.5, aRe: -0.5, headUp: -0.1, jaw: 0.7, look: 0, wing: 0 });
      break;
    case 'doom':
      if (after < 0) Object.assign(T, { lean: -0.25, aRx: -3.0, aRe: -0.1, aRz: 0.15, aLx: -2.6, aLz: 0.6, aLe: -0.6, headUp: 0.9, jaw: 0.5 + 0.5 * k, glow: 0.4 + 1.2 * k, look: 0, wing: 1, hover: (fly ? 4.2 : def.float ? 2.2 : 0) * bsSmooth3(u / 1.4), flapAmp: fly ? 0.9 : 0, flapHz: 1.05 });
      else if (after < 1.1) Object.assign(T, { lean: 0.85, crouch: 0.9, aLx: -0.4, aRx: -0.4, aLe: 0, aRe: 0, aLz: 0.3, aRz: 0.3, headUp: 0.6, jaw: 1, glow: 1.4, stance: 1, wing: 1.05, hover: 0 });
      break;
    default:
      break;
  }
}

// --- Vierbeiner: Animation ----------------------------------------------------------------------------------
// Posenwerte wie bei Aelvyr (ohne Flügel): rear (Aufbäumen), crouch, neckUp, neckFwd, jaw, twist, curl (Schwanz),
// legsUp (Vorderbeine heben), clawUp (Tatze links hoch), sink, splay, droop, glow, hover, look, ears (anlegen)
const BS_QUAD_DEF3 = { rear: 0, hover: 0, neckUp: 0, neckFwd: 0, jaw: 0.05, crouch: 0, glow: 0, twist: 0, curl: 0, legsUp: 0, clawUp: 0, look: 1, sink: 0, splay: 0, droop: 0, ears: 0, roll: 0, wing: 0.1, flapAmp: 0, flapHz: 0.6 };
const BS_QUAD_RATE3 = { hover: 3.2, rear: 6, neckUp: 5, neckFwd: 9, jaw: 10, crouch: 7, glow: 3, twist: 6, curl: 6, legsUp: 7, clawUp: 9, sink: 2, splay: 3, droop: 3, ears: 6, roll: 2.5, wing: 4, flapAmp: 3, flapHz: 3 };
function bsQuadAnim3(a, e, dt, corpse) {
  const def = BOSS3[a.model.boss3];
  const c = bsPrelude3(a, e, dt, corpse, def, BS_QUAD_DEF3);
  const { S, now } = c;
  const B = a.bones;
  const P = S.P, T = S.T;
  const J = a.model.J;
  if (corpse) {
    const u = now - e.start;
    if (u < 0.7) Object.assign(T, { rear: 0.45, neckUp: 1.1, jaw: 1, glow: 0.8, ears: 1 });
    else Object.assign(T, { rear: -0.05, crouch: 1, neckUp: -0.9, jaw: 0.45, sink: u > 3.4 ? 1 : 0.4, splay: 1, droop: 1, glow: -1, look: 0, roll: 1 });
  } else if (c.cast) bsQuadCast3(e, c.cast, now - c.cast.t0, T, def);
  else if (c.stagger) Object.assign(T, { crouch: 0.6, neckUp: -0.7, jaw: 0.4, splay: 0.3, droop: 0.4, look: 0.2, ears: 1 });
  else if (c.shield) Object.assign(T, { rear: 0.2, neckUp: 1.0, jaw: 0.6, glow: 0.9, crouch: 0.3, look: 0.2 });
  else if (c.roar < 1.9) {
    const k = c.roar / 1.9;
    Object.assign(T, def.howl ? { rear: 0.2, neckUp: 1.4, jaw: k < 0.85 ? 1 : 0.2, glow: 0.6, look: 0, crouch: 0.15 } : { rear: 0.55, legsUp: 0.4, neckUp: 0.9, jaw: k < 0.85 ? 1 : 0.2, glow: 0.6, look: 0.2 });
  } else if (c.moving) Object.assign(T, { neckUp: -0.15, jaw: 0.12, ears: 0.5 });
  else if (c.foe) Object.assign(T, { crouch: 0.3, neckUp: -0.2, neckFwd: 0.2, jaw: 0.3, ears: 1 });
  else {
    S.idleT += c.dt;
    const ph = S.idleT % 12;
    if (ph > 8.5 && ph < 10.5) Object.assign(T, { neckUp: 0.6, jaw: 0.35, look: 0, wing: def.drake ? 0.7 : 0.1 });
  }
  // Drachen (seit 14.81): Flügel je Lage – beim Brüllen und Tod weit offen, im Kampf halb, beim Laufen angelegt
  if (def.drake && !c.cast) {
    if (corpse) Object.assign(T, now - e.start < 0.7 ? { wing: 1.05, flapAmp: 0.3, flapHz: 2 } : { wing: 0.85 });
    else if (c.roar < 1.9) Object.assign(T, { wing: 1.05, flapAmp: 0.25, flapHz: 2.2 });
    else if (c.shield) Object.assign(T, { wing: 1, flapAmp: 0.1, flapHz: 1 });
    else if (c.foe && !c.moving) T.wing = 0.4;
    else if (c.moving && e.dash) T.wing = 0.3;
  }
  const w = c.wind, hit = c.hit;
  if (w > 0 || hit > 0) {
    const add = (k, v) => { T[k] += v; };
    if (S.kind === 'bite') { add('neckUp', 0.3 * w - 0.4 * hit); add('neckFwd', -0.3 * w + 0.9 * hit); add('jaw', 0.7 * w + (hit > 0.6 ? 0 : 0.4 * hit)); add('crouch', 0.3 * w); }
    else if (S.kind === 'claw') { add('rear', 0.35 * w - 0.1 * hit); add('clawUp', 1 * w - 1.3 * hit); add('jaw', 0.4 * w); add('twist', 0.25 * w - 0.35 * hit); }
    else if (S.kind === 'maul') { add('rear', 0.7 * w - 0.6 * hit); add('legsUp', 0.9 * w - 0.9 * hit); add('neckUp', 0.5 * w - 0.4 * hit); add('jaw', 0.8 * w); add('crouch', 0.5 * hit); }
    else { add('twist', 0.5 * w - 0.9 * hit); add('curl', 0.6 * w - 1.2 * hit); add('neckUp', 0.1 * w); add('jaw', 0.5 * hit); }
  }
  bsEase3(P, T, BS_QUAD_RATE3, c.dt);
  bsLook3(a, e, c, P.look);
  const gait = c.moving ? (e.dash ? 2.6 : 1.35) * (def.gait || 1) : 0;
  S.walk += c.dt * Math.PI * 2 * gait;
  const breath = Math.sin(c.t * 1.5);
  const body = B[BQ3.body];
  body.position.y += 0.03 * breath - 0.2 * P.crouch + 0.18 * P.rear - 0.3 * P.sink;
  body.rotation.x = -0.75 * P.rear;
  body.rotation.y = P.twist;
  body.rotation.z = 0.15 * P.splay + 1.2 * bsSmooth3(P.roll);
  body.position.x += 0.35 * bsSmooth3(P.roll);
  if (c.moving) {
    body.position.y += Math.abs(Math.sin(S.walk)) * (e.dash ? 0.08 : 0.04);
    body.rotation.x += Math.sin(S.walk * 2) * (e.dash ? 0.06 : 0.02);
  }
  B[BQ3.chest].scale.set(1 + 0.03 * breath, 1 + 0.025 * breath, 1);
  B[BQ3.chest].rotation.x = -0.12 * P.rear;
  const up = P.neckUp, fwd = P.neckFwd;
  const nk = B[BQ3.neck], hd = B[BQ3.head];
  nk.rotation.x = -0.4 * up + 0.3 * fwd + 0.03 * breath + 0.3 * S.lookX + 0.25 * P.rear;
  nk.rotation.y = 0.45 * S.lookY + 0.4 * P.droop;
  hd.rotation.x = -0.35 * up - 0.15 * fwd + 0.25 * S.lookX + 0.2 * P.rear;
  hd.rotation.y = 0.45 * S.lookY + Math.sin(c.t * 0.9) * 0.04;
  hd.rotation.z = 0.3 * P.droop;
  B[BQ3.jaw].rotation.x = (def.jawOpen || 0.6) * P.jaw + 0.02 * (1 + breath);
  for (const [eb, sx] of [[BQ3.earL, 1], [BQ3.earR, -1]]) {
    B[eb].rotation.x = -0.7 * P.ears + Math.sin(c.t * 2.1 + sx) * 0.05;
    B[eb].rotation.z = sx * 0.3 * P.ears;
  }
  if (def.drake) bsDrakeBones3(B, S, P, c, nk, hd);
  const amp = c.moving ? 0.2 : 0.1;
  for (let i = 0; i < 3; i++) {
    const tb = B[BQ3.t1 + i];
    tb.rotation.y = Math.sin(c.t * (c.moving ? 5 : 1.4) - i * 0.9) * amp * (0.7 + i * 0.3) + P.curl * (0.35 + i * 0.15);
    tb.rotation.x = (def.tailUp || 0) * (i === 0 ? 1 : 0) + (c.moving ? 0.15 : 0) * (i === 0 ? -1 : 0) + 0.15 * P.droop * i;
  }
  // Beine: Gang (diagonal), Aufbäumen (Hinterbeine bleiben senkrecht), Ducken, Tod
  const legs = [[true, 1, 0.25], [true, -1, 0.75], [false, 1, 0], [false, -1, 0.5]];
  for (const [front, sx, off] of legs) {
    const [ub, lb, pb] = bsLegQ3(front, sx);
    const U = B[ub], L = B[lb], Pw = B[pb];
    if (c.moving) {
      const ph = S.walk + off * Math.PI * 2;
      const st = e.dash ? 0.65 : 0.45;
      U.rotation.x = -Math.sin(ph) * st;
      L.rotation.x = Math.max(0, Math.cos(ph)) * (front ? 0.7 : -0.75);
      Pw.rotation.x = Math.max(0, Math.cos(ph)) * (front ? -0.5 : 0.5);
    }
    if (front) {
      U.rotation.x += -1.15 * P.legsUp + 0.35 * P.crouch + 0.6 * P.rear;
      L.rotation.x += 0.9 * P.legsUp + 0.5 * P.crouch;
      Pw.rotation.x += -0.4 * P.crouch;
    } else {
      U.rotation.x += 0.7 * P.rear - 0.45 * P.crouch;
      L.rotation.x += -0.7 * P.crouch - 0.2 * P.rear;
      Pw.rotation.x += 0.6 * P.crouch;
    }
    U.rotation.z = sx * 0.5 * P.splay;
  }
  if (P.clawUp > 0.01) {
    B[BQ3.upFL].rotation.x += -1.5 * P.clawUp;
    B[BQ3.upFL].rotation.z += 0.35 * P.clawUp;
    B[BQ3.loFL].rotation.x += 0.9 * P.clawUp;
  }
  if (def.anim) def.anim(P, c, e, 'post', B);
  let hover = P.hover;
  if (c.cast && c.cast.kind === 'leap') {
    const k = (now - c.cast.t0 - c.cast.d) / 0.3;
    if (k > 0 && k < 1) hover += Math.sin(Math.PI * k) * 2.6;
  }
  // Drachen heben und senken sich im Flug mit dem Flügelschlag
  if (def.drake && P.flapAmp > 0.3 && P.hover > 0.2) hover += Math.sin(S.flap + 0.6) * 0.12 * P.flapAmp;
  bsPlace3(a, e, c, def, hover, P.glow);
  return S;
}
function bsQuadCast3(e, c, u, T, def) {
  const d = c.d, after = u - d, k = Math.min(1, u / d);
  if (def.cast && def.cast(e, c, u, T) === true) return;
  if (def.drake) bsDrakeCast3(c, u, after, k, T);
  switch (BS_KMAP3[c.kind] || c.kind) {
    case 'pull':
      if (after < 0) Object.assign(T, { rear: 0.35, neckUp: 0.9, neckFwd: -0.3, jaw: 1, glow: k, crouch: 0.2, look: 0.3 });
      else if (after < 0.7) Object.assign(T, { rear: -0.05, crouch: 0.45, neckUp: -0.3, neckFwd: 0.7, jaw: 0.9, glow: 1 });
      break;
    case 'chain':
      if (after < 0) Object.assign(T, { rear: 0.3, neckUp: 1.1, jaw: 0.6, glow: 0.4 + k, look: 0.2 });
      else if (after < 0.7) Object.assign(T, { rear: 0.05, neckUp: -0.15, neckFwd: 0.7, jaw: 1, glow: 1.2, crouch: 0.3 });
      break;
    case 'volley':
      if (u < 0.75) Object.assign(T, { rear: 0.4, legsUp: 0.3, neckUp: 1.0, jaw: 1, glow: 1.2 });
      break;
    case 'line':
      if (after < 0) Object.assign(T, { rear: 0.25, neckUp: 0.8, neckFwd: -0.3, jaw: 0.3 + 0.4 * k, glow: 0.9 * k, look: 0, crouch: 0.2 });
      else if (after < 0.95) Object.assign(T, { rear: 0.05, neckUp: -0.25, neckFwd: 0.8, jaw: 1, glow: 1, look: 0, crouch: 0.35 });
      break;
    case 'meteor':
      if (after < 0.4) Object.assign(T, def.howl ? { rear: 0.25, neckUp: 1.45, jaw: 1, glow: 1, look: 0, crouch: 0.2 } : { rear: 0.95, legsUp: 0.8, neckUp: 1.1, jaw: 1, glow: 1, look: 0 });
      break;
    case 'nova':
      if (after < 0) Object.assign(T, { rear: 0.85 * Math.min(1, u / 0.7), legsUp: 0.9, neckUp: 0.8, jaw: 0.6, glow: 1.2 * k, look: 0 });
      else if (after < 0.6) Object.assign(T, { rear: -0.1, legsUp: 0, crouch: 0.85, neckUp: 0.3, jaw: 1, glow: 1.4 });
      break;
    case 'slam':
      if (after < 0) Object.assign(T, { rear: 1, legsUp: 1, neckUp: 0.9, jaw: 0.7, look: 0.3 });
      else if (after < 0.7) Object.assign(T, { rear: -0.1, legsUp: 0, crouch: 0.8, neckUp: -0.4, neckFwd: 0.3, jaw: 0.9 });
      break;
    case 'buster':
      if (after < 0) Object.assign(T, { rear: 0.45, clawUp: 1, neckUp: 0.5, jaw: 0.6, glow: 0.5 * k });
      else if (after < 0.6) Object.assign(T, { rear: -0.05, clawUp: -0.25, crouch: 0.45, neckFwd: 0.6, jaw: 0.9 });
      break;
    case 'leap':
      if (after < 0) Object.assign(T, { crouch: 0.9, neckUp: -0.35, jaw: 0.4, look: 0.5, ears: 1 });
      else if (after < 0.3) Object.assign(T, { crouch: 0, legsUp: 0.7, neckUp: 0.2, neckFwd: 0.4, jaw: 1 });
      else if (after < 0.9) Object.assign(T, { crouch: 0.8, neckUp: -0.2, jaw: 0.7 });
      break;
    case 'charge':
      if (after < 0.5) Object.assign(T, { crouch: 0.45, neckUp: -0.7, neckFwd: 0.35, jaw: 0.7, look: 0, ears: 1 });
      break;
    case 'doom':
      if (after < 0) Object.assign(T, def.howl ? { rear: 0.3, neckUp: 1.45, jaw: 0.6 + 0.4 * k, glow: 0.4 + 1.2 * k, look: 0, crouch: 0.15 } : { rear: 0.9 * bsSmooth3(u / 1.2), legsUp: 0.9, neckUp: 1.1, jaw: 0.5 + 0.5 * k, glow: 0.4 + 1.2 * k, look: 0 });
      else if (after < 1.1) Object.assign(T, { rear: -0.05, crouch: 0.9, legsUp: 0, neckUp: 0.6, jaw: 1, glow: 1.4 });
      break;
    default:
      break;
  }
}

// --- Drache (seit 14.81): Vierbeiner mit langem Hals aus drei Gliedern und echten Flügeln -------------------------
// Knochen wie beim Vierbeiner (BQ3), dazu zwei weitere Halsglieder (der Kopf hängt am dritten) und je Flügel Arm und
// Unterarm (Flughaut und Finger fest am Unterarm, innen weich zum Rumpf gewichtet).
const BD3 = Object.assign({}, BQ3, { neck2: 23, neck3: 24, wL1: 25, wL2: 26, wR1: 27, wR2: 28 });
const bsWingD3 = (sx) => (sx > 0 ? [BD3.wL1, BD3.wL2] : [BD3.wR1, BD3.wR2]);
// J wie beim Vierbeiner, dazu neck2, neck3 (Halsglieder), wing [Ansatz links], wing2 [Ellbogen links]
function bsDrakeRig3(J) {
  const rig = bsQuadRig3(J);
  rig.push({ pos: J.neck2, parent: BD3.neck }, { pos: J.neck3, parent: BD3.neck2 });
  rig[BD3.head].parent = BD3.neck3;
  for (const sx of [1, -1]) {
    rig.push({ pos: [sx * J.wing[0], J.wing[1], J.wing[2]], parent: BD3.chest });
    rig.push({ pos: [sx * J.wing2[0], J.wing2[1], J.wing2[2]], parent: rig.length - 1 });
  }
  return rig;
}
// Hals und Flügel je Bild (nach dem Vierbeiner-Teil): Neigung über drei Glieder verteilt, Flügel falten und schlagen
function bsDrakeBones3(B, S, P, c, nk, hd) {
  const n2 = B[BD3.neck2], n3 = B[BD3.neck3];
  const rx = nk.rotation.x, ry = nk.rotation.y;
  const sway = Math.sin(c.t * 0.75) * 0.05 * (1 - Math.min(1, Math.abs(P.neckUp)));
  nk.rotation.x = rx * 0.45 + sway;
  nk.rotation.y = ry * 0.4;
  n2.rotation.x = rx * 0.35 - sway * 1.4;
  n2.rotation.y = ry * 0.35;
  n3.rotation.x = rx * 0.3 + sway;
  n3.rotation.y = ry * 0.3;
  S.flap += c.dt * Math.PI * 2 * P.flapHz;
  const fl = Math.sin(S.flap) * P.flapAmp;
  const open = Math.max(-0.1, Math.min(1.1, P.wing));
  const fold = 1 - open;
  for (const sx of [1, -1]) {
    const [w1, w2] = bsWingD3(sx);
    // angelegt: Arm gesenkt und nach hinten geschwenkt, Finger liegen entlang der Flanke nach hinten
    B[w1].rotation.set(0.15 * fold, sx * fold * 1.2, sx * (-0.5 * fold + fl * 0.85 - 0.1 * open));
    B[w2].rotation.set(0, sx * fold * 0.35, sx * (fl * 0.55 - 0.3 * fold));
  }
}
// Flügel und Flughöhe je Angriff (vor der Pose des Vierbeiners)
function bsDrakeCast3(c, u, after, k, T) {
  switch (BS_KMAP3[c.kind] || c.kind) {
    case 'line': Object.assign(T, after < 0 ? { wing: 0.85, flapAmp: 0.15, flapHz: 1 } : { wing: 1, flapAmp: 0.1, flapHz: 1 }); break;
    case 'meteor': if (after < 0.4) Object.assign(T, { wing: 1.05, flapAmp: 0.75, flapHz: 1.4, hover: 1.8 * Math.min(1, u / 0.6) }); break;
    case 'nova':
      if (after < 0) Object.assign(T, { wing: 1, flapAmp: 0.85, flapHz: 1.5, hover: 2.4 * Math.min(1, u / 0.8) });
      else if (after < 0.6) Object.assign(T, { wing: 1.1, flapAmp: 0.2, flapHz: 2, hover: 0 });
      break;
    case 'slam':
      if (after < 0) Object.assign(T, { wing: 1, flapAmp: 0.6, flapHz: 1.6, hover: 1.6 * Math.min(1, u / 0.6) });
      else if (after < 0.7) Object.assign(T, { wing: 1.05, hover: 0 });
      break;
    case 'doom':
      if (after < 0) Object.assign(T, { wing: 1.05, flapAmp: 0.95, flapHz: 1.05, hover: 4.4 * bsSmooth3(u / 1.4) });
      else if (after < 1.1) Object.assign(T, { wing: 1.1, flapAmp: 0.15, hover: 0 });
      break;
    case 'leap': Object.assign(T, { wing: 1, flapAmp: after > 0 && after < 0.3 ? 0.9 : 0.2, flapHz: 2 }); break;
    case 'charge': T.wing = 0.35; break;
    case 'pull': Object.assign(T, after < 0 ? { wing: 1.05, flapAmp: 0.7, flapHz: 1.8 } : { wing: 0.6 }); break;
    case 'buster': Object.assign(T, { wing: 0.8 }); break;
    default: T.wing = 1; break;
  }
}

// --- Naga: Animation ----------------------------------------------------------------------------------------
// Posenwerte: rise (aufrichten), lean (vorbeugen aus dem Leib), twist, coil (Ringe enger), aLx … aRe wie beim
// Zweibeiner, headUp, jaw, hood (Haube spreizen), glow, look, sink, fall, tail (Schwanzschlag)
const BS_NAGA_DEF3 = { rise: 0, lean: 0.05, twist: 0, side: 0, coil: 0, aLx: -0.3, aLz: 0.2, aLe: -0.6, aRx: -0.3, aRz: 0.2, aRe: -0.6, headUp: 0, jaw: 0.05, hood: 0.3, glow: 0, look: 1, sink: 0, fall: 0, tail: 0 };
const BS_NAGA_RATE3 = { rise: 4, lean: 6, twist: 7, side: 6, coil: 4, aLx: 9, aLz: 8, aLe: 9, aRx: 9, aRz: 8, aRe: 9, headUp: 6, jaw: 10, hood: 5, glow: 3, look: 4, sink: 2, fall: 2.2, tail: 6 };
function bsNagaAnim3(a, e, dt, corpse) {
  const def = BOSS3[a.model.boss3];
  const DEF = def.bipDef || (def.bipDef = Object.assign({}, BS_NAGA_DEF3, def.base || {}));
  const c = bsPrelude3(a, e, dt, corpse, def, DEF);
  const { S, now } = c;
  const B = a.bones;
  const P = S.P, T = S.T;
  if (corpse) {
    const u = now - e.start;
    if (u < 0.8) Object.assign(T, { rise: 0.6, lean: -0.4, headUp: 1, jaw: 1, hood: 1, aLz: 1.2, aRz: 1.2, aLx: -0.6, aRx: -0.6, glow: 0.8, tail: 1 });
    else Object.assign(T, { rise: -0.4, fall: 1, lean: 0.3, headUp: -0.3, jaw: 0.4, hood: 0, aLx: -1.2, aRx: -1.0, aLz: 0.6, aRz: 0.5, glow: -1, look: 0, sink: u > 3.4 ? 1 : 0 });
  } else if (c.cast) bsNagaCast3(e, c.cast, now - c.cast.t0, T, def);
  else if (c.stagger) Object.assign(T, { rise: -0.3, lean: 0.45, headUp: -0.5, jaw: 0.4, hood: 0, aLx: 0.1, aRx: 0.1, side: 0.25 * Math.sin(now * 2.2), look: 0.2 });
  else if (c.shield) Object.assign(T, { rise: 0.3, coil: 1, aLx: -2.6, aRx: -2.6, aLz: -0.2, aRz: -0.2, aLe: -0.4, aRe: -0.4, headUp: 0.5, jaw: 0.3, hood: 1, glow: 0.9 });
  else if (c.roar < 1.9) {
    const k = c.roar / 1.9;
    Object.assign(T, { rise: 0.55, lean: -0.3, headUp: 1, jaw: k < 0.85 ? 1 : 0.2, hood: 1.2, aLz: 1.2, aRz: 1.2, aLx: -0.6, aRx: -0.6, aLe: -1.0, aRe: -1.0, glow: 0.6, tail: 0.8, look: 0.2 });
  } else if (c.moving) Object.assign(T, { lean: e.dash ? 0.5 : 0.25, rise: -0.1, hood: 0.1 });
  else if (c.foe) Object.assign(T, { rise: 0.2, lean: 0.15, hood: 0.9, aLz: 0.45, aRz: 0.45, aLx: -0.6, aRx: -0.6 });
  else {
    S.idleT += c.dt;
    const ph = S.idleT % 11;
    if (ph > 8 && ph < 10) Object.assign(T, { rise: 0.35, hood: 1, headUp: 0.3 });
  }
  const w = c.wind, hit = c.hit;
  if (w > 0 || hit > 0) {
    const add = (k, v) => { T[k] += v; };
    if (S.kind === 'strike') { add('rise', 0.4 * w - 0.4 * hit); add('lean', -0.4 * w + 0.9 * hit); add('jaw', 0.8 * w); add('hood', 0.8 * w); add('aLx', 0.4 * w - 1.2 * hit); add('aRx', 0.4 * w - 1.2 * hit); add('aLe', -0.6 * w + 0.5 * hit); add('aRe', -0.6 * w + 0.5 * hit); }
    else if (S.kind === 'slash') { add('twist', -0.8 * w + 1.4 * hit); add('aRz', 0.9 * w - 0.3 * hit); add('aRx', -1.2 * w - 0.4 * hit); add('aLx', -1.6 * w + 1.2 * hit); add('lean', 0.1 * w + 0.25 * hit); }
    else { add('twist', 0.6 * w - 1.1 * hit); add('tail', 1 * w - 1.8 * hit); add('lean', -0.1 * w + 0.2 * hit); add('aLz', 0.5 * w); add('aRz', 0.5 * w); }
  }
  bsEase3(P, T, BS_NAGA_RATE3, c.dt);
  bsLook3(a, e, c, P.look);
  const gait = c.moving ? (e.dash ? 2.2 : 1.1) : 0;
  S.walk += c.dt * Math.PI * 2 * gait;
  const breath = Math.sin(c.t * 1.5);
  // Schlangenleib: Welle über die Glieder (beim Gleiten stärker), Ringe enger, Schwanzschlag
  const wv = c.moving ? 0.32 : 0.08;
  const f = c.moving ? S.walk : c.t * 0.9;
  for (let i = 0; i < 8; i++) {
    const nb = B[BN3.n0 + i];
    // n7 trägt den Oberkörper: aufrichten / vorbeugen; davor die Glieder am Boden
    if (i === 7) {
      nb.rotation.x = 0.35 * P.lean - 0.15 * P.rise + 0.9 * bsSmooth3(P.fall);
      nb.rotation.y = P.twist * 0.25;
      nb.rotation.z = P.side * 0.3;
      nb.position.y += 0.2 * P.rise - 0.25 * P.sink + 0.02 * breath;
      continue;
    }
    const k = (7 - i) / 7;
    nb.rotation.y = Math.sin(f * 1.0 + i * 0.8) * wv * (0.5 + k * 0.6) + P.tail * 0.22 * k + P.coil * 0.08;
    nb.rotation.x = i === 6 ? -0.08 * P.rise : 0;
  }
  const sp = B[BN3.spine], ch = B[BN3.chest];
  sp.rotation.x = P.lean * 0.4 + 0.02 * breath;
  sp.rotation.y = P.twist * 0.35;
  ch.rotation.x = P.lean * 0.35;
  ch.rotation.y = P.twist * 0.4;
  ch.scale.set(1 + 0.025 * breath, 1 + 0.02 * breath, 1 + 0.03 * breath);
  const nk = B[BN3.neck], hd = B[BN3.head];
  nk.rotation.x = -P.headUp * 0.35 - P.lean * 0.4 + S.lookX * 0.4;
  nk.rotation.y = S.lookY * 0.4;
  hd.rotation.x = -P.headUp * 0.5 - P.lean * 0.4 + S.lookX * 0.5;
  hd.rotation.y = S.lookY * 0.55 + Math.sin(c.t * 0.7) * 0.04;
  B[BN3.jaw].rotation.x = (def.jawOpen || 0.45) * P.jaw + 0.02 * (1 + breath);
  for (const sx of [1, -1]) {
    const [ub, fb] = bsArmN3(sx);
    const ax = sx > 0 ? P.aLx : P.aRx, az = sx > 0 ? P.aLz : P.aRz, ae = sx > 0 ? P.aLe : P.aRe;
    B[ub].rotation.set(ax + 0.03 * breath + (c.moving ? Math.sin(S.walk + (sx > 0 ? 0 : Math.PI)) * 0.2 : 0), 0, sx * az);
    B[fb].rotation.x = ae;
    const hb = sx > 0 ? BN3.hoodL : BN3.hoodR;
    B[hb].rotation.y = sx * (0.9 * P.hood - 0.3);
    B[hb].rotation.z = -sx * 0.15 * P.hood;
  }
  if (def.anim) def.anim(P, c, e, 'post', B);
  let hover = 0;
  if (c.cast && c.cast.kind === 'leap') {
    const k = (now - c.cast.t0 - c.cast.d) / 0.3;
    if (k > 0 && k < 1) hover += Math.sin(Math.PI * k) * 2.0;
  }
  bsPlace3(a, e, c, def, hover, P.glow);
  return S;
}
function bsNagaCast3(e, c, u, T, def) {
  const d = c.d, after = u - d, k = Math.min(1, u / d);
  if (def.cast && def.cast(e, c, u, T) === true) return;
  switch (BS_KMAP3[c.kind] || c.kind) {
    case 'pull':
      if (after < 0) Object.assign(T, { rise: 0.4, lean: 0.3, aLx: -1.45, aRx: -1.45, aLz: 0.35, aRz: 0.35, aLe: -0.15, aRe: -0.15, hood: 1.2, jaw: 0.6, glow: k, coil: 0.6 });
      else if (after < 0.7) Object.assign(T, { rise: 0.6, lean: -0.35, aLx: -0.7, aRx: -0.7, aLz: 0.6, aRz: 0.6, aLe: -1.7, aRe: -1.7, hood: 1.4, jaw: 1, glow: 1, tail: 0.6 });
      break;
    case 'chain':
      if (after < 0) Object.assign(T, { rise: 0.5, lean: -0.2, aRx: -2.8, aRe: -0.3, aLz: 0.9, headUp: 0.6, jaw: 0.4, hood: 1.2, glow: 0.4 + k });
      else if (after < 0.7) Object.assign(T, { rise: 0.3, lean: 0.4, aRx: -1.55, aRe: -0.05, aLz: 0.7, jaw: 0.9, hood: 1.3, glow: 1.2, look: 0 });
      break;
    case 'volley':
      if (u < 0.75) Object.assign(T, { rise: 0.6, lean: -0.35, aLz: 1.4, aRz: 1.4, aLx: -0.6, aRx: -0.6, headUp: 0.7, jaw: 1, hood: 1.4, glow: 1.2 });
      break;
    case 'line':
      if (after < 0) Object.assign(T, { rise: 0.5, lean: -0.35, headUp: 0.6, jaw: 0.4 + 0.4 * k, hood: 1.3, glow: k, look: 0, aLz: 0.8, aRz: 0.8, aLx: -0.5, aRx: -0.5 });
      else if (after < 0.95) Object.assign(T, { rise: 0.2, lean: 0.55, headUp: -0.2, jaw: 1, hood: 1.3, glow: 1, look: 0, aLx: -1.4, aRx: -1.4, aLz: 0.3, aRz: 0.3, aLe: -0.1, aRe: -0.1 });
      break;
    case 'meteor':
      if (after < 0.4) Object.assign(T, { rise: 0.7, lean: -0.35, headUp: 1.1, jaw: 1, hood: 1.3, aLx: -2.8, aRx: -2.8, aLz: 0.4, aRz: 0.4, aLe: -0.2, aRe: -0.2, glow: 1, look: 0 });
      break;
    case 'nova':
      if (after < 0) Object.assign(T, { rise: -0.2, coil: 1, lean: 0.3, aLx: -1.1, aRx: -1.1, aLz: -0.55, aRz: -0.55, aLe: -1.4, aRe: -1.4, hood: 0.6, glow: 1.2 * k, look: 0.3 });
      else if (after < 0.6) Object.assign(T, { rise: 0.75, lean: -0.4, aLz: 1.4, aRz: 1.4, aLx: -0.6, aRx: -0.6, aLe: -0.1, aRe: -0.1, headUp: 0.8, jaw: 1, hood: 1.4, glow: 1.4, tail: 1 });
      break;
    case 'slam':
      if (after < 0) Object.assign(T, { rise: 0.8, lean: -0.3, tail: 1.2, aLx: -2.6, aRx: -2.6, headUp: 0.5, jaw: 0.6, hood: 1 });
      else if (after < 0.7) Object.assign(T, { rise: -0.3, lean: 0.75, tail: -1, aLx: -0.4, aRx: -0.4, headUp: -0.1, jaw: 0.9, hood: 1 });
      break;
    case 'buster':
      if (after < 0) Object.assign(T, { rise: 0.5, lean: -0.35, aRx: -2.6, aRe: -0.4, aLx: -2.0, aLe: -0.6, hood: 1.2, jaw: 0.6, glow: 0.6 * k });
      else if (after < 0.6) Object.assign(T, { rise: 0, lean: 0.7, aRx: -0.4, aLx: -0.6, aRe: 0, aLe: 0, jaw: 1, hood: 1.2 });
      break;
    case 'leap':
      if (after < 0) Object.assign(T, { rise: -0.4, coil: 1, lean: 0.4, hood: 1, jaw: 0.4, look: 0.5 });
      else if (after < 0.3) Object.assign(T, { rise: 0.6, lean: 0.4, coil: 0, aLx: -1.6, aRx: -1.6, jaw: 1, hood: 1.3 });
      else if (after < 0.9) Object.assign(T, { rise: -0.2, lean: 0.6, jaw: 0.6 });
      break;
    case 'charge':
      if (after < 0.5) Object.assign(T, { rise: -0.2, lean: 0.6, hood: 0.2, aLx: 0.4, aRx: 0.4, jaw: 0.7, look: 0 });
      break;
    case 'doom':
      if (after < 0) Object.assign(T, { rise: 0.9 * bsSmooth3(u / 1.2), lean: -0.3, aLx: -3.0, aRx: -3.0, aLz: 0.4, aRz: 0.4, headUp: 1, jaw: 0.5 + 0.5 * k, hood: 1.4, glow: 0.4 + 1.2 * k, coil: 1, look: 0 });
      else if (after < 1.1) Object.assign(T, { rise: -0.3, lean: 0.8, aLx: -0.4, aRx: -0.4, headUp: 0.5, jaw: 1, hood: 1.4, glow: 1.4, tail: 1 });
      break;
    default:
      break;
  }
}

// Einstieg aus syncMonster3 / syncCorpse3
function bossAnim3(a, e, dt, corpse = false) {
  const def = BOSS3[a.model.boss3];
  if (!def) return null;
  if (def.kind === 'quad' || def.kind === 'drake') return bsQuadAnim3(a, e, dt, corpse);
  if (def.kind === 'naga') return bsNagaAnim3(a, e, dt, corpse);
  return bsBipAnim3(a, e, dt, corpse);
}

// --- Effekte in 3D (FX3_HOOKS, drei-fx.js) ------------------------------------------------------------------
// Themen: core (hellster Ton), mid, dark (Rauch/Staub), tex (Funken oder Flammen), deb (Brocken: rock, ice, bone, blob),
// debCol, proj (Geschoss der Meteore: rock, fire, ice, skull, blob, bolt, spear), bolt (Blitze im Strahl), rise (Glut
// steigt auf statt zu fallen), mist (Dampf in der Grundfarbe)
const BS_FXT3 = {
  wild: { core: '#fff2c0', mid: '#ffcc4a', dark: '#5a4a36', tex: 'spark', deb: 'rock', debCol: ['#6a5a44', '#4a3e30'], proj: 'spear' },
  nacht: { core: '#e8ecff', mid: '#9aa8ff', dark: '#1a1a2e', tex: 'spark', deb: 'rock', debCol: ['#2a2a3a', '#1a1a26'], proj: 'spear', mist: true },
  wald: { beam: 'ground', core: '#eaffc0', mid: '#9be07a', dark: '#4a4a2a', tex: 'spark', deb: 'rock', debCol: ['#5a4630', '#3e5a2a'], proj: 'rock' },
  glut: { core: '#fff0b0', mid: '#ff7a3a', dark: '#2a2220', tex: 'flame', deb: 'rock', debCol: ['#2a2020', '#1a1414'], proj: 'fire', rise: true },
  erde: { beam: 'ground', core: '#ffe0b0', mid: '#ff8a4a', dark: '#5a4a34', tex: 'spark', deb: 'rock', debCol: ['#6a5a40', '#4a3e2c'], proj: 'rock' },
  knochen: { beam: 'ground', core: '#fffaf0', mid: '#e8e0c8', dark: '#5a5a4a', tex: 'spark', deb: 'bone', debCol: ['#d8d0b8', '#b8b098'], proj: 'spear' },
  feuer: { core: '#fff0a0', mid: '#ff4a2a', dark: '#2a1414', tex: 'flame', deb: 'rock', debCol: ['#2a1a1a', '#3a1414'], proj: 'fire', rise: true },
  blut: { core: '#ffd0d0', mid: '#ff3a4a', dark: '#3a0a12', tex: 'flame', deb: 'blob', debCol: ['#8a0a1a', '#5a0610'], proj: 'spear', mist: true },
  eis: { beam: 'ground', core: '#f2fcff', mid: '#9fe8ff', dark: '#a8c8e0', tex: 'spark', deb: 'ice', debCol: ['#d8f4ff', '#9fd8ff'], proj: 'ice' },
  nachteis: { core: '#e8f0ff', mid: '#8ab0ff', dark: '#3a4a6a', tex: 'spark', deb: 'ice', debCol: ['#8aa8d8', '#5a78b0'], proj: 'ice', mist: true },
  gift: { core: '#e8fff8', mid: '#7ad8c8', dark: '#1a4a3a', tex: 'spark', deb: 'blob', debCol: ['#3ab89a', '#1a7a5a'], proj: 'blob', mist: true },
  moor: { core: '#eafff0', mid: '#7ae0a8', dark: '#24382a', tex: 'spark', deb: 'blob', debCol: ['#3a5a2a', '#2a3a1e'], proj: 'blob', mist: true },
  seele: { core: '#f0ffd8', mid: '#8fe36a', dark: '#1a2a14', tex: 'flame', deb: 'bone', debCol: ['#d8d0b8', '#a8a088'], proj: 'skull', rise: true },
  sturm: { core: '#f4faff', mid: '#9fd0ff', dark: '#4a4e5a', tex: 'spark', deb: 'rock', debCol: ['#6a6a76', '#4a4a56'], proj: 'bolt', bolt: true },
  // seit 14.81 (Paket 2): Spiegelglas, Kristall, Nordlicht, Tod, Leere, Sturm über dem Horst
  spiegel: { core: '#ffffff', mid: '#cfe4ff', dark: '#8a90c8', tex: 'spark', deb: 'ice', debCol: ['#e8f0ff', '#a8b8f0'], proj: 'ice' },
  kristall: { core: '#f0e8ff', mid: '#b8a8ff', dark: '#3a2a6a', tex: 'spark', deb: 'ice', debCol: ['#c8b8ff', '#8a7ae0'], proj: 'ice', mist: true },
  nordlicht: { core: '#f0fff8', mid: '#9fffe8', dark: '#2a4a5a', tex: 'spark', deb: 'ice', debCol: ['#d8f8ff', '#8ae8d8'], proj: 'ice', mist: true },
  tod: { core: '#f4ecff', mid: '#b48cff', dark: '#24163a', tex: 'flame', deb: 'bone', debCol: ['#e8e0cc', '#b8b098'], proj: 'skull', rise: true },
  leere: { core: '#f0e4ff', mid: '#b48cff', dark: '#120a24', tex: 'spark', deb: 'rock', debCol: ['#2a2050', '#160e2c'], proj: 'spear', mist: true },
  himmel: { core: '#ffffff', mid: '#cfe8ff', dark: '#3a4058', tex: 'spark', deb: 'rock', debCol: ['#8a8e98', '#5a5e6a'], proj: 'bolt', bolt: true, mist: true },
  schatten: { core: '#ffd0d8', mid: '#ff3a5a', dark: '#14060c', tex: 'flame', deb: 'rock', debCol: ['#1a0a10', '#2a0a14'], proj: 'fire', rise: true, mist: true },
  // seit 14.82 (Paket 3): Spinnenbrut, versunkenes Wasser, Banditen (Staub und Funken), Titanenschmiede
  brut: { core: '#f8e8ff', mid: '#c87aff', dark: '#1a0e22', tex: 'spark', deb: 'blob', debCol: ['#5a2a6a', '#3a1a4a'], proj: 'blob', mist: true },
  wasser: { core: '#e8fff4', mid: '#6ad8a8', dark: '#1a2a24', tex: 'spark', deb: 'blob', debCol: ['#2a4a3a', '#1a3028'], proj: 'blob', mist: true },
  staub: { beam: 'ground', core: '#fff0d0', mid: '#ffb04a', dark: '#5a4a3a', tex: 'spark', deb: 'rock', debCol: ['#6a5a48', '#4a3e30'], proj: 'spear' },
  schmiede: { beam: 'ground', core: '#fff0c0', mid: '#ffb04a', dark: '#3a3028', tex: 'flame', deb: 'rock', debCol: ['#5a5048', '#3a322c'], proj: 'fire', rise: true }
};
const BS_FX3 = [];
function bsAddFx3(o) {
  if (!V3.on) return;
  o.t0 = game.time;
  BS_FX3.push(o);
  if (BS_FX3.length > 28) BS_FX3.shift();
}
// Punkt eines Bosses in der Welt (Maul, Hand, Waffenspitze, Brust …) aus dem Knochen der Figur
function bsPtA3(a, def, name, out) {
  const q = def.pts[name] || def.pts.mouth;
  const r = a.model.rig[q[0]].pos;
  out.set(q[1][0] - r[0], q[1][1] - r[1], q[1][2] - r[2]);
  a.bones[q[0]].localToWorld(out);
  return out;
}
function bsPt3(e, name, out) {
  const a = e && e.__k3 && actors3.get(e.__k3);
  const def = e && BOSS3[e.typeId];
  if (!a || !a.model.boss3 || !def) return out.set(e.x * U3, 3, feetY(e) * U3);
  return bsPtA3(a, def, name, out);
}
const bsTheme3 = (m) => BS_FXT3[(BOSS3[m.typeId] || {}).fx] || BS_FXT3.erde;
const _b3P = new THREE.Vector3();
const _b3P2 = new THREE.Vector3();
const _b3D = new THREE.Vector3();
const _b3N = new THREE.Vector3();
const _b3Y = new THREE.Vector3(0, 1, 0);
function bsSprite3(h, x, y, z, s, tex, color, op) {
  const o = fx3Take(h, 'sprite');
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  fx3Map(o, tex);
  fx3Color(o, color, op);
  return o;
}
function bsSmoke3(h, x, y, z, s, color, op) {
  const o = fx3Take(h, 'smoke');
  o.position.set(x, y, z);
  o.scale.set(s, s, 1);
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}
// Brocken je Thema (Fels, Eissplitter, Knochen, Tropfen)
function bsDebris3(h, th, x, y, z, s, spin, i, op = 1) {
  const col = th.debCol[i % th.debCol.length];
  if (th.deb === 'ice') {
    const o = fx3Take(h, 'coneG');
    o.position.set(x, y, z);
    o.scale.set(s * 0.45, s * 1.6, s * 0.45);
    o.rotation.set(spin, 0, spin * 0.7);
    o.material.color.set(col);
    o.material.opacity = 0.9 * op;
  } else if (th.deb === 'bone') {
    const o = fx3Take(h, 'bone');
    o.position.set(x, y, z);
    o.scale.set(s * 0.18, s * 1.3, s * 0.18);
    o.rotation.set(spin, spin * 0.5, spin * 0.8);
    o.material.color.set(col);
    o.material.opacity = op;
  } else if (th.deb === 'blob') {
    const o = fx3Take(h, 'ball');
    o.position.set(x, y, z);
    o.scale.set(s * 0.5, s * 0.42, s * 0.5);
    o.material.color.set(col);
    o.material.opacity = 0.85 * op;
    if (i % 3 === 0) bsSprite3(h, x, y, z, s * 1.4, 'disc', th.mid, 0.35 * op);
  } else {
    const o = fx3Rock(h, 'rock', x, y, z, s * 0.55, s * 0.45, s * 0.5, col);
    o.rotation.set(spin, spin * 1.3, 0);
    if (th.rise && i % 2 === 0) bsSprite3(h, x, y, z, s * 1.2, 'flame', th.mid, 0.5 * op);
  }
}
// Zickzack-Blitz von a nach b (dünne leuchtende Glieder, jedes Bild neu verzweigt)
const _b3Ba = new THREE.Vector3();
const _b3Bb = new THREE.Vector3();
function bsBolt3(h, a, b, th, w, op, n = 7) {
  let px = a.x, py = a.y, pz = a.z;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const j = i === n ? 0 : len * 0.07;
    const nx = a.x + dx * k + (Math.random() - 0.5) * j, ny = a.y + dy * k + (Math.random() - 0.5) * j, nz = a.z + dz * k + (Math.random() - 0.5) * j;
    _b3Ba.set(px, py, pz);
    _b3Bb.set(nx, ny, nz);
    for (const [r, col, o] of [[w, th.core, op], [w * 3.5, th.mid, op * 0.35]]) {
      const s = fx3Take(h, 'seg');
      fx3Segment(s, _b3Ba, _b3Bb, r);
      fx3Color(s, col, o);
    }
    px = nx; py = ny; pz = nz;
  }
}
const bsSeed3 = (f, key, n, make) => f[key] || (f[key] = Array.from({ length: n }, make));
function bossFx3(h) {
  const now = game.time;
  for (let i = BS_FX3.length - 1; i >= 0; i--) {
    const f = BS_FX3[i];
    const u = now - f.t0;
    if (u > f.dur || u < 0) {
      if (u > f.dur) BS_FX3.splice(i, 1);
      continue;
    }
    const k = u / f.dur;
    const th = f.th;
    if (f.kind === 'charge') bsFxCharge3(h, f, u, k, th);
    else if (f.kind === 'beam') bsFxBeam3(h, f, u, k, th);
    else if (f.kind === 'fall') bsFxFall3(h, f, u, th);
    else if (f.kind === 'burst') bsFxBurst3(h, f, u, k, th);
    else if (f.kind === 'roar') bsFxRoar3(h, f, u, k, th);
    else if (f.kind === 'death') bsFxDeath3(h, f, u, k, th);
    else if (f.kind === 'trail') bsFxTrail3(h, f, u, k, th);
    else if (f.kind === 'quake') bsFxQuake3(h, f, u, k, th);
    else if (f.kind === 'erupt') bsFxErupt3(h, f, u, k, th);
    else if (f.kind === 'vortex') bsFxVortex3(h, f, u, k, th);
    else if (f.kind === 'chainfx') bsFxChain3(h, f, u, k, th);
  }
  // Dauereffekte der Bosse im Bild (höchstens zwei)
  let n = 0;
  for (const [a, it] of BS_LIVE3) {
    if (now - it.at > 0.3 || !a.model.boss3) { BS_LIVE3.delete(a); continue; }
    if (n++ >= 2) continue;
    const def = BOSS3[a.model.boss3];
    if (def && def.ambient) def.ambient(h, a, it.e, now, BS_FXT3[def.fx] || BS_FXT3.erde);
  }
}
// Aufladen: Glut am Ursprung, Teilchen strömen hinein
function bsFxCharge3(h, f, u, k, th) {
  bsPt3(f.m, f.at || 'emit', _b3P);
  const big = f.big || 1;
  bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, (0.6 + 1.2 * k) * big, 'disc', th.mid, 0.3 + 0.4 * k);
  bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, (0.3 + 0.6 * k) * big, th.tex, th.core, 0.5 + 0.4 * k);
  for (const q of bsSeed3(f, 'sd', 12, () => ({ a: Math.random() * 6.3, b: Math.random() * 6.3 - 3.1, r: 1.4 + Math.random() * 1.4, o: Math.random() }))) {
    const v = (k * 1.6 + q.o) % 1;
    const r = q.r * (1 - v) * big;
    bsSprite3(h, _b3P.x + Math.cos(q.a) * Math.cos(q.b) * r, _b3P.y + Math.sin(q.b) * r * 0.7, _b3P.z + Math.sin(q.a) * Math.cos(q.b) * r, 0.22, th.tex, th.mid, 0.85 * v);
  }
  if (th.bolt && Math.random() < 0.4) {
    _b3P2.set(_b3P.x + (Math.random() - 0.5) * 2.4, _b3P.y + (Math.random() - 0.3) * 2, _b3P.z + (Math.random() - 0.5) * 2.4);
    bsBolt3(h, _b3P2, _b3P, th, 0.025, 0.8, 4);
  }
}
// Strahl/Atem: Kegel aus Hüllen vom Ursprung entlang der Linie, darin strömende Teilchen und Brocken; Sturm: Blitze
function bsFxBeam3(h, f, u, k, th) {
  bsPt3(f.m, f.at || 'emit', _b3P);
  _b3P2.set(f.tx * U3, 0.4, f.ty * U3);
  _b3D.subVectors(_b3P2, _b3P);
  const full = _b3D.length();
  _b3D.divideScalar(full || 1);
  const grow = Math.min(1, u / 0.18);
  const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  const len = full * grow;
  if (th.beam === 'ground') {
    bsFxQuake3(h, f, u, k, th, full, fade);
    return;
  }
  if (th.bolt) {
    _b3N.copy(_b3P).addScaledVector(_b3D, len);
    bsBolt3(h, _b3P, _b3N, th, 0.06, 0.95 * fade, 9);
    if (Math.random() < 0.6) bsBolt3(h, _b3P, _b3N, th, 0.03, 0.7 * fade, 7);
  } else {
    const shells = [[2.4, th.dark, 0.18], [1.5, th.mid, 0.3], [0.7, th.mid, 0.45], [0.28, th.core, 0.6]];
    const wd = f.wide || 1;
    shells.forEach(([r0, col, op], i) => {
      const r = r0 * wd;
      const o = fx3Take(h, 'coneG');
      o.position.copy(_b3P).addScaledVector(_b3D, len / 2);
      o.scale.set(r * (0.9 + 0.1 * Math.sin(u * 30 + i)), Math.max(0.01, len), r * (0.9 + 0.1 * Math.cos(u * 27 + i)));
      o.quaternion.setFromUnitVectors(_b3Y, _b3N.copy(_b3D).negate());
      o.rotateY(u * (2 + i));
      o.material.color.set(col);
      o.material.opacity = op * fade;
    });
  }
  for (const q of bsSeed3(f, 'sd', 36, () => ({ o: Math.random(), a: Math.random() * 6.3, r: Math.random(), s: 0.35 + Math.random() * 0.6, c: Math.random() }))) {
    const v = (q.o + u * 1.7) % 1;
    if (v > grow) continue;
    const rr = q.r * 2.2 * v * (f.wide || 1);
    const px = _b3P.x + _b3D.x * full * v + Math.cos(q.a) * rr * Math.abs(_b3D.z);
    const pz = _b3P.z + _b3D.z * full * v - Math.cos(q.a) * rr * Math.abs(_b3D.x);
    const py = _b3P.y + _b3D.y * full * v + Math.sin(q.a) * rr;
    bsSprite3(h, px, Math.max(0.1, py), pz, q.s * (0.7 + v) * (th.tex === 'flame' ? 1.6 : 1), q.c < 0.5 ? th.tex : 'disc', q.c < 0.3 ? th.core : th.mid, 0.75 * fade * (1 - v * 0.4));
  }
  for (const q of bsSeed3(f, 'db', 7, () => ({ o: Math.random(), a: Math.random() * 6.3, r: Math.random(), sp: Math.random() * 6 }))) {
    const v = (q.o + u * 1.2) % 1;
    if (v > grow) continue;
    const rr = q.r * 1.2 * v;
    bsDebris3(h, th, _b3P.x + _b3D.x * full * v + Math.cos(q.a) * rr, Math.max(0.15, _b3P.y + _b3D.y * full * v + Math.sin(q.a) * rr), _b3P.z + _b3D.z * full * v, 0.35, u * 8 + q.sp, (q.sp * 3) | 0, fade);
  }
  bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, 1.5, 'disc', th.mid, 0.45 * fade);
  if (grow >= 1) {
    for (const q of bsSeed3(f, 'end', 9, () => ({ a: Math.random() * 6.3, o: Math.random(), up: 1 + Math.random() * 2.5 }))) {
      const v = (q.o + u * 1.4) % 1;
      bsSmoke3(h, _b3P2.x + Math.cos(q.a) * v * 2.2, 0.3 + v * q.up, _b3P2.z + Math.sin(q.a) * v * 2.2, 0.8 + v * 1.6, th.dark, 0.4 * (1 - v) * fade);
    }
  }
}
// Bodenwelle: vom Boss aus brechen nacheinander Zacken (Fels, Eis, Knochen) aus dem Boden, Brocken und Staub fliegen
function bsFxQuake3(h, f, u, k, th, full, fade) {
  const m = f.m;
  const x0 = m.x * U3, z0 = feetY(m) * U3;
  const dx = f.tx * U3 - x0, dz = f.ty * U3 - z0;
  const L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L;
  const n = 11;
  const sd = bsSeed3(f, 'qk', n * 2, () => ({ o: (Math.random() - 0.5) * 1.4, s: 0.7 + Math.random() * 0.6, r: Math.random() * 6, t: Math.random() * 0.4 - 0.2 }));
  for (let i = 0; i < n * 2; i++) {
    const q = sd[i];
    const d = 1.2 + ((i >> 1) / (n - 1)) * (L - 1.2);
    const t0 = ((i >> 1) / n) * 0.35;
    const v = (u - t0) / 0.6;
    if (v < 0 || v > 1) continue;
    const up = v < 0.25 ? easeOut(v / 0.25) : 1 - Math.max(0, (v - 0.55) / 0.45);
    const px = x0 + ux * d - uz * q.o, pz = z0 + uz * d + ux * q.o;
    const hgt = (1.5 + 1.1 * q.s) * up;
    if (th.deb === 'ice' || th.deb === 'bone') {
      const o = fx3Take(h, th.deb === 'ice' ? 'coneG' : 'cone');
      o.position.set(px, hgt * 0.5 - 0.1, pz);
      o.scale.set(0.35 * q.s, Math.max(0.01, hgt), 0.35 * q.s);
      o.rotation.set(q.t, 0, q.t * 0.7);
      o.material.color.set(th.debCol[i % 2]);
      o.material.opacity = th.deb === 'ice' ? 0.85 : 1;
    } else {
      const o = fx3Take(h, 'rockcol');
      o.position.set(px, hgt * 0.5 - 0.15, pz);
      o.scale.set(0.55 * q.s, Math.max(0.01, hgt), 0.55 * q.s);
      o.rotation.set(q.t, q.r, q.t * 0.6);
      o.material.color.set(th.debCol[i % 2]);
    }
    if (i % 2 === 0 && v < 0.5) {
      bsSmoke3(h, px, 0.3 + v * 1.2, pz, 1 + v * 2, th.dark, 0.5 * (1 - v * 2));
      bsSprite3(h, px, 0.3 + hgt * 0.6, pz, 0.6, th.tex, th.mid, 0.8 * (1 - v * 2));
    }
    if (i % 4 === 0 && v < 0.6) bsDebris3(h, th, px + Math.cos(q.r) * v * 1.5, 0.3 + 2.5 * v - 4 * v * v, pz + Math.sin(q.r) * v * 1.5, 0.3, v * 8 + q.r, i, 1 - v);
  }
}
// Geschoss vom Himmel und Einschlag (statt der Meteore)
function bsFxFall3(h, f, u, th) {
  const fall = f.fall;
  const x = f.x * U3, z = f.y * U3;
  if (u < fall) {
    const q = u / fall;
    const y = 0.2 + (1 - q * q) * 12;
    const ox = (1 - q * q) * 2.2;
    const px = x + ox, pz = z - ox * 0.4, py = y + 0.6;
    if (th.proj === 'bolt') {
      // Blitz: erst glimmt es am Himmel, kurz vor dem Einschlag fährt er herab
      bsSprite3(h, x, 12, z, 2.5, 'disc', th.mid, 0.25 + 0.3 * q);
      if (q > 0.55) {
        _b3P.set(x + (Math.random() - 0.5), 13, z);
        _b3P2.set(x, 0.2, z);
        bsBolt3(h, _b3P, _b3P2, th, 0.08, 1, 10);
      }
    } else if (th.proj === 'ice' || th.proj === 'spear') {
      const o = fx3Take(h, 'coneG');
      o.position.set(px, py, pz);
      o.scale.set(0.45, 2.4, 0.45);
      o.rotation.set(Math.PI, 0, 0.18);
      o.material.color.set(th.proj === 'ice' ? th.debCol[0] : th.mid);
      o.material.opacity = 0.95;
      if (th.proj === 'ice') {
        const c2 = fx3Take(h, 'cone');
        c2.position.set(px, py + 0.2, pz);
        c2.scale.set(0.3, 1.8, 0.3);
        c2.rotation.set(Math.PI, 0, 0.18);
        c2.material.color.set('#e8f8ff');
        c2.material.opacity = 0.9;
      }
      for (let i = 1; i <= 4; i++) bsSprite3(h, px + i * 0.32, py + 1.2 + i * 0.95, pz - i * 0.12, 0.9 - i * 0.12, 'disc', i < 2 ? th.core : th.mid, 0.5 - i * 0.08);
    } else if (th.proj === 'skull') {
      const o = fx3Take(h, 'skull');
      o.position.set(px, py, pz);
      o.scale.setScalar(2.2);
      o.rotation.set(0, Math.PI / 2, -0.9);
      o.userData.eyeMat.color.set(th.mid);
      for (let i = 1; i <= 6; i++) bsSprite3(h, px + i * 0.3, py + 0.6 + i * 0.6, pz - i * 0.1, 1.3 - i * 0.12, 'flame', th.mid, 0.6 - i * 0.07);
    } else if (th.proj === 'blob') {
      const o = fx3Take(h, 'ball');
      o.position.set(px, py, pz);
      o.scale.set(0.75, 0.85, 0.75);
      o.material.color.set(th.debCol[0]);
      o.material.opacity = 0.9;
      for (let i = 1; i <= 5; i++) bsSprite3(h, px + i * 0.3, py + 0.8 + i * 0.7, pz - i * 0.1, 0.8 - i * 0.1, 'disc', th.mid, 0.45 - i * 0.07);
    } else {
      const o = fx3Rock(h, 'rock', px, py, pz, 0.85, 0.75, 0.8, th.debCol[0]);
      o.rotation.set(u * 5, u * 3, 0);
      const fire = th.proj === 'fire';
      for (let i = 1; i <= 6; i++) bsSprite3(h, px + i * 0.32, py + 0.6 + i * 0.75, pz - i * 0.1, (fire ? 1.6 : 1.1) - i * 0.15, fire ? 'flame' : 'disc', fire ? (i < 3 ? th.core : th.mid) : th.dark, (fire ? 0.75 : 0.35) - i * 0.07);
    }
    const sh = fx3Take(h, 'planeN');
    fx3Ground(sh, f.x, f.y, 0.4 + q * 1.3, 0.05, 'disc');
    fx3Color(sh, '#120c0a', 0.2 + q * 0.3);
    return;
  }
  const tt = u - fall;
  const v = tt / (f.dur - fall);
  bsSeed3(f, 'sd', 12, () => ({ a: Math.random() * 6.3, sp: 2 + Math.random() * 4, up: 2 + Math.random() * 5, s: 0.25 + Math.random() * 0.3, r: Math.random() * 6 })).forEach((q, i) => {
    const y = 0.3 + q.up * tt - 9 * tt * tt;
    if (y < 0) return;
    bsDebris3(h, th, x + Math.cos(q.a) * q.sp * tt, y, z + Math.sin(q.a) * q.sp * tt, q.s, tt * 10 + q.r, i, 1 - v);
  });
  for (const q of bsSeed3(f, 'sm', 6, () => ({ a: Math.random() * 6.3, d: 0.5 + Math.random() }))) bsSmoke3(h, x + Math.cos(q.a) * q.d * (1 + v * 2), 0.4 + v * 1.2, z + Math.sin(q.a) * q.d * (1 + v * 2), 1 + v * 1.8, th.dark, 0.45 * (1 - v));
  bsSprite3(h, x, 0.6, z, 2.6 * (1 - v * 0.5), th.tex === 'flame' ? 'flame' : 'disc', th.mid, 0.45 * (1 - v));
  if (th.proj === 'bolt' && v < 0.35) {
    _b3P.set(x, 12, z);
    _b3P2.set(x, 0.2, z);
    bsBolt3(h, _b3P, _b3P2, th, 0.06, 0.8 * (1 - v * 2.5), 8);
  }
}
// Druckwelle: Brocken, Staub und Funken fliegen flach nach außen (eine Wolke, keine Linie am Boden)
function bsFxBurst3(h, f, u, k, th) {
  const x = f.x * U3, z = f.y * U3;
  const R = f.r || 10;
  const e = easeOut(k);
  for (const q of bsSeed3(f, 'sm', 22, () => ({ a: Math.random() * 6.3, s: 0.8 + Math.random() * 1.3, y: 0.2 + Math.random() * 0.9, d: 0.5 + Math.random() * 0.5 }))) {
    const d = 1.2 + R * q.d * e;
    bsSmoke3(h, x + Math.cos(q.a) * d, q.y + e * 0.6, z + Math.sin(q.a) * d * 0.9, q.s * (0.7 + e * 1.6), q.d > 0.8 ? th.mid : th.dark, (q.d > 0.8 ? 0.25 : 0.45) * (1 - k));
  }
  bsSeed3(f, 'db', 14, () => ({ a: Math.random() * 6.3, d: 0.4 + Math.random() * 0.6, up: 2 + Math.random() * 4, s: 0.25 + Math.random() * 0.35, r: Math.random() * 6 })).forEach((q, i) => {
    const d = 0.8 + R * 0.8 * q.d * e;
    const y = 0.2 + q.up * u - 7 * u * u;
    if (y < 0) return;
    bsDebris3(h, th, x + Math.cos(q.a) * d, y, z + Math.sin(q.a) * d * 0.9, q.s, u * 7 + q.r, i, 1 - k * 0.6);
  });
  for (const q of bsSeed3(f, 'sp', 24, () => ({ a: Math.random() * 6.3, d: 0.5 + Math.random() * 0.5, up: 1 + Math.random() * 3 }))) {
    const d = 1 + R * 1.1 * q.d * e;
    const y = th.rise ? 0.3 + q.up * k * 2.5 : 0.3 + q.up * k * 2 - 4 * k * k;
    if (y < 0) continue;
    bsSprite3(h, x + Math.cos(q.a) * d, y, z + Math.sin(q.a) * d * 0.9, th.tex === 'flame' ? 0.6 : 0.24, th.tex, q.up > 2.5 ? th.core : th.mid, 0.9 * (1 - k));
  }
  if (th.bolt && k < 0.5 && Math.random() < 0.7) {
    const a0 = Math.random() * 6.3;
    _b3P.set(x, 0.5, z);
    _b3P2.set(x + Math.cos(a0) * R * e, 0.3, z + Math.sin(a0) * R * e);
    bsBolt3(h, _b3P, _b3P2, th, 0.04, 0.9, 6);
  }
}
// Brüllen: Dampf/Atem aus dem Maul, vom Boden springen kleine Brocken
function bsFxRoar3(h, f, u, k, th) {
  bsPt3(f.m, 'mouth', _b3P);
  const a = f.m.__k3 && actors3.get(f.m.__k3);
  const hd = a ? a.heading : 0;
  _b3D.set(Math.sin(hd), 0.35, Math.cos(hd)).normalize();
  for (const q of bsSeed3(f, 'sd', 12, () => ({ o: Math.random() * 0.6, s: 0.5 + Math.random() * 0.6, x: Math.random() - 0.5, y: Math.random() - 0.2 }))) {
    const v = (u - q.o) / 1.0;
    if (v < 0 || v > 1) continue;
    const d = v * 4.2;
    bsSmoke3(h, _b3P.x + _b3D.x * d + q.x * d * 0.6 * _b3D.z, _b3P.y + _b3D.y * d + (q.y + 0.4) * d * 0.4, _b3P.z + _b3D.z * d - q.x * d * 0.6 * _b3D.x, q.s * (0.6 + v * 2.2), th.mist ? th.mid : th.dark, (th.mist ? 0.22 : 0.3) * (1 - v));
  }
  const x = f.m.x * U3, z = feetY(f.m) * U3;
  bsSeed3(f, 'db', 10, () => ({ a: Math.random() * 6.3, d: 2 + Math.random() * 5, up: 1.5 + Math.random() * 2, s: 0.15 + Math.random() * 0.2, o: Math.random() * 0.5 })).forEach((q, i) => {
    const tt = u - q.o;
    if (tt < 0) return;
    const y = q.up * tt - 6 * tt * tt;
    if (y < 0) return;
    bsDebris3(h, th, x + Math.cos(q.a) * q.d, y + 0.1, z + Math.sin(q.a) * q.d, q.s, tt * 6, i, 1 - k);
  });
}
// Tod: je nach Thema zerfällt er in Brocken, Glut, Splitter oder Seelenfeuer, das Leuchten erlischt
function bsFxDeath3(h, f, u, k, th) {
  const a = f.a;
  const def = f.def;
  if (!a || !a.bones || !def) return;
  const pts = def.deathPts || ['core', 'mouth'];
  const sd = bsSeed3(f, 'sd', 24, (v, i) => ({ p: pts[i % pts.length], ox: (Math.random() - 0.5) * 1.2, oz: (Math.random() - 0.5) * 1.2, a: Math.random() * 6.3, sp: 1 + Math.random() * 3.5, up: 2 + Math.random() * 5, s: 0.2 + Math.random() * 0.35, r: Math.random() * 6 }));
  if (!f.base) f.base = sd.map((q) => bsPtA3(a, def, q.p, new THREE.Vector3()).add(_b3N.set(q.ox, 0, q.oz)));
  sd.forEach((q, i) => {
    const p = f.base[i];
    if (th.rise) {
      // Glut und Seelenfeuer steigen auf
      const y = p.y + q.up * u * 0.6;
      bsSprite3(h, p.x + Math.cos(q.a) * q.sp * u * 0.4, y, p.z + Math.sin(q.a) * q.sp * u * 0.4, (th.tex === 'flame' ? 0.9 : 0.4) * (1 - k * 0.5), th.tex, i % 3 ? th.mid : th.core, 0.8 * (1 - k));
      return;
    }
    const y = p.y + q.up * u - 9 * u * u;
    if (y < 0.05) return;
    bsDebris3(h, th, p.x + Math.cos(q.a) * q.sp * u, y, p.z + Math.sin(q.a) * q.sp * u, q.s, u * 8 + q.r, i, 1 - k);
    if (i % 3 === 0) bsSprite3(h, p.x + Math.cos(q.a) * q.sp * u, Math.max(0.1, y + 0.2), p.z + Math.sin(q.a) * q.sp * u, 0.3, th.tex, th.core, 0.8 * (1 - k));
  });
  if (u < 0.8) {
    const c = f.base[0];
    bsSmoke3(h, c.x, c.y, c.z, 2 + u * 4, th.dark, 0.4 * (1 - u / 0.8));
  }
}
// seit 14.81: Zacken brechen an einer Stelle aus dem Boden (Dornen, Ringe, Kreuz): Fels, Eis, Knochen, Giftblasen
function bsFxErupt3(h, f, u, k, th) {
  const x0 = f.x * U3, z0 = f.y * U3;
  const R = Math.max(0.8, (f.r || 70) * U3 * 0.6);
  const sd = bsSeed3(f, 'sp', f.n || 6, (v, i) => ({ a: i * 2.4 + Math.random(), d: i ? 0.35 + Math.random() * 0.65 : 0, s: 0.75 + Math.random() * 0.5, t: (Math.random() - 0.5) * 0.5, o: Math.random() * 0.12 }));
  sd.forEach((q, i) => {
    const v = (u - q.o) / Math.max(0.3, f.dur - q.o);
    if (v < 0 || v > 1) return;
    const up = v < 0.12 ? easeOut(v / 0.12) : 1 - Math.max(0, (v - 0.6) / 0.4);
    const px = x0 + Math.cos(q.a) * q.d * R, pz = z0 + Math.sin(q.a) * q.d * R;
    const hgt = (i ? 1.3 : 2.1) * q.s * up * (f.big || 1);
    if (th.deb === 'blob') {
      // Giftblasen quellen auf und platzen
      const o = fx3Take(h, 'ball');
      const r = 0.35 * q.s * up * (f.big || 1);
      o.position.set(px, r * 0.8, pz);
      o.scale.set(r, r * 0.85, r);
      o.material.color.set(th.debCol[i % 2]);
      o.material.opacity = 0.85 * (1 - Math.max(0, v - 0.7) / 0.3);
      if (v > 0.5) bsSmoke3(h, px, 0.4 + v, pz, 0.8 + v, th.mid, 0.3 * (1 - v));
    } else if (th.deb === 'ice' || th.deb === 'bone') {
      const o = fx3Take(h, th.deb === 'ice' ? 'coneG' : 'cone');
      o.position.set(px, hgt * 0.5 - 0.1, pz);
      o.scale.set(0.38 * q.s, Math.max(0.01, hgt), 0.38 * q.s);
      o.rotation.set(q.t, 0, q.t * 0.8);
      o.material.color.set(th.debCol[i % 2]);
      o.material.opacity = th.deb === 'ice' ? 0.88 : 1;
    } else {
      const o = fx3Take(h, 'rockcol');
      o.position.set(px, hgt * 0.5 - 0.15, pz);
      o.scale.set(0.55 * q.s, Math.max(0.01, hgt), 0.55 * q.s);
      o.rotation.set(q.t, q.a, q.t * 0.6);
      o.material.color.set(th.debCol[i % 2]);
      if (th.rise && v < 0.7) bsSprite3(h, px, hgt + 0.2, pz, 0.9, 'flame', i % 2 ? th.mid : th.core, 0.7 * (1 - v));
    }
    if (v < 0.35) bsSmoke3(h, px, 0.3 + v * 1.5, pz, 0.9 + v * 2.2, th.dark, 0.45 * (1 - v * 2.8));
  });
  if (u < 0.5) for (const q of bsSeed3(f, 'db', 5, () => ({ a: Math.random() * 6.3, sp: 1.5 + Math.random() * 2.5, up: 3 + Math.random() * 3, r: Math.random() * 6 }))) {
    const y = 0.3 + q.up * u - 9 * u * u;
    if (y > 0) bsDebris3(h, th, x0 + Math.cos(q.a) * q.sp * u, y, z0 + Math.sin(q.a) * q.sp * u, 0.25, u * 9 + q.r, (q.r * 3) | 0, 1 - u * 2);
  }
  if (th.bolt && u < 0.3 && Math.random() < 0.6) {
    _b3P.set(x0, 0.2, z0);
    _b3P2.set(x0 + (Math.random() - 0.5) * 2, 2.5 + Math.random() * 2, z0 + (Math.random() - 0.5) * 2);
    bsBolt3(h, _b3P, _b3P2, th, 0.04, 0.9, 6);
  }
}
// Sog: Staub, Funken und Brocken kreisen von außen zum Boss
function bsFxVortex3(h, f, u, k, th) {
  const m = f.m;
  const x0 = m.x * U3, z0 = feetY(m) * U3;
  const R = f.R || 9;
  const fade = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, u / 0.3);
  bsSeed3(f, 'sd', 30, (v, i) => ({ a: Math.random() * 6.3, o: Math.random(), s: 0.6 + Math.random() * 0.9, y: 0.2 + Math.random() * 1.6, c: i % 5 })).forEach((q, i) => {
    const v = (q.o + u * 0.55) % 1;
    const r = R * (1 - v);
    const a = q.a + v * 4.2;
    const px = x0 + Math.cos(a) * r, pz = z0 + Math.sin(a) * r * 0.9;
    const py = q.y * (0.4 + 0.6 * (1 - v)) + v * 1.2;
    if (q.c === 0) bsDebris3(h, th, px, py, pz, 0.28, u * 6 + q.a, i, fade);
    else if (q.c < 3) bsSmoke3(h, px, py, pz, q.s * (0.6 + (1 - v)), q.c === 1 ? th.dark : th.mid, (q.c === 1 ? 0.35 : 0.2) * fade * Math.sin(Math.PI * v));
    else bsSprite3(h, px, py, pz, th.tex === 'flame' ? 0.5 : 0.22, th.tex, i % 2 ? th.mid : th.core, 0.85 * fade);
  });
}
// Kettenblitz: vom Boss zum ersten Ziel, dann von Ziel zu Ziel (Blitze im Farbton des Bosses)
const _b3Ch = new THREE.Vector3();
function bsFxChain3(h, f, u, k, th) {
  const pts = f.pts || [];
  if (!pts.length) return;
  const fade = 1 - k;
  bsPt3(f.m, f.at || 'emit', _b3P);
  let ax = _b3P.x, ay = _b3P.y, az = _b3P.z;
  pts.forEach(([x, y], i) => {
    if (u < i * 0.06) return;
    _b3Ch.set(ax, ay, az);
    _b3P2.set(x * U3, 1.0, y * U3);
    bsBolt3(h, _b3Ch, _b3P2, th, 0.05, 0.95 * fade, 8);
    if (Math.random() < 0.5) bsBolt3(h, _b3Ch, _b3P2, th, 0.025, 0.7 * fade, 6);
    bsSprite3(h, _b3P2.x, 1.0, _b3P2.z, 1.6, 'disc', th.mid, 0.5 * fade);
    bsSprite3(h, _b3P2.x, 0.4, _b3P2.z, 0.5, 'spark', th.core, 0.9 * fade);
    ax = _b3P2.x; ay = 1.0; az = _b3P2.z;
  });
}
// Staubspur beim Sturmangriff
function bsFxTrail3(h, f, u, k, th) {
  const m = f.m;
  const x = m.x * U3, z = feetY(m) * U3;
  const sd = bsSeed3(f, 'sd', 14, () => ({ s: 0.8 + Math.random() }));
  if (!f.pts) f.pts = [];
  if (!f.last || u - f.last > 0.05) {
    f.pts.push([x, z, u]);
    f.last = u;
    if (f.pts.length > 14) f.pts.shift();
  }
  f.pts.forEach(([px, pz, t0], i) => {
    const v = Math.min(1, (u - t0) / 0.7);
    bsSmoke3(h, px, 0.3 + v * 0.8, pz, sd[i % sd.length].s * (0.8 + v * 1.5), th.dark, 0.4 * (1 - v));
    if (i % 2 === 0) bsSprite3(h, px, 0.3 + v, pz, th.tex === 'flame' ? 0.8 : 0.3, th.tex, th.mid, 0.6 * (1 - v));
  });
}
if (typeof FX3_HOOKS !== 'undefined') FX3_HOOKS.push({ parts: [], fn: bossFx3 });

// --- Anbindung an den Kampf (gegner.js, endboss.js, effekte.js) -----------------------------------------------
function bsRoarFx3(m) {
  bsAddFx3({ kind: 'roar', m, th: bsTheme3(m), dur: 1.6 });
  if (typeof shakeScreen === 'function') shakeScreen(6);
}
// Ankündigung eines Endboss-Angriffs (Host und Mitspieler): Pose merken, Effekte anlegen. Gibt true zurück, wenn der
// gewöhnliche Meteor-Fall entfallen soll (in 3D fallen dann die Geschosse des Bosses).
function bossTelegraph(m, kind, circles, inner, delay) {
  const now = game.time;
  let dir = null;
  if ((kind === 'line' || kind === 'buster' || kind === 'charge' || kind === 'leap') && circles.length) {
    const end = circles[circles.length - 1];
    dir = Math.atan2(end.x - m.x, end.y - feetY(m));
  } else if ((kind === 'fan' || kind === 'chain' || kind === 'pools') && circles.length) {
    // seit 14.81: Kegel, Kettenblitz, Lachen zur Mitte der Ziele
    let x = 0, y = 0;
    for (const c of circles) { x += c.x; y += c.y; }
    dir = Math.atan2(x / circles.length - m.x, y / circles.length - feetY(m));
  } else if (kind === 'pull' && m.target && !m.target.dead) dir = Math.atan2(m.target.x - m.x, m.target.y - m.y);
  m.bsCast = { kind, t0: now, d: delay, dir };
  if (!V3.on) return false;
  const th = bsTheme3(m);
  const def = BOSS3[m.typeId];
  if (bsTelegraphX3(m, kind, circles, inner, delay, th, def)) return true;
  if (kind === 'line' && circles.length) {
    const end = circles[circles.length - 1];
    bsAddFx3({ kind: 'charge', m, th, at: 'emit', dur: delay });
    later(delay, () => bsAddFx3({ kind: 'beam', m, th, at: 'emit', tx: end.x + (end.x - m.x) * 0.08, ty: end.y + (end.y - feetY(m)) * 0.08, dur: 0.95 }));
  } else if (kind === 'meteor') {
    bsAddFx3({ kind: 'charge', m, th, at: def.skyAt || 'emit', dur: Math.min(1.2, delay), big: 1.3 });
    for (const c of circles) later(Math.max(0, delay - 0.55), () => bsAddFx3({ kind: 'fall', th, x: c.x, y: c.y, fall: 0.55, dur: 1.5 }));
    return true;
  } else if (kind === 'nova') {
    bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: delay, big: 1.6 });
    later(delay, () => {
      bsAddFx3({ kind: 'burst', th, x: m.x, y: feetY(m), r: 13, dur: 1.2 });
      shakeScreen(9);
    });
  } else if (kind === 'slam') later(delay, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: feetY(m), r: 8, dur: 0.9 }));
  else if (kind === 'buster' && circles.length) {
    const c = circles[0];
    bsAddFx3({ kind: 'charge', m, th, at: 'weapon', dur: delay });
    later(delay, () => bsAddFx3({ kind: 'burst', th, x: c.x, y: c.y, r: 4, dur: 0.8 }));
  } else if (kind === 'leap') later(delay + 0.3, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: feetY(m), r: 7, dur: 0.8 }));
  else if (kind === 'charge') later(delay, () => bsAddFx3({ kind: 'trail', m, th, dur: 1.0 }));
  else if (kind === 'doom') {
    later(0.2, () => bsAddFx3({ kind: 'burst', th, x: m.homeX, y: m.homeY, r: 6, dur: 0.9 }));
    bsAddFx3({ kind: 'charge', m, th, at: def.skyAt || 'core', dur: delay, big: 2 });
    later(delay, () => {
      bsAddFx3({ kind: 'burst', th, x: m.homeX, y: m.homeY + 10, r: 16, dur: 1.4 });
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + Math.random() * 0.5;
        const d = 180 + Math.random() * 300;
        later(Math.random() * 0.5, () => bsAddFx3({ kind: 'fall', th, x: m.homeX + Math.cos(a) * d, y: m.homeY + Math.sin(a) * d, fall: 0.45, dur: 1.3 }));
      }
    });
  }
  return false;
}
// seit 14.81: Angriffe der Instanz- und Höllenthron-Bosse (instanzen.js, hoellenthron.js) in 3D, je im Thema des
// Bosses. Alles, was den Boden trifft, bricht aus ihm hervor oder fällt herab (keine Ringe, keine Lichtsäulen). Gibt
// true zurück, wenn der Angriff hier ganz behandelt ist.
function bsTelegraphX3(m, kind, circles, inner, delay, th, def) {
  const fy = feetY(m);
  const falls = (list, at, proj) => {
    const t2 = proj ? Object.assign({}, th, { proj }) : th;
    for (const c of list) later(Math.max(0, at), () => bsAddFx3({ kind: 'fall', th: t2, x: c.x, y: c.y, fall: 0.5, dur: 1.4 }));
  };
  const erupt = (c, r, big, at = delay) => later(Math.max(0, at), () => bsAddFx3({ kind: 'erupt', th, x: c.x, y: c.y, r, big, n: big > 1 ? 7 : 5, dur: 1.3 }));
  switch (kind) {
    case 'fan': {
      bsAddFx3({ kind: 'charge', m, th, at: 'emit', dur: delay });
      if (th.beam === 'ground') {
        for (const c of circles.slice(-4)) later(delay, () => bsAddFx3({ kind: 'quake', m, th, tx: c.x, ty: c.y, dur: 1.0 }));
      } else {
        let x = 0, y = 0;
        const far = circles.slice(-4);
        for (const c of far) { x += c.x; y += c.y; }
        later(delay, () => bsAddFx3({ kind: 'beam', m, th, at: 'emit', tx: x / far.length, ty: y / far.length, wide: 1.9, dur: 0.95 }));
      }
      return true;
    }
    case 'spikes':
      bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: delay });
      later(delay, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 5, dur: 0.7 }));
      for (const c of circles) erupt(c, c.r, 1);
      return true;
    case 'rain':
      bsAddFx3({ kind: 'charge', m, th, at: def.skyAt || 'emit', dur: Math.min(1.2, delay), big: 1.3 });
      falls(circles, delay - 0.5);
      return true;
    case 'pools':
      bsAddFx3({ kind: 'charge', m, th, at: 'emit', dur: delay });
      falls(circles, delay - 0.5, th.deb === 'blob' ? 'blob' : th.proj === 'bolt' ? 'blob' : th.proj);
      return true;
    case 'cross': {
      bsAddFx3({ kind: 'charge', m, th, at: 'weapon', dur: delay });
      later(delay, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 5, dur: 0.8 }));
      for (let a = 0; a < 4; a++) {
        const c = circles[Math.min(circles.length - 1, a * 5 + 4)];
        if (c) later(delay, () => bsAddFx3({ kind: 'quake', m, th, tx: c.x, ty: c.y, dur: 1.0 }));
      }
      return true;
    }
    case 'pull':
      bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: delay, big: 1.3 });
      bsAddFx3({ kind: 'vortex', m, th, R: Math.min(14, (circles[0] ? circles[0].r : 380) * U3), dur: delay + 0.5 });
      return true;
    case 'chain': {
      bsAddFx3({ kind: 'charge', m, th, at: 'emit', dur: delay });
      const pts = circles.map((c) => [c.x, c.y]);
      later(delay, () => {
        bsAddFx3({ kind: 'chainfx', m, th, at: 'emit', pts, dur: 0.5 });
        for (const c of circles) bsAddFx3({ kind: 'burst', th, x: c.x, y: c.y, r: 3, dur: 0.6 });
      });
      return true;
    }
    case 'ringout':
    case 'qring': {
      const c0 = circles[0];
      bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: delay, big: 1.5 });
      later(delay, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 13, dur: 1.2 }));
      const n = kind === 'qring' ? 10 : 8;
      const R0 = (inner + Math.min(c0.r, 700)) / 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3;
        erupt({ x: c0.x + Math.cos(a) * R0, y: c0.y + Math.sin(a) * R0 * 0.8 }, 90, 1.2);
      }
      return true;
    }
    case 'core':
    case 'qcore': {
      const c0 = circles[0];
      bsAddFx3({ kind: 'charge', m, th, at: 'core', dur: delay, big: 1.8 });
      later(delay, () => bsAddFx3({ kind: 'burst', th, x: c0.x, y: c0.y, r: Math.min(16, c0.r * U3 * 0.8), dur: 1.2 }));
      const n = kind === 'qcore' ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        erupt({ x: c0.x + Math.cos(a) * c0.r * 0.55, y: c0.y + Math.sin(a) * c0.r * 0.45 }, 100, 1.3);
      }
      return true;
    }
    case 'ult':
    case 'quarter': {
      // Vernichtung des Instanzbosses bzw. Viertelschlag: aufsteigen, Kraft sammeln, Brocken fallen überall, wo es
      // nicht sicher ist
      const [big, ...safe] = circles;
      const safeQ = kind === 'quarter' && inner < 0 ? -inner - 1 : -1;
      bsAddFx3({ kind: 'charge', m, th, at: def.skyAt || 'core', dur: delay, big: 2 });
      later(Math.min(0.3, delay * 0.1), () => bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 6, dur: 0.9 }));
      const spots = [];
      for (let tries = 0; spots.length < 10 && tries < 80; tries++) {
        const a = Math.random() * Math.PI * 2;
        const d = 120 + Math.random() * (kind === 'quarter' ? 620 : 480);
        const p = { x: big.x + Math.cos(a) * d, y: big.y + Math.sin(a) * d * 0.8 };
        if (safe.some((s2) => Math.hypot(s2.x - p.x, s2.y - p.y) < s2.r + 50)) continue;
        if (safeQ >= 0 && typeof htSector === 'function' && htSector(p.x - big.x, (p.y - big.y) * 1.2) === safeQ) continue;
        spots.push(p);
      }
      later(delay, () => bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 16, dur: 1.4 }));
      for (const p of spots) later(delay - 0.45 + Math.random() * 0.5, () => bsAddFx3({ kind: 'fall', th, x: p.x, y: p.y, fall: 0.45, dur: 1.3 }));
      return true;
    }
    case 'volley':
      bsAddFx3({ kind: 'burst', th, x: m.x, y: fy, r: 4, dur: 0.7 });
      return true;
    default:
      return false;
  }
}
// Geschossring (instanzen.js, Salve der Dungeon-Bosse): nur Pose und kleine Druckwelle
function bossVolley3(m) {
  bossTelegraph(m, 'volley', [], 0, 0.12);
}
// Brüllen beim Phasenwechsel (raidRoarFx, auch beim Mitspieler)
function bossRoar(m) {
  m.bsRoar = game.time;
  bsRoarFx3(m);
  bsAddFx3({ kind: 'burst', th: bsTheme3(m), x: m.x, y: feetY(m), r: 8, dur: 1.2 });
}
// Verwandlung (Abaddor, zweite Form; hoellenthron.js): Brüllen, Glutsturm und Druckwelle in 3D statt Bildschirmblitz
function bossTransform3(m) {
  bossRoar(m);
  const th = bsTheme3(m);
  bsAddFx3({ kind: 'burst', th, x: m.x, y: feetY(m), r: 15, dur: 1.5 });
  bsAddFx3({ kind: 'vortex', m, th, R: 7, dur: 1.4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    later(0.1 * i, () => bsAddFx3({ kind: 'erupt', th, x: m.x + Math.cos(a) * 210, y: feetY(m) + Math.sin(a) * 170, r: 90, big: 1.2, n: 5, dur: 1.4 }));
  }
}
// Tod: längere Leiche (eigene Todesanimation), Blickrichtung behalten
function bossCorpse(m, e) {
  e.dur = 4.6;
  const a = m.__k3 && actors3.get(m.__k3);
  if (a) e.heading3 = a.heading;
  if (typeof shakeScreen === 'function') shakeScreen(9);
}
// Leiche in 3D (syncCorpse3): Todesanimation, ab 1,6 s zerfällt er (Thema), am Ende versinkt er
function bossCorpse3(a, e) {
  if (e.heading3 != null) a.heading = e.heading3;
  const dt = Math.min(0.1, Math.max(0, game.time - (a.bsT ?? game.time)));
  a.bsT = game.time;
  const S = bossAnim3(a, e, dt || 1 / 60, true);
  const def = BOSS3[a.model.boss3];
  const u = game.time - e.start;
  if (u > 1.6 && !e.bsDust) {
    e.bsDust = true;
    bsAddFx3({ kind: 'death', a, def, th: BS_FXT3[def.fx] || BS_FXT3.erde, dur: 1.8 });
    if (typeof shakeScreen === 'function') shakeScreen(7);
  }
  const sink = Math.max(0, u - 3.2) / 1.4;
  if (sink > 0) a.group.position.y -= sink * a.model.height * a.model.scale * 0.5;
  if (a.mats.glow && u > 1.6) a.mats.glow.color.setScalar(Math.max(0.05, 0.9 - (u - 1.6) * 0.9));
  if (a.mats.lit) a.mats.lit.emissive.setRGB(0, 0, 0);
  return S;
}
