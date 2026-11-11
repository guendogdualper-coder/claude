// Die Karten der Schattenseite (seit 14.53, Konzept und Regeln in docs/fraktionen.md) – wie karte80.js für den
// Kristallabgrund steht hier nur, was die neuen Gegenden anders aussehen lässt; Karten, Gebiete, Städte, Leute,
// Monster und Aufträge stehen in den Datendateien (daten/zonen.js, daten/schattenmonster.js, daten/stadtformen.js,
// daten/quests.js, daten/nachtmonster.js) und entstehen über dieselben Wege wie auf jeder anderen Map (welt.js).
// Alles als Ergänzung der bestehenden Tabellen:
//   - Böden NACHTGRAS, NACHTMOOS, SCHWARZERDE, KNOCHENSAND, BLUTERDE: Farben (2D, 3D, Karte), Bodenstruktur, Gras
//   - Stimmung je Gebiet (Dämmerlicht: Himmel, Sonne, Nebel), Musikstimmung, Felsen, Schmuck, Randkulisse
//   - Bäume: dunkelviolette Kronen in den Dämmerwiesen, verkohlte Tannen mit Glut im Aschewald, bleiche Knochenbäume in
//     der Knochenwüste, schwarzrote Bäume in der Blutsteppe, Tannen mit Nachtreif im Nachtfrost
//   - Monster: Zeichnungen der Gegenstücke mit eigenen Farben (shadowArt), eigene 3D-Tiere (Keiler, Hirsch, Mammut),
//     Köpfe und Zubehör der Menschenartigen, Gebietsthema der 3D-Modelle, Stimme
// Keine Bodenringe, Runen oder Sterne als Schmuck.

const SHADOW_STYLES = new Set(['mondfall', 'daemmerwiesen', 'glimmlager', 'aschewald', 'knochenlager', 'knochenwueste', 'blutlager', 'blutsteppe',
  'nachtfrostlager', 'nachtfrost', 'nachtwacht', 'schattenklippen', 'schwarzmoor']);

// --- Boden ---------------------------------------------------------------------------------------------
(function shadowGround() {
  const add = (g, a, b, map) => {
    GROUND_SHADES[g] = [a, b];
    GROUND_PALETTE[g] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
    if (typeof MAP_COLORS !== 'undefined') MAP_COLORS[g] = map;
  };
  add(GROUND.NACHTGRAS, '#22364a', '#3a5a66', [52, 82, 96]);   // blaugrünes Dämmergras
  add(GROUND.NACHTMOOS, '#33294c', '#544570', [74, 62, 104]);  // violettes Moos mit Mondkraut
  add(GROUND.SCHWARZERDE, '#1c1816', '#38302c', [48, 40, 36]); // verkohlter Waldboden
  add(GROUND.KNOCHENSAND, '#9c968a', '#cac4b4', [190, 184, 168]); // bleicher Sand
  add(GROUND.BLUTERDE, '#421a1a', '#68302c', [102, 44, 40]);   // rote Steppe
  add(GROUND.NACHTSCHNEE, '#8a96bc', '#c4cce6', [176, 186, 222]); // Schnee im Mondlicht (bläulich)
  if (typeof SOIL3 !== 'undefined') {
    SOIL3[GROUND.NACHTGRAS] = 0;
    SOIL3[GROUND.NACHTMOOS] = 0;
    SOIL3[GROUND.SCHWARZERDE] = 5;
    SOIL3[GROUND.KNOCHENSAND] = 2;
    SOIL3[GROUND.BLUTERDE] = 5;
    SOIL3[GROUND.NACHTSCHNEE] = 4;
  }
  // Gras in 3D: dichtes, dunkles Gras auf Dämmergras und Moos, vereinzelt verbrannte Halme im Aschewald, rotes Steppengras
  if (typeof GRASS3 !== 'undefined') {
    GRASS3[GROUND.NACHTGRAS] = '#2e5a5e';
    GRASS3[GROUND.NACHTMOOS] = '#5a4a80';
    GRASS3[GROUND.SCHWARZERDE] = '#3a3230';
    GRASS3[GROUND.KNOCHENSAND] = '#a8a090';
    GRASS3[GROUND.BLUTERDE] = '#7a3430';
    GRASS3[GROUND.NACHTSCHNEE] = '#6a7aa0';
    Object.assign(GRASS3_SPARSE, { [GROUND.SCHWARZERDE]: 10, [GROUND.KNOCHENSAND]: 14, [GROUND.BLUTERDE]: 6, [GROUND.NACHTSCHNEE]: 9 });
    if (typeof GRASS3_DENSE !== 'undefined') GRASS3_DENSE.add(GROUND.NACHTGRAS).add(GROUND.NACHTMOOS);
  }
})();

// --- Stimmung ------------------------------------------------------------------------------------------
// Dämmerlicht statt Mittagssonne: Himmel in Violett, Nachtblau oder Blutrot, kühles oder rötliches Licht, näherer Nebel
if (typeof MOOD3 !== 'undefined') {
  Object.assign(MOOD3, {
    mondfall: { sky: '#6a6e9e', sun: '#e4e0ff', sunI: 0.86, hemi: '#d0d4f4', ground: '#2e3a52', hemiI: 0.62 },
    daemmerwiesen: { sky: '#5e6490', sun: '#dcd8ff', sunI: 0.8, hemi: '#c4cae8', ground: '#24364a', hemiI: 0.58, near: 26, far: 58 },
    glimmlager: { sky: '#5e5250', sun: '#ffd0a8', sunI: 0.74, hemi: '#d8c8c0', ground: '#2a2220', hemiI: 0.56 },
    aschewald: { sky: '#4e4442', sun: '#ffb88a', sunI: 0.62, hemi: '#c0b0a8', ground: '#201a18', hemiI: 0.5, near: 20, far: 48 },
    knochenlager: { sky: '#7e7e96', sun: '#eceaff', sunI: 0.86, hemi: '#e0dcf0', ground: '#6a665c', hemiI: 0.6 },
    knochenwueste: { sky: '#74748e', sun: '#e8e4ff', sunI: 0.84, hemi: '#d8d4ec', ground: '#6a665a', hemiI: 0.6, near: 26, far: 58 },
    blutlager: { sky: '#6a3036', sun: '#ffb0a0', sunI: 0.74, hemi: '#e0b0aa', ground: '#3a1616', hemiI: 0.54 },
    blutsteppe: { sky: '#5e2028', sun: '#ff9a88', sunI: 0.7, hemi: '#d8a0a0', ground: '#341214', hemiI: 0.52, near: 22, far: 52 },
    nachtfrostlager: { sky: '#3a4878', sun: '#c0d0ff', sunI: 0.72, hemi: '#b0c0ec', ground: '#3a4a78', hemiI: 0.62 },
    nachtfrost: { sky: '#2e3a6a', sun: '#aac0ff', sunI: 0.66, hemi: '#9cb0e4', ground: '#34446e', hemiI: 0.6, near: 22, far: 52 },
    nachtwacht: { sky: '#525674', sun: '#d4d4ff', sunI: 0.8, hemi: '#c4c8e8', ground: '#2a2a36', hemiI: 0.58 },
    schattenklippen: { sky: '#4a4c6a', sun: '#c8c8ff', sunI: 0.74, hemi: '#b8bce0', ground: '#24242e', hemiI: 0.54, near: 24, far: 56 },
    schwarzmoor: { sky: '#2e4440', sun: '#b0f0d0', sunI: 0.58, hemi: '#98c0b0', ground: '#14221c', hemiI: 0.5, near: 18, far: 44 }
  });
  for (const r of SHADOW_RAID_DEFS) MOOD3['raid_' + r[0]] = MOOD3.dungeon;
}
// Musikstimmung der eigenen Kompositionen des Spiels (musik.js): Dämmerwiesen ruhig, Aschewald und Moor dunkel
const SHADOW_MUSIC = { daemmerwiesen: 'wald', aschewald: 'dunkel', knochenwueste: 'heiss', blutsteppe: 'dunkel', nachtfrost: 'kalt', schattenklippen: 'heiss', schwarzmoor: 'dunkel' };
if (typeof music !== 'undefined' && music.moodAt) {
  const baseMood = music.moodAt;
  music.moodAt = function (x, y) {
    const z = zoneAt(x, y);
    if (z && !z.safe && SHADOW_MUSIC[z.id]) return SHADOW_MUSIC[z.id];
    return baseMood.call(this, x, y);
  };
}

// --- Felsen, Schmuck, Rand -----------------------------------------------------------------------------
if (typeof ROCK_STYLES !== 'undefined') {
  Object.assign(ROCK_STYLES, {
    mondfall: ['#56566e', '#74748e', null],
    daemmerwiesen: ['#4e5068', '#6c6e88', '#3a4a6a'],
    glimmlager: ['#3a3432', '#544c48', null],
    aschewald: ['#2e2a28', '#48403c', null],
    knochenlager: ['#b0aa98', '#d4cebc', null],
    knochenwueste: ['#a8a290', '#d0cab6', null],
    blutlager: ['#4a2a2a', '#6a3a38', null],
    blutsteppe: ['#3e2222', '#5e3432', null],
    nachtfrostlager: ['#4a5878', '#c8d4ec', null],
    nachtfrost: ['#3e4a6c', '#b8c8e8', null],
    nachtwacht: ['#3a3a4a', '#52526a', null],
    schattenklippen: ['#30303e', '#4a4a5e', null],
    schwarzmoor: ['#2e3a32', '#44544a', '#2e5a44']
  });
}
if (typeof DECO_COLORS !== 'undefined') {
  Object.assign(DECO_COLORS, {
    daemmerwiesen: { bush: '#2a3e5a', bushTop: '#4a6a8a', berry: '#c8b8ff', tuft: '#2e5a5e', moss: '#4a3a6a', cap: '#9a8aff', capDot: '#e0dcff', capGlow: true },
    aschewald: { wood: '#1e1816', cut: '#4a3a30', ring: '#2a201c', bone: '#c8c0b0', ember: '#ff7a2a', char: '#2a201a', glow: true, tuft: '#3a3230' },
    knochenwueste: { wood: '#c8c0ac', cut: '#e8e0cc', bone: '#f4ecd8', tuft: '#a8a090', thorn: true },
    blutsteppe: { wood: '#3a1a18', bone: '#e0d0c0', crystal: '#c82a3a', crystalBase: '#2a1012', glow: true, ember: '#ff3a4a', tuft: '#7a3430' },
    nachtfrost: { wood: '#3a3a4e', cut: '#a8b0c8', ring: '#5a6078', crystal: '#7a8aff', crystalBase: '#2e3658', snowy: true, tuft: '#5a6a8a' },
    schattenklippen: { wood: '#3a3440', bone: '#d8d4e0', crystal: '#9a8aff', crystalBase: '#24242e', glow: true, tuft: '#5a5a6a' },
    schwarzmoor: { wood: '#2a2a22', moss: '#2e5a44', cap: '#7ae0a8', capGlow: true, bone: '#c8c8b0', tuft: '#2e4a3a', bush: '#1e3a2e', bushTop: '#3a6a52' }
  });
}
if (typeof BORDER3 !== 'undefined') {
  Object.assign(BORDER3, {
    daemmerwiesen: { form: 'hecke', saum: [['tree', 'daemmerwiesen', 1.15]], far: '#2a3a5a' },
    aschewald: { form: 'tannen', saum: [['pine', 'aschewald', 1.3]], far: '#2a2220' },
    knochenwueste: { form: 'sandstein', saum: [['rock', 'knochenwueste', 2.2], ['dead', 'knochenwueste', 1.4, 4]], far: '#8a8678' },
    blutsteppe: { form: 'asche', saum: [['rock', 'blutsteppe', 2.1], ['dead', 'blutsteppe', 1.5, 3]], far: '#4a1a1e' },
    nachtfrost: { form: 'eis', saum: [['pine', 'nachtfrost', 1.25], ['rock', 'nachtfrost', 2.1, 3]], far: '#2e3a62' },
    schattenklippen: { form: 'basalt', saum: [['rock', 'schattenklippen', 2.1], ['dead', 'schattenklippen', 1.4, 4]], far: '#2e2e44' },
    schwarzmoor: { form: 'weiden', saum: [['rock', 'schwarzmoor', 2.0], ['tree', 'schwarzmoor', 1.2, 3]], far: '#1e3028' }
  });
  for (const id of ['daemmerwiesen', 'aschewald', 'knochenwueste', 'blutsteppe', 'nachtfrost', 'schattenklippen', 'schwarzmoor']) BORDER3[id].id = id;
}

// --- Bäume ---------------------------------------------------------------------------------------------
if (typeof WORLD3 !== 'undefined') {
  // Laubbaum: Dämmerwiesen mit nachtblauen und violetten Kronen und Mondfrüchten, Schwarzmoor mit dunklem Moosgrün
  const TREE_COLS = { daemmerwiesen: ['#2a3a62', '#3a4a7a', '#5a5a9a'], mondfall: ['#2a3a62', '#3a4a7a', '#5a5a9a'], schwarzmoor: ['#1e3a2e', '#2a4a3a', '#3e6a52'] };
  if (typeof TREE3_STYLED !== 'undefined') for (const id of Object.keys(TREE_COLS)) TREE3_STYLED.add(id);
  const baseTree = WORLD3.tree;
  WORLD3.tree = function (b, M, v, style) {
    const cols = TREE_COLS[style];
    if (!cols) return baseTree.call(this, b, M, v, style);
    const bark = style === 'schwarzmoor' ? '#2a2a20' : '#3a3040';
    b.add(lathe3('trunk', [[0.3, 0], [0.19, 0.14], [0.15, 0.7], [0.12, 1.3], [0, 1.34]], 8), bark, { parent: M, shade: 0.35 });
    b.add(limb3(0.6, 0.07, 0.05, 5), bark, { parent: M, p: [0.08, 1.0, 0], r: [0, 0, 2.2] });
    TREE_BLOBS[v].forEach(([x, y, r], k) => {
      const top = y < -36;
      b.add(top ? sphere3(1, 10, 7) : sphere3(1, 9, 6), top ? cols[2] : k % 2 ? cols[1] : cols[0], {
        parent: M, p: [x / 32 * 1.1, -y / 32 * 1.1 + 0.25, ((k * 37) % 7 - 3) * 0.09], s: (r / 32) * 1.35, shade: 0.35
      });
    });
    // Mondfrüchte (leuchtend) bzw. Moosfäden
    if (style === 'schwarzmoor') for (const [x, y] of [[0.35, 0.95], [-0.4, 1.1]]) b.add(limb3(0.4, 0.03, 0.015, 5), '#3e6a52', { parent: M, p: [x, y, 0.2] });
    else for (const [x, y, z] of [[-0.4, 1.7, 0.5], [0.35, 1.5, 0.55], [0.45, 2.05, 0.2]]) b.add(sphere3(0.07, 6, 5), '#c8c0ff', { parent: M, p: [x, y, z], mat: 'glow' });
  };
  // Tannen: verkohlt mit Glutnestern im Aschewald, mit bläulichem Nachtreif im Nachtfrost
  const basePine = WORLD3.pine;
  WORLD3.pine = function (b, M, v, style) {
    if (style !== 'aschewald' && style !== 'glimmlager' && style !== 'nachtfrost' && style !== 'nachtfrostlager') return basePine.call(this, b, M, v, style);
    const ash = style === 'aschewald' || style === 'glimmlager';
    b.add(lathe3('pinetrunk', [[0.18, 0], [0.13, 0.1], [0.1, 0.7], [0, 0.72]], 7), ash ? '#1a1412' : '#3a3044', { parent: M, shade: 0.3 });
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const r = (0.85 - k * (0.62 / tiers)) * (v === 1 ? 0.9 : 1) * (ash ? 0.82 : 1);
      const y = 0.35 + k * 0.42;
      const g = lathe3(`pinetier${r.toFixed(2)}`, [[0, -0.04], [r * 0.6, -0.02], [r, 0.06], [r * 0.95, 0.14], [r * 0.45, 0.48], [r * 0.12, 0.66], [0, 0.7]], 10);
      b.add(g, ash ? (k % 2 ? '#2a2422' : '#221c1a') : k % 2 ? '#1e3048' : '#1a2a40', { parent: M, p: [0, y, 0], r: [0, k * 0.7, 0], shade: 0.4 });
      if (!ash) b.add(lathe3(`pinesnow${r.toFixed(2)}`, [[0, 0.18], [r * 0.62, 0.2], [r * 0.5, 0.32], [r * 0.2, 0.55], [0, 0.71]], 10), '#c8d4f4', { parent: M, p: [0, y, 0] });
    }
    // Glutnester in der verkohlten Rinde
    if (ash) for (const [x, y, z] of [[0.12, 0.5, 0.1], [-0.1, 0.95, 0.12], [0.06, 1.4, -0.12]].slice(0, 2 + (v % 2))) b.add(sphere3(0.045, 6, 5), '#ff6a2a', { parent: M, p: [x, y, z], mat: 'glow' });
  };
  // tote Bäume: bleiches Gebein in der Knochenwüste, schwarzrot mit glimmenden Adern in der Blutsteppe, grauviolett an den Klippen
  const DEAD_BARK = { knochenwueste: '#d0c8b4', knochenlager: '#d0c8b4', blutsteppe: '#2a1012', blutlager: '#2a1012', schattenklippen: '#3a3446', nachtwacht: '#3a3446' };
  const baseDead = WORLD3.dead;
  WORLD3.dead = function (b, M, v, style) {
    const bark = DEAD_BARK[style];
    if (!bark) return baseDead.call(this, b, M, v, style);
    const m = v === 1 ? -1 : 1;
    b.add(lathe3('deadtrunk', [[0.24, 0], [0.15, 0.12], [0.1, 0.8], [0.05, 1.35], [0, 1.4]], 7), bark, { parent: M, shade: 0.3, r: [0, 0, 0.05 * m] });
    const br = [[0.5, 0.06, 0.04, [0, 0.5, 0], [0, 0, -1.0 * m]], [0.42, 0.05, 0.03, [0, 0.75, 0], [0, 0, 0.9 * m]], [0.36, 0.04, 0.025, [0, 1.0, 0], [0.4, 0, -0.5 * m]]];
    if (v === 2) br.push([0.3, 0.04, 0.025, [0, 0.3, 0], [0, 0, 1.1]]);
    for (const [len, r1, r2, p, r] of br) b.add(limb3(len, r1, r2, 5), bark, { parent: M, p, r: [r[0] + Math.PI, r[1], r[2]] });
    if (style === 'knochenwueste' || style === 'knochenlager') {
      // Gebein: Knoten wie Gelenke an den Astansätzen
      for (const y of [0.5, 0.75, 1.0]) b.add(sphere3(0.07, 6, 5), '#e8e0cc', { parent: M, p: [0, y, 0] });
    } else if (style === 'blutsteppe' || style === 'blutlager') {
      b.add(limb3(0.45, 0.03, 0.018, 5), '#ff3a4a', { parent: M, p: [0.02, 0.8, 0.12], mat: 'glow' });
    }
  };
}

// --- Monster -------------------------------------------------------------------------------------------
// Zeichnung eines Gegenstücks mit eigenen Farben: Die Zeichenfunktion des Gegenstücks läuft unverändert, nur die
// Farben ihrer Vorgaben (fur, belly, mane, skin, robe …) werden umgefärbt (tone: Zielfarbe und Anteil, dark: abdunkeln)
// und einzelne Vorgaben gesetzt (set: Augen, Zeichnung, Stacheln …). Das 3D-Modell entsteht wie bei allen Monstern
// aus denselben Vorgaben (captureArt in drei-figuren.js).
const HEX6 = /^#[0-9a-f]{6}$/i;
function shadowRecolor(o, look) {
  if (!o || typeof o !== 'object') return o;
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && HEX6.test(v)) {
      let c = look.tone ? mixColor(v, look.tone[0], look.tone[1]) : v;
      if (look.dark) c = darker(c, look.dark);
      out[k] = c;
    } else out[k] = v;
  }
  return Object.assign(out, look.set || {});
}
function shadowArt(twin, look) {
  const base = MONSTER_ART[twin];
  if (!base) return null;
  return {
    h: Math.round(base.h * (look.scale || 1)),
    draw(ctx, f) {
      // die Zeichenfunktionen kurz umleiten (wie captureArt): jeder Aufruf bekommt die umgefärbten Vorgaben
      const orig = {};
      for (const n of ART_FNS) if (typeof window[n] === 'function') orig[n] = window[n];
      const wrap = {};
      for (const n of Object.keys(orig)) {
        wrap[n] = (c, a, o) => {
          for (const m in orig) window[m] = orig[m];
          try {
            return n === 'villagerArt' ? orig[n](c, shadowRecolor(a, look), o) : orig[n](c, a, shadowRecolor(o, look));
          } finally {
            for (const m in wrap) window[m] = wrap[m];
          }
        };
      }
      for (const n in wrap) window[n] = wrap[n];
      try {
        if (look.scale && ctx.scale) ctx.scale(look.scale, look.scale);
        base.draw(ctx, f);
      } finally {
        for (const n in orig) window[n] = orig[n];
      }
    }
  };
}
// Farben je Schattenart: tone [Zielfarbe, Anteil], dark, set (feste Vorgaben)
const SHADOW_LOOKS = {
  aschehund: { tone: ['#3a3a40', 0.75], set: { eye: '#ff7a2a', glow: true, angry: true, ribs: true } },
  daemmerfuchs: { tone: ['#3a3e6a', 0.8], set: { tailTip: '#c8c8ff', eye: '#bfd0ff', glow: true } },
  nebelwolf: { tone: ['#7a8498', 0.6], set: { eye: '#bfe8ff', glow: true, angry: true } },
  nachtleitwolf: { tone: ['#1e1e2a', 0.7], set: { mane: '#4a4a7a', eye: '#9aa8ff', glow: true, scar: true } },
  nachthirsch: { tone: ['#2e2a40', 0.7] },
  schattenkeiler: { tone: ['#241e2a', 0.7] },
  aschenraeuber: { tone: ['#3a3634', 0.6], set: { belt: '#ff7a2a' } },
  russschuetze: { tone: ['#2e2e2a', 0.6] },
  glutkeiler: { tone: ['#241a16', 0.7] },
  aschespinne: { tone: ['#5a5652', 0.7], set: { mark: '#ff7a2a', eye: '#ffb04a' } },
  russluchs: { tone: ['#3a3634', 0.7], set: { spots: '#ff7a2a', eye: '#ffb04a', glow: true } },
  kohlenbaer: { tone: ['#161212', 0.85], set: { eye: '#ff6a2a', glow: true, angry: true } },
  beinbrecher: { tone: ['#9a9c86', 0.55], set: { runes: '#e8e0c8' } },
  aashyaene: { tone: ['#8a8478', 0.55], set: { eye: '#e8e0c8', glow: true } },
  knochenruferin: { tone: ['#6a6a7a', 0.55], set: { runes: '#e8e0c8' } },
  bleichskorpion: { tone: ['#d8d0b8', 0.75], set: { sting: '#8a7aff' } },
  knochenhauptmann: { tone: ['#5a5e4e', 0.55], set: { pauldron: '#d8d0b8', runes: '#e8e0c8' } },
  blutoger: { tone: ['#4a2220', 0.75], set: { runes: '#ff3a4a' } },
  steppenwarg: { tone: ['#4a2420', 0.65], set: { eye: '#ff4a3a', glow: true } },
  blutdaemon: { tone: ['#5a0e1a', 0.6], set: { runes: '#ff3a4a', wings: '#2a0408' } },
  blutmaul: { tone: ['#2a0c0e', 0.65], set: { mane: '#c8202a', eye: '#ff6a6a', glow: true } },
  mitternachtswolf: { tone: ['#2e3a62', 0.7], set: { ruff: '#8a9ad8', eye: '#9ab0ff', glow: true } },
  nachtbaer: { tone: ['#3a4462', 0.7], set: { eye: '#9ab0ff', glow: true } },
  dunkelyeti: { tone: ['#4a5470', 0.65], set: { runes: '#9ab0ff' } },
  nachtmammut: { tone: ['#2e2a40', 0.7] },
  frostgespenst: { tone: ['#6a7ad8', 0.55], set: { crown: '#2e3a8a', eye: '#ffffff' } },
  klippenviper: { tone: ['#5a5a6a', 0.6], set: { eye: '#c8b8ff' } },
  klippenschakal: { tone: ['#4a4656', 0.6], set: { eye: '#c8b8ff', glow: true } },
  nachtrassler: { tone: ['#3e3650', 0.6], set: { eye: '#c8b8ff' } },
  schattenkobra: { tone: ['#1e1a28', 0.65], set: { hood: '#6a5a9a', eye: '#d8ccff' } },
  moorpython: { tone: ['#24301e', 0.6], set: { eye: '#7ae0a8' } },
  nebelpanther: { tone: ['#5a6070', 0.6], set: { spots: '#2a2e3a', eye: '#bfe8ff', glow: true } },
  moornaga: { tone: ['#1e3a30', 0.6], set: { eye: '#7ae0a8' } },
  moorseherin: { tone: ['#2e2040', 0.6], set: { eye: '#7ae0a8' } }
};
for (const [id, look] of Object.entries(SHADOW_LOOKS)) {
  const t = MONSTER_TYPES[id];
  const art = t && shadowArt(t.twin, look);
  if (art) MONSTER_ART[id] = art;
}
// Endbosse und alle, die wie eine dieser Arten aussehen (figuren.js kannte sie beim Laden noch nicht)
for (const [id, t] of Object.entries(MONSTER_TYPES)) {
  if (t.raid && SHADOW_LOOKS[t.raid.art]) MONSTER_ART[id] = MONSTER_ART[t.raid.art];
}

// 3D: eigene Tiermodelle (Keiler, Hirsch, Mammut) in den Farben der Nacht
if (typeof MON3_BUILD !== 'undefined') {
  Object.assign(MON3_BUILD, {
    schattenkeiler: (b) => boar3(b, { fur: '#2a2430', belly: '#3e3648', bristle: '#14101a', snout: '#6a5a7a', eye: '#9aa8ff', tusk: '#d8d4e8' }),
    glutkeiler: (b) => boar3(b, { fur: '#2a201c', belly: '#3a2e28', bristle: '#140e0c', snout: '#5a4a40', eye: '#ffb04a', thorns: '#ff6a2a', moss: '#3a2a20', tusk: '#e0d4c0' }),
    nachthirsch: (b) => deer3(b, { fur: '#34304a', mane: '#221e32', antler: '#d8d4ff', glowTips: '#c8c0ff', eye: '#bfd0ff' }),
    nachtmammut: (b) => mammoth3(b, { fur: '#2e2a40', shag: '#1e1a2e', eye: '#9ab0ff' })
  });
}
// Köpfe der Menschenartigen in 3D (Kapuzen, Masken, Helme, Hörner) in eigenen Farben
if (typeof HEAD3 !== 'undefined') {
  Object.assign(HEAD3, {
    aschenraeuber: { hood: '#2a2622', mask: '#ff7a2a' },
    russschuetze: { hood: '#22221e', mask: '#c8502a', quiver: '#3a2a1e' },
    beinbrecher: { orc: true, band: '#d8d0b8' },
    knochenruferin: { orc: true, feathers: ['#e8e0c8', '#6a6a7a', '#3a3a4a'] },
    knochenhauptmann: { orc: true, helmet: '#d8d0b8', horns: '#e8e0cc' },
    blutoger: { horn1: '#2a1012', tusks: true, brow: true },
    blutdaemon: { horns: '#140406', ears: true, flame: '#ff3a4a' },
    dunkelyeti: { fur: true, brow: true }
  });
}
// 3D-Zubehör der Gegenstücke, wo die Schattenart etwas anderes trägt
if (typeof MON3_LOOK !== 'undefined') {
  Object.assign(MON3_LOOK, {
    aschehund: { ribs: true },
    nebelwolf: {},
    aschespinne: { venom: '#ff7a2a' },
    blutmaul: {},
    frostgespenst: { snow: true, iceFingers: '#c8d0ff' },
    moorseherin: { crownHorns: false, hoodCrown: 1 },
    moornaga: { crownHorns: false }
  });
}
// Gebietsthema der 3D-Modelle (Zubehör auf Rücken und Schultern): Asche, Knochen, Blut, Frost, Moor
if (typeof MON3_THEMES !== 'undefined') {
  MON3_THEMES.nacht = { spike: '#2a2a44', glow: '#9aa8ff', acc: 'spark' };
  MON3_THEMES.blut = { spike: '#2a0c10', glow: '#ff3a4a', hot: true, acc: 'ash' };
  Object.assign(MON3_ZONE_THEME, {
    daemmerwiesen: 'nacht', aschewald: 'hell', knochenwueste: 'desert', blutsteppe: 'blut', nachtfrost: 'frost', schattenklippen: 'nacht', schwarzmoor: 'rot',
    raid_skarn: 'nacht', raid_brakkur: 'hell', raid_vharok: 'desert', raid_sereth: 'blut', raid_nachtriese: 'frost', raid_moormutter: 'rot'
  });
  if (typeof mon3ThemeOf !== 'undefined' && mon3ThemeOf) mon3ThemeOf = null;
}
// Stimme wie das Gegenstück
if (typeof VOICE_OF !== 'undefined') {
  for (const id of Object.keys(SHADOW_TWIN_OF).map((k) => SHADOW_TWIN_OF[k])) {
    const twin = MONSTER_TYPES[id].twin;
    let v = VOICE_OF[twin];
    if (!v && typeof VOICE_OF_NAME !== 'undefined') for (const [re, n] of VOICE_OF_NAME) if (re.test(twin)) { v = n; break; }
    if (v) VOICE_OF[id] = v;
  }
}
