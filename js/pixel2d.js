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
const PIX_OUT = [0x1a, 0x12, 0x10];
function bakePixelSprite(bounds, draw) {
  const S = 1 / PIX.units;
  const w = Math.max(1, Math.ceil(bounds.w * S));
  const h = Math.max(1, Math.ceil(bounds.h * S));
  const c = newCanvas(w, h);
  const b = c.getContext('2d', CPU_CANVAS);
  b.setTransform(S, 0, 0, S, -bounds.x * S, -bounds.y * S);
  b.lineJoin = 'round';
  b.lineCap = 'round';
  draw(b);
  shadeSprite(c, b, w, h, S, true);
  const img = b.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= PIX_EDGE ? 255 : 0;
  const src = new Uint8Array(w * h);
  for (let i = 0, j = 3; i < src.length; i++, j += 4) src[i] = d[j];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i]) continue;
      if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) {
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
  set('pflaster', G.PLAZA, G.FLAGSTONE);
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
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = pixHash(x, y, 1);
      const f = cell(x, y, 3);
      if (kind === 'gras' || kind === 'moos') {
        if (f > 0.72) dot(x, y, 'rgba(255,255,190,0.05)');
        else if (f < 0.22) dot(x, y, 'rgba(0,30,0,0.07)');
        if (n < 0.055) {
          // Grashalm: zwei dunkle Punkte übereinander, darüber manchmal eine helle Spitze
          dot(x, y, 'rgba(10,45,5,0.32)');
          dot(x, y - 1, 'rgba(10,45,5,0.26)');
          if (n < 0.02) dot(x, y - 2, 'rgba(230,255,160,0.28)');
        } else if (n < 0.075) dot(x, y, 'rgba(240,255,190,0.18)');
        if (kind === 'moos' && pixHash(x, y, 9) < 0.02) dot(x, y, 'rgba(60,40,10,0.25)');
      } else if (kind === 'erde') {
        if (f < 0.25) dot(x, y, 'rgba(40,20,0,0.07)');
        if (n < 0.022) {
          // Kiesel: heller Punkt mit dunklem Schatten darunter
          dot(x, y, 'rgba(255,240,210,0.35)');
          dot(x + 1, y, 'rgba(255,240,210,0.22)');
          dot(x, y + 1, 'rgba(30,15,0,0.3)');
        } else if (n < 0.08) dot(x, y, 'rgba(30,15,0,0.12)');
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
        if (n < 0.06) dot(x, y, 'rgba(0,0,0,0.07)');
        else if (n < 0.1) dot(x, y, 'rgba(255,255,255,0.06)');
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
      if (w.obj[i] === OBJ.CAVEWALL || w.deco[i] === DECO.BRIDGE) continue;
      const kind = PIX_GROUND_KIND[w.ground[i]];
      if (!kind) continue;
      const p = pixPattern(ctx, kind);
      if (!p) continue;
      ctx.fillStyle = p;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}
