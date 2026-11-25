// Turm der Verdammten: Gruppen-Instanz ab Stufe 80 auf der Karte Seelenhain – fünfzehn Ebenen in einer Halle.
// Seit Phase 2 (nach 15.51; Wunsch: „allein in 10 Minuten geschafft – zu leicht“): 15 statt 11 Ebenen, viel mehr
// Verdammte in den Wellen, zwei Belagerungen, die drei Hüter zusammen, Hüter und Kharzul deutlich stärker; nach dem
// Sieg die Truhe des Wächters, der Turm-Schmied und eine sichtbare Rückkehr; beim Betreten ein kurzer Anweg zum Turm
// (Truhe, Schmied, Anweg und Rückkehr: js/turmfinale.js).
// Ablauf, Werte und Beute stehen auch in docs/turm.md.
// - Zugang: ein dunkler Turm westlich des Lagers Seelenwacht (Karte 17). Sein Tor öffnet ein Fenster mit Bedingungen
//   (Stufe 80, Sperre 60 Minuten ab dem Betreten wie bei den Instanzen, eigener Eintrag 'turm' in p.instLock), den
//   laufenden Durchgängen im Kanal und den Knöpfen „Neuen Durchgang beginnen“ / „Beitreten“. Ein Durchgang gehört
//   einer Gruppe („nur meine Gruppe“) oder ist offen für alle; höchstens 10 Spieler, auch allein. Beide Seiten dürfen
//   zusammen hinein, in der Halle gibt es keinen Kampf zwischen Spielern (sie liegt außerhalb aller Karten).
// - Hallen: TURM.slots achteckige Hallen im ungenutzten Fels unter den Hallen der Turnierarena (wie die Prüfungsarena
//   nach der Welt gebaut: turmBuild über generateWorld). Vier Tore (N, O, S, W) als eigene Figuren mit Zustand zu/offen.
//   Seit dem Umbau „Turm und Arena mit Zuschauern“ ist die Halle gut ein Drittel größer (46 × 34 statt 38 × 30 Kacheln)
//   und steht im Glutschlund: ringsum Ränge voller Ungeheuer, die jubeln (tribuene.js), dahinter verbrannter Grund mit
//   Lavaadern und Felswände statt eines schwarzen Kastens. Jede Halle hat dafür ein großes Feld (150 × 120 Kacheln), so
//   sieht man auch herausgezoomt keine Nachbarhalle. Boden: Basalt mit Rissen, Asche und Glutspalten (keine Ringe).
// - Ebenen (alle in derselben Halle, 5 s Pause dazwischen), seit Phase 2 fünfzehn (TURM_EBENEN):
//     1–3  Ansturm         je eine Welle Verdammter (14, 16, 18 allein), alle töten
//     4    Der Hüter       Ossarn, der Kettenhüter
//     5    Ansturm         20 Verdammte mit einem Hauptmann
//     6    Seelensteine    vier Seelensteine zerstören (sie rufen Wellen)
//     7    Schlächtersturm 18 Verdammte, davon 7 Schlächter
//     8    Zwillingshüter  Ilmra und Varn zugleich
//     9    Trugsteine      acht Steine, nur zwei sind echt; ein falscher ruft eine Strafwelle
//     10   Belagerung      45 s lang strömen Verdammte aus allen Toren, danach den Rest besiegen
//     11   Schlüsseljagd   Glutwichte strömen herein und tragen Schlüssel; alle vier Tore öffnen
//     12   Die Hauptleute  22 Verdammte mit drei Hauptleuten und fünf Schlächtern
//     13   Die drei Hüter  Ossarn, Ilmra und Varn zugleich
//     14   Letzte Belagerung 60 s, mit mehr Schlächtern und einzelnen Hauptleuten
//     15   Der Wächter     Kharzul, Wächter der Verdammten – seit 15.50 je Schwelle eine eigene Mechanik (kharzul.js):
//                          75 % Totentanz (kreisende Arme aus Seelenfeuer), 50 % Verwandlung in seine wahre Gestalt
//                          (schneller, neue Angriffe), 25 % Seelenbann (auseinanderlaufen). Die alten „Seelenketten“
//                          (unverwundbar, Kettensteine in den Toren) sind aus; ihr Code bleibt für ältere Hosts im Kanal
// - Mehrspieler wie in der Prüfungsarena: Die Hallen führt, wer die Monster führt (allein man selbst, im Kanal der
//   Host, auch der Welt-Wächter). Mitspieler fragen per Nachricht (onSocial, k: 'vt…') und bekommen den Zustand der
//   Halle (vts) und Ereignisse (vte) gemeldet; Belohnungen rechnet jedes Gerät für die eigene Figur.
// - Tod: ohne Verlust, nach TURM.respawn s steht man am Eingang der Halle wieder auf. Sind alle zugleich tot oder ist
//   niemand mehr da, beginnt die Ebene von vorn; nach TURM.emptyMax s ohne Spieler endet der Durchgang.
// Keine Bodenringe, Runen oder Sterne als Effekt (Warnflächen der Bossangriffe bleiben).

const TURM = {
  id: 'turm', name: 'Turm der Verdammten',
  level: 80,            // Mindeststufe und Stufe aller Gegner
  maxPlayers: 10,
  // Felder der Hallen (Kacheln): nebeneinander im Abstand pitch, oben ab DUNGEON_H + y0. Halbe Breite/Höhe der Halle
  // hw/hh (bis zum Umbau 19/15 in Feldern zu 45 × 37 mit 4 Kacheln Abstand – Fläche jetzt × 1,37)
  slots: 4, slotW: 150, slotH: 120, pitch: 150, y0: 310, hw: 23, hh: 17,
  // Lage und Aufbau der Hallen: Host und Mitspieler müssen dieselben haben, sonst stünde man woanders bzw. spielte andere
  // Ebenen (2: Umbau der Hallen in 15.51, 3: fünfzehn Ebenen in Phase 2)
  lage: 3,
  ebenen: 15,
  firstPause: 6,        // Sekunden bis Ebene 1 (frühestens 3 s, nachdem der Erste in der Halle steht)
  pause: 5,             // Pause zwischen zwei Ebenen
  respawn: 8,           // so lange liegt man, dann steht man am Eingang wieder auf
  emptyMax: 180,        // so lange bleibt ein Durchgang ohne Spieler bestehen
  wonStay: 150,         // so lange bleibt die Halle nach dem Sieg offen (Truhe, Schmied), dann bringt der Turm alle hinaus
  netGrace: 12,         // so lange darf ein Teilnehmer ohne Verbindung oder außerhalb der Halle sein
  // Skalierung je weiterem Spieler: Zahl der Gegner, ihr Leben und Schaden, Leben und Schaden der Bosse, Seelensteine
  // (Phase 2: Bosse +90 % Leben und +6 % Schaden je weiterem Spieler, vorher +85 %/+5 %)
  perN: 0.4, perHp: 0.12, perAtk: 0.04, perBoss: 0.9, perBossAtk: 0.06, perStone: 0.5,
  // Wellen: die Zahl der Gegner und ihre Stärke steht je Ebene in TURM_EBENEN (n, str); höchstens cap + capPer × Spieler
  // leben zugleich (Phase 2: 14 + 4 je Spieler, vorher 14 + 3; mit 16 + 4 kam allein die Spieler-KI der Simulation
  // in der Belagerung nicht mehr durch)
  spawnGap: 0.15, spawnStun: 0.35, cap: 14, capPer: 4,
  // Belagerung: Abstand der Nachrücker teilt sich durch 1 + uPer × (Spieler − 1)
  uPer: 0.35,
  // Seelensteine: Anteil am Leben eines gewöhnlichen Steins der Stufe 80
  stoneHp: 0.5, trugHp: 0.3, stoneWaves: [0.75, 0.5, 0.25], echt: 2,
  // Schlüsseljagd: Glutwichte gleichzeitig (allein, je weiterem Spieler), Abstand der Nachrücker, Tötungen je Schlüssel
  imps: 12, impsPer: 0.9, impGap: 0.5, keyFrom: 15, keyTo: 25, keyPer: 0.1,
  // Wächter: Seelenketten bei diesen Anteilen (seit 15.50 keine mehr, vorher 75/50/25 %: kharzul.js), Zeit,
  // Benommenheit, Schlag (Anteil am Höchstleben), Heilung
  ketten: [], kettenZeit: 25, benommen: 6, schlag: 0.6, heilung: 0.1, kettenHp: 0.9, perKette: 0.45, wichte: 20,
  // Belohnung je geschaffter Ebene (× Ebene; Phase 2: 900 statt 1.200 Gold, 15.000 statt 20.000 EP – bei 15 Ebenen
  // zusammen 108.000 Gold und 1,8 Mio. EP statt 79.200 und 1,32 Mio.)
  gold: 900, xp: 15000,
  truheLeg: 0.35,       // Chance, dass das eine Teil der Truhe des Wächters legendär ist (sonst episch; seit 15.74 nur ein Teil)
  glut: '#ff6a2a', seele: '#8fe36a', gate: '#ff8a4a',
  theme: '#3a3238|#8a3a22|#ff5a1a'
};
const turmPl = (n) => Math.max(1, Math.min(TURM.maxPlayers, n | 0 || 1));
const turmScale = (n) => {
  const k = turmPl(n) - 1;
  return { n: 1 + TURM.perN * k, hp: 1 + TURM.perHp * k, atk: 1 + TURM.perAtk * k, boss: 1 + TURM.perBoss * k, bossAtk: 1 + TURM.perBossAtk * k, stone: 1 + TURM.perStone * k };
};
// Die fünfzehn Ebenen: Name und Ziel (Anzeige), art: w Welle, b Boss(e), s Seelensteine, t Trugsteine, u Belagerung,
// k Schlüsseljagd, f Wächter. str: Leben und Schaden der Verdammten dieser Ebene (auch Stein- und Strafwellen).
// Wellen: n Gegner allein, hex mit Hexern, schl Schlächter, haupt Hauptleute (je weitere 4 Spieler einer mehr).
// Belagerung: dauer s, gap s zwischen zwei Nachrückern (allein), Anteile schl/haupt. Bosse: bossHp Faktor je Boss.
// Bis Phase 2 waren es elf: Wellen mit 6, 7, 8, 10 und 12 Verdammten (Stärke 0,8 bis 1,12), dann Hüter, Steine,
// Zwillinge, Trugsteine, Schlüsseljagd und Kharzul.
const TURM_EBENEN = [null,
  { art: 'w', name: 'Ansturm', ziel: 'Besiegt alle Verdammten', n: 14, str: 0.85 },
  { art: 'w', name: 'Ansturm', ziel: 'Besiegt alle Verdammten', n: 16, str: 0.9, hex: 1 },
  { art: 'w', name: 'Ansturm', ziel: 'Besiegt alle Verdammten', n: 18, str: 0.95, hex: 1, schl: 2 },
  { art: 'b', name: 'Der Hüter', ziel: 'Besiegt Ossarn, den Kettenhüter', boss: ['turm_hueter'], str: 1 },
  { art: 'w', name: 'Ansturm', ziel: 'Besiegt alle Verdammten und ihren Hauptmann', n: 20, str: 1.0, hex: 1, schl: 3, haupt: 1 },
  { art: 's', name: 'Seelensteine', ziel: 'Zerstört alle vier Seelensteine', str: 1.02 },
  { art: 'w', name: 'Schlächtersturm', ziel: 'Besiegt die Schlächter und ihr Gefolge', n: 18, str: 1.05, hex: 1, schl: 7 },
  { art: 'b', name: 'Zwillingshüter', ziel: 'Besiegt beide Hüter', boss: ['turm_ilmra', 'turm_varn'], str: 1.05 },
  { art: 't', name: 'Trugsteine', ziel: 'Nur zwei der acht Steine sind echt – findet sie', str: 1.06 },
  { art: 'u', name: 'Belagerung', ziel: 'Haltet 45 Sekunden stand – dann besiegt den Rest', dauer: 45, gap: 1.05, str: 1.06, schl: 0.15, haupt: 0 },
  { art: 'k', name: 'Schlüsseljagd', ziel: 'Glutwichte tragen Schlüssel – öffnet alle vier Tore', str: 1.08 },
  { art: 'w', name: 'Die Hauptleute', ziel: 'Besiegt die Hauptleute und ihre Truppe', n: 22, str: 1.12, hex: 1, schl: 5, haupt: 3 },
  { art: 'b', name: 'Die drei Hüter', ziel: 'Besiegt Ossarn, Ilmra und Varn', boss: ['turm_hueter', 'turm_ilmra', 'turm_varn'], bossHp: 0.6, str: 1.12 },
  { art: 'u', name: 'Letzte Belagerung', ziel: 'Haltet 60 Sekunden stand – dann besiegt den Rest', dauer: 60, gap: 1.3, str: 1.1, schl: 0.15, haupt: 0.03 },
  { art: 'f', name: 'Der Wächter', ziel: 'Besiegt Kharzul, den Wächter der Verdammten', boss: ['turm_waechter'], str: 1.15 }
];
// Ebene der Schlüsseljagd (die Tore gehen dort auf und zu)
const TURM_KEY_E = TURM_EBENEN.findIndex((E) => E && E.art === 'k');

// Gebiet der Hallen (Name oben in der Ecke, Stimmung, Wandfarbe) – außerhalb aller Karten: kein offener Kampf
const TURM_ZONE = {
  id: 'turm', name: TURM.name, levels: 'Gruppen-Instanz · Stufe 80', ground: 'BASALT', ambient: { kind: 'embers', tint: [110, 34, 12, 0.1] },
  wallLook: { wall: { top: '#3a2c30', face: '#140c0e', line: '#b8401e' }, id: 'turm' }
};
ZONES.push(TURM_ZONE);
const TURM_ZI = ZONES.length - 1;
// seit dem Umbau etwas weiter klar (near/far 34/88 statt 26/60) und röter: Ränge und Glutschlund sollen zu sehen sein
if (typeof MOOD3 !== 'undefined') MOOD3.turm = { sky: '#341a18', sun: '#ffb48a', sunI: 0.62, hemi: '#c8a4a0', ground: '#2a1612', hemiI: 0.5, near: 34, far: 88 };
if (typeof MON3_ZONE_THEME !== 'undefined') MON3_ZONE_THEME.turm = 'hell';

// --- Lage ----------------------------------------------------------------------------------------------------------
// Hallen: eine Reihe unter den Hallen der Turnierarena (die Turmwiese endet bei DUNGEON_H + 245), seit dem Umbau
// weiter unten und weit auseinander (bis dahin DUNGEON_H + 262, Felder 45 × 37 im Abstand von 49 Kacheln)
function turmSlotRect(s) {
  const x = WORLD_W + 14 + s * TURM.pitch;
  const y = DUNGEON_H + TURM.y0;
  return { x, y, w: TURM.slotW, h: TURM.slotH, cx: x + TURM.slotW / 2, cy: y + TURM.slotH / 2 };
}
// Halle s, in deren Feld der Punkt (Pixel) liegt, sonst -1 (das Feld ist viel größer als die Halle: Ränge, Abgrund)
function turmSlotAt(px, py) {
  const tx = px / TILE;
  const ty = py / TILE;
  const y0 = DUNGEON_H + TURM.y0;
  if (tx < WORLD_W + 14 || ty < y0 || ty >= y0 + TURM.slotH) return -1;
  const s = Math.floor((tx - WORLD_W - 14) / TURM.pitch);
  if (s < 0 || s >= TURM.slots) return -1;
  return tx < turmSlotRect(s).x + TURM.slotW ? s : -1;
}
const turmInside = (e) => !!e && turmSlotAt(e.x, e.y) >= 0;
// Steht der Punkt (Pixel) auf dem Boden der Halle s (nicht im Fels drumherum)?
const turmOnFloor = (s, px, py) => s >= 0 && turmInHall(s, Math.floor(px / TILE), Math.floor(py / TILE));
const turmMonSlot = (m) => (m ? turmSlotAt(m.homeX ?? m.x, m.homeY ?? m.y) : -1);
// Kachel in der Halle? Ein Achteck (breiter als hoch, wie der Bildschirm)
function turmInHall(s, tx, ty) {
  const R = turmSlotRect(s);
  const ax = Math.abs(tx + 0.5 - R.cx) / TURM.hw;
  const ay = Math.abs(ty + 0.5 - R.cy) / TURM.hh;
  return ax <= 1.001 && ay <= 1.001 && ax + ay <= 1.5;
}
// Punkt in der Halle (fx, fy: −1 … 1 von der Mitte zum Rand), in Pixeln
function turmPt(s, fx, fy) {
  const R = turmSlotRect(s);
  return { x: (R.cx + fx * TURM.hw) * TILE, y: (R.cy + fy * TURM.hh) * TILE };
}
// Die vier Tore: Norden, Osten, Süden, Westen (dx, dy zur Wand; rot = Drehung des Tors in 3D)
const TURM_TORE = [
  { id: 'n', name: 'Nordtor', dx: 0, dy: -1, rot: 0 }, { id: 'o', name: 'Osttor', dx: 1, dy: 0, rot: -Math.PI / 2 },
  { id: 's', name: 'Südtor', dx: 0, dy: 1, rot: Math.PI }, { id: 'w', name: 'Westtor', dx: -1, dy: 0, rot: Math.PI / 2 }
];
// Tor g: Schwelle an der Wand (inset 0) oder ein Stück davor (inset in Kacheln), in Pixeln
function turmGateAt(s, g, inset = 0) {
  const R = turmSlotRect(s);
  const T = TURM_TORE[g];
  return { x: (R.cx + T.dx * (TURM.hw + 0.1 - inset)) * TILE, y: (R.cy + T.dy * (TURM.hh + 0.1 - inset)) * TILE };
}
// Ankunft und Wiederaufstehen: im Süden vor dem Südtor
const turmEntry = (s) => turmPt(s, 0, 1 - 5.5 / TURM.hh);
const turmMid = (s) => turmPt(s, 0, -1 / TURM.hh);
// Plätze der acht Seelensteine (Ring um die Mitte) und der vier Kettensteine (vor den Toren)
function turmStoneSpot(s, k) {
  if (k >= 8) return turmGateAt(s, k - 8, 2.7);
  const a = Math.PI / 8 + k * Math.PI / 4;
  return turmPt(s, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
}
// Der Turm auf Karte 17: Mitte seines Fußes (Kachel), westlich des Lagers Seelenwacht am Weg
const TURM_MAP = WORLD_MAPS.find((m) => m.id === 17);
const TURM_AT = TURM_MAP ? { x: TURM_MAP.region[0] + TURM_MAP.town[0] - 22, y: TURM_MAP.region[1] + TURM_MAP.town[1] - 8 } : { x: 96, y: 540 };
// Fläche auf Karte 17, die der Turm belegt (Kacheln: x, y, w, h) – nur hier ändert sich die Karte
const TURM_FLAECHE = [TURM_AT.x - 4, TURM_AT.y - 5, 9, 11];
const TURM_KEEP = 7;   // so weit (Kacheln) halten Monster und Seelensteine Abstand
const turmDoor = () => ({ x: (TURM_AT.x + 0.5) * TILE, y: (TURM_AT.y + 3.3) * TILE });
// Rückkehr: vor das Tor des Turms
const turmReturn = () => ({ x: (TURM_AT.x + 0.5) * TILE, y: (TURM_AT.y + 4.4) * TILE });

// --- Bau (nach der Welt) -------------------------------------------------------------------------------------------
function turmBuild(w) {
  const P = (x, y) => ({ x: x * TILE, y: y * TILE });
  const G = GROUND;
  for (let s = 0; s < TURM.slots; s++) {
    const R = turmSlotRect(s);
    for (let y = R.y; y < R.y + R.h; y++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const i = y * MAP_W + x;
        w.zoneIdx[i] = TURM_ZI;
        w.deco[i] = DECO.NONE;
        if (!turmInHall(s, x, y)) {
          w.obj[i] = OBJ.CAVEWALL;
          w.ground[i] = G.CAVE;
          continue;
        }
        w.obj[i] = OBJ.NONE;
        // dunkler, rissiger Basalt mit Aschefeldern (weiche Flecken, keine Ringe); zur Wand hin mehr Risse. Glutspalten
        // zeichnet tribuene.js auf den Boden.
        const dx = x + 0.5 - R.cx;
        const dy = y + 0.5 - R.cy;
        const h = tileHash(x, y);
        const fleck = (tileHash(Math.floor((x + 7) / 3), Math.floor((y + 3) / 3)) + tileHash(Math.floor(x / 4), Math.floor((y + 9) / 4))) % 7;
        w.ground[i] = fleck === 0 || (fleck === 1 && h % 3 === 0) ? G.ASH : G.BASALT;
        const rand = Math.abs(dx) / TURM.hw + Math.abs(dy) / TURM.hh;
        if (h % (rand > 1.1 ? 7 : 17) === 0) w.deco[i] = DECO.CRACK;
      }
    }
    // Glut: vier kleine Lavabecken in den schrägen Ecken (nicht begehbar, abseits der Wege)
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const tx = Math.floor(R.cx + sx * 0.66 * TURM.hw);
      const ty = Math.floor(R.cy + sy * 0.66 * TURM.hh);
      for (const k of [-1, 0, 1]) {
        const i = (ty - k * sy) * MAP_W + tx + k * sx;
        if (turmInHall(s, tx + k * sx, ty - k * sy)) { w.ground[i] = G.LAVA; w.deco[i] = DECO.NONE; }
      }
    }
    // Säulen im Kreis (blockieren, gezeichnet als Prop: schwere Basaltsäulen mit Ketten und Glutrissen), Feuerbecken
    // an der Wand
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + k * Math.PI / 4;
      const tx = Math.floor(R.cx + Math.cos(a) * 0.78 * TURM.hw);
      const ty = Math.floor(R.cy + Math.sin(a) * 0.78 * TURM.hh);
      w.obj[ty * MAP_W + tx] = OBJ.PILLAR;
      w.props.push({ type: 'turmsaeule', roof: TURM.theme, ...P(tx + 0.5, ty + 0.75) });
    }
    for (let k = 0; k < 16; k++) {
      if (k % 4 === 0) continue; // nicht vor den Toren
      const a = k * Math.PI / 8;
      const far = k % 2 ? 0.9 : 0.86;
      w.props.push({ type: 'brazier', roof: TURM.glut, ...P(R.cx + Math.cos(a) * far * TURM.hw, R.cy + Math.sin(a) * far * TURM.hh + 0.4) });
    }
    for (const dx of [-6, 6]) w.props.push({ type: 'dbanner', roof: TURM.theme, ...P(R.cx + dx, R.cy - TURM.hh + 0.6) });
    // Knochen: kleine Haufen an der Wand und zwischen den Säulen (nur Schmuck, sperren nichts)
    for (let k = 0; k < 14; k++) {
      const a = (k + 0.5) * Math.PI / 7 + ((tileHash(k, s) % 100) / 100 - 0.5) * 0.18;
      // nicht vor den Toren und nicht in die Lavabecken
      const g = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      if (g < 0.22 || g > Math.PI / 2 - 0.22) continue;
      const far = k % 3 === 0 ? 0.6 : 0.83 + (tileHash(s, k) % 7) / 100;
      const at = turmPt(s, Math.cos(a) * far, Math.sin(a) * far);
      const tx = Math.floor(at.x / TILE);
      const ty = Math.floor(at.y / TILE);
      const i = ty * MAP_W + tx;
      if (!turmInHall(s, tx, ty) || w.obj[i] || w.ground[i] === G.LAVA) continue;
      w.props.push({ type: 'turmknochen', roof: 'abc'[k % 3], ...P(at.x / TILE, at.y / TILE) });
    }
    // die vier Tore (eigene Figuren, turmtor: Zustand zu/offen je Halle)
    for (let g = 0; g < 4; g++) {
      const at = turmGateAt(s, g);
      w.npcs.push({ id: 'turmtor', name: '', x: at.x, y: at.y, r: 10, turmSlot: s, turmGate: g, silent: true });
    }
  }
  // Der Turm auf Karte 17: verbrannter Boden um den Fuß, ein paar Platten bis zum Weg, der Fuß blockiert
  if (TURM_MAP) {
    const [fx, fy, fw, fh] = TURM_FLAECHE;
    for (let y = fy; y < fy + fh; y++) {
      for (let x = fx; x < fx + fw; x++) {
        const i = y * MAP_W + x;
        if (w.ground[i] === G.PATH || LIQUID.has(w.ground[i])) continue;
        const dx = x - TURM_AT.x;
        const dy = y - TURM_AT.y;
        const d = hyp(dx, dy);
        const steg = Math.abs(dx) <= 1 && dy >= 3;
        if (d > 3.7 && !steg) continue;
        w.obj[i] = OBJ.NONE;
        w.deco[i] = DECO.NONE;
        w.ground[i] = steg && d > 2.6 ? G.FLAGSTONE : d <= 2.9 ? G.BASALT : G.ASH;
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2 && Math.abs(dx) + Math.abs(dy) < 4) w.obj[i] = OBJ.PILLAR;
        else if (w.ground[i] === G.ASH && tileHash(x, y) % 4 === 0) w.deco[i] = DECO.CRACK;
      }
    }
    w.props.push({ type: 'turmbau', ...P(TURM_AT.x + 0.5, TURM_AT.y + 2.85) });
    for (const sx of [-1, 1]) w.props.push({ type: 'brazier', roof: TURM.glut, ...P(TURM_AT.x + 0.5 + sx * 1.6, TURM_AT.y + 3.9) });
    const d = turmDoor();
    w.npcs.push({ id: 'turm', name: TURM.name, x: d.x, y: d.y, r: 11 });
  }
}
const _turmGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _turmGenerateWorld();
  turmBuild(w);
  return w;
};
// Monster und Seelensteine der Karte 17 halten Abstand zum Turm (auch wiederkehrende Steine)
const _turmRandomSpot = randomSpotInZone;
randomSpotInZone = function (zone, from, to) {
  let s = _turmRandomSpot(zone, from, to);
  if (!zone || zone.map !== 17) return s;
  const cx = (TURM_AT.x + 0.5) * TILE;
  const cy = (TURM_AT.y + 0.5) * TILE;
  for (let k = 0; k < 8 && s && hyp(s.x - cx, s.y - cy) < TURM_KEEP * TILE; k++) s = _turmRandomSpot(zone, from, to);
  return s;
};
// Seelensteine der Hallen: je Halle acht im Saal (Ebene 6 und 9, bis Phase 2 Ebene 7 und 9) und vier Kettensteine vor den Toren (Wächter).
// Sie stehen von Anfang an in der Welt (so kennt sie jeder Mitspieler aus der Monsterliste) und liegen außerhalb
// ihrer Ebene tot da – der Host weckt sie und legt sie wieder schlafen (turmStoneSet).
const TURM_STEIN_KETTE = STONE_TYPES.find((t) => t.level === 60) || STONE_TYPES[STONE_TYPES.length - 1];
function turmStones() {
  for (let s = 0; s < TURM.slots; s++) {
    for (let k = 0; k < 12; k++) {
      const st = createStone(TURM_ZONE, TURM.level, 0, 1, turmStoneSpot(s, k));
      if (!st) continue;
      st.fixedSpot = true;
      st.dead = true;
      st.hp = 0;
      st.respawnAt = Infinity;
      game.monsters.push(st);
    }
  }
}
const _turmPopulateWorld = populateWorld;
populateWorld = function () {
  _turmPopulateWorld();
  turmStones();
};
// Welcher Stein einer Halle ist das? { s, k, kette } nach seinem Platz (gilt auch beim Mitspieler), sonst null
function turmStoneInfo(m) {
  if (!m || !m.isStone) return null;
  if (m.__turm !== undefined) return m.__turm;
  let info = null;
  const s = turmMonSlot(m);
  if (s >= 0) {
    for (let k = 0; k < 12 && !info; k++) {
      const at = turmStoneSpot(s, k);
      if (Math.abs(at.x - m.homeX) < 6 && Math.abs(at.y - m.homeY) < 6) info = { s, k, kette: k >= 8 };
    }
  }
  m.__turm = info;
  return info;
}
// Steine einer Halle nach Platz (0–7 Saal, 8–11 vor den Toren); gemerkt, solange die Monsterliste dieselbe ist
const turmStoneCache = { arr: null, len: -1, slots: [] };
function turmSlotStones(s) {
  monsterIndex();
  const C = turmStoneCache;
  if (C.arr !== game.monsters || C.len !== game.monsters.length) {
    C.arr = game.monsters;
    C.len = game.monsters.length;
    C.slots = Array.from({ length: TURM.slots }, () => []);
    for (const m of game.monsters) {
      if (!m.isStone) continue;
      const t = turmStoneInfo(m);
      if (t) C.slots[t.s][t.k] = m;
    }
  }
  return C.slots[s] || [];
}
// Leben eines Steins: art 's' Seelenstein (Ebene 7), 't' Trugstein (Ebene 9), 'k' Kettenstein
function turmStoneHp(art, players) {
  const sc = turmScale(players);
  if (art === 'k') return Math.round(monsterStats(TURM.level, 1).maxHp * TURM.kettenHp * (1 + TURM.perKette * (turmPl(players) - 1)));
  return Math.round(monsterStats(TURM.level, STONE.hpMul).maxHp * (art === 't' ? TURM.trugHp : TURM.stoneHp) * sc.stone);
}
// Aussehen und Werte eines Hallensteins setzen (beim Host beim Wecken, beim Mitspieler aus dem Zustand der Halle)
function turmStoneDress(m, art, players) {
  const kette = art === 'k';
  m.stoneType = kette ? TURM_STEIN_KETTE : stoneType(TURM.level);
  m.name = kette ? 'Kettenstein' : art === 't' ? 'Trugstein' : 'Seelenstein der Verdammten';
  m.maxHp = turmStoneHp(art, players);
  m.fixedSpot = true;
}

// --- Gegner --------------------------------------------------------------------------------------------------------
// Eigene Arten des Turms (alle Stufe 80, turm: true): Verdammte in vier Gestalten und ihr Hauptmann, der Glutwicht
// (kleiner Schwarmdämon), die drei Hüter und der Wächter. Aussehen: eigene Zeichnungen (2D), daraus bzw. aus den
// Bauplänen der Bosse (bosse3d-modelle*.js) mit eigenen Farben und Formen die 3D-Modelle.
const TURM_MOBS = {
  turm_krieger: { base: 'untoter', name: 'Verdammter Krieger', hpMul: 1.5, atkMul: 1.25, color: '#6a5a58' },
  turm_schuetze: { base: 'armbrustschuetze', name: 'Verdammter Schütze', hpMul: 1.0, atkMul: 1.3, color: '#5a4a44' },
  turm_hexer: { base: 'sumpfhexe', name: 'Verdammter Hexer', hpMul: 1.0, atkMul: 1.45, color: '#3a2a3e', shot: '#8fe36a' },
  turm_schlaechter: { base: 'ghul', name: 'Verdammter Schlächter', hpMul: 2.6, atkMul: 1.45, color: '#6a5450' },
  turm_hauptmann: { base: 'untoter', name: 'Verdammter Hauptmann', hpMul: 4.5, atkMul: 1.6, color: '#7a3a2a', size: 15 }
};
for (const [id, o] of Object.entries(TURM_MOBS)) {
  const b = MONSTER_TYPES[o.base];
  MONSTER_TYPES[id] = { ...b, name: o.name, level: TURM.level, color: o.color, look: o.base, hpMul: o.hpMul, atkMul: o.atkMul, aggressive: true, dungeon: true, turm: true, ...(o.shot ? { shot: o.shot } : {}), ...(o.size ? { size: o.size } : {}) };
}
// Glutwicht: klein, schnell, wenig Leben und Schaden – nur die Masse macht ihn gefährlich
MONSTER_TYPES.turm_glutwicht = { name: 'Glutwicht', level: TURM.level, shape: 'demon', color: '#e2562a', size: 9, speed: 132, range: 22, cooldown: 1.3, aggressive: true, hpMul: 0.22, atkMul: 0.2, dungeon: true, turm: true, scale3: 0.55 };
// Hüter und Wächter: Angriffe aus den Instanzen (type.inst, instBossTick), Leben und Schaden für einen Spieler –
// turmTune rechnet die Gruppe ein. Phase 2: deutlich stärker als die Verdammten (Leben × 22–34 statt 9–14, Schaden
// × 2,5–2,8 statt 1,8–2,0); Kharzul Leben × 80 statt 30 (allein rund 3 Mio.), Schaden × 3,2 statt 2,4
const TURM_BOSSE = [
  ['turm_hueter', 'Ossarn, der Kettenhüter', 'Hüter der vierten Ebene', 'brute', 34, 34, 2.8, '#ff6a2a', ['slam', 'cross', 'charge', 'spikes'], 'lavagolem', 'feuer'],
  ['turm_ilmra', 'Ilmra, Hüterin der Glut', 'Zwillingshüterin – ihr Feuer fällt vom Himmel', 'humanoid', 28, 22, 2.5, '#ffb04a', ['rain', 'fan', 'volley', 'pools'], 'feuerdaemon', 'feuer'],
  ['turm_varn', 'Varn, Hüter der Asche', 'Zwillingshüter – seine Glefe zieht Kreuze', 'humanoid', 30, 26, 2.6, '#c8c0b8', ['charge', 'cross', 'slam', 'line'], 'untoter', 'tod'],
  ['turm_waechter', 'Kharzul, Wächter der Verdammten', 'Ab der Hälfte zeigt er seine wahre Gestalt', 'demon', 46, 80, 3.2, '#8fe36a', ['fan', 'rain', 'pull', 'cross', 'leap', 'spikes', 'chain'], 'feuerdaemon', 'tod']
];
for (const [id, name, title, shape, size, hpMul, atkMul, color, moves, mat, fx] of TURM_BOSSE) {
  MONSTER_TYPES[id] = {
    name, level: TURM.level, shape, color: '#2a2226', size, speed: id === 'turm_waechter' ? 126 : 120, range: id === 'turm_waechter' ? 80 : 58, cooldown: 1.7, aggressive: true,
    hpMul, atkMul, dungeon: true, turm: true,
    boss: { color, slam: id === 'turm_waechter' ? 200 : 165, volley: 10, shot: color, summon: 'turm_glutwicht', mat },
    inst: { rank: id === 'turm_waechter' ? 3 : 2, final: false, fx, title, moves }
  };
}
// Art für „Stark gegen …“: Verdammte sind Untote, Wichte, Hüter und Wächter Dämonen
if (typeof MONSTER_KIND_IDS !== 'undefined') {
  Object.assign(MONSTER_KIND_IDS, { turm_krieger: 'undead', turm_schuetze: 'undead', turm_hexer: 'undead', turm_schlaechter: 'undead', turm_hauptmann: 'undead', turm_varn: 'undead',
    turm_glutwicht: 'demon', turm_hueter: 'demon', turm_ilmra: 'demon', turm_waechter: 'demon' });
}
// keine Turm-Gegner in der Prüfungsarena
if (typeof arenaPool === 'function') {
  const _turmArenaPool = arenaPool;
  arenaPool = function (L, w) {
    const all = _turmArenaPool(L, w);
    const ok = all.filter((id) => !MONSTER_TYPES[id].turm);
    return ok.length ? ok : all;
  };
}

// --- Aussehen in 2D (und daraus die 3D-Modelle der Verdammten) -------------------------------------------------------
// Verdammte: aschgraue Knochen, verkohltes Leder, Glut in den Augen, zerrissene Ketten an den Handgelenken
function turmKetten2(ctx, w) {
  for (const x of [-7, 6]) {
    stroke(ctx, '#8a8a92', 1, [[x, -13 + w.bob], [x - 1, -9 + w.bob], [x + 0.5, -6 + w.bob]]);
    dot(ctx, x + 0.5, -5.2 + w.bob, 1.1, 1.1, '#5a5a62');
  }
}
function turmSchaedel2(ctx, cx, cy, helm, auge) {
  dot(ctx, cx + 5.5, cy - 0.5, 2.7, 2.9, '#140c0a');
  dot(ctx, cx + 5.5, cy - 0.5, 1.1, 1.1, auge);
  ctx.globalAlpha = 0.5;
  dot(ctx, cx + 5.5, cy - 0.5, 3.8, 3.8, auge);
  ctx.globalAlpha = 1;
  box(ctx, cx + 2, cy + 4, 8, 3.4, 1, '#c8c0b0');
  for (let k = 0; k < 4; k++) stroke(ctx, '#140c0a', 0.5, [[cx + 3 + k * 2, cy + 4], [cx + 3 + k * 2, cy + 7.4]]);
  if (helm) paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.6, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); }, helm, cx - 11.6, cy - 12.6, 23.2, 11.6);
}
const TURM_ART = {
  turm_krieger: {
    h: 48, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.04, skin: '#b8b0a0', pants: '#2a2022', boots: '#1a1416', torso: '#3a2a2a', sleeve: '#b8b0a0', gloves: '#b8b0a0', belt: '#5a2a1c', pauldron: '#4a3a3c', spikes: true, straps: '#1a1416', runes: '#ff7a2a', weapon: 'sword',
      head: (ctx, cx, cy, w) => {
        turmSchaedel2(ctx, cx, cy, '#4a3a3c', '#ff7a2a');
        poly(ctx, [[cx - 3, cy - 12], [cx, cy - 18], [cx + 2, cy - 12]], '#2a2022');
        turmKetten2(ctx, w || WALK[0]);
      }
    })
  },
  turm_schuetze: {
    h: 46, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 0.98, skin: '#a8a090', pants: '#2a2424', boots: '#1a1414', torso: '#3e3230', sleeve: '#332826', belt: '#1a1414', pouch: '#5a3a2a', weapon: 'bow', weaponAngle: 0,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 12, cy + 6], [cx - 12, cy - 4], [cx - 4, cy - 12.5], [cx + 7, cy - 10], [cx + 11.5, cy - 2], [cx + 3, cy - 3], [cx - 2, cy + 6]], '#3a2e2e');
        box(ctx, cx + 1, cy + 3.5, 9, 4, 1.2, '#8a3a22');
        dot(ctx, cx + 5.6, cy - 0.8, 1.5, 1.3, '#ffb04a');
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 5.6, cy - 0.8, 3.4, 3, '#ff7a2a');
        ctx.globalAlpha = 1;
        box(ctx, cx - 16, cy + 4, 5, 14, 1.5, '#3a2a22');
        stroke(ctx, '#c8c0b0', 0.8, [[cx - 15, cy + 4], [cx - 16.5, cy + 0.5]]);
        stroke(ctx, '#c8c0b0', 0.8, [[cx - 13, cy + 4], [cx - 12.5, cy + 0.5]]);
      }
    })
  },
  turm_hexer: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.03, skin: '#9a94a0', boots: '#14101a', robe: '#2a1e2e', sleeve: '#2a1e2e', gloves: '#9a94a0', wideSleeves: true, tattered: true, necklace: true, runes: '#8fe36a', weapon: 'skullstaff', weaponAngle: -1.35,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 12, cy + 7], [cx - 13, cy - 4], [cx - 5, cy - 14], [cx + 6, cy - 12], [cx + 12, cy - 3], [cx + 3, cy - 3], [cx - 2, cy + 7]], '#1e1422');
        poly(ctx, [[cx - 5, cy - 14], [cx - 9, cy - 22], [cx - 1, cy - 13]], '#1e1422');
        dot(ctx, cx + 5.6, cy - 0.5, 1.5, 1.2, '#d8ffb0');
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 5.6, cy - 0.5, 3.6, 3.2, '#8fe36a');
        ctx.globalAlpha = 1;
      }
    })
  },
  turm_schlaechter: {
    h: 60, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.4, belly: true, skin: '#7a6a66', pants: '#2a1a18', boots: '#1a1210', sleeve: '#7a6a66', gloves: '#5a4a48', claws: true, cracks: '#ff6a2a',
      head: (ctx, cx, cy) => {
        dot(ctx, cx + 5, cy - 2.6, 4.6, 1.4, '#3a2a28');
        dot(ctx, cx + 5.4, cy - 0.4, 1.7, 1.3, '#ffb04a');
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 5.4, cy - 0.4, 3.6, 3, '#ff6a2a');
        ctx.globalAlpha = 1;
        // eiserner Maulkorb
        box(ctx, cx + 1, cy + 3, 10, 5, 1.5, '#4a4a52');
        for (let k = 0; k < 4; k++) stroke(ctx, '#1a1416', 0.7, [[cx + 2.5 + k * 2.3, cy + 3], [cx + 2.5 + k * 2.3, cy + 8]]);
        stroke(ctx, '#4a4a52', 1.2, [[cx + 1, cy + 5], [cx - 9, cy + 2]]);
      }
    })
  },
  turm_hauptmann: {
    h: 62, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.3, skin: '#c8c0b0', pants: '#2a1a1a', boots: '#1a1012', torso: '#5a2a22', sleeve: '#3a2a2a', gloves: '#3a2a2a', belt: '#ffb04a', pauldron: '#5a3a3a', spikes: true, cape: '#5a1a14', runes: '#ffb04a', weapon: 'sword',
      head: (ctx, cx, cy, w) => {
        turmSchaedel2(ctx, cx, cy, '#5a2a22', '#ffb04a');
        for (const x of [-6, -1, 4]) poly(ctx, [[cx + x - 2, cy - 11], [cx + x, cy - 19], [cx + x + 2, cy - 11]], '#ffb04a');
        turmKetten2(ctx, w || WALK[0]);
      }
    })
  },
  // Glutwicht: großer Kopf, kleine Flügel, Flammenbüschel, Schwanz mit Glutspitze – nur halb so hoch wie ein Dämon
  turm_glutwicht: {
    h: 26, draw: (ctx, f) => {
      const b = [0, -1, 0, -1][f];
      const st = [0, 1.6, 0, -1.6][f];
      // Schwanz und Flügelchen
      stroke(ctx, '#b8401e', 1.6, [[-3, -6 + b], [-9, -5], [-11, -9 + b]]);
      poly(ctx, [[-11, -9 + b], [-13, -13 + b], [-9, -12 + b]], '#ffb04a');
      poly(ctx, [[-2, -13 + b], [-10, -20 - st * 0.6], [-12, -14], [-8, -13], [-9, -9], [-3, -9 + b]], '#5a1a12');
      // Beine, Bauch
      box(ctx, -3.6 + st * 0.5, -4, 2.6, 4.4, 1, '#7a2414');
      box(ctx, 1 - st * 0.5, -4, 2.6, 4.4, 1, '#7a2414');
      oval(ctx, 0, -8.5 + b, 5.2, 5, '#e2562a');
      dot(ctx, 1, -7.5 + b, 3, 2.8, '#ff8a4a');
      stroke(ctx, '#ffd34d', 0.8, [[-1, -10 + b], [1, -8 + b], [-0.5, -6 + b]]);
      // Arme mit Krallen
      stroke(ctx, '#c8431f', 1.8, [[3, -10 + b], [6.5, -7.5 + b - st * 0.4]]);
      stroke(ctx, '#3a1410', 1.4, [[6.5, -7.5 + b - st * 0.4], [8, -6.5 + b - st * 0.4]]);
      // Kopf: Ohren, Hörnchen, Flamme, Auge, Maul
      poly(ctx, [[-4, -17 + b], [-10, -19 + b], [-5, -14 + b]], '#c8431f');
      oval(ctx, 1, -17 + b, 6.4, 5.6, '#e2562a');
      poly(ctx, [[-2, -21.5 + b], [-3.5, -25.5 + b], [0, -22 + b]], '#2a1410');
      poly(ctx, [[3, -22 + b], [5.5, -25 + b], [5.2, -21 + b]], '#2a1410');
      poly(ctx, [[-0.5, -22 + b], [1.2, -27.5 + b - Math.abs(st)], [2.6, -22 + b]], '#ffd34d');
      dot(ctx, 4, -17.6 + b, 1.9, 1.6, '#fff2a0');
      dot(ctx, 4.5, -17.6 + b, 0.9, 1, '#1a0a08');
      stroke(ctx, '#1a0a08', 0.9, [[2, -20 + b], [6, -18.8 + b]]);
      poly(ctx, [[2.4, -14.2 + b], [7, -14.6 + b], [5, -12.6 + b]], '#2a0e0a');
      poly(ctx, [[4, -14.3 + b], [4.6, -13 + b], [5.2, -14.4 + b]], '#fff6dc');
    }
  },
  // Ossarn: Koloss aus Schlacke und Eisen, um den Leib Ketten, ein Kopf wie ein geschmiedeter Helm
  turm_hueter: {
    h: 96, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 2.05, belly: true, skin: '#3a3438', pants: '#1e1a1c', boots: '#141012', sleeve: '#3a3438', gloves: '#5a5258', cracks: '#ff6a2a', weapon: 'axe',
      head: (ctx, cx, cy, w) => {
        box(ctx, cx - 9, cy - 11, 19, 20, 3, '#2a2428');
        box(ctx, cx + 1, cy - 3, 9, 2.6, 1, '#ff8a3a');
        ctx.globalAlpha = 0.5;
        dot(ctx, cx + 5.5, cy - 1.7, 7, 3.6, '#ff6a2a');
        ctx.globalAlpha = 1;
        for (const x of [-6, 0, 6]) poly(ctx, [[cx + x - 2.4, cy - 11], [cx + x, cy - 17], [cx + x + 2.4, cy - 11]], '#5a5258');
        const bob = (w || WALK[0]).bob;
        for (const y of [-21, -15]) stroke(ctx, '#8a8a92', 1.4, [[-10, y + bob], [-3, y + 3 + bob], [4, y + bob], [10, y + 3 + bob]]);
      }
    })
  },
  // Ilmra: Glutrobe, Hörnerkrone, Rauchfass am Stab
  turm_ilmra: {
    h: 84, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.75, skin: '#e0a080', boots: '#2a100a', robe: '#6a1a10', sleeve: '#8a2a14', gloves: '#e0a080', wideSleeves: true, belt: '#ffb04a', necklace: true, runes: '#ffd34d', cape: '#3a0e0a', weapon: 'skullstaff', weaponAngle: -1.3,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 11, cy + 10], [cx - 12, cy - 4], [cx - 4, cy - 11], [cx + 4, cy - 10], [cx - 3, cy - 2], [cx - 6, cy + 12]], '#2a100c');
        for (const [x, h] of [[-7, 12], [-2, 9], [4, 12]]) poly(ctx, [[cx + x - 2.2, cy - 9], [cx + x - 1, cy - 9 - h], [cx + x + 2.2, cy - 9]], '#1a0a08');
        box(ctx, cx - 9, cy - 10.5, 17, 2.4, 1, '#ffb04a');
        monsterEye(ctx, cx + 5.6, cy - 0.6, 1.8, '#ffb04a', true);
      }
    })
  },
  // Varn: Aschegrauer Ritter mit Topfhelm, zerrissenem Umhang und Glefe
  turm_varn: {
    h: 88, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.85, skin: '#8a8480', pants: '#2a2828', boots: '#1a1818', torso: '#4a4644', sleeve: '#5a5654', gloves: '#3a3838', belt: '#b8401e', pauldron: '#6a6664', spikes: true, cape: '#2a2424', runes: '#ff7a2a', weapon: 'sword',
      head: (ctx, cx, cy) => {
        box(ctx, cx - 10.5, cy - 12, 21.5, 21, 4, '#5a5654');
        box(ctx, cx - 10.5, cy - 12, 21.5, 4, 2, '#7a7674');
        box(ctx, cx + 0.5, cy - 3, 10, 2.2, 0.8, '#140c0a');
        dot(ctx, cx + 6, cy - 1.9, 1.3, 0.9, '#ff7a2a');
        for (let k = 0; k < 3; k++) dot(ctx, cx + 3 + k * 2.6, cy + 4, 0.7, 0.7, '#140c0a');
        poly(ctx, [[cx - 2, cy - 12], [cx, cy - 22], [cx + 2, cy - 12]], '#b8401e');
      }
    })
  },
  // Kharzul: riesiger Dämon mit Schädelgesicht, langen Hörnern, Schwingen und Hellebarde; Seelenfeuer statt Glut
  turm_waechter: {
    h: 124, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 2.65, skin: '#4a4650', pants: '#16141c', boots: '#0e0c12', torso: '#2a2630', sleeve: '#4a4650', gloves: '#16141c', wings: '#1e1a26', belt: '#8fe36a', pauldron: '#16141c', spikes: true, tail: true, claws: true, runes: '#8fe36a', weapon: 'axe',
      head: (ctx, cx, cy, w) => {
        // lange Hörner nach hinten, Schädelgesicht mit Seelenfeuer in den Augen
        poly(ctx, [[cx - 2, cy - 9], [cx - 12, cy - 15], [cx - 22, cy - 13], [cx - 29, cy - 5], [cx - 27, cy - 12], [cx - 20, cy - 19], [cx - 10, cy - 20], [cx + 2, cy - 13]], '#8a8272');
        poly(ctx, [[cx - 5, cy - 6], [cx - 15, cy - 10], [cx - 24, cy - 7], [cx - 30, cy + 2], [cx - 29, cy - 6], [cx - 22, cy - 14], [cx - 12, cy - 16], [cx - 1, cy - 10]], '#b8b09c');
        for (const [x, y] of [[-12, -13], [-19, -11], [-25, -6]]) stroke(ctx, '#6a6456', 0.8, [[cx + x, cy + y - 2.5], [cx + x - 1.5, cy + y + 2.5]]);
        oval(ctx, cx + 1, cy, 10.6, 10.4, '#d8d0bc');
        dot(ctx, cx + 5.6, cy - 1, 3, 3.2, '#0a0a0c');
        dot(ctx, cx + 5.8, cy - 1, 1.3, 1.3, '#d8ffb0');
        ctx.globalAlpha = 0.6;
        dot(ctx, cx + 5.8, cy - 1, 4.6, 4.6, '#8fe36a');
        ctx.globalAlpha = 1;
        box(ctx, cx + 1.5, cy + 4.6, 9, 3.6, 1, '#f0ead8');
        for (let k = 0; k < 5; k++) stroke(ctx, '#0a0a0c', 0.5, [[cx + 2.6 + k * 1.8, cy + 4.6], [cx + 2.6 + k * 1.8, cy + 8.2]]);
        // Ketten vom Hals über die Brust
        const bob = (w || WALK[0]).bob;
        stroke(ctx, '#8a8a92', 1.1, [[-7, -24 + bob], [-2, -19 + bob], [4, -23 + bob]]);
        stroke(ctx, '#8a8a92', 1.1, [[-6, -19 + bob], [0, -14 + bob], [6, -19 + bob]]);
        dot(ctx, 0, -13.4 + bob, 1.6, 1.6, '#8fe36a');
      }
    })
  }
};
Object.assign(MONSTER_ART, TURM_ART);
// Köpfe der Verdammten in 3D (Baukasten in drei-figuren.js) und ihr Schmuck im Höllen-Thema
if (typeof HEAD3 !== 'undefined') {
  Object.assign(HEAD3, {
    turm_krieger: { bone: true, helmet: '#4a3a3c' },
    turm_schuetze: { hood: '#3a2e2e', mask: '#8a3a22', quiver: '#3a2a22' },
    turm_hexer: { hood: '#1e1422' },
    turm_schlaechter: { ears: true, brow: true },
    turm_hauptmann: { bone: true, helmet: '#5a2a22', crown: '#ffb04a' }
  });
}
if (typeof MON3_LOOK !== 'undefined') MON3_LOOK.turm_krieger = { runes: '#ff7a2a' };
(function turmThema3() {
  if (typeof monsterTheme3 !== 'function') return;
  monsterTheme3('hund'); // Themen einmal berechnen lassen, dann die eigenen eintragen
  if (typeof mon3ThemeOf === 'undefined' || !mon3ThemeOf) return;
  for (const id of Object.keys(MONSTER_TYPES)) if (MONSTER_TYPES[id].turm) mon3ThemeOf[id] = 'hell';
})();

// --- Eigene 3D-Modelle ---------------------------------------------------------------------------------------------
if (typeof MON3_BUILD !== 'undefined' && typeof humanoid3 === 'function') {
  // Glutwicht: Menschengerüst mit großem Kopf und kurzen Beinen, Flügelchen, Schwanz; Hörnchen, große Ohren, Flamme
  MON3_BUILD.turm_glutwicht = (b) => {
    const skin = '#e2562a';
    const res = humanoid3(b, {
      beastEyes: true, skin, torso: '#c8431f', sleeve: skin, pants: '#7a2414', boots: '#3a1410', gloves: '#3a1410', wings: '#5a1a12', tail: skin, claws: true,
      eyeColor: '#fff2a0', glowEyes: '#ffe14a', angry: true, blush: false, pointEars: true, headR: 0.42, legLen: 0.2, armLen: 0.25,
      headgear: (A, hb, hc, hr) => {
        for (const sx of [-1, 1]) {
          A(horn3(hr * 0.5, hr * 0.13, 6), '#2a1410', { bone: hb, p: [hc[0] + sx * hr * 0.45, hc[1] + hr * 0.78, hc[2] + hr * 0.1], r: [0.1, 0, -sx * 0.45], shine: 0.5 });
          A(horn3(hr * 0.75, hr * 0.2, 5), '#c8431f', { bone: hb, p: [hc[0] + sx * hr * 0.9, hc[1] + hr * 0.1, hc[2] - hr * 0.1], r: [0, 0, -sx * 1.25], s: [1, 1, 0.35] });
        }
        for (let k = -1; k <= 1; k++) A(horn3(hr * (k ? 0.5 : 0.8), hr * 0.16, 6), k ? '#ff8a2a' : '#ffd34d', { bone: hb, p: [hc[0] + k * hr * 0.2, hc[1] + hr * 0.82, hc[2] - hr * 0.15], r: [-0.35, 0, -k * 0.35], mat: 'glow', noShadow: true });
        for (const sx of [-1, 1]) A(horn3(hr * 0.22, hr * 0.05, 4), '#fff6dc', { bone: hb, p: [hc[0] + sx * hr * 0.2, hc[1] - hr * 0.5, hc[2] + hr * 0.84], r: [Math.PI, 0, 0], noShadow: true });
      }
    });
    res.noFlair = true;
    return res;
  };
}
if (typeof BOSS3 !== 'undefined' && typeof bsDemon3 === 'function') {
  // Ossarn: Schlackekoloss mit Schmiedekopf, Ketten und Kettenflegel (Bauplan der Riesen)
  MON3_BUILD.turm_hueter = (b) => bsGiant3(b, 'turm_hueter', {
    skin: '#34303a', skinTop: '#5a5460', eye: '#ffb04a', rune: '#ff6a2a', stone: '#26222a', stoneTop: '#4e4850', bronze: '#3a3438', belt: '#1a1618',
    band: '#4a4650', bandTop: '#8a8690', cloth: '#2a1410', wood: '#1a1416', iron: '#4a4650', ironTop: '#8a8690', fur: '#2a2426', furTop: '#4a4448', golemHead: true, chains: true, weapon: 'flail', worldH: 6.4
  });
  BOSS3.turm_hueter = Object.assign({}, BOSS3.gorvoth, { fx: 'glut', emi: [0.08, 0.03, 0.01], ambient: bsGiantEmbers3('turm_hueter', '#241c1c') });
  // Ilmra: Glutrobe, Hörnerkrone, Schulterplatten, Rauchfass (Bauplan der Herrinnen)
  MON3_BUILD.turm_ilmra = (b) => bsSorc3(b, 'turm_ilmra', {
    skin: '#e0a080', skinTop: '#f4c4a4', eye: '#ffd34d', hair: '#1a0a08', robe: '#6a1a10', robeTop: '#a8381c', sleeve: '#4a120c', hem: '#ffb04a', hemTop: '#ffe0a0',
    glow: '#ff8a2a', trim: '#ffb04a', gem: '#ff6a1a', gemTop: '#ffd08a', cape: '#2a0c08', capeEdge: '#b8401e', capeIn: '#5a1a10', staff: '#2a1a14', staffTop: '#8a5a3a',
    bone: '#d8ccb0', horn: '#1a0a08', hornTip: '#8a5a3a', claw: '#1a0a0a', hairGlow: '#ff6a1a', crown: 'horns', shoulder: 'plate', mantle: true, torn: true, weapon: 'censer', worldH: 5.0
  });
  BOSS3.turm_ilmra = Object.assign({}, BOSS3.lilith, { fx: 'feuer', emi: [0.09, 0.03, 0.01], ambient: bsAmb3('turm_ilmra', [{ k: 'orbit', n: 5, R: 1.3, tex: 'flame' }, { k: 'smoke', at: 'weapon', n: 3, sp: 0.4, r: 0.15, h: 1.2, s: 0.35, col: '#3a2420', op: 0.3 }]) });
  // Varn: aschgraue Platte, Topfhelm, zerrissener Umhang, Glefe (Bauplan der Ritter)
  MON3_BUILD.turm_varn = (b) => bsKnight3(b, 'turm_varn', {
    plate: '#5a5654', plateTop: '#9a9692', plateD: '#2e2c2c', trim: '#b8401e', glow: '#ff7a2a', eye: '#ffb04a', cape: '#241e1e', capeEdge: '#7a3a22',
    grip: '#1a1414', blade: '#4a4644', bladeTop: '#a8a4a0', weed: '#3a3432', weedTop: '#5a5450', shell: '#8a8480', rust: '#6a3a1e', helm: 'bucket', weapon: 'glaive', torn: true, worldH: 5.6
  });
  BOSS3.turm_varn = Object.assign({}, BOSS3.morvaine, { fx: 'glut', emi: [0.07, 0.03, 0.01], ambient: bsAmb3('turm_varn', [{ k: 'rise', at: 'weapon', n: 3, sp: 0.9, r: 0.2, h: 0.7, s: 0.15, col: '#ffb04a' }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.6, col: '#2a2424', op: 0.35 }]) });
  // Kharzul: Dämonenwächter mit Schädelgesicht, langen Hörnern, Seelenfeuer in Rissen und Flughaut, Hellebarde und
  // Schild; dazu eigene Teile: schwere Ketten um Brust und Handgelenke, eine Seelenlaterne am Gürtel
  MON3_BUILD.turm_waechter = (b) => {
    const C = Object.assign({}, BS_AZAROTH3, {
      skull: true, longHorns: true, weapon: 'halberd', skin: '#4a4650', skinTop: '#74707c', lava: '#8fe36a', eye: '#d8ffb0', tooth: '#f0ead8', claw: '#0e0c12',
      horn: '#d8d0bc', hornTip: '#f4eee0', bone: '#d8d0bc', boneTop: '#f4eee0', armor: '#16141c', armorTop: '#4a4658', fur: '#16141c', hoof: '#0a080c', cloth: '#1a1622', grip: '#16141c',
      blade: '#2a2832', bladeTop: '#8a8898', wingBone: '#2a2632', wingTop: '#4a4658', mem: '#1a1622', memB: '#26202e', memEdge: '#3a5a34', vein: '#8fe36a', worldH: 7.6
    });
    const res = bsDemon3(b, 'turm_waechter', C);
    const A = adder(b, null);
    const eisen = '#6a6a74';
    // Ketten: zwei gekreuzte Bänder aus Gliedern über der Brust, lose Enden an den Handgelenken
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        const u = k / 6;
        A(torus3(0.045, 0.014, Math.PI * 2, 4, 8), k % 2 ? eisen : '#8a8a94', { bone: BB3.chest, p: [sx * (0.34 - 0.62 * u), 1.92 - 0.5 * u, 0.2 + 0.1 * Math.sin(u * Math.PI)], r: [k % 2 ? 0 : Math.PI / 2, sx * 0.6, 0.5 * sx], shine: 0.8, noShadow: true });
      }
      const fb = bsArmB3(sx)[1];
      const P = bsBipJ3(BS_DEMON_J3);
      const W = P[sx].W;
      for (let k = 0; k < 4; k++) A(torus3(0.04, 0.013, Math.PI * 2, 4, 8), k % 2 ? eisen : '#8a8a94', { bone: fb, p: [W[0], W[1] - 0.06 - k * 0.075, W[2] + 0.02], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
    }
    // Seelenlaterne am Gürtel
    A(cyl3(0.06, 0.07, 0.16, 8), '#16141c', { bone: BB3.pelvis, p: [0.24, 0.96, 0.16], shine: 0.7 });
    A(sphere3(0.05, 8, 6), '#8fe36a', { bone: BB3.pelvis, p: [0.24, 0.96, 0.16], mat: 'glow', noShadow: true });
    return res;
  };
  BOSS3.turm_waechter = Object.assign({}, BS_DEMON_BOSS3, {
    fx: 'seele', melee: ['thrust', 'sweep', 'chop'], emit: 'weapon', emi: [0.03, 0.08, 0.02],
    pts: Object.assign(bsDemonPts3(BS_DEMON_J3), BOSS3.kael ? { weapon: BOSS3.kael.pts.weapon, sky: BOSS3.kael.pts.sky } : {}),
    base: { aRx: -0.4, aRe: -0.85, aRz: 0.16, aLx: -0.6, aLz: 0.15, aLe: -1.2, wing: 0.3 },
    ambient: bsAmb3('turm_waechter', [{ k: 'rise', at: 'core', n: 4, sp: 0.5, r: 1.4, h: 1.8, tex: 'flame', s: 0.4 }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.7, col: '#141a12', op: 0.35 }, { k: 'orbit', n: 4, R: 1.6, tex: 'flame' }])
  });
}

// --- Hallen führen (wer die Monster führt: allein man selbst, im Kanal der Host) -------------------------------------
// Je Halle ein Durchgang S: members ('me' für den Host selbst, sonst die pid), level (Ebene 1–11), state 'pause' |
// 'fight' | 'won', die Monster der Ebene (mons), Schlüssel und Tore, die Mechanik des Wächters (mech).
const turmHost = { slots: Array.from({ length: TURM.slots }, () => null), seq: 0, sweepAt: 0 };
const turmNow = () => game.time;

function turmMemberObj(id) {
  if (id === 'me') return WAECHTER ? null : game.player;
  const rp = net.players.get(id);
  return rp && !rp.gone ? rp : null;
}
const turmMemberName = (id) => (id === 'me' ? (game.player && game.player.name) : (net.players.get(id) || {}).name) || '';
const turmRealName = (id) => (id === 'me' ? (game.player && game.player.name) : (net.players.get(id) || {}).realName || (net.players.get(id) || {}).name) || '';
function turmTellOne(id, d) {
  if (id === 'me') turmOnMsg(d);
  else if (typeof netSocial === 'function') netSocial(id, d);
}
function turmTell(S, d) {
  for (const id of S.members.slice()) turmTellOne(id, d);
}
// Teilnehmer, die gerade in der Halle stehen und leben (Ziele der Monster)
function turmFighters(S, s) {
  const out = [];
  for (const id of S.members) {
    const o = turmMemberObj(id);
    if (o && !o.dead && turmSlotAt(o.x, o.y) === s) out.push(o);
  }
  return out;
}
const turmHidden = (o) => (o === game.player ? !!(game.stats && game.stats.invisible) : !!o.invisible);
// Ziel für ein Monster: der Teilnehmer, den gerade weniger Monster jagen, bei Gleichstand der nähere; getarnte nicht
function turmPickTarget(S, m, fighters) {
  let best = null;
  let bs = Infinity;
  for (const o of fighters) {
    if (turmHidden(o)) continue;
    let n = 0;
    for (const x of S.mons) if (!x.dead && x !== m && x.target === o) n++;
    const sc = n * 1e4 + hyp(o.x - m.x, o.y - m.y);
    if (sc < bs) { bs = sc; best = o; }
  }
  return best;
}
function turmTargetOk(S, s, t) {
  if (!t || t.dead || t.gone || t.hp <= 0) return false;
  if (t.ally || t.remoteAlly) return typeof allyPresent === 'function' ? allyPresent(t) : game.allies.includes(t);
  return S.members.some((id) => turmMemberObj(id) === t) && turmSlotAt(t.x, t.y) === s && !turmHidden(t);
}

// Neuer Durchgang in einer freien Halle; Rückgabe: Halle oder -1
function turmAlloc(owner, open, pm) {
  for (let s = 0; s < TURM.slots; s++) if (turmHost.slots[s] && turmHost.slots[s].members.includes(owner)) turmDrop(s, owner, null);
  const busy = new Set();
  if (game.player && !WAECHTER) busy.add(turmSlotAt(game.player.x, game.player.y));
  if (net.mode === 'host') for (const rp of net.players.values()) busy.add(turmSlotAt(rp.x, rp.y));
  const now = turmNow();
  for (let s = 0; s < TURM.slots; s++) {
    if (turmHost.slots[s] || busy.has(s)) continue;
    turmHost.slots[s] = {
      id: ++turmHost.seq * 1000 + randInt(0, 999), owner, ownerName: turmMemberName(owner), ownerReal: turmRealName(owner), open: !!open, pm: Array.isArray(pm) ? pm.slice(0, 8) : null,
      members: [], joinAt: {}, lost: {}, absent: {}, level: 1, state: 'pause', until: now + TURM.firstPause, players: 1, mons: new Set(), queue: [], nextAt: 0, aggroAt: 0,
      total: 0, done: 0, left: 0, keys: 0, keyKills: 0, gates: [0, 0, 0, 0], real: [], awake: [], boss: [], mech: null, mechAt: [], stunUntil: 0, addAt: 0,
      t0: now, emptySince: null, wipeAt: null, tellAt: 0, sweepAt: 0
    };
    turmStoneSet(s, [], null, 1);
    return s;
  }
  return -1;
}
// Beitritt: geprüft nur hier beim Host. Rückgabe: '' oder der Grund
function turmJoinHost(id, s, lvl, pm) {
  s |= 0;
  const S = turmHost.slots[s];
  if (!S) return 'Diesen Durchgang gibt es nicht mehr.';
  if (S.members.includes(id)) return '';
  if (S.state === 'won' || (S.level >= TURM.ebenen && S.state === 'fight')) return 'Der Kampf gegen den Wächter läuft schon – beitreten geht nicht mehr.';
  if ((lvl | 0) < TURM.level) return `Der Turm öffnet sich erst ab Stufe ${TURM.level}.`;
  // Teilnehmer ohne Verbindung zuerst entfernen
  for (const x of S.members.slice()) if (!turmMemberObj(x)) turmDrop(s, x, null);
  if (S.members.length >= TURM.maxPlayers) return `Der Durchgang ist voll (${TURM.maxPlayers} Spieler).`;
  const real = turmRealName(id);
  if (!S.open && real !== S.ownerReal) {
    const mine = Array.isArray(pm) ? pm.map(String) : [];
    if (!(S.pm && S.pm.includes(real)) && !mine.includes(S.ownerReal)) return 'Dieser Durchgang ist nur für die Gruppe, die ihn begonnen hat.';
  }
  for (let o = 0; o < TURM.slots; o++) if (o !== s && turmHost.slots[o] && turmHost.slots[o].members.includes(id)) turmDrop(o, id, null);
  S.members.push(id);
  S.joinAt[id] = turmNow();
  S.emptySince = null;
  return '';
}
// Ein Teilnehmer fällt heraus (why: Grund für ihn, null = ihm nichts mehr sagen); der Durchgang bleibt bestehen
function turmDrop(s, id, why) {
  const S = turmHost.slots[s];
  if (!S || !S.members.includes(id)) return;
  if (why) turmTellOne(id, { k: 'vtz', r: why });
  S.members = S.members.filter((x) => x !== id);
  delete S.lost[id];
  delete S.absent[id];
  if (S.members.length) turmTellState(S, s);
}
// alle Monster der Ebene verschwinden (ohne Belohnung)
function turmClearMons(S, s) {
  game.monsters = game.monsters.filter((m) => !(m.respawn === false && !m.isStone && (m.turmSlot === s || turmMonSlot(m) === s)));
  if (game.target && !game.target.isStone && game.target.turmSlot === s) game.target = null;
  S.mons.clear();
  S.queue = [];
}
// Halle räumen
function turmFree(s) {
  const S = turmHost.slots[s];
  turmHost.slots[s] = null;
  if (!S) return;
  turmClearMons(S, s);
  turmStoneSet(s, [], null, 1);
}
function turmEnd(s, why) {
  const S = turmHost.slots[s];
  if (!S) return;
  turmTell(S, { k: 'vtz', r: why });
  turmFree(s);
}
// Steine einer Halle: die in wach (Plätze k) leben mit vollem Leben, alle anderen liegen tot da
function turmStoneSet(s, wach, art, players) {
  const st = turmSlotStones(s);
  for (let k = 0; k < 12; k++) {
    const m = st[k];
    if (!m) continue;
    if (wach.includes(k)) {
      turmStoneDress(m, art, players);
      m.hp = m.maxHp;
      m.dead = false;
      m.wave = 0;
      m.turmWave = 0;
      m.turmSeen = false;
      m.tags = null;
      m.lastAttacker = null;
    } else if (!m.dead) {
      m.dead = true;
      m.hp = 0;
      if (game.target === m) game.target = null;
    }
    m.poison = m.burn = m.bleed = m.toxin = null;
    m.respawnAt = Infinity;
  }
  const S = turmHost.slots[s];
  if (S) S.awake = wach.slice();
  return st;
}
// Ebene von vorn (alle gefallen oder niemand mehr da)
function turmResetLevel(S, s) {
  turmClearMons(S, s);
  turmStoneSet(s, [], null, 1);
  S.mech = null;
  S.stunUntil = 0;
  S.boss = [];
  if (S.level === TURM_KEY_E) { S.keys = 0; S.keyKills = 0; S.gates = [0, 0, 0, 0]; }
  S.state = 'pause';
  S.sweepAt = 0;
}
// Liste der Durchgänge für das Fenster am Turm: [Halle, Name, Spieler, Ebene, offen, beitretbar]
function turmList() {
  const out = [];
  for (let s = 0; s < TURM.slots; s++) {
    const S = turmHost.slots[s];
    if (!S) continue;
    const zu = S.state === 'won' || (S.level >= TURM.ebenen && S.state === 'fight');
    out.push([s, S.ownerName, S.members.length, S.level, S.open ? 1 : 0, zu || S.members.length >= TURM.maxPlayers ? 0 : 1, S.ownerReal]);
  }
  return out;
}

// Gegner einer Welle (Ebene 1–5): Krieger, Schützen, ab Ebene 2 Hexer, ab Ebene 3 Schlächter, in Ebene 5 ein Hauptmann
// Phase 2: Zahl, Schlächter und Hauptleute je Ebene aus TURM_EBENEN (vorher fest 6–12 Gegner in Ebene 1–5)
function turmWave(E, players) {
  const D = TURM_EBENEN[E];
  const sc = turmScale(players);
  const pl = turmPl(players);
  const n = Math.round((D.n || 12) * sc.n);
  const pool = D.hex ? ['turm_krieger', 'turm_schuetze', 'turm_krieger', 'turm_hexer'] : ['turm_krieger', 'turm_krieger', 'turm_schuetze'];
  const out = [];
  for (let k = 0; k < n; k++) out.push(pool[k % pool.length]);
  const brutes = Math.round((D.schl || 0) * (1 + (pl - 1) / 4));
  for (let k = 0; k < brutes && k < out.length; k++) out[Math.floor(((k + 1) * out.length) / (brutes + 1))] = 'turm_schlaechter';
  const haupt = D.haupt ? D.haupt * (1 + Math.floor((pl - 1) / 4)) : 0;
  for (let k = 0; k < haupt && k * 3 < out.length; k++) out[out.length - 1 - k * 3] = 'turm_hauptmann';
  return out;
}
// Belagerung: der nächste Verdammte (Anteile für Schlächter und Hauptleute aus TURM_EBENEN)
function turmSiegeType(D) {
  const r = Math.random();
  if (r < (D.haupt || 0)) return 'turm_hauptmann';
  if (r < (D.haupt || 0) + (D.schl || 0)) return 'turm_schlaechter';
  return ['turm_krieger', 'turm_schuetze', 'turm_krieger', 'turm_hexer'][randInt(0, 3)];
}
// Werte eines Turm-Monsters: art 'mob' (Welle, mit der Stärke der Ebene), 'add' (Helfer der Bosse), 'imp' (Glutwicht),
// 'boss' (Hüter, Wächter) – jeweils mit der Skalierung für die Spielerzahl der Ebene
function turmTune(m, S, art) {
  const t = m.type;
  const sc = turmScale(S.players);
  const st = monsterStats(TURM.level, t.hpMul, t.atkMul);
  let hp = art === 'boss' ? sc.boss : sc.hp;
  let atk = art === 'boss' ? sc.bossAtk : sc.atk;
  if (art === 'mob') {
    const k = (TURM_EBENEN[S.level] && TURM_EBENEN[S.level].str) || 1.1;
    hp *= k;
    atk *= k;
  } else if (art === 'add') hp *= 0.7;
  // mehrere Hüter zugleich (Ebene 13): jeder etwas schwächer
  else if (art === 'boss' && TURM_EBENEN[S.level] && TURM_EBENEN[S.level].bossHp) hp *= TURM_EBENEN[S.level].bossHp;
  m.level = TURM.level;
  m.maxHp = Math.max(1, Math.round(st.maxHp * hp));
  m.atk = Math.round(st.atk * atk);
  m.def = st.def;
  m.xp = st.xp;
  m.hp = m.maxHp;
  m.inDungeon = true;
}
function turmSpawn(S, s, typeId, art, at, fighters) {
  const pos = art === 'boss' ? at : spotNear(at, 44);
  const m = createMonster(typeId, pos.x, pos.y, { level: TURM.level, respawn: false, zone: TURM_ZONE });
  m.turmSlot = s;
  turmTune(m, S, art);
  if (art === 'boss') {
    m.bossCd = 4;
    m.summoned = 0;
  } else {
    m.stun = TURM.spawnStun;
    m.flank = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
  }
  m.target = turmPickTarget(S, m, fighters) || fighters[0] || null;
  m.state = m.target ? 'chase' : 'idle';
  game.monsters.push(m);
  S.mons.add(m);
  return m;
}
// Platz, an dem Gegner erscheinen: vor einem der vier Tore
const turmSpawnSpot = (s) => turmGateAt(s, randInt(0, 3), 2.4);

// Ebene beginnen
function turmStartLevel(S, s) {
  const E = S.level;
  const D = TURM_EBENEN[E];
  const now = turmNow();
  const fighters = turmFighters(S, s);
  turmClearMons(S, s);
  S.players = turmPl(S.members.length);
  S.state = 'fight';
  S.done = 0;
  S.total = 0;
  S.left = 0;
  S.boss = [];
  S.mech = null;
  S.stunUntil = 0;
  S.nextAt = now;
  S.sweepAt = 0;
  S.startAt = now;
  if (D.art === 'w') {
    S.queue = turmWave(E, S.players);
    S.total = S.queue.length;
    turmStoneSet(s, [], null, 1);
  } else if (D.art === 'b' || D.art === 'f') {
    const mid = turmMid(s);
    // ein Hüter in der Mitte, zwei links und rechts, drei im Dreieck
    const off = D.boss.length === 2 ? [[-6, 0], [6, 0]] : D.boss.length === 3 ? [[0, -4], [-7, 3], [7, 3]] : [[0, 0]];
    D.boss.forEach((id, k) => {
      const at = { x: mid.x + off[k][0] * TILE, y: mid.y + off[k][1] * TILE };
      S.boss.push(turmSpawn(S, s, id, 'boss', at, fighters));
    });
    S.total = S.boss.length;
    turmStoneSet(s, [], null, 1);
    if (D.art === 'f') {
      S.gates = [1, 1, 1, 1];
      S.mechAt = TURM.ketten.slice();
      S.addAt = now + TURM.wichte;
    }
  } else if (D.art === 's') {
    turmStoneSet(s, [0, 2, 4, 6], 's', S.players);
    S.total = 4;
  } else if (D.art === 't') {
    turmStoneSet(s, [0, 1, 2, 3, 4, 5, 6, 7], 't', S.players);
    const a = randInt(0, 7);
    let b = randInt(0, 6);
    if (b >= a) b++;
    S.real = [a, b];
    S.total = TURM.echt;
    S.left = 8;
  } else if (D.art === 'k') {
    S.keys = 0;
    S.keyKills = 0;
    S.gates = [0, 0, 0, 0];
    S.total = 4;
    turmStoneSet(s, [], null, 1);
  } else if (D.art === 'u') {
    // Belagerung: dauer s lang Nachschub aus allen Toren, danach den Rest besiegen
    S.uEnd = now + D.dauer;
    S.total = 0;
    turmStoneSet(s, [], null, 1);
  }
  turmTellState(S, s);
}
// Ebene geschafft: Belohnung melden, nächste Ebene nach der Pause (oder Sieg)
function turmLevelDone(S, s) {
  const E = S.level;
  const now = turmNow();
  turmTell(S, { k: 'vte', t: 'lv', e: E });
  // was noch steht, vergeht gleich (Wichte sofort, sonst nach einem Augenblick: Monster eines Steins sterben mit ihm)
  S.sweepAt = now + (TURM_EBENEN[E].art === 'k' ? 0 : 1);
  S.queue = [];
  S.mech = null;
  S.stunUntil = 0;
  turmStoneSet(s, [], null, 1);
  if (E >= TURM.ebenen) {
    S.state = 'won';
    S.until = now + TURM.wonStay;
    turmTell(S, { k: 'vte', t: 'win', z: Math.round(now - S.t0) });
  } else {
    S.level = E + 1;
    S.state = 'pause';
    S.until = now + TURM.pause;
  }
  turmTellState(S, s);
}
// Zustand einer Halle an alle Teilnehmer: Ebene, Abschnitt, Zähler, Tore, Mechanik
function turmTellState(S, s) {
  const now = turmNow();
  S.tellAt = now + 1;
  const D = TURM_EBENEN[S.level];
  let alive = 0;
  for (const m of S.mons) if (!m.dead) alive++;
  const d = {
    k: 'vts', s, i: S.id, e: S.level, ph: S.state === 'pause' ? 'p' : S.state === 'won' ? 'w' : 'f', t: S.state === 'fight' ? 0 : Math.max(0, Math.ceil(S.until - now)),
    n: S.members.length, pl: S.players, a: S.done, b: S.total, g: S.gates[0] | (S.gates[1] << 1) | (S.gates[2] << 2) | (S.gates[3] << 3), o: S.open ? 1 : 0, on: S.ownerName
  };
  if (S.state === 'fight') {
    if (D.art === 'w') d.a = Math.max(0, S.total - S.queue.length - alive);
    if (D.art === 'u') { d.ut = Math.max(0, Math.ceil(S.uEnd - now)); d.a = alive; }
    if (D.art === 't') d.c = S.left;
    if (D.art === 'k') { d.ky = S.keys; d.a = S.gates.reduce((n, x) => n + x, 0); }
    if (S.boss.length) d.bh = S.boss.map((m) => (m.dead ? 0 : Math.max(1, Math.round((m.hp / m.maxHp) * 1000))));
    if (S.mech) { d.mt = Math.max(1, Math.ceil(S.mech.until - now)); d.mn = S.mech.left; d.mk = S.mech.ks.map((k) => k - 8); }
    if (S.stunUntil > now) d.zt = Math.ceil(S.stunUntil - now);
  }
  turmTell(S, d);
}

// Seelenketten des Wächters beginnen: unverwundbar in der Mitte, Kettensteine vor den Toren (allein zwei, zu zweit
// drei, sonst alle vier)
function turmMechStart(S, s, G) {
  const now = turmNow();
  const n = S.players >= 3 ? 4 : S.players + 1;
  let gs = [0, 1, 2, 3];
  if (n === 2) gs = Math.random() < 0.5 ? [0, 2] : [1, 3];
  else if (n === 3) gs.splice(randInt(0, 3), 1);
  const ks = gs.map((g) => 8 + g);
  turmStoneSet(s, ks, 'k', S.players);
  S.mech = { until: now + TURM.kettenZeit, ks, left: ks.length };
  G.cast = null;
  G.windup = 0;
  G.rush = null;
  G.dash = { x0: G.x, y0: G.y, x1: G.homeX, y1: G.homeY, t0: now, dur: 0.5 };
  turmTell(S, { k: 'vte', t: 'mech', n: ks.length, z: TURM.kettenZeit });
  turmTellState(S, s);
}
// Monster eines Seelensteins der Halle (Ebene 7): bei 75 %, 50 % und 25 % eine kleine Welle Verdammter
function turmStoneWaves(stone, t) {
  const S = turmHost.slots[t.s];
  if (!S || S.state !== 'fight' || t.kette || TURM_EBENEN[S.level].art !== 's') return;
  const marks = TURM.stoneWaves;
  const fighters = turmFighters(S, t.s);
  while ((stone.turmWave || 0) < marks.length && stone.hp / stone.maxHp <= marks[stone.turmWave || 0]) {
    stone.turmWave = (stone.turmWave || 0) + 1;
    const n = 2 + Math.round(0.4 * (S.players - 1));
    for (let k = 0; k < n; k++) {
      const m = turmSpawn(S, t.s, ['turm_krieger', 'turm_schuetze', 'turm_hexer'][(k + stone.turmWave) % 3], 'mob', stone, fighters);
      m.stone = stone;
      if (stone.lastAttacker && turmTargetOk(S, t.s, stone.lastAttacker)) m.target = stone.lastAttacker;
      addEffect({ type: 'burst', x: m.x, y: m.y, dur: 0.5, color: stone.stoneType.look.glow, count: 8 });
    }
    stone.crackFx = game.time;
  }
}
// Strafwelle eines falschen Steins (Ebene 9)
function turmStrafe(S, s, stone) {
  const fighters = turmFighters(S, s);
  const n = 3 + Math.round(0.6 * (S.players - 1));
  for (let k = 0; k < n; k++) turmSpawn(S, s, k === 0 && n >= 4 ? 'turm_schlaechter' : ['turm_krieger', 'turm_hexer', 'turm_schuetze'][k % 3], 'mob', stone, fighters);
}
// Schlüssel: mit Zufall, spätestens nach keyTo Tötungen (bei mehr Spielern entsprechend mehr), nie mehr als noch Tore zu sind
function turmKeyRoll(S) {
  const k = 1 + TURM.keyPer * (S.players - 1);
  const lo = Math.round(TURM.keyFrom * k);
  const hi = Math.round(TURM.keyTo * k);
  S.keyKills++;
  if (S.keys + S.gates.reduce((n, x) => n + x, 0) >= 4) return false;
  if (S.keyKills < lo) return false;
  if (S.keyKills < hi && Math.random() >= (S.keyKills - lo + 1) / (hi - lo + 1)) return false;
  S.keyKills = 0;
  S.keys++;
  return true;
}
// Ein Teilnehmer benutzt einen Schlüssel an Tor g
function turmGateUse(s, id, g) {
  const S = turmHost.slots[s];
  g |= 0;
  if (!S || S.state !== 'fight' || TURM_EBENEN[S.level].art !== 'k' || g < 0 || g > 3 || S.gates[g] || S.keys < 1 || !S.members.includes(id)) return false;
  const o = turmMemberObj(id);
  const at = turmGateAt(s, g);
  // Mitspieler: auch die zuletzt gemeldete Stelle zählt (die Figur zieht beim Host erst nach)
  if (!o || o.dead || Math.min(hyp(o.x - at.x, o.y - at.y), o.tx != null ? hyp(o.tx - at.x, o.ty - at.y) : Infinity) > 4 * TILE) return false;
  S.gates[g] = 1;
  S.keys--;
  turmTell(S, { k: 'vte', t: 'gate', g, n: turmMemberName(id), a: S.gates.reduce((n, x) => n + x, 0) });
  turmTellState(S, s);
  return true;
}

// Jedes Bild: alle Durchgänge führen
function turmTickHost() {
  if (net.mode === 'client') return;
  const now = turmNow();
  // schlafende Steine bleiben liegen (ein normal zerstörter Stein käme sonst nach Minuten von selbst wieder)
  if (now >= turmHost.sweepAt || now < turmHost.sweepAt - 5) {
    turmHost.sweepAt = now + 2;
    monsterIndex();
    for (const m of MON_INDEX.stones) {
      const t = turmStoneInfo(m);
      if (!t) continue;
      const S = turmHost.slots[t.s];
      if (m.dead) m.respawnAt = Infinity;
      else if (!S || !S.awake.includes(t.k)) { m.dead = true; m.hp = 0; m.respawnAt = Infinity; }
    }
  }
  for (let s = 0; s < TURM.slots; s++) {
    let S = turmHost.slots[s];
    if (!S) continue;
    // Teilnehmer ohne Verbindung fallen nach einer Schonfrist heraus; wer die Halle verlassen hat, ebenso
    for (const id of S.members.slice()) {
      const o = turmMemberObj(id);
      if (!o) {
        if (S.lost[id] == null) S.lost[id] = performance.now();
        if (performance.now() - S.lost[id] > TURM.netGrace * 1000) turmDrop(s, id, null);
        continue;
      }
      S.lost[id] = null;
      if (o.dead || turmSlotAt(o.x, o.y) === s) { S.absent[id] = null; continue; }
      if (now - S.joinAt[id] < 15) continue;
      if (S.absent[id] == null) S.absent[id] = now;
      if (now - S.absent[id] > (id === 'me' ? 4 : TURM.netGrace)) turmDrop(s, id, 'weg');
    }
    // niemand mehr da: die Ebene setzt sich zurück, nach einigen Minuten endet der Durchgang
    if (!S.members.length) {
      if (S.emptySince == null) {
        S.emptySince = now;
        if (S.state !== 'won') { turmResetLevel(S, s); S.until = now + TURM.pause; }
      }
      if (S.state === 'won' || now - S.emptySince > TURM.emptyMax) turmFree(s);
      continue;
    }
    S.emptySince = null;
    if (S.sweepAt && now >= S.sweepAt) {
      S.sweepAt = 0;
      turmClearMons(S, s);
    }
    if (S.state === 'won') {
      if (now >= S.until) turmEnd(s, 'ende');
      else if (now >= S.tellAt) turmTellState(S, s);
      continue;
    }
    const fighters = turmFighters(S, s);
    if (S.state === 'pause') {
      // nach einem Rückschlag warten, bis wieder jemand in der Halle steht; seit Phase 2 (Anweg beim Betreten) beginnt
      // eine Ebene frühestens 3 s, nachdem der Erste in der Halle steht
      if (!fighters.length) S.until = Math.max(S.until, now + 3);
      if (now >= S.until && fighters.length) turmStartLevel(S, s);
      else if (now >= S.tellAt) {
        if (now >= S.until) S.until = now + 1;
        turmTellState(S, s);
      }
      continue;
    }
    // alle zugleich gefallen: die Ebene beginnt von vorn
    if (!fighters.length) {
      if (S.wipeAt == null) S.wipeAt = now;
      if (now - S.wipeAt > 1.2) {
        S.wipeAt = null;
        turmResetLevel(S, s);
        S.until = now + TURM.respawn + 3;
        turmTell(S, { k: 'vte', t: 'reset', e: S.level });
        turmTellState(S, s);
      }
      continue;
    }
    S.wipeAt = null;
    const D = TURM_EBENEN[S.level];
    // Verstärkung der Bosse übernehmen (Wutschrei, Brut): Werte der Halle
    const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
    for (const m of list) {
      if (m.dead || m.turmSlot != null || m.isStone || m.respawn !== false || turmSlotAt(m.x, m.y) !== s) continue;
      m.turmSlot = s;
      turmTune(m, S, m.typeId === 'turm_glutwicht' ? 'imp' : 'add');
      S.mons.add(m);
    }
    // Gefallene zählen (Schlüssel aus Glutwichten), Lebende zählen
    let alive = 0;
    let imps = 0;
    let dirty = false;
    for (const m of S.mons) {
      if (!m.dead) {
        alive++;
        if (m.typeId === 'turm_glutwicht') imps++;
        continue;
      }
      S.mons.delete(m);
      dirty = true;
      if (D.art === 'k' && m.typeId === 'turm_glutwicht' && turmKeyRoll(S)) turmTell(S, { k: 'vte', t: 'key', x: Math.round(m.x), y: Math.round(m.y), ky: S.keys });
    }
    // Wer kein gültiges Ziel hat, nimmt sofort einen Teilnehmer
    if (now >= S.aggroAt) {
      S.aggroAt = now + 0.5;
      for (const m of S.mons) {
        if (m.dead || (m.state === 'chase' && turmTargetOk(S, s, m.target))) continue;
        const t = turmPickTarget(S, m, fighters);
        if (!t) continue;
        m.state = 'chase';
        m.target = t;
        m.windup = 0;
      }
    }
    let done = false;
    if (D.art === 'w') {
      const cap = TURM.cap + TURM.capPer * S.players;
      if (S.queue.length && now >= S.nextAt && alive < cap) {
        turmSpawn(S, s, S.queue.shift(), 'mob', turmSpawnSpot(s), fighters);
        S.nextAt = now + TURM.spawnGap;
        alive++;
        dirty = true;
      }
      done = !S.queue.length && alive === 0;
    } else if (D.art === 'u') {
      const cap = TURM.cap + TURM.capPer * S.players;
      if (now < S.uEnd) {
        if (now >= S.nextAt && alive < cap) {
          turmSpawn(S, s, turmSiegeType(D), 'mob', turmSpawnSpot(s), fighters);
          S.nextAt = now + D.gap / (1 + TURM.uPer * (S.players - 1));
          alive++;
          S.total++;
          dirty = true;
        }
      } else done = alive === 0;
    } else if (D.art === 'b') {
      const dead = S.boss.filter((m) => m.dead).length;
      if (dead !== S.done) { S.done = dead; dirty = true; }
      done = dead >= S.boss.length;
    } else if (D.art === 's' || D.art === 't') {
      const st = turmSlotStones(s);
      for (const k of S.awake.slice()) {
        const m = st[k];
        if (!m || !m.dead) continue;
        S.awake = S.awake.filter((x) => x !== k);
        dirty = true;
        if (D.art === 's') {
          S.done++;
          turmTell(S, { k: 'vte', t: 'st', r: 2, i: m.id, a: S.done, b: S.total });
        } else {
          const echt = S.real.includes(k);
          S.left = S.awake.length;
          if (echt) S.done++;
          turmTell(S, { k: 'vte', t: 'st', r: echt ? 1 : 0, i: m.id, a: S.done, b: S.total });
          if (!echt) turmStrafe(S, s, m);
        }
      }
      done = S.done >= S.total;
    } else if (D.art === 'k') {
      const want = Math.round(TURM.imps + TURM.impsPer * (S.players - 1));
      if (imps < want && now >= S.nextAt) {
        turmSpawn(S, s, 'turm_glutwicht', 'imp', turmSpawnSpot(s), fighters);
        S.nextAt = now + TURM.impGap / (1 + 0.25 * (S.players - 1));
      }
      done = S.gates.every((x) => x);
    } else if (D.art === 'f') {
      const G = S.boss[0];
      if (!G || G.dead) done = true;
      else if (S.mech) {
        const st = turmSlotStones(s);
        const left = S.mech.ks.filter((k) => st[k] && !st[k].dead).length;
        if (left !== S.mech.left) { S.mech.left = left; dirty = true; }
        if (!left) {
          // geschafft: benommen und verwundbarer (RAID.staggerDmg in damageMonster)
          S.mech = null;
          S.awake = [];
          S.stunUntil = now + TURM.benommen;
          (G.raid || (G.raid = { next: 3, step: 0, phase: 0 })).stagger = now + TURM.benommen;
          turmTell(S, { k: 'vte', t: 'ok', z: TURM.benommen });
          dirty = true;
        } else if (now >= S.mech.until) {
          // nicht geschafft: schwerer Schlag für alle, der Wächter heilt sich
          S.mech = null;
          turmStoneSet(s, [], null, 1);
          G.hp = Math.min(G.maxHp, Math.round(G.hp + G.maxHp * TURM.heilung));
          if (G.raid) G.raid.next = 2.5;
          turmTell(S, { k: 'vte', t: 'fail', i: G.id });
          dirty = true;
        }
      } else {
        if (now >= S.stunUntil && S.mechAt.length && G.hp / G.maxHp <= S.mechAt[0] && !G.cast && !G.dash) {
          S.mechAt.shift();
          turmMechStart(S, s, G);
        } else if (now >= S.addAt && now >= S.stunUntil) {
          S.addAt = now + TURM.wichte;
          for (let k = 0; k < 3 + Math.round(0.5 * (S.players - 1)); k++) turmSpawn(S, s, 'turm_glutwicht', 'imp', turmSpawnSpot(s), fighters);
        }
      }
    }
    if (done) turmLevelDone(S, s);
    else if (dirty || now >= S.tellAt) turmTellState(S, s);
  }
}

// Wächter: während der Seelenketten steht er in der Mitte und tut nichts, danach ist er kurz benommen
if (typeof instBossTick === 'function') {
  const _turmInstBossTick = instBossTick;
  instBossTick = function (m, dt) {
    if (m.turmSlot != null && m.typeId === 'turm_waechter') {
      const S = turmHost.slots[m.turmSlot];
      if (S && (S.mech || S.stunUntil > game.time)) {
        if (m.dash) {
          const d = m.dash;
          const k = Math.min(1, (game.time - d.t0) / d.dur);
          m.x = d.x0 + (d.x1 - d.x0) * k;
          m.y = d.y0 + (d.y1 - d.y0) * k;
          if (k >= 1) m.dash = null;
        }
        m.moving = !!m.dash;
        m.cast = null;
        m.windup = 0;
        m.rush = null;
        return true;
      }
    }
    return _turmInstBossTick(m, dt);
  };
}
// … und unverwundbar (Treffer zeigen „Schild!“ wie beim versiegelten Instanzboss)
function turmSealed(m) {
  const s = m.turmSlot != null ? m.turmSlot : turmMonSlot(m);
  if (s < 0) return false;
  const S = turmHost.slots[s];
  if (S && net.mode !== 'client') return !!S.mech;
  const run = game.turmRun;
  return !!(run && run.slot === s && run.st && run.mechUntil > game.time);
}
if (typeof instSealed === 'function') {
  const _turmInstSealed = instSealed;
  instSealed = function (m) {
    if (m && m.typeId === 'turm_waechter') return turmSealed(m);
    return _turmInstSealed(m);
  };
}
// Seelensteine der Hallen rufen ihre eigenen Wellen (ihr Gebiet hat keine Monstergruppen)
if (typeof checkStoneWaves === 'function') {
  const _turmCheckStoneWaves = checkStoneWaves;
  checkStoneWaves = function (stone) {
    const t = turmStoneInfo(stone);
    if (t) turmStoneWaves(stone, t);
    else _turmCheckStoneWaves(stone);
  };
}

// --- Der eigene Durchgang ------------------------------------------------------------------------------------------
// game.turmRun: { p, slot, id, mode, st (letzter Zustand der Halle), until, mechUntil, stunUntil, respawnAt, t0,
//   cleared, won, gold (Ebenen), mobGold, kills, loot (Name → Anzahl, alles, was in der Halle fiel) }
const turmFmt = (n) => Math.round(n).toLocaleString('de-DE');
const turmModeOf = () => (net.mode === 'client' ? 'client' : 'local');
function turmToHost(d) {
  if (net.mode === 'client') netSocial('host', d);
  else turmSocial('me', d);
}
// Bedingungen zum Betreten (für das Fenster am Turm)
function turmChecks() {
  const p = game.player;
  const rec = instRecord(TURM.id);
  const left = instLockMin(TURM.id);
  return [
    { ok: p.level >= TURM.level, text: `Du bist mindestens Stufe ${TURM.level} (jetzt ${p.level})`, err: `erst ab Stufe ${TURM.level}` },
    {
      ok: !(rec && rec.done),
      text: rec && rec.done ? `Sperre: Du hast den Wächter schon besiegt – wieder frei in ${left} Min.` : rec ? `Dein Durchgang läuft noch ${left} Min. – du kannst wieder hinein` : `Keine Sperre (${INST.lockMin} Minuten ab dem Betreten)`,
      err: `gesperrt – für dich wieder frei in ${left} Minuten`
    }
  ];
}
// Betreten: o = { open: true/false } für einen neuen Durchgang, { join: Halle } zum Beitreten
function turmEnter(o) {
  const p = game.player;
  if (!p || p.dead || game.turmRun) return;
  const bad = turmChecks().find((c) => !c.ok);
  if (bad) {
    ui.log(`${TURM.name}: ${bad.err}.`, 'warn');
    return;
  }
  if (game.arenaRun || game.pvpMatch || game.duel || (typeof pvpInside === 'function' && pvpInside(p))) {
    ui.log('Erst die Arena bzw. das Duell beenden.', 'warn');
    return;
  }
  if (p.riding && typeof toggleRide === 'function') toggleRide();
  const pm = game.party && game.party.members ? game.party.members.slice(0, 8) : undefined;
  game.turmRun = { p, slot: -1, id: 0, mode: turmModeOf(), st: null, until: 0, mechUntil: 0, stunUntil: 0, respawnAt: 0, askAt: game.time, lastMsgAt: game.time, t0: null,
    cleared: 0, won: false, gold: 0, mobGold: 0, kills: 0, loot: new Map(), outSince: null, modeOff: null, gateAt: 0, fxAt: 0, time: 0 };
  ui.closePanels();
  ui.log('Das Tor des Turms öffnet sich …', 'info');
  turmToHost(o && o.join != null ? { k: 'vtj', s: o.join | 0, l: p.level, pm, tl: TURM.lage } : { k: 'vtn', o: o && o.open ? 1 : 0, l: p.level, pm, tl: TURM.lage });
}
// Mitspieler: alte Monster einer Halle wegräumen (vom Host nicht mehr gemeldet)
function turmPurge(s) {
  if (net.mode !== 'client') return;
  const old = (m) => m.respawn === false && !m.isStone && turmMonSlot(m) === s;
  for (const m of game.monsters) if (old(m)) net.mons.delete(m.id);
  game.monsters = game.monsters.filter((m) => !old(m));
  if (game.target && old(game.target)) game.target = null;
}
// in die zugeteilte Halle
function turmGo(s, id) {
  const run = game.turmRun;
  if (!run) return;
  turmPurge(s);
  run.slot = s;
  run.id = id;
  run.lastMsgAt = game.time;
  run.t0 = game.time;
  const fresh = !instRecord(TURM.id);
  instRecord(TURM.id, true);
  if (fresh) ui.log(`${TURM.name}: Deine Sperre läuft ab jetzt ${INST.lockMin} Minuten.`, 'info');
  // seit Phase 2 erst der Anweg: ein paar Sekunden auf dem eigenen Reittier den düsteren Weg zum Turm (überspringbar,
  // turmfinale.js); danach turmGoHall
  if (typeof turmAnwegStart === 'function' && turmAnwegStart(run)) return;
  turmGoHall(run);
}
// in die Halle (nach dem Anweg oder ohne ihn)
function turmGoHall(run) {
  if (!run || game.turmRun !== run || run.slot < 0) return;
  moveThrough(spotNear(turmEntry(run.slot), 50), TURM.gate);
  ui.banner(TURM.name, 'Fünfzehn Ebenen bis zum Wächter – viel Glück!');
  saveGame();
}
// am Eingang der Halle wieder aufstehen (ohne Verlust, mit gut halbem Leben und kurzem Schutz)
function turmRevive() {
  const run = game.turmRun;
  const p = game.player;
  if (!run || !p.dead) return;
  const s = playerStats(p);
  const at = spotNear(turmEntry(run.slot), 50);
  p.x = at.x;
  p.y = at.y;
  p.hp = Math.round(s.maxHp * 0.6);
  p.mp = Math.round(s.maxMp * 0.6);
  p.dead = false;
  p.deathXpLoss = 0;
  p.protectUntil = game.time + REVIVE_PROTECT;
  p.skillCd = [0, 0, 0, 0, 0];
  run.respawnAt = 0;
  $('panelDeath').hidden = true;
  vfxPillar(p, TURM.gate);
  saveGame();
}
// Verlassen (Knopf, Ende vom Host, Halle verlassen)
function turmStop(why) {
  const run = game.turmRun;
  if (!run) return;
  // Truhe des Wächters nicht geöffnet: die Beute kommt trotzdem mit (turmfinale.js)
  if (run.truhe && typeof turmTruheOeffnen === 'function') turmTruheOeffnen(run, true);
  if (typeof turmFinaleEnde === 'function') turmFinaleEnde(run);
  game.turmRun = null;
  const p = game.player;
  run.time = run.t0 != null ? game.time - run.t0 : 0;
  if (run.slot >= 0) {
    if (run.mode === 'client') {
      if (why !== 'host') netSocial('host', { k: 'vtv' });
      turmPurge(run.slot);
    } else if (turmHost.slots[run.slot]) turmDrop(run.slot, 'me', null);
  }
  if (p.dead && turmInside(p)) {
    const s = playerStats(p);
    p.hp = s.maxHp;
    p.mp = s.maxMp;
    p.dead = false;
    p.deathXpLoss = 0;
    $('panelDeath').hidden = true;
  }
  if (turmInside(p)) moveThrough(turmReturn(), TURM.gate);
  if (run.slot >= 0 && run.t0 != null) {
    const txt = run.won ? 'Der Wächter ist gefallen' : run.cleared ? `${run.cleared} von ${TURM.ebenen} Ebenen geschafft` : 'Keine Ebene geschafft';
    ui.banner(run.won ? `${TURM.name} bezwungen` : `${TURM.name} verlassen`, txt);
    ui.log(`${TURM.name}: ${txt}.`, run.won ? 'level' : 'info');
    turmSummary(run);
  }
  turmHud();
  saveGame();
}

// Nachrichten zum Durchgang (vom Host bzw. aus der eigenen Hallenführung)
function turmOnMsg(d) {
  const p = game.player;
  if (!p) return;
  const run = game.turmRun;
  if (d.k === 'vtl') {
    turmUi.list = Array.isArray(d.r) ? d.r : [];
    turmUi.listAt = game.time;
    turmUi.listOk = true;
    turmWindowRender();
    return;
  }
  if (d.k === 'vtg') {
    if (run && run.slot < 0) {
      // ein Host mit der alten Lage der Hallen: man stünde nicht in seiner Halle
      if ((d.tl | 0) !== TURM.lage) {
        game.turmRun = null;
        if (net.mode === 'client') netSocial('host', { k: 'vtv' });
        ui.log('Der Host spielt eine ältere Version des Turms (die Hallen liegen anders). Wenn alle neu geladen haben, geht es hinein.', 'warn');
        return;
      }
      turmGo(d.s | 0, d.i | 0);
    }
    return;
  }
  if (d.k === 'vtx') {
    if (run && run.slot < 0) {
      game.turmRun = null;
      ui.log(d.r || 'Alle Hallen des Turms sind gerade belegt. Versuch es gleich noch einmal.', 'warn');
    }
    return;
  }
  if (!run || run.slot < 0) return;
  if (d.k === 'vtz') {
    turmStop('host');
    return;
  }
  run.lastMsgAt = game.time;
  if (d.k === 'vts') {
    if ((d.s | 0) !== run.slot) return;
    const prev = run.st;
    // seit 15.84: Zahlen erzwingen – der Stand steht im Fenster (turmHud) und wählt die Ebene (TURM_EBENEN)
    d = Object.assign({}, d, { e: Math.max(1, Math.min(TURM.ebenen, d.e | 0)), n: Math.max(0, Math.min(TURM.maxPlayers, d.n | 0)),
      a: d.a | 0, b: d.b | 0, pl: Math.max(1, Math.min(TURM.maxPlayers, d.pl | 0)), g: d.g | 0, mn: d.mn | 0, ky: d.ky | 0, c: d.c | 0, ut: d.ut | 0, t: Math.max(0, +d.t || 0), mt: Math.max(0, +d.mt || 0), zt: Math.max(0, +d.zt || 0) });
    run.st = d;
    const E = TURM_EBENEN[d.e] || TURM_EBENEN[1];
    run.until = game.time + (+d.t || 0);
    run.mechUntil = d.mt ? game.time + d.mt : 0;
    run.stunUntil = d.zt ? game.time + d.zt : 0;
    if (d.ph === 'p' && (!prev || prev.ph !== 'p' || prev.e !== d.e)) {
      // zwischen zwei Ebenen ist die Halle leer: Reste (verpasste Tode) entfernen
      turmPurge(run.slot);
      ui.banner(`Ebene ${d.e}`, `${E.name} · gleich geht es los`);
      if (typeof sfx !== 'undefined' && sfx.riser) sfx.riser();
    } else if (d.ph === 'f' && (!prev || prev.ph !== 'f' || prev.e !== d.e)) {
      ui.banner(`Ebene ${d.e} · ${E.name}`, E.ziel);
      if (E.boss) shakeScreen(6);
    }
    turmStonesDress(run);
    turmHud();
    return;
  }
  if (d.k === 'vte') turmOnEvent(run, d);
  turmHud();
}
// Steine der eigenen Halle: Name, Aussehen und Höchstleben aus dem Zustand (der Host schickt für Steine kein Höchstleben)
function turmStonesDress(run) {
  const st = run.st;
  if (!st || net.mode !== 'client') return;
  const art = TURM_EBENEN[st.e].art;
  const list = turmSlotStones(run.slot);
  for (let k = 0; k < 12; k++) {
    const m = list[k];
    if (!m) continue;
    const a = k >= 8 ? 'k' : art === 't' ? 't' : 's';
    if (m.__turmArt === a + st.pl) continue;
    m.__turmArt = a + st.pl;
    turmStoneDress(m, a, st.pl);
  }
}
// Ereignisse der Halle: Belohnung der Ebene, Steine, Schlüssel, Tore, Seelenketten, Sieg
function turmOnEvent(run, d) {
  const p = game.player;
  const here = turmSlotAt(p.x, p.y) === run.slot;
  const snd = (n) => { if (typeof sfx !== 'undefined' && sfx[n]) sfx[n](); };
  // Zuschauer auf den Rängen (tribuene.js): jubeln bei geschafften Ebenen, Steinen, Toren – und wenn alle fallen
  const jubel = (k, dur) => { if (here && typeof tribJubel === 'function') tribJubel(k, dur); };
  if (d.t === 'lv') {
    // seit 15.84 höchstens die letzte Ebene (das Gold wächst mit e)
    const e = Math.min(TURM.ebenen, d.e | 0);
    if (e <= run.cleared || !here) return;
    run.cleared = e;
    const g = TURM.gold * e;
    p.gold += g;
    run.gold += g;
    gainXp(TURM.xp * e);
    ui.banner(`Ebene ${e} geschafft`, `+${turmFmt(g)} Gold`);
    addText(p.x, p.y - 52, `+${turmFmt(g)} Gold`, 'gold');
    // nach einem Hüter tobt die Menge länger
    jubel(1, TURM_EBENEN[e] && TURM_EBENEN[e].boss ? 9 : 6);
    snd('success');
    saveGame();
  } else if (d.t === 'st') {
    const m = typeof monsterById === 'function' ? monsterById(d.i) : null;
    if (d.r === 0) {
      ui.banner('Trugbild!', 'Der falsche Stein ruft eine Strafwelle');
      if (m) turmBurst(m.x, m.y - 14, '#b48cff');
      snd('fail');
      return;
    }
    if (d.r === 1) {
      ui.banner('Ein echter Stein!', `Echte Steine ${d.a}/${d.b}`);
      snd('success');
    }
    jubel(0.6, 3);
    // echte Seelensteine geben ihre gewohnte Beute – jedem, der in der Halle steht. Die Monsterteile dazu sind die
    // des Seelenhains (das Gebiet der Hallen hat keine eigenen Monstergruppen)
    if (m && here && typeof _turmRewardKill === 'function') {
      const z = m.zone;
      m.zone = ZONES.find((x) => x.id === 'seelenhain') || z;
      try { _turmRewardKill(m); } finally { m.zone = z; }
    }
  } else if (d.t === 'key') {
    ui.banner('Ein Schlüssel!', 'Bringt ihn zu einem verschlossenen Tor');
    turmBurst(d.x, d.y - 10, '#ffd34d');
    addText(d.x, d.y - 30, 'Schlüssel', 'gold');
    snd('clang');
  } else if (d.t === 'gate') {
    const at = turmGateAt(run.slot, d.g | 0, 0.8);
    ui.banner(`${TURM_TORE[d.g | 0].name} geöffnet`, `Tore ${d.a}/4`);
    turmBurst(at.x, at.y - 20, TURM.glut);
    shakeScreen(5);
    snd('shatter');
    jubel(0.6, 3);
  } else if (d.t === 'mech') {
    ui.banner('Seelenketten!', `Zerschlagt die ${d.n} Kettensteine vor den Toren – ${d.z} s`);
    shakeScreen(8);
    snd('riser');
  } else if (d.t === 'ok') {
    ui.banner('Die Ketten reißen!', 'Kharzul ist benommen – jetzt zuschlagen');
    snd('success');
  } else if (d.t === 'fail') {
    ui.banner('Die Ketten halten!', 'Kharzul entlädt die Seelen und heilt sich');
    shakeScreen(14);
    snd('fail');
    const m = typeof monsterById === 'function' ? monsterById(d.i) : null;
    if (m) turmBurst(m.x, m.y - 30, TURM.seele);
    if (here && !p.dead) {
      turmBurst(p.x, p.y - 20, TURM.seele);
      damagePlayer(Math.round(game.stats.maxHp * TURM.schlag), null, { pvp: true, dot: true });
    }
  } else if (d.t === 'reset') {
    ui.banner('Alle gefallen', `Ebene ${d.e} beginnt von vorn`);
    jubel(0.85, 5);
  } else if (d.t === 'win') {
    run.won = true;
    run.time = +d.z || 0;
    snd('success');
    jubel(1, 16);
    ui.log(`${TURM.name}: Alle fünfzehn Ebenen geschafft! Öffnet die Truhe des Wächters und besucht den Turm-Schmied, bevor euch der Turm hinausbringt.`, 'level');
    // Truhe des Wächters, Turm-Schmied und die Rückkehr mit Countdown (turmfinale.js)
    if (typeof turmFinaleSieg === 'function') turmFinaleSieg(run);
  }
}
// kleiner Funkenstoß (2D und 3D), ohne Ring
function turmBurst(x, y, color) {
  addEffect({ type: 'burst', x, y, dur: 0.5, color, count: 12 });
  if (V3.on) addEffect({ type: 'sparks3', x, y: y + 14, h: 0.6, count: 14, color, speed: 2.4, up: 1.4, dur: 0.7 });
}

// Anfragen der Mitspieler an den Host (und des Hosts an sich selbst)
function turmSocial(pid, d) {
  const host = pid === 'me' || net.mode === 'host';
  const reply = (x) => (pid === 'me' ? turmOnMsg(x) : netSocial(pid, x));
  if (d.k === 'vtq') {
    if (host) reply({ k: 'vtl', r: turmList() });
    return;
  }
  // seit dem Umbau liegen die Hallen woanders (TURM.lage): Geräte mit der alten Lage stünden in einer anderen Halle
  const alt = (d.k === 'vtn' || d.k === 'vtj') && (d.tl | 0) !== TURM.lage;
  if (alt && host) { reply({ k: 'vtx', r: 'Der Turm wurde umgebaut – bitte das Spiel neu laden (aktuelle Version), dann geht es hinein.' }); return; }
  if (d.k === 'vtn') {
    if (!host) return;
    if ((d.l | 0) < TURM.level) { reply({ k: 'vtx', r: `Der Turm öffnet sich erst ab Stufe ${TURM.level}.` }); return; }
    const s = turmAlloc(pid, !!d.o, Array.isArray(d.pm) ? d.pm.map(String) : null);
    if (s < 0) { reply({ k: 'vtx', r: 'Alle Hallen des Turms sind gerade belegt. Tritt einem laufenden Durchgang bei oder versuch es später.' }); return; }
    turmJoinHost(pid, s, d.l, d.pm);
    reply({ k: 'vtg', s, i: turmHost.slots[s].id, tl: TURM.lage });
    turmTellState(turmHost.slots[s], s);
    return;
  }
  if (d.k === 'vtj') {
    if (!host) return;
    const why = turmJoinHost(pid, d.s, d.l, d.pm);
    if (why) { reply({ k: 'vtx', r: why }); return; }
    const S = turmHost.slots[d.s | 0];
    reply({ k: 'vtg', s: d.s | 0, i: S.id, tl: TURM.lage });
    turmTellState(S, d.s | 0);
    return;
  }
  if (d.k === 'vtv') {
    if (!host) return;
    const s = turmHost.slots.findIndex((S) => S && S.members.includes(pid));
    if (s >= 0) turmDrop(s, pid, null);
    return;
  }
  if (d.k === 'vtk') {
    if (!host) return;
    const s = turmHost.slots.findIndex((S) => S && S.members.includes(pid));
    if (s >= 0) turmGateUse(s, pid, d.g);
    return;
  }
  // seit 15.84: Nachrichten zum Durchgang nur vom echten Host (bzw. aus der eigenen Hallenführung) – vorher nahm ein
  // Mitspieler sie von jedem an (falscher Stand im Fenster, Gold für „geschaffte Ebenen“, Schaden)
  if (pid === 'me' || pid === 'host') turmOnMsg(d);
}
const _turmOnSocial = onSocial;
onSocial = function (pid, d) {
  if (d && typeof d.k === 'string' && /^vt[a-z]$/.test(d.k)) {
    turmSocial(pid, d);
    return;
  }
  return _turmOnSocial(pid, d);
};

// Tor mit einem Schlüssel öffnen (wer mit einem Schlüssel an ein verschlossenes Tor tritt oder es antippt)
function turmGateTry(g, laut) {
  const run = game.turmRun;
  const st = run && run.st;
  if (!st || run.slot < 0) return;
  if (TURM_EBENEN[st.e].art !== 'k' || st.ph !== 'f') {
    if (laut) ui.log(st.g & (1 << g) ? 'Das Tor steht offen.' : 'Das Tor ist fest verschlossen.', 'info');
    return;
  }
  if (st.g & (1 << g)) {
    if (laut) ui.log('Dieses Tor ist schon offen.', 'info');
    return;
  }
  if (!(st.ky > 0)) {
    if (laut) ui.log('Das Tor ist verschlossen – ihr braucht einen Schlüssel. Die Glutwichte tragen sie.', 'warn');
    return;
  }
  if (game.time < run.gateAt) return;
  run.gateAt = game.time + 0.8;
  turmToHost({ k: 'vtk', g });
}

// jedes Bild (über raidWatch): Hallen führen, eigener Durchgang, Anzeige
function turmTick() {
  const p = game.player;
  if (!p || !game.world) return;
  turmTickHost();
  turmWindowTick();
  if (WAECHTER) return;
  // anderer Charakter gestartet: alter Durchgang verfällt
  if (game.turmRun && game.turmRun.p !== p) {
    game.turmRun = null;
    turmHost.slots.forEach((S, s) => { if (S && S.members.includes('me')) turmDrop(s, 'me', null); });
  }
  const run = game.turmRun;
  const here = turmSlotAt(p.x, p.y);
  if (here >= 0 && game.riftAt != null && game.riftAt - game.time < 30) game.riftAt = game.time + 30; // keine Dungeon-Risse im Turm
  if (!run) {
    // in einer Halle ohne Durchgang (z. B. nach dem Neuladen): zurück vor den Turm
    if (here >= 0) {
      if (p.dead) {
        const s = playerStats(p);
        p.hp = s.maxHp;
        p.mp = s.maxMp;
        p.dead = false;
        p.deathXpLoss = 0;
        $('panelDeath').hidden = true;
      }
      ui.log('Die Halle des Turms ist leer. Du stehst wieder vor dem Turm.', 'info');
      moveThrough(turmReturn(), TURM.gate);
    }
    turmHud();
    return;
  }
  // Mehrspieler ein- oder ausgeschaltet, Host gewechselt: der Durchgang endet (nach einer Schonfrist)
  if (run.mode !== turmModeOf()) {
    if (run.modeOff == null) run.modeOff = performance.now();
    if (performance.now() - run.modeOff > TURM.netGrace * 1000) turmStop('host');
    else turmHud();
    return;
  }
  run.modeOff = null;
  if (run.slot < 0) {
    if (game.time - run.askAt > 12) {
      game.turmRun = null;
      ui.log('Keine Antwort aus dem Turm (spielt der Host eine ältere Version?). Versuch es später noch einmal.', 'warn');
    }
    turmHud();
    return;
  }
  // gefallen: nach kurzer Zeit am Eingang wieder aufstehen
  if (p.dead) {
    if (!run.respawnAt) run.respawnAt = game.time + TURM.respawn;
    if (game.time >= run.respawnAt) turmRevive();
    turmHud();
    return;
  }
  run.respawnAt = 0;
  // auf dem Anweg (turmfinale.js): noch nicht in der Halle
  if (run.anweg && typeof turmAnwegTick === 'function') {
    turmAnwegTick(run);
    turmHud();
    return;
  }
  // Halle verlassen: wer nur über die Wand gerutscht ist, kommt zurück an den Eingang; sonst endet der Durchgang.
  // Seit dem Umbau ist das Feld der Halle viel größer als die Halle: wer im Fels des eigenen Felds steht (Sprung oder
  // Teleport über die Wand), kommt ebenso an den Eingang
  if (here === run.slot && !turmOnFloor(run.slot, p.x, p.y) && !canStand(p.x, p.y, p.r * 0.7, false)) {
    const at = turmEntry(run.slot);
    p.x = at.x;
    p.y = at.y;
    run.outSince = null;
  } else if (here !== run.slot) {
    if (p.x / TILE >= WORLD_W && p.y / TILE >= DUNGEON_H + 250) {
      const at = turmEntry(run.slot);
      p.x = at.x;
      p.y = at.y;
      run.outSince = null;
    } else {
      if (run.outSince == null) run.outSince = game.time;
      if (game.time - run.outSince > 1.5) {
        turmStop('weg');
        return;
      }
    }
  } else run.outSince = null;
  if (run.mode === 'client' && game.time - run.lastMsgAt > 25) {
    turmStop('host');
    return;
  }
  const st = run.st;
  if (st && st.ph === 'f') {
    // mit einem Schlüssel an ein verschlossenes Tor treten öffnet es
    if (TURM_EBENEN[st.e].art === 'k' && st.ky > 0) {
      for (let g = 0; g < 4; g++) {
        if (st.g & (1 << g)) continue;
        const at = turmGateAt(run.slot, g);
        if (hyp(p.x - at.x, p.y - at.y) < 2.4 * TILE) { turmGateTry(g, false); break; }
      }
    }
    // neue Gegner zum ersten Mal gesehen: Glutstoß, Hüter und Wächter stellen sich vor
    if (game.time >= run.fxAt) {
      run.fxAt = game.time + 0.15;
      turmSeenTick(run);
    }
  }
  turmHud();
}
const turmSeenIds = new WeakSet();
function turmSeenTick(run) {
  const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
  for (const m of list) {
    if (m.dead || turmSeenIds.has(m) || turmMonSlot(m) !== run.slot) continue;
    if (m.isStone) {
      if (m.turmSeen) continue;
      m.turmSeen = true;
      turmBurst(m.x, m.y - 12, m.stoneType.look.glow);
      continue;
    }
    turmSeenIds.add(m);
    const boss = m.type && m.type.inst;
    const y = feetY(m);
    if (V3.on) {
      addEffect({ type: 'column3', x: m.x, y, dur: 0.9, color: boss ? m.type.boss.color : TURM.glut, core: '#fff2dc', r: boss ? 46 : m.typeId === 'turm_glutwicht' ? 14 : 24, hgt: boss ? 4.4 : 2.4 });
      if (boss) addEffect({ type: 'smoke3', x: m.x, y, count: 14, color: '#3a2a2a', size: 1.6, op: 0.5, dur: 1.6 });
    } else addEffect({ type: 'pillar', x: m.x, y, dur: 0.8, color: boss ? m.type.boss.color : TURM.glut });
    if (boss) {
      shakeScreen(7);
      ui.banner(m.name, m.type.inst.title);
      if (typeof tribJubel === 'function') tribJubel(0.7, 3.5);
    }
  }
}
const _turmRaidWatch = raidWatch;
raidWatch = function () {
  _turmRaidWatch();
  turmTick();
};

// --- Belohnung -----------------------------------------------------------------------------------------------------
// Gewöhnliche Gegner: Erfahrung und etwas Gold (geteilt durch den Faktor der Gegnerzahl, so bringt eine Ebene jedem
// so viel wie allein), keine Gegenstände. Glutwichte nur ein wenig Erfahrung. Hüter wie die Wächter der Lv-80-
// Instanzen, der Wächter wie ein Lv-80-Instanzboss; beides je Sperre nur einmal (p.instLock.turm: mb, done).
const TURM_BITS = { turm_hueter: 1, turm_ilmra: 2, turm_varn: 4 };
function turmKillReward(m) {
  const p = game.player;
  const run = game.turmRun;
  if (!run || run.slot < 0 || turmMonSlot(m) !== run.slot || turmSlotAt(p.x, p.y) !== run.slot) return;
  if (m.isStone) return; // Steine: Beute über das Ereignis der Halle (echte Steine, turmOnEvent)
  p.kills++;
  run.kills++;
  if (m.type && m.type.inst) {
    ui.dropAt = { x: m.x, y: feetY(m) };
    try { turmBossLoot(m); } finally { ui.dropAt = null; }
    return;
  }
  const imp = m.typeId === 'turm_glutwicht';
  const k = (imp ? 0.15 : 1) / turmScale(run.st ? run.st.pl : 1).n;
  const xp = Math.max(1, Math.round(m.xp * MOB_XP_MUL * xpFactor(p.level, m.level) * k));
  const gold = imp || !m.gold ? 0 : Math.round(randInt(m.gold[0], m.gold[1]) * k);
  if (gold > 0) {
    p.gold += gold;
    run.mobGold += gold;
    addText(m.x + 14, feetY(m) - 30, '+' + gold + ' Gold', 'gold');
  }
  gainXp(xp);
}
function turmBossLoot(m) {
  const rec = instRecord(TURM.id, true);
  if (m.typeId === 'turm_waechter') {
    if (rec.done) {
      ui.log(`${TURM.name}: ${m.name} hast du in dieser Sperre schon besiegt – Beute wieder in ${instLockMin(TURM.id)} Min.`, 'warn');
      return;
    }
    rec.done = 1;
    instDevMark(TURM.id, rec);
    // seit Phase 2 liegt die Beute in der Truhe des Wächters (turmfinale.js); wer sie nicht öffnet, bekommt sie beim
    // Hinausgehen
    const run = game.turmRun;
    if (run) {
      run.truhe = m;
      ui.banner(`${m.name} ist gefallen!`, 'Die Truhe des Wächters erscheint');
    } else turmFinalLoot(m);
  } else {
    const bit = TURM_BITS[m.typeId] || 1;
    if (rec.mb & bit) {
      ui.log(`${m.name}: Diese Beute hast du in dieser Sperre schon bekommen.`, 'info');
      return;
    }
    rec.mb |= bit;
    instDevMark(TURM.id, rec);
    turmMiniLoot(m);
  }
  saveGame();
}
// Hüter: mit etwas Glück ein episches Teil (Lv 70 oder 80), selten ein legendäres (seit 15.74 statt des epischen –
// höchstens ein Ausrüstungsteil), dazu Splitter, Teile und Gold
function turmMiniLoot(m) {
  const p = game.player;
  const leg = Math.random() < INST.miniLegendary80 ? dropLegendary(m) : null;
  let got = null;
  if (!leg && Math.random() < INST.miniEpic[3]) {
    const item = setTagItem(rollRarityItem(Math.random() < INST.epic70 ? 80 : 70, 3), m);
    if (giveRarityItem(item, m)) got = item;
  }
  instMats(m, { splinters: randInt(3, 5) }, randInt(2, 3));
  const gold = monsterGold(m.level * 150);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${m.name} ist gefallen!`, leg ? 'Ein legendäres Teil!' : got ? 'Ein episches Teil!' : 'Hüter besiegt');
}
// Wächter (seit Phase 2 in der Truhe des Wächters, turmfinale.js): seit 15.74 genau EIN Ausrüstungsteil – zu 35 % ein
// legendäres (über KS.quellen2 meist ein Teil des Klassen-Sets der zweiten Reihe), sonst ein episches (Lv 80, zur
// Hälfte eine Waffe); dazu Splitter, Schmiede-Teile, 2–3 Ätherkerne, zur Hälfte ein Seelenstein (Gegenstand) und Gold.
// Phase 2 bis 15.73: drei epische und ein legendäres oder viertes episches. Rückgabe: was es gab
function turmFinalLoot(m) {
  const p = game.player;
  // seit 15.76 mit Pech-Schutz (pechschutz.js) und der Schwierigkeit (schwierigkeit.js)
  const base = Math.max(INST.legendary80, TURM.truheLeg) * (typeof diffLoot === 'function' ? diffLoot().leg : 1);
  const leg = (typeof pechLeg === 'function' ? pechLeg('turm', base) : Math.random() < base) ? dropLegendary(m) : null;
  if (!leg) giveRarityItem(setTagItem(rollRarityItem(80, 3, null, Math.random() < 0.5 ? 'waffe' : null), m), m);
  instMats(m, { splinters: randInt(14, 20) }, randInt(5, 7));
  const kerne = randInt(2, 3);
  p.materials.aetherkern = (p.materials.aetherkern || 0) + kerne;
  ui.loot('Ätherkern', kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  const stein = Math.random() < 0.5;
  if (stein) addSkillMat('seelenstein', 1, m);
  const gold = monsterGold((m.level || TURM.level) * 1000);
  p.gold += gold;
  ui.loot('Gold', gold, lootIconUrl('gold'), '#ffd96a');
  ui.banner(`${TURM.name} bezwungen!`, leg ? 'Ein legendäres Teil!' : 'Ein episches Teil!');
  ui.log(`${TURM.name}: Die Truhe des Wächters ist geöffnet. Wieder frei in ${instLockMin(TURM.id)} Min.`, 'level');
  saveGame();
  return { leg: !!leg, epic: leg ? 0 : 1, kerne, stein, gold };
}
// Wer in der Halle seines Durchgangs steht, bekommt jeden Kill dieser Halle; wer nicht dazugehört, nichts
const _turmNetEligible = netEligible;
netEligible = function (m, who, myHitAt) {
  const s = turmMonSlot(m);
  if (s >= 0 && m && (m.respawn === false || m.isStone)) {
    const run = game.turmRun;
    const me = game.player;
    return !!(run && me && run.slot === s && turmSlotAt(me.x, me.y) === s);
  }
  return _turmNetEligible(m, who, myHitAt);
};
const _turmRewardKill = rewardKill;
rewardKill = function (m) {
  if (m && (m.respawn === false || m.isStone) && turmMonSlot(m) >= 0) {
    turmKillReward(m);
    return;
  }
  return _turmRewardKill(m);
};
// Legendäre Teile aus dem Turm gehören meist zum Klassen-Set (seit 15.45 zur zweiten Reihe, KS.quellen2 in
// klassensets.js); ein eigenes Set hat der Turm nicht – die Kennung 'turm' bleibt darum an keinem Teil stehen
if (typeof KS !== 'undefined') (KS.quellen2 || KS.quellen).add(TURM.id);
if (typeof setIdOfMonster === 'function') {
  const _turmSetId = setIdOfMonster;
  setIdOfMonster = function (m) {
    if (m && m.type && m.type.turm && m.zone === TURM_ZONE) return TURM.id;
    return _turmSetId(m);
  };
}
if (typeof setTagItem === 'function') {
  const _turmSetTag = setTagItem;
  setTagItem = function (item, m) {
    const r = _turmSetTag(item, m);
    if (item && item.set === TURM.id) delete item.set;
    return r;
  };
}
// alles, was in der Halle fällt, für die Übersicht am Ende mitzählen
const _turmLootNow = ui.lootNow;
ui.lootNow = function (name, count, icon, color) {
  const run = game.turmRun;
  if (run && run.slot >= 0 && count > 0 && game.player && turmSlotAt(game.player.x, game.player.y) === run.slot) {
    const o = run.loot.get(name) || { n: 0, color };
    o.n += count;
    run.loot.set(name, o);
  }
  return _turmLootNow.call(this, name, count, icon, color);
};

// Tod im Turm: kein Fenster, kein Verlust – nach TURM.respawn s steht man am Eingang der Halle wieder auf
const _turmShowDeath = ui.showDeath;
ui.showDeath = function (lostXp) {
  const run = game.turmRun;
  const p = game.player;
  if (run && run.slot >= 0 && p && turmSlotAt(p.x, p.y) === run.slot) {
    this.closePanels();
    p.deathXpLoss = 0;
    run.respawnAt = game.time + TURM.respawn;
    ui.banner('Gefallen', `In ${TURM.respawn} Sekunden stehst du am Eingang der Halle wieder auf`);
    turmHud();
    return;
  }
  return _turmShowDeath.call(this, lostXp);
};
// Wiederbeleben in einer Halle (falls doch das Fenster kam): am Eingang bzw. vor dem Turm
const _turmVillageSpawn = villageSpawn;
villageSpawn = function (p) {
  if (p && turmInside(p)) {
    const run = game.turmRun;
    return run && run.slot >= 0 && p === game.player ? turmEntry(run.slot) : turmReturn();
  }
  // gespeichert in einer Halle von vor dem Umbau (dort ist jetzt Fels): vor den Turm
  if (p && p.x / TILE >= WORLD_W + 14 && p.y / TILE >= DUNGEON_H + 262 && p.y / TILE < DUNGEON_H + 299) return turmReturn();
  return _turmVillageSpawn(p);
};
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('instLock')) SAVE_FIELDS.push('instLock');

// --- Anzeige: Ebene, Ziel, Zähler, Verlassen -------------------------------------------------------------------------
// Am PC eine Karte über dem Chat (wie die Prüfungsarena), am Handy eine schmale Pille links unter der Lebensanzeige:
// „E3/11 · 7 Geg. · 3/10“ und ✕ (fragt nach). Die Lage wird nur beim Erscheinen und bei Größenänderung neu gesetzt.
const turmUi = { el: null, key: '', touch: false, placeDue: true, confirm: false, confirmAt: 0, list: [], listAt: -99, listOk: false, askAt: -99, openAt: 0, npc: null, open: 0 };
const turmBox = (id) => {
  const e = document.getElementById(id);
  if (!e || e.hidden || e.closest('[hidden]')) return null;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
};
function turmHudPlace(el) {
  turmUi.placeDue = false;
  if (turmUi.touch) {
    const c = turmBox('hudChar');
    let bottom = c ? c.bottom : 90;
    for (const id of ['buffList', 'partyFrame']) {
      const r = turmBox(id);
      if (r && c && r.left < c.right) bottom = Math.max(bottom, r.bottom);
    }
    const left = Math.round(Math.max(6, c ? c.left : 6));
    let top = Math.round(bottom + 4);
    const w = el.getBoundingClientRect().width;
    const h = el.getBoundingClientRect().height;
    for (const id of ['bossBar', 'targetFrame']) {
      const r = turmBox(id);
      if (r && left < r.right && r.left < left + w && top < r.bottom && r.top < top + h) top = Math.round(r.bottom + 4);
    }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.bottom = 'auto';
    return;
  }
  const r = turmBox('chatBox');
  if (r) {
    el.style.left = Math.round(Math.max(4, r.left)) + 'px';
    el.style.top = 'auto';
    el.style.bottom = Math.round(window.innerHeight - r.top + 6) + 'px';
  } else {
    const c = turmBox('hudChar');
    el.style.left = Math.round(c ? c.left : 8) + 'px';
    el.style.top = Math.round((c ? c.bottom : 120) + 6) + 'px';
    el.style.bottom = 'auto';
  }
}
function turmHudCss() {
  if (document.getElementById('turmCss')) return;
  const st = document.createElement('style');
  st.id = 'turmCss';
  st.textContent =
    '#turmHud{position:fixed;left:8px;top:90px;z-index:5;pointer-events:none;color:#ffe2cc;text-shadow:0 1px 2px #000}' +
    '#turmHud.tu-pc{width:292px;border-radius:12px;overflow:hidden;font:600 12.5px/1.3 system-ui,sans-serif;' +
    'background:linear-gradient(180deg,rgba(52,22,16,.94),rgba(20,10,10,.92));border:1px solid rgba(255,122,58,.55);box-shadow:0 4px 16px rgba(0,0,0,.5)}' +
    '#turmHud .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 11px;background:rgba(255,106,42,.14);border-bottom:1px solid rgba(255,122,58,.3)}' +
    '#turmHud .hd b{color:#ff9a5a;font-size:13px}#turmHud .hd .wv{font:900 15px/1 system-ui,sans-serif;color:#fff}' +
    '#turmHud .bd{display:grid;gap:6px;padding:7px 11px 9px}#turmHud .row{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '#turmHud .zl{color:#ffe0b0;font-size:13.5px;font-weight:700}' +
    '#turmHud .bar{height:8px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden}#turmHud .bar i{display:block;height:100%;transition:width .3s;background:linear-gradient(90deg,#b8401e,#ffb04a)}' +
    '#turmHud .nx{padding:5px 8px;border-radius:8px;background:rgba(255,140,60,.1);border:1px solid rgba(255,140,60,.32);color:#ffd8b8;text-align:center}' +
    '#turmHud .nx{font-weight:700}#turmHud .nx.ke{background:rgba(143,227,106,.12);border-color:rgba(143,227,106,.5);color:#dcffc8}' +
    '#turmHud button{pointer-events:auto;cursor:pointer;font:700 12px system-ui,sans-serif;color:#fff;background:rgba(122,42,26,.85);border:1px solid #c86a4a;border-radius:8px;padding:4px 12px}' +
    '#turmHud button:hover{background:#9a3a26}#turmHud small{opacity:.8;font-weight:600}' +
    '#turmHud.tu-t{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;max-width:min(320px,48vw);padding:2px 3px 2px 9px;border-radius:13px;white-space:nowrap;' +
    'font:600 11px/1.2 system-ui,sans-serif;background:rgba(34,14,10,.8);border:1px solid rgba(255,122,58,.55);box-shadow:0 2px 8px rgba(0,0,0,.4)}' +
    '#turmHud.tu-t [data-a="e"]{color:#ff9a5a;font-weight:800}#turmHud.tu-t [data-a="m"]{color:#c8ffb0}' +
    '#turmHud.tu-t button{width:22px;height:20px;padding:0;line-height:18px;border-radius:10px;font-size:11px}' +
    '#turmHud.tu-t [data-a="d"]{flex-basis:100%;display:none;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:2px 0 3px;white-space:normal}' +
    '#turmHud.tu-t [data-a="d"] button{width:auto;padding:2px 8px}' +
    '#turmSum{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.92);opacity:0;z-index:60;min-width:240px;max-width:min(340px,calc(100vw - 32px));' +
    'padding:14px 16px 12px;border-radius:12px;background:rgba(26,14,12,.94);border:1px solid rgba(255,122,58,.55);box-shadow:0 6px 24px rgba(0,0,0,.55);' +
    'color:#f3e2d4;font-size:14px;transition:opacity .25s,transform .25s;pointer-events:auto}#turmSum.on{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
    '#turmSum h3{margin:0 26px 8px 0;font-size:16px;color:#ff9a5a}#turmSum .x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;border-radius:8px;' +
    'background:rgba(255,255,255,.08);color:#f3e2d4;font-size:16px;cursor:pointer}#turmSum dl{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin:0}' +
    '#turmSum dt{opacity:.8}#turmSum dd{margin:0;text-align:right;font-weight:600}#turmSum dd.g{color:#ffd56a}' +
    '#turmSum h4{margin:10px 0 4px;font-size:13px;color:#ffd08a}#turmSum ul{margin:0;padding:0;list-style:none;display:grid;gap:2px;font-size:13px}#turmSum li{display:flex;justify-content:space-between;gap:10px}' +
    '.turm-runs{display:grid;gap:5px;margin:0 0 10px}.turm-run{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.06)}' +
    '.turm-run span{flex:1;min-width:0}.turm-run small{opacity:.8}.turm-art{display:grid;gap:4px;margin:0 0 10px}' +
    '.turm-art label{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.06);cursor:pointer;min-height:36px}' +
    '.turm-art input{width:20px;height:20px;margin:0}';
  document.head.appendChild(st);
}
function turmHudBuild() {
  turmHudCss();
  const touch = !!(typeof input !== 'undefined' && input.touchUi);
  const el = document.createElement('div');
  el.id = 'turmHud';
  turmUi.touch = touch;
  el.className = touch ? 'tu-t' : 'tu-pc';
  if (touch) {
    el.innerHTML = '<span data-a="e"></span><span data-a="z"></span><span data-a="m"></span><span data-a="n"></span><button type="button" data-a="x" aria-label="Turm verlassen">✕</button>' +
      '<div data-a="d"><span data-a="q">Turm verlassen?</span><button type="button" data-a="y">Ja, verlassen</button></div>';
    el.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-a]');
      const a = t && t.dataset.a;
      if (a === 'y') {
        if (performance.now() - turmUi.confirmAt < 800) return;
        turmUi.confirm = false;
        turmStop('aufgeben');
        return;
      }
      if (a === 'x') {
        turmUi.confirm = !turmUi.confirm;
        if (turmUi.confirm) {
          const at = turmUi.confirmAt = performance.now();
          setTimeout(() => { if (turmUi.confirm && turmUi.confirmAt === at) { turmUi.confirm = false; turmUi.key = ''; turmHud(); } }, 5000);
        }
        turmUi.key = '';
        turmHud();
      }
    });
  } else {
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-a="x"]')) turmStop('aufgeben');
    });
  }
  el.hidden = true;
  document.body.appendChild(el);
  const due = () => {
    turmUi.placeDue = true;
    if (turmUi.el && !turmUi.el.hidden) turmHudPlace(turmUi.el);
  };
  window.addEventListener('resize', due);
  window.addEventListener('orientationchange', due);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(due);
    for (const id of ['hudChar', 'buffList', 'partyFrame', 'bossBar', 'targetFrame', 'chatBox']) {
      const e = document.getElementById(id);
      if (e) ro.observe(e);
    }
  }
  turmUi.el = el;
}
// Ziel der Ebene in Worten: { lang (PC), kurz (Handy), k (Fortschritt 0–1) }
function turmGoal(run) {
  const st = run.st;
  const E = TURM_EBENEN[st.e];
  const a = st.a | 0;
  const b = Math.max(1, st.b | 0);
  if (st.ph === 'w') return { lang: 'Der Wächter ist gefallen – der Turm ist bezwungen', kurz: 'Bezwungen', k: 1 };
  if (st.ph === 'p') return { lang: E.ziel, kurz: `${Math.max(0, Math.ceil(run.until - game.time))} s`, k: 0 };
  if (E.art === 'w') return { lang: `Noch ${Math.max(0, b - a)} von ${b} Verdammten`, kurz: `${Math.max(0, b - a)} Geg.`, k: a / b };
  if (E.art === 's') return { lang: `Seelensteine ${a}/${b}`, kurz: `Steine ${a}/${b}`, k: a / b };
  if (E.art === 't') return { lang: `Echte Steine ${a}/${b} · noch ${st.c | 0} Steine`, kurz: `Echt ${a}/${b}`, k: a / b };
  if (E.art === 'k') return { lang: `Schlüssel ${st.ky | 0} · Tore ${a}/4`, kurz: `Schl. ${st.ky | 0} · Tore ${a}/4`, k: a / 4 };
  if (E.art === 'u') {
    const ut = st.ut | 0;
    return ut > 0 ? { lang: `Haltet stand: noch ${ut} s`, kurz: `${ut} s`, k: 1 - ut / (E.dauer || 60) }
      : { lang: `Besiegt den Rest: noch ${a} Verdammte`, kurz: `${a} Geg.`, k: 1 };
  }
  const bh = Array.isArray(st.bh) && st.bh.length ? st.bh : [1000];
  const hp = bh.reduce((n, x) => n + x, 0) / bh.length / 1000;
  if (E.art === 'b' && bh.length > 1) return { lang: `Hüter ${a}/${b} besiegt`, kurz: `Hüter ${a}/${b}`, k: 1 - hp };
  return { lang: `${E.art === 'f' ? 'Wächter' : 'Hüter'}: noch ${Math.ceil(hp * 100)} % Leben`, kurz: `${Math.ceil(hp * 100)} %`, k: 1 - hp };
}
function turmHud() {
  const run = game.turmRun;
  if (WAECHTER) return;
  if (!turmUi.el) {
    if (!run) return;
    turmHudBuild();
  }
  const el = turmUi.el;
  if (!run || run.slot < 0 || !run.st || !game.running || run.anweg) {
    if (!el.hidden) {
      el.hidden = true;
      turmUi.confirm = false;
    }
    return;
  }
  const st = run.st;
  const E = TURM_EBENEN[st.e];
  const now = game.time;
  const p = game.player;
  const G = turmGoal(run);
  const pause = Math.max(0, Math.ceil(run.until - now));
  const mech = run.mechUntil > now ? Math.ceil(run.mechUntil - now) : 0;
  const stun = run.stunUntil > now ? Math.ceil(run.stunUntil - now) : 0;
  const dead = p.dead && run.respawnAt ? Math.max(0, Math.ceil(run.respawnAt - now)) : -1;
  if (turmUi.touch) {
    const m = dead >= 0 ? `† ${dead} s` : mech ? `Ketten ${st.mn | 0} · ${mech} s` : stun ? `Benommen ${stun} s` : '';
    const key = [st.e, st.ph, G.kurz, m, st.n, turmUi.confirm].join('|');
    if (key !== turmUi.key) {
      turmUi.key = key;
      turmUi.placeDue = true;
      el.querySelector('[data-a="e"]').textContent = `E${st.e}/${TURM.ebenen}`;
      el.querySelector('[data-a="z"]').textContent = st.ph === 'p' ? `Pause ${G.kurz}` : G.kurz;
      el.querySelector('[data-a="m"]').textContent = m;
      el.querySelector('[data-a="n"]').textContent = `${st.n}/${TURM.maxPlayers}`;
      el.querySelector('[data-a="d"]').style.display = turmUi.confirm ? 'flex' : 'none';
    }
  } else {
    const key = [st.e, st.ph, G.lang, pause, mech, stun, dead, st.n, st.mn].join('|');
    if (key !== turmUi.key) {
      turmUi.key = key;
      let nx = '';
      if (dead >= 0) nx = `<div class="nx">Gefallen – am Eingang zurück in ${dead} s</div>`;
      else if (st.ph === 'p') nx = `<div class="nx">Ebene ${st.e} beginnt in ${pause} s</div>`;
      else if (st.ph === 'w') nx = `<div class="nx">Der Turm bringt euch in ${pause} s hinaus</div>`;
      else if (mech) nx = `<div class="nx ke">Seelenketten: noch ${st.mn | 0} Kettensteine – ${mech} s</div>`;
      else if (stun) nx = `<div class="nx ke">Kharzul ist benommen: ${stun} s</div>`;
      el.innerHTML = `<div class="hd"><b>${TURM.name}</b><span class="wv">Ebene ${st.e}/${TURM.ebenen}</span></div>` +
        `<div class="bd"><div class="row"><span>${E.name}</span><small>${st.n}/${TURM.maxPlayers} Spieler</small></div>` +
        `<div class="zl">${G.lang}</div><div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, G.k)) * 100)}%"></i></div>${nx}` +
        `<div class="row"><small>${st.o ? 'offen für alle' : 'nur Gruppe'}</small><button type="button" data-a="x">Turm verlassen</button></div></div>`;
    }
  }
  if (el.hidden) {
    el.hidden = false;
    turmUi.placeDue = true;
  }
  if (turmUi.placeDue) turmHudPlace(el);
}
// Abschlussübersicht: Zeit, Ebenen, Gegner, Gold, Beute. Schließt sich mit ✕, per Antippen daneben oder nach 25 s.
const turmClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`;
};
function turmSummary(run) {
  const show = () => {
    const p = game.player;
    if (p && p.dead) { later(0.5, show); return; }
    turmHudCss();
    let el = document.getElementById('turmSum');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'turmSum';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Turm-Ergebnis');
    const beute = [...run.loot.entries()].filter(([n]) => n !== 'Gold' && n !== 'Goldbeutel').slice(0, 9);
    const fallGold = (run.loot.get('Gold') || { n: 0 }).n + (run.loot.get('Goldbeutel') || { n: 0 }).n;
    el.innerHTML = `<button class="x" type="button" aria-label="Schließen">✕</button>` +
      `<h3>${run.won ? 'Turm bezwungen' : 'Turm verlassen'}</h3><dl>` +
      `<dt>Zeit</dt><dd>${turmClock(run.time)}</dd>` +
      `<dt>Ebenen</dt><dd>${run.cleared} von ${TURM.ebenen}</dd>` +
      `<dt>Gegner besiegt</dt><dd>${turmFmt(run.kills)}</dd>` +
      `<dt>Gold für Ebenen</dt><dd class="g">+${turmFmt(run.gold)}</dd>` +
      `<dt>Gold von Gegnern</dt><dd class="g">+${turmFmt(run.mobGold + fallGold)}</dd></dl>` +
      (beute.length ? '<h4>Beute</h4><ul>' + beute.map(([n, o]) => `<li><span style="color:${o.color || '#f3e2d4'}">${escapeHtml(n)}</span><b>×${turmFmt(o.n)}</b></li>`).join('') + '</ul>' : '');
    document.body.appendChild(el);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', esc, true);
      el.classList.remove('on');
      setTimeout(() => el.remove(), 260);
    };
    const outside = (e) => { if (!el.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === 'Escape' && el.isConnected) { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', esc, true);
    el.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); close(); });
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 400);
    timer = setTimeout(close, 25000);
  };
  show();
}

// --- Fenster am Turm -----------------------------------------------------------------------------------------------
function turmWindowOpen(npc) {
  turmHudCss();
  turmUi.npc = npc;
  turmUi.list = [];
  turmUi.listOk = false;
  turmUi.askAt = -99;
  turmUi.openAt = game.time;
  const p = game.player;
  const checks = turmChecks();
  const ok = checks.every((c) => c.ok);
  const body = $('npcBody');
  const S = typeof KLASSEN_SETS2 !== 'undefined' ? KLASSEN_SETS2[p.classId] : typeof KLASSEN_SETS !== 'undefined' ? KLASSEN_SETS[p.classId] : null;
  const lock = () => (instLockText(TURM.id) ? 'Sperre: ' + instLockText(TURM.id) : `Für dich frei. Die Sperre (${INST.lockMin} Min.) beginnt beim Betreten und gilt nur für den Turm.`);
  body.innerHTML =
    `<p class="quest-step raid-step">Gruppen-Instanz · ab Stufe ${TURM.level} · allein oder bis ${TURM.maxPlayers} Spieler</p><h3>${TURM.name}</h3>` +
    '<p>Ein schwarzer Turm, in dem die Seelen der Verdammten gefangen sind. Fünfzehn Ebenen in einer einzigen Halle: Wellen von Verdammten, Schlächtern und Hauptleuten, der Kettenhüter, vier Seelensteine, die Zwillingshüter, acht Trugsteine, zwei Belagerungen, die Schlüsseljagd auf die Glutwichte, alle drei Hüter zugleich – und zuletzt <b>Kharzul, der Wächter der Verdammten</b>.</p>' +
    '<p class="hint-text">Ebene 9: Nur zwei der acht Steine sind echt – ein falscher ruft eine Strafwelle. Ebene 10 und 14: Haltet stand, solange die Verdammten aus allen Toren strömen. Ebene 11: Glutwichte lassen Schlüssel fallen; wer mit einem Schlüssel an ein verschlossenes Tor tritt, öffnet es. Der Wächter tanzt bei 75 % mit kreisendem Seelenfeuer (lauft in den Lücken mit), bei 50 % zeigt er seine wahre Gestalt – größer, viel schneller, mit neuen Angriffen – und ab 25 % brandmarkt er alle: lauft auseinander.</p>' +
    '<p class="hint-text">Wer fällt, steht nach wenigen Sekunden am Eingang der Halle wieder auf. Fallen alle zugleich, beginnt die Ebene von vorn. Leben und Schaden der Gegner wachsen mit der Zahl der Spieler.</p>' +
    '<ul class="raid-roles">' + checks.map((c) => `<li>${c.ok ? '✅' : '❌'} ${c.text}</li>`).join('') + '</ul>' +
    `<p class="inst-lock" data-turmlock>${lock()}</p>` +
    '<p><b class="legend-text">Beute:</b> Gold für jede geschaffte Ebene. Die Hüter lassen mit etwas Glück ein episches Teil fallen. Nach dem Sieg erscheint die <b>Truhe des Wächters</b>: ein Ausrüstungsteil für jeden – mit Glück ein legendäres, sonst ein episches (Lv 80) –, dazu Seelensplitter, Ätherkerne, Schmiede-Teile, oft ein Seelenstein und viel Gold. Dazu schmiedet der <b>Turm-Schmied</b> einmal für dich – +1 mit höherer Chance, ohne dass etwas zerbricht. Echte Seelensteine geben ihre gewohnte Beute.</p>' +
    (S ? `<p class="set-portal"><span>Klassen-Set:</span> <b style="color:${S.color}">${S.name}</b> <span>– legendäre Teile (Lv 80) von hier gehören meist dazu.</span></p>` : '') +
    '<p><strong>Laufende Durchgänge im Kanal</strong></p><div class="turm-runs" id="turmRuns"></div>' +
    '<div class="turm-art"><label><input type="radio" name="turmArt" value="0" ' + (turmUi.open ? '' : 'checked') + '> <span>Nur meine Gruppe</span></label>' +
    `<label><input type="radio" name="turmArt" value="1" ${turmUi.open ? 'checked' : ''}> <span>Offen für alle (bis ${TURM.maxPlayers})</span></label></div>` +
    `<button type="button" class="btn btn-primary" data-turm="neu" ${ok && !game.turmRun ? '' : 'disabled'}>${ok ? 'Neuen Durchgang beginnen' : 'Noch nicht bereit'}</button>`;
  for (const r of body.querySelectorAll('input[name="turmArt"]')) r.addEventListener('change', () => { if (r.checked) turmUi.open = +r.value; });
  body.querySelector('[data-turm="neu"]').addEventListener('click', () => turmEnter({ open: !!turmUi.open }));
  // Restzeit der Sperre läuft sichtbar mit, solange das Fenster offen ist
  const el = body.querySelector('[data-turmlock]');
  const tick = setInterval(() => {
    if (!document.body.contains(el)) { clearInterval(tick); return; }
    el.textContent = lock();
  }, 1000);
  turmWindowRender();
}
// Liste der Durchgänge im offenen Fenster neu zeichnen
function turmWindowRender() {
  const box = document.getElementById('turmRuns');
  if (!box) return;
  const p = game.player;
  const ok = turmChecks().every((c) => c.ok) && !game.turmRun;
  const mine = new Set(game.party && game.party.members ? game.party.members : []);
  mine.add(p.name);
  if (!turmUi.listOk) {
    box.innerHTML = `<p class="hint-text">${net.mode === 'client' && game.time - turmUi.openAt > 6 ? 'Keine Antwort vom Host des Kanals – spielt er eine ältere Version?' : 'Suche laufende Durchgänge …'}</p>`;
    return;
  }
  if (!turmUi.list.length) {
    box.innerHTML = '<p class="hint-text">Gerade läuft kein Durchgang.</p>';
    return;
  }
  box.innerHTML = turmUi.list.map(([s, name, n, e, open, frei, real]) => {
    const darf = frei && (open || mine.has(String(real)));
    const why = !frei ? (n >= TURM.maxPlayers ? 'voll' : 'Wächter läuft') : !darf ? 'nur Gruppe' : '';
    return `<div class="turm-run"><span>Lauf von <b class="no-tr">${escapeHtml(String(name))}</b> · ${n | 0}/${TURM.maxPlayers} · Ebene ${e | 0} · ${open ? 'offen für alle' : 'nur Gruppe'}</span>` +
      `<button type="button" class="btn" data-join="${s | 0}" ${ok && darf ? '' : 'disabled'}>${why || 'Beitreten'}</button></div>`;
  }).join('');
  for (const b of box.querySelectorAll('[data-join]')) b.addEventListener('click', () => turmEnter({ join: +b.dataset.join }));
}
// offenes Fenster: alle 2 s die Liste beim Host erfragen
function turmWindowTick() {
  if (!turmUi.npc) return;
  if (!document.getElementById('turmRuns') || $('panelNpc').hidden) {
    turmUi.npc = null;
    return;
  }
  if (game.time - turmUi.askAt < 2 && game.time >= turmUi.askAt) return;
  turmUi.askAt = game.time;
  if (!turmUi.listOk) turmWindowRender();
  turmToHost({ k: 'vtq' });
}
const _turmOpenNpc = ui.openNpc;
ui.openNpc = function (npc) {
  if (npc && npc.id === 'turmtor') {
    turmGateTry(npc.turmGate | 0, true);
    return;
  }
  if (npc && npc.id === 'turm') {
    this.closePanels();
    $('npcTitle').textContent = npc.name;
    turmWindowOpen(npc);
    this.renderNpcQuests(npc);
    $('panelNpc').hidden = false;
    return;
  }
  return _turmOpenNpc.call(this, npc);
};
NPC_TALK_LABEL.turm = 'Betreten';
NPC_TALK_LABEL.turmtor = 'Öffnen';
NPC_ART.turm = () => {};
NPC_ART.turmtor = () => {};
if (typeof NPC_ICONS !== 'undefined' && typeof npcBadge === 'function') {
  NPC_ICONS.turm = (ctx) => npcBadge(ctx, '#3a1a14', (c) => {
    // schwarzer Turm mit Zinnen und glühendem Tor
    poly(c, [[-4.5, 7], [-3.6, -4], [3.6, -4], [4.5, 7]], '#1a1214');
    poly(c, [[-5, -4], [-5, -7], [-3, -7], [-3, -5.4], [-1, -5.4], [-1, -7], [1, -7], [1, -5.4], [3, -5.4], [3, -7], [5, -7], [5, -4]], '#2a1e20');
    box(c, -1.6, 2, 3.2, 5, 1.4, '#ff8a3a');
    dot(c, 0, -1.4, 0.9, 1.2, '#ffb04a');
  });
}

// --- Aussehen des Turms: 2D (PROP_ART) und 3D (PROP3) -----------------------------------------------------------------
// Fuß achteckig, schlanker Schaft mit Strebepfeilern und Glutschlitzen, Zinnenkranz mit Dornen, spitze Haube mit
// Seelenfeuer; im Süden das Tor mit einem Schild darüber. Der Ursprung des Bildes liegt am Südrand des Fußes.
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.turmbau = (ctx) => {
    const st = '#2e2529';
    const hi = '#463a40';
    const lo = '#1a1416';
    const glut = '#ff7a2a';
    // Fuß
    poly(ctx, [[-78, -2], [-64, 6], [64, 6], [78, -2], [70, -26], [-70, -26]], lo);
    poly(ctx, [[-70, -26], [70, -26], [62, -34], [-62, -34]], hi);
    // Schaft, links heller
    poly(ctx, [[-54, -34], [54, -34], [44, -168], [-44, -168]], st);
    poly(ctx, [[-54, -34], [-30, -34], [-26, -168], [-44, -168]], hi);
    poly(ctx, [[30, -34], [54, -34], [44, -168], [26, -168]], lo);
    for (const y of [-60, -92, -124, -150]) stroke(ctx, lo, 1.2, [[-52 + (y + 34) * -0.07, y], [52 + (y + 34) * 0.07, y]]);
    // Strebepfeiler
    for (const sx of [-1, 1]) {
      poly(ctx, [[sx * 66, -26], [sx * 50, -26], [sx * 44, -120], [sx * 52, -120]], sx < 0 ? hi : lo);
      poly(ctx, [[sx * 44, -120], [sx * 52, -120], [sx * 48, -136]], st);
    }
    // Glutschlitze
    for (const [x, y] of [[-16, -84], [16, -84], [0, -112], [-16, -142], [16, -142]]) {
      box(ctx, x - 2.5, y - 9, 5, 16, 2, '#140a08');
      box(ctx, x - 1.4, y - 7.5, 2.8, 13, 1.2, glut);
    }
    // Zinnenkranz mit Dornen
    poly(ctx, [[-44, -168], [44, -168], [58, -182], [58, -196], [-58, -196], [-58, -182]], st);
    poly(ctx, [[-58, -196], [58, -196], [52, -202], [-52, -202]], hi);
    for (let k = -3; k <= 3; k++) poly(ctx, [[k * 17 - 6, -200], [k * 17, -216 - (k % 2 ? 0 : 6)], [k * 17 + 6, -200]], k % 2 ? lo : st);
    // Haube und Seelenfeuer
    poly(ctx, [[-30, -202], [30, -202], [20, -224], [-20, -224]], lo);
    poly(ctx, [[-22, -224], [22, -224], [0, -276]], st);
    poly(ctx, [[-22, -224], [-6, -224], [0, -276]], hi);
    oval(ctx, 0, -279, 5.5, 6.5, '#d8ffb0');
    oval(ctx, 0, -279, 3, 4, '#8fe36a');
    // Ketten vom Zinnenkranz
    for (const sx of [-1, 1]) stroke(ctx, '#6a6a74', 1.4, [[sx * 50, -184], [sx * 46, -160], [sx * 38, -140], [sx * 36, -118]]);
    // Tor: Bogen, dunkle Öffnung, Glut am Boden, Schild darüber
    poly(ctx, [[-24, 4], [-24, -34], [-16, -50], [0, -56], [16, -50], [24, -34], [24, 4]], hi);
    poly(ctx, [[-17, 4], [-17, -32], [-11, -43], [0, -47], [11, -43], [17, -32], [17, 4]], '#0c0607');
    poly(ctx, [[-17, 4], [-17, -8], [0, -14], [17, -8], [17, 4]], '#7a2410');
    poly(ctx, [[-12, 4], [-12, -3], [0, -7], [12, -3], [12, 4]], glut);
    box(ctx, -22, -74, 44, 13, 2.5, '#16100e');
    box(ctx, -20, -72, 40, 9, 1.5, '#3a2a22');
    oval(ctx, 0, -67.5, 3, 3.6, '#8fe36a');
    for (const sx of [-1, 1]) stroke(ctx, '#6a6a74', 1, [[sx * 18, -74], [sx * 16, -82]]);
  };
  if (typeof PROP_BOUNDS !== 'undefined') PROP_BOUNDS.turmbau = { x: -84, y: -290, w: 168, h: 302 };
}
// Schmuck der Halle (seit dem Umbau): schwere Basaltsäule mit Glutrissen, Eisenbändern und Kettenresten; Knochenhaufen
// (roof 'a' | 'b' | 'c' = drei Formen). Keine Ringe am Boden.
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.turmsaeule = (ctx) => {
    const st = '#3a3036';
    const hi = '#54464e';
    const lo = '#221a1e';
    const glut = TURM.glut;
    box(ctx, -17, -10, 34, 10, 2, lo);
    box(ctx, -14, -16, 28, 7, 1.5, st);
    // Schaft, links heller
    poly(ctx, [[-11, -16], [11, -16], [9.5, -84], [-9.5, -84]], st);
    poly(ctx, [[-11, -16], [-4, -16], [-3.5, -84], [-9.5, -84]], hi);
    // Glutrisse
    stroke(ctx, '#140a08', 2.4, [[-2, -22], [2, -34], [-1, -44], [3, -58]]);
    stroke(ctx, glut, 1.1, [[-2, -22], [2, -34], [-1, -44], [3, -58]]);
    stroke(ctx, '#140a08', 2, [[5, -66], [2, -74], [5, -80]]);
    stroke(ctx, glut, 0.9, [[5, -66], [2, -74], [5, -80]]);
    // Eisenbänder mit Kettenresten
    for (const y of [-30, -64]) {
      box(ctx, -12, y, 24, 4, 1, '#4e4c54');
      for (let k = 0; k < 4; k++) oval(ctx, 9 + (k % 2), y + 6 + k * 4.2, 1.6, 2.4, '#6a6a74');
    }
    for (let k = 0; k < 3; k++) oval(ctx, -9, -60 + k * 4.4, 1.6, 2.4, '#5e5e68');
    // Kapitell mit Dornen
    box(ctx, -16, -92, 32, 9, 2, lo);
    poly(ctx, [[-16, -92], [16, -92], [12, -98], [-12, -98]], hi);
    for (const x of [-13, 0, 13]) poly(ctx, [[x - 4, -97], [x, -110 + Math.abs(x) * 0.25], [x + 4, -97]], x ? lo : st);
  };
  PROP_ART.turmknochen = (ctx, pr) => {
    const bone = '#cfc6b4';
    const dk = '#8a8070';
    const v = pr && pr.roof;
    if (v !== 'b') {
      // Schädel mit zwei Knochen
      stroke(ctx, dk, 3.6, [[-12, -2], [10, -7]]);
      stroke(ctx, bone, 2.4, [[-12, -2], [10, -7]]);
      stroke(ctx, dk, 3.6, [[-10, -8], [11, -1]]);
      stroke(ctx, bone, 2.4, [[-10, -8], [11, -1]]);
      oval(ctx, v === 'c' ? 6 : -1, -9, 6.5, 5.8, bone);
      box(ctx, (v === 'c' ? 6 : -1) - 3.5, -5, 7, 3.4, 1, darker(bone, 0.1));
      for (const x of [-2.4, 2.4]) oval(ctx, (v === 'c' ? 6 : -1) + x, -9.5, 1.6, 1.8, '#1a1210');
    }
    if (v !== 'a') {
      // Rippen und ein Wirbelstrang
      for (let k = 0; k < 4; k++) stroke(ctx, bone, 1.6, [[-14 + k * 4, -1], [-16 + k * 4, -8], [-12 + k * 4, -11]]);
      stroke(ctx, dk, 1.4, [[-16, -2], [-2, -3]]);
      oval(ctx, 2, -3, 3, 2, dk);
    }
  };
  if (typeof PROP_BOUNDS !== 'undefined') {
    PROP_BOUNDS.turmsaeule = { x: -20, y: -114, w: 40, h: 118 };
    PROP_BOUNDS.turmknochen = { x: -20, y: -20, w: 40, h: 24 };
  }
}
if (typeof PROP3 !== 'undefined') {
  PROP3.turmsaeule = function (b, M) {
    const st = '#3a3036';
    const hi = '#54464e';
    const lo = '#221a1e';
    const glut = TURM.glut;
    const R8 = Math.PI / 8;
    b.add(wbox(1.05, 0.32, 1.05, 0.06), lo, { parent: M, p: [0, 0.16, 0], shade: 0.3, top: hi, topK: 0.3 });
    b.add(wbox(0.86, 0.2, 0.86, 0.05), st, { parent: M, p: [0, 0.42, 0] });
    b.add(lathe3('turmsaeule', [[0.36, 0], [0.38, 0.5], [0.35, 1.6], [0.31, 2.4], [0, 2.4]], 8), st, { parent: M, p: [0, 0.5, 0], r: [0, R8, 0], shade: 0.3, top: hi, topK: 0.25 });
    // Glutrisse (leuchtend), schräg über den Schaft
    for (const [x, y, z, rz] of [[0.2, 1.0, 0.3, 0.5], [-0.1, 1.5, 0.35, -0.4], [0.28, 2.2, 0.2, 0.3], [-0.3, 1.9, -0.18, 0.6]]) {
      b.add(wbox(0.05, 0.42, 0.04, 0.015), glut, { parent: M, p: [x, y, z], r: [0, Math.atan2(x, z), rz], mat: 'glow', noShadow: true });
    }
    // zwei Eisenbänder mit hängenden Kettenresten
    for (const y of [1.0, 2.15]) {
      b.add(wbox(0.8, 0.12, 0.8, 0.03), '#4e4c54', { parent: M, p: [0, y, 0], r: [0, R8, 0], shine: 0.7 });
      for (let k = 0; k < 4; k++) b.add(torus3(0.07, 0.022, Math.PI * 2, 4, 8), '#6a6a74', { parent: M, p: [0.42, y - 0.12 - k * 0.13, 0.16], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
    }
    for (let k = 0; k < 5; k++) b.add(torus3(0.07, 0.022, Math.PI * 2, 4, 8), '#5e5e68', { parent: M, p: [-0.38, 2.0 - k * 0.13, -0.2], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
    // Kapitell mit Dornen
    b.add(wbox(1.0, 0.28, 1.0, 0.06), lo, { parent: M, p: [0, 3.02, 0], top: hi, topK: 0.4 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      b.add(horn3(0.55, 0.12, 5), k % 2 ? lo : st, { parent: M, p: [Math.cos(a) * 0.42, 3.15, Math.sin(a) * 0.42], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] });
    }
  };
  PROP3.turmknochen = function (b, M, pr) {
    const bone = '#d8cfbc';
    const dk = '#8a8070';
    const v = pr && pr.roof;
    if (v !== 'b') {
      const sx = v === 'c' ? 0.2 : 0;
      b.add(sphere3(0.17, 8, 6), bone, { parent: M, p: [sx, 0.15, 0], s: [1, 0.9, 1.1] });
      b.add(wbox(0.18, 0.1, 0.14, 0.03), bone, { parent: M, p: [sx, 0.06, 0.1] });
      for (const x of [-0.06, 0.06]) b.add(sphere3(0.045, 6, 4), '#1a1210', { parent: M, p: [sx + x, 0.17, 0.15] });
      for (const r of [0.5, -0.6]) b.add(limb3(0.55, 0.035, 0.035, 5), bone, { parent: M, p: [-0.05, 0.05, 0], r: [Math.PI / 2, r, 0], shade: 0.2 });
    }
    if (v !== 'a') {
      for (let k = 0; k < 4; k++) b.add(torus3(0.16, 0.022, Math.PI * 0.9, 4, 8), bone, { parent: M, p: [-0.3 + k * 0.13, 0.06, -0.05], r: [0, Math.PI / 2, 0] });
      b.add(limb3(0.5, 0.03, 0.03, 5), dk, { parent: M, p: [-0.42, 0.04, -0.05], r: [0, 0, Math.PI / 2] });
    }
  };
}
if (typeof PROP3 !== 'undefined') {
  PROP3.turmbau = function (b, M) {
    const st = '#3a3036';
    const hi = '#54464e';
    const lo = '#221a1e';
    const glut = '#ff7a2a';
    const R8 = Math.PI / 8;
    // der Ursprung liegt am Südrand des Fußes: das Modell steht 2,6 Kacheln weiter nördlich
    const Z = -2.35;
    // etwas gestaucht (K): die Spitze käme der Kamera sonst so nah, dass sie das Bild füllt
    const K = 0.8;
    const add = (geo, col, o) => b.add(geo, col, Object.assign({ parent: M }, o, { p: [o.p[0], o.p[1] * K, o.p[2] + Z], s: o.s ? [o.s[0], o.s[1] * K, o.s[2]] : [1, K, 1] }));
    add(lathe3('turmfuss', [[0, 0], [2.6, 0], [2.6, 0.3], [2.3, 0.5], [2.3, 0.75], [0, 0.75]], 8), lo, { p: [0, 0, 0], r: [0, R8, 0], shade: 0.3, top: hi, topK: 0.35 });
    add(lathe3('turmschaft', [[1.95, 0], [1.75, 2.0], [1.6, 4.2], [1.55, 5.4], [0, 5.4]], 8), st, { p: [0, 0.75, 0], r: [0, R8, 0], shade: 0.3, top: hi, topK: 0.3 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      add(wbox(0.55, 3.6, 0.8, 0.08), lo, { p: [Math.sin(a) * 1.95, 2.4, Math.cos(a) * 1.95], r: [0, a, 0], top: hi, topK: 0.3 });
      add(horn3(0.7, 0.3, 4), st, { p: [Math.sin(a) * 1.9, 4.2, Math.cos(a) * 1.9], r: [0, a, 0] });
    }
    // Glutschlitze auf vier Seiten in drei Höhen
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      for (const [y, off] of [[2.4, 0.55], [3.9, 0], [5.2, 0.5]]) {
        for (const sx of off ? [-1, 1] : [0]) {
          const r = 1.86 - (y - 0.75) * 0.075;
          const px = Math.sin(a) * r + Math.cos(a) * sx * off;
          const pz = Math.cos(a) * r - Math.sin(a) * sx * off;
          add(wbox(0.16, 0.62, 0.1, 0.03), glut, { p: [px, y, pz], r: [0, a, 0], mat: 'glow', noShadow: true });
        }
      }
    }
    // Zinnenkranz mit Dornen
    add(lathe3('turmkranz', [[1.55, 0], [2.15, 0.45], [2.15, 1.0], [1.85, 1.05], [1.85, 0.7], [0, 0.7]], 8), st, { p: [0, 6.0, 0], r: [0, R8, 0], shade: 0.25, top: hi, topK: 0.4 });
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + R8;
      add(horn3(k % 2 ? 0.55 : 0.85, 0.2, 5), k % 2 ? lo : st, { p: [Math.sin(a) * 2.0, 7.0, Math.cos(a) * 2.0] });
    }
    // Haube mit Seelenfeuer
    add(lathe3('turmtrommel', [[1.25, 0], [1.1, 0.8], [0, 0.8]], 8), lo, { p: [0, 6.7, 0], r: [0, R8, 0] });
    add(lathe3('turmhaube', [[1.35, 0], [0.8, 0.5], [0.3, 1.7], [0, 2.4]], 8), st, { p: [0, 7.5, 0], r: [0, R8, 0], shade: 0.25, top: hi, topK: 0.4 });
    add(horn3(0.6, 0.14, 6), '#b8ffa0', { p: [0, 9.8, 0], mat: 'glow', noShadow: true });
    // Ketten vom Kranz
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) add(torus3(0.09, 0.028, Math.PI * 2, 4, 8), '#6a6a74', { p: [sx * (2.1 - k * 0.03), 6.3 - k * 0.2, 0.9], r: [k % 2 ? 0 : Math.PI / 2, 0, 0], shine: 0.8, noShadow: true });
    // Tor im Süden: zwei Pfosten, Sturz, dunkle Öffnung, Glut, Schild mit Seelenflamme
    for (const sx of [-1, 1]) add(wbox(0.34, 1.9, 0.5, 0.06), hi, { p: [sx * 0.72, 0.95, 2.1] });
    add(wbox(1.9, 0.36, 0.56, 0.08), hi, { p: [0, 2.05, 2.1] });
    add(wbox(1.12, 1.82, 0.2, 0.02), '#0a0506', { p: [0, 0.92, 2.02] });
    add(wbox(1.08, 0.5, 0.06, 0.02), '#8a2a10', { p: [0, 0.27, 2.14], mat: 'glow', noShadow: true });
    add(wbox(1.5, 0.46, 0.1, 0.04), '#2a1e1a', { p: [0, 2.72, 2.0] });
    add(sphere3(0.11, 8, 6), '#8fe36a', { p: [0, 2.72, 2.08], s: [1, 1.25, 0.6], mat: 'glow', noShadow: true });
    for (const sx of [-1, 1]) add(horn3(0.5, 0.14, 5), lo, { p: [sx * 0.72, 1.9, 2.1] });
  };
}
// Glut am Tor und Seelenfeuer an der Spitze (2D), Durchsicht, wenn die Figur hinter dem Turm steht
if (typeof drawWorldObject === 'function') {
  const _turmDrawWorldObject = drawWorldObject;
  drawWorldObject = function (ctx, o) {
    _turmDrawWorldObject(ctx, o);
    if (o.worldObj === 'prop' && o.prop.type === 'turmbau') {
      glow(ctx, o.x, o.y - 12, 26, TURM.glut, 0.4 + 0.1 * Math.sin(game.time * 3));
      glow(ctx, o.x, o.y - 279, 16, TURM.seele, 0.45 + 0.12 * Math.sin(game.time * 2.2));
    }
  };
}
if (typeof occludesPlayer === 'function') {
  const _turmOccludes = occludesPlayer;
  occludesPlayer = function (o) {
    if (o.worldObj === 'prop' && o.prop.type === 'turmbau') {
      const p = game.player;
      if (!p || !game.running || p.dead) return false;
      const fy = feetY(p);
      return Math.abs(p.x - o.x) < 84 && fy < o.y - 150 && fy > o.y - 300;
    }
    return _turmOccludes(o);
  };
}
// der hohe Turm bleibt im Bild, auch wenn sein Fuß schon unter dem unteren Rand liegt
if (typeof collectWorldObjects === 'function') {
  const _turmCollect = collectWorldObjects;
  collectWorldObjects = function (list, x0, y0, x1, y1) {
    _turmCollect(list, x0, y0, x1, y1);
    const w = game.world;
    if (w.__turmProp === undefined) w.__turmProp = w.props.find((q) => q.type === 'turmbau') || null;
    const pr = w.__turmProp;
    if (!pr) return;
    if (pr.y > (y1 + 4) * TILE && pr.y <= (y1 + 10) * TILE && pr.x >= (x0 - 3) * TILE && pr.x <= (x1 + 3) * TILE) list.push({ worldObj: 'prop', prop: pr, x: pr.x, y: pr.y });
  };
}

// --- Die vier Tore der Halle: zu oder offen ------------------------------------------------------------------------
function turmGateOpen(s, g) {
  const run = game.turmRun;
  if (run && run.slot === s && run.st) return !!(run.st.g & (1 << g));
  const S = net.mode !== 'client' ? turmHost.slots[s] : null;
  return !!(S && S.gates[g]);
}
// 2D: Nord- und Südtor von vorn (Bogen mit zwei Flügeln), Ost- und Westtor von der Seite (schmal)
function turmGate2(ctx, n) {
  const g = n.turmGate | 0;
  const open = turmGateOpen(n.turmSlot, g);
  const st = '#2e2529';
  const hi = '#463a40';
  const lo = '#1a1416';
  const glut = TURM.glut;
  ctx.save();
  // das Südtor steht in der Wand unter dem Hallenrand, damit es nichts verdeckt, was vor ihm steht
  ctx.translate(n.x, n.y + (g === 2 ? 58 : 0));
  if (g === 0 || g === 2) {
    for (const sx of [-1, 1]) {
      box(ctx, sx * 46 - 9, -78, 18, 82, 3, sx < 0 ? hi : st);
      poly(ctx, [[sx * 46 - 8, -78], [sx * 46, -94], [sx * 46 + 8, -78]], lo);
      box(ctx, sx * 46 - 2.2, -60, 4.4, 14, 1.5, glut);
    }
    poly(ctx, [[-56, -78], [56, -78], [50, -92], [-50, -92]], st);
    for (let k = -2; k <= 2; k++) poly(ctx, [[k * 18 - 5, -92], [k * 18, -103], [k * 18 + 5, -92]], lo);
    // Öffnung
    box(ctx, -37, -76, 74, 78, 2, '#090506');
    if (open) {
      poly(ctx, [[-37, 2], [-37, -14], [0, -26], [37, -14], [37, 2]], '#5a1c0c');
      poly(ctx, [[-28, 2], [-28, -6], [0, -14], [28, -6], [28, 2]], glut);
      // aufgeschwungene Flügel an den Pfosten
      for (const sx of [-1, 1]) poly(ctx, [[sx * 37, -74], [sx * 30, -70], [sx * 30, -2], [sx * 37, 2]], '#3a2a22');
    } else {
      for (const sx of [-1, 1]) {
        box(ctx, sx < 0 ? -36 : 1, -74, 35, 75, 2, sx < 0 ? '#4a3428' : '#3a2a20');
        for (const y of [-58, -32, -10]) box(ctx, sx < 0 ? -36 : 1, y, 35, 4, 1, '#5a5a64');
      }
      box(ctx, -30, -41, 60, 7, 2, '#7a7a86');
      box(ctx, -5, -45, 10, 15, 2, '#16100e');
      oval(ctx, 0, -37.5, 2.6, 3.4, glut);
    }
  } else {
    const sx = g === 1 ? 1 : -1;
    for (const dy of [-34, 22]) {
      box(ctx, -9, dy - 76, 18, 78, 3, dy < 0 ? hi : st);
      poly(ctx, [[-8, dy - 76], [0, dy - 90], [8, dy - 76]], lo);
    }
    poly(ctx, [[-7, -110], [7, -110], [7, -54], [-7, -54]], st);
    box(ctx, sx > 0 ? 0 : -7, -108, 7, 110, 1, '#090506');
    if (open) box(ctx, sx > 0 ? 1 : -6, -30, 5, 30, 1, glut);
    else {
      box(ctx, sx > 0 ? 0 : -6, -106, 6, 106, 1, '#4a3428');
      for (const y of [-88, -60, -32]) box(ctx, sx > 0 ? 0 : -6, y, 6, 4, 1, '#5a5a64');
    }
  }
  ctx.restore();
  glow(ctx, n.x, n.y - 30 + (g === 2 ? 58 : 0), 30, glut, open ? 0.45 : 0.18 + 0.05 * Math.sin(game.time * 3 + g));
}
if (typeof drawNpc === 'function') {
  const _turmDrawNpc = drawNpc;
  drawNpc = function (ctx, n) {
    if (n.id === 'turmtor') { turmGate2(ctx, n); return; }
    if (n.id === 'turm') { drawNpcMarks(ctx, n); return; }
    return _turmDrawNpc(ctx, n);
  };
}
// 3D: eigene Figur mit zwei Flügeln an Gelenken (Knochen 1 und 2) und einem glühenden Riegel (Knochen 3)
function turmGateBuild3(b) {
  const A = adder(b, null);
  const rig = rigOf([[[0, 0, 0], -1], [[-0.98, 0, 0.1], 0], [[0.98, 0, 0.1], 0], [[0, 1.25, 0.24], 0]]);
  const st = '#3a3036';
  const hi = '#54464e';
  const lo = '#221a1e';
  const glut = TURM.glut;
  for (const sx of [-1, 1]) {
    A(wbox(0.6, 3.1, 0.9, 0.08), st, { bone: 0, p: [sx * 1.3, 1.55, 0], top: hi, topK: 0.35, shade: 0.25 });
    A(wbox(0.76, 0.3, 1.06, 0.06), lo, { bone: 0, p: [sx * 1.3, 0.15, 0] });
    A(horn3(0.7, 0.26, 5), lo, { bone: 0, p: [sx * 1.3, 3.1, 0] });
    A(wbox(0.12, 0.7, 0.08, 0.03), glut, { bone: 0, p: [sx * 1.3, 2.1, 0.47], mat: 'glow', noShadow: true });
  }
  A(wbox(3.3, 0.55, 1.0, 0.1), st, { bone: 0, p: [0, 3.05, 0], top: hi, topK: 0.4 });
  for (let k = -2; k <= 2; k++) A(horn3(k % 2 ? 0.36 : 0.56, 0.16, 5), k % 2 ? st : lo, { bone: 0, p: [k * 0.5, 3.3, 0] });
  // dunkle Öffnung, am Boden Glut
  A(wbox(2.0, 2.78, 0.1, 0.02), '#070405', { bone: 0, p: [0, 1.39, -0.32] });
  A(wbox(1.9, 0.4, 0.06, 0.02), '#a8381a', { bone: 0, p: [0, 0.22, -0.24], mat: 'glow', noShadow: true });
  // Flügel: Holz mit Eisenbändern, am Pfosten angeschlagen
  for (const [bone, sx] of [[1, 1], [2, -1]]) {
    A(wbox(0.96, 2.7, 0.14, 0.03), '#4a3428', { bone, p: [-0.98 * sx + sx * 0.49, 1.37, 0.1], top: '#5e4434', topK: 0.3 });
    for (const y of [0.5, 1.37, 2.25]) A(wbox(0.98, 0.14, 0.17, 0.02), '#5a5a64', { bone, p: [-0.98 * sx + sx * 0.49, y, 0.1], shine: 0.8 });
  }
  // Riegel mit glühendem Schloss
  A(wbox(1.7, 0.2, 0.12, 0.04), '#7a7a86', { bone: 3, p: [0, 1.25, 0.24], shine: 0.9 });
  A(wbox(0.3, 0.42, 0.16, 0.04), '#16100e', { bone: 3, p: [0, 1.25, 0.26] });
  A(sphere3(0.08, 8, 6), glut, { bone: 3, p: [0, 1.25, 0.35], mat: 'glow', noShadow: true });
  return { rig, height: 3.4, family: 'turmtor', blob: 0.01, scale: 1 };
}
if (typeof syncNpc3 === 'function') {
  const _turmSyncNpc3 = syncNpc3;
  syncNpc3 = function (n, dt) {
    if (n.id === 'turm') return;
    if (n.id !== 'turmtor') return _turmSyncNpc3(n, dt);
    const a = actorFor(entityKey(n), 'turmtor', turmGateBuild3);
    if (!a) return;
    resetBones(a);
    const T = TURM_TORE[n.turmGate | 0];
    // die Figur steht in der Wandlinie, die Vorderseite zeigt in die Halle
    // (das Südtor steht tiefer in der Wand: von hinten gesehen verdeckt es sonst, was vor ihm steht)
    const aus = n.turmGate === 2 ? 1.9 : 0.55;
    a.group.position.set((n.x + T.dx * aus * TILE) * U3, 0, (n.y + T.dy * aus * TILE) * U3);
    a.group.rotation.y = T.rot;
    a.group.scale.setScalar(a.model.scale);
    const want = turmGateOpen(n.turmSlot, n.turmGate | 0) ? 1 : 0;
    const k0 = n.turmOpen == null ? want : n.turmOpen;
    const k = n.turmOpen = k0 + Math.max(-dt * 1.4, Math.min(dt * 1.4, want - k0));
    const e = k * k * (3 - 2 * k);
    a.bones[1].rotation.y = -e * 1.85;
    a.bones[2].rotation.y = e * 1.85;
    a.bones[3].scale.setScalar(Math.max(0.001, 1 - e));
  };
}

// --- Seelenketten zeichnen: Ketten vom Wächter zu den Kettensteinen, Kuppel um ihn (kein Bodenring) ------------------
function turmChainEnds() {
  const run = game.turmRun;
  if (!run || run.slot < 0 || !(run.mechUntil > game.time)) return null;
  const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
  let boss = null;
  for (const m of list) if (!m.dead && m.typeId === 'turm_waechter' && turmMonSlot(m) === run.slot) { boss = m; break; }
  if (!boss) return null;
  const st = turmSlotStones(run.slot);
  const ends = [];
  for (let k = 8; k < 12; k++) if (st[k] && !st[k].dead) ends.push(st[k]);
  return { boss, ends };
}
if (typeof FX3_HOOKS !== 'undefined') {
  const _tuA = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  const _tuB = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
  FX3_HOOKS.push({
    parts: [],
    fn(h) {
      const C = turmChainEnds();
      if (!C) return;
      const t = game.time;
      const bx = C.boss.x * U3;
      const bz = feetY(C.boss) * U3;
      for (const e of C.ends) {
        const ex = e.x * U3;
        const ez = e.y * U3;
        // durchhängende Kette aus sechs Stücken, an der Brust des Wächters und oben am Stein
        let px = bx, py = 3.2, pz = bz;
        for (let i = 1; i <= 6; i++) {
          const u = i / 6;
          const x = bx + (ex - bx) * u;
          const z = bz + (ez - bz) * u;
          const y = 3.2 + (1.3 - 3.2) * u - Math.sin(u * Math.PI) * (1.1 + 0.1 * Math.sin(t * 2 + i));
          _tuA.set(px, py, pz);
          _tuB.set(x, y, z);
          const core = fx3Take(h, 'seg');
          fx3Segment(core, _tuA, _tuB, 0.05);
          fx3Color(core, '#e8ffd8', 0.9);
          const gl = fx3Take(h, 'seg');
          fx3Segment(gl, _tuA, _tuB, 0.16);
          fx3Color(gl, TURM.seele, 0.45 + 0.15 * Math.sin(t * 5 + i));
          px = x; py = y; pz = z;
        }
      }
      for (const [k, dir, op] of [[1, 1, 0.2], [1.07, -1, 0.1]]) {
        const d = fx3Take(h, 'dome');
        d.position.set(bx, 0.02, bz);
        d.scale.set(2.6 * k, 2.4 * k, 2.6 * k);
        d.rotation.set(0, t * 0.3 * dir, 0);
        fx3Color(d, TURM.seele, op + 0.04 * Math.sin(t * 2));
      }
    }
  });
}
if (typeof drawParticles === 'function') {
  const _turmDrawParticles = drawParticles;
  drawParticles = function (ctx) {
    if (!V3.on) {
      const C = turmChainEnds();
      if (C) {
        const t = game.time;
        const by = C.boss.y - 46;
        ctx.save();
        ctx.lineCap = 'round';
        for (const e of C.ends) {
          for (const [w, col, al] of [[6, TURM.seele, 0.35], [2.2, '#e8ffd8', 0.9]]) {
            ctx.globalAlpha = al;
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.setLineDash(w > 3 ? [] : [7, 5]);
            ctx.lineDashOffset = -t * 30;
            ctx.beginPath();
            ctx.moveTo(C.boss.x, by);
            ctx.quadraticCurveTo((C.boss.x + e.x) / 2, (by + e.y - 30) / 2 + 46, e.x, e.y - 30);
            ctx.stroke();
          }
        }
        ctx.setLineDash([]);
        const g = ctx.createRadialGradient(C.boss.x, by + 6, 20, C.boss.x, by + 6, 86);
        g.addColorStop(0, 'rgba(143,227,106,0)');
        g.addColorStop(0.8, 'rgba(143,227,106,0.28)');
        g.addColorStop(1, 'rgba(143,227,106,0)');
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 3);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(C.boss.x, by + 6, 86, 78, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    _turmDrawParticles(ctx);
  };
}

// Glutwichte kommen im Schwarm: Name und Balken nur beim gewählten Ziel (sonst stapeln sich zwanzig Schilder)
if (typeof drawLabel === 'function') {
  const _turmDrawLabel = drawLabel;
  drawLabel = function (ctx, e) {
    if (e.typeId === 'turm_glutwicht' && e !== game.target) return;
    return _turmDrawLabel(ctx, e);
  };
}

// --- Kleine Haken: Karte, Kamera, Musik, Bossleiste ----------------------------------------------------------------
// Minikarte und große Karte: eine Halle ist ein eigenes Gebiet (wie die Hallen der Arenen)
if (typeof mapAreaAt === 'function') {
  const _turmMapAreaAt = mapAreaAt;
  mapAreaAt = function (tx, ty) {
    const s = turmSlotAt(tx * TILE, ty * TILE);
    if (s < 0) return _turmMapAreaAt(tx, ty);
    // seit dem Umbau nur die Halle mit etwas Rand (das Feld drumherum ist Fels und Abgrund)
    const R = turmSlotRect(s);
    const mw = Math.ceil(TURM.hw) + 4;
    const mh = Math.ceil(TURM.hh) + 4;
    return { key: 'v' + s, x: Math.floor(R.cx) - mw, y: Math.floor(R.cy) - mh, w: mw * 2, h: mh * 2, wm: null, dungeon: -1 };
  };
}
if (typeof regionRect3 === 'function') {
  const _turmRegionRect3 = regionRect3;
  regionRect3 = function (x, y) {
    const s = turmSlotAt(x, y);
    if (s < 0) return _turmRegionRect3(x, y);
    const R = turmSlotRect(s);
    return { r: [R.x, R.y, R.w, R.h], inset: 1, key: 'dv' + s };
  };
}
// Musik (seit 15.51 eigene Stücke, tools/klang-synth/musik.py): in der Halle „turm“ (alle Ebenen, auch die Hüter),
// solange Kharzul lebt „kharzul“, ab seiner Verwandlung „kharzul2“ (dasselbe Stück mit mehr Wucht, setzt an derselben
// Stelle ein). Fehlt eine Datei, spielt die bisherige (Dungeon bzw. Boss: MUSIC_FALLBACK in klang-dateien.js)
if (typeof music !== 'undefined' && music.moodAt) {
  const _turmMood = music.moodAt;
  music.moodAt = function (x, y) {
    if (turmSlotAt(x, y) >= 0) return 'turm';
    return _turmMood.call(this, x, y);
  };
  const _turmMusicMood = music.mood;
  music.mood = function () {
    const p = game.player;
    const s = p && game.running && game.world ? turmSlotAt(p.x, p.y) : -1;
    if (s < 0) return _turmMusicMood.call(this);
    for (const m of game.monsters) {
      if (m.dead || m.typeId !== 'turm_waechter' || turmMonSlot(m) !== s) continue;
      return m.kzForm || m.kzMorphAt != null || (typeof kzFormK === 'function' && kzFormK(m) > 0) ? 'kharzul2' : 'kharzul';
    }
    // Klage des Turms (seit 15.73, tools/klang-synth/turmklage.py): traurige Solo-Violine beim Betreten – vor der ersten
    // Welle – und nach dem Sieg; in den Wellen die Kampfmusik des Turms. (Der Anweg davor: turmfinale.js)
    const run = game.turmRun;
    const st = run && run.slot === s ? run.st : null;
    if (st && (st.ph === 'w' || (st.ph === 'p' && (st.e | 0) <= 1))) return 'turmklage';
    return 'turm';
  };
}
// Die Klage schon in der Nähe des Turms (Karte Seelenhain) und im Durchgang vorab holen, damit sie beim Anweg sofort
// einsetzt (nur die Bytes; dekodiert wird erst beim Spielen)
if (typeof musicFiles !== 'undefined' && musicFiles.prefetch) {
  const _turmPrefetch = musicFiles.prefetch;
  musicFiles.prefetch = function (p) {
    _turmPrefetch.call(this, p);
    try {
      if (!p || !game.world || !game.running) return;
      const nah = (game.turmRun && game.turmRun.slot >= 0) ||
        game.world.npcs.some((n) => n.id === 'turm' && (n.x - p.x) ** 2 + (n.y - p.y) ** 2 < 2200 * 2200);
      if (!nah) return;
      const f = this.fileFor('turmklage');
      if (f) this.fetch(f);
    } catch (e) { /* ohne Vorladen */ }
  };
}
// Bossleiste: Hüter und Wächter der eigenen Halle immer, egal wie weit weg (das gewählte Ziel zuerst)
const _turmBossBar = ui.updateBossBar;
ui.updateBossBar = function () {
  const p = game.player;
  const run = game.turmRun;
  const hall = run && run.slot >= 0 && p ? turmSlotAt(p.x, p.y) : -1;
  if (hall < 0 || hall !== run.slot) return _turmBossBar.call(this);
  const list = (typeof monsterIndex === 'function' ? monsterIndex().get(0) : null) || game.monsters;
  let boss = null;
  for (const m of list) {
    if (m.dead || !m.type || !m.type.boss || turmMonSlot(m) !== hall) continue;
    if (!boss || m === game.target) boss = m;
  }
  this.set('boss', boss ? boss.id + ':' + Math.ceil(boss.hp) : '', () => {
    $('bossBar').hidden = !boss;
    document.body.classList.toggle('has-boss', !!boss);
    if (!boss) return;
    $('bossName').textContent = `LVL ${boss.level} ${boss.name}`;
    $('bossFill').style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
    $('bossHp').textContent = `${Math.ceil(boss.hp).toLocaleString('de-DE')} / ${boss.maxHp.toLocaleString('de-DE')}`;
  });
};

// --- Gruppenanzeige (seit 15.43): alle im selben Durchgang stehen in der Anzeige unter der eigenen Gruppe ------------
// Wer im Durchgang ist, erkennt jedes Gerät selbst: alle Mitspieler, die in derselben Halle stehen (gruppe.js partyExtras).
if (typeof partyExtraNames === 'function') {
  const _turmExtra = partyExtraNames;
  partyExtraNames = function () {
    const out = _turmExtra();
    const r = game.turmRun;
    const p = game.player;
    if (!r || !p || typeof net === 'undefined' || !net.players || turmSlotAt(p.x, p.y) !== r.slot) return out;
    for (const rp of net.players.values()) {
      if (!rp || rp.gone || rp.waechter || !rp.name || out.includes(rp.name)) continue;
      if (turmSlotAt(rp.x, rp.y) === r.slot) out.push(rp.name);
    }
    return out;
  };
}
