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
  return amount;
}

function damageMonster(m, amount, crit, source, isDot) {
  m.hp -= amount;
  m.hitFlash = 0.12;
  addText(m.x + (Math.random() - 0.5) * 14, m.y - m.r - 14, String(amount), crit ? 'crit' : isDot ? 'dot' : 'dmg');
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
  addEffect({ type: 'burst', x: m.x, y: m.y, dur: 0.6, color: m.isStone ? '#c58cff' : '#d8d0c0', count: m.isStone ? 26 : 10 });

  const xp = Math.max(1, Math.round(m.xp * xpFactor(p.level, m.level)));
  const gold = randInt(m.gold[0], m.gold[1]);
  p.gold += gold;
  p.kills++;
  addText(m.x, m.y - m.r - 30, '+' + xp + ' EP', 'xp');
  addText(m.x, m.y - m.r - 16, '+' + gold + ' Gold', 'gold');

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
    addText(p.x + (Math.random() - 0.5) * 12, p.y - 30, '-' + dmg, 'hurt');
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

function tryBasicAttack() {
  const p = game.player;
  const c = CLASSES[p.classId];
  if (p.attackCd > 0 || p.dead || p.dash) return false;
  if (inVillage(p.x, p.y)) return false; // im Dorf wird nicht gekämpft
  const target = pickTarget(c.basic.range);
  if (!target) return false;
  faceTowards(target.x, target.y);
  p.attackCd = c.basic.cooldown / game.stats.atkSpeed;
  p.swing = 0.25;
  if (c.basic.ranged) {
    spawnProjectile({ owner: 'player', x: p.x, y: p.y, target, speed: 460, range: c.basic.range + 60, mul: 1, color: c.basic.color, radius: 5 });
  } else {
    hitMonster(target, 1);
    addEffect({ type: 'slash', x: target.x, y: target.y, dur: 0.2, color: '#f4ecd8', ang: Math.random() * Math.PI });
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
  p.swing = 0.3;
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
  // Halbkreis vor dem Spieler, optional mehrere Treffer hintereinander
  cone(sk, pw) {
    const p = game.player;
    const dir = aim(sk.radius + 30);
    const hits = sk.hits || 1;
    for (let h = 0; h < hits; h++) {
      later(h * (hits > 3 ? 0.18 : 0.13), () => {
        if (p.dead) return;
        const ang = Math.atan2(dir.y, dir.x);
        addEffect({ type: 'arc', x: p.x, y: p.y, r: sk.radius, ang: ang + (h % 2 ? 0.25 : -0.25), spread: sk.angle * Math.PI / 180, dur: 0.25, color: sk.color || '#f4ecd8', fill: !!sk.burn });
        for (const m of enemiesInCone(p.x, p.y, dir, sk.radius, sk.angle)) {
          hitMonster(m, sk.dmg * pw, { knockback: h === hits - 1 ? sk.knockback : 0, burn: sk.burn, stun: sk.stun });
        }
      });
    }
  },

  // Kreis um den Spieler
  circle(sk, pw) {
    const p = game.player;
    addEffect({ type: 'ring', x: p.x, y: p.y, r: sk.radius, dur: 0.35, color: '#f4ecd8', width: 8 });
    addEffect({ type: 'spin', x: p.x, y: p.y, r: sk.radius * 0.8, dur: 0.35, color: '#f4ecd8', follow: p });
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      hitMonster(m, sk.dmg * pw, { stun: sk.stun });
    }
  },

  // Vorwärtssturm, trifft alles auf dem Weg
  dash(sk, pw) {
    const p = game.player;
    const dir = aim(sk.distance);
    p.dash = { dx: dir.x, dy: dir.y, left: sk.distance, speed: sk.distance / 0.22, hit: new Set(), sk, pw };
  },

  // Einzelner starker Treffer im Nahkampf
  strike(sk, pw) {
    const t = pickTarget(sk.range);
    if (!t) {
      ui.log('Kein Gegner in Reichweite für ' + sk.name + '.', 'warn');
      return false;
    }
    faceTowards(t.x, t.y);
    hitMonster(t, sk.dmg * pw, { critBonus: sk.critBonus });
    addEffect({ type: 'slash', x: t.x, y: t.y, dur: 0.3, color: '#c9b8ff', ang: 0.6, big: true });
    addEffect({ type: 'slash', x: t.x, y: t.y, dur: 0.3, color: '#c9b8ff', ang: -0.6, big: true });
  },

  projectile(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (t) faceTowards(t.x, t.y);
    spawnProjectile({
      owner: 'player', x: p.x, y: p.y, target: sk.pierce ? null : t, dir: t ? null : p.facing,
      aimAt: sk.pierce && t ? { x: t.x, y: t.y } : null,
      speed: sk.speed, range: sk.range + 40, mul: sk.dmg * pw, color: sk.color, radius: 7,
      pierce: sk.pierce, chain: sk.chain || 0, poison: sk.poison, glow: true
    });
  },

  // Flächenschaden beim Ziel nach kurzer Verzögerung
  blast(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    const x = t ? t.x : p.x + p.facing.x * 120;
    const y = t ? t.y : p.y + p.facing.y * 120;
    if (t) faceTowards(t.x, t.y);
    addEffect({ type: 'bolt', x, y, dur: 0.45, color: '#cfe8ff' });
    later(0.15, () => {
      addEffect({ type: 'ring', x, y, r: sk.radius, dur: 0.4, color: '#9fd0ff', width: 6 });
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { stun: sk.stun });
    });
  },

  buff(sk, pw, lvl) {
    const p = game.player;
    applyBuff(sk, lvl);
    if (sk.nextHitMul) p.nextHitMul = sk.nextHitMul;
    if (sk.shield) {
      p.shield = Math.round(game.stats.maxHp * sk.shield * buffScale(lvl));
      p.shieldUntil = game.time + sk.duration;
    }
    if (sk.effects && sk.effects.invisible) {
      for (const m of game.monsters) {
        if (m.target === p) { m.state = 'return'; m.target = null; }
      }
    }
    addEffect({ type: 'ring', x: p.x, y: p.y, r: 40, dur: 0.5, color: CLASSES[p.classId].trim, width: 4, follow: p, grow: true });
    ui.log(sk.name + ' ist aktiv (' + sk.duration + ' s).', 'info');
  },

  heal(sk, pw, lvl) {
    const p = game.player;
    const s = game.stats;
    const amount = Math.round(s.maxHp * sk.amount * buffScale(lvl));
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 34, '+' + amount, 'heal');
    addEffect({ type: 'ring', x: p.x, y: p.y, r: 46, dur: 0.6, color: '#9be59b', width: 5, follow: p, grow: true });
    if (sk.effects) applyBuff(sk, lvl);
  },

  // Lebensentzug: sofortiger Treffer, heilt den Spieler
  drain(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (!t) {
      ui.log('Kein Gegner in Reichweite für ' + sk.name + '.', 'warn');
      return false;
    }
    faceTowards(t.x, t.y);
    const dmg = hitMonster(t, sk.dmg * pw);
    const heal = Math.round(dmg * sk.heal);
    p.hp = Math.min(game.stats.maxHp, p.hp + heal);
    addText(p.x, p.y - 34, '+' + heal, 'heal');
    addEffect({ type: 'beam', x: t.x, y: t.y, x2: p.x, y2: p.y, dur: 0.4, color: '#c43a5a' });
  },

  summon(sk, pw, lvl) {
    const p = game.player;
    const s = game.stats;
    game.allies = [];
    for (let k = 0; k < sk.count; k++) {
      const ang = Math.PI * 2 * k / sk.count;
      const maxHp = Math.round(s.maxHp * sk.hp * buffScale(lvl));
      game.allies.push({
        id: 'ally' + k, x: p.x + Math.cos(ang) * 30, y: p.y + Math.sin(ang) * 30, r: 10,
        hp: maxHp, maxHp, atk: Math.round(s.atk * sk.atk * pw), def: Math.round(s.def * 0.5),
        until: game.time + sk.duration, target: null, cd: 0, facing: 1, swing: 0
      });
      addEffect({ type: 'burst', x: p.x + Math.cos(ang) * 30, y: p.y + Math.sin(ang) * 30, dur: 0.5, color: '#cfd8b0', count: 10 });
    }
    ui.log('Zwei Skelette erheben sich aus dem Boden.', 'info');
  },

  curse(sk, pw, lvl) {
    const p = game.player;
    const scale = buffScale(lvl);
    addEffect({ type: 'ring', x: p.x, y: p.y, r: sk.radius, dur: 0.6, color: '#a774e0', width: 10 });
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      m.vulnerable = { mul: 1 + sk.vulnerable * scale, until: game.time + sk.duration };
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
  addEffect({ type: 'ghost', x: p.x, y: p.y, dur: 0.25, color: CLASSES[p.classId].color });
  for (const m of enemiesInCircle(p.x, p.y, d.sk.radius)) {
    if (d.hit.has(m.id)) continue;
    d.hit.add(m.id);
    hitMonster(m, d.sk.dmg * d.pw, { stun: d.sk.stun, knockback: 60 });
  }
  if (d.left <= 0 || !moved) p.dash = null;
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
    hit: new Set(), traveled: 0, pierce: false, chain: 0, radius: 6,
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
    if (pr.traveled > pr.range) { pr.done = true; continue; }

    if (pr.owner === 'player') {
      for (const m of game.monsters) {
        if (m.dead || pr.hit.has(m.id)) continue;
        if (Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.hit.add(m.id);
        hitMonster(m, pr.mul, { poison: pr.poison });
        addEffect({ type: 'burst', x: pr.x, y: pr.y, dur: 0.3, color: pr.color, count: 6 });
        if (pr.chain > 0) {
          const next = aliveEnemies()
            .filter((o) => !pr.hit.has(o.id) && dist(o, m) < 180)
            .sort((a, b) => dist(a, m) - dist(b, m))[0];
          if (next) {
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

// --- Effekte und schwebende Zahlen ---------------------------------------------------

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
    for (let k = 0; k <= 7; k++) e.points.push({ x: e.x + (k && k < 7 ? (Math.random() - 0.5) * 30 : 0), y: e.y - 220 + k * (220 / 7) });
  }
  game.effects.push(e);
}

function addText(x, y, text, style) {
  game.texts.push({ x, y, text, style, start: game.time, dur: style === 'level' ? 1.6 : 0.9 });
}

function updateEffects() {
  game.effects = game.effects.filter((e) => game.time - e.start < e.dur);
  game.texts = game.texts.filter((t) => game.time - t.start < t.dur);
  if (game.texts.length > 80) game.texts.splice(0, game.texts.length - 80);
}

function updateTimers() {
  const due = game.timers.filter((t) => t.at <= game.time);
  game.timers = game.timers.filter((t) => t.at > game.time);
  for (const t of due) t.fn();
}
