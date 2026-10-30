// Magier (seit 8.6): gemalte Symbole der 20 Fertigkeiten und 4 Ultimates, dazu das Aussehen der Buffs in 2D.
// Gezeichnet wie alle Symbole auf einer Fläche von -24 bis 24 (siehe fertigkeiten.js). Die Elementfarben
// stammen aus MAGE_EL; Abgrenzung zum Schamanen: Dreiecke, flache Bodenwirkungen, nichts fällt vom Himmel.

// --- Bausteine ---------------------------------------------------------------------------------

// Wie iconShape, aber der Verlauf spannt sich über die Form selbst (y0 bis y1) statt über das ganze Symbol
function mageIconFill(ctx, path, top, bottom, y0, y1, line = 2) {
  path();
  ctx.lineJoin = 'round';
  ctx.lineWidth = line;
  ctx.strokeStyle = '#120c08';
  ctx.stroke();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fill();
}

// Flammenzunge, Spitze zeigt in Richtung ang (0 = nach oben)
function mageIconFlame(ctx, x, y, s, top, bottom, ang = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  mageIconFill(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.bezierCurveTo(2, -5, 5, -2, 4, 2);
    ctx.bezierCurveTo(3.4, 5, 1.6, 6, 0, 6);
    ctx.bezierCurveTo(-1.6, 6, -3.4, 5, -4, 2);
    ctx.bezierCurveTo(-5, -2, -2, -5, 0, -9);
    ctx.closePath();
  }, top, bottom, -6, 6, 1.6 / s);
  ctx.restore();
}

// Flammenwand auf einem flachen Bodenring: gezackte Zungen, lean > 0 neigt sie nach außen, < 0 zur Mitte.
// Erst die hintere Hälfte, dann der Ring, dann die vordere – so wirkt der Ring flach am Boden.
function mageIconFlameRing(ctx, cx, cy, rx, ry, n, h, lean, outer, inner, ring = '#a0102e') {
  const flame = (a, back) => {
    const da = Math.PI / n * 0.95;
    const x0 = cx + Math.cos(a - da) * rx;
    const y0 = cy + Math.sin(a - da) * ry;
    const x1 = cx + Math.cos(a + da) * rx;
    const y1 = cy + Math.sin(a + da) * ry;
    const mx = cx + Math.cos(a) * rx;
    const my = cy + Math.sin(a) * ry;
    const hh = h * (back ? 0.75 : 1) * (0.85 + 0.3 * Math.abs(Math.sin(a * 3.7)));
    const tx = mx + Math.cos(a) * lean * hh;
    const ty = my - hh;
    mageIconFill(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + (tx - x0) * 0.3, y0 - hh * 0.5, (x0 + tx) / 2 - 0.6, ty + hh * 0.35);
      ctx.lineTo(tx, ty);
      ctx.quadraticCurveTo(x1 + (tx - x1) * 0.2, y1 - hh * 0.55, x1, y1);
      ctx.closePath();
    }, back ? inner : outer, ring, ty, my, 1.3);
  };
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + 0.2;
    if (Math.sin(a) < 0) flame(a, true);
  }
  mageIconRing(ctx, cx, cy, rx, ry, ring, 2.2);
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + 0.2;
    if (Math.sin(a) >= 0) flame(a, false);
  }
}

// Flacher Bodenring (Ellipse) mit dunkler Kontur
function mageIconRing(ctx, x, y, rx, ry, color, w = 2.4) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#120c08';
  ctx.lineWidth = w + 2.4;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function mageIconHex(ctx, x, y, r, sy = 1, rot = 0) {
  return () => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = rot + k * Math.PI / 3;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * sy;
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
}

// Gezackter Blitz mit dunkler Kontur, violettem Saum und weißem Kern
function mageIconBolt(ctx, pts, edge = '#8a5aff', core = '#fff7b0', w = 2.4) {
  iconLine(ctx, edge, w + 2, pts);
  iconLine(ctx, core, w, pts);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.8, w * 0.35);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

// Basaltbrocken: unregelmäßiges Vieleck mit Bernsteinader
function mageIconRock(ctx, x, y, r, seed = 0, vein = true) {
  const pts = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + seed;
    const rr = r * (0.78 + 0.22 * Math.abs(Math.sin(seed * 3.1 + k * 1.9)));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]);
  }
  iconShape(ctx, () => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
  }, '#6a5e58', '#2a2220', Math.max(1.2, r * 0.22));
  if (vein) iconLine(ctx, '#f0a830', Math.max(0.8, r * 0.18), [[x - r * 0.5, y - r * 0.1], [x - r * 0.05, y + r * 0.15], [x + r * 0.45, y - r * 0.2]]);
}

// Kleine Magierfigur: Spitzhut und lange Robe (Silhouette); face: mit Gesicht unter der Krempe
function mageIconFigure(ctx, x, y, s, top, bottom, face = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  iconShape(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-1, -19);
    ctx.lineTo(3.5, -9);
    ctx.lineTo(7, -8.5);
    ctx.lineTo(3, -7);
    ctx.lineTo(4, -3);
    ctx.lineTo(7, 10);
    ctx.lineTo(-7, 10);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-3, -7);
    ctx.lineTo(-7, -8.5);
    ctx.lineTo(-3.5, -9);
    ctx.closePath();
  }, top, bottom, 1.8 / s);
  if (face) iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -5.3, 2.6, 2, 0, 0, Math.PI * 2); }, '#f6dcc0', '#c8a080', 0.8 / s);
  ctx.restore();
}

// Gegnersilhouette (Kopf und Rumpf)
function mageIconFoe(ctx, x, y, s = 1, top = '#5a5048', bottom = '#2a2220') {
  iconShape(ctx, () => {
    ctx.beginPath();
    ctx.arc(x, y - 6 * s, 3.4 * s, 0, Math.PI * 2);
    ctx.moveTo(x - 4.2 * s, y - 1.5 * s);
    ctx.lineTo(x + 4.2 * s, y - 1.5 * s);
    ctx.lineTo(x + 3 * s, y + 7 * s);
    ctx.lineTo(x - 3 * s, y + 7 * s);
    ctx.closePath();
  }, top, bottom, 1.5);
}

// Dreieckssiegel am Boden (flach gedrückt), mit Leuchten
function mageIconSigil(ctx, x, y, r, el, alpha = 1) {
  const E = MAGE_EL[el];
  ctx.save();
  ctx.globalAlpha *= alpha;
  glow(ctx, x, y, r * 1.5, E.main, 0.5);
  ctx.translate(x, y);
  ctx.scale(1, 0.42);
  ctx.strokeStyle = '#120c08';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = E.hi;
  ctx.lineWidth = 2;
  ctx.stroke();
  mageGlyph2D(ctx, 0, 0, r * 0.82, E.glyph, '#120c08', 4.5);
  mageGlyph2D(ctx, 0, 0, r * 0.82, E.glyph, E.core, 2);
  ctx.restore();
}

// --- Symbole -----------------------------------------------------------------------------------

Object.assign(SKILL_ICONS, {
  // Feuer: flacher Flammenring läuft am Boden nach außen, in der Mitte Stiefel auf dem △-Siegel
  feuernova(ctx) {
    glow(ctx, 0, 8, 22, '#e8362a', 0.45);
    mageIconSigil(ctx, 0, 9, 7.5, 'feuer');
    for (const x of [-3.2, 3.2]) mageIconFill(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 2.1, 1, 4.2, 7, 1.6); }, '#5a4a6a', '#22202c', 1, 8, 1.4);
    mageIconFlameRing(ctx, 0, 8, 17, 8.5, 12, 9, 0.8, '#fff1c8', '#ff8a4a');
  },
  // Feuerball mit zwei Siegelringen fliegt nach rechts oben
  feuerball(ctx) {
    for (const [x, y, r] of [[-15, 14, 2], [-11, 10, 2.6], [-7, 6, 3.2]]) iconShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }, '#ff8a4a', '#a0102e', 1.2);
    glow(ctx, 4, -4, 18, '#ff8a4a', 0.7);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(4, -4, 9, 0, Math.PI * 2); }, '#fff1c8', '#e8362a', 2.5);
    ctx.lineCap = 'round';
    for (const [rx, ry, a, c] of [[14, 5, -0.7, '#fff1c8'], [12, 4, 0.9, '#ff8a4a']]) {
      ctx.save();
      ctx.translate(4, -4);
      ctx.rotate(a);
      ctx.strokeStyle = '#120c08';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(1.5, -6.5, 2.6, 0, Math.PI * 2); }, '#ffffff', '#fff1c8', 1);
  },
  // Silhouette in der Stichflamme, brennende Fußspuren führen weg
  flammenschritt(ctx) {
    for (const [x, y] of [[6, 14], [11, 10], [15, 15], [19, 11]]) {
      glow(ctx, x, y, 5, '#ff8a4a', 0.6);
      iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, 2.4, 1.4, -0.3, 0, Math.PI * 2); }, '#ff8a4a', '#a0102e', 1.2);
    }
    glow(ctx, -6, -2, 20, '#e8362a', 0.6);
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-6, -22);
      ctx.bezierCurveTo(2, -12, 6, -2, 5, 8);
      ctx.bezierCurveTo(4, 15, -16, 15, -17, 8);
      ctx.bezierCurveTo(-18, -2, -12, -10, -6, -22);
      ctx.closePath();
    }, '#fff1c8', '#e8362a', 2.5);
    mageIconFigure(ctx, -6, 0, 0.75, '#3a0e0e', '#120606');
  },
  // Glutkristall schwebt über der offenen Hand
  glutherz(ctx) {
    glow(ctx, 0, -6, 20, '#ff8a4a', 0.8);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(7, -7); ctx.lineTo(0, 4); ctx.lineTo(-7, -7); ctx.closePath(); }, '#fff1c8', '#e8362a', 2.2);
    iconLine(ctx, '#ffffff', 1.2, [[-3, -9], [0, -16]]);
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-15, 8);
      ctx.quadraticCurveTo(-12, 18, 0, 18);
      ctx.quadraticCurveTo(12, 18, 15, 8);
      ctx.lineTo(11, 9);
      ctx.quadraticCurveTo(0, 13, -11, 9);
      ctx.closePath();
    }, '#f6dcc0', '#b27a50', 2);
    for (const x of [-9, -4, 2, 8]) iconLine(ctx, '#b27a50', 1, [[x, 9.5], [x + 0.5, 12]]);
  },
  // Siegel am Boden, die Flammenwand am Rand zieht sich zur Mitte
  flammenkreis(ctx) {
    mageIconSigil(ctx, 0, 7, 11, 'feuer');
    mageIconFlameRing(ctx, 0, 7, 19, 10, 11, 10, -0.7, '#fff1c8', '#ff8a4a');
    for (const a of [0.2, 2.9]) {
      const x = Math.cos(a) * 13;
      iconLine(ctx, '#fff1c8', 1.3, [[x * 0.5 + Math.sign(x) * 2.5, 4], [x * 0.5, 6], [x * 0.5 + Math.sign(x) * 2.5, 8]]);
    }
  },

  // Frost: königsblaues Sechseck mit Eisnadeln nach außen
  frostnova(ctx) {
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + Math.PI / 12;
      const r1 = k % 2 ? 20 : 17;
      iconShape(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.12) * 9, 2 + Math.sin(a - 0.12) * 9 * 0.7);
        ctx.lineTo(Math.cos(a) * r1, 2 + Math.sin(a) * r1 * 0.7);
        ctx.lineTo(Math.cos(a + 0.12) * 9, 2 + Math.sin(a + 0.12) * 9 * 0.7);
        ctx.closePath();
      }, '#eafcff', k % 2 ? '#3a7bff' : '#9ff6ff', 1.2);
    }
    glow(ctx, 0, 2, 16, '#3a7bff', 0.6);
    iconShape(ctx, mageIconHex(ctx, 0, 2, 12, 0.7), '#6aa0ff', '#1a3fb0', 2.4);
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, 2 + Math.sin(a) * 6.3);
      ctx.lineTo(-Math.cos(a) * 9, 2 - Math.sin(a) * 6.3);
      ctx.stroke();
    }
    iconShape(ctx, mageIconHex(ctx, 0, 2, 3.4, 0.7), '#ffffff', '#9ff6ff', 1);
  },
  // Eislanze durchbohrt drei Gegner in einer Linie
  frostlanze(ctx) {
    mageIconFoe(ctx, -11, 9, 0.8);
    mageIconFoe(ctx, -1, 3, 0.85);
    mageIconFoe(ctx, 10, -3, 0.9, '#9ff6ff', '#3a7bff');
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-21, 15); ctx.lineTo(13, -9); ctx.lineTo(22, -17); ctx.lineTo(16, -6); ctx.lineTo(-19, 18); ctx.closePath(); }, '#eafcff', '#3a7bff', 2);
    iconLine(ctx, '#ffffff', 1, [[-15, 13], [15, -9]]);
    for (const [x, y, a] of [[14, -1, 0.4], [7, -10, -0.8], [17, -7, 1.6]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(1.6, 0); ctx.lineTo(0, 3); ctx.lineTo(-1.6, 0); ctx.closePath(); }, '#ffffff', '#9ff6ff', 1);
      ctx.restore();
    }
  },
  // Eisstatue bleibt zurück, die Figur gleitet auf einer Frostbahn davon
  eisschritt(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    iconLine(ctx, '#9ff6ff', 3, [[-6, 15], [4, 13], [14, 14], [21, 12]]);
    ctx.restore();
    for (const [x, y] of [[0, 14], [9, 13.5], [17, 13]]) iconShape(ctx, mageIconHex(ctx, x, y, 2, 0.6), '#ffffff', '#9ff6ff', 0.8);
    glow(ctx, -8, -2, 16, '#9ff6ff', 0.5);
    mageIconFigure(ctx, -8, 0, 0.95, '#eafcff', '#3a7bff');
    iconLine(ctx, '#1a3fb0', 1, [[-11, -6], [-7, -1], [-10, 4], [-6, 8]]);
    for (const x of [8, 13, 18]) iconLine(ctx, '#eafcff', 1.6, [[x, -10 + (x - 8) * 0.4], [x + 4, -10 + (x - 8) * 0.4]]);
  },
  // Rumpf mit kreisenden Sechseckplatten
  frostpanzer(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.quadraticCurveTo(0, -12, 14, -6);
      ctx.lineTo(10, 16);
      ctx.lineTo(-10, 16);
      ctx.closePath();
    }, '#2e3a7a', '#121a3c', 2);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, -13, 5.5, 0, Math.PI * 2); }, '#f6dcc0', '#c8a080', 1.6);
    ctx.strokeStyle = 'rgba(159,246,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 19, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, y, s] of [[-17, 2, 4.2], [17, 4, 4.2], [-6, 9, 5], [8, -3, 3.4]]) {
      glow(ctx, x, y, s * 2, '#9ff6ff', 0.4);
      iconShape(ctx, mageIconHex(ctx, x, y, s, 1, Math.PI / 6), '#eafcff', '#3a7bff', 1.4);
    }
  },
  // Kristalle wachsen im Sechseck aus dem ▽-Siegel
  kristallgrab(ctx) {
    mageIconSigil(ctx, 0, 10, 13, 'frost');
    for (const [x, y, h, w] of [[-13, 9, 13, 3], [13, 9, 13, 3], [-7, 6, 18, 3.6], [7, 6, 18, 3.6], [0, 12, 24, 4.6]]) {
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w * 0.8, y - h * 0.75); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.8, y - h * 0.75); ctx.lineTo(x + w, y); ctx.closePath(); }, '#eafcff', '#3a7bff', 1.6);
      iconLine(ctx, '#ffffff', 0.8, [[x - w * 0.3, y - 2], [x - w * 0.2, y - h * 0.7]]);
    }
  },

  // Blitz: Bodenblitze kriechen von der Figur nach außen
  blitznova(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#8a5aff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 8, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (const [x1, y1, s] of [[-20, 6, 1], [-14, 15, 2], [0, 18, 3], [14, 15, 4], [20, 6, 5], [12, 1, 6], [-12, 1, 7]]) {
      const pts = [[0, 8]];
      for (let k = 1; k < 4; k++) {
        const f = k / 4;
        const r = Math.sin(s * 12.9898 + k * 78.233) * 43758.5453;
        const off = (r - Math.floor(r) - 0.5) * 5;
        pts.push([x1 * f + off * 0.4, 8 + (y1 - 8) * f + off]);
      }
      pts.push([x1, y1]);
      mageIconBolt(ctx, pts, '#8a5aff', '#ffe94a', 1.6);
    }
    glow(ctx, 0, 0, 12, '#fff7b0', 0.7);
    mageIconFigure(ctx, 0, -3, 0.75, '#3a4a9a', '#121a3c', true);
  },
  // Zickzack über drei Gegner
  kettenblitz(ctx) {
    const pts = [[-16, 10], [-3, -6], [14, 4]];
    mageIconBolt(ctx, [[-22, 20], [-19, 15], [-16, 10]], '#8a5aff', '#ffe94a', 2);
    mageIconBolt(ctx, [[-16, 10], [-12, 4], [-8, 3], [-3, -6]], '#8a5aff', '#ffe94a', 2.4);
    mageIconBolt(ctx, [[-3, -6], [3, -3], [6, 2], [14, 4]], '#8a5aff', '#ffe94a', 2);
    for (const [x, y] of pts) {
      glow(ctx, x, y, 9, '#fff7b0', 0.8);
      iconShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); }, '#ffffff', '#ffe94a', 1.6);
      iconShape(ctx, () => { ctx.beginPath(); ctx.arc(x + 4.5, y - 3, 1.8, 0, Math.PI * 2); }, '#c8a8ff', '#8a5aff', 1);
    }
  },
  // Die Figur wird zum waagrechten Blitz
  blitzschritt(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    mageIconFigure(ctx, -12, 2, 0.85, '#fff7b0', '#8a5aff');
    ctx.restore();
    iconLine(ctx, '#241a4a', 3, [[-10, 16], [18, 16]]);
    mageIconBolt(ctx, [[-14, 2], [-6, -3], [0, 3], [6, -2], [12, 2], [20, -1]], '#8a5aff', '#ffe94a', 3.2);
    glow(ctx, 19, 0, 10, '#fff7b0', 0.9);
    for (const y of [-8, 8]) iconLine(ctx, '#fff7b0', 1.2, [[-2, y], [8, y]]);
  },
  // Knisternder Robensaum
  ladung(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-7, -16);
      ctx.lineTo(7, -16);
      ctx.lineTo(15, 12);
      ctx.quadraticCurveTo(0, 16, -15, 12);
      ctx.closePath();
    }, '#3b2c72', '#1a1440', 2);
    iconLine(ctx, '#d8e0f0', 1.4, [[-14.5, 11], [0, 14.6], [14.5, 11]]);
    iconLine(ctx, '#d8e0f0', 1, [[-2, -16], [-3, 12]]);
    for (const [x0, y0, x1, y1, s] of [[-16, 9, -20, -2, 1], [16, 9, 21, -1, 2], [-6, 14, -8, 21, 3], [8, 14, 11, 21, 4], [-9, -6, -17, -12, 5], [9, -6, 17, -13, 6]]) {
      ctx.strokeStyle = '#8a5aff';
      ctx.lineWidth = 3;
      zigzag(ctx, x0, y0, x1, y1, s, 3);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      zigzag(ctx, x0, y0, x1, y1, s, 3);
      glow(ctx, x1, y1, 5, '#fff7b0', 0.8);
    }
  },
  // Kugel über dem Siegel mit drei waagrechten Bögen
  kugelblitz(ctx) {
    mageIconSigil(ctx, 0, 13, 11, 'blitz');
    mageIconBolt(ctx, [[-4, -4], [-10, -1], [-14, -5], [-21, 0]], '#8a5aff', '#ffe94a', 1.8);
    mageIconBolt(ctx, [[4, -4], [10, -7], [14, -2], [21, -6]], '#8a5aff', '#ffe94a', 1.8);
    mageIconBolt(ctx, [[2, 2], [6, 6], [12, 4], [17, 8]], '#8a5aff', '#ffe94a', 1.6);
    glow(ctx, 0, -5, 16, '#ffe94a', 0.8);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, -5, 7.5, 0, Math.PI * 2); }, '#ffffff', '#ffe94a', 2.2);
    ctx.strokeStyle = '#8a5aff';
    ctx.lineWidth = 1;
    zigzag(ctx, -5, -6, 5, -4, 3, 2);
  },

  // Erde: Basaltsplitter fliegen waagrecht nach außen, Bernsteinrisse am Boden
  erdnova(ctx) {
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + 0.25;
      iconLine(ctx, '#f0a830', 1.4, [[Math.cos(a) * 4, 7 + Math.sin(a) * 2], [Math.cos(a) * 9, 7 + Math.sin(a) * 4.5 + 1], [Math.cos(a) * 13, 7 + Math.sin(a) * 6]]);
    }
    glow(ctx, 0, 6, 14, '#f0a830', 0.8);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 - 0.3;
      const x = Math.cos(a) * 16;
      const y = 4 + Math.sin(a) * 10;
      iconLine(ctx, '#ffd98a', 1.2, [[x * 0.55, y * 0.55 + 2], [x * 0.8, y * 0.8 + 1]]);
      mageIconRock(ctx, x, y, 4 + (k % 2), k);
    }
  },
  // Basaltbrocken mit glühendem Bernsteinkern
  steingeschoss(ctx) {
    for (const y of [-8, 0, 8]) iconLine(ctx, '#ffd98a', 1.4, [[-20, y + 4], [-11, y + 2]]);
    glow(ctx, 3, 0, 18, '#f0a830', 0.55);
    mageIconRock(ctx, 3, 0, 13, 0.4, false);
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(2, -6);
      ctx.lineTo(9, -3);
      ctx.lineTo(7, 4);
      ctx.lineTo(0, 5);
      ctx.closePath();
    }, '#fff0c0', '#f0a830', 1.4);
    iconLine(ctx, '#f0a830', 1.2, [[-6, -8], [-1, -4]]);
    iconLine(ctx, '#f0a830', 1.2, [[8, 4], [12, 9]]);
  },
  // Die Figur steigt aus einem glühenden Bernsteinriss
  erdsprung(ctx) {
    glow(ctx, 0, 10, 18, '#f0a830', 0.7);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(-9, 8); ctx.lineTo(-4, 11); ctx.lineTo(4, 7); ctx.lineTo(10, 11); ctx.lineTo(20, 9); ctx.lineTo(10, 14); ctx.lineTo(3, 12); ctx.lineTo(-5, 16); ctx.lineTo(-10, 13); ctx.closePath(); }, '#ffd98a', '#f0a830', 1.6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-24, -24, 48, 34);
    ctx.clip();
    mageIconFigure(ctx, 0, 2, 0.95, '#3a4a9a', '#121a3c', true);
    ctx.restore();
    for (const [x, y, r, s] of [[-14, -6, 3, 1], [13, -10, 2.6, 2], [16, 1, 2.2, 3], [-17, 3, 2, 4]]) mageIconRock(ctx, x, y, r, s, false);
  },
  // Schulter und Brust mit Basaltplatten und Bernsteinadern
  basalthaut(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-15, -2);
      ctx.quadraticCurveTo(0, -10, 15, -2);
      ctx.lineTo(11, 18);
      ctx.lineTo(-11, 18);
      ctx.closePath();
    }, '#2e3a7a', '#121a3c', 2);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, -11, 5.5, 0, Math.PI * 2); }, '#f6dcc0', '#c8a080', 1.6);
    for (const [x, y, r, s] of [[-12, -2, 7, 1], [12, -2, 7, 2], [0, 8, 7.5, 3]]) mageIconRock(ctx, x, y, r, s, true);
    glow(ctx, 0, 8, 10, '#f0a830', 0.4);
  },
  // Bernsteinspirale zieht drei Felsen zur Mitte
  schwerkraft(ctx) {
    mageIconSigil(ctx, 0, 8, 14, 'erde', 0.8);
    ctx.lineCap = 'round';
    for (const [c, wdt] of [['#120c08', 4.5], ['#f0a830', 2]]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = wdt;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = k / 40 * Math.PI * 3.2;
        const r = 2 + k * 0.42;
        const x = Math.cos(a) * r;
        const y = 2 + Math.sin(a) * r * 0.75;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    for (const [a, r, s] of [[0.6, 15, 4.6], [2.7, 13, 4], [4.6, 10, 3.6]]) mageIconRock(ctx, Math.cos(a) * r, 2 + Math.sin(a) * r * 0.75, s, a, true);
    glow(ctx, 0, 2, 7, '#ffd98a', 0.9);
  },

  // Ultimates
  // Inferno: drei Flammenringe rollen nacheinander nach außen
  inferno(ctx) {
    glow(ctx, 0, 8, 22, '#e8362a', 0.5);
    mageIconFlameRing(ctx, 0, 9, 21, 10, 14, 6, 0.9, '#ff8a4a', '#a0102e', '#5a0a1a');
    mageIconFlameRing(ctx, 0, 8, 13.5, 6.5, 10, 8, 0.8, '#fff1c8', '#ff8a4a');
    mageIconFlameRing(ctx, 0, 7, 6, 3, 6, 9, 0.6, '#ffffff', '#fff1c8', '#e8362a');
  },
  // Eiszeit: Gletscherplatte, darauf ein Gegner im Eisblock
  eiszeit(ctx) {
    iconShape(ctx, mageIconHex(ctx, 0, 9, 21, 0.45), '#9fd0ff', '#1a3fb0', 2);
    for (const [x, h] of [[-15, 9], [15, 9], [-9, 6], [10, 6]]) iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 2.4, 9); ctx.lineTo(x, 9 - h); ctx.lineTo(x + 2.4, 9); ctx.closePath(); }, '#eafcff', '#3a7bff', 1.2);
    mageIconFoe(ctx, 0, 2, 1.05);
    ctx.save();
    ctx.globalAlpha = 0.7;
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(9, -11); ctx.lineTo(9, 7); ctx.lineTo(0, 12); ctx.lineTo(-9, 7); ctx.lineTo(-9, -11); ctx.closePath(); }, 'rgba(234,252,255,0.75)', 'rgba(58,123,255,0.55)', 1.8);
    ctx.restore();
    iconLine(ctx, '#ffffff', 1.2, [[-6, -9], [-6, 1]]);
    iconLine(ctx, '#ffffff', 1, [[-3, -11], [-3, -6]]);
  },
  // Donnerkrone: Krone aus Blitzzacken über dem Kopf
  donnerkrone(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 10, 9, Math.PI, 0); ctx.lineTo(9, 20); ctx.lineTo(-9, 20); ctx.closePath(); }, '#2e3a7a', '#121a3c', 2);
    glow(ctx, 0, -6, 18, '#ffe94a', 0.6);
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -1, 13, 4, 0, 0, Math.PI * 2); }, '#fff7b0', '#ffe94a', 2);
    for (const [x, h, s] of [[-11, 10, 1], [-5.5, 15, 2], [0, 18, 3], [5.5, 15, 4], [11, 10, 5]]) {
      mageIconBolt(ctx, [[x, -2], [x - 2, -2 - h * 0.4], [x + 1.5, -2 - h * 0.6], [x, -2 - h]], '#8a5aff', '#ffe94a', 1.8);
    }
    mageIconBolt(ctx, [[13, -1], [17, 2], [16, 6], [22, 9]], '#8a5aff', '#ffe94a', 1.4);
    mageIconBolt(ctx, [[-13, -1], [-17, 3], [-16, 6], [-22, 10]], '#8a5aff', '#ffe94a', 1.4);
  },
  // Weltenbruch: Ring aus Basaltmonolithen kippt nach innen
  weltenbruch(ctx) {
    glow(ctx, 0, 8, 16, '#f0a830', 0.8);
    iconLine(ctx, '#f0a830', 1.6, [[-10, 9], [-3, 6], [3, 10], [10, 7]]);
    const mono = [];
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.2;
      mono.push([Math.cos(a) * 17, 8 + Math.sin(a) * 8, a]);
    }
    mono.sort((p, q) => p[1] - q[1]);
    for (const [x, y, a] of mono) {
      const lean = -Math.cos(a) * 0.35;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean);
      const h = 15 + Math.sin(a) * 3;
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-3.6, 0); ctx.lineTo(-3, -h); ctx.lineTo(0, -h - 3); ctx.lineTo(3, -h); ctx.lineTo(3.6, 0); ctx.closePath(); }, '#6a5e58', '#2a2220', 1.6);
      iconLine(ctx, '#f0a830', 1, [[-1, -3], [1, -h * 0.5], [-0.5, -h + 2]]);
      ctx.restore();
    }
  }
});

// --- Buffs in 2D ------------------------------------------------------------------------------
// In 3D baut magier.js eigene Auren (SKILL_FX[id].aura); diese Bilder malen deshalb nur ohne 3D,
// damit nichts doppelt erscheint. Die Ultimate-Buffs (Donnerkrone, Steinhaut) haben keine 3D-Aura.

// Freie Hand der Figur in Weltkoordinaten (für Glutherz)
function mageFreeHand(p, fy) {
  const dir = facingDir(p.facing || { x: 0, y: 1 });
  const flip = dir === 'side' && p.facing.x < 0;
  const h = handPosition(dir, 0, 'left');
  return { x: p.x + (flip ? -h.x : dir === 'side' ? h.x - 4 : h.x), y: fy + h.y - (p.riding ? RIDE_HEIGHT : 0) };
}

Object.assign(BUFF_LOOKS, {
  // Glutherz: ein glühender Kern schwebt über der freien Hand, Funken steigen auf
  glutherz(ctx, p, fy, t, layer) {
    if (layer !== 'front' || V3.on) return;
    const h = mageFreeHand(p, fy);
    const y = h.y - 9 + Math.sin(t * 3) * 1.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, h.x, y, 12, '#e8362a', 0.7);
    glow(ctx, h.x, y, 6, '#fff1c8', 0.95);
    for (let k = 0; k < 2; k++) {
      const u = (t * 1.2 + k / 2) % 1;
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = k ? '#ff8a4a' : '#fff1c8';
      circle(ctx, h.x + Math.sin(t * 4 + k * 3) * 3, y - 3 - u * 14, 1.1);
    }
    ctx.restore();
  },
  // Frostpanzer: vier kleine Sechseckplatten kreisen auf Brusthöhe
  frostpanzer(ctx, p, fy, t, layer) {
    if (V3.on) return;
    ctx.save();
    for (let k = 0; k < 4; k++) {
      const o = orbit(t, 0.8, 18, k, 4, 0.4);
      if ((layer === 'front') !== o.front) continue;
      const x = p.x + o.x;
      const y = fy - 22 + o.y;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#9ff6ff';
      mageIconHex(ctx, x, y, 4.2, 1, t * 0.5 + k)();
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#3a7bff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  },
  // Statische Ladung: weiße Zacken knistern am Umriss der Robe
  ladung(ctx, p, fy, t, layer) {
    if (layer !== 'front' || V3.on) return;
    const seed = Math.floor(t * 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const r = Math.sin(seed * 7.13 + k * 3.7) * 43758.5453;
      const u = r - Math.floor(r);
      const sx = (u < 0.5 ? -1 : 1) * (8 + u * 6);
      const sy = fy - 4 - ((u * 7) % 1) * 26;
      ctx.strokeStyle = 'rgba(138,90,255,0.7)';
      ctx.lineWidth = 2.6;
      zigzag(ctx, p.x + sx, sy, p.x + sx * 1.5, sy - 6, seed + k, 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1;
      zigzag(ctx, p.x + sx, sy, p.x + sx * 1.5, sy - 6, seed + k, 3);
    }
    ctx.restore();
  },
  // Basalthaut: dunkle Platten mit Bernsteinadern an Schultern und Brust
  basalthaut(ctx, p, fy, t, layer) {
    if (layer !== 'front' || V3.on) return;
    const dir = facingDir(p.facing || { x: 0, y: 1 });
    const pts = dir === 'side' ? [[0, -22, 4.5]] : [[-10, -24, 4.2], [10, -24, 4.2], [0, -16, 4.8]];
    ctx.save();
    for (const [dx, dy, r] of pts) {
      const x = p.x + dx;
      const y = fy + dy - (p.riding ? RIDE_HEIGHT : 0);
      ctx.fillStyle = '#3e3532';
      ctx.strokeStyle = '#120c08';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + 0.3;
        const rr = r * (k % 2 ? 0.85 : 1);
        if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7);
        else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f0a830';
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3 + dx);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y);
      ctx.lineTo(x, y + r * 0.2);
      ctx.lineTo(x + r * 0.5, y - r * 0.15);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },
  // Donnerkrone (Ultimate-Buff): kleine Blitzzacken kreisen über dem Kopf
  donnerkrone(ctx, p, fy, t, layer) {
    if (layer !== 'front') return;
    const y = fy - 60 - (p.riding ? RIDE_HEIGHT : 0);
    const seed = Math.floor(t * 12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, p.x, y, 14, '#ffe94a', 0.35);
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a = t * 2 + k / 5 * Math.PI * 2;
      const x = p.x + Math.cos(a) * 9;
      const yy = y + Math.sin(a) * 3;
      ctx.strokeStyle = 'rgba(138,90,255,0.7)';
      ctx.lineWidth = 2.2;
      zigzag(ctx, x, yy, x, yy - 7, seed + k, 2);
      ctx.strokeStyle = 'rgba(255,247,176,1)';
      ctx.lineWidth = 1;
      zigzag(ctx, x, yy, x, yy - 7, seed + k, 2);
    }
    ctx.restore();
  },
  // Steinhaut (Ultimate-Buff): bernsteinfarbener Schimmer und Steinsplitter am Boden
  steinhaut(ctx, p, fy, t, layer) {
    if (layer === 'back') {
      glow(ctx, p.x, fy - 18, 26, '#f0a830', 0.2 + 0.06 * Math.sin(t * 3));
      return;
    }
    ctx.save();
    for (let k = 0; k < 4; k++) {
      const o = orbit(t, 0.6, 16, k, 4, 0.35);
      ctx.fillStyle = k % 2 ? '#3e3532' : '#5a4e48';
      ctx.fillRect(p.x + o.x - 1.6, fy - 2 + o.y - 1.4, 3.2, 2.8);
    }
    ctx.restore();
  }
});
