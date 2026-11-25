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
  // Gewitterwolke (seit 12.0): Sturmwolke oben, drei Blitze schlagen herab, unten zwei gelähmte Gestalten im Blitznetz
  gewitter(ctx, IK) {
    IK.light(ctx, 0, 6, 20, '#9a8aff', 0.55);
    // Wolke: flache Ballen, oben angeleuchtet
    for (const [x, y, rx, ry] of [[-11, -12, 9, 6], [10, -12, 9, 6], [-2, -15, 11, 7], [3, -10, 13, 6]]) {
      IK.fill(ctx, (cx) => cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2), IK.lin(ctx, x, y - ry, x, y + ry, [[0, '#a8a0d8'], [0.45, '#5a5480'], [1, '#1e1a2c']]), 0.7);
    }
    IK.light(ctx, -4, -11, 6, '#fff7b0', 0.8);
    // gelähmte Gestalten mit Blitznetz
    // Blitze aus der Wolke treffen die Gestalten
    for (const [x0, x1, y1, w, seed] of [[-9, -11, 4, 1.4, 1], [1, 0, 12, 2.2, 2], [10, 11, 4, 1.4, 3]]) {
      IK.bolt(ctx, IK.zigzag(x0, -7, x1, y1, 5, 2.2, seed * 7), IKN.bolt, w, IKN.boltGlow);
    }
    for (const x of [-11, 11]) IK.glow(ctx, '#fff7b0', 5, () => IK.figure(ctx, x, 19, 15, IK.lin(ctx, 0, -14, 0, 0, [[0, '#fffbe8'], [1, '#b8a8ff']])));
    IK.bolt(ctx, IK.zigzag(-11, 11, 11, 11, 6, 2, 5), '#fffbe8', 0.9, '#9a7aff');
    IK.sparkles(ctx, 6, '#fff7b0', 41, 18, 0, 6, 1.1);
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

// --- Rang-Ebenen der Symbole (Rang-Boni, docs/rang-boni.md) ----------------------------------------------------------
// Je Rang kommt ein Bildelement dazu, das die neue Mechanik zeigt (r 0 = E, 1 = H, 2 = L, 3 = V); Vollendet hat eine
// eigene Signatur in Rot-Gold-Violett und den Glutkern-Hintergrund (drawSkillIcon). Gezeichnet über dem Motiv, nur
// einmal je Rang (skillIconCache) – kostet im Spiel nichts.
const RK_GOLD = ['#fff6c8', '#ffd34d', '#b8860b'];
const RK_V = ['#ffe0a0', '#ff6a4a', '#c84aff'];
// leuchtender Knoten (Blitzziel)
function rkNode(ctx, IK, x, y, r, pal) {
  IK.light(ctx, x, y, r * 2.6, pal[1], 0.8);
  IK.fill(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), IK.rad(ctx, x - r * 0.3, y - r * 0.3, 0, r * 1.1, [[0, '#ffffff'], [0.5, pal[0]], [1, pal[1]]]), 0.8, 'rgba(40,20,90,0.9)');
}
// kleiner Blitz von a nach b
function rkBolt(ctx, IK, x0, y0, x1, y1, col, w, glow, seed, n = 4, amp = 2.2) {
  IK.bolt(ctx, IK.zigzag(x0, y0, x1, y1, n, amp, seed), col, w, glow);
}
// Krone aus drei Blitzzacken über (x, y)
function rkCrown(ctx, IK, x, y, s = 1) {
  for (const [dx, h] of [[-4, 5], [0, 7], [4, 5]]) rkBolt(ctx, IK, x + dx * s, y, x + dx * 0.8 * s, y - h * s, '#ffd34d', 1.1, '#ff6a4a', 9 + dx, 2, 0.8);
  IK.line(ctx, [[x - 5 * s, y], [x + 5 * s, y]], '#ffd34d', 1.4, 'rgba(60,10,10,0.9)');
}
Object.assign(SKILL_ART_RANK, {
  // Kettenblitz: je Rang ein Kettenknoten mehr (4, 5, 6 Ziele), L goldene Knoten, V Rücksprung als Schleife mit Krone
  kettenblitz(ctx, IK, sk, r) {
    const pal = r >= 2 ? RK_GOLD : ['#ffffff', '#9fd0ff', '#3a6ac8'];
    if (r >= 0) { rkBolt(ctx, IK, 6, 5, 11, 15, '#ffffff', 2.4, '#9fd0ff', 3); rkNode(ctx, IK, 11, 15, 3.4, pal); }
    if (r >= 1) { rkBolt(ctx, IK, 11, 15, 0, 16, '#ffffff', 2.2, '#c58cff', 5); rkNode(ctx, IK, 0, 16, 3.2, r >= 2 ? RK_GOLD : ['#ffffff', '#d8b0ff', '#7a3ac0']); }
    if (r >= 2) {
      rkBolt(ctx, IK, 0, 16, -11, 12, '#fff6c8', 2.2, '#ffd34d', 7);
      rkNode(ctx, IK, -11, 12, 3, RK_GOLD);
      for (const [x, y] of [[-4, -10], [6, 5], [15, -9]]) rkNode(ctx, IK, x, y, 3, RK_GOLD);
    }
    if (r >= 3) {
      // Rücksprung: roter Bogen vom letzten Ziel zurück zum ersten, Blitzkrone über dem letzten Ziel
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [w, c, a] of [[6, '#ff4a2a', 0.5], [3, '#ff8a4a', 1], [1.2, '#fff1c8', 1]]) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(-11, 12);
        ctx.bezierCurveTo(-23, -2, -15, -19, -4, -10);
        ctx.stroke();
      }
      ctx.restore();
      rkCrown(ctx, IK, -11, 7, 1.4);
    }
  },
  // Blitzspeer: E breiterer Schein, H Ladung (violette Kugel), L goldene Spitze, V Himmelsblitz am Ende der Bahn
  blitzspeer(ctx, IK, sk, r) {
    if (r >= 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [w, a] of [[10, 0.25], [5, 0.45]]) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#9fd0ff';
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(-15, 15);
        ctx.lineTo(13, -13);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (r >= 1) {
      rkNode(ctx, IK, -12, 12, 3.6, ['#ffffff', '#d8b0ff', '#7a3ac0']);
      for (const [x1, y1, sd] of [[-18, 6, 3], [-6, 18, 7]]) rkBolt(ctx, IK, -12, 12, x1, y1, '#ffffff', 1.4, '#c58cff', sd, 2, 1.2);
    }
    if (r >= 2) IK.fill(ctx, (c) => { c.moveTo(17, -17); c.lineTo(7, -12); c.lineTo(12, -7); c.closePath(); }, IK.lin(ctx, 7, -12, 17, -17, [[0, RK_GOLD[2]], [1, RK_GOLD[0]]]), 0.8, 'rgba(60,40,0,0.9)');
    if (r >= 3) {
      rkBolt(ctx, IK, 5, -21, 12, -9, '#ffd34d', 3, '#ff4a2a', 13, 4, 2.4);
      IK.light(ctx, 12, -9, 10, '#ff6a4a', 1);
      IK.light(ctx, 12, -9, 4, '#ffffff', 1);
    }
  },
  // Blitzschritt: E längere Spur, H zusätzlicher Himmelsblitz, L goldene Spur, V Kugelblitz am Ziel
  blitzschritt(ctx, IK, sk, r) {
    if (r >= 0) for (const y of [8, 12]) IK.line(ctx, [[-20, y], [-7, y]], '#cfe8ff', 1.8, 'rgba(20,30,80,0.7)');
    if (r >= 1) rkBolt(ctx, IK, -16, -18, -13, 6, '#ffffff', 2.2, '#c58cff', 17, 4, 2.2);
    if (r >= 2) IK.line(ctx, [[-19, 16], [10, 16]], RK_GOLD[1], 2, 'rgba(60,40,0,0.7)');
    if (r >= 3) {
      IK.light(ctx, 14, 4, 12, '#ff6a4a', 1);
      IK.fill(ctx, (c) => c.arc(14, 4, 4.6, 0, Math.PI * 2), IK.rad(ctx, 13, 3, 0, 5.4, [[0, '#ffffff'], [0.5, RK_V[0]], [1, RK_V[1]]]), 0.8, 'rgba(60,10,10,0.9)');
      for (let i = 0; i < 4; i++) { const a = -1.2 + i * 0.8; rkBolt(ctx, IK, 14 + Math.cos(a) * 5, 4 + Math.sin(a) * 5, 14 + Math.cos(a) * 10, 4 + Math.sin(a) * 10, '#ffd34d', 1.2, '#ff6a4a', 21 + i, 2, 1); }
    }
  },
  // Gewitterwolke: E breitere Wolke, H Nebenblitz, L goldener Blitz, V Wolke zieht nach (Bewegungsstriche, roter Blitz)
  gewitter(ctx, IK, sk, r) {
    const puff = (x, y, s) => IK.fill(ctx, (c) => { c.arc(x, y, s, 0, Math.PI * 2); c.arc(x + s * 0.9, y + 1, s * 0.8, 0, Math.PI * 2); },
      IK.rad(ctx, x, y - s * 0.5, 0, s * 1.6, [[0, '#b8b0e0'], [1, '#4a4466']]), 0.8, 'rgba(10,6,20,0.9)');
    if (r >= 0) { puff(-19, -9, 4); puff(14, -10, 4); }
    if (r >= 1) rkBolt(ctx, IK, 14, -6, 18, 8, '#ffffff', 2, '#c58cff', 23, 3, 1.6);
    if (r >= 2) rkBolt(ctx, IK, -2, -6, 0, 10, '#fff6c8', 2.6, '#ffd34d', 29, 4, 1.8);
    if (r >= 3) {
      for (const y of [-15, -11, -7]) IK.line(ctx, [[-22, y], [-15, y]], '#ffd0a0', 1.4, null);
      rkBolt(ctx, IK, 8, -5, 13, 14, '#ffd34d', 2.8, '#ff4a2a', 31, 4, 2.2);
      IK.light(ctx, 13, 14, 7, '#ff6a4a', 1);
    }
  },
  // Kugelblitz: E größeres Feld, H helleres Finale, L goldener Kern, V Sonnensturm (vier rote Blitze nach außen)
  kugelblitz(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 0, 0, 21, '#9fd0ff', 0.35);
    if (r >= 1) IK.light(ctx, 0, -1, 10, '#ffffff', 0.7);
    if (r >= 2) IK.fill(ctx, (c) => c.arc(0, -1, 4, 0, Math.PI * 2), IK.rad(ctx, -1, -2, 0, 4.6, [[0, '#ffffff'], [0.5, RK_GOLD[0]], [1, RK_GOLD[1]]]), 0.8, 'rgba(60,40,0,0.9)');
    if (r >= 3) {
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; rkBolt(ctx, IK, Math.cos(a) * 6, Math.sin(a) * 6 - 1, Math.cos(a) * 18, Math.sin(a) * 18 - 1, '#ffd34d', 2.2, '#ff4a2a', 41 + i, 3, 1.8); }
      rkBolt(ctx, IK, 0, 3, 0, 18, '#ffffff', 2.6, '#ffd34d', 47, 3, 1.4);
    }
  },
  // Glutfeld: E breiterer Glutrand, H Sog (zwei Bögen nach innen), L goldene Flammen, V Feuersäule in der Mitte
  glutfeld(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 0, 15, 19, '#ff8a2a', 0.6);
    if (r >= 1) for (const sg of [-1, 1]) IK.line(ctx, [[sg * 19, 4], [sg * 14, 9], [sg * 9, 9]], '#ffe08a', 2, 'rgba(60,10,0,0.85)');
    if (r >= 2) for (const x of [-10, 10]) IK.flame(ctx, x, 14, 9, 0, ['#b8860b', '#ffd34d', '#fff6c8']);
    if (r >= 3) {
      IK.light(ctx, 0, -2, 17, '#ff6a4a', 0.9);
      IK.fill(ctx, (c) => { c.moveTo(-5, 15); c.lineTo(-3, -19); c.lineTo(3, -19); c.lineTo(5, 15); c.closePath(); }, IK.lin(ctx, 0, -19, 0, 15, [[0, '#ffffff'], [0.3, RK_V[0]], [0.7, RK_V[1]], [1, '#a01a0a']]), 0.9, 'rgba(60,10,10,0.9)');
      IK.light(ctx, 0, -18, 6, '#ffd34d', 1);
    }
  },
  // Feuerball: E Glutspur, H Flammenkranz um die Kugel, L Glutlache darunter, V drei Feuerkugeln fliegen heraus
  feuerball(ctx, IK, sk, r) {
    if (r >= 0) for (const [a, b] of [[[-20, 10], [-9, 3]], [[-17, 15], [-7, 8]]]) IK.line(ctx, [a, b], '#ffe08a', 1.8, 'rgba(60,10,0,0.7)');
    if (r >= 1) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; IK.flame(ctx, 3 + Math.cos(a) * 11, -3 + Math.sin(a) * 11, 5, a + Math.PI / 2, ['#c81a0a', '#ff8a2a', '#fff1a0']); }
    if (r >= 2) for (const x of [-7, 0, 7]) IK.flame(ctx, x, 20, 7, 0, ['#b8860b', '#ffd34d', '#fff6c8']);
    if (r >= 3) {
      for (const [x, y] of [[17, -13], [18, 5], [-3, -19]]) {
        IK.light(ctx, x, y, 7, '#ff6a4a', 1);
        IK.fill(ctx, (c) => c.arc(x, y, 3.2, 0, Math.PI * 2), IK.rad(ctx, x - 0.6, y - 0.6, 0, 3.6, [[0, '#ffffff'], [0.5, '#ffd34d'], [1, '#ff4a1a']]), 0.7, 'rgba(60,10,0,0.9)');
      }
    }
  },
  // Flammenwoge: E längere Bahn, H Mitreißen (Pfeil), L goldener Kamm, V zweite Woge dahinter in Rot-Violett
  flammenwoge(ctx, IK, sk, r) {
    if (r >= 0) for (const y of [-4, 4]) IK.line(ctx, [[-22, y], [-12, y]], '#ffe08a', 1.8, 'rgba(60,10,0,0.7)');
    if (r >= 1) IK.fill(ctx, (c) => { c.moveTo(12, 17); c.lineTo(20, 12); c.lineTo(12, 7); c.closePath(); }, '#ffe08a', 0.9, 'rgba(60,10,0,0.9)');
    if (r >= 2) IK.line(ctx, [[0, -12], [5, -16], [10, -12]], RK_GOLD[1], 2.2, 'rgba(60,40,0,0.85)');
    if (r >= 3) for (const [x, y] of [[-14, 6], [-12, -6]]) IK.flame(ctx, x, y + 9, 13, 0.2, ['#7a0a3a', '#ff4a6a', '#ffd0e0']);
  },
  // Phönixflamme: E Schwingenspitzen glühen, H längerer Schweif, L goldener Kamm, V zweiter kleiner Phönix
  phoenix(ctx, IK, sk, r) {
    if (r >= 0) for (const sg of [-1, 1]) IK.light(ctx, sg * 16, -2, 7, '#ffd34d', 0.9);
    if (r >= 1) IK.flame(ctx, 0, 23, 12, Math.PI, ['#c81a0a', '#ff8a2a', '#fff1a0']);
    if (r >= 2) for (const dx of [-3, 0, 3]) IK.line(ctx, [[dx * 0.5, -14], [dx, -20]], RK_GOLD[1], 1.8, 'rgba(60,40,0,0.85)');
    if (r >= 3) {
      ctx.save();
      ctx.translate(-13, -11);
      ctx.scale(1.6, 1.6);
      IK.light(ctx, 0, 0, 6, '#ff6a4a', 1);
      for (const sg of [-1, 1]) IK.fill(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(sg * 6, -6, sg * 8, 0); c.quadraticCurveTo(sg * 4, -1, 0, 2); c.closePath(); }, IK.lin(ctx, 0, -6, 0, 2, [[0, '#fff1c8'], [1, '#ff6a4a']]), 0.6, 'rgba(60,10,0,0.9)');
      IK.flame(ctx, 0, 6, 5, Math.PI, ['#c84aff', '#ff6a4a', '#ffe0a0']);
      ctx.restore();
    }
  },
  // Feuertornados: E Glutfunken, H Sog-Schlieren, L goldene Spitzen, V ein großer verschmolzener Wirbel vorn
  feuertornado(ctx, IK, sk, r) {
    if (r >= 0) IK.sparkles(ctx, 7, '#fff1a0', 3, 18, 0, 0, 2.4);
    if (r >= 1) for (const sg of [-1, 1]) IK.line(ctx, [[sg * 20, -3], [sg * 15, 2], [sg * 10, 2]], '#ffe08a', 2, 'rgba(60,10,0,0.85)');
    if (r >= 2) for (const x of [-10, 0, 10]) IK.light(ctx, x, -15, 5, '#ffd34d', 1);
    if (r >= 3) {
      IK.light(ctx, 0, 2, 16, '#ff6a4a', 0.9);
      IK.swirl(ctx, 0, 4, 3, 14, 2.2, '#ffd34d', 2.8, 0.5);
      IK.swirl(ctx, 0, 4, 2, 10, 2.2, '#c84aff', 1.8, 2.1);
    }
  }
});

// Frost und Erde (Paket 2): dieselbe Rang-Sprache – E/H ein Element der Mechanik, L Gold, V eigene Signatur
const RK_ICE = ['#ffffff', '#9ff0ff', '#3a7bff', '#1a3fb0'];
const RK_ICE_V = ['#ffffff', '#ffd0f0', '#c84aff', '#5a1a8a'];
const RK_ROCK = ['#ffe0b0', '#c89a5a', '#4a3020'];
const RK_ROCK_V = ['#ffb08a', '#c8402a', '#3a0a06'];
Object.assign(SKILL_ART_RANK, {
  // Frostnova: E Nachhall (äußere Kristalle), H größerer Umkreis, L goldener Kern, V Eis zerspringt (Splitter nach außen)
  frostnova(ctx, IK, sk, r) {
    if (r >= 0) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; IK.crystal(ctx, Math.cos(a) * 10, Math.sin(a) * 9, 8, 3.4, a + Math.PI / 2, RK_ICE); }
    if (r >= 1) IK.light(ctx, 0, 0, 21, '#c58cff', 0.35);
    if (r >= 2) IK.fill(ctx, (c) => c.arc(0, 0, 3.6, 0, Math.PI * 2), IK.rad(ctx, -1, -1, 0, 4, [[0, '#ffffff'], [0.5, RK_GOLD[0]], [1, RK_GOLD[1]]]), 0.8, 'rgba(60,40,0,0.9)');
    if (r >= 3) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.9; IK.crystal(ctx, Math.cos(a) * 9, Math.sin(a) * 8, 10, 3.8, a + Math.PI / 2, RK_ICE_V); }
  },
  // Eisstrahl: E längere Spitze, H breiterer Strahl, L goldene Schneeflocke, V Seitensplitter in Violett
  eisstrahl(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 15, -15, 8, '#eafcff', 0.9);
    if (r >= 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#9ff6ff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(14, -14); ctx.stroke();
      ctx.restore();
    }
    if (r >= 2) for (let i = 0; i < 3; i++) IK.line(ctx, [[-14 + Math.cos(i * 1.05) * 5, -10 + Math.sin(i * 1.05) * 5], [-14 - Math.cos(i * 1.05) * 5, -10 - Math.sin(i * 1.05) * 5]], RK_GOLD[1], 1.8, 'rgba(60,40,0,0.85)');
    if (r >= 3) { IK.crystal(ctx, 14, 6, 13, 4, 0.9, RK_ICE_V); IK.light(ctx, 16, 10, 6, '#c84aff', 0.9); }
  },
  // Eisschritt: E Bewegungsstriche, H Nachbild, L goldene Augen, V die Figur zerspringt in Splitter
  eisschritt(ctx, IK, sk, r) {
    if (r >= 0) for (const y of [-2, 5]) IK.line(ctx, [[-21, y], [-12, y]], '#eafcff', 1.8, 'rgba(10,30,80,0.7)');
    if (r >= 1) IK.light(ctx, -9, 0, 9, '#c58cff', 0.6);
    if (r >= 2) for (const x of [-2, 3]) IK.light(ctx, x, -8, 2.6, '#ffd34d', 1);
    if (r >= 3) for (let i = 0; i < 5; i++) { const a = -1.4 + i * 0.7; IK.crystal(ctx, 4 + Math.cos(a) * 8, 2 + Math.sin(a) * 8, 9, 3.4, a + Math.PI / 2, RK_ICE_V); }
  },
  // Eisgefängnis: E breiterer Sockel, H Splitter außen, L goldene Spitze, V fünf Splitter nach außen
  eisgefaengnis(ctx, IK, sk, r) {
    if (r >= 0) for (const s of [-1, 1]) IK.crystal(ctx, s * 12, 14, 11, 4.2, s * 0.45, RK_ICE);
    if (r >= 1) for (const [x, y, a] of [[-15, -2, -1.1], [15, 0, 1.1]]) IK.crystal(ctx, x, y, 8, 3.2, a, RK_ICE);
    if (r >= 2) IK.crystal(ctx, 0, -14, 8, 3.4, 0, ['#fff6c8', '#ffd34d', '#b8860b', '#6a4a0a']);
    if (r >= 3) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.62; IK.crystal(ctx, Math.cos(a) * 9, Math.sin(a) * 9 + 4, 10, 3.6, a + Math.PI / 2, RK_ICE_V); }
  },
  // Blizzard: E mehr Flocken, H dichterer Wirbel, L goldene Flocke, V großer Eiszapfen in der Mitte
  schneesturm(ctx, IK, sk, r) {
    if (r >= 0) IK.sparkles(ctx, 7, '#ffffff', 5, 19, 0, 0, 2.4);
    if (r >= 1) IK.swirl(ctx, 0, 0, 4, 16, 1.6, '#e8d8ff', 1.8, 1.2);
    if (r >= 2) for (let i = 0; i < 3; i++) IK.line(ctx, [[12 + Math.cos(i * 1.05) * 4, -12 + Math.sin(i * 1.05) * 4], [12 - Math.cos(i * 1.05) * 4, -12 - Math.sin(i * 1.05) * 4]], RK_GOLD[1], 1.8, 'rgba(60,40,0,0.85)');
    if (r >= 3) { IK.crystal(ctx, 0, 4, 22, 6, Math.PI, RK_ICE_V); IK.light(ctx, 0, 14, 8, '#c84aff', 0.9); }
  },
  // Steinschlag: E Staub, H drei Steinsplitter, L goldene Risse, V zweiter glühender Brocken von oben
  steinschlag(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 0, 12, 16, '#c9a878', 0.45);
    if (r >= 1) for (const [x, y, sd] of [[-13, -9, 1], [13, -11, 2], [12, 11, 3]]) IK.rock(ctx, x, y, 4.2, sd, RK_ROCK);
    if (r >= 2) for (const s of [-1, 1]) IK.line(ctx, [[s * 3, 3], [s * 8, 8], [s * 6, 13]], RK_GOLD[1], 1.6, 'rgba(60,40,0,0.85)');
    if (r >= 3) { IK.light(ctx, 0, -15, 9, '#ff6a4a', 1); IK.rock(ctx, 0, -15, 5.5, 7, RK_ROCK_V); }
  },
  // Felsgeschoss: E Staub, H rollt weiter (Bewegungsstriche, kleiner Brocken), L goldene Risse, V Fächer aus vier Brocken
  steingeschoss(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 0, 0, 20, '#c9a878', 0.35);
    if (r >= 1) { for (const y of [14, 18]) IK.line(ctx, [[-20, y], [-8, y]], '#ffd98a', 1.6, 'rgba(40,20,0,0.7)'); IK.rock(ctx, -4, 16, 3.4, 4, RK_ROCK); }
    if (r >= 2) IK.line(ctx, [[-8, -12], [-2, -6], [-6, 0]], RK_GOLD[1], 2, 'rgba(60,40,0,0.85)');
    if (r >= 3) for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; IK.light(ctx, 12 + Math.cos(a) * 8, -4 + Math.sin(a) * 8, 4, '#ff6a4a', 0.9); IK.rock(ctx, 12 + Math.cos(a) * 8, -4 + Math.sin(a) * 8, 2.6, 10 + i, RK_ROCK_V); }
  },
  // Erdspitzen: E zusätzliche Spitze, H Spitzen am Rand, L goldene Spitzen, V rot glühende Spitzen
  erdspitzen(ctx, IK, sk, r) {
    const spike = (x, y, h, pal) => IK.fill(ctx, (c) => { c.moveTo(x - 3, y); c.lineTo(x, y - h); c.lineTo(x + 3, y); c.closePath(); }, IK.lin(ctx, x, y - h, x, y, [[0, pal[0]], [1, pal[2]]]), 0.8, 'rgba(10,6,4,0.9)');
    if (r >= 0) spike(13, 16, 15, RK_ROCK);
    if (r >= 1) for (const x of [-19, 19]) spike(x, 12, 8, RK_ROCK);
    if (r >= 2) for (const x of [-6, 4]) IK.light(ctx, x, -12, 3.4, '#ffd34d', 1);
    if (r >= 3) { IK.light(ctx, 0, 6, 16, '#ff4a2a', 0.7); for (const x of [-12, 0, 12]) spike(x, 18, 12, RK_ROCK_V); }
  },
  // Bergsturz: E Staubwolke, H drei rollende Brocken, L goldener Glutkern, V zwei kleine Brocken stürzen hinterher
  bergsturz(ctx, IK, sk, r) {
    if (r >= 0) IK.light(ctx, 0, 16, 17, '#c9a878', 0.45);
    if (r >= 1) for (const [x, sd] of [[-11, 1], [0, 2], [11, 3]]) IK.rock(ctx, x, 14, 3.8, sd, RK_ROCK);
    if (r >= 2) IK.light(ctx, 0, -2, 6, '#ffd34d', 1);
    if (r >= 3) for (const [x, y] of [[-12, -11], [13, -9]]) { IK.line(ctx, [[x - 5, y - 7], [x, y]], '#ff8a4a', 2.4, null); IK.light(ctx, x, y, 7, '#ff6a4a', 1); IK.rock(ctx, x, y, 4.6, x, RK_ROCK_V); }
  },
  // Schwerkraftsiegel: E ein Fels mehr, H Sog-Schlieren, L goldener Kern, V schwarzes Loch mit violettem Saum
  schwerkraft(ctx, IK, sk, r) {
    if (r >= 0) IK.rock(ctx, 0, -14, 4.2, 9, RK_ROCK);
    if (r >= 1) IK.swirl(ctx, 0, 0, 5, 17, 1.2, '#ffd98a', 1.6, 0.4);
    if (r >= 2) IK.fill(ctx, (c) => c.arc(0, 0, 4.2, 0, Math.PI * 2), IK.rad(ctx, -1, -1, 0, 5, [[0, '#ffffff'], [0.5, RK_GOLD[0]], [1, RK_GOLD[1]]]), 0.8, 'rgba(60,40,0,0.9)');
    if (r >= 3) {
      IK.light(ctx, 0, 0, 13, '#c84aff', 1);
      IK.fill(ctx, (c) => c.arc(0, 0, 6.5, 0, Math.PI * 2), IK.rad(ctx, 0, 0, 0, 7, [[0, '#000000'], [0.7, '#14061e'], [1, '#5a1a8a']]), 1.4, '#c84aff');
    }
  }
});
