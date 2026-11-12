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
  const m = {
    id: nextMonsterId++, typeId, type: t, name: t.name, level,
    x, y, homeX: x, homeY: y, r: t.size,
    maxHp: st.maxHp, hp: st.maxHp, atk: st.atk, def: st.def, xp: st.xp, gold: st.gold,
    state: 'idle', target: null, cd: Math.random(), wanderAt: Math.random() * 4, wx: x, wy: y,
    facing: Math.random() < 0.5 ? -1 : 1, moving: false,
    stun: 0, kx: 0, ky: 0, hitFlash: 0, slow: null, vulnerable: null, poison: null, burn: null,
    respawn: opts.respawn !== false, groupId: opts.groupId || 0, zone: opts.zone, dead: false, respawnAt: 0
  };
  // seit 14.32: Endgame-Elite (Gegner in Dungeons und Instanzen ab Stufe 75, keine Bosse) – zäher, flankiert,
  // die Seherinnen heilen (ENDGAME weiter unten). Gilt auch beim Mitspieler (netBuildMonster baut mit derselben Zone).
  if (endgameEliteType(t, level, opts.zone)) {
    m.elite80 = true;
    m.maxHp = m.hp = Math.round(m.maxHp * ENDGAME.eliteHp);
    if (endgameHealerType(t)) m.healCd = 3 + Math.random() * 4;
    else if (!t.ranged) m.smashCd = 4 + Math.random() * 6;
  }
  return m;
}

function createStone(zone, level, from = 0, to = 1, at = null) {
  const spot = at || randomSpotInZone(zone, from, to);
  if (!spot) return null;
  const type = stoneType(level);
  const st = monsterStats(level, STONE.hpMul);
  return {
    id: nextMonsterId++, isStone: true, stoneType: type, name: type.name, level,
    x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, r: 18, ring: [from, to],
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
// 10.6: Maps 1,5-mal so groß (360 × 150), seit 10.7 nach oben und unten noch größer (360 × 220):
// entsprechend mehr Gruppen und Steine, damit es sich füllt
const WORLD_SCALE_MOBS = 4;
const WORLD_SCALE_STONES = 4.9;

// Füllt alle Jagdzonen mit Monstergruppen und Seelensteinen
function populateWorld() {
  game.monsters = [];
  let groupId = 1;
  for (const zone of ZONES) {
    if (!zone.groups) continue;
    // seit 14.70: Karten mit eigener Form und weniger begehbarem Land (Inseln, Lichtungen) bekommen etwas weniger
    // Gruppen, damit es nicht zu gedrängt wird (kartenformen.js, MAP_FORMS.mobScale)
    const fs = typeof mapFormMobScale === 'function' ? mapFormMobScale(zone.map) : 1;
    for (const [typeId, count, from, to] of zone.groups) {
      for (let g = Math.max(2, Math.round(count * MOB_DENSITY * WORLD_SCALE_MOBS * fs)); g > 0; g--) {
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
const RAID_RESPAWN = 600;  // seit 13.2 wie alle Bosse 10 Minuten (vorher 15)
function populateDungeons(groupId) {
  for (const dg of game.world.dungeons) {
    const zone = ZONES[RING_ZONES + DUNGEONS.indexOf(dg.def)];
    // Höllenthron (seit 13.0): eigene Bestückung in hoellenthron.js
    if (dg.def.instanz) {
      groupId = htPopulate(dg, zone, groupId);
      continue;
    }
    // Lv-60-Instanzen (seit 13.58): instanzen.js
    if (dg.def.inst60) {
      groupId = instPopulate(dg, zone, groupId);
      continue;
    }
    if (dg.def.raid) {
      // Endboss-Halle: nur der Boss in der Mitte
      const rb = dg.rooms[1];
      const boss = createMonster(dg.def.boss, (rb.cx + 0.5) * TILE, (rb.cy + 0.5) * TILE, { zone });
      boss.respawnDelay = RAID_RESPAWN;
      game.monsters.push(boss);
      continue;
    }
    // seit 13.7: jeder Kampfraum auf dem Weg bekommt eine oder (große Räume) zwei Gruppen, die Arten wechseln
    // sich ab und werden zum Boss hin gemischter; Schatzkammer und Schrein haben eine starke Wache aus beiden Arten
    const [a, b] = dg.def.mobs;
    const pack = (r, typeId, fx, n) => {
      const c = { x: (r.x + r.w * fx) * TILE, y: (r.y + r.h * 0.5) * TILE };
      for (let j = 0; j < n; j++) {
        const pos = spotNear(c, 50);
        const m = createMonster(typeId, pos.x, pos.y, { groupId, zone });
        m.respawnDelay = DUNGEON_RESPAWN;
        game.monsters.push(m);
      }
      groupId++;
    };
    const mid = dg.rooms.slice(1, -1);
    mid.forEach((r, n) => {
      const t = n / Math.max(1, mid.length - 1);
      const first = t < 0.34 ? a : t > 0.66 ? b : (n % 2 ? b : a);
      if (r.w * r.h >= 150) {
        pack(r, first, 0.3, 2);
        pack(r, first === a ? b : a, 0.7, 2);
      } else pack(r, first, 0.5, randInt(2, 3));
    });
    for (const r of dg.side || []) {
      pack(r, a, 0.35, 2);
      pack(r, b, 0.65, 2);
    }
    // Seelensteine an fester Stelle auf etwa einem und zwei Dritteln des Wegs, kommen erst nach 5–8 Minuten wieder
    dg.def.stones.forEach((level, k) => {
      const r = mid[Math.min(mid.length - 1, Math.round((k + 1) * mid.length / 3) - (k ? 0 : 1))] || dg.rooms[1];
      // seit 14.32 auf einer freien Kachel der Raumform (Höhlen und Rundsäle haben oben keine Ecke mehr)
      const ft = dungeonFreeTile(r, 0.5, Math.min(3, r.h * 0.25) / r.h, game.world.obj, game.world.ground);
      const stone = createStone(zone, level, 0, 1, { x: (ft.x + 0.5) * TILE, y: (ft.y + 0.5) * TILE });
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
// seit 11.0 rund 15 % stärker (dazu mehr Grundangriff, siehe monster.js); Vernichtung in endboss.js
// Tankschlag (buster) seit 13.31 ×5 statt ×7: er tötete ab Gorbag selbst einen vollen Tank
const RAID_MUL = { slam: 3.5, meteor: 3, line: 3.7, buster: 5, nova: 3.9, leap: 4.1, charge: 3.9 };
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
  // Abaddor (hoellenthron.js): Siegel der Instanz, zweite Form, Viertelschlag
  if (m.type.teufel && typeof abaddorTick === 'function' && abaddorTick(m, dt)) return true;
  if (m.state !== 'chase') {
    // ohne Kampf heilt der Boss vollständig und beginnt von vorn (seit 11.1 erst, wenn ihn 8 s niemand getroffen hat)
    if (m.hp < m.maxHp && !m.cast && game.time - (m.struckAt || -99) > 8) {
      m.hp = m.maxHp;
      R.phase = 0;
      R.step = 0;
      if (typeof raidReset === 'function') raidReset(m);
    }
    return false;
  }
  // niemand in der Halle: keine Angriffe (der Boss kehrt dann wie jedes Monster um)
  if (!m.dash && !m.cast && !raidPlayers(m).length) return false;
  if (typeof raidShieldTick === 'function') raidShieldTick(m, dt);
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
  // Kristall-Schild und Vernichtung (seit 11.0, endboss.js)
  if (typeof raidMechanics === 'function' && raidMechanics(m, dt)) return true;
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
  R.next -= dt * (1 + R.phase * 0.35) * (m.form2 ? 1.45 : 1);
  if (R.next > 0) return false;
  R.next = Math.max(2.4, 5 - R.phase * 0.9);
  const moves = (m.form2 && m.type.raid.moves2) || m.type.raid.moves || RAID_MOVES;
  const kind = moves[R.step++ % moves.length];
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
  // Instanzen (seit 13.58): eigene Angriffe und Aufladen im Thema (instanzen.js)
  if (typeof instTelegraph === 'function' && instTelegraph(m, kind, circles, inner, delay)) return;
  if (kind === 'quarter' || kind === 'qring' || kind === 'qcore') {
    htQuarterShow(m, kind, circles[0], inner, delay);
    return;
  }
  // seit 14.68: Aelvyr zeigt jeden Angriff mit eigener Pose und eigenen 3D-Effekten (aelvyr.js); in 3D stürzen
  // Kristalle statt der Meteore
  // seit 14.78 ebenso die Endbosse der Karten (bosse3d.js): eigene Posen, in 3D eigene Geschosse statt der Meteore
  const ael = (m.typeId === 'aelvyr' && typeof aelTelegraph === 'function' && aelTelegraph(m, kind, circles, inner, delay)) ||
    (typeof isBoss3 === 'function' && isBoss3(m.typeId) && bossTelegraph(m, kind, circles, inner, delay));
  if (kind === 'doom') {
    raidDoomShow(m, circles, delay);
    return;
  }
  const col = kind === 'buster' ? '#ff2a2a' : '#ff3a2a';
  for (const c of circles) addEffect({ type: 'warn', x: c.x, y: c.y, r: c.r, inner, dur: delay, color: col });
  if (kind === 'meteor' && !ael) for (const c of circles) later(Math.max(0, delay - 0.45), () => addEffect({ type: 'ultfall', kind: 'meteor', x: c.x, y: c.y, fall: 0.45, dur: 0.9, color: m.type.boss.color }));
  if (kind === 'nova') addEffect({ type: 'ultsigil', ground: true, x: m.x, y: feetY(m), r: inner, dur: delay, color: '#7aff8a' });
  if (kind === 'slam' || kind === 'nova') addEffect({ type: 'pillar', follow: m, dur: delay, color: m.type.boss.color });
  if (kind === 'leap') for (const c of circles) addEffect({ type: 'ultmark', x: c.x, y: c.y, dur: delay, color: m.type.boss.color });
  if (kind === 'charge') addEffect({ type: 'tornado', follow: m, ox: 0, oy: 0, r: 60, dur: delay, color: m.type.boss.color });
}

// Einschlag: Wirkung zeigen, eigener Spieler nimmt Schaden, wenn er in einem Kreis steht
function raidResolve(m, kind, circles, inner, atk = m.atk, lvl = m.level) {
  if (typeof instResolve === 'function' && instResolve(m, kind, circles, inner, atk, lvl)) return;
  if (kind === 'quarter' || kind === 'qring' || kind === 'qcore') {
    htQuarterResolve(m, kind, circles[0], inner, atk, lvl);
    return;
  }
  if (kind === 'doom') {
    raidDoomResolve(m, circles, atk, lvl);
    return;
  }
  const p = game.player;
  const b = m.type.boss;
  shakeScreen(kind === 'nova' ? 12 : 8);
  for (const c of circles) {
    addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.5, color: b.color, width: 12, grow: true });
    addEffect({ type: 'decal', kind: kind === 'meteor' ? 'scorch' : 'crack', x: c.x, y: c.y, r: c.r * 0.6, dur: 3, color: '#1a1210' });
    // seit 14.78 in 3D ohne den Blitz bei den Endbossen der Karten: ihre eigenen Geschosse schlagen ein (bosse3d.js)
    if ((kind === 'meteor' || kind === 'buster') && !(V3.on && typeof isBoss3 === 'function' && isBoss3(m.typeId))) addEffect({ type: 'bolt', x: c.x, y: c.y, dur: 0.35, color: b.color });
    particles(c.x, c.y - 6, { count: 26, color: [b.color, '#ffffff', '#5a4a3a'], speed: [120, 320], life: [0.3, 0.7], size: [2, 4.5], shape: 'ember', drag: 3 });
  }
  // seit 14.68 ohne Bildschirmblitz bei Aelvyr (Flügelstoß mit Staubwelle statt dessen)
  // seit 14.78 auch ohne Blitz bei den Endbossen der Karten (Druckwelle aus Brocken und Staub, bosse3d.js)
  if (kind === 'nova' && m.typeId !== 'aelvyr' && !(typeof isBoss3 === 'function' && isBoss3(m.typeId))) flashScreen(b.color, 0.35);
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
  // 9: Abaddor nimmt seine wahre Gestalt an (hoellenthron.js)
  if (phase === 9) {
    htTransformFx(m);
    return;
  }
  const b = m.type.boss;
  ui.banner(m.name, phase === 3 ? 'gerät in Raserei!' : phase === 2 ? 'rast vor Wut!' : 'ruft seine Brut!');
  shakeScreen(14);
  // seit 14.68: Aelvyr brüllt (Pose, Dampf und Staubwelle, aelvyr.js) – ohne Bildschirmblitz, Ring und Lichtsäule
  if (m.typeId === 'aelvyr' && typeof aelRoar === 'function') {
    aelRoar(m);
    return;
  }
  // seit 14.78 ebenso die Endbosse der Karten (Pose, Atem/Dampf, Brocken und Staub, bosse3d.js)
  if (typeof isBoss3 === 'function' && isBoss3(m.typeId)) {
    bossRoar(m);
    return;
  }
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
    const spot = randomSpotInZone(m.zone, m.ring[0], m.ring[1]);
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
  // Endbosse (seit 13.2): frischer Kampf ohne alte Phase, Schild oder zweite Form
  if (m.raid) {
    if (typeof raidReset === 'function') raidReset(m);
    m.raid = null;
  }
  m.form2 = false;
  m.state = 'idle';
  m.target = null;
  m.threat = null; // Bedrohung (seit 14.32)
  m.returnAt = null;
  m.nav = null; // Weg und Steckenbleiben vergessen (seit 13.63)
  m.stun = 0;
  m.kx = m.ky = 0;
  m.slow = m.vulnerable = m.poison = m.burn = m.bleed = m.toxin = null;
  m.tags = null; // seit 14.32: keine Beteiligung aus dem letzten Leben (netTag, netz.js)
}

// Ein angegriffenes Monster und seine Gruppe greifen den Angreifer an
function aggro(m, source) {
  if (m.isStone || m.dead) return;
  if (m.state !== 'chase' || !m.target) {
    m.state = 'chase';
    m.target = source;
  }
  if (!m.groupId) return;
  // seit 13.2: die ganze Gruppe kommt, auch wenn ein Tier gerade umherläuft oder heimkehrt
  // seit 14.38 nur die Monster desselben Gebiets (areaList): vorher ging jeder einzelne Treffer alle ~7.000 Monster
  // der Welt durch – ein Flächentreffer auf 80 Monster also über eine halbe Million Prüfungen in einem Bild
  for (const o of areaList(m)) {
    if (o !== m && !o.dead && o.groupId === m.groupId && (o.state !== 'chase' || !o.target) && dist(o, m) < 420) {
      o.state = 'chase';
      o.target = source;
    }
  }
}

function alertGroup(m, source) {
  if (!source || source.dead) return;
  for (const o of areaList(m)) {
    if (o === m || o.dead || o.isStone || o.groupId !== m.groupId || dist(o, m) > 420) continue;
    if (o.state === 'chase' && o.target && !o.target.dead) continue;
    o.state = 'chase';
    o.target = source;
    o.provokedAt = game.time;
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

// toxin: Gift aus der Ausrüstung (seit 14.15, applyToxin in kampf.js), grüne Zahlen
function tickDots(m, dt) {
  for (const key of ['poison', 'burn', 'bleed', 'toxin']) {
    const d = m[key];
    if (!d) continue;
    if (d.until <= game.time) { m[key] = null; continue; }
    d.tick += dt;
    if (d.tick >= 1) {
      d.tick -= 1;
      // seit 14.32: gutgeschrieben (Schadensanzeige) wird, wer den Schaden über Zeit gesetzt hat (d.by)
      damageMonster(m, Math.max(1, Math.round(d.dps)), false, m.lastAttacker && !m.lastAttacker.gone ? m.lastAttacker : game.player, key === 'toxin' ? 'toxin' : true,
        d.by ? (d.by.gone ? false : d.by) : undefined);
      if (m.dead) return;
    }
  }
}

function monsterAttack(m, target) {
  const p = game.player;
  m.attackAnim = 0.25;
  // seit 14.32: Endgame-Mechaniken (Flankieren der Elite, Zermürbung der Bosse), sonst 1 und 0
  const eg = endgameStrike(m, target);
  if (m.type.ranged) {
    game.projectiles.push({
      owner: 'monster', x: m.x, y: m.y, vx: 0, vy: 0, speed: 300, range: m.type.range + 80, traveled: 0,
      radius: 5, atk: Math.round(m.atk * eg.mul), source: m, color: m.type.shot || '#e8d6a0', hit: new Set(), trail: [],
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
    // seit 14.32: mul enthält Flankieren und Zermürbung, sh = weggenommene Verteidigung, zs = Zermürbungsstufe
    // (ältere Versionen kennen sh und zs nicht und rechnen nur mit mul)
    // bs: bedrängt (drei oder mehr Endgame-Elite am selben Ziel)
    netSendTo(target.peerId, { t: 'mhit', id: m.id, atk: m.atk, lvl: m.level, mul: levelBonus(m.level, target.level) * eg.mul, ...(eg.shred ? { sh: +eg.shred.toFixed(2), zs: eg.stacks } : {}), ...(eg.beset ? { bs: 1 } : {}) });
  } else if (target === p) {
    if (eg.stacks >= 2) addText(p.x, p.y - 46, `Zermürbung ×${eg.stacks}`, 'hurt');
    if (eg.beset) endgameBeset(p);
    damagePlayer(calcDamage(m.atk, levelBonus(m.level, p.level) * eg.mul, game.stats.def * (1 - eg.shred), 0.03, m.level).amount, m);
  } else if (target.remoteAlly) {
    // seit 14.32: Diener eines Mitspielers – sein Gerät zieht das Leben ab (Nachricht ahit, ältere Versionen
    // kennen sie nicht und ignorieren sie)
    if (target.owner && target.owner.peerId) netSendTo(target.owner.peerId, { t: 'ahit', id: m.id, s: target.slot, atk: m.atk, lvl: m.level });
  } else {
    damageAlly(target, calcDamage(m.atk, eg.mul, target.def * (1 - eg.shred), 0, m.level).amount);
  }
}

// --- Endgame-Mechaniken (seit 14.32) --------------------------------------------------------------------------
// Bis 14.31 ließen sich Elite-Gruppen und Bosse der Stufe-80-Inhalte (Kristallkaverne, Spiegelgruft, Thron der Leere)
// von einem einzelnen gut ausgerüsteten Spieler mühelos tanken (Messung: docs/auftrag-2026-11-10-dungeon.md). Statt
// riesiger Lebenspunkte gibt es nachvollziehbare Regeln, die eine Gruppe ausgleicht, ein Einzelner aber spürt:
//   Elite (Dungeon-/Instanzgegner ab Stufe 75, keine Bosse): mehr Leben (eliteHp); greifen mehrere dasselbe Ziel
//     an, trifft jede weitere Elite härter und durch die Deckung (Flankieren), ab drei Angreifern ist man bedrängt
//     (Regeneration halb so schnell) – in der Gruppe verteilen sie sich; Nahkämpfer holen alle 9–12 s zu einem
//     angekündigten Schmetterschlag aus (Kreis unter dem Ziel, 1,2 s): wer drinbleibt, verliert einen Anteil seines
//     Höchstlebens (Rüstung hilft nicht, „Erlittener Schaden“ schon) – ausweichen hilft immer; Seherinnen und
//     Spiegelseelen (Fernkämpfer in Menschen- oder Geistergestalt) heilen verletzte Verbündete mit sichtbarem
//     Zauber – Vorrangziel, Betäuben unterbricht.
//   Bosse und Wächter (Dungeon-Bosse und Instanzgegner mit Boss-Regeln ab Stufe 75, keine Endbosse der Maps):
//     Zermürbung – jeder Nahkampftreffer in Folge auf dasselbe Ziel nimmt ihm Verteidigung und trifft etwas härter
//     (bis 5 Stufen, verfliegt nach 5 s ohne Treffer oder beim Zielwechsel); Splitterschlag – alle 18–22 s ein
//     angekündigter Kristallkreis (3 s) unter dem Ziel: der Schaden wird auf alle Spieler im Kreis aufgeteilt
//     (Anteil am eigenen Höchstleben, mit „Erlittener Schaden“, ohne Ausweichen/Blocken); steht niemand darin,
//     zerspringt er und trifft alle in der Halle voll. Kein Einschlag ohne Warnung, kein sofortiger Tod bei vollem Leben.
const ENDGAME = {
  minLevel: 75,
  eliteHp: 2.2,
  flank: 0.15, flankDef: 0.1, flankMax: 3, flankR: 260, besetRegen: 0.5, besetTime: 2,
  sunderMax: 5, sunderDef: 0.12, sunderDmg: 0.05, sunderTime: 5,
  shareEvery: [18, 22], shareFirst: 12, shareR: 120, shareDelay: 3, sharePct: 0.7, shareReach: 760,
  smashEvery: [9, 12], smashCast: 1.2, smashR: 70, smashPct: 0.14,
  healEvery: 9, healCast: 1.4, healPct: 0.14, healBossPct: 0.03, healRange: 340, healBelow: 0.7
};
function endgameEliteType(t, level, zone) {
  return !!(t && t.dungeon && !t.boss && !t.raidBoss && level >= ENDGAME.minLevel && zone && zone.dungeon);
}
// Heilerinnen: Fernkämpfer in Menschen- oder Geistergestalt (Leerenseherin, Spiegelseele …)
const endgameHealerType = (t) => !!(t.ranged && (t.shape === 'humanoid' || t.shape === 'ghost'));
const isEndgameBoss = (m) => !!(m && m.type && m.type.boss && !m.type.raid && !m.type.raidBoss && m.level >= ENDGAME.minLevel && m.zone && m.zone.dungeon);

// Wirkung eines Treffers: mul (Schadensfaktor), shred (Anteil der Verteidigung, der nicht zählt), stacks (Zermürbung)
const _egNone = { mul: 1, shred: 0, stacks: 0, beset: false };
function endgameStrike(m, target) {
  if (!m.elite80 && !isEndgameBoss(m)) return _egNone;
  let mul = 1;
  let shred = 0;
  let stacks = 0;
  let beset = false;
  if (m.elite80) {
    let n = 0;
    for (const o of areaList(m)) {
      if (o === m || o.dead || !o.elite80 || o.target !== target || o.state !== 'chase') continue;
      if (Math.hypot(o.x - target.x, o.y - target.y) < ENDGAME.flankR) n++;
    }
    mul *= 1 + ENDGAME.flank * Math.min(ENDGAME.flankMax, n);
    shred = ENDGAME.flankDef * Math.min(ENDGAME.flankMax, n);
    beset = n >= 2;
  } else if (!m.type.ranged) {
    let S = m.sunder;
    if (!S || S.tgt !== target || game.time - S.at > ENDGAME.sunderTime) S = m.sunder = { tgt: target, n: 0, at: 0 };
    S.n = Math.min(ENDGAME.sunderMax, S.n + 1);
    S.at = game.time;
    stacks = S.n;
    // der erste Treffer zählt noch normal, ab dem zweiten wirkt die Zermürbung
    const k = stacks - 1;
    shred = ENDGAME.sunderDef * k;
    mul *= 1 + ENDGAME.sunderDmg * k;
  }
  return { mul, shred, stacks, beset };
}
// Schmetterschlag der Nahkampf-Elite: ausholen (steht still, Kreis unter dem Ziel), dann Einschlag; Betäubung bricht ab
function endgameSmashTick(m, dt) {
  const S = m.smash;
  if (S) {
    if (m.stun > 0) {
      m.smash = null;
      return false;
    }
    m.moving = false;
    if (game.time < S.at) return true;
    m.smash = null;
    m.attackAnim = 0.35;
    endgameShareResolve(m, S.c, ENDGAME.smashPct, true);
    return true;
  }
  if (m.state !== 'chase' || m.stun > 0) return false;
  m.smashCd -= dt;
  const t = m.target;
  if (m.smashCd > 0 || !t || t.dead || !isPlayerLike(t) || Math.hypot(t.x - m.x, t.y - m.y) > m.r + 90) return false;
  const [a, b] = ENDGAME.smashEvery;
  m.smashCd = a + Math.random() * (b - a);
  const c = { x: Math.round(t.x), y: Math.round(feetY(t)), r: ENDGAME.smashR };
  m.smash = { c, at: game.time + ENDGAME.smashCast };
  m.cast = null;
  if (net.mode === 'host') netBroadcast({ t: 'share', id: m.id, x: c.x, y: c.y, r: c.r, d: ENDGAME.smashCast, pct: ENDGAME.smashPct, z: 1 });
  endgameShareShow(m, c, ENDGAME.smashCast, true);
  return true;
}
// Bedrängt (eigener Spieler): Regeneration eine Weile halb so schnell, Hinweis höchstens alle 3 s
function endgameBeset(p) {
  if (!(p.besetUntil > game.time) && !(p.besetSaid > game.time)) {
    addText(p.x, p.y - 58, 'Bedrängt – Regeneration halbiert', 'hurt');
    p.besetSaid = game.time + 3;
  }
  p.besetUntil = game.time + ENDGAME.besetTime;
}

// Spieler in der Halle eines Bosses (eigener Spieler und bekannte Mitspieler; beim Host wie beim Mitspieler)
function endgamePlayersNear(m) {
  const list = [];
  const near = (q) => q && !q.dead && Math.hypot(q.x - m.x, q.y - m.y) < ENDGAME.shareReach;
  if (!WAECHTER && near(game.player)) list.push(game.player);
  if (net.players) for (const rp of net.players.values()) if (near(rp)) list.push(rp);
  return list;
}

// Je Bild für Endgame-Bosse (vor ihren eigenen Angriffen): Splitterschlag ankündigen und auslösen. Nur der Host
// (bzw. allein) entscheidet; Mitspieler bekommen 'share' und rechnen ihren Anteil selbst (endgameShareResolve).
function endgameBossTick(m, dt) {
  if (m.state !== 'chase') {
    m.shareAt = null;
    return;
  }
  if (m.shareAt == null) m.shareAt = game.time + ENDGAME.shareFirst;
  if (game.time < m.shareAt || m.dash) return;
  const tgt = m.target && !m.target.dead && isPlayerLike(m.target) ? m.target : null;
  if (!tgt) return;
  const [a, b] = ENDGAME.shareEvery;
  m.shareAt = game.time + a + Math.random() * (b - a);
  const c = { x: Math.round(tgt.x), y: Math.round(feetY(tgt)), r: ENDGAME.shareR };
  if (net.mode === 'host') netBroadcast({ t: 'share', id: m.id, x: c.x, y: c.y, r: c.r, d: ENDGAME.shareDelay, pct: ENDGAME.sharePct });
  endgameShareShow(m, c, ENDGAME.shareDelay);
  later(ENDGAME.shareDelay, () => endgameShareResolve(m, c, ENDGAME.sharePct));
}
// zone (Schmetterschlag der Elite): nur wer im Kreis steht, nimmt den vollen Anteil, nichts wird geteilt
function endgameShareShow(m, c, delay, zone) {
  const col = (m.type.boss && m.type.boss.color) || m.type.accent || '#cfe4ff';
  addEffect({ type: 'warn', x: c.x, y: c.y, r: c.r, dur: delay, color: zone ? '#ff3a2a' : col });
  if (zone) return;
  addEffect({ type: 'ultmark', x: c.x, y: c.y, dur: delay, color: col });
  ui.banner(m.name, 'Splitterschlag – stellt euch zusammen in den Kreis!');
}
function endgameShareResolve(m, c, pct, zone) {
  const col = (m.type.boss && m.type.boss.color) || m.type.accent || '#cfe4ff';
  addEffect({ type: 'ring', x: c.x, y: c.y, r: c.r, dur: 0.5, color: col, width: zone ? 9 : 14, grow: true });
  particles(c.x, c.y - 6, { count: zone ? 14 : 30, color: [col, '#ffffff'], speed: [120, 320], life: [0.3, 0.7], size: [2, 4.5], shape: 'ember', drag: 3 });
  shakeScreen(zone ? 4 : 9);
  const p = game.player;
  if (!p || p.dead || WAECHTER) return;
  const inside = (q) => Math.hypot(q.x - c.x, (feetY(q) - c.y) * 1.2) < c.r;
  if (zone) {
    if (inside(p)) damagePlayer(Math.round(game.stats.maxHp * pct), m, { dot: true });
    return;
  }
  const all = endgamePlayersNear(m);
  if (!all.includes(p)) return;
  const n = all.filter(inside).length;
  let share = 0;
  if (!n) share = pct;
  else if (inside(p)) share = pct / n;
  if (!share) return;
  addText(p.x, p.y - 46, n > 1 ? `Splitterschlag geteilt durch ${n}` : n ? 'Splitterschlag allein getragen' : 'Splitter zerspringen!', 'hurt');
  damagePlayer(Math.round(game.stats.maxHp * share), m, { dot: true });
}

// Je Bild für Endgame-Elite (vor der übrigen KI): Heilerinnen wirken ihre Heilung; true = dieses Bild nichts anderes
function endgameEliteTick(m, dt) {
  if (m.smashCd != null) return endgameSmashTick(m, dt);
  if (m.healCd == null) return false;
  const H = m.healCast;
  if (H) {
    // Betäubung unterbricht den Zauber
    if (m.stun > 0 || H.tgt.dead) {
      m.healCast = null;
      m.healCd = ENDGAME.healEvery * 0.5;
      if (m.stun > 0) addText(m.x, m.y - 40, 'Unterbrochen!', 'info');
      return false;
    }
    m.moving = false;
    if (game.time < H.at) return true;
    m.healCast = null;
    m.healCd = ENDGAME.healEvery;
    const t = H.tgt;
    // Bosse heilen sie nur wenig (Brut eines Bosses: erst die Heilerin, dann der Boss)
    const amount = Math.round(t.maxHp * (t.elite80 ? ENDGAME.healPct : ENDGAME.healBossPct));
    t.hp = Math.min(t.maxHp, t.hp + amount);
    addText(t.x, t.y - 40, '+' + amount, 'heal');
    const bc = bodyCenter(t);
    particles(bc.x, bc.y, { count: 18, color: [m.type.shot || '#c8b8ff', '#ffffff'], speed: [40, 120], life: [0.4, 0.8], size: [2, 3.5], drag: 2 });
    return true;
  }
  if (m.state !== 'chase' || m.stun > 0) return false;
  m.healCd -= dt;
  if (m.healCd > 0) return false;
  let best = null;
  let bk = ENDGAME.healBelow;
  // bleibt (14.38) bei allen Monstern: läuft je Heilerin höchstens einmal je Sekunde, nicht je Treffer
  for (const o of game.monsters) {
    if (o.dead || o.isStone || o === m || (!o.elite80 && !isEndgameBoss(o))) continue;
    if (Math.hypot(o.x - m.x, o.y - m.y) > ENDGAME.healRange) continue;
    const k = o.hp / o.maxHp;
    if (k < bk) { bk = k; best = o; }
  }
  if (!best) {
    m.healCd = 1;
    return false;
  }
  m.healCast = { tgt: best, at: game.time + ENDGAME.healCast };
  m.attackAnim = ENDGAME.healCast;
  addEffect({ type: 'beam', x: m.x, y: m.y - 14, follow2: best, dur: ENDGAME.healCast, color: m.type.shot || '#c8b8ff' });
  addText(m.x, m.y - 40, 'heilt …', 'info');
  return true;
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
// Neues Ziel für ein Monster, das seins verloren hat: wer es in den letzten 5 s getroffen hat, sonst der
// nächste sichtbare Spieler oder Diener in Reichweite (nur innerhalb seiner Leine)
// seit 14.32: zuerst, wer die meiste Bedrohung hat (auch Diener, auch die der Mitspieler beim Host), und neue Ziele
// nur mit freier Sicht (keine Aggro durch Wände)
function nextTarget(m, players, leash) {
  if (Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash) return null;
  const ok = (t) => t && !t.dead && !(t.hp <= 0) && !t.gone && !(isPlayerLike(t) && playerHidden(t)) && dist(m, t) < 500;
  const top = m.threat ? threatTop(m, null) : null;
  if (top) return top;
  const la = m.lastAttacker;
  if (game.time - (m.struckAt || -99) < 5 && ok(la) && (isPlayerLike(la) || allyPresent(la))) return la;
  let best = null;
  let bd = 400;
  const seen = (t) => navSight(m.x, m.y, t.x, t.y, 4);
  for (const t of players) if (ok(t) && dist(m, t) < bd && seen(t)) { bd = dist(m, t); best = t; }
  for (const a of game.allies) if (ok(a) && dist(m, a) < bd && seen(a)) { bd = dist(m, a); best = a; }
  if (net.mode === 'host') {
    for (const rp of net.players.values()) {
      if (!rp.allies || rp.gone) continue;
      for (const a of rp.allies) if (allyPresent(a) && ok(a) && dist(m, a) < bd && seen(a)) { bd = dist(m, a); best = a; }
    }
  }
  return best;
}

// --- Bedrohung (seit 14.32): Diener des Nekromanten als Tanks ----------------------------------------------------
// Jedes Monster merkt sich, wer ihm wie viel Schaden gemacht hat (m.threat: Ziel → Bedrohung, nur beim Host bzw.
// allein gerechnet). Diener erzeugen THREAT.ally-mal so viel Bedrohung je Schaden wie Spieler. 6, weil alle drei Diener
// zusammen je nach Stufe nur 10–40 % des Schadens machen (gemessen mit der Rotation aus tools/balance-sim.js, Stufe
// 30–80): mit 3 wechselten Monster erst nach ~10 s und selten auf sie, mit 6 nach 0,6–1 s. Bosse lassen sich davon
// nur halb so leicht beeindrucken (bossAlly). Alle THREAT.every s prüft ein jagendes Monster, ob ein anderes
// gültiges Ziel klar mehr Bedrohung hat (keep: 15 % mehr, damit es nicht hin und her springt); gültig heißt: lebt,
// ist noch da (Diener nicht abgelaufen), höchstens THREAT.range entfernt, Spieler nicht getarnt – und für einen
// Wechsel freie Sicht (nicht durch Wände). Die Bedrohung verfällt (decay je Sekunde), ungültige Einträge fallen weg.
// Spieler untereinander bleiben wie bisher (erster Angreifer behält das Monster): gewechselt wird nur, wenn ein Diener
// beteiligt ist. Kein Spott, kein Zwang: ein Diener hält ein Monster nur, solange er Schaden macht und lebt.
// PvP (Duell, Turnierarena) betrifft das nicht – dort gibt es keine Monster-Ziele.
const THREAT = { ally: 6, bossAlly: 0.5, keep: 1.15, every: 0.4, decay: 0.85, range: 500 };
// Diener noch da? Eigene: in game.allies; fremde (beim Host): in der Liste seines Herrn aus dem letzten Schnappschuss
function allyPresent(t) {
  if (!t) return false;
  if (t.remoteAlly) return !!(t.owner && !t.owner.gone && !t.owner.dead && t.owner.allies && t.owner.allies.includes(t) && !t.rising);
  return !!t.ally && game.allies.includes(t) && t.hp > 0;
}
const isAllyLike = (t) => !!(t && (t.ally || t.remoteAlly));
function threatValid(m, t) {
  if (!t || t.dead || t.gone || t.hp <= 0 || dist(m, t) > THREAT.range) return false;
  return isAllyLike(t) ? allyPresent(t) : isPlayerLike(t) && !playerHidden(t);
}
function addThreat(m, src, amount) {
  if (!src || m.isStone || !(amount > 0) || !(isAllyLike(src) || isPlayerLike(src))) return;
  const k = isAllyLike(src) ? THREAT.ally * (m.type && m.type.boss ? THREAT.bossAlly : 1) : 1;
  const T = m.threat || (m.threat = new Map());
  T.set(src, (T.get(src) || 0) + amount * k);
}
// Bedrohung verfallen lassen, Ungültige entfernen; Rückgabe: gültiges Ziel mit der meisten Bedrohung (oder null)
function threatTop(m, cur) {
  const T = m.threat;
  const now = game.time;
  const f = Math.pow(THREAT.decay, Math.max(0, Math.min(5, now - (m.threatT ?? now))));
  m.threatT = now;
  let best = null;
  let bv = 0;
  for (const [src, v0] of T) {
    const v = v0 * f;
    if (v < 1 || !threatValid(m, src)) { T.delete(src); continue; }
    T.set(src, v);
    if (v > bv && (src === cur || navSees(m, src.x, src.y) || dist(m, src) < 90)) { bv = v; best = src; }
  }
  if (!T.size) m.threat = null;
  return best;
}
// Ziel nach Bedrohung (im Kampf alle THREAT.every s): cur bleibt, außer ein Diener ist beteiligt und das andere Ziel
// hat mindestens 15 % mehr Bedrohung (oder cur ist kein gültiges Ziel mehr)
function threatTarget(m, cur) {
  const best = threatTop(m, cur);
  if (!best || best === cur || !m.threat) return cur;
  if (!isAllyLike(best) && !isAllyLike(cur)) return cur;
  const cv = cur && threatValid(m, cur) ? m.threat.get(cur) || 0 : -1;
  if (cv >= 0 && m.threat.get(best) < cv * THREAT.keep) return cur;
  return best;
}

function huntablePlayers() {
  // der Welt-Wächter (unsichtbarer Host auf dem Server) ist kein Ziel
  const list = WAECHTER ? [] : [game.player];
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
      m.cd = m.type.cooldown * (m.form2 ? 0.65 : 1);
      monsterAttack(m, t);
    }
  }
}

// --- Wegfindung (seit 13.63) -----------------------------------------------------------------------
// Verfolgende Monster liefen vorher geradlinig auf ihr Ziel zu und blieben an Mauern, Säulen, Wasser oder Wald
// hängen – in Dungeons ließen sie sich so aus der Ferne erledigen. Jetzt: freie Sicht (Linie so breit wie das
// Monster) → direkt hin; sonst A* auf dem Kachelraster in einem Fenster um Monster und Ziel, mit begrenzter
// Knotenzahl und höchstens NAV_PER_FRAME Suchen pro Bild (der Rest wartet ein Bild und läuft so lange geradeaus).
// Der Weg wird je Monster gemerkt und erst neu gesucht, wenn das Ziel weiterzieht oder das Monster festhängt.
// Wer trotzdem kaum vorankommt (Steine, Portale, Gedränge), sucht neu und weicht seitlich aus.
// Läuft nur, wo updateMonsters läuft: allein und beim Host (Mitspieler bekommen nur die Positionen).
const NAV_WIN = 112;         // Seitenlänge des Suchfensters in Kacheln
const NAV_NODES = 1600;      // höchstens so viele Knoten je Suche (sonst: Weg zum nächstbesten Punkt)
const NAV_PER_FRAME = 3;     // höchstens so viele Suchen pro Bild …
const NAV_FRAME_MS = 0.8;    // … und höchstens so viel Rechenzeit
const NAV = (() => {
  const n = NAV_WIN * NAV_WIN;
  return {
    left: 0, ms: 0, gen: 0, x0: 0, y0: 0, lo: 0, hi: 0, off: 0.5, vill: false, searches: 0,
    g: new Float32Array(n), par: new Int32Array(n), seen: new Uint32Array(n), done: new Uint32Array(n),
    base: new Uint8Array(n), baseGen: new Uint32Array(n), clr: new Uint8Array(n), clrGen: new Uint32Array(n),
    solid: new Uint32Array(n), heap: new Int32Array(NAV_NODES * 8 + 16), hf: new Float32Array(NAV_NODES * 8 + 16), hn: 0
  };
})();
const NAV_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Breite Sichtlinie: kann ein Monster mit Halbbreite rr von (x0, y0) geradeaus nach (x1, y1) laufen?
// Gleiche Prüfung wie canStand (vier Ecken gegen gesperrte Kacheln); die letzten Schritte am Ziel zählen nicht.
function navSight(x0, y0, x1, y1, rr) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const s = Math.min(12, Math.max(6, rr));
  const n = Math.floor(Math.max(0, d - rr - 8) / s);
  for (let i = 1; i <= n; i++) {
    const x = x0 + (dx * i * s) / d;
    const y = y0 + (dy * i * s) / d;
    const ax = Math.floor((x - rr) / TILE);
    const bx = Math.floor((x + rr) / TILE);
    const ay = Math.floor((y - rr) / TILE);
    const by = Math.floor((y + rr) / TILE);
    if (tileBlocked(ax, ay) || tileBlocked(bx, ay) || tileBlocked(ax, by) || tileBlocked(bx, by)) return false;
  }
  return true;
}

// Kachel im Suchfenster frei? (Wand, Wasser, feste Deko, Seelenstein/Portal, Dorf bzw. Lager)
function navBase(lx, ly) {
  if (lx < 0 || ly < 0 || lx >= NAV_WIN || ly >= NAV_WIN) return false;
  const li = ly * NAV_WIN + lx;
  if (NAV.baseGen[li] === NAV.gen) return NAV.base[li] === 1;
  const tx = NAV.x0 + lx;
  const ty = NAV.y0 + ly;
  let ok = NAV.solid[li] !== NAV.gen && !tileBlocked(tx, ty) && !SOLID_DECO_R[game.world.deco[ty * MAP_W + tx]];
  if (ok && NAV.vill && inVillage((tx + 0.5) * TILE, (ty + 0.5) * TILE)) ok = false;
  NAV.baseGen[li] = NAV.gen;
  NAV.base[li] = ok ? 1 : 2;
  return ok;
}
// Kann die Mitte des Monsters auf diesem Knoten stehen? Kleine Monster: Kachelmitte, eine freie Kachel. Größere
// brauchen die Kacheln ringsum, die ihre Ecken berühren (NAV.lo … NAV.hi) – bei Breiten bis zwei Kacheln liegen die
// Knoten dafür auf den Kachelecken (NAV.off 0), sonst passten sie nicht durch zwei Kacheln breite Lücken
function navCell(lx, ly) {
  const lo = NAV.lo;
  const hi = NAV.hi;
  if (!lo && !hi) return navBase(lx, ly);
  if (lx < 0 || ly < 0 || lx >= NAV_WIN || ly >= NAV_WIN) return false;
  const li = ly * NAV_WIN + lx;
  if (NAV.clrGen[li] === NAV.gen) return NAV.clr[li] === 1;
  let ok = true;
  for (let dy = lo; dy <= hi && ok; dy++) for (let dx = lo; dx <= hi; dx++) if (!navBase(lx + dx, ly + dy)) { ok = false; break; }
  NAV.clrGen[li] = NAV.gen;
  NAV.clr[li] = ok ? 1 : 2;
  return ok;
}
// Breite Linie innerhalb des Fensters (zum Glätten des Wegs, kennt auch Steine und Deko)
function navLine(x0, y0, x1, y1, rr) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const s = Math.min(12, Math.max(6, rr));
  const n = Math.ceil(d / s);
  const ox = NAV.x0;
  const oy = NAV.y0;
  for (let i = 1; i <= n; i++) {
    const x = x0 + (dx * i) / n;
    const y = y0 + (dy * i) / n;
    const ax = Math.floor((x - rr) / TILE) - ox;
    const bx = Math.floor((x + rr) / TILE) - ox;
    const ay = Math.floor((y - rr) / TILE) - oy;
    const by = Math.floor((y + rr) / TILE) - oy;
    if (!navBase(ax, ay) || !navBase(bx, ay) || !navBase(ax, by) || !navBase(bx, by)) return false;
  }
  return true;
}
function navPush(i, f) {
  const h = NAV.heap;
  const hf = NAV.hf;
  let k = NAV.hn++;
  while (k > 0) {
    const p = (k - 1) >> 1;
    if (hf[p] <= f) break;
    h[k] = h[p];
    hf[k] = hf[p];
    k = p;
  }
  h[k] = i;
  hf[k] = f;
}
function navPop() {
  const h = NAV.heap;
  const hf = NAV.hf;
  const top = h[0];
  const n = --NAV.hn;
  if (n > 0) {
    const i = h[n];
    const f = hf[n];
    let k = 0;
    for (;;) {
      let c = 2 * k + 1;
      if (c >= n) break;
      if (c + 1 < n && hf[c + 1] < hf[c]) c++;
      if (hf[c] >= f) break;
      h[k] = h[c];
      hf[k] = hf[c];
      k = c;
    }
    h[k] = i;
    hf[k] = f;
  }
  return top;
}
// A* von (sx, sy) nach (gx, gy) in Pixeln. Ergebnis: geglättete Wegpunkte [x, y, x, y, …] (ohne Start) und ob das
// Ziel erreicht wurde; null, wenn es nicht einmal ein Stück näher geht.
function navSearch(sx, sy, gx, gy, rr) {
  NAV.searches++;
  const W = NAV_WIN;
  const half = W >> 1;
  // Knoten: Kachelmitten (off 0,5) oder Kachelecken (off 0), je nach Breite des Monsters (siehe navCell)
  const big = rr >= 16;
  const off = (NAV.off = rr < 16 || (rr >= 32 && rr < 48) ? 0.5 : 0);
  NAV.lo = !big ? 0 : rr < 48 ? -1 : -2;
  NAV.hi = !big ? 0 : rr < 32 ? 0 : 1;
  const node = (v) => (off ? Math.floor(v / TILE) : Math.round(v / TILE));
  const stx = node(sx);
  const sty = node(sy);
  // Ziel zu weit weg: nur ein Stück in seine Richtung (das Fenster muss beide enthalten)
  let gtx = node(gx);
  let gty = node(gy);
  const lim = half - 3;
  const far = Math.max(Math.abs(gtx - stx), Math.abs(gty - sty));
  if (far > lim) {
    gtx = stx + Math.round(((gtx - stx) * lim) / far);
    gty = sty + Math.round(((gty - sty) * lim) / far);
  }
  NAV.gen++;
  const gen = NAV.gen;
  const x0 = (NAV.x0 = Math.floor((stx + gtx) / 2) - half);
  const y0 = (NAV.y0 = Math.floor((sty + gty) / 2) - half);
  // Dorf bzw. Lager: dort hinein dürfen Monster nicht (wie canStand); in Dungeons gibt es keins
  NAV.vill = !!mapOfTile(stx, sty);
  // Seelensteine und Portale im Fenster sperren ihre Kacheln
  const px0 = x0 * TILE;
  const py0 = y0 * TILE;
  const px1 = px0 + W * TILE;
  const py1 = py0 + W * TILE;
  for (const cell of solidObstacles().values()) {
    for (const o of cell) {
      const R = o.R + rr * 0.6;
      if (o.x < px0 - R || o.y < py0 - R || o.x > px1 + R || o.y > py1 + R) continue;
      for (let ty = Math.floor((o.y - R) / TILE); ty <= Math.floor((o.y + R) / TILE); ty++) {
        for (let tx = Math.floor((o.x - R) / TILE); tx <= Math.floor((o.x + R) / TILE); tx++) {
          const lx = tx - x0;
          const ly = ty - y0;
          if (lx < 0 || ly < 0 || lx >= W || ly >= W) continue;
          if (Math.hypot((tx + 0.5) * TILE - o.x, (ty + 0.5) * TILE - o.y) < R) NAV.solid[ly * W + lx] = gen;
        }
      }
    }
  }
  const sl = (sty - y0) * W + (stx - x0);
  const gl = (gty - y0) * W + (gtx - x0);
  // ein Ziel in einer gesperrten Kachel (Spieler am Stein, großes Monster) zählt trotzdem
  const goalOk = far <= lim && !tileBlocked(Math.floor(gx / TILE), Math.floor(gy / TILE));
  const g = NAV.g;
  const par = NAV.par;
  const seen = NAV.seen;
  const done = NAV.done;
  const gxl = gtx - x0;
  const gyl = gty - y0;
  const heur = (lx, ly) => {
    const a = Math.abs(lx - gxl);
    const b = Math.abs(ly - gyl);
    return (a > b ? a + 0.4142 * b : b + 0.4142 * a) * 1.15;
  };
  NAV.hn = 0;
  g[sl] = 0;
  par[sl] = -1;
  seen[sl] = gen;
  navPush(sl, heur(stx - x0, sty - y0));
  let best = sl;
  let bestH = heur(stx - x0, sty - y0);
  let found = false;
  let count = 0;
  while (NAV.hn > 0) {
    const cur = navPop();
    if (done[cur] === gen) continue;
    done[cur] = gen;
    if (cur === gl) { found = true; break; }
    if (++count > NAV_NODES) break;
    const cx = cur % W;
    const cy = (cur - cx) / W;
    const hc = heur(cx, cy);
    if (hc < bestH) { bestH = hc; best = cur; }
    const gc = g[cur];
    for (let k = 0; k < 8; k++) {
      const d = NAV_DIRS[k];
      const nx = cx + d[0];
      const ny = cy + d[1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= W) continue;
      const nl = ny * W + nx;
      if (done[nl] === gen) continue;
      if (!(nl === gl && goalOk) && !navCell(nx, ny)) continue;
      // diagonal nur, wenn beide Nachbarn frei sind (nicht über Ecken schneiden)
      if (k >= 4 && (!navCell(cx + d[0], cy) || !navCell(cx, cy + d[1]))) continue;
      const ng = gc + (k >= 4 ? 1.4142 : 1);
      if (seen[nl] === gen && ng >= g[nl]) continue;
      seen[nl] = gen;
      g[nl] = ng;
      par[nl] = cur;
      navPush(nl, ng + heur(nx, ny));
    }
  }
  const end = found ? gl : best;
  if (end === sl) return null;
  // Kacheln vom Ziel zurück zum Start
  const tiles = [];
  for (let c = end; c !== -1 && c !== sl; c = par[c]) tiles.push(c);
  tiles.reverse();
  // glätten: vom aktuellen Punkt aus jeweils zur fernsten Kachel, die man geradeaus erreicht
  const pts = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  const cxOf = (c) => (x0 + (c % W) + off) * TILE;
  const cyOf = (c) => (y0 + Math.floor(c / W) + off) * TILE;
  while (i < tiles.length) {
    let j = i;
    while (j + 1 < tiles.length && navLine(ax, ay, cxOf(tiles[j + 1]), cyOf(tiles[j + 1]), rr)) j++;
    ax = cxOf(tiles[j]);
    ay = cyOf(tiles[j]);
    pts.push(ax, ay);
    i = j + 1;
  }
  return { pts, found };
}

// Sieht das Monster sein Ziel (breite Linie)? Gemerkt und nur alle ~0,25 s neu geprüft.
function navSees(m, tx, ty) {
  const n = m.nav || (m.nav = navState(m));
  if (game.time >= n.seeAt || Math.abs(tx - n.sx) + Math.abs(ty - n.sy) > 48) {
    n.seeAt = game.time + 0.22 + Math.random() * 0.08;
    n.sx = tx;
    n.sy = ty;
    n.clear = navSight(m.x, m.y, tx, ty, m.r * 0.7);
  }
  return n.clear;
}
function navState(m) {
  return { clear: true, seeAt: 0, sx: 0, sy: 0, path: null, i: 0, gx: 0, gy: 0, at: -9, retry: 0, force: 0, fail: false,
    ex: 0, px: m.x, py: m.y, last: -9, stuck: 0, side: 0, sideUntil: 0, sideSign: Math.random() < 0.5 ? 1 : -1 };
}
// Schritt eines verfolgenden (oder heimkehrenden) Monsters Richtung (tx, ty) mit Tempo speed (px/s).
// Gibt wie moveToward zurück, ob es sich bewegt hat.
function navMove(m, tx, ty, speed, dt) {
  const n = m.nav || (m.nav = navState(m));
  const now = game.time;
  const step = speed * dt;
  const rr = m.r * 0.7;
  // Fortschritt messen: nach jeweils ~1,5 Monsterbreiten erwarteter Strecke nachsehen, wie weit es wirklich kam
  if (now - n.last > 0.2) { n.ex = 0; n.px = m.x; n.py = m.y; }
  n.last = now;
  n.ex += step;
  if (n.ex >= Math.max(40, rr * 3)) {
    const moved = Math.hypot(m.x - n.px, m.y - n.py);
    // (dicht am Ziel zählt es nicht: dort drängen sich ohnehin andere Monster)
    if (moved < n.ex * 0.3 && Math.hypot(tx - m.x, ty - m.y) > rr + 64) {
      // festgehangen: eine Weile dem Weg folgen statt geradeaus, neu suchen, ab dem zweiten Mal seitlich ausweichen
      n.stuck++;
      n.force = now + 3;
      n.path = null;
      n.retry = 0;
      if (n.stuck >= 2) {
        n.sideSign = -n.sideSign;
        n.side = Math.atan2(ty - m.y, tx - m.x) + n.sideSign * (Math.PI / 2 - 0.35);
        n.sideUntil = now + 0.3 + Math.random() * 0.3;
      }
    } else if (moved > n.ex * 0.6) n.stuck = 0;
    n.ex = 0;
    n.px = m.x;
    n.py = m.y;
  }
  // eingeklemmt (z. B. am Rand eines Beckens erschienen, eine Ecke steckt im Wasser): moveEntity ließe es keinen
  // Schritt mehr machen – dann ohne Kollision ein Stück Richtung Weg bzw. Ziel, bis es wieder frei steht
  if (n.stuck >= 2 && !canStand(m.x, m.y, rr, true)) {
    const wx = n.path && n.i < n.path.length ? n.path[n.i] : tx;
    const wy = n.path && n.i < n.path.length ? n.path[n.i + 1] : ty;
    const len = Math.hypot(wx - m.x, wy - m.y) || 1;
    const k = Math.min(step, len) / len;
    const nx = m.x + (wx - m.x) * k;
    const ny = m.y + (wy - m.y) * k;
    if (!tileBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
      if (Math.abs(wx - m.x) > 1) m.facing = wx > m.x ? 1 : -1;
      m.x = nx;
      m.y = ny;
      return true;
    }
  }
  if (now < n.sideUntil) {
    const ok = moveEntity(m, Math.cos(n.side) * step, Math.sin(n.side) * step, true);
    if (Math.abs(Math.cos(n.side)) > 0.2) m.facing = Math.cos(n.side) > 0 ? 1 : -1;
    if (ok) return true;
    n.sideUntil = 0;
  }
  // freie Sicht: geradeaus (wie früher)
  if (now >= n.force && navSees(m, tx, ty)) {
    n.path = null;
    n.fail = false;
    return moveToward(m, tx, ty, step, true);
  }
  // Weg suchen, wenn keiner da ist oder das Ziel weitergezogen ist (Budget pro Bild, sonst nächstes Bild)
  const gtx = Math.floor(tx / TILE);
  const gty = Math.floor(ty / TILE);
  const moved = n.path && Math.max(Math.abs(gtx - n.gx), Math.abs(gty - n.gy)) > 2 && now - n.at > 0.4;
  if ((!n.path || moved) && now >= n.retry && NAV.left > 0 && NAV.ms < NAV_FRAME_MS) {
    NAV.left--;
    const t0 = performance.now();
    const r = navSearch(m.x, m.y, tx, ty, rr);
    NAV.ms += performance.now() - t0;
    n.at = now;
    n.gx = gtx;
    n.gy = gty;
    n.i = 0;
    n.path = r ? r.pts : null;
    n.fail = !r;
    // kein (ganzer) Weg: nicht jedes Bild neu suchen
    if (!r || !r.found) n.retry = now + 1.2 + Math.random() * 0.8;
  }
  const p = n.path;
  if (p) {
    while (n.i < p.length && Math.hypot(p[n.i] - m.x, p[n.i + 1] - m.y) < Math.max(5, step)) n.i += 2;
    if (n.i < p.length) return moveToward(m, p[n.i], p[n.i + 1], step, true);
    // Ende des Wegs erreicht, Ziel noch nicht in Sicht: bald neu suchen
    n.path = null;
  }
  return moveToward(m, tx, ty, step, true);
}

// Bereich eines Punktes: Map-Nummer oder Dungeon (für das schnelle Überspringen ruhender Monster, seit 10.7)
function areaKey(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const wm = mapOfTile(tx, ty);
  return wm ? wm.id : tx >= WORLD_W && ty < DUNGEON_H ? 100 + dungeonIndexAt(tx, ty) : 0;
}
// Monster je Map/Dungeon (seit 13.60): die Welt hat über 6.000 Monster, gerechnet werden aber nur die Maps, in denen
// gerade jemand spielt. Vorher lief jedes Bild eine Schleife über alle – am Handy spürbar. Neu aufgebaut, wenn sich
// die Liste ändert (neue Nachtmonster, Instanzen …) und sonst alle 2 s. Monster wechseln nie die Map (nur über Tore).
// seit 14.38 dazu: Seelensteine (stones, für solidObstacles in welt.js), Seelenkristalle und Endbosse (crystals,
// raids, für raidScan in endboss.js) und Monster nach Nummer (byId, für Treffer der Mitspieler in netz.js) – diese
// Stellen gingen vorher je Bild bzw. je Treffer alle Monster der Welt durch
const MON_INDEX = { arr: null, len: -1, at: -9, map: new Map(), list: [], stones: [], crystals: [], raids: [], byId: new Map() };
function monsterIndex() {
  const ms = game.monsters;
  if (MON_INDEX.arr === ms && MON_INDEX.len === ms.length && game.time - MON_INDEX.at < 2 && game.time >= MON_INDEX.at) return MON_INDEX.map;
  const map = new Map();
  const stones = MON_INDEX.stones;
  const crystals = MON_INDEX.crystals;
  const raids = MON_INDEX.raids;
  const byId = MON_INDEX.byId;
  stones.length = 0;
  crystals.length = 0;
  raids.length = 0;
  byId.clear();
  for (const m of ms) {
    if (m.area == null) m.area = areaKey(m.homeX ?? m.x, m.homeY ?? m.y);
    let l = map.get(m.area);
    if (!l) map.set(m.area, (l = []));
    l.push(m);
    byId.set(m.id, m);
    if (m.isStone) stones.push(m);
    else if (m.type) {
      if (m.type.crystal) crystals.push(m);
      if (m.type.raid) raids.push(m);
    }
  }
  MON_INDEX.arr = ms;
  MON_INDEX.len = ms.length;
  MON_INDEX.at = game.time;
  MON_INDEX.map = map;
  return map;
}
// Alle Monster des Gebiets (Map oder Dungeon), zu dem m gehört – Gruppen, Elite und ihre Heilerinnen stehen immer im
// selben Gebiet (gleicher Startplatz bzw. derselbe Dungeon); seit 14.38 für Schleifen je Treffer statt aller Monster
function areaList(m) {
  const idx = monsterIndex();
  if (m.area == null) m.area = areaKey(m.homeX ?? m.x, m.homeY ?? m.y);
  return idx.get(m.area) || game.monsters;
}
// Monster nach Nummer (seit 14.38, über das Gebietsverzeichnis statt einer Suche durch alle)
function monsterById(id) {
  monsterIndex();
  return MON_INDEX.byId.get(id) || null;
}
// Monster der Map/des Dungeons, in dem man gerade steht (für Prüfungen, die nur die Nähe brauchen)
function areaMonsters() {
  const p = game.player;
  if (!p) return game.monsters;
  return monsterIndex().get(areaKey(p.x, p.y)) || [];
}
function updateMonsters(dt) {
  const p = game.player;
  const players = huntablePlayers();
  // Wegfindung (seit 13.63): Budget dieses Bildes
  NAV.left = NAV_PER_FRAME;
  NAV.ms = 0;
  // Maps und Dungeons, in denen gerade jemand ist: ruhende Monster anderswo brauchen keine Rechnung
  const busy = new Set(players.map((pl) => areaKey(pl.x, pl.y)));
  const idx = monsterIndex();
  const list = MON_INDEX.list;
  list.length = 0;
  for (const k of busy) {
    const l = idx.get(k);
    if (l) for (const m of l) list.push(m);
  }
  for (const m of list) {
    if (m.dead) {
      if (m.respawn && game.time >= m.respawnAt) {
        // Besiegte Monster bleiben tot, solange ein Spieler in Sichtweite ihres Platzes ist (seit 13.8 700 statt 420,
        // damit niemand sie vor seinen Augen wieder auftauchen sieht); erst danach kommen sie wieder.
        // Bosse (seit 13.2) kommen nach ihren 10 Minuten immer wieder, auch wenn jemand in der Halle wartet.
        const boss = m.type && (m.type.boss || m.type.raid);
        if (!m.isStone && !boss && playerNearSpot(m.homeX, m.homeY, 700)) m.respawnAt = game.time + 5;
        else reviveMonster(m);
      }
      continue;
    }
    // Seelensteine haben keinen Zustand (state) – seit 13.60 ruhen sie wie ruhende Monster; vorher liefen alle
    // ~400 Steine der ganzen Welt jedes Bild durch die volle Rechnung
    if ((m.state === 'idle' || m.isStone) && !m.poison && !m.burn && !m.bleed && !m.toxin) {
      if (m.area == null) m.area = areaKey(m.homeX ?? m.x, m.homeY ?? m.y);
      if (!busy.has(m.area)) {
        if (m.hitFlash > 0) m.hitFlash = 0;
        continue;
      }
    }
    if (m.hitFlash > 0) m.hitFlash -= dt;
    // nächster Spieler
    let distP = Infinity;
    let near = p;
    for (const pl of players) {
      const d = dist(m, pl);
      if (d < distP) { distP = d; near = pl; }
    }
    if (distP > 1400 && (m.state === 'idle' || (m.isStone && !m.poison && !m.burn && !m.bleed && !m.toxin))) continue;

    tickDots(m, dt);
    if (m.dead || m.isStone) continue;
    // Seelenkristalle der Endbosse stehen nur da
    if (m.type.crystal) {
      m.moving = false;
      continue;
    }

    if (m.kx || m.ky) {
      moveEntity(m, m.kx * dt, m.ky * dt, true);
      m.kx *= Math.pow(0.002, dt);
      m.ky *= Math.pow(0.002, dt);
      if (Math.abs(m.kx) + Math.abs(m.ky) < 5) m.kx = m.ky = 0;
    }
    if (m.attackAnim > 0) m.attackAnim -= dt;
    // seit 14.32: Endgame-Elite heilt (unterbrechbar), Endgame-Bosse kündigen den Splitterschlag an
    if (m.elite80 && endgameEliteTick(m, dt)) continue;
    if (m.stun > 0 && !m.type.boss) { m.stun -= dt; m.moving = false; m.windup = 0; m.rush = null; continue; }
    if (m.type.boss) {
      m.stun = 0;
      if (isEndgameBoss(m)) endgameBossTick(m, dt);
      // Wächter und Bosse der Instanzen (seit 13.58, instanzen.js)
      if (m.type.inst ? instBossTick(m, dt) : m.type.raid ? updateRaidBoss(m, dt) : updateBoss(m, dt)) continue;
    }
    // Frostpanzer (seit 13.52): wer den Magier trifft, schlägt eine Weile langsamer
    m.cd -= m.frostAtk && m.frostAtk.until > game.time ? dt * m.frostAtk.mul : dt;
    const slowMul = m.slow && m.slow.until > game.time ? m.slow.mul : 1;
    const speed = m.type.speed * slowMul * MONSTER_SPEED_MUL;
    m.moving = false;

    if (m.state === 'idle') {
      // Monster, die 10 oder mehr Stufen unter dem Spieler sind, greifen nicht mehr von selbst an
      // seit 14.32 nur mit freier Sicht: keine Aggro durch Wände
      if (m.type.aggressive && !near.dead && distP < AGGRO_RANGE && !playerHidden(near) && (near.level || 1) - m.level < AGGRO_LEVEL_GAP && navSight(m.x, m.y, near.x, near.y, 4)) {
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
      let t = m.target;
      m.returnAt = null;
      // seit 14.32: nach Bedrohung umschauen (Diener als Tanks)
      if (m.threat && game.time >= (m.threatAt || 0)) {
        m.threatAt = game.time + THREAT.every;
        const nt = threatTarget(m, t);
        if (nt && nt !== t) {
          t = m.target = nt;
          m.windup = 0;
          m.rush = null;
        }
      }
      const leash = (m.respawn ? LEASH : LEASH * 2) * (m.inDungeon ? 1.7 : 1);
      const lost = !t || t.dead || t.hp <= 0 || t.gone
        || (isPlayerLike(t) && playerHidden(t))
        || (!isPlayerLike(t) && !allyPresent(t))
        // wer gerade noch getroffen wurde (3 s), verfolgt weiter, auch über die Leine hinaus (bis 1,5-fach)
        || (Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash && (game.time - (m.struckAt || -9) > 3 || Math.hypot(m.x - m.homeX, m.y - m.homeY) > leash * 1.5));
      // Ziel weg (Diener verschwunden, Spieler tot oder getarnt), aber andere kämpfen noch in der Nähe:
      // zu ihnen wechseln statt umzukehren – sonst lief das Monster heim und heilte sich mitten im Kampf (seit 11.1)
      const next = lost ? nextTarget(m, players, leash) : null;
      if (next) {
        m.target = next;
        m.windup = 0;
        m.rush = null;
        continue;
      }
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
          // seit 13.63 nur bei freier Bahn – sonst rannte es in die Mauer
          if (!m.type.ranged && !m.windup && d > reach * 1.7 && d < RUSH_RANGE && game.time >= (m.rushAt || 0) && navSees(m, t.x, t.y)) {
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
          // seit 13.63 mit Wegfindung um Mauern herum; Fernkämpfer schießen nur bei freier Sicht und kommen sonst näher
          const blind = m.type.ranged && d <= reach && !navSees(m, t.x, t.y);
          if (m.flank && d > reach * 2.5 && !blind) {
            // seit 14.32 (Prüfungsarena): auf einem Bogen anlaufen – Ziel seitlich versetzt, je näher, desto weniger;
            // so kommen sie aus mehreren Richtungen und hängen nicht alle am selben Punkt
            const off = m.flank * Math.min(80, (d - reach) * 0.35);
            m.moving = navMove(m, t.x - ((t.y - m.y) / d) * off, t.y + ((t.x - m.x) / d) * off, chaseSpeed, dt);
          } else if (d > reach * 0.85 || blind) m.moving = navMove(m, t.x, t.y, chaseSpeed, dt);
          else if (Math.abs(t.x - m.x) > 1) m.facing = t.x > m.x ? 1 : -1;
          if (d <= reach && m.cd <= 0 && !blind) {
            m.cd = m.type.cooldown * (m.form2 ? 0.65 : 1);
            m.windup = m.windupMax = windupTime(m.typeId);
          }
        }
      }
    }

    if (m.state === 'return') {
      // Heimweg (seit 11.1 ohne Heilung unterwegs): erst zu Hause und wenn 6 s lang niemand mehr zugeschlagen hat,
      // ist es wieder heil – wer es auf dem Rückweg weiter angreift, holt es in den Kampf zurück
      // seit 13.63 mit Wegfindung (vorher blieb es an der ersten Mauer stehen, fern seines Platzes);
      // gibt es keinen Weg oder dauert es zu lange (20 s), bleibt es wie früher, wo es ist
      if (m.returnAt == null) {
        m.returnAt = game.time;
        m.nav = null; // Weg und Fehlschläge der Verfolgung gelten nicht für den Heimweg
      }
      m.moving = navMove(m, m.homeX, m.homeY, speed * 1.4, dt);
      if (Math.hypot(m.homeX - m.x, m.homeY - m.y) < 8 || (!m.moving && (!m.nav || m.nav.fail)) || game.time - m.returnAt > 20) {
        m.state = 'idle';
        m.returnAt = null;
        m.nav = null;
        m.threat = null; // zurück am Platz: der Kampf ist vergessen (seit 14.32)
        // seit 14.32: heil zu Hause = neuer Kampf, die alte Beteiligung (netTag) verfällt
        if (game.time - (m.struckAt || -99) > 6) { m.hp = m.maxHp; m.tags = null; }
        m.wx = m.x;
        m.wy = m.y;
      }
    }
  }

  // Monster drängen sich nicht auf einen Punkt (seit 13.63 nur die gerechneten statt aller der Welt)
  const active = list.filter((m) => !m.dead && !m.isStone && m.state === 'chase');
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

  // Monster aus Steinwellen verschwinden nach dem Tod endgültig. Seit 14.26 nur dann eine neue Liste: vorher entstand
  // jedes Bild eine Kopie aller ~7.000 Monster (Müll für die Speicherbereinigung), und monsterIndex baute sich
  // deshalb in jedem Bild neu auf statt alle 2 s
  let gone = false;
  for (const m of game.monsters) if (m.dead && !m.respawn) { gone = true; break; }
  if (gone) game.monsters = game.monsters.filter((m) => !(m.dead && !m.respawn));
}

// --- Diener des Nekromanten (seit 8.5: drei Diener, ab E1 Knochenhunde; seit 13.94 ab H Knochendrachen,
// ab V Seelenkolosse – deren Angriffe und Bilder in nekro-diener.js) ------------------------------------

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
  if (kind !== 'skelett') particles(x, y + 4, { count: 8, color: ['#7fe3a0', '#e0ffd0'], angle: -Math.PI / 2, spread: 0.5, speed: [50, 110], life: [0.5, 0.8], size: [2, 3] });
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
    // seit 14.32: gleich nach Bedrohung neu umschauen (nächster Diener oder ein Spieler)
    if (m.target && m.target.ally && !game.allies.includes(m.target)) {
      m.target = p;
      m.threatAt = 0;
    }
  }
}

// Werte eines Dieners aus seiner Stufe (sk.tiers); k = Platz (der erste wird beim Vollendet-Rang zum Alpha)
function allyTierStats(sk, lvl, k) {
  const s = game.stats;
  const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
  const T = sk.tiers[ti];
  const big = T.alpha && k === 0 ? T.alpha : 1;
  return {
    kind: T.kind, tier: ti, lvl, r: T.r || (T.kind === 'hund' ? 12 : 10), maxHp: Math.round(s.maxHp * T.hp * buffScale(lvl) * big),
    atkMul: T.atk * big, def: Math.round(s.def * T.def), every: T.every, windupMax: T.windup, speed: T.speed,
    slow: T.slow || 0, burst: T.burst || 0, pounce: !!T.pounce, scale: T.scale * (big > 1 ? 1.35 : 1), alpha: big > 1,
    name: big > 1 ? 'Alpha' : T.name,
    // seit 13.94: Drachen (Fernkampf aus der Luft) und Kolosse (Faust, Bodenstampfer); hits zählt die Angriffe
    range: T.range || 0, hold: T.hold || 0, breath: T.breath || null, splash: T.splash || null, stomp: T.stomp || null,
    fly: T.kind === 'drache', hits: 0, altAttack: false
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
  // seit 13.94: Seelenkoloss mit Faustschlag und Bodenstampfer (nekro-diener.js)
  if (a.kind === 'koloss') return colossusStrike(a, t);
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
  // seit 13.86: Diener kämpfen in der Turnierarena gegen die gegnerischen Spieler mit (wie im Duell nur halb so stark)
  if (typeof pvpFoes === 'function') {
    for (const f of pvpFoes()) {
      const sc = allyScore(f, a, p, proxyOk);
      if (sc < bestScore) { best = f; bestScore = sc; }
    }
  }
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
    // seit 13.86: Gegner der Turnierarena gelten, solange sie in pvpFoes stehen
    const pvpGone = t && t.pvp && !(typeof pvpFoes === 'function' && pvpFoes().includes(t));
    if (t && (t.dead || dist(t, p) > ALLY_KEEP || pvpGone || (t.duelProxy && !t.pvp && (!duelFighting() || t !== game.duel.proxy)))) {
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
          // seit 13.94: Drachen speien auf Abstand (Feuerball oder Feueratem, nekro-diener.js)
          if (a.range) {
            if (d <= a.range + t.r + 30) dragonShoot(a, t);
            else a.attackAnim = a.swing = 0.25;
          } else if (d <= reach * 1.3 + 10) allyStrike(a, t, 1);
          else a.attackAnim = a.swing = 0.25;
        }
      } else if (a.range) {
        // seit 13.94: Drachen halten Abstand zum Ziel, statt sich anzuschmiegen
        dragonKeepRange(a, t, d, dt);
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
        // seit 13.94: jeder dritte Schlag des Kolosses ist ein Bodenstampfer (holt länger aus)
        if (a.stomp) {
          a.hits++;
          a.altAttack = a.hits % a.stomp.every === 0;
          if (a.altAttack) a.windup *= 1.4;
        }
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
