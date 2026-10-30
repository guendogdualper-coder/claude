// Fertigkeitssymbole Krieger (seit 9.6), Stil und Hilfen in symbol-kunst.js

// --- eigene Zeichenhilfen (Krieger) ------------------------------------------------------------

// Steinfaust, Knöchel zeigen nach oben (ang 0); Mitte der Faust bei (x,y), Größe s (1 = etwa 14 breit)
// pal = [Licht, Mitte, Schatten], glow = Farbe der leuchtenden Risse
function ikKriegerFaust(ctx, IK, x, y, s, ang, pal, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(s, s);
  const grad = () => IK.lin(ctx, -8, -10, 8, 14, [[0, pal[0]], [0.45, pal[1]], [1, pal[2]]]);
  // Unterarm
  IK.fill(ctx, (c) => { c.moveTo(-5.4, 3); c.lineTo(-6.8, 26); c.lineTo(6.8, 26); c.lineTo(5.4, 3); c.closePath(); }, grad(), 1);
  // Handballen
  IK.fill(ctx, (c) => { c.moveTo(-7.2, -3); c.lineTo(-7.2, 3); c.quadraticCurveTo(-7, 6.5, -3, 6.5); c.lineTo(4, 6.5); c.quadraticCurveTo(7.4, 6.5, 7.4, 3); c.lineTo(7.4, -3); c.closePath(); }, grad(), 1);
  // vier Finger, mittlere etwas höher
  const tops = [-7.4, -8.6, -8.2, -6.8];
  for (let i = 0; i < 4; i++) {
    const fx = -7.2 + i * 3.65;
    const t = tops[i];
    IK.fill(ctx, (c) => { c.moveTo(fx, 0); c.lineTo(fx, t + 1.8); c.quadraticCurveTo(fx, t, fx + 1.8, t); c.quadraticCurveTo(fx + 3.6, t, fx + 3.6, t + 1.8); c.lineTo(fx + 3.6, 0); c.closePath(); },
      IK.lin(ctx, fx, t, fx + 3.6, t + 4, [[0, pal[0]], [0.6, pal[1]], [1, pal[2]]]), 0.9);
  }
  // Daumen quer davor
  IK.fill(ctx, (c) => { c.moveTo(-7.6, -0.8); c.quadraticCurveTo(-7.8, 3.2, -4, 3.2); c.lineTo(2.6, 3.2); c.quadraticCurveTo(4.6, 3.2, 4.6, 1.2); c.quadraticCurveTo(4.6, -0.8, 2.6, -0.8); c.closePath(); },
    IK.lin(ctx, 0, -1, 0, 3.2, [[0, pal[0]], [1, pal[1]]]), 0.9);
  // leuchtende Risse im Stein
  if (glow) {
    IK.glow(ctx, glow, 3, () => {
      IK.line(ctx, [[-3, 6.5], [-1.5, 10], [-3, 13], [-2, 17]], glow, 0.7, null);
      IK.line(ctx, [[3.5, -6.5], [4.2, -3], [3, 0.5]], glow, 0.55, null);
      IK.line(ctx, [[-6, 4.5], [-4.5, 5.6]], glow, 0.5, null);
    });
  }
  // Glanz auf den Knöcheln
  ctx.strokeStyle = 'rgba(255,248,225,0.75)';
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const fx = -7.2 + i * 3.65;
    ctx.beginPath();
    ctx.arc(fx + 1.8, tops[i] + 1.8, 1.2, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.restore();
}

// Kriegerbüste von vorn (Helm, breite Schultern mit Schulterplatten); Mitte der Brust bei (x,y), Größe s;
// rim = Farbe des Leuchtens am Umriss, eye = Leuchten im Sehschlitz (sonst dunkel)
function ikKriegerKoerper(ctx, IK, x, y, s, pal, rim, eye) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const body = (c) => {
    c.moveTo(-2.4, -7);
    c.lineTo(-3, -4.6);
    c.quadraticCurveTo(-9, -4.4, -11.5, -1);
    c.lineTo(-12.5, 6);
    c.lineTo(-9, 7);
    c.lineTo(-8, 16);
    c.lineTo(8, 16);
    c.lineTo(9, 7);
    c.lineTo(12.5, 6);
    c.lineTo(11.5, -1);
    c.quadraticCurveTo(9, -4.4, 3, -4.6);
    c.lineTo(2.4, -7);
    c.closePath();
  };
  IK.glow(ctx, rim, 5, () => IK.fill(ctx, body, IK.lin(ctx, -10, -6, 10, 14, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]), 1.1));
  // Kopf
  IK.fill(ctx, (c) => { c.moveTo(-4.4, -6.6); c.lineTo(-4.6, -11); c.quadraticCurveTo(-4.4, -15.4, 0, -15.6); c.quadraticCurveTo(4.4, -15.4, 4.6, -11); c.lineTo(4.4, -6.6); c.quadraticCurveTo(0, -5.4, -4.4, -6.6); c.closePath(); },
    IK.rad(ctx, -1.6, -13, 0, 6, [[0, pal[0]], [0.7, pal[1]], [1, pal[2]]]), 1.1);
  // Sehschlitz (T) und Kamm
  IK.glow(ctx, eye || rim, 3, () => IK.fill(ctx, (c) => { c.rect(-3.4, -11.4, 6.8, 1.1); c.rect(-0.55, -11.4, 1.1, 4); }, eye || '#0e0806', 0));
  IK.fill(ctx, (c) => { c.moveTo(-0.9, -15.4); c.quadraticCurveTo(0, -18.4, 0.9, -15.4); c.closePath(); }, pal[0], 0.7);
  // Schulterplatten
  for (const sx of [-1, 1]) {
    IK.fill(ctx, (c) => { c.moveTo(sx * 4, -4.6); c.quadraticCurveTo(sx * 12, -5.6, sx * 13.4, 2.2); c.quadraticCurveTo(sx * 9, 0.6, sx * 4.6, 0.4); c.closePath(); },
      IK.lin(ctx, sx * 4, -6, sx * 12, 2, [[0, pal[0]], [1, pal[2]]]), 0.9);
  }
  // Brustlinie
  ctx.strokeStyle = 'rgba(10,6,4,0.55)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5.5, 3.5);
  ctx.quadraticCurveTo(0, 6, 5.5, 3.5);
  ctx.moveTo(0, 5.5);
  ctx.lineTo(0, 15);
  ctx.stroke();
  ctx.restore();
}

// Halbmond-Klinge (Sichel) aus Licht: Mitte (x,y), Radius r, Dicke d, gedreht um ang
function ikKriegerSichel(ctx, IK, x, y, r, d, ang, pal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // spitze Enden bei ±a, Dicke d in der Mitte
  const a = 1.32;
  const tx = r * Math.cos(a);
  const ty = r * Math.sin(a);
  const cx = 2 * (r - d) - tx;
  const path = (c) => {
    c.arc(0, 0, r, -a, a);
    c.quadraticCurveTo(cx, 0, tx, -ty);
    c.closePath();
  };
  IK.glow(ctx, pal[1], 8, () => IK.fill(ctx, path, IK.lin(ctx, r - d * 1.4, 0, r, 0, [[0, pal[2]], [0.45, pal[1]], [1, pal[0]]]), 0.8, 'rgba(20,40,80,0.8)'));
  // Glanzkante außen
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r - 0.9, -a * 0.8, a * 0.55);
  ctx.stroke();
  ctx.restore();
}

// Felszacke aus dem Boden: Fuß (x,y), Höhe h, Breite w, Neigung ang
function ikKriegerZacke(ctx, IK, x, y, h, w, ang, pal = ['#e8c89a', '#8a6a44', '#2e2014']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  IK.fill(ctx, (c) => { c.moveTo(-w / 2, 0); c.lineTo(-w * 0.18, -h * 0.55); c.lineTo(w * 0.05, -h); c.lineTo(w * 0.32, -h * 0.5); c.lineTo(w / 2, 0); c.closePath(); },
    IK.lin(ctx, -w / 2, -h, w / 2, 0, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]), 0.9);
  ctx.strokeStyle = 'rgba(255,240,210,0.6)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.05, -h + 0.6);
  ctx.lineTo(-w * 0.1, -h * 0.3);
  ctx.stroke();
  ctx.restore();
}

// Riss im Boden (leuchtend): Punkte pts, Farbe col
function ikKriegerRiss(ctx, IK, pts, col, w = 1.2) {
  IK.line(ctx, pts, '#1a0e06', w + 0.8, null);
  IK.glow(ctx, col, 4, () => IK.line(ctx, pts, col, w * 0.55, null));
}

// Hintergrundthemen (Ultimates haben kein Element, einige Fertigkeiten brauchen eigene Farbe)
Object.assign(SKILL_ART_THEME, {
  sichelwelle: 'eis',
  kampfrausch: 'blut',
  sprungschlag: 'erde',
  schwertaura: 'licht',
  felsenfaust: 'm_erde',
  erdbeben: 'knochen',
  starkerkoerper: 'gold',
  geistesschlag: 'seele',
  kriegsschrei: 'schatten',
  klingenhimmel: 'm_blitz',
  titanenzorn: 'm_feuer'
});

Object.assign(SKILL_ART, {
  // Sichelwelle: aufrechte blau-weiße Klingensichel rast über den Boden nach rechts, Lichtschleppe und Furche
  sichelwelle(ctx, IK) {
    // Furche am Boden
    IK.fill(ctx, (c) => c.ellipse(-2, 13.5, 17, 2.6, 0, 0, Math.PI * 2), IK.lin(ctx, -18, 13, 16, 13, [[0, 'rgba(10,20,40,0)'], [0.6, 'rgba(10,20,40,0.85)'], [1, 'rgba(10,20,40,0.6)']]), 0);
    // Lichtschleppe
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [y, len, w, a] of [[-6, 16, 1.6, 0.5], [0, 20, 2.4, 0.7], [6, 18, 2, 0.6], [11, 14, 1.4, 0.45]]) {
      ctx.strokeStyle = IK.lin(ctx, 4 - len, y, 4, y, [[0, 'rgba(160,220,255,0)'], [1, `rgba(200,240,255,${a})`]]);
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4 - len - 2, y);
      ctx.lineTo(4, y);
      ctx.stroke();
    }
    ctx.restore();
    ikKriegerSichel(ctx, IK, -6, 1, 16.5, 6.5, 0.36, ['#ffffff', '#9fdcff', '#2a6ad8']);
    IK.light(ctx, 8, 1, 10, '#bfe8ff', 0.6);
    // Funken, wo die Sichel über den Boden schrammt
    IK.sparkles(ctx, 6, '#e6f6ff', 4, 6, 4, 13, 1.3);
  },

  // Schwertwirbel: Schwert schräg in der Mitte, zwei leuchtende Wirbelspuren kreisen um die Figur
  schwertwirbel(ctx, IK) {
    IK.shock(ctx, 0, 13, 17, 5, '#ffcf7a', 1.4);
    IK.trail(ctx, 0, 1, 16, Math.PI * 0.95, Math.PI * 2.55, 5, '#ffd38a');
    IK.trail(ctx, 0, 1, 11, Math.PI * 1.95, Math.PI * 3.4, 3.5, '#fff1c8');
    IK.glow(ctx, '#ffd38a', 5, () => IK.sword(ctx, -7, 11, 25, 0.62));
    IK.sparkles(ctx, 6, '#fff6d0', 3, 19);
  },

  // Kampfrausch: Krieger in roter Flammensäule, rote Blitze zucken um den Körper
  kampfrausch(ctx, IK) {
    IK.light(ctx, 0, 2, 18, '#ff3a2a', 0.6);
    IK.flame(ctx, -10, 18, 30, -0.3, ['#8a0a0a', '#ff3a1a', '#ffd08a'], 1);
    IK.flame(ctx, 10, 18, 30, 0.3, ['#8a0a0a', '#ff3a1a', '#ffd08a'], -1);
    IK.flame(ctx, 1, 18, 38, 0, ['#8a0a0a', '#ff4a1a', '#ffe0a0']);
    ikKriegerKoerper(ctx, IK, 0, 9, 0.82, ['#6a2018', '#2a0a08', '#0e0404'], '#ff6a3a', '#ffb08a');
    IK.bolt(ctx, IK.zigzag(-17, -6, -10, 8, 4, 2.6, 3), '#ffd0c0', 1.4, '#ff2a2a');
    IK.bolt(ctx, IK.zigzag(16, -9, 10, 6, 4, 2.6, 7), '#ffd0c0', 1.4, '#ff2a2a');
    IK.sparkles(ctx, 6, '#ffb08a', 9, 18, 0, -2, 1.1);
  },

  // Sprungschlag: Krieger stürzt im Bogen mit gesenktem Schwert herab, Landung reißt eine Mulde mit Erdbrocken
  sprungschlag(ctx, IK) {
    // Sprungbogen: vom Absprung links unten hoch und hinab ins Ziel
    IK.trail(ctx, 0, 9, 17, Math.PI * 0.98, Math.PI * 1.6, 4.2, '#ffe6b8');
    IK.trail(ctx, 0, 9, 13.5, Math.PI * 1.08, Math.PI * 1.58, 1.6, '#fff6e0');
    // Mulde mit Wall aus Erdschollen
    IK.fill(ctx, (c) => c.ellipse(3, 14, 14, 4.4, 0, 0, Math.PI * 2), IK.rad(ctx, 3, 13, 0, 14, [[0, '#120804'], [0.65, '#3a2614'], [1, 'rgba(90,60,30,0.15)']]), 0);
    IK.light(ctx, 3, 12, 9, '#ffe6b8', 0.8);
    IK.shock(ctx, 3, 14, 16, 5, '#ffd8a0', 1.1);
    ikKriegerZacke(ctx, IK, -9, 16, 6, 5, -0.7);
    ikKriegerZacke(ctx, IK, 15, 16, 6, 5, 0.7);
    for (const [rx, ry, rr, sd] of [[-12, 7, 2.6, 2], [17, 5, 2.4, 5], [-6, 2, 1.8, 7], [12, -2, 2, 3], [-15, 15, 2.2, 9], [9, 6, 1.6, 4]]) IK.rock(ctx, rx, ry, rr, sd);
    // Fallstreifen neben der Klinge
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [x, y0, y1] of [[-2.5, -12, 2], [9, -10, 4], [11.5, -4, 6]]) {
      ctx.strokeStyle = IK.lin(ctx, x, y0, x, y1, [[0, 'rgba(255,230,180,0)'], [1, 'rgba(255,240,210,0.7)']]);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
    ctx.restore();
    // Schwert stößt mit der Spitze voran in die Mulde
    IK.glow(ctx, '#ffe6b8', 5, () => IK.sword(ctx, 3.6, -9, 21, Math.PI * 0.985, { w: 3.8 }));
    IK.sparkles(ctx, 5, '#fff1c8', 6, 8, 3, 11, 1.2);
  },

  // Aura des Schwertes: aufrechtes Schwert in goldener Lichtsäule mit Heiligenschein, Funken steigen auf
  schwertaura(ctx, IK) {
    IK.light(ctx, 0, 0, 20, '#ffe08a', 0.7);
    // Lichtsäule
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, -7, 0, 7, 0, [[0, 'rgba(255,220,120,0)'], [0.5, 'rgba(255,240,190,0.55)'], [1, 'rgba(255,220,120,0)']]);
    ctx.fillRect(-7, -22, 14, 44);
    ctx.restore();
    // Heiligenschein
    IK.glow(ctx, '#ffe08a', 6, () => {
      ctx.strokeStyle = IK.lin(ctx, -9, -12, 9, -6, [[0, '#fff6d0'], [0.5, '#ffd04a'], [1, '#c88a1a']]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -9, 10, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    IK.glow(ctx, '#ffd04a', 7, () => IK.sword(ctx, 0, 9, 27, 0, { w: 4, gold: '#ffc83a', mid: '#fff1c8', dark: '#d8a83a', dark2: '#8a6a2a' }));
    IK.sparkles(ctx, 9, '#fff6d0', 11, 18, 0, -2, 1.3);
  },

  // Felsenfaust: steinerne Faust bricht mit einem Felspfeiler aus dem rissigen Boden empor
  felsenfaust(ctx, IK) {
    // Boden und Lichtspalt
    IK.fill(ctx, (c) => c.ellipse(0, 15, 17, 4, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 15, 0, 17, [[0, '#2a1a0a'], [1, 'rgba(40,24,10,0)']]), 0);
    IK.light(ctx, 0, 14, 12, '#ffb04a', 0.8);
    ikKriegerRiss(ctx, IK, [[-18, 15], [-11, 13.5], [-6, 15.5], [0, 14]], '#ffb04a');
    // Keile im Kranz
    ikKriegerZacke(ctx, IK, -11, 17, 9, 5, -0.5);
    ikKriegerZacke(ctx, IK, 11, 17, 10, 5, 0.45);
    ikKriegerZacke(ctx, IK, -6, 18, 6, 4, -0.25);
    ikKriegerZacke(ctx, IK, 7, 18, 6, 4, 0.25);
    ikKriegerFaust(ctx, IK, 0, -5, 1.05, 0, ['#f0d0a0', '#9a7448', '#3a2614'], '#ffb04a');
    // fliegende Splitter
    for (const [rx, ry, rr, sd] of [[-14, -6, 2, 3], [14, -10, 1.8, 5], [-11, -15, 1.4, 8], [12, 0, 1.6, 2]]) IK.rock(ctx, rx, ry, rr, sd);
    IK.sparkles(ctx, 5, '#ffe0a0', 2, 16, 0, -4, 1.1);
  },

  // Erdbeben: der Boden reißt sternförmig auf, Felszacken brechen hervor, Staubring
  erdbeben(ctx, IK) {
    // Erdscheibe in Aufsicht
    IK.fill(ctx, (c) => c.ellipse(0, 4, 19, 13, 0, 0, Math.PI * 2), IK.rad(ctx, -3, 0, 2, 20, [[0, '#8a7058'], [0.6, '#4a3626'], [1, '#1e140c']]), 0);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const pts = [[0, 4]];
      for (let k = 1; k <= 3; k++) {
        const r = k * 6;
        const j = (k % 2 ? 0.18 : -0.15);
        pts.push([Math.cos(a + j) * r, 4 + Math.sin(a + j) * r * 0.68]);
      }
      ikKriegerRiss(ctx, IK, pts, '#ffb04a', 1.6);
    }
    IK.light(ctx, 0, 4, 9, '#ffb04a', 0.9);
    IK.shock(ctx, 0, 5, 18, 11, '#f0d8b0', 1.1);
    // Felszacken
    ikKriegerZacke(ctx, IK, -10, 6, 13, 6, -0.25, ['#d8d0c0', '#7a6a5a', '#2a221a']);
    ikKriegerZacke(ctx, IK, 9, 3, 15, 6.5, 0.2, ['#d8d0c0', '#7a6a5a', '#2a221a']);
    ikKriegerZacke(ctx, IK, -1, 13, 11, 6, 0.05, ['#d8d0c0', '#7a6a5a', '#2a221a']);
    ikKriegerZacke(ctx, IK, 1, -3, 9, 5, -0.05, ['#d8d0c0', '#7a6a5a', '#2a221a']);
    for (const [rx, ry, rr, sd] of [[-15, -6, 2, 4], [15, -9, 1.8, 6], [-5, -14, 1.6, 1]]) IK.rock(ctx, rx, ry, rr, sd, ['#d8d0c0', '#7a6a5a', '#2a221a']);
  },

  // Starker Körper: Krieger mit Haut aus Steinplatten, goldene Aura, Splitter fallen ab
  starkerkoerper(ctx, IK) {
    IK.light(ctx, 0, 0, 20, '#ffd04a', 0.7);
    ikKriegerKoerper(ctx, IK, 0, 5, 1.05, ['#e8d0a0', '#8a7454', '#3a2c1c'], '#ffd04a');
    // Steinplatten auf der Brust
    ctx.save();
    ctx.translate(0, 5);
    ctx.scale(1.05, 1.05);
    ctx.strokeStyle = 'rgba(30,18,8,0.75)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of [[-8, 7, -3, 9], [-3, 9, 3, 8], [3, 8, 8, 9.5], [-3, 9, -4, 15], [3, 8, 4, 15], [-11, 1, -6, 2], [6, 2, 11, 1], [-6, 2, -5, 7], [6, 2, 5, 7]]) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,160,0.8)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (const [x0, y0, x1, y1] of [[-7.6, 6.4, -3.2, 8.3], [-10.6, 0.4, -6.2, 1.4], [-2.8, 8.4, 2.6, 7.4]]) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
    ctx.restore();
    // goldener Rand der Aura
    IK.trail(ctx, 0, 4, 18, Math.PI * 0.85, Math.PI * 2.15, 2.2, '#ffe08a');
    for (const [rx, ry, rr, sd] of [[-16, 6, 1.8, 3], [16, 9, 1.6, 4], [-14, 14, 1.4, 6], [14, -6, 1.3, 2]]) IK.rock(ctx, rx, ry, rr, sd);
    IK.sparkles(ctx, 5, '#fff1c8', 4, 18, 0, -4, 1.2);
  },

  // Geistesschlag: wuchtiger Schwerthieb schräg von oben auf ein Ziel, blaue Geistersichel, Lichtsäule und Einschlagstern
  geistesschlag(ctx, IK) {
    // Lichtsäule am Ziel
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, 3, 0, 13, 0, [[0, 'rgba(120,180,255,0)'], [0.5, 'rgba(170,215,255,0.45)'], [1, 'rgba(120,180,255,0)']]);
    ctx.fillRect(3, -22, 10, 40);
    ctx.restore();
    // Geistersichel: breite blaue Spur des Hiebs
    ikKriegerSichel(ctx, IK, -6, 1, 17, 5.5, -0.75, ['#e6f4ff', '#6ab0ff', '#1a3a98']);
    // Einschlag: vierzackiger Stern
    IK.light(ctx, 8, 7, 12, '#9fd0ff', 1);
    IK.glow(ctx, '#9fd0ff', 6, () => IK.fill(ctx, (c) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        const r = i % 2 ? 1.8 : (i % 4 ? 5 : 10);
        const px = 8 + Math.cos(a) * r;
        const py = 7 + Math.sin(a) * r;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    }, IK.rad(ctx, 8, 7, 0, 10, [[0, '#ffffff'], [0.35, '#e6f4ff'], [1, '#4a9aff']]), 0));
    // Schwert, Spitze im Einschlag
    IK.glow(ctx, '#6ab0ff', 5, () => IK.sword(ctx, -9, -8, 20, Math.PI * 0.74, { w: 3.8, light: '#ffffff', mid: '#d8ecff', dark: '#5a8ad8', dark2: '#2a4a98', gold: '#8ab8ff' }));
    IK.sparkles(ctx, 5, '#e6f4ff', 8, 9, 8, 7, 1.2);
  },

  // Kriegsschrei: Krieger brüllt, drei orange Schallringe laufen nach außen, dunkle Fluchrune
  kriegsschrei(ctx, IK) {
    // Schallringe
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [r, w, a] of [[9, 2.6, 0.95], [14, 2.2, 0.75], [19, 1.8, 0.5]]) {
      ctx.strokeStyle = `rgba(255,140,60,${a})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(-2, 1, r, -0.75, 0.75);
      ctx.stroke();
    }
    ctx.restore();
    // Kopf im Profil mit Hörnerhelm, offener Mund nach rechts
    const head = (c) => {
      c.moveTo(-6, -8);
      c.quadraticCurveTo(-1, -12, 3, -7);
      c.lineTo(4, -3.5);
      c.lineTo(6.5, -2);
      c.lineTo(4.4, -0.6);
      c.lineTo(6.6, 2.8);
      c.lineTo(3.4, 2);
      c.lineTo(4.6, 6);
      c.quadraticCurveTo(1, 9, -3, 8);
      c.lineTo(-4, 14);
      c.lineTo(-13, 14);
      c.quadraticCurveTo(-14, 4, -11, -2);
      c.quadraticCurveTo(-10, -7, -6, -8);
      c.closePath();
    };
    IK.glow(ctx, '#ff7a3a', 5, () => IK.fill(ctx, head, IK.lin(ctx, -12, -10, 6, 12, [[0, '#5a2a1a'], [0.6, '#2a120a'], [1, '#0e0604']]), 1));
    // Helm
    IK.fill(ctx, (c) => { c.moveTo(-12, -3); c.quadraticCurveTo(-10, -12, -1, -11.5); c.quadraticCurveTo(3, -11, 3.6, -6.5); c.lineTo(-1, -6); c.lineTo(-3, -2.5); c.closePath(); },
      IK.lin(ctx, -10, -12, 2, -3, [[0, '#f0e0c0'], [0.45, '#9a8a7a'], [1, '#3a3028']]), 1);
    // Horn
    IK.fill(ctx, (c) => { c.moveTo(-8, -9); c.quadraticCurveTo(-14, -12, -13, -19); c.quadraticCurveTo(-10, -14, -4.6, -11); c.closePath(); },
      IK.lin(ctx, -13, -19, -6, -9, [[0, '#fff6e0'], [1, '#a89070']]), 0.9);
    // Mundöffnung leuchtet
    IK.glow(ctx, '#ff9a4a', 4, () => IK.fill(ctx, (c) => { c.moveTo(4.4, -0.6); c.lineTo(6.6, 2.8); c.lineTo(3.4, 2); c.closePath(); }, '#ffb04a', 0));
    // Auge
    IK.glow(ctx, '#ff3a1a', 3, () => IK.fill(ctx, (c) => c.ellipse(0.4, -4.2, 1.3, 0.6, -0.2, 0, Math.PI * 2), '#ffd08a', 0));
    // Schwächung: rote Pfeilspitzen nach unten über den Wellen
    for (const [y, a] of [[-15, 0.7], [-11, 1]]) {
      ctx.save();
      ctx.globalAlpha = a;
      IK.glow(ctx, '#ff2a1a', 4, () => IK.line(ctx, [[10, y], [13.5, y + 3], [17, y]], '#ff5a3a', 1.3, 'rgba(40,6,4,0.9)'));
      ctx.restore();
    }
    IK.sparkles(ctx, 4, '#ffb04a', 3, 8, 14, 2, 1.1);
  },

  // Klingenhimmel: geisterhafte Riesenschwerter stürzen vom Himmel in einen goldenen Runenkreis
  klingenhimmel(ctx, IK) {
    // Himmelsstrahl
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = IK.lin(ctx, -6, 0, 6, 0, [[0, 'rgba(255,230,160,0)'], [0.5, 'rgba(255,240,200,0.5)'], [1, 'rgba(255,230,160,0)']]);
    ctx.fillRect(-6, -22, 12, 40);
    ctx.restore();
    // Runenkreis am Boden
    IK.glow(ctx, '#ffd04a', 5, () => {
      ctx.strokeStyle = '#ffd86a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 13, 17, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 13, 13, 3.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Geisterschwerter, außen kleiner und blasser
    const ghost = { light: '#ffffff', mid: '#fff1c8', dark: '#c8a8ff', dark2: '#7a5ac8', gold: '#ffd04a' };
    for (const [x, y, len, a, al] of [[-13, -9, 17, 0.12, 0.75], [13, -9, 17, -0.12, 0.75], [-7, -14, 20, 0.05, 0.9], [7, -14, 20, -0.05, 0.9]]) {
      ctx.save();
      ctx.globalAlpha = al;
      IK.glow(ctx, '#fff1c8', 5, () => IK.sword(ctx, x, y, len, Math.PI + a, { ...ghost, w: 3 }));
      ctx.restore();
    }
    IK.glow(ctx, '#ffe08a', 8, () => IK.sword(ctx, 0, -16, 28, Math.PI, { ...ghost, w: 4.4 }));
    IK.light(ctx, 0, 12, 9, '#fff1c8', 0.9);
    IK.sparkles(ctx, 7, '#fff6d0', 12, 18, 0, 0, 1.2);
  },

  // Titanenzorn: glühende Titanenfaust schmettert von oben auf den Boden, Rissstern, zwei Druckringe, Felszacken
  titanenzorn(ctx, IK) {
    // Boden mit Rissstern
    IK.fill(ctx, (c) => c.ellipse(0, 13, 19, 6, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 13, 0, 19, [[0, '#3a1a08'], [1, 'rgba(30,10,4,0)']]), 0);
    for (const [x, y] of [[-18, 11], [-11, 17], [11, 17], [18, 11], [-5, 9], [6, 9]]) ikKriegerRiss(ctx, IK, [[0, 13], [(x) * 0.5 + 1, (y + 13) / 2 + 0.5], [x, y]], '#ffb04a', 1.3);
    IK.shock(ctx, 0, 13, 18, 5.4, '#ffb04a', 1.3);
    IK.shock(ctx, 0, 13, 12, 3.6, '#ffe0a0', 1.1);
    ikKriegerZacke(ctx, IK, -14, 15, 8, 4.5, -0.6);
    ikKriegerZacke(ctx, IK, 14, 15, 8, 4.5, 0.6);
    IK.light(ctx, 0, 11, 13, '#ff9a4a', 1);
    // Fallstreifen hinter der Faust
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [x, w] of [[-12, 1.2], [-9.5, 0.8], [10.5, 1.2], [13, 0.8]]) {
      ctx.strokeStyle = IK.lin(ctx, x, -18, x, 2, [[0, 'rgba(255,180,90,0)'], [1, 'rgba(255,220,160,0.75)']]);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, -18);
      ctx.lineTo(x, 2);
      ctx.stroke();
    }
    ctx.restore();
    // Faust von oben, Knöchel nach unten
    IK.glow(ctx, '#2a0a04', 4, () => ikKriegerFaust(ctx, IK, -1, 2, 1.15, Math.PI * 0.82, ['#f0c090', '#8a4a24', '#2a0e06'], '#ffd06a'));
    for (const [rx, ry, rr, sd] of [[-15, 3, 2.2, 3], [15, 1, 2, 5], [-10, -3, 1.4, 8], [11, -4, 1.5, 2]]) IK.rock(ctx, rx, ry, rr, sd);
    IK.sparkles(ctx, 6, '#ffe0a0', 7, 7, 0, 14, 1.2);
  }
});
