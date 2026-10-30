// Monster: Erscheinen, Verhalten (KI), Seelensteine und Skelett-Diener.

const LEASH = 820;        // so weit verfolgen Monster dich von ihrem Platz weg (seit 10.1 fast doppelt so weit)
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

// Anteil der Gruppen aus den Zonendaten (seit 6.8 wieder mehr: weniger Bäume, mehr Tierarten)
const MOB_DENSITY = 0.95;
// Die Maps sind seit Version 4.5 deutlich größer: mehr Gruppen und Steine, damit sie nicht leer wirken
const WORLD_SCALE_MOBS = 2;
const WORLD_SCALE_STONES = 2.6;

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
// Seit 6.6: Sprung auf einen Spieler, Sturmangriff quer durch die Halle, alle paar Sekunden kleine Helfer
// (mit Beute), unter 20 % Raserei. Insgesamt schneller und mit doppeltem Leben.
const RAID_MOVES = ['slam', 'meteor', 'charge', 'buster', 'leap', 'line', 'nova', 'meteor', 'leap'];
const RAID_MUL = { slam: 3, meteor: 2.6, line: 3.2, buster: 6, nova: 3.4, leap: 3.6, charge: 3.4 };
const RAID_ADD_EVERY = 20;

// Spieler im Kampf mit dem Endboss: nur wer in seiner Halle ist (nicht Mitspieler irgendwo anders auf der Welt
// und nie jemand in einer Stadt) – sonst fielen Meteore auf Spieler, die gerade ganz woanders stehen
const RAID_REACH = 1100;
function raidPlayers(m) {
  const list = [];
  const near = (pl) => !pl.dead && !inVillage(pl.x, pl.y) && (!m || Math.hypot(pl.x - m.homeX, pl.y - m.homeY) < RAID_REACH);
  const p = game.player;
  if (p && near(p)) list.push(p);
  if (net.mode === 'host') for (const rp of net.players.values()) if (near(rp)) list.push(rp);
  return list;
}

function updateRaidBoss(m, dt) {
  const b = m.type.boss;
  if (!m.raid) m.raid = { next: 3, step: 0, phase: 0, addAt: game.time + 12 };
  const R = m.raid;
  if (m.state !== 'chase') {
    // ohne Kampf heilt der Boss vollständig und beginnt von vorn
    if (m.hp < m.maxHp && !m.cast) { m.hp = m.maxHp; R.phase = 0; R.step = 0; }
    return false;
  }
  // niemand in der Halle: keine Angriffe (der Boss kehrt dann wie jedes Monster um)
  if (!m.dash && !m.cast && !raidPlayers(m).length) return false;
  // Sturm- und Sprungbewegung des Bosses
  if (m.dash) {
    const d = m.dash;
    const k = Math.min(1, (game.time - d.t0) / d.dur);
    m.x = d.x0 + (d.x1 - d.x0) * k;
    m.y = d.y0 + (d.y1 - d.y0) * k;
    m.moving = true;
    if (Math.random() < 0.6) particles(m.x, feetY(m), { count: 4, color: [m.type.boss.color, '#5a4a3a'], speed: [40, 120], life: [0.3, 0.6], size: [3, 6], drag: 3, glow: false });
    if (k >= 1) m.dash = null;
    return true;
  }
  if (m.cast) {
    m.moving = false;
    if (game.time < m.cast.at) return true;
    const c = m.cast;
    m.cast = null;
    // Sprung und Sturmangriff: der Boss landet am Ziel bzw. rast durch die Linie
    if (c.kind === 'leap' || c.kind === 'charge') {
      const end = c.circles[c.circles.length - 1];
      m.dash = { x0: m.x, y0: m.y, x1: end.x, y1: end.y - m.r * 0.8, t0: game.time, dur: c.kind === 'leap' ? 0.3 : 0.45 };
      later(m.dash.dur, () => raidResolve(m, c.kind, c.circles, c.inner));
      return true;
    }
    raidResolve(m, c.kind, c.circles, c.inner);
    return true;
  }
  // regelmäßig kleine Helfer, in der Raserei öfter
  if (game.time >= R.addAt) {
    R.addAt = game.time + RAID_ADD_EVERY * (R.phase >= 2 ? 0.6 : 1);
    raidMinions(m, 2 + R.phase);
  }
  const hpk = m.hp / m.maxHp;
  const phase = hpk < 0.2 ? 3 : hpk < 0.35 ? 2 : hpk < 0.7 ? 1 : 0;
  if (phase > R.phase) {
    R.phase = phase;
    raidRoar(m, phase);
    return true;
  }
  R.next -= dt * (1 + R.phase * 0.35);
  if (R.next > 0) return false;
  R.next = Math.max(2.4, 5 - R.phase * 0.9);
  const kind = RAID_MOVES[R.step++ % RAID_MOVES.length];
  const tgt = m.target && !m.target.dead ? m.target : raidPlayers(m)[0] || m;
  const fy = (e) => feetY(e);
  let circles = [];
  let inner = 0;
  let delay = 1.7;
  if (kind === 'slam') circles = [{ x: m.x, y: fy(m), r: b.slam }];
  else if (kind === 'meteor') {
    // ein Meteor auf jeden Spieler, dazu ein paar zufällige
    for (const pl of raidPlayers(m)) circles.push({ x: pl.x, y: fy(pl), r: 95 });
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
  } else if (kind === 'leap') {
    // springt auf einen zufälligen Spieler (nicht immer den Tank)
    const list = raidPlayers(m);
    const v = list[randInt(0, list.length - 1)] || tgt;
    circles = [{ x: v.x, y: fy(v), r: 130 }];
    delay = 1.4;
  } else if (kind === 'charge') {
    // Sturmangriff: rast in gerader Linie durch die Halle, auf einen Spieler zu und darüber hinaus
    const list = raidPlayers(m);
    const v = list[randInt(0, list.length - 1)] || tgt;
    const a = Math.atan2(v.y - m.y, v.x - m.x);
    const len = Math.min(600, Math.hypot(v.x - m.x, v.y - m.y) + 160);
    for (let s2 = 60; s2 <= len; s2 += 60) {
      const x = m.x + Math.cos(a) * s2;
      const y = fy(m) + Math.sin(a) * s2;
      if (!canStand(x, y - m.r * 0.8, 10, true)) break;
      circles.push({ x, y, r: 70 });
    }
    if (!circles.length) circles.push({ x: m.x, y: fy(m), r: 90 });
    delay = 1.3;
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
  if (kind === 'leap') for (const c of circles) addEffect({ type: 'ultmark', x: c.x, y: c.y, dur: delay, color: m.type.boss.color });
  if (kind === 'charge') addEffect({ type: 'tornado', follow: m, ox: 0, oy: 0, r: 60, dur: delay, color: m.type.boss.color });
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

// Kleine Helfer: wenig Leben, schnell, lassen mit etwas Glück Tränke, Splitter oder Verstärkungen fallen
function raidMinions(m, n) {
  const b = m.type.boss;
  for (let k = 0; k < n; k++) {
    const pos = spotNear(m, 260);
    const add = createMonster(b.summon, pos.x, pos.y, { respawn: false, zone: m.zone, level: m.level - 6 });
    add.raidAdd = true;
    add.hp = add.maxHp = Math.round(add.maxHp * 0.6);
    add.homeX = m.homeX;
    add.homeY = m.homeY;
    add.state = 'chase';
    const list = raidPlayers(m);
    add.target = list[randInt(0, list.length - 1)] || game.player;
    game.monsters.push(add);
    addEffect({ type: 'pillar', x: pos.x, y: pos.y + 9, dur: 0.7, color: b.color });
    addEffect({ type: 'ring', x: pos.x, y: pos.y + 9, r: 50, dur: 0.5, color: b.color, width: 6, grow: true });
  }
}

// Phasenwechsel: Wutschrei mit Druckwelle und Helfer
function raidRoarFx(m, phase) {
  const b = m.type.boss;
  ui.banner(m.name, phase === 3 ? 'gerät in Raserei!' : phase === 2 ? 'rast vor Wut!' : 'ruft seine Brut!');
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
  m.windup = 0;
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
  monsterStrikeFx(m, target);
  if (target.remote) {
    // Ein Mitspieler wird getroffen: den Schaden rechnet sein Gerät mit seiner Rüstung aus
    netSendTo(target.peerId, { t: 'mhit', id: m.id, atk: m.atk, lvl: m.level, mul: levelBonus(m.level, target.level) });
  } else if (target === p) {
    damagePlayer(calcDamage(m.atk, levelBonus(m.level, p.level), game.stats.def, 0.03, m.level).amount, m);
  } else {
    damageAlly(target, calcDamage(m.atk, 1, target.def, 0, m.level).amount);
  }
}

// Treffer-Effekt passend zur Angriffsart: Biss, Prankenhieb, Rammstoß, Stampfer, Stich, Hieb.
// target null: der Schlag geht ins Leere (Ziel ausgewichen)
const STRIKE_COLORS = { bite: '#ff5a4a', fang: '#b6ff6a', snap: '#ffd36a', maul: '#ff7a3a', pounce: '#ffb04a', claw: '#ff4a6a', gore: '#ffcf8a', ram: '#ffe0a0', charge: '#ffcf8a', slam: '#ffd08a', sting: '#9be07a', haunt: '#c8a8ff', swing: '#ff8a6a', thrust: '#7ad8c8' };
function monsterStrikeFx(m, target) {
  const st = attackStyle(m.typeId);
  if (m.type.ranged && st !== 'breath') return;
  const color = STRIKE_COLORS[st] || '#ff8a6a';
  const dir = target ? Math.atan2(target.y - m.y, target.x - m.x) : (m.facing > 0 ? 0 : Math.PI);
  const reach = m.type.range * 0.8;
  const hx = target ? target.x : m.x + Math.cos(dir) * reach;
  const hy = target ? target.y : m.y + Math.sin(dir) * reach;
  const bc = target ? bodyCenter(target) : { x: hx, y: hy - 14 };
  const big = (m.type.size || 14) >= 19 || m.type.boss;
  if (st === 'bite' || st === 'fang' || st === 'snap') addEffect({ type: 'bite3', x: bc.x, y: bc.y, dur: 0.3, color, size: big ? 1.4 : 1 });
  else if (st === 'maul' || st === 'pounce' || st === 'claw') addEffect({ type: 'claw3', x: bc.x, y: bc.y, dur: 0.3, color, flip: m.facing < 0, size: big ? 1.4 : 1 });
  else if (st === 'gore' || st === 'ram' || st === 'charge') {
    addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -1.2, len: 34, w: 7, dur: 0.24, color });
    addEffect({ type: 'smoke3', x: m.x + Math.cos(dir) * 14, y: m.y + Math.sin(dir) * 14, dur: 0.7, color: '#8a7a64', count: 6, size: 0.7 });
  } else if (st === 'slam') {
    const sx = m.x + Math.cos(dir) * reach * 0.8;
    const sy = m.y + Math.sin(dir) * reach * 0.8;
    addEffect({ type: 'ring', x: sx, y: sy, r: big ? 56 : 42, dur: 0.45, color, width: 6, grow: true });
    addEffect({ type: 'shards3', x: sx, y: sy, r: big ? 40 : 30, dur: 0.6, color: '#8a7e6e', count: 7, size: 0.7 });
    if (target === game.player) shakeScreen(4);
  } else if (st === 'sting') {
    addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -1.45, len: 26, w: 4, dur: 0.22, color });
    addEffect({ type: 'sparks3', x: bc.x, y: bc.y, dur: 0.5, color, count: 10 });
  } else if (st === 'haunt') addEffect({ type: 'smoke3', x: hx, y: hy, dur: 0.6, color, count: 6, size: 0.6 });
  else if (st === 'breath') addEffect({ type: 'sparks3', x: m.x + Math.cos(dir) * 20, y: m.y + Math.sin(dir) * 20, dur: 0.5, color: '#ff9a4a', count: 12 });
  else addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: m.facing > 0 ? 0.9 : -0.9 + Math.PI, len: 32, w: 6, dur: 0.24, color });
  if (target && st !== 'breath') addEffect({ type: 'impact', x: bc.x, y: bc.y, dur: 0.2, color });
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

// --- Ansturm in Dungeons (seit 7.7) --------------------------------------------------------------
// Wer wegläuft, wird eingeholt: kurz ducken (Warnring), dann ein schneller Sprint bis zum Ziel mit Schlag.
const DUNGEON_CHASE = 0.95; // Verfolgung mit 95 % des Spielertempos (oder schneller, wenn das Monster schneller ist)
const MONSTER_SPEED_MUL = 0.92; // seit 8.5: Monster etwas langsamer, weil auch das Grundtempo der Klassen sank
const RUSH_RANGE = 340;     // ab dieser Entfernung kein Ansturm
const RUSH_SPEED = 820;
const LUNGE = 60;         // so weit setzt ein Dungeon-Monster mit dem Schlag nach
function startRush(m) {
  m.rush = { wind: 0.32, left: 0.7 };
  m.rushAt = game.time + 4.5 + Math.random() * 2.5;
  m.moving = false;
  addEffect({ type: 'ring', x: m.x, y: feetY(m), r: m.r * 1.6, dur: 0.32, color: '#ff8a3a', width: 4, grow: false });
  particles(m.x, feetY(m), { count: 8, color: ['#c8b89a', '#8a7a62'], speed: [30, 90], life: [0.25, 0.45], size: [2, 3.5], drag: 4, glow: false });
}
function monsterRush(m, t, dt, reach) {
  const r = m.rush;
  if (Math.abs(t.x - m.x) > 1) m.facing = t.x > m.x ? 1 : -1;
  if (r.wind > 0) {
    r.wind -= dt;
    m.moving = false;
    return;
  }
  const dx = t.x - m.x;
  const dy = t.y - m.y;
  const d = Math.hypot(dx, dy) || 1;
  const step = Math.min(RUSH_SPEED * dt, Math.max(0, d - reach * 0.6));
  const ox = m.x;
  const oy = m.y;
  moveEntity(m, (dx / d) * step, (dy / d) * step, true);
  m.moving = true;
  r.left -= dt;
  if (Math.random() < 0.7) particles(m.x, feetY(m), { count: 2, color: ['#c8b89a', '#8a7a62'], speed: [20, 60], life: [0.2, 0.4], size: [2, 4], drag: 3, glow: false });
  const stuck = Math.hypot(m.x - ox, m.y - oy) < step * 0.3;
  if (d - step <= reach * 0.75 || r.left <= 0 || stuck) {
    m.rush = null;
    if (dist(m, t) <= reach * 1.3 + 10) {
      m.cd = m.type.cooldown;
      monsterAttack(m, t);
    }
  }
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
    if (m.stun > 0 && !m.type.boss) { m.stun -= dt; m.moving = false; m.windup = 0; m.rush = null; continue; }
    if (m.type.boss) {
      m.stun = 0;
      if (m.type.raid ? updateRaidBoss(m, dt) : updateBoss(m, dt)) continue;
    }
    m.cd -= dt;
    const slowMul = m.slow && m.slow.until > game.time ? m.slow.mul : 1;
    const speed = m.type.speed * slowMul * MONSTER_SPEED_MUL;
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
      const leash = (m.respawn ? LEASH : LEASH * 2) * (m.inDungeon ? 1.7 : 1);
      const lost = !t || t.dead || t.hp <= 0 || t.gone
        || (isPlayerLike(t) && playerHidden(t))
        || (!isPlayerLike(t) && !game.allies.includes(t))
        // wer gerade noch getroffen wurde (3 s), verfolgt weiter, auch über die Leine hinaus (bis 1,5-fach)
        || (Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash && (game.time - (m.struckAt || -9) > 3 || Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash * 1.5));
      if (lost) {
        m.state = 'return';
        m.target = null;
        m.windup = 0;
        m.rush = null;
      } else {
        const d = dist(m, t);
        const reach = m.type.range + t.r;
        // In Dungeons lassen sich Monster nicht weglocken: fast so schnell wie der Spieler und mit Ansturm
        const dun = m.inDungeon != null ? m.inDungeon : (m.inDungeon = !!zoneAt(m.homeX, m.homeY).dungeon);
        let chaseSpeed = speed;
        if (dun) {
          // Fußtempo: Reiten macht die Monster nicht schneller; Mitspieler senden ihr Fußtempo mit (fs)
          const ts = t === p ? game.stats.footSpeed : t.footSpeed || (CLASSES[t.classId] ? CLASSES[t.classId].base.speed : 160);
          chaseSpeed = Math.max(m.type.speed, ts * DUNGEON_CHASE) * slowMul;
          if (m.rush) { monsterRush(m, t, dt, reach); continue; }
          if (!m.type.ranged && !m.windup && d > reach * 1.7 && d < RUSH_RANGE && game.time >= (m.rushAt || 0)) {
            startRush(m);
            continue;
          }
        }
        if (m.windup > 0) {
          // Ausholen: stehen bleiben, zum Ziel drehen; erst danach trifft der Schlag.
          // Wer rechtzeitig aus der Reichweite läuft, weicht aus.
          if (Math.abs(t.x - m.x) > 1) m.facing = t.x > m.x ? 1 : -1;
          m.windup -= dt;
          if (m.windup <= 0) {
            m.windup = 0;
            if (m.type.ranged || d <= reach * 1.3 + 10) monsterAttack(m, t);
            else if (dun && d <= reach * 1.3 + 10 + LUNGE) {
              // im Dungeon: mit dem Schlag nachsetzen
              const k = Math.min(LUNGE, d - reach * 0.8) / d;
              moveEntity(m, (t.x - m.x) * k, (t.y - m.y) * k, true);
              if (dist(m, t) <= reach * 1.3 + 10) monsterAttack(m, t);
              else { m.attackAnim = 0.25; monsterStrikeFx(m, null); }
            } else { m.attackAnim = 0.25; monsterStrikeFx(m, null); }
          }
        } else {
          if (d > reach * 0.85) m.moving = moveToward(m, t.x, t.y, chaseSpeed * dt, true);
          else if (Math.abs(t.x - m.x) > 1) m.facing = t.x > m.x ? 1 : -1;
          if (d <= reach && m.cd <= 0) {
            m.cd = m.type.cooldown;
            m.windup = m.windupMax = windupTime(m.typeId);
          }
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

// --- Diener des Nekromanten (seit 8.5: drei Diener, ab E1 Knochenhunde) -------------------------------

// Diener bekommen Zahlen-IDs ab 1e6 (kollidieren nicht mit Monster-IDs in pr.hit), fremde Diener ab 2e6
let nextAllyId = 1e6;
const ALLY_RECALL = 500;   // weiter weg: der Diener steigt neben dem Spieler neu auf
const ALLY_KEEP = 380;     // ein Ziel bleibt, solange es so nah am Spieler ist
const ALLY_SEEK = 260;     // neue Ziele nur so nah am Spieler
const ALLY_BURST_R = 70;   // Seelenfeuer der Seelenhunde beim Tod oder Ablauf

// Fortschritt eines Ansprungs 0…1
const leapK = (a) => (a.leap ? Math.max(0, Math.min(1, (game.time - a.leap.start) / a.leap.dur)) : 0);

// Die Erde bricht auf: Rune, Riss, Knochenzacken und grüner Rauch, wo ein Diener aufsteigt (lokal und für Mitspieler)
function allyRiseFx(x, y, kind) {
  addEffect({ type: 'runes', x, y: y + 8, r: 22, dur: 0.9, color: '#a7e37f' });
  addEffect({ type: 'decal', kind: 'crack', x, y: y + 8, r: 20, dur: 2.2, color: '#1a2a14' });
  addEffect({ type: 'shards3', x, y: y + 8, r: 26, count: 5, color: '#e8e0c8', glow: false, size: 0.7, dur: 1 });
  addEffect({ type: 'smoke3', x, y: y + 8, count: 5, color: '#14281a', size: 0.7, dur: 1 });
  particles(x, y + 6, { count: 14, color: ['#ddd5bb', '#a7e37f'], angle: -Math.PI / 2, spread: 0.6, speed: [60, 140], life: [0.4, 0.7], size: [2, 3.5], shape: 'square', gravity: 200 });
  if (kind === 'hund') particles(x, y + 4, { count: 8, color: ['#7fe3a0', '#e0ffd0'], angle: -Math.PI / 2, spread: 0.5, speed: [50, 110], life: [0.5, 0.8], size: [2, 3] });
}

// Ein Diener zerfällt sichtbar zu Knochen und Rauch
function allyCrumble(a) {
  const fy = feetY(a);
  addEffect({ type: 'shards3', x: a.x, y: fy, r: 22, count: 6, color: '#e8e0c8', glow: false, size: 0.6, dur: 0.9 });
  addEffect({ type: 'smoke3', x: a.x, y: fy, count: 4, color: '#14281a', size: 0.6, dur: 0.9 });
  addEffect({ type: 'decal', kind: 'crack', x: a.x, y: fy, r: 14, dur: 1.5, color: '#1a2a14' });
  particles(a.x, fy - 12, { count: 10, color: ['#ddd5bb', '#8f8a78'], speed: [40, 110], life: [0.3, 0.6], size: [2, 3.5], shape: 'square', gravity: 260 });
}

// Monster, die einen verschwundenen Diener jagen, nehmen wieder den Spieler
function releaseAllyTargets() {
  const p = game.player;
  for (const m of game.monsters) {
    if (m.target && m.target.ally && !game.allies.includes(m.target)) m.target = p;
  }
}

// Werte eines Dieners aus seiner Stufe (sk.tiers); k = Platz (der erste wird beim Vollendet-Rang zum Alpha)
function allyTierStats(sk, lvl, k) {
  const s = game.stats;
  const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
  const T = sk.tiers[ti];
  const big = T.alpha && k === 0 ? T.alpha : 1;
  return {
    kind: T.kind, tier: ti, lvl, r: T.kind === 'hund' ? 12 : 10, maxHp: Math.round(s.maxHp * T.hp * buffScale(lvl) * big),
    atkMul: T.atk * big, def: Math.round(s.def * T.def), every: T.every, windupMax: T.windup, speed: T.speed,
    slow: T.slow || 0, burst: T.burst || 0, pounce: !!T.pounce, scale: T.scale * (big > 1 ? 1.35 : 1), alpha: big > 1,
    name: big > 1 ? 'Alpha' : T.name
  };
}

// Erwecken (Rangaufstieg) mit laufenden Dienern: an Ort und Stelle auf die neue Stufe umbauen
function convertAllies(sk, lvl) {
  if (!sk || sk.type !== 'summon' || !game.allies.length) return;
  game.allies.forEach((a, k) => {
    if (a.ghost) return;
    const share = a.maxHp ? Math.max(0, a.hp) / a.maxHp : 1;
    // Lebensanteil und Restzeit bleiben, der Rest kommt aus der neuen Stufe
    Object.assign(a, allyTierStats(sk, lvl, k), { born: game.time, windup: 0, attackAnim: 0, swing: 0, leap: null });
    a.hp = Math.max(1, Math.round(a.maxHp * share));
    addEffect({ type: 'column3', x: a.x, y: feetY(a), r: 24, hgt: 1.6, color: '#7fe3a0', core: '#e0ffd0', dur: 0.7 });
    addEffect({ type: 'shards3', x: a.x, y: feetY(a), r: 24, count: 6, color: '#e8e0c8', glow: false, size: 0.6, dur: 0.9 });
    allyRiseFx(a.x, a.y, a.kind);
  });
}

// Angriffswert eines Dieners, live zur Trefferzeit: Dunkle Macht, INT und Zauberschaden wirken sofort
function allyAtk(a) {
  const s = game.stats;
  return s.atk * a.atkMul * dmgScale(a.lvl) * (s.skillDmg || 1);
}

// Biss oder Hieb eines Dieners (kein Monsterschaden-Bonus, kein Lebensraub, 5 % Krit)
function allyStrike(a, t, mul) {
  a.attackAnim = 0.25;
  a.swing = 0.25;
  const bc = bodyCenter(t);
  if (a.kind === 'hund') addEffect({ type: 'bite3', x: bc.x, y: bc.y, dur: 0.28, color: '#a7e37f', size: a.alpha ? 1.3 : 0.9 });
  else addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: a.facing < 0 ? -0.75 : 0.75, len: 30, w: 5, dur: 0.22, color: a.ghost ? '#bff0ff' : '#cfd8b0' });
  hitMonster(t, mul, { atk: allyAtk(a), ally: true, source: t.isStone ? game.player : a, slow: a.slow ? { amount: a.slow, duration: 1.5 } : null });
}

function damageAlly(a, amount) {
  // beim Aufsteigen aus dem Boden unverwundbar
  if (game.time < a.born + a.rise) return;
  a.hp -= amount;
  addText(a.x, a.y - 22, '-' + amount, 'hurt');
}

// Ziel suchen ohne neue Listen: wer den Spieler oder einen Diener angreift zuerst, dann der nächste.
// Den Duell-Gegner nur im Netz (dort sieht er die Diener über die Liste al)
function allyScore(m, a, p, proxyOk) {
  if (m.dead || (m.duelProxy && !proxyOk) || dist(m, p) >= ALLY_SEEK) return Infinity;
  return dist(m, a) - (m.target && (m.target === p || m.target.ally) ? 1e5 : 0);
}
function allyPickTarget(a, p) {
  const proxyOk = net.mode === 'host' || net.mode === 'client';
  let best = null;
  let bestScore = Infinity;
  for (const m of game.monsters) {
    const sc = allyScore(m, a, p, proxyOk);
    if (sc < bestScore) {
      best = m;
      bestScore = sc;
    }
  }
  if (duelFighting() && !game.duel.proxy.dead && allyScore(game.duel.proxy, a, p, proxyOk) < bestScore) best = game.duel.proxy;
  return best;
}

function updateAllies(dt) {
  const p = game.player;
  const list = game.allies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    // Aufstieg: handelt noch nicht
    if (game.time < a.born + a.rise) continue;
    a.attackAnim -= dt;
    a.swing = Math.max(0, a.attackAnim);
    a.pounceCd -= dt;
    // Seelenernte: 8 s lang im 0,75-fachen Abstand
    a.cd -= dt * (a.frenzyUntil > game.time ? 1 / 0.75 : 1);
    // Ansprung: in einem flachen Bogen zum Ziel, bei der Landung sofort ein kräftiger Biss
    if (a.leap) {
      const L = a.leap;
      const k = leapK(a);
      a.x = L.fx + (L.tx - L.fx) * k;
      a.y = L.fy + (L.ty - L.fy) * k;
      a.moving = false;
      if (k >= 1) {
        a.leap = null;
        const t = a.target;
        if (t && !t.dead && dist(a, t) <= t.r + a.r + 24) allyStrike(a, t, 1.3);
        a.cd = a.every;
      }
      continue;
    }
    // zu weit weg (Teleport, Kartenwechsel): neben dem Spieler neu aus dem Boden steigen
    if (dist(a, p) > ALLY_RECALL) {
      const ang = i * 2.1 + 0.6;
      a.x = p.x + Math.cos(ang) * 36;
      a.y = p.y + Math.sin(ang) * 22;
      if (!canStand(a.x, a.y, 10, false)) {
        a.x = p.x;
        a.y = p.y;
      }
      a.target = null;
      a.windup = 0;
      a.moving = false;
      a.born = game.time;
      allyRiseFx(a.x, a.y, a.kind);
      continue;
    }
    let t = a.target;
    // vorbei: totes Ziel, zu weit weg oder Duell-Stellvertreter nach dem Duell
    if (t && (t.dead || dist(t, p) > ALLY_KEEP || (t.duelProxy && (!duelFighting() || t !== game.duel.proxy)))) {
      t = a.target = null;
      a.windup = 0;
    }
    // ohne Ziel nur alle 0,2 s neu suchen
    if (!t && game.time >= (a.seekAt || 0)) {
      t = a.target = allyPickTarget(a, p);
      a.seekAt = game.time + 0.2;
    }
    a.moving = false;
    if (t) {
      const d = dist(a, t);
      const reach = t.r + a.r + 10;
      a.facing = Math.sign(t.x - a.x) || a.facing;
      if (a.windup > 0) {
        // Ausholen: stehen bleiben, erst danach trifft der Hieb oder Biss
        a.windup -= dt;
        if (a.windup <= 0) {
          a.windup = 0;
          if (d <= reach * 1.3 + 10) allyStrike(a, t, 1);
          else a.attackAnim = a.swing = 0.25;
        }
      } else if (a.pounce && a.pounceCd <= 0 && d >= 60 && d <= 130) {
        // Ansprung bis kurz vor das Ziel
        const ux = (t.x - a.x) / d;
        const uy = (t.y - a.y) / d;
        const tx = t.x - ux * (t.r + a.r + 2);
        const ty = t.y - uy * (t.r + a.r + 2);
        a.pounceCd = 5;
        // nur mit freier Bahn (sonst spränge der Hund durch Wände und über Wasser)
        const len = d - (t.r + a.r + 2);
        if (canStand(tx, ty, 8, false) && clearLen(a.x, a.y, { x: ux, y: uy }, len, 8) >= len - 6) a.leap = { fx: a.x, fy: a.y, tx, ty, start: game.time, dur: 0.28 };
      } else if (d > reach) {
        a.moving = moveToward(a, t.x, t.y, a.speed * dt, false);
      } else if (a.cd <= 0) {
        a.windup = a.windupMax;
        a.cd = a.every;
      }
    } else {
      // folgen: jeder Diener hält seinen Platz neben dem Spieler (schnell genug für das Pferd)
      a.windup = 0;
      if (dist(a, p) > 60) {
        const ang = i * 2.1 + 0.6;
        const gx = p.x + Math.cos(ang) * 36;
        const gy = p.y + Math.sin(ang) * 22;
        a.moving = moveToward(a, gx, gy, Math.max(170, game.stats.speed * 1.1) * dt, false);
        a.facing = Math.sign(gx - a.x) || a.facing;
      }
    }
  }
  // Diener drängen sich nicht auf einen Punkt
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.leap || b.leap) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = (a.r + b.r) * 0.9;
      if (d < min) {
        const push = (min - d) / 2;
        moveEntity(a, -dx / d * push, -dy / d * push, false);
        moveEntity(b, dx / d * push, dy / d * push, false);
      }
    }
  }
  // Tote und abgelaufene Diener entfernen (ohne neue Liste); Seelenhunde zerplatzen in Seelenfeuer
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.hp > 0 && a.until > game.time) {
      list[n++] = a;
      continue;
    }
    if (a.burst) {
      const fy = feetY(a);
      addEffect({ type: 'ring', x: a.x, y: fy, r: ALLY_BURST_R, dur: 0.45, color: '#7fe3a0', width: 8, grow: true });
      addEffect({ type: 'smoke3', x: a.x, y: fy, count: 5, color: '#1e4a2a', size: 0.7, dur: 0.8 });
      particles(a.x, fy - 12, { count: 16, color: ['#7fe3a0', '#e0ffd0'], speed: [60, 160], life: [0.3, 0.6], size: [2, 3.5], drag: 2 });
      const atk = allyAtk(a);
      for (const m of enemiesInCircle(a.x, a.y, ALLY_BURST_R)) hitMonster(m, a.burst, { atk, ally: true, source: m.isStone ? p : a });
    }
    allyCrumble(a);
  }
  if (n < list.length) {
    list.length = n;
    releaseAllyTargets();
  }
}
