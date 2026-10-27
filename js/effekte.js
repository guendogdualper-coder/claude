// Effekte: Partikel, Schwungspuren, Treffer, Schadenszahlen, Geschosse,
// Bildschirmwackeln und kurzes Einfrieren bei harten Treffern.

const TEXT_STYLES = {
  dmg: { color: '#fff7e6', size: 26 },
  dot: { color: '#c6e8a0', size: 19 },
  crit: { color: '#ffd34d', size: 40, glow: '#ff7a1a' },
  hurt: { color: '#ff5a4a', size: 26 },
  heal: { color: '#8ff08f', size: 24 },
  mana: { color: '#8fb8ff', size: 21 },
  xp: { color: '#d6b8ff', size: 19 },
  gold: { color: '#f0cf6a', size: 17 },
  info: { color: '#e8e0cc', size: 17 },
  level: { color: '#ffd34d', size: 38, glow: '#ff9a1a' }
};

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const rand = (a, b) => a + Math.random() * (b - a);

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Mitte des Körpers, dort sitzen Treffer und Funken
function bodyCenter(e) {
  if (e.isStone) return { x: e.x, y: e.y - 18 };
  return { x: e.x, y: feetY(e) - figureHeight(e) * 0.45 };
}

// --- Bildschirm --------------------------------------------------------------------

function shakeScreen(amount) {
  game.shake = Math.max(game.shake, amount);
}

function hitStop(seconds) {
  game.hitStop = Math.max(game.hitStop, seconds);
}

function updateScreenEffects(realDt) {
  game.shake *= Math.pow(0.0004, realDt);
  if (game.shake < 0.15) game.shake = 0;
  game.hurtFlash = Math.max(0, game.hurtFlash - realDt);
  game.screenFlash = Math.max(0, (game.screenFlash || 0) - realDt);
}

// Heller Schein über den ganzen Bildschirm (Stufenaufstieg, starke Fertigkeiten)
function flashScreen(color, amount) {
  game.flashColor = color;
  game.screenFlash = Math.max(game.screenFlash || 0, amount);
}

function drawScreenFlash(ctx, w, h) {
  if (!(game.screenFlash > 0)) return;
  ctx.fillStyle = `rgba(${hexRgb(game.flashColor || '#fff0c8')},${Math.min(0.45, game.screenFlash * 0.7)})`;
  ctx.fillRect(0, 0, w, h);
}

// Stufenaufstieg: Lichtsäule vom Himmel, Ringe am Boden, aufsteigende Funken, Figur leuchtet
function vfxLevelUp(p) {
  addEffect({ type: 'lightbeam', follow: p, dur: 1.7, color: '#ffe9a0' });
  for (let i = 0; i < 3; i++) {
    later(0.15 + i * 0.2, () => addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 70, dur: 0.9, color: '#ffd34d', width: 6, grow: true }));
  }
  particles(p.x, feetY(p), { count: 60, color: ['#ffd34d', '#fff2c0', '#ffffff'], angle: -Math.PI / 2, spread: 0.5, speed: [80, 260], life: [0.8, 1.5], size: [1.5, 3.5], jitter: 18, drag: 1.2 });
  later(0.3, () => particles(p.x, feetY(p) - 30, { count: 30, color: ['#ffd34d', '#ffffff'], speed: [40, 120], life: [0.6, 1], size: [1.5, 3] }));
  addText(p.x, feetY(p) - 76, 'Stufe ' + p.level + '!', 'level');
  flashScreen('#fff0c8', 0.55);
  p.glowUntil = game.time + 1.5;
  shakeScreen(3);
}

// Roter Rand, wenn die Figur getroffen wird (in Bildschirmkoordinaten)
function drawHurtVignette(ctx, w, h) {
  if (game.hurtFlash <= 0) return;
  const a = game.hurtFlash / 0.35 * 0.5;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(200,30,20,0)');
  g.addColorStop(1, `rgba(200,30,20,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// --- Partikel -------------------------------------------------------------------------

// o: color, count, speed [min,max], life [min,max], size [min,max], angle + spread (Richtung),
//    gravity, drag, shape ('dot' | 'spark' | 'square' | 'ember'), glow (leuchtend addieren)
function particles(x, y, o) {
  const n = o.count || 8;
  for (let i = 0; i < n; i++) {
    const ang = o.angle != null ? o.angle + rand(-1, 1) * (o.spread != null ? o.spread : Math.PI) : rand(0, Math.PI * 2);
    const sp = rand(...(o.speed || [40, 120]));
    const life = rand(...(o.life || [0.3, 0.6]));
    game.particles.push({
      x: x + rand(-1, 1) * (o.jitter || 0), y: y + rand(-1, 1) * (o.jitter || 0),
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life, max: life, size: rand(...(o.size || [1.5, 3])),
      color: Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : o.color,
      gravity: o.gravity || 0, drag: o.drag != null ? o.drag : 2.5,
      shape: o.shape || 'dot', glow: o.glow !== false, rot: rand(0, 6), spin: rand(-8, 8)
    });
  }
  if (game.particles.length > 700) game.particles.splice(0, game.particles.length - 700);
}

function updateParticles(dt) {
  for (const q of game.particles) {
    q.life -= dt;
    q.vx *= Math.exp(-q.drag * dt);
    q.vy = q.vy * Math.exp(-q.drag * dt) + q.gravity * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.rot += q.spin * dt;
  }
  game.particles = game.particles.filter((q) => q.life > 0);
}

function drawParticles(ctx) {
  ctx.save();
  for (const q of game.particles) {
    const k = q.life / q.max;
    ctx.globalCompositeOperation = q.glow ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, k * 1.5);
    ctx.fillStyle = q.color;
    ctx.strokeStyle = q.color;
    if (q.shape === 'spark') {
      ctx.lineWidth = q.size;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x - q.vx * 0.045, q.y - q.vy * 0.045);
      ctx.stroke();
    } else if (q.shape === 'square') {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * 0.6);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.size * (q.shape === 'ember' ? k : 0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// --- Fertige Effekt-Bausteine ------------------------------------------------------------

function localFacingAngle(dir) {
  return dir === 'side' ? 0 : dir === 'down' ? Math.PI / 2 : -Math.PI / 2;
}

// Bogen, den die Waffe beim aktuellen Schlag beschreibt (in Figuren-Koordinaten)
function swingArc(p, dir) {
  const fa = localFacingAngle(dir);
  if (p.swingKind === 'skill') return { a0: fa - 2.2, a1: fa + 1.7 };
  if (p.combo === 1) return { a0: fa + 1.5, a1: fa - 1.4 };
  if (p.combo === 2) return { a0: fa - 0.2, a1: fa };
  return { a0: fa - 1.7, a1: fa + 1.2 };
}

// Schwungspur am Arm der Figur, folgt ihr während des Schlags
function vfxSwing(p, color, radius = 32, width = 14) {
  const dir = facingDir(p.facing);
  const flip = dir === 'side' && p.facing.x < 0;
  const hand = handPosition(dir, 0, 'right');
  const { a0, a1 } = swingArc(p, dir);
  const world = (a) => (flip ? Math.PI - a : a);
  if (p.swingKind !== 'skill' && p.combo === 2) {
    // Stich nach vorn
    const ang = Math.atan2(p.facing.y, p.facing.x);
    addEffect({ type: 'slash', follow: p, ox: Math.cos(ang) * 22, oy: -16 + Math.sin(ang) * 10, ang, len: 46, w: 7, dur: 0.22, color });
    return;
  }
  addEffect({ type: 'swoosh', follow: p, ox: flip ? -hand.x : hand.x, oy: hand.y, r: radius, width, a0: world(a0), a1: world(a1), dur: 0.28, color });
}

// Großer Schwung um die Körpermitte, für Flächenangriffe
function vfxSweep(p, radius, a0, a1, color, dur = 0.3, width = 22) {
  addEffect({ type: 'swoosh', follow: p, ox: 0, oy: -14, r: radius, width, a0, a1, dur, color });
}

// Treffer: Lichtblitz, Funken, bei kritischen Treffern stärker
function vfxImpact(target, crit, color = '#fff2d0') {
  const c = bodyCenter(target);
  addEffect({ type: 'impact', x: c.x, y: c.y, dur: crit ? 0.32 : 0.22, color: crit ? '#ffd34d' : color, big: crit });
  particles(c.x, c.y, {
    count: crit ? 16 : 8, color: crit ? ['#ffd34d', '#ff9a3a', '#fff2d0'] : [color, '#ffffff'],
    speed: crit ? [120, 280] : [80, 180], life: [0.15, 0.35], size: [1.4, 2.4], shape: 'spark', drag: 6
  });
}

// Beute fliegt in einem Bogen vom Seelenstein zur Figur
function vfxLootFly(from, img) {
  const c = bodyCenter(from);
  addEffect({ type: 'lootfly', x: c.x + rand(-12, 12), y: c.y + rand(-8, 8), img, dur: 0.7, arc: rand(50, 90) });
}

function vfxCorpse(m) {
  addEffect({ type: 'corpse', typeId: m.typeId, x: m.x, y: feetY(m), flip: m.facing < 0, dur: 0.55 });
}

function vfxPillar(p, color, dur = 0.8) {
  addEffect({ type: 'pillar', follow: p, dur, color });
  particles(p.x, feetY(p), { count: 18, color: [color, '#ffffff'], angle: -Math.PI / 2, spread: 0.35, speed: [60, 160], life: [0.4, 0.8], size: [1.5, 3], jitter: 12, drag: 1.5 });
}

// --- Effekte zeichnen ---------------------------------------------------------------------

function addEffect(e) {
  e.start = game.time;
  if (e.type === 'burst') {
    e.parts = Array.from({ length: e.count || 10 }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * 40;
      return { x: Math.cos(a) * s, y: Math.sin(a) * s };
    });
  }
  if (e.type === 'bolt') {
    e.points = [];
    for (let k = 0; k <= 8; k++) e.points.push({ x: e.x + (k && k < 8 ? (Math.random() - 0.5) * 34 : 0), y: e.y - 240 + k * 30 });
    e.branch = [];
    const from = e.points[3];
    for (let k = 1; k <= 3; k++) e.branch.push({ x: from.x + k * 12 * (Math.random() < 0.5 ? -1 : 1), y: from.y + k * 16 });
  }
  game.effects.push(e);
}

function addText(x, y, text, style) {
  const long = style === 'level' || style === 'crit';
  game.texts.push({ x: x + (style === 'dmg' || style === 'crit' ? rand(-10, 10) : 0), y, text, style, start: game.time, dur: long ? 1.4 : 1.05 });
}

function updateEffects(dt) {
  game.effects = game.effects.filter((e) => game.time - e.start < e.dur);
  game.texts = game.texts.filter((t) => game.time - t.start < t.dur);
  if (game.texts.length > 60) game.texts.splice(0, game.texts.length - 60);
  updateParticles(dt);
}

function updateTimers() {
  const due = game.timers.filter((t) => t.at <= game.time);
  game.timers = game.timers.filter((t) => t.at > game.time);
  for (const t of due) t.fn();
}

function effectOrigin(e) {
  if (e.follow) return { x: e.follow.x + (e.ox || 0), y: feetY(e.follow) + (e.oy || 0) };
  return { x: e.x, y: e.y };
}

function lens(ctx, x, y, ang, len, w) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  ctx.beginPath();
  ctx.moveTo(x - c * len / 2, y - s * len / 2);
  ctx.quadraticCurveTo(x - s * w, y + c * w, x + c * len / 2, y + s * len / 2);
  ctx.quadraticCurveTo(x + s * w * 0.3, y - c * w * 0.3, x - c * len / 2, y - s * len / 2);
  ctx.closePath();
}

function drawEffect(ctx, e) {
  const k = Math.min(1, (game.time - e.start) / e.dur);
  const { x, y } = effectOrigin(e);
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = e.color;
  ctx.fillStyle = e.color;
  switch (e.type) {
    case 'swoosh': {
      const head = e.a0 + (e.a1 - e.a0) * easeOut(Math.min(1, k * 2.2));
      const tail = e.a0 + (head - e.a0) * clamp01((k - 0.12) / 0.88);
      const ccw = e.a1 < e.a0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.65 * (1 - k * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, e.r, tail, head, ccw);
      ctx.arc(x, y, Math.max(1, e.r - e.width), head, tail, !ccw);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * (1 - k);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, y, e.r, tail + (head - tail) * 0.35, head, ccw);
      ctx.stroke();
      break;
    }
    case 'slash': {
      const len = (e.len || 30) * Math.min(1, k * 5);
      const w = (e.w || 6) * (1 - k * 0.6);
      ctx.globalCompositeOperation = 'lighter';
      lens(ctx, x, y, e.ang, len, w);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      lens(ctx, x, y, e.ang, len * 0.8, w * 0.35);
      ctx.fill();
      break;
    }
    case 'impact': {
      ctx.globalCompositeOperation = 'lighter';
      const r = (e.big ? 26 : 15) * easeOut(k);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = e.big ? 3 : 2;
      ctx.globalAlpha = 1 - k;
      const rays = e.big ? 10 : 7;
      for (let i = 0; i < rays; i++) {
        const a = i / rays * Math.PI * 2 + e.start * 7;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
        ctx.lineTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4);
        ctx.stroke();
      }
      break;
    }
    case 'claw': {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ff5a4a';
      for (let i = -1; i <= 1; i++) {
        const len = 22 * Math.min(1, k * 5);
        ctx.beginPath();
        ctx.moveTo(x - 10 + i * 6, y - 12);
        ctx.quadraticCurveTo(x + i * 6 + 4, y - 2, x - 6 + i * 6 + len * 0.5, y - 12 + len);
        ctx.stroke();
      }
      break;
    }
    case 'ring':
      ctx.lineWidth = (e.width || 4) * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(x, y, e.r * (e.grow ? 0.3 + 0.9 * k : 0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'runes': {
      ctx.lineWidth = 2;
      const r = e.r * (0.6 + 0.4 * easeOut(k));
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.7, r * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + k * 2;
        const rx = Math.cos(a) * r * 0.85;
        const ry = Math.sin(a) * r * 0.38;
        ctx.beginPath();
        ctx.moveTo(x + rx - 3, y + ry);
        ctx.lineTo(x + rx, y + ry - 4);
        ctx.lineTo(x + rx + 3, y + ry);
        ctx.stroke();
      }
      break;
    }
    case 'pillar': {
      ctx.globalCompositeOperation = 'lighter';
      const h = 80 * easeOut(Math.min(1, k * 2));
      const w = 30 * (1 - k * 0.6);
      const g = ctx.createLinearGradient(0, y, 0, y - h);
      g.addColorStop(0, `rgba(${hexRgb(e.color)},0.55)`);
      g.addColorStop(1, `rgba(${hexRgb(e.color)},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, w * 0.2, 0, 0, Math.PI);
      ctx.lineTo(x - w / 2, y - h);
      ctx.lineTo(x + w / 2, y - h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'beam': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 7 * (1 - k) + 1;
      const tx = e.follow2 ? e.follow2.x : e.x2;
      const ty = e.follow2 ? feetY(e.follow2) - 20 : e.y2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + tx) / 2 + Math.sin(game.time * 30) * 12, (y + ty) / 2 - 24, tx, ty);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * (1 - k);
      ctx.stroke();
      break;
    }
    case 'chain': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        ctx.lineTo(e.x + (e.x2 - e.x) * t + rand(-7, 7), e.y + (e.y2 - e.y) * t + rand(-7, 7));
      }
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
      break;
    }
    case 'bolt':
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      e.points.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.points[3].x, e.points[3].y);
      e.branch.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.45;
      ctx.lineWidth = 12;
      ctx.beginPath();
      e.points.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      break;
    case 'burst':
      for (const part of e.parts) circle(ctx, x + part.x * k, y + part.y * k - 8, 2.5 * (1 - k) + 0.5);
      break;
    case 'afterimage': {
      ctx.globalAlpha = (1 - k) * 0.45;
      const b = e.sprite.bounds;
      ctx.translate(e.x, e.y);
      if (e.flip) ctx.scale(-1, 1);
      ctx.drawImage(e.sprite.img, b.x, b.y, b.w, b.h);
      if (e.tint) {
        // getönter Schein über dem Nachbild
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.filter = 'none';
        ctx.drawImage(flashOf(e.sprite), b.x, b.y, b.w, b.h);
      }
      break;
    }
    case 'decal': {
      // Spuren am Boden, verblassen langsam
      ctx.globalAlpha = Math.pow(1 - k, 0.6) * 0.75;
      const r = e.r;
      if (e.kind === 'scorch' || e.kind === 'splash') {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${hexRgb(e.color)},0.85)`);
        g.addColorStop(0.7, `rgba(${hexRgb(e.color)},0.45)`);
        g.addColorStop(1, `rgba(${hexRgb(e.color)},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        if (e.kind === 'scorch' && k < 0.5) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,140,50,${0.5 * (1 - k * 2)})`;
          for (let i = 0; i < 5; i++) circle(ctx, x + Math.cos(i * 1.3 + e.start) * r * 0.5, y + Math.sin(i * 1.3 + e.start) * r * 0.2, 1.6);
        }
      } else if (e.kind === 'crack') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + e.start;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.22 + 2);
          ctx.lineTo(x + Math.cos(a + 0.3) * r, y + Math.sin(a + 0.3) * r * 0.45);
          ctx.stroke();
        }
      } else if (e.kind === 'ring') {
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Runenkreis, leuchtend
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2.5;
        const rr = r * (0.7 + 0.3 * easeOut(Math.min(1, k * 4)));
        ctx.beginPath();
        ctx.ellipse(x, y, rr, rr * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y, rr * 0.72, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5 + k * 1.5;
          const px = x + Math.cos(a) * rr * 0.72;
          const py = y + Math.sin(a) * rr * 0.3;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }
    case 'tornado': {
      // drei gedrehte Ringe übereinander, wie ein Wirbelsturm aus Klingen
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = e.color;
      for (let i = 0; i < 3; i++) {
        const rr = e.r * (1 - i * 0.22) * (0.6 + 0.4 * easeOut(Math.min(1, k * 3)));
        const yy = y - 6 - i * 16;
        const rot = game.time * 14 + i * 1.7;
        ctx.lineWidth = 5 - i;
        ctx.beginPath();
        ctx.ellipse(x, yy, rr, rr * 0.34, 0, rot, rot + Math.PI * 1.3);
        ctx.stroke();
      }
      break;
    }
    case 'halo': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      const yy = y - 54 - Math.sin(k * Math.PI) * 6;
      ctx.beginPath();
      ctx.ellipse(x, yy, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      glow(ctx, x, yy, 22, '#ffe9a0', 0.4 * (1 - k));
      break;
    }
    case 'corpse': {
      const sp = monsterSprite(e.typeId, 0);
      const b = sp.bounds;
      ctx.globalAlpha = 1 - k;
      ctx.translate(e.x, e.y + k * 3);
      ctx.scale(e.flip ? -1 : 1, 1 - k * 0.35);
      ctx.drawImage(flashOf(sp), b.x, b.y, b.w, b.h);
      ctx.globalAlpha = (1 - k) * 0.6;
      ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
      break;
    }
    case 'lightbeam': {
      ctx.globalCompositeOperation = 'lighter';
      const grow = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      const w = 54 * grow;
      const top = y - 460;
      const gh = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      gh.addColorStop(0, 'rgba(255,233,160,0)');
      gh.addColorStop(0.35, 'rgba(255,233,160,0.55)');
      gh.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      gh.addColorStop(0.65, 'rgba(255,233,160,0.55)');
      gh.addColorStop(1, 'rgba(255,233,160,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gh;
      ctx.fillRect(x - w / 2, top, w, y - top);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, 70 * grow + 10);
      gg.addColorStop(0, 'rgba(255,255,230,0.9)');
      gg.addColorStop(1, 'rgba(255,210,90,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.ellipse(x, y, 70 * grow + 10, (70 * grow + 10) * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lootfly': {
      const p = game.player;
      const tx = p.x;
      const ty = feetY(p) - 24;
      const e2 = easeOut(k);
      const px = e.x + (tx - e.x) * e2;
      const py = e.y + (ty - e.y) * e2 - Math.sin(k * Math.PI) * e.arc;
      const size = 22 * (1 - k * 0.4);
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      glow(ctx, px, py, size, '#fff2c0', 0.5);
      ctx.drawImage(e.img, px - size / 2, py - size / 2, size, size);
      if (k > 0.97 && !e.done) {
        e.done = true;
        particles(tx, ty, { count: 8, color: ['#fff2c0', '#ffffff'], speed: [40, 100], life: [0.2, 0.4], size: [1.5, 2.5] });
      }
      break;
    }
    case 'levelup':
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffd34d';
      for (let a = 0; a < 3; a++) {
        const kk = (k + a * 0.2) % 1;
        ctx.globalAlpha = 1 - kk;
        ctx.beginPath();
        ctx.ellipse(x, y + 8 - kk * 60, 24, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

// --- Schadenszahlen ------------------------------------------------------------------------

function drawTexts(ctx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const t of game.texts) {
    const age = game.time - t.start;
    const k = age / t.dur;
    const st = TEXT_STYLES[t.style] || TEXT_STYLES.info;
    // Aufploppen: kurz groß, dann normal
    const popTime = 0.14;
    const popFrom = st.glow ? 2.2 : 1.7;
    const scale = age < popTime ? popFrom - (popFrom - 1) * easeOut(age / popTime) : 1;
    const y = t.y - easeOut(Math.min(1, k * 1.3)) * 42;
    ctx.save();
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.translate(t.x, y);
    if (st.glow && age < 0.3) ctx.rotate(Math.sin(age * 60) * 0.06 * (1 - age / 0.3));
    ctx.scale(scale, scale);
    ctx.font = `800 ${st.size}px "Alegreya Sans", sans-serif`;
    if (st.glow) {
      ctx.strokeStyle = `rgba(${hexRgb(st.glow)},0.55)`;
      ctx.lineWidth = st.size * 0.42;
      ctx.strokeText(t.text, 0, 0);
    }
    ctx.strokeStyle = 'rgba(12,8,6,0.92)';
    ctx.lineWidth = st.size * 0.22;
    ctx.strokeText(t.text, 0, 0);
    if (st.glow) {
      const g = ctx.createLinearGradient(0, -st.size / 2, 0, st.size / 2);
      g.addColorStop(0, '#fff6c0');
      g.addColorStop(0.5, st.color);
      g.addColorStop(1, st.glow);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = st.color;
    }
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

// --- Geschosse ----------------------------------------------------------------------------

const PROJECTILE_LIFT = 15; // Geschosse fliegen auf Brusthöhe

function drawProjectile(ctx, pr) {
  const y = pr.y - PROJECTILE_LIFT;
  const style = pr.style || 'orb';
  ctx.save();
  // Leuchtspur
  if (pr.trail && pr.trail.length > 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = pr.color;
    for (let i = 1; i < pr.trail.length; i++) {
      const a = pr.trail[i - 1];
      const b = pr.trail[i];
      ctx.globalAlpha = (i / pr.trail.length) * 0.55;
      ctx.lineWidth = (i / pr.trail.length) * pr.radius * 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - PROJECTILE_LIFT);
      ctx.lineTo(b.x, b.y - PROJECTILE_LIFT);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const ang = Math.atan2(pr.vy, pr.vx);
  ctx.translate(pr.x, y);
  switch (style) {
    case 'wind':
      ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(-4, 0, 10, -1.3, 1.3);
      ctx.arc(-9, 0, 9, 1.2, -1.2, true);
      ctx.closePath();
      ctx.fill();
      break;
    case 'dart':
    case 'arrow':
      ctx.rotate(ang);
      ctx.strokeStyle = style === 'arrow' ? '#8a6a44' : '#5a7a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.fillStyle = style === 'arrow' ? '#cfd3da' : pr.color;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'skull': {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 16, pr.color, 0.7);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(ang);
      ctx.fillStyle = '#e8f6d8';
      ctx.beginPath();
      ctx.arc(1, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-4, -3, 4, 6);
      ctx.fillStyle = '#1a3a12';
      ctx.beginPath();
      ctx.arc(3, -2.2, 1.6, 0, Math.PI * 2);
      ctx.arc(3, 2.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'talisman':
      ctx.rotate(game.time * 14);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(240,210,122,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(-4, -6, 8, 12);
      ctx.strokeStyle = '#b33a2c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -4); ctx.lineTo(2, -1); ctx.lineTo(-2, 2); ctx.lineTo(2, 4);
      ctx.stroke();
      break;
    default: {
      ctx.globalCompositeOperation = 'lighter';
      const r = pr.radius;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.3, pr.color);
      g.addColorStop(1, `rgba(${hexRgb(pr.color)},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
