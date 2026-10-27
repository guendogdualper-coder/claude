// Kampf: Schaden berechnen, normale Angriffe, Fertigkeiten, Geschosse, Effekte.

const dmgScale = (lvl) => 1 + 0.08 * (lvl - 1);   // +8 % Schaden pro Fertigkeitsstufe
const buffScale = (lvl) => 1 + 0.03 * (lvl - 1);  // +3 % Buff-Wirkung pro Fertigkeitsstufe

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function aliveEnemies() {
  return game.monsters.filter((m) => !m.dead);
}

// Grundformel: Angriff × Faktor, ±10 % Zufall, Verteidigung zieht prozentual ab
function calcDamage(atk, mul, def, critChance) {
  let raw = atk * mul * (0.9 + Math.random() * 0.2);
  const crit = Math.random() < critChance;
  if (crit) raw *= 1.8;
  const amount = Math.max(1, Math.round(raw * (1 - def / (def + 40))));
  return { amount, crit };
}

// Höherstufige Monster nehmen weniger Schaden (max. −50 %)
function levelPenalty(attackerLevel, targetLevel) {
  const diff = targetLevel - attackerLevel;
  return diff > 0 ? Math.max(0.5, 1 - 0.05 * diff) : 1;
}

// --- Ziele ----------------------------------------------------------------

function nearestEnemy(from, range) {
  let best = null;
  let bestD = Infinity;
  for (const m of game.monsters) {
    if (m.dead) continue;
    const d = dist(from, m) - m.r;
    if (d <= range && d < bestD) { best = m; bestD = d; }
  }
  return best;
}

// Ausgewähltes Ziel, falls in Reichweite, sonst das nächste Monster
function pickTarget(range) {
  const p = game.player;
  const t = game.target;
  if (t && !t.dead && dist(p, t) - t.r <= range) return t;
  const n = nearestEnemy(p, range);
  if (n) game.target = n;
  return n;
}

function faceTowards(x, y) {
  const p = game.player;
  const dx = x - p.x;
  const dy = y - p.y;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) p.facing = { x: dx / len, y: dy / len };
}

// Blickrichtung für Flächenangriffe: zum nächsten Gegner, sonst Laufrichtung
function aim(range) {
  const t = pickTarget(range);
  if (t) faceTowards(t.x, t.y);
  return game.player.facing;
}

// --- Schaden an Monstern ----------------------------------------------------

// Spieler (oder Skelett mit opts.ally) trifft ein Monster
function hitMonster(m, mul, opts = {}) {
  if (m.dead) return 0;
  const p = game.player;
  const s = game.stats;
  let factor = mul * levelPenalty(p.level, m.level);
  let crit = opts.dot ? 0 : s.crit + (opts.critBonus || 0);
  if (!opts.ally && !opts.dot) {
    if (p.nextHitMul > 1) {
      factor *= p.nextHitMul;
      p.nextHitMul = 1;
      crit = 1;
    }
    if (s.invisible) p.buffs = p.buffs.filter((b) => !b.effects.invisible);
    p.lastCombat = game.time;
  }
  if (m.vulnerable && m.vulnerable.until > game.time) factor *= m.vulnerable.mul;
  const atk = opts.atk != null ? opts.atk : s.atk;
  const { amount, crit: isCrit } = calcDamage(atk, factor, opts.dot ? 0 : m.def, opts.ally ? 0.05 : crit);
  if (!m.isStone) {
    if (opts.stun) m.stun = Math.max(m.stun, opts.stun);
    if (opts.knockback) {
      const src = opts.from || p;
      const d = Math.max(1, dist(src, m));
      m.kx = (m.x - src.x) / d * opts.knockback * 4;
      m.ky = (m.y - src.y) / d * opts.knockback * 4;
    }
    if (opts.poison) m.poison = { dps: s.atk * opts.poison.dps, until: game.time + opts.poison.duration, tick: 0 };
    if (opts.burn) m.burn = { dps: s.atk * opts.burn.dps, until: game.time + opts.burn.duration, tick: 0 };
  }
  damageMonster(m, amount, isCrit, opts.source || p, opts.dot);
  if (!opts.dot) {
    vfxImpact(m, isCrit, opts.ally ? '#cfd8b0' : opts.vfxColor);
    if (isCrit && !opts.ally) {
      hitStop(0.06);
      shakeScreen(5);
    } else if (opts.heavy) {
      shakeScreen(2);
    }
  }
  return amount;
}

function damageMonster(m, amount, crit, source, isDot) {
  m.hp -= amount;
  m.hitFlash = 0.12;
  // Mehrere Zahlen kurz hintereinander stapeln sich nach oben statt sich zu überdecken
  m.textStack = game.time - (m.lastText || -9) < 0.3 ? ((m.textStack || 0) + 1) % 4 : 0;
  m.lastText = game.time;
  addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 20, String(amount), crit ? 'crit' : isDot ? 'dot' : 'dmg');
  if (m.isStone) {
    checkStoneWaves(m);
  } else {
    aggro(m, source);
  }
  if (m.hp <= 0) killMonster(m);
}

function killMonster(m) {
  const p = game.player;
  m.dead = true;
  m.hp = 0;
  m.poison = null;
  m.burn = null;
  if (game.target === m) game.target = null;
  const bc = bodyCenter(m);
  if (m.isStone) {
    particles(bc.x, bc.y, { count: 40, color: ['#c58cff', '#8a5ad0', '#ffffff'], speed: [80, 260], life: [0.4, 0.9], size: [2, 4], shape: 'square', drag: 2.5 });
    addEffect({ type: 'ring', x: m.x, y: m.y, r: 70, dur: 0.6, color: '#c58cff', width: 10, grow: true });
    shakeScreen(7);
    hitStop(0.08);
  } else {
    vfxCorpse(m);
    particles(bc.x, bc.y, { count: 12, color: ['#e8e0cc', '#a8997c'], speed: [40, 120], life: [0.3, 0.6], size: [2, 3.5], drag: 3, glow: false });
  }

  const xp = Math.max(1, Math.round(m.xp * xpFactor(p.level, m.level)));
  const gold = randInt(m.gold[0], m.gold[1]);
  p.gold += gold;
  p.kills++;
  // Belohnung erscheint über der eigenen Figur, nicht zwischen den Schadenszahlen
  addText(p.x, feetY(p) - 72, '+' + xp + ' EP  +' + gold + ' Gold', 'xp');

  if (m.isStone) {
    const splinters = randInt(2, 4);
    p.splinters += splinters;
    p.stones++;
    p.potions.hp += randInt(1, 3);
    p.potions.mp += randInt(1, 2);
    ui.log('Seelenstein zerstört! +' + xp + ' EP, +' + gold + ' Gold, +' + splinters + ' Seelensplitter und Tränke.', 'loot');
    m.respawnAt = game.time + randInt(STONE.respawn[0], STONE.respawn[1]);
  } else {
    if (Math.random() < 0.06) { p.potions.hp++; ui.log(m.name + ' hat einen Roten Trank fallen lassen.', 'loot'); }
    if (Math.random() < 0.04) { p.potions.mp++; ui.log(m.name + ' hat einen Blauen Trank fallen lassen.', 'loot'); }
    m.respawnAt = game.time + 12 + Math.random() * 8;
  }
  rollLoot(m);
  gainXp(xp);
}

// --- Schaden am Spieler ----------------------------------------------------------

function damagePlayer(amount, attacker) {
  const p = game.player;
  const s = game.stats;
  if (p.dead) return;
  p.lastCombat = game.time;
  if (Math.random() < s.dodge) {
    addText(p.x, p.y - 30, 'Ausgewichen', 'info');
    return;
  }
  // Ein Schild kann Treffer ganz abblocken
  if (s.block > 0 && Math.random() < s.block) {
    addText(p.x, p.y - 30, 'Geblockt', 'info');
    particles(p.x - 8, feetY(p) - 18, { count: 8, color: ['#e6eef8', '#ffd34d'], speed: [60, 140], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 6 });
    return;
  }
  let dmg = Math.max(1, Math.round(amount * s.damageTaken));
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, dmg);
    p.shield -= absorbed;
    dmg -= absorbed;
    if (dmg <= 0) {
      addText(p.x, p.y - 30, 'Abgewehrt', 'info');
    }
  }
  if (dmg > 0) {
    p.hp -= dmg;
    addText(p.x + (Math.random() - 0.5) * 16, p.y - 34, '-' + dmg, 'hurt');
    game.hurtFlash = 0.35;
    shakeScreen(2.5);
  }
  if (s.reflect > 0 && attacker && !attacker.dead) {
    damageMonster(attacker, Math.max(1, Math.round(amount * s.reflect)), false, p, false);
  }
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = game.player;
  p.hp = 0;
  p.dead = true;
  p.dash = null;
  p.buffs = [];
  p.shield = 0;
  p.deaths++;
  game.target = null;
  game.allies = [];
  const lost = Math.min(p.xp, Math.round(xpToNext(p.level) * 0.03));
  p.xp -= lost;
  for (const m of game.monsters) {
    if (m.target === p) { m.state = 'return'; m.target = null; }
  }
  saveGame();
  ui.showDeath(lost);
}

function revivePlayer() {
  const p = game.player;
  const spawn = villageSpawn();
  const s = playerStats(p);
  p.x = spawn.x;
  p.y = spawn.y;
  p.hp = s.maxHp;
  p.mp = s.maxMp;
  p.dead = false;
  p.skillCd = [0, 0, 0, 0, 0];
  saveGame();
}

// --- Normaler Angriff --------------------------------------------------------
// Nahkämpfer schlagen eine Kombo aus drei Schlägen: Hieb, Rückhand, Stich.

function startSwing(p, kind, duration) {
  p.swingKind = kind;
  p.swingDur = duration;
  p.swing = duration;
}

function tryBasicAttack() {
  const p = game.player;
  const c = CLASSES[p.classId];
  if (p.attackCd > 0 || p.dead || p.dash) return false;
  if (inVillage(p.x, p.y)) return false; // im Dorf wird nicht gekämpft
  const target = pickTarget(c.basic.range);
  if (!target) return false;
  faceTowards(target.x, target.y);
  p.attackCd = c.basic.cooldown / game.stats.atkSpeed;
  if (c.basic.ranged) {
    startSwing(p, 'cast', 0.28);
    const hand = bodyCenter(p);
    particles(hand.x + p.facing.x * 14, hand.y + p.facing.y * 8, { count: 6, color: c.basic.color, speed: [30, 80], life: [0.15, 0.3], size: [1.5, 2.5] });
    spawnProjectile({ owner: 'player', x: p.x, y: p.y, target, speed: 480, range: c.basic.range + 60, mul: 1, color: c.basic.color, radius: 5, style: c.basic.style });
  } else {
    p.combo = ((p.combo || 0) + 1) % 3;
    startSwing(p, 'combo', p.combo === 2 ? 0.24 : 0.28);
    vfxSwing(p, c.trim);
    hitMonster(target, p.combo === 2 ? 1.25 : 1, { vfxColor: c.trim });
  }
  return true;
}

// --- Fertigkeiten -----------------------------------------------------------------

function useSkill(i) {
  const p = game.player;
  if (!p || p.dead || p.dash) return;
  const sk = CLASSES[p.classId].skills[i];
  if (!sk) return;
  if (p.level < sk.unlock) {
    ui.log(sk.name + ' wird ab Stufe ' + sk.unlock + ' freigeschaltet.', 'warn');
    return;
  }
  if (p.skillCd[i] > 0) return;
  if ((sk.kind === 'angriff' || sk.kind === 'fluch') && inVillage(p.x, p.y)) {
    addText(p.x, p.y - 34, 'Im Dorf wird nicht gekämpft', 'info');
    return;
  }
  if (p.mp < sk.mp) {
    addText(p.x, p.y - 34, 'Zu wenig Mana', 'info');
    return;
  }
  const lvl = p.skillLevels[i];
  const ok = SKILL_TYPES[sk.type](sk, dmgScale(lvl), lvl);
  if (ok === false) return;
  p.mp -= sk.mp;
  p.skillCd[i] = sk.cooldown;
  startSwing(p, 'skill', 0.34);
  if (sk.kind === 'angriff' || sk.kind === 'fluch') p.lastCombat = game.time;
}

function enemiesInCone(x, y, dir, radius, angleDeg) {
  const half = (angleDeg / 2) * Math.PI / 180;
  const ang = Math.atan2(dir.y, dir.x);
  return aliveEnemies().filter((m) => {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d > radius + m.r) return false;
    if (d < m.r + 6) return true;
    let diff = Math.atan2(m.y - y, m.x - x) - ang;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return Math.abs(diff) <= half;
  });
}

function enemiesInCircle(x, y, radius) {
  return aliveEnemies().filter((m) => Math.hypot(m.x - x, m.y - y) <= radius + m.r);
}

function later(delay, fn) {
  game.timers.push({ at: game.time + delay, fn });
}

function applyBuff(sk, lvl) {
  const p = game.player;
  const scale = buffScale(lvl);
  const effects = {};
  for (const [k, v] of Object.entries(sk.effects || {})) effects[k] = typeof v === 'number' ? v * scale : v;
  p.buffs = p.buffs.filter((b) => b.id !== sk.id);
  p.buffs.push({ id: sk.id, name: sk.name, short: sk.short, until: game.time + sk.duration, duration: sk.duration, effects });
}

const SKILL_TYPES = {
  // Fächer vor der Figur, optional mehrere Treffer hintereinander
  cone(sk, pw) {
    const p = game.player;
    const c = CLASSES[p.classId];
    const dir = aim(sk.radius + 30);
    const hits = sk.hits || 1;
    const ang = Math.atan2(dir.y, dir.x);
    const spread = sk.angle * Math.PI / 180;
    for (let h = 0; h < hits; h++) {
      later(h * (hits > 3 ? 0.17 : 0.13), () => {
        if (p.dead) return;
        if (sk.burn) {
          // Drachenfeuer
          const b = bodyCenter(p);
          particles(b.x + dir.x * 10, b.y + dir.y * 6, {
            count: 46, color: ['#ffd34d', '#ff9a4a', '#ff5a2a', '#c8402f'], angle: ang, spread: spread / 2,
            speed: [sk.radius * 1.4, sk.radius * 3], life: [0.25, 0.5], size: [2.5, 5], shape: 'ember', drag: 3
          });
          shakeScreen(2.5);
        } else if (hits > 3) {
          vfxSweep(p, sk.radius * 0.7, ang - spread / 2 + Math.random() * 0.4, ang + spread / 2, c.trim, 0.2, 14);
        } else {
          const from = h % 2 ? ang + spread / 2 : ang - spread / 2;
          const to = h % 2 ? ang - spread / 2 : ang + spread / 2;
          vfxSweep(p, sk.radius * 0.85, from, to, h === hits - 1 ? '#ffd9a0' : c.trim, 0.26, 26);
          p.combo = h % 3;
          startSwing(p, 'combo', 0.13);
        }
        for (const m of enemiesInCone(p.x, p.y, dir, sk.radius, sk.angle)) {
          if (hits > 3) {
            const bc = bodyCenter(m);
            addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: Math.random() * Math.PI, len: 34, w: 5, dur: 0.18, color: '#c9b8ff' });
          }
          hitMonster(m, sk.dmg * pw, { knockback: h === hits - 1 ? sk.knockback : 0, burn: sk.burn, stun: sk.stun, heavy: h === hits - 1 });
        }
      });
    }
  },

  // Wirbel um die Figur
  circle(sk, pw) {
    const p = game.player;
    const c = CLASSES[p.classId];
    const a = Math.random() * Math.PI * 2;
    vfxSweep(p, sk.radius * 0.85, a, a + Math.PI * 4, c.trim, 0.45, 30);
    addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.4, color: '#d8c8a8', width: 6 });
    particles(p.x, feetY(p), { count: 26, color: ['#a88f62', '#c9b28a'], speed: [80, 200], life: [0.3, 0.6], size: [2, 4], drag: 4, glow: false });
    p.spin = 0.45;
    shakeScreen(3.5);
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      hitMonster(m, sk.dmg * pw, { stun: sk.stun, heavy: true });
    }
  },

  // Vorwärtssturm, trifft alles auf dem Weg
  dash(sk, pw) {
    const p = game.player;
    const dir = aim(sk.distance);
    p.dash = { dx: dir.x, dy: dir.y, left: sk.distance, speed: sk.distance / 0.22, hit: new Set(), sk, pw };
    shakeScreen(2);
  },

  // Einzelner starker Treffer im Nahkampf
  strike(sk, pw) {
    const t = pickTarget(sk.range);
    if (!t) {
      ui.log('Kein Gegner in Reichweite für ' + sk.name + '.', 'warn');
      return false;
    }
    faceTowards(t.x, t.y);
    const bc = bodyCenter(t);
    addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 0.75, len: 58, w: 9, dur: 0.3, color: '#b48cff' });
    later(0.07, () => addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -0.75, len: 58, w: 9, dur: 0.3, color: '#b48cff' }));
    particles(bc.x, bc.y, { count: 14, color: ['#b48cff', '#e0d0ff'], speed: [60, 160], life: [0.3, 0.5], size: [2, 3], shape: 'square' });
    hitStop(0.05);
    hitMonster(t, sk.dmg * pw, { critBonus: sk.critBonus, heavy: true, vfxColor: '#d6c4ff' });
  },

  projectile(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (t) faceTowards(t.x, t.y);
    const b = bodyCenter(p);
    particles(b.x + p.facing.x * 14, b.y, { count: 10, color: sk.color, speed: [40, 110], life: [0.2, 0.4], size: [1.5, 3] });
    spawnProjectile({
      owner: 'player', x: p.x, y: p.y, target: sk.pierce ? null : t, dir: t ? null : p.facing,
      aimAt: sk.pierce && t ? { x: t.x, y: t.y } : null,
      speed: sk.speed, range: sk.range + 40, mul: sk.dmg * pw, color: sk.color, radius: sk.pierce ? 8 : 7,
      pierce: sk.pierce, chain: sk.chain || 0, poison: sk.poison, style: sk.style
    });
  },

  // Blitz schlägt beim Ziel ein
  blast(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    const x = t ? t.x : p.x + p.facing.x * 120;
    const y = t ? t.y : p.y + p.facing.y * 120;
    if (t) faceTowards(t.x, t.y);
    addEffect({ type: 'bolt', x, y, dur: 0.45, color: '#cfe8ff' });
    later(0.12, () => {
      addEffect({ type: 'ring', x, y, r: sk.radius, dur: 0.4, color: '#9fd0ff', width: 8 });
      particles(x, y - 10, { count: 30, color: ['#cfe8ff', '#9fd0ff', '#ffffff'], speed: [120, 300], life: [0.15, 0.4], size: [1.5, 2.5], shape: 'spark', drag: 5 });
      shakeScreen(6);
      hitStop(0.05);
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { stun: sk.stun, heavy: true, vfxColor: '#cfe8ff' });
    });
  },

  buff(sk, pw, lvl) {
    const p = game.player;
    const c = CLASSES[p.classId];
    applyBuff(sk, lvl);
    if (sk.nextHitMul) p.nextHitMul = sk.nextHitMul;
    if (sk.shield) {
      p.shield = Math.round(game.stats.maxHp * sk.shield * buffScale(lvl));
      p.shieldUntil = game.time + sk.duration;
      particles(p.x, feetY(p) - 20, { count: 16, color: '#ddd5bb', speed: [60, 140], life: [0.4, 0.7], size: [2, 4], shape: 'square', glow: false });
    }
    if (sk.effects && sk.effects.invisible) {
      for (const m of game.monsters) {
        if (m.target === p) { m.state = 'return'; m.target = null; }
      }
      particles(p.x, feetY(p) - 14, { count: 30, color: ['#5a5466', '#3d3848', '#8a8496'], speed: [20, 70], life: [0.5, 0.9], size: [5, 9], jitter: 10, drag: 2, glow: false });
    } else {
      vfxPillar(p, c.trim);
    }
    ui.log(sk.name + ' ist aktiv (' + sk.duration + ' s).', 'info');
  },

  heal(sk, pw, lvl) {
    const p = game.player;
    const s = game.stats;
    const amount = Math.round(s.maxHp * sk.amount * buffScale(lvl));
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 40, '+' + amount, 'heal');
    vfxPillar(p, '#9be59b', 1);
    addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 50, dur: 0.6, color: '#9be59b', width: 5, grow: true });
    if (sk.effects) applyBuff(sk, lvl);
  },

  // Lebensentzug: sofortiger Treffer, heilt die Figur
  drain(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (!t) {
      ui.log('Kein Gegner in Reichweite für ' + sk.name + '.', 'warn');
      return false;
    }
    faceTowards(t.x, t.y);
    const dmg = hitMonster(t, sk.dmg * pw, { vfxColor: '#ff6a7a' });
    const heal = Math.round(dmg * sk.heal);
    p.hp = Math.min(game.stats.maxHp, p.hp + heal);
    addText(p.x, p.y - 40, '+' + heal, 'heal');
    const bc = bodyCenter(t);
    addEffect({ type: 'beam', x: bc.x, y: bc.y, follow2: p, dur: 0.45, color: '#c43a5a' });
    const pc = bodyCenter(p);
    const ang = Math.atan2(pc.y - bc.y, pc.x - bc.x);
    particles(bc.x, bc.y, { count: 16, color: ['#ff6a7a', '#c43a5a'], angle: ang, spread: 0.3, speed: [dist(t, p) * 1.6, dist(t, p) * 2.6], life: [0.3, 0.45], size: [2, 3.5], drag: 0.5 });
  },

  summon(sk, pw, lvl) {
    const p = game.player;
    const s = game.stats;
    game.allies = [];
    for (let k = 0; k < sk.count; k++) {
      const ang = Math.PI * 2 * k / sk.count;
      const x = p.x + Math.cos(ang) * 34;
      const y = p.y + Math.sin(ang) * 20;
      const maxHp = Math.round(s.maxHp * sk.hp * buffScale(lvl));
      game.allies.push({
        id: 'ally' + k, x, y, r: 10,
        hp: maxHp, maxHp, atk: Math.round(s.atk * sk.atk * pw), def: Math.round(s.def * 0.5),
        until: game.time + sk.duration, target: null, cd: 0, facing: 1, swing: 0
      });
      addEffect({ type: 'runes', x, y: y + 8, r: 22, dur: 0.9, color: '#a7e37f' });
      particles(x, y + 6, { count: 14, color: ['#ddd5bb', '#a7e37f'], angle: -Math.PI / 2, spread: 0.6, speed: [60, 140], life: [0.4, 0.7], size: [2, 3.5], shape: 'square', gravity: 200 });
    }
    ui.log('Zwei Skelette erheben sich aus dem Boden.', 'info');
  },

  curse(sk, pw, lvl) {
    const p = game.player;
    const scale = buffScale(lvl);
    addEffect({ type: 'runes', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.8, color: '#a774e0' });
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      m.vulnerable = { mul: 1 + sk.vulnerable * scale, until: game.time + sk.duration };
      const bc = bodyCenter(m);
      particles(bc.x, bc.y - 20, { count: 8, color: ['#a774e0', '#5a2a8a'], angle: Math.PI / 2, spread: 0.3, speed: [40, 90], life: [0.4, 0.6], size: [2, 3] });
      if (!m.isStone) {
        m.slow = { mul: 1 - sk.slow, until: game.time + sk.duration };
        aggro(m, p);
      }
    }
  }
};

// Ablauf des Sturmangriffs, wird jeden Frame aus spiel.js aufgerufen
function updateDash(dt) {
  const p = game.player;
  const d = p.dash;
  const step = Math.min(d.left, d.speed * dt);
  const moved = moveEntity(p, d.dx * step, d.dy * step, false);
  d.left -= step;
  const dir = facingDir(p.facing);
  addEffect({ type: 'afterimage', sprite: characterSprite(p.classId, dir, 1), x: p.x, y: feetY(p), flip: dir === 'side' && p.facing.x < 0, dur: 0.3 });
  particles(p.x, feetY(p), { count: 2, color: ['#a88f62', '#c9b28a'], speed: [20, 60], life: [0.3, 0.5], size: [2, 4], drag: 3, glow: false });
  for (const m of enemiesInCircle(p.x, p.y, d.sk.radius)) {
    if (d.hit.has(m.id)) continue;
    d.hit.add(m.id);
    hitMonster(m, d.sk.dmg * d.pw, { stun: d.sk.stun, knockback: 60, heavy: true });
  }
  if (d.left <= 0 || !moved) {
    p.dash = null;
    shakeScreen(3);
  }
}

// --- Geschosse --------------------------------------------------------------------

function spawnProjectile(o) {
  let dx;
  let dy;
  const goal = o.target || o.aimAt;
  if (goal) {
    dx = goal.x - o.x;
    dy = goal.y - o.y;
  } else {
    dx = o.dir.x;
    dy = o.dir.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  game.projectiles.push({
    hit: new Set(), traveled: 0, pierce: false, chain: 0, radius: 6, trail: [],
    ...o,
    vx: dx / len, vy: dy / len
  });
}

function updateProjectiles(dt) {
  const p = game.player;
  for (const pr of game.projectiles) {
    if (pr.target && !pr.target.dead) {
      const dx = pr.target.x - pr.x;
      const dy = pr.target.y - pr.y;
      const len = Math.hypot(dx, dy) || 1;
      pr.vx = dx / len;
      pr.vy = dy / len;
    }
    const step = pr.speed * dt;
    pr.x += pr.vx * step;
    pr.y += pr.vy * step;
    pr.traveled += step;
    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 9) pr.trail.shift();
    if (pr.traveled > pr.range) { pr.done = true; continue; }

    if (pr.owner === 'player') {
      for (const m of game.monsters) {
        if (m.dead || pr.hit.has(m.id)) continue;
        if (Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.hit.add(m.id);
        hitMonster(m, pr.mul, { poison: pr.poison, vfxColor: pr.color });
        if (pr.poison) particles(m.x, feetY(m) - 16, { count: 12, color: ['#8fd16a', '#5a8a3a'], speed: [10, 40], life: [0.5, 0.9], size: [3, 6], drag: 2 });
        if (pr.chain > 0) {
          const next = aliveEnemies()
            .filter((o) => !pr.hit.has(o.id) && dist(o, m) < 180)
            .sort((a, b) => dist(a, m) - dist(b, m))[0];
          if (next) {
            const a = bodyCenter(m);
            const b = bodyCenter(next);
            addEffect({ type: 'chain', x: a.x, y: a.y, x2: b.x, y2: b.y, dur: 0.25, color: pr.color });
            pr.chain--;
            pr.target = next;
            pr.traveled = 0;
            continue;
          }
        }
        if (!pr.pierce) { pr.done = true; break; }
      }
    } else {
      const victims = p.dead ? game.allies : [p, ...game.allies];
      for (const v of victims) {
        if (Math.hypot(v.x - pr.x, v.y - pr.y) > v.r + pr.radius) continue;
        pr.done = true;
        particles(v.x, feetY(v) - 18, { count: 8, color: [pr.color, '#ffffff'], speed: [60, 140], life: [0.15, 0.3], size: [1.5, 2.5], shape: 'spark', drag: 6 });
        if (v === p) {
          if (!game.stats.invisible) damagePlayer(calcDamage(pr.atk, 1, game.stats.def, 0.03).amount, pr.source);
        } else {
          damageAlly(v, calcDamage(pr.atk, 1, v.def, 0).amount);
        }
        break;
      }
    }
  }
  game.projectiles = game.projectiles.filter((pr) => !pr.done);
}
