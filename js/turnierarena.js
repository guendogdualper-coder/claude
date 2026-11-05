// Turnierarena (seit 13.86): Spieler gegen Spieler – reiner Spaß mit anderen Spielern im Kanal, ohne Gold und Beute
// (anders als die Prüfungsarena in herausforderung.js, die gegen Monster für Gold kämpft).
// - In jeder Stadt und jedem Lager steht neben dem Arenameister ein Turniermeister (welt.js, TOWN_PLACES 'pvp').
//   Sein Fenster zeigt alle Arten, wie viele Spieler je Art warten, und den eigenen Rang. „Anmelden“ stellt einen in die
//   Warteschlange, „Abmelden“ nimmt einen wieder heraus. Wer in einer Gruppe ist, kommt mit den Gruppenmitgliedern,
//   die sich für dieselbe Art anmelden, ins selbe Team.
// - Arten (PVP_MODES): Rangkampf 1 gegen 1, 2 gegen 2 und 3 gegen 3 (mehr gibt es im Rangkampf nicht) und die
//   Turmschlacht 4 gegen 4 ohne Rang.
//   · Rangkampf: Wer fällt, scheidet für die Runde aus (kein Wiederbeleben, man schaut zu). Das Team, das als letztes
//     steht, gewinnt. Sieg +50 Rangpunkte, Niederlage −25 (nie unter 0). Höchstens 5 Minuten, dann gewinnt, wer mehr
//     Kämpfer (und danach mehr Leben) übrig hat.
//   · Turmschlacht (Blau gegen Rot): Wer fällt, steht nach ein paar Sekunden in der kleinen Basis seines Teams wieder auf.
//     In der Mitte steht ein Turm in einem Kreis. Steht nur ein Team im Kreis, lädt es den Turm in seiner Farbe auf
//     (stehen beide drin, passiert nichts; steht keiner drin, sinkt er langsam). Bei 100 % gewinnt das Team, ebenso mit
//     100 Kills. Nach 15 Minuten gewinnt, wer mehr Kills hat. Ab zwei Spielern geht es los, weitere kommen dazu und
//     füllen das kleinere Team auf.
// - Jede Art hat ihre eigene Halle (PVP_DIM): Sandgrube (1 gegen 1, klein, achteckig), Frosthof (2 gegen 2, Eis und
//   Felsen), Glutkessel (3 gegen 3, Basalt mit zwei Lavabecken und drei Gassen) und Turmwiese (4 gegen 4, große Wiese
//   mit zwei Basen und dem Turm). Sie liegen wie die Prüfungsarena im Fels unter dem Dungeon-Streifen (unterhalb ihrer
//   Hallen), sind auf keiner Karte zu sehen und werden nach der Welt gebaut (pvpBuild über generateWorld).
// - Mehrspieler: Die Warteschlange und alle Spiele führt der Host des Kanals (auch der Welt-Wächter). Er stellt die
//   Teams zusammen, teilt eine Halle zu, schickt jedem Spieler den Start (pvm), Zwischenstände (pvu) und das Ende
//   (pve). Treffer gehen wie im Duell direkt an den Getroffenen (pvh); er rechnet sie mit seiner Verteidigung ab und
//   meldet seinen Fall dem Host (pvd). Nachrichten laufen über onSocial (k: 'pv…').
// - Gegner stehen als Stellvertreter (wie game.duel.proxy, mit pvp: true) in der Zielliste (pvpFoes, aliveEnemies in
//   kampf.js): Auto-Ziel, Tab, Flächenangriffe und Geschosse treffen nur Gegner, nie das eigene Team. Heilen der
//   Lichtkuppel wirkt auch auf das eigene Team. Diener kämpfen mit. Monster gibt es in den Hallen nicht.
// - Ein Fall in der Turnierarena kostet keine Erfahrung und kein Gold. Belohnung gibt es nur in Rangpunkten.
// - Rang (p.pvp im Spielstand, SAVE_FIELDS): eine gemeinsame Wertung für alle Rangkämpfe. Stufen: Bronze 0, Silber 200,
//   Gold 400, Platin 600, Diamant 800, Champion ab 1000.
// - Verlassen: Wer einen Rangkampf verlässt (Knopf, aus der Halle laufen, Spiel schließen), verliert ihn (−25). Dafür
//   steht beim Start ein offener Rangkampf im Spielstand (p.pvp.open), der beim nächsten Start als Niederlage zählt.
//   Wechselt der Host, bricht das Spiel ohne Wertung ab.

const PVP = {
  win: 50,              // Rangpunkte je Sieg
  loss: 25,             // Rangpunkte je Niederlage (nie unter 0) – eine Zahl zum Nachstellen
  minLevel: 10,         // ab dieser Stufe
  countdown: 5,         // Sekunden bis zum Kampf
  rankedTime: 300,      // Rangkampf: höchstens 5 Minuten
  funTime: 900,         // Turmschlacht: 15 Minuten
  funKills: 100,        // Turmschlacht: so viele Kills gewinnen
  funMin: 2,            // Turmschlacht beginnt ab zwei Spielern
  respawn: 6,           // Sekunden bis zum Wiedereinstieg (Turmschlacht)
  protect: 2,           // so lange geschützt nach dem Wiedereinstieg
  capTime: 60,          // Sekunden, die ein Spieler allein den Turm von 0 auf 100 % braucht
  capMore: 0.25,        // jeder weitere Spieler im Kreis lädt 25 % schneller
  capDecay: 0.5,        // Prozent je Sekunde, wenn niemand im Kreis steht
  capR: 5,              // Halbmesser des Kreises in Kacheln
  endShow: 25,          // so lange (s) bleibt man nach dem Ende in der Halle (Übersicht), dann geht es zurück
  hostGrace: 8,         // so lange (s) darf ein Spieler nach dem Start noch außerhalb der Halle stehen
  silent: 25,           // so lange (s) ohne Nachricht vom Host gilt das Spiel als abgebrochen
  gate: '#9fd0ff'       // Lichtsäule beim Hinein- und Herausgehen
};
// Rangstufen (Punkte ab): Farbe des Steins und dunkler Rand
const PVP_TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#c8803e', dark: '#5a3014' },
  { id: 'silber', name: 'Silber', min: 200, color: '#c8d2dc', dark: '#4a5664' },
  { id: 'gold', name: 'Gold', min: 400, color: '#f0c840', dark: '#6a4a08' },
  { id: 'platin', name: 'Platin', min: 600, color: '#6ad8c8', dark: '#1a5a52' },
  { id: 'diamant', name: 'Diamant', min: 800, color: '#7ab8ff', dark: '#1a3a7a' },
  { id: 'champion', name: 'Champion', min: 1000, color: '#e65aff', dark: '#4a1260' }
];
const pvpTier = (pts) => {
  let t = PVP_TIERS[0];
  for (const x of PVP_TIERS) if ((pts || 0) >= x.min) t = x;
  return t;
};
const PVP_TEAM = {
  A: { name: 'Blau', color: '#6ab4ff', bar: '#4a9aff', dark: '#1e3a6a', theme: '#3a4a6a|#9fc0ff|#4a8aff' },
  B: { name: 'Rot', color: '#ff7a6a', bar: '#ff5a4a', dark: '#6a1e1a', theme: '#6a3a3a|#ffb0a0|#ff4a3a' }
};
const PVP_MODES = {
  r1: { name: 'Rangkampf 1 gegen 1', short: '1 gegen 1', tag: '1v1', size: 1, ranked: true, slots: 4 },
  r2: { name: 'Rangkampf 2 gegen 2', short: '2 gegen 2', tag: '2v2', size: 2, ranked: true, slots: 2 },
  r3: { name: 'Rangkampf 3 gegen 3', short: '3 gegen 3', tag: '3v3', size: 3, ranked: true, slots: 2 },
  f4: { name: 'Turmschlacht 4 gegen 4', short: '4 gegen 4', tag: '4v4', size: 4, ranked: false, slots: 2 }
};
const PVP_MODE_IDS = Object.keys(PVP_MODES);

// --- Hallen ----------------------------------------------------------------------------------------------------
// Größe je Art in Kacheln (ungerade, damit die Mitte genau auf einer Kachel liegt): w/h ganzes Feld, hw/hh halbe Halle,
// spawnX Abstand der Startplätze von der Mitte, look Wand (oben|Vorderseite|Fugen), theme für Säulen und Banner,
// fire Farbe der Feuerbecken
const PVP_DIM = {
  r1: {
    w: 31, h: 25, hw: 12, hh: 9, spawnX: 9.5, name: 'Sandgrube', ground: 'SAND',
    wall: { top: '#5a3a2a', face: '#2e1c14', line: '#7a5038' }, theme: '#7a4a32|#e0a060|#ff8a3a', fire: '#ff9a4a',
    ambient: { kind: 'dust', tint: [70, 40, 20, 0.07] },
    mood: { sky: '#6a4a38', sun: '#ffd0a0', sunI: 0.8, hemi: '#f0d0b0', ground: '#5a3a28', hemiI: 0.64, near: 24, far: 56 }
  },
  r2: {
    w: 39, h: 29, hw: 16, hh: 11, spawnX: 13.5, name: 'Frosthof', ground: 'SNOW',
    wall: { top: '#5a6a7a', face: '#2a3440', line: '#8aa0b8' }, theme: '#4a5a6a|#9fc0d8|#7ad0ff', fire: '#7ad0ff',
    ambient: { kind: 'snow', tint: [180, 210, 240, 0.06] },
    mood: { sky: '#9ab8d8', sun: '#eef6ff', sunI: 0.88, hemi: '#e8f4ff', ground: '#7a90a8', hemiI: 0.7, near: 26, far: 60 }
  },
  r3: {
    w: 49, h: 35, hw: 21, hh: 14, spawnX: 18, name: 'Glutkessel', ground: 'BASALT',
    wall: { top: '#2e2426', face: '#140e10', line: '#c8502a' }, theme: '#3a2a2a|#ff6a3a|#ff5a2a', fire: '#ff6a3a',
    ambient: { kind: 'embers', tint: [120, 30, 10, 0.08] },
    mood: { sky: '#5a2a20', sun: '#ffb080', sunI: 0.78, hemi: '#ffb890', ground: '#3a1a14', hemiI: 0.58, near: 24, far: 56 }
  },
  f4: {
    // seit 13.89 größer (vorher 75 × 47, Basis 25 Kacheln von der Mitte): längerer Weg von der Basis zum Turm
    w: 99, h: 55, hw: 46, hh: 24, spawnX: 41.5, baseX: 37, name: 'Turmwiese', ground: 'GRASS',
    wall: { top: '#4a5a3a', face: '#26301e', line: '#6a7a50' }, theme: '#6a6a5a|#c9c0a0|#ffe08a', fire: '#ffc86a',
    ambient: { kind: 'pollen', tint: [255, 240, 200, 0.03] },
    mood: { sky: '#a8d8ee', sun: '#fff2d0', sunI: 0.98, hemi: '#e8f6ff', ground: '#6a8a40', hemiI: 0.64, near: 34, far: 72 }
  }
};
// Gebiete der Hallen (Name oben in der Ecke, Stimmung, Wandfarbe)
const PVP_ZONES = {};
for (const id of PVP_MODE_IDS) {
  const D = PVP_DIM[id];
  const z = { id: 'pvp_' + id, name: D.name, levels: 'Turnierarena · ' + PVP_MODES[id].short, ground: D.ground, ambient: D.ambient, wallLook: { wall: D.wall, id: 'pvp_' + id }, pvp: true };
  ZONES.push(z);
  PVP_ZONES[id] = { zone: z, zi: ZONES.length - 1 };
  if (typeof MOOD3 !== 'undefined') MOOD3[z.id] = D.mood;
}
// Lage aller Hallen: unter den Hallen der Prüfungsarena, eine Reihe je Art (Kacheln, cx/cy = Mitte einer Kachel)
const PVP_SLOTS = [];
(() => {
  const X0 = WORLD_W + 14;
  const rows = { r1: [X0, DUNGEON_H + 112, 35], r2: [X0 + 145, DUNGEON_H + 112, 43], r3: [X0, DUNGEON_H + 148, 53], f4: [X0, DUNGEON_H + 190, 103] };
  for (const id of PVP_MODE_IDS) {
    const D = PVP_DIM[id];
    const [x0, y0, step] = rows[id];
    for (let k = 0; k < PVP_MODES[id].slots; k++) {
      const x = x0 + k * step;
      PVP_SLOTS.push({ mode: id, k, x, y: y0, w: D.w, h: D.h, cx: x + D.w / 2, cy: y0 + D.h / 2 });
    }
  }
})();
const PVP_BOX = PVP_SLOTS.reduce((b, S) => ({ x0: Math.min(b.x0, S.x), y0: Math.min(b.y0, S.y), x1: Math.max(b.x1, S.x + S.w), y1: Math.max(b.y1, S.y + S.h) }), { x0: 1e9, y0: 1e9, x1: 0, y1: 0 });
// Halle, in der der Punkt (Pixel) liegt, sonst -1
function pvpSlotAt(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  if (tx < PVP_BOX.x0 || ty < PVP_BOX.y0 || tx >= PVP_BOX.x1 || ty >= PVP_BOX.y1) return -1;
  for (let s = 0; s < PVP_SLOTS.length; s++) {
    const S = PVP_SLOTS[s];
    if (tx >= S.x && ty >= S.y && tx < S.x + S.w && ty < S.y + S.h) return s;
  }
  return -1;
}
const pvpInside = (e) => !!e && pvpSlotAt(e.x, e.y) >= 0;
// Kachel (dx, dy ab der Mitte, ganze Zahlen) in der Halle? Jede Art mit eigener Form
function pvpInHall(mode, dx, dy) {
  const D = PVP_DIM[mode];
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > D.hw || ay > D.hh) return false;
  // Sandgrube: Achteck
  if (mode === 'r1') return ax + ay <= D.hw + D.hh - 4;
  // Frosthof: Rechteck mit kleinen runden Ecken; Glutkessel und Turmwiese mit größeren
  const k = mode === 'r2' ? 3 : 6;
  if (ax > D.hw - k && ay > D.hh - k) return Math.hypot(ax - (D.hw - k), ay - (D.hh - k)) <= k + 0.2;
  return true;
}
// Lavabecken im Glutkessel (zwei flache Ellipsen ober- und unterhalb der Mitte): dazwischen drei Gassen
const pvpLava = (dx, dy) => ((dx / 6.5) ** 2 + ((Math.abs(dy) - 6.5) / 2.4) ** 2) <= 1;
// Basis der Turmwiese: Platz an der West- (Blau) bzw. Ostwand, Mauer mit Tor zur Mitte (BX = Abstand der Mauer)
const PVP_BX = PVP_DIM.f4.baseX;
const pvpBaseIn = (dx, dy) => Math.abs(dx) >= PVP_BX + 1 && Math.abs(dy) <= 8;
const pvpBaseWall = (dx, dy) => (Math.abs(dx) === PVP_BX && Math.abs(dy) >= 3 && Math.abs(dy) <= 9) || (Math.abs(dy) === 9 && Math.abs(dx) >= PVP_BX);
// Deckung je Halle (Säulen p, Felsen r) in Kacheln ab der Mitte; alle Hallen sind links und rechts gleich (gerecht)
const PVP_COVER = {
  r1: { p: [[0, -3], [0, 3], [-6, -6], [6, 6], [-6, 6], [6, -6]], r: [] },
  r2: { p: [[0, -5], [0, 5], [-10, 0], [10, 0]], r: [[-7, -6], [-6, -6], [7, 6], [6, 6], [-7, 6], [-6, 6], [7, -6], [6, -6], [-3, 0], [3, 0]] },
  r3: { p: [[-7, -2], [7, 2], [-7, 2], [7, -2], [-13, -11], [13, 11], [-13, 11], [13, -11]], r: [[0, -11], [0, 11], [-15, 0], [15, 0]] },
  // seit 13.89 auf die größere Wiese verteilt: Deckung nahe am Turm, auf halbem Weg und vor den Basen
  f4: {
    p: [[-10, -12], [10, 12], [-10, 12], [10, -12], [-21, -3], [21, 3], [-21, 3], [21, -3], [-31, -12], [31, 12], [-31, 12], [31, -12]],
    r: [[-13, -6], [-14, -6], [13, 6], [14, 6], [-13, 6], [-14, 6], [13, -6], [14, -6], [-20, -15], [-20, -16], [20, 15], [20, 16], [-20, 15], [-20, 16], [20, -15], [20, -16],
      [-5, -17], [5, 17], [-5, 17], [5, -17], [-27, -6], [-28, -6], [27, 6], [28, 6], [-27, 6], [-28, 6], [27, -6], [28, -6], [-33, -19], [33, 19], [-33, 19], [33, -19]]
  }
};

function pvpBuild(w) {
  const P = (x, y) => ({ x: x * TILE, y: y * TILE });
  for (let s = 0; s < PVP_SLOTS.length; s++) {
    const S = PVP_SLOTS[s];
    const mode = S.mode;
    const D = PVP_DIM[mode];
    const zi = PVP_ZONES[mode].zi;
    const G = GROUND;
    for (let y = S.y; y < S.y + S.h; y++) {
      for (let x = S.x; x < S.x + S.w; x++) {
        const i = y * MAP_W + x;
        const dx = x + 0.5 - S.cx;
        const dy = y + 0.5 - S.cy;
        w.zoneIdx[i] = zi;
        w.deco[i] = DECO.NONE;
        if (!pvpInHall(mode, dx, dy)) {
          w.obj[i] = OBJ.CAVEWALL;
          w.ground[i] = G.CAVE;
          continue;
        }
        w.obj[i] = OBJ.NONE;
        const h = tileHash(x, y);
        let g;
        if (mode === 'r1') {
          // Sand in der Grube, außen ein Rand aus Steinplatten
          const e = (dx / 9.5) ** 2 + (dy / 7) ** 2;
          g = e <= 1 ? G.SAND : G.FLAGSTONE;
          if (e <= 1 && h % 11 === 0) w.deco[i] = DECO.PEBBLE;
        } else if (mode === 'r2') {
          // Eisfläche in der Mitte, Schnee außen, die Startplätze auf Platten
          g = Math.abs(dy) <= 4 && Math.abs(dx) <= 9 ? G.ICE : Math.abs(dx) >= 12 ? G.FLAGSTONE : G.SNOW;
          if (g === G.SNOW && h % 17 === 0) w.deco[i] = DECO.DRIFT;
        } else if (mode === 'r3') {
          g = pvpLava(dx, dy) ? G.LAVA : (h % 5 === 0 ? G.ASH : G.BASALT);
          if (Math.abs(dx) >= 16) g = G.FLAGSTONE;
          if (g === G.BASALT && h % 23 === 0) w.deco[i] = DECO.CRACK;
        } else {
          // Wiese mit Wegen von den Basen zur Mitte, Platten im Turmkreis und in den Basen
          const r = Math.hypot(dx, dy);
          g = h % 7 === 0 ? G.MEADOW : G.GRASS;
          if (Math.abs(dy) <= 1 && Math.abs(dx) >= PVP.capR + 1 && Math.abs(dx) < PVP_BX) g = G.PATH;
          if (r <= PVP.capR) g = G.PLAZA;
          if (pvpBaseIn(dx, dy)) g = G.FLAGSTONE;
          if (pvpBaseWall(dx, dy)) {
            w.obj[i] = OBJ.CAVEWALL;
            g = G.CAVE;
          }
          if ((g === G.GRASS || g === G.MEADOW) && h % 19 === 0) w.deco[i] = h % 2 ? DECO.TUFT : DECO.FLOWER_WHITE;
        }
        w.ground[i] = g;
      }
    }
    // Deckung: Säulen (blockieren, gezeichnet als Prop) und Felsen
    const C = PVP_COVER[mode];
    for (const [dx, dy] of C.p) {
      const tx = Math.floor(S.cx + dx);
      const ty = Math.floor(S.cy + dy);
      w.obj[ty * MAP_W + tx] = OBJ.PILLAR;
      w.props.push({ type: 'dpillar', roof: D.theme, ...P(tx + 0.5, ty + 0.75) });
    }
    for (const [dx, dy] of C.r) {
      const tx = Math.floor(S.cx + dx);
      const ty = Math.floor(S.cy + dy);
      w.obj[ty * MAP_W + tx] = OBJ.ROCK;
    }
    // Feuerbecken an den Wänden, Banner der Teams hinter den Startplätzen (Blau links, Rot rechts)
    const fires = mode === 'r1' ? [[-8, -6.5], [8, -6.5], [-8, 6.5], [8, 6.5], [-11, 0], [11, 0]]
      : mode === 'r2' ? [[-15, -9.5], [15, -9.5], [-15, 9.5], [15, 9.5], [0, -10.2], [0, 10.2]]
        : mode === 'r3' ? [[-19, -9], [19, -9], [-19, 9], [19, 9], [-9, -13], [9, -13], [-9, 13], [9, 13]]
          : [[-(PVP_BX - 1), -10.5], [PVP_BX - 1, -10.5], [-(PVP_BX - 1), 10.5], [PVP_BX - 1, 10.5], [-15, -(D.hh - 1)], [15, -(D.hh - 1)], [-15, D.hh - 1], [15, D.hh - 1], [0, -(D.hh - 1)], [0, D.hh - 1],
            [-28, -(D.hh - 1)], [28, -(D.hh - 1)], [-28, D.hh - 1], [28, D.hh - 1]];
    for (const [dx, dy] of fires) w.props.push({ type: 'brazier', roof: D.fire, ...P(S.cx + dx, S.cy + dy + 0.4) });
    const bx = mode === 'r1' ? 11.4 : mode === 'r2' ? 15.4 : mode === 'r3' ? 20.4 : D.hw - 0.6;
    for (const [side, team] of [[-1, 'A'], [1, 'B']]) {
      for (const dy of mode === 'r1' ? [-2.5, 2.5] : [-4, 4]) w.props.push({ type: 'dbanner', roof: PVP_TEAM[team].theme, ...P(S.cx + side * bx, S.cy + dy), rot: -side * Math.PI / 2 });
    }
    if (mode === 'f4') {
      // Turm in der Mitte (die Kachel darunter blockiert), Laternen rings um den Kreis, Feuer in Teamfarbe an den Basen
      const tx = Math.floor(S.cx);
      const ty = Math.floor(S.cy);
      w.obj[ty * MAP_W + tx] = OBJ.PILLAR;
      w.props.push({ type: 'pvptower', roof: D.theme, ...P(S.cx, S.cy + 0.3) });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        w.props.push({ type: 'lantern', ...P(S.cx + Math.cos(a) * (PVP.capR + 0.7), S.cy + Math.sin(a) * (PVP.capR + 0.7)) });
      }
      for (const [side, team] of [[-1, 'A'], [1, 'B']]) {
        for (const dy of [-7.2, 7.2]) w.props.push({ type: 'brazier', roof: PVP_TEAM[team].color, ...P(S.cx + side * (PVP_BX + 1.6), S.cy + dy) });
      }
    }
  }
}
const _pvpGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _pvpGenerateWorld();
  pvpBuild(w);
  return w;
};

// Startplatz eines Spielers (Team A links, B rechts), in Pixeln; i = Platz im Team
function pvpSpawnSpot(s, team, i) {
  const S = PVP_SLOTS[s];
  const D = PVP_DIM[S.mode];
  const side = team === 'A' ? -1 : 1;
  const offs = [0, -2.5, 2.5, -5, 5];
  const at = { x: (S.cx + side * D.spawnX) * TILE, y: (S.cy + offs[i % offs.length] * (S.mode === 'f4' ? 0.9 : 0.8)) * TILE };
  if (typeof canStand === 'function' && !canStand(at.x, at.y, 11, false) && typeof spotNear === 'function') return spotNear(at, 40);
  return at;
}
// Mitte des Turmkreises (Pixel)
const pvpTowerAt = (s) => ({ x: PVP_SLOTS[s].cx * TILE, y: PVP_SLOTS[s].cy * TILE });

// --- Turm der Turmwiese: fester Steinturm (Prop) und darüber der Kristall, der sich in der Teamfarbe füllt ---------
// Fester Teil in 3D (PROP3, gebacken) und 2D (PROP_ART, zwischengespeichert); der Kristall ändert sich ständig und
// steht darum als eigenes Modell in der Szene (pvpSync3) bzw. wird in 2D jedes Bild obendrauf gemalt (pvpDraw2d).
const PVP_TOWER_H = 2.9;   // Höhe der Turmspitze in 3D (Einheiten), darauf schwebt der Kristall
if (typeof PROP3 !== 'undefined') {
  PROP3.pvptower = function (b, M, pr) {
    const [top, line] = String(pr.roof).split('|');
    const stone = lighter(top, 0.3);
    // breiter achteckiger Sockel mit Stufe, schlanker Schaft mit vier Strebepfeilern, offene Krone
    b.add(lathe3('pvpbase', [[0, 0], [1.05, 0], [1.05, 0.22], [0.86, 0.26], [0.86, 0.44], [0, 0.44]], 8), darker(stone, 0.12), { parent: M, shade: 0.3 });
    b.add(lathe3('pvpshaft', [[0.5, 0], [0.46, 1.2], [0.4, 2.1], [0, 2.1]], 8), stone, { parent: M, p: [0, 0.44, 0], shade: 0.25 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      b.add(wbox(0.2, 1.3, 0.34, 0.05), darker(stone, 0.18), { parent: M, p: [Math.cos(a) * 0.55, 1.0, Math.sin(a) * 0.55], r: [0, -a, 0] });
    }
    for (const y of [1.2, 2.0]) b.add(wbox(1.0, 0.08, 1.0, 0.03), line, { parent: M, p: [0, y, 0], r: [0, Math.PI / 4, 0] });
    b.add(lathe3('pvpcrown', [[0.3, 0], [0.72, 0.18], [0.72, 0.34], [0.6, 0.36], [0.6, 0.28], [0, 0.28]], 8), darker(stone, 0.05), { parent: M, p: [0, 2.5, 0], shade: 0.2 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.add(horn3(0.22, 0.08, 4), stone, { parent: M, p: [Math.cos(a) * 0.66, 2.86, Math.sin(a) * 0.66] });
    }
  };
}
if (typeof PROP_CASTER3 !== 'undefined') PROP_CASTER3.pvptower = [2.4, 1.0, 0.45];
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.pvptower = (ctx, pr) => {
    const [top, line] = String(pr.roof).split('|');
    const st = lighter(top, 0.3);
    oval(ctx, 0, -3, 30, 10, darker(st, 0.2));
    box(ctx, -26, -14, 52, 12, 3, darker(st, 0.1));
    box(ctx, -14, -78, 28, 66, 3, st);
    for (const x of [-9, -2, 5]) box(ctx, x, -74, 2, 58, 0.5, darker(st, 0.2));
    for (const y of [-40, -64]) box(ctx, -15, y, 30, 2.5, 0.8, line);
    box(ctx, -22, -88, 44, 10, 2, darker(st, 0.05));
    for (const x of [-18, -6, 6, 18]) poly(ctx, [[x - 4, -88], [x, -96], [x + 4, -88]], st);
  };
  if (typeof PROP_BOUNDS !== 'undefined') PROP_BOUNDS.pvptower = { x: -34, y: -100, w: 68, h: 104 };
}

// --- Spielstand: Rang ------------------------------------------------------------------------------------------
// p.pvp: { pts, w, l, best, open (laufender Rangkampf), ret (Rückkehrpunkt beim Turniermeister) }
function pvpSave(p = game.player) {
  if (!p.pvp || typeof p.pvp !== 'object') p.pvp = { pts: 0, w: 0, l: 0, best: 0, open: null, ret: null };
  return p.pvp;
}
// Rangpunkte nach einem Rangkampf: +50 / −25 (nie unter 0); won null = unentschieden (keine Änderung)
function pvpRate(pts, won) {
  if (won == null) return pts;
  return won ? pts + PVP.win : Math.max(0, pts - PVP.loss);
}
const pvpFmt = (n) => Math.round(n).toLocaleString('de-DE');
const pvpClock = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// --- Nachrichten ---------------------------------------------------------------------------------------------
// Kennung eines Spielers aus Sicht aller: 'host' für den Host, sonst seine Peer-Kennung (so leitet der Host weiter)
const pvpState = { me: null, status: null, statusAt: -99, pending: null, pendingAt: 0, hostKey: null, proxies: new Map(), foes: [] };
function pvpHostKey() {
  return net.mode === 'host' ? 'self' : net.mode === 'client' ? net.hostConn : null;
}
// an einen Spieler (an sich selbst als Host direkt)
function pvpSend(pid, d) {
  if (net.mode === 'host' && pid === 'host') {
    if (!WAECHTER) pvpOnSocial('host', d);
  } else if (netOnline()) netSocial(pid, d);
}
// an den Host (als Host direkt an die eigene Führung)
function pvpToHost(d) {
  if (net.mode === 'host') pvpOnSocial('host', d);
  else if (net.mode === 'client') netSocial('host', d);
}
const _pvpOnSocial = onSocial;
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && /^pv[a-z]$/.test(d.k)) {
    pvpOnSocial(pid, d);
    return;
  }
  return _pvpOnSocial(pid, d);
};
function pvpOnSocial(pid, d) {
  if (!game.player) return;
  switch (d.k) {
    // beim Host: anmelden, abmelden, Stand erfragen, Fall melden, Spiel verlassen
    case 'pvq': if (net.mode === 'host') pvpHostJoin(pid, d); break;
    case 'pvx': if (net.mode === 'host') pvpHostLeave(pid, true); break;
    case 'pvi': if (net.mode === 'host') pvpHostStatus(pid); break;
    case 'pvd': if (net.mode === 'host') pvpHostDeath(pid, d); break;
    case 'pvl': if (net.mode === 'host') pvpHostLeft(pid, d); break;
    // beim Spieler (nur vom Host): Warteschlange, Start, Zwischenstand, Ende
    case 'pvs': if (pid === 'host') pvpOnStatus(d); break;
    case 'pvm': if (pid === 'host') pvpOnMatch(d); break;
    case 'pvu': if (pid === 'host') pvpOnUpdate(d); break;
    case 'pve': if (pid === 'host') pvpOnEnd(d); break;
    // zwischen Spielern: Treffer und Rückmeldung
    case 'pvh': pvpReceive(pid, d); break;
    case 'pvf': pvpFeedback(pid, d); break;
  }
}

// --- Host: Warteschlange und Spiele ----------------------------------------------------------------------------
// queue: { pid, name, cls, lvl, rt, mode, tag (Gruppe), at }
// matches: { id, mode, slot, state: 'count' | 'fight' | 'end', startAt, fightAt, endAt, freeAt, players: [P], score, tower,
//   winner, why, sentAt } · P: { pid, name, cls, lvl, rt, team, kills, deaths, dead, deadAt, left, joinAt, outAt }
const pvpHost = { queue: [], matches: [], nextId: 1, statusAt: 0, statusSig: '', changed: false };
// Figur eines Spielers beim Host ('host' = der Host selbst; der Welt-Wächter spielt nicht mit)
function pvpPos(pid) {
  if (pid === 'host') return WAECHTER ? null : game.player;
  const rp = net.players.get(pid);
  return rp && !rp.gone ? rp : null;
}
// alle Spieler im Kanal aus Sicht des Hosts
function pvpAllPids() {
  const out = [...net.players.keys()].filter((pid) => { const rp = net.players.get(pid); return rp && !rp.gone && !rp.waechter; });
  if (!WAECHTER) out.push('host');
  return out;
}
const pvpMatchOf = (pid) => pvpHost.matches.find((M) => M.state !== 'end' && M.players.some((P) => P.pid === pid && !P.left));
function pvpHostJoin(pid, d) {
  const mode = PVP_MODES[d.m] ? d.m : null;
  if (!mode) return;
  if (pvpMatchOf(pid)) {
    pvpSend(pid, { k: 'pvs', ...pvpStatusFor(pid), err: 'Du kämpfst gerade schon.' });
    return;
  }
  pvpHost.queue = pvpHost.queue.filter((q) => q.pid !== pid);
  const rp = pvpPos(pid);
  pvpHost.queue.push({
    pid, mode, name: String(d.n || (rp && rp.name) || '?').slice(0, 24), cls: d.c || (rp && rp.classId) || 'krieger',
    lvl: Math.max(1, d.l | 0), rt: Math.max(0, d.r | 0), tag: d.g ? String(d.g).slice(0, 24) : '', at: game.time
  });
  pvpHost.changed = true;
  pvpHostStatus(pid);
}
function pvpHostLeave(pid, tell) {
  const n = pvpHost.queue.length;
  pvpHost.queue = pvpHost.queue.filter((q) => q.pid !== pid);
  if (n !== pvpHost.queue.length) pvpHost.changed = true;
  if (tell) pvpHostStatus(pid);
}
// Stand der Warteschlange für einen Spieler: Wartende je Art, ob er selbst wartet, offene Turmschlacht
function pvpStatusFor(pid) {
  const q = {};
  for (const id of PVP_MODE_IDS) q[id] = 0;
  for (const e of pvpHost.queue) q[e.mode]++;
  const mine = pvpHost.queue.find((e) => e.pid === pid);
  const fun = pvpHost.matches.find((M) => M.mode === 'f4' && M.state !== 'end');
  const run = {};
  for (const id of PVP_MODE_IDS) run[id] = pvpHost.matches.filter((M) => M.mode === id && M.state !== 'end').length;
  return { q, me: pid, in: mine ? mine.mode : '', run, fun: fun ? [pvpTeamOf(fun, 'A').length, pvpTeamOf(fun, 'B').length] : null };
}
function pvpHostStatus(pid) {
  pvpSend(pid, { k: 'pvs', ...pvpStatusFor(pid) });
}
const pvpTeamOf = (M, team) => M.players.filter((P) => P.team === team && !P.left);

// Gruppen bilden: Wartende einer Art, Gruppenmitglieder (gleiche Gruppe) zusammen, höchstens so groß wie ein Team
function pvpUnits(mode) {
  const n = PVP_MODES[mode].size;
  const list = pvpHost.queue.filter((e) => e.mode === mode).sort((a, b) => a.at - b.at);
  const units = [];
  const byTag = new Map();
  for (const e of list) {
    if (n > 1 && e.tag) {
      let u = byTag.get(e.tag);
      if (!u || u.length >= n) {
        u = [];
        byTag.set(e.tag, u);
        units.push(u);
      }
      u.push(e);
    } else units.push([e]);
  }
  return units;
}
// Rangkampf: zwei volle Teams aus den Gruppen (die früh Wartenden zuerst). Ergebnis: { A: [...], B: [...] } oder null
function pvpPickTeams(units, n) {
  const U = units.slice(0, 16);
  const A = [];
  const B = [];
  let sa = 0;
  let sb = 0;
  const go = (i) => {
    if (sa === n && sb === n) return true;
    if (i >= U.length) return false;
    const u = U[i];
    if (sa + u.length <= n) { A.push(u); sa += u.length; if (go(i + 1)) return true; A.pop(); sa -= u.length; }
    if (sb + u.length <= n) { B.push(u); sb += u.length; if (go(i + 1)) return true; B.pop(); sb -= u.length; }
    return go(i + 1);
  };
  if (!go(0)) return null;
  let a = A.flat();
  let b = B.flat();
  // nur Einzelne: nach Rang gerecht verteilen (der Stärkste und der Schwächste zusammen …)
  if (A.every((u) => u.length === 1) && B.every((u) => u.length === 1) && n > 1) {
    const all = [...a, ...b].sort((x, y) => y.rt - x.rt);
    a = [];
    b = [];
    all.forEach((e, k) => ((k % 4 === 0 || k % 4 === 3) ? a : b).push(e));
  }
  return { A: a, B: b };
}
// freie Halle einer Art: kein Spiel darin und niemand drin
function pvpFreeSlot(mode) {
  const busy = new Set(pvpHost.matches.map((M) => M.slot));
  for (const pid of pvpAllPids()) {
    const o = pvpPos(pid);
    if (o) busy.add(pvpSlotAt(o.x, o.y));
  }
  for (let s = 0; s < PVP_SLOTS.length; s++) if (PVP_SLOTS[s].mode === mode && !busy.has(s)) return s;
  return -1;
}
function pvpHostForm() {
  for (const mode of PVP_MODE_IDS) {
    const def = PVP_MODES[mode];
    if (def.ranked) {
      const T = pvpPickTeams(pvpUnits(mode), def.size);
      if (!T) continue;
      const s = pvpFreeSlot(mode);
      if (s < 0) continue;
      pvpHostStart(mode, s, T);
      continue;
    }
    // Turmschlacht: erst in ein laufendes Spiel mit Platz (ins kleinere Team), sonst ab zwei Spielern ein neues
    const units = pvpUnits(mode);
    if (!units.length) continue;
    const run = pvpHost.matches.find((M) => M.mode === mode && M.state !== 'end' && M.endAt - game.time > 30);
    if (run) {
      for (const u of units) {
        const a = pvpTeamOf(run, 'A').length;
        const b = pvpTeamOf(run, 'B').length;
        const team = a <= b ? 'A' : 'B';
        const room = def.size - (team === 'A' ? a : b);
        if (room <= 0) break;
        for (const e of u.slice(0, room)) pvpHostAdd(run, e, team);
      }
      continue;
    }
    const total = units.reduce((n, u) => n + u.length, 0);
    if (total < PVP.funMin) continue;
    const s = pvpFreeSlot(mode);
    if (s < 0) continue;
    const T = { A: [], B: [] };
    for (const u of units.slice().sort((x, y) => y.length - x.length)) {
      const team = T.A.length <= T.B.length ? 'A' : 'B';
      const room = def.size - T[team].length;
      if (room > 0) T[team].push(...u.slice(0, room));
    }
    // eine große Gruppe allein: aufteilen, damit beide Teams jemanden haben
    if (!T.B.length && T.A.length > 1) T.B.push(...T.A.splice(Math.ceil(T.A.length / 2)));
    if (!T.A.length || !T.B.length) continue;
    pvpHostStart(mode, s, T);
  }
}
const pvpPlayerOf = (e, team) => ({ pid: e.pid, name: e.name, cls: e.cls, lvl: e.lvl, rt: e.rt, team, kills: 0, deaths: 0, dead: false, deadAt: 0, left: false, joinAt: game.time, outAt: null });
function pvpHostStart(mode, slot, T) {
  const def = PVP_MODES[mode];
  const now = game.time;
  const M = {
    id: pvpHost.nextId++, mode, slot, state: 'count', startAt: now, fightAt: now + PVP.countdown,
    endAt: now + PVP.countdown + (def.ranked ? PVP.rankedTime : PVP.funTime), freeAt: 0,
    players: [...T.A.map((e) => pvpPlayerOf(e, 'A')), ...T.B.map((e) => pvpPlayerOf(e, 'B'))],
    score: { A: 0, B: 0 }, tower: { pct: 0, owner: '' }, winner: null, why: '', sentAt: 0, inside: { A: 0, B: 0 }
  };
  const ids = new Set(M.players.map((P) => P.pid));
  pvpHost.queue = pvpHost.queue.filter((q) => !ids.has(q.pid));
  pvpHost.matches.push(M);
  pvpHost.changed = true;
  for (const P of M.players) pvpHostSendStart(M, P);
}
// Turmschlacht: neuer Spieler kommt in ein laufendes Spiel
function pvpHostAdd(M, e, team) {
  const P = pvpPlayerOf(e, team);
  M.players = M.players.filter((x) => x.pid !== e.pid);
  M.players.push(P);
  pvpHost.queue = pvpHost.queue.filter((q) => q.pid !== e.pid);
  pvpHost.changed = true;
  pvpHostSendStart(M, P);
  M.sentAt = 0;
}
const pvpRoster = (M) => M.players.map((P) => [P.pid, P.name, P.cls, P.lvl, P.rt, P.team, P.kills, P.deaths, P.dead ? 1 : 0, P.left ? 1 : 0]);
function pvpHostSendStart(M, P) {
  const now = game.time;
  const idx = M.players.filter((x) => x.team === P.team).indexOf(P);
  pvpSend(P.pid, {
    k: 'pvm', id: M.id, m: M.mode, s: M.slot, me: P.pid, tm: P.team, i: Math.max(0, idx), cd: +Math.max(0, M.fightAt - now).toFixed(2),
    left: Math.round(M.endAt - now), r: pvpRoster(M), sc: [M.score.A, M.score.B], tw: [Math.round(M.tower.pct * 10) / 10, M.tower.owner]
  });
}
function pvpHostUpdate(M) {
  const d = {
    k: 'pvu', id: M.id, st: M.state, left: Math.round(M.endAt - game.time), r: pvpRoster(M), sc: [M.score.A, M.score.B],
    tw: [Math.round(M.tower.pct * 10) / 10, M.tower.owner, M.inside.A, M.inside.B]
  };
  for (const P of M.players) if (!P.left) pvpSend(P.pid, d);
}
// Fall eines Spielers (von ihm selbst gemeldet): Kill für den Gegner, der zuletzt traf
function pvpHostDeath(pid, d) {
  const M = pvpHost.matches.find((x) => x.id === d.id);
  if (!M || M.state !== 'fight') return;
  const P = M.players.find((x) => x.pid === pid && !x.left);
  if (!P || P.dead) return;
  P.dead = true;
  P.deadAt = game.time;
  P.deaths++;
  const K = d.by ? M.players.find((x) => x.pid === d.by && x.team !== P.team) : null;
  if (K) {
    K.kills++;
    if (M.mode === 'f4') M.score[K.team]++;
  }
  M.sentAt = 0;
}
// Spieler geht (Knopf, aus der Halle gelaufen, Spiel zu)
function pvpHostDrop(M, P) {
  if (P.left) return;
  P.left = true;
  P.dead = true;
  M.sentAt = 0;
}
function pvpHostLeft(pid, d) {
  const M = pvpHost.matches.find((x) => x.id === d.id);
  const P = M && M.players.find((x) => x.pid === pid);
  if (P) pvpHostDrop(M, P);
}
function pvpHostEnd(M, winner, why) {
  M.state = 'end';
  M.winner = winner;
  M.why = why;
  M.freeAt = game.time + PVP.endShow + 8;
  pvpHost.changed = true;
  const d = { k: 'pve', id: M.id, m: M.mode, w: winner || '', why, r: pvpRoster(M), sc: [M.score.A, M.score.B], tw: [Math.round(M.tower.pct), M.tower.owner] };
  for (const P of M.players) if (!P.left) pvpSend(P.pid, d);
}
function pvpHostTickMatch(M, dt) {
  const now = game.time;
  const def = PVP_MODES[M.mode];
  if (M.state === 'end') return;
  // wer weg ist (Kanal verlassen) oder lange außerhalb der Halle steht, ist raus
  for (const P of M.players) {
    if (P.left) continue;
    const o = pvpPos(P.pid);
    if (!o) { pvpHostDrop(M, P); continue; }
    const here = pvpSlotAt(o.x, o.y) === M.slot;
    if (!here && now - P.joinAt > PVP.hostGrace) {
      if (P.outAt == null) P.outAt = now;
      if (now - P.outAt > 4) { pvpHostDrop(M, P); continue; }
    } else P.outAt = null;
    // Fall ohne Meldung (Nachricht verloren): nach einer Sekunde tot im Bild zählt er auch
    if (M.state === 'fight' && o.dead && !P.dead) {
      if (P.seenDead == null) P.seenDead = now;
      if (now - P.seenDead > 1.5) pvpHostDeath(P.pid, { id: M.id });
    } else P.seenDead = null;
    // Turmschlacht: wieder aufgestanden
    if (def.ranked === false && P.dead && !o.dead && now - P.deadAt > 1) P.dead = false;
  }
  if (M.state === 'count' && now >= M.fightAt) {
    M.state = 'fight';
    M.sentAt = 0;
  }
  if (M.state === 'fight') {
    const inA = pvpTeamOf(M, 'A');
    const inB = pvpTeamOf(M, 'B');
    if (def.ranked) {
      const aliveA = inA.filter((P) => !P.dead).length;
      const aliveB = inB.filter((P) => !P.dead).length;
      if (!aliveA || !aliveB) {
        pvpHostEnd(M, aliveA ? 'A' : aliveB ? 'B' : '', aliveA || aliveB ? 'sieg' : 'gleich');
        return;
      }
      if (now >= M.endAt) {
        // Zeit um: mehr Kämpfer übrig, dann mehr Leben (Anteil)
        const life = (L) => L.filter((P) => !P.dead).reduce((n, P) => { const o = pvpPos(P.pid); return n + (o ? Math.max(0, o.hp) / Math.max(1, o.maxHp || (o === game.player ? game.stats.maxHp : 1)) : 0); }, 0);
        const la = life(inA);
        const lb = life(inB);
        pvpHostEnd(M, aliveA !== aliveB ? (aliveA > aliveB ? 'A' : 'B') : Math.abs(la - lb) > 0.02 ? (la > lb ? 'A' : 'B') : '', 'zeit');
        return;
      }
    } else {
      // Turmschlacht: ein Team ganz weg – das andere gewinnt
      if (!inA.length || !inB.length) {
        pvpHostEnd(M, inA.length ? 'A' : inB.length ? 'B' : '', 'flucht');
        return;
      }
      pvpHostTower(M, dt);
      if (M.tower.pct >= 100) { pvpHostEnd(M, M.tower.owner, 'turm'); return; }
      if (M.score.A >= PVP.funKills || M.score.B >= PVP.funKills) { pvpHostEnd(M, M.score.A >= PVP.funKills ? 'A' : 'B', 'kills'); return; }
      if (now >= M.endAt) {
        const w = M.score.A !== M.score.B ? (M.score.A > M.score.B ? 'A' : 'B') : M.tower.pct > 0 ? M.tower.owner : '';
        pvpHostEnd(M, w, 'zeit');
        return;
      }
    }
  }
  if (now - M.sentAt > 0.5) {
    M.sentAt = now;
    pvpHostUpdate(M);
  }
}
// Turm: lädt nur, wenn genau ein Team (lebend) im Kreis steht; zuerst wird die Farbe des anderen Teams abgebaut
function pvpHostTower(M, dt) {
  const c = pvpTowerAt(M.slot);
  const R = PVP.capR * TILE;
  const n = { A: 0, B: 0 };
  for (const P of M.players) {
    if (P.left || P.dead) continue;
    const o = pvpPos(P.pid);
    if (!o || o.dead) continue;
    if (Math.hypot(o.x - c.x, o.y - c.y) <= R) n[P.team]++;
  }
  M.inside = n;
  pvpTowerStep(M.tower, n.A, n.B, dt);
}
// ein Schritt der Turmladung (auch für Tests): t = { pct, owner }
function pvpTowerStep(t, a, b, dt) {
  if (a && b) return t;
  if (!a && !b) {
    t.pct = Math.max(0, t.pct - PVP.capDecay * dt);
    if (t.pct <= 0) t.owner = '';
    return t;
  }
  const team = a ? 'A' : 'B';
  const rate = (100 / PVP.capTime) * (1 + PVP.capMore * ((a || b) - 1)) * dt;
  if (t.owner && t.owner !== team) {
    t.pct -= rate;
    if (t.pct <= 0) { t.pct = -t.pct; t.owner = team; }
  } else {
    t.owner = team;
    t.pct = Math.min(100, t.pct + rate);
  }
  return t;
}
function pvpHostTick(dt) {
  if (net.mode !== 'host') {
    if (pvpHost.queue.length || pvpHost.matches.length) {
      pvpHost.queue = [];
      pvpHost.matches = [];
    }
    return;
  }
  // keine Monster in den Hallen (Nachtmonster, Verstärkung, verirrte Beschwörungen)
  if (pvpHost.matches.length && game.time - (pvpHost.purgeAt || 0) > 1) {
    pvpHost.purgeAt = game.time;
    const before = game.monsters.length;
    game.monsters = game.monsters.filter((m) => m.isStone || pvpSlotAt(m.x, m.y) < 0);
    if (game.monsters.length !== before && game.target && game.monsters.indexOf(game.target) < 0 && !game.target.duelProxy) game.target = null;
  }
  // Wartende, die den Kanal verlassen haben, oder deren Figur in einem Spiel steckt
  const n = pvpHost.queue.length;
  pvpHost.queue = pvpHost.queue.filter((e) => pvpPos(e.pid) && !pvpMatchOf(e.pid));
  if (n !== pvpHost.queue.length) pvpHost.changed = true;
  pvpHostForm();
  for (const M of pvpHost.matches) pvpHostTickMatch(M, dt);
  const before = pvpHost.matches.length;
  pvpHost.matches = pvpHost.matches.filter((M) => !(M.state === 'end' && game.time > M.freeAt));
  if (before !== pvpHost.matches.length) pvpHost.changed = true;
  // Stand der Warteschlange: bei Änderung sofort, sonst alle 5 s an alle
  const now = game.time;
  if (pvpHost.changed || now - pvpHost.statusAt > 5) {
    pvpHost.changed = false;
    pvpHost.statusAt = now;
    for (const pid of pvpAllPids()) pvpHostStatus(pid);
  }
}

// --- Spieler: eigenes Spiel ------------------------------------------------------------------------------------
// game.pvpMatch: { p, id, mode, slot, me, team, idx, ranked, state, fightAt, endAt, roster (Map pid → Eintrag), score,
//   tower { pct, owner, a, b }, lastMsgAt, shown, lastHit { pid, at }, respawnAt, outSince, result, returnAt }
function pvpRosterIn(M, r) {
  const map = new Map();
  for (const e of r || []) {
    const [pid, name, cls, lvl, rt, team, kills, deaths, dead, left] = e;
    map.set(pid, { pid, name, cls, lvl, rt, team, kills, deaths, dead: !!dead, left: !!left });
  }
  M.roster = map;
}
// Rückkehrpunkt: beim Turniermeister, bei dem man sich angemeldet hat (sonst in Kazehana)
function pvpReturnSpot() {
  const r = pvpSave().ret;
  if (r && Number.isFinite(r.x) && Number.isFinite(r.y) && pvpSlotAt(r.x, r.y) < 0 && (typeof arenaSlotAt !== 'function' || arenaSlotAt(r.x, r.y) < 0)) return { x: r.x, y: r.y };
  return { x: CENTER_X * TILE, y: (CENTER_Y + 1) * TILE };
}
// Ortswechsel mit Lichtsäule (wie moveThrough, aber ohne Ring am Boden)
function pvpWarp(spot) {
  const p = game.player;
  p.dash = null;
  p.leap = null;
  p.x = spot.x;
  p.y = spot.y;
  setTarget(null);
  game.allies.forEach((a) => { a.x = p.x; a.y = p.y; });
  ui.closePanels();
  if (typeof pcard !== 'undefined') pcard.close();
  vfxPillar(p, PVP.gate, 1);
  if (!V3.on) flashScreen(PVP.gate, 0.2);
  saveGame();
}
// wieder auf den Beinen (ohne Verlust): volle Kräfte, kurz geschützt
function pvpRevive(protect = PVP.protect) {
  const p = game.player;
  const s = playerStats(p);
  p.dead = false;
  p.hp = s.maxHp;
  p.mp = s.maxMp;
  p.deathXpLoss = 0;
  p.skillCd = [0, 0, 0, 0, 0];
  p.protectUntil = game.time + protect;
  $('panelDeath').hidden = true;
  game.stats = playerStats(p);
}
function pvpOnStatus(d) {
  pvpState.status = d;
  pvpState.statusAt = game.time;
  if (d.me) pvpState.me = d.me;
  if (pvpState.pending && (d.in === pvpState.pending || d.err)) pvpState.pending = null;
  if (d.err) ui.log(d.err, 'warn');
  pvpRefreshNpc();
}
function pvpOnMatch(d) {
  const p = game.player;
  const def = PVP_MODES[d.m];
  if (!def || !PVP_SLOTS[d.s] || PVP_SLOTS[d.s].mode !== d.m) return;
  const old = game.pvpMatch;
  if (old && old.id !== d.id && old.state !== 'end') return;
  // Prüfungsarena und Duell enden (das gesammelte Gold wird ausgezahlt)
  if (game.arenaRun && typeof arenaStop === 'function') arenaStop('aufgeben');
  if (game.duel && typeof endDuel === 'function') endDuel(null, 'Das Duell endet – die Turnierarena ruft.');
  const A = pvpSave(p);
  if (!A.ret) A.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  const M = {
    p, id: d.id, mode: d.m, slot: d.s, me: d.me, team: d.tm === 'B' ? 'B' : 'A', idx: d.i | 0, ranked: def.ranked,
    state: +d.cd > 0 ? 'count' : 'fight', fightAt: game.time + Math.max(0, +d.cd || 0), endAt: game.time + Math.max(0, +d.left || 0),
    score: { A: (d.sc && d.sc[0]) | 0, B: (d.sc && d.sc[1]) | 0 }, tower: { pct: (d.tw && +d.tw[0]) || 0, owner: (d.tw && d.tw[1]) || '', a: 0, b: 0 },
    lastMsgAt: game.time, shown: -1, lastHit: null, respawnAt: 0, outSince: null, result: null, returnAt: 0, rt0: A.pts || 0
  };
  pvpRosterIn(M, d.r);
  game.pvpMatch = M;
  const sum = document.getElementById('pvpSum');
  if (sum) sum.remove();
  pvpState.me = d.me;
  pvpState.pending = null;
  if (pvpState.status) pvpState.status.in = '';
  pvpState.proxies.clear();
  // Rangkampf: steht im Spielstand, bis er gewertet ist (wer das Spiel mittendrin schließt, verliert ihn)
  if (def.ranked) A.open = { id: d.id, m: d.m, at: Date.now() };
  if (p.dead) pvpRevive();
  pvpWarp(pvpSpawnSpot(d.s, M.team, M.idx));
  ui.banner(def.name, `${PVP_DIM[d.m].name} · Team ${PVP_TEAM[M.team].name}`);
  ui.log(`Du kämpfst für Team ${PVP_TEAM[M.team].name}.`, 'level');
  if (typeof sfx !== 'undefined' && sfx.riser) sfx.riser();
  saveGame();
  pvpHud();
}
function pvpOnUpdate(d) {
  const M = game.pvpMatch;
  if (!M || M.id !== d.id) return;
  M.lastMsgAt = game.time;
  if (M.state === 'end') return;
  if (d.st === 'fight' && M.state === 'count') M.state = 'fight';
  if (Number.isFinite(+d.left)) M.endAt = game.time + Math.max(0, +d.left);
  pvpRosterIn(M, d.r);
  if (d.sc) M.score = { A: d.sc[0] | 0, B: d.sc[1] | 0 };
  if (d.tw) {
    const was = M.tower.owner;
    M.tower = { pct: +d.tw[0] || 0, owner: d.tw[1] || '', a: d.tw[2] | 0, b: d.tw[3] | 0 };
    if (M.tower.owner && was && M.tower.owner !== was) ui.banner('Der Turm wechselt', `Team ${PVP_TEAM[M.tower.owner].name} lädt ihn auf`);
  }
}
function pvpOnEnd(d) {
  const M = game.pvpMatch;
  if (!M || M.id !== d.id || M.state === 'end') return;
  const p = game.player;
  M.lastMsgAt = game.time;
  M.state = 'end';
  pvpRosterIn(M, d.r);
  if (d.sc) M.score = { A: d.sc[0] | 0, B: d.sc[1] | 0 };
  const w = d.w === 'A' || d.w === 'B' ? d.w : '';
  const won = w ? w === M.team : null;
  const A = pvpSave(p);
  const before = A.pts || 0;
  if (M.ranked) {
    A.pts = pvpRate(before, won);
    if (won === true) A.w = (A.w || 0) + 1;
    if (won === false) A.l = (A.l || 0) + 1;
    A.best = Math.max(A.best || 0, A.pts);
    A.open = null;
  } else {
    A.fw = (A.fw || 0) + (won === true ? 1 : 0);
    A.fn = (A.fn || 0) + 1;
  }
  M.result = { w, won, why: d.why, before, after: A.pts || 0 };
  M.returnAt = game.time + PVP.endShow;
  M.respawnAt = 0;
  if (p.dead) pvpRevive(4);
  pvpState.proxies.clear();
  pvpState.foes.length = 0;
  setTarget(null);
  const tb = pvpTier(before);
  const ta = pvpTier(A.pts || 0);
  if (won === true) {
    ui.banner('Sieg!', M.ranked ? `+${PVP.win} Rangpunkte` : `Team ${PVP_TEAM[M.team].name} gewinnt`);
    vfxPowerUp(p, '#ffd34d');
    startSwing(p, 'pose', 0.7);
    if (typeof sfx !== 'undefined' && sfx.success) sfx.success();
  } else if (won === false) ui.banner('Niederlage', M.ranked ? `−${before - (A.pts || 0)} Rangpunkte` : `Team ${PVP_TEAM[w].name} gewinnt`);
  else ui.banner('Unentschieden', 'Keine Rangpunkte');
  if (M.ranked && ta !== tb) ui.log(ta.min > tb.min ? `Aufstieg! Dein Rang ist jetzt ${ta.name}.` : `Dein Rang ist jetzt ${ta.name}.`, 'level');
  saveGame();
  pvpSummary(M);
  pvpHud();
}
// ohne Wertung abbrechen (Host gewechselt, keine Antwort mehr, anderer Charakter)
function pvpAbort(text) {
  const M = game.pvpMatch;
  if (!M) return;
  game.pvpMatch = null;
  const p = game.player;
  const A = pvpSave(p);
  A.open = null;
  pvpState.proxies.clear();
  pvpState.foes.length = 0;
  if (game.target && game.target.pvp) setTarget(null);
  if (p.dead) pvpRevive();
  if (pvpInside(p)) pvpWarp(pvpReturnSpot());
  if (text) {
    ui.banner('Turnierarena', 'Spiel abgebrochen');
    ui.log(text, 'warn');
  }
  saveGame();
  pvpHud();
}
// selbst gehen (Knopf, aus der Halle gelaufen): im Rangkampf zählt das als Niederlage
function pvpLeave(why) {
  const M = game.pvpMatch;
  if (!M) return;
  const p = game.player;
  const A = pvpSave(p);
  if (M.state !== 'end') {
    pvpToHost({ k: 'pvl', id: M.id });
    if (M.ranked) {
      const before = A.pts || 0;
      A.pts = pvpRate(before, false);
      A.l = (A.l || 0) + 1;
      ui.log(`Rangkampf verlassen – das zählt als Niederlage (−${before - A.pts} Rangpunkte).`, 'warn');
    } else ui.log('Du hast die Turmschlacht verlassen.', 'info');
  }
  A.open = null;
  game.pvpMatch = null;
  pvpState.proxies.clear();
  pvpState.foes.length = 0;
  if (game.target && game.target.pvp) setTarget(null);
  if (p.dead) pvpRevive();
  if (why !== 'weg' || pvpInside(p)) pvpWarp(pvpReturnSpot());
  saveGame();
  pvpHud();
}
function pvpReturnHome() {
  const p = game.player;
  game.pvpMatch = null;
  pvpState.proxies.clear();
  pvpState.foes.length = 0;
  if (p.dead) pvpRevive();
  if (pvpInside(p)) pvpWarp(pvpReturnSpot());
  const el = document.getElementById('pvpSum');
  if (el) el.remove();
  pvpHud();
}
// eigener Fall: ohne Verlust; Turmschlacht nach ein paar Sekunden in der Basis zurück, Rangkampf zuschauen
function pvpDied() {
  const M = game.pvpMatch;
  const p = game.player;
  p.deathXpLoss = 0;
  p.deaths = Math.max(0, (p.deaths || 1) - 1);
  const by = M.lastHit && game.time - M.lastHit.at < 15 ? M.lastHit.pid : null;
  pvpToHost({ k: 'pvd', id: M.id, by });
  const me = M.roster.get(M.me);
  if (me) { me.dead = true; me.deaths++; }
  if (M.ranked) {
    ui.banner('Ausgeschieden', 'Du schaust zu, bis die Runde endet');
  } else {
    M.respawnAt = game.time + PVP.respawn;
    ui.banner('Gefallen', `In ${PVP.respawn} Sekunden geht es in deiner Basis weiter`);
  }
  pvpHud();
}
const _pvpShowDeath = ui.showDeath;
ui.showDeath = function (lostXp) {
  const M = game.pvpMatch;
  const p = game.player;
  if (M && M.state !== 'end' && p && pvpSlotAt(p.x, p.y) === M.slot) {
    this.closePanels();
    pvpDied();
    return;
  }
  return _pvpShowDeath.call(this, lostXp);
};
// Wiederbeleben in einer Halle (falls doch das Fenster kam): zurück zum Turniermeister
const _pvpVillageSpawn = villageSpawn;
villageSpawn = function (p) {
  if (p && pvpInside(p)) return pvpReturnSpot();
  return _pvpVillageSpawn(p);
};

// --- Treffen und getroffen werden (wie im Duell, interaktion.js) -------------------------------------------------
// Gegner als Stellvertreter in der Zielliste (aliveEnemies, Geschosse, Diener); nur im Kampf, nur lebende
function pvpFoes() {
  return pvpState.foes;
}
function pvpProxyFor(pid) {
  const M = game.pvpMatch;
  if (!M || M.state !== 'fight') return null;
  const px = pvpState.proxies.get(pid);
  return px && !px.dead && !px.hidden && pvpState.foes.includes(px) ? px : null;
}
function pvpUpdateFoes() {
  const M = game.pvpMatch;
  const list = pvpState.foes;
  list.length = 0;
  if (!M || M.state !== 'fight' || game.player.dead) return;
  for (const e of M.roster.values()) {
    if (e.team === M.team || e.left || e.pid === M.me) continue;
    const rp = net.players.get(e.pid);
    if (!rp || rp.gone) continue;
    let px = pvpState.proxies.get(e.pid);
    if (!px) {
      px = { id: 'pvp:' + e.pid, pvp: true, duelProxy: true, pid: e.pid, r: 11, def: 0, isStone: false, type: {}, stun: 0, dead: false };
      pvpState.proxies.set(e.pid, px);
    }
    Object.assign(px, { name: e.name, x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, level: rp.level, dead: !!rp.dead || e.dead, hidden: remoteHidden(rp), classId: rp.classId });
    if (pvpSlotAt(rp.x, rp.y) !== M.slot) px.dead = true;
    if (!px.dead) list.push(px);
  }
  const t = game.target;
  if (t && t.pvp && (t.dead || t.hidden || !list.includes(t))) setTarget(null);
}
// Treffer auf einen Gegner: rohen Schaden an ihn schicken (Werte wie duelHit)
function pvpHit(m, mul, opts) {
  const M = game.pvpMatch;
  const p = game.player;
  const s = game.stats;
  if (!M || M.state !== 'fight' || p.dead || m.dead) return 0;
  const base = opts.atk != null ? opts.atk : s.atk;
  const crit = !opts.ally && Math.random() < s.crit + (opts.critBonus || 0);
  if (!opts.ally && !opts.dot) breakStealth(p);
  const raw = base * mul * (opts.ally ? DUEL_ALLY_MUL : 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1) * (opts.basic ? 1 + (s.basicDmg || 0) : 1) * (opts.duelMul || 1);
  pvpSend(m.pid, { k: 'pvh', id: M.id, a: Math.round(raw), c: crit ? 1 : 0, l: p.level });
  vfxImpact(m, crit, opts.vfxColor);
  if (opts.skill) skillHitFx(opts.skill, m, crit, opts.heavy);
  p.lastCombat = game.time;
  if (crit) shakeScreen(4);
  return Math.round(raw * 0.5);
}
// getroffen: mit eigener Verteidigung abrechnen (wie duelReceive); nie vom eigenen Team
function pvpReceive(pid, d) {
  const M = game.pvpMatch;
  const p = game.player;
  if (!M || d.id !== M.id || M.state !== 'fight' || p.dead) return;
  const e = M.roster.get(pid);
  if (!e || e.team === M.team || pvpSlotAt(p.x, p.y) !== M.slot) return;
  const s = game.stats;
  const raw = (+d.a || 0) * DUEL.pvpMul * (1 - s.def / (s.def + 40 + 5 * ((d.l || 1) - 1)));
  const capped = (d.l || 1) - p.level < DUEL.capGap;
  const amount = Math.max(1, Math.round(capped ? Math.min(raw, s.maxHp * (d.c ? DUEL.maxCrit : DUEL.maxHit)) : raw));
  const before = p.hp;
  M.lastHit = { pid, at: game.time };
  const src = pvpState.proxies.get(pid) || { pvp: true, duelProxy: true, pid, x: p.x, y: p.y, r: 11, dead: false };
  damagePlayer(amount, src);
  const dealt = Math.max(0, Math.round(before - p.hp));
  pvpSend(pid, { k: 'pvf', id: M.id, a: dealt, c: d.c ? 1 : 0, t: dealt ? '' : 'Abgewehrt' });
}
function pvpFeedback(pid, d) {
  const M = game.pvpMatch;
  const m = pvpState.proxies.get(pid);
  if (!M || d.id !== M.id || !m) return;
  addText(m.x, feetY(m) - 50, d.a > 0 ? String(d.a) : d.t || 'Abgewehrt', d.a > 0 ? (d.c ? 'crit' : 'dmg') : 'info');
}
// Heilen der Lichtkuppel wirkt in der Turnierarena auch auf das eigene Team (nicht nur auf die Gruppe)
if (typeof healParty === 'function') {
  const _pvpHealParty = healParty;
  healParty = function (pct, x, y, r) {
    const M = game.pvpMatch;
    if (!M || M.state === 'end') return _pvpHealParty(pct, x, y, r);
    const hp = (game.stats && game.stats.healPower) || 1;
    for (const e of M.roster.values()) {
      if (e.team !== M.team || e.pid === M.me || e.left) continue;
      const rp = net.players.get(e.pid);
      if (!rp || rp.gone || rp.dead || Math.hypot(rp.x - x, rp.y - y) > r) continue;
      pvpSend(e.pid, { k: 'hh', pct: +(pct * hp).toFixed(4), n: game.player.name });
    }
  };
}

// --- jedes Bild (über raidWatch): Host-Führung, eigenes Spiel, Anzeige ------------------------------------------
function pvpTick() {
  const p = game.player;
  if (!p || !game.world) return;
  const now = performance.now();
  const dt = Math.min(0.5, Math.max(0, (now - (pvpState.tickAt || now)) / 1000));
  pvpState.tickAt = now;
  pvpHostTick(dt);
  if (WAECHTER) return;
  // Host gewechselt oder offline: Warteschlange weg, laufendes Spiel ohne Wertung abbrechen
  const hk = pvpHostKey();
  if (hk !== pvpState.hostKey) {
    const M = game.pvpMatch;
    if (pvpState.hostKey && M && M.state !== 'end') pvpAbort('Der Host des Kanals hat gewechselt – das Spiel wurde ohne Wertung abgebrochen.');
    else if (pvpState.hostKey && pvpState.status && pvpState.status.in) ui.log('Der Host des Kanals hat gewechselt – melde dich beim Turniermeister neu an.', 'warn');
    pvpState.hostKey = hk;
    pvpState.status = null;
    pvpState.pending = null;
    pvpState.me = net.mode === 'host' ? 'host' : null;
    pvpRefreshNpc();
  }
  // anderer Charakter gestartet: das Spiel verfällt (ein offener Rangkampf bleibt im Spielstand jener Figur)
  if (game.pvpMatch && game.pvpMatch.p !== p) {
    game.pvpMatch = null;
    pvpState.proxies.clear();
    pvpState.foes.length = 0;
  }
  const A = pvpSave(p);
  // offener Rangkampf ohne laufendes Spiel (Spiel war zu, Seite neu geladen): zählt als Niederlage
  if (A.open && !game.pvpMatch) {
    const before = A.pts || 0;
    A.pts = pvpRate(before, false);
    A.l = (A.l || 0) + 1;
    A.open = null;
    ui.log(`Dein letzter Rangkampf wurde nicht zu Ende gespielt und zählt als Niederlage (−${before - A.pts} Rangpunkte).`, 'warn');
    saveGame();
  }
  if (pvpState.pending && game.time - pvpState.pendingAt > 8) {
    pvpState.pending = null;
    ui.log('Keine Antwort vom Host (spielt er eine ältere Version?). Versuch es später noch einmal.', 'warn');
    pvpRefreshNpc();
  }
  const M = game.pvpMatch;
  const here = pvpSlotAt(p.x, p.y);
  if (here >= 0 && game.riftAt != null && game.riftAt - game.time < 30) game.riftAt = game.time + 30;
  if (!M) {
    // in einer Halle ohne Spiel (z. B. nach dem Neuladen): zurück zum Turniermeister
    if (here >= 0 && !p.dead) {
      ui.log('Die Turnierarena ist leer. Du kehrst zum Turniermeister zurück.', 'info');
      pvpWarp(pvpReturnSpot());
    }
    pvpHud();
    return;
  }
  if (!netOnline()) {
    pvpAbort('Ohne Verbindung zum Kanal endet das Spiel in der Turnierarena (ohne Wertung).');
    return;
  }
  if (M.state !== 'end' && game.time - M.lastMsgAt > PVP.silent) {
    pvpAbort('Keine Nachricht mehr vom Host – das Spiel wurde ohne Wertung abgebrochen.');
    return;
  }
  // Countdown
  if (M.state === 'count') {
    const left = Math.ceil(M.fightAt - game.time);
    if (left !== M.shown && left > 0) {
      M.shown = left;
      ui.banner(String(left), `${PVP_MODES[M.mode].name} · Team ${PVP_TEAM[M.team].name}`);
    }
    if (game.time >= M.fightAt) M.state = 'fight';
  }
  if (M.state === 'fight' && M.shown !== 0) {
    M.shown = 0;
    ui.banner('Kampf!', M.ranked ? 'Wer fällt, scheidet aus – das letzte Team gewinnt' : `Lade den Turm auf oder hol dir ${PVP.funKills} Kills`);
  }
  // Turmschlacht: Wiedereinstieg in der eigenen Basis
  if (p.dead && M.respawnAt && game.time >= M.respawnAt && M.state === 'fight') {
    M.respawnAt = 0;
    pvpRevive();
    pvpWarp(pvpSpawnSpot(M.slot, M.team, M.idx));
    const me = M.roster.get(M.me);
    if (me) me.dead = false;
  }
  // aus der Halle gelaufen (Weltentor, Schriftrolle …): wer geht, verliert
  if (here !== M.slot && !p.dead && M.state !== 'end') {
    if (M.outSince == null) M.outSince = game.time;
    if (game.time - M.outSince > 1.5) {
      pvpLeave('weg');
      return;
    }
  } else M.outSince = null;
  if (M.state === 'end' && game.time >= M.returnAt) {
    pvpReturnHome();
    return;
  }
  pvpUpdateFoes();
  pvpHud();
}
const _pvpRaidWatch = raidWatch;
raidWatch = function () {
  _pvpRaidWatch();
  pvpTick();
};

// --- Anzeige im Spiel: Art, Zeit, Teams mit Leben, Punkte, Turm, Wiedereinstieg, Verlassen ----------------------
// Am PC eine Leiste direkt über dem Chat, am Handy eine schmale Pille links unter der Lebensanzeige (wie die
// Prüfungsarena): Antippen klappt sie auf (Teams, Turm, Verlassen mit Rückfrage).
function pvpCss() {
  if (document.getElementById('pvpCss')) return;
  const st = document.createElement('style');
  st.id = 'pvpCss';
  st.textContent =
    '#pvpHud{position:fixed;left:8px;top:90px;z-index:5;display:flex;flex-wrap:wrap;align-items:center;color:#eef4ff;text-shadow:0 1px 2px #000;white-space:nowrap;' +
    'background:rgba(14,20,34,.8);border:1px solid rgba(150,190,255,.5);box-shadow:0 2px 8px rgba(0,0,0,.4)}' +
    '#pvpHud.pc{gap:4px 10px;padding:5px 7px 5px 11px;border-radius:12px;font:600 12.5px/1.25 system-ui,sans-serif;max-width:min(680px,calc(100vw - 16px));pointer-events:none}' +
    '#pvpHud.touch{gap:2px 6px;padding:2px 3px 2px 9px;border-radius:13px;font:600 11px/1.2 system-ui,sans-serif;max-width:min(320px,48vw);pointer-events:auto}' +
    '#pvpHud .md{color:#ffd98a;font-weight:800}#pvpHud .ta{color:#7ab8ff}#pvpHud .tb{color:#ff8a7a}#pvpHud .tw{color:#e8e0ff}' +
    '#pvpHud .info{color:#ffe0a0}#pvpHud .bars{display:inline-flex;gap:2px;vertical-align:middle;margin:0 3px}' +
    '#pvpHud .pb{display:inline-block;width:16px;height:6px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden;vertical-align:middle}' +
    '#pvpHud .pb.me{outline:1px solid #fff}#pvpHud .pb i{display:block;height:100%}#pvpHud .pb.dead{background:rgba(120,120,120,.35)}' +
    '#pvpHud .twb{display:inline-block;width:46px;height:7px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden;vertical-align:middle;margin-left:3px}' +
    '#pvpHud .twb i{display:block;height:100%}' +
    '#pvpHud button{pointer-events:auto;cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:#2a3a6a;border:1px solid #6a8ad8;border-radius:8px;padding:3px 9px}' +
    '#pvpHud.touch button{font-size:11px;border-radius:10px}#pvpHud button.x{width:22px;height:20px;padding:0;line-height:18px}' +
    '#pvpHud .det{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding:2px 0 3px;white-space:normal}' +
    // seit 13.89: am PC eine Karte mit Kopfzeile, Teams, Turmbalken, Wiedereinstieg mit Fortschritt und Knopf
    '#pvpHud.pc{display:block;width:300px;padding:0;overflow:hidden;border-radius:12px;background:linear-gradient(180deg,rgba(26,34,58,.92),rgba(12,16,28,.9));border:1px solid rgba(160,190,255,.45);box-shadow:0 4px 16px rgba(0,0,0,.5)}' +
    '#pvpHud.pc .hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 11px;background:rgba(255,217,138,.1);border-bottom:1px solid rgba(255,217,138,.25)}' +
    '#pvpHud.pc .hd .md{font-size:13px;letter-spacing:.2px}#pvpHud.pc .hd .tm{font:800 14px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#fff}' +
    '#pvpHud.pc .bd{padding:7px 11px 9px;display:grid;gap:6px}' +
    '#pvpHud.pc .tm2{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:3px 8px}#pvpHud.pc .tm2 .nm{font-weight:800}' +
    '#pvpHud.pc .tm2 .bars{margin:0;gap:3px}#pvpHud.pc .pb{width:auto;flex:1;min-width:20px;height:8px;border-radius:3px}#pvpHud.pc .tm2 .bars{display:flex}' +
    '#pvpHud.pc .twr{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px}#pvpHud.pc .twb{width:auto;height:9px;margin:0;border-radius:5px}' +
    '#pvpHud.pc .twr small{font-weight:600;opacity:.85}' +
    '#pvpHud.pc .rsp{padding:6px 8px;border-radius:8px;background:rgba(255,200,90,.12);border:1px solid rgba(255,200,90,.35);color:#ffe0a0;font-weight:700;text-align:center}' +
    '#pvpHud.pc .rsp .rb{height:5px;margin-top:5px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden}#pvpHud.pc .rsp .rb i{display:block;height:100%;background:#ffc85a;transition:width .3s linear}' +
    '#pvpHud.pc .rsp b{font-size:16px}#pvpHud.pc .ft{display:flex;align-items:center;justify-content:flex-end;gap:8px}#pvpHud.pc .ft .info{flex:1;white-space:normal;font-size:11.5px}#pvpHud.pc .ft .kd{flex:1;font-size:11.5px;opacity:.9}' +
    '#pvpHud.pc button{padding:4px 12px;background:rgba(60,80,140,.6);border-color:rgba(140,170,255,.6)}#pvpHud.pc button:hover{background:rgba(80,110,190,.8)}' +
    '#pvpScore{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:5;pointer-events:none;color:#fff;text-shadow:0 1px 3px #000;text-align:center;font:600 12px/1.2 system-ui,sans-serif}' +
    '#pvpScore .sc{display:inline-flex;align-items:stretch;border-radius:10px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.25)}' +
    '#pvpScore .t{display:flex;align-items:center;gap:8px;padding:4px 12px;font-weight:800;font-size:13px}' +
    '#pvpScore .t b{font:900 24px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;min-width:30px}' +
    '#pvpScore .tA{background:linear-gradient(90deg,rgba(30,58,106,.95),rgba(74,154,255,.85))}#pvpScore .tA b{text-align:right}' +
    '#pvpScore .tB{background:linear-gradient(90deg,rgba(255,90,74,.85),rgba(106,30,26,.95))}#pvpScore .tB b{text-align:left}' +
    '#pvpScore .mid{display:flex;flex-direction:column;justify-content:center;padding:3px 10px;background:rgba(12,16,28,.92);min-width:62px}' +
    '#pvpScore .mid .clk{font:800 15px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums}#pvpScore .mid small{font-size:10px;opacity:.75;margin-top:2px}' +
    '#pvpScore .t.me{box-shadow:inset 0 -3px 0 #fff}' +
    '#pvpScore .twl{width:min(260px,60vw);height:6px;margin:5px auto 0;border-radius:4px;background:rgba(0,0,0,.45);overflow:hidden;border:1px solid rgba(255,255,255,.2)}#pvpScore .twl i{display:block;height:100%}' +
    '#pvpScore .cap{margin-top:3px;font-size:11px;opacity:.9}' +
    '.pvp-badge{display:inline-flex;align-items:center;gap:4px;font-weight:700;vertical-align:middle;white-space:nowrap}' +
    '.pvp-badge svg{flex:none}.pvp-rank{display:flex;align-items:center;gap:12px;padding:8px 10px;margin:6px 0 10px;border-radius:10px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.12)}' +
    '.pvp-rank .pr-main{flex:1;min-width:0}.pvp-rank b.tier{font-size:17px}.pvp-prog{height:7px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden;margin:4px 0 2px}' +
    '.pvp-prog i{display:block;height:100%}.pvp-modes .shop-item small{white-space:normal}.pvp-modes .wait{font-weight:700;color:#ffd98a}' +
    '.pvp-tiers{display:grid;grid-template-columns:repeat(3,auto);gap:4px 14px;margin:4px 0 8px}' +
    '#pvpSum{position:fixed;left:50%;top:44%;transform:translate(-50%,-50%) scale(.92);opacity:0;z-index:60;min-width:260px;max-width:min(440px,calc(100vw - 32px));' +
    'max-height:calc(100vh - 40px);overflow:auto;padding:14px 16px 12px;border-radius:12px;background:rgba(14,18,30,.94);border:1px solid rgba(150,190,255,.55);' +
    'box-shadow:0 6px 24px rgba(0,0,0,.55);color:#eef2ff;font-size:14px;transition:opacity .25s,transform .25s;pointer-events:auto}' +
    '#pvpSum.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#pvpSum h3{margin:0 26px 2px 0;font-size:19px}#pvpSum .sub{opacity:.8;margin:0 0 8px}' +
    '#pvpSum .x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#eef2ff;font-size:16px;cursor:pointer}' +
    '#pvpSum table{width:100%;border-collapse:collapse;margin:4px 0 8px;font-size:13px;table-layout:fixed}#pvpSum th.n,#pvpSum td.n{width:17%;text-align:right}#pvpSum th{text-align:left;font-weight:700;padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.18)}' +
    '#pvpSum td{padding:3px 4px}#pvpSum td.n{text-align:right;font-variant-numeric:tabular-nums}#pvpSum tr.me td{background:rgba(255,255,255,.07)}' +
    '#pvpSum .up{color:#8af08a}#pvpSum .down{color:#ff8a7a}#pvpSum .mine{display:flex;align-items:center;gap:10px;margin:6px 0 10px;padding:8px;border-radius:9px;background:rgba(255,255,255,.06)}' +
    '#pvpSum .go{width:100%;margin-top:4px}';
  document.head.appendChild(st);
}
// Rang-Stein als kleines Bild (sechseckiger Stein in der Farbe der Stufe)
function pvpGemSvg(t, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">` +
    `<path d="M10 1.5l7.4 4.25v8.5L10 18.5l-7.4-4.25v-8.5z" fill="${t.color}" stroke="${t.dark}" stroke-width="1.6"/>` +
    `<path d="M10 4.6l4.7 2.7v5.4L10 15.4l-4.7-2.7V7.3z" fill="rgba(255,255,255,.28)"/>` +
    `<path d="M10 4.6v10.8M5.3 7.3l9.4 5.4M14.7 7.3l-9.4 5.4" stroke="rgba(0,0,0,.18)" stroke-width=".8"/></svg>`;
}
function pvpBadgeHtml(pts, size = 18, withName = true) {
  const t = pvpTier(pts);
  return `<span class="pvp-badge" style="color:${t.color}">${pvpGemSvg(t, size)}${withName ? `<span>${t.name}</span>` : ''}</span>`;
}
// derselbe Stein auf der Zeichenfläche (Namen über den Köpfen)
function pvpDrawGem(ctx, x, y, t) {
  ctx.save();
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6);
  }
  ctx.closePath();
  ctx.fillStyle = t.color;
  ctx.strokeStyle = t.dark;
  ctx.lineWidth = 1.4;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x - 1.6, y - 2.6, 2.2, 2.6);
  ctx.restore();
}
// Name über dem Kopf in der Turnierarena: Teamfarbe und Rang (aus dem Spiel)
function pvpLabelInfo(e) {
  const M = game.pvpMatch;
  if (!M || !e) return null;
  const pid = e === game.player ? M.me : e.remote ? e.peerId : null;
  const r = pid != null ? M.roster.get(pid) : null;
  if (!r) return null;
  const T = PVP_TEAM[r.team];
  return { color: T.color, bar: T.bar, tier: pvpTier(e === game.player ? pvpSave().pts : r.rt) };
}
const pvpUi = { el: null, key: '', open: false, confirm: false, touch: false, placeAt: 0 };
function pvpHudPlace(el) {
  const box = (id) => {
    const e = document.getElementById(id);
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };
  if (pvpUi.touch) {
    const c = box('hudChar');
    let bottom = c ? c.bottom : 90;
    for (const id of ['buffList', 'partyFrame']) {
      const r = box(id);
      if (r && c && r.left < c.right) bottom = Math.max(bottom, r.bottom);
    }
    el.style.left = Math.round(Math.max(6, c ? c.left : 6)) + 'px';
    el.style.top = Math.round(bottom + 4) + 'px';
    el.style.bottom = 'auto';
    return;
  }
  const r = box('chatBox');
  if (r) {
    el.style.left = Math.round(Math.max(4, r.left)) + 'px';
    el.style.top = 'auto';
    el.style.bottom = Math.round(window.innerHeight - r.top + 6) + 'px';
  } else {
    const c = box('hudChar');
    el.style.left = Math.round(c ? c.left : 8) + 'px';
    el.style.top = Math.round((c ? c.bottom : 120) + 6) + 'px';
    el.style.bottom = 'auto';
  }
}
function pvpHudBuild() {
  pvpCss();
  const el = document.createElement('div');
  el.id = 'pvpHud';
  el.hidden = true;
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pv]');
    const a = b ? b.dataset.pv : 'tap';
    const M = game.pvpMatch;
    if (!M) return;
    if (a === 'home') { pvpReturnHome(); return; }
    if (a === 'leave') {
      if (M.ranked && M.state !== 'end' && !pvpUi.confirm) { pvpUi.confirm = true; pvpUi.open = true; }
      else { pvpUi.confirm = false; pvpUi.open = false; pvpLeave('knopf'); }
    } else if (a === 'x') {
      pvpUi.open = !pvpUi.open;
      pvpUi.confirm = false;
    } else if (pvpUi.touch) {
      pvpUi.open = !pvpUi.open;
      pvpUi.confirm = false;
    }
    pvpUi.key = '';
    pvpHud();
  });
  document.body.appendChild(el);
  // seit 13.89: Anzeigetafel oben in der Mitte (nur am PC): Punkte beider Teams, Zeit, Turm
  const sc = document.createElement('div');
  sc.id = 'pvpScore';
  sc.hidden = true;
  document.body.appendChild(sc);
  pvpUi.score = sc;
  const due = () => { pvpUi.placeAt = 0; };
  window.addEventListener('resize', due);
  window.addEventListener('orientationchange', due);
  pvpUi.el = el;
}
// Leben eines Spielers im Spiel (0–1, tot: -1)
function pvpLife(M, e) {
  if (e.left) return -1;
  if (e.pid === M.me) {
    const p = game.player;
    return p.dead ? -1 : p.hp / Math.max(1, game.stats ? game.stats.maxHp : p.hp);
  }
  const rp = net.players.get(e.pid);
  if (!rp || rp.dead || e.dead) return -1;
  return Math.max(0, Math.min(1, rp.hp / Math.max(1, rp.maxHp)));
}
function pvpBarsHtml(M, team) {
  const T = PVP_TEAM[team];
  return '<span class="bars">' + [...M.roster.values()].filter((e) => e.team === team && !e.left).map((e) => {
    const f = pvpLife(M, e);
    return `<span class="pb${f < 0 ? ' dead' : ''}${e.pid === M.me ? ' me' : ''}" title="${escapeHtml(e.name)}"><i style="width:${Math.round(Math.max(0, f) * 20) * 5}%;background:${T.bar}"></i></span>`;
  }).join('') + '</span>';
}
function pvpHud() {
  if (!pvpUi.el) pvpHudBuild();
  const el = pvpUi.el;
  const M = game.pvpMatch;
  if (!M || !game.running) {
    if (!el.hidden) {
      el.hidden = true;
      pvpUi.open = false;
      pvpUi.confirm = false;
    }
    if (pvpUi.score && !pvpUi.score.hidden) pvpUi.score.hidden = true;
    return;
  }
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  if (touch !== pvpUi.touch || !el.className) {
    pvpUi.touch = touch;
    el.className = touch ? 'touch' : 'pc';
    pvpUi.key = '';
    pvpUi.placeAt = 0;
  }
  const p = game.player;
  const def = PVP_MODES[M.mode];
  const t = game.time;
  const time = M.state === 'count' ? `Start in ${Math.max(0, Math.ceil(M.fightAt - t))} s` : M.state === 'end' ? 'Ende' : pvpClock(M.endAt - t);
  let info = '';
  if (M.state === 'end') info = `Zurück in ${Math.max(0, Math.ceil(M.returnAt - t))} s`;
  else if (p.dead && M.respawnAt) info = `Wiedereinstieg in ${Math.max(0, Math.ceil(M.respawnAt - t))} s`;
  else if (p.dead) info = 'Ausgeschieden – du schaust zu';
  const tw = M.tower;
  const twCol = tw.owner ? PVP_TEAM[tw.owner].bar : '#c8c8d8';
  const inCircle = !M.ranked && M.state === 'fight' && !p.dead && Math.hypot(p.x - pvpTowerAt(M.slot).x, p.y - pvpTowerAt(M.slot).y) <= PVP.capR * TILE;
  const towerTxt = M.ranked ? '' : `<span>Turm ${Math.floor(tw.pct)} %${tw.owner ? ' ' + PVP_TEAM[tw.owner].name : ''}</span>${tw.a && tw.b ? ' · <span>umkämpft</span>' : inCircle ? ' · <span>du stehst im Kreis</span>' : ''}`;
  const score = M.ranked ? '' : `${M.score.A} : ${M.score.B}`;
  const bars = pvpBarsHtml(M, 'A') + '·' + pvpBarsHtml(M, 'B');
  const key = [touch, time, info, towerTxt, score, bars, pvpUi.open, pvpUi.confirm, M.state].join('|');
  if (key !== pvpUi.key) {
    pvpUi.key = key;
    const leaveTxt = M.state === 'end' ? 'Zurück in die Stadt' : pvpUi.confirm ? `Ja, gehen (−${PVP.loss} Punkte)` : 'Verlassen';
    const leaveBtn = M.state === 'end' ? '<button type="button" data-pv="home">Zurück in die Stadt</button>' : `<button type="button" data-pv="leave">${leaveTxt}</button>`;
    const du = (team) => (team === M.team ? ' (du)' : '');
    const teams = `<span class="ta">Blau${du('A')}</span>${pvpBarsHtml(M, 'A')}${score ? `<b>${score}</b>` : '<b>gegen</b>'}${pvpBarsHtml(M, 'B')}<span class="tb">Rot${du('B')}</span>`;
    const twBar = M.ranked ? '' : `<span class="tw">${towerTxt}<span class="twb"><i style="width:${Math.round(tw.pct)}%;background:${twCol}"></i></span></span>`;
    if (touch) {
      el.innerHTML = `<span class="md">${def.tag}</span><span>${time}</span>` + (score ? `<b><span class="ta">${M.score.A}</span>:<span class="tb">${M.score.B}</span></b>` : '') +
        (M.ranked ? '' : `<span class="tw" style="color:${tw.owner ? PVP_TEAM[tw.owner].color : '#e8e0ff'}">${Math.floor(tw.pct)} %</span>`) + (info ? `<span class="info">${info}</span>` : '') +
        `<button type="button" class="x" data-pv="x" aria-label="Mehr">${pvpUi.open ? '▴' : '▾'}</button>` +
        (pvpUi.open ? `<div class="det">${teams}${twBar}${pvpUi.confirm ? '<span class="info">Wer geht, verliert den Rangkampf.</span>' : ''}${leaveBtn}</div>` : '');
    } else {
      // seit 13.89 eine aufgeräumte Karte statt einer Zeile
      const mine = M.roster.get(M.me);
      const kd = mine ? `Du: <b>${mine.kills}</b> Kills · <b>${mine.deaths}</b> Tode` : '';
      const row = (team) => `<span class="nm ${team === 'A' ? 'ta' : 'tb'}">${PVP_TEAM[team].name}${du(team)}</span>${pvpBarsHtml(M, team)}`;
      const twRow = M.ranked ? '' : `<div class="twr"><span class="tw">Turm</span><span class="twb"><i style="width:${Math.round(tw.pct)}%;background:${twCol}"></i></span>` +
        `<small>${Math.floor(tw.pct)} %${tw.owner ? ' · ' + PVP_TEAM[tw.owner].name : ''}${tw.a && tw.b ? ' · umkämpft' : inCircle ? ' · du lädst' : ''}</small></div>`;
      let rsp = '';
      if (M.state !== 'end' && p.dead && M.respawnAt) {
        const left = Math.max(0, M.respawnAt - t);
        rsp = `<div class="rsp">Wiedereinstieg in <b>${Math.ceil(left)}</b> s<div class="rb"><i style="width:${Math.round((1 - left / PVP.respawn) * 100)}%"></i></div></div>`;
      } else if (info) rsp = `<div class="rsp">${info}</div>`;
      el.innerHTML = `<div class="hd"><span class="md">${def.name}</span><span class="tm">${time}</span></div>` +
        `<div class="bd"><div class="tm2">${row('A')}${row('B')}</div>${twRow}${rsp}` +
        `<div class="ft">${pvpUi.confirm ? '<span class="info">Wer geht, verliert den Rangkampf.</span>' : `<span class="kd">${kd}</span>`}${leaveBtn}</div></div>`;
    }
    pvpUi.placeAt = 0;
  }
  if (el.hidden) {
    el.hidden = false;
    pvpUi.placeAt = 0;
  }
  if (!pvpUi.placeAt || t - pvpUi.placeAt > 2) {
    pvpUi.placeAt = t || 0.001;
    pvpHudPlace(el);
  }
  pvpScoreBoard(M, touch, time);
}
// Anzeigetafel oben in der Mitte (PC): Turmschlacht = Kills je Team bis 100 und Turm, Rangkampf = wer noch steht
function pvpScoreBoard(M, touch, time) {
  const sc = pvpUi.score;
  if (!sc) return;
  if (touch) {
    if (!sc.hidden) sc.hidden = true;
    return;
  }
  const alive = (team) => [...M.roster.values()].filter((e) => e.team === team && !e.left && pvpLife(M, e) >= 0).length;
  const a = M.ranked ? alive('A') : M.score.A;
  const b = M.ranked ? alive('B') : M.score.B;
  const tw = M.tower;
  const key = [a, b, time, M.ranked ? '' : Math.floor(tw.pct) + tw.owner, M.team].join('|');
  if (key !== pvpUi.scoreKey) {
    pvpUi.scoreKey = key;
    const me = (team) => (team === M.team ? ' me' : '');
    const sub = M.ranked ? 'stehen noch' : `bis ${PVP.funKills} Kills`;
    const twCol = tw.owner ? PVP_TEAM[tw.owner].bar : '#c8c8d8';
    sc.innerHTML = `<div class="sc"><span class="t tA${me('A')}">Blau <b>${a}</b></span>` +
      `<span class="mid"><span class="clk">${time}</span><small>${sub}</small></span>` +
      `<span class="t tB${me('B')}"><b>${b}</b> Rot</span></div>` +
      (M.ranked ? '' : `<div class="twl"><i style="width:${Math.round(tw.pct)}%;background:${twCol}"></i></div>` +
        `<div class="cap">Turm ${Math.floor(tw.pct)} %${tw.owner ? ' · ' + PVP_TEAM[tw.owner].name : ''}</div>`);
  }
  if (sc.hidden) sc.hidden = false;
}

// --- Ergebnis: Sieger, Kills und Tode je Spieler, Rangpunkte mit Stein, Knopf zurück in die Stadt ---------------
function pvpSummary(M) {
  pvpCss();
  let el = document.getElementById('pvpSum');
  if (el) el.remove();
  const R = M.result;
  const def = PVP_MODES[M.mode];
  el = document.createElement('div');
  el.id = 'pvpSum';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Ergebnis der Turnierarena');
  const title = R.won === true ? 'Sieg!' : R.won === false ? 'Niederlage' : 'Unentschieden';
  const why = { sieg: 'Das letzte Team steht', zeit: 'Die Zeit ist um', turm: 'Der Turm ist voll geladen', kills: `${PVP.funKills} Kills erreicht`, flucht: 'Das andere Team hat die Arena verlassen', gleich: 'Beide Teams sind gefallen' }[R.why] || '';
  const delta = (e) => {
    if (!M.ranked) return '';
    const won = e.left ? false : R.w ? e.team === R.w : null;
    const lost = Math.min(PVP.loss, e.pid === M.me ? R.before : e.rt);
    if (won === true) return `<td class="n up">+${PVP.win}</td>`;
    return won === false && lost > 0 ? `<td class="n down">−${lost}</td>` : '<td class="n">±0</td>';
  };
  const table = (team) => {
    const T = PVP_TEAM[team];
    const rows = [...M.roster.values()].filter((e) => e.team === team).map((e) => {
      // Stein nach dem Spiel (eigener Stand bzw. der Stand der anderen nach derselben Regel)
      const rt = e.pid === M.me ? R.after : e.left ? pvpRate(e.rt, false) : pvpRate(e.rt, R.w ? e.team === R.w : null);
      return `<tr class="${e.pid === M.me ? 'me' : ''}"><td>${M.ranked ? pvpBadgeHtml(rt, 14, false) : ''} ${escapeHtml(e.name)}${e.left ? ' <small>(gegangen)</small>' : ''}</td>` +
        `<td class="n">${e.kills}</td><td class="n">${e.deaths}</td>${delta(e)}</tr>`;
    }).join('');
    return `<table><tr><th style="color:${T.color}">Team ${T.name}${!M.ranked ? ` · ${M.score[team]} Kills` : ''}${R.w === team ? ' · Sieger' : ''}</th>` +
      `<th class="n">Kills</th><th class="n">Tode</th>${M.ranked ? '<th class="n">Punkte</th>' : ''}</tr>${rows}</table>`;
  };
  const mine = M.ranked
    ? `<div class="mine">${pvpGemSvg(pvpTier(R.after), 34)}<div><b style="color:${pvpTier(R.after).color}">${pvpTier(R.after).name}</b> · ${pvpFmt(R.after)} Rangpunkte<br>` +
      `<span class="${R.after > R.before ? 'up' : R.after < R.before ? 'down' : ''}">${R.after >= R.before ? '+' : '−'}${pvpFmt(Math.abs(R.after - R.before))} Punkte</span>` +
      `${pvpTier(R.after) !== pvpTier(R.before) ? ` · vorher ${pvpTier(R.before).name}` : ''}</div></div>`
    : '<p class="sub">Die Turmschlacht zählt nicht für den Rang – nur für den Spaß.</p>';
  el.innerHTML = `<button class="x" type="button" aria-label="Schließen">✕</button>` +
    `<h3 style="color:${R.won === true ? '#ffd34d' : R.won === false ? '#ff8a7a' : '#eef2ff'}">${title}</h3>` +
    `<p class="sub">${def.name} · ${PVP_DIM[M.mode].name}${why ? ' · ' + why : ''}</p>` + mine + table('A') + table('B') +
    `<button type="button" class="btn btn-primary go" data-pv="home">Zurück in die Stadt</button>`;
  document.body.appendChild(el);
  const close = () => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
  el.querySelector('[data-pv="home"]').addEventListener('click', (e) => { e.stopPropagation(); close(); pvpReturnHome(); });
  requestAnimationFrame(() => el.classList.add('on'));
}

// --- Fenster beim Turniermeister ------------------------------------------------------------------------------
const pvpTr = (de, key) => (typeof i18n !== 'undefined' && i18n.lang !== 'de' && typeof trText === 'function' ? trText(key) : de);
function pvpRankHtml(A) {
  const pts = A.pts || 0;
  const t = pvpTier(pts);
  const i = PVP_TIERS.indexOf(t);
  const next = PVP_TIERS[i + 1];
  const frac = next ? (pts - t.min) / (next.min - t.min) : 1;
  return `<div class="pvp-rank">${pvpGemSvg(t, 40)}<div class="pr-main"><b class="tier" style="color:${t.color}">${t.name}</b> · ${pvpFmt(pts)} Rangpunkte` +
    `<div class="pvp-prog"><i style="width:${Math.round(frac * 100)}%;background:${t.color}"></i></div>` +
    // jeder Teil ein eigener Text (Übersetzung je Teil, sprache.js)
    `<small><span>${next ? `Noch ${pvpFmt(next.min - pts)} Punkte bis ${next.name}` : 'Höchste Stufe erreicht'}</span> · <span>Siege ${A.w || 0}</span> · <span>Niederlagen ${A.l || 0}</span></small></div></div>`;
}
function pvpRenderMaster() {
  const p = game.player;
  const A = pvpSave(p);
  const body = $('npcBody');
  const online = netOnline();
  const st = pvpState.status;
  const M = game.pvpMatch;
  const low = p.level < PVP.minLevel;
  const queued = st ? st.in : '';
  const party = game.party && game.party.members && game.party.members.length > 1;
  let html = `<p class="quest-step">Turnierarena · Spieler gegen Spieler · ab Stufe ${PVP.minLevel}</p>` +
    `<p>„Hier kämpfst du gegen andere Spieler – ehrlich, Team gegen Team. Gold gibt es bei mir nicht, nur Ruhm: Jeder Sieg im Rangkampf bringt dir Rangpunkte.“</p>` +
    pvpRankHtml(A);
  if (!online) {
    html += `<p class="form-error">Die Turnierarena braucht Mitspieler. Geh über „Server“ online in einen Kanal – dann kannst du dich hier anmelden.</p>` +
      `<button type="button" class="btn btn-primary" data-pvn="net">Server öffnen</button>`;
  } else if (M) {
    html += `<p class="gear-msg success">Du kämpfst gerade in der Turnierarena.</p>`;
  } else {
    html += `<div class="shop pvp-modes">` + PVP_MODE_IDS.map((id) => {
      const def = PVP_MODES[id];
      const n = st ? st.q[id] | 0 : null;
      const mine = queued === id;
      const wait = pvpState.pending === id;
      const rules = def.ranked
        ? `${PVP_DIM[id].name} · Wer fällt, scheidet aus. Das letzte Team gewinnt. Sieg +${PVP.win}, Niederlage −${PVP.loss} Punkte.`
        : `${PVP_DIM[id].name} · Blau gegen Rot, ohne Rang. Lade den Turm in der Mitte auf 100 % oder hol 100 Kills. Nach dem Fall geht es in der eigenen Basis weiter. Ab ${PVP.funMin} Spielern, Neue füllen das kleinere Team.`;
      const runTxt = st && st.run && st.run[id] ? (id === 'f4' && st.fun ? ` · <span>läuft gerade (${st.fun[0]} gegen ${st.fun[1]})</span>` : ' · <span>läuft gerade</span>') : '';
      // „Anmelden“ heißt hier Warteschlange, nicht Konto: in anderen Sprachen eigener Eintrag (no-tr, pvpTr)
      const btn = mine ? `<button class="mini-btn no-tr" type="button" data-pvq="">${pvpTr('Abmelden', 'Abmelden (Warteschlange)')}</button>`
        : `<button class="mini-btn no-tr" type="button" data-pvq="${id}" ${low || wait || (queued && queued !== id) ? 'disabled' : ''}>${wait ? '…' : pvpTr('Anmelden', 'Anmelden (Warteschlange)')}</button>`;
      return `<div class="shop-item"><strong>${def.name}</strong>` +
        `<small>${rules}</small><small><span class="wait">${n == null ? 'Wartend: …' : `Wartend: ${n}`}</span>${runTxt}${mine ? ' · <span>du wartest</span>' : ''}</small>` +
        `<div class="buy">${btn}</div></div>`;
    }).join('') + `</div>`;
    if (low) html += `<p class="hint-text">Die Turnierarena öffnet sich ab Stufe ${PVP.minLevel}.</p>`;
    if (party) html += `<p class="hint-text">Deine Gruppe kämpft im selben Team, wenn ihr euch für dieselbe Art anmeldet.</p>`;
    if (queued) html += `<p class="hint-text">Sobald genug Spieler warten, holt dich der Turniermeister in die Arena – du kannst solange weiterspielen.</p>`;
  }
  html += `<h3>Rangstufen</h3><div class="pvp-tiers">` + PVP_TIERS.map((t) => `<span>${pvpBadgeHtml(t.min, 16)} <small>ab ${pvpFmt(t.min)}</small></span>`).join('') + `</div>` +
    `<p class="hint-text">Ein Rang für alle Rangkämpfe (1 gegen 1, 2 gegen 2, 3 gegen 3). Wer fällt, verliert in der Turnierarena weder Erfahrung noch Gold. Wer einen Rangkampf verlässt, verliert ihn.</p>`;
  body.innerHTML = html;
  body.querySelectorAll('[data-pvq]').forEach((b) => b.addEventListener('click', () => pvpQueue(b.dataset.pvq || null)));
  const nb = body.querySelector('[data-pvn]');
  if (nb) nb.addEventListener('click', () => { ui.closePanels(); if (typeof ui.toggle === 'function') ui.toggle('panelNet'); });
}
// Anmelden (mode) bzw. Abmelden (null)
function pvpQueue(mode) {
  const p = game.player;
  if (!netOnline()) return;
  if (!mode) {
    pvpToHost({ k: 'pvx' });
    if (pvpState.status) pvpState.status.in = '';
    pvpRefreshNpc();
    return;
  }
  if (p.level < PVP.minLevel || game.pvpMatch) return;
  const A = pvpSave(p);
  // Rückkehr nach dem Spiel: hierher (zum Turniermeister)
  if (pvpSlotAt(p.x, p.y) < 0) A.ret = { x: Math.round(p.x), y: Math.round(p.y) };
  pvpState.pending = mode;
  pvpState.pendingAt = game.time;
  const tag = game.party && game.party.members && game.party.members.length > 1 ? game.party.leader : '';
  pvpToHost({ k: 'pvq', m: mode, n: p.name, c: p.classId, l: p.level, r: A.pts || 0, g: tag });
  ui.log(`Angemeldet: ${PVP_MODES[mode].name}. Du wirst geholt, sobald genug Spieler warten.`, 'info');
  pvpRefreshNpc();
}
function pvpRefreshNpc() {
  const panel = $('panelNpc');
  if (panel && !panel.hidden && pvpState.npcOpen && pvpState.npcOpen === game.openNpcRef) pvpRenderMaster();
}
const _pvpOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  if (npc && npc.id === 'pvp') {
    this.closePanels();
    $('npcTitle').textContent = npc.name;
    pvpState.npcOpen = npc;
    game.openNpcRef = npc;
    if (netOnline()) pvpToHost({ k: 'pvi' });
    pvpRenderMaster();
    this.renderNpcQuests(npc);
    $('panelNpc').hidden = false;
    return;
  }
  pvpState.npcOpen = null;
  game.openNpcRef = null;
  return _pvpOpenNpc.call(this, npc);
};
NPC_TALK_LABEL.pvp = 'Turnier';
NPC_LINES.pvp = ['Ehre gewinnt man nur gegen echte Gegner.', 'Bronze ist nur der Anfang.'];

// --- Charakterfenster: Rang neben dem Namen, auf der Seite „Werte“ die Turnierarena -----------------------------
if (ui.renderCharPanel) {
  const _pvpRenderChar = ui.renderCharPanel;
  ui.renderCharPanel = function () {
    _pvpRenderChar.call(this);
    const p = game.player;
    const body = $('charBody');
    if (!p || !body) return;
    pvpCss();
    const A = pvpSave(p);
    const head = body.querySelector('.char-head span');
    if (head) head.insertAdjacentHTML('beforeend', ` · ${pvpBadgeHtml(A.pts || 0, 16)}`);
    const page = body.querySelector('.char-page[data-page="werte"]');
    if (page) {
      page.insertAdjacentHTML('beforeend', `<h3>Turnierarena</h3>` + pvpRankHtml(A) +
        `<dl class="stats"><div><dt>Höchster Stand</dt><dd>${pvpFmt(A.best || 0)}</dd></div>` +
        `<div><dt>Turmschlachten</dt><dd>${A.fn || 0}${A.fw ? ` (${A.fw} gewonnen)` : ''}</dd></div></dl>`);
    }
  };
}

// --- Kristall über dem Turm: füllt sich von unten in der Farbe des Teams, das ihn auflädt -----------------------
// 3D: ein heller, durchsichtiger Kristall und darin ein farbiger, der mit der Ladung wächst (eigenes Modell, wie die
// Lichtwand des Duells in drei-figuren.js); dazu ein schwaches Licht in der Teamfarbe. Nur im eigenen Spiel sichtbar.
let pvpTower3 = null;
function pvpBuildTower3() {
  const g = new THREE.Group();
  // Hülle: heller Kristall mit dunklem Rand (auch auf hellem Gras gut zu sehen), darin der farbige Kern
  const shellGeo = new THREE.OctahedronGeometry(0.62, 0);
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.42, depthWrite: false }));
  shell.scale.set(0.8, 1.55, 0.8);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: 0x1a2030 }));
  edge.scale.copy(shell.scale);
  const coreGeo = new THREE.OctahedronGeometry(0.56, 0).translate(0, 0.56, 0);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const coreHolder = new THREE.Group();
  coreHolder.position.y = -0.96;
  coreHolder.add(core);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));
  g.add(coreHolder, shell, edge, glow);
  V3.scene.add(g);
  return { g, shell, core, coreHolder, glow, col: new THREE.Color() };
}
function pvpSync3() {
  const M = game.pvpMatch;
  const show = !!M && M.mode === 'f4' && V3.on;
  if (!show) {
    if (pvpTower3) pvpTower3.g.visible = false;
    return;
  }
  if (!pvpTower3) pvpTower3 = pvpBuildTower3();
  const T = pvpTower3;
  const c = pvpTowerAt(M.slot);
  const t = game.time;
  T.g.visible = true;
  T.g.position.set(c.x * U3, PVP_TOWER_H + 0.95 + Math.sin(t * 1.6) * 0.08, c.y * U3);
  T.g.rotation.y = t * 0.6;
  const k = Math.max(0, Math.min(1, M.tower.pct / 100));
  T.col.set(M.tower.owner ? PVP_TEAM[M.tower.owner].bar : '#c8c8d8');
  T.core.material.color.copy(T.col);
  T.glow.material.color.copy(T.col);
  // umkämpft: der Schein flackert
  T.glow.material.opacity = 0.05 + 0.12 * k + (M.tower.a && M.tower.b ? 0.06 * (1 + Math.sin(t * 10)) : 0);
  // Ladung: der innere Kristall wächst von unten (0 % kaum sichtbar)
  const sy = Math.max(0.04, k) * 1.55;
  T.coreHolder.scale.set(0.66 + 0.1 * k, sy, 0.66 + 0.1 * k);
}
if (typeof syncDuel3 === 'function') {
  const _pvpSyncDuel3 = syncDuel3;
  syncDuel3 = function () {
    _pvpSyncDuel3();
    pvpSync3();
  };
}
// 2D: derselbe Kristall über dem Turm, nach allen Figuren gemalt (über drawParticles, nur ohne 3D)
function pvpDraw2d(ctx) {
  const M = game.pvpMatch;
  if (!M || M.mode !== 'f4') return;
  const c = pvpTowerAt(M.slot);
  const t = game.time;
  const x = c.x;
  const y = c.y + 0.3 * TILE - 110 + Math.sin(t * 1.6) * 3;
  const k = Math.max(0, Math.min(1, M.tower.pct / 100));
  const col = M.tower.owner ? PVP_TEAM[M.tower.owner].bar : '#c8c8d8';
  const w = 13;
  const h = 22;
  ctx.save();
  // Schein
  const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.2 + 0.35 * k;
  ctx.fillStyle = g;
  ctx.fillRect(x - 34, y - 34, 68, 68);
  ctx.globalAlpha = 1;
  const diamond = () => {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w, y);
    ctx.closePath();
  };
  diamond();
  ctx.fillStyle = 'rgba(232,240,255,0.35)';
  ctx.fill();
  // Füllung von unten
  ctx.save();
  diamond();
  ctx.clip();
  ctx.fillStyle = col;
  ctx.fillRect(x - w, y + h - 2 * h * k, 2 * w, 2 * h * k);
  ctx.restore();
  diamond();
  ctx.strokeStyle = 'rgba(20,24,40,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(x - 3, y - h * 0.55, 2.5, h * 0.5);
  ctx.restore();
}
if (typeof drawParticles === 'function') {
  const _pvpDrawParticles = drawParticles;
  drawParticles = function (ctx) {
    if (!V3.on) pvpDraw2d(ctx);
    _pvpDrawParticles(ctx);
  };
}

// --- Aussehen des Turniermeisters ---------------------------------------------------------------------------------
// Veteranin der Zweikämpfe: zweifarbiger Wappenrock (links blau, rechts rot) über einem Kettenhemd, kurzer Umhang,
// Stirnreif, ein Zweihänder; auf der Plakette über dem Kopf zwei Schilde in Blau und Rot
STAND_COLORS.pvp = '#2a3a6a';
NPC_ART.pvp = (ctx) => villagerArt(ctx, {
  skin: '#c89070', pants: '#2a2a34', boots: '#1e1a18', torso: '#8a929c', sleeve: '#8a929c', gloves: '#4a3a2a', wide: 1.05,
  behind: (ctx) => poly(ctx, [[-10, -25], [10, -25], [12, -8], [-12, -8]], '#3a3a4a'),
  body: (ctx, half) => {
    // Wappenrock: links blau, rechts rot, goldene Naht in der Mitte
    poly(ctx, [[-half + 2, -24], [0, -24], [0, -6], [-half + 1, -7]], '#2f5aa8');
    poly(ctx, [[0, -24], [half - 2, -24], [half - 1, -7], [0, -6]], '#b8322a');
    stroke(ctx, '#e0c36a', 1.1, [[0, -24], [0, -6]]);
    box(ctx, -half, -13, half * 2, 2.4, 1, '#4a3424');
    dot(ctx, 0, -11.8, 1.8, 1.8, '#e0c36a');
  },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#2a1c14', 10);
    box(ctx, cx - 11.6, cy - 6, 23.2, 2.2, 1, '#c9a35a');
    dot(ctx, cx, cy - 5, 1.8, 1.8, '#7ab8ff');
  },
  extra: (ctx) => heldWeapon(ctx, 'greatsword', 12, -12, -0.3, 3)
});
NPC3.pvp = {
  skin: '#c89070', torso: '#2f5aa8', sleeve: '#8a929c', pants: '#2a2a34', boots: '#1e1a18', gloves: '#4a3a2a',
  hair: { style: 4, color: '#2a1c14' }, band: '#c9a35a', lamellar: '#8a929c', pads: '#b8322a', padTrim: '#e0c36a',
  cape: '#3a3a4a', lining: '#b8322a', sash: '#b8322a', belt: '#4a3424', weapon: { kind: 'greatsword', tier: 3 }, eyeShape: 1
};
NPC_ICONS.pvp = (ctx) => npcBadge(ctx, '#2a3a6a', (c) => {
  // zwei Schilde, blau und rot, leicht gegeneinander geneigt
  for (const [sx, col] of [[-1, '#3a6ac8'], [1, '#d8402f']]) {
    c.save();
    c.translate(sx * 3.6, 0.5);
    c.rotate(sx * 0.22);
    poly(c, [[-4.2, -6], [4.2, -6], [4.2, 0], [0, 6.5], [-4.2, 0]], col);
    stroke(c, '#e8d8a8', 1, [[-4.2, -6], [4.2, -6], [4.2, 0], [0, 6.5], [-4.2, 0], [-4.2, -6]]);
    c.restore();
  }
});
