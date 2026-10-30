// Fertigkeitssymbole Ninja (seit 9.6), Stil und Hilfen in symbol-kunst.js

// --- eigene Hilfen (Präfix ikNinja) ----------------------------------------------------------------

// Rauchwolke aus mehreren Ballen um (x,y), Größe r; pal = [Licht, Mitte, Schatten]
function ikNinjaSmoke(ctx, IK, x, y, r, seed = 1, pal = ['#c8b8f0', '#5a4a8a', '#140c24'], n = 6, alpha = 1) {
  let s = seed * 7717 + 13;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.8;
    const d = r * (0.35 + rnd() * 0.3);
    puffs.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, r * (0.42 + rnd() * 0.22)]);
  }
  puffs.push([x, y - r * 0.1, r * 0.6]);
  puffs.sort((p, q) => p[1] - q[1]);
  ctx.save();
  ctx.globalAlpha = alpha;
  // gemeinsame weiche Kontur, ein Verlauf für die ganze Wolke, dann je Ballen ein Lichtfleck oben links
  const all = (c) => {
    for (const [px, py, pr] of puffs) {
      c.moveTo(px + pr, py);
      c.arc(px, py, pr, 0, Math.PI * 2);
    }
  };
  ctx.beginPath();
  all(ctx);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(8,4,14,0.6)';
  ctx.stroke();
  ctx.fillStyle = IK.lin(ctx, x - r, y - r, x + r * 0.6, y + r, [[0, pal[1]], [1, pal[2]]]);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  all(ctx);
  ctx.clip();
  for (const [px, py, pr] of puffs) {
    ctx.fillStyle = IK.rad(ctx, px - pr * 0.35, py - pr * 0.45, 0, pr * 1.1, [[0, pal[0]], [0.6, pal[1]], [1, 'rgba(0,0,0,0)']]);
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// Ninja-Umriss; Pfad in Einheiten (Höhe 20, Füße bei 0)
const IK_NINJA_POSES = {
  // stehend, leicht nach rechts gewandt
  stand(c) {
    c.moveTo(-3.4, -13.8);
    c.quadraticCurveTo(0, -15.4, 3.4, -13.8);
    c.lineTo(4.9, -12.4);
    c.lineTo(5.6, -7.4);
    c.lineTo(4.2, -7.2);
    c.lineTo(3.4, -10.2);
    c.lineTo(2.9, -6.4);
    c.lineTo(3.9, 0);
    c.lineTo(1.4, 0);
    c.lineTo(0, -4.6);
    c.lineTo(-1.4, 0);
    c.lineTo(-3.9, 0);
    c.lineTo(-2.9, -6.4);
    c.lineTo(-3.4, -10.2);
    c.lineTo(-4.2, -7.2);
    c.lineTo(-5.6, -7.4);
    c.lineTo(-4.9, -12.4);
    c.closePath();
    c.moveTo(2.7, -17);
    c.arc(0, -17, 2.7, 0, Math.PI * 2);
  },
  // Sprung/Ausfall nach rechts, vorderer Arm gestreckt
  lunge(c) {
    c.moveTo(1.8, -14.4);
    c.quadraticCurveTo(5, -15.4, 7.6, -12.8);
    c.lineTo(11.8, -10.6);
    c.lineTo(11.2, -8.6);
    c.lineTo(7, -9.4);
    c.lineTo(5.6, -7);
    c.lineTo(8.2, -4);
    c.lineTo(6.6, 0.2);
    c.lineTo(4.2, 0.2);
    c.lineTo(5.4, -3.6);
    c.lineTo(2.4, -4.8);
    c.lineTo(-3.6, -2.8);
    c.lineTo(-9.2, -2.2);
    c.lineTo(-9.6, -4.2);
    c.lineTo(-4.4, -5.6);
    c.lineTo(-1.6, -7.8);
    c.lineTo(-0.8, -10.6);
    c.lineTo(-5.6, -12.2);
    c.lineTo(-5.8, -13.8);
    c.lineTo(-0.2, -13.4);
    c.closePath();
    c.moveTo(7.8, -16.4);
    c.arc(5.2, -16.4, 2.6, 0, Math.PI * 2);
  }
};
const IK_NINJA_HEAD = { stand: [0, -17], lunge: [5.2, -16.4] };
// Hand, die den Dolch hält (o.dagger = [Winkel, Länge] in Figureinheiten)
const IK_NINJA_HAND = { stand: [4.9, -7.4], lunge: [11.4, -9.5] };

// Ninja-Figur bei (x,y) (Füße), Höhe h. o: pose, lean, body [hell, mitte, dunkel], rim, eye, scarf, alpha
function ikNinjaFigure(ctx, IK, x, y, h, o = {}) {
  const pose = o.pose || 'stand';
  const path = IK_NINJA_POSES[pose];
  const body = o.body || ['#6a5a9a', '#241a3a', '#08040e'];
  const k = h / 20;
  const [hx, hy] = IK_NINJA_HEAD[pose];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.lean || 0);
  ctx.scale(k, k);
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  // Stirnband-Enden flattern nach hinten
  if (o.scarf !== false) {
    const sc = o.scarfCol || ['#ff8aa0', '#a0182a'];
    IK.fill(ctx, (c) => {
      c.moveTo(hx - 1.8, hy - 1.1);
      c.quadraticCurveTo(hx - 5.5, hy - 2.6, hx - 9.2, hy - 0.8);
      c.quadraticCurveTo(hx - 6, hy - 0.6, hx - 4.6, hy + 0.2);
      c.quadraticCurveTo(hx - 6.4, hy + 1.2, hx - 8.2, hy + 3.4);
      c.quadraticCurveTo(hx - 4.6, hy + 2.4, hx - 1.8, hy + 0.6);
      c.closePath();
    }, IK.lin(ctx, hx, hy - 2, hx - 9, hy, [[0, sc[0]], [1, sc[1]]]), 0.7 / k);
  }
  IK.fill(ctx, path, IK.lin(ctx, -6, -20, 6, 0, [[0, body[0]], [0.45, body[1]], [1, body[2]]]), 1 / k, 'rgba(4,2,8,0.9)');
  // Randlicht oben links: Umriss nach unten rechts versetzt, auf die Figur beschnitten
  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.clip();
  ctx.translate(0.45, 0.45);
  ctx.beginPath();
  path(ctx);
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = o.rim || 'rgba(200,180,255,0.6)';
  ctx.stroke();
  ctx.restore();
  if (o.dagger) {
    const [dx, dy] = IK_NINJA_HAND[pose];
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(0.5, 0.5);
    IK.glow(ctx, o.daggerGlow || '#d8c8ff', 4, () => IK.dagger(ctx, 0, 0, o.dagger[1], o.dagger[0], { w: 4 }));
    ctx.restore();
  }
  // Augenschlitz
  if (o.eye !== false) {
    const ex = pose === 'lunge' ? hx + 0.2 : hx;
    IK.glow(ctx, o.eye || '#e8d8ff', 3, () => IK.fill(ctx, (c) => c.ellipse(ex + 0.5, hy - 0.2, 1.9, 0.5, 0, 0, Math.PI * 2), o.eye || '#f0e6ff', 0));
  }
  ctx.restore();
}

// leuchtender Schnitt (sichelförmig) von (x0,y0) nach (x1,y1), Bauch w
function ikNinjaSlash(ctx, IK, x0, y0, x1, y1, w, color = '#ffffff', glowCol = '#c8a0ff') {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  IK.glow(ctx, glowCol, 5, () => {
    IK.fill(ctx, (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1);
      c.quadraticCurveTo(mx + nx * w * 0.25, my + ny * w * 0.25, x0, y0);
      c.closePath();
    }, IK.lin(ctx, x0, y0, x1, y1, [[0, 'rgba(255,255,255,0)'], [0.35, glowCol], [0.6, color], [1, color]]), 0);
  });
}

// Rauchfaden: Kurve von (x0,y0) über (cx,cy) nach (x1,y1), läuft zum Ende hin aus
function ikNinjaWisp(ctx, IK, x0, y0, cx, cy, x1, y1, w, rgb = '224,212,255', a = 0.8) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = IK.lin(ctx, x0, y0, x1, y1, [[0, `rgba(${rgb},${a})`], [1, `rgba(${rgb},0)`]]);
  for (const [lw, k] of [[w * 2.2, 0.35], [w, 1]]) {
    ctx.globalAlpha = k;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

// fünfzackiger Stern (Betäubung)
function ikNinjaStar(ctx, IK, x, y, r, pal = ['#fffbe0', '#ffd84a', '#b8780a']) {
  IK.glow(ctx, pal[1], 4, () => IK.fill(ctx, (c) => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }, IK.rad(ctx, x - r * 0.3, y - r * 0.3, 0, r * 1.2, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]), 0.7));
}

// Vogelfeder: Kiel bei (x,y), Länge len, Winkel ang (0 = nach oben)
function ikNinjaFeather(ctx, IK, x, y, len, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const k = len / 30;
  ctx.scale(k, k);
  // Fahne: links schmal, rechts breit, Spitze rund, zwei Kerben
  const vane = (c) => {
    c.moveTo(0, -2);
    c.bezierCurveTo(-4.6, -6, -5.2, -14, -4.4, -19);
    c.lineTo(-2.6, -18.4);
    c.bezierCurveTo(-4.4, -22, -3.6, -27, -1.2, -29.4);
    c.quadraticCurveTo(1, -31, 2.6, -28.4);
    c.bezierCurveTo(6.4, -24, 7.4, -18, 6.6, -14);
    c.lineTo(4.2, -13.6);
    c.bezierCurveTo(6.6, -10, 5.6, -6, 0.8, -2);
    c.closePath();
  };
  IK.glow(ctx, '#e0fff0', 6, () => IK.fill(ctx, vane, IK.lin(ctx, -5, -10, 7, -18, [[0, '#ffffff'], [0.45, '#f2fffa'], [0.55, '#c8eee2'], [1, '#78b8a8']]), 1 / k, 'rgba(10,30,24,0.9)'));
  // Fahnenstrahlen
  ctx.save();
  ctx.beginPath();
  vane(ctx);
  ctx.clip();
  ctx.lineWidth = 0.45;
  for (let i = 0; i < 13; i++) {
    const yy = -4 - i * 2;
    ctx.strokeStyle = 'rgba(70,130,115,0.5)';
    ctx.beginPath();
    ctx.moveTo(0.3, yy);
    ctx.quadraticCurveTo(-2, yy - 1.2, -6, yy - 4);
    ctx.moveTo(0.3, yy);
    ctx.quadraticCurveTo(3, yy - 1.2, 8, yy - 4.4);
    ctx.stroke();
  }
  // Glanz auf der linken Fahne
  ctx.fillStyle = IK.rad(ctx, -2, -16, 0, 6, [[0, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(-8, -24, 10, 16);
  ctx.restore();
  // Kiel, leicht gebogen
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,60,50,0.8)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-0.6, 4);
  ctx.quadraticCurveTo(0.8, -14, 0.6, -28.5);
  ctx.stroke();
  ctx.strokeStyle = '#fffdf0';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // Flaum am Kiel
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 0.5;
  for (const [dx, dy] of [[-2.6, -1.4], [-2.2, 0.2], [2.4, -1.2], [2.8, 0.4]]) {
    ctx.beginPath();
    ctx.moveTo(-0.2, -1 + dy * 0.3);
    ctx.quadraticCurveTo(dx * 0.6, dy - 1, dx, dy);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Motive -----------------------------------------------------------------------------------------
Object.assign(SKILL_ART, {
  // Hinterhalt: aus einer Rauchwolke (mit leuchtenden Augen) stößt ein großer Dolch schräg nach unten,
  // violetter Kreuzstich und rosa Funken am Ziel
  hinterhalt(ctx, IK) {
    IK.light(ctx, 9, 9, 12, '#ff8ac8', 0.6);
    IK.glow(ctx, '#c8a0ff', 6, () => IK.dagger(ctx, -4, -4, 21, Math.PI * 0.75, { w: 5 }));
    ikNinjaSmoke(ctx, IK, -10, -10, 7.5, 3, ['#d8c8ff', '#6a58a0', '#1a1030'], 6);
    IK.glow(ctx, '#e0c8ff', 4, () => IK.fill(ctx, (c) => { c.ellipse(-13, -11, 1.6, 0.65, 0.35, 0, Math.PI * 2); c.moveTo(-7.4, -12.6); c.ellipse(-9, -12.4, 1.6, 0.65, 0.35, 0, Math.PI * 2); }, '#ffffff', 0));
    ikNinjaSlash(ctx, IK, 3, 3, 17, 15, 3.6, '#ffffff', '#c890ff');
    ikNinjaSlash(ctx, IK, 17, 3, 4, 16, 3.6, '#ffffff', '#c890ff');
    IK.light(ctx, 10, 9, 5, '#ffffff', 0.9);
    IK.sparkles(ctx, 7, '#ffb0d8', 5, 7, 9, 9, 1.4);
  },

  // Tarnung: halb durchsichtige Ninja-Gestalt, die sich nach rechts in Rauch und Schimmer auflöst
  tarnung(ctx, IK) {
    IK.shock(ctx, 0, 14, 13, 3.6, '#c8a0ff', 1.3);
    IK.light(ctx, 0, -2, 18, '#b8a6ff', 0.45);
    ikNinjaFigure(ctx, IK, -2, 15, 30, { body: ['rgba(250,246,255,0.95)', 'rgba(170,150,230,0.6)', 'rgba(60,50,120,0.05)'], rim: 'rgba(255,255,255,0.95)', scarfCol: ['rgba(240,230,255,0.9)', 'rgba(120,100,200,0.2)'], eye: '#ffffff' });
    // rechts zerfällt die Gestalt in aufsteigende Rauchfäden und Lichtpunkte
    ikNinjaWisp(ctx, IK, 4, -4, 12, -6, 10, -15, 2.4);
    ikNinjaWisp(ctx, IK, 5, 3, 14, 2, 16, -7, 2);
    ikNinjaWisp(ctx, IK, 3, 9, 12, 10, 17, 3, 1.6);
    for (const [x, y, r] of [[11, -10, 1.3], [15, -2, 1], [9, 6, 1.1], [16, 9, 0.8], [13, -15, 0.8]]) IK.light(ctx, x, y, r * 3, '#ffffff', 0.9);
    IK.sparkles(ctx, 7, '#f0e6ff', 4, 9, 11, -2, 1.2);
  },
  // Wirbelklinge: zwei Dolche jagen im Kreis um die Mitte, violette Wirbelspuren
  wirbelklinge(ctx, IK) {
    IK.light(ctx, 0, 0, 11, '#c8a0ff', 0.7);
    IK.swirl(ctx, 0, 0, 1, 6.5, 1.4, '#e8d8ff', 1.8);
    IK.trail(ctx, 0, 0, 14, Math.PI * 0.15, Math.PI * 1.1, 7, '#b890ff');
    IK.trail(ctx, 0, 0, 14, Math.PI * 1.15, Math.PI * 2.1, 7, '#b890ff');
    IK.trail(ctx, 0, 0, 10, Math.PI * 0.4, Math.PI * 1.05, 2.4, '#fff1ff');
    IK.trail(ctx, 0, 0, 10, Math.PI * 1.4, Math.PI * 2.05, 2.4, '#fff1ff');
    // Dolche als Sehne am Ende der Spuren: Griff hinten, Spitze vorn auf dem Kreis (Drehrichtung)
    for (const a of [Math.PI * 1.1, Math.PI * 2.1]) {
      const gx = Math.cos(a - 1.15) * 11.5;
      const gy = Math.sin(a - 1.15) * 11.5;
      IK.glow(ctx, '#d8b8ff', 5, () => IK.dagger(ctx, gx, gy, 13, a + Math.PI - 0.575, { w: 4.8 }));
    }
    IK.sparkles(ctx, 6, '#f0e0ff', 8, 19);
  },

  // Blitzangriff: blasses Nachbild unten links, Blitzstreifen schräg hinauf zum Dolch, Einschlag mit Betäubungsstern
  blitzangriff(ctx, IK) {
    ikNinjaFigure(ctx, IK, -13, 16, 19, { alpha: 0.42, body: ['#d8e8ff', '#6a8ad8', '#1a2a5a'], rim: 'rgba(255,255,255,0.8)', scarfCol: ['#d8e8ff', '#6a8ad8'], eye: '#ffffff' });
    IK.bolt(ctx, [[-15, 9], [-11, 3], [-8, 7], [-5, 0], [-2, 3]], '#fff7b0', 3.4, '#7ab0ff');
    IK.light(ctx, 12, -12, 10, '#9fd0ff', 0.9);
    IK.glow(ctx, '#9fd0ff', 6, () => IK.dagger(ctx, 3, -3, 16, Math.PI * 0.25, { w: 4.8 }));
    for (const [a, l] of [[-0.6, 6], [0.4, 5], [1.4, 6], [2.4, 4]]) {
      IK.bolt(ctx, IK.zigzag(13, -13, 13 + Math.cos(a - 1.2) * l, -13 + Math.sin(a - 1.2) * l, 3, 1, 2 + l), '#fff7b0', 0.9, '#7ab0ff');
    }
    ikNinjaStar(ctx, IK, 0, -14, 3.2);
    ikNinjaStar(ctx, IK, 15, 2, 2.6);
    IK.light(ctx, 13, -13, 4, '#ffffff', 1);
  },

  // Leichtfüßigkeit: weiße Feder schwebt in Windbändern
  leichtfuessigkeit(ctx, IK) {
    IK.light(ctx, 1, -2, 14, '#e0fff0', 0.65);
    // Windbänder umströmen die Feder
    ikNinjaWisp(ctx, IK, 17, -9, 2, -17, -14, -8, 2.2, '255,255,255', 0.9);
    ikNinjaWisp(ctx, IK, -17, 7, -4, 16, 13, 10, 2.2, '255,255,255', 0.9);
    ikNinjaWisp(ctx, IK, 16, 2, 8, -2, 0, 3, 1.4, '224,255,240', 0.8);
    ikNinjaWisp(ctx, IK, -16, -2, -8, 2, -2, -4, 1.4, '224,255,240', 0.8);
    ikNinjaFeather(ctx, IK, -8, 13, 32, 0.7);
    IK.sparkles(ctx, 6, '#ffffff', 11, 18);
  },
  // Schattensprung: Ninja im Sprung nach rechts, Rauchschleppe dahinter, X-Schnitt am Ziel
  schattensprung(ctx, IK) {
    const pal = ['#c8b8f0', '#5a4a8a', '#140c24'];
    ikNinjaSmoke(ctx, IK, -16, 12, 4.4, 2, pal, 5, 0.5);
    ikNinjaSmoke(ctx, IK, -12, 8, 5.6, 4, pal, 5, 0.75);
    ikNinjaSmoke(ctx, IK, -6, 5, 6.4, 6, pal, 5, 0.95);
    ikNinjaSlash(ctx, IK, 8, -16, 18, -2, 3, '#ffffff', '#b890ff');
    ikNinjaSlash(ctx, IK, 18, -15, 7, -2, 3, '#ffffff', '#b890ff');
    IK.light(ctx, 13, -9, 6, '#ffffff', 0.7);
    IK.light(ctx, 0, 2, 14, '#c8a0ff', 0.6);
    ikNinjaFigure(ctx, IK, -4, 15, 27, { pose: 'lunge', lean: 0.15, dagger: [Math.PI * 0.45, 14] });
  },

  // Lähmende Klinge: Dolch mit giftgrün leuchtender Klinge, Gifttropfen, Betäubungssterne kreisen
  laehmklinge(ctx, IK) {
    IK.light(ctx, 2, 6, 13, '#8fd16a', 0.7);
    IK.glow(ctx, '#8fd16a', 7, () => IK.dagger(ctx, -2, -10, 22, Math.PI * 0.95, { w: 4.6, light: '#f0ffd0', mid: '#a8f070', dark: '#3a9a2a', dark2: '#1a5a14', gold: '#8a9a5a' }));
    IK.drop(ctx, 4, 16, 1.8, ['#e8ffb0', '#6ac83a', '#1a5a10']);
    IK.drop(ctx, 9, 10, 1.3, ['#e8ffb0', '#6ac83a', '#1a5a10']);
    IK.sparkles(ctx, 4, '#c8ff8a', 3, 6, 4, 10, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffe98a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(-1, -13, 11, 3.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ikNinjaStar(ctx, IK, -11, -13, 3.2);
    ikNinjaStar(ctx, IK, 9, -15, 2.6);
    ikNinjaStar(ctx, IK, 5, -10, 3);
  },
  // Schattenmantel: dunkler Kapuzenmantel mit violetten Augen im Schatten, zerfaserter Saum, Rauch steigt auf, violetter Ring
  schattenmantel(ctx, IK) {
    IK.shock(ctx, 0, 14, 15, 4, '#b890ff', 1.4);
    IK.light(ctx, 0, -3, 18, '#9a7aff', 0.6);
    // aufsteigender Rauch neben dem Mantel
    ikNinjaWisp(ctx, IK, -11, 8, -17, -2, -12, -14, 2.4, '184,150,255');
    ikNinjaWisp(ctx, IK, 11, 8, 17, -2, 12, -14, 2.4, '184,150,255');
    ikNinjaWisp(ctx, IK, -7, 12, -12, 2, -8, -6, 1.6, '220,200,255');
    // Kapuzenmantel mit zerfasertem Saum
    const cloak = (c) => {
      c.moveTo(0, -18.5);
      c.bezierCurveTo(6, -18.5, 7.4, -12.5, 6.6, -9);
      c.bezierCurveTo(10.6, -6, 12.6, 3, 13.6, 11);
      c.lineTo(10.6, 9);
      c.lineTo(8.6, 14);
      c.lineTo(5.8, 10);
      c.lineTo(3, 15);
      c.lineTo(0, 11);
      c.lineTo(-3, 15);
      c.lineTo(-5.8, 10);
      c.lineTo(-8.6, 14);
      c.lineTo(-10.6, 9);
      c.lineTo(-13.6, 11);
      c.bezierCurveTo(-12.6, 3, -10.6, -6, -6.6, -9);
      c.bezierCurveTo(-7.4, -12.5, -6, -18.5, 0, -18.5);
      c.closePath();
    };
    IK.glow(ctx, '#8a5aff', 6, () => IK.fill(ctx, cloak, IK.lin(ctx, -10, -18, 10, 14, [[0, '#7a6ab8'], [0.35, '#2e2250'], [1, '#05030c']]), 1.2, 'rgba(4,2,10,0.95)'));
    ctx.save();
    ctx.beginPath();
    cloak(ctx);
    ctx.clip();
    // Falten
    for (const [x0, x1, col] of [[-4, -7, 'rgba(160,140,230,0.35)'], [3, 5, 'rgba(0,0,0,0.45)'], [-1, -1.5, 'rgba(0,0,0,0.35)']]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, -7);
      ctx.quadraticCurveTo(x0 + (x1 - x0) * 0.3, 2, x1, 13);
      ctx.stroke();
    }
    // Randlicht oben links
    ctx.translate(0.6, 0.6);
    ctx.beginPath();
    cloak(ctx);
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = 'rgba(210,190,255,0.75)';
    ctx.stroke();
    ctx.restore();
    // dunkles Gesicht in der Kapuze, violette Augen
    IK.fill(ctx, (c) => c.ellipse(0, -11, 3.8, 4.4, 0, 0, Math.PI * 2), IK.rad(ctx, 0, -12, 0, 4.4, [[0, '#000000'], [0.7, '#0a0614'], [1, '#2a1e48']]), 0.6);
    IK.glow(ctx, '#c8a0ff', 4, () => IK.fill(ctx, (c) => { c.ellipse(-1.5, -11.6, 1.1, 0.55, 0.2, 0, Math.PI * 2); c.moveTo(2.6, -11.6); c.ellipse(1.5, -11.6, 1.1, 0.55, -0.2, 0, Math.PI * 2); }, '#f0e0ff', 0));
    // Rauch am Saum
    ikNinjaWisp(ctx, IK, -12, 13, -6, 9, 0, 15, 2.2, '184,150,255', 0.7);
    ikNinjaWisp(ctx, IK, 12, 13, 6, 9, 0, 15, 2.2, '184,150,255', 0.7);
    IK.sparkles(ctx, 5, '#d8c8ff', 2, 17, 0, -4, 1.2);
  },
  // Schattendoppelgänger: sechs violette Doppelgänger im Kreis um das Ziel, weißer Kreuzschnitt in der Mitte
  schattenklone(ctx, IK) {
    IK.light(ctx, 0, 0, 18, '#c9b8ff', 0.55);
    IK.shock(ctx, 0, 4, 15, 8, '#c9b8ff', 1.2);
    const clone = { body: ['#ece4ff', '#8a6ad8', '#2a1a5a'], rim: 'rgba(255,255,255,0.85)', scarfCol: ['#e0d4ff', '#7a5ac8'], eye: '#ffffff' };
    // sechs Doppelgänger im Kreis (perspektivisch), hintere zuerst
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ring.push([Math.cos(a) * 13.5, 3 + Math.sin(a) * 8, Math.sin(a)]);
    }
    ring.sort((p, q) => p[2] - q[2]);
    for (const [x, y, d] of ring) ikNinjaFigure(ctx, IK, x, y + 7, 14 + d * 2.5, { ...clone, alpha: 0.72 + d * 0.25 });
    // großer weißer Kreuzschnitt über dem Ziel in der Mitte
    IK.light(ctx, 0, 0, 8, '#ffffff', 0.8);
    ikNinjaSlash(ctx, IK, -10, -12, 10, 6, 3.6, '#ffffff', '#d8c8ff');
    ikNinjaSlash(ctx, IK, 10, -12, -10, 6, 3.6, '#ffffff', '#d8c8ff');
    IK.light(ctx, 0, -3, 4, '#ffffff', 1);
    IK.sparkles(ctx, 6, '#ffffff', 9, 18, 0, -4);
  },
  // Todesmal: rot glühende Rune mit Schädel schwebt über einem Runenkreis, roter Himmelsstrahl
  todesmal(ctx, IK) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, -5, 0, 5, 0, [[0, 'rgba(255,40,80,0)'], [0.5, 'rgba(255,90,120,0.55)'], [1, 'rgba(255,40,80,0)']]);
    ctx.fillRect(-5, -24, 10, 40);
    ctx.restore();
    IK.shock(ctx, 0, 14, 15, 4, '#ff4a6a', 1.4);
    IK.light(ctx, 0, -3, 17, '#ff2a4a', 0.7);
    // Runenring
    IK.glow(ctx, '#ff2a4a', 6, () => {
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = IK.lin(ctx, -12, -15, 12, 9, [[0, '#ffb0c0'], [0.5, '#ff3a5a'], [1, '#8a0a1a']]);
      ctx.beginPath();
      ctx.arc(0, -3, 12.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(0, -3, 9.6, 0, Math.PI * 2);
      ctx.stroke();
      // Runenzeichen zwischen den Ringen
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#ffd0d8';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const cx = Math.cos(a) * 11;
        const cy = -3 + Math.sin(a) * 11;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * 0.9, cy - Math.sin(a) * 0.9);
        ctx.lineTo(cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.9);
        ctx.lineTo(cx + Math.cos(a + 1.6) * 0.8, cy + Math.sin(a + 1.6) * 0.8);
        ctx.stroke();
      }
    });
    IK.skull(ctx, 0, -3.5, 8.4, ['#ffe0e4', '#d87a88', '#5a0a1a'], '#ff2a4a');
    IK.sparkles(ctx, 6, '#ff8a9a', 12, 19, 0, -2);
  }
});

// Hintergründe: jede Fertigkeit eigene Farbe
Object.assign(SKILL_ART_THEME, {
  hinterhalt: 'schatten',
  tarnung: 'knochen',
  laehmklinge: 'seele',
  schattensprung: 'm_blitz',
  schattenmantel: 'm_frost',
  schattenklone: 'gold',
  todesmal: 'blut'
});
