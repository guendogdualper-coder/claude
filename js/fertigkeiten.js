// Fertigkeiten: gemalte Symbole für die Leiste und eigene Effekte für jede der 40 Fertigkeiten.
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

// Symbole der zweiten Wege (und der Aura des Schwertes)
Object.assign(SKILL_ICONS, {
  schwertaura(ctx) {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(255,214,120,${0.35 + k * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18 - k * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-2.5, 14); ctx.lineTo(-2.5, -12); ctx.lineTo(0, -18); ctx.lineTo(2.5, -12); ctx.lineTo(2.5, 14); ctx.closePath(); }, '#ffffff', '#ffd38a', 2);
    iconLine(ctx, '#c9a35a', 3, [[-8, 8], [8, 8]]);
    iconLine(ctx, '#6a2a24', 3, [[0, 10], [0, 17]]);
  },
  schildstoss(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(4, -12); ctx.lineTo(4, 2); ctx.quadraticCurveTo(3, 12, -5, 16); ctx.quadraticCurveTo(-13, 12, -14, 2); ctx.closePath(); }, '#e6eef8', '#7a8a9a');
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(-5, 0, 3.5, 0, Math.PI * 2); }, '#ffe9a0', '#b88a2a', 1.5);
    for (const y of [-8, 0, 8]) iconLine(ctx, '#ffd38a', 2.5, [[9, y], [18, y * 1.3]]);
  },
  erdbeben(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 8, 19, 8, 0, 0, Math.PI * 2); }, '#c9a878', '#6a4a2a');
    iconLine(ctx, '#2a1a10', 2, [[-12, 6], [-4, 9], [0, 4], [6, 10], [13, 7]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(6, -18); ctx.lineTo(8, -4); ctx.lineTo(-8, -4); ctx.closePath(); }, '#e9c6a1', '#a87a52', 2);
    for (const x of [-15, 15]) iconLine(ctx, '#ffd38a', 2, [[x, -6], [x * 1.1, -14]]);
  },
  geistesschlag(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); }, '#e0f2ff', '#3a6ab8');
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(10, -10); ctx.lineTo(14, -14); ctx.lineTo(12, -6); ctx.lineTo(-10, 16); ctx.closePath(); }, '#ffffff', '#9fd0ff', 2);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      iconLine(ctx, '#cfe8ff', 1.5, [[Math.cos(a) * 15, Math.sin(a) * 15], [Math.cos(a) * 20, Math.sin(a) * 20]]);
    }
  },
  kriegsschrei(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(-6, 0, 10, 0, Math.PI * 2); }, '#e9c6a1', '#a87a52');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-1, 3, 4, 5, 0, 0, Math.PI * 2); }, '#5a1a10', '#2a0a06', 1.5);
    ctx.strokeStyle = '#120c08';
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(2, 2, 10 + k * 5, -0.7, 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#ff9a4a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#120c08';
    }
  },
  wirbelklinge(ctx) {
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = '#c9b8ff';
    ctx.lineWidth = 4;
    ctx.stroke();
    for (const a of [0, Math.PI]) {
      ctx.save();
      ctx.rotate(a + 0.5);
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(16, -1); ctx.lineTo(13, 2.5); ctx.lineTo(2, 2); ctx.closePath(); }, '#ffffff', '#8a7aa8', 2);
      ctx.restore();
    }
  },
  giftnebel(ctx) {
    for (const [x, y, r] of [[-8, 4, 9], [7, 3, 10], [0, -6, 10], [-2, 9, 8]]) {
      iconShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }, '#c6f08a', '#3a8a2a', 2.5);
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); }, '#ffffff', '#8fd16a', 1.5);
    ctx.fillStyle = '#1a3a12';
    ctx.fillRect(-2.5, -1.5, 1.6, 1.6);
    ctx.fillRect(1, -1.5, 1.6, 1.6);
  },
  schattensprung(ctx) {
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.35 + k * 0.3;
      iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-12 + k * 9, 2, 5, 9, 0, 0, Math.PI * 2); }, '#c9b8ff', '#3a2a5a', 2);
    }
    ctx.globalAlpha = 1;
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(19, -2); ctx.lineTo(9, 6); ctx.closePath(); }, '#ffffff', '#8a6ad8', 2);
  },
  laehmklinge(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-15, 15); ctx.lineTo(9, -9); ctx.lineTo(15, -15); ctx.lineTo(11, -7); ctx.lineTo(-13, 17); ctx.closePath(); }, '#ffffff', '#b8c8d8', 2);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(6, 2); ctx.quadraticCurveTo(12, 10, 6, 14); ctx.quadraticCurveTo(0, 10, 6, 2); ctx.closePath(); }, '#c6f08a', '#3a8a2a', 2);
    iconLine(ctx, '#ffe9a0', 2, [[-10, -6], [-6, -12], [-2, -6], [2, -12]]);
  },
  schattenmantel(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.quadraticCurveTo(14, -12, 15, 16);
      ctx.lineTo(7, 12); ctx.lineTo(0, 17); ctx.lineTo(-7, 12); ctx.lineTo(-15, 16);
      ctx.quadraticCurveTo(-14, -12, 0, -17);
      ctx.closePath();
    }, '#8a7aa8', '#1a1426');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-4, -4, 3, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(4, -4, 3, 1.6, 0, 0, Math.PI * 2); }, '#ffffff', '#c9b8ff', 1.2);
  },
  drachenkraft(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(-14, 10);
      ctx.quadraticCurveTo(-16, -8, -2, -14);
      ctx.lineTo(4, -19); ctx.lineTo(5, -12);
      ctx.quadraticCurveTo(16, -8, 14, 4);
      ctx.lineTo(8, 2); ctx.lineTo(4, 10);
      ctx.quadraticCurveTo(-4, 6, -14, 10);
      ctx.closePath();
    }, '#ffe08a', '#c8402f');
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(2, -6, 3, 2, 0, 0, Math.PI * 2); }, '#ffffff', '#ffd34d', 1.2);
    iconLine(ctx, '#ffd34d', 2, [[-6, 14], [0, 18], [6, 14]]);
  },
  donnersturm(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-6, -9, 10, 7, 0, 0, Math.PI * 2); ctx.ellipse(6, -10, 11, 8, 0, 0, Math.PI * 2); }, '#d8e0ee', '#5a6478', 2.5);
    for (const x of [-9, 1, 10]) iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x, -2); ctx.lineTo(x - 4, 7); ctx.lineTo(x, 7); ctx.lineTo(x - 3, 17); ctx.lineTo(x + 5, 4); ctx.lineTo(x + 1, 4); ctx.lineTo(x + 3, -2); ctx.closePath(); }, '#ffffff', '#9fd0ff', 1.8);
  },
  geisterfaust(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(3, 0, 12, 10, 0, 0, Math.PI * 2); }, '#e8fffb', '#4aa8a0');
    for (const y of [-5, 0, 5]) iconLine(ctx, '#2a6a64', 1.6, [[8, y], [14, y]]);
    for (const y of [-9, 0, 9]) iconLine(ctx, '#8fe3d8', 2.5, [[-19, y], [-11, y * 0.8]]);
  },
  windfessel(ctx) {
    ctx.strokeStyle = '#120c08';
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, -8 + k * 8, 16 - k * 3, 4, 0, 0.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.strokeStyle = '#d8fff8';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#120c08';
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); }, '#ffffff', '#4aa8a0', 1.5);
  },
  schutzgeist(ctx) {
    iconShape(ctx, () => {
      ctx.beginPath();
      ctx.arc(0, -6, 10, Math.PI, 0);
      ctx.lineTo(10, 10); ctx.lineTo(6, 6); ctx.lineTo(2, 12); ctx.lineTo(-2, 6); ctx.lineTo(-6, 12); ctx.lineTo(-10, 6);
      ctx.closePath();
    }, '#ffffff', '#8fe3d8');
    ctx.fillStyle = '#1a3a3a';
    ctx.beginPath();
    ctx.ellipse(-3.5, -6, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(3.5, -6, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,160,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -1, 19, 0, Math.PI * 2);
    ctx.stroke();
  },
  seelensturm(ctx) {
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.rotate(k * Math.PI * 2 / 3);
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(14, -10, 16, 4); ctx.quadraticCurveTo(10, -2, 0, 2); ctx.closePath(); }, '#e0ffd0', '#5aa83a', 2);
      ctx.restore();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); }, '#f4f0e0', '#a8a080', 1.5);
    ctx.fillStyle = '#1a3a12';
    ctx.fillRect(-2.6, -1.6, 1.6, 1.8);
    ctx.fillRect(1, -1.6, 1.6, 1.8);
  },
  dunklemacht(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(5, -5); ctx.lineTo(18, 0); ctx.lineTo(5, 5); ctx.lineTo(0, 18); ctx.lineTo(-5, 5); ctx.lineTo(-18, 0); ctx.lineTo(-5, -5); ctx.closePath(); }, '#d6a8ff', '#3a1250');
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); }, '#a7e37f', '#1a3a12', 1.5);
  },
  knochenspeer(ctx) {
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(9, -4); ctx.lineTo(-14, -2); ctx.lineTo(-14, 2); ctx.lineTo(9, 4); ctx.closePath(); }, '#fffbe6', '#c8c0a8', 2);
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(-16, -3, 3.2, 0, Math.PI * 2); ctx.arc(-16, 3, 3.2, 0, Math.PI * 2); }, '#fffbe6', '#c8c0a8', 1.5);
    ctx.restore();
  },
  laehmung(ctx) {
    ctx.strokeStyle = '#120c08';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#7ad36a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(k * Math.PI / 2 + Math.PI / 4);
      iconLine(ctx, '#c6f08a', 2.5, [[4, 0], [10, 0], [12, -3], [14, 3]]);
      ctx.restore();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); }, '#e0ffd0', '#3a8a2a', 1.5);
  },
  blutopfer(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(15, 2, 0, 16); ctx.quadraticCurveTo(-15, 2, 0, -17); ctx.closePath(); }, '#ff8a9a', '#7a0a1a');
    iconLine(ctx, '#ffe0e4', 2, [[-4, 2], [0, 8], [6, -4]]);
    iconShape(ctx, () => { ctx.beginPath(); ctx.ellipse(-4, -2, 2, 3, -0.4, 0, Math.PI * 2); }, '#ffffff', '#ffd0d6', 1);
  }
});

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
    bladeSpin: { turns: 2, count: 1 },
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

// Effekte der zweiten Wege
Object.assign(SKILL_FX, {
  schwertaura: {
    cast(p) {
      vfxPillar(p, '#ffd38a', 1);
      addEffect({ type: 'halo', follow: p, dur: 1, color: '#ffe9a0' });
      flashScreen('#ffd38a', 0.2);
    },
    aura: { every: 0.08, color: ['#fff2c0', '#ffd38a', '#ffffff'], shape: 'spark', up: true },
    ring: '#ffd38a',
    weaponGlow: '#ffd36a'
  },
  schildstoss: {
    color: '#ffd38a',
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'impact', x: c.x, y: c.y, dur: 0.3, color: '#ffe9a0', big: true });
      addEffect({ type: 'ring', x: c.x, y: c.y, r: 30, dur: 0.35, color: '#ffd38a', width: 5, grow: true });
    }
  },
  erdbeben: {
    color: '#c9a878',
    cast(p, sk) {
      addEffect({ type: 'decal', kind: 'crack', x: p.x, y: feetY(p), r: sk.radius * 0.8, dur: 2.4, color: '#2a1a10' });
      addEffect({ type: 'ring', x: p.x, y: feetY(p), r: sk.radius, dur: 0.5, color: '#c9a878', width: 12, grow: true });
      particles(p.x, feetY(p), { count: 40, color: ['#8a6a44', '#c9a878', '#5a4030'], speed: [80, 260], life: [0.4, 0.8], size: [2.5, 5], shape: 'square', drag: 3, glow: false, gravity: 400 });
      shakeScreen(9);
    },
    hit(m) {
      particles(m.x, feetY(m), { count: 8, color: ['#8a6a44', '#c9a878'], angle: -Math.PI / 2, spread: 0.5, speed: [80, 160], life: [0.3, 0.5], size: [2, 4], shape: 'square', glow: false, gravity: 500 });
    }
  },
  geistesschlag: {
    color: '#9fd0ff',
    cast() { flashScreen('#9fd0ff', 0.22); },
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'pillar', x: m.x, y: feetY(m), dur: 0.45, color: '#9fd0ff' });
      particles(c.x, c.y, { count: 20, color: ['#cfe8ff', '#ffffff', '#5a8ad8'], speed: [100, 280], life: [0.2, 0.5], size: [1.5, 3], shape: 'spark', drag: 5 });
    }
  },
  kriegsschrei: {
    cast(p, sk) {
      for (let k = 0; k < 3; k++) later(k * 0.12, () => addEffect({ type: 'ring', follow: p, ox: 0, oy: -20, r: sk.radius * (0.5 + k * 0.25), dur: 0.5, color: '#ff9a4a', width: 6, grow: true }));
      flashScreen('#ff7a3a', 0.2);
      shakeScreen(5);
    }
  },
  wirbelklinge: {
    color: '#c9b8ff',
    bladeSpin: { turns: 2.5, count: 2 },
    cast(p, sk) {
      addEffect({ type: 'tornado', follow: p, r: sk.radius * 0.7, dur: 0.5, color: '#c9b8ff' });
    },
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'slash', x: c.x, y: c.y, ang: Math.random() * Math.PI, len: 32, w: 4, dur: 0.18, color: '#d8c4ff' });
    }
  },
  giftnebel: {
    hit(m) {
      particles(m.x, feetY(m) - 16, { count: 6, color: ['#8fd16a', '#5a8a3a'], speed: [10, 40], life: [0.5, 0.9], size: [3, 6], drag: 2, glow: false });
    }
  },
  schattensprung: {
    color: '#8a6ad8',
    cast(p) {
      particles(p.x, feetY(p) - 14, { count: 24, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [30, 100], life: [0.5, 0.9], size: [5, 9], drag: 2.5, glow: false });
    },
    trail(p) {
      particles(p.x, feetY(p) - 14, { count: 2, color: ['#5a5466', '#8a7aa8'], speed: [10, 40], life: [0.3, 0.6], size: [4, 7], drag: 2, glow: false });
    },
    end(p) {
      const c = bodyCenter(p);
      addEffect({ type: 'slash', x: c.x, y: c.y, ang: 0.8, len: 50, w: 7, dur: 0.25, color: '#c9b8ff' });
      addEffect({ type: 'slash', x: c.x, y: c.y, ang: -0.8, len: 50, w: 7, dur: 0.25, color: '#c9b8ff' });
    }
  },
  laehmklinge: {
    color: '#8fd16a',
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y - 18, { count: 10, color: ['#ffe9a0', '#ffffff'], speed: [30, 70], life: [0.5, 0.8], size: [1.5, 2.5], shape: 'spark', drag: 2 });
    }
  },
  schattenmantel: {
    cast(p) {
      particles(p.x, feetY(p) - 14, { count: 30, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [20, 70], life: [0.6, 1], size: [5, 9], jitter: 12, drag: 2, glow: false });
      addEffect({ type: 'ring', follow: p, ox: 0, oy: -14, r: 40, dur: 0.6, color: '#8a7aa8', width: 6, grow: true });
    },
    aura: { every: 0.14, color: ['#3d3848', '#5a5466'], shape: 'dot', up: true, glow: false, size: [4, 7] },
    ring: '#8a7aa8'
  },
  drachenkraft: {
    cast(p) {
      vfxPillar(p, '#ff9a4a', 1);
      addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 70, dur: 0.6, color: '#ffd34d', width: 8, grow: true });
      flashScreen('#ff9a4a', 0.2);
    },
    aura: { every: 0.07, color: ['#ffd34d', '#ff9a4a', '#ffe08a'], shape: 'ember', up: true },
    ring: '#ff9a4a'
  },
  donnersturm: {
    cast() {
      flashScreen('#cfe8ff', 0.4);
      const t = game.target;
      if (t) later(0.15, () => addEffect({ type: 'decal', kind: 'scorch', x: t.x, y: feetY(t), r: 60, dur: 2.6, color: '#141820' }));
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 8, color: ['#cfe8ff', '#ffffff'], speed: [100, 260], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 6 });
    }
  },
  geisterfaust: {
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'impact', x: c.x, y: c.y, dur: 0.3, color: '#8fe3d8', big: true });
    }
  },
  windfessel: {
    cast(p, sk) {
      addEffect({ type: 'tornado', follow: p, r: sk.radius * 0.6, dur: 0.7, color: '#d8fff8' });
    }
  },
  schutzgeist: {
    cast(p) {
      vfxPillar(p, '#8fe3d8', 1);
      addEffect({ type: 'halo', follow: p, dur: 1.2, color: '#d8fff8' });
    },
    aura: { every: 0.16, color: ['#d8fff8', '#8fe3d8'], shape: 'dot', up: true },
    ring: '#8fe3d8'
  },
  seelensturm: {
    color: '#a7e37f',
    cast(p, sk) {
      addEffect({ type: 'tornado', follow: p, r: sk.radius * 0.75, dur: 0.6, color: '#a7e37f' });
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: sk.radius * 0.8, dur: 1.4, color: '#7ad36a' });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        particles(p.x + Math.cos(a) * 30, feetY(p) - 14 + Math.sin(a) * 12, { count: 1, color: ['#e0ffd0', '#a7e37f'], angle: a + Math.PI / 2, spread: 0.1, speed: [160, 240], life: [0.4, 0.6], size: [3, 5], drag: 2 });
      }
    },
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 8, color: ['#a7e37f', '#e0ffd0'], speed: [40, 140], life: [0.3, 0.6], size: [2, 4], drag: 3, gravity: -60 });
    }
  },
  dunklemacht: {
    cast(p) {
      vfxPillar(p, '#b48cff', 1);
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: 50, dur: 1.6, color: '#a774e0' });
      flashScreen('#6a3aa8', 0.2);
    },
    aura: { every: 0.09, color: ['#b48cff', '#a7e37f', '#5a2a8a'], shape: 'ember', up: true },
    ring: '#a774e0'
  },
  knochenspeer: {
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 12, color: ['#ddd5bb', '#ffffff'], speed: [80, 200], life: [0.3, 0.5], size: [2, 3.5], shape: 'square', glow: false, gravity: 300 });
    }
  },
  laehmung: {
    cast(p, sk) {
      addEffect({ type: 'decal', kind: 'rune', x: p.x, y: feetY(p), r: sk.radius * 0.9, dur: 1.8, color: '#7ad36a' });
      flashScreen('#3a8a2a', 0.2);
    }
  },
  blutopfer: {
    cast(p) {
      vfxPillar(p, '#c43a5a', 1);
      particles(p.x, feetY(p) - 20, { count: 24, color: ['#ff6a7a', '#c43a5a', '#7a0a1a'], speed: [60, 160], life: [0.4, 0.8], size: [2, 4], drag: 2, gravity: 200 });
      flashScreen('#c43a5a', 0.2);
    },
    aura: { every: 0.12, color: ['#ff6a7a', '#c43a5a'], shape: 'dot', up: true },
    ring: '#c43a5a'
  }
});

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

// --- Ränge: je höher der Rang, desto wuchtiger sieht eine Fertigkeit aus -------------------------

function rankCastFx(p, rank, color) {
  const fy = feetY(p);
  addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 50 + rank * 14, dur: 0.55, color, width: 6 + rank * 2, grow: true });
  particles(p.x, fy - 14, { count: 14 + rank * 10, color: [color, '#ffffff'], speed: [80, 200 + rank * 40], life: [0.3, 0.6], size: [1.5, 3], shape: 'spark', drag: 4 });
  if (rank >= 1) addEffect({ type: 'decal', kind: 'rune', x: p.x, y: fy, r: 42 + rank * 8, dur: 1.4, color });
  if (rank >= 2) {
    vfxPillar(p, color, 0.7);
    flashScreen(color, 0.18);
  }
  if (rank >= 3) {
    later(0.1, () => addEffect({ type: 'ring', x: p.x, y: fy, r: 130, dur: 0.6, color: '#ffd34d', width: 12, grow: true }));
    particles(p.x, fy, { count: 30, color: ['#ff6a4a', '#ffd34d', '#ffffff'], angle: -Math.PI / 2, spread: 1.2, speed: [120, 260], life: [0.5, 0.9], size: [2, 4], shape: 'ember', drag: 2 });
    shakeScreen(5);
  }
}

function rankHitFx(m, rank) {
  const color = SKILL_RANKS[rank].color;
  const c = bodyCenter(m);
  particles(c.x, c.y, { count: 4 + rank * 4, color: [color, '#ffffff'], speed: [100, 220], life: [0.2, 0.4], size: [1.5, 2.8], shape: 'spark', drag: 5 });
  if (rank >= 2) addEffect({ type: 'impact', x: c.x, y: c.y, dur: 0.3, color, big: true });
}

// --- Sichtbare Buffs: jeder Buff hat ein eigenes Erscheinungsbild an der Figur ---------------------
// back wird vor der Figur gezeichnet (liegt dahinter), front danach. t = Spielzeit, fy = Fußlinie.

// Gezackter Blitz zwischen zwei Punkten, wechselt alle paar Hundertstel die Form
function zigzag(ctx, x0, y0, x1, y1, seed, jag = 5) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let k = 1; k < 5; k++) {
    const f = k / 5;
    const r = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
    const off = ((r - Math.floor(r)) - 0.5) * 2 * jag;
    ctx.lineTo(x0 + (x1 - x0) * f + off, y0 + (y1 - y0) * f + off * 0.6);
  }
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function orbit(t, speed, r, k, n, ry = 0.4) {
  const a = t * speed + (k / n) * Math.PI * 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r * ry, front: Math.sin(a) > 0 };
}

const BUFF_LOOKS = {
  // Kampfrausch: rote Blitze zucken um die Figur. Bis Stufe 17 nur ein einzelner, kurzer Blitz,
  // mit jedem Rang mehr und längere Blitze, ab Legendär knistert die ganze Figur.
  kampfrausch(ctx, p, fy, t, layer, b) {
    const r = skillRank(b.lvl || 1);
    if (layer === 'back') {
      glow(ctx, p.x, fy - 20, 24 + r * 4, '#ff3a1a', (0.18 + 0.06 * r) + 0.08 * Math.sin(t * 12));
      return;
    }
    const count = [1, 2, 3, 4, 6][r + 1];
    const len = 22 + 6 * (r + 1);
    const seed = Math.floor(t * (r < 0 ? 9 : 14));
    // ohne Rang flackert der Blitz nur ab und zu auf
    if (r < 0 && seed % 3 !== 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const wide = r >= 2 ? 1.4 : 1;
    for (let k = 0; k < count; k++) {
      const a = seed * 1.7 + k * (Math.PI * 2 / count);
      const x0 = p.x + Math.cos(a) * 10;
      const y0 = fy - 24 + Math.sin(a) * 12;
      const x1 = p.x + Math.cos(a) * len;
      const y1 = fy - 24 + Math.sin(a * 1.3) * (len - 6);
      ctx.strokeStyle = 'rgba(255,70,30,0.5)';
      ctx.lineWidth = (r < 0 ? 3 : 5) * wide;
      zigzag(ctx, x0, y0, x1, y1, seed + k, 7);
      ctx.strokeStyle = 'rgba(255,150,80,0.95)';
      ctx.lineWidth = (r < 0 ? 1.4 : 2.4) * wide;
      zigzag(ctx, x0, y0, x1, y1, seed + k, 7);
      ctx.strokeStyle = 'rgba(255,245,215,1)';
      ctx.lineWidth = 1;
      zigzag(ctx, x0, y0, x1, y1, seed + k, 7);
      glow(ctx, x1, y1, 4 + r * 1.5 + 2, '#ff7a3a', 0.4 + 0.1 * r);
    }
    // Legendär und Vollendet: Blitze schlagen bis in den Boden
    if (r >= 2) {
      for (let k = 0; k < r - 1; k++) {
        const x = p.x + Math.sin(seed * 2.3 + k * 3) * 22;
        ctx.strokeStyle = 'rgba(255,200,140,0.9)';
        ctx.lineWidth = 1.6;
        zigzag(ctx, x, fy - 52, x + Math.sin(seed + k) * 8, fy, seed + k * 7, 6);
        glow(ctx, x, fy, 9, '#ff5a2a', 0.6);
      }
    }
    ctx.restore();
  },
  // Aura des Schwertes: goldener Kreis am Boden mit Runen, aufsteigende Lichtfunken
  schwertaura(ctx, p, fy, t, layer) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (layer === 'back') {
      ctx.strokeStyle = 'rgba(255,214,120,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.ellipse(p.x, fy, 26, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < 6; k++) {
        const o = orbit(t, 1.2, 26, k, 6);
        ctx.fillStyle = 'rgba(255,233,160,0.9)';
        ctx.fillRect(p.x + o.x - 1.5, fy + o.y - 1.5, 3, 3);
      }
      glow(ctx, p.x, fy - 6, 28, '#ffd38a', 0.25);
    } else {
      for (let k = 0; k < 4; k++) {
        const u = (t * 0.7 + k / 4) % 1;
        glow(ctx, p.x + Math.sin(t * 2 + k * 1.6) * 14, fy - 4 - u * 46, 5, '#ffe9a0', 0.8 * (1 - u));
      }
    }
    ctx.restore();
  },
  // Starker Körper: goldene Schuppenschale um den Körper
  starkerkoerper(ctx, p, fy, t, layer) {
    if (layer !== 'front') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.25 + 0.12 * Math.sin(t * 4);
    ctx.strokeStyle = `rgba(255,211,77,${a + 0.2})`;
    ctx.fillStyle = `rgba(255,211,77,${a * 0.35})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(p.x, fy - 21, 19, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 0.8;
    for (let y = -40; y <= -4; y += 9) {
      ctx.beginPath();
      for (let x = -15; x <= 15; x += 6) {
        const yy = fy + y + ((x / 6) % 2 ? 3 : 0);
        if (x === -15) ctx.moveTo(p.x + x, yy);
        else ctx.lineTo(p.x + x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },
  // Leichtfüßigkeit: weiße Windbänder wirbeln um die Beine
  leichtfuessigkeit(ctx, p, fy, t, layer) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(230,245,255,0.7)';
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 2; k++) {
      const a0 = t * 8 + k * Math.PI;
      const front = Math.sin(a0 + 0.6) > 0;
      if ((layer === 'front') !== front) continue;
      ctx.beginPath();
      ctx.ellipse(p.x, fy - 6 - k * 10, 17, 6, 0, a0, a0 + 1.6);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Schattenmantel: dunkler Schleier und violette Glut
  schattenmantel(ctx, p, fy, t, layer) {
    if (layer === 'back') {
      ctx.save();
      ctx.globalAlpha *= 0.45;
      ctx.fillStyle = '#1a1426';
      for (let k = 0; k < 3; k++) ellipse(ctx, p.x + Math.sin(t * 2 + k * 2) * 6, fy - 16 - k * 6, 18 - k * 3, 20 - k * 4);
      ctx.restore();
    } else {
      glow(ctx, p.x, fy - 24, 22, '#8a5ad0', 0.25 + 0.1 * Math.sin(t * 5));
    }
  },
  // Drachenkraft: ein Feuerband kreist wie ein Drache um die Figur
  drachenkraft(ctx, p, fy, t, layer) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const o = orbit(t, 3, 24, -k * 0.09, 1, 0.45);
      if ((layer === 'front') !== o.front) continue;
      const y = fy - 20 + o.y + Math.sin(t * 3 - k * 0.4) * 9;
      glow(ctx, p.x + o.x, y, 12 - k * 0.6, k < 2 ? '#fff2b0' : k < 6 ? '#ffb04a' : '#ff5a1a', 0.95 - k * 0.05);
    }
    if (layer === 'back') glow(ctx, p.x, fy - 18, 30, '#ff7a2a', 0.22);
    ctx.restore();
  },
  // Segen: goldener Heiligenschein über dem Kopf
  segen(ctx, p, fy, t, layer) {
    if (layer !== 'front') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,233,160,0.95)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(p.x, fy - 54 + Math.sin(t * 3) * 1.5, 10, 3.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    glow(ctx, p.x, fy - 54, 16, '#ffe9a0', 0.35);
    ctx.restore();
  },
  // Schutzgeist: ein kleiner türkiser Geist kreist um die Figur
  schutzgeist(ctx, p, fy, t, layer) {
    const o = orbit(t, 2, 24, 0, 1, 0.45);
    if ((layer === 'front') !== o.front) return;
    const x = p.x + o.x;
    const y = fy - 30 + o.y + Math.sin(t * 4) * 3;
    ctx.save();
    glow(ctx, x, y, 12, '#8fe3d8', 0.55);
    ctx.fillStyle = 'rgba(220,255,250,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, Math.PI, 0);
    ctx.lineTo(x + 4.5, y + 5);
    ctx.lineTo(x + 1.5, y + 3);
    ctx.lineTo(x - 1.5, y + 5);
    ctx.lineTo(x - 4.5, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a3a3a';
    ctx.fillRect(x - 2.2, y - 1, 1.3, 1.6);
    ctx.fillRect(x + 0.9, y - 1, 1.3, 1.6);
    ctx.restore();
  },
  // Dunkle Macht: violett-grüne Flammen am Boden
  dunklemacht(ctx, p, fy, t, layer) {
    if (layer !== 'back') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      const x = p.x - 21 + k * 6;
      const h = 18 + Math.abs(Math.sin(t * 6 + k * 1.3)) * 22;
      const g = ctx.createLinearGradient(0, fy, 0, fy - h);
      g.addColorStop(0, k % 2 ? 'rgba(200,140,255,0.95)' : 'rgba(170,240,120,0.9)');
      g.addColorStop(0.6, 'rgba(140,70,220,0.5)');
      g.addColorStop(1, 'rgba(90,40,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 5, fy + 3);
      ctx.quadraticCurveTo(x - 3, fy - h * 0.6, x + Math.sin(t * 5 + k) * 2, fy - h);
      ctx.quadraticCurveTo(x + 3, fy - h * 0.6, x + 5, fy + 3);
      ctx.fill();
    }
    glow(ctx, p.x, fy - 8, 28, '#a774e0', 0.3);
    ctx.restore();
  },
  // Blutopfer: Blutstropfen kreisen, roter Schein
  blutopfer(ctx, p, fy, t, layer) {
    ctx.save();
    for (let k = 0; k < 5; k++) {
      const o = orbit(t, 2.4, 20, k, 5, 0.45);
      if ((layer === 'front') !== o.front) continue;
      const x = p.x + o.x;
      const y = fy - 22 + o.y;
      ctx.fillStyle = '#c8202a';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.quadraticCurveTo(x + 3, y, x, y + 2.5);
      ctx.quadraticCurveTo(x - 3, y, x, y - 4);
      ctx.fill();
    }
    if (layer === 'back') glow(ctx, p.x, fy - 20, 26, '#c43a5a', 0.3);
    ctx.restore();
  },
  // Heilung (Angriffsbuff danach): grüne Blätter kreisen
  heilung(ctx, p, fy, t, layer) {
    for (let k = 0; k < 3; k++) {
      const o = orbit(t, 1.6, 20, k, 3, 0.45);
      if ((layer === 'front') !== o.front) continue;
      ctx.fillStyle = '#7ad36a';
      ellipse(ctx, p.x + o.x, fy - 16 + o.y, 3.2, 1.8);
    }
  }
};

function drawBuffLooks(ctx, p, fy, layer) {
  if (!p.buffs || !p.buffs.length) return;
  for (const b of p.buffs) {
    const look = BUFF_LOOKS[b.id];
    if (look) look(ctx, p, fy, game.time, layer, b);
  }
}
