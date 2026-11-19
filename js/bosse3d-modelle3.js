// Bosse in 3D, Paket 3 (seit 14.82; Baukasten und Animation in bosse3d.js, Paket 1/2 in bosse3d-modelle.js und
// bosse3d-modelle2.js): die Bosse der Dungeons (auch Riss-Dungeons und Wellenmeister der Arena, das sind dieselben
// Arten) und die 40 Wächter der zehn Instanzen. Vorher waren sie das vergrößerte Familienmodell ihrer Vorlage (look)
// mit Krone, Leuchtkugeln und Bodenring und bewegten sich wie jedes Monster.
// Neu in diesem Paket:
// - Spinne (eigener Bauplan auf dem Vierbeiner-Skelett mit vier weiteren Beinen, eigene Beinbewegung)
// - Wächter-Zweibeiner (bsWard3): ein Baukasten aus Gestalt (Riese, Hüne, Mensch, Gewand), Kopf (Troll, Stier, Yeti,
//   Fels, Schädel, Schlund, Bandit, Kapuze), Bedeckung (Fell, Fels, Kristall, Eis, Magma, Knochen) und Zubehör/Waffe
// - Abwandlungen der Baupläne aus Paket 1 und 2 (Wolf, Bär, Lich, Herrin, Ritter, Harpyie, Dämon, Drache, Naga, Ork)
// Je Wesen eigene Farben, eigener Kopf, eigenes Zubehör, eigene Waffe und eigene Dauereffekte. Alle Maße im Modell;
// worldH bestimmt die Grundgröße, der Kampfkreis (Treffer, Reichweiten) bleibt unverändert.

// --- Dauereffekte als Bausteine (kurz beschreibbar je Boss) -------------------------------------------------
// q.k: rise (Funken/Glut steigen auf), smoke (Rauch/Nebel steigt auf), drip (Tropfen fallen), flame (Flammen an einem
// Punkt), orbit (kreisende Splitter/Flammen), bolt (kleine Blitze zwischen zwei Punkten), ground (Nebel am Boden),
// snow (Flocken rieseln), pulse (pulsierendes Leuchten an einem Punkt)
function bsAmb3(id, parts) {
  return function (h, a, e, t, th) {
    if (!a.bones) return;
    const D = BOSS3[id];
    for (const q of parts) bsAmbPart3(h, a, D, e, t, th, q);
  };
}
function bsAmbPart3(h, a, D, e, t, th, q) {
  const n = q.n || 4, sp = q.sp || 0.5, r = q.r == null ? 0.6 : q.r;
  if (q.k === 'orbit') return bsOrbit3(h, a, e, t, th, D, n, q.R || 1.4, q.tex || 'shard');
  if (q.k === 'ground') {
    const x0 = e.x * U3, z0 = feetY(e) * U3;
    for (let i = 0; i < n; i++) {
      const v = (t * sp + i / n) % 1;
      bsSmoke3(h, x0 + Math.sin(i * 2.3 + t * 0.1) * r, 0.15 + v * 0.5, z0 + Math.cos(i * 1.7) * r * 0.9, (q.s || 1) * (0.8 + v), q.col || th.dark, (q.op || 0.25) * Math.sin(Math.PI * v));
    }
    return;
  }
  bsPtA3(a, D, q.at || 'back', _b3P);
  const x = _b3P.x, y = _b3P.y, z = _b3P.z;
  if (q.k === 'rise') {
    for (let i = 0; i < n; i++) {
      const v = (t * sp + i / n) % 1;
      bsSprite3(h, x + Math.sin(i * 2.3 + t * 0.4) * r, y + v * (q.h || 1.8), z + Math.cos(i * 1.7) * r, (q.s || 0.18) * (q.tex === 'flame' ? 1 - v * 0.5 : 1), q.tex || 'spark', q.col || (i % 2 ? th.mid : th.core), (q.op || 0.85) * (1 - v));
    }
  } else if (q.k === 'smoke') {
    for (let i = 0; i < n; i++) {
      const v = (t * sp + i / n) % 1;
      bsSmoke3(h, x + Math.sin(i * 2.3) * r, y - 0.3 + v * (q.h || 2.2), z + Math.cos(i * 1.7) * r, (q.s || 0.6) + v * 1.2, q.col || th.dark, (q.op || 0.35) * Math.sin(Math.PI * v));
    }
  } else if (q.k === 'drip') {
    for (let i = 0; i < n; i++) {
      const v = (t * sp + i / n) % 1;
      bsSprite3(h, x + Math.sin(i * 2.1) * r, y - v * v * (q.h || 1.4), z + Math.cos(i * 1.4) * r, q.s || 0.14, q.tex || 'disc', q.col || th.mid, (q.op || 0.85) * (1 - v));
    }
  } else if (q.k === 'flame') {
    for (let i = 0; i < n; i++) {
      const v = (t * (sp || 1.5) + i / n) % 1;
      bsSprite3(h, x + Math.sin(i * 2.7) * r * 0.4, y + v * (q.h || 0.9), z + Math.cos(i * 1.9) * r * 0.4, (q.s || 0.6) * (1 - v * 0.6), 'flame', i % 2 ? q.col || th.mid : th.core, (q.op || 0.7) * (1 - v));
    }
  } else if (q.k === 'snow') {
    for (let i = 0; i < n; i++) {
      const v = (t * sp + i / n) % 1;
      bsSprite3(h, x + Math.sin(i * 2.3) * r, y + 0.6 - v * (q.h || 3), z + Math.cos(i * 1.7) * r, q.s || 0.15, 'spark', q.col || th.core, 0.75 * (1 - v));
    }
  } else if (q.k === 'pulse') {
    bsSprite3(h, x, y, z, q.s || 0.8, 'disc', q.col || th.mid, (q.op || 0.3) + 0.15 * Math.sin(t * (q.sp || 2.6)));
  } else if (q.k === 'bolt') {
    if ((t * (q.sp || 2.7)) % 1 < 0.16) {
      bsPtA3(a, D, q.to || 'core', _b3N);
      if (_b3N.distanceTo(_b3P) < 7) bsBolt3(h, _b3P, _b3N, th, q.w || 0.025, 0.9, 6);
    }
  }
}

// ============================================================================================================
// Spinnen: Spinnenkönigin (Spinnenhöhle) und Glimra, die Splitterweberin (Spiegelgruft)
// Vorderleib (Kopfbruststück) mit acht Augen, Kieferklauen mit Giftfängen und Tastern, großer Hinterleib mit Zeichnung,
// Spinnwarzen und Borsten, acht lange Beine aus drei Gliedern mit Gelenkknoten, Stacheln und Krallen. Skelett: das des
// Vierbeiners (Beinpaare 1 und 4, Hinterleib am Schwanz, Taster an den Ohrknochen) und vier weitere Beine (Paare 2, 3);
// alle Beine bewegt die eigene Beinbewegung (Wechselgang, Tasten, Aufbäumen, Vorderbeine heben, Tod: auf den Rücken,
// Beine eingerollt). Königin: Krone aus Chitinzacken, violett leuchtende Totenkopfzeichnung, Eikokons an den Flanken,
// Spinnfäden. Glimra: Leib aus Spiegelglas, Kristallsplitter auf dem Hinterleib, gläserne Beine mit Kristallstacheln.
// ============================================================================================================
const BS_SPI_J3 = {
  body: [0, 0.82, 0.1], chest: [0, 0.84, 0.4], neck: [0, 0.86, 0.6], head: [0, 0.88, 0.7], jaw: [0, 0.8, 0.82],
  tail: [[0, 0.9, -0.2], [0, 1.0, -0.7], [0, 0.96, -1.25]],
  fl: [[0.2, 0.82, 0.48], [0.62, 1.42, 0.98], [0.95, 0.62, 1.48], [1.05, 0.02, 1.78]],
  bl: [[0.2, 0.8, -0.02], [0.72, 1.34, -0.5], [1.12, 0.52, -1.05], [1.26, 0.02, -1.36]],
  l2: [[0.24, 0.82, 0.34], [0.86, 1.44, 0.56], [1.36, 0.56, 0.86], [1.56, 0.02, 0.96]],
  l3: [[0.24, 0.81, 0.15], [0.9, 1.4, -0.06], [1.4, 0.53, -0.36], [1.58, 0.02, -0.52]],
  ear: [0.11, 0.8, 0.84]
};
// Beine: [Oberglied, Mittelglied, Endglied, Seite, Paar]; Paare 2 und 3 hängen als Knochen 23–34 am Vorderleib
const BS_SPI_LEGS3 = [
  [BQ3.upFL, BQ3.loFL, BQ3.pwFL, 1, 0], [BQ3.upFR, BQ3.loFR, BQ3.pwFR, -1, 0], [23, 24, 25, 1, 1], [26, 27, 28, -1, 1],
  [29, 30, 31, 1, 2], [32, 33, 34, -1, 2], [BQ3.upBL, BQ3.loBL, BQ3.pwBL, 1, 3], [BQ3.upBR, BQ3.loBR, BQ3.pwBR, -1, 3]
];
const bsSpiLeg3 = (i) => [BS_SPI_J3.fl, BS_SPI_J3.l2, BS_SPI_J3.l3, BS_SPI_J3.bl][i];
function bsSpiderRig3(J) {
  const rig = bsQuadRig3(J);
  for (const L of [J.l2, J.l3]) {
    for (const sx of [1, -1]) {
      rig.push({ pos: [sx * L[0][0], L[0][1], L[0][2]], parent: BQ3.body });
      rig.push({ pos: [sx * L[1][0], L[1][1], L[1][2]], parent: rig.length - 1 });
      rig.push({ pos: [sx * L[2][0], L[2][1], L[2][2]], parent: rig.length - 1 });
    }
  }
  return rig;
}
const BS_SPI_PTS3 = {
  mouth: [BQ3.jaw, [0, 0.68, 0.92]], emit: [BQ3.head, [0, 0.9, 0.86]], core: [BQ3.chest, [0, 0.95, 0.4]], back: [BQ3.t2, [0, 1.5, -0.75]],
  weapon: [BQ3.pwFL, [1.0, 0.3, 1.62]], sky: [BQ3.t2, [0, 1.6, -0.75]], tail: [BQ3.t3, [0, 0.95, -1.6]], crown: [BQ3.chest, [0, 1.12, 0.42]]
};
// Punkt auf der Oberfläche eines Leibes aus loft3-Zeilen (z, a: 0 oben … ±π/2 an den Flanken), k: Abstand (1 = Haut)
function bsLoftAt3(rows, z, a, k = 1) {
  let i = 0;
  for (; i < rows.length - 2; i++) if ((z - rows[i][0]) * (z - rows[i + 1][0]) <= 0) break;
  const r0 = rows[i], r1 = rows[i + 1];
  const f = Math.max(0, Math.min(1, (z - r0[0]) / (r1[0] - r0[0] || 1)));
  const L = (j) => r0[j] + (r1[j] - r0[j]) * f;
  const ca = Math.cos(a);
  return [Math.sin(a) * L(2) * k, L(1) + (ca >= 0 ? L(3) : L(4)) * ca * k, z];
}
function bsSpider3(b, id, V) {
  const A = adder(b, null);
  const J = BS_SPI_J3, C = V;
  const rig = bsSpiderRig3(J);
  const chit = { top: C.top, topK: 0.55, shade: 0.3, shadowExact: true };
  // --- Vorderleib (Kopfbruststück) ---
  const front = [[-0.14, 0.84, 0.12, 0.1, 0.1], [0.0, 0.85, 0.27, 0.17, 0.15], [0.2, 0.87, 0.33, 0.2, 0.17], [0.42, 0.88, 0.3, 0.19, 0.16], [0.62, 0.88, 0.22, 0.16, 0.13], [0.78, 0.86, 0.13, 0.11, 0.09], [0.87, 0.85, 0.05, 0.05, 0.04]];
  const fw = bsChain3([[BQ3.body, [0, 0.82, -0.14]], [BQ3.body, J.body], [BQ3.chest, J.chest], [BQ3.neck, J.neck], [BQ3.head, J.head], [BQ3.head, [0, 0.88, 0.9]]]);
  A(bsSkin3(id + ':vorder' + GEO3_LOD, loft3(front, 18, 4), fw), C.body, chit);
  // Rillen vom Kopf strahlenförmig, Mittelgrube
  for (let k = 0; k < 6; k++) {
    const a = (k / 5 - 0.5) * 2.2;
    const p = bsLoftAt3(front, 0.2, a * 0.6, 1.0);
    A(box3(), C.dark, { bone: BQ3.body, p: [p[0], p[1] + 0.005, 0.22], r: [0.15, 0, -a * 0.55], s: [0.012, 0.012, 0.3], noShadow: true });
  }
  A(ball(8), C.dark, { bone: BQ3.body, p: [0, 1.05, 0.18], s: [0.05, 0.02, 0.07], noShadow: true });
  // --- Hinterleib ---
  const ab = C.abd || 1;
  const back = [[-0.12, 0.88, 0.1, 0.1, 0.08], [-0.3, 0.97, 0.36 * ab, 0.33 * ab, 0.25 * ab], [-0.55, 1.04, 0.52 * ab, 0.48 * ab, 0.36 * ab], [-0.86, 1.06, 0.58 * ab, 0.53 * ab, 0.4 * ab], [-1.16, 1.02, 0.52 * ab, 0.47 * ab, 0.36 * ab], [-1.42, 0.97, 0.34 * ab, 0.3 * ab, 0.25 * ab], [-1.58, 0.95, 0.12, 0.1, 0.1]].reverse();
  const bw = bsChain3([[BQ3.body, [0, 0.84, -0.06]], [BQ3.t1, J.tail[0]], [BQ3.t2, J.tail[1]], [BQ3.t3, J.tail[2]], [BQ3.t3, [0, 0.95, -1.62]]]);
  A(bsSkin3(id + ':hinter' + GEO3_LOD, loft3(back, 20, 5), bw), C.abdCol || C.body, { top: C.abdTop || C.top, topK: 0.5, shade: 0.32, shadowExact: true });
  A(cyl3(0.08, 0.1, 0.16, 10), C.dark, { bone: BQ3.t1, p: [0, 0.87, -0.14], r: [Math.PI / 2, 0, 0] });
  // Zeichnung oben (Königin: Totenkopf aus Leuchtflecken; Glimra: Splitterlinien)
  if (V.skullMark) {
    for (const [z, a, s] of [[-0.62, 0, 0.13], [-0.74, 0.32, 0.1], [-0.74, -0.32, 0.1], [-0.98, 0.17, 0.07], [-0.98, -0.17, 0.07], [-1.12, 0, 0.06], [-0.46, 0.52, 0.06], [-0.46, -0.52, 0.06]]) {
      const p = bsLoftAt3(back, z, a, 1.0);
      A(ball(8), C.mark, { bone: aelBoneAt3(bw, p), p, s: [s * 1.5, s * 0.45, s * 1.5], r: [0, 0, -a], mat: 'glow', noShadow: true });
    }
    for (let k = 0; k < 8; k++) {
      const z = -0.4 - k * 0.13;
      for (const sx of [-1, 1]) {
        const p = bsLoftAt3(back, z, sx * 0.95, 1.0);
        A(ball(6), C.mark2, { bone: aelBoneAt3(bw, p), p, s: [0.035, 0.03, 0.05], mat: 'glow', noShadow: true });
      }
    }
  }
  if (V.shards) {
    // Glimra: Kristallsplitter wachsen aus dem Hinterleib, leuchtende Bruchlinien
    for (let k = 0; k < 11; k++) {
      const z = -0.38 - (k % 6) * 0.19, a = (k < 6 ? 0.25 : -0.4) + Math.sin(k * 2.1) * 0.35;
      const p = bsLoftAt3(back, z, a, 0.93);
      const len = 0.22 + 0.16 * Math.abs(Math.sin(k * 1.7));
      const bn = aelBoneAt3(bw, p);
      A(bsOcta3(), C.gem, { bone: bn, p: [p[0] + Math.sin(a) * len * 0.35, p[1] + Math.cos(a) * len * 0.4, p[2]], r: [0.3 * Math.sin(k), k, -a * 0.8], s: [0.05, len * 0.5, 0.05], top: C.gemTop, topK: 0.5, shine: 1 });
      if (k % 2 === 0) A(bsOcta3(), C.mark, { bone: bn, p: [p[0] + Math.sin(a) * len * 0.35, p[1] + Math.cos(a) * len * 0.4, p[2]], r: [0.3 * Math.sin(k), k, -a * 0.8], s: [0.025, len * 0.4, 0.025], mat: 'glow', noShadow: true });
    }
    for (let k = 0; k < 7; k++) {
      const p = bsLoftAt3(back, -0.45 - k * 0.15, 0.6 * Math.sin(k * 2.4), 1.0);
      A(box3(), C.mark, { bone: aelBoneAt3(bw, p), p, r: [0.2, k * 0.9, 0], s: [0.014, 0.012, 0.22], mat: 'glow', noShadow: true });
    }
  }
  // Borsten auf dem Hinterleib
  const bristles = [];
  for (let k = 0; k < (V.shards ? 10 : 22); k++) {
    const z = -0.32 - (k % 11) * 0.11, a = (k < 11 ? 1 : -1) * (0.6 + 0.5 * Math.abs(Math.sin(k * 1.3)));
    const p = bsLoftAt3(back, z, a, 0.98);
    bristles.push([p, [Math.sin(a), Math.cos(a) + 0.3, -0.6], 0.12, 0.022, aelBoneAt3(bw, p)]);
  }
  bsTufts3(A, bristles, C.hair, C.top);
  // Spinnwarzen
  for (const sx of [-1, 0, 1]) bsSpike3(A, 0.12, 0.035, C.dark, [sx * 0.05, 0.92 - Math.abs(sx) * 0.02, -1.56], [sx * 0.3, -0.3, -1], { bone: BQ3.t3, seg: 5 });
  if (V.cocoons) {
    // Eikokons an den Flanken, mit Fäden umsponnen
    for (const [z, sx, s] of [[-0.7, 1, 0.15], [-1.05, 1, 0.12], [-0.86, -1, 0.16], [-1.22, -1, 0.1]]) {
      const p = bsLoftAt3(back, z, sx * 1.5, 1.02);
      const bn = aelBoneAt3(bw, p);
      const c = [p[0] + sx * s * 0.45, p[1] - 0.04, p[2]];
      A(ball(10), C.silk, { bone: bn, p: c, s: [s * 0.75, s * 0.8, s * 1.35], top: '#ffffff', topK: 0.5, shade: 0.25 });
      for (let k = 0; k < 3; k++) A(torus3(1, 0.05, Math.PI * 2, 3, 10), C.silkD, { bone: bn, p: [c[0], c[1], c[2] + (k - 1) * s * 0.55], r: [0, 0.3 * (k - 1), 0], s: [s * 0.74, s * 0.8, s * 0.74], noShadow: true });
    }
    // Fäden von den Spinnwarzen
    for (let k = 0; k < 3; k++) A(tube3([[0, 0.92, -1.6], [(k - 1) * 0.12, 0.6, -1.8], [(k - 1) * 0.25, 0.05, -1.95 - k * 0.05]], 0.008, 0.005, 8, 3), C.silk, { bone: BQ3.t3, noShadow: true });
  }
  // --- Kopf: acht Augen, Kieferklauen mit Giftfängen, Taster ---
  const hb = BQ3.head, jb = BQ3.jaw;
  A(ball(14), C.body, { bone: hb, p: [0, 0.95, 0.72], s: [0.17, 0.12, 0.15], top: C.top, topK: 0.5, shade: 0.25 });
  for (const [x, y, z, s] of [[0.055, 0.95, 0.85, 0.042], [0.13, 0.94, 0.8, 0.03], [0.04, 1.03, 0.79, 0.026], [0.1, 1.02, 0.74, 0.022]]) {
    for (const sx of [-1, 1]) {
      A(ball(8), '#08060a', { bone: hb, p: [sx * x, y, z - 0.004], s: s * 1.25, noShadow: true });
      A(ball(8), C.eye, { bone: hb, p: [sx * x, y, z + s * 0.25], s: [s * 0.9, s * 0.9, s * 0.6], mat: 'glow' });
    }
  }
  for (const sx of [-1, 1]) {
    // Kieferklaue: dickes Grundglied, Giftfang nach innen gebogen
    A(tubeProfile3([[sx * 0.06, 0.84, 0.82], [sx * 0.068, 0.77, 0.87], [sx * 0.062, 0.71, 0.89]], [0.055, 0.05, 0.04], 6, 8), C.body, { bone: jb, top: C.top, topK: 0.5, shade: 0.25 });
    A(tube3([[sx * 0.062, 0.71, 0.89], [sx * 0.05, 0.645, 0.92], [sx * 0.015, 0.615, 0.875]], 0.022, 0.004, 10, 6), C.fang, { bone: jb, shine: 0.9 });
    A(ball(6), C.venom, { bone: jb, p: [sx * 0.016, 0.61, 0.875], s: 0.014, mat: 'glow', noShadow: true });
    for (let k = 0; k < 3; k++) bsSpike3(A, 0.05, 0.01, C.hair, [sx * 0.1, 0.8 - k * 0.06, 0.86], [sx, 0.2, 0.4], { bone: jb, seg: 4, noShadow: true });
    // Taster (an den Ohrknochen)
    const eb = sx > 0 ? BQ3.earL : BQ3.earR;
    const T0 = [sx * J.ear[0], J.ear[1], J.ear[2]];
    A(tubeProfile3([T0, [sx * 0.17, 0.72, 0.98], [sx * 0.2, 0.58, 1.1], [sx * 0.19, 0.42, 1.16]], [0.035, 0.032, 0.03, 0.026], 8, 6), C.leg, { bone: eb, top: C.top, topK: 0.5 });
    A(ball(8), C.legD, { bone: eb, p: [sx * 0.19, 0.42, 1.16], s: [0.035, 0.03, 0.04], noShadow: true });
  }
  if (V.crown) {
    // Krone aus Chitinzacken auf dem Vorderleib, ein Leuchtstein in der Mitte
    for (let k = 0; k < 9; k++) {
      const a = (k / 8 - 0.5) * 2.6;
      const p = bsLoftAt3(front, 0.44 - Math.abs(a) * 0.08, a * 0.55, 0.96);
      bsSpike3(A, 0.14 + 0.12 * Math.cos(a * 1.2), 0.03, C.crown, p, [Math.sin(a) * 0.5, 1, 0.25], { bone: BQ3.chest, top: C.top, shine: 0.7 });
    }
    bsGem3(A, C.mark, [0, 1.09, 0.5], [0.04, 0.05, 0.03], null, BQ3.chest);
  }
  // --- Beine ---
  for (const [ub, lb, pb, sx, i] of BS_SPI_LEGS3) {
    const L = bsSpiLeg3(i).map((q) => [sx * q[0], q[1], q[2]]);
    const [H, K, Ak, T] = L;
    const thick = (i === 0 || i === 3 ? 1.08 : 1) * (C.legK || 1);
    const pts = [H, bsLerp3(H, K, 0.5), K, bsLerp3(K, Ak, 0.5), Ak, bsLerp3(Ak, T, 0.55), T];
    const rad = [0.07, 0.068, 0.058, 0.05, 0.042, 0.032, 0.012].map((r) => r * thick);
    A(bsSkin3(id + ':bein' + i + sx + GEO3_LOD, tubeProfile3(pts, rad, 22, 8), bsChain3([[ub, H], [lb, K], [pb, Ak], [pb, T]])), C.leg, { top: C.top, topK: 0.5, shade: 0.3, shadowExact: true });
    // Gelenkknoten mit Farbband, Stacheln auf Ober- und Mittelglied
    A(ball(8), C.legD, { bone: lb, p: K, s: 0.07 * thick, top: C.top });
    A(ball(8), C.legD, { bone: pb, p: Ak, s: 0.052 * thick });
    A(torus3(0.055, 0.016, Math.PI * 2, 3, 10), C.band, { bone: lb, p: bsLerp3(K, Ak, 0.12), r: [Math.atan2(Ak[2] - K[2], Ak[1] - K[1]) + Math.PI / 2, 0, -sx * 0.4], s: thick, mat: V.bandGlow ? 'glow' : 'lit', noShadow: true });
    for (let k = 0; k < 3; k++) {
      const p = bsLerp3(H, K, 0.3 + k * 0.25), q = bsLerp3(K, Ak, 0.25 + k * 0.25);
      if (V.shards) {
        A(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: ub, p: [p[0], p[1] + 0.05, p[2]], r: [0, 0, -sx * 0.4], s: [0.022, 0.08, 0.022], shine: 1, noShadow: true });
        A(bsOcta3(), C.gem, { bone: lb, p: [q[0] + sx * 0.03, q[1], q[2]], r: [0, 0, -sx * 1.0], s: [0.02, 0.07, 0.02], shine: 1, noShadow: true });
      } else {
        bsSpike3(A, 0.09, 0.012, C.hair, p, [sx * 0.3, 1, 0.2], { bone: ub, seg: 4, noShadow: true });
        bsSpike3(A, 0.08, 0.011, C.hair, q, [sx * 1, 0.2, 0.3], { bone: lb, seg: 4, noShadow: true });
      }
    }
    bsSpike3(A, 0.08, 0.016, C.fang, T, [sx * 0.2, -1, 0.3], { bone: pb, seg: 4, shine: 0.8, noShadow: true });
  }
  return bsRes3(id, rig, J, 1.6, V.worldH);
}
// Beinbewegung der Spinne (nach dem Vierbeiner-Teil, BOSS3[id].anim): Wechselgang zu je vier Beinen, in der Ruhe
// tasten einzelne Beine, Aufbäumen und Vorderbeine heben, Prankenhieb mit dem linken Vorderbein, Ducken (Füße bleiben
// etwa am Boden), Tod: auf den Rücken gedreht, Beine eingerollt
function bsSpiderPost3(P, c, e, stage, B) {
  if (stage !== 'post') return;
  const S = c.S, mv = c.moving, dash = !!(e && e.dash);
  const die = Math.max(0, Math.min(1, P.droop));
  const roll = bsSmooth3(P.roll);
  const body = B[BQ3.body];
  body.rotation.z = Math.PI * 0.94 * roll;
  body.position.x -= 0.35 * roll;
  body.position.y += 0.12 * roll;
  const rear = P.rear, crouch = P.crouch;
  for (const [ub, lb, pb, sx, i] of BS_SPI_LEGS3) {
    let swing = 0, lift = 0;
    if (mv) {
      const ph = S.walk * 1.5 + ((i + (sx > 0 ? 0 : 1)) % 2) * Math.PI;
      swing = Math.sin(ph) * (dash ? 0.38 : 0.26);
      lift = Math.max(0, Math.cos(ph)) * (dash ? 0.45 : 0.3);
    } else if (!c.corpse) swing = Math.sin(c.t * 0.9 + i * 1.7 + sx) * 0.05;
    const fr = i === 0 ? 1 : i === 1 ? 0.45 : 0;
    lift += fr * (1.2 * P.legsUp + 0.3 * rear) + 0.16 * crouch + (i === 3 ? 0.45 : i === 2 ? 0.22 : 0) * rear;
    if (i === 0 && sx > 0) lift += 1.1 * P.clawUp;
    if (i === 0 && !mv && !c.corpse) lift += 0.08 * Math.max(0, Math.sin(c.t * 1.3 + sx * 1.9)) * (1 - P.legsUp);
    B[ub].rotation.set(0, -sx * swing + (i === 0 ? -sx * 0.25 * P.legsUp : 0), sx * (lift + 0.35 * die));
    B[lb].rotation.set(0, 0, -sx * (0.22 * crouch + 1.25 * die) + sx * 0.5 * fr * P.legsUp);
    B[pb].rotation.set(0, 0, -sx * (0.18 * crouch + 0.95 * die));
  }
  // Hinterleib: atmet, bleibt beim Aufbäumen unten, hebt sich beim Spinnen (Salve, Meteore)
  const t1 = B[BQ3.t1], t2 = B[BQ3.t2], t3 = B[BQ3.t3];
  t1.rotation.y *= 0.35;
  t2.rotation.y *= 0.3;
  t3.rotation.y *= 0.3;
  t1.rotation.x = 0.03 * Math.sin(c.t * 1.4) + 0.62 * rear - 0.25 * P.glow * (1 - rear);
  t2.rotation.x = 0;
  t3.rotation.x = 0.1 * P.glow;
  const br = 1 + 0.025 * Math.sin(c.t * 1.6);
  t2.scale.set(br, br, 1);
  // Kopf sitzt fest am Vorderleib: nur wenig mitdrehen
  const nk = B[BQ3.neck], hd = B[BQ3.head];
  nk.rotation.x *= 0.25;
  nk.rotation.y *= 0.5;
  hd.rotation.x *= 0.3;
  hd.rotation.y *= 0.45;
  hd.rotation.z *= 0.3;
  // Taster tasten
  for (const [eb, sx] of [[BQ3.earL, 1], [BQ3.earR, -1]]) {
    B[eb].rotation.set(-0.25 * Math.max(0, Math.sin(c.t * 3.1 + sx * 1.4)) - 0.5 * P.jaw, sx * 0.1 * Math.sin(c.t * 2.3), 0);
  }
}
const BS_SPI_BOSS3 = {
  kind: 'quad', spider: true, melee: ['bite', 'claw', 'maul'], blob: 2.2, dome: 1.55, pts: BS_SPI_PTS3, deathPts: ['core', 'back', 'mouth', 'tail'],
  skyAt: 'sky', gait: 1.1, jawOpen: 0.55, anim: bsSpiderPost3
};
MON3_BUILD.spinnenkoenigin = (b) => bsSpider3(b, 'spinnenkoenigin', {
  body: '#24162e', top: '#4a3460', dark: '#100a16', abdCol: '#3e2254', abdTop: '#8a5ab0', leg: '#2a1a34', legD: '#3e2a4c', band: '#b48cff', hair: '#1a1020',
  eye: '#ff4ad8', fang: '#e8dcc0', venom: '#c6f08a', mark: '#c87aff', mark2: '#ff4ad8', crown: '#1a0e22', silk: '#e8e4f0', silkD: '#b8b0c8',
  abd: 1.12, skullMark: true, cocoons: true, crown: true, bandGlow: true, worldH: 3.2
});
BOSS3.spinnenkoenigin = Object.assign({}, BS_SPI_BOSS3, {
  fx: 'brut', emi: [0.06, 0.02, 0.08],
  // Gift tropft von den Fängen, violetter Brutnebel am Boden, Funken aus der Krone
  ambient: bsAmb3('spinnenkoenigin', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.9, r: 0.08, s: 0.12, col: '#c6f08a' }, { k: 'ground', n: 4, sp: 0.25, r: 1.8, col: '#2a1438', op: 0.3, s: 1.2 }, { k: 'rise', at: 'crown', n: 3, sp: 0.6, r: 0.2, h: 1.0, s: 0.14 }])
});
MON3_BUILD.glimra = (b) => bsSpider3(b, 'glimra', {
  body: '#5a6ab8', top: '#b8c8f8', dark: '#2a3268', abdCol: '#6a7ac8', abdTop: '#d8e4ff', leg: '#7a8ad8', legD: '#4a5aa8', band: '#ffffff', hair: '#c8d8ff',
  eye: '#e8f6ff', fang: '#e8f0ff', venom: '#ffffff', mark: '#e8f6ff', gem: '#a8c0ff', gemTop: '#f0f6ff', legK: 0.85, shards: true, bandGlow: true, worldH: 2.6
});
BOSS3.glimra = Object.assign({}, BS_SPI_BOSS3, {
  fx: 'spiegel', emi: [0.05, 0.06, 0.12], gait: 1.3,
  // Glassplitter kreisen, Lichtfunken auf dem Hinterleib
  ambient: bsAmb3('glimra', [{ k: 'orbit', n: 4, R: 1.5, tex: 'shard' }, { k: 'rise', at: 'back', n: 3, sp: 0.5, r: 0.4, h: 1.0, s: 0.14 }])
});

// ============================================================================================================
// Wächter-Zweibeiner (bsWard3): ein Baukasten für die zweibeinigen Wächter und Dungeon-Bosse ohne eigenen Bauplan.
// Gestalt (V.frame): giant (Riese, stark gebeugt, riesige Hände), brute (Hüne, Ork-Gestalt), man (Mensch, aufrecht),
// robe (Gewand bis zum Boden, schwebt). Kopf (V.head, im eigenen Rahmen gebaut, Größe 1): troll, bull, ape, golem,
// skull, maw, bandit. Bedeckung (V.cover): fur, stone, crystal, ice, magma, bone. Zubehör: Schulterstücke (V.pad),
// Helm/Krone (V.helm), Bart (V.beard), Hörner (V.horns), Bauch (V.belly), Schürze, Umhang, Lendentuch, Ketten, Gürtel,
// Rücken (V.back: boulders, crystals, pipes, shield), glühendes Herz (V.core), Hufe (V.hooves), Fäuste (V.fists).
// Waffe in der rechten Hand (V.weapon): hammer, maul, axe, saber, club, staff, bell, none.
// ============================================================================================================
const BS_BRUTE_J3 = Object.assign({}, BS_ORC_J3, { cape: [[0, 1.84, -0.28], [0, 1.0, -0.4]] });
const BS_WARD_F3 = {
  giant: {
    J: BS_GIANT_J3, H: 2.32, hand: 0.17, head: [0, 2.17, 0.42], hs: 0.19, bulk: 1.4,
    rows: [[0.86, 0, 0.3, 0.24, 0.24], [1.0, 0.02, 0.38, 0.32, 0.26], [1.2, 0.06, 0.42, 0.38, 0.27], [1.4, 0.12, 0.47, 0.36, 0.29], [1.58, 0.18, 0.56, 0.32, 0.33], [1.76, 0.22, 0.62, 0.26, 0.36], [1.9, 0.26, 0.44, 0.18, 0.3], [1.98, 0.29, 0.19, 0.12, 0.15]],
    arm: [0.24, 0.23, 0.17, 0.2, 0.15], leg: [0.26, 0.24, 0.18, 0.19, 0.16]
  },
  brute: {
    J: BS_BRUTE_J3, H: 2.3, hand: 0.13, head: [0, 2.07, 0.3], hs: 0.17, bulk: 1.1,
    rows: [[0.84, 0.0, 0.24, 0.19, 0.19], [0.97, 0.0, 0.31, 0.24, 0.22], [1.14, 0.04, 0.34, 0.29, 0.22], [1.32, 0.08, 0.37, 0.29, 0.23], [1.5, 0.12, 0.48, 0.29, 0.25], [1.66, 0.15, 0.55, 0.27, 0.28], [1.8, 0.15, 0.46, 0.21, 0.27], [1.9, 0.19, 0.19, 0.13, 0.15], [1.99, 0.21, 0.13, 0.1, 0.1]],
    arm: [0.21, 0.2, 0.145, 0.16, 0.12], leg: [0.22, 0.2, 0.145, 0.14, 0.105]
  },
  man: {
    J: BS_KNIGHT_J3, H: 2.42, hand: 0.08, head: [0, 2.24, 0.1], hs: 0.145, bulk: 0.75,
    rows: [[0.98, 0, 0.2, 0.15, 0.16], [1.12, 0, 0.22, 0.16, 0.16], [1.3, 0.02, 0.2, 0.15, 0.13], [1.48, 0.04, 0.25, 0.18, 0.15], [1.66, 0.06, 0.33, 0.2, 0.17], [1.84, 0.07, 0.38, 0.18, 0.18], [1.97, 0.07, 0.3, 0.13, 0.15], [2.06, 0.08, 0.09, 0.07, 0.08], [2.13, 0.08, 0.07, 0.06, 0.06]],
    arm: [0.1, 0.09, 0.07, 0.07, 0.055], leg: [0.13, 0.11, 0.085, 0.075, 0.06]
  },
  robe: {
    J: BS_LICH_J3, H: 2.42, hand: 0.06, head: [0, 2.15, 0.12], hs: 0.135, bulk: 0.8, noLegs: true,
    rows: [[0.04, 0.0, 0.48, 0.42, 0.46], [0.3, 0, 0.41, 0.35, 0.38], [0.6, 0, 0.33, 0.27, 0.3], [0.9, 0, 0.27, 0.22, 0.24], [1.1, 0.01, 0.24, 0.19, 0.2], [1.3, 0.03, 0.25, 0.18, 0.18], [1.5, 0.05, 0.31, 0.2, 0.2], [1.7, 0.07, 0.37, 0.19, 0.2], [1.86, 0.08, 0.31, 0.15, 0.17], [1.96, 0.09, 0.1, 0.08, 0.08]],
    arm: [0.06, 0.055, 0.04, 0.04, 0.035]
  }
};
for (const k in BS_WARD_F3) BS_WARD_F3[k].P = bsBipJ3(BS_WARD_F3[k].J);
// Punkt auf dem Leib (Zeilen wie bsTorso3: y, Mitte z, halbe Breite, vorn, hinten), a: 0 vorn, ±π/2 Flanke, π hinten
function bsTorsoAt3(rows, y, a, k = 1) {
  let i = 0;
  for (; i < rows.length - 2; i++) if ((y - rows[i][0]) * (y - rows[i + 1][0]) <= 0) break;
  const r0 = rows[i], r1 = rows[i + 1];
  const f = Math.max(0, Math.min(1, (y - r0[0]) / (r1[0] - r0[0] || 1)));
  const L = (j) => r0[j] + (r1[j] - r0[j]) * f;
  const ca = Math.cos(a);
  return [Math.sin(a) * L(2) * k, y, L(1) + (ca >= 0 ? L(3) : L(4)) * ca * k];
}
const bsFels3 = () => geo3('bs:fels', () => smoothGeo(new THREE.DodecahedronGeometry(1, 1)));
const bsFelsK3 = () => geo3('bs:felsK', () => new THREE.DodecahedronGeometry(1, 0));
// Griffpunkt der rechten Hand und Punkte für Effekte je Gestalt (Waffenspitze wl über dem Griff)
function bsWardPts3(fr, wl, o = {}) {
  const F = BS_WARD_F3[fr], P = F.P, J = F.J;
  const G = bsLerp3(P[-1].W, P[-1].Hd, 0.5);
  const hp = (x, y, z) => [F.head[0] + x * F.hs, F.head[1] + y * F.hs, F.head[2] + z * F.hs];
  const tip = [G[0], G[1] + (o.tipY || 0), G[2] + wl];
  const R = {
    mouth: [BB3.jaw, hp(0, -0.55, 1.0)], emit: [o.emitHand ? BB3.haL : BB3.jaw, o.emitHand ? P[1].Hd : hp(0, -0.55, 1.0)], core: [BB3.chest, [0, J.chestY + 0.08, J.hunch * 0.65 + 0.35 * F.bulk]],
    back: [BB3.chest, [0, J.shY + 0.12, J.hunch * 0.65 - 0.3 * F.bulk]], crown: [BB3.head, hp(0, 1.3, 0)], weapon: [BB3.haR, tip], sky: [BB3.haR, tip],
    fist: [BB3.haL, P[1].Hd], hand: [BB3.haL, P[1].Hd]
  };
  if (o.emitAt) R.emit = R[o.emitAt];
  return R;
}
function bsWard3(b, id, V) {
  const A = adder(b, null);
  const F = BS_WARD_F3[V.frame || 'giant'];
  const J = F.J, P = F.P, C = V;
  const { rig } = bsBipRig3(J);
  const fr = V.frame || 'giant';
  const robe = fr === 'robe';
  const bodyCol = robe ? C.robe : C.skin, bodyTop = robe ? C.robeTop : C.skinTop;
  bsBipBody3(id, A, J, P, { C, rows: F.rows, arm: F.arm, leg: F.leg, noLegs: F.noLegs, torsoCol: C.torso || bodyCol, skinTop: bodyTop, armCol: robe ? C.bone || C.skin : C.armCol || C.skin, legCol: C.legCol || C.skin, shade: 0.3 });
  const rows = F.rows;
  if (robe) {
    // weite Ärmel über den dünnen Armen (oben eng, unten weit)
    for (const sx of [-1, 1]) {
      const [ub, fb] = bsArmB3(sx);
      const Q = P[sx];
      A(bsSkin3(id + ':aermel' + sx + GEO3_LOD, tubeProfile3([Q.S, bsLerp3(Q.S, Q.E, 0.5), Q.E, bsLerp3(Q.E, Q.W, 0.45)], [0.12, 0.13, 0.17, 0.23], 12, 12), bsChain3([[ub, Q.S], [fb, Q.E], [fb, Q.W]])), C.sleeve || C.robe, { top: C.robeTop, shade: 0.3, shadowExact: true });
    }
  }
  const sk = { top: C.skinTop, topK: 0.5, shade: 0.3 };
  const hb = BB3.head, jb = BB3.jaw;
  const AH = bsLocal3(b, V.headAt || F.head, 0, 0, 0, F.hs * (V.headK || 1));
  const yTop = J.shY - 0.02, yLow = J.hipY - 0.05;
  const boneAtY = (y) => (y > J.chestY - 0.1 ? BB3.chest : y > J.waistY - 0.1 ? BB3.spine : BB3.pelvis);
  // Muskeln (nicht beim Gewand und nicht bei Felsleibern)
  if (!robe && !C.torso && !['stone', 'magma', 'crystal', 'ice', 'fur'].includes(V.cover)) {
    for (const sx of [-1, 1]) A(ball(14), C.skin, Object.assign({ bone: BB3.chest, p: bsAdd3(bsTorsoAt3(rows, J.chestY + 0.12, sx * 0.45, 0.82), [0, 0, 0]), s: [0.2 * F.bulk, 0.12 * F.bulk, 0.1 * F.bulk] }, sk));
  }

  // --- Bedeckung ---
  const cover = V.cover;
  if (cover === 'fur') {
    const tufts = [];
    for (let i = 0; i < 6; i++) {
      const y = yLow + (yTop - yLow) * (i / 5);
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI + (k + (i % 2) * 0.5) * (Math.PI * 2 / 7);
        const p = bsTorsoAt3(rows, y, a, 0.96);
        tufts.push([p, [Math.sin(a) * 0.35, -1, Math.cos(a) * 0.35], (0.24 + 0.06 * Math.sin(i * 3 + k)) * F.bulk, 0.085 * F.bulk, boneAtY(y)]);
      }
    }
    for (const sx of [-1, 1]) {
      const [ub, fb] = bsArmB3(sx);
      const Q = P[sx];
      for (let k = 0; k < 4; k++) {
        const p = bsLerp3(Q.S, Q.E, 0.15 + k * 0.25), q = bsLerp3(Q.E, Q.W, 0.1 + k * 0.22);
        const ar = F.arm[1] * 0.9;
        tufts.push([[p[0] + sx * ar, p[1], p[2] - ar * 0.3], [sx * 0.35, -1, -0.15], 0.2 * F.bulk, 0.07 * F.bulk, ub]);
        tufts.push([[q[0] + sx * ar * 0.8, q[1], q[2] - ar * 0.4], [sx * 0.3, -1, -0.35], 0.18 * F.bulk, 0.065 * F.bulk, fb]);
      }
      if (!F.noLegs) {
        const [tb, sb] = bsLegB3(sx);
        for (let k = 0; k < 3; k++) {
          const p = bsLerp3(Q.H, Q.K, 0.2 + k * 0.3), q = bsLerp3(Q.K, Q.A, 0.15 + k * 0.3);
          const lr = F.leg[1] * 0.9;
          tufts.push([[p[0] + sx * lr, p[1], p[2]], [sx * 0.35, -1, 0], 0.22 * F.bulk, 0.075 * F.bulk, tb]);
          tufts.push([[q[0] + sx * lr * 0.8, q[1], q[2] + lr * 0.3], [sx * 0.25, -1, 0.2], 0.2 * F.bulk, 0.07 * F.bulk, sb]);
        }
      }
    }
    bsTufts3(A, tufts, C.fur, C.furTop);
  } else if (cover === 'stone' || cover === 'magma' || cover === 'crystal' || cover === 'ice') {
    // Platten aus Fels (Magma: Basalt mit Glutfugen) bzw. Kristallbüschel, an Brust, Rücken, Armen und Beinen
    const rock = cover === 'stone' || cover === 'magma';
    const plate = (bn, p, s, r) => A(bsFelsK3(), C.stone, { bone: bn, p, s: s.map((q) => q * 0.88), r, top: C.stoneTop, topK: 0.6, shade: 0.3 });
    const gem = (bn, p, d, len, rr) => {
      const l = Math.hypot(...d);
      const q = [p[0] + (d[0] / l) * len * 0.4, p[1] + (d[1] / l) * len * 0.4, p[2] + (d[2] / l) * len * 0.4];
      const rx = Math.acos(Math.max(-1, Math.min(1, d[1] / l)));
      const ry = Math.atan2(d[0], d[2]);
      A(bsOcta3(), C.gem, { bone: bn, p: q, r: [rx, ry, 0], s: [rr, len * 0.5, rr], top: C.gemTop, topK: 0.5, shine: 1 });
      A(bsOcta3(), C.glow, { bone: bn, p: q, r: [rx, ry, 0], s: [rr * 0.5, len * 0.42, rr * 0.5], mat: 'glow', noShadow: true });
    };
    // Brust- und Bauchplatten
    for (const [y, a, s] of [[J.chestY + 0.14, 0.45, 0.22], [J.chestY + 0.14, -0.45, 0.22], [J.waistY + 0.05, 0.2, 0.17], [J.waistY + 0.02, -0.25, 0.16], [J.chestY + 0.1, Math.PI - 0.5, 0.24], [J.chestY + 0.1, Math.PI + 0.5, 0.24], [J.waistY, Math.PI, 0.2]]) {
      const p = bsTorsoAt3(rows, y, a, 0.9);
      if (rock || a > 1.5 || a < -1.5 || V.plates) plate(boneAtY(y), p, [s * F.bulk, s * 0.75 * F.bulk, s * 0.6 * F.bulk], [0.3 * a, a, 0.2]);
    }
    if (!rock) {
      // Kristallbüschel auf Rücken und Schultern
      for (const [y, a, len] of [[yTop, Math.PI - 0.3, 0.55], [yTop - 0.05, Math.PI + 0.35, 0.45], [yTop - 0.25, Math.PI, 0.6], [yTop - 0.35, Math.PI + 0.7, 0.38], [yTop - 0.45, Math.PI - 0.8, 0.35]]) {
        const p = bsTorsoAt3(rows, y, a, 0.85);
        gem(BB3.chest, p, [Math.sin(a) * 0.5, 1, Math.cos(a) * 0.6], len * F.bulk, 0.07 * F.bulk);
      }
    }
    for (const sx of [-1, 1]) {
      const [ub, fb] = bsArmB3(sx);
      const Q = P[sx];
      if (rock) {
        plate(ub, bsAdd3(bsLerp3(Q.S, Q.E, 0.45), [sx * F.arm[1] * 0.7, 0, -0.04]), [F.arm[1] * 0.9, F.arm[1] * 1.3, F.arm[1]], [0.3, sx, 0.4]);
        plate(fb, bsAdd3(bsLerp3(Q.E, Q.W, 0.5), [sx * F.arm[3] * 0.6, 0, -0.03]), [F.arm[3] * 1.05, F.arm[3] * 1.4, F.arm[3] * 1.0], [0.2, -sx, 0.2]);
      } else {
        gem(ub, bsAdd3(Q.S, [sx * 0.08, 0.1, 0]), [sx * 0.5, 1, -0.2], 0.4 * F.bulk, 0.07 * F.bulk);
        gem(ub, bsAdd3(Q.S, [sx * 0.15, 0.02, -0.12]), [sx * 0.9, 0.6, -0.3], 0.3 * F.bulk, 0.055 * F.bulk);
        gem(fb, bsAdd3(bsLerp3(Q.E, Q.W, 0.5), [sx * F.arm[3] * 0.8, 0, -0.04]), [sx, 0.3, -0.5], 0.28 * F.bulk, 0.05 * F.bulk);
      }
      if (!F.noLegs) {
        const [tb, sb] = bsLegB3(sx);
        plate(tb, bsAdd3(bsLerp3(Q.H, Q.K, 0.5), [sx * 0.06, 0, F.leg[1] * 0.6]), [F.leg[1] * 0.9, F.leg[1] * 1.3, F.leg[1] * 0.7], [0.2, 0, 0.1]);
        plate(sb, bsAdd3(bsLerp3(Q.K, Q.A, 0.45), [0, 0, F.leg[3] * 0.7]), [F.leg[3] * 0.9, F.leg[3] * 1.4, F.leg[3] * 0.8], [-0.1, 0.3, 0]);
      }
    }
    // Fugen: leuchtende Adern zwischen den Platten
    if (C.vein) {
      for (const [y, a, rz, l] of [[J.chestY + 0.02, 0.05, 0.3, 0.22], [J.waistY + 0.15, 0.4, -0.6, 0.18], [J.waistY + 0.12, -0.45, 0.7, 0.16], [J.chestY + 0.25, 0.75, 1.1, 0.14], [J.chestY + 0.25, -0.75, -1.1, 0.14], [J.waistY - 0.08, 0, 0.1, 0.14]]) {
        const p = bsTorsoAt3(rows, y, a, 1.0);
        A(box3(), C.vein, { bone: boneAtY(y), p, r: [0, a, rz], s: [0.025, l * F.bulk, 0.02], mat: 'glow', noShadow: true });
      }
      for (const sx of [-1, 1]) {
        const [ub, fb] = bsArmB3(sx);
        A(box3(), C.vein, { bone: ub, p: bsAdd3(bsLerp3(P[sx].S, P[sx].E, 0.6), [0, 0, F.arm[1] * 0.95]), r: [0, 0, sx * 0.5], s: [0.02, 0.18, 0.02], mat: 'glow', noShadow: true });
        A(box3(), C.vein, { bone: fb, p: bsAdd3(bsLerp3(P[sx].E, P[sx].W, 0.4), [0, 0, F.arm[3] * 0.95]), r: [0, 0, -sx * 0.6], s: [0.02, 0.16, 0.02], mat: 'glow', noShadow: true });
      }
    }
  } else if (cover === 'bone') {
    // Knochenleib: Rippenbögen, Wirbel am Rücken, eingewachsene Schädel und Knochen
    for (let k = 0; k < 5; k++) {
      const y = J.chestY + 0.2 - k * 0.1;
      for (const sx of [-1, 1]) {
        const p = bsTorsoAt3(rows, y, sx * 0.75, 1.0);
        A(torus3(1, 0.06, Math.PI * 0.7, 4, 10), C.bone, { bone: boneAtY(y), p: [p[0] * 0.2, y, p[2] - 0.05], r: [Math.PI / 2 - 0.15, 0, sx > 0 ? -0.2 : Math.PI + 0.2], s: [Math.abs(p[0]) * 1.05 + 0.05, (p[2] - rows[0][1]) * 0.9, 0.5], top: C.boneTop, shine: 0.3, noShadow: true });
      }
    }
    for (let k = 0; k < 7; k++) {
      const y = yLow + (yTop - yLow) * (k / 6);
      const p = bsTorsoAt3(rows, y, Math.PI, 1.0);
      A(roundBox(0.1 * F.bulk, 0.07, 0.08, 0.03), C.bone, { bone: boneAtY(y), p, top: C.boneTop, shine: 0.3 });
      bsSpike3(A, 0.12 * F.bulk, 0.03, C.bone, p, [0, 0.4, -1], { bone: boneAtY(y), shine: 0.3 });
    }
    if (V.skulls) {
      for (const [y, a, s] of [[J.waistY + 0.05, 0.35, 0.1], [J.chestY - 0.05, -0.5, 0.09], [J.waistY - 0.08, -0.15, 0.08], [J.chestY + 0.15, Math.PI - 0.6, 0.1], [J.waistY, Math.PI + 0.4, 0.09], [yTop - 0.08, Math.PI * 0.6, 0.08]]) {
        const p = bsTorsoAt3(rows, y, a, 0.95);
        const bn = boneAtY(y);
        A(ball(10), C.bone, { bone: bn, p, s: [s, s * 0.95, s], r: [0, a, 0], top: C.boneTop, shine: 0.3 });
        for (const ex of [-1, 1]) A(ball(6), C.glow, { bone: bn, p: bsAdd3(p, [Math.sin(a) * s * 0.85 + Math.cos(a) * ex * s * 0.38, s * 0.1, Math.cos(a) * s * 0.85 - Math.sin(a) * ex * s * 0.38]), s: s * 0.22, mat: 'glow', noShadow: true });
      }
      // Knochen ragen aus Schultern und Rücken
      for (const [y, a, d, l] of [[yTop, Math.PI - 0.4, [0.3, 1, -0.6], 0.5], [yTop - 0.2, Math.PI + 0.5, [-0.4, 0.8, -0.7], 0.42], [yTop - 0.05, 1.2, [0.8, 0.9, 0], 0.36], [yTop - 0.05, -1.2, [-0.8, 0.9, 0], 0.4]]) {
        const p = bsTorsoAt3(rows, y, a, 0.9);
        const L = Math.hypot(...d), e2 = [p[0] + (d[0] / L) * l, p[1] + (d[1] / L) * l, p[2] + (d[2] / L) * l];
        A(tube3([p, bsLerp3(p, e2, 0.5), e2], 0.045, 0.04, 8, 6), C.bone, { bone: BB3.chest, top: C.boneTop, shine: 0.3 });
        A(ball(8), C.bone, { bone: BB3.chest, p: e2, s: 0.06, top: C.boneTop, shine: 0.3 });
      }
    }
  }
  if (V.belly) {
    // aufgedunsener Bauch (Moorschlund): Wülste, Pusteln, glimmende Nähte
    const p = bsTorsoAt3(rows, J.waistY + 0.02, 0, 0.55);
    A(ball(16), C.belly, { bone: BB3.spine, p, s: [0.48 * F.bulk, 0.42 * F.bulk, 0.4 * F.bulk], top: C.bellyTop, topK: 0.5, shade: 0.3 });
    for (const [dx, dy, s] of [[0.22, 0.12, 0.06], [-0.28, -0.05, 0.07], [0.1, -0.22, 0.05], [-0.12, 0.2, 0.05], [0.3, -0.18, 0.045]]) {
      A(ball(8), C.sac, { bone: BB3.spine, p: [p[0] + dx * F.bulk, p[1] + dy * F.bulk, p[2] + 0.36 * F.bulk - Math.abs(dx) * 0.4], s, top: C.sacTop, shine: 0.6, noShadow: true });
      A(ball(6), C.glow, { bone: BB3.spine, p: [p[0] + dx * F.bulk, p[1] + dy * F.bulk + s * 0.3, p[2] + 0.36 * F.bulk - Math.abs(dx) * 0.4 + s * 0.6], s: s * 0.45, mat: 'glow', noShadow: true });
    }
    for (let k = 0; k < 5; k++) A(box3(), C.glow, { bone: BB3.spine, p: [p[0] - 0.05 + k * 0.025, p[1] + 0.22 - k * 0.11, p[2] + 0.4 * F.bulk], r: [0, 0, 0.3], s: [0.12, 0.012, 0.012], mat: 'glow', noShadow: true });
  }

  // --- Kopf ---
  const head = V.head || 'troll';
  const eyes = (pts, s, col = C.eye) => {
    for (const [x, y, z] of pts) for (const sx of [-1, 1]) {
      AH(ball(8), '#0a0806', { bone: hb, p: [sx * x, y, z - 0.03], s: [s * 1.5, s, s * 0.8], noShadow: true });
      AH(ball(8), col, { bone: hb, p: [sx * x, y, z + 0.02], s: [s, s * 0.6, s * 0.5], mat: 'glow' });
    }
  };
  if (head === 'troll') {
    AH(ball(16), C.skin, { bone: hb, p: [0, 0.05, 0], s: [0.95, 0.9, 1.0], top: C.skinTop, topK: 0.5, shade: 0.25 });
    AH(roundBox(1.7, 0.35, 0.5, 0.15), darker(C.skin, 0.12), { bone: hb, p: [0, 0.38, 0.72], r: [0.3, 0, 0] });
    AH(tube3([[0, 0.15, 0.85], [0, -0.05, 1.45], [0, -0.32, 1.62], [0, -0.45, 1.5]], 0.28, 0.12, 14, 8), C.skin, { bone: hb, top: C.skinTop, topK: 0.5 });
    eyes([[0.38, 0.18, 0.88]], 0.14);
    for (const sx of [-1, 1]) {
      pointAt3(AH, horn3(1.2, 0.34, 6), C.skin, [sx * 0.85, 0.1, -0.05], [sx, 0.1, -0.4], { bone: hb, s: [1, 1, 0.4], top: C.skinTop, topK: 0.5 });
      AH(torus3(0.12, 0.035, Math.PI * 2, 4, 10), C.gold || '#c8962a', { bone: hb, p: [sx * 1.25, -0.08, -0.2], r: [0, Math.PI / 2, 0], shine: 1, noShadow: true });
      AH(tube3([[sx * 0.42, -0.45, 0.88], [sx * 0.5, -0.1, 1.0], [sx * 0.6, 0.2, 0.92]], 0.13, 0.02, 10, 6), C.tusk, { bone: jb, shine: 0.6 });
    }
    AH(roundBox(1.35, 0.55, 1.05, 0.25), C.skin, { bone: jb, p: [0, -0.62, 0.42], shade: 0.3 });
    for (const [x, y, z, s] of [[0.5, 0.55, 0.62, 0.08], [-0.3, -0.1, 0.92, 0.07], [0.15, 0.7, 0.3, 0.06]]) AH(ball(6), darker(C.skin, 0.15), { bone: hb, p: [x, y, z], s, noShadow: true });
    // Haarkamm
    bsTufts3(AH, [0, 1, 2, 3, 4, 5].map((k) => [[0, 0.9 - k * 0.05, 0.35 - k * 0.22], [0, 1, -0.5], 0.7 - k * 0.06, 0.16, hb]), C.hair, C.hairTop || C.hair);
  } else if (head === 'bull') {
    AH(ball(16), C.skin, { bone: hb, p: [0, 0.18, -0.05], s: [0.9, 0.85, 0.95], top: C.skinTop, topK: 0.5, shade: 0.25 });
    AH(loft3([[0.35, 0.0, 0.62, 0.55, 0.5], [0.85, -0.18, 0.56, 0.42, 0.38], [1.3, -0.32, 0.5, 0.36, 0.3], [1.55, -0.4, 0.42, 0.3, 0.26]], 14, 3), C.skin, { bone: hb, top: C.skinTop, topK: 0.5, shade: 0.2 });
    AH(ball(10), C.snout, { bone: hb, p: [0, -0.42, 1.52], s: [0.44, 0.3, 0.22], shine: 0.5 });
    for (const sx of [-1, 1]) AH(ball(6), '#0a0606', { bone: hb, p: [sx * 0.16, -0.45, 1.7], s: [0.08, 0.06, 0.05], noShadow: true });
    AH(torus3(0.2, 0.045, Math.PI * 2, 4, 14), C.gold, { bone: hb, p: [0, -0.68, 1.68], r: [0.2, 0, 0], shine: 1 });
    AH(loft3([[0.5, -0.62, 0.42, 0.12, 0.15], [1.3, -0.68, 0.3, 0.1, 0.12]], 10, 2), C.skin, { bone: jb, shade: 0.3 });
    eyes([[0.55, 0.25, 0.68]], 0.13);
    for (const sx of [-1, 1]) {
      AH(tube3([[sx * 0.55, 0.62, 0.0], [sx * 1.25, 0.82, 0.1], [sx * 1.75, 1.25, 0.45], [sx * 1.72, 1.72, 0.8]], 0.3, 0.04, 18, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
      AH(torus3(0.3, 0.06, Math.PI * 2, 4, 12), C.gold, { bone: hb, p: [sx * 1.0, 0.76, 0.06], r: [0, Math.PI / 2, -sx * 0.3], shine: 1, noShadow: true });
      pointAt3(AH, horn3(0.6, 0.22, 6), C.skin, [sx * 0.82, 0.3, -0.12], [sx, -0.35, -0.3], { bone: hb, s: [1, 1, 0.45], top: C.skinTop });
    }
    bsTufts3(AH, [0, 1, 2, 3].map((k) => [[(k - 1.5) * 0.18, 0.95, 0.2], [(k - 1.5) * 0.3, 0.6, 1], 0.5, 0.14, hb]), C.hair, C.hairTop || C.hair);
  } else if (head === 'ape') {
    AH(ball(16), C.fur, { bone: hb, p: [0, 0.1, -0.05], s: [1.0, 0.95, 0.95], top: C.furTop, topK: 0.5, shade: 0.25 });
    AH(ball(14), C.face, { bone: hb, p: [0, -0.05, 0.5], s: [0.72, 0.68, 0.5], top: C.faceTop || C.face, topK: 0.4, shade: 0.2 });
    AH(roundBox(1.35, 0.28, 0.45, 0.14), darker(C.face, 0.15), { bone: hb, p: [0, 0.33, 0.78], r: [0.25, 0, 0] });
    AH(ball(12), C.face, { bone: hb, p: [0, -0.32, 0.88], s: [0.55, 0.36, 0.38], shade: 0.2 });
    for (const sx of [-1, 1]) AH(ball(6), '#0a0a10', { bone: hb, p: [sx * 0.13, -0.22, 1.22], s: [0.07, 0.05, 0.04], noShadow: true });
    eyes([[0.3, 0.14, 0.93]], 0.12);
    AH(roundBox(1.0, 0.4, 0.8, 0.18), C.face, { bone: jb, p: [0, -0.72, 0.55], shade: 0.3 });
    for (const sx of [-1, 1]) bsSpike3(AH, 0.32, 0.07, C.tusk, [sx * 0.32, -0.6, 0.92], [sx * 0.15, 1, 0.2], { bone: jb, shine: 0.5 });
    // Haarkranz und Wangenbart
    const fr2 = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 13 - 0.5) * 3.6;
      fr2.push([[Math.sin(a) * 0.85, 0.35 + Math.cos(a) * 0.45, Math.cos(a) * 0.3 - 0.1], [Math.sin(a), 0.4, -0.3], 0.55, 0.16, hb]);
    }
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) fr2.push([[sx * 0.7, -0.3 - k * 0.25, 0.4 - k * 0.1], [sx * 0.6, -1, 0.1], 0.5, 0.15, jb]);
    bsTufts3(AH, fr2, C.fur, C.furTop);
    if (V.horns === 'ram') for (const sx of [-1, 1]) {
      AH(tube3([[sx * 0.45, 0.65, -0.15], [sx * 1.0, 0.95, -0.4], [sx * 1.4, 0.55, -0.55], [sx * 1.38, 0.0, -0.25], [sx * 1.15, -0.2, 0.2]], 0.3, 0.06, 22, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.8 });
    }
  } else if (head === 'golem') {
    AH(bsFelsK3(), C.stone, { bone: hb, p: [0, 0.1, 0.05], s: [1.05, 0.9, 1.0], top: C.stoneTop, topK: 0.6, shade: 0.3 });
    AH(roundBox(1.6, 0.3, 0.5, 0.12), darker(C.stone, 0.1), { bone: hb, p: [0, 0.35, 0.72], r: [0.2, 0, 0], top: C.stoneTop });
    for (const sx of [-1, 1]) AH(box3(), C.eye, { bone: hb, p: [sx * 0.36, 0.14, 0.95], r: [0, 0, -sx * 0.25], s: [0.38, 0.1, 0.1], mat: 'glow' });
    AH(bsFelsK3(), C.stone, { bone: jb, p: [0, -0.62, 0.42], s: [0.85, 0.42, 0.75], top: C.stoneTop, shade: 0.3 });
    AH(box3(), C.vein || C.eye, { bone: jb, p: [0, -0.42, 1.02], s: [0.8, 0.08, 0.08], mat: 'glow', noShadow: true });
    if (V.crest === 'gem') {
      for (let k = 0; k < 5; k++) {
        const a = (k - 2) * 0.42;
        AH(bsOcta3(), k % 2 ? C.gem : C.gemTop, { bone: hb, p: [Math.sin(a) * 0.55, 1.0 + (0.4 - Math.abs(k - 2) * 0.15), -0.1 + Math.cos(a) * 0.1], r: [0, 0, -a * 0.6], s: [0.16, 0.55 - Math.abs(k - 2) * 0.12, 0.16], shine: 1 });
      }
      AH(bsOcta3(), C.glow, { bone: hb, p: [0, 1.3, 0.0], s: [0.09, 0.35, 0.09], mat: 'glow', noShadow: true });
    } else if (V.crest === 'horns') {
      for (const sx of [-1, 1]) AH(tube3([[sx * 0.55, 0.6, 0.0], [sx * 1.05, 0.95, -0.1], [sx * 1.2, 1.55, 0.05]], 0.26, 0.05, 14, 8), C.stone, { bone: hb, top: C.stoneTop, topK: 0.6 });
      for (const sx of [-1, 1]) AH(tube3([[sx * 0.9, 0.95, -0.08], [sx * 1.1, 1.45, 0.03]], 0.08, 0.02, 8, 5), C.vein, { bone: hb, mat: 'glow', noShadow: true });
    } else if (V.crest === 'crown') {
      // steinerne Krone mit Glutsteinen (Titanenkönig)
      AH(torus3(0.82, 0.13, Math.PI * 2, 5, 18), C.crown, { bone: hb, p: [0, 0.82, 0.05], r: [Math.PI / 2 - 0.12, 0, 0], top: C.crownTop, shine: 0.9 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        bsSpike3(AH, 0.55 + 0.3 * Math.max(0, Math.cos(a)), 0.16, C.crown, [Math.sin(a) * 0.82, 0.88, 0.05 + Math.cos(a) * 0.82], [Math.sin(a) * 0.25, 1, Math.cos(a) * 0.25], { bone: hb, top: C.crownTop, shine: 0.9 });
        if (k % 2 === 0) bsGem3(AH, C.vein, [Math.sin(a) * 0.86, 0.85, 0.05 + Math.cos(a) * 0.86], [0.1, 0.13, 0.08], null, hb);
      }
    } else {
      for (let k = 0; k < 4; k++) bsSpike3(AH, 0.9 - k * 0.12, 0.28, C.stone, [(k - 1.5) * 0.5, 0.95, -0.1 - Math.abs(k - 1.5) * 0.15], [(k - 1.5) * 0.3, 1, -0.4], { bone: hb, top: C.stoneTop });
    }
  } else if (head === 'skull') {
    AH(ball(16), C.bone, { bone: hb, p: [0, 0.1, 0], s: [0.95, 1.0, 1.05], top: C.boneTop, topK: 0.5, shade: 0.3, shine: 0.3 });
    AH(roundBox(1.25, 0.55, 0.7, 0.2), C.bone, { bone: hb, p: [0, -0.5, 0.62], shine: 0.3 });
    AH(roundBox(0.95, 0.3, 0.8, 0.12), C.bone, { bone: jb, p: [0, -0.98, 0.55], shine: 0.3 });
    for (let k = 0; k < 6; k++) {
      AH(roundBox(0.13, 0.22, 0.1, 0.03), C.boneTop, { bone: hb, p: [(k - 2.5) * 0.16, -0.72, 0.98], noShadow: true });
      AH(roundBox(0.13, 0.2, 0.1, 0.03), C.boneTop, { bone: jb, p: [(k - 2.5) * 0.15, -0.88, 0.88], noShadow: true });
    }
    AH(ball(6), '#0a0a0a', { bone: hb, p: [0, -0.32, 0.98], s: [0.16, 0.2, 0.08], noShadow: true });
    for (const sx of [-1, 1]) {
      AH(ball(10), '#060606', { bone: hb, p: [sx * 0.36, 0.05, 0.82], s: [0.3, 0.27, 0.2], noShadow: true });
      AH(ball(8), C.eye, { bone: hb, p: [sx * 0.36, 0.05, 0.92], s: [0.15, 0.14, 0.08], mat: 'glow' });
    }
  } else if (head === 'maw') {
    // Schlund: flacher Schädel mit vier Augen, darunter ein riesiges Maul mit Zahnreihen und Zunge
    AH(ball(16), C.skin, { bone: hb, p: [0, 0.2, -0.05], s: [1.2, 0.7, 1.1], top: C.skinTop, topK: 0.5, shade: 0.25 });
    eyes([[0.3, 0.6, 0.72], [0.62, 0.45, 0.6]], 0.11);
    AH(ball(14), C.mouth, { bone: hb, p: [0, -0.25, 0.45], s: [1.0, 0.5, 0.75], mat: 'glow', noShadow: true });
    AH(ball(16), C.skin, { bone: jb, p: [0, -0.78, 0.45], s: [1.25, 0.5, 1.15], top: C.skinTop, topK: 0.4, shade: 0.3 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 8 - 0.5) * 2.6;
      const x = Math.sin(a) * 1.0, z = 0.45 + Math.cos(a) * 0.8;
      bsSpike3(AH, 0.32 + 0.12 * Math.cos(a * 2), 0.07, C.tooth, [x, -0.12, z], [0, -1, 0.15], { bone: hb, seg: 4 });
      bsSpike3(AH, 0.28 + 0.1 * Math.cos(a * 2), 0.065, C.tooth, [x * 1.02, -0.42, z * 1.02], [0, 1, 0.15], { bone: jb, seg: 4 });
    }
    AH(tube3([[0, -0.5, 0.3], [0, -0.45, 0.95], [0.1, -0.75, 1.5], [0.05, -1.15, 1.6]], 0.28, 0.1, 14, 8), C.tongue, { bone: jb, mat: 'glow', noShadow: true });
  } else if (head === 'giant') {
    // schweres Riesengesicht: Brauenwulst, breite Nase, tiefe Augen, Kiefer
    AH(ball(16), C.skin, { bone: hb, p: [0, 0.05, 0], s: [0.95, 1.0, 1.0], top: C.skinTop, topK: 0.5, shade: 0.25 });
    AH(roundBox(1.8, 0.42, 0.6, 0.18), darker(C.skin, 0.12), { bone: hb, p: [0, 0.4, 0.78], r: [0.25, 0, 0], shade: 0.2 });
    AH(ball(10), C.skin, { bone: hb, p: [0, -0.08, 1.08], s: [0.3, 0.38, 0.3], shade: 0.2 });
    eyes([[0.4, 0.15, 0.9]], 0.15);
    for (const sx of [-1, 1]) AH(ball(8), C.skin, { bone: hb, p: [sx * 0.95, 0.0, -0.1], s: [0.22, 0.38, 0.28], shade: 0.2 });
    AH(roundBox(1.25, 0.5, 0.95, 0.22), C.skin, { bone: jb, p: [0, -0.68, 0.48], shade: 0.3 });
    bsTufts3(AH, Array.from({ length: 9 }, (_, k) => { const a = (k / 8 - 0.5) * 2.8; return [[Math.sin(a) * 0.85, 0.75 + Math.cos(a) * 0.2, Math.cos(a) * 0.2 - 0.25], [Math.sin(a) * 0.5, 0.3, -1], 1.2, 0.2, hb]; }), C.beard2 || C.hair, C.beard || C.hair);
  } else if (head === 'bandit') {
    AH(ball(16), C.skin, { bone: hb, p: [0, 0.05, 0.05], s: [0.82, 0.98, 0.9], top: C.skinTop, topK: 0.4, shade: 0.2 });
    AH(ball(8), C.skin, { bone: hb, p: [0, 0.0, 0.92], s: [0.16, 0.24, 0.2] });
    for (const sx of [-1, 1]) {
      AH(ball(8), '#0a0806', { bone: hb, p: [sx * 0.3, 0.18, 0.8], s: [0.17, 0.09, 0.08], noShadow: true });
      AH(ball(8), C.eye, { bone: hb, p: [sx * 0.3, 0.18, 0.86], s: [0.1, 0.06, 0.05], mat: 'glow' });
      AH(roundBox(0.38, 0.07, 0.1, 0.03), C.hair, { bone: hb, p: [sx * 0.3, 0.34, 0.82], r: [0, 0, -sx * 0.3], noShadow: true });
    }
    // Augenklappe, Narbe, Tuchmaske über Mund und Nase
    AH(cyl3(0.2, 0.2, 0.06, 10), '#14100c', { bone: hb, p: [0.3, 0.18, 0.88], r: [Math.PI / 2, 0, 0] });
    AH(box3(), '#14100c', { bone: hb, p: [0, 0.32, 0.6], r: [0, 0, -0.5], s: [1.4, 0.05, 0.05], noShadow: true });
    AH(box3(), darker(C.skin, 0.3), { bone: hb, p: [-0.38, 0.05, 0.84], r: [0, 0, 0.3], s: [0.04, 0.5, 0.04], noShadow: true });
    AH(ball(14), C.mask, { bone: jb, p: [0, -0.42, 0.45], s: [0.88, 0.5, 0.62], top: C.maskTop, topK: 0.5, shade: 0.2 });
    AH(cap3(1, Math.PI * 0.55, 0, Math.PI * 2, 16, 6), C.hair, { bone: hb, p: [0, 0.15, 0.0], r: [-0.25, 0, 0], s: [0.86, 0.95, 0.92], shade: 0.2 });
    // breiter Hut mit Feder
    AH(cyl3(1.5, 1.5, 0.08, 20), C.hat, { bone: hb, p: [0, 0.78, -0.02], r: [-0.12, 0, 0.08], top: C.hatTop, shine: 0.3 });
    AH(cyl3(0.72, 0.85, 0.65, 16), C.hat, { bone: hb, p: [0, 1.1, -0.06], r: [-0.12, 0, 0.08], top: C.hatTop, shine: 0.3 });
    AH(cyl3(0.86, 0.87, 0.14, 16), C.band, { bone: hb, p: [0, 0.88, -0.05], r: [-0.12, 0, 0.08], shine: 0.8 });
    AH(tube3([[0.75, 0.95, -0.15], [1.2, 1.5, -0.6], [1.0, 2.1, -1.2], [0.6, 2.2, -1.6]], 0.16, 0.03, 16, 6), C.feather, { bone: hb, top: C.featherTop, topK: 0.6 });
    bsGem3(AH, C.glow, [0.62, 0.95, 0.55], [0.1, 0.12, 0.06], null, hb);
  }
  if (V.helm === 'jarl') {
    // Jarlshelm: Eisenkappe mit Nasenschutz, zwei Hörner, Goldreif
    AH(cap3(1, 1.3, 0, Math.PI * 2, 18, 7), C.iron, { bone: hb, p: [0, 0.35, 0.0], s: [1.08, 0.95, 1.08], top: C.ironTop, topK: 0.5, shine: 0.9 });
    AH(torus3(1.05, 0.08, Math.PI * 2, 4, 20), C.gold, { bone: hb, p: [0, 0.42, 0.0], r: [Math.PI / 2, 0, 0], shine: 1 });
    AH(roundBox(0.18, 0.75, 0.15, 0.06), C.iron, { bone: hb, p: [0, 0.2, 1.0], r: [0.15, 0, 0], shine: 0.9 });
    for (const sx of [-1, 1]) AH(tube3([[sx * 0.9, 0.6, 0.0], [sx * 1.55, 0.95, 0.05], [sx * 1.85, 1.6, 0.15], [sx * 1.7, 2.1, 0.3]], 0.24, 0.04, 18, 8), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
  } else if (V.helm === 'hood') {
    AH(cap3(1, Math.PI * 0.62, 0, Math.PI * 2, 18, 8), C.hood, { bone: hb, p: [0, 0.2, -0.05], r: [-0.4, 0, 0], s: [1.2, 1.3, 1.25], top: C.hoodTop, topK: 0.5, shade: 0.3 });
    AH(tubeProfile3([[0, -0.8, -1.1], [0, 0.6, -1.0], [0, 1.25, 0.0]], [0.9, 0.95, 0.7], 8, 10), C.hood, { bone: hb, top: C.hoodTop, shade: 0.3 });
  }
  if (V.beard === 'stone' || V.beard === 'cloud') {
    // Bart aus Steinsträhnen (Wolkenbart: grau, mit Funken)
    for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 0.22;
      const len = 2.6 - Math.abs(k - 4) * 0.25;
      AH(tube3([[x, -0.55, 0.85], [x * 1.3, -1.2, 1.0], [x * 1.1, -0.6 - len, 0.9 + 0.3 * Math.sin(k)]], 0.24, 0.05, 10, 5), k % 2 ? C.beard : C.beard2, { bone: jb, top: C.beard2, topK: 0.5, shade: 0.15 });
    }
    if (V.beard === 'cloud') for (let k = 0; k < 4; k++) bsGem3(AH, C.vein, [(k - 1.5) * 0.4, -1.6 - (k % 2) * 0.6, 1.15], [0.08, 0.1, 0.06], null, jb);
  }

  // --- Schulterstücke ---
  for (const sx of [-1, 1]) {
    const [ub] = bsArmB3(sx);
    const S = P[sx].S;
    if (V.pad === 'iron') {
      const k = F.bulk / 1.1;
      const D = [S[0] + sx * 0.06 * k, S[1] + 0.05 * k, S[2]];
      A(cap3(1, 1.25, 0, Math.PI * 2, 16, 7), C.iron, { bone: ub, p: D, r: [0, 0, sx * 0.5], s: [0.3 * k, 0.24 * k, 0.32 * k], top: C.ironTop, topK: 0.6, shine: 0.85 });
      A(cap3(1, 0.9, 0, Math.PI * 2, 16, 5), C.ironTop, { bone: ub, p: bsAdd3(D, [sx * 0.14 * k, -0.14 * k, 0]), r: [0, 0, sx * 0.9], s: [0.24 * k, 0.13 * k, 0.26 * k], top: C.ironTop, topK: 0.6, shine: 0.85 });
      for (let k = 0; k < 3; k++) bsSpike3(A, (0.14 - k * 0.03) * F.bulk, 0.035 * F.bulk, C.ironTop, [S[0] + sx * 0.08, S[1] + 0.14 * F.bulk, S[2] - 0.1 + k * 0.1], [sx * 0.4, 1, 0], { bone: ub, shine: 0.85 });
    } else if (V.pad === 'fur') {
      bsTufts3(A, [0, 1, 2, 3, 4].map((k) => [[S[0] + sx * 0.05, S[1] + 0.08, S[2] - 0.2 + k * 0.1], [sx * 0.8, -0.3, (k - 2) * 0.3], 0.26 * F.bulk, 0.09 * F.bulk, ub]), C.fur, C.furTop);
    } else if (V.pad === 'rock') {
      A(bsFelsK3(), C.stone, { bone: ub, p: [S[0] + sx * 0.1, S[1] + 0.2, S[2] - 0.02], r: [0.3, 0.5, sx * 0.4], s: [0.3, 0.25, 0.32], top: C.stoneTop, topK: 0.6, shade: 0.3 });
      A(bsFelsK3(), C.stone, { bone: ub, p: [S[0] + sx * 0.28, S[1] + 0.05, S[2] + 0.12], r: [0.6, 0.2, sx], s: [0.16, 0.13, 0.18], top: C.stoneTop, topK: 0.6, shade: 0.3 });
      bsTufts3(A, [0, 1, 2].map((k) => [[S[0] + sx * (0.05 + k * 0.1), S[1] + 0.35, S[2] - 0.1 + k * 0.05], [sx * 0.3, 1, 0.1], 0.18, 0.05, ub]), C.moss || C.stoneTop, C.stoneTop);
    } else if (V.pad === 'bone') {
      const sk = [S[0] + sx * 0.12, S[1] + 0.14, S[2] + 0.05];
      A(ball(12), C.bone, { bone: ub, p: sk, s: [0.13 * F.bulk, 0.12 * F.bulk, 0.14 * F.bulk], top: C.boneTop, shine: 0.3 });
      for (const ex of [-1, 1]) A(ball(6), C.glow, { bone: ub, p: [sk[0] + ex * 0.045, sk[1] + 0.01, sk[2] + 0.12 * F.bulk], s: 0.022, mat: 'glow', noShadow: true });
      for (let k = 0; k < 2; k++) bsSpike3(A, 0.2 * F.bulk, 0.035, C.bone, [S[0] + sx * 0.1, S[1] + 0.2, S[2] - 0.15 + k * 0.1], [sx * 0.4, 1, -0.4], { bone: ub, shine: 0.3 });
    } else if (V.pad === 'cloth') {
      A(cap3(1, 1.35, 0, Math.PI * 2, 14, 6), C.cloth, { bone: ub, p: [S[0] + sx * 0.03, S[1] + 0.04, S[2]], r: [0, 0, sx * 0.45], s: [0.15, 0.1, 0.16], top: C.clothTop || C.cloth, shade: 0.25 });
      A(torus3(1, 0.07, Math.PI * 2, 3, 14), C.gold, { bone: ub, p: [S[0] + sx * 0.05, S[1] + 0.0, S[2]], r: [Math.PI / 2, 0, sx * 0.45], s: [0.15, 0.16, 0.15], shine: 1, noShadow: true });
    }
  }

  // --- Gürtel, Lendentuch, Schürze, Bänder ---
  if (!robe) {
    const yb = J.hipY + 0.04;
    const pb = bsTorsoAt3(rows, yb, 0, 1.0);
    A(torus3(1, 0.06, Math.PI * 2, 5, 24), C.belt, { bone: BB3.pelvis, p: [0, yb, rows[0][1]], r: [Math.PI / 2, 0, 0], s: [rows[0][2] * 1.18, (pb[2] - rows[0][1]) * 1.05, 1], shine: 0.6 });
    A(cyl3(0.08, 0.08, 0.04, 14), C.gold || C.iron, { bone: BB3.pelvis, p: [pb[0], yb, pb[2] + 0.03], r: [Math.PI / 2, 0, 0], shine: 1 });
    if (V.loin !== false) for (const sz of [1, -1]) {
      const pz = bsTorsoAt3(rows, yb, sz > 0 ? 0 : Math.PI, 1.0)[2];
      const w = rows[0][2] * 1.1;
      bsSheetAdd3(b, A, bsSheet3(id + 'lenden' + sz, 4, 5, (u, v) => [(u - 0.5) * w * (1 - 0.15 * v), yb - 0.02 - v * (V.loinL || 0.5) * F.bulk, pz + sz * (0.02 + 0.06 * v)], () => [[BB3.pelvis, 1]], (u, v, s) => (v > 0.86 ? C.clothD || darker(C.loinCol || C.cloth, 0.3) : s > 0 ? C.loinCol || C.cloth : darker(C.loinCol || C.cloth, 0.2))), false);
    }
  }
  if (V.straps) {
    // Gurte über Kreuz mit Taschen, Knopfreihe am Mantel
    for (const sx of [-1, 1]) {
      const pts = [bsTorsoAt3(rows, yTop - 0.02, sx * 0.7, 1.04), bsTorsoAt3(rows, J.chestY, sx * 0.1, 1.08), bsTorsoAt3(rows, J.waistY - 0.02, -sx * 0.75, 1.06)];
      A(tube3(pts, 0.026, 0.026, 14, 5), C.belt, { bone: BB3.chest, shade: 0.2 });
      for (let k = 0; k < 3; k++) A(roundBox(0.05, 0.06, 0.035, 0.012), C.gold, { bone: BB3.chest, p: bsAdd3(bsLerp3(pts[0], pts[1], 0.3 + k * 0.25), [0, 0, 0.02]), shine: 1, noShadow: true });
      A(roundBox(0.1, 0.11, 0.06, 0.025), C.belt, { bone: BB3.pelvis, p: bsTorsoAt3(rows, J.hipY, sx * 1.1, 1.05), shade: 0.2 });
    }
    for (let k = 0; k < 4; k++) A(ball(6), C.gold, { bone: k < 2 ? BB3.chest : BB3.spine, p: bsTorsoAt3(rows, J.chestY + 0.1 - k * 0.14, 0, 1.02), s: 0.022, shine: 1, noShadow: true });
  }
  if (V.apron) {
    // Schmiedeschürze aus Leder mit Brandflecken
    const zf = bsTorsoAt3(rows, J.chestY, 0, 1.0)[2];
    bsSheetAdd3(b, A, bsSheet3(id + 'schuerze', 5, 8, (u, v) => [(u - 0.5) * 0.6 * F.bulk * (1 - 0.1 * v), J.chestY + 0.1 - v * 1.05, zf + 0.04 + 0.06 * Math.sin(Math.PI * u) - v * 0.1],
      (u, v) => [[BB3.chest, Math.max(0, 1 - v * 2.5)], [BB3.pelvis, Math.min(1, v * 2.5)]], (u, v, s) => (s > 0 ? (Math.sin(u * 13 + v * 7) > 0.9 ? '#1a120c' : mixColor(C.apron, darker(C.apron, 0.3), v)) : darker(C.apron, 0.4)), 0.012), true);
  }
  if (V.chains) {
    bsChainLinks3(A, bsAdd3(bsTorsoAt3(rows, yTop - 0.05, 0.9, 1.0), [0, 0, 0.02]), bsAdd3(bsTorsoAt3(rows, J.waistY, -0.7, 1.0), [0, 0, 0.03]), 9, 0.045 * F.bulk, C.iron, BB3.chest);
  }
  if (V.cape) {
    const zc = bsTorsoAt3(rows, yTop, Math.PI, 1.0)[2];
    bsSheetAdd3(b, A, bsSheet3(id + 'umhang', 8, 10, (u, v) => {
      const a = (u - 0.5) * 2.2;
      const R = 0.3 * F.bulk + v * 0.3;
      const cut = V.torn && v > 0.7 ? 0.14 * Math.abs(Math.sin(u * 21)) : 0;
      return [Math.sin(a) * R, yTop + 0.02 - Math.min(v, 1 - cut) * (yTop - 0.1), zc + 0.08 - (1 - Math.cos(a)) * 0.12 - v * 0.15];
    }, (u, v) => [[BB3.chest, Math.max(0, 1 - v * 3)], [BB3.c1, Math.min(1, v * 3) * (1 - v)], [BB3.c2, Math.min(1, v * 3) * v]], (u, v, s) => (s > 0 ? mixColor(C.cape, C.capeEdge || C.cape, v * v) : darker(C.cape, 0.3)), 0.01), true);
    if (V.capeFur) bsTufts3(A, Array.from({ length: 12 }, (_, i) => { const a = (i / 11 - 0.5) * 2.4; return [[Math.sin(a) * 0.36 * F.bulk, yTop + 0.02, zc + 0.12 - (1 - Math.cos(a)) * 0.1], [Math.sin(a) * 0.5, 0.2, -0.6], 0.22 * F.bulk, 0.07 * F.bulk, BB3.chest]; }), C.fur, C.furTop);
  }
  if (robe) {
    // Gewand: Saum mit Zacken, Borte, Stola
    const hem = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      hem.push([[Math.sin(a) * 0.47, 0.1, Math.cos(a) * 0.44], [Math.sin(a) * 0.3, -1, Math.cos(a) * 0.3], 0.14 + 0.07 * Math.sin(i * 2.9), 0.06, BB3.pelvis]);
    }
    bsTufts3(A, hem, C.robe, C.robeTop);
    for (let k = 0; k < 9; k++) A(box3(), C.trim, { bone: k < 5 ? BB3.pelvis : BB3.spine, p: [0, 0.25 + k * 0.13, 0.41 - k * 0.022 - (k > 5 ? 0.06 : 0)], r: [-0.12, 0, k % 2 ? 0.6 : -0.6], s: [0.02, 0.07, 0.015], mat: C.trimGlow ? 'glow' : 'lit', noShadow: true });
  }

  // --- Rücken ---
  if (V.back === 'boulders') {
    // Felsbrocken und Moos auf dem Buckel (Felsenhüter)
    for (const [y, a, s] of [[yTop + 0.05, Math.PI - 0.35, 0.3], [yTop - 0.1, Math.PI + 0.4, 0.26], [yTop - 0.35, Math.PI, 0.32], [yTop + 0.18, Math.PI, 0.22]]) {
      const p = bsTorsoAt3(rows, y, a, 0.85);
      A(bsFelsK3(), C.stone, { bone: BB3.chest, p, r: [a, y * 3, 0.4], s: [s, s * 0.8, s * 0.9], top: C.stoneTop, topK: 0.6, shade: 0.3 });
      bsTufts3(A, [[bsAdd3(p, [0, s * 0.7, 0]), [0, 1, -0.2], 0.16, 0.05, BB3.chest]], C.moss || C.stoneTop, C.stoneTop);
    }
  } else if (V.back === 'pipes') {
    // Orgelpfeifen aus Knochen am Rücken (Kantor)
    for (let k = 0; k < 7; k++) {
      const x = (k - 3) * 0.1;
      const h = 0.55 + 0.35 * Math.cos((k - 3) * 0.5);
      const p0 = bsTorsoAt3(rows, J.chestY, Math.PI, 0.95);
      A(cyl3(0.035, 0.045, h, 8), C.bone, { bone: BB3.chest, p: [x, J.chestY + h * 0.5, p0[2] - 0.06], r: [-0.12, 0, 0], top: C.boneTop, shine: 0.3 });
      A(ball(6), C.glow, { bone: BB3.chest, p: [x, J.chestY + h + 0.02, p0[2] - 0.1], s: [0.03, 0.02, 0.03], mat: 'glow', noShadow: true });
    }
  } else if (V.back === 'shield') {
    const p = bsTorsoAt3(rows, J.chestY, Math.PI, 1.0);
    A(cyl3(0.42, 0.42, 0.06, 20), C.wood || C.iron, { bone: BB3.chest, p: [p[0], p[1], p[2] - 0.06], r: [Math.PI / 2 - 0.1, 0, 0], top: C.iron, shine: 0.4 });
    A(torus3(0.42, 0.035, Math.PI * 2, 4, 20), C.iron, { bone: BB3.chest, p: [p[0], p[1], p[2] - 0.08], r: [-0.1, 0, 0], shine: 0.9 });
    A(cap3(1, 1.2, 0, Math.PI * 2, 12, 5), C.iron, { bone: BB3.chest, p: [p[0], p[1], p[2] - 0.1], r: [-Math.PI / 2 - 0.1, 0, 0], s: [0.1, 0.06, 0.1], shine: 0.9 });
  }
  if (V.core) {
    // offenes Herz in der Brust: Felsring, darin glühender Kern
    const p = bsTorsoAt3(rows, J.chestY + 0.05, 0, 0.92);
    A(torus3(1, 0.32, Math.PI * 2, 6, 14), C.stone, { bone: BB3.chest, p, r: [-0.15, 0, 0], s: 0.2 * F.bulk, top: C.stoneTop, shade: 0.3 });
    A(ball(12), C.vein, { bone: BB3.chest, p: [p[0], p[1], p[2] + 0.02], s: 0.17 * F.bulk, mat: 'glow', noShadow: true });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      A(box3(), C.vein, { bone: BB3.chest, p: [p[0] + Math.cos(a) * 0.32 * F.bulk, p[1] + Math.sin(a) * 0.3 * F.bulk, p[2] - 0.02], r: [0, 0, a + Math.PI / 2], s: [0.025, 0.2, 0.02], mat: 'glow', noShadow: true });
    }
  }

  // --- Hände, Füße ---
  for (const sx of [-1, 1]) {
    const Q = P[sx];
    if (V.fists === 'rock') {
      const hbx = bsArmB3(sx)[2];
      const c = bsLerp3(Q.W, Q.Hd, 0.5);
      A(bsFelsK3(), C.stone, { bone: hbx, p: c, s: [F.hand * 1.5, F.hand * 1.4, F.hand * 1.5], top: C.stoneTop, shade: 0.3 });
      if (C.vein) for (let k = 0; k < 3; k++) A(box3(), C.vein, { bone: hbx, p: [c[0] + sx * F.hand * 0.75, c[1] - 0.05 + k * 0.06, c[2] + F.hand * 0.5], r: [0.3 * k, 0, sx * 0.5], s: [0.02, 0.12, 0.02], mat: 'glow', noShadow: true });
    } else bsHand3(A, sx, P, F.hand, robe ? C.bone || C.skin : C.handCol || C.skin, { top: robe ? C.boneTop : C.skinTop, claw: C.claw || null });
    // Unterarmbänder
    if (C.band) {
      const fb = bsArmB3(sx)[1];
      A(cyl3(F.arm[3] * 1.12, F.arm[4] * 1.18, 0.2 * F.bulk, 14), C.band, { bone: fb, p: bsLerp3(Q.E, Q.W, 0.68), top: C.bandTop, shine: 0.8 });
    }
    if (F.noLegs) continue;
    const [, sb, fb2] = bsLegB3(sx);
    const Ak = Q.A;
    if (V.hooves) {
      for (const hx of [-1, 1]) A(ball(10), C.hoof, { bone: fb2, p: [Ak[0] + hx * F.leg[4] * 0.6, 0.08, 0.08], s: [F.leg[4] * 0.7, 0.1, F.leg[4] * 1.4], shine: 0.6 });
      A(ball(10), C.fur || C.skin, { bone: sb, p: [Ak[0], 0.24, 0.0], s: [F.leg[4] * 1.4, 0.1, F.leg[4] * 1.4], top: C.furTop, shade: 0.2 });
    } else if (V.boots) {
      A(ball(12), C.boots, { bone: fb2, p: [Ak[0], 0.08, 0.08], s: [F.leg[4] * 1.4, 0.09, F.leg[4] * 2.6], top: lighter(C.boots, 0.15), shade: 0.3 });
      A(cyl3(F.leg[3] * 1.25, F.leg[4] * 1.3, 0.32, 12), C.boots, { bone: sb, p: [Ak[0], 0.28, 0.0], top: lighter(C.boots, 0.15), shade: 0.2 });
    } else {
      const fs = F.leg[4];
      A(ball(12), C.footCol || C.skin, { bone: fb2, p: [Ak[0], fs * 0.7, 0.1 * F.bulk], s: [fs * 1.15, fs * 0.75, fs * 1.8], top: C.skinTop, topK: 0.5, shade: 0.3 });
      for (let k = 0; k < 4; k++) A(ball(8), C.claw || darker(C.skin, 0.1), { bone: fb2, p: [Ak[0] + (k - 1.5) * fs * 0.42, fs * 0.45, 0.1 * F.bulk + fs * 1.65], s: [fs * 0.28, fs * 0.28, fs * 0.32], noShadow: true });
    }
  }

  // --- Waffe in der rechten Hand ---
  const G = bsLerp3(P[-1].W, P[-1].Hd, 0.5), hbR = BB3.haR;
  const wk = V.weaponK || 1;
  const W = (dz) => [G[0], G[1], G[2] + dz * wk];
  if (V.weapon === 'hammer' || V.weapon === 'maul') {
    // Kriegshammer (maul: Steinhammer mit Krone aus Glutzacken)
    A(cyl3(0.05 * wk, 0.05 * wk, 1.5 * wk, 10), C.wood, { bone: hbR, p: W(0.35), r: [Math.PI / 2, 0, 0], shade: 0.2 });
    const T = W(1.05);
    if (V.weapon === 'maul') {
      A(roundBox(0.44 * wk, 0.7 * wk, 0.44 * wk, 0.1), C.stone, { bone: hbR, p: T, top: C.stoneTop, topK: 0.5, shade: 0.25 });
      for (const dy of [-1, 1]) A(roundBox(0.5 * wk, 0.08 * wk, 0.5 * wk, 0.02), C.metal, { bone: hbR, p: [T[0], T[1] + dy * 0.37 * wk, T[2]], top: C.gold, shine: 1 });
      A(torus3(0.32 * wk, 0.04 * wk, Math.PI * 2, 4, 16), C.metal, { bone: hbR, p: T, r: [Math.PI / 2, 0, Math.PI / 4], shine: 1 });
      for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) A(box3(), C.vein, { bone: hbR, p: [T[0] + sx * 0.225 * wk, T[1] + (k - 0.5) * 0.3 * wk, T[2]], r: [0.5 * (k - 0.5), 0, 0], s: [0.02, 0.18 * wk, 0.04], mat: 'glow', noShadow: true });
    } else {
      A(roundBox(0.36 * wk, 0.6 * wk, 0.36 * wk, 0.07), C.metal, { bone: hbR, p: T, top: C.metalTop, topK: 0.5, shine: 0.9 });
      for (const dy of [-1, 1]) A(roundBox(0.42 * wk, 0.06 * wk, 0.42 * wk, 0.02), C.gold || C.metalTop, { bone: hbR, p: [T[0], T[1] + dy * 0.31 * wk, T[2]], shine: 1 });
      if (C.vein) for (const sx of [-1, 1]) A(bsBlade3('blitz3', [[0, 0], [0.12, 0.05], [0.07, 0.08], [0.22, 0.16], [0.09, 0.08], [0.14, 0.04]], 0.02, 0.006), C.vein, { bone: hbR, p: [T[0] + sx * 0.19 * wk, T[1] - 0.1, T[2] - 0.1], mat: 'glow', noShadow: true });
    }
  } else if (V.weapon === 'axe') {
    // große Doppelaxt
    A(cyl3(0.04 * wk, 0.045 * wk, 1.7 * wk, 10), C.wood, { bone: hbR, p: W(0.3), r: [Math.PI / 2, 0, 0], shade: 0.2 });
    for (const z of [-0.4, 0.95]) A(torus3(0.05 * wk, 0.014, Math.PI * 2, 4, 10), C.gold || C.metalTop, { bone: hbR, p: W(z), r: [Math.PI / 2, 0, 0], shine: 1, noShadow: true });
    const T = W(1.0);
    for (const sy of [-1, 1]) {
      const bl = [[0, 0.05], [0.12, 0.08], [0.48, 0.32], [0.52, 0], [0.48, -0.32], [0.12, -0.08], [0, -0.05]].map(([u, v]) => [u * wk, v * wk]);
      A(bsBlade3(id + '-axt' + sy, bl, 0.04, 0.012), C.metal, { bone: hbR, p: [T[0], T[1], T[2]], r: [sy > 0 ? 0 : Math.PI, 0, Math.PI / 2], top: C.metalTop, topK: 0.5, shine: 0.95 });
      A(box3(), C.vein || C.metalTop, { bone: hbR, p: [T[0], T[1] + sy * 0.5 * wk, T[2]], s: [0.03, 0.03, 0.6 * wk], mat: C.vein ? 'glow' : 'lit', noShadow: true });
    }
    bsSpike3(A, 0.25 * wk, 0.04, C.metal, W(1.12), [0, 0, 1], { bone: hbR, shine: 0.9 });
  } else if (V.weapon === 'saber') {
    // Säbel rechts, Dolch links
    A(cyl3(0.03, 0.03, 0.28, 8), C.grip, { bone: hbR, p: W(-0.02), r: [Math.PI / 2, 0, 0] });
    A(tube3([[G[0], G[1] - 0.05, G[2] + 0.1], [G[0] + 0.02, G[1] - 0.14, G[2]], [G[0], G[1] - 0.06, G[2] - 0.16]], 0.016, 0.016, 10, 5), C.gold, { bone: hbR, shine: 1 });
    const bl = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; bl.push([0.15 + u * 1.05, 0.045 + 0.14 * u * u - 0.02 * u]); }
    bl.push([1.24, 0.2]);
    for (let i = 8; i >= 0; i--) { const u = i / 8; bl.push([0.15 + u * 1.05, -0.04 + 0.12 * u * u]); }
    A(bsBlade3(id + '-saebel', bl, 0.02, 0.006), C.metal, { bone: hbR, p: W(0), top: C.metalTop, topK: 0.5, shine: 1 });
    const GL = bsLerp3(P[1].W, P[1].Hd, 0.5), hbL = BB3.haL;
    A(cyl3(0.025, 0.025, 0.2, 8), C.grip, { bone: hbL, p: [GL[0], GL[1], GL[2] - 0.02], r: [Math.PI / 2, 0, 0] });
    A(bsBlade3('dolch3', [[0.1, 0.035], [0.5, 0.02], [0.58, 0], [0.5, -0.02], [0.1, -0.035]], 0.016, 0.005), C.metal, { bone: hbL, p: [GL[0], GL[1], GL[2]], top: C.metalTop, shine: 1 });
    A(box3(), C.glow, { bone: hbL, p: [GL[0], GL[1], GL[2] + 0.35], s: [0.02, 0.012, 0.3], mat: 'glow', noShadow: true });
  } else if (V.weapon === 'club') {
    // Keule aus einem Knochen bzw. Eisbrocken
    A(tube3([[G[0], G[1], G[2] - 0.3], [G[0], G[1] + 0.02, G[2] + 0.3], [G[0] - 0.02, G[1], G[2] + 0.85]], 0.07 * wk, 0.12 * wk, 14, 8), C.clubCol || C.bone, { bone: hbR, top: C.boneTop || lighter(C.clubCol, 0.2), shade: 0.2 });
    const T = W(1.0);
    A(ball(12), C.clubCol || C.bone, { bone: hbR, p: T, s: [0.2 * wk, 0.18 * wk, 0.26 * wk], top: C.boneTop, shine: 0.3 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      bsSpike3(A, 0.2 * wk, 0.045 * wk, C.spike || C.iron, [T[0] + Math.cos(a) * 0.17 * wk, T[1] + Math.sin(a) * 0.15 * wk, T[2] + 0.02], [Math.cos(a), Math.sin(a), 0.3], { bone: hbR, shine: 0.7 });
    }
  } else if (V.weapon === 'staff' || V.weapon === 'bell') {
    A(tube3([[G[0], G[1], G[2] - 0.95], [G[0] + 0.02, G[1], G[2] - 0.3], [G[0] - 0.02, G[1], G[2] + 0.4], [G[0], G[1], G[2] + 1.0]], 0.035, 0.03, 18, 6), C.wood, { bone: hbR, top: lighter(C.wood, 0.2) });
    const O = W(1.15);
    if (V.weapon === 'bell') {
      // Glockenstab: Knochenbügel, darin eine Glocke mit Leuchtkern
      A(torus3(0.16, 0.025, Math.PI, 4, 12), C.bone, { bone: hbR, p: [O[0], O[1], O[2] - 0.08], r: [0, Math.PI / 2, -Math.PI / 2], shine: 0.3 });
      A(cap3(1, 1.9, 0, Math.PI * 2, 14, 6), C.metal, { bone: hbR, p: [O[0], O[1] - 0.08, O[2]], s: [0.12, 0.16, 0.12], top: C.metalTop, shine: 1 });
      A(ball(8), C.glow, { bone: hbR, p: [O[0], O[1] - 0.15, O[2]], s: 0.05, mat: 'glow', noShadow: true });
    } else {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        A(tube3([[G[0] + Math.cos(a) * 0.04, G[1] + Math.sin(a) * 0.04, G[2] + 0.98], [O[0] + Math.cos(a) * 0.14, O[1] + Math.sin(a) * 0.14, O[2] - 0.02], [O[0] + Math.cos(a) * 0.05, O[1] + Math.sin(a) * 0.05, O[2] + 0.16]], 0.02, 0.006, 10, 4), C.wood, { bone: hbR });
      }
      A(ball(12), C.glow, { bone: hbR, p: O, s: 0.1, mat: 'glow', noShadow: true });
    }
  }
  return bsRes3(id, rig, J, F.H, V.worldH);
}
// Grundwerte je Gestalt für BOSS3 (Animation)
const BS_WARD_DEF3 = {
  giant: { kind: 'biped', melee: ['slam2', 'punch', 'stomp'], blob: 1.6, dome: 1.5, skyAt: 'sky', gait: 0.75, deathPts: ['core', 'back', 'weapon'], base: { aRx: -0.3, aRe: -0.7, aRz: 0.25, aLz: 0.22, aLe: -0.45, lean: 0.15 } },
  brute: { kind: 'biped', melee: ['chop', 'sweep', 'punch'], blob: 1.35, dome: 1.35, skyAt: 'sky', gait: 0.85, deathPts: ['core', 'mouth', 'weapon'], base: { aRx: -0.25, aRe: -0.8, aRz: 0.22, aLz: 0.2, aLe: -0.5, lean: 0.12 } },
  man: { kind: 'biped', melee: ['chop', 'sweep', 'thrust'], blob: 1.1, dome: 1.35, skyAt: 'sky', gait: 0.9, deathPts: ['core', 'mouth', 'weapon'], base: { aRx: -0.35, aRe: -0.8, aRz: 0.15, aLz: 0.2, aLe: -0.5, lean: 0.06 } },
  robe: { kind: 'biped', melee: ['chop', 'claw', 'sweep'], cape: false, float: 0.3, blob: 1.1, dome: 1.35, skyAt: 'sky', gait: 0.6, deathPts: ['core', 'mouth', 'back', 'weapon'], base: { aRx: -0.25, aRe: -1.2, aRz: 0.15, aLx: -0.45, aLe: -0.9, aLz: 0.3, lean: 0.05 } }
};
// Registrieren: Bauplan, Animation (Gestalt), Effekte
function bsWardReg3(id, V, D) {
  MON3_BUILD[id] = (b) => bsWard3(b, id, V);
  const fr = V.frame || 'giant';
  const wl = { hammer: 1.05, maul: 1.05, axe: 1.0, saber: 1.15, club: 1.0, staff: 1.15, bell: 1.15 }[V.weapon] || 0.1;
  BOSS3[id] = Object.assign({}, BS_WARD_DEF3[fr], { cape: !!V.cape, pts: bsWardPts3(fr, wl * (V.weaponK || 1), D.ptsO || {}) }, D);
}

// --- Bosse und Wächter aus dem Wächter-Baukasten --------------------------------------------------------------
// Titanenkönig Kroth (Titanenschmiede): Riese aus Fels mit Schmiedeglut in den Fugen, Steinkrone mit Glutsteinen, Bart
// aus Steinsträhnen, Felsbrocken auf den Schultern, Steinhammer mit Bronzebändern und Glutrunen
bsWardReg3('titanenkoenig', {
  frame: 'giant', head: 'golem', crest: 'crown', cover: 'stone', pad: 'rock', beard: 'stone', weapon: 'maul', weaponK: 1.15,
  skin: '#4e4a44', skinTop: '#7a746a', stone: '#5a544c', stoneTop: '#8a8478', vein: '#ffb04a', eye: '#ffd27a', crown: '#3a3028', crownTop: '#c8962a',
  beard: '#5a544c', beard2: '#7a7468', metal: '#8a6a3a', wood: '#3a2a1c', belt: '#3a2a1c', cloth: '#5a3a1a', gold: '#c8962a', moss: '#6a5a40', worldH: 5.2
}, {
  fx: 'schmiede', emit: 'weapon', lineStyle: 'smash', melee: ['slam2', 'chop', 'stomp'], emi: [0.1, 0.06, 0.02],
  // Glut steigt aus den Fugen, Funken sprühen vom Hammer
  ambient: bsAmb3('titanenkoenig', [{ k: 'rise', at: 'back', n: 5, sp: 0.45, r: 0.9, h: 2.2 }, { k: 'rise', at: 'weapon', n: 3, sp: 1.2, r: 0.3, h: 0.8, s: 0.14, col: '#ffd08a' }, { k: 'pulse', at: 'crown', s: 0.9, op: 0.25 }])
});
// Banditenfürst Raku (Banditenkeller): Mensch im Ledermantel, breiter Hut mit Feder, Augenklappe, Tuchmaske, roter
// Umhang, Schärpe, Säbel und Dolch
bsWardReg3('banditenfuerst', {
  frame: 'man', head: 'bandit', pad: 'cloth', cape: true, torn: true, boots: true, weapon: 'saber', straps: true, loinL: 0.75, loinCol: '#4a2a1e',
  skin: '#c89a78', skinTop: '#e0b896', torso: '#4a2a1e', armCol: '#4a2a1e', legCol: '#2e2620', handCol: '#3a2418', boots: '#2a1a12',
  cloth: '#7a1a14', clothTop: '#a02a20', clothD: '#2a0a08', cape: '#6a1410', capeEdge: '#c8962a', hair: '#1a120c', mask: '#6a1a14', maskTop: '#9a2a20',
  hat: '#2a1e18', hatTop: '#4a3a2e', band: '#8a1a14', feather: '#e8e0d0', featherTop: '#ff6a3a', gold: '#c8962a', metal: '#a8acb8', metalTop: '#e8ecf4',
  grip: '#3a2418', glow: '#ffb04a', eye: '#ffd27a', belt: '#2a1a10', worldH: 3.9
}, {
  fx: 'staub', emit: 'weapon', melee: ['chop', 'sweep', 'thrust'], emi: [0.06, 0.04, 0.01],
  // Goldfunken klimpern am Gürtel, Staub am Boden
  ambient: bsAmb3('banditenfuerst', [{ k: 'ground', n: 3, sp: 0.3, r: 1.1, col: '#5a4a3a', op: 0.2 }, { k: 'rise', at: 'core', n: 2, sp: 0.5, r: 0.3, h: 0.6, s: 0.12, col: '#ffd27a' }])
});
// Hrimfang, Hüter des ewigen Eises (Gletschergruft): Yeti, weißes Zottelfell, blaues Gesicht, Widderhörner aus Eis,
// Eiskeule
bsWardReg3('hrimfang', {
  frame: 'giant', head: 'ape', headK: 1.15, horns: 'ram', cover: 'fur', weapon: 'club', loin: false,
  fur: '#d4e2ee', furTop: '#f6fbff', skin: '#c8dcec', skinTop: '#e8f4ff', face: '#6a98c4', faceTop: '#a0c4e4', eye: '#3af0ff', tusk: '#e8f4ff',
  horn: '#8ac8ec', hornTip: '#e8faff', clubCol: '#9fd8f4', bone: '#9fd8f4', boneTop: '#e8f8ff', spike: '#e8faff', belt: '#5a4a3a', cloth: '#3a5a7a', claw: '#2a3a4a', worldH: 5.0
}, {
  fx: 'eis', emit: 'weapon', lineStyle: 'smash', melee: ['slam2', 'chop', 'punch'], emi: [0.04, 0.08, 0.12],
  ambient: bsAmb3('hrimfang', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.5, r: 0.1, h: 0.6, s: 0.3, col: '#e8f4ff', op: 0.3 }, { k: 'snow', at: 'back', n: 4, sp: 0.5, r: 1.2 }])
});
// Jarl Hrimgar (Feste des Nordlichts): Yeti-Fürst mit Jarlshelm (Hörner, Goldreif), Eisen-Schulterstücken, Umhang mit
// Pelzkragen im Nordlicht-Blau, Armschienen und Doppelaxt mit Nordlicht-Schneiden
bsWardReg3('hrimgar', {
  frame: 'brute', head: 'ape', helm: 'jarl', cover: 'fur', pad: 'iron', cape: true, capeFur: true, weapon: 'axe',
  fur: '#b4cce0', furTop: '#e8f4ff', skin: '#a8c8e0', skinTop: '#d0e4f4', face: '#4e6e8e', faceTop: '#7a98b8', eye: '#9fffe8', tusk: '#e8f4ff',
  iron: '#4e5e6e', ironTop: '#a0b0c0', gold: '#d8c070', horn: '#e8dcc0', hornTip: '#8a7a5a', cape: '#1a3a5a', capeEdge: '#9fffe8',
  metal: '#8aa8c0', metalTop: '#e0f0ff', vein: '#9fffe8', wood: '#3a2a1c', belt: '#3a2a1c', cloth: '#2a4a6a', band: '#4e5e6e', bandTop: '#a0b0c0', worldH: 5.8
}, {
  fx: 'nordlicht', emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'sweep', 'punch'], emi: [0.03, 0.08, 0.08],
  ambient: bsAmb3('hrimgar', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.45, r: 0.1, h: 0.5, s: 0.3, col: '#e8f6ff', op: 0.28 }, { k: 'rise', at: 'weapon', n: 3, sp: 0.8, r: 0.35, h: 0.8, s: 0.15 }])
});
// Torbjörn Gletscherbrecher (Gletschergruft): Golem aus Gletschereis, kantige Eisblöcke, Eiskristalle auf Rücken und
// Schultern, Fäuste aus Eis, Krone aus Eiszacken
bsWardReg3('torbjoern', {
  frame: 'giant', head: 'golem', crest: 'gem', cover: 'ice', plates: true, facet: true, fists: 'rock', weapon: 'none', loin: false,
  skin: '#6a98c0', skinTop: '#a8d0ec', stone: '#8ab8d8', stoneTop: '#e0f4ff', gem: '#9fd8f4', gemTop: '#eaf8ff', glow: '#bff0ff', vein: '#bff0ff', eye: '#3af0ff',
  belt: '#4a6a8a', cloth: '#3a5a7a', worldH: 4.8
}, {
  fx: 'eis', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.04, 0.08, 0.12], ptsO: { emitHand: true },
  ambient: bsAmb3('torbjoern', [{ k: 'snow', at: 'back', n: 5, sp: 0.45, r: 1.3 }, { k: 'ground', n: 3, sp: 0.25, r: 1.4, col: '#e8f6ff', op: 0.22 }])
});
// Moorschlund (Moorkrypta): aufgedunsener Ghul, Schlund statt Gesicht (Zahnreihen, Zunge), vier Augen, Bauch mit
// Pusteln und glimmenden Nähten
bsWardReg3('moorschlund', {
  frame: 'giant', head: 'maw', headK: 1.5, belly: true, weapon: 'none', loin: true,
  skin: '#4a5a2a', skinTop: '#6a7a3e', belly: '#5a6a34', bellyTop: '#7a8a4a', sac: '#8a9a3a', sacTop: '#c8d86a', glow: '#c8ff4a', eye: '#e8ff4a',
  mouth: '#3a4a12', tongue: '#a8d04a', tooth: '#d8d0a8', claw: '#d8d0a8', cloth: '#2a2a1a', belt: '#2a2014', worldH: 4.8
}, {
  fx: 'moor', emit: 'mouth', melee: ['slam2', 'claw', 'punch'], emi: [0.04, 0.07, 0.01], jawOpen: 0.75,
  ambient: bsAmb3('moorschlund', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.8, r: 0.2, s: 0.16, col: '#a8d04a' }, { k: 'smoke', at: 'back', n: 4, sp: 0.3, r: 0.8, col: '#3a4a1e', op: 0.3 }, { k: 'ground', n: 3, sp: 0.2, r: 1.5, col: '#2a3a1a', op: 0.25 }])
});
// Kantor der Gebeine (Knochenkathedrale): Skelett im Chorgewand mit Kapuze, Orgelpfeifen aus Knochen am Rücken,
// Glockenstab
bsWardReg3('kantor', {
  frame: 'robe', head: 'skull', helm: 'hood', back: 'pipes', weapon: 'bell',
  robe: '#3a3448', robeTop: '#5a5070', sleeve: '#332c42', trim: '#c8a8ff', trimGlow: true, bone: '#e0d8c0', boneTop: '#f4f0e0', glow: '#c8a8ff', eye: '#c8a8ff',
  hood: '#2a2438', hoodTop: '#4a4060', wood: '#d8d0b8', metal: '#8a8270', metalTop: '#d8d0b8', worldH: 5.0
}, {
  fx: 'tod', emit: 'weapon', emi: [0.05, 0.03, 0.1],
  // Töne als Lichtfunken aus den Pfeifen, Seelenfeuer an der Glocke
  ambient: bsAmb3('kantor', [{ k: 'rise', at: 'back', n: 4, sp: 0.6, r: 0.25, h: 1.4, s: 0.16 }, { k: 'flame', at: 'weapon', n: 3, sp: 1.3, r: 0.2, s: 0.4 }])
});
// Der Knochenkoloss (Knochenkathedrale): Riese aus tausend Gebeinen – Rippen, Wirbel, eingewachsene Schädel mit
// glühenden Augen, Knochen ragen aus Schultern und Rücken, Schädel-Schulterstücke, Knochenkeule
bsWardReg3('knochenkoloss', {
  frame: 'giant', head: 'skull', cover: 'bone', skulls: true, pad: 'bone', weapon: 'club',
  skin: '#b8ae94', skinTop: '#ddd4bc', bone: '#e0d8c0', boneTop: '#f4f0e0', glow: '#c8a8ff', eye: '#c8a8ff', clubCol: '#d8d0b8', spike: '#a89c80',
  iron: '#4a4440', cloth: '#3a3028', belt: '#2a2420', claw: '#d8d0b8', worldH: 4.9
}, {
  fx: 'knochen', emit: 'weapon', lineStyle: 'smash', melee: ['slam2', 'chop', 'stomp'], emi: [0.05, 0.04, 0.08],
  ambient: bsAmb3('knochenkoloss', [{ k: 'rise', at: 'core', n: 3, sp: 0.4, r: 0.8, h: 1.8, s: 0.18, col: '#c8a8ff' }, { k: 'ground', n: 3, sp: 0.2, r: 1.4, col: '#2a2238', op: 0.25 }])
});
// Schmiedetroll Grumm (Donnerschmiede): Troll mit Hakennase, Hängeohren mit Ringen, Hauern, Haarkamm, Lederschürze,
// Eisen-Schulterstücken und Schmiedehammer mit Blitzrunen
bsWardReg3('grumm', {
  frame: 'brute', head: 'troll', apron: true, pad: 'iron', weapon: 'hammer', loin: false,
  skin: '#3a6a5a', skinTop: '#5a8a74', hair: '#1a2a24', tusk: '#e8dcc0', eye: '#9fd0ff', apron: '#4a3020', metal: '#5a5a66', metalTop: '#9a9aa8',
  gold: '#a87a3a', vein: '#9fd0ff', wood: '#3a2a1c', belt: '#3a2a1c', cloth: '#2a3a4a', iron: '#4a4a54', ironTop: '#8a8a96', band: '#5a4a3a', bandTop: '#a87a3a', worldH: 5.0
}, {
  fx: 'sturm', emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'slam2', 'punch'], emi: [0.04, 0.07, 0.12],
  ambient: bsAmb3('grumm', [{ k: 'rise', at: 'weapon', n: 3, sp: 1.4, r: 0.4, h: 0.6, s: 0.13, col: '#ffd08a' }, { k: 'bolt', at: 'weapon', to: 'core', sp: 2.3 }])
});
// Hornbrecher Thorak (Donnerschmiede): Minotaurus mit Stierkopf, großen Hörnern mit Goldringen, Nasenring, Hufen,
// Eisen-Schulterstücken und Doppelaxt mit Blitzschneiden
bsWardReg3('thorak', {
  frame: 'brute', head: 'bull', headK: 1.25, hooves: true, pad: 'iron', weapon: 'axe', weaponK: 1.1,
  skin: '#5a3a26', skinTop: '#7a5636', snout: '#2a1a14', horn: '#e8dcc0', hornTip: '#5a4a3a', gold: '#c8a03a', eye: '#9fd0ff', hair: '#2a1a10',
  fur: '#3a2618', furTop: '#5a3a24', hoof: '#1a1410', iron: '#4a4a54', ironTop: '#8a8a96', metal: '#6a6a76', metalTop: '#b8b8c8', vein: '#9fd0ff',
  wood: '#3a2a1c', belt: '#3a2214', cloth: '#2a3a5a', band: '#4a4a54', bandTop: '#8a8a96', worldH: 5.6
}, {
  fx: 'sturm', emit: 'weapon', lineStyle: 'smash', melee: ['chop', 'sweep', 'stomp'], emi: [0.04, 0.07, 0.12],
  ambient: bsAmb3('thorak', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.7, r: 0.1, h: 0.4, s: 0.25, col: '#cfd8e8', op: 0.3 }, { k: 'bolt', at: 'weapon', to: 'fist', sp: 2.1 }])
});
// Felsenhüter Ugrak (Sturmhorst): Steinriese, Felsplatten, Brocken mit Moos auf Schultern und Buckel, Felsfäuste
bsWardReg3('ugrak', {
  frame: 'giant', head: 'golem', cover: 'stone', pad: 'rock', back: 'boulders', fists: 'rock', weapon: 'none', loin: false,
  stone: '#6a6a72', stoneTop: '#9a9aa6', skin: '#5a5a62', skinTop: '#8a8a96', moss: '#5a7a4a', eye: '#cfe8ff', belt: '#3a3430', cloth: '#3a3a44', worldH: 5.0
}, {
  fx: 'erde', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.04, 0.05, 0.06], ptsO: { emitHand: true },
  ambient: bsAmb3('ugrak', [{ k: 'drip', at: 'back', n: 3, sp: 0.4, r: 0.8, h: 2.0, s: 0.12, col: '#8a8478' }])
});
// Sturmrufer Brontes (Sturmhorst): Sturmriese mit grauer Gewitterhaut, Wolkenbart mit Blitzfunken, Bronzepanzer an
// den Schultern, dunkler Wolkenumhang, Sturmstab mit Blitzkugel; über ihm braut sich eine Wolke
bsWardReg3('brontes', {
  frame: 'giant', head: 'giant', beard: 'cloud', pad: 'iron', cape: true, torn: true, weapon: 'staff', weaponK: 1.2,
  skin: '#6a7a92', skinTop: '#9aaac0', eye: '#e8f6ff', beard: '#cfd8e4', beard2: '#8a96a8', hair: '#8a96a8', vein: '#cfe8ff', iron: '#6a5a3a', ironTop: '#c8a060',
  gold: '#c8a060', cape: '#2a3048', capeEdge: '#8a96b8', wood: '#4a4a56', glow: '#e8f6ff', belt: '#3a3020', cloth: '#2a3048', band: '#6a5a3a', bandTop: '#c8a060', worldH: 5.2
}, {
  fx: 'himmel', emit: 'weapon', melee: ['slam2', 'punch', 'chop'], emi: [0.05, 0.06, 0.1],
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    bsPtA3(a, BOSS3.brontes, 'crown', _b3P);
    const cx = _b3P.x, cy = _b3P.y + 2.2, cz = _b3P.z;
    for (let i = 0; i < 5; i++) bsSmoke3(h, cx + Math.sin(i * 1.26 + t * 0.25) * 1.2, cy + Math.cos(i * 2.1) * 0.2, cz + Math.cos(i * 1.26 + t * 0.25) * 0.9, 1.3 + 0.3 * Math.sin(t + i), '#3a4058', 0.5);
    if ((t * 2.6) % 1 < 0.16) {
      _b3P2.set(cx + Math.sin(t * 7) * 0.7, cy - 0.2, cz);
      bsPtA3(a, BOSS3.brontes, 'weapon', _b3N);
      if (_b3N.distanceTo(_b3P2) < 7) bsBolt3(h, _b3P2, _b3N, th, 0.03, 0.9, 6);
    }
  }
});
// Schlackenfaust (Glutkessel): Golem aus erkalteter Schlacke, stumpfe Glut in den Fugen, Zackenkopf, riesige Fäuste
// aus Schlacke, aus denen Glut tropft
bsWardReg3('schlackenfaust', {
  frame: 'giant', head: 'golem', cover: 'magma', fists: 'rock', weapon: 'none', loin: false,
  stone: '#3a322c', stoneTop: '#6a5a4e', skin: '#3a2e26', skinTop: '#5a4838', vein: '#ff8a2a', eye: '#ffd27a', belt: '#1a1210', cloth: '#2a1a10', worldH: 4.6
}, {
  fx: 'glut', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.08, 0.04, 0.01], ptsO: { emitHand: true },
  ambient: bsAmb3('schlackenfaust', [{ k: 'drip', at: 'fist', n: 3, sp: 0.9, r: 0.15, s: 0.14, col: '#ff8a2a' }, { k: 'smoke', at: 'back', n: 4, sp: 0.35, r: 0.8, col: '#2a2220', op: 0.35 }])
});
// Ignaroth, Herz des Kessels (Glutkessel): Koloss aus Basalt mit hellen Lavaadern, Hörner aus Magma, offenes Herz
// in der Brust mit glühendem Kern, Felsfäuste
bsWardReg3('ignaroth', {
  frame: 'giant', head: 'golem', crest: 'horns', cover: 'magma', core: true, pad: 'rock', fists: 'rock', weapon: 'none', loin: false,
  stone: '#1e1614', stoneTop: '#4a3226', skin: '#2a1c16', skinTop: '#4a3022', vein: '#ff6a1a', eye: '#ffb04a', moss: '#ff8a2a', belt: '#1a1210', cloth: '#2a1a10', worldH: 5.0
}, {
  fx: 'feuer', emit: 'mouth', ptsO: { emitAt: 'core' }, melee: ['slam2', 'punch', 'stomp'], emi: [0.12, 0.05, 0.01],
  ambient: bsAmb3('ignaroth', [{ k: 'flame', at: 'core', n: 4, sp: 1.4, r: 0.3, s: 0.6 }, { k: 'rise', at: 'back', n: 5, sp: 0.5, r: 0.9, h: 2.4 }])
});
// Korvald Spiegelfaust (Spiegelgruft): Golem aus blauviolettem Spiegelkristall, Kristallkrone, Kristallbüschel auf
// Rücken und Schultern, Fäuste aus Kristall
bsWardReg3('korvald', {
  frame: 'giant', head: 'golem', crest: 'gem', cover: 'crystal', plates: true, facet: true, fists: 'rock', weapon: 'none', loin: false,
  stone: '#7a8ad8', stoneTop: '#c8d4ff', gem: '#a8c0ff', gemTop: '#f0f6ff', glow: '#ffffff', vein: '#e0f0ff', eye: '#ffffff', skin: '#5a6ab8', skinTop: '#9aa8e8',
  belt: '#3a4a8a', cloth: '#2a3a7a', worldH: 4.8
}, {
  fx: 'spiegel', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.06, 0.07, 0.12], ptsO: { emitHand: true },
  ambient: bsAmb3('korvald', [{ k: 'orbit', n: 4, R: 1.6, tex: 'shard' }])
});
// Gharon, Wächter des Schlunds (Thron der Leere): Golem aus Leerenkristall, schwarzviolett mit leuchtenden Rissen,
// Hörner, Ketten der Leere, Kristallfäuste
bsWardReg3('gharon', {
  frame: 'giant', head: 'golem', crest: 'horns', cover: 'crystal', plates: true, facet: true, fists: 'rock', chains: true, weapon: 'none', loin: false,
  stone: '#2a2050', stoneTop: '#5a4a90', gem: '#6a3aaa', gemTop: '#c86aff', glow: '#c86aff', vein: '#c86aff', eye: '#e8b8ff', skin: '#1e1838', skinTop: '#3a3060',
  iron: '#2a2240', belt: '#1a1430', cloth: '#1a1030', worldH: 4.8
}, {
  fx: 'leere', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.06, 0.02, 0.1], ptsO: { emitHand: true },
  ambient: bsAmb3('gharon', [{ k: 'smoke', at: 'back', n: 4, sp: 0.3, r: 0.8, col: '#140a24', op: 0.4 }, { k: 'rise', at: 'core', n: 3, sp: 0.5, r: 0.6, h: 1.4, s: 0.16 }])
});

// ============================================================================================================
// Vierbeiner-Wächter auf dem Wolf-Bauplan (bsWolf3) mit eigenem Kopf (bsBeastHead3: Katze, Bock), Hufen, Schwanz und
// eigenem Zubehör (V.extra):
// - Skadi, die Raureifjägerin (Gletschergruft): weiße Eiswölfin, Eiskristalle wachsen entlang des Rückens
// - Fenrik, der Moorwolf (Moorkrypta): fauliger Wolf, freiliegende Rippen, Moos und Schlamm auf dem Rücken
// - Raik, der Sturmbock (Donnerschmiede): Bock mit Widderhörnern, über die Blitze laufen, Ziegenbart, Hufe
// - Glutpranke Sahir (Glutkessel): schwarze Glutkatze mit glühenden Streifen, Säbelzähne
// - Nachtkralle (Thron der Leere): Schattenkatze, violette Streifen, Leerensplitter entlang des Rückgrats
// ============================================================================================================
function bsBeastHead3(A, hb, jb, J, C, V) {
  const E = J.ear;
  if (V.headKind === 'cat') {
    A(ball(16), C.fur, { bone: hb, p: [0, 1.7, 1.16], s: [0.22, 0.2, 0.21], top: C.furTop, topK: 0.55, shade: 0.25 });
    A(loft3([[1.22, 1.645, 0.14, 0.1, 0.08], [1.34, 1.625, 0.11, 0.085, 0.06], [1.43, 1.615, 0.07, 0.06, 0.045]], 12, 3), C.fur, { bone: hb, top: C.furTop, topK: 0.5, shade: 0.2 });
    A(ball(10), C.muzzle || C.belly, { bone: hb, p: [0, 1.6, 1.37], s: [0.1, 0.055, 0.075], noShadow: true });
    A(ball(8), C.nose || '#1a1014', { bone: hb, p: [0, 1.66, 1.445], s: [0.035, 0.024, 0.02] });
    A(loft3([[1.22, 1.55, 0.11, 0.035, 0.05], [1.4, 1.555, 0.07, 0.025, 0.03]], 10, 2), C.furD, { bone: jb, shade: 0.3 });
    A(loft3([[1.24, 1.565, 0.09, 0.015, 0.015], [1.38, 1.565, 0.06, 0.012, 0.012]], 8, 2), '#3a1418', { bone: jb, noShadow: true });
    for (const sx of [-1, 1]) {
      // Säbelzähne, Schnurrhaare, große Augen mit Schlitzpupille, Brauen
      A(tube3([[sx * 0.05, 1.59, 1.37], [sx * 0.056, 1.5, 1.39], [sx * 0.044, 1.41, 1.36]], 0.02, 0.004, 10, 6), C.tooth, { bone: hb, shine: 0.7 });
      for (let k = 0; k < 3; k++) A(tube3([[sx * 0.07, 1.61 - k * 0.012, 1.4], [sx * 0.2, 1.615 - k * 0.02, 1.4 - k * 0.02], [sx * 0.32, 1.6 - k * 0.045, 1.35 - k * 0.05]], 0.005, 0.002, 6, 3), C.whisker || '#e8e0d0', { bone: hb, noShadow: true });
      A(ball(10), '#0a0808', { bone: hb, p: [sx * 0.095, 1.735, 1.31], s: [0.055, 0.04, 0.035], noShadow: true });
      A(ball(8), C.eye, { bone: hb, p: [sx * 0.098, 1.735, 1.325], s: [0.045, 0.032, 0.025], r: [0, sx * 0.4, sx * 0.2], mat: 'glow' });
      A(box3(), '#0a0808', { bone: hb, p: [sx * 0.1, 1.735, 1.345], r: [0, sx * 0.4, 0], s: [0.008, 0.05, 0.008], noShadow: true });
      A(roundBox(0.1, 0.03, 0.12, 0.012), C.furD, { bone: hb, p: [sx * 0.1, 1.775, 1.29], r: [0.2, sx * 0.3, sx * 0.4], shade: 0.2 });
      const eb = sx > 0 ? BQ3.earL : BQ3.earR;
      const Pe = [sx * (E[0] + 0.02), E[1] - 0.01, E[2] + 0.08];
      pointAt3(A, horn3(0.18, 0.085, 6), C.fur, Pe, [sx * 0.35, 1, -0.1], { bone: eb, top: C.furTop, topK: 0.6, s: [1, 1, 0.45] });
      pointAt3(A, horn3(0.13, 0.05, 5), C.earIn, [Pe[0], Pe[1] + 0.01, Pe[2] + 0.02], [sx * 0.35, 1, -0.1], { bone: eb, s: [1, 1, 0.3], noShadow: true });
      bsSpike3(A, 0.1, 0.012, C.furD, [Pe[0] + sx * 0.06, Pe[1] + 0.16, Pe[2] - 0.01], [sx * 0.2, 1, 0], { bone: eb, seg: 4 });
      bsTufts3(A, [0, 1, 2].map((k) => [[sx * 0.19, 1.64 - k * 0.05, 1.14 - k * 0.04], [sx * 0.8, -0.3, -0.5], 0.14, 0.05, hb]), C.ruff, C.furTop);
    }
    return;
  }
  // Bock: schmaler, langer Schädel, Ziegenbart, Schlappohren, Augen mit Querpupille, große Widderhörner
  A(ball(16), C.fur, { bone: hb, p: [0, 1.73, 1.1], s: [0.18, 0.18, 0.2], top: C.furTop, topK: 0.55, shade: 0.25 });
  A(loft3([[1.2, 1.67, 0.12, 0.1, 0.08], [1.4, 1.61, 0.09, 0.08, 0.06], [1.57, 1.56, 0.065, 0.06, 0.045], [1.65, 1.54, 0.04, 0.04, 0.03]], 12, 3), C.fur, { bone: hb, top: C.furTop, topK: 0.5, shade: 0.2 });
  A(ball(8), C.nose || '#1a1416', { bone: hb, p: [0, 1.56, 1.655], s: [0.045, 0.03, 0.02] });
  A(loft3([[1.22, 1.53, 0.09, 0.03, 0.04], [1.56, 1.5, 0.05, 0.025, 0.03]], 10, 2), C.furD, { bone: jb, shade: 0.3 });
  bsTufts3(A, [0, 1, 2].map((k) => [[(k - 1) * 0.03, 1.48, 1.38 + k * 0.02], [(k - 1) * 0.2, -1, 0.15], 0.3 - Math.abs(k - 1) * 0.06, 0.05, jb]), C.beard || C.furD, C.fur);
  for (const sx of [-1, 1]) {
    A(ball(10), '#0a0808', { bone: hb, p: [sx * 0.135, 1.765, 1.19], s: [0.045, 0.04, 0.04], noShadow: true });
    A(ball(8), C.eye, { bone: hb, p: [sx * 0.148, 1.765, 1.2], s: [0.035, 0.03, 0.03], mat: 'glow' });
    A(box3(), '#0a0808', { bone: hb, p: [sx * 0.168, 1.765, 1.205], r: [0, sx * 0.9, 0], s: [0.04, 0.008, 0.008], noShadow: true });
    const eb = sx > 0 ? BQ3.earL : BQ3.earR;
    pointAt3(A, horn3(0.2, 0.05, 5), C.fur, [sx * 0.16, 1.79, 1.04], [sx, -0.25, -0.2], { bone: eb, top: C.furTop, s: [1, 1, 0.35] });
    const hp = [[sx * 0.07, 1.86, 1.1], [sx * 0.2, 1.99, 0.95], [sx * 0.35, 1.94, 0.76], [sx * 0.42, 1.74, 0.78], [sx * 0.38, 1.6, 0.96], [sx * 0.31, 1.62, 1.12]];
    A(tube3(hp, 0.075, 0.018, 26, 9), C.horn, { bone: hb, top: C.hornTip, topK: 0.6, shine: 0.6 });
    for (let k = 1; k < 5; k++) A(torus3(0.068 - k * 0.009, 0.01, Math.PI * 2, 3, 10), C.hornTip, { bone: hb, p: hp[k], r: [Math.PI / 2, sx * 0.6 * k, 0], noShadow: true });
    if (C.glow) A(tube3([hp[0], hp[1], hp[2]].map((q) => [q[0] * 1.06, q[1] + 0.06, q[2]]), 0.012, 0.006, 10, 4), C.glow, { bone: hb, mat: 'glow', noShadow: true });
  }
}
const BS_GUARD_WOLF3 = Object.assign({}, BS_WOLF_DEF3, { blob: 1.3, dome: 1.4, pts: Object.assign({}, BS_WOLF_PTS3, { tail: [BQ3.t3, [0, 0.74, -2.36]] }) });
// Rückenpunkte für Zubehör entlang des Wolf-Rückens: [x, y, z, Knochen]
const BS_WOLF_BACK3 = [[0, 1.66, 0.62, BQ3.chest], [0, 1.58, 0.32, BQ3.chest], [0, 1.5, 0.0, BQ3.body], [0, 1.47, -0.35, BQ3.body], [0, 1.47, -0.7, BQ3.body], [0, 1.44, -0.98, BQ3.body]];
MON3_BUILD.skadi = (b) => bsWolf3(b, 'skadi', {
  fur: '#dce8f2', furTop: '#ffffff', furD: '#a8bed0', ruff: '#c8d8e6', belly: '#f4f8fc', claw: '#2a3440', tooth: '#f4f8ff', eye: '#3af0ff', earIn: '#8aa8c0',
  gem: '#9fd8f4', gemTop: '#eaf8ff', glow: '#bff0ff', mane: 'small', worldH: 4.6,
  extra(A, b, id, J, C) {
    // Eiskristalle entlang des Rückens und an den Schultern
    BS_WOLF_BACK3.forEach(([x, y, z, bn], i) => {
      for (const sx of i % 2 ? [-1, 1] : [0]) {
        const len = 0.42 - i * 0.04;
        A(bsOcta3(), C.gem, { bone: bn, p: [x + sx * 0.08, y + len * 0.3, z], r: [-0.5, 0, sx * 0.4], s: [0.05, len * 0.5, 0.05], top: C.gemTop, topK: 0.5, shine: 1 });
        A(bsOcta3(), C.glow, { bone: bn, p: [x + sx * 0.08, y + len * 0.3, z], r: [-0.5, 0, sx * 0.4], s: [0.025, len * 0.4, 0.025], mat: 'glow', noShadow: true });
      }
    });
    for (const sx of [-1, 1]) A(bsOcta3(), C.gem, { bone: sx > 0 ? BQ3.upFL : BQ3.upFR, p: [sx * 0.42, 1.3, 0.5], r: [0, 0, -sx * 0.7], s: [0.04, 0.16, 0.04], top: C.gemTop, shine: 1 });
  }
});
BOSS3.skadi = Object.assign({}, BS_GUARD_WOLF3, {
  fx: 'eis', emi: [0.04, 0.08, 0.12],
  ambient: bsAmb3('skadi', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.5, r: 0.08, h: 0.5, s: 0.25, col: '#e8f6ff', op: 0.3 }, { k: 'snow', at: 'back', n: 3, sp: 0.5, r: 0.8, h: 2 }])
});
MON3_BUILD.fenrik = (b) => bsWolf3(b, 'fenrik', {
  fur: '#2e3a22', furTop: '#4a5a34', furD: '#1e2616', ruff: '#26301c', belly: '#3e4a2a', claw: '#c8c0a0', tooth: '#d8d0a8', eye: '#e8ff4a', earIn: '#3a2a1e',
  bone: '#d8d0b8', moss: '#4a6a24', glow: '#c8ff4a', mane: 'small', worldH: 4.6,
  extra(A, b, id, J, C) {
    // freiliegende Rippen an beiden Flanken, Wirbel am Rücken, Moos und Schlamm, Pusteln
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 4; k++) A(torus3(0.2, 0.018, Math.PI * 0.6, 3, 10), C.bone, { bone: BQ3.body, p: [sx * 0.2, 1.24, -0.12 - k * 0.12], r: [0, sx * Math.PI / 2, sx > 0 ? 0.25 : Math.PI - 0.25], noShadow: true });
      A(box3(), '#141a0e', { bone: BQ3.body, p: [sx * 0.27, 1.22, -0.3], s: [0.02, 0.18, 0.42], noShadow: true });
    }
    BS_WOLF_BACK3.forEach(([x, y, z, bn], i) => {
      A(roundBox(0.07, 0.05, 0.08, 0.02), C.bone, { bone: bn, p: [x, y + 0.02, z], shine: 0.3, noShadow: true });
      if (i % 2) A(ball(10), C.moss, { bone: bn, p: [x + 0.1, y - 0.02, z - 0.1], s: [0.16, 0.05, 0.14], top: lighter(C.moss, 0.2), noShadow: true });
      if (i % 3 === 0) A(ball(6), C.glow, { bone: bn, p: [x - 0.14, y - 0.06, z + 0.05], s: 0.04, mat: 'glow', noShadow: true });
    });
  }
});
BOSS3.fenrik = Object.assign({}, BS_GUARD_WOLF3, {
  fx: 'moor', emi: [0.04, 0.07, 0.01],
  ambient: bsAmb3('fenrik', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.8, r: 0.06, s: 0.12, col: '#a8d04a' }, { k: 'smoke', at: 'back', n: 4, sp: 0.3, r: 0.8, col: '#2a3a1a', op: 0.32 }])
});
MON3_BUILD.raik = (b) => bsWolf3(b, 'raik', {
  fur: '#5a6070', furTop: '#8a92a4', furD: '#3a3e4a', ruff: '#4a505e', belly: '#7a8090', claw: '#2a2a30', tooth: '#e8e4d8', eye: '#9fd0ff', earIn: '#4a3a3a',
  horn: '#3a3632', hornTip: '#c8b890', hoof: '#1e1c1c', beard: '#2e3038', glow: '#9fd0ff', headKind: 'goat', hooves: true, tail: 'stub', mane: 'small', worldH: 4.4
});
BOSS3.raik = Object.assign({}, BS_GUARD_WOLF3, {
  fx: 'sturm', melee: ['maul', 'bite', 'claw'], howl: false, emi: [0.04, 0.07, 0.12],
  // Blitze springen zwischen den Hörnern, Funken an den Hufen
  ambient: bsAmb3('raik', [{ k: 'bolt', at: 'sky', to: 'mouth', sp: 2.4, w: 0.02 }, { k: 'rise', at: 'weapon', n: 3, sp: 0.9, r: 0.3, h: 0.6, s: 0.12 }])
});
MON3_BUILD.sahir = (b) => bsWolf3(b, 'sahir', {
  fur: '#1e100a', furTop: '#3a2214', furD: '#120804', ruff: '#2a160c', belly: '#4a2a18', claw: '#e8dcc0', tooth: '#f4ead4', eye: '#ffd34d', earIn: '#5a2a10',
  muzzle: '#3a2014', glow: '#ffb04a', headKind: 'cat', tail: 'cat', mane: 0, worldH: 4.4,
  extra(A, b, id, J, C) {
    // glühende Streifen über Flanken, Rücken, Beine und Schwanz
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const z = 0.6 - k * 0.24;
        A(box3(), C.glow, { bone: z > 0.15 ? BQ3.chest : BQ3.body, p: [sx * (0.3 - Math.abs(k - 3) * 0.008), 1.32, z], r: [0.15 * sx, 0, sx * (0.9 + 0.2 * Math.sin(k * 2.1))], s: [0.018, 0.26, 0.035], mat: 'glow', noShadow: true });
      }
      for (const [front, L] of [[true, J.fl], [false, J.bl]]) {
        const [ub, lb] = bsLegQ3(front, sx);
        A(box3(), C.glow, { bone: ub, p: [sx * (L[0][0] + 0.12), (L[0][1] + L[1][1]) / 2, (L[0][2] + L[1][2]) / 2], r: [0, 0, sx * 0.4], s: [0.016, 0.16, 0.03], mat: 'glow', noShadow: true });
        A(box3(), C.glow, { bone: lb, p: [sx * (L[1][0] + 0.07), (L[1][1] + L[2][1]) / 2, (L[1][2] + L[2][2]) / 2], r: [0, 0, sx * 0.5], s: [0.014, 0.12, 0.025], mat: 'glow', noShadow: true });
      }
    }
    for (let k = 0; k < 4; k++) A(torus3(0.07, 0.012, Math.PI * 2, 3, 10), C.glow, { bone: k < 2 ? BQ3.t2 : BQ3.t3, p: [0, 1.15 - k * 0.12, -1.6 - k * 0.2], r: [0.5, 0, 0], mat: 'glow', noShadow: true });
  }
});
BOSS3.sahir = Object.assign({}, BS_GUARD_WOLF3, {
  fx: 'feuer', howl: false, melee: ['claw', 'bite', 'maul'], gait: 1.15, emi: [0.12, 0.05, 0.01],
  ambient: bsAmb3('sahir', [{ k: 'rise', at: 'back', n: 5, sp: 0.7, r: 0.6, h: 1.2, tex: 'flame', s: 0.35 }, { k: 'rise', at: 'tail', n: 2, sp: 0.9, r: 0.1, h: 0.6, s: 0.14 }])
});
MON3_BUILD.nachtkralle = (b) => bsWolf3(b, 'nachtkralle', {
  fur: '#120e1e', furTop: '#2a2240', furD: '#0a0812', ruff: '#1a1428', belly: '#241c38', claw: '#c8b8e8', tooth: '#e8e0f4', eye: '#e08aff', earIn: '#3a1a4a',
  muzzle: '#1e1830', whisker: '#c8a8ff', glow: '#c86aff', gem: '#3a1a6a', gemTop: '#c86aff', headKind: 'cat', tail: 'cat', mane: 0, worldH: 4.6,
  extra(A, b, id, J, C) {
    // violette Streifen und Leerensplitter entlang des Rückgrats, Schwanzspitze als Klinge
    for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) {
      const z = 0.5 - k * 0.3;
      A(box3(), C.glow, { bone: z > 0.15 ? BQ3.chest : BQ3.body, p: [sx * 0.3, 1.3, z], r: [0, 0, sx * (1.1 + 0.3 * Math.sin(k))], s: [0.014, 0.22, 0.03], mat: 'glow', noShadow: true });
    }
    BS_WOLF_BACK3.forEach(([x, y, z, bn], i) => {
      if (i === 0) return;
      A(bsOcta3(), C.gem, { bone: bn, p: [x, y + 0.12, z], r: [-0.6, 0, 0], s: [0.04, 0.2 - i * 0.015, 0.04], top: C.gemTop, topK: 0.5, shine: 1 });
    });
    A(bsBlade3('nachtklinge', [[0, 0], [0.12, 0.06], [0.32, 0], [0.12, -0.06]], 0.02, 0.006), C.gemTop, { bone: BQ3.t3, p: [0, 0.74, -2.38], r: [0.3, Math.PI, 0], mat: 'glow', noShadow: true });
  }
});
BOSS3.nachtkralle = Object.assign({}, BS_GUARD_WOLF3, {
  fx: 'leere', howl: false, melee: ['claw', 'bite', 'maul'], gait: 1.15, emi: [0.06, 0.02, 0.1],
  ambient: bsAmb3('nachtkralle', [{ k: 'smoke', at: 'back', n: 4, sp: 0.4, r: 0.7, col: '#140a24', op: 0.35 }, { k: 'rise', at: 'tail', n: 2, sp: 0.7, r: 0.1, h: 0.8, s: 0.14 }])
});

// ============================================================================================================
// Vierbeiner-Wächter auf dem Bär-Bauplan (bsBear3):
// - Bjarki Eispranke (Feste des Nordlichts): Eisbär mit Panzer aus Gletschereis auf Schultern und Rücken, Eiskrallen
// - Sturmhorn, der Urmammut (Feste des Nordlichts): Mammut – hoher Schädel, Rüssel, lange geschwungene Stoßzähne,
//   zottiges Fell bis fast zum Boden, Höcker, Reif im Fell
// ============================================================================================================
const BS_BEAR_G3 = Object.assign({}, BS_BEAR_BOSS3, { blob: 1.5, dome: 1.4 });
MON3_BUILD.bjarki = (b) => bsBear3(b, 'bjarki', {
  fur: '#e4eef4', furTop: '#ffffff', furD: '#b8ccd8', muzzle: '#d0dde6', mouth: '#2a3440', claw: '#bff0ff', tooth: '#f4f8ff', eye: '#3affc8', earIn: '#8aa0b0',
  ice: '#9fd8f4', iceTop: '#eaf8ff', glow: '#9fffe8', worldH: 4.8,
  extra(A, b, id, J, C, rows) {
    // Eispanzer: Kristallbüschel auf den Schultern, Eisplatten über dem Rücken
    for (const sx of [-1, 1]) {
      for (const [dx, dy, dz, len, ang] of [[0.32, 1.72, 0.42, 0.42, 0.4], [0.42, 1.6, 0.3, 0.32, 0.8], [0.25, 1.75, 0.15, 0.36, 0.25]]) {
        A(bsOcta3(), C.ice, { bone: BQ3.chest, p: [sx * dx, dy, dz], r: [0, 0, -sx * ang], s: [0.07, len * 0.5, 0.07], top: C.iceTop, topK: 0.5, shine: 1 });
        A(bsOcta3(), C.glow, { bone: BQ3.chest, p: [sx * dx, dy, dz], r: [0, 0, -sx * ang], s: [0.035, len * 0.42, 0.035], mat: 'glow', noShadow: true });
      }
    }
    for (let k = 0; k < 5; k++) {
      const z = 0.3 - k * 0.3;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      A(roundBox(0.5 - Math.abs(k - 2) * 0.05, 0.06, 0.26, 0.03), k % 2 ? C.ice : C.iceTop, { bone: z > 0 ? BQ3.chest : BQ3.body, p: [0, r[1] + r[3] * 0.92, z], r: [0.08, 0, 0], shine: 1 });
    }
  }
});
BOSS3.bjarki = Object.assign({}, BS_BEAR_G3, {
  fx: 'nordlicht', emi: [0.03, 0.08, 0.08],
  ambient: bsAmb3('bjarki', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.5, r: 0.08, h: 0.5, s: 0.3, col: '#e8f6ff', op: 0.3 }, { k: 'snow', at: 'back', n: 3, sp: 0.45, r: 0.9, h: 2.2 }])
});
MON3_BUILD.sturmhorn = (b) => bsBear3(b, 'sturmhorn', {
  fur: '#6a5444', furTop: '#9a8268', furD: '#4a3a2e', muzzle: '#5a4638', mouth: '#2a1a14', claw: '#2a221c', tooth: '#efe6d0', eye: '#9fe8ff', earIn: '#3a2a22',
  tusk: '#f0e8d4', tuskTop: '#ffffff', frost: '#e8f6ff', worldH: 5.8,
  head(A, hb, jb, J, C) {
    // hoher Schädel, Rüssel, Stoßzähne, kleine Ohren
    A(ball(16), C.fur, { bone: hb, p: [0, 1.56, 1.08], s: [0.3, 0.34, 0.28], top: C.furTop, topK: 0.55, shade: 0.25 });
    A(ball(14), C.muzzle, { bone: hb, p: [0, 1.38, 1.28], s: [0.2, 0.2, 0.16], shade: 0.25 });
    A(tube3([[0, 1.36, 1.36], [0, 1.18, 1.46], [0, 0.88, 1.5], [0, 0.56, 1.46], [0, 0.34, 1.54], [0, 0.28, 1.68]], 0.12, 0.05, 22, 10), C.muzzle, { bone: hb, top: lighter(C.muzzle, 0.15), topK: 0.5, shade: 0.2 });
    for (let k = 0; k < 6; k++) A(torus3(0.11 - k * 0.011, 0.012, Math.PI * 2, 3, 12), darker(C.muzzle, 0.25), { bone: hb, p: [0, 1.22 - k * 0.15, 1.46 + (k > 3 ? 0.02 : 0)], r: [Math.PI / 2 + 0.2, 0, 0], noShadow: true });
    A(roundBox(0.18, 0.06, 0.14, 0.03), C.mouth, { bone: jb, p: [0, 1.22, 1.24], shade: 0.3 });
    for (const sx of [-1, 1]) {
      A(tube3([[sx * 0.15, 1.3, 1.28], [sx * 0.26, 1.02, 1.48], [sx * 0.38, 0.76, 1.74], [sx * 0.34, 0.74, 2.02], [sx * 0.2, 0.9, 2.14]], 0.07, 0.02, 24, 9), C.tusk, { bone: hb, top: C.tuskTop, topK: 0.5, shine: 0.6 });
      A(torus3(0.075, 0.016, Math.PI * 2, 3, 12), C.frost, { bone: hb, p: [sx * 0.2, 1.17, 1.36], r: [0.6, 0, sx * 0.4], noShadow: true });
      A(ball(8), '#0c0a08', { bone: hb, p: [sx * 0.2, 1.52, 1.28], s: [0.035, 0.03, 0.03], noShadow: true });
      A(ball(8), C.eye, { bone: hb, p: [sx * 0.205, 1.52, 1.29], s: [0.026, 0.02, 0.02], mat: 'glow' });
      const eb = sx > 0 ? BQ3.earL : BQ3.earR;
      A(ball(10), C.fur, { bone: eb, p: [sx * 0.27, 1.5, 0.98], s: [0.04, 0.16, 0.12], r: [0, 0, sx * 0.3], top: C.furTop });
    }
    bsTufts3(A, Array.from({ length: 9 }, (_, k) => { const a = (k / 8 - 0.5) * 2.4; return [[Math.sin(a) * 0.22, 1.8 + Math.cos(a) * 0.06, 1.0], [Math.sin(a) * 0.5, 0.6, -0.6], 0.24, 0.07, hb]; }), C.furD, C.furTop);
  },
  extra(A, b, id, J, C, rows) {
    // Zottelfell bis fast zum Boden, Höcker, Reif im Fell
    const skirt = [];
    for (let i = 0; i < 26; i++) {
      const z = 0.75 - (i % 13) * 0.16;
      const sx = i < 13 ? 1 : -1;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      skirt.push([[sx * r[2] * 0.95, r[1] - r[4] * 0.2, z], [sx * 0.25, -1, -0.1], 0.5 + 0.08 * Math.sin(i * 1.7), 0.09, z > 0.1 ? BQ3.chest : BQ3.body]);
    }
    for (let i = 0; i < 7; i++) skirt.push([[(i - 3) * 0.1, 1.05, 0.88], [(i - 3) * 0.1, -1, 0.2], 0.5, 0.09, BQ3.chest]);
    bsTufts3(A, skirt, C.furD, C.fur);
    for (let i = 0; i < 6; i++) {
      const z = 0.45 - i * 0.18;
      const r = rows.find((q) => q[0] >= z) || rows[rows.length - 1];
      bsTufts3(A, [[[Math.sin(i * 2) * 0.1, r[1] + r[3] * 0.95, z], [0, 1, -0.5], 0.28, 0.09, z > 0 ? BQ3.chest : BQ3.body]], C.fur, C.furTop);
      A(ball(8), C.frost, { bone: z > 0 ? BQ3.chest : BQ3.body, p: [Math.sin(i * 2.7) * 0.3, r[1] + r[3] * 0.8, z], s: [0.08, 0.025, 0.06], noShadow: true });
    }
  }
});
BOSS3.sturmhorn = Object.assign({}, BS_BEAR_G3, {
  fx: 'eis', melee: ['maul', 'bite', 'claw'], gait: 0.7, emi: [0.04, 0.08, 0.12], blob: 1.8, dome: 1.5,
  pts: Object.assign({}, BS_BEAR_PTS3, { mouth: [BQ3.head, [0, 0.3, 1.66]], emit: [BQ3.head, [0, 0.3, 1.66]], sky: [BQ3.head, [0, 1.9, 1.1]] }),
  ambient: bsAmb3('sturmhorn', [{ k: 'smoke', at: 'mouth', n: 2, sp: 0.45, r: 0.08, h: 0.5, s: 0.35, col: '#e8f6ff', op: 0.3 }, { k: 'ground', n: 3, sp: 0.25, r: 1.8, col: '#e8f6ff', op: 0.2 }, { k: 'snow', at: 'back', n: 3, sp: 0.45, r: 1.2 }])
});

// ============================================================================================================
// Abwandlungen der Baupläne aus Paket 1 und 2 (eigene Köpfe, Kronen, Waffen, Zubehör und Farben)
// ============================================================================================================
// --- Lich (bsLich3): Eiskönig Hrim (Eisgrotte), Bischof Mortheim, Seelenfänger Varis (Knochenkathedrale), Xul, der
// Hohle (Thron der Leere) ---
const BS_LICH_BOSS3 = {
  kind: 'biped', melee: ['chop', 'claw', 'sweep'], emit: 'weapon', cape: true, float: 0.32, blob: 1.2, dome: 1.35,
  pts: BS_LICH_PTS3, deathPts: ['core', 'mouth', 'back', 'weapon'], skyAt: 'sky', gait: 0.6,
  base: { aRx: -0.25, aRe: -1.25, aRz: 0.15, aLx: -0.45, aLe: -0.9, aLz: 0.3, lean: 0.05 }
};
// Eiskönig Hrim: frostblaue Robe, Eiskrone mit hohen Zacken, Bart aus Eiszapfen, Eisstab, Frostmantel
MON3_BUILD.eiskoenig = (b) => bsLich3(b, 'eiskoenig', {
  robe: '#3a6a98', robeTop: '#7aaad0', bone: '#d8ecf8', boneTop: '#f4fbff', iron: '#5a7a98', ironTop: '#a8c8e0', glow: '#9fe8ff', wood: '#6a8aa8',
  cape: '#2a4e7a', capeEdge: '#cfeeff', skin: '#3a6a98', skinTop: '#7aaad0', gem: '#9fd8f4', gemTop: '#eaf8ff', headgear: 'ice', staff: 'ice', worldH: 5.4
});
BOSS3.eiskoenig = Object.assign({}, BS_LICH_BOSS3, {
  fx: 'eis', emi: [0.04, 0.08, 0.12],
  ambient: bsAmb3('eiskoenig', [{ k: 'orbit', n: 4, R: 1.5, tex: 'shard' }, { k: 'snow', at: 'back', n: 4, sp: 0.5, r: 1.0, h: 3 }, { k: 'ground', n: 3, sp: 0.25, r: 1.2, col: '#e8f6ff', op: 0.22 }])
});
// Bischof Mortheim: violettes Messgewand mit goldener Stola, Mitra mit Stein, goldener Krummstab, kein Stachelkragen
MON3_BUILD.mortheim = (b) => bsLich3(b, 'mortheim', {
  robe: '#3a2048', robeTop: '#6a4a82', bone: '#e0d8c0', boneTop: '#f4f0e0', iron: '#5a4a30', ironTop: '#c8a050', glow: '#c89aff', wood: '#2a1a14',
  cape: '#24142e', capeEdge: '#8a5ab8', skin: '#3a2048', skinTop: '#6a4a82', mitre: '#e8e0d0', mitreTop: '#ffffff', gold: '#c8a03a', stole: '#6a1a2a',
  headgear: 'mitre', staff: 'crozier', noCollar: true, stole: true, worldH: 5.4
});
BOSS3.mortheim = Object.assign({}, BS_LICH_BOSS3, {
  fx: 'tod', emi: [0.05, 0.03, 0.1],
  ambient: bsAmb3('mortheim', [{ k: 'flame', at: 'weapon', n: 3, sp: 1.3, r: 0.2, s: 0.45 }, { k: 'rise', at: 'core', n: 3, sp: 0.4, r: 1.6, h: 1.6, tex: 'flame', s: 0.4 }])
});
// Seelenfänger Varis: zerrissene Kapuzenrobe, Ketten über Brust und Leib, Seelenlaterne an der Kette
MON3_BUILD.varis = (b) => bsLich3(b, 'varis', {
  robe: '#2a1e44', robeTop: '#4e3a78', bone: '#d8d0c0', boneTop: '#f0ead8', iron: '#3a3448', ironTop: '#7a7090', glow: '#c8ff6a', wood: '#2a2230',
  cape: '#1e1430', capeEdge: '#5a3a9a', skin: '#2a1e44', skinTop: '#4e3a78', headgear: 'hood', staff: 'lantern', chains: true, noCollar: true, worldH: 5.2
});
BOSS3.varis = Object.assign({}, BS_LICH_BOSS3, {
  fx: 'tod', emi: [0.04, 0.06, 0.02],
  // gefangene Seelen kreisen um die Laterne
  ambient: bsAmb3('varis', [{ k: 'pulse', at: 'weapon', s: 1.0, op: 0.35, col: '#c8ff6a' }, { k: 'orbit', n: 4, R: 1.3, tex: 'flame' }])
});
// Xul, der Hohle: Kapuze ohne Gesicht – nur Leere und zwei Augen, schwarzviolette Robe, Stachelkragen, Seelenkäfig
MON3_BUILD.xul = (b) => bsLich3(b, 'xul', {
  robe: '#1a1430', robeTop: '#3a2a60', bone: '#b8a8d8', boneTop: '#e0d8f4', iron: '#241c3a', ironTop: '#6a5a9a', glow: '#c86aff', wood: '#1a1428',
  cape: '#120c22', capeEdge: '#4a2a7a', skin: '#1a1430', skinTop: '#3a2a60', headgear: 'void', worldH: 5.4
});
BOSS3.xul = Object.assign({}, BS_LICH_BOSS3, {
  fx: 'leere', emi: [0.06, 0.02, 0.1],
  ambient: bsAmb3('xul', [{ k: 'smoke', at: 'core', n: 4, sp: 0.35, r: 0.6, col: '#140a24', op: 0.4 }, { k: 'orbit', n: 5, R: 1.5, tex: 'shard' }])
});

// --- Herrin (bsSorc3): Ilva, Weberin des Frosts (Gletschergruft), Aurra, Seherin des Nordlichts (Feste des
// Nordlichts), Hexe Morgrah (Moorkrypta), Ysolde, Stimme im Spiegel (Spiegelgruft) ---
MON3_BUILD.ilva = (b) => bsSorc3(b, 'ilva', {
  skin: '#d8ecf8', skinTop: '#f4fbff', eye: '#3ad8ff', hair: '#e8f6ff', robe: '#a8d0ec', robeTop: '#e0f4ff', sleeve: '#90c0e0', hem: '#e8f8ff', hemTop: '#ffffff',
  glow: '#bff0ff', trim: '#e8f8ff', gem: '#9fd8f4', gemTop: '#eaf8ff', cape: '#7aaad0', capeEdge: '#f0faff', capeIn: '#a8d0ec', staff: '#8ab0d0', staffTop: '#e8f4ff',
  hood: true, mantle: true, torn: true, wispHem: true, weapon: 'orb', worldH: 5.0
});
BOSS3.ilva = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'eis', emi: [0.05, 0.08, 0.12], base: { aRx: -0.75, aRe: -1.1, aRz: -0.1, aLx: -0.75, aLe: -1.1, aLz: -0.12, lean: 0.05 },
  // Fäden aus Frost: Schneeflocken kreisen, Frostnebel am Saum
  ambient: bsAmb3('ilva', [{ k: 'orbit', n: 5, R: 1.3, tex: 'spark' }, { k: 'ground', n: 3, sp: 0.3, r: 1.0, col: '#e8f6ff', op: 0.25 }, { k: 'pulse', at: 'hand', s: 0.7, op: 0.3 }])
});
MON3_BUILD.aurra = (b) => bsSorc3(b, 'aurra', {
  skin: '#c8d4ec', skinTop: '#eef2fc', eye: '#ff7aff', hair: '#2a3a5a', hairGlow: '#7affc8', robe: '#3a3a7a', robeTop: '#6a6ab8', sleeve: '#2e2e6a', hem: '#7affc8', hemTop: '#c8a8ff',
  glow: '#9fffe8', trim: '#c8b8ff', gem: '#b48cff', gemTop: '#e8dcff', cape: '#1e2a4a', capeEdge: '#7affc8', capeIn: '#3a2a6a', staff: '#3a3a6a', staffTop: '#c8b8ff',
  aurora: ['#5affc8', '#b48cff', '#7ad8ff'], crown: 'aurora', shoulder: 'shard', mantle: true, weapon: 'scepter', worldH: 5.2
});
BOSS3.aurra = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'nordlicht', emi: [0.04, 0.06, 0.1],
  ambient(h, a, e, t, th) {
    if (!a.bones) return;
    // Nordlicht-Schleier über ihr, Funken springen zum Zepter
    bsPtA3(a, BOSS3.aurra, 'crown', _b3P);
    for (let i = 0; i < 4; i++) bsSprite3(h, _b3P.x + (i - 1.5) * 0.5, _b3P.y + 1.0 + Math.sin(t * 0.9 + i) * 0.2, _b3P.z - 0.3, 1.1, 'disc', ['#5affc8', '#b48cff', '#7ad8ff'][i % 3], 0.16 + 0.07 * Math.sin(t * 1.7 + i));
    bsAmbPart3(h, a, BOSS3.aurra, e, t, th, { k: 'bolt', at: 'crown', to: 'weapon', sp: 2.2, w: 0.02 });
  }
});
MON3_BUILD.morgrah = (b) => bsSorc3(b, 'morgrah', {
  skin: '#6a8a4a', skinTop: '#8aaa62', eye: '#e8ff4a', hair: '#2a3018', robe: '#1e2a16', robeTop: '#3a4a26', sleeve: '#18220e', hem: '#2a3a1a', hemTop: '#4a5a2a',
  glow: '#a8f04a', trim: '#5a4a2a', gem: '#3a5a1a', gemTop: '#8aaa3a', cape: '#18220e', capeEdge: '#4a5a24', staff: '#3a2e1e', staffTop: '#6a5a3a', claw: '#2a2010',
  hood: true, hag: true, mantle: true, torn: true, weapon: 'crook', worldH: 4.8
});
BOSS3.morgrah = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'gift', emi: [0.04, 0.07, 0.01], base: { aRx: -0.4, aRe: -1.2, aRz: 0.14, aLx: -0.5, aLe: -1.0, aLz: 0.3, lean: 0.25 },
  ambient: bsAmb3('morgrah', [{ k: 'drip', at: 'weapon', n: 3, sp: 0.8, r: 0.06, s: 0.12, col: '#a8f04a' }, { k: 'smoke', at: 'weapon', n: 3, sp: 0.4, r: 0.15, h: 1.2, s: 0.35, col: '#3a5a1e', op: 0.3 }, { k: 'ground', n: 3, sp: 0.2, r: 1.0, col: '#2a3a1a', op: 0.25 }])
});
MON3_BUILD.ysolde = (b) => bsSorc3(b, 'ysolde', {
  skin: '#d8dcf4', skinTop: '#f4f6ff', eye: '#ffffff', hair: '#c8d0f8', robe: '#c8d4f4', robeTop: '#eef2ff', sleeve: '#b0c0e8', hem: '#e8f0ff', hemTop: '#ffffff',
  glow: '#e0f0ff', trim: '#9fb0e8', gem: '#a8c0ff', gemTop: '#f0f6ff', mirror: '#e8f0ff', cape: '#8a9ad8', capeEdge: '#eef4ff', staff: '#6a70b0', staffTop: '#c8d0ff',
  hood: true, mirrorFace: true, shoulder: 'plate', mantle: true, wispHem: true, weapon: 'orb', worldH: 5.0
});
BOSS3.ysolde = Object.assign({}, BS_SORC_BOSS3, {
  fx: 'spiegel', emi: [0.06, 0.07, 0.12], base: { aRx: -0.75, aRe: -1.1, aRz: -0.1, aLx: -0.75, aLe: -1.1, aLz: -0.12, lean: 0.05 },
  ambient: bsAmb3('ysolde', [{ k: 'orbit', n: 6, R: 1.4, tex: 'shard' }, { k: 'pulse', at: 'mouth', s: 0.6, op: 0.3 }])
});

// --- Ritter (bsKnight3): Gruftkönig Morvan (Totengruft), Der Ertrunkene Ritter (Moorkrypta), Ritter Morvaine (Thron
// der Leere) ---
MON3_BUILD.gruftkoenig = (b) => bsKnight3(b, 'gruftkoenig', {
  plate: '#4a463c', plateTop: '#7a7464', plateD: '#2e2c26', trim: '#a8884a', glow: '#a774e0', eye: '#c89aff', bone: '#d8d0b8', boneTop: '#f0ead8',
  cape: '#2a1a3a', capeEdge: '#6a4a8a', grip: '#2a2018', blade: '#5a5650', bladeTop: '#9a948a', helm: 'skull', torn: true, worldH: 5.0
});
BOSS3.gruftkoenig = Object.assign({}, BS_KNIGHT_BOSS3, {
  fx: 'tod', emi: [0.05, 0.03, 0.08],
  ambient: bsAmb3('gruftkoenig', [{ k: 'rise', at: 'crown', n: 3, sp: 0.8, r: 0.15, h: 0.7, tex: 'flame', s: 0.3 }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.6, col: '#1a1028', op: 0.35 }])
});
MON3_BUILD.ertrunkener = (b) => bsKnight3(b, 'ertrunkener', {
  plate: '#4a5a54', plateTop: '#7a8a80', plateD: '#2a3430', trim: '#7a6a3a', glow: '#8fe36a', eye: '#8fe36a', cape: '#1a2a24', capeEdge: '#3a5a3a',
  grip: '#2a2018', blade: '#4a524c', bladeTop: '#7a827a', weed: '#2e4a24', weedTop: '#4a6a32', shell: '#c8c0a8', rust: '#6a3a1e',
  helm: 'bucket', drowned: true, blade: 'broken', torn: true, worldH: 5.8
});
BOSS3.ertrunkener = Object.assign({}, BS_KNIGHT_BOSS3, {
  fx: 'wasser', emi: [0.03, 0.07, 0.03],
  // Wasser tropft aus Helm und Rüstung, Nebel steigt aus dem Moor
  ambient: bsAmb3('ertrunkener', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.7, r: 0.15, s: 0.1, h: 2.0, col: '#7ad8a8' }, { k: 'drip', at: 'core', n: 3, sp: 0.6, r: 0.4, s: 0.1, h: 1.8, col: '#6ac898' }, { k: 'ground', n: 3, sp: 0.25, r: 1.2, col: '#1a2a24', op: 0.3 }])
});
MON3_BUILD.morvaine = (b) => bsKnight3(b, 'morvaine', {
  plate: '#1e1830', plateTop: '#4a3e70', plateD: '#120e1e', trim: '#8a6ac8', glow: '#c8a8ff', eye: '#e8d8ff', cape: '#1a0a3a', capeEdge: '#5a2a9a',
  grip: '#100a18', blade: '#241a3a', bladeTop: '#7a6ab0', helm: 'horned', weapon: 'glaive', torn: true, worldH: 5.8
});
BOSS3.morvaine = Object.assign({}, BS_KNIGHT_BOSS3, {
  fx: 'leere', melee: ['thrust', 'sweep', 'chop'], emi: [0.06, 0.02, 0.1],
  pts: Object.assign({}, BS_KNIGHT_PTS3, { weapon: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.9]], emit: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.9]], sky: [BB3.haR, [BS_KNIGHT_G3[0], BS_KNIGHT_G3[1], BS_KNIGHT_G3[2] + 1.9]] }),
  ambient: bsAmb3('morvaine', [{ k: 'rise', at: 'weapon', n: 3, sp: 0.9, r: 0.2, h: 0.7, s: 0.15 }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.6, col: '#140a24', op: 0.35 }])
});

// --- Harpyie (bsHarpy3): Blitzharpyie Kyra (Donnerschmiede), Windkreischerin Ssyla (Sturmhorst) ---
const BS_HARPY_BOSS3 = {
  kind: 'biped', wings: true, tail: true, emit: 'weapon', melee: ['claw', 'sweep', 'claw'], float: 0.55, blob: 1.0, dome: 1.35,
  pts: BS_HARPY_PTS3, deathPts: ['core', 'mouth', 'back'], skyAt: 'sky', gait: 0.7,
  base: { aRx: -0.35, aRe: -0.9, aRz: 0.15, aLz: 0.3, aLe: -0.6, wing: 0.85, flapAmp: 0.28, flapHz: 1.1 },
  anim: BOSS3.tempestra.anim
};
MON3_BUILD.kyra = (b) => bsHarpy3(b, 'kyra', {
  skin: '#b8bcd8', skinTop: '#dcdff0', eye: '#9fd0ff', hair: '#1a2a5a', feather: '#3a5ab8', featherTip: '#16224a', featherB: '#2a3a7a', wingBone: '#1e2a5a', wingTop: '#4a6ac8',
  leg: '#5a5a6a', legD: '#3a3a48', claw: '#e8f0ff', silver: '#8a98b8', silverTop: '#d8e0f0', glow: '#9fd0ff', wood: '#2a2e3a', crown: 'mask', weapon: 'claws', wingK: 1.15, worldH: 4.8
});
BOSS3.kyra = Object.assign({}, BS_HARPY_BOSS3, {
  fx: 'sturm', emi: [0.04, 0.07, 0.12], pts: Object.assign({}, BS_HARPY_PTS3, { weapon: [BB3.haR, BS_HARPY_P3[-1].Hd], emit: [BB3.haR, BS_HARPY_P3[-1].Hd] }),
  // Blitze springen zwischen den Krallen, Funken in den Federn
  ambient: bsAmb3('kyra', [{ k: 'bolt', at: 'weapon', to: 'core', sp: 2.6, w: 0.02 }, { k: 'rise', at: 'back', n: 3, sp: 0.6, r: 0.9, h: 1.2, s: 0.14 }])
});
MON3_BUILD.ssyla = (b) => bsHarpy3(b, 'ssyla', {
  skin: '#d8d0c8', skinTop: '#f0e8e0', eye: '#cfe8ff', hair: '#8a96a8', feather: '#e8f0f8', featherTip: '#7a8a9a', featherB: '#b8c4d0', wingBone: '#5a6a7a', wingTop: '#a8b8c8',
  leg: '#c8a860', legD: '#8a7040', claw: '#2a2a32', silver: '#a8b0c0', silverTop: '#e8ecf4', glow: '#e8f4ff', wood: '#4a3a2a', crown: 'crest', weapon: 'fan', wingK: 1.25, worldH: 5.0
});
BOSS3.ssyla = Object.assign({}, BS_HARPY_BOSS3, {
  fx: 'himmel', jawOpen: 0.8, emi: [0.05, 0.06, 0.1], pts: Object.assign({}, BS_HARPY_PTS3, { weapon: [BB3.haR, [BS_HARPY_G3[0], BS_HARPY_G3[1], BS_HARPY_G3[2] + 0.5]], emit: [BB3.jaw, [0, 2.0, 0.18]] }),
  // Federn und Windböen wirbeln um sie
  ambient: bsAmb3('ssyla', [{ k: 'orbit', n: 5, R: 1.5, tex: 'spark' }, { k: 'ground', n: 3, sp: 0.4, r: 1.3, col: '#c8d0dc', op: 0.2 }])
});

// --- Dämon (bsDemon3): Steinwächter Grom (Sturmhorst), Höllenschmied Barak (Aschenzitadelle), Aschewächter Kael
// (Aschenzitadelle), Flammentänzerin Ilyra (Glutkessel) ---
const BS_DEMON_P3 = bsBipJ3(BS_DEMON_J3);
const BS_GARG_BASE3 = { aRx: -0.3, aRe: -0.9, aRz: 0.25, aLz: 0.3, aLe: -0.8, wing: 0.35, lean: 0.25, crouch: 0.15 };
MON3_BUILD.grom = (b) => bsDemon3(b, 'grom', Object.assign({}, BS_AZAROTH3, {
  skin: '#7a7e88', skinTop: '#a8acb6', lava: '#9fd0ff', eye: '#cfe8ff', tooth: '#d8dce4', claw: '#3a3e48', horn: '#5a5e68', hornTip: '#c8ccd4',
  armor: '#5a5e68', armorTop: '#9a9eaa', fur: '#4a4e58', hoof: '#2a2c32', bone: '#c8ccd4', cloth: '#3a4058', grip: '#2a2c32',
  wingBone: '#5a5e68', wingTop: '#8a8e98', mem: '#6a6e78', memB: '#585c66', memEdge: '#8a8e98', vein: '#9fd0ff', gargoyle: true, weapon: 'none', worldH: 5.0
}));
BOSS3.grom = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'sturm', melee: ['claw', 'punch', 'claw'], pts: bsDemonPts3(BS_DEMON_J3), emi: [0.04, 0.06, 0.1], base: BS_GARG_BASE3,
  ambient: bsAmb3('grom', [{ k: 'bolt', at: 'back', to: 'core', sp: 2.0, w: 0.02 }, { k: 'drip', at: 'back', n: 2, sp: 0.35, r: 0.7, h: 2, s: 0.1, col: '#8a8e98' }])
});
MON3_BUILD.barak = (b) => bsDemon3(b, 'barak', Object.assign({}, BS_AZAROTH3, {
  skin: '#34343c', skinTop: '#5a5a64', lava: '#ff6a2a', eye: '#ffb04a', tooth: '#d8c8b0', claw: '#1e1614', horn: '#2a201c', hornTip: '#8a6a50',
  armor: '#2a2220', armorTop: '#5a4a44', fur: '#2a1e1a', hoof: '#120c0a', bone: '#d8ccb0', cloth: '#3a2414', grip: '#2a1a14',
  wingBone: '#26262c', wingTop: '#4a4a54', mem: '#30303a', memB: '#26262e', memEdge: '#8a3a1a', vein: '#ff6a2a', gargoyle: true, weapon: 'hammer', worldH: 5.4
}));
BOSS3.barak = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'feuer', melee: ['chop', 'claw', 'chop'], emit: 'weapon', pts: Object.assign(bsDemonPts3(BS_DEMON_J3), { weapon: [BB3.haR, bsAdd3(bsLerp3(BS_DEMON_P3[-1].W, BS_DEMON_P3[-1].Hd, 0.5), [0, 0, 0.85])] }), emi: [0.1, 0.04, 0.01], base: BS_GARG_BASE3,
  ambient: bsAmb3('barak', [{ k: 'rise', at: 'weapon', n: 4, sp: 1.3, r: 0.3, h: 0.8, s: 0.14, col: '#ffd08a' }, { k: 'smoke', at: 'back', n: 3, sp: 0.35, r: 0.6, col: '#2a2220', op: 0.3 }])
});
MON3_BUILD.kael = (b) => bsDemon3(b, 'kael', Object.assign({}, BS_AZAROTH3, {
  skin: '#5a2a1a', skinTop: '#7e4026', lava: '#ff5a3a', eye: '#ffd27a', armor: '#2a1c1a', armorTop: '#5a3e38', cloth: '#2a1010', grip: '#2a1a14',
  blade: '#3a2e2c', bladeTop: '#8a7068', wingBone: '#2a1010', wingTop: '#4a2018', mem: '#2a1010', memB: '#3a1814', memEdge: '#5a2418', vein: '#ff5a3a',
  helm: 'ash', weapon: 'halberd', worldH: 5.4
}));
BOSS3.kael = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'glut', melee: ['thrust', 'sweep', 'chop'], emit: 'weapon', pts: Object.assign(bsDemonPts3(BS_DEMON_J3), { weapon: [BB3.haR, bsAdd3(bsLerp3(BS_DEMON_P3[-1].W, BS_DEMON_P3[-1].Hd, 0.5), [0, 0, 1.6])], sky: [BB3.haR, bsAdd3(bsLerp3(BS_DEMON_P3[-1].W, BS_DEMON_P3[-1].Hd, 0.5), [0, 0, 1.6])] }), emi: [0.08, 0.03, 0.01],
  base: { aRx: -0.4, aRe: -0.85, aRz: 0.16, aLx: -0.6, aLz: 0.15, aLe: -1.2, wing: 0.25 },
  ambient: bsAmb3('kael', [{ k: 'rise', at: 'mouth', n: 3, sp: 0.8, r: 0.1, h: 0.8, tex: 'flame', s: 0.3 }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.7, col: '#2a2220', op: 0.3 }])
});
MON3_BUILD.ilyra = (b) => bsDemon3(b, 'ilyra', Object.assign({}, BS_SERETH3, {
  skin: '#e07a3a', skinTop: '#ffb070', lava: '#ffd34d', eye: '#fff0a0', hair: '#c8402f', horn: '#3a1a10', hornTip: '#ffb04a', armor: '#5a2a14', armorTop: '#a8582a',
  cloth: '#a8302a', blade: '#5a2a14', bladeTop: '#ffb04a', wingBone: '#8a2a1a', wingTop: '#c8402f', mem: '#c8402f', memB: '#a83022', memEdge: '#ffb04a', vein: '#ffd34d',
  flameHair: true, weapon: 'twin', worldH: 5.0
}));
BOSS3.ilyra = Object.assign({}, BS_DEMON_BOSS3, {
  fx: 'feuer', melee: ['sweep', 'claw', 'sweep'], pts: bsDemonPts3(BS_DEMONF_J3), emi: [0.12, 0.05, 0.01], base: { aRx: -0.5, aRe: -0.6, aRz: 0.5, aLx: -0.5, aLz: 0.5, aLe: -0.6, wing: 0.4 },
  ambient: bsAmb3('ilyra', [{ k: 'orbit', n: 5, R: 1.3, tex: 'flame' }, { k: 'flame', at: 'mouth', n: 3, sp: 1.4, r: 0.2, s: 0.4 }])
});

// --- Drache (bsDrake3): Urdrache Vharak (Drachenhort), Brutmutter Ishra, Rußdrache Vorr (Aschenzitadelle),
// Brakkar Glasschwinge (Spiegelgruft) ---
const BS_DRAKE_G3 = Object.assign({}, BS_DRAKE_BOSS3, { blob: 1.5, dome: 1.5 });
MON3_BUILD.urdrache = (b) => bsDrake3(b, 'urdrache', {
  hide: '#2e1a30', hideTop: '#5a3a5a', scaleD: '#160a18', belly: '#6a3a3a', bellyTop: '#9a5a4a', armor: '#1a0e1c', armorTop: '#4a3050',
  horn: '#e0d4c0', hornTip: '#6a4a3a', claw: '#e0d4c0', tooth: '#f4ecdc', eye: '#ff9a4a', lava: '#ff6a3a', lavaHi: '#ffc06a',
  wingBone: '#2a1424', wingTop: '#5a3048', mem: '#3a1828', memB: '#4e2034', memEdge: '#8a3a2a', vein: '#ff6a3a', horns: 'ram', wingK: 1.05, worldH: 5.6
});
BOSS3.urdrache = Object.assign({}, BS_DRAKE_BOSS3, {
  fx: 'feuer', emi: [0.08, 0.03, 0.02],
  ambient: bsAmb3('urdrache', [{ k: 'drip', at: 'mouth', n: 3, sp: 1.1, r: 0.1, s: 0.22, col: '#ff9a4a' }, { k: 'rise', at: 'back', n: 4, sp: 0.6, r: 0.8, h: 2.0 }])
});
MON3_BUILD.ishra = (b) => bsDrake3(b, 'ishra', {
  hide: '#8a3a1a', hideTop: '#c86a32', scaleD: '#4a1a0a', belly: '#d8a060', bellyTop: '#f0c888', armor: '#5a2410', armorTop: '#a8582a',
  horn: '#3a2014', hornTip: '#c8884a', claw: '#e8d8c0', tooth: '#f4ecdc', eye: '#ffe36a', lava: '#ffb04a', lavaHi: '#ffe08a', egg: '#e8d0a8', eggTop: '#fff0d8',
  wingBone: '#6a2a10', wingTop: '#a8481e', mem: '#8a3a1a', memB: '#a8481e', memEdge: '#ffb04a', horns: 'nubs', eggs: true, spineN: 14, lite: true, wingK: 0.8, worldH: 4.4
});
BOSS3.ishra = Object.assign({}, BS_DRAKE_G3, {
  fx: 'feuer', emi: [0.1, 0.05, 0.01],
  ambient: bsAmb3('ishra', [{ k: 'pulse', at: 'back', s: 1.2, op: 0.25, col: '#ffb04a' }, { k: 'rise', at: 'back', n: 3, sp: 0.5, r: 0.5, h: 1.2, s: 0.15 }])
});
MON3_BUILD.vorr = (b) => bsDrake3(b, 'vorr', {
  hide: '#1e1a18', hideTop: '#3e3632', scaleD: '#0e0c0c', belly: '#4a2a1a', bellyTop: '#7a4428', armor: '#141210', armorTop: '#3a3430',
  horn: '#2a2420', hornTip: '#7a6a5a', claw: '#c8bca8', tooth: '#e0d8c4', eye: '#ff6a3a', lava: '#ff6a3a', lavaHi: '#ffb06a',
  wingBone: '#1a1614', wingTop: '#3a3230', mem: '#1e1a18', memB: '#2a2422', memEdge: '#4a2a1e', horns: 'ram', spineN: 14, lite: true, torn: true, wingK: 0.95, worldH: 4.8
});
BOSS3.vorr = Object.assign({}, BS_DRAKE_G3, {
  fx: 'glut', emi: [0.06, 0.03, 0.02],
  // schwarzer Rauch quillt aus Maul und Rücken
  ambient: bsAmb3('vorr', [{ k: 'smoke', at: 'mouth', n: 3, sp: 0.5, r: 0.1, h: 1.2, s: 0.4, col: '#1a1614', op: 0.45 }, { k: 'smoke', at: 'back', n: 4, sp: 0.3, r: 0.8, col: '#1e1a18', op: 0.4 }])
});
MON3_BUILD.brakkar = (b) => bsDrake3(b, 'brakkar', {
  hide: '#8a9ae8', hideTop: '#c8d4ff', scaleD: '#5a6ab8', belly: '#e8eeff', bellyTop: '#ffffff', armor: '#a8c0ff', armorTop: '#f0f6ff',
  horn: '#b8ccff', hornTip: '#ffffff', claw: '#e8f0ff', tooth: '#ffffff', eye: '#e8f6ff', lava: '#e0f0ff', lavaHi: '#ffffff',
  wingBone: '#7a8ad8', wingTop: '#c8d4ff', mem: '#a8b8f0', memB: '#90a0e0', memEdge: '#e8f0ff', horns: 'crystal', spines: 'crystal', tailEnd: 'crystal', spineN: 14, lite: true, wingK: 1.0, worldH: 4.6
});
BOSS3.brakkar = Object.assign({}, BS_DRAKE_G3, {
  fx: 'kristall', emi: [0.06, 0.07, 0.12],
  ambient: bsAmb3('brakkar', [{ k: 'orbit', n: 4, R: 1.8, tex: 'shard' }, { k: 'rise', at: 'tail', n: 2, sp: 0.6, r: 0.3, h: 1.0, s: 0.14 }])
});

// --- Naga (bsNaga3): Naga-Königin Sseth (Schlangentempel): Fächer aus goldenen Schuppenblättern, Dreizack, Rundschild ---
MON3_BUILD.nagakoenigin = (b) => bsNaga3(b, 'nagakoenigin', Object.assign({}, BS_VRITRA3, {
  skin: '#4a7a9a', skinTop: '#6aa0c0', scale: '#2a4a6a', scaleTop: '#3e6a8e', scaleD: '#14243a', mark: '#c8962a', crest: '#1a2e44', hood: '#2e5a7a', hoodEdge: '#7ad8c8',
  hair: '#0e1420', gold: '#d8a83a', goldD: '#a8782a', gem2: '#7ad8c8', glow: '#9fe8ff', eye: '#ffe36a', headdress: true, trident: true, worldH: 5.2
}));
BOSS3.nagakoenigin = Object.assign({}, BS_NAGA_BOSS3, {
  fx: 'gift', melee: ['strike', 'slash', 'whip'], emi: [0.03, 0.07, 0.08],
  pts: Object.assign({}, BS_NAGA_PTS3, { weapon: [BN3.haR, bsAdd3(bsLerp3(BS_NAGA_R3.P[-1].W, BS_NAGA_R3.P[-1].Hd, 0.55), [0, 0, 1.4])] }),
  ambient: bsAmb3('nagakoenigin', [{ k: 'rise', at: 'weapon', n: 3, sp: 0.8, r: 0.15, h: 0.7, s: 0.14 }, { k: 'ground', n: 3, sp: 0.25, r: 1.3, col: '#1a4a3a', op: 0.25 }])
});

// --- Ork (bsOrc3): Kriegsherr Gor'thak (Orkfestung): Irokesenkamm, Kieferplatte, Doppelaxt, Rundschild am Rücken ---
MON3_BUILD.kriegsherr = (b) => bsOrc3(b, 'kriegsherr', Object.assign({}, BS_GORBAG3, {
  skin: '#4a5a32', skinTop: '#6a7a46', scar: '#2a3420', eye: '#ff6a3a', paint: '#c8302a', hair: '#1a1410', iron: '#4a4a52', ironD: '#2a2a30', ironTop: '#8a8a96',
  gold: '#a8782a', fur: '#3a2e24', furTop: '#6a5a48', leather: '#3a2418', cloth: '#5a1a12', banner: '#8a2a14', blade: '#5a5a62', bladeTop: '#a8a8b4', glow: '#ff6a3a',
  mohawk: true, axe2: true, shield: true, worldH: 5.0
}));
BOSS3.kriegsherr = Object.assign({}, BS_ORC_DEF3, {
  fx: 'erde', emi: [0.08, 0.03, 0.01],
  pts: Object.assign({}, BS_ORC_PTS3, { weapon: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1], BS_ORC_G3[2] + 0.9]], emit: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1], BS_ORC_G3[2] + 0.9]], sky: [BB3.haR, [BS_ORC_G3[0], BS_ORC_G3[1], BS_ORC_G3[2] + 0.9]] }),
  ambient: bsAmb3('kriegsherr', [{ k: 'rise', at: 'weapon', n: 3, sp: 1.0, r: 0.4, h: 0.6, s: 0.14 }, { k: 'ground', n: 3, sp: 0.25, r: 1.1, col: '#5a4a3a', op: 0.2 }])
});
