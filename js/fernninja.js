// Fern-Ninja (seit 13.57): Der zweite Weg des Ninjas ist jetzt der Weg des Falken – Fernkampf mit Pfeil und Bogen.
// Hier steht alles, was dazugehört:
//  - Pfeile als Munition (ARROW_TYPES in gegenstaende.js): jeder Bogenschuss verbraucht einen Pfeil der besten Sorte,
//    die man hat und schon benutzen darf; seit 13.67 schießt der Bogen ohne Pfeile gar nicht (keine Übungspfeile mehr)
//  - die fünf Fertigkeiten (SKILL_TYPES, Mitspieler über MAGE2_REMOTE) und die Ultimative Attacke „Sturm des Himmelsfalken“;
//    seit 13.67 ist Platz 5 der Schattenschritt, der Falkenblick ist der Klassensegen (klassensegen.js) mit gefiederten
//    Schattenschwingen und dunkler Aura (bowWings3); Pfeil auf der Sehne beim Ziehen (bowNock3, Sehne: drei-figuren.js)
//  - Pfeile als echte 3D-Körper (Schaft, Spitze, Federn, Leuchtspur) und die 3D-Effekte (FX3_DRAW) samt 2D-Ersatz
//  - Symbole (SKILL_ART), Posen (SKILL_POSE3), Werte im Fertigkeitsfenster
//  - die Bogenmacherin (Händlerin für Bögen, Köcher und Pfeile) mit Figur, Stand und Plakette
//  - einmaliges Geschenk für Ninjas, die schon auf dem Weg des Schattens waren (Bogen, Köcher, Pfeile)
// Farben des Weges: seit 13.67 düstere Schattenmagie – schwarzvioletter Rauch, violetter Schein, dunkle Federn
// (vorher Himmelblau und Weiß mit Gold). Die Farbe der Pfeilsorte bleibt als Akzent an Spitze und Federn.

const BOW3 = { sky: '#9fe8ff', sky2: '#5ab8f0', white: '#f4fbff', gold: '#ffd98a', wood: '#7a5634', feather: '#f2ede2',
  // seit 13.67 Schattenmagie: schwarzviolett mit violettem Schein
  shadow: '#2a1838', smoke: '#120a1a', violet: '#8a4ae8', violet2: '#c49aff', dark: '#06030a' };

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
// seit 13.67: Pfeile sind echte Munition – ohne Pfeile schießt der Bogen gar nicht mehr (vorher Übungspfeile ohne Bonus).
// Alle Sorten, die die Figur schon benutzen darf, zusammengezählt
function bowArrowUsable(p) {
  if (!p || !p.arrows) return 0;
  let n = 0;
  for (let i = 0; i < ARROW_TYPES.length; i++) if (p.level >= ARROW_TYPES[i].level) n += bowArrowCount(p, i);
  return n;
}
const BOW_NO_ARROWS = 'Keine Pfeile – kaufe Pfeile bei der Bogenmacherin';
// Reichen die Pfeile für einen Schuss mit n Pfeilen? Sonst Hinweis (über der Figur höchstens alle 1,5 s, im Protokoll
// einmal, bis wieder Pfeile da sind) und der Pfeilzähler blinkt rot
function bowCanShoot(p, n = 1) {
  if (!p || p.classId !== 'ninja') return true;
  const have = bowArrowUsable(p);
  if (have >= Math.max(1, n)) return true;
  if (p === game.player) {
    if (!(p._arrowTextAt > game.time - 1.5)) {
      p._arrowTextAt = game.time;
      addText(p.x, p.y - 48, have > 0 ? `Zu wenig Pfeile (${n} nötig)` : 'Keine Pfeile!', 'info');
    }
    if (!p._arrowHint) {
      p._arrowHint = true;
      if (typeof ui !== 'undefined') ui.log(have > 0 ? `Für diesen Schuss brauchst du ${n} Pfeile, du hast nur noch ${have}. Neue Pfeile verkauft die Bogenmacherin neben dem Waffenhändler.` : BOW_NO_ARROWS + ' (neben dem Waffenhändler in jeder Stadt).', 'warn');
    }
    bowHudFlash = game.time;
    bowHudDirty = true;
  }
  return false;
}
// Ein Schuss: verbraucht n Pfeile, zuerst von der besten Sorte (sie bestimmt Bonus und Farbe), reicht sie nicht, von der
// nächstbesseren. Ohne genug Pfeile: null (dann fliegt nichts – die Aufrufer prüfen vorher bowCanShoot).
function bowArrowShot(p, n = 1) {
  if (!p || p.classId !== 'ninja') return null;
  const i = bowArrowSort(p);
  if (i < 0 || bowArrowUsable(p) < Math.max(1, n)) return null;
  p._arrowHint = false;
  let left = Math.max(1, n);
  for (let k = i; k >= 0 && left > 0; k--) {
    if (p.level < ARROW_TYPES[k].level) continue;
    const have = bowArrowCount(p, k);
    const take = Math.min(have, left);
    if (!take) continue;
    left -= take;
    if (have - take > 0) p.arrows[k] = have - take;
    else delete p.arrows[k];
  }
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
  return `<b style="color:${a.color}">${a.name} × ${bowArrowCount(p, x.arrow).toLocaleString('de-DE')}</b><br>Munition für den Bogen · ab Stufe ${a.level}<br>` +
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
    `<small class="hint-text">Ohne Pfeile schießt der Bogen nicht. Neue Pfeile verkauft die Bogenmacherin neben dem Waffenhändler.</small></div></div>`;
}

// Anzeige im Fensterkopf (neben Gold und Splittern) und am Angriffsknopf: aktive Sorte und Anzahl.
// seit 13.67: ohne Pfeile rot mit 0 (blinkt, wenn man trotzdem schießen will); offene Vorratskacheln im Inventar
// zählen live mit, die Kachel der Sorte, die gerade geschossen wird, ist hervorgehoben
let bowHudDirty = true;
let bowHudKey = '';
let bowHudFlash = -99;
function bowHudTick() {
  const p = typeof game !== 'undefined' ? game.player : null;
  const show = !!(p && game.running && typeof quiverMode === 'function' && quiverMode(p));
  const i = show ? bowArrowSort(p) : -1;
  const n = i >= 0 ? bowArrowCount(p, i) : 0;
  const flash = show && game.time - bowHudFlash < 1.2;
  const key = show + ':' + i + ':' + n + ':' + flash + ':' + (p ? JSON.stringify(p.arrows || {}) : '');
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
  const none = i < 0;
  const txt = none ? '0' : n.toLocaleString('de-DE');
  const col = none ? '#ff4a3a' : ARROW_TYPES[i].color;
  const title = none ? BOW_NO_ARROWS : `${ARROW_TYPES[i].name}: ${n.toLocaleString('de-DE')} (+${Math.round(ARROW_TYPES[i].dmg * 100)} % Schaden)`;
  if (chip) {
    chip.hidden = !show;
    chip.title = title;
    chip.innerHTML = `Pfeile <b style="color:${col}">${txt}</b>`;
    chip.style.background = none ? (flash ? 'rgba(200,30,20,0.85)' : 'rgba(120,20,16,0.55)') : '';
    chip.style.borderRadius = '6px';
    chip.style.padding = none ? '0 4px' : '';
  }
  if (badge) {
    badge.hidden = !show;
    badge.title = title;
    badge.style.color = none ? '#ffffff' : col;
    badge.style.background = none ? (flash ? '#e02a1a' : 'rgba(150,20,14,0.92)') : 'rgba(10,16,24,0.85)';
    badge.style.borderColor = none ? '#ff8a7a' : '#6a7a8a';
    badge.textContent = '➶ ' + (none ? '0' : n > 9999 ? Math.floor(n / 1000) + 'k' : n);
  }
  for (const el of document.querySelectorAll('.quiver-ammo')) {
    const u = p ? bowArrowUsable(p) : 0;
    el.textContent = u > 9999 ? Math.floor(u / 1000) + 'k' : String(u);
    el.style.color = i >= 0 ? ARROW_TYPES[i].color : '#ff4a3a';
  }
  // offene Inventarkacheln (Vorräte) nachziehen: Zahl, Hervorhebung der aktiven Sorte, leere Sorte ausblenden
  for (const el of document.querySelectorAll('.sup-tile[data-sup^="arrow"]')) {
    const k = +el.dataset.sup.slice(5);
    const c = p ? bowArrowCount(p, k) : 0;
    const cnt = el.querySelector('.item-count');
    if (cnt) cnt.textContent = c > 9999 ? Math.floor(c / 1000) + 'k' : String(c);
    el.style.opacity = c > 0 ? '' : '0.35';
    el.style.outline = k === i ? '2px solid ' + ARROW_TYPES[k].color : '';
    el.style.outlineOffset = k === i ? '-2px' : '';
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
  particles(b.x + f.x * 16, b.y + f.y * 10, { count: 8, color: ['#1a0e28', '#5a2aa8', '#b48cff'], angle: Math.atan2(f.y, f.x), spread: 0.5, speed: [60, 160], life: [0.12, 0.25], size: [1.2, 2.2], shape: 'spark', drag: 5 });
  addEffect({ type: 'bmuzzle3', follow: p, ox: 0, oy: 0, color: BOW3.violet, dur: 0.45 });
}

// Grundangriff mit dem Bogen (seit 13.67, kampf.js basicTick): kleiner dunkler Schattenblitz am Bogen
function bowBasicFx(p) {
  addEffect({ type: 'bmuzzle3', follow: p, ox: 0, oy: 0, color: BOW3.violet, dur: 0.35 });
}
// Falkenpfeil: kurz ziehen, dann ein schwerer Pfeil mit Federwirbel
SKILL_TYPES.bshot = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.range);
  const ar = bowArrowShot(p, sk.arrows);
  if (!ar) return false;
  if (t) faceTowards(t.x, t.y);
  const mul = sk.dmg * pw * ar.mul;
  const col = ar.color;
  // stehen bleiben und zum Ziel schauen bis kurz nach dem Schuss; das Laufziel bleibt (geht danach weiter)
  lockPlayer(p, 0.26);
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
  addEffect({ type: 'bmuzzle3', follow: rp, ox: 0, oy: 0, color: BOW3.violet, dur: 0.45 });
});

// Pfeilhagel: drei Pfeile steil in den Himmel, dann regnet es am gewählten Ort in Wellen Pfeile
SKILL_TYPES.brain = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  const ar = bowArrowShot(p, sk.arrows);
  if (!ar) return false;
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.36);
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const seed = Math.floor(Math.random() * 1000);
  rainFx(p, x, y, sk, seed, true, pw * (ar ? ar.mul : 1), ar ? ar.color : sk.color);
  later(0.24, () => { if (typeof snd !== 'undefined') snd.shot(p, { style: 'arrow' }); });
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
      particles(x, fy - 4, { count: 10, color: ['#1a0e28', '#3a2058', '#8a5ae0'], angle: -Math.PI / 2, spread: 1.4, speed: [40, 110], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', drag: 3, glow: false, gravity: 300 });
      if (!local) return;
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, vfxColor: '#b48cff' });
    });
  }
}
MAGE2_REMOTE.brain = (rp, sk, d) => rainFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, d.sd || 1, false, 0, d.c);

// Durchbohrender Schuss: ein Pfeil, der alles in einer Linie durchschlägt; der Wind dreht sich als Spirale darum
SKILL_TYPES.bpierce = function (sk, pw) {
  const p = game.player;
  const t = pickTarget(sk.range);
  const ar = bowArrowShot(p, sk.arrows);
  if (!ar) return false;
  if (t) faceTowards(t.x, t.y);
  const mul = sk.dmg * pw * ar.mul;
  const col = ar.color;
  lockPlayer(p, 0.26);
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
  if (!bowCanShoot(p, sk.arrows)) return false;
  const t = pickTarget(sk.aimRange || sk.range);
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
  if (!ar) return false;
  const mul = sk.dmg * pw * ar.mul;
  const col = ar.color;
  const x0 = p.x;
  const y0 = p.y;
  const now = game.time;
  p.dash = { lock: true, until: now + sk.air + 0.06, rank: fxRank };
  p.leap = { start: now, dur: sk.air, h: 30 };
  input.walkTo = null;
  addEffect({ type: 'bleap3', x: x0, y: feetY(p), bx: back.x, by: back.y, reach, color: sk.color, dur: 1.0 });
  particles(x0, feetY(p), { count: 12, color: ['#120a1a', '#2a1840', '#6a3ab0'], speed: [40, 120], life: [0.3, 0.6], size: [2, 4], shape: 'square', drag: 3, glow: false });
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
    addEffect({ type: 'smoke3', x: p.x, y: feetY(p), count: 4, color: '#120a1a', size: 0.5, dur: 0.5 });
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

// Schattenschritt (seit 13.67, Platz 5 statt Falkenblick): Ort wählen (Zielkreis), in Schattenrauch zerfallen,
// kurz unsichtbar und am Ziel mit einer Schattenexplosion wieder auftauchen. Wände, Wasser und Dörfer halten auf
// (wie beim Elementsprung). Am Ziel leichter Schaden und Verlangsamung – vor allem ist es ein Fluchtschritt.
SKILL_TYPES.bshadow = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  const dx = pt.x - p.x;
  const dy = pt.y - p.y;
  const dl = Math.hypot(dx, dy);
  const dir = dl > 4 ? { x: dx / dl, y: dy / dl } : { ...p.facing };
  const len = shiftReach(p, dir, Math.min(sk.range, Math.max(dl, 40)));
  if (len < 24) {
    addText(p.x, p.y - 34, 'Kein Platz', 'info');
    return false;
  }
  const a = { x: p.x, y: p.y };
  const b = { x: p.x + dir.x * len, y: p.y + dir.y * len };
  faceTowards(b.x, b.y);
  lockPlayer(p, sk.hide + 0.12);
  input.walkTo = null;
  p.blinkHide = game.time + sk.hide;
  const ret = { x0: Math.round(a.x), y0: Math.round(a.y), x1: Math.round(b.x), y1: Math.round(b.y) };
  // vor dem Ortswechsel senden, damit Mitspieler die Figur nicht über den Bildschirm gleiten sehen
  netSkillFx(sk.id, 160, { ...ret, rk: fxRank >= 0 ? fxRank : undefined, pre: 1 });
  later(sk.hide * 0.5, () => {
    if (p.dead) return;
    p.x = b.x;
    p.y = b.y;
  });
  shadowStepFx(p, a, b, sk, true, pw);
  return { ...ret, skipNet: true };
};
function shadowStepFx(owner, a, b, sk, local, pw) {
  addEffect({ type: 'bshadow3', x: b.x, y: b.y + 9, x0: a.x, y0: a.y + 9, hide: sk.hide, R: sk.radius, dur: sk.hide + 0.9, seed: Math.random() * 9 });
  particles(a.x, a.y - 10, { count: 16, color: ['#0a0610', '#2a1640', '#5a2aa8'], speed: [40, 140], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
  later(sk.hide, () => {
    particles(b.x, b.y - 10, { count: 18, color: ['#0a0610', '#2a1640', '#8a5ae0'], speed: [60, 180], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
    if (owner === game.player) shakeScreen(2);
    if (!local || owner.dead) return;
    for (const m of enemiesInCircle(b.x, b.y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, vfxColor: '#b48cff' });
  });
}
MAGE2_REMOTE.bshadow = (rp, sk, d) => {
  if (!isFinite(d.x1) || !isFinite(d.y1)) return;
  shadowStepFx(rp, { x: d.x0 ?? rp.x, y: d.y0 ?? rp.y }, { x: d.x1, y: d.y1 }, sk, false, 0);
  rp.blinkHide = game.time + sk.hide;
  rp.glideHold = { x: d.x1, y: d.y1, until: game.time + 0.8 };
  later(sk.hide * 0.5, () => {
    rp.x = rp.tx = d.x1;
    rp.y = rp.ty = d.y1;
  });
};

// Treffer der Bogen-Fertigkeiten (seit 13.67 düster): dunkle Federn und Schattenfetzen stieben, violetter Schein.
// Falkenblick ist seit 13.67 der Klassensegen des Bogen-Ninjas (segen_falke, klassensegen.js) – die alte Buff-Kennung
// behält dieselbe Aura, damit Mitspieler mit älterem Stand nichts Kaputtes sehen
const BOW_HITC = '#b48cff';
Object.assign(SKILL_FX, {
  falkenpfeil: {
    color: BOW_HITC,
    hit(m, crit) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: BOW_HITC, big: true, dur: 0.75, seed: Math.random() * 9 });
      particles(c.x, c.y, { count: crit ? 18 : 10, color: ['#1a0e28', '#5a2aa8', BOW_HITC], speed: [80, 220], life: [0.2, 0.45], size: [1.5, 3], shape: 'spark', drag: 5 });
    }
  },
  pfeilhagel: { color: '#9a7ad8' },
  durchschuss: {
    color: '#a070f0',
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: '#a070f0', dur: 0.55, seed: Math.random() * 9 });
    }
  },
  rueckensprung: {
    color: '#9a6ae0',
    hit(m) {
      addEffect({ type: 'bhit3', x: m.x, y: feetY(m), color: '#9a6ae0', dur: 0.5, seed: Math.random() * 9 });
    }
  },
  schattenwechsel: { color: '#8a5ae0' },
  falkenblick: {
    color: '#8a5ae0',
    weaponGlow: '#4a1a90',
    cast(p) {
      addEffect({ type: 'beye3', follow: p, ox: 0, oy: 0, dur: 1.4, color: '#8a4ae8' });
      flashScreen('#2a1040', 0.15);
    },
    aura: { every: 0.16, color: ['#1a0e28', '#5a2aa8', '#b48cff'], shape: 'spark', up: true, size: [1.2, 2.4] },
    aura3: bowWings3
  },
  // Klassensegen Falkenblick: Schwingen und Schattenaura, der Bogen glimmt violett
  segen_falke: { color: '#8a5ae0', weaponGlow: '#4a1a90', aura3: bowWings3 }
});
// eigene Klänge: Schatten (seit 13.67, vorher Wind)
Object.assign(SKILL_SND, { falkenpfeil: 'schatten', pfeilhagel: 'schatten', durchschuss: 'schatten', rueckensprung: 'schatten', falkenblick: 'schatten', schattenwechsel: 'schatten' });

// Werte im Fertigkeitsfenster (oberflaeche.js skillStats)
function bowSkillStats(sk, lvl, out) {
  if (!sk || !sk.type || !['bshot', 'brain', 'bpierce', 'bleap', 'bshadow'].includes(sk.type)) return;
  if (sk.type === 'bshadow') {
    out.push(['Schritt', 'bis ' + sk.range], ['Unsichtbar', numDe(sk.hide) + ' s'], ['Fläche', 'r ' + sk.radius],
      ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
    return;
  }
  const dmg = (v) => skillHitNum(v, lvl);
  if (sk.type === 'bshot') out.push(['Reichweite', String(sk.range)], ['Stößt zurück', '']);
  if (sk.type === 'brain') out.push(['Wellen', `${sk.waves} × ${dmg(sk.dmg)}`], ['Fläche', 'r ' + sk.radius], ['Reichweite', String(sk.range)],
    ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
  if (sk.type === 'bpierce') out.push(['Durchbohrt', ''], ['Linie', String(sk.range)]);
  if (sk.type === 'bleap') out.push(['Pfeile', `${sk.count} × ${dmg(sk.dmg)}`], ['Flugweite', String(sk.range)], ['Sprung', String(sk.distance) + ' zurück'],
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
  // seit 13.67: sechs Pfeile nötig (ohne kein Sturm, keine Abklingzeit); Reichweite 560 statt 380 wie alle Bogenschüsse
  if (!bowCanShoot(p, 6)) return false;
  const t = pickTarget(560);
  const tx = t ? t.x : p.x + p.facing.x * 220;
  const ty = t ? t.y : p.y + p.facing.y * 220;
  faceTowards(tx, ty);
  const ar = bowArrowShot(p, 6);
  if (!ar) return false;
  pw *= ar.mul;
  p.ultAt = { x: tx, y: ty };
  const seed = Math.floor(Math.random() * 1000);
  ultFalconFx(p.x, p.y, tx, ty, seed, u.color);
  later(0.05, () => { if (typeof snd !== 'undefined') snd.shot(p, { style: 'arrow' }); });
  // Sturzflug
  later(ULT_FALCON.dive, () => {
    if (p.dead) return;
    shakeScreen(11);
    flashScreen('#1a0830', 0.3);
    hitStop(0.1);
    ultHitCircle(tx, ty, ULT_FALCON.R, 4.5 * pw, { stun: 2, knockback: 110, vfxColor: '#b48cff' });
  });
  // Pfeilsturm: zwölf Pfeile auf zufällige Stellen im Kreis (gleiche Stellen wie im Bild)
  for (const s of ultStormShots(seed, tx, ty)) {
    later(s.at + 0.2, () => {
      if (p.dead) return;
      shakeScreen(1.2);
      for (const m of enemiesInCircle(s.x, s.y, 60)) hitMonster(m, 0.9 * pw, { heavy: false, vfxColor: '#b48cff' });
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
  addEffect({ type: 'bult3', x, y: y + 9, ox, oy: oy + 9, seed, shots, color: color || '#8a5ae0', dur: ULT_FALCON.storm0 + ULT_FALCON.n * ULT_FALCON.stormEvery + 1.4 });
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
  ultFalconFx(ox, oy, x, y, Math.floor(Math.random() * 1000), '#8a5ae0');
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

// Länge eines fliegenden Pfeils in Einheiten (seit 13.67 0,5 statt 0,85: so lang wie ein Arm der Figur, kein Speer)
const BOW_ARROW_LEN = 0.5;
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
// seit 13.67 dunkel: Schattenfalke, Federn und Auge in Schwarzviolett mit violettem Rand (normal gemischt, damit sie
// auch auf hellem Gras dunkel bleiben); dfeather/dcovert sind die Federn der Falkenblick-Schwingen
function bowTex(kind) {
  if (BOW_TEX[kind]) return BOW_TEX[kind];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (kind === 'wing') {
    // Flügel von oben: links Ansatz, rechts Spitze; Vorderkante unten, Schwungfedern nach oben gespreizt
    c.width = 256;
    c.height = 128;
    const fill = g.createLinearGradient(0, 0, 256, 0);
    fill.addColorStop(0, 'rgba(20,12,30,0.98)');
    fill.addColorStop(0.4, 'rgba(34,18,52,0.96)');
    fill.addColorStop(0.8, 'rgba(56,28,96,0.92)');
    fill.addColorStop(1, 'rgba(110,60,200,0.85)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(0, 122);
    g.bezierCurveTo(70, 118, 150, 104, 210, 86);
    g.lineTo(252, 70);
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
    g.strokeStyle = 'rgba(170,120,255,0.55)';
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
    g.fillStyle = 'rgba(70,40,110,0.6)';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(30 + i * 30, 100 - i * 3, 22, 9, -0.15, 0, Math.PI * 2);
      g.fill();
    }
    // violette Vorderkante
    g.strokeStyle = 'rgba(180,130,255,0.9)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 120);
    g.bezierCurveTo(70, 116, 150, 102, 250, 72);
    g.stroke();
  } else if (kind === 'body') {
    // Körper von oben: Kopf mit Schnabel oben, Brust, Schwanzfächer unten
    c.width = 128;
    c.height = 256;
    const fill = g.createLinearGradient(0, 0, 0, 256);
    fill.addColorStop(0, 'rgba(30,18,44,1)');
    fill.addColorStop(0.45, 'rgba(22,12,34,0.98)');
    fill.addColorStop(1, 'rgba(80,44,150,0.9)');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(64, 6);
    g.quadraticCurveTo(88, 20, 86, 52);
    g.quadraticCurveTo(100, 110, 84, 150);
    g.lineTo(112, 236);
    g.quadraticCurveTo(64, 256, 16, 236);
    g.lineTo(44, 150);
    g.quadraticCurveTo(28, 110, 42, 52);
    g.quadraticCurveTo(40, 20, 64, 6);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(170,120,255,0.5)';
    g.lineWidth = 2;
    for (const dx of [-30, -15, 0, 15, 30]) {
      g.beginPath();
      g.moveTo(64 + dx * 0.3, 160);
      g.lineTo(64 + dx, 238);
      g.stroke();
    }
    // Schnabel und glühende Augen
    g.fillStyle = '#3a2a4a';
    g.beginPath();
    g.moveTo(64, 0);
    g.lineTo(56, 18);
    g.lineTo(72, 18);
    g.closePath();
    g.fill();
    g.fillStyle = '#d8b8ff';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(64 + s * 12, 30, 4.5, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'feather' || kind === 'dfeather' || kind === 'dcovert') {
    // Feder: Spitze oben, Kiel von unten bis fast zur Spitze, Fahne mit feinen Ästen, dunkel mit violettem Saum.
    // feather: kleine schwebende Feder; dfeather: lange Schwungfeder; dcovert: kurze, runde Deckfeder
    const cov = kind === 'dcovert';
    const W = 64;
    const H = cov ? 128 : 256;
    c.width = W;
    c.height = H;
    const cx = W / 2;
    const vane = (inset) => {
      g.beginPath();
      g.moveTo(cx, 3 + inset);
      if (cov) {
        g.bezierCurveTo(W - 4 - inset, 18, W - 6 - inset, H * 0.62, cx + 6, H - 10);
        g.lineTo(cx - 6, H - 10);
        g.bezierCurveTo(6 + inset, H * 0.62, 4 + inset, 18, cx, 3 + inset);
      } else {
        // Außenfahne schmal, Innenfahne breit (asymmetrisch wie eine echte Schwungfeder)
        g.bezierCurveTo(cx + 12 - inset * 0.5, H * 0.12, cx + 13 - inset * 0.5, H * 0.7, cx + 4, H - 26);
        g.lineTo(cx - 5, H - 26);
        g.bezierCurveTo(6 + inset, H * 0.72, 5 + inset, H * 0.15, cx, 3 + inset);
      }
      g.closePath();
    };
    // violetter Saum (wirkt wie ein schwacher Schein an den Rändern)
    g.fillStyle = 'rgba(150,100,240,0.85)';
    vane(0);
    g.fill();
    const fill = g.createLinearGradient(0, 0, 0, H);
    fill.addColorStop(0, '#1c1028');
    fill.addColorStop(0.35, '#120a1c');
    fill.addColorStop(0.8, '#1a0f28');
    fill.addColorStop(1, '#2a1a40');
    g.fillStyle = fill;
    vane(2.2);
    g.fill();
    // Äste der Fahne: feine schräge Linien, abwechselnd heller und dunkler
    g.save();
    vane(2.2);
    g.clip();
    for (let y = 8; y < H - 20; y += cov ? 5 : 6) {
      for (const s of [-1, 1]) {
        g.strokeStyle = (y / 6) % 2 < 1 ? 'rgba(90,60,140,0.45)' : 'rgba(0,0,0,0.45)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(cx, y + 6);
        g.quadraticCurveTo(cx + s * 10, y + 3, cx + s * 30, y - 8);
        g.stroke();
      }
    }
    // Glanz entlang der Innenfahne
    const sh = g.createLinearGradient(cx - 20, 0, cx + 4, 0);
    sh.addColorStop(0, 'rgba(120,80,200,0)');
    sh.addColorStop(0.7, 'rgba(120,80,200,0.18)');
    sh.addColorStop(1, 'rgba(120,80,200,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, W, H);
    // eine Lücke in der Fahne (wirkt lebendig)
    if (!cov) {
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.moveTo(5, H * 0.42);
      g.lineTo(cx - 3, H * 0.47);
      g.lineTo(6, H * 0.45);
      g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    // Kiel
    g.strokeStyle = 'rgba(200,170,255,0.75)';
    g.lineWidth = cov ? 1.6 : 2;
    g.beginPath();
    g.moveTo(cx, cov ? 14 : 10);
    g.lineTo(cx, H - 2);
    g.stroke();
    g.strokeStyle = 'rgba(20,10,30,0.9)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx + 1, H * 0.3);
    g.lineTo(cx + 1, H - 2);
    g.stroke();
  } else if (kind === 'eye') {
    // Schattenauge: mandelförmig, schwarz, violett glühende Iris, schmale Pupille, Lichtpunkt
    c.width = 256;
    c.height = 128;
    const ey = (k) => {
      g.beginPath();
      g.moveTo(8, 64);
      g.quadraticCurveTo(128, -10 * k, 248, 64);
      g.quadraticCurveTo(128, 138 * k - 10, 8, 64);
      g.closePath();
    };
    g.fillStyle = 'rgba(120,70,220,0.45)';
    ey(1.05);
    g.fill();
    g.save();
    ey(1);
    g.clip();
    g.fillStyle = 'rgba(14,8,22,0.97)';
    g.fillRect(0, 0, 256, 128);
    const ir = g.createRadialGradient(128, 64, 4, 128, 64, 46);
    ir.addColorStop(0, '#f6eaff');
    ir.addColorStop(0.35, '#b48cff');
    ir.addColorStop(0.8, '#5a24b0');
    ir.addColorStop(1, '#16061e');
    g.fillStyle = ir;
    g.beginPath();
    g.arc(128, 64, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#05020a';
    g.beginPath();
    g.ellipse(128, 64, 9, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(112, 48, 7, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(170,120,255,0.95)';
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
  n3Glow(h, x + _bfF.x * bl * 0.8, y + _bfF.y * bl * 0.8 + 0.12, z + _bfF.z * bl * 0.8, span * 0.12, BOW3.violet2, 0.7 * op);
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
    const col = pr.color || '#c9a36a';
    // seit 13.67 Schattenmagie: dunkler Rauchschweif, violetter Kern, Pfeil mit dunklen Federn
    _bw3s.set(-_bw3d.z, 0, _bw3d.x);
    const puffs = low ? 4 : 8;
    for (let i = 0; i < puffs; i++) {
      const back = (0.35 + i * 0.24) * big;
      const wob = Math.sin(t * 9 + i * 1.7 + (pr.x + pr.y) * 0.01) * 0.06 * i / puffs;
      n3Smoke(h, x - _bw3d.x * back + _bw3s.x * wob, y + i * 0.02 + wob * 0.5, z - _bw3d.z * back + _bw3s.z * wob, (0.24 + i * 0.05) * big, i % 2 ? BOW3.smoke : BOW3.shadow, 0.62 * (1 - i / puffs));
    }
    _bw3a.set(x - _bw3d.x * 0.4 * big, y, z - _bw3d.z * 0.4 * big);
    _bw3b.set(x - _bw3d.x * (0.4 + 1.1 * big), y, z - _bw3d.z * (0.4 + 1.1 * big));
    const st = fx3Take(h, 'segN');
    fx3Segment(st, _bw3b, _bw3a, 0.022 * big);
    fx3Color(st, '#3a1670', 0.65);
    // Schatten am Boden unter dem Pfeil (Tiefe: man sieht, dass er fliegt)
    mGround(h, 'planeNBowPS', 'disc', pr.x - _bw3d.x * 6, pr.y - _bw3d.z * 6, 0.32 * big, 0.025, 0, BOW3.dark, 0.3);
    bowArrow3(h, x, y, z, _bw3d, BOW_ARROW_LEN * big, col, 1, 0, pr.arrow >= 2 ? col : BOW3.shadow);
    n3Glow(h, x + _bw3d.x * 0.35 * big, y, z + _bw3d.z * 0.35 * big, (pr.arrow >= 5 ? 0.6 : 0.42) * big, BOW3.violet, 0.55);
    if (pr.bfx === 'falke') {
      // dunkle Federn und zwei Schattenbänder wirbeln um den Falkenpfeil
      for (let i = 0; i < (low ? 2 : 4); i++) {
        const a = t * 16 + i * (Math.PI / 2);
        const back = 0.35 + i * 0.28;
        const r = 0.22 + 0.04 * i;
        const fx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
        const fy = y + Math.sin(a) * r;
        const fz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
        bowFeather3(h, fx, fy, fz, 0.32 - i * 0.04, a, 0.95 - i * 0.15);
        if (!low) n3Glow(h, fx, fy, fz, 0.18, BOW3.violet, 0.45);
      }
      const m = low ? 8 : 16;
      for (let s2 = 0; s2 < 2; s2++) {
        let px = 0;
        let py = 0;
        let pz = 0;
        for (let i = 0; i <= m; i++) {
          const back = 0.05 + i * 0.075;
          const a = t * 26 - i * 0.7 + s2 * Math.PI;
          const r = 0.12 + i * 0.01;
          const nx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          const nz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
          if (i) {
            _bw3a.set(px, py, pz);
            _bw3b.set(nx, ny, nz);
            const sg = fx3Take(h, 'segN');
            fx3Segment(sg, _bw3a, _bw3b, 0.03 * (1 - i / (m + 3)));
            fx3Color(sg, s2 ? '#7a4ad0' : '#1a0a2a', 0.95 * (1 - i / (m + 1)));
          }
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      n3Glow(h, x, y, z, 0.9, BOW3.violet, 0.35);
      // ein kleiner Schattenfalke fliegt mit dem Pfeil (Flügelschlag, plastisch über der Bahn)
      if (!low) {
        _bw3e.copy(_bw3d);
        bowFalcon3(h, x - _bw3d.x * 0.45, y + 0.35, z - _bw3d.z * 0.45, _bw3e, 1.0, 0.25 + 0.45 * Math.sin(t * 14 + pr.x * 0.01), 0.85, true);
      }
    } else if (pr.bfx === 'fan') {
      // Fächerpfeile (lange Flugbahn): zusätzliche, lange dunkle Schattenspur
      for (let i = 0; i < (low ? 3 : 6); i++) {
        const back = (2.1 + i * 0.32) * big;
        n3Smoke(h, x - _bw3d.x * back, y + 0.05 * i, z - _bw3d.z * back, 0.3 + i * 0.05, BOW3.smoke, 0.35 * (1 - i / 6));
      }
    } else if (pr.bfx === 'pierce') {
      // zwei Schattenbänder spiralen um die Flugbahn
      const m = low ? 8 : 16;
      for (let s2 = 0; s2 < 2; s2++) {
        let px = 0;
        let py = 0;
        let pz = 0;
        for (let i = 0; i <= m; i++) {
          const back = i * 0.15;
          const a = t * 22 - i * 0.75 + s2 * Math.PI;
          const r = 0.17 + i * 0.014;
          const nx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          const nz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
          if (i) {
            _bw3a.set(px, py, pz);
            _bw3b.set(nx, ny, nz);
            const sg = fx3Take(h, 'segN');
            fx3Segment(sg, _bw3a, _bw3b, 0.03 * (1 - i / (m + 2)));
            fx3Color(sg, s2 ? '#a070f0' : '#140820', 0.95 * (1 - i / (m + 1)));
          }
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      n3Glow(h, x, y, z, 1.0, BOW3.violet, 0.45);
    }
    pr.body3 = t;
  }
}
FX3_HOOKS.push({ parts: [], fn: bowProj3 });

// Pfeil auf der Sehne (seit 13.67): solange die Zughand die Sehne hält (drei-figuren.js bowString3 setzt a.bowNock),
// liegt ein Pfeil von der Zughand durch den Griff; an der Spitze sammelt sich dunkle Schattenmagie
const _bnA = new THREE.Vector3();
const _bnList = [];
function bowNock3(h) {
  if (typeof V3 === 'undefined' || !V3.on || typeof actors3 === 'undefined') return;
  _bnList.length = 0;
  if (game.player && game.running) _bnList.push(game.player);
  if (typeof net !== 'undefined' && net.players) for (const rp of net.players.values()) _bnList.push(rp);
  const low = n3low();
  for (const p of _bnList) {
    const a = actors3.get(entityKey(p));
    const n = a && a.bowNock;
    if (!n || !a.group.visible || !a.group.parent || n.w <= 0.05) continue;
    const s = a.group.scale.x;
    const d = n.fwd;
    const reach = n.grip.distanceTo(n.nock);
    const len = (reach + 0.07 * s) / 1.12;
    const sort = p === game.player ? bowArrowSort(p) : -1;
    const col = sort >= 0 ? ARROW_TYPES[sort].color : '#b48cff';
    _bnA.copy(n.nock).addScaledVector(d, len * 0.62);
    bowArrow3(h, _bnA.x, _bnA.y, _bnA.z, d, len, col, n.w, 0, BOW3.shadow);
    // Schatten sammeln sich an der Spitze, je weiter die Sehne gezogen ist
    const q = n.full || 0;
    _bnA.copy(n.nock).addScaledVector(d, len * 1.08);
    n3Glow(h, _bnA.x, _bnA.y, _bnA.z, (0.25 + q * 0.45) * s, BOW3.violet, 0.55 * q * n.w);
    if (!low) {
      const t = game.time;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.6 + i / 3) % 1;
        n3Smoke(h, _bnA.x + Math.sin(t * 3 + i * 2) * 0.06, _bnA.y + ph * 0.25, _bnA.z + Math.cos(t * 3 + i * 2) * 0.06, (0.18 + ph * 0.2) * s, BOW3.smoke, 0.55 * q * (1 - ph));
      }
    }
  }
}
FX3_HOOKS.push({ parts: [], fn: bowNock3 });

// --- 3D: Effekte ------------------------------------------------------------------------------------------
['bmuzzle3', 'bhit3', 'brain3', 'bpierce3', 'bleap3', 'beye3', 'bult3', 'bshadow3'].forEach((k) => FX3_TYPES.add(k));
const _bwH = new THREE.Vector3();

// Abschuss (seit 13.67 düster): Schattenrauch quillt aus dem Bogen, violetter Schein, ein Ring aus dunkler Energie
FX3_DRAW.bmuzzle3 = function (h, e) {
  const o = e.follow;
  if (!o) return;
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const hand = typeof ninjaHand3 === 'function' ? ninjaHand3(o, _bwH) : _bwH.set(o.x * U3, 0.8, feetY(o) * U3);
  const f = o.facing || { x: 0, y: 1 };
  const x = hand.x + f.x * 0.25;
  const z = hand.z + f.y * 0.25;
  n3Glow(h, x, hand.y, z, 0.9 * (1 - k) + 0.2, BOW3.violet, 0.75 * (1 - k));
  n3Glow(h, x, hand.y, z, 0.3 * (1 - k), BOW3.violet2, 0.8 * (1 - k));
  for (let i = 0; i < (n3low() ? 3 : 6); i++) {
    const a = i * 2.1 + e.start * 7;
    const r = 0.1 + k * (0.35 + 0.1 * (i % 3));
    n3Smoke(h, x + f.x * k * 0.3 + Math.cos(a) * r * Math.abs(f.y), hand.y + Math.sin(a) * r * 0.7 + k * 0.25, z + f.y * k * 0.3 + Math.cos(a) * r * Math.abs(f.x), 0.28 + k * 0.4, BOW3.smoke, 0.7 * (1 - k));
  }
  _bw3c.set(x, hand.y, z);
  _bw3s.set(-f.y, 0, f.x);
  const s = fx3Take(h, 'strip');
  fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.15 + k * 0.45, 0.07, 0, Math.PI * 2, BOW3.violet, 0.8 * (1 - k), true);
};

// Treffer (seit 13.67 düster): dunkle Federn stieben, Schattenfetzen quellen auf, violetter Schein
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
    if (i % 2 === 0) n3Smoke(h, x + Math.cos(a + 1) * r * 0.7, 0.6 + k * 0.6, z + Math.sin(a + 1) * r * 0.6, 0.35 + k * 0.5, BOW3.smoke, 0.6 * (1 - k));
  }
  n3Glow(h, x, 0.9, z, (e.big ? 1.6 : 1.0) * (0.6 + k), BOW3.violet, 0.6 * (1 - k));
  mGround(h, 'planeNBowR', 'ring', e.x, e.y, (e.big ? 1.3 : 0.8) * (0.3 + k), 0.05, 0, '#3a1670', 0.6 * (1 - k));
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
  if (t < 0.8) {
    for (let i = 0; i < 3; i++) {
      const u = clamp01((t - 0.24 - i * 0.04) / 0.45);
      if (u <= 0 || u >= 1) continue;
      _bw3d.set(sx * 0.25 + (i - 1) * 0.12, 1, sz * 0.25).normalize();
      const x = e.ox * U3 + _bw3d.x * u * 9;
      const y = 1.2 + _bw3d.y * u * 9;
      const z = e.oy * U3 + _bw3d.z * u * 9;
      bowArrow3(h, x, y, z, _bw3d, BOW_ARROW_LEN, e.color, 1 - u * 0.5, 0, BOW3.shadow);
      n3Glow(h, x, y, z, 0.5, BOW3.violet, 0.6 * (1 - u));
      n3Smoke(h, x - _bw3d.x * 0.8, y - _bw3d.y * 0.8, z - _bw3d.z * 0.8, 0.4, BOW3.smoke, 0.6 * (1 - u));
      _bw3a.set(x, y, z);
      _bw3b.set(x - _bw3d.x * 1.6, y - _bw3d.y * 1.6, z - _bw3d.z * 1.6);
      const st = fx3Take(h, 'segN');
      fx3Segment(st, _bw3b, _bw3a, 0.03);
      fx3Color(st, '#3a1670', 0.6 * (1 - u));
    }
  }
  // Schatten der kommenden Welle am Boden (weicher dunkler Fleck, kein Zeichen)
  for (let k = 0; k < e.waves; k++) {
    const t0 = e.delay + k * e.every;
    const v = (t - (t0 - 0.25)) / 0.5;
    if (v > 0 && v < 1) mGround(h, 'planeNBowSh', 'disc', e.x, e.y, e.R * U3 * 1.05, 0.03, 0, BOW3.dark, 0.32 * Math.sin(v * Math.PI));
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
      bowArrow3(h, x, H + 0.35, z, _bw3d, BOW_ARROW_LEN, e.color, 1, 0, BOW3.shadow);
      if (!low) n3Glow(h, x, H + 0.35, z, 0.35, BOW3.violet, 0.5);
      _bw3a.set(x, H + 0.35, z);
      _bw3b.set(x - _bw3d.x * 1.8, H + 0.35 - _bw3d.y * 1.8, z - _bw3d.z * 1.8);
      const st = fx3Take(h, 'segN');
      fx3Segment(st, _bw3b, _bw3a, 0.022);
      fx3Color(st, '#3a1670', 0.55);
    } else {
      // steckt schräg im Boden, wackelt kurz nach
      const v = age - RAIN_FALL;
      const wob = Math.sin(v * 40) * Math.exp(-v * 8) * 0.15;
      _bw3c.set(_bw3d.x + wob + a.tilt * 0.3, _bw3d.y, _bw3d.z + a.tilt * 0.3).normalize();
      bowArrow3(h, gx - _bw3c.x * 0.14, 0.14, gz - _bw3c.z * 0.14, _bw3c, BOW_ARROW_LEN, e.color, out, 0, BOW3.shadow);
      if (v < 0.35) {
        const q = v / 0.35;
        n3Smoke(h, gx, 0.15 + q * 0.4, gz, 0.4 + q * 0.5, BOW3.smoke, 0.55 * (1 - q));
        if (!low && a.s % 2 === 0) n3Glow(h, gx, 0.2, gz, 0.6 * (1 - q), BOW3.violet, 0.7 * (1 - q));
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
        fx3Color(sg, s ? '#a070f0' : '#140820', 0.9 * op);
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
    const core = fx3Take(h, 'segN');
    fx3Segment(core, _bw3a, _bw3b, 0.06);
    fx3Color(core, '#24103e', 0.35 * fade);
    // Schattenrauch hängt in der Bahn
    const np = low ? 4 : 9;
    for (let i = 0; i < np; i++) {
      const d = ((i + 0.5) / np) * L;
      const age = t - (d / U3) / e.speed;
      if (age < 0) continue;
      const q = clamp01(age / 0.9);
      n3Smoke(h, x0 + _bw3d.x * d, y + q * 0.3, z0 + _bw3d.z * d, 0.4 + q * 0.5, BOW3.smoke, 0.5 * (1 - q) * fade);
    }
  }
  // Ringe aus Wind in Abständen entlang der Bahn
  for (let i = 1; i <= (low ? 3 : 6); i++) {
    const d = (i / (low ? 4 : 7)) * e.len;
    if (d > tip) break;
    const age = t - d / e.speed;
    const k = clamp01(age / 0.6);
    _bw3c.set(x0 + _bw3d.x * d * U3, y, z0 + _bw3d.z * d * U3);
    const s = fx3Take(h, 'stripN');
    fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.25 + k * 0.5, 0.06, 0, Math.PI * 2, i % 2 ? BOW3.violet : BOW3.violet2, 0.75 * (1 - k) * fade, true);
  }
  if (t < fly + 0.1) n3Glow(h, x0, y, z0, 1.2 * (1 - clamp01(t / 0.3)), BOW3.violet, 0.6);
};

// Rückensprung: Windstoß am Absprung, Federn auf der Bahn
FX3_DRAW.bleap3 = function (h, e) {
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const x = e.x * U3;
  const z = e.y * U3;
  mGround(h, 'planeNBowR', 'ring', e.x, e.y, 0.5 + k * 1.6, 0.05, 0, '#3a1670', 0.6 * (1 - k));
  for (let i = 0; i < (n3low() ? 3 : 7); i++) {
    const a = i * 0.9;
    n3Smoke(h, x + Math.cos(a) * (0.3 + k * 1.1), 0.2 + k * 0.6, z + Math.sin(a) * (0.3 + k * 0.9), 0.4 + k * 0.5, BOW3.smoke, 0.65 * (1 - k));
  }
  _bw3c.set(x, 0.3, z);
  _bw3s.set(e.by, 0, -e.bx);
  for (let i = 0; i < 2; i++) {
    const s = fx3Take(h, 'strip');
    fx3Strip(s, _bw3c, _bw3s, _bw3Up, 0.6 + k * 1.2 + i * 0.25, 0.12, -0.3, Math.PI + 0.3, i ? '#5a2aa8' : '#3a1670', 0.5 * (1 - k), true);
  }
  const L = e.reach * U3;
  for (let i = 0; i < 6; i++) {
    const v = (i + 0.5) / 6;
    const u = clamp01(k * 1.6 - v * 0.3);
    bowFeather3(h, x + e.bx * L * v + Math.sin(i * 2.3) * 0.25, 0.6 + Math.sin(v * Math.PI) * 0.9 - u * 0.6, z + e.by * L * v, 0.26, i + t * 3, (1 - k) * 0.95);
  }
};

// Schattenschritt (seit 13.67): Die Figur zerfällt in schwarzvioletten Rauch, ein Schattenstreif huscht zum Ziel,
// dort zieht sich der Rauch zusammen und platzt mit violettem Schein und dunklen Federn auseinander
FX3_DRAW.bshadow3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x * U3;
  const z1 = e.y * U3;
  const H = e.hide;
  // Abgang: Rauch quillt auf und steigt, kurzer violetter Blitz
  if (t < 0.7) {
    const q = t / 0.7;
    const n = low ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + e.seed;
      const r = (0.15 + 0.9 * n2h(i, e.seed)) * easeOut(Math.min(1, q * 1.6));
      n3Smoke(h, x0 + Math.cos(a) * r, 0.25 + q * (0.6 + 0.9 * n2h(i, e.seed + 1)), z0 + Math.sin(a) * r * 0.8, 0.45 + q * 0.7, i % 3 ? BOW3.smoke : BOW3.shadow, 0.75 * (1 - q));
    }
    if (t < 0.25) n3Glow(h, x0, 0.9, z0, 1.6 * (1 - t / 0.25) + 0.4, BOW3.violet, 0.6 * (1 - t / 0.25));
  }
  // Schattenstreif zum Ziel (während die Figur verborgen ist)
  if (t < H + 0.35) {
    const n = low ? 6 : 12;
    for (let i = 0; i <= n; i++) {
      const v = i / n;
      const at = H * v;
      const age = t - at;
      if (age < 0 || age > 0.45) continue;
      const q = age / 0.45;
      const px = x0 + (x1 - x0) * v;
      const pz = z0 + (z1 - z0) * v;
      n3Smoke(h, px, 0.55 + Math.sin(v * Math.PI) * 0.35 + q * 0.3, pz, 0.5 + q * 0.4, BOW3.smoke, 0.7 * (1 - q));
      if (!low && i % 2 === 0) n3Glow(h, px, 0.7 + Math.sin(v * Math.PI) * 0.35, pz, 0.35, BOW3.violet, 0.45 * (1 - q));
    }
  }
  // Ankunft: Rauch zieht sich zusammen …
  if (t > H - 0.14 && t < H) {
    const q = (t - (H - 0.14)) / 0.14;
    for (let i = 0; i < (low ? 5 : 9); i++) {
      const a = i * 0.7 + e.seed;
      const r = 1.3 * (1 - q) + 0.1;
      n3Smoke(h, x1 + Math.cos(a) * r, 0.5 + Math.sin(i) * 0.25, z1 + Math.sin(a) * r * 0.8, 0.45, BOW3.smoke, 0.6 * q);
    }
    n3Glow(h, x1, 0.8, z1, 0.6 + q * 0.8, BOW3.violet, 0.5 * q);
  }
  // … und platzt auseinander: dunkle Rauchwand, violetter Schein, Federn, Schatten am Boden
  if (t >= H) {
    const v = t - H;
    const q = clamp01(v / 0.75);
    const R = (e.R || 70) * U3;
    const n = low ? 8 : 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + e.seed;
      const r = R * (0.25 + 0.95 * easeOut(q));
      n3Smoke(h, x1 + Math.cos(a) * r, 0.2 + q * 0.5 + 0.2 * n2h(i, e.seed), z1 + Math.sin(a) * r * 0.85, 0.5 + q * 0.6, i % 2 ? BOW3.smoke : BOW3.shadow, 0.8 * (1 - q));
    }
    if (v < 0.3) {
      n3Glow(h, x1, 0.8, z1, 2.4 * (0.4 + v / 0.3), BOW3.violet, 0.65 * (1 - v / 0.3));
      n3Glow(h, x1, 0.8, z1, 0.8, BOW3.violet2, 0.6 * (1 - v / 0.3));
    }
    mGround(h, 'planeNBowSh', 'disc', e.x, e.y, R * 1.3, 0.03, 0, BOW3.dark, 0.4 * (1 - q));
    if (!low) for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + e.seed;
      const r = R * 0.9 * easeOut(q);
      bowFeather3(h, x1 + Math.cos(a) * r, 0.6 + Math.sin(q * Math.PI) * 0.6 - q * 0.3, z1 + Math.sin(a) * r * 0.8, 0.28, a + q * 4, 1 - q);
    }
  }
};
EXTRA_EFFECTS.bshadow3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.6 * (1 - t / 0.6));
  ctx.fillStyle = '#120a1a';
  ctx.beginPath();
  ctx.ellipse(x + (e.x0 - e.x), y + (e.y0 - e.y) - 14, 18 + t * 30, 12 + t * 20, 0, 0, Math.PI * 2);
  ctx.fill();
  if (t >= e.hide) {
    const q = Math.min(1, (t - e.hide) / 0.6);
    ctx.globalAlpha = 0.7 * (1 - q);
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 10 + q * 40, 8 + q * 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, y - 14, 24 + q * 20, '#8a4ae8', 0.6 * (1 - q));
  }
  ctx.restore();
};

// Falkenblick als Klassensegen (seit 13.67, FX3_DRAW.segen3 ruft das für cls 'falke'): Schatten sammeln sich zur Figur,
// über dem Kopf öffnet sich ein dunkles Falkenauge, die Schwingen entfalten sich mit einem Schlag, dunkle Federn wirbeln
function bowSegen3(h, e, k) {
  const o = e.follow && !e.follow.dead ? e.follow : null;
  const t = game.time - e.start;
  const x = (o ? o.x : e.x) * U3;
  const z = (o ? feetY(o) : e.y) * U3;
  const low = n3low();
  const fade = k < 0.12 ? k / 0.12 : 1 - Math.max(0, (k - 0.6) / 0.4);
  const head = (o && typeof v3HeadHeight === 'function' ? v3HeadHeight(o) : 2) + 0.75;
  // Schatten strömen von außen spiralförmig zur Figur
  const n = low ? 8 : 16;
  for (let i = 0; i < n; i++) {
    const ph = (k * 1.4 + i / n) % 1;
    const a = i * 2.399 + ph * 3;
    const r = 2.2 * (1 - ph) + 0.2;
    n3Smoke(h, x + Math.cos(a) * r, 0.2 + ph * 1.3, z + Math.sin(a) * r * 0.8, 0.5 + (1 - ph) * 0.4, BOW3.smoke, 0.65 * fade * Math.sin(ph * Math.PI));
  }
  // Schattensäule und Schein
  fx3MageSprite(h, 'smoke', 'disc', x, 1.4, z, 0.9, 3.4, BOW3.smoke, 0.35 * fade);
  n3Glow(h, x, 1.0, z, 2.2, BOW3.violet, 0.4 * fade);
  // dunkles Falkenauge über dem Kopf
  const open = k < 0.3 ? easeOut(k / 0.3) : 1;
  _bw3a.copy(FX3.cam.r);
  _bw3b.copy(FX3.cam.u);
  bowPlane(h, 'planeNBowE', 'eye', x, head, z, _bw3a, _bw3b, 0.7, 0.35 * open, fade);
  n3Glow(h, x, head, z, 1.6, BOW3.violet, 0.45 * fade);
  // Federn wirbeln nach oben
  const nf = low ? 5 : 10;
  for (let i = 0; i < nf; i++) {
    const ph = (k * 1.2 + i / nf) % 1;
    const a = i * 2.399 + t * 3;
    const r = 0.9 - ph * 0.5;
    bowFeather3(h, x + Math.cos(a) * r, 0.2 + ph * (head - 0.2), z + Math.sin(a) * r, 0.3, a, fade * Math.sin(ph * Math.PI));
  }
  if (t < 0.25) n3Glow(h, x, 1.0, z, 1.2 + t * 6, BOW3.violet2, 0.5 * (1 - t / 0.25));
}

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
  n3Glow(h, x, head, z, 2.2, BOW3.violet, 0.35 * fade);
  const n = n3low() ? 5 : 10;
  for (let i = 0; i < n; i++) {
    const ph = (k * 1.2 + i / n) % 1;
    const a = i * 2.399 + t * 3;
    const r = 0.9 - ph * 0.5;
    bowFeather3(h, x + Math.cos(a) * r, 0.2 + ph * (head - 0.2), z + Math.sin(a) * r, 0.3, a, fade * Math.sin(ph * Math.PI));
  }
};

// Aura des Falkenblicks (seit 13.67 Klassensegen segen_falke): echte, gefiederte Schattenschwingen an den
// Schulterblättern der Figur. Sie hängen am Brustknochen (folgen Drehung, Laufen, Sprung) und bestehen aus Lagen:
// Handschwingen (lang, außen), Armschwingen (entlang des Arms), große und kleine Deckfedern oben drüber.
// Im Stehen liegen sie angelegt am Rücken und atmen, beim Laufen öffnen sie sich etwas und schlagen sanft,
// beim Schießen und Zaubern breiten sie sich aus. Dazu eine dunkle Aura: schwarzvioletter Rauch steigt auf.
const _bwN = new THREE.Vector3();
const _wgX = new THREE.Vector3();
const _wgY = new THREE.Vector3();
const _wgZ = new THREE.Vector3();
const _wgR = new THREE.Vector3();
const _wgE = new THREE.Vector3();
const _wgT = new THREE.Vector3();
const _wgN = new THREE.Vector3();
const _wgD = new THREE.Vector3();
const _wgW = new THREE.Vector3();
const _wgA = new THREE.Vector3();
const _wgS = new THREE.Vector3();
const _wgEo = new THREE.Vector3();
const _wgEf = new THREE.Vector3();
const _wgTo = new THREE.Vector3();
const _wgTf = new THREE.Vector3();
// Federn einer Schwinge: [Lage, Anteil entlang der Vorderkante, Anteil Richtung Spitze, Länge, Breite]
// Lage 0 Schwungfedern (Hand- und Armschwingen), 1 große Deckfedern, 2 kleine Deckfedern am Bug
function bowWingLayout(low) {
  const out = [];
  const nS = low ? 6 : 10;
  const nP = low ? 5 : 8;
  // Armschwingen: entlang des Arms, alle nach hinten unten, innen etwas kürzer
  for (let i = 0; i < nS; i++) {
    const u = 0.08 + 0.72 * (i / (nS - 1));
    out.push([0, u, 0.04 * i / nS, 0.3 + 0.07 * (i / nS), 0.12]);
  }
  // Handschwingen: am Handgelenk gefächert, außen länger und weiter nach außen gedreht
  for (let i = 0; i < nP; i++) {
    const v = i / (nP - 1);
    out.push([0, 0.84 + 0.16 * v, 0.12 + 0.72 * v, 0.4 + 0.1 * Math.sin(v * Math.PI * 0.8), 0.11]);
  }
  // große Deckfedern über den Schwungfedern
  const nC = low ? 5 : 9;
  for (let i = 0; i < nC; i++) {
    const u = 0.06 + 0.9 * (i / (nC - 1));
    out.push([1, u, 0.1 + 0.4 * Math.max(0, u - 0.7) / 0.3, 0.2, 0.09]);
  }
  // kleine Deckfedern am Bug (Vorderkante)
  if (!low) for (let i = 0; i < 7; i++) {
    const u = 0.04 + 0.9 * (i / 6);
    out.push([2, u, 0.05, 0.11, 0.075]);
  }
  return out;
}
const BOW_WING = { low: bowWingLayout(true), high: bowWingLayout(false) };
// eine Schwinge: Ansatz R (Welt), Achsen der Brust X (zur Seite der Schwinge), Y (oben), Z (vorn), Maß k,
// Öffnung sp (0 angelegt … 1 ausgebreitet), Schlag fl (Bogenmaß, + = hoch), Deckkraft op
function bowWing3(h, R, X, Y, Z, k, sp, fl, op, low, t, side) {
  const L = low ? BOW_WING.low : BOW_WING.high;
  // Vorderkante: angelegt kurz, leicht nach oben-hinten (Flügelbug über der Schulter); offen weit zur Seite
  const el = 0.32 + fl;
  _wgEf.copy(X).multiplyScalar(0.6).addScaledVector(Y, 0.6).addScaledVector(Z, -0.5).normalize();
  _wgEo.copy(X).multiplyScalar(Math.cos(el)).addScaledVector(Y, Math.sin(el)).addScaledVector(Z, -0.32).normalize();
  _wgE.copy(_wgEf).lerp(_wgEo, sp).normalize();
  const edge = k * (0.26 + 0.28 * sp);
  // Richtung der Federn: angelegt nach unten (am Rücken entlang), offen nach unten-hinten-außen
  _wgTf.copy(Y).multiplyScalar(-1).addScaledVector(Z, -0.08).addScaledVector(X, -0.12).normalize();
  _wgTo.copy(Y).multiplyScalar(-0.78).addScaledVector(Z, -0.42).addScaledVector(X, 0.1 - fl * 0.4).normalize();
  _wgT.copy(_wgTf).lerp(_wgTo, sp).normalize();
  // Flächennormale zeigt nach hinten/oben (dorthin liegen die Deckfedern)
  _wgN.crossVectors(_wgE, _wgT).normalize();
  _wgS.copy(Z).negate();
  if (_wgN.dot(_wgS) < 0) _wgN.negate();
  const fold = 1 - sp;
  for (let j = 0; j < L.length; j++) {
    const [layer, u, outw, len0, wid] = L[j];
    // Federrichtung: von der Hinterkante zur Spitze hin nach außen gedreht (offen stark, angelegt kaum)
    _wgD.copy(_wgT).lerp(_wgE, outw * (0.25 + 0.75 * sp)).normalize();
    // angelegt: die Federn bündeln sich (Handschwingen liegen über den Armschwingen)
    // angelegt etwas kürzer, damit die Spitzen an der Hüfte enden und nicht bis zum Boden hängen
    const len = len0 * k * (layer === 0 ? 1 - fold * 0.18 : 1);
    _wgA.copy(R).addScaledVector(_wgE, edge * u);
    // Lagen übereinander: Deckfedern etwas nach hinten (zur Kamera auf dem Rücken), Handschwingen über Armschwingen
    const lift = layer === 2 ? 0.035 : layer === 1 ? 0.022 : outw > 0.1 ? 0.01 * outw : 0;
    _wgA.addScaledVector(_wgN, lift * k);
    // etwas Leben: jede Feder zittert minimal
    const jit = Math.sin(t * 2.3 + j * 1.7) * 0.012 * k;
    _wgA.addScaledVector(_wgT, jit);
    _wgW.crossVectors(_wgN, _wgD).normalize();
    const cx = _wgA.x + _wgD.x * len * 0.5;
    const cy = _wgA.y + _wgD.y * len * 0.5;
    const cz = _wgA.z + _wgD.z * len * 0.5;
    const o = bowPlane(h, layer === 0 ? 'planeNBowP' : 'planeNBowC', layer === 0 ? 'dfeather' : 'dcovert', cx, cy, cz, _wgW, _wgD, wid * k * 0.5, len * 0.5, op);
    // innen dunkler, die äußeren Handschwingen und der Bug einen Hauch violett
    const tint = layer === 2 ? 0.9 : layer === 1 ? 0.95 : 0.82 + 0.18 * outw;
    o.material.color.setRGB(tint, tint * 0.92, tint);
    o.renderOrder = 4 + layer;
  }
  // violetter Schein an den Spitzen der Handschwingen (nur wenn offen) und am Bug
  if (!low) {
    _wgA.copy(R).addScaledVector(_wgE, edge);
    n3Glow(h, _wgA.x, _wgA.y, _wgA.z, 0.3 * k, BOW3.violet, (0.18 + 0.2 * sp) * op);
    _wgA.addScaledVector(_wgD, 0.5 * k);
    if (sp > 0.3) n3Glow(h, _wgA.x, _wgA.y, _wgA.z, 0.45 * k, BOW3.violet, 0.22 * sp * op);
  }
}
function bowWings3(h, p, b, t) {
  const low = n3low();
  const a = typeof actors3 !== 'undefined' ? actors3.get(entityKey(p)) : null;
  const x = p.x * U3;
  const z = feetY(p) * U3;
  const left = clamp01((b.until - t) / 1.5);
  // Öffnung: Stehen angelegt, Laufen halb, Schießen/Zaubern weit; weich nachgeführt
  const dt = Math.min(0.1, Math.max(0, t - (p._wingT ?? t)));
  p._wingT = t;
  const acting = p.swing > 0 && p.swingKind !== 'combo';
  const want = acting ? 0.95 : p.moving ? 0.42 : 0.16;
  p._wingS = (p._wingS ?? want) + (want - (p._wingS ?? want)) * Math.min(1, dt * (acting ? 9 : 4));
  const sp = Math.max(0, Math.min(1, p._wingS + (p.moving ? 0.07 * Math.sin(t * 11) : 0.025 * Math.sin(t * 1.8))));
  const fl = acting ? 0.12 * Math.sin(t * 7) : p.moving ? 0.16 * Math.sin(t * 5.5) : 0.02 * Math.sin(t * 1.8);
  const op = left;
  if (a && a.bones && a.group.visible && a.group.parent) {
    const B = a.bones;
    a.group.updateMatrixWorld(true);
    const m = B[BH.chest].matrixWorld.elements;
    _wgX.set(m[0], m[1], m[2]).normalize();
    _wgY.set(m[4], m[5], m[6]).normalize();
    _wgZ.set(m[8], m[9], m[10]).normalize();
    const k = a.group.scale.x;
    for (const [bi, sx] of [[BH.wingL, 1], [BH.wingR, -1]]) {
      B[bi].getWorldPosition(_wgR);
      _wgR.addScaledVector(_wgZ, -0.05 * k).addScaledVector(_wgY, 0.04 * k);
      _wgS.copy(_wgX).multiplyScalar(sx);
      bowWing3(h, _wgR, _wgS, _wgY, _wgZ, k, sp, fl, op, low, t, sx);
    }
  }
  // dunkle Aura: schwarzvioletter Rauch steigt von den Füßen auf, dazu ein schwacher violetter Schein
  const n = low ? 4 : 9;
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.45 + i / n) % 1;
    const ang = i * 2.399 + t * 0.4;
    const r = 0.32 + 0.18 * Math.sin(i * 1.3 + t);
    n3Smoke(h, x + Math.cos(ang) * r, 0.1 + ph * 1.6, z + Math.sin(ang) * r * 0.8, 0.35 + ph * 0.45, BOW3.smoke, 0.42 * Math.sin(ph * Math.PI) * left);
  }
  n3Glow(h, x, 0.8, z, 1.5, BOW3.violet, (0.16 + 0.04 * Math.sin(t * 2.2)) * left);
  if (!low) for (let i = 0; i < 4; i++) {
    const ph = (t * 0.7 + i / 4) % 1;
    const ang = i * 1.9 + t * 1.3;
    n3Glow(h, x + Math.cos(ang) * 0.45, 0.25 + ph * 1.8, z + Math.sin(ang) * 0.35, 0.1, BOW3.violet2, 0.7 * Math.sin(ph * Math.PI) * left);
  }
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
    n3Glow(h, px, py, pz, 5 * grow, BOW3.violet, 0.3);
    for (let i = 0; i < (low ? 3 : 6); i++) n3Smoke(h, px + Math.sin(t * 5 + i) * 0.6, py - 0.2 + Math.cos(t * 4 + i) * 0.3, pz + Math.cos(t * 5 + i * 2) * 0.6, 1.0, BOW3.smoke, 0.45 * grow);
    // Schatten am Boden wird größer, je näher er kommt
    mGround(h, 'planeNBowSh', 'disc', px / U3, pz / U3, 2.2 + u * 1.5, 0.03, 0, BOW3.dark, 0.45 * u);
    // Windspur hinter ihm
    for (let i = 1; i <= (low ? 4 : 9); i++) {
      const v = Math.max(0, u - i * 0.05);
      const qx = bx + (x1 - bx) * v;
      const qz = bz + (z1 - bz) * v;
      const qy = H0 * (1 - v * v) + 0.9;
      n3Smoke(h, qx, qy, qz, 1.2 - i * 0.08, BOW3.smoke, 0.55 - i * 0.05);
      if (i % 2) n3Glow(h, qx, qy, qz, 0.8, BOW3.violet, 0.4 - i * 0.035);
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
      fx3Color(w, i ? '#5a2aa8' : '#3a1670', 0.3 * (1 - k));
    }
    mGround(h, 'planeNBowR', 'ring', e.x, e.y, 1 + k * 4.6, 0.05, 0, '#3a1670', 0.7 * (1 - k));
    n3Glow(h, x1, 1, z1, 7 * (0.4 + k), BOW3.violet, 0.5 * (1 - k));
    for (let i = 0; i < (low ? 8 : 18); i++) {
      const a = (i / (low ? 8 : 18)) * Math.PI * 2;
      const r = 1 + k * 4.4;
      n3Smoke(h, x1 + Math.cos(a) * r, 0.3 + k * 0.6, z1 + Math.sin(a) * r * 0.85, 0.8 + k * 0.6, '#1a0e2a', 0.55 * (1 - k) * (1 - k));
    }
    _bw3a.set(x1, 0, z1);
    _bw3b.set(x1, 9, z1);
    const col = fx3Take(h, 'seg');
    fx3Segment(col, _bw3a, _bw3b, 0.5 * (1 - k) + 0.04);
    fx3Color(col, BOW3.violet, 0.3 * (1 - k) * (1 - k));
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
      bowArrow3(h, x, H + 0.4, z, _bw3d, BOW_ARROW_LEN * 1.3, '#c8b0ff', 1, 0, BOW3.shadow);
      n3Glow(h, x, H + 0.4, z, 0.5, BOW3.violet, 0.6);
      _bw3a.set(x, H + 0.4, z);
      _bw3b.set(x - _bw3d.x * 2.6, H + 0.4 - _bw3d.y * 2.6, z - _bw3d.z * 2.6);
      const st = fx3Take(h, 'segN');
      fx3Segment(st, _bw3b, _bw3a, 0.04);
      fx3Color(st, '#3a1670', 0.6);
    } else {
      bowArrow3(h, gx - _bw3d.x * 0.18, 0.18, gz - _bw3d.z * 0.18, _bw3d, BOW_ARROW_LEN * 1.3, '#c8b0ff', out, 0, BOW3.shadow);
      const q = (age - 0.2) / 0.4;
      if (q < 1) {
        n3Glow(h, gx, 0.3, gz, 1.4 * (1 - q), BOW3.violet, 0.6 * (1 - q));
        n3Smoke(h, gx, 0.2 + q * 0.5, gz, 0.5 + q * 0.5, '#1a0e2a', 0.5 * (1 - q));
        if (q < 0.6) {
          mGround(h, 'planeNBowR', 'ring', s.x, s.y + 9, 0.4 + q * 1.4, 0.05, 0, '#3a1670', 0.55 * (1 - q / 0.6));
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
  ctx.strokeStyle = '#9a7ad8';
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
      ctx.strokeStyle = '#9a7ad8';
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
  glow2(ctx, x, y - 70, 20, '#8a4ae8', 0.7 * (1 - k));
  ctx.restore();
};
EXTRA_EFFECTS.bult3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (t < ULT_FALCON.dive) {
    const u = t / ULT_FALCON.dive;
    glow2(ctx, x, y - 260 * (1 - u), 40, '#8a4ae8', 0.8);
  } else {
    const v = clamp01((t - ULT_FALCON.dive) / 0.8);
    glow2(ctx, x, y - 10, 40 + v * 140, '#8a4ae8', 0.6 * (1 - v));
  }
  for (const s of e.shots) {
    const age = t - s.at;
    if (age > 0 && age < 0.5) glow2(ctx, x + (s.x - e.x), y + (s.y + 9 - e.y), 22, '#b48cff', 1 - age / 0.5);
  }
  ctx.restore();
};

// --- Symbole ------------------------------------------------------------------------------------------------
// seit 13.67 dunkel: alle Bogen-Symbole auf schwarzviolettem Grund (Schattenmagie)
Object.assign(ICON_THEME, {
  himmel: ['#4a2a8a', '#0a0614', '#d8c8ff'],
  falke: ['#6a3ab0', '#0c0618', '#e8d8ff'],
  nachtfalke: ['#5a2aa8', '#06030c', '#c8a8ff']
});
Object.assign(SKILL_ART_THEME, { falkenpfeil: 'falke', pfeilhagel: 'himmel', durchschuss: 'nachtfalke', rueckensprung: 'himmel', falkenblick: 'nachtfalke', schattenwechsel: 'nachtfalke', himmelsfalke: 'nachtfalke' });

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
  IK.light(ctx, 8, -8, 22, '#b48cff', 0.6);
  // Windbögen quer um den Schaft
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [d, r, c] of [[-4, 7, 'rgba(180,140,255,0.95)'], [-11, 8.5, 'rgba(255,255,255,0.8)'], [3, 5.5, 'rgba(140,90,230,0.9)']]) {
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
  ikBowArrow(ctx, IK, -18, 18, 19, -19, { w: 2.6, head: '#d8c8ff', glow: '#b48cff', fletch: '#6a3ab0' });
  ikFeather(ctx, IK, -10, 4, 8, -2.4);
  ikFeather(ctx, IK, -3, 13, 7, -1.5, ['#8a6ab8', '#3a2058', '#120a1c']);
  IK.sparkles(ctx, 6, '#e8d8ff', 17, 8, 13, -13, 1.4);
};
// Pfeilhagel: fünf Pfeile stürzen schräg vom Himmel, unten stecken schon welche im Boden
SKILL_ART.pfeilhagel = function (ctx, IK) {
  IK.light(ctx, -4, -16, 20, '#c8b0ff', 0.5);
  IK.fill(ctx, (c) => c.ellipse(2, 17, 20, 4.5, 0, 0, Math.PI * 2), IK.rad(ctx, 2, 17, 1, 20, [[0, 'rgba(150,130,100,0.9)'], [1, 'rgba(40,30,20,0)']]), 0);
  for (const [x, y] of [[-10, 18], [13, 17]]) ikBowArrow(ctx, IK, x - 4, y - 10, x, y, { w: 1.5, head: '#c8b0ff' });
  for (const [x, y] of [[-12, 0], [-2, 8], [8, -2], [16, 6], [3, -12]]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150,110,230,0.5)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 17);
    ctx.lineTo(x - 4.5, y - 8.5);
    ctx.stroke();
    ctx.restore();
    ikBowArrow(ctx, IK, x - 5, y - 9.5, x, y, { w: 1.7, head: '#e0d0ff', glow: '#a070f0', fletch: '#3a1a6a' });
  }
};
// Durchbohrender Schuss: waagrechter Pfeil, um den sich ein Windwirbel dreht, vorn heller Durchschlag
SKILL_ART.durchschuss = function (ctx, IK) {
  IK.light(ctx, 10, 0, 18, '#a070f0', 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 8;
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(150,100,255,0.9)';
    ctx.lineWidth = 2.2 - i * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, 0, 2.6 + i * 0.4, 8.5 - i * 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ikBowArrow(ctx, IK, -21, 0, 21, 0, { w: 2.4, head: '#e0d0ff', glow: '#a070f0', fletch: '#3a1a6a' });
  IK.sparkles(ctx, 6, '#e0d0ff', 23, 7, 16, 0, 1.3);
};
// Rückensprung: helle Gestalt im Salto nach hinten links, nach rechts fliegt ein Fächer aus drei Pfeilen
SKILL_ART.rueckensprung = function (ctx, IK) {
  IK.light(ctx, 6, -4, 20, '#9a6ae0', 0.5);
  IK.trail(ctx, -9, 2, 12, Math.PI * 0.05, Math.PI * 1.15, 3.2, '#c8a8ff', 18);
  IK.glow(ctx, '#6a3ab0', 7, () => IK.figure(ctx, -9, 12, 21, '#1a0e28', -1.25));
  for (const a of [-0.42, 0, 0.42]) ikBowArrow(ctx, IK, -1 + Math.cos(a) * 3, -2 + Math.sin(a) * 3, 2 + Math.cos(a) * 20, -2 + Math.sin(a) * 20, { w: 1.9, head: '#e0d0ff', fletch: '#6a3ab0' });
  IK.fill(ctx, (c) => c.ellipse(-6, 20, 12, 2.5, 0, 0, Math.PI * 2), 'rgba(10,4,20,0.6)', 0);
};
// Falkenblick: Falkenauge mit goldener Iris zwischen zwei Schwingen
SKILL_ART.falkenblick = function (ctx, IK) {
  IK.light(ctx, 0, 0, 22, '#a070f0', 0.5);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ikFeather(ctx, IK, s * 7, 2, 12 - i * 1.5, s * (1.0 + i * 0.32));
  IK.glow(ctx, '#a070f0', 6, () => IK.fill(ctx, (c) => { c.moveTo(-13, 0); c.quadraticCurveTo(0, -11, 13, 0); c.quadraticCurveTo(0, 11, -13, 0); c.closePath(); },
    IK.rad(ctx, 0, 0, 1, 13, [[0, '#ffffff'], [1, '#d8f0ff']]), 1.2, 'rgba(10,30,60,0.95)'));
  IK.fill(ctx, (c) => c.arc(0, 0, 6.2, 0, Math.PI * 2), IK.rad(ctx, 0, 0, 0.5, 6.2, [[0, '#fff2b0'], [0.5, '#ffc23a'], [0.9, '#c86a10'], [1, '#3a1a06']]), 0.8);
  IK.fill(ctx, (c) => c.ellipse(0, 0, 1.4, 4.8, 0, 0, Math.PI * 2), '#0a0608', 0);
  IK.fill(ctx, (c) => c.arc(-2.2, -2.2, 1.3, 0, Math.PI * 2), '#ffffff', 0);
  IK.sparkles(ctx, 5, '#c8b0ff', 29, 19, 0, -2, 1.3);
};
// Schattenschritt (seit 13.67): links zerfällt eine dunkle Gestalt in Rauch, ein violetter Schattenbogen springt nach
// rechts, dort steht sie wieder auf, umgeben von platzendem Schatten
SKILL_ART.schattenwechsel = function (ctx, IK) {
  IK.light(ctx, 9, 2, 20, '#8a4ae8', 0.7);
  // Rauchballen der alten Stelle
  for (const [x, y, r, a] of [[-14, 10, 7, 0.9], [-9, 4, 5.5, 0.8], [-16, 1, 4.5, 0.7], [-11, -5, 3.5, 0.6], [-15, -10, 2.6, 0.5]]) {
    IK.fill(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), IK.rad(ctx, x - r * 0.3, y - r * 0.3, 0.5, r, [[0, `rgba(80,50,120,${a})`], [1, `rgba(10,6,16,${a})`]]), 0);
  }
  // halb zerfallene Gestalt
  ctx.save();
  ctx.globalAlpha = 0.55;
  IK.figure(ctx, -12, 15, 19, '#120a1c', 0.1);
  ctx.restore();
  // Sprungbogen aus Schatten
  IK.trail(ctx, -1, 10, 13, Math.PI * 1.05, Math.PI * 1.95, 3.4, '#b48cff', 22);
  // neue Gestalt, violett umrandet
  IK.glow(ctx, '#b48cff', 7, () => IK.figure(ctx, 12, 17, 22, '#0a0612', -0.05));
  // Schattenspitzen platzen um sie herum
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + i * 0.32;
    const r0 = 9;
    const r1 = 15 + (i % 2) * 3;
    IK.fill(ctx, (c) => { c.moveTo(12 + Math.cos(a - 0.12) * r0, 8 + Math.sin(a - 0.12) * r0); c.lineTo(12 + Math.cos(a) * r1, 8 + Math.sin(a) * r1); c.lineTo(12 + Math.cos(a + 0.12) * r0, 8 + Math.sin(a + 0.12) * r0); c.closePath(); },
      IK.lin(ctx, 12, 8, 12 + Math.cos(a) * r1, 8 + Math.sin(a) * r1, [[0, '#1a0e28'], [1, '#8a5ae0']]), 0);
  }
  IK.sparkles(ctx, 5, '#e8d8ff', 73, 16, 6, -2, 1.3);
};
// Sturm des Himmelsfalken: Geisterfalke stößt kopfüber herab (Flügel hoch im V, Schwanzfächer oben), darunter Pfeile
SKILL_ART.himmelsfalke = function (ctx, IK) {
  IK.light(ctx, 0, -2, 24, '#8a4ae8', 0.6);
  for (const [x, y] of [[-15, 19], [-6, 21], [6, 21], [15, 19]]) ikBowArrow(ctx, IK, x - 3, y - 9, x, y, { w: 1.3, head: '#d8c8ff', glow: '#a070f0', fletch: '#3a1a6a' });
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
    IK.glow(ctx, '#a070f0', 6, () => IK.fill(ctx, wing, IK.lin(ctx, 3, 4, 20, -18, [[0, '#3a2058'], [0.45, '#1a0e28'], [1, '#8a5ae0']]), 0.9, 'rgba(150,110,240,0.9)'));
    ctx.strokeStyle = '#b48cff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(3, -2.5);
    ctx.quadraticCurveTo(9, -10.5, 20.5, -18.6);
    ctx.stroke();
    ctx.restore();
  }
  // Schwanzfächer oben, Körper, Kopf mit Schnabel unten
  IK.fill(ctx, (c) => { c.moveTo(-2.5, -6); c.lineTo(-5.5, -15); c.quadraticCurveTo(0, -17.5, 5.5, -15); c.lineTo(2.5, -6); c.closePath(); },
    IK.lin(ctx, 0, -17, 0, -6, [[0, '#8a5ae0'], [1, '#1a0e28']]), 0.9, 'rgba(150,110,240,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(0, -8); c.quadraticCurveTo(5, -2, 3.2, 6); c.quadraticCurveTo(0, 10, -3.2, 6); c.quadraticCurveTo(-5, -2, 0, -8); c.closePath(); },
    IK.lin(ctx, 0, -8, 0, 9, [[0, '#2a1840'], [1, '#120a1c']]), 0.9, 'rgba(150,110,240,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(-1.8, 8); c.lineTo(0, 12.5); c.lineTo(1.8, 8); c.closePath(); }, '#6a3ab0', 0.6);
  for (const ex of [-1.6, 1.6]) IK.fill(ctx, (c) => c.arc(ex, 5.5, 0.8, 0, Math.PI * 2), '#d8b8ff', 0);
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
  // seit 13.67 auch im gemeinsamen Konto-Lager (kontolager.js), sobald es das gibt
  const ownsBow = isBow(eq.waffe) || p.inventory.some(isBow) || !!(p.storage && p.storage.items && p.storage.items.some(isBow))
    || (typeof klHasItem === 'function' && klHasItem(isBow));
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
