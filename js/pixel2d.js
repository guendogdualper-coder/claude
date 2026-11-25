// Pixel-Stil für die 2D-Welt (seit 15.56)
//
// Die Welt (Boden, Bäume, Häuser, Figuren, Effekte, Teilchen) wird nicht mehr in voller Bildschirmauflösung gemalt,
// sondern in eine kleine Pixel-Fläche: ein Bildpunkt = PIX.units Welt-Einheiten (eine Spielfigur ist dann gut
// 35 Bildpunkte hoch). Diese Fläche wird danach ohne Glättung hochgezogen – jeder Bildpunkt wird ein scharfkantiges
// Quadrat. Namen, Lebensbalken, Schadenszahlen und der Wegweiser kommen danach in voller Auflösung darüber und
// bleiben gestochen scharf; die HTML-Anzeigen sind davon nicht berührt.
//
// Das Raster ist an der Welt festgemacht (die Kamera rastet auf ganze Bildpunkte, der Rest wird beim Hochziehen als
// Versatz ausgeglichen): beim Laufen gleitet das Bild weich, ohne dass die Bildpunkte flimmern.
// Nebenbei ist das deutlich weniger Arbeit: statt ~1,6 Millionen nur ~0,1 Millionen Bildpunkte je Bild.

const PIX = { units: 1.35, smooth: false, c: null, x: null, fx: 0, fy: 0, inWorld: false };

function pixel2dAktiv() {
  return opts.stil2d !== 'fein';
}

// Pixel-Fläche vorbereiten und als Zeichenfläche für die Welt zurückgeben
function pixelBegin(r) {
  const U = PIX.units;
  const w = Math.ceil(r.w / r.zoom / U) + 2;
  const h = Math.ceil(r.h / r.zoom / U) + 2;
  if (!PIX.c) {
    PIX.c = newCanvas(w, h);
    PIX.x = PIX.c.getContext('2d', { alpha: false });
  }
  if (PIX.c.width !== w) PIX.c.width = w;
  if (PIX.c.height !== h) PIX.c.height = h;
  const x = PIX.x;
  const gx = Math.floor(r.camX / U);
  const gy = Math.floor(r.camY / U);
  PIX.fx = r.camX / U - gx;
  PIX.fy = r.camY / U - gy;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#12100c';
  x.fillRect(0, 0, w, h);
  x.imageSmoothingEnabled = PIX.smooth;
  if (PIX.smooth) x.imageSmoothingQuality = 'high';
  x.setTransform(1 / U, 0, 0, 1 / U, -gx, -gy);
  PIX.inWorld = true;
  return x;
}

// Pixel-Fläche scharfkantig auf den Bildschirm ziehen
function pixelEnd(r) {
  PIX.inWorld = false;
  const m = r.ctx;
  const s = r.zoom * r.dpr * PIX.units;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.imageSmoothingEnabled = false;
  m.drawImage(PIX.c, -PIX.fx * s, -PIX.fy * s, PIX.c.width * s, PIX.c.height * s);
  m.imageSmoothingEnabled = true;
}

// Ein Bild der Welt (Figur, Baum, Haus …) direkt im Pixel-Raster backen: in der Auflösung der Pixel-Fläche malen,
// Licht wie bisher (shadeSprite), dann harte Kanten (halb durchsichtige Randpunkte werden voll oder leer) und ein
// durchgehender, einen Bildpunkt breiter dunkler Umriss – wie gezeichnete Pixelkunst.
const PIX_EDGE = 100;

// Farbstimmung des Pixel-Stils (seit 15.56): kräftigere Farben (Sättigung +12 %, sehr helles Grün etwas gedämpft), etwas mehr Kontrast und ein Hauch
// Wärme – wie gemalte Pixelkunst statt blasser Flächen. Gilt für Bilder der Welt und den Boden.
const PIX_SAT = 1.12;
const PIX_CON = 1.07;
function pixGradeRGB(r, g, b) {
  const l = r * 0.3 + g * 0.59 + b * 0.11;
  const f = (v, warm) => {
    let x = l + (v - l) * PIX_SAT;
    x = (x - 128) * PIX_CON + 128 + warm;
    return x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
  };
  // grelles Gelbgrün (Wiese) etwas tiefer und wärmer, wie gemaltes Gras statt Neon
  const lime = g > r + 30 && g > b + 50 && g > 140 ? 1 : 0;
  return [f(r, 5 + lime * 4), f(g, 1 - lime * 10), f(b, -5)];
}
const pixGradeCache = new Map();
function pixGradeHex(hex) {
  let c = pixGradeCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1, 7), 16);
    const [r, g, b] = pixGradeRGB((n >> 16) & 255, (n >> 8) & 255, n & 255);
    c = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    pixGradeCache.set(hex, c);
  }
  return c;
}
const PIX_OUT = [0x1a, 0x12, 0x10];
// sideOnly (seit 15.58): Umriss nur links und rechts (senkrechte Mauerstücke, die sich oben und unten nahtlos
// aneinanderreihen – mit Umriss oben lag an jeder Kachelfuge ein dunkler Strich, die Mauer sah aus wie Klötze)
function bakePixelSprite(bounds, draw, sideOnly) {
  const S = 1 / PIX.units;
  const w = Math.max(1, Math.ceil(bounds.w * S));
  const h = Math.max(1, Math.ceil(bounds.h * S));
  const c = newCanvas(w, h);
  const b = c.getContext('2d', CPU_CANVAS);
  b.setTransform(S, 0, 0, S, -bounds.x * S, -bounds.y * S);
  b.lineJoin = 'round';
  b.lineCap = 'round';
  draw(b);
  // senkrechte Mauerstücke ohne Licht-Verlauf je Stück (sonst Streifen an jeder Kachel)
  if (!sideOnly) shadeSprite(c, b, w, h, S, true);
  const img = b.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < PIX_EDGE) {
      d[i + 3] = 0;
      continue;
    }
    d[i + 3] = 255;
    const c = pixGradeRGB(d[i], d[i + 1], d[i + 2]);
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
  }
  const src = new Uint8Array(w * h);
  for (let i = 0, j = 3; i < src.length; i++, j += 4) src[i] = d[j];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i]) continue;
      if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (!sideOnly && ((y > 0 && src[i - w]) || (y < h - 1 && src[i + w])))) {
        const j = i * 4;
        d[j] = PIX_OUT[0];
        d[j + 1] = PIX_OUT[1];
        d[j + 2] = PIX_OUT[2];
        d[j + 3] = 255;
      }
    }
  }
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.putImageData(img, 0, 0);
  return { img: c, bounds, flash: null };
}

// --- Bodenmuster im Pixel-Stil ------------------------------------------------------------------------------------
// Je Bodenart ein kleines, nahtlos wiederholtes Muster in der Auflösung der Pixel-Fläche: Grashalme und helle Spitzen,
// Kiesel auf Wegen, Sprenkel auf Sand und Schnee, Risse im Fels. Halb durchsichtig über die Bodenfarbe gelegt, damit
// jede Gegend ihre Farbe behält. Einmal gebaut, danach nur noch als Füllmuster je Kachel (beim Backen der Bodenblöcke).
const PIX_PAT_N = 48;
const PIX_GROUND_KIND = {};
(() => {
  const G = GROUND;
  const set = (kind, ...ids) => ids.forEach((id) => { if (id != null) PIX_GROUND_KIND[id] = kind; });
  set('gras', G.GRASS, G.MEADOW, G.FOREST, G.NACHTGRAS);
  set('moos', G.SWAMP, G.NACHTMOOS);
  set('erde', G.PATH, G.SCHWARZERDE, G.BLUTERDE);
  set('sand', G.SAND, G.ASH, G.KNOCHENSAND);
  set('schnee', G.SNOW, G.NACHTSCHNEE);
  set('stein', G.BASALT, G.CAVE, G.KRISTALL);
  // seit 15.80 auch die Böden der Karten 18 und 19 (vorher ganz ohne Muster, flache Farbflächen): Strandsand wie Sand,
  // Dünen- und Goldgras wie Gras (eigene Art, damit dort keine Felder entstehen), heller Terrassenfels wie Stein
  set('sand', G.STRANDSAND);
  set('gras2', G.DUENENGRAS, G.GOLDGRAS);
  set('stein', G.HELLSTEIN);
  set('pflaster', G.PLAZA, G.FLAGSTONE);
  set('wasser', G.WATER);
})();
const pixPatterns = {};

function pixHash(x, y, s) {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function pixPatternCanvas(kind) {
  const N = PIX_PAT_N;
  const c = newCanvas(N, N);
  const g = c.getContext('2d');
  const dot = (x, y, col) => { g.fillStyle = col; g.fillRect(((x % N) + N) % N, ((y % N) + N) % N, 1, 1); };
  // weiche Flecken: Wertrauschen auf einem 12er-Raster (umlaufend, damit das Muster nahtlos ist), danach gestreut
  // statt flächig gefärbt (Dithering) – keine sichtbaren Kästchen
  const corner = (i, j, s) => pixHash(((i % 4) + 4) % 4, ((j % 4) + 4) % 4, s);
  const smooth = (t) => t * t * (3 - 2 * t);
  const cell0 = (x, y, s) => {
    const i = Math.floor(x / 12);
    const j = Math.floor(y / 12);
    const u = smooth(x / 12 - i);
    const v = smooth(y / 12 - j);
    const a = corner(i, j, s) + (corner(i + 1, j, s) - corner(i, j, s)) * u;
    const b = corner(i, j + 1, s) + (corner(i + 1, j + 1, s) - corner(i, j + 1, s)) * u;
    return a + (b - a) * v;
  };
  // gestreut: nur jeder zweite Punkt (nach Zufall) bekommt den Fleck
  const cell = (x, y, s) => (pixHash(x, y, 11) < 0.5 ? cell0(x, y, s) : 0.5);
  // Kopfsteinpflaster: Steine um verschobene Gitterpunkte (6 × 6 je Muster, umlaufend), dunkle Fugen zwischen den
  // Steinen, jeder Stein etwas heller oder dunkler, oben links eine Lichtkante, unten rechts ein Schatten
  const SEED = [];
  const CN = 6;
  const CS = N / CN;
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) SEED.push([(i + 0.2 + 0.6 * pixHash(i, j, 21)) * CS, (j + 0.2 + 0.6 * pixHash(i, j, 22)) * CS, pixHash(i, j, 23)]);
  const cobble = (x, y) => {
    let d1 = 1e9, d2 = 1e9, best = null;
    for (const s of SEED) {
      for (let oy = -N; oy <= N; oy += N) {
        for (let ox = -N; ox <= N; ox += N) {
          const dx = x + 0.5 - (s[0] + ox);
          const dy = y + 0.5 - (s[1] + oy);
          const dd = Math.sqrt(dx * dx + dy * dy * 1.25);
          if (dd < d1) { d2 = d1; d1 = dd; best = [s, dx, dy]; } else if (dd < d2) d2 = dd;
        }
      }
    }
    const edge = d2 - d1;
    if (edge < 1.3) { dot(x, y, 'rgba(35,25,15,0.55)'); return; }
    const [s, dx, dy] = best;
    if (edge < 2.6 && dx + dy < -1) dot(x, y, 'rgba(255,248,230,0.2)');
    else if (edge < 2.6 && dx + dy > 1) dot(x, y, 'rgba(20,12,5,0.2)');
    else if (s[2] > 0.66) dot(x, y, 'rgba(255,245,225,0.08)');
    else if (s[2] < 0.33) dot(x, y, 'rgba(30,20,10,0.08)');
    if (pixHash(x, y, 31) < 0.04) dot(x, y, 'rgba(0,0,0,0.08)');
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = pixHash(x, y, 1);
      const f = cell(x, y, 3);
      if (kind === 'gras' || kind === 'gras2' || kind === 'moos') {
        if (f > 0.72) dot(x, y, 'rgba(255,255,190,0.05)');
        else if (f < 0.22) dot(x, y, 'rgba(0,30,0,0.07)');
        if (n < 0.055) {
          // Grashalm: zwei dunkle Punkte übereinander, darüber manchmal eine helle Spitze
          dot(x, y, 'rgba(10,45,5,0.32)');
          dot(x, y - 1, 'rgba(10,45,5,0.26)');
          if (n < 0.02) dot(x, y - 2, 'rgba(230,255,160,0.28)');
        } else if (n < 0.075) dot(x, y, 'rgba(240,255,190,0.18)');
        if (kind === 'moos' && pixHash(x, y, 9) < 0.02) dot(x, y, 'rgba(60,40,10,0.25)');
        // Grasbüschel: kleines dunkles V mit hellen Spitzen
        if (pixHash(x, y, 51) < 0.01) {
          dot(x, y, 'rgba(10,45,5,0.4)');
          dot(x - 1, y - 1, 'rgba(10,45,5,0.34)');
          dot(x + 1, y - 1, 'rgba(10,45,5,0.34)');
          dot(x, y - 1, 'rgba(10,45,5,0.3)');
          dot(x - 1, y - 2, 'rgba(230,255,160,0.3)');
          dot(x + 1, y - 2, 'rgba(230,255,160,0.3)');
        }
      } else if (kind === 'erde') {
        // festgetretene Erde: dunkle Flecken, Sprenkel, Kiesel mit Licht und Schatten, hier und da ein Grashalm
        if (f < 0.3) dot(x, y, 'rgba(50,25,0,0.12)');
        else if (f > 0.72) dot(x, y, 'rgba(255,235,190,0.08)');
        if (n < 0.03) {
          dot(x, y, 'rgba(255,240,210,0.42)');
          dot(x + 1, y, 'rgba(255,240,210,0.26)');
          dot(x, y + 1, 'rgba(30,15,0,0.38)');
          dot(x + 1, y + 1, 'rgba(30,15,0,0.25)');
        } else if (n < 0.12) dot(x, y, 'rgba(40,20,0,0.16)');
        else if (n < 0.15) dot(x, y, 'rgba(255,240,200,0.12)');
        if (pixHash(x, y, 41) < 0.006) { dot(x, y, 'rgba(40,90,20,0.55)'); dot(x, y - 1, 'rgba(60,120,30,0.45)'); }
      } else if (kind === 'sand') {
        if (n < 0.05) dot(x, y, 'rgba(255,250,230,0.16)');
        else if (n < 0.09) dot(x, y, 'rgba(60,35,10,0.12)');
        if (pixHash(x, y, 5) < 0.008) { dot(x, y, 'rgba(70,50,30,0.35)'); dot(x + 1, y, 'rgba(255,245,220,0.25)'); }
      } else if (kind === 'schnee') {
        if (n < 0.012) dot(x, y, 'rgba(255,255,255,0.6)');
        else if (n < 0.06) dot(x, y, 'rgba(90,120,160,0.08)');
        if (f > 0.75) dot(x, y, 'rgba(255,255,255,0.06)');
      } else if (kind === 'stein') {
        if (f < 0.3) dot(x, y, 'rgba(0,0,0,0.08)');
        if (n < 0.05) dot(x, y, 'rgba(255,255,255,0.07)');
        if (pixHash(x, y, 7) < 0.006) for (let k = 0; k < 4; k++) dot(x + k, y + (k >> 1), 'rgba(0,0,0,0.22)');
      } else if (kind === 'pflaster') {
        cobble(x, y);
      } else if (kind === 'wasser') {
        // Wasser (seit 15.57): kurze helle Lichtstreifen und dunkle Tiefe, wie gemalte Pixel-Wellen
        if (n < 0.018) {
          for (let k = 0; k < 4; k++) dot(x + k, y, k === 0 || k === 3 ? 'rgba(230,245,255,0.16)' : 'rgba(230,245,255,0.3)');
        } else if (n < 0.05) dot(x, y, 'rgba(0,25,60,0.14)');
        if (f > 0.74) dot(x, y, 'rgba(120,190,230,0.08)');
      }
    }
  }
  return c;
}

function pixPattern(ctx, kind) {
  let p = pixPatterns[kind];
  if (p === undefined) {
    p = pixPatterns[kind] = ctx.createPattern(pixPatternCanvas(kind), 'repeat');
    // ein Musterpunkt = ein Bildpunkt der Pixel-Fläche
    if (p && p.setTransform && typeof DOMMatrix === 'function') p.setTransform(new DOMMatrix([PIX.units, 0, 0, PIX.units, 0, 0]));
  }
  return p;
}

function pixelGroundPass(ctx, tx0, ty0) {
  const w = game.world;
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const i = y * MAP_W + x;
      if (w.obj[i] === OBJ.CAVEWALL || w.deco[i] === DECO.BRIDGE || home2dOut(x, y)) continue;
      const kind = PIX_GROUND_KIND[w.ground[i]];
      if (!kind) continue;
      const p = pixPattern(ctx, kind);
      if (!p) continue;
      ctx.fillStyle = p;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

// --- Runde Wege (seit 15.71) --------------------------------------------------------------------------------------
// Erdwege folgten den Kachelkanten und liefen schräg als Treppe. Jetzt wird beim Backen der Bodenblöcke jede Ecke
// gerundet: an einer Außenecke des Weges (1 von 4 Kacheln am Eckpunkt ist Weg) kommt der Boden daneben über die Ecke,
// an einer Innenecke (3 von 4) und zwischen zwei schräg anstoßenden Wegkacheln füllt Weg die Ecke der Nachbarkachel.
// Treppen werden so zu geschwungenen Rändern. Nur gegen freien Boden (nicht an Wasser, Pflaster, Fels).
const PATH_ROUND_R = 0.5;
function pixelPathRound(ctx, tx0, ty0) {
  const w = game.world;
  const inb = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const isP = (x, y) => inb(x, y) && w.ground[y * MAP_W + x] === GROUND.PATH && w.deco[y * MAP_W + x] !== DECO.BRIDGE;
  const free = (x, y) => {
    if (!inb(x, y)) return false;
    const i = y * MAP_W + x;
    const g = w.ground[i];
    return g !== GROUND.PATH && g !== GROUND.PLAZA && g !== GROUND.FLAGSTONE && g !== GROUND.ICE && !LIQUID.has(g) && !!PIX_GROUND_KIND[g] &&
      w.obj[i] !== OBJ.CAVEWALL && w.deco[i] !== DECO.BRIDGE && !home2dOut(x, y);
  };
  const r = TILE * PATH_ROUND_R;
  // Eckbereich der Kachel (x, y) am Eckpunkt (vx, vy): zwischen Ecke und Viertelkreis
  const corner = (x, y, vx, vy) => {
    const dx = x === vx ? 1 : -1;
    const dy = y === vy ? 1 : -1;
    const Vx = vx * TILE;
    const Vy = vy * TILE;
    const Cx = Vx + r * dx;
    const Cy = Vy + r * dy;
    ctx.beginPath();
    ctx.moveTo(Vx, Vy);
    for (let k = 0; k <= 8; k++) {
      const t = (k / 8) * Math.PI / 2;
      ctx.lineTo(Cx - dx * r * Math.sin(t), Cy - dy * r * Math.cos(t));
    }
    ctx.closePath();
  };
  const pathFill = (x, y, fx, fy) => {
    const i = fy * MAP_W + fx;
    ctx.fillStyle = pixGradeHex(GROUND_PALETTE[GROUND.PATH][Math.min(7, (w.shade[i] >> 6) + 3)]);
    ctx.fill();
    const pat = pixPattern(ctx, 'erde');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fill();
    }
  };
  const groundFill = (x, y, kx, ky) => {
    ctx.save();
    ctx.clip();
    if (groundImagePix) {
      const sx = Math.max(0, x - 1);
      const sy = Math.max(0, y - 1);
      const sw = Math.min(MAP_W, x + 2) - sx;
      const sh = Math.min(MAP_H, y + 2) - sy;
      ctx.drawImage(groundImagePix, sx, sy, sw, sh, sx * TILE, sy * TILE, sw * TILE, sh * TILE);
    }
    const pat = pixPattern(ctx, PIX_GROUND_KIND[w.ground[ky * MAP_W + kx]]);
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    ctx.restore();
  };
  for (let vy = ty0; vy <= Math.min(MAP_H, ty0 + CHUNK); vy++) {
    for (let vx = tx0; vx <= Math.min(MAP_W, tx0 + CHUNK); vx++) {
      // Kacheln am Eckpunkt: oben links, oben rechts, unten links, unten rechts
      const T = [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]];
      const P = T.map(([x, y]) => isP(x, y));
      const n = P[0] + P[1] + P[2] + P[3];
      if (n === 0 || n === 4) continue;
      const own = (k) => T[k][0] >= tx0 && T[k][0] < tx0 + CHUNK && T[k][1] >= ty0 && T[k][1] < ty0 + CHUNK;
      if (n === 1) {
        // Außenecke: Boden der gegenüberliegenden Kachel rundet die Wegecke ab
        const k = P.indexOf(true);
        const o = 3 - k;
        if (!own(k) || !free(T[o][0], T[o][1]) || !free(T[k ^ 1][0], T[k ^ 1][1]) || !free(T[k ^ 2][0], T[k ^ 2][1])) continue;
        corner(T[k][0], T[k][1], vx, vy);
        groundFill(T[k][0], T[k][1], T[o][0], T[o][1]);
      } else if (n === 3) {
        // Innenecke: Weg füllt die Ecke der freien Kachel
        const k = P.indexOf(false);
        const o = 3 - k;
        if (!own(k) || !free(T[k][0], T[k][1])) continue;
        corner(T[k][0], T[k][1], vx, vy);
        pathFill(T[k][0], T[k][1], T[o][0], T[o][1]);
      } else if (n === 2 && P[0] === P[3]) {
        // zwei Wegkacheln stoßen nur schräg an: beide freien Ecken mit Weg füllen, der Weg läuft durch
        for (const k of [0, 1, 2, 3]) {
          if (P[k] || !own(k) || !free(T[k][0], T[k][1])) continue;
          const o = 3 - k;
          corner(T[k][0], T[k][1], vx, vy);
          pathFill(T[k][0], T[k][1], T[o][0], T[o][1]);
        }
      }
    }
  }
}

// --- Holzzäune an den Wegen (seit 15.56) ---------------------------------------------------------------------------
// In Städten und Lagern säumen niedrige Holzzäune die Wege: auf jeder Gras-Kachel, die an einen Erdweg grenzt, ein
// Zaunstück an dieser Kante (Pfosten alle 16 Einheiten, zwei Latten, Licht oben, dunkler Umriss). Reiner Schmuck am
// Boden (keine Kollision), gemalt beim Backen der Bodenblöcke im Pixel-Stil – kostet beim Spielen nichts.
const FENCE = { post: '#7a5232', postHi: '#a8774a', rail: '#8d6038', railHi: '#b88a58', out: '#2a1a10' };
function pixelFences(ctx, tx0, ty0) {
  const w = game.world;
  const U = PIX.units;
  const ox = tx0 * TILE;
  const oy = ty0 * TILE;
  // auf das Raster der Pixel-Fläche gerundet, damit Pfosten und Latten scharf bleiben
  const sx = (v) => ox + Math.round((v - ox) / U) * U;
  const sy = (v) => oy + Math.round((v - oy) / U) * U;
  const box = (x, y, bw, bh, col) => {
    const x0 = sx(x);
    const y0 = sy(y);
    ctx.fillStyle = col;
    ctx.fillRect(x0, y0, Math.max(U, sx(x + bw) - x0), Math.max(U, sy(y + bh) - y0));
  };
  const isPath = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && w.ground[y * MAP_W + x] === GROUND.PATH;
  const grassy = (i) => PIX_GROUND_KIND[w.ground[i]] === 'gras' || PIX_GROUND_KIND[w.ground[i]] === 'sand';
  for (let y = ty0; y < Math.min(MAP_H, ty0 + CHUNK); y++) {
    for (let x = tx0; x < Math.min(MAP_W, tx0 + CHUNK); x++) {
      const i = y * MAP_W + x;
      const z = ZONES[w.zoneIdx[i]];
      if (!z || !z.safe || w.obj[i] !== OBJ.NONE || w.deco[i] || !grassy(i)) continue;
      const px = x * TILE;
      const py = y * TILE;
      // waagrechter Zaun an der Kante zum Weg darunter bzw. darüber
      for (const [dy, fy] of [[1, py + TILE - 9], [-1, py + 1]]) {
        if (!isPath(x, y + dy)) continue;
        box(px, fy + 1, TILE, 3, FENCE.out);
        box(px, fy + 5, TILE, 3, FENCE.out);
        box(px, fy + 1.4, TILE, 1.6, FENCE.rail);
        box(px, fy + 5.4, TILE, 1.6, FENCE.rail);
        for (const k of [2, 18]) {
          box(px + k - 1, fy - 3, 4.4, 12, FENCE.out);
          box(px + k - 0.2, fy - 2.2, 2.8, 10.4, FENCE.post);
          box(px + k - 0.2, fy - 2.2, 2.8, 1.4, FENCE.postHi);
        }
      }
      // senkrechter Zaun an der Kante zum Weg links bzw. rechts (von oben gesehen: Pfosten mit Latte dazwischen)
      for (const [dx, fx] of [[1, px + TILE - 5], [-1, px + 2]]) {
        if (!isPath(x + dx, y)) continue;
        box(fx - 0.6, py, 3.8, TILE, FENCE.out);
        box(fx, py, 2.6, TILE, FENCE.rail);
        box(fx, py, 1.2, TILE, FENCE.railHi);
        for (const k of [4, 20]) {
          box(fx - 1.4, py + k - 3, 5.4, 7, FENCE.out);
          box(fx - 0.6, py + k - 2.4, 3.8, 5.6, FENCE.post);
          box(fx - 0.6, py + k - 2.4, 3.8, 1.4, FENCE.postHi);
        }
      }
    }
  }
}

// --- Zoomen und schräge Sicht (seit 15.57) ---------------------------------------------------------------------------
// Mausrad oder zwei Finger zoomen die 2D-Welt (ZOOM2D.mul, 0,7 … 1,25). Unter 1 kippt im Pixel-Stil zugleich die
// Kamera nach hinten, wie in Aufbauspielen mit gemalter Welt: der Boden wird perspektivisch (oben weiter weg und
// kleiner, unten näher und größer, dazu leicht gestaucht), Figuren, Bäume und Häuser bleiben aufrecht stehen und
// schrumpfen mit der Entfernung – die Welt wirkt wie ein Diorama.
//
// Abbildung (Bildschirm relativ zur Bildmitte, Welt relativ zum Blickpunkt: u, v):
//   s = 1 / (1 − t·v/R),  X = zoom·s·u,  Y = zoom·cy·s·v,  R = (H/2) / (zoom·cy)
// Rückwärts gilt s = 1 + t·Y/(H/2): oben am Bild 1 − t, in der Mitte 1, unten 1 + t. Gerade Linien bleiben gerade,
// der Horizont liegt weit über dem Bild. Bei t = 0 ist das genau die flache Ansicht (nahtloser Übergang).
//
// Ablauf je Bild (pixelRenderTilt): Boden und Bodeneffekte flach in die Pixel-Fläche G, Effekte über den Figuren in
// F (durchsichtig); G zeilenweise schräg in die Bildfläche P ziehen (je Zeile ein drawImage), die Figuren als
// aufrechte Bilder in P (je Figur ein eigener Maßstab), F darüber; P scharfkantig auf den Bildschirm. Namen, Balken,
// Zahlen und Wegweiser kommen in voller Auflösung an ihren projizierten Punkten darüber.
const ZOOM2D = { mul: 1, min: 0.7, max: 1.25, tMax: 0.3, squash: 0.7, key: 'seelenstein-zoom2d' };
try {
  const z = parseFloat(localStorage.getItem(ZOOM2D.key));
  if (z >= ZOOM2D.min && z <= ZOOM2D.max) ZOOM2D.mul = z;
} catch (e) { /* privat */ }

// seit 15.67 gibt es im Pixel-Stil nur noch die herausgezoomte, schräge Sicht: der Zoom steht fest auf dem kleinsten
// Wert (Mausrad und zwei Finger ändern dort nichts mehr); im feinen 2D-Stil bleibt er frei wie bisher
function zoom2dMul() {
  if (pixel2dAktiv()) return ZOOM2D.min;
  return ZOOM2D.mul;
}
function zoom2dSet(z) {
  if (pixel2dAktiv()) {
    const r0 = renderer;
    if (r0.zoomBase && !(typeof V3 !== 'undefined' && V3.on)) r0.zoom = r0.zoomBase * ZOOM2D.min;
    return;
  }
  const m = Math.max(ZOOM2D.min, Math.min(ZOOM2D.max, z));
  // nahe an 1 rastet der Zoom ein (flache Ansicht genau wie bisher)
  ZOOM2D.mul = Math.abs(m - 1) < 0.025 ? 1 : m;
  const r = renderer;
  if (r.zoomBase && !(typeof V3 !== 'undefined' && V3.on)) r.zoom = r.zoomBase * ZOOM2D.mul;
  try { localStorage.setItem(ZOOM2D.key, String(ZOOM2D.mul)); } catch (e) { /* privat */ }
}

// Neigung (0 = flach) – nur im Pixel-Stil und nur beim Herauszoomen
function pixelTilt() {
  const mul = zoom2dMul();
  if (mul >= 1 || !pixel2dAktiv()) return 0;
  return Math.min(1, (1 - mul) / (1 - ZOOM2D.min)) * ZOOM2D.tMax;
}

// Stand der schrägen Sicht im letzten Bild (für Eingabe und Anzeigen): on, t, cy, fx, fy, zoom, w, h
const TILT = { on: false, t: 0, cy: 1, fx: 0, fy: 0, zoom: 1, w: 1, h: 1 };

// Weltpunkt → Bildschirmpunkt (CSS-Pixel) mit Maßstab out.s (1 = wie in der flachen Ansicht); flach wie bisher
function worldToScreen2d(wx, wy, out) {
  const r = renderer;
  if (!TILT.on) {
    out.x = (wx - r.camX) * r.zoom;
    out.y = (wy - r.camY) * r.zoom;
    out.s = 1;
    return out;
  }
  const T = TILT;
  const R = T.h / 2 / (T.zoom * T.cy);
  const s = 1 / Math.max(0.08, 1 - (T.t * (wy - T.fy)) / R);
  out.x = T.w / 2 + T.zoom * s * (wx - T.fx);
  out.y = T.h / 2 + T.zoom * T.cy * s * (wy - T.fy);
  out.s = s;
  return out;
}
// Bildschirmpunkt (CSS-Pixel) → Weltpunkt in der schrägen Sicht
function tiltScreenToWorld(sx, sy) {
  const T = TILT;
  const Y = sy - T.h / 2;
  const s = Math.max(0.08, 1 + (T.t * Y) / (T.h / 2));
  return { x: T.fx + (sx - T.w / 2) / (T.zoom * s), y: T.fy + Y / (T.zoom * T.cy * s) };
}
// Zeichenfläche (Geräte-Pixel) so einstellen, dass um den Weltpunkt herum in Weltkoordinaten gezeichnet werden kann
// (wie v3Anchor in 3D): Namen, Balken, Zahlen
// h: Höhe des Ankers über dem Fußpunkt (Welt-Einheiten, wie die aufrechten Bilder), big: Schrift größer als die Welt
const _tiltA = { x: 0, y: 0, s: 1 };
function tiltAnchor(ctx, wx, wy, h = 0, big = 1) {
  const r = renderer;
  worldToScreen2d(wx, wy, _tiltA);
  const k0 = r.zoom * _tiltA.s;
  const k = k0 * big * r.dpr;
  const ay = wy - h;
  ctx.setTransform(k, 0, 0, k, _tiltA.x * r.dpr - k * wx, (_tiltA.y - h * k0) * r.dpr - k * ay);
  return _tiltA.y > -0.3 * r.h && _tiltA.y < 1.4 * r.h;
}

const TILTBUF = { G: null, g: null, F: null, f: null, P: null, p: null };
function tiltCanvas(name, w, h, alpha) {
  const B = TILTBUF;
  if (!B[name]) {
    B[name] = newCanvas(w, h);
    B[name.toLowerCase()] = B[name].getContext('2d', { alpha });
  }
  const c = B[name];
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const x = B[name.toLowerCase()];
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.imageSmoothingEnabled = false;
  return x;
}

// Ein ganzes Bild der Welt in der schrägen Sicht (statt des flachen Wegs in render, zeichnen.js)
const _tp = { x: 0, y: 0, s: 1 };
function pixelRenderTilt(r, fx, fy) {
  const U = PIX.units;
  const T = TILT;
  T.on = true;
  T.t = pixelTilt();
  T.cy = 1 - ZOOM2D.squash * T.t;
  T.fx = fx;
  T.fy = fy;
  T.zoom = r.zoom;
  T.w = r.w;
  T.h = r.h;
  // für alles, was die Bildmitte über camX/camY sucht (Wind, Umgebungsteilchen, Tribünen): wie in der flachen Sicht
  r.camX = fx - r.w / 2 / r.zoom;
  r.camY = fy - r.h / 2 / r.zoom;

  // sichtbarer Teil der Welt: oben am breitesten (Trapez), dazu Rand für Figuren, die unten ins Bild ragen
  const top = tiltScreenToWorld(0, 0);
  const topR = tiltScreenToWorld(r.w, 0);
  const bot = tiltScreenToWorld(0, r.h);
  const wx0 = top.x - 8;
  const wx1 = topR.x + 8;
  const wy0 = top.y - 8;
  const wy1 = bot.y + 8;

  // G: Boden flach im Pixel-Raster (fest an der Welt wie in der flachen Sicht)
  const gx0 = Math.floor(wx0 / U);
  const gy0 = Math.floor(wy0 / U);
  const gw = Math.min(3200, Math.ceil(wx1 / U) - gx0 + 2);
  const gh = Math.min(2000, Math.ceil(wy1 / U) - gy0 + 2);
  const g = tiltCanvas('G', gw, gh, false);
  g.fillStyle = '#12100c';
  g.fillRect(0, 0, gw, gh);
  g.setTransform(1 / U, 0, 0, 1 / U, -gx0, -gy0);
  PIX.inWorld = true;
  const tx0 = Math.max(0, Math.floor(wx0 / TILE) - 1);
  const ty0 = Math.max(0, Math.floor(wy0 / TILE) - 1);
  const tx1 = Math.min(MAP_W - 1, Math.ceil(wx1 / TILE) + 1);
  const ty1 = Math.min(MAP_H - 1, Math.ceil(wy1 / TILE) + 1);
  // neue Bodenblöcke höchstens ein paar je Bild backen (der Rest kommt in den nächsten Bildern; bis dahin die
  // Bodenfarben je Kachel), sonst stockt das Bild beim Herauszoomen und Laufen
  PIX.chunkBudget = 5;
  // je Blockzeile nur die Blöcke im sichtbaren Trapez (unten ist das Bild schmaler als oben)
  const span = (cy) => {
    const wy = Math.min(bot.y, cy * CHUNK * TILE);
    const sy = worldToScreen2d(fx, wy, _tp).y;
    const a = tiltScreenToWorld(-4, sy);
    const b = tiltScreenToWorld(r.w + 4, sy);
    return [Math.floor(a.x / TILE / CHUNK), Math.floor(b.x / TILE / CHUNK)];
  };
  drawGround(g, tx0, ty0, tx1, ty1, span);
  PIX.chunkBudget = null;

  // Figuren dürfen mit dem Kopf von unten ins Bild ragen und seitlich etwas überstehen
  const view = { x0: wx0 - 80, y0: wy0 - 40, x1: wx1 + 80, y1: wy1 + 170 };
  const inView = (e) => e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1;
  drawCloudShadows(g, view);
  if (game.target && !game.target.dead) drawTargetRing(g, game.target);
  const vx0 = Math.max(0, Math.floor(view.x0 / TILE));
  const vy0 = Math.max(0, Math.floor(view.y0 / TILE));
  const vx1 = Math.min(MAP_W - 1, Math.ceil(view.x1 / TILE));
  const vy1 = Math.min(MAP_H - 1, Math.ceil(view.y1 / TILE));
  const list = collectScene(view, vx0, vy0, vx1, vy1, inView);
  rankHaloPass(g, sceneGroundFx);
  for (const e of game.effects) if (sceneGroundFx(e)) drawEffect(g, e);
  drawDuelArena(g);

  // F: Effekte, Geschosse und Teilchen über den Figuren, ebenfalls flach (liegen danach genau über dem Boden). Nur der
  // Streifen, in dem gerade etwas ist (mit Rand für hohe Säulen und lange Strahlen) – meist ist F fast leer
  const up = (e) => !sceneGroundFx(e);
  let fy0 = Infinity;
  let fy1 = -Infinity;
  const fyIn = (y) => {
    if (y < fy0) fy0 = y;
    if (y > fy1) fy1 = y;
  };
  for (const pr of game.projectiles) fyIn(pr.y);
  for (const e of game.effects) if (up(e)) fyIn(e.y);
  for (const q of game.particles) fyIn(q.y);
  let fr0 = 0;
  let fr1 = -1;
  if (fy1 >= fy0) {
    fr0 = Math.max(0, Math.floor((fy0 - 380) / U) - gy0);
    fr1 = Math.min(gh - 1, Math.ceil((fy1 + 220) / U) - gy0);
  }
  if (fr1 >= fr0) {
    const f = tiltCanvas('F', gw, gh, true);
    f.clearRect(0, fr0, gw, fr1 - fr0 + 1);
    f.setTransform(1 / U, 0, 0, 1 / U, -gx0, -gy0);
    for (const pr of game.projectiles) drawProjectile(f, pr);
    rankHaloPass(f, up);
    for (const e of game.effects) if (up(e)) drawEffect(f, e);
    rankHaloPass(f, up, null, true);
    drawParticles(f);
  }

  // P: Bildfläche in Pixeln (1 Bildpunkt = zoom·U CSS-Pixel)
  const pu = r.zoom * U;
  const pw = Math.ceil(r.w / pu) + 1;
  const ph = Math.ceil(r.h / pu) + 1;
  const p = tiltCanvas('P', pw, ph, false);
  p.fillStyle = '#12100c';
  p.fillRect(0, 0, pw, ph);
  tiltWarp(p, TILTBUF.G, pw, ph, pu, gx0, gy0, U, 0, gh - 1);
  // Figuren, Bäume, Häuser: aufrecht, Maßstab nach der Entfernung ihres Fußpunkts. Was ganz außerhalb des Bildes
  // steht, fällt weg (das Trapez ist unten schmaler als der Rahmen; dichte Wälder am Kartenrand haben Tausende Bäume)
  for (const e of list) {
    const by = sceneBaseY(e);
    worldToScreen2d(e.x, by, _tp);
    const k = _tp.s / U;
    const px = _tp.x / pu;
    const py = _tp.y / pu;
    const half = (e.worldObj === 'house' && e.house ? e.house.w * TILE * 0.7 : 90) * k;
    if (py < -2 || py - 260 * k > ph || px < -half || px > pw + half) {
      e.__tiltOut = true;
      continue;
    }
    e.__tiltOut = false;
    // senkrechte, schräge und runde Mauern als Körper entlang der Mauerlinie (seit 15.59, tiltWall); gerade
    // waagrechte Stücke bleiben Bilder – ihre Vorderseite liegt genau quer zur Blickrichtung, dort passt das Bild
    if (e.worldObj === 'wall' && (e.dir === 'v' || e.ln) && tiltWall(p, e, pu, U)) continue;
    // sonst (Kristallwand): senkrecht wie der Boden verkürzt (cy·s), damit die Stücke nicht übereinanderrutschen
    const ky = e.worldObj === 'wall' && e.dir === 'v' ? k * T.cy * _tp.s : k;
    p.setTransform(k, 0, 0, ky, px - k * e.x, py - ky * by);
    drawSceneEntity(p, e);
  }
  p.setTransform(1, 0, 0, 1, 0, 0);
  p.globalAlpha = 1;
  p.globalCompositeOperation = 'source-over';
  if (fr1 >= fr0) tiltWarp(p, TILTBUF.F, pw, ph, pu, gx0, gy0, U, fr0, fr1);
  PIX.inWorld = false;

  const m = r.ctx;
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.imageSmoothingEnabled = false;
  m.drawImage(TILTBUF.P, 0, 0, pw * pu * r.dpr, ph * pu * r.dpr);
  m.imageSmoothingEnabled = true;

  // Namen und Balken, Zahlen, Wegweiser in voller Auflösung; Schrift schrumpft beim Herauszoomen nur halb so stark mit
  // (sonst unlesbar), dafür dort verankert, wo der Name steht (über dem Kopf, bei Stadtbewohnern unter den Füßen),
  // damit er nicht von der Figur wegrutscht
  TILT.lab = Math.pow(1 / zoom2dMul(), 0.6);
  for (const e of list) {
    if (e.worldObj || e.clone || e.__tiltOut) continue;
    if (e.isStone) tiltAnchor(m, e.x, e.y, stoneHeight(e) + 14, TILT.lab);
    else tiltAnchor(m, e.x, feetY(e), tiltLabelH(e), TILT.lab);
    drawLabel(m, e);
  }
  m.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
  drawTexts(m);
  drawGuide(m);
}

// --- Mauern als Körper in der schrägen Sicht (seit 15.59) ---------------------------------------------------------
// Ein senkrechtes Mauerstück als aufrechtes Bild sah gekippt aus wie eine Treppe aus Klötzen: die Stücke stehen
// gerade, die Mauerlinie läuft aber perspektivisch schräg zur Bildmitte. Jetzt wird jedes Stück als Körper gezeichnet:
// Schichten (Sockel, Wand, Dach, First) als Kästen entlang der Mauerlinie, je Kasten die zur Kamera gewandte Seite
// (links der Bildmitte die Ostseite, rechts die Westseite, genau in der Mitte keine), die Oberseite und am südlichen
// Ende die Stirnseite. Höhen wie die waagrechten Mauerstücke (Sockel 9, Wand bis 31, Dach bis 41, First bis 45).
// Schichten: [halbe Breite, Höhe unten, Höhe oben, Farbe]
const TILT_WALL = {
  stein: [[9, 0, 9, '#7a746a'], [7, 9, 31, '#dccaa4'], [11, 31, 41, '#3e4656'], [3.5, 41, 45, '#2a303c']],
  terrasse: [[7, 0, 15, '#8a8a92'], [7.6, 15, 18, '#f4f8fc']],
  sonnenstein: [[7, 0, 16, '#e2dccc'], [7.6, 16, 19, '#ece6d6']],
  palisade: [[3.2, 0, 38, '#7a5434']],
  kristall: [[7, 0, 12, '#2e2850'], [5.5, 12, 36, '#7a66d8']]
};
// Umrissfarbe je Mauerart (Sonnenstein mit goldener Kante wie die Bilder) und Schmuck der Wand: [Abstand, Farbe, Breite]
const TILT_WALL_OUT = { sonnenstein: '#b8902e' };
const TILT_WALL_DECO = { stein: [16, '#5a3a22', 1.2], kristall: [11, '#d8d0ff', 1], palisade: [5.5, '#4e3420', 0.8] };
const _tw = [{}, {}, {}, {}];
function tiltWall(p, e, pu, U) {
  const prof = TILT_WALL[e.style || 'stein'];
  if (!prof) return false;
  const w = game.world;
  // Mauerlinie des Stücks: gerade von Kachelkante zu Kachelkante, an schrägen Mauern entlang der Mauerlinie (wallLine)
  let ax = e.x;
  let ay = e.y - TILE;
  let bx = e.x;
  let by = e.y;
  let endS = false;
  if (e.ln) {
    const L = e.ln;
    const mx = e.x + L.ox * TILE;
    const my = e.y - TILE / 2 + L.oy * TILE;
    let dx = Math.cos(L.a) * L.len * TILE / 2;
    let dy = Math.sin(L.a) * L.len * TILE / 2;
    if (dy < 0) { dx = -dx; dy = -dy; }
    ax = mx - dx; ay = my - dy; bx = mx + dx; by = my + dy;
  } else {
    const tx = Math.floor(e.x / TILE);
    const ty = Math.floor(e.y / TILE);
    endS = ty >= MAP_H || w.obj[ty * MAP_W + tx] !== OBJ.WALL;
  }
  let dx = bx - ax;
  let dy = by - ay;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;
  // Normale (+n zeigt bei Nord–Süd-Richtung nach Westen)
  const nx = -dy;
  const ny = dx;
  const pt = (o, x, y, h) => {
    worldToScreen2d(x, y, _tp);
    o.x = _tp.x / pu;
    o.y = _tp.y / pu - (h * _tp.s) / U;
    return o;
  };
  const [q0, q1, q2, q3] = _tw;
  const quad = (col) => {
    p.fillStyle = col;
    p.beginPath();
    p.moveTo(q0.x, q0.y);
    p.lineTo(q1.x, q1.y);
    p.lineTo(q2.x, q2.y);
    p.lineTo(q3.x, q3.y);
    p.closePath();
    p.fill();
  };
  p.setTransform(1, 0, 0, 1, 0, 0);
  const a0 = p.globalAlpha;
  if (typeof occludesPlayer === 'function' && occludesPlayer(e)) p.globalAlpha = a0 * 0.5;
  for (let li = 0; li < prof.length; li++) {
    const [hw, h0, h1, col] = prof[li];
    const c = pixGradeHex(col);
    // Seite +n (Westen): sichtbar, wenn sie auf dem Bild „von vorn“ zu sehen ist (Umlaufsinn der Ecken)
    pt(q0, ax + nx * hw, ay + ny * hw, h0);
    pt(q1, bx + nx * hw, by + ny * hw, h0);
    pt(q2, bx + nx * hw, by + ny * hw, h1);
    pt(q3, ax + nx * hw, ay + ny * hw, h1);
    const area = (q0.x * q1.y - q1.x * q0.y) + (q1.x * q2.y - q2.x * q1.y) + (q2.x * q3.y - q3.x * q2.y) + (q3.x * q0.y - q0.x * q3.y);
    const sg = area >= 0 ? -1 : 1;
    if (sg < 0) {
      pt(q0, ax - nx * hw, ay - ny * hw, h0);
      pt(q1, bx - nx * hw, by - ny * hw, h0);
      pt(q2, bx - nx * hw, by - ny * hw, h1);
      pt(q3, ax - nx * hw, ay - ny * hw, h1);
    }
    // Seiten, die nach Süden schauen, im Licht wie die Vorderseite der Bilder, sonst etwas dunkler
    const south = sg * ny > 0.35;
    quad(pixGradeHex(south ? col : darker(col, 0.2)));
    // Schmuck auf der sichtbaren Wandseite: Fachwerk (Steinmauer: Pfosten alle 16 Einheiten und ein Balken unter dem
    // Dach), Lichtkanten der Kristalle, Fugen zwischen den Pfählen der Palisade
    const deco = TILT_WALL_DECO[e.style || 'stein'];
    if (deco && li === Math.min(1, prof.length - 1)) {
      const trim = pixGradeHex(deco[1]);
      const ox = nx * hw * sg;
      const oy = ny * hw * sg;
      p.strokeStyle = trim;
      p.lineWidth = deco[2];
      for (let t = 0; t <= dl + 0.1; t += deco[0]) {
        const x = ax + dx * t + ox;
        const y = ay + dy * t + oy;
        pt(q0, x, y, h0 + (e.style === 'kristall' ? 3 : 0));
        pt(q1, x, y, h1 - (e.style === 'kristall' ? 4 : 0));
        p.beginPath();
        p.moveTo(q0.x, q0.y);
        p.lineTo(q1.x, q1.y);
        p.stroke();
      }
      if (!e.style) {
        pt(q0, ax + ox, ay + oy, h1 - 3);
        pt(q1, bx + ox, by + oy, h1 - 3);
        p.beginPath();
        p.moveTo(q0.x, q0.y);
        p.lineTo(q1.x, q1.y);
        p.stroke();
      }
    }
    // Stirnseite am südlichen Ende einer Mauer
    if (endS) {
      pt(q0, bx + nx * hw, by + ny * hw, h0);
      pt(q1, bx - nx * hw, by - ny * hw, h0);
      pt(q2, bx - nx * hw, by - ny * hw, h1);
      pt(q3, bx + nx * hw, by + ny * hw, h1);
      quad(c);
    }
    // Oberseite
    pt(q0, ax + nx * hw, ay + ny * hw, h1);
    pt(q1, bx + nx * hw, by + ny * hw, h1);
    pt(q2, bx - nx * hw, by - ny * hw, h1);
    pt(q3, ax - nx * hw, ay - ny * hw, h1);
    quad(pixGradeHex(lighter(col, 0.12)));
  }
  // seit 15.80: auf der Kristallwand facettierte Spitzen (wie die Kristalle der Bilder und in 3D), links hell, rechts
  // dunkler, je Kristall eine Glanzkante
  if (e.style === 'kristall') {
    const h1 = prof[prof.length - 1][2];
    const P2 = typeof kristallPal2 === 'function' ? kristallPal2('#9a84f4') : null;
    for (let t = 5.5; t < dl; t += 11) {
      const x = ax + dx * t;
      const y = ay + dy * t;
      const hk = h1 + 7 + (Math.floor(t / 11 + x * 0.05) % 2) * 3;
      const tri = (xa, ya, ha, xb, yb, hb, col) => {
        pt(q0, xa, ya, ha);
        pt(q1, xb, yb, hb);
        pt(q2, x, y, hk);
        p.fillStyle = pixGradeHex(col);
        p.beginPath();
        p.moveTo(q0.x, q0.y);
        p.lineTo(q1.x, q1.y);
        p.lineTo(q2.x, q2.y);
        p.closePath();
        p.fill();
      };
      tri(x - dx * 4.5, y - dy * 4.5, h1 - 0.5, x, y, h1 - 0.5, P2 ? P2.tipL : '#d8d0ff');
      tri(x, y, h1 - 0.5, x + dx * 4.5, y + dy * 4.5, h1 - 0.5, P2 ? P2.tipR : '#9a88f0');
    }
  }
  // Pixel-Umriss wie bei den Bildern: Traufkanten des obersten breiten Teils (Dach) und Fußlinie der sichtbaren Seite;
  // auf dem Dach Ziegelreihen alle 8 Einheiten (wie das flache Bild)
  const top = prof.length > 2 ? prof[2] : prof[prof.length - 1];
  const [thw, , th1, tcol] = top;
  const line = (x0, y0, h0, x1, y1, h1, col) => {
    pt(q0, x0, y0, h0);
    pt(q1, x1, y1, h1);
    p.strokeStyle = col;
    p.beginPath();
    p.moveTo(q0.x, q0.y);
    p.lineTo(q1.x, q1.y);
    p.stroke();
  };
  p.lineWidth = 1;
  if (prof.length > 2) {
    const tc = pixGradeHex(darker(tcol, 0.3));
    for (let t = 4; t < dl; t += 8) line(ax + dx * t + nx * thw * 0.8, ay + dy * t + ny * thw * 0.8, th1, ax + dx * t - nx * thw * 0.8, ay + dy * t - ny * thw * 0.8, th1, tc);
  }
  const out = TILT_WALL_OUT[e.style] || 'rgb(' + PIX_OUT.join(',') + ')';
  line(ax + nx * thw, ay + ny * thw, th1, bx + nx * thw, by + ny * thw, th1, out);
  line(ax - nx * thw, ay - ny * thw, th1, bx - nx * thw, by - ny * thw, th1, out);
  p.globalAlpha = a0;
  return true;
}

// Höhe des Namens über dem Fußpunkt (wie drawLabel, zeichnen.js)
function tiltLabelH(e) {
  if (e === game.player || e.remote) return 60;
  if (e.type || e.ally || e.remoteAlly) return figureHeight(e) + 10;
  return -15;
}

// Flache Pixel-Fläche src (Weltraster ab gx0, gy0) streifenweise schräg in die Bildfläche ziehen: je zwei Zeilen der
// Bildfläche holen sich ihre Weltzeilen und ihren waagerechten Maßstab (am Bildrand höchstens ein Bildpunkt Versatz,
// halb so viele drawImage wie Zeile für Zeile). Nur Weltzeilen r0 … r1.
const TILT_BAND = 2;
function tiltWarp(p, src, pw, ph, pu, gx0, gy0, U, r0, r1) {
  const T = TILT;
  const H2 = T.h / 2;
  const sw = src.width;
  const rowAt = (Y) => (T.fy + Y / (T.zoom * T.cy * (1 + (T.t * Y) / H2))) / U - gy0;
  for (let j = 0; j < ph; j += TILT_BAND) {
    const Y = (j + TILT_BAND / 2) * pu - H2;
    const s = 1 + (T.t * Y) / H2;
    if (s <= 0.08) continue;
    const ra = rowAt(j * pu - H2);
    const rb = rowAt((j + TILT_BAND) * pu - H2);
    let row = Math.floor(ra);
    let rh = Math.max(1, Math.floor(rb) - row);
    if (row + rh <= r0 || row > r1) continue;
    // Weltzeilen außerhalb des Streifens nicht holen (Ziel entsprechend kürzer)
    let dj = j;
    let dh = TILT_BAND;
    if (row < r0) {
      const cut = r0 - row;
      dj += (cut / rh) * TILT_BAND;
      dh -= (cut / rh) * TILT_BAND;
      rh -= cut;
      row = r0;
    }
    if (row + rh > r1 + 1) {
      const cut = row + rh - r1 - 1;
      dh -= (cut / rh) * TILT_BAND;
      rh -= cut;
    }
    if (rh <= 0 || dh <= 0) continue;
    // linker und rechter Rand der Bildzeile in Spalten der flachen Fläche
    const c0 = (T.fx - T.w / 2 / (T.zoom * s)) / U - gx0;
    const cw = (pw * pu) / (T.zoom * s) / U;
    let a = c0;
    let b = c0 + cw;
    let d0 = 0;
    let d1 = pw;
    // auf die Fläche beschneiden (Ziel anteilig mit)
    if (a < 0) { d0 = (-a / cw) * pw; a = 0; }
    if (b > sw) { d1 = pw - ((b - sw) / cw) * pw; b = sw; }
    if (b - a < 0.5 || d1 - d0 < 0.5) continue;
    p.drawImage(src, a, row, b - a, rh, d0, dj, d1 - d0, dh);
  }
}
