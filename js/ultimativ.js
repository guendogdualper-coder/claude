// Ultimative Attacken: jeder Weg bekommt ab Stufe 30 eine eigene, sehr starke Fertigkeit
// mit 3 Minuten Abklingzeit. Eigener Knopf neben dem Angriff, Taste 6.
// Die Stärke wächst mit der Spielerstufe und dem Fertigkeitsschaden (Intelligenz, Boni, Magie).

const ULT_UNLOCK = 30;
const ULT_COOLDOWN = 180;

const ULTIMATES = {
  klinge: {
    id: 'klingenhimmel', name: 'Klingenhimmel', short: 'KH', color: '#ffe9a0',
    text: 'Zehn geisterhafte Riesenschwerter stürzen vom Himmel um dich herum, dann zerbersten alle zugleich und betäuben die Gegner.',
    stats: 'je Schwert 1,6× Angriff, Explosion 3,5× im Umkreis'
  },
  leib: {
    id: 'titanenzorn', name: 'Titanenzorn', short: 'TZ', color: '#ff9a4a',
    text: 'Du springst hoch und schmetterst auf den Boden: Die Erde reißt auf, alle Gegner um dich werden 3 s betäubt. Danach 12 s Titanenhaut.',
    stats: '5× Angriff im großen Umkreis, Titanenhaut: −40 % erlittener Schaden',
    buff: { id: 'titanenhaut', name: 'Titanenhaut', duration: 12, effects: { damageTaken: -0.4, def: 0.3 } }
  },
  dolch: {
    id: 'schattenklone', name: 'Schattendoppelgänger', short: 'SD', color: '#c9b8ff',
    text: 'Du zerfällst in Rauch: Sechs Schattendoppelgänger umzingeln dein Ziel und stoßen alle im selben Augenblick zu. Dann tauchst du hinter ihm auf und vollendest mit einem Kreuzschnitt.',
    stats: '6 Doppelgänger je 3,2× Angriff (Gegner daneben 1,2×), Kreuzschnitt 6× aufs Ziel und 2,5× im Umkreis mit Betäubung'
  },
  schatten: {
    id: 'todesmal', name: 'Todesmal', short: 'TM', color: '#ff4a6a',
    text: 'Du zeichnest ein Ziel mit dem Todesmal und erscheinst hinter ihm: ein vernichtender Stich, der unter 35 % Leben noch einmal zuschlägt.',
    stats: '9× Angriff, sicher kritisch, unter 35 % Leben +4×',
    buff: { id: 'schattenschleier', name: 'Schattenschleier', duration: 8, effects: { dodge: 0.3, speed: 0.15 } }
  },
  // seit 9.7: Strom der Elemente statt Drachensturm (Ablauf in elementarstrom.js)
  drache: {
    id: 'elementarstrom', name: 'Strom der Elemente', short: 'SE', color: '#4ac8ff',
    text: 'Ein gewaltiger Wasserstrahl schießt 5,5 s lang aus deinen Händen, umwirbelt von Blitz, Feuer und Erde. Er dreht sich langsam zu deinem Ziel und trifft alles in der Linie; Blitze springen auf Getroffene über, Feuer setzt sie in Brand, der Boden reißt in glühenden Rissen auf. Zum Schluss bricht die Erde entlang des Strahls auf.',
    stats: '4 Wellen pro Sekunde je 0,35× Angriff mit Brand, Blitze 1,2× (kurz betäubt), Erdbruch am Ende 2,5×; du stehst dabei still'
  },
  heilung: {
    id: 'himmelssegen', name: 'Himmelssegen', short: 'HS', color: '#fff2a0',
    text: 'Himmelslicht heilt dich um 60 % und schützt dich 15 s. Lichtsäulen fahren auf bis zu 8 Gegner herab und betäuben sie.',
    stats: 'je Lichtsäule 3,5× Angriff, Segen: −45 % erlittener Schaden, Regeneration',
    buff: { id: 'himmelssegen', name: 'Himmelssegen', duration: 15, effects: { damageTaken: -0.45, regen: 0.02, atk: 0.15 } }
  },
  seelen: {
    id: 'seelenernte', name: 'Seelenernte', short: 'SE', color: '#7fe3a0',
    text: 'Ein Seelenstrudel zieht alle Gegner um dich zusammen und zehrt an ihnen, dann reißt er ihre Seelen heraus und heilt dich. Deine Diener werden voll geheilt, bleiben 15 s länger und greifen 8 s lang schneller an.',
    stats: '6 Sog-Treffer je 1×, Ernte 3,5×, heilt 3 % je Gegner; Diener: volle Heilung, +15 s, 8 s +33 % Angriffstempo'
  },
  knochen: {
    id: 'knochenkerker', name: 'Knochenkerker', short: 'KK', color: '#e8e0c8',
    text: 'Drei Ringe aus Knochenspießen brechen aus dem Boden, halten Gegner 3,5 s fest und geben dir ein Viertel des Schadens als Leben.',
    stats: '4× Angriff, 3,5 s festgehalten, 25 % Lebensraub'
  }
};
for (const u of Object.values(ULTIMATES)) Object.assign(u, { kind: 'ultimativ', unlock: ULT_UNLOCK, cooldown: ULT_COOLDOWN, mp: 0 });

function ultimateOf(p) {
  if (!p || !CLASSES[p.classId]) return null;
  return ULTIMATES[CLASSES[p.classId].paths[p.path || 0].id] || null;
}

// Faktor auf alle Treffer: Fertigkeitsschaden und +2,5 % je Stufe über 30
function ultPower(p) {
  return (game.stats.skillDmg || 1) * (1 + 0.025 * Math.max(0, p.level - ULT_UNLOCK));
}

function useUltimate() {
  const p = game.player;
  if (!p || p.dead || p.dash) return;
  const u = ultimateOf(p);
  if (!u) return;
  if (p.level < ULT_UNLOCK) {
    ui.log(`${u.name} wird ab Stufe ${ULT_UNLOCK} freigeschaltet.`, 'warn');
    return;
  }
  if (p.ultCd > 0) {
    addText(p.x, p.y - 34, `Noch ${formatBuffTime(Math.ceil(p.ultCd))}`, 'info');
    return;
  }
  if (inVillage(p.x, p.y) && !duelFighting()) {
    addText(p.x, p.y - 34, 'Im Dorf wird nicht gekämpft', 'info');
    return;
  }
  if (p.riding) toggleRide(false);
  if (ULT_RUN[u.id](p, u, ultPower(p)) === false) return;
  p.ultCd = ULT_COOLDOWN;
  p.lastCombat = game.time;
  startSwing(p, 'pose', 0.7);
  p.poseColor = u.color;
  vfxPowerUp(p, u.color);
  ui.banner(u.name, 'Ultimative Attacke');
  flashScreen(u.color, 0.28);
  hitStop(0.08);
  if (net.mode !== 'off') netUltimateFx(u.id, p.x, p.y);
  saveGame();
}

function ultBuff(p, b) {
  p.buffs = p.buffs.filter((x) => x.id !== b.id);
  p.buffs.push({ id: b.id, name: b.name, short: b.name.slice(0, 2).toUpperCase(), until: game.time + b.duration, duration: b.duration, effects: { ...b.effects }, lvl: 1 });
  game.stats = playerStats(p);
}

// Treffer auf alle Gegner im Kreis, jeder höchstens einmal je "seen"
function ultHitCircle(x, y, r, mul, opts, seen) {
  let total = 0;
  for (const m of enemiesInCircle(x, y, r)) {
    if (seen) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
    }
    total += hitMonster(m, mul, { heavy: true, ...opts });
  }
  return total;
}

function randomInCircle(x, y, r) {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random()) * r;
  return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75 };
}

function crackLines(n, r) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
    const pts = [[0, 0]];
    let d = 0;
    let ang = a;
    while (d < r) {
      d += rand(r * 0.12, r * 0.22);
      ang += rand(-0.35, 0.35);
      pts.push([Math.cos(ang) * d, Math.sin(ang) * d * 0.5]);
    }
    return pts;
  });
}

// Ablauf je Ultimativer Attacke (lokaler Spieler)
const ULT_RUN = {
  klingenhimmel(p, u, pw) {
    const cx = p.x;
    const cy = p.y;
    addEffect({ type: 'ultsigil', ground: true, x: cx, y: feetY(p), r: 190, dur: 2.2, color: u.color });
    for (let k = 0; k < 10; k++) {
      const at = randomInCircle(cx, cy, 170);
      const delay = 0.15 + k * 0.11;
      later(delay - 0.28, () => addEffect({ type: 'ultfall', kind: 'sword', x: at.x, y: at.y, fall: 0.28, dur: 2.1 - delay + 0.28, color: u.color, tier: 6 }));
      later(delay, () => {
        addEffect({ type: 'ring', x: at.x, y: at.y, r: 60, dur: 0.4, color: u.color, width: 6, grow: true });
        addEffect({ type: 'decal', kind: 'crack', x: at.x, y: at.y, r: 34, dur: 2.5, color: '#2a1a10' });
        particles(at.x, at.y - 6, { count: 16, color: [u.color, '#ffffff', '#c9b28a'], speed: [80, 220], life: [0.25, 0.5], size: [2, 3.5], shape: 'spark', drag: 4 });
        shakeScreen(3);
        ultHitCircle(at.x, at.y, 60, 1.6 * pw, { knockback: 40, vfxColor: u.color });
      });
    }
    later(1.6, () => {
      addEffect({ type: 'ring', x: cx, y: cy, r: 200, dur: 0.6, color: '#ffffff', width: 14, grow: true });
      addEffect({ type: 'ultbeam', x: cx, y: cy, w: 120, dur: 0.6, color: u.color });
      particles(cx, cy - 20, { count: 70, color: [u.color, '#ffffff', '#ffd34d'], speed: [120, 380], life: [0.4, 0.9], size: [2, 4.5], shape: 'spark', drag: 3 });
      shakeScreen(10);
      flashScreen('#ffffff', 0.3);
      ultHitCircle(cx, cy, 200, 3.5 * pw, { stun: 1.5, knockback: 90, vfxColor: '#ffffff' });
    });
  },

  titanenzorn(p, u, pw) {
    p.leap = { start: game.time, dur: 0.45, h: 54 };
    particles(p.x, feetY(p), { count: 18, color: ['#a88f62', '#c9b28a'], speed: [60, 160], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
    later(0.45, () => {
      if (p.dead) return;
      const fy = feetY(p);
      addEffect({ type: 'ultshock', ground: true, x: p.x, y: fy, lines: crackLines(14, 210), dur: 3, color: u.color });
      addEffect({ type: 'ring', x: p.x, y: fy, r: 220, dur: 0.6, color: u.color, width: 18, grow: true });
      addEffect({ type: 'ring', x: p.x, y: fy, r: 150, dur: 0.45, color: '#ffffff', width: 8, grow: true });
      particles(p.x, fy - 6, { count: 60, color: ['#a88f62', '#c9b28a', '#6a5038'], speed: [120, 340], life: [0.4, 0.9], size: [3, 7], drag: 3, glow: false, gravity: 300 });
      particles(p.x, fy - 10, { count: 30, color: [u.color, '#ffd34d'], speed: [100, 260], life: [0.3, 0.6], size: [2, 4], shape: 'ember', drag: 3 });
      shakeScreen(14);
      hitStop(0.1);
      ultHitCircle(p.x, p.y, 215, 5 * pw, { stun: 3, knockback: 150, vfxColor: u.color });
      ultBuff(p, u.buff);
    });
  },

  schattenklone(p, u, pw) {
    const t = pickTarget(320);
    if (!t) {
      addText(p.x, p.y - 34, 'Kein Ziel', 'info');
      return false;
    }
    faceTowards(t.x, t.y);
    const n = 6;
    const a0 = Math.random() * Math.PI * 2;
    addEffect({ type: 'ultsigil', ground: true, x: t.x, y: feetY(t), r: 120, dur: 1.9, color: u.color });
    addEffect({ type: 'ultmark', follow: t, ox: 0, oy: 0, dur: 1.4, color: u.color });
    particles(p.x, feetY(p) - 14, { count: 30, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [30, 100], life: [0.5, 0.9], size: [5, 10], jitter: 10, drag: 2, glow: false });
    // Sechs Doppelgänger erscheinen im Kreis um das Ziel ...
    const clones = [];
    for (let k = 0; k < n; k++) {
      const ang = a0 + (k / n) * Math.PI * 2;
      const at = { x: t.x + Math.cos(ang) * 95, y: t.y + Math.sin(ang) * 70 };
      const c = spawnShadowClone(p, at.x, at.y, t, 1.45);
      clones.push(c);
      later(0.04 * k, () => particles(at.x, at.y - 14, { count: 14, color: ['#3d3848', '#5a5466', u.color], speed: [20, 80], life: [0.4, 0.8], size: [4, 8], jitter: 6, drag: 2.5, glow: false }));
    }
    // ... und stoßen alle zugleich zu
    later(0.55, () => {
      for (const c of clones) cloneDash(c, t, 0.16);
      shakeScreen(3);
    });
    later(0.72, () => {
      if (p.dead) return;
      const seen = new Set([t.id]);
      clones.forEach((c, k) => {
        later(k * 0.03, () => {
          if (t.dead) return;
          c.combo = k % 3;
          startSwing(c, 'combo', 0.16);
          const bc = bodyCenter(t);
          addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: Math.atan2(t.y - c.y, t.x - c.x) + rand(-0.4, 0.4), len: 66, w: 9, dur: 0.3, color: k % 2 ? '#ffffff' : u.color });
          hitMonster(t, 3.2 * pw, { heavy: k === n - 1, vfxColor: u.color });
        });
      });
      // Gegner direkt daneben bekommen die Streifschläge ab
      for (const m of enemiesInCircle(t.x, t.y, 70)) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        hitMonster(m, 1.2 * pw, { vfxColor: u.color });
      }
      flashScreen(u.color, 0.25);
      hitStop(0.08);
      shakeScreen(5);
    });
    // Zum Schluss: hinter dem Ziel auftauchen, Kreuzschnitt
    later(1.1, () => {
      if (p.dead) return;
      for (const c of clones) cloneVanish(c);
      if (!t.dead) blinkBehind(t, u.color);
      const cx = t.dead ? p.x : t.x;
      const cy = t.dead ? p.y : t.y;
      const bc = t.dead ? bodyCenter(p) : bodyCenter(t);
      startSwing(p, 'skill', 0.34);
      addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 0.8, len: 110, w: 14, dur: 0.4, color: u.color });
      addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -0.8, len: 110, w: 14, dur: 0.4, color: '#ffffff' });
      addEffect({ type: 'ring', x: cx, y: cy, r: 110, dur: 0.5, color: u.color, width: 10, grow: true });
      particles(bc.x, bc.y, { count: 40, color: [u.color, '#3d3848', '#ffffff'], speed: [100, 300], life: [0.3, 0.6], size: [2, 4], shape: 'spark', drag: 4 });
      shakeScreen(9);
      hitStop(0.1);
      for (const m of enemiesInCircle(cx, cy, 110)) hitMonster(m, (m === t ? 6 : 2.5) * pw, { stun: 1.5, heavy: true, vfxColor: u.color });
    });
  },

  todesmal(p, u, pw) {
    const t = pickTarget(340);
    if (!t) {
      addText(p.x, p.y - 34, 'Kein Ziel', 'info');
      return false;
    }
    faceTowards(t.x, t.y);
    addEffect({ type: 'ultmark', follow: t, ox: 0, oy: 0, dur: 1.1, color: u.color });
    particles(p.x, feetY(p) - 14, { count: 26, color: ['#5a5466', '#3d3848', '#8a8496'], speed: [20, 70], life: [0.5, 0.9], size: [5, 9], jitter: 10, drag: 2, glow: false });
    later(0.9, () => {
      if (p.dead || t.dead) return;
      const dir = facingDir(p.facing);
      addEffect({ type: 'afterimage', sprite: characterSprite(p.classId, dir, 1, playerLook(p)), x: p.x, y: feetY(p), flip: dir === 'side' && p.facing.x < 0, dur: 0.5, tint: u.color });
      // hinter dem Ziel auftauchen
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.x = t.x;
      p.y = t.y;
      moveEntity(p, dx / d * (t.r + 16), dy / d * (t.r + 10), false);
      faceTowards(t.x, t.y);
      startSwing(p, 'combo', 0.3);
      const bc = bodyCenter(t);
      addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 0.3, len: 110, w: 16, dur: 0.45, color: u.color });
      addEffect({ type: 'ultbeam', x: t.x, y: feetY(t), w: 40, dur: 0.5, color: u.color });
      particles(bc.x, bc.y, { count: 40, color: [u.color, '#ffffff', '#5a0a1a'], speed: [100, 300], life: [0.3, 0.7], size: [2, 4], shape: 'spark', drag: 4 });
      hitStop(0.12);
      shakeScreen(9);
      hitMonster(t, 9 * pw, { critBonus: 1, heavy: true, vfxColor: u.color });
      if (!t.dead && t.hp < t.maxHp * 0.35) {
        later(0.2, () => {
          if (t.dead) return;
          addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -1.2, len: 120, w: 18, dur: 0.45, color: '#ffffff' });
          hitMonster(t, 4 * pw, { heavy: true, vfxColor: '#ffffff' });
        });
      }
      ultHitCircle(t.x, t.y, 110, 2 * pw, { vfxColor: u.color }, new Set([t.id]));
      ultBuff(p, u.buff);
    });
  },

  himmelssegen(p, u, pw) {
    const s = game.stats;
    const amount = Math.round(s.maxHp * 0.6);
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 44, '+' + amount, 'heal');
    addEffect({ type: 'ultbeam', follow: p, ox: 0, oy: 0, w: 70, dur: 1.2, color: u.color });
    addEffect({ type: 'ultsigil', ground: true, follow: p, ox: 0, oy: 0, r: 120, dur: 1.6, color: u.color });
    particles(p.x, feetY(p) - 20, { count: 40, color: [u.color, '#ffffff', '#9be59b'], angle: -Math.PI / 2, spread: 1.2, speed: [60, 200], life: [0.6, 1.2], size: [2, 4], drag: 1.5 });
    ultBuff(p, u.buff);
    const foes = aliveEnemies().filter((m) => dist(m, p) < 230).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 8);
    foes.forEach((m, k) => {
      later(0.25 + k * 0.1, () => {
        if (m.dead) return;
        addEffect({ type: 'ultbeam', x: m.x, y: feetY(m), w: 46, dur: 0.7, color: u.color });
        addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 50, dur: 0.4, color: '#ffffff', width: 6, grow: true });
        hitMonster(m, 3.5 * pw, { stun: 2, heavy: true, vfxColor: u.color });
        shakeScreen(3);
      });
    });
  },

  // seelenernte: seit 10.3 in seelenernte.js (3D-Strudel, Seelenketten, Geistersense)

  knochenkerker(p, u, pw) {
    const cx = p.x;
    const cy = p.y;
    const seen = new Set();
    let total = 0;
    [80, 150, 220].forEach((r, ring) => {
      later(ring * 0.22, () => {
        const n = 8 + ring * 6;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + ring * 0.3;
          addEffect({ type: 'ultspike', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.62, h: 26 + ring * 6 + rand(-4, 6), dur: 3.6 - ring * 0.2, color: u.color });
        }
        particles(cx, cy, { count: 20, color: ['#ddd5bb', '#a8a090'], speed: [r * 1.2, r * 2], life: [0.3, 0.5], size: [2, 4], shape: 'square', drag: 4, glow: false });
        shakeScreen(5);
        total += ultHitCircle(cx, cy, r + 20, 4 * pw, { stun: 3.5, vfxColor: '#ddd5bb' }, seen);
        if (ring === 2) {
          const heal = Math.round(total * 0.25);
          if (heal > 0 && !p.dead) {
            p.hp = Math.min(game.stats.maxHp, p.hp + heal);
            addText(p.x, p.y - 44, '+' + heal, 'heal');
          }
        }
      });
    });
    addEffect({ type: 'ultsigil', ground: true, x: cx, y: feetY(p), r: 230, dur: 3.4, color: '#c43a5a' });
  }
};

// --- Schattendoppelgänger -----------------------------------------------------------------------
// Durchscheinende, dunkel getönte Kopien einer Spielerfigur (Aussehen und Ausrüstung wie das Original).
// Reine Darstellung: den Schaden rechnet der Ablauf der Ultimativen Attacke.
function spawnShadowClone(owner, x, y, face, life) {
  const c = {
    clone: true, classId: owner.classId, path: owner.path, look: owner.look, equipment: owner.equipment,
    dualWield: owner.dualWield, level: owner.level, x, y, r: owner.r || 12, facing: { x: 0, y: 1 }, buffs: [],
    swing: 0, moving: false, born: game.time, until: game.time + life
  };
  if (face) {
    const d = Math.max(1, Math.hypot(face.x - x, face.y - y));
    c.facing = { x: (face.x - x) / d, y: (face.y - y) / d };
  }
  game.clones.push(c);
  return c;
}

// Doppelgänger stürmt zum Ziel und bleibt davor stehen
function cloneDash(c, t, dur) {
  const d = Math.max(1, Math.hypot(t.x - c.x, t.y - c.y));
  const stop = (t.r || 12) + 12;
  c.run = { x0: c.x, y0: c.y, x1: t.x - (t.x - c.x) / d * stop, y1: t.y - (t.y - c.y) / d * stop, t0: game.time, dur };
}

function cloneVanish(c) {
  c.until = Math.min(c.until, game.time + 0.12);
  particles(c.x, feetY(c) - 14, { count: 10, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [20, 70], life: [0.3, 0.6], size: [4, 8], jitter: 6, drag: 2.5, glow: false });
}

function updateClones(dt) {
  if (!game.clones.length) return;
  game.clones = game.clones.filter((c) => c.until > game.time);
  for (const c of game.clones) {
    c.swing = Math.max(0, c.swing - dt);
    c.moving = false;
    if (c.run) {
      const k = Math.min(1, (game.time - c.run.t0) / c.run.dur);
      c.x = c.run.x0 + (c.run.x1 - c.run.x0) * k;
      c.y = c.run.y0 + (c.run.y1 - c.run.y0) * k;
      c.moving = k < 1;
      if (k >= 1) c.run = null;
    }
  }
}

// Mitspieler sehen nur das Schauspiel, Schaden macht immer der eigene Spieler
// eigene Darstellung für Mitspieler (z. B. Strom der Elemente, elementarstrom.js)
const ULT_SHOW = {};
function ultRemoteFx(id, x, y) {
  if (typeof MAGE_ULT_FX !== 'undefined' && MAGE_ULT_FX[id]) return MAGE_ULT_FX[id](x, y);
  if (ULT_SHOW[id]) return ULT_SHOW[id](x, y);
  const u = Object.values(ULTIMATES).find((v) => v.id === id);
  if (!u) return;
  if (id === 'schattenklone') {
    // Doppelgänger des Mitspielers umkreisen den Platz vor ihm und stoßen zusammen zu
    let owner = null;
    for (const rp of net.players.values()) if (!owner || Math.hypot(rp.x - x, rp.y - y) < Math.hypot(owner.x - x, owner.y - y)) owner = rp;
    if (owner && Math.hypot(owner.x - x, owner.y - y) < 80) {
      const f = owner.facing || { x: 0, y: 1 };
      const mid = { x: x + f.x * 110, y: y + f.y * 80, r: 14 };
      const a0 = Math.random() * Math.PI * 2;
      for (let k = 0; k < 6; k++) {
        const ang = a0 + (k / 6) * Math.PI * 2;
        const c = spawnShadowClone(owner, mid.x + Math.cos(ang) * 95, mid.y + Math.sin(ang) * 70, mid, 1.2);
        later(0.55, () => cloneDash(c, mid, 0.16));
        later(0.72 + k * 0.03, () => startSwing(c, 'combo', 0.16));
        later(1.1, () => cloneVanish(c));
      }
    }
  }
  addEffect({ type: 'ultsigil', ground: true, x, y: y + 9, r: 190, dur: 2, color: u.color });
  addEffect({ type: 'ultbeam', x, y: y + 9, w: 80, dur: 1, color: u.color });
  addEffect({ type: 'ring', x, y, r: 200, dur: 0.7, color: u.color, width: 14, grow: true });
}

// --- Symbole ------------------------------------------------------------------------------------
SKILL_ICON_BG.ultimativ = ['#ffd34d', '#5a2a06'];
Object.assign(SKILL_ICONS, {
  klingenhimmel(ctx) {
    for (const [x, y, s] of [[-11, -2, 0.8], [11, -2, 0.8], [0, 3, 1]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-3, -18); ctx.lineTo(3, -18); ctx.lineTo(3, 8); ctx.lineTo(0, 14); ctx.lineTo(-3, 8); ctx.closePath(); }, '#ffffff', '#b8c8e8', 2);
      iconLine(ctx, '#ffd34d', 3, [[-7, -14], [7, -14]]);
      ctx.restore();
    }
    iconLine(ctx, '#fff3c0', 1.5, [[-18, 17], [18, 17]]);
  },
  titanenzorn(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(8, -16); ctx.lineTo(10, -2); ctx.lineTo(-10, -2); ctx.closePath(); }, '#ffd38a', '#a85a20', 2.5);
    iconLine(ctx, '#ffd38a', 3, [[0, -2], [0, 6]]);
    for (const a of [-2.6, -1.9, -1.2, -0.5]) iconLine(ctx, '#ff9a4a', 2.2, [[0, 12], [Math.cos(a + Math.PI) * -16, 12 + Math.sin(a + Math.PI) * -6]]);
    iconLine(ctx, '#3a1a08', 2, [[-14, 14], [-6, 10], [0, 15], [7, 10], [15, 14]]);
  },
  schattenklone(ctx) {
    // sechs Schatten im Kreis um ein rotes Ziel
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * 14;
      const y = Math.sin(a) * 13;
      ctx.globalAlpha = 0.55 + (k % 2) * 0.35;
      iconShape(ctx, () => { ctx.beginPath(); ctx.arc(x, y - 3, 3.6, 0, Math.PI * 2); ctx.moveTo(x - 3.5, y + 1); ctx.lineTo(x + 3.5, y + 1); ctx.lineTo(x + 2, y + 8); ctx.lineTo(x - 2, y + 8); ctx.closePath(); }, '#c9b8ff', '#3d3848', 1.6);
    }
    ctx.globalAlpha = 1;
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 1, 4.5, 0, Math.PI * 2); }, '#ff8a9a', '#a0182a', 1.8);
    iconLine(ctx, '#ffffff', 1.6, [[-7, -6], [7, 8]]);
    iconLine(ctx, '#ffffff', 1.6, [[7, -6], [-7, 8]]);
  },
  todesmal(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); }, '#ff8a9a', '#7a0a1a', 2.5);
    iconLine(ctx, '#1a0508', 2.5, [[-8, -8], [8, 8]]);
    iconLine(ctx, '#1a0508', 2.5, [[8, -8], [-8, 8]]);
    iconLine(ctx, '#ffffff', 2, [[-17, 17], [17, -17]]);
  },
  himmelssegen(ctx) {
    iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(6, -20); ctx.lineTo(12, 16); ctx.lineTo(-12, 16); ctx.closePath(); }, '#ffffff', '#ffd34d', 2);
    iconLine(ctx, '#6abd5a', 3.5, [[0, -6], [0, 10]]);
    iconLine(ctx, '#6abd5a', 3.5, [[-8, 2], [8, 2]]);
  },
  seelenernte(ctx) {
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = '#120c08';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + k * 5.5, k * 2.1, k * 2.1 + Math.PI * 1.3);
      ctx.stroke();
      ctx.strokeStyle = k === 1 ? '#ffffff' : '#7fe3a0';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    iconShape(ctx, () => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); }, '#ffffff', '#7fe3a0', 1.5);
  },
  knochenkerker(ctx) {
    for (const [x, h] of [[-13, 18], [-5, 26], [4, 22], [12, 16]]) {
      iconShape(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 3.5, 16); ctx.lineTo(x, 16 - h); ctx.lineTo(x + 3.5, 16); ctx.closePath(); }, '#ffffff', '#b8b09a', 2);
    }
    iconLine(ctx, '#c43a5a', 2, [[-18, 17], [18, 17]]);
  }
});

// --- Effekte ------------------------------------------------------------------------------------

const ULT_EFFECTS = {
  // Leuchtender Runenkreis am Boden
  ultsigil(ctx, e, k, x, y) {
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
    const rot = (game.time - e.start) * 0.8;
    const r = e.r * (0.85 + 0.15 * easeOut(Math.min(1, k * 4)));
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(${hexRgb(e.color)},0.28)`);
    g.addColorStop(1, `rgba(${hexRgb(e.color)},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    for (const [f, dir] of [[1, 1], [0.78, -1], [0.5, 1]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * f, r * f * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      const n = Math.round(10 * f) + 4;
      for (let i = 0; i < n; i++) {
        const an = rot * dir + (i / n) * Math.PI * 2;
        const px = x + Math.cos(an) * r * f * 0.9;
        const py = y + Math.sin(an) * r * f * 0.45;
        ctx.beginPath();
        ctx.moveTo(px - 3, py + 1.5);
        ctx.lineTo(px, py - 3);
        ctx.lineTo(px + 3, py + 1.5);
        ctx.stroke();
      }
    }
    // Sternzacken zwischen den Ringen
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const an = -rot * 0.6 + (i * 2 / 6) * Math.PI * 2;
      const px = x + Math.cos(an) * r * 0.78;
      const py = y + Math.sin(an) * r * 0.39;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  },

  // Was vom Himmel fällt: Geisterschwerter (bleiben stecken) oder Meteore
  ultfall(ctx, e, k, x, y) {
    const tt = game.time - e.start;
    const f = Math.min(1, tt / e.fall);
    ctx.globalAlpha = 1;
    if (e.kind === 'meteor') {
      const sx = x - 140 * (1 - f);
      const sy = y - 320 * (1 - f);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(sx - 70, sy - 160, sx, sy);
      g.addColorStop(0, 'rgba(255,90,40,0)');
      g.addColorStop(1, 'rgba(255,200,90,0.9)');
      ctx.strokeStyle = g;
      ctx.lineCap = 'round';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(sx - 60, sy - 140);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      glow(ctx, sx, sy, 34, '#ff7a2a', 0.9);
      glow(ctx, sx, sy, 16, '#fff3c0', 1);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#5a2008';
      circle(ctx, sx, sy, 7);
      ctx.fillStyle = '#ffb04a';
      circle(ctx, sx - 2, sy - 2, 4);
      // Schatten am Boden wächst mit
      softShadow(ctx, x, y, 10 + 20 * f, (10 + 20 * f) * 0.45, 0.3 * f);
      return;
    }
    const sp = weaponSprite('greatsword', e.tier || 6);
    const b = sp.bounds;
    const len = b.x + b.w;
    const fade = tt > e.dur - 0.4 ? Math.max(0, (e.dur - tt) / 0.4) : 1;
    const h = (1 - f) * (1 - f) * 300;
    const scale = 1.7;
    ctx.globalAlpha = fade;
    if (f < 1) softShadow(ctx, x, y, 8 + 14 * f, (8 + 14 * f) * 0.45, 0.35 * f);
    ctx.save();
    // Spitze zeigt nach unten und steckt nach dem Fall ein Stück im Boden
    ctx.translate(x, y - h - len * scale + 10);
    ctx.rotate(Math.PI / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = fade * 0.9;
    ctx.drawImage(sp.img, b.x, b.y, b.w, b.h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (0.55 + 0.25 * Math.sin(game.time * 10 + x));
    ctx.drawImage(tintOf(sp, e.color), b.x, b.y, b.w, b.h);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    if (f < 1) {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.5 * fade;
      ctx.beginPath();
      ctx.moveTo(x, y - h - len * scale - 80);
      ctx.lineTo(x, y - h - len * scale + 10);
      ctx.stroke();
    }
    glow(ctx, x, y - 8, 20, e.color, 0.5 * fade);
  },

  // Lichtsäule vom Himmel
  ultbeam(ctx, e, k, x, y) {
    ctx.globalCompositeOperation = 'lighter';
    const a = Math.min(1, k * 8) * (1 - k);
    const w = e.w * (1 - k * 0.5);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, `rgba(${hexRgb(e.color)},0)`);
    g.addColorStop(0.5, `rgba(${hexRgb(e.color)},0.85)`);
    g.addColorStop(1, `rgba(${hexRgb(e.color)},0)`);
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, y - 420, w, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x - w * 0.08, y - 420, w * 0.16, 420);
    glow(ctx, x, y, w * 0.9, e.color, a);
  },

  // Todesmal über dem Ziel
  ultmark(ctx, e, k, x, y) {
    const t = e.follow;
    const h = t ? figureHeight(t) : 40;
    const cy = y - h - 22;
    const s = 1 + 0.15 * Math.sin(game.time * 14);
    ctx.globalAlpha = Math.min(1, k * 5);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, cy, 26 * s, e.color, 0.8);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a0508';
    ctx.lineWidth = 6;
    for (const sg of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(x - 9 * s, cy - 9 * s * sg);
      ctx.lineTo(x + 9 * s, cy + 9 * s * sg);
      ctx.stroke();
    }
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    for (const sg of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(x - 9 * s, cy - 9 * s * sg);
      ctx.lineTo(x + 9 * s, cy + 9 * s * sg);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  // Risse im Boden, glühend
  ultshock(ctx, e, k, x, y) {
    const grow = Math.min(1, k * 8);
    ctx.globalAlpha = Math.pow(1 - k, 0.7);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [col, wdt] of [['#1a0e06', 6], [e.color, 2.5]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = wdt * (1 - k * 0.5);
      for (const pts of e.lines) {
        const n = Math.max(2, Math.ceil(pts.length * grow));
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (i) ctx.lineTo(x + pts[i][0], y + pts[i][1]);
          else ctx.moveTo(x + pts[i][0], y + pts[i][1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 60, e.color, 0.5 * (1 - k));
  },

  // Seelenstrudel
  ultvortex(ctx, e, k, x, y) {
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 5);
    const rot = (game.time - e.start) * 4;
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, e.r);
    g.addColorStop(0, `rgba(${hexRgb(e.color)},0.45)`);
    g.addColorStop(1, `rgba(${hexRgb(e.color)},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, e.r, e.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 5; arm++) {
      ctx.strokeStyle = arm % 2 ? '#ffffff' : e.color;
      ctx.lineWidth = arm % 2 ? 1.5 : 3;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const an = rot + arm * (Math.PI * 2 / 5) + u * 4;
        const r = e.r * (1 - u) * (1 - k * 0.3);
        const px = x + Math.cos(an) * r;
        const py = y + Math.sin(an) * r * 0.5 - u * 20;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    glow(ctx, x, y - 20, 40, e.color, a);
  },

  // Knochenspieß aus dem Boden
  ultspike(ctx, e, k, x, y) {
    const tt = game.time - e.start;
    const up = Math.min(1, tt / 0.12);
    const down = tt > e.dur - 0.4 ? Math.max(0, (e.dur - tt) / 0.4) : 1;
    const h = e.h * easeOut(up) * down;
    ctx.globalAlpha = 1;
    softShadow(ctx, x, y, 8, 3.5, 0.35);
    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x - 1, y - h);
    ctx.lineTo(x + 1.5, y - h * 0.96);
    ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fillStyle = '#e8e0c8';
    ctx.fill();
    ctx.strokeStyle = '#3a3024';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,100,80,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + 0.5, y - h * 0.95);
    ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fill();
  }
};
Object.assign(EXTRA_EFFECTS, ULT_EFFECTS);
