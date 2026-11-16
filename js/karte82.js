// Maps 18 und 19: Nebelküste und Himmelsterrassen – zwei weitere ruhige gemeinsame Karten für Stufe 80 nach dem Muster
// des Seelenhains (karte81.js): wenige Monster, sehr viele Seelensteine der Stufen 70, 75 und 80.
// Die Daten stehen wie bei allen Maps in den Datendateien (daten/zonen.js: Maps und Gebiete; daten/monster.js: die sechs
// eigenen Arten; daten/gegenstaende.js: ihre Teile; daten/kartenformen.js: Grundform der Karten und die Lager Leuchtwacht
// und Sonnenhof; daten/nachtmonster.js; welt.js: Böden, Leute, Stadtschmuck, Teleportstein-Farbe; stadtschmuck.js).
// Für die beiden Karten ist die Welt um eine Reihe nach unten gewachsen (welt.js, EXTRA_H).
// Hier steht, was die Gegenden aussehen lässt, wie sie aussehen – alles als Ergänzung der bestehenden Tabellen:
//   - Böden STRANDSAND, DUENENGRAS, GOLDGRAS, HELLSTEIN (2D, 3D, Karte, Gras in 3D)
//   - Grundformen: „kueste“ (Meer im Osten mit Buchten, Strand und Strandseen, Landzunge im Südosten) und „himmel“
//     (flache Terrassenkanten aus weißem Stein mit Rampen, klare Teiche) für FORM_BUILDERS (kartenformen.js)
//   - Stimmung in 3D (kühler Nebel an der Küste, helles warmes Licht auf den Terrassen), Musik, Teilchen
//   - Felsen, Schmuck, Bäume (Küstenkiefern, blühende Bäume), Mauer aus weißem Stein (Z), Randkulisse und Rand bis zum
//     Horizont (an der Küste im Osten das Meer), Meer in Graugrün
//   - Leuchtturm vor Leuchtwacht und Nebelbänke (nur Bild, wie wahrzeichen.js)
//   - Monster: Zeichnungen der sechs Arten (daraus das 3D-Modell), Köpfe, Angriffe, Stimmen
// Die Ecken oben links und unten rechts beider Karten bleiben frei begehbar (Platz für spätere Instanz-Tore).
// Keine Bodenringe, Runen oder Sterne als Schmuck.

const K82_KUESTE = new Set(['leuchtwacht', 'nebelkueste']);
const K82_HIMMEL = new Set(['sonnenhof', 'himmelsterrassen']);

// --- Böden --------------------------------------------------------------------------------------------------
(function k82Ground() {
  const add = (g, a, b, map) => {
    GROUND_SHADES[g] = [a, b];
    GROUND_PALETTE[g] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
    if (typeof MAP_COLORS !== 'undefined') MAP_COLORS[g] = map;
  };
  add(GROUND.STRANDSAND, '#a29c88', '#c2bca6', [200, 194, 176]); // heller, kühler Strand
  add(GROUND.DUENENGRAS, '#647462', '#8a9882', [124, 140, 118]); // graugrünes Dünengras
  add(GROUND.GOLDGRAS, '#7e7a3e', '#a0944e', [186, 168, 98]);    // goldenes Gras der Hochebene
  add(GROUND.HELLSTEIN, '#9c968a', '#bcb6a8', [214, 210, 198]);  // weißer Fels
  if (typeof SOIL3 !== 'undefined') {
    SOIL3[GROUND.STRANDSAND] = 2;
    SOIL3[GROUND.DUENENGRAS] = 0;
    SOIL3[GROUND.GOLDGRAS] = 0;
  }
  if (typeof GRASS3 !== 'undefined') {
    GRASS3[GROUND.STRANDSAND] = '#a8b096';
    GRASS3[GROUND.DUENENGRAS] = '#8a9a7e';
    GRASS3[GROUND.GOLDGRAS] = '#c0a84a';
    GRASS3[GROUND.HELLSTEIN] = '#c8b462';
    // Dünengras in hohen, lockeren Büscheln, am Strand nur selten; goldenes Gras dicht
    Object.assign(GRASS3_SPARSE, { [GROUND.STRANDSAND]: 15, [GROUND.DUENENGRAS]: 2, [GROUND.HELLSTEIN]: 11 });
    if (typeof GRASS3_DENSE !== 'undefined') GRASS3_DENSE.add(GROUND.GOLDGRAS);
  }
})();

// --- Stimmung in 3D: an der Küste kühles Grau mit nahem Nebel, auf den Terrassen klares, warmes Sonnenlicht ---------
if (typeof MOOD3 !== 'undefined') {
  Object.assign(MOOD3, {
    leuchtwacht: { sky: '#a6b4b0', sun: '#e8eee8', sunI: 0.74, hemi: '#d8e2de', ground: '#5a645a', hemiI: 0.6, near: 22, far: 54 },
    nebelkueste: { sky: '#9eaeaa', sun: '#e2e8e4', sunI: 0.7, hemi: '#d2dcd8', ground: '#525e56', hemiI: 0.58, near: 16, far: 44 },
    sonnenhof: { sky: '#9ccaee', sun: '#fff4e2', sunI: 0.88, hemi: '#eef0e6', ground: '#7a7044', hemiI: 0.58 },
    himmelsterrassen: { sky: '#94c6ee', sun: '#fff4e0', sunI: 0.9, hemi: '#eceee4', ground: '#787044', hemiI: 0.58, near: 34, far: 76 }
  });
}
// Musik: an der Küste die kühle, langsame Stimmung, auf den Terrassen die helle (eigene Kompositionen, musik.js)
if (typeof music !== 'undefined' && music.moodAt) {
  const baseMood = music.moodAt;
  music.moodAt = function (x, y) {
    const z = zoneAt(x, y);
    if (z && z.id === 'nebelkueste') return 'kalt';
    if (z && z.id === 'himmelsterrassen') return 'feld';
    return baseMood.call(this, x, y);
  };
}
// Teilchen: ziehende Nebelfetzen an der Küste, fallende Blütenblätter auf den Terrassen (umgebung.js, AMBIENT)
if (typeof AMBIENT !== 'undefined') {
  AMBIENT.nebelschwaden = { rate: 3, o: { color: ['#c8d4d0', '#b8c6c2', '#d8e2de'], angle: 0.1, spread: 0.25, speed: [6, 14], life: [4, 7], size: [1, 1.8], drag: 0.1, glow: false } };
  AMBIENT.blueten = { rate: 3, o: { color: ['#fff4f6', '#ffe2ea', '#fff2c8', '#ffffff'], angle: 0.6, spread: 0.5, speed: [10, 22], life: [3, 5], size: [1.4, 2.4], drag: 0.2, gravity: 4, glow: false } };
}

// --- Felsen, Bodenschmuck -------------------------------------------------------------------------------------
if (typeof ROCK_STYLES !== 'undefined') {
  Object.assign(ROCK_STYLES, {
    leuchtwacht: ['#66706c', '#8c9692', null],
    nebelkueste: ['#5e6864', '#86908c', '#5a7266'],
    sonnenhof: ['#d4cebe', '#f2eee4', null],
    himmelsterrassen: ['#cec8b8', '#f0ece2', '#a8a04a']
  });
}
if (typeof DECO_COLORS !== 'undefined') {
  // Treibholz gebleicht, Dünenbüsche graugrün; auf den Terrassen blühende Büsche und goldene Halme
  const kueste = { wood: '#a8a294', cut: '#d8d2c4', ring: '#8a8478', bush: '#56685c', bushTop: '#8a9c88', berry: '#e8e4dc', tuft: '#8a9a7e', moss: '#6a7a68', bone: '#e8e4d8' };
  const himmel = { wood: '#8a6a44', cut: '#e8d0a0', ring: '#b08a5a', bush: '#5e7a34', bushTop: '#8ea044', berry: '#fff2f4', blossom: '#fff0f4', tuft: '#d8b85a', moss: '#a8a04a' };
  for (const id of K82_KUESTE) DECO_COLORS[id] = kueste;
  for (const id of K82_HIMMEL) DECO_COLORS[id] = himmel;
}

// --- Bäume ----------------------------------------------------------------------------------------------------
// Küste: windschiefe Kiefern in kühlem Graugrün; Terrassen: Laubbäume in weißer und zartrosa Blüte mit goldenen Tupfen
if (typeof WORLD3 !== 'undefined') {
  const basePine = WORLD3.pine;
  WORLD3.pine = function (b, M, v, style) {
    if (!K82_KUESTE.has(style)) return basePine.call(this, b, M, v, style);
    const lean = v === 1 ? -0.16 : 0.14;
    b.add(lathe3('pinetrunk', [[0.18, 0], [0.13, 0.1], [0.1, 0.7], [0, 0.72]], 7), '#5a4c40', { parent: M, shade: 0.3, r: [0, 0, lean * 0.5] });
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const r = (0.82 - k * (0.6 / tiers)) * (v === 1 ? 0.9 : 1);
      const y = 0.35 + k * 0.42;
      // spitze Stufen wie bei jeder Tanne, aber vom Wind zur Seite gedrückt und etwas breiter gezogen
      const g = lathe3(`pinetier${r.toFixed(2)}`, [[0, -0.04], [r * 0.6, -0.02], [r, 0.06], [r * 0.95, 0.14], [r * 0.45, 0.48], [r * 0.12, 0.66], [0, 0.7]], 10);
      b.add(g, k % 2 ? '#46665a' : '#3a584e', { parent: M, p: [lean * y * 0.7, y, 0], s: [1.12, 1, 0.94], r: [0, k * 0.7, lean], shade: 0.4 });
    }
  };
  if (typeof TREE3_STYLED !== 'undefined') for (const id of K82_HIMMEL) TREE3_STYLED.add(id);
  const baseTree = WORLD3.tree;
  WORLD3.tree = function (b, M, v, style) {
    if (!K82_HIMMEL.has(style)) return baseTree.call(this, b, M, v, style);
    // unten frisches Laub, darüber Blüten in Weiß und Zartrosa
    const cols = ['#7a9444', '#e6a2ba', '#f4c6d4'];
    b.add(lathe3('trunk', [[0.3, 0], [0.19, 0.14], [0.15, 0.7], [0.12, 1.3], [0, 1.34]], 8), '#6e5440', { parent: M, shade: 0.35 });
    b.add(limb3(0.6, 0.07, 0.05, 5), '#6e5440', { parent: M, p: [0.08, 1.0, 0], r: [0, 0, 2.2] });
    TREE_BLOBS[v].forEach(([x, y, r], k) => {
      const top = y < -36;
      b.add(top ? sphere3(1, 10, 7) : sphere3(1, 9, 6), top ? cols[2] : y > -24 || (k + v) % 4 === 0 ? cols[0] : cols[1 + ((k + v) % 2)], {
        parent: M, p: [x / 32 * 1.1, -y / 32 * 1.1 + 0.25, ((k * 37) % 7 - 3) * 0.09], s: (r / 32) * 1.35, shade: 0.35
      });
    });
    for (const [x, y, z] of [[-0.4, 1.8, 0.55], [0.35, 1.5, 0.6], [0.5, 2.1, 0.25], [-0.15, 2.4, 0.4]]) b.add(sphere3(0.07, 5, 4), '#f0c040', { parent: M, p: [x, y, z] });
  };
}
// 2D: dieselben Bäume (umgebung.js, TREE_ART), Kiefer schräg, Krone weiß und rosa
if (typeof TREE_ART !== 'undefined' && typeof TREE_BLOBS !== 'undefined') {
  const basePine2 = TREE_ART.pine;
  TREE_ART.pine = function (ctx, v, style) {
    if (!K82_KUESTE.has(style)) return basePine2.call(this, ctx, v, style);
    const lean = v === 1 ? -0.18 : 0.15;
    box(ctx, -2.5, -12, 5, 13, 1, '#5a4c40');
    const tiers = 3 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const y = -10 - k * 11;
      const off = lean * -y;
      const hw = 22 - k * (15 / tiers) - (v === 1 ? 2 : 0);
      poly(ctx, [[-hw + off, y], [hw + off, y + 1], [off + hw * 0.3, y - 13], [off - hw * 0.4, y - 12]], k % 2 ? '#4a6a5e' : '#3e5a50');
      poly(ctx, [[-hw * 0.8 + off, y - 1], [off, y - 2], [off - hw * 0.35, y - 11]], '#6a8a7c');
    }
  };
  const baseTree2 = TREE_ART.tree;
  TREE_ART.tree = function (ctx, v, style) {
    if (!K82_HIMMEL.has(style)) return baseTree2.call(this, ctx, v, style);
    poly(ctx, [[-4, 0], [-3, -20], [3, -20], [4, 0], [7, 1.5], [-7, 1.5]], '#6e5440');
    stroke(ctx, '#4a3628', 0.8, [[-1, -3], [-1.5, -14]]);
    crown(ctx, TREE_BLOBS[v], ['#6e8a3e', '#d8a0b4', '#f2c8d4', '#fff0f4']);
    for (const [x, y] of [[-12, -38], [6, -30], [10, -44], [-4, -48], [14, -34], [-8, -28]]) dot(ctx, x, y, 1.3, 1.3, y < -40 ? '#f0c040' : '#f6c0d0');
  };
}

// --- Mauer aus weißem Stein (Sonnenhof, Terrassenkanten): niedrig, mit goldenem Grasrand obenauf -----------------
if (typeof TOWN_WALL_CH !== 'undefined') TOWN_WALL_CH.Z = 'sonnenstein';
if (typeof WORLD3 !== 'undefined') {
  WORLD3.sonnenstein = function (b) {
    const M = placeAt(0, 0);
    b.add(wbox(1.06, 0.62, 0.72, 0.06), '#d6d0c0', { parent: M, p: [0, 0.31, 0], shade: 0.35, top: '#ece8dc', topK: 0.4 });
    b.add(wbox(1.08, 0.07, 0.76, 0.04), '#a8a060', { parent: M, p: [0, 0.65, 0] });
  };
}
if (typeof WALL_SWEEP !== 'undefined') WALL_SWEEP.sonnenstein = [[0.36, 0, 0.62, '#d6d0c0', 0.35, 0.1], [0.38, 0.6, 0.67, '#a8a060', 0, null]];
if (typeof WALL2 !== 'undefined') {
  WALL2.sonnenstein = function (ctx, dir) {
    const st = '#e2dccc';
    if (dir === 'h') {
      box(ctx, -16.5, -16, 33, 16, 1, st);
      for (const [x, y] of [[-10, -16], [3, -16], [-4, -8], [9, -8]]) stroke(ctx, darker(st, 0.18), 0.8, [[x, y], [x, y + 8]]);
      stroke(ctx, darker(st, 0.18), 0.8, [[-16, -8], [16, -8]]);
      box(ctx, -17, -19, 34, 4, 2, '#d0b056');
      return;
    }
    box(ctx, -7, -25, 14, 25, 1, st);
    box(ctx, -7.5, -27, 15, 5, 2.5, '#d0b056');
  };
}
if (typeof MAP_WALL_LOOK !== 'undefined') MAP_WALL_LOOK.sonnenstein = ['#7a7468', '#e2dccc', '#e8c870'];

// --- Grundformen (kartenformen.js) ----------------------------------------------------------------------------
if (typeof FORM_BUILDERS !== 'undefined') {
  // Küste: alles Land, im Osten das Meer bis zur Küstenlinie F.coast ([y, x], dazwischen gerade, Rauschen coastAmp),
  // Buchten und Strandseen; die Ecken F.corners bleiben Land
  FORM_BUILDERS.kueste = function (ctx, F) {
    ctx.fill(KF.LAND);
    const { W, H } = ctx;
    const C = F.coast;
    const coastX = (y) => {
      for (let k = 1; k < C.length; k++) {
        if (y <= C[k][0] || k === C.length - 1) {
          const [y0, x0] = C[k - 1];
          const [y1, x1] = C[k];
          const t = Math.max(0, Math.min(1, (y - y0) / Math.max(1, y1 - y0)));
          return x0 + (x1 - x0) * (t * t * (3 - 2 * t));
        }
      }
      return C[C.length - 1][1];
    };
    for (let y = 0; y < H; y++) {
      const xc = coastX(y) + (ctx.noise(y * 0.25, 11) - 0.5) * 2 * (F.coastAmp || 6) + (ctx.fine(y * 0.7, 5) - 0.5) * 3;
      for (let x = Math.max(0, Math.floor(xc)); x < W; x++) ctx.set(x, y, KF.VOID);
    }
    for (const [x, y, r] of F.bays || []) ctx.blob(x, y, r, r * 0.8, KF.VOID, 0.3);
    for (const [x, y, rx, ry] of F.lagoons || []) ctx.blob(x, y, rx, ry, KF.POND, 0.35, (m) => m === KF.LAND);
    for (const [x, y, r] of F.corners || []) ctx.disc(x + 0.5, y + 0.5, r, KF.LAND);
  };
  // Himmelsterrassen: Terrassenhang ohne Spalten (FORM_BUILDERS.terrassen), dazu Teiche; die Ecken bleiben Land
  FORM_BUILDERS.himmel = function (ctx, F) {
    FORM_BUILDERS.terrassen(ctx, F);
    for (const [x, y, r] of F.pools || []) ctx.blob(x, y, r, r * 0.75, KF.POND, 0.35, (m) => m === KF.LAND);
    for (const [x, y, r] of F.corners || []) ctx.disc(x + 0.5, y + 0.5, r, KF.LAND);
  };
}
// Nach der Form (vor den Wegen): an der Küste heller Strand mit Treibholz bis gut drei Kacheln vom Wasser, dort keine
// Bäume; der Felsrand im Osten liegt im Meer. Auf den Terrassen ein Saum aus weißem Stein unter jeder Kante.
// Feste Werte je Kachel (townTileHash), keine Zufallszahlen: alle sehen dieselbe Küste.
if (typeof mapFormShape === 'function') {
  const baseShape = mapFormShape;
  mapFormShape = function (wm, ground, obj, deco, zoneIdx) {
    baseShape(wm, ground, obj, deco, zoneIdx);
    if (wm.id === 18) k82Strand(wm, ground, obj, deco);
    else if (wm.id === 19) k82Terrassensaum(wm, ground, obj, deco);
    if (wm.id === 18 || wm.id === 19) k82Ecken(wm, ground, obj, deco);
  };
}
// Ecken oben links und unten rechts (wo instCornerEntrance später Instanz-Tore sucht: 22 Kacheln vom Rand, 16 von oben
// bzw. unten): ohne Bäume, Felsen und Mauern
function k82Ecken(wm, ground, obj, deco) {
  const F = mapFormOf(wm.id);
  const [rx, ry] = wm.region;
  for (const [cx, cy, r] of (F && F.corners) || []) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.hypot(x - cx, y - cy) > r - 1.5) continue;
      const i = (ry + y) * MAP_W + rx + x;
      if (obj[i] === OBJ.WALL) WALL_STYLE.delete(i);
      obj[i] = OBJ.NONE;
    }
  }
}
function k82Strand(wm, ground, obj, deco) {
  const [rx, ry, rw, rh] = wm.region;
  const H = (wm.camp || CAMP_HALF) + 4;
  const D = 4;
  const dist = new Uint8Array(rw * rh).fill(255);
  const q = [];
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    if (ground[(ry + y) * MAP_W + rx + x] === GROUND.WATER) { dist[y * rw + x] = 0; q.push(y * rw + x); }
  }
  for (let h = 0; h < q.length; h++) {
    const k = q[h];
    const d = dist[k];
    if (d >= D) continue;
    const x = k % rw;
    const y = (k - x) / rw;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= rw || yy >= rh) continue;
      const j = yy * rw + xx;
      if (dist[j] > d + 1) { dist[j] = d + 1; q.push(j); }
    }
  }
  for (let y = MAP_BORDER; y < rh - MAP_BORDER; y++) for (let x = MAP_BORDER; x < rw - MAP_BORDER; x++) {
    const d = dist[y * rw + x];
    if (!d || d > D) continue;
    const tx = rx + x;
    const ty = ry + y;
    if (Math.max(Math.abs(tx - wm.cx), Math.abs(ty - wm.cy)) <= H) continue;
    const h = townTileHash(tx * 3 + 1, ty * 7 + 2);
    if (d === D && h % 2) continue;
    const i = ty * MAP_W + tx;
    ground[i] = GROUND.STRANDSAND;
    if (obj[i] !== OBJ.NONE && obj[i] !== OBJ.ROCK) obj[i] = OBJ.NONE;
    if (deco[i] === DECO.NONE || deco[i] === DECO.TUFT) deco[i] = h % 100 < 5 ? DECO.LOG : h % 100 < 9 ? DECO.PEBBLE : DECO.NONE;
  }
  // Felsrand im Osten: wo das Meer an den Rand reicht, läuft es bis zur Kante weiter (begehbar bleibt der Rand nicht,
  // rockSolid hält auf); dahinter zeigt der Rand bis zum Horizont das Meer (RAND3_SEITE)
  for (let y = 0; y < rh; y++) {
    const inner = (ry + y) * MAP_W + rx + rw - MAP_BORDER - 1;
    if (ground[inner] !== GROUND.WATER) continue;
    for (let x = rw - MAP_BORDER; x < rw; x++) {
      const i = (ry + y) * MAP_W + rx + x;
      ground[i] = GROUND.WATER;
      obj[i] = OBJ.NONE;
      deco[i] = DECO.NONE;
    }
  }
}
function k82Terrassensaum(wm, ground, obj, deco) {
  const [rx, ry, rw, rh] = wm.region;
  // Flecken aus weißem Fels (eigenes Rauschen, gleich für alle)
  const fleck = makeNoise(mulberry32(WORLD_SEED + 1919), 6);
  for (let y = ry + MAP_BORDER; y < ry + rh - MAP_BORDER; y++) for (let x = rx + MAP_BORDER; x < rx + rw - MAP_BORDER; x++) {
    const i = y * MAP_W + x;
    if (ground[i] === GROUND.GOLDGRAS && fleck(x, y) > 0.74) ground[i] = GROUND.HELLSTEIN;
  }
  for (let y = ry + MAP_BORDER; y < ry + rh - MAP_BORDER; y++) for (let x = rx + MAP_BORDER; x < rx + rw - MAP_BORDER; x++) {
    const i = y * MAP_W + x;
    if (obj[i] !== OBJ.WALL || WALL_STYLE.get(i) !== 'sonnenstein') continue;
    // die Kachel darunter und daneben: weißer Stein, keine Bäume direkt an der Kante
    for (const [dx, dy] of [[0, 1], [0, 2], [-1, 1], [1, 1]]) {
      const j = (y + dy) * MAP_W + x + dx;
      if (obj[j] === OBJ.WALL || LIQUID.has(ground[j])) continue;
      if (dy === 2 && townTileHash(x + dx, y + dy) % 3) continue;
      ground[j] = GROUND.HELLSTEIN;
      if (obj[j] !== OBJ.NONE && obj[j] !== OBJ.ROCK) obj[j] = OBJ.NONE;
    }
  }
}

// --- Meer der Nebelküste: graugrün statt blau (3D: die Wasserfläche nur auf dieser Karte umgefärbt; 2D: Schleier) ---
const K82_SEE = { key: null, base: null };
if (typeof FX3_HOOKS !== 'undefined' && typeof LIQUID3 !== 'undefined') {
  K82_SEE.base = [LIQUID3.water.shallow, LIQUID3.water.deep, LIQUID3.water.foam];
  FX3_HOOKS.push({
    parts: [],
    fn() {
      const key = V3.home ? V3.home.key : '';
      if (key === K82_SEE.key) return;
      K82_SEE.key = key;
      if (typeof liquidMat !== 'function') return;
      const c = key === 'm18' ? ['#86a49a', '#3e5a56', '#eef2ee'] : K82_SEE.base;
      const u = liquidMat('water').uniforms;
      u.uShallow.value.set(c[0]);
      u.uDeep.value.set(c[1]);
      u.uFoam.value.set(c[2]);
    }
  });
}
if (typeof drawWaterTile === 'function') {
  const baseWater = drawWaterTile;
  const R = WORLD_MAPS.find((m) => m.id === 18).region;
  drawWaterTile = function (ctx, x, y, px, py, h, t) {
    if (x >= R[0] && y >= R[1] && x < R[0] + R[2] && y < R[1] + R[3]) {
      ctx.fillStyle = 'rgba(132,160,150,0.42)';
      ctx.fillRect(px, py, TILE, TILE);
    }
    return baseWater(ctx, x, y, px, py, h, t);
  };
}
// 2D: Gras wächst in Zacken über den Rand der Wege (wie auf Gras und Wiese, umgebung.js drawGrassFringe) – auch auf
// Dünengras und goldenem Gras
if (typeof drawGrassFringe === 'function') {
  const baseFringe = drawGrassFringe;
  const GRAS = new Set([GROUND.DUENENGRAS, GROUND.GOLDGRAS]);
  drawGrassFringe = function (ctx, x, y, px, py, h) {
    baseFringe(ctx, x, y, px, py, h);
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], k) => {
      const n = groundAt(x + dx, y + dy);
      if (!GRAS.has(n)) return;
      ctx.fillStyle = GROUND_PALETTE[n][3];
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const s = j * 6.4 + ((h >> (j + k)) & 3);
        const depth = 3 + ((h >> (j * 2 + k)) & 3);
        if (dy === -1) { ctx.moveTo(px + s, py); ctx.lineTo(px + s + 3.2, py + depth); ctx.lineTo(px + s + 6.4, py); }
        if (dy === 1) { ctx.moveTo(px + s, py + TILE); ctx.lineTo(px + s + 3.2, py + TILE - depth); ctx.lineTo(px + s + 6.4, py + TILE); }
        if (dx === -1) { ctx.moveTo(px, py + s); ctx.lineTo(px + depth, py + s + 3.2); ctx.lineTo(px, py + s + 6.4); }
        if (dx === 1) { ctx.moveTo(px + TILE, py + s); ctx.lineTo(px + TILE - depth, py + s + 3.2); ctx.lineTo(px + TILE, py + s + 6.4); }
      }
      ctx.fill();
    });
  };
}

// --- Randkulisse und Rand bis zum Horizont --------------------------------------------------------------------
// Küste: Felsnadeln und Klippen aus graugrünem Gestein; Terrassen: Blütenhecke mit goldenem Laub
if (typeof KUL3_FORM !== 'undefined' && typeof BORDER3 !== 'undefined') {
  KUL3_FORM.kuestenfels = {
    hw: 5.4, hf: 4.4,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      b.add(rockGeo(v), T('#5e6864'), { s: [1.45, 1.8, 1.15], p: [0, -0.1, 0], top: T('#8a9a8e'), topK: 0.5, shade: 0.35 });
      b.add(horn3(4.8, 0.8, 6), T('#6a7470'), { p: [-0.45 * m, 0.3, -0.1], r: [0, 0, 0.08 * m], top: T('#9aa69e'), topK: 0.4, shade: 0.4 });
      b.add(horn3(3.2, 0.65, 6), T('#626c68'), { p: [0.6 * m, 0.3, 0.15], r: [0.1, 0, -0.12 * m], top: T('#9aa69e'), topK: 0.4, shade: 0.4 });
    },
    fern(b, v, T) {
      b.add(rockGeo(v, 0), T('#5e6864'), { s: [1.7, 2.2, 1.4], p: [0, -0.1, 0], top: T('#8a9a8e'), topK: 0.5, shade: 0.35 });
      b.add(horn3(4.0, 0.85, 6), T('#6a7470'), { p: [0.3, 0.4, 0], r: [0, 0, -0.1], shade: 0.4 });
    },
    busch(b, v) {
      for (let k = 0; k < 4; k++) b.add(limb3(0.55 - k * 0.06, 0.03, 0.012, 4), k % 2 ? '#8a9a7e' : '#a8b096', { r: [Math.PI + Math.sin(k * 1.9 + v) * 0.5, 0, Math.cos(k * 1.9 + v) * 0.5] });
      b.add(rockGeo(v, 0), '#6a7470', { s: [0.28, 0.26, 0.24], p: [0.18, 0.02, 0.1], top: '#8a9a8e', topK: 0.5 });
    }
  };
  const gold = (hex) => (typeof hex === 'string' ? mixColor(hex, '#c8b050', 0.32) : hex);
  KUL3_FORM.sonnenhecke = {
    hw: KUL3_FORM.hecke.hw, hf: KUL3_FORM.hecke.hf,
    wand(b, v, T, alt) {
      KUL3_FORM.hecke.wand(b, v, (hex) => T(alt ? mixColor(hex, '#fff4f0', 0.45) : gold(hex)), alt);
    },
    fern(b, v, T) {
      KUL3_FORM.hecke.fern(b, v, (hex) => T(gold(hex)));
    },
    busch(b, v) {
      KUL3_FORM.hecke.busch({ add: (g, c, o) => b.add(g, v === 0 ? mixColor(c, '#fff4f0', 0.4) : gold(c), o) }, v);
    }
  };
  for (const id of K82_KUESTE) BORDER3[id] = { id, form: 'kuestenfels', saum: [['rock', 'nebelkueste', 2.0], ['pine', 'nebelkueste', 1.2, 4]], far: '#7e8e88' };
  for (const id of K82_HIMMEL) BORDER3[id] = { id, form: 'sonnenhecke', saum: [['tree', 'himmelsterrassen', 1.15]], alt: 4, far: '#c8b070' };
}
if (typeof RAND3_ART !== 'undefined') {
  const erbe = (base, A) => Object.assign({}, RAND3_ART[base], A, { c: Object.assign({}, RAND3_ART[base].c, A.c) });
  // Küste (Land): fahle Dünen mit Felsnadeln und Kiefern, viel Nebel
  RAND3_ART.kuestenduenen = erbe('knochenduenen', {
    c: { boden: '#8a9684', boden2: '#a0aa94', sand: '#d2ccb8', sand2: '#b4ae9a', fels: '#6a7470' },
    teile: [['nadel', 10, 40, 1.4, 2, 5, ['#5e6864', '#7e8884']], ['tanne', 12, 40, 1.2, 1.8, 3, ['#3e5a52', '#4a665c']]],
    nebel: { c: '#dfe6e2', a: 0.5, n: 2.0, h: [2, 7], r: [7, 12] }
  });
  // Küste (Osten): graugrünes Meer mit Klippen und Inseln bis zum Horizont, Nebelbänke
  RAND3_ART.nebelmeer = erbe('aschemeer', {
    c: { flaeche: '#5e746e', flaeche2: '#48605a', gischt: '#eef2ee' },
    teile: [['seefels', 12, 70, 0.45, 2, 4.5, ['#5a6662', '#7a8682']], ['insel', 30, 130, 0.06, 6, 14, ['#5a6662', '#7a8682', '#46504c']]],
    nebel: { c: '#e2eae6', a: 0.55, n: 2.2, h: [1.5, 6], r: [7, 12] }
  });
  // Terrassen: goldene Hügel mit blühenden Bäumen, dahinter Tafelberge aus weißem Stein
  RAND3_ART.sonnenhuegel = erbe('huegel', {
    c: { boden: '#c8a850', boden2: '#dcc068', wald: '#7a9440', wald2: '#8aa44a', fels: '#e6e0d2', schnee: '#fffaf0' },
    teile: [['baum', 9, 32, 5, 1.5, 2.6, ['#f4ecd8', '#fff6ea', '#f6d8e0']], ['baum', 10, 30, 2, 1.5, 2.4, ['#7a9a44', '#8aaa4e']],
      ['tafel', 24, 110, 0.3, 4, 9, ['#d8d2c4', '#f0ece2', '#c8c0ae', '#e8d088']]],
    nebel: { c: '#fff6e0', a: 0.22, n: 0.6, h: [5, 10], r: [6, 10] }
  });
  for (const k of ['kuestenduenen', 'nebelmeer', 'sonnenhuegel']) RAND3_ART[k].id = k;
  for (const id of K82_KUESTE) RAND3_STIL[id] = 'kuestenduenen';
  for (const id of K82_HIMMEL) RAND3_STIL[id] = 'sonnenhuegel';
  RAND3_SEITE.m18 = { 3: 'nebelmeer' };
  if (typeof RAND3_NAH !== 'undefined') Object.assign(RAND3_NAH, { kuestenduenen: [0.65, 0.7, 8, 0.6], sonnenhuegel: [0.74, 0.82, 10, 0.85] });
}

// --- Leuchtturm vor Leuchtwacht und Nebelbänke (3D, nur Bild; wahrzeichen.js) -----------------------------------
// Ein heller Turm mit roten Bändern auf einem Felsen im Meer, oben die Laterne mit zwei kreisenden Lichtstrahlen;
// Brandung an seinem Fuß. Dazu ziehen zwei Nebelschichten über die Küste, an der Wasserkante spritzt Gischt.
function k82Leuchtturm(spot) {
  const site = wzSite(spot.x, spot.y, 170);
  const b = new Bake3();
  for (let k = 0; k < 6; k++) {
    const a = k * 1.1;
    b.add(rockGeo(k % 6, 1), k % 2 ? '#5a6460' : '#66706c', { p: [Math.cos(a) * 1.9, -0.5, Math.sin(a) * 1.9], s: [1.5 + (k % 3) * 0.3, 1.1, 1.4], r: [0, a, 0], top: '#7e8a84', topK: 0.5 });
  }
  // Turm aus Ringen: Sockel aus Bruchstein, darüber abwechselnd weiße und rote Bänder (je Band zwei Ringe dicht
  // übereinander, damit die Farbe scharf wechselt), oben die Galerie
  const prof = [[1.9, -0.4], [1.8, 0.6], [1.55, 1.0]];
  const cols = ['#7a8480', '#7a8480', '#ece8e0'];
  for (let k = 0; k < 6; k++) {
    const y0 = 1.0 + k * 1.3;
    const r = (y) => 1.55 - (y - 1.0) * 0.042;
    const c = k % 2 ? '#b8473c' : '#ece8e0';
    prof.push([r(y0 + 0.02), y0 + 0.02], [r(y0 + 1.3), y0 + 1.3]);
    cols.push(c, c);
  }
  prof.push([1.6, 8.9], [1.6, 9.15], [1.0, 9.15], [0, 9.15]);
  cols.push('#3e4a4a', '#3e4a4a', '#3e4a4a', '#3e4a4a');
  const tower = wzLathe(prof, 16, { seed: 18, jit: 0.01, col: (t, a, i) => cols[i] });
  b.add(tower, null);
  // Tür, Fenster, Laterne mit Glas, rotes Dach mit Knauf
  b.add(wbox(0.55, 1.0, 0.2, 0.05), '#3a3430', { p: [0, 1.05, 1.62] });
  for (const y of [3.4, 6.0]) b.add(wbox(0.32, 0.5, 0.2, 0.04), '#ffe0a0', { p: [0, y, 1.4], mat: 'glow' });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.add(sphere3(0.04, 4, 3), '#2e3634', { p: [Math.cos(a) * 1.5, 9.65, Math.sin(a) * 1.5], s: [1, 10, 1] });
  }
  b.add(geo3('k82laterne', () => new THREE.CylinderGeometry(0.85, 0.85, 1.2, 12)), '#fff2c0', { p: [0, 9.9, 0], mat: 'glow' });
  b.add(geo3('k82dach', () => new THREE.ConeGeometry(1.15, 1.0, 12)), '#a8403a', { p: [0, 11.0, 0] });
  b.add(sphere3(0.16, 6, 5), '#2e3634', { p: [0, 11.55, 0] });
  wzGlow(b, 0, 9.9, 0, 7, '#ffe6a8', 0.9);
  wzBake(site, b);
  const beam = new THREE.Group();
  beam.position.y = 9.9;
  site.add(beam);
  for (const s of [1, -1]) {
    const g = new THREE.CylinderGeometry(0.3, 3.4, 28, 12, 1, true);
    g.translate(0, 14, 0);
    g.rotateZ(-Math.PI / 2 * s);
    g.rotateX(0.06);
    const m = new THREE.Mesh(g, wzBeamMat('#fff2c8', 0.3));
    m.renderOrder = 4;
    beam.add(m);
  }
  WZ.anims.push({ g: beam, site, fn: (o, t) => { o.rotation.y = t * 0.4; } });
  WZ.emitters.push({ x: spot.x, z: spot.y, R: 55, rate: 2.4, acc: 0, fn: () => {
    const a = Math.random() * 6.28;
    wzSpawn({ x: spot.x + Math.cos(a) * 2.4, y: -0.1, z: spot.y + Math.sin(a) * 2.4, vx: Math.cos(a) * 0.8, vz: Math.sin(a) * 0.8, vy: 2 + Math.random() * 2, grav: 5, life: 1.3, s0: 0.35, s1: 0.9, c: '#f2f6f4', a: 0.7 });
  } });
  return site;
}
if (typeof WZ_MAPS !== 'undefined') {
  const prev18 = WZ_MAPS[18];
  WZ_MAPS[18] = (wm, T) => {
    const F = wzField(wm, 'liq', true);
    const town = wzTown(wm);
    const lh = wzPick(F, { cx: town.cx + 70, cy: town.cy - 14, R: 60, min: 4.5, cap: 6, distK: 0.09, town: { cx: town.cx, cy: town.cy, H: town.H + 6 } });
    if (lh) {
      k82Leuchtturm(lh);
      WZ.main = { x: lh.x, y: lh.y + Math.min(lh.r, 6) + 3 };
    }
    wzMistLayer(wzMistMat('kueste1', '#c8d4d0', 0.4, 0.03, 0.025), 0.35, 66);
    if (T.tier) wzMistLayer(wzMistMat('kueste2', '#e0e8e4', 0.28, 0.02, -0.018), 1.2, 66);
    wzAround(3, (px, pz) => {
      const t = wzNearTile(px, pz, 14, (i) => game.world.ground[i] === GROUND.WATER && (!LIQUID.has(game.world.ground[i - 1]) || !LIQUID.has(game.world.ground[i + 1]) || !LIQUID.has(game.world.ground[i - MAP_W]) || !LIQUID.has(game.world.ground[i + MAP_W])));
      if (!t) return;
      for (let k = 0; k < 3; k++) wzSpawn({ x: t[0] + (Math.random() - 0.5) * 0.6, y: -0.1, z: t[1] + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, vy: 1.8 + Math.random() * 2, grav: 5, life: 1.2, s0: 0.25, s1: 0.7, c: '#eef2f0', a: 0.6 });
    });
    wzWallBanners(wzSite(town.cx + 0.5, town.cy + 0.5, 90), wm, 5, '#3e5a58', '#e8e0c8', 10);
    if (prev18) prev18(wm, T);
  };
  // Himmelsterrassen: warmer Lichtschleier über der Hochebene, Banner in Gold und Weiß auf der Hofmauer
  const prev19 = WZ_MAPS[19];
  WZ_MAPS[19] = (wm, T) => {
    const town = wzTown(wm);
    if (T.tier) wzMistLayer(wzMistMat('sonne1', '#fff0c8', 0.16, 0.025, 0.012, true), 2.2, 66);
    wzWallBanners(wzSite(town.cx + 0.5, town.cy + 0.5, 90), wm, 4, '#c8902a', '#fff6e0', 10);
    if (prev19) prev19(wm, T);
  };
}

// --- Monster: Zeichnungen (daraus das 3D-Modell, captureArt in drei-figuren.js) -----------------------------------
Object.assign(MONSTER_ART, {
  // Brandungsnaga: Schuppen in Meergrau, Muschelpanzer, Haar wie Gischt
  brandungsnaga: { h: 60, draw: (ctx, f) => nagaArt(ctx, f, { scale: 1.22, body: '#4e7a76', belly: '#c4d4cc', mark: '#24403e', skin: '#6a948c', armor: '#a8b0ac', trim: '#3a5a60', hair: '#b4c8c4', eye: '#9fe8d8' }) },
  // Nebelharpyie: graues Gefieder, weiße Schwingen, gelber Schnabel
  nebelharpyie: {
    h: 52, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.1, skin: '#9aa29c', pants: '#4a5a58', boots: '#2e3836', torso: '#5a6a66', sleeve: '#8a9894', gloves: '#2e3836', wings: '#aab8b4', claws: true,
      head: (ctx, cx, cy) => {
        for (const [dx, h] of [[-7, 13], [-3, 17], [1, 12]]) poly(ctx, [[cx + dx - 2, cy - 8], [cx + dx, cy - 8 - h], [cx + dx + 2, cy - 8]], '#c8d4d0');
        monsterEye(ctx, cx + 6, cy - 0.6, 1.7, '#e8f4ff', true);
        poly(ctx, [[cx + 9, cy + 1], [cx + 14, cy + 2.5], [cx + 9, cy + 4]], '#f0c040');
      }
    })
  },
  // Riffscherer: großer Panzer in Schieferblau wie nasser Fels, korallenroter Stachel
  riffscherer: { h: 40, draw: (ctx, f) => { ctx.scale(1.55, 1.55); scorpionArt(ctx, f, { body: '#4a6a78', sting: '#e88a64' }); } },
  // Sonnenlöwe: goldenes Fell mit rotbrauner Mähne
  sonnenloewe: { h: 38, draw: beastIn(1.38, { fur: '#d8a84a', belly: '#f4e2b0', snout: '#f0d8a0', mane: '#a8642a', cat: true, longTail: true, tailTip: '#8a5020', eye: '#ffe08a', glow: true, angry: true, fangs: true }) },
  // Sonnenkoloss: Golem aus weißem Marmor mit goldenen Adern
  sonnenkoloss: {
    h: 76, draw: (ctx, f) => humanoidMonsterArt(ctx, f, {
      scale: 1.7, belly: true, skin: '#b8b2a2', pants: '#8e8878', boots: '#6e6a5e', sleeve: '#b8b2a2', gloves: '#c8c2b2', cracks: '#f0a820',
      head: (ctx, cx, cy) => {
        poly(ctx, [[cx - 9, cy - 8], [cx - 4, cy - 13], [cx + 4, cy - 13], [cx + 9, cy - 7]], '#9a9484');
        monsterEye(ctx, cx + 5, cy - 1, 2, '#ffd36a', true);
        ctx.globalAlpha = 0.55;
        dot(ctx, cx + 5, cy - 1, 4, 4, '#ffb830');
        ctx.globalAlpha = 1;
      }
    })
  },
  // Sonnenwyrm: hell elfenbeinfarben mit goldenem Bauch und goldenen Schwingen
  sonnenwyrm: {
    h: 62, draw: (ctx, f) => {
      ctx.scale(1.6, 1.6);
      dragonWings(ctx, f, '#c89838');
      beastArt(ctx, f, { fur: '#d8c48e', belly: '#f0c050', snout: '#c8b07a', ridge: true, eye: '#ff8a2a', angry: true, glow: true, fangs: true, tusk: true });
    }
  }
});
// Köpfe, Bauart und Zubehör in 3D, Angriffe, Stimmen
if (typeof HEAD3 !== 'undefined') {
  Object.assign(HEAD3, {
    nebelharpyie: { feathers: ['#aab6b2', '#d4dcd8', '#6e7c78'], hairLong: '#b8c4c0' },
    sonnenkoloss: { golem: true, cracks: '#f0b830' }
  });
}
if (typeof MON3_LOOK !== 'undefined') {
  Object.assign(MON3_LOOK, {
    brandungsnaga: { crownHorns: false },
    sonnenloewe: {},
    sonnenwyrm: { coins: null, tailBlade: '#c8962a' }
  });
}
if (typeof ATTACK_STYLE !== 'undefined') {
  Object.assign(ATTACK_STYLE, { riffscherer: 'sting', sonnenloewe: 'pounce', sonnenkoloss: 'slam', sonnenwyrm: 'breath' });
}
if (typeof VOICE_OF !== 'undefined') {
  Object.assign(VOICE_OF, { brandungsnaga: 'naga', nebelharpyie: 'harpy', riffscherer: 'scorpion', sonnenloewe: 'cat', sonnenkoloss: 'golem', sonnenwyrm: 'dragon' });
}
