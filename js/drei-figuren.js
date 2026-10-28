// 3D-Figuren: Spieler (alle Klassen, Aussehen, sichtbare Ausrüstung), Waffen, Pferd, Bewohner,
// Monster, Seelensteine, Portale und Risse.
//
// Jede Figur hat ein kleines Skelett (Hüfte, Brust, Kopf, Arme, Hände, Beine, Umhang, Schwanz,
// Flügel bzw. vier Beine bei Tieren). Alle Teile werden mit ihrem Knochen zu wenigen Meshes
// zusammengebacken und über das Skelett bewegt: Laufen, Atmen, Zuschlagen, Zaubern, Zucken.
// Die Farben der Monster und Bewohner liest das Spiel direkt aus den 2D-Zeichnungen
// (dieselben Farbtabellen), damit beide Ansichten zusammenpassen.

// --- Knochen ------------------------------------------------------------------------------------

const BH = { root: 0, hips: 1, chest: 2, head: 3, armL: 4, armR: 5, handL: 6, handR: 7, legL: 8, legR: 9, cape: 10, tail: 11, wingL: 12, wingR: 13 };
const BQ = { root: 0, body: 1, head: 2, legFL: 3, legFR: 4, legBL: 5, legBR: 6, tail: 7, wingL: 8, wingR: 9, neck: 10 };

// Skelett aus Ruhepositionen im Figurenraum: [[x, y, z], Elternknochen]
function rigOf(list) {
  return list.map(([pos, parent]) => ({ pos, parent }));
}

// --- Materialien der Figuren --------------------------------------------------------------------

function figLitMat() {
  return toonMat({ skinning: true, emissive: 0x000000 });
}
const figOutline = () => mat3('figOutline', () => outlineMat(0.024, true));
const figGlow = () => mat3('figGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true }));
const figAura = () => mat3('figAura', () => new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
function figWeaponGlowMat() {
  return new THREE.MeshBasicMaterial({ skinning: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff });
}

// --- Teilformen ---------------------------------------------------------------------------------

function cap3(r, thetaLen, phiStart = 0, phiLen = Math.PI * 2, ws = 16, hs = 8) {
  return geo3(`cap${r},${thetaLen},${phiStart},${phiLen}`, () => new THREE.SphereGeometry(r, ws, hs, phiStart, phiLen, 0, thetaLen));
}
function torus3(r, t, arc = Math.PI * 2, rs = 5, ts = 16) {
  return geo3(`to${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
function cyl3(r1, r2, h, seg = 14) {
  return geo3(`cy${r1},${r2},${h}`, () => new THREE.CylinderGeometry(r1, r2, h, seg));
}

// Hilfsfunktion: fügt Teile mit gemeinsamer Elternmatrix (für feste Objekte) hinzu
function adder(b, P) {
  return (geo, color, o = {}) => b.add(geo, color, P ? Object.assign({ parent: P }, o) : o);
}

// Flügelhaut (Fledermaus- bzw. Drachenflügel) mit weichem Rand
function wingGeo() {
  return geo3('wingmem', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.55, 0.42);
    s.quadraticCurveTo(0.6, 0.1, 0.72, 0.0);
    s.quadraticCurveTo(0.5, -0.05, 0.42, -0.25);
    s.quadraticCurveTo(0.25, -0.1, 0, -0.18);
    s.lineTo(0, 0);
    return smoothGeo(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 }));
  });
}

// --- Waffen (Griff im Ursprung, Klinge entlang +y) -----------------------------------------------

function weapon3(A, kind, tier, bone, at, rot, wg) {
  tier = Math.max(0, Math.min(7, tier || 0));
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1));
  const W = (geo, color, o = {}) => A(geo, color, Object.assign({}, o, { bone, m: M.clone().multiply(partMatrix(o)) }));
  const shell = (geo, o) => wg && A(geo, '#ffffff', { bone, mat: 'wglow', m: M.clone().multiply(partMatrix(o)) });
  const gold = '#c9a35a';
  switch (kind) {
    case 'sword':
    case 'greatsword':
    case 'dagger': {
      const big = kind === 'greatsword';
      const len = big ? 1.0 : kind === 'dagger' ? 0.32 : 0.66;
      const wd = big ? 0.16 : kind === 'dagger' ? 0.07 : 0.1;
      W(limb3(big ? 0.24 : 0.16, 0.028, 0.028, 6), accent, { p: [0, 0.02, 0] });
      W(sphere3(0.04, 8, 6), gold, { p: [0, -0.16 * (big ? 1.4 : 1), 0] });
      W(roundBox(big ? 0.34 : 0.24, 0.05, 0.07, 0.02), tier >= 3 ? metal : gold, { p: [0, 0.06, 0] });
      W(roundBox(wd, len, 0.026, 0.012), metal, { p: [0, 0.09 + len / 2, 0], top: lighter(metal, 0.4), topK: 0.3 });
      W(horn3(wd * 1.1, wd * 0.5, 4), metal, { p: [0, 0.09 + len, 0], s: [1, 1, 0.26], r: [0, Math.PI / 4, 0] });
      W(roundBox(wd * 0.25, len * 0.85, 0.03, 0.01), darker(metal, 0.25), { p: [0, 0.09 + len * 0.45, 0] });
      if (tier >= 4) W(roundBox(wd * 0.3, len * 0.6, 0.032, 0.01), lighter(metal, 0.3), { p: [0, 0.09 + len * 0.5, 0], mat: 'glow' });
      shell(roundBox(wd * 1.8, len * 1.15, 0.08, 0.04), { p: [0, 0.09 + len / 2, 0] });
      return 0.09 + len;
    }
    case 'bow': {
      for (const sy of [-1, 1]) W(torus3(0.42, 0.026, Math.PI * 0.42, 5, 10), metal === TIER_METAL[0] ? '#8a5a34' : accent, { r: [0, 0, sy > 0 ? 0.25 : -Math.PI * 0.42 - 0.25], p: [-0.38, 0, 0] });
      W(limb3(0.2, 0.03, 0.03, 6), '#3a2a1c', { p: [0, 0.1, 0] });
      W(limb3(0.74, 0.006, 0.006, 3), '#efe6cc', { p: [-0.24, 0.37, 0] });
      shell(torus3(0.42, 0.06, Math.PI * 0.84, 5, 12), { r: [0, 0, -Math.PI * 0.42], p: [-0.38, 0, 0] });
      return 0.4;
    }
    case 'fan': {
      W(geo3('fanleaf', () => new THREE.CylinderGeometry(0.34, 0.34, 0.02, 16, 1, false, -Math.PI * 0.42, Math.PI * 0.84).rotateX(Math.PI / 2)), FAN_LEAF[tier], { p: [0, 0.04, 0] });
      for (let k = -2; k <= 2; k++) W(limb3(0.34, 0.008, 0.008, 3), '#3a2a1c', { p: [0, 0.04, 0.015], r: [0, 0, Math.PI + k * 0.33] });
      W(sphere3(0.035, 8, 6), gold, { p: [0, 0.03, 0.02] });
      shell(geo3('fanshell', () => new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9).rotateX(Math.PI / 2)), { p: [0, 0.04, 0] });
      return 0.38;
    }
    case 'bell': {
      W(limb3(0.18, 0.025, 0.025, 6), '#6b4a2e', { p: [0, 0.18, 0] });
      W(lathe3('bell', [[0, 0], [0.13, 0], [0.12, 0.04], [0.08, 0.16], [0.05, 0.22], [0, 0.23]], 14), tier >= 3 ? metal : gold, { p: [0, -0.24, 0] });
      W(sphere3(0.035, 8, 6), STAFF_ORB[tier], { p: [0, -0.25, 0], mat: 'glow' });
      shell(sphere3(0.2, 12, 8), { p: [0, -0.14, 0] });
      return 0.3;
    }
    case 'staff':
    case 'skullstaff': {
      W(limb3(1.45, 0.03, 0.026, 6), '#5a3f2a', { p: [0, 1.0, 0] });
      if (kind === 'skullstaff') {
        W(sphere3(0.1, 12, 10), '#e8e0cc', { p: [0, 1.06, 0], s: [1, 0.95, 1.05] });
        for (const sx of [-1, 1]) W(sphere3(0.025, 6, 4), '#9be2ff', { p: [sx * 0.04, 1.07, 0.08], mat: 'glow' });
      } else {
        W(torus3(0.09, 0.018, Math.PI * 2, 5, 14), tier >= 3 ? metal : '#8a6a44', { p: [0, 1.08, 0] });
        W(sphere3(0.07, 12, 10), STAFF_ORB[tier], { p: [0, 1.08, 0], mat: 'glow' });
      }
      shell(sphere3(0.18, 12, 8), { p: [0, 1.07, 0] });
      return 1.15;
    }
    case 'scythe': {
      W(limb3(1.5, 0.03, 0.026, 6), '#4a3527', { p: [0, 1.0, 0] });
      W(geo3('scytheblade', () => new THREE.TorusGeometry(0.34, 0.035, 4, 14, Math.PI * 0.62).scale(1, 1, 0.35)), metal, { p: [-0.32, 0.98, 0], r: [0, 0, 0.1] });
      W(roundBox(0.1, 0.08, 0.06, 0.02), accent, { p: [0, 0.98, 0] });
      shell(geo3('scytheshell', () => new THREE.TorusGeometry(0.34, 0.08, 4, 14, Math.PI * 0.62).scale(1, 1, 0.5)), { p: [-0.32, 0.98, 0], r: [0, 0, 0.1] });
      return 1.0;
    }
    case 'axe': {
      W(limb3(0.75, 0.032, 0.028, 6), '#5a3f2a', { p: [0, 0.6, 0] });
      W(roundBox(0.26, 0.24, 0.045, 0.04), '#9aa1a8', { p: [0.13, 0.5, 0], top: '#d9dde2', topK: 0.3 });
      W(roundBox(0.06, 0.28, 0.05, 0.02), '#c9ccd2', { p: [0.27, 0.5, 0] });
      return 0.6;
    }
    case 'club': {
      W(lathe3('club', [[0, -0.12], [0.04, -0.1], [0.05, 0.2], [0.11, 0.45], [0.12, 0.55], [0.06, 0.62], [0, 0.63]], 10), '#6b4a2e', { p: [0, 0, 0], shade: 0.2 });
      for (const [x, y, z] of [[0.1, 0.45, 0], [-0.08, 0.5, 0.06], [0.02, 0.4, -0.1]]) W(horn3(0.07, 0.025, 6), '#d9dde2', { p: [x, y, z], r: [z * 8, 0, -x * 12] });
      return 0.6;
    }
    default:
      return 0;
  }
}

function shield3(A, tier, bone, at) {
  tier = Math.max(0, Math.min(7, tier || 0));
  const M = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1));
  const W = (geo, color, o = {}) => A(geo, color, Object.assign({}, o, { bone, m: M.clone().multiply(partMatrix(o)) }));
  W(lathe3('shield', [[0, -0.04], [0.24, -0.035], [0.26, -0.01], [0.25, 0.02], [0.18, 0.04], [0, 0.05]], 18), TIER_ACCENT[tier], {});
  W(torus3(0.25, 0.025, Math.PI * 2, 5, 16), TIER_METAL[tier], { r: [Math.PI / 2, 0, 0] });
  W(sphere3(0.07, 10, 8), TIER_METAL[tier], { p: [0, 0.04, 0], s: [1, 0.6, 1] });
}

// --- Gesicht und Haare -------------------------------------------------------------------------

function face3(A, hb, hc, hr, o) {
  const f = hr * 0.9;
  const ink = '#1a120c';
  const shape = o.eyeShape || 0;
  const eyeY = hc[1] - hr * 0.06;
  for (const sx of [-1, 1]) {
    const ex = hc[0] + sx * hr * 0.36;
    const ez = hc[2] + f;
    if (o.glowEyes) {
      A(sphere3(1, 7, 5), o.glowEyes, { bone: hb, p: [ex, eyeY, ez], s: [hr * 0.15, hr * 0.12, hr * 0.06], mat: 'glow' });
      continue;
    }
    if (shape === 2) {
      // fröhlich: geschlossene Bögen
      A(torus3(hr * 0.13, hr * 0.03, Math.PI, 4, 8), ink, { bone: hb, p: [ex, eyeY - hr * 0.05, ez], r: [0, 0, 0] });
      continue;
    }
    const narrow = shape === 1 || o.narrow;
    const sy = narrow ? 0.5 : 1;
    A(sphere3(1, 10, 7), ink, { bone: hb, p: [ex, eyeY, ez], s: [hr * 0.17, hr * 0.25 * sy, hr * 0.08] });
    if (!narrow) {
      A(sphere3(1, 8, 5), o.eyeColor || '#3a2a1a', { bone: hb, p: [ex, eyeY - hr * 0.07, ez + hr * 0.035], s: [hr * 0.13, hr * 0.14, hr * 0.05] });
      A(sphere3(1, 7, 5), '#ffffff', { bone: hb, p: [ex - sx * hr * 0.04, eyeY + hr * 0.09, ez + hr * 0.07], s: [hr * 0.065, hr * 0.07, hr * 0.03] });
    } else {
      A(sphere3(1, 7, 5), o.eyeColor || '#3a2a1a', { bone: hb, p: [ex, eyeY, ez + hr * 0.04], s: [hr * 0.08, hr * 0.06, hr * 0.03] });
    }
    // Brauen: entschlossen oder grimmig schräg
    if (shape === 3 || o.angry) A(roundBox(hr * 0.3, hr * 0.06, hr * 0.06, hr * 0.025), o.browColor || ink, { bone: hb, p: [ex, eyeY + hr * 0.3, ez + hr * 0.02], r: [0, 0, sx * 0.4] });
  }
  if (o.blush !== false && !o.glowEyes) for (const sx of [-1, 1]) A(sphere3(1, 7, 5), '#f29a8a', { bone: hb, p: [hc[0] + sx * hr * 0.58, eyeY - hr * 0.3, hc[2] + f * 0.86], s: [hr * 0.13, hr * 0.07, hr * 0.04] });
  if (!o.noMouth) A(roundBox(hr * 0.16, hr * 0.04, hr * 0.05, hr * 0.02), '#6a2a24', { bone: hb, p: [hc[0], hc[1] - hr * 0.42, hc[2] + f * 0.97] });
  if (!o.noNose) A(sphere3(hr * 0.06, 8, 6), darker(o.skin || '#e9c6a1', 0.1), { bone: hb, p: [hc[0], hc[1] - hr * 0.22, hc[2] + f * 1.04] });
  // Gesichtszeichen
  if (o.mark === 1) for (const sx of [-1, 1]) for (const [dx, dy] of [[0, 0], [0.12, 0.05], [0.06, -0.08]]) A(sphere3(hr * 0.025, 6, 4), '#a8683a', { bone: hb, p: [hc[0] + sx * hr * (0.45 + dx), eyeY - hr * (0.32 + dy), hc[2] + f * 0.9] });
  if (o.mark === 2) A(roundBox(hr * 0.05, hr * 0.42, hr * 0.04, hr * 0.02), '#a8483a', { bone: hb, p: [hc[0] - hr * 0.45, eyeY - hr * 0.1, hc[2] + f * 0.92], r: [0, 0, 0.35] });
  if (o.mark === 3) for (const sx of [-1, 1]) for (const k of [0, 1]) A(roundBox(hr * 0.26, hr * 0.045, hr * 0.04, hr * 0.02), '#b82a2a', { bone: hb, p: [hc[0] + sx * hr * 0.42, eyeY - hr * (0.28 + k * 0.12), hc[2] + f * 0.9], r: [0, sx * 0.3, 0] });
}

// Frisuren: 0 Kurz, 1 Dutt, 2 Lang, 3 Stachelig, 4 Pferdeschwanz, 5 Glatze
function hair3(A, hb, hc, hr, style, color, coveredTop) {
  if (style === 5) return;
  const [x, y, z] = hc;
  if (!coveredTop) {
    A(cap3(hr * 1.07, Math.PI * 0.5), color, { bone: hb, p: [x, y + hr * 0.02, z - hr * 0.06], r: [-0.62, 0, 0] });
    // Pony über der Stirn
    for (let k = -2; k <= 2; k++) A(horn3(hr * 0.34, hr * 0.16, 6), color, { bone: hb, p: [x + k * hr * 0.2, y + hr * 0.78, z + hr * 0.5], r: [2.5 - Math.abs(k) * 0.06, 0, -k * 0.22] });
    for (const sx of [-1, 1]) A(horn3(hr * 0.5, hr * 0.16, 6), color, { bone: hb, p: [x + sx * hr * 0.86, y + hr * 0.25, z + hr * 0.2], r: [2.9, 0, sx * 0.2] });
  }
  A(sphere3(1, 10, 7), color, { bone: hb, p: [x, y - hr * 0.02, z - hr * 0.2], s: [hr * 1.04, hr * 0.98, hr * 0.86] });
  if (style === 1 && !coveredTop) A(sphere3(hr * 0.36, 12, 10), color, { bone: hb, p: [x, y + hr * 0.95, z - hr * 0.35] });
  if (style === 2) A(roundBox(hr * 1.6, hr * 1.7, hr * 0.5, hr * 0.24), color, { bone: hb, p: [x, y - hr * 0.75, z - hr * 0.62], shade: 0.2 });
  if (style === 3 && !coveredTop) {
    for (let k = 0; k < 7; k++) {
      const a = -1.1 + (k / 6) * 2.2;
      A(horn3(hr * 0.75, hr * 0.24, 7), color, { bone: hb, p: [x + Math.sin(a) * hr * 0.55, y + hr * 0.6, z - hr * 0.15], r: [-0.55, 0, -a * 0.75] });
    }
  }
  if (style === 4) {
    A(sphere3(hr * 0.16, 8, 6), '#c8402f', { bone: hb, p: [x, y + hr * 0.3, z - hr * 1.0] });
    A(limb3(hr * 1.6, hr * 0.24, hr * 0.12, 8), color, { bone: hb, p: [x, y + hr * 0.3, z - hr * 1.08], r: [-0.28, 0, 0] });
  }
}

// --- Menschliche Gestalt (Spieler, Bewohner, Banditen, Orks, Untote, Riesen …) ----------------------

function humanoid3(b, c, P) {
  const A = adder(b, P);
  const belly = !!c.belly;
  const legLen = belly ? 0.32 : 0.36;
  const hipX = belly ? 0.15 : 0.11;
  const legR = belly ? 0.11 : 0.082;
  const hipY = legLen + 0.06;
  const chestY = hipY + 0.26;
  const shY = hipY + (belly ? 0.46 : 0.38);
  const shX = belly ? 0.4 : 0.26;
  const armLen = belly ? 0.42 : 0.34;
  const armR = belly ? 0.1 : 0.062;
  const neckY = hipY + (belly ? 0.58 : 0.44);
  const hr = c.headR || (belly ? 0.27 : 0.34);
  const hc = [0, neckY + hr * 0.82, belly ? 0.08 : 0.02];
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, hipY, 0], 0], [[0, chestY, 0], 1], [[0, neckY, 0], 2],
    [[shX, shY, 0], 2], [[-shX, shY, 0], 2], [[shX, shY - armLen, 0], 4], [[-shX, shY - armLen, 0], 5],
    [[hipX, hipY, 0], 1], [[-hipX, hipY, 0], 1], [[0, shY + 0.02, -0.2], 2], [[0, hipY + 0.04, -0.2], 1],
    [[0.12, shY - 0.02, -0.18], 2], [[-0.12, shY - 0.02, -0.18], 2]
  ]);
  const pants = c.pants || darker(c.torso, 0.2);
  // Beine und Stiefel
  for (const [sx, bone] of [[1, BH.legL], [-1, BH.legR]]) {
    A(limb3(legLen, legR, legR * 0.85, 8), pants, { bone, p: [sx * hipX, hipY, 0], shade: 0.15 });
    A(roundBox(legR * 2.1, 0.13, legR * 2.9, legR * 0.8), c.boots || '#3a2a1c', { bone, p: [sx * hipX, 0.065, legR * 0.35], top: lighter(c.boots || '#3a2a1c', 0.15), topK: 0.4 });
    if (c.bootTrim) A(torus3(legR * 1.08, 0.015, Math.PI * 2, 4, 14), c.bootTrim, { bone, p: [sx * hipX, 0.14, 0], r: [Math.PI / 2, 0, 0] });
  }
  // Rumpf: Bauch bei Riesen, sonst Tunika oder lange Robe
  if (belly) {
    A(sphere3(1, 12, 9), c.skin, { bone: BH.chest, p: [0, hipY + 0.24, 0.04], s: [0.42, 0.4, 0.36], shade: 0.2 });
    A(sphere3(1, 12, 9), lighter(c.skin, 0.12), { bone: BH.chest, p: [0, hipY + 0.17, 0.18], s: [0.3, 0.26, 0.22] });
    A(cyl3(0.4, 0.38, 0.2, 18), pants, { bone: BH.hips, p: [0, hipY + 0.02, 0.02] });
  } else {
    A(lathe3('torso', [[0, 0], [0.2, 0], [0.23, 0.1], [0.22, 0.26], [0.19, 0.38], [0.12, 0.44], [0, 0.45]], 16), c.torso, { bone: BH.chest, p: [0, hipY - 0.02, 0], s: [1, 1, 0.84], shade: 0.18 });
    if (c.robe) {
      A(lathe3('robe', [[0, 0], [0.3, 0], [0.31, 0.03], [0.27, 0.2], [0.22, 0.4], [0.2, 0.46], [0, 0.47]], 18), c.robe, { bone: BH.hips, p: [0, 0.02, 0], s: [1, 1, 0.86], shade: 0.25 });
      if (c.trim) A(torus3(0.3, 0.02, Math.PI * 2, 4, 16), c.trim, { bone: BH.hips, p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.86, 1] });
    } else {
      A(lathe3('skirt', [[0, 0], [0.27, 0], [0.28, 0.02], [0.24, 0.13], [0.21, 0.17], [0, 0.18]], 16), c.skirt || darker(c.torso, 0.1), { bone: BH.hips, p: [0, hipY - 0.17, 0], s: [1, 1, 0.84], shade: 0.2 });
    }
  }
  // Gürtel mit Schnalle
  if (c.belt) {
    A(torus3(belly ? 0.39 : 0.215, 0.03, Math.PI * 2, 5, 16), c.belt, { bone: BH.hips, p: [0, hipY + (belly ? 0.06 : 0.02), 0], r: [Math.PI / 2, 0, 0], s: [1, 0.86, 1] });
    A(roundBox(0.09, 0.07, 0.03, 0.015), c.buckle || '#c9a35a', { bone: BH.hips, p: [0, hipY + (belly ? 0.06 : 0.02), belly ? 0.34 : 0.19] });
    if (c.pouch) A(roundBox(0.09, 0.1, 0.06, 0.025), c.pouch, { bone: BH.hips, p: [0.14, hipY - 0.04, 0.14] });
  }
  if (c.chestPlate) A(roundBox(0.28, 0.2, 0.08, 0.04), c.chestPlate, { bone: BH.chest, p: [0, chestY + 0.06, 0.17], top: lighter(c.chestPlate, 0.25), topK: 0.3 });
  if (c.straps) A(roundBox(0.05, 0.5, 0.42, 0.02), c.straps, { bone: BH.chest, p: [0, chestY + 0.02, 0], r: [0, 0, 0.7] });
  if (c.necklace) for (let k = -2; k <= 2; k++) A(horn3(0.06, 0.018, 5), '#f4ecd8', { bone: BH.chest, p: [k * 0.05, shY - 0.04, 0.17 - Math.abs(k) * 0.02], r: [Math.PI, 0, 0] });
  if (c.runes) A(torus3(0.06, 0.012, Math.PI * 2, 4, 12), c.runes, { bone: BH.chest, p: [0, chestY + 0.06, 0.19], mat: 'glow' });
  if (c.cracks) for (const [x, y, r] of [[-0.12, 0.2, 0.6], [0.1, 0.12, -0.5], [0.02, 0.3, 0.2]]) A(roundBox(0.025, 0.16, 0.03, 0.01), c.cracks, { bone: BH.chest, p: [x, hipY + y, belly ? 0.38 : 0.2], r: [0, 0, r], mat: 'glow' });
  // Arme, Hände, Schulterpanzer
  for (const [sx, ab, hb] of [[1, BH.armL, BH.handL], [-1, BH.armR, BH.handR]]) {
    if (c.wideSleeves) {
      A(lathe3('sleeve', [[0.05, 0], [0.1, -0.08], [0.13, -0.26], [0.15, -0.3], [0, -0.31]], 12), c.sleeve || c.torso, { bone: ab, p: [sx * shX, shY, 0] });
    } else {
      A(limb3(armLen, armR, armR * 0.85, 8), c.sleeve || c.torso, { bone: ab, p: [sx * shX, shY, 0], shade: 0.12 });
    }
    A(sphere3(armR * 1.2, 10, 8), c.gloves || c.skin, { bone: hb, p: [sx * shX, shY - armLen - armR * 0.4, 0] });
    if (c.claws) for (let k = -1; k <= 1; k++) A(horn3(0.08, 0.018, 5), '#f4ecd8', { bone: hb, p: [sx * shX + k * 0.03, shY - armLen - armR * 1.2, 0.04], r: [Math.PI + 0.3, 0, 0] });
    if (c.pads) {
      A(sphere3(1, 12, 9), c.pads, { bone: BH.chest, p: [sx * shX * 1.02, shY + 0.03, 0], s: [belly ? 0.2 : 0.14, belly ? 0.13 : 0.1, belly ? 0.2 : 0.15], top: lighter(c.pads, 0.25), topK: 0.4 });
      if (c.padTrim) A(torus3(belly ? 0.17 : 0.12, 0.014, Math.PI * 2, 4, 16), c.padTrim, { bone: BH.chest, p: [sx * shX * 1.02, shY - 0.0, 0], r: [Math.PI / 2, 0, 0] });
      if (c.spikes) for (const dz of [-0.05, 0.05]) A(horn3(0.13, 0.035, 6), '#d9dde2', { bone: BH.chest, p: [sx * shX * 1.05, shY + 0.1, dz], r: [0, 0, -sx * 0.4] });
    }
  }
  // Kopf
  const hb = BH.head;
  A(sphere3(1, 16, 12), c.skin, { bone: hb, p: hc, s: [hr, hr * 0.94, hr * 0.96] });
  if (!c.noEars) for (const sx of [-1, 1]) {
    if (c.pointEars) A(horn3(hr * 0.5, hr * 0.13, 6), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.9, hc[1], hc[2]], r: [0, 0, -sx * 1.3] });
    else A(sphere3(hr * 0.17, 8, 6), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.96, hc[1] - hr * 0.05, hc[2]], s: [0.6, 1, 0.9] });
  }
  face3(A, hb, hc, hr, c);
  if (c.beard) A(sphere3(1, 12, 9), c.beard, { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + hr * 0.42], s: [hr * 0.62, hr * 0.5, hr * 0.42] });
  if (c.tusks) for (const sx of [-1, 1]) A(horn3(hr * 0.32, hr * 0.08, 6), '#f4ecd8', { bone: hb, p: [hc[0] + sx * hr * 0.3, hc[1] - hr * 0.55, hc[2] + hr * 0.75], r: [-0.2, 0, sx * 0.15] });
  if (c.hair) hair3(A, hb, hc, hr, c.hair.style, c.hair.color, !!c.covered);
  if (c.headgear) c.headgear(A, hb, hc, hr);
  // Umhang, Flügel, Schwanz
  if (c.cape) {
    A(roundBox(belly ? 0.7 : 0.48, 0.66, 0.035, 0.015), c.cape, { bone: BH.cape, p: [0, shY - 0.33, -0.24], shade: 0.25 });
    if (c.lining) A(roundBox(belly ? 0.66 : 0.44, 0.62, 0.02, 0.01), c.lining, { bone: BH.cape, p: [0, shY - 0.33, -0.215] });
  }
  if (c.scarf) A(roundBox(0.12, 0.62, 0.03, 0.015), c.scarf, { bone: BH.cape, p: [0.08, shY - 0.28, -0.24], r: [0, 0, 0.08] });
  if (c.quiver) {
    A(lathe3('quiver', [[0, 0], [0.07, 0], [0.08, 0.36], [0, 0.37]], 10), c.quiver, { bone: BH.chest, p: [0.1, chestY - 0.1, -0.2], r: [0, 0, -0.35] });
    for (const dx of [-0.03, 0.02]) A(limb3(0.12, 0.008, 0.008, 3), '#e8e0cc', { bone: BH.chest, p: [0.24 + dx, chestY + 0.38, -0.2], r: [0, 0, -0.35] });
  }
  if (c.wings) for (const [sx, bone] of [[1, BH.wingL], [-1, BH.wingR]]) {
    const wx = sx * 0.12;
    A(limb3(0.55, 0.035, 0.02, 6), darker(c.wings, 0.3), { bone, p: [wx, shY - 0.02, -0.18], r: [0, 0, sx * 2.1] });
    A(wingGeo(), c.wings, { bone, p: [wx, shY - 0.02, -0.2], s: [sx, 1, 1] });
  }
  if (c.tail) {
    A(limb3(0.6, 0.06, 0.03, 8), c.tail, { bone: BH.tail, p: [0, hipY + 0.04, -0.18], r: [-2.2, 0, 0] });
    A(horn3(0.14, 0.07, 4), darker(c.tail, 0.3), { bone: BH.tail, p: [0, hipY + 0.34, -0.66], r: [-0.6, 0, 0] });
  }
  // Waffen
  const handR = [-shX, shY - armLen - armR * 0.4, 0.02];
  const handL = [shX, shY - armLen - armR * 0.4, 0.02];
  if (c.weapon) weapon3(A, c.weapon.kind, c.weapon.tier, BH.handR, handR, WEAPON_HOLD[c.weapon.kind] || [1.1, 0, 0], true);
  if (c.offhand) {
    const h = WEAPON_HOLD[c.offhand.kind] || [1.1, 0, 0];
    weapon3(A, c.offhand.kind, c.offhand.tier, BH.handL, handL, [h[0], -h[1], -h[2]], false);
  }
  if (c.shield != null) shield3(A, c.shield, BH.handL, [shX + 0.1, shY - armLen * 0.6, 0.06]);
  let top = hc[1] + hr * (c.hair && c.hair.style === 1 ? 1.3 : 1.05);
  if (c.tall) top += c.tall;
  return { rig, height: top, family: 'human', shY, hipY };
}

// Haltung der Waffe in der Hand (Drehung des Griffs)
const WEAPON_HOLD = {
  sword: [0.45, 0, 0.5], greatsword: [0.35, 0, 0.42], dagger: [0.8, 0, 0.35], bow: [0.2, 0, 0], fan: [0.7, 0, 0.3],
  bell: [0.5, 0, 0], staff: [0.22, 0, 0.08], skullstaff: [0.22, 0, 0.08], scythe: [0.3, 0, 0.1], axe: [0.6, 0, 0.45], club: [0.6, 0, 0.45]
};

// --- Kopfbedeckungen der vier Klassen -------------------------------------------------------------

function kriegerHelm(L) {
  const A0 = ARMOR_LOOK.krieger;
  const steel = lookColor(A0.helm, L.h, '#8f98a3');
  const plume = lookColor(A0.crest, L.h, '#c8402f');
  const brass = lookColor(A0.trim, L.a, '#c9a35a');
  return (A, hb, hc, hr) => {
    A(cap3(hr * 1.1, Math.PI * 0.56), steel, { bone: hb, p: [hc[0], hc[1] + hr * 0.02, hc[2] - hr * 0.02], r: [-0.18, 0, 0], top: lighter(steel, 0.3), topK: 0.4 });
    A(torus3(hr * 1.05, hr * 0.07, Math.PI * 2, 5, 16), brass, { bone: hb, p: [hc[0], hc[1] + hr * 0.12, hc[2]], r: [Math.PI / 2 - 0.18, 0, 0] });
    for (const sx of [-1, 1]) A(roundBox(hr * 0.22, hr * 0.62, hr * 0.32, hr * 0.08), steel, { bone: hb, p: [hc[0] + sx * hr * 0.92, hc[1] - hr * 0.22, hc[2] + hr * 0.18] });
    A(geo3('plume', () => new THREE.SphereGeometry(1, 14, 10).scale(0.16, 0.24, 0.42)), plume, { bone: hb, p: [hc[0], hc[1] + hr * 1.12, hc[2] - hr * 0.2], s: hr / 0.34 });
    if (L.h >= 3 && L.h < 6) for (const sx of [-1, 1]) A(horn3(hr * 0.75, hr * 0.15, 8), '#e8dcc0', { bone: hb, p: [hc[0] + sx * hr * 0.75, hc[1] + hr * 0.45, hc[2]], r: [0, 0, -sx * 0.9] });
    if (L.h >= 6) for (const sx of [-1, 1]) A(roundBox(hr * 0.75, hr * 0.32, hr * 0.06, hr * 0.12), '#ffffff', { bone: hb, p: [hc[0] + sx * hr * 1.2, hc[1] + hr * 0.4, hc[2] - hr * 0.1], r: [0, 0, sx * 0.5], mat: L.h >= 7 ? 'glow' : 'lit' });
  };
}

function ninjaHood(L, scarf) {
  const hood = lookColor(ARMOR_LOOK.ninja.hood, L.h, '#2a2633');
  return (A, hb, hc, hr) => {
    A(cap3(hr * 1.1, Math.PI * 0.82, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02] });
    A(cap3(hr * 1.12, Math.PI * 0.42), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.08, hc[2]], r: [-0.05, 0, 0] });
    // Maske über Mund und Nase
    A(geo3('ninjamask', () => new THREE.SphereGeometry(1, 18, 8, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.55, Math.PI * 0.4)), scarf, { bone: hb, p: hc, s: hr * 1.06 });
    A(limb3(hr * 1.1, hr * 0.12, hr * 0.06, 8), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.1, hc[2] - hr * 1.0], r: [-0.9, 0, 0] });
    if (L.h >= 4) A(torus3(hr * 1.08, hr * 0.06, Math.PI * 2, 4, 16), lookColor(ARMOR_LOOK.ninja.scarf, L.h, scarf), { bone: hb, p: [hc[0], hc[1] + hr * 0.42, hc[2]], r: [Math.PI / 2 - 0.15, 0, 0] });
  };
}

function shamanBand(L, gold) {
  if (L.h === -2) return null;
  const band = lookColor(ARMOR_LOOK.schamane.band, L.h, gold);
  return (A, hb, hc, hr) => {
    A(torus3(hr * 1.06, hr * 0.07, Math.PI * 2, 5, 16), band, { bone: hb, p: [hc[0], hc[1] + hr * 0.4, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0] });
    A(sphere3(hr * 0.1, 8, 6), L.h >= 4 ? '#ffffff' : '#c8402f', { bone: hb, p: [hc[0], hc[1] + hr * 0.5, hc[2] + hr * 1.04], mat: L.h >= 4 ? 'glow' : 'lit' });
    A(geo3('feather', () => new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.3, 0.012)), '#e8dcc0', { bone: hb, p: [hc[0] + hr * 0.95, hc[1] + hr * 0.7, hc[2] - hr * 0.2], r: [0, 0, -0.5], s: hr / 0.34 });
    if (L.h >= 3) for (let k = -2; k <= 2; k++) A(horn3(hr * (0.3 + (L.h >= 5 ? 0.1 : 0)), hr * 0.08, 5), band, { bone: hb, p: [hc[0] + Math.sin(k * 0.45) * hr * 1.03, hc[1] + hr * 0.5, hc[2] + Math.cos(k * 0.45) * hr * 1.03], r: [0.2, 0, -k * 0.15] });
    if (L.h >= 6) A(torus3(hr * 0.7, hr * 0.05, Math.PI * 2, 4, 16), '#fff2b0', { bone: hb, p: [hc[0], hc[1] + hr * 1.5, hc[2]], r: [Math.PI / 2, 0, 0], mat: 'glow' });
  };
}

function nekroHood(L) {
  const hood = lookColor(ARMOR_LOOK.nekromant.hood, L.h, '#2a3b28');
  return (A, hb, hc, hr) => {
    A(cap3(hr * 1.14, Math.PI * 0.86, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02] });
    A(horn3(hr * 0.95, hr * 0.62, 12), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2] - hr * 0.25], r: [-0.45, 0, 0] });
    // dunkler Schatten im Gesicht
    A(sphere3(1, 12, 9), '#0d120c', { bone: hb, p: [hc[0], hc[1] + hr * 0.18, hc[2] + hr * 0.42], s: [hr * 0.78, hr * 0.5, hr * 0.52] });
    if (L.h >= 4) for (let k = -2; k <= 2; k++) A(horn3(hr * (0.42 - Math.abs(k) * 0.08), hr * 0.08, 5), '#ddd5bb', { bone: hb, p: [hc[0] + k * hr * 0.24, hc[1] + hr * 0.95, hc[2] + hr * 0.15] });
  };
}

// --- Spielerfiguren ---------------------------------------------------------------------------------

function playerKey3(p) {
  const eq = p.equipment || {};
  const t = (it) => (it ? it.tier + ':' + (it.kind || '') + ':' + plusBand(it.plus || 0) : '-');
  return [p.classId, JSON.stringify(p.look || {}), t(eq.waffe), t(eq.ruestung), t(eq.helm), t(eq.schild), t(eq.schuhe), t(eq.guertel), t(eq.schultern), t(eq.umhang), weaponKindOf(p)].join('|');
}

function playerConfig3(p) {
  const L = playerLook(p);
  const ap = lookOf(L, p.classId);
  const eq = p.equipment || {};
  const kind = weaponKindOf(p);
  const wtier = eq.waffe ? eq.waffe.tier : 0;
  const gt = (k) => (L[k] == null ? -1 : L[k]);
  const c = {
    skin: skinOf(ap), eyeColor: eyeOpts(ap).color, eyeShape: ap.eyes || 0, mark: ap.mark || 0,
    hair: { style: ap.hair || 0, color: hairOf(ap) },
    weapon: { kind, tier: wtier }, boots: gt('b') >= 0 ? GEAR_LOOK.boots[gt('b')] : '#4d3527',
    belt: gt('g') >= 0 ? GEAR_LOOK.belt[gt('g')] : '#3a2618'
  };
  if (gt('s') >= 0) {
    c.pads = GEAR_LOOK.plate[gt('s')];
    c.padTrim = TIER_METAL[gt('s')];
    c.spikes = gt('s') >= 3;
  }
  const capeT = eq.umhang ? eq.umhang.tier : -1;
  if (capeT >= 0) {
    c.cape = GEAR_LOOK.cape[capeT];
    c.lining = GEAR_LOOK.lining[capeT];
  }
  if (eq.schild) {
    if (isOffhand(eq.schild)) c.offhand = { kind: eq.schild.kind, tier: eq.schild.tier };
    else c.shield = eq.schild.tier;
  }
  if (kind === 'dagger' && !eq.schild) c.offhand = { kind: 'dagger', tier: wtier };
  if (p.classId === 'krieger') {
    const A0 = ARMOR_LOOK.krieger;
    const crimson = lookColor(A0.torso, L.a, '#9c3b33');
    const brass = lookColor(A0.trim, L.a, '#c9a35a');
    Object.assign(c, { torso: crimson, sleeve: darker(crimson, 0.18), skirt: darker(crimson, 0.1), pants: '#3b2d25', gloves: '#5a4030', buckle: brass });
    if (L.a >= 2) c.chestPlate = lighter(crimson, 0.15);
    if (!c.pads) { c.pads = crimson; c.padTrim = brass; c.spikes = L.a >= 4; }
    if (L.h !== -2) { c.headgear = kriegerHelm(L); c.covered = true; }
  } else if (p.classId === 'ninja') {
    const A0 = ARMOR_LOOK.ninja;
    const torso = lookColor(A0.torso, L.a, '#312c3d');
    const scarf = lookColor(A0.scarf, L.a, '#6b4f9a');
    Object.assign(c, { torso, sleeve: darker(torso, 0.1), skirt: darker(torso, 0.15), pants: darker(torso, 0.1), gloves: '#3d3848', scarf, straps: '#5a4030', eyeShape: 1, narrow: true, blush: false, noMouth: true });
    if (kind === 'bow') c.quiver = '#6b4a2e';
    c.headgear = ninjaHood(L, scarf);
    c.covered = true;
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
    if (L.h >= 6) c.glowEyes = '#9fe8ff';
  } else if (p.classId === 'schamane') {
    const A0 = ARMOR_LOOK.schamane;
    const robe = lookColor(A0.robe, L.a, '#2c6f6a');
    const gold = lookColor(A0.gold, L.a, '#e0c36a');
    Object.assign(c, { torso: robe, sleeve: robe, robe, trim: gold, wideSleeves: true, gloves: c.skin, buckle: gold });
    c.headgear = shamanBand(L, gold);
  } else {
    const A0 = ARMOR_LOOK.nekromant;
    const robe = lookColor(A0.robe, L.a, '#334a31');
    Object.assign(c, { torso: robe, sleeve: darker(robe, 0.12), robe, trim: 'rgba(0,0,0,0)', wideSleeves: true, gloves: c.skin, runes: '#a7e37f', blush: false });
    c.trim = darker(robe, 0.3);
    c.headgear = nekroHood(L);
    c.covered = true;
    c.glowEyes = lookColor(A0.glow, L.h, '#a7e37f');
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
  }
  return c;
}

// --- Vierbeiner (Hunde, Wölfe, Eber, Bären, Drachen) und Pferd -------------------------------------

function beast3(b, o, P) {
  const A = adder(b, P);
  const bulky = !!o.bulky;
  const legLen = bulky ? 0.32 : 0.38;
  const bodyY = legLen + 0.2;
  const len = o.long || 0.46;
  const fur = o.fur;
  const dark = darker(fur, 0.25);
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.12, len * 0.95], 1],
    [[0.16, legLen, len * 0.62], 1], [[-0.16, legLen, len * 0.62], 1], [[0.16, legLen, -len * 0.62], 1], [[-0.16, legLen, -len * 0.62], 1],
    [[0, bodyY + 0.08, -len * 0.95], 1], [[0.14, bodyY + 0.2, 0.05], 1], [[-0.14, bodyY + 0.2, 0.05], 1], [[0, bodyY + 0.1, len * 0.7], 1]
  ]);
  A(sphere3(1, 12, 9), fur, { bone: BQ.body, p: [0, bodyY, 0], s: [bulky ? 0.34 : 0.27, bulky ? 0.3 : 0.24, len], shade: 0.25 });
  A(sphere3(1, 12, 9), o.belly || lighter(fur, 0.2), { bone: BQ.body, p: [0, bodyY - 0.08, 0.06], s: [bulky ? 0.26 : 0.2, 0.15, len * 0.75] });
  if (o.ruff || o.mane) A(sphere3(1, 12, 9), o.mane || o.ruff, { bone: BQ.body, p: [0, bodyY + 0.06, len * 0.6], s: [bulky ? 0.33 : 0.27, 0.27, 0.24], mat: o.glowMane ? 'glow' : 'lit' });
  if (o.ridge) for (let k = 0; k < 5; k++) A(horn3(0.16, 0.05, 6), o.mane || dark, { bone: BQ.body, p: [0, bodyY + 0.22 - Math.abs(k - 1.5) * 0.02, len * (0.5 - k * 0.25)], r: [-0.35, 0, 0] });
  // Beine mit Pfoten
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    A(limb3(legLen, bulky ? 0.09 : 0.07, bulky ? 0.075 : 0.055, 8), sz > 0 ? fur : dark, { bone, p: [sx * 0.16, legLen, sz * len * 0.62], shade: 0.15 });
    A(sphere3(bulky ? 0.09 : 0.07, 10, 8), dark, { bone, p: [sx * 0.16, 0.05, sz * len * 0.62 + 0.03], s: [1, 0.7, 1.25] });
  }
  // Kopf
  const hp = [0, bodyY + 0.14, len * 0.95 + 0.08];
  A(sphere3(1, 12, 9), fur, { bone: BQ.head, p: hp, s: [0.21, 0.19, 0.2], shade: 0.15 });
  A(limb3(0.24, 0.1, 0.07, 8), o.snout || o.belly || lighter(fur, 0.15), { bone: BQ.head, p: [0, hp[1] - 0.05, hp[2] + 0.06], r: [-Math.PI / 2, 0, 0] });
  A(sphere3(0.045, 8, 6), '#1a1210', { bone: BQ.head, p: [0, hp[1] - 0.02, hp[2] + 0.3] });
  for (const sx of [-1, 1]) {
    if (!o.noEars) A(horn3(o.small ? 0.1 : 0.15, 0.06, 6), dark, { bone: BQ.head, p: [hp[0] + sx * 0.11, hp[1] + 0.14, hp[2] - 0.04], r: [-0.2, 0, -sx * 0.3] });
    const eye = o.eye || '#3a2a1a';
    if (o.glow) A(sphere3(1, 7, 5), eye, { bone: BQ.head, p: [hp[0] + sx * 0.1, hp[1] + 0.05, hp[2] + 0.16], s: [0.045, 0.04, 0.025], mat: 'glow' });
    else {
      A(sphere3(1, 7, 5), '#f4efe2', { bone: BQ.head, p: [hp[0] + sx * 0.1, hp[1] + 0.05, hp[2] + 0.15], s: [0.048, 0.05, 0.03] });
      A(sphere3(1, 7, 5), eye, { bone: BQ.head, p: [hp[0] + sx * 0.1, hp[1] + 0.05, hp[2] + 0.17], s: [0.032, 0.036, 0.02] });
    }
    if (o.angry) A(roundBox(0.09, 0.022, 0.03, 0.01), '#1a1210', { bone: BQ.head, p: [hp[0] + sx * 0.1, hp[1] + 0.11, hp[2] + 0.16], r: [0, 0, sx * 0.4] });
    if (o.fangs) A(horn3(0.07, 0.018, 5), '#f4ecd8', { bone: BQ.head, p: [hp[0] + sx * 0.04, hp[1] - 0.1, hp[2] + 0.26], r: [Math.PI, 0, 0] });
    if (o.tusk) A(horn3(0.14, 0.03, 6), '#f4ecd8', { bone: BQ.head, p: [hp[0] + sx * 0.08, hp[1] - 0.08, hp[2] + 0.2], r: [-0.6, 0, -sx * 0.4] });
    if (o.horns) A(horn3(0.32, 0.06, 8), o.horns, { bone: BQ.head, p: [hp[0] + sx * 0.1, hp[1] + 0.15, hp[2] - 0.05], r: [-0.9, 0, -sx * 0.35] });
  }
  if (o.scar) A(roundBox(0.02, 0.14, 0.02, 0.008), '#d8a0a0', { bone: BQ.head, p: [hp[0] + 0.08, hp[1] + 0.06, hp[2] + 0.18], r: [0, 0, 0.4] });
  if (o.tail !== false) {
    if (o.bushy) A(lathe3('bushytail', [[0, 0], [0.06, -0.05], [0.09, -0.2], [0.08, -0.36], [0.04, -0.46], [0, -0.48]], 10), lighter(fur, 0.08), { bone: BQ.tail, p: [0, bodyY + 0.08, -len * 0.95], r: [-2.3, 0, 0] });
    else A(limb3(0.36, 0.045, 0.02, 8), fur, { bone: BQ.tail, p: [0, bodyY + 0.08, -len * 0.95], r: [-2.1, 0, 0] });
  }
  if (o.wings) for (const [sx, bone] of [[1, BQ.wingL], [-1, BQ.wingR]]) {
    A(limb3(0.6, 0.04, 0.022, 6), darker(o.wings, 0.3), { bone, p: [sx * 0.14, bodyY + 0.2, 0.05], r: [0, 0, sx * 2.0] });
    A(wingGeo(), o.wings, { bone, p: [sx * 0.14, bodyY + 0.2, 0.0], s: [sx * 1.2, 1.2, 1.2] });
  }
  if (o.saddle) {
    A(roundBox(0.38, 0.08, 0.36, 0.04), o.saddle, { bone: BQ.body, p: [0, bodyY + 0.24, -0.02] });
    A(roundBox(0.42, 0.14, 0.04, 0.02), darker(o.saddle, 0.3), { bone: BQ.body, p: [0, bodyY + 0.2, 0.12] });
  }
  return { rig, height: bodyY + 0.36, family: 'beast', bodyY };
}

// Pferd: lange Beine, langer Hals, Mähne, Sattel (auch als Schmuck beim Stall)
function horseParts3(b, unused, o = {}) {
  const A = adder(b, o.parent || null);
  const coat = o.coat || '#8a5a34';
  const mane = o.mane || '#3a2618';
  const legLen = 0.62;
  const bodyY = legLen + 0.22;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.62, 0.78], 1],
    [[0.17, legLen + 0.05, 0.42], 1], [[-0.17, legLen + 0.05, 0.42], 1], [[0.17, legLen + 0.05, -0.42], 1], [[-0.17, legLen + 0.05, -0.42], 1],
    [[0, bodyY + 0.1, -0.62], 1], [[0, 0, 0], 1], [[0, 0, 0], 1], [[0, bodyY + 0.2, 0.5], 1]
  ]);
  A(sphere3(1, 12, 9), coat, { bone: BQ.body, p: [0, bodyY, 0], s: [0.3, 0.3, 0.62], shade: 0.25 });
  A(limb3(0.55, 0.15, 0.11, 8), coat, { bone: BQ.neck, p: [0, bodyY + 0.12, 0.5], r: [-0.65, 0, 0] });
  A(roundBox(0.06, 0.5, 0.12, 0.03), mane, { bone: BQ.neck, p: [0, bodyY + 0.42, 0.56], r: [0.65, 0, 0] });
  const hp = [0, bodyY + 0.62, 0.82];
  A(limb3(0.42, 0.11, 0.09, 8), coat, { bone: BQ.head, p: hp, r: [-1.95, 0, 0] });
  A(sphere3(0.1, 10, 8), lighter(coat, 0.2), { bone: BQ.head, p: [0, hp[1] - 0.14, hp[2] + 0.36] });
  for (const sx of [-1, 1]) {
    A(horn3(0.13, 0.04, 6), coat, { bone: BQ.head, p: [sx * 0.06, hp[1] + 0.08, hp[2] - 0.04] });
    A(sphere3(0.028, 8, 6), '#1a120c', { bone: BQ.head, p: [sx * 0.085, hp[1] - 0.02, hp[2] + 0.12] });
  }
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    A(limb3(legLen + 0.05, 0.075, 0.05, 8), coat, { bone, p: [sx * 0.17, legLen + 0.05, sz * 0.42] });
    A(cyl3(0.065, 0.075, 0.08, 10), '#2a1c14', { bone, p: [sx * 0.17, 0.04, sz * 0.42] });
  }
  A(lathe3('horsetail', [[0, 0], [0.07, -0.05], [0.08, -0.3], [0.04, -0.5], [0, -0.52]], 10), mane, { bone: BQ.tail, p: [0, bodyY + 0.1, -0.62], r: [-2.6, 0, 0] });
  if (o.saddle) {
    A(roundBox(0.42, 0.1, 0.4, 0.05), o.saddle, { bone: BQ.body, p: [0, bodyY + 0.3, -0.02] });
    A(roundBox(0.48, 0.24, 0.04, 0.02), darker(o.saddle, 0.3), { bone: BQ.body, p: [0, bodyY + 0.16, -0.02], r: [0, Math.PI / 2, 0] });
  }
  return { rig, height: bodyY + 0.9, family: 'horse', bodyY, seat: bodyY + 0.32 };
}

// --- Spinne, Skorpion, Geist, Schlange, Naga --------------------------------------------------------

function spider3(b, o) {
  const A = adder(b, null);
  const legC = darker(o.body, 0.25);
  const bodyY = 0.42;
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.02, 0.28], 1]];
  for (let k = 0; k < 8; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.22 - Math.floor(k / 2) * 0.12], 1]);
  const rig = rigOf(list);
  A(sphere3(1, 12, 9), o.body, { bone: 1, p: [0, bodyY + 0.08, -0.32], s: [0.36, 0.3, 0.42], shade: 0.25 });
  A(sphere3(1, 12, 10), o.mark, { bone: 1, p: [0, bodyY + 0.33, -0.34], s: [0.16, 0.06, 0.2] });
  A(sphere3(1, 12, 9), lighter(o.body, 0.08), { bone: 1, p: [0, bodyY, 0.12], s: [0.22, 0.18, 0.24] });
  for (let k = 0; k < 4; k++) A(sphere3(0.035, 8, 6), o.eye, { bone: 2, p: [(k - 1.5) * 0.06, bodyY + 0.08 + (k % 2) * 0.03, 0.34], mat: 'glow' });
  for (const sx of [-1, 1]) A(horn3(0.12, 0.03, 6), '#2a2018', { bone: 2, p: [sx * 0.05, bodyY - 0.06, 0.34], r: [Math.PI - 0.4, 0, 0] });
  for (let k = 0; k < 8; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.22 - row * 0.12;
    const spread = [0.75, 0.25, -0.25, -0.75][row];
    const knee = [sx * 0.5, bodyY + 0.24, z + spread * 0.42];
    const foot = [sx * 0.78, 0.02, z + spread * 0.82];
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.048, 0.04, legC, { bone: 3 + k, seg: 6 });
    limbBetween(A, knee, foot, 0.04, 0.02, legC, { bone: 3 + k, seg: 6 });
    A(sphere3(0.045, 7, 5), legC, { bone: 3 + k, p: knee });
  }
  return { rig, height: bodyY + 0.42, family: 'spider', bodyY };
}

function scorpion3(b, o) {
  const A = adder(b, null);
  const bodyY = 0.3;
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY, 0.32], 1], [[0, bodyY + 0.05, -0.3], 1]];
  for (let k = 0; k < 6; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.12 - Math.floor(k / 2) * 0.14], 1]);
  const rig = rigOf(list);
  A(sphere3(1, 16, 12), o.body, { bone: 1, p: [0, bodyY, 0], s: [0.28, 0.15, 0.4], shade: 0.25 });
  for (let k = 0; k < 5; k++) A(sphere3(1, 10, 7), k === 4 ? o.sting : lighter(o.body, 0.05 * k), { bone: 3, p: [0, bodyY + 0.12 + k * 0.17, -0.38 - Math.sin(k * 0.6) * 0.18 + k * 0.05], s: k === 4 ? [0.09, 0.12, 0.09] : [0.11, 0.1, 0.11], mat: k === 4 ? 'glow' : 'lit' });
  A(horn3(0.16, 0.04, 6), '#2a2018', { bone: 3, p: [0, bodyY + 0.8, -0.38], r: [2.6, 0, 0] });
  for (const sx of [-1, 1]) {
    A(limb3(0.3, 0.05, 0.04, 6), o.body, { bone: 2, p: [sx * 0.15, bodyY, 0.28], r: [-1.2, 0, -sx * 0.5] });
    A(sphere3(1, 10, 7), darker(o.body, 0.1), { bone: 2, p: [sx * 0.3, bodyY + 0.04, 0.58], s: [0.1, 0.07, 0.14] });
    A(sphere3(0.03, 8, 6), '#2a1a0a', { bone: 1, p: [sx * 0.07, bodyY + 0.1, 0.36] });
  }
  for (let k = 0; k < 6; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.12 - row * 0.14;
    const knee = [sx * 0.36, bodyY + 0.1, z + (1 - row) * 0.12];
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.035, 0.03, darker(o.body, 0.2), { bone: 4 + k, seg: 6 });
    limbBetween(A, knee, [sx * 0.52, 0.02, z + (1 - row) * 0.22], 0.03, 0.018, darker(o.body, 0.2), { bone: 4 + k, seg: 6 });
  }
  return { rig, height: bodyY + 0.9, family: 'scorpion', bodyY };
}

function ghost3(b, o) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.75, 0], 1], [[0, 1.0, 0], 2], [[0.26, 0.86, 0], 2], [[-0.26, 0.86, 0], 2]]);
  A(lathe3('ghost', [[0, 0.95], [0.3, 0.88], [0.36, 0.7], [0.34, 0.45], [0.27, 0.22], [0.2, 0.05], [0.08, 0.0], [0, 0]], 18), o.body, { bone: 1, p: [0, 0.1, 0], shade: 0.2, top: lighter(o.body, 0.25), topK: 0.4 });
  A(sphere3(1, 12, 9), o.body, { bone: 3, p: [0, 1.15, 0.02], s: [0.3, 0.28, 0.28], top: lighter(o.body, 0.3), topK: 0.4 });
  for (const sx of [-1, 1]) {
    A(sphere3(1, 7, 5), o.eye, { bone: 3, p: [sx * 0.11, 1.17, 0.25], s: [0.07, 0.09, 0.03], mat: 'glow' });
    A(limb3(0.36, 0.07, 0.04, 8), o.body, { bone: sx > 0 ? 4 : 5, p: [sx * 0.26, 0.86, 0], r: [0, 0, sx * 0.5] });
  }
  A(sphere3(1, 7, 5), '#0d1a2a', { bone: 3, p: [0, 1.02, 0.25], s: [0.07, 0.035, 0.02] });
  if (o.crown) for (let k = -2; k <= 2; k++) A(horn3(0.16 - Math.abs(k) * 0.03, 0.04, 6), o.crown, { bone: 3, p: [k * 0.09, 1.38, Math.cos(k * 0.5) * 0.06], mat: o.crown === '#ffffff' ? 'lit' : 'glow' });
  return { rig, height: 1.45, family: 'ghost', bodyY: 0.3 };
}

function serpent3(b, o, naga) {
  const A = adder(b, null);
  const segs = 7;
  const list = [[[0, 0, 0], -1]];
  for (let k = 0; k < segs; k++) list.push([[0, 0.12, 0.35 - k * 0.16], k === 0 ? 0 : k]);
  const rig = rigOf(list);
  for (let k = 0; k < segs; k++) {
    const r = 0.15 - k * 0.014;
    A(sphere3(1, 12, 9), k % 2 ? o.body : lighter(o.body, 0.06), { bone: 1 + k, p: [0, 0.12, 0.35 - k * 0.16], s: [r, r * 0.8, 0.14], shade: 0.25 });
    if (k % 2 === 0) A(sphere3(1, 8, 5), o.mark, { bone: 1 + k, p: [0, 0.12 + r * 0.72, 0.35 - k * 0.16], s: [r * 0.5, r * 0.18, 0.06] });
  }
  if (o.rattle) for (let k = 0; k < 3; k++) A(sphere3(0.05 - k * 0.008, 8, 6), '#e8d0a0', { bone: segs, p: [0, 0.14, 0.35 - (segs - 1) * 0.16 - 0.1 - k * 0.07] });
  if (naga) {
    // Oberkörper mit Rüstung, Kopf mit Haaren und Krone
    const nb = 1;
    A(lathe3('nagatorso', [[0, 0], [0.18, 0], [0.2, 0.15], [0.18, 0.32], [0.1, 0.38], [0, 0.39]], 14), o.skin, { bone: nb, p: [0, 0.2, 0.42], shade: 0.15 });
    A(roundBox(0.38, 0.2, 0.26, 0.07), o.armor, { bone: nb, p: [0, 0.42, 0.44], top: lighter(o.armor, 0.2), topK: 0.4 });
    A(torus3(0.17, 0.02, Math.PI * 2, 4, 16), o.trim, { bone: nb, p: [0, 0.34, 0.44], r: [Math.PI / 2, 0, 0] });
    const hc = [0, 0.86, 0.46];
    A(sphere3(1, 12, 9), o.skin, { bone: nb, p: hc, s: [0.24, 0.23, 0.23] });
    A(cap3(0.26, Math.PI * 0.55), o.hair, { bone: nb, p: [hc[0], hc[1] + 0.02, hc[2] - 0.03], r: [-0.4, 0, 0] });
    A(roundBox(0.38, 0.4, 0.12, 0.06), o.hair, { bone: nb, p: [0, 0.72, 0.28] });
    face3(A, nb, hc, 0.24, { eyeColor: o.eye, angry: true, skin: o.skin, blush: false });
    for (let k = -2; k <= 2; k++) A(horn3(0.12 - Math.abs(k) * 0.02, 0.025, 5), '#e8c84a', { bone: nb, p: [hc[0] + k * 0.06, hc[1] + 0.22, hc[2] + 0.04] });
    for (const sx of [-1, 1]) A(limb3(0.3, 0.05, 0.04, 8), o.skin, { bone: nb, p: [sx * 0.2, 0.55, 0.44], r: [-0.5, 0, sx * 0.3] });
    if (o.staff) {
      A(limb3(1.1, 0.025, 0.022, 6), '#5a3f2a', { bone: nb, p: [-0.3, 0.95, 0.6] });
      A(sphere3(0.07, 10, 8), o.staff, { bone: nb, p: [-0.3, 1.0, 0.6], mat: 'glow' });
    } else {
      A(limb3(1.0, 0.022, 0.02, 6), '#8a6a3a', { bone: nb, p: [-0.3, 0.9, 0.6], r: [0.3, 0, 0] });
      for (const dx of [-0.05, 0, 0.05]) A(horn3(0.12, 0.02, 5), '#d9dde2', { bone: nb, p: [-0.3 + dx, 0.9, 0.62] });
    }
    return { rig, height: 1.12, family: 'serpent', bodyY: 0.12, naga: true };
  }
  // Kopf der Schlange vorn oben
  const hb = 1;
  const hc = [0, 0.5, 0.48];
  A(limb3(0.36, 0.11, 0.13, 8), o.body, { bone: hb, p: [0, 0.48, 0.42], r: [0.15, 0, 0] });
  A(sphere3(1, 12, 9), o.body, { bone: hb, p: hc, s: [0.14, 0.11, 0.18] });
  A(sphere3(1, 7, 5), o.belly, { bone: hb, p: [0, hc[1] - 0.05, hc[2] + 0.05], s: [0.1, 0.06, 0.15] });
  for (const sx of [-1, 1]) A(sphere3(1, 7, 5), o.eye, { bone: hb, p: [sx * 0.08, hc[1] + 0.04, hc[2] + 0.1], s: [0.03, 0.035, 0.025], mat: 'glow' });
  if (o.hood) A(sphere3(1, 10, 7), o.hood, { bone: hb, p: [0, 0.38, 0.38], s: [0.3, 0.26, 0.05] });
  A(roundBox(0.02, 0.012, 0.12, 0.005), '#c8302a', { bone: hb, p: [0, hc[1] - 0.04, hc[2] + 0.22] });
  return { rig, height: 0.62, family: 'serpent', bodyY: 0.12 };
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
  armbrustschuetze: { hood: '#3e5530', mask: '#9a2f2a', quiver: '#6b4a2e' }, kellerwache: { helmet: '#7a828c' },
  banditenfuerst: { mask: '#9a2f2a', crown: '#c9a35a', hair: '#2a1c14' },
  ork: { tusks: true, ears: true, band: '#3e3226' }, orkschamane: { tusks: true, ears: true, feathers: ['#c9a35a', '#b33a2c', '#3a6a8a'] },
  orkhauptmann: { tusks: true, ears: true, helmet: '#c9a35a' }, orkelite: { tusks: true, ears: true, helmet: '#6e7680' },
  orkberserker: { tusks: true, ears: true, mohawk: '#8a2a1a' }, kriegsherr: { tusks: true, ears: true, helmet: '#c9a35a', horns: '#e0d6bc' },
  oger: { horn1: '#e0d6bc', tusks: true }, daemon: { horns: '#2a1416' }, feuerdaemon: { horns: '#1a0a0a' }, gargoyle: { horns: '#3a3a40', ears: true },
  minotaurus: { horns: '#e8dcc0', bigHorns: true, snout: '#9a6a4a' }, harpyie: { feathers: ['#8a6a9a', '#c8a8d8', '#6a4a7a'], hair: '#5a3a6a' },
  untoter: { bone: true }, grabwaechter: { bone: true, helmet: '#4a4454' }, gruftkoenig: { bone: true, crown: '#c9a35a' },
  sumpfhexe: { hat: '#2a3a24', hair: '#5a6a4a', nose: true }, yeti: { fur: true }, trollkrieger: { ears: true, tusks: true },
  lavagolem: { noFace: true }, steintitan: { noFace: true }, titanenkoenig: { noFace: true, crown: '#ffb04a' }, eisgolem: { noFace: true },
  donnerriese: { beard: '#bfe8ff' }, ghul: { ears: true }
};

function headExtras(h, skin) {
  if (!h) return null;
  return (A, hb, hc, hr) => {
    if (h.hood) A(cap3(hr * 1.12, Math.PI * 0.75, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0), h.hood, { bone: hb, p: hc });
    if (h.mask) A(geo3('banditmask', () => new THREE.SphereGeometry(1, 18, 8, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.56, Math.PI * 0.36)), h.mask, { bone: hb, p: hc, s: hr * 1.07 });
    if (h.helmet) {
      A(cap3(hr * 1.1, Math.PI * 0.5), h.helmet, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2]], r: [-0.12, 0, 0], top: lighter(h.helmet, 0.3), topK: 0.4 });
      A(torus3(hr * 1.06, hr * 0.06, Math.PI * 2, 4, 16), '#c9a35a', { bone: hb, p: [hc[0], hc[1] + hr * 0.08, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0] });
    }
    if (h.band) A(torus3(hr * 1.04, hr * 0.08, Math.PI * 2, 4, 16), h.band, { bone: hb, p: [hc[0], hc[1] + hr * 0.38, hc[2]], r: [Math.PI / 2 - 0.1, 0, 0] });
    if (h.crown) for (let k = -2; k <= 2; k++) A(horn3(hr * 0.42, hr * 0.1, 5), h.crown, { bone: hb, p: [hc[0] + Math.sin(k * 0.42) * hr * 0.9, hc[1] + hr * 0.68, hc[2] + Math.cos(k * 0.42) * hr * 0.45], mat: h.crown === '#ffb04a' ? 'glow' : 'lit' });
    if (h.horns) for (const sx of [-1, 1]) A(horn3(hr * (h.bigHorns ? 1.3 : 0.8), hr * (h.bigHorns ? 0.24 : 0.16), 8), h.horns, { bone: hb, p: [hc[0] + sx * hr * 0.62, hc[1] + hr * 0.62, hc[2]], r: [0, 0, -sx * (h.bigHorns ? 1.25 : 0.55)] });
    if (h.horn1) A(horn3(hr * 0.8, hr * 0.2, 8), h.horn1, { bone: hb, p: [hc[0], hc[1] + hr * 0.85, hc[2] + hr * 0.1], r: [0.2, 0, 0] });
    if (h.feathers) h.feathers.forEach((c, k) => A(geo3('feather', () => new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.3, 0.012)), c, { bone: hb, p: [hc[0] + (k - 1) * hr * 0.3, hc[1] + hr * 1.1, hc[2] - hr * 0.3], r: [-0.3, 0, (k - 1) * 0.35], s: hr / 0.34 }));
    if (h.mohawk) for (let k = 0; k < 5; k++) A(horn3(hr * 0.5, hr * 0.1, 5), h.mohawk, { bone: hb, p: [hc[0], hc[1] + hr * 0.85, hc[2] + hr * (0.4 - k * 0.25)], r: [-0.4 * (k - 2) * 0.3, 0, 0] });
    if (h.hat) {
      A(cyl3(hr * 1.6, hr * 1.6, hr * 0.06, 20), h.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2]] });
      A(horn3(hr * 1.4, hr * 0.75, 12), h.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2]], r: [-0.25, 0, 0.1] });
    }
    if (h.hair) A(cap3(hr * 1.07, Math.PI * 0.52), h.hair, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2] - hr * 0.04], r: [-0.32, 0, 0] });
    if (h.snout) A(sphere3(1, 10, 7), h.snout, { bone: hb, p: [hc[0], hc[1] - hr * 0.35, hc[2] + hr * 0.8], s: [hr * 0.5, hr * 0.35, hr * 0.38] });
    if (h.nose) A(horn3(hr * 0.4, hr * 0.09, 6), skin, { bone: hb, p: [hc[0], hc[1] - hr * 0.1, hc[2] + hr * 0.92], r: [1.7, 0, 0] });
    if (h.beard) A(sphere3(1, 10, 7), h.beard, { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + hr * 0.4], s: [hr * 0.7, hr * 0.6, hr * 0.45], mat: 'glow' });
  };
}

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

function buildMonster3(b, id) {
  const def = monsterModelDef(id);
  const t = MONSTER_TYPES[id];
  if (!def) return Object.assign(beast3(b, { fur: t.color }), { scale: 1 });
  const o = def.o;
  let res;
  switch (def.fn) {
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
      const h = HEAD3[id] || {};
      const c = {
        skin: o.skin || t.color, torso: o.torso || o.robe || o.skin || t.color, sleeve: o.sleeve, pants: o.pants, boots: o.boots, gloves: o.gloves,
        belt: o.belt, pouch: o.pouch, straps: o.straps, robe: o.robe, wideSleeves: o.wideSleeves, belly: o.belly, pads: o.pauldron, spikes: o.spikes,
        cape: o.cape, wings: o.wings, tail: o.tail ? o.skin : null, claws: o.claws, cracks: o.cracks, runes: o.runes, necklace: o.necklace,
        weapon: o.weapon ? { kind: o.weapon, tier: 2 } : null, eyeColor: h.bone ? '#a774e0' : '#c8302a', angry: true, blush: false,
        tusks: h.tusks, pointEars: h.ears, quiver: h.quiver, covered: !!(h.hood || h.helmet || h.hat), noEars: !!h.hood
      };
      if (h.noFace) Object.assign(c, { glowEyes: o.cracks || '#ffb04a', noMouth: true, noNose: true, noEars: true });
      if (h.bone) c.glowEyes = o.runes || '#a774e0';
      c.headgear = headExtras(h, c.skin);
      res = humanoid3(b, c);
    }
  }
  res.scale = def.scale * (t.boss ? 1 : 1);
  return res;
}

// --- Bewohner -----------------------------------------------------------------------------------------

const NPC3 = {
  haendler: { skin: '#ecc9a5', robe: '#6d3f7d', torso: '#6d3f7d', trim: '#e0c36a', wideSleeves: true, hair: { style: 1, color: '#7a4a2a' }, apron: '#efe6cc', belt: '#c9a35a' },
  schmied: { skin: '#d9a982', torso: '#a8907a', sleeve: '#d9a982', pants: '#3b2d25', boots: '#2f2419', hair: { style: 5, color: '#2a1e18' }, beard: '#7a4a2a', apron: '#6b4a2e', weapon: { kind: 'club', tier: 0 } },
  waffen: { skin: '#d9a982', torso: '#9a3a2a', sleeve: '#d9a982', pants: '#3b2d25', boots: '#2f2419', hair: { style: 0, color: '#2a1c14' }, band: '#c8402f', weapon: { kind: 'sword', tier: 2 }, belt: '#5a4030' },
  ruestung: { skin: '#ecc9a5', torso: '#6b4a2e', pants: '#3a2c24', boots: '#2f2419', hair: { style: 4, color: '#3a2418' }, shield: 2, belt: '#c9a35a' }
};

function npcModelDef(id) {
  if (NPC3[id]) return Object.assign({}, NPC3[id]);
  const draw = NPC_ART[id];
  if (!draw) return null;
  const rec = captureArt(draw);
  const call = rec.calls.find((c) => c.fn === 'villagerArt');
  if (!call) return null;
  const o = call.o;
  const c = { skin: o.skin, torso: o.torso || o.robe, sleeve: o.sleeve, pants: o.pants, boots: o.boots, gloves: o.gloves, robe: o.robe, trim: o.cuff, wideSleeves: o.wideSleeves, belt: o.belt, scale: o.scale || 1 };
  const extra = {
    stallmeister: { hat: '#c8a060', hair: { style: 0, color: '#3a2418' } },
    aeltester: { beard: '#f4f0e8', hair: { style: 1, color: '#f4f0e8' }, weapon: { kind: 'staff', tier: 2 } },
    jaegerin: { hair: { style: 4, color: '#7a3a1a' }, band: '#3e6a3a', weapon: { kind: 'bow', tier: 0 }, quiver: '#6b4a2e' },
    teleport: { hair: { style: 2, color: '#1a1a2a' } },
    alchemist: { hat: '#3a2a4a', hair: { style: 0, color: '#2a2a2a' }, beard: '#2a2a2a' },
    wache: { helm: '#7a828c', weapon: { kind: 'staff', tier: 0 }, belt: '#c9a35a' },
    bauer: { hat: '#d8b86a', hatCone: true, hair: { style: 0, color: '#4a3020' } },
    kind: { hair: { style: 1, color: '#2a1c14' } },
    alte: { hair: { style: 1, color: '#d8d0c8' } },
    moench: { hair: { style: 5, color: '#000' } }
  }[id] || {};
  return Object.assign(c, extra);
}

function buildNpc3(b, id) {
  const c = npcModelDef(id);
  if (!c) return null;
  const hats = [];
  if (c.hat) hats.push((A, hb, hc, hr) => {
    if (c.hatCone) A(horn3(hr * 0.8, hr * 1.7, 14), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.45, hc[2]], s: [1, 1, 1] });
    else {
      A(cyl3(hr * 1.55, hr * 1.55, hr * 0.06, 22), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.6, hc[2]] });
      A(cap3(hr * 0.9, Math.PI * 0.5), c.hat, { bone: hb, p: [hc[0], hc[1] + hr * 0.6, hc[2]] });
    }
  });
  if (c.band) hats.push((A, hb, hc, hr) => A(torus3(hr * 1.05, hr * 0.07, Math.PI * 2, 4, 16), c.band, { bone: hb, p: [hc[0], hc[1] + hr * 0.42, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0] }));
  if (c.helm) hats.push((A, hb, hc, hr) => {
    A(cap3(hr * 1.1, Math.PI * 0.52), c.helm, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2]], r: [-0.12, 0, 0], top: lighter(c.helm, 0.3), topK: 0.4 });
    A(sphere3(hr * 0.12, 8, 6), '#c8402f', { bone: hb, p: [hc[0], hc[1] + hr * 1.12, hc[2]] });
  });
  if (c.apron) hats.push((A) => A(roundBox(0.3, 0.42, 0.04, 0.02), c.apron, { bone: BH.hips, p: [0, 0.48, 0.2] }));
  c.headgear = (A, hb, hc, hr) => hats.forEach((f) => f(A, hb, hc, hr));
  c.covered = !!(c.helm || (c.hat && !c.hatCone));
  c.blush = id === 'kind' || id === 'jaegerin' || id === 'teleport' || id === 'haendler';
  const res = humanoid3(b, c);
  res.scale = c.scale || 1;
  return res;
}

// Portale: Dungeon-Eingang (Felsbogen mit Schleier), Ausgang (Lichtkreis), Weltentor (Steinring)
function buildPortal3(b, id, color) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1]]);
  if (id === 'weltentor') {
    A(lathe3('gatebase', [[0.85, 0], [0.85, 0.1], [0.7, 0.16], [0, 0.16]], 22), '#6e685e', {});
    A(geo3('gatering', () => new THREE.TorusGeometry(0.62, 0.12, 10, 32)), '#8a8478', { p: [0, 0.92, 0], top: '#b0a898', topK: 0.4 });
    A(new THREE.CircleGeometry(0.52, 28), '#7ab8ff', { p: [0, 0.92, 0], mat: 'aura' });
    A(new THREE.CircleGeometry(0.3, 20), '#e8f6ff', { p: [0, 0.92, 0.01], mat: 'aura' });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      A(sphere3(0.07, 8, 6), '#c9a35a', { p: [Math.cos(a) * 0.62, 0.92 + Math.sin(a) * 0.62, 0.1] });
    }
    return { rig, height: 1.7, family: 'portal' };
  }
  if (id === 'eingang') {
    A(geo3('cavearch', () => new THREE.TorusGeometry(0.62, 0.22, 10, 22, Math.PI)), '#6a625a', { p: [0, 0.35, 0], shade: 0.2 });
    for (const sx of [-1, 1]) A(roundBox(0.42, 0.5, 0.42, 0.14), '#6a625a', { p: [sx * 0.62, 0.25, 0] });
    for (const [x, y, s] of [[-0.7, 0.9, 0.2], [0.6, 1.0, 0.24], [0, 1.05, 0.18]]) A(sphere3(s, 10, 8), '#7e766c', { p: [x, y, 0.05] });
    A(new THREE.CircleGeometry(0.52, 22, 0, Math.PI), color, { p: [0, 0.35, 0.02], mat: 'aura' });
    A(roundBox(1.0, 0.36, 0.06, 0.03), color, { p: [0, 0.18, 0.02], mat: 'aura' });
    return { rig, height: 1.3, family: 'portal' };
  }
  // Ausgang: leuchtender Kreis mit vier Steinen
  A(new THREE.CircleGeometry(0.48, 24).rotateX(-Math.PI / 2), color, { p: [0, 0.04, 0], mat: 'aura' });
  A(new THREE.CircleGeometry(0.28, 20).rotateX(-Math.PI / 2), '#e8f6ff', { p: [0, 0.05, 0], mat: 'aura' });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    A(roundBox(0.14, 0.26, 0.14, 0.05), '#7e766c', { p: [Math.cos(a) * 0.55, 0.13, Math.sin(a) * 0.55] });
  }
  return { rig, height: 0.6, family: 'portal' };
}

// Riss: zerklüfteter, leuchtender Spalt in der Luft
function buildRift3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.9, 0], 0]]);
  for (let k = 0; k < 7; k++) {
    const y = 0.25 + k * 0.17;
    A(roundBox(0.1 + Math.sin(k * 1.7) * 0.05 + 0.08, 0.2, 0.05, 0.03), k % 2 ? '#d8a0ff' : '#9a5aff', { bone: 1, p: [Math.sin(k * 2.1) * 0.12, y, 0], r: [0, 0, Math.sin(k) * 0.5], mat: 'glow' });
  }
  A(geo3('riftaura', () => new THREE.SphereGeometry(1, 16, 12).scale(0.45, 0.8, 0.12)), '#7a3aff', { bone: 1, p: [0, 0.85, 0], mat: 'aura' });
  return { rig, height: 1.5, family: 'rift' };
}

// Seelenstein: Grundform, hellere Spitze, leuchtende Runen
function buildStone3(b, st) {
  const A = adder(b, null);
  const L = st.look;
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0, 0], 0]]);
  const rune = (x, y, z, h, r = 0) => A(roundBox(0.05, h, 0.04, 0.015), L.rune, { bone: 1, p: [x, y, z], r: [0, 0, r], mat: 'glow' });
  A(lathe3('stonebase', [[0.6, 0], [0.62, 0.06], [0.5, 0.14], [0, 0.15]], 16), darker(L.base, 0.2), { bone: 1 });
  let h = 1.6;
  switch (L.shape) {
    case 'spire':
      A(lathe3('spire', [[0.34, 0], [0.32, 0.4], [0.24, 1.0], [0.1, 1.5], [0, 1.7]], 7), L.base, { bone: 1, top: L.top, topK: 0.5, shade: 0.2 });
      rune(0, 0.7, 0.28, 0.5);
      h = 1.7;
      break;
    case 'obelisk':
      A(roundBox(0.5, 1.5, 0.5, 0.08), L.base, { bone: 1, p: [0, 0.8, 0], shade: 0.2 });
      A(horn3(0.35, 0.36, 4), L.top, { bone: 1, p: [0, 1.55, 0], r: [0, Math.PI / 4, 0] });
      rune(0, 0.9, 0.26, 0.7);
      rune(0, 0.9, -0.26, 0.7);
      h = 1.9;
      break;
    case 'cluster':
      for (const [x, z, s, r] of [[0, 0, 1.3, 0], [0.32, 0.1, 0.9, 0.35], [-0.3, 0.05, 0.85, -0.4], [0.05, -0.28, 0.75, 0.2]]) A(lathe3('crystal', [[0.16, 0], [0.18, 0.6], [0.1, 0.85], [0, 0.95]], 6), L.base, { bone: 1, p: [x, 0.05, z], s: [s, s, s], r: [r * 0.4, 0, r], top: L.top, topK: 0.7 });
      rune(0, 0.6, 0.22, 0.4);
      h = 1.3;
      break;
    case 'boulder':
      A(rockGeo(2), L.base, { bone: 1, p: [0, 0.55, 0], s: [0.75, 0.75, 0.65], top: L.top, topK: 0.5, shade: 0.2 });
      rune(-0.15, 0.7, 0.45, 0.4, 0.3);
      rune(0.18, 0.6, 0.45, 0.35, -0.3);
      h = 1.2;
      break;
    case 'twin':
      for (const sx of [-1, 1]) {
        A(lathe3('twin', [[0.22, 0], [0.22, 0.8], [0.14, 1.25], [0, 1.4]], 8), L.base, { bone: 1, p: [sx * 0.28, 0.1, 0], r: [0, 0, -sx * 0.1], top: L.top, topK: 0.5 });
        rune(sx * 0.28, 0.75, 0.2, 0.4);
      }
      h = 1.6;
      break;
    default:
      A(roundBox(0.9, 1.6, 0.4, 0.12), L.base, { bone: 1, p: [0, 0.85, 0], top: L.top, topK: 0.5, shade: 0.2 });
      for (const x of [-0.2, 0.2]) rune(x, 0.95, 0.21, 0.8);
      h = 1.7;
  }
  if (L.thorns) for (let k = 0; k < 6; k++) A(horn3(0.3, 0.06, 6), '#3a2a1a', { bone: 1, p: [Math.cos(k) * 0.42, 0.25 + (k % 3) * 0.2, Math.sin(k) * 0.42], r: [Math.sin(k) * 0.8, 0, -Math.cos(k) * 0.8] });
  if (L.lava) A(torus3(0.42, 0.04, Math.PI * 2, 4, 16), '#ff7a2a', { bone: 1, p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
  if (L.ice) for (let k = 0; k < 4; k++) A(lathe3('icespike', [[0.08, 0], [0.06, 0.3], [0, 0.42]], 5), '#e8f6ff', { bone: 1, p: [Math.cos(k * 1.6) * 0.5, 0.05, Math.sin(k * 1.6) * 0.5], r: [0, 0, Math.cos(k * 1.6) * -0.4] });
  if (L.crystal) A(lathe3('crystal', [[0.16, 0], [0.18, 0.6], [0.1, 0.85], [0, 0.95]], 6), '#ff8a9a', { bone: 1, p: [0, h - 0.2, 0], s: 0.6, mat: 'glow' });
  A(new THREE.CircleGeometry(0.95, 28).rotateX(-Math.PI / 2), L.glow, { bone: 1, p: [0, 0.03, 0], mat: 'aura' });
  return { rig, height: h, family: 'stone' };
}

// Beschworene Skelette
function buildSkeleton3(b) {
  const bone = '#ddd5bb';
  const res = humanoid3(b, {
    skin: bone, torso: '#4a4434', sleeve: bone, pants: '#3a3428', boots: '#2a241c', gloves: bone, belt: '#3a2a1c',
    weapon: { kind: 'sword', tier: 1 }, glowEyes: '#a7e37f', noMouth: true, noNose: true, noEars: true, blush: false
  });
  res.scale = 0.9;
  return res;
}

// --- Modelle bauen, zwischenspeichern und als Figuren aufstellen ---------------------------------------

const MODELS3 = new Map();
function model3(key, build) {
  let m = MODELS3.get(key);
  if (m) return m;
  const b = new Bake3(true);
  const info = build(b);
  if (!info) return null;
  m = Object.assign({ geos: b.build() }, info);
  m.scale = m.scale || 1;
  for (const k in m.geos) m.geos[k].shared = true;
  MODELS3.set(key, m);
  // Spielerfiguren mit alter Ausrüstung nicht ewig behalten
  if (MODELS3.size > 220) {
    const first = MODELS3.keys().next().value;
    const old = MODELS3.get(first);
    for (const k in old.geos) old.geos[k].dispose();
    MODELS3.delete(first);
  }
  return m;
}

// Eine Figur aus einem Modell: eigenes Skelett, eigene Materialien (für Aufblitzen und Durchsicht)
function makeActor(model) {
  const group = new THREE.Group();
  const bones = model.rig.map((r) => new THREE.Bone());
  model.rig.forEach((r, i) => {
    const pp = r.parent >= 0 ? model.rig[r.parent].pos : [0, 0, 0];
    bones[i].position.set(r.pos[0] - pp[0], r.pos[1] - pp[1], r.pos[2] - pp[2]);
    if (r.parent >= 0) bones[r.parent].add(bones[i]);
  });
  group.add(bones[0]);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const a = { group, bones, model, mats: {}, meshes: {} };
  const add = (key, geo, mat) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton);
    m.frustumCulled = false;
    group.add(m);
    a.meshes[key] = m;
    return m;
  };
  if (model.geos.lit) {
    a.mats.lit = figLitMat();
    const lit = add('lit', model.geos.lit, a.mats.lit);
    lit.castShadow = true;
    lit.receiveShadow = true;
    add('outline', model.geos.lit, figOutline());
  }
  if (model.geos.glow) {
    a.mats.glow = figGlow().clone();
    add('glow', model.geos.glow, a.mats.glow);
  }
  if (model.geos.aura) add('aura', model.geos.aura, figAura());
  if (model.geos.wglow) {
    a.mats.wglow = figWeaponGlowMat();
    add('wglow', model.geos.wglow, a.mats.wglow);
  }
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

// --- Figuren mit dem Spielgeschehen abgleichen ----------------------------------------------------------

const actors3 = new Map();
let targetRing3 = null;

function dropActor(key, a) {
  V3.actors.remove(a.group);
  for (const k in a.mats) a.mats[k].dispose();
  if (a.aura) a.aura.material.dispose();
  actors3.delete(key);
}

function actorFor(key, modelKey, build) {
  let a = actors3.get(key);
  if (a && a.modelKey !== modelKey) {
    dropActor(key, a);
    a = null;
  }
  if (!a) {
    const model = model3(modelKey, build);
    if (!model) return null;
    a = makeActor(model);
    a.modelKey = modelKey;
    a.heading = 0;
    a.lastX = null;
    a.lastY = null;
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
  return a.model.height * a.group.scale.x + (e.riding ? 0.62 : 0) + (a.lift || 0);
}

function turnToward(a, target, k) {
  let d = target - a.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  a.heading += d * k;
}

const _sw = { x: 0, y: 0 };
function v3SyncActors(dt) {
  for (const a of actors3.values()) a.seen = false;
  const w = game.world;
  // nur, was im Bild ist (die Kamera schaut nach Norden: oben sieht man weiter)
  const r = renderer;
  const halfW = r.w / r.zoom * 0.62 + 64;
  const near = (e) => Math.abs(e.x - V3.focus.x) < halfW && e.y - V3.focus.y > -r.h / r.zoom * 0.95 - 96 && e.y - V3.focus.y < r.h / r.zoom * 0.62 + 64;
  const p = game.player;
  if (game.player && game.running && !p.dead) syncPlayer3(p, dt);
  if (V3.extra) for (const ep of V3.extra) syncPlayer3(ep, dt);
  for (const rp of net.players.values()) if (!rp.dead && near(rp)) syncPlayer3(rp, dt);
  for (const m of game.monsters) if (!m.dead && near(m)) syncMonster3(m, dt);
  for (const al of game.allies) if (near(al)) syncAlly3(al, dt);
  if (w) for (const n of w.npcs) if (near(n)) syncNpc3(n, dt);
  for (const e of game.effects) if (e.type === 'corpse' && near(e)) syncCorpse3(e);
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
  for (const [k, a] of actors3) if (!a.seen) dropActor(k, a);
}

function placeActor(a, e, fy, y = 0) {
  a.group.position.set(e.x * U3, y, fy * U3);
}

function resetBones(a) {
  a.bones.forEach((b, i) => {
    b.rotation.set(0, 0, 0);
    b.position.copy(a.rest[i]);
    b.scale.set(1, 1, 1);
  });
  // Köpfe leicht zur Kamera geneigt, damit man die Gesichter sieht
  if (a.model.family === 'human') a.bones[BH.head].rotation.x = -0.24;
}

// Spieler: Laufen, Schlagen, Zaubern, Pose, Wirbel, Sprung, Reiten, Treffer, Aufleuchten
function syncPlayer3(p, dt) {
  const key = playerKey3(p);
  const a = actorFor(entityKey(p), 'p:' + key, (b) => {
    const r = humanoid3(b, playerConfig3(p));
    r.blob = 0.42;
    return r;
  });
  if (!a) return;
  const fy = feetY(p);
  const B = a.bones;
  resetBones(a);
  const t = game.time;
  // Blickrichtung (beim Wirbel dreht sich die Figur)
  const f = p.facing || { x: 0, y: 1 };
  if (p.spin > 0) a.heading += dt * 28;
  else turnToward(a, Math.atan2(f.x, f.y), Math.min(1, dt * 16));
  // Sprung
  let lift = 0;
  if (p.leap) {
    const lk = (game.time - p.leap.start) / p.leap.dur;
    if (lk >= 1) p.leap = null;
    else lift = Math.sin(lk * Math.PI) * p.leap.h * U3;
  }
  const kind = weaponKindOf(p);
  const sw = swingProgress(p);
  const posing = p.swingKind === 'pose' && p.swing > 0 && !p.riding;
  if (posing) lift += Math.sin(Math.min(1, (1 - p.swing / (p.swingDur || 0.7)) * 1.6) * Math.PI) * 0.18;
  // Reiten: Pferd darunter, Reiter sitzt im Sattel
  let ride = 0;
  if (p.riding) {
    const h = actorFor(entityKey(p) + 'h', 'horse:' + CLASSES[p.classId].trim, (b) => Object.assign(horseParts3(b, null, { saddle: CLASSES[p.classId].trim }), { blob: 0.7, scale: 1.25 }));
    if (h) {
      resetBones(h);
      h.group.position.set(p.x * U3, 0, fy * U3);
      h.group.rotation.y = a.heading;
      const gal = p.moving ? t * 12 : 0;
      if (p.moving) {
        h.bones[BQ.legFL].rotation.x = Math.sin(gal) * 0.7;
        h.bones[BQ.legFR].rotation.x = Math.sin(gal + 0.6) * 0.7;
        h.bones[BQ.legBL].rotation.x = -Math.sin(gal + 0.3) * 0.7;
        h.bones[BQ.legBR].rotation.x = -Math.sin(gal + 0.9) * 0.7;
        h.bones[BQ.body].position.y += Math.abs(Math.sin(gal)) * 0.05;
      }
      h.bones[BQ.tail].rotation.y = Math.sin(t * 3) * 0.2;
      ride = h.model.seat * h.model.scale - a.model.hipY * a.model.scale + 0.05 + (p.moving ? Math.abs(Math.sin(gal)) * 0.05 : 0);
      B[BH.legL].rotation.set(-1.2, 0, 0.5);
      B[BH.legR].rotation.set(-1.2, 0, -0.5);
    }
  }
  a.lift = lift;
  placeActor(a, p, fy, lift + ride);
  a.group.rotation.y = a.heading;
  // Gehen und Atmen
  if (p.moving && !p.riding) {
    const w = t * 11;
    B[BH.legL].rotation.x = Math.sin(w) * 0.65;
    B[BH.legR].rotation.x = -Math.sin(w) * 0.65;
    B[BH.armL].rotation.x = -Math.sin(w) * 0.5;
    B[BH.armR].rotation.x = Math.sin(w) * 0.5;
    B[BH.hips].position.y += Math.abs(Math.cos(w)) * 0.035;
    B[BH.chest].rotation.x = 0.08;
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
  if (posing) {
    const k = Math.sin(Math.min(1, (1 - p.swing / (p.swingDur || 0.7)) * 1.4) * Math.PI);
    B[BH.armL].rotation.set(-2.7 * k, 0, 0.3 * k);
    B[BH.armR].rotation.set(-2.7 * k, 0, -0.3 * k);
    B[BH.head].rotation.x += -0.3 * k;
  } else if (sw >= 0) {
    const e = easeOut(sw);
    if (kind === 'bow') {
      B[BH.armR].rotation.set(-1.5, 0.2, 0);
      B[BH.armL].rotation.set(-1.45, -0.6 + Math.sin(sw * Math.PI) * 0.3, 0);
      B[BH.chest].rotation.y = 0.35;
    } else if (kind === 'staff' || kind === 'bell' || kind === 'fan' && p.swingKind === 'cast') {
      const k = Math.sin(sw * Math.PI);
      B[BH.armR].rotation.set(-0.6 - k * 1.8, 0, 0);
      B[BH.armL].rotation.set(-0.4 - k * 1.2, 0, 0.3);
      B[BH.chest].rotation.x = -0.15 * k;
    } else if (p.swingKind === 'combo' && p.combo === 2) {
      // Stich nach vorn mit Ausfallschritt
      const k = Math.sin(sw * Math.PI);
      B[BH.armR].rotation.set(-1.55, 0, 0);
      B[BH.chest].rotation.y = -0.4 * k;
      B[BH.hips].position.z += k * 0.18;
      B[BH.legR].rotation.x = -0.5 * k;
      B[BH.legL].rotation.x = 0.4 * k;
    } else if (p.swingKind === 'combo' && p.combo === 1 || p.swingKind === 'skill') {
      // waagerechter Schwung
      B[BH.armR].rotation.set(-1.45, 0, 0);
      B[BH.chest].rotation.y = 1.1 - e * 2.3;
      B[BH.hips].rotation.y = 0.3 - e * 0.6;
    } else {
      // Schlag von oben
      const raise = sw < 0.3 ? sw / 0.3 : 1 - (sw - 0.3) / 0.7;
      B[BH.armR].rotation.set(sw < 0.3 ? -2.7 * raise : -2.7 + (sw - 0.3) / 0.7 * 2.4, 0, -0.2);
      B[BH.chest].rotation.y = 0.3 - e * 0.6;
      B[BH.chest].rotation.x = sw < 0.3 ? -0.1 : 0.15;
      if (kind === 'greatsword' || kind === 'scythe') B[BH.armL].rotation.set(B[BH.armR].rotation.x * 0.8, 0, 0.5);
    }
    if (kind === 'dagger' && !(p.equipment && p.equipment.schild && !isOffhand(p.equipment.schild))) B[BH.armL].rotation.set(sw < 0.5 ? -1.2 : -2.0 + sw, 0, 0.2);
  } else if (!p.moving && !p.riding) {
    // Ruhehaltung mit der Waffe
    if (kind === 'greatsword' || kind === 'scythe') B[BH.armL].rotation.set(-0.5, 0, 0.35);
    if (kind === 'bow') B[BH.armR].rotation.set(-0.3, 0, 0);
  }
  // Treffer: kurz nach hinten zucken, rot aufblitzen
  const hurtK = p.hurtAt ? (game.time - p.hurtAt) / 0.28 : 1;
  if (hurtK < 1 && !p.riding) B[BH.chest].rotation.x -= Math.sin(hurtK * Math.PI) * 0.3;
  const mat = a.mats.lit;
  const glowUp = p.glowUntil > game.time ? (p.glowUntil - game.time) / 1.5 : 0;
  if (hurtK < 1) mat.emissive.setRGB(0.6 * (1 - hurtK), 0.05, 0.02);
  else if (glowUp > 0) mat.emissive.setRGB(0.55 * glowUp, 0.5 * glowUp, 0.35 * glowUp);
  else if (posing) mat.emissive.set(p.poseColor || CLASSES[p.classId].trim).multiplyScalar(0.35 * Math.sin((1 - p.swing / (p.swingDur || 0.7)) * Math.PI));
  else mat.emissive.setRGB(0, 0, 0);
  // Durchsichtig, wenn unsichtbar
  const inv = (p === game.player && game.stats && game.stats.invisible) || (p.remote && p.invisible);
  setActorAlpha(a, inv ? 0.35 : 1);
  // Leuchtende Waffe: Plus-Stufe oder Waffenaura-Buff
  const wg = a.mats.wglow;
  if (wg) {
    const weapon = p.equipment && p.equipment.waffe;
    const band = weapon ? plusBand(weapon.plus) : 0;
    const aura = p.buffs && p.buffs.find((bf) => SKILL_FX[bf.id] && SKILL_FX[bf.id].weaponGlow);
    if (aura) {
      wg.color.set(SKILL_FX[aura.id].weaponGlow);
      wg.opacity = 0.55 + 0.25 * Math.sin(t * 8);
    } else if (band >= 2) {
      wg.color.set(PLUS_COLORS[band]);
      wg.opacity = 0.22 + band * 0.06 + 0.1 * Math.sin(t * 6);
    } else wg.opacity = 0;
  }
}

function setActorAlpha(a, alpha) {
  if (a.alpha === alpha) return;
  a.alpha = alpha;
  for (const k of ['lit', 'glow']) {
    const m = a.mats[k];
    if (!m) continue;
    m.transparent = alpha < 1;
    m.opacity = alpha;
    m.needsUpdate = true;
  }
  if (a.meshes.outline) a.meshes.outline.visible = alpha >= 1;
}

// Monster: Blickrichtung aus der Bewegung, Laufen, Angreifen, Aufblitzen, Schweben
function syncMonster3(m, dt) {
  if (m.isStone) {
    syncStone3(m, dt);
    return;
  }
  const a = actorFor(entityKey(m), 'm:' + m.typeId, (b) => {
    const r = buildMonster3(b, m.typeId);
    r.blob = r.family === 'beast' ? 0.5 : r.family === 'spider' ? 0.6 : 0.45;
    return r;
  });
  if (!a) return;
  animateCreature(a, m, dt, m.moving, m.attackAnim > 0 ? m.attackAnim / 0.25 : 0, m.hitFlash || 0);
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

function animateCreature(a, e, dt, moving, atk, flash) {
  const fy = feetY(e);
  resetBones(a);
  const B = a.bones;
  const t = game.time + (e.id || 0) * 0.37;
  // Richtung: aus der Bewegung, beim Angriff zum Ziel (sonst zum Spieler)
  if (a.lastX != null) {
    const dx = e.x - a.lastX;
    const dy = e.y - a.lastY;
    if (dx * dx + dy * dy > 0.25) a.want = Math.atan2(dx, dy);
  }
  if (atk > 0 && game.player) a.want = Math.atan2(game.player.x - e.x, game.player.y - e.y);
  if (a.want == null) a.want = e.facing < 0 ? -Math.PI / 2 : Math.PI / 2;
  turnToward(a, a.want, Math.min(1, dt * 10));
  a.lastX = e.x;
  a.lastY = e.y;
  const fam = a.model.family;
  const lunge = atk > 0 ? Math.sin(atk * Math.PI) : 0;
  let y = 0;
  if (fam === 'ghost') y = 0.2 + Math.sin(t * 2.5) * 0.08;
  placeActor(a, e, fy, y);
  a.group.rotation.y = a.heading;
  const w = t * (moving ? 11 : 0);
  if (fam === 'human') {
    if (moving) {
      B[BH.legL].rotation.x = Math.sin(w) * 0.6;
      B[BH.legR].rotation.x = -Math.sin(w) * 0.6;
      B[BH.armL].rotation.x = -Math.sin(w) * 0.45;
      B[BH.armR].rotation.x = Math.sin(w) * 0.45;
      B[BH.hips].position.y += Math.abs(Math.cos(w)) * 0.03;
    } else {
      B[BH.chest].rotation.x = Math.sin(t * 2.6) * 0.025;
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
  } else if (fam === 'serpent') {
    for (let k = 1; k < B.length; k++) B[k].rotation.y = Math.sin(t * (moving ? 7 : 2.5) - k * 0.8) * (moving ? 0.25 : 0.1);
    B[1].position.z += lunge * 0.25;
    B[1].rotation.x = -lunge * 0.2;
  } else if (fam === 'ghost') {
    B[4].rotation.z = 0.3 + Math.sin(t * 3) * 0.2 + lunge * 0.8;
    B[5].rotation.z = -0.3 - Math.sin(t * 3) * 0.2;
    B[1].position.z += lunge * 0.2;
  }
  const mat = a.mats.lit;
  if (mat) {
    if (flash > 0) mat.emissive.setRGB(flash * 0.9, flash * 0.85, flash * 0.8);
    else if (e.stun > 0) mat.emissive.setRGB(0.2, 0.18, 0.02);
    else mat.emissive.setRGB(0, 0, 0);
  }
}

function syncStone3(s, dt) {
  const idx = STONE_TYPES.indexOf(s.stoneType);
  const a = actorFor(entityKey(s), 'st:' + idx, (b) => Object.assign(buildStone3(b, s.stoneType), { blob: 0.8 }));
  if (!a) return;
  resetBones(a);
  a.group.position.set(s.x * U3, 0, s.y * U3);
  a.group.scale.setScalar(Math.max(0.8, stoneHeight(s) * U3 / a.model.height));
  a.bones[1].rotation.y = Math.sin(game.time * 0.5) * 0.08;
  const flash = s.hitFlash || 0;
  if (a.mats.lit) a.mats.lit.emissive.setRGB(flash * 0.8, flash * 0.75, flash * 0.7);
  if (a.mats.glow) a.mats.glow.color.setScalar(0.75 + 0.25 * Math.sin(game.time * 3 + s.x));
}

function syncAlly3(al, dt) {
  const a = actorFor(entityKey(al), 'skel', (b) => Object.assign(buildSkeleton3(b), { blob: 0.4 }));
  if (!a) return;
  animateCreature(a, al, dt, al.moving, al.attackAnim > 0 ? al.attackAnim / 0.25 : 0, 0);
}

function syncNpc3(n, dt) {
  let a;
  if (n.id === 'riss') a = actorFor(entityKey(n), 'rift', (b) => Object.assign(buildRift3(b), { blob: 0.3 }));
  else if (n.id === 'eingang' || n.id === 'ausgang' || n.id === 'weltentor') {
    const col = n.id === 'weltentor' ? '#7ab8ff' : DUNGEONS[n.dungeon].portal;
    a = actorFor(entityKey(n), 'portal:' + n.id + col, (b) => Object.assign(buildPortal3(b, n.id, col), { blob: 0.01, scale: n.id === 'eingang' ? 1.7 : n.id === 'weltentor' ? 1.25 : 1.1 }));
  } else a = actorFor(entityKey(n), 'npc:' + n.id, (b) => {
    const r = buildNpc3(b, n.id);
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
      let want = 0;
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
    if (fam === 'rift') {
      a.bones[1].rotation.y = game.time * 0.8;
      a.bones[1].scale.setScalar(1 + Math.sin(game.time * 4) * 0.05);
    }
  }
}

// Gefallene Monster kippen um und versinken
function syncCorpse3(e) {
  const key = entityKey(e);
  const a = actorFor(key, 'm:' + e.typeId, (b) => {
    const r = buildMonster3(b, e.typeId);
    r.blob = 0.45;
    return r;
  });
  if (!a) return;
  resetBones(a);
  const k = Math.min(1, (game.time - e.start) / e.dur);
  a.group.position.set(e.x * U3, -k * 0.25, e.y * U3);
  if (a.heading == null) a.heading = 0;
  a.group.rotation.set(0, a.heading, 0);
  a.group.rotateZ(Math.min(1, k * 2.2) * (Math.PI / 2) * (e.flip ? -1 : 1));
  setActorAlpha(a, 1 - Math.max(0, k - 0.4) / 0.6 * 0.99);
}
