// Fertigkeitssymbole Magier – Blitz und Erde (seit 9.6), Stil und Hilfen in symbol-kunst.js
// Farben aus MAGE_EL: Blitz Gelbweiß mit violettem Saum, Erde dunkler Basalt mit glühendem Bernstein.
// Abgrenzung zum Schamanen: nichts fällt vom Himmel – Bodenbögen, waagrechte Zaps, Siegel am Boden.

// Ultimates haben kein Element: Thema hier festlegen
Object.assign(SKILL_ART_THEME, { donnerkrone: 'm_blitz', weltenbruch: 'm_erde' });

// --- eigene Hilfen (Präfix ikMag2) ---------------------------------------------------------------

const IKMAG2_BASALT = ['#9a8e84', '#5a4e48', '#2e2624', '#141010'];

// Magier im Kapuzenmantel von vorn: Füße bei (x,y), Höhe h; fill = Farbe oder fn(ctx) → Verlauf; eye = Augenfarbe
function ikMag2Mage(ctx, IK, x, y, h, fill = '#1a1420', eye = null, line = 0) {
  ctx.save();
  ctx.translate(x, y);
  const k = h / 20;
  ctx.scale(k, k);
  const style = typeof fill === 'function' ? fill(ctx) : fill;
  IK.fill(ctx, (c) => {
    c.moveTo(0, -21);
    c.quadraticCurveTo(3.6, -19.6, 3.4, -15.4);
    c.quadraticCurveTo(5.6, -14.6, 6, -12);
    // weite Ärmel
    c.quadraticCurveTo(7.6, -8.6, 7.2, -6);
    c.lineTo(5.2, -6.6);
    c.quadraticCurveTo(5.8, -3, 6.6, 0);
    c.quadraticCurveTo(0, 1, -6.6, 0);
    c.quadraticCurveTo(-5.8, -3, -5.2, -6.6);
    c.lineTo(-7.2, -6);
    c.quadraticCurveTo(-7.6, -8.6, -6, -12);
    c.quadraticCurveTo(-5.6, -14.6, -3.4, -15.4);
    c.quadraticCurveTo(-3.6, -19.6, 0, -21);
    c.closePath();
  }, style, line / k);
  if (eye) {
    IK.fill(ctx, (c) => c.ellipse(0, -16.4, 2, 2.4, 0, 0, Math.PI * 2), '#07040c', 0);
    for (const ex of [-0.8, 0.8]) IK.glow(ctx, eye, 2, () => IK.fill(ctx, (c) => c.ellipse(ex, -16.6, 0.5, 0.32, 0, 0, Math.PI * 2), eye, 0));
  }
  ctx.restore();
}

// Magier im Lauf nach rechts, vorgebeugt, Mantel weht nach hinten, Zepter nach vorn (ohne Kontur, Teile überlappen)
function ikMag2MageRun(ctx, IK, x, y, h, fill = '#1a1420', staff = true) {
  ctx.save();
  ctx.translate(x, y);
  const k = h / 20;
  ctx.scale(k, k);
  const style = typeof fill === 'function' ? fill(ctx) : fill;
  if (staff) {
    IK.line(ctx, [[8.4, -4], [11.6, -15.6]], '#d8a84a', 1);
    IK.glow(ctx, '#ffe94a', 5, () => IK.fill(ctx, (c) => { c.moveTo(12.2, -19.2); c.lineTo(13.4, -16.4); c.lineTo(11.7, -14.8); c.lineTo(10.7, -17); c.closePath(); }, '#ffffff', 0.4 / k));
  }
  const poly = (c, pts) => { pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };
  IK.fill(ctx, (c) => {
    c.ellipse(5, -16.6, 2.7, 2.9, 0.3, 0, Math.PI * 2);
    poly(c, [[3.4, -19], [-0.8, -20], [2.4, -15.2]]);
    poly(c, [[2.4, -14.2], [6.6, -13.8], [5.6, -7], [1.2, -6.8]]);
    poly(c, [[4.4, -7.6], [6.2, -7.2], [9.2, -1.6], [10.2, 0], [7.4, 0.2], [6.6, -1.2], [3.4, -5.4]]);
    poly(c, [[1.4, -7.4], [3.6, -6.4], [-0.6, -2.4], [-3, -0.4], [-4, -1.4], [-1.8, -3.8]]);
    poly(c, [[2.8, -14.4], [1.4, -13.8], [-4.2, -10.4], [-11, -9.6], [-7.4, -7.6], [-11.6, -5.2], [-6.4, -4.8], [-2.8, -6.2], [1.8, -6.8]]);
    poly(c, [[5.2, -13.4], [10.2, -11.6], [10.4, -10], [5.2, -10.4]]);
  }, style, 0);
  ctx.restore();
}

// Basaltsplitter: Fuß bei (x,y), Spitze in Winkel ang (0 = oben), mit glühender Bernsteinader
function ikMag2Shard(ctx, IK, x, y, len, w, ang = 0, vein = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  IK.fill(ctx, (c) => { c.moveTo(0, 0); c.lineTo(-w / 2, -len * 0.3); c.lineTo(-w / 3, -len * 0.8); c.lineTo(0, -len); c.lineTo(w / 2.2, -len * 0.7); c.lineTo(w / 2, -len * 0.2); c.closePath(); },
    IK.lin(ctx, -w / 2, 0, w / 2, 0, [[0, IKMAG2_BASALT[0]], [0.45, IKMAG2_BASALT[1]], [0.55, IKMAG2_BASALT[2]], [1, IKMAG2_BASALT[3]]]), 0.8, 'rgba(8,4,2,0.95)');
  if (vein) IK.bolt(ctx, [[w * 0.05, -len * 0.12], [-w * 0.12, -len * 0.42], [w * 0.1, -len * 0.62], [-w * 0.02, -len * 0.84]], '#ffd98a', Math.max(0.5, w * 0.16), '#f0a830');
  ctx.restore();
}

// Basaltbrocken mit Bernsteinrissen
function ikMag2Stone(ctx, IK, x, y, r, seed = 1, cracks = 2) {
  IK.rock(ctx, x, y, r, seed, ['#8a7e74', '#4a403c', '#181212']);
  let s = seed * 131;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < cracks; i++) {
    const a = rnd() * Math.PI * 2;
    const pts = IK.zigzag(x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 3, r * 0.12, seed + i);
    IK.bolt(ctx, pts, '#ffd98a', Math.max(0.5, r * 0.11), '#f0a830');
  }
}

// Kugelblitz: leuchtende Kugel mit zuckenden Bögen darin
function ikMag2Orb(ctx, IK, x, y, r, seed = 1) {
  IK.light(ctx, x, y, r * 2.4, '#8a5aff', 0.8);
  IK.glow(ctx, '#ffe94a', r, () => IK.fill(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2),
    IK.rad(ctx, x - r * 0.3, y - r * 0.35, 0, r * 1.1, [[0, '#ffffff'], [0.35, '#fff7b0'], [0.75, '#c8a0ff'], [1, '#6a3ae0']]), 0.8, 'rgba(40,20,90,0.9)'));
  for (let i = 0; i < 3; i++) {
    const a = seed + i * 2.1;
    IK.bolt(ctx, IK.zigzag(x, y, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, 3, r * 0.18, seed + i), '#ffffff', Math.max(0.4, r * 0.09), '#ffe94a');
  }
  IK.light(ctx, x - r * 0.3, y - r * 0.35, r * 0.6, '#ffffff', 0.8);
}

// flaches Siegel am Boden: Ring und Dreieck (up = △, sonst ▽) mit Balken, in Perspektive
function ikMag2Sigil(ctx, IK, cx, cy, rx, ry, col, glowCol, up = true) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = IK.rad(ctx, cx, cy, 0, rx, [[0, glowCol], [1, 'rgba(0,0,0,0)']]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  IK.shock(ctx, cx, cy, rx, ry, col, 1.1);
  IK.shock(ctx, cx, cy, rx * 0.8, ry * 0.8, glowCol, 0.6);
  const d = up ? -1 : 1;
  const P = (a) => [cx + Math.cos(a) * rx * 0.78, cy + Math.sin(a) * ry * 0.78];
  const tri = [P(Math.PI / 2 * d), P(Math.PI / 2 * d + Math.PI * 2 / 3), P(Math.PI / 2 * d + Math.PI * 4 / 3)];
  const barY = cy - d * ry * 0.05;
  IK.bolt(ctx, [...tri, tri[0]], col, 0.9, glowCol);
  IK.bolt(ctx, [[cx - rx * 0.36, barY], [cx + rx * 0.36, barY]], col, 0.8, glowCol);
}

// --- Motive ---------------------------------------------------------------------------------------
Object.assign(SKILL_ART, {
  // Blitznova: zuckende Blitze kriechen flach über den Boden nach außen, violetter Saum, zwei Kugelblitze kreisen
  blitznova(ctx, IK) {
    const cy = 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.rad(ctx, 0, cy, 0, 19, [[0, 'rgba(160,110,255,0.55)'], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath();
    ctx.ellipse(0, cy, 19, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    IK.shock(ctx, 0, cy, 18, 9.5, '#8a5aff', 1.8);
    // acht Bodenblitze, hinten dünner
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const back = Math.sin(a) < 0;
      const ex = Math.cos(a) * 17.5;
      const ey = cy + Math.sin(a) * 9;
      const pts = IK.zigzag(0, cy, ex, ey, 5, back ? 1.6 : 2.2, i + 3);
      IK.bolt(ctx, pts, '#fff7b0', back ? 1.2 : 1.8, '#8a5aff');
      // kleiner Ast
      const m = pts[2];
      IK.bolt(ctx, IK.zigzag(m[0], m[1], m[0] + Math.cos(a + 0.7) * 5, m[1] + Math.sin(a + 0.7) * 3, 2, 0.8, i + 9), '#fff7b0', 0.7, '#8a5aff');
      IK.light(ctx, ex, ey, 3.5, '#ffe94a', 0.7);
    }
    // Mitte: Entladung am Boden
    IK.light(ctx, 0, cy, 11, '#fff7b0', 0.9);
    IK.glow(ctx, '#ffe94a', 6, () => IK.fill(ctx, (c) => c.ellipse(0, cy, 3.6, 2.2, 0, 0, Math.PI * 2), IK.rad(ctx, -0.6, cy - 0.6, 0, 3.6, [[0, '#ffffff'], [1, '#ffe94a']]), 0));
    // zwei violette Kugelblitze kreisen
    IK.trail(ctx, 0, 0, 14, Math.PI * 0.85, Math.PI * 1.25, 2.2, '#b89aff', 12);
    IK.trail(ctx, 0, 0, 14, Math.PI * 1.85, Math.PI * 2.2, 2.2, '#b89aff', 12);
    for (const [x, y] of [[-12.4, -6.2], [11.6, 6.6]]) {
      IK.light(ctx, x, y, 7, '#8a5aff', 0.9);
      IK.glow(ctx, '#b89aff', 5, () => IK.fill(ctx, (c) => c.arc(x, y, 3, 0, Math.PI * 2), IK.rad(ctx, x - 1, y - 1, 0, 3.4, [[0, '#ffffff'], [0.4, '#d8c8ff'], [1, '#7a4ae0']]), 0.7, 'rgba(30,10,70,0.9)'));
    }
  },

  // Kettenblitz: Blitz aus dem Kristallzepter springt von Gegner zu Gegner, Funken an jedem Knoten
  kettenblitz(ctx, IK) {
    // Zepter unten links
    ctx.save();
    ctx.translate(-12, 9);
    ctx.rotate(-0.75);
    IK.fill(ctx, (c) => c.rect(-1, 0, 2, 14), IK.lin(ctx, -1, 0, 1, 0, [[0, '#5a3a1a'], [0.45, '#c89a4a'], [1, '#3a2410']]), 0.8);
    IK.fill(ctx, (c) => { c.moveTo(-3, 1); c.quadraticCurveTo(0, -1.5, 3, 1); c.lineTo(2, 2.4); c.lineTo(-2, 2.4); c.closePath(); }, IK.lin(ctx, 0, -1, 0, 2.4, [[0, '#fff1c8'], [1, '#8a6a1a']]), 0.7);
    IK.glow(ctx, '#ffe94a', 6, () => IK.crystal(ctx, 0, 0.5, 7, 3.6, 0, ['#ffffff', '#fff7b0', '#ffd23a', '#a07a10']));
    ctx.restore();
    const nodes = [[-15.5, 2], [-4, -10], [6, 5], [15, -9]];
    for (let i = 0; i < nodes.length - 1; i++) {
      const pts = IK.zigzag(...nodes[i], ...nodes[i + 1], 5, 2.6, i + 2);
      IK.bolt(ctx, pts, '#fff7b0', 2.2, '#8a5aff');
      const m = pts[2];
      IK.bolt(ctx, IK.zigzag(m[0], m[1], m[0] + 4, m[1] + 3.5, 2, 1, i + 7), '#fff7b0', 0.8, '#8a5aff');
    }
    for (const [x, y] of nodes.slice(1)) {
      IK.light(ctx, x, y, 8, '#c8b0ff', 0.9);
      IK.glow(ctx, '#ffe94a', 6, () => IK.fill(ctx, (c) => c.arc(x, y, 3.2, 0, Math.PI * 2), IK.rad(ctx, x - 1, y - 1, 0, 3.6, [[0, '#ffffff'], [0.5, '#fff7b0'], [1, '#ffd23a']]), 0.8, 'rgba(40,20,90,0.9)'));
      // Funkenpaar
      IK.bolt(ctx, [[x + 3, y - 3], [x + 5, y - 4], [x + 5.5, y - 6]], '#ffffff', 0.6, '#ffe94a');
      IK.bolt(ctx, [[x - 3, y + 3], [x - 5, y + 3.5], [x - 6, y + 5.5]], '#ffffff', 0.6, '#ffe94a');
    }
    IK.light(ctx, -15.5, 2, 9, '#fff7b0', 1);
  },

  // Blitzschritt: der Magier wird zum waagrechten Blitz, Nachbilder und Brandlinie am Boden
  blitzschritt(ctx, IK) {
    // Brandlinie
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = IK.lin(ctx, -19, 0, 10, 0, [[0, 'rgba(20,10,30,0)'], [1, 'rgba(20,10,30,0.85)']]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-19, 14);
    ctx.lineTo(9, 13);
    ctx.stroke();
    ctx.restore();
    IK.bolt(ctx, IK.zigzag(-18, 14.2, 9, 13, 9, 0.8, 4), '#ffb84a', 0.7, '#ff6a2a');
    // Nachbilder (violett, verblassend)
    for (const [x, a] of [[-15, 0.22], [-8, 0.4]]) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      ikMag2MageRun(ctx, IK, x, 13.5, 24, '#8a5aff', false);
      ctx.restore();
    }
    // waagrechter Blitzstrahl durch den Körper
    IK.bolt(ctx, IK.zigzag(-19, 1, 6, -1, 7, 2.6, 6), '#fff7b0', 3, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(-18, 7, 2, 6, 5, 1.8, 11), '#fff7b0', 1.4, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(-17, -6, 3, -7, 5, 1.6, 13), '#fff7b0', 1, '#8a5aff');
    // der Magier vorn, umzuckt von Licht
    IK.light(ctx, 4, 2, 14, '#ffe94a', 0.7);
    IK.glow(ctx, '#ffe94a', 9, () => ikMag2MageRun(ctx, IK, -1, 13.5, 26, (c) => IK.lin(c, -6, -20, 8, 0, [[0, '#7a68c8'], [0.45, '#3a2a7a'], [1, '#120a2a']])));
    // Blitzadern über dem Körper: er wird selbst zum Blitz
    IK.bolt(ctx, [[-9, -3], [-4, -2], [-1, -5], [3, -4], [6, -7]], '#ffffff', 0.9, '#ffe94a');
    IK.bolt(ctx, [[-7, 4], [-2, 2], [1, 4], [5, 1]], '#ffffff', 0.7, '#ffe94a');
    IK.light(ctx, 15, -10, 6, '#ffffff', 0.9);
    IK.sparkles(ctx, 4, '#fff7b0', 8, 5, 13, -8, 1.2);
  },

  // Statische Ladung (Buff): Funken knistern über die Robe des Magiers, violette Aura
  ladung(ctx, IK) {
    IK.light(ctx, 0, 0, 20, '#8a5aff', 0.7);
    IK.shock(ctx, 0, 15, 13, 3.6, '#b89aff', 1.4);
    IK.glow(ctx, '#b89aff', 7, () => ikMag2Mage(ctx, IK, 0, 16.5, 32, (c) => IK.lin(c, -7, -21, 7, 0, [[0, '#8a7ad0'], [0.35, '#4a3a8a'], [1, '#140c2a']]), '#fff7b0', 1.2));
    // Glanzkante links oben (Licht von oben links)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(220,200,255,0.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-0.6, -16.6);
    ctx.quadraticCurveTo(-5.4, -14.4, -5.6, -11);
    ctx.quadraticCurveTo(-9.2, -7, -11, -3.4);
    ctx.stroke();
    ctx.restore();
    // Funken auf der Robe und rundherum
    const arcs = [[-6, -6, -2, -1], [3, -3, 7, 2], [-6, 5, -2, 10], [2, 8, 6, 13], [-1, -10, 3, -6], [8, -13, 12, -8], [-14, -9, -10, -4], [12, 2, 16, 7], [-13, 6, -16, 11]];
    arcs.forEach(([x0, y0, x1, y1], i) => {
      IK.bolt(ctx, IK.zigzag(x0, y0, x1, y1, 3, 1.4, i + 2), '#fff7b0', i < 5 ? 1.1 : 0.9, '#8a5aff');
      IK.light(ctx, x1, y1, 3, '#ffe94a', 0.8);
    });
    IK.sparkles(ctx, 9, '#fff7b0', 12, 17, 0, 0, 1.2);
  },

  // Kugelblitz: knisternde Kugel steigt über einem △-Siegel auf und schlägt waagrecht in drei Gegner
  kugelblitz(ctx, IK) {
    ikMag2Sigil(ctx, IK, 0, 12.5, 16, 5.5, '#ffe94a', '#8a5aff', true);
    // Lichtsäule vom Siegel zur Kugel
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, 0, 12, 0, -2, [[0, 'rgba(255,233,74,0.45)'], [1, 'rgba(138,90,255,0)']]);
    ctx.beginPath();
    ctx.moveTo(-5, 12.5);
    ctx.lineTo(-2.5, -2);
    ctx.lineTo(2.5, -2);
    ctx.lineTo(5, 12.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // waagrechte Schläge
    IK.bolt(ctx, IK.zigzag(-8, -3, -19, -1, 5, 1.8, 3), '#fff7b0', 1.6, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(8, -4, 19, -6, 5, 1.8, 5), '#fff7b0', 1.6, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(7, 1, 16, 7, 4, 1.4, 8), '#fff7b0', 1.1, '#8a5aff');
    for (const [x, y] of [[-18.5, -1], [18.5, -6], [16, 7]]) IK.light(ctx, x, y, 4.5, '#ffe94a', 0.9);
    ikMag2Orb(ctx, IK, 0, -3, 9, 2);
    IK.sparkles(ctx, 5, '#fff7b0', 4, 14, 0, -3, 1.1);
  },

  // Donnerkrone (Ultimate): Krone aus Blitzen über dem Kopf des Magiers, waagrechte Blitze nach beiden Seiten
  donnerkrone(ctx, IK) {
    IK.light(ctx, 0, -8, 18, '#ffe94a', 0.5);
    // Kopf und Schultern des Magiers von vorn
    IK.glow(ctx, '#8a5aff', 6, () => IK.fill(ctx, (c) => {
      c.moveTo(-18, 22);
      c.quadraticCurveTo(-16, 11, -7.5, 9);
      c.quadraticCurveTo(-8.4, 2, -6, -1.5);
      c.quadraticCurveTo(0, -5, 6, -1.5);
      c.quadraticCurveTo(8.4, 2, 7.5, 9);
      c.quadraticCurveTo(16, 11, 18, 22);
      c.closePath();
    }, IK.lin(ctx, -10, -4, 10, 20, [[0, '#6a5ab0'], [0.4, '#2e2266'], [1, '#0c0820']]), 1.1));
    IK.fill(ctx, (c) => c.ellipse(0, 4.6, 3.8, 4.4, 0, 0, Math.PI * 2), '#0a0614', 0);
    for (const ex of [-1.5, 1.5]) IK.glow(ctx, '#ffe94a', 3, () => IK.fill(ctx, (c) => c.ellipse(ex, 4.2, 0.85, 0.5, 0, 0, Math.PI * 2), '#fff7b0', 0));
    // waagrechte Blitze aus der Krone
    IK.bolt(ctx, IK.zigzag(-10, -6, -19, 0, 5, 1.8, 2), '#fff7b0', 1.6, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(10, -6, 19, -1, 5, 1.8, 4), '#fff7b0', 1.6, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(-11, -12, -18, -9, 3, 1.2, 6), '#fff7b0', 1, '#8a5aff');
    IK.bolt(ctx, IK.zigzag(11, -12, 18, -10, 3, 1.2, 7), '#fff7b0', 1, '#8a5aff');
    // Krone: Reif mit fünf gezackten Blitzzacken, goldgelb glühend
    const crown = (c) => {
      c.moveTo(-10.5, -3);
      c.lineTo(-11.5, -14);
      c.lineTo(-8.6, -10.6);
      c.lineTo(-7.4, -16.4);
      c.lineTo(-5.6, -11.4);
      c.lineTo(-3.6, -12.2);
      c.lineTo(-1.2, -19.6);
      c.lineTo(0.4, -13.2);
      c.lineTo(2.4, -14.4);
      c.lineTo(4.6, -11.2);
      c.lineTo(7.6, -16.6);
      c.lineTo(8.4, -10.8);
      c.lineTo(11.5, -14);
      c.lineTo(10.5, -3);
      c.quadraticCurveTo(0, -0.6, -10.5, -3);
      c.closePath();
    };
    IK.glow(ctx, '#ffe94a', 9, () => IK.fill(ctx, crown, IK.lin(ctx, -8, -19, 8, -2, [[0, '#ffffff'], [0.35, '#fff7b0'], [0.7, '#ffe94a'], [1, '#c8901a']]), 1.1, 'rgba(50,20,100,0.95)'));
    // Reif mit Edelstein
    IK.fill(ctx, (c) => { c.moveTo(-10.6, -6); c.quadraticCurveTo(0, -3.6, 10.6, -6); c.lineTo(10.5, -3); c.quadraticCurveTo(0, -0.6, -10.5, -3); c.closePath(); },
      IK.lin(ctx, 0, -6, 0, -1, [[0, '#fff1c8'], [1, '#a07010']]), 0.7, 'rgba(50,20,100,0.95)');
    IK.glow(ctx, '#b89aff', 4, () => IK.fill(ctx, (c) => { c.moveTo(0, -6.6); c.lineTo(1.6, -4.2); c.lineTo(0, -1.8); c.lineTo(-1.6, -4.2); c.closePath(); },
      IK.rad(ctx, -0.4, -4.8, 0, 2.4, [[0, '#ffffff'], [0.5, '#b89aff'], [1, '#5a2ad0']]), 0.6, 'rgba(30,10,70,0.95)'));
    // Blitzadern in der Krone
    IK.bolt(ctx, [[-1, -18], [0.2, -14], [-1.2, -11], [0.4, -7.5]], '#ffffff', 0.7, '#8a5aff');
    IK.bolt(ctx, [[-7.2, -15], [-6.4, -12], [-7.4, -8]], '#ffffff', 0.6, '#8a5aff');
    IK.bolt(ctx, [[7.4, -15], [6.8, -12], [7.6, -8]], '#ffffff', 0.6, '#8a5aff');
    for (const [x, y] of [[-1.2, -19.6], [-7.4, -16.4], [7.6, -16.6], [-11.5, -14], [11.5, -14]]) IK.light(ctx, x, y, 4, '#ffffff', 0.8);
    IK.sparkles(ctx, 6, '#fff7b0', 9, 17, 0, -6, 1.1);
  },

  // Erdnova: Basaltsplitter mit Bernsteinadern fliegen waagrecht nach außen, Bernsteinrisse im Boden
  erdnova(ctx, IK) {
    const cy = 6;
    // Bernsteinrisse über den Boden
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      IK.bolt(ctx, IK.zigzag(0, cy, Math.cos(a) * 16, cy + Math.sin(a) * 7.5, 4, 1.2, i + 1), '#ffd98a', 0.8, '#f0a830');
    }
    // Schwerkraftstoß
    IK.shock(ctx, 0, cy, 10, 4.4, '#ffd98a', 1.4);
    IK.light(ctx, 0, cy, 9, '#f0a830', 0.8);
    // Splitter: hinten zuerst, Spitze nach außen, mit Flugspur
    const shards = [[-2.4, 15, 11, 5.6], [-1.57, 9, 10, 5.2], [-0.7, 15, 11, 5.6], [0.35, 16, 13, 6.6], [2.8, 16, 13, 6.6], [1.57, 7, 12, 6.4]];
    shards.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
    for (const [a, r, len, w] of shards) {
      const dx = Math.cos(a);
      const dy = Math.sin(a) * 0.5;
      const x = dx * r * 0.5;
      const y = cy - 3 + dy * r * 0.5;
      const dir = Math.atan2(dy, dx) + Math.PI / 2;
      // Spur: dünne Lichtlinien vom Mittelpunkt zum Splitter
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = IK.lin(ctx, 0, cy - 3, x, y, [[0, 'rgba(255,217,138,0)'], [1, 'rgba(255,217,138,0.7)']]);
      ctx.lineWidth = w * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dx * 2, cy - 3 + dy * 2);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
      ikMag2Shard(ctx, IK, x, y, len, w, dir);
    }
    // Mitte: glühender Kern
    IK.glow(ctx, '#ffd98a', 6, () => IK.fill(ctx, (c) => c.ellipse(0, cy, 3, 1.6, 0, 0, Math.PI * 2), IK.rad(ctx, 0, cy, 0, 3, [[0, '#ffffff'], [1, '#f0a830']]), 0));
    IK.sparkles(ctx, 4, '#ffd98a', 6, 17, 0, 0, 1);
  },

  // Steingeschoss: Basaltbrocken mit glühendem Bernsteinkern rast nach oben rechts, Splitter und Spur dahinter
  steingeschoss(ctx, IK) {
    const x = 4;
    const y = -4;
    // Feuerspur hinter dem Brocken
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(-1, 1) + Math.PI);
    for (const [w, col, a] of [[22, '#f0a830', 0.35], [14, '#ffb84a', 0.55], [7, '#fff0c0', 0.8]]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = IK.lin(ctx, 0, 0, 26, 0, [[0, col], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath();
      ctx.moveTo(0, -w / 2);
      ctx.quadraticCurveTo(14, -w / 4, 28, 0);
      ctx.quadraticCurveTo(14, w / 4, 0, w / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // kleine Splitter in der Spur
    for (const [sx, sy, r, s] of [[-10, 9, 2.4, 3], [-15, 6, 1.6, 5], [-7, 14, 1.8, 7], [-14, 13, 1.3, 9]]) ikMag2Stone(ctx, IK, sx, sy, r, s, 0);
    // der Brocken
    IK.light(ctx, x, y, 17, '#f0a830', 0.55);
    IK.glow(ctx, '#f0a830', 6, () => ikMag2Stone(ctx, IK, x, y, 12, 4, 0));
    // Bernsteinkern durch die Risse
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.4;
      IK.bolt(ctx, IK.zigzag(x + 0.5, y + 0.5, x + Math.cos(a) * 9, y + Math.sin(a) * 8, 3, 1.1, i + 2), '#ffd98a', 1, '#f0a830');
    }
    IK.light(ctx, x + 0.5, y + 0.5, 6, '#ffd98a', 1);
    // Geschwindigkeitslinien
    for (const [o, l] of [[-7, 12], [0, 16], [7, 10]]) {
      const ox = x - 9 + o * 0.7;
      const oy = y + 9 + o * 0.7;
      IK.line(ctx, [[ox, oy], [ox - l * 0.7, oy + l * 0.7]], 'rgba(255,217,138,0.75)', 0.9, null);
    }
    IK.glow(ctx, '#ffd98a', 5, () => IK.fill(ctx, (c) => c.arc(x + 0.5, y + 0.5, 2.2, 0, Math.PI * 2), IK.rad(ctx, x, y, 0, 2.4, [[0, '#ffffff'], [1, '#ffd98a']]), 0));
    // Glanz oben links
    IK.light(ctx, x - 5, y - 6, 4, '#fff0c0', 0.45);
  },

  // Erdsprung: der Magier bricht aus einem glühenden Riss, Basaltsplitter fliegen auf; links der Riss, in dem er versank
  erdsprung(ctx, IK) {
    // glühender Riss quer über den Boden
    const rim = [[-18, 12], [-13, 10.6], [-8, 12.6], [-3, 10.6], [2, 12.4], [7, 10.4], [12, 12], [18, 10.8]];
    IK.fill(ctx, (c) => {
      rim.forEach(([px, py], i) => (i ? c.lineTo(px, py - 1) : c.moveTo(px, py - 1)));
      for (const [px, py] of rim.slice().reverse()) c.lineTo(px, py + 1.4 + Math.max(0, 3 - Math.abs(px - 3) * 0.3));
      c.closePath();
    }, IK.lin(ctx, 0, 9, 0, 16, [[0, '#fff0c0'], [0.45, '#f0a830'], [1, '#6a2a06']]), 0.9);
    IK.glow(ctx, '#f0a830', 6, () => IK.bolt(ctx, rim, '#fff0c0', 1, '#f0a830'));
    // Lichtsäule aus dem Ausbruch
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, 0, 12, 0, -19, [[0, 'rgba(255,217,138,0.9)'], [0.55, 'rgba(240,168,48,0.35)'], [1, 'rgba(240,168,48,0)']]);
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(-1, -19);
    ctx.lineTo(7, -19);
    ctx.lineTo(12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Splitter fächern nach oben auf
    const fan = [[-1.15, -6, 8, 11, 4.6], [1.15, 12, 8, 11, 4.6], [-0.6, -3, 4, 12, 5], [0.6, 9, 4, 12, 5], [-1.45, -10, 11, 7, 3.6], [1.45, 16, 11, 7, 3.6]];
    for (const [ang, sx, sy, len, w] of fan) ikMag2Shard(ctx, IK, sx, sy, len, w, ang);
    // der Magier steigt bis zur Hüfte aus dem Riss, im Gegenlicht
    IK.glow(ctx, '#ffd98a', 7, () => ikMag2Mage(ctx, IK, 3, 18, 30, (c) => IK.lin(c, -7, -21, 7, 0, [[0, '#4a3e38'], [0.5, '#221a18'], [1, '#0a0606']]), null, 1.2));
    // vordere Risskante verdeckt die Beine
    IK.fill(ctx, (c) => { c.moveTo(-7, 12.4); c.quadraticCurveTo(3, 9.6, 13, 11.6); c.lineTo(13.5, 15); c.quadraticCurveTo(3, 17.4, -7.5, 15.2); c.closePath(); },
      IK.lin(ctx, 0, 10, 0, 17, [[0, '#ffe7a8'], [0.35, '#f0a830'], [1, '#4a1e04']]), 0.9);
    IK.bolt(ctx, [[-7, 12.4], [-2, 11.2], [3, 10.6], [8, 10.8], [13, 11.6]], '#ffffff', 0.8, '#f0a830');
    IK.light(ctx, 3, 11, 10, '#ffd98a', 0.9);
    // kleine Splitter in der Luft
    for (const [sx, sy, r, sd] of [[-12, -4, 1.8, 3], [17, -6, 1.6, 5], [-8, -12, 1.3, 7], [14, -14, 1.4, 9]]) ikMag2Stone(ctx, IK, sx, sy, r, sd, 0);
    IK.sparkles(ctx, 5, '#ffd98a', 3, 17, 2, -4, 1.1);
  },

  // Basalthaut (Buff): Basaltplatten mit Bernsteinadern an Schultern und Brust, Bernsteinschild ringsum
  basalthaut(ctx, IK) {
    // Schildkugel
    IK.light(ctx, 0, 0, 20, '#f0a830', 0.45);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.rad(ctx, -4, -6, 4, 19, [[0, 'rgba(255,217,138,0)'], [0.8, 'rgba(255,217,138,0.12)'], [1, 'rgba(255,217,138,0.45)']]);
    ctx.beginPath();
    ctx.arc(0, 0, 18.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    IK.trail(ctx, 0, 0, 18, Math.PI * 0.9, Math.PI * 1.55, 1.8, '#fff0c0', 16);
    // Körper (Robe) von vorn
    IK.fill(ctx, (c) => {
      c.moveTo(-15, 20);
      c.quadraticCurveTo(-14, 6, -6, 3);
      c.lineTo(6, 3);
      c.quadraticCurveTo(14, 6, 15, 20);
      c.closePath();
    }, IK.lin(ctx, 0, 3, 0, 20, [[0, '#3a3046'], [1, '#100c14']]), 1.1);
    // Kopf in der Kapuze
    IK.fill(ctx, (c) => { c.moveTo(0, -13.5); c.quadraticCurveTo(6.5, -12, 6, -3); c.quadraticCurveTo(5, 3, 0, 4); c.quadraticCurveTo(-5, 3, -6, -3); c.quadraticCurveTo(-6.5, -12, 0, -13.5); c.closePath(); },
      IK.lin(ctx, -6, -13, 6, 4, [[0, '#6a5a6e'], [0.5, '#3a2e3e'], [1, '#140e16']]), 1.1);
    IK.fill(ctx, (c) => c.ellipse(0, -3, 3.4, 4.4, 0, 0, Math.PI * 2), '#0a0608', 0);
    for (const ex of [-1.3, 1.3]) IK.glow(ctx, '#f0a830', 3, () => IK.fill(ctx, (c) => c.ellipse(ex, -3.4, 0.75, 0.45, 0, 0, Math.PI * 2), '#ffd98a', 0));
    // Basaltplatten: Brustplatte und zwei Schulterplatten
    const plate = (pts, light) => {
      IK.fill(ctx, (c) => { pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); },
        IK.lin(ctx, light[0], light[1], light[2], light[3], [[0, IKMAG2_BASALT[0]], [0.45, IKMAG2_BASALT[1]], [1, IKMAG2_BASALT[3]]]), 1, 'rgba(8,4,2,0.95)');
    };
    plate([[-6, 5], [6, 5], [7.5, 11], [4.5, 18], [-4.5, 18], [-7.5, 11]], [-6, 5, 6, 18]);
    plate([[-16, 10], [-13.5, 3.5], [-6.5, 2], [-5.5, 7], [-9, 11.5], [-14.5, 13]], [-15, 2, -6, 13]);
    plate([[16, 10], [13.5, 3.5], [6.5, 2], [5.5, 7], [9, 11.5], [14.5, 13]], [6, 2, 15, 13]);
    // Bernsteinadern zwischen und in den Platten
    for (const pts of [[[-5.5, 5.5], [0, 11.5], [5.5, 5.5]], [[0, 11.5], [-0.8, 14.5], [0.6, 17.5]], [[-7.2, 11.2], [-4.8, 11.8]], [[7.2, 11.2], [4.8, 11.8]],
      [[-14, 6.5], [-11, 7.5], [-9, 5]], [[14, 6.5], [11, 7.5], [9, 5]]]) IK.bolt(ctx, pts, '#ffd98a', 0.9, '#f0a830');
    // Glanzkanten
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,240,200,0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-15.4, 9.5);
    ctx.lineTo(-13.2, 4);
    ctx.lineTo(-7, 2.6);
    ctx.moveTo(-5.6, 5.6);
    ctx.lineTo(5.6, 5.6);
    ctx.stroke();
    ctx.restore();
    IK.sparkles(ctx, 5, '#fff0c0', 4, 17, 0, -2, 1.1);
  },

  // Schwerkraftsiegel: ▽-Bernsteinsiegel, drei Felsbrocken kreisen spiralförmig zur Mitte
  schwerkraft(ctx, IK) {
    const cy = 3;
    // dunkler Sog in der Mitte
    ctx.fillStyle = IK.rad(ctx, 0, cy, 0, 16, [[0, 'rgba(10,4,2,0.85)'], [0.6, 'rgba(30,14,4,0.4)'], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath();
    ctx.ellipse(0, cy, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ikMag2Sigil(ctx, IK, 0, cy, 18, 9, '#ffd98a', '#f0a830', false);
    // Spiralarme nach innen (flach, in Perspektive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      const steps = 30;
      for (let i = 0; i < steps; i++) {
        const p = (t) => {
          const a = arm * Math.PI * 2 / 3 + t * Math.PI * 1.3;
          const r = 17 - t * 15;
          return [Math.cos(a) * r, cy + Math.sin(a) * r * 0.5];
        };
        const t0 = i / steps;
        const [x0, y0] = p(t0);
        const [x1, y1] = p(t0 + 1 / steps);
        ctx.globalAlpha = 0.25 + 0.7 * (1 - t0);
        ctx.strokeStyle = '#ffd98a';
        ctx.lineWidth = 3.2 * (1 - t0 * 0.7);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
    ctx.restore();
    // drei Felsbrocken, schwebend über der Spirale
    const rocks = [[0.25, 14, 6, 2], [2.35, 13.5, 5, 6], [4.3, 9, 4, 11]];
    rocks.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
    for (const [a, r, size, seed] of rocks) {
      const x = Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.5 - 4;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y + 4 + size * 0.2, size * 0.9, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      IK.glow(ctx, '#f0a830', 4, () => ikMag2Stone(ctx, IK, x, y, size, seed, 2));
    }
    // Kern
    IK.light(ctx, 0, cy, 7, '#ffd98a', 0.9);
    IK.glow(ctx, '#ffd98a', 5, () => IK.fill(ctx, (c) => c.arc(0, cy, 1.8, 0, Math.PI * 2), '#fff0c0', 0));
  },

  // Weltenbruch (Ultimate): acht Basaltmonolithen brechen im Kreis aus dem Boden und kippen nach innen
  weltenbruch(ctx, IK) {
    const cy = 7;
    const rx = 15.5;
    const ry = 8;
    // Bernsteinrisse zum Mittelpunkt
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      IK.bolt(ctx, IK.zigzag(0, cy, Math.cos(a) * rx, cy + Math.sin(a) * ry, 3, 1, i + 4), '#ffd98a', 0.8, '#f0a830');
    }
    IK.shock(ctx, 0, cy, rx + 2, ry + 1.4, '#f0a830', 1.2);
    // Lichtausbruch in der Mitte
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, 0, cy, 0, -16, [[0, 'rgba(255,217,138,0.8)'], [1, 'rgba(240,168,48,0)']]);
    ctx.beginPath();
    ctx.moveTo(-6, cy);
    ctx.lineTo(-3, -16);
    ctx.lineTo(3, -16);
    ctx.lineTo(6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    IK.light(ctx, 0, cy - 1, 11, '#ffd98a', 0.9);
    // Monolithen: hinten zuerst; vorn größer, seitliche kippen deutlich zur Mitte
    const mono = [];
    for (let i = 0; i < 8; i++) mono.push((i / 8) * Math.PI * 2 - Math.PI / 2);
    mono.sort((p, q) => Math.sin(p) - Math.sin(q));
    for (const a of mono) {
      const x = Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      const depth = (Math.sin(a) + 1) / 2;
      const h = 9.5 + (1 - depth) * 6;
      const w = 4 + depth * 2.8;
      const tilt = -Math.cos(a) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      // Steinplatte mit schräg abgebrochener Kante
      IK.fill(ctx, (c) => { c.moveTo(-w / 2, 0.6); c.lineTo(-w / 2 + 0.3, -h * 0.9); c.lineTo(w * 0.15, -h); c.lineTo(w / 2, -h * 0.82); c.lineTo(w / 2, 0.6); c.closePath(); },
        IK.lin(ctx, -w / 2, -h, w / 2, 0, [[0, '#8a7e74'], [0.35, '#4e4440'], [0.55, '#2a2220'], [1, '#100c0a']]), 1, 'rgba(8,4,2,0.95)');
      // helle Oberkante
      ctx.strokeStyle = 'rgba(255,240,210,0.55)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 0.4, -h * 0.9);
      ctx.lineTo(w * 0.15, -h);
      ctx.stroke();
      IK.bolt(ctx, IK.zigzag(w * 0.05, -h * 0.08, -w * 0.05, -h * 0.82, 4, w * 0.1, Math.round(a * 10) + 20), '#ffd98a', 0.5 + depth * 0.4, '#f0a830');
      ctx.restore();
      // Staub am Fuß
      IK.light(ctx, x, y, 3 + depth * 2, '#ffd98a', 0.5);
    }
    IK.sparkles(ctx, 6, '#ffd98a', 11, 18, 0, -4, 1.1);
  }
});
