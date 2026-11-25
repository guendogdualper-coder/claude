// Turnierarena gegen Bots: Wer in der PvP-Arena keine Mitspieler findet, kämpft gegen computergesteuerte Gegner
// (Spielerwunsch: „auf Online-Spieler zu warten macht nicht so viel Sinn – es sind noch nicht so viele da“).
// Ausführlich mit Werten, Punkten und Tests in docs/pvp-bots.md.
//
// - Start: Knopf „Gegen Bots“ beim Turniermeister (jede Art: 1v1, 2v2, 3v3, Turmschlacht 4v4) oder von selbst, wenn
//   man ABOT.wait (20) Sekunden in der Warteschlange steht, ohne dass der Host einen Kampf zusammenbekommt. Ohne Server
//   (offline) gibt es nur „Gegen Bots“. Zwischen zwei Bot-Kämpfen liegen mindestens ABOT.pause (10) Sekunden.
// - Ein Bot-Kampf läuft ganz auf dem eigenen Gerät, auch ohne Netz, in einer Halle, in der niemand steht. Man verlässt
//   dafür die Warteschlange; echte Spieler kommen nie in einen Bot-Kampf. Kommt während des Countdowns doch noch ein
//   echter Kampf vom Host, entfällt der Bot-Kampf ohne Wertung.
// - Ablauf wie ein echtes Spiel der Turnierarena (turnierarena.js): Die eigene Figur bekommt Start, Zwischenstände und
//   Ende als dieselben Nachrichten, die sonst der Host schickt (pvpOnMatch, pvpOnUpdate, pvpOnEnd). Anzeige, Ergebnis,
//   Verlassen, Fall und Wiedereinstieg laufen über den vorhandenen Code. Was sonst ins Netz ginge – Treffer an einen
//   Bot (pvpSend 'pvh'), Fall und Verlassen an den Host (pvpToHost 'pvd'/'pvl') – fängt diese Datei ab und rechnet es
//   hier (abotMsg, abotLocal). Die Führung des Spiels (Countdown, Ende, Turm, Kills) macht abotRun wie sonst der Host.
// - Bots sehen aus wie Spielerfiguren: zufällige Klasse, Weg, Geschlecht und Aussehen, Name aus Silben mit „(Bot)“,
//   Lebensbalken und Rang-Stein in der Teamfarbe (2D: collectScene, 3D: V3.extra für die Figur und v3Monsters während
//   drawOverlay3 für Name und Balken). Für das Zielen stehen sie wie echte Gegner als Stellvertreter in pvpFoes.
// - Stärke: Stufe wie die eigene Figur, Werte aus einem erzeugten Charakter dieser Stufe (playerStats mit Statuspunkten,
//   Klassensegen und Seelenstufen wie bei der Figur), die Ausrüstung ist der eigenen nachgebaut (Stufe, Plus, Seltenheit,
//   Boni, Juwelen und Sets je Platz, passend für die Klasse des Bots). Dazu ein Faktor nach dem eigenen Rang auf Angriff
//   und Leben (ABOT.rankMul: Bronze 0,88 … Champion 1). Die Fertigkeiten haben die Stufe, die die eigenen im Schnitt
//   haben. Wer die Ausrüstung kurz vorher ablegt, bekommt trotzdem Bots nach der stärksten Ausrüstung der letzten
//   10 Minuten; wird die Ausrüstung im Kampf stärker, ziehen die Bots nach.
// - Schaden: wie zwischen echten Spielern. Treffer eines Bots gehen über pvpReceive → pvpReceiveHit (Deckel, Rüstung,
//   Abwehr, Polster, Gift, Blutung, Betäubung des Sprungschlags); Fertigkeiten tragen sk: 1 (seit 15.80 kein Ausweichen
//   und Blocken). Treffer auf einen Bot rechnet pvpIncoming mit den Werten des Bots; Ausweichen und Blocken würfelt der
//   Bot wie damagePlayer (nur Grundangriffe, im PvP halb).
// - KI (abotThink/abotAct): Ziel wählen und gelegentlich wechseln (Abstand, Leben, Zufall), anlaufen bzw. Abstand halten
//   (Fernkämpfer und Zauberer), Grundangriffe, die eigenen Fertigkeiten mit Abklingzeit und kurzer Pause dazwischen
//   (Bild wie bei einem Mitspieler über remoteSkillFx), Flächen am Ziel mit Warnkreis, bei wenig Leben Tränke und
//   kurzes Zurückweichen, Ausweichen aus Flächen. Bot-Mitspieler kämpfen für das eigene Team und heilen es.
// - Punkte: Ranglisten-Kämpfe gegen Bots zählen halb (Sieg +PVP.win/2, Niederlage −PVP.loss/2), auch für Saison und
//   Erfolge (Siege gegen Bots zählen dort halb, p.pvp.bw/bl). Verlassen und Aufgeben zählen als (halbe) Niederlage.
//   Ein Sieg zählt nur nach einem echten Kampf (mindestens ABOT.minFight Sekunden und selbst mindestens ABOT.minDealt
//   vom Leben eines Gegners abgezogen), sonst +0.

const ABOT = {
  wait: 20,               // so lange (s) in der Warteschlange ohne genug Spieler, dann füllen Bots auf
  pause: 10,              // Wartezeit (s) zwischen zwei Bot-Kämpfen
  minFight: 12,           // ein Sieg zählt erst nach so vielen Sekunden Kampf …
  minDealt: 0.5,          // … und wenn man selbst so viel vom Leben eines Gegners (Schnitt der Gegner) abgezogen hat
  // Faktor auf Angriff und Leben der Bots nach der eigenen Rangstufe (Bronze, Silber, Gold, Platin, Diamant, Champion)
  rankMul: [0.88, 0.9, 0.92, 0.95, 0.97, 1],
  dmg: 1.2,               // Ausgleich der KI (keine Ulti, langsamer als ein Mensch), mit dem Testlauf eingestellt (docs/pvp-bots.md)
  // je Weg (Klasse:Weg) zusätzlich, wo der Bot im Spiegelduell gegen die Spieler-KI klar stärker oder schwächer war
  // (Ulti, Diener und Heilung bringen je Weg verschieden viel, die Bots haben Ulti und Diener nicht). Aus allen
  // Messungen mit 3–21 Kämpfen je Weg (Läufe mit dmg 1,2–1,25, docs/pvp-bots.md), bewusst maßvoll: ein Kampf
  // entscheidet sich oft an wenigen großen Treffern, die Werte streuen stark. Fehlt ein Weg, gilt 1.
  weg: {
    'krieger:0': 1.06,    // Klinge: mit 1,0–1,04 gewann die Spieler-KI 17 von 21, mit 1,08–1,15 nur 2 von 7
    'krieger:1': 0.92,    // Leib: Bot gewann 5 von 7
    'ninja:1': 0.8,       // Falke: mit 0,85–1,0 gewann der Bot 12 von 13, mit 0,78 die Spieler-KI 3 von 3 (Pfeilregen und
                          // Salven treffen stehende Ziele voll; unter zwei Bogenschützen entscheidet wenig Schaden mehr viel)
    'schamane:0': 1.05,   // Drache: Spieler-KI gewann 10 von 15
    'schamane:1': 1.15,   // Heilung: ohne Lichtkuppel und Ulti (1,0: 3 von 3 für die Spieler-KI, 1,35: 1 von 4)
    'nekromant:0': 1.15,  // Seelen: ohne Diener (1,0: 3 von 3 für die Spieler-KI, 1,3: 1 von 4)
    'nekromant:1': 0.78,  // Knochen: Bot gewann 14 von 15 (Blutlanzen und Flächen treffen stehende Ziele voll)
    'magier:1': 1.05,     // Frost: Spieler-KI gewann 5 von 7
    'magier:2': 0.92      // Blitz: mit 1,0 gewann der Bot 2 von 3, mit 0,92 nur 1 von 4
  },
  think: [0.2, 0.4],      // Bedenkzeit (s) zwischen zwei Entscheidungen
  gcd: [0.5, 1],          // Pause (s) nach jeder Fertigkeit, wie ein Mensch zwischen zwei Tasten (mindestens die der Klasse)
  cdSlack: [1, 1.12],     // Fertigkeiten kommen nicht genau beim Ablauf der Abklingzeit
  potions: 3,             // Lebenstränke je Kampf (größte Größe der Stufe, im PvP zu 85 % wie bei der Figur)
  potAt: 0.4,             // … unter diesem Anteil Leben
  retreatAt: 0.3,         // unter diesem Anteil Leben weichen sie manchmal kurz zurück …
  retreatChance: 0.4,     // … mit dieser Wahrscheinlichkeit (einmal je Tiefpunkt) …
  retreatFor: [1.3, 2.3], // … so lange (s)
  switchEvery: [6, 11],   // nach so vielen Sekunden prüfen sie, ob ein anderes Ziel besser ist
  peakKeep: 600,          // so lange (s) gilt die stärkste zuletzt getragene Ausrüstung als Vorbild
  adaptGs: 2,             // so viel Ausrüstungslevel mehr im Kampf, dann ziehen die Bots nach
  shotR: 46,              // gezielte Geschosse treffen in diesem Umkreis um den gezielten Punkt
  fight: 380              // Turmschlacht: Gegner in diesem Abstand werden angegriffen, sonst geht es zum Turm
};
const ABOT_CLASSES = ['krieger', 'ninja', 'schamane', 'nekromant', 'magier'];
const ABOT_SLOTS = ['waffe', 'ruestung', 'helm', 'schultern', 'umhang', 'schild', 'schuhe', 'guertel'];

// Laufzustand: run = laufender Kampf (lokale Führung), bots, q = Warteschlange (Modus, seit wann), figs3 = Figuren für
// die 3D-Szene (V3.extra), peak = stärkste Ausrüstung der letzten Minuten
const abot = { run: null, bots: [], figs3: [], q: null, pauseUntil: 0, nextId: 1, peak: null, peakAt: -99, ov: false, lastT: null, pv: { x: 0, y: 0 }, pLast: null, npcAt: 0, fxErr: false, failAt: -99 };

const abRand = (a, b) => a + Math.random() * (b - a);
const abPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const abRep = (n, f) => Array.from({ length: Math.max(0, n | 0) }, (_, k) => f(k));
const abHalf = (v) => Math.floor(v / 2);
const abIsBot = (pid) => typeof pid === 'string' && pid.startsWith('bot:');
// Rangpunkte für die Dauer von fn umstellen (halbe Punkte gegen Bots): pvpOnEnd, pvpLeave, pvpSummary und die Anzeige
// rechnen mit PVP.win/PVP.loss – alles läuft hier am Stück, nichts anderes sieht die geänderten Werte
function abotWithPts(win, loss, fn) {
  const w = PVP.win;
  const l = PVP.loss;
  PVP.win = win;
  PVP.loss = loss;
  try {
    return fn();
  } finally {
    PVP.win = w;
    PVP.loss = l;
  }
}

// --- Namen: frei erfundene Silben (keine echten Personen, keine Marken) ------------------------------------------------
const ABOT_NAMEN = {
  vorn: ['Ar', 'Bel', 'Cor', 'Dra', 'Eld', 'Fyr', 'Gal', 'Hro', 'Ith', 'Jor', 'Kael', 'Lys', 'Mor', 'Nym', 'Ory', 'Pyr', 'Quel', 'Ryn', 'Syl', 'Thar',
    'Ul', 'Vey', 'Wyr', 'Xan', 'Yr', 'Zel', 'Brann', 'Grim', 'Vel', 'Tor'],
  mitte: ['a', 'e', 'i', 'o', 'y', 'ae', 'ia', '', '', ''],
  hinten: ['dor', 'neth', 'vash', 'mir', 'lith', 'gar', 'wyn', 'drel', 'thas', 'rok', 'vyn', 'sora', 'nax', 'quin', 'zar', 'rhel', 'mund', 'kesh', 'dris', 'vain']
};
function abotName(used) {
  for (let k = 0; k < 80; k++) {
    const raw = abPick(ABOT_NAMEN.vorn) + abPick(ABOT_NAMEN.mitte) + abPick(ABOT_NAMEN.hinten);
    const n = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (n.length < 4 || n.length > 11 || used.has(n.toLowerCase()) || /(.)\1\1/.test(n)) continue;
    if (typeof nameAnstoessig === 'function' && nameAnstoessig(n)) continue;
    used.add(n.toLowerCase());
    return n;
  }
  return 'Bot ' + (used.size + 1);
}

// --- Charakter eines Bots -------------------------------------------------------------------------------------------
// höchste Gegenstandsstufe, die eine Figur dieser Stufe tragen darf
function abotTierFor(level) {
  let t = 0;
  ITEM_TIERS.forEach((x, i) => { if (level >= x.level) t = i; });
  return t;
}
// Waffe je Klasse und Weg (Zweihänder nur auf dem Weg des Leibes, Bogen nur auf dem Weg des Falken)
function abotWeapon(cls, path) {
  if (cls === 'krieger') return path === GREATSWORD_PATH ? abPick(['greatsword', 'greataxe', 'sword']) : abPick(['sword', 'axe']);
  if (cls === 'ninja') return path === 1 ? 'bow' : 'dagger';
  if (cls === 'schamane') return abPick(['fan', 'fan', 'bell']);
  if (cls === 'nekromant') return abPick(['staff', 'staff', 'scythe']);
  return 'rod';
}
// mittlerer Wert eines Bonus auf dieser Gegenstandsstufe (Ersatz, wenn ein Bonus des Vorbilds hier nicht vorkommt)
function abotBonusMid(t, tier) {
  const def = BONUS_TYPES[t];
  if (def.steps) {
    const st = hpSteps(tier);
    return st[Math.floor(st.length / 2)];
  }
  const f = bonusTierMul(def, tier);
  const v = (def.range[0] * f + Math.min(def.max || Infinity, def.range[1] * f)) / 2;
  return def.fmt === 'flat' ? Math.max(1, Math.round(v)) : def.fmt === 'pct1' ? Math.round(v * 10000) / 10000 : Math.round(v * 1000) / 1000;
}
// Boni des Vorbilds für die Klasse des Bots: Statuswerte auf die eigenen (Hauptwert bleibt Hauptwert), was auf dem
// Platz nicht vorkommt, wird ein passender Grundwert
function abotBonuses(list, it, cls, fromCls) {
  const out = [];
  const main = MAIN_ATTR[cls];
  const fit = CLASS_BONUS_ATTRS[cls] || ['vit'];
  const ok = (t) => BONUS_TYPES[t] && (!BONUS_TYPES[t].slots || BONUS_TYPES[t].slots.includes(it.slot)) && !out.some((b) => b.t === t);
  for (const b of Array.isArray(list) ? list : []) {
    if (!b || !BONUS_TYPES[b.t]) continue;
    let t = b.t;
    let v = b.v;
    if (ATTR_BONUS_IDS.includes(t)) t = t === MAIN_ATTR[fromCls] ? main : fit.includes(t) ? t : 'vit';
    if (!ok(t)) {
      const alt = ['atk', 'def', 'hp', 'crit', main, 'vit'].find(ok);
      if (!alt) continue;
      t = alt;
      v = abotBonusMid(alt, it.tier);
    }
    out.push({ ...b, t, v });
  }
  return out.slice(0, MAX_NORMAL_BONUS);
}
// ein Teil nach dem Vorbild src (Stufe, Plus, Seltenheit, Boni, Juwelen, Set …) für Klasse und Waffenart des Bots;
// ohne Vorbild ein schlichtes Teil der Stufe tier
function abotItem(src, slot, cls, kind, tier, fromCls) {
  const t = Math.max(0, Math.min(tier, src && Number.isInteger(src.tier) ? src.tier : tier));
  const it = makeItem(slot, t, 0, cls, kind);
  if (src) {
    for (const [k, v] of Object.entries(src)) {
      if (['uid', 'slot', 'tier', 'cls', 'kind', 'fv', 'bonuses'].includes(k)) continue;
      it[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
    it.plus = Math.max(0, Math.min(MAX_PLUS, src.plus | 0));
    it.bonuses = abotBonuses(src.bonuses, it, cls, fromCls);
  }
  if (slot === 'waffe' && kind) it.kind = kind;
  return it;
}
// Ausrüstung des Bots nach dem Vorbild ref (Ausrüstung der eigenen Figur): je Platz dasselbe Teil für seine Klasse.
// Fehlt dem Vorbild ein Teil, bekommt der Bot ein schlichtes Teil (Stufe wie im Schnitt beim Vorbild, +0, ohne Boni).
function abotGear(ref, fromCls, cls, path, level) {
  const tMax = abotTierFor(level);
  const kind = abotWeapon(cls, path);
  const two = !!(WEAPON_KINDS[kind] && WEAPON_KINDS[kind].twoHanded);
  const src = (sl) => (ref && ref[sl] && ref[sl].slot ? ref[sl] : null);
  const tiers = ABOT_SLOTS.map(src).filter(Boolean).map((x) => x.tier | 0);
  const plain = Math.min(tMax, tiers.length ? Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length) : tMax);
  const eq = { waffe: null, ruestung: null, helm: null, schultern: null, umhang: null, schild: null, schuhe: null, guertel: null };
  for (const sl of ['waffe', 'ruestung', 'helm', 'schultern', 'umhang', 'schuhe', 'guertel']) {
    const s = src(sl);
    eq[sl] = abotItem(s, sl, cls, sl === 'waffe' ? kind : null, s ? tMax : plain, fromCls);
  }
  // Nebenhand: Schild (Krieger mit Einhandwaffe), zweiter Dolch oder Köcher (Ninja) – nach dem Teil des Vorbilds in
  // der Nebenhand, sonst nach seiner Waffe
  const off = src('schild') || src('waffe');
  if (cls === 'krieger' && !two) eq.schild = abotItem(off && off.slot === 'schild' ? off : off ? { ...off, slot: 'schild' } : null, 'schild', cls, null, off ? tMax : plain, fromCls);
  else if (cls === 'ninja' && kind === 'dagger') eq.schild = abotItem(off ? { ...off, slot: 'waffe' } : null, 'waffe', 'ninja', 'dagger', off ? tMax : plain, fromCls);
  else if (cls === 'ninja' && kind === 'bow') eq.schild = abotItem(off ? { ...off, slot: 'koecher' } : null, 'koecher', 'ninja', null, off ? tMax : plain, fromCls);
  return eq;
}
// Aussehen: Geschlecht, Frisur, Farben, Bart, Größe zufällig (Werte wie bei der Charaktererstellung, LOOKS in figuren.js)
function abotLook(cls) {
  const sex = Math.random() < 0.5 ? 0 : 1;
  return {
    ...DEFAULT_LOOKS[cls], sex, hair: Math.floor(Math.random() * LOOKS.hair.length), hc: Math.floor(Math.random() * LOOKS.hairColor.length),
    skin: Math.floor(Math.random() * LOOKS.skin.length), eyes: Math.floor(Math.random() * LOOKS.eyes.length), ec: Math.floor(Math.random() * LOOKS.eyeColor.length),
    mark: Math.random() < 0.7 ? 0 : 1 + Math.floor(Math.random() * (LOOKS.mark.length - 1)), bart: sex === 0 ? Math.floor(Math.random() * LOOKS.beard.length) : 0,
    helm: Math.random() < 0.8 ? 1 : 0, gr: Math.round(abRand(94, 106))
  };
}
// Statuspunkte wie ein üblicher Aufbau: alles in den Hauptwert, der Rest in Vitalität
function abotAttrs(cls, level) {
  const pts = STAT_POINTS_PER_LEVEL * Math.max(0, level - 1);
  const a = { str: 0, vit: 0, int: 0, dex: 0 };
  const main = MAIN_ATTR[cls];
  a[main] = Math.min(MAX_ATTR, pts);
  a.vit = Math.min(MAX_ATTR, pts - a[main]);
  return a;
}
// Klassensegen als dauernder Buff (ab Stufe 10, wie ihn die meisten Spieler an haben)
function abotSegen(ch) {
  if (typeof segenOf !== 'function' || ch.level < SEGEN_UNLOCK) return null;
  const def = segenOf(ch);
  if (!def) return null;
  return { id: def.id, name: def.name, lvl: 1, until: game.time + SEGEN_DUR, duration: SEGEN_DUR, effects: def.effects(segenSteps(ch.level)), segen: true };
}
// Werte neu (nach Buffs): playerStats des erzeugten Charakters, Leben mit dem Rangfaktor; der Anteil Leben bleibt
function abotStats(b) {
  const now = game.time;
  const fr = b.maxHp ? b.hp / b.maxHp : 1;
  b.buffs = b.buffs.filter((x) => x.until > now);
  b.ch.buffs = b.buffs;
  const s = playerStats(b.ch);
  s.maxHp = Math.max(1, Math.round(s.maxHp * b.k));
  s.bonusHp = (s.bonusHp || 0) * b.k;
  s.invisible = false;
  b.st = s;
  b.maxHp = s.maxHp;
  if (!b.dead) b.hp = Math.max(1, Math.min(b.maxHp, Math.round(b.maxHp * fr)));
  b.fig.buffs = b.buffs;
}

// --- Fertigkeiten der Bots ----------------------------------------------------------------------------------------
// Ablauf je Art (sk.type) für einen Bot, ohne den Spielcode der eigenen Figur: a = wie sie wirkt, reach = Reichweite,
// r = Trefferkreis, hits = [Zeitpunkt (s), Faktor] je Treffer auf ein Ziel. Arten:
//   m = um den Bot (Wirbel, Nova) · s = ein Ziel nah (Stich, Riss) · g = Sprung/Blinzeln zum Ziel, Treffer dort ·
//   f = Schritt weg vom Ziel, Treffer am alten Platz · p = Geschoss auf das Ziel (speed 0: sofort) ·
//   z = Fläche am Ziel (Warnkreis, trifft nur, wer dann noch drinsteht) · c = Strahl (gehalten) · w = Wirken, dann Geschoss ·
//   b = Buff · h = Heilung. Flüche, Diener und Totenruf lassen Bots weg (Zustände wirken im PvP ohnehin nicht).
// Die Zahlen kommen aus den Fertigkeiten selbst (daten/klassen.js, mit den Rang-Boni der Stufe, rankSk). Wo die
// eigene Figur mehr Treffer landet, als die Werte allein sagen (Rang-Boni mit Nachhall, Pulsen, Splittern), gleicht fix
// das aus – gemessen mit dem Spielcode auf ein stehendes Ziel (docs/pvp-bots.md, Abschnitt Tests).
function abotPlan(s, rank) {
  const P = abotPlan0(s, rank == null ? -1 : rank);
  if (P && P.fix && P.hits) P.hits = P.hits.map(([t, m]) => [t, m * P.fix]);
  return P;
}
function abotPlan0(s, rank) {
  const z = (hits, fix) => ({ a: 'z', reach: s.range || 300, r: s.radius || 100, hits, fix });
  switch (s.type) {
    case 'flurry': return { a: 'm', reach: (s.radius || 100) * 0.8, hits: [...abRep(s.hits || 3, (k) => [0.12 + k * 0.13, s.dmg]), [0.14 + (s.hits || 3) * 0.13, s.finDmg || s.dmg]], bleed: s.bleed };
    case 'circle': return { a: 'm', reach: (s.radius || 100) * 0.85, hits: [[0.2, s.dmg]] };
    case 'vortex': return { a: 'm', reach: (s.radius || 150) * 0.8, hits: abRep(s.hits || 3, (k) => [0.25 + k * 0.35, s.dmg]) };
    case 'nova': return { a: 'm', reach: (s.radius || 130) * 0.8, hits: [[0.25, s.dmg]], fix: rank >= 0 ? 1.45 : 1 };
    case 'strike': return { a: 's', reach: s.range || 70, hits: [[0.15, s.dmg]] };
    case 'erupt': return { a: 's', reach: s.range || 120, hits: [[0.36, s.dmg]] };
    case 'leap': return { a: 'g', move: 'leap', reach: s.distance || 260, r: s.radius || 80, hits: [[(s.crouch || 0.06) + (s.air || 0.28), s.dmg]] };
    case 'blink': return { a: 'g', move: 'blink', reach: s.range || 300, r: 70, hits: [[0.12, s.dmg]] };
    case 'chainblink': {
      // Sprünge je Rang (rankHops), jeder weitere Treffer auf dasselbe Ziel zählt halb (repeatMul)
      const n = Math.min(7, (Array.isArray(s.rankHops) && rank >= 0 ? s.rankHops[Math.min(rank, s.rankHops.length - 1)] : 0) || s.hops || 4);
      return { a: 'g', move: 'chain', reach: s.range || 300, r: 90, hops: n, hits: abRep(n, (k) => [0.05 + k * (s.every || 0.13), s.dmg * (k ? s.repeatMul || 0.5 : 1)]) };
    }
    case 'shift':
      return s.at === 'start' ? { a: 'f', move: 'shift', reach: 140, r: s.radius || 95, dist: s.distance || 160, hits: [[s.delayHit || 0.5, s.dmg]] }
        : { a: 'g', move: 'dash', reach: s.distance || 200, r: (s.width || 40) + 24, hits: [[0.1, s.dmg]], fix: s.trail ? 1.6 : 1 };
    case 'bshadow': return { a: 'f', move: 'shadow', reach: 140, r: s.radius || 80, dist: s.aimAway || 200, hits: [[s.hide || 0.2, s.dmg]] };
    case 'bshot': {
      const n = Math.min(4, s.count || 3);
      return { a: 'p', reach: s.range || 520, speed: s.speed || 1000, hits: abRep(n, (k) => [k * (s.every || 0.15), s.dmg * (k === n - 1 ? s.lastMul || 1 : 1)]) };
    }
    case 'bpierce': return { a: 'p', reach: s.range || 600, speed: s.speed || 1200, hits: [[0.18, s.dmg]], fix: rank >= 0 ? 1.38 : 1 };
    case 'dragon': case 'bonethrow': case 'mphoenix': return { a: 'p', reach: s.range || 340, speed: s.speed || 600, hits: [[0, s.dmg]] };
    case 'mbolt': return { a: 'p', reach: s.range || 340, speed: s.instant ? 0 : s.speed || 600, hits: [[s.instant ? 0.1 : 0, s.dmg]] };
    case 'mspear': return { a: 'p', reach: s.range || 500, speed: 0, hits: [[0.12, s.dmg]] };
    case 'lifetap': return { a: 'p', reach: s.range || 300, speed: 0, hits: [[0.25, s.dmg]], heal: s.heal };
    // Blutlanzen: alle Lanzen auf ein einzelnes Ziel (lanceFx), je Lanze Lebensraub
    case 'bloodlances': return { a: 'p', reach: s.range || 280, speed: 0, hits: abRep(s.count || 6, (k) => [0.5 + k * 0.06, s.dmg]), leech: s.leech };
    case 'mwave': return { a: 'p', reach: (s.length || 300) * 0.85, speed: s.speed || 520, hits: [[0, s.dmg]] };
    case 'bregen': return z(abRep(s.ticks || 10, (k) => [(s.delay || 0.85) + k * (s.every || 0.5), s.dmg]), 1.8);
    case 'bsplitter': return z([[0.55, s.dmg], [0.9, s.spikeDmg || 0]], 1.38);
    case 'blizzard': {
      const n = s.ticks || 8;
      return z(abRep(n, (k) => [0.35 + (k * (s.duration || 4)) / n, s.dmg]));
    }
    case 'blast': return z([[0.3, s.dmg]]);
    case 'cage': return z(abRep(s.pulses || 5, (k) => [(s.rise || 0.35) + k * (s.every || 1), s.dmg]));
    case 'ghostflood': {
      // jeder Geist fährt in einen Gegner im Feld (bei einem Ziel alle), am Ende der Ausbruch (floodFx)
      const r0 = s.rise || 0.55;
      const n = s.ghosts || 8;
      return z([...abRep(n, (k) => [r0 + k * 0.06 + 0.32, s.dmg]), [r0 + n * 0.06 + 0.35, (s.burst && s.burst.dmg) || s.dmg]]);
    }
    case 'larva': return z([[(s.hop || 0.55) + (s.wriggle || 0.4), s.dmg]]);
    case 'gravehand': return z([[s.grab || 0.4, s.dmg], [(s.grab || 0.4) + (s.hold || 1.6), s.crush || 0]]);
    case 'mfield': case 'sigil': return z(abRep(s.ticks || 5, (k) => [(s.delay || 0.4) + k * (s.every || 0.5), s.dmg]));
    case 'msnow': return z(abRep(s.ticks || 8, (k) => [(s.delay || 0.5) + k * (s.every || 0.5), s.dmg]), rank >= 0 ? 1.38 : 1);
    // mehrere Tornados ziehen durch das Feld; wer drin steht, wird alle 0,5 s von einem erfasst
    case 'mtornado': return z(abRep(Math.round((s.life || 4) / 0.27), (k) => [(s.delay || 0.4) + 0.3 + k * 0.27, s.dmg]));
    case 'mprison': return z([[s.delay || 0.45, s.dmg], [(s.delay || 0.45) + (s.hold || 1.5), s.crack || 0]]);
    case 'mstorm': {
      // Gewitter: jeder Blitz trifft einen Gegner in der Wolke (bei einem Ziel alle), dann die Entladung
      const f0 = s.form || 0.6;
      const ev = s.every || 0.3;
      const n = s.strikes || 6;
      return z([...abRep(n, (k) => [f0 + k * ev, s.dmg]), [f0 + n * ev, (s.final && s.final.dmg) || s.dmg]], 1.12);
    }
    case 'mclash': return z([[0.35, s.dmg]]);
    case 'mspikes': return z([[0.3, s.dmg]]);
    case 'mmeteor': return z([[s.fall || 0.9, s.dmg]]);
    case 'mgrav': {
      const n = s.ticks || 3;
      const d0 = s.delay || 0.45;
      const ev = s.every || 0.45;
      return z([...abRep(n, (k) => [d0 + k * ev, s.dmg]), [d0 + n * ev, (s.last && s.last.dmg) || s.dmg]]);
    }
    case 'siphon': return { a: 'c', reach: s.range || 300, every: s.every || 0.2, dur: 2.4, mul: s.dmg, leech: s.leech };
    case 'beam': return { a: 'c', reach: s.range || 300, every: s.every || 0.2, dur: 2.4, mul: s.dmg };
    case 'mcast': return { a: 'w', reach: s.range || 400, cast: s.castTime || 2, speed: s.speed || 430, r: (s.splash && s.splash.r) || 60, hits: [[0, s.dmg]] };
    case 'buff': return { a: 'b' };
    case 'heal': return { a: 'h' };
    default: return null;
  }
}
// Fertigkeiten eines Bots: die freigeschalteten seines Weges, Stufe wie die eigenen im Schnitt, mit Rang-Boni
function abotSkills(b, lvl) {
  const out = [];
  for (const base of classSkills(b.ch)) {
    if (b.level < (base.unlock || 1)) continue;
    const sk = typeof rankSk === 'function' ? rankSk(base, lvl) : base;
    const plan = abotPlan(sk, skillRank(lvl));
    if (!plan) continue;
    const pow = plan.a === 'c' ? (plan.dur / plan.every) * plan.mul : (plan.hits || []).reduce((a, h) => a + (h[1] || 0), 0);
    out.push({ base, sk, lvl, rank: skillRank(lvl), plan, pow, cd: abRand(0, 2.5) });
  }
  return out;
}
// Buff-Werte wie applyBuff (kampf.js): mit der Stufe und dem Hauptwert stärker, Lauftempo fest; nie unsichtbar
function abotBuffEffects(b, sk, lvl) {
  const scale = levelCurve(lvl, 0.03, 0.015, BUFF_JUMP) * ((b.st && b.st.buffPower) || 1);
  const fixed = (typeof SKILL_FIXED_EFFECTS !== 'undefined' && SKILL_FIXED_EFFECTS[sk.id]) || {};
  const out = {};
  for (const [k, v] of Object.entries(sk.effects || {})) {
    if (k === 'invisible') continue;
    out[k] = fixed[k] ? fixed[k](lvl) : typeof v === 'number' ? (k === 'speed' || k === 'chill' || k === 'chillDur' ? v : v * scale) : v;
  }
  return out;
}

// --- Bots bauen ---------------------------------------------------------------------------------------------------------
// ctx: { level, ref (Ausrüstung als Vorbild), fromCls, k (Rangfaktor), lvl (Fertigkeitsstufe), seele, used (Namen), pts };
// ohne path ein zufälliger Weg der Klasse
function abotMake(n, team, idx, ctx, cls, path) {
  if (!(path >= 0 && path < CLASSES[cls].paths.length)) path = Math.floor(Math.random() * CLASSES[cls].paths.length);
  const nm = abotName(ctx.used);
  const ch = {
    name: nm, classId: cls, path, level: ctx.level, look: abotLook(cls), attrs: abotAttrs(cls, ctx.level), buffs: [],
    equipment: abotGear(ctx.ref, ctx.fromCls, cls, path, ctx.level), skillLevels: [ctx.lvl, ctx.lvl, ctx.lvl, ctx.lvl, ctx.lvl],
    seele: ctx.seele ? JSON.parse(JSON.stringify(ctx.seele)) : undefined, dagger2: true, quiverGiven: true, riding: false
  };
  // was der Bot nicht tragen darf (Stufe, Weg), wird ein schlichtes Teil seiner Stufe
  for (const sl of ABOT_SLOTS) {
    const it = ch.equipment[sl];
    if (it && typeof canWear === 'function' && !canWear(it, ch)) ch.equipment[sl] = sl === 'schild' ? null : makeItem(sl, abotTierFor(ctx.level), 0, cls, sl === 'waffe' ? abotWeapon(cls, path) : null);
  }
  const pid = 'bot:' + n;
  const b = {
    pid, n, team, idx, cls, path, level: ctx.level, name: nm + ' (Bot)', rt: Math.max(0, Math.round(((ctx.pts || 0) + abRand(-120, 120)) / 5) * 5), k: ctx.k, ch,
    st: null, hp: 1, maxHp: 0, dead: false, deadAt: 0, respawnAt: 0, protectUntil: 0, buffs: [], win: [], toxin: null, bleed: null,
    sk: [], basic: null, wkind: '', melee: true, keep: 60, potions: ABOT.potions, potAt: 0, atkCd: abRand(0.3, 1.2), gcdUntil: 0,
    think: abRand(0, 0.4), tgt: null, switchAt: 0, retreatUntil: 0, retreatCd: 0, kiteUntil: 0, evadeUntil: 0, evadeDir: null, hitLog: [],
    lock: 0, cast: null, chan: null, want: null, stunUntil: 0, stunGuard: 0, lastHit: null, lastDef: '', nextHitMul: 1,
    stuck: 0, detour: null, vel: { x: 0, y: 0 }, last: null, faceUntil: 0, capOff: { a: Math.random() * Math.PI * 2, r: Math.random() }
  };
  b.fig = {
    remote: true, abot: true, peerId: pid, name: b.name, classId: cls, path, level: ctx.level, look: ch.look, equipment: ch.equipment,
    buffs: [], x: 0, y: 0, tx: 0, ty: 0, r: 11, facing: { x: team === 'A' ? 1 : -1, y: 0 }, moving: false, hp: 1, maxHp: 1, dead: false,
    swing: 0, swingDur: 0.3, swingKind: 'combo', combo: 0, spin: 0, riding: false, horseTier: 1, seq: 0, say: '', sayUntil: 0, guild: '', gs: 0, rk: b.rt
  };
  b.px = { id: 'pvp:' + pid, pvp: true, duelProxy: true, abot: true, pid, r: 11, def: 0, isStone: false, type: {}, stun: 0, dead: false, name: b.name, x: 0, y: 0, hp: 1, maxHp: 1, level: ctx.level, classId: cls };
  const sg = abotSegen(ch);
  if (sg) b.buffs.push(sg);
  abotStats(b);
  b.hp = b.maxHp;
  b.basic = basicAttack(ch);
  b.wkind = weaponKindOf(ch);
  b.melee = !b.basic.ranged;
  b.keep = b.melee ? b.basic.range * 0.8 : b.wkind === 'bow' ? 380 : Math.min(b.basic.range * 0.75, 240);
  b.sk = abotSkills(b, ctx.lvl);
  return b;
}
// Ausrüstung als Vorbild: die stärkste der letzten ABOT.peakKeep Sekunden (wer sie kurz vor dem Kampf ablegt, bekommt
// trotzdem gleich starke Bots); alle 3 s nachgezogen (abotPre)
function abotPeak(p) {
  const gs = typeof gearLevelOf === 'function' ? gearLevelOf(p.equipment) : 0;
  const P = abot.peak;
  if (!P || P.who !== p || gs >= P.gs || game.time - P.at > ABOT.peakKeep) abot.peak = { who: p, gs, eq: JSON.parse(JSON.stringify(p.equipment || {})), at: game.time };
  return abot.peak;
}
// Fertigkeitsstufe der Bots: Schnitt der eigenen fünf Fertigkeiten
function abotSkillLvl(p) {
  const l = Array.isArray(p.skillLevels) && p.skillLevels.length ? p.skillLevels : [1];
  return Math.max(1, Math.round(l.reduce((a, v) => a + (v | 0), 0) / l.length));
}

// --- Kampf beginnen ---------------------------------------------------------------------------------------------------
// freie Halle der Art: kein eigenes Spiel des Hosts darin und kein anderer Spieler
function abotFreeSlot(mode) {
  const busy = new Set();
  if (net.mode === 'host') for (const M of pvpHost.matches) busy.add(M.slot);
  for (const rp of net.players.values()) if (rp && !rp.gone) busy.add(pvpSlotAt(rp.x, rp.y));
  const free = [];
  for (let s = 0; s < PVP_SLOTS.length; s++) if (PVP_SLOTS[s].mode === mode && !busy.has(s)) free.push(s);
  return free.length ? abPick(free) : -1;
}
const abotPauseLeft = () => Math.max(0, abot.pauseUntil - game.time);
// Kampf gegen Bots starten (Knopf oder Auffüllen nach der Wartezeit); true = läuft
function abotStart(mode) {
  const p = game.player;
  const def = PVP_MODES[mode];
  if (!p || !def || !game.running || game.pvpMatch || p.dead || p.level < PVP.minLevel || WAECHTER) return false;
  if (abotPauseLeft() > 0) {
    ui.log(`Nächster Kampf gegen Bots in ${Math.ceil(abotPauseLeft())} s`, 'info');
    return false;
  }
  const slot = abotFreeSlot(mode);
  if (slot < 0) {
    ui.log('Alle Hallen dieser Art sind gerade belegt – versuch es gleich noch einmal.', 'warn');
    return false;
  }
  // aus der Warteschlange gehen (sonst holt der Host einen gleichzeitig in einen echten Kampf)
  if (netOnline() && ((pvpState.status && pvpState.status.in) || pvpState.pending)) {
    pvpToHost({ k: 'pvx' });
    if (pvpState.status) pvpState.status.in = '';
    pvpState.pending = null;
  }
  abot.q = null;
  const A = pvpSave(p);
  const tier = pvpTier(A.pts || 0);
  const peak = abotPeak(p);
  const ctx = {
    level: p.level, ref: peak.eq, fromCls: p.classId, k: ABOT.rankMul[Math.max(0, PVP_TIERS.indexOf(tier))] || 1, lvl: abotSkillLvl(p),
    seele: p.level >= MAX_LEVEL && p.seele ? p.seele : null, used: new Set([String(p.name || '').toLowerCase()]), pts: A.pts || 0
  };
  const n = def.size;
  const team = Math.random() < 0.5 ? 'A' : 'B';
  const foe = team === 'A' ? 'B' : 'A';
  // Klassen je Team möglichst verschieden
  const classes = (k) => {
    const pool = ABOT_CLASSES.slice().sort(() => Math.random() - 0.5);
    return abRep(k, (i) => pool[i % pool.length]);
  };
  const bots = [];
  let id = 1;
  const ca = classes(n - 1);
  for (let i = 0; i < n - 1; i++) bots.push(abotMake(id++, team, i + 1, ctx, ca[i]));
  const cb = classes(n);
  for (let i = 0; i < n; i++) bots.push(abotMake(id++, foe, i, ctx, cb[i]));
  const mid = -(abot.nextId++);
  const me = { pid: 'me', name: p.name, cls: p.classId, lvl: p.level, rt: A.pts || 0, team, kills: 0, deaths: 0, dead: false, deadAt: 0, left: false, bot: null };
  const players = [me, ...bots.map((b) => ({ pid: b.pid, name: b.name, cls: b.cls, lvl: b.level, rt: b.rt, team: b.team, kills: 0, deaths: 0, dead: false, deadAt: 0, left: false, bot: b }))];
  const now = game.time;
  const R = {
    id: mid, mode, slot, ranked: def.ranked, team, state: 'count', fightAt: now + PVP.countdown, fightStart: null,
    endAt: now + PVP.countdown + (def.ranked ? PVP.rankedTime : PVP.funTime), score: { A: 0, B: 0 }, tower: { pct: 0, owner: '' }, inside: { A: 0, B: 0 },
    players, units: [], sentAt: 0, dirty: true, dealt: 0, gs: peak.gs, valid: true, won: null,
    foeHp: bots.filter((b) => b.team === foe).reduce((a, b) => a + b.maxHp, 0) / n
  };
  const roster = players.map((P) => [P.pid, P.name, P.cls, P.lvl, P.rt, P.team, 0, 0, 0, 0]);
  abot.run = R;
  abot.bots = bots;
  abot.lastT = now;
  pvpOnMatch({ k: 'pvm', id: mid, m: mode, s: slot, me: 'me', tm: team, i: 0, cd: PVP.countdown, left: Math.round(R.endAt - now), r: roster, sc: [0, 0], tw: [0, ''] });
  const M = game.pvpMatch;
  if (!M || M.id !== mid) {
    abot.run = null;
    abot.bots = [];
    return false;
  }
  M.bot = true;
  if (M.ranked && A.open) {
    A.open.bot = 1;
    saveGame();
  }
  // Einheiten (eigene Figur und Bots) für die KI, Stellvertreter für das Zielen und die Rückmeldung (pvpFeedback)
  R.units.push({ pid: 'me', team, e: p, b: null, alive: true, vis: true, r: 11 });
  for (const b of bots) {
    const at = pvpSpawnSpot(slot, b.team, b.idx);
    b.fig.x = b.fig.tx = at.x;
    b.fig.y = b.fig.ty = at.y;
    b.last = { x: at.x, y: at.y };
    b.gcdUntil = R.fightAt + abRand(0.3, 1.2);
    pvpState.proxies.set(b.pid, b.px);
    R.units.push({ pid: b.pid, team: b.team, e: b.fig, b, alive: true, vis: true, r: 11 });
    vfxPillar(b.fig, PVP.gate, 1);
  }
  abot.pLast = { x: p.x, y: p.y };
  abotSyncFigs();
  ui.log(M.ranked ? `Kampf gegen Bots: Sieg +${abHalf(PVP.win)}, Niederlage −${abHalf(PVP.loss)} Rangpunkte (halbe Punkte).` : 'Turmschlacht mit Bots.', 'level');
  pvpHud();
  return true;
}
// Bot-Kampf ohne Wertung beenden (ein echter Kampf kam während des Countdowns)
function abotCancel(text) {
  const M = game.pvpMatch;
  if (!M || !M.bot) return;
  pvpSave().open = null;
  game.pvpMatch = null;
  pvpState.proxies.clear();
  pvpState.foes.length = 0;
  if (game.target && game.target.pvp) setTarget(null);
  abotCleanup();
  abot.pauseUntil = 0;
  if (text) ui.log(text, 'info');
}
// aufräumen, sobald das Spiel vorbei ist (zurück in der Stadt, verlassen, anderer Charakter)
function abotCleanup() {
  if (!abot.run) return;
  for (const b of abot.bots) {
    if (b.chan) abotStopChan(b);
    pvpState.proxies.delete(b.pid);
  }
  abot.bots = [];
  abot.figs3.length = 0;
  if (typeof V3 !== 'undefined' && V3.extra === abot.figs3) V3.extra = null;
  abot.run = null;
  abot.pauseUntil = game.time + ABOT.pause;
  if (typeof pvpRefreshNpc === 'function') pvpRefreshNpc();
}

// --- Führung des Spiels (wie pvpHostTickMatch beim Host) ------------------------------------------------------------------
const abotRoster = (R) => R.players.map((P) => [P.pid, P.name, P.cls, P.lvl, P.rt, P.team, P.kills, P.deaths, P.dead ? 1 : 0, P.left ? 1 : 0]);
function abotSend(R) {
  const now = game.time;
  if (!R.dirty && now - R.sentAt < 0.5) return;
  R.sentAt = now;
  R.dirty = false;
  pvpOnUpdate({
    k: 'pvu', id: R.id, st: R.state === 'count' ? 'count' : 'fight', left: Math.round(R.endAt - now), r: abotRoster(R), sc: [R.score.A, R.score.B],
    tw: [Math.round(R.tower.pct * 10) / 10, R.tower.owner, R.inside.A, R.inside.B]
  });
}
// Leben einer Einheit (0–1)
function abotHpFrac(u) {
  if (u.b) return u.b.hp / Math.max(1, u.b.maxHp);
  const p = game.player;
  return p.hp / Math.max(1, (game.stats && game.stats.maxHp) || p.hp || 1);
}
// Figuren für die 3D-Szene und Stellvertreter für das Zielen nachziehen
function abotSyncFigs() {
  abot.figs3.length = 0;
  for (const b of abot.bots) {
    const f = b.fig;
    f.hp = Math.max(0, Math.round(b.hp));
    f.maxHp = b.maxHp;
    f.dead = b.dead;
    Object.assign(b.px, { x: f.x, y: f.y, hp: f.hp, maxHp: b.maxHp, level: b.level, dead: b.dead || abot.run.state !== 'fight' });
    if (!b.dead) abot.figs3.push(f);
  }
  if (typeof V3 !== 'undefined') V3.extra = abot.figs3.length ? abot.figs3 : null;
}
function abotRun(R, dt) {
  const now = game.time;
  const p = game.player;
  if (R.state === 'count' && now >= R.fightAt) {
    R.state = 'fight';
    R.fightStart = now;
    R.dirty = true;
  }
  // Tempo der Figuren für das Vorhalten beim Zielen (geglättet)
  if (dt > 0) {
    const k = Math.min(1, dt * 6);
    if (abot.pLast) {
      abot.pv.x += ((p.x - abot.pLast.x) / dt - abot.pv.x) * k;
      abot.pv.y += ((p.y - abot.pLast.y) / dt - abot.pv.y) * k;
    }
    abot.pLast = { x: p.x, y: p.y };
    for (const b of abot.bots) {
      if (b.last) {
        b.vel.x += ((b.fig.x - b.last.x) / dt - b.vel.x) * k;
        b.vel.y += ((b.fig.y - b.last.y) / dt - b.vel.y) * k;
      }
      b.last = { x: b.fig.x, y: b.fig.y };
    }
  }
  // eigene Figur: wieder auf den Beinen (Turmschlacht), wer ist sichtbar und in der Halle
  const me = R.players[0];
  if (!R.ranked && me.dead && !me.left && !p.dead && now - me.deadAt > 1) {
    me.dead = false;
    R.dirty = true;
  }
  for (const u of R.units) {
    if (u.b) {
      u.alive = !u.b.dead;
      u.vis = true;
    } else {
      u.e = p;
      u.alive = !p.dead && !me.left && !me.dead && pvpSlotAt(p.x, p.y) === R.slot;
      u.vis = !(game.stats && game.stats.invisible);
    }
  }
  for (const b of abot.bots) abotBotTick(b, R, dt);
  if (R.mode === 'f4' && R.state === 'fight') abotTower(R, dt);
  abotSyncFigs();
  if (R.state === 'fight') abotCheckEnd(R);
  if (R.state !== 'end') {
    abotAdapt(R);
    abotSend(R);
  }
}
// Turm der Turmschlacht: lädt nur, wenn genau ein Team (lebend) im Kreis steht (pvpTowerStep wie beim Host)
function abotTower(R, dt) {
  const c = pvpTowerAt(R.slot);
  const rr = PVP.capR * TILE;
  const n = { A: 0, B: 0 };
  for (const u of R.units) if (u.alive && hyp(u.e.x - c.x, u.e.y - c.y) <= rr) n[u.team]++;
  R.inside = n;
  const was = R.tower.owner;
  pvpTowerStep(R.tower, n.A, n.B, dt);
  if (R.tower.owner !== was) R.dirty = true;
}
function abotCheckEnd(R) {
  const now = game.time;
  const inTeam = (t) => R.players.filter((P) => P.team === t && !P.left);
  if (R.ranked) {
    const aliveA = inTeam('A').filter((P) => !P.dead).length;
    const aliveB = inTeam('B').filter((P) => !P.dead).length;
    if (!aliveA || !aliveB) {
      abotEnd(R, aliveA ? 'A' : aliveB ? 'B' : '', aliveA || aliveB ? 'sieg' : 'gleich');
      return;
    }
    if (now >= R.endAt) {
      // Zeit um: mehr Kämpfer übrig, dann mehr Leben (Anteil)
      const life = (t) => R.units.filter((u) => u.team === t && u.alive).reduce((a, u) => a + abotHpFrac(u), 0);
      const la = life('A');
      const lb = life('B');
      abotEnd(R, aliveA !== aliveB ? (aliveA > aliveB ? 'A' : 'B') : Math.abs(la - lb) > 0.02 ? (la > lb ? 'A' : 'B') : '', 'zeit');
    }
    return;
  }
  if (R.tower.pct >= 100) { abotEnd(R, R.tower.owner, 'turm'); return; }
  if (R.score.A >= PVP.funKills || R.score.B >= PVP.funKills) { abotEnd(R, R.score.A >= PVP.funKills ? 'A' : 'B', 'kills'); return; }
  if (now >= R.endAt) abotEnd(R, R.score.A !== R.score.B ? (R.score.A > R.score.B ? 'A' : 'B') : R.tower.pct > 0 ? R.tower.owner : '', 'zeit');
}
// Sieg nur nach einem echten Kampf: Mindestdauer und eigener Schaden
function abotValid(R) {
  const fought = R.fightStart != null ? game.time - R.fightStart : 0;
  return fought >= ABOT.minFight && R.dealt >= ABOT.minDealt * R.foeHp;
}
function abotEnd(R, w, why) {
  if (R.state === 'end') return;
  R.state = 'end';
  for (const b of abot.bots) {
    if (b.chan) abotStopChan(b);
    if (b.cast) abotFx(b, b.cast.e, b.cast.u ? b.cast.u.e : null, { cx: 1 });
    b.cast = null;
    b.want = null;
  }
  const won = w ? w === R.team : null;
  R.won = won;
  R.valid = !R.ranked || won !== true || abotValid(R);
  const A = pvpSave();
  const d = { k: 'pve', id: R.id, m: R.mode, w: w || '', why, r: abotRoster(R), sc: [R.score.A, R.score.B], tw: [Math.round(R.tower.pct), R.tower.owner] };
  // halbe Punkte gegen Bots (ohne echten Kampf bringt ein Sieg nichts)
  abotWithPts(R.valid ? abHalf(PVP.win) : 0, abHalf(PVP.loss), () => pvpOnEnd(d));
  if (R.ranked && won === true) {
    if (R.valid) A.bw = (A.bw | 0) + 1;
    else A.w = Math.max(0, (A.w | 0) - 1);
  }
  if (R.ranked && won === false) A.bl = (A.bl | 0) + 1;
  saveGame();
  abotSyncFigs();
}
// Ausrüstung im Kampf stärker geworden (Teile erst nach dem Start angelegt): Bots ziehen nach
function abotAdapt(R) {
  const p = game.player;
  if (game.time - (R.adaptAt || 0) < 2) return;
  R.adaptAt = game.time;
  const gs = typeof gearLevelOf === 'function' ? gearLevelOf(p.equipment) : 0;
  if (gs <= R.gs + ABOT.adaptGs) return;
  const peak = abotPeak(p);
  R.gs = gs;
  for (const b of abot.bots) {
    b.ch.equipment = abotGear(peak.eq, p.classId, b.cls, b.path, b.level);
    b.fig.equipment = b.ch.equipment;
    abotStats(b);
    b.basic = basicAttack(b.ch);
    b.wkind = weaponKindOf(b.ch);
  }
  ui.log('Die Bots passen sich deiner Ausrüstung an.', 'info');
}

// --- Ein Bot je Bild --------------------------------------------------------------------------------------------------
function abotBotTick(b, R, dt) {
  const now = game.time;
  const f = b.fig;
  if (f.swing > 0) f.swing = Math.max(0, f.swing - dt);
  if (f.spin > 0) f.spin = Math.max(0, f.spin - dt);
  f.moving = false;
  if (b.dead) {
    if (!R.ranked && b.respawnAt && now >= b.respawnAt && R.state === 'fight') abotRespawn(b, R);
    return;
  }
  // Sprungschlag: auf der Bahn gleiten wie ein Mitspieler (netUpdate)
  const g = f.glide;
  if (g) {
    const k = (now - g.start) / g.dur;
    if (k >= 1) {
      f.x = g.x1;
      f.y = g.y1;
      f.glide = null;
    } else if (k >= 0) {
      f.x = g.x0 + (g.x1 - g.x0) * k;
      f.y = g.y0 + (g.y1 - g.y0) * k;
    }
  }
  if (b.buffs.some((x) => x.until <= now)) abotStats(b);
  abotDotTick(b, R, dt);
  if (b.dead) return;
  // Regeneration im Kampf wie bei der Figur (REGEN_RULES), im PvP zu 60 %
  if (typeof REGEN_RULES !== 'undefined' && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * Math.min(REGEN_RULES.combatMax, REGEN_RULES.combat + (b.st.regen || 0) * REGEN_RULES.combatItems) * dt * PVP_DMG.heal);
  for (const e of b.sk) if (e.cd > 0) e.cd -= dt;
  if (b.atkCd > 0) b.atkCd -= dt;
  if (R.state === 'count') {
    // im Countdown: zum Gegner schauen, Buffs schon wirken (wie Spieler es tun)
    if (now > R.fightAt - PVP.countdown + 1.5 && now >= b.gcdUntil - 1) {
      const e = b.sk.find((x) => x.plan.a === 'b' && x.cd <= 0 && !b.buffs.some((y) => y.id === x.base.id));
      if (e && Math.random() < dt * 1.5) abotCast(b, e, null, R);
    }
    return;
  }
  if (R.state !== 'fight' || g || b.stunUntil > now) return;
  if (b.chan) { abotChanTick(b, R); return; }
  if (b.cast) { abotCastTick(b, R); return; }
  if (b.lock > now) return;
  b.think -= dt;
  if (b.think <= 0) {
    b.think = abRand(ABOT.think[0], ABOT.think[1]);
    abotThink(b, R);
  }
  abotAct(b, R, dt);
}
function abotThink(b, R) {
  const now = game.time;
  const f = b.fig;
  const foes = R.units.filter((u) => u.team !== b.team && u.alive && u.vis);
  // Ziel halten oder wechseln: nah und schwach zuerst, etwas Zufall, das alte Ziel bevorzugt
  let t = b.tgt && foes.includes(b.tgt) ? b.tgt : null;
  if (!t || now >= b.switchAt) {
    let best = null;
    let bs = Infinity;
    for (const u of foes) {
      const d = hyp(u.e.x - f.x, u.e.y - f.y);
      const sc = d / 260 + abotHpFrac(u) * 0.9 + Math.random() * 0.6 - (u === t ? 0.5 : 0);
      if (sc < bs) { bs = sc; best = u; }
    }
    t = best;
    b.switchAt = now + abRand(ABOT.switchEvery[0], ABOT.switchEvery[1]);
  }
  b.tgt = t;
  const fr = b.hp / Math.max(1, b.maxHp);
  if (fr < ABOT.potAt && b.potions > 0 && now >= b.potAt) abotPotion(b);
  // Zurückweichen: einmal je Tiefpunkt entschieden (erst wer sich wieder über die Hälfte erholt, kann es erneut tun)
  if (fr > 0.5) b.lowSeen = false;
  else if (fr < ABOT.retreatAt && !b.lowSeen && t) {
    b.lowSeen = true;
    if (now >= b.retreatCd && Math.random() < ABOT.retreatChance) {
      b.retreatUntil = now + abRand(ABOT.retreatFor[0], ABOT.retreatFor[1]);
      b.retreatCd = now + 12;
    }
  }
  // Fernkämpfer: zu nah dran – kurz Abstand gewinnen
  if (!b.melee && t && hyp(t.e.x - f.x, t.e.y - f.y) < b.keep * 0.5 && Math.random() < 0.45) b.kiteUntil = now + abRand(0.5, 0.9);
  b.want = abotPickSkill(b, R, t);
}
// schwächster Verbündeter (auch die eigene Figur) in Reichweite der Heilung
function abotLowAlly(b, R) {
  let best = null;
  for (const u of R.units) {
    if (u.team !== b.team || !u.alive || hyp(u.e.x - b.fig.x, u.e.y - b.fig.y) > 420) continue;
    const fr = abotHpFrac(u);
    if (!best || fr < best.fr) best = { u, fr };
  }
  return best;
}
// nächste Fertigkeit: Buffs vor dem Kampf, Heilung bei wenig Leben, Sprünge auf Abstand, Fluchtschritt bei Nähe,
// sonst die stärkste bereite (mit etwas Zufall)
function abotPickSkill(b, R, t) {
  const now = game.time;
  const f = b.fig;
  const d = t ? hyp(t.e.x - f.x, t.e.y - f.y) : Infinity;
  let best = null;
  let bs = 0;
  for (const e of b.sk) {
    if (e.cd > 0) continue;
    const P = e.plan;
    let sc = 0;
    if (P.a === 'b') sc = b.buffs.some((x) => x.id === e.base.id && x.until > now) || d > 560 ? 0 : 95;
    else if (P.a === 'h') {
      const low = abotLowAlly(b, R);
      sc = low && low.fr < 0.6 ? 92 : 0;
    } else if (!t) sc = 0;
    else if (P.a === 'f') sc = d < 110 && (!b.melee || b.hp / b.maxHp < 0.4) ? 85 : 0;
    else if (P.a === 'g') sc = d > 130 && d <= P.reach ? 75 : d <= 90 ? 25 + e.pow * 3 : 0;
    // Schaden je Sekunde, die der Bot dafür stehen bleibt (Feuerball wirkt 3 s, Strahlen halten 2,4 s)
    else sc = 30 + (P.a === 'w' ? e.pow / (1 + P.cast) : P.a === 'c' ? e.pow / P.dur : e.pow) * 6 + Math.random() * 12;
    if (sc > bs) { bs = sc; best = e; }
  }
  return best;
}
// in Reichweite für diese Fertigkeit?
function abotInReach(b, e, u) {
  const d = hyp(u.e.x - b.fig.x, u.e.y - b.fig.y);
  const P = e.plan;
  if (P.a === 'm') return d <= P.reach + u.r;
  if (P.a === 's') return d <= P.reach + u.r + 10;
  if (P.a === 'f') return d <= P.reach;
  return d <= P.reach;
}
function abotAct(b, R, dt) {
  const now = game.time;
  const f = b.fig;
  const t = b.tgt;
  if (!t || !t.alive || !t.vis) {
    b.tgt = null;
    abotIdle(b, R, dt);
    return;
  }
  const d = hyp(t.e.x - f.x, t.e.y - f.y);
  const e = b.want && b.want.cd <= 0 ? b.want : null;
  const self = e && (e.plan.a === 'b' || e.plan.a === 'h');
  // Turmschlacht: ferne Gegner nicht verfolgen, sondern im Kreis stehen
  const capture = R.mode === 'f4' && d > ABOT.fight && !(R.tower.owner === b.team && R.tower.pct >= 99);
  // Bewegung
  if (b.retreatUntil > now) abotAway(b, R, t.e, dt, 1);
  else if (b.evadeUntil > now && b.evadeDir) abotGo(b, R, f.x + b.evadeDir.x * 60, f.y + b.evadeDir.y * 60, dt, 1);
  else if (b.kiteUntil > now) abotAway(b, R, t.e, dt, 0.9);
  else if (capture) abotIdle(b, R, dt);
  else {
    let want = b.melee ? b.basic.range + t.r - 6 : b.keep;
    if (e && !self) {
      const ws = e.plan.a === 'm' || e.plan.a === 's' ? e.plan.reach * 0.85 + t.r * 0.5 : Math.min(e.plan.reach * 0.85, Math.max(want, 90));
      // Nahkämpfer bleiben in Reichweite ihres Grundangriffs (sonst schlagen sie nicht, während sie auf die Fertigkeit warten)
      want = b.melee ? Math.min(want, ws) : ws;
    }
    if (d > want) abotGo(b, R, t.e.x, t.e.y, dt, 1);
  }
  // Handeln: Fertigkeit, wenn bereit und in Reichweite, sonst Grundangriff
  if (e && now >= b.gcdUntil && (self || abotInReach(b, e, t))) {
    abotCast(b, e, t, R);
    return;
  }
  if (b.atkCd <= 0 && d - t.r <= b.basic.range + (b.melee ? 6 : 0)) abotBasic(b, t, R);
}
// ohne Ziel: in der Turmschlacht in den Kreis um den Turm, sonst langsam zur Mitte der Halle
function abotIdle(b, R, dt) {
  const c = pvpTowerAt(R.slot);
  if (R.mode === 'f4') {
    const rr = PVP.capR * TILE * 0.65 * b.capOff.r;
    const gx = c.x + Math.cos(b.capOff.a) * rr;
    const gy = c.y + Math.sin(b.capOff.a) * rr;
    if (hyp(gx - b.fig.x, gy - b.fig.y) > 12) abotGo(b, R, gx, gy, dt, 1);
    return;
  }
  if (hyp(c.x - b.fig.x, c.y - b.fig.y) > 3 * TILE) abotGo(b, R, c.x, c.y, dt, 0.6);
}
// vom Gegner weg (Zurückweichen, Abstand halten)
function abotAway(b, R, from, dt, mul) {
  const f = b.fig;
  const d = Math.max(1, hyp(f.x - from.x, f.y - from.y));
  abotGo(b, R, f.x + ((f.x - from.x) / d) * 80, f.y + ((f.y - from.y) / d) * 80, dt, mul);
}
// Wegpunkt in der Turmschlacht: aus der Basis (und hinein) nur durch das Tor in der Mauer
function abotWaypoint(R, x, y, gx, gy) {
  if (R.mode !== 'f4') return { x: gx, y: gy };
  const S = PVP_SLOTS[R.slot];
  const rel = (px, py) => ({ dx: px / TILE - S.cx, dy: py / TILE - S.cy });
  const inBase = (q) => Math.abs(q.dx) > PVP_BX + 0.2 && Math.abs(q.dy) < 9;
  const a = rel(x, y);
  const g = rel(gx, gy);
  const at = (dx, dy) => ({ x: (S.cx + dx) * TILE, y: (S.cy + dy) * TILE });
  if (inBase(a) && !(inBase(g) && Math.sign(g.dx) === Math.sign(a.dx))) {
    const sx = Math.sign(a.dx);
    return Math.abs(a.dy) > 1.3 && Math.abs(a.dx) > PVP_BX + 0.8 ? at(sx * (PVP_BX + 1.6), 0) : at(sx * (PVP_BX - 2.5), 0);
  }
  if (inBase(g) && !inBase(a)) {
    const sx = Math.sign(g.dx);
    return Math.abs(a.dy) > 1.3 || Math.abs(a.dx) < PVP_BX - 3.5 ? at(sx * (PVP_BX - 2.5), 0) : at(sx * (PVP_BX + 1.6), 0);
  }
  return { x: gx, y: gy };
}
// Laufen mit Hindernissen: gleitet an Wänden entlang (moveEntity), bleibt es hängen, ein kurzer Umweg zur Seite
function abotGo(b, R, gx, gy, dt, mul) {
  const f = b.fig;
  const now = game.time;
  const w = abotWaypoint(R, f.x, f.y, gx, gy);
  const dx = w.x - f.x;
  const dy = w.y - f.y;
  const d = hyp(dx, dy);
  if (d < 3) return false;
  let ux = dx / d;
  let uy = dy / d;
  if (b.detour && b.detour.until > now) {
    const c = Math.cos(b.detour.a);
    const s = Math.sin(b.detour.a);
    const rx = ux * c - uy * s;
    uy = ux * s + uy * c;
    ux = rx;
  }
  const step = Math.min(d, (b.st.speed || 130) * (mul || 1) * dt);
  if (!(step > 0)) return false;
  const x0 = f.x;
  const y0 = f.y;
  moveEntity(f, ux * step, uy * step, false);
  const moved = hyp(f.x - x0, f.y - y0);
  if (moved < step * 0.3) {
    b.stuck += dt;
    if (b.stuck > 0.25) {
      b.stuck = 0;
      b.detour = { a: (Math.random() < 0.5 ? -1 : 1) * abRand(0.9, 1.6), until: now + abRand(0.5, 0.9) };
    }
  } else b.stuck = Math.max(0, b.stuck - dt);
  f.moving = moved > 0.2;
  if (f.moving && !(b.faceUntil > now)) f.facing = { x: (f.x - x0) / moved, y: (f.y - y0) / moved };
  return f.moving;
}
function abotFace(b, at, dur) {
  const f = b.fig;
  const dx = at.x - f.x;
  const dy = at.y - f.y;
  const l = hyp(dx, dy);
  if (l > 0.5) f.facing = { x: dx / l, y: dy / l };
  b.faceUntil = game.time + (dur || 0.4);
}
// läuft der Kampf noch und steht der Bot? (für später fällige Treffer)
const abotLive = (b, id) => !!abot.run && abot.run.id === id && abot.run.state === 'fight' && !b.dead;

// --- Grundangriff --------------------------------------------------------------------------------------------------
// wie tryBasicAttack/basicTick der eigenen Figur: Nahkampf als Kombo, Fernkampf als Schuss, Treffer im Bild der Animation
function abotBasic(b, t, R) {
  const f = b.fig;
  const ba = b.basic;
  const cd = ba.cooldown / Math.max(0.4, b.st.atkSpeed || 1);
  b.atkCd = cd * abRand(1, 1.12);
  const [base, imp] = BASIC_TIMING[b.wkind] || [0.42, 0.45];
  const dur = Math.max(0.12, Math.min(base, cd * 0.95));
  abotFace(b, t.e, dur + 0.1);
  const id = R.id;
  const trim = CLASSES[b.cls].trim;
  if (ba.ranged) {
    startSwing(f, 'cast', dur);
    later(dur * imp, () => {
      if (!abotLive(b, id) || !t.alive) return;
      const dd = hyp(t.e.x - f.x, t.e.y - f.y);
      if (dd > ba.range + 120) return;
      const spd = ba.style === 'arrow' ? BOW_ARROW.speed : CASTER_SHOT.speed;
      spawnProjectile({ owner: 'remote', x: f.x, y: f.y, target: t.e, speed: spd, range: dd, mul: 0, color: ba.color || '#f0e0b0', radius: 5, style: ba.style, el: ba.el });
      if (typeof snd !== 'undefined') snd.shot(f, ba);
      later(dd / spd, () => {
        if (abotLive(b, id) && t.alive && hyp(t.e.x - f.x, t.e.y - f.y) <= ba.range + 160) abotStrike(b, t, ba.mul || 1, { basic: true, color: ba.color }, R);
      });
    });
    return;
  }
  const dag = b.wkind === 'dagger';
  f.combo = ((f.combo || 0) + 1) % (dag ? 4 : 3);
  const cm = (dag ? [1, 1, 1.1, 1.3][f.combo] : f.combo === 2 ? 1.25 : 1) * (ba.mul || 1);
  startSwing(f, 'combo', dur);
  later(dur * imp, () => {
    if (!abotLive(b, id)) return;
    vfxSwing(f, trim);
    const ok = t.alive && hyp(t.e.x - f.x, t.e.y - f.y) - t.r <= ba.range + 30;
    if (ok) abotStrike(b, t, cm, { basic: true, color: trim }, R);
    if (typeof snd !== 'undefined') snd.swing(f, ok);
  });
}

// --- Fertigkeit wirken ------------------------------------------------------------------------------------------------
// Bild wie bei einem Mitspieler (remoteSkillFx, interaktion.js) mit den Angaben, die die jeweilige Darstellung braucht
function abotFx(b, e, at, extra) {
  const f = b.fig;
  const d = {
    t: 'fx', s: e.base.id, x: Math.round(f.x), y: Math.round(f.y), fx: +f.facing.x.toFixed(2), fy: +f.facing.y.toFixed(2),
    tx: Math.round(at ? at.x : f.x + f.facing.x * 120), ty: Math.round(at ? at.y : f.y + f.facing.y * 120), ...(extra || {})
  };
  if (e.rank >= 0) d.rk = e.rank;
  try {
    remoteSkillFx(f, d);
  } catch (err) {
    if (!abot.fxErr) {
      abot.fxErr = true;
      console.warn('Bot-Fertigkeit (Bild):', e.base.id, err);
    }
  }
}
// Zielpunkt mit Vorhalt: wohin das Ziel in k Sekunden läuft (nur zum Teil, Bots raten nicht perfekt)
function abotLead(u, k) {
  const v = u.b ? u.b.vel : abot.pv;
  return { x: u.e.x + v.x * k * 0.6, y: u.e.y + v.y * k * 0.6 };
}
// alle Gegner des Bots im Kreis (x, y, r)
function abotFoesIn(b, R, x, y, r) {
  return R.units.filter((u) => u.team !== b.team && u.alive && hyp(u.e.x - x, u.e.y - y) <= r + u.r);
}
// freier Platz auf dem Weg von (x, y) in Richtung dir, höchstens want weit (Sprünge und Schritte, hopReach in kampf.js)
function abotReach(x, y, dir, want) {
  const l = typeof hopReach === 'function' ? hopReach(x, y, dir, want, 8) : 0;
  return { x: x + dir.x * l, y: y + dir.y * l, l };
}
function abotCast(b, e, t, R) {
  const now = game.time;
  const f = b.fig;
  const sk = e.sk;
  const P = e.plan;
  const id = R.id;
  e.cd = Math.max(1, sk.cooldown || 6) * abRand(ABOT.cdSlack[0], ABOT.cdSlack[1]);
  b.gcdUntil = now + Math.max((typeof gcdTime === 'function' && gcdTime(b.ch)) || 0, abRand(ABOT.gcd[0], ABOT.gcd[1]));
  b.want = null;
  // Kraft wie in useSkill: Stufe × Fertigkeitsschaden; aus der Tarnung (Buff) die nächste Attacke × nextHitMul
  let pw = dmgScale(e.lvl) * (b.st.skillDmg || 1);
  if (P.a !== 'b' && P.a !== 'h' && b.nextHitMul > 1) {
    pw *= b.nextHitMul;
    b.nextHitMul = 1;
  }
  const color = skillColor(sk, CLASSES[b.cls].trim);
  const o = { skill: e.base.id, critBonus: sk.critBonus, duelMul: sk.duelMul, color, heavy: false };
  // Animation wie bei der eigenen Figur (useSkill)
  if (P.a === 'b' || P.a === 'h') {
    if (sk.anim) startSwing(f, sk.anim, sk.animDur || 0.7);
    else {
      startSwing(f, 'pose', 0.7);
      vfxPowerUp(f, color);
    }
  } else if (P.a !== 'c' && P.a !== 'w') startSwing(f, sk.anim || 'skill', sk.anim ? sk.animDur || 0.5 : 0.34);
  if (t) abotFace(b, t.e, Math.max(0.45, (sk.animDur || 0.34) + 0.12));
  const tp = t ? { x: t.e.x, y: t.e.y } : null;
  const fdir = () => {
    const l = tp ? Math.max(1, hyp(tp.x - f.x, tp.y - f.y)) : 1;
    return tp ? { x: (tp.x - f.x) / l, y: (tp.y - f.y) / l } : { ...f.facing };
  };
  switch (P.a) {
    case 'b': {
      b.buffs = b.buffs.filter((x) => x.id !== e.base.id);
      const dur = skillDuration(sk, e.lvl);
      b.buffs.push({ id: e.base.id, lvl: e.lvl, until: now + dur, duration: dur, effects: abotBuffEffects(b, sk, e.lvl) });
      if (sk.nextHitMul) b.nextHitMul = sk.nextHitMul;
      abotStats(b);
      abotFx(b, e, f, {});
      break;
    }
    case 'h': {
      const low = abotLowAlly(b, R);
      const u = low ? low.u : null;
      if (u) {
        const amount = Math.round((u.b ? u.b.maxHp : game.stats.maxHp) * (sk.amount || 0.3) * levelCurve(e.lvl, 0.03, 0.015, BUFF_JUMP) * (b.st.healPower || 1) * PVP_DMG.heal);
        abotHealUnit(u, amount);
        vfxPillar(u.e, '#9be59b', 1);
      }
      if (sk.effects) {
        b.buffs = b.buffs.filter((x) => x.id !== e.base.id);
        const dur = skillDuration(sk, e.lvl);
        b.buffs.push({ id: e.base.id, lvl: e.lvl, until: now + dur, duration: dur, effects: abotBuffEffects(b, sk, e.lvl) });
        abotStats(b);
      }
      abotFx(b, e, u ? u.e : f, {});
      break;
    }
    case 'm': {
      abotFx(b, e, tp, {});
      for (const [at, mul] of P.hits) {
        later(at, () => {
          if (!abotLive(b, id)) return;
          for (const u of abotFoesIn(b, R, f.x, f.y, P.reach + 10)) abotStrike(b, u, mul * pw, { ...o, bleedStack: P.bleed }, R);
        });
      }
      b.lock = now + Math.min(0.5, (sk.lock || 0.3));
      break;
    }
    case 's': {
      abotFx(b, e, tp, {});
      for (const [at, mul] of P.hits) {
        later(at, () => {
          if (abotLive(b, id) && t.alive && hyp(t.e.x - f.x, t.e.y - f.y) <= P.reach + t.r + 30) abotStrike(b, t, mul * pw, o, R);
        });
      }
      b.lock = now + 0.3;
      break;
    }
    case 'g': abotGap(b, e, t, R, pw, o); break;
    case 'f': abotStep(b, e, t, R, pw, o); break;
    case 'p': {
      const travel = P.speed ? hyp(tp.x - f.x, tp.y - f.y) / P.speed : 0;
      const aim = P.speed ? abotLead(t, travel + (P.hits[0] ? P.hits[0][0] : 0)) : tp;
      const ex = {};
      if (sk.type === 'bshot') { ex.n = P.hits.length; ex.ev = sk.every; }
      if (sk.type === 'mwave') { const dd = fdir(); ex.dx = Math.round(dd.x * 1000); ex.dy = Math.round(dd.y * 1000); }
      // Blutlanzen: je Lanze ein Punkt am Ziel (lanceFx zeigt so viele Lanzen, wie Punkte kommen)
      if (sk.type === 'bloodlances') ex.ts = P.hits.map((h, k) => [Math.round(aim.x + (k % 2 ? 7 : -7)), Math.round(aim.y + (k % 3) * 4 - 4)]);
      abotFx(b, e, aim, ex);
      for (const [at, mul] of P.hits) {
        const tt = P.speed ? hyp(aim.x - f.x, aim.y - f.y) / P.speed : 0;
        later(at + tt, () => {
          if (!abotLive(b, id) || !t.alive) return;
          // gezielte Geschosse treffen, wer am gezielten Punkt steht; sofortige Zauber das Ziel in Reichweite
          const ok = P.speed ? hyp(t.e.x - aim.x, t.e.y - aim.y) <= ABOT.shotR + t.r : hyp(t.e.x - f.x, t.e.y - f.y) <= P.reach + 60;
          if (!ok) return;
          const dealt = abotStrike(b, t, mul * pw, o, R);
          if (P.heal && dealt > 0) abotHeal(b, dealt * P.heal * PVP_DMG.heal);
          if (P.leech && dealt > 0) abotHeal(b, dealt * P.leech * PVP_DMG.heal);
        });
      }
      b.lock = now + 0.25;
      break;
    }
    case 'z': {
      const first = P.hits.length ? P.hits[0][0] : 0.3;
      let c = abotLead(t, Math.min(first, 0.6) * 0.5);
      const dc = hyp(c.x - f.x, c.y - f.y);
      if (dc > P.reach) c = { x: f.x + ((c.x - f.x) / dc) * P.reach, y: f.y + ((c.y - f.y) / dc) * P.reach };
      const ex = { sd: 1 };
      if (sk.type === 'bregen' || sk.type === 'msnow') ex.n = sk.ticks;
      if (sk.type === 'mtornado') ex.n = 3;
      if (sk.type === 'mprison') ex.ho = sk.hold;
      abotFx(b, e, c, ex);
      // Warnkreis am Boden, solange die Fläche entsteht (nur bei spürbarer Verzögerung)
      if (first >= 0.3) addEffect({ type: 'warn', x: c.x, y: c.y + 9, r: P.r, dur: first, color: PVP_TEAM[b.team].bar });
      for (const [at, mul] of P.hits) {
        if (!(mul > 0)) continue;
        later(at, () => {
          if (!abotLive(b, id)) return;
          for (const u of abotFoesIn(b, R, c.x, c.y, P.r)) abotStrike(b, u, mul * pw, o, R);
        });
      }
      b.lock = now + 0.3;
      break;
    }
    case 'c': {
      b.chan = { e, u: t, until: now + P.dur, next: now + 0.15, pw, o };
      abotFx(b, e, tp, { bm: 1 });
      break;
    }
    case 'w': {
      b.cast = { e, u: t, at: now + P.cast, pw, o };
      startSwing(f, sk.anim || 'zauber', P.cast);
      abotFx(b, e, tp, { d: P.cast });
      break;
    }
  }
}
// Sprung, Blinzeln, Schattenkette und Blitzschritt: zum Ziel, dort die Treffer
function abotGap(b, e, t, R, pw, o) {
  const f = b.fig;
  const P = e.plan;
  const sk = e.sk;
  const id = R.id;
  const now = game.time;
  const d0 = Math.max(1, hyp(t.e.x - f.x, t.e.y - f.y));
  const dir = { x: (t.e.x - f.x) / d0, y: (t.e.y - f.y) / d0 };
  const hitAt = (pt, at, mul) => later(at, () => {
    if (!abotLive(b, id)) return;
    for (const u of abotFoesIn(b, R, pt ? pt.x : f.x, pt ? pt.y : f.y, P.r)) abotStrike(b, u, mul * pw, { ...o, stun: sk.stun, pvpStun: !!sk.pvpStun }, R);
  });
  if (P.move === 'leap') {
    // Landeplatz knapp vor dem Ziel; Hocke, Flug und Landung wie beim Mitspieler (remoteSkillFx setzt leap/glide)
    const L = abotReach(f.x, f.y, dir, Math.max(0, d0 - 24));
    abotFx(b, e, L, {});
    for (const [at, mul] of P.hits) hitAt(L, at, mul);
    b.lock = now + (sk.crouch || 0.06) + (sk.air || 0.28) + (sk.recover || 0.12);
    return;
  }
  if (P.move === 'blink') {
    // hinter das Ziel (wie der Blitzangriff), kurz unsichtbar
    const behind = { x: t.e.x + dir.x * 26, y: t.e.y + dir.y * 26 };
    const to = canStand(behind.x, behind.y, 8, false) ? behind : abotReach(f.x, f.y, dir, Math.max(0, d0 - 22));
    particles(f.x, feetY(f) - 14, { count: 18, color: ['#2a2234', '#5a4a6a', '#9fd0ff'], speed: [30, 90], life: [0.3, 0.6], size: [3, 6], drag: 2, glow: false });
    f.blinkHide = now + 0.12;
    abotFx(b, e, t.e, {});
    later(0.05, () => {
      if (!abotLive(b, id)) return;
      f.x = to.x;
      f.y = to.y;
      abotFace(b, t.e, 0.4);
      particles(f.x, feetY(f) - 14, { count: 14, color: ['#9fd0ff', '#ffffff'], speed: [40, 120], life: [0.2, 0.4], size: [1.5, 3], drag: 3 });
    });
    for (const [at, mul] of P.hits) hitAt(null, at, mul);
    b.lock = now + 0.3;
    return;
  }
  if (P.move === 'chain') {
    // Schattenkette: Sprünge rund um das Ziel, die Darstellung (MAGE2_REMOTE.chainblink) setzt die Figur je Sprung um
    const a0 = Math.atan2(-dir.y, -dir.x);
    const hops = abRep(P.hops, (k) => {
      const a = a0 + k * 2.2;
      let x = t.e.x + Math.cos(a) * 34;
      let y = t.e.y + Math.sin(a) * 34;
      if (!canStand(x, y, 8, false)) { x = t.e.x; y = t.e.y; }
      return [Math.round(x), Math.round(y), Math.round(t.e.x), Math.round(t.e.y)];
    });
    abotFx(b, e, t.e, { h: hops });
    for (const [at, mul] of P.hits) hitAt(null, at, mul);
    b.lock = now + P.hops * (sk.every || 0.13) + 0.15;
    return;
  }
  // Blitzschritt: durch das Ziel hindurch bis hinter es
  const to = abotReach(f.x, f.y, dir, Math.min(P.reach, d0 + 40));
  const from = { x: f.x, y: f.y };
  abotFx(b, e, to, { pre: 1, x0: Math.round(from.x), y0: Math.round(from.y), x1: Math.round(to.x), y1: Math.round(to.y) });
  f.x = to.x;
  f.y = to.y;
  later(P.hits[0][0], () => {
    if (!abotLive(b, id)) return;
    // wer an der Strecke steht, wird getroffen
    for (const u of R.units) {
      if (u.team === b.team || !u.alive) continue;
      const vx = to.x - from.x;
      const vy = to.y - from.y;
      const l2 = Math.max(1, vx * vx + vy * vy);
      const k = Math.max(0, Math.min(1, ((u.e.x - from.x) * vx + (u.e.y - from.y) * vy) / l2));
      if (hyp(u.e.x - (from.x + vx * k), u.e.y - (from.y + vy * k)) <= P.r + u.r) abotStrike(b, u, P.hits[0][1] * pw, o, R);
    }
  });
  b.lock = now + 0.3;
}
// Fluchtschritt (Eisschritt, Schattenschritt): vom Ziel weg, Treffer am alten Platz
function abotStep(b, e, t, R, pw, o) {
  const f = b.fig;
  const P = e.plan;
  const sk = e.sk;
  const id = R.id;
  const now = game.time;
  const d0 = Math.max(1, hyp(f.x - t.e.x, f.y - t.e.y));
  let dir = { x: (f.x - t.e.x) / d0, y: (f.y - t.e.y) / d0 };
  let to = abotReach(f.x, f.y, dir, P.dist);
  if (to.l < 60) {
    // nach hinten ist eine Wand: zur Seite
    for (const s of [1, -1]) {
      const sd = { x: -dir.y * s, y: dir.x * s };
      const alt = abotReach(f.x, f.y, sd, P.dist);
      if (alt.l > to.l) { to = alt; dir = sd; }
    }
  }
  const from = { x: f.x, y: f.y };
  const ex = { x0: Math.round(from.x), y0: Math.round(from.y), x1: Math.round(to.x), y1: Math.round(to.y), pre: 1 };
  abotFx(b, e, to, ex);
  if (P.move === 'shadow') {
    f.blinkHide = now + (sk.hide || 0.2);
    later((sk.hide || 0.2) * 0.5, () => { if (abotLive(b, id)) { f.x = to.x; f.y = to.y; } });
  } else {
    f.x = to.x;
    f.y = to.y;
  }
  for (const [at, mul] of P.hits) {
    later(at, () => {
      if (!abotLive(b, id)) return;
      for (const u of abotFoesIn(b, R, from.x, from.y, P.r)) abotStrike(b, u, mul * pw, o, R);
    });
  }
  b.lock = now + 0.35;
}
// Strahl halten (Eisstrahl, Blutsauger): stehen bleiben, je Takt ein Treffer, endet bei Abstand oder nach der Dauer
function abotChanTick(b, R) {
  const C = b.chan;
  const now = game.time;
  const f = b.fig;
  const u = C.u;
  if (!u || !u.alive || hyp(u.e.x - f.x, u.e.y - f.y) > C.e.plan.reach + 50 || now >= C.until) {
    abotStopChan(b);
    return;
  }
  abotFace(b, u.e, 0.3);
  f.swingKind = 'strahl';
  f.swingDur = 1;
  f.swing = Math.max(f.swing || 0, 0.55);
  if (now < C.next) return;
  C.next += C.e.plan.every;
  abotFx(b, C.e, u.e, { bm: 2 });
  const dealt = abotStrike(b, u, C.e.plan.mul * C.pw, C.o, R);
  if (C.e.plan.leech && dealt > 0) abotHeal(b, dealt * C.e.plan.leech * PVP_DMG.heal);
}
function abotStopChan(b) {
  const C = b.chan;
  if (!C) return;
  b.chan = null;
  abotFx(b, C.e, C.u ? C.u.e : null, { bm: 0 });
}
// Wirken (Feuerball): stehen, nach der Wirkzeit fliegt das Geschoss zum (vorgehaltenen) Ziel
function abotCastTick(b, R) {
  const C = b.cast;
  const now = game.time;
  const f = b.fig;
  const u = C.u;
  const P = C.e.plan;
  if (!u || !u.alive || hyp(u.e.x - f.x, u.e.y - f.y) > P.reach + 120) {
    abotFx(b, C.e, u ? u.e : null, { cx: 1 });
    b.cast = null;
    return;
  }
  abotFace(b, u.e, 0.3);
  if (now < C.at) return;
  b.cast = null;
  const travel = hyp(u.e.x - f.x, u.e.y - f.y) / P.speed;
  const aim = abotLead(u, travel);
  abotFx(b, C.e, aim, { rel: 1 });
  const id = R.id;
  const tt = hyp(aim.x - f.x, aim.y - f.y) / P.speed;
  later(tt, () => {
    if (!abotLive(b, id)) return;
    for (const v of abotFoesIn(b, R, aim.x, aim.y, P.r)) abotStrike(b, v, P.hits[0][1] * C.pw, { ...C.o, heavy: true }, R);
  });
  b.lock = game.time + 0.3;
}

// --- Treffer ----------------------------------------------------------------------------------------------------------
// roher Schaden eines Bots wie pvpOutgoing (kampf.js) mit den Werten des Bots: Krit, Grundangriff, Stark gegen Menschen,
// Ausgleich je Weg, Seelenstufen halb (seelenstufen.js), Gift, stapelnde Blutung, Betäubung nur mit pvpStun
function abotOut(b, mul, o) {
  const s = b.st;
  const crit = Math.random() < (s.crit || 0) + (o.critBonus || 0);
  const kind = o.basic ? (b.basic.ranged ? 'r' : 'm') : b.cls === 'magier' || b.cls === 'schamane' || b.cls === 'nekromant' ? 's' : b.cls === 'ninja' && b.path === 1 ? 'r' : 'm';
  let raw = s.atk * mul * (0.9 + Math.random() * 0.2) * (crit ? 1.8 + (s.critDmg || 0) : 1) * (o.basic ? 1 + (s.basicDmg || 0) : 1) * (o.duelMul || 1) *
    (1 + (s.vsHuman || 0)) * pathDmgMul(b.ch, 'pvp') * ABOT.dmg * (ABOT.weg[b.cls + ':' + b.path] || 1) * b.k;
  const sd = s.seeleDmg || 0;
  if (sd > 0) raw = (raw * (1 + sd / 2)) / (1 + sd);
  const d = { a: Math.round(raw), c: crit ? 1 : 0, l: b.level, at: kind };
  // Fertigkeit: seit 15.80 kein Ausweichen und Blocken (pvpReceiveHit → damagePlayer sure)
  if (o.skill && !o.basic) d.sk = 1;
  if (s.poison > 0 && Math.random() < s.poison) d.pz = Math.max(1, Math.round((raw * TOXIN.share) / TOXIN.dur));
  if (o.bleedStack) d.bl = [Math.max(1, Math.round(s.atk * o.bleedStack.dps * (s.skillDmg || 1) * b.k)), o.bleedStack.duration, o.bleedStack.max || 1];
  if (o.stun > 0 && o.pvpStun) d.st = +o.stun.toFixed(2);
  return d;
}
// Treffer eines Bots auf eine Einheit; Rückgabe: wirklich abgezogenes Leben
function abotStrike(b, u, mul, o, R) {
  if (!u || !u.alive || b.dead) return 0;
  const d = abotOut(b, mul, o);
  if (u.b) {
    const dealt = abotTakeHit(u.b, d, b.pid, R);
    if (dealt > 0) {
      abotLifeSteal(b, dealt);
      // Zahl am Getroffenen: rot für das eigene Team, sonst wie eigener Schaden
      addText(u.e.x + abRand(-8, 8), feetY(u.e) - 50, u.team === R.team ? '-' + dealt : String(dealt), u.team === R.team ? 'hurt' : d.c ? 'crit' : 'dmg');
    }
    vfxImpact(u.e, !!d.c, o.color);
    if (o.skill) skillHitFx(o.skill, u.e, !!d.c, o.heavy);
    return dealt;
  }
  // die eigene Figur: genau wie der Treffer eines echten Gegners (pvpReceive → pvpReceiveHit; die Rückmeldung für den
  // Lebensraub kommt über pvpSend an den Bot zurück, abotMsg)
  const p = game.player;
  const hp0 = p.hp;
  pvpReceive(b.pid, { k: 'pvh', id: R.id, ...d });
  if (p.hp < hp0) {
    vfxImpact(p, !!d.c, o.color);
    if (o.skill) skillHitFx(o.skill, p, !!d.c, o.heavy);
  }
  return Math.max(0, Math.round(hp0 - p.hp));
}
// Treffer auf einen Bot wie pvpReceiveHit bei der Figur: pvpIncoming mit den Werten des Bots (Deckel je Treffer und in
// 1,5 s), Ausweichen und Blocken nur bei Grundangriffen (im PvP halb), Gift, Blutung, Betäubung
function abotTakeHit(v, d, by, R) {
  const now = game.time;
  v.lastDef = '';
  if (v.dead) return 0;
  if (now < v.protectUntil) {
    v.lastDef = 'Abgewehrt';
    return 0;
  }
  const s = v.st;
  let amount = pvpIncoming(v.level, s, d, v.win, now);
  if (amount > 0 && !d.sk && !d.dot) {
    if (Math.random() < (s.dodge || 0) * PVP_DMG.dodgeMul) {
      addText(v.fig.x, v.fig.y - 30, 'Ausgewichen', 'info');
      v.lastDef = 'Ausgewichen';
      amount = 0;
    } else if (s.block > 0 && Math.random() < s.block * PVP_DMG.dodgeMul) {
      addText(v.fig.x, v.fig.y - 30, 'Geblockt', 'block');
      v.lastDef = 'Geblockt';
      amount = 0;
    }
  }
  let dealt = 0;
  if (amount > 0) {
    dealt = Math.min(Math.round(v.hp), amount);
    v.hp -= amount;
    v.win.push({ t: now, a: dealt });
    v.fig.hurtAt = now;
    v.lastHit = { pid: by, at: now };
  } else if (!v.lastDef) v.lastDef = 'Abgewehrt';
  if (v.hp > 0) {
    if (d.pz > 0) abotToxinIn(v, d, by);
    if (Array.isArray(d.bl)) abotBleedIn(v, d, by);
    if (d.st > 0) abotStunIn(v, d.st);
  }
  if (v.hp <= 0) abotDie(v, R);
  return dealt;
}
// Gift und Blutung am Bot: wie pvpToxinIn/pvpBleedIn (je Tick höchstens 1,5 % des Lebens)
function abotToxinIn(v, d, by) {
  const L = Math.max(1, d.l || 1);
  let tick = (d.pz * pvpMulAt(L) * (1 - Math.min(PVP_DMG.maxReduce, v.st.resHuman || 0))) / (1 + PVP_DMG.pad * v.level);
  tick = Math.max(1, Math.round(Math.min(tick, v.maxHp * PVP_DMG.toxinTick)));
  const old = v.toxin && v.toxin.until > game.time ? v.toxin : null;
  v.toxin = { dps: old ? Math.max(old.dps, tick) : tick, until: game.time + TOXIN.dur, tick: old ? old.tick : 0, by };
}
function abotBleedIn(v, d, by) {
  const L = Math.max(1, d.l || 1);
  const [raw, dur, max] = d.bl;
  if (!(raw > 0) || !(dur > 0)) return;
  const per = (raw * pvpMulAt(L) * (1 - Math.min(PVP_DMG.maxReduce, v.st.resHuman || 0))) / (1 + PVP_DMG.pad * v.level);
  const old = v.bleed && v.bleed.until > game.time ? v.bleed : null;
  const stk = old ? Math.min(max || 1, old.stk + 1) : 1;
  const per1 = old ? Math.max(old.per, per) : per;
  const dps = Math.max(1, Math.round(Math.min(per1 * stk, v.maxHp * PVP_DMG.toxinTick)));
  v.bleed = { per: per1, stk, dps, until: game.time + Math.min(dur, 8), tick: old ? old.tick : 0, by };
}
// Betäubung (nur der Sprungschlag, pvpStun): kürzer und mit Schutz danach wie bei Spielern (PVP_STUN)
function abotStunIn(v, raw) {
  const now = game.time;
  if (now < v.stunGuard) return;
  const dur = Math.min(PVP_STUN.max, raw * PVP_STUN.mul);
  if (!(dur > 0.05)) return;
  v.stunUntil = now + dur;
  v.stunGuard = now + dur + PVP_STUN.guard;
  if (v.chan) abotStopChan(v);
  if (v.cast) {
    abotFx(v, v.cast.e, v.cast.u ? v.cast.u.e : null, { cx: 1 });
    v.cast = null;
  }
  addText(v.fig.x, v.fig.y - 44, 'Betäubt', 'hurt');
}
function abotDotTick(b, R, dt) {
  for (const key of ['toxin', 'bleed']) {
    const t = b[key];
    if (!t) continue;
    if (t.until <= game.time || R.state === 'end') {
      b[key] = null;
      continue;
    }
    t.tick += dt;
    if (t.tick < 1) continue;
    t.tick -= 1;
    if (game.time < b.protectUntil) continue;
    const a = Math.min(Math.round(b.hp), t.dps);
    b.hp -= t.dps;
    b.lastHit = { pid: t.by, at: game.time };
    addText(b.fig.x + abRand(-6, 6), feetY(b.fig) - 46, String(a), 'toxin');
    if (t.by === 'me') R.dealt += a;
    if (b.hp <= 0) {
      abotDie(b, R);
      return;
    }
  }
}
function abotLifeSteal(b, dealt) {
  const k = (b.st.hpSteal || 0) + (b.st.omniVamp || 0);
  if (!(dealt > 0) || !(k > 0) || b.dead) return;
  const gain = Math.min(b.maxHp - b.hp, dealt * k * PVP_DMG.heal, b.maxHp * 0.03);
  if (gain > 0) b.hp += gain;
}
function abotHeal(b, amount) {
  if (b.dead || !(amount > 0)) return;
  const a = Math.round(Math.min(b.maxHp - b.hp, amount));
  if (a <= 0) return;
  b.hp += a;
  addText(b.fig.x + abRand(-6, 6), b.fig.y - 44, '+' + a, 'heal');
}
// Heilung einer Einheit (Bot oder die eigene Figur)
function abotHealUnit(u, amount) {
  if (u.b) { abotHeal(u.b, amount); return; }
  const p = game.player;
  if (p.dead || !(amount > 0)) return;
  const a = Math.round(Math.min(game.stats.maxHp - p.hp, amount));
  if (a <= 0) return;
  p.hp += a;
  addText(p.x + abRand(-6, 6), p.y - 44, '+' + a, 'heal');
}
// Lebenstrank: größte Größe der Stufe, im PvP zu 85 % (PVP_DMG.potion), Abklingzeit wie bei der Figur
function abotPotion(b) {
  const sizes = POTION_SIZES.filter((s) => b.level >= (s.level || 1));
  const sz = sizes[sizes.length - 1] || POTION_SIZES[0];
  const a = Math.round(Math.min(sz.hp * PVP_DMG.potion, b.maxHp - b.hp));
  b.potions--;
  b.potAt = game.time + POTION_CD + abRand(0.4, 1.2);
  if (a <= 0) return;
  b.hp += a;
  vfxPotion(b.fig, 'hp');
  addText(b.fig.x, b.fig.y - 30, `+${a.toLocaleString('de-DE')} Leben`, 'heal');
}
function abotDie(b, R) {
  const now = game.time;
  if (b.dead) return;
  b.dead = true;
  b.hp = 0;
  b.deadAt = now;
  b.toxin = null;
  b.bleed = null;
  if (b.chan) abotStopChan(b);
  if (b.cast) abotFx(b, b.cast.e, null, { cx: 1 });
  b.cast = null;
  b.tgt = null;
  b.want = null;
  const P = R.players.find((x) => x.pid === b.pid);
  if (P) {
    P.dead = true;
    P.deadAt = now;
    P.deaths++;
  }
  const by = b.lastHit && now - b.lastHit.at < 15 ? b.lastHit.pid : null;
  const K = by ? R.players.find((x) => x.pid === by && x.team !== b.team) : null;
  if (K) {
    K.kills++;
    if (!R.ranked) R.score[K.team]++;
  }
  const f = b.fig;
  particles(f.x, feetY(f) - 18, { count: 26, color: [PVP_TEAM[b.team].color, '#ffffff', '#c8c0b0'], speed: [40, 150], life: [0.4, 0.9], size: [2, 4], drag: 3 });
  addText(f.x, feetY(f) - 56, 'Gefallen', 'info');
  if (!R.ranked) b.respawnAt = now + PVP.respawn;
  R.dirty = true;
}
// Turmschlacht: wieder in der eigenen Basis, kurz geschützt
function abotRespawn(b, R) {
  const at = pvpSpawnSpot(R.slot, b.team, b.idx);
  b.dead = false;
  b.respawnAt = 0;
  b.win = [];
  b.fig.x = at.x;
  b.fig.y = at.y;
  b.fig.glide = null;
  b.last = { x: at.x, y: at.y };
  b.hp = b.maxHp;
  abotStats(b);
  b.hp = b.maxHp;
  b.protectUntil = game.time + PVP.protect;
  b.potions = Math.max(b.potions, 1);
  vfxPillar(b.fig, PVP.gate, 1);
  const P = R.players.find((x) => x.pid === b.pid);
  if (P) P.dead = false;
  R.dirty = true;
}

// --- Nachrichten, die sonst ins Netz gingen ------------------------------------------------------------------------------
// an einen Bot (pvpSend): Treffer der eigenen Figur ('pvh') und Rückmeldung auf einen Treffer des Bots ('pvf')
function abotMsg(pid, d) {
  const R = abot.run;
  const b = abot.bots.find((x) => x.pid === pid);
  if (!R || !b || !d || d.id !== R.id) return;
  if (d.k === 'pvh') {
    if (R.state !== 'fight' || b.team === R.team) return;
    const dealt = abotTakeHit(b, d, 'me', R);
    R.dealt += dealt;
    // dieselbe Rückmeldung wie von einem echten Gegner: Zahl, Lebensraub, Anteil für den Lebensentzug (pvpFeedback)
    pvpFeedback(pid, { k: 'pvf', id: R.id, a: dealt, r: d.a, c: d.c ? 1 : 0, al: d.al ? 1 : 0, t: dealt ? '' : b.lastDef || 'Abgewehrt' });
    abotNoteHit(b);
  } else if (d.k === 'pvf') {
    if (!d.p && !d.al && d.a > 0) abotLifeSteal(b, d.a);
  }
}
// Flächen der Figur: wer mehrmals schnell hintereinander von weit her getroffen wird, geht kurz zur Seite
function abotNoteHit(b) {
  const now = game.time;
  const p = game.player;
  b.hitLog = b.hitLog.filter((t) => now - t < 1.5);
  b.hitLog.push(now);
  if (b.hitLog.length >= 3 && now >= b.evadeUntil + 1.5 && hyp(p.x - b.fig.x, p.y - b.fig.y) > 140 && Math.random() < 0.6) {
    const dx = b.fig.x - p.x;
    const dy = b.fig.y - p.y;
    const l = Math.max(1, hyp(dx, dy));
    const s = Math.random() < 0.5 ? 1 : -1;
    b.evadeDir = { x: (-dy / l) * s, y: (dx / l) * s };
    b.evadeUntil = now + abRand(0.6, 1);
    b.hitLog.length = 0;
  }
}
// an den Host (pvpToHost): eigener Fall ('pvd') und Verlassen ('pvl') – im Bot-Kampf führt das eigene Gerät
function abotLocal(d) {
  const R = abot.run;
  const now = game.time;
  const me = R.players[0];
  if (d.k === 'pvd') {
    if (R.state !== 'fight' || me.dead) return;
    me.dead = true;
    me.deadAt = now;
    me.deaths++;
    const K = d.by ? R.players.find((x) => x.pid === d.by && x.team !== me.team) : null;
    if (K) {
      K.kills++;
      if (!R.ranked) R.score[K.team]++;
    }
    R.dirty = true;
  } else if (d.k === 'pvl') {
    me.left = true;
    me.dead = true;
    R.dirty = true;
  }
}

// --- Eigene Figur im Bot-Kampf (statt pvpTick, der ohne Netz und Host abbrechen würde) ---------------------------------
// Countdown, Kampfbeginn, Wiedereinstieg, aus der Halle gelaufen und Rückkehr wie in pvpTick (turnierarena.js)
function abotTick() {
  const p = game.player;
  const M = game.pvpMatch;
  const R = abot.run;
  const now = game.time;
  const dt = Math.min(0.1, Math.max(0, now - (abot.lastT == null ? now : abot.lastT)));
  abot.lastT = now;
  // Host-Pflichten für die anderen Spieler im Kanal laufen weiter (pvpHostTick), ein Hostwechsel bricht nichts ab
  const pn = performance.now();
  const hdt = Math.min(0.5, Math.max(0, (pn - (pvpState.tickAt || pn)) / 1000));
  pvpState.tickAt = pn;
  pvpHostTick(hdt);
  const hk = pvpHostKey();
  if (hk !== pvpState.hostKey) {
    pvpState.hostKey = hk;
    pvpState.status = null;
    pvpState.pending = null;
  }
  const here = pvpSlotAt(p.x, p.y);
  if (here >= 0 && game.riftAt != null && game.riftAt - now < 30) game.riftAt = now + 30;
  // keine Monster in der Halle (Nachtmonster, verirrte Beschwörungen); beim Mitspieler führt sie der Host
  if (net.mode !== 'client' && now - (abot.purgeAt || 0) > 1) {
    abot.purgeAt = now;
    const inHall = (m) => !m.isStone && pvpSlotAt(m.x, m.y) === R.slot;
    if (game.monsters.some(inHall)) game.monsters = game.monsters.filter((m) => !inHall(m));
  }
  if (R.state !== 'end') abotRun(R, dt);
  if (M.state === 'count') {
    const left = Math.ceil(M.fightAt - now);
    if (left !== M.shown && left > 0) {
      M.shown = left;
      ui.banner(String(left), `${PVP_MODES[M.mode].name} · Team ${PVP_TEAM[M.team].name}`);
    }
    if (now >= M.fightAt) M.state = 'fight';
  }
  if (M.state === 'fight' && M.shown !== 0) {
    M.shown = 0;
    ui.banner('Kampf!', M.ranked ? 'Wer fällt, scheidet aus – das letzte Team gewinnt' : `Lade den Turm auf oder hol dir ${PVP.funKills} Kills`);
  }
  if (p.dead && M.respawnAt && now >= M.respawnAt && M.state === 'fight') {
    M.respawnAt = 0;
    pvpRevive();
    pvpWarp(pvpSpawnSpot(M.slot, M.team, M.idx));
    const me = M.roster.get(M.me);
    if (me) me.dead = false;
  }
  if (here !== M.slot && !p.dead && M.state !== 'end') {
    if (M.outSince == null) M.outSince = now;
    if (now - M.outSince > 1.5) {
      pvpLeave('weg');
      return;
    }
  } else M.outSince = null;
  if (M.state === 'end' && now >= M.returnAt) {
    pvpReturnHome();
    abotCleanup();
    return;
  }
  pvpUpdateFoes();
  pvpHud();
}
// vor jedem pvpTick: offener Bot-Rangkampf nach dem Neuladen zählt als halbe Niederlage (bevor pvpTick die ganze
// rechnet), Ausrüstung als Vorbild merken
function abotPre(p) {
  const A = pvpSave(p);
  if (A.open && A.open.bot && !game.pvpMatch) {
    const before = A.pts || 0;
    abotWithPts(abHalf(PVP.win), abHalf(PVP.loss), () => { A.pts = pvpRate(before, false); });
    A.l = (A.l || 0) + 1;
    A.bl = (A.bl | 0) + 1;
    A.open = null;
    ui.log(`Dein letzter Rangkampf wurde nicht zu Ende gespielt und zählt als Niederlage (−${before - A.pts} Rangpunkte).`, 'warn');
    saveGame();
  }
  if (game.time - abot.peakAt > 3) {
    abot.peakAt = game.time;
    abotPeak(p);
  }
}
// Warteschlange: nach ABOT.wait Sekunden ohne echten Kampf füllen Bots auf
function abotQueueTick() {
  const p = game.player;
  const q = abot.q;
  // Fenster beim Turniermeister: Sekunden bis zum Auffüllen bzw. bis zum nächsten Bot-Kampf
  if (pvpState.npcOpen && game.time - abot.npcAt >= 1 && (q || abot.pauseUntil > game.time - 1.2)) {
    abot.npcAt = game.time;
    pvpRefreshNpc();
  }
  if (!q) return;
  if (!p || game.pvpMatch || !netOnline() || p.level < PVP.minLevel) {
    abot.q = null;
    return;
  }
  const st = pvpState.status;
  if (st && st.in === q.mode) q.seen = true;
  else if (q.seen && !pvpState.pending) {
    // abgemeldet oder vom Host aus der Warteschlange genommen
    abot.q = null;
    return;
  }
  if (game.time - q.at < ABOT.wait || p.dead) return;
  if (game.time - abot.failAt < 5) return;
  ui.log('Nicht genug Spieler – Bots füllen auf (halbe Punkte).', 'info');
  if (!abotStart(q.mode)) abot.failAt = game.time;
}

// --- Haken in den vorhandenen Code ---------------------------------------------------------------------------------------
const _abotPvpTick = pvpTick;
pvpTick = function () {
  const p = game.player;
  if (p && game.world && !WAECHTER) abotPre(p);
  const M = game.pvpMatch;
  if (abot.run && (!M || M.id !== abot.run.id || M.p !== p)) abotCleanup();
  if (!M || !M.bot || M.p !== p || !abot.run) {
    _abotPvpTick();
    abotQueueTick();
    return;
  }
  abotTick();
};
// Treffer an einen Bot und Rückmeldungen an ihn bleiben auf dem Gerät
const _abotPvpSend = pvpSend;
pvpSend = function (pid, d) {
  if (abIsBot(pid)) {
    abotMsg(pid, d);
    return;
  }
  return _abotPvpSend(pid, d);
};
// Fall und Verlassen im Bot-Kampf gehen nicht an den Host
const _abotPvpToHost = pvpToHost;
pvpToHost = function (d) {
  const R = abot.run;
  if (R && d && d.id === R.id && (d.k === 'pvd' || d.k === 'pvl')) {
    abotLocal(d);
    return;
  }
  return _abotPvpToHost(d);
};
// ein echter Kampf vom Host: im Countdown entfällt der Bot-Kampf, im Kampf bleibt man (der Host erfährt, dass man fehlt)
const _abotPvpOnMatch = pvpOnMatch;
pvpOnMatch = function (d) {
  const M = game.pvpMatch;
  if (M && M.bot && M.state !== 'end' && d && d.id !== M.id) {
    if (M.state === 'count') abotCancel('Ein echter Kampf beginnt – der Kampf gegen Bots entfällt.');
    else {
      _abotPvpToHost({ k: 'pvl', id: d.id });
      return;
    }
  }
  if (d && !(abot.run && d.id === abot.run.id)) abot.q = null;
  return _abotPvpOnMatch(d);
};
// Verlassen eines Bot-Rangkampfs: halbe Niederlage
const _abotPvpLeave = pvpLeave;
pvpLeave = function (why) {
  const M = game.pvpMatch;
  if (!M || !M.bot) return _abotPvpLeave(why);
  const counts = M.ranked && M.state !== 'end';
  abotWithPts(abHalf(PVP.win), abHalf(PVP.loss), () => _abotPvpLeave(why));
  if (counts) {
    const A = pvpSave();
    A.bl = (A.bl | 0) + 1;
    saveGame();
  }
  abotCleanup();
};
// Gegnerliste (Zielen, Flächen, Geschosse, Diener) im Bot-Kampf aus den Bots
const _abotUpdateFoes = pvpUpdateFoes;
pvpUpdateFoes = function () {
  const M = game.pvpMatch;
  const R = abot.run;
  if (!M || !M.bot || !R || M.id !== R.id) return _abotUpdateFoes();
  const list = pvpState.foes;
  list.length = 0;
  if (M.state === 'fight' && !game.player.dead) for (const b of abot.bots) if (b.team !== R.team && !b.dead) list.push(b.px);
  const t = game.target;
  if (t && t.pvp && (t.dead || t.hidden || !list.includes(t))) setTarget(null);
};
// Leben eines Bots in der Anzeige (Balken je Team, Anzeigetafel)
const _abotPvpLife = pvpLife;
pvpLife = function (M, e) {
  if (M && M.bot && e && abIsBot(e.pid)) {
    if (e.left) return -1;
    const b = abot.bots.find((x) => x.pid === e.pid);
    return !b || b.dead ? -1 : Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
  }
  return _abotPvpLife(M, e);
};
// Anzeige im Bot-Kampf: halbe Punkte beim Verlassen, Hinweis „gegen Bots“ an der Art
const _abotPvpHud = pvpHud;
pvpHud = function () {
  const M = game.pvpMatch;
  if (!M || !M.bot) return _abotPvpHud();
  abotWithPts(abHalf(PVP.win), abHalf(PVP.loss), () => _abotPvpHud());
  const md = pvpUi.el && !pvpUi.el.hidden ? pvpUi.el.querySelector('.md') : null;
  if (md && !md.querySelector('.abot-tag')) md.insertAdjacentHTML('beforeend', ' <small class="abot-tag">gegen Bots</small>');
};
// Ergebnis: sichtbar „gegen Bots: halbe Punkte“ (und warum ein Sieg ohne echten Kampf nichts bringt)
const _abotPvpSummary = pvpSummary;
pvpSummary = function (M) {
  _abotPvpSummary(M);
  if (!M || !M.bot) return;
  const el = document.getElementById('pvpSum');
  const sub = el && el.querySelector('.sub');
  if (!sub) return;
  const R = abot.run;
  let h = `<p class="sub abot-note"><b>${M.ranked ? 'gegen Bots: halbe Punkte' : 'gegen Bots'}</b></p>`;
  if (M.ranked && R && R.won === true && !R.valid) h += '<p class="sub abot-note">Kein echter Kampf – dieser Sieg bringt keine Punkte.</p>';
  sub.insertAdjacentHTML('afterend', h);
};
// Bots antippen bzw. anklicken: Gegner werden zum Ziel (eigene Bots nicht)
if (typeof remotePlayerAt === 'function') {
  const _abotRemoteAt = remotePlayerAt;
  remotePlayerAt = function (wx, wy) {
    const hit = _abotRemoteAt(wx, wy);
    const R = abot.run;
    if (hit || !R || !game.pvpMatch || !game.pvpMatch.bot) return hit;
    let best = null;
    let bd = 26;
    for (const b of abot.bots) {
      if (b.dead || b.team === R.team) continue;
      const d = hyp(b.fig.x - wx, feetY(b.fig) - 22 - wy);
      if (d < bd) { bd = d; best = b.pid; }
    }
    return best;
  };
}
// Heilen der Lichtkuppel wirkt auch auf die Bots im eigenen Team
if (typeof healParty === 'function') {
  const _abotHealParty = healParty;
  healParty = function (pct, x, y, r) {
    _abotHealParty(pct, x, y, r);
    const R = abot.run;
    const M = game.pvpMatch;
    if (!R || !M || !M.bot || M.state === 'end') return;
    const hp = (game.stats && game.stats.healPower) || 1;
    for (const b of abot.bots) {
      if (b.dead || b.team !== R.team || hyp(b.fig.x - x, b.fig.y - y) > r) continue;
      abotHeal(b, b.maxHp * Math.min(0.3, pct * hp) * PVP_DMG.heal);
    }
  };
}
// Diener kämpfen auch ohne Netz gegen Bots (allyScore lässt Stellvertreter sonst nur online zu)
if (typeof allyScore === 'function') {
  const _abotAllyScore = allyScore;
  allyScore = function (m, a, p, proxyOk) {
    return _abotAllyScore(m, a, p, proxyOk || !!(m && m.abot));
  };
}
// Warteschlange merken (für das Auffüllen nach ABOT.wait Sekunden)
const _abotPvpQueue = pvpQueue;
pvpQueue = function (mode) {
  _abotPvpQueue(mode);
  if (!mode) {
    abot.q = null;
    return;
  }
  const p = game.player;
  if (netOnline() && p && p.level >= PVP.minLevel && !game.pvpMatch) abot.q = { mode, at: game.time, seen: false };
};

// --- Fenster beim Turniermeister: „Gegen Bots“ je Art, Hinweise, ohne Server die Bot-Kämpfe ----------------------------
function abotCss() {
  if (document.getElementById('abotCss')) return;
  const st = document.createElement('style');
  st.id = 'abotCss';
  st.textContent =
    '.abot-tag{font-weight:700;font-size:11px;color:#9fd0ff;margin-left:4px;letter-spacing:.2px}' +
    '#pvpSum .abot-note{color:#9fd0ff;margin:-4px 0 8px}' +
    '.pvp-modes .buy{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}' +
    '.abot-btn{background:linear-gradient(180deg,#2f4f7a,#223a5c);border-color:#6a9ad8;color:#eaf4ff}' +
    '.abot-wait{font-weight:700;color:#9fd0ff}';
  document.head.appendChild(st);
}
function abotMasterExtras() {
  const body = $('npcBody');
  const p = game.player;
  if (!body || !p || game.pvpMatch) return;
  abotCss();
  const low = p.level < PVP.minLevel;
  const wait = abotPauseLeft();
  const btn = (id) => `<button class="mini-btn abot-btn" type="button" data-abot="${id}" ${low || wait > 0 ? 'disabled' : ''}>Gegen Bots</button>`;
  const notes = [];
  if (netOnline()) {
    body.querySelectorAll('.pvp-modes .shop-item').forEach((el, k) => {
      const buy = el.querySelector('.buy');
      if (buy && PVP_MODE_IDS[k]) buy.insertAdjacentHTML('beforeend', btn(PVP_MODE_IDS[k]));
    });
    notes.push(`Gegen Bots: sofort los, Sieg +${abHalf(PVP.win)}, Niederlage −${abHalf(PVP.loss)}. Wartest du ${ABOT.wait} s ohne genug Mitspieler, füllen Bots auf.`);
    const q = abot.q;
    if (q) notes.push(`<span class="abot-wait">Bots füllen in ${Math.max(0, Math.ceil(ABOT.wait - (game.time - q.at)))} s auf</span>`);
  } else {
    // ohne Server: statt „braucht Mitspieler“ die Arten mit „Gegen Bots“ (die Knöpfe fürs Netz bleiben)
    const err = body.querySelector('.form-error');
    if (err) {
      err.className = 'hint-text';
      err.textContent = 'Ohne Server kämpfst du hier gegen Bots – mit halben Rangpunkten. Für Kämpfe gegen echte Spieler geh über „Server“ online in einen Kanal.';
    }
    const list = `<div class="shop pvp-modes">` + PVP_MODE_IDS.map((id) => {
      const def = PVP_MODES[id];
      const rules = def.ranked
        ? `${PVP_DIM[id].name} · Wer fällt, scheidet aus. Das letzte Team gewinnt. Sieg +${abHalf(PVP.win)}, Niederlage −${abHalf(PVP.loss)} Punkte.`
        : `${PVP_DIM[id].name} · Blau gegen Rot mit Bots, ohne Rang. Lade den Turm in der Mitte auf 100 % oder hol ${PVP.funKills} Kills.`;
      return `<div class="shop-item"><strong>${def.name}</strong><small>${rules}</small><div class="buy">${btn(id)}</div></div>`;
    }).join('') + '</div>';
    const anchor = body.querySelector('[data-pvn]') || err;
    if (anchor) anchor.insertAdjacentHTML('afterend', list);
  }
  if (wait > 0) notes.push(`<span class="abot-wait">Nächster Kampf gegen Bots in ${Math.ceil(wait)} s</span>`);
  if (low) notes.length = 0;
  if (notes.length) {
    const modes = body.querySelectorAll('.pvp-modes');
    const at = modes[modes.length - 1];
    if (at) at.insertAdjacentHTML('afterend', notes.map((n) => `<p class="hint-text">${n}</p>`).join(''));
  }
  body.querySelectorAll('[data-abot]').forEach((b) => b.addEventListener('click', () => abotStart(b.dataset.abot)));
}
const _abotRenderMaster = pvpRenderMaster;
pvpRenderMaster = function () {
  _abotRenderMaster();
  try {
    abotMasterExtras();
  } catch (err) {
    console.warn('Turnierarena (Bots):', err);
  }
};

// --- Bild: Bots als Spielerfiguren ----------------------------------------------------------------------------------------
// 2D: in der Szene wie Mitspieler (drawPlayer über e.remote, Name und Balken über drawLabel)
if (typeof collectScene === 'function') {
  const _abotCollect = collectScene;
  collectScene = function (view, x0, y0, x1, y1, inView) {
    const list = _abotCollect(view, x0, y0, x1, y1, inView);
    if (!abot.run) return list;
    let n = 0;
    for (const b of abot.bots) {
      if (b.dead || !inView(b.fig)) continue;
      list.push(b.fig);
      n++;
    }
    if (n) list.sort((a, c) => sceneBaseY(a) - sceneBaseY(c));
    return list;
  };
}
// 3D: Figuren über V3.extra (abotSyncFigs, v3SyncActors baut sie mit syncPlayer3), Name und Balken: während
// drawOverlay3 stehen die Bots in der Liste, aus der die Schilder über den Köpfen kommen
if (typeof drawOverlay3 === 'function' && typeof v3Monsters === 'function') {
  const _abotOverlay3 = drawOverlay3;
  drawOverlay3 = function (ctx) {
    abot.ov = !!abot.run;
    try {
      return _abotOverlay3(ctx);
    } finally {
      abot.ov = false;
    }
  };
  const _abotV3Monsters = v3Monsters;
  v3Monsters = function () {
    const l = _abotV3Monsters();
    if (!abot.ov || !abot.run || !abot.figs3.length) return l;
    return l.concat(abot.figs3);
  };
}

// --- Erfolge: Siege gegen Bots zählen halb ------------------------------------------------------------------------------
if (typeof ERFOLG_BY_ID !== 'undefined') {
  for (const id of ['pvp1', 'pvp2']) {
    const E = ERFOLG_BY_ID[id];
    if (E) E.val = (p) => Math.floor(((p.pvp && p.pvp.w) | 0) - ((p.pvp && p.pvp.bw) | 0) / 2);
  }
}
