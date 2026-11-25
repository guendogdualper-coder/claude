// Auktionator und Postmeisterin (seit 13.63): Figuren (2D-Bild, 3D-Aussehen), Plaketten über dem Kopf und ihre Stände.
// Die Plätze stehen in welt.js (Kazehana, Städte und Lager); was beim Ansprechen passiert, in oberflaeche.js openNpc.
// Wie bei der Bogenmacherin (fernninja.js) hängt sich alles an die vorhandenen Tabellen, drei-*.js bleibt unverändert.

STAND_COLORS.auktion = '#6a1e2a';
STAND_COLORS.post = '#2f4a7a';
NPC_TALK_LABEL.auktion = 'Handeln';
NPC_TALK_LABEL.post = 'Post';

// --- 3D-Aussehen (drei-figuren.js npcModelDef) ------------------------------------------------------------
NPC3.auktion = {
  skin: '#e2b48c', torso: '#6a1e2a', sleeve: '#6a1e2a', pants: '#2a2024', boots: '#1e1614', robe: '#6a1e2a', hemTrim: '#e0c36a', cuff: '#e0c36a',
  collar: '#e0c36a', hat: '#2a1a1e', hair: { style: 3, color: '#3a2418' }, beard: '#3a2418', belt: '#c9a35a', weapon: { kind: 'club', tier: 0 }, eyeShape: 2
};
NPC3.post = {
  skin: '#ecc9a5', torso: '#2f4a7a', sleeve: '#2f4a7a', pants: '#2a2c3a', boots: '#2a2018', hat: '#2f4a7a', hair: { style: 4, color: '#7a4a2a' },
  band: '#e0c36a', sash: '#e0c36a', straps: '#6b4a2e', belt: '#6b4a2e', eyeShape: 1
};

// --- 2D-Bild -------------------------------------------------------------------------------------------------
// Auktionator: weinroter Gehrock mit Goldknöpfen, hoher Hut, Hammer in der Hand
NPC_ART.auktion = (ctx) => villagerArt(ctx, {
  skin: '#e2b48c', boots: '#1e1614', pants: '#2a2024', torso: '#6a1e2a', sleeve: '#6a1e2a', gloves: '#e8e0cc', belt: '#c9a35a',
  body: (ctx, half) => {
    poly(ctx, [[-3, -24], [3, -24], [0, -17]], '#f0e8d8');
    for (const y of [-19, -15, -11]) dot(ctx, 0, y, 1.1, 1.1, '#e0c36a');
    box(ctx, -half, -12.5, half * 2, 2.4, 1, '#c9a35a');
  },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#3a2418', 0);
    paintShape(ctx, () => { ctx.beginPath(); ctx.moveTo(cx - 7, cy + 4); ctx.quadraticCurveTo(cx, cy + 9, cx + 7, cy + 4); ctx.quadraticCurveTo(cx, cy + 6, cx - 7, cy + 4); ctx.closePath(); }, '#3a2418', cx - 7, cy + 4, 14, 5);
    box(ctx, cx - 12, cy - 9, 24, 3, 1.4, '#2a1a1e');
    box(ctx, cx - 7.5, cy - 22, 15, 14, 1.5, '#2a1a1e');
    box(ctx, cx - 7.5, cy - 12, 15, 2.2, 0.6, '#c9a35a');
  },
  extra: (ctx) => {
    // Auktionshammer
    box(ctx, 10, -22, 1.8, 11, 0.6, '#6b4a2e');
    box(ctx, 7, -25, 8, 4, 1.2, '#8a5a34');
    box(ctx, 7, -25, 1.4, 4, 0.4, '#e0c36a');
    box(ctx, 13.6, -25, 1.4, 4, 0.4, '#e0c36a');
  }
});
// Postmeisterin: blaue Uniform mit Mütze, Umhängetasche voller Briefe
NPC_ART.post = (ctx) => villagerArt(ctx, {
  skin: '#ecc9a5', boots: '#2a2018', pants: '#2a2c3a', torso: '#2f4a7a', sleeve: '#2f4a7a', gloves: '#e8e0cc', eyes: { blush: true },
  body: (ctx, half) => {
    stroke(ctx, '#6b4a2e', 1.6, [[-half + 2, -24], [half - 2, -11]]);
    box(ctx, -half, -12.5, half * 2, 2.4, 1, '#6b4a2e');
    for (const y of [-20, -16]) dot(ctx, -2.5, y, 1, 1, '#e0c36a');
  },
  head: (ctx, cx, cy) => {
    hairCap(ctx, cx, cy, '#7a4a2a', 9);
    box(ctx, cx - 11, cy - 11, 22, 6, 2, '#2f4a7a');
    box(ctx, cx - 12, cy - 6.5, 16, 2.2, 1, '#1e3050');
    box(ctx, cx - 11, cy - 8.5, 22, 1.4, 0.4, '#e0c36a');
    dot(ctx, cx, cy - 9, 1.6, 1.6, '#e0c36a');
  },
  extra: (ctx) => {
    // Tasche an der Seite mit Briefen
    box(ctx, 7, -14, 10, 8, 1.5, '#8a5a34');
    box(ctx, 8.5, -17, 7, 4.5, 0.5, '#f4ecd8');
    box(ctx, 10, -18, 6, 4, 0.5, '#e8dcc0');
    stroke(ctx, '#c8402f', 0.9, [[10.5, -16.4], [15.5, -16.4]]);
    box(ctx, 7, -14, 10, 2.4, 1, '#6b4a2e');
  }
});

// Plaketten: Auktionshammer und Brief
NPC_ICONS.auktion = (ctx) => npcBadge(ctx, '#6a1e2a', (c) => {
  c.save();
  c.rotate(-0.6);
  box(c, -1, -2, 2, 10, 0.6, '#c89a62');
  box(c, -5, -7, 10, 5, 1.4, '#8a5a34');
  box(c, -5, -7, 1.6, 5, 0.4, '#e8c46a');
  box(c, 3.4, -7, 1.6, 5, 0.4, '#e8c46a');
  c.restore();
  box(c, -7, 5.2, 9, 2.4, 0.8, '#e8c46a');
});
NPC_ICONS.post = (ctx) => npcBadge(ctx, '#2f4a7a', (c) => {
  box(c, -7.5, -5, 15, 10.5, 1.2, '#f4ecd8');
  poly(c, [[-7.5, -4.6], [0, 1.4], [7.5, -4.6], [7.5, -5], [-7.5, -5]], '#d8ccb0');
  stroke(c, '#a8987a', 0.8, [[-7.5, -4.6], [0, 1.4], [7.5, -4.6]]);
  dot(c, 0, 1.2, 2, 2, '#c8302a');
});

// --- Stände in 3D (drei-welt.js PROP3.stand → STAND3[Rolle]) -----------------------------------------------
// Auktionshaus: Rednerpult mit Hammer, Wand mit ausgestellten Waffen und Schilden, Truhen und Kisten mit Losnummern
STAND3.auktion = function (b, M) {
  stFrame3(b, M, { awning: ['#6a1e2a', '#efe0b8'], counter: false, sign: '#e0c36a' });
  // Rückwand mit Ausstellungsstücken
  b.add(tinyBox(2.1, 1.5, 0.04), darker(ST3.wood, 0.2), { parent: M, p: [0, 0.85, -0.5] });
  stSword3(b, M, -0.7, 0.95, -0.44, 0.7, 0.35);
  stSword3(b, M, -0.42, 0.95, -0.44, 0.7, -0.35);
  stShield3(b, M, 0.5, 1.2, -0.44, 0.24, '#6a1e2a');
  stAxe3(b, M, 0.95, 0.55, -0.43, 0.2);
  // Pult in der Mitte mit Hammer und Buch
  b.add(wbox(0.6, 0.86, 0.4, 0.03), ST3.wood, { parent: M, p: [0, 0.43, 0.25], shade: 0.25 });
  b.add(wbox(0.52, 0.32, 0.03, 0.01), '#6a1e2a', { parent: M, p: [0, 0.6, 0.46] });
  b.add(tinyBox(0.52, 0.035, 0.035), ST3.gold, { parent: M, p: [0, 0.44, 0.47] });
  b.add(wbox(0.66, 0.05, 0.46, 0.02), ST3.woodL, { parent: M, p: [0, 0.89, 0.25], r: [0.2, 0, 0] });
  b.add(wbox(0.3, 0.03, 0.22, 0.01), ST3.paper, { parent: M, p: [-0.12, 0.93, 0.25], r: [0.2, 0, 0] });
  b.add(limb3(0.24, 0.016, 0.016, 6), '#6b4a2e', { parent: M, p: [0.08, 0.96, 0.26], r: [0, 0.5, Math.PI / 2] });
  b.add(cyl3(0.045, 0.045, 0.14, 10), '#8a5a34', { parent: M, p: [0.2, 0.98, 0.2], r: [0, 0.5, Math.PI / 2], shine: 0.4 });
  // Truhen und Kisten mit Losschildchen
  for (const [x, z, s, c] of [[-0.85, 0.3, 0.42, '#7a4e2e'], [0.85, 0.32, 0.38, '#8a6a3a']]) {
    stCrate3(b, M, x, 0.08, z, s, c);
    b.add(tinyBox(0.14, 0.1, 0.01), ST3.paper, { parent: M, p: [x, 0.08 + s * 0.6, z + s / 2 + 0.01] });
  }
  b.add(wbox(0.5, 0.26, 0.3, 0.04), '#5a2e1e', { parent: M, p: [-0.95, 0.65, -0.1], shade: 0.2 });
  b.add(cap3(0.18, Math.PI / 2, 0, Math.PI * 2, 10, 4), '#5a2e1e', { parent: M, p: [-0.95, 0.78, -0.1], s: [1.4, 0.6, 0.85] });
  b.add(tinyBox(0.52, 0.03, 0.32), ST3.gold, { parent: M, p: [-0.95, 0.72, -0.1] });
};
// Post: Regal mit Fächern voller Briefe, großer Briefkasten mit Schlitz, Pakete
STAND3.post = function (b, M) {
  stFrame3(b, M, { awning: ['#2f4a7a', '#efe6cc'], cloth: '#2f4a7a', sign: '#f4ecd8' });
  // Fächerwand an der Rückseite
  const fw = 1.5;
  b.add(wbox(fw + 0.08, 1.12, 0.32, 0.02), ST3.woodD, { parent: M, p: [-0.2, 1.36, -0.34] });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    const x = -0.2 - fw / 2 + (k + 0.5) * (fw / 4);
    const y = 0.98 + r * 0.34;
    b.add(tinyBox(fw / 4 - 0.05, 0.28, 0.02), '#2a1c12', { parent: M, p: [x, y + 0.14, -0.2] });
    if ((r + k) % 3 !== 1) b.add(tinyBox(0.22, 0.14, 0.03), (r + k) % 2 ? ST3.paper : '#f6ecc8', { parent: M, p: [x, y + 0.1, -0.18], r: [0, 0, (k - 1.5) * 0.06] });
  }
  // Briefe und Siegel auf dem Tresen
  for (let k = 0; k < 4; k++) b.add(tinyBox(0.2, 0.012, 0.13), k % 2 ? ST3.paper : '#f6ecc8', { parent: M, p: [-0.5 + k * 0.08, 0.78 + k * 0.012, 0.28], r: [0, k * 0.25, 0] });
  b.add(cyl3(0.03, 0.03, 0.02, 8), '#c8302a', { parent: M, p: [-0.38, 0.83, 0.3] });
  // großer Briefkasten rechts vorn
  b.add(wbox(0.38, 0.62, 0.3, 0.05), '#d8a030', { parent: M, p: [1.0, 0.5, 0.25], shade: 0.2, shine: 0.6 });
  b.add(cap3(0.19, Math.PI / 2, 0, Math.PI * 2, 12, 4), '#d8a030', { parent: M, p: [1.0, 0.81, 0.25], s: [1, 0.55, 0.8], shine: 0.6 });
  b.add(tinyBox(0.22, 0.03, 0.02), '#1a1410', { parent: M, p: [1.0, 0.7, 0.41] });
  b.add(cyl3(0.06, 0.06, 0.02, 12), '#2f4a7a', { parent: M, p: [1.0, 0.5, 0.41], r: [Math.PI / 2, 0, 0] });
  b.add(wbox(0.08, 0.2, 0.08, 0.02), '#3a3a3a', { parent: M, p: [1.0, 0.1, 0.25] });
  // Pakete links
  stCrate3(b, M, -1.05, 0.08, 0.3, 0.34, '#b08a52');
  stCrate3(b, M, -1.0, 0.39, 0.3, 0.26, '#c8a060', 0.3);
  for (const y of [0.25, 0.53]) b.add(tinyBox(0.36, 0.02, 0.025), '#c8402f', { parent: M, p: [-1.03, y, 0.3] });
  stSack3(b, M, 0.55, 0.32, 0.8, '#d8c8a0');
};
