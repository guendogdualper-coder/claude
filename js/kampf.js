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
// seit 13.86 auch die gegnerischen Spieler in der Turnierarena (pvpFoes, turnierarena.js) – nie das eigene Team
function aliveEnemies() {
  const list = game.monsters.filter((m) => !m.dead);
  if (duelFighting() && !game.duel.proxy.dead) list.push(game.duel.proxy);
  if (typeof pvpFoes === 'function') for (const f of pvpFoes()) list.push(f);
  return list;
}

// Grundformel: Angriff × Faktor, ±10 % Zufall, Verteidigung zieht prozentual ab.
// Je höher die Stufe des Angreifers, desto weniger hilft die gleiche Verteidigung,
// damit Rüstung auf hohen Stufen nicht jeden Treffer schluckt.
function calcDamage(atk, mul, def, critChance, level = 1, critMul = 1.8) {
  let raw = atk * mul * (0.9 + Math.random() * 0.2);
  const crit = Math.random() < critChance;
  if (crit) raw *= critMul;
  const amount = Math.max(1, Math.round(raw * (1 - def / (def + 40 + 5 * (level - 1)))));
  return { amount, crit };
}

// Höherstufige Monster nehmen weniger Schaden: −8 % je Stufe Unterschied, höchstens −75 %
function levelPenalty(attackerLevel, targetLevel) {
  const diff = targetLevel - attackerLevel;
  return diff > 0 ? Math.max(0.25, 1 - 0.08 * diff) : 1;
}

// Und sie treffen härter: +7 % je Stufe über dir, höchstens +80 %.
// Seit 13.20 auch umgekehrt: Monster unter deiner Stufe treffen 3,5 % je Stufe schwächer, höchstens −70 %
// (ein Lv-70-Spieler nimmt von Lv-50-Monstern, etwa aus den Wellen eines Seelensteins, nur noch 30 % Schaden)
function levelBonus(attackerLevel, targetLevel) {
  const diff = attackerLevel - targetLevel;
  if (diff > 0) return 1 + Math.min(0.8, 0.07 * diff);
  // seit 13.31 stärker gedämpft: 20 Stufen darunter nur noch 20 % Schaden (Lv 70 gegen Steine der Stufe 50)
  return Math.max(0.2, 1 + 0.04 * diff);
}

// --- Monsterarten (seit 14.15) ----------------------------------------------
// Für die Boni „Stark gegen …“ und „Abwehr gegen Menschen“. Die Art folgt der Gestalt (shape); wo die Gestalt täuscht
// (Untote in Menschengestalt, Knochenwolf, Höllenhund, Höllenthron-Wächter), steht die Kennung in MONSTER_KIND_IDS.
// Bosse, Instanz-Gegner und Nachtmonster mit Vorlage (type.look) erben die Art ihrer Vorlage, Seelensteine die Art
// der Monster ihres Gebiets (die ersten Monster der Zone bzw. der Dungeon-Boss), andere Spieler sind Menschen.
const MONSTER_KINDS = {
  beast: { name: 'Tiere', bonus: 'vsBeast' },
  human: { name: 'Menschen', bonus: 'vsHuman' },
  orc: { name: 'Orks und Riesen', bonus: 'vsOrc' },
  undead: { name: 'Untote und Geister', bonus: 'vsUndead' },
  demon: { name: 'Teufel und Dämonen', bonus: 'vsDemon' }
};
const SHAPE_KINDS = { beast: 'beast', boar: 'beast', snake: 'beast', humanoid: 'human', orc: 'orc', brute: 'orc', golem: 'orc', ghost: 'undead', demon: 'demon' };
const MONSTER_KIND_IDS = {
  untoter: 'undead', grabwaechter: 'undead', gruftkoenig: 'undead', morrak: 'undead', ghul: 'undead', knochenwolf: 'undead',
  hoellenhund: 'demon', zerberos: 'demon', gorvoth: 'demon', lilith: 'demon', molgrath: 'demon', belzarek: 'demon',
  raidkristall: null
};
function monsterTypeKind(id) {
  for (let k = 0; k < 4 && id; k++) {
    if (id in MONSTER_KIND_IDS) return MONSTER_KIND_IDS[id];
    const t = MONSTER_TYPES[id];
    if (!t) return null;
    if (t.crystal) return null;
    if (t.look && t.look !== id && MONSTER_TYPES[t.look]) { id = t.look; continue; }
    return SHAPE_KINDS[t.shape] || null;
  }
  return null;
}
function monsterKind(m) {
  if (!m) return null;
  if (m.duelProxy) return 'human';
  if (m._kind !== undefined) return m._kind;
  let kind = null;
  if (m.isStone) {
    const z = m.zone;
    const id = z && z.dungeon ? z.dungeon.boss : z && z.groups && z.groups[0] ? z.groups[0][0] : null;
    kind = monsterTypeKind(id);
  } else kind = monsterTypeKind(m.typeId);
  m._kind = kind;
  return kind;
}
// Zusatzschaden aus „Stark gegen …“ gegen dieses Ziel (Spieler: nur gegen Menschen, andere Spieler zählen dazu)
function kindDmgBonus(s, m) {
  const k = MONSTER_KINDS[monsterKind(m)];
  return k ? s[k.bonus] || 0 : 0;
}
// Art eines Monsterangriffs auf die Figur: Zauber (s), Fernkampf (r) oder Nahkampf (m). Zaubernde Monster sind die
// Fernkämpfer ohne Bogen, die keine Tiere sind (Ork-Schamane, Frostgeist, Sumpfhexe, Harpyie …); Tiere spucken oder
// speien (Fernkampf).
function monsterAttackKind(m) {
  const t = m && m.type;
  if (!t || !t.ranged) return 'm';
  if (t.bow || monsterKind(m) === 'beast') return 'r';
  return 's';
}
// Abwehr der Figur gegen einen Treffer dieser Art (Summe; ohne Deckel, den setzt der Aufrufer)
function attackResist(s, kind, human) {
  return (kind === 's' ? s.resMagic || 0 : kind === 'r' ? s.resRanged || 0 : s.resMelee || 0) + (human ? s.resHuman || 0 : 0);
}

// --- Gift aus der Ausrüstung (seit 14.15) ---------------------------------------------
// Vergiftungschance (Bonus der Waffe): jeder Treffer vergiftet mit dieser Chance. 6 s, ein Tick je Sekunde,
// zusammen 40 % des auslösenden Treffers. Gegen Bosse, Endboss-Kristalle und Seelensteine höchstens 2 % ihres Lebens.
// Stapelt nicht: ein neues Gift erneuert die Dauer und behält den höheren Tickwert. Im PvP je Tick höchstens 1,5 %
// des Lebens des Getroffenen (PVP_DMG.toxinTick). Getrennt vom Gift der Fertigkeiten (m.poison): m.toxin bzw. p.toxin.
const TOXIN = { dur: 6, share: 0.4, bossCap: 0.02, color: '#7ee05a' };
const toxinBossLike = (m) => !!(m.isStone || (m.type && (m.type.boss || m.type.raid || m.type.raidBoss || m.type.crystal || m.type.inst)));
function applyToxin(m, hit) {
  if (!m || m.dead || !(hit > 0)) return;
  let dps = (hit * TOXIN.share) / TOXIN.dur;
  if (toxinBossLike(m)) dps = Math.min(dps, (m.maxHp * TOXIN.bossCap) / TOXIN.dur);
  dps = Math.max(1, Math.round(dps));
  const old = m.toxin && m.toxin.until > game.time ? m.toxin : null;
  m.toxin = { dps: old ? Math.max(old.dps, dps) : dps, until: game.time + TOXIN.dur, tick: old ? old.tick : 0 };
}

// Mehr Gold (Bonus): Gold von Monstern, Bossen und Seelensteinen (nicht Aufträge oder Arena)
function monsterGold(g) {
  const f = (game.stats && game.stats.goldFind) || 0;
  return f > 0 ? Math.round(g * (1 + f)) : g;
}
// Mehr Beute (Bonus): Chance einer Beute (Ausrüstung, Tränke, Monsterteile)
function dropChance(c) {
  const f = (game.stats && game.stats.dropFind) || 0;
  return f > 0 ? c * (1 + f) : c;
}
// … und eine Anzahl (zufällig auf- oder abgerundet, im Mittel n × (1 + Bonus)); ohne Bonus unverändert
function dropCount(n) {
  const f = (game.stats && game.stats.dropFind) || 0;
  if (!(f > 0) || !(n > 0)) return n;
  const x = n * (1 + f);
  return Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
}

// --- Ziele ----------------------------------------------------------------

// seit 13.85: Seelensteine nur, wenn kein Monster in Reichweite ist – vorher nahm das Spiel oft den Stein
// (auch beim Sprungschlag), obwohl die Monster seiner Welle direkt vor der Figur standen.
// Gleich weit weg: Monster vor der Figur (Blickrichtung) zählen etwas näher als solche hinter ihr.
function nearestEnemy(from, range) {
  let best = null;
  let bestD = Infinity;
  let stone = null;
  let stoneD = Infinity;
  const f = from === game.player && from.facing ? from.facing : null;
  for (const m of aliveEnemies()) {
    if (m.dead) continue;
    if (m.hidden) continue;
    const raw = dist(from, m) - m.r;
    if (raw > range) continue;
    if (m.isStone) {
      if (raw < stoneD) { stone = m; stoneD = raw; }
      continue;
    }
    // seit 13.85: bis zu 20 Punkte Vorteil für Gegner vor der Figur
    let d = raw;
    if (f) {
      const l = Math.max(1, dist(from, m));
      d -= 10 * ((m.x - from.x) * f.x + (m.y - from.y) * f.y) / l;
    }
    if (d < bestD) { best = m; bestD = d; }
  }
  return best || stone;
}

// Ziel bewusst gewählt (Antippen, Klick, Tab, Duell)? Nur so ein Ziel bleibt als Fokus stehen (seit 13.85).
// Ein Ziel, das das Spiel selbst gewählt hat, wechselt zum nächsten Monster, sobald es außer Reichweite ist
// oder ein Seelenstein ist, während ein Monster in Reichweite steht.
// game.targetManual hält das bewusst gewählte Monster selbst (nicht nur ein Ja/Nein), damit ein später direkt
// gesetztes game.target nie versehentlich als Fokus gilt
function setTarget(m, manual) {
  game.target = m || null;
  game.targetManual = m && manual ? m : null;
}
function targetIsManual(t) {
  return !!t && t === game.target && t === game.targetManual;
}

// Ausgewähltes Ziel, falls in Reichweite, sonst das nächste Monster
function pickTarget(range) {
  const p = game.player;
  const t = game.target;
  if (t && !t.dead && !t.hidden) {
    const manual = targetIsManual(t);
    const inRange = dist(p, t) - t.r <= range;
    // seit 13.85: ein selbst gewählter Seelenstein weicht dem nächsten Monster in Reichweite
    if (inRange && (manual || !t.isStone)) return t;
    if (inRange) {
      const n = nearestEnemy(p, range);
      if (n && !n.isStone) { setTarget(n, false); return n; }
      return t;
    }
    // Fokus bleibt (seit 13.41): Ist das gewählte Ziel außer Reichweite, wird kein anderes Monster gewählt –
    // der Angriff geht in seine Richtung. Erst wenn es sehr weit weg ist, sucht das Spiel ein neues Ziel.
    // Seit 13.85 gilt das nur für bewusst gewählte Ziele; ein Auto-Ziel wechselt zum nächsten Monster in Reichweite.
    if (manual && dist(p, t) < 900) {
      faceTowards(t.x, t.y);
      return null;
    }
  }
  const n = nearestEnemy(p, range);
  if (n) setTarget(n, false);
  else if (t && !t.dead && !t.hidden && dist(p, t) < 900) faceTowards(t.x, t.y);
  return n;
}

function faceTowards(x, y) {
  const p = game.player;
  const dx = x - p.x;
  const dy = y - p.y;
  const len = Math.hypot(dx, dy);
  if (len > 0.01) p.facing = { x: dx / len, y: dy / len };
}

// Blick beim Angreifen (seit 13.85): Jeder Angriff und jeder Zauber dreht die Figur sofort zum Ziel bzw. zum
// gewählten Ort und hält diesen Blick für die Dauer der Bewegung (dur), auch wenn sie dabei weiterläuft –
// erst danach schaut sie wieder in Laufrichtung (kurzes Umdrehen beim Schnellzauber, wie beim Bogen-Ninja).
// at: Monster (folgt ihm) oder Punkt { x, y }
function attackFace(p, at, dur) {
  if (!p || !at || !isFinite(at.x) || !isFinite(at.y)) return;
  faceTowards(at.x, at.y);
  const ent = at.r != null && (at.hp != null || at.isStone || at.duelProxy) ? at : null;
  const until = game.time + Math.max(0.2, dur || 0.45);
  p.faceHold = { x: at.x, y: at.y, t: ent, until: Math.max(until, (p.faceHold && p.faceHold.until) || 0) };
}
// jedes Bild beim Laufen (spiel.js): true = Blick bleibt beim Angriffsziel, nicht in Laufrichtung
function holdFacing(p) {
  const h = p.faceHold;
  if (!h) return false;
  if (game.time >= h.until) {
    p.faceHold = null;
    return false;
  }
  const t = h.t && !h.t.dead && !h.t.hidden ? h.t : null;
  if (t) { h.x = t.x; h.y = t.y; }
  if (Math.hypot(h.x - p.x, h.y - p.y) > 4) faceTowards(h.x, h.y);
  return true;
}
// Fertigkeiten, die selbst bestimmen, wohin die Figur schaut (Sprünge, Schritte, Sprint)
const FACE_FREE_TYPES = new Set(['leap', 'shift', 'bshadow', 'dash', 'chainblink']);
// Wohin schaut die Figur nach dieser Fertigkeit? Gewählter Ort, sonst das Ziel (Fokus oder Auto-Ziel in der Nähe)
function skillFaceAt(sk) {
  const p = game.player;
  if (game.aim && game.aim.sk === sk && !sk.aimAway) return { x: game.aim.pt.x, y: game.aim.pt.y };
  const t = game.target;
  if (t && !t.dead && !t.hidden && dist(p, t) < 900) return t;
  return null;
}

// Blickrichtung für Flächenangriffe: zum nächsten Gegner, sonst Laufrichtung
function aim(range) {
  const t = pickTarget(range);
  if (t) faceTowards(t.x, t.y);
  return game.player.facing;
}

// --- Schaden an Monstern ----------------------------------------------------

// Spieler (oder Skelett mit opts.ally) trifft ein Monster
// Tarnung endet mit jedem Angriff (seit 13.3 auch mit dem Grundangriff, selbst ins Leere, und im Duell);
// kurz nach dem Wirken (STEALTH_GRACE) bleibt sie, damit der Hinterhalt noch daraus springen kann
function breakStealth(p) {
  if (!game.stats || !game.stats.invisible || game.time - (p.stealthAt || -99) < STEALTH_GRACE) return;
  p.buffs = p.buffs.filter((b) => !b.effects.invisible);
  p.nextHitMul = 1;
  game.stats = playerStats(p);
}

// Tarnung (seit 13.39): eine Fertigkeit oder die Ulti aus der Tarnung macht mit ALLEN ihren Treffern den
// Tarnungs-Schaden (nextHitMul, seit 13.85 ×2 statt ×3), nicht nur mit dem ersten Treffer. Ergebnis: Faktor für die Kraft der Fertigkeit.
function stealthCastMul(p) {
  if (!(p.nextHitMul > 1) || !game.stats || !game.stats.invisible) return 1;
  if (game.time - (p.stealthAt || -99) < STEALTH_GRACE) return 1;
  return p.nextHitMul;
}
function stealthCastBegin(p) {
  const mul = stealthCastMul(p);
  if (mul > 1) {
    p.stealthCast = mul;
    p.stealthCrit = true; // der erste Treffer bleibt sicher kritisch
    p.nextHitMul = 1;
  }
  return mul;
}
function stealthCastEnd(p, mul) {
  if (!(mul > 1)) return;
  p.stealthCast = 0;
  p.stealthCrit = false;
  p.buffs = p.buffs.filter((b) => !b.effects.invisible);
  game.stats = playerStats(p);
}

function hitMonster(m, mul, opts = {}) {
  if (m.dead) return 0;
  // Einschlagklang nach Element (klang-welt.js)
  if (opts.skill && typeof sndElOf === 'function') {
    m._sEl = sndElOf(opts.skill);
    m._sElAt = game.time;
  }
  // Hieb nach Waffe (seit 14.8): der Grundangriff klingt je Waffenart anders
  m._sKind = opts.basic ? weaponKindOf(game.player) : null;
  m._sKindAt = game.time;
  // seit 13.86: Gegner in der Turnierarena gehen denselben Weg wie im Duell (pvpHit, turnierarena.js)
  if (m.duelProxy) return m.pvp ? pvpHit(m, mul, opts) : duelHit(m, mul, opts);
  m.struckAt = game.time;
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
    if (p.stealthCrit) {
      crit = 1;
      p.stealthCrit = false;
    }
    if (s.invisible) p.buffs = p.buffs.filter((b) => !b.effects.invisible);
  }
  if (!opts.ally && !opts.dot) p.lastCombat = game.time;
  if (m.vulnerable && m.vulnerable.until > game.time) factor *= m.vulnerable.mul;
  if (!opts.ally) {
    // „Stark gegen …“ der Monsterart (seit 14.15) zählt zu „Stark gegen Monster“ dazu
    factor *= (1 + (s.monsterDmg || 0) + kindDmgBonus(s, m)) * pathDmgMul(p, 'pve');
    if (opts.basic) factor *= BASIC_MUL * (1 + (s.basicDmg || 0));
    // Segen der Natur (Schamane): jede Fertigkeit des Schamanen ist Naturschaden; seit 13.69 auch die Arkane Erleuchtung des Magiers (Elementschaden)
    if (opts.skill && s.natureDmg) factor *= 1 + s.natureDmg;
  }
  // Waffenschaden (seit 13.10): statt des Mittelwerts würfelt jeder eigene Treffer in der Spanne der Waffe
  let atk = opts.atk != null ? opts.atk : s.atk;
  if (opts.atk == null && !opts.ally && s.wMax > s.wMin) atk = Math.max(1, atk + ((s.wMin + Math.random() * (s.wMax - s.wMin)) - s.wAvg) * (s.wMul || 1));
  const { amount, crit: isCrit } = calcDamage(atk, factor, opts.dot ? 0 : m.def, opts.ally ? 0.05 : crit, p.level, 1.8 + (opts.ally ? 0 : s.critDmg || 0));
  if (!m.isStone) {
    if (opts.stun) m.stun = Math.max(m.stun, opts.stun);
    // Einfrieren (Magier, seit 8.6): Betäubung mit Eisblock; die Pose bleibt stehen, solange m.frozen läuft
    if (opts.freeze && opts.stun && canFreeze(m)) {
      if (!(m.frozen > game.time)) m.frozenT = game.time;
      m.frozen = Math.max(m.frozen || 0, game.time + opts.stun);
      // eigenes Eis (nur das geht an den Host; gespiegeltes Eis vom Host nicht zurückschicken)
      m.frozenOwn = m.frozen;
    }
    if (opts.knockback) {
      const src = opts.from || p;
      const d = Math.max(1, dist(src, m));
      m.kx = (m.x - src.x) / d * opts.knockback * 4;
      m.ky = (m.y - src.y) / d * opts.knockback * 4;
    }
    // Schaden über Zeit wächst seit 13.31 mit der Fertigkeitsstärke wie direkter Schaden
    const dotK = s.skillDmg || 1;
    if (opts.poison) m.poison = { dps: s.atk * opts.poison.dps * dotK, until: game.time + opts.poison.duration, tick: 0 };
    if (opts.burn) m.burn = { dps: s.atk * opts.burn.dps * dotK, until: game.time + opts.burn.duration, tick: 0 };
    // Blutung (seit 11.7, Nekromant): Schaden über Zeit wie Gift, rote Tropfen
    if (opts.bleed) m.bleed = { dps: s.atk * opts.bleed.dps * dotK, until: game.time + opts.bleed.duration, tick: 0 };
    if (opts.slow) setSlow(m, 1 - opts.slow.amount, opts.slow.duration);
  }
  // Gift aus der Ausrüstung (seit 14.15): jeder eigene Treffer, je Ziel einmal (nicht Diener, nicht Schaden über Zeit).
  // Vor damageMonster, damit ein Mitspieler das Gift gleich mit dem Treffer an den Host schickt
  if (!opts.ally && !opts.dot && s.poison > 0 && Math.random() < s.poison) applyToxin(m, amount);
  damageMonster(m, amount, isCrit, opts.source || p, opts.dot);
  // Omni-Vampir (Blutpakt des Nekromanten): jeder eigene Schaden heilt, auch über Zeit (je Treffer höchstens 3 %)
  if (!opts.ally && s.omniVamp > 0 && !p.dead && !m.isStone) {
    const gain = Math.min(s.maxHp - p.hp, amount * s.omniVamp, s.maxHp * 0.03);
    if (gain > 0) {
      p.hp += gain;
      p.stealSum = (p.stealSum || 0) + gain;
      later(0.3, showLifeSteal);
    }
  }
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
  // Endboss hinter dem Kristallschild (seit 11.0): kein Schaden, solange ein Seelenkristall steht
  // Instanzboss (seit 13.58): versiegelt, solange einer seiner Wächter steht
  if ((m.type && m.type.raid && raidShielded(m)) || (m.type && m.type.inst && typeof instSealed === 'function' && instSealed(m))) {
    raidShieldHit(m);
    return;
  }
  // nach dem Bruch taumelt er und nimmt mehr Schaden
  if (m.raid && m.raid.stagger > game.time) amount = Math.round(amount * RAID.staggerDmg);
  // Im Mehrspieler entscheidet der Host über Leben und Tod der Monster
  // für den Trefferklang (klang-welt.js, seit 14.8): eigener Treffer, kritisch, Schaden über Zeit
  if (!source || !(source.remote || source.remoteAlly)) {
    m._sHitAt = game.time;
    m._sCrit = !!crit;
    m._sDot = !!isDot;
  }
  if (net.mode === 'client') {
    netClientDamage(m, amount, crit, isDot, source);
    return;
  }
  if (source && (source === game.player || source.remote)) m.lastAttacker = source;
  // Diener eines Mitspielers (seit 14.32 beim Host als eigene Quelle) zählen nicht als Treffer des Hosts
  if (source && !source.remote && !source.remoteAlly) m.hostHitAt = game.time;
  // Bedrohung (seit 14.32, gegner.js): Spieler und Diener, nur wer die Monster führt
  if (!m.isStone) addThreat(m, source, Math.min(amount, Math.max(0, m.hp)));
  // auch Treffer der Mitspieler (über den Host) zählen: so heilt sich kein Monster, das gerade bekämpft wird
  m.struckAt = game.time;
  m.hp -= amount;
  m.hitFlash = 0.12;
  // Mehrere Zahlen kurz hintereinander stapeln sich nach oben statt sich zu überdecken
  m.textStack = game.time - (m.lastText || -9) < 0.3 ? ((m.textStack || 0) + 1) % 4 : 0;
  m.lastText = game.time;
  if (opts.numbers) addText(m.x, feetY(m) - figureHeight(m) * 0.85 - m.textStack * 15, String(amount), crit ? 'crit' : isDot === 'toxin' ? 'toxin' : isDot ? 'dot' : 'dmg');
  if (m.isStone) {
    checkStoneWaves(m);
  } else {
    aggro(m, source);
  }
  if (m.hp <= 0) killMonster(m);
}

// Wartezeit bis zur Wiederkehr (seit 13.8 länger: normale Monster 75–105 s statt 30–45 s)
function monsterRespawnDelay(m) {
  if (m.isStone) return randInt(...(m.stoneRespawn || STONE.respawn));
  return m.respawnDelay || 75 + Math.random() * 30;
}

function killMonster(m) {
  if (net.mode === 'client') return;
  m.dead = true;
  m.hp = 0;
  m.poison = null;
  m.burn = null;
  m.bleed = null;
  m.toxin = null;
  if (game.target === m) game.target = null;
  monsterDeathFx(m);
  m.respawnAt = game.time + monsterRespawnDelay(m);
  if (net.mode === 'host') netBroadcastKill(m);
  // Belohnung nur, wer mitgekämpft hat oder in der Nähe war (allein: immer)
  if (net.mode !== 'host' || netShares(m, m.hostHitAt)) rewardKill(m);
  if (m.isStone) killStoneMinions(m);
  // Gruppe rächt ihr Mitglied (seit 13.10): auch nach einem Treffer, der sofort tötet – etwa aus der Tarnung,
  // in der die anderen den Angreifer im ersten Augenblick noch nicht sehen – kommt der Rest kurz danach
  const killer = m.lastAttacker || game.player;
  if (m.groupId && !m.isStone && killer) later(0.35, () => alertGroup(m, killer));
}

function monsterDeathFx(m) {
  if (m.type && m.type.crystal) {
    crystalDeathFx(m);
    return;
  }
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
  // Seelenkristalle geben nichts (nur der Boss dahinter zählt)
  if (m.type && m.type.crystal) return;
  if (stoneTooLow(m, p)) {
    // Nur noch die (ohnehin kleine) Erfahrung, kein Gold und keine Beute
    p.kills++;
    if (m.isStone) {
      p.stones++;
      ui.log(`${m.name} ist ${STONE_LOOT_GAP} oder mehr Stufen unter dir – keine Beute.`, 'warn');
      questEvent('stone', m);
    } else questEvent('kill', m);
    gainXp(partyXp(Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level))), m));
    return;
  }
  // in einer Gruppe teilen sich die Mitglieder in der Nähe die Erfahrung (gruppe.js)
  const xp = partyXp(Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level))), m);
  const drops = m.isStone ? stoneDrops(m.stoneType) : null;
  // Monster aus einem Seelenstein bringen etwas von dessen Beute mit
  const sd = m.stone ? stoneDrops(m.stone.stoneType) : null;
  // Mehr Gold (Bonus, seit 14.15) gilt für Monster und Seelensteine
  const gold = monsterGold(Math.round(randInt(m.gold[0], m.gold[1]) * (drops ? drops.gold : sd ? Math.max(1.2, sd.gold * 0.7) : 1)));
  p.gold += gold;
  p.kills++;
  // Gold erscheint klein beim Monster, die Erfahrung groß über der eigenen Figur (gainXp)
  if (gold > 0) addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  // violette Erfahrungsfunken fliegen vom Monster zur Figur
  const bc0 = bodyCenter(m);
  particles(bc0.x, bc0.y, { count: m.isStone ? 24 : 7, color: ['#d6b8ff', '#b48aff', '#ffffff'], angle: Math.atan2(p.y - m.y, p.x - m.x), spread: 0.5, speed: [dist(m, p) * 1.4, dist(m, p) * 2.2], life: [0.35, 0.5], size: [2, 3.2], drag: 0.6 });

  if (m.isStone) {
    const splinters = randInt(drops.splinters[0], drops.splinters[1]);
    // Mehr Beute (seit 14.15): auch mehr Tränke
    const potHp = dropCount(randInt(drops.potions[0], drops.potions[1]));
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
      if (Math.random() >= dropChance(chance)) continue;
      const key = potKey(kind, sz);
      p.potions[key] = (p.potions[key] || 0) + 1;
      ui.loot(`${potionInfo(kind).name} (${sz})`, 1, potionIconUrl(kind, sz), potionInfo(kind).color);
    }
  }
  // Helfer der Endbosse: mit etwas Glück Tränke oder Splitter
  if (m.raidAdd) {
    const sz = potionSizeFor(m.level).id;
    if (Math.random() < dropChance(0.35)) {
      const key = potKey('hp', sz);
      p.potions[key] = (p.potions[key] || 0) + 1;
      ui.loot(`${potionInfo('hp').name} (${sz})`, 1, potionIconUrl('hp', sz), potionInfo('hp').color);
    }
    if (Math.random() < 0.3) {
      const n = randInt(1, 3);
      p.splinters += n;
      ui.loot('Seelensplitter', n, lootIconUrl('splinter'), '#c9a8ff');
    }
    // seit 14.6 keine Verstärkung mehr (12 %): Boni-Materialien gibt es nur aus Seelensteinen
  }
  // Wächter und Bosse der Lv-60-Instanzen und die neuen Wächter im Höllenthron (seit 13.58, instanzen.js)
  if (m.type && m.type.inst && typeof instLoot === 'function') instLoot(m);
  else if (m.type && m.type.raid) raidLoot(m);
  else if (m.type && m.type.boss) bossLoot(m);
  // Wächter im Höllenthron (seit 13.38): zusätzlich 2–3 legendäre Teile
  if (typeof htGuardLoot === 'function') htGuardLoot(m);
  rollLoot(m);
  forgeCoreDrop(m); // seit 14.16: seltene Ätherkerne aus Steinen ab Stufe 40 und Bossen
  gainXp(xp);
}

// --- Schaden am Spieler ----------------------------------------------------------

// o.pvp: Treffer eines anderen Spielers, schon mit allen Abzügen gerechnet (pvpIncoming); o.dot: Gift (kein Ausweichen
// oder Blocken, grüne Zahl)
function damagePlayer(amount, attacker, o = {}) {
  const p = game.player;
  const s = game.stats;
  if (p.dead) return;
  // In Städten und Lagern gibt es keinen Schaden (außer im Duell) – egal woher er kommt
  if (inVillage(p.x, p.y) && !(attacker && attacker.duelProxy)) return;
  p.lastCombat = game.time;
  // Kälte für Angreifer (s.chill aus Buffs, bis 13.63 der Frostpanzer): wer dich trifft, läuft und schlägt langsamer.
  // Seit 13.64 gibt es keine Fertigkeit mehr damit; die Regel bleibt allgemein stehen (ohne chill passiert nichts)
  if (s.chill && attacker && !attacker.duelProxy && !attacker.dead && attacker.typeId && dist(attacker, p) < 520) {
    const dur = s.chillDur || 1.5;
    setSlow(attacker, Math.max(0.1, 1 - s.chill), dur);
    attacker.frostAtk = { mul: 1 - s.chill * 0.5, until: game.time + dur };
    // Reif am Angreifer (höchstens alle 0,4 s)
    if (!(attacker.chillFxAt > game.time)) {
      attacker.chillFxAt = game.time + 0.4;
      addEffect({ type: 'burst', x: attacker.x, y: attacker.y - 14, dur: 0.45, color: '#bff4ff', count: 8 });
    }
    if (net.mode === 'client') netClientDamage(attacker, 0, false, false);
  }
  if (p.protectUntil > game.time) return;
  if (!o.dot && Math.random() < s.dodge * (o.pvp ? PVP_DMG.dodgeMul : 1)) {
    addText(p.x, p.y - 30, 'Ausgewichen', 'info');
    return;
  }
  // Ein Schild kann Treffer ganz abblocken
  if (!o.dot && s.block > 0 && Math.random() < s.block * (o.pvp ? PVP_DMG.dodgeMul : 1)) {
    addText(p.x, p.y - 30, 'Geblockt', 'block');
    vfxBlock(p, attacker);
    snd.block(p);
    return;
  }
  // Abwehr gegen Magie, Nahkampf, Fernkampf und (menschliche Monster) Menschen (seit 14.15); zusammen mit
  // Schadensreduktion und „Erlittener Schaden“ höchstens 60 % weniger (wie bisher damageTaken ≥ 0,4)
  let taken = s.damageTaken;
  if (attacker && attacker.type && !attacker.duelProxy && !o.pvp) {
    const res = attackResist(s, monsterAttackKind(attacker), monsterKind(attacker) === 'human');
    if (res > 0) taken = Math.max(0.4, taken - res);
  }
  let dmg = Math.max(1, Math.round(o.pvp ? amount : amount * taken));
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
  // seit 13.86 nicht in der Turnierarena (attacker.pvp): dort fällt man wirklich und scheidet aus
  const duelBlow = attacker && attacker.duelProxy && !attacker.pvp;
  if (duelBlow && dmg > 0 && p.hp - dmg < 1) {
    dmg = Math.max(0, Math.floor(p.hp - 1));
    later(0, () => duelLose(null));
  }
  if (dmg > 0 && !o.dot && game.time - (p.sndHurtAt || -9) > 0.4) {
    p.sndHurtAt = game.time;
    snd.hurt(p);
    snd.struck(p);
  }
  if (dmg > 0) {
    p.hp -= dmg;
    p.hurtAt = game.time;
    addText(p.x + (Math.random() - 0.5) * 16, p.y - 34, '-' + dmg, o.dot ? 'toxin' : 'hurt');
    if (!o.dot) {
      game.hurtFlash = 0.35;
      shakeScreen(2.5);
    }
  }
  if (s.reflect > 0 && attacker && !attacker.dead && !attacker.duelProxy) {
    damageMonster(attacker, Math.max(1, Math.round(amount * s.reflect)), false, p, false);
  }
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = game.player;
  snd.die(p);
  p.hp = 0;
  p.dead = true;
  p.dash = null;
  p.buffs = [];
  p.shield = 0;
  p.deaths++;
  if (typeof stableOnDeath === 'function') stableOnDeath(); // seit 14.18: Leben der Stallmeister-Prüfung
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
  // Dolche (Ninja, seit 13.4): viele schnelle, kurze Stiche mit weniger Schaden je Stich (gleicher Schaden je Sekunde)
  // seit 13.31 0,5 statt 0,66: der Ninja machte 40–80 % mehr Schaden als der Schnitt aller Wege
  // seit 13.85 langsamer (0,46 statt 0,36), dafür 0,6 statt 0,5 je Stich: der Dolch-Ninja stach mit Tempo-Buffs bis zu
  // siebenmal je Sekunde (Schaden je Sekunde etwa −6 %)
  // seit 14.13 0,66 statt 0,6 (der Dolch-Ninja war nach 14.6/14.10 der schwächste Weg)
  dagger: { range: 46, cooldown: 0.46, ranged: false, mul: 0.66 },
  // seit 13.67 weiter (400 statt 250): Pfeile tragen deutlich weiter als Zauber
  // seit 14.13 mul 0,72: ein Bogenschuss machte so viel wie ein Krieger-Hieb (aus sicherer Entfernung) und mehr Schaden
  // je Sekunde als jeder Nahkämpfer; jetzt etwa wie die anderen Fernkämpfer (Magier, Schamane, Nekromant)
  bow: { range: 400, cooldown: 0.75, ranged: true, color: '#f0e0b0', style: 'arrow', mul: 0.72 },
  greatsword: { range: 62, cooldown: 0.8, ranged: false },
  greataxe: { range: 60, cooldown: 0.88, ranged: false },
  scythe: { range: 62, cooldown: 0.85, ranged: false }
};

// Schlaganimation (seit 9.3): Grunddauer des Schwungs je Waffe und der Anteil, bei dem die Klinge trifft bzw.
// der Pfeil/Zauber losfliegt. Schaden, Zahl und Schlagspur kommen erst in diesem Bild (siehe basicTick).
const BASIC_TIMING = {
  sword: [0.42, 0.42], axe: [0.44, 0.45], greatsword: [0.56, 0.5], greataxe: [0.6, 0.52], dagger: [0.3, 0.2], scythe: [0.56, 0.5],
  bow: [0.5, 0.58], fan: [0.42, 0.45], bell: [0.46, 0.55], staff: [0.46, 0.5], rod: [0.4, 0.42]
};
function basicTiming(p) {
  const [base, impact] = BASIC_TIMING[weaponKindOf(p)] || [0.42, 0.45];
  // mit Angriffstempo schneller, höchstens so lang wie die Abklingzeit
  return { dur: Math.max(0.12, Math.min(base, (p.attackCd || base) * 0.95)), impact };
}

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
  if (p.attackCd > 0 || p.dead || p.dash || p.channel) return false;
  if (inVillage(p.x, p.y) && !duelFighting()) return false; // im Dorf wird nicht gekämpft (außer im Duell)
  // Bogen (seit 13.67): ohne Pfeile kein Schuss (Hinweis und roter Pfeilzähler, fernninja.js)
  if (basic.style === 'arrow' && typeof bowCanShoot === 'function' && !bowCanShoot(p, 1)) return false;
  if (p.riding) toggleRide(false);
  // Angreifen geht immer: mit Gegner in Reichweite auf ihn, sonst ein Schlag oder Schuss
  // in Blickrichtung (später auch für Kämpfe gegen andere Spieler)
  const target = pickTarget(basic.range);
  p.attackCd = basic.cooldown / game.stats.atkSpeed;
  const tm = basicTiming(p);
  // seit 13.85: zum Ziel schauen, solange der Schlag bzw. Schuss dauert (auch im Laufen) – ist der bewusst gewählte
  // Fokus noch außer Reichweite, geht der Schlag trotzdem in seine Richtung
  const g = game.target;
  const look = target || (g && !g.dead && !g.hidden && targetIsManual(g) && dist(p, g) < 900 ? g : null);
  if (look) attackFace(p, look, tm.dur + 0.08);
  if (basic.ranged) {
    startSwing(p, 'cast', tm.dur);
    p.pendingShot = { at: game.time + tm.dur * tm.impact, target, basic };
    // Bogen: stehen bleiben und zum Ziel schauen, bis kurz nach dem Loslassen (kein Schuss nach hinten im Laufen);
    // gedrückte Tasten und Laufziel bleiben und gehen danach weiter
    if (basic.style === 'arrow') lockPlayer(p, tm.dur * tm.impact + 0.08);
  } else {
    // Dolche (seit 13.36): Kombo aus vier Schlägen (Wirbel etwas, Kreuzschnitt am Ende deutlich stärker)
    const dag = weaponKindOf(p) === 'dagger';
    p.combo = ((p.combo || 0) + 1) % (dag ? 4 : 3);
    startSwing(p, 'combo', tm.dur);
    const cm = dag ? [1, 1, 1.1, 1.3][p.combo] : p.combo === 2 ? 1.25 : 1;
    p.pendingHit = { at: game.time + tm.dur * tm.impact, target, mul: cm * (basic.mul || 1), range: basic.range, color: c.trim };
  }
  return true;
}

// Nahkampf-Grundangriff als Flächenschlag: Gegner in Reichweite und im Bogen von ±65° vor der Figur (ganz nahe
// auch daneben) bekommen 75 % des Schlags ab – das Ziel selbst den vollen Schlag
const CLEAVE = { arc: 65 * Math.PI / 180, mul: 0.75, max: 5, near: 26 };
function cleaveHit(p, main, h) {
  const fx = p.facing.x;
  const fy = p.facing.y;
  const fl = Math.hypot(fx, fy) || 1;
  const cosArc = Math.cos(CLEAVE.arc);
  let n = 0;
  for (const m of aliveEnemies()) {
    if (n >= CLEAVE.max) break;
    if (m === main || m.dead || m.hidden) continue;
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d - (m.r || 0) > h.range + 30) continue;
    if (d > CLEAVE.near + (m.r || 0) && (dx * fx + dy * fy) / (d * fl) < cosArc) continue;
    hitMonster(m, h.mul * CLEAVE.mul, { vfxColor: h.color, basic: true });
    n++;
  }
}

// Treffer bzw. Schuss im richtigen Bild der Schlaganimation auslösen (jedes Bild aus updatePlayer)
function basicTick(p) {
  const h = p.pendingHit;
  if (h && game.time >= h.at) {
    p.pendingHit = null;
    if (!p.dead) {
      vfxSwing(p, h.color);
      const t = h.target;
      const struck = !!(t && !t.dead && dist(p, t) - (t.r || 0) <= h.range + 30);
      if (struck) hitMonster(t, h.mul, { vfxColor: h.color, basic: true });
      // Flächenschlag (seit 13.46): der Schlag trifft auch andere Gegner im Bogen vor der Figur (bis zu 5, je 75 %)
      cleaveHit(p, t, h);
      breakStealth(p);
      // Klang (seit 14.8): getroffen → der Hieb am Ziel trägt den Schwung, sonst nur das Sausen
      if (typeof snd !== 'undefined') snd.swing(p, struck);
    }
  }
  const s = p.pendingShot;
  if (s && game.time >= s.at) {
    p.pendingShot = null;
    if (p.dead) return;
    breakStealth(p);
    const basic = s.basic;
    const target = s.target && !s.target.dead ? s.target : null;
    if (target) faceTowards(target.x, target.y);
    const hand = bodyCenter(p);
    // Pfeile (seit 13.57, fernninja.js): jeder Bogenschuss verbraucht einen Pfeil der besten Sorte – Bonus und Farbe
    // seit 13.67 ohne Übungspfeile: sind die Pfeile inzwischen alle, fliegt nichts
    const ar = basic.style === 'arrow' && typeof bowArrowShot === 'function' ? bowArrowShot(p, 1) : null;
    if (basic.style === 'arrow' && !ar && p.classId === 'ninja') {
      if (typeof bowCanShoot === 'function') bowCanShoot(p, 1);
      return;
    }
    const col = ar ? ar.color : basic.color;
    particles(hand.x + p.facing.x * 14, hand.y + p.facing.y * 8, { count: 6, color: col, speed: [30, 80], life: [0.15, 0.3], size: [1.5, 2.5] });
    spawnProjectile({ owner: 'player', x: p.x, y: p.y, target, dir: target ? null : { ...p.facing }, speed: basic.style === 'arrow' ? 620 : 480, range: basic.range + 60, mul: ar ? ar.mul : 1, color: col, radius: 5, style: basic.style, el: basic.el, basic: true, arrow: ar ? ar.sort : undefined,
      // seit 14.17: Pfeile mit Ziel fliegen durch alle anderen Monster und treffen nur das Ziel (focusOnly)
      focusOnly: basic.style === 'arrow' });
    // Bogen (seit 13.67): dunkler Schattenblitz am Bogen (fernninja.js)
    if (ar && typeof bowBasicFx === 'function') bowBasicFx(p);
    netSkillFx('_shot', basic.range, { c: col, st: basic.style, el: basic.el });
    if (typeof snd !== 'undefined') snd.shot(p, basic);
  }
}

// --- Fertigkeiten -----------------------------------------------------------------

// Manakosten (seit 7.7): wachsen mit der Stufe, damit auch später Manatränke gebraucht werden.
// Der Schamane zaubert am meisten und zahlt am meisten, der Krieger am wenigsten.
const MANA_COST = { schamane: [1.15, 0.022], magier: [1.15, 0.022], nekromant: [1.05, 0.016], ninja: [1, 0.013], krieger: [1, 0.011] };
function skillMana(sk, p = game.player) {
  const [a, b] = MANA_COST[p.classId] || [1, 0];
  return Math.round(sk.mp * (a + b * p.level));
}
// Mana je Sekunde beim Gedrückthalten (Eisstrahl, Blutsauger), wie channelTick sie abzieht (seit 13.87 im Infofeld)
function skillManaPerSec(sk, p = game.player) {
  return sk.mpPerSec ? skillMana(sk, p) / sk.mp * sk.mpPerSec : 0;
}
// Abklingzeit einer Fertigkeit (seit 13.87 eine Stelle für Spiel und Infofeld): fest je Fertigkeit, weder Stufe,
// Rang noch Angriffstempo verkürzen sie. Dazu kommt bei den Zauberern die globale Abklingzeit (GCD_TIME, applyGcd).
// Die Uhr läuft in Spielzeit: Trefferstopps (hitStop, je kritischem Treffer 0,06 s) halten sie kurz an.
function skillCooldown(sk) {
  return sk.cooldown;
}
// Beschreibung mit Werten der Stufe (seit 13.87): {dauer} im Text wird zur echten Dauer (skillDuration),
// ohne Stufe (Klassenwahl, Wiki) zur Dauer auf Stufe 1
function skillText(sk, lvl) {
  const t = String((sk && sk.text) || '');
  if (!t.includes('{')) return t;
  return t.replace(/\{dauer\}/g, () => String(sk.duration ? skillDuration(sk, lvl || 1) : 0));
}

// Waffe, die ein Weg für seine Fertigkeiten braucht (paths[].weapon, z. B. Ninja: 'dagger' oder 'bow')
function pathWeapon(p) {
  const path = p && CLASSES[p.classId] && CLASSES[p.classId].paths[p.path || 0];
  return path && path.weapon ? path.weapon : null;
}
function pathWeaponOk(p) {
  const w = pathWeapon(p);
  return !w || weaponKindOf(p) === w;
}
function pathWeaponText(p) {
  const w = pathWeapon(p);
  return w ? `Nur mit ${WEAPON_KINDS[w].name === 'Bogen' ? 'einem Bogen' : 'einem ' + WEAPON_KINDS[w].name}` : '';
}

// Abklingzeit setzen und merken, von welcher Dauer sie ausging (Uhr in der Leiste, seit 13.85)
function setSkillCd(p, i, v) {
  p.skillCd[i] = v;
  if (!p.cdFull) p.cdFull = [0, 0, 0, 0, 0];
  p.cdFull[i] = v;
}

// Globale Abklingzeit (seit 13.85, wie in anderen MMORPGs): Schamane, Nekromant und Magier können nicht zwei Zauber
// auf einmal wirken – nach jeder Fertigkeit haben ihre übrigen Fertigkeiten mindestens GCD_TIME s Abklingzeit
// (längere bleiben, wie sie sind). Ulti, Klassensegen, Tränke und Grundangriff zählen nicht, ein Kanal (Eisstrahl,
// Blutsauger) zählt als ein Zauber. Nur die eigene Figur: Mitspieler sehen nur die Optik.
// Seit 13.91 auch der Krieger, kürzer (1,5 s): Sichelwelle, Wirbel und Sprung kamen sonst alle im selben Augenblick.
const GCD_TIME = 2;
const GCD_CLASS_TIME = { schamane: 2, nekromant: 2, magier: 2, krieger: 1.5 };
const GCD_CLASSES = new Set(Object.keys(GCD_CLASS_TIME));
// Frostmagier seit 13.94 nur 0,5 s: Eisstrahl, Blizzard und Frostgefängnis sollen sich flüssig verbinden lassen, aber nicht
// im selben Augenblick
const GCD_PATH_TIME = { frost: 0.5 };
const gcdTime = (p) => {
  if (!p) return 0;
  const path = CLASSES[p.classId] && CLASSES[p.classId].paths[p.path || 0];
  return (path && GCD_PATH_TIME[path.id]) || GCD_CLASS_TIME[p.classId] || 0;
};
function applyGcd(p, i) {
  const g = gcdTime(p);
  if (!g) return;
  p.gcdPrev = { at: game.time, i, cd: p.skillCd.slice(), full: (p.cdFull || []).slice() };
  for (let j = 0; j < p.skillCd.length; j++) {
    if (j !== i && p.skillCd[j] < g) setSkillCd(p, j, g);
  }
}
// Zauber abgebrochen (Feuerball, Mana und Abklingzeit zurück): die übrigen Fertigkeiten wieder wie vorher
function undoGcd(p, i) {
  const g = p.gcdPrev;
  if (!g || g.i !== i) return;
  p.gcdPrev = null;
  const gone = game.time - g.at;
  for (let j = 0; j < p.skillCd.length; j++) {
    if (j === i) continue;
    p.skillCd[j] = Math.max(0, g.cd[j] - gone);
    if (p.cdFull) p.cdFull[j] = g.full[j] || 0;
  }
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
  // Waffe des Weges (seit 13.50): Ninja-Fertigkeiten des Dolch-Weges nur mit Dolch, die des Bogen-Weges nur mit Bogen
  if (!pathWeaponOk(p)) {
    addText(p.x, p.y - 34, pathWeaponText(p), 'info');
    return;
  }
  // eine andere Fertigkeit bricht das Zaubern ab (Feuerball, seit 11.5)
  if (p.mcast && p.mcast.sk !== sk) mageCastCancel(p, '');
  // eine andere Fertigkeit beendet den Eisstrahl
  if (p.channel) {
    if (p.channel.sk === sk) return;
    stopChannel(p);
  }
  if ((sk.kind === 'angriff' || sk.kind === 'fluch') && inVillage(p.x, p.y) && !duelFighting()) {
    addText(p.x, p.y - 34, 'Im Dorf wird nicht gekämpft', 'info');
    return;
  }
  if (p.mp < skillMana(sk, p)) {
    addText(p.x, p.y - 34, 'Zu wenig Mana', 'info');
    return;
  }
  // Bogen-Fertigkeiten (seit 13.67): ohne genug Pfeile gar nicht erst zielen oder wirken
  if (sk.arrows && typeof bowCanShoot === 'function' && !bowCanShoot(p, sk.arrows)) return;
  // Fertigkeiten mit Zielort: erst zielen, beim zweiten Antippen oder Tippen auf den Boden wirken
  if (sk.aim && !skillTouchDirect(sk) && !(game.aim && game.aim.i === i && game.aim.go)) {
    if (game.aim && game.aim.i === i) aimFire();
    else startAim(i, sk);
    return;
  }
  if (p.riding) toggleRide(false);
  const lvl = p.skillLevels[i];
  const rank = skillRank(lvl);
  // Angriff aus der Tarnung: alle Treffer dieser Fertigkeit × nextHitMul (seit 13.85 ×2) (Buffs wie die Tarnung selbst zählen nicht)
  const sMul = sk.kind === 'angriff' ? stealthCastBegin(p) : 1;
  const ok = withRank(rank, () => SKILL_TYPES[sk.type](sk, dmgScale(lvl) * (game.stats.skillDmg || 1) * sMul, lvl));
  if (ok === false) {
    if (sMul > 1) { p.nextHitMul = sMul; p.stealthCast = 0; p.stealthCrit = false; }
    return;
  }
  if (sMul > 1) addText(p.x, p.y - 52, `Aus der Tarnung ×${sMul}`, 'crit');
  stealthCastEnd(p, sMul);
  withRank(rank, () => skillCastFx(sk));
  if (rank >= 0) rankCastFx(p, rank, SKILL_RANKS[rank].color);
  snd.skill(sk, p);
  p.mp -= skillMana(sk, p);
  setSkillCd(p, i, skillCooldown(sk));
  // seit 13.85: globale Abklingzeit der Zauberer (Schamane, Nekromant, Magier)
  applyGcd(p, i);
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
  } else if (sk.channel) {
    // Kanalisieren (Eisstrahl): Haltung kommt aus channelTick
  } else if (sk.anim) {
    // eigene Animation (SKILL_POSE3 in drei-figuren.js), Mitspieler sehen sie über den Zustand
    startSwing(p, sk.anim, sk.animDur);
  } else {
    startSwing(p, 'skill', 0.34);
  }
  if (sk.kind === 'angriff' || sk.kind === 'fluch') {
    p.lastCombat = game.time;
    // seit 13.85: beim Angriff zum Ziel bzw. zum gewählten Ort schauen (Sprünge und Schritte lenken selbst)
    if (!FACE_FREE_TYPES.has(sk.type)) attackFace(p, skillFaceAt(sk), Math.max(0.45, (sk.animDur || 0.34) + 0.12));
  }
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

// Sprung- und Teleport-Weite (seit 14.14): man fliegt über Bäume, Felsen, Säulen, Wasser und Lava hinweg und landet
// auf dem letzten freien Platz vor dem gewünschten Ziel (bis want). Nur Mauern, Höhlenwände, Häuser, der Kartenrand
// und (außerhalb des Duells) das Dorf halten auf – vorher endete jeder Sprung vor dem ersten Baum.
function hopBarrier(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const o = game.world.obj[ty * MAP_W + tx];
  return o === OBJ.WALL || o === OBJ.CAVEWALL || o === OBJ.HOUSE;
}
function hopReach(x, y, dir, want, r) {
  let best = 0;
  for (let s = 6; s <= want; s += 6) {
    const nx = x + dir.x * s;
    const ny = y + dir.y * s;
    if (hopBarrier(nx, ny) || (inVillage(nx, ny) && !duelFighting())) break;
    if (canStand(nx, ny, r, false)) best = s;
  }
  return best;
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
// Fluchtschritte (seit 13.70, sk.aimAway – Schattenschritt): der Kreis beginnt hinter der Figur, vom Ziel bzw. nächsten
// Gegner weg (ohne Gegner entgegen der Blickrichtung). Er liegt nie auf einem Gegner und wählt auch kein neues Ziel.
function aimAwayPoint(p, sk) {
  const g = game.target;
  const t = g && !g.dead && !g.hidden && dist(p, g) < 900 ? g : nearestEnemy(p, 600);
  const f = p.facing || { x: 0, y: 1 };
  let dx = t ? p.x - t.x : -f.x;
  let dy = t ? p.y - t.y : -f.y;
  const l = Math.hypot(dx, dy);
  if (l < 0.01) { dx = -f.x; dy = -f.y; } else { dx /= l; dy /= l; }
  const d = Math.min(sk.aimAway || 150, aimReach(sk));
  return { x: p.x + dx * d, y: p.y + dy * d };
}
// Größte Entfernung des Zielkreises (seit 13.85): aimMax für Sprünge und Schritte (Sprungweite statt Pfeil- oder
// Zauberreichweite), sonst die Reichweite der Fertigkeit
// Am Handy ohne Zielkreis (seit 14.2, sk.touchDirect – Sprungschlag): direkt zum Ziel bzw. nächsten Gegner
function skillTouchDirect(sk) {
  return !!(sk && sk.touchDirect && typeof input !== 'undefined' && input.touchUi);
}
function aimReach(sk) {
  return sk.aimMax || sk.range || sk.distance || 150;
}
function startAim(i, sk) {
  const p = game.player;
  cancelAim();
  const t = sk.aimAway ? null : pickTarget(aimReach(sk) + (sk.aimMax ? 40 : 0));
  const away = sk.aimAway ? aimAwayPoint(p, sk) : null;
  const pt = away ? { ...away, r: 0 } : { x: t ? t.x : p.x + p.facing.x * 150, y: t ? t.y : p.y + p.facing.y * 150, r: 0 };
  game.aim = { i, sk, pt, until: game.time + AIM_TIMEOUT, go: false };
  // seit 13.42: der Kreis folgt frei dem Zeiger und ist grün, wenn der Zauber dort wirken kann, sonst rot
  // (zu weit weg oder im Dorf); Rechtsklick oder Esc bricht ab
  if (Math.hypot(pt.x - p.x, pt.y - p.y) > aimReach(sk)) clampAim();
  // aimR (seit 13.85): eigene Kreisgröße für Sprünge und Schritte (Landeplatz statt Wirkungsfläche)
  game.aim.fx = addEffect({ type: 'aim', follow: pt, ox: 0, oy: 0, r: sk.aimR || sk.radius || 30, dur: AIM_TIMEOUT + 1, color: AIM_OK });
  // seit 13.64: feiner Kreis um die Figur zeigt die Reichweite (Bild in frostgefaengnis.js)
  game.aim.rangeFx = addEffect({ type: 'aimrange', ground: true, follow: p, ox: 0, oy: 0, r: aimReach(sk), dur: AIM_TIMEOUT + 1 });
  aimCheck();
  addText(p.x, p.y - 40, input.touchUi ? 'Ort antippen oder Knopf ziehen' : 'Ort antippen', 'info');
  document.body.classList.add('aiming');
}
function cancelAim() {
  if (!game.aim) return;
  if (game.aim.fx) game.aim.fx.dur = 0;
  if (game.aim.rangeFx) game.aim.rangeFx.dur = 0;
  game.aim = null;
  document.body.classList.remove('aiming');
}
const AIM_OK = '#5fe07a';
const AIM_BAD = '#ff4a3a';
// Kann der Zauber am Kreis wirken? (Reichweite, nicht im Dorf) – färbt den Kreis grün oder rot
function aimCheck() {
  const a = game.aim;
  if (!a) return false;
  const p = game.player;
  const far = Math.hypot(a.pt.x - p.x, a.pt.y - p.y) > aimReach(a.sk) + 2;
  const town = inVillage(p.x, p.y) && !duelFighting();
  a.ok = !far && !town;
  a.why = far ? 'Zu weit weg' : town ? 'Im Dorf wird nicht gekämpft' : '';
  if (a.fx) a.fx.color = a.ok ? AIM_OK : AIM_BAD;
  return a.ok;
}
// Punkt auf Reichweite um die Figur begrenzen
function clampAim() {
  const a = game.aim;
  const p = game.player;
  const d = Math.hypot(a.pt.x - p.x, a.pt.y - p.y);
  const r = aimReach(a.sk);
  if (d > r) {
    a.pt.x = p.x + (a.pt.x - p.x) / d * r;
    a.pt.y = p.y + (a.pt.y - p.y) / d * r;
  }
}
function aimAt(x, y) {
  if (!game.aim) return;
  game.aim.pt.x = x;
  game.aim.pt.y = y;
  aimCheck();
}
// Ziehen am Fertigkeitsknopf (seit 14.2, Handy): der Zielkreis liegt in Zugrichtung um die Figur, so weit wie gezogen
// (AIM_DRAG_PX Finger-Weg = volle Reichweite). dx/dy sind Bildschirm-Pixel; die Richtung wird über den Bildschirmpunkt
// der Figur in die Welt umgerechnet, damit sie auch bei gedrehter 3D-Kamera stimmt.
const AIM_DRAG_PX = 110;
function aimDrag(dx, dy) {
  const a = game.aim;
  const p = game.player;
  const len = Math.hypot(dx, dy);
  if (!a || !p || len < 1) return;
  const ps = V3.on ? v3Project(p.x, p.y, 0) : { x: (p.x - renderer.camX) * renderer.zoom, y: (p.y - renderer.camY) * renderer.zoom };
  const w = screenToWorld(ps.x + dx / len * 60, ps.y + dy / len * 60);
  if (!w || !isFinite(w.x) || !isFinite(w.y)) return;
  let wx = w.x - p.x;
  let wy = w.y - p.y;
  const wl = Math.hypot(wx, wy);
  if (wl < 0.01) return;
  const d = Math.min(1, len / AIM_DRAG_PX) * aimReach(a.sk);
  aimAt(p.x + wx / wl * d, p.y + wy / wl * d);
}
function aimFire(x, y) {
  const a = game.aim;
  if (!a) return;
  if (x != null) aimAt(x, y);
  if (!aimCheck()) {
    addText(game.player.x, game.player.y - 40, a.why || 'Hier nicht', 'info');
    return;
  }
  a.go = true;
  useSkill(a.i);
  cancelAim();
}
function updateAim() {
  const a = game.aim;
  if (!a) return;
  if (game.time > a.until || !game.player || game.player.dead) cancelAim();
  else aimCheck();
}
// Gegner am Zielkreis (seit 13.85, Blitzangriff): der nächste am Punkt innerhalb des Kreises (aimR), Monster vor Steinen
function aimEnemyAt(pt, sk) {
  const p = game.player;
  const R = sk.aimR || sk.radius || 40;
  let best = null;
  let bd = Infinity;
  for (const m of aliveEnemies()) {
    if (m.hidden || dist(p, m) - (m.r || 0) > aimReach(sk) + 20) continue;
    const d = Math.hypot(m.x - pt.x, m.y - pt.y) - (m.r || 0) + (m.isStone ? 1000 : 0);
    if (d <= R + (m.isStone ? 1000 : 0) && d < bd) { best = m; bd = d; }
  }
  return best;
}
// Zielort einer Fertigkeit: der gewählte Kreis, sonst das Ziel oder ein Punkt vor der Figur
function skillAimPoint(sk) {
  const p = game.player;
  if (game.aim && game.aim.sk.id === sk.id) return game.aim.pt;
  const t = pickTarget(aimReach(sk));
  const d = Math.min(150, aimReach(sk));
  return t ? { x: t.x, y: t.y } : { x: p.x + p.facing.x * d, y: p.y + p.facing.y * d };
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

// Werte, die nicht mit der allgemeinen Kurve wachsen (seit 13.26): Segen schützt auf Stufe 1 mit 8 %, auf 15 mit 15 %,
// auf E1 mit 20 % und danach nur noch langsam mehr (vorher auf E1 schon über 30 %)
function segenReduction(lvl) {
  if (lvl <= SKILL_POINT_MAX) return -(0.08 + 0.005 * (lvl - 1));
  return -Math.min(0.4, 0.2 + 0.005 * Math.max(0, lvl - SKILL_RANKS[0].from));
}
// Aura des Schwertes (seit 13.49): eigene Rangtabelle statt +3 % je Stufe – vorher brachte Vollendet nur ~+140.
// Grundwert je Rang (normal 30–70, E 140–204, H 240–330, L 380–500, V 600), dazu der Hauptwert halb
// (bei voller Stärke ×1,5): V gibt so etwa +900 Angriff
const AURA_FLAT = { base: [30, 70], E: [140, 8], H: [240, 10], L: [380, 13], V: 600 };
function auraFlat(lvl) {
  const r = skillRank(lvl);
  let v;
  if (r < 0) v = AURA_FLAT.base[0] + (AURA_FLAT.base[1] - AURA_FLAT.base[0]) * (Math.min(lvl, SKILL_BASE_MAX) - 1) / (SKILL_BASE_MAX - 1);
  else if (r === 3) v = AURA_FLAT.V;
  else {
    const [b, step] = AURA_FLAT['EHL'[r]];
    v = b + step * (lvl - SKILL_RANKS[r].from);
  }
  const bp = (game.stats && game.stats.buffPower) || 1;
  return Math.round(v * (1 + (bp - 1) * 0.5));
}
// (Frostpanzer mit fester Rüstung und Kälte nach Rang ist seit 13.64 entfernt – Eisgefängnis, frostgefaengnis.js)
const SKILL_FIXED_EFFECTS = {
  segen: { damageTaken: segenReduction }, schwertaura: { atkFlat: auraFlat }
};
function applyBuff(sk, lvl) {
  const p = game.player;
  const scale = buffScale(lvl);
  const effects = {};
  const fixed = SKILL_FIXED_EFFECTS[sk.id] || {};
  // Lauftempo seit 8.5 fest (sonst bis +158 % mit Rang und Hauptwert)
  for (const [k, v] of Object.entries(sk.effects || {})) effects[k] = fixed[k] ? fixed[k](lvl) : typeof v === 'number' ? (k === 'speed' || k === 'chill' || k === 'chillDur' ? v : v * scale) : v;
  const duration = skillDuration(sk, lvl);
  p.buffs = p.buffs.filter((b) => b.id !== sk.id);
  p.buffs.push({ id: sk.id, name: skillRankName(sk, lvl), short: sk.short, until: game.time + duration, duration, effects, lvl });
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
      // 3D-Ninja (seit 13.2): eigene räumliche Klingen statt der flachen Riesenklinge (ninja-fx.js)
      if (!(typeof ninjaOwns3 === 'function' && ninjaOwns3(sk.id))) addEffect({ type: 'bladespin', follow: p, ox: 0, oy: -12, len: sk.radius * 0.9, a0: a, turns: fx.bladeSpin.turns, count: fx.bladeSpin.count, dir: 1, dur: 0.6, color: skillColor(sk, c.trim), ...playerBlade(p) });
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
    let want;
    if (sk.aim && !skillTouchDirect(sk)) {
      // seit 13.85: Landeplatz mit dem Zielkreis gewählt (wie ein Zauber). Liegt er auf einem Gegner,
      // landet die Figur knapp davor (sonst stünde sie in ihm); getroffen wird im Kreis um die Landung.
      const pt = skillAimPoint(sk);
      const dl = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (dl > 4) faceTowards(pt.x, pt.y);
      want = Math.min(sk.distance, dl);
      for (const m of aliveEnemies()) {
        if (m.hidden || Math.hypot(m.x - pt.x, m.y - pt.y) > (m.r || 14) + 6) continue;
        want = Math.max(0, Math.min(want, dist(p, m) - ((m.r || 14) + 12)));
      }
    } else {
      const t = pickTarget(sk.distance + 40);
      if (t) faceTowards(t.x, t.y);
      want = t ? Math.max(0, Math.min(sk.distance, dist(p, t) - ((t.r || 14) + 12))) : sk.distance;
    }
    const dir = { ...p.facing };
    // seit 14.14 über Bäume und Felsen hinweg (hopReach)
    const reach = hopReach(p.x, p.y, dir, want, p.r * 0.7);
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
    const ambush = sk.ambushMul && p.stealthCast > 1;
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
    // seit 13.85 mit Zielkreis: hinter dem Gegner, der dem gewählten Punkt am nächsten ist (aimR um den Punkt)
    const t = sk.aim ? aimEnemyAt(skillAimPoint(sk), sk) : pickTarget(sk.range);
    if (t && sk.aim && !targetIsManual(t)) setTarget(t, false);
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
    // seit 13.85 mit Zielkreis (sk.aim, Donnersturm): am gewählten Ort statt beim Ziel
    const ap = sk.aim ? skillAimPoint(sk) : null;
    const t = ap ? null : pickTarget(sk.range);
    const x = ap ? ap.x : t ? t.x : p.x + p.facing.x * 120;
    const y = ap ? ap.y : t ? t.y : p.y + p.facing.y * 120;
    if (ap || t) faceTowards(x, y);
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
    // Lichtsturz (seit 13.26): eine Lichtsäule stürzt herab und zerbirst, trifft alle im Umkreis und betäubt
    if (sk.fx === 'licht') {
      if (typeof heilerLicht === 'function') heilerLicht(x, y, sk);
      later(0.22, () => {
        particles(x, y - 10, { count: 26, color: ['#fff2a0', '#ffffff', '#ffd36a'], speed: [80, 240], life: [0.25, 0.55], size: [1.5, 3], shape: 'spark', drag: 4 });
        shakeScreen(5);
        hitStop(0.05);
        for (const m of enemiesInCircle(x, y, sk.radius)) hitMonster(m, sk.dmg * pw, { skill: sk.id, stun: sk.stun, heavy: true, vfxColor: '#fff2a0' });
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
    ui.log(skillRankName(sk, lvl) + ' ist aktiv (' + skillDuration(sk, lvl) + ' s).', 'info');
  },

  heal(sk, pw, lvl) {
    const p = game.player;
    const s = game.stats;
    // im PvP zu 60 % (seit 14.15, pvpHealMul)
    const amount = Math.round(s.maxHp * sk.amount * buffScale(lvl) * (s.healPower || 1) * pvpHealMul());
    p.hp = Math.min(s.maxHp, p.hp + amount);
    addText(p.x, p.y - 40, '+' + Math.round(amount), 'heal');
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
    const heal = Math.round(dmg * sk.heal * pvpHealMul());
    p.hp = Math.min(game.stats.maxHp, p.hp + heal);
    addText(p.x, p.y - 40, '+' + Math.round(heal), 'heal');
    const bc = bodyCenter(t);
    addEffect({ type: 'beam', x: bc.x, y: bc.y, follow2: p, dur: 0.45, color: '#c43a5a' });
    const pc = bodyCenter(p);
    const ang = Math.atan2(pc.y - bc.y, pc.x - bc.x);
    particles(bc.x, bc.y, { count: 16, color: ['#ff6a7a', '#c43a5a'], angle: ang, spread: 0.3, speed: [dist(t, p) * 1.6, dist(t, p) * 2.6], life: [0.3, 0.45], size: [2, 3.5], drag: 0.5 });
  },

  // Totenbeschwörung (seit 8.5): drei Diener nach Rang – Skelettkrieger, ab E1 Knochenhunde, seit 13.94 ab H
  // Knochendrachen und ab V Seelenkolosse (Werte in sk.tiers)
  summon(sk, pw, lvl) {
    const p = game.player;
    const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
    const T = sk.tiers[ti];
    // alte Diener zerfallen sichtbar; Geister des Totenrufs bleiben (seit 10.0)
    for (const a of game.allies) if (!a.ghost) allyCrumble(a);
    game.allies = game.allies.filter((a) => a.ghost);
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
    // seit 13.94 mit Mehrzahl aus den Stufen (Knochendrachen, Seelenkolosse)
    ui.log('Drei ' + (T.many || (T.kind === 'hund' ? T.name.replace('hund', 'hunde') : 'Skelettkrieger')) + ' erheben sich aus dem Boden.', 'info');
    return { k: ti, pts };
  },

  curse(sk, pw, lvl) {
    const p = game.player;
    const scale = buffScale(lvl);
    const dur = skillDuration(sk, lvl);
    const col = sk.color || '#a774e0';
    if (!sk.noRunes) addEffect({ type: 'runes', follow: p, ox: 0, oy: 0, r: sk.radius, dur: 0.8, color: col });
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
    // seit 13.85 mit Zielkreis (sk.aim): der Käfig bricht am gewählten Ort aus dem Boden
    const t = sk.aim ? skillAimPoint(sk) : pickTarget(sk.range);
    if (t && Math.hypot(t.x - p.x, t.y - p.y) > 4) faceTowards(t.x, t.y);
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
  // seit 13.42, ab 13.46 nur noch für den Feuerball (focusOnly), seit 14.17 auch Bogen-Grundschuss und Falkenpfeil:
  // ohne Ziel abgeschossen, während ein Ziel gewählt ist, fliegt er nur für dieses Ziel – Monster davor werden nicht
  // getroffen. Alle anderen Geschosse treffen den ersten Gegner auf ihrem Weg (Durchschuss: alle).
  if (o.owner === 'player' && o.focusOnly && !o.target && !o.pierce && !o.onlyHit) {
    const f = game.target;
    if (f && !f.dead && !f.hidden && !f.duelProxy) o.onlyHit = f;
  }
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
      // Duellgegner: Geschosse treffen auch ihn (seit 13.86 auch die Gegner in der Turnierarena, pvpFoes)
      const foes = duelFighting() ? [game.duel.proxy] : typeof pvpFoes === 'function' ? pvpFoes() : [];
      for (const foe of foes) {
        if (foe.dead || pr.hit.has(foe.id) || Math.hypot(foe.x - pr.x, foe.y - pr.y) >= foe.r + pr.radius) continue;
        pr.hit.add(foe.id);
        // Schädelsalve im Duell: der erste Schädel voll, jeder weitere nur mit duelExtra (zusammen 1,5×)
        const mul = pr.mul * (pr.salve && pr.salve.duel++ > 0 ? pr.salve.extra : 1);
        const hm = pr.hitMul ? pr.hitMul(foe) : 1;
        hitMonster(foe, mul * hm, { stun: pr.stun, slow: pr.slow, burn: pr.burn, vfxColor: pr.color, skill: pr.skill, basic: pr.basic, duelMul: pr.duelMul });
        if (pr.afterHit) pr.afterHit(foe, pr);
        if (!pr.pierce) { pr.done = true; break; }
      }
      if (pr.done) continue;
      // Kurvenflug (Schädelsalve): trifft nur sein eigenes Ziel, solange es lebt (fliegt an anderen vorbei)
      // dazu der Feuerball (focusOnly, seit 13.46 nur er): wer vor seinem Ziel steht, wird nicht getroffen
      const only = !pr.pierce && (pr.turn || pr.focusOnly) && pr.target && !pr.target.dead ? pr.target : (pr.onlyHit && !pr.onlyHit.dead ? pr.onlyHit : null);
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

// --- Spieler gegen Spieler (seit 14.15) ------------------------------------------------------------------------------
// Gemeinsame Rechnung für Duell (interaktion.js) und Turnierarena (Rangkampf und 4 gegen 4, turnierarena.js).
// Der Angreifer schickt den rohen Schaden (pvpOutgoing), der Getroffene rechnet in vier Schichten ab (pvpIncoming).
// Die Werte sind mit tools/balance-sim.js --pvp eingestellt (Bericht docs/balance-pvp.md):
//   1. PvP-Faktor nach Stufe des Angreifers: 0,38 bis Stufe 50, dann fallend bis 0,30 auf Stufe 80 (vorher fest 0,6)
//   2. Rüstung zählt doppelt (2 × Verteidigung in der üblichen Formel), höchstens 60 %. Dazu – getrennt, sonst wären sie
//      wertlos, weil die doppelte Rüstung allein schon auf jeder Stufe die 60 % erreicht – Schadensreduktion,
//      „Erlittener Schaden“ (auch aus Buffs) und die Abwehr gegen Menschen und gegen Magie, Nahkampf oder Fernkampf
//      (je nach Angriff), zusammen höchstens 50 %. Beides zusammen also höchstens 80 % weniger.
//   3. Lebenspolster: Schaden geteilt durch 1 + 0,02 × Stufe des Getroffenen (Stufe 80: 2,6-fach); Lebensbalken,
//      Tränke und Heilung bleiben, wie sie sind
//   4. Deckel je Treffer 25 % (kritisch 35 %) des Lebens und höchstens 45 % in 1,5 s (Kombos, mehrere Gegner im 4v4) –
//      nur bei weniger als 10 Stufen Abstand; Stufe 60 darf Stufe 10 weiter umhauen (so gewünscht seit 13.2)
// Ausweichen und Blocken wirken im PvP halb (dodgeMul): mit guter Ausrüstung haben fast alle 45 % Ausweichen, das
// halbierte jeden Kampf und machte ihn zum Würfelspiel.
// Heilung und Lebensraub wirken im PvP zu 60 %. „Stark gegen Menschen“ zählt gegen Spieler, „Stark gegen Monster“ nicht.
// Betäuben, Einfrieren und Wurf gehen im PvP nicht über das Netz (sie zählen dort nur als Schaden, duelMul) – die
// Regel „halb so lang, danach 4 s Schutz“ hat deshalb nichts, worauf sie wirken könnte.
const PVP_DMG = {
  mulLow: 0.38, mulHigh: 0.3, mulFrom: 50, mulTo: 80,
  defMul: 2, armorMax: 0.6, otherMax: 0.5, maxReduce: 0.8, pad: 0.02, dodgeMul: 0.5,
  maxHit: 0.25, maxCrit: 0.35, capGap: 10, window: 1.5, windowMax: 0.45,
  heal: 0.6, toxinTick: 0.015, allyMul: 0.5,
  // seit 14.23: Leben aus Ausrüstungs-Boni (200–1000 je Teil) zählt im PvP nur zu diesem Teil, sonst dauern Duelle mit
  // guter Ausrüstung auf niedriger Stufe über eine Minute
  lifeShare: 0.3
};
// seit 14.29: Ausgleich je Weg (Klasse:Weg) für Schaden gegen Spieler (pvp) und gegen Monster (pve). Der Dolch-Ninja
// gewann rund 90 % seiner Duelle (hoher Schaden je Sekunde, sichere Krits aus Tarnung und Hinterhalt); gegen Spieler
// macht er deshalb weniger Schaden, gegen Monster dafür etwas mehr. Seit 14.30 für alle Wege nach der Messung mit
// tools/balance-sim.js --pvp eingestellt (Siegquoten 11–95 % → 42–55 %, docs/balance-pvp.md). Fehlt ein Weg, gilt 1.
const PATH_DMG = {
  // Krieger · Leib (krieger:1): 1
  'krieger:0': { pvp: 0.8 },  // Krieger · Klinge
  'ninja:0': { pvp: 0.55, pve: 1.1 },  // Ninja · Dolch
  'ninja:1': { pvp: 0.75 },  // Ninja · Falke
  'schamane:0': { pvp: 1.05 },  // Schamane · Drache
  'schamane:1': { pvp: 1.2 },  // Schamane · Heilung
  'nekromant:0': { pvp: 1.1 },  // Nekromant · Seelen
  'nekromant:1': { pvp: 1.1 },  // Nekromant · Knochen
  'magier:0': { pvp: 1.5 },  // Magier · Feuer
  'magier:1': { pvp: 1.3 },  // Magier · Frost
  'magier:2': { pvp: 1.0 },  // Magier · Blitz (zum Nachstellen)
  'magier:3': { pvp: 1.35 }  // Magier · Erde
};
function pathDmgMul(p, kind) {
  const e = p && PATH_DMG[p.classId + ':' + (p.path | 0)];
  return (e && e[kind]) || 1;
}
function pvpMulAt(L) {
  return PVP_DMG.mulLow - (PVP_DMG.mulLow - PVP_DMG.mulHigh) * clamp01(((L || 1) - PVP_DMG.mulFrom) / (PVP_DMG.mulTo - PVP_DMG.mulFrom));
}
// Läuft gerade ein Kampf gegen andere Spieler (Duell oder Turnierarena)?
function pvpActive() {
  if (typeof duelFighting === 'function' && duelFighting()) return true;
  return !!(game.pvpMatch && game.pvpMatch.state === 'fight');
}
// Heilung und Lebensraub im PvP
function pvpHealMul() {
  return pvpActive() ? PVP_DMG.heal : 1;
}
// Art des eigenen Angriffs für die Abwehr des Getroffenen: Zauber (s) sind Fertigkeiten und Ultis von Magier, Schamane
// und Nekromant; der Grundangriff ist Fern- (r) oder Nahkampf (m) nach Waffe; Krieger und Dolch-Ninja Nahkampf,
// der Bogen-Ninja Fernkampf; Diener Nahkampf
function pvpAttackKind(p, opts) {
  if (opts.ally) return 'm';
  if (opts.basic) return basicAttack(p).ranged ? 'r' : 'm';
  if (p.classId === 'magier' || p.classId === 'schamane' || p.classId === 'nekromant') return 's';
  return p.classId === 'ninja' && (p.path | 0) === 1 ? 'r' : 'm';
}
// Treffer auf einen anderen Spieler: Nachricht mit rohem Schaden (a), krit (c), Stufe (l), Angriffsart (at: m/r/s) und Gift (pz)
// (nicht „k“: das ist die Art der Nachricht, 'dh' bzw. 'pvh')
function pvpOutgoing(mul, opts) {
  const p = game.player;
  const s = game.stats;
  const base = opts.atk != null ? opts.atk : s.atk;
  const crit = !opts.ally && Math.random() < s.crit + (opts.critBonus || 0);
  if (!opts.ally && !opts.dot) breakStealth(p);
  // duelMul (seit 8.6): Kontroll-Fertigkeiten des Magiers gleichen im Duell aus, dass Zustände dort nur als Schaden zählen
  const raw = base * mul * (opts.ally ? PVP_DMG.allyMul : 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.8 + (s.critDmg || 0) : 1) *
    (opts.basic ? 1 + (s.basicDmg || 0) : 1) * (opts.duelMul || 1) * (opts.ally ? 1 : (1 + (s.vsHuman || 0)) * pathDmgMul(p, 'pvp'));
  const d = { a: Math.round(raw), c: crit ? 1 : 0, l: p.level, at: pvpAttackKind(p, opts) };
  if (opts.ally) d.al = 1; // Treffer eines Dieners: kein Lebensraub für den Herrn
  if (!opts.ally && !opts.dot && s.poison > 0 && Math.random() < s.poison) d.pz = Math.max(1, Math.round((raw * TOXIN.share) / TOXIN.dur));
  return d;
}
// Schaden, den ein Treffer d beim Getroffenen (Stufe level, Werte s) anrichtet. win: Liste der wirklich erlittenen
// Treffer ({ t, a }) für den Deckel in 1,5 s (null = ohne; alte Einträge fallen heraus, den neuen trägt der Aufrufer
// ein). Ergebnis ganzzahlig, 0 = gedeckelt.
function pvpIncoming(level, s, d, win, now) {
  const L = Math.max(1, d.l || 1);
  let a = (+d.a || 0) * pvpMulAt(L);
  const defP = PVP_DMG.defMul * (s.def || 0);
  const armor = defP / (defP + 40 + 5 * (L - 1));
  // Rüstung höchstens armorMax; Schadensreduktion, „Erlittener Schaden“ (auch aus Buffs) und Abwehr zusammen höchstens
  // otherMax, beides zusammen höchstens maxReduce
  const other = Math.min(PVP_DMG.otherMax, 1 - (s.damageTaken != null ? s.damageTaken : 1) + attackResist(s, d.at, true));
  a *= Math.max(1 - PVP_DMG.maxReduce, (1 - Math.min(PVP_DMG.armorMax, armor)) * (1 - other));
  a /= 1 + PVP_DMG.pad * level;
  const bh = Math.min(s.bonusHp || 0, (s.maxHp || 1) * 0.9);
  if (bh > 0) a *= s.maxHp / Math.max(1, s.maxHp - bh * (1 - PVP_DMG.lifeShare));
  if (L - level < PVP_DMG.capGap) {
    a = Math.min(a, Math.floor(s.maxHp * (d.c ? PVP_DMG.maxCrit : PVP_DMG.maxHit)));
    if (win) {
      while (win.length && now - win[0].t >= PVP_DMG.window) win.shift();
      const sum = win.reduce((x, h) => x + h.a, 0);
      a = Math.max(0, Math.min(a, s.maxHp * PVP_DMG.windowMax - sum));
    }
  }
  return Math.max(0, Math.round(a));
}
// Getroffen von einem anderen Spieler: abrechnen, Gift übernehmen; Rückgabe: wirklich abgezogenes Leben.
// src: Stellvertreter des Angreifers, fb(dealt): Rückmeldung eines Gift-Ticks an den Angreifer
function pvpReceiveHit(d, src, fb) {
  const p = game.player;
  const s = game.stats;
  p.pvpWin = p.pvpWin || [];
  const amount = pvpIncoming(p.level, s, d, p.pvpWin, game.time);
  const before = p.hp;
  if (amount > 0) damagePlayer(amount, src, { pvp: true });
  const dealt = Math.max(0, Math.round(before - p.hp));
  // ausgewichen, geblockt oder vom Schild geschluckt zählt nicht zum Deckel in 1,5 s
  if (dealt > 0) p.pvpWin.push({ t: game.time, a: dealt });
  if (d.pz > 0 && !p.dead) pvpToxinIn(d, src, fb);
  return dealt;
}
// Gift eines anderen Spielers: je Tick höchstens 1,5 % des Lebens; PvP-Faktor, Abwehr gegen Menschen und Lebenspolster
function pvpToxinIn(d, src, fb) {
  const p = game.player;
  const s = game.stats;
  const L = Math.max(1, d.l || 1);
  let tick = (d.pz * pvpMulAt(L) * (1 - Math.min(PVP_DMG.maxReduce, s.resHuman || 0))) / (1 + PVP_DMG.pad * p.level);
  tick = Math.max(1, Math.round(Math.min(tick, s.maxHp * PVP_DMG.toxinTick)));
  const old = p.toxin && p.toxin.until > game.time ? p.toxin : null;
  p.toxin = { dps: old ? Math.max(old.dps, tick) : tick, until: game.time + TOXIN.dur, tick: old ? old.tick : 0, src, fb };
}
// jedes Bild (spiel.js): Gift an der eigenen Figur ticken lassen; endet mit dem Kampf
function playerToxinTick(p, dt) {
  const t = p.toxin;
  if (!t) return;
  if (p.dead || t.until <= game.time || !pvpActive()) {
    p.toxin = null;
    return;
  }
  t.tick += dt;
  if (t.tick < 1) return;
  t.tick -= 1;
  const before = p.hp;
  damagePlayer(t.dps, t.src, { pvp: true, dot: true });
  if (t.fb) t.fb(Math.max(0, Math.round(before - p.hp)));
}
// Wie viel vom rohen Schaden beim Gegner wirklich ankommt (gleitender Schnitt aus seinen Rückmeldungen 'dd'/'pvf').
// duelHit/pvpHit geben damit eine Schätzung des echten Schadens zurück, von der Fertigkeiten mit Lebensentzug heilen
// (vorher die Hälfte des rohen Schadens – auf hohen Stufen ein Vielfaches dessen, was wirklich ankam)
function pvpDealtRatio(m) {
  const p = game.player;
  if (p.pvpRatio > 0) return p.pvpRatio;
  const L = (m && m.level) || p.level;
  return (pvpMulAt(p.level) * 0.35) / (1 + PVP_DMG.pad * L);
}
function pvpNoteDealt(raw, dealt) {
  const p = game.player;
  if (!(raw > 0) || !(dealt >= 0)) return;
  const r = Math.min(1, dealt / raw);
  p.pvpRatio = p.pvpRatio > 0 ? p.pvpRatio * 0.7 + r * 0.3 : r;
}
// Rückmeldung des Getroffenen (wirklicher Schaden): Lebensraub und Omni-Vampir im PvP zu 60 %, je Treffer höchstens 3 %
function pvpLifeSteal(dealt) {
  const p = game.player;
  const s = game.stats;
  const k = (s.hpSteal || 0) + (s.omniVamp || 0);
  if (!(dealt > 0) || !(k > 0) || p.dead) return;
  const gain = Math.min(s.maxHp - p.hp, dealt * k * PVP_DMG.heal, s.maxHp * 0.03);
  if (gain > 0) {
    p.hp += gain;
    p.stealSum = (p.stealSum || 0) + gain;
    later(0.3, showLifeSteal);
  }
}
