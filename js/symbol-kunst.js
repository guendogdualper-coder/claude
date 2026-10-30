// Fertigkeitssymbole (seit 9.6): gemalter Stil statt flacher Formen. Jedes Symbol zeigt, was die Attacke tut
// (Schwertwirbel = Schwert im Wirbel), mit Licht, Glanz und Leuchten wie ein kleines Bild. Gezeichnet wird auf
// einer Fläche von -24 bis 24 (Mitte 0,0) in 128 px; Hintergrund und Rahmen kommen von hier, das Motiv aus
// SKILL_ART[id] (symbole-*.js). Fehlt ein neues Motiv, wird das alte aus SKILL_ICONS gezeichnet.

// Hintergrund je Element: [Mitte, Rand, Leuchtfarbe des Motivs]
const ICON_THEME = {
  klinge: ['#7a6a5a', '#1c1410', '#fff1c8'],
  erde: ['#8a6a3a', '#24160a', '#ffd38a'],
  feuer: ['#c8501e', '#2a0806', '#ffb04a'],
  schatten: ['#5a4a8a', '#0e0a1c', '#b8a6ff'],
  seele: ['#4a8a7a', '#08201a', '#a8ffe0'],
  blitz: ['#5a5ac8', '#0c0c2a', '#fff7b0'],
  eis: ['#4a8ad8', '#08163a', '#d8f6ff'],
  wind: ['#5aa88a', '#0a2418', '#e0fff0'],
  licht: ['#d8b04a', '#3a2408', '#fff6d0'],
  blut: ['#a8203a', '#24040a', '#ff8a9a'],
  knochen: ['#8a7a6a', '#1e1812', '#f0e6d0'],
  m_feuer: ['#d03a1e', '#2a0606', '#ffb04a'],
  m_frost: ['#2a6ae0', '#06123a', '#d8f6ff'],
  m_blitz: ['#7a4ae0', '#120a2e', '#fff7b0'],
  m_erde: ['#b07a2a', '#221810', '#ffd98a'],
  gold: ['#d8a83a', '#3a2006', '#fff1c8']
};

// Thema einer Fertigkeit: eigenes (sk.icon), Element, sonst nach Art
function iconThemeOf(sk) {
  if (sk.icon && ICON_THEME[sk.icon]) return ICON_THEME[sk.icon];
  if (SKILL_ART_THEME[sk.id]) return ICON_THEME[SKILL_ART_THEME[sk.id]];
  const el = sk.el ? 'm_' + sk.el : SKILL_ELEMENT[sk.id];
  if (el && ICON_THEME[el]) return ICON_THEME[el];
  if (sk.kind === 'heilung') return ICON_THEME.seele;
  if (sk.kind === 'buff') return ICON_THEME.licht;
  if (sk.kind === 'fluch' || sk.kind === 'beschwörung') return ICON_THEME.schatten;
  return ICON_THEME.klinge;
}

// Motive (neu) und eigenes Hintergrundthema je Fertigkeit; gefüllt in symbole-*.js
const SKILL_ART = {};
const SKILL_ART_THEME = {};

// --- Zeichenhilfen -------------------------------------------------------------------------------
// Alle Hilfen arbeiten in Symbolkoordinaten (-24 bis 24). Farben als Verlauf: Liste von [Anteil, Farbe].
const IK = {
  // Verlauf von (x0,y0) nach (x1,y1)
  lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  },
  rad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  },
  // Pfad füllen, mit dunkler Kontur (line 0 = keine)
  fill(ctx, path, fillStyle, line = 1.2, stroke = 'rgba(10,6,4,0.9)') {
    ctx.beginPath();
    path(ctx);
    if (line) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = line;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.fillStyle = fillStyle;
    ctx.fill();
  },
  // Leuchten: alles in fn bekommt einen weichen Schein in der Farbe color
  glow(ctx, color, blur, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * (ctx.getTransform().a || 1);
    fn();
    ctx.restore();
  },
  // weicher Lichtfleck (additiv)
  light(ctx, x, y, r, color, a = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = IK.rad(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  // Linie mit Kontur
  line(ctx, pts, color, w, outline = 'rgba(10,6,4,0.85)') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = w + 1.6;
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
  },
  // Bewegungsspur entlang eines Kreisbogens: wird zum Ende (a1) breiter und heller
  trail(ctx, cx, cy, r, a0, a1, w, color, steps = 24) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const aa = a0 + (a1 - a0) * t;
      const ab = a0 + (a1 - a0) * (t + 1 / steps);
      ctx.strokeStyle = color;
      ctx.globalAlpha = t * t * 0.9;
      ctx.lineWidth = w * (0.25 + 0.75 * t);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r, aa, ab, a1 < a0);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Schwert: Griff bei (x,y), Klinge zeigt in Winkel ang (0 = nach oben), Länge len
  sword(ctx, x, y, len, ang, o = {}) {
    const w = o.w || 3.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    // Griff und Knauf
    IK.fill(ctx, (c) => c.rect(-1.1, 0, 2.2, 6), IK.lin(ctx, -1, 0, 1, 0, [[0, '#3a2414'], [0.5, '#8a5a2a'], [1, '#3a2414']]), 0.9);
    IK.fill(ctx, (c) => c.arc(0, 7, 1.8, 0, Math.PI * 2), IK.rad(ctx, -0.5, 6.4, 0, 2, [[0, '#fff1c8'], [1, o.gold || '#b8862a']]), 0.9);
    // Parierstange
    IK.fill(ctx, (c) => { c.moveTo(-6, -1.4); c.quadraticCurveTo(0, -0.2, 6, -1.4); c.lineTo(6.6, 0.6); c.quadraticCurveTo(0, 1.4, -6.6, 0.6); c.closePath(); },
      IK.lin(ctx, 0, -1.4, 0, 1.4, [[0, '#fff1c8'], [0.5, o.gold || '#d8a83a'], [1, '#6a4a14']]), 0.9);
    // Klinge mit Grat: linke Hälfte hell, rechte dunkler
    const tip = -len;
    IK.fill(ctx, (c) => { c.moveTo(-w / 2, -1.2); c.lineTo(-w / 2, tip + w * 1.6); c.lineTo(0, tip); c.lineTo(w / 2, tip + w * 1.6); c.lineTo(w / 2, -1.2); c.closePath(); },
      IK.lin(ctx, -w / 2, 0, w / 2, 0, [[0, o.light || '#ffffff'], [0.48, o.mid || '#d8e2ee'], [0.52, o.dark || '#7a8aa0'], [1, o.dark2 || '#4a5468']]), 1);
    // Glanzlinie
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-w / 4, -2);
    ctx.lineTo(-w / 4, tip + w * 2);
    ctx.stroke();
    ctx.restore();
  },
  // Dolch: kürzer, breitere Basis
  dagger(ctx, x, y, len, ang, o = {}) {
    IK.sword(ctx, x, y, len, ang, { w: o.w || 3.6, gold: o.gold || '#8a7aa8', ...o });
  },
  // Flammenzunge: Fuß bei (x,y), Spitze in Winkel ang, Höhe h; pal = [Rand, Mitte, Kern]
  flame(ctx, x, y, h, ang = 0, pal = ['#c81a0a', '#ff8a2a', '#fff1a0'], wob = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const s = h / 20;
    ctx.scale(s, s);
    const shape = (k, dx) => (c) => {
      c.moveTo(0, 0);
      c.bezierCurveTo(-8 * k, -1, -8 * k, -9, -3 * k + dx, -13);
      c.bezierCurveTo(-3 * k + dx, -9, -1 * k, -8, 0 + dx * 0.4, -11);
      c.bezierCurveTo(0 + dx, -15, 2 * k + wob, -17, 1 * k + wob, -20);
      c.bezierCurveTo(6 * k + wob, -15, 9 * k, -9, 7 * k, -4);
      c.bezierCurveTo(6 * k, -1, 3 * k, 0, 0, 0);
      c.closePath();
    };
    IK.glow(ctx, pal[1], 4, () => IK.fill(ctx, shape(1, 0), IK.lin(ctx, 0, -20, 0, 0, [[0, pal[1]], [0.6, pal[0]], [1, pal[0]]]), 0.8 / s));
    IK.fill(ctx, (c) => { c.save(); c.translate(0.6, -0.5); c.scale(0.62, 0.66); shape(1, 0)(c); c.restore(); }, IK.lin(ctx, 0, -14, 0, 0, [[0, pal[2]], [1, pal[1]]]), 0);
    IK.fill(ctx, (c) => { c.save(); c.translate(1, -0.6); c.scale(0.3, 0.36); shape(1, 0)(c); c.restore(); }, '#ffffff', 0);
    ctx.restore();
  },
  // Blitz: Zickzack durch pts, mit Leuchten und weißem Kern; Äste mit branch > 0
  bolt(ctx, pts, color = '#fff7b0', w = 2.4, glowCol = '#9a8aff') {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.globalCompositeOperation = 'lighter';
    const path = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    };
    for (const [lw, col, a] of [[w * 4, glowCol, 0.18], [w * 2.2, glowCol, 0.4], [w, color, 1], [w * 0.4, '#ffffff', 1]]) {
      path();
      ctx.globalAlpha = a;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
    ctx.restore();
  },
  // Zickzack-Punkte von a nach b (für bolt); seed macht ihn reproduzierbar
  zigzag(x0, y0, x1, y1, n, amp, seed = 1) {
    const pts = [[x0, y0]];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = (rnd() - 0.5) * 2 * amp * (i % 2 ? 1 : -1);
      pts.push([x0 + dx * t - dy / len * off, y0 + dy * t + dx / len * off]);
    }
    pts.push([x1, y1]);
    return pts;
  },
  // Eiskristall: Spitze bei Winkel ang, Länge len, Breite w; facettiert (helle und dunkle Seite)
  crystal(ctx, x, y, len, w, ang = 0, pal = ['#eafcff', '#9ff0ff', '#3a7bff', '#1a3fb0']) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const tip = -len;
    IK.fill(ctx, (c) => { c.moveTo(0, 0); c.lineTo(-w / 2, -len * 0.25); c.lineTo(-w / 2.4, tip + w); c.lineTo(0, tip); c.lineTo(w / 2.4, tip + w); c.lineTo(w / 2, -len * 0.25); c.closePath(); },
      IK.lin(ctx, -w / 2, 0, w / 2, 0, [[0, pal[0]], [0.45, pal[1]], [0.55, pal[2]], [1, pal[3]]]), 0.9, 'rgba(6,16,40,0.9)');
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, tip + 1);
    ctx.stroke();
    ctx.restore();
  },
  // Felsbrocken mit Kanten
  rock(ctx, x, y, r, seed = 1, pal = ['#c9a878', '#7a5a3a', '#3a2a1c']) {
    const pts = [];
    let s = seed * 7919;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
      const rr = r * (0.75 + rnd() * 0.3);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    IK.fill(ctx, (c) => { pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); },
      IK.lin(ctx, x - r, y - r, x + r, y + r, [[0, pal[0]], [0.55, pal[1]], [1, pal[2]]]), 0.9);
    ctx.strokeStyle = 'rgba(255,240,210,0.5)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(x - r * 0.1, y - r * 0.1);
    ctx.lineTo(pts[5][0], pts[5][1]);
    ctx.stroke();
  },
  // Spirale/Wirbel um (cx,cy) von r0 bis r1, turns Umdrehungen
  swirl(ctx, cx, cy, r0, r1, turns, color, w, a0 = 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const steps = Math.ceil(turns * 40);
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const p = (t) => {
        const a = a0 + t * turns * Math.PI * 2;
        const r = r0 + (r1 - r0) * t;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      };
      const [x0, y0] = p(t0);
      const [x1, y1] = p(t1);
      ctx.globalAlpha = 0.25 + 0.75 * t0;
      ctx.strokeStyle = color;
      ctx.lineWidth = w * (0.3 + t0 * 0.7);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Funkeln: n kleine Sterne zufällig im Kreis rad um (cx,cy)
  sparkles(ctx, n, color, seed = 1, rad = 18, cx = 0, cy = 0, size = 1.6) {
    let s = seed * 104729;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * rad;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const k = size * (0.5 + rnd());
      ctx.globalAlpha = 0.6 + rnd() * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y - k * 1.6);
      ctx.quadraticCurveTo(x, y, x + k * 1.6, y);
      ctx.quadraticCurveTo(x, y, x, y + k * 1.6);
      ctx.quadraticCurveTo(x, y, x - k * 1.6, y);
      ctx.quadraticCurveTo(x, y, x, y - k * 1.6);
      ctx.fill();
    }
    ctx.restore();
  },
  // Druckwelle/Ring als flache Ellipse am Boden
  shock(ctx, cx, cy, rx, ry, color, w = 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [k, a] of [[1.6, 0.25], [1, 0.8]]) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Schädel (Nekromant): Mitte (x,y), Größe s
  skull(ctx, x, y, s, pal = ['#fff6e0', '#c8b898', '#5a4a3a'], eye = '#7affc8') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 10, s / 10);
    IK.fill(ctx, (c) => { c.arc(0, -2, 8, Math.PI * 0.85, Math.PI * 0.15); c.lineTo(5, 5); c.lineTo(3, 9); c.lineTo(-3, 9); c.lineTo(-5, 5); c.closePath(); },
      IK.lin(ctx, -6, -10, 6, 9, [[0, pal[0]], [0.6, pal[1]], [1, pal[2]]]), 1.1);
    for (const ex of [-3.2, 3.2]) {
      IK.fill(ctx, (c) => c.ellipse(ex, 0, 2.3, 2.6, 0, 0, Math.PI * 2), '#1a1210', 0);
      if (eye) IK.glow(ctx, eye, 3, () => IK.fill(ctx, (c) => c.arc(ex, 0.3, 1, 0, Math.PI * 2), eye, 0));
    }
    IK.fill(ctx, (c) => { c.moveTo(0, 3); c.lineTo(-1, 5); c.lineTo(1, 5); c.closePath(); }, '#2a1e18', 0);
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 0.6;
    for (const tx of [-2, 0, 2]) {
      ctx.beginPath();
      ctx.moveTo(tx, 6.5);
      ctx.lineTo(tx, 9);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Figur als Schattenriss (Spieler in Aktion): Mitte der Füße (x,y), Höhe h, Neigung lean
  figure(ctx, x, y, h, color = '#1a1420', lean = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    const k = h / 20;
    ctx.scale(k, k);
    IK.fill(ctx, (c) => {
      c.arc(0, -17, 2.6, 0, Math.PI * 2);
      c.moveTo(-3.2, -13.5);
      c.quadraticCurveTo(0, -14.6, 3.2, -13.5);
      c.lineTo(2.6, -6);
      c.lineTo(4, 0);
      c.lineTo(1.8, 0);
      c.lineTo(0, -5);
      c.lineTo(-1.8, 0);
      c.lineTo(-4, 0);
      c.lineTo(-2.6, -6);
      c.closePath();
    }, color, 0);
    ctx.restore();
  },
  // Tropfen (Blut, Wasser): Spitze oben
  drop(ctx, x, y, r, pal = ['#ff8a9a', '#c8102a', '#4a0410']) {
    IK.fill(ctx, (c) => { c.moveTo(x, y - r * 2); c.bezierCurveTo(x + r * 0.4, y - r * 1.2, x + r, y - r * 0.4, x + r, y + r * 0.2); c.arc(x, y + r * 0.2, r, 0, Math.PI); c.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.4, y - r * 1.2, x, y - r * 2); c.closePath(); },
      IK.rad(ctx, x - r * 0.35, y - r * 0.2, 0, r * 1.6, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]), 0.9);
  },
  // Knochen
  bone(ctx, x0, y0, x1, y1, w = 2.4, pal = ['#fff6e0', '#c8b898']) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.hypot(x1 - x0, y1 - y0);
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(a);
    IK.fill(ctx, (c) => {
      c.rect(0, -w / 2, len, w);
      for (const ex of [0, len]) for (const ey of [-w * 0.6, w * 0.6]) {
        c.moveTo(ex + w * 0.8, ey);
        c.arc(ex, ey, w * 0.8, 0, Math.PI * 2);
      }
    }, IK.lin(ctx, 0, -w, 0, w, [[0, pal[0]], [1, pal[1]]]), 0.9);
    ctx.restore();
  }
};

// --- Zeichnen ------------------------------------------------------------------------------------
function drawSkillIcon(ctx, sk) {
  const [mid, edge, glowCol] = iconThemeOf(sk);
  // Hintergrund: Lichtkugel oben, dunkler Rand
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 23.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = IK.rad(ctx, -3, -6, 1, 30, [[0, mid], [0.55, edge], [1, '#05030a']]);
  ctx.fillRect(-24, -24, 48, 48);
  // feine Strahlen hinter dem Motiv
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = glowCol;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(Math.cos(a - 0.09) * 30, Math.sin(a - 0.09) * 30 - 2);
    ctx.lineTo(Math.cos(a + 0.09) * 30, Math.sin(a + 0.09) * 30 - 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  IK.light(ctx, 0, -1, 16, glowCol, 0.22);
  // Motiv (neu, sonst alt)
  ctx.save();
  if (SKILL_ART[sk.id]) SKILL_ART[sk.id](ctx, IK, sk);
  else (SKILL_ICONS[sk.id] || (() => {}))(ctx);
  ctx.restore();
  // Innenschatten am Rand und Glanz oben
  ctx.fillStyle = IK.rad(ctx, 0, 0, 16, 24, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.fillRect(-24, -24, 48, 48);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = IK.lin(ctx, 0, -23, 0, -6, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
  ctx.beginPath();
  ctx.ellipse(0, -14, 17, 9, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  // Metallrand
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = IK.lin(ctx, -20, -20, 20, 20, [[0, '#fff1c8'], [0.35, '#c89a4a'], [0.7, '#6a4a1a'], [1, '#d8b06a']]);
  ctx.beginPath();
  ctx.arc(0, 0, 22.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(10,6,4,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 21.2, 0, Math.PI * 2);
  ctx.stroke();
}

// ersetzt skillIconUrl aus fertigkeiten.js: 128 px, neuer Stil
skillIconCache.clear();
skillIconUrl = function (sk) {
  if (skillIconCache.has(sk.id)) return skillIconCache.get(sk.id);
  const size = 128;
  const c = newCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.setTransform(size / 48, 0, 0, size / 48, size / 2, size / 2);
  drawSkillIcon(ctx, sk);
  const url = c.toDataURL();
  skillIconCache.set(sk.id, url);
  return url;
};
