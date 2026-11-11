// --- Vorrats-Symbole (seit 14.60) ---------------------------------------------------------------------------------
// Tränke, Segensschriftrolle, Verstärkungen, Switcher, Sternensteine, Sternen-Switcher, Schriftrolle und Seelensplitter
// im Stil der Ausrüstungssymbole von 14.59: geschliffene Steine mit Facetten, Lichtkante und innerem Glühen,
// Pergament mit Holzstäben und Siegeln, Glasflaschen mit Reflexen und Meniskus. Gezeichnet in Symbol-Einheiten
// (40 × 40, Mitte 0,0) und nur beim Backen (materialIconHiUrl, potionIconUrl, scrollIconUrl, lootIconUrl in
// ausruestung.js, ICON_HI) – nie pro Bild. Licht wie überall von oben links.

const VS_LIGHT = [-0.6, -0.8];

// Farbe einer Facette nach ihrer Richtung (dx, dy) zum Licht: zum Licht hin heller, abgewandt dunkler
function vsShade(col, dx, dy, amt = 0.5) {
  const l = Math.hypot(dx, dy) || 1;
  const d = (dx * VS_LIGHT[0] + dy * VS_LIGHT[1]) / l;
  return d >= 0 ? lighter(col, d * amt) : darker(col, -d * amt);
}
function vsPath(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
function vsFill(ctx, pts, fill) {
  vsPath(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
}
function vsLine(ctx, col, w, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}
// weicher Schein (rgb als 'r, g, b')
function vsGlow(ctx, x, y, r, rgb, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb}, ${a})`);
  g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// Glitzerfunke: vierstrahliger Stern mit hellem Kern
function vsSparkle(ctx, x, y, r, col = '#ffffff', a = 1) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  dot(ctx, x, y, r * 0.22, r * 0.22, '#ffffff');
  ctx.restore();
}
// leuchtende Linie (Glyphe): breiter weicher Schein, farbiger Kern, heller Grat – unabhängig von der Backauflösung
function vsGlowStroke(ctx, path, rgb, core, w) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [k, a] of [[3.4, 0.14], [2.2, 0.26]]) {
    path();
    ctx.strokeStyle = `rgba(${rgb}, ${a})`;
    ctx.lineWidth = w * k;
    ctx.stroke();
  }
  path();
  ctx.strokeStyle = core;
  ctx.lineWidth = w;
  ctx.stroke();
  path();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = w * 0.34;
  ctx.stroke();
  ctx.restore();
}

// Geschliffener Edelstein: Umriss pts, Tafel (Mitte) = Umriss zur Mitte (cx, cy) geschrumpft; dazwischen je Kante drei
// Kronenfacetten, jede nach ihrer Richtung schattiert. o.glow: inneres Glühen (rgb), o.table: Tafelgröße, o.lit: Lichtkante
function vsGem(ctx, pts, cx, cy, col, o = {}) {
  const t = o.table || 0.5;
  const n = pts.length;
  const tab = pts.map(([x, y]) => [cx + (x - cx) * t, cy + (y - cy) * t]);
  vsFill(ctx, pts, darker(col, 0.45));
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ta = tab[i];
    const tb = tab[(i + 1) % n];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const tris = [[a, m, ta], [m, b, tb], [m, tb, ta]];
    tris.forEach((tr, j) => {
      const gx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3 - cx;
      const gy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3 - cy;
      let c = vsShade(col, gx, gy, o.contrast || 0.6);
      if (j === 1) c = darker(c, 0.08);
      if (j === 2) c = lighter(c, 0.1);
      vsFill(ctx, tr, c);
    });
  }
  // Tafel: hell oben links, satt unten rechts
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of tab) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
  g.addColorStop(0, lighter(col, 0.5));
  g.addColorStop(0.5, lighter(col, 0.12));
  g.addColorStop(1, darker(col, 0.12));
  vsFill(ctx, tab, g);
  // inneres Glühen aus der Tiefe
  if (o.glow) {
    ctx.save();
    vsPath(ctx, pts);
    ctx.clip();
    const r = Math.max(maxX - minX, maxY - minY) * 1.1;
    const gg = ctx.createRadialGradient(cx, cy + r * 0.12, 0, cx, cy + r * 0.12, r);
    gg.addColorStop(0, `rgba(${o.glow}, 0.75)`);
    gg.addColorStop(1, `rgba(${o.glow}, 0)`);
    ctx.fillStyle = gg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2.2);
    ctx.restore();
  }
  // Facettenkanten
  ctx.save();
  ctx.lineWidth = 0.32;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tab[i][0], tab[i][1]);
    ctx.moveTo(m[0], m[1]); ctx.lineTo(tab[i][0], tab[i][1]);
    ctx.moveTo(m[0], m[1]); ctx.lineTo(tab[(i + 1) % n][0], tab[(i + 1) % n][1]);
  }
  ctx.stroke();
  vsPath(ctx, tab);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();
  ctx.restore();
  // Umriss und Lichtkante an den Außenkanten oben links
  vsPath(ctx, pts);
  ctx.strokeStyle = darker(col, 0.7);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (o.lit !== false) {
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const mx = (a[0] + b[0]) / 2 - cx;
      const my = (a[1] + b[1]) / 2 - cy;
      const d = (mx * VS_LIGHT[0] + my * VS_LIGHT[1]) / (Math.hypot(mx, my) || 1);
      if (d > 0.15) vsLine(ctx, `rgba(255, 255, 255, ${0.35 + d * 0.5})`, 0.75, [a, b]);
    }
  }
}

// Stern aus Edelstein: zehn Facetten (je Zacke zwei) um einen Mittelgrat, Kern in der Mitte
function vsStarGem(ctx, cx, cy, R, r, col, o = {}) {
  const ring = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5;
    const rr = k % 2 ? r : R;
    ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  vsFill(ctx, ring, darker(col, 0.45));
  for (let i = 0; i < 10; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % 10];
    const tip = i % 2 ? q : p;
    const inner = i % 2 ? p : q;
    // Richtung der Facette: zur Innenecke hin, etwas entlang der Zacke
    const dx = (inner[0] - cx) + (tip[0] - cx) * 0.3;
    const dy = (inner[1] - cy) + (tip[1] - cy) * 0.3;
    vsFill(ctx, [[cx, cy], p, q], vsShade(col, dx, dy, o.contrast || 0.62));
  }
  // Grate: zu den Spitzen hell, zu den Innenecken dunkel
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const p = ring[i];
    vsLine(ctx, i % 2 ? `rgba(0, 0, 0, 0.22)` : 'rgba(255, 255, 255, 0.5)', i % 2 ? 0.35 : 0.45, [[cx, cy], p]);
  }
  ctx.restore();
  vsPath(ctx, ring);
  ctx.strokeStyle = darker(col, 0.7);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Lichtkante an den oberen linken Kanten
  for (let i = 0; i < 10; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 10];
    const mx = (a[0] + b[0]) / 2 - cx;
    const my = (a[1] + b[1]) / 2 - cy;
    const d = (mx * VS_LIGHT[0] + my * VS_LIGHT[1]) / (Math.hypot(mx, my) || 1);
    if (d > 0.1) vsLine(ctx, `rgba(255, 255, 255, ${0.3 + d * 0.5})`, 0.65, [a, b]);
  }
  // leuchtender Kern
  const g = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, r * 1.15);
  g.addColorStop(0, 'rgba(255, 255, 245, 0.95)');
  g.addColorStop(0.45, `rgba(${o.core || '255, 236, 160'}, 0.6)`);
  g.addColorStop(1, `rgba(${o.core || '255, 236, 160'}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
  ctx.fill();
}

// Metallfassung (Krappen) an den Ecken eines Steins
function vsProng(ctx, x, y, cx, cy, metal, s = 1) {
  const dx = x - cx;
  const dy = y - cy;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const px = x - ux * 0.9 * s;
  const py = y - uy * 0.9 * s;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.beginPath();
  ctx.moveTo(2 * s, -1.7 * s);
  ctx.quadraticCurveTo(-1.4 * s, -1.5 * s, -2 * s, 0);
  ctx.quadraticCurveTo(-1.4 * s, 1.5 * s, 2 * s, 1.7 * s);
  ctx.closePath();
  const g = ctx.createLinearGradient(-2, -2, 2, 2);
  g.addColorStop(0, lighter(metal, 0.55));
  g.addColorStop(0.5, metal);
  g.addColorStop(1, darker(metal, 0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = darker(metal, 0.6);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
  dot(ctx, px - ux * 0.6 * s - 0.4, py - uy * 0.6 * s - 0.4, 0.55 * s, 0.55 * s, 'rgba(255, 255, 255, 0.85)');
}

// Fassung als Ring um einen Stein (Umriss pts um f vergrößert)
function vsBezel(ctx, pts, cx, cy, f, metal) {
  const big = pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
  const g = ctx.createLinearGradient(cx - 14, cy - 14, cx + 14, cy + 14);
  g.addColorStop(0, lighter(metal, 0.5));
  g.addColorStop(0.45, metal);
  g.addColorStop(1, darker(metal, 0.5));
  vsFill(ctx, big, g);
  vsPath(ctx, big);
  ctx.strokeStyle = darker(metal, 0.65);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  return big;
}

const VS_PENTA = [[0, -15], [13, -4.5], [8.5, 13], [-8.5, 13], [-13, -4.5]];

// Verstärkung: Saphir im Fünfeckschliff in einer Silberfassung mit Krappen, ein leuchtendes Plus in der Tafel
function vsBoniPlus(ctx) {
  vsGlow(ctx, 0, 0, 20, '90, 160, 255', 0.38);
  const cx = 0, cy = 0.6;
  vsBezel(ctx, VS_PENTA, cx, cy, 1.12, '#b8c4d4');
  vsGem(ctx, VS_PENTA, cx, cy, '#2f6fd8', { glow: '120, 200, 255', table: 0.5 });
  for (const [x, y] of VS_PENTA) vsProng(ctx, x * 1.08, y * 1.08, cx, cy, '#d8e0ea', 1);
  // Plus als leuchtende Glyphe
  const plus = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5.4); ctx.lineTo(cx, cy + 5.4);
    ctx.moveTo(cx - 5.4, cy); ctx.lineTo(cx + 5.4, cy);
  };
  vsGlowStroke(ctx, plus, '170, 230, 255', '#f4fbff', 2.5);
  vsSparkle(ctx, -6.5, -8, 2.6);
  vsSparkle(ctx, 9.5, 8.5, 1.5, '#cfe8ff', 0.85);
}

// Seltene Verstärkung: Amethyst, größer, in einer Goldfassung mit Filigran und drei kleinen Steinen; ein glühender
// Kern statt des Plus
function vsBoni5(ctx) {
  vsGlow(ctx, 0, 0, 20, '190, 120, 255', 0.45);
  const pts = VS_PENTA.map(([x, y]) => [x * 1.06, y * 1.04]);
  const cx = 0, cy = 0.6;
  const big = vsBezel(ctx, pts, cx, cy, 1.16, '#d8a838');
  // Filigran: Perlen auf dem Goldrand
  for (let i = 0; i < big.length; i++) {
    const a = big[i];
    const b = big[(i + 1) % big.length];
    for (const t of [0.33, 0.67]) dot(ctx, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.75, 0.75, '#fff0b8');
  }
  vsGem(ctx, pts, cx, cy, '#8a3ad0', { glow: '235, 160, 255', table: 0.52 });
  for (const [x, y] of pts) vsProng(ctx, x * 1.07, y * 1.07, cx, cy, '#f0c050', 1.05);
  // glühender Kern
  vsGlow(ctx, cx, cy + 0.6, 7.5, '255, 225, 250', 0.7);
  oval(ctx, cx, cy + 0.6, 2.9, 2.9, '#ffe6ff');
  dot(ctx, cx - 0.9, cy - 0.3, 1.1, 1.1, '#ffffff');
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 220, 255, 0.7)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.arc(cx, cy + 0.6, 4.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // kleine Begleitsteine unten an der Fassung
  for (const [x, y, c] of [[-7.5, 15.4, '#5ec8ff'], [0, 16.6, '#ff6aa8'], [7.5, 15.4, '#5ec8ff']]) {
    oval(ctx, x, y, 1.7, 1.5, c);
    dot(ctx, x - 0.5, y - 0.5, 0.55, 0.5, '#ffffff');
  }
  vsSparkle(ctx, -7.5, -9, 2.8);
  vsSparkle(ctx, 11, -11, 1.8, '#f4d8ff', 0.9);
}

// Sternenstein: goldener Edelstein-Stern mit Facetten, Glanz und Glitzerfunken
function vsStar(ctx) {
  vsGlow(ctx, 0, 1, 20, '255, 210, 90', 0.5);
  vsStarGem(ctx, 0, 1.4, 16.5, 7, '#f2b42a');
  vsSparkle(ctx, -9, -9, 3.2);
  vsSparkle(ctx, 11, -4.5, 2, '#fff4c0');
  vsSparkle(ctx, 7.5, 13.5, 1.6, '#fff4c0', 0.9);
  vsSparkle(ctx, -12, 10, 1.3, '#ffffff', 0.8);
}

// Pergament mit leichtem Verlauf, Altersflecken und Schriftzeilen
function vsParchment(ctx, path, x0, y0, x1, y1) {
  path();
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fbf2d8');
  g.addColorStop(0.55, '#ecdcae');
  g.addColorStop(1, '#cdb37a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  for (const [x, y, r] of [[x0 + 3, y1 - 3, 3.5], [x1 - 4, y0 + 4, 2.5], [x1 - 2, y1 - 2, 4]]) {
    const s = ctx.createRadialGradient(x, y, 0, x, y, r);
    s.addColorStop(0, 'rgba(150, 105, 50, 0.28)');
    s.addColorStop(1, 'rgba(150, 105, 50, 0)');
    ctx.fillStyle = s;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  path();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 0.7;
  ctx.stroke();
}
// zusammengerollter Teil der Rolle (Zylinder) von (x0,y0) nach (x1,y1), Dicke d; vertikal = Achse senkrecht
function vsRoll(ctx, x0, y0, x1, y1, d, vertical) {
  const g = vertical ? ctx.createLinearGradient(x0 - d / 2, 0, x0 + d / 2, 0) : ctx.createLinearGradient(0, y0 - d / 2, 0, y0 + d / 2);
  g.addColorStop(0, '#a88a52');
  g.addColorStop(0.35, '#f8ecc8');
  g.addColorStop(0.6, '#e2cc94');
  g.addColorStop(1, '#8a6c3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  if (vertical) ctx.roundRect(x0 - d / 2, y0, d, y1 - y0, d * 0.35);
  else ctx.roundRect(x0, y0 - d / 2, x1 - x0, d, d * 0.35);
  ctx.fill();
  ctx.strokeStyle = '#7a5a2a';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}
// Holzstab mit gedrechselten Endknäufen (Gold-Kappe)
function vsRodKnob(ctx, x, y, r, cap = '#e0b040') {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, '#b07a48');
  g.addColorStop(0.6, '#6a4022');
  g.addColorStop(1, '#3a2010');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a160a';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  oval(ctx, x, y, r * 0.55, r * 0.55, cap);
  dot(ctx, x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.22, '#fff4c8');
}
// Wachssiegel mit Rand, Prägung (draw) und Glanz
function vsSeal(ctx, x, y, r, col, emboss) {
  ctx.fillStyle = darker(col, 0.25);
  ctx.beginPath();
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2;
    const rr = r * (k % 2 ? 0.92 : 1.04);
    k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 0.8);
  g.addColorStop(0, lighter(col, 0.35));
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.74, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darker(col, 0.4);
  ctx.lineWidth = 0.45;
  ctx.stroke();
  if (emboss) emboss(x, y, r * 0.74);
  dot(ctx, x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.14, 'rgba(255, 255, 255, 0.7)');
}
// Band mit Schwalbenschwanz-Ende von (x0,y0) nach (x1,y1)
function vsRibbon(ctx, x0, y0, x1, y1, w, col) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l * w / 2;
  const ny = dx / l * w / 2;
  const cut = [x1 - dx / l * w * 0.7, y1 - dy / l * w * 0.7];
  const pts = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], cut, [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
  const g = ctx.createLinearGradient(x0 + nx, y0 + ny, x0 - nx, y0 - ny);
  g.addColorStop(0, lighter(col, 0.3));
  g.addColorStop(1, darker(col, 0.3));
  vsFill(ctx, pts, g);
  vsPath(ctx, pts);
  ctx.strokeStyle = darker(col, 0.55);
  ctx.lineWidth = 0.45;
  ctx.stroke();
}

// Switcher: offene Pergamentrolle zwischen zwei Holzstäben mit Endknäufen, grünes Band mit Siegel, in der Mitte
// zwei leuchtende Wechselpfeile als magische Glyphe
function vsSwitcher(ctx) {
  vsGlow(ctx, 0, 0, 19, '90, 230, 130', 0.32);
  // Holzstäbe hinter den Rollen
  for (const x of [-12, 12]) {
    const g = ctx.createLinearGradient(x - 1, 0, x + 1, 0);
    g.addColorStop(0, '#4a2a14');
    g.addColorStop(0.5, '#9a6a3a');
    g.addColorStop(1, '#3a2010');
    ctx.fillStyle = g;
    ctx.fillRect(x - 1, -14.5, 2, 29);
  }
  const sheet = () => {
    ctx.beginPath();
    ctx.moveTo(-10.5, -9.5);
    ctx.quadraticCurveTo(0, -11.2, 10.5, -9.5);
    ctx.lineTo(10.5, 9.5);
    ctx.quadraticCurveTo(0, 7.8, -10.5, 9.5);
    ctx.closePath();
  };
  vsParchment(ctx, sheet, -10, -10, 10, 10);
  // feine Zierlinien oben und unten
  ctx.save();
  sheet();
  ctx.clip();
  ctx.strokeStyle = 'rgba(46, 120, 60, 0.55)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-8.5, -7.6); ctx.quadraticCurveTo(0, -9, 8.5, -7.6);
  ctx.moveTo(-8.5, 7.2); ctx.quadraticCurveTo(0, 5.8, 8.5, 7.2);
  ctx.stroke();
  for (const x of [-6, -3, 0, 3, 6]) dot(ctx, x, -8.15 + Math.abs(x) * 0.04, 0.35, 0.35, 'rgba(46, 120, 60, 0.6)');
  ctx.restore();
  // Rollen links und rechts
  vsRoll(ctx, -11.6, -11, -11.6, 11, 4.4, true);
  vsRoll(ctx, 11.6, -11, 11.6, 11, 4.4, true);
  for (const x of [-11.6, 11.6]) {
    // Spiralende oben angedeutet
    ctx.strokeStyle = 'rgba(122, 90, 42, 0.8)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(x, -10.6, 1.5, 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Endknäufe
  for (const x of [-12, 12]) {
    vsRodKnob(ctx, x, -15, 2.1);
    vsRodKnob(ctx, x, 15, 2.1);
  }
  // Wechselpfeile: oben nach rechts, unten nach links, leicht gebogen
  const arrows = () => {
    ctx.beginPath();
    ctx.moveTo(-6.5, -1.5);
    ctx.quadraticCurveTo(0, -6.2, 6, -2.6);
    ctx.moveTo(3, -5.6); ctx.lineTo(6.4, -2.4); ctx.lineTo(2.2, -1.4);
    ctx.moveTo(6.5, 2.2);
    ctx.quadraticCurveTo(0, 6.9, -6, 3.3);
    ctx.moveTo(-3, 6.3); ctx.lineTo(-6.4, 3.1); ctx.lineTo(-2.2, 2.1);
  };
  vsGlowStroke(ctx, arrows, '80, 240, 120', '#2fbf55', 1.55);
  vsSparkle(ctx, 0, 0.3, 1.3, '#d8ffe0', 0.9);
  // grünes Band mit Siegel unten
  vsRibbon(ctx, 1.5, 9.5, -1.5, 18, 2.4, '#2e9a48');
  vsRibbon(ctx, 2.5, 9.5, 5.5, 17.5, 2.4, '#2e9a48');
  vsSeal(ctx, 2, 9.4, 3.6, '#2a8a3e', (x, y, r) => {
    ctx.strokeStyle = 'rgba(200, 255, 210, 0.75)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, -2.4, 0.4);
    ctx.moveTo(x + r * 0.55 * Math.cos(0.4) - 0.8, y + r * 0.55 * Math.sin(0.4) - 0.4);
    ctx.lineTo(x + r * 0.55 * Math.cos(0.4), y + r * 0.55 * Math.sin(0.4));
    ctx.stroke();
  });
}

// Segensschriftrolle: hochkant offenes Pergament mit Goldrand, Wappen (blauer Schild mit goldenem Kreuz) und
// goldenem Siegel an blauen Bändern; Rollen oben und unten mit Holzstab und Goldknäufen
function vsBlessing(ctx) {
  vsGlow(ctx, 0, -1, 20, '255, 220, 120', 0.3);
  const sheet = () => {
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(10, -12);
    ctx.quadraticCurveTo(11, 0, 10, 12);
    ctx.lineTo(-10, 12);
    ctx.quadraticCurveTo(-11, 0, -10, -12);
    ctx.closePath();
  };
  vsParchment(ctx, sheet, -10, -12, 10, 12);
  // Goldrand mit Eckpunkten
  ctx.strokeStyle = '#c89a2a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-8, -10, 16, 20);
  ctx.strokeStyle = 'rgba(200, 154, 42, 0.6)';
  ctx.lineWidth = 0.35;
  ctx.strokeRect(-7.1, -9.1, 14.2, 18.2);
  for (const [x, y] of [[-8, -10], [8, -10], [-8, 10], [8, 10]]) oval(ctx, x, y, 1, 1, '#f0c850');
  // Wappen
  const shield = [[-5.6, -7.6], [5.6, -7.6], [5.6, -1.2], [0, 5.6], [-5.6, -1.2]];
  const sg = ctx.createLinearGradient(-5, -7, 5, 5);
  sg.addColorStop(0, '#f4d060');
  sg.addColorStop(1, '#a8781a');
  vsFill(ctx, shield, sg);
  const inner = [[-4.2, -6.3], [4.2, -6.3], [4.2, -1.6], [0, 3.8], [-4.2, -1.6]];
  const ig = ctx.createLinearGradient(-4, -6, 4, 4);
  ig.addColorStop(0, '#5a8ae8');
  ig.addColorStop(1, '#1c3a8a');
  vsFill(ctx, inner, ig);
  vsFill(ctx, [[-0.8, -5.8], [0.8, -5.8], [0.8, -3.9], [3.6, -3.9], [3.6, -2.4], [0.8, -2.4], [0.8, 2.6], [0, 3.2], [-0.8, 2.6], [-0.8, -2.4], [-3.6, -2.4], [-3.6, -3.9], [-0.8, -3.9]], '#ffd84a');
  vsLine(ctx, 'rgba(255, 255, 255, 0.55)', 0.45, [[-4.2, -1.9], [-4.2, -6.2], [3.6, -6.2]]);
  vsPath(ctx, shield);
  ctx.strokeStyle = '#6a4a10';
  ctx.lineWidth = 0.55;
  ctx.stroke();
  // Schriftzeilen
  for (const [y, w] of [[7.2, 5.5], [8.8, 3.5]]) vsLine(ctx, 'rgba(110, 80, 40, 0.55)', 0.5, [[-w, y], [w - 2, y]]);
  // Rollen oben und unten mit Holzstab und Knäufen
  for (const y of [-13.2, 13.2]) {
    const g = ctx.createLinearGradient(0, y - 0.9, 0, y + 0.9);
    g.addColorStop(0, '#4a2a14');
    g.addColorStop(0.5, '#9a6a3a');
    g.addColorStop(1, '#3a2010');
    ctx.fillStyle = g;
    ctx.fillRect(-14, y - 0.9, 28, 1.8);
    vsRoll(ctx, -11.5, y, 11.5, y, 4.2, false);
    vsRodKnob(ctx, -14.2, y, 1.9);
    vsRodKnob(ctx, 14.2, y, 1.9);
  }
  // blaue Bänder und goldenes Siegel unten rechts
  vsRibbon(ctx, 6.5, 8.5, 4, 18, 2.2, '#3a6ad0');
  vsRibbon(ctx, 7.5, 8.5, 11, 17.5, 2.2, '#3a6ad0');
  vsSeal(ctx, 7, 8, 4.4, '#e0a82a', (x, y, r) => {
    vsLine(ctx, '#8a5a10', 0.8, [[x, y - r * 0.6], [x, y + r * 0.6]]);
    vsLine(ctx, '#8a5a10', 0.8, [[x - r * 0.6, y], [x + r * 0.6, y]]);
  });
  vsSparkle(ctx, -11, -6, 1.8, '#fff6d0', 0.9);
}

// Schriftrolle (für H1–H10): zusammengerollte Pergamentrolle schräg, Spiralende, rotes Band mit Wachssiegel
function vsRolle(ctx) {
  ctx.save();
  ctx.rotate(-0.55);
  // Rolle als Zylinder
  const g = ctx.createLinearGradient(0, -6, 0, 6);
  g.addColorStop(0, '#b8995a');
  g.addColorStop(0.3, '#fbf0d0');
  g.addColorStop(0.62, '#e6d09a');
  g.addColorStop(1, '#8a6c3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-15.5, -6, 31, 12, 2);
  ctx.fill();
  ctx.strokeStyle = '#6a4a20';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // überstehende Kante des Blatts
  vsLine(ctx, 'rgba(138, 108, 58, 0.7)', 0.5, [[-12, 4.2], [12, 4.2]]);
  // Stirnseite rechts mit Spirale
  oval(ctx, 15.5, 0, 3.2, 6, '#e8d6a2');
  ctx.strokeStyle = '#8a6a34';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let k = 0; k <= 40; k++) {
    const a = k / 40 * Math.PI * 5;
    const r = 0.25 + k / 40 * 0.95;
    const x = 15.5 + Math.cos(a) * r * 2.8;
    const y = Math.sin(a) * r * 5.2;
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  // Stirnseite links (abgewandt)
  oval(ctx, -15.5, 0, 2.6, 6, '#c9b07a');
  dot(ctx, -15.5, 0, 0.8, 1.6, '#7a5a2a');
  // rotes Band um die Rolle
  const bg = ctx.createLinearGradient(0, -6.6, 0, 6.6);
  bg.addColorStop(0, '#e04a40');
  bg.addColorStop(0.4, '#c42a2c');
  bg.addColorStop(1, '#6a0e14');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(-3.8, -6.6, 3.6, 13.2, 1);
  ctx.fill();
  ctx.strokeStyle = '#4a080c';
  ctx.lineWidth = 0.45;
  ctx.stroke();
  vsLine(ctx, 'rgba(255, 190, 180, 0.7)', 0.45, [[-3.2, -5.6], [-3.2, 5.6]]);
  ctx.restore();
  // Bänder und Siegel hängen unter der Rolle
  vsRibbon(ctx, -1.5, 3, -5, 14, 2, '#c42a2c');
  vsRibbon(ctx, -1.5, 3, 2.8, 14.5, 2, '#c42a2c');
  vsSeal(ctx, -1.5, 8, 5, '#c42228', (x, y) => {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5;
      const r = k % 2 ? 1.2 : 2.8;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    vsFill(ctx, pts, '#ffcf4a');
    vsLine(ctx, 'rgba(255, 255, 255, 0.6)', 0.3, [[x, y], [x, y - 2.6]]);
  });
  vsSparkle(ctx, -12, -12, 1.8, '#fff6d0', 0.85);
}

// Sternen-Switcher: polierte Obsidianscheibe mit Goldrand, darin ein Sternstein; zwei goldene Pfeile kreisen leuchtend
function vsSwitch67(ctx) {
  vsGlow(ctx, 0, 0, 20, '255, 170, 80', 0.38);
  const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 13.5);
  g.addColorStop(0, '#6a3a86');
  g.addColorStop(0.6, '#3a1a4e');
  g.addColorStop(1, '#1a0a26');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  // Goldrand mit Lichtkante
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#c8962a';
  ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = '#ffe48a';
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI * 0.95, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 210, 120, 0.35)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.stroke();
  // Runenpunkte auf dem Innenring
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + 0.31;
    dot(ctx, Math.cos(a) * 11, Math.sin(a) * 11, 0.45, 0.45, 'rgba(255, 220, 140, 0.8)');
  }
  vsStarGem(ctx, 0, 0.6, 9, 3.9, '#f2b42a');
  // Glanz auf der Scheibe
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 12.4, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, Math.PI * 1.05, Math.PI * 1.4);
  ctx.stroke();
  ctx.restore();
  // kreisende Pfeile
  for (const a0 of [-0.35, Math.PI - 0.35]) {
    const a1 = a0 + 1.9;
    const R = 16;
    const tx = Math.cos(a1) * R;
    const ty = Math.sin(a1) * R;
    const nx = -Math.sin(a1);
    const ny = Math.cos(a1);
    const path = () => {
      ctx.beginPath();
      ctx.arc(0, 0, R, a0, a1);
      ctx.moveTo(tx + nx * 2.6 - Math.cos(a1) * 2.6, ty + ny * 2.6 - Math.sin(a1) * 2.6);
      ctx.lineTo(tx + nx * 0.4, ty + ny * 0.4);
      ctx.lineTo(tx + nx * 2.6 + Math.cos(a1) * 2.6, ty + ny * 2.6 + Math.sin(a1) * 2.6);
    };
    vsGlowStroke(ctx, path, '255, 190, 90', '#ffb44a', 1.6);
  }
  vsSparkle(ctx, -9, -10, 2.2);
}

// Seelensplitter: violetter Kristallsplitter mit Facetten, innerem Glühen und Funken
function vsSplinter(ctx) {
  vsGlow(ctx, 0, 0, 18, '190, 140, 255', 0.4);
  // kleiner Begleitsplitter hinten
  vsGem(ctx, [[8, -6], [12, 0], [10, 11], [6, 6]], 9, 3, '#6a3ab0', { table: 0.4, contrast: 0.5, lit: false });
  vsGem(ctx, [[0, -16], [7, -3], [4.5, 14], [-2, 16], [-7, 5], [-6.5, -5]], -0.5, 0, '#9a62e0', { glow: '220, 190, 255', table: 0.42 });
  vsSparkle(ctx, -6, -11, 2.4);
  vsSparkle(ctx, 9, 13, 1.4, '#e8d8ff', 0.85);
}

// Mondsichel: Kreis ohne versetzten Kreis, nur innerhalb des ersten (geclippt, damit nichts übersteht)
function vsCrescent(ctx, x, y, r, fill, line) {
  const path = () => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.46, y - r * 0.24, r * 0.84, 0, Math.PI * 2, true);
  };
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.strokeStyle = line;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  ctx.restore();
}

// --- Tränke -----------------------------------------------------------------------------------------------------
// Flaschenformen nach Größe (sz.art): S schlankes Fläschchen, M runder Kolben, XL birnenförmige Flasche mit langem
// Hals, XXL prächtige Karaffe mit Goldfuß und Filigranband. surf: Höhe der Oberfläche, rx: halbe Breite dort.
const VS_POT_SHAPES = {
  0: {
    path(ctx) {
      ctx.beginPath();
      ctx.moveTo(-2.6, -9);
      ctx.lineTo(-2.6, -6.6);
      ctx.quadraticCurveTo(-6.4, -5.2, -6.4, -1);
      ctx.lineTo(-6.4, 11);
      ctx.quadraticCurveTo(-6.4, 16.6, 0, 16.6);
      ctx.quadraticCurveTo(6.4, 16.6, 6.4, 11);
      ctx.lineTo(6.4, -1);
      ctx.quadraticCurveTo(6.4, -5.2, 2.6, -6.6);
      ctx.lineTo(2.6, -9);
      ctx.closePath();
    },
    neck: 2.6, top: -9, surf: 0, rx: 6.4, bottom: 16.6, hl: [[-4.6, 0], [-4.8, 7], [-4, 12.5]], label: [-4.4, 4, 8.8, 6]
  },
  1: {
    path(ctx) {
      ctx.beginPath();
      ctx.moveTo(-3, -8.6);
      ctx.lineTo(-3, -4.06);
      ctx.arc(0, 6, 10.5, Math.atan2(-10.06, -3), Math.atan2(-10.06, 3), true);
      ctx.lineTo(3, -8.6);
      ctx.closePath();
    },
    neck: 3, top: -8.6, surf: 0.5, rx: 8.9, bottom: 16.5, hl: [[-7.6, 1.5], [-9, 6], [-6.4, 11.6]], label: [-5, 5.5, 10, 6.5]
  },
  3: {
    path(ctx) {
      ctx.beginPath();
      ctx.moveTo(-3, -9.6);
      ctx.lineTo(-3, -5);
      ctx.quadraticCurveTo(-4, -1, -10, 3.5);
      ctx.quadraticCurveTo(-13.6, 8, -11, 13);
      ctx.quadraticCurveTo(-8, 17, 0, 17);
      ctx.quadraticCurveTo(8, 17, 11, 13);
      ctx.quadraticCurveTo(13.6, 8, 10, 3.5);
      ctx.quadraticCurveTo(4, -1, 3, -5);
      ctx.lineTo(3, -9.6);
      ctx.closePath();
    },
    neck: 3, top: -9.6, surf: 1.5, rx: 7.2, bottom: 17, hl: [[-7, 4], [-10.6, 8.5], [-8.6, 13.4]], label: [-5, 3.4, 10, 5.6], ring: 1
  },
  4: {
    path(ctx) {
      ctx.beginPath();
      ctx.moveTo(-3.2, -9.2);
      ctx.lineTo(-3.2, -6.2);
      ctx.quadraticCurveTo(-4, -4.2, -9, -3.4);
      ctx.quadraticCurveTo(-14.4, -2, -14.2, 6);
      ctx.quadraticCurveTo(-14, 13.6, -6.5, 15.8);
      ctx.lineTo(6.5, 15.8);
      ctx.quadraticCurveTo(14, 13.6, 14.2, 6);
      ctx.quadraticCurveTo(14.4, -2, 9, -3.4);
      ctx.quadraticCurveTo(4, -4.2, 3.2, -6.2);
      ctx.lineTo(3.2, -9.2);
      ctx.closePath();
    },
    neck: 3.2, top: -9.2, surf: -0.6, rx: 12.6, bottom: 16, hl: [[-10, -0.5], [-12.6, 5], [-10.4, 11.4]], label: [-6, 1.8, 12, 6.2], ring: 2, foot: 1
  }
};

function vsPotion(ctx, kind, art = 1) {
  const hp = kind === 'hp';
  const sh = VS_POT_SHAPES[art] || VS_POT_SHAPES[art > 3 ? 4 : art >= 2 ? 3 : 1];
  const L = hp
    ? { top: '#ff7a52', mid: '#d4202a', deep: '#5a0716', glow: '255, 90, 60', surf: '#ffb08a', glass: 'rgba(70, 26, 34, 0.92)', light: '255, 210, 160' }
    : { top: '#8ae4ff', mid: '#2f78e6', deep: '#141e78', glow: '90, 170, 255', surf: '#d0f4ff', glass: 'rgba(28, 36, 74, 0.92)', light: '220, 245, 255' };
  vsGlow(ctx, 0, 5, 20, L.glow, 0.42);
  // Goldfuß der Karaffe
  if (sh.foot) {
    const fg = ctx.createLinearGradient(-8, 15, 8, 19);
    fg.addColorStop(0, '#ffe080');
    fg.addColorStop(0.5, '#d09a2a');
    fg.addColorStop(1, '#7a5010');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-5, 15);
    ctx.lineTo(5, 15);
    ctx.quadraticCurveTo(6, 17.2, 9, 18);
    ctx.lineTo(9, 19.4);
    ctx.lineTo(-9, 19.4);
    ctx.lineTo(-9, 18);
    ctx.quadraticCurveTo(-6, 17.2, -5, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a3a08';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    vsLine(ctx, 'rgba(255, 245, 200, 0.8)', 0.4, [[-8.4, 18.4], [-3, 18.4]]);
  }
  // Glas (innen dunkel)
  sh.path(ctx);
  ctx.fillStyle = L.glass;
  ctx.fill();
  ctx.save();
  sh.path(ctx);
  ctx.clip();
  // leerer Teil oben: leichter Glasschimmer
  let g = ctx.createLinearGradient(-sh.rx, 0, sh.rx, 0);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(-16, sh.top, 32, sh.surf - sh.top);
  // Flüssigkeit
  g = ctx.createLinearGradient(0, sh.surf, 0, sh.bottom);
  g.addColorStop(0, L.top);
  g.addColorStop(0.45, L.mid);
  g.addColorStop(1, L.deep);
  ctx.fillStyle = g;
  ctx.fillRect(-16, sh.surf, 32, 30);
  // Licht, das durch die Flüssigkeit fällt
  const my = (sh.surf + sh.bottom) / 2 + 2;
  g = ctx.createRadialGradient(-1, my, 0, -1, my, sh.rx * 0.95);
  g.addColorStop(0, `rgba(${L.light}, 0.65)`);
  g.addColorStop(1, `rgba(${L.light}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-16, sh.surf, 32, 30);
  // Bläschen (Leben) bzw. Sternenfunken (Mana)
  const span = sh.bottom - sh.surf;
  const spots = [[0.3, 0.55, 1.1], [-0.4, 0.3, 0.8], [0.45, 0.25, 0.6], [-0.15, 0.78, 0.7], [0.1, 0.12, 0.5]];
  for (const [fx, fy, r] of spots) {
    const x = fx * sh.rx;
    const y = sh.surf + fy * span;
    if (hp) {
      ctx.strokeStyle = 'rgba(255, 220, 190, 0.8)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.3, 'rgba(255, 255, 255, 0.9)');
    } else vsSparkle(ctx, x, y, r * 1.7, '#ffffff', 0.95);
  }
  // Meniskus: Oberfläche als Ellipse, Rand zur Glaswand leicht hochgezogen
  ctx.fillStyle = L.surf;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(0, sh.surf, sh.rx, Math.max(1.2, sh.rx * 0.2), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = darker(L.mid, 0.3);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.ellipse(0, sh.surf, sh.rx, Math.max(1.2, sh.rx * 0.2), 0, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(0, sh.surf, sh.rx, Math.max(1.2, sh.rx * 0.2), 0, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
  // Spiegelung der Gegenwand unten
  ctx.strokeStyle = `rgba(${L.light}, 0.35)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, sh.bottom - 3, sh.rx * 0.7, 1.8, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  // Goldband (XL, XXL) mit kleinen Steinen
  if (sh.ring) {
    const y = sh.ring === 2 ? 9.6 : 9.5;
    const rx = sh.ring === 2 ? 14.1 : 12.2;
    ctx.strokeStyle = '#6a4a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, y, rx, 3, 0, 0.12, Math.PI - 0.12);
    ctx.stroke();
    ctx.strokeStyle = '#e8b83a';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = '#fff0a8';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, y - 0.3, rx, 3, 0, 0.4, 1.4);
    ctx.stroke();
    if (sh.ring === 2) for (const a of [0.45, 1.57, 2.69]) {
      const x = Math.cos(a) * rx;
      const yy = y + Math.sin(a) * 3;
      oval(ctx, x, yy, 1.2, 1.2, hp ? '#ff4a5a' : '#5ad0ff');
      dot(ctx, x - 0.35, yy - 0.35, 0.4, 0.4, '#ffffff');
    }
  }
  // Etikett mit Zeichen (Herz bzw. Mondsichel)
  const [lx, ly, lw, lh] = sh.label;
  const lg = ctx.createLinearGradient(lx, ly, lx, ly + lh);
  lg.addColorStop(0, '#fbf2d6');
  lg.addColorStop(1, '#d8c08a');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(lx, ly + 0.5);
  ctx.quadraticCurveTo(lx + lw / 2, ly - 0.6, lx + lw, ly + 0.5);
  ctx.lineTo(lx + lw, ly + lh - 0.3);
  ctx.quadraticCurveTo(lx + lw / 2, ly + lh - 1.4, lx, ly + lh - 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = art >= 3 ? '#c8962a' : '#7a5a2a';
  ctx.lineWidth = art >= 3 ? 0.6 : 0.45;
  ctx.stroke();
  const ex = lx + lw / 2;
  const ey = ly + lh / 2 - 0.2;
  const es = Math.min(lw, lh) * 0.32;
  if (hp) {
    ctx.fillStyle = '#c41a26';
    ctx.beginPath();
    ctx.moveTo(ex, ey + es);
    ctx.bezierCurveTo(ex - es * 1.6, ey, ex - es * 0.9, ey - es * 1.2, ex, ey - es * 0.35);
    ctx.bezierCurveTo(ex + es * 0.9, ey - es * 1.2, ex + es * 1.6, ey, ex, ey + es);
    ctx.fill();
    dot(ctx, ex - es * 0.55, ey - es * 0.35, es * 0.22, es * 0.18, 'rgba(255, 220, 220, 0.9)');
  } else {
    vsCrescent(ctx, ex, ey, es, '#2a5ac8');
  }
  // Glasreflexe: langer Streifen links, Punkt rechts, Umriss
  ctx.save();
  ctx.lineCap = 'round';
  const [a, b, c] = sh.hl;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
  ctx.stroke();
  ctx.restore();
  dot(ctx, sh.rx * 0.62, sh.surf + 2.4, 0.9, 0.9, 'rgba(255, 255, 255, 0.85)');
  vsLine(ctx, 'rgba(255, 255, 255, 0.55)', 0.7, [[-sh.neck + 0.9, sh.top + 1], [-sh.neck + 0.9, sh.top + 5]]);
  sh.path(ctx);
  ctx.strokeStyle = hp ? '#2a0c12' : '#0e1438';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Lippe am Flaschenhals
  const lip = ctx.createLinearGradient(0, sh.top - 1.4, 0, sh.top + 1.2);
  lip.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  lip.addColorStop(1, hp ? 'rgba(160, 110, 120, 0.9)' : 'rgba(140, 170, 220, 0.9)');
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.roundRect(-sh.neck - 1.2, sh.top - 1.4, sh.neck * 2 + 2.4, 2.4, 1.1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 20, 30, 0.8)';
  ctx.lineWidth = 0.45;
  ctx.stroke();
  if (sh.ring === 2) {
    // Goldring unter der Lippe
    box(ctx, -sh.neck - 0.6, sh.top + 1.4, sh.neck * 2 + 1.2, 1.6, 0.7, '#e0b040');
  }
  const t = sh.top - 1.4;
  if (hp) {
    // Korken
    const cg = ctx.createLinearGradient(-sh.neck, 0, sh.neck, 0);
    cg.addColorStop(0, '#6a4020');
    cg.addColorStop(0.4, '#b8844a');
    cg.addColorStop(1, '#5a3418');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(-sh.neck + 0.4, t - 4.6, sh.neck * 2 - 0.8, 5, 1);
    ctx.fill();
    for (const [x, y] of [[-0.8, t - 2.6], [1, t - 1.4], [0.2, t - 3.6]]) dot(ctx, x, y, 0.35, 0.3, 'rgba(60, 30, 10, 0.7)');
    // rotes Wachssiegel mit Tropfen über dem Korken
    const w = sh.neck + 1.6;
    const wg = ctx.createLinearGradient(-w, t - 6.4, w, t);
    wg.addColorStop(0, '#f05050');
    wg.addColorStop(0.5, '#b81a24');
    wg.addColorStop(1, '#6a0812');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(-w + 0.6, t - 6.2);
    ctx.quadraticCurveTo(0, t - 7.6, w - 0.6, t - 6.2);
    ctx.quadraticCurveTo(w + 0.4, t - 4.4, w - 0.2, t - 3.4);
    ctx.quadraticCurveTo(w - 1.1, t - 2.4, w - 1.6, t - 3.2);
    ctx.lineTo(w - 1.8, t - 0.6);
    ctx.quadraticCurveTo(w - 2.4, t + 0.6, w - 3, t - 0.6);
    ctx.lineTo(w - 3.2, t - 3);
    ctx.quadraticCurveTo(0, t - 3.6, -w + 2.8, t - 3);
    ctx.lineTo(-w + 2.6, t - 1.6);
    ctx.quadraticCurveTo(-w + 2, t - 0.6, -w + 1.4, t - 1.6);
    ctx.lineTo(-w + 1.2, t - 3.2);
    ctx.quadraticCurveTo(-w - 0.4, t - 4.4, -w + 0.6, t - 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a0408';
    ctx.lineWidth = 0.45;
    ctx.stroke();
    dot(ctx, -w * 0.4, t - 5.8, w * 0.35, 0.5, 'rgba(255, 190, 180, 0.85)');
  } else {
    // silberner Kragen und Mondsichel-Stöpsel
    const sg = ctx.createLinearGradient(-sh.neck, 0, sh.neck, 0);
    sg.addColorStop(0, '#8a96b0');
    sg.addColorStop(0.4, '#f0f4fc');
    sg.addColorStop(1, '#7a86a0');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.roundRect(-sh.neck - 0.2, t - 2.6, sh.neck * 2 + 0.4, 3, 0.8);
    ctx.fill();
    ctx.strokeStyle = '#3a4460';
    ctx.lineWidth = 0.45;
    ctx.stroke();
    const my2 = t - 5.4;
    const mg = ctx.createLinearGradient(-4, my2 - 4, 4, my2 + 4);
    mg.addColorStop(0, '#ffffff');
    mg.addColorStop(0.6, '#d8e2f4');
    mg.addColorStop(1, '#8a9ab8');
    vsCrescent(ctx, 0, my2, 3.9, mg, '#4a5878');
    dot(ctx, -2.3, my2 - 0.5, 0.55, 1, '#ffffff');
    vsSparkle(ctx, 4, my2 + 1.4, 1.2, '#ffffff', 0.9);
  }
}

// --- Monsterteile (seit 14.60) ----------------------------------------------------------------------------------
// Dieselben Grundformen wie bisher (MOB_MAT_ART in ausruestung.js), aber mit Verlauf, Kanten, Maserung und Glanz in
// der Farbe des Teils (c): Zahnwurzel, Fellsträhnen, Hornringe, Nieten, Fäden, Blattadern.
function vsLinFill(ctx, x0, y0, x1, y1, c, hi = 0.4, lo = 0.35) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, lighter(c, hi));
  g.addColorStop(0.5, c);
  g.addColorStop(1, darker(c, lo));
  return g;
}
function vsShape(ctx, path, fill, line, inner) {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (inner) {
    ctx.save();
    path();
    ctx.clip();
    inner();
    ctx.restore();
  }
  path();
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.75;
  ctx.stroke();
}
const VS_MOB_ART = {
  // Reißzahn: gebogen, Wurzel dunkler, Schmelz glänzt
  fang(ctx, c) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-6.5, -11);
      ctx.quadraticCurveTo(0, -13.5, 6.5, -11);
      ctx.quadraticCurveTo(6, -1, 2.5, 6);
      ctx.quadraticCurveTo(1, 11, -1.5, 14);
      ctx.quadraticCurveTo(-3, 6, -5.5, 0);
      ctx.quadraticCurveTo(-7, -6, -6.5, -11);
      ctx.closePath();
    };
    vsShape(ctx, path, vsLinFill(ctx, -6, -10, 6, 12, c, 0.45, 0.3), darker(c, 0.6), () => {
      const g = ctx.createLinearGradient(0, -13, 0, -6);
      g.addColorStop(0, 'rgba(120, 70, 40, 0.55)');
      g.addColorStop(1, 'rgba(120, 70, 40, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-8, -14, 16, 8);
      vsLine(ctx, 'rgba(255, 255, 255, 0.75)', 1, [[-3.8, -6], [-3, 2], [-1.2, 8]]);
      vsLine(ctx, darker(c, 0.35), 0.5, [[3.5, -7], [2.2, 1], [0.4, 7]]);
    });
    vsSparkle(ctx, -3.2, -2, 1.4, '#ffffff', 0.8);
  },
  // Pelz: Fellstück mit Strähnen, hellen Spitzen und dunklem Unterhaar
  fur(ctx, c) {
    const pts = [[-12, -6], [-6, -11], [0, -8], [6, -12], [12, -6], [10, 4], [12, 10], [4, 8], [0, 12], [-5, 8], [-12, 10], [-10, 2]];
    vsShape(ctx, () => vsPath(ctx, pts), vsLinFill(ctx, -10, -10, 10, 10, c, 0.35, 0.4), darker(c, 0.65), () => {
      ctx.lineCap = 'round';
      for (let k = 0; k < 26; k++) {
        const x = -11 + (k * 7.3) % 22;
        const y = -9 + ((k * 5.1) % 19);
        const len = 3 + (k % 3);
        vsLine(ctx, k % 2 ? darker(c, 0.35) : lighter(c, 0.35), 0.55, [[x, y], [x - 1.2, y + len * 0.5], [x - 0.6, y + len]]);
      }
    });
    vsLine(ctx, 'rgba(255, 255, 255, 0.45)', 0.7, [[-11, -6], [-6, -10.4], [0, -7.4], [6, -11.3]]);
  },
  // Hauer/Horn: gebogen, mit Wachstumsringen und heller Spitze
  horn(ctx, c) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.quadraticCurveTo(-8, 2, 1, -3);
      ctx.quadraticCurveTo(7, -7, 10, -14);
      ctx.quadraticCurveTo(11, -4, 5, 3);
      ctx.quadraticCurveTo(0, 9, -3, 13);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(-10, 12, 10, -14);
    g.addColorStop(0, darker(c, 0.45));
    g.addColorStop(0.5, c);
    g.addColorStop(1, lighter(c, 0.55));
    vsShape(ctx, path, g, darker(c, 0.6), () => {
      for (const [x0, y0, x1, y1] of [[-9, 8.5, -3.5, 11.5], [-6.5, 4, -0.5, 7.5], [-2.5, 0.5, 2.5, 4], [1.5, -2.4, 5.4, 0.6]]) vsLine(ctx, darker(c, 0.3), 0.6, [[x0, y0], [x1, y1]]);
      vsLine(ctx, 'rgba(255, 255, 255, 0.7)', 0.9, [[-8.5, 9], [-5, 2], [2, -3.2], [8, -10]]);
    });
  },
  // Abzeichen: Wappenschild mit Metallrand, Nieten und gewölbtem Buckel
  badge(ctx, c) {
    const outer = [[-10, -12], [10, -12], [10, 4], [0, 13], [-10, 4]];
    vsShape(ctx, () => vsPath(ctx, outer), vsLinFill(ctx, -10, -12, 10, 13, '#c8a050', 0.45, 0.45), '#3a2810');
    const inner = [[-8, -10], [8, -10], [8, 3.2], [0, 10.6], [-8, 3.2]];
    vsShape(ctx, () => vsPath(ctx, inner), vsLinFill(ctx, -8, -10, 8, 10, c, 0.3, 0.4), darker(c, 0.6), () => {
      vsLine(ctx, 'rgba(255, 255, 255, 0.35)', 0.8, [[-7.4, 2.8], [-7.4, -9.4], [7.4, -9.4]]);
    });
    const g = ctx.createRadialGradient(-1.2, -3.2, 0, 0, -2, 4.4);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.5, '#e8c46a');
    g.addColorStop(1, '#8a6420');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -2, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a3a10';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    for (const [x, y] of [[-8.6, -10.7], [8.6, -10.7], [-8.6, 3.4], [8.6, 3.4]]) rivet2D(ctx, x, y, 0.9, '#d8b060');
  },
  // Pfeil: Holzschaft mit Maserung, geschliffene Spitze in der Teilfarbe, Federn
  arrow(ctx, c) {
    ctx.save();
    ctx.lineCap = 'round';
    vsLine(ctx, '#3a2614', 2.6, [[-11, 11], [6, -6]]);
    vsLine(ctx, '#a07a4a', 1.6, [[-11, 11], [6, -6]]);
    vsLine(ctx, 'rgba(255, 230, 190, 0.6)', 0.5, [[-10.6, 10.2], [5.4, -5.8]]);
    ctx.restore();
    vsGem(ctx, [[12, -12], [3.6, -8.6], [5.2, -5.2], [8.6, -3.6]], 7.2, -7.2, c, { table: 0.25, contrast: 0.7 });
    vsShape(ctx, () => vsPath(ctx, [[-11, 11], [-13.4, 4.6], [-11.6, 3.6], [-8, 8]]), vsLinFill(ctx, -13, 4, -8, 10, '#e8e0cc'), '#6a5a44');
    vsShape(ctx, () => vsPath(ctx, [[-11, 11], [-4.6, 13.4], [-3.6, 11.6], [-8, 8]]), vsLinFill(ctx, -8, 8, -3, 13, '#c8402f'), '#5a1a10');
    vsLine(ctx, '#e8c46a', 1, [[-8.8, 7.2], [-7.2, 8.8]]);
  },
  // Seide: Garnknäuel mit gewickelten Fäden und losem Ende
  silk(ctx, c) {
    const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
    g.addColorStop(0, lighter(c, 0.55));
    g.addColorStop(0.55, c);
    g.addColorStop(1, darker(c, 0.4));
    vsShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, Math.PI * 2); }, g, darker(c, 0.6), () => {
      ctx.lineWidth = 0.5;
      for (let k = 0; k < 7; k++) {
        ctx.strokeStyle = k % 2 ? 'rgba(255, 255, 255, 0.4)' : darker(c, 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 3 + k * 1.3, -0.5 + k * 0.08, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = darker(c, 0.25);
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 + k * 2, 11, 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = lighter(c, 0.2);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(8, 7);
    ctx.bezierCurveTo(12, 11, 9, 15, 14, 16);
    ctx.stroke();
    dot(ctx, -4, -4.5, 2.2, 1.4, 'rgba(255, 255, 255, 0.55)');
  },
  // Klauen: drei gebogene Krallen auf einem Ballen
  claw(ctx, c) {
    oval(ctx, 0, 10, 10, 4.2, '#5a3a2a');
    for (const [x, rot] of [[-6, -0.22], [0, 0], [6, 0.22]]) {
      ctx.save();
      ctx.translate(x, 9);
      ctx.rotate(rot);
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(-2.8, 0);
        ctx.quadraticCurveTo(-3.2, -11, 2.4, -19);
        ctx.quadraticCurveTo(0.6, -10, 2.8, 0);
        ctx.closePath();
      };
      vsShape(ctx, path, vsLinFill(ctx, -3, 0, 3, -19, c, 0.1, 0.35), darker(c, 0.6), () => {
        vsLine(ctx, 'rgba(255, 255, 255, 0.6)', 0.7, [[-1.6, -2], [-1.6, -10], [1.4, -16.5]]);
      });
      ctx.restore();
    }
  },
  // Feder: Fahne mit Verlauf, Kiel, Ästen und Einschnitt
  feather(ctx, c) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-2, 12);
      ctx.quadraticCurveTo(-8, 2, -4, -8);
      ctx.quadraticCurveTo(-1, -13, 2.5, -14);
      ctx.quadraticCurveTo(8, -6, 3.2, 6);
      ctx.lineTo(1.4, 5.4);
      ctx.lineTo(2, 8);
      ctx.closePath();
    };
    vsShape(ctx, path, vsLinFill(ctx, -6, -12, 6, 10, c, 0.4, 0.35), darker(c, 0.6), () => {
      for (let k = 0; k < 9; k++) {
        const t = k / 9;
        const x = -1.5 + t * 3.8;
        const y = 11 - t * 23;
        vsLine(ctx, darker(c, 0.25), 0.4, [[x, y], [x - 6, y - 4]]);
        vsLine(ctx, lighter(c, 0.3), 0.35, [[x, y], [x + 5, y - 3.5]]);
      }
    });
    vsLine(ctx, '#f4ecd8', 0.9, [[-2.6, 16], [-1.5, 11], [2, -13]]);
  },
  // Kern: glühende Kugel in dunklem Gestein
  core(ctx, c) {
    vsGlow(ctx, 0, 0, 17, hexRgb(c), 0.45);
    vsShape(ctx, () => vsPath(ctx, [[-10, -3], [-6, -10], [4, -11], [11, -4], [10, 6], [3, 11], [-7, 10], [-11, 4]]), vsLinFill(ctx, -10, -10, 10, 10, '#4a3e3a'), '#1a1210');
    const g = ctx.createRadialGradient(-2, -2, 0, 0, 0, 7.5);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.35, lighter(c, 0.3));
    g.addColorStop(0.8, c);
    g.addColorStop(1, darker(c, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
    ctx.fill();
    for (const [a, l] of [[0.4, 3], [2.2, 2.6], [4, 3.2]]) vsLine(ctx, lighter(c, 0.4), 0.5, [[Math.cos(a) * 7.2, Math.sin(a) * 7.2], [Math.cos(a) * (7.2 + l), Math.sin(a) * (7.2 + l)]]);
    vsSparkle(ctx, -2.4, -2.6, 2.2);
  },
  // Kristall: Hauptkristall mit zwei Begleitern, geschliffen
  crystal(ctx, c) {
    vsGlow(ctx, 0, 2, 17, hexRgb(c), 0.3);
    vsGem(ctx, [[-9, -3], [-5, -6], [-3, 12], [-8, 12]], -6, 5, darker(c, 0.15), { table: 0.35, lit: false });
    vsGem(ctx, [[9, -1], [5, -4], [3, 12], [8, 12]], 6, 6, darker(c, 0.1), { table: 0.35, lit: false });
    vsGem(ctx, [[0, -15], [6, -5], [4, 13], [-4, 13], [-6, -5]], 0, 0, c, { table: 0.38, glow: '255, 255, 255' });
    vsSparkle(ctx, -3, -9, 2);
  },
  // Staub: Lederbeutel mit Schnur, leuchtender Staub quillt heraus
  dust(ctx, c) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.quadraticCurveTo(-11, 1, -9, 9);
      ctx.quadraticCurveTo(0, 14, 9, 9);
      ctx.quadraticCurveTo(11, 1, 5, -5);
      ctx.closePath();
    };
    vsShape(ctx, path, vsLinFill(ctx, -9, -5, 9, 12, '#9a7448', 0.3, 0.45), '#3a2410', () => {
      stitch2D(ctx, '#e8d0a0', [[-8, 7], [0, 10.6], [8, 7]], 0.45);
      vsLine(ctx, 'rgba(255, 230, 190, 0.4)', 0.9, [[-6.5, -1], [-8, 5]]);
    });
    vsShape(ctx, () => vsPath(ctx, [[-5, -5], [-6.5, -9], [6.5, -9], [5, -5]]), vsLinFill(ctx, -6, -9, 6, -5, '#a8824e'), '#3a2410');
    vsLine(ctx, '#c83a2a', 1.1, [[-5.4, -5.6], [5.4, -5.6]]);
    vsLine(ctx, '#c83a2a', 0.8, [[4.8, -5.6], [7.4, -2.6]]);
    vsGlow(ctx, 0, -10, 8, hexRgb(c), 0.6);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, -9.2, 5.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, r] of [[-3, -12, 0.8], [2, -13.5, 0.6], [4.5, -11, 0.7], [-0.5, -15, 0.5]]) dot(ctx, x, y, r, r, lighter(c, 0.5));
    vsSparkle(ctx, 1.5, -12.5, 1.6, '#ffffff', 0.9);
  },
  // Kraut: Stängel mit geäderten Blättern
  herb(ctx, c) {
    vsLine(ctx, '#2e4a1a', 2, [[0, 13], [0.6, 2], [0, -8]]);
    vsLine(ctx, '#6a8a3a', 1, [[0, 13], [0.6, 2], [0, -8]]);
    for (const [x, y, a, w, h] of [[-6, -6, -0.5, 5, 2.6], [6, -4, 0.5, 5, 2.6], [-5.5, 2.5, -0.35, 5, 2.6], [5.5, 4.5, 0.35, 5, 2.6], [0, -11, -Math.PI / 2, 3.6, 2.4]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.quadraticCurveTo(0, -h * 1.4, w, 0);
        ctx.quadraticCurveTo(0, h * 1.4, -w, 0);
        ctx.closePath();
      };
      vsShape(ctx, path, vsLinFill(ctx, -w, -h, w, h, c, 0.35, 0.35), darker(c, 0.6), () => {
        vsLine(ctx, lighter(c, 0.45), 0.4, [[-w, 0], [w * 0.8, 0]]);
        for (const t of [-0.4, 0, 0.4]) vsLine(ctx, darker(c, 0.25), 0.3, [[t * w, 0], [t * w + w * 0.3, -h * 0.6]]);
      });
      ctx.restore();
    }
  },
  // Schuppe: gewölbte Panzerschuppe mit Rillen und Glanz
  scale(ctx, c) {
    vsGem(ctx, [[0, -13], [10.5, -4.5], [8.5, 8], [0, 13], [-8.5, 8], [-10.5, -4.5]], 0, -1, c, { table: 0.55, contrast: 0.45 });
    ctx.strokeStyle = lighter(c, 0.4);
    ctx.lineWidth = 0.7;
    for (const y of [-4, 2]) {
      ctx.beginPath();
      ctx.moveTo(-5.5, y + 3);
      ctx.quadraticCurveTo(0, y - 4, 5.5, y + 3);
      ctx.stroke();
    }
    vsSparkle(ctx, -4, -6, 1.8);
  }
};
