// Stadtschmuck und Stadtleute (seit 14.87)
// 1. Stadtleute aufgewertet: Jede Rolle bekommt Ausrüstungsteile, die der Figurenbau (humanoid3) schon kennt –
//    Umhänge mit Saum (capeTier), Schulterstücke, Kragen, Brustplatten, Stiefelbeschläge, Armreifen, Gürteltaschen,
//    Edelsteine am Kragen. So sieht jede Rolle nach ihrem Beruf aus (Schmied mit Lederschurz und Armschienen,
//    Waffenhändler in Halbrüstung, Wegweiserin mit Sternenumhang …). Wird über npcModelDef eingehängt.
// 2. Neuer Schmuck in jeder Stadt: Statuen auf Sockeln (Held mit Schwert, Weise mit leuchtender Kugel) und ein
//    Zierbrunnen mit Schale und Wasserspiel. Material und Farben je Map (STADT_LOOK): weißer Marmor in Kazehana,
//    Sandstein in Sahra, Eis im Frostgipfel, Basalt mit Lava im Feuerberg, Kristall in Lichtwacht, dunkler Stein mit
//    leuchtendem Wasser auf der Schattenseite. Kein Schmuck am Boden (keine Kreise oder Runen).
//    Platz: feste Kandidaten um die Stadtmitte, der erste freie gewinnt (rgFreeAt aus ratgeber.js plus eigene
//    Abstände) – alle Mitspieler sehen dieselben Stellen. Ohne Kollision wie der übrige Stadtschmuck.

// --- 1. Stadtleute -----------------------------------------------------------------------------------------------
const NPC_PLUS = {
  aeltester: { capelet: '#5a2a6a', cape: '#5a2a6a', capeTier: 3, lining: '#e0c36a', capeTrim: '#e0c36a', highCollar: true, collar: '#e0c36a', accent: '#9fd0ff', bootTrim: '#c9a35a', weapon: { kind: 'staff', tier: 6 } },
  haendler: { capelet: '#8a4a9a', pads: '#8a4a9a', padTrim: '#e8c46a', padStyle: 'cloth', earrings: '#e8c46a', pouch: '#c9a35a', bootTrim: '#c9a35a', armBands: '#e8c46a', highCollar: true, accent: '#ffd34d' },
  schmied: { bracer: '#6a6e76', gauntlets: '#5a5e66', pads: '#5a5e66', padStyle: 'leather', kneePads: '#4a3a2a', bootDetail: 2, bootTrim: '#8a8e96', wideBelt: true, buckle: '#9aa1a8', pouch: '#4a3020', weapon: { kind: 'club', tier: 4 } },
  waffen: { pads: '#8f98a3', padTrim: '#c8402f', padStyle: 'plate', padBig: true, cuirass: '#8a929c', cuirassRim: '#c9a35a', greaves: '#7a828c', bootTrim: '#c9a35a', cape: '#8a2a20', capeTier: 2, lining: '#3a1210', weapon: { kind: 'sword', tier: 6 } },
  ruestung: { pads: '#9aa2ac', padTrim: '#c9a35a', padStyle: 'plate', padBig: true, cuirass: '#9aa2ac', cuirassRim: '#c9a35a', gauntlets: '#8a929c', kneePads: '#8a929c', bootDetail: 3, bootTrim: '#c9a35a', tassets: '#8a929c', tassetRim: '#c9a35a', shield: 5 },
  lehrmeister: { capelet: '#2a3a6a', pads: '#2a3a6a', padTrim: '#c9a35a', padStyle: 'cloth', cape: '#2a3a6a', capeTier: 4, lining: '#c9a35a', capeTrim: '#c9a35a', highCollar: true, collar: '#c9a35a', accent: '#7fe0ff', robeShine: 0.2, weapon: { kind: 'staff', tier: 5 } },
  teleport: { capelet: '#1e2a5a', pads: '#1e2a5a', padTrim: '#9fd0ff', padStyle: 'cloth', cape: '#1e2a5a', capeTier: 5, lining: '#7fb8ff', capeTrim: '#9fd0ff', highCollar: true, collar: '#9fd0ff', accent: '#bfe8ff', earrings: '#9fd0ff', runes: '#7fd0ff' },
  alchemist: { capelet: '#3a2a4a', scarf: '#6a8a3a', pouch: '#6a8a3a', bracer: '#c9a35a', necklace: true, runes: '#9aff7a' },
  lager: { furCollar: '#8a6a44', pads: '#6b4a2e', padStyle: 'leather', wideBelt: true, buckle: '#c9a35a', pouch: '#5a3a22', bootDetail: 1, kneePads: '#5a3a22' },
  jaegerin: { capelet: '#3e5a2e', furCollar: '#8a6a44', pads: '#5a4030', padStyle: 'leather', bracer: '#6b4a2e', crossStraps: true, kneePads: '#4a3a2a', bootDetail: 1, weapon: { kind: 'bow', tier: 4 } },
  stallmeister: { scarf: '#9a3a2a', pads: '#6b4a2e', padStyle: 'leather', bracer: '#6b4a2e', bootDetail: 2, bootTrim: '#c9a35a', kneePads: '#5a3a22' },
  bogenmacher: { capelet: '#4a5a2a', pads: '#5a4030', padStyle: 'leather', bracer: '#6b4a2e', armBands: '#c9a35a', scarf: '#c8a060' },
  post: { capelet: '#2f4a7a', pouch: '#6b4a2e', crossStraps: true, straps: '#6b4a2e', bootTrim: '#c9a35a' },
  auktion: { capelet: '#6a1a2a', pads: '#6a1a2a', padTrim: '#e0c36a', padStyle: 'cloth', cape: '#6a1a2a', capeTier: 3, lining: '#e0c36a', capeTrim: '#e0c36a', highCollar: true, collar: '#e0c36a', accent: '#ffd34d', earrings: '#e8c46a' },
  arena: { pads: '#a8b0b8', padTrim: '#e0c36a', padStyle: 'plate', padBig: true, cuirass: '#a8b0b8', cuirassRim: '#e0c36a', cape: '#a82a20', capeTier: 4, lining: '#3a0e0a', gauntlets: '#8a929c', greaves: '#8a929c', bootTrim: '#e0c36a' },
  pvp: { pads: '#3a3e46', padTrim: '#c8402f', padStyle: 'plate', padBig: true, cuirass: '#4a4e58', cuirassRim: '#c8402f', cape: '#2a2a3a', capeTier: 5, lining: '#8a1a1a', capeTrim: '#c8402f', gauntlets: '#3a3e46', greaves: '#3a3e46' },
  wache: { pads: '#7a828c', padTrim: '#c9a35a', padStyle: 'plate', cape: '#6a2a24', capeTier: 1, lining: '#2a1210', gauntlets: '#7a828c', greaves: '#7a828c', bootTrim: '#c9a35a' },
  moench: { scarf: '#c8702a', bracer: '#7a3a2a', wraps: '#efe6cc' },
  ratgeber: { capelet: '#1e4a5e', cape: '#1e4a5e', capeTier: 3, lining: '#e0c36a', capeTrim: '#e0c36a', highCollar: true, accent: '#7fd6ff' },
  wandler: { capelet: '#2a1a3a', pads: '#2a1a3a', padTrim: '#7fe0d0', padStyle: 'cloth', cape: '#2a1a3a', capeTier: 5, lining: '#7fe0d0', capeTrim: '#7fe0d0', highCollar: true, collar: '#7fe0d0', accent: '#7fe0d0', runes: '#7fe0d0' }
};
if (typeof npcModelDef === 'function') {
  const _spNpcModelDef = npcModelDef;
  npcModelDef = function (id) {
    const c = _spNpcModelDef(id);
    if (c && NPC_PLUS[id]) Object.assign(c, NPC_PLUS[id]);
    return c;
  };
}

// --- 2. Statuen und Zierbrunnen ----------------------------------------------------------------------------------
// je Map: stone (Stein), dark (Sockel unten), accent (Beschläge), liquid (Wasser), glow (Wasser leuchtet),
// orb (Kugel der Weisen)
const STADT_LOOK = {
  1: { stone: '#ece6d8', dark: '#b8b0a0', accent: '#d8b04a', liquid: '#4a9ad0', orb: '#9fe8ff' },
  2: { stone: '#e0bc84', dark: '#b08a58', accent: '#3ac0b0', liquid: '#3ab8c8', orb: '#7ff0e0' },
  3: { stone: '#9a9aa2', dark: '#6a6a72', accent: '#b8803a', liquid: '#4a8ab8', orb: '#9fd0ff' },
  4: { stone: '#9aa48a', dark: '#6a7a5a', accent: '#a8803a', liquid: '#3a8a8a', orb: '#a8ffb0' },
  5: { stone: '#c8865a', dark: '#8a5a3a', accent: '#d8a04a', liquid: '#4a90b8', orb: '#ffcf7a' },
  6: { stone: '#a49c92', dark: '#6e6860', accent: '#8a8e96', liquid: '#5a8aa8', orb: '#ff9a6a' },
  7: { stone: '#e4eef6', dark: '#a8bcd0', accent: '#a8c8e8', liquid: '#8fd8ff', glow: true, orb: '#cfefff' },
  8: { stone: '#7a8274', dark: '#4a5248', accent: '#8aa86a', liquid: '#7aff9a', glow: true, orb: '#9affb8' },
  9: { stone: '#4a4240', dark: '#2a2422', accent: '#e8a03a', liquid: '#ff7a2a', glow: true, orb: '#ffb04a' },
  10: { stone: '#dcd8f4', dark: '#9a94c0', accent: '#b8a8ff', liquid: '#b89aff', glow: true, orb: '#e0d4ff' },
  11: { stone: '#a8acc8', dark: '#6a6e8a', accent: '#c8ccec', liquid: '#9a8aff', glow: true, orb: '#c8b8ff' },
  12: { stone: '#6a605a', dark: '#3a3430', accent: '#d8703a', liquid: '#ff8a4a', glow: true, orb: '#ff9a5a' },
  13: { stone: '#e2d6b8', dark: '#a89a78', accent: '#a8803a', liquid: '#4a9aa8', orb: '#ffe0a0' },
  14: { stone: '#7a4642', dark: '#4a2624', accent: '#d8a04a', liquid: '#e8324a', glow: true, orb: '#ff6a7a' },
  15: { stone: '#98aac8', dark: '#5a6a8a', accent: '#c8d8f0', liquid: '#7ab8ff', glow: true, orb: '#bfe0ff' },
  16: { stone: '#5a6068', dark: '#363a40', accent: '#5ae0c0', liquid: '#4af0c8', glow: true, orb: '#8affe0' }
};
const stadtLook = (id) => STADT_LOOK[id] || STADT_LOOK[1];
const spRoof = (L, v) => [L.stone, L.dark, L.accent, L.liquid, L.glow ? 1 : 0, L.orb, v || ''].join('|');
const spParse = (roof) => {
  const [stone, dark, accent, liquid, glow, orb, v] = String(roof || '').split('|');
  return { stone: stone || '#ece6d8', dark: dark || '#b8b0a0', accent: accent || '#d8b04a', liquid: liquid || '#4a9ad0', glow: glow === '1', orb: orb || '#9fe8ff', v: v || 'held' };
};

// Sockel: drei Stufen, Block mit Rahmen und Inschrifttafel vorn, Kugeln an den Ecken; Oberkante bei y = 1.3
function spPlinth(b, M, L) {
  b.add(wbox(1.56, 0.2, 1.56, 0.06), L.dark, { parent: M, p: [0, 0.1, 0], shade: 0.3 });
  b.add(wbox(1.3, 0.18, 1.3, 0.05), darker(L.stone, 0.08), { parent: M, p: [0, 0.29, 0], shade: 0.2 });
  b.add(wbox(1.0, 0.72, 1.0, 0.05), L.stone, { parent: M, p: [0, 0.74, 0], shade: 0.25 });
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    b.add(wbox(0.12, 0.72, 0.12, 0.03), darker(L.stone, 0.1), { parent: M, p: [x, 0.74, z] });
    b.add(sphere3(0.08, 10, 8), L.accent, { parent: M, p: [x, 1.26, z], shine: 0.9 });
  }
  b.add(wbox(1.14, 0.12, 1.14, 0.04), darker(L.stone, 0.06), { parent: M, p: [0, 1.16, 0], top: lighter(L.stone, 0.1), topK: 0.5 });
  for (const z of [0.51, -0.51]) {
    b.add(wbox(0.46, 0.28, 0.03, 0.02), L.accent, { parent: M, p: [0, 0.76, z], shine: 1 });
    b.add(wbox(0.38, 0.2, 0.035, 0.015), darker(L.accent, 0.35), { parent: M, p: [0, 0.76, z] });
    for (const dy of [-0.04, 0.04]) b.add(tinyBox(0.26, 0.018, 0.04), lighter(L.accent, 0.2), { parent: M, p: [0, 0.76 + dy, z], mat: 'detail' });
  }
}

// Held: Rüstung mit Umhang, beide Hände auf dem Knauf eines vor ihm aufgestellten Großschwerts, Helm mit Kamm
function spHero(b, M, L) {
  const y0 = 1.22;
  const S = L.stone;
  const sh = darker(S, 0.12);
  // Beine und Stiefel
  for (const sx of [-1, 1]) {
    b.add(wbox(0.14, 0.12, 0.24, 0.04), sh, { parent: M, p: [sx * 0.11, y0 + 0.06, 0.03] });
    b.add(limb3(0.5, 0.075, 0.065, 9), S, { parent: M, p: [sx * 0.11, y0 + 0.6, 0] });
    b.add(sphere3(0.08, 10, 8), lighter(S, 0.05), { parent: M, p: [sx * 0.11, y0 + 0.36, 0.05], s: [1, 1, 0.8], shine: 0.4 });
  }
  // Waffenrock und Gürtel
  b.add(lathe3('spTabard', [[0, 0], [0.27, 0], [0.25, 0.12], [0.22, 0.3], [0, 0.31]], 16), sh, { parent: M, p: [0, y0 + 0.36, 0], s: [1, 1, 0.8], shade: 0.2 });
  b.add(new THREE.TorusGeometry(0.2, 0.035, 6, 18).rotateX(Math.PI / 2), L.accent, { parent: M, p: [0, y0 + 0.66, 0], s: [1, 0.8, 1], shine: 0.9 });
  // Brustpanzer
  b.add(lathe3('spChest', [[0.19, 0], [0.24, 0.12], [0.25, 0.28], [0.22, 0.4], [0.12, 0.47], [0, 0.48]], 16), S, { parent: M, p: [0, y0 + 0.66, 0], s: [1, 1, 0.78], shade: 0.15, shine: 0.35 });
  b.add(wbox(0.05, 0.3, 0.04, 0.015), lighter(S, 0.12), { parent: M, p: [0, y0 + 0.88, 0.19], shine: 0.6 });
  // Umhang hinten, leicht ausgestellt
  b.add(wbox(0.5, 1.0, 0.06, 0.03), darker(S, 0.2), { parent: M, p: [0, y0 + 0.62, -0.2], r: [-0.12, 0, 0], shade: 0.35 });
  b.add(wbox(0.6, 0.12, 0.08, 0.03), darker(S, 0.2), { parent: M, p: [0, y0 + 0.14, -0.27], r: [-0.12, 0, 0] });
  // Schulterstücke
  for (const sx of [-1, 1]) {
    b.add(cap3(0.15, Math.PI * 0.55, 0, Math.PI * 2, 14, 7), S, { parent: M, p: [sx * 0.29, y0 + 1.04, 0], s: [1.15, 0.9, 1], shine: 0.5, top: lighter(S, 0.15), topK: 0.4 });
    b.add(new THREE.TorusGeometry(0.15, 0.02, 5, 14).rotateX(Math.PI / 2), L.accent, { parent: M, p: [sx * 0.29, y0 + 1.04, 0], s: [1.15, 1, 1], shine: 1 });
  }
  // Arme zur Mitte, Hände auf dem Knauf
  for (const sx of [-1, 1]) {
    stick3(b, [sx * 0.29, y0 + 0.98, 0], [sx * 0.2, y0 + 0.74, 0.12], 0.07, 0.06, S, { parent: M, round: true });
    stick3(b, [sx * 0.2, y0 + 0.74, 0.12], [sx * 0.05, y0 + 0.66, 0.3], 0.06, 0.055, S, { parent: M, round: true });
    b.add(sphere3(0.065, 10, 8), lighter(S, 0.05), { parent: M, p: [sx * 0.045, y0 + 0.66, 0.31] });
  }
  // Großschwert: Klinge mit Spitze am Sockel, Parierstange, Griff, Knauf
  b.add(wbox(0.1, 0.62, 0.025, 0.01), lighter(S, 0.12), { parent: M, p: [0, y0 + 0.22, 0.34], shine: 0.9 });
  b.add(horn3(0.12, 0.05, 4), lighter(S, 0.12), { parent: M, p: [0, y0 - 0.09, 0.34], r: [Math.PI, Math.PI / 4, 0], s: [1, 1, 0.3] });
  b.add(wbox(0.38, 0.05, 0.06, 0.02), L.accent, { parent: M, p: [0, y0 + 0.55, 0.32], shine: 1 });
  b.add(cyl3(0.03, 0.03, 0.14, 8), darker(S, 0.15), { parent: M, p: [0, y0 + 0.63, 0.31] });
  b.add(sphere3(0.045, 10, 8), L.accent, { parent: M, p: [0, y0 + 0.72, 0.31], shine: 1 });
  // Hals, Kopf mit Helm und Kamm
  b.add(cyl3(0.07, 0.08, 0.08, 10), S, { parent: M, p: [0, y0 + 1.15, 0] });
  b.add(sphere3(0.15, 14, 11), S, { parent: M, p: [0, y0 + 1.3, 0.01] });
  b.add(cap3(0.165, Math.PI * 0.5, 0, Math.PI * 2, 16, 8), lighter(S, 0.05), { parent: M, p: [0, y0 + 1.31, 0], shine: 0.5 });
  b.add(new THREE.TorusGeometry(0.165, 0.018, 5, 18).rotateX(Math.PI / 2), L.accent, { parent: M, p: [0, y0 + 1.31, 0], shine: 1 });
  b.add(wbox(0.035, 0.12, 0.3, 0.015), L.accent, { parent: M, p: [0, y0 + 1.48, -0.02], shine: 1 });
  b.add(wbox(0.03, 0.09, 0.03, 0.01), darker(S, 0.2), { parent: M, p: [0, y0 + 1.27, 0.15] });
}

// Weise: lange Robe mit Saum, Kapuze, hält eine leuchtende Kugel hoch; ein Buch unter dem Arm
function spSage(b, M, L) {
  const y0 = 1.22;
  const S = L.stone;
  const sh = darker(S, 0.12);
  b.add(lathe3('spRobe', [[0, 0], [0.33, 0], [0.34, 0.04], [0.29, 0.3], [0.24, 0.62], [0.22, 0.9], [0.17, 1.02], [0, 1.03]], 18), S, { parent: M, p: [0, y0, 0], s: [1, 1, 0.85], shade: 0.25 });
  b.add(new THREE.TorusGeometry(0.335, 0.025, 5, 20).rotateX(Math.PI / 2), L.accent, { parent: M, p: [0, y0 + 0.04, 0], s: [1, 0.85, 1], shine: 1 });
  b.add(new THREE.TorusGeometry(0.25, 0.03, 5, 18).rotateX(Math.PI / 2), L.accent, { parent: M, p: [0, y0 + 0.58, 0], s: [1, 0.85, 1], shine: 0.9 });
  // Schärpe vorn
  b.add(wbox(0.1, 0.5, 0.03, 0.012), L.accent, { parent: M, p: [0, y0 + 0.3, 0.27], r: [-0.12, 0, 0], shine: 0.8 });
  // Kragen und Kapuze
  b.add(new THREE.TorusGeometry(0.17, 0.05, 6, 16).rotateX(Math.PI / 2 - 0.2), sh, { parent: M, p: [0, y0 + 1.02, 0] });
  b.add(sphere3(0.14, 14, 11), S, { parent: M, p: [0, y0 + 1.17, 0.02] });
  b.add(cap3(0.19, Math.PI * 0.62, 0, Math.PI * 2, 16, 8), sh, { parent: M, p: [0, y0 + 1.17, -0.02], s: [1, 1.15, 1.05], shade: 0.2 });
  b.add(wbox(0.03, 0.08, 0.03, 0.01), darker(S, 0.25), { parent: M, p: [0, y0 + 1.14, 0.15] });
  // rechter Arm hoch mit Kugel, linker Arm hält ein Buch
  stick3(b, [0.22, y0 + 0.92, 0], [0.32, y0 + 1.2, 0.08], 0.075, 0.065, S, { parent: M, round: true });
  stick3(b, [0.32, y0 + 1.2, 0.08], [0.3, y0 + 1.45, 0.12], 0.065, 0.06, S, { parent: M, round: true });
  b.add(lathe3('spOrbCup', [[0, 0], [0.06, 0.02], [0.1, 0.07], [0.09, 0.08], [0, 0.04]], 12), L.accent, { parent: M, p: [0.3, y0 + 1.47, 0.12], shine: 1 });
  b.add(sphere3(0.12, 16, 12), L.orb, { parent: M, p: [0.3, y0 + 1.62, 0.12], mat: 'glow' });
  b.add(sphere3(0.065, 12, 9), '#ffffff', { parent: M, p: [0.3, y0 + 1.62, 0.12], mat: 'glow' });
  stick3(b, [-0.22, y0 + 0.92, 0], [-0.26, y0 + 0.66, 0.1], 0.075, 0.065, S, { parent: M, round: true });
  stick3(b, [-0.26, y0 + 0.66, 0.1], [-0.1, y0 + 0.6, 0.24], 0.065, 0.06, S, { parent: M, round: true });
  b.add(wbox(0.26, 0.34, 0.08, 0.02), sh, { parent: M, p: [-0.15, y0 + 0.62, 0.24], r: [0, 0.4, 0.1] });
  b.add(wbox(0.2, 0.28, 0.02, 0.01), L.accent, { parent: M, p: [-0.14, y0 + 0.62, 0.285], r: [0, 0.4, 0.1], shine: 0.9 });
}

// Zierbrunnen: achteckiges Becken mit Rand, Mittelsäule, zwei Schalen übereinander, oben eine Knospe; aus jeder
// Schale fallen Wasserbänder ins Becken darunter
function spFountain(b, M, L) {
  const S = L.stone;
  const wMat = L.glow ? { mat: 'glow' } : { shine: 0.9 };
  const water = L.glow ? darker(L.liquid, 0.15) : L.liquid;
  b.add(lathe3('spBasin', [[0, 0], [1.3, 0], [1.34, 0.06], [1.36, 0.36], [1.26, 0.42], [1.18, 0.38], [1.18, 0.12], [0, 0.12]], 8), S, { parent: M, r: [0, Math.PI / 8, 0], shade: 0.3, top: lighter(S, 0.1), topK: 0.5 });
  b.add(new THREE.CircleGeometry(1.19, 24).rotateX(-Math.PI / 2), water, Object.assign({ parent: M, p: [0, 0.31, 0] }, wMat));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    b.add(sphere3(0.07, 8, 6), L.accent, { parent: M, p: [Math.cos(a) * 1.3, 0.44, Math.sin(a) * 1.3], shine: 0.9 });
  }
  b.add(lathe3('spColumn', [[0.26, 0], [0.2, 0.12], [0.15, 0.3], [0.13, 0.7], [0.17, 0.85], [0, 0.86]], 14), S, { parent: M, p: [0, 0.3, 0], shade: 0.2 });
  // untere Schale
  b.add(lathe3('spBowl1', [[0.12, 0], [0.5, 0.14], [0.66, 0.24], [0.68, 0.3], [0.6, 0.3], [0.1, 0.12], [0, 0.12]], 18), S, { parent: M, p: [0, 1.02, 0], shade: 0.2, top: lighter(S, 0.12), topK: 0.5 });
  b.add(new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2), water, Object.assign({ parent: M, p: [0, 1.29, 0] }, wMat));
  b.add(new THREE.TorusGeometry(0.67, 0.02, 4, 24).rotateX(Math.PI / 2), L.accent, { parent: M, p: [0, 1.31, 0], shine: 1 });
  // obere Schale
  b.add(lathe3('spColumn2', [[0.1, 0], [0.08, 0.3], [0.11, 0.38], [0, 0.39]], 10), S, { parent: M, p: [0, 1.3, 0] });
  b.add(lathe3('spBowl2', [[0.06, 0], [0.28, 0.08], [0.36, 0.15], [0.37, 0.19], [0.32, 0.19], [0.06, 0.08], [0, 0.08]], 16), S, { parent: M, p: [0, 1.66, 0], top: lighter(S, 0.12), topK: 0.5 });
  b.add(new THREE.CircleGeometry(0.32, 16).rotateX(-Math.PI / 2), water, Object.assign({ parent: M, p: [0, 1.83, 0] }, wMat));
  b.add(lathe3('spBud', [[0, 0], [0.07, 0.04], [0.08, 0.12], [0.04, 0.22], [0, 0.26]], 10), L.accent, { parent: M, p: [0, 1.84, 0], shine: 1 });
  // Wasserbänder (dünn, leicht nach außen geneigt), aus jeder Schale vier
  const fall = L.glow ? L.liquid : lighter(L.liquid, 0.35);
  const fMat = { mat: 'glow' };
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(a), s = Math.sin(a);
    stick3(b, [c * 0.36, 1.84, s * 0.36], [c * 0.5, 1.3, s * 0.5], 0.03, 0.045, fall, Object.assign({ parent: M }, fMat));
    stick3(b, [c * 0.67, 1.3, s * 0.67], [c * 0.9, 0.32, s * 0.9], 0.035, 0.06, fall, Object.assign({ parent: M }, fMat));
  }
}

if (typeof PROP3 !== 'undefined') {
  PROP3.statue = (b, M, pr) => {
    const L = spParse(pr.roof);
    spPlinth(b, M, L);
    if (L.v === 'weise') spSage(b, M, L); else spHero(b, M, L);
  };
  PROP3.zierbrunnen = (b, M, pr) => spFountain(b, M, spParse(pr.roof));
}
if (typeof PROP_CASTER3 !== 'undefined') {
  PROP_CASTER3.statue = [1.4, 0.75, 0.35];
  PROP_CASTER3.zierbrunnen = [1.0, 1.3, 0.4];
}

// 2D: dieselben Formen als Zeichnung (Ursprung am Fuß)
if (typeof PROP_ART !== 'undefined') {
  PROP_ART.statue = (ctx, pr) => {
    const L = spParse(pr.roof);
    box(ctx, -22, -8, 44, 8, 2, L.dark);
    box(ctx, -18, -14, 36, 7, 2, darker(L.stone, 0.08));
    box(ctx, -14, -38, 28, 25, 2, L.stone);
    box(ctx, -7, -31, 14, 9, 1, L.accent);
    box(ctx, -16, -41, 32, 4, 1.5, darker(L.stone, 0.06));
    if (L.v === 'weise') {
      poly(ctx, [[-11, -41], [11, -41], [7, -70], [-7, -70]], L.stone);
      box(ctx, -9, -44, 18, 2, 1, L.accent);
      oval(ctx, 0, -75, 7, 7, darker(L.stone, 0.1));
      stroke(ctx, L.stone, 4, [[7, -66], [12, -82]]);
      oval(ctx, 12, -88, 5, 5, L.orb);
      oval(ctx, 12, -88, 2.5, 2.5, '#ffffff');
    } else {
      box(ctx, -10, -60, 20, 20, 3, darker(L.stone, 0.12));
      box(ctx, -11, -76, 22, 17, 4, L.stone);
      for (const x of [-13, 13]) oval(ctx, x, -73, 5, 4, L.stone);
      oval(ctx, 0, -82, 6.5, 6.5, L.stone);
      box(ctx, -1, -91, 2, 6, 1, L.accent);
      box(ctx, -1.5, -62, 3, 22, 1, lighter(L.stone, 0.12));
      box(ctx, -6, -63, 12, 2.5, 1, L.accent);
    }
  };
  PROP_ART.zierbrunnen = (ctx, pr) => {
    const L = spParse(pr.roof);
    oval(ctx, 0, -6, 34, 12, L.stone);
    oval(ctx, 0, -8, 29, 9, L.liquid);
    box(ctx, -4, -34, 8, 26, 2, L.stone);
    oval(ctx, 0, -34, 17, 5, L.stone);
    oval(ctx, 0, -35, 14, 3.5, L.liquid);
    box(ctx, -2.5, -48, 5, 13, 1, L.stone);
    oval(ctx, 0, -48, 9, 3, L.stone);
    oval(ctx, 0, -52, 3, 4, L.accent);
    for (const x of [-12, 12]) stroke(ctx, lighter(L.liquid, 0.3), 1.5, [[x * 0.9, -33], [x * 1.6, -10]]);
  };
  if (typeof PROP_BOUNDS !== 'undefined') Object.assign(PROP_BOUNDS, {
    statue: { x: -26, y: -96, w: 52, h: 100 },
    zierbrunnen: { x: -38, y: -58, w: 76, h: 66 }
  });
}

// --- Platz in jeder Stadt ----------------------------------------------------------------------------------------
// Was gibt es wo: Kazehana zwei Statuen und den Zierbrunnen, Städte zwei Statuen und den Brunnen, Lager eine Statue
const SP_PLACE = { minGap: 5 };
function spFree(w, x, y, R, keepOut) {
  // Fläche frei von Mauern, Häusern und Wasser
  for (let dy = -R; dy <= R; dy += 0.5) for (let dx = -R; dx <= R; dx += 0.5) {
    if (dx * dx + dy * dy > R * R + 0.01) continue;
    const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    const i = ty * MAP_W + tx;
    if (w.obj[i] !== OBJ.NONE) return false;
    if (LIQUID.has(w.ground[i])) return false;
  }
  if (typeof rgFreeAt === 'function') {
    const near = w.props.filter((pr) => Math.abs(pr.x / TILE - x) < 6 && Math.abs(pr.y / TILE - y) < 6);
    if (!rgFreeAt(w, x, y, near)) return false;
  }
  // Abstand zu Leuten (etwas mehr als die Ratgeberin braucht) und zu anderem Schmuck
  for (const n of w.npcs) {
    const d = Math.hypot(n.x / TILE - x, n.y / TILE - y);
    if (d < R + (n.id === 'weltentor' || n.id === 'eingang' ? 3 : 1.6)) return false;
  }
  for (const pr of w.props) {
    const d = Math.hypot(pr.x / TILE - x, pr.y / TILE - y);
    const r = pr.type === 'stand' || pr.type === 'tower' || pr.type === 'gate' ? 2.2 : pr.type === 'statue' || pr.type === 'zierbrunnen' ? SP_PLACE.minGap : 1.3;
    if (d < R + r * 0.6) return false;
  }
  return !keepOut || keepOut(x, y);
}
function spSites(w, mapId, cx, cy, half, custom) {
  const out = [];
  // Wege zu den Toren frei lassen (nur bei den Städten mit Kreuz-Plan)
  const roads = custom ? null : (x, y) => Math.abs(x - cx) > 2.4 && Math.abs(y - cy) > 2.4;
  const ring = (rMin, rMax, R, n) => {
    for (let r = rMin; r <= rMax && out.length < n; r += 0.5) {
      const steps = Math.max(8, Math.round(r * 4));
      for (let k = 0; k < steps; k++) {
        // Diagonalen zuerst (dort ist in den meisten Städten Platz)
        const a = Math.PI / 4 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / steps);
        const x = Math.round((cx + Math.cos(a) * r) * 4) / 4;
        const y = Math.round((cy + Math.sin(a) * r) * 4) / 4;
        if (Math.abs(x - cx) > half - 2.5 || Math.abs(y - cy) > half - 2.5) continue;
        if (out.some((o) => Math.hypot(o.x - x, o.y - y) < SP_PLACE.minGap + R)) continue;
        if (spFree(w, x, y, R, roads)) return { x, y };
      }
    }
    return null;
  };
  return { ring };
}

const _spGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _spGenerateWorld.apply(this, arguments);
  try {
    const towns = [{ id: 1, cx: CENTER_X, cy: CENTER_Y, half: typeof VILLAGE_HALF !== 'undefined' ? VILLAGE_HALF : 20, small: false, custom: false }];
    for (const wm of WORLD_MAPS) {
      if (wm.id === 1 || typeof wm.cx !== 'number') continue;
      const half = wm.camp || wm.genCamp || 13;
      towns.push({ id: wm.id, cx: wm.cx, cy: wm.cy, half, small: half < 13, custom: typeof townLayout === 'function' && !!townLayout(wm.id) });
    }
    for (const t of towns) {
      const L = stadtLook(t.id);
      const { ring } = spSites(w, t.id, t.cx, t.cy, t.half, t.custom);
      // Statuen schauen zur Stadtmitte (rot: Drehung um die Hochachse, +z zeigt nach Süden)
      const put = (type, at, v) => {
        if (!at) return false;
        const rot = type === 'statue' ? Math.round(Math.atan2(t.cx - at.x, t.cy - at.y) * 100) / 100 : 0;
        w.props.push({ type, roof: spRoof(L, v), x: at.x * TILE, y: at.y * TILE, rot });
        return true;
      };
      if (!t.small) put('zierbrunnen', ring(5, Math.min(12, t.half - 3), 1.6, 1), '');
      put('statue', ring(4, t.half - 3, 0.9, 1), 'held');
      if (!t.small) put('statue', ring(4, t.half - 3, 0.9, 1), 'weise');
    }
  } catch (e) {
    console.warn('Stadtschmuck: Platz nicht gefunden', e);
  }
  return w;
};
