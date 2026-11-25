// Aussehen der vier Lv-80-Instanzen der Nebelküste (Map 18) und der Himmelsterrassen (Map 19), seit 15.45.
// Daten (Gegner, Wächter, Bosse, Instanzen): daten/instanzen.js (INST82_MOBS, INST82_BOSSES, INSTANCES82); Ablauf,
// Beute und Sperre wie bei allen Instanzen (instanzen.js).
//   Gezeitengrotte  Meeresgrotte in Türkis und Perlmutt: Krabbenkrieger, Muschelwächter, Tiefseeschlangen
//                   Wächter Kragg (Riffspinne), Orrun (Perlmuttgolem), Nyssa (Priesterin der Tiefe), Tharos
//                   (Korallenritter); Boss Maelis, Herrin der Gezeiten (Naga mit Perlmuttkrone und Dreizack)
//   Nebelwrack      gesunkenes Geisterschiff in Graugrün mit Laternenlicht: ertrunkene Matrosen, Nebelgeister,
//                   Rankenkraken; Wächter Grimmholt (Bootsmann im Taucherhelm), Seraine (Nebelwitwe mit Laterne),
//                   Ulgor (Rankenkrake), Quell (Steuermann mit Laternenstab); Boss Kapitän Haldor Nebelbart
//   Sonnentempel    weißer Marmor und Gold: Tempelwächter, Lichtfalken, Sonnenpriester; Wächter Sarik (Löwe),
//                   Liora (Hohepriesterin), Tharn (Marmorhüter), Aurex (Lichtschwinge); Boss Solgar, der
//                   Sonnenwächter (Koloss aus Marmor mit goldenen Adern)
//   Wolkenhort      Himmelsinsel in Hellblau und Weiß: Sturmgreife, Windgeister, Wolkenriesen; Wächter Aeris
//                   (Windläuferin), Kaelos (Greifenfürst), Hrodmar (Wolkenriese), Ventra (Herrin der Böen); Boss
//                   Vindrakor, der Sturmdrache
// Hier stehen: Zeichnungen in 2D (daraus die 3D-Modelle der Raumgegner), eigene 3D-Modelle der Wächter und Bosse auf
// den Bauplänen von bosse3d-modelle*.js, Effekt-Themen in 3D (BS_FXT3), Zeichen am Tor, schwebende Teilchen.
// Keine Bodenringe, Runen oder Sterne als Effekt (Warnflächen der Angriffe bleiben).

// --- Böden der Hallen (welt.js GROUND; 2D, 3D und Karte wie in karte82.js) ---------------------------------------------
(function i82Ground() {
  const add = (g, a, b, map, soil) => {
    GROUND_SHADES[g] = [a, b];
    GROUND_PALETTE[g] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
    if (typeof MAP_COLORS !== 'undefined') MAP_COLORS[g] = map;
    if (typeof SOIL3 !== 'undefined') SOIL3[g] = soil;
  };
  add(GROUND.GROTTENSAND, '#3e5a56', '#56746c', [86, 116, 108], 2);   // nasser Sand der Grotte, türkisgrau
  add(GROUND.SCHIFFSHOLZ, '#3a352c', '#544c3e', [84, 76, 62], 1);     // dunkles, nasses Schiffsholz
  add(GROUND.TEMPELMARMOR, '#827a6c', '#9a9282', [178, 168, 144], 3); // Marmorplatten, warm und nicht zu hell
  add(GROUND.WOLKENSTEIN, '#5c6a82', '#76849c', [140, 156, 178], 3);  // blaugrauer Stein über den Wolken
})();

// --- 2D: Zeichnungen -----------------------------------------------------------------------------------------------
// Golem mit Kopfschmuck (Muschelfächer, Goldhelm, Krone)
function i82Golem(sc, c) {
  return (ctx, f) => humanoidMonsterArt(ctx, f, {
    scale: sc, belly: true, skin: c.skin, pants: c.pants, boots: c.boots, sleeve: c.skin, gloves: c.gloves, cracks: c.crack, weapon: c.weapon, weaponAngle: -1.3,
    head: (ctx, cx, cy) => {
      if (c.crest === 'shell') {
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.32;
          poly(ctx, [[cx - 1.5, cy - 7], [cx + Math.cos(a - 0.12) * 15, cy - 7 + Math.sin(a - 0.12) * 15], [cx + Math.cos(a + 0.12) * 15, cy - 7 + Math.sin(a + 0.12) * 15]], k % 2 ? c.crestCol : lighter(c.crestCol, 0.2));
        }
        dot(ctx, cx, cy - 7, 2.4, 2.4, '#ffffff');
      } else if (c.crest === 'helm') {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); }, c.crestCol, cx - 11.8, cy - 12.8, 23.6, 12);
        poly(ctx, [[cx - 8, cy - 11], [cx - 2, cy - 22], [cx + 4, cy - 12]], c.crestCol);
      } else if (c.crest === 'crown') {
        for (const [x, h] of [[-8, 9], [-4, 13], [0, 16], [4, 13], [8, 9]]) poly(ctx, [[cx + x - 2.2, cy - 9], [cx + x, cy - 9 - h], [cx + x + 2.2, cy - 9]], c.crestCol);
        box(ctx, cx - 10, cy - 11, 20, 3, 1, c.crestCol);
      }
      monsterEye(ctx, cx + 5.5, cy - 0.5, 2, c.eye, true);
      ctx.globalAlpha = 0.5;
      dot(ctx, cx + 5.5, cy - 0.5, 4.4, 4, c.crack);
      ctx.globalAlpha = 1;
    }
  });
}
// Menschengestalt im Gewand (Priesterin, Steuermann)
function i82Robe(sc, c) {
  return (ctx, f) => humanoidMonsterArt(ctx, f, {
    scale: sc, skin: c.skin, boots: c.boots || darker(c.robe, 0.4), robe: c.robe, sleeve: c.sleeve || c.robe, gloves: c.skin, wideSleeves: true, tattered: !!c.tattered, necklace: true,
    belt: c.belt, runes: c.glow, cape: c.cape, weapon: c.weapon || 'staff', weaponAngle: -1.35,
    head: (ctx, cx, cy) => {
      if (c.hood) poly(ctx, [[cx - 12, cy + 7], [cx - 13, cy - 4], [cx - 5, cy - 14], [cx + 6, cy - 12], [cx + 12, cy - 3], [cx + 3, cy - 3], [cx - 2, cy + 7]], c.hood);
      if (c.hair) {
        poly(ctx, [[cx - 11, cy + 14], [cx - 13, cy - 4], [cx - 4, cy - 12], [cx + 5, cy - 11], [cx - 2, cy - 3], [cx - 5, cy + 16]], c.hair);
        stroke(ctx, lighter(c.hair, 0.3), 0.8, [[cx - 9, cy - 6], [cx - 11, cy + 10]]);
      }
      if (c.crown === 'fan') for (const [x, h] of [[-7, 10], [-3, 15], [1, 18], [5, 14]]) poly(ctx, [[cx + x - 2, cy - 9], [cx + x, cy - 9 - h], [cx + x + 2, cy - 9]], c.crownCol);
      if (c.crown === 'pearls') for (let k = 0; k < 5; k++) dot(ctx, cx - 7 + k * 3.5, cy - 9.5 - (k === 2 ? 1.5 : 0), 1.6, 1.6, c.crownCol);
      monsterEye(ctx, cx + 5.6, cy - 0.6, 1.8, c.eye, true);
      ctx.globalAlpha = 0.5;
      dot(ctx, cx + 5.6, cy - 0.6, 3.6, 3.2, c.glow);
      ctx.globalAlpha = 1;
    }
  });
}
// Vogelgestalt mit Schnabel und Federkamm (Lichtfalke, Lichtschwinge, Windläuferin)
function i82Bird(sc, c) {
  return (ctx, f) => humanoidMonsterArt(ctx, f, {
    scale: sc, skin: c.skin, pants: c.pants, boots: c.boots, torso: c.torso, sleeve: c.sleeve, gloves: c.boots, wings: c.wings, claws: true, tail: !!c.tail,
    head: (ctx, cx, cy) => {
      for (const [dx, h] of [[-8, 12], [-4, 17], [0, 13]]) poly(ctx, [[cx + dx - 2, cy - 8], [cx + dx - 3, cy - 8 - h], [cx + dx + 2, cy - 8]], c.crest);
      poly(ctx, [[cx + 8, cy - 1], [cx + 16, cy + 1.5], [cx + 13, cy + 4.5], [cx + 8, cy + 4]], c.beak);
      stroke(ctx, darker(c.beak, 0.4), 0.7, [[cx + 9, cy + 2.5], [cx + 14, cy + 2.8]]);
      monsterEye(ctx, cx + 5.5, cy - 1, 1.8, c.eye, true);
    }
  });
}
// Krieger und Riesen (Matrose, Bootsmann, Kapitän, Korallenritter, Wolkenriese)
function i82Fighter(sc, c) {
  return (ctx, f) => humanoidMonsterArt(ctx, f, {
    scale: sc, belly: !!c.belly, skin: c.skin, pants: c.pants, boots: c.boots, torso: c.torso, sleeve: c.sleeve, gloves: c.gloves, belt: c.belt, pouch: c.pouch,
    pauldron: c.pauldron, spikes: !!c.spikes, cape: c.cape, runes: c.glow, weapon: c.weapon, weaponAngle: c.weaponAngle,
    head: (ctx, cx, cy) => {
      if (c.hat === 'bandana') {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 0.5, 11.4, Math.PI * 0.9, Math.PI * 2.02); ctx.closePath(); }, c.hatCol, cx - 11.4, cy - 12, 22.8, 12);
        poly(ctx, [[cx - 10, cy - 5], [cx - 17, cy], [cx - 15, cy - 6]], c.hatCol);
      } else if (c.hat === 'tricorn') {
        poly(ctx, [[cx - 15, cy - 6], [cx - 6, cy - 19], [cx + 6, cy - 19], [cx + 16, cy - 6], [cx + 4, cy - 10], [cx - 5, cy - 10]], c.hatCol);
        stroke(ctx, c.hatTrim, 1, [[cx - 15, cy - 6], [cx - 5, cy - 10], [cx + 4, cy - 10], [cx + 16, cy - 6]]);
      } else if (c.hat === 'coral') {
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI * 0.85, Math.PI * 2.15); ctx.closePath(); }, c.hatCol, cx - 11.8, cy - 12.8, 23.6, 13);
        for (const [x, h] of [[-7, 12], [-2, 17], [3, 11]]) stroke(ctx, c.hatTrim, 2, [[cx + x, cy - 10], [cx + x - 2, cy - 10 - h * 0.6], [cx + x + 1, cy - 10 - h]]);
        box(ctx, cx + 2, cy - 1.4, 9, 1.8, 0.6, c.eye);
      }
      if (c.beard) {
        for (const [x, y, r] of [[2, 7, 5], [6, 9, 4.5], [-2, 9, 4], [3, 12, 4], [8, 5, 3.5]]) dot(ctx, cx + x, cy + y, r, r * 0.85, c.beard);
      }
      if (c.hat !== 'coral') monsterEye(ctx, cx + 5.6, cy - 0.8, 1.8, c.eye, true);
      ctx.globalAlpha = 0.5;
      dot(ctx, cx + 5.6, cy - 0.8, 3.6, 3.2, c.eye);
      ctx.globalAlpha = 1;
    }
  });
}
// Greif und Drache (Flügel und Vierbeiner)
const i82Winged = (sc, wing, o) => (ctx, f) => {
  ctx.scale(sc, sc);
  dragonWings(ctx, f, wing);
  beastArt(ctx, f, o);
};
// Grundzeichnung über ihren Namen aufrufen (nicht als Wert gemerkt): captureArt (drei-figuren.js) ersetzt die Funktionen
// beim Bauen des 3D-Modells kurz durch einen Mitschreiber
const i82Scaled = (sc, name, o) => (ctx, f) => {
  ctx.scale(sc, sc);
  window[name](ctx, f, o);
};

const I82_ART = {
  // Gezeitengrotte
  i_krabbenkrieger: { h: 40, draw: i82Scaled(1.5, 'scorpionArt', { body: '#d8643a', sting: '#5fe8d8' }) },
  i_muschelwaechter: { h: 70, draw: i82Golem(1.55, { skin: '#5e9a94', pants: '#3a6a66', boots: '#2a4a48', gloves: '#7ab8b0', crack: '#f0fff8', crest: 'shell', crestCol: '#f0e4dc', eye: '#e8fff8' }) },
  i_tiefseeschlange: { h: 46, draw: (ctx, f) => serpentArt(ctx, f, { scale: 1.45, body: '#1e4a6a', belly: '#8ff0e8', mark: '#0e2a40' }) },
  kragg: { h: 56, draw: i82Scaled(2.6, 'spiderArt', { body: '#c8502a', mark: '#f4e8e0', eye: '#1a0a06' }) },
  orrun: { h: 98, draw: i82Golem(2.3, { skin: '#4e8a84', pants: '#2e5a56', boots: '#1e3e3c', gloves: '#6aa8a0', crack: '#ffffff', crest: 'shell', crestCol: '#ffe8dc', eye: '#ffffff' }) },
  nyssa: { h: 90, draw: i82Robe(1.8, { skin: '#a8d8d0', robe: '#1e5a6a', sleeve: '#2e7a88', glow: '#7af0e0', eye: '#e8fff8', hair: '#d8fff8', crown: 'pearls', crownCol: '#ffffff', belt: '#5fe8d8' }) },
  tharos: { h: 100, draw: i82Fighter(2.0, { skin: '#c86a5a', pants: '#3a2a2a', boots: '#2a1a1a', torso: '#a84a3a', sleeve: '#c86a5a', gloves: '#6a2a20', belt: '#5fe8d8', pauldron: '#ff8a6a', spikes: true, cape: '#1e5a6a', glow: '#5fe8d8', weapon: 'greatsword', hat: 'coral', hatCol: '#b84a3a', hatTrim: '#ff8a7a', eye: '#8ff0e8' }) },
  maelis: { h: 132, draw: (ctx, f) => nagaArt(ctx, f, { scale: 2.45, body: '#2e8a8a', belly: '#e8fff8', mark: '#0e4a50', skin: '#a8e0d8', armor: '#f0e8e0', trim: '#5fe8d8', hair: '#e8fff8', eye: '#ffffff' }) },
  // Nebelwrack
  i_matrose: { h: 48, draw: i82Fighter(1.04, { skin: '#9aa898', pants: '#3a4a5a', boots: '#22262a', torso: '#c8ccc0', sleeve: '#4a5a6a', gloves: '#9aa898', belt: '#5a4a2a', weapon: 'sword', hat: 'bandana', hatCol: '#7a3a34', eye: '#c8ffd0' }) },
  i_nebelgeist: { h: 50, draw: i82Scaled(1.12, 'ghostArt', { body: '#b8c8c0', crown: '#e8fff0', eye: '#ffe8a0' }) },
  i_rankenkrake: { h: 30, draw: i82Scaled(1.38, 'spiderArt', { body: '#3e5a50', mark: '#a8d8b0', eye: '#ffe8a0' }) },
  grimmholt: { h: 90, draw: i82Fighter(1.9, { skin: '#9aa898', pants: '#2a3030', boots: '#1a1e1e', torso: '#3a4a4a', sleeve: '#4a5a5a', gloves: '#2a3230', belt: '#8a6a2a', pouch: '#5a4a2a', pauldron: '#5a6a64', weapon: 'sword', hat: 'bandana', hatCol: '#4a5a52', eye: '#ffe8a0' }) },
  seraine: { h: 92, draw: i82Scaled(2.0, 'ghostArt', { body: '#c8e0d0', crown: '#ffe8a0', eye: '#2a3a30' }) },
  ulgor: { h: 56, draw: i82Scaled(2.6, 'spiderArt', { body: '#2e4a40', mark: '#ffd88a', eye: '#ffe8a0' }) },
  quell: { h: 88, draw: i82Robe(1.8, { skin: '#8a9a8e', robe: '#2a3a34', glow: '#ffe8a0', eye: '#fff0b0', hood: '#1e2a26', tattered: true, cape: '#1a2420' }) },
  haldor: { h: 124, draw: i82Fighter(2.5, { skin: '#8a9a90', pants: '#1a2220', boots: '#141a18', torso: '#2a3a36', sleeve: '#3a4a46', gloves: '#2a3430', belt: '#c8a050', pauldron: '#5a6a64', spikes: true, cape: '#1e2a26', glow: '#a8d8b0', weapon: 'greatsword', hat: 'tricorn', hatCol: '#1e2624', hatTrim: '#c8a050', beard: '#c8d4cc', eye: '#ffe8a0' }) },
  // Sonnentempel
  i_tempelwaechter: { h: 72, draw: i82Golem(1.6, { skin: '#ece4d2', pants: '#c8a040', boots: '#8a6a2a', gloves: '#f6f0e2', crack: '#ffc040', crest: 'helm', crestCol: '#d8b050', eye: '#ffe08a', weapon: 'club' }) },
  i_lichtfalke: { h: 52, draw: i82Bird(1.1, { skin: '#f0e0b8', pants: '#c89a40', boots: '#6a4a20', torso: '#fff4d8', sleeve: '#e8d8a8', wings: '#fff0c0', crest: '#ffffff', beak: '#e8b030', eye: '#ffd36a', tail: true }) },
  i_sonnenpriester: { h: 50, draw: i82Robe(1.05, { skin: '#d8b090', robe: '#f4ecd8', glow: '#ffd36a', eye: '#ffe08a', crown: 'fan', crownCol: '#e8c04a', belt: '#c8a040', weapon: 'rod' }) },
  sarik: { h: 62, draw: beastIn(2.2, { fur: '#e8b850', belly: '#fff0c8', snout: '#f4dca0', mane: '#c8782a', cat: true, longTail: true, tailTip: '#8a5020', eye: '#fff0a0', glow: true, angry: true, fangs: true }) },
  liora: { h: 92, draw: i82Robe(1.8, { skin: '#e0b890', robe: '#fff4e0', sleeve: '#f4e8c8', glow: '#ffd36a', eye: '#ffe08a', hair: '#fff0c0', crown: 'fan', crownCol: '#ffd36a', belt: '#c8a040', weapon: 'rod', cape: '#e8c060' }) },
  tharn: { h: 100, draw: i82Golem(2.3, { skin: '#f0e8d8', pants: '#c8a040', boots: '#8a6a2a', gloves: '#fff8ec', crack: '#ffc040', crest: 'crown', crestCol: '#e8c04a', eye: '#ffd36a', weapon: 'club' }) },
  aurex: { h: 92, draw: i82Bird(1.9, { skin: '#f0d8a8', pants: '#c8902a', boots: '#6a4a1a', torso: '#fff0c8', sleeve: '#f4e0a0', wings: '#ffd36a', crest: '#fff8e0', beak: '#c8902a', eye: '#ffffff', tail: true }) },
  solgar: { h: 134, draw: i82Golem(3.0, { skin: '#f4ecdc', pants: '#d8b050', boots: '#a07a30', gloves: '#fffaf0', crack: '#ffd36a', crest: 'crown', crestCol: '#ffd36a', eye: '#fffbe8', weapon: 'club' }) },
  // Wolkenhort
  i_sturmgreif: { h: 44, draw: i82Winged(1.45, '#e8e0d0', { fur: '#b89868', belly: '#f4ecd8', snout: '#e8c040', mane: '#f8f4ec', cat: true, longTail: true, tailTip: '#8a6a40', eye: '#ffd36a', angry: true }) },
  i_windgeist: { h: 48, draw: i82Scaled(1.08, 'ghostArt', { body: '#e0eefa', crown: '#bfe4ff', eye: '#3a6aa8' }) },
  i_wolkenriese: { h: 78, draw: i82Fighter(1.75, { belly: true, skin: '#c8d4e4', pants: '#5a6a88', boots: '#3a4a68', torso: '#e8eef8', sleeve: '#c8d4e4', gloves: '#e8eef8', belt: '#c8a050', beard: '#ffffff', eye: '#3a8ae8' }) },
  aeris: { h: 92, draw: i82Bird(1.9, { skin: '#e0e8f4', pants: '#5a7aa8', boots: '#3a4a68', torso: '#a8c8e8', sleeve: '#c8dcf0', wings: '#f4f8ff', crest: '#bfe4ff', beak: '#d8c890', eye: '#3a8ae8' }) },
  kaelos: { h: 64, draw: i82Winged(2.2, '#f0e8d8', { fur: '#a07848', belly: '#f4ecd8', snout: '#e8c040', mane: '#ffffff', cat: true, longTail: true, tailTip: '#6a4a28', eye: '#ffd36a', angry: true, glow: true }) },
  hrodmar: { h: 124, draw: i82Fighter(2.6, { belly: true, skin: '#c8d4e4', pants: '#4a6a98', boots: '#2a3a58', torso: '#e8eef8', sleeve: '#c8d4e4', gloves: '#e8eef8', belt: '#c8a050', pauldron: '#c8a050', cape: '#5a7aa8', glow: '#bfe4ff', weapon: 'staff', weaponAngle: -1.3, beard: '#ffffff', eye: '#3a8ae8' }) },
  ventra: { h: 92, draw: i82Scaled(2.0, 'ghostArt', { body: '#e8f4ff', crown: '#bfe4ff', eye: '#1e3a68' }) },
  vindrakor: { h: 116, draw: i82Winged(2.95, '#5a7aa8', { fur: '#9ab8d8', belly: '#f0f8ff', snout: '#b8d0e8', ridge: true, eye: '#ffffff', angry: true, glow: true, fangs: true, tusk: true }) }
};
Object.assign(MONSTER_ART, I82_ART);

// Köpfe der Menschenartigen in 3D (Kapuze, Helm, Bart) und Art für „Stark gegen …“
if (typeof HEAD3 !== 'undefined') {
  Object.assign(HEAD3, {
    i_muschelwaechter: { golem: true, cracks: '#f0fff8' },
    i_matrose: { bone: true, hood: '#7a3a34' },
    i_tempelwaechter: { golem: true, cracks: '#ffc040' },
    i_lichtfalke: { feathers: ['#fff0c0', '#ffffff', '#e8c060'], hairLong: '#fff4d8' },
    i_sonnenpriester: { hood: '#f4ecd8' },
    i_wolkenriese: { beard: '#ffffff', beardGlow: true, brow: true }
  });
}
if (typeof MON3_LOOK !== 'undefined') {
  Object.assign(MON3_LOOK, {
    i_rankenkrake: { legs: 1.25, glowMark: true, speckle: '#a8d8b0', venom: '#ffe8a0' },
    i_nebelgeist: { longFingers: true },
    i_windgeist: { snow: true },
    i_sturmgreif: { coins: null }
  });
}
if (typeof MONSTER_KIND_IDS !== 'undefined') {
  Object.assign(MONSTER_KIND_IDS, { i_matrose: 'undead', i_nebelgeist: 'undead', grimmholt: 'undead', seraine: 'undead', quell: 'undead', haldor: 'undead' });
}

// --- 3D: Effekt-Themen der Wächter und Bosse (bosse3d.js) ----------------------------------------------------------
if (typeof BS_FXT3 !== 'undefined') {
  Object.assign(BS_FXT3, {
    gezeiten: { core: '#f0fffc', mid: '#5fe8d8', dark: '#1e4a50', tex: 'spark', deb: 'blob', debCol: ['#2e7a7a', '#1e5a5a'], proj: 'blob', mist: true },
    nebel: { core: '#fff4d0', mid: '#a8d8b0', dark: '#2a3632', tex: 'flame', deb: 'bone', debCol: ['#8a9a90', '#5a6a62'], proj: 'skull', rise: true, mist: true },
    sonne: { beam: 'ground', core: '#fffbe8', mid: '#ffd36a', dark: '#8a6a3a', tex: 'spark', deb: 'rock', debCol: ['#f0e8d8', '#d8c8a8'], proj: 'spear', rise: true },
    wind: { core: '#ffffff', mid: '#bfe4ff', dark: '#5a6a88', tex: 'spark', deb: 'rock', debCol: ['#c8d4e4', '#9aa8c0'], proj: 'bolt', bolt: true, mist: true }
  });
}

// --- 3D: Wächter und Bosse ----------------------------------------------------------------------------------------
if (typeof BOSS3 !== 'undefined' && typeof bsWardReg3 === 'function') {
  // Gezeitengrotte -------------------------------------------------------------------------------------------------
  // Kragg, die Riffspinne: Meeresspinne in Korallenrot mit Perlmuttsplittern auf dem Hinterleib
  MON3_BUILD.kragg = (b) => bsSpider3(b, 'kragg', {
    body: '#c8502a', top: '#ff9a6a', dark: '#6a2410', abdCol: '#d8603a', abdTop: '#ffb08a', leg: '#c8502a', legD: '#8a3418', band: '#5fe8d8', hair: '#e8c0a8',
    eye: '#1a0a06', fang: '#f4e8d8', venom: '#5fe8d8', mark: '#f4e8e0', gem: '#f0e8e0', gemTop: '#ffffff', abd: 0.8, legK: 0.8, shards: true, bandGlow: true, worldH: 2.8
  });
  BOSS3.kragg = Object.assign({}, BS_SPI_BOSS3, {
    fx: 'gezeiten', emi: [0.06, 0.04, 0.03], gait: 1.2,
    ambient: bsAmb3('kragg', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.8, r: 0.1, s: 0.12, col: '#bff8f0' }, { k: 'rise', at: 'back', n: 4, sp: 0.5, r: 0.6, h: 1.4, s: 0.12, col: '#e8fffc' }])
  });
  // Orrun, der Perlmutthüter: Golem aus Perlmutt und Riffstein, Fäuste aus Muschelschalen
  bsWardReg3('orrun', {
    frame: 'giant', head: 'golem', crest: 'gem', cover: 'crystal', plates: true, facet: true, fists: 'rock', weapon: 'none', loin: false,
    stone: '#5e9a94', stoneTop: '#e8fff8', gem: '#f0e8e0', gemTop: '#ffffff', glow: '#8ff0e8', vein: '#8ff0e8', eye: '#ffffff', skin: '#3e7a74', skinTop: '#7ab8b0',
    belt: '#2e5a56', cloth: '#1e4a46', worldH: 4.8
  }, {
    fx: 'gezeiten', emit: 'handL', melee: ['slam2', 'punch', 'stomp'], emi: [0.04, 0.08, 0.08], ptsO: { emitHand: true },
    ambient: bsAmb3('orrun', [{ k: 'drip', at: 'back', n: 4, sp: 0.5, r: 0.8, h: 2.2, s: 0.12, col: '#8ff0e8' }, { k: 'ground', n: 3, sp: 0.25, r: 1.4, col: '#2e7a7a', op: 0.22 }])
  });
  // Nyssa, Stimme der Tiefe: Priesterin in Tiefseeblau mit Perlenkrone und Wasserkugel
  MON3_BUILD.nyssa = (b) => bsSorc3(b, 'nyssa', {
    skin: '#a8d8d0', skinTop: '#d8f4f0', eye: '#7af0e0', hair: '#e8fff8', hairGlow: '#7af0e0', robe: '#1e5a6a', robeTop: '#3e8a98', sleeve: '#184a58', hem: '#7af0e0', hemTop: '#e8fff8',
    glow: '#7af0e0', trim: '#e8fff8', gem: '#5fe8d8', gemTop: '#f0fffc', cape: '#0e3a48', capeEdge: '#7af0e0', capeIn: '#1e5a6a', staff: '#e8e0d0', staffTop: '#ffffff',
    veil: '#bff8f0', crown: 'crystal', mantle: true, wispHem: true, weapon: 'orb', worldH: 5.0
  });
  BOSS3.nyssa = Object.assign({}, BS_SORC_BOSS3, {
    fx: 'gezeiten', emi: [0.03, 0.08, 0.08], base: { aRx: -0.75, aRe: -1.1, aRz: -0.1, aLx: -0.75, aLe: -1.1, aLz: -0.12, lean: 0.05 },
    ambient: bsAmb3('nyssa', [{ k: 'orbit', n: 5, R: 1.3, tex: 'spark' }, { k: 'rise', at: 'hand', n: 3, sp: 0.6, r: 0.2, h: 1.0, s: 0.12, col: '#e8fffc' }])
  });
  // Korallenritter Tharos: Rüstung aus Korallen, Hörnerhelm, Tang und Muscheln, Klinge aus Perlmutt
  MON3_BUILD.tharos = (b) => bsKnight3(b, 'tharos', {
    plate: '#b84a3a', plateTop: '#ff8a6a', plateD: '#6a2418', trim: '#5fe8d8', glow: '#5fe8d8', eye: '#8ff0e8', cape: '#0e4a50', capeEdge: '#5fe8d8',
    grip: '#2a2018', blade: '#e8e0d0', bladeTop: '#ffffff', weed: '#2e7a5a', weedTop: '#4aa07a', shell: '#ffd8c8', rust: '#8a3a2a',
    helm: 'horned', drowned: true, torn: true, worldH: 5.6
  });
  BOSS3.tharos = Object.assign({}, BS_KNIGHT_BOSS3, {
    fx: 'gezeiten', emi: [0.06, 0.05, 0.04],
    ambient: bsAmb3('tharos', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.7, r: 0.15, s: 0.1, h: 2.0, col: '#8ff0e8' }, { k: 'rise', at: 'weapon', n: 3, sp: 0.9, r: 0.2, h: 0.7, s: 0.13, col: '#e8fffc' }])
  });
  // Maelis, Herrin der Gezeiten: Naga in Türkis und Perlmutt, Krone aus Muschelblättern, Dreizack, Gischt umkreist sie
  MON3_BUILD.maelis = (b) => bsNaga3(b, 'maelis', Object.assign({}, BS_VRITRA3, {
    skin: '#4aa8a4', skinTop: '#8ad8d0', scale: '#0e4a5a', scaleTop: '#1e6e7e', scaleD: '#06242c', mark: '#f0e8e0', crest: '#082e38', hood: '#0e4a5a', hoodEdge: '#f0fffc',
    hair: '#f4fffc', gold: '#f4ece4', goldD: '#d8b8a8', gem2: '#5fe8d8', glow: '#8ff0e8', eye: '#ffffff', blade: '#e8f4f0', bladeTop: '#ffffff', headdress: true, trident: true, worldH: 7.2
  }));
  BOSS3.maelis = Object.assign({}, BS_NAGA_BOSS3, {
    fx: 'gezeiten', melee: ['strike', 'slash', 'whip'], emi: [0.03, 0.08, 0.08],
    pts: Object.assign({}, BS_NAGA_PTS3, { weapon: [BN3.haR, bsAdd3(bsLerp3(BS_NAGA_R3.P[-1].W, BS_NAGA_R3.P[-1].Hd, 0.55), [0, 0, 1.4])] }),
    ambient: bsAmb3('maelis', [{ k: 'orbit', n: 6, R: 1.9, tex: 'spark' }, { k: 'rise', at: 'weapon', n: 4, sp: 0.8, r: 0.2, h: 1.0, s: 0.15, col: '#e8fffc' },
      { k: 'drip', at: 'back', n: 4, sp: 0.55, r: 1.0, h: 2.4, s: 0.14, col: '#8ff0e8' }, { k: 'ground', n: 4, sp: 0.25, r: 2.0, col: '#2e7a7a', op: 0.26, s: 1.3 }])
  });

  // Nebelwrack -----------------------------------------------------------------------------------------------------
  // Bootsmann Grimmholt: ertrunken im alten Taucherhelm, Rüstung voller Tang und Seepocken, abgebrochene Klinge
  MON3_BUILD.grimmholt = (b) => bsKnight3(b, 'grimmholt', {
    plate: '#4a5650', plateTop: '#7a8a80', plateD: '#2a3430', trim: '#a8884a', glow: '#ffe8a0', eye: '#ffe8a0', cape: '#1e2a26', capeEdge: '#a8d8b0',
    grip: '#2a2018', blade: '#5a625c', bladeTop: '#9aa29a', weed: '#3a4a2a', weedTop: '#5a6a3a', shell: '#d8d0c0', rust: '#6a4a2a',
    helm: 'bucket', drowned: true, bladeForm: 'broken', torn: true, worldH: 5.4
  });
  BOSS3.grimmholt = Object.assign({}, BS_KNIGHT_BOSS3, {
    fx: 'nebel', emi: [0.06, 0.06, 0.03],
    ambient: bsAmb3('grimmholt', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.7, r: 0.15, s: 0.1, h: 2.0, col: '#a8d8b0' }, { k: 'ground', n: 3, sp: 0.25, r: 1.2, col: '#3a4a42', op: 0.3 }])
  });
  // Seraine, die Nebelwitwe: Schleier und zerrissenes Trauergewand, schwingt eine Laterne
  MON3_BUILD.seraine = (b) => bsSorc3(b, 'seraine', {
    skin: '#c8dcd0', skinTop: '#eef8f0', eye: '#ffe8a0', hair: '#d8e8e0', robe: '#3a4a44', robeTop: '#6a7a70', sleeve: '#2e3a36', hem: '#a8d8b0', hemTop: '#e8fff0',
    glow: '#ffe8a0', trim: '#a8d8b0', gem: '#ffe8a0', gemTop: '#fff8e0', cape: '#24302c', capeEdge: '#a8d8b0', capeIn: '#3a4a44', staff: '#3a3430', staffTop: '#8a7a5a', claw: '#2a3430', bone: '#d8e0d8',
    hood: true, mantle: true, torn: true, wispHem: true, weapon: 'censer', worldH: 5.0
  });
  BOSS3.seraine = Object.assign({}, BS_SORC_BOSS3, {
    fx: 'nebel', emi: [0.06, 0.06, 0.03], base: { aRx: -0.75, aRe: -1.1, aRz: -0.1, aLx: -0.75, aLe: -1.1, aLz: -0.12, lean: 0.05 },
    ambient: bsAmb3('seraine', [{ k: 'pulse', at: 'weapon', s: 1.0, op: 0.35, col: '#ffe8a0' }, { k: 'orbit', n: 4, R: 1.3, tex: 'flame' }, { k: 'ground', n: 3, sp: 0.2, r: 1.0, col: '#4a5a52', op: 0.3 }])
  });
  // Ulgor, der Rankenkrake: dunkelgrüner Leib, lange Fangarme, Laternenlicht in den Augen
  MON3_BUILD.ulgor = (b) => bsSpider3(b, 'ulgor', {
    body: '#2e4a40', top: '#5a8a74', dark: '#14221e', abdCol: '#3a5a4e', abdTop: '#7aa890', leg: '#3a5a4e', legD: '#24382e', band: '#ffd88a', hair: '#4a6a5a',
    eye: '#ffe8a0', fang: '#d8d0b8', venom: '#a8d8b0', mark: '#a8d8b0', mark2: '#ffd88a', abd: 1.25, legK: 1.15, bandGlow: true, worldH: 3.0
  });
  BOSS3.ulgor = Object.assign({}, BS_SPI_BOSS3, {
    fx: 'nebel', emi: [0.05, 0.06, 0.03],
    ambient: bsAmb3('ulgor', [{ k: 'drip', at: 'mouth', n: 3, sp: 0.8, r: 0.1, s: 0.12, col: '#a8d8b0' }, { k: 'ground', n: 4, sp: 0.25, r: 1.8, col: '#2a3632', op: 0.32, s: 1.2 }])
  });
  // Steuermann Quell: Kapuze ohne Gesicht, Ketten über dem Gewand, Laternenstab
  MON3_BUILD.quell = (b) => bsLich3(b, 'quell', {
    robe: '#2a3a34', robeTop: '#4a5e56', bone: '#c8d0c4', boneTop: '#e8f0e4', iron: '#3a4440', ironTop: '#7a8a80', glow: '#ffe8a0', wood: '#3a3028',
    cape: '#1a2420', capeEdge: '#a8d8b0', skin: '#2a3a34', skinTop: '#4a5e56', headgear: 'hood', staff: 'lantern', chains: true, noCollar: true, worldH: 5.4
  });
  BOSS3.quell = Object.assign({}, BS_LICH_BOSS3, {
    fx: 'nebel', emi: [0.06, 0.06, 0.02],
    ambient: bsAmb3('quell', [{ k: 'pulse', at: 'weapon', s: 1.0, op: 0.35, col: '#ffe8a0' }, { k: 'smoke', at: 'back', n: 3, sp: 0.3, r: 0.6, col: '#2a3632', op: 0.35 }])
  });
  // Kapitän Haldor Nebelbart: Geisterkapitän mit breitem Hut, Bart aus Nebel, Mantel, Säbel; Nebel steigt um ihn auf,
  // eine Laterne leuchtet an seinem Gürtel
  bsWardReg3('haldor', {
    frame: 'man', head: 'bandit', beardForm: 'cloud', pad: 'cloth', cape: true, torn: true, boots: true, weapon: 'saber', weaponK: 1.35, straps: true, loinL: 0.75, loinCol: '#1e2624',
    skin: '#8a9a90', skinTop: '#b4c4ba', torso: '#22302c', armCol: '#22302c', legCol: '#1a2220', handCol: '#2a3430', boots: '#141a18',
    cloth: '#2e3e38', clothTop: '#4a5e56', clothD: '#121a16', cape: '#1a2420', capeEdge: '#a8d8b0', hair: '#c8d4cc', mask: '#1e2a26', maskTop: '#3a4a44',
    hat: '#161c1a', hatTop: '#2e3632', band: '#c8a050', feather: '#d8e8e0', featherTop: '#a8d8b0', gold: '#c8a050', metal: '#a8b8b0', metalTop: '#f0fff8',
    beard: '#c8d4cc', beard2: '#8a9a90', grip: '#2a2420', glow: '#ffe8a0', eye: '#ffe8a0', belt: '#2a2420', worldH: 7.4
  }, {
    fx: 'nebel', emit: 'weapon', melee: ['chop', 'sweep', 'thrust'], emi: [0.06, 0.07, 0.04],
    ambient(h, a, e, t, th) {
      if (!a.bones) return;
      // Nebel quillt aus Mantel und Bart, Geisterlichter treiben um ihn, ein Glimmen an der Klinge
      bsAmbPart3(h, a, BOSS3.haldor, e, t, th, { k: 'smoke', at: 'back', n: 5, sp: 0.3, r: 0.9, col: '#a8b8b0', op: 0.3 });
      bsAmbPart3(h, a, BOSS3.haldor, e, t, th, { k: 'smoke', at: 'mouth', n: 2, sp: 0.4, r: 0.1, h: 0.6, s: 0.35, col: '#d8e4dc', op: 0.3 });
      bsAmbPart3(h, a, BOSS3.haldor, e, t, th, { k: 'orbit', n: 5, R: 1.8, tex: 'flame' });
      bsAmbPart3(h, a, BOSS3.haldor, e, t, th, { k: 'pulse', at: 'core', s: 0.8, op: 0.28, col: '#ffe8a0' });
      bsAmbPart3(h, a, BOSS3.haldor, e, t, th, { k: 'ground', n: 4, sp: 0.2, r: 2.0, col: '#3a4a42', op: 0.3, s: 1.3 });
    }
  });

  // Sonnentempel ---------------------------------------------------------------------------------------------------
  // Goldmähne Sarik: Löwe mit goldenem Fell und glühender Mähne
  MON3_BUILD.sarik = (b) => bsWolf3(b, 'sarik', {
    fur: '#d8a84a', furTop: '#f4d088', furD: '#a87a2a', ruff: '#b8682a', belly: '#f4e2b0', claw: '#3a2a1a', tooth: '#fff8e8', eye: '#fff0a0', earIn: '#8a5a2a',
    muzzle: '#f0d8a0', glow: '#ffd36a', headKind: 'cat', tail: 'cat', worldH: 4.6
  });
  BOSS3.sarik = Object.assign({}, BS_GUARD_WOLF3, {
    fx: 'sonne', howl: false, melee: ['claw', 'bite', 'maul'], gait: 1.1, emi: [0.12, 0.09, 0.03],
    ambient: bsAmb3('sarik', [{ k: 'rise', at: 'back', n: 5, sp: 0.6, r: 0.7, h: 1.4, s: 0.14 }, { k: 'pulse', at: 'mouth', s: 0.5, op: 0.25, col: '#fff0b0' }])
  });
  // Hohepriesterin Liora: weiß-goldenes Gewand, Kristallkrone in Gold, Zepter
  MON3_BUILD.liora = (b) => bsSorc3(b, 'liora', {
    skin: '#e8c8a0', skinTop: '#fff0d8', eye: '#ffd36a', hair: '#fff4d8', robe: '#f4ecd8', robeTop: '#ffffff', sleeve: '#e8dcc0', hem: '#ffd36a', hemTop: '#fff4c0',
    glow: '#ffe8a0', trim: '#ffd36a', gem: '#ffb84a', gemTop: '#fff4c0', cape: '#c8a040', capeEdge: '#fff4c0', capeIn: '#f4ecd8', staff: '#c8a040', staffTop: '#fff4c0',
    veil: '#fff4d8', crown: 'crystal', shoulder: 'plate', mantle: true, weapon: 'scepter', worldH: 5.2
  });
  BOSS3.liora = Object.assign({}, BS_SORC_BOSS3, {
    fx: 'sonne', emi: [0.12, 0.1, 0.04],
    ambient: bsAmb3('liora', [{ k: 'orbit', n: 5, R: 1.4, tex: 'spark' }, { k: 'pulse', at: 'weapon', s: 0.8, op: 0.3, col: '#fff0b0' }])
  });
  // Marmorhüter Tharn: Riese aus weißem Marmor mit Goldadern, Goldkrone, Marmorhammer
  bsWardReg3('tharn', {
    frame: 'giant', head: 'golem', crest: 'crown', cover: 'stone', pad: 'rock', weapon: 'maul', weaponK: 1.1,
    skin: '#e8e0cc', skinTop: '#fffaf0', stone: '#ece4d0', stoneTop: '#ffffff', vein: '#ffc040', eye: '#ffd36a', crown: '#c8a040', crownTop: '#ffe8a0',
    metal: '#c8a040', wood: '#8a6a3a', belt: '#8a6a3a', cloth: '#c8a040', gold: '#ffd36a', moss: '#d8c8a0', worldH: 5.0
  }, {
    fx: 'sonne', emit: 'weapon', lineStyle: 'smash', melee: ['slam2', 'chop', 'stomp'], emi: [0.1, 0.08, 0.03],
    ambient: bsAmb3('tharn', [{ k: 'rise', at: 'weapon', n: 3, sp: 1.1, r: 0.3, h: 0.8, s: 0.13, col: '#fff0b0' }, { k: 'pulse', at: 'crown', s: 0.8, op: 0.22 }])
  });
  // Aurex Lichtschwinge: Vogelfrau mit goldenem Gefieder und Federkamm, Krallen
  MON3_BUILD.aurex = (b) => bsHarpy3(b, 'aurex', {
    skin: '#f0d8a8', skinTop: '#fff0d0', eye: '#ffffff', hair: '#fff4d8', feather: '#ffd36a', featherTip: '#c8902a', featherB: '#f4e0a0', wingBone: '#a87a2a', wingTop: '#fff0b0',
    leg: '#c8a060', legD: '#8a7040', claw: '#3a2a1a', silver: '#e8c46a', silverTop: '#fff4c0', glow: '#fff0b0', wood: '#6a4a2a', crown: 'crest', weapon: 'claws', wingK: 1.25, worldH: 5.0
  });
  BOSS3.aurex = Object.assign({}, BS_HARPY_BOSS3, {
    fx: 'sonne', emi: [0.12, 0.1, 0.04], pts: Object.assign({}, BS_HARPY_PTS3, { weapon: [BB3.haR, BS_HARPY_P3[-1].Hd], emit: [BB3.haR, BS_HARPY_P3[-1].Hd] }),
    ambient: bsAmb3('aurex', [{ k: 'rise', at: 'back', n: 4, sp: 0.6, r: 0.9, h: 1.2, s: 0.14 }, { k: 'orbit', n: 4, R: 1.4, tex: 'spark' }])
  });
  // Solgar, der Sonnenwächter: Koloss aus weißem Marmor ohne Gesicht, goldene Adern, glühende Augen, Hammer; Licht
  // steigt aus Rücken und Krone
  MON3_BUILD.solgar = (b) => bsGiant3(b, 'solgar', {
    skin: '#e8e0cc', skinTop: '#fffaf0', eye: '#fffbe8', rune: '#ffc040', stone: '#f0e8d8', stoneTop: '#ffffff', bronze: '#c8a040', belt: '#a07a30',
    band: '#c8a040', bandTop: '#ffe08a', cloth: '#d8b050', wood: '#8a6a3a', golemHead: true, worldH: 7.6
  });
  BOSS3.solgar = Object.assign({}, BS_GIANT_BOSS3, {
    fx: 'sonne', emit: 'weapon', melee: ['chop', 'stomp', 'punch'], emi: [0.14, 0.11, 0.04],
    ambient(h, a, e, t, th) {
      if (!a.bones) return;
      bsAmbPart3(h, a, BOSS3.solgar, e, t, th, { k: 'rise', at: 'back', n: 6, sp: 0.45, r: 1.0, h: 2.6, s: 0.2 });
      bsAmbPart3(h, a, BOSS3.solgar, e, t, th, { k: 'rise', at: 'weapon', n: 3, sp: 1.2, r: 0.3, h: 0.8, s: 0.15, col: '#fff0b0' });
      bsAmbPart3(h, a, BOSS3.solgar, e, t, th, { k: 'pulse', at: 'core', s: 1.1, op: 0.28, col: '#ffd36a' });
      bsAmbPart3(h, a, BOSS3.solgar, e, t, th, { k: 'orbit', n: 6, R: 2.4, tex: 'spark' });
    }
  });

  // Wolkenhort -----------------------------------------------------------------------------------------------------
  // Aeris, die Windläuferin: weiße Federn mit blauen Spitzen, Federkamm, Fächer
  MON3_BUILD.aeris = (b) => bsHarpy3(b, 'aeris', {
    skin: '#e0e4f0', skinTop: '#f8faff', eye: '#3a8ae8', hair: '#c8d8f0', feather: '#f4f8ff', featherTip: '#8aa8d8', featherB: '#d0e0f4', wingBone: '#7a90b8', wingTop: '#e0ecff',
    leg: '#c8b890', legD: '#8a7a5a', claw: '#2a2e3a', silver: '#c8d4e8', silverTop: '#ffffff', glow: '#bfe4ff', wood: '#4a4a5a', crown: 'crest', weapon: 'fan', wingK: 1.3, worldH: 5.0
  });
  BOSS3.aeris = Object.assign({}, BS_HARPY_BOSS3, {
    fx: 'wind', jawOpen: 0.8, emi: [0.06, 0.08, 0.12], pts: Object.assign({}, BS_HARPY_PTS3, { weapon: [BB3.haR, [BS_HARPY_G3[0], BS_HARPY_G3[1], BS_HARPY_G3[2] + 0.5]], emit: [BB3.jaw, [0, 2.0, 0.18]] }),
    ambient: bsAmb3('aeris', [{ k: 'orbit', n: 5, R: 1.5, tex: 'spark' }, { k: 'ground', n: 3, sp: 0.4, r: 1.3, col: '#e8f2ff', op: 0.2 }])
  });
  // Kaelos, der Greifenfürst: Greif mit braunem Fell, weißem Gefieder an Kopf und Schwingen, goldenem Schnabelhorn
  MON3_BUILD.kaelos = (b) => bsDrake3(b, 'kaelos', {
    hide: '#a07848', hideTop: '#d8b888', scaleD: '#6a4a28', belly: '#f4ecd8', bellyTop: '#ffffff', armor: '#e8e0d0', armorTop: '#ffffff',
    horn: '#e8c040', hornTip: '#fff0a0', claw: '#3a2a1a', tooth: '#fff8e8', eye: '#ffd36a', lava: '#bfe4ff', lavaHi: '#ffffff',
    wingBone: '#8a6a40', wingTop: '#f4ecd8', mem: '#e8dcc4', memB: '#d8ccb0', memEdge: '#ffffff', horns: 'nubs', spineN: 14, lite: true, wingK: 1.15, worldH: 4.6
  });
  BOSS3.kaelos = Object.assign({}, BS_DRAKE_G3, {
    fx: 'wind', emi: [0.06, 0.07, 0.1],
    ambient: bsAmb3('kaelos', [{ k: 'orbit', n: 4, R: 1.8, tex: 'spark' }, { k: 'ground', n: 3, sp: 0.35, r: 1.4, col: '#e8f2ff', op: 0.2 }])
  });
  // Hrodmar Wolkenbart: Riese mit weißem Wolkenbart, goldenen Schulterstücken und Sturmstab; über ihm eine helle Wolke
  bsWardReg3('hrodmar', {
    frame: 'giant', head: 'giant', beardForm: 'cloud', pad: 'iron', cape: true, weapon: 'staff', weaponK: 1.2,
    skin: '#c8d4e4', skinTop: '#eef4ff', eye: '#3a8ae8', beard: '#ffffff', beard2: '#d8e4f4', hair: '#e8f0ff', vein: '#bfe4ff', iron: '#c8a050', ironTop: '#ffe8a0',
    gold: '#ffd36a', cape: '#5a7aa8', capeEdge: '#ffffff', wood: '#8a7a6a', glow: '#e8f6ff', belt: '#6a5a3a', cloth: '#4a6a98', band: '#c8a050', bandTop: '#ffe8a0', worldH: 5.2
  }, {
    fx: 'wind', emit: 'weapon', melee: ['slam2', 'punch', 'chop'], emi: [0.06, 0.08, 0.12],
    ambient(h, a, e, t, th) {
      if (!a.bones) return;
      bsPtA3(a, BOSS3.hrodmar, 'crown', _b3P);
      const cx = _b3P.x, cy = _b3P.y + 2.2, cz = _b3P.z;
      for (let i = 0; i < 5; i++) bsSmoke3(h, cx + Math.sin(i * 1.26 + t * 0.25) * 1.2, cy + Math.cos(i * 2.1) * 0.2, cz + Math.cos(i * 1.26 + t * 0.25) * 0.9, 1.3 + 0.3 * Math.sin(t + i), '#e8f0fa', 0.45);
      if ((t * 2.2) % 1 < 0.14) {
        _b3P2.set(cx + Math.sin(t * 7) * 0.7, cy - 0.2, cz);
        bsPtA3(a, BOSS3.hrodmar, 'weapon', _b3N);
        if (_b3N.distanceTo(_b3P2) < 7) bsBolt3(h, _b3P2, _b3N, th, 0.03, 0.9, 6);
      }
    }
  });
  // Ventra, Herrin der Böen: helles, wehendes Gewand, Krone aus Eiszacken, Zepter; Böen kreisen um sie
  MON3_BUILD.ventra = (b) => bsSorc3(b, 'ventra', {
    skin: '#dce8f8', skinTop: '#f8fbff', eye: '#3a8ae8', hair: '#ffffff', robe: '#a8c4e4', robeTop: '#e8f2ff', sleeve: '#90b0d8', hem: '#ffffff', hemTop: '#ffffff',
    glow: '#e8f6ff', trim: '#ffffff', gem: '#bfe4ff', gemTop: '#ffffff', cape: '#7a98c8', capeEdge: '#ffffff', capeIn: '#a8c4e4', staff: '#c8d4e8', staffTop: '#ffffff',
    crown: 'ice', shoulder: 'shard', mantle: true, torn: true, wispHem: true, weapon: 'scepter', worldH: 5.2
  });
  BOSS3.ventra = Object.assign({}, BS_SORC_BOSS3, {
    fx: 'wind', emi: [0.06, 0.08, 0.12],
    ambient: bsAmb3('ventra', [{ k: 'orbit', n: 6, R: 1.5, tex: 'spark' }, { k: 'ground', n: 3, sp: 0.4, r: 1.2, col: '#e8f2ff', op: 0.22 }, { k: 'bolt', at: 'weapon', to: 'core', sp: 2.4, w: 0.02 }])
  });
  // Vindrakor, der Sturmdrache: hellblaue Schuppen, weißer Bauch, Widderhörner, Kristallzacken auf Rücken und Schwanz;
  // über ihm ballen sich Wolken, Blitze schlagen in seine Hörner
  MON3_BUILD.vindrakor = (b) => bsDrake3(b, 'vindrakor', {
    hide: '#4e6c9e', hideTop: '#9ab8e4', scaleD: '#22385a', belly: '#e0ecfa', bellyTop: '#ffffff', armor: '#8aa8d4', armorTop: '#e8f2ff',
    horn: '#e8eef8', hornTip: '#ffffff', claw: '#e8eef8', tooth: '#ffffff', eye: '#ffffff', lava: '#bfe4ff', lavaHi: '#ffffff',
    wingBone: '#3a5a8a', wingTop: '#a8c4ec', mem: '#7a9ac8', memB: '#6a88b8', memEdge: '#ffffff', horns: 'ram', spines: 'crystal', tailEnd: 'crystal', wingK: 1.2, worldH: 7.6
  });
  BOSS3.vindrakor = Object.assign({}, BS_DRAKE_BOSS3, {
    fx: 'wind', emi: [0.06, 0.08, 0.13],
    ambient(h, a, e, t, th) {
      if (!a.bones) return;
      bsPtA3(a, BOSS3.vindrakor, 'back', _b3P);
      const cx = _b3P.x, cy = _b3P.y + 2.6, cz = _b3P.z;
      for (let i = 0; i < 6; i++) bsSmoke3(h, cx + Math.sin(i * 1.05 + t * 0.2) * 1.8, cy + Math.cos(i * 2.1) * 0.25, cz + Math.cos(i * 1.05 + t * 0.2) * 1.3, 1.6 + 0.3 * Math.sin(t + i), i % 2 ? '#5a6a88' : '#8a9ab8', 0.45);
      if ((t * 1.9) % 1 < 0.14) {
        _b3P2.set(cx + Math.sin(t * 5) * 1.0, cy - 0.3, cz);
        bsPtA3(a, BOSS3.vindrakor, 'mouth', _b3N);
        if (_b3N.distanceTo(_b3P2) < 9) bsBolt3(h, _b3P2, _b3N, th, 0.035, 0.95, 7);
      }
      bsAmbPart3(h, a, BOSS3.vindrakor, e, t, th, { k: 'orbit', n: 5, R: 2.6, tex: 'spark' });
    }
  });
}

// --- Zeichen am Tor (Schlussstein): Muschel, aufgehende Sonne, Schwingen -------------------------------------------
if (typeof emblem3 === 'function') {
  const _i82Emblem = emblem3;
  // eslint-disable-next-line no-global-assign
  emblem3 = function (R, kind, L, P, k = 1) {
    const at = (x, y, z = 0) => [P[0] + x * k, P[1] + y * k, P[2] + z * k];
    const g = { mat: 'glow' };
    if (kind === 'shell') {
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.36;
        R(box3(), i % 2 ? '#f0e4dc' : '#ffffff', { p: at(Math.sin(a) * 0.06, -0.04 + Math.cos(a) * 0.06, 0.02), r: [0, 0, -a], s: [0.035 * k, 0.15 * k, 0.02 * k], shade: 0.2 });
      }
      R(ball(8), L.accent, Object.assign({ p: at(0, -0.06, 0.04), s: 0.028 * k }, g));
      return;
    }
    if (kind === 'sun') {
      R(ball(10), L.accent, Object.assign({ p: at(0, -0.04, 0.02), s: [0.08 * k, 0.08 * k, 0.02 * k] }, g));
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.15 + i * 0.175);
        R(box3(), '#fff2c0', Object.assign({ p: at(Math.cos(a) * 0.13, -0.04 + Math.sin(a) * 0.13, 0.015), r: [0, 0, a - Math.PI / 2], s: [0.018 * k, 0.06 * k, 0.012 * k] }, g));
      }
      R(box3(), '#d8b050', { p: at(0, -0.09, 0.025), s: [0.26 * k, 0.025 * k, 0.03 * k], shine: 1 });
      return;
    }
    if (kind === 'wing') {
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
        R(box3(), i % 2 ? '#ffffff' : '#e8f2ff', { p: at(sx * (0.04 + i * 0.03), 0.0 + i * 0.012, 0.02), r: [0, 0, -sx * (0.5 + i * 0.25)], s: [0.025 * k, (0.16 - i * 0.025) * k, 0.015 * k], shade: 0.2 });
      }
      R(ball(8), L.accent, Object.assign({ p: at(0, -0.02, 0.035), s: 0.026 * k }, g));
      return;
    }
    return _i82Emblem(R, kind, L, P, k);
  };
}

// --- Schwebende Teilchen der Instanzen (umgebung.js, AMBIENT) -------------------------------------------------------
if (typeof AMBIENT !== 'undefined') {
  Object.assign(AMBIENT, {
    // Luftblasen steigen in der Grotte auf
    blasen: { rate: 4, o: { color: ['#bff8f0', '#e8fffc', '#8ff0e8'], angle: -Math.PI / 2, spread: 0.3, speed: [10, 24], life: [3, 5], size: [1.4, 2.6], drag: 0.2 } },
    // Goldstaub schwebt im Licht des Tempels
    goldstaub: { rate: 5, o: { color: ['#fff0b0', '#ffd36a', '#ffffff'], speed: [4, 12], life: [3, 5], size: [1, 2], drag: 0.3, gravity: -1 } },
    // Wolkenfetzen ziehen durch den Hort
    wolkenfetzen: { rate: 3, o: { color: ['#ffffff', '#e8f2ff', '#d8e6f8'], angle: 0.15, spread: 0.2, speed: [18, 34], life: [3, 5], size: [1.4, 2.6], drag: 0.1, glow: false } }
  });
}
