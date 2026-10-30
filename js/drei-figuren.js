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
const figShadowProxy = () => mat3('figShadowProxy', () => new THREE.MeshBasicMaterial({ skinning: true, colorWrite: false, depthWrite: false }));
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
      if (style === 3) {
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
      if (style === 6) for (let k = 0; k < 7; k++) {
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
    for (const sx of [-1, 1]) hairRing3(A, hb, hc, hr, 3, 0.2, 0.92, sx * 0.72, sx * 1.02, style === 2 ? 1.0 : 0.5, 0.13, 0.12, color, R, mess);
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
    if (!strands) for (const sx of [-1, 1]) {
      lock(A, hb, [x + sx * hr * 0.86, y + hr * 0.12, z + hr * 0.2], hr * (style === 2 ? 1.05 : 0.55), hr * 0.15, [2.95, 0, sx * 0.1], color);
      lock(A, hb, [x + sx * hr * 0.8, y + hr * 0.15, z - hr * 0.2], hr * (style === 2 ? 0.95 : 0.45), hr * 0.15, [-2.95, 0, sx * 0.16], darker(color, 0.06));
    } else if (style !== 7) for (const sx of [-1, 1]) hairRing3(A, hb, hc, hr, 4, 0.12, 0.9, sx * 1.35, sx * 2.0, style === 10 ? 1.25 : 0.55, 0.15, style === 10 ? 0.3 : 0.12, color, R, mess);
  }
  // Hinterkopf: unter der Kapuze nur bei langem Haar und Pferdeschwanz (sonst ganz verdeckt)
  if (covered === 'hood' && style !== 2 && style !== 4) return;
  A(ball(16), color, { bone: hb, p: [x, y - hr * 0.02, z - hr * 0.22], s: [hr * 1.04, hr * 0.98, hr * 0.84], shade: 0.25 });
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
  // headZ: Kopf etwas nach vorn (schlanke Wegelagerer)
  const hc = [0, neckY + hr * 0.84, (belly ? 0.1 : 0.02) + (c.headZ || 0)];
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
      A(lathe3('robe2', [[0, 0], [0.31, 0], [0.32, 0.03], [0.28, 0.2], [0.23, 0.4], [0.2, 0.47], [0, 0.48]], 20), c.robe, { bone: BH.hips, p: [0, 0.02, 0], s: [1, 1, 0.88], shade: 0.25, shine: c.robeShine || 0 });
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
  // mit Maske sitzt das Tuch auf dem Kiefer statt darin
  A(ball(14), c.skin, { bone: hb, p: [hc[0], hc[1] - hr * 0.28, hc[2] + hr * (c.masked ? 0.08 : 0.12)], s: [hr * 0.86, hr * 0.62, hr * 0.8] });
  if (!c.noEars) for (const sx of [-1, 1]) {
    if (c.pointEars) A(horn3(hr * 0.55, hr * 0.14, 6), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.9, hc[1], hc[2]], r: [0, 0, -sx * 1.25] });
    else A(ball(8), c.skin, { bone: hb, p: [hc[0] + sx * hr * 0.97, hc[1] - hr * 0.06, hc[2]], s: [hr * 0.1, hr * 0.17, hr * 0.14] });
  }
  if (c.brow) A(roundBox(hr * 1.4, hr * 0.2, hr * 0.3, hr * 0.1), c.skin, { bone: hb, p: [hc[0], hc[1] + hr * 0.12, hc[2] + hr * 0.75], shade: 0.3 });
  face3(A, hb, hc, hr, Object.assign({ hairColor: c.hair ? c.hair.color : null }, c));
  if (c.beard && c.beardGlow) A(ball(12), c.beard, { bone: hb, p: [hc[0], hc[1] - hr * 0.62, hc[2] + hr * 0.42], s: [hr * 0.64, hr * 0.52, hr * 0.44], shade: 0.2, mat: 'glow' });
  else if (c.beard) beard3(A, hb, hc, hr, c.beard, c.beardKind, c.rnd || mulberry32(5));
  if (c.tusks) for (const sx of [-1, 1]) A(horn3(hr * 0.34, hr * 0.085, 6), '#f4ecd8', { bone: hb, p: [hc[0] + sx * hr * 0.3, hc[1] - hr * 0.6, hc[2] + hr * 0.78], r: [-0.25, 0, sx * 0.15], shine: 0.4 });
  if (c.hair) hair3(A, hb, hc, hr, c.hair.style, c.hair.color, typeof c.covered === 'string' ? c.covered : !!c.covered, c.rnd);
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
  // Ausrüstung mit eigener Form je Stufe (Rüstung, Schultern, Stiefel, Gürtel, Umhang): drei-ausruestung.js
  const g = {
    hipY, chestY, shY, shX, neckY, hipX, legR, legLen, armLen, armR, hc, hr, bk, belly, female: !!c.female,
    cuirass: !!c.cuirass, greaves: !!c.greaves,
    beltY: c.sash ? hipY + 0.06 : hipY + (belly ? 0.06 : 0.02),
    beltZ: (c.sash ? 0.235 : c.wideBelt ? 0.228 : belly ? 0.4 : 0.212) * bk
  };
  if (c.gear) c.gear(A, g);
  if (c.cape && c.capeTier != null) gearCape3(A, g, c.capeTier, c.cape, c.lining);
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
  // Schultern, Umhang: Grundform hier, das Merkmal der Stufe baut drei-ausruestung.js
  if (gt('s') >= 0) {
    c.pads = GEAR_LOOK.plate[gt('s')];
    c.padTrim = TIER_METAL[gt('s')];
  }
  const capeT = eq.umhang ? eq.umhang.tier : -1;
  if (capeT >= 0) {
    c.cape = GEAR_LOOK.cape[capeT];
    c.lining = GEAR_LOOK.lining[capeT];
    c.capeTier = capeT;
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
      buckle: brass, collar: brass, cuff: brass, rivet: brass, padStyle: 'plate', furCollar: fur, furBoots: gt('b') < 1 ? fur : null, wideBelt: true,
      tassets: plate, tassetRim: rim, kneePads: L.a >= 1 ? rim : null, armBands: '#4a3020'
    });
    if (L.a >= 1) { c.cuirass = plate; c.cuirassRim = rim; } else c.lamellar = darker(crimson, 0.05);
    if (L.a >= 2) { c.greaves = plate; c.bracer = rim; } else c.legWraps = '#5a4030';
    if (L.a >= 3) { c.gauntlets = plate; c.greaveSpike = rim; }
    if (!c.pads) { c.pads = plate; c.padTrim = rim; c.spikes = L.a >= 3; }
    if (L.h !== -2) {
      c.headgear = kriegerHelm3(L.h, lookColor(A0.helm, L.h, '#8f98a3'), lookColor(A0.crest, L.h, '#c8402f'), lookColor(A0.trim, L.h, '#c9a35a'));
      c.covered = true;
    }
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
    c.headgear = ninjaHelm3(L.h, lookColor(A0.hood, L.h, '#2a2633'), scarf);
    c.covered = true;
    if (ap.sex === 1) c.braid = hairOf(ap);
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
    if (NINJA_EYES3[L.h]) c.glowEyes = NINJA_EYES3[L.h];
  } else if (p.classId === 'schamane') {
    const A0 = ARMOR_LOOK.schamane;
    const robe = lookColor(A0.robe, L.a, '#2c6f6a');
    const gold = lookColor(A0.gold, L.a, '#e0c36a');
    Object.assign(c, { torso: robe, sleeve: robe, robe, hemTrim: gold, wideSleeves: true, cuff: gold, collar: gold, gloves: c.skin, buckle: gold, sash: '#c8402f', beads: '#7a3a2a', belt: null, padStyle: 'cloth' });
    if (c.pads) { c.pads = mixColor(c.pads, robe, 0.55); c.padTrim = gold; }
    c.headgear = shamanHelm3(L.h, lookColor(A0.band, L.h, gold), gold);
    // Seidenhaube bedeckt das Haar
    if (L.h === 1) { c.covered = true; if (ap.sex === 1) c.braid = hairOf(ap); }
  } else {
    const A0 = ARMOR_LOOK.nekromant;
    const robe = lookColor(A0.robe, L.a, '#334a31');
    Object.assign(c, { torso: robe, sleeve: darker(robe, 0.12), robe, tattered: true, wideSleeves: true, gloves: c.skin, runes: '#a7e37f', blush: false, skullBelt: true, collar: darker(robe, 0.3), padStyle: 'bone' });
    if (c.pads) c.padTrim = gt('s') >= 3 ? lookColor(A0.glow, L.h, '#a7e37f') : null;
    else c.bonePads = true;
    c.headgear = nekroHelm3(L.h, lookColor(A0.hood, L.h, '#2a3b28'), lookColor(A0.glow, L.h, '#a7e37f'));
    c.covered = 'hood';
    if (ap.sex === 1) c.braid = hairOf(ap);
    c.glowEyes = lookColor(A0.glow, L.h, '#a7e37f');
    c.angry = false;
    if (!(ap.hair === 2 || ap.hair === 4)) c.hair = null;
  }
  // Stufenmerkmale: Rüstung (Grundform umstellen), dann alle Teile nach dem Körper
  armorLook3(c, p.classId, L.a);
  c.noBuckle = gt('g') >= 0;
  c.gear = gearAll3(p.classId, { a: L.a, s: gt('s'), b: gt('b'), g: gt('g') }, c);
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
  // Rumpf: Brust vorn, Bauch, Hüfte hinten
  A(ball(16), fur, coat({ bone: BQ.body, p: [0, bodyY + 0.03, len * 0.42], s: [0.26 * bw, 0.27 * bw, 0.3] }));
  A(ball(14), fur, coat({ bone: BQ.body, p: [0, bodyY, -len * 0.05], s: [0.23 * bw, 0.23 * bw, len * 0.62] }));
  A(ball(14), fur, coat({ bone: BQ.body, p: [0, bodyY + 0.02, -len * 0.55], s: [0.22 * bw, 0.22 * bw, 0.25] }));
  A(ball(12), belly, { bone: BQ.body, p: [0, bodyY - (lean ? 0.06 : 0.1), len * 0.1], s: [0.18 * bw, lean ? 0.1 : 0.13, len * 0.7] });
  if (lean) A(ball(14), fur, coat({ bone: BQ.body, p: [0, bodyY - 0.04, len * 0.45], s: [0.2 * bw, 0.26, 0.22] }));
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
  const flat = (len, r, color, p, d, x) => tuft(len, r, color, p, d, Object.assign({ s: [1, 1, 0.5] }, x));
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
  // Beine: vorn gerade, hinten mit Sprunggelenk; Pfoten mit drei Zehen (Füchse mit schwarzen Socken)
  const sock = o.socks || dark;
  for (const [bone, sx, sz] of [[BQ.legFL, 1, 1], [BQ.legFR, -1, 1], [BQ.legBL, 1, -1], [BQ.legBR, -1, -1]]) {
    const top = [sx * 0.15 * bw, bodyY - 0.05, sz * len * 0.62];
    const mid = [sx * 0.16 * bw, legLen * 0.48, sz * len * 0.62 + (sz < 0 ? -0.07 : 0.02)];
    const paw = [sx * 0.16 * bw, 0.05, sz * len * 0.62 + 0.02];
    if (sz < 0) A(ball(10), fur, coat({ bone, p: [top[0], top[1] - 0.04, top[2]], s: [0.1 * bw, 0.14, 0.13], shade: 0.2 }));
    seg(top, mid, (bulky ? 0.09 : 0.075) * bw, 0.06 * bw, sz > 0 ? fur : dark, { bone, shade: 0.15 });
    seg(mid, paw, 0.06 * bw, 0.05 * bw, sock, { bone });
    A(ball(10), sock, { bone, p: [paw[0], 0.045, paw[2] + 0.02], s: [(o.bigPaws ? 0.09 : 0.075) * bw, 0.05, o.bigPaws ? 0.11 : 0.095] });
    for (const dx of [-0.035, 0, 0.035]) A(sphere3(0.026 * bw, 6, 4), darker(sock, 0.15), { bone, p: [paw[0] + dx * bw, 0.03, paw[2] + 0.09] });
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
      const flop = o.floppy && sx < 0;
      const er = flop ? [0.9, 0, -sx * 1.5] : [-0.25, 0, -sx * 0.35];
      A(horn3(o.small ? 0.11 : 0.16, 0.06, 6), ear, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.12, hp[2] - 0.04], r: er, s: [1, flop ? 0.7 : 1, 0.6] });
      A(horn3(o.small ? 0.07 : 0.11, 0.035, 5), '#d8a8a0', { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.13, hp[2] - 0.025], r: er, s: [1, flop ? 0.7 : 1, 0.4] });
      if (o.tufts) A(horn3(0.08, 0.012, 4), o.tufts, { bone: BQ.head, p: [sx * 0.155, hp[1] + 0.27, hp[2] - 0.08], r: [-0.25, 0, -sx * 0.35] });
      if (o.bigEars) A(horn3(0.2, 0.08, 6), ear, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.1, hp[2] - 0.04], r: [-0.2, 0, -sx * 0.45], s: [1, 1, 0.5] });
    }
    // Augen: Tieraugen ohne viel Weiß – dunkler Lidrand, farbige Iris, Pupille, heller Glanzpunkt
    const eye = o.eye || '#3a2a1a';
    const ep = [sx * 0.095, hp[1] + 0.045, hp[2] + 0.14];
    if (o.glow) A(sphere3(1, 8, 6), eye, { bone: BQ.head, p: ep, s: [0.045, 0.033, 0.025], mat: 'glow' });
    else {
      A(sphere3(1, 8, 6), '#1a120c', { bone: BQ.head, p: ep, s: [0.045, 0.038, 0.028] });
      A(sphere3(1, 8, 6), eye, { bone: BQ.head, p: [ep[0], ep[1], ep[2] + 0.008], s: [0.035, 0.031, 0.022], shine: 0.7 });
      A(sphere3(1, 6, 4), '#0c0806', { bone: BQ.head, p: [ep[0], ep[1], ep[2] + 0.021], s: o.cat || o.slit ? [0.007, 0.025, 0.01] : [0.014, 0.016, 0.01] });
    }
    A(sphere3(1, 6, 4), '#ffffff', { bone: BQ.head, p: [ep[0] - sx * 0.01, ep[1] + 0.013, ep[2] + 0.024], s: 0.009, mat: 'glow' });
    if (o.angry) A(box3(), '#1a1210', { bone: BQ.head, p: [ep[0], ep[1] + 0.045, ep[2] + 0.005], r: [0, 0, sx * 0.45], s: [0.085, 0.022, 0.03] });
    // Backenfell (beim Luchs ein heller Backenbart aus zwei Büscheln)
    if (!boar) A(horn3(0.1, 0.045, 5), lighter(fur, 0.1), { bone: BQ.head, p: [sx * 0.15 * bw, hp[1] - 0.05, hp[2] + 0.02], r: [0, 0, -sx * 1.9], s: [1, 1, 0.6] });
    if (o.beard) tuft(0.13, 0.05, o.beard, [sx * 0.14 * bw, hp[1] - 0.09, hp[2] + 0.04], [sx, -0.7, -0.2], { bone: BQ.head });
    if (o.fangs) A(horn3(0.07, 0.018, 5), '#f4ecd8', { bone: BQ.head, p: [sx * 0.035, hp[1] - 0.09, hp[2] + 0.13 + muz * 0.6], r: [Math.PI, 0, 0], shine: 0.4 });
    if (o.tusk) A(horn3(boar ? 0.22 : 0.16, boar ? 0.04 : 0.03, 6), '#f4ecd8', { bone: BQ.head, p: [sx * 0.07, hp[1] - 0.07, hp[2] + 0.1 + muz * 0.7], r: [-0.7, 0, -sx * 0.45], shine: 0.4 });
    if (o.horns) {
      // Drachen: zwei große Hornzacken mit Ringen, dahinter eine Krone aus kleinen Zacken
      A(horn3(0.36, 0.06, 6), o.horns, { bone: BQ.head, p: [sx * 0.1, hp[1] + 0.13, hp[2] - 0.08], r: [-1.0, 0, -sx * 0.35], shine: 0.5 });
      for (const t of [0.07, 0.14]) A(torus3(0.05 - t * 0.12, 0.009, Math.PI * 2, 3, 8), darker(o.horns, 0.25), { bone: BQ.head, p: [sx * (0.1 + t * 0.29), hp[1] + 0.13 + t * 0.54, hp[2] - 0.08 - t * 0.84], r: [-1.0 + Math.PI / 2, 0, -sx * 0.35], noShadow: true });
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
      seg(t0, t1, 0.06, 0.09, fur, { bone: BQ.tail, top: back, topK: 0.55 });
      seg(t1, t2, 0.09, o.tailTip ? 0.08 : 0.05, lighter(fur, 0.08), { bone: BQ.tail, top: back, topK: 0.55 });
      if (o.tailTip) A(horn3(0.14, 0.08, 6), o.tailTip, { bone: BQ.tail, p: t2, r: [-1.9, 0, 0] });
      else tuft(0.13, 0.06, back, t2, [0, -0.35, -1], { bone: BQ.tail });
      // Fell steht seitlich ab
      for (const sx of [-1, 1]) tuft(0.1, 0.045, fur, t1, [sx, 0.3, -0.8], { bone: BQ.tail });
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

// Pferd (neu in 7.3): echte Pferde-Anatomie – tiefe Brust, Widerrist, runde Kruppe, gebogener Hals,
// keilförmiger Kopf mit Ganaschen, Nüstern und gespitzten Ohren, wehende Mähne und Schweif,
// Beine mit Knie bzw. Sprunggelenk, Fesseln und Hufen; Zaumzeug, Satteldecke, Sattel, Steigbügel.
// tier 1: Reitpferd (Fuchs mit Blesse und weißen Socken) · tier 2: Kriegsross (Rappe mit Rossharnisch,
// Stirnplatte mit Dorn, Halsplatten, Brustpanzer, rote Schabracke, Federbusch, glühende Augen, Behang)
function horseParts3(b, unused, o = {}) {
  const A = adder(b, o.parent || null);
  const seg = (a, z, r1, r2, color, x) => limbBetween(A, a, z, r1, r2, color, x);
  const war = o.tier === 2;
  const coat = o.coat || (war ? '#241e26' : '#8a5230');
  const dark = darker(coat, 0.25);
  const mane = o.mane || (war ? '#0e0a10' : '#2e1c12');
  const white = '#f2ece0';
  const steel = '#8a929c';
  const gold = '#c9a35a';
  const cloth = o.saddle || '#8a2a1a';
  const legLen = 0.66;
  const bodyY = legLen + 0.24;
  const hy = bodyY + 0.72;
  const hz = 0.82;
  const rig = rigOf([
    [[0, 0, 0], -1], [[0, bodyY, 0], 0], [[0, hy, hz - 0.06], 10],
    [[0.16, bodyY - 0.08, 0.36], 1], [[-0.16, bodyY - 0.08, 0.36], 1], [[0.15, bodyY - 0.06, -0.36], 1], [[-0.15, bodyY - 0.06, -0.36], 1],
    [[0, bodyY + 0.14, -0.6], 1], [[0, 0, 0], 1], [[0, 0, 0], 1], [[0, bodyY + 0.16, 0.44], 1]
  ]);
  // Rumpf: Brust, Bauch, Kruppe, Widerrist
  A(ball(16), coat, { bone: BQ.body, p: [0, bodyY + 0.02, 0.32], s: [0.26, 0.31, 0.3], shade: 0.25 });
  A(ball(16), coat, { bone: BQ.body, p: [0, bodyY, -0.02], s: [0.26, 0.28, 0.48], shade: 0.25 });
  A(ball(16), coat, { bone: BQ.body, p: [0, bodyY + 0.05, -0.36], s: [0.28, 0.29, 0.29], shade: 0.25 });
  A(ball(12), coat, { bone: BQ.body, p: [0, bodyY + 0.21, 0.24], s: [0.13, 0.1, 0.17] });
  // Hals in zwei Bögen, Kamm für die Mähne
  seg([0, bodyY + 0.1, 0.4], [0, bodyY + 0.46, 0.62], 0.17, 0.13, coat, { bone: BQ.neck, shade: 0.2 });
  seg([0, bodyY + 0.46, 0.62], [0, hy - 0.02, hz - 0.08], 0.13, 0.11, coat, { bone: BQ.neck, shade: 0.15 });
  // Kopf: Stirn, Ganaschen, schräges Gesicht, weiches Maul mit Nüstern
  A(ball(14), coat, { bone: BQ.head, p: [0, hy, hz], s: [0.11, 0.12, 0.14], shade: 0.15 });
  A(ball(12), coat, { bone: BQ.head, p: [0, hy - 0.07, hz - 0.01], s: [0.1, 0.1, 0.11] });
  seg([0, hy - 0.02, hz + 0.06], [0, hy - 0.24, hz + 0.32], 0.085, 0.07, coat, { bone: BQ.head, shade: 0.12 });
  A(ball(12), war ? '#3a3238' : lighter(coat, 0.08), { bone: BQ.head, p: [0, hy - 0.25, hz + 0.33], s: [0.08, 0.07, 0.085] });
  for (const sx of [-1, 1]) A(sphere3(0.016, 6, 4), '#140c0a', { bone: BQ.head, p: [sx * 0.035, hy - 0.24, hz + 0.41] });
  A(roundBox(0.09, 0.008, 0.04, 0.004), '#2a1410', { bone: BQ.head, p: [0, hy - 0.3, hz + 0.37] });
  if (!war) seg([0, hy + 0.06, hz + 0.1], [0, hy - 0.2, hz + 0.38], 0.028, 0.02, white, { bone: BQ.head });
  for (const sx of [-1, 1]) {
    // Augen seitlich, Ohren gespitzt
    if (war) A(ball(8), '#ff6a2a', { bone: BQ.head, p: [sx * 0.095, hy + 0.02, hz + 0.07], s: [0.03, 0.022, 0.03], mat: 'glow' });
    else {
      A(ball(8), '#140c08', { bone: BQ.head, p: [sx * 0.095, hy + 0.02, hz + 0.07], s: [0.028, 0.032, 0.028], shine: 0.9 });
      A(sphere3(0.008, 5, 4), '#ffffff', { bone: BQ.head, p: [sx * 0.105, hy + 0.035, hz + 0.085], mat: 'glow' });
    }
    A(horn3(0.13, 0.04, 6), coat, { bone: BQ.head, p: [sx * 0.055, hy + 0.1, hz - 0.04], r: [-0.15, 0, -sx * 0.18], s: [1, 1, 0.6] });
    A(horn3(0.08, 0.022, 5), dark, { bone: BQ.head, p: [sx * 0.056, hy + 0.11, hz - 0.03], r: [-0.15, 0, -sx * 0.18], s: [1, 1, 0.4] });
  }
  // Mähne: Strähnen fallen abwechselnd zu beiden Seiten, vorn ein Schopf
  for (let k = 0; k < 9; k++) {
    const q = k / 8;
    const base = [0, bodyY + 0.28 + q * 0.44, 0.42 + q * 0.34];
    const sx = k % 3 === 1 ? -1 : 1;
    lock(A, BQ.neck, base, 0.22 + (k % 2) * 0.06, 0.05, [Math.PI - 0.35, 0, sx * 0.55], k % 2 ? mane : lighter(mane, 0.1));
  }
  lock(A, BQ.head, [0, hy + 0.1, hz + 0.02], 0.14, 0.035, [0.6, 0, 0.1], mane);
  // Schweif: hoher Ansatz, dann lang wehend
  seg([0, bodyY + 0.14, -0.6], [0, bodyY + 0.04, -0.72], 0.06, 0.05, mane, { bone: BQ.tail });
  for (const [dx, len, rz] of [[0, 0.62, 0], [0.04, 0.55, 0.15], [-0.04, 0.55, -0.15], [0, 0.48, 0.05]]) {
    lock(A, BQ.tail, [dx, bodyY + 0.04, -0.72], len, 0.07, [Math.PI + 0.35, 0, rz], dx ? lighter(mane, 0.08) : mane);
  }
  // Beine: vorn Unterarm–Knie–Röhre, hinten Schenkel–Sprunggelenk–Röhre; Fessel, Huf
  for (const [bone, sx, front] of [[BQ.legFL, 1, true], [BQ.legFR, -1, true], [BQ.legBL, 1, false], [BQ.legBR, -1, false]]) {
    const x = sx * (front ? 0.16 : 0.15);
    const z0 = front ? 0.36 : -0.36;
    const sock = !war && ((front && sx < 0) || (!front && sx > 0));
    if (front) {
      seg([x, bodyY - 0.08, z0], [x, legLen * 0.5, z0 + 0.03], 0.085, 0.06, coat, { bone, shade: 0.15 });
      A(ball(8), coat, { bone, p: [x, legLen * 0.5, z0 + 0.03], s: [0.06, 0.055, 0.06] });
      seg([x, legLen * 0.5, z0 + 0.03], [x, 0.13, z0 + 0.02], 0.048, 0.042, sock ? white : dark, { bone });
    } else {
      A(ball(12), coat, { bone, p: [x, bodyY - 0.06, z0 - 0.02], s: [0.12, 0.22, 0.17], shade: 0.2 });
      seg([x, bodyY - 0.14, z0 - 0.02], [x, legLen * 0.46, z0 - 0.11], 0.08, 0.055, coat, { bone, shade: 0.15 });
      A(ball(8), coat, { bone, p: [x, legLen * 0.46, z0 - 0.11], s: [0.055, 0.06, 0.07] });
      seg([x, legLen * 0.46, z0 - 0.11], [x, 0.13, z0 - 0.05], 0.046, 0.042, sock ? white : dark, { bone });
    }
    const zf = front ? z0 + 0.02 : z0 - 0.05;
    A(ball(8), sock ? white : dark, { bone, p: [x, 0.12, zf], s: [0.055, 0.05, 0.06] });
    seg([x, 0.12, zf], [x, 0.07, zf + 0.04], 0.045, 0.05, sock ? white : dark, { bone });
    A(cyl3(0.062, 0.074, 0.075, 12), '#1e1814', { bone, p: [x, 0.038, zf + 0.05], shine: 0.4 });
    // Behang über den Hufen (Kriegsross)
    if (war) for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      A(horn3(0.12, 0.035, 4), lighter(mane, 0.15), { bone, p: [x + Math.cos(a) * 0.05, 0.16, zf + Math.sin(a) * 0.05], r: [Math.PI + Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
    }
  }
  // Zaumzeug: Nasenriemen, Stirnriemen, Backenstücke mit Trensenringen
  const strap = war ? '#3a2a1e' : '#4a2e1a';
  A(torus3(0.085, 0.012, Math.PI * 2, 4, 14), strap, { bone: BQ.head, p: [0, hy - 0.18, hz + 0.24], r: [Math.PI / 2 + 0.85, 0, 0] });
  A(torus3(0.115, 0.012, Math.PI * 2, 4, 14), strap, { bone: BQ.head, p: [0, hy + 0.04, hz + 0.02], r: [Math.PI / 2 + 0.35, 0, 0] });
  for (const sx of [-1, 1]) {
    seg([sx * 0.1, hy + 0.04, hz + 0.02], [sx * 0.08, hy - 0.2, hz + 0.26], 0.012, 0.012, strap, { bone: BQ.head });
    A(torus3(0.02, 0.006, Math.PI * 2, 3, 8), gold, { bone: BQ.head, p: [sx * 0.085, hy - 0.22, hz + 0.27], r: [0, Math.PI / 2, 0], shine: 1 });
  }
  // Satteldecke mit Borte, Sattel mit Knauf und Rückenlehne, Gurt, Steigbügel
  A(roundBox(0.6, 0.03, 0.5, 0.015), cloth, { bone: BQ.body, p: [0, bodyY + 0.28, -0.02], shade: 0.1 });
  A(roundBox(0.62, 0.02, 0.52, 0.01), gold, { bone: BQ.body, p: [0, bodyY + 0.265, -0.02], shine: 0.8 });
  A(roundBox(0.34, 0.08, 0.36, 0.035), '#5a3a22', { bone: BQ.body, p: [0, bodyY + 0.32, -0.02], top: lighter('#5a3a22', 0.2), topK: 0.4 });
  A(ball(10), '#5a3a22', { bone: BQ.body, p: [0, bodyY + 0.39, 0.15], s: [0.06, 0.06, 0.05], shine: 0.4 });
  A(roundBox(0.3, 0.1, 0.05, 0.025), '#4a2e1a', { bone: BQ.body, p: [0, bodyY + 0.39, -0.19] });
  A(torus3(0.285, 0.022, Math.PI * 2, 4, 20), strap, { bone: BQ.body, p: [0, bodyY, 0.08], r: [0, Math.PI / 2, 0], s: [1, 1.02, 1] });
  for (const sx of [-1, 1]) {
    seg([sx * 0.18, bodyY + 0.3, 0.02], [sx * 0.3, bodyY - 0.14, 0.02], 0.012, 0.012, strap, { bone: BQ.body });
    A(torus3(0.04, 0.01, Math.PI * 2, 4, 10), steel, { bone: BQ.body, p: [sx * 0.3, bodyY - 0.17, 0.02], r: [0, Math.PI / 2, 0], shine: 1 });
  }
  if (war) {
    // Rossharnisch: Stirnplatte mit Dorn, Halsplatten, Brustpanzer, Schabracke, Federbusch
    A(roundBox(0.12, 0.24, 0.035, 0.02), steel, { bone: BQ.head, p: [0, hy - 0.08, hz + 0.17], r: [-0.75, 0, 0], shine: 1, top: lighter(steel, 0.3), topK: 0.4 });
    A(horn3(0.16, 0.025, 6), gold, { bone: BQ.head, p: [0, hy + 0.06, hz + 0.08], r: [0.5, 0, 0], shine: 1 });
    for (let k = 0; k < 4; k++) A(roundBox(0.1, 0.03, 0.14, 0.015), k % 2 ? steel : darker(steel, 0.15), { bone: BQ.neck, p: [0, bodyY + 0.32 + k * 0.12, 0.47 + k * 0.08], r: [-0.85, 0, 0], shine: 0.9 });
    A(cap3(0.3, Math.PI * 0.5, 0, Math.PI * 2, 16, 6), steel, { bone: BQ.body, p: [0, bodyY + 0.02, 0.42], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.45], shine: 1, top: lighter(steel, 0.25), topK: 0.3 });
    A(torus3(0.29, 0.015, Math.PI * 2, 4, 20), gold, { bone: BQ.body, p: [0, bodyY + 0.02, 0.555], shine: 1 });
    A(ball(8), '#ff6a2a', { bone: BQ.body, p: [0, bodyY + 0.05, 0.57], s: [0.04, 0.04, 0.02], mat: 'glow' });
    for (const sx of [-1, 1]) {
      A(roundBox(0.02, 0.3, 0.62, 0.01), '#7a1a1a', { bone: BQ.body, p: [sx * 0.29, bodyY - 0.08, -0.06], shade: 0.15 });
      A(roundBox(0.025, 0.035, 0.63, 0.01), gold, { bone: BQ.body, p: [sx * 0.295, bodyY - 0.22, -0.06], shine: 0.9 });
    }
    A(cap3(0.3, Math.PI * 0.45, 0, Math.PI * 2, 16, 6), '#7a1a1a', { bone: BQ.body, p: [0, bodyY + 0.07, -0.4], s: [1, 0.8, 1] });
    for (let k = -1; k <= 1; k++) A(horn3(0.22, 0.03, 5), '#c8302a', { bone: BQ.head, p: [k * 0.03, hy + 0.13, hz - 0.03], r: [-0.5, 0, k * 0.3] });
  }
  return { rig, height: bodyY + 1.0, family: 'horse', bodyY, seat: bodyY + 0.36 };
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

// Geist (seit 7.9): durchscheinender, leuchtender Saum, Seelenfunken, glühende Augenhöhlen mit Glanzpunkt;
// je Art ein Mundspalt mit Schneeflocken (Frostgeist), ein Schlundmaul voller Seelenlichter (Seelenfresser)
// oder breite Nebelschultern mit Frostbart und schwerer Krone (Eiskönig)
function ghost3(b, o) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[0, 0.3, 0], 0], [[0, 0.75, 0], 1], [[0, 1.0, 0], 2], [[0.26, 0.86, 0], 2], [[-0.26, 0.86, 0], 2]]);
  const pale = lighter(o.body, 0.25);
  // schwebendes Gewand mit zerfetztem Saum; darüber ein durchscheinender Schleier, der nach unten leuchtet
  // (Profil von unten nach oben, sonst zeigen die Normalen nach innen und die Vorderseite wird dunkel)
  A(lathe3('ghost3', [[0, 0.04], [0.27, 0.05], [0.3, 0.22], [0.33, 0.45], [0.34, 0.72], [0.28, 0.9], [0, 0.95]], 18), o.body, { bone: 1, p: [0, 0.1, 0], shade: 0.15, top: pale, topK: 0.4 });
  A(lathe3('ghostveil', [[0.33, -0.04], [0.36, 0.12], [0.33, 0.32], [0.27, 0.5]], 16), pale, { bone: 1, p: [0, 0.1, 0], mat: 'aura' });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    A(horn3(0.16 + (k % 3) * 0.06, 0.07, 5), k % 2 ? o.body : lighter(o.body, 0.15), { bone: 1, p: [Math.cos(a) * 0.25, 0.16, Math.sin(a) * 0.25], r: [Math.PI, 0, 0] });
    if (k % 2) A(horn3(0.12 + (k % 4) * 0.04, 0.05, 4), pale, { bone: 1, p: [Math.cos(a + 0.26) * 0.3, 0.1, Math.sin(a + 0.26) * 0.3], r: [Math.PI + Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], mat: 'aura' });
  }
  A(torus3(0.27, 0.03, Math.PI * 2, 4, 20), o.eye, { bone: 1, p: [0, 0.16, 0], r: [Math.PI / 2, 0, 0], mat: 'aura' });
  // Seelenfunken unten am Saum
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    A(sphere3(0.025 - (k % 2) * 0.008, 6, 4), k % 2 ? o.eye : pale, { bone: 1, p: [Math.cos(a) * 0.4, 0.02 + (k % 2) * 0.12, Math.sin(a) * 0.4], mat: 'glow' });
  }
  // Kapuze, dunkles Gesicht, glühende Augenhöhlen mit hellem Kern und Glanzpunkt
  // (Kapuze und Gesicht ohne Schattenmodell: sonst fällt ihr Schatten als dunkler Fleck auf das helle Gewand)
  A(cap3(0.33, Math.PI * 0.8, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6), o.body, { bone: 3, p: [0, 1.15, 0], shade: 0.15, top: pale, topK: 0.35, noShadow: true });
  A(ball(14), '#0d1a2a', { bone: 3, p: [0, 1.12, 0.06], s: [0.24, o.maw ? 0.3 : 0.24, 0.22], noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(10), o.eye, { bone: 3, p: [sx * 0.09, 1.14, 0.25], s: [0.06, 0.08, 0.03], mat: 'glow' });
    A(ball(8), o.eye, { bone: 3, p: [sx * 0.09, 1.14, 0.245], s: [0.085, 0.105, 0.03], mat: 'aura' });
    A(sphere3(1, 6, 4), '#ffffff', { bone: 3, p: [sx * 0.09 - 0.015, 1.16, 0.28], s: [0.018, 0.024, 0.01], mat: 'glow' });
    const fingers = o.longFingers ? 0.17 : 0.1;
    limbBetween(A, [sx * 0.26, 0.86, 0], [sx * 0.42, 0.6, 0.12], 0.08, 0.04, o.body, { bone: sx > 0 ? 4 : 5, top: pale, topK: 0.4 });
    for (let k = -1; k <= 1; k++) A(horn3(fingers, 0.02, 4), o.iceFingers || pale, { bone: sx > 0 ? 4 : 5, p: [sx * 0.42 + k * 0.02, 0.6, 0.12], r: [Math.PI + 0.3, 0, k * 0.3], shine: o.iceFingers ? 1 : 0 });
  }
  if (o.maw) {
    // weit offenes Schlundmaul, darin kreisen kleine Seelenlichter
    A(ball(10), '#1a0820', { bone: 3, p: [0, 0.98, 0.2], s: [0.12, 0.13, 0.06] });
    for (let k = 0; k < 3; k++) A(sphere3(0.022, 6, 4), k % 2 ? '#ffffff' : o.eye, { bone: 3, p: [Math.cos(k * 2.1) * 0.05, 0.98 + Math.sin(k * 2.1) * 0.05, 0.24], mat: 'glow' });
    for (let k = -2; k <= 2; k++) A(horn3(0.04, 0.012, 3), '#e8e0f0', { bone: 3, p: [k * 0.035, 1.1, 0.24], r: [Math.PI, 0, 0], noShadow: true });
  } else A(box3(), '#0d1a2a', { bone: 3, p: [0, 1.03, 0.27], s: [0.1, 0.02, 0.02] });
  if (o.beard) {
    // langer, wehender Bart aus Frostnebel und breite Nebelschultern
    for (let k = -1; k <= 1; k++) A(horn3(0.42 - Math.abs(k) * 0.1, 0.07, 5), k ? o.beard : lighter(o.beard, 0.3), { bone: 3, p: [k * 0.06, 1.02, 0.2], r: [Math.PI - 0.35, 0, k * 0.25], mat: 'aura' });
    for (const sx of [-1, 1]) A(ball(10), o.body, { bone: 2, p: [sx * 0.24, 0.9, -0.02], s: [0.17, 0.11, 0.15], top: pale, topK: 0.5 });
  }
  if (o.snow) for (let k = 0; k < 4; k++) {
    // Schneeflocken kreisen um den Leib
    const a = (k / 4) * Math.PI * 2 + 0.8;
    for (let j = 0; j < 3; j++) A(box3(), '#ffffff', { bone: 1, p: [Math.cos(a) * 0.48, 0.45 + (k % 2) * 0.25, Math.sin(a) * 0.48], r: [0, a, j * Math.PI / 3], mat: 'glow', s: [0.06, 0.012, 0.012] });
  }
  if (o.crown) {
    const glow = o.crown === '#ffffff' ? 'lit' : 'glow';
    if (o.crownRing) A(torus3(0.22, 0.04, Math.PI * 2, 4, 14), o.crown, { bone: 3, p: [0, 1.38, 0.02], r: [Math.PI / 2, 0, 0], mat: glow, shine: 1 });
    for (let k = -2; k <= 2; k++) A(horn3(0.16 - Math.abs(k) * 0.03, 0.04, 6), o.crown, { bone: 3, p: [k * 0.09, 1.4, Math.cos(k * 0.5) * 0.05], mat: glow, shine: 1 });
    if (o.crownRing) for (let k = 0; k < 4; k++) A(horn3(0.12, 0.025, 4), '#bfe8ff', { bone: 3, p: [Math.sin(k * 1.6 + 0.8) * 0.2, 1.38, Math.cos(k * 1.6 + 0.8) * 0.2 + 0.02], shine: 1 });
  }
  return { rig, height: 1.48, family: 'ghost', bodyY: 0.3 };
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
      limbBetween(A, base, midp, hr * (big ? 0.2 : 0.14), hr * (big ? 0.15 : 0.1), h.horns, { bone: hb, shine: 0.4 });
      // Hornringe (seit 7.9): Wülste quer zum Horn, etwas heller
      const hd = [midp[0] - base[0], midp[1] - base[1], midp[2] - base[2]];
      for (const u of [0.35, 0.75]) ringAt3(A, +(hr * (big ? 0.2 : 0.14) * (1.05 - u * 0.3)).toFixed(3), +(hr * 0.035).toFixed(3), lighter(h.horns, 0.18), [base[0] + hd[0] * u, base[1] + hd[1] * u, base[2] + hd[2] * u], hd, { bone: hb, shine: 0.5, noShadow: true });
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
  const own = MON3_BUILD[id] || (t && t.raid && MON3_BUILD[t.raid.art]);
  if (!def && !own) return Object.assign(beast3(b, { fur: t.color }), { scale: 1, style: attackStyle(id) });
  const o = Object.assign({}, def ? def.o : {}, t && t.raid ? MON3_LOOK[t.raid.art] : null, MON3_LOOK[id]);
  if (def) def.o = o;
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
        res = golem3(b, Object.assign(c, { cracks: o.cracks || h.cracks, look: o }));
        break;
      }
      // Kopf aus dem Baukasten (seit 8.4): Haare, Kopfbedeckung, Bart und Augen je Variante
      const kit = HEADKIT3[id] || (t.raid && HEADKIT3[t.raid.art]);
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
  res.scale = (def ? def.scale : 1) * 1.15 * (t && t.raid ? t.raid.scale : 1) * (own && t.scale3 ? t.scale3 : 1);
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
      for (const g of z.groups || []) if (!mon3ThemeOf[g[0]]) mon3ThemeOf[g[0]] = th;
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
      for (const dx of [-0.035, 0, 0.035]) A(horn3((0.05 + 0.02 * tier) * big, 0.012 * Math.sqrt(big), 4), '#f0e8d4', { bone, p: [sx * 0.16 * bw + dx * bw, 0.025, sz * len * 0.62 + 0.115], r: [Math.PI / 2 + 0.4, 0, 0], shine: 0.6 });
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
    const h = HEAD3[id] || (t.raid && HEAD3[t.raid.art]) || {};
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
const WELTTOR_LOOK = { id: 'weltentor', stone: '#8a8478', top: '#b0a898', accent: '#7ab8ff', deep: '#0e2a52', mid: '#7ab8ff', core: '#e8f6ff', motes: 'wisp', spin: 0.8 };
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
  if (o.halo) a.halo = put(new THREE.Mesh(portalPlane3(), portalGlowMat('halo', 'disc', L.mid, 0.34)), o.halo, 1);
  if (o.pool) put(new THREE.Mesh(portalFloor3(), portalGlowMat('pool', 'disc', L.mid, o.pool.op || 0.3)), o.pool, 1);
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
  if (a.halo) a.halo.material.opacity = 0.3 + 0.08 * Math.sin(t * 2.5);
  if (a.motes) a.motes.visible = on && opts.graphics !== 'niedrig';
  if (a.vortexBack) a.vortexBack.visible = on && (opts.graphics === 'hoch' || opts.graphics === 'ultra');
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

// Modellschlüssel der Diener ohne neue Zeichenketten je Bild: Skelett, Knochenhund, Seelenhund, Alpha
const ALLY_KEYS3 = ['ally:skelett', 'ally:hund', 'ally:hund:soul', 'ally:hund:soul:alpha'];
const allyKeyIndex3 = (al) => (al.kind !== 'hund' ? 0 : al.tier >= 3 ? (al.alpha ? 3 : 2) : 1);
const ALLY_LOOK3 = [null, { tier: 1, alpha: false }, { tier: 3, alpha: false }, { tier: 4, alpha: true }];
function allyBuild3(b, i) {
  return i ? boneHound3(b, ALLY_LOOK3[i]) : skeletonWarrior3(b);
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
    // Schatten wirft das grobe Schattenmodell (unsichtbar), nicht das volle Modell. Wer so ein Modell hat,
    // empfängt keine Schatten: sonst fielen die groben Kugeln als dunkle Flecken auf die eigene Figur.
    lit.castShadow = !model.geos.shadow;
    lit.receiveShadow = !model.geos.shadow;
    add('outline', model.geos.lit, figOutline());
  }
  if (model.geos.shadow) add('shadow', model.geos.shadow, figShadowProxy()).castShadow = true;
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
  for (const m of game.monsters) {
    if (m.isStone || Math.abs(m.x - p.x) > 1400 || Math.abs(m.y - p.y) > 1100) continue;
    const key = monModelKey3(m);
    if (MODELS3.has(key)) continue;
    model3(key, (b) => monsterBuild(b, m.typeId, m.__v3));
    return;
  }
  // Diener (seit 8.5): Skelettkrieger, Knochen-, Seelen- und Alphahund, wenn man selbst beschwört oder Mitspieler Diener haben
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
  const kit = HEADKIT3[m.typeId];
  if (!kit || kit.length < 2) return -1;
  let h = m.respawn === false || m.homeX == null ? m.id | 0 : Math.imul(Math.round(m.homeX) | 0, 73856093) ^ Math.imul(Math.round(m.homeY) | 0, 19349663);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) % kit.length;
}
const monKey3 = (typeId, v) => 'm:' + typeId + (v >= 0 ? '#' + v : '');
// Modellschlüssel eines Monsters, gemerkt, solange es am selben Startpunkt steht (keine neue Zeichenkette je Bild)
function monModelKey3(m) {
  if (m.__mk3 === undefined || m.__mkX !== m.homeX || m.__mkY !== m.homeY || m.__mkT !== m.typeId) {
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

// --- Figuren mit dem Spielgeschehen abgleichen ----------------------------------------------------------

function v3SyncActors(dt) {
  for (const a of actors3.values()) a.seen = false;
  const w = game.world;
  // nur, was im Bild ist (feste Kamera: nach Norden sieht man weiter; Schulterblick: Kreis vor der Figur)
  const near = (e) => v3InView(e.x, e.y);
  const p = game.player;
  // Ein Fehler bei einer Figur darf die anderen (und die eigene) nicht mitreißen
  const safe = (fn, e) => {
    try { fn(e, dt); } catch (err) {
      if (!e.__err3) { e.__err3 = true; console.warn('3D-Figur:', err); }
    }
  };
  if (game.player && game.running && !p.dead) safe(syncPlayer3, p);
  if (V3.extra) for (const ep of V3.extra) safe(syncPlayer3, ep);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp) && near(rp)) safe(syncPlayer3, rp);
  for (const c of game.clones) if (near(c)) safe(syncPlayer3, c);
  for (const m of game.monsters) if (!m.dead && near(m)) syncMonster3(m, dt);
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
const twoHanded3 = (kind) => kind === 'greatsword' || kind === 'greataxe' || kind === 'scythe';
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
      B[BH.handR].rotation.x = 0.5 * d * (sw >= 0.8 ? 1 - easeInOut3(poseSeg(sw, 0.8, 0.9)) : 1);
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
      B[BH.handR].rotation.x = 0.8 * i * (T >= 0.64 ? 1 - easeInOut3(poseSeg(T, 0.64, 0.72)) : 1);
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
function syncPlayer3(p, dt) {
  const key = playerKey3(p);
  const a = actorFor(entityKey(p), 'p:' + key, (b) => {
    const r = humanoid3(b, playerConfig3(p));
    r.blob = 0.42;
    return r;
  });
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
  // Blickrichtung (beim Wirbel dreht sich die Figur)
  const f = p.facing || { x: 0, y: 1 };
  if (p.spin > 0) a.heading += dt * 28;
  else turnToward(a, Math.atan2(f.x, f.y), Math.min(1, dt * 16));
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
  // Reiten: Pferd darunter, Reiter sitzt im Sattel
  let ride = 0;
  if (p.riding) {
    const tier = p.horseTier || 1;
    const h = actorFor(entityKey(p) + 'h' + tier, 'horse' + tier + ':' + CLASSES[p.classId].trim, (b) => Object.assign(horseParts3(b, null, { saddle: CLASSES[p.classId].trim, tier }), { blob: 0.7, scale: tier === 2 ? 1.3 : 1.22 }));
    if (h) {
      resetBones(h);
      h.group.position.set(p.x * U3, 0, fy * U3);
      h.group.rotation.y = a.heading;
      // Galopp im Takt des Tempos (seit 8.5): Kriegsross schneller als Reitpferd. Die Phase läuft in
      // Spielzeit mit, damit ein Tempowechsel (Buff) keinen Sprung in den Beinen macht.
      const base = CLASSES[p.classId].base.speed;
      const spd = p === game.player && game.stats ? game.stats.speed : (p.footSpeed || base) + base * (HORSES[tier] || HORSES[1]).speed;
      const gdt = Math.min(0.1, Math.max(0, t - (h.galAt ?? t)));
      h.galAt = t;
      if (p.moving) h.galPhase = (h.galPhase || 0) + gdt * 12 * Math.max(0.8, Math.min(1.4, spd / 180));
      const gal = p.moving ? h.galPhase : 0;
      if (p.moving) {
        h.bones[BQ.legFL].rotation.x = Math.sin(gal) * 0.7;
        h.bones[BQ.legFR].rotation.x = Math.sin(gal + 0.6) * 0.7;
        h.bones[BQ.legBL].rotation.x = -Math.sin(gal + 0.3) * 0.7;
        h.bones[BQ.legBR].rotation.x = -Math.sin(gal + 0.9) * 0.7;
        h.bones[BQ.body].position.y += Math.abs(Math.sin(gal)) * 0.05;
        // Galopp: Hals nickt mit, Schweif weht nach hinten
        h.bones[BQ.neck].rotation.x = Math.sin(gal + 1.2) * 0.12;
        h.bones[BQ.head].rotation.x = -Math.sin(gal + 1.2) * 0.08;
        h.bones[BQ.tail].rotation.x = -0.5 + Math.sin(gal * 2) * 0.12;
      } else {
        // im Stehen: Kopf senkt und hebt sich, Ohren und Schweif zucken
        h.bones[BQ.neck].rotation.x = 0.05 + Math.sin(t * 0.8) * 0.06;
        h.bones[BQ.head].rotation.y = Math.sin(t * 0.5) * 0.12;
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
  // Schatten bleibt beim Sprung am Boden und wird kleiner
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
  if (posing) {
    const k = Math.sin(Math.min(1, (1 - p.swing / (p.swingDur || 0.7)) * 1.4) * Math.PI);
    B[BH.armL].rotation.set(-2.7 * k, 0, 0.3 * k);
    B[BH.armR].rotation.set(-2.7 * k, 0, -0.3 * k);
    B[BH.head].rotation.x += -0.3 * k;
  } else if (sw >= 0 && Object.prototype.hasOwnProperty.call(SKILL_POSE3, p.swingKind)) {
    // eigene Animationen (seit 8.3): Sichelwelle, Felsenfaust, Sprungschlag; seit 8.5 Salve, Käfig, Schnitter
    SKILL_POSE3[p.swingKind](B, sw, kind, p, a);
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
    if (aura) {
      wg.color.set(SKILL_FX[aura.id].weaponGlow);
      wg.opacity = 0.55 + 0.25 * Math.sin(t * 8);
    } else if (band >= 2) {
      wg.color.set(PLUS_COLORS[band]);
      wg.opacity = 0.22 + band * 0.06 + 0.1 * Math.sin(t * 6);
    } else wg.opacity = 0;
    if (a.poseWg && a.poseWg.op > wg.opacity) {
      wg.color.set(a.poseWg.color);
      wg.opacity = a.poseWg.op;
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
  if (m.isStone) {
    syncStone3(m, dt);
    return;
  }
  const a = actorFor(entityKey(m), monModelKey3(m), (b) => monsterBuild(b, m.typeId, m.__v3));
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
  // nur Zahlen-IDs versetzen die Phase (Text wie früher 'ally0' ergab NaN-Knochen)
  const t = game.time + (typeof e.id === 'number' ? e.id : 0) * 0.37;
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

// Diener (eigene und die der Mitspieler): steigen aus dem Boden, holen aus und schlagen oder beißen,
// springen an (Hunde); ein weicher grüner Ring zeigt, dass sie freundlich sind
function syncAlly3(al, dt) {
  const ki = allyKeyIndex3(al);
  const a = actorFor(entityKey(al), ALLY_KEYS3[ki], (b) => allyBuild3(b, ki));
  if (!a) return;
  animateCreature(a, al, dt, al.moving, al.attackAnim > 0 ? al.attackAnim / 0.25 : 0, 0, al.windup > 0 ? 1 - al.windup / (al.windupMax || 0.15) : 0);
  // beim Ausholen glüht ein Diener grün statt rot (keine Warnung, er gehört zu dir)
  if (al.windup > 0 && a.mats.lit) a.mats.lit.emissive.setRGB(0.02, 0.14 * (1 - al.windup / (al.windupMax || 0.15)), 0.05);
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
  a.group.scale.setScalar((al.scale || 1) * a.model.scale);
  if (!a.mark) {
    a.mark = groundRing(new THREE.Color('#7fe3a0'), false);
    a.mark.position.y = 0.03;
    a.mark.scale.setScalar(al.kind === 'hund' ? 0.5 : 0.42);
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
    const kind = raid ? 'raid' : n.id;
    a = actorFor(entityKey(n), 'portal2:' + kind + ':' + (d ? d.id : ''), (b) => Object.assign(buildPortal3(b, kind, d), { blob: 0.01, scale: raid ? 2.0 : n.id === 'eingang' ? 1.45 : n.id === 'weltentor' ? 1.25 : 1.1 }));
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
