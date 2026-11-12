// Bosse in 3D, Paket 2 (seit 14.81; Baukasten und Animation in bosse3d.js, Paket 1 in bosse3d-modelle.js):
// Weltendrache Ignar (Karte 9), Abaddor (Höllenthron), die Wächter des Höllenthrons, die Endbosse der Lv-60- und
// Lv-80-Instanzen und die Kristallseherin Vaelith (Kristallkaverne). Je Boss ein eigener Bauplan passend zu seinem
// Wesen, oder eine eigene Abwandlung eines Bauplans mit eigenen Farben, eigenem Kopf, Zubehör und eigener Waffe.
// Alle Maße im Modell; worldH bestimmt die Grundgröße, der Kampfkreis (Treffer, Reichweiten) bleibt unverändert.

// ============================================================================================================
// Drachen: Weltendrache Ignar (Karte 9) und Aschenkaiser Vulkhar (Aschenzitadelle)
// Vierbeiniger Drache mit tiefer Brust, langem Hals aus drei Gliedern, kantigem Kopf mit aufklappbarem Kiefer, langem
// Schwanz und echten Flügeln (Arm, Unterarm, vier Finger, doppelseitige Flughaut, falten sich an den Leib). Ignar:
// schwarzrote Schuppen mit Magmaadern, Hornkrone aus sechs Hörnern, glühendes Magmamaul, Obsidianstacheln mit Glutkern,
// Flughaut mit glühenden Adern, Schwanzkeule aus Obsidian. Vulkhar: aschgrau mit Rußschuppen und schwachen Glutrissen,
// nach vorn geschwungene Hörner, Kamm aus Basaltplatten, zerfetzte Flughaut, Rauch steigt aus den Rissen.
// ============================================================================================================
const BS_DRAKE_J3 = {
  body: [0, 1.05, -0.55], chest: [0, 1.15, 0.45], neck: [0, 1.35, 0.95], neck2: [0, 1.75, 1.3], neck3: [0, 2.12, 1.5],
  head: [0, 2.42, 1.64], jaw: [0, 2.36, 1.78],
  tail: [[0, 1.02, -1.25], [0, 0.82, -2.0], [0.1, 0.55, -2.75]],
  fl: [[0.42, 1.0, 0.55], [0.5, 0.56, 0.45], [0.5, 0.14, 0.62], [0.5, 0.03, 0.84]],
  bl: [[0.45, 1.0, -0.6], [0.5, 0.62, -0.3], [0.5, 0.28, -0.82], [0.5, 0.03, -0.62]],
  ear: [0.15, 2.58, 1.52], wing: [0.3, 1.55, 0.35], wing2: [1.45, 2.3, 0.08]
};
const BS_DRAKE_PTS3 = {
  mouth: [BD3.jaw, [0, 2.36, 2.36]], emit: [BD3.head, [0, 2.42, 2.4]], core: [BD3.chest, [0, 1.2, 0.95]], back: [BD3.chest, [0, 1.9, 0.2]],
  sky: [BD3.head, [0, 3.0, 1.8]], weapon: [BQ3.pwFL, [0.5, 0.1, 0.8]], tail: [BD3.t3, [0.28, 0.3, -3.5]]
};
// Flügel eines Drachen: Arm (w1) von der Schulter zum Ellbogen, vier Finger am Unterarm (w2), Flughaut außen zwischen
// den Fingern, innen vom Arm zum Rumpf (weich gewichtet: Rumpf, Arm, Unterarm). torn: zerfetzter Hinterrand
function bsDrakeWing3(b, A, id, sx, J, C, o = {}) {
  const [b1, b2] = bsWingD3(sx);
  const W1 = [sx * J.wing[0], J.wing[1], J.wing[2]];
  const W2 = [sx * J.wing2[0], J.wing2[1], J.wing2[2]];
  const k = o.k || 1;
  const F = [[1.5, 0.55, -0.35], [1.75, -0.32, -0.8], [1.25, -0.95, -1.2], [0.5, -1.2, -1.4]].map((d) => [W2[0] + sx * d[0] * k, W2[1] + d[1] * k, W2[2] + d[2] * k]);
  const Bt = [sx * 0.36, 1.25, -0.85];
  A(tubeProfile3([W1, bsLerp3(W1, W2, 0.3), bsLerp3(W1, W2, 0.75), W2], [0.1, 0.06, 0.05, 0.065], 12, 8), C.wingBone, { bone: b1, top: C.wingTop, topK: 0.5 });
  A(ball(10), C.wingBone, { bone: b2, p: W2, s: 0.09, top: C.wingTop });
  bsSpike3(A, 0.32, 0.055, C.claw, W2, [sx * 0.25, 1, 0.35], { bone: b2, shine: 0.6 });
  F.forEach((T, i) => {
    A(tubeProfile3([W2, bsLerp3(W2, T, 0.5), T], [0.06, 0.042, 0.016], 10, 6), C.wingBone, { bone: b2, top: C.wingTop, topK: 0.5, noShadow: true });
    if (i < 3) bsSpike3(A, 0.16, 0.026, C.claw, T, [T[0] - W2[0], T[1] - W2[1], T[2] - W2[2]], { bone: b2, shine: 0.6 });
  });
  const torn = (u, v) => (o.torn && v > 0.72 ? 0.16 * Math.abs(Math.sin(u * 23 + v * 3)) * (v - 0.72) / 0.28 : 0);
  const mem = (u, v, s) => (s > 0 ? mixColor(C.mem, C.memEdge, v * v) : mixColor(C.memB, C.memEdge, v * v * 0.7));
  for (let i = 0; i < 3; i++) {
    bsSheetAdd3(b, A, bsSheet3(id + 'dfl' + sx + i, 7, 6, (u, v) => {
      const e = bsLerp3(F[i], F[i + 1], u);
      const rho = v * (1 - 0.22 * Math.sin(Math.PI * u) - torn(u + i, v));
      return bsLerp3(W2, e, rho);
    }, () => [[b2, 1]], mem, 0.01), i === 1);
  }
  bsSheetAdd3(b, A, bsSheet3(id + 'dfi' + sx, 8, 7, (u, v) => {
    const top = bsLerp3(W1, W2, u);
    const bot = bsLerp3(Bt, F[3], u);
    const sc = 0.16 * Math.sin(Math.PI * u) * v + torn(u * 2, v);
    return bsLerp3(top, bot, v * (1 - sc));
  }, (u, v) => [[BD3.body, (1 - u) * v * 0.9], [b1, (1 - u) * (1 - v * 0.9) + u * (1 - u) * 2], [b2, u * u]], mem, 0.01), true);
  // leuchtende Adern in der Haut (Ignar)
  if (C.vein) for (let i = 0; i < 3; i++) {
    const e = bsLerp3(F[i], F[i + 1], 0.5);
    A(tube3([W2, bsLerp3(W2, e, 0.45), bsLerp3(W2, e, 0.82)], 0.018, 0.006, 8, 4), C.vein, { bone: b2, mat: 'glow', noShadow: true });
  }
}
function bsDrake3(b, id, V) {
  const A = adder(b, null);
  const J = BS_DRAKE_J3, C = V;
  const rig = bsDrakeRig3(J);
  const hide = { top: C.hideTop, topK: 0.55, shade: 0.32, shadowExact: true };
  // --- Rumpf: tiefe Brust, schmalere Hüfte ---
  const rows = [[-1.35, 1.02, 0.18, 0.16, 0.16], [-1.0, 1.05, 0.36, 0.3, 0.32], [-0.55, 1.08, 0.46, 0.36, 0.42], [-0.1, 1.1, 0.48, 0.38, 0.46],
    [0.35, 1.15, 0.53, 0.43, 0.56], [0.75, 1.25, 0.47, 0.4, 0.5], [1.05, 1.36, 0.32, 0.3, 0.32], [1.2, 1.42, 0.2, 0.2, 0.2]];
  const bodyW = bsChain3([[BD3.body, [0, 1.05, -1.4]], [BD3.body, J.body], [BD3.chest, [0, 1.15, 0.25]], [BD3.neck, J.neck]]);
  A(bsSkin3(id + ':rumpf' + GEO3_LOD, loft3(rows, 18, 4), bodyW), C.hide, hide);
  // --- Hals: drei Glieder bis zum Kopf ---
  const npts = [[0, 1.32, 0.82], [0, 1.5, 1.1], [0, 1.75, 1.3], [0, 1.98, 1.42], [0, 2.15, 1.5], [0, 2.34, 1.6]];
  const neckW = bsChain3([[BD3.chest, [0, 1.25, 0.6]], [BD3.neck, J.neck], [BD3.neck2, J.neck2], [BD3.neck3, J.neck3], [BD3.head, J.head]]);
  A(bsSkin3(id + ':hals' + GEO3_LOD, tubeProfile3(npts, [0.38, 0.3, 0.25, 0.21, 0.19, 0.17], 22, 14), neckW), C.hide, hide);
  // --- Schwanz bis zur Spitze ---
  const tpts = [[0, 1.05, -1.1], [0, 1.0, -1.6], [0, 0.84, -2.0], [0.05, 0.7, -2.4], [0.1, 0.55, -2.75], [0.2, 0.4, -3.15], [0.28, 0.3, -3.5]];
  const tailW = bsChain3([[BD3.body, [0, 1.05, -0.9]], [BD3.t1, J.tail[0]], [BD3.t2, J.tail[1]], [BD3.t3, J.tail[2]], [BD3.t3, tpts[6]]]);
  A(bsSkin3(id + ':schwanz' + GEO3_LOD, tubeProfile3(tpts, [0.3, 0.25, 0.2, 0.16, 0.12, 0.08, 0.035], 26, 12), tailW), C.hide, hide);
  // Bauchplatten an Hals, Brust, Bauch und Schwanz (hell, quer geriffelt)
  // seit 14.82 V.lite (Wächter): jede zweite Bauchplatte, weniger Zähne und Schuppen (weniger Dreiecke)
  const lite = V.lite ? 2 : 1;
  const plate = (p, w, bn, pitch) => A(roundBox(+w.toFixed(3), 0.05, 0.13, 0.02), C.belly, { bone: bn, p, r: [pitch, 0, 0], top: C.bellyTop, topK: 0.5, shade: 0.2, noShadow: true });
  for (let i = 0; i < 9; i += lite) { const z = 1.0 - i * 0.24; plate([0, 1.15 - 0.42 * Math.sin(Math.PI * Math.min(1, (z + 1.3) / 2.5)) - 0.12, z], 0.36 - Math.abs(i - 3) * 0.02, z > 0.2 ? BD3.chest : BD3.body, 0.08); }
  for (let i = 0; i < 6; i += lite) { const q = bsLerp3(npts[i], npts[Math.min(5, i + 1)], 0.5); plate([0, q[1] - [0.33, 0.27, 0.23, 0.2, 0.18, 0.16][i] + 0.02, q[2] + 0.12], 0.26 - i * 0.025, aelBoneAt3(neckW, q), -0.7); }
  for (let i = 0; i < 6; i += lite) { const q = bsLerp3(tpts[i], tpts[i + 1], 0.5); plate([q[0], q[1] - [0.27, 0.22, 0.18, 0.14, 0.1, 0.06][i] + 0.02, q[2]], 0.2 - i * 0.025, aelBoneAt3(tailW, q), -0.2); }
  // Schulter- und Hüftpanzer: große Schuppen
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 4; k += lite) A(roundBox(0.24 - k * 0.03, 0.04, 0.2, 0.02), k % 2 ? C.scaleD : C.armor, { bone: k < 2 ? BD3.chest : BD3.body, p: [sx * (0.46 - k * 0.02), 1.38 - k * 0.02, 0.55 - k * 0.42], r: [0.1, 0, sx * 0.75], top: C.armorTop, topK: 0.5, shine: 0.6, noShadow: true });
  }
  // --- Rückenstacheln vom Nacken bis zur Schwanzspitze ---
  const spineCurve = new THREE.CatmullRomCurve3([...npts.slice().reverse(), [0, 1.42, 0.6], [0, 1.45, 0.0], [0, 1.4, -0.6], ...tpts].map((q) => new THREE.Vector3(...q)));
  const radiusAt = (u) => (u < 0.3 ? 0.18 + u * 0.7 : u < 0.55 ? 0.38 : Math.max(0.04, 0.38 - (u - 0.55) * 0.75));
  const sp = new THREE.Vector3(), tg = new THREE.Vector3();
  const bones = (p) => (p[2] > 0.8 && p[1] > 1.4 ? aelBoneAt3(neckW, p) : p[2] < -1.0 ? aelBoneAt3(tailW, p) : aelBoneAt3(bodyW, p));
  // seit 14.82 (bosse3d-modelle3.js): V.spineN (weniger Stacheln), V.spines 'crystal', V.horns 'ram', 'crystal', 'nubs',
  // V.tailEnd 'crystal', V.eggs (Eier auf dem Rücken)
  const nS = V.spineN || 26;
  for (let i = 0; i < nS; i++) {
    const u = 0.04 + (i / (nS - 1)) * 0.92;
    spineCurve.getPointAt(u, sp);
    spineCurve.getTangentAt(u, tg);
    const r = radiusAt(u);
    const p = [sp.x, sp.y + r * 0.95, sp.z];
    const big = u > 0.22 && u < 0.62 ? 1 : 0.65;
    const len = (0.22 + 0.2 * Math.sin(Math.PI * Math.min(1, u * 1.4))) * big;
    const bn = bones(p);
    if (V.spines === 'crystal') {
      A(bsOcta3(), i % 2 ? C.armor : C.armorTop, { bone: bn, p: [p[0], p[1] + len * 0.3, p[2]], r: [-0.5, Math.atan2(-tg.x, -tg.z), 0], s: [0.05 * big + 0.02, len * 0.6, 0.05 * big + 0.02], shine: 1 });
      if (i % 2 === 0) A(bsOcta3(), C.lava, { bone: bn, p: [p[0], p[1] + len * 0.3, p[2]], r: [-0.5, Math.atan2(-tg.x, -tg.z), 0], s: [0.025, len * 0.45, 0.025], mat: 'glow', noShadow: true });
    } else if (V.plates) {
      // Basaltplatten (Vulkhar): flache, kantige Platten, dazwischen Glut
      A(bsBlade3('basalt', [[0, -0.12], [0.05, 0.08], [0.0, 0.26], [-0.08, 0.1], [-0.06, -0.12]], 0.035, 0.01), i % 2 ? C.armor : C.scaleD, { bone: bn, p, r: [0, Math.atan2(-tg.x, -tg.z), 0], s: [1, len * 3.2, 1], top: C.armorTop, topK: 0.5, shine: 0.5 });
      if (i % 3 === 1) A(box3(), C.lava, { bone: bn, p: [p[0], p[1] - 0.03, p[2]], s: [0.02, 0.05, 0.12], mat: 'glow', noShadow: true });
    } else {
      bsSpike3(A, len, 0.065 * big + 0.02, C.armor, p, [-tg.x * 0.9, 1, -tg.z * 0.9], { bone: bn, top: C.armorTop, shine: 0.8 });
      if (i % 2 === 0 && u < 0.85) bsSpike3(A, len * 0.55, 0.025, C.lava, [p[0], p[1] + 0.02, p[2] + 0.02], [-tg.x * 0.9, 1, -tg.z * 0.9], { bone: bn, mat: 'glow', noShadow: true });
    }
  }
  // Schwanzende: Keule aus Obsidianstacheln (Ignar) bzw. Basaltklinge (Vulkhar)
  const TT = tpts[6];
  if (V.tailEnd === 'crystal') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      A(bsOcta3(), k % 2 ? C.armor : C.armorTop, { bone: BD3.t3, p: [TT[0] + Math.cos(a) * 0.08, TT[1] + Math.sin(a) * 0.08, TT[2] - 0.1], r: [Math.PI / 2 + 0.4 * Math.sin(a), 0, -0.4 * Math.cos(a)], s: [0.05, 0.24, 0.05], shine: 1 });
    }
    bsGem3(A, C.lava, TT, [0.06, 0.06, 0.1], null, BD3.t3);
  } else if (V.plates) A(bsBlade3('vulkhar-klinge', [[0, 0], [0.18, 0.14], [0.42, 0.02], [0.18, -0.12]], 0.04, 0.012), C.armor, { bone: BD3.t3, p: TT, r: [0.2, Math.PI - 0.2, 0], shine: 0.8 });
  else {
    A(ball(10), C.armor, { bone: BD3.t3, p: TT, s: [0.12, 0.1, 0.16], shine: 0.8 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      bsSpike3(A, 0.22, 0.045, C.armor, TT, [Math.cos(a), Math.sin(a), -0.6], { bone: BD3.t3, shine: 0.9, top: C.armorTop });
    }
    bsGem3(A, C.lava, TT, [0.06, 0.06, 0.09], null, BD3.t3);
  }
  // Magmaadern (Ignar) bzw. Glutrisse (Vulkhar) an Flanken, Hals und Schultern
  const veins = [[0.42, 1.25, 0.45, 0.6, 0.3, BD3.chest], [0.45, 1.1, 0.1, -0.4, 0.28, BD3.chest], [0.4, 1.0, -0.35, 0.9, 0.26, BD3.body], [0.38, 1.15, -0.75, -0.7, 0.22, BD3.body], [0.33, 1.3, 0.75, 0.2, 0.2, BD3.chest], [0.3, 0.92, -1.0, 0.5, 0.16, BD3.body]];
  for (const sx of [-1, 1]) for (const [x, y, z, r, l, bn] of veins) A(box3(), C.lava, { bone: bn, p: [sx * x, y, z], r: [r, 0, 0], s: [0.025, 0.02, l * (V.plates ? 0.6 : 1)], mat: 'glow', noShadow: true });
  for (let i = 1; i < 5; i++) { const q = npts[i]; for (const sx of [-1, 1]) A(box3(), C.lava, { bone: aelBoneAt3(neckW, q), p: [sx * ([0.3, 0.25, 0.21, 0.19, 0.17][i] - 0.005), q[1], q[2]], r: [0.4 * sx, 0, 0.3], s: [0.018, 0.12, 0.02], mat: 'glow', noShadow: true }); }
  // --- Beine: Schultern, Ellbogen, Pranken mit Krallen ---
  for (const [L, front] of [[J.fl, true], [J.bl, false]]) {
    for (const sx of [1, -1]) {
      const [ub, lb, pb] = bsLegQ3(front, sx);
      const Q = L.map((q) => [sx * q[0], q[1], q[2]]);
      const r = front ? [0.24, 0.18, 0.13, 0.11, 0.1] : [0.3, 0.24, 0.13, 0.11, 0.1];
      const pts = [Q[0], bsLerp3(Q[0], Q[1], 0.5), Q[1], bsLerp3(Q[1], Q[2], 0.5), Q[2]];
      A(bsSkin3(id + ':bein' + front + sx + GEO3_LOD, tubeProfile3(pts, r, 16, 12), bsChain3([[ub, Q[0]], [lb, Q[1]], [pb, Q[2]], [pb, Q[3]]])), C.hide, hide);
      A(ball(14), C.hide, { bone: ub, p: [Q[0][0] + sx * 0.03, Q[0][1] - 0.12, Q[0][2] + (front ? 0.05 : 0.02)], s: front ? [0.2, 0.3, 0.26] : [0.24, 0.34, 0.32], top: C.hideTop, topK: 0.6, shade: 0.3 });
      // Ellbogenstachel, Schuppen am Unterarm
      bsSpike3(A, 0.2, 0.04, C.armor, bsLerp3(Q[1], Q[2], 0.05), front ? [0, 0.2, -1] : [0, 0.5, 1], { bone: lb, shine: 0.8 });
      for (let k = 0; k < (V.lite ? 0 : 3); k++) A(roundBox(0.12, 0.03, 0.1, 0.012), C.scaleD, { bone: lb, p: bsAdd3(bsLerp3(Q[1], Q[2], 0.25 + k * 0.22), [sx * 0.09, 0, front ? 0.06 : -0.06]), r: [front ? 0.3 : -0.3, 0, sx * 1.2], noShadow: true });
      // Pranke: Ballen, vier Zehen mit großen Krallen
      const T = Q[3];
      A(tubeProfile3([Q[2], [T[0], 0.1, (Q[2][2] + T[2]) / 2], [T[0], 0.08, T[2]]], [0.11, 0.1, 0.1], 6, 8), C.hide, { bone: pb, top: C.hideTop, topK: 0.5 });
      for (let k = 0; k < 4; k++) {
        const a = (k - 1.5) * 0.34;
        const p0 = [T[0] + Math.sin(a) * 0.1, 0.06, T[2] + Math.cos(a) * 0.08];
        A(ball(8), C.scaleD, { bone: pb, p: p0, s: [0.05, 0.045, 0.07], noShadow: true });
        bsSpike3(A, 0.16, 0.025, C.claw, [p0[0], 0.05, p0[2] + 0.05], [Math.sin(a) * 0.3, -0.45, 1], { bone: pb, seg: 5, shine: 0.7 });
      }
    }
  }
  // --- Kopf: Schädel, Schnauze, Brauenwulst, Augen, Nüstern, Zähne, Kiefer mit Glut ---
  const hb = BD3.head, jb = BD3.jaw;
  A(ball(16), C.hide, { bone: hb, p: [0, 2.5, 1.72], s: [0.2, 0.16, 0.24], top: C.hideTop, topK: 0.55, shade: 0.25 });
  A(loft3([[1.84, 2.47, 0.17, 0.12, 0.08], [2.04, 2.45, 0.145, 0.1, 0.06], [2.24, 2.43, 0.115, 0.08, 0.05], [2.38, 2.42, 0.075, 0.06, 0.04], [2.43, 2.42, 0.04, 0.035, 0.025]], 14, 3), C.hide, { bone: hb, top: C.hideTop, topK: 0.5, shade: 0.2 });
  A(loft3([[1.8, 2.34, 0.15, 0.04, 0.06], [2.04, 2.33, 0.13, 0.035, 0.05], [2.28, 2.33, 0.09, 0.03, 0.04], [2.38, 2.335, 0.05, 0.02, 0.025]], 12, 2), C.scaleD, { bone: jb, shade: 0.3 });
  A(loft3([[1.84, 2.375, 0.12, 0.015, 0.015], [2.25, 2.375, 0.07, 0.012, 0.012]], 8, 2), C.lava, { bone: jb, mat: 'glow', noShadow: true });
  A(loft3([[1.84, 2.395, 0.12, 0.012, 0.01], [2.25, 2.395, 0.075, 0.01, 0.01]], 8, 2), C.lavaHi, { bone: hb, mat: 'glow', noShadow: true });
  for (const sx of [-1, 1]) {
    // Brauenwulst, Augen (glühende Schlitze), Nüstern
    A(roundBox(0.13, 0.05, 0.26, 0.025), C.armor, { bone: hb, p: [sx * 0.12, 2.6, 1.9], r: [0.2, sx * 0.25, sx * 0.35], top: C.armorTop, shine: 0.6 });
    A(ball(8), '#0c0606', { bone: hb, p: [sx * 0.13, 2.545, 1.97], s: [0.045, 0.028, 0.05], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.138, 2.545, 1.98], s: [0.03, 0.014, 0.042], r: [0, sx * 0.45, sx * 0.2], mat: 'glow' });
    A(ball(6), C.lava, { bone: hb, p: [sx * 0.045, 2.465, 2.4], s: [0.02, 0.014, 0.02], mat: 'glow', noShadow: true });
    // Zähne oben und unten, lange Fänge vorn
    for (let k = 6 - (V.lite ? 3 : 6); k < 6; k++) {
      const z = 1.92 + k * 0.08;
      const x = sx * (0.125 - k * 0.012);
      bsSpike3(A, k === 5 ? 0.11 : 0.05, 0.015, C.tooth, [x, 2.385, z], [0, -1, 0.15], { bone: hb, seg: 4 });
      bsSpike3(A, k === 4 ? 0.09 : 0.045, 0.014, C.tooth, [x * 0.92, 2.365, z - 0.03], [0, 1, 0.1], { bone: jb, seg: 4 });
    }
    // Wangen- und Kinnstacheln, Nackenschild (an den Ohrknochen)
    const eb = sx > 0 ? BQ3.earL : BQ3.earR;
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.22 - k * 0.04, 0.035, C.armor, [sx * (0.18 - k * 0.01), 2.45 - k * 0.06, 1.6 - k * 0.05], [sx * 0.8, -0.1 - k * 0.2, -0.8], { bone: eb, shine: 0.8 });
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.12, 0.025, C.armor, [sx * (0.08 + k * 0.02), 2.31, 1.88 + k * 0.1], [sx * 0.3, -1, -0.4], { bone: jb, shine: 0.8 });
    if (V.horns === 'ram') {
      A(tube3([[sx * 0.12, 2.62, 1.66], [sx * 0.28, 2.76, 1.5], [sx * 0.42, 2.66, 1.32], [sx * 0.44, 2.46, 1.38], [sx * 0.36, 2.4, 1.56], [sx * 0.3, 2.5, 1.66]], 0.075, 0.018, 26, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      for (let k = 0; k < 2; k++) bsSpike3(A, 0.12, 0.025, C.horn, [sx * (0.06 + k * 0.05), 2.63 - k * 0.02, 1.86 + k * 0.1], [sx * 0.2, 1, -0.2], { bone: hb, shine: 0.6 });
    } else if (V.horns === 'crystal') {
      for (let k = 0; k < 3; k++) A(bsOcta3(), k % 2 ? C.horn : C.hornTip, { bone: hb, p: [sx * (0.12 + k * 0.06), 2.72 - k * 0.03, 1.55 - k * 0.12], r: [-0.8, 0, -sx * (0.3 + k * 0.2)], s: [0.04, 0.22 - k * 0.04, 0.04], shine: 1 });
    } else if (V.horns === 'nubs') {
      for (let k = 0; k < 3; k++) bsSpike3(A, 0.14 - k * 0.03, 0.04, C.horn, [sx * (0.1 + k * 0.03), 2.62 - k * 0.02, 1.68 - k * 0.12], [sx * 0.3, 1, -0.6], { bone: hb, top: C.hornTip, shine: 0.6 });
    } else if (!V.plates) {
      // Hornkrone (Ignar): zwei große Hörner nach hinten-oben, dahinter vier kleinere im Bogen
      const hp = [[sx * 0.12, 2.64, 1.74], [sx * 0.22, 2.78, 1.5], [sx * 0.3, 2.86, 1.24], [sx * 0.34, 3.0, 1.02]];
      A(tube3(hp, 0.075, 0.008, 22, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.7 });
      for (let k = 0; k < 2; k++) A(tube3([[sx * (0.08 + k * 0.08), 2.62, 1.6 - k * 0.06], [sx * (0.14 + k * 0.12), 2.76 - k * 0.04, 1.45 - k * 0.06], [sx * (0.2 + k * 0.17), 2.82 - k * 0.08, 1.3 - k * 0.04]], 0.04, 0.006, 12, 7), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.7 });
      A(ball(6), C.lavaHi, { bone: hb, p: hp[3], s: 0.03, mat: 'glow', noShadow: true });
    } else {
      // nach vorn geschwungene Hörner (Vulkhar)
      A(tube3([[sx * 0.12, 2.62, 1.68], [sx * 0.3, 2.72, 1.55], [sx * 0.42, 2.66, 1.72], [sx * 0.4, 2.56, 1.9], [sx * 0.33, 2.58, 2.02]], 0.07, 0.01, 24, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      for (let k = 0; k < 3; k++) bsSpike3(A, 0.1, 0.022, C.horn, [sx * (0.05 + k * 0.03), 2.62 - k * 0.01, 1.84 + k * 0.12], [sx * 0.2, 1, -0.3], { bone: hb, shine: 0.6 });
    }
  }
  if (V.plates) {
    // Kamm aus Basaltplatten vom Hinterkopf
    for (let k = 0; k < 4; k++) A(bsBlade3('basalt', [[0, -0.12], [0.05, 0.08], [0.0, 0.26], [-0.08, 0.1], [-0.06, -0.12]], 0.035, 0.01), C.armor, { bone: hb, p: [0, 2.62 - k * 0.04, 1.62 - k * 0.12], r: [-0.5, Math.PI, 0], s: [1, 1.3 - k * 0.15, 1], top: C.armorTop, shine: 0.5 });
  }
  if (V.eggs) {
    // Brutmutter: glühende Eier in einem Nest aus Schuppen auf dem Rücken
    for (const [x, y, z, sc] of [[0.12, 1.58, -0.2, 0.14], [-0.14, 1.56, -0.3, 0.13], [0.02, 1.6, -0.48, 0.15], [0.16, 1.52, -0.62, 0.12], [-0.12, 1.53, -0.72, 0.12]]) {
      A(ball(12), C.egg, { bone: BD3.body, p: [x, y, z], s: [sc * 0.8, sc, sc * 0.8], r: [0.3, 0, x * 2], top: C.eggTop, topK: 0.5, shine: 0.6 });
      A(box3(), C.lava, { bone: BD3.body, p: [x + sc * 0.4, y + sc * 0.2, z + sc * 0.3], r: [0.3, 0.6, 0.8], s: [0.012, sc * 0.9, 0.012], mat: 'glow', noShadow: true });
    }
  }
  // --- Flügel ---
  for (const sx of [1, -1]) bsDrakeWing3(b, A, id, sx, J, C, { k: V.wingK || 1, torn: !!V.torn });
  return bsRes3(id, rig, J, 2.95, V.worldH);
}
const BS_IGNAR3 = {
  hide: '#260a0a', hideTop: '#4a1612', scaleD: '#140606', belly: '#5a2e1c', bellyTop: '#8a5230', armor: '#120a0c', armorTop: '#3a262a',
  horn: '#1e1412', hornTip: '#8a5a3a', claw: '#d8c8b0', tooth: '#f0e4cc', eye: '#ffe36a', lava: '#ff6a1a', lavaHi: '#ffd36a',
  wingBone: '#1e0a0a', wingTop: '#4a1612', mem: '#2a0808', memB: '#4a120c', memEdge: '#7a2410', vein: '#ff7a2a', wingK: 1.1, worldH: 8.6
};
const BS_VULKHAR3 = {
  hide: '#3a3634', hideTop: '#6a6260', scaleD: '#1e1a1a', belly: '#5a4a40', bellyTop: '#8a7a6a', armor: '#24201e', armorTop: '#5a524e',
  horn: '#2a2422', hornTip: '#8a7a6a', claw: '#c8bca8', tooth: '#e0d8c4', eye: '#ff8a3a', lava: '#ff5a2a', lavaHi: '#ffb06a',
  wingBone: '#2a2422', wingTop: '#5a504a', mem: '#2e2826', memB: '#423834', memEdge: '#5a3a2a', plates: true, torn: true, wingK: 1.0, worldH: 5.4
};
MON3_BUILD.ignar = (b) => bsDrake3(b, 'ignar', BS_IGNAR3);
MON3_BUILD.vulkhar = (b) => bsDrake3(b, 'vulkhar', BS_VULKHAR3);
const BS_DRAKE_BOSS3 = { kind: 'drake', drake: true, melee: ['bite', 'claw', 'bite', 'maul', 'tail'], blob: 1.7, dome: 1.6, pts: BS_DRAKE_PTS3, deathPts: ['core', 'mouth', 'back', 'tail'], skyAt: 'sky', gait: 0.8, jawOpen: 0.7, tailUp: 0.05 };
BOSS3.ignar = Object.assign({}, BS_DRAKE_BOSS3, {
  fx: 'feuer', emi: [0.06, 0.02, 0.0],
  // Glut tropft aus dem Maul, Funken steigen aus den Magmaadern und der Schwanzkeule
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.ignar, 'mouth', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 1.1 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1) * 0.12, _b3P.y - v * 1.4, _b3P.z, 0.25 * (1 - v * 0.5), 'disc', i % 2 ? th.mid : th.core, 0.85 * (1 - v));
    }
    bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, 0.9, 'flame', th.mid, 0.35 + 0.15 * Math.sin(t * 7));
    for (const pn of ['back', 'tail']) {
      bsPtA3(a, BOSS3.ignar, pn, _b3P);
      for (let i = 0; i < 3; i++) {
        const v = (t * 0.7 + i / 3 + (pn === 'tail' ? 0.5 : 0)) % 1;
        bsSprite3(h, _b3P.x + Math.sin(i * 2.7 + t * 0.3) * 0.7, _b3P.y + v * 2.2, _b3P.z + Math.cos(i * 1.9) * 0.7, 0.2, 'spark', th.core, 0.9 * (1 - v));
      }
    }
  }
});
BOSS3.vulkhar = Object.assign({}, BS_DRAKE_BOSS3, {
  fx: 'glut', emi: [0.07, 0.03, 0.02],
  // Rauch steigt aus den Glutrissen, Asche rieselt
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.vulkhar, 'back', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 0.32 + i / 5) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.3) * 0.9, _b3P.y - 0.3 + v * 2.4, _b3P.z + Math.cos(i * 1.7) * 1.2, 0.7 + v * 1.4, '#2a2624', 0.35 * Math.sin(Math.PI * v));
      if (i % 2) bsSprite3(h, _b3P.x + Math.sin(i * 1.3) * 0.6, _b3P.y + v * 1.8, _b3P.z, 0.16, 'spark', th.mid, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.vulkhar, 'mouth', _b3P);
    const ph = (t * 0.4) % 1;
    if (ph < 0.5) bsSmoke3(h, _b3P.x, _b3P.y + ph * 0.5, _b3P.z + 0.1, 0.4 + ph * 1.2, '#3a302c', 0.3 * (1 - ph * 2));
  }
});

// ============================================================================================================
// Abaddor, der Höllenkaiser (Höllenthron): Teufel mit Dreizack – das Aussehen aus teufel.js (12.9) bleibt, gebaut
// jetzt auf dem Zweibeiner-Skelett der Endbosse (weich gewichteter Leib, Bocksbeine mit IK, Flügel aus Arm und Fingern
// mit doppelseitiger Flughaut statt der flachen Flügelplatte, Schwanz aus drei Gliedern), damit er wie Aelvyr atmet,
// läuft, zielt, brüllt, jeden Angriff mit eigener Pose zeigt und stirbt. Massiger roter Oberkörper mit Lavaadern und
// glühendem Höllenherz, Obsidian-Schulterpanzer mit Stacheln und Schädel, Klauenhände, Bocksbeine mit schwarzem Fell
// und gespaltenen Hufen, Lendenpanzer mit Schädelschnalle, kleiner Kopf mit spitzen Ohren, Kinnbart, glühenden
// Augenschlitzen, großen geschwungenen Hörnern, Flammenkrone und -mähne, Schwanz mit Spatenspitze, Dreizack aus
// Obsidian mit Goldbeschlag und drei glühenden Zinken. Zweite Form (v = 1): fast schwarze Haut mit hellen Glutrissen,
// sehniger, größere Flügel, lange glühende Klauen, brennende Zinken, etwas größer.
// ============================================================================================================
const BS_ABADDOR_J3 = {
  hipY: 1.12, hipX: 0.2, kneeY: 0.64, ankleY: 0.16, footL: 0.2, waistY: 1.38, chestY: 1.66, shY: 2.0, shX: 0.52, neckY: 2.08,
  headY: 2.16, headZ: 0.1, hunch: 0.1, upper: 0.48, fore: 0.45, hand: 0.17, armOut: 0.09, jaw: [-0.04, 0.05],
  tail: [[0, 1.06, -0.2], [0, 0.76, -0.62], [0, 0.46, -1.02]], wing: [0.18, 1.9, -0.22], cape: [[0, 1.98, -0.28], [0, 1.1, -0.35]]
};
const BS_ABADDOR_P3 = bsBipJ3(BS_ABADDOR_J3);
const BS_ABADDOR_G3 = bsLerp3(BS_ABADDOR_P3[-1].W, BS_ABADDOR_P3[-1].Hd, 0.5);
const BS_ABADDOR_PTS3 = {
  mouth: [BB3.jaw, [0, 2.2, 0.3]], core: [BB3.chest, [0, 1.78, 0.36]], back: [BB3.chest, [0, 1.95, -0.3]], tail: [BB3.t3, [0, 0.3, -1.3]],
  emit: [BB3.haR, [BS_ABADDOR_G3[0], BS_ABADDOR_G3[1], BS_ABADDOR_G3[2] + 1.55]], weapon: [BB3.haR, [BS_ABADDOR_G3[0], BS_ABADDOR_G3[1], BS_ABADDOR_G3[2] + 1.55]],
  sky: [BB3.haR, [BS_ABADDOR_G3[0], BS_ABADDOR_G3[1], BS_ABADDOR_G3[2] + 1.55]], crown: [BB3.head, [0, 2.48, 0.12]]
};
function bsAbaddor3(b, v) {
  const F = v === 1;
  const id = F ? 'abaddor2' : 'abaddor';
  const A = adder(b, null);
  const J = BS_ABADDOR_J3, P = BS_ABADDOR_P3;
  const T0 = F ? TEUFEL3F : TEUFEL3;
  const C = Object.assign({}, T0, {
    skinTop: F ? '#5a1418' : '#c8402f', claw: F ? '#120608' : '#2a1414', tooth: '#f4ecd8', bone: '#e8dcc0',
    wingBone: F ? '#1a0608' : '#3a0c10', wingTop: F ? '#4a1014' : '#6a1a1e', mem: T0.wing, memB: F ? '#3a080c' : '#5a1418', memEdge: F ? '#8a2410' : '#7a2418', vein: F ? '#ff6a1a' : T0.lava
  });
  const { rig } = bsBipRig3(J);
  const W = F ? 0.86 : 1;
  const rows = [[1.0, 0, 0.24 * W, 0.18, 0.19], [1.12, 0, 0.29 * W, 0.21, 0.2], [1.3, 0.03, 0.27 * W, 0.21, 0.17], [1.48, 0.06, 0.33 * W, 0.24, 0.19], [1.66, 0.08, 0.44 * W, 0.27, 0.22], [1.84, 0.09, 0.5 * W, 0.24, 0.23], [1.98, 0.09, 0.42 * W, 0.18, 0.2], [2.07, 0.1, 0.14, 0.1, 0.11], [2.14, 0.1, 0.09, 0.075, 0.075]];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.17 * W, 0.155 * W, 0.11, 0.12 * W, 0.085], leg: [0.2, 0.17, 0.11, 0.1, 0.075], legCol: C.fur, shade: 0.3 });
  const vein = (bn, p, r, l) => A(box3(), C.lava, { bone: bn, p, r: [0, 0, r], s: [0.02, l, 0.02], mat: 'glow', noShadow: true });
  // Brust- und Bauchmuskeln
  for (const sx of [-1, 1]) A(ball(14), C.skin, { bone: BB3.chest, p: [sx * 0.17 * W, 1.78, 0.27 * W], s: [0.19 * W, 0.13, 0.11], top: C.skinTop, topK: 0.5, shade: 0.3 });
  for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) A(roundBox(0.1, 0.075, 0.055, 0.024), k ? C.skin : C.skinL, { bone: BB3.spine, p: [sx * 0.06, 1.58 - k * 0.085, 0.25 * W - k * 0.006], shade: 0.3 });
  // Höllenherz: glühender Kristall im Brustbein, von Obsidianzacken gefasst
  bsGem3(A, C.lavaHi, [0, 1.8, 0.37 * W], [0.06, 0.095, 0.045], null, BB3.chest);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    bsSpike3(A, 0.08, 0.022, C.obs, [Math.cos(a) * 0.085, 1.8 + Math.sin(a) * 0.1, 0.34 * W], [Math.cos(a), Math.sin(a), 0.6], { bone: BB3.chest, shine: 0.9 });
  }
  const veins = [[-0.22, 1.86, 0.5, 0.17], [0.23, 1.83, -0.6, 0.19], [-0.13, 1.66, 0.2, 0.13], [0.14, 1.68, -0.3, 0.11], [0.05, 1.98, 1.2, 0.1]];
  if (F) veins.push([-0.06, 1.75, -0.9, 0.15], [0.08, 1.88, 0.9, 0.13], [-0.18, 1.7, 1.4, 0.1], [0.19, 1.95, -1.2, 0.1], [0, 1.6, 0.1, 0.15]);
  for (const [x, y, r, l] of veins) vein(y > 1.7 ? BB3.chest : BB3.spine, [x * W, y, (0.3 - Math.abs(x) * 0.3) * W + 0.02], r, l);
  for (let k = 0; k < 5; k++) bsSpike3(A, 0.15 - k * 0.012, 0.04, C.obs, [0, 2.0 - k * 0.1, -0.24 + k * 0.01], [0, 0.4, -1], { bone: k < 3 ? BB3.chest : BB3.spine, shine: 0.9 });
  // --- Lendenpanzer: Gürtel, Schädelschnalle, Stofflatz, Seitenplatten ---
  A(torus3(0.27, 0.04, Math.PI * 2, 5, 22), C.obs, { bone: BB3.pelvis, p: [0, 1.13, 0.01], r: [Math.PI / 2, 0, 0], s: [1.05, 0.85, 1.05], shine: 0.9 });
  A(torus3(0.28, 0.014, Math.PI * 2, 4, 22), C.gold, { bone: BB3.pelvis, p: [0, 1.165, 0.01], r: [Math.PI / 2, 0, 0], s: [1.05, 0.85, 1.05], shine: 1 });
  A(ball(10), C.bone, { bone: BB3.pelvis, p: [0, 1.13, 0.26], s: [0.065, 0.07, 0.055], shine: 0.3 });
  for (const sx of [-1, 1]) A(sphere3(0.015, 6, 4), C.lava, { bone: BB3.pelvis, p: [sx * 0.024, 1.14, 0.31], mat: 'glow' });
  for (const sz of [1, -1]) bsSheetAdd3(b, A, bsSheet3(id + 'latz' + sz, 4, 6, (u, w) => [(u - 0.5) * 0.24 * (1 - 0.15 * w), 1.1 - w * 0.5, sz * (0.21 + 0.05 * w)], () => [[BB3.pelvis, 1]], (u, w, s) => (w > 0.88 ? C.gold : s > 0 ? C.cloth : darker(C.cloth, 0.3))), false);
  for (const sx of [-1, 1]) A(cap3(0.17, Math.PI * 0.45, 0, Math.PI * 2, 10, 4), C.obs, { bone: BB3.pelvis, p: [sx * 0.24, 1.1, 0.0], s: [0.9, 1.1, 1.2], r: [0, 0, sx * 0.5], shine: 0.9, top: C.obsL, topK: 0.4 });
  // --- Bocksbeine: Fellschenkel, Sprunggelenk nach hinten, gespaltene Hufe ---
  for (const sx of [-1, 1]) {
    const [tb, sb, fb2] = bsLegB3(sx);
    const Q = P[sx];
    A(ball(14), C.fur, { bone: tb, p: [Q.H[0], J.hipY - 0.14, 0.02], s: [0.16, 0.24, 0.18], top: lighter(C.fur, 0.12), topK: 0.4, shade: 0.3 });
    A(ball(12), C.fur, { bone: sb, p: [Q.K[0], 0.4, -0.08], s: [0.09, 0.16, 0.1], top: lighter(C.fur, 0.1), shade: 0.3 });
    bsTufts3(A, [0, 1, 2, 3].map((k) => [[Q.K[0] + (k - 1.5) * 0.04, Q.K[1] - 0.02, -0.06], [(k - 1.5) * 0.2, -0.8, -0.6], 0.12, 0.045, sb]), C.fur, lighter(C.fur, 0.1));
    bsTufts3(A, [0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2;
      return [[Q.A[0] + Math.cos(a) * 0.06, 0.15, Math.sin(a) * 0.06 + 0.02], [Math.cos(a) * 0.4, -1, Math.sin(a) * 0.4], 0.09, 0.04, fb2];
    }), C.fur, lighter(C.fur, 0.1));
    for (const dx of [-0.032, 0.032]) A(roundBox(0.06, 0.09, 0.11, 0.02), C.hoof, { bone: fb2, p: [Q.A[0] + dx, 0.05, 0.07], shine: 0.9 });
    if (F) vein(tb, [Q.H[0] * 1.02, J.hipY - 0.25, 0.14], sx * 0.2, 0.14);
  }
  // --- Arme: Obsidianschienen, Schulterpanzer mit Stacheln (links ein Schädel), Klauenhände ---
  for (const sx of [-1, 1]) {
    const [ub, fb, hb2] = bsArmB3(sx);
    const S = P[sx].S;
    const D = [S[0] + sx * 0.05, S[1] + 0.06, S[2]];
    A(cap3(1, 1.25, 0, Math.PI * 2, 16, 7), C.obs, { bone: ub, p: D, r: [0, 0, sx * 0.5], s: [0.26, 0.19, 0.27], top: C.obsL, topK: 0.5, shine: 0.9 });
    A(torus3(1, 0.045, Math.PI * 2, 4, 20), C.gold, { bone: ub, p: bsAdd3(D, [sx * 0.03, -0.035, 0]), r: [Math.PI / 2, 0, sx * 0.5], s: [0.26, 0.27, 0.26], shine: 1 });
    for (const [dz, l] of [[-0.11, 0.24], [0, 0.34], [0.11, 0.24]]) bsSpike3(A, l, 0.05, C.obs, [D[0] + sx * 0.1, D[1] + 0.13, D[2] + dz], [sx * 0.7, 1, dz * 2], { bone: ub, shine: 0.9 });
    if (sx > 0) {
      A(ball(10), C.bone, { bone: ub, p: [D[0] + sx * 0.08, D[1] + 0.03, D[2] + 0.2], s: [0.07, 0.075, 0.065], shine: 0.3 });
      for (const ex of [-0.024, 0.024]) A(sphere3(0.017, 6, 4), C.lava, { bone: ub, p: [D[0] + sx * 0.08 + ex, D[1] + 0.04, D[2] + 0.26], mat: 'glow' });
    }
    A(box3(), C.lava, { bone: ub, p: bsAdd3(bsLerp3(S, P[sx].E, 0.5), [sx * 0.03, 0, 0.13 * W]), r: [0, 0, sx * 0.3], s: [0.016, 0.17, 0.016], mat: 'glow', noShadow: true });
    const m = bsLerp3(P[sx].E, P[sx].W, 0.6);
    A(cyl3(0.12 * W, 0.105 * W, 0.26, 12), C.obs, { bone: fb, p: m, top: C.obsL, shine: 0.9 });
    A(torus3(0.12 * W, 0.013, Math.PI * 2, 4, 14), C.gold, { bone: fb, p: bsAdd3(m, [0, 0.12, 0]), r: [Math.PI / 2, 0, 0], shine: 1 });
    for (const dz of [-0.04, 0.05]) bsSpike3(A, 0.13, 0.026, C.obs, [m[0] + sx * 0.1, m[1], m[2] + dz], [sx, 0.15, -0.3], { bone: fb, shine: 0.9 });
    bsHand3(A, sx, P, 0.105, C.skin, { top: C.skinTop, claw: F ? '#120608' : C.skinD });
    if (F) {
      // zweite Form: lange, glühende Klauen
      const c = bsLerp3(P[sx].W, P[sx].Hd, 0.45);
      for (let k = 0; k < 4; k++) bsSpike3(A, 0.24, 0.022, '#ff6a2a', [c[0] + sx * 0.03, c[1] - 0.16, c[2] + (k - 1.5) * 0.05 + 0.05], [0, -1, 0.7], { bone: hb2, mat: 'glow', noShadow: true });
    }
  }
  // --- Kopf: kantig, Kinnbart, Augenschlitze, spitze Ohren, Hörner, Flammenkrone und -mähne ---
  const hb = BB3.head, jb = BB3.jaw;
  const hc = [0, 2.28, 0.14];
  A(ball(16), C.skin, { bone: hb, p: hc, s: [0.13, 0.15, 0.13], top: C.skinTop, topK: 0.4, shade: 0.3 });
  for (const sx of [-1, 1]) A(ball(10), C.skin, { bone: hb, p: [sx * 0.075, hc[1] - 0.03, hc[2] + 0.07], s: [0.045, 0.035, 0.04], shade: 0.2 });
  A(roundBox(0.11, 0.07, 0.1, 0.03), C.skin, { bone: jb, p: [0, hc[1] - 0.1, hc[2] + 0.06], shade: 0.25 });
  for (const sx of [-1, 1]) A(roundBox(0.085, 0.025, 0.045, 0.01), C.skinD, { bone: hb, p: [sx * 0.045, hc[1] + 0.045, hc[2] + 0.11], r: [0, 0, sx * 0.4] });
  for (const sx of [-1, 1]) {
    A(ball(8), '#1a0606', { bone: hb, p: [sx * 0.046, hc[1] + 0.015, hc[2] + 0.105], s: [0.032, 0.018, 0.016], r: [0, 0, sx * 0.3], noShadow: true });
    A(box3(), C.eye, { bone: hb, p: [sx * 0.046, hc[1] + 0.016, hc[2] + 0.118], r: [0, 0, sx * 0.3], s: [0.044, 0.012, 0.008], mat: 'glow' });
  }
  A(roundBox(0.065, 0.014, 0.02, 0.005), '#1a0606', { bone: jb, p: [0, hc[1] - 0.07, hc[2] + 0.11] });
  A(ball(8), C.lava, { bone: jb, p: [0, hc[1] - 0.075, hc[2] + 0.1], s: [0.04, 0.012, 0.015], mat: 'glow', noShadow: true });
  for (const sx of [-1, 1]) bsSpike3(A, 0.035, 0.009, C.tooth, [sx * 0.022, hc[1] - 0.062, hc[2] + 0.115], [0, -1, 0], { bone: hb, seg: 4 });
  bsSpike3(A, 0.15, 0.036, '#140a0a', [0, hc[1] - 0.13, hc[2] + 0.09], [0, -1, 0.35], { bone: jb });
  for (const sx of [-1, 1]) {
    A(earGeo3(false), C.skin, { bone: hb, p: [sx * 0.1, hc[1] + 0.01, hc[2] - 0.01], r: [-0.4, sx * 0.9, -sx * 1.25], s: [0.05, 0.18, 0.04] });
    A(earGeo3(true), C.skinD, { bone: hb, p: [sx * 0.1, hc[1] + 0.01, hc[2] - 0.01], r: [-0.4, sx * 0.9, -sx * 1.25], s: [0.05, 0.18, 0.04] });
    const hp = [[sx * 0.06, hc[1] + 0.09, hc[2] + 0.05], [sx * 0.16, hc[1] + 0.23, hc[2]], [sx * 0.29, hc[1] + 0.32, hc[2] - 0.12], [sx * 0.4, hc[1] + 0.4, hc[2] - 0.08], [sx * 0.44, hc[1] + 0.55, hc[2] + 0.05]];
    A(tube3(hp, 0.055, 0.006, 26, 10), C.horn, { bone: hb, shine: 0.7, top: C.hornTip, topK: 0.35 });
    A(sphere3(F ? 0.035 : 0.014, 6, 4), C.lavaHi, { bone: hb, p: hp[4], mat: 'glow' });
  }
  for (let k = -2; k <= 2; k++) bsSpike3(A, (F ? 0.24 : 0.14) - Math.abs(k) * 0.025, 0.03, k % 2 ? C.lava : C.lavaHi, [k * 0.036, hc[1] + 0.12, hc[2] - 0.01 - Math.abs(k) * 0.01], [k * 0.18, 1, -0.15], { bone: hb, mat: 'glow', noShadow: true });
  for (let k = 0; k < 5; k++) bsSpike3(A, 0.22 - k * 0.02, 0.045, k % 2 ? C.lava : '#ff4a1a', [(k - 2) * 0.04, hc[1] + 0.05 - k * 0.03, hc[2] - 0.11], [(k - 2) * 0.25, 0.4, -1], { bone: hb, mat: 'glow', noShadow: true });
  // --- Flügel: riesige Fledermausflügel (zweite Form größer, mit brennenden Adern) ---
  for (const sx of [1, -1]) bsWing3(b, A, id, sx, J, C, { k: F ? 1.75 : 1.45 });
  // --- Schwanz mit Spatenspitze ---
  const tw = bsChain3([[BB3.pelvis, [0, 1.08, -0.05]], [BB3.t1, J.tail[0]], [BB3.t2, J.tail[1]], [BB3.t3, J.tail[2]], [BB3.t3, [0, 0.3, -1.35]]]);
  const tpts = [[0, 1.08, -0.12], [0, 1.0, -0.25], [0, 0.74, -0.64], [0, 0.44, -1.02], [0, 0.3, -1.33]];
  A(bsSkin3(id + ':schwanz' + GEO3_LOD, tubeProfile3(tpts, [0.085, 0.075, 0.055, 0.04, 0.022], 18, 8), tw), C.skin, { top: C.skinTop, shade: 0.25, shadowExact: true });
  A(bsBlade3('spaten', [[0, 0.0], [0.14, 0.1], [0.3, 0.0], [0.14, -0.1]], 0.025, 0.008), C.obs, { bone: BB3.t3, p: [0, 0.3, -1.33], r: [0.35, Math.PI, 0], shine: 0.9 });
  bsGem3(A, C.lava, [0, 0.31, -1.42], [0.04, 0.025, 0.06], null, BB3.t3);
  // --- Dreizack in der rechten Klaue: Obsidianschaft, Goldbänder, Gabel mit drei glühenden Zinken ---
  const G = BS_ABADDOR_G3, hbR = BB3.haR;
  const Z = (dz, dx = 0, dy = 0) => [G[0] + dx, G[1] + dy, G[2] + dz];
  A(cyl3(0.03, 0.033, 2.2, 10), C.obs, { bone: hbR, p: Z(0.2), r: [Math.PI / 2, 0, 0], shine: 0.8 });
  for (const z of [-0.05, 0.12, 1.12]) A(cyl3(0.042, 0.042, 0.045, 10), C.gold, { bone: hbR, p: Z(z), r: [Math.PI / 2, 0, 0], shine: 1 });
  bsSpike3(A, 0.18, 0.035, C.obs, Z(-0.88), [0, 0, -1], { bone: hbR, shine: 0.9 });
  A(roundBox(0.42, 0.06, 0.06, 0.02), C.obs, { bone: hbR, p: Z(1.3), shine: 0.9, top: C.obsL, topK: 0.4 });
  A(roundBox(0.44, 0.07, 0.014, 0.005), C.gold, { bone: hbR, p: Z(1.27), shine: 1 });
  bsGem3(A, C.lavaHi, Z(1.3, 0, 0.045), [0.045, 0.03, 0.06], null, hbR);
  bsSpike3(A, 0.52, 0.042, C.obs, Z(1.32), [0, 0, 1], { bone: hbR, shine: 0.9 });
  bsSpike3(A, 0.44, 0.016, C.lava, Z(1.34, 0, 0.03), [0, 0, 1], { bone: hbR, mat: 'glow', noShadow: true });
  for (const sx of [-1, 1]) {
    const pts = [Z(1.3, sx * 0.17), Z(1.4, sx * 0.25), Z(1.6, sx * 0.24), Z(1.76, sx * 0.19)];
    A(tube3(pts, 0.036, 0.005, 16, 7), C.obs, { bone: hbR, shine: 0.9 });
    A(tube3(pts.map(([x, y, z]) => [x, y + 0.028, z]), 0.013, 0.003, 16, 5), C.lava, { bone: hbR, mat: 'glow' });
    bsSpike3(A, 0.09, 0.02, C.obs, Z(1.52, sx * 0.24), [sx * 0.5, 0, -1], { bone: hbR, shine: 0.9 });
  }
  if (F) for (let k = 0; k < 3; k++) bsSpike3(A, 0.25, 0.05, k % 2 ? C.lava : '#ff3a1a', Z(1.72, (k - 1) * 0.19), [(k - 1) * 0.2, 0, 1], { bone: hbR, mat: 'glow', noShadow: true });
  const res = bsRes3('abaddor', rig, J, 2.85, F ? 9.0 : 8.2);
  res.form2 = F;
  return res;
}
MON3_BUILD.abaddor = (b, v) => bsAbaddor3(b, v === 1 ? 1 : 0);

// ============================================================================================================
// Herrinnen (schwebende Zauberinnen im langen Gewand): Frostkönigin Hjelda (Gletschergruft), Aelthys, Herrin der Spiegel
// (Spiegelgruft), Kristallseherin Vaelith (Kristallkaverne) und Lilith, Hexe der Asche (Höllenthron)
// Schlanker Frauenkörper, Gewand bis zum Boden (schwebt knapp darüber), Ärmel, Gesicht mit leuchtenden Augen, langes
// Haar, Umhang (doppelseitig). Hjelda: eisblaue Haut, weißes Haar, hohe Krone aus Eiszacken, Eiskristalle auf den
// Schultern, Eiskante am Saum, Frostmantel, Zepter mit Eiskristall. Aelthys: Gewand aus Spiegelglas, Krone aus
// Kristallsplittern, Schleier, Spiegelscheiben als Heiligenschein, Stab mit Spiegel. Vaelith: Kapuze, drittes Auge,
// Kristalle wachsen aus Schultern und Rücken, Kristallkugel in beiden Händen. Lilith: aschgraue Lumpen, glühende
// Risse, kleine Hörner, schwarzes Haar mit Glutspitzen, Räucherstab mit Glutschädel.
// ============================================================================================================
const BS_SORC_J3 = {
  hipY: 1.05, hipX: 0.13, kneeY: 0.58, ankleY: 0.12, footL: 0.18, waistY: 1.3, chestY: 1.52, shY: 1.8, shX: 0.3, neckY: 1.9,
  headY: 1.97, headZ: 0.05, hunch: 0.04, upper: 0.42, fore: 0.38, hand: 0.13, armOut: 0.07, jaw: [-0.04, 0.05],
  cape: [[0, 1.86, -0.2], [0, 0.9, -0.38]]
};
const BS_SORC_P3 = bsBipJ3(BS_SORC_J3);
const BS_SORC_G3 = bsLerp3(BS_SORC_P3[-1].W, BS_SORC_P3[-1].Hd, 0.5);
const BS_SORC_PTS3 = {
  mouth: [BB3.jaw, [0, 2.0, 0.18]], core: [BB3.chest, [0, 1.56, 0.22]], back: [BB3.chest, [0, 1.85, -0.2]], crown: [BB3.head, [0, 2.32, 0.05]],
  emit: [BB3.haR, [BS_SORC_G3[0], BS_SORC_G3[1], BS_SORC_G3[2] + 1.05]], weapon: [BB3.haR, [BS_SORC_G3[0], BS_SORC_G3[1], BS_SORC_G3[2] + 1.05]],
  sky: [BB3.haR, [BS_SORC_G3[0], BS_SORC_G3[1], BS_SORC_G3[2] + 1.05]], hand: [BB3.haL, BS_SORC_P3[1].Hd]
};
function bsSorc3(b, id, V) {
  const A = adder(b, null);
  const J = BS_SORC_J3, P = BS_SORC_P3, C = V;
  const { rig } = bsBipRig3(J);
  // Gewand vom Boden bis zur Brust (Taille eng, Saum weit), darauf der Oberkörper
  const rows = [[0.03, 0.0, 0.5, 0.42, 0.46], [0.25, 0, 0.43, 0.36, 0.39], [0.55, 0, 0.33, 0.27, 0.29], [0.85, 0, 0.24, 0.2, 0.21], [1.08, 0.01, 0.19, 0.15, 0.16], [1.28, 0.02, 0.15, 0.11, 0.11], [1.45, 0.03, 0.18, 0.15, 0.12], [1.6, 0.04, 0.21, 0.16, 0.12], [1.73, 0.04, 0.24, 0.12, 0.12], [1.84, 0.05, 0.16, 0.09, 0.09], [1.93, 0.05, 0.06, 0.05, 0.05]];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.075, 0.07, 0.05, 0.05, 0.04], noLegs: true, torsoCol: C.robe, skinTop: C.robeTop, armCol: C.skin, shade: 0.3 });
  // Brust und Hals in Hautfarbe (Ausschnitt), Mieder
  A(ball(12), C.skin, { bone: BB3.chest, p: [0, 1.81, 0.04], s: [0.12, 0.06, 0.07], top: C.skinTop, topK: 0.4, shade: 0.2 });
  for (const sx of [-1, 1]) A(ball(12), C.robe, { bone: BB3.chest, p: [sx * 0.075, 1.62, 0.12], s: [0.085, 0.08, 0.08], top: C.robeTop, topK: 0.5, shade: 0.25 });
  A(cyl3(0.06, 0.055, 0.12, 12), C.skin, { bone: BB3.neck, p: [0, 1.92, 0.05], shade: 0.2 });
  // Saum: Zacken in der Farbe des Themas (Eis, Spiegelglas, Kristall, Asche)
  const hem = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    hem.push([[Math.sin(a) * 0.47, 0.1, Math.cos(a) * 0.43], [Math.sin(a) * 0.35, -1, Math.cos(a) * 0.35], 0.14 + 0.07 * Math.sin(i * 2.9), 0.06, BB3.pelvis]);
  }
  // seit 14.82 V.wispHem: Saum löst sich in lange Nebelschwaden auf (Geister: Ilva, Ysolde)
  if (V.wispHem) for (const h of hem) { h[2] += 0.2; h[0] = [h[0][0] * 1.05, h[0][1] + 0.06, h[0][2] * 1.05]; }
  bsTufts3(A, hem, C.hem, C.hemTop);
  // Borte vorn und am Gürtel
  for (let k = 0; k < 8; k++) A(box3(), C.glow, { bone: k < 5 ? BB3.pelvis : BB3.spine, p: [0, 0.22 + k * 0.13, 0.42 - k * 0.04 - (k > 4 ? 0.05 : 0)], r: [-0.12, 0, k % 2 ? 0.6 : -0.6], s: [0.018, 0.06, 0.012], mat: 'glow', noShadow: true });
  A(torus3(0.17, 0.022, Math.PI * 2, 4, 18), C.trim, { bone: BB3.spine, p: [0, 1.28, 0.02], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1], shine: 0.9 });
  bsGem3(A, C.glow, [0, 1.28, 0.16], [0.03, 0.04, 0.02], null, BB3.spine);
  // Schultern: Eiszacken, Kristalle, Spiegelplatten oder Aschefetzen
  for (const sx of [-1, 1]) {
    const [ub] = bsArmB3(sx);
    const S = P[sx].S;
    if (V.shoulder === 'shard') {
      for (const [dx, dy, dz, len, r, ang] of [[0.03, 0.08, 0, 0.36, 0.05, 0.45], [0.09, 0.04, -0.08, 0.26, 0.04, 0.85], [-0.03, 0.06, -0.1, 0.3, 0.045, 0.2]]) {
        const p = [S[0] + sx * dx, S[1] + dy, S[2] + dz];
        A(bsOcta3(), C.gem, { bone: ub, p: [p[0] + sx * Math.sin(ang) * len * 0.4, p[1] + Math.cos(ang) * len * 0.4, p[2]], r: [0, 0, -sx * ang], s: [r, len * 0.5, r], top: C.gemTop, topK: 0.5, shine: 1 });
        A(bsOcta3(), C.glow, { bone: ub, p: [p[0] + sx * Math.sin(ang) * len * 0.4, p[1] + Math.cos(ang) * len * 0.4, p[2]], r: [0, 0, -sx * ang], s: [r * 0.5, len * 0.4, r * 0.5], mat: 'glow', noShadow: true });
      }
    } else if (V.shoulder === 'plate') {
      A(cap3(1, 1.2, 0, Math.PI * 2, 14, 5), C.trim, { bone: ub, p: [S[0] + sx * 0.03, S[1] + 0.04, S[2]], r: [0, 0, sx * 0.5], s: [0.14, 0.09, 0.14], shine: 1 });
      for (let k = 0; k < 3; k++) A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: ub, p: [S[0] + sx * (0.08 + k * 0.03), S[1] + 0.12 + k * 0.04, S[2] - 0.04 + k * 0.03], r: [0, 0, -sx * (0.4 + k * 0.2)], s: [0.035, 0.11, 0.02], shine: 1 });
    } else {
      bsTufts3(A, [0, 1, 2, 3].map((k) => [[S[0] + sx * 0.04, S[1] + 0.03, S[2] - 0.08 + k * 0.05], [sx * 0.8, -0.4, (k - 1.5) * 0.3], 0.16, 0.05, ub]), C.robe, C.robeTop);
    }
    // Ärmel: weit ab dem Ellbogen
    const [, fb, hbn] = bsArmB3(sx);
    const Q = P[sx];
    A(bsSkin3(id + ':aermel' + sx + GEO3_LOD, tubeProfile3([Q.S, bsLerp3(Q.S, Q.E, 0.5), Q.E, bsLerp3(Q.E, Q.W, 0.5)], [0.085, 0.085, 0.11, 0.17], 12, 12), bsChain3([[bsArmB3(sx)[0], Q.S], [fb, Q.E], [fb, Q.W]])), C.sleeve, { top: C.robeTop, shade: 0.3, shadowExact: true });
    A(torus3(0.16, 0.014, Math.PI * 2, 4, 14), C.trim, { bone: fb, p: bsLerp3(Q.E, Q.W, 0.52), r: [Math.PI / 2, 0, 0], shine: 1, noShadow: true });
    bsHand3(A, sx, P, 0.05, C.skin, { top: C.skinTop, claw: V.claw || null });
    void hbn;
  }
  // --- Kopf: Gesicht, Augen, Haar ---
  const hb = BB3.head, jb = BB3.jaw;
  const H0 = [0, 2.06, 0.07];
  A(ball(16), C.skin, { bone: hb, p: H0, s: [0.095, 0.115, 0.1], top: C.skinTop, topK: 0.4, shade: 0.2 });
  A(roundBox(0.09, 0.045, 0.08, 0.03), C.skin, { bone: jb, p: [0, 1.98, 0.1], r: [0.2, 0, 0], shade: 0.2 });
  A(ball(6), darker(C.skin, 0.35), { bone: jb, p: [0, 1.995, 0.165], s: [0.025, 0.007, 0.008], noShadow: true });
  for (const sx of [-1, 1]) {
    A(ball(8), '#0a0a10', { bone: hb, p: [sx * 0.04, 2.07, 0.155], s: [0.026, 0.015, 0.015], r: [0, 0, sx * 0.15], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.04, 2.07, 0.163], s: [0.02, 0.009, 0.01], r: [0, 0, sx * 0.15], mat: 'glow' });
    A(roundBox(0.05, 0.012, 0.02, 0.005), darker(C.hair, 0.1), { bone: hb, p: [sx * 0.042, 2.1, 0.155], r: [0, 0, -sx * 0.25], noShadow: true });
  }
  // seit 14.82: V.hag (Hexe Morgrah: Hakennase, Warzen, Kinn), V.mirrorFace (Ysolde: Spiegelscheibe statt Gesicht)
  if (V.hag) {
    A(tube3([[0, 2.08, 0.15], [0, 2.03, 0.22], [0, 1.98, 0.24]], 0.025, 0.006, 10, 6), C.skin, { bone: hb, top: C.skinTop });
    A(ball(8), C.skin, { bone: jb, p: [0, 1.95, 0.16], s: [0.035, 0.03, 0.03] });
    for (const [x, y, z] of [[0.05, 2.04, 0.16], [-0.04, 2.0, 0.17], [0.012, 2.0, 0.23]]) A(ball(6), darker(C.skin, 0.2), { bone: hb, p: [x, y, z], s: 0.008, noShadow: true });
  }
  if (V.mirrorFace) {
    A(cyl3(0.085, 0.085, 0.015, 18), C.mirror, { bone: hb, p: [0, 2.06, 0.16], r: [Math.PI / 2, 0, 0], shine: 1 });
    A(torus3(0.085, 0.01, Math.PI * 2, 3, 18), C.trim, { bone: hb, p: [0, 2.06, 0.168], shine: 1, noShadow: true });
    A(ball(8), C.glow, { bone: hb, p: [0, 2.06, 0.172], s: [0.05, 0.006, 0.004], mat: 'glow', noShadow: true });
  }
  if (V.hood) {
    // Kapuze (Vaelith): weit, vorn offen, mit Kristallrand; drittes Auge
    A(cap3(1, Math.PI * 0.62, 0, Math.PI * 2, 18, 8), C.robe, { bone: hb, p: [0, 2.08, 0.02], r: [-0.35, 0, 0], s: [0.15, 0.17, 0.16], top: C.robeTop, topK: 0.5, shade: 0.3 });
    A(tubeProfile3([[0, 1.92, -0.14], [0, 2.16, -0.13], [0, 2.26, 0.0]], [0.12, 0.13, 0.1], 8, 10), C.robe, { bone: hb, top: C.robeTop, shade: 0.3 });
    for (let k = 0; k < 7; k++) {
      const a = -1.2 + k * 0.4;
      A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: hb, p: [Math.sin(a) * 0.15, 2.08 + Math.cos(a) * 0.15, 0.13], r: [0, 0, -a], s: [0.018, 0.04, 0.012], shine: 1, noShadow: true });
    }
    bsGem3(A, C.glow, [0, 2.13, 0.165], [0.016, 0.024, 0.01], null, hb);
  } else {
    // langes Haar (Strähnen über den Rücken)
    for (let k = 0; k < 10; k++) {
      const a = (k / 9 - 0.5) * 2.6;
      const len = 0.55 + 0.1 * Math.sin(k * 1.7);
      A(tube3([[Math.sin(a) * 0.08, 2.17, 0.05 - Math.cos(a) * 0.06], [Math.sin(a) * 0.13, 2.08, -0.07 - Math.cos(a) * 0.04], [Math.sin(a) * 0.14, 1.85, -0.12], [Math.sin(a) * 0.12, 2.0 - len - 0.2, -0.16]], 0.03, 0.01, 12, 5), V.hairGlow && k % 3 === 0 ? C.hairGlow : C.hair, { bone: hb, shade: 0.2, noShadow: k % 2 === 1, mat: V.hairGlow && k % 3 === 0 ? 'glow' : 'lit' });
    }
    A(cap3(1, Math.PI * 0.5, 0, Math.PI * 2, 14, 5), C.hair, { bone: hb, p: [0, 2.08, 0.05], r: [-0.25, 0, 0], s: [0.105, 0.11, 0.11], shade: 0.2 });
  }
  if (V.crown === 'ice') {
    // hohe Krone aus Eiszacken, in der Mitte am höchsten
    A(torus3(0.1, 0.014, Math.PI * 2, 4, 18), C.trim, { bone: hb, p: [0, 2.16, 0.06], r: [Math.PI / 2 - 0.2, 0, 0], shine: 1 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const front = Math.cos(a);
      const len = 0.1 + 0.2 * Math.max(0, front) + (k === 0 ? 0.08 : 0);
      A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: hb, p: [Math.sin(a) * 0.1, 2.18 + len * 0.45, 0.06 + Math.cos(a) * 0.1], r: [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25], s: [0.02, len * 0.5, 0.02], shine: 1 });
    }
    bsGem3(A, C.glow, [0, 2.2, 0.17], [0.018, 0.03, 0.012], null, hb);
  } else if (V.crown === 'crystal') {
    // Krone aus Kristallsplittern, Schleier
    for (let k = 0; k < 7; k++) {
      const a = ((k - 3) / 3) * 1.2;
      A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: hb, p: [Math.sin(a) * 0.11, 2.22 + (0.12 - Math.abs(k - 3) * 0.03), 0.05 + Math.cos(a) * 0.06], r: [0, 0, -a * 0.6], s: [0.022, 0.08 - Math.abs(k - 3) * 0.012, 0.015], shine: 1 });
    }
    bsSheetAdd3(b, A, bsSheet3(id + 'schleier', 6, 6, (u, v) => {
      const a = (u - 0.5) * 2.6;
      return [Math.sin(a) * (0.12 + v * 0.06), 2.17 - v * 0.42, Math.cos(a) * (0.1 + v * 0.06) - 0.04];
    }, () => [[BB3.head, 1]], (u, v, s) => mixColor(C.veil, C.robe, v * 0.6)), false);
  } else if (V.crown === 'aurora') {
    // Bögen aus Nordlicht über dem Kopf (drei Farben), Reif mit Steinen
    A(torus3(0.1, 0.014, Math.PI * 2, 4, 18), C.trim, { bone: hb, p: [0, 2.16, 0.06], r: [Math.PI / 2 - 0.2, 0, 0], shine: 1 });
    C.aurora.forEach((col, k) => A(torus3(0.17 + k * 0.06, 0.012, Math.PI * 0.9, 3, 18), col, { bone: hb, p: [0, 2.12 + k * 0.02, 0.0 - k * 0.03], r: [0.25, 0, Math.PI * 0.05], mat: 'glow', noShadow: true }));
    for (let k = 0; k < 3; k++) bsGem3(A, C.aurora[k], [(k - 1) * 0.07, 2.19, 0.13 - Math.abs(k - 1) * 0.03], [0.014, 0.022, 0.01], null, hb);
  } else if (V.crown === 'horns') {
    for (const sx of [-1, 1]) A(tube3([[sx * 0.06, 2.15, 0.08], [sx * 0.1, 2.24, 0.02], [sx * 0.12, 2.28, -0.08]], 0.025, 0.004, 10, 6), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
  }
  if (V.halo) {
    // Spiegelscheiben im Halbkreis hinter Kopf und Schultern
    for (let k = 0; k < 7; k++) {
      const a = (k / 6 - 0.5) * 2.4;
      const p = [Math.sin(a) * 0.42, 2.05 + Math.cos(a) * 0.32, -0.22];
      A(cyl3(0.07, 0.07, 0.012, 10), C.mirror, { bone: BB3.chest, p, r: [Math.PI / 2, 0, 0], shine: 1, noShadow: true });
      A(torus3(0.07, 0.008, Math.PI * 2, 3, 12), C.trim, { bone: BB3.chest, p, r: [0, 0, 0], shine: 1, noShadow: true });
      bsGem3(A, C.glow, [p[0], p[1], p[2] + 0.01], [0.02, 0.02, 0.008], null, BB3.chest);
    }
  }
  if (V.backShards) {
    // Kristalle wachsen aus dem Rücken
    for (const [x, y, z, len, ang] of [[0.1, 1.85, -0.16, 0.45, -0.3], [-0.12, 1.8, -0.15, 0.38, 0.35], [0.0, 1.7, -0.18, 0.5, 0.0], [0.18, 1.65, -0.12, 0.3, -0.7], [-0.18, 1.62, -0.12, 0.28, 0.7]]) {
      A(bsOcta3(), C.gem, { bone: BB3.chest, p: [x, y + len * 0.35, z - 0.08], r: [-0.5, 0, ang], s: [0.05, len * 0.5, 0.05], top: C.gemTop, topK: 0.5, shine: 1 });
      A(bsOcta3(), C.glow, { bone: BB3.chest, p: [x, y + len * 0.35, z - 0.08], r: [-0.5, 0, ang], s: [0.025, len * 0.4, 0.025], mat: 'glow', noShadow: true });
    }
  }
  if (V.cracks) {
    // glühende Risse in der Haut und den Lumpen (Lilith)
    for (const [x, y, z, r, l, bn] of [[0.07, 1.7, 0.14, 0.5, 0.08, BB3.chest], [-0.06, 1.55, 0.15, -0.6, 0.09, BB3.chest], [0.12, 0.6, 0.27, 0.3, 0.2, BB3.pelvis], [-0.15, 0.4, 0.33, -0.4, 0.22, BB3.pelvis], [0.2, 0.9, 0.12, 0.8, 0.16, BB3.pelvis]]) A(box3(), C.glow, { bone: bn, p: [x, y, z], r: [0, 0, r], s: [0.014, l, 0.014], mat: 'glow', noShadow: true });
  }
  // --- Umhang (doppelseitig, am Umhang-Knochen) ---
  if (V.mantle) bsSheetAdd3(b, A, bsSheet3(id + 'umhang', 8, 10, (u, v) => {
    const a = (u - 0.5) * 2.2;
    const R = 0.24 + v * 0.3;
    const cut = V.torn && v > 0.7 ? 0.14 * Math.abs(Math.sin(u * 21)) : 0;
    return [Math.sin(a) * R, 1.85 - Math.min(v, 1 - cut) * 1.78, 0.0 - Math.cos(a) * R * 0.8 - 0.1];
  }, (u, v) => [[BB3.chest, Math.max(0, 1 - v * 3)], [BB3.c1, Math.min(1, v * 3) * (1 - v)], [BB3.c2, Math.min(1, v * 3) * v]], (u, v, s) => (s > 0 ? mixColor(C.cape, C.capeEdge, v * v) : mixColor(C.capeIn || darker(C.cape, 0.25), C.capeEdge, v * v * 0.5)), 0.01), true);
  // --- Waffe in der rechten Hand ---
  const G = BS_SORC_G3, hbR = BB3.haR;
  if (V.weapon === 'orb') {
    // Kristallkugel zwischen den Händen (rechte Hand trägt sie, die linke greift im Grundstand darunter)
    const O = [G[0] + 0.12, G[1] + 0.02, G[2] + 0.12];
    A(ball(14), C.gem, { bone: hbR, p: O, s: 0.11, shine: 1, top: C.gemTop, topK: 0.5 });
    A(ball(10), C.glow, { bone: hbR, p: O, s: 0.07, mat: 'glow', noShadow: true });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      bsSpike3(A, 0.08, 0.016, C.trim, [O[0] + Math.cos(a) * 0.06, O[1] - 0.09, O[2] + Math.sin(a) * 0.06], [Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4], { bone: hbR, shine: 1 });
    }
  } else {
    // Stab / Zepter: Schaft, Kopf je Herrin
    A(tube3([[G[0], G[1], G[2] - 0.85], [G[0] + 0.01, G[1], G[2] - 0.2], [G[0] - 0.01, G[1], G[2] + 0.5], [G[0], G[1], G[2] + 0.9]], 0.026, 0.022, 16, 6), C.staff, { bone: hbR, top: C.staffTop, shine: 0.6 });
    const T = [G[0], G[1], G[2] + 1.05];
    if (V.weapon === 'mirror') {
      A(torus3(0.16, 0.022, Math.PI * 2, 4, 20), C.trim, { bone: hbR, p: T, r: [0, Math.PI / 2, 0], shine: 1 });
      A(cyl3(0.15, 0.15, 0.015, 18), C.mirror, { bone: hbR, p: T, r: [0, 0, Math.PI / 2], shine: 1 });
      bsGem3(A, C.glow, T, [0.03, 0.05, 0.05], null, hbR);
      for (const sy of [-1, 1]) A(bsOcta3(), C.gem, { bone: hbR, p: [T[0], T[1] + sy * 0.2, T[2]], s: [0.02, 0.06, 0.02], shine: 1 });
    } else if (V.weapon === 'crook') {
      // knorriger Hakenstab, daran ein Glimmkürbis an Schnur
      A(tube3([[T[0], T[1], T[2] - 0.2], [T[0] + 0.03, T[1] + 0.1, T[2]], [T[0], T[1] + 0.22, T[2] - 0.05], [T[0] - 0.02, T[1] + 0.16, T[2] - 0.14]], 0.024, 0.012, 12, 6), C.staff, { bone: hbR, top: C.staffTop });
      A(tube3([[T[0] - 0.02, T[1] + 0.16, T[2] - 0.14], [T[0] - 0.02, T[1] + 0.02, T[2] - 0.14]], 0.004, 0.004, 4, 3), C.staffTop, { bone: hbR, noShadow: true });
      A(ball(10), C.gem, { bone: hbR, p: [T[0] - 0.02, T[1] - 0.04, T[2] - 0.14], s: [0.06, 0.07, 0.06], top: C.gemTop, shine: 0.5 });
      A(ball(8), C.glow, { bone: hbR, p: [T[0] - 0.02, T[1] - 0.04, T[2] - 0.08], s: [0.03, 0.035, 0.02], mat: 'glow', noShadow: true });
    } else if (V.weapon === 'censer') {
      // Räucherstab: Glutschädel an einer Kette
      A(ball(10), C.bone, { bone: hbR, p: [T[0], T[1] - 0.12, T[2] - 0.05], s: [0.07, 0.065, 0.075], shine: 0.3 });
      for (const ex of [-1, 1]) A(ball(6), C.glow, { bone: hbR, p: [T[0] + ex * 0.025, T[1] - 0.115, T[2] + 0.015], s: [0.016, 0.018, 0.01], mat: 'glow' });
      A(ball(8), C.glow, { bone: hbR, p: [T[0], T[1] - 0.2, T[2] - 0.05], s: [0.04, 0.05, 0.04], mat: 'glow', noShadow: true });
      bsChainLinks3(A, [T[0], T[1] - 0.02, T[2] - 0.12], [T[0], T[1] - 0.08, T[2] - 0.06], 2, 0.014, C.staff, hbR);
      for (const sx of [-1, 1]) A(tube3([[T[0], T[1], T[2] - 0.15], [T[0] + sx * 0.08, T[1], T[2] - 0.02], [T[0] + sx * 0.05, T[1], T[2] + 0.1]], 0.016, 0.004, 8, 5), C.staff, { bone: hbR });
    } else {
      // Eiszepter: großer Eiskristall, von Zacken gefasst
      A(bsOcta3(), C.gem, { bone: hbR, p: T, s: [0.07, 0.07, 0.17], top: C.gemTop, topK: 0.5, shine: 1 });
      A(bsOcta3(), C.glow, { bone: hbR, p: T, s: [0.04, 0.04, 0.11], mat: 'glow', noShadow: true });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        bsSpike3(A, 0.14, 0.02, C.gem, [T[0] + Math.cos(a) * 0.05, T[1] + Math.sin(a) * 0.05, T[2] - 0.1], [Math.cos(a), Math.sin(a), 0.6], { bone: hbR, shine: 1, top: C.gemTop });
      }
    }
  }
  return bsRes3(id, rig, J, 2.35, V.worldH);
}
const BS_HJELDA3 = {
  skin: '#bcd8ec', skinTop: '#e4f2fc', eye: '#3a8aff', hair: '#eef6ff', robe: '#4a7aa8', robeTop: '#8ab8dc', sleeve: '#3a6a98', hem: '#cfeeff', hemTop: '#ffffff',
  glow: '#9fe8ff', trim: '#d8ecf8', gem: '#9fd8f4', gemTop: '#eaf8ff', cape: '#2a4e7a', capeEdge: '#cfeeff', capeIn: '#5a8ab8', staff: '#8ab0d0', staffTop: '#e8f4ff',
  crown: 'ice', shoulder: 'shard', mantle: true, weapon: 'scepter', worldH: 6.2
};
const BS_AELTHYS3 = {
  skin: '#d8d4f0', skinTop: '#f0eeff', eye: '#9fd8ff', hair: '#c8d0f8', robe: '#8a90d8', robeTop: '#c8d0ff', sleeve: '#7a80c8', hem: '#cfe4ff', hemTop: '#ffffff',
  glow: '#cfe4ff', trim: '#e8ecff', gem: '#a8b8f0', gemTop: '#f0f4ff', mirror: '#d8e8ff', veil: '#e8ecff', staff: '#6a70b0', staffTop: '#c8d0ff',
  crown: 'crystal', shoulder: 'plate', halo: true, weapon: 'mirror', worldH: 5.8
};
const BS_VAELITH3 = {
  skin: '#c8b8e8', skinTop: '#e8dcff', eye: '#d8c8ff', hair: '#2a1a4a', robe: '#3a2a6a', robeTop: '#6a5aa8', sleeve: '#2e2258', hem: '#8a7ac8', hemTop: '#cfc0ff',
  glow: '#cfc0ff', trim: '#b8a8ff', gem: '#9a8ae0', gemTop: '#e0d8ff', cape: '#24184a', capeEdge: '#8a7ac8', staff: '#2a2050', staffTop: '#6a5aa8',
  hood: true, shoulder: 'shard', backShards: true, mantle: true, weapon: 'orb', worldH: 4.6
};
const BS_LILITH3 = {
  skin: '#c8806a', skinTop: '#e8a88a', eye: '#ffb04a', hair: '#1a0a0a', hairGlow: '#ff6a1a', robe: '#3a2a26', robeTop: '#6a5048', sleeve: '#2e201c', hem: '#2a1e1a', hemTop: '#5a4038',
  glow: '#ff7a3a', trim: '#8a4a2a', gem: '#ff8a3a', gemTop: '#ffd08a', cape: '#2a1a16', capeEdge: '#8a2a10', staff: '#2a1a14', staffTop: '#5a3a2a', bone: '#d8ccb0', horn: '#2a1a14', hornTip: '#8a5a3a',
  claw: '#1a0a0a', crown: 'horns', cracks: true, mantle: true, torn: true, weapon: 'censer', worldH: 5.4
};
MON3_BUILD.hjelda = (b) => bsSorc3(b, 'hjelda', BS_HJELDA3);
MON3_BUILD.aelthys = (b) => bsSorc3(b, 'aelthys', BS_AELTHYS3);
MON3_BUILD.vaelith = (b) => bsSorc3(b, 'vaelith', BS_VAELITH3);
MON3_BUILD.lilith = (b) => bsSorc3(b, 'lilith', BS_LILITH3);
const BS_SORC_BOSS3 = {
  kind: 'biped', melee: ['chop', 'claw', 'sweep'], emit: 'weapon', cape: true, float: 0.3, blob: 1.1, dome: 1.35, pts: BS_SORC_PTS3, deathPts: ['core', 'mouth', 'back', 'weapon'],
  skyAt: 'sky', gait: 0.6, base: { aRx: -0.3, aRe: -1.15, aRz: 0.14, aLx: -0.35, aLe: -0.8, aLz: 0.3, lean: 0.0 }
};
// kreisende Splitter um eine Herrin (Eis, Spiegel, Kristall, Glut)
function bsOrbit3(h, a, e, t, th, def, n, R, kind) {
  bsPtA3(a, def, 'core', _b3P);
  for (let i = 0; i < n; i++) {
    const ang = t * 0.7 + (i / n) * Math.PI * 2;
    const y = _b3P.y - 0.4 + Math.sin(t * 1.2 + i * 1.7) * 0.5;
    const x = _b3P.x + Math.cos(ang) * R, z = _b3P.z + Math.sin(ang) * R;
    if (kind === 'shard') {
      const o = fx3Take(h, 'coneG');
      o.position.set(x, y, z);
      o.scale.set(0.12, 0.42, 0.12);
      o.rotation.set(t * 1.3 + i, ang, 0.4);
      o.material.color.set(i % 2 ? th.core : th.mid);
      o.material.opacity = 0.8;
    } else bsSprite3(h, x, y, z, kind === 'flame' ? 0.5 : 0.2, kind, i % 2 ? th.mid : th.core, 0.85);
    bsSprite3(h, x, y, z, 0.7, 'disc', th.mid, 0.2);
  }
}
BOSS3.hjelda = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'eis', emi: [0.04, 0.08, 0.12],
  // Eissplitter kreisen um sie, Frostnebel am Saum, Schnee rieselt aus der Krone
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsOrbit3(h, a, e, t, th, BOSS3.hjelda, 5, 1.6, 'shard');
    const x0 = e.x * U3, z0 = feetY(e) * U3;
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.3 + i / 4) % 1;
      bsSmoke3(h, x0 + Math.sin(i * 2.3) * 1.2, 0.2 + v * 0.6, z0 + Math.cos(i * 1.7) * 1.1, 0.9 + v, '#e8f6ff', 0.25 * Math.sin(Math.PI * v));
    }
    bsPtA3(a, BOSS3.hjelda, 'crown', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.6 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1) * 0.6, _b3P.y + 0.3 - v * 2.4, _b3P.z + Math.cos(i * 1.3) * 0.5, 0.14, 'spark', th.core, 0.8 * (1 - v));
    }
  }
});
BOSS3.aelthys = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'spiegel', emi: [0.06, 0.07, 0.12],
  // Spiegelsplitter kreisen, Lichtfunken am Stab
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsOrbit3(h, a, e, t, th, BOSS3.aelthys, 6, 1.5, 'shard');
    bsPtA3(a, BOSS3.aelthys, 'weapon', _b3P);
    bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, 0.9, 'disc', th.mid, 0.35 + 0.15 * Math.sin(t * 3));
  }
});
BOSS3.vaelith = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'kristall', melee: ['claw', 'chop', 'sweep'], emi: [0.06, 0.04, 0.12], base: { aRx: -0.75, aRe: -1.1, aRz: -0.1, aLx: -0.75, aLe: -1.1, aLz: -0.12, lean: 0.05 },
  // Kristallsplitter kreisen, die Kugel leuchtet
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsOrbit3(h, a, e, t, th, BOSS3.vaelith, 4, 1.2, 'shard');
    bsPtA3(a, BOSS3.vaelith, 'hand', _b3P);
    bsSprite3(h, _b3P.x, _b3P.y, _b3P.z, 0.8, 'disc', th.mid, 0.35 + 0.15 * Math.sin(t * 2.3));
  }
});
BOSS3.lilith = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'glut', emi: [0.08, 0.03, 0.01],
  // Glut kreist um sie, Rauch steigt aus dem Glutschädel
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsOrbit3(h, a, e, t, th, BOSS3.lilith, 5, 1.3, 'flame');
    bsPtA3(a, BOSS3.lilith, 'weapon', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.5 + i / 3) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2) * 0.2, _b3P.y - 0.4 + v * 1.4, _b3P.z, 0.4 + v, '#2a2220', 0.35 * (1 - v));
    }
  }
});
BOSS3.abaddor = {
  kind: 'biped', wings: true, tail: true, fx: 'feuer', emit: 'weapon', melee: ['thrust', 'sweep', 'claw', 'chop'], blob: 1.3, dome: 1.55,
  pts: BS_ABADDOR_PTS3, deathPts: ['core', 'mouth', 'back', 'tail', 'weapon'], skyAt: 'sky', emi: [0.1, 0.03, 0.01],
  base: { aRx: -0.4, aRe: -0.85, aRz: 0.16, aLz: 0.22, aLe: -0.5, wing: 0.3 },
  // Flammen an der Krone und den Zinken, Glut steigt auf (zweite Form ein Glutsturm), versiegelt: glühende Ketten
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    const F = !!a.model.form2;
    const D = BOSS3.abaddor;
    bsPtA3(a, D, 'weapon', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 1.5 + i / 4) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.7) * 0.2, _b3P.y + v * 0.9, _b3P.z + Math.cos(i * 1.9) * 0.2, 0.6 * (1 - v * 0.6), 'flame', i % 2 ? th.mid : th.core, 0.7 * (1 - v));
    }
    bsPtA3(a, D, 'crown', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 1.3 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1) * 0.15, _b3P.y + v * 0.7, _b3P.z, 0.55 * (1 - v * 0.5), 'flame', th.mid, 0.6 * (1 - v));
    }
    const x0 = e.x * U3, z0 = feetY(e) * U3;
    const n = F ? 10 : 5;
    for (let i = 0; i < n; i++) {
      const v = (t * (F ? 0.55 : 0.35) + i / n) % 1;
      const ang = i * 2.399 + t * (F ? 1.8 : 0.5);
      const rr = (F ? 2.2 : 1.6) + 0.8 * Math.sin(i * 1.3);
      bsSprite3(h, x0 + Math.cos(ang) * rr, 0.3 + v * (F ? 6 : 4.5), z0 + Math.sin(ang) * rr, 0.22 * (1 - v * 0.5), 'spark', i % 3 ? th.mid : th.core, 0.9 * (1 - v));
    }
    // versiegelt: vier glühende Ketten vom Boden zur Brust
    if (typeof htBossSealed === 'function' && htBossSealed(e)) {
      bsPtA3(a, D, 'core', _b3N);
      for (let c = 0; c < 4; c++) {
        const ang = (c / 4) * Math.PI * 2 + Math.PI / 4 + a.heading;
        _b3P2.set(x0 + Math.sin(ang) * 3.4, 0.05, z0 + Math.cos(ang) * 3.4);
        for (let l = 0; l < 9; l += 2) {
          _b3Ba.lerpVectors(_b3P2, _b3N, l / 9);
          _b3Bb.lerpVectors(_b3P2, _b3N, (l + 0.85) / 9);
          const s = fx3Take(h, 'seg');
          fx3Segment(s, _b3Ba, _b3Bb, 0.05);
          fx3Color(s, l % 4 ? '#ff5a1a' : '#ffb04a', 0.7 + 0.25 * Math.sin(t * 6 + l));
        }
      }
    }
  }
};

// ============================================================================================================
// Ritterfürsten: Winterfürst Kaldor (Feste des Nordlichts) und Nihilor, Fürst der Leere (Thron der Leere)
// Großer Ritter in schwerer Plattenrüstung: Brustpanzer mit Wappen, geschichtete Schulterplatten, Plattenschurz,
// Bein- und Armschienen, Stiefel; geschlossener Helm mit glühendem Sehschlitz und Krone, langer Umhang (doppelseitig),
// Zweihänder in der rechten Hand. Kaldor: frostblauer Stahl mit Reif, Eiskrone mit Nordlicht-Edelsteinen, Umhang im
// Farbverlauf des Nordlichts, Runenklinge aus Eis. Nihilor: schwarzviolette Rüstung mit Leerenrissen, Krone aus
// schwarzen Dornen, zerfetzter Umhang aus Nacht, gezackte Leerenklinge mit violettem Kern, Splitter schweben um ihn.
// ============================================================================================================
const BS_KNIGHT_J3 = {
  hipY: 1.1, hipX: 0.19, kneeY: 0.6, ankleY: 0.13, footL: 0.24, waistY: 1.36, chestY: 1.62, shY: 1.95, shX: 0.5, neckY: 2.04,
  headY: 2.12, headZ: 0.06, hunch: 0.05, upper: 0.48, fore: 0.45, hand: 0.17, armOut: 0.08, jaw: [-0.03, 0.05],
  cape: [[0, 1.98, -0.26], [0, 1.05, -0.38]]
};
const BS_KNIGHT_P3 = bsBipJ3(BS_KNIGHT_J3);
const BS_KNIGHT_G3 = bsLerp3(BS_KNIGHT_P3[-1].W, BS_KNIGHT_P3[-1].Hd, 0.5);
const BS_KNIGHT_PTS3 = {
  mouth: [BB3.head, [0, 2.22, 0.22]], core: [BB3.chest, [0, 1.7, 0.3]], back: [BB3.chest, [0, 1.95, -0.28]], crown: [BB3.head, [0, 2.48, 0.08]],
  emit: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.45]], weapon: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.45]],
  sky: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.45]]
};
function bsKnight3(b, id, V) {
  const A = adder(b, null);
  const J = BS_KNIGHT_J3, P = BS_KNIGHT_P3, C = V;
  const { rig } = bsBipRig3(J);
  const rows = [[0.98, 0, 0.24, 0.18, 0.19], [1.12, 0, 0.28, 0.2, 0.2], [1.3, 0.02, 0.26, 0.19, 0.17], [1.48, 0.04, 0.32, 0.23, 0.19], [1.66, 0.06, 0.42, 0.27, 0.22], [1.84, 0.07, 0.47, 0.24, 0.23], [1.97, 0.07, 0.38, 0.17, 0.19], [2.06, 0.08, 0.12, 0.09, 0.1], [2.13, 0.08, 0.08, 0.07, 0.07]];
  bsBipBody3(id, A, J, P, { C: Object.assign({}, C, { skin: C.plate, skinTop: C.plateTop }), rows, arm: [0.15, 0.13, 0.1, 0.1, 0.08], leg: [0.18, 0.15, 0.11, 0.1, 0.085], shade: 0.35, topK: 0.6 });
  const metal = { top: C.plateTop, topK: 0.6, shine: 1 };
  // Brustpanzer: gewölbte Platte, Mittelgrat, Wappen, Bauchreifen
  A(cap3(1, 1.25, 0, Math.PI * 2, 18, 8), C.plate, Object.assign({ bone: BB3.chest, p: [0, 1.74, 0.12], r: [Math.PI / 2 - 0.12, 0, 0], s: [0.4, 0.22, 0.3] }, metal));
  A(roundBox(0.035, 0.36, 0.05, 0.015), C.trim, { bone: BB3.chest, p: [0, 1.74, 0.33], r: [-0.12, 0, 0], shine: 1 });
  A(bsBlade3(id + '-wappen', [[0, 0.12], [0.1, 0.08], [0.09, -0.04], [0, -0.13], [-0.09, -0.04], [-0.1, 0.08]], 0.02, 0.006), C.trim, { bone: BB3.chest, p: [0, 1.8, 0.35], r: [0, Math.PI / 2, 0], shine: 1 });
  bsGem3(A, C.glow, [0, 1.8, 0.37], [0.03, 0.045, 0.02], null, BB3.chest);
  // Bauchreifen: drei gewölbte Platten vorn
  for (let k = 0; k < 3; k++) A(cap3(1, 0.9, 0, Math.PI * 2, 16, 4), k % 2 ? C.plateD : C.plate, Object.assign({ bone: BB3.spine, p: [0, 1.5 - k * 0.1, 0.02], r: [Math.PI / 2 - 0.05, 0, 0], s: [0.3 - k * 0.015, 0.2, 0.08] }, metal));
  // Gürtel und Plattenschurz (vorn, hinten, seitlich)
  A(torus3(0.26, 0.035, Math.PI * 2, 4, 22), C.trim, { bone: BB3.pelvis, p: [0, 1.17, 0.02], r: [Math.PI / 2, 0, 0], s: [1.1, 0.85, 1], shine: 1 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    A(roundBox(0.17, 0.32, 0.03, 0.012), k % 2 ? C.plateD : C.plate, Object.assign({ bone: BB3.pelvis, p: [Math.sin(a) * 0.28, 0.98, Math.cos(a) * 0.24], r: [-0.22 * Math.cos(a), a, 0.2 * Math.sin(a) * 0] }, metal));
  }
  // Schultern: drei geschichtete Platten, Dorn bzw. Eiszacken
  for (const sx of [-1, 1]) {
    const [ub, fb] = bsArmB3(sx);
    const S = P[sx].S;
    for (let k = 0; k < 3; k++) {
      const D = [S[0] + sx * (0.06 + k * 0.03), S[1] + 0.08 - k * 0.1, S[2]];
      A(cap3(1, 1.2, 0, Math.PI * 2, 16, 6), k % 2 ? C.plateD : C.plate, Object.assign({ bone: ub, p: D, r: [0, 0, sx * (0.55 + k * 0.15)], s: [0.25 - k * 0.03, 0.15, 0.25 - k * 0.02] }, metal));
    }
    for (let k = 0; k < 3; k++) {
      const p = [S[0] + sx * 0.12, S[1] + 0.2, S[2] - 0.1 + k * 0.1];
      if (V.ice) A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: ub, p: [p[0] + sx * 0.04, p[1] + 0.08, p[2]], r: [0, 0, -sx * 0.4], s: [0.035, 0.14 - (k % 2) * 0.04, 0.035], shine: 1 });
      else bsSpike3(A, 0.26 - (k % 2) * 0.08, 0.04, C.plateD, p, [sx * 0.5, 1, -0.2], { bone: ub, shine: 1 });
    }
    // Armschienen, Panzerhandschuhe
    const m = bsLerp3(P[sx].E, P[sx].W, 0.55);
    A(cyl3(0.12, 0.105, 0.3, 14), C.plate, Object.assign({ bone: fb, p: m }, metal));
    A(cap3(1, 1.4, 0, Math.PI * 2, 12, 5), C.plateD, Object.assign({ bone: fb, p: P[sx].E, s: 0.1 }, metal));
    bsHand3(A, sx, P, 0.08, C.plateD, { top: C.plateTop, claw: null });
    // Beinschienen, Kniekacheln, Stiefel
    const [tb, sb, fb2] = bsLegB3(sx);
    A(roundBox(0.17, 0.36, 0.1, 0.035), C.plate, Object.assign({ bone: sb, p: [sx * J.hipX, 0.38, 0.08], r: [-0.05, 0, 0] }, metal));
    A(cap3(1, 1.3, 0, Math.PI * 2, 12, 5), C.plateD, Object.assign({ bone: sb, p: [sx * J.hipX, J.kneeY + 0.02, 0.09], r: [Math.PI / 2, 0, 0], s: [0.1, 0.07, 0.1] }, metal));
    bsSpike3(A, 0.12, 0.025, C.trim, [sx * J.hipX, J.kneeY + 0.02, 0.15], [0, 0.4, 1], { bone: sb, shine: 1 });
    A(roundBox(0.18, 0.4, 0.12, 0.04), C.plate, Object.assign({ bone: tb, p: [sx * J.hipX, 0.86, 0.09], r: [0.05, 0, 0] }, metal));
    A(roundBox(0.16, 0.13, 0.36, 0.05), C.plateD, Object.assign({ bone: fb2, p: [sx * J.hipX, 0.07, 0.1] }, metal));
  }
  // --- Helm: geschlossen, Sehschlitz glüht, Kamm, Krone ---
  // seit 14.82 (bosse3d-modelle3.js): V.helm 'skull' (Schädel mit Krone, Gruftkönig), 'bucket' (Topfhelm mit Tang,
  // Ertrunkener Ritter), 'horned' (geschlossener Helm mit Hörnern statt Krone, Morvaine); V.drowned (Rost, Tang,
  // Muscheln), V.weapon 'glaive' (Glefe), V.blade 'broken' (abgebrochene Klinge)
  const hb = BB3.head;
  const H0 = [0, 2.22, 0.08];
  if (V.helm === 'skull') {
    A(ball(16), C.bone, { bone: hb, p: [0, 2.24, 0.08], s: [0.13, 0.14, 0.15], top: C.boneTop, topK: 0.5, shine: 0.3 });
    A(roundBox(0.16, 0.08, 0.1, 0.03), C.bone, { bone: hb, p: [0, 2.15, 0.16], shine: 0.3 });
    A(roundBox(0.12, 0.04, 0.1, 0.015), C.bone, { bone: BB3.jaw, p: [0, 2.08, 0.14], shine: 0.3 });
    for (let k = 0; k < 6; k++) A(roundBox(0.017, 0.028, 0.014, 0.005), C.boneTop, { bone: hb, p: [(k - 2.5) * 0.021, 2.12, 0.21], noShadow: true });
    for (const sx of [-1, 1]) {
      A(ball(10), '#060606', { bone: hb, p: [sx * 0.048, 2.24, 0.19], s: [0.04, 0.036, 0.03], noShadow: true });
      A(ball(8), C.eye, { bone: hb, p: [sx * 0.048, 2.24, 0.205], s: [0.02, 0.018, 0.012], mat: 'glow' });
    }
    A(torus3(0.14, 0.024, Math.PI * 2, 4, 18), C.trim, { bone: hb, p: [0, 2.33, 0.08], r: [Math.PI / 2 - 0.12, 0, 0], shine: 1 });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      bsSpike3(A, 0.1 + 0.1 * Math.max(0, Math.cos(a)), 0.03, C.trim, [Math.sin(a) * 0.14, 2.35, 0.08 + Math.cos(a) * 0.14], [Math.sin(a) * 0.15, 1, Math.cos(a) * 0.15], { bone: hb, shine: 1 });
      if (k % 2 === 0) bsGem3(A, C.glow, [Math.sin(a) * 0.145, 2.34, 0.08 + Math.cos(a) * 0.145], [0.016, 0.022, 0.012], null, hb);
    }
  } else if (V.helm === 'bucket') {
    A(cyl3(0.15, 0.16, 0.3, 16), C.plate, { bone: hb, p: [0, 2.22, 0.08], top: C.plateTop, topK: 0.6, shine: 0.6 });
    A(cap3(1, 1.0, 0, Math.PI * 2, 16, 4), C.plateD, { bone: hb, p: [0, 2.37, 0.08], s: [0.15, 0.06, 0.15], shine: 0.6 });
    A(box3(), '#060408', { bone: hb, p: [0, 2.25, 0.22], s: [0.2, 0.035, 0.03], noShadow: true });
    A(box3(), '#060408', { bone: hb, p: [0, 2.2, 0.22], s: [0.03, 0.12, 0.03], noShadow: true });
    A(box3(), C.eye, { bone: hb, p: [0, 2.25, 0.225], s: [0.16, 0.016, 0.02], mat: 'glow' });
  } else {
  A(ball(16), C.plate, Object.assign({ bone: hb, p: H0, s: [0.14, 0.16, 0.15] }, metal));
  A(roundBox(0.2, 0.18, 0.12, 0.05), C.plate, Object.assign({ bone: hb, p: [0, 2.17, 0.15] }, metal));
  A(box3(), C.eye, { bone: hb, p: [0, 2.23, 0.215], s: [0.16, 0.022, 0.02], mat: 'glow' });
  A(box3(), '#060408', { bone: hb, p: [0, 2.23, 0.21], s: [0.18, 0.035, 0.02], noShadow: true });
  for (let k = 0; k < 4; k++) A(box3(), '#060408', { bone: hb, p: [(k - 1.5) * 0.035, 2.13, 0.215], s: [0.012, 0.05, 0.02], noShadow: true });
  A(roundBox(0.035, 0.14, 0.26, 0.015), C.trim, { bone: hb, p: [0, 2.37, 0.06], r: [0.2, 0, 0], shine: 1 });
  for (const sx of [-1, 1]) A(roundBox(0.05, 0.16, 0.14, 0.02), C.plateD, Object.assign({ bone: hb, p: [sx * 0.13, 2.17, 0.05], r: [0, sx * 0.2, 0] }, metal));
  A(torus3(0.15, 0.02, Math.PI * 2, 4, 20), C.trim, { bone: hb, p: [0, 2.33, 0.08], r: [Math.PI / 2 - 0.12, 0, 0], shine: 1 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const front = Math.max(0, Math.cos(a));
    const p = [Math.sin(a) * 0.15, 2.34, 0.08 + Math.cos(a) * 0.15];
    if (V.ice) {
      A(bsOcta3(), k % 3 ? C.gem : C.gemTop, { bone: hb, p: [p[0], p[1] + 0.07 + front * 0.06, p[2]], s: [0.022, 0.08 + front * 0.07, 0.022], r: [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25], shine: 1 });
      if (k % 3 === 0) bsGem3(A, C.aurora[(k / 3) % C.aurora.length], [p[0], p[1] + 0.02, p[2] + 0.01], [0.018, 0.024, 0.014], null, hb);
    } else bsSpike3(A, 0.14 + front * 0.16, 0.024, C.plateD, p, [Math.sin(a) * 0.35, 1, Math.cos(a) * 0.35], { bone: hb, shine: 1 });
  }
  if (!V.ice) bsGem3(A, C.glow, [0, 2.36, 0.24], [0.022, 0.035, 0.012], null, hb);
  }
  if (V.helm === 'horned') for (const sx of [-1, 1]) A(tube3([[sx * 0.13, 2.3, 0.06], [sx * 0.3, 2.38, 0.12], [sx * 0.38, 2.55, 0.25], [sx * 0.32, 2.7, 0.38]], 0.045, 0.006, 16, 8), C.plateD, { bone: hb, top: C.plateTop, topK: 0.6, shine: 0.8 });
  if (V.drowned) {
    // Tang hängt von Helm, Schultern und Gürtel, Muscheln und Rost auf den Platten
    for (const [p, bn, len] of [[[0.12, 2.32, 0.1], hb, 0.4], [[-0.1, 2.34, 0.04], hb, 0.5], [[0.42, 1.98, 0.05], BB3.chest, 0.6], [[-0.45, 1.96, 0.0], BB3.chest, 0.55], [[0.2, 1.15, 0.22], BB3.pelvis, 0.5], [[-0.24, 1.14, 0.2], BB3.pelvis, 0.45], [[0.0, 1.9, -0.25], BB3.chest, 0.7]]) {
      A(tube3([p, [p[0] * 1.08, p[1] - len * 0.5, p[2] + 0.04], [p[0] * 1.02, p[1] - len, p[2] + 0.02]], 0.025, 0.008, 10, 4), C.weed, { bone: bn, top: C.weedTop, noShadow: true });
    }
    for (const [x, y, z, bn] of [[0.22, 1.82, 0.26, BB3.chest], [-0.15, 1.66, 0.3, BB3.chest], [0.05, 1.5, 0.27, BB3.spine], [0.34, 2.02, 0.1, BB3.chest], [-0.3, 1.0, 0.2, BB3.pelvis]]) {
      A(cap3(1, 1.3, 0, Math.PI * 2, 8, 4), C.shell, { bone: bn, p: [x, y, z], r: [Math.PI / 2 - 0.3, 0, 0], s: [0.035, 0.03, 0.035], shine: 0.5, noShadow: true });
      A(ball(8), C.rust, { bone: bn, p: [x - 0.05, y - 0.05, z - 0.01], s: [0.06, 0.04, 0.02], noShadow: true });
    }
  }
  // Halsberge
  A(cyl3(0.16, 0.2, 0.12, 16), C.plateD, Object.assign({ bone: BB3.neck, p: [0, 2.02, 0.06] }, metal));
  // --- Umhang (Kaldor: Nordlicht-Verlauf, Nihilor: zerfetzt) ---
  bsSheetAdd3(b, A, bsSheet3(id + 'umhang', 9, 11, (u, v) => {
    const a = (u - 0.5) * 2.2;
    const R = 0.36 + v * 0.3;
    const cut = V.torn && v > 0.68 ? 0.2 * Math.abs(Math.sin(u * 23)) * (v - 0.68) / 0.32 : 0;
    return [Math.sin(a) * R, 1.98 - Math.min(v, 1 - cut) * 1.88, 0.02 - Math.cos(a) * R * 0.78 - 0.12];
  }, (u, v) => [[BB3.chest, Math.max(0, 1 - v * 3)], [BB3.c1, Math.min(1, v * 3) * (1 - v)], [BB3.c2, Math.min(1, v * 3) * v]], (u, v, s) => {
    if (V.ice) return s > 0 ? mixColor(mixColor(C.aurora[0], C.aurora[1], u), C.cape, Math.min(1, v * 1.4)) : mixColor(C.capeIn, C.cape, v);
    return s > 0 ? mixColor(C.cape, C.capeEdge, v * v) : darker(C.cape, 0.3);
  }, 0.01), true);
  // --- Zweihänder in der rechten Hand ---
  const G = BS_KNIGHT_G3, hbR = BB3.haR;
  if (V.weapon === 'glaive') {
    // Glefe: langer Schaft, geschwungene Klinge mit Leerenkern, Gegenhaken
    A(cyl3(0.03, 0.032, 2.2, 8), C.grip, { bone: hbR, p: [G[0], G[1], G[2] + 0.35], r: [Math.PI / 2, 0, 0] });
    for (const z of [-0.6, 0.0, 1.38]) A(cyl3(0.042, 0.042, 0.05, 8), C.trim, { bone: hbR, p: [G[0], G[1], G[2] + z], r: [Math.PI / 2, 0, 0], shine: 1 });
    A(bsBlade3(id + '-glefe', [[0, 0.04], [0.25, 0.1], [0.55, 0.12], [0.72, 0.02], [0.55, -0.04], [0.3, -0.06], [0.0, -0.04]], 0.03, 0.01), C.blade, { bone: hbR, p: [G[0], G[1], G[2] + 1.4], top: C.bladeTop, shine: 1 });
    bsSpike3(A, 0.18, 0.03, C.blade, [G[0], G[1] - 0.04, G[2] + 1.42], [0, -1, -0.3], { bone: hbR, shine: 1 });
    A(box3(), C.glow, { bone: hbR, p: [G[0], G[1] + 0.03, G[2] + 1.75], s: [0.04, 0.03, 0.55], mat: 'glow', noShadow: true });
    return bsRes3(id, rig, J, 2.55, V.worldH);
  }
  A(cyl3(0.035, 0.035, 0.42, 8), C.grip, { bone: hbR, p: [G[0], G[1], G[2] - 0.05], r: [Math.PI / 2, 0, 0] });
  A(ball(10), C.trim, { bone: hbR, p: [G[0], G[1], G[2] - 0.28], s: [0.05, 0.05, 0.05], shine: 1 });
  A(roundBox(0.07, 0.07, 0.52, 0.02), C.trim, { bone: hbR, p: [G[0], G[1], G[2] + 0.18], r: [Math.PI / 2, 0, 0], shine: 1 });
  bsGem3(A, C.glow, [G[0], G[1], G[2] + 0.18], [0.025, 0.04, 0.025], null, hbR);
  const bl = [];
  if (V.ice) {
    bl.push([0.2, 0.085], [1.2, 0.07], [1.62, 0.0], [1.2, -0.07], [0.2, -0.085]);
  } else if (V.blade === 'broken') {
    bl.push([0.2, 0.09], [0.7, 0.085], [0.95, 0.06], [1.05, 0.1], [1.12, -0.02], [1.0, -0.05], [0.85, -0.08], [0.2, -0.09]);
  } else {
    for (let i = 0; i <= 6; i++) bl.push([0.2 + i * 0.22, 0.09 + (i % 2 ? 0.05 : 0) - i * 0.006]);
    bl.push([1.75, 0]);
    for (let i = 6; i >= 0; i--) bl.push([0.2 + i * 0.22, -0.09 - (i % 2 ? 0.035 : 0) + i * 0.006]);
  }
  A(bsBlade3(id + '-klinge', bl, 0.035, 0.01), C.blade, { bone: hbR, p: [G[0], G[1], G[2]], top: C.bladeTop, topK: 0.5, shine: 1 });
  A(box3(), C.glow, { bone: hbR, p: [G[0], G[1], G[2] + (V.blade === 'broken' ? 0.6 : 0.9)], s: [0.042, 0.022, V.blade === 'broken' ? 0.7 : 1.25], mat: 'glow', noShadow: true });
  return bsRes3(id, rig, J, 2.55, V.worldH);
}
const BS_KALDOR3 = {
  plate: '#5a7a98', plateTop: '#9ab8d4', plateD: '#344e6a', trim: '#d8ecf8', glow: '#9fffe8', eye: '#9fffe8', gem: '#9fd8f4', gemTop: '#eaf8ff',
  aurora: ['#5affc8', '#b48cff', '#7ad8ff'], cape: '#1a2e4a', capeIn: '#2a4a6a', capeEdge: '#9fffe8', grip: '#2a3a4a', blade: '#a8d8f0', bladeTop: '#eaf8ff', ice: true, worldH: 7.0
};
const BS_NIHILOR3 = {
  plate: '#241c38', plateTop: '#5a4a80', plateD: '#140e22', trim: '#6a5a9a', glow: '#b48cff', eye: '#d8b8ff', cape: '#160c2a', capeEdge: '#3a1a5a',
  grip: '#100a18', blade: '#1a1228', bladeTop: '#5a4a80', torn: true, worldH: 6.6
};
MON3_BUILD.kaldor = (b) => bsKnight3(b, 'kaldor', BS_KALDOR3);
MON3_BUILD.nihilor = (b) => bsKnight3(b, 'nihilor', BS_NIHILOR3);
const BS_KNIGHT_BOSS3 = {
  kind: 'biped', cape: true, emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'sweep', 'thrust'], blob: 1.2, dome: 1.4, pts: BS_KNIGHT_PTS3,
  deathPts: ['core', 'back', 'weapon', 'crown'], skyAt: 'sky', gait: 0.8, base: { aRx: -0.35, aRe: -0.8, aRz: 0.15, aLz: 0.2, aLe: -0.45, lean: 0.06 }
};
BOSS3.kaldor = Object.assign({}, BS_KNIGHT_BOSS3, {
  fx: 'nordlicht', emi: [0.03, 0.08, 0.08],
  // Nordlicht flackert über ihm, Reif sprüht von der Klinge, Atemwolken
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.kaldor, 'crown', _b3P);
    for (let i = 0; i < 5; i++) {
      const x = _b3P.x + (i - 2) * 0.55, y = _b3P.y + 1.4 + Math.sin(t * 0.9 + i) * 0.25;
      bsSprite3(h, x, y, _b3P.z - 0.3, 1.3, 'disc', BS_KALDOR3.aurora[i % 3], 0.16 + 0.08 * Math.sin(t * 1.7 + i * 1.3));
    }
    bsPtA3(a, BOSS3.kaldor, 'weapon', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.9 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.4) * 0.3, _b3P.y - v * 1.2, _b3P.z + Math.cos(i * 1.8) * 0.3, 0.16, 'spark', th.core, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.kaldor, 'mouth', _b3P);
    const ph = (t * 0.45) % 1;
    if (ph < 0.5) bsSmoke3(h, _b3P.x, _b3P.y + ph * 0.4, _b3P.z + 0.15, 0.3 + ph, '#e8f6ff', 0.25 * (1 - ph * 2));
  }
});
BOSS3.nihilor = Object.assign({}, BS_KNIGHT_BOSS3, {
  fx: 'leere', emi: [0.06, 0.02, 0.1],
  // Splitter der Leere schweben um ihn, Nacht steigt vom Umhang auf
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.nihilor, 'core', _b3P);
    for (let i = 0; i < 5; i++) {
      const ang = t * 0.6 + (i / 5) * Math.PI * 2;
      const o = fx3Take(h, 'coneG');
      o.position.set(_b3P.x + Math.cos(ang) * 1.7, _b3P.y - 0.3 + Math.sin(t + i * 1.3) * 0.6, _b3P.z + Math.sin(ang) * 1.7);
      o.scale.set(0.14, 0.45, 0.14);
      o.rotation.set(t + i, ang, 0.5);
      o.material.color.set(i % 2 ? '#2a1a4a' : th.mid);
      o.material.opacity = 0.85;
    }
    bsPtA3(a, BOSS3.nihilor, 'back', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.35 + i / 4) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.3) * 0.8, _b3P.y - 1.4 + v * 2.6, _b3P.z + Math.cos(i * 1.7) * 0.7, 0.8 + v, '#140a24', 0.35 * Math.sin(Math.PI * v));
    }
  }
});

// ============================================================================================================
// Abwandlungen der Baupläne aus Paket 1 (bosse3d-modelle.js) mit eigenem Kopf, Zubehör, Waffe und eigenen Farben
// - Moormutter Vethra (Moorkrypta): Naga des Moders – Brutbeulen auf Rücken und Leib, freiliegende Rippen, Krone,
//   Kragen und Klingen aus Knochen, faulgrüne Schuppen, Haube mit Knochenzeichnung (Vritra: Kobras, Gold)
// - Totenfürst Azrakel (Knochenkathedrale): Dämon mit Schädel statt Gesicht, Knochenflügeln mit violetter Haut,
//   Seelenfeuerkrone, Sense
// - Belzarek, Fürst der Schatten (Höllenthron): fast schwarzer Dämon, lange gerippte Hörner nach hinten, rote Glut,
//   Schattenklinge
// - Ifrah, die Flammenfürstin (Höllenthron): schlanke Dämonin aus Glut, Haar aus Flammen, Flammenschwert
// - Donnerschmied Volund (Donnerschmiede): Steinriese mit Bart, Schmiedeschürze, Bronzebändern, Schmiedehammer, Blitze
// - Magmafürst Pyrrhos (Glutkessel): Riese aus Basalt mit Lavaadern, Krone aus Glutzacken, Magmahammer
// - Gorvoth, Kerkermeister der Hölle (Höllenthron): Oger mit Hauern, eiserner Halbmaske, Ketten, Fesseln, Kerkerflegel
// - Molgrath, der Glutkoloss (Höllenthron): Koloss aus Basalt ohne Gesicht, Glutaugen, Fäuste aus Magma
// - Zerberos, Wächter des Höllentors (Höllenthron): dreiköpfiger Höllenhund mit glühender Mähne
// ============================================================================================================
const BS_VETHRA3 = Object.assign({}, BS_VRITRA3, {
  rot: true, skin: '#46542c', skinTop: '#66743e', scale: '#26321a', scaleTop: '#3e4c26', scaleD: '#141c0c', mark: '#6a7a3a', crest: '#26301a',
  hood: '#26321a', hoodEdge: '#6ab84a', hair: '#1e2614', gold: '#c8c0a0', goldD: '#8a8468', gem2: '#c8ff6a', glow: '#8fe36a', eye: '#e8ff4a',
  tooth: '#e0dcc8', wood: '#2a2418', blade: '#c8c0a0', bladeTop: '#e8e0c8', sac: '#5a6a34', sacTop: '#a8c86a', worldH: 6.0
});
MON3_BUILD.vethra = (b) => bsNaga3(b, 'vethra', BS_VETHRA3);
BOSS3.vethra = Object.assign({}, BS_NAGA_BOSS3, {
  fx: 'moor', emi: [0.03, 0.07, 0.02],
  // Faulgas steigt aus den Brutbeulen, Schleim tropft von den Klingen
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.vethra, 'back', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.4 + i / 4) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.1) * 0.6, _b3P.y + v * 1.8, _b3P.z + Math.cos(i * 1.6) * 0.6, 0.5 + v * 1.1, '#4a6a2a', 0.3 * Math.sin(Math.PI * v));
    }
    bsPtA3(a, BOSS3.vethra, 'weapon', _b3P);
    for (let i = 0; i < 2; i++) {
      const v = (t * 0.9 + i / 2) % 1;
      bsSprite3(h, _b3P.x, _b3P.y - v * 1.3, _b3P.z, 0.15, 'disc', th.mid, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.vethra, 'tail', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.25 + i / 3) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.4) * 1.4, 0.3 + v * 0.7, _b3P.z + Math.cos(i * 1.3) * 1.4, 1.2 + v * 1.2, '#2a3a20', 0.25 * Math.sin(Math.PI * v));
    }
  }
});

const BS_AZRAKEL3 = Object.assign({}, BS_AZAROTH3, {
  skull: true, weapon: 'scythe', skin: '#3a2a4a', skinTop: '#5a4a6e', lava: '#b48cff', eye: '#e8d0ff', bone: '#d8d0c0', boneTop: '#f0ead8',
  armor: '#1a1426', armorTop: '#4a3a5e', horn: '#1a1420', hornTip: '#7a6a8e', fur: '#1a1020', hoof: '#0e0a12', cloth: '#24183a', grip: '#1a1018',
  blade: '#2a2238', bladeTop: '#8a7aa8', wingBone: '#c8c0b0', wingTop: '#ece6d6', mem: '#1a1024', memB: '#2a1838', memEdge: '#4a2a6a', vein: '#b48cff', worldH: 7.0
});
const BS_BELZAREK3 = Object.assign({}, BS_AZAROTH3, {
  longHorns: true, weapon: 'sword', skin: '#2a0a14', skinTop: '#4a1626', lava: '#ff3a5a', eye: '#ff9aaa', armor: '#120810', armorTop: '#3a1a26',
  horn: '#140a0e', hornTip: '#5a2a3a', fur: '#140608', cloth: '#2a0610', blade: '#160a10', bladeTop: '#5a2a3a', wingBone: '#24080e', wingTop: '#4a1420',
  mem: '#2a0610', memB: '#3a0a18', memEdge: '#6a0a24', vein: '#ff3a5a', worldH: 7.0
});
const BS_IFRAH3 = Object.assign({}, BS_SERETH3, {
  weapon: 'sword', flameHair: true, skin: '#b8402a', skinTop: '#e87a4a', lava: '#ffd34d', eye: '#fff0a0', hair: '#ff6a1a', horn: '#2a1410', hornTip: '#ffb04a',
  armor: '#3a1a10', armorTop: '#8a4a2a', cloth: '#5a1a0a', blade: '#5a2a10', bladeTop: '#ffb04a', mem: '#6a1a0a', memB: '#8a2a10', memEdge: '#ffb04a', vein: '#ffd34d',
  wingBone: '#4a1a0a', wingTop: '#8a3a1a', worldH: 6.4
});
MON3_BUILD.azrakel = (b) => bsDemon3(b, 'azrakel', BS_AZRAKEL3);
MON3_BUILD.belzarek = (b) => bsDemon3(b, 'belzarek', BS_BELZAREK3);
MON3_BUILD.ifrah = (b) => bsDemon3(b, 'ifrah', BS_IFRAH3);
// Flammen bzw. Seelenfeuer an Waffe und Krone
function bsDemonFire3(id, n) {
  return function (h, a, e, t, th) {
    if (!a.bones) return;
    const D = BOSS3[id];
    bsPtA3(a, D, 'weapon', _b3P);
    for (let i = 0; i < n; i++) {
      const v = (t * 1.5 + i / n) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.7) * 0.25, _b3P.y + v * 1.0, _b3P.z + Math.cos(i * 1.9) * 0.25, 0.65 * (1 - v * 0.6), 'flame', i % 2 ? th.mid : th.core, 0.7 * (1 - v));
    }
    bsPtA3(a, D, 'mouth', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 1.3 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.1) * 0.15, _b3P.y + 0.55 + v * 0.8, _b3P.z, 0.55 * (1 - v * 0.5), 'flame', th.mid, 0.6 * (1 - v));
    }
  };
}
BOSS3.azrakel = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'tod', melee: ['sweep', 'chop', 'claw'], emit: 'weapon', pts: bsDemonPts3(BS_DEMON_J3), emi: [0.06, 0.03, 0.1],
  base: { aRx: -0.4, aRe: -0.7, aRz: 0.15, aLz: 0.25, aLe: -0.6, wing: 0.3 },
  ambient(h, a, e, t, th) {
    bsDemonFire3('azrakel', 3)(h, a, e, t, th);
    if (!a.bones) return;
    // Seelen kreisen um ihn
    bsPtA3(a, BOSS3.azrakel, 'core', _b3P);
    for (let i = 0; i < 3; i++) {
      const ang = t * 0.8 + i * 2.1;
      bsSprite3(h, _b3P.x + Math.cos(ang) * 2, _b3P.y - 0.4 + Math.sin(t * 1.3 + i) * 0.6, _b3P.z + Math.sin(ang) * 2, 0.5, 'flame', th.mid, 0.5);
    }
  }
});
BOSS3.belzarek = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'schatten', melee: ['chop', 'sweep', 'claw'], pts: bsDemonPts3(BS_DEMON_J3), emi: [0.1, 0.01, 0.03],
  base: { aRx: -0.35, aRe: -0.75, aRz: 0.18, aLz: 0.2, aLe: -0.5, wing: 0.25 },
  ambient(h, a, e, t, th) {
    bsDemonFire3('belzarek', 4)(h, a, e, t, th);
    if (!a.bones) return;
    bsPtA3(a, BOSS3.belzarek, 'back', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 0.35 + i / 4) % 1;
      bsSmoke3(h, _b3P.x + Math.sin(i * 2.4) * 1.2, _b3P.y - 1.2 + v * 2.2, _b3P.z + Math.cos(i * 1.7) * 0.9, 0.9 + v, '#14060c', 0.4 * Math.sin(Math.PI * v));
    }
  }
});
BOSS3.ifrah = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'feuer', melee: ['sweep', 'chop', 'claw'], pts: bsDemonPts3(BS_DEMONF_J3), emi: [0.12, 0.05, 0.01],
  base: { aRx: -0.4, aRe: -0.7, aRz: 0.15, aLz: 0.25, aLe: -0.6, wing: 0.3 },
  ambient: bsDemonFire3('ifrah', 5)
});

const BS_VOLUND3 = {
  skin: '#5a5a62', skinTop: '#86868e', eye: '#cfe8ff', beard: '#24242a', beard2: '#4a4a56', rune: '#9fd0ff', stone: '#4a4a54', stoneTop: '#7a7a86',
  bronze: '#a87a3a', belt: '#5a3a20', band: '#6a4a2a', bandTop: '#a8783a', cloth: '#3a2a1a', wood: '#3a2a1c', apron: '#5a3a22', worldH: 6.8
};
const BS_PYRRHOS3 = {
  skin: '#2a2220', skinTop: '#4a3a34', eye: '#ffd34d', rune: '#ff7a2a', stone: '#1e1816', stoneTop: '#4a3a32', bronze: '#2a1a14', belt: '#2a1a14',
  band: '#3a2a22', bandTop: '#7a4a2a', cloth: '#3a1a10', wood: '#1a1210', worldH: 7.2
};
const BS_GORVOTH3 = {
  skin: '#5a3a30', skinTop: '#7e5a48', eye: '#ff6a1a', tusks: true, tusk: '#e8dcc0', iron: '#3a3a40', ironTop: '#7a7a86', stone: '#4a3a30', stoneTop: '#6a5a4a',
  bronze: '#4a4a50', belt: '#3a2a1a', band: '#3a3a40', bandTop: '#6a6a76', cloth: '#3a2a1e', wood: '#3a2a1c', chains: true, weapon: 'flail', worldH: 6.6
};
const BS_MOLGRATH3 = {
  skin: '#2e2420', skinTop: '#5a4438', eye: '#ffb04a', rune: '#ff6a1a', stone: '#241c18', stoneTop: '#4a3a30', bronze: '#2a201a', belt: '#1a1410',
  band: '#2a201a', bandTop: '#5a3a24', cloth: '#2a1a10', golemHead: true, weapon: 'none', worldH: 6.4
};
MON3_BUILD.volund = (b) => bsGiant3(b, 'volund', BS_VOLUND3);
MON3_BUILD.pyrrhos = (b) => bsGiant3(b, 'pyrrhos', BS_PYRRHOS3);
MON3_BUILD.gorvoth = (b) => bsGiant3(b, 'gorvoth', BS_GORVOTH3);
MON3_BUILD.molgrath = (b) => bsGiant3(b, 'molgrath', BS_MOLGRATH3);
// Glut steigt aus Rücken und Waffe, Funken springen (Riesen aus Basalt und Magma)
function bsGiantEmbers3(id, smoke) {
  return function (h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3[id], 'back', _b3P);
    for (let i = 0; i < 5; i++) {
      const v = (t * 0.45 + i / 5) % 1;
      if (smoke) bsSmoke3(h, _b3P.x + Math.sin(i * 2.3) * 1.0, _b3P.y - 0.5 + v * 2.5, _b3P.z + Math.cos(i * 1.7) * 0.8, 0.7 + v * 1.2, smoke, 0.3 * Math.sin(Math.PI * v));
      bsSprite3(h, _b3P.x + Math.sin(i * 1.3 + t) * 0.8, _b3P.y + v * 2, _b3P.z + Math.cos(i * 2.1) * 0.6, 0.18, 'spark', i % 2 ? th.mid : th.core, 0.9 * (1 - v));
    }
  };
}
BOSS3.volund = Object.assign({}, BS_GIANT_BOSS3, {
  fx: 'sturm', emit: 'weapon', melee: ['chop', 'stomp', 'punch'], emi: [0.04, 0.07, 0.12],
  // Blitze springen vom Hammer auf die Schürze und den Bart, Funken wie beim Schmieden
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.volund, 'weapon', _b3P);
    for (let i = 0; i < 4; i++) {
      const v = (t * 1.6 + i / 4) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.4) * v * 1.2, _b3P.y + v * 0.8 - v * v * 1.6, _b3P.z + Math.cos(i * 1.6) * v * 1.2, 0.14, 'spark', '#ffd08a', 0.9 * (1 - v));
    }
    if ((t * 2.7) % 1 < 0.16) {
      bsPtA3(a, BOSS3.volund, 'core', _b3N);
      if (_b3N.distanceTo(_b3P) < 6) bsBolt3(h, _b3P, _b3N, th, 0.025, 0.9, 6);
    }
  }
});
BOSS3.pyrrhos = Object.assign({}, BS_GIANT_BOSS3, { fx: 'feuer', emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'stomp', 'slam2'], emi: [0.1, 0.04, 0.01], ambient: bsGiantEmbers3('pyrrhos', '#2a2220') });
BOSS3.gorvoth = Object.assign({}, BS_GIANT_BOSS3, { fx: 'glut', emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'punch', 'stomp'], emi: [0.06, 0.03, 0.01], ambient: bsGiantEmbers3('gorvoth', null) });
BOSS3.molgrath = Object.assign({}, BS_GIANT_BOSS3, { fx: 'glut', emit: 'mouth', melee: ['slam2', 'punch', 'stomp'], emi: [0.1, 0.04, 0.01], ambient: bsGiantEmbers3('molgrath', '#2a2220') });

const BS_ZERBEROS3 = Object.assign({}, BS_FENRIS3, {
  heads3: true, shackles: false, glow2: true, fur: '#2a1010', furTop: '#4e1c16', furD: '#140808', ruff: '#1e0a08', belly: '#3a1a14', claw: '#e8dcc0',
  eye: '#ffb04a', earIn: '#5a1a10', glow: '#ff5a1a', worldH: 5.2
});
MON3_BUILD.zerberos = (b) => bsWolf3(b, 'zerberos', BS_ZERBEROS3);
BOSS3.zerberos = Object.assign({}, BS_WOLF_DEF3, {
  fx: 'feuer', howl: false, emi: [0.1, 0.03, 0.01],
  // Glut aus den drei Mäulern, Funken aus der Mähne
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.zerberos, 'mouth', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 1.2 + i / 3) % 1;
      for (const ox of [0, -1, 1]) bsSprite3(h, _b3P.x + ox * 0.9 * Math.cos(a.heading) + Math.sin(i) * 0.1, _b3P.y - (ox ? 0.3 : 0) - v * 1.0, _b3P.z - ox * 0.9 * Math.sin(a.heading), 0.2, 'disc', i % 2 ? th.mid : th.core, 0.8 * (1 - v));
    }
    bsPtA3(a, BOSS3.zerberos, 'back', _b3P);
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.7 + i / 3) % 1;
      bsSprite3(h, _b3P.x + Math.sin(i * 2.7) * 0.6, _b3P.y + v * 1.8, _b3P.z + Math.cos(i * 1.9) * 0.6, 0.5 * (1 - v), 'flame', th.mid, 0.6 * (1 - v));
    }
  }
});

// ============================================================================================================
// Sturmkönigin Tempestra (Sturmhorst): Harpyienkönigin
// Schlanker Frauenkörper mit silbernem Brustharnisch, riesige Federflügel (Arm, Hand, Schwungfedern; doppelseitige
// Fläche mit gefiedertem Hinterrand, darauf einzelne Schwungfedern), Federschurz, Vogelbeine mit geschuppten Läufen und
// Krallen, wildes Haar aus Federn, Sturmkrone aus Silber mit Blitzsteinen, Sturmspeer mit gezackter Blitzklinge. Sie
// schwebt mit langsamem Flügelschlag; um sie zieht eine Gewitterwolke, Blitze springen zum Speer.
// ============================================================================================================
const BS_HARPY_J3 = {
  hipY: 1.08, hipX: 0.13, kneeY: 0.66, ankleY: 0.22, footL: 0.16, waistY: 1.32, chestY: 1.54, shY: 1.8, shX: 0.3, neckY: 1.9,
  headY: 1.97, headZ: 0.05, hunch: 0.05, upper: 0.42, fore: 0.38, hand: 0.13, armOut: 0.07, jaw: [-0.04, 0.05],
  tail: [[0, 1.05, -0.18], [0, 0.9, -0.4], [0, 0.72, -0.6]], wing: [0.14, 1.76, -0.18], cape: [[0, 1.85, -0.2], [0, 1.0, -0.3]]
};
const BS_HARPY_P3 = bsBipJ3(BS_HARPY_J3);
const BS_HARPY_G3 = bsLerp3(BS_HARPY_P3[-1].W, BS_HARPY_P3[-1].Hd, 0.5);
const BS_HARPY_PTS3 = {
  mouth: [BB3.jaw, [0, 2.0, 0.18]], core: [BB3.chest, [0, 1.56, 0.22]], back: [BB3.chest, [0, 1.85, -0.2]], crown: [BB3.head, [0, 2.3, 0.05]],
  emit: [BB3.haR, [BS_HARPY_G3[0], BS_HARPY_G3[1], BS_HARPY_G3[2] + 1.35]], weapon: [BB3.haR, [BS_HARPY_G3[0], BS_HARPY_G3[1], BS_HARPY_G3[2] + 1.35]],
  sky: [BB3.haR, [BS_HARPY_G3[0], BS_HARPY_G3[1], BS_HARPY_G3[2] + 1.35]]
};
// Federflügel: Arm (w1), Hand (w2) mit Schwungfedern, Fläche mit gefiedertem Hinterrand (doppelseitig)
function bsFeatherWing3(b, A, id, sx, J, C, k) {
  const [b1, b2] = bsWingB3(sx);
  const W1 = [sx * J.wing[0], J.wing[1], J.wing[2]];
  const W2 = [sx * (J.wing[0] + 0.85), J.wing[1] + 0.5, J.wing[2] - 0.15];
  const T0 = [W2[0] + sx * 1.35 * k, W2[1] + 0.25 * k, W2[2] - 0.45 * k];
  const T1 = [W2[0] + sx * 0.75 * k, W2[1] - 0.75 * k, W2[2] - 0.75 * k];
  const T2 = [sx * 0.3, 1.05, -0.5];
  A(tubeProfile3([W1, bsLerp3(W1, W2, 0.5), W2], [0.07, 0.06, 0.05], 10, 8), C.wingBone, { bone: b1, top: C.wingTop, topK: 0.5 });
  A(tubeProfile3([W2, bsLerp3(W2, T0, 0.5), bsLerp3(W2, T0, 0.8)], [0.05, 0.035, 0.02], 10, 6), C.wingBone, { bone: b2, top: C.wingTop, topK: 0.5, noShadow: true });
  const jag = (u) => 1 - 0.13 * Math.abs(Math.sin(u * Math.PI * 8));
  const col = (u, v, s) => (s > 0 ? mixColor(C.feather, C.featherTip, v * v) : mixColor(C.featherB, C.featherTip, v * v * 0.8));
  bsSheetAdd3(b, A, bsSheet3(id + 'fo' + sx, 9, 6, (u, v) => bsLerp3(W2, bsLerp3(T0, T1, u), v * jag(u)), () => [[b2, 1]], col, 0.012), true);
  bsSheetAdd3(b, A, bsSheet3(id + 'fi' + sx, 9, 6, (u, v) => bsLerp3(bsLerp3(W1, W2, u), bsLerp3(T2, T1, u), v * jag(u + 0.3)),
    (u, v) => [[BB3.chest, (1 - u) * v * 0.9], [b1, (1 - u) * (1 - v * 0.9) + u * (1 - u) * 2], [b2, u * u]], col, 0.012), true);
  // Schwungfedern über dem Hinterrand (flache Spitzen)
  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    const E = bsLerp3(T0, T1, u);
    const d = [E[0] - W2[0], E[1] - W2[1], E[2] - W2[2]];
    pointAt3(A, horn3(0.42 * k, 0.06, 4), i % 2 ? C.featherTip : C.feather, bsLerp3(W2, E, 0.72), d, { bone: b2, s: [1, 1, 0.22], top: C.featherTip, topK: 0.6, noShadow: true });
  }
  for (let i = 0; i < 5; i++) {
    const u = 0.15 + i * 0.18;
    const top = bsLerp3(W1, W2, u), bot = bsLerp3(T2, T1, u);
    pointAt3(A, horn3(0.34 * k, 0.05, 4), i % 2 ? C.feather : C.featherTip, bsLerp3(top, bot, 0.62), [bot[0] - top[0], bot[1] - top[1], bot[2] - top[2]], { bone: u < 0.5 ? b1 : b2, s: [1, 1, 0.22], noShadow: true });
  }
  // Deckfedern am Arm
  for (let i = 0; i < 6; i++) pointAt3(A, horn3(0.16, 0.05, 4), C.featherTip, bsLerp3(W1, W2, 0.1 + i * 0.16), [sx * 0.2, -0.4, -1], { bone: i < 3 ? b1 : b2, s: [1, 1, 0.3], noShadow: true });
}
function bsHarpy3(b, id, V) {
  const A = adder(b, null);
  const J = BS_HARPY_J3, P = BS_HARPY_P3, C = V;
  const { rig } = bsBipRig3(J);
  const rows = [[0.95, 0, 0.17, 0.14, 0.15], [1.08, 0, 0.2, 0.15, 0.16], [1.25, 0.02, 0.15, 0.12, 0.11], [1.42, 0.03, 0.18, 0.14, 0.12], [1.56, 0.04, 0.22, 0.16, 0.12], [1.7, 0.05, 0.25, 0.13, 0.12], [1.82, 0.05, 0.18, 0.1, 0.1], [1.92, 0.05, 0.065, 0.055, 0.055], [1.98, 0.05, 0.05, 0.045, 0.045]];
  bsBipBody3(id, A, J, P, { C, rows, arm: [0.07, 0.065, 0.05, 0.05, 0.04], leg: [0.12, 0.09, 0.05, 0.045, 0.04], legCol: C.leg, shade: 0.25 });
  // Brustharnisch, Gürtel, Federschurz
  for (const sx of [-1, 1]) A(cap3(1, 1.25, 0, Math.PI * 2, 12, 5), C.silver, { bone: BB3.chest, p: [sx * 0.08, 1.64, 0.1], r: [Math.PI / 2 - 0.2, 0, 0], s: [0.09, 0.08, 0.085], top: C.silverTop, shine: 1 });
  A(roundBox(0.03, 0.2, 0.03, 0.01), C.silver, { bone: BB3.chest, p: [0, 1.58, 0.18], shine: 1 });
  bsGem3(A, C.glow, [0, 1.66, 0.2], [0.022, 0.032, 0.014], null, BB3.chest);
  A(torus3(0.17, 0.02, Math.PI * 2, 4, 18), C.silver, { bone: BB3.pelvis, p: [0, 1.1, 0.01], r: [Math.PI / 2, 0, 0], s: [1.05, 0.85, 1], shine: 1 });
  const skirt = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    skirt.push([[Math.sin(a) * 0.17, 1.08, Math.cos(a) * 0.15], [Math.sin(a) * 0.45, -1, Math.cos(a) * 0.4], 0.3 + 0.08 * Math.sin(i * 2.3), 0.05, BB3.pelvis]);
  }
  bsTufts3(A, skirt, C.feather, C.featherTip);
  // Federn an den Oberschenkeln, Vogelläufe mit Schuppen und Krallen
  for (const sx of [-1, 1]) {
    const [tb, sb, fb2] = bsLegB3(sx);
    const Q = P[sx];
    bsTufts3(A, [0, 1, 2, 3, 4, 5].map((k) => [[Q.H[0] + Math.sin(k * 1.1) * 0.06, J.hipY - 0.1 - k * 0.05, Math.cos(k * 1.1) * 0.06], [sx * 0.3, -1, -0.2], 0.2, 0.05, tb]), C.feather, C.featherTip);
    for (let k = 0; k < 4; k++) A(torus3(0.05, 0.01, Math.PI * 2, 3, 10), C.legD, { bone: sb, p: bsLerp3(Q.K, Q.A, 0.3 + k * 0.17), r: [Math.PI / 2, 0, 0], noShadow: true });
    const Ak = Q.A;
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.45;
      const p0 = [Ak[0] + Math.sin(a) * 0.05, 0.05, Ak[2] + 0.04];
      const p1 = [Ak[0] + Math.sin(a) * 0.17, 0.04, Ak[2] + Math.cos(a) * 0.17];
      A(tube3([[Ak[0], Ak[1] - 0.05, Ak[2]], p0, p1], 0.03, 0.02, 8, 5), C.leg, { bone: fb2 });
      bsSpike3(A, 0.09, 0.016, C.claw, p1, [Math.sin(a) * 0.4, -0.6, 1], { bone: fb2, seg: 5, shine: 0.6 });
    }
    bsSpike3(A, 0.08, 0.016, C.claw, [Ak[0], 0.05, Ak[2] - 0.08], [0, -0.5, -1], { bone: fb2, seg: 5, shine: 0.6 });
    // Armreif, Hand mit Krallen
    const fb = bsArmB3(sx)[1];
    A(cyl3(0.06, 0.055, 0.12, 10), C.silver, { bone: fb, p: bsLerp3(P[sx].E, P[sx].W, 0.7), shine: 1 });
    bsHand3(A, sx, P, 0.05, C.skin, { top: C.skinTop, claw: C.claw });
  }
  // --- Kopf: Gesicht, Augen, Federhaar, Sturmkrone ---
  const hb = BB3.head, jb = BB3.jaw;
  A(ball(16), C.skin, { bone: hb, p: [0, 2.06, 0.07], s: [0.09, 0.11, 0.095], top: C.skinTop, topK: 0.4, shade: 0.2 });
  A(roundBox(0.085, 0.045, 0.08, 0.03), C.skin, { bone: jb, p: [0, 1.98, 0.1], r: [0.2, 0, 0], shade: 0.2 });
  for (const sx of [-1, 1]) {
    A(ball(8), '#0a0a10', { bone: hb, p: [sx * 0.038, 2.07, 0.15], s: [0.026, 0.014, 0.014], r: [0, 0, sx * 0.25], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.038, 2.07, 0.158], s: [0.02, 0.008, 0.01], r: [0, 0, sx * 0.25], mat: 'glow' });
  }
  for (let k = 0; k < 13; k++) {
    const a = (k / 12 - 0.5) * 3.0;
    pointAt3(A, horn3(0.36 + 0.1 * Math.sin(k * 1.9), 0.045, 4), k % 3 ? C.hair : C.featherTip, [Math.sin(a) * 0.08, 2.15 - Math.abs(a) * 0.03, 0.04 - Math.cos(a) * 0.06], [Math.sin(a) * 0.7, 0.5 - Math.abs(a) * 0.2, -1], { bone: hb, s: [1, 1, 0.35], noShadow: k % 2 === 1 });
  }
  // seit 14.82 (bosse3d-modelle3.js): V.crown 'mask' (Schnabelmaske aus Silber mit Federkamm, Kyra), 'crest' (hoher
  // Federkamm mit Kopfschmuck, Ssyla); V.weapon 'fan' (Federfächer), 'claws' (leuchtende Krallen, ohne Speer)
  if (V.crown === 'mask' || V.crown === 'crest') {
    if (V.crown === 'mask') {
      A(cap3(1, 1.2, 0, Math.PI * 2, 14, 6), C.silver, { bone: hb, p: [0, 2.1, 0.11], r: [Math.PI / 2 - 0.3, 0, 0], s: [0.1, 0.08, 0.075], top: C.silverTop, shine: 1 });
      A(tube3([[0, 2.08, 0.17], [0, 2.04, 0.25], [0, 1.97, 0.27]], 0.032, 0.005, 10, 6), C.silver, { bone: hb, top: C.silverTop, shine: 1 });
      for (const sx of [-1, 1]) A(ball(8), C.glow, { bone: hb, p: [sx * 0.04, 2.08, 0.18], s: [0.018, 0.012, 0.01], mat: 'glow', noShadow: true });
    }
    for (let k = 0; k < 7; k++) {
      const u = (k - 3) / 3;
      pointAt3(A, horn3(0.3 + 0.16 * (1 - Math.abs(u)), 0.05, 4), k % 2 ? C.featherTip : C.feather, [u * 0.03, 2.16, 0.08 - Math.abs(u) * 0.02 - k * 0.012], [u * 0.25, 1, -0.6 - 0.2 * Math.abs(u)], { bone: hb, s: [1, 1, 0.25], noShadow: k % 2 === 1 });
      if (V.crown === 'crest' && k % 2 === 0) bsGem3(A, C.glow, [u * 0.07, 2.17, 0.12 - Math.abs(u) * 0.04], [0.012, 0.02, 0.01], null, hb);
    }
  } else {
  A(torus3(0.1, 0.015, Math.PI * 2, 4, 18), C.silver, { bone: hb, p: [0, 2.16, 0.06], r: [Math.PI / 2 - 0.2, 0, 0], shine: 1 });
  for (let k = 0; k < 5; k++) {
    const a = ((k - 2) / 2) * 0.9;
    const p = [Math.sin(a) * 0.1, 2.18, 0.06 + Math.cos(a) * 0.1];
    A(bsBlade3('blitzkrone', [[0, 0], [0.06, 0.03], [0.035, 0.045], [0.12, 0.1], [0.05, 0.05], [0.07, 0.02]], 0.015, 0.005), C.silver, { bone: hb, p, r: [-Math.PI / 2, a, 0], shine: 1, s: [1, 1 + (k === 2 ? 0.6 : 0), 1] });
    if (k % 2 === 0) bsGem3(A, C.glow, [p[0], p[1] + 0.02, p[2] + 0.01], [0.014, 0.02, 0.01], null, hb);
  }
  }
  // --- Flügel ---
  for (const sx of [1, -1]) bsFeatherWing3(b, A, id, sx, J, C, V.wingK || 1.25);
  // Schwanzfedern
  for (let k = 0; k < 7; k++) {
    const a = (k / 6 - 0.5) * 1.3;
    pointAt3(A, horn3(0.55, 0.07, 4), k % 2 ? C.feather : C.featherTip, [Math.sin(a) * 0.05, 1.02, -0.15], [Math.sin(a) * 0.6, -0.5, -1], { bone: k % 2 ? BB3.t1 : BB3.t2, s: [1, 1, 0.22], noShadow: true });
  }
  // --- Sturmspeer: langer Schaft, gezackte Blitzklinge, Silberbeschlag ---
  const G = BS_HARPY_G3, hbR = BB3.haR;
  if (V.weapon === 'fan') {
    // Federfächer: Griff, sieben große Federn im Halbkreis
    A(cyl3(0.022, 0.022, 0.24, 8), C.wood, { bone: hbR, p: [G[0], G[1], G[2] + 0.02], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 7; k++) {
      const a = (k / 6 - 0.5) * 2.0;
      pointAt3(A, horn3(0.55, 0.08, 4), k % 2 ? C.feather : C.featherTip, [G[0], G[1], G[2] + 0.12], [0, Math.sin(a), Math.cos(a)], { bone: hbR, s: [0.25, 1, 1], top: C.featherTip, topK: 0.6, noShadow: true });
    }
    bsGem3(A, C.glow, [G[0], G[1], G[2] + 0.14], [0.02, 0.03, 0.02], null, hbR);
    return bsRes3(id, rig, J, 2.35, V.worldH);
  }
  if (V.weapon === 'claws') {
    for (const hbx of [BB3.haL, BB3.haR]) {
      const sx = hbx === BB3.haL ? 1 : -1;
      const c = bsLerp3(P[sx].W, P[sx].Hd, 0.8);
      for (let k = 0; k < 3; k++) bsSpike3(A, 0.16, 0.014, C.glow, [c[0] + sx * 0.02, c[1] - 0.04, c[2] + (k - 1) * 0.03], [sx * 0.2, -1, 0.5], { bone: hbx, mat: 'glow', seg: 4 });
    }
    return bsRes3(id, rig, J, 2.35, V.worldH);
  }
  A(cyl3(0.025, 0.028, 2.0, 8), C.wood, { bone: hbR, p: [G[0], G[1], G[2] + 0.25], r: [Math.PI / 2, 0, 0] });
  for (const z of [-0.1, 0.1, 1.2]) A(cyl3(0.035, 0.035, 0.04, 8), C.silver, { bone: hbR, p: [G[0], G[1], G[2] + z], r: [Math.PI / 2, 0, 0], shine: 1 });
  A(bsBlade3('sturmspeer', [[0, 0.05], [0.12, 0.08], [0.08, 0.02], [0.24, 0.06], [0.42, 0], [0.24, -0.06], [0.08, -0.02], [0.12, -0.08], [0, -0.05]], 0.025, 0.008), C.silver, { bone: hbR, p: [G[0], G[1], G[2] + 1.22], top: C.silverTop, shine: 1 });
  A(box3(), C.glow, { bone: hbR, p: [G[0], G[1], G[2] + 1.42], s: [0.03, 0.018, 0.3], mat: 'glow', noShadow: true });
  return bsRes3(id, rig, J, 2.35, V.worldH);
}
const BS_TEMPESTRA3 = {
  skin: '#d8ccdc', skinTop: '#f0e8f4', eye: '#cfe8ff', hair: '#e8eef8', feather: '#e8eef8', featherTip: '#6a7a9a', featherB: '#9aa6c0', wingBone: '#4a5a8a', wingTop: '#8a9ac8',
  leg: '#c8b070', legD: '#8a7444', claw: '#2a2a32', silver: '#9aa8c0', silverTop: '#e0e8f4', glow: '#cfe8ff', wood: '#2a2e3a', wingK: 1.3, worldH: 6.2
};
MON3_BUILD.tempestra = (b) => bsHarpy3(b, 'tempestra', BS_TEMPESTRA3);
BOSS3.tempestra = {
  kind: 'biped', wings: true, tail: true, fx: 'himmel', emit: 'weapon', melee: ['thrust', 'claw', 'sweep'], float: 0.55, blob: 1.1, dome: 1.4,
  pts: BS_HARPY_PTS3, deathPts: ['core', 'mouth', 'back', 'weapon'], skyAt: 'sky', gait: 0.7, emi: [0.05, 0.06, 0.1],
  base: { aRx: -0.35, aRe: -0.9, aRz: 0.15, aLz: 0.3, aLe: -0.6, wing: 0.85, flapAmp: 0.28, flapHz: 1.1 },
  // sie schwebt: Flügel bleiben offen und schlagen langsam, auch beim Laufen
  anim(T, c, e, stage) {
    if (stage !== 'pre' || c.corpse) return;
    if (T.wing < 0.7) T.wing = 0.75;
    if (T.flapAmp < 0.25) { T.flapAmp = 0.3; T.flapHz = c.moving ? 1.6 : 1.1; }
  },
  // Gewitterwolke über ihr, Blitze springen zum Speer, Federn wirbeln
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.tempestra, 'crown', _b3P);
    const cx = _b3P.x, cy = _b3P.y + 2.6, cz = _b3P.z;
    for (let i = 0; i < 5; i++) bsSmoke3(h, cx + Math.sin(i * 1.26 + t * 0.25) * 1.3, cy + Math.cos(i * 2.1) * 0.2, cz + Math.cos(i * 1.26 + t * 0.25) * 1.0, 1.4 + 0.3 * Math.sin(t + i), '#3a4058', 0.5);
    if ((t * 2.9) % 1 < 0.16) {
      _b3P2.set(cx + Math.sin(t * 7) * 0.8, cy - 0.2, cz);
      bsPtA3(a, BOSS3.tempestra, 'weapon', _b3N);
      if (_b3N.distanceTo(_b3P2) < 7) bsBolt3(h, _b3P2, _b3N, th, 0.03, 0.9, 6);
    }
    for (let i = 0; i < 3; i++) {
      const v = (t * 0.4 + i / 3) % 1;
      const ang = t * 1.5 + i * 2.1;
      bsSprite3(h, e.x * U3 + Math.cos(ang) * 1.6, 0.3 + v * 3, feetY(e) * U3 + Math.sin(ang) * 1.6, 0.18, 'spark', th.mid, 0.7 * (1 - v));
    }
  }
};
