// Symbole der neuen Magier-Zauber (seit 11.5): Drachenodem, Brand, Phönixflamme, Blitzspeer, Gewitterwolke,
// Steinschlag, Erdspitzen, Bergsturz und die Schwerkraft ohne Bodensiegel. Stil und Hilfen in symbol-kunst.js
// (IK, Bereich −24…24); keine Dreiecke und Kreise am Boden mehr, die Motive stehen frei im Raum.

const IKN = {
  fire: ['#a0102e', '#e8362a', '#fff1c8'],
  hot: ['#e8362a', '#ff8a4a', '#fff6d8'],
  basalt: ['#6a5a50', '#3e3532', '#1e1816'],
  amber: '#f0a830',
  bolt: '#fff7b0',
  boltGlow: '#9a7aff'
};
// glühende Bernsteinader auf einem Felsen
function ikVein(ctx, IK, pts, w = 1) {
  IK.glow(ctx, IKN.amber, 4, () => {
    ctx.save();
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  });
}
// großer Basaltfelsen mit Adern
function ikBoulder(ctx, IK, x, y, r, seed) {
  IK.rock(ctx, x, y, r, seed, IKN.basalt);
  ikVein(ctx, IK, [[x - r * 0.5, y - r * 0.1], [x - r * 0.1, y + r * 0.15], [x + r * 0.2, y - r * 0.2], [x + r * 0.55, y + r * 0.05]], Math.max(0.8, r * 0.09));
}

Object.assign(SKILL_ART, {
  // Drachenodem: Flammenkegel aus der Hand nach rechts oben, glühender Kern am Ursprung
  drachenodem(ctx, IK) {
    IK.light(ctx, 2, -2, 22, '#ff6a1a', 0.55);
    const ox = -14;
    const oy = 12;
    for (const [da, h, pal] of [[-0.42, 30, IKN.fire], [0.42, 30, IKN.fire], [-0.2, 36, IKN.hot], [0.2, 36, IKN.hot], [0, 40, IKN.hot]]) {
      IK.flame(ctx, ox, oy, h, Math.PI * 0.25 + da, pal, da * 3);
    }
    IK.glow(ctx, '#ffd36a', 10, () => IK.fill(ctx, (c) => c.arc(ox, oy, 5.5, 0, Math.PI * 2), IK.rad(ctx, ox, oy, 0.5, 6, [[0, '#ffffff'], [0.5, '#fff1c8'], [1, '#ff8a4a']]), 0.8));
    IK.sparkles(ctx, 8, '#ffd8a0', 21, 16, 6, -6, 1.2);
  },

  // Brand: ein Gegner-Umriss in Flammen, Funken steigen auf, glühender Funke darüber
  brand(ctx, IK) {
    IK.light(ctx, 0, 2, 20, '#e8362a', 0.5);
    IK.figure(ctx, 0, 16, 26, '#2a0e08', 0);
    for (const [x, y, h, a] of [[-7, 14, 18, -0.2], [7, 14, 18, 0.2], [-4, 4, 20, -0.1], [4, 2, 20, 0.12], [0, -6, 16, 0], [-8, -2, 13, -0.35], [8, -3, 13, 0.35]]) {
      IK.flame(ctx, x, y, h, a, IKN.fire, a * 5);
    }
    IK.flame(ctx, 0, 10, 26, 0, IKN.hot);
    IK.sparkles(ctx, 9, '#ffc070', 31, 20, 0, -8, 1.3);
  },

  // Phönixflamme: Feuervogel mit weit ausgebreiteten Flammenflügeln und langem Schweif
  phoenix(ctx, IK) {
    IK.light(ctx, 0, -2, 24, '#ff6a1a', 0.6);
    // Schweif nach unten
    for (const [x, h, a] of [[-3, 18, Math.PI - 0.35], [3, 18, Math.PI + 0.35], [0, 22, Math.PI]]) IK.flame(ctx, x, 2, h, a, IKN.fire, a);
    // Flügel: je Seite eine Reihe Flammen nach außen und oben
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = s * (5 + i * 4.2);
        const y = -2 - i * 2.2;
        IK.flame(ctx, x, y, 14 - i * 1.5, s * (0.9 + i * 0.22), i % 2 ? IKN.fire : IKN.hot, s * 2);
      }
    }
    // Körper und Kopf
    IK.glow(ctx, '#ffd36a', 9, () => IK.fill(ctx, (c) => { c.ellipse(0, -3, 4.2, 7, 0, 0, Math.PI * 2); }, IK.rad(ctx, 0, -5, 0.5, 8, [[0, '#ffffff'], [0.4, '#fff1c8'], [0.8, '#ff8a4a'], [1, '#e8362a']]), 0.8));
    IK.flame(ctx, 0, -9, 10, 0, IKN.hot);
    IK.fill(ctx, (c) => { c.moveTo(-1.6, -13); c.lineTo(0, -16.5); c.lineTo(1.6, -13); c.closePath(); }, '#fff6d8', 0.6);
    IK.sparkles(ctx, 7, '#ffe0b0', 41, 20, 0, 0, 1.2);
  },

  // Blitzspeer: gleißender Speer schräg durchs Bild, Zickzack-Kern, kleine Seitenblitze, Spitze oben rechts
  blitzspeer(ctx, IK) {
    IK.light(ctx, 6, -6, 18, '#ffe94a', 0.5);
    IK.bolt(ctx, IK.zigzag(-18, 18, 15, -15, 7, 3, 3), IKN.bolt, 2.6, IKN.boltGlow);
    // Speerspitze
    IK.glow(ctx, '#fff7b0', 8, () => IK.fill(ctx, (c) => { c.moveTo(20, -20); c.lineTo(9.5, -13.5); c.lineTo(13.5, -9.5); c.closePath(); }, IK.lin(ctx, 10, -10, 20, -20, [[0, '#fff1a0'], [1, '#ffffff']]), 0.7));
    for (const [x, y, a] of [[-6, 6, 1], [2, -2, -1], [-12, 12, -1]]) {
      IK.bolt(ctx, IK.zigzag(x, y, x + a * 8, y + 8, 3, 1.6, x + 9), '#e8d0ff', 1, IKN.boltGlow);
    }
    IK.sparkles(ctx, 6, '#fff7b0', 51, 18, 0, 0, 1.1);
  },

  // Gewitterwolke: schwere dunkle Wolke oben, drei Blitze schlagen nach unten
  gewitter(ctx, IK) {
    IK.light(ctx, 0, 6, 18, '#ffe94a', 0.35);
    for (const [x, len, seed] of [[-10, 26, 1], [2, 32, 2], [12, 24, 3]]) {
      IK.bolt(ctx, IK.zigzag(x, -6, x + (seed - 2) * 3, -6 + len, 5, 2.6, seed * 7), IKN.bolt, seed === 2 ? 2.4 : 1.6, IKN.boltGlow);
    }
    // Wolke aus mehreren Ballen
    for (const [x, y, r, c] of [[-12, -10, 8, '#3a3650'], [12, -10, 8, '#3a3650'], [-4, -14, 10, '#4a4664'], [6, -15, 9, '#4a4664'], [0, -8, 11, '#2a2638']]) {
      IK.fill(ctx, (cx) => cx.arc(x, y, r, 0, Math.PI * 2), IK.rad(ctx, x - r * 0.3, y - r * 0.4, 1, r, [[0, '#7a76a0'], [0.5, c], [1, '#14121c']]), 0.6);
    }
    IK.light(ctx, 2, -10, 8, '#c8b0ff', 0.6);
  },

  // Steinschlag: zwei Felsen fliegen von links und rechts aufeinander zu, in der Mitte zerbersten Splitter
  steinschlag(ctx, IK) {
    IK.light(ctx, 0, 2, 14, IKN.amber, 0.7);
    IK.shock(ctx, 0, 4, 9, 9, '#ffd98a', 1.4);
    for (const s of [-1, 1]) {
      IK.line(ctx, [[s * 22, 6], [s * 12, 3]], 'rgba(200,170,130,0.5)', 2.2, null);
      ikBoulder(ctx, IK, s * 10, 2, 8.5, s > 0 ? 3 : 7);
    }
    for (const [x, y, r] of [[-2, -10, 2.2], [3, -12, 1.8], [0, 14, 2], [-4, 15, 1.6], [5, 13, 1.6]]) IK.rock(ctx, x, y, r, x + 9, IKN.basalt);
    IK.sparkles(ctx, 7, '#ffd98a', 61, 10, 0, 2, 1.3);
  },

  // Felsgeschoss: riesiger Felsen mit Staubschweif, Bernsteinkern leuchtet durch Risse
  steingeschoss(ctx, IK) {
    IK.light(ctx, 4, -4, 18, IKN.amber, 0.45);
    for (let i = 0; i < 4; i++) IK.fill(ctx, (c) => c.arc(-10 - i * 4, 10 + i * 4, 4 + i * 1.5, 0, Math.PI * 2), `rgba(140,120,100,${0.5 - i * 0.1})`, 0);
    ikBoulder(ctx, IK, 4, -4, 14, 11);
    ikVein(ctx, IK, [[-2, -12], [3, -6], [0, 0], [6, 4]], 1.4);
    IK.light(ctx, 3, -5, 6, '#ffd98a', 0.8);
  },

  // Erdspitzen: Basaltdornen brechen schräg aus einem Riss, Staub und Splitter fliegen
  erdspitzen(ctx, IK) {
    IK.light(ctx, 0, 10, 18, IKN.amber, 0.45);
    ikVein(ctx, IK, [[-18, 17], [-6, 15], [4, 18], [18, 15]], 1.4);
    for (const [x, h, a, w] of [[-13, 18, -0.25, 6], [-4, 28, -0.08, 8], [6, 24, 0.12, 7], [14, 16, 0.3, 5.5]]) {
      ctx.save();
      ctx.translate(x, 17);
      ctx.rotate(a);
      IK.fill(ctx, (c) => { c.moveTo(-w / 2, 0); c.lineTo(0, -h); c.lineTo(w / 2, 0); c.closePath(); }, IK.lin(ctx, -w / 2, 0, w / 2, 0, [[0, '#7a6a5e'], [0.45, '#4a3e3a'], [1, '#1e1816']]), 0.9);
      IK.line(ctx, [[-0.5, -2], [0, -h * 0.75]], 'rgba(255,217,138,0.75)', 0.7, null);
      ctx.restore();
    }
    IK.sparkles(ctx, 7, '#ffd98a', 71, 18, 0, -4, 1.1);
  },

  // Bergsturz: riesiger Felsen stürzt schräg vom Himmel, Staubfahne nach oben rechts, Aufschlag unten
  bergsturz(ctx, IK) {
    IK.shock(ctx, -4, 18, 16, 4, '#ffd98a', 1.4);
    IK.light(ctx, -4, 14, 14, IKN.amber, 0.6);
    for (let i = 0; i < 5; i++) IK.fill(ctx, (c) => c.arc(8 + i * 3.5, -10 - i * 3.5, 5 + i * 1.3, 0, Math.PI * 2), `rgba(120,100,84,${0.55 - i * 0.09})`, 0);
    ikBoulder(ctx, IK, -2, 0, 15, 17);
    ikVein(ctx, IK, [[-12, 4], [-4, -2], [2, 6], [10, 0]], 1.6);
    for (const [x, y] of [[-16, 16], [8, 17], [-10, 19]]) IK.rock(ctx, x, y, 2.2, x + 3, IKN.basalt);
  },

  // Schwerkraft: Felsen kreisen in einer Spirale um einen dunklen Kern (kein Siegel am Boden)
  schwerkraft(ctx, IK) {
    IK.light(ctx, 0, 0, 16, IKN.amber, 0.5);
    IK.swirl(ctx, 0, 0, 3, 19, 1.4, 'rgba(240,168,48,0.55)', 1.4, 0);
    IK.glow(ctx, IKN.amber, 8, () => IK.fill(ctx, (c) => c.arc(0, 0, 4.5, 0, Math.PI * 2), IK.rad(ctx, 0, 0, 0.5, 5, [[0, '#fff1c8'], [0.6, '#f0a830'], [1, '#6a3a10']]), 0.8));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const r = 9 + (i % 3) * 3.5;
      ikBoulder(ctx, IK, Math.cos(a) * r, Math.sin(a) * r * 0.8, 3.2 + (i % 2), i + 21);
    }
  }
});
