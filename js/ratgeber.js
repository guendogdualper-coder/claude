// Ratgeberin (seit 13.91): eine Person mitten in Vlotho, die neuen Spielern Fragen beantwortet.
// - Steht am zentralen Platz (RATGEBER_SPOT, Kacheln). Ist die Stelle belegt (z. B. nach einem Umbau der Stadt), sucht
//   rgPlace beim Weltbau die nächste freie Stelle drumherum (keine Mauer, kein Wasser, Abstand zu Leuten, Ständen,
//   Schmuck und dem Startplatz). Alles feste Zahlen: Jeder Mitspieler bekommt dieselbe Stelle.
// - Über dem Kopf ein großes hellblaues „?“ (2D und 3D, drawNpcMarks), auf der Karte ebenfalls (questMarkChar).
// - Ihr Fenster (NPC-Fenster, ui.openNpc): oben ein Suchfeld mit Sofort-Antworten (Volltext über Fragen, Antworten und
//   Stichwörter; tolerant bei Groß/Klein, Umlauten/ae-oe-ue, Wortanfängen, Teilwörtern und kleinen Tippfehlern,
//   sortiert nach Relevanz), links die Themen, ohne Suche der Leitfaden „Erste Schritte“ und häufige Fragen, ganz unten
//   der Weg ins Wiki. Das Wissen steht in js/daten/ratgeber-wissen.js.
// - Hinweise für Neue (Stufe 1–5): einmal je Charakter eine Zeile im Chat nach dem Start (p.ratgeber im Spielstand),
//   oben im Questfenster ein Hinweis mit Knopf, in der Hilfe (H) ein Knopf, der das Fenster direkt öffnet.

const RATGEBER = {
  id: 'ratgeber',
  name: 'Ratgeberin Mira',
  short: 'Mira',
  mark: '#7fd6ff',      // Farbe des „?“ über dem Kopf und auf der Karte
  glow: '#3aa8ff',
  maxHits: 14,          // so viele Treffer zeigt die Suche höchstens
  newbieLevel: 5        // bis zu dieser Stufe gibt es die Hinweise für Neue
};
// Standort in Kacheln: rechts neben dem Brunnen am zentralen Platz von Vlotho, schräg über dem Startplatz.
// Zum Verschieben nur diese Zahlen ändern – ist die Stelle belegt, nimmt rgPlace die nächste freie.
// seit 13.97 auf dem freien Platz des neuen Dorfplans (VLOTHO_FREE_SPOT in welt.js, südwestlich des Brunnens)
const RATGEBER_SPOT = { x: CENTER_X - 3, y: CENTER_Y + 2 };

// --- Namen und Tasten für die Antworten ------------------------------------------------------------------------
const RG_ROLE = {
  aeltester: 'Dorfälteste', haendler: 'Händlerin', waffen: 'Waffenhändler', ruestung: 'Rüstungshändlerin', schmied: 'Schmied',
  lehrmeister: 'Lehrmeister', teleport: 'Wegweiserin', alchemist: 'Alchemist', lager: 'Lagerverwalter', jaegerin: 'Jägerin',
  stallmeister: 'Stallmeister', bogenmacher: 'Bogenmacherin', post: 'Postmeisterin', auktion: 'Auktionator', arena: 'Arenameisterin', pvp: 'Turniermeister'
};
// Name der Person mit dieser Rolle in Vlotho (aus der Welt, damit Umbenennungen von selbst stimmen)
function rgName(id) {
  const w = game.world;
  const n = w && w.npcs.find((x) => x.id === id && x.name && typeof npcMapId === 'function' && npcMapId(x) === 1);
  return n ? n.name : RG_ROLE[id] || id;
}
// Taste einer Aktion (eigene Belegung, tasten.js)
function rgKey(id) {
  const code = typeof actionKey === 'function' ? actionKey(id) : null;
  return `<kbd>${typeof keyLabel === 'function' ? keyLabel(code) : code || '–'}</kbd>`;
}
// Platzhalter {n:rolle} und {k:aktion} füllen
function rgFill(html) {
  return String(html || '').replace(/\{n:([a-z]+)\}/g, (_, id) => rgName(id)).replace(/\{k:([a-zA-Z0-9]+)\}/g, (_, id) => rgKey(id));
}
const rgEsc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// --- Platz in der Welt -----------------------------------------------------------------------------------------
// Kann sie bei (x, y) (Kacheln) stehen? Kein Objekt, kein Wasser, Abstand zu Leuten, Ständen, Schmuck und Startplatz.
function rgFreeAt(w, x, y, props) {
  for (const [ox, oy] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    const tx = Math.floor(x + ox);
    const ty = Math.floor(y + oy);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    const i = ty * MAP_W + tx;
    if (w.obj[i] !== OBJ.NONE) return false;
    if (LIQUID.has(w.ground[i]) && w.deco[i] !== DECO.BRIDGE) return false;
  }
  for (const n of w.npcs) {
    if (n.id === RATGEBER.id) continue;
    const nx = n.x / TILE;
    const ny = n.y / TILE;
    if (Math.abs(nx - x) > 9 || Math.abs(ny - y) > 9) continue;
    if (n.wander) {
      // Umherlaufende gehen bis zu 2,5 Kacheln seitlich und 2 Kacheln hoch und runter (updateVillagers)
      if (Math.abs(n.homeX / TILE - x) < 3.1 && Math.abs(n.homeY / TILE - y) < 2.6) return false;
    } else if (Math.hypot(nx - x, ny - y) < (n.id === 'weltentor' || n.id === 'eingang' ? 3.2 : 1.7)) return false;
  }
  for (const pr of props) {
    const R = pr.type === 'stand' ? 1.9 : pr.type === 'well' || pr.type === 'horse' ? 1.6 : 1.2;
    if (Math.hypot(pr.x / TILE - x, pr.y / TILE - y) < R) return false;
  }
  // nicht auf den Startplatz (villageSpawn: Mitte, eine Kachel tiefer) – sonst steht man beim Start in ihr
  if (Math.hypot(x - CENTER_X, y - (CENTER_Y + 1)) < 1.6) return false;
  return true;
}
// Nächste freie Stelle zu RATGEBER_SPOT (Ringe im Abstand einer halben Kachel, feste Reihenfolge)
function rgPlace(w) {
  const S = RATGEBER_SPOT;
  const props = w.props.filter((pr) => Math.abs(pr.x / TILE - S.x) < 12 && Math.abs(pr.y / TILE - S.y) < 12);
  for (let r = 0; r <= 10; r += 0.5) {
    const steps = r ? Math.max(8, Math.round(r * 8)) : 1;
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = Math.round((S.x + Math.cos(a) * r) * 20) / 20;
      const y = Math.round((S.y + Math.sin(a) * r) * 20) / 20;
      if (rgFreeAt(w, x, y, props)) return { x, y };
    }
  }
  return { x: S.x, y: S.y };
}
const _rgGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _rgGenerateWorld.apply(this, arguments);
  try {
    const at = rgPlace(w);
    // schaut leicht schräg zum Platz (restYaw wie die Stadtleute, drei-figuren.js)
    w.npcs.push({ id: RATGEBER.id, name: RATGEBER.name, x: at.x * TILE, y: at.y * TILE, r: 11, restYaw: -0.35 });
  } catch (e) {
    console.warn('Ratgeberin: kein Platz gefunden', e);
  }
  return w;
};

// --- Aussehen --------------------------------------------------------------------------------------------------
// Gelehrte in einer petrolblauen Robe mit goldenem Saum, langes kastanienbraunes Haar mit Stirnreif, ein Buch (2D)
// bzw. ein Zepter mit hellem Kristall (3D)
NPC_ART[RATGEBER.id] = (ctx) => villagerArt(ctx, {
  skin: '#ecc9a5', boots: '#2a2420', robe: '#245e7a', torso: '#245e7a', sleeve: '#245e7a', cuff: '#e0c36a', wideSleeves: true, eyes: { blush: true },
  behind: (ctx) => {
    // langes Haar hinter dem Rücken
    box(ctx, -9.5, -34, 19, 16, 5, '#5a3220');
  },
  body: (ctx, half) => {
    // Kragen, Schärpe und Gürtel mit Schnalle
    poly(ctx, [[-5, -25], [0, -19], [5, -25], [3, -26], [0, -22], [-3, -26]], '#e0c36a');
    stroke(ctx, '#e0c36a', 1.6, [[-half + 2, -24], [half - 3, -12]]);
    box(ctx, -half, -12.8, half * 2, 2.6, 1, '#6b4a2e');
    dot(ctx, 0, -11.5, 1.6, 1.6, '#ffd34d');
  },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#5a3220', 13);
    // Stirnreif mit hellblauem Stein
    box(ctx, cx - 10.5, cy - 8.2, 21, 1.6, 0.6, '#e0c36a');
    dot(ctx, cx, cy - 7.4, 1.9, 1.9, '#7fd6ff');
  },
  extra: (ctx) => {
    // aufgeschlagenes Buch vor dem Bauch
    poly(ctx, [[-8, -15], [0, -13.5], [8, -15], [8, -7], [0, -5.5], [-8, -7]], '#7a2a22');
    poly(ctx, [[-7, -14.2], [-0.6, -12.8], [-0.6, -6.6], [-7, -7.8]], '#f4ecd8');
    poly(ctx, [[0.6, -12.8], [7, -14.2], [7, -7.8], [0.6, -6.6]], '#ece2cb');
    stroke(ctx, '#a8997c', 0.6, [[-5.5, -12], [-2, -11.2]]);
    stroke(ctx, '#a8997c', 0.6, [[-5.5, -10], [-2, -9.2]]);
    stroke(ctx, '#a8997c', 0.6, [[2, -11.2], [5.5, -12]]);
    stroke(ctx, '#a8997c', 0.6, [[2, -9.2], [5.5, -10]]);
  }
});
NPC3[RATGEBER.id] = {
  skin: '#ecc9a5', robe: '#245e7a', torso: '#245e7a', sleeve: '#245e7a', pants: '#24303a', boots: '#2a2420',
  hemTrim: '#e0c36a', cuff: '#e0c36a', collar: '#e0c36a', wideSleeves: true, female: true,
  hair: { style: 2, color: '#5a3220' }, band: '#e0c36a', sash: '#e0c36a', belt: '#6b4a2e', beads: '#7fd6ff', earrings: '#e0c36a',
  weapon: { kind: 'rod', tier: 2 }, eyeShape: 2
};
NPC_TALK_LABEL[RATGEBER.id] = 'Fragen';
NPC_LINES[RATGEBER.id] = ['Frag mich ruhig – dafür bin ich da.'];

// „?“ über dem Kopf: groß, hellblau, leicht schwebend (statt Plakette und Questzeichen)
const _rgDrawNpcMarks = drawNpcMarks;
drawNpcMarks = function (ctx, n) {
  if (!n || n.id !== RATGEBER.id) return _rgDrawNpcMarks(ctx, n);
  const fy = feetY(n);
  const t = game.time;
  const bob = Math.sin(t * 2.6) * 2.2;
  const x = n.x;
  const y = fy - 62 + bob;
  glow(ctx, x, y - 9, 19 + Math.sin(t * 3.1) * 1.5, RATGEBER.glow, 0.5);
  ctx.save();
  ctx.font = '900 30px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0e1a2a';
  ctx.strokeText('?', x, y);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#e0c36a';
  ctx.strokeText('?', x, y);
  ctx.fillStyle = RATGEBER.mark;
  ctx.fillText('?', x, y);
  ctx.restore();
};
// auf der kleinen und großen Karte ebenfalls ein „?“ (karte.js zeichnet es mit questGlyph)
const _rgQuestMarkChar = questMarkChar;
questMarkChar = function (n) {
  if (n && n.id === RATGEBER.id) return { ch: '?', color: RATGEBER.mark };
  return _rgQuestMarkChar(n);
};

// --- Suche -----------------------------------------------------------------------------------------------------
// Text für die Suche: klein, Umlaute als ae/oe/ue/ss, ohne HTML und Satzzeichen (das „+“ bleibt für „+20“)
function rgNorm(s) {
  return String(s == null ? '' : s).toLowerCase()
    .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// Füllwörter zählen wenig und müssen nicht vorkommen
const RG_STOP = new Set(('ich du er sie es wir ihr man mich mir dich dir mein meine meinen meinem meiner dein deine was wie wo wann wer warum wieso weshalb welche welcher welches ' +
  'kann koennen muss muessen soll sollte sollen darf will moechte ist sind bin war gibt geht hat habe haben wird werden der die das den dem des ein eine einen einem einer ' +
  'und oder aber auch noch schon nur mal denn doch ja nein nicht kein keine im in am an auf aus bei mit nach von vor zu zum zur fuer ueber unter um als wenn dass so ' +
  'bekomme bekommt bekommen finde findet finden bitte hallo hi hey gut gute besten genau eigentlich').split(' '));
// Füllwort, auch mit kleinem Tippfehler („bekome“ statt „bekomme“, ab 5 Buchstaben)
const RG_STOP_LONG = [...RG_STOP].filter((w) => w.length >= 5);
function rgStop(w) {
  return RG_STOP.has(w) || (w.length >= 5 && RG_STOP_LONG.some((s) => rgLev(w, s, 1) <= 1));
}
// Andere Wörter für dasselbe (normalisiert)
const RG_SYN = {
  noob: ['anfaenger', 'neu'], noobs: ['anfaenger', 'neu'], newbie: ['anfaenger', 'neu'], neuling: ['anfaenger', 'neu'], anfaenger: ['neu', 'anfang'],
  lvl: ['stufe', 'level'], level: ['stufe'], lv: ['stufe'], leveln: ['stufe', 'erfahrung'], aufleveln: ['stufe', 'erfahrung'],
  skill: ['fertigkeit', 'fertigkeiten'], skills: ['fertigkeiten', 'fertigkeit'], skillen: ['statuspunkte', 'fertigkeiten'],
  item: ['ausruestung', 'gegenstand'], items: ['ausruestung', 'gegenstand'], gear: ['ausruestung'], equipment: ['ausruestung'], equip: ['ausruestung'],
  upgrade: ['aufwerten', 'schmied'], upgraden: ['aufwerten', 'schmied'], verbessern: ['aufwerten', 'schmied'], schmieden: ['schmied', 'aufwerten'],
  reiten: ['pferd'], reittier: ['pferd'], mount: ['pferd'], ross: ['pferd', 'kriegsross'], horse: ['pferd'],
  pvp: ['turnierarena', 'rangkampf'], ranked: ['rangkampf', 'rang'],
  geld: ['gold'], money: ['gold'], kohle: ['gold'],
  tastatur: ['tasten'], keyboard: ['tasten', 'tastatur'], keys: ['tasten'], hotkey: ['tasten'], hotkeys: ['tasten'], tastenbelegung: ['tasten', 'belegung'],
  handy: ['touch', 'mobil'], smartphone: ['handy'], iphone: ['handy'], android: ['handy'], tablet: ['handy'], mobile: ['handy'], ipad: ['handy'],
  ep: ['erfahrung'], xp: ['erfahrung'], exp: ['erfahrung'],
  guild: ['gilde'], clan: ['gilde'], party: ['gruppe'], team: ['gruppe'], lfg: ['gruppenfinder'],
  raid: ['endboss'], bosse: ['boss', 'endboss'], instance: ['instanz'],
  stats: ['statuspunkte'], attribute: ['statuspunkte'], punkte: ['statuspunkte', 'fertigkeitspunkt'],
  sterben: ['tod'], tot: ['tod'], gestorben: ['tod'], stirbt: ['tod'], sterbe: ['tod'],
  account: ['konto'], login: ['konto', 'anmelden'], einloggen: ['konto', 'anmelden'], registrieren: ['konto'],
  quest: ['auftrag', 'quests'], mission: ['auftrag', 'quest'], auftrag: ['quest'], auftraege: ['quests', 'auftrag'],
  sinn: ['ziel'], zweck: ['sinn'], worum: ['sinn'],
  map: ['karte', 'maps'], karte: ['map'], gebiet: ['map', 'karte'], gebiete: ['maps'],
  teleport: ['reisen', 'weltentor'], portal: ['weltentor'], tor: ['weltentor'],
  bag: ['tasche', 'inventar'], inventar: ['tasche'], rucksack: ['tasche', 'inventar'], inventory: ['tasche', 'inventar'],
  bank: ['lager'], shop: ['haendler', 'kaufen'], laden: ['haendler', 'kaufen'],
  trank: ['traenke'], potion: ['traenke', 'trank'], potions: ['traenke'], heiltrank: ['traenke'],
  // seit 14.1: Fertigkeitsbuch (E), Schriftrolle (H), Seelenstein als Gegenstand (L, V)
  buch: ['fertigkeitsbuch'], buecher: ['fertigkeitsbuch'], book: ['fertigkeitsbuch'], skillbuch: ['fertigkeitsbuch'],
  fertigkeitsschriftrolle: ['fertigkeitsbuch', 'schriftrolle'], scroll: ['schriftrolle'], rolle: ['schriftrolle'],
  heroisch: ['schriftrolle', 'rang'], legendaer: ['seelenstein', 'rang'], vollendet: ['seelenstein', 'rang'],
  heiler: ['heilung'], dps: ['schaden'],
  einstellung: ['einstellungen'], optionen: ['einstellungen'], settings: ['einstellungen'], menue: ['einstellungen'],
  sound: ['audio', 'ton'], musik: ['audio'], lautstaerke: ['audio', 'ton'],
  englisch: ['sprache'], english: ['sprache'], language: ['sprache'],
  kaputt: ['zerbrechen', 'bruch'], zerbrochen: ['zerbrechen'], broken: ['zerbrechen'], weg: ['zerbrechen', 'verloren'],
  daily: ['tagesbelohnung'], geschenk: ['tagesbelohnung'],
  chatten: ['chat'], schreiben: ['chat'],
  laggt: ['ruckelt'], lag: ['ruckelt'], langsam: ['ruckelt'], fps: ['ruckelt', 'bildrate']
};

// Levenshtein-Abstand, bricht ab, sobald er größer als max wird
function rgLev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < low) low = cur[j];
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// Wie gut passt ein Suchwort w zu einem Wort tok des Eintrags? 0 … 1
const _rgTokCache = new Map();
function rgTok(w, tok) {
  const key = w + '|' + tok;
  const c = _rgTokCache.get(key);
  if (c !== undefined) return c;
  let s = 0;
  if (tok === w) s = 1;
  else if (w.length >= 2 && tok.startsWith(w)) s = 0.8;                       // Wortanfang: „stat“ → statuspunkte
  else if (tok.length >= 4 && w.startsWith(tok) && w.length - tok.length <= 3) s = 0.7; // Endung: „pferde“ → pferd
  else if (w.length >= 4 && tok.includes(w)) s = 0.55;                        // Teilwort: „arena“ → pruefungsarena
  else if (w.length >= 4 && tok.length >= 4) {
    // Tippfehler: ein Fehler ab 4 Buchstaben, zwei ab 8 (am Wortanfang oder im ganzen Wort)
    const max = w.length >= 8 ? 2 : 1;
    if (rgLev(w, tok, max) <= max || (tok.length > w.length && rgLev(w, tok.slice(0, w.length), max) <= max)) s = 0.45;
  }
  if (_rgTokCache.size > 30000) _rgTokCache.clear();
  _rgTokCache.set(key, s);
  return s;
}
// Bestes Ergebnis eines Suchworts in einem Eintrag: Frage zählt am meisten, dann Stichwörter, Thema und Antwort
const RG_FIELD = [['qT', 10], ['kT', 9], ['cT', 5], ['aT', 3.5]];
function rgWord(w, it) {
  let best = 0;
  for (const [f, base] of RG_FIELD) {
    for (const tok of it[f]) {
      const s = rgTok(w, tok) * base;
      if (s > best) best = s;
    }
    if (best >= base) break;
  }
  return best;
}

// Alle Einträge mit fertigem Text und Wortlisten (bei jedem Öffnen neu: Namen und Tasten können sich ändern)
let rgItems = [];
function rgBuildIndex() {
  const cats = Object.fromEntries(RATGEBER_KATEGORIEN.map((c) => [c.id, c]));
  rgItems = RATGEBER_WISSEN.map((e, i) => {
    let a;
    try {
      a = rgFill(typeof e.a === 'function' ? e.a() : e.a);
    } catch (err) {
      // eine Zahl aus dem Spiel fehlt (umbenannt?) – dann wenigstens der Weg ins Wiki
      console.warn('Ratgeberin: Antwort nicht lesbar', e.q, err);
      a = 'Dazu steht alles im Wiki (Knopf ganz unten).';
    }
    const q = rgFill(e.q);
    const cat = cats[e.c] || RATGEBER_KATEGORIEN[0];
    const uniq = (s) => [...new Set(rgNorm(s).split(' ').filter(Boolean))];
    return {
      i, e, q, a, cat,
      qn: rgNorm(q), kn: rgNorm(e.k),
      qT: uniq(q), kT: uniq(e.k), cT: uniq(cat.name), aT: uniq(a)
    };
  });
}
// Treffer zur Eingabe, beste zuerst
function rgSearch(text) {
  const qn = rgNorm(text);
  let words = qn.split(' ').filter(Boolean);
  if (!words.length) return [];
  const stops = words.map(rgStop);
  const need = words.filter((w, k) => !stops[k]);
  const all = !need.length; // nur Füllwörter („was“): dann zählen sie normal
  const out = [];
  for (const it of rgItems) {
    let sum = 0;
    let hit = 0;
    for (let k = 0; k < words.length; k++) {
      const w = words[k];
      const stop = !all && stops[k];
      let s = rgWord(w, it);
      // „+20“ findet auch „20“
      if (w.length > 1 && w[0] === '+') s = Math.max(s, rgWord(w.slice(1), it) * 0.9);
      if (!stop && s < 9 && RG_SYN[w]) for (const alt of RG_SYN[w]) s = Math.max(s, rgWord(alt, it) * 0.85);
      if (s > 0 && !stop) hit++;
      sum += s * (stop ? 0.3 : 1);
    }
    const n = all ? words.length : need.length;
    if (!hit) continue;
    const cov = hit / n;
    let score = sum * (0.3 + 0.7 * cov * cov);
    // ganze Eingabe am Stück in Frage oder Stichwörtern
    if (qn.length >= 4 && it.qn.includes(qn)) score += 14;
    else if (qn.length >= 4 && it.kn.includes(qn)) score += 10;
    score += (it.e.p || 0) * 0.4;
    if (score >= 4) out.push([score, it]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1].i - b[1].i);
  if (!out.length) return [];
  // weit abgeschlagene Treffer weglassen
  const top = out[0][0];
  return out.filter((x) => x[0] >= top * 0.22).slice(0, RATGEBER.maxHits).map((x) => x[1]);
}
// Suchwörter in der Frage hervorheben (Wort für Wort, mit derselben Toleranz wie die Suche)
function rgMark(text, words) {
  if (!words.length) return rgEsc(text);
  return String(text).split(/([A-Za-zÄÖÜäöüßéè0-9+]+)/).map((part, k) => {
    if (k % 2 === 0) return rgEsc(part);
    const n = rgNorm(part);
    const hit = words.some((w) => rgTok(w, n) >= 0.45 || (RG_SYN[w] || []).some((alt) => rgTok(alt, n) >= 0.55));
    return hit ? `<mark>${rgEsc(part)}</mark>` : rgEsc(part);
  }).join('');
}

// --- Fenster ---------------------------------------------------------------------------------------------------
const RG = { q: '', cat: '', timer: 0 };
const rgDe = () => typeof i18n === 'undefined' || i18n.lang === 'de';
const rgIntro = () => `„Hallo! Ich bin ${RATGEBER.short} und helfe allen, die neu hier sind. Tipp einfach deine Frage ein – oder wähl ein Thema.“`;
const RG_TXT = {
  placeholder: 'Frage oder Stichwort, z. B. Pferd, Schmied, Statuspunkte …',
  start: 'Übersicht',
  steps: 'Erste Schritte',
  done: (a, b) => `${a} von ${b} erledigt`,
  faq: 'Häufige Fragen',
  hits: 'passende Antworten',
  hit1: 'passende Antwort',
  none: 'Dazu weiß ich leider nichts.',
  noneHint: 'Versuch ein anderes Wort oder schau im Wiki nach.',
  wiki: 'Wenn du noch mehr Hilfe brauchst oder etwas suchst: Im Wiki steht alles zum Nachschlagen – mit eigener Suche.',
  wikiBtn: '📖 Wiki öffnen',
  onlyDe: 'Die Antworten gibt es bisher nur auf Deutsch.',
  clear: 'Suche löschen',
  topics: 'Themen'
};

// Fenster öffnen (beim Ansprechen, aus der Hilfe, dem Questfenster oder dem Hinweis nach dem Start)
function rgOpen() {
  ui.closePanels();
  rgCss();
  // das Fenster des Turniermeisters nicht mehr nachzeichnen lassen (pvpRefreshNpc, turnierarena.js)
  if (typeof pvpState !== 'undefined') pvpState.npcOpen = null;
  game.openNpcRef = null;
  RG.q = '';
  RG.cat = '';
  rgBuildIndex();
  const panel = $('panelNpc');
  panel.classList.add('rg-panel');
  $('npcTitle').textContent = RATGEBER.name;
  const qb = $('npcQuests');
  if (qb) { qb.hidden = true; qb.innerHTML = ''; }
  const body = $('npcBody');
  body.innerHTML =
    `<div class="rg-top">` +
    `<p class="rg-intro"><span class="rg-badge" aria-hidden="true">?</span><span>${rgEsc(rgIntro())}</span></p>` +
    `<div class="rg-search"><span class="rg-lupe" aria-hidden="true">⌕</span>` +
    `<input id="rgQ" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${rgEsc(RG_TXT.placeholder)}" aria-label="${rgEsc(RG_TXT.placeholder)}">` +
    `<button type="button" class="rg-x" hidden aria-label="${rgEsc(RG_TXT.clear)}" title="${rgEsc(RG_TXT.clear)}">×</button></div></div>` +
    `<nav class="rg-side" aria-label="${rgEsc(RG_TXT.topics)}">` +
    `<button type="button" class="rg-cat" data-cat=""><span aria-hidden="true">⌂</span>${rgEsc(RG_TXT.start)}</button>` +
    RATGEBER_KATEGORIEN.map((c) => `<button type="button" class="rg-cat" data-cat="${c.id}"><span aria-hidden="true">${c.icon}</span>${rgEsc(c.name)}</button>`).join('') +
    `</nav><div class="rg-main" id="rgMain"></div>`;
  const inp = body.querySelector('#rgQ');
  const x = body.querySelector('.rg-x');
  inp.addEventListener('input', () => {
    RG.q = inp.value;
    x.hidden = !RG.q;
    if (RG.q.trim()) RG.cat = '';
    // kurz warten, falls schnell weitergetippt wird
    clearTimeout(RG.timer);
    RG.timer = setTimeout(rgRender, 60);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (inp.value) { inp.value = ''; RG.q = ''; x.hidden = true; rgRender(); } else ui.closePanels();
    } else if (e.key === 'Enter') {
      // Enter: erste Antwort aufklappen, Tastatur am Handy einklappen
      clearTimeout(RG.timer);
      rgRender();
      const first = $('rgMain').querySelector('details');
      if (first) first.open = true;
      if (input && input.touchUi) inp.blur();
    }
  });
  x.addEventListener('click', () => {
    inp.value = '';
    RG.q = '';
    x.hidden = true;
    rgRender();
    if (!(input && input.touchUi)) inp.focus();
  });
  body.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    RG.cat = b.dataset.cat;
    RG.q = '';
    inp.value = '';
    x.hidden = true;
    rgRender();
    $('rgMain').scrollTop = 0;
  }));
  rgRender();
  panel.hidden = false;
  // am PC gleich lostippen; am Handy nicht (sonst schiebt sich die Tastatur sofort über das Fenster)
  if (!(input && input.touchUi)) setTimeout(() => { if (!panel.hidden) inp.focus({ preventScroll: true }); }, 30);
}

function rgItemHtml(it, words, open) {
  return `<details class="rg-item"${open ? ' open' : ''}><summary><span class="rg-q">${rgMark(it.q, words)}</span>` +
    `<span class="rg-tag">${it.cat.icon} ${rgEsc(it.cat.name)}</span></summary><div class="rg-a">${it.a}</div></details>`;
}
function rgStepsHtml() {
  const p = game.player;
  let q = null;
  try { q = typeof questState === 'function' ? questState() : null; } catch (e) { q = null; }
  const rows = RATGEBER_SCHRITTE.map((s) => {
    let done = false;
    try { done = !!(p && s.done && s.done(p, q)); } catch (e) { done = false; }
    return { s, done };
  });
  const n = rows.filter((r) => r.done).length;
  const next = rows.findIndex((r) => !r.done);
  return `<section class="rg-steps"><h3>${rgEsc(RG_TXT.steps)} <small>${rgEsc(RG_TXT.done(n, rows.length))}</small></h3><ol>` +
    rows.map((r, k) => `<li class="${r.done ? 'done' : k === next ? 'next' : ''}"><span class="rg-num" aria-hidden="true">${r.done ? '✓' : k + 1}</span>` +
      `<span class="rg-step"><b>${rgEsc(r.s.t)}</b><span class="rg-st no-tr">${rgFill(r.s.a)}</span></span></li>`).join('') +
    `</ol></section>`;
}
function rgWikiHtml() {
  return `<div class="rg-wiki"><p>${rgEsc(RG_TXT.wiki)}</p><a class="btn btn-ghost" href="wiki/" target="_blank" rel="noopener">${rgEsc(RG_TXT.wikiBtn)}</a></div>`;
}
function rgRender() {
  const main = $('rgMain');
  if (!main) return;
  const body = $('npcBody');
  body.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('on', !RG.q.trim() && b.dataset.cat === RG.cat));
  const lang = rgDe() ? '' : `<p class="hint-text">${rgEsc(RG_TXT.onlyDe)}</p>`;
  const list = (items, words, openFirst, cls = '') => `<div class="rg-list${cls}${rgDe() ? '' : ' no-tr'}">` + items.map((it, k) => rgItemHtml(it, words, openFirst && k === 0)).join('') + `</div>`;
  let html;
  const text = RG.q.trim();
  if (text) {
    const hits = rgSearch(text);
    const words = rgNorm(text).split(' ').filter((w) => w && !rgStop(w));
    html = hits.length
      ? `<p class="rg-count"><b>${hits.length}</b> <span>${rgEsc(hits.length === 1 ? RG_TXT.hit1 : RG_TXT.hits)}</span></p>` + lang + list(hits, words, true)
      : `<div class="rg-none"><p><b>${rgEsc(RG_TXT.none)}</b></p><p class="hint-text">${rgEsc(RG_TXT.noneHint)}</p></div>`;
  } else if (RG.cat) {
    const c = RATGEBER_KATEGORIEN.find((x) => x.id === RG.cat) || RATGEBER_KATEGORIEN[0];
    const items = rgItems.filter((it) => it.e.c === c.id);
    // im Thema selbst ohne Themen-Schild an jeder Frage
    html = (c.id === 'start' ? rgStepsHtml() : '') + `<h3 class="rg-h">${c.icon} ${rgEsc(c.name)}</h3>` + lang + list(items, [], false, ' rg-one');
  } else {
    const faq = RATGEBER_HAEUFIG.map((q) => rgItems.find((it) => it.e.q === q)).filter(Boolean);
    html = rgStepsHtml() + `<h3 class="rg-h">${rgEsc(RG_TXT.faq)}</h3>` + lang + list(faq, [], false);
  }
  main.innerHTML = html + rgWikiHtml();
}

// Ins NPC-Fenster einhängen (nach Arena und Turnierarena, die ui.openNpc ebenso umhüllen)
const _rgOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  $('panelNpc').classList.remove('rg-panel');
  if (npc && npc.id === RATGEBER.id) {
    rgOpen();
    return;
  }
  return _rgOpenNpc.call(this, npc);
};
const _rgClosePanels = ui.closePanels;
ui.closePanels = function () {
  const r = _rgClosePanels.apply(this, arguments);
  const el = $('panelNpc');
  if (el) el.classList.remove('rg-panel');
  return r;
};

// --- Hinweise für Neue -----------------------------------------------------------------------------------------
if (!SAVE_FIELDS.includes('ratgeber')) SAVE_FIELDS.push('ratgeber');
const rgWelcomeText = () => `❓ Fragen? Sprich mit ${RATGEBER.name} in der Stadtmitte von Vlotho (blaues „?“ über dem Kopf). Sie erklärt dir, was du am Anfang tun solltest, und beantwortet alle Fragen.`;
// einmal je Charakter, nur Stufe 1–5, kurz nach dem Start: ein Hinweis oben in der Mitte (wie eine Einladung, mit
// „Fragen“ und ×, verschwindet nach 15 Sekunden) und dieselbe Zeile im Reiter System des Chats zum Nachlesen
function rgWelcome() {
  const p = game.player;
  if (!p || !game.running || p.ratgeber || p.level > RATGEBER.newbieLevel) return;
  p.ratgeber = 1;
  ui.log(rgWelcomeText(), 'info');
  const box = $('inviteToasts');
  if (!box) return;
  rgCss();
  const row = document.createElement('div');
  row.className = 'invite rg-toast';
  row.innerHTML = `<span class="rg-badge" aria-hidden="true">?</span><span>${rgEsc(rgWelcomeText().replace(/^❓ /, ''))}</span>` +
    `<button type="button" class="mini-btn primary" data-rgopen>${rgEsc(RG_TXT.askBtn)}</button><button type="button" class="mini-btn" data-rgclose aria-label="${rgEsc(RG_TXT.close)}">×</button>`;
  const done = () => row.remove();
  row.querySelector('[data-rgopen]').addEventListener('click', () => { done(); rgOpen(); });
  row.querySelector('[data-rgclose]').addEventListener('click', done);
  box.append(row);
  setTimeout(done, 15000);
}
const _rgEnterGame = ui.enterGame;
ui.enterGame = function () {
  const r = _rgEnterGame.apply(this, arguments);
  setTimeout(rgWelcome, 2500);
  return r;
};
// Questfenster (Taste L): oben ein Hinweis mit Knopf, solange man neu ist
const rgQuestHint = () => `Neu hier? ${RATGEBER.name} in der Stadtmitte von Vlotho beantwortet alle Fragen – auch, was du am Anfang tun solltest.`;
if (typeof renderQuestWindow === 'function') {
  const _rgRenderQuestWindow = renderQuestWindow;
  renderQuestWindow = function () {
    const r = _rgRenderQuestWindow.apply(this, arguments);
    const body = $('questBody');
    const p = game.player;
    if (body && p && p.level <= RATGEBER.newbieLevel) {
      rgCss();
      body.insertAdjacentHTML('afterbegin', `<div class="rg-hint"><span class="rg-badge" aria-hidden="true">?</span><span>${rgEsc(rgQuestHint())}</span>` +
        `<button type="button" class="mini-btn" data-rgopen>${rgEsc(RG_TXT.askBtn)}</button></div>`);
      body.querySelector('[data-rgopen]').addEventListener('click', () => rgOpen());
    }
    return r;
  };
}
RG_TXT.askBtn = 'Fragen';
RG_TXT.close = 'Schließen';
RG_TXT.helpBtn = `❓ ${RATGEBER.name} fragen`;
RG_TXT.help = `Steht in der Stadtmitte von Vlotho (blaues „?“ über dem Kopf) und beantwortet Fragen mit Suche – Steuerung, Klassen, Schmied, Pferd, Gilde und mehr.`;
// Hilfe (H): Knopf unter dem Wiki-Verweis, öffnet das Fenster direkt
document.addEventListener('DOMContentLoaded', () => {
  const wiki = document.querySelector('#panelHelp .help-wiki');
  if (!wiki || document.querySelector('#panelHelp .rg-help')) return;
  wiki.insertAdjacentHTML('afterend', `<p class="help-wiki rg-help"><button type="button" class="btn btn-ghost" data-rgopen>${rgEsc(RG_TXT.helpBtn)}</button> <span>${rgEsc(RG_TXT.help)}</span></p>`);
  const b = document.querySelector('#panelHelp [data-rgopen]');
  if (b) b.addEventListener('click', () => { if (game.running) rgOpen(); });
});

// --- Aussehen des Fensters -------------------------------------------------------------------------------------
function rgCss() {
  if (document.getElementById('rgCss')) return;
  const st = document.createElement('style');
  st.id = 'rgCss';
  st.textContent = `
#panelNpc.rg-panel { width: min(820px, calc(100vw - 24px)); height: min(660px, calc(100% - 40px)); }
#panelNpc.rg-panel #npcBody { flex: 1 1 auto; min-height: 0; overflow: hidden; padding: 0; gap: 0; display: grid;
  grid-template-columns: minmax(150px, 200px) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
.rg-top { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; padding: 10px 14px; border-bottom: 1px solid rgba(110, 90, 52, 0.55); }
.rg-intro { display: flex; align-items: center; gap: 10px; margin: 0; color: var(--parchment); font-size: 14px; line-height: 1.35; }
.rg-badge { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font: 900 20px/1 "Alegreya Sans", sans-serif;
  color: #0e1a2a; background: radial-gradient(circle at 40% 35%, #c8f0ff, #7fd6ff 55%, #3aa8ff); border: 2px solid #e0c36a; box-shadow: 0 0 10px rgba(58, 168, 255, 0.55); }
.rg-search { position: relative; display: flex; align-items: center; }
.rg-search input { flex: 1; min-width: 0; font: 16px var(--font-body); color: var(--parchment); background: rgba(0, 0, 0, 0.35); border: 1px solid var(--brass-dim);
  border-radius: 8px; padding: 10px 40px 10px 36px; outline: none; -webkit-appearance: none; appearance: none; }
.rg-search input:focus { border-color: #7fd6ff; box-shadow: 0 0 0 2px rgba(127, 214, 255, 0.2); }
.rg-search input::-webkit-search-cancel-button { display: none; }
.rg-lupe { position: absolute; left: 11px; color: var(--muted); font-size: 20px; pointer-events: none; }
.rg-x { position: absolute; right: 2px; width: 40px; height: 40px; border: 0; background: none; color: var(--muted); font-size: 24px; cursor: pointer; border-radius: 50%; }
.rg-x:hover { color: var(--parchment); }
.rg-side { overflow-y: auto; display: flex; flex-direction: column; gap: 3px; padding: 10px 8px 12px 10px; border-right: 1px solid rgba(110, 90, 52, 0.4); overscroll-behavior: contain; }
.rg-cat { display: flex; align-items: center; gap: 8px; text-align: left; padding: 7px 9px; border-radius: 6px; border: 1px solid transparent; background: none;
  color: var(--parchment); font: 600 13.5px/1.2 var(--font-body); cursor: pointer; }
.rg-cat span { flex: none; width: 20px; text-align: center; color: var(--brass); }
.rg-cat:hover { background: rgba(255, 255, 255, 0.05); }
.rg-cat.on { background: rgba(127, 214, 255, 0.12); border-color: rgba(127, 214, 255, 0.5); color: #e8f7ff; }
.rg-main { overflow-y: auto; padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
.rg-h { margin: 4px 0 0 !important; }
.rg-count { margin: 0; color: var(--muted); font-size: 13px; }
.rg-count b { color: #7fd6ff; }
.rg-list { display: flex; flex-direction: column; gap: 6px; }
.rg-item { border-radius: 7px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(110, 90, 52, 0.35); }
.rg-item[open] { border-color: rgba(201, 163, 90, 0.6); background: rgba(0, 0, 0, 0.32); }
.rg-item summary { list-style: none; display: flex; align-items: baseline; gap: 10px; padding: 9px 12px; cursor: pointer; }
.rg-item summary::-webkit-details-marker { display: none; }
.rg-item summary::before { content: '›'; flex: none; color: var(--brass); font-weight: 900; transition: transform 0.15s; }
.rg-item[open] summary::before { transform: rotate(90deg); }
.rg-q { flex: 1; font-weight: 700; color: var(--parchment); }
.rg-q mark { background: rgba(127, 214, 255, 0.22); color: #e8f7ff; border-radius: 3px; padding: 0 1px; }
.rg-tag { flex: none; font-size: 11.5px; color: var(--muted); white-space: nowrap; }
.rg-one .rg-tag { display: none; }
.rg-a { padding: 0 12px 11px 30px; color: #e2d8bf; line-height: 1.45; font-size: 14.5px; }
.rg-a ul { margin: 6px 0 0; padding-left: 18px; display: grid; gap: 3px; }
.rg-a .rg-keys { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); list-style: none; padding-left: 0; gap: 4px 12px; }
.rg-a kbd, .rg-st kbd { display: inline-block; min-width: 1.5em; padding: 0 5px; margin-right: 3px; border-radius: 4px; border: 1px solid var(--brass-dim);
  background: var(--lacquer-2); font: 700 12px/1.6 var(--font-body); text-align: center; color: var(--parchment); }
.rg-steps h3 { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.rg-steps ol { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
.rg-steps li { display: flex; gap: 10px; align-items: flex-start; padding: 7px 10px; border-radius: 7px; background: rgba(0, 0, 0, 0.22); border: 1px solid rgba(110, 90, 52, 0.3); }
.rg-steps li.next { border-color: rgba(127, 214, 255, 0.55); background: rgba(127, 214, 255, 0.07); }
.rg-steps li.done { opacity: 0.72; }
.rg-num { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-weight: 800; font-size: 13px;
  border: 1px solid var(--brass-dim); color: var(--brass); background: var(--lacquer-2); }
.rg-steps li.done .rg-num { background: #3f7a3a; border-color: #7ad36a; color: #fff; }
.rg-steps li.next .rg-num { border-color: #7fd6ff; color: #7fd6ff; }
.rg-step { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rg-st { color: #d8ccb0; font-size: 13.5px; line-height: 1.4; }
.rg-none { padding: 6px 2px; }
.rg-wiki { margin-top: 6px; padding: 12px; border-radius: 8px; border: 1px dashed rgba(201, 163, 90, 0.55); background: rgba(201, 163, 90, 0.06);
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; }
.rg-wiki p { flex: 1 1 260px; margin: 0; color: var(--parchment); font-size: 14px; }
.rg-wiki .btn { text-decoration: none; color: var(--parchment); border-color: var(--brass); white-space: nowrap; }
.rg-hint { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 8px; border-radius: 8px; border: 1px solid rgba(127, 214, 255, 0.45);
  background: rgba(127, 214, 255, 0.08); font-size: 13.5px; }
.rg-hint > span:nth-child(2) { flex: 1; }
.invite.rg-toast { width: min(560px, 86vw); box-shadow: 0 0 0 1px #0e1a2a, 0 0 0 2.5px #7fd6ff, 0 6px 14px rgba(0, 0, 0, 0.6); }
.invite.rg-toast > span:nth-child(2) { flex: 1; line-height: 1.35; }
.invite.rg-toast .rg-badge { width: 26px; height: 26px; font-size: 17px; }
@media (orientation: landscape) and (max-height: 520px) {
  #panelNpc.rg-panel { height: calc(100% - 16px); }
  #panelNpc.rg-panel .panel-head { padding: 4px 14px; }
  .rg-top { padding: 6px 12px; gap: 5px; flex-direction: row; align-items: center; }
  .rg-intro { flex: 0 1 46%; font-size: 12.5px; }
  .rg-intro .rg-badge { width: 26px; height: 26px; font-size: 17px; }
  .rg-search { flex: 1 1 54%; }
  .rg-search input { padding-top: 8px; padding-bottom: 8px; }
  .rg-side { padding: 6px 6px 8px 8px; }
  .rg-cat { padding: 6px 7px; font-size: 12.5px; }
  .rg-main { padding: 8px 12px 12px; }
  .rg-a { font-size: 14px; }
}
@media (max-width: 560px) {
  #panelNpc.rg-panel #npcBody { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr); }
  .rg-side { flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: 0; border-bottom: 1px solid rgba(110, 90, 52, 0.4); padding: 6px 10px; scrollbar-width: none; }
  .rg-side::-webkit-scrollbar { display: none; }
  .rg-cat { flex: none; white-space: nowrap; border-color: rgba(201, 163, 90, 0.3); }
  .rg-tag { display: none; }
}`;
  document.head.appendChild(st);
}

// --- Übersetzung der Oberfläche (Wissen bleibt deutsch) ------------------------------------------------------------
// Ergänzt die Wörterbücher (sprache.js) nur um fehlende Einträge; die übrigen Sprachen fallen auf Englisch zurück.
(function rgLang() {
  const D = window.LANG_DATA && window.LANG_DATA.en;
  if (!D) return;
  const add = (de, en) => { if (D[de] === undefined) D[de] = en; };
  add('Ratgeberin', 'Advisor');
  add('Fragen', 'Ask');
  add(rgIntro(), `“Hi! I'm ${RATGEBER.short} and I help everyone who is new here. Just type your question – or pick a topic.”`);
  add(RG_TXT.placeholder, 'Question or keyword, e.g. horse, blacksmith, stat points …');
  add(RG_TXT.start, 'Overview');
  add(RG_TXT.steps, 'First Steps');
  add('{0} von {1} erledigt', '{0} of {1} done');
  add(RG_TXT.faq, 'Frequently Asked Questions');
  add(RG_TXT.hits, 'matching answers');
  add(RG_TXT.hit1, 'matching answer');
  add(RG_TXT.none, "Sorry, I don't know anything about that.");
  add(RG_TXT.noneHint, 'Try another word or have a look in the wiki.');
  add(RG_TXT.wiki, 'If you need more help or are looking for something: the wiki has everything to look up – with its own search.');
  add(RG_TXT.wikiBtn, '📖 Open Wiki');
  add(RG_TXT.onlyDe, 'The answers are only available in German so far.');
  add(RG_TXT.clear, 'Clear search');
  add(RG_TXT.topics, 'Topics');
  add(RG_TXT.askBtn, 'Ask');
  add(RG_TXT.close, 'Close');
  add(rgWelcomeText().replace(/^❓ /, ''), `Questions? Talk to ${RATGEBER.name.replace(/^Ratgeberin /, 'Advisor ')} in the middle of Vlotho (blue “?” above her head). She explains what to do first and answers all your questions.`);
  add(RG_TXT.helpBtn, `❓ Ask ${RATGEBER.name.replace(/^Ratgeberin /, 'Advisor ')}`);
  add(RG_TXT.help, 'Stands in the middle of Vlotho (blue “?” above her head) and answers questions with a search – controls, classes, blacksmith, horse, guild and more.');
  add(rgWelcomeText(), `❓ Questions? Talk to ${RATGEBER.name.replace(/^Ratgeberin /, 'Advisor ')} in the middle of Vlotho (blue “?” above her head). She explains what to do first and answers all your questions.`);
  add(rgQuestHint(), `New here? ${RATGEBER.name.replace(/^Ratgeberin /, 'Advisor ')} in the middle of Vlotho answers all your questions – including what to do first.`);
  const CAT_EN = {
    start: 'First Steps', sinn: 'Point of the Game', steuerung: 'Controls PC & Mobile', kampf: 'Combat & Skills', klassen: 'Classes & Paths',
    ausruestung: 'Gear & Blacksmith', quests: 'Quests', steine: 'Soulstones', dungeons: 'Dungeons & End Bosses', karten: 'Maps & Travel',
    zusammen: 'Party, Guild & Trade', pvp: 'PvP Arena', pruefung: 'Trial Arena', pferd: 'Horse', konto: 'Account & Cloud', einstellungen: 'Settings'
  };
  for (const c of RATGEBER_KATEGORIEN) if (CAT_EN[c.id]) add(c.name, CAT_EN[c.id]);
  const STEP_EN = ['Accept the main quest', 'Hunt your first monsters', 'Spend stat points', 'Use and improve skills', 'Potions and better gear',
    'Upgrade at the blacksmith', 'Break Soulstones', 'Play together'];
  RATGEBER_SCHRITTE.forEach((s, k) => { if (STEP_EN[k]) add(s.t, STEP_EN[k]); });
})();
