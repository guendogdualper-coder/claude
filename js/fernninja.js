// Fern-Ninja (seit 13.57): Der zweite Weg des Ninjas ist jetzt der Weg des Falken – Fernkampf mit Pfeil und Bogen.
// Hier steht alles, was dazugehört:
//  - Pfeile als Munition (ARROW_TYPES in gegenstaende.js): jeder Bogenschuss verbraucht einen Pfeil der besten Sorte,
//    die man hat und schon benutzen darf; ohne Pfeile schießt der Bogen Übungspfeile ohne Bonus
//  - die fünf Fertigkeiten (SKILL_TYPES, Mitspieler über MAGE2_REMOTE) und die Ultimative Attacke „Sturm des Himmelsfalken“
//  - Pfeile als echte 3D-Körper (Schaft, Spitze, Federn, Leuchtspur) und die 3D-Effekte (FX3_DRAW) samt 2D-Ersatz
//  - Symbole (SKILL_ART), Posen (SKILL_POSE3), Werte im Fertigkeitsfenster
//  - die Bogenmacherin (Händlerin für Bögen, Köcher und Pfeile) mit Figur, Stand und Plakette
//  - einmaliges Geschenk für Ninjas, die schon auf dem Weg des Schattens waren (Bogen, Köcher, Pfeile)
// Farben des Weges: Himmelblau und Weiß mit Gold – Wind und Federn statt Schatten.

const BOW3 = { sky: '#9fe8ff', sky2: '#5ab8f0', white: '#f4fbff', gold: '#ffd98a', wood: '#7a5634', feather: '#f2ede2' };

// --- Pfeile (Munition) ------------------------------------------------------------------------------------
function bowArrowCount(p, i) {
  return (p && p.arrows && p.arrows[i]) || 0;
}
// beste Sorte, die die Figur hat und schon benutzen darf (Index oder -1)
function bowArrowSort(p) {
  if (!p || !p.arrows) return -1;
  for (let i = ARROW_TYPES.length - 1; i >= 0; i--) if (bowArrowCount(p, i) > 0 && p.level >= ARROW_TYPES[i].level) return i;
  return -1;
}
function bowArrowTotal(p) {
  return ARROW_TYPES.reduce((n, a, i) => n + bowArrowCount(p, i), 0);
}
// Farbe der Übungspfeile: die Pfeile des angelegten Köchers (wie bisher), sonst helles Holz
function bowPracticeColor(p) {
  const q = p && p.equipment && p.equipment.schild;
  return q && typeof isQuiver === 'function' && isQuiver(q) ? quiverArrows(q).color : '#f0e0b0';
}
// Ein Schuss: verbraucht n Pfeile der besten Sorte. Ergebnis: Sorte, Schadensfaktor und Farbe des Schusses.
function bowArrowShot(p, n = 1) {
  if (!p || p.classId !== 'ninja') return null;
  const i = bowArrowSort(p);
  if (i < 0) {
    // einmal je Leerlauf ein Hinweis (zurückgesetzt, sobald wieder Pfeile da sind)
    if (!p._arrowHint && p === game.player) {
      p._arrowHint = true;
      addText(p.x, p.y - 48, 'Keine Pfeile – Übungspfeile', 'info');
      if (typeof ui !== 'undefined') ui.log('Deine Pfeile sind aufgebraucht: Du schießt jetzt Übungspfeile ohne Bonus. Neue Pfeile verkauft die Bogenmacherin in jeder Stadt.', 'warn');
    }
    return { sort: -1, mul: 1, color: bowPracticeColor(p) };
  }
  p._arrowHint = false;
  const have = bowArrowCount(p, i);
  const take = Math.min(have, Math.max(1, n));
  if (have - take > 0) p.arrows[i] = have - take;
  else delete p.arrows[i];
  bowHudDirty = true;
  const a = ARROW_TYPES[i];
  return { sort: i, mul: 1 + a.dmg, color: a.color };
}
// Pfeile kaufen (Bündel zu ARROW_BUNDLE Stück) – nur Sorten, die man schon benutzen darf
function buyArrows(i, bundles = 1) {
  const p = game.player;
  const a = ARROW_TYPES[i];
  if (!p || !a || !(bundles > 0)) return { ok: false, text: 'Diese Pfeile gibt es nicht.' };
  if (p.level < a.level) return { ok: false, text: `${a.name} kannst du erst ab Stufe ${a.level} benutzen.` };
  const cost = a.price * bundles;
  if (p.gold < cost) return { ok: false, text: `Dir fehlen ${(cost - p.gold).toLocaleString('de-DE')} Gold.` };
  p.gold -= cost;
  if (!p.arrows || typeof p.arrows !== 'object') p.arrows = {};
  p.arrows[i] = bowArrowCount(p, i) + ARROW_BUNDLE * bundles;
  p._arrowHint = false;
  bowHudDirty = true;
  saveGame();
  return { ok: true, text: `${(ARROW_BUNDLE * bundles).toLocaleString('de-DE')} ${a.name} gekauft.` };
}

// Symbol eines Pfeilbündels (drei Pfeile, Schnur, Spitzen in der Farbe der Sorte; ab Sternenpfeilen leuchtend)
const ARROW_ICON = new Map();
function arrowIconUrl(i) {
  if (ARROW_ICON.has(i)) return ARROW_ICON.get(i);
  const a = ARROW_TYPES[i] || ARROW_TYPES[0];
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  if (i >= 5) {
    const gl = g.createRadialGradient(0, -6, 2, 0, -6, 30);
    gl.addColorStop(0, a.color + 'aa');
    gl.addColorStop(1, a.color + '00');
    g.fillStyle = gl;
    g.fillRect(-32, -32, 64, 64);
  }
  for (const [ang, dx] of [[-0.32, -3], [0.32, 3], [0, 0]]) {
    g.save();
    g.rotate(ang);
    g.translate(dx * 0.3, 0);
    // Schaft
    const sg = g.createLinearGradient(-2, 0, 2, 0);
    sg.addColorStop(0, '#5a3a22');
    sg.addColorStop(0.5, '#c89a62');
    sg.addColorStop(1, '#5a3a22');
    g.fillStyle = sg;
    g.fillRect(-1.6, -20, 3.2, 44);
    // Federn
    for (const s of [-1, 1]) {
      g.fillStyle = s < 0 ? (i >= 2 ? a.color : '#f2ede2') : '#c8402f';
      g.beginPath();
      g.moveTo(0, 14);
      g.lineTo(s * 7, 18);
      g.lineTo(s * 7, 27);
      g.lineTo(0, 24);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(20,12,6,0.7)';
      g.lineWidth = 1;
      g.stroke();
    }
    // Spitze
    const hg = g.createLinearGradient(-6, -28, 6, -20);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(0.45, a.color);
    hg.addColorStop(1, darker(a.color, 0.45));
    g.fillStyle = hg;
    g.beginPath();
    g.moveTo(0, -31);
    g.lineTo(-6, -19);
    g.lineTo(0, -21);
    g.lineTo(6, -19);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,12,6,0.85)';
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
  }
  // Schnur ums Bündel
  g.fillStyle = '#c8402f';
  g.fillRect(-9, 2, 18, 4);
  g.fillStyle = '#ffd98a';
  g.fillRect(-9, 2, 18, 1.2);
  const url = c.toDataURL();
  ARROW_ICON.set(i, url);
  return url;
}

// Vorräte im Inventar (ausruestung.js supplyList): je Sorte eine Kachel
function bowArrowSupplies(p) {
  const out = [];
  if (!p || p.classId !== 'ninja') return out;
  for (let i = ARROW_TYPES.length - 1; i >= 0; i--) {
    const n = bowArrowCount(p, i);
    if (n > 0) out.push({ key: 'arrow' + i, n, arrow: i });
  }
  return out;
}
function bowArrowTipHtml(x) {
  const p = game.player;
  const a = ARROW_TYPES[x.arrow];
  const best = bowArrowSort(p) === x.arrow;
  const ok = p.level >= a.level;
  return `<b style="color:${a.color}">${a.name} × ${x.n.toLocaleString('de-DE')}</b><br>Munition für den Bogen · ab Stufe ${a.level}<br>` +
    `+${Math.round(a.dmg * 100)} % Schaden aller Bogenschüsse` + (best ? '<br>Wird gerade geschossen.' : ok ? '' : `<br>Erst ab Stufe ${a.level} benutzbar.`);
}
function bowArrowTile(x) {
  const a = ARROW_TYPES[x.arrow];
  const tip = typeof escTip === 'function' ? escTip(bowArrowTipHtml(x)) : '';
  return `<button type="button" class="item-tile sup-tile" data-sup="${x.key}" data-info="${tip}">` +
    `<img src="${arrowIconUrl(x.arrow)}" alt="${a.name}"><span class="item-count">${x.n > 9999 ? Math.floor(x.n / 1000) + 'k' : x.n}</span></button>`;
}
function bowArrowDetail(el, x) {
  const p = game.player;
  const a = ARROW_TYPES[x.arrow];
  const best = bowArrowSort(p) === x.arrow;
  el.innerHTML = `<div class="item-detail"><img src="${arrowIconUrl(x.arrow)}" alt="">` +
    `<div class="item-info"><strong style="color:${a.color}">${a.name} × ${x.n.toLocaleString('de-DE')}</strong>` +
    `<small>Munition für den Bogen · ab Stufe ${a.level}${best ? ' · wird gerade geschossen' : ''}</small>` +
    `<span>+${Math.round(a.dmg * 100)} % Schaden für jeden Bogenschuss (Grundangriff und Fertigkeiten). Jeder Schuss verbraucht einen Pfeil; ` +
    `geschossen wird immer die beste Sorte, die du schon benutzen darfst.</span>` +
    `<small class="hint-text">Neue Pfeile verkauft die Bogenmacherin neben dem Waffenhändler.</small></div></div>`;
}

// Anzeige im Fensterkopf (neben Gold und Splittern) und am Angriffsknopf: aktive Sorte und Anzahl
let bowHudDirty = true;
let bowHudKey = '';
function bowHudTick() {
  const p = typeof game !== 'undefined' ? game.player : null;
  const show = !!(p && game.running && typeof quiverMode === 'function' && quiverMode(p));
  const i = show ? bowArrowSort(p) : -1;
  const n = i >= 0 ? bowArrowCount(p, i) : 0;
  const key = show + ':' + i + ':' + n;
  if (key === bowHudKey && !bowHudDirty) return;
  bowHudKey = key;
  bowHudDirty = false;
  const purse = document.querySelector('#hud .purse');
  let chip = document.getElementById('arrowChip');
  if (purse && !chip) {
    chip = document.createElement('span');
    chip.id = 'arrowChip';
    chip.className = 'arrow-chip';
    purse.appendChild(chip);
  }
  const atk = document.getElementById('btnAttack');
  let badge = document.getElementById('arrowBadge');
  if (atk && !badge) {
    badge = document.createElement('span');
    badge.id = 'arrowBadge';
    badge.className = 'arrow-badge';
    badge.style.cssText = 'position:absolute;right:-2px;top:-4px;font:700 10px sans-serif;padding:1px 4px;border-radius:8px;background:rgba(10,16,24,0.85);border:1px solid #6a7a8a;pointer-events:none';
    if (getComputedStyle(atk).position === 'static') atk.style.position = 'relative';
    atk.appendChild(badge);
  }
  const txt = i >= 0 ? n.toLocaleString('de-DE') : '∞';
  const col = i >= 0 ? ARROW_TYPES[i].color : '#a8a8a8';
  const title = i >= 0 ? `${ARROW_TYPES[i].name}: ${n.toLocaleString('de-DE')} (+${Math.round(ARROW_TYPES[i].dmg * 100)} % Schaden)` : 'Keine Pfeile: Übungspfeile ohne Bonus';
  if (chip) {
    chip.hidden = !show;
    chip.title = title;
    chip.innerHTML = `Pfeile <b style="color:${col}">${txt}</b>`;
  }
  if (badge) {
    badge.hidden = !show;
    badge.title = title;
    badge.style.color = col;
    badge.textContent = '➶ ' + (i >= 0 ? (n > 9999 ? Math.floor(n / 1000) + 'k' : n) : '∞');
  }
}
setInterval(() => { try { bowHudTick(); } catch (err) { /* Anzeige ist Beiwerk */ } }, 400);

// --- Reichweite aus dem Falkenblick (effects.bowRange) ---------------------------------------------------
function bowRangeBonus(p) {
  let r = 0;
  for (const b of (p && p.buffs) || []) if (b.effects && b.effects.bowRange) r += b.effects.bowRange;
  return Math.min(0.5, r);
}
if (typeof basicAttack === 'function') {
  const basicAttack0 = basicAttack;
  // eslint-disable-next-line no-global-assign
  basicAttack = function (p) {
    const b = basicAttack0(p);
    const r = b && b.style === 'arrow' ? bowRangeBonus(p) : 0;
    return r > 0 ? { ...b, range: Math.round(b.range * (1 + r)) } : b;
  };
}

// --- Fertigkeiten ---------------------------------------------------------------------------------------
// Startpunkt der Pfeile: vor der Figur auf Höhe des Bogens
function bowMuzzle(p, f) {
  return { x: p.x + f.x * 12, y: p.y + f.y * 8 };
}
function bowShotFx(p, color) {
  if (typeof snd !== 'undefined') snd.shot(p, { style: 'arrow' });
  const b = bodyCenter(p);
  const f = p.facing || { x: 0, y: 1 };
  particles(b.x + f.x * 16, b.y + f.y * 10, { count: 8, color: [color, '#ffffff'], angle: Math.atan2(f.y, f.x), spread: 0.5, speed: [60, 160], life: [0.12, 0.25], size: [1.2, 2.2], shape: 'spark', drag: 5 });
  addEffect({ type: 'bmuzzle3', follow: p, ox: 0, oy: 0, color, dur: 0.32 });
}

// Falkenpfeil: kurz ziehen, dann ein schwerer Pfeil mit Federwirbel
SKILL_TYPES.bshot = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  const ar = bowArrowShot(p, sk.arrows);
  const mul = sk.dmg * pw * (ar ? ar.mul : 1);
  const col = ar ? ar.color : sk.color;
  lockPlayer(p, 0.22);
  input.walkTo = null;
  later(0.18, () => {
    if (p.dead) return;
    const tt = t && !t.dead ? t : null;
    if (tt) faceTowards(tt.x, tt.y);
    const f = { ...p.facing };
    const m = bowMuzzle(p, f);
    spawnProjectile({ owner: 'player', x: m.x, y: m.y, target: tt, dir: tt ? null : f, speed: sk.speed, range: sk.range + 60, mul, color: col,
      radius: 6, style: 'arrow', skill: sk.id, knockback: sk.knockback, bfx: 'falke', arrow: ar ? ar.sort : -1 });
    bowShotFx(p, sk.color);
    shakeScreen(1.5);
  });
  return t ? { c: col } : { c: col, tx: Math.round(p.x + p.facing.x * sk.range), ty: Math.round(p.y + p.facing.y * sk.range) };
};
MAGE2_REMOTE.bshot = (rp, sk, d) => later(0.18, () => {
  spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, aimAt: { x: d.tx, y: d.ty }, speed: sk.speed, range: Math.hypot(d.tx - rp.x, d.ty - rp.y) + 60, mul: 0, color: d.c || sk.color, radius: 6, style: 'arrow', bfx: 'falke' });
  addEffect({ type: 'bmuzzle3', follow: rp, ox: 0, oy: 0, color: sk.color, dur: 0.32 });
});

// Pfeilhagel: drei Pfeile steil in den Himmel, dann regnet es am gewählten Ort in Wellen Pfeile
SKILL_TYPES.brain = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.36);
  input.walkTo = null;
  const ar = bowArrowShot(p, sk.arrows);
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const seed = Math.floor(Math.random() * 1000);
  rainFx(p, x, y, sk, seed, true, pw * (ar ? ar.mul : 1), ar ? ar.color : sk.color);
  later(0.12, () => { if (typeof snd !== 'undefined') snd.shot(p, { style: 'arrow' }); });
  return { tx: x, ty: y, sd: seed, c: ar ? ar.color : sk.color };
};
function rainHitAt(sk, k) {
  return sk.delay + k * sk.every + 0.22;
}
function rainFx(owner, x, y, sk, seed, local, pw, color) {
  const fy = y + 9;
  const dur = rainHitAt(sk, sk.waves - 1) + 1.1;
  addEffect({ type: 'brain3', x, y: fy, R: sk.radius, ox: owner.x, oy: feetY(owner), delay: sk.delay, waves: sk.waves, every: sk.every, seed, color: color || sk.color, dur });
  for (let k = 0; k < sk.waves; k++) {
    later(rainHitAt(sk, k), () => {
      if (owner === game.player) shakeScreen(1.6);
      particles(x, fy - 4, { count: 10, color: ['#a88f62', '#d8c8a8'], angle: -Math.PI / 2, spread: 1.4, speed: [40, 110], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', drag: 3, glow: false, gravity: 300 });
      if (!local) return;
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, vfxColor: '#e8f4ff' });
    });
  }
}
MAGE2_REMOTE.brain = (rp, sk, d) => rainFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, d.sd || 1, false, 0, d.c);

// Durchbohrender Schuss: ein Pfeil, der alles in einer Linie durchschlägt; der Wind dreht sich als Spirale darum
SKILL_TYPES.bpierce = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  const ar = bowArrowShot(p, sk.arrows);
  const mul = sk.dmg * pw * (ar ? ar.mul : 1);
  const col = ar ? ar.color : sk.color;
  lockPlayer(p, 0.24);
  input.walkTo = null;
  const f0 = { ...p.facing };
  later(0.18, () => {
    if (p.dead) return;
    if (t && !t.dead) faceTowards(t.x, t.y);
    const f = { ...p.facing };
    const m = bowMuzzle(p, f);
    spawnProjectile({ owner: 'player', x: m.x, y: m.y, target: null, dir: f, speed: sk.speed, range: sk.range, mul, color: col, radius: 9,
      pierce: true, style: 'arrow', skill: sk.id, knockback: sk.knockback, bfx: 'pierce', arrow: ar ? ar.sort : -1 });
    pierceFx(p, m.x, m.y, f, sk);
    bowShotFx(p, sk.color);
    shakeScreen(2.2);
  });
  return { c: col, fx: +f0.x.toFixed(2), fy: +f0.y.toFixed(2) };
};
function pierceFx(owner, x, y, f, sk) {
  addEffect({ type: 'bpierce3', x, y: y + 9, dx: f.x, dy: f.y, len: sk.range, speed: sk.speed, color: sk.color, dur: sk.range / sk.speed + 0.75 });
}
MAGE2_REMOTE.bpierce = (rp, sk, d) => later(0.18, () => {
  const f = { x: d.fx, y: d.fy };
  spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, dir: f, speed: sk.speed, range: sk.range, mul: 0, color: d.c || sk.color, radius: 9, style: 'arrow', bfx: 'pierce' });
  pierceFx(rp, rp.x, rp.y, f, sk);
});

// Rückensprung: Salto nach hinten (vom Ziel weg), in der Luft ein Fächer aus Pfeilen nach vorn
SKILL_TYPES.bleap = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.range);
  if (t) faceTowards(t.x, t.y);
  const f = { ...p.facing };
  const back = { x: -f.x, y: -f.y };
  let reach = 0;
  for (let s = 6; s <= sk.distance; s += 6) {
    const nx = p.x + back.x * s;
    const ny = p.y + back.y * s;
    if (!canStand(nx, ny, p.r * 0.7, false) || (inVillage(nx, ny) && !duelFighting())) break;
    reach = s;
  }
  const ar = bowArrowShot(p, sk.arrows);
  const mul = sk.dmg * pw * (ar ? ar.mul : 1);
  const col = ar ? ar.color : sk.color;
  const x0 = p.x;
  const y0 = p.y;
  const now = game.time;
  p.dash = { lock: true, until: now + sk.air + 0.06, rank: fxRank };
  p.leap = { start: now, dur: sk.air, h: 30 };
  input.walkTo = null;
  addEffect({ type: 'bleap3', x: x0, y: feetY(p), bx: back.x, by: back.y, reach, color: sk.color, dur: 1.0 });
  particles(x0, feetY(p), { count: 12, color: ['#a88f62', '#d8c8a8'], speed: [40, 120], life: [0.3, 0.6], size: [2, 4], shape: 'square', drag: 3, glow: false });
  // Flug in kleinen Schritten (Wände und Wasser halten die Figur auf)
  const steps = 10;
  let moved = 0;
  for (let k = 1; k <= steps; k++) {
    later((k / steps) * sk.air, () => {
      if (p.dead) return;
      const want = reach * easeOut(k / steps);
      const d = want - moved;
      if (d > 0 && moveEntity(p, back.x * d, back.y * d, false)) moved = want;
      if (t && !t.dead) faceTowards(t.x, t.y);
      else p.facing = { ...f };
    });
  }
  // Pfeilfächer am höchsten Punkt
  later(sk.air * 0.45, () => {
    if (p.dead) return;
    const tt = t && !t.dead ? t : null;
    if (tt) faceTowards(tt.x, tt.y);
    fanVolley(p, p.facing, sk, mul, col, true);
    bowShotFx(p, sk.color);
  });
  later(sk.air, () => {
    if (p.dead) return;
    addEffect({ type: 'smoke3', x: p.x, y: feetY(p), count: 3, color: '#b8a888', size: 0.45, dur: 0.45 });
  });
  return { c: col, bx: +back.x.toFixed(2), by: +back.y.toFixed(2), rc: Math.round(reach) };
};
// Fächer aus count Pfeilen über angle Grad um die Blickrichtung
function fanVolley(owner, f, sk, mul, color, local) {
  const a0 = Math.atan2(f.y, f.x);
  const half = (sk.angle * Math.PI) / 360;
  for (let i = 0; i < sk.count; i++) {
    const a = a0 - half + (2 * half * i) / Math.max(1, sk.count - 1);
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    if (local) {
      spawnProjectile({ owner: 'player', x: owner.x + dir.x * 8, y: owner.y + dir.y * 6, target: null, dir, speed: sk.speed, range: sk.range, mul, color, radius: 6,
        style: 'arrow', skill: sk.id, slow: sk.slow, bfx: 'fan' });
    } else {
      spawnProjectile({ owner: 'remote', x: owner.x + dir.x * 8, y: owner.y + dir.y * 6, dir, speed: sk.speed, range: sk.range, mul: 0, color, radius: 6, style: 'arrow', bfx: 'fan' });
    }
  }
}
MAGE2_REMOTE.bleap = (rp, sk, d) => {
  addEffect({ type: 'bleap3', x: rp.x, y: feetY(rp), bx: d.bx || -d.fx, by: d.by || -d.fy, reach: d.rc || sk.distance, color: sk.color, dur: 1.0 });
  rp.leap = { start: game.time, dur: sk.air, h: 30 };
  later(sk.air * 0.45, () => fanVolley(rp, { x: d.fx, y: d.fy }, sk, 0, d.c || sk.color, false));
};

// Falkenblick (Buff): Auftritt, Aura, Bogen leuchtet; Treffer der Bogen-Fertigkeiten mit Federn
Object.assign(SKILL_FX, {
  falkenpfeil: {
    color: '#ffe6a8',
    hit(m, crit) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: '#ffe6a8', big: true, dur: 0.75, seed: Math.random() * 9 });
      particles(c.x, c.y, { count: crit ? 18 : 10, color: ['#ffffff', '#ffe6a8', '#9fe8ff'], speed: [80, 220], life: [0.2, 0.45], size: [1.5, 3], shape: 'spark', drag: 5 });
    }
  },
  pfeilhagel: { color: '#cfe6ff' },
  durchschuss: {
    color: '#9ff0ff',
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: '#9ff0ff', dur: 0.55, seed: Math.random() * 9 });
    }
  },
  rueckensprung: {
    color: '#b8f0c8',
    hit(m) {
      addEffect({ type: 'bhit3', x: m.x, y: feetY(m), color: '#b8f0c8', dur: 0.5, seed: Math.random() * 9 });
    }
  },
  falkenblick: {
    color: '#9fe8ff',
    weaponGlow: '#9fe8ff',
    cast(p) {
      addEffect({ type: 'beye3', follow: p, ox: 0, oy: 0, dur: 1.4, color: '#9fe8ff' });
      flashScreen('#bfeaff', 0.15);
    },
    aura: { every: 0.16, color: ['#bfe8ff', '#ffffff', '#ffe6a8'], shape: 'spark', up: true, size: [1.2, 2.4] },
    aura3: bowWings3
  }
});
// eigene Klänge: Wind
Object.assign(SKILL_SND, { falkenpfeil: 'wind', pfeilhagel: 'wind', durchschuss: 'wind', rueckensprung: 'wind', falkenblick: 'wind' });

// Werte im Fertigkeitsfenster (oberflaeche.js skillStats)
function bowSkillStats(sk, lvl, out) {
  if (!sk || !sk.type || !['bshot', 'brain', 'bpierce', 'bleap'].includes(sk.type)) return;
  const dmg = (v) => skillHitNum(v, lvl);
  if (sk.type === 'bshot') out.push(['Reichweite', String(sk.range)], ['Stößt zurück', '']);
  if (sk.type === 'brain') out.push(['Wellen', `${sk.waves} × ${dmg(sk.dmg)}`], ['Fläche', 'r ' + sk.radius], ['Reichweite', String(sk.range)],
    ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
  if (sk.type === 'bpierce') out.push(['Durchbohrt', ''], ['Linie', String(sk.range)]);
  if (sk.type === 'bleap') out.push(['Pfeile', `${sk.count} × ${dmg(sk.dmg)}`], ['Sprung', String(sk.distance) + ' zurück'],
    ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
  const p = game.player;
  const i = p ? bowArrowSort(p) : -1;
  if (i >= 0) out.push(['Pfeile', `${ARROW_TYPES[i].name} +${Math.round(ARROW_TYPES[i].dmg * 100)} %`]);
}

// --- Posen (SKILL_POSE3, drei-figuren.js) ------------------------------------------------------------------
// Bogenzug: Bogen hoch aufs Ziel, die Zughand zieht die Sehne bis an die Wange, Schuss, Zughand fliegt zurück, nachhalten.
// Bogenhimmel: dasselbe steil nach oben. Seit 13.59 wie der Grundangriff mit der Zughand vor dem Körper
// (vorher schwang sie seitlich weit vom Körper weg und der Bogen hing tief).
const BOW_POSE = {
  bogenzug: [[0, N3], [0.22, { rx: -1.6, wx: 1.45, lx: -1.65, lz: -0.55, cy: 0.08, gr: 0.12, hpy: -0.02 }, 'out'],
    [0.42, { rx: -1.78, wx: 1.5, lx: -1.9, lz: -0.95, hx: -0.05, gr: 0.14, hpy: -0.03 }],
    [0.5, { rx: -1.74, wx: 1.5, lx: -1.4, lz: -1.3, hx: -0.05, gr: 0.14, hpy: -0.03, hpz: -0.03 }, 'out'],
    [0.75, { rx: -1.68, wx: 1.48, lx: -1.35, lz: -1.22, gr: 0.1 }], [1, N3]],
  bogenhimmel: [[0, N3], [0.25, { rx: -2.2, wx: 1.25, lx: -2.15, lz: -0.6, cx: -0.12, hx: -0.25 }, 'out'],
    [0.42, { rx: -2.3, wx: 1.2, lx: -2.3, lz: -0.85, cx: -0.18, hx: -0.35 }],
    [0.52, { rx: -2.25, wx: 1.2, lx: -1.95, lz: -1.15, cx: -0.15, hx: -0.3 }, 'out'],
    [0.75, { rx: -2.15, wx: 1.2, lx: -1.85, lz: -1.1, cx: -0.12, hx: -0.25 }], [1, N3]]
};
if (typeof SKILL_POSE3 !== 'undefined' && typeof poseKeys3 === 'function') {
  for (const k of Object.keys(BOW_POSE)) SKILL_POSE3[k] = (B, sw) => poseKeys3(B, BOW_POSE[k], sw);
}

// --- Ultimative Attacke: Sturm des Himmelsfalken ---------------------------------------------------------
ULT_RUN.himmelsfalke = function (p, u, pw) {
  const t = pickTarget(380);
  const tx = t ? t.x : p.x + p.facing.x * 170;
  const ty = t ? t.y : p.y + p.facing.y * 170;
  faceTowards(tx, ty);
  const ar = bowArrowShot(p, 6);
  pw *= ar ? ar.mul : 1;
  p.ultAt = { x: tx, y: ty };
  const seed = Math.floor(Math.random() * 1000);
  ultFalconFx(p.x, p.y, tx, ty, seed, u.color);
  later(0.05, () => { if (typeof snd !== 'undefined') snd.shot(p, { style: 'arrow' }); });
  // Sturzflug
  later(ULT_FALCON.dive, () => {
    if (p.dead) return;
    shakeScreen(11);
    flashScreen('#e8f8ff', 0.3);
    hitStop(0.1);
    ultHitCircle(tx, ty, ULT_FALCON.R, 4.5 * pw, { stun: 2, knockback: 110, vfxColor: '#e8f8ff' });
  });
  // Pfeilsturm: zwölf Pfeile auf zufällige Stellen im Kreis (gleiche Stellen wie im Bild)
  for (const s of ultStormShots(seed, tx, ty)) {
    later(s.at + 0.2, () => {
      if (p.dead) return;
      shakeScreen(1.2);
      for (const m of enemiesInCircle(s.x, s.y, 60)) hitMonster(m, 0.9 * pw, { heavy: false, vfxColor: '#cfefff' });
    });
  }
};
const ULT_FALCON = { dive: 0.95, R: 150, storm0: 1.25, stormEvery: 0.11, n: 12 };
function ultStormShots(seed, x, y) {
  const out = [];
  for (let i = 0; i < ULT_FALCON.n; i++) {
    const a = n2h(seed + i, 11) * Math.PI * 2;
    const d = Math.sqrt(n2h(seed + i, 12)) * ULT_FALCON.R * 0.85;
    out.push({ at: ULT_FALCON.storm0 + i * ULT_FALCON.stormEvery, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8 });
  }
  return out;
}
function ultFalconFx(ox, oy, x, y, seed, color) {
  const shots = ultStormShots(seed, x, y);
  addEffect({ type: 'bult3', x, y: y + 9, ox, oy: oy + 9, seed, shots, color: color || '#9fe8ff', dur: ULT_FALCON.storm0 + ULT_FALCON.n * ULT_FALCON.stormEvery + 1.4 });
}
// Mitspieler: dasselbe Schauspiel an der gemeldeten Stelle (der Falke kommt von der nächsten Figur)
ULT_SHOW.himmelsfalke = (x, y) => {
  let ox = x;
  let oy = y + 160;
  if (typeof net !== 'undefined' && net.players) {
    let best = Infinity;
    for (const rp of net.players.values()) {
      const d = Math.hypot(rp.x - x, rp.y - y);
      if (d < best && d < 500) { best = d; ox = rp.x; oy = rp.y; }
    }
  }
  ultFalconFx(ox, oy, x, y, Math.floor(Math.random() * 1000), '#9fe8ff');
};

// --- 3D: Bausteine -------------------------------------------------------------------------------------
const _bw3a = new THREE.Vector3();
const _bw3b = new THREE.Vector3();
const _bw3c = new THREE.Vector3();
const _bw3d = new THREE.Vector3();
const _bw3e = new THREE.Vector3();
const _bw3f = new THREE.Vector3();
const _bw3s = new THREE.Vector3();
const _bw3u = new THREE.Vector3();
const _bw3X = new THREE.Vector3(1, 0, 0);
const _bw3Up = new THREE.Vector3(0, 1, 0);
const _bw3q = new THREE.Quaternion();
const _bw3q2 = new THREE.Quaternion();

// Ein Pfeil im Raum: Mitte (x,y,z), Richtung d (Einheitsvektor), Länge len; head = Farbe der Spitze (Sorte)
function bowArrow3(h, x, y, z, d, len, head, op, glow, fletch) {
  const k = len / 0.8;
  // Schaft
  _bw3a.set(x - d.x * len * 0.62, y - d.y * len * 0.62, z - d.z * len * 0.62);
  _bw3b.set(x + d.x * len * 0.22, y + d.y * len * 0.22, z + d.z * len * 0.22);
  const sh = fx3Take(h, 'segN');
  fx3Segment(sh, _bw3a, _bw3b, 0.026 * k);
  fx3Color(sh, BOW3.wood, op);
  // Spitze (fest, beleuchtet) mit hellem Schliff
  const tip = fx3Take(h, 'cone');
  fx3Cone(tip, _bw3b, d, len * 0.28, 0.085 * k);
  fx3Color(tip, lighter(head, 0.1), op);
  // Federn: zwei flache Scheiben am Ende (senkrecht und waagrecht)
  _bw3q.setFromUnitVectors(_bw3X, d);
  for (let i = 0; i < 2; i++) {
    const f = fx3Take(h, 'ball');
    f.position.set(x - d.x * len * 0.52, y - d.y * len * 0.52, z - d.z * len * 0.52);
    _bw3q2.setFromAxisAngle(_bw3X, i * Math.PI / 2);
    f.quaternion.multiplyQuaternions(_bw3q, _bw3q2);
    f.scale.set(0.13 * k, 0.055 * k, 0.01);
    fx3Color(f, i ? (fletch || BOW3.feather) : '#e8e2d6', op);
  }
  if (glow) n3Glow(h, _bw3b.x + d.x * len * 0.1, _bw3b.y, _bw3b.z + d.z * len * 0.1, glow, head, 0.75 * op);
}

// gemalte Flächen (Falke, Federn): Mitte, Breiten- und Längsrichtung, halbe Maße
const BOW_TEX = {};
const _bwM = new THREE.Matrix4();
const _bwPX = new THREE.Vector3();
const _bwPY = new THREE.Vector3();
const _bwPZ = new THREE.Vector3();
function bowPlane(h, kind, tex, x, y, z, X, Y, hw, hl, op, glow) {
  const o = fx3Take(h, kind);
  if (o.userData.bowTex !== tex) {
    o.userData.bowTex = tex;
    if (!glow) o.material.blending = THREE.NormalBlending;
    o.material.map = bowTex(tex);
    o.material.needsUpdate = true;
  }
  _bwPX.copy(X);
  _bwPY.copy(Y);
  _bwPZ.crossVectors(_bwPX, _bwPY).normalize();
  _bwM.makeBasis(_bwPX, _bwPY, _bwPZ);
  o.quaternion.setFromRotationMatrix(_bwM);
  o.rotation.setFromQuaternion(o.quaternion);
  o.position.set(x, y, z);
  o.scale.set(hw, hl, 1);
  o.material.color.set('#ffffff');
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}
function bowTex(kind) {
  if (BOW_TEX[kind]) return BOW_TEX[kind];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (kind === 'wing') {
    // Flügel von oben: links Ansatz, rechts Spitze; Vorderkante unten (gold), Schwungfedern nach oben gespreizt
    c.width = 256;
    c.height = 128;
    const fill = g.createLinearGradient(0, 0, 256, 0);
    fill.addColorStop(0, 'rgba(255,255,255,0.98)');
    fill.addColorStop(0.35, 'rgba(214,240,255,0.95)');
    fill.addColorStop(0.75, 'rgba(120,196,255,0.9)');
    fill.addColorStop(1, 'rgba(60,130,230,0.85)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(0, 122);
    g.bezierCurveTo(70, 118, 150, 104, 210, 86);
    g.lineTo(252, 70);
    // Schwungfedern: einzelne lange Federn, außen länger und gespreizt
    const n = 9;
    for (let i = 0; i < n; i++) {
      const v = 1 - i / n;
      const bx = 40 + 205 * v;
      const len = 28 + 52 * v;
      const tilt = 18 * v;
      g.lineTo(bx + tilt, 74 - len);
      g.quadraticCurveTo(bx + tilt - 10, 74 - len + 4, bx - 12, 70 - len * 0.35);
    }
    g.quadraticCurveTo(20, 44, 0, 52);
    g.closePath();
    g.fill();
    // Federkiele und Deckfedern
    g.strokeStyle = 'rgba(40,90,170,0.45)';
    g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const v = 1 - i / n;
      const bx = 40 + 205 * v;
      const len = 28 + 52 * v;
      g.beginPath();
      g.moveTo(bx - 14, 92 - v * 8);
      g.lineTo(bx + 18 * v - 2, 76 - len);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(30 + i * 30, 100 - i * 3, 22, 9, -0.15, 0, Math.PI * 2);
      g.fill();
    }
    // goldene Vorderkante
    g.strokeStyle = 'rgba(255,214,130,0.95)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 120);
    g.bezierCurveTo(70, 116, 150, 102, 250, 72);
    g.stroke();
  } else if (kind === 'body') {
    // Körper von oben: Kopf mit Schnabel oben, Brust, Schwanzfächer unten
    c.width = 128;
    c.height = 256;
    const fill = g.createLinearGradient(0, 0, 0, 256);
    fill.addColorStop(0, 'rgba(255,255,255,1)');
    fill.addColorStop(0.45, 'rgba(220,244,255,0.98)');
    fill.addColorStop(1, 'rgba(90,170,245,0.9)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(64, 6);
    g.quadraticCurveTo(88, 20, 86, 52);
    g.quadraticCurveTo(100, 110, 84, 150);
    // Schwanzfächer
    g.lineTo(112, 236);
    g.quadraticCurveTo(64, 256, 16, 236);
    g.lineTo(44, 150);
    g.quadraticCurveTo(28, 110, 42, 52);
    g.quadraticCurveTo(40, 20, 64, 6);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(40,90,170,0.4)';
    g.lineWidth = 2;
    for (const dx of [-30, -15, 0, 15, 30]) {
      g.beginPath();
      g.moveTo(64 + dx * 0.3, 160);
      g.lineTo(64 + dx, 238);
      g.stroke();
    }
    // Schnabel (gold) und Augen
    g.fillStyle = '#ffcf6a';
    g.beginPath();
    g.moveTo(64, 0);
    g.lineTo(56, 18);
    g.lineTo(72, 18);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffe9a0';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(64 + s * 12, 30, 4.5, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'feather') {
    // einzelne Feder: Kiel in der Mitte, weiche Fahne, Spitze oben
    c.width = 32;
    c.height = 96;
    const fill = g.createLinearGradient(0, 0, 0, 96);
    fill.addColorStop(0, 'rgba(255,255,255,1)');
    fill.addColorStop(0.7, 'rgba(220,240,255,0.95)');
    fill.addColorStop(1, 'rgba(160,210,255,0.6)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(16, 2);
    g.quadraticCurveTo(31, 30, 24, 78);
    g.lineTo(16, 92);
    g.lineTo(8, 78);
    g.quadraticCurveTo(1, 30, 16, 2);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(120,150,190,0.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(16, 94);
    g.stroke();
  } else if (kind === 'eye') {
    // Falkenauge: mandelförmig, goldene Iris, schmale Pupille, Lichtpunkt
    c.width = 256;
    c.height = 128;
    const ey = (k) => {
      g.beginPath();
      g.moveTo(8, 64);
      g.quadraticCurveTo(128, -10 * k, 248, 64);
      g.quadraticCurveTo(128, 138 * k - 10, 8, 64);
      g.closePath();
    };
    g.fillStyle = 'rgba(160,230,255,0.35)';
    ey(1.05);
    g.fill();
    g.save();
    ey(1);
    g.clip();
    g.fillStyle = 'rgba(235,250,255,0.95)';
    g.fillRect(0, 0, 256, 128);
    const ir = g.createRadialGradient(128, 64, 4, 128, 64, 46);
    ir.addColorStop(0, '#fff2b0');
    ir.addColorStop(0.45, '#ffc23a');
    ir.addColorStop(0.85, '#c86a10');
    ir.addColorStop(1, '#3a1a06');
    g.fillStyle = ir;
    g.beginPath();
    g.arc(128, 64, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#10080a';
    g.beginPath();
    g.ellipse(128, 64, 9, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(112, 48, 8, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(30,70,140,0.9)';
    g.lineWidth = 5;
    ey(1);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  BOW_TEX[kind] = t;
  return t;
}

// Falke aus gemalten Flächen: Mitte (x,y,z), Flugrichtung fwd (Einheitsvektor), Spannweite span, Flügelschlag flap
const _bfF = new THREE.Vector3();
const _bfS = new THREE.Vector3();
const _bfU = new THREE.Vector3();
const _bfB = new THREE.Vector3();
const _bfW = new THREE.Vector3();
function bowFalcon3(h, x, y, z, fwd, span, flap, op, low) {
  _bfF.copy(fwd);
  _bfS.set(-_bfF.z, 0, _bfF.x);
  if (_bfS.lengthSq() < 0.0001) _bfS.set(1, 0, 0);
  _bfS.normalize();
  _bfU.crossVectors(_bfS, _bfF).normalize();
  _bfB.copy(_bfF).negate();
  // halbe Flügellänge (PlaneGeometry ist 2 × 2 groß): ein Flügel ist eine halbe Spannweite lang
  const hw = span * 0.25;
  for (const s of [-1, 1]) {
    _bfW.copy(_bfS).multiplyScalar(s * Math.cos(flap)).addScaledVector(_bfU, Math.sin(flap)).normalize();
    const cx = x + _bfW.x * hw * 1.05 - _bfF.x * 0.05 * span;
    const cy = y + _bfW.y * hw * 1.05 - _bfF.y * 0.05 * span;
    const cz = z + _bfW.z * hw * 1.05 - _bfF.z * 0.05 * span;
    bowPlane(h, 'planeNBowW', 'wing', cx, cy, cz, _bfW, _bfB, hw, hw * 0.48, op);
    if (!low) bowPlane(h, 'planeBowWG', 'wing', cx, cy + 0.03, cz, _bfW, _bfB, hw * 1.05, hw * 0.52, op * 0.35, true);
  }
  // Körper mit Kopf vorn
  const bl = span * 0.2;
  const bx = x - _bfF.x * bl * 0.15;
  const by = y - _bfF.y * bl * 0.15 + 0.04;
  const bz = z - _bfF.z * bl * 0.15;
  bowPlane(h, 'planeNBowB', 'body', bx, by, bz, _bfS, _bfF, bl * 0.4, bl, op);
  if (!low) bowPlane(h, 'planeBowBG', 'body', bx, by + 0.02, bz, _bfS, _bfF, bl * 0.46, bl * 1.08, op * 0.4, true);
  n3Glow(h, x + _bfF.x * bl * 0.8, y + _bfF.y * bl * 0.8 + 0.12, z + _bfF.z * bl * 0.8, span * 0.12, '#ffffff', 0.8 * op);
}

// eine fallende/schwebende Feder (zur Kamera gedreht, wiegt hin und her); eigener Vorrat mit Federbild
function bowFeather3(h, x, y, z, s, rot, op) {
  if (op <= 0.01) return null;
  const o = fx3Take(h, 'spriteBowF');
  if (!o.userData.bowTex) {
    o.userData.bowTex = 'feather';
    o.material.map = bowTex('feather');
    o.material.blending = THREE.NormalBlending;
    o.material.needsUpdate = true;
  }
  o.position.set(x, y, z);
  o.scale.set(s * 0.34, s, 1);
  o.material.rotation = rot;
  o.material.color.set('#ffffff');
  o.material.opacity = Math.max(0, Math.min(1, op));
  return o;
}

// --- 3D: Pfeile als Körper (jedes Bild für alle Bogenschüsse, eigene und die der Mitspieler) -----------------
const BOW_PROJ3_MAX = 40;
function bowProj3(h) {
  if (typeof V3 === 'undefined' || !V3.on) return;
  const low = n3low();
  let n = 0;
  const y = PROJECTILE_LIFT * U3 * 1.3;
  const t = game.time;
  for (const pr of game.projectiles) {
    if (pr.style !== 'arrow' || (pr.owner !== 'player' && pr.owner !== 'remote')) continue;
    if (n >= BOW_PROJ3_MAX || !v3InView(pr.x, pr.y, 40)) continue;
    n++;
    _bw3d.set(pr.vx, 0, pr.vy).normalize();
    const x = pr.x * U3;
    const z = pr.y * U3;
    const big = pr.bfx === 'falke' || pr.bfx === 'pierce' ? 1.3 : 1;
    const col = pr.color || '#f0e0b0';
    // helle Leuchtspur hinter dem Pfeil (Tempo)
    _bw3a.set(x - _bw3d.x * 0.45 * big, y, z - _bw3d.z * 0.45 * big);
    _bw3b.set(x - _bw3d.x * (0.45 + 1.4 * big), y, z - _bw3d.z * (0.45 + 1.4 * big));
    const st = fx3Take(h, 'seg');
    fx3Segment(st, _bw3b, _bw3a, 0.035 * big);
    fx3Color(st, pr.bfx === 'falke' ? '#ffc84a' : col, pr.bfx === 'falke' ? 0.8 : 0.45);
    bowArrow3(h, x, y, z, _bw3d, 0.85 * big, col, 1, (pr.arrow >= 5 ? 0.55 : 0.32) * big, pr.arrow >= 2 ? col : null);
    if (pr.bfx === 'falke') {
      // Federwirbel und goldener Wind um den Falkenpfeil
      _bw3s.set(-_bw3d.z, 0, _bw3d.x);
      for (let i = 0; i < (low ? 2 : 4); i++) {
        const a = t * 16 + i * (Math.PI / 2);
        const back = 0.35 + i * 0.28;
        const r = 0.22 + 0.04 * i;
        const fx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
        const fy = y + Math.sin(a) * r;
        const fz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
        bowFeather3(h, fx, fy, fz, 0.32 - i * 0.04, a, 0.95 - i * 0.15);
        n3Glow(h, fx, fy, fz, 0.22, i % 2 ? BOW3.gold : BOW3.sky, 0.6);
      }
      // goldener Windwirbel: zwei kurze Bänder schrauben sich hinter der Spitze um den Pfeil (deckend, auch auf hellem Gras)
      const m = low ? 6 : 12;
      for (let s = 0; s < 2; s++) {
        let px = 0;
        let py = 0;
        let pz = 0;
        for (let i = 0; i <= m; i++) {
          const back = 0.1 + i * 0.12;
          const a = t * 26 - i * 0.9 + s * Math.PI;
          const r = 0.22 + i * 0.02;
          const nx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          const nz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
          if (i) {
            _bw3a.set(px, py, pz);
            _bw3b.set(nx, ny, nz);
            const sg = fx3Take(h, 'segN');
            fx3Segment(sg, _bw3a, _bw3b, 0.045 * (1 - i / (m + 3)));
            fx3Color(sg, s ? '#fff6dc' : '#ffb02a', 0.95 * (1 - i / (m + 1)));
          }
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      n3Glow(h, x, y, z, 0.9, BOW3.gold, 0.35);
    } else if (pr.bfx === 'pierce') {
      // zwei Windbänder spiralen um die Flugbahn
      _bw3s.set(-_bw3d.z, 0, _bw3d.x);
      const m = low ? 8 : 16;
      for (let s = 0; s < 2; s++) {
        let px = 0;
        let py = 0;
        let pz = 0;
        for (let i = 0; i <= m; i++) {
          const back = i * 0.15;
          const a = t * 22 - i * 0.75 + s * Math.PI;
          const r = 0.17 + i * 0.014;
          const nx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          const nz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
          if (i) {
            _bw3a.set(px, py, pz);
            _bw3b.set(nx, ny, nz);
            const sg = fx3Take(h, 'segN');
            fx3Segment(sg, _bw3a, _bw3b, 0.03 * (1 - i / (m + 2)));
            fx3Color(sg, s ? '#ffffff' : '#2aa8e0', 0.95 * (1 - i / (m + 1)));
          }
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      n3Glow(h, x, y, z, 1.0, BOW3.sky, 0.5);
    } else if (pr.bfx === 'fan') {
      n3Glow(h, x, y, z, 0.5, '#b8f0c8', 0.35);
    }
    pr.body3 = t;
  }
}
FX3_HOOKS.push({ parts: [], fn: bowProj3 });

// --- 3D: Effekte ------------------------------------------------------------------------------------------
['bmuzzle3', 'bhit3', 'brain3', 'bpierce3', 'bleap3', 'beye3', 'bult3'].forEach((k) => FX3_TYPES.add(k));
const _bwH = new THREE.Vector3();

// Abschuss: Lichtblitz an der Bogenhand, Windring quer zur Schussrichtung
FX3_DRAW.bmuzzle3 = function (h, e) {
  const o = e.follow;
  if (!o) return;
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const hand = typeof ninjaHand3 === 'function' ? ninjaHand3(o, _bwH) : _bwH.set(o.x * U3, 0.8, feetY(o) * U3);
  const f = o.facing || { x: 0, y: 1 };
  const x = hand.x + f.x * 0.25;
  const z = hand.z + f.y * 0.25;
  if (typeof nfxStar === 'function') nfxStar(h, x, hand.y, z, 0.7 * (1 - k) + 0.1, e.color, 1 - k);
  _bw3c.set(x, hand.y, z);
  _bw3a.set(f.x, 0, f.y).normalize();
  _bw3s.set(-f.y, 0, f.x);
  const s = fx3Take(h, 'strip');
  fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.2 + k * 0.5, 0.07, 0, Math.PI * 2, e.color, 0.8 * (1 - k), true);
};

// Treffer: Federn stieben auseinander, Lichtring
FX3_DRAW.bhit3 = function (h, e) {
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const x = e.x * U3;
  const z = e.y * U3;
  const n = e.big ? 9 : 5;
  for (let i = 0; i < n; i++) {
    const a = n2h(i, e.seed) * Math.PI * 2;
    const r = (0.3 + 0.9 * n2h(i, e.seed + 1)) * easeOut(k) * (e.big ? 1.4 : 1);
    const yy = 0.9 + Math.sin(k * Math.PI) * 0.7 * n2h(i, e.seed + 2) - k * 0.5;
    bowFeather3(h, x + Math.cos(a) * r, yy, z + Math.sin(a) * r, 0.28, a + k * 4, 1 - k);
  }
  n3Glow(h, x, 0.9, z, (e.big ? 1.8 : 1.1) * (0.6 + k), e.color, 0.7 * (1 - k));
  const g = fx3Take(h, 'plane');
  fx3Ground(g, e.x, e.y, (e.big ? 1.3 : 0.8) * (0.3 + k), 0.05, 'ring');
  fx3Color(g, e.color, 0.7 * (1 - k));
};

// Pfeilhagel: drei Pfeile steigen auf, danach fallen Wellen aus Pfeilen schräg vom Himmel und bleiben stecken
function rainArrows(e) {
  if (e._arr) return e._arr;
  const out = [];
  const per = n3low() ? 9 : 16;
  for (let k = 0; k < e.waves; k++) {
    for (let i = 0; i < per; i++) {
      const s = e.seed + k * 31 + i;
      const a = n2h(s, 1) * Math.PI * 2;
      const d = Math.sqrt(n2h(s, 2)) * e.R * 0.95;
      out.push({ k, at: e.delay + k * e.every + n2h(s, 3) * 0.16, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.8, tilt: (n2h(s, 4) - 0.5) * 0.3, s });
    }
  }
  e._arr = out;
  return out;
}
const RAIN_FALL = 0.24;
FX3_DRAW.brain3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const out = clamp01((e.dur - t) / 0.45);
  // Windrichtung: die Pfeile kommen schräg von der Seite des Schützen
  const wx = e.x - e.ox;
  const wz = e.y - e.oy;
  const wl = Math.hypot(wx, wz) || 1;
  const sx = wx / wl;
  const sz = wz / wl;
  // Aufstieg: drei Pfeile steil nach oben aus der Hand
  if (t < 0.6) {
    for (let i = 0; i < 3; i++) {
      const u = clamp01((t - 0.12 - i * 0.04) / 0.45);
      if (u <= 0 || u >= 1) continue;
      _bw3d.set(sx * 0.25 + (i - 1) * 0.12, 1, sz * 0.25).normalize();
      const x = e.ox * U3 + _bw3d.x * u * 9;
      const y = 1.2 + _bw3d.y * u * 9;
      const z = e.oy * U3 + _bw3d.z * u * 9;
      bowArrow3(h, x, y, z, _bw3d, 0.85, e.color, 1 - u * 0.5, 0.45);
      _bw3a.set(x, y, z);
      _bw3b.set(x - _bw3d.x * 1.6, y - _bw3d.y * 1.6, z - _bw3d.z * 1.6);
      const st = fx3Take(h, 'seg');
      fx3Segment(st, _bw3b, _bw3a, 0.04);
      fx3Color(st, '#e8f6ff', 0.5 * (1 - u));
    }
  }
  // Schatten der kommenden Welle am Boden (weicher dunkler Fleck, kein Zeichen)
  for (let k = 0; k < e.waves; k++) {
    const t0 = e.delay + k * e.every;
    const v = (t - (t0 - 0.25)) / 0.5;
    if (v > 0 && v < 1) mGround(h, 'planeNBowSh', 'disc', e.x, e.y, e.R * U3 * 1.05, 0.03, 0, '#0a1420', 0.28 * Math.sin(v * Math.PI));
  }
  // fallende und steckende Pfeile
  _bw3d.set(sx * 0.35, -1, sz * 0.35).normalize();
  for (const a of rainArrows(e)) {
    const age = t - a.at;
    if (age < 0) continue;
    const gx = a.x * U3;
    const gz = a.y * U3;
    if (age < RAIN_FALL) {
      const u = age / RAIN_FALL;
      const H = 7 * (1 - u);
      const x = gx - _bw3d.x * H / -_bw3d.y;
      const z = gz - _bw3d.z * H / -_bw3d.y;
      bowArrow3(h, x, H + 0.35, z, _bw3d, 0.8, e.color, 1, low ? 0 : 0.3);
      _bw3a.set(x, H + 0.35, z);
      _bw3b.set(x - _bw3d.x * 1.8, H + 0.35 - _bw3d.y * 1.8, z - _bw3d.z * 1.8);
      const st = fx3Take(h, 'seg');
      fx3Segment(st, _bw3b, _bw3a, 0.03);
      fx3Color(st, '#e8f6ff', 0.4);
    } else {
      // steckt schräg im Boden, wackelt kurz nach
      const v = age - RAIN_FALL;
      const wob = Math.sin(v * 40) * Math.exp(-v * 8) * 0.15;
      _bw3c.set(_bw3d.x + wob + a.tilt * 0.3, _bw3d.y, _bw3d.z + a.tilt * 0.3).normalize();
      bowArrow3(h, gx - _bw3c.x * 0.22, 0.22, gz - _bw3c.z * 0.22, _bw3c, 0.8, e.color, out, 0);
      if (v < 0.35) {
        const q = v / 0.35;
        n3Smoke(h, gx, 0.15 + q * 0.3, gz, 0.4 + q * 0.5, '#b8a888', 0.45 * (1 - q));
        if (!low && a.s % 2 === 0) n3Glow(h, gx, 0.2, gz, 0.5 * (1 - q), '#ffffff', 0.8 * (1 - q));
      }
    }
  }
};

// Durchbohrender Schuss: Windtunnel entlang der Bahn – zwei Spiralbänder, die hinter dem Pfeil aufgehen und verwehen
FX3_DRAW.bpierce3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const fly = e.len / e.speed;
  const tip = Math.min(e.len, e.speed * t);
  const fade = clamp01((e.dur - t) / 0.5);
  const y = PROJECTILE_LIFT * U3 * 1.3;
  _bw3d.set(e.dx, 0, e.dy).normalize();
  _bw3s.set(-_bw3d.z, 0, _bw3d.x);
  const x0 = e.x * U3;
  const z0 = (e.y - 9) * U3;
  const L = tip * U3;
  const n = low ? 18 : 40;
  // zwei Spiralbänder entlang der Bahn: gehen hinter dem Pfeil auf, weiten sich und verwehen
  for (let s = 0; s < 2; s++) {
    let px = 0;
    let py = 0;
    let pz = 0;
    let has = false;
    for (let i = 0; i <= n; i++) {
      const d = (i / n) * L;
      const age = t - (d / U3) / e.speed;
      if (age < 0) break;
      const grow = clamp01(age / 0.35);
      const r = 0.2 + grow * 0.45;
      const a = d * 3 + s * Math.PI + t * 5;
      const nx = x0 + _bw3d.x * d + _bw3s.x * Math.cos(a) * r;
      const ny = y + Math.sin(a) * r;
      const nz = z0 + _bw3d.z * d + _bw3s.z * Math.cos(a) * r;
      if (has) {
        _bw3a.set(px, py, pz);
        _bw3b.set(nx, ny, nz);
        const op = fade * (1 - grow * 0.65);
        const sg = fx3Take(h, 'segN');
        fx3Segment(sg, _bw3a, _bw3b, 0.05 * (1 - grow * 0.5));
        fx3Color(sg, s ? '#ffffff' : '#3ab4e8', 0.9 * op);
      }
      px = nx;
      py = ny;
      pz = nz;
      has = true;
    }
  }
  // weicher Windkanal in der Mitte
  if (L > 0.05) {
    _bw3a.set(x0, y, z0);
    _bw3b.set(x0 + _bw3d.x * L, y, z0 + _bw3d.z * L);
    const core = fx3Take(h, 'seg');
    fx3Segment(core, _bw3a, _bw3b, 0.1);
    fx3Color(core, '#7fd8ff', 0.18 * fade);
  }
  // Ringe aus Wind in Abständen entlang der Bahn
  for (let i = 1; i <= (low ? 3 : 6); i++) {
    const d = (i / (low ? 4 : 7)) * e.len;
    if (d > tip) break;
    const age = t - d / e.speed;
    const k = clamp01(age / 0.6);
    _bw3c.set(x0 + _bw3d.x * d * U3, y, z0 + _bw3d.z * d * U3);
    const s = fx3Take(h, 'stripN');
    fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.25 + k * 0.5, 0.06, 0, Math.PI * 2, i % 2 ? '#bff0ff' : '#ffffff', 0.85 * (1 - k) * fade, true);
  }
  if (t < fly + 0.1) n3Glow(h, x0, y, z0, 1.2 * (1 - clamp01(t / 0.3)), '#ffffff', 0.6);
};

// Rückensprung: Windstoß am Absprung, Federn auf der Bahn
FX3_DRAW.bleap3 = function (h, e) {
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const x = e.x * U3;
  const z = e.y * U3;
  const g = fx3Take(h, 'plane');
  fx3Ground(g, e.x, e.y, 0.5 + k * 1.6, 0.05, 'ring');
  fx3Color(g, e.color, 0.7 * (1 - k));
  _bw3c.set(x, 0.3, z);
  _bw3s.set(e.by, 0, -e.bx);
  for (let i = 0; i < 2; i++) {
    const s = fx3Take(h, 'strip');
    fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.6 + k * 1.2 + i * 0.25, 0.12, -0.3, Math.PI + 0.3, i ? '#ffffff' : e.color, 0.7 * (1 - k), true);
  }
  const L = e.reach * U3;
  for (let i = 0; i < 6; i++) {
    const v = (i + 0.5) / 6;
    const u = clamp01(k * 1.6 - v * 0.3);
    bowFeather3(h, x + e.bx * L * v + Math.sin(i * 2.3) * 0.25, 0.6 + Math.sin(v * Math.PI) * 0.9 - u * 0.6, z + e.by * L * v, 0.26, i + t * 3, (1 - k) * 0.95);
  }
};

// Falkenblick: ein großes Falkenauge öffnet sich über dem Kopf, Federn wirbeln nach oben
FX3_DRAW.beye3 = function (h, e) {
  const o = e.follow;
  if (!o) return;
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const x = o.x * U3;
  const z = feetY(o) * U3;
  const head = (typeof v3HeadHeight === 'function' ? v3HeadHeight(o) : 2) + 2.0;
  const open = k < 0.25 ? easeOut(k / 0.25) : 1;
  const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  const R = FX3.cam.r;
  const U = FX3.cam.u;
  _bw3a.copy(R);
  _bw3b.copy(U);
  bowPlane(h, 'planeNBowE', 'eye', x, head, z, _bw3a, _bw3b, 0.75, 0.375 * open, fade);
  bowPlane(h, 'planeBowEG', 'eye', x, head, z, _bw3a, _bw3b, 0.95, 0.5 * open, 0.4 * fade, true);
  n3Glow(h, x, head, z, 2.2, '#9fe8ff', 0.35 * fade);
  const n = n3low() ? 5 : 10;
  for (let i = 0; i < n; i++) {
    const ph = (k * 1.2 + i / n) % 1;
    const a = i * 2.399 + t * 3;
    const r = 0.9 - ph * 0.5;
    bowFeather3(h, x + Math.cos(a) * r, 0.2 + ph * (head - 0.2), z + Math.sin(a) * r, 0.3, a, fade * Math.sin(ph * Math.PI));
  }
};

// Aura des Falkenblicks: geisterhafte Schwingen auf dem Rücken, die langsam atmen; ab und zu blitzt ein Glanzstern.
// Die Schwingen stehen immer quer zur Kamera (wie ein Abzeichen auf dem Rücken) und liegen hinter der Figur.
const _bwN = new THREE.Vector3();
function bowWings3(h, p, b, t) {
  const low = n3low();
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const head = typeof v3HeadHeight === 'function' ? v3HeadHeight(p) : 2;
  const R = FX3.cam.r;
  const U = FX3.cam.u;
  _bwN.copy(FX3.cam.f);
  const left = clamp01((b.until - t) / 1.5);
  const op = 0.62 * left * (0.85 + 0.15 * Math.sin(t * 2));
  const breathe = 0.62 + 0.08 * Math.sin(t * 1.8);
  const cy = head * 0.66;
  const hw = 0.7;
  for (const s of [-1, 1]) {
    _bw3c.copy(R).multiplyScalar(s * Math.cos(breathe)).addScaledVector(U, Math.sin(breathe)).normalize();
    // Federn hängen nach unten außen
    _bw3e.copy(U).multiplyScalar(-Math.cos(breathe)).addScaledVector(R, s * Math.sin(breathe)).normalize();
    const cx = x + _bw3c.x * hw * 0.92 + _bwN.x * 0.3;
    const cyy = cy + _bw3c.y * hw * 0.92 + _bwN.y * 0.3;
    const cz = z + _bw3c.z * hw * 0.92 + _bwN.z * 0.3;
    bowPlane(h, 'planeNBowW', 'wing', cx, cyy, cz, _bw3c, _bw3e, hw, hw * 0.5, op);
    if (!low) bowPlane(h, 'planeBowWG', 'wing', cx, cyy, cz, _bw3c, _bw3e, hw * 1.06, hw * 0.54, op * 0.5, true);
  }
  const tw = Math.pow(Math.max(0, Math.sin(t * 1.1)), 12);
  if (tw > 0.05 && typeof nfxStar === 'function') nfxStar(h, x, head + 0.25, z, 0.25 + tw * 0.35, BOW3.sky, tw * left);
}

// Ulti: Riesenfalke stößt herab, Druckwelle, Federn, dann Pfeilsturm
FX3_DRAW.bult3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const D = ULT_FALCON.dive;
  const x1 = e.x * U3;
  const z1 = e.y * U3;
  const x0 = e.ox * U3;
  const z0 = e.oy * U3;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz) || 1;
  const fx = dx / L;
  const fz = dz / L;
  if (t < D) {
    // Bahn: erscheint hoch über dem Schützen, gleitet zum Ziel und stürzt am Ende steil herab
    const u = t / D;
    const grow = clamp01(t / 0.25);
    const bx = x0 - fx * 0.5;
    const bz = z0 - fz * 0.5 - 0.8;
    const H0 = 3.4;
    const px = bx + (x1 - bx) * u;
    const pz = bz + (z1 - bz) * u;
    const py = H0 * (1 - u * u) + 0.9;
    const vy = -2 * H0 * u;
    _bw3d.set((x1 - bx), vy, (z1 - bz)).normalize();
    const flap = u < 0.65 ? 0.2 + 0.4 * Math.sin(t * 12) : 0.5 - (u - 0.65) * 1.2;
    bowFalcon3(h, px, py, pz, _bw3d, 4.2 * grow, flap, 0.95 * grow, low);
    n3Glow(h, px, py, pz, 5 * grow, '#bfeaff', 0.3);
    // Schatten am Boden wird größer, je näher er kommt
    mGround(h, 'planeNBowSh', 'disc', px / U3, pz / U3, 2.2 + u * 1.5, 0.03, 0, '#06101c', 0.35 * u);
    // Windspur hinter ihm
    for (let i = 1; i <= (low ? 4 : 9); i++) {
      const v = Math.max(0, u - i * 0.05);
      const qx = bx + (x1 - bx) * v;
      const qz = bz + (z1 - bz) * v;
      const qy = H0 * (1 - v * v) + 0.9;
      n3Glow(h, qx, qy, qz, 1.2 - i * 0.1, i % 2 ? '#ffffff' : '#9fe8ff', 0.5 - i * 0.045);
    }
    return;
  }
  // Einschlag: Druckwelle aus Wind, Lichtsäule, Federn
  const v = t - D;
  const k = clamp01(v / 0.8);
  if (k < 1) {
    for (let i = 0; i < 2; i++) {
      const w = fx3Take(h, 'wall');
      fx3Wall(w, e.x, e.y, (1 + k * 4.6) * (1 - i * 0.2), 1.2 * (1 - k) + 0.1);
      fx3Color(w, i ? '#ffffff' : '#9fe8ff', 0.6 * (1 - k));
    }
    const g = fx3Take(h, 'plane');
    fx3Ground(g, e.x, e.y, 1 + k * 4.6, 0.05, 'ring');
    fx3Color(g, '#cfefff', 0.8 * (1 - k));
    n3Glow(h, x1, 1, z1, 7 * (0.4 + k), '#e8f8ff', 0.6 * (1 - k));
    _bw3a.set(x1, 0, z1);
    _bw3b.set(x1, 9, z1);
    const col = fx3Take(h, 'seg');
    fx3Segment(col, _bw3a, _bw3b, 0.5 * (1 - k) + 0.04);
    fx3Color(col, '#9fdcff', 0.3 * (1 - k) * (1 - k));
  }
  // Federn regnen langsam herab
  const nf = low ? 10 : 24;
  const fk = clamp01(v / 2.4);
  if (fk < 1) {
    for (let i = 0; i < nf; i++) {
      const a = n2h(i, e.seed) * Math.PI * 2;
      const r = (0.5 + 3.5 * n2h(i, e.seed + 1)) * easeOut(clamp01(v / 0.6));
      const yy = (1.2 + 3 * n2h(i, e.seed + 2)) * (1 - fk) + 0.1 + Math.sin(v * 3 + i) * 0.1;
      bowFeather3(h, x1 + Math.cos(a) * r + Math.sin(v * 2 + i) * 0.3, yy, z1 + Math.sin(a) * r, 0.4, a + v * 2, 1 - fk);
    }
  }
  // Pfeilsturm: Pfeile fallen schräg auf ihre Stellen
  _bw3d.set(fx * 0.4, -1, fz * 0.4).normalize();
  const out = clamp01((e.dur - t) / 0.4);
  for (const s of e.shots) {
    const age = t - s.at;
    if (age < 0) continue;
    const gx = s.x * U3;
    const gz = (s.y + 9) * U3;
    if (age < 0.2) {
      const u = age / 0.2;
      const H = 9 * (1 - u);
      const x = gx - _bw3d.x * H / -_bw3d.y;
      const z = gz - _bw3d.z * H / -_bw3d.y;
      bowArrow3(h, x, H + 0.4, z, _bw3d, 1.2, '#cfefff', 1, 0.6);
      _bw3a.set(x, H + 0.4, z);
      _bw3b.set(x - _bw3d.x * 2.6, H + 0.4 - _bw3d.y * 2.6, z - _bw3d.z * 2.6);
      const st = fx3Take(h, 'seg');
      fx3Segment(st, _bw3b, _bw3a, 0.06);
      fx3Color(st, '#e8f8ff', 0.55);
    } else {
      bowArrow3(h, gx - _bw3d.x * 0.3, 0.3, gz - _bw3d.z * 0.3, _bw3d, 1.2, '#cfefff', out, 0);
      const q = (age - 0.2) / 0.4;
      if (q < 1) {
        n3Glow(h, gx, 0.3, gz, 1.4 * (1 - q), '#ffffff', 0.7 * (1 - q));
        n3Smoke(h, gx, 0.2 + q * 0.4, gz, 0.6 + q * 0.6, '#b8a888', 0.4 * (1 - q));
        if (q < 0.6) {
          const g = fx3Take(h, 'plane');
          fx3Ground(g, s.x, s.y + 9, 0.4 + q * 1.4, 0.05, 'ring');
          fx3Color(g, '#cfefff', 0.6 * (1 - q / 0.6));
        }
      }
    }
  }
};

// --- 2D (ohne 3D): einfache Leuchtformen ---------------------------------------------------------------------
EXTRA_EFFECTS.bmuzzle3 = () => {};
EXTRA_EFFECTS.bhit3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 24, 18 + k * 12, e.color, 0.6 * (1 - k));
  ctx.restore();
};
EXTRA_EFFECTS.brain3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.save();
  ctx.strokeStyle = '#e8f4ff';
  ctx.lineCap = 'round';
  for (const a of rainArrows(e)) {
    const age = t - a.at;
    if (age < 0) continue;
    const ax = x + (a.x - e.x);
    const ay = y + (a.y - e.y);
    if (age < RAIN_FALL) {
      const h = 160 * (1 - age / RAIN_FALL);
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax - h * 0.2, ay - h - 18);
      ctx.lineTo(ax - h * 0.2 + 4, ay - h);
      ctx.stroke();
    } else {
      ctx.globalAlpha = clamp01((e.dur - t) / 0.4);
      ctx.strokeStyle = '#7a5634';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 4, ay - 12);
      ctx.stroke();
      ctx.strokeStyle = '#e8f4ff';
    }
  }
  ctx.restore();
};
EXTRA_EFFECTS.bpierce3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const tip = Math.min(e.len, e.speed * t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp01((e.dur - t) / 0.5) * 0.6;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x + e.dx * tip, y - 20 + e.dy * tip);
  ctx.stroke();
  ctx.restore();
};
EXTRA_EFFECTS.bleap3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.globalAlpha = 0.6 * (1 - k);
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 + k * 40, (16 + k * 40) * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};
EXTRA_EFFECTS.beye3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 70, 20, '#9fe8ff', 0.7 * (1 - k));
  ctx.restore();
};
EXTRA_EFFECTS.bult3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (t < ULT_FALCON.dive) {
    const u = t / ULT_FALCON.dive;
    glow2(ctx, x, y - 260 * (1 - u), 40, '#bfeaff', 0.8);
  } else {
    const v = clamp01((t - ULT_FALCON.dive) / 0.8);
    glow2(ctx, x, y - 10, 40 + v * 140, '#cfefff', 0.6 * (1 - v));
  }
  for (const s of e.shots) {
    const age = t - s.at;
    if (age > 0 && age < 0.5) glow2(ctx, x + (s.x - e.x), y + (s.y + 9 - e.y), 22, '#e8f8ff', 1 - age / 0.5);
  }
  ctx.restore();
};

// --- Symbole ------------------------------------------------------------------------------------------------
Object.assign(ICON_THEME, {
  himmel: ['#3a8ad0', '#061a30', '#e0f6ff'],
  falke: ['#d8a83a', '#2a1806', '#fff6d0']
});
Object.assign(SKILL_ART_THEME, { falkenpfeil: 'falke', pfeilhagel: 'himmel', durchschuss: 'eis', rueckensprung: 'wind', falkenblick: 'himmel', himmelsfalke: 'gold' });

// Pfeil im Symbol: Spitze bei (x1,y1), Ende bei (x0,y0); head = Farbe der Spitze. Federn und Spitze passen sich
// der Länge an, damit auch kurze Pfeile wie Pfeile aussehen
function ikBowArrow(ctx, IK, x0, y0, x1, y1, o = {}) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const w = o.w || 1.6;
  const hl = Math.min(5 * w, len * 0.26);
  const hw = Math.max(1.6, hl * 0.42);
  const fl = Math.min(4.5 * w, len * 0.24);
  const fw = Math.max(1.2, fl * 0.42);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(a);
  // Schaft
  IK.fill(ctx, (c) => c.rect(0, -w * 0.32, len - hl * 0.7, w * 0.64), IK.lin(ctx, 0, -w, 0, w, [[0, '#f0d8a8'], [0.5, '#a8784a'], [1, '#5a3a20']]), 0.6);
  // Federn hinten (oben hell, unten in der Farbe)
  for (const s of [-1, 1]) {
    IK.fill(ctx, (c) => { c.moveTo(0, 0); c.lineTo(-fl * 0.2, s * fw); c.lineTo(fl * 0.75, s * fw); c.lineTo(fl, 0); c.closePath(); },
      s < 0 ? '#f4f0e6' : (o.fletch || '#c8402f'), 0.6);
  }
  // Spitze
  const hc = o.head || '#e8eef4';
  const tipFn = () => IK.fill(ctx, (c) => { c.moveTo(len, 0); c.lineTo(len - hl, -hw); c.lineTo(len - hl * 0.72, 0); c.lineTo(len - hl, hw); c.closePath(); },
    IK.lin(ctx, len - hl, -hw, len, hw, [[0, '#ffffff'], [0.45, hc], [1, darker(hc, 0.45)]]), 0.7);
  if (o.glow) IK.glow(ctx, o.glow, 5, tipFn);
  else tipFn();
  ctx.restore();
}
// gespannter Bogen: Mitte (x,y), Höhe hh, Öffnung nach rechts (Winkel ang), Sehne zur Hand bei pull
function ikBow(ctx, IK, x, y, hh, ang, pull = 0, pal = ['#d8a868', '#8a5a2a', '#3a2010']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const top = [-3, -hh];
  const bot = [-3, hh];
  // Sehne
  ctx.strokeStyle = 'rgba(250,245,230,0.95)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(-3 - pull, 0);
  ctx.lineTo(bot[0], bot[1]);
  ctx.stroke();
  // Wurfarme (Reflexbogen): dicker Körper mit Verlauf
  IK.fill(ctx, (c) => {
    c.moveTo(top[0], top[1]);
    c.quadraticCurveTo(hh * 0.25, -hh * 0.85, hh * 0.32, -hh * 0.3);
    c.quadraticCurveTo(hh * 0.36, 0, hh * 0.32, hh * 0.3);
    c.quadraticCurveTo(hh * 0.25, hh * 0.85, bot[0], bot[1]);
    c.lineTo(bot[0] + 1.2, bot[1] - 0.6);
    c.quadraticCurveTo(hh * 0.2, hh * 0.7, hh * 0.22, hh * 0.25);
    c.quadraticCurveTo(hh * 0.25, 0, hh * 0.22, -hh * 0.25);
    c.quadraticCurveTo(hh * 0.2, -hh * 0.7, top[0] + 1.2, top[1] + 0.6);
    c.closePath();
  }, IK.lin(ctx, 0, -hh, hh * 0.4, hh, [[0, pal[0]], [0.55, pal[1]], [1, pal[2]]]), 0.9);
  // Griff mit goldener Wicklung
  IK.fill(ctx, (c) => c.rect(hh * 0.24, -2.4, 2.6, 4.8), IK.lin(ctx, 0, -2.4, 0, 2.4, [[0, '#fff1c8'], [0.5, '#c89a4a'], [1, '#6a4a1a']]), 0.6);
  ctx.restore();
}
// Feder: Fuß bei (x,y), Spitze in Richtung ang, Länge len
function ikFeather(ctx, IK, x, y, len, ang, pal = ['#ffffff', '#cfe8ff', '#5aa8e8']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  IK.fill(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(-len * 0.32, -len * 0.45, 0, -len); c.quadraticCurveTo(len * 0.32, -len * 0.45, 0, 0); c.closePath(); },
    IK.lin(ctx, -len * 0.3, 0, len * 0.3, -len, [[0, pal[2]], [0.5, pal[1]], [1, pal[0]]]), 0.6);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len * 0.95);
  ctx.stroke();
  ctx.restore();
}

// Falkenpfeil: schwerer Pfeil schräg nach oben rechts, goldene Windbögen und Federn um den Schaft
SKILL_ART.falkenpfeil = function (ctx, IK) {
  IK.light(ctx, 8, -8, 22, '#ffd98a', 0.6);
  // Windbögen quer um den Schaft
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [d, r, c] of [[-4, 7, 'rgba(255,214,120,0.95)'], [-11, 8.5, 'rgba(255,255,255,0.8)'], [3, 5.5, 'rgba(255,230,160,0.9)']]) {
    ctx.save();
    ctx.translate(d * 0.7071, -d * 0.7071);
    ctx.rotate(-Math.PI / 4);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.4, r, 0, -1.2, 2.6);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ikBowArrow(ctx, IK, -18, 18, 19, -19, { w: 2.6, head: '#ffe6a8', glow: '#ffd98a', fletch: '#ffc84a' });
  ikFeather(ctx, IK, -10, 4, 8, -2.4);
  ikFeather(ctx, IK, -3, 13, 7, -1.5, ['#fff6d8', '#ffe0a0', '#c89a4a']);
  IK.sparkles(ctx, 6, '#fff1c8', 17, 8, 13, -13, 1.4);
};
// Pfeilhagel: fünf Pfeile stürzen schräg vom Himmel, unten stecken schon welche im Boden
SKILL_ART.pfeilhagel = function (ctx, IK) {
  IK.light(ctx, -4, -16, 20, '#e0f6ff', 0.5);
  IK.fill(ctx, (c) => c.ellipse(2, 17, 20, 4.5, 0, 0, Math.PI * 2), IK.rad(ctx, 2, 17, 1, 20, [[0, 'rgba(150,130,100,0.9)'], [1, 'rgba(40,30,20,0)']]), 0);
  for (const [x, y] of [[-10, 18], [13, 17]]) ikBowArrow(ctx, IK, x - 4, y - 10, x, y, { w: 1.5, head: '#cfe6ff' });
  for (const [x, y] of [[-12, 0], [-2, 8], [8, -2], [16, 6], [3, -12]]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200,235,255,0.5)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 17);
    ctx.lineTo(x - 4.5, y - 8.5);
    ctx.stroke();
    ctx.restore();
    ikBowArrow(ctx, IK, x - 5, y - 9.5, x, y, { w: 1.7, head: '#eaf6ff', glow: '#9fe8ff', fletch: '#5ab8f0' });
  }
};
// Durchbohrender Schuss: waagrechter Pfeil, um den sich ein Windwirbel dreht, vorn heller Durchschlag
SKILL_ART.durchschuss = function (ctx, IK) {
  IK.light(ctx, 10, 0, 18, '#9ff0ff', 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 8;
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(140,230,255,0.9)';
    ctx.lineWidth = 2.2 - i * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, 0, 2.6 + i * 0.4, 8.5 - i * 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ikBowArrow(ctx, IK, -21, 0, 21, 0, { w: 2.4, head: '#e8fcff', glow: '#9ff0ff', fletch: '#5ab8f0' });
  IK.sparkles(ctx, 6, '#e8fcff', 23, 7, 16, 0, 1.3);
};
// Rückensprung: helle Gestalt im Salto nach hinten links, nach rechts fliegt ein Fächer aus drei Pfeilen
SKILL_ART.rueckensprung = function (ctx, IK) {
  IK.light(ctx, 6, -4, 20, '#b8f0c8', 0.5);
  IK.trail(ctx, -9, 2, 12, Math.PI * 0.05, Math.PI * 1.15, 3.2, '#e0ffe8', 18);
  IK.glow(ctx, '#5ac87a', 7, () => IK.figure(ctx, -9, 12, 21, '#f4fff6', -1.25));
  for (const a of [-0.42, 0, 0.42]) ikBowArrow(ctx, IK, -1 + Math.cos(a) * 3, -2 + Math.sin(a) * 3, 2 + Math.cos(a) * 20, -2 + Math.sin(a) * 20, { w: 1.9, head: '#e8fff0', fletch: '#5ac87a' });
  IK.fill(ctx, (c) => c.ellipse(-6, 20, 12, 2.5, 0, 0, Math.PI * 2), 'rgba(10,30,20,0.5)', 0);
};
// Falkenblick: Falkenauge mit goldener Iris zwischen zwei Schwingen
SKILL_ART.falkenblick = function (ctx, IK) {
  IK.light(ctx, 0, 0, 22, '#9fe8ff', 0.5);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ikFeather(ctx, IK, s * 7, 2, 12 - i * 1.5, s * (1.0 + i * 0.32));
  IK.glow(ctx, '#9fe8ff', 6, () => IK.fill(ctx, (c) => { c.moveTo(-13, 0); c.quadraticCurveTo(0, -11, 13, 0); c.quadraticCurveTo(0, 11, -13, 0); c.closePath(); },
    IK.rad(ctx, 0, 0, 1, 13, [[0, '#ffffff'], [1, '#d8f0ff']]), 1.2, 'rgba(10,30,60,0.95)'));
  IK.fill(ctx, (c) => c.arc(0, 0, 6.2, 0, Math.PI * 2), IK.rad(ctx, 0, 0, 0.5, 6.2, [[0, '#fff2b0'], [0.5, '#ffc23a'], [0.9, '#c86a10'], [1, '#3a1a06']]), 0.8);
  IK.fill(ctx, (c) => c.ellipse(0, 0, 1.4, 4.8, 0, 0, Math.PI * 2), '#0a0608', 0);
  IK.fill(ctx, (c) => c.arc(-2.2, -2.2, 1.3, 0, Math.PI * 2), '#ffffff', 0);
  IK.sparkles(ctx, 5, '#e0f6ff', 29, 19, 0, -2, 1.3);
};
// Sturm des Himmelsfalken: Geisterfalke stößt kopfüber herab (Flügel hoch im V, Schwanzfächer oben), darunter Pfeile
SKILL_ART.himmelsfalke = function (ctx, IK) {
  IK.light(ctx, 0, -2, 24, '#bfeaff', 0.6);
  for (const [x, y] of [[-15, 19], [-6, 21], [6, 21], [15, 19]]) ikBowArrow(ctx, IK, x - 3, y - 9, x, y, { w: 1.3, head: '#e8f8ff', glow: '#9fe8ff', fletch: '#5ab8f0' });
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    const wing = (c) => {
      c.moveTo(2.5, -2);
      c.quadraticCurveTo(9, -10, 21, -19);
      // gezackte Hinterkante: Schwungfedern
      c.lineTo(19, -13.5);
      c.lineTo(21.5, -12);
      c.lineTo(17.5, -8.5);
      c.lineTo(19.5, -6.5);
      c.lineTo(14.5, -4);
      c.lineTo(15.5, -1.5);
      c.lineTo(9, 0.5);
      c.quadraticCurveTo(5, 2, 3, 5);
      c.closePath();
    };
    IK.glow(ctx, '#9fe8ff', 6, () => IK.fill(ctx, wing, IK.lin(ctx, 3, 4, 20, -18, [[0, '#ffffff'], [0.45, '#d4f0ff'], [1, '#3a8ae0']]), 0.9, 'rgba(10,30,70,0.9)'));
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(3, -2.5);
    ctx.quadraticCurveTo(9, -10.5, 20.5, -18.6);
    ctx.stroke();
    ctx.restore();
  }
  // Schwanzfächer oben, Körper, Kopf mit Schnabel unten
  IK.fill(ctx, (c) => { c.moveTo(-2.5, -6); c.lineTo(-5.5, -15); c.quadraticCurveTo(0, -17.5, 5.5, -15); c.lineTo(2.5, -6); c.closePath(); },
    IK.lin(ctx, 0, -17, 0, -6, [[0, '#4a9ae8'], [1, '#e8f6ff']]), 0.9, 'rgba(10,30,70,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(0, -8); c.quadraticCurveTo(5, -2, 3.2, 6); c.quadraticCurveTo(0, 10, -3.2, 6); c.quadraticCurveTo(-5, -2, 0, -8); c.closePath(); },
    IK.lin(ctx, 0, -8, 0, 9, [[0, '#cfeeff'], [1, '#ffffff']]), 0.9, 'rgba(10,30,70,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(-1.8, 8); c.lineTo(0, 12.5); c.lineTo(1.8, 8); c.closePath(); }, '#ffc84a', 0.6);
  for (const ex of [-1.6, 1.6]) IK.fill(ctx, (c) => c.arc(ex, 5.5, 0.8, 0, Math.PI * 2), '#1a2a40', 0);
  IK.sparkles(ctx, 7, '#ffffff', 61, 20, 0, -4, 1.3);
};

// --- Bogenmacherin -------------------------------------------------------------------------------------------
// eigener Stand mit Bogenwand, Pfeilfass, Werkbank und Zielscheibe; Figur mit Bogen und Köcher
TRADERS.push('bogenmacher');
STAND_COLORS.bogenmacher = '#2f6a5a';
NPC3.bogenmacher = {
  skin: '#e8c29a', torso: '#2f5a4e', sleeve: '#3a6a5a', pants: '#3a3226', boots: '#3a2a1c', gloves: '#6b4a2e',
  hair: { style: 4, color: '#2a1a12' }, band: '#c9a35a', weapon: { kind: 'bow', tier: 3 }, quiver: '#6b4a2e', straps: '#6b4a2e', belt: '#5a4030', eyeShape: 2
};
NPC_ART.bogenmacher = (ctx) => villagerArt(ctx, {
  skin: '#e8c29a', pants: '#3a3226', boots: '#3a2a1c', torso: '#2f5a4e', sleeve: '#3a6a5a', gloves: '#6b4a2e', eyes: { blush: true },
  behind: (ctx) => { box(ctx, 9, -42, 5, 20, 1.5, '#6b4a2e'); for (const x of [10, 12]) stroke(ctx, '#e8e0cc', 0.8, [[x, -42], [x, -46]]); dot(ctx, 11, -46.5, 1.2, 1.2, '#9fe8ff'); },
  body: (ctx, half) => { stroke(ctx, '#6b4a2e', 1.4, [[half - 2, -23], [-half + 2, -11]]); box(ctx, -half, -12.5, half * 2, 2.6, 1, '#c9a35a'); },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#2a1a12', 0);
    box(ctx, cx + 8, cy - 4, 3.4, 14, 1.5, '#2a1a12');
    box(ctx, cx - 10, cy - 7, 20, 2.4, 1, '#c9a35a');
    // Feder im Haar
    poly(ctx, [[cx - 8, cy - 8], [cx - 15, cy - 20], [cx - 11, cy - 7]], '#e8f4ff');
    stroke(ctx, '#5aa8e8', 0.7, [[cx - 8.5, cy - 8], [cx - 13.5, cy - 18]]);
  },
  extra: (ctx) => heldWeapon(ctx, 'bow', -13, -12, -1.57, 3)
});
NPC_ICONS.bogenmacher = (ctx) => npcBadge(ctx, '#2a5a52', (c) => {
  badgeArc(c, '#d8a868', 2, 8, -Math.PI * 0.42, Math.PI * 0.42, -3, 0);
  stroke(c, '#f4ead0', 0.8, [[-3 + 8 * Math.cos(Math.PI * 0.42), -8 * Math.sin(Math.PI * 0.42)], [-3 + 8 * Math.cos(Math.PI * 0.42), 8 * Math.sin(Math.PI * 0.42)]]);
  for (const dy of [-2.6, 0, 2.6]) {
    stroke(c, '#e8e0d0', 1, [[-6, dy * 0.5], [7, dy]]);
    poly(c, [[9, dy * 1.08], [5.8, dy - 1.6], [5.8, dy + 1.6]], '#9fe8ff');
  }
  poly(c, [[-6, 0], [-8.4, -2.2], [-7, 0], [-8.4, 2.2]], '#e8f4ff');
});
STAND3.bogenmacher = function (b, M) {
  stFrame3(b, M, { awning: ['#2f6a5a', '#efe0b8'], counter: false, sign: '#9fe8ff' });
  // Rückwand mit drei Bögen (Holz, dunkel, Gold) und zwei Köchern
  b.add(tinyBox(2.1, 1.5, 0.04), darker(ST3.wood, 0.2), { parent: M, p: [0, 0.85, -0.5] });
  [['#b07a40', -0.62], ['#4a3a30', 0], ['#d8b060', 0.62]].forEach(([c, x], k) => {
    b.add(torus3(0.48, 0.028, Math.PI * 0.82, 4, 14), c, { parent: M, p: [x + 0.12, 1.15, -0.44], r: [0, 0, Math.PI * 0.59], shine: k === 2 ? 1 : 0.4 });
    b.add(limb3(0.92, 0.006, 0.006, 4), '#efe6cc', { parent: M, p: [x - 0.03, 1.61, -0.43] });
    b.add(wbox(0.06, 0.14, 0.06, 0.02), '#3a2618', { parent: M, p: [x + 0.4, 1.15, -0.43] });
  });
  for (const sx of [-1, 1]) {
    b.add(cyl3(0.08, 0.07, 0.42, 10), '#6b4a2e', { parent: M, p: [sx * 1.0, 1.3, -0.42], r: [0, 0, sx * 0.15] });
    for (let k = 0; k < 3; k++) b.add(horn3(0.1, 0.025, 4), k % 2 ? '#9fe8ff' : '#e8e0d0', { parent: M, p: [sx * 1.0 + (k - 1) * 0.035 - sx * 0.03, 1.56, -0.42] });
  }
  // Werkbank in der Mitte: Bogenstab im Bau, Federbündel, Messer
  b.add(wbox(1.0, 0.06, 0.42, 0.02), ST3.woodL, { parent: M, p: [0, 0.62, 0.22] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(wbox(0.06, 0.58, 0.06, 0.02), ST3.woodD, { parent: M, p: [sx * 0.44, 0.31, 0.22 + sz * 0.16] });
  b.add(torus3(0.45, 0.022, Math.PI * 0.7, 4, 12), '#c89a62', { parent: M, p: [0, 0.66, 0.06], r: [Math.PI / 2, 0, Math.PI * 0.15] });
  for (let k = 0; k < 5; k++) b.add(ball(8), k % 2 ? '#e8f4ff' : '#c8402f', { parent: M, p: [0.3 + (k % 3) * 0.04, 0.68, 0.3 + k * 0.02], s: [0.08, 0.012, 0.03], r: [0, k * 0.5, 0] });
  b.add(wbox(0.2, 0.012, 0.03, 0.005), ST3.steel, { parent: M, p: [-0.25, 0.66, 0.32], r: [0, 0.4, 0], shine: 1 });
  // Fass voller Pfeile vorn links
  stBarrel3(b, M, -1.0, 0.25, 0.85);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4;
    const rr = 0.04 + (k % 3) * 0.045;
    const x = -1.0 + Math.cos(a) * rr;
    const z = 0.25 + Math.sin(a) * rr;
    const tilt = [Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1];
    b.add(limb3(0.7, 0.009, 0.009, 4), '#b08c5c', { parent: M, p: [x, 1.18, z], r: tilt });
    b.add(ball(6), k % 3 === 0 ? '#9fe8ff' : k % 3 === 1 ? '#c8402f' : '#efe6cc', { parent: M, p: [x, 1.12, z], s: [0.012, 0.06, 0.035], r: [0, a, 0] });
  }
  // Zielscheibe vorn rechts mit zwei Pfeilen
  b.add(wbox(0.08, 0.95, 0.08, 0.03), ST3.woodD, { parent: M, p: [1.0, 0.48, 0.18] });
  for (const [r, c, z] of [[0.34, '#efe0b8', 0], [0.25, '#2f6a5a', 0.01], [0.15, '#efe0b8', 0.02], [0.07, '#c8402f', 0.03]]) b.add(cyl3(r, r, 0.06, 16), c, { parent: M, p: [1.0, 0.95, 0.26 + z], r: [Math.PI / 2, 0, 0] });
  for (const [dx, dy] of [[0.04, 0.03], [-0.1, -0.08]]) {
    b.add(limb3(0.32, 0.01, 0.01, 4), '#b08c5c', { parent: M, p: [1.0 + dx, 0.95 + dy, 0.6], r: [-Math.PI / 2, 0, 0] });
    b.add(ball(6), '#9fe8ff', { parent: M, p: [1.0 + dx, 0.95 + dy, 0.56], s: [0.012, 0.035, 0.05] });
  }
};

// Händlerfenster (ausruestung.js renderMerchant, MERCHANTS.bogenmacher.arrows): Pfeile je Sorte, ein oder fünf Bündel
function bowArrowShopHtml() {
  const p = game.player;
  if (p.classId !== 'ninja') {
    return `<section class="merchant-group"><h3>Pfeile <small>· Munition für den Bogen</small></h3><p class="hint-text">Bögen und Pfeile führt nur der Ninja (Weg des Falken). Für deine Klasse hat die Bogenmacherin nichts im Angebot – verkaufen kannst du hier trotzdem.</p></section>`;
  }
  const cur = bowArrowSort(p);
  const rows = ARROW_TYPES.map((a, i) => {
    const tooLow = p.level < a.level;
    const have = bowArrowCount(p, i);
    const buy = (n) => `<button type="button" class="mini-btn${n > 1 ? '' : ' primary'}" data-buy-arrow="${i}:${n}" ${tooLow || p.gold < a.price * n ? 'disabled' : ''}>${n} × ${ARROW_BUNDLE} · ${(a.price * n).toLocaleString('de-DE')} Gold</button>`;
    return `<div class="merchant-item${tooLow ? ' locked' : ''}">` +
      `<img src="${arrowIconUrl(i)}" alt="">` +
      `<div class="mi-info"><strong style="color:${a.color}">${a.name}</strong>` +
      `<small class="${tooLow ? 'need' : ''}">ab Stufe ${a.level}${have ? ` · du hast ${have.toLocaleString('de-DE')}` : ''}${cur === i ? ' · wird geschossen' : ''}</small>` +
      `<span class="mi-stats"><span class="up">+${Math.round(a.dmg * 100)} % Schaden je Bogenschuss</span></span></div>` +
      `<div class="mi-buy">${buy(1)}${buy(5)}</div></div>`;
  }).join('');
  return `<section class="merchant-group"><h3>Pfeile <small>· jeder Bogenschuss verbraucht einen; geschossen wird die beste Sorte, die du benutzen darfst</small></h3><div class="merchant-list">${rows}</div></section>`;
}
function bowArrowShopWire(body, rerender) {
  body.querySelectorAll('[data-buy-arrow]').forEach((btn) => btn.addEventListener('click', () => {
    const [i, n] = btn.dataset.buyArrow.split(':').map(Number);
    const r = buyArrows(i, n);
    rerender();
    gear.message(r.text, r.ok ? 'success' : 'warn');
  }));
}

// --- Umstieg: Ninjas auf dem bisherigen Weg des Schattens (Index 1) bekommen einmalig einen Bogen ---------------
// Ein Bogen der Stufe ihrer Waffe (+0) und ein Köcher passender Stufe werden angelegt, die Dolche kommen in die Tasche,
// dazu ein Bündel der besten Pfeile für ihre Stufe. Neue Figuren auf dem Weg des Falken bekommen dasselbe zum Start.
function bowPathMigrate(p) {
  if (!p || p.classId !== 'ninja' || (p.path || 0) !== 1 || p.bowPathGift) return;
  const fresh = (p.level || 1) <= 1 && !(p.xp > 0);
  const eq = p.equipment || {};
  const isBow = (it) => it && it.slot === 'waffe' && it.kind === 'bow';
  const ownsBow = isBow(eq.waffe) || p.inventory.some(isBow) || !!(p.storage && p.storage.items && p.storage.items.some(isBow));
  let gift = '';
  if (!ownsBow) {
    const tierByLevel = ITEM_TIERS.reduce((best, t, i) => (p.level >= t.level && i <= 3 ? i : best), 0);
    const tier = eq.waffe && Number.isInteger(eq.waffe.tier) ? eq.waffe.tier : tierByLevel;
    const bow = makeItem('waffe', tier, 0, 'ninja', 'bow');
    if (typeof merchantRarity === 'function') applyRarity(bow, merchantRarity(Math.min(3, tier)));
    // was abgelegt wird, muss in die Tasche passen (Dolche, Nebenhand); sonst kommt der Bogen nur in die Tasche
    const off = [eq.waffe, eq.schild && !isQuiver(eq.schild) ? eq.schild : null].filter(Boolean);
    const free = BAG_SIZE - p.inventory.length;
    if (free >= off.length) {
      for (const it of off) p.inventory.push(it);
      eq.waffe = bow;
      if (eq.schild && !isQuiver(eq.schild)) eq.schild = null;
      if (!eq.schild) {
        const qi = bestQuiverIndex(p);
        eq.schild = qi >= 0 ? p.inventory.splice(qi, 1)[0] : makeItem('koecher', Math.min(tier, ITEM_TIERS.length - 1), 0, 'ninja');
      }
      p.quiverGiven = true;
      gift = `${itemName(bow)} angelegt`;
    } else if (free >= 1) {
      p.inventory.push(bow);
      gift = `${itemName(bow)} liegt in deiner Tasche`;
    } else {
      // Tasche voll: beim nächsten Start noch einmal versuchen
      setTimeout(() => { if (typeof ui !== 'undefined') ui.log('Weg des Falken: Deine Tasche ist voll – mach Platz, dann bekommst du beim nächsten Start einen Bogen geschenkt.', 'warn'); }, 2000);
      return;
    }
  }
  p.bowPathGift = 1;
  if (!p.arrows || typeof p.arrows !== 'object') p.arrows = {};
  let best = 0;
  ARROW_TYPES.forEach((a, i) => { if (p.level >= a.level) best = i; });
  p.arrows[best] = bowArrowCount(p, best) + ARROW_BUNDLE;
  const arrowsText = `${ARROW_BUNDLE} ${ARROW_TYPES[best].name}`;
  setTimeout(() => {
    if (typeof ui === 'undefined') return;
    if (fresh) {
      ui.log(`Weg des Falken: Deine Fertigkeiten brauchen einen Bogen. Geschenk zum Start: ${gift ? gift + ', ' : ''}${arrowsText}. Pfeile, Bögen und Köcher verkauft die Bogenmacherin.`, 'level');
    } else {
      ui.banner('Weg des Falken', 'Der Weg des Schattens ist jetzt ein Bogen-Weg');
      ui.log(`Neu: Der Weg des Schattens ist zum Weg des Falken geworden – Fernkampf mit Pfeil und Bogen, neue Fertigkeiten, deine Stufen bleiben. ` +
        `Geschenk: ${gift ? gift + ' (deine Dolche liegen in der Tasche), ' : ''}${arrowsText}. Pfeile, Bögen und Köcher verkauft die Bogenmacherin neben dem Waffenhändler.`, 'level');
    }
    if (typeof saveGame === 'function') saveGame();
  }, 1800);
}
