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
const figAura = () => mat3('figAura', () => new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
function figWeaponGlowMat() {
  return new THREE.MeshBasicMaterial({ skinning: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff });
}

// --- Teilformen ---------------------------------------------------------------------------------

function cap3(r, thetaLen, phiStart = 0, phiLen = Math.PI * 2, ws = 16, hs = 8) {
  return geo3(`cap${r},${thetaLen},${phiStart},${phiLen},${ws}`, () => new THREE.SphereGeometry(r, ws, hs, phiStart, phiLen, 0, thetaLen));
}
function torus3(r, t, arc = Math.PI * 2, rs = 5, ts = 16) {
  return geo3(`to${r},${t},${arc},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
function cyl3(r1, r2, h, seg = 14) {
  return geo3(`cy${r1},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg));
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

// Klinge als flaches Prisma mit Spitze und weichem Rand (Schwert, Dolch, Zweihänder, Sense)
function bladeGeo(len, w, curve = 0) {
  return geo3(`blade${len},${w},${curve}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.quadraticCurveTo(w / 2 + curve * len * 0.4, len * 0.55, w * 0.42, len * 0.82);
    s.lineTo(curve * len * 0.25, len);
    s.lineTo(-w * 0.42, len * 0.82);
    s.quadraticCurveTo(-w / 2 + curve * len * 0.2, len * 0.5, -w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: w * 0.16, bevelEnabled: true, bevelThickness: w * 0.1, bevelSize: w * 0.12, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -w * 0.08);
    return smoothGeo(g);
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

// Teil in einem lokalen Rahmen (Waffe in der Hand, Kopfschmuck): Matrix M mal Teil
function framed(A, M, bone) {
  return (geo, color, o = {}) => A(geo, color, Object.assign({}, o, { bone, m: M.clone().multiply(partMatrix(o)) }));
}
function partFrame(at, rot) {
  return new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1));
}

// --- Waffen (Griff im Ursprung, Klinge entlang +y) -----------------------------------------------

function weapon3(A, kind, tier, bone, at, rot, wg) {
  tier = Math.max(0, Math.min(7, tier || 0));
  const metal = TIER_METAL[tier];
  const accent = TIER_ACCENT[tier];
  const M = partFrame(at, rot);
  const W = framed(A, M, bone);
  const shell = (geo, o) => wg && A(geo, '#ffffff', { bone, mat: 'wglow', m: M.clone().multiply(partMatrix(o)) });
  const gold = '#c9a35a';
  const gem = tier >= 4 ? STAFF_ORB[tier] : null;
  switch (kind) {
    case 'sword':
    case 'greatsword':
    case 'dagger': {
      const big = kind === 'greatsword';
      const dag = kind === 'dagger';
      const len = big ? 1.0 : dag ? 0.34 : 0.68;
      const wd = big ? 0.17 : dag ? 0.075 : 0.11;
      const grip = big ? 0.26 : 0.16;
      W(limb3(grip, 0.028, 0.026, 7), accent, { p: [0, 0.03, 0] });
      for (let k = 0; k < 3; k++) W(torus3(0.03, 0.009, Math.PI * 2, 4, 10), darker(accent, 0.3), { p: [0, -grip * (0.2 + k * 0.28), 0], r: [Math.PI / 2, 0, 0] });
      W(sphere3(0.042, 10, 7), gem || gold, { p: [0, -grip - 0.02, 0], mat: gem ? 'glow' : 'lit', shine: 1 });
      // Parierstange mit nach oben gebogenen Enden
      W(roundBox(big ? 0.36 : dag ? 0.16 : 0.26, 0.045, 0.06, 0.02), tier >= 3 ? metal : gold, { p: [0, 0.055, 0], shine: 1 });
      for (const sx of [-1, 1]) W(horn3(0.07, 0.025, 6), tier >= 3 ? metal : gold, { p: [sx * (big ? 0.18 : dag ? 0.08 : 0.13), 0.06, 0], r: [0, 0, -sx * 0.9], shine: 1 });
      if (tier >= 2) W(sphere3(0.025, 8, 6), gem || accent, { p: [0, 0.06, 0.035], mat: gem ? 'glow' : 'lit' });
      W(bladeGeo(len, wd, dag ? 0.12 : 0), metal, { p: [0, 0.08, 0], shine: 1, top: lighter(metal, 0.35), topK: 0.25 });
      // Hohlkehle auf beiden Seiten
      for (const sz of [-1, 1]) W(roundBox(wd * 0.2, len * 0.7, 0.008, 0.004), darker(metal, 0.32), { p: [0, 0.08 + len * 0.4, sz * wd * 0.1] });
      if (tier >= 4) W(roundBox(wd * 0.12, len * 0.55, 0.012, 0.004), lighter(gem, 0.3), { p: [0, 0.08 + len * 0.42, wd * 0.11], mat: 'glow' });
      shell(roundBox(wd * 1.9, len * 1.12, 0.09, 0.045), { p: [0, 0.08 + len / 2, 0] });
      return;
    }
    case 'bow': {
      const wood = tier === 0 ? '#8a5a34' : accent;
      for (const sy of [-1, 1]) {
        W(torus3(0.44, 0.024, Math.PI * 0.38, 5, 10), wood, { r: [0, 0, sy > 0 ? 0.32 : -Math.PI * 0.38 - 0.32], p: [-0.4, 0, 0] });
        W(horn3(0.1, 0.022, 5), metal, { p: [-0.12, sy * 0.42, 0], r: [0, 0, sy > 0 ? -0.9 : Math.PI + 0.9], shine: 1 });
      }
      W(limb3(0.18, 0.032, 0.032, 7), '#3a2a1c', { p: [0, 0.09, 0] });
      for (let k = 0; k < 3; k++) W(torus3(0.034, 0.008, Math.PI * 2, 4, 10), gold, { p: [0, 0.07 - k * 0.06, 0], r: [Math.PI / 2, 0, 0] });
      W(limb3(0.84, 0.005, 0.005, 3), '#efe6cc', { p: [-0.13, 0.42, 0] });
      shell(torus3(0.44, 0.06, Math.PI * 0.76, 5, 12), { r: [0, 0, -Math.PI * 0.38], p: [-0.4, 0, 0] });
      return;
    }
    case 'fan': {
      W(geo3('fanleaf2', () => new THREE.CylinderGeometry(0.36, 0.36, 0.018, 18, 1, false, -Math.PI * 0.44, Math.PI * 0.88).rotateX(Math.PI / 2)), FAN_LEAF[tier], { p: [0, 0.04, 0], top: lighter(FAN_LEAF[tier], 0.25), topK: 0.3 });
      W(torus3(0.35, 0.012, Math.PI * 0.88, 4, 18), gold, { p: [0, 0.04, 0.012], r: [0, 0, Math.PI * 0.06], shine: 1 });
      for (let k = -3; k <= 3; k++) W(limb3(0.36, 0.007, 0.006, 3), '#3a2a1c', { p: [0, 0.04, 0.014], r: [0, 0, Math.PI + k * 0.2] });
      W(sphere3(0.035, 8, 6), gold, { p: [0, 0.03, 0.02], shine: 1 });
      W(limb3(0.16, 0.01, 0.01, 4), '#c8402f', { p: [0, 0.02, 0] });
      W(sphere3(0.03, 8, 6), '#c8402f', { p: [0, -0.15, 0] });
      shell(geo3('fanshell2', () => new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16, 1, false, -Math.PI * 0.46, Math.PI * 0.92).rotateX(Math.PI / 2)), { p: [0, 0.04, 0] });
      return;
    }
    case 'bell': {
      W(limb3(0.2, 0.024, 0.024, 7), '#6b4a2e', { p: [0, 0.2, 0] });
      W(torus3(0.04, 0.012, Math.PI * 2, 4, 10), gold, { p: [0, 0.22, 0], shine: 1 });
      W(lathe3('bell2', [[0, 0], [0.14, 0], [0.13, 0.03], [0.09, 0.15], [0.055, 0.22], [0, 0.23]], 16), tier >= 3 ? metal : gold, { p: [0, -0.24, 0], shine: 1 });
      W(sphere3(0.035, 8, 6), STAFF_ORB[tier], { p: [0, -0.25, 0], mat: 'glow' });
      for (const sx of [-1, 1]) W(roundBox(0.03, 0.26, 0.008, 0.004), '#c8402f', { p: [sx * 0.05, -0.12, 0.02], r: [0, 0, sx * 0.25] });
      shell(sphere3(0.21, 12, 8), { p: [0, -0.14, 0] });
      return;
    }
    case 'staff':
    case 'skullstaff': {
      W(limb3(1.45, 0.03, 0.026, 7), '#5a3f2a', { p: [0, 1.0, 0], shade: 0.2 });
      for (const y of [0.1, 0.55]) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), gold, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
      if (kind === 'skullstaff') {
        W(ball(12), '#e8e0cc', { p: [0, 1.07, 0], s: [0.1, 0.095, 0.105] });
        W(roundBox(0.1, 0.05, 0.08, 0.025), '#e8e0cc', { p: [0, 1.0, 0.02] });
        for (const sx of [-1, 1]) W(sphere3(0.026, 7, 5), '#9be2ff', { p: [sx * 0.038, 1.07, 0.085], mat: 'glow' });
      } else {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          W(horn3(0.16, 0.018, 5), tier >= 3 ? metal : '#8a6a44', { p: [Math.cos(a) * 0.05, 0.98, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], shine: 1 });
        }
        W(sphere3(0.075, 14, 10), STAFF_ORB[tier], { p: [0, 1.08, 0], mat: 'glow' });
      }
      shell(sphere3(0.19, 12, 8), { p: [0, 1.07, 0] });
      return;
    }
    case 'scythe': {
      W(limb3(1.5, 0.03, 0.026, 7), '#4a3527', { p: [0, 1.0, 0] });
      W(scytheGeo(), metal, { p: [0, 0.98, 0], shine: 1 });
      W(roundBox(0.1, 0.09, 0.07, 0.025), accent, { p: [0, 0.98, 0] });
      for (const y of [0.2, 0.5]) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), accent, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
      shell(roundBox(0.8, 0.22, 0.08, 0.04), { p: [-0.35, 0.98, 0] });
      return;
    }
    case 'axe':
    case 'greataxe': {
      // Äxte: Schaft mit Wicklung, Bartklinge (Streitaxt: doppelt), Dorn hinten, Spitze oben
      const big = kind === 'greataxe';
      const shaft = big ? 1.25 : 0.78;
      const wood = tier >= 5 ? '#2a2024' : tier >= 3 ? accent : '#5a3f2a';
      W(limb3(shaft, 0.032, 0.028, 7), wood, { p: [0, shaft * 0.78, 0], shade: 0.2 });
      for (let k = 0; k < 3; k++) W(torus3(0.034, 0.01, Math.PI * 2, 4, 10), darker(accent, 0.25), { p: [0, 0.02 - k * 0.07, 0], r: [Math.PI / 2, 0, 0] });
      W(sphere3(0.04, 8, 6), gem || darker(metal, 0.2), { p: [0, -shaft * 0.22 - 0.02, 0], mat: gem ? 'glow' : 'lit', shine: 1 });
      const headY = shaft * 0.66;
      const s = big ? 1.35 + tier * 0.03 : 1 + tier * 0.03;
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
        W(blade, metal, { p: [sx * 0.03, headY, 0], s: [s, s, 1], r: [0, sx > 0 ? 0 : Math.PI, 0], shine: 1, top: lighter(metal, 0.35), topK: 0.3 });
        // helle Schneide
        W(roundBox(0.02, 0.32 * s, 0.05, 0.008), lighter(metal, 0.45), { p: [sx * (0.03 + 0.265 * s), headY, 0], shine: 1 });
        if (tier >= 4) W(roundBox(0.1 * s, 0.025, 0.05, 0.008), lighter(gem, 0.2), { p: [sx * (0.03 + 0.12 * s), headY, 0], mat: 'glow' });
      }
      if (!big && tier >= 2) W(horn3(0.13, 0.03, 6), metal, { p: [-0.03, headY, 0], r: [0, 0, Math.PI / 2], shine: 1 });
      W(roundBox(0.08, 0.16 * s, 0.07, 0.025), darker(metal, 0.3), { p: [0, headY, 0], shine: 0.6 });
      if (big || tier >= 3) W(horn3(big ? 0.2 : 0.12, 0.03, 6), metal, { p: [0, headY + 0.08 * s, 0], shine: 1 });
      if (gem) W(sphere3(0.028, 8, 6), gem, { p: [0, headY, 0.04], mat: 'glow' });
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

function shield3(A, tier, bone, at) {
  tier = Math.max(0, Math.min(7, tier || 0));
  const W = framed(A, partFrame(at, [0, 0, Math.PI / 2]), bone);
  W(lathe3('shield2', [[0, -0.045], [0.25, -0.04], [0.27, -0.015], [0.26, 0.02], [0.19, 0.045], [0, 0.055]], 22), TIER_ACCENT[tier], { top: lighter(TIER_ACCENT[tier], 0.2), topK: 0.3 });
  W(torus3(0.26, 0.024, Math.PI * 2, 5, 24), TIER_METAL[tier], { r: [Math.PI / 2, 0, 0], shine: 1 });
  W(ball(12), TIER_METAL[tier], { p: [0, 0.05, 0], s: [0.075, 0.045, 0.075], shine: 1 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    W(sphere3(0.018, 6, 4), TIER_METAL[tier], { p: [Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2], shine: 1 });
  }
  if (tier >= 4) W(sphere3(0.03, 8, 6), STAFF_ORB[tier], { p: [0, 0.095, 0], mat: 'glow' });
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
      // Monster: kleine, tief liegende Augen unter einem schweren Brauenwulst
      A(ball(10), darker(o.skin || '#7a7466', 0.45), { bone: hb, p: [ex, eyeY, ez - hr * 0.03], s: [hr * 0.17, hr * 0.12, hr * 0.07] });
      A(ball(10), '#f0e0a0', { bone: hb, p: [ex, eyeY - hr * 0.01, ez + hr * 0.01], s: [hr * 0.11, hr * 0.07, hr * 0.05] });
      A(ball(8), o.eyeColor || '#c8302a', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.01, ez + hr * 0.04], s: [hr * 0.06, hr * 0.06, hr * 0.03], mat: 'glow' });
      A(ball(6), '#120808', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.01, ez + hr * 0.06], s: [hr * 0.02, hr * 0.045, hr * 0.02] });
      A(roundBox(hr * 0.36, hr * 0.1, hr * 0.12, hr * 0.04), darker(o.skin || '#7a7466', 0.12), { bone: hb, p: [ex + sx * hr * 0.02, eyeY + hr * 0.11, ez + hr * 0.02], r: [0.2, 0, sx * 0.38], mat: 'lit' });
      continue;
    }
    if (shape === 2) {
      // fröhlich: geschlossene Bögen
      A(torus3(hr * 0.15, hr * 0.035, Math.PI, 4, 10), ink, { bone: hb, p: [ex, eyeY - hr * 0.06, ez + hr * 0.02] });
    } else {
      const narrow = shape === 1 || o.narrow;
      const sy = narrow ? 0.5 : 1;
      A(ball(12), '#fbf8f2', { bone: hb, p: [ex, eyeY, ez], s: [hr * 0.18, hr * 0.25 * sy, hr * 0.08] });
      A(ball(12), iris, { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.03 * sy, ez + hr * 0.03], s: [hr * 0.14, hr * 0.2 * sy, hr * 0.06], shine: 0.6 });
      A(ball(10), lighter(iris, 0.35), { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.1 * sy, ez + hr * 0.055], s: [hr * 0.09, hr * 0.08 * sy, hr * 0.03] });
      A(ball(10), '#140c08', { bone: hb, p: [ex - sx * hr * 0.01, eyeY - hr * 0.01 * sy, ez + hr * 0.07], s: [hr * 0.07, hr * 0.11 * sy, hr * 0.03] });
      A(sphere3(1, 8, 6), '#ffffff', { bone: hb, p: [ex - sx * hr * 0.05, eyeY + hr * 0.07 * sy, ez + hr * 0.1], s: [hr * 0.055, hr * 0.06 * sy, hr * 0.025], mat: 'glow' });
      A(sphere3(1, 6, 5), '#ffffff', { bone: hb, p: [ex + sx * hr * 0.04, eyeY - hr * 0.09 * sy, ez + hr * 0.1], s: [hr * 0.026, hr * 0.026, hr * 0.02], mat: 'glow' });
      // Lidstrich mit Schwung nach außen
      A(torus3(hr * 0.18, hr * 0.032, Math.PI * 0.82, 4, 10), ink, { bone: hb, p: [ex, eyeY + hr * 0.02 * sy, ez + hr * 0.035], r: [0, 0, Math.PI * 0.09], s: [1, sy * 1.25, 1] });
      A(horn3(hr * 0.12, hr * 0.03, 5), ink, { bone: hb, p: [ex + sx * hr * 0.17, eyeY + hr * 0.1 * sy, ez + hr * 0.02], r: [0, 0, -sx * 2.2] });
      if (o.female) {
        // längere Wimpern: zweiter Schwung und ein feiner unterer Lidstrich
        A(horn3(hr * 0.1, hr * 0.024, 5), ink, { bone: hb, p: [ex + sx * hr * 0.12, eyeY + hr * 0.19 * sy, ez + hr * 0.03], r: [0, 0, -sx * 2.6] });
        A(torus3(hr * 0.13, hr * 0.012, Math.PI * 0.5, 3, 8), ink, { bone: hb, p: [ex, eyeY - hr * 0.02, ez + hr * 0.03], r: [0, 0, Math.PI * 1.25] });
      }
    }
    // Brauen: entschlossen oder grimmig schräg, sonst sanft gebogen
    const stern = shape === 3 || o.angry;
    A(roundBox(hr * 0.26, hr * (o.male ? 0.065 : o.female ? 0.035 : 0.045), hr * 0.05, hr * 0.02), stern ? ink : brow, { bone: hb, p: [ex, eyeY + hr * (stern ? 0.3 : 0.36), ez + hr * 0.0], r: [0, 0, stern ? sx * 0.42 : -sx * 0.12] });
  }
  if (o.blush !== false && !o.glowEyes) for (const sx of [-1, 1]) A(ball(8), '#f2988a', { bone: hb, p: [hc[0] + sx * hr * 0.58, eyeY - hr * 0.3, hc[2] + f * 0.84], s: [hr * 0.14, hr * 0.07, hr * 0.05] });
  if (!o.noMouth) {
    if (o.beastEyes) {
      // breites, zähnefletschendes Maul
      A(roundBox(hr * 0.46, hr * 0.09, hr * 0.06, hr * 0.04), '#2a0e0c', { bone: hb, p: [hc[0], hc[1] - hr * 0.47, hc[2] + f * 0.96] });
      for (let k = -2; k <= 2; k++) A(horn3(hr * 0.09, hr * 0.03, 4), '#f0e6cc', { bone: hb, p: [hc[0] + k * hr * 0.09, hc[1] - hr * (k % 2 ? 0.43 : 0.52), hc[2] + f * 0.99], r: [k % 2 ? Math.PI : 0, 0, 0] });
    } else if (o.angry) A(roundBox(hr * 0.2, hr * 0.045, hr * 0.05, hr * 0.02), '#4a1a14', { bone: hb, p: [hc[0], hc[1] - hr * 0.45, hc[2] + f * 0.97] });
    else A(torus3(hr * 0.08, hr * (o.female ? 0.03 : 0.022), Math.PI * 0.8, 4, 8), o.female ? '#c0485a' : '#6a2a24', { bone: hb, p: [hc[0], hc[1] - hr * 0.38, hc[2] + f * 0.98], r: [0, 0, Math.PI + Math.PI * 0.1] });
  }
  if (!o.noNose) A(sphere3(hr * 0.055, 8, 6), darker(o.skin || '#e9c6a1', 0.1), { bone: hb, p: [hc[0], hc[1] - hr * 0.24, hc[2] + f * 1.03] });
  // Gesichtszeichen: 1 Sommersprossen, 2 Narbe, 3 Kriegsbemalung
  if (o.mark === 1) for (const sx of [-1, 1]) for (const [dx, dy] of [[0, 0], [0.12, 0.05], [0.06, -0.08], [0.17, -0.04]]) A(sphere3(hr * 0.024, 6, 4), '#a8683a', { bone: hb, p: [hc[0] + sx * hr * (0.42 + dx), eyeY - hr * (0.3 + dy), hc[2] + f * 0.92] });
  if (o.mark === 2) A(roundBox(hr * 0.05, hr * 0.46, hr * 0.04, hr * 0.02), '#a8483a', { bone: hb, p: [hc[0] - hr * 0.47, eyeY - hr * 0.08, hc[2] + f * 0.94], r: [0, 0, 0.35] });
  if (o.mark === 3) for (const sx of [-1, 1]) for (const k of [0, 1]) A(roundBox(hr * 0.26, hr * 0.045, hr * 0.04, hr * 0.02), '#b82a2a', { bone: hb, p: [hc[0] + sx * hr * 0.44, eyeY - hr * (0.27 + k * 0.12), hc[2] + f * 0.9], r: [0, sx * 0.3, 0] });
}

// --- Haare aus Strähnen ------------------------------------------------------------------------------
// Frisuren: 0 Kurz, 1 Dutt, 2 Lang, 3 Stachelig, 4 Pferdeschwanz, 5 Glatze. "covered": Helm/Kapuze.

function lock(A, hb, base, len, r, rot, color) {
  A(horn3(len, r, 7), color, { bone: hb, p: base, r: rot, shade: 0.25, shine: 0.25 });
}

function hair3(A, hb, hc, hr, style, color, covered) {
  if (style === 5) return;
  const [x, y, z] = hc;
  const hi = lighter(color, 0.42);
  if (!covered) {
    A(cap3(hr * 1.07, Math.PI * 0.5, 0, Math.PI * 2, 18, 9), color, { bone: hb, p: [x, y + hr * 0.02, z - hr * 0.05], r: [-0.6, 0, 0], shade: 0.2, shine: 0.25 });
    // Glanz oben auf dem Scheitel (hellere Kappe, liegt flach im Haar)
    A(cap3(hr * 1.075, Math.PI * 0.2, 0, Math.PI * 2, 14, 4), hi, { bone: hb, p: [x, y + hr * 0.02, z - hr * 0.05], r: [-0.6, 0, 0], shine: 0.5, ao: 0 });
    // Pony: sechs Strähnen über der Stirn, nach außen gefächert
    for (let k = 0; k < 6; k++) {
      const u = k / 5 - 0.5;
      lock(A, hb, [x + u * hr * 1.35, y + hr * 0.72 - Math.abs(u) * hr * 0.12, z + hr * 0.52], hr * (0.48 - Math.abs(u) * 0.14), hr * 0.16, [2.55 - Math.abs(u) * 0.3, 0, -u * 0.9], k % 2 ? color : darker(color, 0.06));
    }
    if (style === 3) {
      // stachelig: Spitzen nach oben und hinten
      for (let k = 0; k < 9; k++) {
        const a = -1.3 + (k / 8) * 2.6;
        lock(A, hb, [x + Math.sin(a) * hr * 0.6, y + hr * 0.55, z - hr * 0.1 + Math.cos(a) * hr * 0.1], hr * 0.85, hr * 0.22, [-0.5, 0, -a * 0.75], k % 2 ? color : lighter(color, 0.08));
      }
    }
  } else if (covered !== 'hood') {
    // unter dem Helm schauen ein paar Strähnen hervor (unter Kapuzen nicht)
    for (const u of [-0.3, 0, 0.3]) lock(A, hb, [x + u * hr, y + hr * 0.48, z + hr * 0.8], hr * 0.24, hr * 0.11, [2.6, 0, -u * 1.2], color);
  }
  // Seitensträhnen um die Wangen
  for (const sx of [-1, 1]) {
    lock(A, hb, [x + sx * hr * 0.86, y + hr * 0.12, z + hr * 0.2], hr * (style === 2 ? 1.05 : 0.55), hr * 0.15, [2.95, 0, sx * 0.1], color);
    lock(A, hb, [x + sx * hr * 0.8, y + hr * 0.15, z - hr * 0.2], hr * (style === 2 ? 0.95 : 0.45), hr * 0.15, [-2.95, 0, sx * 0.16], darker(color, 0.06));
  }
  A(ball(16), color, { bone: hb, p: [x, y - hr * 0.02, z - hr * 0.22], s: [hr * 1.04, hr * 0.98, hr * 0.84], shade: 0.25 });
  // Strähnen am Hinterkopf
  for (let k = 0; k < 5; k++) {
    const u = k / 4 - 0.5;
    lock(A, hb, [x + u * hr * 1.3, y - hr * 0.25, z - hr * 0.75], hr * (style === 2 ? 1.5 : 0.5), hr * 0.2, [-2.75, 0, u * 0.5], k % 2 ? color : darker(color, 0.07));
  }
  if (style === 1 && !covered) {
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

function humanoid3(b, c, P) {
  const A = adder(b, P);
  const seg = (a, z, r1, r2, color, o) => limbBetween(A, a, z, r1, r2, color, o);
  const belly = !!c.belly;
  // bk: kräftiger Körperbau (Krieger), breitere Schultern, Arme und Beine
  const bk = c.bulk || 1;
  const legLen = belly ? 0.3 : 0.34;
  const hipX = (belly ? 0.16 : 0.105) * bk;
  const legR = (belly ? 0.12 : 0.082) * bk;
  const hipY = legLen + 0.06;
  const chestY = hipY + 0.26;
  const shY = hipY + (belly ? 0.48 : 0.37);
  const shX = (belly ? 0.42 : 0.25) * bk;
  const armLen = belly ? 0.46 : 0.31;
  const armR = (belly ? 0.11 : 0.062) * bk;
  const neckY = hipY + (belly ? 0.6 : 0.44);
  const hr = c.headR || (belly ? 0.26 : 0.33);
  const hc = [0, neckY + hr * 0.84, belly ? 0.1 : 0.02];
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, hipY, 0], 0], [[0, chestY, 0], 1], [[0, neckY, 0], 2],
    [[shX, shY, 0], 2], [[-shX, shY, 0], 2], [[shX, shY - armLen, 0], 4], [[-shX, shY - armLen, 0], 5],
    [[hipX, hipY, 0], 1], [[-hipX, hipY, 0], 1], [[0, shY + 0.02, -0.18], 2], [[0, hipY + 0.04, -0.2], 1],
    [[0.12, shY - 0.02, -0.18], 2], [[-0.12, shY - 0.02, -0.18], 2]
  ]);
  const pants = c.pants || darker(c.torso, 0.2);
  const boots = c.boots || '#3a2a1c';
  const trim = c.trim || c.belt || darker(c.torso, 0.3);
  // Beine mit Knien und Stiefeln (Schaft, Stulpe, dunkle Sohle)
  for (const [sx, bone] of [[1, BH.legL], [-1, BH.legR]]) {
    const top = [sx * hipX, hipY, 0];
    const knee = [sx * hipX * 1.02, hipY - legLen * 0.5, 0.015];
    const ankle = [sx * hipX, 0.1, 0];
    seg(top, knee, legR, legR * 0.9, pants, { bone, shade: 0.12 });
    seg(knee, ankle, legR * 0.9, legR * 0.78, pants, { bone });
    if (c.kneePads) A(ball(10), c.kneePads, { bone, p: [knee[0], knee[1], knee[2] + legR * 0.6], s: [legR * 0.9, legR * 0.85, legR * 0.6], shine: 0.6 });
    A(lathe3('bootshaft', [[0.08, 0], [0.085, 0.08], [0.09, 0.16], [0, 0.161]], 12), boots, { bone, p: [sx * hipX, 0.04, 0], s: [legR / 0.082, 1, legR / 0.082] });
    A(torus3(legR * 1.15, 0.02, Math.PI * 2, 4, 14), c.bootTrim || lighter(boots, 0.15), { bone, p: [sx * hipX, 0.2, 0], r: [Math.PI / 2, 0, 0] });
    A(roundBox(legR * 1.95, 0.1, legR * 3.1, legR * 0.85), boots, { bone, p: [sx * hipX, 0.06, legR * 0.5], top: lighter(boots, 0.15), topK: 0.4 });
    A(roundBox(legR * 2.05, 0.035, legR * 3.2, 0.015), darker(boots, 0.45), { bone, p: [sx * hipX, 0.018, legR * 0.5] });
    if (c.shin) A(roundBox(legR * 1.6, 0.16, 0.04, 0.02), c.shin, { bone, p: [sx * hipX, 0.24, legR * 0.85], shine: 0.7 });
    // Beinschienen aus Platten mit Kniekachel
    if (c.greaves) {
      A(cap3(legR * 1.18, Math.PI * 0.62, -Math.PI * 0.5, Math.PI, 10, 6), c.greaves, { bone, p: [sx * hipX, 0.2, 0.0], s: [1, 2.2, 1.1], r: [Math.PI / 2, 0, 0], shine: 0.8, top: lighter(c.greaves, 0.25), topK: 0.3 });
      A(roundBox(0.018, 0.17, 0.02, 0.008), lighter(c.greaves, 0.3), { bone, p: [sx * hipX, 0.25, legR * 1.12], shine: 1 });
      A(ball(10), c.greaves, { bone, p: [knee[0], knee[1] + 0.01, knee[2] + legR * 0.7], s: [legR * 1.05, legR * 0.95, legR * 0.7], shine: 0.9 });
      if (c.greaveSpike) A(horn3(0.07, 0.022, 5), c.greaveSpike, { bone, p: [knee[0], knee[1] + 0.01, knee[2] + legR * 1.2], r: [Math.PI / 2, 0, 0], shine: 1 });
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
    // Frauen: schmalere Taille und Schultern
    const torsoPts = c.female
      ? [[0, 0], [0.18, 0], [0.2, 0.05], [0.165, 0.15], [0.185, 0.26], [0.195, 0.31], [0.17, 0.38], [0.11, 0.43], [0, 0.44]]
      : [[0, 0], [0.17, 0], [0.2, 0.05], [0.19, 0.13], [0.21, 0.24], [0.22, 0.3], [0.19, 0.38], [0.12, 0.43], [0, 0.44]];
    A(lathe3(c.female ? 'torsoF' : 'torso2', torsoPts, 16), c.torso, { bone: BH.chest, p: [0, hipY - 0.02, 0], s: [bk, 1, 0.84 * bk], shade: 0.18 });
    A(cyl3(0.055, 0.06, 0.1, 10), c.skin, { bone: BH.head, p: [0, neckY + 0.02, 0.0] });
    A(torus3(0.12, 0.032, Math.PI * 2, 5, 16), c.collar || trim, { bone: BH.chest, p: [0, neckY - 0.02, 0], r: [Math.PI / 2 - 0.15, 0, 0], s: [1, 0.86, 1] });
    if (c.robe) {
      A(lathe3('robe2', [[0, 0], [0.31, 0], [0.32, 0.03], [0.28, 0.2], [0.23, 0.4], [0.2, 0.47], [0, 0.48]], 20), c.robe, { bone: BH.hips, p: [0, 0.02, 0], s: [1, 1, 0.88], shade: 0.25 });
      if (c.hemTrim) A(torus3(0.31, 0.022, Math.PI * 2, 4, 22), c.hemTrim, { bone: BH.hips, p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.88, 1], shine: 0.5 });
      if (c.tattered) for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        A(horn3(0.12 + (k % 3) * 0.04, 0.05, 5), darker(c.robe, 0.15), { bone: BH.hips, p: [Math.cos(a) * 0.29, 0.06, Math.sin(a) * 0.26], r: [Math.PI, 0, 0] });
      }
    } else {
      A(lathe3('skirt2', [[0, 0], [0.27, 0], [0.285, 0.02], [0.25, 0.13], [0.21, 0.18], [0, 0.19]], 16), c.skirt || darker(c.torso, 0.1), { bone: BH.hips, p: [0, hipY - 0.17, 0], s: [bk, 1, 0.84 * bk], shade: 0.2 });
      // Stoffbahnen vorn und hinten
      for (const sz of [1, -1]) A(roundBox(0.17, 0.22, 0.025, 0.012), c.flap || c.skirt || darker(c.torso, 0.18), { bone: BH.hips, p: [0, hipY - 0.17, sz * 0.21], r: [sz * 0.12, 0, 0], shade: 0.25 });
    }
  }
  // Gürtel mit Schnalle und Tasche
  if (c.belt) {
    const by = hipY + (belly ? 0.06 : 0.02);
    A(torus3(belly ? 0.41 : 0.21, 0.03 * (c.wideBelt ? 1.6 : 1), Math.PI * 2, 5, 20), c.belt, { bone: BH.hips, p: [0, by, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.86 * bk, c.wideBelt ? 1.4 : 1] });
    A(roundBox(c.wideBelt ? 0.12 : 0.08, c.wideBelt ? 0.1 : 0.065, 0.03, 0.012), c.buckle || '#c9a35a', { bone: BH.hips, p: [0, by, (belly ? 0.36 : 0.185) * bk], shine: 1 });
    if (c.wideBelt) A(ball(8), darker(c.buckle || '#c9a35a', 0.2), { bone: BH.hips, p: [0, by, 0.2 * bk], s: [0.035, 0.035, 0.02], shine: 1 });
    if (c.pouch !== false) A(roundBox(0.085, 0.09, 0.06, 0.025), c.pouch || darker(c.belt, 0.1), { bone: BH.hips, p: [-0.15, by - 0.06, 0.12], r: [0, 0.6, 0] });
  }
  if (c.sash) {
    A(torus3(0.215, 0.045, Math.PI * 2, 5, 20), c.sash, { bone: BH.hips, p: [0, hipY + 0.06, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.86, 1] });
    for (const x of [-0.08, 0.06]) {
      A(roundBox(0.06, 0.13, 0.008, 0.004), '#efe6cc', { bone: BH.hips, p: [x, hipY - 0.06, 0.2], r: [0.1, 0, x * 2] });
      A(roundBox(0.012, 0.09, 0.01, 0.004), '#b33a2c', { bone: BH.hips, p: [x, hipY - 0.06, 0.206], r: [0.1, 0, x * 2] });
    }
  }
  // weibliche Figur: angedeutete Brust (in der Farbe dessen, was darüber liegt)
  if (c.female && !belly) for (const sx of [-1, 1]) A(ball(10), c.cuirass || c.torso, { bone: BH.chest, p: [sx * 0.07, chestY + 0.07, 0.15 * bk], s: [0.075, 0.066, 0.06], shine: c.cuirass ? 0.8 : 0 });
  // Lamellenrüstung: Reihen überlappender Platten, Brustplatte mit Nieten
  if (c.lamellar) {
    for (let k = 0; k < 3; k++) A(torus3(0.205 - k * 0.006, 0.026, Math.PI * 2, 4, 18), k % 2 ? c.lamellar : lighter(c.lamellar, 0.12), { bone: BH.chest, p: [0, hipY + 0.07 + k * 0.075, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.84 * bk, 1], shine: 0.4 });
  }
  // Plattenharnisch über Brust und Rücken mit Mittelgrat und Nieten
  if (c.cuirass) {
    A(lathe3('cuirass', [[0.2, 0], [0.215, 0.02], [0.228, 0.1], [0.232, 0.18], [0.205, 0.26], [0.14, 0.31], [0, 0.315]], 18), c.cuirass, { bone: BH.chest, p: [0, hipY + 0.11, 0], s: [bk, 1, 0.88 * bk], shine: 0.85, top: lighter(c.cuirass, 0.28), topK: 0.35 });
    A(roundBox(0.03, 0.24, 0.03, 0.012), lighter(c.cuirass, 0.3), { bone: BH.chest, p: [0, hipY + 0.24, 0.2 * bk], shine: 1 });
    A(torus3(0.215, 0.016, Math.PI * 2, 4, 20), c.cuirassRim || lighter(c.cuirass, 0.3), { bone: BH.chest, p: [0, hipY + 0.115, 0], r: [Math.PI / 2, 0, 0], s: [bk, 0.88 * bk, 1], shine: 1 });
    for (const sx of [-1, 1]) for (const y of [0.15, 0.25]) A(sphere3(0.013, 6, 4), c.cuirassRim || '#e8c46a', { bone: BH.chest, p: [sx * 0.13 * bk, hipY + y, 0.17 * bk], shine: 1 });
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
      A(torus3(armR * 1.0, 0.016, Math.PI * 2, 4, 12), c.cuff || trim, { bone: ab, p: [wrist[0], wrist[1] + 0.04, wrist[2]], r: [Math.PI / 2, 0, 0] });
      if (c.wraps) for (let k = 0; k < 3; k++) A(torus3(armR * 0.95, 0.011, Math.PI * 2, 4, 12), c.wraps, { bone: ab, p: [wrist[0], wrist[1] + 0.08 + k * 0.045, wrist[2]], r: [Math.PI / 2 + 0.2 * (k % 2 ? 1 : -1), 0, 0] });
      if (c.bracer) A(lathe3('bracer', [[armR * 1.0, 0], [armR * 1.08, 0.06], [armR * 1.02, 0.12], [0, 0.121]], 10), c.bracer, { bone: ab, p: [wrist[0], wrist[1] + 0.03, wrist[2]], shine: 0.8 });
    }
    if (c.armBands) for (const t of [0.3, 0.42]) A(torus3(armR * 1.05, 0.014, Math.PI * 2, 4, 12), c.armBands, { bone: ab, p: [sh[0], sh[1] - armLen * t, 0.003], r: [Math.PI / 2, 0, 0] });
    const hand = [sx * shX, shY - armLen - armR * 0.5, 0.02];
    const hs = (belly ? 1.9 : 1) * (c.gauntlets ? 1.12 : 1);
    A(ball(10), c.gloves || c.skin, { bone: hb, p: hand, s: [0.068 * hs, 0.075 * hs, 0.062 * hs] });
    A(ball(8), c.gloves || c.skin, { bone: hb, p: [hand[0] - sx * 0.05 * hs, hand[1] + 0.01, hand[2] + 0.035 * hs], s: [0.026 * hs, 0.034 * hs, 0.026 * hs] });
    if (c.gauntlets) {
      A(lathe3('gauntlet', [[armR * 1.05, 0], [armR * 1.25, 0.05], [armR * 1.15, 0.13], [0, 0.131]], 10), c.gauntlets, { bone: ab, p: [wrist[0], wrist[1] - 0.01, wrist[2]], shine: 0.9 });
      A(roundBox(0.1, 0.03, 0.05, 0.012), lighter(c.gauntlets, 0.2), { bone: hb, p: [hand[0], hand[1] + 0.03, hand[2] + 0.045], shine: 1 });
    }
    if (c.claws) for (let k = -1; k <= 1; k++) A(horn3(0.08 * hs, 0.018 * hs, 5), '#f4ecd8', { bone: hb, p: [hand[0] + k * 0.03 * hs, hand[1] - 0.06 * hs, hand[2] + 0.04], r: [Math.PI + 0.3, 0, 0] });
    if (c.pads && c.padStyle === 'leather') {
      // Ninja: kleine Lederkappe mit Naht und Riemen
      const pp = [sx * shX * 1.02, shY + 0.03, 0];
      A(cap3(0.1, Math.PI * 0.5, 0, Math.PI * 2, 12, 5), c.pads, { bone: ab, p: pp, s: [1, 0.8, 1.05], r: [0, 0, -sx * 0.4], shine: 0.15 });
      A(torus3(0.098, 0.008, Math.PI * 2, 3, 14), c.padTrim || lighter(c.pads, 0.3), { bone: ab, p: [pp[0], pp[1] - 0.005, pp[2]], r: [Math.PI / 2, -sx * 0.4, 0] });
      A(torus3(armR * 1.08, 0.012, Math.PI * 2, 4, 12), darker(c.pads, 0.2), { bone: ab, p: [sh[0], sh[1] - 0.08, 0], r: [Math.PI / 2, 0, 0] });
    } else if (c.pads && c.padStyle === 'cloth') {
      // Schamane: Stoffumhang über der Schulter mit Quasten
      const pp = [sx * shX * 1.0, shY + 0.02, 0];
      A(cap3(0.14, Math.PI * 0.62, 0, Math.PI * 2, 14, 6), c.pads, { bone: ab, p: pp, s: [1, 0.75, 1.1], r: [0, 0, -sx * 0.45], shade: 0.2 });
      if (c.padTrim) A(torus3(0.13, 0.012, Math.PI * 2, 4, 16), c.padTrim, { bone: ab, p: [pp[0] + sx * 0.03, pp[1] - 0.05, pp[2]], r: [Math.PI / 2, -sx * 0.45, 0], shine: 0.6 });
      for (const dz of [-0.06, 0, 0.06]) {
        A(limb3(0.08, 0.006, 0.006, 3), c.padTrim || '#e0c36a', { bone: ab, p: [pp[0] + sx * 0.12, pp[1] - 0.06, dz] });
        A(sphere3(0.016, 6, 4), '#c8402f', { bone: ab, p: [pp[0] + sx * 0.12, pp[1] - 0.15, dz] });
      }
    } else if (c.pads && c.padStyle === 'bone') {
      // Nekromant: Schädel als Schulterstück, Knochendornen
      const pp = [sx * shX * 1.05, shY + 0.05, 0];
      A(ball(10), '#e8e0cc', { bone: ab, p: pp, s: [0.1, 0.09, 0.1], shade: 0.2 });
      for (const dx of [-0.03, 0.03]) A(sphere3(0.02, 6, 4), c.padTrim || '#1a1210', { bone: ab, p: [pp[0] + dx, pp[1] + 0.01, pp[2] + 0.085], mat: c.padTrim ? 'glow' : 'lit' });
      for (const dz of [-0.05, 0.05]) A(horn3(0.12, 0.025, 5), '#ddd5bb', { bone: ab, p: [pp[0] + sx * 0.03, pp[1] + 0.06, dz], r: [0, 0, -sx * 0.6] });
    } else if (c.pads) {
      // Krieger: schwere geschichtete Plattenschultern mit Metallrand (mit Fell darunter)
      const ps = (belly ? 1.45 : 1) * (c.padStyle === 'plate' ? 1.22 : 1);
      const pp = [sx * shX * 1.04, shY + 0.03, 0];
      if (c.furCollar && c.padStyle === 'plate') A(ball(10), c.furCollar, { bone: ab, p: [pp[0] - sx * 0.01, pp[1] - 0.05, pp[2]], s: [0.12 * ps, 0.07, 0.13 * ps], shade: 0.2 });
      A(cap3(0.13 * ps, Math.PI * 0.5, 0, Math.PI * 2, 14, 6), c.pads, { bone: ab, p: pp, s: [1, 0.85, 1.05], r: [0, 0, -sx * 0.35], shine: 0.7 });
      A(cap3(0.115 * ps, Math.PI * 0.5, 0, Math.PI * 2, 14, 6), lighter(c.pads, 0.1), { bone: ab, p: [pp[0] + sx * 0.03, pp[1] - 0.06, pp[2]], s: [1, 0.7, 1.05], r: [0, 0, -sx * 0.55], shine: 0.7 });
      if (c.padStyle === 'plate') A(cap3(0.1 * ps, Math.PI * 0.5, 0, Math.PI * 2, 14, 6), lighter(c.pads, 0.18), { bone: ab, p: [pp[0] + sx * 0.06, pp[1] - 0.11, pp[2]], s: [1, 0.6, 1.05], r: [0, 0, -sx * 0.7], shine: 0.7 });
      if (c.padTrim) A(torus3(0.128 * ps, 0.013, Math.PI * 2, 4, 16), c.padTrim, { bone: ab, p: pp, r: [Math.PI / 2, -sx * 0.35, 0], shine: 1 });
      if (c.spikes) for (const dz of [-0.05, 0.05]) A(horn3(0.13 * ps, 0.035 * ps, 6), '#d9dde2', { bone: ab, p: [pp[0] + sx * 0.04, pp[1] + 0.08, dz], r: [0, 0, -sx * 0.45], shine: 1 });
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
  A(ball(14), c.skin, { bone: hb, p: [hc[0], hc[1] - hr * 0.28, hc[2] + hr * 0.12], s: [hr * 0.86, hr * 0.62, hr * 0.8] });
  if (!c.noEars) for (const sx of [-1, 1]) {
    if (c.pointEars) A(horn3(hr * 0.55, hr * 0.14, 6), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.9, hc[1], hc[2]], r: [0, 0, -sx * 1.25] });
    else A(ball(8), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.97, hc[1] - hr * 0.06, hc[2]], s: [hr * 0.1, hr * 0.17, hr * 0.14] });
  }
  if (c.brow) A(roundBox(hr * 1.4, hr * 0.2, hr * 0.3, hr * 0.1), c.skin, { bone: hb, p: [hc[0], hc[1] + hr * 0.12, hc[2] + hr * 0.75], shade: 0.3 });
  face3(A, hb, hc, hr, Object.assign({ hairColor: c.hair ? c.hair.color : null }, c));
  if (c.beard) A(ball(12), c.beard, { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + hr * 0.42], s: [hr * 0.64, hr * 0.52, hr * 0.44], shade: 0.2, mat: c.beardGlow ? 'glow' : 'lit' });
  if (c.tusks) for (const sx of [-1, 1]) A(horn3(hr * 0.34, hr * 0.085, 6), '#f4ecd8', { bone: hb, p: [hc[0] + sx * hr * 0.3, hc[1] - hr * 0.6, hc[2] + hr * 0.78], r: [-0.25, 0, sx * 0.15], shine: 0.4 });
  if (c.hair) hair3(A, hb, hc, hr, c.hair.style, c.hair.color, c.covered === 'hood' ? 'hood' : !!c.covered);
  // Frauen unter Kapuze oder Helm: geflochtener Zopf hängt hinten heraus
  if (c.braid) {
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
  if (c.headgear) c.headgear(A, hb, hc, hr);
  // Umhang gebogen, mit Futter und Saum
  if (c.cape) {
    const cs = belly ? 1.5 : 1;
    A(capeGeo(false), c.cape, { bone: BH.cape, p: [0, shY + 0.02, 0.02], s: [cs, 1, cs], shade: 0.25 });
    A(capeGeo(true), c.lining || darker(c.cape, 0.25), { bone: BH.cape, p: [0, shY + 0.02, 0.02], s: [cs, 1, cs] });
    if (c.capeTrim) A(torus3(0.34 * cs, 0.014, 1.9, 4, 14), c.capeTrim, { bone: BH.cape, p: [0, shY - 0.66, 0.02], r: [Math.PI / 2, 0, Math.PI / 2 + 0.95 - Math.PI], shine: 0.7 });
  }
  if (c.scarf) {
    A(torus3(0.11, 0.045, Math.PI * 2, 5, 16), c.scarf, { bone: BH.chest, p: [0, neckY + 0.0, 0], r: [Math.PI / 2 - 0.1, 0, 0] });
    for (const sx of [-1, 1]) A(roundBox(0.09, 0.55, 0.022, 0.011), sx > 0 ? c.scarf : darker(c.scarf, 0.12), { bone: BH.cape, p: [sx * 0.05, shY - 0.3, -0.21], r: [0.08, 0, sx * 0.08], shade: 0.25 });
  }
  if (c.quiver) {
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
  // Waffen
  const handR = [-shX, shY - armLen - armR * 0.5, 0.02];
  const handL = [shX, shY - armLen - armR * 0.5, 0.02];
  if (c.weapon) weapon3(A, c.weapon.kind, c.weapon.tier, BH.handR, handR, WEAPON_HOLD[c.weapon.kind] || [1.1, 0, 0], true);
  if (c.offhand) {
    const h = WEAPON_HOLD[c.offhand.kind] || [1.1, 0, 0];
    weapon3(A, c.offhand.kind, c.offhand.tier, BH.handL, handL, [h[0], -h[1], -h[2]], false);
  }
  if (c.shield != null) shield3(A, c.shield, BH.handL, [shX + 0.1, shY - armLen * 0.6, 0.06]);
  let top = hc[1] + hr * (c.hair && c.hair.style === 1 ? 1.3 : 1.05);
  if (c.tall) top += c.tall;
  return { rig, height: top, family: 'human', shY, hipY, shX, hc, hr, belly };
}

// Haltung der Waffe in der Hand (Drehung des Griffs)
const WEAPON_HOLD = {
  sword: [0.45, 0, 0.5], greatsword: [0.35, 0, 0.42], dagger: [0.8, 0, 0.35], bow: [0.2, 0, 0], fan: [0.7, 0, 0.3],
  bell: [0.5, 0, 0], staff: [0.22, 0, 0.08], skullstaff: [0.22, 0, 0.08], scythe: [0.3, 0, 0.1], axe: [0.6, 0, 0.45], greataxe: [0.35, 0, 0.42], club: [0.6, 0, 0.45]
};

// --- Kopfbedeckungen der vier Klassen -------------------------------------------------------------

function kriegerHelm(L) {
  const A0 = ARMOR_LOOK.krieger;
  const steel = lookColor(A0.helm, L.h, '#8f98a3');
  const plume = lookColor(A0.crest, L.h, '#c8402f');
  const brass = lookColor(A0.trim, L.a, '#c9a35a');
  return (A, hb, hc, hr) => {
    // Kabuto: Kuppel, breite Krempe, Nackenschutz, Wangenschutz, Helmbusch, Stirnzier
    A(cap3(hr * 1.1, Math.PI * 0.55, 0, Math.PI * 2, 18, 9), steel, { bone: hb, p: [hc[0], hc[1] + hr * 0.04, hc[2] - hr * 0.02], r: [-0.18, 0, 0], top: lighter(steel, 0.3), topK: 0.4, shine: 0.9 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI - Math.PI / 2;
      A(roundBox(hr * 0.06, hr * 0.5, hr * 0.06, hr * 0.03), darker(steel, 0.15), { bone: hb, p: [hc[0] + Math.sin(a) * hr * 1.0, hc[1] + hr * 0.62, hc[2] + Math.cos(a) * hr * 0.5 - hr * 0.1], r: [-0.5 * Math.cos(a), 0, -0.6 * Math.sin(a)] });
    }
    A(torus3(hr * 1.08, hr * 0.08, Math.PI * 2, 5, 24), brass, { bone: hb, p: [hc[0], hc[1] + hr * 0.14, hc[2]], r: [Math.PI / 2 - 0.18, 0, 0], shine: 1 });
    A(geo3('neckguard', () => new THREE.SphereGeometry(1, 16, 6, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.45, Math.PI * 0.28)), steel, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2]], s: hr * 1.22, r: [0, Math.PI, 0], shine: 0.6 });
    for (const sx of [-1, 1]) A(roundBox(hr * 0.2, hr * 0.6, hr * 0.34, hr * 0.08), steel, { bone: hb, p: [hc[0] + sx * hr * 0.94, hc[1] - hr * 0.2, hc[2] + hr * 0.12], r: [0, 0, sx * 0.08], shine: 0.6 });
    A(geo3('plume2', () => new THREE.SphereGeometry(1, 14, 10).scale(0.15, 0.24, 0.46)), plume, { bone: hb, p: [hc[0], hc[1] + hr * 1.15, hc[2] - hr * 0.25], s: hr / 0.33, shade: 0.3 });
    A(torus3(hr * 0.32, hr * 0.05, Math.PI, 4, 12), brass, { bone: hb, p: [hc[0], hc[1] + hr * 0.5, hc[2] + hr * 0.98], r: [0.35, 0, 0], shine: 1 });
    if (L.h >= 3 && L.h < 6) for (const sx of [-1, 1]) A(horn3(hr * 0.8, hr * 0.15, 8), '#e8dcc0', { bone: hb, p: [hc[0] + sx * hr * 0.75, hc[1] + hr * 0.5, hc[2]], r: [0, 0, -sx * 0.9], shine: 0.4 });
    if (L.h >= 4) A(sphere3(hr * 0.09, 8, 6), STAFF_ORB[L.h], { bone: hb, p: [hc[0], hc[1] + hr * 0.42, hc[2] + hr * 1.08], mat: 'glow' });
    if (L.h >= 6) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) A(roundBox(hr * (0.75 - k * 0.15), hr * 0.18, hr * 0.05, hr * 0.08), '#ffffff', { bone: hb, p: [hc[0] + sx * hr * (1.15 + k * 0.08), hc[1] + hr * (0.5 + k * 0.16), hc[2] - hr * 0.1], r: [0, 0, sx * (0.5 + k * 0.25)], mat: L.h >= 7 ? 'glow' : 'lit' });
  };
}

function ninjaHood(L, scarf) {
  const hood = lookColor(ARMOR_LOOK.ninja.hood, L.h, '#2a2633');
  return (A, hb, hc, hr) => {
    A(cap3(hr * 1.1, Math.PI * 0.82, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02], shade: 0.2 });
    A(flipGeo(cap3(hr * 1.08, Math.PI * 0.82, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9)), darker(hood, 0.4), { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02] });
    A(cap3(hr * 1.12, Math.PI * 0.42), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.08, hc[2]], r: [-0.05, 0, 0] });
    // Maske über Mund und Nase, Kapuzenzipfel hinten
    A(geo3('ninjamask2', () => new THREE.SphereGeometry(1, 18, 8, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.55, Math.PI * 0.4)), scarf, { bone: hb, p: hc, s: hr * 1.06, shade: 0.2 });
    for (const sx of [-1, 1]) limbBetween(A, [hc[0] + sx * hr * 0.3, hc[1] + hr * 0.2, hc[2] - hr * 0.95], [hc[0] + sx * hr * 0.55, hc[1] - hr * 0.9, hc[2] - hr * 1.5], hr * 0.13, hr * 0.05, hood, { bone: hb });
    if (L.h >= 4) {
      A(torus3(hr * 1.08, hr * 0.06, Math.PI * 2, 4, 22), lookColor(ARMOR_LOOK.ninja.scarf, L.h, scarf), { bone: hb, p: [hc[0], hc[1] + hr * 0.42, hc[2]], r: [Math.PI / 2 - 0.15, 0, 0] });
      A(roundBox(hr * 0.42, hr * 0.2, hr * 0.06, hr * 0.04), '#c7ccd3', { bone: hb, p: [hc[0], hc[1] + hr * 0.45, hc[2] + hr * 1.06], shine: 1 });
    }
  };
}

function shamanBand(L, gold) {
  if (L.h === -2) return null;
  const band = lookColor(ARMOR_LOOK.schamane.band, L.h, gold);
  return (A, hb, hc, hr) => {
    A(torus3(hr * 1.06, hr * 0.07, Math.PI * 2, 5, 24), band, { bone: hb, p: [hc[0], hc[1] + hr * 0.4, hc[2]], r: [Math.PI / 2 - 0.12, 0, 0], shine: 0.6 });
    A(sphere3(hr * 0.1, 8, 6), L.h >= 4 ? '#ffffff' : '#c8402f', { bone: hb, p: [hc[0], hc[1] + hr * 0.5, hc[2] + hr * 1.04], mat: L.h >= 4 ? 'glow' : 'lit' });
    for (const [dx, dy, c] of [[0.9, 0.7, '#e8dcc0'], [1.02, 0.5, '#c8402f']]) A(geo3('feather2', () => new THREE.SphereGeometry(1, 10, 6).scale(0.05, 0.3, 0.012)), c, { bone: hb, p: [hc[0] + hr * dx, hc[1] + hr * dy, hc[2] - hr * 0.2], r: [0, 0, -0.5 - dy * 0.3], s: hr / 0.33 });
    if (L.h >= 3) for (let k = -2; k <= 2; k++) A(horn3(hr * (0.3 + (L.h >= 5 ? 0.1 : 0)), hr * 0.08, 5), band, { bone: hb, p: [hc[0] + Math.sin(k * 0.45) * hr * 1.03, hc[1] + hr * 0.5, hc[2] + Math.cos(k * 0.45) * hr * 1.03], r: [0.2, 0, -k * 0.15], shine: 0.8 });
    if (L.h >= 6) A(torus3(hr * 0.7, hr * 0.05, Math.PI * 2, 4, 22), '#fff2b0', { bone: hb, p: [hc[0], hc[1] + hr * 1.5, hc[2]], r: [Math.PI / 2, 0, 0], mat: 'glow' });
  };
}

function nekroHood(L) {
  const hood = lookColor(ARMOR_LOOK.nekromant.hood, L.h, '#2a3b28');
  return (A, hb, hc, hr) => {
    A(cap3(hr * 1.14, Math.PI * 0.86, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02], shade: 0.2 });
    A(flipGeo(cap3(hr * 1.12, Math.PI * 0.86, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7)), '#0d120c', { bone: hb, p: [hc[0], hc[1] + hr * 0.05, hc[2] - hr * 0.02] });
    A(horn3(hr * 0.95, hr * 0.62, 12), hood, { bone: hb, p: [hc[0], hc[1] + hr * 0.62, hc[2] - hr * 0.25], r: [-0.45, 0, 0] });
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
    skin: skinOf(ap), eyeColor: eyeOpts(ap).color, eyeShape: ap.eyes || 0, mark: ap.mark || 0, female: ap.sex === 1, male: ap.sex === 0,
    hair: { style: ap.hair || 0, color: hairOf(ap) },
    weapon: { kind, tier: wtier }, boots: gt('b') >= 0 ? GEAR_LOOK.boots[gt('b')] : '#4d3527',
    bootTrim: gt('b') >= 3 ? TIER_METAL[gt('b')] : null,
    belt: gt('g') >= 0 ? GEAR_LOOK.belt[gt('g')] : '#3a2618'
  };
  if (gt('s') >= 0) {
    c.pads = GEAR_LOOK.plate[gt('s')];
    c.padTrim = TIER_METAL[gt('s')];
    c.spikes = gt('s') >= 3;
    c.padGem = gt('s') >= 4 ? STAFF_ORB[gt('s')] : null;
  }
  const capeT = eq.umhang ? eq.umhang.tier : -1;
  if (capeT >= 0) {
    c.cape = GEAR_LOOK.cape[capeT];
    c.lining = GEAR_LOOK.lining[capeT];
    c.capeTrim = capeT >= 2 ? TIER_METAL[capeT] : null;
  }
  if (eq.schild) {
    if (isOffhand(eq.schild)) c.offhand = { kind: eq.schild.kind, tier: eq.schild.tier };
    else c.shield = eq.schild.tier;
  }
  if (kind === 'dagger' && !eq.schild) c.offhand = { kind: 'dagger', tier: wtier };
  // Männer ohne Wangenröte und etwas breiter, Frauen mit Zopf unter Kapuze und Helm
  if (ap.sex === 0) { c.blush = false; c.bulk = 1.05; }
  if (p.classId === 'krieger') {
    const A0 = ARMOR_LOOK.krieger;
    const crimson = lookColor(A0.torso, L.a, '#9c3b33');
    const brass = lookColor(A0.trim, L.a, '#c9a35a');
    // Krieger: kräftig, Platte über Brust und Beinen, schwere Schultern, Fell und Wickelbänder (barbarisch)
    const plate = L.a >= 0 ? GEAR_LOOK.plate[L.a] : '#8a6a4a';
    const rim = L.a >= 0 ? TIER_METAL[L.a] : '#c9a35a';
    const fur = L.a >= 5 ? '#3a3230' : L.a >= 3 ? '#5a4030' : '#8a6a4a';
    Object.assign(c, {
      bulk: ap.sex === 1 ? 1.03 : 1.1, torso: crimson, sleeve: darker(crimson, 0.18), skirt: darker(crimson, 0.1), flap: darker(crimson, 0.25), pants: '#3b2d25', gloves: '#5a4030',
      buckle: brass, collar: brass, cuff: brass, rivet: brass, padStyle: 'plate', furCollar: fur, furBoots: fur, wideBelt: true,
      tassets: plate, tassetRim: rim, kneePads: L.a >= 1 ? rim : null, armBands: '#4a3020'
    });
    if (L.a >= 1) { c.cuirass = plate; c.cuirassRim = rim; } else c.lamellar = darker(crimson, 0.05);
    if (L.a >= 2) { c.greaves = plate; c.bracer = rim; } else c.legWraps = '#5a4030';
    if (L.a >= 3) { c.gauntlets = plate; c.greaveSpike = rim; }
    if (!c.pads) { c.pads = plate; c.padTrim = rim; c.spikes = L.a >= 3; }
    if (L.h !== -2) { c.headgear = kriegerHelm(L); c.covered = true; }
    if (ap.sex === 1 && c.covered) c.braid = hairOf(ap);
  } else if (p.classId === 'ninja') {
    const A0 = ARMOR_LOOK.ninja;
    const torso = lookColor(A0.torso, L.a, '#312c3d');
    const scarf = lookColor(A0.scarf, L.a, '#6b4f9a');
    // Ninja: nur Stoff und Leder – weite gebundene Hose, Wickelbänder, Ledergurte mit Wurfmessern, keine Platten
    const leather = L.a >= 4 ? '#2a2026' : '#4a3a2a';
    Object.assign(c, {
      torso, sleeve: darker(torso, 0.1), skirt: darker(torso, 0.15), flap: scarf, pants: darker(torso, 0.1), gloves: '#3d3848', scarf, straps: leather, crossStraps: true,
      eyeShape: 1, narrow: true, blush: false, noMouth: true, wraps: '#cdc8dc', collar: scarf, cuff: scarf, pouch: leather,
      baggy: true, legWraps: '#cdc8dc', tabi: true, kunai: L.a >= 0 ? TIER_METAL[Math.max(0, L.a)] : '#c7ccd3', holster: leather, padStyle: 'leather'
    });
    if (c.pads) { c.pads = mixColor(c.pads, leather, 0.6); c.padTrim = scarf; }
    if (kind === 'bow') c.quiver = '#6b4a2e';
    c.headgear = ninjaHood(L, scarf);
    c.covered = true;
    if (ap.sex === 1) c.braid = hairOf(ap);
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
    if (L.h >= 6) c.glowEyes = '#9fe8ff';
  } else if (p.classId === 'schamane') {
    const A0 = ARMOR_LOOK.schamane;
    const robe = lookColor(A0.robe, L.a, '#2c6f6a');
    const gold = lookColor(A0.gold, L.a, '#e0c36a');
    Object.assign(c, { torso: robe, sleeve: robe, robe, hemTrim: gold, wideSleeves: true, cuff: gold, collar: gold, gloves: c.skin, buckle: gold, sash: '#c8402f', beads: '#7a3a2a', belt: null, padStyle: 'cloth' });
    if (c.pads) { c.pads = mixColor(c.pads, robe, 0.55); c.padTrim = gold; }
    c.headgear = shamanBand(L, gold);
  } else {
    const A0 = ARMOR_LOOK.nekromant;
    const robe = lookColor(A0.robe, L.a, '#334a31');
    Object.assign(c, { torso: robe, sleeve: darker(robe, 0.12), robe, tattered: true, wideSleeves: true, gloves: c.skin, runes: '#a7e37f', blush: false, skullBelt: true, collar: darker(robe, 0.3), padStyle: 'bone' });
    if (c.pads) c.padTrim = gt('s') >= 3 ? lookColor(A0.glow, L.h, '#a7e37f') : null;
    else c.bonePads = true;
    c.headgear = nekroHood(L);
    c.covered = 'hood';
    if (ap.sex === 1) c.braid = hairOf(ap);
    c.glowEyes = lookColor(A0.glow, L.h, '#a7e37f');
    c.angry = false;
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
  }
  return c;
}

// --- Vierbeiner (Hunde, Wölfe, Eber, Bären, Drachen) ---------------------------------------------------
// Tiefe Brust, schmale Hüfte, Hals, Kopf mit Schnauze und Unterkiefer, Ohren mit hellem Innenteil,
// Fellbüschel, Beine mit Gelenk und Pfoten mit Zehen, buschiger Schwanz aus Gliedern.

function beast3(b, o, P) {
  const A = adder(b, P);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
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
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.16, len + 0.18], 1],
    [[0.15, bodyY - 0.05, len * 0.62], 1], [[-0.15, bodyY - 0.05, len * 0.62], 1], [[0.15, bodyY - 0.05, -len * 0.62], 1], [[-0.15, bodyY - 0.05, -len * 0.62], 1],
    [[0, bodyY + 0.08, -len * 0.95], 1], [[0.14, bodyY + 0.2, 0.05], 1], [[-0.14, bodyY + 0.2, 0.05], 1], [[0, bodyY + 0.1, len * 0.7], 1],
    [[0, hp[1] - 0.06, hp[2] + 0.06], 2]
  ]);
  const bw = bulky ? 1.3 : boar ? 1.15 : lean ? 0.84 : 1;
  // Rumpf: Brust vorn, Bauch, Hüfte hinten
  A(ball(16), fur, { bone: BQ.body, p: [0, bodyY + 0.03, len * 0.42], s: [0.26 * bw, 0.27 * bw, 0.3], shade: 0.25 });
  A(ball(14), fur, { bone: BQ.body, p: [0, bodyY, -len * 0.05], s: [0.23 * bw, 0.23 * bw, len * 0.62], shade: 0.25 });
  A(ball(14), fur, { bone: BQ.body, p: [0, bodyY + 0.02, -len * 0.55], s: [0.22 * bw, 0.22 * bw, 0.25], shade: 0.25 });
  A(ball(12), belly, { bone: BQ.body, p: [0, bodyY - (lean ? 0.06 : 0.1), len * 0.1], s: [0.18 * bw, lean ? 0.1 : 0.13, len * 0.7] });
  if (lean) A(ball(14), fur, { bone: BQ.body, p: [0, bodyY - 0.04, len * 0.45], s: [0.2 * bw, 0.26, 0.22], shade: 0.25 });
  // Fellzeichnung: dunkler Sattel (Schakal), Tupfen (Hyäne, Luchs), Streifen (Glutkatze)
  if (o.saddleFur) A(ball(12), o.saddleFur, { bone: BQ.body, p: [0, bodyY + 0.1, -len * 0.05], s: [0.17 * bw, 0.16, len * 0.66] });
  if (o.spots) for (let k = 0; k < 16; k++) {
    // Tupfen verstreut auf Flanken und Rücken (fest gestreut, damit jedes Tier gleich aussieht)
    const sx = k % 2 ? 1 : -1;
    const z = len * (0.6 - ((k * 37) % 13) / 13 * 1.25);
    const up = ((k * 53) % 7) / 7;
    A(sphere3(0.036 + (k % 3) * 0.008, 6, 4), o.spots, { bone: BQ.body, p: [sx * (0.2 - up * 0.08) * bw, bodyY - 0.04 + up * 0.22, z], s: [0.5, 1, 1.1] });
  }
  if (o.stripes) for (let k = 0; k < 6; k++) A(torus3(0.215 * bw, 0.016, Math.PI * 0.9, 4, 12), o.stripes, { bone: BQ.body, p: [0, bodyY + 0.01, len * (0.35 - k * 0.17)], r: [0, Math.PI / 2, Math.PI * 0.05], mat: o.glowStripes ? 'glow' : 'lit' });
  // Brustfell / Mähne als Büschel
  const ruff = o.mane || o.ruff;
  if (ruff || !o.small) for (let k = 0; k < 7; k++) {
    const a = -0.9 + (k / 6) * 1.8;
    A(horn3(0.16, 0.06, 5), ruff || lighter(fur, 0.12), { bone: BQ.body, p: [Math.sin(a) * 0.2 * bw, bodyY + 0.02 + Math.cos(a) * 0.08, len * 0.62], r: [1.9, 0, -a * 0.6], mat: o.glowMane && ruff === o.mane ? 'glow' : 'lit' });
  }
  if (o.ridge) for (let k = 0; k < 6; k++) A(horn3(boar ? 0.12 : 0.17, 0.045, 6), o.mane || dark, { bone: BQ.body, p: [0, bodyY + 0.21 * bw - Math.abs(k - 2.5) * 0.01, len * (0.55 - k * 0.22)], r: [-0.4, 0, 0] });
  // Beine: vorn gerade, hinten mit Sprunggelenk; Pfoten mit drei Zehen
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const top = [sx * 0.15 * bw, bodyY - 0.05, sz * len * 0.62];
    const mid = [sx * 0.16 * bw, legLen * 0.48, sz * len * 0.62 + (sz < 0 ? -0.07 : 0.02)];
    const paw = [sx * 0.16 * bw, 0.05, sz * len * 0.62 + 0.02];
    if (sz < 0) A(ball(10), fur, { bone, p: [top[0], top[1] - 0.04, top[2]], s: [0.1 * bw, 0.14, 0.13], shade: 0.2 });
    seg(top, mid, (bulky ? 0.09 : 0.075) * bw, 0.06 * bw, sz > 0 ? fur : dark, { bone, shade: 0.15 });
    seg(mid, paw, 0.06 * bw, 0.05 * bw, dark, { bone });
    A(ball(10), dark, { bone, p: [paw[0], 0.045, paw[2] + 0.02], s: [0.075 * bw, 0.05, 0.095] });
    for (const dx of [-0.035, 0, 0.035]) A(sphere3(0.026 * bw, 6, 4), darker(dark, 0.15), { bone, p: [paw[0] + dx * bw, 0.03, paw[2] + 0.09] });
  }
  // Hals und Kopf
  seg([0, bodyY + 0.05, len * 0.55], [0, hp[1] - 0.04, hp[2] - 0.08], 0.15 * bw, 0.12 * bw, fur, { bone: BQ.neck });
  A(ball(14), fur, { bone: BQ.head, p: hp, s: [0.18 * bw, 0.17 * bw, 0.18], shade: 0.15 });
  // Schnauze: oben spitz zulaufend, Unterkiefer dunkler, schwarze Nase
  const muz = o.cat ? 0.12 : bulky ? 0.17 : boar ? 0.2 : o.muzzle || 0.26;
  A(lathe3('muzzle' + muz, [[0, 0], [0.085, 0.02], [0.08, muz * 0.6], [0.055, muz], [0, muz + 0.005]], 12), o.snout || lighter(fur, 0.12), { bone: BQ.head, p: [0, hp[1] - 0.03, hp[2] + 0.08], r: [Math.PI / 2, 0, 0], s: [1.05 * bw, 1, 0.82] });
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
    // Ohren: rund beim Bären, sonst spitz mit hellem Inneren
    if (bulky && !o.wings && !boar) A(ball(10), dark, { bone: BQ.head, p: [sx * 0.13, hp[1] + 0.14, hp[2] - 0.05], s: [0.06, 0.06, 0.035] });
    else if (!o.noEars) {
      A(horn3(o.small ? 0.11 : 0.16, 0.06, 6), dark, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.12, hp[2] - 0.04], r: [-0.25, 0, -sx * 0.35], s: [1, 1, 0.6] });
      A(horn3(o.small ? 0.07 : 0.11, 0.035, 5), '#d8a8a0', { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.13, hp[2] - 0.025], r: [-0.25, 0, -sx * 0.35], s: [1, 1, 0.4] });
      if (o.tufts) A(horn3(0.08, 0.012, 4), o.tufts, { bone: BQ.head, p: [sx * 0.155, hp[1] + 0.27, hp[2] - 0.08], r: [-0.25, 0, -sx * 0.35] });
      if (o.bigEars) A(horn3(0.2, 0.08, 6), dark, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.1, hp[2] - 0.04], r: [-0.2, 0, -sx * 0.45], s: [1, 1, 0.5] });
    }
    // Augen: weiß, farbige Iris, schmale Pupille, böse Braue
    const eye = o.eye || '#3a2a1a';
    const ep = [sx * 0.095, hp[1] + 0.045, hp[2] + 0.14];
    if (o.glow) A(ball(10), eye, { bone: BQ.head, p: ep, s: [0.045, 0.035, 0.025], mat: 'glow' });
    else {
      A(ball(10), '#f4efe2', { bone: BQ.head, p: ep, s: [0.045, 0.04, 0.03] });
      A(ball(8), eye, { bone: BQ.head, p: [ep[0], ep[1], ep[2] + 0.012], s: [0.032, 0.032, 0.02], shine: 0.6 });
      A(ball(8), '#120c08', { bone: BQ.head, p: [ep[0], ep[1], ep[2] + 0.022], s: [0.012, 0.026, 0.012] });
    }
    if (o.angry) A(roundBox(0.085, 0.022, 0.03, 0.01), '#1a1210', { bone: BQ.head, p: [ep[0], ep[1] + 0.045, ep[2] + 0.005], r: [0, 0, sx * 0.45] });
    // Backenfell
    if (!boar) A(horn3(0.1, 0.045, 5), lighter(fur, 0.1), { bone: BQ.head, p: [sx * 0.15 * bw, hp[1] - 0.05, hp[2] + 0.02], r: [0, 0, -sx * 1.9], s: [1, 1, 0.6] });
    if (o.fangs) A(horn3(0.07, 0.018, 5), '#f4ecd8', { bone: BQ.head, p: [sx * 0.035, hp[1] - 0.09, hp[2] + 0.13 + muz * 0.6], r: [Math.PI, 0, 0] });
    if (o.tusk) A(horn3(boar ? 0.22 : 0.16, boar ? 0.04 : 0.03, 6), '#f4ecd8', { bone: BQ.head, p: [sx * 0.07, hp[1] - 0.07, hp[2] + 0.1 + muz * 0.7], r: [-0.7, 0, -sx * 0.45], shine: 0.4 });
    if (o.horns) A(horn3(0.36, 0.06, 8), o.horns, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.13, hp[2] - 0.08], r: [-1.0, 0, -sx * 0.35], shine: 0.4 });
  }
  if (o.scar) A(roundBox(0.02, 0.15, 0.02, 0.008), '#d8a0a0', { bone: BQ.head, p: [0.08, hp[1] + 0.06, hp[2] + 0.16], r: [0, 0, 0.4] });
  // Schwanz aus zwei Gliedern, buschig oder glatt
  if (o.tail !== false) {
    const t0 = [0, bodyY + 0.08, -len * 0.75];
    const t1 = [0, bodyY + 0.2, -len - 0.12];
    const t2 = [0, bodyY + 0.12, -len - 0.38];
    if (o.stub) {
      seg(t0, [0, bodyY + 0.16, -len - 0.1], 0.055, 0.045, fur, { bone: BQ.tail });
      A(ball(8), o.stub, { bone: BQ.tail, p: [0, bodyY + 0.17, -len - 0.12], s: [0.045, 0.045, 0.05] });
    } else if (o.longTail) {
      const t3 = [0, bodyY + 0.02, -len - 0.62];
      const t4 = [0, bodyY + 0.16, -len - 0.8];
      seg(t0, t1, 0.05, 0.045, fur, { bone: BQ.tail });
      seg(t1, t2, 0.045, 0.04, fur, { bone: BQ.tail });
      seg(t2, t3, 0.04, 0.035, fur, { bone: BQ.tail });
      seg(t3, t4, 0.035, 0.02, o.tailTip || fur, { bone: BQ.tail });
    } else if (o.bushy) {
      seg(t0, t1, 0.06, 0.09, fur, { bone: BQ.tail });
      seg(t1, t2, 0.09, o.tailTip ? 0.08 : 0.03, lighter(fur, 0.08), { bone: BQ.tail });
      if (o.tailTip) A(horn3(0.14, 0.08, 6), o.tailTip, { bone: BQ.tail, p: t2, r: [-1.9, 0, 0] });
    } else if (o.wings) {
      seg(t0, t1, 0.08, 0.06, fur, { bone: BQ.tail });
      seg(t1, t2, 0.06, 0.025, fur, { bone: BQ.tail });
      for (const t of [t1, t2]) A(horn3(0.1, 0.03, 5), o.mane || dark, { bone: BQ.tail, p: [t[0], t[1] + 0.05, t[2]], r: [-0.4, 0, 0] });
    } else {
      seg(t0, t1, 0.04, 0.03, fur, { bone: BQ.tail });
      seg(t1, t2, 0.03, 0.015, fur, { bone: BQ.tail });
    }
  }
  // Drachenflügel mit Fingerknochen und Bauchschuppen
  if (o.wings) {
    for (const [sx, bone] of [[1, BQ.wingL], [-1, BQ.wingR]]) {
      A(limb3(0.6, 0.04, 0.022, 6), darker(o.wings, 0.3), { bone, p: [sx * 0.14, bodyY + 0.2, 0.05], r: [0, 0, sx * 2.0] });
      for (const a of [0.35, 0.8]) A(limb3(0.45, 0.018, 0.01, 5), darker(o.wings, 0.3), { bone, p: [sx * 0.55, bodyY + 0.42, 0.05], r: [0, 0, sx * (Math.PI - a)] });
      A(wingGeo(), o.wings, { bone, p: [sx * 0.14, bodyY + 0.2, 0.0], s: [sx * 1.25, 1.25, 1.25] });
    }
    for (let k = 0; k < 4; k++) A(torus3(0.17, 0.02, Math.PI * 0.8, 4, 10), belly, { bone: BQ.body, p: [0, bodyY - 0.05, len * (0.4 - k * 0.25)], r: [0, 0, Math.PI * 1.1] });
  }
  if (o.saddle) {
    A(roundBox(0.38, 0.08, 0.36, 0.04), o.saddle, { bone: BQ.body, p: [0, bodyY + 0.25, -0.02] });
    A(roundBox(0.42, 0.14, 0.04, 0.02), darker(o.saddle, 0.3), { bone: BQ.body, p: [0, bodyY + 0.2, 0.12] });
  }
  return { rig, height: bodyY + 0.42, family: 'beast', bodyY, jaw: true };
}

// Pferd: lange Beine, langer Hals, Mähne, Hufe, Sattel (auch als Schmuck beim Stall)
function horseParts3(b, unused, o = {}) {
  const A = adder(b, o.parent || null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const coat = o.coat || '#8a5a34';
  const mane = o.mane || '#3a2618';
  const legLen = 0.62;
  const bodyY = legLen + 0.22;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.62, 0.78], 1],
    [[0.17, legLen + 0.05, 0.42], 1], [[-0.17, legLen + 0.05, 0.42], 1], [[0.17, legLen + 0.05, -0.42], 1], [[-0.17, legLen + 0.05, -0.42], 1],
    [[0, bodyY + 0.1, -0.62], 1], [[0, 0, 0], 1], [[0, 0, 0], 1], [[0, bodyY + 0.2, 0.5], 1]
  ]);
  A(ball(16), coat, { bone: BQ.body, p: [0, bodyY + 0.02, 0.28], s: [0.28, 0.3, 0.32], shade: 0.25 });
  A(ball(16), coat, { bone: BQ.body, p: [0, bodyY, -0.05], s: [0.27, 0.28, 0.5], shade: 0.25 });
  A(ball(14), coat, { bone: BQ.body, p: [0, bodyY + 0.03, -0.38], s: [0.27, 0.27, 0.3], shade: 0.25 });
  seg([0, bodyY + 0.12, 0.45], [0, bodyY + 0.6, 0.72], 0.15, 0.1, coat, { bone: BQ.neck, shade: 0.15 });
  for (let k = 0; k < 6; k++) A(horn3(0.14, 0.04, 5), mane, { bone: BQ.neck, p: [0, bodyY + 0.22 + k * 0.08, 0.46 + k * 0.05], r: [-1.6, 0, 0] });
  const hp = [0, bodyY + 0.62, 0.8];
  seg(hp, [0, hp[1] - 0.18, hp[2] + 0.32], 0.11, 0.085, coat, { bone: BQ.head });
  A(ball(10), lighter(coat, 0.2), { bone: BQ.head, p: [0, hp[1] - 0.18, hp[2] + 0.34], s: [0.09, 0.07, 0.08] });
  for (const sx of [-1, 1]) {
    A(horn3(0.13, 0.04, 6), coat, { bone: BQ.head, p: [sx * 0.06, hp[1] + 0.08, hp[2] - 0.04] });
    A(ball(8), '#1a120c', { bone: BQ.head, p: [sx * 0.085, hp[1] - 0.02, hp[2] + 0.12], s: [0.028, 0.034, 0.02], shine: 0.8 });
  }
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const top = [sx * 0.17, legLen + 0.05, sz * 0.42];
    const mid = [sx * 0.17, legLen * 0.45, sz * 0.42 + (sz < 0 ? -0.06 : 0.02)];
    seg(top, mid, 0.085, 0.06, coat, { bone, shade: 0.15 });
    seg(mid, [sx * 0.17, 0.08, sz * 0.42], 0.06, 0.05, coat, { bone });
    A(cyl3(0.065, 0.075, 0.08, 10), '#2a1c14', { bone, p: [sx * 0.17, 0.04, sz * 0.42], shine: 0.4 });
  }
  seg([0, bodyY + 0.12, -0.6], [0, bodyY - 0.35, -0.82], 0.08, 0.04, mane, { bone: BQ.tail });
  if (o.saddle) {
    A(roundBox(0.42, 0.1, 0.4, 0.05), o.saddle, { bone: BQ.body, p: [0, bodyY + 0.3, -0.02] });
    A(roundBox(0.48, 0.24, 0.04, 0.02), darker(o.saddle, 0.3), { bone: BQ.body, p: [0, bodyY + 0.16, -0.02], r: [0, Math.PI / 2, 0] });
    for (const sx of [-1, 1]) A(torus3(0.05, 0.012, Math.PI * 2, 4, 10), '#c9a35a', { bone: BQ.body, p: [sx * 0.3, bodyY - 0.05, -0.02], shine: 1 });
  }
  return { rig, height: bodyY + 0.9, family: 'horse', bodyY, seat: bodyY + 0.32 };
}

// --- Spinne, Skorpion, Geist, Schlange, Naga, Golem ------------------------------------------------

function spider3(b, o) {
  const A = adder(b, null);
  const legC = darker(o.body, 0.25);
  const bodyY = 0.42;
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY + 0.02, 0.28], 1]];
  for (let k = 0; k < 8; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.22 - Math.floor(k / 2) * 0.12], 1]);
  const rig = rigOf(list);
  // Hinterleib mit Streifen und Haaren
  A(ball(16), o.body, { bone: 1, p: [0, bodyY + 0.1, -0.34], s: [0.36, 0.31, 0.43], shade: 0.25, shine: 0.25 });
  for (let k = 0; k < 3; k++) A(torus3(0.3 - k * 0.04, 0.025, Math.PI, 4, 12), o.mark, { bone: 1, p: [0, bodyY + 0.12, -0.2 - k * 0.14], r: [0, Math.PI / 2, 0], s: [1, 1, 1] });
  A(ball(10), o.mark, { bone: 1, p: [0, bodyY + 0.37, -0.36], s: [0.13, 0.05, 0.16] });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    A(horn3(0.08, 0.016, 4), legC, { bone: 1, p: [Math.cos(a) * 0.33, bodyY + 0.12 + Math.sin(k) * 0.1, -0.34 + Math.sin(a) * 0.36], r: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2] });
  }
  // Kopfbruststück, Augenhaufen, Klauen
  A(ball(14), lighter(o.body, 0.08), { bone: 1, p: [0, bodyY + 0.02, 0.12], s: [0.22, 0.18, 0.24], shade: 0.2 });
  A(ball(12), lighter(o.body, 0.12), { bone: 2, p: [0, bodyY + 0.06, 0.32], s: [0.13, 0.11, 0.1] });
  const eyes = [[-0.05, 0.1, 1.2], [0.05, 0.1, 1.2], [-0.1, 0.07, 0.8], [0.1, 0.07, 0.8], [-0.03, 0.15, 0.7], [0.03, 0.15, 0.7], [-0.13, 0.12, 0.6], [0.13, 0.12, 0.6]];
  for (const [x, y, s] of eyes) A(sphere3(0.022 * s, 7, 5), o.eye, { bone: 2, p: [x, bodyY + y, 0.4], mat: 'glow' });
  for (const sx of [-1, 1]) {
    limbBetween(A, [sx * 0.05, bodyY - 0.02, 0.38], [sx * 0.04, bodyY - 0.12, 0.46], 0.03, 0.02, '#2a2018', { bone: 2 });
    A(horn3(0.08, 0.02, 5), '#e8e0cc', { bone: 2, p: [sx * 0.04, bodyY - 0.12, 0.46], r: [Math.PI - 0.6, 0, 0] });
  }
  for (let k = 0; k < 8; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.22 - row * 0.12;
    const spread = [0.75, 0.25, -0.25, -0.75][row];
    const knee = [sx * 0.5, bodyY + 0.26, z + spread * 0.42];
    const ankle = [sx * 0.7, 0.16, z + spread * 0.72];
    const foot = [sx * 0.8, 0.02, z + spread * 0.85];
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.048, 0.04, legC, { bone: 3 + k, seg: 6 });
    limbBetween(A, knee, ankle, 0.04, 0.03, legC, { bone: 3 + k, seg: 6 });
    limbBetween(A, ankle, foot, 0.03, 0.015, o.body, { bone: 3 + k, seg: 6 });
    A(sphere3(0.045, 7, 5), o.body, { bone: 3 + k, p: knee });
    A(sphere3(0.034, 7, 5), legC, { bone: 3 + k, p: ankle });
  }
  return { rig, height: bodyY + 0.45, family: 'spider', bodyY };
}

function scorpion3(b, o) {
  const A = adder(b, null);
  const bodyY = 0.3;
  const shell = darker(o.body, 0.12);
  const list = [[[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, bodyY, 0.32], 1], [[0, bodyY + 0.05, -0.3], 1]];
  for (let k = 0; k < 6; k++) list.push([[(k % 2 ? -1 : 1) * 0.16, bodyY, 0.12 - Math.floor(k / 2) * 0.14], 1]);
  const rig = rigOf(list);
  // Rumpf aus überlappenden Panzerplatten
  for (let k = 0; k < 4; k++) A(ball(14), k % 2 ? o.body : shell, { bone: 1, p: [0, bodyY + 0.02, 0.18 - k * 0.14], s: [0.27 - k * 0.02, 0.13, 0.12], shade: 0.25, shine: 0.4 });
  // Schwanz aus Gliedern, die nach oben einrollen, mit leuchtendem Stachel
  let prev = [0, bodyY + 0.06, -0.32];
  for (let k = 0; k < 5; k++) {
    const a = 0.4 + k * 0.42;
    const next = [0, bodyY + 0.06 + Math.sin(a) * 0.16 * (k + 1) * 0.55, -0.32 - Math.cos(a) * 0.14 * (k + 1) * 0.5];
    A(ball(10), k % 2 ? o.body : shell, { bone: 3, p: next, s: [0.1 - k * 0.008, 0.09 - k * 0.008, 0.1 - k * 0.008], shine: 0.4 });
    prev = next;
  }
  A(ball(10), o.sting, { bone: 3, p: [0, prev[1] + 0.06, prev[2] + 0.08], s: [0.07, 0.09, 0.07], mat: 'glow' });
  A(horn3(0.17, 0.035, 6), '#2a2018', { bone: 3, p: [0, prev[1] + 0.06, prev[2] + 0.12], r: [2.4, 0, 0] });
  // Scheren: Arm, Schere oben und beweglicher Finger
  for (const sx of [-1, 1]) {
    limbBetween(A, [sx * 0.15, bodyY, 0.22], [sx * 0.28, bodyY + 0.04, 0.42], 0.05, 0.045, o.body, { bone: 2 });
    A(ball(12), shell, { bone: 2, p: [sx * 0.3, bodyY + 0.05, 0.56], s: [0.08, 0.06, 0.13], shine: 0.4 });
    A(horn3(0.14, 0.035, 6), o.body, { bone: 2, p: [sx * 0.33, bodyY + 0.06, 0.64], r: [Math.PI / 2, 0, -sx * 0.25] });
    A(horn3(0.12, 0.03, 6), shell, { bone: 2, p: [sx * 0.27, bodyY + 0.03, 0.64], r: [Math.PI / 2, 0, sx * 0.3] });
    A(sphere3(0.025, 7, 5), '#2a1a0a', { bone: 1, p: [sx * 0.06, bodyY + 0.12, 0.27], shine: 0.8 });
  }
  for (let k = 0; k < 6; k++) {
    const sx = k % 2 ? -1 : 1;
    const row = Math.floor(k / 2);
    const z = 0.12 - row * 0.14;
    const knee = [sx * 0.36, bodyY + 0.1, z + (1 - row) * 0.12];
    limbBetween(A, [sx * 0.14, bodyY, z], knee, 0.035, 0.03, shell, { bone: 4 + k, seg: 6 });
    limbBetween(A, knee, [sx * 0.52, 0.02, z + (1 - row) * 0.22], 0.03, 0.016, shell, { bone: 4 + k, seg: 6 });
  }
  return { rig, height: bodyY + 0.9, family: 'scorpion', bodyY };
}

function ghost3(b, o) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.75, 0], 1], [[0, 1.0, 0], 2], [[0.26, 0.86, 0], 2], [[-0.26, 0.86, 0], 2]]);
  // schwebendes Gewand mit zerfetztem, leuchtendem Saum
  A(lathe3('ghost2', [[0, 0.95], [0.28, 0.9], [0.34, 0.72], [0.33, 0.45], [0.3, 0.22], [0.27, 0.05], [0, 0.04]], 18), o.body, { bone: 1, p: [0, 0.1, 0], shade: 0.15, top: lighter(o.body, 0.25), topK: 0.4 });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    A(horn3(0.16 + (k % 3) * 0.06, 0.07, 5), k % 2 ? o.body : lighter(o.body, 0.15), { bone: 1, p: [Math.cos(a) * 0.25, 0.16, Math.sin(a) * 0.25], r: [Math.PI, 0, 0] });
  }
  A(torus3(0.27, 0.03, Math.PI * 2, 4, 20), o.eye, { bone: 1, p: [0, 0.16, 0], r: [Math.PI / 2, 0, 0], mat: 'aura' });
  // Kapuze, dunkles Gesicht, glühende Augen
  A(cap3(0.33, Math.PI * 0.8, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6), o.body, { bone: 3, p: [0, 1.15, 0], shade: 0.15 });
  A(ball(14), '#0d1a2a', { bone: 3, p: [0, 1.12, 0.06], s: [0.24, 0.24, 0.22] });
  for (const sx of [-1, 1]) {
    A(ball(10), o.eye, { bone: 3, p: [sx * 0.09, 1.14, 0.25], s: [0.06, 0.08, 0.03], mat: 'glow' });
    limbBetween(A, [sx * 0.26, 0.86, 0], [sx * 0.42, 0.6, 0.12], 0.08, 0.04, o.body, { bone: sx > 0 ? 4 : 5 });
    for (let k = -1; k <= 1; k++) A(horn3(0.1, 0.02, 4), lighter(o.body, 0.2), { bone: sx > 0 ? 4 : 5, p: [sx * 0.42 + k * 0.02, 0.6, 0.12], r: [Math.PI + 0.3, 0, k * 0.3] });
  }
  if (o.crown) for (let k = -2; k <= 2; k++) A(horn3(0.16 - Math.abs(k) * 0.03, 0.04, 6), o.crown, { bone: 3, p: [k * 0.09, 1.4, Math.cos(k * 0.5) * 0.05], mat: o.crown === '#ffffff' ? 'lit' : 'glow' });
  return { rig, height: 1.48, family: 'ghost', bodyY: 0.3 };
}

// Schlange als ein glatter, biegsamer Schlauch: jeder Eckpunkt hängt weich an zwei Gliedern,
// Bänderung und hellerer Bauch als Eckenfarben.
function serpentBody(o, segs) {
  const key = `snake:${o.body}:${o.belly}:${o.mark}:${segs}`;
  return geo3(key, () => {
    const pts = [];
    for (let k = 0; k <= segs; k++) pts.push(new THREE.Vector3(Math.sin(k * 0.9) * 0.08, 0.13, 0.42 - k * 0.16));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubular = segs * 6;
    const radial = 10;
    const g = new THREE.TubeGeometry(curve, tubular, 0.13, radial, false);
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const si = new Uint8Array(pos.count * 4);
    const sw = new Float32Array(pos.count * 4);
    const cb = new THREE.Color(o.body);
    const cm = new THREE.Color(o.mark);
    const cl = new THREE.Color(o.belly);
    const p = new THREE.Vector3();
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
      // Bauch unten hell, Rücken mit Bändern
      const band = Math.sin(u * segs * Math.PI * 1.5) > 0.55;
      const c = nor.getY(i) < -0.2 ? cl : band ? cm : cb;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      const f = u * segs;
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
  A(serpentBody(o, segs), null, { shade: 0.15, shine: 0.3 });
  if (o.rattle) for (let k = 0; k < 3; k++) A(ball(8), '#e8d0a0', { bone: segs, p: [Math.sin(segs * 0.9) * 0.08, 0.14, 0.42 - segs * 0.16 - 0.04 - k * 0.06], s: [0.05 - k * 0.008, 0.035, 0.035], shine: 0.4 });
  if (naga) {
    // Oberkörper mit Rüstung, Kopf mit Haaren, Krone und Waffe
    const nb = 1;
    A(lathe3('nagatorso2', [[0, 0], [0.17, 0], [0.2, 0.15], [0.19, 0.32], [0.1, 0.4], [0, 0.41]], 14), o.skin, { bone: nb, p: [0, 0.2, 0.42], shade: 0.15 });
    A(roundBox(0.4, 0.2, 0.27, 0.08), o.armor, { bone: nb, p: [0, 0.44, 0.44], top: lighter(o.armor, 0.2), topK: 0.4, shine: 0.8 });
    A(torus3(0.17, 0.02, Math.PI * 2, 4, 16), o.trim, { bone: nb, p: [0, 0.34, 0.44], r: [Math.PI / 2, 0, 0], shine: 0.8 });
    for (const sx of [-1, 1]) A(cap3(0.1, Math.PI * 0.5), o.armor, { bone: nb, p: [sx * 0.2, 0.58, 0.44], r: [0, 0, -sx * 0.4], shine: 0.8 });
    const hc = [0, 0.86, 0.46];
    const hr = 0.24;
    A(ball(16), o.skin, { bone: nb, p: hc, s: [hr, hr * 0.95, hr * 0.96] });
    face3(A, nb, hc, hr, { eyeColor: o.eye, angry: true, skin: o.skin, blush: false, hairColor: o.hair });
    hair3(A, nb, hc, hr, 2, o.hair, false);
    for (let k = -2; k <= 2; k++) A(horn3(0.12 - Math.abs(k) * 0.02, 0.025, 5), '#e8c84a', { bone: nb, p: [hc[0] + k * 0.06, hc[1] + 0.24, hc[2] + 0.06], shine: 1 });
    for (const sx of [-1, 1]) limbBetween(A, [sx * 0.2, 0.58, 0.44], [sx * 0.3, 0.4, 0.6], 0.05, 0.04, o.skin, { bone: nb });
    if (o.staff) {
      A(limb3(1.1, 0.025, 0.022, 6), '#5a3f2a', { bone: nb, p: [-0.3, 0.95, 0.6] });
      A(sphere3(0.07, 10, 8), o.staff, { bone: nb, p: [-0.3, 1.0, 0.6], mat: 'glow' });
    } else {
      A(limb3(1.0, 0.022, 0.02, 6), '#8a6a3a', { bone: nb, p: [-0.3, 0.9, 0.6], r: [0.3, 0, 0] });
      for (const dx of [-0.05, 0, 0.05]) A(horn3(0.12, 0.02, 5), '#d9dde2', { bone: nb, p: [-0.3 + dx, 0.9, 0.62], shine: 1 });
    }
    return { rig, height: 1.12, family: 'serpent', bodyY: 0.12, naga: true };
  }
  // Kopf: aufgerichteter Hals, Schädel mit Kiefer, Schlitzaugen, gespaltene Zunge, Haube
  const hb = 1;
  const hc = [0, 0.52, 0.5];
  limbBetween(A, [0, 0.16, 0.38], [0, 0.48, 0.46], 0.12, 0.1, o.body, { bone: hb });
  A(ball(14), o.body, { bone: hb, p: hc, s: [0.14, 0.1, 0.19], shine: 0.3 });
  A(ball(12), o.belly, { bone: hb, p: [0, hc[1] - 0.05, hc[2] + 0.05], s: [0.11, 0.05, 0.16] });
  for (const sx of [-1, 1]) {
    A(ball(8), o.eye, { bone: hb, p: [sx * 0.085, hc[1] + 0.035, hc[2] + 0.09], s: [0.032, 0.03, 0.025], mat: 'glow' });
    A(ball(6), '#120c08', { bone: hb, p: [sx * 0.09, hc[1] + 0.035, hc[2] + 0.11], s: [0.006, 0.024, 0.008] });
  }
  if (o.hood) {
    A(ball(14), o.hood, { bone: hb, p: [0, 0.4, 0.4], s: [0.32, 0.27, 0.05] });
    A(ball(12), o.body, { bone: hb, p: [0, 0.41, 0.375], s: [0.3, 0.25, 0.04] });
  }
  for (const sx of [-1, 1]) A(roundBox(0.012, 0.008, 0.07, 0.003), '#c8302a', { bone: hb, p: [sx * 0.012, hc[1] - 0.04, hc[2] + 0.24], r: [0, sx * 0.3, 0] });
  A(roundBox(0.014, 0.008, 0.09, 0.003), '#c8302a', { bone: hb, p: [0, hc[1] - 0.04, hc[2] + 0.17] });
  return { rig, height: 0.64, family: 'serpent', bodyY: 0.12 };
}

// Golem aus Felsbrocken mit leuchtenden Rissen (Lava, Eis, Stein, Titanen)
function golem3(b, c) {
  const A = adder(b, null);
  const res = humanoid3(new Bake3(true), Object.assign({}, c, { belly: true }));
  const hipY = res.hipY;
  const shY = res.shY;
  const rock = c.skin;
  const glow = c.cracks || '#ffb04a';
  const R = (v, bone, p, s, top) => A(rockGeo(v), rock, { bone, p, s, top: top || lighter(rock, 0.2), topK: 0.5, shade: 0.3 });
  R(2, BH.chest, [0, hipY + 0.27, 0.0], [0.45, 0.36, 0.34]);
  R(0, BH.hips, [0, hipY, 0], [0.38, 0.28, 0.32]);
  R(1, BH.head, [0, shY + 0.3, 0.08], [0.21, 0.2, 0.2]);
  for (const [sx, ab, hb, lb] of [[1, BH.armL, BH.handL, BH.legL], [-1, BH.armR, BH.handR, BH.legR]]) {
    R(1, ab, [sx * 0.46, shY, 0], [0.24, 0.22, 0.24]);
    R(0, ab, [sx * 0.5, shY - 0.24, 0.02], [0.17, 0.2, 0.17]);
    R(2, hb, [sx * 0.5, shY - 0.5, 0.06], [0.22, 0.2, 0.22]);
    R(1, lb, [sx * 0.17, 0.2, 0], [0.17, 0.22, 0.18]);
  }
  for (const [x, y, r] of [[-0.15, 0.3, 0.5], [0.12, 0.18, -0.6], [0.0, 0.42, 0.1], [0.2, 0.36, 0.9]]) A(roundBox(0.03, 0.2, 0.03, 0.012), glow, { bone: BH.chest, p: [x, hipY + y * 0.8, 0.33], r: [0, 0, r], mat: 'glow' });
  for (const sx of [-1, 1]) A(ball(8), glow, { bone: BH.head, p: [sx * 0.085, shY + 0.33, 0.27], s: [0.05, 0.035, 0.03], mat: 'glow' });
  A(roundBox(0.12, 0.025, 0.02, 0.01), glow, { bone: BH.head, p: [0, shY + 0.22, 0.27], mat: 'glow' });
  if (c.crown) for (let k = -2; k <= 2; k++) A(horn3(0.16, 0.04, 5), c.crown, { bone: BH.head, p: [k * 0.08, shY + 0.48, 0.06], mat: 'glow' });
  return { rig: res.rig, height: shY + 0.45, family: 'human', shY, hipY, shX: res.shX, hc: [0, shY + 0.3, 0.08], hr: 0.21, belly: true, golem: true };
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
      limbBetween(A, base, midp, hr * (big ? 0.2 : 0.14), hr * (big ? 0.15 : 0.1), h.horns, { bone: hb, shine: 0.4 });
      A(horn3(hr * (big ? 0.6 : 0.4), hr * (big ? 0.15 : 0.1), 7), h.horns, { bone: hb, p: midp, r: [0, 0, -sx * (big ? 0.3 : 0.1)], shine: 0.4 });
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
  const own = MON3_BUILD[id] || (t && t.raid && MON3_BUILD[t.raid.art]);
  if (!def && !own) return Object.assign(beast3(b, { fur: t.color }), { scale: 1, style: attackStyle(id) });
  const o = def ? def.o : {};
  let res;
  if (own) res = own(b);
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
      const h = HEAD3[id] || (t.raid && HEAD3[t.raid.art]) || {};
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
        res = golem3(b, Object.assign(c, { cracks: o.cracks || h.cracks }));
        break;
      }
      c.headgear = headExtras(h, c.skin);
      res = humanoid3(b, c);
      // Brocken stehen vornübergebeugt mit Buckel
      if (t.shape === 'brute') res.hunch = 0.2;
    }
  }
  monsterFlair3(b, res, id, def);
  res.style = attackStyle(id);
  // etwas größer als früher, damit man die Einzelheiten sieht
  res.scale = (def ? def.scale : 1) * 1.15 * (t && t.raid ? t.raid.scale : 1) * (own && t.scale3 ? t.scale3 : 1);
  return res;
}

// --- Monster-Schmuck (seit 6.5): passend zum Gebiet Stacheln, Kristalle, Knochen oder Glut,
// dazu Krallen, Fänge, leuchtende Augen; je höher die Stufe, desto mehr; starke Monster mit Rüstung und Leuchtkreis.
const MON3_THEMES = {
  wild: { spike: '#5a4632', glow: '#ffcc4a' },
  forest: { spike: '#3e4a2a', glow: '#c8ff6a', leaf: '#4f7a32' },
  desert: { spike: '#d8b878', glow: '#ffd34d', metal: '#8a6a44' },
  war: { spike: '#6a6f78', glow: '#ff8a4a', metal: '#5a5e66' },
  hell: { spike: '#2a1414', glow: '#ff4a2a', hot: true },
  frost: { spike: '#bfe8ff', glow: '#7fd8ff', ice: true },
  rot: { spike: '#d8d0b8', glow: '#8fe36a', bone: true },
  fire: { spike: '#3a1a10', glow: '#ffb04a', hot: true },
  jungle: { spike: '#2f6a4a', glow: '#7ad8c8' },
  storm: { spike: '#8a8f9a', glow: '#9fd0ff', metal: '#6a6f78' },
  cave: { spike: '#3a2a40', glow: '#b48cff' }
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
      for (const g of z.groups || []) if (!mon3ThemeOf[g[0]]) mon3ThemeOf[g[0]] = th;
      if (z.dungeon) for (const m of [...(z.dungeon.mobs || []), z.dungeon.boss]) if (!mon3ThemeOf[m]) mon3ThemeOf[m] = th;
    }
  }
  const t = MONSTER_TYPES[id];
  return MON3_THEMES[mon3ThemeOf[id] || (t && t.raid && mon3ThemeOf[t.raid.art]) || 'wild'];
}

function monsterFlair3(b, res, id, def) {
  const t = MONSTER_TYPES[id];
  if (!t || !res) return;
  const th = monsterTheme3(id);
  const A = adder(b, null);
  const tier = Math.min(1, (t.level || 1) / 70);
  const elite = (t.hpMul || 1) >= 1.6 || t.boss;
  const spikeMat = th.hot ? 'glow' : 'lit';
  const spikeCol = th.ice ? '#d8f2ff' : th.hot ? th.glow : th.spike;
  const nSpikes = Math.round(2 + tier * 6);
  const o = def ? def.o || {} : {};
  if (res.family === 'beast' && !res.custom) {
    const bodyY = res.bodyY;
    const bulky = !!o.bulky;
    const boar = !!o.tusk && !o.wings && o.small;
    const bw = bulky ? 1.3 : boar ? 1.15 : 1;
    const len = o.long || 0.44;
    const hp = [0, bodyY + 0.2, len + 0.2];
    // Rückenstacheln bzw. Eiskristalle / Glutzacken
    if (t.level >= 6) for (let k = 0; k < nSpikes; k++) {
      const z = len * 0.5 - (k / Math.max(1, nSpikes - 1)) * len * 1.1;
      const h = (0.1 + 0.12 * tier) * (1 - Math.abs(k - nSpikes / 2) / nSpikes * 0.6);
      A(horn3(h, 0.035 + 0.02 * tier, 6), spikeCol, { bone: BQ.body, p: [0, bodyY + 0.2 * bw, z], r: [-0.35, 0, 0], mat: spikeMat, shine: th.ice ? 1 : 0.4 });
      if (th.ice && k % 2 === 0) A(horn3(h * 0.7, 0.03, 5), '#9fdcff', { bone: BQ.body, p: [0.07 * bw, bodyY + 0.17 * bw, z], r: [-0.3, 0, -0.5], shine: 1 });
    }
    // Krallen an allen Pfoten
    for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
      for (const dx of [-0.035, 0, 0.035]) A(horn3(0.05 + 0.02 * tier, 0.012, 4), '#f0e8d4', { bone, p: [sx * 0.16 * bw + dx * bw, 0.025, sz * len * 0.62 + 0.115], r: [Math.PI / 2 + 0.4, 0, 0], shine: 0.5 });
      // Fellbüschel am Ellbogen
      A(horn3(0.07, 0.03, 5), darker(o.fur || t.color, 0.1), { bone, p: [sx * 0.19 * bw, bodyY * 0.55, sz * len * 0.62 - 0.05], r: [-2.2, 0, sx * 0.3] });
    }
    // Leuchtende Augen (über den gemalten Augen), Atemwolke bei Eis, Glut im Maul bei Feuer
    for (const sx of [-1, 1]) A(sphere3(0.022, 7, 5), th.glow, { bone: BQ.head, p: [sx * 0.095, hp[1] + 0.045, hp[2] + 0.165], mat: 'glow' });
    if (!o.fangs && !boar) for (const sx of [-1, 1]) A(horn3(0.06, 0.016, 5), '#f4ecd8', { bone: BQ.head, p: [sx * 0.035, hp[1] - 0.09, hp[2] + 0.17], r: [Math.PI, 0, 0] });
    if (th.hot) A(ball(8), th.glow, { bone: BQ.head, p: [0, hp[1] - 0.08, hp[2] + 0.2], s: [0.05, 0.02, 0.06], mat: 'glow' });
    // starke Tiere: Knochenplatten oder Rüstung auf den Schultern, Halsband mit Dornen
    if (elite) {
      for (const sx of [-1, 1]) A(cap3(0.12 * bw, Math.PI * 0.5), th.metal || darker(th.spike, 0.1), { bone: BQ.body, p: [sx * 0.17 * bw, bodyY + 0.12, len * 0.45], r: [0, 0, -sx * 0.7], shine: 0.7 });
      A(torus3(0.15 * bw, 0.025, Math.PI * 2, 4, 14), th.metal || '#3a2a1a', { bone: BQ.neck, p: [0, bodyY + 0.12, len * 0.68], r: [0.5, 0, 0], shine: 0.6 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        A(horn3(0.05, 0.015, 4), '#d9dde2', { bone: BQ.neck, p: [Math.cos(a) * 0.16 * bw, bodyY + 0.12 + Math.sin(a) * 0.08, len * 0.68 + Math.sin(a) * 0.06], r: [Math.sin(a) * 1.5 + 0.5, 0, -Math.cos(a) * 1.5], shine: 1 });
      }
    }
  } else if (res.family === 'human') {
    const { shY, hipY, shX = 0.25, hc = [0, shY + 0.3, 0.02], hr = 0.3 } = res;
    // Schulterstacheln ab Stufe 20 (Glutzacken, Eis, Knochen, Metall)
    if (t.level >= 20) for (const [sx, bone] of [[1, BH.armL], [-1, BH.armR]]) {
      const n = Math.round(1 + tier * 3);
      for (let k = 0; k < n; k++) A(horn3(0.08 + 0.08 * tier, 0.03, 6), th.bone ? '#e8e0c8' : spikeCol, { bone, p: [sx * (shX + 0.02), shY + 0.08, 0.05 - k * 0.07], r: [-0.2, 0, -sx * (0.5 + k * 0.15)], mat: spikeMat, shine: 0.7 });
    }
    // Rückenzacken oder Kristalle zwischen den Schultern
    if (t.level >= 30 && !res.golem) for (let k = 0; k < Math.round(1 + tier * 3); k++) A(horn3(0.12 + 0.06 * tier, 0.035, 6), spikeCol, { bone: BH.chest, p: [(k - 1) * 0.08, shY - 0.04, -0.2], r: [-0.9, 0, (k - 1) * 0.25], mat: spikeMat, shine: 0.8 });
    // glühende Augen bei allem, was nicht wie ein Mensch aussieht
    if (t.shape !== 'humanoid' || t.level >= 50) for (const sx of [-1, 1]) A(sphere3(0.026, 7, 5), th.glow, { bone: BH.head, p: [hc[0] + sx * hr * 0.32, hc[1] + hr * 0.08, hc[2] + hr * 0.92], mat: 'glow' });
    // Gürtel mit Schädel (Moder), Trophäen-Zähne (Orks), Brustplatte (starke Krieger)
    if (th.bone || t.shape === 'orc') {
      A(sphere3(0.07, 8, 6), '#e8e0c8', { bone: BH.hips, p: [0.12, hipY + 0.02, 0.17], shine: 0.3 });
      for (let k = 0; k < 5; k++) A(horn3(0.06, 0.014, 4), '#f0e8d4', { bone: BH.chest, p: [-0.12 + k * 0.06, shY - 0.1 - Math.abs(k - 2) * 0.02, 0.2], r: [Math.PI, 0, 0] });
    }
    if (elite && !res.golem) {
      A(roundBox(0.34, 0.2, 0.06, 0.03), th.metal || darker(t.color, 0.35), { bone: BH.chest, p: [0, shY - 0.14, 0.17], shine: 0.8, top: lighter(th.metal || t.color, 0.2), topK: 0.4 });
      A(sphere3(0.035, 8, 6), th.glow, { bone: BH.chest, p: [0, shY - 0.13, 0.21], mat: 'glow' });
    }
    if (res.golem) {
      // Kristalle wachsen aus Schultern und Rücken
      for (let k = 0; k < 3 + Math.round(tier * 3); k++) {
        const sx = k % 2 ? 1 : -1;
        A(horn3(0.18 + (k % 3) * 0.06, 0.06, 5), th.ice ? '#bfe8ff' : th.glow, { bone: BH.chest, p: [sx * (0.15 + (k % 3) * 0.1), shY + 0.05, -0.15 - (k % 2) * 0.08], r: [-0.6, 0, -sx * 0.5], mat: th.ice ? 'lit' : 'glow', shine: 1 });
      }
    }
  } else if (res.family === 'spider') {
    const bodyY = res.bodyY;
    // Dornen auf dem Hinterleib, leuchtende Zeichnung, große Kieferklauen, Haare an den Beinen
    for (let k = 0; k < nSpikes; k++) {
      const a = -0.9 + (k / Math.max(1, nSpikes - 1)) * 1.8;
      A(horn3(0.1 + 0.08 * tier, 0.03, 5), spikeCol, { bone: 1, p: [Math.sin(a) * 0.22, bodyY + 0.36, -0.34 + Math.cos(a) * 0.12], r: [-0.3, 0, -Math.sin(a) * 0.8], mat: spikeMat, shine: 0.5 });
    }
    A(ball(10), th.glow, { bone: 1, p: [0, bodyY + 0.385, -0.42], s: [0.07, 0.02, 0.1], mat: 'glow' });
    for (const sx of [-1, 1]) A(horn3(0.13, 0.03, 6), '#1a120c', { bone: 2, p: [sx * 0.045, bodyY - 0.04, 0.42], r: [Math.PI - 0.9, 0, sx * 0.2], shine: 0.6 });
  } else if (res.family === 'scorpion') {
    const bodyY = res.bodyY;
    for (let k = 0; k < 4; k++) A(horn3(0.07 + 0.05 * tier, 0.025, 5), spikeCol, { bone: 1, p: [0, bodyY + 0.14, 0.18 - k * 0.14], r: [-0.4, 0, 0], mat: spikeMat, shine: 0.6 });
    for (const sx of [-1, 1]) A(sphere3(0.02, 7, 5), th.glow, { bone: 1, p: [sx * 0.06, bodyY + 0.13, 0.29], mat: 'glow' });
  } else if (res.family === 'ghost') {
    // Ketten um den Leib und schwebende Seelenlichter
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      A(torus3(0.035, 0.01, Math.PI * 2, 4, 8), '#8a8f9a', { bone: 1, p: [Math.cos(a) * 0.32, 0.55 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.32], r: [0, a, k % 2 ? 0 : Math.PI / 2], shine: 1 });
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      A(sphere3(0.05, 8, 6), th.glow, { bone: 3, p: [Math.cos(a) * 0.45, 1.05 + k * 0.08, Math.sin(a) * 0.45], mat: 'glow' });
    }
  } else if (res.family === 'serpent') {
    // Rückenflossen / Stacheln entlang des Körpers, Fänge
    for (let k = 1; k < 7; k++) A(horn3(0.08 + 0.06 * tier, 0.03, 5), res.naga ? th.spike : spikeCol, { bone: k, p: [Math.sin(k * 0.9) * 0.08, 0.26, 0.42 - k * 0.16], r: [-0.5, 0, 0], mat: spikeMat, shine: 0.6 });
    if (!res.naga) for (const sx of [-1, 1]) A(horn3(0.06, 0.012, 4), '#f4ecd8', { bone: 1, p: [sx * 0.04, 0.46, 0.66], r: [Math.PI, 0, 0] });
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
      A(roundBox(0.06, 0.12, 0.02, 0.01), col, { bone: 0, p: [Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62], r: [-Math.PI / 2, 0, a], mat: 'glow' });
    }
    A(torus3(0.62, 0.02, Math.PI * 2, 4, 36), col, { bone: 0, p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], mat: 'aura' });
    A(torus3(0.75, 0.012, Math.PI * 2, 4, 36), col, { bone: 0, p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
    const headBone = res.family === 'beast' ? BQ.head : res.family === 'human' ? BH.head : 1;
    const hp = res.crownAt || res.family === 'beast' ? res.crownAt || [0, res.bodyY + 0.33, (o.long || 0.44) + 0.14] : res.family === 'human' ? [res.hc[0], res.hc[1] + res.hr * 0.95, res.hc[2]] : [0, top * 0.95, 0.2];
    for (let k = -2; k <= 2; k++) A(horn3(0.16 - Math.abs(k) * 0.025, 0.035, 6), '#ffd34d', { bone: headBone, p: [hp[0] + k * 0.06, hp[1], hp[2] - Math.abs(k) * 0.02], r: [-0.2, 0, -k * 0.25], mat: 'glow' });
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
      A(sphere3(0.07, 8, 6), '#c9a35a', { p: [Math.cos(a) * 0.62, 0.92 + Math.sin(a) * 0.62, 0.1], shine: 1 });
    }
    return { rig, height: 1.7, family: 'portal' };
  }
  if (id === 'eingang' || id === 'raid') {
    // Großes Steintor (seit 6.5): zwei Säulen mit Feuerschalen, Bogen mit Schlussstein, wirbelndes Portal,
    // Stufen davor und Runenkreis am Boden. Endboss-Tor dunkler, mit Schädel und Hörnern.
    const raid = id === 'raid';
    const stone = raid ? '#3a3034' : '#7a7268';
    const top = raid ? '#5a4a50' : '#a49a8c';
    A(roundBox(1.9, 0.12, 0.9, 0.04), darker(stone, 0.1), { p: [0, 0.06, 0.18], top, topK: 0.4 });
    A(roundBox(1.6, 0.1, 0.7, 0.04), stone, { p: [0, 0.16, 0.12], top, topK: 0.4 });
    for (const sx of [-1, 1]) {
      A(roundBox(0.34, 1.5, 0.34, 0.06), stone, { p: [sx * 0.72, 0.9, 0], top, topK: 0.5, shade: 0.3 });
      A(roundBox(0.44, 0.12, 0.44, 0.04), darker(stone, 0.15), { p: [sx * 0.72, 0.2, 0] });
      A(roundBox(0.44, 0.1, 0.44, 0.04), darker(stone, 0.15), { p: [sx * 0.72, 1.62, 0] });
      // Feuerschale oben auf der Säule
      A(cyl3(0.16, 0.1, 0.12, 12), '#3a2a20', { p: [sx * 0.72, 1.74, 0], shine: 0.5 });
      A(horn3(0.32, 0.13, 8), color, { p: [sx * 0.72, 1.8, 0], mat: 'glow' });
      A(horn3(0.2, 0.07, 8), '#fff2c0', { p: [sx * 0.72, 1.82, 0], mat: 'glow' });
      // Runenband an der Säule
      for (let k = 0; k < 3; k++) A(roundBox(0.05, 0.14, 0.02, 0.01), color, { p: [sx * 0.72, 0.6 + k * 0.32, 0.18], mat: 'glow' });
    }
    A(geo3('gatearch2', () => new THREE.TorusGeometry(0.72, 0.17, 10, 26, Math.PI)), stone, { p: [0, 1.55, 0], top, topK: 0.4, shade: 0.2 });
    A(roundBox(0.26, 0.3, 0.26, 0.05), raid ? '#e8e0c8' : top, { p: [0, 2.28, 0.04] });
    if (raid) {
      for (const sx of [-1, 1]) A(horn3(0.5, 0.09, 8), '#e8dcc0', { p: [sx * 0.24, 2.35, 0.04], r: [0, 0, -sx * 0.9], shine: 0.5 });
      for (const sx of [-1, 1]) A(sphere3(0.04, 8, 6), color, { p: [sx * 0.06, 2.3, 0.18], mat: 'glow' });
    }
    // Portalfläche: Rand, Wirbel, heller Kern (Knochen 1 dreht sich)
    A(new THREE.CircleGeometry(0.55, 30), darker(color, 0.55), { p: [0, 1.55, 0.04], mat: 'aura' });
    A(geo3('portalbody', () => new THREE.PlaneGeometry(1.1, 1.35)), darker(color, 0.55), { p: [0, 0.9, 0.04], mat: 'aura' });
    for (let k = 0; k < 3; k++) A(geo3('swirl' + k, () => new THREE.TorusGeometry(0.16 + k * 0.13, 0.035, 6, 28, Math.PI * 1.4)), k % 2 ? '#ffffff' : color, { bone: 1, p: [0, 1.2, 0.08 + k * 0.005], r: [0, 0, k * 2.1], mat: 'glow' });
    A(new THREE.CircleGeometry(0.14, 18), '#ffffff', { bone: 1, p: [0, 1.2, 0.1], mat: 'aura' });
    // Runenkreis am Boden
    A(geo3('gatering2', () => new THREE.RingGeometry(1.05, 1.18, 40).rotateX(-Math.PI / 2)), color, { p: [0, 0.03, 0.2], mat: 'aura' });
    for (let k = 0; k < 10; k++) {
      const a2 = (k / 10) * Math.PI * 2;
      A(roundBox(0.06, 0.01, 0.12, 0.004), color, { p: [Math.cos(a2) * 1.25, 0.03, 0.2 + Math.sin(a2) * 1.25], r: [0, -a2, 0], mat: 'glow' });
    }
    const rig2 = rigOf([[[0, 0, 0], -1], [[0, 1.2, 0.08], 0]]);
    return { rig: rig2, height: 2.4, family: 'portal' };
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

// Riss (seit 6.5): großer gezackter Spalt aus schwarzem Stein in der Luft, darin ein Wirbel in der
// Farbe des Dungeons, ringsum schwebende Felssplitter und leuchtende Risse im Boden
function buildRift3(b, color = '#b48cff') {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 1.25, 0], 0], [[0, 0.9, 0], 0]]);
  // Bodenrisse
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    A(roundBox(0.06, 0.012, 0.7 + (k % 3) * 0.2, 0.005), color, { p: [Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55], r: [0, -a + Math.PI / 2, 0], mat: 'glow' });
  }
  A(geo3('riftfloor', () => new THREE.CircleGeometry(1.2, 28).rotateX(-Math.PI / 2)), darker(color, 0.5), { p: [0, 0.015, 0], mat: 'aura' });
  // gezackter Rahmen aus dunklen Steinzacken um einen hohen Spalt
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const len = 0.28 + (k % 3) * 0.12;
    A(horn3(len, 0.09, 5), k % 2 ? '#1a1220' : '#2a1e34', { bone: 1, p: [Math.cos(a) * 0.62, 1.25 + Math.sin(a) * 1.0, 0], r: [0, 0, a - Math.PI / 2], shine: 0.4 });
    if (k % 2 === 0) A(horn3(len * 0.6, 0.03, 4), color, { bone: 1, p: [Math.cos(a) * 0.6, 1.25 + Math.sin(a) * 0.98, 0.04], r: [0, 0, a - Math.PI / 2], mat: 'glow' });
  }
  A(geo3('riftvoid', () => new THREE.CircleGeometry(1, 30).scale(0.6, 1, 1)), '#0a0612', { bone: 1, p: [0, 1.25, -0.01] });
  for (let k = 0; k < 4; k++) A(geo3('riftswirl' + k, () => new THREE.TorusGeometry(0.16 + k * 0.11, 0.03, 6, 28, Math.PI * 1.3).scale(1, 1.6, 1)), k % 2 ? '#ffffff' : color, { bone: 1, p: [0, 1.25, 0.02], r: [0, 0, k * 1.7], mat: 'glow' });
  A(geo3('riftaura2', () => new THREE.SphereGeometry(1, 16, 12).scale(0.8, 1.3, 0.2)), color, { bone: 1, p: [0, 1.25, 0], mat: 'aura' });
  // schwebende Felssplitter (Knochen 2 kreist)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    A(rockGeo(k % 3), '#3a3040', { bone: 2, p: [Math.cos(a) * 1.1, 0.6 + (k % 3) * 0.35, Math.sin(a) * 1.1], s: [0.13, 0.11, 0.12], top: '#5a4a60', topK: 0.5 });
    A(sphere3(0.035, 6, 4), color, { bone: 2, p: [Math.cos(a) * 1.1, 0.75 + (k % 3) * 0.35, Math.sin(a) * 1.1], mat: 'glow' });
  }
  return { rig, height: 2.4, family: 'rift' };
}

// Seelenstein: Grundform, hellere Spitze, leuchtende Runen
// --- Seelenstein (Version 4.3): stumpfes Ei in einer Krallen-Wiege -----------------------------------

function eggPts(R, H, k = 0.14, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    pts.push([R * Math.sin(t) * (1 + k * Math.cos(t)), H * (1 - Math.cos(t)) / 2]);
  }
  return pts;
}
function eggGeo(R, H, k) {
  return lathe3(`egg${R},${H},${k}`, eggPts(R, H, k), 24);
}
// Punkt auf der Eioberfläche (Höhe 0..1, Winkel) – für Adern und Platten
function eggAt(R, H, k, u, a, out = 1) {
  const t = Math.acos(1 - 2 * u);
  const r = R * Math.sin(t) * (1 + k * Math.cos(t)) * out;
  return [Math.sin(a) * r, H * u, Math.cos(a) * r];
}

function buildStone3(b, st) {
  const A = adder(b, null);
  const L = st.look;
  const sh = L.shape;
  // Form des Eis je Stein (alle stumpf und rund, aber unterscheidbar)
  const R = sh === 'spire' ? 0.44 : sh === 'boulder' ? 0.6 : sh === 'monolith' ? 0.5 : 0.5;
  const H = sh === 'spire' ? 1.95 : sh === 'boulder' ? 1.5 : sh === 'monolith' ? 1.95 : 1.75;
  const k = sh === 'boulder' ? 0.16 : 0.12;
  const stone = mixColor('#8c867c', L.base, 0.35);
  const dark = new THREE.Color(L.base).getHSL({}).l < 0.14;
  const shell = lighter(L.base, dark ? 0.24 : 0.12);
  const y0 = 0.3;
  // Knochen: 0 Sockel, 1 Ei, 2 Runenring, 3–5 Risse, die bei 75/50/25 % Leben erscheinen
  const mid = [0, y0 - 0.3 + H * 0.5, 0];
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.3, 0], 0], [mid, 1], [mid, 1], [mid, 1]]);
  const vein = L.rune;
  // Sockel: flacher Felsring und Krallen, die das Ei halten
  A(lathe3('stbase3', [[0.72, 0], [0.74, 0.06], [0.66, 0.14], [0.68, 0.18], [0.5, 0.3], [0, 0.31]], 24), stone, { bone: 0, top: lighter(stone, 0.12), topK: 0.6 });
  A(torus3(0.69, 0.025, Math.PI * 2, 4, 32), L.rune, { bone: 0, p: [0, 0.16, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    A(rockGeo(i % 3), darker(stone, 0.12), { bone: 0, p: [Math.sin(a) * 0.86, 0.05, Math.cos(a) * 0.86], s: [0.1, 0.08 + (i % 2) * 0.04, 0.1], top: stone, topK: 0.5 });
  }
  const claws = sh === 'twin' ? 3 : 4;
  for (let i = 0; i < claws; i++) {
    const a = (i / claws) * Math.PI * 2 + Math.PI / claws;
    const p0 = [Math.sin(a) * 0.58, 0.24, Math.cos(a) * 0.58];
    const p1 = eggAt(R, H, k, 0.28, a, 1.12); p1[1] += y0;
    const p2 = eggAt(R, H, k, 0.52, a, 0.98); p2[1] += y0;
    limbBetween(A, p0, p1, 0.075, 0.06, stone, { bone: 0, seg: 8 });
    limbBetween(A, p1, p2, 0.06, 0.02, stone, { bone: 0, seg: 8 });
    A(ball(8), L.rune, { bone: 0, p: [p1[0] * 1.02, p1[1], p1[2] * 1.02], s: 0.045, mat: 'glow' });
  }
  // Das Ei (bei "twin" zwei verschmolzene Eier)
  const eggs = sh === 'twin' ? [[-0.24, 0.85, -0.12], [0.26, 0.75, 0.12]] : [[0, 1, 0]];
  for (const [ex, es, er] of eggs) {
    A(eggGeo(R, H, k), shell, { bone: 1, p: [ex, y0 - 0.3, 0], s: es, r: [0, 0, er], top: lighter(L.top, 0.15), topK: 0.4, shade: 0.3, shine: 0.6, ao: 0.05 });
  }
  // glühende Naht, wo das Ei in der Wiege sitzt, und weicher Schein um die Schale
  if (sh !== 'twin') {
    const q = eggAt(R, H, k, 0.1, 0, 1.0);
    A(torus3(Math.hypot(q[0], q[2]) + 0.01, 0.03, Math.PI * 2, 4, 32), L.rune, { bone: 1, p: [0, q[1] + y0 - 0.3, 0], r: [Math.PI / 2, 0, 0], mat: 'glow' });
    A(eggGeo(R, H, k), darker(L.glow, 0.72), { bone: 1, p: [0, y0 - 0.3 - H * 0.03, 0], s: 1.07, mat: 'aura' });
  }
  // Glühende Adern: verzweigte Risse von unten nach oben über die Schale
  const rnd = mulberry32(7 + STONE_TYPES.indexOf(st) * 13);
  const veins = sh === 'twin' ? 3 : 5;
  for (let v = 0; v < veins; v++) {
    let a = (v / veins) * Math.PI * 2 + rnd() * 0.5;
    let u = 0.12 + rnd() * 0.1;
    let prev = eggAt(R, H, k, u, a, 1.005);
    const steps = 4 + Math.floor(rnd() * 3);
    for (let s = 0; s < steps; s++) {
      u = Math.min(0.92, u + 0.1 + rnd() * 0.08);
      a += (rnd() - 0.5) * 0.7;
      const next = eggAt(R, H, k, u, a, 1.005);
      limbBetween(A, [prev[0], prev[1] + y0 - 0.3, prev[2]], [next[0], next[1] + y0 - 0.3, next[2]], 0.032, 0.022, vein, { bone: 1, mat: 'glow', seg: 5 });
      if (rnd() < 0.35) {
        const side = eggAt(R, H, k, u - 0.05, a + (rnd() < 0.5 ? -0.45 : 0.45), 1.005);
        limbBetween(A, [next[0], next[1] + y0 - 0.3, next[2]], [side[0], side[1] + y0 - 0.3, side[2]], 0.016, 0.008, vein, { bone: 1, mat: 'glow', seg: 5 });
      }
      prev = next;
    }
  }
  // Risse, die mit dem Schaden wachsen (hell glühend, breiter als die Adern)
  for (let stage = 0; stage < 3; stage++) {
    for (let v = 0; v < 2 + stage; v++) {
      let a = rnd() * Math.PI * 2;
      let u = 0.35 + rnd() * 0.35;
      let prev = eggAt(R, H, k, u, a, 1.01);
      for (let s = 0; s < 4; s++) {
        u = Math.max(0.08, Math.min(0.94, u + (rnd() - 0.5) * 0.3));
        a += (rnd() - 0.5) * 0.6;
        const next = eggAt(R, H, k, u, a, 1.01);
        limbBetween(A, [prev[0], prev[1] + y0 - 0.3, prev[2]], [next[0], next[1] + y0 - 0.3, next[2]], 0.045, 0.03, lighter(L.rune, 0.35), { bone: 3 + stage, mat: 'glow', seg: 5 });
        prev = next;
      }
    }
  }
  // Rune vorn: glühendes Auge / Zeichen im Ei
  const front = eggAt(R, H, k, 0.5, 0, 1.0);
  A(torus3(0.13, 0.022, Math.PI * 2, 4, 18), vein, { bone: 1, p: [front[0], front[1] + y0 - 0.3, front[2] + 0.005], mat: 'glow' });
  A(ball(10), lighter(L.glow, 0.3), { bone: 1, p: [front[0], front[1] + y0 - 0.3, front[2] - 0.01], s: [0.08, 0.1, 0.03], mat: 'glow' });
  // Schwebender Runenring (dreht sich)
  const ringY = y0 + H * 0.55;
  A(torus3(R + 0.32, 0.012, Math.PI * 2, 3, 40), L.glow, { bone: 2, p: [0, ringY - 0.3, 0], r: [Math.PI / 2 + 0.25, 0, 0], mat: 'aura' });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    A(lathe3('shard', [[0, 0], [0.06, 0.08], [0.04, 0.18], [0, 0.24]], 5), vein, { bone: 2, p: [Math.sin(a) * (R + 0.32), ringY - 0.3 + Math.cos(a) * 0.08, Math.cos(a) * (R + 0.32)], mat: 'glow' });
  }
  // Besonderheiten je Stein
  if (L.thorns) for (let i = 0; i < 9; i++) {
    const a = i * 0.7, u = 0.15 + (i % 4) * 0.18;
    const p = eggAt(R, H, k, u, a, 0.98);
    A(horn3(0.22, 0.05, 6), '#4a3220', { bone: 1, p: [p[0], p[1] + y0 - 0.3, p[2]], r: [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2] });
  }
  if (L.lava) {
    A(new THREE.CircleGeometry(0.75, 28).rotateX(-Math.PI / 2), '#ff6a1a', { bone: 0, p: [0, 0.32, 0], mat: 'glow' });
    for (let i = 0; i < 6; i++) { const a = i * 1.05; A(ball(8), '#ffb04a', { bone: 0, p: [Math.sin(a) * 0.7, 0.33, Math.cos(a) * 0.7], s: [0.06, 0.03, 0.06], mat: 'glow' }); }
  }
  if (L.ice) for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    A(lathe3('icespike2', [[0.09, 0], [0.07, 0.35], [0, 0.55]], 6), '#e8f6ff', { bone: 0, p: [Math.sin(a) * 0.78, 0.15, Math.cos(a) * 0.78], s: 0.7 + (i % 3) * 0.25, r: [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45], shine: 0.9 });
  }
  if (L.crystal || sh === 'cluster') for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + 0.4;
    const p = eggAt(R, H, k, 0.75 + (i % 2) * 0.1, a, 0.85);
    A(lathe3('crystal2', [[0.08, 0], [0.1, 0.25], [0.05, 0.38], [0, 0.44]], 6), L.crystal ? '#ff8a9a' : L.top, { bone: 1, p: [p[0], p[1] + y0 - 0.3, p[2]], r: [Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7], mat: L.crystal ? 'glow' : 'lit', shine: 0.8 });
  }
  if (sh === 'obelisk' || sh === 'monolith') for (const u of [0.3, 0.68]) {
    const p = eggAt(R, H, k, u, 0, 1.0);
    const rr = Math.hypot(p[0], p[2]);
    A(torus3(rr + 0.01, 0.035, Math.PI * 2, 5, 32), sh === 'monolith' ? '#c9a35a' : darker(L.base, 0.3), { bone: 1, p: [0, p[1] + y0 - 0.3, 0], r: [Math.PI / 2, 0, 0], shine: 0.7 });
  }
  if (L.crown) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = eggAt(R, H, k, 0.88, a, 1.0);
    A(horn3(0.32, 0.06, 6), '#e8c46a', { bone: 1, p: [p[0], p[1] + y0 - 0.3, p[2]], r: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], shine: 0.8 });
  }
  if (L.smoke) for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    A(ball(10), darker(L.base, 0.4), { bone: 2, p: [Math.sin(a) * 0.75, 0.45 + (i % 3) * 0.25, Math.cos(a) * 0.75], s: [0.22, 0.14, 0.22], mat: 'aura' });
  }
  A(new THREE.CircleGeometry(1.15, 32).rotateX(-Math.PI / 2), L.glow, { bone: 0, p: [0, 0.03, 0], mat: 'aura' });
  return { rig, height: y0 + H + 0.1, family: 'stone' };
}

// Beschworene Skelette
function buildSkeleton3(b) {
  const bone = '#ddd5bb';
  const res = humanoid3(b, {
    skin: bone, torso: '#4a4434', sleeve: bone, pants: '#3a3428', boots: '#2a241c', gloves: bone, belt: '#3a2a1c',
    weapon: { kind: 'sword', tier: 1 }, glowEyes: '#a7e37f', noMouth: true, noNose: true, noEars: true, blush: false, bonePads: true
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
  for (const k in m.geos) {
    m.geos[k].shared = true;
    // Spielraum für Bewegungen, damit Figuren am Bildrand nicht zu früh weggeschnitten werden
    if (m.geos[k].boundingSphere) m.geos[k].boundingSphere.radius *= 1.5;
  }
  MODELS3.set(key, m);
  // Spielerfiguren mit alter Ausrüstung nicht ewig behalten
  if (MODELS3.size > 160) {
    const used = new Set();
    for (const a of actors3.values()) used.add(a.modelKey);
    for (const [k, old] of MODELS3) {
      if (used.has(k) || k === key || k === 'warm') continue;
      MODELS3.delete(k);
      dropPool(k);
      for (const g in old.geos) old.geos[g].dispose();
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
    lit.castShadow = true;
    lit.receiveShadow = true;
    add('outline', model.geos.lit, figOutline());
  }
  if (model.geos.face) add('face', model.geos.face, a.mats.lit || (a.mats.lit = figLitMat()));
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

// --- Pool: Figuren wiederverwenden statt neu bauen ----------------------------------------------------

const actors3 = new Map();
const pool3 = new Map();
let poolSize3 = 0;
let targetRing3 = null;

function disposeActor(a) {
  for (const k in a.mats) a.mats[k].dispose();
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

function actorFor(key, modelKey, build) {
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
      a.lastY = null;
      a.want = null;
      a.lift = 0;
      setActorAlpha(a, 1);
      if (a.mats.lit) a.mats.lit.emissive.setRGB(0, 0, 0);
      a.group.rotation.set(0, 0, 0);
      a.group.scale.setScalar(a.model.scale);
    } else {
      const model = model3(modelKey, build);
      if (!model) return null;
      a = makeActor(model);
      a.modelKey = modelKey;
      a.heading = 0;
      a.lastX = null;
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
  return a.model.height * a.group.scale.x + (e.riding ? 0.62 : 0) + (a.lift || 0);
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
    V3.actors.add(a.group);
    V3.warm.push(a);
  }
  const ring = groundRing(new THREE.Color(0xffffff), false);
  V3.actors.add(ring);
  V3.gl.compile(V3.scene, V3.camera);
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
  for (const m of game.monsters) {
    if (m.isStone || Math.abs(m.x - p.x) > 1400 || Math.abs(m.y - p.y) > 1100) continue;
    const key = 'm:' + m.typeId;
    if (MODELS3.has(key)) continue;
    model3(key, (b) => monsterBuild(b, m.typeId));
    return;
  }
}

function monsterBuild(b, typeId) {
  const r = buildMonster3(b, typeId);
  r.blob = r.family === 'beast' ? 0.5 : r.family === 'spider' ? 0.6 : 0.45;
  return r;
}

// --- Figuren mit dem Spielgeschehen abgleichen ----------------------------------------------------------

function v3SyncActors(dt) {
  for (const a of actors3.values()) a.seen = false;
  const w = game.world;
  // nur, was im Bild ist (feste Kamera: nach Norden sieht man weiter; Schulterblick: Kreis vor der Figur)
  const near = (e) => v3InView(e.x, e.y);
  const p = game.player;
  if (game.player && game.running && !p.dead) syncPlayer3(p, dt);
  if (V3.extra) for (const ep of V3.extra) syncPlayer3(ep, dt);
  for (const rp of net.players.values()) if (!rp.dead && near(rp)) syncPlayer3(rp, dt);
  for (const c of game.clones) if (near(c)) syncPlayer3(c, dt);
  for (const m of game.monsters) if (!m.dead && near(m)) syncMonster3(m, dt);
  for (const al of game.allies) if (near(al)) syncAlly3(al, dt);
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
      if (kind === 'greatsword' || kind === 'greataxe' || kind === 'scythe') B[BH.armL].rotation.set(B[BH.armR].rotation.x * 0.8, 0, 0.5);
    }
    if (kind === 'dagger' && !(p.equipment && p.equipment.schild && !isOffhand(p.equipment.schild))) B[BH.armL].rotation.set(sw < 0.5 ? -1.2 : -2.0 + sw, 0, 0.2);
  } else if (!p.moving && !p.riding) {
    // Ruhehaltung mit der Waffe
    if (kind === 'greatsword' || kind === 'greataxe' || kind === 'scythe') B[BH.armL].rotation.set(-0.5, 0, 0.35);
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
    if (aura) {
      wg.color.set(SKILL_FX[aura.id].weaponGlow);
      wg.opacity = 0.55 + 0.25 * Math.sin(t * 8);
    } else if (band >= 2) {
      wg.color.set(PLUS_COLORS[band]);
      wg.opacity = 0.22 + band * 0.06 + 0.1 * Math.sin(t * 6);
    } else wg.opacity = 0;
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
}

// Monster: Blickrichtung aus der Bewegung, Laufen, Angreifen, Aufblitzen, Schweben
function syncMonster3(m, dt) {
  if (m.isStone) {
    syncStone3(m, dt);
    return;
  }
  const a = actorFor(entityKey(m), 'm:' + m.typeId, (b) => monsterBuild(b, m.typeId));
  if (!a) return;
  a.corpse = false;
  animateCreature(a, m, dt, m.moving, m.attackAnim > 0 ? m.attackAnim / 0.25 : 0, m.hitFlash || 0, m.windup > 0 ? 1 - m.windup / (m.windupMax || 0.4) : 0);
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
  const t = game.time + (e.id || 0) * 0.37;
  // Richtung: aus der Bewegung, beim Angriff zum Ziel (sonst zum Spieler)
  if (a.lastX != null) {
    const dx = e.x - a.lastX;
    const dy = e.y - a.lastY;
    if (dx * dx + dy * dy > 0.25) a.want = Math.atan2(dx, dy);
  }
  const foe = e.target && !e.target.dead ? e.target : game.player;
  if ((atk > 0 || wind > 0) && foe) a.want = Math.atan2(foe.x - e.x, foe.y - e.y);
  // im Stehen halb zur Kamera gedreht, damit Gesichter zu sehen sind
  if (a.want == null) a.want = e.facing < 0 ? -Math.PI / 2 + 0.55 : Math.PI / 2 - 0.55;
  turnToward(a, a.want, Math.min(1, dt * 10));
  a.lastX = e.x;
  a.lastY = e.y;
  const fam = a.model.family;
  // Monster mit Angriffsart bekommen eigene Posen (creatureAttackPose), sonst einfaches Vorschnellen
  const posed = !!a.model.style;
  const lunge = atk > 0 && !posed ? Math.sin(atk * Math.PI) : 0;
  let y = 0;
  if (fam === 'ghost') y = 0.2 + Math.sin(t * 2.5) * 0.08;
  placeActor(a, e, fy, y);
  a.group.rotation.set(0, a.heading, 0);
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
  // Ei schwebt leicht, pocht kurz, wenn eine Welle kommt; Runenring dreht sich
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

function syncAlly3(al, dt) {
  const a = actorFor(entityKey(al), 'skel', (b) => Object.assign(buildSkeleton3(b), { blob: 0.4 }));
  if (!a) return;
  animateCreature(a, al, dt, al.moving, al.attackAnim > 0 ? al.attackAnim / 0.25 : 0, 0);
}

function syncNpc3(n, dt) {
  let a;
  if (n.id === 'riss') {
    const col = DUNGEONS[n.dungeon].portal;
    a = actorFor(entityKey(n), 'rift:' + col, (b) => Object.assign(buildRift3(b, col), { blob: 0.3, scale: 1.25 }));
  }
  else if (n.id === 'eingang' || n.id === 'ausgang' || n.id === 'weltentor') {
    const col = n.id === 'weltentor' ? '#7ab8ff' : DUNGEONS[n.dungeon].portal;
    // Endboss-Tor: dunkler, mit Schädel und Hörnern, größer
    const raid = n.id === 'eingang' && DUNGEONS[n.dungeon].raid;
    const kind = raid ? 'raid' : n.id;
    a = actorFor(entityKey(n), 'portal:' + kind + col, (b) => Object.assign(buildPortal3(b, kind, col), { blob: 0.01, scale: raid ? 2.0 : n.id === 'eingang' ? 1.45 : n.id === 'weltentor' ? 1.25 : 1.1 }));
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
      // Spalt zur Kamera gedreht und pulsierend, Wirbel dreht sich, Splitter kreisen
      a.bones[1].rotation.z = Math.sin(game.time * 0.7) * 0.06;
      a.bones[1].scale.setScalar(1 + Math.sin(game.time * 4) * 0.04);
      a.bones[2].rotation.y = game.time * 0.6;
      a.bones[2].position.y += Math.sin(game.time * 1.5) * 0.06;
    }
    if (fam === 'portal' && a.bones[1]) a.bones[1].rotation.z = -game.time * 1.6;
  }
}

// Gefallene Monster kippen um und versinken im Boden (ohne Durchsichtigkeit: keine neuen Shader)
function syncCorpse3(e) {
  const key = entityKey(e);
  const a = actorFor(key, 'm:' + e.typeId, (b) => monsterBuild(b, e.typeId));
  if (!a) return;
  a.corpse = true;
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
