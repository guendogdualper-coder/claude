'use strict';

// Schmuck richtig platzieren (seit 15.33): Statuen, Zierbrunnen, Bänke, Fässer, Kisten, Karren und Stapel standen in
// einigen Städten direkt vor oder hinter einer Brücke – mitten im Anlauf oder so dicht am Geländer, dass man um sie
// herumlaufen musste. Die Plätze kommen aus festen Listen (welt.js, daten/stadtformen.js) und einer Ringsuche
// (stadtschmuck.js); beide kannten die Brücken nicht.
// Jetzt wird nach dem Bau der Welt eine Sperrfläche um alle Brücken gelegt: eine Kachel rund um jede Brückenkachel und
// vor jedem Brückenkopf ein Streifen von fünf Kacheln Länge und drei Kacheln Breite in Laufrichtung. Schmuck, der darin
// steht, rückt auf den nächsten freien Platz daneben (gleiche Regeln wie beim ersten Setzen: nicht auf Wegen, an
// Häusern, bei Leuten oder anderem Schmuck); findet sich keiner, entfällt das Teil (Statuen und Brunnen bleiben dann). Laternen und Feuerbecken bleiben,
// sie flankieren die Brücken mit Absicht. Die Suche ist fest (kein Zufall), jede Welt sieht bei allen gleich aus.
const SCHMUCK_PLATZ = { lauf: 5, breit: 1, weit: 7, gross: 13, netz: 150 };
const SCHMUCK_BEWEGLICH = { statue: 0.9, zierbrunnen: 1.6, bench: 0.6, planter: 0.5, goods: 0.6, barrel: 0.45, crate: 0.45, hay: 0.6, woodpile: 0.6, sacks: 0.5, pots: 0.5, totem: 0.5, ore: 0.5, waesche: 0.7, karren: 0.8 };

function brueckenSperre(w) {
  const m = new Uint8Array(w.ground.length);
  const P = SCHMUCK_PLATZ;
  const isB = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && w.deco[y * MAP_W + x] === DECO.BRIDGE;
  const land = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && !isB(x, y) && !LIQUID.has(w.ground[y * MAP_W + x]);
  // 2 = dicht an der Brücke (Rand und die ersten zwei Kacheln vor dem Kopf), 1 = der weitere Anlauf
  const mark = (x, y, v = 2) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && m[y * MAP_W + x] < v) m[y * MAP_W + x] = v; };
  // Zusammenhängende Brückenflächen: Stegnetze wie im Pfahldorf (Totenmoor) sind der Boden der Stadt, keine Brücke
  // mit Anlauf – der Schmuck steht dort mit Absicht auf den Stegen und bleibt
  const comp = new Int32Array(w.ground.length);
  const size = [0];
  for (let i0 = 0; i0 < comp.length; i0++) {
    if (w.deco[i0] !== DECO.BRIDGE || comp[i0]) continue;
    const id = size.length;
    const stack = [i0];
    comp[i0] = id;
    let c = 0;
    while (stack.length) {
      const i = stack.pop();
      c++;
      const x = i % MAP_W;
      for (const j of [x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W, i + MAP_W]) {
        if (j >= 0 && j < comp.length && !comp[j] && w.deco[j] === DECO.BRIDGE) { comp[j] = id; stack.push(j); }
      }
    }
    size.push(c);
  }
  let n = 0;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (!isB(x, y)) continue;
    if (size[comp[y * MAP_W + x]] > P.netz) continue;
    n++;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(x + dx, y + dy);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // Brückenkopf: hier geht die Brücke an Land, und sie kommt aus der Gegenrichtung (kein seitlicher Rand)
      if (!land(x + dx, y + dy) || !isB(x - dx, y - dy)) continue;
      for (let s = 1; s <= P.lauf; s++) {
        if (!land(x + dx * s, y + dy * s)) break;
        for (let o = -P.breit; o <= P.breit; o++) mark(x + dx * s + (dy ? o : 0), y + dy * s + (dx ? o : 0), s <= 2 ? 2 : 1);
      }
    }
  }
  return n ? m : null;
}

function schmuckPlatz(w) {
  if (!w || !w.deco || !w.props) return 0;
  const mask = brueckenSperre(w);
  if (!mask) return 0;
  // ab: 1 = auch der weitere Anlauf zählt, 2 = nur dicht an der Brücke
  const gesperrt = (x, y, R, ab = 1) => {
    for (const [ox, oy] of [[0, 0], [-R, -R], [R, -R], [-R, R], [R, R], [-R, 0], [R, 0], [0, -R], [0, R]]) {
      const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
      if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || mask[ty * MAP_W + tx] >= ab) return true;
    }
    return false;
  };
  const stadt = (x, y) => {
    let best = null, bd = 1e9;
    for (const wm of WORLD_MAPS) {
      const cx = wm.id === 1 ? CENTER_X : wm.cx, cy = wm.id === 1 ? CENTER_Y : wm.cy;
      if (typeof cx !== 'number') continue;
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d < bd) { bd = d; best = { id: wm.id, cx, cy, half: wm.id === 1 ? (typeof VILLAGE_HALF !== 'undefined' ? VILLAGE_HALF : 20) : wm.camp || wm.genCamp || 13 }; }
    }
    return best && bd <= best.half + 1 ? best : null;
  };
  const frei = (pr, x, y, R, t, ab) => {
    if (gesperrt(x, y, R, ab)) return false;
    if (t && (Math.abs(x - t.cx) > t.half - 1.5 - R || Math.abs(y - t.cy) > t.half - 1.5 - R)) return false;
    for (let dy = -R; dy <= R + 0.01; dy += 0.5) for (let dx = -R; dx <= R + 0.01; dx += 0.5) {
      const i = Math.floor(y + dy) * MAP_W + Math.floor(x + dx);
      if (w.obj[i] !== OBJ.NONE || LIQUID.has(w.ground[i]) || w.deco[i] === DECO.BRIDGE || w.ground[i] === GROUND.PATH) return false;
      if (typeof TOWN_KEEP !== 'undefined' && TOWN_KEEP.has(i)) return false;
    }
    if (t && typeof townLayout === 'function' && townLayout(t.id) && typeof townLayoutFree === 'function' && !townLayoutFree(t.id, x, y)) return false;
    for (const n of w.npcs) {
      const d = hyp(n.x / TILE - x, n.y / TILE - y);
      if (d < R + (n.id === 'weltentor' || n.id === 'eingang' ? 3 : 1.6)) return false;
      if (n.wander && Math.abs(n.homeX / TILE - x) < 3.1 + R && Math.abs(n.homeY / TILE - y) < 2.6 + R) return false;
    }
    for (const q of w.props) {
      if (q === pr) continue;
      const r = q.type === 'stand' || q.type === 'tower' || q.type === 'gate' ? 2.2 : q.type === 'statue' || q.type === 'zierbrunnen' ? 2.6 : SCHMUCK_BEWEGLICH[q.type] != null ? SCHMUCK_BEWEGLICH[q.type] + 0.5 : 1;
      if (Math.abs(q.x / TILE - x) < R + r && Math.abs(q.y / TILE - y) < R + r && hyp(q.x / TILE - x, q.y / TILE - y) < R + r) return false;
    }
    return true;
  };
  let moved = 0;
  const weg = [];
  for (const pr of w.props) {
    const R = SCHMUCK_BEWEGLICH[pr.type];
    if (R == null) continue;
    const x0 = pr.x / TILE, y0 = pr.y / TILE;
    if (!gesperrt(x0, y0, Math.min(R, 0.6))) continue;
    const t = stadt(x0, y0);
    let hit = null;
    const gross = pr.type === 'statue' || pr.type === 'zierbrunnen';
    const such = (ab) => {
      for (let r = 1; r <= (gross ? SCHMUCK_PLATZ.gross : SCHMUCK_PLATZ.weit); r += 0.5) {
        const steps = Math.max(8, Math.round(r * 5));
        for (let k = 0; k < steps; k++) {
          const a = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / steps) + Math.atan2(t ? y0 - t.cy : 1, t ? x0 - t.cx : 0);
          const x = Math.round((x0 + Math.cos(a) * r) * 4) / 4;
          const y = Math.round((y0 + Math.sin(a) * r) * 4) / 4;
          if (frei(pr, x, y, R, t, ab)) return { x, y };
        }
      }
      return null;
    };
    // erst ganz aus dem Anlauf heraus; in Inselstädten mit Brücken auf allen Seiten ist dafür oft kein Platz – dann
    // genügt es, nicht dicht an der Brücke zu stehen
    hit = such(1);
    if (!hit && !gesperrt(x0, y0, Math.min(R, 0.6), 2)) continue;
    if (!hit) hit = such(2);
    if (hit) {
      pr.x = hit.x * TILE;
      pr.y = hit.y * TILE;
      if (pr.type === 'statue' && t) pr.rot = Math.round(Math.atan2(t.cx - hit.x, t.cy - hit.y) * 100) / 100;
      moved++;
    } else if (!gross) weg.push(pr); // Statuen und Brunnen bleiben notfalls stehen, kleiner Kram entfällt
  }
  if (weg.length) w.props = w.props.filter((pr) => !weg.includes(pr));
  w.schmuckPlatz = { moved, weg: weg.length };
  return moved + weg.length;
}

const _spzGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _spzGenerateWorld.apply(this, arguments);
  try {
    schmuckPlatz(w);
  } catch (e) {
    console.warn('Schmuckplatz', e);
  }
  return w;
};
