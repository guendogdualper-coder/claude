// Modelle der Endbosse der Karten (seit 14.80, Baukasten und Animation in bosse3d.js). Je Boss ein eigener Bauplan
// passend zu seinem Wesen; die Schattenendbosse sind eigene Abwandlungen ihres Gegenstücks (andere Farben, anderes
// Zubehör, andere Waffe, eigene Effekte). Alle Maße im Modell; die Weltgröße (worldH) bestimmt die Grundgröße, der
// Kampfkreis (Treffer, Reichweiten, Zielwahl) bleibt unverändert.

// Ergebnis für MON3_BUILD: Skelett, Höhe, eigene Grundgröße (Welt = worldH)
function bsRes3(id, rig, J, height, worldH) {
  const t = MONSTER_TYPES[id];
  const rs = t && t.raid ? t.raid.scale : 1;
  return { rig, J, height, family: 'boss3', boss3: id, noFlair: true, style: null, ownScale: worldH / height / rs };
}
// Teile in eigenen Koordinaten (z. B. Kopf geneigt): adder mit Elternmatrix
function bsLocal3(b, at, rx = 0, ry = 0, rz = 0, s = 1) {
  return adder(b, new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s)));
}
// flache Form (Klinge, Platte) aus Umrisspunkten in der Ebene (u vor, v hoch), Dicke quer (x)
function bsBlade3(key, pts, depth = 0.04, bevel = 0.012) {
  return geo3('bs:klinge:' + key, () => {
    const s = new THREE.Shape();
    pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v)));
    s.lineTo(pts[0][0], pts[0][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    g.rotateY(-Math.PI / 2);
    return smoothGeo(g);
  });
}
// Fellbüschel / Zacken entlang einer Reihe
function bsTufts3(A, list, col, top, o = {}) {
  for (const [p, d, len, r, bone] of list) pointAt3(A, horn3(+len.toFixed(3), +r.toFixed(3), o.seg || 5), col, p, d, { bone, top, topK: 0.6, noShadow: true, shade: 0.15 });
}
// Kette aus Gliedern von p0 nach p1 (abwechselnd gedreht)
function bsChainLinks3(A, p0, p1, n, r, col, bone) {
  for (let i = 0; i < n; i++) {
    const p = bsLerp3(p0, p1, (i + 0.5) / n);
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const yaw = Math.atan2(d[0], d[2]);
    const pitch = Math.atan2(Math.hypot(d[0], d[2]), d[1]);
    A(torus3(r, r * 0.28, Math.PI * 2, 4, 8), col, { bone, p, r: [pitch, yaw, i % 2 ? Math.PI / 2 : 0], s: [1, 1.5, 1], shine: 0.8, noShadow: true });
  }
}

// ============================================================================================================
// Großkhan Gorbag (Karte 5) und Gebeinfürst Vharok (Karte 13): Ork-Kriegsherr
// Massiger, vornübergebeugter Ork mit Stiernacken, Unterbiss und Hauern, Hörnerhelm (Vharok: Schädelhelm), Pelzmantel,
// geschichtete Schulterpanzer mit Dornen und Schädel, Brustgurte mit Medaillon, Gürtel mit Schädelschnalle, Lendentuch,
// Armschienen, Stiefel mit Fellstulpen, riesiges Hackbeil mit Glutrunen (Vharok: Knochenhackbeil), Kriegsbanner am
// Rücken mit Trophäen (Vharok: zerfetztes Knochenbanner).
// ============================================================================================================
const BS_ORC_J3 = {
  hipY: 0.98, hipX: 0.21, kneeY: 0.56, ankleY: 0.12, footL: 0.26, waistY: 1.2, chestY: 1.46, shY: 1.8, shX: 0.56, neckY: 1.86,
  headY: 1.95, headZ: 0.22, hunch: 0.17, upper: 0.5, fore: 0.46, hand: 0.2, armOut: 0.08, jaw: [0.03, -0.01],
  cape: [[0.14, 2.86, -0.44], [0.14, 2.2, -0.46]]
};
const BS_ORC_P3 = bsBipJ3(BS_ORC_J3);
// Griff in der rechten Hand, Hackbeil nach vorn
const BS_ORC_G3 = bsLerp3(BS_ORC_P3[-1].W, BS_ORC_P3[-1].Hd, 0.5);
const BS_ORC_PTS3 = {
  mouth: [BB3.jaw, [0, 1.98, 0.48]], core: [BB3.chest, [0, 1.58, 0.42]],
  weapon: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1] - 0.28, BS_ORC_G3[2] + 0.62]], emit: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1] - 0.28, BS_ORC_G3[2] + 0.62]],
  sky: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1] - 0.28, BS_ORC_G3[2] + 0.62]]
};
function bsOrc3(b, id, V) {
  const A = adder(b, null);
  const J = BS_ORC_J3, P = BS_ORC_P3, C = V;
  const { rig } = bsBipRig3(J);
  const rows = [
    [0.84, 0.0, 0.24, 0.19, 0.19], [0.97, 0.0, 0.31, 0.24, 0.22], [1.14, 0.04, 0.34, 0.29, 0.22], [1.32, 0.08, 0.37, 0.29, 0.23],
    [1.5, 0.12, 0.48, 0.29, 0.25], [1.66, 0.15, 0.55, 0.27, 0.28], [1.8, 0.15, 0.46, 0.21, 0.27], [1.9, 0.19, 0.19, 0.13, 0.15], [1.99, 0.21, 0.13, 0.1, 0.1]
  ];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.21, 0.2, 0.145, 0.16, 0.12], leg: [0.22, 0.2, 0.145, 0.14, 0.105], shade: 0.3 });
  // Bauchmuskeln, Brustmuskeln, Nacken (fest an Brust/Bauch)
  for (const sx of [-1, 1]) A(ball(14), C.skin, { bone: BB3.chest, p: [sx * 0.19, 1.6, 0.34], s: [0.2, 0.13, 0.12], top: C.skinTop, topK: 0.5, shade: 0.3 });
  for (let k = 0; k < 2; k++) for (const sx of [-1, 1]) A(roundBox(0.11, 0.08, 0.06, 0.025), C.skin, { bone: BB3.spine, p: [sx * 0.065, 1.36 - k * 0.1, 0.36 - k * 0.005], shade: 0.3 });
  A(ball(14), C.skin, { bone: BB3.chest, p: [0, 1.84, 0.06], s: [0.32, 0.15, 0.22], top: C.skinTop, topK: 0.5, shade: 0.3 });
  // Narben (dunkle Striche)
  for (const [x, y, r] of [[0.22, 1.66, 0.6], [-0.12, 1.42, -0.4], [0.08, 1.52, 1.1]]) A(box3(), C.scar, { bone: BB3.chest, p: [x, y, 0.39], r: [0, 0, r], s: [0.012, 0.13, 0.01], noShadow: true });

  // --- Kopf ---
  const hb = BB3.head, jb = BB3.jaw;
  const H0 = [0, 2.07, 0.3];
  A(ball(16), C.skin, { bone: hb, p: H0, s: [0.17, 0.165, 0.18], top: C.skinTop, topK: 0.5, shade: 0.25 });
  A(ball(12), C.skin, { bone: hb, p: [0, 2.0, 0.41], s: [0.13, 0.08, 0.1], shade: 0.3 });
  A(roundBox(0.31, 0.06, 0.09, 0.025), darker(C.skin, 0.15), { bone: hb, p: [0, 2.12, 0.42], r: [0.3, 0, 0], shade: 0.2 });
  A(ball(10), darker(C.skin, 0.1), { bone: hb, p: [0, 2.04, 0.47], s: [0.055, 0.04, 0.045] });
  for (const sx of [-1, 1]) {
    A(ball(8), '#140c08', { bone: hb, p: [sx * 0.078, 2.085, 0.43], s: [0.045, 0.028, 0.03], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.078, 2.085, 0.445], s: [0.032, 0.018, 0.02], mat: 'glow' });
    // Ohren
    bsSpike3(A, 0.22, 0.05, C.skin, [sx * 0.16, 2.07, 0.26], [sx, 0.4, -0.35], { bone: hb, top: C.skinTop });
    for (let k = 0; k < 2; k++) A(torus3(0.022, 0.006, Math.PI * 2, 4, 8), C.gold, { bone: hb, p: [sx * (0.22 + k * 0.035), 2.1 + k * 0.012, 0.22 - k * 0.012], r: [0, Math.PI / 2, 0], shine: 1, noShadow: true });
    // Kriegsbemalung
    A(box3(), C.paint, { bone: hb, p: [sx * 0.11, 2.05, 0.43], r: [0, sx * 0.5, 0.2 * sx], s: [0.012, 0.08, 0.01], noShadow: true });
  }
  // Unterkiefer mit Hauern (am Kiefer)
  A(roundBox(0.25, 0.1, 0.2, 0.045), C.skin, { bone: jb, p: [0, 1.93, 0.36], top: C.skinTop, topK: 0.4, shade: 0.3 });
  for (const sx of [-1, 1]) {
    A(tube3([[sx * 0.085, 1.95, 0.44], [sx * 0.1, 2.03, 0.47], [sx * 0.125, 2.1, 0.45]], 0.03, 0.004, 8, 6), C.tusk, { bone: jb, shine: 0.6, noShadow: true });
    for (let k = 0; k < 2; k++) bsSpike3(A, 0.035, 0.012, C.tusk, [sx * (0.03 + k * 0.03), 1.97, 0.455], [0, 1, 0.1], { bone: jb, seg: 4 });
  }
  if (V.mohawk) {
    // seit 14.82 Kriegsherr Gor'thak: kahler Schädel mit Irokesenkamm, eiserne Kieferplatte, Ohrringe, Kriegsbemalung
    bsTufts3(A, Array.from({ length: 8 }, (_, k) => [[0, 2.24 - k * 0.01, 0.42 - k * 0.07], [0, 1, -0.3 - k * 0.1], 0.2 - Math.abs(k - 3) * 0.015, 0.035, hb]), C.hair, C.paint);
    A(roundBox(0.27, 0.07, 0.12, 0.03), C.iron, { bone: jb, p: [0, 1.92, 0.42], top: C.ironTop, shine: 0.9 });
    for (let k = 0; k < 4; k++) bsSpike3(A, 0.05, 0.014, C.ironTop, [(k - 1.5) * 0.06, 1.89, 0.48], [0, -1, 0.4], { bone: jb, seg: 4, shine: 1 });
    for (const sx of [-1, 1]) A(box3(), C.paint, { bone: hb, p: [sx * 0.07, 2.16, 0.43], r: [0.3, sx * 0.4, 0], s: [0.03, 0.012, 0.06], noShadow: true });
  } else if (!V.skel) {
    // Hörnerhelm: eiserne Kappe, Goldrand, Nasenschutz, mächtige Stierhörner, Stachelkamm
    A(cap3(0.19, 1.25), C.iron, { bone: hb, p: [0, 2.11, 0.29], s: [1, 0.95, 1.03], top: C.ironTop, topK: 0.5, shine: 0.8 });
    A(torus3(0.185, 0.018, Math.PI * 2, 4, 20), C.gold, { bone: hb, p: [0, 2.16, 0.29], r: [Math.PI / 2, 0, 0], s: [1, 1.05, 1], shine: 1 });
    A(roundBox(0.035, 0.12, 0.03, 0.012), C.iron, { bone: hb, p: [0, 2.11, 0.48], r: [0.25, 0, 0], shine: 0.8 });
    for (const sx of [-1, 1]) {
      A(tube3([[sx * 0.16, 2.2, 0.3], [sx * 0.31, 2.26, 0.33], [sx * 0.43, 2.39, 0.4], [sx * 0.46, 2.56, 0.5]], 0.065, 0.008, 18, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      A(torus3(0.06, 0.012, Math.PI * 2, 4, 10), C.gold, { bone: hb, p: [sx * 0.24, 2.23, 0.31], r: [0, Math.PI / 2, 0.2 * sx], shine: 1, noShadow: true });
    }
    for (let k = 0; k < 4; k++) bsSpike3(A, 0.12 - k * 0.015, 0.03, C.iron, [0, 2.3 - k * 0.02, 0.36 - k * 0.07], [0, 1, -0.3 - k * 0.2], { bone: hb, shine: 0.8 });
    // Haarknoten hinten
    A(tube3([[0, 2.27, 0.2], [0, 2.36, 0.1], [0, 2.32, -0.03], [0, 2.12, -0.1]], 0.045, 0.02, 12, 7), C.hair, { bone: hb, shade: 0.2 });
  } else {
    // Schädelhelm: großer Tierschädel als Helm, Augenhöhlen glimmen, gebogene Hörner nach hinten, Kieferzähne über der Stirn
    A(ball(16), C.bone, { bone: hb, p: [0, 2.15, 0.31], s: [0.2, 0.15, 0.22], top: C.boneTop, topK: 0.5, shine: 0.3 });
    A(roundBox(0.16, 0.08, 0.2, 0.04), C.bone, { bone: hb, p: [0, 2.17, 0.47], r: [0.35, 0, 0], shine: 0.3 });
    for (const sx of [-1, 1]) {
      A(ball(8), '#141210', { bone: hb, p: [sx * 0.08, 2.2, 0.5], s: [0.05, 0.04, 0.03], noShadow: true });
      A(ball(6), C.eye, { bone: hb, p: [sx * 0.08, 2.2, 0.515], s: [0.022, 0.018, 0.012], mat: 'glow' });
      A(tube3([[sx * 0.15, 2.22, 0.28], [sx * 0.3, 2.3, 0.2], [sx * 0.38, 2.3, 0.02], [sx * 0.34, 2.18, -0.12]], 0.06, 0.008, 18, 9), C.bone, { bone: hb, top: C.boneTop, topK: 0.6, shine: 0.3 });
      for (let k = 0; k < 4; k++) bsSpike3(A, 0.06, 0.014, C.bone, [sx * (0.025 + k * 0.03), 2.1, 0.6 - k * 0.012], [0, -1, 0.2], { bone: hb, seg: 4 });
    }
    for (let k = 0; k < 5; k++) bsSpike3(A, 0.16 - k * 0.02, 0.03, C.bone, [0, 2.28 - k * 0.03, 0.3 - k * 0.08], [0, 1, -0.4 - k * 0.2], { bone: hb });
  }

  // --- Pelzmantel um Schultern und Nacken ---
  const tuft = [];
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.85 + (i / 25) * Math.PI * 1.7;
    const r = 0.42 + 0.08 * Math.sin(i * 2.3);
    const p = [Math.sin(a) * r, 1.86 + 0.03 * Math.cos(i * 1.7), 0.12 - Math.cos(a) * r * 0.62];
    tuft.push([p, [Math.sin(a) * 0.7, -0.35 + 0.15 * Math.sin(i), -Math.cos(a) * 0.6], 0.2 + 0.06 * Math.sin(i * 1.3), 0.075, BB3.chest]);
  }
  bsTufts3(A, tuft, C.fur, C.furTop);
  A(torus3(0.4, 0.09, Math.PI * 1.7, 6, 22), C.fur, { bone: BB3.chest, p: [0, 1.86, 0.12], r: [Math.PI / 2, 0, Math.PI * 0.35], s: [1.05, 0.65, 0.9], top: C.furTop, topK: 0.6, shade: 0.3 });

  // --- Schulterpanzer (Schichten, Dornen, Schädel) ---
  for (const sx of [-1, 1]) {
    const [ub] = bsArmB3(sx);
    const S = P[sx].S;
    // Kuppel mit Goldrand, darunter zwei Schienen
    const D = [S[0] + sx * 0.06, S[1] + 0.05, S[2]];
    A(cap3(1, 1.25, 0, Math.PI * 2, 18, 8), C.iron, { bone: ub, p: D, r: [0, 0, sx * 0.5], s: [0.3, 0.24, 0.32], top: C.ironTop, topK: 0.6, shine: 0.8 });
    for (let k = 0; k < 5; k++) A(ball(6), C.gold, { bone: ub, p: bsAdd3(D, [sx * (0.05 + 0.2 * Math.cos(0.5) * Math.cos((k - 2) * 0.5)) , 0.1 - 0.06 * Math.abs(k - 2) * 0.5, 0.26 * Math.sin((k - 2) * 0.5)]), s: 0.025, shine: 1, noShadow: true });
    for (let k = 0; k < 2; k++) A(cap3(1, 0.9, 0, Math.PI * 2, 16, 5), k ? C.ironD : C.iron, { bone: ub, p: bsAdd3(D, [sx * (0.14 + k * 0.05), -0.13 - k * 0.1, 0]), r: [0, 0, sx * (0.85 + k * 0.2)], s: [0.25 - k * 0.03, 0.14, 0.27 - k * 0.03], top: C.ironTop, topK: 0.6, shine: 0.8 });
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.24 - k * 0.04, 0.045, V.skel ? C.bone : C.ironD, [S[0] + sx * 0.1, S[1] + 0.22, S[2] - 0.13 + k * 0.13], [sx * 0.55, 1, 0], { bone: ub, shine: 0.7 });
    if (sx < 0 || V.skel) {
      // Schädel auf der Schulter
      const sk = [S[0] + sx * 0.2, S[1] + 0.12, S[2] + 0.14];
      A(ball(12), C.bone, { bone: ub, p: sk, s: [0.085, 0.08, 0.09], top: C.boneTop, topK: 0.5, shine: 0.3 });
      A(roundBox(0.09, 0.04, 0.06, 0.015), C.bone, { bone: ub, p: [sk[0], sk[1] - 0.07, sk[2] + 0.04], shine: 0.3 });
      for (const ex of [-1, 1]) A(ball(6), '#141210', { bone: ub, p: [sk[0] + ex * 0.032, sk[1] + 0.005, sk[2] + 0.075], s: [0.022, 0.024, 0.012], noShadow: true });
    }
  }
  // --- Brustgurte mit Medaillon ---
  for (const sx of [-1, 1]) A(tube3([[sx * 0.42, 1.78, 0.2], [sx * 0.25, 1.66, 0.4], [0, 1.56, 0.44], [-sx * 0.25, 1.4, 0.38], [-sx * 0.34, 1.26, 0.28]], 0.028, 0.028, 18, 6), C.leather, { bone: BB3.chest, shade: 0.2 });
  A(cyl3(0.09, 0.09, 0.03, 16), C.gold, { bone: BB3.chest, p: [0, 1.56, 0.465], r: [Math.PI / 2, 0, 0], shine: 1 });
  bsGem3(A, C.glow, [0, 1.56, 0.485], [0.04, 0.05, 0.025], null, BB3.chest);
  // --- Gürtel, Schädelschnalle, Lendentuch, Beinplatten ---
  A(torus3(0.32, 0.045, Math.PI * 2, 5, 24), C.leather, { bone: BB3.pelvis, p: [0, 1.02, 0.02], r: [Math.PI / 2, 0, 0], s: [1.04, 0.8, 1.2], shade: 0.2 });
  A(cyl3(0.08, 0.08, 0.04, 14), C.gold, { bone: BB3.pelvis, p: [0, 1.02, 0.28], r: [Math.PI / 2, 0, 0], shine: 1 });
  A(ball(10), C.bone, { bone: BB3.pelvis, p: [0, 1.02, 0.3], s: [0.06, 0.06, 0.04], shine: 0.3 });
  for (const sz of [1, -1]) {
    const z0 = sz > 0 ? 0.25 : -0.21;
    bsSheetAdd3(b, A, bsSheet3(id + 'lenden' + sz, 4, 6, (u, v) => [(u - 0.5) * 0.36 * (1 - 0.2 * v), 0.98 - v * 0.52, z0 + sz * (0.03 + 0.06 * v)], () => [[BB3.pelvis, 1]], (u, v, s) => (v > 0.88 ? C.clothD : s > 0 ? C.cloth : darker(C.cloth, 0.2))), false);
  }
  for (const sx of [-1, 1]) {
    const [tb, sb, fb] = bsLegB3(sx);
    A(roundBox(0.2, 0.26, 0.05, 0.02), C.ironD, { bone: tb, p: [sx * 0.33, 0.86, 0.04], r: [0, sx * 0.35, sx * 0.25], top: C.ironTop, topK: 0.6, shine: 0.8 });
    // Knieschutz
    A(roundBox(0.15, 0.13, 0.08, 0.03), C.iron, { bone: sb, p: [sx * J.hipX, J.kneeY + 0.02, 0.13], r: [-0.2, 0, 0], top: C.ironTop, shine: 0.8 });
    bsSpike3(A, 0.09, 0.025, C.ironD, [sx * J.hipX, J.kneeY + 0.03, 0.17], [0, 0.3, 1], { bone: sb, shine: 0.7 });
    // Stiefel mit Fellstulpe
    const Ak = P[sx].A;
    A(ball(12), C.leather, { bone: fb, p: [Ak[0], 0.1, 0.08], s: [0.13, 0.11, 0.23], top: lighter(C.leather, 0.15), topK: 0.5, shade: 0.3 });
    A(roundBox(0.2, 0.06, 0.12, 0.03), C.ironD, { bone: fb, p: [Ak[0], 0.08, 0.24], shine: 0.7 });
    A(cyl3(0.12, 0.13, 0.2, 14), C.leather, { bone: sb, p: [Ak[0], 0.25, 0.0], shade: 0.2 });
    const cuff = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      cuff.push([[Ak[0] + Math.sin(a) * 0.13, 0.36, Math.cos(a) * 0.13], [Math.sin(a) * 0.6, -0.6, Math.cos(a) * 0.6], 0.1, 0.045, sb]);
    }
    bsTufts3(A, cuff, C.fur, C.furTop);
  }
  // --- Armschienen und Hände ---
  for (const sx of [-1, 1]) {
    const [, fb] = bsArmB3(sx);
    const W = P[sx].W, E = P[sx].E;
    const m = bsLerp3(E, W, 0.6);
    A(cyl3(0.165, 0.14, 0.26, 14), C.leather, { bone: fb, p: m, r: [0, 0, sx * 0.08], shade: 0.2 });
    A(torus3(0.16, 0.015, Math.PI * 2, 4, 14), C.gold, { bone: fb, p: [m[0], m[1] + 0.1, m[2]], r: [Math.PI / 2, 0, 0], shine: 1, noShadow: true });
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.11, 0.026, V.skel ? C.bone : C.ironD, [m[0] + sx * 0.15, m[1] - 0.08 + k * 0.08, m[2] - 0.02], [sx, 0.15, -0.2], { bone: fb, shine: 0.7 });
    bsHand3(A, sx, P, 0.13, C.skin, { top: C.skinTop, claw: V.skel ? C.bone : null });
  }
  // --- Hackbeil in der rechten Hand (seit 14.82 V.axe2: Doppelaxt mit Glutschneiden) ---
  if (V.axe2) {
    const G = BS_ORC_G3, hbR = BB3.haR;
    A(cyl3(0.04, 0.045, 1.5, 10), C.shaft, { bone: hbR, p: [G[0], G[1], G[2] + 0.25], r: [Math.PI / 2, 0, 0], shade: 0.2 });
    for (const z of [-0.45, 0.05, 0.8]) A(torus3(0.05, 0.013, Math.PI * 2, 4, 10), C.gold, { bone: hbR, p: [G[0], G[1], G[2] + z], r: [Math.PI / 2, 0, 0], shine: 1, noShadow: true });
    const T = [G[0], G[1], G[2] + 0.88];
    for (const sy of [-1, 1]) {
      A(bsBlade3('gorthak-axt', [[0, 0.06], [0.14, 0.1], [0.5, 0.36], [0.56, 0], [0.5, -0.36], [0.14, -0.1], [0, -0.06]], 0.045, 0.014), C.blade, { bone: hbR, p: T, r: [sy > 0 ? 0 : Math.PI, 0, Math.PI / 2], top: C.bladeTop, topK: 0.5, shine: 0.95 });
      A(box3(), C.glow, { bone: hbR, p: [T[0], T[1] + sy * 0.54, T[2]], s: [0.035, 0.03, 0.6], mat: 'glow', noShadow: true });
    }
    bsSpike3(A, 0.3, 0.045, C.ironD, [T[0], T[1], T[2] + 0.12], [0, 0, 1], { bone: hbR, shine: 0.9 });
  } else {
    const G = BS_ORC_G3;
    const hbR = BB3.haR;
    A(cyl3(0.035, 0.04, 1.35, 10), C.shaft, { bone: hbR, p: [G[0], G[1], G[2] + 0.2], r: [Math.PI / 2, 0, 0], shade: 0.2 });
    for (const z of [-0.42, -0.05, 0.08, 0.72]) A(torus3(0.045, 0.012, Math.PI * 2, 4, 10), C.gold, { bone: hbR, p: [G[0], G[1], G[2] + z], shine: 1, r: [Math.PI / 2, 0, 0], noShadow: true });
    bsSpike3(A, 0.12, 0.035, C.ironD, [G[0], G[1], G[2] - 0.48], [0, 0, -1], { bone: hbR, shine: 0.8 });
    const bp = [[0, 0.06], [0.1, 0.1], [0.42, 0.06], [0.62, -0.06], [0.68, -0.6], [0.52, -0.66], [0.3, -0.6], [0.24, -0.52], [0.1, -0.5], [0.02, -0.12]];
    const bladeCol = V.skel ? C.boneD : C.blade;
    A(bsBlade3(id + 'beil', bp, 0.05, 0.014), bladeCol, { bone: hbR, p: [G[0], G[1] + 0.02, G[2] + 0.3], top: V.skel ? C.bone : C.bladeTop, topK: 0.5, shine: V.skel ? 0.3 : 0.9 });
    // Schneide heller, Glutrunen auf beiden Seiten
    A(box3(), V.skel ? C.boneTop : C.edge, { bone: hbR, p: [G[0], G[1] - 0.58, G[2] + 0.73], r: [0, 0, 0], s: [0.03, 0.04, 0.4], shine: 1, noShadow: true });
    for (const sx of [-1, 1]) for (const [u, v, r] of [[0.3, -0.18, 0.4], [0.45, -0.3, -0.3], [0.3, -0.38, 0.9]]) A(box3(), C.glow, { bone: hbR, p: [G[0] + sx * 0.035, G[1] + 0.02 + v, G[2] + 0.3 + u], r: [r, 0, 0], s: [0.01, 0.1, 0.02], mat: 'glow', noShadow: true });
    if (V.skel) for (let k = 0; k < 5; k++) bsSpike3(A, 0.09, 0.025, C.boneTop, [G[0], G[1] - 0.62, G[2] + 0.4 + k * 0.07], [0, -1, 0.2], { bone: hbR, seg: 4 });
  }
  // --- Kriegsbanner am Rücken mit Trophäen (seit 14.82 V.shield: Rundschild mit Stacheln und Schädel) ---
  if (V.shield) {
    const cb = BB3.chest;
    A(cyl3(0.46, 0.46, 0.07, 22), C.leather, { bone: cb, p: [0, 1.62, -0.36], r: [Math.PI / 2 - 0.15, 0, 0], top: lighter(C.leather, 0.15), shade: 0.2 });
    A(torus3(0.46, 0.04, Math.PI * 2, 4, 22), C.iron, { bone: cb, p: [0, 1.62, -0.4], r: [-0.15, 0, 0], shine: 0.9 });
    A(ball(12), C.bone, { bone: cb, p: [0, 1.62, -0.44], s: [0.11, 0.1, 0.08], shine: 0.3 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      bsSpike3(A, 0.12, 0.03, C.ironD, [Math.cos(a) * 0.36, 1.62 + Math.sin(a) * 0.36, -0.41], [0, 0, -1], { bone: cb, shine: 0.9 });
    }
    bsSheetAdd3(b, A, bsSheet3(id + 'fahne', 3, 6, (u, v) => [0.3 + u * 0.12, 2.3 - v * 0.7, -0.36], (u, v) => [[BB3.c1, 1 - v], [BB3.c2, v]], (u, v, s2) => (v > 0.85 ? C.clothD : C.banner)), false);
    A(cyl3(0.02, 0.02, 0.9, 6), C.shaft, { bone: cb, p: [0.36, 2.2, -0.36] });
  } else {
    const cb = BB3.chest;
    const x = 0.14;
    A(cyl3(0.035, 0.04, 1.5, 8), C.shaft, { bone: cb, p: [x, 2.1, -0.42], r: [0.06, 0, 0], shade: 0.2 });
    A(cyl3(0.025, 0.025, 0.7, 8), C.shaft, { bone: cb, p: [x, 2.82, -0.46], r: [0, 0, Math.PI / 2] });
    A(roundBox(0.12, 0.1, 0.12, 0.03), C.leather, { bone: cb, p: [x, 1.55, -0.36], shade: 0.2 });
    if (V.skel) {
      A(ball(12), C.bone, { bone: cb, p: [x, 2.95, -0.46], s: [0.1, 0.09, 0.11], shine: 0.3 });
      for (const sx of [-1, 1]) A(tube3([[x + sx * 0.08, 2.98, -0.46], [x + sx * 0.2, 3.06, -0.48], [x + sx * 0.24, 3.2, -0.44]], 0.035, 0.005, 10, 6), C.bone, { bone: cb, shine: 0.3 });
    } else {
      A(ball(12), C.bone, { bone: cb, p: [x, 2.94, -0.46], s: [0.09, 0.085, 0.1], shine: 0.3 });
      for (const sx of [-1, 1]) A(tube3([[x + sx * 0.07, 2.97, -0.46], [x + sx * 0.22, 3.0, -0.44], [x + sx * 0.3, 3.14, -0.4]], 0.035, 0.005, 10, 6), C.horn, { bone: cb, top: C.hornTip, shine: 0.5 });
    }
    for (const sx of [-1, 1]) bsSpike3(A, 0.1, 0.02, C.ironD, [x + sx * 0.36, 2.82, -0.46], [sx, 0, 0], { bone: cb, shine: 0.8 });
    // Banner: oben am Querholz, weht am Umhang-Knochen; Vharok: zerfetzt
    const tat = V.skel ? 0.22 : 0.06;
    bsSheetAdd3(b, A, bsSheet3(id + 'banner', 6, 8, (u, v) => {
      const cut = v > 0.7 ? tat * Math.abs(Math.sin(u * 13)) : 0;
      return [x + (u - 0.5) * 0.62, 2.8 - Math.min(v, 1 - cut) * 0.78, -0.48 - 0.04 * Math.sin(u * Math.PI)];
    }, (u, v) => [[BB3.c1, 1 - v], [BB3.c2, v]], (u, v, s) => {
      const r = Math.hypot(u - 0.5, v - 0.42);
      return r < 0.17 && r > 0.1 ? C.sigil : v > 0.84 || v < 0.06 ? C.clothD : s > 0 ? C.banner : darker(C.banner, 0.18);
    }), true);
    for (let k = 0; k < 3; k++) bsChainLinks3(A, [x - 0.2 + k * 0.2, 2.78, -0.48], [x - 0.2 + k * 0.2, 2.5 - k * 0.05, -0.5], 3, 0.022, V.skel ? C.bone : C.gold, BB3.c1);
  }
  return bsRes3(id, rig, J, 2.62, V.worldH);
}
const BS_GORBAG3 = {
  skin: '#3e5e26', skinTop: '#5e7e3a', scar: '#26381a', eye: '#ffb04a', paint: '#8a1a14', tusk: '#e8dcc0', hair: '#14100c',
  iron: '#3a3a42', ironD: '#26262c', ironTop: '#6a6a76', gold: '#c8962a', horn: '#d8ccb0', hornTip: '#5a4a3a', bone: '#d8ccb0', boneTop: '#f0e8d4',
  fur: '#5a4632', furTop: '#8a7458', leather: '#4a3020', cloth: '#7a1a14', clothD: '#2a0a08', banner: '#8a1a14', sigil: '#1a1210',
  shaft: '#3a2a1c', blade: '#4a4a52', bladeTop: '#8a8a96', edge: '#c8c8d4', glow: '#ff8a4a', worldH: 7.6
};
const BS_VHAROK3 = Object.assign({}, BS_GORBAG3, {
  skel: true, skin: '#55594a', skinTop: '#767a66', scar: '#2a2c24', eye: '#e8e0c8', paint: '#e8e0c8', iron: '#4a463e', ironD: '#2a2824', ironTop: '#7a7464',
  gold: '#8a8270', fur: '#3a3630', furTop: '#6a645a', leather: '#2e2a24', cloth: '#3a3630', clothD: '#14120e', banner: '#2a2824', sigil: '#c8c0a8',
  shaft: '#c8c0a8', glow: '#e8e0c8', boneD: '#a09884', worldH: 7.6
});
MON3_BUILD.gorbag = (b) => bsOrc3(b, 'gorbag', BS_GORBAG3);
MON3_BUILD.vharok = (b) => bsOrc3(b, 'vharok', BS_VHAROK3);
const BS_ORC_DEF3 = {
  kind: 'biped', melee: ['chop', 'sweep', 'punch'], emit: 'weapon', lineStyle: 'smash', cape: true, blob: 1.35, dome: 1.35,
  base: { aRx: -0.25, aRe: -0.8, aRz: 0.22, aLz: 0.2, aLe: -0.5, lean: 0.12 }, pts: BS_ORC_PTS3, deathPts: ['core', 'mouth', 'weapon'], skyAt: 'sky'
};
BOSS3.gorbag = Object.assign({}, BS_ORC_DEF3, { fx: 'erde', emi: [0.08, 0.04, 0.01] });
BOSS3.vharok = Object.assign({}, BS_ORC_DEF3, { fx: 'knochen', emi: [0.06, 0.06, 0.05] });

// ============================================================================================================
// Fenris, der Urwolf (Karte 1) und Skarn, der Nachtwolf (Karte 11)
// Riesiger Wolf mit tiefer Brust, schmaler Taille und mächtiger Mähne (Hals, Schultern, Wangen), langer Schnauze mit
// Fängen und aufklappbarem Kiefer, Stehohren, buschiger Rute. Fenris trägt die gesprengten Fesseln der Götter: Halsring
// und Fußringe aus Eisen mit glühenden Goldrunen, daran zerrissene Ketten. Skarn: fast schwarz, Mähnenspitzen und
// Zeichnungen leuchten nachtblau, Knochenmaske auf der Schnauze, Mondsichel auf der Stirn, Schattennebel steigt auf.
// ============================================================================================================
const BS_WOLF_J3 = {
  body: [0, 1.2, -0.6], chest: [0, 1.28, 0.4], neck: [0, 1.45, 0.82], head: [0, 1.62, 1.12], jaw: [0, 1.56, 1.18],
  tail: [[0, 1.3, -1.12], [0, 1.2, -1.5], [0, 1.03, -1.86]],
  fl: [[0.3, 1.12, 0.5], [0.32, 0.62, 0.38], [0.32, 0.16, 0.48], [0.32, 0.02, 0.66]],
  bl: [[0.33, 1.15, -0.7], [0.35, 0.74, -0.46], [0.35, 0.36, -0.88], [0.35, 0.02, -0.72]],
  ear: [0.12, 1.84, 1.04]
};
const BS_WOLF_PTS3 = { mouth: [BQ3.jaw, [0, 1.56, 1.6]], emit: [BQ3.head, [0, 1.58, 1.66]], core: [BQ3.chest, [0, 1.25, 0.65]], weapon: [BQ3.pwFL, [0.32, 0.1, 0.62]], back: [BQ3.chest, [0, 1.7, 0.2]], sky: [BQ3.head, [0, 1.9, 1.3]] };
function bsWolf3(b, id, V) {
  const A = adder(b, null);
  const J = BS_WOLF_J3, C = V;
  const rig = bsQuadRig3(J);
  const fur = { top: C.furTop, topK: 0.55, shade: 0.3, shadowExact: true };
  // Rumpf
  const rows = [[-1.15, 1.25, 0.16, 0.14, 0.16], [-0.95, 1.25, 0.29, 0.22, 0.27], [-0.65, 1.23, 0.31, 0.24, 0.28], [-0.3, 1.2, 0.27, 0.23, 0.23],
    [0.05, 1.22, 0.3, 0.26, 0.3], [0.38, 1.28, 0.37, 0.3, 0.46], [0.66, 1.36, 0.36, 0.32, 0.44], [0.88, 1.46, 0.28, 0.27, 0.32], [1.0, 1.52, 0.18, 0.18, 0.2]];
  const bodyW = bsChain3([[BQ3.body, [0, 1.22, -1.2]], [BQ3.body, J.body], [BQ3.chest, [0, 1.28, 0.15]], [BQ3.neck, J.neck], [BQ3.head, J.head]]);
  A(bsSkin3(id + ':rumpf' + GEO3_LOD, loft3(rows, 18, 4), bodyW), C.fur, fur);
  // Hals
  const neckW = bsChain3([[BQ3.chest, [0, 1.3, 0.5]], [BQ3.neck, J.neck], [BQ3.head, J.head], [BQ3.head, [0, 1.66, 1.3]]]);
  A(bsSkin3(id + ':hals' + GEO3_LOD, tubeProfile3([[0, 1.3, 0.52], [0, 1.45, 0.84], [0, 1.6, 1.1]], [0.32, 0.25, 0.19], 14, 14), neckW), C.fur, fur);
  // Bauch heller
  A(bsSkin3(id + ':bauch' + GEO3_LOD, loft3([[-0.5, 1.04, 0.16, 0.08, 0.06], [-0.1, 1.0, 0.18, 0.1, 0.07], [0.35, 0.86, 0.22, 0.12, 0.07], [0.62, 0.98, 0.18, 0.12, 0.06]], 12, 3), bodyW), C.belly, { shade: 0.3, noShadow: true });
  // Beine (weich gewichtet) mit Pfoten und Krallen
  for (const [L, front] of [[J.fl, true], [J.bl, false]]) {
    for (const sx of [1, -1]) {
      const [ub, lb, pb] = bsLegQ3(front, sx);
      const Q = L.map((q) => [sx * q[0], q[1], q[2]]);
      const r = front ? [0.2, 0.15, 0.1, 0.085, 0.075] : [0.24, 0.19, 0.1, 0.08, 0.075];
      const pts = [Q[0], bsLerp3(Q[0], Q[1], 0.5), Q[1], bsLerp3(Q[1], Q[2], 0.5), Q[2]];
      A(bsSkin3(id + ':bein' + front + sx + GEO3_LOD, tubeProfile3(pts, r, 16, 12), bsChain3([[ub, Q[0]], [lb, Q[1]], [pb, Q[2]], [pb, Q[3]]])), C.fur, fur);
      // Schulter-/Schenkelmuskel
      A(ball(14), C.fur, { bone: ub, p: [Q[0][0] - sx * 0.02, Q[0][1] - 0.15, Q[0][2] + (front ? 0.02 : 0.05)], s: front ? [0.17, 0.27, 0.22] : [0.19, 0.29, 0.26], top: C.furTop, topK: 0.6, shade: 0.3 });
      // Pfote: Ballen, vier Zehen, Krallen (seit 14.82 V.hooves: gespaltene Hufe mit Fesselbüschel, Raik)
      const T = Q[3];
      if (V.hooves) {
        A(tubeProfile3([Q[2], [T[0], 0.12, (Q[2][2] + T[2]) / 2]], [0.075, 0.08], 6, 8), C.fur, { bone: pb, top: C.furTop, topK: 0.5 });
        for (const hx of [-1, 1]) A(ball(8), C.hoof, { bone: pb, p: [T[0] + hx * 0.045, 0.06, (Q[2][2] + T[2]) / 2 + 0.04], s: [0.045, 0.06, 0.08], shine: 0.6 });
        bsTufts3(A, [0, 1, 2, 3].map((k) => [[T[0] + Math.sin(k * 1.6) * 0.07, 0.16, (Q[2][2] + T[2]) / 2 + Math.cos(k * 1.6) * 0.06], [Math.sin(k * 1.6), -1, Math.cos(k * 1.6)], 0.12, 0.04, pb]), C.furD, C.fur);
      } else A(tubeProfile3([Q[2], [T[0], 0.09, (Q[2][2] + T[2]) / 2], [T[0], 0.07, T[2]]], [0.08, 0.075, 0.08], 6, 8), C.fur, { bone: pb, top: C.furTop, topK: 0.5 });
      for (let k = 0; k < (V.hooves ? 0 : 4); k++) {
        const a = (k - 1.5) * 0.3;
        const p0 = [T[0] + Math.sin(a) * 0.08, 0.05, T[2] + Math.cos(a) * 0.06];
        A(ball(8), darker(C.fur, 0.15), { bone: pb, p: p0, s: [0.04, 0.035, 0.05], noShadow: true });
        bsSpike3(A, 0.09, 0.016, C.claw, [p0[0], 0.04, p0[2] + 0.04], [Math.sin(a) * 0.3, -0.35, 1], { bone: pb, seg: 5, shine: 0.6 });
      }
      // Fellbüschel am Ellbogen / Sprunggelenk
      bsTufts3(A, [[bsLerp3(Q[1], Q[2], 0.15), [sx * 0.3, -0.3, -1], 0.16, 0.05, lb], [bsLerp3(Q[1], Q[2], 0.35), [sx * 0.5, -0.4, -1], 0.13, 0.045, lb]], C.furD, C.fur);
    }
  }
  // Rute: buschig, mit Büscheln
  const tp = [[0, 1.3, -1.08], [0, 1.24, -1.45], [0, 1.08, -1.82], [0, 0.88, -2.15], [0, 0.72, -2.38]];
  const tailW = bsChain3([[BQ3.body, [0, 1.3, -0.9]], [BQ3.t1, J.tail[0]], [BQ3.t2, J.tail[1]], [BQ3.t3, J.tail[2]], [BQ3.t3, [0, 0.7, -2.4]]]);
  // seit 14.82: V.tail 'cat' (lang und dünn mit Quaste), 'stub' (kurz, Bock)
  if (V.tail === 'cat') {
    A(bsSkin3(id + ':rute' + GEO3_LOD, tubeProfile3(tp, [0.09, 0.075, 0.065, 0.055, 0.04], 18, 8), tailW), C.fur, fur);
    bsTufts3(A, [0, 1, 2].map((k) => [[0, 0.74, -2.36], [Math.sin(k * 2.1) * 0.4, -0.3, -1], 0.2, 0.06, BQ3.t3]), C.furD, C.fur);
  } else if (V.tail === 'stub') A(ball(10), C.fur, { bone: BQ3.t1, p: [0, 1.32, -1.16], s: [0.1, 0.13, 0.12], top: C.furTop });
  else A(bsSkin3(id + ':rute' + GEO3_LOD, tubeProfile3(tp, [0.11, 0.16, 0.17, 0.13, 0.03], 18, 10), tailW), C.fur, fur);
  for (let i = 0; i < (V.tail ? 0 : 12); i++) {
    const u = 0.15 + (i / 11) * 0.8;
    const f = u * (tp.length - 1), k0 = Math.min(tp.length - 2, Math.floor(f));
    const p = bsLerp3(tp[k0], tp[k0 + 1], f - k0);
    const a = i * 2.4;
    const bn = aelBoneAt3(tailW, p);
    bsTufts3(A, [[[p[0] + Math.cos(a) * 0.1, p[1] + Math.sin(a) * 0.1, p[2]], [Math.cos(a) * 0.5, Math.sin(a) * 0.5, -1], 0.2, 0.06, bn]], i % 3 ? C.fur : C.furD, C.furTop);
  }
  if (V.glow2) bsGem3(A, C.glow, [0, 0.74, -2.36], [0.05, 0.05, 0.12], null, BQ3.t3);

  // --- Kopf: Schädel, lange Schnauze, Nase, Brauen, Augen, Ohren, Zähne ---
  // seit 14.81 als Funktion: Zerberos (V.heads3, bosse3d-modelle2.js) trägt zwei weitere Köpfe am Hals
  const wolfHead = (A, hb, jb, ears) => {
    if (V.headKind) return bsBeastHead3(A, hb, jb, J, C, V);
    A(ball(16), C.fur, { bone: hb, p: [0, 1.7, 1.15], s: [0.21, 0.19, 0.23], top: C.furTop, topK: 0.55, shade: 0.25 });
    A(loft3([[1.2, 1.64, 0.16, 0.12, 0.08], [1.35, 1.61, 0.115, 0.09, 0.06], [1.5, 1.59, 0.085, 0.07, 0.045], [1.6, 1.58, 0.058, 0.052, 0.035], [1.65, 1.575, 0.03, 0.03, 0.02]], 12, 3), C.fur, { bone: hb, top: C.furTop, topK: 0.5, shade: 0.2 });
    A(ball(10), '#121014', { bone: hb, p: [0, 1.615, 1.64], s: [0.045, 0.035, 0.035], shine: 0.8 });
    A(loft3([[1.2, 1.53, 0.12, 0.04, 0.05], [1.38, 1.53, 0.09, 0.03, 0.04], [1.54, 1.535, 0.055, 0.025, 0.03], [1.6, 1.535, 0.03, 0.02, 0.02]], 10, 2), C.furD, { bone: jb, shade: 0.3 });
    A(loft3([[1.22, 1.555, 0.1, 0.02, 0.02], [1.5, 1.555, 0.06, 0.015, 0.015]], 8, 2), '#3a1418', { bone: jb, noShadow: true });
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const z = 1.28 + k * 0.07;
        const x = sx * (0.1 - k * 0.012);
        bsSpike3(A, k === 4 ? 0.09 : 0.04, 0.013, C.tooth, [x, 1.565, z], [0, -1, 0.15], { bone: hb, seg: 4 });
        bsSpike3(A, k === 3 ? 0.075 : 0.035, 0.012, C.tooth, [x * 0.9, 1.55, z - 0.02], [0, 1, 0.1], { bone: jb, seg: 4 });
      }
      A(ball(10), '#0e0c10', { bone: hb, p: [sx * 0.1, 1.715, 1.3], s: [0.05, 0.03, 0.05], noShadow: true });
      A(ball(8), C.eye, { bone: hb, p: [sx * 0.105, 1.715, 1.315], s: [0.035, 0.016, 0.03], r: [0, sx * 0.4, sx * 0.25], mat: 'glow' });
      A(roundBox(0.09, 0.035, 0.14, 0.015), C.furD, { bone: hb, p: [sx * 0.1, 1.755, 1.28], r: [0.25, sx * 0.3, sx * 0.3], shade: 0.2 });
      // Ohren am Ohrknochen
      const eb = ears ? (sx > 0 ? BQ3.earL : BQ3.earR) : hb;
      const E = [sx * J.ear[0], J.ear[1], J.ear[2]];
      pointAt3(A, horn3(0.28, 0.085, 6), C.fur, E, [sx * 0.35, 1, -0.25], { bone: eb, top: C.furTop, topK: 0.6, s: [1, 1, 0.45] });
      pointAt3(A, horn3(0.2, 0.05, 5), V.earIn, [E[0], E[1] + 0.02, E[2] + 0.025], [sx * 0.35, 1, -0.25], { bone: eb, s: [1, 1, 0.3], noShadow: true });
      // Wangenkrause
      bsTufts3(A, [0, 1, 2, 3].map((k) => [[sx * 0.18, 1.62 - k * 0.05, 1.12 - k * 0.04], [sx * 0.8, -0.2 - k * 0.15, -0.5], 0.2 - k * 0.02, 0.06, hb]), C.ruff, C.furTop);
    }
  };
  wolfHead(A, BQ3.head, BQ3.jaw, true);
  const hb = BQ3.head;
  if (V.heads3) for (const sx of [-1, 1]) {
    const c = [0, 1.62, 1.1];
    const M = new THREE.Matrix4().makeTranslation(c[0] + sx * 0.36, c[1] - 0.12, c[2] - 0.2).multiply(new THREE.Matrix4().makeRotationY(sx * 0.42)).multiply(new THREE.Matrix4().makeRotationX(0.12)).multiply(new THREE.Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
    const AS = adder(b, M);
    wolfHead(AS, BQ3.neck, BQ3.neck, false);
    // Hals zum Seitenkopf
    A(tubeProfile3([[sx * 0.12, 1.36, 0.62], [sx * 0.26, 1.42, 0.86], [sx * 0.34, 1.5, 0.98]], [0.2, 0.16, 0.14], 10, 10), C.fur, { bone: BQ3.neck, top: C.furTop, topK: 0.55, shade: 0.3 });
  }
  // --- Mähne: dichte Büschel an Hals und Schultern, Kamm über den Rücken ---
  const mane = [];
  for (let i = 0; i < 34; i++) {
    const u = (i % 17) / 16;
    const row = i < 17 ? 0 : 1;
    const a = (-0.95 + 1.9 * u) * (Math.PI / 2) * 1.05;
    const z = 0.95 - row * 0.32 - Math.abs(Math.sin(a)) * 0.05;
    const y = 1.42 + row * 0.02;
    const R = 0.3 + row * 0.08;
    const p = [Math.sin(a) * R, y + Math.cos(a) * R * 0.85, z];
    mane.push([p, [Math.sin(a) * 0.8, Math.cos(a) * 0.7 + 0.1, -0.9], 0.36 - row * 0.04 + 0.05 * Math.sin(i * 1.7), 0.1, row ? BQ3.chest : BQ3.neck]);
  }
  for (let i = 0; i < 9; i++) mane.push([[0, 1.62 - i * 0.025, 0.45 - i * 0.18], [0, 0.6, -1], 0.26 - i * 0.012, 0.08, i < 3 ? BQ3.chest : BQ3.body]);
  // Brustlatz
  for (let i = 0; i < 7; i++) mane.push([[(i - 3) * 0.08, 1.12 - Math.abs(i - 3) * 0.03, 0.82], [(i - 3) * 0.12, -1, 0.5], 0.24, 0.07, BQ3.chest]);
  if (V.glow2) {
    // Skarn: Mähnenspitzen leuchten
    mane.forEach((m2, i) => {
      if (i % 2) return;
      const [p, d, len] = m2;
      const l = Math.hypot(...d);
      pointAt3(A, horn3(+(len * 0.45).toFixed(3), 0.035, 4), C.glow, [p[0] + (d[0] / l) * len * 0.6, p[1] + (d[1] / l) * len * 0.6, p[2] + (d[2] / l) * len * 0.6], d, { bone: m2[4], mat: 'glow', noShadow: true });
    });
  }
  // seit 14.82 V.mane: 0 keine Mähne (Katzen), 'small' nur Halskrause (Bock, Wächterwölfe – weniger Dreiecke)
  if (V.mane === 'small') bsTufts3(A, mane.filter((m2, i) => i < 17 && i % 2 === 0), C.ruff, C.furTop, { seg: 5 });
  else if (V.mane !== 0) bsTufts3(A, mane, C.ruff, C.furTop, { seg: 5 });
  if (V.extra) V.extra(A, b, id, J, C);

  if (V.shackles) {
    // Halsring mit Dornen und Runen, zerrissene Kette
    A(torus3(0.33, 0.06, Math.PI * 2, 6, 24), C.iron, { bone: BQ3.neck, p: [0, 1.42, 0.78], r: [0.75, 0, 0], s: [1, 1.1, 1], top: C.ironTop, topK: 0.5, shine: 0.9 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const p = [Math.cos(a) * 0.37, 1.42 + Math.sin(a) * 0.4 * Math.cos(0.75), 0.78 - Math.sin(a) * 0.4 * Math.sin(0.75)];
      bsSpike3(A, 0.11, 0.03, C.ironD, p, [Math.cos(a), Math.sin(a) * 0.7, -Math.sin(a) * 0.5], { bone: BQ3.neck, shine: 0.9 });
      if (k % 2) A(roundBox(0.05, 0.07, 0.015, 0.006), C.glow, { bone: BQ3.neck, p: [Math.cos(a + 0.4) * 0.39, 1.42 + Math.sin(a + 0.4) * 0.43 * 0.73, 0.78 - Math.sin(a + 0.4) * 0.43 * 0.68 + 0.02], r: [0.75, 0, a], mat: 'glow', noShadow: true });
    }
    bsChainLinks3(A, [0.05, 1.12, 0.92], [0.12, 0.62, 0.98], 6, 0.05, C.iron, BQ3.neck);
    // Fußringe mit Kettenresten
    for (const [L, front] of [[J.fl, true], [J.bl, false]]) {
      for (const sx of [1, -1]) {
        const [, lb] = bsLegQ3(front, sx);
        const p = [sx * L[2][0], L[2][1] + 0.1, L[2][2] + (front ? 0 : 0.03)];
        A(torus3(0.1, 0.035, Math.PI * 2, 5, 14), C.iron, { bone: lb, p, r: [Math.PI / 2, 0, 0], top: C.ironTop, shine: 0.9 });
        A(torus3(0.112, 0.01, Math.PI * 2, 3, 14), C.glow, { bone: lb, p: [p[0], p[1] + 0.012, p[2]], r: [Math.PI / 2, 0, 0], mat: 'glow', noShadow: true });
        if (front === (sx > 0)) bsChainLinks3(A, [p[0] + sx * 0.1, p[1] - 0.02, p[2] - 0.05], [p[0] + sx * 0.18, 0.05, p[2] - 0.32], 4, 0.04, C.iron, lb);
      }
    }
  }
  if (V.mask) {
    // Skarn: Knochenmaske auf Schnauze und Stirn, Mondsichel, leuchtende Zeichnungen auf den Flanken
    A(loft3([[1.22, 1.66, 0.14, 0.09, 0.02], [1.4, 1.63, 0.1, 0.07, 0.02], [1.55, 1.605, 0.065, 0.05, 0.02]], 10, 2), C.mask, { bone: hb, shine: 0.3, top: '#f4f0e4', topK: 0.5 });
    A(torus3(0.07, 0.016, Math.PI * 1.2, 4, 14), C.glow, { bone: hb, p: [0, 1.83, 1.2], r: [-0.3, 0, -Math.PI * 0.1], mat: 'glow', noShadow: true });
    for (const sx of [-1, 1]) {
      bsSpike3(A, 0.14, 0.03, C.mask, [sx * 0.1, 1.82, 1.1], [sx * 0.3, 1, -0.7], { bone: hb, shine: 0.3 });
      for (const [z, y, r] of [[0.45, 1.35, 0.4], [0.2, 1.3, 0.2], [-0.15, 1.28, 0.5], [-0.55, 1.3, 0.3]]) {
        A(box3(), C.glow, { bone: z > 0.15 ? BQ3.chest : BQ3.body, p: [sx * 0.3, y, z], r: [r, 0, 0], s: [0.012, 0.18, 0.04], mat: 'glow', noShadow: true });
      }
    }
  }
  return bsRes3(id, rig, J, 2.0, V.worldH);
}
const BS_FENRIS3 = {
  fur: '#3a3e46', furTop: '#646a76', furD: '#26282e', ruff: '#2e3038', belly: '#7a7e86', claw: '#d8d0c0', tooth: '#efe8da', eye: '#ffcc4a',
  earIn: '#4a2a2e', iron: '#4a4a52', ironD: '#2a2a30', ironTop: '#7a7a86', glow: '#ffcc4a', shackles: true, worldH: 6.2
};
const BS_SKARN3 = Object.assign({}, BS_FENRIS3, {
  fur: '#1e1e28', furTop: '#34344a', furD: '#121218', ruff: '#18181f', belly: '#3a3a4e', eye: '#c8d0ff', earIn: '#2a2240', glow: '#9aa8ff',
  mask: '#d8d4c8', shackles: false, glow2: true, worldH: 6.2
});
MON3_BUILD.fenris = (b) => bsWolf3(b, 'fenris', BS_FENRIS3);
MON3_BUILD.skarn = (b) => bsWolf3(b, 'skarn', BS_SKARN3);
const BS_WOLF_DEF3 = { kind: 'quad', melee: ['bite', 'claw', 'bite', 'maul'], howl: true, blob: 1.5, dome: 1.45, pts: BS_WOLF_PTS3, deathPts: ['core', 'mouth', 'back'], skyAt: 'sky', gait: 0.9, tailUp: 0.1 };
BOSS3.fenris = Object.assign({}, BS_WOLF_DEF3, {
  fx: 'wild', emi: [0.08, 0.06, 0.01],
  // Runenglut steigt von den Fesseln auf
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.7 + i * 0.25) % 1;
      bsPtA3(a, BOSS3.fenris, i % 2 ? 'core' : 'weapon', _b3P);
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1 + t) * 0.4, _b3P.y + v * 1.6, _b3P.z + Math.cos(i * 1.3) * 0.4, 0.18, 'spark', th.mid, 0.7 * (1 - v));
    }
  }
});
BOSS3.skarn = Object.assign({}, BS_WOLF_DEF3, {
  fx: 'nacht', emi: [0.03, 0.04, 0.1],
  // Schattennebel steigt aus der Mähne, Funken in Nachtblau
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    for (let i = 0; i < 6; i++) {
      const v = (t * 0.45 + i / 6) % 1;
      bsPtA3(a, BOSS3.skarn, 'back', _b3P);
      const ox = Math.sin(i * 2.4) * 0.9, oz = Math.cos(i * 1.7) * 0.9;
      bsSmoke3(h, _b3P.x + ox, _b3P.y + v * 1.8, _b3P.z + oz, 0.6 + v * 1.2, '#14142a', 0.35 * Math.sin(Math.PI * v));
      if (i % 2) bsSprite3(h, _b3P.x + ox * 0.6, _b3P.y + v * 2.2, _b3P.z + oz * 0.6, 0.2, 'spark', th.mid, 0.8 * (1 - v));
    }
  }
});

// ============================================================================================================
// Schlangengöttin Vritra (Karte 2) und Moormutter Veyla (Karte 16): Naga
// Langer Schlangenleib, am Boden in einem Bogen geringelt und vorn aufgerichtet, Schuppenmuster und Rückenkamm; darauf
// ein schlanker Frauenkörper. Vritra: Kobrahaube mit Brillenzeichnung, vier Kobras wachsen aus den Schultern, goldene
// Krone, Halskragen und Schuppenrock, zwei Sichelklingen mit leuchtender Schneide. Veyla: Moorhexe mit Haar aus Schilf
// und Moos, Geweihkrone aus Wurzeln mit Leuchtpilzen, Moosumhang, Stab mit glimmendem Schädel-Laternchen, Krallenhand.
// ============================================================================================================
const BS_NAGA_J3 = {
  coil: [[0.55, 0.05, -0.12], [0.85, 0.09, -0.65], [0.48, 0.12, -1.12], [-0.2, 0.14, -1.1], [-0.65, 0.16, -0.62], [-0.48, 0.18, -0.04], [0, 0.22, 0.22], [0, 0.66, 0.14], [0, 1.1, 0]],
  waistY: 1.32, chestY: 1.55, shY: 1.8, shX: 0.32, neckY: 1.92, headY: 2.0, headZ: 0.06, hunch: 0.06, upper: 0.42, fore: 0.38, hand: 0.13, armOut: 0.07, jaw: [-0.05, 0.06]
};
const BS_NAGA_R3 = bsNagaRig3(BS_NAGA_J3);
const BS_NAGA_PTS3 = {
  mouth: [BN3.jaw, [0, 2.02, 0.2]], core: [BN3.chest, [0, 1.6, 0.25]], back: [BN3.chest, [0, 1.85, -0.2]],
  emit: [BN3.jaw, [0, 2.02, 0.2]], weapon: [BN3.haR, [-0.5, 0.95, 0.45]], sky: [BN3.haR, [-0.5, 0.95, 0.45]], tail: [BN3.n2, [0.48, 0.2, -1.12]]
};
function bsNaga3(b, id, V) {
  const A = adder(b, null);
  const J = BS_NAGA_J3, C = V;
  const { rig, P } = BS_NAGA_R3;
  const Cl = J.coil;
  // Schlangenleib: Röhre durch alle Gelenkpunkte, weich über die Kette gewichtet
  const chain = [];
  for (let i = 0; i < 7; i++) chain.push([BN3.n0 + i, Cl[i]]);
  chain.push([BN3.n7, Cl[7]], [BN3.pelvis, Cl[8]], [BN3.spine, [0, J.waistY, 0.02]]);
  const tailW = bsChain3(chain);
  const tpts = Cl.concat([[0, 1.3, 0.01]]);
  A(bsSkin3(id + ':leib' + GEO3_LOD, tubeProfile3(tpts, [0.03, 0.08, 0.13, 0.17, 0.2, 0.22, 0.24, 0.23, 0.21, 0.19], 60, 14), tailW), C.scale, { top: C.scaleTop, topK: 0.55, shade: 0.35, shadowExact: true });
  // Bauchschuppen (helle Platten unten) und Rückenzeichnung (Rauten), Kamm aus Stacheln
  const curve = new THREE.CatmullRomCurve3(tpts.map((q) => new THREE.Vector3(...q)));
  const pt = new THREE.Vector3(), tg = new THREE.Vector3();
  const rr = [0.03, 0.08, 0.13, 0.17, 0.2, 0.22, 0.24, 0.23, 0.21, 0.19];
  const rAt = (u) => { const f = u * (rr.length - 1), i = Math.min(rr.length - 2, Math.floor(f)); return rr[i] + (rr[i + 1] - rr[i]) * (f - i); };
  for (let i = 0; i < 46; i++) {
    const u = 0.04 + (i / 45) * 0.86;
    curve.getPointAt(u, pt);
    curve.getTangentAt(u, tg);
    const r = rAt(u);
    const p = [pt.x, pt.y, pt.z];
    const bn = aelBoneAt3(tailW, p);
    const yaw = Math.atan2(tg.x, tg.z), pitch = -Math.asin(Math.max(-1, Math.min(1, tg.y)));
    const up = u > 0.75;
    // Rückenraute
    if (i % 2 === 0) A(roundBox(+(r * 0.9).toFixed(3), 0.02, +(r * 0.9).toFixed(3), 0.008), C.mark, { bone: bn, p: up ? [p[0], p[1], p[2] - r * 0.92] : [p[0], p[1] + r * 0.93, p[2]], r: up ? [Math.PI / 2 + pitch, 0, Math.PI / 4] : [pitch, yaw + Math.PI / 4, 0], noShadow: true, shine: 0.4 });
    // Kamm
    if (i % 3 === 0 && u > 0.08) bsSpike3(A, r * (V.moss ? 0.5 : 0.8), r * 0.18, C.crest, up ? [p[0], p[1], p[2] - r * 0.95] : [p[0], p[1] + r * 0.95, p[2]], up ? [0, 0.3, -1] : [-tg.x * 0.6, 1, -tg.z * 0.6], { bone: bn, shine: 0.5 });
    if (V.rot && i % 6 === 3 && u < 0.8) {
      A(ball(8), C.sac, { bone: bn, p: [p[0] + 0.03, p[1] + r * 0.8, p[2]], s: [r * 0.5, r * 0.42, r * 0.5], top: C.sacTop, shine: 0.6, noShadow: true });
      A(ball(6), C.glow, { bone: bn, p: [p[0] + 0.03, p[1] + r * 1.15, p[2]], s: [r * 0.22, r * 0.15, r * 0.22], mat: 'glow', noShadow: true });
    }
    if (V.moss && i % 5 === 2) A(ball(8), C.mossC, { bone: bn, p: up ? [p[0] + 0.05, p[1], p[2] - r * 0.85] : [p[0], p[1] + r * 0.85, p[2]], s: [r * 0.7, r * 0.25, r * 0.7], top: lighter(C.mossC, 0.2), noShadow: true });
  }
  // Schwanzspitze: Rassel (Vritra: goldene Ringe) bzw. Wurzelspitze
  for (let k = 0; k < 3; k++) A(torus3(0.045 - k * 0.008, 0.015, Math.PI * 2, 4, 10), V.moss ? C.wood : C.gold, { bone: BN3.n0, p: bsLerp3(Cl[0], Cl[1], 0.12 + k * 0.12), r: [0, Math.atan2(Cl[1][0] - Cl[0][0], Cl[1][2] - Cl[0][2]), 0], shine: 1, noShadow: true });

  // Oberkörper
  const rows = [[1.0, 0, 0.2, 0.17, 0.17], [1.15, 0, 0.21, 0.17, 0.16], [1.3, 0.01, 0.17, 0.13, 0.12], [1.45, 0.03, 0.21, 0.15, 0.13], [1.6, 0.04, 0.23, 0.16, 0.13], [1.73, 0.04, 0.26, 0.14, 0.13], [1.84, 0.05, 0.18, 0.1, 0.1], [1.94, 0.06, 0.075, 0.065, 0.065]];
  bsBipBody3(id, A, { hipY: 1.1 }, P, { C, rows, arm: [0.085, 0.08, 0.06, 0.06, 0.045], noLegs: true, B: BN3, armB: bsArmN3, shade: 0.2, skinTop: C.skinTop });
  for (const sx of [-1, 1]) A(cap3(1, 1.2, 0, Math.PI * 2, 12, 5), V.moss ? C.mossC : C.gold, { bone: BN3.chest, p: [sx * 0.095, 1.6, 0.12], r: [Math.PI / 2 - 0.15, 0, 0], s: [0.065, 0.055, 0.055], shine: V.moss ? 0 : 1 });
  // Schuppen an Hüfte und Schultern
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    A(roundBox(0.09, 0.08, 0.02, 0.01), k % 2 ? C.scale : C.scaleTop, { bone: BN3.pelvis, p: [Math.sin(a) * 0.205, 1.12, Math.cos(a) * 0.18], r: [-0.25, a, 0], noShadow: true });
  }
  // Kopf: Gesicht, Schlitzaugen, Fänge, Brauen, Wangenschuppen
  const hb = BN3.head, jb = BN3.jaw;
  A(ball(16), C.skin, { bone: hb, p: [0, 2.1, 0.1], s: [0.1, 0.125, 0.115], top: C.skinTop, topK: 0.4, shade: 0.2 });
  A(roundBox(0.12, 0.05, 0.1, 0.03), C.skin, { bone: jb, p: [0, 2.0, 0.15], r: [0.2, 0, 0], shade: 0.2 });
  A(ball(8), '#2a0a10', { bone: jb, p: [0, 2.03, 0.2], s: [0.03, 0.01, 0.01], noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(8), '#0a0a0c', { bone: hb, p: [sx * 0.045, 2.12, 0.19], s: [0.032, 0.02, 0.02], r: [0, 0, sx * 0.25], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.045, 2.12, 0.2], s: [0.026, 0.011, 0.012], r: [0, 0, sx * 0.25], mat: 'glow' });
    bsSpike3(A, 0.04, 0.008, C.tooth, [sx * 0.022, 2.035, 0.19], [0, -1, 0.1], { bone: hb, seg: 4 });
    for (let k = 0; k < 3; k++) A(ball(6), C.scaleTop, { bone: hb, p: [sx * (0.085 - k * 0.006), 2.1 - k * 0.025, 0.14 + k * 0.01], s: [0.018, 0.012, 0.018], noShadow: true });
  }
  if (!V.moss) {
    // Vritra: Kobrahaube (zwei Hälften), Haar, Krone, vier Kobras, Kragen, Klingen
    for (const sx of [-1, 1]) {
      const hk = sx > 0 ? BN3.hoodL : BN3.hoodR;
      bsSheetAdd3(b, A, bsSheet3(id + 'haube' + sx, 8, 10, (u, v) => {
        const w = 0.48 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + v * 0.97)), 0.6);
        return [sx * (0.04 + u * w), 1.76 + v * 0.66, -0.1 + 0.1 * u * u - 0.04 * Math.sin(Math.PI * v)];
      }, (u) => [[hk, u], [BN3.neck, 1 - u]], (u, v, s) => {
        const d = Math.hypot((u - 0.55) * 1.6, v - 0.62);
        return d < 0.12 ? '#0a1a14' : d < 0.2 ? C.gold : s > 0 ? mixColor(C.hood, C.hoodEdge, u * u) : C.scaleD;
      }), true);
    }
    for (let k = 0; k < 6; k++) A(tube3([[(k - 2.5) * 0.04, 2.2, 0.0], [(k - 2.5) * 0.06, 2.0, -0.12], [(k - 2.5) * 0.07, 1.7, -0.12], [(k - 2.5) * 0.08, 1.45, -0.16]], 0.03, 0.012, 12, 5), C.hair, { bone: hb, shade: 0.2 });
    A(torus3(0.105, 0.016, Math.PI * 2, 4, 18), C.gold, { bone: hb, p: [0, 2.19, 0.09], r: [Math.PI / 2 - 0.25, 0, 0], shine: 1 });
    for (let k = 0; k < 5; k++) bsSpike3(A, 0.08 + (k === 2 ? 0.05 : 0), 0.016, C.gold, [(k - 2) * 0.045, 2.2, 0.15 - Math.abs(k - 2) * 0.02], [(k - 2) * 0.15, 1, 0.15], { bone: hb, shine: 1 });
    bsGem3(A, C.glow, [0, 2.215, 0.19], [0.022, 0.03, 0.012], null, hb);
    // seit 14.81 Moormutter Vethra (V.rot, bosse3d-modelle2.js): statt der Kobras Brutbeulen und freiliegende Rippen
    if (V.rot) {
      for (const [x, y, z, r] of [[0.16, 1.86, -0.2, 0.09], [-0.13, 1.78, -0.22, 0.08], [0.02, 1.66, -0.24, 0.1], [0.2, 1.6, -0.15, 0.06], [-0.2, 1.62, -0.14, 0.07]]) {
        A(ball(10), C.sac, { bone: BN3.chest, p: [x, y, z], s: [r, r * 0.9, r], top: C.sacTop, topK: 0.5, shine: 0.6 });
        A(ball(8), C.glow, { bone: BN3.chest, p: [x, y + r * 0.2, z - r * 0.55], s: [r * 0.45, r * 0.4, r * 0.3], mat: 'glow', noShadow: true });
      }
      for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) A(torus3(0.12, 0.014, Math.PI * 0.5, 3, 8), C.gold, { bone: BN3.chest, p: [sx * 0.1, 1.66 - k * 0.06, 0.06], r: [Math.PI / 2 - 0.2, 0, sx > 0 ? -0.3 : Math.PI + 0.3], s: [1, 0.8, 1], noShadow: true });
    } else if (V.headdress) {
      // seit 14.82 Naga-Königin Sseth: Fächer aus goldenen Schuppenblättern hinter dem Kopf, Stirnschmuck
      for (let k = 0; k < 9; k++) {
        const a = (k / 8 - 0.5) * 2.2;
        A(bsBlade3('sseth-fächer', [[0, -0.03], [0.32, -0.05], [0.42, 0], [0.32, 0.05], [0, 0.03]], 0.012, 0.004), k % 2 ? C.gold : C.goldD, { bone: hb, p: [Math.sin(a) * 0.08, 2.18 + Math.cos(a) * 0.04, 0.0], r: [0, Math.PI / 2, Math.PI / 2 - a], shine: 1 });
        if (k % 2 === 0) bsGem3(A, k % 4 ? C.glow : C.gem2, [Math.sin(a) * 0.36, 2.18 + Math.cos(a) * 0.32, -0.02], [0.018, 0.025, 0.01], null, hb);
      }
    } else for (const [x, h, lean] of [[0.24, 2.32, 0.4], [0.36, 2.15, 0.65], [-0.24, 2.32, -0.4], [-0.36, 2.15, -0.65]]) {
      const base = [x * 0.75, 1.78, -0.12];
      const top = [x + lean * 0.12, h, 0.0];
      A(tube3([base, [x * 0.95, (base[1] + h) / 2, -0.2], [top[0], top[1] - 0.06, -0.08], top], 0.045, 0.03, 14, 7), C.scale, { bone: BN3.chest, top: C.scaleTop, topK: 0.6, shade: 0.2 });
      A(ball(10), C.scale, { bone: BN3.chest, p: [top[0], top[1] + 0.02, top[2] + 0.07], s: [0.038, 0.026, 0.065], r: [0.25, 0, 0], top: C.scaleTop, topK: 0.5 });
      A(cap3(1, 1.1, 0, Math.PI * 2, 12, 4), C.hood, { bone: BN3.chest, p: [top[0], top[1] - 0.03, top[2] - 0.01], r: [Math.PI / 2 - 0.2, 0, 0], s: [0.1, 0.03, 0.12], top: C.hoodEdge, topK: 0.6 });
      for (const ex of [-1, 1]) A(ball(6), C.eye, { bone: BN3.chest, p: [top[0] + ex * 0.025, top[1] + 0.035, top[2] + 0.1], s: [0.012, 0.01, 0.01], mat: 'glow' });
      bsSpike3(A, 0.035, 0.007, C.tooth, [top[0], top[1] - 0.005, top[2] + 0.125], [0, -1, 0.3], { bone: BN3.chest, seg: 3 });
    }
    // Halskragen und Schuppenrock aus Gold
    A(torus3(0.2, 0.035, Math.PI * 2, 5, 22), C.gold, { bone: BN3.chest, p: [0, 1.84, 0.04], r: [Math.PI / 2 - 0.1, 0, 0], s: [1.3, 1, 1], shine: 1 });
    for (let k = 0; k < 7; k++) bsGem3(A, k % 2 ? C.glow : C.gem2, [Math.sin((k - 3) * 0.32) * 0.25, 1.8 - Math.cos((k - 3) * 0.32) * 0.02, 0.17 + Math.cos((k - 3) * 0.32) * 0.05], [0.02, 0.028, 0.012], null, BN3.chest);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      A(roundBox(0.075, 0.16, 0.015, 0.006), k % 2 ? C.gold : C.goldD, { bone: BN3.pelvis, p: [Math.sin(a) * 0.215, 1.05, Math.cos(a) * 0.19], r: [-0.18, a, 0], shine: 1, noShadow: true });
    }
    for (const sx of [-1, 1]) {
      const [ub, fb] = bsArmN3(sx);
      A(torus3(0.09, 0.016, Math.PI * 2, 4, 14), C.gold, { bone: ub, p: bsLerp3(P[sx].S, P[sx].E, 0.45), r: [Math.PI / 2, 0, 0], shine: 1 });
      A(cyl3(0.07, 0.065, 0.1, 12), C.gold, { bone: fb, p: bsLerp3(P[sx].E, P[sx].W, 0.75), shine: 1 });
      bsHand3(A, sx, P, 0.06, C.skin, { top: C.skinTop, armB: bsArmN3, claw: C.tooth });
      // Sichelklinge (seit 14.82 V.trident: Dreizack rechts, Rundschild links)
      const G = bsLerp3(P[sx].W, P[sx].Hd, 0.55);
      const hbn = bsArmN3(sx)[2];
      if (V.trident && sx < 0) {
        A(cyl3(0.022, 0.024, 1.9, 8), C.wood, { bone: hbn, p: [G[0], G[1], G[2] + 0.3], r: [Math.PI / 2, 0, 0] });
        const T = [G[0], G[1], G[2] + 1.25];
        A(roundBox(0.24, 0.04, 0.04, 0.015), C.gold, { bone: hbn, p: T, shine: 1 });
        for (const dx of [-0.11, 0, 0.11]) bsSpike3(A, dx ? 0.26 : 0.34, 0.025, C.gold, [T[0] + dx, T[1], T[2]], [dx * 0.6, 0, 1], { bone: hbn, shine: 1 });
        bsGem3(A, C.glow, [T[0], T[1], T[2] + 0.02], [0.025, 0.025, 0.02], null, hbn);
        continue;
      }
      if (V.trident) {
        const fb2 = bsArmN3(sx)[1];
        const c = bsLerp3(P[sx].E, P[sx].W, 0.6);
        A(cyl3(0.2, 0.2, 0.03, 18), C.gold, { bone: fb2, p: [c[0] + 0.07, c[1], c[2] + 0.02], r: [0, 0, Math.PI / 2], top: C.goldD, shine: 1 });
        A(cap3(1, 1.2, 0, Math.PI * 2, 10, 4), C.goldD, { bone: fb2, p: [c[0] + 0.09, c[1], c[2] + 0.02], r: [0, 0, -Math.PI / 2], s: [0.07, 0.04, 0.07], shine: 1 });
        bsGem3(A, C.gem2, [c[0] + 0.12, c[1], c[2] + 0.02], [0.02, 0.03, 0.03], null, fb2);
        continue;
      }
      A(cyl3(0.022, 0.022, 0.24, 8), C.wood, { bone: hbn, p: [G[0], G[1], G[2] + 0.02], r: [Math.PI / 2, 0, 0] });
      const bl = [[0.0, 0.03], [0.3, 0.05], [0.52, 0.0], [0.62, -0.18], [0.56, -0.34], [0.5, -0.2], [0.42, -0.1], [0.22, -0.04], [0.0, -0.03]];
      A(bsBlade3('vritra-sichel', bl, 0.025, 0.008), C.blade, { bone: hbn, p: [G[0], G[1], G[2] + 0.12], top: C.bladeTop, shine: 1 });
      A(box3(), C.glow, { bone: hbn, p: [G[0], G[1] - 0.04, G[2] + 0.62], r: [0.9, 0, 0], s: [0.03, 0.2, 0.025], mat: 'glow', noShadow: true });
      A(box3(), C.glow, { bone: hbn, p: [G[0], G[1] + 0.035, G[2] + 0.42], r: [-0.12, 0, 0], s: [0.03, 0.02, 0.22], mat: 'glow', noShadow: true });
    }
  } else {
    // Veyla: Schilfhaar, Wurzelgeweih mit Leuchtpilzen, Moosumhang, Stab mit Schädel-Laterne
    for (let k = 0; k < 11; k++) {
      const a = (k / 10 - 0.5) * 2.4;
      A(tube3([[Math.sin(a) * 0.09, 2.18, 0.08 - Math.cos(a) * 0.06], [Math.sin(a) * 0.17, 2.05, -0.05 - Math.cos(a) * 0.06], [Math.sin(a) * 0.2, 1.75, -0.08], [Math.sin(a) * 0.22, 1.45 - (k % 3) * 0.06, -0.06]], 0.025, 0.008, 12, 4), k % 3 ? C.hair : C.mossC, { bone: hb, shade: 0.25, noShadow: k % 2 === 1 });
    }
    for (const sx of [-1, 1]) {
      const br = [[sx * 0.07, 2.2, 0.06], [sx * 0.2, 2.35, 0.0], [sx * 0.26, 2.55, -0.06], [sx * 0.36, 2.66, -0.04]];
      A(tube3(br, 0.03, 0.008, 14, 6), C.wood, { bone: hb, top: lighter(C.wood, 0.2), shine: 0.2 });
      A(tube3([br[1], [sx * 0.32, 2.4, 0.04], [sx * 0.42, 2.45, 0.06]], 0.018, 0.006, 8, 5), C.wood, { bone: hb });
      A(tube3([br[2], [sx * 0.18, 2.66, -0.05], [sx * 0.16, 2.76, -0.02]], 0.016, 0.005, 8, 5), C.wood, { bone: hb });
      for (const q of [br[3], [sx * 0.42, 2.45, 0.06], [sx * 0.16, 2.76, -0.02]]) A(ball(8), C.glow, { bone: hb, p: q, s: [0.03, 0.022, 0.03], mat: 'glow', noShadow: true });
    }
    // Moosumhang über den Schultern
    const shawl = [];
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI * 0.8 + (i / 21) * Math.PI * 1.6;
      shawl.push([[Math.sin(a) * 0.3, 1.82 + 0.02 * Math.sin(i * 1.9), 0.02 - Math.cos(a) * 0.17], [Math.sin(a) * 0.6, -0.8, -Math.cos(a) * 0.5], 0.2 + 0.08 * Math.sin(i * 2.7), 0.06, BN3.chest]);
    }
    bsTufts3(A, shawl, C.mossC, lighter(C.mossC, 0.2));
    // Rock aus Schilf an der Hüfte
    const skirt = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      skirt.push([[Math.sin(a) * 0.2, 1.12, Math.cos(a) * 0.18], [Math.sin(a) * 0.4, -1, Math.cos(a) * 0.4], 0.22, 0.04, BN3.pelvis]);
    }
    bsTufts3(A, skirt, C.hair, C.mossC);
    for (const sx of [-1, 1]) bsHand3(A, sx, P, 0.065, C.skin, { top: C.skinTop, armB: bsArmN3, claw: C.tooth });
    // Stab mit Schädel-Laterne (rechte Hand)
    const G = bsLerp3(P[-1].W, P[-1].Hd, 0.55);
    const hbn = BN3.haR;
    A(tube3([[G[0], G[1] - 0.75, G[2] + 0.02], [G[0] + 0.02, G[1], G[2]], [G[0] - 0.02, G[1] + 0.6, G[2] - 0.01], [G[0] + 0.03, G[1] + 0.95, G[2]]], 0.03, 0.022, 16, 6), C.wood, { bone: hbn, top: lighter(C.wood, 0.2) });
    for (const sx of [-1, 1]) A(tube3([[G[0], G[1] + 0.9, G[2]], [G[0] + sx * 0.12, G[1] + 1.02, G[2]], [G[0] + sx * 0.1, G[1] + 1.16, G[2]]], 0.02, 0.006, 8, 5), C.wood, { bone: hbn });
    const L = [G[0], G[1] + 1.02, G[2] + 0.02];
    A(ball(10), C.bone, { bone: hbn, p: L, s: [0.07, 0.065, 0.075], shine: 0.3 });
    for (const ex of [-1, 1]) A(ball(6), C.glow, { bone: hbn, p: [L[0] + ex * 0.025, L[1] + 0.005, L[2] + 0.06], s: [0.016, 0.018, 0.01], mat: 'glow' });
    A(ball(8), C.glow, { bone: hbn, p: [L[0], L[1] - 0.09, L[2]], s: [0.035, 0.05, 0.035], mat: 'glow', noShadow: true });
    bsChainLinks3(A, [L[0], L[1] - 0.04, L[2]], [L[0], L[1] - 0.1, L[2]], 2, 0.012, C.wood, hbn);
  }
  return bsRes3(id, rig, J, 2.5, V.worldH);
}
const BS_VRITRA3 = {
  skin: '#2e7a68', skinTop: '#4aa08a', scale: '#1a5a4a', scaleTop: '#2e8a70', scaleD: '#0e2e26', mark: '#8a7230', crest: '#0e3a30', hood: '#1e6a58', hoodEdge: '#7ad8c8',
  hair: '#0e1a18', gold: '#d8a83a', goldD: '#a8782a', gem2: '#ff6a8a', glow: '#7ad8c8', eye: '#e8ff7a', tooth: '#f0ece0', wood: '#3a2a1c', blade: '#6a7a7a', bladeTop: '#b8c8c8', worldH: 7.0
};
const BS_VEYLA3 = Object.assign({}, BS_VRITRA3, {
  moss: true, skin: '#3a5a46', skinTop: '#5a7a5e', scale: '#1e3a30', scaleTop: '#2e5a46', scaleD: '#0e1e18', mark: '#4a5a2a', crest: '#14241c', mossC: '#3a5a24',
  hair: '#2a3a1e', wood: '#3a2e20', bone: '#d8d0b8', glow: '#7ae0a8', eye: '#c8ff6a', worldH: 6.8
});
MON3_BUILD.vritra = (b) => bsNaga3(b, 'vritra', BS_VRITRA3);
MON3_BUILD.moormutter = (b) => bsNaga3(b, 'moormutter', BS_VEYLA3);
const BS_NAGA_BOSS3 = { kind: 'naga', melee: ['strike', 'slash', 'whip'], emit: 'mouth', blob: 1.5, dome: 1.4, pts: BS_NAGA_PTS3, deathPts: ['core', 'mouth', 'tail'], skyAt: 'sky' };
BOSS3.vritra = Object.assign({}, BS_NAGA_BOSS3, {
  fx: 'gift', emi: [0.02, 0.07, 0.06],
  // Gifttropfen an den Klingen, ab und zu Dampf aus dem Maul
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.8 + i / 3) % 1;
      bsPtA3(a, BOSS3.vritra, 'weapon', _b3P);
      bsSprite3(h, _b3P.x, _b3P.y - v * 1.2, _b3P.z, 0.16, 'disc', th.mid, 0.8 * (1 - v));
    }
  }
});
BOSS3.moormutter = Object.assign({}, BS_NAGA_BOSS3, {
  fx: 'moor', emi: [0.03, 0.07, 0.04], pts: Object.assign({}, BS_NAGA_PTS3, { emit: [BN3.haR, [-0.5, 2.02, 0.45]], sky: [BN3.haR, [-0.5, 2.02, 0.45]], weapon: [BN3.haR, [-0.5, 2.02, 0.45]] }),
  // Sumpfnebel um den Leib, Glühwürmchen um die Laterne
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.moormutter, 'weapon', _b3P);
    for (let i = 0; i < 4; i++) {
      const ang = t * (0.8 + i * 0.2) + i * 1.6;
      bsSprite3(h, _b3P.x + Math.cos(ang) * 0.6, _b3P.y + Math.sin(t * 1.3 + i) * 0.3, _b3P.z + Math.sin(ang) * 0.6, 0.14, 'spark', th.mid, 0.8);
    }
    bsPtA3(a, BOSS3.moormutter, 'tail', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.3 + i / 3) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.1) * 1.5, 0.3 + v * 0.8, _b3P.z + Math.cos(i * 1.4) * 1.5, 1.4 + v * 1.4, '#3a5a3a', 0.25 * Math.sin(Math.PI * v));
    }
  }
});

// ============================================================================================================
// Höllenfürst Azaroth (Karte 6) und Blutfürstin Sereth (Karte 14): Dämonenfürst
// Großer, sehniger Dämon mit Glutrissen in der Haut, Hufen, langem Schwanz mit Spatenspitze und echten Fledermaus-
// flügeln (Arm, vier Finger, doppelseitige Flughaut, legen sich an und breiten sich aus). Azaroth: geschwungene
// Widderhörner und Flammenkrone, Obsidianpanzer mit Stacheln, Flammenschwert mit glühender Kernlinie. Sereth: schlanker,
// zurückgeschwungene Hörner, langes Haar, Dornenkrone, Blutsense; rote Flughaut, Blutnebel.
// ============================================================================================================
function bsDemonJ3(f) {
  return {
    hipY: 1.08, hipX: 0.17 * f, kneeY: 0.6, ankleY: 0.13, footL: 0.22, waistY: 1.32, chestY: 1.58, shY: 1.9, shX: 0.46 * f, neckY: 1.98,
    headY: 2.06, headZ: 0.09, hunch: 0.08, upper: 0.46, fore: 0.43, hand: 0.16, armOut: 0.08, jaw: [-0.03, 0.04],
    tail: [[0, 1.0, -0.2], [0, 0.72, -0.62], [0, 0.42, -1.02]], wing: [0.16, 1.8, -0.2], cape: [[0, 1.9, -0.25], [0, 1.1, -0.3]]
  };
}
const BS_DEMON_J3 = bsDemonJ3(1), BS_DEMONF_J3 = bsDemonJ3(0.8);
function bsDemonPts3(J) {
  const P = bsBipJ3(J);
  const G = bsLerp3(P[-1].W, P[-1].Hd, 0.5);
  return { mouth: [BB3.jaw, [0, 2.12, 0.3]], core: [BB3.chest, [0, 1.62, 0.32]], emit: [BB3.jaw, [0, 2.12, 0.3]], weapon: [BB3.haR, [G[0], G[1], G[2] + 1.0]], sky: [BB3.haR, [G[0], G[1], G[2] + 1.0]], back: [BB3.chest, [0, 1.8, -0.3]], tail: [BB3.t3, [0, 0.3, -1.3]] };
}
// Flügel: Ansatz w1, Ellbogen w2, vier Fingerspitzen; Haut außen (am Unterarm) und innen (zwischen Rumpf, Arm, Finger 4)
function bsWing3(b, A, id, sx, J, C, o = {}) {
  const [b1, b2] = bsWingB3(sx);
  const W1 = [sx * J.wing[0], J.wing[1], J.wing[2]];
  const W2 = [sx * (J.wing[0] + 0.85), J.wing[1] + 0.5, J.wing[2] - 0.15];
  const k = o.k || 1;
  const F = [[0.8, 0.6, -0.1], [1.15, 0.0, -0.2], [0.85, -0.68, -0.25], [0.3, -1.05, -0.2]].map((d) => [W2[0] + sx * d[0] * k, W2[1] + d[1] * k, W2[2] + d[2] * k]);
  const Bt = [sx * 0.18, 1.18, J.wing[2] - 0.02];
  A(tubeProfile3([W1, bsLerp3(W1, W2, 0.5), W2], [0.07, 0.06, 0.05], 10, 8), C.wingBone, { bone: b1, top: C.wingTop, topK: 0.5 });
  A(ball(10), C.wingBone, { bone: b2, p: W2, s: 0.065 });
  bsSpike3(A, 0.22, 0.04, C.claw, W2, [sx * 0.2, 1, 0.3], { bone: b2, shine: 0.6 });
  F.forEach((T, i) => {
    A(tubeProfile3([W2, bsLerp3(W2, T, 0.5), T], [0.045, 0.032, 0.012], 10, 6), C.wingBone, { bone: b2, top: C.wingTop, topK: 0.5, noShadow: true });
    if (i < 2) bsSpike3(A, 0.12, 0.02, C.claw, T, [T[0] - W2[0], T[1] - W2[1], T[2] - W2[2]], { bone: b2, shine: 0.6 });
  });
  const mem = (u, v, s) => (s > 0 ? mixColor(C.mem, C.memEdge, v * v) : mixColor(C.memB, C.memEdge, v * v * 0.7));
  for (let i = 0; i < 3; i++) {
    bsSheetAdd3(b, A, bsSheet3(id + 'fl' + sx + i, 6, 6, (u, v) => {
      const e = bsLerp3(F[i], F[i + 1], u);
      const rho = v * (1 - 0.2 * Math.sin(Math.PI * u));
      return bsLerp3(W2, e, rho);
    }, () => [[b2, 1]], mem, 0.008), i === 1);
  }
  bsSheetAdd3(b, A, bsSheet3(id + 'fi' + sx, 8, 6, (u, v) => {
    const top = bsLerp3(W1, W2, u);
    const bot = bsLerp3(Bt, F[3], u);
    const sc = 0.18 * Math.sin(Math.PI * u) * v;
    const p = bsLerp3(top, bot, v * (1 - sc));
    return p;
  }, (u, v) => [[BB3.chest, (1 - u) * v * 0.9], [b1, (1 - u) * (1 - v * 0.9) + u * (1 - u) * 2], [b2, u * u]], mem, 0.008), true);
  // leuchtende Adern in der Haut
  if (C.vein) for (let i = 0; i < 3; i++) {
    const e = bsLerp3(F[i], F[i + 1], 0.5);
    A(tube3([W2, bsLerp3(W2, e, 0.5), bsLerp3(W2, e, 0.85)], 0.012, 0.004, 8, 4), C.vein, { bone: b2, mat: 'glow', noShadow: true });
  }
}
function bsDemon3(b, id, V) {
  const A = adder(b, null);
  const fem = !!V.fem;
  const J = fem ? BS_DEMONF_J3 : BS_DEMON_J3, C = V;
  const { rig, P } = bsBipRig3(J);
  const f = fem ? 0.8 : 1;
  const rows = fem
    ? [[0.95, 0, 0.2, 0.16, 0.17], [1.08, 0, 0.23, 0.17, 0.18], [1.25, 0.02, 0.18, 0.13, 0.13], [1.42, 0.04, 0.19, 0.14, 0.13], [1.58, 0.06, 0.25, 0.17, 0.15], [1.74, 0.07, 0.31, 0.16, 0.16], [1.88, 0.07, 0.28, 0.12, 0.14], [1.98, 0.09, 0.09, 0.07, 0.07], [2.05, 0.09, 0.065, 0.055, 0.055]]
    : [[0.95, 0, 0.22, 0.17, 0.18], [1.08, 0, 0.26, 0.19, 0.19], [1.25, 0.02, 0.24, 0.18, 0.15], [1.42, 0.05, 0.3, 0.21, 0.17], [1.6, 0.07, 0.4, 0.24, 0.2], [1.76, 0.08, 0.46, 0.21, 0.21], [1.9, 0.08, 0.38, 0.16, 0.19], [1.99, 0.1, 0.13, 0.09, 0.1], [2.06, 0.1, 0.085, 0.07, 0.07]];
  bsBipBody3(id, A, J, P, { C, rows, arm: fem ? [0.11, 0.1, 0.075, 0.08, 0.055] : [0.15, 0.14, 0.1, 0.11, 0.08], leg: fem ? [0.15, 0.12, 0.085, 0.08, 0.06] : [0.19, 0.16, 0.11, 0.1, 0.075], shade: 0.3 });
  if (!fem) {
    for (const sx of [-1, 1]) A(ball(14), C.skin, { bone: BB3.chest, p: [sx * 0.16, 1.68, 0.24], s: [0.17, 0.12, 0.1], top: C.skinTop, topK: 0.5, shade: 0.3 });
    for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) A(roundBox(0.09, 0.07, 0.05, 0.022), C.skin, { bone: BB3.spine, p: [sx * 0.055, 1.48 - k * 0.08, 0.22 - k * 0.005], shade: 0.3 });
  } else for (const sx of [-1, 1]) A(cap3(1, 1.2, 0, Math.PI * 2, 12, 5), C.armor, { bone: BB3.chest, p: [sx * 0.1, 1.68, 0.17], r: [Math.PI / 2 - 0.2, 0, 0], s: [0.1, 0.08, 0.085], top: C.armorTop, shine: 0.9 });
  // Glutrisse in der Haut (Brust, Bauch, Arme, Schenkel)
  const cracks = [[0.18, 1.72, 0.3, 0.6, 0.14, BB3.chest], [-0.2, 1.66, 0.29, -0.7, 0.12, BB3.chest], [0.05, 1.5, 0.24, 1.1, 0.1, BB3.spine], [-0.08, 1.38, 0.22, -0.3, 0.12, BB3.spine], [0.0, 1.8, 0.26, 0.1, 0.1, BB3.chest]];
  for (const [x, y, z, r, l, bn] of cracks) A(box3(), C.lava, { bone: bn, p: [x * f, y, z * (fem ? 0.75 : 1)], r: [0, 0, r], s: [0.016, l, 0.016], mat: 'glow', noShadow: true });
  for (const sx of [-1, 1]) {
    const [ub, fb] = bsArmB3(sx);
    A(box3(), C.lava, { bone: ub, p: bsAdd3(bsLerp3(P[sx].S, P[sx].E, 0.5), [sx * 0.02, 0, 0.12 * f]), r: [0, 0, sx * 0.3], s: [0.014, 0.16, 0.014], mat: 'glow', noShadow: true });
    A(box3(), C.lava, { bone: fb, p: bsAdd3(bsLerp3(P[sx].E, P[sx].W, 0.4), [sx * 0.02, 0, 0.09 * f]), r: [0, 0, -sx * 0.4], s: [0.012, 0.12, 0.012], mat: 'glow', noShadow: true });
  }

  // --- Kopf ---
  const hb = BB3.head, jb = BB3.jaw;
  // seit 14.81 (bosse3d-modelle2.js): V.skull – Schädel statt Gesicht (Totenfürst Azrakel), V.weapon – Waffe unabhängig
  // von der Gestalt ('sword', 'scythe'), V.flameHair – Haar aus Flammen (Ifrah), V.longHorns – lange Hörner nach hinten
  const headCol = V.skull ? C.bone : C.skin, headTop = V.skull ? C.boneTop || C.bone : C.skinTop;
  A(ball(16), headCol, { bone: hb, p: [0, 2.17, 0.15], s: fem ? [0.1, 0.12, 0.11] : [0.12, 0.13, 0.13], top: headTop, topK: 0.5, shade: 0.25 });
  A(roundBox(fem ? 0.11 : 0.15, 0.07, 0.12, 0.03), headCol, { bone: jb, p: [0, 2.08, 0.22], r: [0.15, 0, 0], shade: 0.25 });
  A(roundBox(fem ? 0.16 : 0.22, 0.04, 0.06, 0.018), darker(headCol, 0.2), { bone: hb, p: [0, 2.21, 0.25], r: [0.4, 0, 0] });
  if (V.skull) {
    // Schädel: Zahnreihen, Nasenloch, tiefe Augenhöhlen (die Glut darin kommt unten)
    for (let k = 0; k < 6; k++) {
      A(roundBox(0.02, 0.032, 0.015, 0.005), C.boneTop || C.bone, { bone: hb, p: [(k - 2.5) * 0.024, 2.115, 0.275 - Math.abs(k - 2.5) * 0.008], noShadow: true });
      A(roundBox(0.02, 0.03, 0.015, 0.005), C.boneTop || C.bone, { bone: jb, p: [(k - 2.5) * 0.023, 2.085, 0.27 - Math.abs(k - 2.5) * 0.008], noShadow: true });
    }
    A(ball(6), '#08060c', { bone: hb, p: [0, 2.15, 0.27], s: [0.02, 0.026, 0.012], noShadow: true });
  }
  A(ball(8), C.lava, { bone: jb, p: [0, 2.1, 0.27], s: [0.05, 0.015, 0.02], mat: 'glow', noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(8), '#0a0406', { bone: hb, p: [sx * 0.05, 2.18, 0.26], s: [0.035, 0.018, 0.02], r: [0, 0, sx * 0.3], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.05, 2.18, 0.27], s: [0.028, 0.012, 0.012], r: [0, 0, sx * 0.3], mat: 'glow' });
    bsSpike3(A, 0.16, 0.035, C.skin, [sx * 0.11, 2.16, 0.12], [sx, 0.5, -0.5], { bone: hb, top: C.skinTop });
    bsSpike3(A, 0.05, 0.012, C.tooth, [sx * 0.03, 2.105, 0.29], [0, -1, 0.1], { bone: hb, seg: 4 });
    if (V.gargoyle) {
      // seit 14.82 Gargoyle (Grom, Barak): kurze gebogene Hörner, Schnauze mit Fängen (unten)
      A(tube3([[sx * 0.07, 2.26, 0.12], [sx * 0.16, 2.36, 0.04], [sx * 0.2, 2.34, -0.1], [sx * 0.16, 2.24, -0.14]], 0.045, 0.01, 14, 8), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.4 });
      bsSpike3(A, 0.09, 0.02, C.tooth, [sx * 0.045, 2.1, 0.33], [0, -1, 0.15], { bone: hb, seg: 4 });
      bsSpike3(A, 0.07, 0.018, C.tooth, [sx * 0.04, 2.06, 0.31], [0, 1, 0.1], { bone: jb, seg: 4 });
    } else if (V.longHorns) {
      // lange Hörner flach nach hinten, gerippt
      const hp = [[sx * 0.07, 2.27, 0.16], [sx * 0.15, 2.36, 0.04], [sx * 0.22, 2.42, -0.2], [sx * 0.26, 2.44, -0.45], [sx * 0.3, 2.5, -0.68]];
      A(tube3(hp, 0.06, 0.006, 26, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.7 });
      for (let k = 1; k < 4; k++) A(torus3(0.05 - k * 0.01, 0.009, Math.PI * 2, 3, 10), C.hornTip, { bone: hb, p: hp[k], r: [Math.PI / 2 - 0.4, sx * 0.3, 0], noShadow: true });
    } else if (!fem) {
      // Widderhörner und gerade Stirnhörner
      A(tube3([[sx * 0.07, 2.27, 0.14], [sx * 0.2, 2.38, 0.06], [sx * 0.32, 2.36, -0.08], [sx * 0.37, 2.22, -0.12], [sx * 0.33, 2.1, -0.03], [sx * 0.31, 2.12, 0.1], [sx * 0.36, 2.2, 0.16]], 0.065, 0.01, 30, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      A(tube3([[sx * 0.05, 2.28, 0.18], [sx * 0.08, 2.42, 0.18], [sx * 0.07, 2.58, 0.12]], 0.035, 0.006, 10, 7), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      for (let k = 0; k < 2; k++) bsSpike3(A, 0.1 - k * 0.03, 0.022, C.horn, [sx * (0.04 + k * 0.03), 2.03, 0.27 - k * 0.04], [sx * 0.2, -1, 0.2], { bone: jb, shine: 0.6 });
    } else {
      // zurückgeschwungene Hörner, Haar
      A(tube3([[sx * 0.06, 2.27, 0.16], [sx * 0.11, 2.36, 0.06], [sx * 0.15, 2.4, -0.12], [sx * 0.16, 2.36, -0.3]], 0.04, 0.006, 16, 8), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.7 });
      for (let k = 0; k < 4; k++) {
        const xx = sx * (0.04 + k * 0.03);
        A(tube3([[xx, 2.28, 0.08 - k * 0.02], [xx * 1.6, 2.12, -0.08], [xx * 1.8, 1.82, -0.14], [xx * 1.7, 1.5 - k * 0.04, -0.18]], 0.03, 0.01, 14, 5), V.flameHair && k % 2 ? C.lava : C.hair, { bone: hb, shade: 0.2, noShadow: k % 2 === 1, mat: V.flameHair && k % 2 ? 'glow' : 'lit' });
      }
    }
  }
  if (V.gargoyle) {
    // Schnauze nach vorn, Stirnkamm aus Stein
    A(loft3([[0.2, 2.14, 0.08, 0.06, 0.05], [0.3, 2.12, 0.065, 0.05, 0.04], [0.36, 2.11, 0.04, 0.035, 0.03]], 10, 3), C.skin, { bone: hb, top: C.skinTop, shade: 0.2 });
    for (let k = 0; k < 4; k++) bsSpike3(A, 0.08 + k * 0.01, 0.025, C.armor, [0, 2.29 - k * 0.03, 0.14 - k * 0.08], [0, 1, -0.6], { bone: hb, shine: 0.5 });
  } else if (V.helm === 'ash') {
    // Aschehelm (Kael): geschlossen, Glutschlitze, Kamm aus Glut
    A(cap3(1, 1.4, 0, Math.PI * 2, 16, 7), C.armor, { bone: hb, p: [0, 2.2, 0.15], s: [0.14, 0.16, 0.15], top: C.armorTop, shine: 0.9 });
    A(roundBox(0.2, 0.17, 0.08, 0.04), C.armor, { bone: hb, p: [0, 2.13, 0.24], top: C.armorTop, shine: 0.9 });
    A(box3(), C.lava, { bone: hb, p: [0, 2.17, 0.285], s: [0.15, 0.02, 0.02], mat: 'glow', noShadow: true });
    A(box3(), C.lava, { bone: hb, p: [0, 2.11, 0.285], s: [0.02, 0.08, 0.02], mat: 'glow', noShadow: true });
    for (let k = 0; k < 6; k++) pointAt3(A, horn3(0.16 - Math.abs(k - 2.5) * 0.02, 0.03, 5), C.lava, [0, 2.36 - Math.abs(k - 2.5) * 0.02, 0.24 - k * 0.07], [0, 1, -0.5], { bone: hb, mat: 'glow', noShadow: true });
  } else if (fem) {
    for (let k = 0; k < 7; k++) bsSpike3(A, 0.07 + (k === 3 ? 0.06 : 0), 0.014, C.armor, [(k - 3) * 0.035, 2.28, 0.17 - Math.abs(k - 3) * 0.02], [(k - 3) * 0.12, 1, 0.1], { bone: hb, shine: 0.9 });
    bsGem3(A, C.lava, [0, 2.28, 0.2], [0.02, 0.03, 0.012], null, hb);
  } else {
    // Flammenkrone: Zacken aus Obsidian, dazwischen leuchtende Flammen
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const p = [Math.sin(a) * 0.1, 2.29, 0.14 + Math.cos(a) * 0.1];
      bsSpike3(A, 0.09, 0.02, C.armor, p, [Math.sin(a) * 0.2, 1, Math.cos(a) * 0.2], { bone: hb, shine: 0.9 });
      pointAt3(A, horn3(0.12, 0.03, 5), C.lava, [p[0] * 0.8, 2.29, 0.14 + (p[2] - 0.14) * 0.8], [Math.sin(a) * 0.15, 1, Math.cos(a) * 0.15], { bone: hb, mat: 'glow', noShadow: true });
    }
  }
  // --- Panzer: Schultern, Armschienen, Gürtel, Lendenschurz, Beinschienen, Hufe ---
  for (const sx of [-1, 1]) {
    const [ub, fb] = bsArmB3(sx);
    const S = P[sx].S;
    const D = [S[0] + sx * 0.04, S[1] + 0.05, S[2]];
    A(cap3(1, 1.25, 0, Math.PI * 2, 16, 7), C.armor, { bone: ub, p: D, r: [0, 0, sx * 0.55], s: fem ? [0.17, 0.12, 0.18] : [0.24, 0.17, 0.25], top: C.armorTop, topK: 0.6, shine: 0.9 });
    A(torus3(1, 0.05, Math.PI * 2, 4, 18), C.lava, { bone: ub, p: bsAdd3(D, [sx * 0.03, -0.03, 0]), r: [Math.PI / 2, 0, sx * 0.55], s: fem ? [0.16, 0.17, 0.16] : [0.23, 0.24, 0.23], mat: 'glow', noShadow: true });
    for (let k = 0; k < (fem ? 2 : 3); k++) bsSpike3(A, (fem ? 0.14 : 0.22) - k * 0.04, 0.035 * f, C.armor, [S[0] + sx * 0.08 * f, S[1] + 0.12 * f, S[2] - 0.1 + k * 0.1], [sx * 0.6, 1, -0.2], { bone: ub, shine: 0.9 });
    const m = bsLerp3(P[sx].E, P[sx].W, 0.6);
    A(cyl3(0.115 * f, 0.1 * f, 0.26, 12), C.armor, { bone: fb, p: m, top: C.armorTop, shine: 0.9 });
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.1 * f, 0.022, C.armor, [m[0] + sx * 0.1 * f, m[1] - 0.08 + k * 0.08, m[2] - 0.03], [sx, 0.2, -0.4], { bone: fb, shine: 0.9 });
    bsHand3(A, sx, P, fem ? 0.075 : 0.1, C.skin, { top: C.skinTop, claw: C.claw });
    const [tb, sb, fb2] = bsLegB3(sx);
    A(roundBox(0.14 * f, 0.32, 0.08, 0.03), C.armor, { bone: sb, p: [sx * J.hipX, 0.38, 0.09], r: [-0.06, 0, 0], top: C.armorTop, shine: 0.9 });
    bsSpike3(A, 0.14, 0.03, C.armor, [sx * J.hipX, J.kneeY + 0.02, 0.12], [0, 0.6, 1], { bone: sb, shine: 0.9 });
    const Ak = P[sx].A;
    for (const hx of [-1, 1]) A(ball(10), C.hoof, { bone: fb2, p: [Ak[0] + hx * 0.045, 0.07, 0.07], s: [0.05, 0.07, 0.11], shine: 0.6 });
    A(ball(10), C.fur, { bone: sb, p: [Ak[0], 0.2, 0.0], s: [0.11 * f, 0.08, 0.11 * f], top: lighter(C.fur, 0.2), shade: 0.2 });
  }
  A(torus3(0.25 * f, 0.04, Math.PI * 2, 5, 22), C.armor, { bone: BB3.pelvis, p: [0, 1.1, 0.01], r: [Math.PI / 2, 0, 0], s: [1.05, 0.82, 1.1], shine: 0.9 });
  A(ball(10), C.bone, { bone: BB3.pelvis, p: [0, 1.1, 0.22 * f], s: [0.06, 0.055, 0.04], shine: 0.3 });
  for (const sz of [1, -1]) bsSheetAdd3(b, A, bsSheet3(id + 'schurz' + sz, 4, 6, (u, v) => [(u - 0.5) * 0.3 * f * (1 - 0.2 * v), 1.07 - v * 0.56, sz * (0.2 * f + 0.05 * v)], () => [[BB3.pelvis, 1]], (u, v, s) => (v > 0.85 && Math.sin(u * 17) > 0 ? C.lava : s > 0 ? C.cloth : darker(C.cloth, 0.25))), false);
  // --- Schwanz mit Spatenspitze ---
  const tw = bsChain3([[BB3.pelvis, [0, 1.05, -0.05]], [BB3.t1, J.tail[0]], [BB3.t2, J.tail[1]], [BB3.t3, J.tail[2]], [BB3.t3, [0, 0.28, -1.35]]]);
  const tpts = [[0, 1.05, -0.12], [0, 0.98, -0.25], [0, 0.72, -0.64], [0, 0.42, -1.02], [0, 0.28, -1.33]];
  A(bsSkin3(id + ':schwanz' + GEO3_LOD, tubeProfile3(tpts, [0.08, 0.07, 0.05, 0.035, 0.02], 18, 8), tw), C.skin, { top: C.skinTop, shade: 0.25, shadowExact: true });
  A(bsBlade3('spaten', [[0, 0.0], [0.14, 0.1], [0.3, 0.0], [0.14, -0.1]], 0.025, 0.008), C.armor, { bone: BB3.t3, p: [0, 0.28, -1.33], r: [0.35, Math.PI, 0], shine: 0.9 });
  for (let k = 0; k < 5; k++) {
    const p = bsLerp3(tpts[1], tpts[4], k / 5);
    bsSpike3(A, 0.08 - k * 0.01, 0.02, C.armor, [p[0], p[1] + 0.05, p[2]], [0, 1, -0.6], { bone: aelBoneAt3(tw, p), shine: 0.9 });
  }
  // --- Flügel ---
  for (const sx of [1, -1]) bsWing3(b, A, id, sx, J, C, { k: fem ? 0.95 : 1.1 });
  // --- Waffe ---
  const G = bsLerp3(P[-1].W, P[-1].Hd, 0.5);
  const hbR = BB3.haR;
  // seit 14.82: V.weapon 'hammer' (Schmiedehammer, Barak), 'halberd' (Hellebarde mit Schild links, Kael), 'twin'
  // (zwei Sichelklingen, Ilyra)
  if (V.weapon === 'none') return bsRes3(id, rig, J, 2.65, V.worldH);
  if (V.weapon === 'hammer') {
    A(cyl3(0.04, 0.045, 1.2, 10), C.grip, { bone: hbR, p: [G[0], G[1], G[2] + 0.25], r: [Math.PI / 2, 0, 0] });
    const T = [G[0], G[1], G[2] + 0.85];
    A(roundBox(0.24, 0.42, 0.24, 0.05), C.armor, { bone: hbR, p: T, top: C.armorTop, shine: 0.9 });
    for (const dy of [-1, 1]) A(roundBox(0.28, 0.05, 0.28, 0.02), C.lava, { bone: hbR, p: [T[0], T[1] + dy * 0.18, T[2]], mat: 'glow', noShadow: true });
    bsSpike3(A, 0.16, 0.05, C.armor, [T[0], T[1] - 0.2, T[2]], [0, -1, 0], { bone: hbR, shine: 0.9 });
    return bsRes3(id, rig, J, 2.65, V.worldH);
  }
  if (V.weapon === 'halberd') {
    A(cyl3(0.03, 0.032, 2.3, 8), C.grip, { bone: hbR, p: [G[0], G[1], G[2] + 0.35], r: [Math.PI / 2, 0, 0] });
    const T = [G[0], G[1], G[2] + 1.35];
    A(bsBlade3(id + '-hellebarde', [[0, -0.02], [0.05, 0.26], [0.32, 0.3], [0.38, 0.05], [0.3, -0.06], [0.0, -0.06]], 0.03, 0.01), C.blade, { bone: hbR, p: T, r: [Math.PI / 2, 0, 0], top: C.bladeTop, shine: 1 });
    bsSpike3(A, 0.4, 0.035, C.blade, [T[0], T[1], T[2] + 0.1], [0, 0, 1], { bone: hbR, shine: 1 });
    A(box3(), C.lava, { bone: hbR, p: [T[0], T[1] + 0.2, T[2] + 0.16], s: [0.035, 0.02, 0.26], mat: 'glow', noShadow: true });
    const GL = bsLerp3(P[1].E, P[1].W, 0.6);
    A(cyl3(0.3, 0.3, 0.05, 18), C.armor, { bone: BB3.foL, p: [GL[0] + 0.1, GL[1], GL[2] + 0.04], r: [0, 0, Math.PI / 2], top: C.armorTop, shine: 0.9 });
    A(torus3(0.3, 0.03, Math.PI * 2, 4, 18), C.lava, { bone: BB3.foL, p: [GL[0] + 0.13, GL[1], GL[2] + 0.04], r: [0, Math.PI / 2, 0], mat: 'glow', noShadow: true });
    A(cap3(1, 1.2, 0, Math.PI * 2, 10, 4), C.armorTop, { bone: BB3.foL, p: [GL[0] + 0.14, GL[1], GL[2] + 0.04], r: [0, 0, -Math.PI / 2], s: [0.08, 0.05, 0.08], shine: 1 });
    return bsRes3(id, rig, J, 2.65, V.worldH);
  }
  if (V.weapon === 'twin') {
    for (const sx of [-1, 1]) {
      const g = bsLerp3(P[sx].W, P[sx].Hd, 0.5);
      const hbx = bsArmB3(sx)[2];
      A(cyl3(0.025, 0.025, 0.2, 8), C.grip, { bone: hbx, p: [g[0], g[1], g[2] - 0.02], r: [Math.PI / 2, 0, 0] });
      A(bsBlade3('ilyra-sichel', [[0.0, 0.03], [0.3, 0.06], [0.55, 0.02], [0.7, -0.12], [0.6, -0.04], [0.32, 0.0], [0.0, -0.03]], 0.02, 0.006), C.blade, { bone: hbx, p: [g[0], g[1], g[2] + 0.06], top: C.bladeTop, shine: 1 });
      A(box3(), C.lava, { bone: hbx, p: [g[0], g[1] + 0.03, g[2] + 0.4], s: [0.025, 0.018, 0.4], mat: 'glow', noShadow: true });
    }
    return bsRes3(id, rig, J, 2.65, V.worldH);
  }
  if (V.weapon ? V.weapon === 'sword' : !fem) {
    // Flammenschwert: gewellte Klinge, glühende Kernlinie, Stachel-Parierstange, Schädelknauf
    A(cyl3(0.035, 0.035, 0.34, 8), C.grip, { bone: hbR, p: [G[0], G[1], G[2] - 0.02], r: [Math.PI / 2, 0, 0] });
    A(ball(10), C.bone, { bone: hbR, p: [G[0], G[1], G[2] - 0.22], s: [0.06, 0.055, 0.06], shine: 0.3 });
    A(roundBox(0.06, 0.06, 0.5, 0.02), C.armor, { bone: hbR, p: [G[0], G[1], G[2] + 0.16], r: [Math.PI / 2, 0, 0], shine: 0.9 });
    for (const sy of [-1, 1]) bsSpike3(A, 0.16, 0.03, C.armor, [G[0], G[1] + sy * 0.22, G[2] + 0.16], [0, sy, 0.6], { bone: hbR, shine: 0.9 });
    const bl = [];
    for (let i = 0; i <= 8; i++) bl.push([0.2 + i * 0.17, 0.085 + 0.025 * Math.sin(i * 2.2) - i * 0.004]);
    bl.push([1.75, 0]);
    for (let i = 8; i >= 0; i--) bl.push([0.2 + i * 0.17, -0.085 - 0.025 * Math.sin(i * 2.2 + 1) + i * 0.004]);
    A(bsBlade3(id === 'azaroth' ? 'azaroth-schwert' : id + '-schwert', bl, 0.035, 0.01), C.blade, { bone: hbR, p: [G[0], G[1], G[2]], top: C.bladeTop, topK: 0.5, shine: 1 });
    A(box3(), C.lava, { bone: hbR, p: [G[0], G[1], G[2] + 1.0], s: [0.05, 0.03, 1.4], mat: 'glow', noShadow: true });
  } else {
    // Blutsense: langer Schaft, geschwungenes Blatt, Dornen
    A(tube3([[G[0], G[1], G[2] - 0.9], [G[0], G[1] + 0.02, G[2]], [G[0], G[1] + 0.06, G[2] + 0.9]], 0.028, 0.028, 16, 6), C.grip, { bone: hbR });
    const bl = [[0, 0.04], [0.25, 0.12], [0.55, 0.12], [0.85, 0.02], [1.0, -0.12], [0.82, -0.04], [0.55, 0.02], [0.25, -0.0], [0, -0.04]];
    A(bsBlade3('sereth-sense', bl, 0.025, 0.008), C.blade, { bone: hbR, p: [G[0], G[1] + 0.06, G[2] + 0.88], r: [Math.PI * 0.42, 0, 0], top: C.bladeTop, shine: 1 });
    A(box3(), C.lava, { bone: hbR, p: [G[0], G[1] - 0.42, G[2] + 0.95], r: [0.15, 0, 0], s: [0.03, 0.75, 0.025], mat: 'glow', noShadow: true });
    for (let k = 0; k < 4; k++) bsSpike3(A, 0.08, 0.016, C.armor, [G[0], G[1] + 0.03, G[2] - 0.6 + k * 0.4], [0, 1, 0.2], { bone: hbR, shine: 0.9 });
  }
  return bsRes3(id, rig, J, 2.65, V.worldH);
}
const BS_AZAROTH3 = {
  skin: '#7a1a22', skinTop: '#a8343a', lava: '#ff6a2a', eye: '#ffe14a', tooth: '#f0e8d8', claw: '#1e1416', horn: '#2e2422', hornTip: '#8a6a58',
  armor: '#1e1619', armorTop: '#4a3a40', fur: '#2a1614', hoof: '#120c0c', bone: '#d8ccb0', cloth: '#3e0c12', grip: '#2a1a14', blade: '#2a2026', bladeTop: '#6a5a60',
  wingBone: '#4a1018', wingTop: '#7a2028', mem: '#3e0c14', memB: '#5a1a1e', memEdge: '#7a2a20', vein: '#ff6a2a', worldH: 8.0
};
const BS_SERETH3 = Object.assign({}, BS_AZAROTH3, {
  fem: true, skin: '#6a1222', skinTop: '#9a2a3a', lava: '#ff3a4a', eye: '#ffd0d8', horn: '#1a1014', hornTip: '#5a3a44', hair: '#1a0610', armor: '#24101a', armorTop: '#5a2a3a',
  cloth: '#4a0814', blade: '#3a0a14', bladeTop: '#8a2a3a', mem: '#4a0610', memB: '#6a0a18', memEdge: '#a01a2a', vein: '#ff3a4a', wingBone: '#3a0a14', wingTop: '#6a1a24', worldH: 7.4
});
MON3_BUILD.azaroth = (b) => bsDemon3(b, 'azaroth', BS_AZAROTH3);
MON3_BUILD.sereth = (b) => bsDemon3(b, 'sereth', BS_SERETH3);
const BS_DEMON_BOSS3 = { kind: 'biped', wings: true, tail: true, emit: 'mouth', blob: 1.3, dome: 1.6, deathPts: ['core', 'mouth', 'back', 'tail'], skyAt: 'sky', headTilt: 0 };
BOSS3.azaroth = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'feuer', melee: ['chop', 'sweep', 'claw'], pts: bsDemonPts3(BS_DEMON_J3), emi: [0.1, 0.03, 0.01],
  base: { aRx: -0.35, aRe: -0.75, aRz: 0.18, aLz: 0.2, aLe: -0.5, wing: 0.25 },
  // Flammen züngeln aus der Krone und an der Klinge
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.azaroth, 'weapon', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 1.6 + i / 5) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.7) * 0.25, _b3P.y + v * 1.0, _b3P.z + Math.cos(i * 1.9) * 0.25, 0.7 * (1 - v * 0.6), 'flame', i % 2 ? th.mid : th.core, 0.7 * (1 - v));
    }
    bsPtA3(a, BOSS3.azaroth, 'mouth', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 1.3 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1) * 0.15, _b3P.y + 0.6 + v * 0.8, _b3P.z, 0.6 * (1 - v * 0.5), 'flame', th.mid, 0.6 * (1 - v));
    }
  }
});
BOSS3.sereth = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'blut', melee: ['sweep', 'chop', 'claw'], pts: bsDemonPts3(BS_DEMONF_J3), emi: [0.1, 0.01, 0.03],
  base: { aRx: -0.4, aRe: -0.7, aRz: 0.15, aLz: 0.25, aLe: -0.6, wing: 0.3 },
  // Blutnebel tropft von der Sense und zieht um die Flügel
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.sereth, 'weapon', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.9 + i / 4) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 1.7) * 0.3, _b3P.y - v * 1.6, _b3P.z + Math.cos(i * 2.3) * 0.3, 0.2, 'disc', th.mid, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.sereth, 'back', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.35 + i / 4) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.4 + t * 0.3) * 1.4, _b3P.y - 1 + v * 1.5, _b3P.z + Math.cos(i * 2.4) * 1.0, 0.9 + v, '#5a0a18', 0.3 * Math.sin(Math.PI * v));
    }
  }
});

// ============================================================================================================
// Frostriese Ymir (Karte 7), Nachtriese Skadur (Karte 15) und Donnertitan Tarkon (Karte 3): Riesen
// Gewaltiger, stark vornübergebeugter Riese mit Buckel, riesigen Händen und kurzen, säulenartigen Beinen. Ymir: eisblaue
// Haut, Bart und Haar aus Reif, Eiskristalle wachsen aus Schultern und Rücken, Fellschurz, Keule mit Eisblock. Skadur:
// dunkle Schieferhaut, schwarzer Bart mit Reif, nachtblau leuchtendes Eis. Tarkon: Leib aus Stein mit leuchtenden
// Runenadern, Bronzebänder, Felsbrocken auf den Schultern, Blitzkrone, Kriegshammer, über ihm braut sich ein Gewitter.
// ============================================================================================================
const BS_GIANT_J3 = {
  hipY: 1.0, hipX: 0.25, kneeY: 0.55, ankleY: 0.13, footL: 0.3, waistY: 1.25, chestY: 1.52, shY: 1.86, shX: 0.62, neckY: 1.97,
  headY: 2.04, headZ: 0.32, hunch: 0.27, upper: 0.56, fore: 0.53, hand: 0.24, armOut: 0.1, jaw: [-0.02, 0.05],
  cape: [[0, 1.9, -0.3], [0, 1.0, -0.35]]
};
const BS_GIANT_P3 = bsBipJ3(BS_GIANT_J3);
const BS_GIANT_G3 = bsLerp3(BS_GIANT_P3[-1].W, BS_GIANT_P3[-1].Hd, 0.5);
const BS_GIANT_PTS3 = {
  mouth: [BB3.jaw, [0, 2.0, 0.55]], emit: [BB3.jaw, [0, 2.0, 0.55]], core: [BB3.chest, [0, 1.6, 0.6]], back: [BB3.chest, [0, 2.05, 0.0]],
  weapon: [BB3.haR, [BS_GIANT_G3[0], BS_GIANT_G3[1], BS_GIANT_G3[2] + 1.05]], sky: [BB3.haR, [BS_GIANT_G3[0], BS_GIANT_G3[1], BS_GIANT_G3[2] + 1.05]], fist: [BB3.haL, BS_GIANT_P3[1].Hd]
};
function bsGiant3(b, id, V) {
  const A = adder(b, null);
  const J = BS_GIANT_J3, P = BS_GIANT_P3, C = V;
  const { rig } = bsBipRig3(J);
  const rows = [[0.86, 0, 0.3, 0.24, 0.24], [1.0, 0.02, 0.38, 0.32, 0.26], [1.2, 0.06, 0.42, 0.38, 0.27], [1.4, 0.12, 0.47, 0.36, 0.29], [1.58, 0.18, 0.56, 0.32, 0.33], [1.76, 0.22, 0.62, 0.26, 0.36], [1.9, 0.26, 0.44, 0.18, 0.3], [1.98, 0.29, 0.19, 0.12, 0.15]];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.24, 0.23, 0.17, 0.2, 0.15], leg: [0.26, 0.24, 0.18, 0.19, 0.16], shade: 0.32 });
  for (const sx of [-1, 1]) A(ball(14), C.skin, { bone: BB3.chest, p: [sx * 0.24, 1.7, 0.46], s: [0.26, 0.13, 0.1], top: C.skinTop, topK: 0.5, shade: 0.3 });
  A(ball(14), C.skin, { bone: BB3.chest, p: [0, 1.9, 0.02], s: [0.36, 0.14, 0.28], top: C.skinTop, topK: 0.5, shade: 0.3 });
  // Runenadern (Tarkon) bzw. Frostadern
  if (C.rune) {
    for (const [x, y, z, r, l, bn] of [[0.2, 1.72, 0.58, 0.5, 0.2, BB3.chest], [-0.25, 1.66, 0.56, -0.6, 0.18, BB3.chest], [0.05, 1.42, 0.42, 0.9, 0.16, BB3.spine], [-0.1, 1.25, 0.36, -0.3, 0.15, BB3.spine], [0.35, 1.84, 0.3, 1.2, 0.16, BB3.chest], [-0.32, 1.86, 0.3, -1.1, 0.16, BB3.chest]]) A(box3(), C.rune, { bone: bn, p: [x, y, z], r: [0, 0, r], s: [0.022, l, 0.02], mat: 'glow', noShadow: true });
    for (const sx of [-1, 1]) {
      const [ub, fb] = bsArmB3(sx);
      A(box3(), C.rune, { bone: ub, p: bsAdd3(bsLerp3(P[sx].S, P[sx].E, 0.5), [sx * 0.05, 0, 0.21]), r: [0, 0, sx * 0.4], s: [0.02, 0.2, 0.02], mat: 'glow', noShadow: true });
      A(box3(), C.rune, { bone: fb, p: bsAdd3(bsLerp3(P[sx].E, P[sx].W, 0.5), [sx * 0.04, 0, 0.17]), r: [0, 0, -sx * 0.5], s: [0.02, 0.16, 0.02], mat: 'glow', noShadow: true });
    }
  }
  // --- Kopf: kleiner Kopf tief zwischen den Schultern, Brauenwulst, Bart, Haar ---
  const hb = BB3.head, jb = BB3.jaw;
  const H0 = [0, 2.15, 0.4];
  A(ball(16), C.skin, { bone: hb, p: H0, s: [0.15, 0.16, 0.16], top: C.skinTop, topK: 0.5, shade: 0.25 });
  A(roundBox(0.3, 0.07, 0.1, 0.03), darker(C.skin, 0.12), { bone: hb, p: [0, 2.21, 0.53], r: [0.25, 0, 0], shade: 0.2 });
  A(ball(10), C.skin, { bone: hb, p: [0, 2.13, 0.56], s: [0.05, 0.06, 0.05], shade: 0.2 });
  A(roundBox(0.2, 0.08, 0.15, 0.035), C.skin, { bone: jb, p: [0, 2.04, 0.47], shade: 0.3 });
  for (const sx of [-1, 1]) {
    A(ball(8), '#0c0c10', { bone: hb, p: [sx * 0.065, 2.17, 0.53], s: [0.04, 0.025, 0.02], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.065, 2.17, 0.54], s: [0.03, 0.016, 0.012], mat: 'glow' });
    A(ball(8), C.skin, { bone: hb, p: [sx * 0.15, 2.15, 0.38], s: [0.035, 0.06, 0.045], shade: 0.2 });
  }
  if (C.beard) {
    // Bart in Strähnen (am Kiefer), Haar und Brauen aus Reif
    for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 0.035;
      const len = 0.4 - Math.abs(k - 4) * 0.035;
      A(tube3([[x, 2.05, 0.55], [x * 1.3, 1.92, 0.6], [x * 1.1, 1.98 - len, 0.56 + 0.05 * Math.sin(k)]], 0.04, 0.008, 10, 5), k % 2 ? C.beard : C.beard2, { bone: jb, top: C.beard2, topK: 0.5, shade: 0.15 });
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 7 - 0.5) * 2.6;
      A(tube3([[Math.sin(a) * 0.1, 2.29, 0.38 - Math.cos(a) * 0.08], [Math.sin(a) * 0.18, 2.27, 0.25 - Math.cos(a) * 0.08], [Math.sin(a) * 0.22, 2.07, 0.1], [Math.sin(a) * 0.24, 1.89, 0.02]], 0.04, 0.012, 12, 5), k % 2 ? C.beard : C.beard2, { bone: hb, shade: 0.15, noShadow: k % 2 === 0 });
    }
    for (const sx of [-1, 1]) bsSpike3(A, 0.14, 0.03, C.beard2, [sx * 0.08, 2.24, 0.55], [sx, 0.3, 0.2], { bone: hb });
  } else if (V.tusks) {
    // seit 14.81 Gorvoth (Oger): Unterbiss mit Hauern, eiserne Halbmaske, kahler Schädel mit Narben
    for (const sx of [-1, 1]) {
      bsSpike3(A, 0.16, 0.03, C.tusk, [sx * 0.07, 2.06, 0.55], [sx * 0.25, 1, 0.3], { bone: jb, shine: 0.4 });
      A(box3(), darker(C.skin, 0.3), { bone: hb, p: [sx * 0.07, 2.27, 0.48], r: [0.4, 0, sx * 0.6], s: [0.015, 0.08, 0.01], noShadow: true });
    }
    A(roundBox(0.32, 0.12, 0.14, 0.04), C.iron, { bone: hb, p: [0, 2.2, 0.5], r: [0.15, 0, 0], top: C.ironTop, topK: 0.5, shine: 0.9 });
    for (let k = 0; k < 5; k++) A(sphere3(0.018, 6, 4), C.ironTop, { bone: hb, p: [(k - 2) * 0.06, 2.25, 0.57], shine: 1, noShadow: true });
  } else if (V.golemHead) {
    // seit 14.81 Molgrath (Glutkoloss): Kopf aus Basalt ohne Gesicht, nur Glutaugen und ein glühender Spalt
    A(geo3('bs:fels', () => smoothGeo(new THREE.DodecahedronGeometry(1, 1))), C.stone, { bone: hb, p: [0, 2.2, 0.38], s: [0.2, 0.17, 0.2], top: C.stoneTop, topK: 0.6, shade: 0.3 });
    A(box3(), C.rune, { bone: jb, p: [0, 2.05, 0.56], s: [0.16, 0.025, 0.02], mat: 'glow', noShadow: true });
    for (const sx of [-1, 1]) A(ball(8), C.rune, { bone: hb, p: [sx * 0.075, 2.22, 0.565], s: [0.04, 0.022, 0.02], r: [0, 0, sx * 0.3], mat: 'glow', noShadow: true });
    for (let k = 0; k < 4; k++) bsSpike3(A, 0.16 - k * 0.02, 0.05, C.stone, [(k - 1.5) * 0.1, 2.33, 0.34 - Math.abs(k - 1.5) * 0.03], [(k - 1.5) * 0.3, 1, -0.3], { bone: hb, top: C.stoneTop });
  } else {
    // Tarkon: Steingesicht, Kiefer aus Fels, Blitzkrone
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const p = [Math.sin(a) * 0.13, 2.31, 0.4 + Math.cos(a) * 0.13];
      A(bsBlade3('blitz', [[0, 0], [0.1, 0.04], [0.06, 0.06], [0.2, 0.12], [0.08, 0.06], [0.12, 0.03]], 0.02, 0.006), C.rune, { bone: hb, p, r: [-Math.PI / 2, a, 0], mat: 'glow', noShadow: true });
      bsSpike3(A, 0.08, 0.025, C.bronze, p, [Math.sin(a) * 0.3, 1, Math.cos(a) * 0.3], { bone: hb, shine: 1 });
    }
    A(torus3(0.15, 0.025, Math.PI * 2, 4, 16), C.bronze, { bone: hb, p: [0, 2.29, 0.4], r: [Math.PI / 2, 0, 0], shine: 1 });
  }
  // --- Schultern: Eiskristalle bzw. Felsbrocken; Rückenkamm ---
  for (const sx of [-1, 1]) {
    const [ub] = bsArmB3(sx);
    const S = P[sx].S;
    if (C.ice) {
      for (const [dx, dy, dz, len, r, ang] of [[0.05, 0.16, 0, 0.5, 0.09, 0.5], [0.15, 0.1, -0.12, 0.36, 0.07, 0.9], [-0.05, 0.14, -0.15, 0.42, 0.08, 0.2], [0.12, 0.05, 0.14, 0.28, 0.06, 1.1]]) {
        const p = [S[0] + sx * dx, S[1] + dy, S[2] + dz];
        A(bsOcta3(), C.ice, { bone: ub, p: [p[0] + sx * Math.sin(ang) * len * 0.4, p[1] + Math.cos(ang) * len * 0.4, p[2]], r: [0, 0, -sx * ang], s: [r, len * 0.5, r], top: C.iceTop, topK: 0.5, shine: 1 });
        A(bsOcta3(), C.iceGlow, { bone: ub, p: [p[0] + sx * Math.sin(ang) * len * 0.4, p[1] + Math.cos(ang) * len * 0.4, p[2]], r: [0, 0, -sx * ang], s: [r * 0.55, len * 0.42, r * 0.55], mat: 'glow', noShadow: true });
      }
    } else {
      A(geo3('bs:fels', () => smoothGeo(new THREE.DodecahedronGeometry(1, 1))), C.stone, { bone: ub, p: [S[0] + sx * 0.08, S[1] + 0.12, S[2]], r: [0.3, 0.5, sx * 0.4], s: [0.28, 0.22, 0.3], top: C.stoneTop, topK: 0.6, shade: 0.3 });
      A(torus3(0.26, 0.035, Math.PI * 2, 4, 18), C.bronze, { bone: ub, p: [S[0] + sx * 0.04, S[1] - 0.12, S[2]], r: [Math.PI / 2, 0, sx * 0.4], shine: 1 });
      for (let k = 0; k < 3; k++) bsSpike3(A, 0.18 - k * 0.04, 0.05, C.stone, [S[0] + sx * (0.12 + k * 0.05), S[1] + 0.26 - k * 0.04, S[2] - 0.1 + k * 0.08], [sx * 0.5, 1, 0], { bone: ub, top: C.stoneTop });
    }
  }
  for (let k = 0; k < 5; k++) {
    const p = [0, 2.05 - k * 0.14, -0.08 - k * 0.04];
    if (C.ice) A(bsOcta3(), k % 2 ? C.ice : C.iceGlow, { bone: k < 3 ? BB3.chest : BB3.spine, p: [p[0], p[1] + 0.12, p[2] - 0.12], r: [-0.6, 0, 0], s: [0.07, 0.22 - k * 0.025, 0.07], mat: k % 2 ? 'lit' : 'glow', shine: 1, noShadow: k % 2 === 0 });
    else bsSpike3(A, 0.2 - k * 0.025, 0.06, C.stone, p, [0, 0.6, -1], { bone: k < 3 ? BB3.chest : BB3.spine, top: C.stoneTop });
  }
  // --- Schurz, Gürtel, Arm- und Fußbänder ---
  A(torus3(0.4, 0.06, Math.PI * 2, 5, 24), C.belt, { bone: BB3.pelvis, p: [0, 1.04, 0.04], r: [Math.PI / 2, 0, 0], s: [1.0, 0.75, 1.0], shine: C.ice ? 0.2 : 1 });
  if (C.ice) {
    const skirt = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      skirt.push([[Math.sin(a) * 0.38, 1.0, 0.04 + Math.cos(a) * 0.3], [Math.sin(a) * 0.3, -1, Math.cos(a) * 0.3], 0.34 + 0.05 * Math.sin(i * 2.3), 0.09, BB3.pelvis]);
    }
    bsTufts3(A, skirt, C.fur, C.furTop);
  } else for (const sz of [1, -1]) bsSheetAdd3(b, A, bsSheet3(id + 'schurz' + sz, 4, 5, (u, v) => [(u - 0.5) * 0.5 * (1 - 0.15 * v), 1.0 - v * 0.48, sz * (0.32 + 0.05 * v) + 0.04], () => [[BB3.pelvis, 1]], (u, v, s) => (v > 0.85 ? C.bronze : s > 0 ? C.cloth : darker(C.cloth, 0.2))), false);
  for (const sx of [-1, 1]) {
    const [, fb] = bsArmB3(sx);
    const [, sb, fb2] = bsLegB3(sx);
    const m = bsLerp3(P[sx].E, P[sx].W, 0.65);
    A(cyl3(0.21, 0.19, 0.24, 14), C.band, { bone: fb, p: m, top: C.bandTop, shine: C.ice ? 0.9 : 1 });
    bsHand3(A, sx, P, 0.17, C.skin, { top: C.skinTop, claw: C.ice ? C.ice : null });
    const Ak = P[sx].A;
    A(ball(12), C.skin, { bone: fb2, p: [Ak[0], 0.11, 0.1], s: [0.18, 0.12, 0.27], top: C.skinTop, topK: 0.5, shade: 0.3 });
    for (let k = 0; k < 4; k++) A(ball(8), darker(C.skin, 0.1), { bone: fb2, p: [Ak[0] + (k - 1.5) * 0.07, 0.07, 0.34], s: [0.045, 0.045, 0.05], noShadow: true });
    A(cyl3(0.2, 0.22, 0.22, 14), C.band, { bone: sb, p: [Ak[0], 0.3, 0.0], top: C.bandTop, shine: C.ice ? 0.9 : 1 });
  }
  if (V.apron) {
    // seit 14.81 Volund: Schmiedeschürze aus Leder mit Brandflecken, Funken in der Schürze
    bsSheetAdd3(b, A, bsSheet3(id + 'schuerze', 5, 8, (u, v) => [(u - 0.5) * 0.62 * (1 - 0.1 * v), 1.62 - v * 1.1, 0.5 + 0.08 * Math.sin(Math.PI * u) - v * 0.12],
      (u, v) => [[BB3.chest, Math.max(0, 1 - v * 2.5)], [BB3.pelvis, Math.min(1, v * 2.5)]], (u, v, s) => (s > 0 ? (Math.sin(u * 13 + v * 7) > 0.92 ? '#1a120c' : mixColor(C.apron, darker(C.apron, 0.3), v)) : darker(C.apron, 0.4)), 0.012), true);
    for (const sx of [-1, 1]) A(tube3([[sx * 0.28, 1.64, 0.48], [sx * 0.4, 1.95, 0.25], [sx * 0.3, 2.0, -0.05]], 0.025, 0.025, 8, 5), darker(C.apron, 0.2), { bone: BB3.chest, noShadow: true });
  }
  if (V.chains) {
    // seit 14.81 Gorvoth: Ketten quer über die Brust, Fesseln an den Handgelenken mit Kettenresten
    bsChainLinks3(A, [0.4, 1.92, 0.3], [-0.3, 1.25, 0.5], 9, 0.045, C.iron, BB3.chest);
    for (const sx of [-1, 1]) {
      const fb = bsArmB3(sx)[1];
      const w = bsLerp3(P[sx].E, P[sx].W, 0.92);
      A(torus3(0.2, 0.05, Math.PI * 2, 5, 14), C.iron, { bone: fb, p: w, r: [Math.PI / 2, 0, 0], top: C.ironTop, shine: 0.9 });
      bsChainLinks3(A, [w[0] + sx * 0.18, w[1] - 0.05, w[2]], [w[0] + sx * 0.26, w[1] - 0.6, w[2] - 0.12], 5, 0.04, C.iron, fb);
    }
  }
  // --- Waffe in der rechten Hand ---
  const G = BS_GIANT_G3, hbR = BB3.haR;
  if (C.ice) {
    // Keule: knorriger Stamm, oben ein Eisblock mit Zacken
    A(tube3([[G[0], G[1], G[2] - 0.3], [G[0], G[1] + 0.02, G[2] + 0.3], [G[0] - 0.02, G[1], G[2] + 0.8]], 0.07, 0.11, 14, 8), C.wood, { bone: hbR, top: lighter(C.wood, 0.2), shade: 0.2 });
    const T = [G[0], G[1], G[2] + 1.02];
    A(geo3('bs:eisblock', () => smoothGeo(new THREE.IcosahedronGeometry(1, 0))), C.ice, { bone: hbR, p: T, s: [0.24, 0.22, 0.34], r: [0.3, 0.2, 0], top: C.iceTop, topK: 0.5, shine: 1 });
    A(bsOcta3(), C.iceGlow, { bone: hbR, p: T, s: [0.14, 0.14, 0.22], mat: 'glow', noShadow: true });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      bsSpike3(A, 0.22, 0.05, C.ice, [T[0] + Math.cos(a) * 0.18, T[1] + Math.sin(a) * 0.16, T[2] + 0.05], [Math.cos(a), Math.sin(a), 0.4], { bone: hbR, top: C.iceTop, shine: 1 });
    }
  } else if (V.weapon === 'flail') {
    // seit 14.81 Gorvoth: Kerkerflegel – Griff, Kette, Stachelkugel; Schlüsselbund am Gürtel
    A(cyl3(0.05, 0.05, 0.6, 10), C.wood, { bone: hbR, p: [G[0], G[1], G[2] + 0.1], r: [Math.PI / 2, 0, 0], shade: 0.2 });
    const K = [G[0], G[1] - 0.45, G[2] + 0.55];
    bsChainLinks3(A, [G[0], G[1], G[2] + 0.4], K, 6, 0.05, C.iron, hbR);
    A(ball(12), C.iron, { bone: hbR, p: K, s: 0.2, top: C.ironTop, shine: 0.9 });
    for (let k = 0; k < 10; k++) {
      const a = k * 2.4, b2 = Math.acos(1 - 2 * (k + 0.5) / 10);
      const d = [Math.sin(b2) * Math.cos(a), Math.cos(b2), Math.sin(b2) * Math.sin(a)];
      bsSpike3(A, 0.14, 0.04, C.ironTop, [K[0] + d[0] * 0.18, K[1] + d[1] * 0.18, K[2] + d[2] * 0.18], d, { bone: hbR, shine: 1 });
    }
  } else if (V.weapon === 'none') {
    // seit 14.81 Molgrath: keine Waffe – glühende Fäuste aus Magma
    for (const sx of [-1, 1]) {
      const hbx = bsArmB3(sx)[2];
      const c = bsLerp3(P[sx].W, P[sx].Hd, 0.5);
      A(geo3('bs:fels', () => smoothGeo(new THREE.DodecahedronGeometry(1, 1))), C.stone, { bone: hbx, p: c, s: [0.24, 0.22, 0.24], top: C.stoneTop, shade: 0.3 });
      for (let k = 0; k < 3; k++) A(box3(), C.rune, { bone: hbx, p: [c[0] + sx * 0.12, c[1] - 0.05 + k * 0.06, c[2] + 0.1], r: [0.3 * k, 0, sx * 0.5], s: [0.02, 0.12, 0.02], mat: 'glow', noShadow: true });
    }
  } else {
    // Kriegshammer: langer Stiel, Hammerkopf aus Stein mit Bronze, Blitzrune
    A(cyl3(0.05, 0.05, 1.5, 10), C.wood, { bone: hbR, p: [G[0], G[1], G[2] + 0.35], r: [Math.PI / 2, 0, 0], shade: 0.2 });
    const T = [G[0], G[1], G[2] + 1.05];
    A(roundBox(0.4, 0.66, 0.4, 0.08), C.stone, { bone: hbR, p: T, top: C.stoneTop, topK: 0.5, shade: 0.25 });
    for (const dy of [-0.2, 0.2]) A(torus3(0.235, 0.035, Math.PI * 2, 4, 16), C.bronze, { bone: hbR, p: [T[0], T[1] + dy, T[2]], r: [Math.PI / 2, 0, Math.PI / 4], s: [1, 1, 1], shine: 1 });
    for (const dy of [-1, 1]) A(roundBox(0.3, 0.06, 0.3, 0.02), C.bronze, { bone: hbR, p: [T[0], T[1] + dy * 0.34, T[2]], shine: 1 });
    for (const sx of [-1, 1]) A(bsBlade3('blitz2', [[0, 0], [0.12, 0.05], [0.07, 0.08], [0.22, 0.16], [0.09, 0.08], [0.14, 0.04]], 0.02, 0.006), C.rune, { bone: hbR, p: [T[0] + sx * 0.18, T[1] - 0.1, T[2] - 0.1], r: [0, 0, 0], mat: 'glow', noShadow: true });
  }
  return bsRes3(id, rig, J, 2.32, V.worldH);
}
const BS_YMIR3 = {
  skin: '#6e94b8', skinTop: '#a4c4de', eye: '#9fe8ff', beard: '#e8f4ff', beard2: '#b8d8f0', ice: '#9fd8f4', iceTop: '#e8f8ff', iceGlow: '#bff0ff',
  fur: '#d8dce0', furTop: '#ffffff', belt: '#5a4a3a', band: '#8ab8d8', bandTop: '#d8f0ff', wood: '#4a3a2a', worldH: 8.8
};
const BS_SKADUR3 = Object.assign({}, BS_YMIR3, {
  skin: '#3e4860', skinTop: '#5a6a88', eye: '#8ab0ff', beard: '#1a1e2a', beard2: '#6a7a9a', ice: '#3a4e7a', iceTop: '#7a90c8', iceGlow: '#8ab0ff',
  fur: '#2a2e3a', furTop: '#5a6278', belt: '#2a2420', band: '#2a3450', bandTop: '#5a6a98', wood: '#2a2420', worldH: 8.8
});
const BS_TARKON3 = {
  skin: '#5e5e6a', skinTop: '#8a8a96', eye: '#cfe8ff', rune: '#9fd0ff', stone: '#4a4a56', stoneTop: '#7a7a86', bronze: '#8a6a3a', belt: '#7a5a30',
  band: '#5a4a3a', bandTop: '#9a7a4a', cloth: '#2a3a5a', wood: '#3a2a1c', worldH: 9.4
};
MON3_BUILD.ymir = (b) => bsGiant3(b, 'ymir', BS_YMIR3);
MON3_BUILD.nachtriese = (b) => bsGiant3(b, 'nachtriese', BS_SKADUR3);
MON3_BUILD.tarkon = (b) => bsGiant3(b, 'tarkon', BS_TARKON3);
const BS_GIANT_BOSS3 = { kind: 'biped', melee: ['slam2', 'punch', 'stomp'], blob: 1.6, dome: 1.5, pts: BS_GIANT_PTS3, deathPts: ['core', 'back', 'weapon'], skyAt: 'sky', gait: 0.75, base: { aRx: -0.3, aRe: -0.7, aRz: 0.25, aLz: 0.22, aLe: -0.45, lean: 0.15 } };
BOSS3.ymir = Object.assign({}, BS_GIANT_BOSS3, {
  fx: 'eis', lineStyle: 'smash', emit: 'weapon', emi: [0.04, 0.08, 0.12],
  // Atemwolken in der Kälte, Schneeflocken rieseln von den Schultern
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.ymir, 'mouth', _b3P);
    const ph = (t * 0.45) % 1;
    if (ph < 0.5) for (let i = 0; i < 3; i++) bsSmoke3(h, _b3P.x + i * 0.1, _b3P.y + ph * 0.6, _b3P.z + i * 0.12, 0.4 + ph * 1.6, '#e8f4ff', 0.3 * (1 - ph * 2));
    bsPtA3(a, BOSS3.ymir, 'back', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.5 + i / 4) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.3) * 1.2, _b3P.y + 0.6 - v * 3, _b3P.z + Math.cos(i * 1.7) * 1.0, 0.16, 'spark', th.core, 0.7 * (1 - v));
    }
  }
});
BOSS3.nachtriese = Object.assign({}, BS_GIANT_BOSS3, {
  fx: 'nachteis', emit: 'mouth', emi: [0.03, 0.05, 0.12],
  // Nachtnebel steigt von ihm auf, Eisfunken
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.nachtriese, 'back', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 0.35 + i / 5) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.3) * 1.3, _b3P.y - 1.5 + v * 2.5, _b3P.z + Math.cos(i * 1.7) * 1.1, 1 + v, '#1a2238', 0.3 * Math.sin(Math.PI * v));
      if (i % 2) bsSprite3(h, _b3P.x + Math.sin(i * 1.3) * 0.8, _b3P.y + v * 1.5, _b3P.z, 0.18, 'spark', th.mid, 0.8 * (1 - v));
    }
  }
});
BOSS3.tarkon = Object.assign({}, BS_GIANT_BOSS3, {
  fx: 'sturm', emit: 'weapon', melee: ['chop', 'stomp', 'punch'], emi: [0.04, 0.07, 0.12],
  // Gewitterwolke über dem Kopf, kleine Blitze springen auf Krone und Hammer über
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.tarkon, 'back', _b3P);
    const cx = _b3P.x, cy = _b3P.y + 3.4, cz = _b3P.z;
    for (let i = 0; i < 6; i++) bsSmoke3(h, cx + Math.sin(i * 1.05 + t * 0.2) * 1.4, cy + Math.cos(i * 2.1) * 0.25, cz + Math.cos(i * 1.05 + t * 0.2) * 1.0, 1.6 + 0.3 * Math.sin(t + i), '#2a2e3a', 0.55);
    if ((t * 3.1) % 1 < 0.18) {
      _b3P2.set(cx + Math.sin(t * 7) * 0.9, cy - 0.2, cz);
      bsPtA3(a, BOSS3.tarkon, Math.sin(t * 5) > 0 ? 'weapon' : 'mouth', _b3N);
      if (_b3N.distanceTo(_b3P2) < 7) bsBolt3(h, _b3P2, _b3N, th, 0.03, 0.9, 6);
    }
  }
});

// ============================================================================================================
// Lichkönig Morrak (Karte 8): schwebender Untoter in langer, zerrissener Robe mit Runenborte, Knochenbrustplatte mit
// Seelenstein, Schädel mit grün glühenden Augen und aufklappbarem Kiefer, Dornenkrone, Stachelkragen, Schädel-
// Schulterpanzer, weite Ärmel über knöchernen Armen und Krallenhänden, Stab mit Seelenkäfig; grünes Seelenfeuer.
// ============================================================================================================
const BS_LICH_J3 = {
  hipY: 1.05, hipX: 0.15, kneeY: 0.58, ankleY: 0.12, footL: 0.2, waistY: 1.3, chestY: 1.55, shY: 1.86, shX: 0.42, neckY: 1.95,
  headY: 2.02, headZ: 0.09, hunch: 0.1, upper: 0.45, fore: 0.42, hand: 0.18, armOut: 0.08, jaw: [-0.05, 0.05],
  cape: [[0, 1.92, -0.26], [0, 0.95, -0.42]]
};
const BS_LICH_P3 = bsBipJ3(BS_LICH_J3);
const BS_LICH_G3 = bsLerp3(BS_LICH_P3[-1].W, BS_LICH_P3[-1].Hd, 0.5);
const BS_LICH_PTS3 = {
  mouth: [BB3.jaw, [0, 2.06, 0.26]], core: [BB3.chest, [0, 1.62, 0.28]], back: [BB3.chest, [0, 1.95, -0.2]],
  emit: [BB3.haR, [BS_LICH_G3[0], BS_LICH_G3[1], BS_LICH_G3[2] + 1.22]], weapon: [BB3.haR, [BS_LICH_G3[0], BS_LICH_G3[1], BS_LICH_G3[2] + 1.22]],
  sky: [BB3.haR, [BS_LICH_G3[0], BS_LICH_G3[1], BS_LICH_G3[2] + 1.22]], hand: [BB3.haL, BS_LICH_P3[1].Hd]
};
function bsLich3(b, id, V) {
  const A = adder(b, null);
  const J = BS_LICH_J3, P = BS_LICH_P3, C = V;
  const { rig } = bsBipRig3(J);
  const rows = [[0.04, 0.0, 0.48, 0.42, 0.46], [0.3, 0, 0.41, 0.35, 0.38], [0.6, 0, 0.33, 0.27, 0.3], [0.9, 0, 0.27, 0.22, 0.24], [1.1, 0.01, 0.24, 0.19, 0.2], [1.3, 0.03, 0.25, 0.18, 0.18], [1.5, 0.05, 0.31, 0.2, 0.2], [1.7, 0.07, 0.39, 0.19, 0.2], [1.86, 0.08, 0.33, 0.15, 0.17], [1.96, 0.09, 0.1, 0.08, 0.08]];
  bsBipBody3(id, A, J, P, { C, rows, noArms: true, noLegs: true, torsoCol: C.robe, skinTop: C.robeTop, shade: 0.35 });
  // zerrissener Saum, Runenborte vorn und am Saum
  const hem = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    hem.push([[Math.sin(a) * 0.47, 0.1, Math.cos(a) * 0.44], [Math.sin(a) * 0.25, -1, Math.cos(a) * 0.25], 0.16 + 0.08 * Math.sin(i * 2.9), 0.07, BB3.pelvis]);
  }
  bsTufts3(A, hem, C.robe, C.robeTop);
  for (let k = 0; k < 9; k++) A(box3(), C.glow, { bone: k < 5 ? BB3.pelvis : BB3.spine, p: [0, 0.25 + k * 0.13, 0.4 - k * 0.022 - (k > 5 ? 0.06 : 0)], r: [-0.12, 0, k % 2 ? 0.6 : -0.6], s: [0.02, 0.07, 0.015], mat: 'glow', noShadow: true });
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    A(box3(), C.glow, { bone: BB3.pelvis, p: [Math.sin(a) * 0.455, 0.22, Math.cos(a) * 0.43], r: [0, a, k % 2 ? 0.5 : -0.5], s: [0.018, 0.06, 0.015], mat: 'glow', noShadow: true });
  }
  // Knochenbrustplatte: Rippen, Brustbein, Seelenstein
  A(roundBox(0.06, 0.34, 0.04, 0.015), C.bone, { bone: BB3.chest, p: [0, 1.6, 0.27], r: [-0.12, 0, 0], shine: 0.3 });
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) A(torus3(0.17 - k * 0.01, 0.018, Math.PI * 0.55, 4, 10), C.bone, { bone: BB3.chest, p: [sx * 0.02, 1.74 - k * 0.075, 0.2], r: [Math.PI / 2 - 0.15, 0, sx > 0 ? -0.15 : Math.PI + 0.15], s: [1.2, 0.9, 1], shine: 0.3, noShadow: true });
  bsGem3(A, C.glow, [0, 1.64, 0.31], [0.045, 0.07, 0.03], null, BB3.chest);
  // Gürtel mit Schädel
  A(torus3(0.25, 0.03, Math.PI * 2, 4, 20), C.iron, { bone: BB3.pelvis, p: [0, 1.12, 0.02], r: [Math.PI / 2, 0, 0], s: [1, 0.82, 1.2], shine: 0.9 });
  A(ball(10), C.bone, { bone: BB3.pelvis, p: [0, 1.12, 0.23], s: [0.065, 0.06, 0.05], shine: 0.3 });
  if (V.stole) for (const sx of [-1, 1]) {
    bsSheetAdd3(b, A, bsSheet3(id + 'stola' + sx, 2, 8, (u, v) => [sx * (0.1 + u * 0.09 - v * 0.03), 1.86 - v * 1.6, 0.25 + 0.17 * Math.sin(Math.min(1, v * 1.4) * Math.PI * 0.55) - v * 0.02],
      (u, v) => [[BB3.chest, Math.max(0, 1 - v * 2.2)], [BB3.pelvis, Math.min(1, v * 2.2)]], (u, v, s2) => (u < 0.15 || u > 0.85 || Math.abs(v - 0.9) < 0.04 ? C.gold : C.stole), 0.008), false);
  }
  if (V.chains) {
    bsChainLinks3(A, [0.22, 1.82, 0.18], [-0.2, 1.2, 0.26], 9, 0.03, C.iron, BB3.chest);
    bsChainLinks3(A, [-0.18, 1.12, 0.2], [-0.32, 0.5, 0.3], 7, 0.03, C.iron, BB3.pelvis);
  }
  // --- Schädel ---
  // seit 14.82 (bosse3d-modelle3.js): V.headgear 'ice' (Eiskrone, Eisbart), 'mitre' (Mitra), 'hood' (tiefe Kapuze),
  // 'void' (Kapuze ohne Schädel, nur Leere und Augen); V.noCollar, V.stole (Stola), V.chains, V.staff 'ice', 'crozier',
  // 'lantern'
  const hb = BB3.head, jb = BB3.jaw;
  if (V.headgear === 'void') {
    A(ball(14), '#06040a', { bone: hb, p: [0, 2.13, 0.13], s: [0.12, 0.13, 0.1], noShadow: true });
    for (const sx of [-1, 1]) A(ball(8), C.glow, { bone: hb, p: [sx * 0.045, 2.14, 0.22], s: [0.03, 0.016, 0.01], r: [0, 0, sx * 0.25], mat: 'glow' });
  } else {
  A(ball(16), C.bone, { bone: hb, p: [0, 2.15, 0.12], s: [0.13, 0.135, 0.145], top: C.boneTop, topK: 0.5, shade: 0.3, shine: 0.3 });
  A(roundBox(0.17, 0.08, 0.1, 0.03), C.bone, { bone: hb, p: [0, 2.07, 0.21], shine: 0.3 });
  A(roundBox(0.13, 0.04, 0.11, 0.015), C.bone, { bone: jb, p: [0, 1.99, 0.19], shine: 0.3 });
  for (let k = 0; k < 6; k++) {
    A(roundBox(0.018, 0.03, 0.015, 0.005), C.boneTop, { bone: hb, p: [(k - 2.5) * 0.022, 2.04, 0.265], noShadow: true });
    A(roundBox(0.018, 0.028, 0.015, 0.005), C.boneTop, { bone: jb, p: [(k - 2.5) * 0.021, 2.015, 0.245], noShadow: true });
  }
  A(ball(6), '#0a0c08', { bone: hb, p: [0, 2.1, 0.265], s: [0.022, 0.028, 0.012], noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(10), '#060806', { bone: hb, p: [sx * 0.05, 2.155, 0.235], s: [0.042, 0.038, 0.03], noShadow: true });
    A(ball(8), C.glow, { bone: hb, p: [sx * 0.05, 2.155, 0.25], s: [0.022, 0.02, 0.012], mat: 'glow' });
    A(ball(8), C.bone, { bone: hb, p: [sx * 0.095, 2.11, 0.2], s: [0.035, 0.025, 0.05], shine: 0.3 });
  }
  }
  if (V.headgear === 'ice') {
    // Eiskrone: hohe Zacken, Eisbart aus Zapfen
    A(torus3(0.135, 0.02, Math.PI * 2, 4, 18), C.iron, { bone: hb, p: [0, 2.24, 0.12], r: [Math.PI / 2 - 0.15, 0, 0], shine: 0.9 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const len = 0.14 + 0.22 * Math.max(0, Math.cos(a)) + (k === 0 ? 0.08 : 0);
      A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: hb, p: [Math.sin(a) * 0.13, 2.26 + len * 0.45, 0.12 + Math.cos(a) * 0.13], r: [Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2], s: [0.026, len * 0.5, 0.026], shine: 1 });
    }
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) * 0.035;
      A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: jb, p: [x, 1.9 - (3 - Math.abs(k - 3)) * 0.025, 0.24 - Math.abs(k - 3) * 0.02], s: [0.02, 0.09 + (3 - Math.abs(k - 3)) * 0.02, 0.02], shine: 1, noShadow: true });
    }
  } else if (V.headgear === 'mitre') {
    // Mitra: zwei hohe Hälften mit Goldborte und Stein
    for (const sz of [1, -1]) A(bsBlade3('mitra', [[-0.13, 0], [0.13, 0], [0.11, 0.2], [0, 0.36], [-0.11, 0.2]], 0.03, 0.01), C.mitre, { bone: hb, p: [0, 2.22, 0.12 + sz * 0.035], r: [0, Math.PI / 2, 0], top: C.mitreTop, shine: 0.4 });
    A(torus3(0.135, 0.02, Math.PI * 2, 4, 18), C.gold, { bone: hb, p: [0, 2.23, 0.12], r: [Math.PI / 2 - 0.1, 0, 0], shine: 1 });
    A(roundBox(0.025, 0.3, 0.09, 0.01), C.gold, { bone: hb, p: [0, 2.38, 0.12], shine: 1 });
    bsGem3(A, C.glow, [0, 2.36, 0.17], [0.025, 0.035, 0.015], null, hb);
  } else if (V.headgear === 'hood' || V.headgear === 'void') {
    A(cap3(1, Math.PI * 0.62, 0, Math.PI * 2, 18, 8), C.robe, { bone: hb, p: [0, 2.16, 0.08], r: [-0.4, 0, 0], s: [0.17, 0.19, 0.18], top: C.robeTop, topK: 0.5, shade: 0.3 });
    A(tubeProfile3([[0, 1.98, -0.1], [0, 2.22, -0.08], [0, 2.32, 0.06]], [0.13, 0.14, 0.11], 8, 10), C.robe, { bone: hb, top: C.robeTop, shade: 0.3 });
  } else {
  // Dornenkrone mit Seelensteinen
  A(torus3(0.135, 0.02, Math.PI * 2, 4, 18), C.iron, { bone: hb, p: [0, 2.24, 0.12], r: [Math.PI / 2 - 0.15, 0, 0], shine: 0.9 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const front = Math.cos(a);
    bsSpike3(A, 0.12 + 0.12 * Math.max(0, front), 0.022, C.iron, [Math.sin(a) * 0.13, 2.25, 0.12 + Math.cos(a) * 0.13], [Math.sin(a) * 0.2, 1, Math.cos(a) * 0.2], { bone: hb, shine: 0.9 });
    if (k % 3 === 0) bsGem3(A, C.glow, [Math.sin(a) * 0.14, 2.26, 0.12 + Math.cos(a) * 0.14], [0.015, 0.025, 0.015], null, hb);
  }
  }
  // Stachelkragen hinter dem Kopf
  for (let k = 0; k < (V.noCollar ? 0 : 9); k++) {
    const a = (k / 8 - 0.5) * 2.6;
    bsSpike3(A, 0.32 - Math.abs(k - 4) * 0.03, 0.04, C.iron, [Math.sin(a) * 0.2, 1.92, 0.02 - Math.cos(a) * 0.12], [Math.sin(a) * 0.6, 1, -0.45], { bone: BB3.chest, shine: 0.9, top: C.ironTop });
  }
  // --- Schultern: Panzer mit Schädel, weite Ärmel, Knochenarme, Krallenhände ---
  for (const sx of [-1, 1]) {
    const [ub, fb, hbn] = bsArmB3(sx);
    const Q = P[sx];
    const D = [Q.S[0] + sx * 0.04, Q.S[1] + 0.05, Q.S[2]];
    A(cap3(1, 1.3, 0, Math.PI * 2, 16, 6), C.iron, { bone: ub, p: D, r: [0, 0, sx * 0.55], s: [0.19, 0.14, 0.2], top: C.ironTop, shine: 0.9 });
    A(ball(10), C.bone, { bone: ub, p: [D[0] + sx * 0.12, D[1] + 0.02, D[2] + 0.1], s: [0.065, 0.06, 0.07], shine: 0.3 });
    for (const ex of [-1, 1]) A(ball(6), C.glow, { bone: ub, p: [D[0] + sx * 0.12 + ex * 0.025, D[1] + 0.03, D[2] + 0.16], s: [0.012, 0.012, 0.008], mat: 'glow' });
    for (let k = 0; k < 2; k++) bsSpike3(A, 0.18 - k * 0.05, 0.03, C.iron, [D[0] + sx * 0.06, D[1] + 0.1, D[2] - 0.08 + k * 0.1], [sx * 0.5, 1, -0.3], { bone: ub, shine: 0.9 });
    // Ärmel: oben eng, unten weit (folgt Ober- und Unterarm)
    const sl = bsSkin3(id + ':aermel' + sx + GEO3_LOD, tubeProfile3([Q.S, bsLerp3(Q.S, Q.E, 0.5), Q.E, bsLerp3(Q.E, Q.W, 0.45)], [0.12, 0.13, 0.17, 0.23], 12, 12), bsChain3([[ub, Q.S], [fb, Q.E], [fb, Q.W]]));
    A(sl, C.robe, { top: C.robeTop, shade: 0.3, shadowExact: true });
    A(bsSkin3(id + ':arm' + sx + GEO3_LOD, tubeProfile3([Q.E, bsLerp3(Q.E, Q.W, 0.5), Q.W], [0.035, 0.03, 0.032], 8, 6), bsChain3([[fb, Q.E], [hbn, Q.W], [hbn, Q.Hd]])), C.bone, { shine: 0.3 });
    A(ball(8), C.bone, { bone: fb, p: Q.W, s: 0.04, shine: 0.3 });
    bsHand3(A, sx, P, 0.06, C.bone, { top: C.boneTop, claw: C.iron });
  }
  // --- Stab mit Seelenkäfig (rechte Hand) ---
  const G = BS_LICH_G3, hbR = BB3.haR;
  if (V.staff) {
    const O = [G[0], G[1], G[2] + 1.22];
    A(tube3([[G[0], G[1], G[2] - 0.95], [G[0] + 0.02, G[1], G[2] - 0.3], [G[0] - 0.02, G[1], G[2] + 0.4], [G[0], G[1], G[2] + 1.0]], 0.035, 0.03, 18, 6), V.staff === 'crozier' ? C.gold : C.wood, { bone: hbR, top: lighter(V.staff === 'crozier' ? C.gold : C.wood, 0.2), shine: V.staff === 'crozier' ? 1 : 0 });
    if (V.staff === 'ice') {
      A(bsOcta3(), C.gem, { bone: hbR, p: O, s: [0.09, 0.09, 0.24], top: C.gemTop, topK: 0.5, shine: 1 });
      A(bsOcta3(), C.glow, { bone: hbR, p: O, s: [0.05, 0.05, 0.15], mat: 'glow', noShadow: true });
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; bsSpike3(A, 0.18, 0.025, C.gem, [O[0] + Math.cos(a) * 0.06, O[1] + Math.sin(a) * 0.06, O[2] - 0.14], [Math.cos(a), Math.sin(a), 0.6], { bone: hbR, shine: 1, top: C.gemTop }); }
    } else if (V.staff === 'crozier') {
      // Krummstab: goldener Bogen mit Leuchtstein
      A(tube3([[G[0], G[1], G[2] + 1.0], [G[0], G[1] + 0.02, G[2] + 1.25], [G[0], G[1] + 0.2, G[2] + 1.38], [G[0], G[1] + 0.32, G[2] + 1.22], [G[0], G[1] + 0.24, G[2] + 1.08]], 0.03, 0.02, 18, 6), C.gold, { bone: hbR, shine: 1 });
      bsGem3(A, C.glow, [G[0], G[1] + 0.2, G[2] + 1.22], [0.05, 0.05, 0.05], null, hbR);
    } else {
      // Seelenlaterne an einer Kette
      A(tube3([[G[0], G[1], G[2] + 1.0], [G[0], G[1] + 0.18, G[2] + 1.15], [G[0], G[1] + 0.2, G[2] + 1.3]], 0.025, 0.02, 10, 5), C.wood, { bone: hbR });
      bsChainLinks3(A, [G[0], G[1] + 0.18, G[2] + 1.3], [G[0], G[1] - 0.05, G[2] + 1.32], 4, 0.02, C.iron, hbR);
      const L = [G[0], G[1] - 0.16, G[2] + 1.32];
      A(cyl3(0.07, 0.08, 0.16, 8), C.iron, { bone: hbR, p: L, shine: 0.9 });
      A(ball(10), C.glow, { bone: hbR, p: L, s: [0.06, 0.07, 0.06], mat: 'glow', noShadow: true });
      A(cap3(1, 1.2, 0, Math.PI * 2, 8, 4), C.iron, { bone: hbR, p: [L[0], L[1] + 0.08, L[2]], s: [0.09, 0.06, 0.09], shine: 0.9 });
    }
  } else {
  A(tube3([[G[0], G[1], G[2] - 0.95], [G[0] + 0.02, G[1], G[2] - 0.3], [G[0] - 0.02, G[1], G[2] + 0.4], [G[0], G[1], G[2] + 1.0]], 0.035, 0.03, 18, 6), C.wood, { bone: hbR, top: lighter(C.wood, 0.2) });
  A(ball(10), C.bone, { bone: hbR, p: [G[0], G[1], G[2] + 0.98], s: [0.08, 0.075, 0.07], shine: 0.3 });
  const O = [G[0], G[1], G[2] + 1.22];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    A(tube3([[G[0] + Math.cos(a) * 0.05, G[1] + Math.sin(a) * 0.05, G[2] + 1.02], [O[0] + Math.cos(a) * 0.17, O[1] + Math.sin(a) * 0.17, O[2] - 0.05], [O[0] + Math.cos(a) * 0.12, O[1] + Math.sin(a) * 0.12, O[2] + 0.18], [O[0] + Math.cos(a) * 0.02, O[1] + Math.sin(a) * 0.02, O[2] + 0.28]], 0.018, 0.006, 12, 4), C.iron, { bone: hbR, shine: 0.9 });
  }
  A(ball(12), C.glow, { bone: hbR, p: O, s: 0.1, mat: 'glow', noShadow: true });
  }
  // --- Umhang: zerrissen, am Umhang-Knochen ---
  bsSheetAdd3(b, A, bsSheet3(id + 'umhang', 8, 10, (u, v) => {
    const a = (u - 0.5) * 2.3;
    const R = 0.3 + v * 0.25;
    const cut = v > 0.75 ? 0.12 * Math.abs(Math.sin(u * 19)) : 0;
    return [Math.sin(a) * R, 1.9 - Math.min(v, 1 - cut) * 1.75, 0.02 - Math.cos(a) * R * 0.75 - 0.08];
  }, (u, v) => [[BB3.chest, Math.max(0, 1 - v * 3)], [BB3.c1, Math.min(1, v * 3) * (1 - v)], [BB3.c2, Math.min(1, v * 3) * v]], (u, v, s) => (s > 0 ? mixColor(C.cape, C.capeEdge, v * v) : darker(C.cape, 0.3)), 0.01), true);
  return bsRes3(id, rig, J, 2.5, V.worldH);
}
const BS_MORRAK3 = {
  robe: '#26281e', robeTop: '#46483a', bone: '#d8d0b8', boneTop: '#f0ead8', iron: '#2a2c26', ironTop: '#5a5e50', glow: '#8fe36a', wood: '#2a2218',
  cape: '#1a1c16', capeEdge: '#2e3a22', skin: '#26281e', skinTop: '#46483a', worldH: 8.6
};
MON3_BUILD.morrak = (b) => bsLich3(b, 'morrak', BS_MORRAK3);
BOSS3.morrak = {
  kind: 'biped', fx: 'seele', melee: ['chop', 'claw', 'sweep'], emit: 'weapon', cape: true, float: 0.32, blob: 1.2, dome: 1.35,
  pts: BS_LICH_PTS3, deathPts: ['core', 'mouth', 'back', 'weapon'], skyAt: 'sky', emi: [0.03, 0.08, 0.02], gait: 0.6,
  base: { aRx: -0.25, aRe: -1.25, aRz: 0.15, aLx: -0.45, aLe: -0.9, aLz: 0.3, lean: 0.05 },
  // Seelenfeuer: grüne Flammen am Stab und im Schädel, Seelen kreisen um ihn
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.morrak, 'weapon', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 1.4 + i / 4) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.2) * 0.12, _b3P.y + v * 0.9, _b3P.z + Math.cos(i * 1.4) * 0.12, 0.6 * (1 - v * 0.6), 'flame', i % 2 ? th.mid : th.core, 0.7 * (1 - v));
    }
    bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, 1.2, 'disc', th.mid, 0.35);
    bsPtA3(a, BOSS3.morrak, 'core', _b3P);
    for (let i = 0; i < 3; i++) {
      const ang = t * 0.9 + i * 2.1;
      const y = _b3P.y - 0.5 + Math.sin(t * 1.3 + i) * 0.6;
      bsSprite3(h, _b3P.x + Math.cos(ang) * 2.2, y, _b3P.z + Math.sin(ang) * 2.2, 0.55, 'flame', th.mid, 0.55);
      bsSprite3(h, _b3P.x + Math.cos(ang - 0.25) * 2.2, y - 0.1, _b3P.z + Math.sin(ang - 0.25) * 2.2, 0.3, 'disc', th.mid, 0.3);
    }
  }
};

// ============================================================================================================
// Ursus, der Waldtyrann (Karte 4) und Brakkur, der Kohlenfürst (Karte 12): Riesenbär
// Massiger Bär mit hohem Schulterbuckel, breitem Schädel, kurzer Schnauze, kleinen runden Ohren, mächtigen Pranken mit
// langen Krallen. Ursus: Moos und Farn auf dem Rücken, junge Bäume und Leuchtpilze wachsen aus ihm, Rindenplatten auf
// den Schultern, Steine im Fell. Brakkur: verkohlt schwarz mit glühenden Rissen, Kohlekristalle auf dem Rücken,
// Glut im Maul, Rauch steigt von ihm auf.
// ============================================================================================================
const BS_BEAR_J3 = {
  body: [0, 1.25, -0.55], chest: [0, 1.35, 0.35], neck: [0, 1.36, 0.82], head: [0, 1.36, 1.08], jaw: [0, 1.28, 1.14],
  tail: [[0, 1.32, -1.2], [0, 1.25, -1.32], [0, 1.16, -1.42]],
  fl: [[0.4, 1.2, 0.45], [0.42, 0.66, 0.38], [0.42, 0.2, 0.46], [0.42, 0.03, 0.68]],
  bl: [[0.42, 1.15, -0.68], [0.44, 0.72, -0.46], [0.44, 0.3, -0.78], [0.44, 0.03, -0.56]],
  ear: [0.17, 1.6, 1.0]
};
const BS_BEAR_PTS3 = { mouth: [BQ3.jaw, [0, 1.28, 1.5]], emit: [BQ3.head, [0, 1.32, 1.52]], core: [BQ3.chest, [0, 1.3, 0.7]], weapon: [BQ3.pwFL, [0.42, 0.12, 0.66]], back: [BQ3.chest, [0, 1.95, 0.1]], sky: [BQ3.head, [0, 1.7, 1.2]] };
function bsBear3(b, id, V) {
  const A = adder(b, null);
  const J = BS_BEAR_J3, C = V;
  const rig = bsQuadRig3(J);
  const fur = { top: C.furTop, topK: 0.55, shade: 0.32, shadowExact: true };
  const rows = [[-1.25, 1.26, 0.25, 0.22, 0.22], [-1.0, 1.28, 0.44, 0.35, 0.4], [-0.62, 1.28, 0.49, 0.4, 0.45], [-0.2, 1.31, 0.5, 0.44, 0.47], [0.18, 1.4, 0.53, 0.55, 0.47], [0.52, 1.4, 0.5, 0.5, 0.46], [0.78, 1.38, 0.38, 0.38, 0.36], [0.96, 1.36, 0.26, 0.25, 0.25]];
  const bodyW = bsChain3([[BQ3.body, [0, 1.28, -1.3]], [BQ3.body, J.body], [BQ3.chest, [0, 1.35, 0.1]], [BQ3.neck, J.neck], [BQ3.head, J.head]]);
  A(bsSkin3(id + ':rumpf' + GEO3_LOD, loft3(rows, 20, 4), bodyW), C.fur, fur);
  const neckW = bsChain3([[BQ3.chest, [0, 1.35, 0.55]], [BQ3.neck, J.neck], [BQ3.head, J.head], [BQ3.head, [0, 1.38, 1.3]]]);
  A(bsSkin3(id + ':hals' + GEO3_LOD, tubeProfile3([[0, 1.36, 0.6], [0, 1.36, 0.86], [0, 1.38, 1.06]], [0.4, 0.33, 0.27], 10, 14), neckW), C.fur, fur);
  // Beine: dick, Pranken mit langen Krallen
  for (const [L, front] of [[J.fl, true], [J.bl, false]]) {
    for (const sx of [1, -1]) {
      const [ub, lb, pb] = bsLegQ3(front, sx);
      const Q = L.map((q) => [sx * q[0], q[1], q[2]]);
      const r = front ? [0.28, 0.24, 0.2, 0.19, 0.17] : [0.32, 0.27, 0.2, 0.18, 0.16];
      A(bsSkin3(id + ':bein' + front + sx + GEO3_LOD, tubeProfile3([Q[0], bsLerp3(Q[0], Q[1], 0.5), Q[1], bsLerp3(Q[1], Q[2], 0.5), Q[2]], r, 16, 12), bsChain3([[ub, Q[0]], [lb, Q[1]], [pb, Q[2]], [pb, Q[3]]])), C.fur, fur);
      A(ball(14), C.fur, { bone: ub, p: [Q[0][0], Q[0][1] - 0.12, Q[0][2] + (front ? 0.04 : 0.04)], s: front ? [0.26, 0.34, 0.3] : [0.28, 0.36, 0.34], top: C.furTop, topK: 0.6, shade: 0.3 });
      const T = Q[3];
      A(ball(12), C.fur, { bone: pb, p: [T[0], 0.1, (Q[2][2] + T[2]) / 2], s: [0.17, 0.11, 0.21], top: C.furTop, topK: 0.5, shade: 0.3 });
      for (let k = 0; k < 5; k++) {
        const a = (k - 2) * 0.28;
        const p0 = [T[0] + Math.sin(a) * 0.13, 0.07, T[2] + Math.cos(a) * 0.05];
        A(ball(8), darker(C.fur, 0.2), { bone: pb, p: p0, s: [0.045, 0.04, 0.05], noShadow: true });
        A(tube3([[p0[0], 0.08, p0[2] + 0.03], [p0[0] + Math.sin(a) * 0.03, 0.08, p0[2] + 0.12], [p0[0] + Math.sin(a) * 0.05, 0.02, p0[2] + 0.18]], 0.022, 0.004, 8, 5), C.claw, { bone: pb, shine: 0.6, noShadow: true });
      }
    }
  }
  // Stummelschwanz
  A(ball(10), C.fur, { bone: BQ3.t1, p: [0, 1.3, -1.28], s: [0.12, 0.1, 0.12], top: C.furTop });
  // --- Kopf: breiter Schädel, kurze Schnauze, kleine runde Ohren ---
  // seit 14.82: V.head (bosse3d-modelle3.js) baut einen eigenen Kopf (Mammut Sturmhorn)
  const hb = BQ3.head, jb = BQ3.jaw;
  if (V.head) V.head(A, hb, jb, J, C);
  else {
  A(ball(16), C.fur, { bone: hb, p: [0, 1.42, 1.1], s: [0.27, 0.23, 0.25], top: C.furTop, topK: 0.55, shade: 0.25 });
  A(loft3([[1.2, 1.36, 0.17, 0.12, 0.1], [1.34, 1.33, 0.13, 0.1, 0.075], [1.46, 1.32, 0.095, 0.08, 0.055], [1.52, 1.315, 0.06, 0.05, 0.035]], 12, 3), C.muzzle, { bone: hb, top: lighter(C.muzzle, 0.15), topK: 0.5, shade: 0.2 });
  A(ball(10), '#100c0a', { bone: hb, p: [0, 1.36, 1.51], s: [0.06, 0.04, 0.04], shine: 0.8 });
  A(loft3([[1.18, 1.24, 0.14, 0.04, 0.06], [1.34, 1.24, 0.11, 0.035, 0.05], [1.46, 1.245, 0.07, 0.03, 0.035]], 10, 2), C.muzzle, { bone: jb, shade: 0.3 });
  A(loft3([[1.2, 1.265, 0.11, 0.02, 0.02], [1.44, 1.265, 0.06, 0.015, 0.015]], 8, 2), C.mouth, { bone: jb, mat: C.mouthGlow ? 'glow' : 'lit', noShadow: true });
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = 1.3 + k * 0.05;
      bsSpike3(A, k === 3 ? 0.08 : 0.035, 0.014, C.tooth, [sx * (0.11 - k * 0.015), 1.285, z], [0, -1, 0.1], { bone: hb, seg: 4 });
      bsSpike3(A, k === 2 ? 0.07 : 0.03, 0.013, C.tooth, [sx * (0.1 - k * 0.015), 1.27, z - 0.02], [0, 1, 0.1], { bone: jb, seg: 4 });
    }
    A(ball(8), '#0c0a08', { bone: hb, p: [sx * 0.12, 1.47, 1.28], s: [0.04, 0.03, 0.03], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.12, 1.47, 1.29], s: [0.028, 0.02, 0.02], mat: 'glow' });
    A(roundBox(0.1, 0.04, 0.1, 0.02), darker(C.fur, 0.15), { bone: hb, p: [sx * 0.12, 1.51, 1.26], r: [0.2, sx * 0.2, sx * 0.25] });
    const eb = sx > 0 ? BQ3.earL : BQ3.earR;
    A(ball(10), C.fur, { bone: eb, p: [sx * J.ear[0], J.ear[1], J.ear[2]], s: [0.08, 0.08, 0.04], top: C.furTop });
    A(ball(8), C.earIn, { bone: eb, p: [sx * J.ear[0], J.ear[1] - 0.005, J.ear[2] + 0.025], s: [0.05, 0.05, 0.015], noShadow: true });
    bsTufts3(A, [0, 1, 2].map((k) => [[sx * 0.24, 1.38 - k * 0.06, 1.05 - k * 0.03], [sx * 0.9, -0.3, -0.4], 0.18, 0.06, hb]), C.furD, C.furTop);
  }
  }
  // Fellbüschel am Buckel und an der Brust
  const tufts = [];
  for (let i = 0; i < 18; i++) {
    const z = 0.6 - (i % 9) * 0.2;
    const sx = i < 9 ? 1 : -1;
    const s = (() => { for (const r of rows) if (r[0] >= z) return r; return rows[rows.length - 1]; })();
    tufts.push([[sx * s[2] * 0.75, s[1] + s[3] * 0.7, z], [sx * 0.6, 0.6, -0.6], 0.22, 0.08, z > 0 ? BQ3.chest : BQ3.body]);
  }
  for (let i = 0; i < 6; i++) tufts.push([[(i - 2.5) * 0.12, 1.0 - Math.abs(i - 2.5) * 0.02, 0.86], [(i - 2.5) * 0.2, -1, 0.3], 0.24, 0.08, BQ3.chest]);
  bsTufts3(A, tufts, C.furD, C.furTop);

  if (C.moss) {
    // Ursus: Moosdecke, junge Bäume, Leuchtpilze, Rindenplatten, Steine
    for (let i = 0; i < 16; i++) {
      const z = 0.55 - i * 0.1;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      const x = Math.sin(i * 2.7) * 0.18;
      A(ball(10), i % 3 ? C.moss : C.moss2, { bone: z > 0 ? BQ3.chest : BQ3.body, p: [x, r[1] + r[3] * 0.93, z], s: [0.2, 0.06, 0.16], top: lighter(C.moss, 0.2), topK: 0.6, noShadow: true });
    }
    for (const [x, z, h, bn] of [[0.08, 0.25, 0.75, BQ3.chest], [-0.12, -0.15, 0.6, BQ3.body], [0.15, -0.5, 0.5, BQ3.body]]) {
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      const y0 = r[1] + r[3] * 0.9;
      A(tube3([[x, y0, z], [x + 0.03, y0 + h * 0.5, z - 0.02], [x - 0.02, y0 + h, z + 0.02]], 0.05, 0.02, 10, 6), C.wood, { bone: bn, top: lighter(C.wood, 0.2), shade: 0.2 });
      for (let k = 0; k < 4; k++) A(ball(10), k % 2 ? C.leaf : C.leaf2, { bone: bn, p: [x + Math.sin(k * 1.7) * 0.12, y0 + h * (0.7 + k * 0.12), z + Math.cos(k * 1.7) * 0.12], s: [0.17 - k * 0.025, 0.13 - k * 0.02, 0.17 - k * 0.025], top: lighter(C.leaf, 0.2), topK: 0.6 });
    }
    for (let i = 0; i < 7; i++) {
      const z = 0.4 - i * 0.22;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      const sx = i % 2 ? 1 : -1;
      const p = [sx * r[2] * 0.55, r[1] + r[3] * 0.82, z];
      const bn = z > 0 ? BQ3.chest : BQ3.body;
      A(cyl3(0.012, 0.016, 0.07, 6), '#e8e0c8', { bone: bn, p: [p[0], p[1] + 0.03, p[2]], noShadow: true });
      A(cap3(1, 1.4, 0, Math.PI * 2, 10, 4), C.glow, { bone: bn, p: [p[0], p[1] + 0.06, p[2]], s: [0.05, 0.04, 0.05], mat: 'glow', noShadow: true });
    }
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) A(roundBox(0.24, 0.05, 0.2, 0.02), C.bark, { bone: BQ3.chest, p: [sx * (0.35 + k * 0.04), 1.62 - k * 0.12, 0.42 - k * 0.04], r: [0, 0, sx * (0.6 + k * 0.25)], top: lighter(C.bark, 0.2), topK: 0.6, shade: 0.3 });
      A(geo3('bs:fels', () => smoothGeo(new THREE.DodecahedronGeometry(1, 1))), C.stone, { bone: BQ3.body, p: [sx * 0.3, 1.6, -0.75], s: [0.12, 0.09, 0.11], r: [0.3, sx, 0], top: lighter(C.stone, 0.25) });
    }
  } else if (V.extra) V.extra(A, b, id, J, C, rows);
  else {
    // Brakkur: Glutrisse, Kohlekristalle auf dem Rücken
    for (let i = 0; i < 22; i++) {
      const z = 0.75 - (i % 11) * 0.18;
      const sx = i < 11 ? 1 : -1;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      const a = 0.4 + 0.5 * Math.sin(i * 1.9);
      A(box3(), C.glow, { bone: z > 0.1 ? BQ3.chest : BQ3.body, p: [sx * Math.cos(a) * r[2] * 1.01, r[1] + Math.sin(a) * r[3] * 1.0, z], r: [0.4 * Math.sin(i), 0, sx * (1.2 + 0.5 * Math.sin(i * 2.3))], s: [0.015, 0.16, 0.015], mat: 'glow', noShadow: true });
    }
    for (let i = 0; i < 9; i++) {
      const z = 0.5 - i * 0.18;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      const x = Math.sin(i * 2.3) * 0.15;
      const bn = z > 0 ? BQ3.chest : BQ3.body;
      const p = [x, r[1] + r[3] * 0.9, z];
      A(bsOcta3(), C.coal, { bone: bn, p: [p[0], p[1] + 0.12, p[2]], r: [0.3 * Math.sin(i), i, 0.3 * Math.cos(i)], s: [0.1, 0.24 - (i % 3) * 0.04, 0.1], top: C.coalTop, topK: 0.5, shine: 0.9 });
      A(bsOcta3(), C.glow, { bone: bn, p: [p[0], p[1] + 0.06, p[2]], s: [0.06, 0.08, 0.06], mat: 'glow', noShadow: true });
    }
    for (const sx of [-1, 1]) for (const [front, lb] of [[true, sx > 0 ? BQ3.loFL : BQ3.loFR], [false, sx > 0 ? BQ3.loBL : BQ3.loBR]]) {
      const L = front ? J.fl : J.bl;
      A(box3(), C.glow, { bone: lb, p: [sx * (L[1][0] + 0.14), (L[1][1] + L[2][1]) / 2, (L[1][2] + L[2][2]) / 2], r: [0.2, 0, sx * 0.3], s: [0.015, 0.22, 0.015], mat: 'glow', noShadow: true });
    }
  }
  return bsRes3(id, rig, J, 2.05, V.worldH);
}
const BS_URSUS3 = {
  fur: '#4a3220', furTop: '#6e5034', furD: '#3a2618', muzzle: '#6a4a30', mouth: '#3a1414', claw: '#e0d8c0', tooth: '#efe8da', eye: '#c8ff6a', earIn: '#2a1a12',
  moss: '#4f7a32', moss2: '#6a8a3a', wood: '#4a3420', leaf: '#3e6a2a', leaf2: '#5a8a34', glow: '#c8ff6a', bark: '#3a2a1a', stone: '#6a6a60', worldH: 5.8
};
const BS_BRAKKUR3 = {
  fur: '#221a1a', furTop: '#3a2e2a', furD: '#141010', muzzle: '#2e2422', mouth: '#ff8a3a', mouthGlow: true, claw: '#1a1414', tooth: '#d8c8b0', eye: '#ffb04a', earIn: '#4a1a10',
  glow: '#ff7a3a', coal: '#1a1616', coalTop: '#4a4040', worldH: 5.8
};
MON3_BUILD.ursus = (b) => bsBear3(b, 'ursus', BS_URSUS3);
MON3_BUILD.brakkur = (b) => bsBear3(b, 'brakkur', BS_BRAKKUR3);
const BS_BEAR_BOSS3 = { kind: 'quad', melee: ['claw', 'bite', 'maul'], blob: 1.7, dome: 1.45, pts: BS_BEAR_PTS3, deathPts: ['core', 'mouth', 'back'], skyAt: 'sky', gait: 0.8 };
BOSS3.ursus = Object.assign({}, BS_BEAR_BOSS3, {
  fx: 'wald', emi: [0.04, 0.07, 0.02],
  // Sporen und Blätter rieseln vom Rücken
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.ursus, 'back', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 0.4 + i / 5) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.3 + v * 3) * 1.2, _b3P.y + 0.5 + v * 1.4, _b3P.z + Math.cos(i * 1.9) * 1.2, 0.16, 'spark', th.mid, 0.8 * Math.sin(Math.PI * v));
    }
  }
});
BOSS3.brakkur = Object.assign({}, BS_BEAR_BOSS3, {
  fx: 'glut', emi: [0.12, 0.04, 0.01],
  // Rauch und Glut steigen von den Kohlekristallen auf, Glut tropft aus dem Maul
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.brakkur, 'back', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 0.45 + i / 5) % 1;
      const ox = Math.sin(i * 2.3) * 0.7, oz = Math.cos(i * 1.7) * 1.0;
      bsSmoke3(h, _b3P.x + ox, _b3P.y + v * 2.2, _b3P.z + oz, 0.6 + v * 1.4, '#2a2220', 0.4 * Math.sin(Math.PI * v));
      bsSprite3(h, _b3P.x + ox * 0.7, _b3P.y + v * 1.6, _b3P.z + oz * 0.7, 0.2, 'flame', th.mid, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.brakkur, 'mouth', _b3P);
    const v = (t * 1.2) % 1;
    bsSprite3(h, _b3P.x, _b3P.y - v * 1.2, _b3P.z, 0.15, 'spark', th.core, 0.9 * (1 - v));
  }
});
