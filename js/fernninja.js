// Fern-Ninja (seit 13.57): Der zweite Weg des Ninjas ist jetzt der Weg des Falken – Fernkampf mit Pfeil und Bogen.
// Hier steht alles, was dazugehört:
//  - Pfeile als Munition (ARROW_TYPES in gegenstaende.js): jeder Bogenschuss verbraucht einen Pfeil der besten Sorte,
//    die man hat und schon benutzen darf; seit 13.67 schießt der Bogen ohne Pfeile gar nicht (keine Übungspfeile mehr)
//  - die fünf Fertigkeiten (SKILL_TYPES, Mitspieler über MAGE2_REMOTE) und die Ultimative Attacke „Sturm des Schattenadlers“;
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
  // seit 14.38 im Arbeitsspeicher (CPU_CANVAS, figuren.js): toDataURL ohne Zurücklesen von der Grafikkarte
  const g = c.getContext('2d', typeof CPU_CANVAS !== 'undefined' ? CPU_CANVAS : undefined);
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
// Falkenpfeil (seit 13.70 eine Salve statt eines einzelnen schweren Pfeils): drei Schattenpfeile kurz hintereinander
// aufs Ziel, ab Heroisch vier (sk.rankCount). Vor jedem weiteren Schuss greift die Zughand über die Schulter in den
// Köcher und legt den nächsten Pfeil auf (Pose BOW_DRAW3 mit cycles, drei-figuren.js); während der Salve hüllt eine
// dunkelviolette Aura Bogen und Figur ein (bsalvo3). Der letzte Pfeil ist der schwere Falkenpfeil (Federwirbel, kleiner
// Schattenfalke) und schlägt mit einem Schattenstoß ein (bsalvohit3), nur er stößt zurück und trifft etwas härter
// (sk.lastMul). Jeder Pfeil verbraucht einen Pfeil; reichen sie nicht, fliegen so viele, wie da sind.
const BOW_SALVO = { first: 0.2, tail: 0.2 };
// Pfeile und Schaden je Pfeil auf dieser Stufe
function bowSalvoSpec(sk, lvl) {
  const rc = sk.rankCount;
  if (rc && lvl != null && skillRank(lvl) >= rc.rank) return { count: rc.count, dmg: rc.dmg, every: rc.every || sk.every || 0.15 };
  return { count: sk.count || 1, dmg: sk.dmg, every: sk.every || 0.15 };
}
// Zeitplan: Abschüsse (s nach dem Wirken) und Dauer der Pose
function bowSalvoPlan(n, every) {
  const rel = [];
  for (let k = 0; k < n; k++) rel.push(BOW_SALVO.first + k * every);
  return { rel, dur: rel[n - 1] + BOW_SALVO.tail };
}
// Pose je Pfeilzahl (bogensalve1 … bogensalve4): Zugzeiten für drei-figuren.js und Körperhaltung (BOW_POSE),
// einmal beim Laden aus den Daten des Falkenpfeils angelegt – Mitspieler brauchen dieselben Namen.
// Seit 13.76 auch für den Pfeilregen: o.kind (Name der Pose), o.up (Höhe des Ziels, Bogenmaß), o.hold (Körper)
function bowSalvoRegister(n, every, o = {}) {
  const kind = o.kind || 'bogensalve' + n;
  const { rel, dur } = bowSalvoPlan(n, every);
  const cycles = rel.map((r, k) => [(k ? rel[k - 1] + every * 0.55 : 0.05) / dur, (r - Math.min(0.03, every * 0.12)) / dur, r / dur]);
  if (typeof BOW_DRAW3 !== 'undefined') BOW_DRAW3[kind] = { w: cycles[0], cycles, up: o.up ?? 0.04 };
  // Körper: leicht in die Knie, Brust zum Ziel; bei jedem Abschuss ein kleiner Rückstoß
  const hold = o.hold || { rx: -1.7, wx: 1.48, lx: -1.8, lz: -1.0, cy: 0.07, gr: 0.13, hpy: -0.025 };
  const keys = [[0, N3], [cycles[0][0] * 1.6, hold, 'out']];
  for (const r of rel) {
    const t = r / dur;
    keys.push([t, { ...hold, hx: (hold.hx || 0) - 0.06, hpz: -0.035, cx: (hold.cx || 0) + 0.04 }, 'out'], [Math.min(0.97, t + 0.06 / dur), hold]);
  }
  keys.push([1, N3]);
  BOW_POSE[kind] = keys;
  return kind;
}
SKILL_TYPES.bshot = function (sk, pw, lvl) {
  const p = game.player;
  const t = pickTarget(sk.range);
  const spec = bowSalvoSpec(sk, lvl);
  const n = Math.max(1, Math.min(spec.count, bowArrowUsable(p)));
  const ar = bowArrowShot(p, n);
  if (!ar) return false;
  if (t) faceTowards(t.x, t.y);
  const col = ar.color;
  const plan = bowSalvoPlan(n, spec.every);
  // stehen bleiben und zum Ziel schauen, bis der letzte Pfeil fliegt; das Laufziel bleibt (geht danach weiter)
  lockPlayer(p, plan.rel[n - 1] + 0.08);
  // useSkill setzt danach die Pose aus den Daten (drei Pfeile) – die Salve stellt sie auf ihre Pfeilzahl
  later(0, () => { if (!p.dead && BOW_POSE['bogensalve' + n]) startSwing(p, 'bogensalve' + n, plan.dur); });
  salvoFx(p, plan, fxRank);
  plan.rel.forEach((at, k) => later(at, () => {
    if (p.dead) return;
    const tt = t && !t.dead ? t : null;
    if (tt) faceTowards(tt.x, tt.y);
    const f = { ...p.facing };
    const m = bowMuzzle(p, f);
    const last = k === n - 1;
    const mul = spec.dmg * (last ? sk.lastMul || 1 : 1) * pw * ar.mul;
    spawnProjectile({ owner: 'player', x: m.x, y: m.y, target: tt, dir: tt ? null : f, speed: sk.speed, range: sk.range + 60, mul, color: col,
      radius: 6, style: 'arrow', skill: sk.id, knockback: last ? sk.knockback : 0, bfx: last ? 'falke' : 'salvo', arrow: ar.sort, afterHit: last ? salvoLastHit : null,
      focusOnly: true }); // seit 14.17: mit Ziel nur das Ziel, durch andere Monster hindurch
    bowShotFx(p, sk.color);
    shakeScreen(last ? 1.8 : 0.8);
  }));
  const out = { c: col, n, ev: spec.every };
  if (!t) Object.assign(out, { tx: Math.round(p.x + p.facing.x * sk.range), ty: Math.round(p.y + p.facing.y * sk.range) });
  return out;
};
// Aura der Salve an der Figur (eigene und Mitspieler)
function salvoFx(owner, plan, rk) {
  addEffect({ type: 'bsalvo3', follow: owner, ox: 0, oy: 0, rel: plan.rel, rk: rk >= 0 ? rk : -1, color: BOW3.violet, dur: plan.dur + 0.3, seed: Math.random() * 9 });
}
// Einschlag des letzten Pfeils: Schattenstoß
function salvoLastHit(m) {
  addEffect({ type: 'bsalvohit3', x: m.x, y: feetY(m), rk: fxRank, color: BOW3.violet, dur: 0.9, seed: Math.random() * 9 });
  particles(m.x, feetY(m) - 16, { count: 16, color: ['#0a0610', '#2a1640', '#8a5ae0', '#d8b8ff'], speed: [70, 210], life: [0.3, 0.6], size: [2, 4], drag: 3, glow: false });
  hitStop(0.04);
  shakeScreen(3);
}
MAGE2_REMOTE.bshot = (rp, sk, d) => {
  // ältere Mitspieler schicken keine Pfeilzahl: ein Pfeil
  const n = Math.max(1, Math.min(4, d.n | 0 || 1));
  const plan = bowSalvoPlan(n, d.ev > 0 && d.ev < 1 ? d.ev : sk.every || 0.15);
  const rk = Number.isInteger(d.rk) && d.rk >= 0 && d.rk < SKILL_RANKS.length ? d.rk : -1;
  withRank(rk, () => {
    salvoFx(rp, plan, rk);
    plan.rel.forEach((at, k) => later(at, () => {
      const last = k === n - 1;
      spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, aimAt: { x: d.tx, y: d.ty }, speed: sk.speed, range: Math.hypot(d.tx - rp.x, d.ty - rp.y) + 60, mul: 0, color: d.c || sk.color,
        radius: 6, style: 'arrow', bfx: last ? 'falke' : 'salvo', onRemoteHit: last ? (m) => salvoLastHit(m) : null });
      addEffect({ type: 'bmuzzle3', follow: rp, ox: 0, oy: 0, color: BOW3.violet, dur: 0.45 });
    }));
  });
};

// Pfeilregen (seit 13.76 statt Giftfalle, Platz 2): Ort wählen (Zielkreis, sk.aim), dann zieht der Ninja dreimal
// schnell hintereinander und schießt eine Salve steil in den Himmel (Pose bogenregen: Salve mit fast senkrecht
// gehaltenem Bogen, BOW_DRAW3). Über dem Ort zieht eine dunkle Wolkenschicht auf, und einige Sekunden lang regnet es
// ununterbrochen dunkelviolette Schattenpfeile in den Kreis. Schaden in Pulsen wie beim Blizzard: alle sk.every s
// trifft es alle Gegner im Kreis und bremst sie, solange sie drinstehen – je Puls wenig, über die ganze Dauer mehr
// als der alte Pfeilhagel (3 × 0,8). Je Rang 0,5 s länger (rainTicks) und dichter (rainRate), ab Erweckt ziehen
// Pfeile Spuren in der Rangfarbe. Alle Pfeile kommen aus einem Samen (seed): Mitspieler sehen denselben Regen.
// shots: Abschüsse der Salve (s nach dem Wirken), stick: so lange stecken die Pfeile, bevor sie zu Schatten zerfallen
const BOW_RAIN = { up: 1.05, stick: 1.3, sink: 0.45, hit0: 0.15 };
function rainTicks(sk, lvl) {
  const r = typeof skillRank === 'function' ? skillRank(lvl || 1) : -1;
  return sk.ticks + (r >= 0 ? r + 1 : 0);
}
// Pfeile je Sekunde: sk.rate, je Rang sk.rankRate mehr
function rainRate(sk, rk) {
  return sk.rate + (rk >= 0 ? (rk + 1) * (sk.rankRate || 0) : 0);
}
function rainPlan(sk) {
  return bowSalvoPlan(sk.shots || 3, sk.shotEvery || 0.14);
}
SKILL_TYPES.bregen = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  const ar = bowArrowShot(p, sk.arrows);
  if (!ar) return false;
  faceTowards(pt.x, pt.y);
  const plan = rainPlan(sk);
  // stehen bleiben, bis der letzte Pfeil der Salve in der Luft ist; das Laufziel bleibt
  lockPlayer(p, plan.rel[plan.rel.length - 1] + 0.08);
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const n = rainTicks(sk, lvl);
  const seed = Math.floor(Math.random() * 1000);
  plan.rel.forEach((at) => later(at, () => { if (!p.dead) bowShotFx(p, sk.color); }));
  rainFx(p, x, y, sk, n, seed, true, pw * ar.mul, ar.color);
  return { tx: x, ty: y, n, sd: seed, c: ar.color };
};
// Bild (für alle gleich) und Pulse (local = eigener Spieler: Schaden; sonst nur Bild und Klang)
function rainFx(owner, x, y, sk, n, seed, local, pw, color) {
  const plan = rainPlan(sk);
  const rk = fxRank >= 0 ? fxRank : -1;
  addEffect({ type: 'bregen3', x, y: y + 9, R: sk.radius, ox: owner.x, oy: owner.y + 9, shooter: owner, shots: plan.rel, delay: sk.delay, every: sk.every, ticks: n,
    rate: rainRate(sk, rk), seed, rk, color: color || sk.color, dur: sk.delay + n * sk.every + BOW_RAIN.stick + BOW_RAIN.sink + 0.3 });
  const mine = owner === game.player;
  later(sk.delay, () => {
    if (typeof snd !== 'undefined') snd.player('el_wind', { x, y, vol: mine ? 0.4 : 0.25, rate: 0.75, rev: 0.3 });
  });
  for (let k = 0; k < n; k++) {
    later(sk.delay + BOW_RAIN.hit0 + k * sk.every, () => {
      // Einschläge: dumpfes Klacken der Pfeile, Staub und Schattenfetzen (2D und 3D)
      if (typeof snd !== 'undefined') snd.player('imp_klinge', { x, y, vol: mine ? 0.26 : 0.16, rate: 1.35 + Math.random() * 0.3 });
      if (k % 2 === 0) particles(x, y + 4, { count: 6, color: ['#1a0e28', '#3a2058', '#6a5a48'], angle: -Math.PI / 2, spread: 1.4, speed: [30, 90], life: [0.3, 0.6], size: [2, 3.5], drag: 3, glow: false, gravity: 260 });
      if (mine && k === 0) shakeScreen(1.4);
      if (!local || owner.dead) return;
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, heavy: false, vfxColor: '#b48cff' });
    });
  }
}
MAGE2_REMOTE.bregen = (rp, sk, d) => {
  const x = d.tx ?? rp.x;
  const y = d.ty ?? rp.y;
  const n = Number.isInteger(d.n) && d.n > 0 && d.n < 30 ? d.n : sk.ticks;
  const rk = Number.isInteger(d.rk) && d.rk >= 0 && d.rk < SKILL_RANKS.length ? d.rk : -1;
  withRank(rk, () => {
    rainFx(rp, x, y, sk, n, d.sd || 1, false, 0, d.c);
    for (const at of rainPlan(sk).rel) later(at, () => addEffect({ type: 'bmuzzle3', follow: rp, ox: 0, oy: 0, color: BOW3.violet, dur: 0.45 }));
  });
};

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
    pierceFx(p, m.x, m.y, f, sk, pierceLen(m.x, m.y, f, sk));
    bowShotFx(p, sk.color);
    shakeScreen(2.2);
  });
  return { c: col, fx: +f0.x.toFixed(2), fy: +f0.y.toFixed(2) };
};
// seit 14.32: der Pfeil (und seine Schattenspirale) endet an der ersten Mauer (arrowFreeLength, kampf.js)
function pierceLen(x, y, f, sk) {
  return typeof arrowFreeLength === 'function' ? Math.max(24, arrowFreeLength(x, y, f, sk.range)) : sk.range;
}
function pierceFx(owner, x, y, f, sk, len = sk.range) {
  addEffect({ type: 'bpierce3', x, y: y + 9, dx: f.x, dy: f.y, len, speed: sk.speed, color: sk.color, dur: len / sk.speed + 0.75 });
}
MAGE2_REMOTE.bpierce = (rp, sk, d) => later(0.18, () => {
  const f = { x: d.fx, y: d.fy };
  spawnProjectile({ owner: 'remote', x: rp.x, y: rp.y, dir: f, speed: sk.speed, range: sk.range, mul: 0, color: d.c || sk.color, radius: 9, style: 'arrow', bfx: 'pierce' });
  pierceFx(rp, rp.x, rp.y, f, sk, pierceLen(rp.x, rp.y, f, sk));
});

// Splitterfalke (seit 14.16, Platz 4 statt Rückensprung): Ort wählen (Zielkreis, sk.aim), der Ninja hebt den Bogen
// schräg nach oben (Pose bogenlob) und schießt einen schweren Schattenpfeil im hohen Bogen dorthin. Im Sturz entfaltet
// sich um den Pfeil ein Schattenfalke mit angelegten Flügeln, er stößt in den Boden und zerbirst: Splitter aus
// schwarzem Schattenglas fliegen nach allen Seiten und bleiben kurz im Boden stecken, Schattenrauch quillt auf, dunkle
// Federn stieben, der Geist des Falken steigt aus dem Rauch auf. Ein Treffer an allen Gegnern im Kreis (sk.radius) mit
// Verlangsamung, sie werden dabei kurz angehoben. Je Rang mehr Splitter (nur Bild), ab Erweckt glüht ein Teil in der
// Rangfarbe. Alle Splitter kommen aus einem Samen (seed): Mitspieler sehen dasselbe Bild.
// rel: Abschuss nach dem Wirken (wie die Salve, BOW_SALVO.first); Flugzeit fly0 + Entfernung / speed;
// stick/sink: so lange stecken die Splitter, bevor sie einsinken und zu Schatten zerfallen; up: Bogen gehoben (Pose)
// spike: so lange nach dem Einschlag brechen die Schattendornen aus dem Boden (zweiter Treffer, seit 14.18)
const BOW_SPLIT = { rel: 0.2, fly0: 0.32, speed: 1150, stick: 1.1, sink: 0.5, up: 0.5, spike: 0.55 };
function splitFlight(ox, oy, x, y) {
  return BOW_SPLIT.fly0 + Math.hypot(x - ox, y - oy) / BOW_SPLIT.speed;
}
SKILL_TYPES.bsplitter = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  const ar = bowArrowShot(p, sk.arrows);
  if (!ar) return false;
  faceTowards(pt.x, pt.y);
  // stehen bleiben, bis der Pfeil von der Sehne ist; das Laufziel bleibt
  lockPlayer(p, BOW_SPLIT.rel + 0.1);
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const seed = Math.floor(Math.random() * 1000);
  later(BOW_SPLIT.rel, () => { if (!p.dead) bowShotFx(p, sk.color); });
  splitFx(p, x, y, sk, seed, true, sk.dmg * pw * ar.mul, ar.color, (sk.spikeDmg || 0) * pw * ar.mul);
  return { tx: x, ty: y, sd: seed, c: ar.color };
};
// Bild (für alle gleich) und Einschlag (local = eigener Spieler: Schaden; sonst nur Bild und Klang)
function splitFx(owner, x, y, sk, seed, local, mul, color, mul2 = 0) {
  const rk = fxRank >= 0 ? fxRank : -1;
  const fly = splitFlight(owner.x, owner.y, x, y);
  const hit = BOW_SPLIT.rel + fly;
  addEffect({ type: 'bsplit3', x, y: y + 9, ox: owner.x, oy: owner.y + 9, shooter: owner, rel: BOW_SPLIT.rel, fly, R: sk.radius, seed, rk,
    color: color || sk.color, dur: hit + BOW_SPLIT.stick + BOW_SPLIT.sink + 0.4 });
  const mine = owner === game.player;
  later(hit, () => {
    // Einschlag: dumpfer Schattenschlag und klirrendes Schattenglas
    if (typeof snd !== 'undefined') {
      snd.player('imp_schatten', { x, y, vol: mine ? 0.5 : 0.32, rate: 0.8 });
      if (snd.file) snd.file('eis_splitter', { x, y, vol: mine ? 0.42 : 0.26, rate: 0.72, rev: 0.3 });
    }
    particles(x, y - 6, { count: 12, color: ['#5a2aa8', '#8a5ae0', '#d8b8ff'], speed: [80, 240], life: [0.3, 0.6], size: [1.5, 3], shape: 'spark', drag: 3 });
    if (mine) {
      shakeScreen(4);
      hitStop(0.05);
    }
    if (!local || owner.dead) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) {
      hitMonster(m, mul, { skill: sk.id, slow: sk.slow, heavy: true, vfxColor: '#b48cff' });
      if (canLift(m)) m.lift = { start: game.time, dur: 0.3, h: 10 };
    }
  });
  // zweiter Treffer (seit 14.18): Schattendornen brechen aus dem Boden der ganzen Fläche, verlangsamen erneut
  later(hit + BOW_SPLIT.spike, () => {
    if (typeof snd !== 'undefined') snd.player('imp_schatten', { x, y, vol: mine ? 0.4 : 0.25, rate: 1.15 });
    if (mine) shakeScreen(2.5);
    if (!local || owner.dead || !mul2) return;
    for (const m of enemiesInCircle(x, y, sk.radius)) {
      hitMonster(m, mul2, { skill: sk.id, slow: sk.slow, vfxColor: '#8a5ae0' });
      if (canLift(m)) m.lift = { start: game.time, dur: 0.25, h: 14 };
    }
  });
}
MAGE2_REMOTE.bsplitter = (rp, sk, d) => {
  if (!isFinite(d.tx) || !isFinite(d.ty)) return;
  const rk = Number.isInteger(d.rk) && d.rk >= 0 && d.rk < SKILL_RANKS.length ? d.rk : -1;
  withRank(rk, () => splitFx(rp, d.tx, d.ty, sk, d.sd || 1, false, 0, d.c));
  later(BOW_SPLIT.rel, () => addEffect({ type: 'bmuzzle3', follow: rp, ox: 0, oy: 0, color: BOW3.violet, dur: 0.45 }));
};

// Schattenschritt (seit 13.67, Platz 5 statt Falkenblick): Ort wählen (Zielkreis), in Schattenrauch zerfallen,
// kurz unsichtbar und am Ziel mit einer Schattenexplosion wieder auftauchen. Wände, Wasser und Dörfer halten auf
// (wie beim Elementsprung). Am Ziel leichter Schaden und Verlangsamung – vor allem ist es ein Fluchtschritt.
// Seit 13.70 ausdrücklich ein Fluchtschritt: der Zielkreis beginnt hinter der Figur, vom Gegner weg (sk.aimAway,
// startAim in kampf.js), der Ort wird frei gewählt – nie automatisch auf den Gegner (vorher begann der Kreis auf dem
// Ziel, zweimal Antippen sprang mitten hinein)
SKILL_TYPES.bshadow = function (sk, pw) {
  const p = game.player;
  const pt = game.aim && game.aim.sk.id === sk.id ? game.aim.pt : aimAwayPoint(p, sk);
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
  // seit 13.70 aufwendiger (bshadow3): Figur zerfällt zu Schattenrauch mit peitschenden Schattenranken, ein Schattenfalke
  // zieht eine violette Spur zum Ziel, dort Sog, Wiedererscheinen und ein Schattenstoß mit Druckwelle und Federn
  addEffect({ type: 'bshadow3', x: b.x, y: b.y + 9, x0: a.x, y0: a.y + 9, hide: sk.hide, R: sk.radius, rk: fxRank, dur: sk.hide + 1.2, seed: Math.random() * 9 });
  particles(a.x, a.y - 10, { count: 16, color: ['#0a0610', '#2a1640', '#5a2aa8'], speed: [40, 140], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
  later(sk.hide, () => {
    particles(b.x, b.y - 10, { count: 18, color: ['#0a0610', '#2a1640', '#8a5ae0'], speed: [60, 180], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
    if (typeof snd !== 'undefined') snd.player('imp_schatten', { x: b.x, y: b.y, vol: owner === game.player ? 0.45 : 0.3 });
    if (owner === game.player) shakeScreen(2);
    if (!local || owner.dead) return;
    for (const m of enemiesInCircle(b.x, b.y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, stun: sk.stun, vfxColor: '#b48cff' });
  });
}
MAGE2_REMOTE.bshadow = (rp, sk, d) => {
  if (!isFinite(d.x1) || !isFinite(d.y1)) return;
  const rk = Number.isInteger(d.rk) && d.rk >= 0 && d.rk < SKILL_RANKS.length ? d.rk : -1;
  withRank(rk, () => shadowStepFx(rp, { x: d.x0 ?? rp.x, y: d.y0 ?? rp.y }, { x: d.x1, y: d.y1 }, sk, false, 0));
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
  // seit 13.70 Salve: jeder Pfeil ein kleiner Schattenriss, der letzte zusätzlich der Schattenstoß (salvoLastHit)
  falkenpfeil: {
    color: BOW_HITC,
    hit(m, crit) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: BOW_HITC, dur: 0.6, seed: Math.random() * 9 });
      particles(c.x, c.y, { count: crit ? 14 : 7, color: ['#1a0e28', '#5a2aa8', BOW_HITC], speed: [80, 220], life: [0.2, 0.4], size: [1.5, 3], shape: 'spark', drag: 5 });
    }
  },
  // seit 13.76 Pfeilregen statt Giftfalle: je Puls nur ein paar Schattenfunken und Splitter (viele Treffer hintereinander)
  pfeilregen: {
    color: '#a070f0',
    hit(m) {
      const c = bodyCenter(m);
      particles(c.x, c.y - 4, { count: 4, color: ['#120a1a', '#5a2aa8', '#c49aff'], angle: Math.PI / 2, spread: 0.8, speed: [40, 110], life: [0.2, 0.4], size: [1.4, 2.6], shape: 'spark', drag: 4 });
    }
  },
  durchschuss: {
    color: '#a070f0',
    hit(m) {
      const c = bodyCenter(m);
      addEffect({ type: 'bhit3', x: c.x, y: feetY(m), color: '#a070f0', dur: 0.55, seed: Math.random() * 9 });
    }
  },
  // seit 14.16 Splitterfalke statt Rückensprung: großer Schattenriss mit vielen Federn (der Einschlag selbst ist bsplit3)
  splitterfalke: {
    color: '#9a6ae0',
    hit(m) {
      addEffect({ type: 'bhit3', x: m.x, y: feetY(m), color: '#9a6ae0', big: true, dur: 0.6, seed: Math.random() * 9 });
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
Object.assign(SKILL_SND, { falkenpfeil: 'schatten', pfeilregen: 'schatten', durchschuss: 'schatten', splitterfalke: 'schatten', falkenblick: 'schatten', schattenwechsel: 'schatten' });

// Werte im Fertigkeitsfenster (oberflaeche.js skillStats)
function bowSkillStats(sk, lvl, out) {
  if (!sk || !sk.type || !['bshot', 'bregen', 'bpierce', 'bsplitter', 'bshadow'].includes(sk.type)) return;
  if (sk.type === 'bshadow') {
    out.push(['Schritt', 'bis ' + sk.range + ' · Ort frei wählen'], ['Unsichtbar', numDe(sk.hide) + ' s'], ['Fläche', 'r ' + sk.radius],
      ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
    return;
  }
  const dmg = (v) => skillHitNum(v, lvl);
  // seit 13.70: Salve (Pfeile × Schaden, der letzte härter); seit 13.76 Pfeilregen (Pulse je Rang, statt Giftfalle)
  if (sk.type === 'bshot') {
    const s = bowSalvoSpec(sk, lvl);
    const lm = sk.lastMul || 1;
    out.push(['Salve', `${s.count} Pfeile: ${s.count > 1 ? (s.count - 1) + ' × ' + dmg(s.dmg) + ', letzter ' : ''}${dmg(s.dmg * lm)}`],
      ['Zusammen', dmg(s.dmg * (s.count - 1 + lm))], ['Reichweite', String(sk.range)], ['Stößt zurück', 'letzter Pfeil']);
    if (sk.rankCount && skillRank(lvl) < sk.rankCount.rank) out.push(['Ab ' + SKILL_RANKS[sk.rankCount.rank].name, sk.rankCount.count + ' Pfeile']);
  }
  if (sk.type === 'bregen') {
    const n = rainTicks(sk, lvl);
    out.push(['Pulse', `${n} × ${dmg(sk.dmg)}`], ['Zusammen', dmg(sk.dmg * n)], ['Dauer', numDe(n * sk.every) + ' s'],
      ['Verlangsamt', `${skillPct(sk.slow.amount)} · solange im Regen`], ['Fläche', 'r ' + sk.radius], ['Reichweite', String(sk.range)],
      ['Pfeilverbrauch', String(sk.arrows)]);
  }
  if (sk.type === 'bpierce') out.push(['Durchbohrt', ''], ['Linie', String(sk.range)]);
  // seit 14.16 Splitterfalke (Schaden zeigt skillStats): ein Treffer an allen Gegnern im Kreis
  if (sk.type === 'bsplitter') out.push(['Schattendornen', `danach ${dmg(sk.spikeDmg || 0)} · verlangsamt erneut`], ['Fläche', 'r ' + sk.radius + ' · alle Gegner'], ['Reichweite', String(sk.range)],
    ['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`], ['Pfeilverbrauch', String(sk.arrows)]);
  const p = game.player;
  const i = p ? bowArrowSort(p) : -1;
  if (i >= 0) out.push(['Pfeile', `${ARROW_TYPES[i].name} +${Math.round(ARROW_TYPES[i].dmg * 100)} %`]);
}

// --- Posen (SKILL_POSE3, drei-figuren.js) ------------------------------------------------------------------
// Bogenzug: Bogen hoch aufs Ziel, die Zughand zieht die Sehne bis an die Wange, Schuss, Zughand fliegt zurück, nachhalten.
// Seit 13.59 wie der Grundangriff mit der Zughand vor dem Körper (vorher schwang sie seitlich weit vom Körper weg und
// der Bogen hing tief). Bogenhimmel (Pfeilhagel) ist seit 13.70 mit der Giftfalle weggefallen, dafür die Salven;
// seit 13.76 schießt der Pfeilregen wieder in den Himmel: eine Salve mit steil gehaltenem Bogen (bogenregen).
const BOW_POSE = {
  bogenzug: [[0, N3], [0.22, { rx: -1.6, wx: 1.45, lx: -1.65, lz: -0.55, cy: 0.08, gr: 0.12, hpy: -0.02 }, 'out'],
    [0.42, { rx: -1.78, wx: 1.5, lx: -1.9, lz: -0.95, hx: -0.05, gr: 0.14, hpy: -0.03 }],
    [0.5, { rx: -1.74, wx: 1.5, lx: -1.4, lz: -1.3, hx: -0.05, gr: 0.14, hpy: -0.03, hpz: -0.03 }, 'out'],
    [0.75, { rx: -1.68, wx: 1.48, lx: -1.35, lz: -1.22, gr: 0.1 }], [1, N3]]
};
// Salven des Falkenpfeils (seit 13.70): eine Pose je Pfeilzahl, aus den Daten (count/every, rankCount)
(function () {
  const path = CLASSES.ninja && CLASSES.ninja.paths.find((pt) => pt.id === 'falke');
  const sk = path && path.skills.find((x) => x.type === 'bshot');
  if (!sk) return;
  for (let n = 1; n <= (sk.count || 1); n++) bowSalvoRegister(n, sk.every || 0.15);
  if (sk.rankCount) bowSalvoRegister(sk.rankCount.count, sk.rankCount.every || sk.every || 0.15);
  // seit 13.76 Pfeilregen: Salve steil in den Himmel – Bogen fast senkrecht (BOW_RAIN.up), Oberkörper und Kopf
  // nach hinten geneigt, breiter Stand
  const rain = path.skills.find((x) => x.type === 'bregen');
  if (rain) bowSalvoRegister(rain.shots || 3, rain.shotEvery || 0.14, { kind: rain.anim, up: BOW_RAIN.up,
    hold: { rx: -2.2, wx: 1.25, lx: -2.15, lz: -0.8, cx: -0.14, cy: 0.05, hx: -0.28, gl: -0.12, gr: 0.18, hpy: -0.03 } });
  // seit 14.16 Splitterfalke: ein schwerer Schuss mit schräg gehobenem Bogen (hoher Bogenschuss), Oberkörper leicht zurück
  const lob = path.skills.find((x) => x.type === 'bsplitter');
  if (lob) bowSalvoRegister(1, 0.15, { kind: lob.anim, up: BOW_SPLIT.up,
    hold: { rx: -1.95, wx: 1.36, lx: -1.98, lz: -0.9, cx: -0.08, cy: 0.06, hx: -0.15, gl: -0.06, gr: 0.16, hpy: -0.03 } });
})();
if (typeof SKILL_POSE3 !== 'undefined' && typeof poseKeys3 === 'function') {
  for (const k of Object.keys(BOW_POSE)) SKILL_POSE3[k] = (B, sw) => poseKeys3(B, BOW_POSE[k], sw);
}

// --- Ultimative Attacke: Sturm des Schattenadlers ---------------------------------------------------------
// seit 14.94: eine Sekunde den Bogen spannen (die Schattenenergie sammelt sich, der Adler formt sich auf der Sehne),
// dann fliegt der leuchtende Schattenadler als Pfeil schnell aufs Ziel und schlägt dort ein: Schaden im kleinen
// Umkreis und Betäubung. Kein Pfeilsturm mehr danach (war zu stark). Verbraucht 3 Pfeile.
const ULT_EAGLE = { charge: 1.0, speed: 1100, R: 130, mul: 7, stun: 1.5, arrows: 3, h: 1.15 };
const ULT_EAGLE_POSE = 'adlerzug';
// Zug-Pose: langsam voll ausziehen, halten, bei 77 % loslassen (Dauer so, dass das genau nach ULT_EAGLE.charge ist)
const ULT_EAGLE_DUR = ULT_EAGLE.charge / 0.77;
(function () {
  if (typeof BOW_DRAW3 !== 'undefined') BOW_DRAW3[ULT_EAGLE_POSE] = { w: [0.04, 0.5, 0.77], up: 0.05 };
  const hold = { rx: -1.75, wx: 1.5, lx: -1.85, lz: -1.05, cx: -0.05, cy: 0.08, gr: 0.16, hpy: -0.035 };
  BOW_POSE[ULT_EAGLE_POSE] = [[0, N3], [0.12, hold, 'out'], [0.76, { ...hold, cx: -0.09, hx: -0.04 }],
    [0.8, { ...hold, hx: -0.14, hpz: -0.05, cx: 0.06 }, 'out'], [0.9, hold], [1, N3]];
  if (typeof SKILL_POSE3 !== 'undefined' && typeof poseKeys3 === 'function') {
    SKILL_POSE3[ULT_EAGLE_POSE] = (B, sw) => poseKeys3(B, BOW_POSE[ULT_EAGLE_POSE], sw);
  }
})();
ULT_RUN.himmelsfalke = function (p, u, pw) {
  if (!bowCanShoot(p, ULT_EAGLE.arrows)) return false;
  const t = pickTarget(680);
  let tx = t ? t.x : p.x + p.facing.x * 300;
  let ty = t ? t.y : p.y + p.facing.y * 300;
  faceTowards(tx, ty);
  const ar = bowArrowShot(p, ULT_EAGLE.arrows);
  if (!ar) return false;
  pw *= ar.mul;
  p.ultAt = { x: tx, y: ty };
  // stehen bleiben und spannen; useUltimate setzt danach seine eigene Pose – unsere kommt ein Bild später
  lockPlayer(p, ULT_EAGLE.charge + 0.12);
  later(0, () => { if (!p.dead) startSwing(p, ULT_EAGLE_POSE, ULT_EAGLE_DUR); });
  const e = ultEagleFx(p, tx, ty);
  if (typeof snd !== 'undefined') snd.player('imp_schatten', { x: p.x, y: p.y, vol: 0.25, rate: 0.6 });
  later(ULT_EAGLE.charge, () => {
    if (p.dead) { e.cancel = true; return; }
    // das Ziel kann sich während des Spannens bewegt haben
    if (t && !t.dead) { tx = t.x; ty = t.y; }
    faceTowards(tx, ty);
    const fly = ultEagleRelease(e, p, tx, ty);
    bowShotFx(p, '#b48cff');
    shakeScreen(3);
    later(fly, () => {
      if (typeof snd !== 'undefined') snd.player('imp_schatten', { x: tx, y: ty, vol: 0.6, rate: 0.75 });
      shakeScreen(9);
      flashScreen('#1a0830', 0.25);
      hitStop(0.08);
      particles(tx, ty - 8, { count: 22, color: ['#1a0e28', '#5a2aa8', '#8a5ae0', '#e0ccff'], speed: [90, 300], life: [0.3, 0.7], size: [1.5, 3.4], shape: 'spark', drag: 3 });
      if (p.dead) return;
      ultHitCircle(tx, ty, ULT_EAGLE.R, ULT_EAGLE.mul * pw, { stun: ULT_EAGLE.stun, knockback: 110, vfxColor: '#b48cff' });
    });
  });
};
// Bild für alle: shooter = Figur (eigene oder Mitspieler); bis zum Loslassen folgt der Bogen der Figur
function ultEagleFx(shooter, tx, ty) {
  const fly0 = Math.max(0.15, Math.hypot(tx - shooter.x, ty - shooter.y) / ULT_EAGLE.speed);
  return addEffect({ type: 'beagle3', x: tx, y: ty, shooter, charge: ULT_EAGLE.charge, fly: fly0, color: '#8a5ae0',
    dur: ULT_EAGLE.charge + fly0 + 2 });
}
// Loslassen: Startpunkt festhalten, Ziel nachführen, Flugzeit zurückgeben
function ultEagleRelease(e, shooter, tx, ty) {
  e.sx = shooter.x;
  e.sy = shooter.y;
  e.shooter = null;
  e.x = tx;
  e.y = ty;
  e.fly = Math.max(0.15, Math.hypot(tx - e.sx, ty - e.sy) / ULT_EAGLE.speed);
  e.dur = e.charge + e.fly + 2;
  return e.fly;
}
// Mitspieler: dasselbe Schauspiel von der nächsten Figur aus, ohne Schaden
ULT_SHOW.himmelsfalke = (x, y) => {
  let src = null;
  if (typeof net !== 'undefined' && net.players) {
    let best = Infinity;
    for (const rp of net.players.values()) {
      const d = Math.hypot(rp.x - x, rp.y - y);
      if (d < best && d < 800) { best = d; src = rp; }
    }
  }
  if (!src) src = { x, y: y + 200 };
  const e = ultEagleFx(src, x, y);
  later(ULT_EAGLE.charge, () => {
    const fly = ultEagleRelease(e, src, x, y);
    later(fly, () => { if (typeof snd !== 'undefined') snd.player('imp_schatten', { x, y, vol: 0.4, rate: 0.75 }); });
  });
};
// Bogenpunkt (Welt) und Richtung zum Ziel: vor der Figur auf Bogenhöhe
function ultEagleBow(e) {
  const sx = e.shooter ? e.shooter.x : e.sx;
  const sy = e.shooter ? e.shooter.y : e.sy;
  const dx = e.x - sx;
  const dy = e.y - sy;
  const L = Math.hypot(dx, dy) || 1;
  return { x: sx + dx / L * 16, y: sy + dy / L * 10, fx: dx / L, fy: dy / L, L };
}

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
// seit 14.12 kürzer (0,34 statt 0,5): fliegende und steckende Pfeile wirkten viel zu lang
const BOW_ARROW_LEN = 0.34;
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

// --- Schattenadler (seit 14.93): echter 3D-Adler der Ultimativen Attacke statt des flachen Falken ------------------
// Schwarzes Gefieder mit violettem Schimmer, goldener Hakenschnabel, glühende Augen, gefingerte Handschwingen,
// Schwanzfächer und Fänge, die er beim Zustoßen nach vorn reißt. Ein Körper je Vorrat (fx3Take 'eagle'), Haltung
// und Flügelschlag werden jedes Bild gesetzt (bowEagle3). Örtliche Achsen: +X vorn, +Y oben, +Z rechter Flügel.
const EAGLE3 = { span: 2.9 };
function eagle3Build() {
  const G = FX3.geo;
  if (!G.eagleBody) {
    G.eagleBody = new THREE.SphereGeometry(1, 14, 10);
    G.eagleBeak = new THREE.ConeGeometry(1, 1, 8);
    G.eagleLeg = new THREE.CylinderGeometry(1, 0.8, 1, 6);
    const flat = (pts, curve) => {
      const sh = new THREE.Shape();
      sh.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        if (curve && pts[i].length === 4) sh.quadraticCurveTo(pts[i][2], pts[i][3], pts[i][0], pts[i][1]);
        else sh.lineTo(pts[i][0], pts[i][1]);
      }
      sh.closePath();
      const g = new THREE.ShapeGeometry(sh, 6);
      g.rotateX(Math.PI / 2); // Fläche liegt waagerecht, Formhöhe zeigt nach +Z (außen)
      return g;
    };
    // Armflügel: breit, Vorderkante leicht gebogen, Hinterkante mit gestuften Armschwingen
    G.eagleArm = flat([[0.14, 0], [0.12, 0.58, 0.2, 0.3], [-0.06, 0.6], [-0.2, 0.52], [-0.3, 0.44], [-0.27, 0.34], [-0.34, 0.26], [-0.3, 0.16], [-0.36, 0.08], [-0.32, 0]], true);
    // Handflügel: schmaler Ansatz der Schwungfedern
    G.eagleHand = flat([[0.12, 0], [0.04, 0.3, 0.12, 0.16], [-0.12, 0.33], [-0.26, 0.12], [-0.26, 0]], true);
    // eine Schwungfeder (Finger), 1 lang
    G.eagleFeather = flat([[0, -0.05], [0.07, 0.25], [0.045, 0.85], [0, 1], [-0.045, 0.85], [-0.07, 0.25]]);
    // Schwanzfächer nach hinten (-X): Formhöhe = Breite
    const tail = new THREE.Shape();
    tail.moveTo(0, -0.06);
    tail.lineTo(-0.38, -0.17);
    tail.quadraticCurveTo(-0.46, 0, -0.38, 0.17);
    tail.lineTo(0, 0.06);
    tail.closePath();
    G.eagleTail = new THREE.ShapeGeometry(tail, 6);
    G.eagleTail.rotateX(Math.PI / 2);
  }
  const mat = (c, em, side) => new THREE.MeshLambertMaterial({ color: c, emissive: em, transparent: true, opacity: 1, side: side ? THREE.DoubleSide : THREE.FrontSide });
  const M = {
    body: mat('#141016', '#050208'), head: mat('#1e1a20', '#060309'), wing: mat('#0f0c11', '#040206', true),
    cov: mat('#221c26', '#07030c', true), tip: mat('#100c14', '#14062a', true), beak: mat('#e8b030', '#4a2a00'), leg: mat('#d8a028', '#3a2000'), claw: mat('#0a0608', '#000000')
  };
  const o = new THREE.Group();
  const add = (parent, geo, m, p, s, r) => {
    const x = new THREE.Mesh(geo, m);
    x.position.set(p[0], p[1], p[2]);
    x.scale.set(s[0], s[1], s[2]);
    if (r) x.rotation.set(r[0], r[1], r[2]);
    parent.add(x);
    return x;
  };
  // Rumpf, Brust, Nacken, Kopf
  add(o, G.eagleBody, M.body, [0, 0, 0], [0.42, 0.16, 0.18]);
  add(o, G.eagleBody, M.body, [0.17, -0.035, 0], [0.24, 0.15, 0.17]);
  add(o, G.eagleBody, M.head, [0.36, 0.03, 0], [0.13, 0.1, 0.1]);
  add(o, G.eagleBody, M.head, [0.47, 0.06, 0], [0.12, 0.105, 0.1]);
  // Brauenwulst (grimmiger Blick)
  for (const s of [-1, 1]) add(o, G.eagleBody, M.head, [0.52, 0.11, s * 0.05], [0.06, 0.025, 0.035], [0, 0, -0.3]);
  // Hakenschnabel: oberer Kegel nach vorn, Spitze nach unten gebogen
  add(o, G.eagleBeak, M.beak, [0.6, 0.05, 0], [0.05, 0.16, 0.042], [0, 0, -Math.PI / 2 - 0.12]);
  add(o, G.eagleBeak, M.beak, [0.665, 0.02, 0], [0.022, 0.07, 0.02], [0, 0, -Math.PI + 0.35]);
  add(o, G.eagleBody, M.beak, [0.545, 0.075, 0], [0.04, 0.03, 0.045]);
  // glühende Augen
  const eyeMat = new THREE.SpriteMaterial({ map: fx3Texture('disc'), color: 0xc49aff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  for (const s of [-1, 1]) {
    const e = new THREE.Sprite(eyeMat);
    e.position.set(0.53, 0.085, s * 0.072);
    e.scale.set(0.085, 0.085, 1);
    o.add(e);
  }
  // Schwanzfächer
  const tail = add(o, G.eagleTail, M.wing, [-0.32, 0.01, 0], [1, 1, 1]);
  for (let i = 0; i < 7; i++) {
    const f = add(tail, G.eagleFeather, i % 2 ? M.tip : M.wing, [0, 0.004 + Math.abs(i - 3) * 0.002, 0], [1.3, 1, 0.42], [0, -Math.PI / 2 + (i - 3) * 0.13, 0]);
    f.renderOrder = 5;
  }
  // Nackenfedern (gesträubt) und befiederte Hosen
  for (let i = 0; i < 5; i++) add(o, G.eagleBeak, M.head, [0.36 - i * 0.025, 0.1 - Math.abs(i - 2) * 0.008, (i - 2) * 0.035], [0.025, 0.12, 0.02], [0, 0, Math.PI / 2 - 0.5]);
  for (const s of [-1, 1]) add(o, G.eagleBody, M.body, [0.02, -0.11, s * 0.07], [0.09, 0.07, 0.06]);
  // Flügel: Seite (gespiegelt) → Schulter (Schlag, Rückfaltung) → Ellbogen (Hand nachziehen) → Schwungfedern
  const wings = [];
  const tips = [];
  for (const s of [1, -1]) {
    const side = new THREE.Group();
    side.scale.z = s;
    side.position.set(0.07, 0.05, 0);
    const sh = new THREE.Group();
    sh.position.z = 0.1;
    side.add(sh);
    add(sh, G.eagleArm, M.wing, [0, 0, 0], [1, 1, 1]);
    // Deckfedern: zweite, kleinere Lage mit Schimmer
    add(sh, G.eagleArm, M.cov, [0.03, 0.012, 0.02], [0.55, 1, 0.78]);
    // seit 14.94 detailreicher: Armschwingen als einzelne Federn an der Hinterkante, darüber eine Reihe Deckfedern
    for (let i = 0; i < 7; i++) {
      const z = 0.06 + i * 0.075;
      add(sh, G.eagleFeather, i % 2 ? M.wing : M.tip, [-0.24, -0.004, z], [1.1, 1, 0.2 + (i % 3) * 0.015], [0, -Math.PI / 2 + 0.12 - i * 0.03, 0]);
      add(sh, G.eagleFeather, M.cov, [-0.06, 0.016, z + 0.02], [0.9, 1, 0.13], [0, -Math.PI / 2 + 0.2, 0]);
    }
    const el = new THREE.Group();
    el.position.set(-0.04, 0, 0.56);
    sh.add(el);
    add(el, G.eagleHand, M.wing, [0, 0, 0], [1, 1, 1]);
    const fingers = [];
    for (let i = 0; i < 6; i++) {
      const f = add(el, G.eagleFeather, i < 2 ? M.wing : M.tip, [-0.02 - i * 0.045, -0.003 * i, 0.26 - i * 0.02], [1, 1, 0.42 - Math.abs(i - 1.5) * 0.03]);
      f.rotation.y = 0.32 - i * 0.2;
      fingers.push(f);
    }
    const tip = new THREE.Object3D();
    tip.position.set(-0.05, 0, 0.7);
    el.add(tip);
    tips.push(tip);
    o.add(side);
    wings.push({ sh, el, fingers });
  }
  // Fänge: Bein mit drei Krallen, um die Hüfte drehbar
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.04, -0.1, s * 0.07);
    add(hip, G.eagleLeg, M.leg, [0, -0.09, 0], [0.025, 0.18, 0.025]);
    for (const [a, b] of [[0, 0], [0.5, 0.35], [-0.5, -0.35]]) add(hip, G.eagleBeak, M.claw, [0.025, -0.2, b * 0.06], [0.013, 0.07, 0.013], [a * 0.3, 0, -2.2]);
    o.add(hip);
    legs.push(hip);
  }
  for (const k in M) M[k].userData.e0 = M[k].emissive.clone();
  o.userData.eagle = { M, wings, tips, legs, tail, eyeMat };
  return o;
}
if (typeof fx3Make === 'function') {
  const fx3Make0 = fx3Make;
  // eslint-disable-next-line no-global-assign
  fx3Make = function (kind) {
    if (kind !== 'eagle') return fx3Make0(kind);
    const o = eagle3Build();
    o.renderOrder = 5;
    o.userData.kind = kind;
    FX3.group.add(o);
    return o;
  };
}
const _eaX = new THREE.Vector3();
const _eaY = new THREE.Vector3();
const _eaZ = new THREE.Vector3();
const _eaM = new THREE.Matrix4();
const _eaUp = new THREE.Vector3(0, 1, 0);
const _eaGlowC = new THREE.Color('#7a3ae0');
const _eaP = new THREE.Vector3();
// pose: { flap: Schlag (−1 oben … 1 unten), sweep: Rückfaltung 0–1, talon: Fänge vor 0–1, roll: Schräglage }
function bowEagle3(h, x, y, z, fwd, span, pose, op, low) {
  if (op <= 0.01) return;
  const o = fx3Take(h, 'eagle');
  const E = o.userData.eagle;
  _eaX.copy(fwd).normalize();
  _eaZ.crossVectors(_eaX, _eaUp);
  if (_eaZ.lengthSq() < 1e-4) _eaZ.set(0, 0, 1);
  _eaZ.normalize();
  _eaY.crossVectors(_eaZ, _eaX);
  _eaM.makeBasis(_eaX, _eaY, _eaZ);
  o.quaternion.setFromRotationMatrix(_eaM);
  if (pose.roll) o.rotateX(pose.roll);
  o.position.set(x, y, z);
  o.scale.setScalar(span / EAGLE3.span);
  const fl = pose.flap || 0;
  const sw = pose.sweep || 0;
  for (const w of E.wings) {
    w.sh.rotation.set(fl * 0.55 - sw * 0.25, -sw * 0.75, 0);
    // die Hand zieht beim Schlag nach (Welle durch den Flügel), beim Anlegen klappt sie nach hinten
    w.el.rotation.set(fl * 0.35 + Math.max(0, -fl) * 0.15, -sw * 0.6, 0);
    for (let i = 0; i < w.fingers.length; i++) w.fingers[i].rotation.y = (0.32 - i * 0.2) * (1 - sw * 0.7) - sw * 0.25;
  }
  E.tail.scale.set(1, 1, 1 + (pose.talon || 0) * 0.5);
  E.tail.rotation.z = -(pose.talon || 0) * 0.35;
  for (const l of E.legs) l.rotation.z = -1.25 + (pose.talon || 0) * 2.1;
  // pose.glow (seit 14.94): als Pfeil leuchtet das Gefieder von innen violett
  const gl = pose.glow || 0;
  for (const k in E.M) {
    const m = E.M[k];
    m.opacity = op;
    m.emissive.copy(m.userData.e0);
    if (gl && k !== 'beak' && k !== 'claw') m.emissive.lerp(_eaGlowC, gl * (k === 'tip' || k === 'cov' ? 0.75 : 0.45));
  }
  E.eyeMat.opacity = op;
  // dunkle Aura: Rauch und violetter Schein um Rumpf und Flügelspitzen
  const s = span / EAGLE3.span;
  n3Glow(h, x, y, z, span * 0.55, BOW3.violet, 0.16 * op);
  n3Smoke(h, x - _eaX.x * 0.4 * s, y + 0.1 * s, z - _eaX.z * 0.4 * s, span * 0.32, BOW3.smoke, 0.32 * op);
  o.updateMatrixWorld(true);
  for (const t of E.tips) {
    t.getWorldPosition(_eaP);
    n3Glow(h, _eaP.x, _eaP.y, _eaP.z, span * 0.1, BOW3.violet, 0.35 * op);
    if (!low) n3Smoke(h, _eaP.x - _eaX.x * 0.3, _eaP.y, _eaP.z - _eaX.z * 0.3, span * 0.14, BOW3.smoke, 0.4 * op);
  }
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
    const big = pr.bfx === 'falke' || pr.bfx === 'pierce' ? 1.3 : pr.bfx === 'salvo' ? 1.12 : 1;
    // Salve (seit 13.70): Pfeile mit violett leuchtender Spitze, die Farbe der Pfeilsorte bleibt an den Federn
    const violet = pr.bfx === 'salvo' || pr.bfx === 'falke';
    const col = pr.color || '#c9a36a';
    // seit 13.67 Schattenmagie: dunkler Rauchschweif, violetter Kern, Pfeil mit dunklen Federn
    _bw3s.set(-_bw3d.z, 0, _bw3d.x);
    // seit 14.12 ein kurzer Schweif direkt hinter dem Pfeil (vorher 8 Wolken bis 2 weit und eine 1,1 lange Spur:
    // der Pfeil sah aus wie ein langer Strich)
    const puffs = low ? 3 : 5;
    for (let i = 0; i < puffs; i++) {
      const back = (0.24 + i * 0.1) * big;
      const wob = Math.sin(t * 9 + i * 1.7 + (pr.x + pr.y) * 0.01) * 0.06 * i / puffs;
      n3Smoke(h, x - _bw3d.x * back + _bw3s.x * wob, y + i * 0.02 + wob * 0.5, z - _bw3d.z * back + _bw3s.z * wob, (0.14 + i * 0.03) * big, i % 2 ? BOW3.smoke : BOW3.shadow, 0.5 * (1 - i / puffs));
    }
    _bw3a.set(x - _bw3d.x * 0.24 * big, y, z - _bw3d.z * 0.24 * big);
    _bw3b.set(x - _bw3d.x * (0.24 + 0.32 * big), y, z - _bw3d.z * (0.24 + 0.32 * big));
    const st = fx3Take(h, 'segN');
    fx3Segment(st, _bw3b, _bw3a, 0.016 * big);
    fx3Color(st, '#3a1670', 0.65);
    // Schatten am Boden unter dem Pfeil (Tiefe: man sieht, dass er fliegt)
    mGround(h, 'planeNBowPS', 'disc', pr.x - _bw3d.x * 6, pr.y - _bw3d.z * 6, 0.32 * big, 0.025, 0, BOW3.dark, 0.3);
    bowArrow3(h, x, y, z, _bw3d, BOW_ARROW_LEN * big, violet ? BOW3.violet2 : col, 1, 0, pr.arrow >= 2 || violet ? col : BOW3.shadow);
    n3Glow(h, x + _bw3d.x * 0.22 * big, y, z + _bw3d.z * 0.22 * big, (pr.arrow >= 5 ? 0.42 : 0.3) * big, BOW3.violet, 0.5);
    if (pr.bfx === 'salvo') {
      // leuchtender Schaft, violetter Kern an der Spitze und eine gedrehte Schattenspur
      _bw3a.set(x - _bw3d.x * 0.3, y, z - _bw3d.z * 0.3);
      _bw3b.set(x + _bw3d.x * 0.2, y, z + _bw3d.z * 0.2);
      const gl = fx3Take(h, 'seg');
      fx3Segment(gl, _bw3a, _bw3b, 0.05);
      fx3Color(gl, BOW3.violet, 0.55);
      n3Glow(h, x + _bw3d.x * 0.3, y, z + _bw3d.z * 0.3, 0.32, BOW3.violet2, 0.85);
      const m = low ? 5 : 8; // seit 14.12 kürzer (vorher 12 Glieder bis 1,2 weit)
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 0; i <= m; i++) {
        const back = 0.08 + i * 0.06;
        const a = t * 24 - i * 0.8 + (pr.x + pr.y) * 0.02;
        const r = 0.1 + i * 0.012;
        const nx = x - _bw3d.x * back + _bw3s.x * Math.cos(a) * r;
        const ny = y + Math.sin(a) * r;
        const nz = z - _bw3d.z * back + _bw3s.z * Math.cos(a) * r;
        if (i) {
          _bw3a.set(px, py, pz);
          _bw3b.set(nx, ny, nz);
          const sg = fx3Take(h, 'segN');
          fx3Segment(sg, _bw3a, _bw3b, 0.026 * (1 - i / (m + 3)));
          fx3Color(sg, i % 2 ? '#7a4ad0' : '#1a0a2a', 0.9 * (1 - i / (m + 1)));
        }
        px = nx;
        py = ny;
        pz = nz;
      }
      if (!low) for (let i = 0; i < 2; i++) n3Glow(h, x - _bw3d.x * (0.35 + i * 0.2), y + 0.04 * i, z - _bw3d.z * (0.35 + i * 0.2), 0.18 - i * 0.04, BOW3.violet, 0.35 - i * 0.1);
    } else if (pr.bfx === 'falke') {
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
      const m = low ? 6 : 10; // seit 14.12 kürzer (vorher 16 Glieder)
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
    } else if (pr.bfx === 'pierce') {
      // zwei Schattenbänder spiralen um die Flugbahn
      const m = low ? 6 : 10; // seit 14.12 kürzer (vorher 16 Glieder, 2,4 lang)
      for (let s2 = 0; s2 < 2; s2++) {
        let px = 0;
        let py = 0;
        let pz = 0;
        for (let i = 0; i <= m; i++) {
          const back = i * 0.08;
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
// seit 13.70: brain3 (Pfeilhagel) weg, dazu Salve (bsalvo3, bsalvohit3); seit 13.76 Pfeilregen (bregen3) statt Giftfalle
['bmuzzle3', 'bhit3', 'bpierce3', 'bsplit3', 'beye3', 'beagle3', 'bshadow3', 'bsalvo3', 'bsalvohit3', 'bregen3'].forEach((k) => FX3_TYPES.add(k));
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
  // seit 14.38: im Gedränge (FX3.hitCrowd, drei-fx.js) weniger Federn je Treffer
  const n = FX3.hitCrowd ? (e.big ? 5 : 3) : e.big ? 9 : 5;
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

// Salve (seit 13.70): dunkelviolette Aura um Figur und Bogen, solange die Salve läuft. Schwarzvioletter Rauch steigt
// um die Füße auf, zwei Schattenbänder kreisen um die Bogenhand, bei jedem Abschuss pulsiert der violette Schein;
// ab Erwacht kreisen Funken in der Rangfarbe mit
const _bsvH = new THREE.Vector3();
FX3_DRAW.bsalvo3 = function (h, e) {
  const o = e.follow;
  if (!o || o.dead) return;
  const t = game.time - e.start;
  const low = n3low();
  const fade = Math.min(1, t / 0.1) * clamp01((e.dur - t) / 0.3);
  const x = o.x * U3;
  const z = feetY(o) * U3;
  let pulse = 0;
  for (const r of e.rel) if (t >= r) pulse = Math.max(pulse, Math.exp(-(t - r) * 10));
  // Rauch an den Füßen, steigt spiralig auf
  const n = low ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const ph = (t * 1.1 + i / n) % 1;
    const a = i * 2.399 + t * 1.6 + e.seed;
    const r = 0.38 + 0.12 * Math.sin(i + t * 3) - ph * 0.1;
    n3Smoke(h, x + Math.cos(a) * r, 0.1 + ph * 1.9, z + Math.sin(a) * r * 0.8, 0.45 + ph * 0.5, i % 3 ? BOW3.smoke : BOW3.shadow, 0.75 * Math.sin(ph * Math.PI) * fade);
  }
  n3Glow(h, x, 1.0, z, 2.1 + pulse * 0.7, BOW3.violet, (0.35 + 0.3 * pulse) * fade);
  n3Glow(h, x, 0.6, z, 1.2, '#5a2aa8', 0.3 * fade);
  // Bogenhand: Schattenbänder und Schein
  const hand = typeof ninjaHand3 === 'function' ? ninjaHand3(o, _bsvH) : _bsvH.set(x, 1.0, z);
  n3Glow(h, hand.x, hand.y, hand.z, 0.7 + pulse * 0.9, BOW3.violet, (0.45 + 0.4 * pulse) * fade);
  n3Glow(h, hand.x, hand.y, hand.z, 0.25 + pulse * 0.3, BOW3.violet2, (0.5 + 0.4 * pulse) * fade);
  const m = low ? 8 : 14;
  for (let s = 0; s < 2; s++) {
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i <= m; i++) {
      const a = t * 9 * (s ? -1 : 1) - i * 0.32 + s * Math.PI;
      const rr = 0.32 + 0.05 * Math.sin(t * 6 + i);
      const nx = hand.x + Math.cos(a) * rr;
      const ny = hand.y + Math.sin(a * 0.5 + s) * 0.25 + (i / m - 0.5) * 0.3;
      const nz = hand.z + Math.sin(a) * rr;
      if (i) {
        _bw3a.set(px, py, pz);
        _bw3b.set(nx, ny, nz);
        const sg = fx3Take(h, 'segN');
        fx3Segment(sg, _bw3a, _bw3b, 0.028 * (1 - i / (m + 2)));
        fx3Color(sg, s ? '#7a4ad0' : '#16081f', 0.85 * (1 - i / (m + 1)) * fade);
      }
      px = nx;
      py = ny;
      pz = nz;
    }
  }
  // violette Glutfunken steigen auf
  if (!low) for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + i / 6) % 1;
    const a = i * 1.7 + t * 2;
    n3Glow(h, x + Math.cos(a) * 0.5, 0.3 + ph * 1.8, z + Math.sin(a) * 0.4, 0.11, BOW3.violet2, 0.8 * Math.sin(ph * Math.PI) * fade);
  }
  // Rang: Funkenkranz in der Rangfarbe um die Brust (E klein … V größer und dichter)
  if (e.rk >= 0) {
    const col = SKILL_RANKS[e.rk].color;
    const k = 5 + e.rk * 2;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + t * 3.5;
      n3Glow(h, x + Math.cos(a) * (0.55 + e.rk * 0.05), 1.0 + Math.sin(a * 2 + t * 4) * 0.08, z + Math.sin(a) * (0.5 + e.rk * 0.05), 0.14 + e.rk * 0.02, col, 0.75 * fade);
    }
  }
};

// Einschlag des letzten Pfeils der Salve: violetter Blitz, Schattenwand als Druckwelle, Rauchring, dunkle Federn
// und ein kurzer Schattenschaft nach oben (alles räumlich, nichts am Boden gezeichnet)
FX3_DRAW.bsalvohit3 = function (h, e) {
  const t = game.time - e.start;
  const k = clamp01(t / e.dur);
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  const rs = 1 + 0.15 * (e.rk + 1);
  if (t < 0.25) {
    n3Glow(h, x, 0.9, z, 2.6 * rs * (0.5 + t / 0.25), BOW3.violet, 0.75 * (1 - t / 0.25));
    n3Glow(h, x, 0.9, z, 0.9 * rs, '#f0e2ff', 0.8 * (1 - t / 0.25));
  }
  for (let i = 0; i < 2; i++) {
    const w = fx3Take(h, 'wall');
    fx3Wall(w, e.x, e.y, (0.4 + easeOut(k) * 1.9 * rs) * (1 - i * 0.25), 0.9 * (1 - k) + 0.1);
    fx3Color(w, i ? '#7a4ad0' : '#2a1040', 0.45 * (1 - k));
  }
  const n = low ? 8 : 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + e.seed;
    const r = (0.3 + easeOut(k) * 1.6) * rs;
    n3Smoke(h, x + Math.cos(a) * r, 0.25 + k * 0.7 + 0.2 * n2h(i, e.seed), z + Math.sin(a) * r * 0.85, 0.45 + k * 0.6, i % 2 ? BOW3.smoke : BOW3.shadow, 0.75 * (1 - k));
  }
  if (!low) for (let i = 0; i < 8; i++) {
    const a = n2h(i, e.seed + 4) * Math.PI * 2;
    const r = (0.4 + 1.3 * n2h(i, e.seed + 5)) * easeOut(k) * rs;
    bowFeather3(h, x + Math.cos(a) * r, 0.7 + Math.sin(k * Math.PI) * 0.8 - k * 0.5, z + Math.sin(a) * r, 0.3, a + k * 5, 1 - k);
  }
  if (k < 0.5) {
    _bw3a.set(x, 0, z);
    _bw3b.set(x, 2.4 * rs, z);
    const col = fx3Take(h, 'seg');
    fx3Segment(col, _bw3a, _bw3b, 0.35 * (1 - k * 2) + 0.03);
    fx3Color(col, BOW3.violet, 0.4 * (1 - k * 2));
  }
  if (e.rk >= 0 && k < 0.6) n3Glow(h, x, 1.0, z, 1.4 * rs, SKILL_RANKS[e.rk].color, 0.4 * (1 - k / 0.6));
};

// Pfeilregen (seit 13.76): Die Salve fliegt steil aus der Bogenhand in den Himmel, über dem Kreis zieht eine dunkle,
// dezent violett schimmernde Wolkenschicht auf. Dann fallen viele Schattenpfeile aus verschiedenen Höhen, jeder mit
// dunklem Kern und violetter Spur (ab Erweckt ein Teil in der Rangfarbe, je Rang mehr Pfeile). Beim Einschlag blitzt
// es kurz, Staub und Schattenrauch wirbeln auf, Erdkrumen spritzen; die Pfeile bleiben schräg im Boden stecken,
// zittern nach und zerfallen nach einer Weile zu Schatten. Am Boden ziehen nur weiche Schattenschwaden (Rauch im
// Raum, nichts flach auf den Boden gemalt).
const _brA = new THREE.Vector3();
const _brB = new THREE.Vector3();
const _brD = new THREE.Vector3();
const _brH = new THREE.Vector3();
// Pfeile des Regens aus dem Samen (für eigene und fremde gleich): Einschlagzeit, Ort (Welt-Pixel), Fallhöhe,
// Fallzeit und Richtung (schräg von der Seite des Schützen, jeder etwas anders)
function rainArrows(e) {
  if (e._arr) return e._arr;
  const out = [];
  let sx = e.x - e.ox;
  let sz = e.y - e.oy;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  const n = Math.round(e.ticks * e.every * e.rate);
  for (let i = 0; i < n; i++) {
    const s = e.seed * 0.137 + i * 1.731;
    const a = n2h(s, 1) * Math.PI * 2;
    const d = Math.sqrt(n2h(s, 2)) * e.R * 0.96;
    const H = 2.9 + 1.7 * n2h(s, 3);
    const dx = sx * 0.42 + (n2h(s, 5) - 0.5) * 0.34;
    const dz = sz * 0.42 + (n2h(s, 6) - 0.5) * 0.34;
    const l = Math.hypot(dx, 1, dz);
    out.push({ i, at: e.delay + (i + 0.3 + n2h(s, 4) * 0.7) / e.rate, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.85,
      H, fall: 0.12 + H * 0.035, dx: dx / l, dy: -1 / l, dz: dz / l, tr: n2h(s, 7), big: n2h(s, 8) < 0.12 });
  }
  e._arr = out;
  return out;
}
FX3_DRAW.bregen3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const rk = e.rk >= 0 ? e.rk : -1;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const rainEnd = e.delay + e.ticks * e.every;
  const on = clamp01((t - e.delay + 0.45) / 0.6);
  const off = clamp01((t - rainEnd - 0.1) / 1.0);
  const vis = on * (1 - off);
  let sx = e.x - e.ox;
  let sz = e.y - e.oy;
  const sl = Math.hypot(sx, sz) || 1;
  sx /= sl;
  sz /= sl;
  // Salve in den Himmel: die Pfeile verlassen die Bogenhand steil nach oben, mit dunklem Schweif und violettem Schein
  const shots = e.shots || [];
  if (shots.length && t < shots[shots.length - 1] + 0.7) {
    if (!e._sh) e._sh = [];
    const cu = Math.cos(BOW_RAIN.up);
    const su = Math.sin(BOW_RAIN.up);
    shots.forEach((at, k) => {
      const u = (t - at) / 0.6;
      if (u < 0 || u >= 1) return;
      if (!e._sh[k]) {
        const o = e.shooter;
        const hp = o && !o.dead && typeof ninjaHand3 === 'function' ? ninjaHand3(o, _brH) : _brH.set(e.ox * U3, 1.1, e.oy * U3);
        e._sh[k] = { x: hp.x, y: hp.y, z: hp.z };
      }
      const s0 = e._sh[k];
      const sp = (k - (shots.length - 1) / 2) * 0.08;
      _brD.set(sx * cu - sz * sp, su, sz * cu + sx * sp).normalize();
      const L = 0.3 + u * 13;
      const px = s0.x + _brD.x * L;
      const py = s0.y + _brD.y * L;
      const pz = s0.z + _brD.z * L;
      const op = 1 - u * u;
      bowArrow3(h, px, py, pz, _brD, BOW_ARROW_LEN, e.color, op, 0, BOW3.shadow);
      _brA.set(px, py, pz);
      _brB.set(px - _brD.x * Math.min(L, 2.4), py - _brD.y * Math.min(L, 2.4), pz - _brD.z * Math.min(L, 2.4));
      const core = fx3Take(h, 'segN');
      fx3Segment(core, _brB, _brA, 0.03);
      fx3Color(core, '#1e0c30', 0.7 * op);
      const gl = fx3Take(h, 'seg');
      fx3Segment(gl, _brB, _brA, 0.075);
      fx3Color(gl, BOW3.violet, 0.4 * op);
      n3Glow(h, px, py, pz, 0.55, BOW3.violet, 0.6 * op);
      if (u < 0.15) n3Glow(h, s0.x, s0.y, s0.z, 1.1 * (1 - u / 0.15) + 0.2, BOW3.violet, 0.7 * (1 - u / 0.15));
      if (!low) for (let i = 1; i <= 3; i++) {
        const q = Math.max(0, L - i * 0.6);
        n3Smoke(h, s0.x + _brD.x * q, s0.y + _brD.y * q, s0.z + _brD.z * q, 0.25 + i * 0.08, BOW3.smoke, 0.45 * op * (1 - i / 4));
      }
    });
  }
  // dunkle Wolkenschicht über dem Kreis: Rauchballen in großer Höhe, drehen sich langsam, steigen am Ende auf und
  // vergehen; in ihr schimmert es dezent violett (ab Erweckt ein Schimmer in der Rangfarbe)
  if (vis > 0.01) {
    const nc = (low ? 6 : 11) + (rk + 1);
    for (let i = 0; i < nc; i++) {
      const a = (i / nc) * Math.PI * 2 + n2h(i, e.seed + 20) * 0.6 + t * 0.07 * (i % 2 ? 1 : -1);
      const d = R * (0.1 + 0.7 * n2h(i, e.seed + 21));
      const cy = 3.7 + 0.5 * n2h(i, e.seed + 22) + Math.sin(t * 0.8 + i) * 0.06 + off * 0.9;
      const s = R * (0.42 + 0.25 * n2h(i, e.seed + 23)) * (0.55 + 0.45 * on) * (1 + off * 0.3);
      n3Smoke(h, x - sx * 0.4 + Math.cos(a) * d, cy, z - sz * 0.4 + Math.sin(a) * d * 0.85, s, i % 3 ? '#160c22' : '#2e1846', 0.42 * vis);
    }
    if (!low) for (let i = 0; i < 3; i++) {
      const ph = t * 0.9 + i * 2.1;
      const col = rk >= 0 && i === 0 ? SKILL_RANKS[rk].color : BOW3.violet;
      n3Glow(h, x + Math.cos(ph) * R * 0.35, 3.6, z + Math.sin(ph) * R * 0.3, R * 0.5, col, (0.14 + 0.06 * Math.sin(t * 3 + i)) * vis);
    }
  }
  // Schattenschwaden ziehen niedrig durch den Kreis, solange es regnet
  const mist = clamp01((t - e.delay) / 0.8) * (1 - off);
  if (mist > 0.01) {
    const nm = low ? 4 : 9;
    for (let i = 0; i < nm; i++) {
      const ph = (t * 0.25 + i / nm) % 1;
      const a = i * 2.399 + e.seed + t * 0.15;
      const r = R * (0.2 + 0.65 * n2h(i, e.seed + 30));
      n3Smoke(h, x + Math.cos(a) * r, 0.55 + ph * 0.6, z + Math.sin(a) * r * 0.85, R * (0.3 + 0.15 * ph), i % 2 ? '#1a0e28' : '#2a1640', 0.45 * Math.sin(ph * Math.PI) * mist);
    }
  }
  // die Pfeile: fallen, schlagen ein, stecken, zerfallen
  const rcol = rk >= 0 ? SKILL_RANKS[rk].color : null;
  const rshare = rk >= 0 ? 0.2 + 0.12 * rk : 0;
  const stick = low ? BOW_RAIN.stick * 0.6 : BOW_RAIN.stick;
  for (const a of rainArrows(e)) {
    if (low && a.i % 5 >= 3) continue;
    const age = t - a.at;
    if (age < -a.fall || age > stick + BOW_RAIN.sink) continue;
    const gx = a.x * U3;
    const gz = a.y * U3;
    const len = BOW_ARROW_LEN * (a.big ? 1.35 : 1.15);
    const trc = rcol && a.tr < rshare ? rcol : BOW3.violet;
    if (age < 0) {
      // im Fall: Pfeil mit dunklem Kern und leuchtender Spur nach oben
      const u = 1 + age / a.fall;
      const L = (a.H / -a.dy) * (1 - u);
      const px = gx - a.dx * L;
      const py = -a.dy * L;
      const pz = gz - a.dz * L;
      const op = clamp01(u * 5);
      _brD.set(a.dx, a.dy, a.dz);
      bowArrow3(h, px, py, pz, _brD, len, e.color, op, 0, BOW3.shadow);
      const tl = Math.min(L + 0.3, a.big ? 2.4 : 1.7);
      _brA.set(px, py, pz);
      _brB.set(px - a.dx * tl, py - a.dy * tl, pz - a.dz * tl);
      const core = fx3Take(h, 'segN');
      fx3Segment(core, _brB, _brA, a.big ? 0.04 : 0.028);
      fx3Color(core, '#1e0c30', 0.75 * op);
      if (!low) {
        const gl = fx3Take(h, 'seg');
        fx3Segment(gl, _brB, _brA, a.big ? 0.15 : 0.11);
        fx3Color(gl, trc, 0.5 * op);
        n3Glow(h, px, py, pz, a.big ? 0.6 : 0.42, trc, 0.55 * op);
      }
      continue;
    }
    // steckt schräg im Boden, zittert kurz nach; zum Schluss sinkt er ein und zerfällt zu Schatten
    const sink = clamp01((age - stick) / BOW_RAIN.sink);
    const wob = Math.sin(age * 42) * Math.exp(-age * 9) * 0.16;
    _brD.set(a.dx + wob, a.dy, a.dz + wob * 0.5).normalize();
    const dep = 0.14 + sink * 0.3;
    bowArrow3(h, gx + _brD.x * (dep - len * 0.5), _brD.y * (dep - len * 0.5), gz + _brD.z * (dep - len * 0.5), _brD, len, e.color, 1 - sink, 0, BOW3.shadow);
    if (age < 0.4) {
      // Einschlag: kurzer Blitz, Staub und Schattenrauch wirbeln auf, Erdkrumen spritzen
      const q = age / 0.4;
      if (age < 0.15) n3Glow(h, gx, 0.25, gz, (a.big ? 1.6 : 1.1) * (1 - age / 0.15) + 0.3, trc, 0.85 * (1 - age / 0.15));
      n3Smoke(h, gx + a.dx * q * 0.3, 0.3 + q * 0.5, gz + a.dz * q * 0.3, (0.55 + q * 1.0) * (a.big ? 1.3 : 1), '#6a5a46', 0.6 * (1 - q));
      n3Smoke(h, gx - a.dx * q * 0.3, 0.4 + q * 0.8, gz - a.dz * q * 0.3, (0.5 + q * 1.0) * (a.big ? 1.3 : 1), '#22123a', 0.7 * (1 - q));
      if (!low) for (let j = 0; j < 3; j++) {
        const an = n2h(a.i * 3 + j, e.seed + 40) * Math.PI * 2;
        const r = q * (0.35 + 0.3 * n2h(a.i * 3 + j, e.seed + 41));
        const b = fx3Take(h, 'ball');
        b.position.set(gx + Math.cos(an) * r, 0.04 + Math.sin(q * Math.PI) * (0.2 + 0.25 * n2h(a.i + j, e.seed + 42)), gz + Math.sin(an) * r);
        b.scale.set(0.035, 0.035, 0.035);
        fx3Color(b, j % 2 ? '#3a2a1a' : '#1a0e28', 1 - q);
      }
    }
    // dunkle Schattenenergie glimmt noch eine Weile am steckenden Pfeil
    if (!low) {
      const gk = (1 - sink) * (0.18 + 0.22 * Math.max(0, 1 - age / 0.6));
      n3Glow(h, gx - _brD.x * len * 0.3, 0.2 - _brD.y * len * 0.3, gz - _brD.z * len * 0.3, 0.5, trc, gk);
      // ein feiner Schattenfaden steigt vom Pfeil auf
      if (a.i % 2 === 0) {
        const ph = (age * 0.8 + a.tr) % 1;
        n3Smoke(h, gx - _brD.x * len * 0.6, 0.35 + ph * 0.8, gz - _brD.z * len * 0.6, 0.18 + ph * 0.3, '#1a0e28', 0.45 * Math.sin(ph * Math.PI) * (1 - sink));
      }
    }
    if (sink > 0) {
      n3Smoke(h, gx - a.dx * 0.2, 0.25 + sink * 0.6, gz - a.dz * 0.2, 0.25 + sink * 0.35, '#1a0e28', 0.5 * Math.sin(sink * Math.PI));
      if (!low) n3Glow(h, gx, 0.3, gz, 0.3, BOW3.violet, 0.35 * Math.sin(sink * Math.PI));
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

// Splitterfalke (seit 14.16): Der schwere Schattenpfeil steigt aus der Bogenhand in einem hohen Bogen auf, zieht einen
// dunklen Kern mit violettem Schein und Schattenrauch hinter sich her. Ab dem Scheitel entfaltet sich ein Schattenfalke
// um ihn und stößt mit ihm herab, unten zieht sich schon Schatten zusammen. Beim Einschlag: greller violetter Blitz,
// der Falke reißt auseinander, ein Büschel großer Schattenglas-Zacken bricht in der Mitte aus dem Boden und Splitter
// (Doppelspitzen aus dunklem Glas mit leuchtendem Kern) fliegen im Bogen nach allen Seiten, überschlagen sich und
// bleiben schräg im Boden stecken. Schattenrauch rollt nach außen und steigt als Säule auf, Staub und dunkle Federn
// stieben, der Geist des Falken steigt mit Flügelschlägen aus dem Rauch auf. Zum Schluss sinken die Splitter ein und
// zerfallen zu Schatten. Nichts davon ist flach auf den Boden gemalt.
const _bspA = new THREE.Vector3();
const _bspB = new THREE.Vector3();
const _bspC = new THREE.Vector3();
const _bspD = new THREE.Vector3();
const _bspE = new THREE.Vector3();
const _bspH = new THREE.Vector3();
// Bahn des Pfeils: Wurfparabel von der Bogenhand (e._s0) zum Boden am Ziel, Scheitelhöhe e._H; Punkt und Richtung
function splitPath(e, u, out, dir) {
  const s0 = e._s0;
  const x1 = e.x * U3;
  const z1 = e.y * U3;
  const y1 = 0.12;
  out.set(s0.x + (x1 - s0.x) * u, s0.y + (y1 - s0.y) * u + 4 * e._H * u * (1 - u), s0.z + (z1 - s0.z) * u);
  if (dir) dir.set(x1 - s0.x, y1 - s0.y + 4 * e._H * (1 - 2 * u), z1 - s0.z).normalize();
  return out;
}
// Splitter aus dem Samen (für eigene und fremde gleich): Richtung, Landeweite, Wurfhöhe, Flugzeit, Größe, Drehung;
// core: die großen Zacken, die in der Mitte aus dem Boden brechen
function splitShards(e) {
  if (e._shards) return e._shards;
  const out = [];
  const R = e.R * U3;
  const n = 16 + 4 * (e.rk + 1);
  for (let i = 0; i < n; i++) {
    const s = e.seed * 0.173 + i * 1.913;
    const a = (i / n) * Math.PI * 2 + (n2h(s, 1) - 0.5) * 0.7;
    const d = R * (0.28 + 0.66 * Math.sqrt(n2h(s, 2)));
    // steckt schräg nach außen geneigt im Boden
    const tilt = 0.35 + 0.5 * n2h(s, 6);
    const sx = Math.cos(a) * tilt + (n2h(s, 7) - 0.5) * 0.3;
    const sz = Math.sin(a) * tilt + (n2h(s, 8) - 0.5) * 0.3;
    const sl = Math.hypot(sx, 1, sz);
    out.push({ i, a, d, hp: 0.5 + 1.4 * n2h(s, 3), tf: 0.3 + 0.28 * n2h(s, 4), s: 0.95 + 0.85 * n2h(s, 5), spin: 9 + 12 * n2h(s, 9),
      ax: n2h(s, 10) * Math.PI * 2, stick: { x: sx / sl, y: 1 / sl, z: sz / sl }, rc: n2h(s, 11), core: false });
  }
  // große Zacken in der Mitte: brechen aus dem Boden, leicht nach außen gefächert
  const nc = 4 + (e.rk >= 2 ? 1 : 0);
  for (let i = 0; i < nc; i++) {
    const s = e.seed * 0.291 + i * 2.377;
    const a = (i / nc) * Math.PI * 2 + n2h(s, 1) * 0.8;
    const tilt = 0.25 + 0.3 * n2h(s, 2);
    const sl = Math.hypot(Math.cos(a) * tilt, 1, Math.sin(a) * tilt);
    out.push({ i: 100 + i, a, d: 0.12 + 0.2 * n2h(s, 3), s: 2.6 + 1.1 * n2h(s, 4), stick: { x: Math.cos(a) * tilt / sl, y: 1 / sl, z: Math.sin(a) * tilt / sl }, rc: n2h(s, 5), core: true });
  }
  e._shards = out;
  return out;
}
// ein Splitter aus Schattenglas: Doppelspitze (lange Spitze nach d, kurze nach hinten) mit leuchtendem Kern
function splitShard3(h, c, d, s, op, glowCol, gk) {
  if (op <= 0.01) return;
  const w = 0.075 * s;
  const a = fx3Take(h, 'cone');
  fx3Cone(a, c, d, 0.4 * s, w);
  fx3Color(a, '#2a1a42', op);
  _bspE.copy(d).negate();
  const b = fx3Take(h, 'cone');
  fx3Cone(b, c, _bspE, 0.14 * s, w);
  fx3Color(b, '#160c24', op);
  const g = fx3Take(h, 'coneG');
  fx3Cone(g, c, d, 0.36 * s, w * 0.55);
  fx3Color(g, glowCol, gk * op);
}
FX3_DRAW.bsplit3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const rk = e.rk >= 0 ? e.rk : -1;
  const rcol = rk >= 0 ? SKILL_RANKS[rk].color : null;
  const x = e.x * U3;
  const z = e.y * U3;
  const R = e.R * U3;
  const hit = e.rel + e.fly;
  const ti = t - hit;
  if (t < e.rel) return;
  // Abschuss: Startpunkt an der Bogenhand merken, Scheitelhöhe nach Entfernung
  if (!e._s0) {
    const o = e.shooter;
    const hp = o && !o.dead && typeof ninjaHand3 === 'function' ? ninjaHand3(o, _bspH) : _bspH.set(e.ox * U3, 1.1, e.oy * U3);
    e._s0 = { x: hp.x, y: hp.y, z: hp.z };
    e._H = Math.min(4.2, 1.3 + Math.hypot(x - hp.x, z - hp.z) * 0.2);
  }
  // --- Flug ---
  if (ti < 0) {
    const u = (t - e.rel) / e.fly;
    splitPath(e, u, _bspA, _bspD);
    const p = _bspA;
    // Spur: dunkler Kern mit violettem Schein entlang der Bahn, dahinter Schattenrauch
    const nTr = low ? 4 : 9;
    for (let k = 0; k < nTr; k++) {
      const u0 = u - k * 0.03;
      const u1 = u - (k + 1) * 0.03;
      if (u1 < 0) break;
      splitPath(e, u0, _bspB);
      splitPath(e, u1, _bspC);
      const f = 1 - k / nTr;
      const core = fx3Take(h, 'segN');
      fx3Segment(core, _bspC, _bspB, 0.035 * f + 0.01);
      fx3Color(core, '#1a0a2a', 0.8 * f);
      const gl = fx3Take(h, 'seg');
      fx3Segment(gl, _bspC, _bspB, 0.13 * f + 0.03);
      fx3Color(gl, BOW3.violet, 0.45 * f);
      if (!low && k % 2 === 1) n3Smoke(h, _bspC.x, _bspC.y + 0.05 * k, _bspC.z, 0.3 + k * 0.06, k % 4 === 1 ? BOW3.smoke : BOW3.shadow, 0.5 * f);
    }
    // der schwere Pfeil selbst
    bowArrow3(h, p.x, p.y, p.z, _bspD, BOW_ARROW_LEN * 1.7, e.color, 1, 0.55, BOW3.shadow);
    n3Glow(h, p.x, p.y, p.z, 0.9, BOW3.violet, 0.55);
    // Schattenranken winden sich um den Pfeil
    if (!low) {
      _bspE.set(-_bspD.z, 0, _bspD.x).normalize();
      for (let k = 0; k < 2; k++) {
        const an = t * 16 + k * Math.PI;
        n3Smoke(h, p.x + _bspE.x * Math.cos(an) * 0.22, p.y + Math.sin(an) * 0.22, p.z + _bspE.z * Math.cos(an) * 0.22, 0.28, BOW3.smoke, 0.6);
      }
    }
    // ab dem Scheitel entfaltet sich der Schattenfalke um den Pfeil und stößt mit ihm herab (Flügel angelegt)
    const m = clamp01((u - 0.3) / 0.3);
    if (m > 0) {
      const fold = 0.25 + 0.5 * m;
      n3Glow(h, p.x, p.y, p.z, 1.0 + 0.6 * m, '#5a2aa8', 0.35 * m);
      bowFalcon3(h, p.x - _bspD.x * 0.12, p.y + 0.06, p.z - _bspD.z * 0.12, _bspD, 0.8 + 1.8 * m, fold + Math.sin(t * 20) * 0.08 * (1 - m), m, true);
    }
    // am Ziel zieht sich schon Schatten zusammen (Rauch kreist niedrig nach innen)
    const g = clamp01((u - 0.45) / 0.55);
    if (g > 0) {
      const nG = low ? 3 : 7;
      for (let k = 0; k < nG; k++) {
        const an = (k / nG) * Math.PI * 2 + t * 3.5;
        const r = R * (0.95 - 0.75 * g) * (0.8 + 0.2 * n2h(k, e.seed));
        n3Smoke(h, x + Math.cos(an) * r, 0.25 + 0.15 * Math.sin(k + t * 4), z + Math.sin(an) * r * 0.85, 0.45 + 0.25 * g, k % 2 ? BOW3.smoke : '#2a1640', 0.5 * g);
      }
      n3Glow(h, x, 0.3, z, 0.6 + 1.0 * g, BOW3.violet, 0.35 * g);
    }
    return;
  }
  // --- Einschlag ---
  // kurzer violetter Blitz mit hellem Kern (gedämpft: additives Violett wird auf hellem Gras sonst weißlich), dazu
  // schießen dunkle Schattenballen senkrecht aus dem Einschlag
  if (ti < 0.3) {
    const q = ti / 0.3;
    n3Glow(h, x, 0.6, z, R * 1.1 * (0.5 + q), '#6a2ad0', 0.6 * (1 - q));
    n3Glow(h, x, 0.5, z, 0.9 * (1 - q) + 0.25, '#e8d8ff', 0.8 * (1 - q));
    if (rcol) n3Glow(h, x, 0.8, z, R * (0.4 + q * 0.5), rcol, 0.2 * (1 - q));
    for (let k = 0; k < (low ? 3 : 6); k++) {
      const hh = 0.3 + easeOut(q) * (1.2 + k * 0.45);
      n3Smoke(h, x + Math.sin(k * 2.1) * 0.15, hh, z + Math.cos(k * 2.1) * 0.12, 0.85 + k * 0.1 + q * 0.6, k % 2 ? '#1a0a2a' : '#2e1450', 0.6 * (1 - q));
    }
  }
  // der Falke reißt auseinander: Flügel schlagen weit auf, er wird groß und verweht
  if (ti < 0.22) {
    const q = ti / 0.22;
    _bspD.set(0, -0.35, -1).normalize();
    bowFalcon3(h, x, 0.9 + q * 0.6, z, _bspD, 2.4 + q * 1.6, -0.2 - q * 0.5, 0.95 * (1 - q), true);
  }
  // Splitter: fliegen, stecken, sinken ein
  const end = BOW_SPLIT.stick;
  const sinkAll = clamp01((ti - end) / BOW_SPLIT.sink);
  for (const sh of splitShards(e)) {
    if (low && !sh.core && sh.i % 2) continue;
    const gc = rcol && sh.rc < 0.2 + 0.12 * rk ? rcol : sh.rc < 0.5 ? BOW3.violet : BOW3.violet2;
    const gx = x + Math.cos(sh.a) * sh.d;
    const gz = z + Math.sin(sh.a) * sh.d * 0.9;
    if (sh.core) {
      // große Zacken: brechen in 0,1 s aus dem Boden, zittern kurz nach
      const grow = easeOut(clamp01(ti / 0.1));
      const sz = sh.s * (0.3 + 0.7 * grow);
      const wob = Math.sin(ti * 38 + sh.i) * Math.exp(-ti * 7) * 0.12;
      _bspD.set(sh.stick.x + wob, sh.stick.y, sh.stick.z - wob).normalize();
      _bspC.set(gx, -0.08 * sh.s - sinkAll * 0.45 * sh.s, gz);
      splitShard3(h, _bspC, _bspD, sz, 1 - sinkAll * 0.8, gc, 0.95 - 0.35 * clamp01(ti / 0.8));
      if (!low) n3Glow(h, gx + _bspD.x * 0.25 * sh.s, 0.3 * sh.s, gz + _bspD.z * 0.25 * sh.s, 0.35 * sh.s, '#5a2aa8', (0.25 + 0.35 * Math.exp(-ti * 4)) * (1 - sinkAll));
      continue;
    }
    if (ti < sh.tf) {
      // im Flug: Wurfbogen von der Mitte nach außen, der Splitter überschlagt sich, violette Spur
      const q = ti / sh.tf;
      const r = 0.15 + (sh.d - 0.15) * q;
      _bspC.set(x + Math.cos(sh.a) * r, 0.35 + 4 * sh.hp * q * (1 - q) - 0.25 * q, z + Math.sin(sh.a) * r * 0.9);
      const an = sh.ax + ti * sh.spin;
      _bspD.set(Math.cos(an) * Math.cos(sh.a), Math.sin(an), Math.cos(an) * Math.sin(sh.a)).normalize();
      // am Ende dreht er sich in die Lage, in der er stecken bleibt
      const lk = clamp01((q - 0.7) / 0.3);
      _bspD.lerp(_bspE.set(sh.stick.x, sh.stick.y, sh.stick.z), lk).normalize();
      splitShard3(h, _bspC, _bspD, sh.s, 1, gc, 0.9);
      const qb = Math.max(0, q - 0.12);
      const rb = 0.15 + (sh.d - 0.15) * qb;
      _bspB.set(x + Math.cos(sh.a) * rb, 0.35 + 4 * sh.hp * qb * (1 - qb) - 0.25 * qb, z + Math.sin(sh.a) * rb * 0.9);
      const tr = fx3Take(h, 'segN');
      fx3Segment(tr, _bspB, _bspC, 0.022 * sh.s);
      fx3Color(tr, '#3a1a6a', 0.55 * (1 - q * 0.5));
      if (!low) n3Glow(h, _bspC.x, _bspC.y, _bspC.z, 0.3 * sh.s, '#6a2ad0', 0.45);
      continue;
    }
    // steckt schräg im Boden, zittert nach dem Aufprall; zum Schluss sinkt er ein
    const age = ti - sh.tf;
    const wob = Math.sin(age * 44 + sh.i) * Math.exp(-age * 10) * 0.2;
    _bspD.set(sh.stick.x + wob, sh.stick.y, sh.stick.z + wob * 0.6).normalize();
    _bspC.set(gx, 0.02 - sinkAll * 0.3 * sh.s, gz);
    splitShard3(h, _bspC, _bspD, sh.s, 1 - sinkAll, gc, 0.35 + 0.55 * Math.exp(-age * 3));
    if (age < 0.3) {
      // Aufprall: Staub und ein Schattenwölkchen
      const q = age / 0.3;
      n3Smoke(h, gx, 0.15 + q * 0.3, gz, 0.25 + q * 0.45, '#5a4a3a', 0.45 * (1 - q));
      if (!low && age < 0.12) n3Glow(h, gx, 0.15, gz, 0.4, '#6a2ad0', 0.5 * (1 - age / 0.12));
    }
    if (sinkAll > 0 && !low && sh.i % 2 === 0) n3Smoke(h, gx, 0.2 + sinkAll * 0.5, gz, 0.25 + sinkAll * 0.3, BOW3.smoke, 0.5 * Math.sin(sinkAll * Math.PI));
  }
  // Schattenrauch: rollt am Boden nach außen und steigt in der Mitte als Säule auf
  const rq = clamp01(ti / 1.1);
  if (rq < 1) {
    const nO = low ? 6 : 12;
    for (let k = 0; k < nO; k++) {
      const an = (k / nO) * Math.PI * 2 + e.seed;
      const r = R * (0.15 + 0.8 * easeOut(rq)) * (0.85 + 0.25 * n2h(k, e.seed + 3));
      n3Smoke(h, x + Math.cos(an) * r, 0.35 + rq * 0.4, z + Math.sin(an) * r * 0.85, 1.0 + rq * 1.1, k % 2 ? BOW3.smoke : '#2a1640', 0.5 * (1 - rq) * Math.min(1, ti / 0.06));
    }
    const nC = low ? 3 : 6;
    for (let k = 0; k < nC; k++) {
      const hh = (0.4 + k * 0.5) * (0.4 + 0.6 * easeOut(rq));
      const sw = Math.sin(ti * 3 + k) * 0.12;
      n3Smoke(h, x + sw, hh, z - sw, 0.7 + k * 0.12 + rq * 0.6, k % 2 ? '#1a0e28' : BOW3.smoke, 0.65 * (1 - rq) * (1 - k / (nC + 1)));
    }
  }
  if (ti < 0.5) {
    // Staub und Erdkrumen
    const q = ti / 0.5;
    n3Smoke(h, x, 0.3 + q * 0.4, z, 1.2 + q * 1.4, '#6a5a46', 0.45 * (1 - q));
  }
  // dunkle Federn stieben auf und trudeln herab
  if (!low) for (let k = 0; k < 10; k++) {
    const life = 1.5 + 0.4 * n2h(k, e.seed + 50);
    if (ti > life) continue;
    const q = ti / life;
    const an = n2h(k, e.seed + 51) * Math.PI * 2;
    const r = (0.4 + R * 0.5 * n2h(k, e.seed + 52)) * easeOut(Math.min(1, q * 2));
    const yy = 0.4 + (1.4 + 1.2 * n2h(k, e.seed + 53)) * Math.sin(Math.min(1, q * 1.6) * Math.PI * 0.5) - q * q * 1.2;
    bowFeather3(h, x + Math.cos(an) * r + Math.sin(ti * 5 + k) * 0.12, Math.max(0.1, yy), z + Math.sin(an) * r * 0.85, 0.32, an + ti * 4, 1 - q);
  }
  // seit 14.18 statt des aufsteigenden Falkengeists: Schattendornen brechen aus dem Boden der ganzen Fläche
  // (zweiter Treffer, BOW_SPLIT.spike nach dem Einschlag). Schwarzviolette Zacken schießen in Wellen von innen nach
  // außen hoch, stehen kurz, ziehen sich wieder in den Boden zurück; an ihrem Fuß quillt dunkler Rauch.
  const ts = ti - BOW_SPLIT.spike;
  if (ts > -0.05 && ts < 1.0) {
    const nS = low ? 9 : 18;
    for (let k = 0; k < nS; k++) {
      const ring = k < 4 ? 0.25 : k < 10 ? 0.6 : 0.9;
      const an = n2h(k, e.seed + 70) * Math.PI * 2;
      const rr = R * ring * (0.75 + 0.35 * n2h(k, e.seed + 71));
      const gx = x + Math.cos(an) * rr;
      const gz = z + Math.sin(an) * rr * 0.9;
      const tk = ts - ring * 0.12; // Welle von innen nach außen
      if (tk < 0 || tk > 0.75) continue;
      const up = tk < 0.1 ? easeOut(tk / 0.1) : tk < 0.45 ? 1 : 1 - (tk - 0.45) / 0.3;
      const s = (1.5 + 1.2 * n2h(k, e.seed + 72)) * (1.1 - ring * 0.3);
      const tilt = 0.18 + 0.2 * n2h(k, e.seed + 73);
      _bspD.set(Math.cos(an) * tilt, 1, Math.sin(an) * tilt).normalize();
      _bspC.set(gx, -0.45 * s * (1 - up), gz);
      splitShard3(h, _bspC, _bspD, s, Math.max(0, up), rcol || gcCol(e), 0.5 * up);
      if (tk < 0.25) n3Smoke(h, gx, 0.15 + tk, gz, 0.35 + tk * 1.2, k % 2 ? BOW3.smoke : '#1a0e28', 0.5 * (1 - tk / 0.25));
    }
    if (!low && ts > 0 && ts < 0.18) n3Glow(h, x, 0.3, z, R * 0.9, rcol || '#6a2ad0', 0.35 * (1 - ts / 0.18));
  }
};
// Leuchtfarbe der Splitter (wie im Einschlag: Rangfarbe, sonst Pfeilfarbe)
function gcCol(e) {
  return e.color || '#8a5ae0';
}

// Schattenschritt (seit 13.67, seit 13.70 deutlich aufwendiger): Die Figur zerfällt von den Füßen aufwärts in
// schwarzvioletten Rauch, Schattenranken peitschen aus dem Boden, ein Schattenfalke reißt eine violette Spur zum Ziel.
// Dort zieht sich ein Rauchwirbel zusammen, die Figur erscheint und ein Schattenstoß bricht aus: dunkle Druckwelle,
// Rauchring, aufschießende Schattenranken, Federn, violetter Schein. Höhere Ränge: mehr Ranken, Schein in der Rangfarbe
const _bshA = new THREE.Vector3();
FX3_DRAW.bshadow3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x * U3;
  const z1 = e.y * U3;
  const H = e.hide;
  const rk = e.rk >= 0 ? e.rk : -1;
  const L = Math.hypot(x1 - x0, z1 - z0) || 1;
  const dx = (x1 - x0) / L;
  const dz = (z1 - z0) / L;
  // Abgang: zerfallende Gestalt aus Rauch (von unten nach oben), peitschende Ranken, Blitz, Federn
  if (t < 0.85) {
    const q = t / 0.85;
    const n = low ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const hy = 0.15 + (i / n) * 1.7;
      const lag = (i / n) * 0.25;
      const u = clamp01((q - lag) / (1 - lag));
      const r = 0.22 * (1 - i / n * 0.4) + u * (0.5 + 0.6 * n2h(i, e.seed));
      const a = i * 2.399 + e.seed;
      n3Smoke(h, x0 + Math.cos(a) * r * 0.6 - dx * u * 0.3, hy + u * 0.8, z0 + Math.sin(a) * r * 0.5 - dz * u * 0.3, 0.42 + u * 0.6, i % 3 ? BOW3.smoke : BOW3.shadow, 0.85 * (1 - u));
    }
    if (t < 0.25) {
      n3Glow(h, x0, 0.9, z0, 1.8 * (1 - t / 0.25) + 0.5, BOW3.violet, 0.7 * (1 - t / 0.25));
      n3Glow(h, x0, 1.0, z0, 0.6, BOW3.violet2, 0.6 * (1 - t / 0.25));
    }
    const nt = (low ? 4 : 7) + 2 * (rk + 1);
    const g = easeOut(clamp01(t / 0.2));
    for (let j = 0; j < nt; j++) {
      const a = (j / nt) * Math.PI * 2 + e.seed;
      const len = (0.7 + 0.5 * n2h(j, e.seed + 3)) * g;
      let px = x0;
      let py = 0.05;
      let pz = z0;
      const m = low ? 4 : 7;
      for (let i = 1; i <= m; i++) {
        const s = i / m;
        const whip = Math.sin(t * 14 + j + s * 3) * 0.12 * s;
        // Schattenfahnen züngeln an der Figur hoch und verwehen (nicht flach wie Beine)
        const nx = x0 + Math.cos(a) * (0.25 + len * s * 0.35) + Math.cos(a + 1.57) * whip;
        const ny = 0.05 + s * len * 1.5 + q * 0.5;
        const nz = z0 + Math.sin(a) * (0.22 + len * s * 0.3) + Math.sin(a + 1.57) * whip;
        _bw3a.set(px, py, pz);
        _bw3b.set(nx, ny, nz);
        const sg = fx3Take(h, 'segN');
        fx3Segment(sg, _bw3a, _bw3b, 0.045 * (1 - s * 0.8) + 0.006);
        fx3Color(sg, i % 2 ? '#14081e' : '#2a1238', 0.95 * (1 - q));
        px = nx;
        py = ny;
        pz = nz;
      }
    }
  }
  // Spur: ein Schattenfalke stößt in flachem Bogen zum Ziel, hinter ihm hängt violetter Schatten in der Luft
  const arc = (u) => 0.9 + Math.sin(u * Math.PI) * (0.5 + L * 0.05);
  if (t < H + 0.7) {
    const u = clamp01(t / Math.max(0.05, H));
    if (t < H + 0.05 && !low) {
      _bw3d.set(dx, (arc(Math.min(1, u + 0.05)) - arc(u)) * 4, dz).normalize();
      bowFalcon3(h, x0 + (x1 - x0) * u, arc(u) + 0.2, z0 + (z1 - z0) * u, _bw3d, 1.6, 0.3 + 0.5 * Math.sin(t * 30), 0.9, true);
    }
    const n = low ? 10 : 22;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i <= n; i++) {
      const v = (i / n) * u;
      const age = t - H * v;
      const q = clamp01(age / 0.7);
      const nx = x0 + (x1 - x0) * v + Math.cos(v * 20 + t * 6) * 0.08 * dz;
      const ny = arc(v) + Math.sin(v * 20 + t * 6) * 0.08;
      const nz = z0 + (z1 - z0) * v - Math.cos(v * 20 + t * 6) * 0.08 * dx;
      if (i) {
        _bw3a.set(px, py, pz);
        _bw3b.set(nx, ny, nz);
        const sg = fx3Take(h, 'seg');
        fx3Segment(sg, _bw3a, _bw3b, 0.16 * (1 - q) + 0.02);
        fx3Color(sg, BOW3.violet, 0.55 * (1 - q));
        const sd = fx3Take(h, 'segN');
        fx3Segment(sd, _bw3a, _bw3b, 0.07 * (1 - q) + 0.008);
        fx3Color(sd, '#14081e', 0.8 * (1 - q));
      }
      n3Smoke(h, nx, ny + q * 0.35, nz, 0.45 + q * 0.6, i % 3 ? BOW3.smoke : '#2a1440', 0.55 * (1 - q));
      px = nx;
      py = ny;
      pz = nz;
    }
  }
  // Ankunft: Rauch wirbelt spiralig zusammen
  if (t > H - 0.16 && t < H + 0.02) {
    const q = clamp01((t - (H - 0.16)) / 0.16);
    for (let i = 0; i < (low ? 6 : 12); i++) {
      const a = i * 0.52 + q * 4 + e.seed;
      const r = 1.5 * (1 - q) + 0.12;
      n3Smoke(h, x1 + Math.cos(a) * r, 0.3 + (i % 4) * 0.35, z1 + Math.sin(a) * r * 0.8, 0.45, BOW3.smoke, 0.7 * q);
    }
    n3Glow(h, x1, 0.9, z1, 0.6 + q * 1.2, BOW3.violet, 0.6 * q);
  }
  // Schattenstoß: dunkle Druckwelle, Rauchring, aufschießende Ranken, Federn, Schein
  if (t >= H) {
    const v = t - H;
    const q = clamp01(v / 0.9);
    const R = (e.R || 70) * U3;
    if (q < 1) {
      for (let i = 0; i < 2; i++) {
        const w = fx3Take(h, 'wall');
        fx3Wall(w, e.x, e.y, R * (0.3 + easeOut(q) * 1.15) * (1 - i * 0.22), 1.1 * (1 - q) + 0.1);
        fx3Color(w, i ? '#6a3ab0' : '#1e0a30', 0.5 * (1 - q));
      }
      const n = low ? 9 : 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + e.seed;
        const r = R * (0.25 + 1.0 * easeOut(q));
        n3Smoke(h, x1 + Math.cos(a) * r, 0.2 + q * 0.6 + 0.2 * n2h(i, e.seed), z1 + Math.sin(a) * r * 0.85, 0.55 + q * 0.6, i % 2 ? BOW3.smoke : BOW3.shadow, 0.85 * (1 - q));
      }
    }
    if (v < 0.35) {
      const f = 1 - v / 0.35;
      n3Glow(h, x1, 0.9, z1, 2.8 * (0.4 + v / 0.35), rk >= 0 ? SKILL_RANKS[rk].color : BOW3.violet, 0.65 * f);
      n3Glow(h, x1, 0.9, z1, 0.9, BOW3.violet2, 0.7 * f);
      _bw3a.set(x1, 0, z1);
      _bw3b.set(x1, 2.6, z1);
      const col = fx3Take(h, 'seg');
      fx3Segment(col, _bw3a, _bw3b, 0.4 * f + 0.03);
      fx3Color(col, BOW3.violet, 0.35 * f);
    }
    // aufschießende Schattenranken (wie Dornen aus Schatten, schräg nach außen, dann zurück in den Boden)
    const ns = (low ? 5 : 9) + 2 * (rk + 1);
    const up = v < 0.15 ? easeOut(v / 0.15) : 1 - clamp01((v - 0.35) / 0.45);
    if (up > 0) for (let j = 0; j < ns; j++) {
      const a = (j / ns) * Math.PI * 2 + e.seed * 2;
      const len = R * (0.55 + 0.4 * n2h(j, e.seed + 5)) * up;
      _bshA.set(x1 + Math.cos(a) * R * 0.25, 0.02, z1 + Math.sin(a) * R * 0.22);
      _bw3d.set(Math.cos(a), 1.1 + 0.4 * n2h(j, e.seed + 6), Math.sin(a) * 0.85).normalize();
      const th = fx3Take(h, 'cone');
      fx3Cone(th, _bshA, _bw3d, len * 0.9, 0.06 + 0.02 * n2h(j, e.seed));
      fx3Color(th, j % 2 ? '#14081e' : '#24103a', 1);
      if (!low) n3Glow(h, _bshA.x + _bw3d.x * len * 0.9, _bshA.y + _bw3d.y * len * 0.9, _bshA.z + _bw3d.z * len * 0.9, 0.15, BOW3.violet2, 0.6 * up);
    }
    if (!low) for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + e.seed;
      const r = R * 1.05 * easeOut(q);
      bowFeather3(h, x1 + Math.cos(a) * r, 0.6 + Math.sin(q * Math.PI) * 0.7 - q * 0.3, z1 + Math.sin(a) * r * 0.8, 0.3, a + q * 4, 1 - q);
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
  // seit 13.70: violette Schattenspur zum Zielort
  if (t < e.hide + 0.6) {
    const u = Math.min(1, t / Math.max(0.05, e.hide));
    const q = Math.max(0, (t - e.hide) / 0.6);
    const ax = x + (e.x0 - e.x);
    const ay = y + (e.y0 - e.y) - 18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 * (1 - q);
    ctx.strokeStyle = '#8a4ae8';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * (1 - q) + 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + x) / 2, (ay + y) / 2 - 30, ax + (x - ax) * u, ay + (y - 18 - ay) * u);
    ctx.stroke();
    ctx.restore();
  }
  if (t >= e.hide) {
    const q = Math.min(1, (t - e.hide) / 0.6);
    ctx.strokeStyle = '#2a1238';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8 * (1 - q);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + e.seed;
      const r = (e.R || 70) * (0.3 + 0.7 * q);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.15);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5 - 18 * (1 - q));
      ctx.stroke();
    }
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
// beim Schießen und Zaubern breiten sie sich aus. Die dunkle Aura dazu kommt seit 13.83 aus koerperaura.js.
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
  // die dunkle Aura (Rauch und violetter Schein) zeichnet seit 13.83 die Körperaura (koerperaura.js, Stil „falke“)
}

// Ulti (seit 14.94): Bogen 1 s spannen, der leuchtende Schattenadler fliegt als Pfeil aufs Ziel, Einschlag mit Druckwelle
FX3_DRAW.beagle3 = function (h, e) {
  if (e.cancel) return;
  const t = game.time - e.start;
  const low = n3low();
  const C = e.charge;
  const B = ultEagleBow(e);
  const bx = B.x * U3;
  const bz = (B.y + 9) * U3;
  const H = ULT_EAGLE.h;
  _bw3d.set(B.fx, 0, B.fy).normalize();
  if (t < C) {
    // Spannen: Schattenenergie strömt spiralförmig in den Bogen, der Adler formt sich auf der Sehne
    const k = t / C;
    n3Glow(h, bx, H, bz, 0.6 + 2.4 * k * k, BOW3.violet, 0.25 + 0.55 * k);
    n3Glow(h, bx, H, bz, 0.3 + 0.8 * k, '#e8dcff', 0.35 * k);
    const n = low ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const f = (t * 1.3 + i / n) % 1;
      const r = (1 - f) * 2.4;
      const a = (i / n) * Math.PI * 2 + t * 5 + f * 3;
      const x = bx + Math.cos(a) * r;
      const y = H + Math.sin(a * 1.3) * r * 0.5 + (1 - f) * 0.4;
      const z = bz + Math.sin(a) * r * 0.8;
      n3Smoke(h, x, y, z, 0.5 + (1 - f) * 0.5, BOW3.smoke, 0.45 * f * k + 0.1);
      n3Glow(h, x, y, z, 0.25 + 0.3 * f, BOW3.violet2, 0.6 * f);
    }
    for (let i = 0; i < (low ? 3 : 6); i++) {
      const f = (t * 0.9 + i / 6) % 1;
      const a = i * 1.7 + t * 3;
      bowFeather3(h, bx + Math.cos(a) * (1 - f) * 1.8, H + 0.2 + (1 - f) * 0.8, bz + Math.sin(a) * (1 - f) * 1.4, 0.35, a + t * 4, f * 0.9 * k);
    }
    const g = clamp01((k - 0.45) / 0.55);
    if (g > 0) bowEagle3(h, bx + _bw3d.x * 0.3, H + 0.05, bz + _bw3d.z * 0.3, _bw3d, 0.9 + 1.4 * g, { flap: -0.2 + Math.sin(t * 9) * 0.15, sweep: 0.55 * (1 - g), glow: 1 }, g * 0.95, low);
    return;
  }
  const L = B.L * U3;
  const tx = e.x * U3;
  const tz = (e.y + 9) * U3;
  const v0 = t - C;
  if (v0 < e.fly) {
    // Flug: schnell und gerade, leicht gewölbt, Flügel weit offen, leuchtend mit Lichtschweif
    const u = v0 / e.fly;
    const arc = Math.sin(Math.PI * u) * Math.min(1.2, L * 0.08);
    const px = bx + (tx - bx) * u;
    const pz = bz + (tz - bz) * u;
    const py = H + (0.9 - H) * u + arc;
    const span = 3.6;
    bowEagle3(h, px, py, pz, _bw3d, span, { flap: Math.sin(t * 16) * 0.3, sweep: 0.2, glow: 1, roll: Math.sin(t * 7) * 0.08 }, 1, low);
    n3Glow(h, px, py, pz, 3.2, BOW3.violet, 0.45);
    n3Glow(h, px, py, pz, 1.2, '#efe6ff', 0.5);
    // Lichtschweif: heller Strahl hinter ihm, dazu Schatten und Funken entlang der Bahn
    _bw3a.set(px - _bw3d.x * 0.6, py, pz - _bw3d.z * 0.6);
    const back = Math.min(L * u, 7);
    _bw3b.set(_bw3a.x - _bw3d.x * back, py - arc * 0.3, _bw3a.z - _bw3d.z * back);
    const st = fx3Take(h, 'seg');
    fx3Segment(st, _bw3b, _bw3a, 0.22);
    fx3Color(st, BOW3.violet, 0.55);
    const st2 = fx3Take(h, 'seg');
    fx3Segment(st2, _bw3b, _bw3a, 0.07);
    fx3Color(st2, '#f2eaff', 0.7);
    for (let i = 1; i <= (low ? 4 : 9); i++) {
      const w = Math.max(0, u - i * 0.06);
      const qx = bx + (tx - bx) * w;
      const qz = bz + (tz - bz) * w;
      const qy = H + (0.9 - H) * w + Math.sin(Math.PI * w) * Math.min(1.2, L * 0.08);
      n3Smoke(h, qx, qy, qz, 1.0 - i * 0.06, BOW3.smoke, 0.5 - i * 0.045);
      if (i % 2) n3Glow(h, qx, qy, qz, 0.9, BOW3.violet2, 0.45 - i * 0.04);
    }
    return;
  }
  // Einschlag: Druckwelle aus Schattenwind, Lichtsäule, Rauch, Federn regnen herab
  const v = v0 - e.fly;
  const k = clamp01(v / 0.8);
  if (k < 1) {
    for (let i = 0; i < 2; i++) {
      const w = fx3Take(h, 'wall');
      fx3Wall(w, e.x, e.y + 9, (0.8 + k * 3.8) * (1 - i * 0.22), 1.3 * (1 - k) + 0.1);
      fx3Color(w, i ? '#5a2aa8' : '#3a1670', 0.32 * (1 - k));
    }
    n3Glow(h, tx, 1, tz, 6 * (0.4 + k), BOW3.violet, 0.55 * (1 - k));
    n3Glow(h, tx, 0.8, tz, 2.5 * (1 - k), '#f2eaff', 0.6 * (1 - k));
    for (let i = 0; i < (low ? 8 : 16); i++) {
      const a = (i / (low ? 8 : 16)) * Math.PI * 2;
      const r = 0.8 + k * 3.6;
      n3Smoke(h, tx + Math.cos(a) * r, 0.3 + k * 0.6, tz + Math.sin(a) * r * 0.85, 0.8 + k * 0.6, '#1a0e2a', 0.55 * (1 - k) * (1 - k));
    }
    _bw3a.set(tx, 0, tz);
    _bw3b.set(tx, 8, tz);
    const col = fx3Take(h, 'seg');
    fx3Segment(col, _bw3a, _bw3b, 0.5 * (1 - k) + 0.04);
    fx3Color(col, BOW3.violet, 0.32 * (1 - k) * (1 - k));
  }
  const nf = low ? 8 : 18;
  const fk = clamp01(v / 1.8);
  if (fk < 1) {
    for (let i = 0; i < nf; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = (0.4 + 2.8 * ((i * 0.618) % 1)) * easeOut(clamp01(v / 0.5));
      const yy = (1 + 2.4 * ((i * 0.37) % 1)) * (1 - fk) + 0.1 + Math.sin(v * 3 + i) * 0.1;
      bowFeather3(h, tx + Math.cos(a) * r + Math.sin(v * 2 + i) * 0.3, yy, tz + Math.sin(a) * r, 0.4, a + v * 2, 1 - fk);
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
// seit 13.70: Salve und Schattenstoß in 2D (seit 13.76 Pfeilregen statt Giftfalle, weiter unten)
EXTRA_EFFECTS.bsalvo3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  let pulse = 0;
  for (const r of e.rel) if (t >= r) pulse = Math.max(pulse, Math.exp(-(t - r) * 10));
  const fade = Math.min(1, t / 0.1) * clamp01((e.dur - t) / 0.3);
  ctx.save();
  ctx.globalAlpha = 0.45 * fade;
  ctx.fillStyle = '#120a1a';
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 20, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 22, 30 + pulse * 14, '#8a4ae8', (0.35 + 0.4 * pulse) * fade);
  const f = (e.follow && e.follow.facing) || { x: 0, y: 1 };
  glow2(ctx, x + f.x * 14, y - 22 + f.y * 8, 10 + pulse * 10, '#c49aff', (0.5 + 0.5 * pulse) * fade);
  ctx.restore();
};
EXTRA_EFFECTS.bsalvohit3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.globalAlpha = 0.7 * (1 - k);
  ctx.fillStyle = '#120a1a';
  ctx.beginPath();
  ctx.ellipse(x, y - 14, 12 + k * 46, 8 + k * 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 20, 22 + k * 30, '#8a4ae8', 0.8 * (1 - k));
  ctx.restore();
};
// Pfeilregen in 2D (seit 13.76): Salve nach oben, dunkle Wolke über dem Kreis mit weichem Schatten darunter, fallende
// Pfeile mit violetter Spur, Staub beim Einschlag, steckende Pfeile, die verblassen
EXTRA_EFFECTS.bregen3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const rainEnd = e.delay + e.ticks * e.every;
  const on = clamp01((t - e.delay + 0.45) / 0.6);
  const off = clamp01((t - rainEnd - 0.1) / 1.0);
  const vis = on * (1 - off);
  const R = e.R;
  const rk = e.rk >= 0 ? e.rk : -1;
  const rcol = rk >= 0 ? SKILL_RANKS[rk].color : null;
  const rshare = rk >= 0 ? 0.2 + 0.12 * rk : 0;
  ctx.save();
  ctx.lineCap = 'round';
  // Salve in den Himmel (vom Schützen aus)
  const sxp = x + (e.ox - e.x);
  const syp = y + (e.oy - e.y) - 26;
  for (const at of e.shots || []) {
    const u = (t - at) / 0.5;
    if (u < 0 || u >= 1) continue;
    const py = syp - u * 260;
    const px = sxp + (x - sxp) * u * 0.25;
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = '#8a4ae8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - (x - sxp) * 0.02, py + 30);
    ctx.stroke();
  }
  // weicher Schatten der Wolke über dem Kreis
  if (vis > 0.01) {
    ctx.globalAlpha = 0.28 * vis;
    const g = ctx.createRadialGradient(x, y, 4, x, y, R * 1.1);
    g.addColorStop(0, 'rgba(18,10,26,0.9)');
    g.addColorStop(0.7, 'rgba(26,14,40,0.6)');
    g.addColorStop(1, 'rgba(26,14,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, R * 1.1, R * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pfeile
  for (const a of rainArrows(e)) {
    const age = t - a.at;
    if (age < -a.fall || age > BOW_RAIN.stick + BOW_RAIN.sink) continue;
    const ax = x + (a.x - e.x);
    const ay = y + (a.y - e.y);
    const trc = rcol && a.tr < rshare ? rcol : '#a070f0';
    if (age < 0) {
      const hh = a.H * 22 * (-age / a.fall);
      const ox = -a.dx * hh * 0.4;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = trc;
      ctx.lineWidth = a.big ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(ax + ox - a.dx * 14, ay - hh - 26);
      ctx.lineTo(ax + ox, ay - hh);
      ctx.stroke();
      ctx.strokeStyle = '#1e0c30';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ax + ox - a.dx * 5, ay - hh - 10);
      ctx.lineTo(ax + ox, ay - hh);
      ctx.stroke();
      continue;
    }
    const sink = clamp01((age - BOW_RAIN.stick) / BOW_RAIN.sink);
    if (age < 0.35) {
      const q = age / 0.35;
      ctx.globalAlpha = 0.5 * (1 - q);
      ctx.fillStyle = '#5e5040';
      ctx.beginPath();
      ctx.ellipse(ax, ay - q * 6, 4 + q * 8, 2.5 + q * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1 - sink;
    ctx.strokeStyle = '#2a1838';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - a.dx * 10, ay - 12 * (1 - sink * 0.6));
    ctx.stroke();
  }
  // Wolke oben: dunkle Ballen, violetter Schimmer
  if (vis > 0.01) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t * 0.07 * (i % 2 ? 1 : -1);
      const d = R * (0.2 + 0.6 * n2h(i, e.seed + 21));
      const cx = x + Math.cos(a) * d;
      const cy = y - 150 - off * 20 + Math.sin(a) * d * 0.35;
      const r = R * (0.45 + 0.2 * n2h(i, e.seed + 23));
      ctx.globalAlpha = 0.3 * vis;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(30,16,46,0.95)');
      g.addColorStop(1, 'rgba(20,11,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, x, y - 150, R * 0.7, rcol || '#8a4ae8', 0.18 * vis);
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
// Splitterfalke in 2D (seit 14.16): leuchtender Pfeil im hohen Bogen, am Ziel dunkle Wolke, Blitz und Splitter,
// die nach außen fliegen und kurz stecken bleiben
EXTRA_EFFECTS.bsplit3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const ti = t - e.rel - e.fly;
  if (t < e.rel) return;
  ctx.save();
  if (ti < 0) {
    const u = (t - e.rel) / e.fly;
    const sx = x + (e.ox - e.x);
    const sy = y + (e.oy - e.y) - 24;
    const H = 50 + Math.hypot(e.ox - e.x, e.oy - e.y) * 0.3;
    const px = sx + (x - sx) * u;
    const py = sy + (y - sy) * u - 4 * H * u * (1 - u);
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, px, py, 14 + u * 10, '#8a4ae8', 0.8);
    glow2(ctx, px, py, 5, '#e8d8ff', 0.9);
    glow2(ctx, x, y - 6, 10 + u * 30, '#5a2aa8', 0.35 * u);
    ctx.restore();
    return;
  }
  const q = clamp01(ti / (BOW_SPLIT.stick + BOW_SPLIT.sink));
  ctx.globalAlpha = 0.6 * (1 - q);
  ctx.fillStyle = '#120a1a';
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 14 + Math.min(1, ti * 3) * e.R * 0.7, 8 + Math.min(1, ti * 3) * e.R * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  if (ti < 0.35) glow2(ctx, x, y - 14, 30 + ti * 200, '#8a4ae8', 0.85 * (1 - ti / 0.35));
  ctx.strokeStyle = '#b48cff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + n2h(i, e.seed) * 0.4;
    const d = e.R * (0.3 + 0.6 * n2h(i, e.seed + 1)) * Math.min(1, ti / 0.35);
    const sx = x + Math.cos(a) * d;
    const sy = y + Math.sin(a) * d * 0.6;
    ctx.globalAlpha = 0.8 * (1 - q);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * 4, sy - 9);
    ctx.stroke();
  }
  // Schattendornen (seit 14.18): dunkle Zacken schießen in einer Welle aus dem Boden der Fläche
  const ts = ti - BOW_SPLIT.spike;
  if (ts > 0 && ts < 0.9) {
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 16; i++) {
      const ring = i < 4 ? 0.25 : i < 9 ? 0.6 : 0.9;
      const tk = ts - ring * 0.12;
      if (tk < 0 || tk > 0.75) continue;
      const up = tk < 0.1 ? tk / 0.1 : tk < 0.45 ? 1 : 1 - (tk - 0.45) / 0.3;
      const a = n2h(i, e.seed + 70) * Math.PI * 2;
      const d = e.R * ring * (0.75 + 0.35 * n2h(i, e.seed + 71));
      const bx = x + Math.cos(a) * d;
      const by = y + Math.sin(a) * d * 0.6;
      const hh = (18 + 14 * n2h(i, e.seed + 72)) * up;
      ctx.globalAlpha = 0.9 * up;
      ctx.fillStyle = '#2a1a42';
      ctx.beginPath();
      ctx.moveTo(bx - 4, by);
      ctx.lineTo(bx + Math.cos(a) * 3, by - hh);
      ctx.lineTo(bx + 4, by);
      ctx.fill();
      ctx.strokeStyle = '#b48cff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
};
EXTRA_EFFECTS.beye3 = (ctx, e, k, x, y) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 70, 20, '#8a4ae8', 0.7 * (1 - k));
  ctx.restore();
};
// Schattenadler in 2D (seit 14.93): von oben gesehen, Flügel mit gefingerten Schwungfedern, Schlag als Verkürzung,
// dunkle Aura; Mitte (x,y), Blickrichtung ang, Größe s (Spannweite ≈ 2,6·s), Schlag fl (−1 … 1), angelegt sw (0–1)
function eagle2d(ctx, x, y, s, ang, fl, sw, a, lit) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = a;
  // Aura: dunkler Rauch und violetter Saum
  const g = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.5);
  g.addColorStop(0, 'rgba(40,10,70,0.55)');
  g.addColorStop(0.6, 'rgba(60,20,110,0.25)');
  g.addColorStop(1, 'rgba(20,5,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = lit ? '#b48cff' : '#8a4ae8';
  ctx.shadowBlur = s * (lit ? 0.7 : 0.35);
  const len = Math.max(0.25, Math.cos(fl * 0.9)) * (1 - sw * 0.45); // Verkürzung beim Schlag, angelegt kürzer
  const back = sw * 0.55;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(1, side);
    ctx.fillStyle = '#120c18';
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.08);
    // Vorderkante bis zum Handgelenk, dann fünf Schwungfedern als Finger, Hinterkante gestuft zurück
    const wx = s * (0.08 - back * 0.5);
    const wy = s * 0.75 * len;
    ctx.quadraticCurveTo(s * 0.25, wy * 0.5, wx + s * 0.05, wy);
    for (let i = 0; i < 5; i++) {
      const fa = -0.15 - i * 0.22 - back * 0.6;
      const fl2 = s * (0.5 - Math.abs(i - 1.5) * 0.05) * len;
      const bx = wx - i * s * 0.07;
      const by = wy - i * s * 0.02;
      ctx.lineTo(bx + Math.sin(fa) * fl2 * 0.2 + s * 0.02, by + Math.cos(fa) * fl2 * 0.95);
      ctx.lineTo(bx - s * 0.035, by + s * 0.02);
    }
    ctx.lineTo(s * (-0.32 - back * 0.3), wy * 0.62);
    ctx.lineTo(s * -0.26, wy * 0.42);
    ctx.lineTo(s * -0.33, wy * 0.25);
    ctx.lineTo(s * -0.18, s * 0.08);
    ctx.closePath();
    ctx.fill();
    // Schimmer auf den Deckfedern
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(180,140,255,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(s * 0.16, s * 0.1);
    ctx.quadraticCurveTo(s * 0.22, wy * 0.5, wx + s * 0.04, wy * 0.98);
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = s * 0.25;
  // Schwanzfächer, Rumpf, Kopf, Hakenschnabel, Augen
  ctx.fillStyle = '#16101c';
  ctx.beginPath();
  ctx.moveTo(s * -0.3, s * -0.07);
  ctx.lineTo(s * -0.7, s * -0.17);
  ctx.quadraticCurveTo(s * -0.78, 0, s * -0.7, s * 0.17);
  ctx.lineTo(s * -0.3, s * 0.07);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.42, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#211a28';
  ctx.beginPath();
  ctx.ellipse(s * 0.45, 0, s * 0.13, s * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8b030';
  ctx.beginPath();
  ctx.moveTo(s * 0.54, s * -0.045);
  ctx.quadraticCurveTo(s * 0.7, s * -0.03, s * 0.72, 0);
  ctx.quadraticCurveTo(s * 0.7, s * 0.03, s * 0.54, s * 0.045);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  for (const ey of [-1, 1]) glow2(ctx, s * 0.5, ey * s * 0.065, s * 0.06, '#c49aff', 0.9);
  if (lit) glow2(ctx, 0, 0, s * 0.55, '#8a4ae8', 0.35);
  ctx.restore();
}
EXTRA_EFFECTS.beagle3 = (ctx, e, k, x, y) => {
  if (e.cancel) return;
  const t = game.time - e.start;
  const C = e.charge;
  const B = ultEagleBow(e);
  const bx = x + (B.x - e.x);
  const by = y + (B.y - e.y) - 26;
  const ang = Math.atan2(B.fy, B.fx);
  const S = 40;
  if (t < C) {
    // Spannen: Licht sammelt sich am Bogen, Schattenfunken strömen hinein, der Adler formt sich
    const q = t / C;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow2(ctx, bx, by, 10 + 34 * q * q, '#8a4ae8', 0.4 + 0.5 * q);
    glow2(ctx, bx, by, 4 + 10 * q, '#efe6ff', 0.5 * q);
    for (let i = 0; i < 12; i++) {
      const f = (t * 1.3 + i / 12) % 1;
      const a = (i / 12) * Math.PI * 2 + t * 5 + f * 3;
      const r = (1 - f) * 60;
      glow2(ctx, bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.7, 3 + 4 * f, '#c49aff', 0.7 * f);
    }
    ctx.restore();
    const g = clamp01((q - 0.45) / 0.55);
    if (g > 0) eagle2d(ctx, bx + Math.cos(ang) * 8, by + Math.sin(ang) * 8, S * (0.35 + 0.35 * g), ang, -0.2, 0.5 * (1 - g), g * 0.95, true);
    return;
  }
  const tx = x;
  const ty = y - 20;
  const v0 = t - C;
  if (v0 < e.fly) {
    const u = v0 / e.fly;
    const px = bx + (tx - bx) * u;
    const py = by + (ty - by) * u - Math.sin(Math.PI * u) * 24;
    // Lichtschweif
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const back = Math.min(B.L * u, 260);
    const ex = px - Math.cos(ang) * back;
    const ey = py - Math.sin(ang) * back;
    const gr = ctx.createLinearGradient(ex, ey, px, py);
    gr.addColorStop(0, 'rgba(138,74,232,0)');
    gr.addColorStop(1, 'rgba(196,154,255,0.85)');
    ctx.strokeStyle = gr;
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,238,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(ang) * back * 0.6, py - Math.sin(ang) * back * 0.6);
    ctx.lineTo(px, py);
    ctx.stroke();
    glow2(ctx, px, py, 60, '#8a4ae8', 0.55);
    ctx.restore();
    eagle2d(ctx, px, py, S * 1.15, ang, Math.sin(t * 16) * 0.3, 0.15, 1, true);
    return;
  }
  const q = clamp01((v0 - e.fly) / 0.8);
  if (q >= 1) return;
  ctx.save();
  ctx.fillStyle = `rgba(16,6,28,${0.45 * (1 - q)})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 30 + q * 110, (30 + q * 110) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 12, 40 + q * 130, '#8a4ae8', 0.7 * (1 - q));
  glow2(ctx, x, y - 12, 26 * (1 - q), '#efe6ff', 0.8 * (1 - q));
  ctx.restore();
};

// --- Symbole ------------------------------------------------------------------------------------------------
// seit 13.67 dunkel: alle Bogen-Symbole auf schwarzviolettem Grund (Schattenmagie)
Object.assign(ICON_THEME, {
  himmel: ['#4a2a8a', '#0a0614', '#d8c8ff'],
  falke: ['#6a3ab0', '#0c0618', '#e8d8ff'],
  nachtfalke: ['#5a2aa8', '#06030c', '#c8a8ff']
});
Object.assign(SKILL_ART_THEME, { falkenpfeil: 'falke', pfeilregen: 'nachtfalke', durchschuss: 'nachtfalke', splitterfalke: 'nachtfalke', falkenblick: 'nachtfalke', schattenwechsel: 'nachtfalke', himmelsfalke: 'nachtfalke' });

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

// Falkenpfeil (seit 13.70 Salve): drei violett leuchtende Pfeile hintereinander schräg nach oben rechts, jeder mit
// dunkler Schattenspur, der vorderste größer mit hellem Kern; dunkelvioletter Schein dahinter
SKILL_ART.falkenpfeil = function (ctx, IK) {
  IK.light(ctx, 4, -4, 24, '#8a4ae8', 0.7);
  // drei Pfeile nebeneinander, der mittlere vorn (die Salve fliegt Schlag auf Schlag)
  const shots = [[-21, 3, 1, -19, 1.7, 0.8], [-4, 20, 18, -2, 1.7, 0.8], [-13, 12, 14, -15, 2.5, 1]];
  for (const [x0, y0, x1, y1, w, a] of shots) {
    // Schattenspur hinter dem Pfeil
    ctx.save();
    ctx.globalAlpha = a;
    const tg = ctx.createLinearGradient(x0 - 9, y0 + 9, x0 + 4, y0 - 4);
    tg.addColorStop(0, 'rgba(20,8,32,0)');
    tg.addColorStop(1, 'rgba(90,40,170,0.9)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = w * 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 - 9, y0 + 9);
    ctx.lineTo(x0 + 3, y0 - 3);
    ctx.stroke();
    ctx.restore();
    ikBowArrow(ctx, IK, x0, y0, x1, y1, { w, head: '#e8d8ff', glow: '#b48cff', fletch: '#3a1a6a' });
  }
  // violetter Kern an der vordersten Spitze
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(14, -15, 0, 14, -15, 8);
  cg.addColorStop(0, 'rgba(240,226,255,0.95)');
  cg.addColorStop(0.4, 'rgba(180,140,255,0.7)');
  cg.addColorStop(1, 'rgba(120,60,220,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(4, -25, 20, 20);
  ctx.restore();
  IK.sparkles(ctx, 5, '#e8d8ff', 17, 9, 8, -8, 1.3);
};
// Pfeilregen (seit 13.76): oben eine dunkle Wolke mit violettem Saum, aus ihr stürzen Schattenpfeile steil herab, jeder
// mit violetter Spur; unten stecken zwei Pfeile schräg in der Erde, Staub und Schattenrauch wirbeln auf
SKILL_ART.pfeilregen = function (ctx, IK) {
  IK.light(ctx, 0, 0, 24, '#8a4ae8', 0.65);
  // Spuren und fallende Pfeile (hinter der Wolke beginnend)
  const fall = [[-14, -2, 1.5, 0.75], [-5, 6, 1.9, 1], [5, 0, 1.6, 0.85], [14, 7, 1.8, 0.95], [1, 14, 2.2, 1]];
  for (const [tx, ty, w, a] of fall) {
    const x0 = tx - 3.6;
    const y0 = ty - 11.5;
    ctx.save();
    ctx.globalAlpha = a;
    const tg = ctx.createLinearGradient(x0 - 3, y0 - 9, tx, ty);
    tg.addColorStop(0, 'rgba(20,8,32,0)');
    tg.addColorStop(1, 'rgba(150,100,240,0.85)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = w * 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 - 3, y0 - 9);
    ctx.lineTo(x0 + 1.5, y0 + 4.5);
    ctx.stroke();
    ctx.restore();
    ikBowArrow(ctx, IK, x0, y0, tx, ty, { w, head: '#e8d8ff', glow: '#b48cff', fletch: '#3a1a6a' });
  }
  // zwei Pfeile stecken unten in der Erde, Staub und Schattenrauch
  for (const [x, y] of [[-13, 18], [12, 19]]) {
    IK.fill(ctx, (c) => { c.moveTo(x + 7, y); c.ellipse(x, y, 7, 2.6, 0, 0, Math.PI * 2); }, 'rgba(110,90,70,0.55)', 0);
    IK.fill(ctx, (c) => { c.moveTo(x + 4, y - 3); c.ellipse(x + 1, y - 3, 4, 2.4, 0, 0, Math.PI * 2); }, 'rgba(60,30,100,0.55)', 0);
    ikBowArrow(ctx, IK, x - 3, y - 10, x + 0.6, y + 0.5, { w: 1.6, head: '#c8b0ff', fletch: '#3a1a6a' });
  }
  // Wolke: dunkle Ballen mit violettem Saum
  IK.fill(ctx, (c) => {
    for (const [cx, cy, rx, ry] of [[-12, -15, 8, 5.5], [0, -18, 10, 6.5], [12, -15, 8, 5.5], [-5, -12, 9, 5], [6, -12, 9, 5]]) {
      c.moveTo(cx + rx, cy);
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
  }, IK.lin(ctx, 0, -25, 0, -7, [[0, '#7a5ab0'], [0.45, '#3a2260'], [1, '#140a20']]), 1.4, 'rgba(200,160,255,0.9)');
  // heller Saum oben auf den Wolkenballen
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(210,180,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const [cx, cy, rx, ry] of [[-12, -15, 8, 5.5], [0, -18, 10, 6.5], [12, -15, 8, 5.5]]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.8, ry * 0.75, 0, Math.PI * 1.15, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(0, -10, 0, 0, -10, 14);
  cg.addColorStop(0, 'rgba(180,140,255,0.45)');
  cg.addColorStop(1, 'rgba(120,60,220,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(-16, -24, 32, 28);
  ctx.restore();
  IK.sparkles(ctx, 5, '#e8d8ff', 23, 12, 2, 8, 1.2);
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
// Splitterfalke (seit 14.16 statt Rückensprung): oben stößt ein kleiner Schattenfalke kopfüber herab, darunter zerbirst
// er in einem violetten Blitz – Splitter aus dunklem Schattenglas fliegen nach allen Seiten, zwei stecken schräg im Boden
SKILL_ART.splitterfalke = function (ctx, IK) {
  IK.light(ctx, 0, 8, 24, '#8a4ae8', 0.7);
  const cx = 0;
  const cy = 9;
  // Splitter: Doppelspitzen aus Schattenglas, violett gesäumt, mit hellem Kern
  const shard = (x, y, a, len, wid, a0 = 1) => {
    ctx.save();
    ctx.globalAlpha = a0;
    ctx.translate(x, y);
    ctx.rotate(a);
    IK.fill(ctx, (c) => { c.moveTo(len, 0); c.lineTo(len * 0.25, -wid); c.lineTo(-len * 0.35, 0); c.lineTo(len * 0.25, wid); c.closePath(); },
      IK.lin(ctx, -len * 0.35, 0, len, 0, [[0, '#120a1c'], [0.55, '#3a2260'], [1, '#c8a8ff']]), 0.7, 'rgba(180,140,255,0.95)');
    ctx.strokeStyle = 'rgba(240,226,255,0.8)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-len * 0.1, 0);
    ctx.lineTo(len * 0.85, 0);
    ctx.stroke();
    ctx.restore();
  };
  for (const [a, d, len, wid] of [[-2.75, 9, 9, 2.4], [-2.2, 12, 8, 2.1], [-0.4, 12, 8, 2.1], [0.2, 10, 9, 2.4], [2.9, 9, 7, 2], [0.55, 8, 6, 1.8], [2.55, 7, 6, 1.8], [-1.0, 13, 6, 1.6], [-1.95, 14, 6, 1.6]]) {
    shard(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, a, len, wid);
  }
  // zwei Splitter stecken schon im Boden
  for (const [x, y, a] of [[-16, 20, -1.95], [16, 21, -1.2]]) {
    IK.fill(ctx, (c) => c.ellipse(x, y + 1, 5, 1.6, 0, 0, Math.PI * 2), 'rgba(10,4,20,0.6)', 0);
    shard(x, y, a, 8, 2.2);
  }
  // Blitz in der Mitte
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 11);
  cg.addColorStop(0, 'rgba(250,244,255,1)');
  cg.addColorStop(0.35, 'rgba(190,150,255,0.85)');
  cg.addColorStop(1, 'rgba(120,60,220,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(cx - 12, cy - 12, 24, 24);
  ctx.restore();
  // Schattenfalke stößt herab: Flügel im V nach oben, Kopf unten zum Blitz
  ctx.save();
  ctx.translate(0, -9);
  ctx.scale(0.62, 0.62);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    const wing = (c) => {
      c.moveTo(2.5, -2);
      c.quadraticCurveTo(9, -10, 21, -19);
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
    IK.glow(ctx, '#a070f0', 6, () => IK.fill(ctx, wing, IK.lin(ctx, 3, 4, 20, -18, [[0, '#3a2058'], [0.45, '#1a0e28'], [1, '#8a5ae0']]), 1.2, 'rgba(150,110,240,0.9)'));
    ctx.restore();
  }
  IK.fill(ctx, (c) => { c.moveTo(-2.5, -6); c.lineTo(-5.5, -15); c.quadraticCurveTo(0, -17.5, 5.5, -15); c.lineTo(2.5, -6); c.closePath(); },
    IK.lin(ctx, 0, -17, 0, -6, [[0, '#8a5ae0'], [1, '#1a0e28']]), 1.2, 'rgba(150,110,240,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(0, -8); c.quadraticCurveTo(5, -2, 3.2, 6); c.quadraticCurveTo(0, 10, -3.2, 6); c.quadraticCurveTo(-5, -2, 0, -8); c.closePath(); },
    IK.lin(ctx, 0, -8, 0, 9, [[0, '#2a1840'], [1, '#120a1c']]), 1.2, 'rgba(150,110,240,0.9)');
  IK.fill(ctx, (c) => { c.moveTo(-1.8, 8); c.lineTo(0, 12.5); c.lineTo(1.8, 8); c.closePath(); }, '#6a3ab0', 0.8);
  for (const ex of [-1.6, 1.6]) IK.fill(ctx, (c) => c.arc(ex, 5.5, 0.9, 0, Math.PI * 2), '#e8d8ff', 0);
  ctx.restore();
  IK.sparkles(ctx, 6, '#e8d8ff', 41, 18, 0, 8, 1.3);
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
// Sturm des Schattenadlers: Geisterfalke stößt kopfüber herab (Flügel hoch im V, Schwanzfächer oben), darunter Pfeile
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
  IK.fill(ctx, (c) => { c.moveTo(-2, 8); c.quadraticCurveTo(0, 14, 1.2, 12.5); c.lineTo(2, 8); c.closePath(); }, '#e8b030', 0.6);
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
    const free = bagFree(p); // seit 14.84: gesperrte Seiten III/IV zählen nicht (sozial-freischalten.js)
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
