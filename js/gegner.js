// Monster: Erscheinen, Verhalten (KI), Seelensteine und Skelett-Diener.

const LEASH = 420;        // so weit verfolgen Monster dich von ihrem Platz weg
const AGGRO_LEVEL_GAP = 10; // so viele Stufen unter dem Spieler: kein Angriff von selbst
const AGGRO_RANGE = 150;  // ab dieser Nähe greifen aggressive Monster an
let nextMonsterId = 1;

function createMonster(typeId, x, y, opts = {}) {
  const t = MONSTER_TYPES[typeId];
  // opts.level: z. B. Monster aus einem Seelenstein haben dessen Stufe
  const level = opts.level || t.level;
  const st = monsterStats(level, t.hpMul, t.atkMul);
  return {
    id: nextMonsterId++, typeId, type: t, name: t.name, level,
    x, y, homeX: x, homeY: y, r: t.size,
    maxHp: st.maxHp, hp: st.maxHp, atk: st.atk, def: st.def, xp: st.xp, gold: st.gold,
    state: 'idle', target: null, cd: Math.random(), wanderAt: Math.random() * 4, wx: x, wy: y,
    facing: Math.random() < 0.5 ? -1 : 1, moving: false,
    stun: 0, kx: 0, ky: 0, hitFlash: 0, slow: null, vulnerable: null, poison: null, burn: null,
    respawn: opts.respawn !== false, groupId: opts.groupId || 0, zone: opts.zone, dead: false, respawnAt: 0
  };
}

function createStone(zone, level, from = 0, to = 1, at = null) {
  const spot = at || randomSpotInZone(zone, from, to);
  if (!spot) return null;
  const type = stoneType(level);
  const st = monsterStats(level, STONE.hpMul);
  return {
    id: nextMonsterId++, isStone: true, stoneType: type, name: type.name, level,
    x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, r: 18, area: [from, to],
    maxHp: st.maxHp, hp: st.maxHp, atk: 0, def: st.def,
    xp: Math.round(monsterStats(level).xp * STONE.xpMul),
    gold: st.gold.map((g) => g * STONE.goldMul),
    wave: 0, waveMarks: stoneWaveMarks(), zone, respawn: true, dead: false, respawnAt: 0, hitFlash: 0, stun: 0, kx: 0, ky: 0,
    phase: Math.random() * 6
  };
}

// Ein Seelenstein ruft nach jeweils 10–15 % verlorenem Leben eine Welle Monster
function stoneWaveMarks() {
  const marks = [];
  for (let h = 1 - (0.1 + Math.random() * 0.05); h > 0.04; h -= 0.1 + Math.random() * 0.05) marks.push(h);
  return marks;
}

// Weniger Monster in der Welt (weniger Gedränge, flüssigeres Bild): Anteil der Gruppen aus den Zonendaten
const MOB_DENSITY = 0.6;
// Die Maps sind seit Version 4.5 deutlich größer: mehr Gruppen und Steine, damit sie nicht leer wirken
const WORLD_SCALE_MOBS = 2;
const WORLD_SCALE_STONES = 1.6;

// Füllt alle Jagdzonen mit Monstergruppen und Seelensteinen
function populateWorld() {
  game.monsters = [];
  let groupId = 1;
  for (const zone of ZONES) {
    if (!zone.groups) continue;
    for (const [typeId, count, from, to] of zone.groups) {
      for (let g = Math.max(2, Math.round(count * MOB_DENSITY * WORLD_SCALE_MOBS)); g > 0; g--) {
        const center = randomSpotInZone(zone, from, to);
        if (!center) continue;
        const size = randInt(Math.max(2, zone.groupSize[0] - 1), Math.max(2, zone.groupSize[1] - 1));
        for (let k = 0; k < size; k++) {
          const pos = spotNear(center, 46);
          game.monsters.push(createMonster(typeId, pos.x, pos.y, { groupId, zone }));
        }
        groupId++;
      }
    }
    for (const [level, count, from, to] of zone.stones || []) {
      for (let s = Math.round(count * WORLD_SCALE_STONES); s > 0; s--) {
        const stone = createStone(zone, level, from, to);
        if (stone) game.monsters.push(stone);
      }
    }
  }
  populateDungeons(groupId);
}

// Dungeons: in Raum 2–4 je zwei Gruppen, im letzten Raum der Boss.
// Monster kommen erst nach 90 s wieder, der Boss nach 10 Minuten.
const DUNGEON_RESPAWN = 90;
const BOSS_RESPAWN = 600;
const RAID_RESPAWN = 900;
function populateDungeons(groupId) {
  for (const dg of game.world.dungeons) {
    const zone = ZONES[RING_ZONES + DUNGEONS.indexOf(dg.def)];
    if (dg.def.raid) {
      // Endboss-Halle: nur der Boss in der Mitte
      const rb = dg.rooms[1];
      const boss = createMonster(dg.def.boss, (rb.cx + 0.5) * TILE, (rb.cy + 0.5) * TILE, { zone });
      boss.respawnDelay = RAID_RESPAWN;
      game.monsters.push(boss);
      continue;
    }
    const [a, b] = dg.def.mobs;
    const plan = [[1, [a, a]], [2, [a, b]], [3, [b, b]]];
    for (const [ri, types] of plan) {
      const r = dg.rooms[ri];
      types.forEach((typeId, k) => {
        const c = { x: (r.x + r.w * (k ? 0.7 : 0.3)) * TILE, y: (r.y + r.h * 0.5) * TILE };
        const n = randInt(2, 3);
        for (let j = 0; j < n; j++) {
          const pos = spotNear(c, 50);
          const m = createMonster(typeId, pos.x, pos.y, { groupId, zone });
          m.respawnDelay = DUNGEON_RESPAWN;
          game.monsters.push(m);
        }
        groupId++;
      });
    }
    // Seelensteine in Raum 2 und 4, an fester Stelle, kommen erst nach 5–8 Minuten wieder
    dg.def.stones.forEach((level, k) => {
      const r = dg.rooms[k ? 3 : 1];
      const stone = createStone(zone, level, 0, 1, { x: (r.x + r.w * 0.5) * TILE, y: (r.y + 2.2) * TILE });
      stone.fixedSpot = true;
      stone.stoneRespawn = [300, 480];
      game.monsters.push(stone);
    });
    const rb = dg.rooms[dg.rooms.length - 1];
    const boss = createMonster(dg.def.boss, (rb.cx + 0.5) * TILE, (rb.cy + 0.5) * TILE, { zone });
    boss.respawnDelay = BOSS_RESPAWN;
    boss.bossCd = 4;
    boss.summoned = 0;
    game.monsters.push(boss);
  }
}

// --- Bosse ------------------------------------------------------------------------------
// Abwechselnd Stampfer (roter Kreis am Boden, nach 1,1 s Schaden für alle darin) und Salve.
// Bei 66 % und 33 % Leben ruft der Boss Verstärkung. Unter 25 % wird er schneller.
function updateBoss(m, dt) {
  const p = game.player;
  const b = m.type.boss;
  if (m.cast) {
    m.moving = false;
    if (game.time < m.cast.at) return true;
    const c = m.cast;
    m.cast = null;
    if (c.kind === 'slam') {
      if (net.mode === 'host') netBroadcast({ t: 'slam', id: m.id, r: b.slam, atk: m.atk, lvl: m.level });
      shakeScreen(9);
      addEffect({ type: 'ring', x: m.x, y: feetY(m), r: b.slam, dur: 0.5, color: b.color, width: 12, grow: true });
      addEffect({ type: 'decal', kind: 'crack', x: m.x, y: feetY(m), r: b.slam * 0.6, dur: 2.5, color: '#1a1210' });
      particles(m.x, feetY(m), { count: 40, color: [b.color, '#ffffff', '#5a4a3a'], speed: [120, 320], life: [0.3, 0.7], size: [2, 4.5], shape: 'square', drag: 3, glow: false });
      if (!p.dead && Math.hypot(p.x - m.x, (p.y - m.y) * 1.2) < b.slam) {
        damagePlayer(calcDamage(m.atk, 2.2 * levelBonus(m.level, p.level), game.stats.def, 0.05, m.level).amount, m);
      }
    }
    return true;
  }
  m.bossCd -= dt * (m.hp < m.maxHp * 0.25 ? 1.5 : 1);
  // Verstärkung
  const step = m.summoned === 0 ? 0.66 : m.summoned === 1 ? 0.33 : -1;
  if (m.hp < m.maxHp * step) {
    m.summoned++;
    for (let k = 0; k < 3; k++) {
      const pos = spotNear(m, 80);
      const add = createMonster(b.summon, pos.x, pos.y, { respawn: false, zone: m.zone });
      add.homeX = m.homeX;
      add.homeY = m.homeY;
      add.state = 'chase';
      add.target = m.target || p;
      game.monsters.push(add);
      addEffect({ type: 'burst', x: pos.x, y: pos.y, dur: 0.6, color: b.color, count: 10 });
    }
    ui.banner(m.name, 'ruft Verstärkung!');
  }
  if (m.bossCd > 0 || m.state !== 'chase') return false;
  m.bossCd = 5.5;
  m.bossTurn = (m.bossTurn || 0) + 1;
  if (b.volley && m.bossTurn % 2 === 0) {
    // Salve: fächerförmig auf den Spieler, beim Eiskönig ringsum
    const tgt = m.target || p;
    const base = Math.atan2(tgt.y - m.y, tgt.x - m.x);
    const all = b.volley >= 8;
    for (let k = 0; k < b.volley; k++) {
      const a = all ? (k / b.volley) * Math.PI * 2 : base + (k - (b.volley - 1) / 2) * 0.22;
      game.projectiles.push({
        owner: 'monster', x: m.x, y: m.y - 10, vx: Math.cos(a), vy: Math.sin(a), speed: 260, range: 520, traveled: 0,
        radius: 7, atk: Math.round(m.atk * 0.8), source: m, color: b.shot, hit: new Set(), trail: []
      });
      if (net.mode === 'host') netBroadcastProjectile(game.projectiles[game.projectiles.length - 1], m);
    }
    m.attackAnim = 0.25;
    return false;
  }
  m.cast = { kind: 'slam', at: game.time + 1.1 };
  addEffect({ type: 'warn', x: m.x, y: feetY(m), r: b.slam, dur: 1.1, color: '#ff3a2a' });
  if (net.mode === 'host') netBroadcast({ t: 'warn', x: Math.round(m.x), y: Math.round(feetY(m)), r: b.slam });
  return true;
}

// --- Endbosse (seit 6.5) ------------------------------------------------------------------------
// Fünf Angriffe im Wechsel, jeder mit Warnzeichen am Boden: Stampfer um den Boss, Meteorregen auf alle
// Spieler, Linienangriff, Tank-Schlag aufs Ziel (Heiler gefragt), Nova (nur direkt beim Boss sicher).
// Bei 70 % und 35 % Leben: Wutschrei, Helfer, danach schneller. Den Schaden rechnet jeder Spieler für sich.
const RAID_MOVES = ['slam', 'meteor', 'line', 'buster', 'nova', 'meteor'];
const RAID_MUL = { slam: 3, meteor: 2.6, line: 3.2, buster: 6, nova: 3.4 };

function raidPlayers() {
  const list = [];
  const p = game.player;
  if (p && !p.dead) list.push(p);
  if (net.mode === 'host') for (const rp of net.players.values()) if (!rp.dead) list.push(rp);
  return list;
}

function updateRaidBoss(m, dt) {
  const b = m.type.boss;
  if (!m.raid) m.raid = { next: 3, step: 0, phase: 0 };
  const R = m.raid;
  if (m.state !== 'chase') {
    // ohne Kampf heilt der Boss vollständig und beginnt von vorn
    if (m.hp < m.maxHp && !m.cast) { m.hp = m.maxHp; R.phase = 0; R.step = 0; }
    return false;
  }
  if (m.cast) {
    m.moving = false;
    if (game.time < m.cast.at) return true;
    const c = m.cast;
    m.cast = null;
    raidResolve(m, c.kind, c.circles, c.inner);
    return true;
  }
  const hpk = m.hp / m.maxHp;
  const phase = hpk < 0.35 ? 2 : hpk < 0.7 ? 1 : 0;
  if (phase > R.phase) {
    R.phase = phase;
    raidRoar(m, phase);
    return true;
  }
  R.next -= dt * (1 + R.phase * 0.35);
  if (R.next > 0) return false;
  R.next = 6.5 - R.phase * 1.2;
  const kind = RAID_MOVES[R.step++ % RAID_MOVES.length];
  const tgt = m.target && !m.target.dead ? m.target : game.player;
  const fy = (e) => feetY(e);
  let circles = [];
  let inner = 0;
  let delay = 1.7;
  if (kind === 'slam') circles = [{ x: m.x, y: fy(m), r: b.slam }];
  else if (kind === 'meteor') {
    // ein Meteor auf jeden Spieler, dazu ein paar zufällige
    for (const pl of raidPlayers()) circles.push({ x: pl.x, y: fy(pl), r: 95 });
    for (let k = 0; k < 3 + R.phase * 2; k++) { const s = spotNear(m, 360); circles.push({ x: s.x, y: s.y + 10, r: 85 }); }
    delay = 1.9;
  } else if (kind === 'line') {
    const a = Math.atan2(tgt.y - m.y, tgt.x - m.x);
    for (let k = 1; k <= 6; k++) circles.push({ x: m.x + Math.cos(a) * k * 75, y: fy(m) + Math.sin(a) * k * 75, r: 70 });
    delay = 1.5;
  } else if (kind === 'buster') {
    circles = [{ x: tgt.x, y: fy(tgt), r: 70 }];
    addEffect({ type: 'ultmark', follow: tgt, ox: 0, oy: 0, dur: 1.6, color: b.color });
    delay = 1.6;
  } else if (kind === 'nova') {
    circles = [{ x: m.x, y: fy(m), r: 420 }];
    inner = 130;
    delay = 2.2;
  }
  m.cast = { kind, circles, inner, at: game.time + delay };
  m.attackAnim = 0.25;
  raidTelegraph(m, kind, circles, inner, delay);
  if (net.mode === 'host') netBroadcast({ t: 'raid', id: m.id, k: kind, c: circles.map((c) => [Math.round(c.x), Math.round(c.y), c.r]), in: inner, d: delay, atk: m.atk, lvl: m.level });
  return true;
}

// Warnzeichen am Boden (auch beim Mitspieler)
function raidTelegraph(m, kind, circles, inner, delay) {
  const col = kind === 'buster' ? '#ff2a2a' : '#ff3a2a';
  for (const c of circles) addEffect({ type: 'warn', x: c.x, y: c.y, r: c.r, inner, dur: delay, color: col });
  if (kind === 'meteor') for (const c of circles) later(Math.max(0, delay - 0.45), () => addEffect({ type: 'ultfall', kind: 'meteor', x: c.x, y: c.y, fall: 0.45, dur: 0.9, color: m.type.boss.color }));
  if (kind === 'nova') addEffect({ type: 'ultsigil', ground: true, x: m.x, y: feetY(m), r: inner, dur: delay, color: '#7aff8a' });
  if (kind === 'slam' || kind === 'nova') addEffect({ type: 'pillar', follow: m, dur: delay, color: m.type.boss.color });
}

// Einschlag: Wirkung zeigen, eigener Spieler nimmt Schaden, wenn er in einem Kreis steht
function raidResolve(m, kind, circles, inner, atk = m.atk, lvl = m.level) {
  const p = game.player;
  const b = m.type.boss;
  shakeScreen(kind === 'nova' ? 12 : 8);
  for (const c of circles) {
    addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.5, color: b.color, width: 12, grow: true });
    addEffect({ type: 'decal', kind: kind === 'meteor' ? 'scorch' : 'crack', x: c.x, y: c.y, r: c.r * 0.6, dur: 3, color: '#1a1210' });
    if (kind === 'meteor' || kind === 'buster') addEffect({ type: 'bolt', x: c.x, y: c.y, dur: 0.35, color: b.color });
    particles(c.x, c.y - 6, { count: 26, color: [b.color, '#ffffff', '#5a4a3a'], speed: [120, 320], life: [0.3, 0.7], size: [2, 4.5], shape: 'ember', drag: 3 });
  }
  if (kind === 'nova') flashScreen(b.color, 0.35);
  if (p.dead) return;
  const fyp = feetY(p);
  const hit = circles.some((c) => {
    const d = Math.hypot(p.x - c.x, (fyp - c.y) * 1.2);
    return d < c.r && d >= (inner || 0);
  });
  if (hit) damagePlayer(calcDamage(atk, RAID_MUL[kind] * levelBonus(lvl, p.level), game.stats.def, 0.05, lvl).amount, m);
}

// Phasenwechsel: Wutschrei mit Druckwelle und Helfer
function raidRoarFx(m, phase) {
  const b = m.type.boss;
  ui.banner(m.name, phase === 2 ? 'rast vor Wut!' : 'ruft seine Brut!');
  shakeScreen(14);
  flashScreen(b.color, 0.4);
  addEffect({ type: 'ring', x: m.x, y: feetY(m), r: 380, dur: 0.9, color: b.color, width: 18, grow: true });
  addEffect({ type: 'ultbeam', x: m.x, y: feetY(m), w: 140, dur: 1.2, color: b.color });
}
function raidRoar(m, phase) {
  const b = m.type.boss;
  raidRoarFx(m, phase);
  for (let k = 0; k < 3 + phase; k++) {
    const pos = spotNear(m, 160);
    const add = createMonster(b.summon, pos.x, pos.y, { respawn: false, zone: m.zone, level: m.level - 4 });
    add.homeX = m.homeX;
    add.homeY = m.homeY;
    add.state = 'chase';
    add.target = m.target || game.player;
    game.monsters.push(add);
    addEffect({ type: 'pillar', x: pos.x, y: pos.y + 9, dur: 0.8, color: b.color });
  }
  if (net.mode === 'host') netBroadcast({ t: 'roar', id: m.id, ph: phase });
}

function spotNear(c, radius) {
  for (let tries = 0; tries < 20; tries++) {
    const x = c.x + (Math.random() - 0.5) * 2 * radius;
    const y = c.y + (Math.random() - 0.5) * 2 * radius;
    if (canStand(x, y, 8, true)) return { x, y };
  }
  return { x: c.x, y: c.y };
}

function reviveMonster(m) {
  if (m.isStone && !m.fixedSpot) {
    const spot = randomSpotInZone(m.zone, m.area[0], m.area[1]);
    if (spot) { m.x = m.homeX = spot.x; m.y = m.homeY = spot.y; }
    m.wave = 0;
    m.waveMarks = stoneWaveMarks();
    if (dist(m, game.player) < 900) ui.log(`In der Nähe ist ein ${m.name} (Stufe ${m.level}) erschienen.`, 'info');
  } else {
    m.x = m.homeX;
    m.y = m.homeY;
  }
  if (m.isStone) {
    m.wave = 0;
    m.waveMarks = stoneWaveMarks();
  }
  m.hp = m.maxHp;
  m.dead = false;
  m.state = 'idle';
  m.target = null;
  m.stun = 0;
  m.kx = m.ky = 0;
  m.slow = m.vulnerable = m.poison = m.burn = null;
}

// Ein angegriffenes Monster und seine Gruppe greifen den Angreifer an
function aggro(m, source) {
  if (m.isStone || m.dead) return;
  if (m.state !== 'chase' || !m.target) {
    m.state = 'chase';
    m.target = source;
  }
  if (!m.groupId) return;
  for (const o of game.monsters) {
    if (o !== m && !o.dead && o.groupId === m.groupId && o.state === 'idle' && dist(o, m) < 220) {
      o.state = 'chase';
      o.target = source;
    }
  }
}

// Seelenstein ruft nach jeweils 10–15 % Schaden eine Welle: Monster der Zone mit der Stufe des Steins.
// Sie gehören zum Stein (m.stone) und sterben mit ihm.
const STONE_MINIONS_MAX = 9;
function checkStoneWaves(stone) {
  const zone = stone.zone;
  const all = zone.dungeon ? zone.dungeon.mobs : zone.groups.map((g) => g[0]);
  const pool = all.filter((id) => MONSTER_TYPES[id].level <= stone.level + 2);
  const types = pool.length ? pool : [all[0]];
  const marks = stone.waveMarks || (stone.waveMarks = stoneWaveMarks());
  while (stone.wave < marks.length && stone.hp / stone.maxHp <= marks[stone.wave]) {
    stone.wave++;
    const alive = game.monsters.filter((o) => o.stone === stone && !o.dead).length;
    const count = Math.min(randInt(2, 3), STONE_MINIONS_MAX - alive);
    for (let k = 0; k < count; k++) {
      const typeId = types[randInt(0, types.length - 1)];
      const pos = spotNear(stone, 70);
      const m = createMonster(typeId, pos.x, pos.y, { respawn: false, zone, level: stone.level });
      m.stone = stone;
      m.homeX = stone.x;
      m.homeY = stone.y;
      m.state = 'chase';
      m.target = stone.lastAttacker && !stone.lastAttacker.gone ? stone.lastAttacker : game.player;
      game.monsters.push(m);
      addEffect({ type: 'burst', x: pos.x, y: pos.y, dur: 0.5, color: stone.stoneType.look.glow, count: 8 });
    }
    if (count > 0) {
      stone.crackFx = game.time;
      addEffect({ type: 'ring', x: stone.x, y: stone.y, r: 60, dur: 0.45, color: stone.stoneType.look.glow, width: 6, grow: true });
    }
    if (stone.wave === 1) ui.log('Der Seelenstein ruft Monster zu Hilfe!', 'warn');
  }
}

// Zerbricht der Stein, vergehen alle Monster, die er gerufen hat (mit Beute und Erfahrung)
function killStoneMinions(stone) {
  let k = 0;
  for (const o of game.monsters) {
    if (o.stone !== stone || o.dead) continue;
    later(0.12 + k++ * 0.07, () => {
      if (o.dead) return;
      const c = bodyCenter(o);
      particles(c.x, c.y, { count: 14, color: [stone.stoneType.look.glow, stone.stoneType.look.rune, '#ffffff'], speed: [60, 180], life: [0.3, 0.7], size: [2, 3.5], drag: 2 });
      killMonster(o);
    });
  }
}

function tickDots(m, dt) {
  for (const key of ['poison', 'burn']) {
    const d = m[key];
    if (!d) continue;
    if (d.until <= game.time) { m[key] = null; continue; }
    d.tick += dt;
    if (d.tick >= 1) {
      d.tick -= 1;
      damageMonster(m, Math.max(1, Math.round(d.dps)), false, m.lastAttacker && !m.lastAttacker.gone ? m.lastAttacker : game.player, true);
      if (m.dead) return;
    }
  }
}

function monsterAttack(m, target) {
  const p = game.player;
  m.attackAnim = 0.25;
  if (m.type.ranged) {
    game.projectiles.push({
      owner: 'monster', x: m.x, y: m.y, vx: 0, vy: 0, speed: 300, range: m.type.range + 80, traveled: 0,
      radius: 5, atk: m.atk, source: m, color: m.type.shot || '#e8d6a0', hit: new Set(), trail: [],
      style: m.type.bow ? 'arrow' : undefined,
      ...(() => {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const len = Math.hypot(dx, dy) || 1;
        return { vx: dx / len, vy: dy / len };
      })()
    });
    if (net.mode === 'host') netBroadcastProjectile(game.projectiles[game.projectiles.length - 1], m);
    return;
  }
  const bc = bodyCenter(target);
  if (m.type.shape === 'beast' || m.type.shape === 'boar') addEffect({ type: 'claw', x: bc.x, y: bc.y, dur: 0.25, color: '#ff5a4a' });
  else addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: m.facing > 0 ? 0.9 : -0.9 + Math.PI, len: 30, w: 5, dur: 0.22, color: '#ff8a6a' });
  if (target.remote) {
    // Ein Mitspieler wird getroffen: den Schaden rechnet sein Gerät mit seiner Rüstung aus
    netSendTo(target.peerId, { t: 'mhit', id: m.id, atk: m.atk, lvl: m.level, mul: levelBonus(m.level, target.level) });
  } else if (target === p) {
    damagePlayer(calcDamage(m.atk, levelBonus(m.level, p.level), game.stats.def, 0.03, m.level).amount, m);
  } else {
    damageAlly(target, calcDamage(m.atk, 1, target.def, 0, m.level).amount);
  }
}

function moveToward(e, tx, ty, step, isMonster) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return false;
  const s = Math.min(step, len);
  if (Math.abs(dx) > 1) e.facing = dx > 0 ? 1 : -1;
  return moveEntity(e, dx / len * s, dy / len * s, isMonster);
}

// Spieler, die Monster jagen können: man selbst und beim Host auch die Mitspieler
function huntablePlayers() {
  const list = [game.player];
  if (net.mode === 'host') for (const rp of net.players.values()) if (!rp.dead) list.push(rp);
  return list;
}
const isPlayerLike = (t) => t === game.player || !!(t && t.remote);
const playerHidden = (t) => (t === game.player ? game.stats.invisible : t.invisible) || inVillage(t.x, t.y);

function playerNearSpot(x, y, r) {
  const p = game.player;
  if (p && !p.dead && Math.hypot(p.x - x, p.y - y) < r) return true;
  if (net.mode === 'host') for (const rp of net.players.values()) if (!rp.dead && Math.hypot(rp.x - x, rp.y - y) < r) return true;
  return false;
}

function updateMonsters(dt) {
  const p = game.player;
  const players = huntablePlayers();
  for (const m of game.monsters) {
    if (m.dead) {
      if (m.respawn && game.time >= m.respawnAt) {
        // Besiegte Monster bleiben tot, solange ein Spieler an ihrem Platz ist; erst danach kommen sie wieder
        if (!m.isStone && playerNearSpot(m.homeX, m.homeY, 420)) m.respawnAt = game.time + 5;
        else reviveMonster(m);
      }
      continue;
    }
    if (m.hitFlash > 0) m.hitFlash -= dt;
    // nächster Spieler
    let distP = Infinity;
    let near = p;
    for (const pl of players) {
      const d = dist(m, pl);
      if (d < distP) { distP = d; near = pl; }
    }
    if (distP > 1400 && m.state === 'idle') continue;

    tickDots(m, dt);
    if (m.dead || m.isStone) continue;

    if (m.kx || m.ky) {
      moveEntity(m, m.kx * dt, m.ky * dt, true);
      m.kx *= Math.pow(0.002, dt);
      m.ky *= Math.pow(0.002, dt);
      if (Math.abs(m.kx) + Math.abs(m.ky) < 5) m.kx = m.ky = 0;
    }
    if (m.attackAnim > 0) m.attackAnim -= dt;
    if (m.stun > 0 && !m.type.boss) { m.stun -= dt; m.moving = false; continue; }
    if (m.type.boss) {
      m.stun = 0;
      if (m.type.raid ? updateRaidBoss(m, dt) : updateBoss(m, dt)) continue;
    }
    m.cd -= dt;
    const slowMul = m.slow && m.slow.until > game.time ? m.slow.mul : 1;
    const speed = m.type.speed * slowMul;
    m.moving = false;

    if (m.state === 'idle') {
      // Monster, die 10 oder mehr Stufen unter dem Spieler sind, greifen nicht mehr von selbst an
      if (m.type.aggressive && !near.dead && distP < AGGRO_RANGE && !playerHidden(near) && (near.level || 1) - m.level < AGGRO_LEVEL_GAP) {
        aggro(m, near);
      } else {
        if (game.time >= m.wanderAt) {
          m.wx = m.homeX + (Math.random() - 0.5) * 120;
          m.wy = m.homeY + (Math.random() - 0.5) * 120;
          m.wanderAt = game.time + 3 + Math.random() * 4;
        }
        if (Math.hypot(m.wx - m.x, m.wy - m.y) > 4) {
          m.moving = moveToward(m, m.wx, m.wy, speed * 0.35 * dt, true);
          if (!m.moving) { m.wx = m.x; m.wy = m.y; }
        }
      }
    }

    if (m.state === 'chase') {
      const t = m.target;
      const leash = m.respawn ? LEASH : LEASH * 2;
      const lost = !t || t.dead || t.hp <= 0 || t.gone
        || (isPlayerLike(t) && playerHidden(t))
        || (!isPlayerLike(t) && !game.allies.includes(t))
        || Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash;
      if (lost) {
        m.state = 'return';
        m.target = null;
      } else {
        const d = dist(m, t);
        const reach = m.type.range + t.r;
        if (d > reach * 0.85) m.moving = moveToward(m, t.x, t.y, speed * dt, true);
        else if (Math.abs(t.x - m.x) > 1) m.facing = t.x > m.x ? 1 : -1;
        if (d <= reach && m.cd <= 0) {
          m.cd = m.type.cooldown;
          monsterAttack(m, t);
        }
      }
    }

    if (m.state === 'return') {
      m.moving = moveToward(m, m.homeX, m.homeY, speed * 1.4 * dt, true);
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.3 * dt);
      if (Math.hypot(m.homeX - m.x, m.homeY - m.y) < 8 || !m.moving) {
        m.state = 'idle';
        m.hp = m.maxHp;
        m.wx = m.x;
        m.wy = m.y;
      }
    }
  }

  // Monster drängen sich nicht auf einen Punkt
  const active = game.monsters.filter((m) => !m.dead && !m.isStone && m.state === 'chase');
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = (a.r + b.r) * 0.9;
      if (d < min) {
        const push = (min - d) / 2;
        moveEntity(a, -dx / d * push, -dy / d * push, true);
        moveEntity(b, dx / d * push, dy / d * push, true);
      }
    }
  }

  // Monster aus Steinwellen verschwinden nach dem Tod endgültig
  game.monsters = game.monsters.filter((m) => !(m.dead && !m.respawn));
}

// --- Skelette des Nekromanten ------------------------------------------------------

function damageAlly(a, amount) {
  a.hp -= amount;
  addText(a.x, a.y - 22, '-' + amount, 'hurt');
}

function updateAllies(dt) {
  const p = game.player;
  for (const a of game.allies) {
    if (a.swing > 0) a.swing -= dt;
    a.cd -= dt;
    if (!a.target || a.target.dead || dist(a.target, p) > 380) {
      a.target = aliveEnemies()
        .filter((m) => dist(m, p) < 260)
        .sort((x, y) => (y.target === p) - (x.target === p) || dist(x, a) - dist(y, a))[0] || null;
    }
    if (a.target) {
      const t = a.target;
      const d = dist(a, t);
      a.moving = false;
      if (d > t.r + a.r + 10) a.moving = moveToward(a, t.x, t.y, 150 * dt, false);
      else if (a.cd <= 0) {
        a.cd = 1;
        a.swing = 0.25;
        hitMonster(t, 1, { atk: a.atk, ally: true, source: t.isStone ? p : a });
      }
    } else {
      a.moving = dist(a, p) > 60 && moveToward(a, p.x, p.y, 170 * dt, false);
    }
  }
  const before = game.allies.length;
  game.allies = game.allies.filter((a) => a.hp > 0 && a.until > game.time);
  if (game.allies.length < before) {
    for (const m of game.monsters) {
      if (m.target && m.target !== p && !game.allies.includes(m.target)) m.target = p;
    }
  }
}
