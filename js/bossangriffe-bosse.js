'use strict';

// Eigene Angriffe je Boss (seit 15.50, Grundformen und Ablauf: bossangriffe.js, Übersicht: docs/bosse.md).
// Je Boss: fx (Effekt-Thema aus BS_FXT3), skills (eigene Angriffe; kommen gemischt mit den gewohnten Angriffen dran),
// phases ([Lebensanteil, Angriff]: einmal je Kampf in stärkerer Fassung), raid (Kristallschild/Vernichtung nur noch,
// wo sie passen). Felder eines Angriffs: id, t (Grundform), name, say (Banner beim ersten Mal), bigSay (Phase), mul
// (Schaden, Faktor auf den Angriff), weitere je Grundform (n, w, gap, r, d, field, slow, dot, look, obj, mob …).
// phaseOnly: nur als Phasen-Angriff; from: erst unter diesem Lebensanteil im Beutel.

const BSK_DATA = {
  // --- Endbosse der Lichtseite ---------------------------------------------------------------------------------------
  fenris: {
    fx: 'wild', shieldAt: [], doomAt: [],
    skills: [
      { id: 'hetzjagd', t: 'hetzjagd', name: 'Hetzjagd', say: 'hetzt euch – drei Sprünge, weicht den Landestellen aus!', bigSay: 'jagt euch in fünf Sprüngen!', n: 3, gap: 0.95, r: 115, knock: true, mul: 3.0 },
      { id: 'urheulen', t: 'wellen', name: 'Urheulen', say: 'heult – die Erde bricht in Wellen nach außen auf!', n: 4, w: 130, gap: 0.65, slow: 0.3, mul: 2.8 },
      { id: 'rudel', t: 'beschwoeren', name: 'Ruf des Rudels', say: 'ruft sein Rudel herbei!', bigSay: 'ruft sein Rudel herbei!', phaseOnly: true, n: 3, lv: 4 }
    ],
    phases: [[0.6, 'rudel'], [0.3, 'hetzjagd']]
  },
  ursus: {
    fx: 'wald', shieldAt: [], doomAt: [],
    skills: [
      { id: 'beben', t: 'wellen', name: 'Erdbeben', say: 'stampft – das Beben wechselt: erst innen, dann außen!', bigSay: 'lässt die ganze Halle beben!', alt: true, n: 4, w: 140, gap: 1.25, mul: 3.2 },
      { id: 'baumwurf', t: 'wurf', name: 'Baumwurf', say: 'reißt einen Baum aus – wer weit weg steht, passt auf!', obj: 'log', r: 150, mul: 4.0 },
      { id: 'sporen', t: 'felder', name: 'Sporenwolke', say: 'schüttelt Sporen ab – raus aus den Wolken, sie lähmen!', field: 'gift', slow: 0.3, dot: 0.2, extra: 2, dur: 6, r: 100, mul: 1.6 }
    ],
    phases: [[0.55, 'beben'], [0.25, 'baumwurf']]
  },
  gorbag: {
    fx: 'erde', shieldAt: [], doomAt: [],
    skills: [
      { id: 'axtwirbel', t: 'wirbel', name: 'Axtwirbel', say: 'wirbelt mit dem Hackbeil durch die Halle!', speed: 420, r: 85, mul: 3.0 },
      { id: 'speerhagel', t: 'bahnen', name: 'Speerhagel', say: 'ruft den Speerhagel – wechselt die Bahn!', look: 'fall', proj: 'spear', w: 62, gap: 1.2, mul: 3.4 },
      { id: 'kriegshorn', t: 'beschwoeren', name: 'Kriegshorn', say: 'bläst das Kriegshorn – Orks stürmen herein!', bigSay: 'bläst das Kriegshorn – Orks stürmen herein!', phaseOnly: true, n: 3, lv: 5 }
    ],
    phases: [[0.66, 'kriegshorn'], [0.33, 'kriegshorn']]
  },
  azaroth: {
    // die Vernichtung bleibt: Höllenfeuer passt zum Höllenfürsten
    fx: 'feuer', shieldAt: [],
    skills: [
      { id: 'flammenwelle', t: 'wellen', name: 'Flammenwelle', say: 'entfesselt Flammenwellen – tretet in das Feuer, das schon erloschen ist!', n: 4, w: 135, gap: 0.6, mul: 3.3 },
      { id: 'hoellenglut', t: 'felder', name: 'Höllenglut', say: 'lässt die Erde aufglühen – raus aus der Glut!', field: 'feuer', dot: 0.34, extra: 3, dur: 7, r: 105, mul: 1.9 }
    ]
  },
  ymir: {
    fx: 'eis', shieldAt: [], doomAt: [],
    skills: [
      { id: 'eisfeld', t: 'felder', name: 'Eisfeld', say: 'lässt den Boden gefrieren – wer im Eis steht, friert fest!', bigSay: 'friert die halbe Halle ein!', field: 'frost', slow: 0.3, dot: 0.15, extra: 2, dur: 8, r: 110, mul: 1.8 },
      { id: 'lawine', t: 'bahnen', name: 'Lawine', say: 'tritt eine Lawine los – wechselt die Bahn!', bigSay: 'tritt eine gewaltige Lawine los!', look: 'roll', w: 66, gap: 1.3, slow: 0.25, mul: 3.6 }
    ],
    phases: [[0.6, 'eisfeld'], [0.3, 'lawine']]
  },
  vritra: {
    fx: 'gift', shieldAt: [], doomAt: [],
    skills: [
      { id: 'giftspucke', t: 'felder', name: 'Giftspucke', say: 'spuckt Gift – weg aus den Lachen!', throw: true, pose: 'line', field: 'gift', slow: 0.2, dot: 0.3, extra: 2, dur: 7, r: 95, mul: 1.8 },
      { id: 'umschlingen', t: 'griff', name: 'Umschlingen', say: 'schnellt den Schwanz vor – wer getroffen wird, wird umschlungen!', look: 'ranke', at: 'core', n: 1, root: 1.4, w: 54, mul: 2.8 },
      { id: 'giftatem', t: 'schwenk', name: 'Giftatem', say: 'speit Gift in einem weiten Bogen!', bigSay: 'speit Gift über die ganze Halle!', n: 5, R: 460, dot: 0.25, slow: 0.25, mul: 2.6 }
    ],
    phases: [[0.5, 'giftatem']]
  },
  morrak: {
    // der Seelenkristall-Schild bleibt (Seelengefäße des Lichs), die Vernichtung entfällt
    fx: 'seele', doomAt: [],
    skills: [
      { id: 'totenruf', t: 'beschwoeren', name: 'Totenruf', say: 'ruft die Toten aus ihren Gräbern!', n: 3, lv: 6, mul: 2.4 },
      { id: 'seelenentzug', t: 'entzug', name: 'Seelenentzug', say: 'fesselt eure Seelen – wer gefesselt ist, läuft zu ihm!', dur: 5, safe: 230, dot: 0.5, heal: 0.0025 },
      { id: 'seelenregen', t: 'muster', name: 'Seelenregen', say: 'lässt Schädel in Reihen herabstürzen!', proj: 'skull', s: 210, r: 92, mul: 3.0 }
    ]
  },
  ignar: {
    // Vernichtung bleibt als „Weltenbrand“-Ult, kein Kristallschild
    fx: 'feuer', shieldAt: [],
    skills: [
      { id: 'feueratem', t: 'schwenk', name: 'Feueratem', say: 'speit Feuer in einem weiten Bogen!', n: 5, R: 480, dot: 0.3, mul: 3.0 },
      { id: 'sturzflug', t: 'bahnen', name: 'Sturzflug', say: 'fliegt über die Halle – Feuer regnet in Bahnen!', look: 'fall', w: 66, gap: 1.2, mul: 3.6 },
      { id: 'glutregen', t: 'muster', name: 'Glutregen', say: 'lässt Glut im Schachbrett herabregnen!', s: 205, r: 94, mul: 3.1 }
    ]
  },
  tarkon: {
    // eine Vernichtung bei der Hälfte („Himmelszorn“), kein Kristallschild
    fx: 'sturm', shieldAt: [], doomAt: [0.5],
    skills: [
      { id: 'gewitterfeld', t: 'muster', name: 'Gewitterfeld', say: 'ruft das Gewitter – Blitze schlagen im Schachbrett ein!', bigSay: 'ruft ein schweres Gewitter!', s: 200, r: 95, mul: 3.2 },
      { id: 'felswurf', t: 'wurf', name: 'Felswurf', say: 'schleudert einen Felsen – wer weit weg steht, passt auf!', obj: 'rock', r: 155, mul: 4.1 },
      { id: 'donnerwelle', t: 'wellen', name: 'Donnerwelle', say: 'schlägt auf den Boden – Donner rollt in Wellen nach außen!', n: 4, w: 140, gap: 0.6, slow: 0.2, mul: 3.3 }
    ],
    phases: [[0.75, 'gewitterfeld'], [0.25, 'gewitterfeld']]
  },
  aelvyr: {
    // Kristallschild und Vernichtung bleiben (Kristallwyrm, der Abgrund): seine Mechanik
    fx: 'kristall',
    skills: [
      { id: 'splittersturm', t: 'muster', name: 'Splittersturm', say: 'lässt Kristallsplitter im Schachbrett herabstürzen!', s: 205, r: 94, mul: 3.1 },
      { id: 'abgrundriss', t: 'bahnen', name: 'Abgrundriss', say: 'reißt den Boden auf – Spalten öffnen sich in Reihen!', fx: 'leere', w: 64, gap: 1.2, mul: 3.6 },
      { id: 'kristallatem', t: 'schwenk', name: 'Kristallatem', say: 'speit Kristallsplitter in einem weiten Bogen!', n: 5, R: 480, slow: 0.25, mul: 3.0 }
    ]
  },
  // --- Endbosse der Schattenseite (eigene Angriffe, nicht die ihres Gegenstücks) ------------------------------------
  skarn: {
    fx: 'nacht', shieldAt: [], doomAt: [],
    skills: [
      { id: 'schattensprung', t: 'hetzjagd', name: 'Schattensprung', say: 'verschwindet im Schatten – er taucht dort auf, wo ihr steht!', bigSay: 'springt von Schatten zu Schatten!', teleport: true, n: 3, gap: 0.85, r: 110, mul: 3.0 },
      { id: 'nachtnebel', t: 'felder', name: 'Nachtnebel', say: 'hüllt euch in Nachtnebel – raus da, er lähmt!', field: 'nebel', slow: 0.35, dot: 0.18, extra: 3, dur: 8, r: 110, mul: 1.5 },
      { id: 'mondrudel', t: 'beschwoeren', name: 'Mondrudel', say: 'ruft das Mondrudel!', phaseOnly: true, n: 3, lv: 4 }
    ],
    phases: [[0.6, 'mondrudel'], [0.3, 'schattensprung']]
  },
  brakkur: {
    fx: 'glut', shieldAt: [], doomAt: [],
    skills: [
      { id: 'kohlenregen', t: 'felder', name: 'Kohlenregen', say: 'schleudert glühende Kohlen – weg aus der Glut!', bigSay: 'schüttet einen Kohlenregen aus!', throw: true, pose: 'line', field: 'glut', dot: 0.32, extra: 3, dur: 7, r: 100, mul: 1.8 },
      { id: 'glutstoss', t: 'wellen', name: 'Glutstoß', say: 'stößt Glut in Wellen von sich!', n: 3, w: 150, gap: 0.55, mul: 3.1 },
      { id: 'glutbrocken', t: 'wurf', name: 'Glutbrocken', say: 'wirft einen glühenden Brocken!', obj: 'rock', r: 145, mul: 3.9 }
    ],
    phases: [[0.6, 'kohlenregen'], [0.3, 'glutstoss']]
  },
  vharok: {
    fx: 'knochen', shieldAt: [], doomAt: [],
    skills: [
      { id: 'knochenreihen', t: 'bahnen', name: 'Knochenreihen', say: 'lässt Knochen in Reihen aus dem Boden brechen – wechselt die Reihe!', w: 60, gap: 1.15, mul: 3.5 },
      { id: 'knochenbeil', t: 'sense', name: 'Knochenbeil', say: 'holt mit dem Knochenbeil aus – erst vorn, dann hinten!', R: 320, mul: 3.9 },
      { id: 'gebeinruf', t: 'beschwoeren', name: 'Gebeinruf', say: 'ruft Gebeine aus dem Sand!', from: 0.8, n: 3, lv: 5 }
    ],
    phases: [[0.5, 'gebeinruf']]
  },
  sereth: {
    fx: 'blut', shieldAt: [], doomAt: [],
    skills: [
      { id: 'blutsense', t: 'sense', name: 'Blutsense', say: 'schwingt die Blutsense – erst vorn, dann hinten!', R: 330, dot: 0.22, mul: 3.8 },
      { id: 'blutdurst', t: 'entzug', name: 'Blutdurst', say: 'trinkt euer Blut – wer gefesselt ist, läuft zu ihr!', bigSay: 'trinkt das Blut der ganzen Gruppe!', dur: 5, safe: 230, dot: 0.5, heal: 0.003 },
      { id: 'blutwirbel', t: 'wirbel', name: 'Blutwirbel', say: 'wirbelt als Blutsturm durch die Halle!', speed: 450, r: 85, mul: 2.9 }
    ],
    phases: [[0.5, 'blutdurst']]
  },
  nachtriese: {
    fx: 'nachteis', shieldAt: [], doomAt: [],
    skills: [
      { id: 'nachtfrostwelle', t: 'wellen', name: 'Nachtfrostwelle', say: 'lässt den Frost wechseln: erst innen, dann außen!', alt: true, n: 4, w: 140, gap: 1.3, slow: 0.35, mul: 3.1 },
      { id: 'eisblock', t: 'wurf', name: 'Eisblock', say: 'schleudert einen Eisblock!', obj: 'rock', r: 150, slow: 0.4, mul: 4.0 },
      { id: 'nachtfrost', t: 'felder', name: 'Nachtfrost', say: 'lässt den Boden gefrieren – wer im Eis steht, friert fest!', field: 'frost', slow: 0.3, dot: 0.15, extra: 3, dur: 8, r: 105, mul: 1.7 }
    ],
    phases: [[0.5, 'nachtfrost']]
  },
  moormutter: {
    fx: 'moor', shieldAt: [], doomAt: [],
    skills: [
      { id: 'sumpfranken', t: 'griff', name: 'Sumpfranken', say: 'lässt Ranken aus dem Moor brechen – weg von der Stelle!', boden: true, look: 'ranke', r: 90, root: 1.6, dot: 0.25, d: 1.5, mul: 2.4 },
      { id: 'faulgas', t: 'felder', name: 'Faulgas', say: 'lässt Faulgas aufsteigen – raus aus den Schwaden!', bigSay: 'lässt das ganze Moor ausgasen!', field: 'gift', slow: 0.3, dot: 0.26, extra: 4, dur: 7, r: 105, mul: 1.6 }
    ],
    phases: [[0.55, 'faulgas']]
  },
  // --- Höllenthron: Abaddor behält Siegel, wahre Gestalt und Viertelschlag, dazu zwei eigene Angriffe ---------------
  abaddor: {
    fx: 'feuer',
    skills: [
      { id: 'hoellenketten', t: 'griff', name: 'Höllenketten', say: 'schleudert seine Ketten – wer getroffen wird, wird zu ihm gerissen!', look: 'kette', n: 2, root: 1.0, w: 56, mul: 3.0 },
      { id: 'hoellentor', t: 'beschwoeren', name: 'Höllentor', say: 'reißt Höllentore auf – Höllenhunde brechen hervor!', n: 3, lv: 6, mul: 2.6 }
    ]
  },
  // Wächter des Höllenthrons mit den alten Boss-Angriffen (Stampfer und Salve): je zwei eigene, jeder dritte Angriff
  zerberos: {
    fx: 'feuer',
    skills: [
      { id: 'hoellenhatz', t: 'hetzjagd', name: 'Höllenhatz', say: 'hetzt euch mit drei Sprüngen – weicht den Landestellen aus!', n: 3, gap: 0.9, r: 110, knock: true, mul: 3.0 },
      { id: 'dreifachatem', t: 'schwenk', name: 'Dreifacher Atem', say: 'speit Feuer aus drei Mäulern!', n: 3, h: 0.4, R: 380, dot: 0.25, mul: 2.8 }
    ]
  },
  ifrah: {
    fx: 'feuer',
    skills: [
      { id: 'flammenkranz', t: 'wellen', name: 'Flammenkranz', say: 'tanzt im Flammenkranz – erst innen, dann außen!', alt: true, n: 3, w: 140, gap: 1.2, mul: 3.0 },
      { id: 'glutsaat', t: 'felder', name: 'Glutsaat', say: 'sät Glut – weg aus den Flammen!', throw: true, pose: 'line', field: 'feuer', dot: 0.3, extra: 2, dur: 6, r: 95, mul: 1.7 }
    ]
  },
  // --- Hüter im Turm der Verdammten: je ein eigener Angriff zu ihren vier ------------------------------------------
  turm_hueter: {
    fx: 'glut',
    skills: [{ id: 'kettenwurf', t: 'griff', name: 'Kettenwurf', say: 'schleudert seinen Kettenflegel – wer getroffen wird, wird herangerissen!', look: 'kette', n: 1, root: 0.9, w: 54, mul: 2.6 }]
  },
  turm_ilmra: {
    fx: 'feuer',
    skills: [{ id: 'glutwelle', t: 'wellen', name: 'Glutwelle', say: 'schwenkt das Rauchfass – Glut rollt in Wellen nach außen!', n: 3, w: 130, gap: 0.6, mul: 2.7 }]
  },
  turm_varn: {
    fx: 'glut',
    skills: [{ id: 'glefenwirbel', t: 'wirbel', name: 'Glefenwirbel', say: 'wirbelt mit der Glefe durch die Halle!', speed: 410, r: 80, mul: 2.6 }]
  },
  // --- Dungeon-Bosse (jeder dritte Angriff ein eigener) -----------------------------------------------------------
  banditenfuerst: {
    fx: 'staub',
    skills: [
      { id: 'klingenwirbel', t: 'wirbel', name: 'Klingenwirbel', say: 'wirbelt mit beiden Klingen durch den Raum!', speed: 400, r: 70, mul: 2.6 },
      { id: 'rauchbombe', t: 'felder', name: 'Rauchbombe', say: 'wirft Rauchbomben – raus aus dem Rauch!', throw: true, pose: 'line', field: 'nebel', slow: 0.35, dot: 0.12, extra: 1, dur: 6, r: 85, mul: 1.4 }
    ]
  },
  spinnenkoenigin: {
    fx: 'brut',
    skills: [
      { id: 'spinnennetz', t: 'griff', name: 'Spinnennetz', say: 'spinnt Netze unter euch – weg von der Stelle!', boden: true, look: 'ranke', r: 80, root: 1.4, dot: 0.2, mul: 2.0 },
      { id: 'spinnenbrut', t: 'beschwoeren', name: 'Spinnenbrut', say: 'lässt ihre Brut schlüpfen!', n: 3, lv: 3, hp: 0.5 }
    ]
  },
  kriegsherr: {
    fx: 'erde',
    skills: [
      { id: 'speerreihen', t: 'bahnen', name: 'Speerhagel', say: 'ruft den Speerhagel – wechselt die Bahn!', look: 'fall', proj: 'spear', R: 380, w: 58, gap: 1.2, mul: 3.0 },
      { id: 'kriegsbeil', t: 'sense', name: 'Kriegsbeil', say: 'holt mit dem Kriegsbeil aus – erst vorn, dann hinten!', R: 260, mul: 3.4 }
    ]
  },
  eiskoenig: {
    fx: 'eis',
    skills: [
      { id: 'frostboden', t: 'felder', name: 'Frostboden', say: 'lässt den Boden gefrieren – wer im Eis steht, friert fest!', field: 'frost', slow: 0.3, dot: 0.12, extra: 1, dur: 7, r: 90, mul: 1.5 },
      { id: 'frostwelle', t: 'wellen', name: 'Frostwelle', say: 'stößt Frost in Wellen von sich!', n: 3, w: 120, gap: 0.6, slow: 0.3, mul: 2.8 }
    ]
  },
  urdrache: {
    fx: 'feuer',
    skills: [
      { id: 'drachenatem', t: 'schwenk', name: 'Drachenatem', say: 'speit Feuer in einem weiten Bogen!', n: 5, R: 380, dot: 0.25, mul: 2.8 },
      { id: 'feuerlachen', t: 'felder', name: 'Feuerlachen', say: 'spuckt Feuer – weg aus den Lachen!', throw: true, pose: 'line', field: 'feuer', dot: 0.3, extra: 1, dur: 6, r: 90, mul: 1.6 }
    ]
  },
  gruftkoenig: {
    fx: 'tod',
    skills: [
      { id: 'grabruf', t: 'beschwoeren', name: 'Grabruf', say: 'ruft die Toten aus ihren Gräbern!', n: 2, lv: 4, mul: 2.2 },
      { id: 'lebensraub', t: 'entzug', name: 'Lebensraub', say: 'fesselt eure Seelen – wer gefesselt ist, läuft zu ihm!', dur: 4.5, safe: 200, dot: 0.45, heal: 0.003 }
    ]
  },
  nagakoenigin: {
    fx: 'wasser',
    skills: [
      { id: 'nagagift', t: 'felder', name: 'Giftspucke', say: 'spuckt Gift – weg aus den Lachen!', throw: true, pose: 'line', field: 'gift', slow: 0.2, dot: 0.26, extra: 1, dur: 6, r: 85, mul: 1.6 },
      { id: 'nagagriff', t: 'griff', name: 'Umschlingen', say: 'schnellt den Schwanz vor – wer getroffen wird, wird umschlungen!', look: 'ranke', at: 'core', n: 1, root: 1.2, w: 50, mul: 2.5 }
    ]
  },
  titanenkoenig: {
    fx: 'schmiede',
    skills: [
      { id: 'titanenbeben', t: 'wellen', name: 'Titanenbeben', say: 'stampft – das Beben wechselt: erst innen, dann außen!', alt: true, n: 3, w: 130, gap: 1.25, mul: 3.0 },
      { id: 'titanenwurf', t: 'wurf', name: 'Felswurf', say: 'schleudert einen glühenden Felsen!', obj: 'rock', r: 140, mul: 3.7 }
    ]
  },
  vaelith: {
    fx: 'kristall',
    skills: [
      { id: 'splitterregen', t: 'muster', name: 'Splitterregen', say: 'lässt Kristallsplitter im Schachbrett herabstürzen!', R: 420, s: 190, r: 88, mul: 2.9 },
      { id: 'kristallfessel', t: 'griff', name: 'Kristallfessel', say: 'lässt Kristall unter euch wachsen – weg von der Stelle!', boden: true, look: 'eis', r: 85, root: 1.3, dot: 0.2, mul: 2.2 }
    ]
  }
};

// Eintragen: Fähigkeiten, Phasen und – wo angegeben – Kristallschild/Vernichtung je Boss (vorher bei allen gleich)
for (const [id, D] of Object.entries(BSK_DATA)) {
  const t = MONSTER_TYPES[id];
  if (!t) continue;
  BSK_KITS[id] = { fx: D.fx, skills: D.skills, phases: D.phases || null };
  // ohne Kristallschild: +20 % Leben, damit der Kampf etwa so lang bleibt (der Schild kostete je Phase 3–5 Kristalle
  // zu 2,5 % des Bosslebens und heilte ihn, solange sie standen)
  if (t.raid && D.shieldAt && !D.shieldAt.length && !t.bskHp) { t.hpMul = Math.round(t.hpMul * 1.2); t.bskHp = true; }
  // eigene Kopie: die Schattenendbosse teilten sich anfangs das raid-Objekt ihres Gegenstücks nicht, sicher ist sicher
  if (t.raid && (D.shieldAt || D.doomAt)) {
    t.raid = Object.assign({}, t.raid);
    if (D.shieldAt) t.raid.shieldAt = D.shieldAt;
    if (D.doomAt) t.raid.doomAt = D.doomAt;
  }
}
// eigenes Geschoss-Thema einer Fähigkeit (z. B. Speere statt Felsbrocken)
{
  const _bskTh = bskTh;
  // eslint-disable-next-line no-global-assign
  bskTh = function (m, K) {
    const th = _bskTh(m, K);
    return K && K.proj && th.proj !== K.proj ? Object.assign({}, th, { proj: K.proj }) : th;
  };
}

// --- Stufe-75-Endbosse: mehr Schaden (seit 15.50) ------------------------------------------------------------------
// Ignar (76) und Tarkon (78) lagen im Angriff kaum über Abaddor (72) – Tarkon, der Endboss der Donnerklamm (Stufe
// 50–75), traf mit 4.958 nur 8 % härter als Abaddor in erster Form. Neu: Ignar +21 %, Tarkon +27 %, Aelvyr (80) +21 %,
// damit die Kurve weiter steigt (Abaddor 4.608 / 5.760 in wahrer Gestalt → Ignar 5.700 → Tarkon 6.300 → Aelvyr 6.450).
for (const [id, mul] of [['ignar', 4.4], ['tarkon', 4.65], ['aelvyr', 4.55]]) if (MONSTER_TYPES[id]) MONSTER_TYPES[id].atkMul = mul;
