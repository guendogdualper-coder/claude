// Kampf: Schaden berechnen, normale Angriffe, Fertigkeiten, Geschosse, Effekte.

// Jede Stufe macht eine Fertigkeit stärker:
// Schaden bis Stufe 15 mit Punkten +6 % je Stufe, Erwecken springt auf E1 (Kurvenanker 17),
// in den Rängen +4 % je Stufe, dazu ein Sprung bei jedem neuen Rang.
// Buffs, Heilung, Schilde und Flüche: +3 % Wirkung je Stufe (in den Rängen +1,5 %), dazu ein Rangsprung.
// Die Dauer wächst mit: +2 % je Stufe (in den Rängen +1 %), dazu ein Rangsprung.
const RANK_JUMP = [0.05, 0.12, 0.2, 0.3];
const BUFF_JUMP = [0.08, 0.16, 0.28, 0.45];
const DUR_JUMP = [0.05, 0.1, 0.15, 0.25];
function levelCurve(lvl, base, ranked, jumps) {
  const r = skillRank(lvl);
  return 1 + base * (Math.min(lvl, SKILL_BASE_MAX) - 1) + ranked * Math.max(0, lvl - SKILL_BASE_MAX) + (r >= 0 ? jumps[r] : 0);
}
const dmgScale = (lvl) => levelCurve(lvl, 0.06, 0.04, RANK_JUMP);
// Buffs, Heilung und Schilde wachsen mit der Fertigkeitsstufe und dem Hauptwert der Klasse
const buffScale = (lvl) => levelCurve(lvl, 0.03, 0.015, BUFF_JUMP) * ((game.stats && game.stats.buffPower) || 1);
const skillDuration = (sk, lvl) => Math.round(sk.duration * levelCurve(lvl, 0.02, 0.01, DUR_JUMP));

// Tarnung endet mit dem nächsten Angriff. Ein Schlag, der beim Tarnen schon unterwegs war, zählt noch nicht.
const STEALTH_GRACE = 0.6;
const CRIT_CAP = 0.6;
// Normale Angriffe treffen seit Version 6.1 etwas härter, damit sie neben den zäheren Monstern nicht zäh werden
const BASIC_MUL = 1.4;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Im Duell steht der Gegner als Stellvertreter mit in der Liste
function aliveEnemies() {
  const list = game.monsters.filter((m) => !m.dead);
  if (duelFighting() && !game.duel.proxy.dead) list.push(game.duel.proxy);
  return list;
}

// Grundformel: Angriff × Faktor, ±10 % Zufall, Verteidigung zieht prozentual ab.
// Je höher die Stufe des Angreifers, desto weniger hilft die gleiche Verteidigung,
// damit Rüstung auf hohen Stufen nicht jeden Treffer schluckt.
function calcDamage(atk, mul, def, critChance, level = 1) {
  let raw = atk * mul * (0.9 + Math.random() * 0.2);
  const crit = Math.random() < critChance;
  if (crit) raw *= 1.8;
  const amount = Math.max(1, Math.round(raw * (1 - def / (def + 40 + 5 * (level - 1)))));
  return { amount, crit };
}

// Höherstufige Monster nehmen weniger Schaden: −8 % je Stufe Unterschied, höchstens −75 %
function levelPenalty(attackerLevel, targetLevel) {
  const diff = targetLevel - attackerLevel;
  return diff > 0 ? Math.max(0.25, 1 - 0.08 * diff) : 1;
}

// Und sie treffen härter: +7 % je Stufe über dir, höchstens +80 %
function levelBonus(attackerLevel, targetLevel) {
  const diff = attackerLevel - targetLevel;
  return diff > 0 ? 1 + Math.min(0.8, 0.07 * diff) : 1;
}

// --- Ziele ----------------------------------------------------------------

function nearestEnemy(from, range) {
  let best = null;
  let bestD = Infinity;
  for (const m of aliveEnemies()) {
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
  if (m.duelProxy) return duelHit(m, mul, opts);
  const p = game.player;
  const s = game.stats;
  let factor = mul * levelPenalty(p.level, m.level);
  // Kritische Chance samt Fertigkeits-Bonus höchstens 60 % (nur der Angriff aus der Tarnung trifft sicher kritisch)
  let crit = opts.dot ? 0 : Math.min(CRIT_CAP, s.crit + (opts.critBonus || 0));
  if (!opts.ally && !opts.dot && !(game.time - (p.stealthAt || -99) < STEALTH_GRACE)) {
    if (p.nextHitMul > 1) {
      factor *= p.nextHitMul;
      p.nextHitMul = 1;
      crit = 1;
    }
    if (s.invisible) p.buffs = p.buffs.filter((b) => !b.effects.invisible);
  }
  if (!opts.ally && !opts.dot) p.lastCombat = game.time;
  if (m.vulnerable && m.vulnerable.until > game.time) factor *= m.vulnerable.mul;
  if (!opts.ally) {
    factor *= 1 + (s.monsterDmg || 0);
    if (opts.basic) factor *= BASIC_MUL * (1 + (s.basicDmg || 0));
  }
  const atk = opts.atk != null ? opts.atk : s.atk;
  const { amount, crit: isCrit } = calcDamage(atk, factor, opts.dot ? 0 : m.def, opts.ally ? 0.05 : crit, p.level);
  if (!m.isStone) {
    if (opts.stun) m.stun = Math.max(m.stun, opts.stun);
    // Einfrieren (Magier, seit 8.6): Betäubung mit Eisblock; die Pose bleibt stehen, solange m.frozen läuft
    if (opts.freeze && opts.stun && canFreeze(m)) {
      if (!(m.frozen > game.time)) m.frozenT = game.time;
      m.frozen = Math.max(m.frozen || 0, game.time + opts.stun);
    }
    if (opts.knockback) {
      const src = opts.from || p;
      const d = Math.max(1, dist(src, m));
      m.kx = (m.x - src.x) / d * opts.knockback * 4;
      m.ky = (m.y - src.y) / d * opts.knockback * 4;
    }
    if (opts.poison) m.poison = { dps: s.atk * opts.poison.dps, until: game.time + opts.poison.duration, tick: 0 };
    if (opts.burn) m.burn = { dps: s.atk * opts.burn.dps, until: game.time + opts.burn.duration, tick: 0 };
    if (opts.slow) setSlow(m, 1 - opts.slow.amount, opts.slow.duration);
  }
  damageMonster(m, amount, isCrit, opts.source || p, opts.dot);
  // Lebensraub heilt um einen Teil des Schadens; die Heilung erscheint als grüne Zahl
  if (!opts.ally && !opts.dot && s.hpSteal > 0 && !p.dead) {
    // Lebensraub heilt je Treffer höchstens 3 % des Lebens, sonst macht hoher Schaden unverwundbar
    const gain = Math.min(s.maxHp - p.hp, amount * s.hpSteal, s.maxHp * 0.03);
    if (gain > 0) {
      p.hp += gain;
      p.stealSum = (p.stealSum || 0) + gain;
      later(0.08, showLifeSteal);
      later(0.3, showLifeSteal);
      const c = bodyCenter(m);
      particles(c.x, c.y, { count: 3, color: ['#8ff08f', '#c6ffb0'], angle: Math.atan2(p.y - m.y, p.x - m.x), spread: 0.4, speed: [dist(m, p) * 1.5, dist(m, p) * 2.2], life: [0.35, 0.5], size: [2, 3], drag: 1 });
    }
  }
  if (!opts.dot) {
    vfxImpact(m, isCrit, opts.ally ? '#cfd8b0' : opts.vfxColor);
    if (opts.skill) {
      skillHitFx(opts.skill, m, isCrit, opts.heavy);
      const idx = classSkills(p).findIndex((x) => x.id === opts.skill);
      const rank = idx >= 0 ? skillRank(p.skillLevels[idx]) : -1;
      if (rank >= 0) rankHitFx(m, rank);
    }
    if (isCrit && !opts.ally) {
      hitStop(0.06);
      shakeScreen(5);
    } else if (opts.heavy) {
      shakeScreen(2);
    }
  }
  return amount;
}

// Mehrere kleine Heilungen kurz hintereinander werden zu einer Zahl zusammengefasst
function showLifeSteal() {
  const p = game.player;
  if (!p || !(p.stealSum >= 1) || game.time - (p.stealShown || 0) < 0.2) return;
  addText(p.x + rand(-6, 6), feetY(p) - 58, '+' + Math.round(p.stealSum), 'heal');
  p.stealSum = 0;
  p.stealShown = game.time;
}

function damageMonster(m, amount, crit, source, isDot) {
  // Im Mehrspieler entscheidet der Host über Leben und Tod der Monster
  if (net.mode === 'client') {
    netClientDamage(m, amount, crit, isDot);
    return;
  }
  if (source && (source === game.player || source.remote)) m.lastAttacker = source;
  if (source && !source.remote) m.hostHitAt = game.time;
  m.hp -= amount;
  m.hitFlash = 0.12;
  // Mehrere Zahlen kurz hintereinander stapeln sich nach oben statt sich zu überdecken
  m.textStack = game.time - (m.lastText || -9) < 0.3 ? ((m.textStack || 0) + 1) % 4 : 0;
  m.lastText = game.time;
  if (opts.numbers) addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 15, String(amount), crit ? 'crit' : isDot ? 'dot' : 'dmg');
  if (m.isStone) {
    checkStoneWaves(m);
  } else {
    aggro(m, source);
  }
  if (m.hp <= 0) killMonster(m);
}

function killMonster(m) {
  if (net.mode === 'client') return;
  m.dead = true;
  m.hp = 0;
  m.poison = null;
  m.burn = null;
  if (game.target === m) game.target = null;
  monsterDeathFx(m);
  if (m.isStone) m.respawnAt = game.time + randInt(...(m.stoneRespawn || STONE.respawn));
  else m.respawnAt = game.time + (m.respawnDelay || 30 + Math.random() * 15);
  if (net.mode === 'host') netBroadcastKill(m);
  // Belohnung nur, wer mitgekämpft hat oder in der Nähe war (allein: immer)
  if (net.mode !== 'host' || netShares(m, m.hostHitAt)) rewardKill(m);
  if (m.isStone) killStoneMinions(m);
}

function monsterDeathFx(m) {
  const bc = bodyCenter(m);
  if (m.isStone) {
    const look = m.stoneType.look;
    particles(bc.x, bc.y, { count: 46, color: [look.glow, look.top, look.rune, '#ffffff'], speed: [80, 260], life: [0.4, 0.9], size: [2, 4.5], shape: 'square', drag: 2.5 });
    addEffect({ type: 'ring', x: m.x, y: m.y, r: 70, dur: 0.6, color: look.glow, width: 10, grow: true });
    shakeScreen(7);
    hitStop(0.08);
  } else {
    vfxCorpse(m);
    particles(bc.x, bc.y, { count: 12, color: ['#e8e0cc', '#a8997c'], speed: [40, 120], life: [0.3, 0.6], size: [2, 3.5], drag: 3, glow: false });
  }
}

// Seelensteine (und ihre Wellen), die so viele Stufen unter dir sind, lassen keine Beute mehr fallen
const STONE_LOOT_GAP = 15;
function stoneTooLow(m, p) {
  const lvl = m.isStone ? m.level : m.stone ? m.stone.level : null;
  return lvl != null && p.level - lvl >= STONE_LOOT_GAP;
}

// Erfahrung, Gold, Beute und Aufträge für ein besiegtes Monster
function rewardKill(m) {
  ui.dropAt = { x: m.x, y: feetY(m) };
  try {
    rewardKillInner(m);
  } finally {
    ui.dropAt = null;
  }
}
function rewardKillInner(m) {
  const p = game.player;
  if (stoneTooLow(m, p)) {
    // Nur noch die (ohnehin kleine) Erfahrung, kein Gold und keine Beute
    p.kills++;
    if (m.isStone) {
      p.stones++;
      ui.log(`${m.name} ist ${STONE_LOOT_GAP} oder mehr Stufen unter dir – keine Beute.`, 'warn');
      questEvent('stone', m);
    } else questEvent('kill', m);
    gainXp(partyXp(Math.max(1, Math.round(m.xp * xpFactor(p.level, m.level))), m));
    return;
  }
  // in einer Gruppe teilen sich die Mitglieder in der Nähe die Erfahrung (gruppe.js)
  const xp = partyXp(Math.max(1, Math.round(m.xp * xpFactor(p.level, m.level))), m);
  const drops = m.isStone ? stoneDrops(m.stoneType) : null;
  // Monster aus einem Seelenstein bringen etwas von dessen Beute mit
  const sd = m.stone ? stoneDrops(m.stone.stoneType) : null;
  const gold = Math.round(randInt(m.gold[0], m.gold[1]) * (drops ? drops.gold : sd ? Math.max(1.2, sd.gold * 0.7) : 1));
  p.gold += gold;
  p.kills++;
  // Gold erscheint klein beim Monster, die Erfahrung groß über der eigenen Figur (gainXp)
  if (gold > 0) addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  // violette Erfahrungsfunken fliegen vom Monster zur Figur
  const bc0 = bodyCenter(m);
  particles(bc0.x, bc0.y, { count: m.isStone ? 24 : 7, color: ['#d6b8ff', '#b48aff', '#ffffff'], angle: Math.atan2(p.y - m.y, p.x - m.x), spread: 0.5, speed: [dist(m, p) * 1.4, dist(m, p) * 2.2], life: [0.35, 0.5], size: [2, 3.2], drag: 0.6 });

  if (m.isStone) {
    const splinters = randInt(drops.splinters[0], drops.splinters[1]);
    const potHp = randInt(drops.potions[0], drops.potions[1]);
    const potMp = Math.round(potHp * 0.6);
    const size = potionSizeFor(m.level);
    p.splinters += splinters;
    p.stones++;
    p.potions[potKey('hp', size.id)] = (p.potions[potKey('hp', size.id)] || 0) + potHp;
    p.potions[potKey('mp', size.id)] = (p.potions[potKey('mp', size.id)] || 0) + potMp;
    ui.log(`${m.name} zerstört! +${xp.toLocaleString('de-DE')} EP.`, 'level');
    ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
    ui.loot('Seelensplitter', splinters, lootIconUrl('splinter'), '#c9a8ff');
    ui.loot(`${potionInfo('hp').name} (${size.id})`, potHp, potionIconUrl('hp', size.id), potionInfo('hp').color);
    ui.loot(`${potionInfo('mp').name} (${size.id})`, potMp, potionIconUrl('mp', size.id), potionInfo('mp').color);
    questEvent('stone', m);
  } else {
    questEvent('kill', m);
    const sz = potionSizeFor(m.level).id;
    // Seit 6.6 deutlich seltener: Tränke kauft man bei der Händlerin
    const potMul = sd ? (sd.potions[0] >= 2 ? 2 : 1.5) : 1;
    for (const [kind, chance] of [['hp', 0.012 * potMul], ['mp', 0.008 * potMul]]) {
      if (Math.random() >= chance) continue;
      const key = potKey(kind, sz);
      p.potions[key] = (p.potions[key] || 0) + 1;
      ui.loot(`${potionInfo(kind).name} (${sz})`, 1, potionIconUrl(kind, sz), potionInfo(kind).color);
    }
  }
  // Helfer der Endbosse: mit etwas Glück Tränke, Splitter oder eine Verstärkung
  if (m.raidAdd) {
    const sz = potionSizeFor(m.level).id;
    if (Math.random() < 0.35) {
      const key = potKey('hp', sz);
      p.potions[key] = (p.potions[key] || 0) + 1;
      ui.loot(`${potionInfo('hp').name} (${sz})`, 1, potionIconUrl('hp', sz), potionInfo('hp').color);
    }
    if (Math.random() < 0.3) {
      const n = randInt(1, 3);
      p.splinters += n;
      ui.loot('Seelensplitter', n, lootIconUrl('splinter'), '#c9a8ff');
    }
    if (Math.random() < 0.12) {
      p.materials.boniPlus = (p.materials.boniPlus || 0) + 1;
      ui.loot(MATERIALS.find((x) => x.id === 'boniPlus').name, 1, materialIconUrl('boniPlus'), MATERIAL_COLORS.boniPlus);
    }
  }
  if (m.type && m.type.raid) raidLoot(m);
  else if (m.type && m.type.boss) bossLoot(m);
  rollLoot(m);
  gainXp(xp);
}

// --- Schaden am Spieler ----------------------------------------------------------

function damagePlayer(amount, attacker) {
  const p = game.player;
  const s = game.stats;
  if (p.dead) return;
  // In Städten und Lagern gibt es keinen Schaden (außer im Duell) – egal woher er kommt
  if (inVillage(p.x, p.y) && !(attacker && attacker.duelProxy)) return;
  p.lastCombat = game.time;
  // Frostpanzer (seit 8.6): wer dich aus der Nähe schlägt, wird 1,5 s verlangsamt (feste Verlangsamung)
  if (s.chill && attacker && !attacker.duelProxy && !attacker.dead && attacker.typeId && dist(attacker, p) < 90) {
    setSlow(attacker, 1 - s.chill, 1.5);
    if (net.mode === 'client') netClientDamage(attacker, 0, false, false);
  }
  if (p.protectUntil > game.time) return;
  if (Math.random() < s.dodge) {
    addText(p.x, p.y - 30, 'Ausgewichen', 'info');
    return;
  }
  // Ein Schild kann Treffer ganz abblocken
  if (s.block > 0 && Math.random() < s.block) {
    addText(p.x, p.y - 30, 'Geblockt', 'block');
    vfxBlock(p, attacker);
    return;
  }
  let dmg = Math.max(1, Math.round(amount * s.damageTaken));
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, dmg);
    p.shield -= absorbed;
    dmg -= absorbed;
    // eigener Abdruck des Schild-Buffs (Basalthaut)
    for (const b of p.buffs) {
      const fx = SKILL_FX[b.id];
      if (fx && fx.absorb) fx.absorb(p, attacker);
    }
    if (dmg <= 0) {
      addText(p.x, p.y - 30, 'Abgewehrt', 'info');
    }
  }
  // Im Duell fällt niemand: wer auf 1 Leben kommt, hat verloren
  const duelBlow = attacker && attacker.duelProxy;
  if (duelBlow && dmg > 0 && p.hp - dmg < 1) {
    dmg = Math.max(0, Math.floor(p.hp - 1));
    later(0, () => duelLose(null));
  }
  if (dmg > 0) {
    p.hp -= dmg;
    p.hurtAt = game.time;
    addText(p.x + (Math.random() - 0.5) * 16, p.y - 34, '-' + dmg, 'hurt');
    game.hurtFlash = 0.35;
    shakeScreen(2.5);
  }
  if (s.reflect > 0 && attacker && !attacker.dead && !duelBlow) {
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
  // EP kostet nur das Wiederbeleben an Ort und Stelle
  p.deathXpLoss = Math.min(p.xp, Math.round(xpToNext(p.level) * 0.03));
  for (const m of game.monsters) {
    if (m.target === p) { m.state = 'return'; m.target = null; }
  }
  saveGame();
  ui.showDeath(p.deathXpLoss);
}

// here: an Ort und Stelle mit halbem Leben und kurzem Schutz, kostet EP; sonst in der Stadt ohne Verlust
const REVIVE_PROTECT = 3;
function revivePlayer(here) {
  const p = game.player;
  const s = playerStats(p);
  if (here) {
    p.xp -= Math.min(p.xp, p.deathXpLoss || 0);
    p.hp = Math.round(s.maxHp * 0.5);
    p.mp = Math.round(s.maxMp * 0.5);
    p.protectUntil = game.time + REVIVE_PROTECT;
    vfxPillar(p, '#ffe7a0');
  } else {
    const spawn = villageSpawn(p);
    p.x = spawn.x;
    p.y = spawn.y;
    p.hp = s.maxHp;
    p.mp = s.maxMp;
  }
  p.deathXpLoss = 0;
  p.dead = false;
  p.skillCd = [0, 0, 0, 0, 0];
  saveGame();
}

// --- Normaler Angriff --------------------------------------------------------
// Nahkämpfer schlagen eine Kombo aus drei Schlägen: Hieb, Rückhand, Stich.

function startSwing(p, kind, duration) {
  p.swingSeq = (p.swingSeq || 0) + 1;
  p.swingKind = kind;
  p.swingDur = duration;
  p.swing = duration;
}

// Art der getragenen Waffe; ohne Waffe die erste Art der Klasse
function weaponKindOf(p) {
  const w = p.equipment && p.equipment.waffe;
  return w && w.kind ? w.kind : CLASS_WEAPON_KINDS[p.classId][0];
}

const MELEE_KINDS = new Set(['sword', 'axe', 'greatsword', 'greataxe', 'dagger', 'scythe']);

// Normaler Angriff je Waffenart: der Bogen schießt, Zweihänder und Sense schlagen weiter
const KIND_BASIC = {
  bow: { range: 250, cooldown: 0.75, ranged: true, color: '#f0e0b0', style: 'arrow' },
  greatsword: { range: 62, cooldown: 0.8, ranged: false },
  greataxe: { range: 60, cooldown: 0.88, ranged: false },
  scythe: { range: 62, cooldown: 0.85, ranged: false }
};

function basicAttack(p) {
  // Magier (seit 8.6): Farbe und Geschoss nach dem gewählten Element
  if (p.classId === 'magier') {
    const E = mageEl(p);
    return { ...CLASSES.magier.basic, color: E.hi, el: E.key };
  }
  return KIND_BASIC[weaponKindOf(p)] || CLASSES[p.classId].basic;
}

function tryBasicAttack() {
  const p = game.player;
  const c = CLASSES[p.classId];
  const basic = basicAttack(p);
  if (p.attackCd > 0 || p.dead || p.dash) return false;
  if (inVillage(p.x, p.y) && !duelFighting()) return false; // im Dorf wird nicht gekämpft (außer im Duell)
  if (p.riding) toggleRide(false);
  // Angreifen geht immer: mit Gegner in Reichweite auf ihn, sonst ein Schlag oder Schuss
  // in Blickrichtung (später auch für Kämpfe gegen andere Spieler)
  const target = pickTarget(basic.range);
  if (target) faceTowards(target.x, target.y);
  p.attackCd = basic.cooldown / game.stats.atkSpeed;
  if (basic.ranged) {
    startSwing(p, 'cast', 0.28);
    const hand = bodyCenter(p);
    particles(hand.x + p.facing.x * 14, hand.y + p.facing.y * 8, { count: 6, color: basic.color, speed: [30, 80], life: [0.15, 0.3], size: [1.5, 2.5] });
    spawnProjectile({ owner: 'player', x: p.x, y: p.y, target, dir: target ? null : { ...p.facing }, speed: basic.style === 'arrow' ? 620 : 480, range: basic.range + 60, mul: 1, color: basic.color, radius: 5, style: basic.style, el: basic.el, basic: true });
    netSkillFx('_shot', basic.range, { c: basic.color, st: basic.style, el: basic.el });
  } else {
    p.combo = ((p.combo || 0) + 1) % 3;
    startSwing(p, 'combo', p.combo === 2 ? 0.24 : 0.28);
    vfxSwing(p, c.trim);
    if (target) hitMonster(target, p.combo === 2 ? 1.25 : 1, { vfxColor: c.trim, basic: true });
  }
  return true;
}

// --- Fertigkeiten -----------------------------------------------------------------

// Manakosten (seit 7.7): wachsen mit der Stufe, damit auch später Manatränke gebraucht werden.
// Der Schamane zaubert am meisten und zahlt am meisten, der Krieger am wenigsten.
const MANA_COST = { schamane: [1.15, 0.022], magier: [1.15, 0.022], nekromant: [1.05, 0.016], ninja: [1, 0.013], krieger: [1, 0.011] };
function skillMana(sk, p = game.player) {
  const [a, b] = MANA_COST[p.classId] || [1, 0];
  return Math.round(sk.mp * (a + b * p.level));
}

function useSkill(i) {
  const p = game.player;
  if (!p || p.dead || p.dash) return;
  const sk = classSkills(p)[i];
  if (!sk) return;
  if (p.level < sk.unlock) {
    ui.log(sk.name + ' wird ab Stufe ' + sk.unlock + ' freigeschaltet.', 'warn');
    return;
  }
  if (p.skillCd[i] > 0) return;
  if ((sk.kind === 'angriff' || sk.kind === 'fluch') && inVillage(p.x, p.y) && !duelFighting()) {
    addText(p.x, p.y - 34, 'Im Dorf wird nicht gekämpft', 'info');
    return;
  }
  if (p.mp < skillMana(sk, p)) {
    addText(p.x, p.y - 34, 'Zu wenig Mana', 'info');
    return;
  }
  // Fertigkeiten mit Zielort: erst zielen, beim zweiten Antippen oder Tippen auf den Boden wirken
  if (sk.aim && !(game.aim && game.aim.i === i && game.aim.go)) {
    if (game.aim && game.aim.i === i) aimFire();
    else startAim(i, sk);
    return;
  }
  if (p.riding) toggleRide(false);
  const lvl = p.skillLevels[i];
  const rank = skillRank(lvl);
  const ok = withRank(rank, () => SKILL_TYPES[sk.type](sk, dmgScale(lvl) * (game.stats.skillDmg || 1), lvl));
  if (ok === false) return;
  withRank(rank, () => skillCastFx(sk));
  if (rank >= 0) rankCastFx(p, rank, SKILL_RANKS[rank].color);
  p.mp -= skillMana(sk, p);
  p.skillCd[i] = sk.cooldown;
  // Fertigkeiten mit eigener Bahn (Welle, Riss, Sprung) geben ihre Eckdaten für Mitspieler zurück
  const extra = ok && typeof ok === 'object' ? ok : sk.aim ? { tx: Math.round(skillAimPoint(sk).x), ty: Math.round(skillAimPoint(sk).y) } : {};
  // Rang mitschicken (seit 8.5): Mitspieler sehen Augen und Kern in der Rangfarbe
  if (rank >= 0) extra.rk = rank;
  // skipNet: die Fertigkeit hat ihre Nachricht schon selbst geschickt (Elementsprung vor dem Ortswechsel)
  if (!extra.skipNet) netSkillFx(sk.id, 160, extra);
  // Buffs, Heilung, Beschwörung und Flüche: kurze Kraftpose mit Lichtringen
  if (sk.type === 'buff' || sk.type === 'heal' || sk.type === 'summon' || sk.type === 'curse') {
    startSwing(p, 'pose', 0.7);
    p.poseColor = skillColor(sk, CLASSES[p.classId].trim);
    vfxPowerUp(p, p.poseColor);
  } else if (sk.anim) {
    // eigene Animation (SKILL_POSE3 in drei-figuren.js), Mitspieler sehen sie über den Zustand
    startSwing(p, sk.anim, sk.animDur);
  } else {
    startSwing(p, 'skill', 0.34);
  }
  if (sk.kind === 'angriff' || sk.kind === 'fluch') p.lastCombat = game.time;
}

// --- Hilfen für Sichelwelle, Felsenfaust und Sprungschlag (seit 8.3) ------------------------------

// Verlangsamung setzen, ohne eine stärkere laufende zu überschreiben (Diener-Bisse gegen Flüche, Blizzard)
function setSlow(m, mul, dur) {
  const until = game.time + dur;
  if (!m.slow || m.slow.until <= game.time || mul < m.slow.mul) m.slow = { mul, until };
  else if (mul === m.slow.mul) m.slow.until = Math.max(m.slow.until, until);
}

// Figur für kurze Zeit festhalten (kein Laufen, kein Grundangriff, keine andere Fertigkeit)
function lockPlayer(p, dur) {
  if (!p.dash) p.dash = { lock: true, until: game.time + dur, rank: fxRank };
}

// Freie Strecke von (x, y) in Richtung dir bis zur ersten Wand, Wasser oder Lava (höchstens want)
function clearLen(x, y, dir, want, r) {
  let len = 0;
  for (let s = 6; s <= want; s += 6) {
    if (!canStand(x + dir.x * s, y + dir.y * s, r, false)) break;
    len = s;
  }
  return len;
}

// Darf ein Monster sichtbar hochgeschleudert werden? (nur Optik)
function canLift(m) {
  return !!m && !m.dead && !m.isStone && !(m.type && m.type.boss) && !m.duelProxy;
}

// Sichelwelle: Einschlag und wandernde Klingensichel; local = eigener Spieler (trifft), sonst nur Optik
function waveFx(owner, x0, y0, dir, wl, sk, local, pw) {
  const fy0 = y0 + 9;
  addEffect({ type: 'impact', x: x0, y: fy0 - 14, dur: 0.3, color: '#ffffff', big: true });
  addEffect({ type: 'ring', x: x0, y: fy0, r: 40, dur: 0.3, color: '#cfe0ff', width: 6, grow: true });
  addEffect({ type: 'decal', kind: 'crack', x: x0, y: fy0, r: 24, dur: 2, color: '#2a1a10' });
  addEffect({ type: 'sparks3', x: x0, y: fy0, h: 0.2, count: 12, color: '#e6eeff', speed: 2.6, up: 1.2, dur: 0.5 });
  const speed = 420;
  const steps = Math.ceil(wl / speed / 0.05);
  addEffect({ type: 'wave3', x: x0, y: fy0, dx: dir.x, dy: dir.y, dist: wl, w: sk.waveWidth, dur: wl / speed + 1.2, speed, color: sk.color || '#e6eeff' });
  const hit = new Set();
  for (let s = 0; s <= steps; s++) {
    later(s * 0.05, () => {
      const d = Math.min(wl, speed * s * 0.05);
      const cx = x0 + dir.x * d;
      const cy = y0 + dir.y * d;
      particles(cx, cy + 9, { count: 3, color: ['#ffffff', '#cfe0ff'], angle: Math.atan2(-dir.y, -dir.x), spread: 0.6, speed: [60, 140], life: [0.2, 0.35], size: [1.5, 2.5], shape: 'spark', drag: 4 });
      addEffect({ type: 'decal', kind: 'scorch', x: cx, y: cy + 9, r: 10, dur: 1.4, color: '#2a2018' });
      if (local) {
        for (const m of enemiesInCircle(cx, cy, sk.waveWidth / 2)) {
          if (hit.has(m.id)) continue;
          hit.add(m.id);
          hitMonster(m, sk.waveDmg * pw, { skill: sk.id, knockback: sk.knockback, from: { x: cx - dir.x * 40, y: cy - dir.y * 40 }, heavy: true, vfxColor: '#e6eeff' });
        }
      }
      if (s === steps && wl < sk.waveLen - 6) {
        addEffect({ type: 'impact', x: cx, y: cy - 4, dur: 0.22, color: '#e6eeff' });
        addEffect({ type: 'sparks3', x: cx, y: cy + 9, h: 0.4, count: 6, color: '#e6eeff', speed: 2, up: 1, dur: 0.4 });
      }
    });
  }
}

// Felsenfaust: Faust schlägt bei from in den Boden, Riss läuft zu end, Pfeiler bricht hervor (für alle gleich)
function eruptFx(owner, from, end, sk, targetR) {
  addEffect({ type: 'ring', x: end.x, y: end.y + 9, r: 26, dur: 0.36, color: '#c8a878', width: 4 });
  later(0.18, () => {
    addEffect({ type: 'shards3', x: from.x, y: from.y + 9, r: 14, count: 4, color: '#7a6a54', glow: false, size: 0.55, dur: 0.5 });
    addEffect({ type: 'smoke3', x: from.x, y: from.y + 9, count: 3, color: '#8a7656', size: 0.45, dur: 0.5 });
    addEffect({ type: 'decal', kind: 'crack', x: from.x, y: from.y + 9, r: 16, dur: 1.6, color: '#2a1a10' });
    addEffect({ type: 'erupt3', x: end.x, y: end.y + 9, x0: from.x, y0: from.y + 9, x1: end.x, y1: end.y + 9, r: targetR || 14, dur: 1.3, color: '#8a7a62' });
    if (owner === game.player) shakeScreen(2.5);
  });
  later(0.34, () => {
    addEffect({ type: 'ring', x: end.x, y: end.y + 9, r: 40, dur: 0.35, color: '#c8a878', width: 5, grow: true });
    addEffect({ type: 'decal', kind: 'crack', x: end.x, y: end.y + 9, r: 24, dur: 2, color: '#2a1a10' });
    particles(end.x, end.y + 6, { count: 10, color: ['#6a5038', '#8a6a44'], angle: -Math.PI / 2, spread: 0.8, speed: [80, 180], life: [0.4, 0.7], size: [2, 4], shape: 'square', glow: false, gravity: 600 });
  });
}

// Sprungschlag: Landung – Mulde, aufgeworfene Erde, Staub, Risse (für alle gleich; near = eigener Bildschirm wackelt)
function leapLandFx(x, fy, sk, near) {
  addEffect({ type: 'crater3', x, y: fy, r: sk.crater || 50, dur: 2 });
  addEffect({ type: 'ring', x, y: fy, r: sk.radius, dur: 0.35, color: '#c8a878', width: 5, grow: true });
  addEffect({ type: 'smoke3', x, y: fy, count: 7, color: '#9a8466', size: 0.9, dur: 0.9 });
  addEffect({ type: 'decal', kind: 'crack', x, y: fy, r: 40, dur: 2.4, color: '#2a1a10' });
  particles(x, fy - 4, { count: 20, color: ['#8a6a44', '#c9a878', '#5a4030'], angle: -Math.PI / 2, spread: 1.3, speed: [60, 150], life: [0.4, 0.7], size: [2.5, 4.5], shape: 'square', drag: 2, glow: false, gravity: 600 });
  if (near) shakeScreen(3);
}

// Landung des eigenen Sprungschlags: Treffer und Krater
function leapLand(p, d) {
  const fy = feetY(p);
  const sk = d.sk;
  leapLandFx(p.x, fy, sk, false);
  const hits = enemiesInCircle(p.x, p.y, sk.radius);
  for (const m of hits) {
    hitMonster(m, sk.dmg * d.pw, { skill: sk.id, stun: sk.stun, heavy: true, vfxColor: '#e8d8b0' });
    if (canLift(m)) m.lift = { start: game.time, dur: 0.25, h: 8 };
  }
  hitStop(hits.length ? 0.06 : 0.03);
  shakeScreen(hits.length ? 7 : 5);
}

// --- Zielen mit Zielkreis (seit 7.7, Blizzard) -------------------------------------------------------
// Antippen der Fertigkeit zeigt einen Kreis (am Ziel oder vor der Figur). Tippen oder Klicken auf den Boden
// setzt ihn dorthin und wirkt sofort, nochmal Antippen der Fertigkeit wirkt am Kreis. Nach 8 s ohne Wahl
// verschwindet er wieder. Der Kreis bleibt immer in Reichweite.
const AIM_TIMEOUT = 8;
function startAim(i, sk) {
  const p = game.player;
  cancelAim();
  const t = pickTarget(sk.range);
  const pt = { x: t ? t.x : p.x + p.facing.x * 150, y: t ? t.y : p.y + p.facing.y * 150, r: 0 };
  game.aim = { i, sk, pt, until: game.time + AIM_TIMEOUT, go: false };
  clampAim();
  game.aim.fx = addEffect({ type: 'aim', follow: pt, ox: 0, oy: 0, r: sk.radius, dur: AIM_TIMEOUT + 1, color: sk.color || '#bfe8ff' });
  addText(p.x, p.y - 40, 'Ort antippen', 'info');
  document.body.classList.add('aiming');
}
function cancelAim() {
  if (!game.aim) return;
  if (game.aim.fx) game.aim.fx.dur = 0;
  game.aim = null;
  document.body.classList.remove('aiming');
}
// Punkt auf Reichweite um die Figur begrenzen
function clampAim() {
  const a = game.aim;
  const p = game.player;
  const d = Math.hypot(a.pt.x - p.x, a.pt.y - p.y);
  if (d > a.sk.range) {
    a.pt.x = p.x + (a.pt.x - p.x) / d * a.sk.range;
    a.pt.y = p.y + (a.pt.y - p.y) / d * a.sk.range;
  }
}
function aimAt(x, y) {
  if (!game.aim) return;
  game.aim.pt.x = x;
  game.aim.pt.y = y;
  clampAim();
}
function aimFire(x, y) {
  const a = game.aim;
  if (!a) return;
  if (x != null) aimAt(x, y);
  a.go = true;
  useSkill(a.i);
  cancelAim();
}
function updateAim() {
  const a = game.aim;
  if (!a) return;
  if (game.time > a.until || !game.player || game.player.dead) cancelAim();
  else clampAim();
}
// Zielort einer Fertigkeit: der gewählte Kreis, sonst das Ziel oder ein Punkt vor der Figur
function skillAimPoint(sk) {
  const p = game.player;
  if (game.aim && game.aim.sk.id === sk.id) return game.aim.pt;
  const t = pickTarget(sk.range);
  return t ? { x: t.x, y: t.y } : { x: p.x + p.facing.x * 150, y: p.y + p.facing.y * 150 };
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

// Spätere Schritte einer Fertigkeit behalten ihren Rang (Aussehen je Rang, siehe fxRank)
function later(delay, fn) {
  const r = fxRank;
  game.timers.push({ at: game.time + delay, fn: r >= 0 ? () => withRank(r, fn) : fn });
}

function applyBuff(sk, lvl) {
  const p = game.player;
  const scale = buffScale(lvl);
  const effects = {};
  // Lauftempo seit 8.5 fest (sonst bis +158 % mit Rang und Hauptwert)
  for (const [k, v] of Object.entries(sk.effects || {})) effects[k] = typeof v === 'number' ? (k === 'speed' ? v : v * scale) : v;
  const duration = skillDuration(sk, lvl);
  p.buffs = p.buffs.filter((b) => b.id !== sk.id);
  p.buffs.push({ id: sk.id, name: sk.name, short: sk.short, until: game.time + duration, duration, effects, lvl });
}

// Nach dem Verbessern einer Fertigkeit gilt ein laufender Buff sofort mit den neuen Werten
function refreshBuff(sk, lvl) {
  const p = game.player;
  const b = p.buffs.find((x) => x.id === sk.id);
  if (!b) return;
  const left = b.until - game.time;
  applyBuff(sk, lvl);
  const nb = p.buffs.find((x) => x.id === sk.id);
  nb.until = game.time + left + (nb.duration - b.duration);
  game.stats = playerStats(p);
}

// Die Figur verschwindet und steht im selben Moment hinter dem Ziel (Hinterhalt, Blitzangriff)
function blinkBehind(t, color) {
  const p = game.player;
  const d = Math.max(1, dist(t, p));
  const ux = (t.x - p.x) / d;
  const uy = (t.y - p.y) / d;
  const from = { x: p.x, y: feetY(p) };
  const dir = facingDir(p.facing);
  addEffect({ type: 'afterimage', sprite: characterSprite(p.classId, dir, 1, playerLook(p)), x: p.x, y: feetY(p), flip: dir === 'side' && p.facing.x < 0, dur: 0.45, tint: color });
  particles(p.x, feetY(p) - 14, { count: 22, color: ['#3d3848', '#5a5466', '#8a7aa8'], speed: [30, 100], life: [0.4, 0.8], size: [5, 9], jitter: 8, drag: 2.5, glow: false });
  p.x = t.x;
  p.y = t.y;
  moveEntity(p, ux * (t.r + 16), uy * (t.r + 10), false);
  faceTowards(t.x, t.y);
  // Schattenspur vom alten zum neuen Platz
  const to = { x: p.x, y: feetY(p) };
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len > 20) addEffect({ type: 'slash', x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 14, ang: Math.atan2(to.y - from.y, to.x - from.x), len, w: 7, dur: 0.3, color });
  particles(p.x, feetY(p) - 14, { count: 18, color: ['#3d3848', '#5a5466', color], speed: [30, 110], life: [0.35, 0.7], size: [4, 8], jitter: 6, drag: 2.5, glow: false });
  input.walkTo = null;
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
          vfxSweep(p, sk.radius * 0.7, ang - spread / 2 + Math.random() * 0.4, ang + spread / 2, skillColor(sk, c.trim), 0.2, 14);
        } else {
          const from = h % 2 ? ang + spread / 2 : ang - spread / 2;
          const to = h % 2 ? ang - spread / 2 : ang + spread / 2;
          vfxSweep(p, sk.radius * 0.85, from, to, h === hits - 1 ? '#ffe9a0' : skillColor(sk, c.trim), 0.3, 30);
          if (MELEE_KINDS.has(weaponKindOf(p))) {
            addEffect({ type: 'bladearc', follow: p, ox: 0, oy: -14, len: sk.radius * 0.8, a0: from, a1: to, dur: 0.28, ...playerBlade(p) });
          }
          p.combo = h % 3;
          startSwing(p, 'combo', 0.13);
        }
        for (const m of enemiesInCone(p.x, p.y, dir, sk.radius, sk.angle)) {
          if (hits > 3) {
            const bc = bodyCenter(m);
            addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: Math.random() * Math.PI, len: 34, w: 5, dur: 0.18, color: '#c9b8ff' });
          }
          hitMonster(m, sk.dmg * pw, { skill: sk.id, knockback: h === hits - 1 ? sk.knockback : 0, burn: sk.burn, stun: sk.stun, heavy: h === hits - 1 });
        }
      });
    }
  },

  // Wirbel um die Figur
  circle(sk, pw) {
    const p = game.player;
    const c = CLASSES[p.classId];
    const a = Math.random() * Math.PI * 2;
    vfxSweep(p, sk.radius * 0.85, a, a + Math.PI * 4, skillColor(sk, c.trim), 0.45, 34);
    const fx = SKILL_FX[sk.id] || {};
    if (fx.bladeSpin) {
      addEffect({ type: 'bladespin', follow: p, ox: 0, oy: -12, len: sk.radius * 0.9, a0: a, turns: fx.bladeSpin.turns, count: fx.bladeSpin.count, dir: 1, dur: 0.6, color: skillColor(sk, c.trim), ...playerBlade(p) });
      p.spin = 0.6;
    }
    addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.4, color: '#d8c8a8', width: 6 });
    particles(p.x, feetY(p), { count: 26, color: ['#a88f62', '#c9b28a'], speed: [80, 200], life: [0.3, 0.6], size: [2, 4], drag: 4, glow: false });
    p.spin = Math.max(p.spin, 0.45);
    shakeScreen(3.5);
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true });
    }
  },

  // Vorwärtssturm, trifft alles auf dem Weg
  dash(sk, pw) {
    const p = game.player;
    const dir = aim(sk.distance);
    p.dash = { dx: dir.x, dy: dir.y, left: sk.distance, speed: sk.distance / 0.22, hit: new Set(), sk, pw, rank: fxRank };
    shakeScreen(2);
  },

  // Sichelwelle (seit 8.3): Querhieb im Fächer, dann Einschlag und eine Klingenwelle, die nach vorn gleitet
  wave(sk, pw) {
    const p = game.player;
    const c = CLASSES[p.classId];
    const dir = { ...aim(sk.waveLen * 0.6) };
    const ang = Math.atan2(dir.y, dir.x);
    const spread = sk.angle * Math.PI / 180;
    lockPlayer(p, sk.lock);
    input.walkTo = null;
    const x0 = p.x + dir.x * 28;
    const y0 = p.y + dir.y * 28;
    const wl = clearLen(x0, y0, dir, sk.waveLen, 6);
    later(0.12, () => {
      if (p.dead) return;
      vfxSweep(p, sk.radius * 0.85, ang + spread / 2, ang - spread / 2, sk.color || c.trim, 0.22, 30);
      if (MELEE_KINDS.has(weaponKindOf(p))) addEffect({ type: 'bladearc', follow: p, ox: 0, oy: -14, len: sk.radius * 0.8, a0: ang + spread / 2, a1: ang - spread / 2, dur: 0.24, ...playerBlade(p) });
      for (const m of enemiesInCone(p.x, p.y, dir, sk.radius, sk.angle)) hitMonster(m, sk.dmg * pw, { skill: sk.id });
    });
    later(0.24, () => { p.leap = { start: game.time, dur: 0.14, h: 10 }; });
    later(0.4, () => {
      if (p.dead) return;
      hitStop(0.04);
      shakeScreen(4);
      waveFx(p, x0, y0, dir, wl, sk, true, pw);
    });
    return { wl: Math.round(wl), tx: Math.round(x0 + dir.x * wl), ty: Math.round(y0 + dir.y * wl) };
  },

  // Felsenfaust (seit 8.3): Riss zum Ziel, Felspfeiler bricht unter ihm hervor und schleudert es hoch
  erupt(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (t) faceTowards(t.x, t.y);
    const dir = { ...p.facing };
    const want = t ? dist(p, t) : 90;
    const from = { x: p.x + dir.x * 22, y: p.y + dir.y * 22 };
    const free = clearLen(from.x, from.y, dir, Math.max(0, want - 22), 4);
    const blocked = free < want - 22 - 6;
    const end = blocked || !t ? { x: from.x + dir.x * free, y: from.y + dir.y * free } : { x: t.x, y: t.y };
    lockPlayer(p, sk.lock);
    input.walkTo = null;
    p.leap = { start: game.time, dur: 0.2, h: 12 };
    eruptFx(p, from, end, sk, t ? t.r : 14);
    later(0.34, () => {
      if (p.dead) return;
      let tt = t && !t.dead && !blocked && dist(t, end) <= sk.dodge ? t : null;
      if (!tt && !t) tt = enemiesInCircle(end.x, end.y, 24)[0] || null;
      if (tt) {
        hitStop(0.07);
        hitMonster(tt, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, vfxColor: '#e8d8b0' });
        if (canLift(tt)) tt.lift = { start: game.time, dur: 0.5, h: sk.launch * Math.min(1, 18 / (tt.r || 18)) };
      }
      shakeScreen(tt ? 5 : 3);
    });
    return { tx: Math.round(end.x), ty: Math.round(end.y) };
  },

  // Sprungschlag (seit 8.3): kurze Hocke, Sprung nach vorn (vor das Ziel), Landung mit Krater und Betäubung
  leap(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.distance + 40);
    if (t) faceTowards(t.x, t.y);
    const dir = { ...p.facing };
    const want = t ? Math.max(0, Math.min(sk.distance, dist(p, t) - ((t.r || 14) + 12))) : sk.distance;
    let reach = 0;
    for (let s = 6; s <= want; s += 6) {
      const nx = p.x + dir.x * s;
      const ny = p.y + dir.y * s;
      if (!canStand(nx, ny, p.r * 0.7, false) || (inVillage(nx, ny) && !duelFighting())) break;
      reach = s;
    }
    const x1 = p.x + dir.x * reach;
    const y1 = p.y + dir.y * reach;
    const h = Math.max(44, Math.min(60, 44 + 0.08 * reach));
    const now = game.time;
    p.dash = { leap: true, x0: p.x, y0: p.y, px: p.x, py: p.y, x1, y1, t0: now + sk.crouch, dur: sk.air, until: now + sk.crouch + sk.air + sk.recover, sk, pw, rank: fxRank, landed: false, trailAt: 0, smoked: false };
    p.leap = { start: now + sk.crouch, dur: sk.air, h, slam: true };
    input.walkTo = null;
    particles(p.x, feetY(p), { count: 12, color: ['#a88f62', '#c9b28a'], speed: [40, 120], life: [0.3, 0.6], size: [2.5, 4.5], shape: 'square', drag: 3, glow: false });
    addEffect({ type: 'ring', follow: p, ox: 0, oy: 0, r: 28, dur: 0.25, color: '#c8a878', width: 4 });
    addEffect({ type: 'ring', x: x1, y: y1 + p.r * 0.8, r: sk.radius, dur: 0.55, color: '#c8a878', width: 3 });
    shakeScreen(1.5);
    return { tx: Math.round(x1), ty: Math.round(y1) };
  },

  // Einzelner starker Treffer im Nahkampf
  strike(sk, pw) {
    const p = game.player;
    // Hinterhalt aus der Tarnung: weiter Sprung hinter das Ziel und mehrfacher Schaden
    const ambush = sk.ambushMul && p.nextHitMul > 1 && game.stats.invisible && !(game.time - (p.stealthAt || -99) < STEALTH_GRACE);
    const t = pickTarget(ambush ? sk.ambushRange : sk.range);
    if (t && ambush) {
      blinkBehind(t, '#8a6ad8');
      addText(p.x, p.y - 46, 'Hinterhalt!', 'crit');
      flashScreen('#3d2a6a', 0.3);
      shakeScreen(6);
      pw *= sk.ambushMul;
    }
    if (t) faceTowards(t.x, t.y);
    // ohne Ziel trifft der Schlag die Stelle vor der Figur
    const bc = t ? bodyCenter(t) : { x: p.x + p.facing.x * 40, y: bodyCenter(p).y + p.facing.y * 24 };
    const col = sk.color || '#b48cff';
    addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 0.75, len: 58, w: 9, dur: 0.3, color: col });
    later(0.07, () => addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: -0.75, len: 58, w: 9, dur: 0.3, color: col }));
    particles(bc.x, bc.y, { count: 14, color: [col, '#ffffff'], speed: [60, 160], life: [0.3, 0.5], size: [2, 3], shape: 'square' });
    if (!t) return;
    hitStop(0.05);
    hitMonster(t, sk.dmg * pw, { skill: sk.id, critBonus: sk.critBonus, stun: sk.stun, knockback: sk.knockback, poison: sk.poison, heavy: true, vfxColor: sk.color ? lighter(sk.color, 0.3) : '#d6c4ff' });
  },

  // Blitzangriff: sofort hinter dem Ziel stehen und zuschlagen
  blink(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (!t) {
      addText(p.x, p.y - 34, 'Kein Ziel', 'info');
      return false;
    }
    blinkBehind(t, sk.color);
    const bc = bodyCenter(t);
    addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 0.4, len: 70, w: 10, dur: 0.3, color: sk.color });
    later(0.05, () => addEffect({ type: 'slash', x: bc.x, y: bc.y, ang: 2.6, len: 64, w: 8, dur: 0.3, color: '#ffffff' }));
    particles(bc.x, bc.y, { count: 18, color: [sk.color, '#ffffff', '#c9b8ff'], speed: [90, 240], life: [0.2, 0.45], size: [1.5, 3], shape: 'spark', drag: 5 });
    shakeScreen(4);
    hitStop(0.05);
    hitMonster(t, sk.dmg * pw, { skill: sk.id, critBonus: sk.critBonus, stun: sk.stun, heavy: true, vfxColor: '#cfe8ff' });
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
      pierce: sk.pierce, chain: sk.chain || 0, poison: sk.poison, stun: sk.stun, style: sk.style, skill: sk.id
    });
  },

  // Blitz schlägt beim Ziel ein
  blast(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    const x = t ? t.x : p.x + p.facing.x * 120;
    const y = t ? t.y : p.y + p.facing.y * 120;
    if (t) faceTowards(t.x, t.y);
    if (sk.fx === 'poison') {
      // Giftwolke statt Blitz
      later(0.1, () => {
        addEffect({ type: 'ring', x, y, r: sk.radius, dur: 0.5, color: '#8fd16a', width: 8, grow: true });
        addEffect({ type: 'decal', kind: 'splash', x, y, r: sk.radius * 0.7, dur: 3, color: '#3a6a2a' });
        particles(x, y - 8, { count: 36, color: ['#8fd16a', '#5a8a3a', '#c6f08a'], speed: [30, 120], life: [0.8, 1.4], size: [5, 10], drag: 2, glow: false, jitter: sk.radius * 0.5 });
        for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, poison: sk.poison, vfxColor: '#c6f08a' });
      });
      return;
    }
    const bolts = sk.fx === 'storm' ? 6 : 1;
    for (let k = 0; k < bolts; k++) {
      later(k * 0.08, () => addEffect({ type: 'bolt', x: x + (k ? rand(-sk.radius, sk.radius) * 0.7 : 0), y: y + (k ? rand(-sk.radius, sk.radius) * 0.4 : 0), dur: 0.45, color: '#cfe8ff' }));
    }
    later(0.12, () => {
      addEffect({ type: 'ring', x, y, r: sk.radius, dur: 0.4, color: '#9fd0ff', width: 8 });
      particles(x, y - 10, { count: 30 * Math.min(2, bolts), color: ['#cfe8ff', '#9fd0ff', '#ffffff'], speed: [120, 300], life: [0.15, 0.4], size: [1.5, 2.5], shape: 'spark', drag: 5 });
      shakeScreen(bolts > 1 ? 8 : 6);
      hitStop(0.05);
      for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, vfxColor: '#cfe8ff' });
    });
  },

  // Blizzard (seit 7.7): am gewählten Ort (Zielkreis) tobt ein Schneesturm, jede Welle trifft alle im Kreis
  // und verlangsamt sie
  blizzard(sk, pw) {
    const p = game.player;
    const pt = skillAimPoint(sk);
    faceTowards(pt.x, pt.y);
    startSwing(p, 'cast', 0.35);
    blizzardFx(pt.x, pt.y, sk, (last) => {
      shakeScreen(last ? 4 : 1.2);
      for (const m of enemiesInCircle(pt.x, pt.y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, heavy: last, vfxColor: '#dff4ff' });
    });
  },

  // Drache (Blitzdrache, früher Glutdrache): fliegt zum Ziel (oder in Blickrichtung) und entlädt sich dort
  dragon(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (t) faceTowards(t.x, t.y);
    const tx = t ? t.x : p.x + p.facing.x * sk.range * 0.7;
    const ty = t ? t.y : p.y + p.facing.y * sk.range * 0.7;
    startSwing(p, 'cast', 0.3);
    dragonFx(p, tx, ty, sk, () => {
      shakeScreen(4);
      hitStop(0.04);
      for (const m of enemiesInCircle(tx, ty, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: sk.burn, heavy: true, vfxColor: sk.element === 'blitz' ? '#cfe8ff' : '#ffd08a' });
    });
  },

  // Drachenwirbel: mehrere Runden um die Figur, jede trifft alle im Umkreis, die letzte schleudert weg
  vortex(sk, pw) {
    const p = game.player;
    vortexFx(p, sk, (h, last) => {
      if (p.dead) return;
      if (last) shakeScreen(5);
      for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
        hitMonster(m, sk.dmg * pw, { skill: sk.id, knockback: last ? sk.knockback : 0, burn: last ? sk.burn : null, heavy: last, vfxColor: '#ffd08a' });
      }
    });
  },

  buff(sk, pw, lvl) {
    const p = game.player;
    const c = CLASSES[p.classId];
    applyBuff(sk, lvl);
    if (sk.nextHitMul) p.nextHitMul = sk.nextHitMul;
    if (sk.shield) {
      p.shield = Math.round(game.stats.maxHp * sk.shield * buffScale(lvl));
      p.shieldUntil = game.time + skillDuration(sk, lvl);
      particles(p.x, feetY(p) - 20, { count: 16, color: '#ddd5bb', speed: [60, 140], life: [0.4, 0.7], size: [2, 4], shape: 'square', glow: false });
    }
    if (sk.effects && sk.effects.invisible) {
      p.stealthAt = game.time;
      for (const m of game.monsters) {
        if (m.target === p) { m.state = 'return'; m.target = null; }
      }
      particles(p.x, feetY(p) - 14, { count: 30, color: ['#5a5466', '#3d3848', '#8a8496'], speed: [20, 70], life: [0.5, 0.9], size: [5, 9], jitter: 10, drag: 2, glow: false });
    } else {
      vfxPillar(p, c.trim);
    }
    ui.log(sk.name + ' ist aktiv (' + skillDuration(sk, lvl) + ' s).', 'info');
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
      // ohne Ziel: ein roter Strahl ins Leere
      const b = bodyCenter(p);
      particles(b.x + p.facing.x * 20, b.y + p.facing.y * 12, { count: 14, color: ['#ff6a7a', '#c43a5a'], angle: Math.atan2(p.facing.y, p.facing.x), spread: 0.35, speed: [120, 260], life: [0.25, 0.45], size: [2, 3.5], drag: 2 });
      return;
    }
    faceTowards(t.x, t.y);
    const dmg = hitMonster(t, sk.dmg * pw, { skill: sk.id, vfxColor: '#ff6a7a' });
    const heal = Math.round(dmg * sk.heal);
    p.hp = Math.min(game.stats.maxHp, p.hp + heal);
    addText(p.x, p.y - 40, '+' + heal, 'heal');
    const bc = bodyCenter(t);
    addEffect({ type: 'beam', x: bc.x, y: bc.y, follow2: p, dur: 0.45, color: '#c43a5a' });
    const pc = bodyCenter(p);
    const ang = Math.atan2(pc.y - bc.y, pc.x - bc.x);
    particles(bc.x, bc.y, { count: 16, color: ['#ff6a7a', '#c43a5a'], angle: ang, spread: 0.3, speed: [dist(t, p) * 1.6, dist(t, p) * 2.6], life: [0.3, 0.45], size: [2, 3.5], drag: 0.5 });
  },

  // Totenbeschwörung (seit 8.5): drei Diener nach Rang – Skelettkrieger, ab E1 Knochenhunde (Werte in sk.tiers)
  summon(sk, pw, lvl) {
    const p = game.player;
    const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
    const T = sk.tiers[ti];
    // alte Diener zerfallen sichtbar
    for (const a of game.allies) allyCrumble(a);
    game.allies = [];
    releaseAllyTargets();
    const life = skillDuration(sk, lvl);
    const pts = [];
    const fa = Math.atan2(p.facing.y, p.facing.x);
    for (let k = 0; k < sk.count; k++) {
      // im Halbkreis vor der Figur
      const ang = fa + (k - 1) * 0.9;
      let x = p.x + Math.cos(ang) * 40;
      let y = p.y + Math.sin(ang) * 26;
      if (!canStand(x, y, 10, false)) { x = p.x; y = p.y; }
      // Zahlen-ID (nie Text): animateCreature rechnet mit e.id, Text ergab NaN-Knochen in 3D
      const a = Object.assign({ id: nextAllyId++, ally: true, slot: k, x, y }, allyTierStats(sk, lvl, k), {
        born: game.time + k * 0.12, rise: 0.6, until: game.time + life,
        target: null, cd: 0.4 + k * 0.15, pounceCd: 0, windup: 0, attackAnim: 0, swing: 0, facing: 1, moving: false, leap: null
      });
      a.hp = a.maxHp;
      game.allies.push(a);
      later(k * 0.12, () => allyRiseFx(x, y, T.kind));
      pts.push([Math.round(x), Math.round(y)]);
    }
    ui.log('Drei ' + (T.kind === 'hund' ? T.name.replace('hund', 'hunde') : 'Skelettkrieger') + ' erheben sich aus dem Boden.', 'info');
    return { k: ti, pts };
  },

  curse(sk, pw, lvl) {
    const p = game.player;
    const scale = buffScale(lvl);
    const dur = skillDuration(sk, lvl);
    const col = sk.color || '#a774e0';
    addEffect({ type: 'runes', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.8, color: col });
    const fx = SKILL_FX[sk.id];
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      // Farbe der Fluchrune über dem Kopf (Zustand in 3D)
      m.vulnerable = { mul: 1 + sk.vulnerable * scale, until: game.time + dur, color: col };
      if (fx && fx.curseHit) fx.curseHit(m, sk);
      const bc = bodyCenter(m);
      particles(bc.x, bc.y - 20, { count: 8, color: [col, darker(col, 0.4)], angle: Math.PI / 2, spread: 0.3, speed: [40, 90], life: [0.4, 0.6], size: [2, 3] });
      if (!m.isStone) {
        m.slow = { mul: 1 - sk.slow, until: game.time + dur };
        if (sk.stun) m.stun = Math.max(m.stun, sk.stun);
        aggro(m, p);
      }
      if (net.mode === 'client' && !m.duelProxy) netClientDamage(m, 0, false, false);
    }
  },

  // Schädelsalve (seit 8.5): drei brennende Schädel im Fächer, jeder biegt im Flug zu einem eigenen Ziel ab
  skulls(sk, pw) {
    const p = game.player;
    const main = pickTarget(sk.range);
    if (main) faceTowards(main.x, main.y);
    const fa = Math.atan2(p.facing.y, p.facing.x);
    const ts = [];
    if (main) {
      // bis zu zwei Nachbarn des Hauptziels, fehlende Plätze gehen auch aufs Hauptziel
      const near = aliveEnemies()
        .filter((m) => m !== main && dist(m, main) < sk.spreadR && dist(m, p) < sk.range + 40)
        .sort((a, b) => dist(a, main) - dist(b, main));
      for (let k = 0; k < sk.count; k++) ts.push(k && near[k - 1] ? near[k - 1] : main);
      // jeder Schädel nimmt das Ziel auf seiner Seite des Fächers (keine gekreuzten Bahnen)
      const side = (m) => {
        const d = Math.atan2(m.y - p.y, m.x - p.x) - fa;
        return Math.atan2(Math.sin(d), Math.cos(d));
      };
      ts.sort((a, b) => side(a) - side(b));
    }
    const salve = { duel: 0, extra: sk.duelExtra };
    const pts = [];
    for (let k = 0; k < sk.count; k++) {
      const tk = ts[k] || null;
      const a = fa + (k - (sk.count - 1) / 2) * sk.fan;
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      pts.push(tk ? [Math.round(tk.x), Math.round(tk.y)] : [Math.round(p.x + dir.x * sk.range), Math.round(p.y + dir.y * sk.range)]);
      later(k * 0.06, () => {
        if (p.dead) return;
        spawnProjectile({ owner: 'player', x: p.x, y: p.y, target: tk, dir, turn: tk ? sk.turn : 0, speed: sk.speed, range: sk.range + 80, mul: sk.dmg * pw, color: sk.color, radius: 8, style: 'skullfire', skill: sk.id, salve });
      });
    }
    return { ts: pts };
  },

  // Seelenkäfig (seit 8.5): beim Ziel bricht ein Rippenkäfig aus dem Boden, der Geist darin schreit jede Sekunde
  cage(sk, pw) {
    const p = game.player;
    const t = pickTarget(sk.range);
    if (t) faceTowards(t.x, t.y);
    const dir = { ...p.facing };
    let x = t ? t.x : p.x + dir.x * sk.place;
    let y = t ? t.y : p.y + dir.y * sk.place;
    // Wand, Wasser oder Lava: auf der Linie zur Figur zurückziehen
    if (!canStand(x, y, 10, false)) {
      const len = clearLen(p.x, p.y, dir, Math.hypot(x - p.x, y - p.y), 10);
      x = p.x + dir.x * len;
      y = p.y + dir.y * len;
    }
    lockPlayer(p, sk.lock);
    input.walkTo = null;
    cageFx(p, x, y, sk, (k, last) => {
      // Kartenwechsel, Reise oder Tod: der Käfig schreit nicht weiter
      if (p.dead || Math.hypot(p.x - x, p.y - y) > sk.range + 400) return false;
      shakeScreen(last ? 3 : 1);
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        // der erste Schrei zieht heran (negativer Rückstoß, nicht bei Bossen)
        const pull = k === 0 && !(m.type && m.type.boss) ? { knockback: -sk.pull, from: { x, y } } : {};
        hitMonster(m, sk.dmg * pw, { skill: sk.id, slow: sk.slow, heavy: last, vfxColor: '#c6f5a0', ...pull });
      }
      return true;
    });
    return { tx: Math.round(x), ty: Math.round(y) };
  },

  // Seelenschnitter (seit 8.5): ein Schnitter erhebt sich neben der Figur und mäht einmal schwer vor ihr durch.
  // Getroffene tragen sein Mal (verwundbar und langsamer); der Host bekommt es mit dem Treffer (netClientDamage).
  reaper(sk, pw, lvl) {
    const p = game.player;
    const t = pickTarget(sk.radius + 40);
    if (t) faceTowards(t.x, t.y);
    const dir = { ...p.facing };
    const ang = Math.atan2(dir.y, dir.x);
    lockPlayer(p, sk.lock);
    input.walkTo = null;
    reaperFx(p, ang, sk);
    later(sk.hitAt, () => {
      if (p.dead) return;
      for (const m of enemiesInCone(p.x, p.y, dir, sk.radius, sk.angle)) {
        // erst das Mal setzen, dann treffen (der Treffer nimmt die Zustände mit zum Host)
        if (!m.isStone && !m.duelProxy) {
          m.vulnerable = { mul: 1 + sk.mark.vulnerable * buffScale(lvl), until: game.time + sk.mark.duration, color: sk.color };
          m.slow = { mul: 1 - sk.mark.slow, until: game.time + sk.mark.slowDur };
        }
        hitMonster(m, sk.dmg * pw, { skill: sk.id, heavy: true, vfxColor: '#e0ffd0' });
        aggro(m, p);
      }
      shakeScreen(5);
      hitStop(0.05);
    });
    return { a: Math.round(ang * 100) / 100 };
  }
};

// Ablauf des Sturmangriffs, wird jeden Frame aus spiel.js aufgerufen
function updateDash(dt) {
  withRank(game.player.dash.rank != null ? game.player.dash.rank : -1, () => dashStep(dt));
}
function dashStep(dt) {
  const p = game.player;
  const d = p.dash;
  // Sprungschlag: Hocke, Flug auf vorab geprüfter Bahn, Landung, Landehocke
  if (d.leap) {
    const now = game.time;
    if (p.dead) {
      p.dash = null;
      p.leap = null;
      return;
    }
    if (now < d.t0) return;
    if (!d.smoked) {
      d.smoked = true;
      addEffect({ type: 'smoke3', x: p.x, y: feetY(p), count: 4, color: '#8a7458', size: 0.6, dur: 0.5 });
    }
    if (!d.landed) {
      // von außen versetzt (Tor, Reise, Dungeon): Sprung abbrechen statt zurückzuziehen
      if (d.px != null && Math.hypot(p.x - d.px, p.y - d.py) > 40) {
        p.dash = null;
        p.leap = null;
        return;
      }
      let k = Math.min(1, (now - d.t0) / d.dur);
      const tx = d.x0 + (d.x1 - d.x0) * k;
      const ty = d.y0 + (d.y1 - d.y0) * k;
      const mx = tx - p.x;
      const my = ty - p.y;
      // zweite Sicherung: blockiert der Weg doch, landet die Figur sofort
      if ((mx || my) && !moveEntity(p, mx, my, false)) k = 1;
      d.px = p.x;
      d.py = p.y;
      if (now >= d.trailAt) {
        d.trailAt = now + 0.04;
        particles(p.x, feetY(p) - 30, { count: 2, color: ['#e8dcc0', '#ffffff'], angle: Math.atan2(-(d.y1 - d.y0), -(d.x1 - d.x0)), spread: 0.3, speed: [60, 120], life: [0.15, 0.25], size: [1.5, 2.5], shape: 'spark', drag: 3 });
      }
      if (k >= 1) {
        d.landed = true;
        leapLand(p, d);
      }
    } else if (now >= d.until) p.dash = null;
    return;
  }
  // kurze Sperre während einer Fertigkeit (Sichelwelle, Felsenfaust)
  if (d.lock) {
    if (game.time >= d.until || p.dead) p.dash = null;
    return;
  }
  const step = Math.min(d.left, d.speed * dt);
  const moved = moveEntity(p, d.dx * step, d.dy * step, false);
  d.left -= step;
  const dir = facingDir(p.facing);
  addEffect({ type: 'afterimage', sprite: characterSprite(p.classId, dir, 1, playerLook(p)), x: p.x, y: feetY(p), flip: dir === 'side' && p.facing.x < 0, dur: 0.3, tint: d.sk.tint || '#ff7a2a' });
  skillPhaseFx(d.sk.id, 'trail');
  particles(p.x, feetY(p), { count: 2, color: ['#a88f62', '#c9b28a'], speed: [20, 60], life: [0.3, 0.5], size: [2, 4], drag: 3, glow: false });
  for (const m of enemiesInCircle(p.x, p.y, d.sk.radius)) {
    if (d.hit.has(m.id)) continue;
    d.hit.add(m.id);
    hitMonster(m, d.sk.dmg * d.pw, { skill: d.sk.id, stun: d.sk.stun, knockback: 60, heavy: true });
  }
  if (d.left <= 0 || !moved) {
    p.dash = null;
    shakeScreen(4);
    skillPhaseFx(d.sk.id, 'end');
  }
}

// --- Geschosse --------------------------------------------------------------------

function spawnProjectile(o) {
  let dx;
  let dy;
  // mit turn (Kurvenflug, seit 8.5) kommt die Startrichtung aus o.dir, nicht aus dem Ziel
  const goal = o.turn ? null : (o.target || o.aimAt);
  if (goal) {
    dx = goal.x - o.x;
    dy = goal.y - o.y;
  } else {
    dx = o.dir.x;
    dy = o.dir.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  game.projectiles.push({
    hit: new Set(), traveled: 0, pierce: false, chain: 0, radius: 6, trail: [], rank: fxRank,
    ...o,
    vx: dx / len, vy: dy / len
  });
}

function updateProjectiles(dt) {
  const p = game.player;
  for (const pr of game.projectiles) {
    // Treffer eines Geschosses sehen aus wie seine Fertigkeit (Rang beim Abschuss)
    fxRank = pr.owner === 'player' && pr.rank >= 0 ? pr.rank : -1;
    const goal = pr.target && !pr.target.dead ? pr.target : pr.homeTo;
    if (goal) {
      const dx = goal.x - pr.x;
      const dy = goal.y - pr.y;
      const len = Math.hypot(dx, dy) || 1;
      // Kurvenflug: höchstens turn rad/s drehen. Nahfang: unter 70 px oder nach 0,35 s Flug lenkt das Geschoss
      // direkt ein (sonst kreisen Schädel um Gegner im Nahkampf und verfallen)
      if (pr.turn && len > 70 && pr.traveled < pr.speed * 0.35) {
        const want = Math.atan2(dy, dx);
        const cur = Math.atan2(pr.vy, pr.vx);
        let d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        d = Math.max(-pr.turn * dt, Math.min(pr.turn * dt, d));
        pr.vx = Math.cos(cur + d);
        pr.vy = Math.sin(cur + d);
      } else {
        pr.vx = dx / len;
        pr.vy = dy / len;
      }
      // fremde Schädel (homeTo): am Zielpunkt angekommen geradeaus weiter statt dort zu zittern
      if (goal === pr.homeTo && len < pr.speed * dt + 4) pr.homeTo = null;
    }
    const step = pr.speed * dt;
    pr.x += pr.vx * step;
    pr.y += pr.vy * step;
    pr.traveled += step;
    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 9) pr.trail.shift();
    if (pr.traveled > pr.range) { pr.done = true; continue; }

    // Geschosse von Mitspielern: nur zum Ansehen, sie enden am ersten Monster
    if (pr.owner === 'remote') {
      for (const m of game.monsters) {
        if (m.dead || Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.done = true;
        if (pr.onRemoteHit) pr.onRemoteHit(m);
        else vfxImpact(m, false, pr.color);
        break;
      }
      continue;
    }
    if (pr.owner === 'player') {
      // Duellgegner: Geschosse treffen auch ihn
      const foe = duelFighting() ? game.duel.proxy : null;
      if (foe && !pr.hit.has('duel') && Math.hypot(foe.x - pr.x, foe.y - pr.y) < foe.r + pr.radius) {
        pr.hit.add('duel');
        // Schädelsalve im Duell: der erste Schädel voll, jeder weitere nur mit duelExtra (zusammen 1,5×)
        const mul = pr.mul * (pr.salve && pr.salve.duel++ > 0 ? pr.salve.extra : 1);
        const hm = pr.hitMul ? pr.hitMul(foe) : 1;
        hitMonster(foe, mul * hm, { stun: pr.stun, slow: pr.slow, burn: pr.burn, vfxColor: pr.color, skill: pr.skill, basic: pr.basic, duelMul: pr.duelMul });
        if (pr.afterHit) pr.afterHit(foe, pr);
        if (!pr.pierce) { pr.done = true; continue; }
      }
      // Kurvenflug (Schädelsalve): trifft nur sein eigenes Ziel, solange es lebt (fliegt an anderen vorbei)
      const only = pr.turn && pr.target && !pr.target.dead ? pr.target : null;
      for (const m of game.monsters) {
        if (m.dead || pr.hit.has(m.id) || (only && m !== only)) continue;
        if (Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.hit.add(m.id);
        // Haken der Magier-Geschosse (seit 8.6): Zerspringen und Entladung (hitMul), Splitter und Einschlag (afterHit)
        const hm = pr.hitMul ? pr.hitMul(m) : 1;
        hitMonster(m, pr.mul * hm, {
          poison: pr.poison, stun: pr.stun, slow: pr.slow, burn: pr.burn, knockback: pr.knockback,
          from: pr.knockback ? { x: pr.x - pr.vx * 20, y: pr.y - pr.vy * 20 } : null,
          vfxColor: pr.color, skill: pr.skill, basic: pr.basic, duelMul: pr.duelMul
        });
        if (pr.afterHit) pr.afterHit(m, pr);
        if (pr.poison) particles(m.x, feetY(m) - 16, { count: 12, color: ['#8fd16a', '#5a8a3a'], speed: [10, 40], life: [0.5, 0.9], size: [3, 6], drag: 2 });
        if (pr.chain > 0) {
          const next = aliveEnemies()
            .filter((o) => !pr.hit.has(o.id) && dist(o, m) < (pr.chainR || 180))
            .sort((a, b) => dist(a, m) - dist(b, m))[0];
          if (next) {
            const a = bodyCenter(m);
            const b = bodyCenter(next);
            addEffect({ type: 'chain', x: a.x, y: a.y, x2: b.x, y2: b.y, dur: 0.25, color: pr.color });
            // jeder Sprung schwächer (Kettenblitz −20 %)
            if (pr.chainMul) pr.mul *= pr.chainMul;
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
          if (!game.stats.invisible) damagePlayer(calcDamage(pr.atk, levelBonus(pr.source.level, p.level), game.stats.def, 0.03, pr.source.level).amount, pr.source);
        } else {
          damageAlly(v, calcDamage(pr.atk, 1, v.def, 0, pr.source.level).amount);
        }
        break;
      }
    }
  }
  fxRank = -1;
  game.projectiles = game.projectiles.filter((pr) => !pr.done);
}
