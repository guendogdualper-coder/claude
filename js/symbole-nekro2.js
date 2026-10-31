// Symbole des neuen Nekromanten (seit 11.7): Blutsauger, Geisterflut, Lebensentzug, Knochenwurf, Blutlarve,
// Totenhand, Blutlanzen und Sensenmann. Stil und Hilfen in symbol-kunst.js (IK, Bereich −24…24), eigene
// Knochen-Hilfen in symbole-nekromant.js (ikNekro…). Keine Zeichen am Boden – die Motive stehen frei im Raum.

const IKB = {
  blood: ['#ff8a9a', '#c8102a', '#4a0410'],
  dark: ['#d0303e', '#7a0614', '#2a0206'],
  reap: '#c8b8ff'
};
// gewundener Blutfaden zwischen zwei Punkten (zwei Stränge)
function ikBloodStrand(ctx, IK, x0, y0, x1, y1, amp, turns, w) {
  for (const [ph, col] of [[0, '#7a0614'], [Math.PI, '#e0203a']]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const nx = -(y1 - y0);
      const ny = x1 - x0;
      const L = Math.hypot(nx, ny) || 1;
      const off = Math.sin(u * Math.PI * 2 * turns + ph) * amp * Math.sin(Math.PI * u);
      pts.push([x0 + (x1 - x0) * u + (nx / L) * off, y0 + (y1 - y0) * u + (ny / L) * off]);
    }
    IK.glow(ctx, '#ff4a5a', 3, () => IK.line(ctx, pts, col, w, 'rgba(20,2,4,0.85)'));
  }
}

Object.assign(SKILL_ART, {
  // Blutsauger: Knochenhand unten links, ein gewundener Blutfaden zum pochenden Herz oben rechts, Tropfen fließen zur Hand
  blutsauger(ctx, IK) {
    IK.light(ctx, 8, -8, 18, '#ff3a4a', 0.6);
    ikBloodStrand(ctx, IK, -9, 9, 10, -10, 3.2, 2.5, 1.6);
    ikNekroHeart(ctx, 11, -11, 0.85);
    for (const [u, r] of [[0.25, 1.6], [0.5, 1.9], [0.75, 1.5]]) IK.drop(ctx, -9 + 19 * u, 9 - 19 * u + 1, r, IKB.blood);
    ikNekroHand(ctx, -11, 11, 0.95, -0.7);
    IK.sparkles(ctx, 5, '#ffc0c8', 81, 18, 2, -2, 1.1);
  },

  // Geisterflut: fünf schreiende Geister stürzen von oben herab, unten platzt grünes Seelenfeuer
  geisterflut(ctx, IK) {
    IK.light(ctx, 0, 10, 18, '#7fe3a0', 0.75);
    IK.flame(ctx, 0, 18, 14, 0, ['#1f6a48', '#7fe3a0', '#e6fff6']);
    IK.flame(ctx, -7, 18, 9, -0.4, ['#1f6a48', '#7fe3a0', '#e6fff6']);
    IK.flame(ctx, 7, 18, 9, 0.4, ['#1f6a48', '#7fe3a0', '#e6fff6']);
    for (const [x, y, s, a] of [[-13, -12, 7, -2.4], [12, -13, 7, -0.8], [-5, -6, 8.5, -1.9], [6, -3, 8, -1.2], [0, -16, 6, -1.6]]) {
      ikNekroWisp(ctx, x, y, s, a);
    }
    IK.sparkles(ctx, 7, '#e0fff0', 83, 18, 0, 0, 1.1);
  },

  // Lebensentzug: Blutband reißt eine leuchtende Blutkugel aus einem Schädel, sie fliegt im Bogen zurück
  lebensentzug(ctx, IK) {
    IK.light(ctx, -6, 4, 16, '#ff3a4a', 0.55);
    IK.skull(ctx, 12, 10, 9, undefined, '#ff6a7a');
    IK.trail(ctx, 0, 14, 16, -Math.PI * 0.95, -Math.PI * 0.15, 3.2, '#c8102a');
    IK.glow(ctx, '#ff4a5a', 8, () => IK.fill(ctx, (c) => c.arc(-10, -6, 6, 0, Math.PI * 2), IK.rad(ctx, -12, -8, 0, 7, [[0, '#ffe0e4'], [0.4, '#ff4a5a'], [1, '#6a0612']]), 1));
    for (const [x, y, r] of [[-3, -12, 1.4], [3, -11, 1.2], [8, -7, 1]]) IK.drop(ctx, x, y, r, IKB.blood);
    IK.sparkles(ctx, 5, '#ffd0d4', 85, 18, -6, -4, 1.1);
  },

  // Knochenwurf: großer Oberschenkelknochen schräg im Flug, Wirbelspuren dahinter
  knochenwurf(ctx, IK) {
    IK.light(ctx, 4, -4, 18, '#fff0d0', 0.5);
    IK.trail(ctx, 0, 0, 15, Math.PI * 0.6, Math.PI * 1.25, 2.6, 'rgba(255,244,220,0.8)');
    IK.trail(ctx, 0, 0, 10, Math.PI * 0.7, Math.PI * 1.35, 1.8, 'rgba(255,244,220,0.55)');
    IK.glow(ctx, '#fff4dc', 5, () => IK.bone(ctx, -12, 12, 13, -13, 5.2, ['#fffaf0', '#c8b898']));
    for (const [x, y] of [[-15, -2], [-17, 6], [-9, -10]]) IK.fill(ctx, (c) => c.rect(x, y, 2.4, 1.4), '#e4d8bc', 0.6);
    IK.sparkles(ctx, 4, '#fff4dc', 87, 16, 6, -6, 1.1);
  },

  // Blutlarve: dicke rote Gliederlarve mit Kiefern, rundherum Blutspritzer
  blutlarve(ctx, IK) {
    IK.light(ctx, 0, 4, 18, '#ff3a4a', 0.6);
    for (const [x, y, r] of [[-16, 12, 1.6], [16, 10, 1.8], [-12, -12, 1.3], [14, -12, 1.5], [0, -17, 1.2]]) IK.drop(ctx, x, y, r, IKB.blood);
    const segs = [[-11, 8, 4.2], [-6, 6, 5.2], [0, 4, 6], [6, 1, 6.2], [11, -3, 5.6]];
    for (const [x, y, r] of segs) {
      IK.fill(ctx, (c) => c.ellipse(x, y, r, r * 0.86, -0.4, 0, Math.PI * 2), IK.rad(ctx, x - r * 0.4, y - r * 0.4, 0, r * 1.2, [[0, '#ff8a9a'], [0.5, '#b01828'], [1, '#4a0410']]), 1);
      IK.fill(ctx, (c) => c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.18, -0.6, 0, Math.PI * 2), 'rgba(255,230,232,0.7)', 0);
    }
    // Kiefer am Kopf (rechts oben)
    for (const s of [-1, 1]) IK.line(ctx, [[14, -6 + s * 2], [18, -9 + s * 3], [17, -12 + s * 4]], '#2a0206', 1.4, 'rgba(0,0,0,0.6)');
    IK.fill(ctx, (c) => c.arc(13, -5, 1, 0, Math.PI * 2), '#ffe0a0', 0);
  },

  // Totenhand: riesige Knochenhand bricht aus Rissen und umklammert eine kleine Gestalt
  totenhand(ctx, IK) {
    IK.light(ctx, 0, 0, 18, '#ff4a6a', 0.45);
    IK.fill(ctx, (c) => c.ellipse(0, 16, 17, 5, 0, 0, Math.PI * 2), 'rgba(30,18,10,0.9)', 0);
    for (const [x0, x1] of [[-14, -7], [6, 15], [-4, 3]]) IK.line(ctx, [[x0, 16], [(x0 + x1) / 2, 14 + (x0 % 3)], [x1, 17]], '#3a2a1c', 1, 'rgba(0,0,0,0)');
    IK.glow(ctx, '#ff4a6a', 5, () => IK.figure(ctx, 0, 4, 15, IK.lin(ctx, 0, -12, 0, 4, [[0, '#4a1a2a'], [1, '#0a0206']])));
    ikNekroHand(ctx, 0, 7, 1.55, 0);
    for (const [x, y] of [[-15, 10], [14, 9], [-10, 14]]) IK.rock(ctx, x, y, 2.4, x, ['#8a7a62', '#5a4a36', '#2a2014']);
  },

  // Blutlanzen: sechs Blutspitzen fächern wie Flügel aus einer dunklen Gestalt
  blutlanzen(ctx, IK) {
    IK.light(ctx, 0, -2, 20, '#ff3a4a', 0.6);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.42;
      const x = Math.cos(a) * 21;
      const y = Math.sin(a) * 19 + 6;
      IK.glow(ctx, '#ff4a5a', 4, () => IK.fill(ctx, (c) => {
        const nx = -Math.sin(a) * 1.9;
        const ny = Math.cos(a) * 1.9;
        c.moveTo(nx, 4 + ny);
        c.lineTo(x, y);
        c.lineTo(-nx, 4 - ny);
        c.closePath();
      }, IK.lin(ctx, 0, 4, x, y, [[0, '#4a0410'], [0.5, '#c8102a'], [1, '#ffb0b8']]), 0.8));
    }
    IK.figure(ctx, 0, 18, 20, IK.lin(ctx, 0, -2, 0, 18, [[0, '#3a0a14'], [1, '#0a0206']]));
    IK.sparkles(ctx, 5, '#ffc0c8', 89, 18, 0, -6, 1.1);
  },

  // Sensenmann (Ultimative Attacke): Kapuze mit Totenschädel und glühenden Augen, gewaltige Sensenklinge davor
  sensenmann(ctx, IK) {
    IK.light(ctx, 0, -2, 22, '#8a6aff', 0.55);
    // Kutte
    IK.fill(ctx, (c) => { c.moveTo(0, -20); c.quadraticCurveTo(15, -14, 13, 20); c.lineTo(-13, 20); c.quadraticCurveTo(-15, -14, 0, -20); c.closePath(); },
      IK.lin(ctx, 0, -20, 0, 20, [[0, '#2a2038'], [1, '#08060c']]), 1);
    IK.fill(ctx, (c) => c.ellipse(0, -7, 7.5, 8.5, 0, 0, Math.PI * 2), '#05030a', 0);
    IK.skull(ctx, 0, -6, 7.2, ['#fff6e0', '#c8b898', '#4a3a2a'], IKB.reap);
    // Sense: Stiel diagonal, Klinge oben als große Sichel
    IK.line(ctx, [[-15, 22], [14, -14]], '#3a2c44', 2.6, 'rgba(10,6,14,0.9)');
    IK.glow(ctx, '#c8b8ff', 6, () => IK.fill(ctx, (c) => {
      c.moveTo(14, -14);
      c.quadraticCurveTo(2, -22, -20, -16);
      c.quadraticCurveTo(-4, -14, 11, -8);
      c.closePath();
    }, IK.lin(ctx, -20, -20, 14, -10, [[0, '#ffffff'], [0.4, '#d8d0f0'], [1, '#6a6280']]), 1));
    IK.sparkles(ctx, 6, '#e8e0ff', 91, 20, 0, 0, 1.2);
  }
});

Object.assign(SKILL_ART_THEME, {
  blutsauger: 'blut',
  geisterflut: 'seele',
  lebensentzug: 'blut',
  knochenwurf: 'licht',
  blutlarve: 'blut',
  totenhand: 'schatten',
  blutlanzen: 'blut',
  sensenmann: 'schatten'
});
