// Wind in der 2D-Welt (seit 15.55): Bäume sind flache Bilder, wiegen sich aber im Wind.
//
// Das Bild eines Baums wird nicht neu gemalt, sondern zeilenweise verschoben: der Stamm unten bleibt stehen, je höher
// eine Zeile liegt, desto weiter rückt sie zur Seite (Versatz × Höhe^1,7, auf ganze Bildpunkte gerundet). So biegt
// sich die Krone, ohne dass der Baum kippt. Der Wind ist eine Welle, die schräg über die Karte läuft (in Zugrichtung
// der Wolkenschatten), darum wiegen sich Nachbarbäume leicht versetzt; ab und zu fegt eine Böe durchs Bild und biegt
// die Bäume, an denen sie vorbeizieht, deutlich weiter. Der weiche Schatten am Fuß rückt ein Stück mit.
//
// Die verbogenen Bilder werden je Baumbild und Stufe (halbe Einheiten von −0,5 bis 3) einmal gebacken und danach nur
// kopiert – ein drawImage je Baum wie vorher. Höchstens WIND_MAX Bilder bleiben im Speicher (älteste fliegen raus).
// Auf Grafik „Niedrig“ (Sparoptik) steht der Wind still.

const WIND_KIND = { tree: 1, blossom: 1, pine: 0.75, dead: 0.4 };
const WIND_MAX = 72;
const WIND_PERIOD = 10;     // alle 10 s eine Böe
const WIND_GUST_V = 420;    // so schnell zieht die Böe übers Bild (Einheiten je Sekunde)
const windBaked = [];       // Reihenfolge der gebackenen Bilder: [Bild, Stufe]

function windAktiv() {
  return game.world && !(typeof sparOptik === 'function' ? sparOptik() : opts.graphics === 'niedrig');
}

// Versatz der Baumspitze in Einheiten (0 = kein Wind)
function windSway2d(o) {
  const stiff = WIND_KIND[o.worldObj];
  if (!stiff || !windAktiv()) return 0;
  const t = game.time;
  const k = o.x * 0.0042 + o.y * 0.0019;
  let a = 0.55 + 0.7 * Math.sin(t * 1.35 - k * 6) + 0.18 * Math.sin(t * 3.1 - k * 11 + o.x * 0.01);
  // Böe: ein Band, das von links oben nach rechts unten durch den Bildausschnitt fegt; jede Böe ist anders stark
  const cyc = Math.floor(t / WIND_PERIOD);
  const front = (t - cyc * WIND_PERIOD) * WIND_GUST_V - 500;
  const d = (o.x - renderer.camX) + (o.y - renderer.camY) * 0.45 - front;
  if (d > -700 && d < 500) {
    const h = Math.sin(cyc * 12.9898) * 43758.5453;
    const str = 0.7 + 0.8 * (h - Math.floor(h));
    // vorn steil, hinten lässt die Böe langsam nach
    a += 1.7 * str * (d > 0 ? Math.exp(-(d / 110) * (d / 110)) : Math.exp(d / 260));
  }
  // jeder Baum etwas anders biegsam
  a *= stiff * (0.85 + 0.03 * (((o.x * 7 + o.y * 13) | 0) % 10));
  return a < -0.5 ? -0.5 : a > 3 ? 3 : a;
}

// gebackenes, verbogenes Bild für die Stufe von a (halbe Einheiten); bei Stufe 0 das Originalbild
function windFrame(sp, a) {
  const q = Math.round(a * 2) / 2;
  if (!q) return sp;
  const cache = sp.wind || (sp.wind = {});
  let f = cache[q];
  if (!f) {
    f = cache[q] = windBake(sp, q);
    windBaked.push([sp, q]);
    if (windBaked.length > WIND_MAX) {
      const [old, oq] = windBaked.shift();
      if (old.wind) delete old.wind[oq];
    }
  }
  return f;
}

function windBake(sp, q) {
  const src = sp.img;
  const b = sp.bounds;
  const W = src.width;
  const H = src.height;
  const S = H / b.h;
  // unten (bis 12 Einheiten über dem Boden) steht der Stamm fest, ganz oben wirkt der volle Versatz
  const h0 = 12;
  const h1 = Math.max(h0 + 10, -b.y - 4);
  const shiftAt = (py) => {
    const hg = (-(b.y + (py + 0.5) / S) - h0) / (h1 - h0);
    return hg <= 0 ? 0 : Math.round(q * Math.pow(hg > 1 ? 1 : hg, 1.7) * S);
  };
  const c = newCanvas(W, H);
  const x = c.getContext('2d');
  let y = 0;
  while (y < H) {
    const sh = shiftAt(y);
    let y2 = y + 1;
    while (y2 < H && shiftAt(y2) === sh) y2++;
    x.drawImage(src, 0, y, W, y2 - y, sh, y, W, y2 - y);
    y = y2;
  }
  return { img: c, bounds: b, flash: null };
}
