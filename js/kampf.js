// Kampf: Schaden berechnen, normale Angriffe, Fertigkeiten, Geschosse, Effekte.

// Jede Stufe macht eine Fertigkeit stärker:
// Schaden bis Stufe 17 +8 % je Stufe, in den Rängen +5 % je Stufe, dazu ein Sprung bei jedem neuen Rang.
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
  p.lastCombat = game.time;
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
    spawnProjectile({ owner: 'player', x: p.x, y: p.y, target, dir: target ? null : { ...p.facing }, speed: basic.style === 'arrow' ? 620 : 480, range: basic.range + 60, mul: 1, color: basic.color, radius: 5, style: basic.style, basic: true });
    netSkillFx('_shot', basic.range, { c: basic.color, st: basic.style });
  } else {
    p.combo = ((p.combo || 0) + 1) % 3;
    startSwing(p, 'combo', p.combo === 2 ? 0.24 : 0.28);
    vfxSwing(p, c.trim);
    if (target) hitMonster(target, p.combo === 2 ? 1.25 : 1, { vfxColor: c.trim, basic: true });
  }
  return true;
}

// --- Fertigkeiten -----------------------------------------------------------------

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
  if (p.mp < sk.mp) {
    addText(p.x, p.y - 34, 'Zu wenig Mana', 'info');
    return;
  }
  if (p.riding) toggleRide(false);
  const lvl = p.skillLevels[i];
  const rank = skillRank(lvl);
  const ok = withRank(rank, () => SKILL_TYPES[sk.type](sk, dmgScale(lvl) * (game.stats.skillDmg || 1), lvl));
  if (ok === false) return;
  withRank(rank, () => skillCastFx(sk));
  if (rank >= 0) rankCastFx(p, rank, SKILL_RANKS[rank].color);
  p.mp -= sk.mp;
  p.skillCd[i] = sk.cooldown;
  netSkillFx(sk.id);
  // Buffs, Heilung, Beschwörung und Flüche: kurze Kraftpose mit Lichtringen
  if (sk.type === 'buff' || sk.type === 'heal' || sk.type === 'summon' || sk.type === 'curse') {
    startSwing(p, 'pose', 0.7);
    p.poseColor = skillColor(sk, CLASSES[p.classId].trim);
    vfxPowerUp(p, p.poseColor);
  } else {
    startSwing(p, 'skill', 0.34);
  }
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

// Spätere Schritte einer Fertigkeit behalten ihren Rang (Aussehen je Rang, siehe fxRank)
function later(delay, fn) {
  const r = fxRank;
  game.timers.push({ at: game.time + delay, fn: r >= 0 ? () => withRank(r, fn) : fn });
}

function applyBuff(sk, lvl) {
  const p = game.player;
  const scale = buffScale(lvl);
  const effects = {};
  for (const [k, v] of Object.entries(sk.effects || {})) effects[k] = typeof v === 'number' ? v * scale : v;
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
        until: game.time + skillDuration(sk, lvl), target: null, cd: 0, facing: 1, swing: 0
      });
      addEffect({ type: 'runes', x, y: y + 8, r: 22, dur: 0.9, color: '#a7e37f' });
      particles(x, y + 6, { count: 14, color: ['#ddd5bb', '#a7e37f'], angle: -Math.PI / 2, spread: 0.6, speed: [60, 140], life: [0.4, 0.7], size: [2, 3.5], shape: 'square', gravity: 200 });
    }
    ui.log(sk.count + ' Skelette erheben sich aus dem Boden.', 'info');
  },

  curse(sk, pw, lvl) {
    const p = game.player;
    const scale = buffScale(lvl);
    const dur = skillDuration(sk, lvl);
    const col = sk.color || '#a774e0';
    addEffect({ type: 'runes', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.8, color: col });
    for (const m of enemiesInCircle(p.x, p.y, sk.radius)) {
      m.vulnerable = { mul: 1 + sk.vulnerable * scale, until: game.time + dur };
      const bc = bodyCenter(m);
      particles(bc.x, bc.y - 20, { count: 8, color: [col, darker(col, 0.4)], angle: Math.PI / 2, spread: 0.3, speed: [40, 90], life: [0.4, 0.6], size: [2, 3] });
      if (!m.isStone) {
        m.slow = { mul: 1 - sk.slow, until: game.time + dur };
        if (sk.stun) m.stun = Math.max(m.stun, sk.stun);
        aggro(m, p);
      }
      if (net.mode === 'client' && !m.duelProxy) netClientDamage(m, 0, false, false);
    }
  }
};

// Ablauf des Sturmangriffs, wird jeden Frame aus spiel.js aufgerufen
function updateDash(dt) {
  withRank(game.player.dash.rank != null ? game.player.dash.rank : -1, () => dashStep(dt));
}
function dashStep(dt) {
  const p = game.player;
  const d = p.dash;
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

    // Geschosse von Mitspielern: nur zum Ansehen, sie enden am ersten Monster
    if (pr.owner === 'remote') {
      for (const m of game.monsters) {
        if (m.dead || Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.done = true;
        vfxImpact(m, false, pr.color);
        break;
      }
      continue;
    }
    if (pr.owner === 'player') {
      // Duellgegner: Geschosse treffen auch ihn
      const foe = duelFighting() ? game.duel.proxy : null;
      if (foe && !pr.hit.has('duel') && Math.hypot(foe.x - pr.x, foe.y - pr.y) < foe.r + pr.radius) {
        pr.hit.add('duel');
        hitMonster(foe, pr.mul, { vfxColor: pr.color, skill: pr.skill, basic: pr.basic });
        if (!pr.pierce) { pr.done = true; continue; }
      }
      for (const m of game.monsters) {
        if (m.dead || pr.hit.has(m.id)) continue;
        if (Math.hypot(m.x - pr.x, m.y - pr.y) > m.r + pr.radius) continue;
        pr.hit.add(m.id);
        hitMonster(m, pr.mul, { poison: pr.poison, stun: pr.stun, vfxColor: pr.color, skill: pr.skill, basic: pr.basic });
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
