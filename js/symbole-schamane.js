// Fertigkeitssymbole Schamane (seit 9.6), Stil und Hilfen in symbol-kunst.js
// Weg des Drachen: Blitzdrache, Drachenwirbel, Drachenkraft, Blizzard, Donnersturm, Drachensturm
// Weg der Heilung: Geisterfaust, Windfessel, Segen, Heilung, Schutzgeist, Himmelssegen

// eigene Hintergründe (nur hier benutzt), damit sich alle zwölf Symbole farblich unterscheiden
ICON_THEME.sch_heil = ['#46b04a', '#082a0c', '#d0ffb0'];
ICON_THEME.sch_meteor = ['#7a3450', '#16060e', '#ffc070'];
ICON_THEME.sch_himmel = ['#78a6dc', '#141c38', '#fff6d0'];

Object.assign(SKILL_ART_THEME, {
  talisman: 'blitz',
  drachengebruell: 'feuer',
  drachenkraft: 'blut',
  blitzschlag: 'eis',
  donnersturm: 'm_blitz',
  drachensturm: 'sch_meteor',
  geisterfaust: 'seele',
  windfessel: 'schatten',
  segen: 'licht',
  heilung: 'sch_heil',
  schutzgeist: 'm_frost',
  himmelssegen: 'sch_himmel'
});

// --- eigene Zeichenhilfen ------------------------------------------------------------------------

// Drachenleib entlang der Kurve f(t) (t = 0 Schwanz, 1 Hals): Rückenzacken, Leib mit Bauchglanz und Schuppenringen.
// pal = [Glanz, hell, mittel, dunkel]; liefert Halspunkt und Richtung für den Kopf
function ikSchamaneLeib(ctx, IK, f, wTail, wNeck, pal, o = {}) {
  const n = o.n || 44;
  const P = [];
  for (let i = 0; i <= n; i++) P.push(f(i / n));
  const N = [];
  const W = [];
  for (let i = 0; i <= n; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(n, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    N.push([-dy / l, dx / l]);
    const t = i / n;
    W.push(wTail + (wNeck - wTail) * Math.pow(t, 0.6));
  }
  const side = o.spikeSide || 1;
  const at = (i, k) => [P[i][0] + N[i][0] * W[i] * k, P[i][1] + N[i][1] * W[i] * k];
  // Rückenzacken (unter dem Leib)
  const every = o.spikeEvery || 3;
  const sl = o.spikeLen || 2.1;
  for (let i = 4; i < n - 1; i += every) {
    const b0 = at(i - 1, side * 0.6);
    const b1 = at(i + 1, side * 0.6);
    const tip = at(i - 2, side * sl);
    IK.fill(ctx, (c) => { c.moveTo(...b0); c.lineTo(...tip); c.lineTo(...b1); c.closePath(); },
      IK.lin(ctx, b0[0], b0[1], tip[0], tip[1], [[0, pal[2]], [1, pal[3]]]), 0.6, o.stroke || 'rgba(10,6,4,0.8)');
  }
  // Leib
  const body = (c) => {
    for (let i = 0; i <= n; i++) {
      const p = at(i, 1);
      if (i) c.lineTo(...p); else c.moveTo(...p);
    }
    for (let i = n; i >= 0; i--) c.lineTo(...at(i, -1));
    c.closePath();
  };
  const run = () => IK.fill(ctx, body, IK.lin(ctx, -18, -18, 18, 18, [[0, pal[1]], [0.5, pal[2]], [1, pal[3]]]), 1, o.stroke || 'rgba(10,6,4,0.9)');
  if (o.glow) IK.glow(ctx, o.glow, o.glowBlur || 6, run);
  else run();
  // Bauchband (heller, gegenüber den Zacken)
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < n; i++) {
    const p0 = at(i, -side * 0.42);
    const p1 = at(i + 1, -side * 0.42);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = pal[1];
    ctx.lineWidth = W[i] * 0.7;
    ctx.beginPath();
    ctx.moveTo(...p0);
    ctx.lineTo(...p1);
    ctx.stroke();
  }
  // Schuppenringe über den Bauch
  ctx.globalAlpha = o.rings === false ? 0 : 0.55;
  ctx.strokeStyle = pal[3];
  ctx.lineWidth = 0.45;
  for (let i = 3; i < n; i += 2) {
    ctx.beginPath();
    ctx.moveTo(...at(i, -side * 0.95));
    ctx.quadraticCurveTo(...at(i + 1, -side * 0.4), ...at(i, side * 0.1));
    ctx.stroke();
  }
  // Glanzlinie auf dem Rücken
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = pal[0];
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 2; i < n - 1; i++) {
    const p = at(i, side * 0.45);
    if (i > 2) ctx.lineTo(...p); else ctx.moveTo(...p);
  }
  ctx.stroke();
  ctx.restore();
  const a = P[n];
  const b = P[n - 2];
  return { x: a[0], y: a[1], ang: Math.atan2(a[1] - b[1], a[0] - b[0]), P, W };
}

// Drachenkopf mit offenem Maul, Hörnern, Bart und leuchtendem Auge; Hals bei (x,y), Blick in Winkel ang
function ikSchamaneKopf(ctx, IK, x, y, ang, s, pal, eye = '#fff7b0', o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (Math.cos(ang) < 0) ctx.scale(1, -1);
  ctx.scale(s, s);
  ctx.translate(-1, -0.6);
  const sk = o.stroke || 'rgba(10,6,4,0.9)';
  // hinteres Horn
  IK.fill(ctx, (c) => { c.moveTo(1, -4); c.quadraticCurveTo(-3, -7, -8, -7.5); c.quadraticCurveTo(-3, -5, 3, -2.6); c.closePath(); },
    IK.lin(ctx, 3, -3, -8, -7, [[0, pal[2]], [1, pal[3]]]), 0.6, sk);
  // Mähne: Zacken am Hinterkopf
  for (const [bx, by, tx, ty] of [[-0.5, 1.5, -6, 4.5], [0, 3.5, -4.5, 7.5], [-1, -1, -7, 0.5]]) {
    IK.fill(ctx, (c) => { c.moveTo(bx, by - 1.4); c.lineTo(tx, ty); c.lineTo(bx + 1, by + 1.2); c.closePath(); },
      IK.lin(ctx, bx, by, tx, ty, [[0, pal[2]], [1, pal[3]]]), 0.6, sk);
  }
  // Unterkiefer
  IK.fill(ctx, (c) => { c.moveTo(2, 2); c.lineTo(7, 1.6); c.lineTo(12.5, 4.6); c.quadraticCurveTo(9, 6.4, 4, 5.8); c.quadraticCurveTo(0.5, 5.4, 0, 3.4); c.closePath(); },
    IK.lin(ctx, 0, 2, 0, 6, [[0, pal[2]], [1, pal[3]]]), 0.8, sk);
  // Rachen
  IK.fill(ctx, (c) => { c.moveTo(6, 0.8); c.lineTo(12.6, 0.2); c.lineTo(12, 4.4); c.closePath(); }, o.mouth || '#3a0a08', 0);
  // Zähne
  ctx.fillStyle = '#ffffff';
  for (const tx of [8, 10, 12]) {
    ctx.beginPath();
    ctx.moveTo(tx - 0.7, 0.4);
    ctx.lineTo(tx + 0.7, 0.3);
    ctx.lineTo(tx, 1.9);
    ctx.closePath();
    ctx.fill();
  }
  // Oberkopf mit Schnauze
  IK.fill(ctx, (c) => {
    c.moveTo(-1.5, -2.6);
    c.quadraticCurveTo(1.5, -6.2, 6, -5);
    c.lineTo(12.4, -3.2);
    c.quadraticCurveTo(14.6, -2.4, 13.6, 0.4);
    c.lineTo(6.5, 0.9);
    c.quadraticCurveTo(2, 2.2, -1, 2.8);
    c.closePath();
  }, IK.lin(ctx, 2, -6, 4, 2, [[0, pal[1]], [0.55, pal[2]], [1, pal[3]]]), 0.9, sk);
  // Glanz auf Stirn und Schnauze
  ctx.strokeStyle = pal[0];
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1, -4.2);
  ctx.quadraticCurveTo(4, -5, 6.5, -4.3);
  ctx.lineTo(12, -2.7);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Nasenloch und Brauenwulst
  ctx.fillStyle = pal[3];
  ctx.beginPath();
  ctx.ellipse(12.2, -2.1, 0.7, 0.45, 0.3, 0, Math.PI * 2);
  ctx.fill();
  IK.fill(ctx, (c) => { c.moveTo(4, -4.2); c.quadraticCurveTo(6.5, -5.6, 8.4, -3.8); c.quadraticCurveTo(6.4, -4, 4, -3.2); c.closePath(); }, pal[3], 0);
  // Auge
  IK.glow(ctx, eye, 3, () => IK.fill(ctx, (c) => c.ellipse(6.6, -2.7, 1.25, 0.8, -0.15, 0, Math.PI * 2), IK.rad(ctx, 6.4, -2.9, 0, 1.4, [[0, '#ffffff'], [0.5, eye], [1, eye]]), 0.5, sk));
  ctx.fillStyle = 'rgba(10,6,4,0.9)';
  ctx.beginPath();
  ctx.ellipse(6.8, -2.7, 0.25, 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  // vorderes Horn
  IK.fill(ctx, (c) => { c.moveTo(2.5, -4.6); c.quadraticCurveTo(-1, -9, -6.5, -10.5); c.quadraticCurveTo(-1.5, -6.6, 4.6, -3.8); c.closePath(); },
    IK.lin(ctx, 4, -4, -6, -10, [[0, pal[0]], [0.4, pal[1]], [1, pal[2]]]), 0.7, sk);
  // Barthaar von der Schnauze nach hinten
  ctx.strokeStyle = o.whisker || pal[1];
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(11.5, -0.4);
  ctx.bezierCurveTo(9, 3, 4, 9, -2, 8);
  ctx.stroke();
  ctx.restore();
}

// Wolke aus Kugeln: oben angeleuchtet, unten dunkel
function ikSchamaneWolke(ctx, IK, x, y, s, pal = ['#c8c0e8', '#5a5080', '#1a1430']) {
  const balls = [[-10, 2, 5.5], [-4.5, -2.5, 7], [3, -4, 7.5], [9.5, 0, 6], [0, 2.5, 6.5]];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const shape = (c) => {
    for (const [bx, by, r] of balls) {
      c.moveTo(bx + r, by);
      c.arc(bx, by, r, 0, Math.PI * 2);
    }
  };
  // Kontur: etwas größer dunkel dahinter
  IK.fill(ctx, (c) => { for (const [bx, by, r] of balls) { c.moveTo(bx + r + 0.8, by); c.arc(bx, by, r + 0.8, 0, Math.PI * 2); } }, 'rgba(8,4,16,0.9)', 0);
  IK.fill(ctx, shape, IK.lin(ctx, 0, -12, 0, 9, [[0, pal[0]], [0.45, pal[1]], [1, pal[2]]]), 0);
  // Glanz auf den oberen Kugeln
  for (const [bx, by, r] of balls) IK.light(ctx, bx - r * 0.3, by - r * 0.45, r * 0.8, pal[0], 0.35);
  ctx.restore();
}

// Schneeflocke mit sechs Armen
function ikSchamaneFlocke(ctx, IK, x, y, r, col = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  IK.glow(ctx, '#bfe8ff', 3, () => {
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.5, r * 0.18);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + 0.2;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      ctx.moveTo(0, 0);
      ctx.lineTo(cx * r, cy * r);
      const m = r * 0.55;
      for (const d of [0.8, -0.8]) {
        ctx.moveTo(cx * m, cy * m);
        ctx.lineTo(cx * m + Math.cos(a + d) * r * 0.35, cy * m + Math.sin(a + d) * r * 0.35);
      }
    }
    ctx.stroke();
  });
  ctx.restore();
}

// Figur mit erhobenen Armen (Kraft sammeln): Füße bei (x,y), Höhe h
function ikSchamaneJubel(ctx, IK, x, y, h, fillStyle, stroke = 'rgba(10,6,4,0.9)') {
  ctx.save();
  ctx.translate(x, y);
  const k = h / 20;
  ctx.scale(k, k);
  IK.fill(ctx, (c) => {
    c.moveTo(2.6, -17);
    c.arc(0, -17, 2.6, 0, Math.PI * 2);
    c.moveTo(-3.2, -13.4);
    c.lineTo(-7.5, -20);
    c.lineTo(-6, -21);
    c.lineTo(-2.4, -15);
    c.quadraticCurveTo(0, -15.4, 2.4, -15);
    c.lineTo(6, -21);
    c.lineTo(7.5, -20);
    c.lineTo(3.2, -13.4);
    c.lineTo(2.6, -6);
    c.lineTo(4.4, 0);
    c.lineTo(1.8, 0);
    c.lineTo(0, -5);
    c.lineTo(-1.8, 0);
    c.lineTo(-4.4, 0);
    c.lineTo(-2.6, -6);
    c.closePath();
  }, fillStyle, 0.9 / k, stroke);
  ctx.restore();
}

// Leuchtendes Blatt: Stiel bei (x,y), Spitze in Winkel ang (0 = oben), Länge len
function ikSchamaneBlatt(ctx, IK, x, y, len, ang, pal = ['#f0ffd0', '#8af06a', '#2a9a3a', '#0a4a14']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const w = len * 0.42;
  IK.fill(ctx, (c) => { c.moveTo(0, 0); c.bezierCurveTo(-w, -len * 0.25, -w * 0.8, -len * 0.8, 0, -len); c.bezierCurveTo(w * 0.8, -len * 0.8, w, -len * 0.25, 0, 0); c.closePath(); },
    IK.lin(ctx, -w, -len, w, 0, [[0, pal[0]], [0.4, pal[1]], [0.75, pal[2]], [1, pal[3]]]), 0.8, 'rgba(4,24,8,0.9)');
  ctx.strokeStyle = pal[0];
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(0.4, len * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.05);
  ctx.quadraticCurveTo(w * 0.1, -len * 0.5, 0, -len * 0.92);
  for (const t of [0.3, 0.5, 0.7]) {
    ctx.moveTo(0, -len * t);
    ctx.lineTo(-w * 0.5, -len * (t + 0.14));
    ctx.moveTo(0, -len * t);
    ctx.lineTo(w * 0.5, -len * (t + 0.14));
  }
  ctx.stroke();
  ctx.restore();
}

// Lichtsäule von oben: Mitte x, von y0 bis y1, Breite w
function ikSchamaneSaeule(ctx, IK, x, y0, y1, w, col, core = '#ffffff', a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  for (const [k, al] of [[1, 0.35], [0.55, 0.6], [0.2, 0.9]]) {
    const ww = w * k;
    ctx.fillStyle = IK.lin(ctx, x - ww, 0, x + ww, 0, [[0, 'rgba(0,0,0,0)'], [0.5, k < 0.3 ? core : col], [1, 'rgba(0,0,0,0)']]);
    ctx.globalAlpha = a * al;
    ctx.beginPath();
    ctx.moveTo(x - ww * 0.7, y0);
    ctx.lineTo(x + ww * 0.7, y0);
    ctx.lineTo(x + ww, y1);
    ctx.lineTo(x - ww, y1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Runenkreis am Boden (flache Ellipse mit Zeichen)
function ikSchamaneRunen(ctx, IK, cx, cy, rx, ry, col) {
  IK.shock(ctx, cx, cy, rx, ry, col, 1.1);
  IK.shock(ctx, cx, cy, rx * 0.72, ry * 0.72, col, 0.6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.9;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * 0.86;
    const y = cy + Math.sin(a) * ry * 0.86;
    ctx.beginPath();
    ctx.moveTo(x - 0.8, y - 0.6);
    ctx.lineTo(x, y + 0.6);
    ctx.lineTo(x + 0.8, y - 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// Pfeil (abgeprallt): Spitze bei (x,y), Richtung ang (0 = nach rechts), Länge len
function ikSchamanePfeil(ctx, IK, x, y, len, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  IK.line(ctx, [[-len, 0], [-1.5, 0]], '#c89a5a', 0.9, 'rgba(30,14,4,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(1.8, 0); c.lineTo(-2, -1.6); c.lineTo(-1.4, 0); c.lineTo(-2, 1.6); c.closePath(); }, IK.lin(ctx, 0, -1.6, 0, 1.6, [[0, '#ffffff'], [1, '#6a7a90']]), 0.6);
  IK.fill(ctx, (c) => { c.moveTo(-len, 0); c.lineTo(-len - 1.6, -1.8); c.lineTo(-len + 2, -1.8); c.lineTo(-len + 3, 0); c.lineTo(-len + 2, 1.8); c.lineTo(-len - 1.6, 1.8); c.closePath(); }, '#e84a4a', 0.5);
  ctx.restore();
}

// --- Motive --------------------------------------------------------------------------------------
Object.assign(SKILL_ART, {
  // Blitzdrache: blauer Drache aus Licht schlängelt sich im S-Bogen nach oben, Blitze knistern um ihn
  talisman(ctx, IK) {
    const pal = ['#ffffff', '#e0f6ff', '#78c0ff', '#2a5ad0'];
    const f = (t) => {
      const u = 1 - t;
      const p0 = [-17, 13];
      const p1 = [10, 20];
      const p2 = [-20, -6];
      const p3 = [-1, -7];
      return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
    };
    IK.light(ctx, -2, 3, 16, '#6ab0ff', 0.45);
    IK.bolt(ctx, IK.zigzag(-14, 16, -18, 4, 4, 2, 3), '#fff7b0', 1, '#6aa0ff');
    const neck = ikSchamaneLeib(ctx, IK, f, 0.8, 4.4, pal, { glow: '#8fd0ff', glowBlur: 8, stroke: 'rgba(6,14,50,0.9)', spikeSide: -1, spikeEvery: 4, spikeLen: 1.7, rings: false });
    // leuchtender Kern: der Drache besteht aus Blitzlicht
    IK.bolt(ctx, neck.P.filter((_, i) => i > 3 && i % 3 === 0).map(([x, y], i) => [x + (i % 2 ? 0.6 : -0.6), y]), '#ffffff', 0.8, '#8fd0ff');
    ikSchamaneKopf(ctx, IK, neck.x, neck.y, -0.25, 1.15, pal, '#fff7b0', { stroke: 'rgba(6,14,50,0.9)', mouth: '#0a1650', whisker: '#e8f8ff' });
    // Blitz aus dem Maul
    IK.bolt(ctx, IK.zigzag(15, -5, 18, 7, 4, 2, 7), '#fff7b0', 1.4, '#8fd0ff');
    IK.light(ctx, 17, 8, 5, '#fff7b0', 0.9);
    IK.sparkles(ctx, 6, '#e8f8ff', 11, 18, 0, 0, 1.1);
  },

  // Drachenwirbel: Feuerdrache kreist um die Mitte, Flammenspur und Glutwirbel am Boden
  drachengebruell(ctx, IK) {
    const pal = ['#fff6c0', '#ffc04a', '#e0501a', '#6a1006'];
    const cx = 0;
    const cy = 1;
    const a0 = Math.PI * 0.55;
    const a1 = Math.PI * 2.2;
    IK.light(ctx, 0, 2, 13, '#ff7a2a', 0.7);
    IK.swirl(ctx, cx, cy, 1, 9, 1.4, '#ffb04a', 2.2, 1.2);
    IK.shock(ctx, 0, 12, 15, 4.5, '#ff9a4a', 1.2);
    // Flammen außen am Ring
    for (let k = 0; k < 7; k++) {
      const a = a0 + 0.3 + k * 0.62;
      IK.flame(ctx, cx + Math.cos(a) * 15.5, cy + Math.sin(a) * 15.5, 5 + (k % 2) * 1.5, a + Math.PI / 2 - 0.5, ['#c81a0a', '#ff8a2a', '#fff1a0']);
    }
    IK.trail(ctx, cx, cy, 13, a0 - 1.4, a0, 5, '#ffb04a');
    const r = (t) => 13 - t * 1.5;
    const f = (t) => {
      const a = a0 + (a1 - a0) * t;
      return [cx + Math.cos(a) * r(t), cy + Math.sin(a) * r(t)];
    };
    const neck = ikSchamaneLeib(ctx, IK, f, 0.8, 4, pal, { glow: '#ff8a2a', glowBlur: 5, spikeSide: 1, spikeEvery: 4, spikeLen: 1.6 });
    ikSchamaneKopf(ctx, IK, neck.x, neck.y, neck.ang + 0.3, 1.15, pal, '#fff1a0');
    IK.sparkles(ctx, 7, '#ffd38a', 4, 18, 0, 0, 1.1);
  },

  // Drachenkraft: Figur reckt die Arme, Flammensäule um sie, darüber ein feuriger Drachenkopf
  drachenkraft(ctx, IK) {
    const pal = ['#fff6c0', '#ffb04a', '#d8401a', '#5a0a06'];
    IK.light(ctx, 0, 0, 18, '#ff6a2a', 0.6);
    IK.shock(ctx, 0, 15, 12, 3.4, '#ffb04a', 1.3);
    // Flammensäule hinter der Figur
    IK.flame(ctx, -8, 16, 18, -0.3);
    IK.flame(ctx, 8, 16, 18, 0.3);
    IK.flame(ctx, 0, 16, 30, 0, ['#c81a0a', '#ff8a2a', '#fff1a0'], 0.8);
    // Drachenkopf über der Figur (wacht über ihr)
    ctx.save();
    ctx.globalAlpha = 0.95;
    IK.glow(ctx, '#ff8a2a', 6, () => ikSchamaneKopf(ctx, IK, -9, -10, -0.05, 1.05, pal, '#fff1a0'));
    ctx.restore();
    // Figur mit Glutkante
    IK.glow(ctx, '#ffd34d', 5, () => ikSchamaneJubel(ctx, IK, 0, 16, 19, IK.lin(ctx, -4, -4, 4, 16, [[0, '#5a1a10'], [1, '#1a0606']]), 'rgba(255,200,90,0.95)'));
    // aufsteigende Glut
    IK.sparkles(ctx, 9, '#ffd38a', 8, 16, 0, -2, 1.1);
  },

  // Blizzard: Eiszapfen stürzen schräg in einen vereisten Zielkreis, Schneeflocken wirbeln
  blitzschlag(ctx, IK) {
    IK.light(ctx, 0, 8, 14, '#bfe8ff', 0.5);
    // Zielkreis mit Raureif
    IK.fill(ctx, (c) => c.ellipse(0, 11, 17, 6, 0, 0, Math.PI * 2), IK.rad(ctx, 0, 11, 1, 17, [[0, 'rgba(230,250,255,0.55)'], [0.7, 'rgba(120,190,255,0.35)'], [1, 'rgba(60,120,220,0.2)']]), 0);
    IK.shock(ctx, 0, 11, 17, 6, '#d8f6ff', 1.2);
    // Sturmstreifen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#d8f6ff';
    ctx.lineCap = 'round';
    for (const [x, y, l, a] of [[-14, -12, 12, 0.35], [-6, -17, 10, 0.3], [4, -14, 9, 0.4], [-18, -2, 8, 0.4], [10, -6, 7, 0.35]]) {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + l, y + l * a);
      ctx.stroke();
    }
    ctx.restore();
    // Eiszapfen (Spitze nach unten, schräg)
    const ic = [[-11, -9, 13, 5, 2.75], [9, -13, 13, 5, 2.75], [-1, -15, 22, 7.5, 2.8], [13, 0, 8, 3.6, 2.7], [-15, 3, 7, 3.2, 2.75]];
    for (const [x, y, len, w, a] of ic) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(200,240,255,0.35)';
      ctx.lineWidth = w * 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.sin(a) * 2, y + Math.cos(a) * 2);
      ctx.lineTo(x + Math.sin(a) * 5, y - Math.cos(a) * 5);
      ctx.stroke();
      ctx.restore();
      IK.glow(ctx, '#d8f6ff', 4, () => IK.crystal(ctx, x, y, len, w, a));
    }
    ikSchamaneFlocke(ctx, IK, -13, -12, 3);
    ikSchamaneFlocke(ctx, IK, 14, -9, 2.4);
    ikSchamaneFlocke(ctx, IK, 9, 7, 2);
    ikSchamaneFlocke(ctx, IK, -9, 9, 2.2);
    IK.light(ctx, 3, 12, 6, '#ffffff', 0.7);
    IK.sparkles(ctx, 8, '#ffffff', 21, 18, 0, 0, 0.9);
  },

  // Donnersturm: dunkle Gewitterwolke, drei Blitze schlagen in den Boden, blauer Ring und Glut
  donnersturm(ctx, IK) {
    IK.light(ctx, 0, 8, 14, '#c8b0ff', 0.6);
    IK.fill(ctx, (c) => c.ellipse(0, 13, 10, 3.2, 0, 0, Math.PI * 2), 'rgba(20,10,30,0.7)', 0);
    IK.shock(ctx, 0, 13, 15, 4.6, '#8fd0ff', 1.4);
    IK.bolt(ctx, IK.zigzag(-8, -4, -12, 12, 4, 2.5, 3), '#fff7b0', 1.4, '#a07aff');
    IK.bolt(ctx, IK.zigzag(8, -4, 11, 12, 4, 2.5, 6), '#fff7b0', 1.4, '#a07aff');
    IK.bolt(ctx, IK.zigzag(0, -3, 0, 14, 5, 3.2, 2), '#fff7b0', 2.6, '#a07aff');
    for (const [x, r] of [[-12, 4], [11, 4], [0, 7]]) IK.light(ctx, x, 13, r, '#fff7b0', 0.95);
    ikSchamaneWolke(ctx, IK, 0, -8, 1.15, ['#d8d0ff', '#5a4a90', '#140c28']);
    // Wetterleuchten in der Wolke
    IK.light(ctx, -4, -6, 7, '#c8b0ff', 0.6);
    IK.sparkles(ctx, 5, '#fff7b0', 9, 17, 0, 6, 1);
  },

  // Drachensturm: Feuermeteore mit Flammenschweif stürzen auf einen glühenden Runenkreis
  drachensturm(ctx, IK) {
    IK.light(ctx, 0, 10, 16, '#ff7a2a', 0.6);
    ikSchamaneRunen(ctx, IK, 0, 12, 17, 5.5, '#ffb04a');
    const meteor = (x, y, r, tail, seed) => {
      const a = -Math.PI * 0.78; // Schweif nach oben rechts
      IK.flame(ctx, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, tail, a + Math.PI / 2, ['#c81a0a', '#ff8a2a', '#fff1a0']);
      IK.glow(ctx, '#ffb04a', 5, () => IK.rock(ctx, x, y, r, seed, ['#ffe08a', '#d8501a', '#3a0a04']));
      IK.light(ctx, x - r * 0.2, y + r * 0.2, r * 1.6, '#ffd34d', 0.6);
    };
    meteor(-11, -7, 2.6, 11, 3);
    meteor(13, -3, 2.2, 9, 5);
    meteor(-1, 3, 4.6, 19, 2);
    // Einschläge
    IK.light(ctx, -7, 12, 6, '#ffd34d', 0.9);
    IK.flame(ctx, -12, 13, 6, -0.3);
    IK.flame(ctx, 10, 13, 7, 0.25);
    IK.sparkles(ctx, 8, '#ffd38a', 13, 18, 0, 2, 1.1);
  },

  // Geisterfaust: türkise Faust aus Geisterkraft fliegt nach rechts, Geisterschweif, Aufprallstern
  geisterfaust(ctx, IK) {
    // Aufprallstern
    ctx.save();
    ctx.translate(13, -1);
    IK.glow(ctx, '#a8ffe0', 6, () => IK.fill(ctx, (c) => {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = k % 2 ? 2.6 : (k % 4 ? 6 : 8.5);
        if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
    }, IK.rad(ctx, 0, 0, 0, 8, [[0, '#ffffff'], [0.4, '#d8fff0'], [1, '#4ad8b8']]), 0));
    ctx.restore();
    IK.light(ctx, 13, -1, 9, '#a8ffe0', 0.8);
    // Geisterschweif (hinter der Faust)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [dy, w, a] of [[-5, 4, 0.6], [4, 5, 0.6], [0, 8, 0.85]]) {
      ctx.globalAlpha = a;
      ctx.fillStyle = IK.lin(ctx, -21, 0, -6, 0, [[0, 'rgba(0,0,0,0)'], [0.6, '#3ac8a8'], [1, '#a8ffe8']]);
      ctx.beginPath();
      ctx.moveTo(-4, dy - w / 2);
      ctx.bezierCurveTo(-10, dy - w / 2 - 3, -15, dy + 2, -21, dy - 2);
      ctx.bezierCurveTo(-15, dy + w / 2 + 2, -10, dy + w / 2 + 2, -4, dy + w / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Faust (Knöchel nach rechts)
    ctx.save();
    ctx.translate(0, -1);
    ctx.scale(1.25, 1.25);
    const pal = IK.lin(ctx, -6, -8, 6, 8, [[0, '#f0fff8'], [0.35, '#8ff0d8'], [0.75, '#2aa898'], [1, '#0a4a48']]);
    const sk = 'rgba(4,30,32,0.9)';
    IK.glow(ctx, '#6af0d0', 6, () => {
      // Unterarm/Handgelenk
      IK.fill(ctx, (c) => { c.moveTo(-5, -4.5); c.lineTo(-11, -3.5); c.lineTo(-11, 4); c.lineTo(-5, 5); c.closePath(); },
        IK.lin(ctx, -11, 0, -5, 0, [[0, 'rgba(60,200,180,0.2)'], [1, '#5ad8c0']]), 0.7, sk);
      // Handrücken
      IK.fill(ctx, (c) => c.roundRect(-6, -6.5, 10, 12.5, 3), pal, 0.8, sk);
    });
    // Finger
    for (let i = 0; i < 4; i++) {
      const y = -6.6 + i * 3.1;
      IK.fill(ctx, (c) => c.roundRect(1.5, y, 7.5, 3.3, 1.6), IK.lin(ctx, 0, y, 0, y + 3.3, [[0, '#f0fff8'], [0.5, '#7ae8d0'], [1, '#1a7a70']]), 0.7, sk);
    }
    // Daumen
    IK.fill(ctx, (c) => c.ellipse(1.5, 4.8, 4.6, 1.8, -0.12, 0, Math.PI * 2), IK.lin(ctx, 0, 3, 0, 6.6, [[0, '#d8fff0'], [1, '#2a9a8a']]), 0.7, sk);
    // Glanz auf den Knöcheln
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-4, -5.4);
    ctx.lineTo(2, -5.6);
    ctx.stroke();
    ctx.restore();
    IK.sparkles(ctx, 6, '#d8fff0', 6, 18, 0, 0, 1.1);
  },

  // Windfessel: türkise Windbänder schnüren einen dunklen Gegner ein, Fluchzeichen am Boden
  windfessel(ctx, IK) {
    ikSchamaneRunen(ctx, IK, 0, 14, 14, 4.2, '#b8a6ff');
    IK.light(ctx, 0, 2, 14, '#6af0d0', 0.35);
    const bands = [[-9, 13, 3.6, -0.18], [-1, 12, 3.4, 0.14], [7, 11, 3, -0.1]];
    const band = (y, rx, ry, rot, front) => {
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(rot);
      ctx.lineCap = 'round';
      const a0 = front ? 0 : Math.PI;
      const a1 = front ? Math.PI : Math.PI * 2;
      // dunkle Kontur, dann türkis mit hellem Kern
      for (const [w, col, al] of [[3.6, 'rgba(6,20,24,0.85)', 1], [2.4, '#3ad0b0', 1], [0.9, '#e0fff6', 0.95]]) {
        ctx.globalAlpha = front ? al : al * 0.55;
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, a0, a1);
        ctx.stroke();
      }
      ctx.restore();
    };
    for (const [y, rx, ry, rot] of bands) band(y, rx, ry, rot, false);
    // gefesselter Gegner
    IK.fill(ctx, (c) => {
      c.moveTo(3.6, -10.5);
      c.arc(0, -10.5, 3.6, 0, Math.PI * 2);
      c.moveTo(-4.6, -6);
      c.quadraticCurveTo(0, -7.6, 4.6, -6);
      c.lineTo(4.2, 4);
      c.lineTo(5, 14);
      c.lineTo(1.2, 14);
      c.lineTo(0, 6);
      c.lineTo(-1.2, 14);
      c.lineTo(-5, 14);
      c.lineTo(-4.2, 4);
      c.closePath();
    }, IK.lin(ctx, -5, -14, 5, 14, [[0, '#7a6aa8'], [0.5, '#3a2a5a'], [1, '#120a1e']]), 1, 'rgba(210,196,255,0.85)');
    // Augen
    for (const ex of [-1.4, 1.4]) IK.glow(ctx, '#ff5a7a', 3, () => IK.fill(ctx, (c) => c.ellipse(ex, -10.6, 0.8, 0.5, 0, 0, Math.PI * 2), '#ff8a9a', 0));
    for (const [y, rx, ry, rot] of bands) IK.glow(ctx, '#6af0d0', 4, () => band(y, rx, ry, rot, true));
    // Windschweife, die die Bänder nachziehen
    IK.sparkles(ctx, 5, '#d8fff0', 9, 18, 0, 0, 1);
  },

  // Segen: Figur mit Heiligenschein in goldener Lichthülle, Lichtflocken schweben herab
  segen(ctx, IK) {
    ikSchamaneSaeule(ctx, IK, 0, -24, 16, 13, '#ffe08a', '#fffbe0', 0.8);
    // Schutzhülle (Kugel aus Licht)
    IK.fill(ctx, (c) => c.arc(0, 3, 15.5, 0, Math.PI * 2), IK.rad(ctx, -4, -3, 2, 16, [[0, 'rgba(255,250,220,0.08)'], [0.8, 'rgba(255,220,120,0.18)'], [1, 'rgba(255,230,150,0.45)']]), 0);
    IK.glow(ctx, '#ffe08a', 5, () => {
      ctx.strokeStyle = 'rgba(255,240,180,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 3, 15.5, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Glanz auf der Hülle
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 3, 13, Math.PI * 1.1, Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
    IK.shock(ctx, 0, 15, 10, 2.8, '#ffe08a', 1);
    IK.figure(ctx, 0, 15, 22, IK.lin(ctx, -4, -6, 4, 15, [[0, '#6a4a1a'], [1, '#2a1806']]));
    // Heiligenschein
    IK.glow(ctx, '#fff6d0', 5, () => {
      for (const [w, col] of [[2.6, 'rgba(90,60,10,0.8)'], [1.6, '#ffe08a'], [0.6, '#ffffff']]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.ellipse(0, -10.6, 5.2, 1.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    IK.sparkles(ctx, 10, '#fff6d0', 17, 17, 0, -2, 1.2);
  },

  // Heilung: grüne Rune am Boden, ein leuchtender Spross mit zwei Blättern wächst auf, Lichtblätter steigen
  heilung(ctx, IK) {
    IK.light(ctx, 0, 4, 18, '#8af06a', 0.55);
    ikSchamaneRunen(ctx, IK, 0, 13, 16, 5, '#a8ff8a');
    ikSchamaneSaeule(ctx, IK, 0, -20, 14, 9, '#8af06a', '#f0ffd0', 0.5);
    // Stiel
    IK.line(ctx, [[0, 13], [0.6, 6], [-0.4, -1]], '#7ae05a', 1.6, 'rgba(4,24,8,0.85)');
    IK.glow(ctx, '#b8ff8a', 6, () => {
      ikSchamaneBlatt(ctx, IK, 0, 4, 15, -0.95);
      ikSchamaneBlatt(ctx, IK, 0, 2, 15, 0.95);
      ikSchamaneBlatt(ctx, IK, -0.4, -0.5, 16, 0.02);
    });
    // aufsteigende kleine Blätter
    for (const [x, y, l, a] of [[-14, 0, 5, -0.6], [13, -4, 5, 0.7], [-9, -13, 4, -0.3], [10, 8, 4, 0.5]]) {
      IK.glow(ctx, '#b8ff8a', 3, () => ikSchamaneBlatt(ctx, IK, x, y, l, a));
    }
    IK.sparkles(ctx, 9, '#e0ffc8', 31, 18, 0, -1, 1.1);
  },

  // Schutzgeist: großer durchscheinender Geist breitet die Arme schützend über die Figur, ein Geschoss prallt ab
  schutzgeist(ctx, IK) {
    ikSchamaneSaeule(ctx, IK, 0, -24, 16, 10, '#6af0d0', '#e0fff6', 0.45);
    IK.shock(ctx, 0, 14, 13, 3.8, '#8ff0d8', 1.2);
    // Geist
    const ghost = (c) => {
      c.moveTo(0, -18.5);
      c.bezierCurveTo(5, -18.5, 6, -13, 5, -10);
      c.bezierCurveTo(9, -10, 15, -9, 18, -4);
      c.bezierCurveTo(14, -5, 11, -4, 9, -2);
      c.bezierCurveTo(10, 4, 9, 10, 6, 14);
      c.quadraticCurveTo(4, 10, 2, 13);
      c.quadraticCurveTo(0, 9, -2, 13);
      c.quadraticCurveTo(-4, 10, -6, 14);
      c.bezierCurveTo(-9, 10, -10, 4, -9, -2);
      c.bezierCurveTo(-11, -4, -14, -5, -18, -4);
      c.bezierCurveTo(-15, -9, -9, -10, -5, -10);
      c.bezierCurveTo(-6, -13, -5, -18.5, 0, -18.5);
      c.closePath();
    };
    ctx.save();
    ctx.globalAlpha = 0.85;
    IK.glow(ctx, '#6af0d0', 8, () => IK.fill(ctx, ghost, IK.lin(ctx, -8, -18, 6, 14, [[0, 'rgba(230,255,248,0.95)'], [0.4, 'rgba(110,230,205,0.7)'], [1, 'rgba(20,90,110,0.15)']]), 0.8, 'rgba(200,255,240,0.7)'));
    ctx.restore();
    // Gesicht des Geistes: leuchtende Augen
    for (const ex of [-1.8, 1.8]) IK.glow(ctx, '#ffffff', 3, () => IK.fill(ctx, (c) => c.ellipse(ex, -13.5, 0.9, 1.3, 0, 0, Math.PI * 2), '#0a3a3a', 0));
    // Figur, die er schützt
    IK.figure(ctx, 0, 14, 15, IK.lin(ctx, -3, 0, 3, 14, [[0, '#1a3a5a'], [1, '#08142a']]));
    // abprallendes Geschoss rechts
    IK.light(ctx, 14, -2, 6, '#ffffff', 0.95);
    IK.trail(ctx, 25, -2, 11, Math.PI * 0.8, Math.PI * 1.15, 1.6, '#ffffff', 12);
    ikSchamanePfeil(ctx, IK, 15, -6, 9, -0.75);
    IK.sparkles(ctx, 6, '#e0fff6', 41, 18, 0, 0, 1.1);
  },

  // Himmelssegen: Himmelsstrahl auf die Mitte, Lichtsäulen fahren links und rechts herab, Runenkreis
  himmelssegen(ctx, IK) {
    // Wolkenlücke oben
    IK.light(ctx, 0, -18, 14, '#fff6d0', 0.9);
    ikSchamaneWolke(ctx, IK, -15, -16, 0.7, ['#ffffff', '#b8c8e8', '#4a5a8a']);
    ikSchamaneWolke(ctx, IK, 15, -16, 0.7, ['#ffffff', '#b8c8e8', '#4a5a8a']);
    ikSchamaneRunen(ctx, IK, 0, 13, 17, 5, '#fff2a0');
    ikSchamaneSaeule(ctx, IK, -12, -10, 13, 4.5, '#fff2a0', '#ffffff', 0.9);
    ikSchamaneSaeule(ctx, IK, 12, -10, 13, 4.5, '#fff2a0', '#ffffff', 0.9);
    ikSchamaneSaeule(ctx, IK, 0, -24, 14, 11, '#ffe9a0', '#ffffff', 1);
    for (const x of [-12, 12]) IK.shock(ctx, x, 13, 4.5, 1.5, '#ffffff', 0.9);
    // Himmelskrone: Sonnenstrahlen-Stern in der Mitte
    ctx.save();
    ctx.translate(0, 0);
    IK.glow(ctx, '#fff2a0', 6, () => IK.fill(ctx, (c) => {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 ? 3 : (k % 4 ? 6.5 : 9);
        if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
    }, IK.rad(ctx, -1, -1, 0, 9, [[0, '#ffffff'], [0.45, '#fff2a0'], [1, '#e8a82a']]), 0.8, 'rgba(90,60,10,0.8)'));
    ctx.restore();
    IK.light(ctx, 0, 0, 8, '#ffffff', 0.7);
    IK.sparkles(ctx, 10, '#fff6d0', 51, 18, 0, 0, 1.2);
  }
});
