// Fertigkeiten: gemalte Symbole für die Leiste und eigene Effekte für jede der 20 Fertigkeiten.
// Die Spielmechanik steht in kampf.js; hier geht es nur ums Aussehen.

// --- Symbole ------------------------------------------------------------------------------
// Gezeichnet auf einer Fläche von -24 bis 24, Mitte bei 0,0.

const SKILL_ICON_BG = {
  angriff: ['#e0603e', '#5a1a10'],
  buff: ['#5a8ad8', '#14204a'],
  heilung: ['#6abd5a', '#143a14'],
  'beschwörung': ['#9a6ad8', '#24123e'],
  fluch: ['#9a6ad8', '#24123e']
};

// Umrandete Form: erst dunkle Kontur, dann Füllung mit Verlauf
function iconShape(ctx, path, top, bottom, line = 3) {
  path();
  ctx.lineJoin = 'round';
  ctx.lineWidth = line;
  ctx.strokeStyle = '#120c08';
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -18, 0, 18);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fill();
}

function iconLine(ctx, color, width, pts) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#120c08';
  ctx.lineWidth = width + 2.5;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function crescentPath(ctx, x0, y0, x1, y1, bulge) {
  return () => {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + nx / len * bulge, my + ny / len * bulge, x1, y1);
    ctx.quadraticCurveTo(mx + nx / len * bulge * 0.35, my + ny / len * bulge * 0.35, x0, y0);
    ctx.closePath();
  };
}

const SKILL_ICONS = {
  // Krieger
  dreifachschlag(ctx) {
    for (let k = 0; k < 3; k++) iconShape(ctx, crescentPath(ctx, -15 + k * 8, 14, 6 + k * 8, -15, 7), '#fff3c0', '#ff8a3a', 2.5);
  },
  schwertwirbel(ctx) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0.3, Math.PI * 1.75);
    ctx.stroke();
    ctx.strokeStyle = '#ffd38a';
    ctx.lineWidth = 5;
    ctx.stroke();
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(19, -2); ctx.lineTo(8, -2); ctx.closePath(); }, '#fff3c0', '#ff8a3a', 2);
    iconLine(ctx, '#e6eef8', 3, [[-6, 6], [6, -6]]);
  },
  kampfrausch(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 17);
      ctx.bezierCurveTo(-15, 15, -15, -2, -6, -8);
      ctx.bezierCurveTo(-6, -2, -2, 0, -1, -3);
      ctx.bezierCurveTo(-3, -11, 2, -17, 4, -19);
      ctx.bezierCurveTo(5, -10, 15, -6, 13, 6);
      ctx.bezierCurveTo(12, 13, 6, 17, 0, 17);
      ctx.closePath();
    }, '#ffe08a', '#e0381a');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(1, 8, 5, 7, 0, 0, Math.PI * 2); }, '#fff6d0', '#ffb04a', 1.5);
  },
  sturmangriff(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(16, 0); ctx.lineTo(-4, 10); ctx.lineTo(0, 0); ctx.closePath(); }, '#fff3c0', '#ff7a3a');
    for (const y of [-8, 0, 8]) iconLine(ctx, '#ffd38a', 2.5, [[-18, y], [-8 + Math.abs(y) * 0.3, y]]);
  },
  starkerkoerper(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-13, -14); ctx.lineTo(13, -14); ctx.lineTo(13, 0); ctx.quadraticCurveTo(12, 12, 0, 18); ctx.quadraticCurveTo(-12, 12, -13, 0); ctx.closePath(); }, '#ffe9a0', '#b88a2a');
    iconLine(ctx, '#fff6d0', 3, [[0, -8], [0, 9]]);
    iconLine(ctx, '#fff6d0', 3, [[-7, 0], [7, 0]]);
  },
  // Ninja
  hinterhalt(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(3, -18); ctx.lineTo(3, -6); ctx.lineTo(1, 10); ctx.lineTo(0, 14); ctx.lineTo(-1, 10); ctx.lineTo(-3, -6); ctx.closePath(); }, '#ffffff', '#b8a6ff');
    iconLine(ctx, '#6a4aa8', 3, [[-8, -6], [8, -6]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(9, 8); ctx.quadraticCurveTo(14, 14, 9, 17); ctx.quadraticCurveTo(4, 14, 9, 8); ctx.closePath(); }, '#ff8a9a', '#a0182a', 2);
  },
  giftpfeil(ctx) {
    iconLine(ctx, '#d8c7a0', 3, [[-15, 15], [10, -10]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(16, -16); ctx.lineTo(5, -13); ctx.lineTo(13, -5); ctx.closePath(); }, '#e6eef8', '#8a96a8', 2);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(2, 9, -6, 14); ctx.quadraticCurveTo(-14, 9, -6, 0); ctx.closePath(); }, '#c6f08a', '#3a8a2a', 2);
  },
  klingensturm(ctx) {
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(k * Math.PI / 2 + 0.4);
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(19, -1); ctx.lineTo(16, 3); ctx.lineTo(3, 2); ctx.closePath(); }, '#ffffff', '#b48cff', 2);
      ctx.restore();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); }, '#e0d0ff', '#6a4aa8', 2);
  },
  tarnung(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 15, 0.6, Math.PI * 2 - 0.6); ctx.arc(9, 0, 11, Math.PI * 2 - 1.2, 1.2, true); ctx.closePath(); }, '#e0d0ff', '#5a3a8a');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-4, -1, 3, 1.6, 0, 0, Math.PI * 2); }, '#ffffff', '#c9b8ff', 1.5);
  },
  leichtfuessigkeit(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-14, 16);
      ctx.quadraticCurveTo(-10, -6, 14, -17);
      ctx.quadraticCurveTo(10, 2, -14, 16);
      ctx.closePath();
    }, '#ffffff', '#b8c8e8');
    iconLine(ctx, '#7a8aa8', 1.5, [[-12, 14], [10, -14]]);
  },
  // Schamane
  talisman(ctx) {
    ctx.save();
    ctx.rotate(-0.25);
    iconShape(ctx, () => { ctx.beginPath(); ctx.rect(-9, -15, 18, 30); }, '#fff6dc', '#e8d8a8');
    iconLine(ctx, '#c8302a', 2, [[-4, -9], [4, -5], [-4, -1], [4, 3], [-4, 7]]);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,220,120,0.55)';
    ctx.beginPath();
    ctx.arc(10, -12, 4, 0, Math.PI * 2);
    ctx.fill();
  },
  drachengebruell(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.quadraticCurveTo(0, -18, 17, -14);
      ctx.quadraticCurveTo(10, -6, 18, 0);
      ctx.quadraticCurveTo(10, 6, 17, 14);
      ctx.quadraticCurveTo(0, 18, -17, 0);
      ctx.closePath();
    }, '#ffe08a', '#e0381a');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-4, 0, 7, 4, 0, 0, Math.PI * 2); }, '#fff6d0', '#ffb04a', 1.5);
  },
  segen(ctx) {
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      iconLine(ctx, '#ffe9a0', 2.5, [[Math.cos(a) * 10, Math.sin(a) * 10], [Math.cos(a) * 17, Math.sin(a) * 17]]);
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); }, '#fffbe6', '#e8b83a');
  },
  blitzschlag(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(4, -19); ctx.lineTo(-9, 2); ctx.lineTo(-1, 2); ctx.lineTo(-5, 19); ctx.lineTo(10, -4); ctx.lineTo(2, -4); ctx.closePath(); }, '#ffffff', '#7ac8ff');
  },
  heilung(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-14, 14); ctx.quadraticCurveTo(-14, -12, 15, -15); ctx.quadraticCurveTo(12, 12, -14, 14); ctx.closePath(); }, '#c6f08a', '#3a8a2a');
    iconLine(ctx, '#fffbe6', 2.5, [[4, -6], [4, 6]]);
    iconLine(ctx, '#fffbe6', 2.5, [[-2, 0], [10, 0]]);
  },
  // Nekromant
  seelenpfeil(ctx) {
    for (const y of [-6, 0, 6]) iconLine(ctx, '#a7e37f', 2, [[-18, y], [-6, y * 0.6]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(5, -2, 10, 0, Math.PI * 2); }, '#f0f8e0', '#a7e37f');
    ctx.fillStyle = '#123012';
    ctx.beginPath();
    ctx.ellipse(1, -2, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -2, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  lebensentzug(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.bezierCurveTo(-20, 2, -12, -18, 0, -7);
      ctx.bezierCurveTo(12, -18, 20, 2, 0, 15);
      ctx.closePath();
    }, '#ff8a9a', '#8a1020');
    iconLine(ctx, '#a7e37f', 2, [[-17, -15], [-6, -6]]);
  },
  totenbeschwoerung(ctx) {
    iconLine(ctx, '#e8e0c8', 3.5, [[-14, 14], [14, -2]]);
    iconLine(ctx, '#e8e0c8', 3.5, [[14, 14], [-14, -2]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI * 2); ctx.rect(-5, 2, 10, 6); }, '#fffbe6', '#c8c0a8');
    ctx.fillStyle = '#1a3a12';
    ctx.beginPath();
    ctx.ellipse(-4, -6, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -6, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a7e37f';
    ctx.fillRect(-4.6, -6.6, 1.4, 1.4);
    ctx.fillRect(3.4, -6.6, 1.4, 1.4);
  },
  fluch(ctx) {
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#c58cff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 12, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.closePath(); }, '#f0e0ff', '#9a6ad8', 2.5);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); }, '#3a1250', '#120c08', 1.5);
  },
  knochenpanzer(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-13, -14); ctx.lineTo(13, -14); ctx.lineTo(13, 0); ctx.quadraticCurveTo(12, 12, 0, 18); ctx.quadraticCurveTo(-12, 12, -13, 0); ctx.closePath(); }, '#fffbe6', '#c8c0a8');
    for (const y of [-7, -1, 5]) iconLine(ctx, '#7a7262', 2, [[-8, y], [8, y]]);
    iconLine(ctx, '#7a7262', 2, [[0, -11], [0, 12]]);
  }
};

const skillIconCache = new Map();

function skillIconUrl(sk) {
  if (skillIconCache.has(sk.id)) return skillIconCache.get(sk.id);
  const size = 96;
  const c = newCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.setTransform(size / 48, 0, 0, size / 48, size / 2, size / 2);
  const [light, dark] = SKILL_ICON_BG[sk.kind] || SKILL_ICON_BG.angriff;
  const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 24);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 23.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.stroke();
  (SKILL_ICONS[sk.id] || (() => {}))(ctx);
  const url = c.toDataURL();
  skillIconCache.set(sk.id, url);
  return url;
}

// --- Effekte je Fertigkeit -------------------------------------------------------------------
// color: Grundfarbe der Schwungspuren; cast: beim Auslösen; hit: bei jedem Treffer.

const SKILL_FX = {
  dreifachschlag: {
    color: '#ff8a3a',
    hit(m, crit, heavy) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 8, color: ['#ffd34d', '#ff7a2a', '#c8302a'], speed: [60, 180], life: [0.3, 0.6], size: [2, 4], shape: 'ember', drag: 3, gravity: -60 });
      if (heavy) addEffect({ type: 'decal', kind: 'crack', x: m.x, y: feetY(m), r: 26, dur: 1.8, color: '#2a1a10' });
    }
  },
  schwertwirbel: {
    color: '#ffb05a',
    cast(p, sk) {
      addEffect({ type: 'tornado', follow: p, r: sk.radius * 0.75, dur: 0.6, color: '#ffc87a' });
      addEffect({ type: 'decal', kind: 'ring', x: p.x, y: feetY(p), r: sk.radius * 0.85, dur: 1.4, color: '#5a3a1a' });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        particles(p.x + Math.cos(a) * 40, feetY(p) - 10 + Math.sin(a) * 18, { count: 1, color: ['#ffe0a0', '#ffffff'], angle: a + Math.PI / 2, spread: 0.1, speed: [220, 320], life: [0.25, 0.4], size: [1.5, 2.5], shape: 'spark', drag: 4 });
      }
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 6, color: ['#ffd34d', '#ffffff'], speed: [80, 200], life: [0.2, 0.4], size: [1.5, 2.5], shape: 'spark', drag: 5 });
    }
  },
  kampfrausch: {
    cast(p) {
      vfxPillar(p, '#ff5a3a', 0.9);
      addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 70, dur: 0.6, color: '#ff7a3a', width: 8, grow: true });
      flashScreen('#ff5a3a', 0.25);
    },
    aura: { every: 0.06, color: ['#ff7a2a', '#ffd34d', '#c8302a'], shape: 'ember', up: true }
  },
  sturmangriff: {
    color: '#ff8a3a',
    cast(p) {
      particles(p.x, feetY(p), { count: 16, color: ['#a88f62', '#c9b28a'], speed: [60, 160], life: [0.3, 0.6], size: [3, 5], drag: 3, glow: false });
    },
    trail(p) {
      particles(p.x, feetY(p) - 12, { count: 3, color: ['#ff7a2a', '#ffd34d'], speed: [10, 60], life: [0.25, 0.5], size: [2.5, 4.5], shape: 'ember', drag: 2, gravity: -80 });
    },
    end(p) {
      const c = bodyCenter(p);
      addEffect({ type: 'impact', x: c.x + p.facing.x * 20, y: c.y + p.facing.y * 10, dur: 0.35, color: '#ffd34d', big: true });
      addEffect({ type: 'decal', kind: 'scorch', x: p.x + p.facing.x * 18, y: feetY(p) + p.facing.y * 10, r: 30, dur: 2, color: '#1a1008' });
      particles(c.x, c.y, { count: 22, color: ['#ffd34d', '#ff7a2a', '#ffffff'], speed: [120, 280], life: [0.3, 0.6], size: [2, 4], shape: 'ember', drag: 3 });
    }
  },
  starkerkoerper: {
    cast(p) {
      vfxPillar(p, '#ffd34d', 1);
      addEffect({ type: 'ring', follow: p, ox: 0, oy: -20, r: 34, dur: 0.7, color: '#ffe9a0', width: 10, grow: true });
      particles(p.x, feetY(p) - 10, { count: 18, color: ['#9a9488', '#c8c0a8'], speed: [80, 180], life: [0.4, 0.7], size: [2.5, 4.5], shape: 'square', glow: false, gravity: 300 });
    },
    aura: { every: 0.12, color: ['#ffd34d', '#fff2c0'], shape: 'dot', up: true },
    ring: '#ffd34d'
  },
  hinterhalt: {
    color: '#b48cff',
    cast(p) {
      const t = game.target;
      if (!t) return;
      const c = bodyCenter(t);
      particles(c.x, c.y, { count: 22, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [30, 100], life: [0.5, 0.9], size: [5, 9], drag: 2.5, glow: false });
      flashScreen('#6a4aa8', 0.2);
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 14, color: ['#b48cff', '#ffffff', '#ff6a8a'], speed: [100, 260], life: [0.2, 0.45], size: [1.5, 3], shape: 'spark', drag: 5 });
    }
  },
  giftpfeil: {
    hit(m) {
      addEffect({ type: 'decal', kind: 'splash', x: m.x, y: feetY(m), r: 22, dur: 2.5, color: '#4a8a2a' });
    }
  },
  klingensturm: {
    color: '#b48cff',
    cast(p) {
      addEffect({ type: 'ring', follow: p, ox: 0, oy: -14, r: 60, dur: 0.5, color: '#b48cff', width: 5, grow: true });
    },
    hit(m) {
      const c = bodyCenter(m);
      for (let k = 0; k < 2; k++) addEffect({ type: 'slash', x: c.x + rand(-10, 10), y: c.y + rand(-12, 8), ang: Math.random() * Math.PI, len: 30, w: 4, dur: 0.16, color: '#d8c4ff' });
    }
  },
  tarnung: {
    cast(p) {
      addEffect({ type: 'ring', follow: p, ox: 0, oy: -14, r: 40, dur: 0.6, color: '#8a7aa8', width: 6, grow: true });
    },
    aura: { every: 0.15, color: ['#5a5466', '#8a7aa8'], shape: 'dot', up: true, glow: false, size: [4, 7] }
  },
  leichtfuessigkeit: {
    cast(p) {
      vfxPillar(p, '#c8d8f0', 0.7);
    },
    aura: { every: 0.05, color: ['#ffffff', '#c8d8f0'], shape: 'spark', wind: true, onlyMoving: true }
  },
  talisman: {
    cast(p) {
      const c = bodyCenter(p);
      addEffect({ type: 'runes', x: c.x + p.facing.x * 16, y: c.y + 6, r: 18, dur: 0.5, color: '#f0d27a' });
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 10, color: ['#f0d27a', '#ffffff'], speed: [80, 200], life: [0.2, 0.4], size: [1.5, 2.5], shape: 'spark', drag: 5 });
    }
  },
  drachengebruell: {
    cast(p, sk) {
      const dir = p.facing;
      const ang = Math.atan2(dir.y, dir.x);
      const c = bodyCenter(p);
      later(0.12, () => particles(c.x + dir.x * 20, c.y + dir.y * 10, {
        count: 40, color: ['#ffe08a', '#ff9a4a', '#e0381a'], angle: ang, spread: 0.35,
        speed: [sk.radius * 1.6, sk.radius * 3.2], life: [0.3, 0.55], size: [3, 6], shape: 'ember', drag: 3
      }));
      later(0.3, () => particles(c.x + dir.x * 60, c.y + dir.y * 30, { count: 14, color: ['#3a3430', '#5a524a'], angle: ang, spread: 0.6, speed: [20, 70], life: [0.6, 1], size: [6, 10], drag: 2, glow: false, gravity: -40 }));
      flashScreen('#ff7a2a', 0.18);
    },
    hit(m) {
      addEffect({ type: 'decal', kind: 'scorch', x: m.x, y: feetY(m), r: 20, dur: 2.2, color: '#1a1008' });
    }
  },
  segen: {
    cast(p) {
      vfxPillar(p, '#ffe9a0', 1);
      addEffect({ type: 'halo', follow: p, dur: 1.2, color: '#ffe9a0' });
      particles(p.x, feetY(p) - 60, { count: 12, color: ['#ffffff', '#fff2c0'], angle: Math.PI / 2, spread: 0.8, speed: [10, 40], life: [0.8, 1.4], size: [2, 3.5], shape: 'square', drag: 1, gravity: 30 });
    },
    aura: { every: 0.18, color: ['#ffe9a0', '#ffffff'], shape: 'dot', up: true },
    ring: '#ffe9a0'
  },
  blitzschlag: {
    cast() {
      const t = game.target;
      if (!t) return;
      for (let k = 1; k <= 2; k++) later(0.07 * k, () => addEffect({ type: 'bolt', x: t.x + rand(-30, 30), y: t.y + rand(-15, 15), dur: 0.35, color: '#9fd0ff' }));
      later(0.12, () => {
        flashScreen('#cfe8ff', 0.35);
        addEffect({ type: 'decal', kind: 'scorch', x: t.x, y: feetY(t), r: 36, dur: 2.4, color: '#141820' });
      });
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 10, color: ['#cfe8ff', '#ffffff'], speed: [100, 260], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 6 });
    }
  },
  heilung: {
    cast(p) {
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: 44, dur: 1.4, color: '#7ad36a' });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        particles(p.x + Math.cos(a) * 26, feetY(p) + Math.sin(a) * 10, { count: 1, color: ['#9be59b', '#d8ffb0'], angle: -Math.PI / 2, spread: 0.2, speed: [60, 120], life: [0.7, 1.1], size: [2.5, 4], shape: 'square', drag: 1.5 });
      }
    }
  },
  seelenpfeil: {
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 12, color: ['#a7e37f', '#e0ffd0'], speed: [40, 140], life: [0.3, 0.6], size: [2, 4], drag: 3, gravity: -60 });
    }
  },
  lebensentzug: {
    cast(p) {
      addEffect({ type: 'ring', follow: p, ox: 0, oy: -14, r: 30, dur: 0.5, color: '#ff6a7a', width: 4, grow: true });
    }
  },
  totenbeschwoerung: {
    cast(p) {
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: 70, dur: 2, color: '#7ad36a' });
      particles(p.x, feetY(p), { count: 30, color: ['#a7e37f', '#5aa83a', '#e0ffd0'], angle: -Math.PI / 2, spread: 0.9, speed: [60, 180], life: [0.5, 1], size: [2.5, 5], shape: 'ember', drag: 1.5, jitter: 30 });
      flashScreen('#5aa83a', 0.18);
    }
  },
  fluch: {
    cast(p, sk) {
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: sk.radius * 0.9, dur: 1.8, color: '#a774e0' });
      flashScreen('#6a3aa8', 0.2);
    }
  },
  knochenpanzer: {
    cast(p) {
      particles(p.x, feetY(p) - 20, { count: 20, color: ['#ddd5bb', '#ffffff'], speed: [80, 160], life: [0.4, 0.7], size: [2.5, 4], shape: 'square', glow: false });
    },
    orbit: true
  }
};

function skillColor(sk, fallback) {
  const fx = SKILL_FX[sk.id];
  return (fx && fx.color) || fallback;
}

function skillCastFx(sk) {
  const fx = SKILL_FX[sk.id];
  if (fx && fx.cast) fx.cast(game.player, sk);
}

function skillHitFx(id, m, crit, heavy) {
  const fx = SKILL_FX[id];
  if (fx && fx.hit) fx.hit(m, crit, heavy);
}

function skillPhaseFx(id, phase) {
  const fx = SKILL_FX[id];
  if (fx && fx[phase]) fx[phase](game.player);
}

// Dauerhafte Auren aktiver Buffs: Funken, Rauch oder Wind um die Figur
function updateBuffAuras(dt) {
  const p = game.player;
  if (!p || p.dead) return;
  p.auraTimers = p.auraTimers || {};
  for (const b of p.buffs) {
    const fx = SKILL_FX[b.id];
    if (!fx || !fx.aura) continue;
    const a = fx.aura;
    if (a.onlyMoving && !p.moving) continue;
    p.auraTimers[b.id] = (p.auraTimers[b.id] || 0) + dt;
    while (p.auraTimers[b.id] >= a.every) {
      p.auraTimers[b.id] -= a.every;
      const fy = feetY(p);
      if (a.wind) {
        particles(p.x - p.facing.x * 10 + rand(-8, 8), fy - rand(6, 40), { count: 1, color: a.color, angle: Math.atan2(-p.facing.y, -p.facing.x), spread: 0.1, speed: [120, 200], life: [0.15, 0.3], size: [1.2, 2], shape: 'spark', drag: 3 });
      } else {
        particles(p.x + rand(-12, 12), fy - rand(0, 30), { count: 1, color: a.color, angle: -Math.PI / 2, spread: 0.4, speed: [20, 60], life: [0.5, 0.9], size: a.size || [1.5, 3], shape: a.shape, drag: 1.5, glow: a.glow !== false });
      }
    }
  }
}
