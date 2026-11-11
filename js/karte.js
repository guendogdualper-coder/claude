// Karte und Wegweiser (seit 8.8).
// - Kartengrafik: jede Map (bzw. jeder Dungeon-Block) wird einmal fein gezeichnet – weicher Boden,
//   Bäume als runde Kronen, Felsen, Häuser mit Dach, Mauern – und von Minikarte und großer Karte benutzt.
// - Wegweiser: ein goldener Pfeil an der eigenen Figur zeigt zum Ziel des verfolgten Auftrags, daneben
//   stehen Name und Entfernung. Liegt das Ziel auf einer anderen Map, führt er zum Weltentor.
// - Große Karte: Taste M, auf dem Handy die kleine Karte antippen. Antippen der großen Karte setzt
//   eine eigene Markierung, zu der der Pfeil dann führt.

// --- Gebiet: die Map oder der Dungeon-Block, in dem eine Kachel liegt -----------------------------
let _areaLast = null;
function mapAreaAt(tx, ty) {
  const a = _areaLast;
  if (a && tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return a;
  const wm = mapOfTile(tx, ty);
  let area = null;
  if (wm) {
    const [x, y, w, h] = wm.region;
    area = { key: 'm' + wm.id, x, y, w, h, wm, dungeon: -1 };
  } else if (tx >= WORLD_W && ty < DUNGEON_H) {
    // seit 13.58 kann ein Dungeon zwei Blöcke hoch sein (dungeonBlock)
    const k = dungeonIndexAt(tx, ty);
    const B = dungeonBlock(k);
    area = { key: `d${k}`, x: B.x, y: B.y, w: B.w, h: B.h, wm: null, dungeon: k };
  } else if (typeof arenaSlotAt === 'function' && arenaSlotAt(tx * TILE, ty * TILE) >= 0) {
    // Halle der Prüfungsarena (seit 13.63, herausforderung.js)
    const s = arenaSlotAt(tx * TILE, ty * TILE);
    const R = arenaSlotRect(s);
    area = { key: `a${s}`, x: R.x, y: R.y, w: R.w, h: R.h, wm: null, dungeon: -1 };
  } else if (typeof pvpSlotAt === 'function' && pvpSlotAt(tx * TILE, ty * TILE) >= 0) {
    // Halle der Turnierarena (seit 13.86, turnierarena.js)
    const s = pvpSlotAt(tx * TILE, ty * TILE);
    const R = PVP_SLOTS[s];
    area = { key: `p${s}`, x: R.x, y: R.y, w: R.w, h: R.h, wm: null, dungeon: -1 };
  }
  if (area) _areaLast = area;
  return area;
}
const inArea = (area, x, y) => !!area && x >= area.x * TILE && y >= area.y * TILE && x < (area.x + area.w) * TILE && y < (area.y + area.h) * TILE;

// --- Kartengrafik ---------------------------------------------------------------------------------
const MAP_COLORS = {
  [GROUND.GRASS]: [96, 138, 62], [GROUND.MEADOW]: [110, 150, 68], [GROUND.FOREST]: [64, 94, 52],
  [GROUND.PATH]: [196, 168, 116], [GROUND.WATER]: [52, 112, 150], [GROUND.PLAZA]: [186, 174, 150],
  [GROUND.SAND]: [204, 172, 114], [GROUND.ASH]: [104, 94, 88], [GROUND.SNOW]: [232, 238, 246],
  [GROUND.SWAMP]: [78, 96, 64], [GROUND.LAVA]: [240, 104, 34], [GROUND.BOG]: [48, 78, 62], [GROUND.ICE]: [176, 214, 236],
  [GROUND.BASALT]: [66, 54, 54], [GROUND.CAVE]: [84, 70, 60], [GROUND.FLAGSTONE]: [136, 128, 114]
};
const MAP_ART = new Map();

function mapArt(area) {
  let a = MAP_ART.get(area.key);
  if (a && a.world === game.world) return a;
  // höchstens zwei Gebiete im Speicher (eine Map sind etwa 5 MB)
  if (MAP_ART.size >= 2) MAP_ART.delete(MAP_ART.keys().next().value);
  // seit 13.91: Maps mit eigener, detailreicher Grafik (buildWorldArt) in 5 Bildpunkten je Kachel (vorher 6, schlicht).
  // Sie entsteht in kleinen Häppchen zwischen den Bildern (mapArtSlices), damit beim Betreten einer Map nichts
  // ruckelt; bis dahin zeigt die Minikarte nur die Zeichen. Die große Karte baut, was noch fehlt, sofort fertig.
  // Dungeons und Arenahallen bleiben scharf und schlicht (buildMapArt, sofort).
  a = { world: game.world, S: area.wm ? MAP_ART_S : 8, c: null, gen: null };
  MAP_ART.set(area.key, a);
  if (area.wm) {
    a.gen = buildWorldArt(area, a.S);
    mapArtSlices(a, area.key);
  } else a.c = buildMapArt(area, a.S);
  return a;
}

// Kartengrafik weiterbauen, höchstens budget Millisekunden (seit 13.91)
function mapArtStep(a, budget) {
  if (a.c || !a.gen) return a;
  const t0 = performance.now();
  for (;;) {
    const r = a.gen.next();
    if (r.done) {
      a.c = r.value;
      a.gen = null;
      break;
    }
    if (performance.now() - t0 >= budget) break;
  }
  return a;
}
function mapArtSlices(a, key) {
  const tick = () => {
    if (a.c || !a.gen || MAP_ART.get(key) !== a) return;
    mapArtStep(a, 6);
    if (!a.c) setTimeout(tick, 0);
  };
  setTimeout(tick, 0);
}

// --- Kartengrafik der Maps (seit 13.91) -----------------------------------------------------------------------
// Für Minikarte und große Karte, einmal je Map gezeichnet und danach nur noch als Bild benutzt:
//   - Gelände in weichen, etwas wärmeren Farben mit Licht und Schatten: Hügel aus dem Helligkeitsrauschen der Welt
//     (world.shade), von Nordwesten beleuchtet; Wälder dunkeln den Boden darunter ab (Waldflächen statt Einzelbäume)
//   - Gewässer mit hellem Ufersaum, flachem Rand und dunklerer Mitte (je Art: Wasser, Moor, Lava, Eis, Abgrund)
//   - Wege als geschwungene helle Bänder mit dunklem Rand (Mittellinien aus world.roads, siehe layRoads in welt.js)
//   - Bäume als Baumgruppen: dunkler Kronenteppich, darauf einzelne Kronen mit Schatten und Glanzlicht
//   - Städte mit Pflaster, Mauer, runden Türmen, kleinen Häusern, Ständen und Brunnen; feine Punktlinien an den
//     Gebietsgrenzen; der Felsrand der Map als dunkles Band
// Alles in wenigen Pfaden je Farbe gezeichnet (nicht je Baum einzeln), damit das Bauen schnell bleibt.
const MAP_ART_S = 5;
const MAP_TAU = Math.PI * 2;
// Gewässer: Ufersaum (mit Deckkraft), flach, tief
const MAP_LIQ = {
  [GROUND.WATER]: [[226, 214, 168, 0.9], [79, 147, 184], [53, 111, 156]],
  [GROUND.BOG]: [[122, 128, 86, 0.9], [74, 106, 84], [51, 80, 62]],
  [GROUND.LAVA]: [[48, 30, 26, 0.95], [240, 138, 50], [212, 80, 28]],
  [GROUND.ICE]: [[244, 250, 255, 0.9], [191, 224, 242], [166, 208, 234]],
  [GROUND.ABGRUND]: [[126, 110, 176, 0.85], [42, 32, 80], [14, 10, 28]]
};
// Kronen: Grundfarbe, zweite Farbe, Glanzlicht, Größe
const MAP_TREE_LOOK = {
  [OBJ.TREE]: ['#3a6a2c', '#467a34', '#6ea04e', 0.62],
  [OBJ.PINE]: ['#24452c', '#2c5236', '#4e7e5a', 0.54],
  [OBJ.BLOSSOM]: ['#c87a98', '#d690ae', '#f6c4d6', 0.6],
  [OBJ.DEADTREE]: ['#5e4636', '#6e5444', '#94785e', 0.34]
};
const MAP_STAND_COLORS = ['#b8452e', '#2e6ab8', '#c89a2e', '#3a8a4a', '#8a3ab8', '#2e9aa0'];
// Mauern auf der Karte je Art (seit 14.16): Umriss, Fläche, helle Oberkante
const MAP_WALL_LOOK = {
  stein: ['#2c2a30', '#a8a298', '#d2ccc0'],
  palisade: ['#2a1a0e', '#7a5434', '#a8804e'],
  terrasse: ['#3a3a44', '#9a9aa4', '#f2f6fa'],
  kristall: ['#1a1430', '#6a5ac8', '#c8bfff']
};

// weicher Mittelwert über (2r+1)² Kacheln, am Rand geklemmt (getrennt nach x und y, gleitende Summe)
function mapBlur(src, W, H, r) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let s = 0;
    for (let d = -r; d <= r; d++) s += src[row + Math.max(0, Math.min(W - 1, d))];
    for (let x = 0; x < W; x++) {
      tmp[row + x] = s / k;
      s += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let d = -r; d <= r; d++) s += tmp[Math.max(0, Math.min(H - 1, d)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / k;
      s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

// Farbe der Karte: etwas wärmer und weicher als die Bodenfarbe (Pergament-Ton)
function mapSoftColor(g) {
  const c = MAP_COLORS[g] || MAP_COLORS[GROUND.CAVE];
  const grey = (c[0] + c[1] + c[2]) / 3;
  return [
    (c[0] * 0.86 + grey * 0.06 + 222 * 0.08),
    (c[1] * 0.86 + grey * 0.06 + 204 * 0.08),
    (c[2] * 0.86 + grey * 0.06 + 160 * 0.08)
  ];
}

function* buildWorldArt(area, S) {
  const w = game.world;
  const W = area.w;
  const H = area.h;
  const N = W * H;
  const at = (x, y) => (area.y + y) * MAP_W + area.x + x;
  const B = MAP_BORDER;
  const inBorder = (x, y) => x < B || y < B || x >= W - B || y >= H - B;
  // 1. Felder je Kachel: Wasser, Bäume, Höhe
  const wet = new Float32Array(N);
  const trees = new Float32Array(N);
  const hgt = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      const k = y * W + x;
      const g = w.ground[i];
      const o = w.obj[i];
      wet[k] = LIQUID.has(g) || g === GROUND.ICE ? 1 : 0;
      trees[k] = ROAD_TREES.has(o) ? 1 : 0;
      // Höhe: etwas Rauschen der Welt, Felsen und Wald heben, Gewässer liegen in Senken
      hgt[k] = (w.shade[i] / 255) * 0.35 + (o === OBJ.ROCK ? 1 : 0) + trees[k] * 0.3 - wet[k] * 0.7 + (inBorder(x, y) ? 0.6 : 0);
    }
  }
  const hs = mapBlur(mapBlur(hgt, W, H, 3), W, H, 3);
  const forest = mapBlur(mapBlur(trees, W, H, 2), W, H, 1);
  yield;
  // Gewässer: Art je Kachel (auch für die Ufer daneben) und zwei geglättete Felder für weiche Umrisse
  const liqKeys = Object.keys(MAP_LIQ).map(Number);
  const kind = new Uint8Array(N);
  const M = new Float32Array(N);
  for (let y = B; y < H - B; y++) {
    for (let x = B; x < W - B; x++) {
      const k = y * W + x;
      if (!wet[k]) continue;
      const g = w.ground[at(x, y)];
      kind[k] = liqKeys.indexOf(MAP_LIQ[g] ? g : GROUND.WATER) + 1;
      M[k] = 1;
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x;
        if (kind[k]) continue;
        kind[k] = kind[k - 1] || kind[k + 1] || kind[k - W] || kind[k + W] || 0;
      }
    }
  }
  yield;
  const near = mapBlur(M, W, H, 1);
  const far = mapBlur(M, W, H, 2);
  const F = new Float32Array(N);
  const D = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    F[k] = M[k] * 0.5 + near[k] * 0.5;
    D[k] = M[k] * 0.3 + far[k] * 0.7;
  }
  // 2. Boden und Gewässer: zwei Bildpunkte je Kachel, alle Werte zwischen den Kachelmitten weich gemischt
  // (Farbe, Licht, Wasserfelder), dann weich vergrößert. Ufer: heller Saum, flaches Wasser, dunklere Mitte.
  const pathCol = mapSoftColor(GROUND.PATH);
  // Grundfarben je Kachel, weich verwischt (keine Kachelflecken); unter Wasser der Boden des Gebiets
  const cr = new Float32Array(N);
  const cg = new Float32Array(N);
  const cb = new Float32Array(N);
  // Farben einmal je Bodenart bzw. je Gebiet (unter Wegen und Gewässern) ausrechnen, nicht je Kachel
  const soft = [];
  const zoneCol = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      const k = y * W + x;
      const g = w.ground[i];
      let col;
      let m = 0;
      if (g === GROUND.PATH || wet[k]) {
        // Wege zeichnet der Vektor-Teil, Gewässer die eigene Ebene; darunter der Boden des Gebiets (beim Weg getönt)
        const zi = w.zoneIdx[i];
        if (!zoneCol[zi]) {
          const zg = GROUND[ZONES[zi].ground];
          zoneCol[zi] = mapSoftColor(zg != null ? zg : GROUND.GRASS);
        }
        col = zoneCol[zi];
        m = wet[k] ? 0 : 0.4;
      } else col = soft[g] || (soft[g] = mapSoftColor(g));
      cr[k] = col[0] * (1 - m) + pathCol[0] * m;
      cg[k] = col[1] * (1 - m) + pathCol[1] * m;
      cb[k] = col[2] * (1 - m) + pathCol[2] * m;
    }
  }
  yield;
  const R1 = mapBlur(mapBlur(cr, W, H, 1), W, H, 1);
  const G1 = mapBlur(mapBlur(cg, W, H, 1), W, H, 1);
  const B1 = mapBlur(mapBlur(cb, W, H, 1), W, H, 1);
  yield;
  // Licht je Kachel: Hügel von Nordwesten beleuchtet, oben heller, Waldflächen dunkler und grüner
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      const xa = Math.max(0, x - 1);
      const ya = Math.max(0, y - 1);
      const xb = Math.min(W - 1, x + 1);
      const yb = Math.min(H - 1, y + 1);
      const slope = (hs[ya * W + xa] - hs[yb * W + xb]) * 4;
      const f = forest[k];
      const light = (1 + Math.max(-0.12, Math.min(0.12, slope)) + (hs[k] - 0.15) * 0.08) * (1 - f * 0.34);
      R1[k] = R1[k] * light - f * 6;
      G1[k] = G1[k] * light + f * 4;
      B1[k] = B1[k] * light - f * 4;
    }
  }
  yield;
  // Boden: eine Kachel ein Bildpunkt, beim Vergrößern weich gemischt
  const lo = document.createElement('canvas');
  lo.width = W;
  lo.height = H;
  const lx = lo.getContext('2d');
  const img = lx.createImageData(W, H);
  const d = img.data;
  for (let k = 0; k < N; k++) {
    const n = ((tileHash(area.x + (k % W), area.y + ((k / W) | 0)) % 5) - 2) * 0.8;
    d[k * 4] = R1[k] + n;
    d[k * 4 + 1] = G1[k] + n;
    d[k * 4 + 2] = B1[k] + n;
    d[k * 4 + 3] = 255;
  }
  lx.putImageData(img, 0, 0);
  yield;
  // Gewässer: eigene Ebene mit zwei Bildpunkten je Kachel, nur rund um das Wasser berechnet; die Felder werden
  // zwischen den Kachelmitten gemischt, so entstehen weiche, runde Ufer statt Kachelecken
  const Q = 2;
  const wl = document.createElement('canvas');
  wl.width = W * Q;
  wl.height = H * Q;
  const wx = wl.getContext('2d');
  const wimg = wx.createImageData(W * Q, H * Q);
  const wd = wimg.data;
  const LC = liqKeys.map((g) => MAP_LIQ[g]);
  const step = (a, b, v) => (v <= a ? 0 : v >= b ? 1 : (v - a) / (b - a));
  for (let y0 = 0; y0 < H - 1; y0++) {
    if (y0 % 40 === 39) yield;
    for (let x0 = 0; x0 < W - 1; x0++) {
      const k00 = y0 * W + x0;
      const k10 = k00 + 1;
      const k01 = k00 + W;
      const k11 = k01 + 1;
      if (F[k00] < 0.15 && F[k10] < 0.15 && F[k01] < 0.15 && F[k11] < 0.15) continue;
      for (let sy = 0; sy < Q; sy++) {
        const fy = (sy + 0.5) / Q;
        for (let sx = 0; sx < Q; sx++) {
          const fx = (sx + 0.5) / Q;
          const w00 = (1 - fx) * (1 - fy);
          const w10 = fx * (1 - fy);
          const w01 = (1 - fx) * fy;
          const w11 = fx * fy;
          const fw = F[k00] * w00 + F[k10] * w10 + F[k01] * w01 + F[k11] * w11;
          if (fw < 0.17) continue;
          const kk = kind[(fx < 0.5 ? x0 : x0 + 1) + (fy < 0.5 ? y0 : y0 + 1) * W] || kind[k00] || kind[k11] || 1;
          const [shore, shallow, deepC] = LC[kk - 1];
          const a1 = step(0.17, 0.23, fw) * shore[3];
          const a2 = step(0.33, 0.39, fw);
          let r = shore[0];
          let g = shore[1];
          let b = shore[2];
          if (a2 > 0) {
            const dw = D[k00] * w00 + D[k10] * w10 + D[k01] * w01 + D[k11] * w11;
            const a3 = step(0.62, 0.9, dw);
            r += (shallow[0] + (deepC[0] - shallow[0]) * a3 - r) * a2;
            g += (shallow[1] + (deepC[1] - shallow[1]) * a3 - g) * a2;
            b += (shallow[2] + (deepC[2] - shallow[2]) * a3 - b) * a2;
          }
          const p = (((y0 * Q + sy + 1) * W * Q) + x0 * Q + sx + 1) * 4;
          wd[p] = r;
          wd[p + 1] = g;
          wd[p + 2] = b;
          wd[p + 3] = (a2 + a1 * (1 - a2)) * 255;
        }
      }
    }
  }
  wx.putImageData(wimg, 0, 0);
  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(lo, 0, 0, c.width, c.height);
  cx.drawImage(wl, 0, 0, c.width, c.height);
  const disc = (list, r, style) => {
    if (!list.length) return;
    cx.fillStyle = style;
    cx.beginPath();
    for (let q = 0; q < list.length; q += 3) {
      const rr = list[q + 2] * r;
      cx.moveTo(list[q] + rr, list[q + 1]);
      cx.arc(list[q], list[q + 1], rr, 0, MAP_TAU);
    }
    cx.fill();
  };
  yield;
  // 3. Feine Punktlinien an den Gebietsgrenzen (nicht am Rand der Stadt)
  const dots = [];
  for (let y = B; y < H - B - 1; y++) {
    for (let x = B; x < W - B - 1; x++) {
      if ((x + y) % 3) continue;
      const i = at(x, y);
      const z = w.zoneIdx[i];
      if (ZONES[z].safe) continue;
      const zr = w.zoneIdx[i + 1];
      const zd = w.zoneIdx[i + MAP_W];
      if ((zr !== z && !ZONES[zr].safe) || (zd !== z && !ZONES[zd].safe)) dots.push((x + 1) * S, (y + 1) * S, 1);
    }
  }
  disc(dots, S * 0.2, 'rgba(58,38,18,0.38)');
  yield;
  // 4. Kleine Wellen auf tiefem Wasser, glühende Adern in der Lava
  const waves = new Map();
  for (let y = B; y < H - B; y++) {
    for (let x = B; x < W - B; x++) {
      const k = y * W + x;
      if (D[k] < 0.7 || !kind[k]) continue;
      const g = liqKeys[kind[k] - 1];
      if (tileHash(area.x + x, area.y + y) % (g === GROUND.LAVA ? 4 : 6)) continue;
      if (!waves.has(g)) waves.set(g, []);
      waves.get(g).push((x + 0.5) * S, (y + 0.5) * S, 1);
    }
  }
  for (const [g, marks] of waves) {
    if (g === GROUND.LAVA) {
      disc(marks, S * 0.32, 'rgba(255,214,110,0.55)');
      continue;
    }
    cx.strokeStyle = g === GROUND.ABGRUND ? 'rgba(168,150,255,0.35)' : g === GROUND.ICE ? 'rgba(255,255,255,0.6)' : 'rgba(235,248,255,0.45)';
    cx.lineWidth = Math.max(0.8, S * 0.16);
    cx.beginPath();
    for (let q = 0; q < marks.length; q += 3) {
      const px = marks[q];
      const py = marks[q + 1];
      cx.moveTo(px - S * 0.45, py);
      cx.quadraticCurveTo(px, py - S * 0.35, px + S * 0.45, py);
    }
    cx.stroke();
  }
  yield;
  // 5. Wege: dunkler Rand, helles Band, feine Mittellinie; das Ende weiter Wege läuft schmal aus
  const ROAD_W = { gate: 2.0, main: 2.3, branch: 1.9, trail: 1.05 };
  const segs = [];
  for (const r of w.roads || []) {
    if (!area.wm || r.map !== area.wm.id) continue;
    const pts = r.pts;
    const n = pts.length / 2;
    if (n < 2) continue;
    // in Stücke zu etwa 12 Punkten (für die wechselnde Breite), die sich überlappen
    const step = 12;
    for (let s0 = 0; s0 < n - 1; s0 += step) {
      const s1 = Math.min(n - 1, s0 + step);
      const fr = s1 / (n - 1);
      let wd = ROAD_W[r.kind] || 2;
      if (r.kind === 'main' && fr > 0.8) wd = wd + (ROAD_W.trail - wd) * Math.min(1, (fr - 0.8) / 0.2);
      segs.push({ pts, a: s0, b: s1, wd });
    }
  }
  const strokeSegs = (extra, style, k) => {
    cx.strokeStyle = style;
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    for (const sg of segs) {
      cx.lineWidth = Math.max(1, (sg.wd * k + extra) * S);
      cx.beginPath();
      const P = sg.pts;
      const X = (q) => (P[q * 2] - area.x) * S;
      const Y = (q) => (P[q * 2 + 1] - area.y) * S;
      cx.moveTo(X(sg.a), Y(sg.a));
      for (let q = sg.a + 1; q < sg.b; q++) cx.quadraticCurveTo(X(q), Y(q), (X(q) + X(q + 1)) / 2, (Y(q) + Y(q + 1)) / 2);
      cx.lineTo(X(sg.b), Y(sg.b));
      cx.stroke();
    }
  };
  strokeSegs(0.75, 'rgba(78,58,34,0.72)', 1);
  strokeSegs(0, '#dcc59a', 1);
  strokeSegs(0, 'rgba(250,238,205,0.5)', 0.32);
  // Brücken: Bretter quer zum Weg
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (w.deco[at(x, y)] !== DECO.BRIDGE) continue;
      cx.fillStyle = '#8a6440';
      cx.fillRect(x * S - 0.5, y * S - 0.5, S + 1, S + 1);
      cx.fillStyle = 'rgba(40,24,10,0.5)';
      const horiz = typeof bridgeHoriz === 'function' && bridgeHoriz(area.x + x, area.y + y);
      for (let q = 1; q < 3; q++) {
        if (horiz) cx.fillRect(x * S + (q * S) / 3, y * S, 1, S);
        else cx.fillRect(x * S, y * S + (q * S) / 3, S, 1);
      }
    }
  }
  // 6. Felsrand der Map als dunkles Band mit hellerer Kante
  cx.fillStyle = 'rgba(28,22,16,0.5)';
  cx.fillRect(0, 0, c.width, B * S);
  cx.fillRect(0, c.height - B * S, c.width, B * S);
  cx.fillRect(0, B * S, B * S, c.height - 2 * B * S);
  cx.fillRect(c.width - B * S, B * S, B * S, c.height - 2 * B * S);
  cx.strokeStyle = 'rgba(232,214,170,0.35)';
  cx.lineWidth = Math.max(1, S * 0.3);
  cx.strokeRect(B * S, B * S, c.width - 2 * B * S, c.height - 2 * B * S);
  yield;
  // 7. Felsen und Bäume: erst der Kronenteppich der Wälder, dann alle Schatten, dann Kronen und Glanzlichter
  const rocks = [];
  const under = [];
  const shadow = [];
  const crowns = new Map();
  for (let y = B; y < H - B; y++) {
    for (let x = B; x < W - B; x++) {
      const o = w.obj[at(x, y)];
      if (o !== OBJ.ROCK && !ROAD_TREES.has(o)) continue;
      const h = tileHash(area.x + x, area.y + y);
      const jx = (((h >> 3) % 7) - 3) * 0.06;
      const jy = (((h >> 6) % 7) - 3) * 0.06;
      const sz = 0.86 + ((h >> 9) % 5) * 0.07;
      const px = (x + 0.5 + jx) * S;
      const py = (y + 0.5 + jy) * S;
      if (o === OBJ.ROCK) {
        rocks.push(px, py, sz);
        continue;
      }
      const look = MAP_TREE_LOOK[o];
      if (o !== OBJ.DEADTREE) under.push(px, py, sz);
      shadow.push(px + S * 0.24, py + S * 0.3, sz * look[3]);
      if (!crowns.has(o)) crowns.set(o, [[], [], []]);
      const lists = crowns.get(o);
      lists[(h >> 12) & 1].push(px, py, sz * look[3]);
      lists[2].push(px - S * 0.18, py - S * 0.2, sz * look[3] * 0.42);
    }
  }
  disc(under, S * 1.15, 'rgba(22,44,20,0.28)');
  disc(shadow, S, 'rgba(10,14,8,0.34)');
  disc(rocks, S * 0.48, 'rgba(20,18,16,0.6)');
  disc(rocks, S * 0.4, '#8f8a80');
  disc(rocks.map((v, q) => (q % 3 === 0 ? v - S * 0.1 : q % 3 === 1 ? v - S * 0.12 : v)), S * 0.2, '#c2bcb0');
  for (const [o, lists] of crowns) {
    const look = MAP_TREE_LOOK[o];
    disc(lists[0], S, look[0]);
    disc(lists[1], S, look[1]);
    disc(lists[2], S, look[2]);
  }
  yield;
  // 8. Städte: Pflasterfugen, Mauer, Türme, Häuser, Stände, Brunnen (nur im Quadrat um die Stadt gesucht)
  const tcx = (area.wm.id === 1 ? CENTER_X : area.wm.cx) - area.x;
  const tcy = (area.wm.id === 1 ? CENTER_Y : area.wm.cy) - area.y;
  const th = (area.wm.id === 1 ? VILLAGE_HALF : area.wm.camp || CAMP_HALF) + 2;
  const tx0 = Math.max(0, tcx - th);
  const tx1 = Math.min(W - 1, tcx + th);
  const ty0 = Math.max(0, tcy - th);
  const ty1 = Math.min(H - 1, tcy + th);
  const fugen = new Path2D();
  const wallDark = new Path2D();
  const wallStone = new Path2D();
  const wallTop = new Path2D();
  // seit 14.16: Palisade, Stützmauer und Kristallwand in eigenen Farben (welt.js WALL_STYLE)
  const styled = {};
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const i = at(x, y);
      const ws = w.obj[i] === OBJ.WALL ? WALL_STYLE.get((area.y + y) * MAP_W + area.x + x) : null;
      if (ws) {
        const P = styled[ws] || (styled[ws] = [new Path2D(), new Path2D(), new Path2D()]);
        P[0].rect(x * S - 1, y * S - 1, S + 2, S + 2);
        P[1].rect(x * S + 0.5, y * S + 0.5, S - 1, S - 1);
        P[2].rect(x * S + 0.5, y * S + 0.5, S - 1, S * 0.35);
      } else if (w.obj[i] === OBJ.WALL) {
        wallDark.rect(x * S - 1, y * S - 1, S + 2, S + 2);
        wallStone.rect(x * S + 0.5, y * S + 0.5, S - 1, S - 1);
        wallTop.rect(x * S + 0.5, y * S + 0.5, S - 1, S * 0.35);
      } else if (w.ground[i] === GROUND.PLAZA) {
        const h = tileHash(area.x + x, area.y + y);
        fugen.rect(x * S + (h % 3), y * S + ((h >> 2) % 3), S * 0.45, 1);
      }
    }
  }
  cx.fillStyle = 'rgba(80,66,48,0.22)';
  cx.fill(fugen);
  cx.fillStyle = '#2c2a30';
  cx.fill(wallDark);
  cx.fillStyle = '#8e8a84';
  cx.fill(wallStone);
  cx.fillStyle = '#b8b2a8';
  cx.fill(wallTop);
  for (const [ws, P] of Object.entries(styled)) {
    const [dark, base, top] = MAP_WALL_LOOK[ws];
    cx.fillStyle = dark;
    cx.fill(P[0]);
    cx.fillStyle = base;
    cx.fill(P[1]);
    cx.fillStyle = top;
    cx.fill(P[2]);
  }
  const inArt = (px, py) => px >= area.x * TILE && py >= area.y * TILE && px < (area.x + W) * TILE && py < (area.y + H) * TILE;
  const AX = (px) => (px / TILE - area.x) * S;
  const AY = (py) => (py / TILE - area.y) * S;
  for (const pr of w.props || []) {
    if (!inArt(pr.x, pr.y)) continue;
    const px = AX(pr.x);
    const py = AY(pr.y) - S * 0.5;
    if (TOWER_TYPES.has(pr.type)) {
      const [dark, base, top] = MAP_WALL_LOOK[pr.type === 'holzturm' ? 'palisade' : pr.type === 'kristallturm' ? 'kristall' : 'stein'];
      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.beginPath();
      cx.arc(px + S * 0.25, py + S * 0.3, S * 0.95, 0, MAP_TAU);
      cx.fill();
      cx.fillStyle = dark;
      cx.beginPath();
      cx.arc(px, py, S * 0.95, 0, MAP_TAU);
      cx.fill();
      cx.fillStyle = base;
      cx.beginPath();
      cx.arc(px, py, S * 0.72, 0, MAP_TAU);
      cx.fill();
      cx.fillStyle = top;
      cx.beginPath();
      cx.arc(px - S * 0.2, py - S * 0.22, S * 0.3, 0, MAP_TAU);
      cx.fill();
    } else if (pr.type === 'stand') {
      const k = Math.abs(hashText(String(pr.roof || ''))) % MAP_STAND_COLORS.length;
      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.fillRect(px - S * 0.45 + 1, py - S * 0.1 + 1.5, S * 0.9, S * 0.6);
      cx.fillStyle = MAP_STAND_COLORS[k];
      cx.fillRect(px - S * 0.45, py - S * 0.1, S * 0.9, S * 0.6);
      cx.fillStyle = 'rgba(255,245,220,0.55)';
      cx.fillRect(px - S * 0.45, py - S * 0.1, S * 0.9, S * 0.16);
    } else if (pr.type === 'well') {
      cx.fillStyle = '#4a4440';
      cx.beginPath();
      cx.arc(px, py + S * 0.5, S * 0.62, 0, MAP_TAU);
      cx.fill();
      cx.fillStyle = '#5aa0d0';
      cx.beginPath();
      cx.arc(px, py + S * 0.5, S * 0.38, 0, MAP_TAU);
      cx.fill();
    }
  }
  // Häuser als kleine Hausbilder: Wand mit Tür, darüber das Dach mit First
  for (const h of w.houses || []) {
    if (h.x + h.w <= area.x || h.y + h.h <= area.y || h.x >= area.x + W || h.y >= area.y + H) continue;
    const hx = (h.x - area.x) * S;
    const hy = (h.y - area.y) * S;
    const hw = h.w * S;
    const hh = h.h * S;
    const eave = hy + hh * 0.52;
    cx.fillStyle = 'rgba(0,0,0,0.38)';
    cx.fillRect(hx + S * 0.35, hy + S * 0.45, hw, hh);
    cx.fillStyle = '#d8c8a4';
    cx.fillRect(hx + hw * 0.08, eave, hw * 0.84, hh * 0.48);
    cx.fillStyle = '#3a2614';
    cx.fillRect(hx + hw * 0.44, eave + hh * 0.16, hw * 0.12, hh * 0.32);
    cx.fillStyle = 'rgba(60,40,20,0.6)';
    cx.fillRect(hx + hw * 0.18, eave + hh * 0.14, hw * 0.12, hh * 0.12);
    cx.fillRect(hx + hw * 0.7, eave + hh * 0.14, hw * 0.12, hh * 0.12);
    cx.fillStyle = h.roof || '#7c3a2c';
    cx.beginPath();
    cx.moveTo(hx, eave + 0.5);
    cx.lineTo(hx + hw * 0.16, hy);
    cx.lineTo(hx + hw * 0.84, hy);
    cx.lineTo(hx + hw, eave + 0.5);
    cx.closePath();
    cx.fill();
    cx.fillStyle = 'rgba(255,255,255,0.2)';
    cx.fillRect(hx + hw * 0.16, hy, hw * 0.68, hh * 0.16);
    cx.strokeStyle = 'rgba(24,14,8,0.85)';
    cx.lineWidth = 1.2;
    cx.stroke();
    cx.strokeRect(hx + hw * 0.08, eave, hw * 0.84, hh * 0.48);
  }
  yield;
  // 9. warmer Pergament-Ton und leichter Schatten am Rand
  cx.globalCompositeOperation = 'multiply';
  cx.fillStyle = 'rgba(246,228,192,0.4)';
  cx.fillRect(0, 0, c.width, c.height);
  cx.globalCompositeOperation = 'source-over';
  const vg = cx.createLinearGradient(0, 0, 0, c.height);
  vg.addColorStop(0, 'rgba(0,0,0,0.16)');
  vg.addColorStop(0.07, 'rgba(0,0,0,0)');
  vg.addColorStop(0.93, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.16)');
  cx.fillStyle = vg;
  cx.fillRect(0, 0, c.width, c.height);
  return c;
}

function buildMapArt(area, S) {
  const w = game.world;
  // 1. Boden: eine Kachel ein Bildpunkt, leicht gesprenkelt, dann weich vergrößert
  const lo = document.createElement('canvas');
  lo.width = area.w;
  lo.height = area.h;
  const lx = lo.getContext('2d');
  const img = lx.createImageData(area.w, area.h);
  const d = img.data;
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = (area.y + y) * MAP_W + area.x + x;
      let col = MAP_COLORS[w.ground[i]] || MAP_COLORS[GROUND.CAVE];
      const o = w.obj[i];
      if (o === OBJ.CAVEWALL) col = [30, 24, 20];
      else if (w.deco[i] === DECO.BRIDGE) col = [146, 110, 70];
      const n = (tileHash(area.x + x, area.y + y) % 7) - 3;
      const k = (y * area.w + x) * 4;
      d[k] = col[0] + n;
      d[k + 1] = col[1] + n;
      d[k + 2] = col[2] + n;
      d[k + 3] = 255;
    }
  }
  // weich zeichnen (3 × 3, Mitte doppelt), sonst sieht man beim Vergrößern die Kachelquadrate;
  // Dungeons bleiben scharf (klare Räume und Gänge)
  const src = area.wm ? d.slice() : null;
  const W = area.w;
  for (let y = 0; src && y < area.h; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let j = -1; j <= 1; j++) {
        const yy = y + j;
        if (yy < 0 || yy >= area.h) continue;
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          if (xx < 0 || xx >= W) continue;
          const wt = (i === 0 ? 2 : 1) * (j === 0 ? 2 : 1);
          const k = (yy * W + xx) * 4;
          r += src[k] * wt;
          g += src[k + 1] * wt;
          b += src[k + 2] * wt;
          n += wt;
        }
      }
      const k = (y * W + x) * 4;
      d[k] = r / n;
      d[k + 1] = g / n;
      d[k + 2] = b / n;
    }
  }
  lx.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = area.w * S;
  c.height = area.h * S;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = !!area.wm;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(lo, 0, 0, c.width, c.height);
  // 2. Wellen auf dem Wasser
  cx.strokeStyle = 'rgba(200,230,255,0.35)';
  cx.lineWidth = 1;
  cx.beginPath();
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = (area.y + y) * MAP_W + area.x + x;
      if (w.ground[i] !== GROUND.WATER || tileHash(area.x + x, area.y + y) % 5) continue;
      const px = (x + 0.5) * S;
      const py = (y + 0.5) * S;
      cx.moveTo(px - S * 0.35, py);
      cx.quadraticCurveTo(px, py - S * 0.3, px + S * 0.35, py);
    }
  }
  cx.stroke();
  // 3. Bäume, Felsen, Mauern: erst alle Schatten, dann die Formen
  const R = S * 0.62;
  const kinds = [];
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const o = w.obj[(area.y + y) * MAP_W + area.x + x];
      if (o === OBJ.TREE || o === OBJ.PINE || o === OBJ.BLOSSOM || o === OBJ.ROCK || o === OBJ.DEADTREE) kinds.push(o, x, y);
    }
  }
  cx.fillStyle = 'rgba(10,16,8,0.32)';
  cx.beginPath();
  for (let k = 0; k < kinds.length; k += 3) {
    const r = kinds[k] === OBJ.DEADTREE ? R * 0.5 : kinds[k] === OBJ.ROCK ? R * 0.75 : R;
    const px = (kinds[k + 1] + 0.5) * S + S * 0.22;
    const py = (kinds[k + 2] + 0.5) * S + S * 0.26;
    cx.moveTo(px + r, py);
    cx.arc(px, py, r, 0, Math.PI * 2);
  }
  cx.fill();
  const LOOK = {
    [OBJ.TREE]: ['#2e5a24', '#4e8a38', 1],
    [OBJ.PINE]: ['#1f3e28', '#3a6a44', 0.9],
    [OBJ.BLOSSOM]: ['#c87898', '#f2b8cc', 1],
    [OBJ.ROCK]: ['#76726c', '#aaa69e', 0.72],
    [OBJ.DEADTREE]: ['#5a4232', '#7c5e48', 0.45]
  };
  for (let k = 0; k < kinds.length; k += 3) {
    const [base, hi, size] = LOOK[kinds[k]];
    const px = (kinds[k + 1] + 0.5) * S;
    const py = (kinds[k + 2] + 0.5) * S;
    const r = R * size;
    cx.fillStyle = 'rgba(12,16,10,0.55)';
    cx.beginPath();
    cx.arc(px, py, r + 0.8, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = base;
    cx.beginPath();
    cx.arc(px, py, r, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = hi;
    cx.beginPath();
    cx.arc(px - r * 0.3, py - r * 0.32, r * 0.45, 0, Math.PI * 2);
    cx.fill();
  }
  // Mauern als Steinband mit heller Oberkante
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      if (w.obj[(area.y + y) * MAP_W + area.x + x] !== OBJ.WALL) continue;
      const look = MAP_WALL_LOOK[WALL_STYLE.get((area.y + y) * MAP_W + area.x + x)];
      cx.fillStyle = look ? look[0] : '#3c3e48';
      cx.fillRect(x * S - 0.5, y * S - 0.5, S + 1, S + 1);
      cx.fillStyle = look ? look[2] : '#7a7e8e';
      cx.fillRect(x * S + 1, y * S + 1, S - 2, S * 0.4);
    }
  }
  // 4. Häuser mit Dach und First
  for (const h of w.houses || []) {
    if (h.x + h.w <= area.x || h.y + h.h <= area.y || h.x >= area.x + area.w || h.y >= area.y + area.h) continue;
    const hx = (h.x - area.x) * S;
    const hy = (h.y - area.y) * S;
    const hw = h.w * S;
    const hh = h.h * S;
    cx.fillStyle = 'rgba(0,0,0,0.35)';
    cx.fillRect(hx + 2, hy + 3, hw, hh);
    cx.fillStyle = h.roof || '#7c3a2c';
    cx.fillRect(hx, hy, hw, hh);
    cx.fillStyle = 'rgba(255,255,255,0.18)';
    cx.fillRect(hx, hy, hw, hh / 2);
    cx.strokeStyle = 'rgba(20,10,6,0.85)';
    cx.lineWidth = 1.5;
    cx.strokeRect(hx + 0.75, hy + 0.75, hw - 1.5, hh - 1.5);
    cx.beginPath();
    cx.moveTo(hx + 2, hy + hh / 2);
    cx.lineTo(hx + hw - 2, hy + hh / 2);
    cx.stroke();
  }
  // 5. leichter Schatten am Rand des Gebiets
  const vg = cx.createLinearGradient(0, 0, 0, c.height);
  vg.addColorStop(0, 'rgba(0,0,0,0.18)');
  vg.addColorStop(0.08, 'rgba(0,0,0,0)');
  vg.addColorStop(0.92, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  cx.fillStyle = vg;
  cx.fillRect(0, 0, c.width, c.height);
  return c;
}

// --- Wegweiser ------------------------------------------------------------------------------------
// Einträge: was der Spieler gerade verfolgt. Ziel: wohin der Pfeil zeigt (x, y in Pixeln, Name, Text).
const guide = { t: -9, list: [], cur: null, entry: null, key: '', pick: null, pin: null };

function guideEntries() {
  const p = game.player;
  const q = questState();
  const out = [];
  if (guide.pin) out.push({ key: 'pin', kind: 'main', title: 'Markierung', pin: true });
  const main = currentMainQuest();
  // seit 11.2 zum Ältesten der richtigen Map (Reiseauftrag: zum Ältesten der Ziel-Map, Finale: zum nächsten Endboss)
  const elder = (mapId) => {
    const n = elderOf(mapId);
    return n ? { npc: n } : { role: 'aeltester' };
  };
  if (main && q.accepted) {
    if (main.goal.type === 'talk') out.push({ key: 'main', kind: 'main', title: main.title, ...elder(main.goal.map), done: true });
    else if (goalDone(main.goal, q.progress)) out.push({ key: 'main', kind: 'main', title: main.title, ...elder(main.map), done: true });
    else if (main.goal.type === 'raids') out.push({ key: 'main', kind: 'main', title: main.title, monster: nextRaidBoss() });
    else out.push({ key: 'main', kind: 'main', title: main.title, monster: main.goal.type === 'kill' ? main.goal.monster : null, stone: main.goal.type === 'stone' ? main.goal.level : 0 });
  }
  const st = q.stable;
  if (st.state === 'done') out.push({ key: 'stable', kind: 'main', title: STABLE_QUEST.title, role: 'stallmeister', done: true });
  else if (st.state === 'active') out.push({ key: 'stable', kind: 'main', title: STABLE_QUEST.title, minLevel: STABLE_QUEST.minLevel });
  if (q.side) {
    for (const n of allWanderers()) {
      if (!q.side[n.key] || q.side[n.key].state !== 'active') continue;
      const done = sideDone(n, q.side[n.key]);
      out.push(done ? { key: 'side:' + n.key, kind: 'side', title: n.name, npc: n, done: true } : { key: 'side:' + n.key, kind: 'side', title: n.name, monster: sideMon(n, q.side[n.key]) });
    }
  }
  const h = q.hunt;
  if (h) out.push(h.progress >= h.count ? { key: 'hunt', kind: 'side', title: 'Jagd', role: 'jaegerin', done: true } : { key: 'hunt', kind: 'side', title: 'Jagd', monster: h.monster });
  // Nachtjagden (seit 13.63 verfolgbar): zu den Nachtmonstern (die Belohnung kommt sofort, keine Abgabe)
  if (typeof nightQuestList === 'function') for (const e of nightQuestList()) out.push({ key: e.key, kind: 'side', title: e.title, monster: e.monster });
  // Nichts angenommen: zum nächsten Auftrag, den es abzuholen gibt
  if (!out.length) {
    if (main && p.level >= main.level) out.push({ key: 'offer', kind: 'main', title: main.title, ...elder(main.map), offer: true });
    else if (st.state === 'open' && p.level >= STABLE_QUEST.level) out.push({ key: 'offer', kind: 'main', title: STABLE_QUEST.title, role: 'stallmeister', offer: true });
  }
  return out;
}

// Verfolgter Eintrag: der angetippte, sonst eine fertige Abgabe, sonst der erste
function guideChoose(list) {
  return list.find((e) => e.key === guide.pick) || list.find((e) => e.pin) || list.find((e) => e.done) || list[0] || null;
}

// Nächstes Wesen (NPC oder Monster) im Gebiet, das test() erfüllt
function nearestIn(arr, area, p, test) {
  let best = null;
  let bd = Infinity;
  for (const e of arr) {
    if (!test(e) || !inArea(area, e.x, e.y)) continue;
    const dd = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (dd < bd) {
      bd = dd;
      best = e;
    }
  }
  return best;
}

// Punkt im Ring eines Gebiets in Richtung des Spielers (falls gerade kein passendes Monster bekannt ist)
function zoneRingSpot(z, from, to, p) {
  const wm = WORLD_MAPS.find((m) => m.id === z.map) || WORLD_MAPS[0];
  const safe = wm.id === 1 ? SAFE_RING : (wm.camp || CAMP_HALF) + 7;
  const outer = Math.min(z.maxDist, wm.reach); // seit 14.50 bis zur fernsten Ecke ab der Stadt
  const inner = Math.max(z.minDist + 2, safe);
  const r = inner + (Math.max(inner, outer) - inner) * (from + to) / 2;
  let a = Math.atan2(p.y / TILE - wm.cy, p.x / TILE - wm.cx);
  if (!isFinite(a)) a = 0;
  const pad = MAP_BORDER + 3;
  const x = Math.max(wm.region[0] + pad, Math.min(wm.region[0] + wm.region[2] - pad, wm.cx + Math.cos(a) * r));
  const y = Math.max(wm.region[1] + pad, Math.min(wm.region[1] + wm.region[3] - pad, wm.cy + Math.sin(a) * r));
  return { x: x * TILE, y: y * TILE };
}

// Wohin für ein Monster (oder einen Seelenstein einer Stufe)? Erst das nächste bekannte im Gebiet,
// dann der Ring des Gebiets auf dieser Map, dann der Dungeon-Eingang, sonst eine andere Map.
function huntTarget(e, p, area) {
  const isStone = e.stone > 0;
  const fit = isStone ? (m) => m.isStone && m.level === e.stone : e.minLevel ? (m) => !m.isStone && !m.dead && m.level >= e.minLevel : (m) => !m.isStone && m.typeId === e.monster;
  const alive = nearestIn(game.monsters, area, p, (m) => !m.dead && fit(m));
  const name = isStone ? `${stoneType(e.stone).name}` : e.minLevel ? `Monster ab Stufe ${e.minLevel}` : MONSTER_TYPES[e.monster].name;
  if (alive) return { x: alive.x, y: alive.y, name, follow: alive };
  if (e.minLevel) return null;
  const zones = isStone
    ? ZONES.filter((z) => (z.stones && z.stones.some((s) => s[0] === e.stone)) || (z.dungeon && z.dungeon.stones.includes(e.stone)))
    : monsterPlaces(e.monster);
  // Dungeon, in dem man gerade steht
  if (area.dungeon >= 0 && zones.some((z) => z.dungeon === DUNGEONS[area.dungeon])) {
    const home = nearestIn(game.monsters, area, p, (m) => fit(m));
    return home ? { x: home.homeX || home.x, y: home.homeY || home.y, name } : null;
  }
  const mapId = area.wm && area.wm.id;
  const open = zones.find((z) => !z.dungeon && z.map === mapId);
  if (open) {
    // seit 13.63 auch Nachtmonster (deren Gruppen stehen in zone.night)
    const g = isStone ? open.stones.find((s) => s[0] === e.stone) : (open.groups || []).find((x) => x[0] === e.monster) || (open.night || []).find((x) => x[0] === e.monster);
    const s = g ? zoneRingSpot(open, g[2], g[3], p) : zoneRingSpot(open, 0, 1, p);
    return { x: s.x, y: s.y, name: `${name} · ${open.name}` };
  }
  const dz = zones.find((z) => z.dungeon && (z.dungeon.entry ? z.dungeon.entry.map || 1 : 1) === mapId);
  if (dz) {
    const k = DUNGEONS.indexOf(dz.dungeon);
    const gate = nearestIn(game.world.npcs, area, p, (n) => n.id === 'eingang' && n.dungeon === k);
    if (gate) return { x: gate.x, y: gate.y, name: `${dz.dungeon.name} (Dungeon)` };
  }
  return { away: zones.length ? zoneMapName(zones[0]) : '' };
}

// Ausgang (im Dungeon) oder Weltentor (auf einer Map), wenn das Ziel woanders liegt
function routeOut(area, p, toName) {
  if (area.dungeon >= 0) {
    const ex = nearestIn(game.world.npcs, area, p, (n) => n.id === 'ausgang');
    return ex ? { x: ex.x, y: ex.y, name: 'Ausgang', sub: toName ? `danach weiter nach ${toName}` : '' } : null;
  }
  const gate = nearestIn(game.world.npcs, area, p, (n) => n.id === 'weltentor' && !n.to) || nearestIn(game.world.npcs, area, p, (n) => n.id === 'weltentor');
  return gate ? { x: gate.x, y: gate.y, name: 'Weltentor', sub: toName ? `Reise nach ${toName}` : '' } : null;
}

function guideTarget(e, p) {
  const area = mapAreaAt(p.x / TILE, p.y / TILE);
  if (!area) return null;
  if (e.pin) return inArea(area, guide.pin.x, guide.pin.y) ? { x: guide.pin.x, y: guide.pin.y, name: 'Markierung' } : null;
  if (e.npc) {
    if (inArea(area, e.npc.x, e.npc.y)) return { x: e.npc.x, y: e.npc.y, name: e.npc.name };
    const wm = mapOfTile(e.npc.x / TILE, e.npc.y / TILE);
    return routeOut(area, p, wm && wm.name);
  }
  if (e.role) {
    const n = nearestIn(game.world.npcs, area, p, (x) => x.id === e.role);
    return n ? { x: n.x, y: n.y, name: n.name } : routeOut(area, p, '');
  }
  const t = huntTarget(e, p, area);
  if (!t) return null;
  if (t.away !== undefined) return routeOut(area, p, t.away);
  return t;
}

// alle 0,4 Sekunden: Ziel neu bestimmen
function updateGuide() {
  const p = game.player;
  if (!p || !game.running || !game.world) {
    guide.cur = null;
    return;
  }
  if (game.time - guide.t < 0.4 && game.time >= guide.t) {
    // ein verfolgtes Monster bewegt sich: Ziel mitziehen
    const c = guide.cur;
    if (c && c.follow && !c.follow.dead) {
      c.x = c.follow.x;
      c.y = c.follow.y;
    }
    return;
  }
  guide.t = game.time;
  if (guide.pin && Math.hypot(guide.pin.x - p.x, guide.pin.y - p.y) < TILE * 2) {
    guide.pin = null;
    ui.log('Markierung erreicht.', 'info');
  }
  guide.list = guideEntries();
  guide.entry = guideChoose(guide.list);
  guide.cur = guide.entry ? guideTarget(guide.entry, p) : null;
  if (guide.cur) guide.cur.dist = Math.hypot(guide.cur.x - p.x, guide.cur.y - p.y);
  // ein anderer Auftrag wird verfolgt (z. B. einer ist erfüllt): Auftragsliste neu zeichnen
  const key = guide.entry ? guide.entry.key : '';
  if (key !== guide.key) {
    guide.key = key;
    ui.renderQuestTrack();
    return;
  }
  const el = document.getElementById('qlNav');
  if (el) el.textContent = guideText();
}

// „➜ Älteste Bao · 42 m“
function guideText() {
  const c = guide.cur;
  if (!c) return '';
  const m = Math.max(1, Math.round(c.dist / TILE));
  return `➜ ${c.name} · ${m} m${c.sub ? ` · ${c.sub}` : ''}`;
}

const _gA = {};
const _gB = {};
function guideScreen(wx, wy, out) {
  if (V3.on) return v3Project(wx, wy, 0, out);
  out.x = (wx - renderer.camX) * renderer.zoom;
  out.y = (wy - renderer.camY) * renderer.zoom;
  out.z = 0;
  return out;
}

// Goldener Pfeil neben der eigenen Figur, dazu Name und Entfernung des Ziels; ist das Ziel im Bild,
// schwebt über ihm ein goldener Pfeil nach unten
function drawGuide(ctx) {
  const p = game.player;
  const c = guide.cur;
  if (!c || !p || p.dead || !game.running || game.duel) return;
  // seit 13.2: bei Seelenstein-Aufträgen kein Pfeil (das Ziel springt zwischen den Steinen hin und her)
  if (guide.entry && guide.entry.stone > 0 && !guide.entry.done) return;
  const r = renderer;
  const dx = c.x - p.x;
  const dy = c.y - p.y;
  const dist = Math.hypot(dx, dy);
  ctx.save();
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  // seit 13.2 rund ein Drittel kleiner
  const s = 0.7 * Math.max(0.75, Math.min(1.3, Math.min(r.w, r.h) / 420));
  const gold = c.sub ? '#9fd8ff' : guide.entry && guide.entry.kind === 'side' && !guide.entry.done ? '#8ef08e' : '#ffd34d';
  // Ziel im Bild: Pfeil über dem Ziel
  const tz = guideScreen(c.x, c.y, _gB);
  const onScreen = tz.z < 1 && tz.x > 20 && tz.x < r.w - 20 && tz.y > 30 && tz.y < r.h - 10;
  if (onScreen && dist > TILE * 1.2) {
    let h = _gB;
    if (V3.on) h = v3Project(c.x, c.y, c.follow ? v3HeadHeight(c.follow) + 0.5 : 2.6, _gB);
    else _gB.y -= 60 * r.zoom;
    const bob = Math.sin(game.time * 5) * 4 * s;
    drawGuideChevron(ctx, h.x, h.y - 10 * s + bob, Math.PI / 2, 13 * s, gold);
  }
  if (dist < TILE * 2.5) {
    ctx.restore();
    return;
  }
  const fy = feetY(p);
  guideScreen(p.x, fy, _gA);
  guideScreen(p.x + (dx / dist) * 48, fy + (dy / dist) * 48, _gB);
  const ang = Math.atan2(_gB.y - _gA.y, _gB.x - _gA.x);
  const R = 84 * s;
  const ax = _gA.x + Math.cos(ang) * R;
  // nach oben weiter weg, damit der Pfeil nicht auf Figur und Namen liegt
  const ry = Math.sin(ang) < 0 ? 1.35 : 0.75;
  const ay = _gA.y - 6 * s + Math.sin(ang) * R * ry;
  const pulse = 1 + 0.08 * Math.sin(game.time * 6);
  // zwei kleine Vorläufer laufen in Pfeilrichtung, damit man die Richtung auch aus dem Augenwinkel sieht
  const run = (game.time * 1.4) % 1;
  for (let k = 0; k < 2; k++) {
    const f = (run + k * 0.5) % 1;
    const rr = R * (0.55 + f * 0.35);
    ctx.globalAlpha = Math.sin(f * Math.PI) * 0.7;
    drawGuideChevron(ctx, _gA.x + Math.cos(ang) * rr, _gA.y - 6 * s + Math.sin(ang) * rr * ry, ang, 8 * s, gold);
  }
  ctx.globalAlpha = 1;
  drawGuideChevron(ctx, ax, ay, ang, 19 * s * pulse, gold);
  // Name und Entfernung in kleiner Schrift neben dem Pfeil
  const txt = `${typeof trName === 'function' ? trName(c.name) : c.name} · ${Math.max(1, Math.round(dist / TILE))} m`;
  ctx.font = `700 ${Math.max(10, Math.round(13 * s))}px "Alegreya Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lx = ax + Math.cos(ang) * 22 * s;
  const ly = ay + Math.sin(ang) * 18 * s + (Math.sin(ang) > -0.3 ? 16 : -16) * s;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20,12,4,0.9)';
  ctx.strokeText(txt, lx, ly);
  ctx.fillStyle = '#fff0c4';
  ctx.fillText(txt, lx, ly);
  ctx.restore();
}

function drawGuideChevron(ctx, x, y, ang, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 0, size * 1.9, color, 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.75);
  ctx.lineTo(-size * 0.25, 0);
  ctx.lineTo(-size * 0.7, size * 0.75);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -size, 0, size);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.45, color);
  g.addColorStop(1, '#a8720c');
  ctx.fillStyle = g;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(40,24,4,0.95)';
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

// --- Zeichen auf der Karte (Minikarte und große Karte) -------------------------------------------
// v: { ox, oy } linke obere Kachel, sc Bildpunkte je Kachel, w/h Größe, big (große Karte), round (Minikarte), u Größe der Zeichen
function questGlyph(ctx, x, y, ch, color, u) {
  ctx.font = `900 ${Math.round(11 * u)}px "Alegreya Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.6 * u;
  ctx.strokeStyle = '#1a1208';
  ctx.strokeText(ch, x, y);
  ctx.fillStyle = color;
  ctx.fillText(ch, x, y);
}

function questMarkChar(n) {
  const mark = questMarker(n.id, n);
  if (!mark) return null;
  const q = questState();
  let done = false;
  if (n.id === 'aeltester') done = q.accepted;
  else if (n.id === 'stallmeister') done = q.stable.state === 'done';
  else if (n.id === 'jaegerin') done = !!q.hunt;
  else if (n.id === 'wanderer') done = sideState(n.key).state === 'active';
  return { ch: done ? '?' : '!', color: mark === 'main' ? '#ffd34d' : '#6ae86a' };
}

function drawMapMarks(ctx, v, area) {
  const p = game.player;
  const u = v.u;
  const X = (wx) => (wx / TILE - v.ox) * v.sc;
  const Y = (wy) => (wy / TILE - v.oy) * v.sc;
  const inside = (x, y, pad) => x > -pad && y > -pad && x < v.w + pad && y < v.h + pad;
  // Monster: rote Punkte, Bosse größer und orange
  // seit 10.8: erst grob nach Weltlage aussortieren, dann alle Punkte einer Farbe in einem Pfad (statt je Monster
  // einzeln füllen und umranden) – bei über 5.000 Monstern in der Welt um ein Vielfaches schneller
  const wx0 = v.ox * TILE;
  const wy0 = v.oy * TILE;
  const wx1 = wx0 + (v.w / v.sc) * TILE;
  const wy1 = wy0 + (v.h / v.sc) * TILE;
  const seen = [];
  const stones = [];
  const bosses = [];
  for (const m of game.monsters) {
    if (m.dead || m.duelProxy || m.x < wx0 || m.y < wy0 || m.x > wx1 || m.y > wy1) continue;
    if (m.isStone) stones.push(m);
    else if (m.type && m.type.boss) bosses.push(m);
    else seen.push(m);
  }
  const dots = (list, r, fill) => {
    if (!list.length) return;
    ctx.beginPath();
    for (const m of list) {
      const x = X(m.x);
      const y = Y(m.y);
      if (!inside(x, y, 0)) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  ctx.lineWidth = 0.8 * u;
  ctx.strokeStyle = 'rgba(30,6,4,0.9)';
  dots(seen, (v.big ? 1.9 : 1.6) * u, '#e8402e');
  dots(bosses, 3.4 * u, '#ff9a2a');
  // Seelensteine: Quadrat in ihrer Farbe
  for (const m of stones) {
    const x = X(m.x);
    const y = Y(m.y);
    if (!inside(x, y, 0)) continue;
    if (v.big) {
      // seit 13.91 auf der großen Karte als Kristall (Raute) mit Schein
      mapCrystal(ctx, x, y, u, m.stoneType.look.glow);
      continue;
    }
    const s = 2.8 * u;
    ctx.fillStyle = m.stoneType.look.glow;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * u;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.strokeRect(x - s, y - s, s * 2, s * 2);
  }
  // Teleportsteine (seit 14.16): kleines Zeichen, auf der großen Karte mit Linie zum Partner (teleportsteine.js)
  if (typeof tpDrawMap === 'function') tpDrawMap(ctx, X, Y, inside, u, v.big);
  // Bewohner, Tore, Risse, Auftraggeber
  const labels = v.big ? [] : null;
  // seit 13.91: gleiche Namen dicht beieinander nur einmal (am Weltentor standen zwei)
  const label = (x, y, t, col) => {
    if (labels.some((l) => l[2] === t && Math.abs(l[0] - x) < 30 * u && Math.abs(l[1] - y) < 24 * u)) return;
    labels.push([x, y, t, col]);
  };
  for (const n of game.world.npcs) {
    if (n.silent || (n.wander && n.id !== 'wanderer')) continue;
    const x = X(n.x);
    const y = Y(n.y);
    if (!inside(x, y, 0)) continue;
    if (n.id === 'riss') {
      const r = (4 + Math.sin(game.time * 6) * 1.5) * u;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r + 1.5 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DUNGEONS[n.dungeon].portal;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (labels) label(x, y + 9 * u, 'Dungeon-Riss', '#e8d0ff');
      continue;
    }
    if (v.big && (n.id === 'eingang' || n.id === 'ausgang' || n.id === 'weltentor')) {
      // seit 13.91: Tore als kleine Torbögen mit leuchtender Öffnung in ihrer Farbe
      const gate = n.id === 'weltentor';
      mapArch(ctx, x, y, u * (gate || (n.dungeon != null && DUNGEONS[n.dungeon].inst60) ? 1.15 : 1), gate ? '#9fd8ff' : DUNGEONS[n.dungeon].portal);
      label(x, gate ? y - 11 * u : y + 11 * u, gate ? 'Weltentor' : n.name, gate ? '#cfeaff' : '#e8d0ff');
      continue;
    }
    if (n.id === 'eingang' || n.id === 'ausgang') {
      const s = 4 * u;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.fillStyle = DUNGEONS[n.dungeon].portal;
      ctx.fillRect(x - s + u, y - s + u, s * 2 - 2 * u, s * 2 - 2 * u);
      if (labels) label(x, y + 10 * u, n.name, '#e8d0ff');
      continue;
    }
    if (n.id === 'weltentor') {
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.arc(x, y, 3.6 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(160,220,255,0.5)';
      ctx.fill();
      if (labels) label(x, y - 9 * u, 'Weltentor', '#cfeaff');
      continue;
    }
    const mk = questMarkChar(n);
    if (mk) {
      glow(ctx, x, y, 7 * u, mk.color, 0.45);
      questGlyph(ctx, x, y, mk.ch, mk.color, u * (v.big ? 1.15 : 1));
    } else {
      ctx.fillStyle = '#f0e2b4';
      ctx.strokeStyle = '#2a1c0c';
      ctx.lineWidth = 0.8 * u;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // Ziel des Wegweisers: goldene Nadel; außerhalb der runden Minikarte ein Pfeil am Rand
  const c = guide.cur;
  const half = v.w / 2;
  if (c) {
    const x = X(c.x);
    const y = Y(c.y);
    const ddx = x - half;
    const ddy = y - v.h / 2;
    const d = Math.hypot(ddx, ddy);
    if (v.round && d > half - 7 * u) {
      const a = Math.atan2(ddy, ddx);
      edgeArrow(ctx, half + Math.cos(a) * (half - 7 * u), half + Math.sin(a) * (half - 7 * u), a, u, '#ffd34d');
    } else if (inside(x, y, 0)) {
      if (v.big && p) {
        // gestrichelte Linie vom Spieler zum Ziel
        ctx.save();
        ctx.setLineDash([4 * u, 4 * u]);
        ctx.strokeStyle = 'rgba(255,211,77,0.8)';
        ctx.lineWidth = 1.6 * u;
        ctx.beginPath();
        ctx.moveTo(X(p.x), Y(p.y));
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }
      const b = Math.sin(game.time * 5) * 1.5 * u;
      ctx.fillStyle = '#ffd34d';
      ctx.strokeStyle = '#2a1a04';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(x, y + b);
      ctx.lineTo(x - 3.6 * u, y - 7 * u + b);
      ctx.arc(x, y - 8 * u + b, 3.6 * u, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (labels) label(x, y - 16 * u, c.name, '#ffe08a');
    }
  }
  // Mitspieler: Gruppe grün, Gilde lila, andere hellblau; Gruppe außerhalb der Minikarte als Randpfeil
  const myGuild = p && p.guild && p.guild.name;
  for (const rp of net.players.values()) {
    if (rp.gone || remoteHidden(rp)) continue;
    const x = X(rp.x);
    const y = Y(rp.y);
    const mate = inMyParty(rp.name);
    const guildMate = !mate && myGuild && rp.guild === myGuild;
    // seit 14.54: Spieler der anderen Seite rot (seiten.js)
    const foe = !mate && typeof factionFoe === 'function' && factionFoe(rp);
    const col = mate ? '#5dff6e' : guildMate ? '#d08cff' : foe ? '#ff5a4a' : '#9fd6ff';
    const ddx = x - half;
    const ddy = y - v.h / 2;
    const d = Math.hypot(ddx, ddy);
    if (v.round && (mate || guildMate) && d > half - 7 * u) {
      const a = Math.atan2(ddy, ddx);
      edgeArrow(ctx, half + Math.cos(a) * (half - 7 * u), half + Math.sin(a) * (half - 7 * u), a, u * (mate ? 1 : 0.8), col);
      continue;
    }
    if (v.round ? d > half : !inside(x, y, 0)) continue;
    if (mate || guildMate) {
      const pulse = (5.5 + Math.sin(game.time * 5) * 1.2) * u;
      ctx.strokeStyle = mate ? 'rgba(93,255,110,0.55)' : 'rgba(208,140,255,0.55)';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(x, y, pulse + 2 * u, 0, Math.PI * 2);
      ctx.stroke();
      if (labels) label(x, y - 10 * u, rp.name, col);
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = mate || guildMate ? '#ffffff' : '#000000';
    ctx.lineWidth = (mate || guildMate ? 1.5 : 1) * u;
    ctx.beginPath();
    ctx.arc(x, y, (mate || guildMate ? 4 : 2.6) * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // eigene Figur: Pfeil in Blickrichtung mit hellem Schein
  if (p && game.running && inArea(area, p.x, p.y)) {
    const px = X(p.x);
    const py = Y(p.y);
    const glowG = ctx.createRadialGradient(px, py, 0, px, py, 9 * u);
    glowG.addColorStop(0, 'rgba(255,240,190,0.6)');
    glowG.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = glowG;
    ctx.fillRect(px - 9 * u, py - 9 * u, 18 * u, 18 * u);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(p.facing.y, p.facing.x));
    ctx.scale(u, u);
    ctx.fillStyle = '#fff6d8';
    ctx.strokeStyle = '#1a1208';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(5.5, 0);
    ctx.lineTo(-3.5, -3.8);
    ctx.lineTo(-1.8, 0);
    ctx.lineTo(-3.5, 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (labels) label(px, py + 13 * u, 'Du', '#fff6d8');
  }
  // Namen der großen Karte zuletzt, damit nichts sie verdeckt
  if (labels) {
    ctx.font = `700 ${Math.round(10.5 * u)}px "Alegreya Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = 'rgba(16,10,4,0.9)';
    for (const [x0, y, t0, col] of labels) {
      const t = typeof trName === 'function' ? trName(t0) : t0;
      // seit 13.91 nicht mehr über den Kartenrand hinaus (Instanz-Tore in den Ecken)
      const tw = ctx.measureText(t).width / 2 + 4 * u;
      const x = Math.max(tw, Math.min(v.w - tw, x0));
      ctx.strokeText(t, x, y);
      ctx.fillStyle = col;
      ctx.fillText(t, x, y);
    }
  }
}

// Torbogen (seit 13.91, große Karte): zwei Pfeiler mit Bogen aus dunklem Stein, die Öffnung leuchtet in der Farbe
// des Tores
function mapArch(ctx, x, y, u, col) {
  glow(ctx, x, y - u, 8 * u, col, 0.45);
  const w = 4.6 * u;
  const top = y - 1.5 * u;
  ctx.fillStyle = '#2a2018';
  ctx.strokeStyle = '#0c0804';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(x - w, y + 4.2 * u);
  ctx.lineTo(x - w, top);
  ctx.arc(x, top, w, Math.PI, 0);
  ctx.lineTo(x + w, y + 4.2 * u);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, top - w, 0, y + 4 * u);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, col);
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, y + 4.2 * u);
  ctx.lineTo(x - w * 0.55, top);
  ctx.arc(x, top, w * 0.55, Math.PI, 0);
  ctx.lineTo(x + w * 0.55, y + 4.2 * u);
  ctx.closePath();
  ctx.fill();
}

// Seelenstein (seit 13.91, große Karte): Kristall als Raute mit Glanz
function mapCrystal(ctx, x, y, u, col) {
  glow(ctx, x, y, 7 * u, col, 0.4);
  ctx.fillStyle = col;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(x, y - 4.6 * u);
  ctx.lineTo(x + 3 * u, y);
  ctx.lineTo(x, y + 4.6 * u);
  ctx.lineTo(x - 3 * u, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(x - 0.4 * u, y - 3.2 * u);
  ctx.lineTo(x - 1.9 * u, y - 0.3 * u);
  ctx.stroke();
}

function edgeArrow(ctx, x, y, a, u, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(u, u);
  ctx.fillStyle = col;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Minikarte ------------------------------------------------------------------------------------
// Ausschnitt von 60 Kacheln um die Figur, gezeichnet in 120er-Einheiten (am PC und Handy feiner)
const MINIMAP_TILES = 60;

function renderMinimap() {
  updateGuide();
  const ctx = renderer.miniCtx;
  const k = renderer.mini.width / 120;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const W = 120;
  ctx.clearRect(0, 0, W, W);
  const p = game.player;
  const cx = p && game.running ? p.x / TILE : CENTER_X;
  const cy = p && game.running ? p.y / TILE : CENTER_Y;
  const area = mapAreaAt(cx, cy);
  if (!area || !game.world) return;
  // noch im Bau (seit 13.91): hier ein weiteres Stück mitbauen, falls zwischen den Bildern wenig Zeit bleibt
  const art = mapArtStep(mapArt(area), 8);
  const T = MINIMAP_TILES;
  const ox = area.w <= T ? area.x + (area.w - T) / 2 : Math.max(area.x, Math.min(area.x + area.w - T, cx - T / 2));
  const oy = area.h <= T ? area.y + (area.h - T) / 2 : Math.max(area.y, Math.min(area.y + area.h - T, cy - T / 2));
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1c140c';
  ctx.fillRect(0, 0, W, W);
  ctx.imageSmoothingEnabled = true;
  const sc = W / T;
  // nur der Teil, der im Gebiet liegt (Dungeon-Blöcke sind kleiner als der Ausschnitt)
  const sx0 = Math.max(area.x, ox);
  const sy0 = Math.max(area.y, oy);
  const sx1 = Math.min(area.x + area.w, ox + T);
  const sy1 = Math.min(area.y + area.h, oy + T);
  // seit 13.91 kann die Grafik einer eben betretenen Map noch im Bau sein (mapArtSlices): dann nur die Zeichen
  if (art.c) {
    ctx.drawImage(art.c, (sx0 - area.x) * art.S, (sy0 - area.y) * art.S, (sx1 - sx0) * art.S, (sy1 - sy0) * art.S,
      (sx0 - ox) * sc, (sy0 - oy) * sc, (sx1 - sx0) * sc, (sy1 - sy0) * sc);
  }
  // leichter Schatten zum Rand hin, damit die Karte wie eine Linse im Messingring wirkt
  const vig = ctx.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,6,2,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, W);
  // auf der kleinen Handy-Karte die Zeichen größer, damit sie auffallen
  const u = Math.max(1, Math.min(2.2, 105 / (renderer.mini.clientWidth || W)));
  drawMapMarks(ctx, { ox, oy, sc, w: W, h: W, big: false, round: true, u }, area);
  ctx.restore();
}

// --- Große Karte ----------------------------------------------------------------------------------
// Seit 10.8 in zwei Ebenen: Das Gelände mit den Gebietsnamen (#bigMap) wird nur beim Öffnen, bei neuer Größe oder
// in einem anderen Gebiet gezeichnet; die Markierungen (#bigMapFx: Monster, Steine, Leute, Ziel, Mitspieler)
// jedes dritte Bild auf einer leeren Ebene darüber. Vorher wurde alles jedes sechste Bild neu gezeichnet und ruckelte.
const bigMap = { view: null, area: null, timer: 0, baseKey: '' };

function openBigMap() {
  const el = document.getElementById('panelMap');
  if (!el || !game.player) return;
  ui.toggle('panelMap');
  if (!el.hidden) {
    bigMap.timer = 0;
    bigMap.boxAt = 0;
    // seit 13.91 bleibt das gezeichnete Gelände beim Schließen stehen: Wieder öffnen auf derselben Map (gleiche Welt,
    // Größe und Sprache) zeichnet nur die Markierungen neu (vorher wurde das Gelände bei jedem Öffnen neu gezeichnet)
    renderBigMap();
  }
}

function bigMapOpen() {
  const el = document.getElementById('panelMap');
  return !!el && !el.hidden;
}

// Markierungen jedes Bild neu (seit 13.4, vorher jedes dritte), das Gelände bleibt als Bild stehen
function tickBigMap() {
  if (!bigMapOpen()) return;
  renderBigMap();
}

function renderBigMap() {
  const p = game.player;
  const cv = document.getElementById('bigMap');
  const fx = document.getElementById('bigMapFx');
  if (!cv || !fx || !p) return;
  updateGuide();
  const area = mapAreaAt(p.x / TILE, p.y / TILE);
  if (!area) return;
  // Größe: so groß wie möglich im Fenster, Seitenverhältnis des Gebiets
  // Fenstergröße nur alle 0,5 s messen (Messen erzwingt ein Layout und kostet jedes Bild Zeit)
  const now = performance.now();
  if (!bigMap.box || now - (bigMap.boxAt || 0) > 500) {
    bigMap.box = cv.parentElement.parentElement.getBoundingClientRect();
    bigMap.boxAt = now;
  }
  const box = bigMap.box;
  const scale = Math.max(0.5, Math.min(box.width / area.w, box.height / area.h));
  const cw = Math.floor(area.w * scale);
  const ch = Math.floor(area.h * scale);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const view = { ox: area.x, oy: area.y, sc: scale, w: cw, h: ch, big: true, round: false, u: Math.max(1, Math.min(1.6, cw / 620)) };
  // Gelände nur, wenn sich etwas geändert hat
  const key = `${area.key}|${cw}|${ch}|${dpr}|${typeof i18n !== 'undefined' ? i18n.lang : ''}`;
  if (bigMap.baseKey !== key || bigMap.world !== game.world) {
    bigMap.baseKey = key;
    bigMap.world = game.world;
    for (const c of [cv, fx]) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
      c.style.width = cw + 'px';
      c.style.height = ch + 'px';
    }
    const art = mapArtStep(mapArt(area), Infinity);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(art.c, 0, 0, cw, ch);
    // seit 13.91: Rahmen im Pergament-Stil, Kompass und schön gesetzte Gebietsnamen (nur auf den Maps)
    if (area.wm) {
      drawZoneLabels(ctx, area, view);
      drawMapFrame(ctx, cw, ch, area);
      drawMapCompass(ctx, cw, ch, area, view);
    } else drawZoneLabels(ctx, area, view);
  }
  bigMap.area = area;
  bigMap.view = view;
  const fctx = fx.getContext('2d');
  fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.clearRect(0, 0, fx.width, fx.height);
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawMapMarks(fctx, view, area);
  // Kopfzeile
  const z = zoneAt(p.x, p.y);
  const title = document.getElementById('mapTitle');
  const name = area.wm ? `${area.wm.name} · ${area.wm.levels}` : `${z.name}`;
  if (title.textContent !== name) title.textContent = name;
  document.getElementById('mapClearPin').hidden = !guide.pin;
  const nav = document.getElementById('mapNav');
  const t = guide.cur ? `${guide.entry && !guide.entry.pin ? guide.entry.title + ': ' : ''}${guideText()}` : 'Kein Ziel – tippe auf die Karte, um eine Markierung zu setzen.';
  if (nav.textContent !== t) nav.textContent = t;
}

// Namen der Gebiete auf der großen Karte (Ringe um das Lager, abwechselnd links und rechts)
function drawZoneLabels(ctx, area, v) {
  if (!area.wm) return;
  const wm = area.wm;
  const zs = ZONES.filter((z) => z.map === wm.id && !z.dungeon);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // seit 14.50: Liegt die Stadt weit neben der Mitte, stehen die Namen der Gebiete auf der weiteren Seite der Map
  // (oben und unten im Wechsel), sonst wie bisher links und rechts im Wechsel
  const [mrx, mry, mrw, mrh] = wm.region;
  const farSide = Math.abs(wm.cx - (mrx + mrw / 2)) >= 30 ? (wm.cx > mrx + mrw / 2 ? -1 : 1) : 0;
  let side = 1;
  for (const z of zs) {
    let x;
    let y;
    if (z.safe) {
      // Kazehana über dem Dorf, Lager und Städte darunter (über ihnen steht das Weltentor)
      x = wm.cx;
      // seit 13.91 überall über der Stadt (darunter liegt das Tor zum Endboss)
      y = wm.cy - (wm.id === 1 ? VILLAGE_HALF : wm.camp || CAMP_HALF) - 3;
    } else {
      const outer = Math.min(z.maxDist, Math.max(wm.cx - mrx, mrx + mrw - wm.cx) - MAP_BORDER - 4);
      let r = (Math.max(z.minDist, wm.id === 1 ? SAFE_RING : 0) + outer) / 2;
      // seit 13.91: nie in die Mauer der Stadt hinein (in den großen Städten lag der Name halb auf der Mauer)
      ctx.font = `400 ${Math.round(16 * v.u)}px "Marcellus SC", "Palatino Linotype", Georgia, serif`;
      const half = ctx.measureText(typeof trName === 'function' ? trName(z.name) : z.name).width / 2 / v.sc;
      r = Math.max(r, (wm.id === 1 ? VILLAGE_HALF : wm.camp || CAMP_HALF) + 8 + half);
      x = wm.cx + (farSide || side) * r;
      y = wm.cy + (side > 0 ? -1 : 1) * Math.min(r * 0.35, wm.region[3] / 2 - 10);
      // seit 14.50: auf der weiteren Seite halb zwischen Stadt und Mitte der Höhe, mehrere Gebiete versetzt
      if (farSide) y = (wm.cy + mry + mrh / 2) / 2 + (zs.length > 2 ? (side > 0 ? -1 : 1) * 22 : 0);
      // seit 14.50: auf der Map bleiben (Stadt am Rand)
      x = Math.max(mrx + MAP_BORDER + 4 + half, Math.min(mrx + mrw - MAP_BORDER - 4 - half, x));
      y = Math.max(mry + MAP_BORDER + 6, Math.min(mry + mrh - MAP_BORDER - 6, y));
      side = -side;
    }
    const sx = (x - v.ox) * v.sc;
    const sy = (y - v.oy) * v.sc;
    const zn = typeof trName === 'function' ? trName(z.name) : z.name;
    if (z.safe) {
      mapRibbon(ctx, sx, sy, zn, v.u);
      continue;
    }
    // seit 13.91 wie auf einer gezeichneten Landkarte: dunkle Schrift in Kapitälchen mit hellem Saum, darunter die
    // Stufen kursiv zwischen zwei feinen Strichen (vorher helle Schrift mit schwarzem Rand)
    const u = v.u;
    ctx.font = `400 ${Math.round(16 * u)}px "Marcellus SC", "Palatino Linotype", Georgia, serif`;
    mapSpacing(ctx, 1.6 * u);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5 * u;
    ctx.strokeStyle = 'rgba(248,236,206,0.88)';
    ctx.strokeText(zn, sx, sy);
    ctx.fillStyle = '#3a2410';
    ctx.fillText(zn, sx, sy);
    mapSpacing(ctx, 0);
    if (z.levels) {
      const zl = typeof trName === 'function' ? trName(z.levels) : z.levels;
      ctx.font = `italic 600 ${Math.round(11 * u)}px "Alegreya Sans", sans-serif`;
      const tw = ctx.measureText(zl).width;
      const ly = sy + 14 * u;
      ctx.lineWidth = 3.5 * u;
      ctx.strokeText(zl, sx, ly);
      ctx.fillStyle = '#5a3a18';
      ctx.fillText(zl, sx, ly);
      ctx.strokeStyle = 'rgba(58,36,16,0.75)';
      ctx.lineWidth = 1 * u;
      ctx.beginPath();
      ctx.moveTo(sx - tw / 2 - 18 * u, ly);
      ctx.lineTo(sx - tw / 2 - 5 * u, ly);
      ctx.moveTo(sx + tw / 2 + 5 * u, ly);
      ctx.lineTo(sx + tw / 2 + 18 * u, ly);
      ctx.stroke();
    }
  }
}

// Buchstabenabstand, wo der Browser ihn kann (seit 13.91)
function mapSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// Name einer Stadt auf einem Schriftband mit eingekerbten Enden (seit 13.91)
function mapRibbon(ctx, x, y, text, u) {
  ctx.save();
  ctx.font = `400 ${Math.round(13 * u)}px "Marcellus SC", "Palatino Linotype", Georgia, serif`;
  mapSpacing(ctx, 1.2 * u);
  const tw = ctx.measureText(text).width;
  const hw = tw / 2 + 11 * u;
  const hh = 8.5 * u;
  // Enden hinter dem Band
  ctx.fillStyle = '#a8864a';
  ctx.strokeStyle = '#3a2814';
  ctx.lineWidth = 1.2 * u;
  for (const s of [-1, 1]) {
    const x0 = x + s * (hw - 4 * u);
    const x1 = x + s * (hw + 9 * u);
    ctx.beginPath();
    ctx.moveTo(x0, y - hh + 4 * u);
    ctx.lineTo(x1, y - hh + 4 * u);
    ctx.lineTo(x1 - s * 4 * u, y + 2 * u);
    ctx.lineTo(x1, y + hh + 4 * u);
    ctx.lineTo(x0, y + hh + 4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - hw + 1.5 * u, y - hh + 2 * u, hw * 2, hh * 2);
  const g = ctx.createLinearGradient(0, y - hh, 0, y + hh);
  g.addColorStop(0, '#f4e6c0');
  g.addColorStop(1, '#d8bc84');
  ctx.fillStyle = g;
  ctx.fillRect(x - hw, y - hh, hw * 2, hh * 2);
  ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a2410';
  ctx.fillText(text, x, y + 0.5 * u);
  ctx.restore();
}

// Körnung für den Pergament-Rand (einmal erzeugt, fest aus der Lage berechnet)
let _mapGrain = null;
function mapGrain(ctx) {
  if (!_mapGrain) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const x = c.getContext('2d');
    for (let k = 0; k < 900; k++) {
      const h = tileHash(k * 7, k * 13);
      x.fillStyle = h & 1 ? 'rgba(90,60,20,0.16)' : 'rgba(255,248,220,0.18)';
      x.fillRect(h % 96, (h >> 7) % 96, 1 + ((h >> 14) & 1), 1);
    }
    _mapGrain = c;
  }
  return ctx.createPattern(_mapGrain, 'repeat');
}

// Rahmen der großen Karte (seit 13.91): Pergament-Band mit Maßstrichen, doppelter Linie und Eckstücken; er liegt
// über dem Felsrand der Map, den man ohnehin nicht betreten kann
function drawMapFrame(ctx, cw, ch, area) {
  const b = Math.max(7, Math.min(16, Math.round(Math.min(cw, ch) * 0.02)));
  ctx.save();
  // innere Schattenkante: die Karte liegt etwas tiefer als der Rand
  const sh = b * 1.4;
  for (const [x0, y0, x1, y1, w, h] of [[b, b, b, b + sh, cw - 2 * b, sh], [b, ch - b, b, ch - b - sh, cw - 2 * b, -sh], [b, b, b + sh, b, sh, ch - 2 * b], [cw - b, b, cw - b - sh, b, -sh, ch - 2 * b]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(40,24,8,0.45)');
    g.addColorStop(1, 'rgba(40,24,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x0 + w), Math.min(y0, y0 + h), Math.abs(w), Math.abs(h));
  }
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.rect(b, b, cw - 2 * b, ch - 2 * b);
  const pg = ctx.createLinearGradient(0, 0, cw, ch);
  pg.addColorStop(0, '#ecd8a8');
  pg.addColorStop(0.5, '#dcc28a');
  pg.addColorStop(1, '#c8a86a');
  ctx.fillStyle = pg;
  ctx.fill('evenodd');
  ctx.fillStyle = mapGrain(ctx);
  ctx.fill('evenodd');
  // Maßstriche
  ctx.strokeStyle = 'rgba(70,44,16,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const nx = 24;
  const ny = Math.max(8, Math.round((nx * (ch - 2 * b)) / (cw - 2 * b)));
  for (let k = 1; k < nx; k++) {
    const x = Math.round(b + ((cw - 2 * b) * k) / nx) + 0.5;
    const l = k % 4 === 0 ? b * 0.62 : b * 0.34;
    ctx.moveTo(x, b);
    ctx.lineTo(x, b - l);
    ctx.moveTo(x, ch - b);
    ctx.lineTo(x, ch - b + l);
  }
  for (let k = 1; k < ny; k++) {
    const y = Math.round(b + ((ch - 2 * b) * k) / ny) + 0.5;
    const l = k % 4 === 0 ? b * 0.62 : b * 0.34;
    ctx.moveTo(b, y);
    ctx.lineTo(b - l, y);
    ctx.moveTo(cw - b, y);
    ctx.lineTo(cw - b + l, y);
  }
  ctx.stroke();
  // Linien: außen dunkel, innen dunkel mit goldener Begleitlinie
  ctx.strokeStyle = '#3a2814';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, cw - 1.5, ch - 1.5);
  ctx.strokeRect(b - 0.75, b - 0.75, cw - 2 * b + 1.5, ch - 2 * b + 1.5);
  ctx.strokeStyle = 'rgba(176,132,60,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(b + 1.5, b + 1.5, cw - 2 * b - 3, ch - 2 * b - 3);
  // Eckstücke
  const e = Math.round(b * 1.5);
  for (const [x, y] of [[0, 0], [cw - e, 0], [0, ch - e], [cw - e, ch - e]]) {
    ctx.fillStyle = '#3a2814';
    ctx.fillRect(x, y, e, e);
    ctx.fillStyle = '#c9a35a';
    ctx.fillRect(x + 2, y + 2, e - 4, e - 4);
    ctx.fillStyle = '#6a4a20';
    ctx.fillRect(x + e * 0.32, y + e * 0.32, e * 0.36, e * 0.36);
  }
  ctx.restore();
}

// Kompass (seit 13.91): eine Nadel auf einer Pergament-Scheibe, in einer Ecke ohne Instanz-Tor
function drawMapCompass(ctx, cw, ch, area, v) {
  const used = new Set(DUNGEONS.filter((d) => d.entry && d.entry.corner && d.entry.map === area.wm.id).map((d) => d.entry.corner));
  const corner = ['bl', 'tl', 'br', 'tr'].find((c) => !used.has(c)) || 'bl';
  const b = Math.max(7, Math.min(16, Math.round(Math.min(cw, ch) * 0.02)));
  const R = Math.max(15, Math.min(32, Math.min(cw, ch) * 0.05));
  const x = corner[1] === 'l' ? b + R + 12 : cw - b - R - 12;
  const y = corner[0] === 't' ? b + R + 14 : ch - b - R - 12;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, R, 0, MAP_TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
  g.addColorStop(0, 'rgba(250,240,212,0.95)');
  g.addColorStop(1, 'rgba(214,188,132,0.95)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, MAP_TAU);
  ctx.fill();
  ctx.strokeStyle = '#3a2814';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Ost-West-Nadel, dann Nord-Süd-Nadel (Norden rot)
  const needle = (ang, len, wd, a, b2) => {
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const P = (f, s2) => [x + cs * f * len - sn * s2 * wd, y + sn * f * len + cs * s2 * wd];
    for (const [s2, col] of [[-1, a], [1, b2]]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(...P(1, 0));
      ctx.lineTo(...P(0, s2));
      ctx.lineTo(...P(0, 0));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,18,6,0.85)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(...P(1, 0));
    ctx.lineTo(...P(0, -1));
    ctx.lineTo(...P(0, 1));
    ctx.closePath();
    ctx.stroke();
  };
  needle(0, R * 0.5, R * 0.11, '#8a7a62', '#5e4e38');
  needle(Math.PI, R * 0.5, R * 0.11, '#8a7a62', '#5e4e38');
  needle(-Math.PI / 2, R * 0.66, R * 0.16, '#c8402a', '#8a2414');
  needle(Math.PI / 2, R * 0.66, R * 0.16, '#5a4630', '#3a2814');
  ctx.fillStyle = '#3a2814';
  ctx.beginPath();
  ctx.arc(x, y, R * 0.08, 0, MAP_TAU);
  ctx.fill();
  ctx.font = `400 ${Math.round(R * 0.36)}px "Marcellus SC", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a2410';
  ctx.fillText('N', x, y - R * 0.8);
  ctx.font = `400 ${Math.round(R * 0.26)}px "Marcellus SC", Georgia, serif`;
  ctx.fillText(typeof i18n !== 'undefined' && i18n.lang === 'en' ? 'E' : 'O', x + R * 0.8, y);
  ctx.fillText('S', x, y + R * 0.8);
  ctx.fillText('W', x - R * 0.8, y);
  ctx.restore();
}

// Antippen der großen Karte: Markierung setzen (nochmal auf die Markierung: entfernen)
function bigMapTap(e) {
  const v = bigMap.view;
  const area = bigMap.area;
  if (!v || !area) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const tx = v.ox + (e.clientX - rect.left) / v.sc;
  const ty = v.oy + (e.clientY - rect.top) / v.sc;
  if (guide.pin && Math.hypot(guide.pin.x / TILE - tx, guide.pin.y / TILE - ty) < 12 / v.sc + 1.5) {
    guide.pin = null;
    if (guide.pick === 'pin') guide.pick = null;
  } else {
    guide.pin = { x: tx * TILE, y: ty * TILE };
    guide.pick = 'pin';
  }
  guide.t = -9;
  renderBigMap();
  ui.renderQuestTrack();
}

function setupBigMap() {
  const cv = document.getElementById('bigMap');
  if (cv) cv.addEventListener('click', bigMapTap);
  const clr = document.getElementById('mapClearPin');
  if (clr) clr.addEventListener('click', () => {
    guide.pin = null;
    if (guide.pick === 'pin') guide.pick = null;
    guide.t = -9;
    renderBigMap();
    ui.renderQuestTrack();
  });
  window.addEventListener('resize', () => { if (bigMapOpen()) renderBigMap(); });
}
