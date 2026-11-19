'use strict';

// Ordnung im Stadtschmuck (seit 15.39): Statuen, Zierbrunnen und Brunnen standen dort, wo die Ringsuche den ersten
// freien Fleck fand – schief zueinander und quer über den Platz verstreut; Kisten, Fässer und Säcke lagen mitten auf
// dem Platz. Jetzt bekommt jede Stadt ein aufgeräumtes Bild:
//   - die zwei Statuen stehen als Paar spiegelbildlich links und rechts der Stadtmitte (gleicher Abstand, gleiche Höhe)
//     und sehen zur Mitte
//   - Zierbrunnen und Brunnen bilden das Gegenstück auf der anderen Seite der Mitte, ebenfalls gespiegelt; ohne
//     Brunnen steht der Zierbrunnen auf der Mittelachse, wenn dort Platz ist
//   - loser Kram (Fässer, Kisten, Heu, Säcke, Waren …) bleibt nur, wo er hingehört: an Ständen, Häusern, Türmen, beim
//     Stall oder am Rand der Stadt – mitten auf dem Platz wird er entfernt
// Gesucht wird fest (kein Zufall): vom Wunschplatz aus immer weiter, bis beide Plätze eines Paares frei sind (nicht
// auf Wegen, an Häusern, bei Leuten, anderem Schmuck oder im Anlauf einer Brücke). Findet sich nichts, bleibt alles,
// wie es war.
const SCHMUCK_ORDNUNG = {
  statue: { r: 0.9, dx: 4, dy: 3 },
  brunnen: { rz: 1.3, rw: 0.9, dx: 4.5, dy: -4 },
  kram: new Set(['barrel', 'crate', 'hay', 'sacks', 'goods', 'woodpile', 'pots', 'ore', 'karren', 'totem']),
  anker: new Set(['stand', 'tower', 'gate', 'holzturm', 'holztor', 'kristallturm', 'horse', 'well', 'treppe']),
  mitte: 0.62 // Anteil der halben Stadtbreite, der als „Platzmitte“ gilt
};

function schmuckOrdnung(w) {
  if (!w || !w.props || !w.ground) return 0;
  const O = SCHMUCK_ORDNUNG;
  const mask = typeof brueckenSperre === 'function' ? brueckenSperre(w) : null;
  let n = 0;
  const weg = new Set();
  for (const wm of WORLD_MAPS) {
    const cx = wm.id === 1 ? CENTER_X : wm.cx;
    const cy = wm.id === 1 ? CENTER_Y : wm.cy;
    if (typeof cx !== 'number' || typeof cy !== 'number') continue;
    const half = wm.id === 1 ? (typeof VILLAGE_HALF !== 'undefined' ? VILLAGE_HALF : 20) : wm.camp || wm.genCamp || 13;
    const drin = (pr) => Math.abs(pr.x / TILE - cx) <= half && Math.abs(pr.y / TILE - cy) <= half;
    const props = w.props.filter(drin);
    const statuen = props.filter((pr) => pr.type === 'statue');
    const zier = props.find((pr) => pr.type === 'zierbrunnen');
    const well = props.find((pr) => pr.type === 'well');
    // lose: Teile, die gerade versetzt werden (zählen nicht als Hindernis) – erst die Statuen, dann die Brunnen
    let lose = new Set(statuen);
    const npcs = w.npcs.filter((q) => Math.abs(q.x / TILE - cx) <= half + 3 && Math.abs(q.y / TILE - cy) <= half + 3);
    // frei für ein Teil mit Halbmesser R (Kacheln, um die Stadtmitte gerechnet); belegt: schon vergebene Plätze
    const belegt = [];
    const platz = (tx, ty) => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || w.ground[y * MAP_W + x] !== GROUND.PATH) return false;
      }
      return true;
    };
    const frei = (ox, oy, R) => {
      const x = cx + ox, y = cy + oy;
      if (Math.abs(ox) > half - 2 - R || Math.abs(oy) > half - 2 - R) return false;
      for (let dy = -R; dy <= R + 0.01; dy += 0.5) for (let dx = -R; dx <= R + 0.01; dx += 0.5) {
        const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
        const i = ty * MAP_W + tx;
        if (w.obj[i] !== OBJ.NONE || LIQUID.has(w.ground[i]) || w.deco[i] === DECO.BRIDGE) return false;
        // Wege bleiben frei; ein gepflasterter Platz (Pflaster in alle Richtungen) darf Schmuck tragen
        if (w.ground[i] === GROUND.PATH && !platz(tx, ty)) return false;
        if (mask && mask[i]) return false;
        if (typeof TOWN_KEEP !== 'undefined' && TOWN_KEEP.has(i)) return false;
      }
      if (typeof townLayout === 'function' && townLayout(wm.id) && typeof townLayoutFree === 'function' && !townLayoutFree(wm.id, x, y)) return false;
      for (const q of npcs) {
        const d = hyp(q.x / TILE - x, q.y / TILE - y);
        if (d < R + (q.id === 'weltentor' || q.id === 'eingang' ? 3 : 1.8)) return false;
        if (q.wander && Math.abs(q.homeX / TILE - x) < 3.1 + R && Math.abs(q.homeY / TILE - y) < 2.6 + R) return false;
      }
      for (const q of props) {
        if (lose.has(q) || weg.has(q)) continue;
        const r = q.type === 'stand' || q.type === 'tower' || q.type === 'gate' ? 2.2 : (typeof SCHMUCK_BEWEGLICH !== 'undefined' && SCHMUCK_BEWEGLICH[q.type] != null ? SCHMUCK_BEWEGLICH[q.type] : 0.6) + 0.5;
        if (hyp(q.x / TILE - x, q.y / TILE - y) < R + r) return false;
      }
      for (const b of belegt) if (hyp(b.x - ox, b.y - oy) < R + b.r + 0.8) return false;
      return true;
    };
    // gespiegeltes Paar suchen: (−dx, dy) und (+dx, dy), vom Wunsch (ix, iy) aus immer weiter
    const paar = (ix, iy, RL, RR) => {
      const kand = [];
      for (let dx = 2.5; dx <= half - 3; dx += 0.5) for (let dy = -(half - 3); dy <= half - 3; dy += 0.5) {
        kand.push([Math.abs(dx - ix) + Math.abs(dy - iy) * 1.2, dx, dy]);
      }
      kand.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
      for (const [cost, dx, dy] of kand) {
        if (cost > 16) break;
        if (frei(-dx, dy, RL) && frei(dx, dy, RR)) return { dx, dy };
      }
      return null;
    };
    const setze = (pr, ox, oy, r) => {
      pr.x = (cx + ox) * TILE;
      pr.y = (cy + oy) * TILE;
      belegt.push({ x: ox, y: oy, r });
      n++;
    };
    // 1. Statuen als Paar
    let sdy = O.statue.dy;
    if (statuen.length === 2) {
      const p = paar(O.statue.dx, O.statue.dy, O.statue.r, O.statue.r) || paar(O.statue.dx, -O.statue.dy, O.statue.r, O.statue.r);
      if (p) {
        sdy = p.dy;
        const [a, b] = statuen.slice().sort((s, t) => s.x - t.x);
        setze(a, -p.dx, p.dy, O.statue.r);
        setze(b, p.dx, p.dy, O.statue.r);
        for (const s of [a, b]) s.rot = Math.round(Math.atan2(cx - s.x / TILE, cy - s.y / TILE) * 100) / 100;
      } else for (const s of statuen) belegt.push({ x: s.x / TILE - cx, y: s.y / TILE - cy, r: O.statue.r });
    }
    // 2. Zierbrunnen und Brunnen als Gegenstück auf der anderen Seite der Mitte
    const seite = sdy >= 0 ? -1 : 1;
    lose = new Set([zier, well].filter(Boolean));
    if (zier && well) {
      const p = paar(O.brunnen.dx, Math.abs(O.brunnen.dy) * seite, O.brunnen.rw, O.brunnen.rz);
      if (p) {
        setze(well, -p.dx, p.dy, O.brunnen.rw);
        setze(zier, p.dx, p.dy, O.brunnen.rz);
      }
    } else if (zier) {
      // allein: auf der Mittelachse, sonst gegenüber den Statuen in gleicher Entfernung
      let ok = false;
      for (const d of [5, 6, 4.5, 7, 8]) {
        if (frei(0, d * seite, O.brunnen.rz)) { setze(zier, 0, d * seite, O.brunnen.rz); ok = true; break; }
      }
      if (!ok) for (const d of [5, 6, 4.5, 7, 8]) {
        if (frei(0, -d * seite, O.brunnen.rz)) { setze(zier, 0, -d * seite, O.brunnen.rz); ok = true; break; }
      }
    }
    // 3. loser Kram mitten auf dem Platz: nur behalten, wenn er an etwas steht
    for (const pr of props) {
      if (!O.kram.has(pr.type)) continue;
      const ox = pr.x / TILE - cx, oy = pr.y / TILE - cy;
      if (Math.max(Math.abs(ox), Math.abs(oy)) > half * O.mitte) continue;
      let halt = false;
      for (const q of props) {
        if (q !== pr && O.anker.has(q.type) && hyp(q.x - pr.x, q.y - pr.y) < 3.2 * TILE) { halt = true; break; }
      }
      if (!halt) {
        const tx0 = Math.floor(pr.x / TILE), ty0 = Math.floor(pr.y / TILE);
        for (let dy = -2; dy <= 2 && !halt; dy++) for (let dx = -2; dx <= 2; dx++) {
          const tx = tx0 + dx, ty = ty0 + dy;
          if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && w.obj[ty * MAP_W + tx] !== OBJ.NONE) { halt = true; break; }
        }
      }
      if (!halt) weg.add(pr);
    }
  }
  if (weg.size) w.props = w.props.filter((pr) => !weg.has(pr));
  w.schmuckOrdnung = { gesetzt: n, weg: weg.size };
  return n + weg.size;
}

const _sorGenerateWorld = generateWorld;
generateWorld = function () {
  const w = _sorGenerateWorld.apply(this, arguments);
  try {
    schmuckOrdnung(w);
  } catch (e) {
    console.warn('Schmuckordnung', e);
  }
  return w;
};
