// Endbosse (seit 11.0): mehr Schaden, Kristall-Schild, Vernichtung, Beute +0 mit Aufwertung aus ihrer Map
//
// Kristall-Schild: Bei 75 % und 40 % Leben ruft der Endboss Seelenkristalle in seine Halle (3, ab drei Spielern
// mehr, höchstens 5). Solange einer steht, ist er unverwundbar – eine Wabenkuppel aus Licht umgibt ihn, von jedem
// Kristall läuft ein Strahl zu ihm – und er heilt sich langsam. Fällt der letzte Kristall, zerspringt die Kuppel
// und der Boss taumelt 4 s lang (nimmt dabei 25 % mehr Schaden).
// Vernichtung (Ulti der Endbosse): Bei 55 % und 20 % Leben, danach alle 50 s, springt der Boss in die Mitte
// seiner Halle. Der Boden färbt sich blutrot, über ihm dreht sich ein Siegel am Himmel, rote Ströme ziehen zu ihm.
// Nur zwei bis drei Lichtkreise mit grüner Säule sind sicher. Nach 5 s trifft eine Druckwelle alle außerhalb der
// Kreise mit gewaltigem Schaden.

const RAID = {
  shieldAt: [0.75, 0.4],
  doomAt: [0.55, 0.2],
  doomEvery: 50,
  doomCast: 5,
  safeR: 85,
  crystalHp: 0.025, // Anteil am Bossleben je Kristall
  crystalHeal: 0.004, // Heilung des Bosses je Kristall und Sekunde (Anteil)
  stagger: 4,
  staggerDmg: 1.25
};
RAID_MUL.doom = 14;

// --- Kristalle finden (einmal je Bild, für Host und Mitspieler gleich) -----------------------------------
const raidFrame = { t: -1, crystals: [], count: new Map() };
function raidScan() {
  if (raidFrame.t === game.time) return raidFrame;
  raidFrame.t = game.time;
  raidFrame.crystals.length = 0;
  raidFrame.count.clear();
  let bosses = null;
  for (const c of game.monsters) {
    if (c.dead || !c.type || !c.type.crystal) continue;
    if (!bosses) bosses = game.monsters.filter((b) => b.type && b.type.raid);
    let best = null;
    let bd = RAID_REACH;
    for (const b of bosses) {
      const d = Math.hypot(c.x - b.homeX, c.y - b.homeY);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) continue;
    c.crystalBoss = best;
    raidFrame.crystals.push(c);
    raidFrame.count.set(best, (raidFrame.count.get(best) || 0) + 1);
  }
  return raidFrame;
}
function raidShielded(m) {
  return !!(m && m.type && m.type.raid && (raidScan().count.get(m) || 0) > 0);
}

// Treffer auf den geschützten Boss: kein Schaden, die Kuppel blitzt auf
function raidShieldHit(m) {
  m.shieldHitAt = game.time;
  if (game.time - (m.shieldTextAt || -9) < 0.6) return;
  m.shieldTextAt = game.time;
  addText(m.x, feetY(m) - figureHeight(m) * 0.9, 'Schild!', 'info');
}

// --- Host: Ablauf ------------------------------------------------------------------------------------
// Gibt true zurück, wenn der Boss in diesem Bild nichts anderes tun soll
// Schild jedes Bild prüfen (auch während eines Angriffs): Kristalle heilen, ohne Kristalle bricht er
function raidShieldTick(m, dt) {
  const R = m.raid;
  if (!R.shieldOn) return;
  const n = raidScan().count.get(m) || 0;
  if (n > 0) {
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * RAID.crystalHeal * n * dt);
    return;
  }
  R.shieldOn = false;
  R.stagger = game.time + RAID.stagger;
  // ein laufender Angriff bricht ab (die Vernichtung nicht: die Kreise liegen schon)
  if (m.cast && m.cast.kind !== 'doom') m.cast = null;
}

function raidMechanics(m, dt) {
  const R = m.raid;
  const now = game.time;
  const hpk = m.hp / m.maxHp;
  if (R.stagger > now) {
    m.moving = false;
    return true;
  }
  for (let i = 0; i < RAID.shieldAt.length; i++) {
    if (hpk <= RAID.shieldAt[i] && !((R.shields || 0) & (1 << i))) {
      R.shields = (R.shields || 0) | (1 << i);
      raidSummonCrystals(m);
      return true;
    }
  }
  let doom = false;
  for (let i = 0; i < RAID.doomAt.length; i++) {
    if (!doom && hpk <= RAID.doomAt[i] && !((R.dooms || 0) & (1 << i))) {
      R.dooms = (R.dooms || 0) | (1 << i);
      doom = true;
    }
  }
  if (!doom && R.dooms && now >= (R.doomNext || 0)) doom = true;
  if (doom) {
    raidDoom(m);
    return true;
  }
  return false;
}

// Boss verlässt den Kampf (alle tot oder weg): Kristalle verschwinden, alles beginnt von vorn
function raidReset(m) {
  const R = m.raid;
  R.shields = 0;
  R.dooms = 0;
  R.shieldOn = false;
  R.stagger = 0;
  for (const c of raidScan().crystals) if (c.crystalBoss === m) { c.dead = true; c.hp = 0; c.respawn = false; }
  raidFrame.t = -1;
}

function raidSummonCrystals(m) {
  const n = Math.min(5, 3 + Math.max(0, raidPlayers(m).length - 2));
  const home = { x: m.homeX, y: m.homeY };
  const a0 = Math.random() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2;
    const d = 270 + Math.random() * 110;
    let s = { x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d * 1.25 };
    if (!canStand(s.x, s.y, 10, true)) s = spotNear(home, 380);
    const c = createMonster('raidkristall', s.x, s.y, { respawn: false, zone: m.zone, level: m.level });
    c.hp = c.maxHp = Math.round(m.maxHp * RAID.crystalHp);
    c.xp = 0;
    c.gold = [0, 0];
    game.monsters.push(c);
  }
  m.raid.shieldOn = true;
  m.attackAnim = 0.25;
  raidFrame.t = -1;
}

function raidDoom(m) {
  const R = m.raid;
  const now = game.time;
  const home = { x: m.homeX, y: m.homeY };
  const n = raidPlayers(m).length > 2 ? 3 : 2;
  const safe = [];
  for (let tries = 0; safe.length < n && tries < 60; tries++) {
    const s = spotNear(home, 470);
    if (Math.hypot(s.x - home.x, s.y - home.y) < 170) continue;
    if (safe.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < 280)) continue;
    safe.push({ x: s.x, y: s.y + 10, r: RAID.safeR });
  }
  for (let k = safe.length; k < n; k++) safe.push({ x: home.x + (k ? -260 : 260), y: home.y + 10, r: RAID.safeR });
  // der Boss springt in die Mitte und lädt die Vernichtung auf
  m.dash = { x0: m.x, y0: m.y, x1: home.x, y1: home.y, t0: now, dur: 0.6 };
  m.cast = { kind: 'doom', circles: safe, inner: 0, at: now + RAID.doomCast };
  m.attackAnim = 0.25;
  R.doomNext = now + RAID.doomEvery;
  raidTelegraph(m, 'doom', safe, 0, RAID.doomCast);
  if (net.mode === 'host') netBroadcast({ t: 'raid', id: m.id, k: 'doom', c: safe.map((c) => [Math.round(c.x), Math.round(c.y), c.r]), in: 0, d: RAID.doomCast, atk: m.atk, lvl: m.level });
}

// Ankündigung (auch beim Mitspieler): Banner und das große Schauspiel
function raidDoomShow(m, safe, delay) {
  const b = m.type.boss;
  ui.banner(m.name, 'entfesselt die Vernichtung – rein in einen Lichtkreis!');
  shakeScreen(6);
  addEffect({ type: 'doom3', ground: true, x: m.homeX, y: m.homeY + 10, r: RAID_REACH, safe: safe.map((c) => [c.x, c.y, c.r]), cast: delay, dur: delay + 1.4, color: b.color });
  if (typeof snd !== 'undefined') snd.mob(m, 'aggro');
}

// Einschlag: alle außerhalb der Lichtkreise
function raidDoomResolve(m, safe, atk, lvl) {
  const b = m.type.boss;
  shakeScreen(16);
  flashScreen(b.color, 0.32);
  addEffect({ type: 'ring', x: m.homeX, y: m.homeY + 10, r: RAID_REACH * 0.9, dur: 0.9, color: b.color, width: 26, grow: true });
  const p = game.player;
  if (!p || p.dead || Math.hypot(p.x - m.homeX, p.y - m.homeY) > RAID_REACH) return;
  const fyp = feetY(p);
  if (safe.some((c) => Math.hypot(p.x - c.x, (fyp - c.y) * 1.2) < c.r)) {
    addText(p.x, p.y - 40, 'Sicher!', 'heal');
    return;
  }
  damagePlayer(calcDamage(atk, RAID_MUL.doom * levelBonus(lvl, p.level), game.stats.def, 0.05, lvl).amount, m);
}

// --- Für alle: Übergänge sichtbar machen (Kuppel entsteht, Kuppel zerspringt) ----------------------------
function raidWatch() {
  const p = game.player;
  if (!p || !game.running) return;
  for (const m of game.monsters) {
    if (!m.type || !m.type.raid || m.dead) continue;
    if (Math.abs(m.x - p.x) > 1600 || Math.abs(m.y - p.y) > 1600) continue;
    const sh = raidShielded(m);
    if (sh && !m.shieldWas) {
      const b = m.type.boss;
      ui.banner(m.name, 'hüllt sich in einen Kristallschild – zerstört die Seelenkristalle!');
      for (const c of raidScan().crystals) {
        if (c.crystalBoss !== m) continue;
        addEffect({ type: 'pillar', x: c.x, y: feetY(c), dur: 0.9, color: b.color });
        addEffect({ type: 'ring', x: c.x, y: feetY(c), r: 60, dur: 0.6, color: b.color, width: 8, grow: true });
      }
      addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 200, dur: 0.8, color: '#bfe8ff', width: 14, grow: true });
      shakeScreen(8);
    } else if (!sh && m.shieldWas) {
      const b = m.type.boss;
      ui.banner('Schild gebrochen!', `${m.name} taumelt – jetzt angreifen!`);
      const fy = feetY(m);
      addEffect({ type: 'shards3', x: m.x, y: fy, r: 90, count: 18, color: '#bfe8ff', glow: true, size: 0.8, dur: 0.9 });
      addEffect({ type: 'sparks3', x: m.x, y: fy, h: 1.2, count: 24, color: b.color, speed: 3.2, up: 1.6, dur: 0.8 });
      addEffect({ type: 'ring', x: m.x, y: fy, r: 240, dur: 0.7, color: '#bfe8ff', width: 16, grow: true });
      particles(m.x, fy - 40, { count: 50, color: ['#bfe8ff', '#ffffff', b.color], speed: [120, 340], life: [0.4, 0.9], size: [2, 4.5], shape: 'square', drag: 2.5 });
      shakeScreen(12);
      m.staggerFx = game.time + RAID.stagger;
    }
    m.shieldWas = sh;
  }
}

// Kristall zerbricht (statt Leiche)
function crystalDeathFx(c) {
  const b = c.crystalBoss && c.crystalBoss.type.boss;
  const col = b ? b.color : '#9fd8ff';
  const fy = feetY(c);
  addEffect({ type: 'shards3', x: c.x, y: fy, r: 40, count: 12, color: '#cfeaff', glow: true, size: 0.6, dur: 0.8 });
  addEffect({ type: 'ring', x: c.x, y: fy, r: 80, dur: 0.5, color: col, width: 8, grow: true });
  particles(c.x, fy - 28, { count: 30, color: ['#cfeaff', '#ffffff', col], speed: [80, 240], life: [0.4, 0.8], size: [2, 4], shape: 'square', drag: 2.5 });
  shakeScreen(5);
}

// --- 2D: Kristall und Vernichtung ---------------------------------------------------------------------
MONSTER_ART.raidkristall = {
  h: 50,
  draw(ctx) {
    const t = game.time;
    const lift = -8 + Math.sin(t * 2) * 2;
    glow(ctx, 0, lift - 22, 30, '#9fd8ff', 0.35 + 0.1 * Math.sin(t * 4));
    poly(ctx, [[0, lift - 46], [11, lift - 24], [6, lift - 4], [-6, lift - 4], [-11, lift - 24]], '#5a8ac8');
    poly(ctx, [[0, lift - 46], [11, lift - 24], [0, lift - 18]], '#bfe8ff');
    poly(ctx, [[0, lift - 46], [-11, lift - 24], [0, lift - 18]], '#8ab8e8');
    poly(ctx, [[0, lift - 18], [11, lift - 24], [6, lift - 4]], '#3a6aa8');
    poly(ctx, [[0, lift - 46], [3, lift - 30], [0, lift - 24], [-2, lift - 32]], '#ffffff');
  }
};

EXTRA_EFFECTS.doom3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const blast = t > e.cast;
  const a = blast ? Math.max(0, 1 - (t - e.cast) / 1.2) : Math.min(1, t / 0.5);
  ctx.save();
  ctx.globalAlpha = 0.28 * a;
  ctx.fillStyle = '#c81a1a';
  ctx.beginPath();
  ctx.ellipse(x, y, e.r, e.r / 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [sx, sy, sr] of e.safe) {
    const px = x + (sx - e.x);
    const py = y + (sy - e.y);
    ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = 'rgba(90,230,110,0.4)';
    ctx.strokeStyle = '#7aff8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(px, py, sr, sr / 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (!blast) {
    // Restzeit: ein roter Ring zieht sich von außen zusammen
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#ff3a2a';
    ctx.lineWidth = 6;
    const rr = e.r * Math.max(0.02, 1 - t / e.cast);
    ctx.beginPath();
    ctx.ellipse(x, y, rr, rr / 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

// --- 3D -----------------------------------------------------------------------------------------------
FX3_TYPES.add('doom3');
const _rb3a = new THREE.Vector3();
const _rb3b = new THREE.Vector3();
const _rb3c = new THREE.Color();

// Brusthöhe des Bosses in Einheiten (Endbosse sind in 3D stark vergrößert)
function raidChest3(m) {
  const sc = m.type.raid ? m.type.raid.scale : 1;
  return Math.min(3.2, Math.max(1.2, figureHeight(m) * U3 * 0.45 * sc));
}

// Kristalle, Strahlen zum Boss und die Wabenkuppel (jedes Bild)
const FX3_RAID = { parts: [], fn: fx3Raid };
FX3_HOOKS.push(FX3_RAID);
function fx3Raid(h) {
  const scan = raidScan();
  const t = game.time;
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  for (const c of scan.crystals) {
    if (!v3InView(c.x, c.y, 120)) continue;
    const m = c.crystalBoss;
    const col = m.type.boss.color;
    const x = c.x * U3;
    const z = feetY(c) * U3;
    const lift = 0.55 + 0.1 * Math.sin(t * 2 + c.id);
    const hit = Math.max(0, c.hitFlash || 0) / 0.12;
    const spin = t * 0.8 + c.id;
    // Boden: Runenkreis und pulsierender Rand
    const rune = fx3Take(h, 'planeN');
    fx3Ground(rune, c.x, feetY(c), 1.0, 0.03, 'rune', t * 0.6 + c.id);
    fx3Color(rune, col, 0.7);
    const rim = fx3Take(h, 'plane');
    fx3Ground(rim, c.x, feetY(c), 1.15, 0.04, 'ring', -t * 0.4);
    fx3Color(rim, col, 0.45 + 0.25 * Math.sin(t * 5 + c.id));
    // Körper: zwei Kegel (oben lang, unten kurz), facettiert und fest, darüber eine leuchtende Hülle
    _rb3c.set(col).lerp(_x3col.set('#dff4ff'), 0.6);
    const top = fx3Take(h, 'cone');
    top.position.set(x, lift + 0.55, z);
    top.scale.set(0.34, 1.1, 0.34);
    top.rotation.set(0, spin, 0);
    top.material.color.copy(_rb3c);
    top.material.opacity = 1;
    const bot = fx3Take(h, 'cone');
    bot.position.set(x, lift - 0.2, z);
    bot.scale.set(0.34, 0.4, 0.34);
    bot.rotation.set(Math.PI, spin, 0);
    bot.material.color.copy(_rb3c);
    bot.material.opacity = 1;
    for (const [o, y0, sy, flip] of [[fx3Take(h, 'coneG'), lift + 0.58, 1.25, 0], [fx3Take(h, 'coneG'), lift - 0.22, 0.48, Math.PI]]) {
      o.position.set(x, y0, z);
      o.scale.set(0.44, sy, 0.44);
      o.rotation.set(flip, spin, 0);
      fx3Color(o, hit > 0 ? '#ffffff' : col, 0.3 + 0.15 * Math.sin(t * 4 + c.id) + 0.5 * hit);
    }
    // Herz und Hof
    const core = fx3Take(h, 'sprite');
    fx3Map(core, 'disc');
    core.position.set(x, lift + 0.3, z);
    core.scale.set(1.3, 1.3, 1);
    fx3Color(core, col, 0.55 + 0.3 * hit);
    // Splitter kreisen um den Kristall
    for (let i = 0; i < (low ? 2 : 4); i++) {
      const a = t * 1.6 + i * (Math.PI * 2 / (low ? 2 : 4)) + c.id;
      const s = fx3Take(h, 'coneG');
      s.position.set(x + Math.cos(a) * 0.62, lift + 0.35 + 0.18 * Math.sin(t * 3 + i), z + Math.sin(a) * 0.62);
      s.scale.set(0.07, 0.24, 0.07);
      s.rotation.set(0.4 * Math.sin(a), a, 0);
      fx3Color(s, '#dff4ff', 0.85);
    }
    // Strahl zum Boss: dicker farbiger Mantel, heller Kern, Lichtpulse laufen zum Boss
    if (!m.dead) {
      _rb3a.set(x, lift + 1.0, z);
      _rb3b.set(m.x * U3, raidChest3(m), feetY(m) * U3);
      const beam = fx3Take(h, 'seg');
      fx3Segment(beam, _rb3a, _rb3b, 0.07 + 0.02 * Math.sin(t * 9 + c.id));
      fx3Color(beam, col, 0.5);
      const coreB = fx3Take(h, 'seg');
      fx3Segment(coreB, _rb3a, _rb3b, 0.022);
      fx3Color(coreB, '#ffffff', 0.75);
      for (let i = 0; i < (low ? 1 : 3); i++) {
        const f = (t * 0.9 + i / 3 + c.id * 0.13) % 1;
        const o = fx3Take(h, 'sprite');
        fx3Map(o, 'disc');
        o.position.lerpVectors(_rb3a, _rb3b, f);
        o.scale.set(0.4, 0.4, 1);
        fx3Color(o, '#e8f6ff', 0.9 * Math.sin(Math.PI * f));
      }
    }
  }
  // Kuppel um jeden geschützten Boss; nach dem Bruch kurz taumelnde Sterne
  for (const [m] of scan.count) {
    if (m.dead || !v3InView(m.x, m.y, 200)) continue;
    const col = m.type.boss.color;
    const R = Math.max(2.4, m.r * U3 * 2.3);
    const hit = Math.max(0, 1 - (t - (m.shieldHitAt || -9)) / 0.25);
    const x = m.x * U3;
    const z = feetY(m) * U3;
    // zarte Waben in Kristallblau (nicht weiß: additiv auf hellem Boden würde es sonst überstrahlen),
    // ein Treffer lässt sie kurz aufleuchten
    for (const [k, dir, op] of [[1, 1, 0.2], [1.06, -1, 0.09]]) {
      const d = fx3Take(h, 'dome');
      d.position.set(x, 0.02, z);
      d.scale.set(R * k, R * k * 0.92, R * k);
      d.rotation.set(0, t * 0.25 * dir, 0);
      fx3Color(d, '#5ab0f0', op + 0.03 * Math.sin(t * 2) + 0.25 * hit);
    }
    const glowD = fx3Take(h, 'dome');
    glowD.position.set(x, 0.02, z);
    glowD.scale.set(R * 0.98, R * 0.9, R * 0.98);
    fx3Map(glowD, null);
    fx3Color(glowD, col, 0.04);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, m.x, feetY(m), R * 1.02, 0.05, 'ring', t * 0.5);
    fx3Color(base, '#bfe8ff', 0.7);
  }
  // Taumeln nach dem Bruch: Sterne kreisen über dem Boss
  for (const m of game.monsters) {
    if (!m.type || !m.type.raid || m.dead || !(m.staggerFx > t) || !v3InView(m.x, m.y, 200)) continue;
    const y = raidChest3(m) * 1.6;
    for (let i = 0; i < 5; i++) {
      const a = t * 4 + i * 1.26;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'star');
      o.position.set(m.x * U3 + Math.cos(a) * 0.9, y + Math.sin(a * 2) * 0.1, feetY(m) * U3 + Math.sin(a) * 0.9);
      o.scale.set(0.5, 0.5, 1);
      fx3Color(o, '#ffe08a', 0.9);
    }
  }
}

// Vernichtung in 3D: blutroter Boden, Lichtkreise mit grünen Säulen, Siegel am Himmel, rote Ströme zum Boss,
// am Ende eine Druckwelle als wachsende Wand
FX3_DRAW.doom3 = function (h, e) {
  const t = game.time - e.start;
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  const cast = e.cast;
  const blast = Math.max(0, t - cast);
  const appear = Math.min(1, t / 0.6);
  const out = blast > 0 ? Math.max(0, 1 - blast / 1.3) : 1;
  const cx = e.x * U3;
  const cz = e.y * U3;
  const R = e.r * U3;
  const k = Math.min(1, t / cast);
  // Boden
  const shade = fx3Take(h, 'planeN');
  fx3Ground(shade, e.x, e.y, R, 0.02, 'disc');
  fx3Color(shade, '#4a0606', 0.5 * appear * out);
  const red = fx3Take(h, 'plane');
  fx3Ground(red, e.x, e.y, R * 0.9, 0.03, 'disc');
  fx3Color(red, '#ff2a1a', (0.16 + 0.04 * Math.sin(t * (2 + k * 4))) * appear * out);
  // Restzeit: ein roter Ring zieht sich zusammen
  if (!blast) {
    const ring = fx3Take(h, 'plane');
    fx3Ground(ring, e.x, e.y, Math.max(0.5, R * (1 - k)), 0.05, 'ring');
    fx3Color(ring, '#ff4a2a', 0.9);
  }
  // sichere Lichtkreise
  for (const [sx, sy, sr] of e.safe) {
    const r = sr * U3;
    const x = sx * U3;
    const z = sy * U3;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + sx);
    const hole = fx3Take(h, 'planeN');
    fx3Ground(hole, sx, sy, r * 1.05, 0.045, 'disc');
    fx3Color(hole, '#0e3a16', 0.6 * appear * out);
    const fill = fx3Take(h, 'plane');
    fx3Ground(fill, sx, sy, r, 0.055, 'disc');
    fx3Color(fill, '#5aff7a', 0.35 * appear * out);
    const rim = fx3Take(h, 'plane');
    fx3Ground(rim, sx, sy, r * 1.05, 0.06, 'ring', t);
    fx3Color(rim, '#9fffb0', (0.7 + 0.3 * pulse) * appear * out);
    const rune = fx3Take(h, 'planeN');
    fx3Ground(rune, sx, sy, r * 0.8, 0.065, 'rune', -t * 0.8);
    fx3Color(rune, '#2a9a4a', 0.75 * appear * out);
    const col = fx3Take(h, 'wall');
    fx3Wall(col, sx, sy, r * 0.95, 4.2 * appear, 0);
    fx3Color(col, '#7aff9a', (0.35 + 0.15 * pulse) * out);
    for (let i = 0; i < (low ? 2 : 5); i++) {
      const ph = (t * 0.6 + i / 5) % 1;
      const a = i * 1.3 + t;
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.set(x + Math.cos(a) * r * 0.6, 0.2 + ph * 3.6, z + Math.sin(a) * r * 0.6);
      o.scale.set(0.3, 0.3, 1);
      fx3Color(o, '#c8ffd4', 0.8 * Math.sin(Math.PI * ph) * out);
    }
  }
  // Siegel am Himmel über der Mitte und rote Ströme vom Rand hinauf
  if (!blast) {
    const sky = 5.2;
    const sig = fx3Take(h, 'plane');
    fx3Map(sig, 'rune');
    sig.position.set(cx, sky, cz);
    sig.scale.set(3.2 * appear, 3.2 * appear, 1);
    sig.rotation.set(-Math.PI / 2, 0, t * 0.9);
    fx3Color(sig, e.color, 0.85);
    const sig2 = fx3Take(h, 'plane');
    fx3Map(sig2, 'ring');
    sig2.position.set(cx, sky + 0.05, cz);
    sig2.scale.set(4.2 * appear, 4.2 * appear, 1);
    sig2.rotation.set(-Math.PI / 2, 0, -t * 0.5);
    fx3Color(sig2, '#ff3a2a', 0.8);
    const dark = fx3Take(h, 'smoke');
    dark.position.set(cx, sky + 0.3, cz);
    dark.scale.set(5 * appear, 5 * appear, 1);
    dark.material.color.set('#1a0404');
    dark.material.opacity = 0.55;
    const streams = low ? 6 : 12;
    for (let i = 0; i < streams; i++) {
      const a = (i / streams) * Math.PI * 2 + t * 0.3;
      const ph = (t * 0.8 + i * 0.37) % 1;
      _rb3a.set(cx + Math.cos(a) * R * 0.85, 0.2, cz + Math.sin(a) * R * 0.85);
      _rb3b.set(cx + Math.cos(a) * 0.6, sky, cz + Math.sin(a) * 0.6);
      const s = fx3Take(h, 'seg');
      fx3Segment(s, _rb3a, _rb3b, 0.05 + 0.04 * k);
      fx3Color(s, '#ff3a2a', (0.25 + 0.35 * k) * appear);
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.lerpVectors(_rb3a, _rb3b, ph);
      o.scale.set(0.45, 0.45, 1);
      fx3Color(o, '#ffb08a', 0.9 * Math.sin(Math.PI * ph));
    }
    // Säule aus der Mitte zum Siegel, wird zum Ende hin heller
    const pil = fx3Take(h, 'wall');
    fx3Wall(pil, e.x, e.y, 0.6 + 0.4 * k, sky, 0);
    fx3Color(pil, e.color, 0.35 + 0.45 * k);
  } else {
    // Druckwelle: wachsende Wand und heller Ring, rote Funken
    const g = easeOut(Math.min(1, blast / 0.7));
    const wall = fx3Take(h, 'wall');
    fx3Wall(wall, e.x, e.y, Math.max(0.5, R * g), 2.4 * out, 0);
    fx3Color(wall, '#ff5a3a', 0.7 * out);
    const ring = fx3Take(h, 'plane');
    fx3Ground(ring, e.x, e.y, Math.max(0.5, R * g), 0.08, 'ring');
    fx3Color(ring, '#ffd0a0', 0.9 * out);
    const flash = fx3Take(h, 'sprite');
    fx3Map(flash, 'disc');
    flash.position.set(cx, 1.5, cz);
    flash.scale.set(9 * (1 - out * 0.5), 9 * (1 - out * 0.5), 1);
    fx3Color(flash, e.color, 0.55 * out);
  }
};
