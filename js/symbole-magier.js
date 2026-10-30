// Fertigkeitssymbole Magier – Feuer und Frost (seit 9.6), Stil und Hilfen in symbol-kunst.js
// Abgrenzung zum Schamanen (siehe magier-symbole.js): Dreiecks-Glyphen (△ Feuer, ▽ Frost), alles flach am Boden
// oder aus einem Bodensiegel aufsteigend, nichts fällt vom Himmel. Farben aus MAGE_EL (Karmin / Königsblau).

// --- Hilfen (Präfix ikMag) -----------------------------------------------------------------------------

// Elementfarben; Ersatz, falls MAGE_EL (daten/klassen.js) fehlt
function ikMagEl(key) {
  if (typeof MAGE_EL !== 'undefined' && MAGE_EL[key]) return MAGE_EL[key];
  return key === 'frost'
    ? { main: '#3a7bff', hi: '#9ff6ff', core: '#eafcff', deep: '#1a3fb0', dark: '#0e1e4a' }
    : { main: '#e8362a', hi: '#ff8a4a', core: '#fff1c8', deep: '#a0102e', dark: '#3a0e0e' };
}
// Flammenfarben für IK.flame: [Rand, Mitte, Kern]
const ikMagFirePal = () => {
  const F = ikMagEl('feuer');
  return [F.deep, F.main, F.core];
};
const ikMagHotPal = () => {
  const F = ikMagEl('feuer');
  return [F.main, F.hi, F.core];
};
// Eisfarben für IK.crystal: [hell, Glanz, Mitte, dunkel]
const ikMagIcePal = () => {
  const I = ikMagEl('frost');
  return [I.core, I.hi, I.main, I.deep];
};

// Dreiecks-Glyphe am Boden (flach gedrückt mit ky): up = △ (Feuer), sonst ▽ (Frost); mit Kreis drumherum
function ikMagGlyph(ctx, IK, cx, cy, r, ky, up, color, w = 1.2, ring = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ky);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  const s = up ? -1 : 1;
  const tri = () => {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = s * Math.PI / 2 + (i * Math.PI * 2) / 3;
      const x = Math.cos(a) * r * 0.82;
      const y = Math.sin(a) * r * 0.82;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  for (const [lw, a] of [[w * 3.2, 0.25], [w * 1.6, 0.55], [w, 1]]) {
    ctx.globalAlpha = a;
    ctx.strokeStyle = a === 1 ? '#ffffff' : color;
    ctx.lineWidth = lw / Math.sqrt(ky);
    tri();
    ctx.stroke();
    if (ring) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.lineWidth = 1;
}

// Flammenwand auf einem flachen Bodenring: part 'back' (obere Hälfte) oder 'front'; lean > 0 nach außen
function ikMagFlameRing(ctx, IK, cx, cy, rx, ry, n, h, lean, pal, part, off = 0) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    const back = Math.sin(a) < 0;
    if ((part === 'back') !== back) continue;
    list.push(a);
  }
  list.sort((p, q) => Math.sin(p) - Math.sin(q));
  for (const a of list) {
    const k = 0.78 + 0.28 * Math.abs(Math.sin(a * 2.3 + 1.1));
    const depth = 0.72 + 0.28 * (Math.sin(a) + 1) / 2;
    IK.flame(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry + 0.6, h * k * depth, lean * Math.cos(a), pal, Math.sin(a * 5) * 1.5);
  }
}

// Sechseck (flach mit ky), facettiert: helle Oberkante, dunkle Unterkante
function ikMagHex(ctx, IK, x, y, r, rot, ky, alpha = 1) {
  const P = ikMagIcePal();
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * ky]);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  IK.fill(ctx, (c) => { pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); },
    IK.lin(ctx, x - r, y - r * ky, x + r * 0.6, y + r * ky, [[0, P[0]], [0.35, P[1]], [0.7, P[2]], [1, P[3]]]), 0.9, 'rgba(6,16,40,0.9)');
  // innere Facette und Glanz
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    const px = x + Math.cos(a) * r * 0.55;
    const py = y + Math.sin(a) * r * 0.55 * ky;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Magier als Schattenriss in Robe mit Spitzkapuze: Füße bei (x,y), Höhe h, Neigung lean; fill = Farbe/Verlauf
// (Verlauf in Figurkoordinaten: x -9..9, y -21..0); face = Farbe der Gesichtsöffnung in der Kapuze (oder null)
function ikMagMage(ctx, IK, x, y, h, fill, lean = 0, line = 0.9, stroke = 'rgba(6,8,20,0.9)', face = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  const k = h / 21;
  ctx.scale(k, k);
  IK.fill(ctx, (c) => {
    c.moveTo(0, -21);
    c.quadraticCurveTo(2.8, -19.6, 3.1, -16.6);  // Kapuze
    c.quadraticCurveTo(3.2, -15.2, 2.4, -14.6);
    c.lineTo(5.8, -13.6);                         // Schulter
    c.quadraticCurveTo(7.2, -13, 7.8, -11);
    c.lineTo(9.2, -6.4);                          // weiter Ärmel
    c.lineTo(6, -6.2);
    c.lineTo(4.6, -9);
    c.quadraticCurveTo(5.4, -4, 7.6, 0);          // Robe weitet sich
    c.quadraticCurveTo(0, 1.4, -7.6, 0);
    c.quadraticCurveTo(-5.4, -4, -4.6, -9);
    c.lineTo(-6, -6.2);
    c.lineTo(-9.2, -6.4);
    c.lineTo(-7.8, -11);
    c.quadraticCurveTo(-7.2, -13, -5.8, -13.6);
    c.lineTo(-2.4, -14.6);
    c.quadraticCurveTo(-3.2, -15.2, -3.1, -16.6);
    c.quadraticCurveTo(-2.8, -19.6, 0, -21);
    c.closePath();
  }, fill, line / k, stroke);
  if (face) IK.fill(ctx, (c) => c.ellipse(0, -16.4, 1.7, 2.1, 0, 0, Math.PI * 2), face, 0);
  ctx.restore();
}

// Hand, Handfläche nach oben gewölbt (Seitenansicht), Handgelenk unten links; s = Maßstab
function ikMagCuppedHand(ctx, IK, x, y, s, rim = '#ffb04a') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const skin = IK.lin(ctx, 0, -4, 0, 12, [[0, '#f4c8a0'], [0.4, '#c88a64'], [1, '#4a2a20']]);
  // Ärmel
  IK.fill(ctx, (c) => { c.moveTo(-16, 16); c.lineTo(-11, 5); c.lineTo(-3, 9); c.lineTo(-7, 19); c.closePath(); },
    IK.lin(ctx, -14, 6, -6, 18, [[0, '#7a2030'], [1, '#2a0810']]), 1);
  IK.fill(ctx, (c) => { c.moveTo(-11.5, 5.5); c.lineTo(-2.5, 9.5); c.lineTo(-2, 8); c.lineTo(-10.5, 3.6); c.closePath(); }, '#d8a83a', 0.8);
  // Handfläche als Schale mit Daumen links und gekrümmten Fingern rechts
  IK.fill(ctx, (c) => {
    c.moveTo(-10, 4);
    c.bezierCurveTo(-11, 1, -11, -2, -9, -4);       // Daumenballen hoch
    c.bezierCurveTo(-8, -6, -6, -6.2, -5.5, -4.4);  // Daumenspitze
    c.bezierCurveTo(-5, -2.5, -3, -1, 1, -1);       // Mulde
    c.bezierCurveTo(5, -1, 8, -2.5, 10, -5);        // Fingerinnenseite
    c.bezierCurveTo(11.5, -7, 13.5, -6, 13, -3.5);  // Fingerspitzen
    c.bezierCurveTo(12.5, 1, 9, 6, 2, 7.5);         // Fingerrücken
    c.bezierCurveTo(-3, 8.5, -7, 7.5, -10, 4);
    c.closePath();
  }, skin, 1);
  // Fingerfugen
  ctx.strokeStyle = 'rgba(60,24,16,0.75)';
  ctx.lineWidth = 0.55;
  for (const [x0, y0, x1, y1] of [[9.6, -3.2, 6.5, 3.5], [11.6, -4.6, 9.3, 1.4]]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 1, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  // Licht von oben (vom Kern) auf der Kante
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rim;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-8.6, -4.2);
  ctx.bezierCurveTo(-6, -6.2, -5.5, -3, -3, -1.6);
  ctx.bezierCurveTo(1, -0.4, 6, -1.2, 10, -5);
  ctx.bezierCurveTo(11.5, -7, 13.3, -6, 13, -3.8);
  ctx.stroke();
  ctx.restore();
}

// Offene Hand von vorn (Finger nach oben), Handgelenk bei (x,y), Winkel ang; s = Maßstab
function ikMagOpenHand(ctx, IK, x, y, s, ang, rim = '#9ff6ff', sleeve = ['#3a5ad8', '#1a2a7a', '#0a1240']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const skinA = '#e8bfa0';
  const skinB = '#8a5a48';
  // Ärmel
  IK.fill(ctx, (c) => { c.moveTo(-6, 4); c.lineTo(6, 4); c.lineTo(7, 14); c.lineTo(-7, 14); c.closePath(); },
    IK.lin(ctx, -6, 0, 6, 0, [[0, sleeve[0]], [0.5, sleeve[1]], [1, sleeve[2]]]), 1);
  IK.fill(ctx, (c) => c.rect(-6.4, 3, 12.8, 2.2), IK.lin(ctx, 0, 3, 0, 5, [[0, '#fff1c8'], [1, '#a8862a']]), 0.8);
  // Finger (Kapseln) – erst Kontur, dann Haut
  const fingers = [[-3.6, -6, -5.4, -15.5], [-1.2, -6.6, -1.6, -18], [1.3, -6.6, 1.9, -17.4], [3.6, -6, 5.6, -14.5]];
  const thumb = [-5, -1.5, -10, -7.5];
  for (const [x0, y0, x1, y1] of [...fingers, thumb]) IK.line(ctx, [[x0, y0], [x1, y1]], 'rgba(10,6,4,0.9)', 3.6, null);
  // Handfläche
  IK.fill(ctx, (c) => { c.moveTo(-5.2, 3.2); c.quadraticCurveTo(-6.4, -3, -5, -7); c.lineTo(5, -7); c.quadraticCurveTo(6.4, -3, 5.2, 3.2); c.closePath(); },
    IK.lin(ctx, -5, -7, 5, 3, [[0, skinA], [1, skinB]]), 1);
  for (const [x0, y0, x1, y1] of [...fingers, thumb]) {
    ctx.strokeStyle = IK.lin(ctx, x0, y0, x1, y1, [[0, skinB], [1, skinA]]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // Frostlicht auf den Fingerspitzen
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rim;
  for (const [, , x1, y1] of [...fingers, thumb]) {
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(x1, y1, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- Motive ---------------------------------------------------------------------------------------------

Object.assign(SKILL_ART, {
  // Feuernova: Zepter steckt im Boden, ein flacher Ring karminroter Flammen rast über den Boden nach außen
  feuernova(ctx, IK) {
    const F = ikMagEl('feuer');
    const pal = ikMagFirePal();
    const cy = 8;
    // Boden: innen glühend, außen verbrannt
    IK.fill(ctx, (c) => c.ellipse(0, cy, 19, 7.2, 0, 0, Math.PI * 2), IK.rad(ctx, 0, cy, 1, 19, [[0, 'rgba(255,220,150,0.7)'], [0.45, 'rgba(160,16,46,0.45)'], [0.8, 'rgba(30,4,4,0.75)'], [1, 'rgba(30,4,4,0)']]), 0);
    // Druckstreifen am Boden nach außen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const x0 = Math.cos(a) * 4;
      const y0 = cy + Math.sin(a) * 1.6;
      const x1 = Math.cos(a) * 12.5;
      const y1 = cy + Math.sin(a) * 4.6;
      ctx.strokeStyle = IK.lin(ctx, x0, y0, x1, y1, [[0, 'rgba(255,241,200,0)'], [1, 'rgba(255,200,150,0.85)']]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
    ikMagGlyph(ctx, IK, 0, cy, 6, 0.4, true, F.hi, 0.8);
    ikMagFlameRing(ctx, IK, 0, cy, 15.5, 6, 12, 9, 0.75, pal, 'back', 0.2);
    // Zepter, in den Boden gerammt: Goldstab mit glühendem Kristall
    IK.light(ctx, 0, cy, 10, F.core, 0.9);
    IK.line(ctx, [[0, cy + 1.5], [0, -7]], IK.lin(ctx, -1.2, 0, 1.2, 0, [[0, '#fff1c8'], [0.45, '#d8a83a'], [1, '#5a3a10']]), 2.4);
    IK.fill(ctx, (c) => { c.moveTo(-4.4, -6.4); c.quadraticCurveTo(0, -4.6, 4.4, -6.4); c.lineTo(2.6, -9); c.lineTo(-2.6, -9); c.closePath(); },
      IK.lin(ctx, 0, -9, 0, -5, [[0, '#fff1c8'], [0.5, '#d8a83a'], [1, '#6a4a14']]), 0.9);
    IK.light(ctx, 0, -13, 9, F.hi, 0.7);
    IK.glow(ctx, F.hi, 8, () => IK.crystal(ctx, 0, -8.4, 11, 5.6, 0, [F.core, '#ffc0a0', F.main, F.deep]));
    // Flammen vorn, nach außen geneigt, und der glühende Ring
    IK.shock(ctx, 0, cy, 16, 6.2, F.hi, 1.1);
    ikMagFlameRing(ctx, IK, 0, cy, 15.5, 6, 12, 11, 0.75, pal, 'front', 0.2);
    IK.sparkles(ctx, 6, '#ffd8a0', 11, 18, 0, -2, 1.1);
  },


  // Feuerball: weißglühende Kugel mit Flammenschweif, umkreist von zwei schmalen Siegelringen
  feuerball(ctx, IK) {
    const F = ikMagEl('feuer');
    const cx = 4;
    const cy = -4;
    // Schweif nach unten links
    IK.light(ctx, -6, 6, 13, F.main, 0.55);
    const tail = -Math.PI * 0.75;
    for (const [dx, dy, h, da] of [[1.5, 1.5, 22, 0.16], [-1.5, -1.5, 21, -0.16], [0, 0, 27, 0], [2.5, -0.5, 16, 0.32], [-0.5, 2.5, 16, -0.32]]) {
      IK.flame(ctx, cx + dx, cy + dy, h, tail + da, ikMagFirePal(), da * 4);
    }
    // Siegelring hinten
    const ring = (front) => {
      for (const [rx, ry, rot, col] of [[13, 4.2, -0.6, F.core], [12, 3.6, 0.75, F.hi]]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalCompositeOperation = 'lighter';
        for (const [lw, a, c] of [[2.6, 0.3, col], [1, 0.95, col], [0.4, 1, '#ffffff']]) {
          ctx.globalAlpha = a;
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
          ctx.stroke();
        }
        // kleine △-Runen auf dem Ring
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        for (const a of front ? [0.7, 2.2] : [3.9, 5.4]) {
          const x = Math.cos(a) * rx;
          const y = Math.sin(a) * ry;
          ctx.beginPath();
          ctx.moveTo(x, y - 1.3);
          ctx.lineTo(x + 1.1, y + 0.7);
          ctx.lineTo(x - 1.1, y + 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    };
    ring(false);
    // Kugel
    IK.glow(ctx, F.hi, 9, () => IK.fill(ctx, (c) => c.arc(cx, cy, 7.6, 0, Math.PI * 2),
      IK.rad(ctx, cx - 2, cy - 2.4, 0.5, 9, [[0, '#ffffff'], [0.3, F.core], [0.6, F.hi], [0.85, F.main], [1, F.deep]]), 1));
    IK.light(ctx, cx, cy, 11, F.core, 0.5);
    IK.fill(ctx, (c) => c.ellipse(cx - 2.4, cy - 3, 2.4, 1.4, -0.6, 0, Math.PI * 2), 'rgba(255,255,255,0.85)', 0);
    ring(true);
    IK.sparkles(ctx, 6, '#ffe0b0', 4, 9, -8, 8, 1);
  },

  // Flammenschritt: Stichflamme bricht am alten Standort aus, der Magier springt davon, brennende Fußspuren
  flammenschritt(ctx, IK) {
    const F = ikMagEl('feuer');
    const bx = -7;
    // Explosionsfleck am Boden
    IK.fill(ctx, (c) => c.ellipse(bx, 13, 11, 4, 0, 0, Math.PI * 2), IK.rad(ctx, bx, 13, 1, 11, [[0, 'rgba(255,240,200,0.8)'], [0.6, 'rgba(160,16,46,0.5)'], [1, 'rgba(40,4,4,0)']]), 0);
    IK.shock(ctx, bx, 13, 10, 3.6, F.hi, 1.2);
    // brennende Fußspuren zum neuen Ort
    for (const [x, y, s] of [[3, 14.5, 4.6], [8, 12.6, 4], [12.5, 14, 3.4]]) {
      IK.fill(ctx, (c) => c.ellipse(x, y + 0.6, 1.8, 0.8, 0, 0, Math.PI * 2), 'rgba(30,4,4,0.8)', 0);
      IK.flame(ctx, x, y + 0.6, s, 0.15, ikMagHotPal());
    }
    // Stichflamme: hohe Säule aus mehreren Zungen
    IK.light(ctx, bx, -2, 15, F.main, 0.7);
    const pal = ikMagFirePal();
    for (const [dx, h, a, w] of [[-5, 18, -0.35, 1], [4, 17, 0.35, -1], [-2.5, 26, -0.12, 1.5], [2, 25, 0.12, -1.5], [0, 33, 0, 2]]) {
      IK.flame(ctx, bx + dx, 14, h, a, pal, w);
    }
    IK.flame(ctx, bx, 14, 22, 0, ikMagHotPal(), -1);
    IK.light(ctx, bx, 5, 7, F.core, 0.9);
    // Fahrtstreifen hinter der Figur
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [y, l] of [[-1, 6], [2.5, 8], [6, 5]]) {
      ctx.strokeStyle = IK.lin(ctx, 5 - l, y, 5, y, [[0, 'rgba(255,138,74,0)'], [1, 'rgba(255,220,170,0.9)']]);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(5 - l, y);
      ctx.lineTo(5, y);
      ctx.stroke();
    }
    ctx.restore();
    // Magier landet rechts (dunkler Schattenriss, Glutsaum)
    IK.glow(ctx, F.hi, 5, () => ikMagMage(ctx, IK, 11, 12, 19, IK.lin(ctx, -9, -21, 9, 0, [[0, '#8a2a28'], [0.5, '#3a0a10'], [1, '#140406']]), 0.2, 0.9, 'rgba(10,2,2,0.9)', '#ffb04a'));
    IK.sparkles(ctx, 7, '#ffd8a0', 6, 10, -6, -6, 1.1);
  },


  // Glutherz (Buff): ein glühendes Herz aus Glut schwebt über der offenen Hand, Funken steigen auf
  glutherz(ctx, IK) {
    const F = ikMagEl('feuer');
    // Aura und △ hinter dem Kern
    IK.light(ctx, 0, -5, 19, F.hi, 0.55);
    ikMagGlyph(ctx, IK, 0, -6, 15.5, 1, true, F.hi, 0.7, false);
    ikMagOpenHand(ctx, IK, 0, 18.5, 0.78, 0, F.hi, ['#c8303a', '#7a1020', '#2a0408']);
    IK.light(ctx, 0, 6, 8, F.hi, 0.5);
    // Herz
    const heart = (c) => {
      c.moveTo(0, 5.5);
      c.bezierCurveTo(-4, 2, -10, -1.5, -9, -6.5);
      c.bezierCurveTo(-8, -11, -2.5, -11.5, 0, -7);
      c.bezierCurveTo(2.5, -11.5, 8, -11, 9, -6.5);
      c.bezierCurveTo(10, -1.5, 4, 2, 0, 5.5);
      c.closePath();
    };
    ctx.save();
    ctx.translate(0, -3.5);
    ctx.scale(0.92, 0.92);
    IK.glow(ctx, F.hi, 10, () => IK.fill(ctx, heart,
      IK.rad(ctx, -1.5, -4.5, 0.5, 12, [[0, '#ffffff'], [0.22, F.core], [0.5, F.hi], [0.78, F.main], [1, F.deep]]), 1.1));
    // Glutrisse
    ctx.strokeStyle = 'rgba(90,10,10,0.55)';
    ctx.lineWidth = 0.6;
    for (const pts of [[[-6.5, -7], [-4, -4.5], [-5, -1.5]], [[6, -8], [3.5, -5], [4.5, -2]], [[-1.5, 1.5], [0.5, -0.5], [2, 1.8]]]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    IK.fill(ctx, (c) => c.ellipse(-4.6, -7.4, 2.2, 1.3, -0.5, 0, Math.PI * 2), 'rgba(255,255,255,0.8)', 0);
    ctx.restore();
    IK.light(ctx, 0, -6, 8, F.core, 0.6);
    IK.sparkles(ctx, 8, '#ffe0a0', 9, 17, 0, -6, 1.1);
  },


  // Flammenkreis: leuchtendes △-Siegel am Boden (fast von oben), die Flammenwand am Rand zieht sich zur Mitte
  flammenkreis(ctx, IK) {
    const F = ikMagEl('feuer');
    const pal = ikMagFirePal();
    const cy = 3;
    const rx = 16.5;
    const ry = 12;
    IK.fill(ctx, (c) => c.ellipse(0, cy, rx + 1, ry + 1, 0, 0, Math.PI * 2), IK.rad(ctx, 0, cy, 2, rx, [[0, 'rgba(60,6,6,0.25)'], [0.8, 'rgba(30,4,4,0.7)'], [1, 'rgba(30,4,4,0.3)']]), 0);
    // drei Pulse nach innen (Ringe, innen heller)
    for (const [k, a] of [[0.74, 0.45], [0.52, 0.65], [0.3, 0.85]]) {
      ctx.save();
      ctx.globalAlpha = a;
      IK.shock(ctx, 0, cy, rx * k, ry * k, F.hi, 0.9);
      ctx.restore();
    }
    // großes △-Siegel
    IK.light(ctx, 0, cy, 13, F.main, 0.8);
    ikMagGlyph(ctx, IK, 0, cy, rx * 0.92, ry / rx, true, F.hi, 1.5, true);
    IK.light(ctx, 0, cy, 6, F.core, 1);
    // Flammenwand, zur Mitte geneigt, niedrig
    ikMagFlameRing(ctx, IK, 0, cy, rx, ry, 16, 7, -0.7, pal, 'back', 0.2);
    // Pfeilspitzen der Pulse zur Mitte
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const ux = Math.cos(a);
      const uy = Math.sin(a) * (ry / rx);
      const x = ux * 9;
      const y = cy + uy * 9;
      ctx.fillStyle = F.core;
      ctx.beginPath();
      ctx.moveTo(x - ux * 3.4, y - uy * 3.4);
      ctx.lineTo(x - uy * 2.4 + ux * 0.6, y + ux * 2.4 * (ry / rx) + uy * 0.6);
      ctx.lineTo(x + uy * 2.4 + ux * 0.6, y - ux * 2.4 * (ry / rx) + uy * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ikMagFlameRing(ctx, IK, 0, cy, rx, ry, 16, 8.5, -0.7, pal, 'front', 0.2);
    IK.sparkles(ctx, 5, '#ffd8a0', 21, 16, 0, -4, 1);
  },


  // Frostnova: königsblaue Sechseck-Frostplatte, flache Eisnadeln schießen waagrecht nach außen
  frostnova(ctx, IK) {
    const I = ikMagEl('frost');
    const P = ikMagIcePal();
    const cy = 5;
    const ky = 0.5;
    // Reifplatte (Sechseck)
    ctx.save();
    ctx.globalAlpha = 0.85;
    IK.fill(ctx, (c) => { for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; const x = Math.cos(a) * 15; const y = cy + Math.sin(a) * 15 * ky; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); },
      IK.rad(ctx, 0, cy, 1, 15, [[0, 'rgba(234,252,255,0.9)'], [0.45, 'rgba(90,150,255,0.6)'], [1, 'rgba(26,63,176,0.55)']]), 0.8, 'rgba(159,246,255,0.8)');
    ctx.restore();
    IK.shock(ctx, 0, cy, 18, 18 * ky, I.hi, 1.4);
    ikMagGlyph(ctx, IK, 0, cy, 5, ky, false, I.hi, 0.8, false);
    // Eisnadeln flach am Boden: hinten kürzer, vorn länger
    const needles = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.13;
      needles.push([a, i % 2 ? 12 : 17.5, i % 2 ? 3.6 : 5]);
    }
    needles.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
    for (const [a, len, w] of needles) {
      const dx = Math.cos(a);
      const dy = Math.sin(a) * ky;
      const l = len * Math.hypot(dx, dy) * (0.85 + 0.15 * (Math.sin(a) + 1) / 2);
      const ang = Math.atan2(dx, -dy);
      IK.crystal(ctx, dx * 2.5, cy + dy * 2.5, l, w * (0.75 + 0.25 * Math.abs(Math.cos(a))), ang, P);
    }
    // Mitte: Eisstern
    IK.light(ctx, 0, cy, 10, I.core, 0.9);
    IK.glow(ctx, I.core, 6, () => IK.fill(ctx, (c) => c.ellipse(0, cy, 3.4, 2, 0, 0, Math.PI * 2), IK.rad(ctx, -0.6, cy - 0.6, 0, 3.4, [[0, '#ffffff'], [1, I.hi]]), 0.8, 'rgba(6,16,40,0.9)'));
    // aufgewirbelter Reif
    IK.sparkles(ctx, 8, '#ffffff', 5, 17, 0, cy - 3, 1.2);
  },

  // Eisstrahl: aus der offenen Hand schießt ein breiter, eisiger Strahl schräg nach oben; Reif wächst am Rand
  eisstrahl(ctx, IK) {
    const I = ikMagEl('frost');
    const x0 = -9;
    const y0 = 9;
    const x1 = 17;
    const y1 = -15;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.hypot(x1 - x0, y1 - y0);
    // Strahl (Kegel, wird breiter)
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = 'lighter';
    for (const [w0, w1, col, a] of [[5, 11, I.main, 0.45], [3.4, 7, I.hi, 0.6], [1.8, 3.6, I.core, 0.9], [0.8, 1.4, '#ffffff', 1]]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = IK.lin(ctx, 0, 0, len + 4, 0, [[0, col], [0.85, col], [1, 'rgba(0,0,0,0)']]);
      ctx.beginPath();
      ctx.moveTo(0, -w0 / 2);
      ctx.lineTo(len + 4, -w1 / 2);
      ctx.quadraticCurveTo(len + 7, 0, len + 4, w1 / 2);
      ctx.lineTo(0, w0 / 2);
      ctx.closePath();
      ctx.fill();
    }
    // Wirbelstreifen im Strahl
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const x = 3 + t * (len - 2);
        const y = k * Math.sin(t * Math.PI * 3.2) * (1.4 + t * 2.4);
        if (t) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Reifkristalle an den Rändern des Strahls
    const P = ikMagIcePal();
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    for (const [t, side, l, w] of [[0.4, 1, 5, 2.4], [0.55, -1, 6, 2.6], [0.7, 1, 6.5, 2.8], [0.82, -1, 5.5, 2.4], [0.3, -1, 4, 2]]) {
      const bx = x0 + (x1 - x0) * t + nx * side * (2.5 + t * 3.5);
      const by = y0 + (y1 - y0) * t + ny * side * (2.5 + t * 3.5);
      const a = Math.atan2(nx * side, -ny * side) + side * 0.35;
      IK.crystal(ctx, bx, by, l, w, a, P);
    }
    // Hand, die den Strahl lenkt
    ikMagOpenHand(ctx, IK, -12, 18, 0.72, ang + Math.PI / 2, I.hi);
    IK.light(ctx, x0 + 1, y0 - 1, 9, I.core, 1);
    IK.glow(ctx, I.core, 6, () => IK.fill(ctx, (c) => c.arc(x0 + 1, y0 - 1, 2.6, 0, Math.PI * 2), IK.rad(ctx, x0 + 0.4, y0 - 1.6, 0, 3, [[0, '#ffffff'], [1, I.hi]]), 0));
    IK.sparkles(ctx, 8, '#ffffff', 17, 9, 6, -4, 1.1);
  },

  // Eisschritt: eine Eisstatue des Magiers bleibt zurück und zerspringt; er gleitet auf einer Eisbahn davon
  eisschritt(ctx, IK) {
    const I = ikMagEl('frost');
    const P = ikMagIcePal();
    // Eisbahn: glänzende Kurve von der Statue nach rechts
    ctx.save();
    for (const [lw, col, a] of [[5.5, 'rgba(10,20,60,0.6)', 1], [4, I.main, 0.9], [2, I.hi, 0.9], [0.7, '#ffffff', 1]]) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 15.5);
      ctx.quadraticCurveTo(7, 17, 15.5, 10.5);
      ctx.stroke();
    }
    ctx.restore();
    // gleitender Magier am Ende der Bahn (dunkel, Frostsaum), Fahrtstreifen dahinter
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [y, l] of [[0, 5], [3, 7], [6, 4]]) {
      ctx.strokeStyle = IK.lin(ctx, 8 - l, y, 8, y, [[0, 'rgba(159,246,255,0)'], [1, 'rgba(234,252,255,0.9)']]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8 - l, y);
      ctx.lineTo(8, y);
      ctx.stroke();
    }
    ctx.restore();
    IK.glow(ctx, I.hi, 4, () => ikMagMage(ctx, IK, 13, 11, 15, IK.lin(ctx, -9, -21, 9, 0, [[0, '#4a5aaa'], [1, '#0a1030']]), 0.28, 0.9, 'rgba(6,8,20,0.9)', '#9ff6ff'));
    // Eisstatue: Magier aus facettiertem Eis
    IK.fill(ctx, (c) => c.ellipse(-6, 15, 9, 2.8, 0, 0, Math.PI * 2), IK.rad(ctx, -6, 15, 0, 9, [[0, 'rgba(234,252,255,0.8)'], [1, 'rgba(58,123,255,0)']]), 0);
    IK.light(ctx, -6, 2, 14, I.hi, 0.45);
    IK.glow(ctx, I.hi, 6, () => ikMagMage(ctx, IK, -6, 15.5, 30, IK.lin(ctx, -9, -21, 9, 0, [[0, P[0]], [0.4, P[1]], [0.7, P[2]], [1, P[3]]]), 0, 1, 'rgba(6,16,40,0.95)', 'rgba(26,63,176,0.85)'));
    // Facetten (hell) und Risse (dunkel) auf der Statue
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.6;
    for (const pts of [[[-6, -14], [-7.5, -9], [-6, -4]], [[-10, -3], [-8, 3], [-10, 12]], [[-3, -6], [-2, 4]]]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(6,16,60,0.95)';
    ctx.lineWidth = 0.9;
    for (const pts of [[[-12, -2], [-8, 0], [-9, 4], [-4.5, 6], [-5.5, 11]], [[-1.5, -4], [-4.5, -1], [-8, 0]], [[-6, -11], [-4, -8]]]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.restore();
    // abplatzende Splitter
    for (const [x, y, a] of [[-15.5, -5, -1.1], [1.5, -11, 0.9], [-16, 5, -1.6], [2, -3, 1.3]]) IK.crystal(ctx, x, y, 4, 2, a, P);
    IK.sparkles(ctx, 7, '#ffffff', 23, 15, -2, -2, 1.1);
  },


  // Frostpanzer (Buff): vier Sechseck-Eisplatten kreisen in Brusthöhe um den Magier, kalte Aura
  frostpanzer(ctx, IK) {
    const I = ikMagEl('frost');
    const cy = 0;
    const plates = [0.35, 1.92, 3.49, 5.06].map((a) => [a, Math.sin(a)]);
    // Aura
    IK.light(ctx, 0, 0, 19, I.main, 0.6);
    IK.light(ctx, 0, -2, 10, I.hi, 0.4);
    // Umlaufbahn hinten
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = I.hi;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, cy, 15.5, 5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const drawPlate = ([a, s]) => {
      const x = Math.cos(a) * 15.5;
      const y = cy + Math.sin(a) * 5;
      const r = 5.6 + s * 1.2;
      IK.glow(ctx, I.hi, 4, () => ikMagHex(ctx, IK, x, y, r, 0.2 + a, 0.9 - Math.abs(Math.cos(a)) * 0.45, s < 0 ? 0.75 : 1));
    };
    plates.filter((p) => p[1] < 0).forEach(drawPlate);
    // Figur mit Frostsaum
    IK.glow(ctx, I.hi, 5, () => ikMagMage(ctx, IK, 0, 17.5, 33, IK.lin(ctx, -9, -21, 9, 0, [[0, '#6a8af0'], [0.45, '#1a2a6a'], [1, '#080c28']]), 0, 0.9, 'rgba(6,8,20,0.9)', '#0a0c1a'));
    // Eis-Brustplatte
    IK.fill(ctx, (c) => { c.moveTo(-4.4, -2.6); c.lineTo(4.4, -2.6); c.lineTo(3.4, 4); c.lineTo(0, 7); c.lineTo(-3.4, 4); c.closePath(); },
      IK.lin(ctx, -4, -3, 4, 7, [[0, '#ffffff'], [0.4, I.hi], [1, I.main]]), 0.8, 'rgba(6,16,40,0.9)');
    IK.light(ctx, -1.2, 0, 4.5, '#ffffff', 0.7);
    // Umlaufbahn vorn und vordere Platten
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = I.hi;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, cy, 15.5, 5, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    plates.filter((p) => p[1] >= 0).forEach(drawPlate);
    IK.sparkles(ctx, 7, '#ffffff', 31, 18, 0, 0, 1.1);
  },

  // Kristallgrab: aus einem ▽-Siegel am Boden wachsen sieben mannshohe Eiskristalle im Sechseck
  kristallgrab(ctx, IK) {
    const I = ikMagEl('frost');
    const P = ikMagIcePal();
    const cy = 12;
    // Eisfeld und Siegel
    IK.fill(ctx, (c) => c.ellipse(0, cy, 18, 6, 0, 0, Math.PI * 2), IK.rad(ctx, 0, cy, 1, 18, [[0, 'rgba(234,252,255,0.85)'], [0.5, 'rgba(58,123,255,0.55)'], [1, 'rgba(14,30,74,0)']]), 0);
    ikMagGlyph(ctx, IK, 0, cy, 15, 0.33, false, I.hi, 1.1, true);
    // sechs Kristalle im Kreis (hinten zuerst), dann der große in der Mitte
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ring.push(a);
    }
    const draw = (a) => {
      const x = Math.cos(a) * 10.5;
      const y = cy + Math.sin(a) * 3.6;
      const back = Math.sin(a) < 0;
      IK.crystal(ctx, x, y, back ? 17 : 15, back ? 5 : 5.8, Math.cos(a) * 0.42, P);
    };
    ring.filter((a) => Math.sin(a) < 0).forEach(draw);
    IK.light(ctx, 0, 0, 13, I.hi, 0.5);
    IK.glow(ctx, I.core, 7, () => IK.crystal(ctx, 0, cy + 1, 29, 9.5, 0, P));
    ring.filter((a) => Math.sin(a) >= 0).forEach(draw);
    // Splitter, die beim Aufbrechen hochspritzen
    for (const [x, y, a, l] of [[-15, -2, -0.9, 4], [15, -3, 0.9, 4], [-8, -12, -0.4, 3.2], [9, -12, 0.5, 3.2]]) IK.crystal(ctx, x, y, l, 2, a, P);
    IK.light(ctx, 0, cy, 9, I.core, 0.8);
    IK.sparkles(ctx, 8, '#ffffff', 41, 17, 0, 0, 1.1);
  },

  // Inferno (Ultimate): drei Flammenwellen rollen nacheinander von der weißglühenden Mitte nach außen
  inferno(ctx, IK) {
    const F = ikMagEl('feuer');
    const pal = ikMagFirePal();
    const hot = ikMagHotPal();
    const cy = -2.5;
    IK.fill(ctx, (c) => c.ellipse(0, cy + 1, 19.5, 16, 0, 0, Math.PI * 2), IK.rad(ctx, 0, cy, 1, 19, [[0, 'rgba(255,240,200,0.95)'], [0.25, 'rgba(255,138,74,0.7)'], [0.6, 'rgba(120,8,20,0.6)'], [1, 'rgba(30,4,4,0.15)']]), 0);
    // Wellen: [rx, ry, Zungen, Höhe] – hinten nur als Glutlinie, vorn als Flammenwand; außen die höchste
    const rings = [[6, 4.4, 7, 4.2], [11.5, 8.4, 11, 5.2], [17, 12.4, 15, 6.4]];
    for (const [rx, ry] of rings) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.globalCompositeOperation = 'lighter';
      for (const [lw, col] of [[3, F.main], [1, F.core]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(0, cy, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // weißglühende Mitte mit aufsteigender Feuersäule und △
    IK.light(ctx, 0, cy - 3, 13, F.core, 1);
    ikMagGlyph(ctx, IK, 0, cy, 3.6, 0.6, true, F.core, 0.8, false);
    for (const [rx, ry, n, h] of rings) {
      IK.shock(ctx, 0, cy, rx, ry, F.hi, 1.2);
      for (let i = 0; i < n; i++) {
        const a = 0.12 * Math.PI + (i / (n - 1)) * 0.76 * Math.PI;
        const k = 0.85 + 0.25 * Math.abs(Math.sin(a * 3.1 + rx));
        IK.flame(ctx, Math.cos(a) * rx, cy + Math.sin(a) * ry + 0.5, h * k, 0.75 * Math.cos(a), rx < 12 ? hot : pal, Math.sin(a * 4) * 1.5);
      }
      // nach der innersten Welle: die Feuersäule in der Mitte
      if (rx < 7) {
        IK.light(ctx, 0, cy - 6, 11, F.hi, 0.8);
        IK.flame(ctx, -3, cy + 2, 15, -0.35, pal, 1);
        IK.flame(ctx, 3, cy + 2, 15, 0.35, pal, -1);
        IK.flame(ctx, 0, cy + 2.5, 22, 0, hot, 1.5);
        IK.light(ctx, 0, cy - 3, 6, '#ffffff', 0.9);
      }
    }
    IK.sparkles(ctx, 9, '#ffe0b0', 51, 19, 0, -6, 1.2);
  },



  // Eiszeit (Ultimate): Gletscherplatte im Sechseck, Kristallspitzen am Rand, in der Mitte zerspringt alles
  eiszeit(ctx, IK) {
    const I = ikMagEl('frost');
    const P = ikMagIcePal();
    const cy = 7;
    const r = 18;
    const ky = 0.48;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      pts.push([Math.cos(a) * r, cy + Math.sin(a) * r * ky]);
    }
    // Plattendicke (Seitenwand vorn)
    IK.fill(ctx, (c) => { c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(pts[2][0], pts[2][1]); c.lineTo(pts[3][0], pts[3][1]); c.lineTo(pts[3][0], pts[3][1] + 3.5); c.lineTo(pts[2][0], pts[2][1] + 3.5); c.lineTo(pts[1][0], pts[1][1] + 3.5); c.lineTo(pts[0][0], pts[0][1] + 3.5); c.closePath(); },
      IK.lin(ctx, 0, cy, 0, cy + 13, [[0, I.main], [1, I.dark]]), 1, 'rgba(6,16,40,0.9)');
    // Oberfläche
    IK.fill(ctx, (c) => { pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); },
      IK.lin(ctx, -r, cy - r * ky, r * 0.6, cy + r * ky, [[0, P[0]], [0.35, P[1]], [0.75, P[2]], [1, P[3]]]), 1, 'rgba(6,16,40,0.9)');
    // Risse von der Mitte aus, weiß leuchtend
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [a, l] of [[0.3, 15], [1.2, 13], [2.2, 16], [3.3, 14], [4.1, 12], [5.2, 15]]) {
      const ex = Math.cos(a) * l;
      const ey = cy + Math.sin(a) * l * ky;
      const mx = Math.cos(a + 0.18) * l * 0.5;
      const my = cy + Math.sin(a + 0.18) * l * 0.5 * ky;
      for (const [lw, col, al] of [[2.4, I.hi, 0.35], [0.8, '#ffffff', 1]]) {
        ctx.globalAlpha = al;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(mx, my);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Kristallspitzen am Rand: hinten zuerst
    const spires = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      spires.push([a, i % 2 ? 9 : 11]);
      spires.push([a + Math.PI / 6, 6]);
    }
    spires.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
    const spire = ([a, h]) => {
      const rr = Math.abs(((a / (Math.PI / 3)) % 1)) > 0.01 ? r * 0.88 : r * 0.94;
      const x = Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * ky;
      const front = Math.sin(a) > 0.1;
      IK.crystal(ctx, x, y + (front ? 1 : 0), h * (front ? 1.05 : 0.85), h * 0.42, Math.cos(a) * 0.5, P);
    };
    spires.filter((s) => Math.sin(s[0]) <= 0.1).forEach(spire);
    // Mitte: alles zerspringt – weißer Blitz, Splitter fliegen nach außen
    IK.light(ctx, 0, cy - 4, 14, I.core, 1);
    for (const [a, d, l] of [[-1.57, 11, 6], [-2.25, 10, 5], [-0.9, 10, 5], [-2.85, 9, 4], [-0.3, 9, 4], [0.6, 7, 3.2], [2.5, 7, 3.2]]) {
      IK.glow(ctx, I.hi, 4, () => IK.crystal(ctx, Math.cos(a) * d * 0.55, cy - 4 + Math.sin(a) * d * 0.55, l, l * 0.5, a + Math.PI / 2, P));
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffffff';
    ctx.translate(0, cy - 4);
    for (const [rl, rs, rot] of [[8, 1.3, 0], [5, 0.9, Math.PI / 4]]) {
      ctx.save();
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * rl, Math.sin(a) * rl);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * rs, Math.sin(a + Math.PI / 4) * rs);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    spires.filter((s) => Math.sin(s[0]) > 0.1).forEach(spire);
    IK.sparkles(ctx, 10, '#ffffff', 61, 19, 0, -2, 1.2);
  }
});

// Ultimates haben kein Element: Hintergrund passend setzen
Object.assign(SKILL_ART_THEME, { inferno: 'm_feuer', eiszeit: 'm_frost' });
