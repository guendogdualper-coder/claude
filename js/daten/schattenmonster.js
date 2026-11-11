// Monster der Schattenseite (seit 14.53, Konzept in docs/fraktionen.md).
// Wer sich für die Seite des Schattens entscheidet, spielt Stufe 1–49 auf sechs eigenen Karten (Maps 11–16, daten/zonen.js).
// Jede Art dort hat ein Gegenstück auf der Lichtseite derselben Stufe (twin): Stufe, Leben, Angriff, Tempo, Reichweite
// und Abklingzeit sind gleich, damit beide Seiten gleich schnell vorankommen. Aussehen: dieselbe Familie wie das
// Gegenstück (look), aber mit eigenen Farben und eigenem Zubehör (Zeichnungen und 3D-Farben in schattenwelt.js).
// Monster-Teile für den Schmied: eine Schattenart lässt das Teil ihres Gegenstücks fallen (twin, ausruestung.js) – so
// brauchen beide Seiten dieselben Teile, und Handel und Auktionshaus bleiben einfach.
//
// [id, Gegenstück, Name, Grundfarbe]
const SHADOW_MOBS = [
  // Map 11 · Dämmerwiesen um Mondfall (Stufe 1–9)
  ['aschehund', 'hund', 'Aschehund', '#3e3a3c'],
  ['daemmerfuchs', 'fuchs', 'Dämmerfuchs', '#5a5a78'],
  ['nebelwolf', 'wolf', 'Nebelwolf', '#6a7484'],
  ['nachthirsch', 'hirsch', 'Nachthirsch', '#3a3448'],
  ['nachtleitwolf', 'alphawolf', 'Nachtleitwolf', '#24242e'],
  ['schattenkeiler', 'wildschwein', 'Schattenkeiler', '#2a2430'],
  // Map 12 · Aschewald (Stufe 10–19)
  ['aschenraeuber', 'bandit', 'Aschenräuber', '#4a4440'],
  ['glutkeiler', 'dornenkeiler', 'Glutkeiler', '#2e2420'],
  ['russschuetze', 'banditschuetze', 'Rußschütze', '#3a3a36'],
  ['aschespinne', 'waldspinne', 'Aschespinne', '#5a5652'],
  ['russluchs', 'luchs', 'Rußluchs', '#4a4440'],
  ['kohlenbaer', 'braunbaer', 'Kohlenbär', '#2a2220'],
  // Map 13 · Knochenwüste (Stufe 20–29)
  ['beinbrecher', 'ork', 'Beinbrecher', '#7a7e6a'],
  ['aashyaene', 'hyaene', 'Aashyäne', '#8a8478'],
  ['knochenruferin', 'orkschamane', 'Knochenruferin', '#6a6a7a'],
  ['bleichskorpion', 'skorpion', 'Bleichskorpion', '#d8d0b8'],
  ['knochenhauptmann', 'orkhauptmann', 'Knochenhauptmann', '#5a5e4e'],
  // Map 14 · Blutsteppe (Stufe 30–39)
  ['blutoger', 'oger', 'Blutoger', '#7a4a44'],
  ['steppenwarg', 'warg', 'Steppenwarg', '#4a2e2a'],
  ['blutdaemon', 'daemon', 'Blutdämon', '#6a1420'],
  ['blutmaul', 'hoellenhund', 'Blutmaul', '#2a1012'],
  // Map 15 · Nachtfrost (Stufe 40–49)
  ['mitternachtswolf', 'eiswolf', 'Mitternachtswolf', '#3a4a6a'],
  ['nachtbaer', 'eisbaer', 'Nachtbär', '#4a5468'],
  ['dunkelyeti', 'yeti', 'Dunkelyeti', '#5a6478'],
  ['nachtmammut', 'mammut', 'Nachtmammut', '#3a3448'],
  ['frostgespenst', 'frostgeist', 'Frostgespenst', '#8a9ad8'],
  // Map 16 · Schattenklippen und Schwarzmoor (Stufe 30–50)
  ['klippenviper', 'sandviper', 'Klippenviper', '#5a5a6a'],
  ['klippenschakal', 'schakal', 'Klippenschakal', '#5a5462'],
  ['nachtrassler', 'klapperschlange', 'Nachtrassler', '#4a4258'],
  ['schattenkobra', 'kobra', 'Schattenkobra', '#24202e'],
  ['moorpython', 'riesenpython', 'Moorpython', '#2e3a2a'],
  ['nebelpanther', 'panther', 'Nebelpanther', '#4a5060'],
  ['moornaga', 'naga', 'Moornaga', '#2a4a3e'],
  ['moorseherin', 'nagapriesterin', 'Moorseherin', '#3a2a4a']
];
for (const [id, twin, name, color] of SHADOW_MOBS) {
  const t = MONSTER_TYPES[twin];
  MONSTER_TYPES[id] = { ...t, name, color, look: twin, twin, side: 'schatten' };
}

// Endbosse der sechs Schattenkarten (Endboss-Arena je Karte, gleiche Werte wie das Gegenstück der Lichtseite).
// raid.art: Aussehen (eine Schattenart, vergrößert), boss.summon: Helfer von der eigenen Karte, boss.mat: Teil wie beim
// Gegenstück (dieselben Schmiede-Teile für beide Seiten)
const SHADOW_RAIDS = [
  // [id, Gegenstück, Name, Grundfarbe, Aussehen, Helfer, Map, Leuchtfarbe, Geschossfarbe]
  ['skarn', 'fenris', 'Skarn, der Nachtwolf', '#1e1e28', 'nachtleitwolf', 'nachtleitwolf', 11, '#9aa8ff', '#c8d0ff'],
  ['brakkur', 'ursus', 'Brakkur, der Kohlenfürst', '#22181a', 'kohlenbaer', 'kohlenbaer', 12, '#ff7a3a', '#ffb04a'],
  ['vharok', 'gorbag', 'Gebeinfürst Vharok', '#4a4e40', 'knochenhauptmann', 'knochenhauptmann', 13, '#e8e0c8', '#f4ecd8'],
  ['sereth', 'azaroth', 'Blutfürstin Sereth', '#5a0e1a', 'blutdaemon', 'blutmaul', 14, '#ff3a4a', '#ff6a6a'],
  ['nachtriese', 'ymir', 'Nachtriese Skadur', '#3e4860', 'dunkelyeti', 'mitternachtswolf', 15, '#8ab0ff', '#bfd0ff'],
  ['moormutter', 'vritra', 'Moormutter Veyla', '#1e3a30', 'moorseherin', 'moornaga', 16, '#7ae0a8', '#a8f0c8']
];
for (const [id, twin, name, color, art, summon, map, glow, shot] of SHADOW_RAIDS) {
  const t = MONSTER_TYPES[twin];
  MONSTER_TYPES[id] = {
    ...t, name, color, twin, side: 'schatten',
    boss: { ...t.boss, color: glow, shot, summon },
    raid: { ...t.raid, art, map }
  };
}
// Schattenart → Gegenstück und umgekehrt (für Teile, Fundorte, Aufträge)
const SHADOW_TWIN_OF = {};
for (const [id, twin] of SHADOW_MOBS) SHADOW_TWIN_OF[twin] = id;
for (const [id, twin] of SHADOW_RAIDS) SHADOW_TWIN_OF[twin] = id;
