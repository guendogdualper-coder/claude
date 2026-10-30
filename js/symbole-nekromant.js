// Fertigkeitssymbole Nekromant (seit 9.6), Stil und Hilfen in symbol-kunst.js

// --- eigene Zeichenhilfen (Präfix ikNekro) -------------------------------------------------------
const IK_NEKRO_BONE = ['#fffaf0', '#e4d8bc', '#9a8a6a'];

// gebogener Knochen (Rippe) als Kurve von (x0,y0) über (cx,cy) nach (x1,y1), mit Kontur und Glanzlinie
function ikNekroRib(ctx, x0, y0, cx, cy, x1, y1, w, pal = IK_NEKRO_BONE) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
  };
  ctx.save();
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = 'rgba(14,8,4,0.92)';
  ctx.lineWidth = w + 1.8;
  ctx.stroke();
  path();
  ctx.strokeStyle = IK.lin(ctx, Math.min(x0, x1) - 4, Math.min(y0, y1), Math.max(x0, x1) + 4, Math.max(y0, y1), [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.translate(-w * 0.18, -w * 0.18);
  path();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = w * 0.28;
  ctx.stroke();
  ctx.restore();
}

// Knochenhand (Skelett), Handgelenk bei (x,y), Finger zeigen in Winkel ang (0 = nach oben), Größe s (~1 = 14 hoch)
function ikNekroHand(ctx, x, y, s, ang, pal = IK_NEKRO_BONE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const bone = IK.lin(ctx, -6, -12, 6, 6, [[0, pal[0]], [0.55, pal[1]], [1, pal[2]]]);
  // Handfläche
  IK.fill(ctx, (c) => {
    c.moveTo(-5.4, -3.2);
    c.quadraticCurveTo(0, -5, 5.4, -3.2);
    c.quadraticCurveTo(5.6, 2, 2.6, 5.2);
    c.lineTo(-2.6, 5.2);
    c.quadraticCurveTo(-5.6, 2, -5.4, -3.2);
    c.closePath();
  }, bone, 1);
  // Unterarm
  IK.fill(ctx, (c) => c.rect(-2, 5, 1.6, 6), bone, 0.8);
  IK.fill(ctx, (c) => c.rect(0.5, 5, 1.6, 6), bone, 0.8);
  // Finger, gekrümmt wie Klauen
  const fingers = [
    [[-4.4, -3.4], [-5.4, -8], [-4.6, -11.4]],
    [[-1.5, -4.2], [-1.8, -10], [-0.8, -13.4]],
    [[1.6, -4.2], [2.2, -9.6], [3.2, -12.6]],
    [[4.6, -3.2], [5.8, -7.6], [7, -10]],
    [[5, 1], [9, -1.6], [11, -5]]
  ];
  for (const f of fingers) {
    IK.line(ctx, f, '#e4d8bc', 1.9, 'rgba(14,8,4,0.92)');
    for (const [jx, jy] of f.slice(0, 2)) IK.fill(ctx, (c) => c.arc(jx, jy, 1.15, 0, Math.PI * 2), IK.rad(ctx, jx - 0.4, jy - 0.4, 0, 1.4, [[0, '#ffffff'], [1, '#c8b898']]), 0.6);
  }
  ctx.restore();
}

// Seelengeist (Kopf mit Schleppe): Kopf bei (x,y), Schleppe zeigt in Winkel ang, Größe s
function ikNekroWisp(ctx, x, y, s, ang, col = '#a8ffe0', core = '#effff8') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s / 10, s / 10);
  IK.glow(ctx, col, 4, () => IK.fill(ctx, (c) => {
    c.arc(0, 0, 4, Math.PI, 0);
    c.bezierCurveTo(4, 4, 2, 7, 3, 10);
    c.bezierCurveTo(1, 9, 1, 12, 0, 16);
    c.bezierCurveTo(-1, 12, -2, 9, -3, 10);
    c.bezierCurveTo(-2, 7, -4, 4, -4, 0);
    c.closePath();
  }, IK.lin(ctx, 0, -4, 0, 16, [[0, core], [0.4, col], [1, 'rgba(60,200,140,0)']]), 0.7, 'rgba(8,40,28,0.7)'));
  for (const ex of [-1.5, 1.5]) IK.fill(ctx, (c) => c.ellipse(ex, -0.4, 0.9, 1.3, 0, 0, Math.PI * 2), '#0c2a20', 0);
  ctx.restore();
}

// Knochenspitze (Dorn aus dem Boden): Fuß bei (x,y), Höhe h, Breite w, leicht geneigt
function ikNekroSpike(ctx, x, y, h, w, lean = 0, pal = IK_NEKRO_BONE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  IK.fill(ctx, (c) => {
    c.moveTo(-w / 2, 0);
    c.quadraticCurveTo(-w * 0.35, -h * 0.55, 0, -h);
    c.quadraticCurveTo(w * 0.4, -h * 0.5, w / 2, 0);
    c.closePath();
  }, IK.lin(ctx, -w / 2, 0, w / 2, 0, [[0, pal[0]], [0.45, pal[1]], [1, pal[2]]]), 0.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, -0.6);
  ctx.quadraticCurveTo(-w * 0.12, -h * 0.5, -0.2, -h + 1);
  ctx.stroke();
  ctx.restore();
}

// Herz/Blutkugel wie oben, aber als Herz
function ikNekroHeart(ctx, x, y, s, pal = ['#ffb0b8', '#d01430', '#4a0410']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 10, s / 10);
  IK.fill(ctx, (c) => {
    c.moveTo(0, 9);
    c.bezierCurveTo(-6, 4, -10, 0, -10, -4);
    c.bezierCurveTo(-10, -9, -3, -10, 0, -5);
    c.bezierCurveTo(3, -10, 10, -9, 10, -4);
    c.bezierCurveTo(10, 0, 6, 4, 0, 9);
    c.closePath();
  }, IK.rad(ctx, -4, -4, 0, 14, [[0, pal[0]], [0.45, pal[1]], [1, pal[2]]]), 1.2);
  IK.fill(ctx, (c) => c.ellipse(-5, -5, 2.2, 1.3, -0.6, 0, Math.PI * 2), 'rgba(255,255,255,0.75)', 0);
  ctx.restore();
}

// Kometenschweif von Kopf (x,y) zum Ursprung (ox,oy), Breite w am Kopf, additiv leuchtend
function ikNekroTail(ctx, x, y, ox, oy, w, col) {
  const a = Math.atan2(oy - y, ox - x);
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const len = Math.hypot(ox - x, oy - y);
  const ex = x + Math.cos(a) * len * 0.85;
  const ey = y + Math.sin(a) * len * 0.85;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [k, al] of [[1.3, 0.35], [0.7, 0.7], [0.3, 0.9]]) {
    ctx.globalAlpha = al;
    ctx.fillStyle = IK.lin(ctx, x, y, ex, ey, [[0, k < 0.5 ? '#effff8' : col], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath();
    ctx.moveTo(x + nx * w * k, y + ny * w * k);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.4 + nx * w * k * 0.6, y + Math.sin(a) * len * 0.4 + ny * w * k * 0.6, ex, ey);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.4 - nx * w * k * 0.6, y + Math.sin(a) * len * 0.4 - ny * w * k * 0.6, x - nx * w * k, y - ny * w * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- Motive --------------------------------------------------------------------------------------
Object.assign(SKILL_ART, {
  // Schädelsalve: drei brennende Schädel fliegen im Fächer nach oben rechts, grüne Flammenschleppen
  schaedelsalve(ctx, IK) {
    const o = [-19, 19];
    const skulls = [[-7, -10.5, 6.6], [12, 7, 6.6], [3, -1.5, 10]];
    IK.light(ctx, -15, 15, 9, '#7affc8', 0.6);
    for (const [x, y, s] of skulls) ikNekroTail(ctx, x, y, o[0], o[1], s * 0.85, '#4aff8a');
    for (const [x, y, s] of skulls) {
      const ang = Math.atan2(o[0] - x, -(o[1] - y));
      IK.flame(ctx, x + Math.sin(ang) * s * 0.35, y - Math.cos(ang) * s * 0.35, s * 1.15, ang, ['#0e7a3a', '#4aff8a', '#eaffd0']);
    }
    for (const [x, y, s] of skulls) {
      IK.light(ctx, x, y, s * 1.3, '#7affc8', 0.4);
      IK.glow(ctx, '#7affc8', 4, () => IK.skull(ctx, x, y, s));
    }
    IK.sparkles(ctx, 6, '#c8ffe0', 4, 18, 0, 0, 1.2);
  },

  // Seelenkäfig: sechs Rippen brechen aus der Erde und schließen sich über einem schreienden Geist
  seelenkaefig(ctx, IK) {
    // Erde und grüne Rune
    IK.fill(ctx, (c) => c.ellipse(0, 15, 18, 5, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 14, 1, 18, [[0, '#3a2a1c'], [1, '#120a06']]), 0.8);
    IK.shock(ctx, 0, 14.5, 14, 3.6, '#7fe3a0', 1.2);
    IK.light(ctx, 0, 4, 13, '#a8ffe0', 0.6);
    // hintere Rippen
    for (const bx of [-6, 6]) ikNekroRib(ctx, bx, 14, bx * 2.1, 0, 0, -17, 2.2, ['#c8bca0', '#9a8a6a', '#5a4a3a']);
    // Geist
    IK.glow(ctx, '#a8ffe0', 6, () => IK.fill(ctx, (c) => {
      c.arc(0, -3, 6, Math.PI, 0);
      c.bezierCurveTo(6, 3, 5, 7, 6, 12);
      c.bezierCurveTo(3, 10, 2, 13, 0, 11);
      c.bezierCurveTo(-2, 13, -3, 10, -6, 12);
      c.bezierCurveTo(-5, 7, -6, 3, -6, -3);
      c.closePath();
    }, IK.lin(ctx, 0, -9, 0, 13, [[0, '#f0fff8'], [0.5, '#a8ffd8'], [1, 'rgba(80,220,160,0.5)']]), 0.8, 'rgba(10,40,30,0.8)'));
    // Augen und schreiender Mund
    for (const ex of [-2.4, 2.4]) IK.fill(ctx, (c) => c.ellipse(ex, -4, 1.3, 1.9, ex < 0 ? 0.3 : -0.3, 0, Math.PI * 2), '#0a2a1e', 0);
    IK.fill(ctx, (c) => c.ellipse(0, 2, 1.9, 3, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 2, 0, 3, [[0, '#000000'], [1, '#14402e']]), 0);
    // vordere Rippen
    for (const bx of [-15, -10, 10, 15]) ikNekroRib(ctx, bx, 15, bx * 1.25, -3, bx * 0.08, -17.5, 2.6);
    IK.fill(ctx, (c) => c.arc(0, -17, 2.2, 0, Math.PI * 2), IK.rad(ctx, -0.6, -17.6, 0, 2.4, [[0, '#ffffff'], [1, '#b8a888']]), 0.9);
    // Schreiwellen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#a8ffe0';
    for (const [r, a] of [[11, 0.5], [15, 0.3]]) {
      ctx.globalAlpha = a;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 1, r, -0.5, 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 1, r, Math.PI - 0.5, Math.PI + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Totenbeschwörung: ein Skelett steigt aus der aufgebrochenen Erde, Knochenhände greifen links und rechts heraus
  totenbeschwoerung(ctx, IK) {
    IK.light(ctx, 0, 8, 18, '#7affc8', 0.5);
    // Rippenkorb und Schultern, halb in der Erde
    IK.glow(ctx, '#7affc8', 5, () => {
      IK.bone(ctx, -9, 0, 9, 0, 2, ['#fff6e0', '#b8a888']);
      IK.line(ctx, [[0, -2], [0, 12]], '#d8ccb0', 2.2, 'rgba(14,8,4,0.9)');
      for (const [y, w] of [[3, 6.5], [6, 7.2], [9, 7.6]]) {
        ikNekroRib(ctx, 0, y - 1, -w, y - 1, -w + 1, y + 2.4, 1.5);
        ikNekroRib(ctx, 0, y - 1, w, y - 1, w - 1, y + 2.4, 1.5);
      }
      IK.skull(ctx, 0, -9, 10);
    });
    // Erde mit Rissen, aus denen grünes Licht dringt
    IK.fill(ctx, (c) => {
      c.moveTo(-20, 11);
      c.lineTo(-11, 8.5);
      c.lineTo(-5, 11);
      c.lineTo(0, 9);
      c.lineTo(6, 11.5);
      c.lineTo(12, 8.5);
      c.lineTo(20, 11);
      c.lineTo(20, 24);
      c.lineTo(-20, 24);
      c.closePath();
    }, IK.lin(ctx, 0, 8, 0, 22, [[0, '#6a4a2a'], [0.35, '#3a2614'], [1, '#140a04']]), 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const crack of [[[-14, 9.6], [-11, 14], [-13, 18]], [[2, 9.6], [0, 14], [3, 19]], [[13, 9], [11, 13], [14, 17]]]) {
      IK.line(ctx, crack, 'rgba(122,255,200,0.9)', 1.1, 'rgba(40,160,100,0.35)');
    }
    ctx.restore();
    IK.shock(ctx, 0, 15, 15, 3, '#7affc8', 0.9);
    // Knochenhände
    ikNekroHand(ctx, -13, 13, 0.62, -0.25);
    ikNekroHand(ctx, 13.5, 13, 0.62, 0.3);
    IK.sparkles(ctx, 6, '#c8ffe0', 8, 17, 0, -2, 1.1);
  },

  // Totenruf (seit 10.0): ein Grabstein auf frischer Erde, darüber steigt ein bleicher Wolfsgeist mit leuchtenden
  // Augen und Nebelschweif auf; grünes Seelenlicht am Grab
  totenruf(ctx, IK) {
    IK.light(ctx, -3, 12, 13, '#7fe3a0', 0.55);
    // Erdhügel
    IK.fill(ctx, (c) => c.ellipse(-3, 15, 13, 4.5, 0, 0, Math.PI * 2), IK.lin(ctx, 0, 11, 0, 19, [[0, '#6a5038'], [1, '#2a1c12']]), 1);
    // Grabstein mit Kreuz
    IK.fill(ctx, (c) => { c.moveTo(-10, 14); c.lineTo(-10, -1); c.quadraticCurveTo(-4, -8, 2, -1); c.lineTo(2, 14); c.closePath(); },
      IK.lin(ctx, -10, -6, 2, 14, [[0, '#d8d8e2'], [0.5, '#9a9aa6'], [1, '#55556a']]), 1.2);
    IK.glow(ctx, '#7fe3a0', 4, () => {
      IK.line(ctx, [[-4, 1], [-4, 11]], '#c8ffe0', 1.3, null);
      IK.line(ctx, [[-7.5, 4], [-0.5, 4]], '#c8ffe0', 1.3, null);
    });
    // Geist: bleicher Wolfskopf mit Nebelschweif, steigt nach rechts oben
    IK.glow(ctx, '#9ff6ff', 7, () => {
      IK.fill(ctx, (c) => {
        c.moveTo(0, 8);
        c.bezierCurveTo(4, 2, 2, -4, 7, -8);
        c.lineTo(9, -15);
        c.lineTo(11.5, -9.5);
        c.lineTo(15, -12);
        c.lineTo(15.5, -7);
        c.bezierCurveTo(20, -5, 20, -1, 17, 1);
        c.lineTo(12, 1);
        c.bezierCurveTo(10, 5, 8, 8, 4, 12);
        c.closePath();
      }, IK.lin(ctx, 4, -14, 14, 10, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(200,230,255,0.75)'], [1, 'rgba(120,180,255,0)']]), 0);
    });
    // Augen
    IK.glow(ctx, '#9ff6ff', 4, () => {
      IK.fill(ctx, (c) => c.ellipse(13.5, -6, 1.2, 0.8, -0.3, 0, Math.PI * 2), '#e0ffff', 0);
    });
    IK.sparkles(ctx, 6, '#e8fff4', 6, 9, 6, -2, 1.1);
  },

  // Dunkle Macht: Figur in violetter Säule, über dem Kopf kreist eine Krone aus fünf grünen Seelenflammen
  dunklemacht(ctx, IK) {
    // violette Säule
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, -10, 0, 10, 0, [[0, 'rgba(140,80,255,0)'], [0.5, 'rgba(170,120,255,0.55)'], [1, 'rgba(140,80,255,0)']]);
    ctx.fillRect(-10, -24, 20, 48);
    ctx.restore();
    IK.shock(ctx, 0, 17, 12, 3, '#c8a0ff', 1.2);
    // Figur mit Stab
    IK.glow(ctx, '#c8a0ff', 7, () => IK.figure(ctx, 0, 19, 25, IK.lin(ctx, -3, -20, 3, 0, [[0, '#4a2a7a'], [1, '#0e0618']])));
    IK.line(ctx, [[7, 18.5], [8.4, -2]], '#4a3a2a', 1.4, 'rgba(10,6,4,0.95)');
    IK.light(ctx, 8.4, -4, 6, '#7affb0', 0.8);
    IK.flame(ctx, 8.4, -1.5, 7, 0.08, ['#0e7a3a', '#4aff8a', '#eaffd0']);
    // Krone aus Seelenflammen: hintere zuerst
    const crown = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      crown.push([Math.cos(a) * 7, -7 + Math.sin(a) * 2.2, Math.sin(a)]);
    }
    crown.sort((p, q) => p[2] - q[2]);
    ctx.save();
    ctx.strokeStyle = 'rgba(122,255,176,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, -7, 7, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    for (const [x, y, d] of crown) IK.flame(ctx, x, y, 8.5 + d * 1.5, x * 0.03, ['#0e7a3a', '#4aff8a', '#eaffd0']);
    IK.light(ctx, 0, -11, 9, '#7affb0', 0.5);
    IK.sparkles(ctx, 6, '#e0d0ff', 12, 18, 0, 2, 1.2);
  },

  // Lebensentzug: rote Lebensströme werden aus einem Herz gerissen und fließen in eine Knochenhand
  lebensentzug(ctx, IK) {
    IK.light(ctx, -8, -8, 13, '#ff4a5a', 0.7);
    ikNekroHeart(ctx, -8, -8, 8.5);
    // Strom aus Tropfen vom Herz zur Hand
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[5, 0.25], [2.4, 0.6], [1, 1]]) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = w < 2 ? '#ffd0d8' : '#ff2a4a';
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.bezierCurveTo(-6, 8, 6, -6, 8, 6);
      ctx.stroke();
    }
    ctx.restore();
    for (const [x, y, r] of [[-3.5, 3, 1.6], [2, 0.5, 1.9], [6.4, 1.8, 1.4]]) IK.drop(ctx, x, y, r);
    IK.glow(ctx, '#ff4a5a', 5, () => ikNekroHand(ctx, 11, 16, 0.85, -0.65));
    IK.light(ctx, 7, 6, 7, '#ff8a9a', 0.7);
    IK.sparkles(ctx, 5, '#ffc0c8', 21, 17, 0, 0, 1.1);
  },

  // Knochenspeer: ein Speer aus Knochen schießt schräg nach oben rechts, Speedlinien und Splitter
  knochenspeer(ctx, IK) {
    // Bewegungslinien
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [ox, a, l] of [[-5, 0.45, 10], [5, 0.45, 12], [0, 0.6, 16]]) {
      const x0 = -18 + ox * 0.7;
      const y0 = 14 + ox * 0.7;
      ctx.globalAlpha = a;
      ctx.strokeStyle = IK.lin(ctx, x0, y0, x0 + l, y0 - l, [[0, 'rgba(240,230,208,0)'], [1, '#f0e6d0']]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + l, y0 - l);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.scale(1.45, 1);
    // Schaft als Wirbelsäule (Glieder)
    IK.glow(ctx, '#f0e6d0', 4, () => {
      for (let i = 0; i < 6; i++) {
        const y = 2 + i * 3;
        IK.fill(ctx, (c) => { c.moveTo(-2.2, y - 1.3); c.lineTo(2.2, y - 1.3); c.lineTo(1.6, y + 1.3); c.lineTo(-1.6, y + 1.3); c.closePath(); },
          IK.lin(ctx, -2, 0, 2, 0, [[0, '#fffaf0'], [0.5, '#e4d8bc'], [1, '#8a7a5a']]), 0.8);
      }
      IK.fill(ctx, (c) => c.ellipse(0, 20, 2.8, 2.2, 0, 0, Math.PI * 2), IK.rad(ctx, -0.8, 19.4, 0, 3, [[0, '#ffffff'], [1, '#a89878']]), 0.8);
      // Spitze: gezackte Knochenklinge
      IK.fill(ctx, (c) => {
        c.moveTo(0, -18);
        c.lineTo(3.2, -6);
        c.lineTo(2.2, -4);
        c.lineTo(3.4, -1);
        c.lineTo(0, 1);
        c.lineTo(-3.4, -1);
        c.lineTo(-2.2, -4);
        c.lineTo(-3.2, -6);
        c.closePath();
      }, IK.lin(ctx, -3, 0, 3, 0, [[0, '#ffffff'], [0.48, '#ece2c8'], [0.52, '#b8a888'], [1, '#6a5a44']]), 1);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-0.8, -1);
    ctx.lineTo(-0.3, -15);
    ctx.stroke();
    ctx.restore();
    // Einschlagglanz an der Spitze
    IK.light(ctx, 12.7, -12.7, 6, '#fff6e0', 0.8);
    IK.sparkles(ctx, 4, '#ffffff', 31, 5, 13, -13, 1.3);
  },

  // Knochenpanzer: Schild aus Knochen mit Schädelbuckel, goldene Aura, Knochen kreisen
  knochenpanzer(ctx, IK) {
    IK.trail(ctx, 0, 0, 18, Math.PI * 0.6, Math.PI * 1.6, 3, '#fff1c8');
    IK.trail(ctx, 0, 0, 18, Math.PI * 1.6, Math.PI * 2.6, 3, '#fff1c8');
    ctx.save();
    ctx.translate(0, 0.5);
    ctx.scale(0.86, 0.86);
    const shield = (c) => {
      c.moveTo(0, -16);
      c.quadraticCurveTo(8, -12, 13, -13);
      c.quadraticCurveTo(14, 2, 0, 17);
      c.quadraticCurveTo(-14, 2, -13, -13);
      c.quadraticCurveTo(-8, -12, 0, -16);
      c.closePath();
    };
    IK.glow(ctx, '#ffd88a', 8, () => IK.fill(ctx, shield, '#3a2a18', 1.4));
    // Knochenlatten
    ctx.save();
    ctx.beginPath();
    shield(ctx);
    ctx.clip();
    for (let i = -3; i <= 3; i++) {
      const x = i * 4;
      IK.fill(ctx, (c) => { c.rect(x - 1.6, -18, 3.2, 38); }, IK.lin(ctx, x - 1.6, 0, x + 1.6, 0, [[0, '#fffaf0'], [0.5, '#e0d2b0'], [1, '#8a7a5a']]), 0.7);
      for (const ky of [-12, 4]) IK.fill(ctx, (c) => c.ellipse(x, ky, 2, 1.1, 0, 0, Math.PI * 2), '#f4ead4', 0.5);
    }
    // Bänder
    for (const y of [-7, 9]) IK.fill(ctx, (c) => c.rect(-16, y - 1.2, 32, 2.4), IK.lin(ctx, 0, y - 1.2, 0, y + 1.2, [[0, '#c8a060'], [1, '#4a2e12']]), 0.6);
    ctx.fillStyle = IK.lin(ctx, -12, -14, 12, 14, [[0, 'rgba(255,255,255,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    ctx.fillRect(-16, -18, 32, 38);
    ctx.restore();
    IK.fill(ctx, shield, 'rgba(0,0,0,0)', 1.6, '#d8b06a');
    // Schädelbuckel
    IK.skull(ctx, 0, 0, 7.5, ['#fffaf0', '#d8c8a0', '#6a5a44'], '#ffd88a');
    ctx.restore();
    // kreisende Knochen
    IK.bone(ctx, -19, 1, -15, 8, 1.4);
    IK.bone(ctx, 15, -9, 18.5, -3, 1.4);
    IK.sparkles(ctx, 6, '#fff6d0', 17, 19, 0, 0, 1.2);
  },

  // Lähmender Fluch: Gestalt in grünen Ketten, Knochenhände packen sie aus dem Runenkreis
  laehmung(ctx, IK) {
    // Runenkreis
    IK.shock(ctx, 0, 14, 17, 4.6, '#7ad36a', 1.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#a8ff9a';
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 13.5;
      const y = 14 + Math.sin(a) * 3.5;
      ctx.beginPath();
      ctx.moveTo(x - 1, y - 1);
      ctx.lineTo(x + 1, y + 1);
      ctx.moveTo(x + 1, y - 1);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
    IK.light(ctx, 0, 6, 15, '#7ad36a', 0.5);
    // Gestalt (erstarrt)
    IK.glow(ctx, '#7ad36a', 5, () => IK.figure(ctx, 0, 15, 30, IK.lin(ctx, 0, -20, 0, 0, [[0, '#4a3a5a'], [1, '#0a0610']])));
    // Ketten über Kreuz
    const chain = (x0, y0, x1, y1) => {
      const n = 8;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang + (i % 2 ? Math.PI / 2 : 0) * 0);
        ctx.beginPath();
        if (i % 2) ctx.ellipse(0, 0, 2.2, 0.7, 0, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, 2.2, 1.4, 0, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(10,20,6,0.9)';
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = IK.lin(ctx, -2, -1, 2, 1, [[0, '#eaffd0'], [1, '#4aa83a']]);
        ctx.stroke();
        ctx.restore();
      }
    };
    IK.glow(ctx, '#a8ff9a', 4, () => {
      chain(-14, -12, 14, 6);
      chain(14, -12, -14, 6);
    });
    // Knochenhände packen die Füße
    ikNekroHand(ctx, -9, 19, 0.55, 0.5);
    ikNekroHand(ctx, 9, 19, 0.55, -0.5);
    IK.sparkles(ctx, 5, '#c8ffb0', 41, 18, 0, -2, 1.1);
  },

  // Blutopfer: Ritualdolch durchsticht einen großen Bluttropfen, Tropfen steigen in roter Säule auf
  blutopfer(ctx, IK) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, -11, 0, 11, 0, [[0, 'rgba(255,40,60,0)'], [0.5, 'rgba(255,60,80,0.5)'], [1, 'rgba(255,40,60,0)']]);
    ctx.fillRect(-11, -24, 22, 48);
    ctx.restore();
    IK.light(ctx, 0, 4, 14, '#ff4a5a', 0.7);
    IK.glow(ctx, '#ff3a4a', 7, () => IK.drop(ctx, -1.5, 7, 9, ['#ffb0b8', '#d0102a', '#3a020a']));
    IK.fill(ctx, (c) => c.ellipse(-5.4, 4, 2.2, 3.4, -0.4, 0, Math.PI * 2), 'rgba(255,255,255,0.6)', 0);
    // Dolch von oben rechts schräg hinein
    IK.glow(ctx, '#ff8a9a', 4, () => IK.dagger(ctx, 9.5, -10, 17, Math.PI + 0.62, { w: 4.6, gold: '#c8302a', mid: '#f0e0e0', dark: '#9a5a5a', dark2: '#4a1a1a' }));
    // aufsteigende Tropfen
    for (const [x, y, r] of [[-13, -3, 1.7], [-8, -13, 1.4], [12, 8, 1.5], [-1, -17, 1.1], [15, -1, 1.1]]) IK.drop(ctx, x, y, r);
    IK.sparkles(ctx, 5, '#ffc0c8', 51, 18, 0, 0, 1.1);
  },

  // Seelenernte (Ultimate): grüner Seelenstrudel, Geister werden spiralförmig in die leuchtende Mitte gezogen
  seelenernte(ctx, IK) {
    for (let k = 0; k < 3; k++) IK.swirl(ctx, 0, 0, 2, 18, 0.85, '#7fe3a0', 3.2, k * (Math.PI * 2 / 3));
    for (let k = 0; k < 3; k++) IK.swirl(ctx, 0, 0, 1, 12, 0.7, '#effff8', 1.2, k * (Math.PI * 2 / 3) + 0.6);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.5;
      const r = 13;
      ikNekroWisp(ctx, Math.cos(a) * r, Math.sin(a) * r, 8, a + Math.PI / 2 + 0.7);
    }
    IK.light(ctx, 0, 0, 10, '#a8ffe0', 1);
    IK.glow(ctx, '#a8ffe0', 8, () => IK.fill(ctx, (c) => c.arc(0, 0, 4, 0, Math.PI * 2), IK.rad(ctx, -1, -1, 0, 5, [[0, '#ffffff'], [0.6, '#a8ffe0'], [1, '#2a9a6a']]), 0.6));
    IK.sparkles(ctx, 7, '#e0fff0', 61, 18, 0, 0, 1.2);
  },

  // Knochenkerker (Ultimate): drei Ringe aus Knochenspießen brechen aus einem roten Runenkreis
  knochenkerker(ctx, IK) {
    IK.fill(ctx, (c) => c.ellipse(0, 8, 19, 9, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 8, 1, 19, [[0, 'rgba(120,10,30,0.9)'], [1, 'rgba(30,2,8,0.6)']]), 0);
    IK.shock(ctx, 0, 8, 18, 8, '#ff4a6a', 1.2);
    IK.shock(ctx, 0, 8, 8, 3.6, '#ff8a9a', 0.9);
    IK.light(ctx, 0, 6, 12, '#ff4a6a', 0.7);
    // gefangene Gestalt
    const spikes = [];
    [[8, 6, 9], [12.5, 8, 12], [17, 10, 13]].forEach(([r, n, h], ring) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.3;
        spikes.push([Math.cos(a) * r, 8 + Math.sin(a) * r * 0.45, h * (0.75 + 0.25 * Math.abs(Math.sin(a * 3 + ring))), 3 + ring * 0.6]);
      }
    });
    spikes.sort((p, q) => p[1] - q[1]);
    // hintere Spieße, dann die Gestalt, dann die vorderen (niedriger, damit sie sichtbar bleibt)
    for (const [x, y, h, w] of spikes) if (y < 8) ikNekroSpike(ctx, x, y, h, w, x * 0.02);
    IK.glow(ctx, '#ff4a6a', 6, () => IK.figure(ctx, 0, 10, 21, IK.lin(ctx, 0, -20, 0, 0, [[0, '#4a1a2a'], [1, '#0a0206']])));
    for (const [x, y, h, w] of spikes) if (y >= 8) ikNekroSpike(ctx, x, y, h * 0.62, w, x * 0.02);
    IK.sparkles(ctx, 5, '#ffc0c8', 71, 18, 0, -4, 1.1);
  }
});

Object.assign(SKILL_ART_THEME, {
  seelenkaefig: 'wind',
  totenbeschwoerung: 'erde',
  totenruf: 'm_blitz',
  dunklemacht: 'blitz',
  knochenpanzer: 'licht',
  laehmung: 'schatten',
  blutopfer: 'm_feuer',
  seelenernte: 'seele',
  knochenkerker: 'blut'
});
