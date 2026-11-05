// Map 10: Kristallabgrund (seit 13.85) – das Endgebiet für Stufe 75–80.
// Die Daten stehen wie bei allen Maps in den Datendateien (daten/zonen.js: Map, Gebiete, Dungeon und Endboss;
// daten/monster.js: Monster und die Steine 75/80; daten/nachtmonster.js; daten/instanzen.js: zwei Lv-80-Instanzen;
// daten/quests.js: Epilog und Kapitel 10). Stadt, Leute, Stände, Mauer, Weltentor, Wanderer, Risse, Steine und Monster
// entstehen über dieselben Wege wie auf jeder anderen Map (welt.js, gegner.js, instanzen.js).
// Hier steht nur, was die neue Gegend anders aussehen lässt – alles als Ergänzung der bestehenden Tabellen:
//   - Bodenfarben für KRISTALL (violetter Fels) und ABGRUND (dunkle Spalte), Kartenfarben, Bodenstruktur in 3D
//   - die Spalten in 3D als eigene „Flüssigkeit“ (LIQUID3.abyss): tiefes Dunkel mit schwachem Licht von unten
//   - Stimmung (Himmel, Licht, Nebel), schwebende Kristallsplitter, Felsen, Kristalle, Kristallbäume, Randkulisse
//   - Aussehen der neuen Monster (2D-Zeichnungen; das 3D-Modell entsteht daraus wie bei allen Monstern),
//     Köpfe, Färbung, Angriffsart, Stimme und das Gebietsthema der 3D-Modelle (Kristallsplitter statt Glut)
// Keine Bodenrunen, Ringe oder Sterne als Schmuck.

const K80_STYLES = new Set(['lichtwacht', 'kristallhang', 'leerenschlund']);

// --- Boden ---------------------------------------------------------------------------------------------
(function k80Ground() {
  // 2D und 3D: Farbverlauf (dunkel → hell) je Bodenart, Index = GROUND.*
  const add = (g, a, b) => {
    GROUND_SHADES[g] = [a, b];
    GROUND_PALETTE[g] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
  };
  add(GROUND.KRISTALL, '#2c2846', '#4c4474');
  add(GROUND.ABGRUND, '#08060f', '#16122a');
  if (typeof MAP_COLORS !== 'undefined') {
    MAP_COLORS[GROUND.KRISTALL] = [70, 62, 108];
    MAP_COLORS[GROUND.ABGRUND] = [16, 12, 30];
  }
  // 3D-Feinstruktur: Risse wie Asche und Basalt
  if (typeof SOIL3 !== 'undefined') SOIL3[GROUND.KRISTALL] = 5;
})();

// Abgrundspalte in 3D: fast schwarz, in der Tiefe treiben schwache violette Lichtadern, am Rand ein kalter Schimmer
if (typeof LIQUID3 !== 'undefined') {
  LIQUID3.abyss = {
    shallow: '#3a2c7a', deep: '#040309', foam: '#a898ff', alpha: 1, frag: `
          vec2 q = p * 0.8;
          q += vec2(sin(q.y * 1.1 + t * 0.12), cos(q.x * 0.9 - t * 0.1)) * 0.6;
          float f = sin(q.x * 1.9 + t * 0.2) * sin(q.y * 2.2 - t * 0.17) + 0.4 * sin((q.x + q.y) * 2.9 + t * 0.25);
          float vein = 1.0 - smoothstep(0.03, 0.3, abs(f));
          vec3 col = mix(uShallow * 0.5, uDeep, smoothstep(0.0, 0.45, d));
          col += uFoam * vein * (0.1 + 0.06 * sin(t * 1.1 + p.x * 0.5 + p.y * 0.3));
          vec2 cell = floor(p * 1.6);
          float h = fract(sin(dot(cell, vec2(17.31, 91.7))) * 43758.5453);
          vec2 c = (cell + 0.25 + 0.5 * vec2(fract(h * 5.3), fract(h * 9.1))) / 1.6;
          float tw = smoothstep(0.6, 1.0, sin(t * 1.4 + h * 30.0)) * step(h, 0.35);
          col += vec3(0.75, 0.82, 1.0) * smoothstep(0.035, 0.0, length(p - c)) * tw * 0.5;
          col = mix(col, uShallow * 1.2, smoothstep(0.22, 0.0, d) * 0.55);
          float alpha = 1.0;`
  };
}

// Schwebende Kristallsplitter und kalter Dunst (umgebung.js, AMBIENT)
if (typeof AMBIENT !== 'undefined') {
  AMBIENT.shards = { rate: 5, o: { color: ['#cfe4ff', '#b8a8ff', '#e8e4ff'], angle: -Math.PI / 2, spread: 0.9, speed: [5, 14], life: [3, 5.5], size: [1.2, 2.4], drag: 0.3, gravity: -1 } };
}

// --- Stimmung in 3D: kühles Violett, nach außen dunkler und nebliger ----------------------------------------
if (typeof MOOD3 !== 'undefined') {
  Object.assign(MOOD3, {
    lichtwacht: { sky: '#6e6ea8', sun: '#ece8ff', sunI: 0.86, hemi: '#d8d4f4', ground: '#3a3458', hemiI: 0.64, near: 26, far: 60 },
    kristallhang: { sky: '#5c5c98', sun: '#e0dcff', sunI: 0.8, hemi: '#ccc8f0', ground: '#2e2848', hemiI: 0.6, near: 22, far: 54 },
    leerenschlund: { sky: '#423e74', sun: '#ccc4ff', sunI: 0.74, hemi: '#b4ace8', ground: '#1e1a34', hemiI: 0.56, near: 19, far: 48 }
  });
}

// --- Felsen, Bodenschmuck, Bäume, Rand -----------------------------------------------------------------------
if (typeof ROCK_STYLES !== 'undefined') {
  ROCK_STYLES.lichtwacht = ['#4a4470', '#6a6298', null];
  ROCK_STYLES.kristallhang = ['#3e3864', '#5c548e', null];
  ROCK_STYLES.leerenschlund = ['#2e2a4c', '#4a4278', null];
}
if (typeof DECO_COLORS !== 'undefined') {
  const k = { wood: '#2a2440', bone: '#d8d4e8', crystal: '#a890ff', crystalBase: '#2a2444', glow: true, tuft: null };
  DECO_COLORS.lichtwacht = { ...k, crystal: '#9fd8ff' };
  DECO_COLORS.kristallhang = { ...k, crystal: '#9fc8ff' };
  DECO_COLORS.leerenschlund = k;
}

// Kristall: Prisma mit Spitze (wie die Kristallgruppen), geneigt um tilt, gedreht um yaw
const _k80q = new THREE.Quaternion();
const _k80e = new THREE.Euler();
const _k80p = new THREE.Vector3();
function k80Gem(b, M, p, tilt, yaw, r, h, col, tip, top, glow) {
  const G = new THREE.Matrix4().compose(_k80p.set(p[0], p[1], p[2]), _k80q.setFromEuler(_k80e.set(0, yaw, -tilt, 'YXZ')), _stOne);
  const base = M ? M.clone().multiply(G) : G;
  const mat = glow ? { mat: 'glow' } : {};
  b.add(crystalGeo('body'), col, { m: atM3(base, [0, 0, 0], null, [r, h, r]), top, topK: 0.75, shade: 0.3, shine: 1, ...mat });
  b.add(crystalGeo('tip'), tip, { m: atM3(base, [0, h, 0], null, [r, r * 1.6, r]), shine: 1, ...mat });
}

if (typeof WORLD3 !== 'undefined') {
  // Kristallbaum: dunkler Steinstamm mit kurzen Ästen, an deren Enden und oben Kristalle wachsen
  const baseDead = WORLD3.dead;
  WORLD3.dead = function (b, M, v, style) {
    if (!K80_STYLES.has(style)) return baseDead.call(this, b, M, v, style);
    const m = v === 1 ? -1 : 1;
    const bark = '#2a2440';
    b.add(lathe3('k80trunk', [[0.24, 0], [0.16, 0.12], [0.11, 0.6], [0.08, 1.0], [0, 1.08]], 6), bark, { parent: M, shade: 0.35, top: '#4a4070', topK: 0.35, r: [0, 0, 0.04 * m] });
    const cols = [['#7a68d8', '#d8ccff', '#a898f0'], ['#6aa0f0', '#e0f0ff', '#9fc8ff']];
    const arms = [[0.5, [0.42 * m, 0.88, 0.06], 0.75 * m], [0.72, [-0.38 * m, 1.06, -0.06], -0.7 * m], [0.9, [0.16 * m, 1.24, 0.26], 0.35 * m]];
    if (v === 2) arms.push([0.32, [-0.3 * m, 0.55, 0.18], -0.9 * m]);
    arms.forEach(([y, z, tilt], k) => {
      stick3(b, [0, y, 0], z, 0.06, 0.03, bark, { round: true });
      const [c, tip, top] = cols[k % 2];
      k80Gem(b, M, z, tilt, k * 1.7 + v, 0.075, 0.42 - k * 0.04, c, tip, top, k === 1);
    });
    // Krone: ein großer Kristall und zwei schräge
    const [c0, t0, p0] = cols[v % 2];
    k80Gem(b, M, [0, 1.02, 0], 0.08 * m, v, 0.12, 0.78, c0, t0, p0, false);
    k80Gem(b, M, [0.05, 1.0, 0.02], 0.55 * m, 1 + v, 0.07, 0.42, c0, t0, p0, true);
    k80Gem(b, M, [-0.04, 1.0, -0.03], -0.5 * m, 2.4 + v, 0.065, 0.36, cols[(v + 1) % 2][0], cols[(v + 1) % 2][1], cols[(v + 1) % 2][2], false);
  };
  // Felsen: violetter Stein (ROCK_STYLES), auf manchen ein kleiner Kristall
  const baseRock = WORLD3.rock;
  WORLD3.rock = function (b, M, v, style) {
    baseRock.call(this, b, M, v, style);
    if (!K80_STYLES.has(style) || v === 1) return;
    const s = [1, 0.85, 1.15][v];
    k80Gem(b, M, [0.12 * s, 0.32 * s, 0.05], 0.35, v * 2, 0.06 * s, 0.32 * s, '#8a78e0', '#e0dcff', '#b8a8ff', v === 2);
    k80Gem(b, M, [-0.05 * s, 0.34 * s, -0.1], -0.25, v + 1, 0.045 * s, 0.22 * s, '#6aa0f0', '#e0f0ff', '#9fc8ff', false);
  };
}

// Randkulisse: Felsklippen aus dunklem violettem Gestein, darauf große Kristallsäulen (KUL3_FORM in drei-welt.js)
if (typeof KUL3_FORM !== 'undefined' && typeof BORDER3 !== 'undefined') {
  KUL3_FORM.kristall = {
    hw: 6.2, hf: 5.2,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      b.add(rockGeo(v), T('#2c2646'), { s: [1.55, 2.3, 1.25], p: [0, -0.15, 0], top: T('#4a4272'), topK: 0.5, shade: 0.4 });
      b.add(rockGeo((v + 1) % 3), T('#342e54'), { s: [1.0, 1.4, 0.9], p: [0.8 * m, -0.1, 0.35], top: T('#524a82'), topK: 0.5, shade: 0.4 });
      k80Gem(b, null, [-0.35 * m, 1.2, 0.05], 0.1 * m, v, 0.42, 3.6 + v * 0.4, T('#5a4ca8'), T('#d8d0ff'), T('#9a8ae8'), false);
      k80Gem(b, null, [0.45 * m, 0.9, 0.3], -0.25 * m, v + 2, 0.3, 2.3, T('#4a64b8'), T('#e0f0ff'), T('#8ab8f0'), false);
      if (v !== 1) k80Gem(b, null, [0.05 * m, 0.6, 0.75], 0.45 * m, v + 4, 0.14, 1.1, '#b8a8ff', '#ffffff', '#e0d8ff', true);
    },
    fern(b, v, T) {
      b.add(rockGeo(v, 0), T('#2c2646'), { s: [1.9, 2.5, 1.6], p: [0, -0.2, 0], top: T('#4a4272'), topK: 0.5, shade: 0.4 });
      k80Gem(b, null, [0.2, 1.4, 0], 0.08, v, 0.5, 3.4, T('#4e4296'), T('#c8c0f4'), T('#8a7ad8'), false);
      k80Gem(b, null, [1.0, 0.8, 0.4], -0.3, v + 1, 0.32, 2.0, T('#44589e'), T('#d0e4ff'), T('#7aa4e0'), false);
    },
    busch(b, v) {
      b.add(rockGeo(v, 0), '#2e2848', { s: [0.36, 0.3, 0.3], p: [0, 0.02, 0], top: '#4a4272', topK: 0.5, shade: 0.3 });
      k80Gem(b, null, [0.02, 0.15, 0], 0.15, v, 0.08, 0.5, '#7a68d8', '#e0dcff', '#a898f0', false);
      k80Gem(b, null, [0.12, 0.12, 0.08], 0.7, v + 2, 0.05, 0.3, '#6aa0f0', '#e0f0ff', '#9fc8ff', true);
    }
  };
  for (const id of ['lichtwacht', 'kristallhang', 'leerenschlund']) {
    BORDER3[id] = { id, form: 'kristall', saum: [['rock', id, 2.1], ['dead', id, 1.35, 4]], far: '#2a2648' };
  }
}

// --- Dungeon-Tor der Kristallkaverne (RIFT_LOOK in drei-figuren.js) ------------------------------------------
if (typeof RIFT_LOOK !== 'undefined') {
  RIFT_LOOK.kristallkaverne = { id: 'kristallkaverne', stone: '#4a4878', top: '#8a88c8', topK: 0.6, accent: '#9fd8ff', deep: '#0e1442', mid: '#9fd8ff', core: '#ffffff', motes: 'snow', spin: 0.9, deco: 'ice', emblem: null };
}

// --- Monster ------------------------------------------------------------------------------------------------
// 3D-Thema des Gebiets: leuchtende Kristallzacken auf Rücken und Schultern, dazu Kristallsplitter als Zubehör
if (typeof MON3_THEMES !== 'undefined') {
  MON3_THEMES.kristall = { spike: '#4a3e7a', glow: '#b8a8ff', hot: true, acc: 'spark' };
  Object.assign(MON3_ZONE_THEME, { lichtwacht: 'kristall', kristallhang: 'kristall', leerenschlund: 'kristall', kristallkaverne: 'kristall', raid_aelvyr: 'kristall' });
  // falls die Themen schon einmal berechnet wurden: neu berechnen lassen
  if (typeof mon3ThemeOf !== 'undefined' && mon3ThemeOf) mon3ThemeOf = null;
}

// 2D-Zeichnungen (daraus auch das 3D-Modell): Golem, Spinne, Katze, Geist, Ritter, Drache
const K80_GOLEM = (skin, crack, sc) => (ctx, f) => humanoidMonsterArt(ctx, f, {
  scale: sc, belly: true, skin, pants: darker(skin, 0.25), boots: darker(skin, 0.45), sleeve: skin, gloves: lighter(skin, 0.1), cracks: crack,
  head: (ctx, cx, cy) => {
    for (const [x, h, c] of [[-7, 9, '#9fc8ff'], [-2, 14, crack], [3, 10, '#9fc8ff']]) poly(ctx, [[cx + x - 2.5, cy - 8], [cx + x, cy - 8 - h], [cx + x + 2.5, cy - 8]], c);
    monsterEye(ctx, cx + 5.5, cy - 0.5, 2, '#f0ecff', true);
    ctx.globalAlpha = 0.55;
    dot(ctx, cx + 5.5, cy - 0.5, 4.4, 4, crack);
    ctx.globalAlpha = 1;
    box(ctx, cx + 3, cy + 4, 7, 2.6, 1, crack);
  }
});
Object.assign(MONSTER_ART, {
  kristallgolem: { h: 72, draw: K80_GOLEM('#4a3e78', '#c8b0ff', 1.6) },
  kavernenwaechter: { h: 70, draw: K80_GOLEM('#4a5a98', '#9fe8ff', 1.55) },
  splitterspinne: { h: 30, draw: (ctx, f) => { ctx.scale(1.35, 1.35); spiderArt(ctx, f, { body: '#2e2850', mark: '#9fd8ff', eye: '#e0d8ff' }); } },
  schattenpirscher: { h: 32, draw: beastIn(1.22, { fur: '#1c1830', belly: '#2a2444', snout: '#2a2444', cat: true, longTail: true, tailTip: '#9a7aff', stripes: '#8a6aff', glowStripes: true, eye: '#d8ccff', glow: true, angry: true, fangs: true }) },
  abgrundgeist: { h: 50, draw: (ctx, f) => { ctx.scale(1.12, 1.12); ghostArt(ctx, f, { body: '#7a86d8', crown: '#cfe0ff', eye: '#ffffff' }); } },
  leerenritter: {
    h: 56, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.2, skin: '#8a86a8', pants: '#1e1a30', boots: '#141024', torso: '#2a2444', sleeve: '#3a3260', gloves: '#2a2444', belt: '#9a7aff', pauldron: '#4a4070', spikes: true, cape: '#3a1a6a', runes: '#b8a0ff', weapon: 'sword',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 6, cy - 9], [cx - 12, cy - 21], [cx - 3, cy - 12]], '#1e1a30');
        poly(ctx, [[cx + 3, cy - 11], [cx + 6, cy - 22], [cx + 8, cy - 10]], '#1e1a30');
        paintShape(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy - 1, 11.8, Math.PI * 0.85, Math.PI * 2.15); ctx.closePath(); }, '#3a3458', cx - 11.8, cy - 12.8, 23.6, 13);
        box(ctx, cx - 12, cy - 2, 24, 4, 1.4, '#2a2444');
        box(ctx, cx + 2, cy - 1.4, 9, 1.6, 0.6, '#d8ccff');
      }
    })
  },
  kristallwyrm: {
    h: 62, draw: (ctx, f) => {
      ctx.scale(1.6, 1.6);
      dragonWings(ctx, f, '#3a3a7a');
      beastArt(ctx, f, { fur: '#4a5aa8', belly: '#bfe0ff', snout: '#5a6ab8', ridge: true, eye: '#e0f0ff', angry: true, glow: true, fangs: true, tusk: true });
    }
  },
  leerenseherin: {
    h: 50, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.05, skin: '#b8b0d8', boots: '#141024', robe: '#2a2050', sleeve: '#2a2050', gloves: '#b8b0d8', wideSleeves: true, tattered: true, necklace: true, runes: '#b8a0ff', weapon: 'skullstaff', weaponAngle: -1.35,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 12, cy + 6], [cx - 12, cy - 4], [cx - 4, cy - 13], [cx + 7, cy - 10], [cx + 11.5, cy - 2], [cx + 3, cy - 3], [cx - 2, cy + 6]], '#2a2050');
        monsterEye(ctx, cx + 5.6, cy - 0.8, 1.8, '#d8ccff', true);
      }
    })
  },
  vaelith: {
    h: 92, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.9, skin: '#d8d4f0', boots: '#1e1838', robe: '#3a2a6a', sleeve: '#4a3a8a', gloves: '#d8d4f0', wideSleeves: true, belt: '#9fd8ff', necklace: true, runes: '#cfe4ff', cape: '#2a1a5a', weapon: 'skullstaff', weaponAngle: -1.3,
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 11, cy + 10], [cx - 12, cy - 4], [cx - 4, cy - 11], [cx + 4, cy - 10], [cx - 3, cy - 2], [cx - 6, cy + 12]], '#e8e4ff');
        for (const x of [-6, -1, 4]) poly(ctx, [[cx + x - 2, cy - 9], [cx + x, cy - 19], [cx + x + 2, cy - 9]], '#9fd8ff');
        monsterEye(ctx, cx + 5.6, cy - 0.6, 1.8, '#b8a8ff', true);
      }
    })
  },
  // Nachtmonster
  leerenwolf: { h: 34, draw: beastIn(1.24, { fur: '#2a2848', belly: '#3e3a64', ruff: '#5a5490', mane: '#1a1830', bushy: true, eye: '#c8b8ff', glow: true, angry: true, fangs: true, lean: true }) },
  sternenschemen: { h: 44, draw: (ctx, f) => { ctx.scale(0.98, 0.98); ghostArt(ctx, f, { body: '#c8c0ff', crown: '#ffffff', eye: '#9fd8ff' }); } }
});
// Monster, die wie eine dieser Arten aussehen (Endboss, Instanz-Gegner): figuren.js hat sie beim Laden noch nicht gekannt
for (const [id, t] of Object.entries(MONSTER_TYPES)) {
  if ((t.raid || t.look) && !MONSTER_ART[id]) MONSTER_ART[id] = MONSTER_ART[t.raid ? t.raid.art : t.look];
}

// Köpfe der Menschenartigen in 3D, Färbung und Bauart (drei-figuren.js)
if (typeof HEAD3 !== 'undefined') {
  Object.assign(HEAD3, {
    kristallgolem: { golem: true, cracks: '#c8b0ff' },
    kavernenwaechter: { golem: true, cracks: '#9fe8ff' },
    leerenritter: { helmet: '#3a3458', horns: '#1e1a30' },
    leerenseherin: { hood: '#2a2050' },
    vaelith: { hairLong: '#e8e4ff', crown: '#9fd8ff' }
  });
}
if (typeof MON3_LOOK !== 'undefined') {
  Object.assign(MON3_LOOK, {
    kavernenwaechter: { golemStyle: 'ice' },
    splitterspinne: { legs: 1.12, glowMark: true, speckle: '#9fd8ff', venom: '#cfe4ff' },
    abgrundgeist: { longFingers: true },
    sternenschemen: { iceFingers: '#e8f0ff' },
    kristallwyrm: { coins: null, tailBlade: '#2a2a5a' }
  });
}
if (typeof ATTACK_STYLE !== 'undefined') {
  Object.assign(ATTACK_STYLE, {
    kristallgolem: 'slam', kavernenwaechter: 'slam', splitterspinne: 'fang', schattenpirscher: 'pounce', kristallwyrm: 'breath', leerenwolf: 'bite'
  });
}
if (typeof VOICE_OF !== 'undefined') {
  Object.assign(VOICE_OF, {
    kristallgolem: 'golem', kavernenwaechter: 'golem', splitterspinne: 'spider', schattenpirscher: 'cat', abgrundgeist: 'ghost',
    sternenschemen: 'ghost', leerenwolf: 'wolf', kristallwyrm: 'dragon', aelvyr: 'dragon'
  });
}
